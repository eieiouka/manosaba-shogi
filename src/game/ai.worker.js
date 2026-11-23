import {bestAction,casualAction,createTranspositionTable} from "./aiEngine.js";
import {generateAllLegalActions} from "./rules.js";
import {fairyMoveToAction,stateToFairyFen} from "./fairyCodec.js";
import {openingBookAction} from "./openingBook.js";

const sharedTT=createTranspositionTable();
let ponderToken=0;
let wasmEngine=null;
let fairyWorker=null;
let fairySequence=0;
const fairyPending=new Map();
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

async function runEngine(state,seen,target,timeLimitMs,minDepth,selectiveDepth=0,log=true,token=ponderToken){
  if(await fairyReady){
   if(token!==ponderToken)return null;
   try{
    if(log)console.info(`[魔法将棋AI] search start engine=fairy-stockfish minDepth=${minDepth} budget=${timeLimitMs}ms`);
    const id=++fairySequence;
    const result=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{fairyPending.delete(id);reject(new Error("Fairy-Stockfish search timeout"))},Math.max(120000,timeLimitMs+10000));
      fairyPending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});
      fairyWorker.postMessage({type:"search",id,fen:stateToFairyFen(state),timeLimitMs,maxDepth:target,minDepth});
    });
    const decoded=fairyMoveToAction(state,result.bestmove);
    const signature=a=>JSON.stringify([a?.category,a?.from??null,a?.to,a?.piece?.type,!!a?.promote,a?.magic??null]);
    const action=generateAllLegalActions(state).find(a=>signature(a)===signature(decoded));
    if(!action)throw Error("Fairy-Stockfish returned a move not legal under the game rules");
    return {action,score:result.score,depth:result.depth,nodes:result.nodes,engine:"fairy-stockfish",proven:Math.abs(result.score)>=19000};
   }catch(error){
     if(token!==ponderToken)return null;
     console.warn("[魔法将棋AI] Fairy-Stockfish search failed; using fallback",error)
   }
  }
  await wasmReady;
  if(token!==ponderToken)return null;
  if(wasmEngine){
    if(log)console.info(`[魔法将棋AI] search start engine=wasm mode=iterative-lmr maxDepth=${target} minDepth=${minDepth} budget=${timeLimitMs}ms`);
    try{return wasmEngine.best_action(state,target,minDepth,timeLimitMs,selectiveDepth)}catch(error){console.error("[魔法将棋AI] WASM search failed; JavaScript fallback",error)}
  }
  if(log)console.info(`[魔法将棋AI] search start engine=javascript maxDepth=${target} minDepth=${minDepth} budget=${timeLimitMs}ms`);
  return bestAction(state,seen,target,{timeLimitMs:Math.max(timeLimitMs,3000),minDepth:Math.min(minDepth,5),tt:sharedTT});
}

self.onmessage=async({data})=>{
  const token=++ponderToken;
  if(data.type==="review"){
    try{
      const result=bestAction(data.state,data.seen||[],11,{timeLimitMs:120,minDepth:1,tt:sharedTT});
      let improvement=null;
      if(result?.action&&data.playedState){
        const {valueScore}=await import("./aiEngine.js");
        const {applyLegalAction}=await import("./rules.js");
        const bestState=applyLegalAction(data.state,result.action);
        const sign=data.state.turn==="sente"?1:-1;
        improvement=sign*(valueScore(bestState)-valueScore(data.playedState));
      }
      self.postMessage({type:"review-result",id:data.id,result:{action:result?.action,score:result?.score,depth:result?.depth,improvement}});
    }catch(error){self.postMessage({type:"review-result",id:data.id,error:String(error)})}
    return;
  }
  if(data.type==="reset"){sharedTT.clear();wasmEngine?.reset_engine?.();fairyWorker?.postMessage({type:"reset"});return}
  if(data.type!=="think")return;
  try{
    // Preserve the existing easy and difficult casual CPU behavior.
    if(data.minDepth!==19){
      const result=casualAction(data.state,{difficulty:data.minDepth??3,openingActive:data.openingActive,cpuOwnMoves:data.cpuOwnMoves??0});
      self.postMessage({id:data.id,result});
      return;
    }
    const book=openingBookAction(data.state);
    if(book){
      self.postMessage({id:data.id,result:{action:book,score:0,depth:0,nodes:0,engine:"opening-book"}});
      return;
    }
    // Strongest: exactly depth 19 (or earlier if mate is proven).
    // Do not shorten this search merely because matchmaking is pending.
    const result=await runEngine(data.state,data.seen,19,Math.max(500,data.timeLimitMs??1000),19,0,true,token);
    if(token===ponderToken)self.postMessage({id:data.id,result});
  }catch(error){if(token===ponderToken)self.postMessage({id:data.id,error:error?.message||String(error)})}
};
