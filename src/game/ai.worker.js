import {bestAction,casualAction,createTranspositionTable} from "./aiEngine.js";
import {generateAllLegalActions} from "./rules.js";
import {fairyMoveToAction,stateToFairyFen} from "./fairyCodec.js";

const sharedTT=createTranspositionTable();
let ponderToken=0;
let deepestPonder=1;
let wasmEngine=null;
let fairyWorker=null;
let fairySequence=0;
const fairyPending=new Map();
const UNBOUNDED_DEPTH=253;
const fairyReady=(async()=>{
  try{
    const engineUrl=new URL("/fairy/stockfish.js",self.location.origin);
    const response=await fetch(engineUrl,{method:"HEAD",cache:"no-store"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const contentType=response.headers.get("content-type")||"";
    if(!/javascript|ecmascript/.test(contentType))throw new Error("Fairy-Stockfish artifact is not built");
    fairyWorker=new Worker(new URL("/fairy/fairy-bridge.worker.js?v=worker-v24-difficulty",self.location.origin));
    fairyWorker.onmessage=({data})=>{
      if(data.type==="ready"){fairyPending.get("ready")?.resolve();fairyPending.delete("ready");return}
      if(data.type==="error"&&data.id==null&&fairyPending.has("ready")){
        fairyPending.get("ready").reject(new Error(data.message));fairyPending.delete("ready");return;
      }
      const pending=fairyPending.get(data.id);
      if(!pending)return;
      if(data.type==="error")pending.reject(new Error(data.message));
      else if(data.type==="result")pending.resolve(data);
      else return;
      fairyPending.delete(data.id);
    };
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error("Fairy-Stockfish startup timeout")),15000);
      fairyPending.set("ready",{resolve:()=>{clearTimeout(timer);resolve()},reject});
      fairyWorker.postMessage({type:"init"});
    });
    console.info("[魔法将棋AI] Fairy-Stockfish WASM loaded");
    return true;
  }catch(error){
    fairyWorker?.terminate();fairyWorker=null;
    console.info("[魔法将棋AI] Fairy-Stockfish unavailable; use existing engine",error?.message||error);
    return false;
  }
})();
const wasmReady=(async()=>{
  try{
    const url=new URL("./wasm/magical_shogi_engine.js",import.meta.url).href;
    const module=await import(/* @vite-ignore */url);
    await module.default();
    wasmEngine=module;
    console.info(`[魔法将棋AI] WASM loaded: ${module.engine_version?.()??"unknown"}`);
  }catch(error){wasmEngine=null;console.error("[魔法将棋AI] WASM load failed; JavaScript fallback",error)}
})();

async function runEngine(state,seen,target,timeLimitMs,minDepth,selectiveDepth=0,log=true){
  if(await fairyReady){
    if(log)console.info(`[魔法将棋AI] search start engine=fairy-stockfish minDepth=${minDepth} budget=${timeLimitMs}ms`);
    const id=++fairySequence;
    const result=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{fairyPending.delete(id);reject(new Error("Fairy-Stockfish search timeout"))},Math.max(120000,timeLimitMs+10000));
      fairyPending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});
      fairyWorker.postMessage({type:"search",id,fen:stateToFairyFen(state),timeLimitMs,maxDepth:target,minDepth});
    });
    return {action:fairyMoveToAction(state,result.bestmove),score:result.score,depth:result.depth,nodes:result.nodes,engine:"fairy-stockfish",proven:Math.abs(result.score)>=19000};
  }
  await wasmReady;
  if(wasmEngine){
    if(log)console.info(`[魔法将棋AI] search start engine=wasm mode=iterative-lmr maxDepth=${target} minDepth=${minDepth} budget=${timeLimitMs}ms`);
    try{return wasmEngine.best_action(state,target,minDepth,timeLimitMs,selectiveDepth)}catch(error){console.error("[魔法将棋AI] WASM search failed; JavaScript fallback",error)}
  }
  if(log)console.info(`[魔法将棋AI] search start engine=javascript maxDepth=${target} minDepth=${minDepth} budget=${timeLimitMs}ms`);
  return bestAction(state,seen,target,{timeLimitMs,minDepth,tt:sharedTT});
}

async function ponder(state,seen,token,maxDepth=UNBOUNDED_DEPTH){
  if(token!==ponderToken)return;
  try{
    const result=await runEngine(state,seen,maxDepth,180,Math.min(3,maxDepth),0,false);
    deepestPonder=Math.max(deepestPonder,result?.depth??1);
  }catch{}
  if(token===ponderToken)setTimeout(()=>ponder(state,seen,token,maxDepth),0);
}

self.onmessage=async({data})=>{
  const token=++ponderToken;
  if(data.type==="reset"){sharedTT.clear();wasmEngine?.reset_engine?.();fairyWorker?.postMessage({type:"reset"});deepestPonder=1;return}
  if(data.type==="ponder"){
    return; // No pondering for casual CPU.
   if(data.maxDepth===5)return;
    deepestPonder=1;
    if(await fairyReady)return;
    setTimeout(()=>ponder(data.state,data.seen,token,data.maxDepth??UNBOUNDED_DEPTH),0);
    return
  }
  try{
    // CPU-only weak mode. No Fairy/WASM search, quiescence or background pondering.
   const casual=casualAction(data.state,{difficulty:data.minDepth??3,openingActive:data.openingActive,cpuOwnMoves:data.cpuOwnMoves??0});
   self.postMessage({id:data.id,result:casual});
   return;
   const targetDepth=data.maxDepth==null?UNBOUNDED_DEPTH:Math.max(1,Math.min(UNBOUNDED_DEPTH,Math.trunc(Number(data.maxDepth)||UNBOUNDED_DEPTH)));
    const timeLimitMs=Math.max(500,data.timeLimitMs??500);
    const minDepth=Math.max(1,Math.min(targetDepth,31,Math.trunc(Number(data.minDepth)||15)));
    const startedAt=performance.now();
    // Opening uses the numeric root search, where each specified move receives a small
    // score adjustment. Outside the opening, preserve the normal Fairy/WASM selection.
    // First CPU move: develop Nanoka, unless the opponent just jumped Hanna two squares.
    // A forced move is selected only from the authoritative legal-action list.
    const firstCpuTurn=data.openingActive&&data.cpuOwnMoves===0;
    const ownSide=data.state.turn;
    const opponent=ownSide==="sente"?"gote":"sente";
    const opponentHannaJump=data.state.board.some((line,r)=>line.some((piece,c)=>{
      if(piece?.side!==opponent||piece.type!=="hanna")return false;
      const homeRow=opponent==="sente"?5:0;
      const homeCol=opponent==="sente"?1:4;
      return c===homeCol&&Math.abs(r-homeRow)===2;
    }));
    if(firstCpuTurn&&!opponentHannaJump){
      const from=ownSide==="sente"?[5,0]:[0,5];
      const to=ownSide==="sente"?[4,0]:[1,5];
      const forced=generateAllLegalActions(data.state).find(a=>a.piece?.type==="nanoka"&&a.from?.[0]===from[0]&&a.from?.[1]===from[1]&&a.to?.[0]===to[0]&&a.to?.[1]===to[1]);
      if(forced){
        console.info("[定石AI] 初手ナノカ前進",forced);
        self.postMessage({id:data.id,result:{action:forced,score:0,depth:0,nodes:0,engine:"opening-first-move"}});
        return;
      }
    }
    const result=data.openingActive
      ? bestAction(data.state,data.seen,Math.min(targetDepth,9),{
          timeLimitMs, minDepth:Math.min(minDepth,5),tt:sharedTT,openingActive:true,cpuOwnMoves:data.cpuOwnMoves??0
        })
      : await runEngine(data.state,data.seen,targetDepth,timeLimitMs,minDepth,0);
    if(data.openingActive&&result?.openingDebug)console.info("[定石AI] 候補比較 (raw/bonus/adjusted)",result.openingDebug);
    const elapsed=Math.max(1,performance.now()-startedAt);
    const nps=result?.nodes?Math.round(result.nodes*1000/elapsed):"?";
    console.info(`[魔法将棋AI] engine=${result?.engine??"javascript"} depth=${result?.depth??"?"} nodes=${result?.nodes??"?"} elapsed=${Math.round(elapsed)}ms nps=${nps}`);
    self.postMessage({id:data.id,result});
  }catch(error){self.postMessage({id:data.id,error:error?.message||String(error)})}
};
