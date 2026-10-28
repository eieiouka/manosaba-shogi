import {useEffect,useMemo,useRef,useState} from "react";
import "./App.css";
import "./online/online.css";
import "./online/online-v53.css";
import {useAdminActivity} from "./online/useAdminActivity.js";
import {useCpuPresence} from "./online/useCpuPresence.js";
import {useLearningPresence} from "./online/useLearningPresence.js";
import {useOnline} from "./online/useOnline.js";
import NicknameReset from "./online/NicknameReset.jsx";
import RankLabel from "./online/RankLabel.jsx";
import {PIECES,makeInitialState,generateAllLegalActions,generateLegalBoardActions,generatePseudoActions,applyLegalAction,terminalResult,repetitionResult,isEmmaInCheck} from "./game/rules.js";
import "./result-invite.css";
import "./online/nickname-reset.css";
import {stateKey} from "./game/aiEngine.js";
import {LEARNING_LEVELS,learningMoveRecord,learningStartState,evaluateLearningHistory} from "./learning/levels.js";
import {learningBranchMatches} from "./learning/learningEngine.js";
import {learningActions,learningTerminal,learningOpeningBranch,learningResponseAction,learningFailureGuide} from "./learning/learningPatterns.js";
import {useLearningState} from "./learning/useLearningState.js";
import {scriptedStep,scriptedLines,scriptedPlayerMatches,scriptedAutoMovePage,scriptedFailureLines,scriptedDisplayStep,scenePlayerMatches,scriptedFailureBranch} from "./learning/learningCore.js";
import {LearningChapterHeading,LearningDialogue,LearningChapterSelect,LearningBackConfirm} from "./learning/LearningUI.jsx";
import "./learning/learning.css";
import "./learning/learning-disabled-nav.css";
import "./online/auto-match.css";
import "./online/v87-result-layout.css";

// Anonymous, browser-scoped hourly analytics. Server accepts mode and kind separately.
const ANALYTICS_URL=(import.meta.env.VITE_MATCH_SERVER_URL||"http://localhost:3001").replace(/\/$/,"")+"/analytics/event";
function getAnalyticsBrowserId(){
 try{
  let id=localStorage.getItem("manosaba-analytics-browser-id");
  if(!id||!/^[0-9a-f-]{36}$/i.test(id)){
   id=crypto.randomUUID();localStorage.setItem("manosaba-analytics-browser-id",id);
  }
  return id;
 }catch{return crypto.randomUUID()}
}
function sendAnalytics(mode,kind){
 const id=getAnalyticsBrowserId();
 fetch(ANALYTICS_URL,{method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({id,mode,kind}),keepalive:true}).then(response=>{
   if(!response.ok)console.warn("[analytics] event rejected",mode,kind,response.status);
  }).catch(error=>console.warn("[analytics] event failed",mode,kind,error));
}

const randomSide=()=>Math.random()<.5?"sente":"gote";
const HAND_ORDER=["sherry","hanna","hiro","nanoka","margo"];
const DIFFICULTIES=[
 {label:"簡単",depth:3},
 {label:"普通",depth:5},
 {label:"難しい",depth:15},
];
const PIECE_GUIDES={
 ema:{move:"8方向に1マス移動できます。",magicName:"魔女殺し",magic:"相手側の最下段へ到達すると、魔女化して相手のエマを殺せます（勝利）。"},
 nanoka:{move:"前・左右に1マス、魔女化後は8方向に1マス移動できます。",magicName:"遠方狙撃",magic:"前方2マス、斜め前2マスの敵を銃撃します。間に駒がある場合は撃てません。"},
 hanna:{move:"前・斜め前に1マス、魔女化後は8方向に1マス移動できます。",magicName:"空中浮遊",magic:"前方へ2マス移動できます。間の駒は飛び越えられますが、着地先の駒は取れません。"},
 hiro:{move:"前・左右に1マス、魔女化後は8方向に1マス移動できます。",magicName:"すり替え",magic:"8方向に隣接する味方の駒と、自身の位置を入れ替えます。"},
 sherry:{move:"前に1マス移動できますが、駒を取れません。駒を取る時だけは、斜め前に1マス移動できます。魔女化後は8方向1マスと前2マスへ移動できます。",magicName:"全力突進",magic:"前方へ2マス移動できます。途中・着地点に駒がある場合は進めません。"},
 margo:{move:"前・斜め前に1マス、魔女化後は8方向に1マス移動できます。",magicName:"跳躍暗殺",magic:"着地点が空いていれば、横・斜め後ろ・後ろ側の敵を飛び越え、取ることができます。"},
};
const MOBILE_LAYOUT_QUERY="(max-width: 760px) and (hover: none) and (pointer: coarse)";
const imageFor=p=>`/images/pieces/${p.type}_${p.promoted?"red":"black"}.png`;

function Piece({piece,compact=false,perspective="sente",forcePromoted=false,promotedOverride}){
 let shownPiece=promotedOverride===undefined?piece:{...piece,promoted:promotedOverride};
 if(forcePromoted)shownPiece={...shownPiece,promoted:true};
 return <div className={`piece piece--${shownPiece.promoted?"red":"black"} ${shownPiece.side!==perspective?"piece--opponent":""} ${compact?"piece--compact":""}`} role="img" aria-label={PIECES[piece.type].name}>
  <img src={imageFor(shownPiece)} alt="" aria-hidden="true" draggable={false}/>
  <span className="piece-name">{PIECES[piece.type].short}</span>
 </div>;
}

function Hand({className,title,pieces,activeType,onPick,disabled,perspective,reverse=false,onGuideStart,onGuideEnd}){
 const order=reverse?[...HAND_ORDER].reverse():HAND_ORDER;
 const groups=order.map(type=>({type,items:pieces.filter(piece=>piece.type===type)})).filter(group=>group.items.length);
 return <aside className={`hand ${className}`}>
  <div className="hand-title">{title}</div>
  <div className={`hand-pieces ${groups.length?"":"hand-pieces--empty"}`}>{groups.length?groups.map(({type,items})=><div className={`hand-group ${items.length>1?"hand-group--double":""}`} key={type}>{items.map((piece,i)=><button aria-disabled={disabled} key={`${piece.id}-${i}`} className={`hand-piece ${activeType===type?"active":""}`} onClick={()=>{if(!disabled)onPick(type)}} onPointerDown={()=>onGuideStart?.(piece,null,null)} onPointerUp={onGuideEnd} onPointerCancel={onGuideEnd} onPointerLeave={onGuideEnd} onContextMenu={event=>event.preventDefault()} aria-label={`${PIECES[type].name}を選ぶ`}><Piece piece={piece} compact perspective={perspective}/></button>)}</div>):<span className="hand-empty">なし</span>}</div>
 </aside>;
}

function DifficultyDialog({onChoose,onCancel}){
 return <div className="difficulty-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel()}}>
  <section className="difficulty-dialog" role="dialog" aria-modal="true" aria-labelledby="difficulty-title">
   <h2 id="difficulty-title">難易度を選択</h2>
   <div className="difficulty-options">{DIFFICULTIES.map(item=><button key={item.depth} type="button" onClick={()=>onChoose(item.depth)}>
    <strong>{item.label}</strong>
   </button>)}</div>
   <button className="difficulty-cancel" type="button" onClick={onCancel}>戻る</button>
  </section>
 </div>;
}

function PieceGuide({piece,onClose}){
 const guide=PIECE_GUIDES[piece.type];
 return <aside className="piece-guide" role="dialog" aria-label={`${PIECES[piece.type].name}の動き`}>
  <div className="piece-guide__heading"><strong>{PIECES[piece.type].name}</strong><span>{piece.promoted?"魔女化":"通常"}</span><button type="button" onClick={onClose} aria-label="閉じる">×</button></div>
  <p className="piece-guide__move"><b>通常移動</b>{guide.move}</p>
  <p className="piece-guide__ability"><b>{guide.magicName}</b>{piece.type==="sherry"&&piece.promoted?"前方へ2マス移動できます。着地点に駒がある場合も取れます。":guide.magic}</p>
 </aside>;
}

function HowToPlayDialog({onClose}){
 return <div className="how-to-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="how-to-dialog" role="dialog" aria-modal="true" aria-labelledby="how-to-title">
   <div className="how-to-dialog__heading"><h2 id="how-to-title">How to play</h2><button type="button" onClick={onClose} aria-label="閉じる">×</button></div>
   <p>桜羽エマを取られたら負けです。桜羽エマが魔女化すると、特殊勝利できます。</p>
   <p>エマだけは敵陣最下段、他の駒は敵陣二段目に移動すると魔女化します。</p>
   <p>取った駒は打てますが、敵陣最下段には打てません。</p>
   <p className="how-to-dialog__longpress">長押しで駒の能力を見れます。</p>
  </section>
 </div>;
}

export default function App(){
 const initial=useMemo(()=>makeInitialState(),[]);
 const [started,setStarted]=useState(false);
  const [cpuStarts,setCpuStarts]=useState(0);
  const [learningStarts,setLearningStarts]=useState(0);

 const [mode,setMode]=useState("ai");
  const {confirmLearningBack,setConfirmLearningBack,learningDialogue,setLearningDialogue,learningLevelIndex,setLearningLevelIndex,learningHistory,setLearningHistory,learningOutcome,setLearningOutcome,learningChapterSelect,setLearningChapterSelect,learningGeneration}=useLearningState();
 const [humanSide,setHumanSide]=useState("sente");
 const opponentSide=humanSide==="sente"?"gote":"sente";
 const [timeline,setTimeline]=useState([initial]);
 const [selected,setSelected]=useState(null);
 const [handType,setHandType]=useState(null);
 const [thinking,setThinking]=useState(false);
 const [waitingCpu,setWaitingCpu]=useState(false);
 const [resigned,setResigned]=useState(false);
 const [finishFx,setFinishFx]=useState(null);
 const [finishFxDone,setFinishFxDone]=useState(false);
 const [resultRevealReady,setResultRevealReady]=useState(false);
 const [motionFx,setMotionFx]=useState(null);
 const [difficultyDepth,setDifficultyDepth]=useState(15);
 const [difficultyPrompt,setDifficultyPrompt]=useState(null);
 const [backgroundQueueMode,setBackgroundQueueMode]=useState(null);
 const [savedReturnMode,setSavedReturnMode]=useState(()=>{try{return JSON.parse(localStorage.getItem('manosaba-v80-return-snapshot')||'null')?.mode||null}catch{return null}});
 const returnSnapshotRef=useRef(null);
 const STORAGE_KEY='manosaba-v80-return-snapshot';
 const [pieceGuide,setPieceGuide]=useState(null);
 const [showHowTo,setShowHowTo]=useState(false);
 const [showOnlineClosed,setShowOnlineClosed]=useState(false);
  const [jstHour,setJstHour]=useState(()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',hourCycle:'h23'}).format(new Date())));
  useEffect(()=>{const update=()=>setJstHour(Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',hour:'numeric',hourCycle:'h23'}).format(new Date())));const timer=setInterval(update,15000);return()=>clearInterval(timer)},[]);
  const onlineEventOpen=jstHour===21;
 const [mobileLayout,setMobileLayout]=useState(()=>typeof window!=="undefined"&&window.matchMedia(MOBILE_LAYOUT_QUERY).matches);
 const worker=useRef(null),request=useRef(0),motionFxRef=useRef(null),motionSequence=useRef(0),backgroundMusic=useRef(null);
 const guideTimer=useRef(null),guideTriggered=useRef(false);
 const [learningAutoMoving,setLearningAutoMoving]=useState(false);
  const [learningResponsePending,setLearningResponsePending]=useState(null);
 const [sceneIndex,setSceneIndex]=useState(0),[sceneAutoDone,setSceneAutoDone]=useState(false);
  const [learningTryDemoDone,setLearningTryDemoDone]=useState(false);
 const sceneBusy=useRef(false),sceneTimers=useRef([]),sceneSnapshots=useRef([]),scenePlayerSnapshots=useRef([]);
 const clearScene=()=>{sceneTimers.current.forEach(clearTimeout);sceneTimers.current=[];sceneBusy.current=false;learningAutoMovingRef.current=false;setLearningAutoMoving(false);};
 const learningAutoMovingRef=useRef(false);
 const state=timeline[timeline.length-1];
 const online=useOnline(data=>{
   if(started&&(mode==='ai'||mode==='learning')&&(backgroundQueueMode===mode||(mode==='ai'&&backgroundQueueMode==='cpu'))){
    const snapshot={mode,timeline,humanSide,difficultyDepth,learningLevelIndex,learningDialogue,learningHistory,learningOutcome,sceneIndex,sceneAutoDone,sceneSnapshots:sceneSnapshots.current,scenePlayerSnapshots:scenePlayerSnapshots.current};
    returnSnapshotRef.current=snapshot;setSavedReturnMode(mode);
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot))}catch{}
    learningGeneration.current++;request.current++;clearScene();
   }
  if(data.action)beginMotion(data.action,state);
  request.current++;worker.current?.postMessage({type:"reset"});
  setWaitingCpu(false);setDifficultyPrompt(null);setMode("online");setHumanSide(data.side);setThinking(false);setSelected(null);setHandType(null);setResigned(false);
  if(!started||mode!=="online"||online.match?.id!==data.id){
   setFinishFx(null);setFinishFxDone(false);setResultRevealReady(false);setMotionFx(null);motionFxRef.current=null;
  }
  setTimeline([data.state]);setStarted(true);
 },()=>{
 });
  const learningTryDemo=mode==="learning"&&LEARNING_LEVELS[learningLevelIndex]?.id==="hanna-5"&&sceneIndex===1&&learningTryDemoDone;
  const result=useMemo(()=>mode==="online"?online.match?.result:mode==="learning"?(learningTryDemo?{winner:"gote",reason:"ema-safe-try"}:learningTerminal(LEARNING_LEVELS[learningLevelIndex],state,timeline,()=>terminalResult(state)??repetitionResult(state,timeline))):terminalResult(state)??repetitionResult(state,timeline),[state,timeline,mode,online.match,learningLevelIndex,learningTryDemo]);
 const onlineBlocked=mode==="online"&&(!online.match||online.match.paused||online.now<online.match.readyAt||!online.connected);
 const checkedSide=!result&&isEmmaInCheck(state,state.turn)?state.turn:null;
 const gameOver=Boolean(result||resigned);
 useCpuPresence(started&&mode==="ai"&&!gameOver);
 useLearningPresence(started&&mode==="learning");
 useAdminActivity(started&&!gameOver);
  // Each mode counts starts, while presence continues every minute (also across hour boundaries).
  const cpuActive=started&&mode==="ai"&&!gameOver;
  const learningActive=started&&mode==="learning";
  const queueActive=online.status==="queued";
  const onlineMatchId=mode==="online"&&online.match?.id?online.match.id:null;
  const analyticsPrev=useRef({cpu:null,learning:null,queue:false,online:null});
  useEffect(()=>{
    const prev=analyticsPrev.current;
    const cpuKey=cpuActive?cpuStarts:null;
    const learningKey=learningActive?learningStarts:null;
    if(cpuKey!==null&&prev.cpu!==cpuKey)sendAnalytics("cpu","start");
    if(learningKey!==null&&prev.learning!==learningKey)sendAnalytics("learning","start");
    if(queueActive&&!prev.queue)sendAnalytics("queue","start");
    if(onlineMatchId&&prev.online!==onlineMatchId)sendAnalytics("online","start");
    prev.cpu=cpuKey;prev.learning=learningKey;prev.queue=queueActive;prev.online=onlineMatchId;
  },[cpuActive,cpuStarts,learningActive,learningStarts,queueActive,onlineMatchId]);
  useEffect(()=>{
    if(!cpuActive&&!learningActive&&!queueActive&&!onlineMatchId)return;
    const sendPresence=()=>{
      if(cpuActive)sendAnalytics("cpu","presence");
      if(learningActive)sendAnalytics("learning","presence");
      if(queueActive)sendAnalytics("queue","presence");
      if(onlineMatchId)sendAnalytics("online","presence");
    };
    sendPresence();
    const timer=setInterval(sendPresence,60000);
    return()=>clearInterval(timer);
  },[cpuActive,learningActive,queueActive,onlineMatchId]);

  const openingActive=useMemo(()=>timeline.every((position,i)=>{
    if(i===0)return true;
    const previous=timeline[i-1];
    return ["sente","gote"].every(side=>position.hands[side].length<=previous.hands[side].length);
  }),[timeline]);
 const cpuOwnMoves=timeline.slice(1).filter((_,i)=>((i%2===0)?"sente":"gote")===opponentSide).length;
 const seen=useMemo(()=>timeline.map(stateKey),[timeline]);
 const legal=useMemo(()=>gameOver?[]:mode==="learning"?learningActions(LEARNING_LEVELS[learningLevelIndex],state):generateAllLegalActions(state),[state,gameOver,mode,learningLevelIndex]);
 const selectable=useMemo(()=>legal.filter(a=>a.category==="drop"?handType!==null&&a.piece.type===handType:selected&&a.from?.[0]===selected[0]&&a.from?.[1]===selected[1]),[legal,selected,handType]);
 // 教材のページに対応する駒の移動範囲を、盤面操作を解禁せずに表示する。
 // 教材データの pageGuides はセリフページと同じ順序の配列。
 // [] は表示なし。旧教材の {0: {...}} 形式も引き続き使用可能。
 const learningPageGuide=(()=>{
  if(mode!=="learning")return [];
  const level=LEARNING_LEVELS[learningLevelIndex];
  const step=level.scenes?level.scenes[sceneIndex]:(level.steps?scriptedDisplayStep(level,learningHistory):null);
  const guidePages=["failure","afterMove","success"].includes(learningOutcome?.kind)
   ? (learningOutcome.pageGuides??[])
   : learningOutcome?.kind==="interlude"
   ?(level.interludePageGuides??[])
   :(level.scenes?step?.pageGuides:(step?.lines == null ? level.pageGuides : (step?.pageGuides ?? level.pageGuides)));
  const entry=guidePages?.[learningDialogue];
  return Array.isArray(entry)?entry:(entry?[entry]:[]);
 })();
 const learningGuidePieces=useMemo(()=>(learningPageGuide??[]).flatMap(guide=>{
  const match=/^([a-f])([1-6])$/.exec(guide.square||"");
  if(!match)return [];
  const row=6-Number(match[2]),col=match[1].charCodeAt(0)-97;
  const piece=state.board[row]?.[col];
  return piece?.side===guide.side&&piece.type===guide.type?[{row,col,piece}]:[];
 }),[learningPageGuide,state]);
  const failedDropGuide=useMemo(()=>mode==="learning"?learningFailureGuide(LEARNING_LEVELS[learningLevelIndex],sceneIndex,learningHistory,learningOutcome,learningResponsePending,state):null,[mode,learningLevelIndex,sceneIndex,learningHistory,learningResponsePending,learningOutcome?.kind,state]);
 // Keep the misplaced Hanna's range visible while the scripted opponent reply is pending.
  const pendingResponseGuide=(()=>{
   const spec=learningResponsePending?.pendingGuide;
   if(mode!=="learning"||!spec)return null;
   const match=/^([a-f])([1-6])$/.exec(spec.square||"");
   if(!match)return null;
   const row=6-Number(match[2]),col=match[1].charCodeAt(0)-97;
   const piece=state.board[row]?.[col];
   return piece?.type===spec.type&&piece.side===spec.side?{row,col,piece}:null;
  })();
  const activeGuides=pieceGuide?.row!=null&&pieceGuide?.col!=null?[pieceGuide]:(pendingResponseGuide?[pendingResponseGuide]:(failedDropGuide?[failedDropGuide]:learningGuidePieces));
 const activeGuide=activeGuides[0]??null;
 const guideTargets=useMemo(()=>{
  const targets=new Map();
  // 黄色（通常移動）は赤色（魔法）より常に優先。
  const mark=(key,color)=>{if(color==="normal"||!targets.has(key))targets.set(key,color)};
  for(const activeGuide of activeGuides){
  const guideActions=generatePseudoActions(state,activeGuide.row,activeGuide.col);
  for(const action of guideActions){
   const key=`${action.to[0]},${action.to[1]}`;
   if(action.category==="magic"||action.longForward)mark(key,"magic");
   else mark(key,"normal");
  }
  // マーゴ共通ガイド：通常移動は黄色、周囲の空マスは赤。
  // 敵駒のあるマスは跳躍暗殺が合法な場合のみ赤。味方駒は表示しない。
  if(activeGuide?.piece.type==="margo"){
   
   const {row,col,piece}=activeGuide;
   // 跳躍暗殺は横・斜め後ろ・真後ろの隣接敵を飛び越えて捕獲する。
   // 敵がそのマスに来たと仮定し、飛び越えた先が盤内かつ空いている場合のみ赤。
   const back=piece.side==="sente"?1:-1;
   for(const [dr,dc] of [[0,-1],[0,1],[back,-1],[back,0],[back,1]]){
    const r=row+dr,c=col+dc;
    const landingRow=row+2*dr,landingCol=col+2*dc;
    if(r<0||r>=6||c<0||c>=6)continue;
    if(landingRow<0||landingRow>=6||landingCol<0||landingCol>=6)continue;
    if(state.board[landingRow][landingCol])continue;
    const occupant=state.board[r][c];
    if(!occupant||occupant.side!==piece.side)mark(`${r},${c}`,"magic");
   }
   // 通常移動が可能なマスは常に黄色を優先する。
   for(const action of guideActions){
    if(action.category==="magic"||action.magic)continue;
    mark(`${action.to[0]},${action.to[1]}`,"normal");
   }
  }
   // Sherry capture-only diagonals: show even on empty squares in the long-press guide.
   if(activeGuide?.piece.type==="sherry"&&!activeGuide.piece.promoted){
    const {row,col,piece}=activeGuide;
    const forward=piece.side==="sente"?-1:1;
    for(const dc of [-1,1]){
     const r=row+forward,c=col+dc;
     if(r>=0&&r<6&&c>=0&&c<6&&state.board[r][c]?.side!==piece.side)
      targets.set(`${r},${c}`,"capture");
    }
   }
  // Show Nanoka's shooting range even when no enemy occupies the target.
  if(activeGuide?.piece.type==="nanoka"){
   const {row,col,piece}=activeGuide;
   const forward=piece.side==="sente"?-1:1;
   for(const dc of [-2,0,2]){
    const targetRow=row+2*forward,targetCol=col+dc;
    if(targetRow<0||targetRow>=6||targetCol<0||targetCol>=6)continue;
    if(state.board[row+forward][col+dc/2])continue;
    if(state.board[targetRow][targetCol]?.side===piece.side)continue;
    mark(`${targetRow},${targetCol}`,"magic");
   }
  }
  }
  return targets;
 },[activeGuides,state]);

 useEffect(()=>{worker.current=new Worker(new URL("./game/ai.worker.js",import.meta.url),{type:"module"});return()=>worker.current?.terminate()},[]);
  // BGM is selected from the visible game mode, not from queue status alone.
  // A CPU/learning game that is waiting for a human keeps its own music.
  const bgmTrack = started
    ? mode === "online" ? "/audio/新BGM.mp3"
      : mode === "learning" ? "/audio/learning-bgm.mp3"
      : "/audio/Halloween_Waltz.mp3"
    : (online.status === "queued" || online.status === "connecting")
      ? "/audio/カナリアスキップ.mp3" : null;
  useEffect(()=>{
    const current=backgroundMusic.current;
    if(!bgmTrack){
      if(current){current.pause();current.currentTime=0;current.src="";backgroundMusic.current=null;}
      return;
    }
    if(current?.datasetTrack===bgmTrack)return;
    if(current){current.pause();current.currentTime=0;}
    const audio=new Audio(bgmTrack);
    audio.datasetTrack=bgmTrack;
    audio.loop=true;
    audio.volume=bgmTrack==="/audio/learning-bgm.mp3"?.45:.3;
    backgroundMusic.current=audio;
    audio.play().catch(()=>{});
    return ()=>{audio.pause();audio.currentTime=0;if(backgroundMusic.current===audio)backgroundMusic.current=null;};
  },[bgmTrack]);
 useEffect(()=>()=>{backgroundMusic.current?.pause();backgroundMusic.current=null},[]);
 useEffect(()=>{
  const query=window.matchMedia(MOBILE_LAYOUT_QUERY);
  const update=()=>setMobileLayout(query.matches);
  update();query.addEventListener?.("change",update);
  return()=>query.removeEventListener?.("change",update);
 },[]);
 useEffect(()=>()=>clearTimeout(guideTimer.current),[]);
 useEffect(()=>{setPieceGuide(null);guideTriggered.current=false},[state]);
  const resultIdentity=mode==="online"&&online.match?.id&&result?`${online.match.id}:${result.winner??"draw"}:${result.reason}`:mode!=="online"&&result?`${mode}:${timeline.length}:${result.winner??"draw"}:${result.reason}`:null;
  const playedFinishRef=useRef(null);
  useEffect(()=>{
   if(!resultIdentity){playedFinishRef.current=null;return;}
   if(playedFinishRef.current===resultIdentity)return;
  if(!result||motionFx)return;
   playedFinishRef.current=resultIdentity;
  if(!["ema-safe-try","checkmate","no-legal-move"].includes(result.reason)){
   setFinishFxDone(true);setResultRevealReady(true);return;
  }
  const losingSide=result.winner===humanSide?opponentSide:humanSide;
  const timers=[];let cancelled=false;
  const wait=ms=>new Promise(resolve=>timers.push(setTimeout(resolve,ms)));
  const syncPhase=phase=>{if(!cancelled)setFinishFx(phase)};
  setFinishFxDone(false);
  setResultRevealReady(false);
  const run=async()=>{
   if(result.reason==="ema-safe-try"){
    syncPhase({phase:"try-transform",winner:result.winner,losingSide,promotionRevealed:false});
    if(cancelled)return;
    await wait(600);if(cancelled)return;
    setFinishFx(current=>current?.phase==="try-transform"?{...current,promotionRevealed:true}:current);
    await wait(2000);if(cancelled)return;
    syncPhase({phase:"try-arrow",winner:result.winner,losingSide,promotionRevealed:true});
    await wait(1400);if(cancelled)return;
    syncPhase({phase:"loser-shake",winner:result.winner,losingSide,promotionRevealed:true});
    await wait(1400);if(cancelled)return;
    syncPhase({phase:"loser-fall",winner:result.winner,losingSide,promotionRevealed:true});
    await wait(1500);if(cancelled)return;
    setFinishFx({phase:"done",winner:result.winner,losingSide,promotionRevealed:true});setFinishFxDone(true);
   }else{
    syncPhase({phase:"loser-shake",winner:result.winner,losingSide});
    await wait(1300);if(cancelled)return;
    syncPhase({phase:"loser-fall",winner:result.winner,losingSide});
    await wait(1400);if(cancelled)return;
    setFinishFx({phase:"done",winner:result.winner,losingSide});setFinishFxDone(true);
   }
  };
  run();
  return()=>{cancelled=true;timers.forEach(clearTimeout)};
 },[result,motionFx,humanSide,opponentSide]);
 useEffect(()=>{
  if(!result||!finishFxDone)return;
  
  const timer=setTimeout(()=>setResultRevealReady(true),1000);
  return()=>clearTimeout(timer);
 },[result,finishFxDone,humanSide]);
 useEffect(()=>{
  if(mode==="online"||mode==="learning"||!started||gameOver||!worker.current)return;
  if(state.turn===humanSide){worker.current.postMessage({type:"ponder",state,seen,openingActive:openingActive&&cpuOwnMoves<5,cpuOwnMoves,minDepth:difficultyDepth,...((waitingCpu||difficultyDepth===1||difficultyDepth===5)?{maxDepth:waitingCpu?5:difficultyDepth}:{})});return}
  setThinking(true);
  const id=++request.current;
  const effectEndsAt=Math.max(performance.now(),motionFxRef.current?.endsAt??0);
  const earliestCommitAt=effectEndsAt+1000;
  worker.current.onmessage=({data})=>{
   if(data.id!==id)return;
   setThinking(false);
   if(data.error||!data.result)return;
   const commit=()=>commitAction(data.result.action,state);
   const waitForFx=()=>{
    if(request.current!==id)return;
    if(motionFxRef.current){setTimeout(waitForFx,40);return}
    const remaining=earliestCommitAt-performance.now();
    if(remaining>0){setTimeout(waitForFx,remaining);return}
    commit();
   };
   waitForFx();
  };
  const effectRemainingMs=Math.max(0,effectEndsAt-performance.now());
  worker.current.postMessage({type:"think",id,state,seen,openingActive:openingActive&&cpuOwnMoves<5,cpuOwnMoves,timeLimitMs:effectRemainingMs+1000,minDepth:difficultyDepth,...((waitingCpu||difficultyDepth===1||difficultyDepth===5)?{maxDepth:waitingCpu?5:difficultyDepth}:{})});
 },[state,gameOver,seen,humanSide,started,difficultyDepth,mode,waitingCpu]);

 // 正解後の解説を終えた場合も、通常の正解手と同じ共通処理で次のシーンへ。
 function enterNextLearningScene(level,index,historyLength,timelineLength){
  if(index===level.scenes.length-1){
   setLearningOutcome({kind:"success",lines:level.successLines,pageGuides:level.successPageGuides??[]});setLearningDialogue(0);return;
  }
  const nextScene=level.scenes[index+1];
  if(nextScene?.resetOnEnter){
   const nextSetup=nextScene.resetOnEnter==="initial"?null:nextScene.setup;
   const fresh=learningStartState({...level,setup:nextSetup});
   setTimeline(t=>[...t,fresh]);
   sceneSnapshots.current[index+1]={t:timelineLength+1,h:historyLength};
  }else{
   sceneSnapshots.current[index+1]={t:timelineLength,h:historyLength};
  }
  setSelected(null);setHandType(null);setPieceGuide(null);
  setLearningTryDemoDone(false);setFinishFx(null);setFinishFxDone(false);setResultRevealReady(false);setLearningOutcome(null);setSceneIndex(index+1);setSceneAutoDone(false);setLearningDialogue(0);
 }
 async function commitAction(action,before){
  const generation=learningGeneration.current;
  await beginMotion(action,before);
  if(mode==="learning"&&generation!==learningGeneration.current)return;
  if(mode==="learning"){
   const record=learningMoveRecord(action,before);
   const level=LEARNING_LEVELS[learningLevelIndex];
   const history=[...learningHistory,record];
   setLearningHistory(history);
   const next=applyLegalAction(before,action);
   setTimeline(x=>[...x,next]);
   if(level.interludeRule){
    if(history.length===level.interludeRule.afterMove&&record.notation===level.interludeRule.trigger){
     setLearningOutcome({kind:"interlude",lines:level.interludeLines});
     setLearningDialogue(0);
     return;
    }
    if(history.length===level.interludeRule.finishAt){
     const rule=level.interludeRule;
     const row=6-Number(rule.captureSquare[1]),col=rule.captureSquare.charCodeAt(0)-97;
     const captured=before.board[row]?.[col];
     const correct=Object.entries(rule.finalMove).every(([k,v])=>record[k]===v)&&captured?.type===rule.capturePiece&&captured.side==="gote";
     setLearningOutcome(correct?{kind:"success",lines:level.successLines}:{kind:"failure",lines:level.finalMoveFailureLines||level.defaultFailureLines||["もう一度挑戦して。"]});
     setLearningDialogue(0);
     return;
    }
   }
    const opening=learningOpeningBranch(level,sceneIndex,record);
    if(opening){
     if(opening.response){setLearningResponsePending(opening);return;}
     setLearningOutcome({kind:"failure",lines:opening.lines??level[opening.linesKey],pageGuides:opening.pageGuides??[]});
     setLearningDialogue(0);return;
    }
   if(level.scenes){
    const scene=level.scenes[sceneIndex];
    scenePlayerSnapshots.current[sceneIndex]={t:timeline.length,h:learningHistory.length};
    if(!scenePlayerMatches(scene,record)){
     const branch=scriptedFailureBranch(scene,record);
      if(branch?.response){setLearningResponsePending({...branch,sceneFailure:true});return;}
     const dropGuide=scene.failureDropGuide;
     const hanna5DropGuide=Boolean(dropGuide&&record.piece===dropGuide.piece&&record.category==='drop'&&!dropGuide.exclude?.includes(record.to));
     const failurePageGuides=hanna5DropGuide?[[{side:'sente',type:'hanna',square:record.to}]]:branch?.pageGuides??[];
     setLearningOutcome({kind:"failure",lines:scriptedFailureLines(level,scene,record),pageGuides:failurePageGuides});
     setLearningDialogue(0);
    }
    else{
     if(scene.afterMoveLines?.length){
      // 正解後の盤面を維持したまま、解説セリフを表示する。
      setLearningOutcome({kind:"afterMove",lines:scene.afterMoveLines,pageGuides:scene.afterMovePageGuides??[]});
      setLearningDialogue(0);
     }else{
      enterNextLearningScene(level,sceneIndex,history.length,timeline.length+1);
     }
    }
    return;
   }
   if(level.steps){
    const step=scriptedStep(level,learningHistory);
    if(!scriptedPlayerMatches(step,record)){
     setLearningOutcome({kind:"failure",lines:scriptedFailureLines(level,step,record)});
     setLearningDialogue(0);
    }else if(history.length===level.steps.length){
     setLearningOutcome({kind:"success",lines:level.successLines,pageGuides:level.successPageGuides??[]});setLearningDialogue(0);
    }else{setLearningDialogue(0);}
    return;
   }
   const outcome=evaluateLearningHistory(level,history);
   if(outcome){
    if(outcome.kind==="failure"){
     // The matching failure branch owns its per-dialogue-page attack guides.
     // Do not reuse normal-page guides for failed moves.
     const branch=level.branches?.find(item=>learningBranchMatches(item,history));
     setLearningOutcome({...outcome,pageGuides:branch?.pageGuides??[]});
    }else setLearningOutcome(outcome);
    setLearningDialogue(0);
   }
   else setLearningDialogue(level.lines.length-1);
  }else setTimeline(x=>[...x,applyLegalAction(x[x.length-1],action)]);
 }
  // Configured wrong-move responses: delay, opponent move, failure dialogue.
  useEffect(()=>{
   const level=LEARNING_LEVELS[learningLevelIndex];
   if(!learningResponsePending||mode!=="learning")return;
   const generation=learningGeneration.current;
   const branch=learningResponsePending;
   let finishTimer;
   const timer=setTimeout(()=>{
    if(generation!==learningGeneration.current)return;
    const before={...state,turn:"gote"};
    const action=learningResponseAction(level,before,branch.response);
    if(!action){setLearningResponsePending(null);setLearningOutcome({kind:"failure",lines:["（失敗：相手の自動着手を確認してください）"]});setLearningDialogue(0);return;}
    beginMotion(action,before);
     setTimeline(t=>[...t,applyLegalAction(before,action)]);
     if(branch.sceneFailure)setLearningHistory(h=>[...h,learningMoveRecord(action,before)]);
     finishTimer=setTimeout(()=>{
     if(generation!==learningGeneration.current)return;
     setLearningResponsePending(null);
      setLearningOutcome({kind:"failure",sceneFailure:Boolean(branch.sceneFailure),lines:branch.lines??level[branch.linesKey],pageGuides:branch.pageGuides??[]});
     setLearningDialogue(0);
    },branch.finishDelayMs??750);
   },branch.delayMs??1000);
   return()=>{clearTimeout(timer);clearTimeout(finishTimer)};
  },[learningResponsePending,mode,learningLevelIndex]);
 // 中継2/3に到達したらヒロを一度だけ自動移動する。
 // アニメーション完了までセリフ送りをロックし、連打による状態競合を防ぐ。
 const interludeAutoPending=useRef(false);
 useEffect(()=>{
  if(mode!=="learning"||!(LEARNING_LEVELS[learningLevelIndex].interludeRule)||learningOutcome?.kind!=="interlude"||learningDialogue!==LEARNING_LEVELS[learningLevelIndex].interludeRule.autoAtPage||learningHistory.length!==LEARNING_LEVELS[learningLevelIndex].interludeRule.afterMove||interludeAutoPending.current)return;
  interludeAutoPending.current=true;
  learningAutoMovingRef.current=true;
  setLearningAutoMoving(true);
  const generation=learningGeneration.current;
  let cancelled=false;
  const timer=setTimeout(()=>{
   if(cancelled||generation!==learningGeneration.current)return;
   const opponent={...state,turn:"gote"};
   const action=learningResponseAction(LEARNING_LEVELS[learningLevelIndex],opponent,LEARNING_LEVELS[learningLevelIndex].interludeRule.autoMove);
   if(!action){
    setLearningOutcome({kind:"failure",lines:["ヒロをd5からd4へ動かせないわ。盤面の配置を確認してちょうだい。"]});
    setLearningDialogue(0);
    learningAutoMovingRef.current=false;setLearningAutoMoving(false);interludeAutoPending.current=false;
    return;
   }
   // 移動先の駒を描画するタイミングでアニメーションを開始する。
   // 先に演出だけ開始すると、移動先の駒が存在せずアニメーションが見えない。
   beginMotion(action,opponent);
   setTimeline(x=>[...x,applyLegalAction(opponent,action)]);
   // 演出完了まではセリフをロック。棋譜の確定は演出後に行う。
   setTimeout(()=>{
    if(cancelled||generation!==learningGeneration.current)return;
    setLearningHistory(x=>[...x,learningMoveRecord(action,opponent)]);
    setSelected(null);setHandType(null);setPieceGuide(null);
    learningAutoMovingRef.current=false;setLearningAutoMoving(false);interludeAutoPending.current=false;
   },570);
  },250);
  return()=>{cancelled=true;clearTimeout(timer);};
 // 依存するのはページと棋譜の段階のみ。盤面のアニメーション更新ではキャンセルしない。
 },[mode,learningLevelIndex,learningOutcome?.kind,learningDialogue,learningHistory.length]);
 // Scene events run at their configured page, without advancing the dialogue.
 useEffect(()=>{
  const scene=LEARNING_LEVELS[learningLevelIndex].scenes?.[sceneIndex];
  if(mode!=="learning"||!scene?.autoMove||learningOutcome||sceneAutoDone||sceneBusy.current||learningDialogue!==scene.autoMoveAt)return;
  sceneBusy.current=true;learningAutoMovingRef.current=true;setLearningAutoMoving(true);
  const generation=learningGeneration.current;
  const timer=setTimeout(()=>{
   if(generation!==learningGeneration.current)return;
   const autoSide=scene.autoMoveSide??"gote";
    const before={...state,turn:autoSide};
    const action=learningActions(LEARNING_LEVELS[learningLevelIndex],before).find(a=>{
     const record=learningMoveRecord(a,before);
     return Object.entries(scene.autoMove).every(([key,value])=>record[key]===value);
    });
   if(!action){setLearningOutcome({kind:"failure",lines:["後手の着手が合法ではないわ。盤面を確認してちょうだい。"]});setLearningDialogue(0);clearScene();return}
   beginMotion(action,before);setTimeline(t=>[...t,applyLegalAction(before,action)]);
   sceneTimers.current.push(setTimeout(()=>{
    if(generation!==learningGeneration.current)return;
    setLearningHistory(h=>[...h,learningMoveRecord(action,before)]);setSceneAutoDone(true);
    setSelected(null);setHandType(null);setPieceGuide(null);clearScene();
   },action.magic==="銃撃"?1080:600));
  },scene.autoDelayMs??250);sceneTimers.current.push(timer);
 },[mode,learningLevelIndex,sceneIndex,learningDialogue,sceneAutoDone,learningOutcome?.kind]);
  // 第2章5節の追跡実演。通常の着手エンジンで11手を順に再生する。
  useEffect(()=>{
   const level=LEARNING_LEVELS[learningLevelIndex];
   const scene=level.scenes?.[sceneIndex];
   if(mode!=="learning"||!scene?.autoSequence||sceneAutoDone||learningOutcome)return;
   const generation=learningGeneration.current;
   let cancelled=false;
   let position=state;
   const timers=[];
   const wait=ms=>new Promise(resolve=>timers.push(setTimeout(resolve,ms)));
   learningAutoMovingRef.current=true;setLearningAutoMoving(true);
   const run=async()=>{
    for(let i=0;i<scene.autoSequence.length;i++){
     await wait(i===0?(scene.firstDelayMs??1000):(scene.intervalMs??700));
     if(cancelled||generation!==learningGeneration.current)return;
     const spec=scene.autoSequence[i];
     const before={...position,turn:spec.side};
     const action=learningActions(level,before).find(a=>{
      const record=learningMoveRecord(a,before);
      return Object.entries(spec).every(([k,v])=>!["side","piece","from","to","category","magic"].includes(k)||record[k]===v);
     });
     if(!action){
      setLearningOutcome({kind:"failure",lines:[`自動手順${i+1}手目（${spec.piece} ${spec.from||"打"}→${spec.to}）が実行できないわ。盤面を確認してちょうだい。`]});
      setLearningDialogue(0);learningAutoMovingRef.current=false;setLearningAutoMoving(false);return;
     }
     beginMotion(action,before);
     position=applyLegalAction(before,action);
     setTimeline(t=>[...t,position]);
     setLearningHistory(h=>[...h,learningMoveRecord(action,before)]);
    }
    await wait(650);
    if(cancelled||generation!==learningGeneration.current)return;
    setSceneAutoDone(true);setLearningTryDemoDone(true);
    // The existing try beam and falling Emma effects run from result.
    await wait(7000);
    if(cancelled||generation!==learningGeneration.current)return;
    learningAutoMovingRef.current=false;setLearningAutoMoving(false);
   };
   run();
   // Resetting the chapter increments learningGeneration, which invalidates pending moves.
   return()=>{cancelled=true;timers.forEach(clearTimeout)};
  },[mode,learningLevelIndex,sceneIndex,learningOutcome?.kind]);
 // Scripted opponent actions are bound to a specific dialogue page, not to a fixed one-page step.
 // Lock synchronously on entering the trigger page, and never cancel a pending move on re-render.
 const scriptedAutoRunning=useRef(false);
 const scriptedAutoTimers=useRef([]);
 const clearScriptedAuto=()=>{
  scriptedAutoTimers.current.forEach(clearTimeout);scriptedAutoTimers.current=[];
  scriptedAutoRunning.current=false;learningAutoMovingRef.current=false;setLearningAutoMoving(false);
 };
 useEffect(()=>{
  const level=LEARNING_LEVELS[learningLevelIndex];
  if(mode!=="learning"||!level.steps||learningOutcome||scriptedAutoRunning.current)return;
  const step=scriptedStep(level,learningHistory);
  const lines=scriptedLines(level,learningHistory);
  if(step?.side!=="gote"||learningDialogue!==scriptedAutoMovePage(step,lines))return;
  scriptedAutoRunning.current=true;
  learningAutoMovingRef.current=true;setLearningAutoMoving(true);
  const generation=learningGeneration.current;
  const historyLength=learningHistory.length;
  const timer=setTimeout(()=>{
   if(generation!==learningGeneration.current)return;
   const opponent={...state,turn:"gote"};
   const action=scriptedAutoAction(step,opponent);
   if(!action){
    setLearningOutcome({kind:"failure",lines:level.defaultFailureLines||["指定された後手の手が合法ではないわ。"]});
    setLearningDialogue(0);clearScriptedAuto();return;
   }
   beginMotion(action,opponent);
   setTimeline(x=>[...x,applyLegalAction(opponent,action)]);
   const finish=setTimeout(()=>{
    if(generation!==learningGeneration.current)return;
    setLearningHistory(x=>[...x,learningMoveRecord(action,opponent)]);
    // Stay on the current explanation page after the animation.
    // The next player move is enabled on the final page of this same dialogue.
    // The last scripted move waits for a deliberate page advance before showing success.
    setSelected(null);setHandType(null);setPieceGuide(null);
    clearScriptedAuto();
   },action.magic==="銃撃"?1080:600);
   scriptedAutoTimers.current.push(finish);
  },250);
  scriptedAutoTimers.current.push(timer);
  // No effect cleanup: changing lock state must not cancel the scheduled action.
 },[mode,learningLevelIndex,learningHistory.length,learningDialogue,learningOutcome?.kind]);
 function advanceLearningDialogue(){
  if(learningAutoMovingRef.current)return;
  if(mode==="learning"&&learningOutcome?.kind==="afterMove"){
   if(learningDialogue===learningOutcome.lines.length-1){
    enterNextLearningScene(learningLevel,sceneIndex,learningHistory.length,timeline.length);
   }else setLearningDialogue(n=>n+1);
   return;
  }
  if(mode==="learning"&&learningLevel.scenes&&!learningOutcome){
   const scene=learningLevel.scenes[sceneIndex];
   if(scene&&!scene.correct?.length&&learningIsLast&&(!scene.autoMove&&!scene.autoSequence||sceneAutoDone)){enterNextLearningScene(learningLevel,sceneIndex,learningHistory.length,timeline.length);return}
  }
  if(mode==="learning"&&learningLevel.interludeRule&&learningOutcome?.kind==="interlude"&&learningDialogue===0&&learningHistory.length===learningLevel.interludeRule.afterMove){
   learningAutoMovingRef.current=true;setLearningAutoMoving(true);
  }
  if(mode==="learning"&&learningLevel.steps&&!learningOutcome&&
     learningHistory.length===learningLevel.steps.length&&learningIsLast){
   setLearningOutcome({kind:"success",lines:learningLevel.successLines,pageGuides:learningLevel.successPageGuides??[]});
   setLearningDialogue(0);return;
  }
  setLearningDialogue(n=>Math.min(learningLines.length-1,n+1));
 }
 function play(action){
  if(onlineBlocked||thinking||motionFx||state.turn!==humanSide||gameOver||learningBoardLocked)return;
  if(mode==="online")online.move(action);else commitAction(action,state);
  setSelected(null);setHandType(null);
 }
 function beginPieceGuide(piece,row,col){
  if(!piece||motionFx)return;
  clearTimeout(guideTimer.current);guideTriggered.current=false;
  guideTimer.current=setTimeout(()=>{
   guideTriggered.current=true;
   setSelected(null);setHandType(null);
   setPieceGuide({piece:{...piece},row,col});
   navigator.vibrate?.(18);
  },500);
 }
 function endPieceGuide(){clearTimeout(guideTimer.current)}
 function click(row,col){
  if(guideTriggered.current){guideTriggered.current=false;return}
  if(pieceGuide){setPieceGuide(null);return}
  if(onlineBlocked||thinking||motionFx||state.turn!==humanSide||gameOver||learningBoardLocked)return;
  const choices=selectable.filter(a=>a.to[0]===row&&a.to[1]===col);
  if(choices.length){play(choices.find(a=>a.magic)||choices[0]);return}
  const piece=state.board[row][col];
  if(piece?.side===humanSide){setSelected([row,col]);setHandType(null)}else setSelected(null);
 }
 async function resign(){
  if(gameOver)return;
  if(mode==="online"){await online.resign();return}
  request.current++;
 worker.current?.postMessage({type:"reset"});
  
  setThinking(false);setSelected(null);setHandType(null);setResigned(true);
 }
  const alreadyWaiting=online.status==='queued'||online.status==='connecting';
  // Learning asks about background matchmaking only when entering from the title.
  // Moving between sections keeps the existing queue preference unchanged.
  function requestLearningLevel(index){
   if(index<0||index>=LEARNING_LEVELS.length)return;
   chooseLearningLevel(index);
  }
  function chooseCpuDifficulty(depth){
   setDifficultyPrompt(null);
   startNewMatch(depth,alreadyWaiting||backgroundQueueMode==='cpu');
   if(backgroundQueueMode==='cpu'&&!alreadyWaiting)online.queue('cpu');
  }
  function restorePreviousMode(){
   let saved=returnSnapshotRef.current;
   if(!saved)try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{}
   if(!saved||!['ai','learning'].includes(saved.mode))return;
   online.leaveMatch();setBackgroundQueueMode(null);setSavedReturnMode(null);
   returnSnapshotRef.current=null;try{localStorage.removeItem(STORAGE_KEY)}catch{}
   learningGeneration.current++;request.current++;worker.current?.postMessage({type:'reset'});
   clearScene();setMode(saved.mode);setStarted(true);setHumanSide(saved.humanSide);
   setTimeline(saved.timeline);setDifficultyDepth(saved.difficultyDepth);setWaitingCpu(false);
   setSelected(null);setHandType(null);setThinking(false);setResigned(false);
   setFinishFx(null);setFinishFxDone(false);setResultRevealReady(false);setMotionFx(null);motionFxRef.current=null;
   if(saved.mode==='learning'){
    setLearningLevelIndex(saved.learningLevelIndex);setLearningDialogue(saved.learningDialogue);
    setLearningHistory(saved.learningHistory);setLearningOutcome(saved.learningOutcome);
    setSceneIndex(saved.sceneIndex);setSceneAutoDone(saved.sceneAutoDone);
    sceneSnapshots.current=saved.sceneSnapshots||[];scenePlayerSnapshots.current=saved.scenePlayerSnapshots||[];
    setLearningChapterSelect(false);setConfirmLearningBack(false);
   }
  }
 async function startNewMatch(depth,cpuWhileWaiting=false){
   setCpuStarts(n=>n+1);
  setWaitingCpu(cpuWhileWaiting);
  setMode("ai");
  request.current++;
  worker.current?.postMessage({type:"reset"});
  motionFxRef.current=null;setDifficultyDepth(depth);setDifficultyPrompt(null);setHumanSide(randomSide());setTimeline([makeInitialState()]);setSelected(null);setHandType(null);setThinking(false);setResigned(false);setFinishFx(null);setFinishFxDone(false);setResultRevealReady(false);setMotionFx(null);setStarted(true);
 }
 function startLearning(){
   setLearningResponsePending(null);
   setLearningStarts(n=>n+1);
  clearScene();setLearningTryDemoDone(false);setSceneIndex(0);setSceneAutoDone(false);sceneSnapshots.current=[{t:1,h:0}];scenePlayerSnapshots.current=[];
  learningGeneration.current++;
  setLearningLevelIndex(0);
  request.current++;worker.current?.postMessage({type:"reset"});
  setMode("learning");setHumanSide("sente");setTimeline([learningStartState(LEARNING_LEVELS[0])]);
  setSelected(null);setHandType(null);setThinking(false);setResigned(false);
  setFinishFx(null);setFinishFxDone(false);setResultRevealReady(false);setMotionFx(null);motionFxRef.current=null;
  setLearningDialogue(0);setLearningHistory([]);setLearningOutcome(null);setLearningChapterSelect(false);setConfirmLearningBack(false);setStarted(true);
 }
 function restoreLearningLevel(levelIndex=learningLevelIndex){
  setLearningResponsePending(null);
  clearScene();setLearningTryDemoDone(false);setSceneIndex(0);setSceneAutoDone(false);sceneSnapshots.current=[{t:1,h:0}];scenePlayerSnapshots.current=[];
  learningAutoMovingRef.current=false;setLearningAutoMoving(false);interludeAutoPending.current=false;
  learningGeneration.current++;
  request.current++;worker.current?.postMessage({type:"reset"});
  clearTimeout(guideTimer.current);guideTriggered.current=false;
  motionSequence.current++;
  setHumanSide(LEARNING_LEVELS[levelIndex].humanSide??"sente");
   setTimeline([learningStartState(LEARNING_LEVELS[levelIndex])]);
  setSelected(null);setHandType(null);setPieceGuide(null);setThinking(false);
  setResigned(false);setFinishFx(null);setFinishFxDone(false);setResultRevealReady(false);
  setMotionFx(null);motionFxRef.current=null;
  setLearningHistory([]);setLearningOutcome(null);clearScriptedAuto();
 }
 function resetScriptedStep(){
  learningGeneration.current++;clearScriptedAuto();
  learningAutoMovingRef.current=false;setLearningAutoMoving(false);
  motionSequence.current++;motionFxRef.current=null;setMotionFx(null);
  if(learningOutcome?.kind==="failure"){setTimeline(t=>t.slice(0,-1));setLearningHistory(h=>h.slice(0,-1));}
  setLearningOutcome(null);
  // Return to the last instruction page of the step being retried, not its first page.
  const retryHistoryLength=Math.max(0,learningHistory.length-(learningOutcome?.kind==="failure"?1:0));
  const retryLines=scriptedLines(learningLevel,learningHistory.slice(0,retryHistoryLength));
  setLearningDialogue(Math.max(0,retryLines.length-1));
  setSelected(null);setHandType(null);setPieceGuide(null);
 }
 // The top-right retry always restarts the entire section, including page one.
 function restartLearningSection(){
  restoreLearningLevel();
  setLearningDialogue(0);
 }
 // Retry inside the dialogue restores the position just before the failed move.
 function retryLearningMove(){
  if(learningLevel.scenes){
   if(learningOutcome?.kind==="failure"){
     if(learningLevel.retryOpeningFailure&&sceneIndex===0){
      restoreLearningLevel(learningLevelIndex);
      setLearningDialogue(learningLevel.scenes[0].playerMoveAt);
      setLearningResponsePending(null);return;
     }
    learningGeneration.current++;clearScene();motionSequence.current++;motionFxRef.current=null;setMotionFx(null);
     const rollback=learningOutcome?.sceneFailure?2:1;
     setTimeline(t=>t.slice(0,-rollback));setLearningHistory(h=>h.slice(0,-rollback));setLearningOutcome(null);
    setLearningDialogue(learningLevel.scenes[sceneIndex].playerMoveAt);setSelected(null);setHandType(null);setPieceGuide(null);
   }return;
  }
  if(learningLevel.steps){resetScriptedStep();return;}
  // 中継後の失敗なら、直前の自動着手完了時点に戻して再挑戦する。
  // timeline: [開始局面, ナノカb2→c2, ヒロd5→d4, 失敗した手]
  if(mode==="learning"&&Boolean(learningLevel.interludeRule)&&
     learningOutcome?.kind==="failure"&&learningHistory.length>=3&&timeline.length>=3){
   learningGeneration.current++;
   learningAutoMovingRef.current=false;setLearningAutoMoving(false);interludeAutoPending.current=false;
   clearTimeout(guideTimer.current);guideTriggered.current=false;
   motionSequence.current++;motionFxRef.current=null;setMotionFx(null);
   setTimeline(t=>t.slice(0,3));
   setLearningHistory(h=>h.slice(0,2));
   setLearningOutcome({kind:"interlude",lines:learningLevel.interludeLines});
   setLearningDialogue(Math.max(0,learningLevel.interludeLines.length-1));
   setSelected(null);setHandType(null);setPieceGuide(null);
   setThinking(false);setResigned(false);setFinishFx(null);
   setFinishFxDone(false);setResultRevealReady(false);
   return;
  }
  // 最初の手で失敗した場合は、そのレベルの開始配置と最後の指示ページに戻す。
  restoreLearningLevel();
  setLearningDialogue(Math.max(0,LEARNING_LEVELS[learningLevelIndex].lines.length-1));
 }
 function previousLearningPage(){
  if(learningOutcome?.kind==="afterMove"){
   if(learningDialogue>0)setLearningDialogue(n=>n-1);
   return;
  }
  if(learningOutcome?.kind==="success"){
   // Success dialogue is a boundary: never return to a prior scene.
   // The player may navigate backward only inside successLines.
   if(learningDialogue>0)setLearningDialogue(n=>n-1);
   return;
  }
  if(learningLevel.scenes){
   if(learningAutoMovingRef.current||learningOutcome)return;
   const scene=learningLevel.scenes[sceneIndex];
   if(learningDialogue>0){
    if(scene?.autoMove&&sceneAutoDone&&learningDialogue===scene.autoMoveAt){learningGeneration.current++;clearScene();motionSequence.current++;motionFxRef.current=null;setMotionFx(null);setTimeline(t=>t.slice(0,-1));setLearningHistory(h=>h.slice(0,-1));setSceneAutoDone(false);setSelected(null);setHandType(null);setPieceGuide(null)}
    setLearningDialogue(n=>n-1);return;
   }
   if(sceneIndex===0)return;
   learningGeneration.current++;clearScene();motionSequence.current++;motionFxRef.current=null;setMotionFx(null);
   const prev=sceneIndex-1,snap=scenePlayerSnapshots.current[prev]||sceneSnapshots.current[prev]||{t:1,h:0};
   setTimeline(t=>t.slice(0,snap.t));setLearningHistory(h=>h.slice(0,snap.h));setSceneIndex(prev);
   setSceneAutoDone(Boolean(learningLevel.scenes[prev].autoMove));setLearningDialogue(learningLevel.scenes[prev].lines.length-1);setSelected(null);setHandType(null);setPieceGuide(null);return;
  }
  if(learningLevel.steps){
   if(learningAutoMovingRef.current||learningDialogue<0)return;
   if(learningDialogue>0){
    const previous=learningLevel.steps[learningHistory.length-1];
    if(previous?.side==="gote"&&learningDialogue===scriptedAutoMovePage(previous,previous.lines)){
     learningGeneration.current++;clearScriptedAuto();
     motionSequence.current++;motionFxRef.current=null;setMotionFx(null);
     setTimeline(t=>t.slice(0,-1));setLearningHistory(h=>h.slice(0,-1));
     setSelected(null);setHandType(null);setPieceGuide(null);
    }
    setLearningDialogue(n=>n-1);
    return;
   }
   if(!learningHistory.length||learningOutcome)return;
   const previous=learningLevel.steps[learningHistory.length-1];
   const previousLines=scriptedLines(learningLevel,learningHistory.slice(0,-1));
   if(previous?.side==="gote"){
    learningGeneration.current++;clearScriptedAuto();
    motionSequence.current++;motionFxRef.current=null;setMotionFx(null);
    setTimeline(t=>t.slice(0,-1));
    setLearningHistory(h=>h.slice(0,-1));
    setLearningDialogue(Math.max(0,scriptedAutoMovePage(previous,previousLines)-1));
   }else{
    setLearningDialogue(Math.max(0,previousLines.length-1));
   }
   return;
  }
  if(learningAutoMovingRef.current||learningDialogue<=0)return;
  // 中継ページを戻したら、戻り先の時点まで局面・棋譜を巻き戻す。
  // 2/3 -> 1/3 ではヒロの自動着手だけを取り消し、ナノカの初手は残す。
  if(mode==="learning"&&learningOutcome?.kind==="interlude"&&Boolean(learningLevel.interludeRule)){
   learningGeneration.current++;
   interludeAutoPending.current=false;
   clearTimeout(guideTimer.current);guideTriggered.current=false;
   motionSequence.current++;
   motionFxRef.current=null;setMotionFx(null);
   setSelected(null);setHandType(null);setPieceGuide(null);
   setLearningAutoMoving(false);learningAutoMovingRef.current=false;
   setTimeline(t=>t.slice(0,2));
   setLearningHistory(h=>h.slice(0,1));
   setLearningDialogue(n=>n-1);
   return;
  }
  // 通常の説明ページは開始局面に戻す。結果の読み返しは盤面を維持。
  if(!learningOutcome)restoreLearningLevel();
  setLearningDialogue(n=>Math.max(0,n-1));
 }
 function chooseLearningLevel(index){
  if(index<0||index>=LEARNING_LEVELS.length)return;
  setLearningStarts(n=>n+1);
  restoreLearningLevel(index);
  setLearningLevelIndex(index);
  setLearningDialogue(0);
  setLearningChapterSelect(false);
  setConfirmLearningBack(false);
 }
 function advanceLearningChapter(){
  const next=learningLevelIndex+1;
  if(next>=LEARNING_LEVELS.length){setLearningChapterSelect(true);return;}
  requestLearningLevel(next);
 }
 function leaveLearning(){
   if(backgroundQueueMode==='learning'){online.cancel();setBackgroundQueueMode(null)}
  learningGeneration.current++;
  request.current++;worker.current?.postMessage({type:"reset"});
  backgroundMusic.current?.pause();backgroundMusic.current=null;
  setConfirmLearningBack(false);setLearningChapterSelect(false);setStarted(false);setMode("ai");
 }
 const learningLevel=LEARNING_LEVELS[learningLevelIndex];
 const learningLines=learningOutcome?.lines||(learningLevel.scenes?learningLevel.scenes[sceneIndex]?.lines||learningLevel.lines:(learningLevel.steps?scriptedLines(learningLevel,learningHistory):learningLevel.lines));
 const learningIsLast=learningDialogue===learningLines.length-1;
 const learningBoardLocked=mode==="learning"&&(learningAutoMoving||learningOutcome?.kind==="failure"||learningOutcome?.kind==="success"||learningOutcome?.kind==="afterMove"||(learningLevel.scenes
  ? (()=>{const scene=learningLevel.scenes[sceneIndex];return !scene?.correct?.length||learningDialogue<(scene.playerMoveAt??scene.lines.length-1)||(Boolean(scene.autoMove)&&!sceneAutoDone)})()
  : learningLevel.steps
  ? (()=>{
      const current=scriptedStep(learningLevel,learningHistory);
      if(current?.side!=="sente")return true;
      const previous=learningLevel.steps[learningHistory.length-1];
      const unlockAt=previous?.side==="gote"
       ? (Number.isInteger(previous.allowNextMoveAt)?previous.allowNextMoveAt:learningLines.length-1)
       : learningLines.length-1;
      return learningDialogue<unlockAt;
    })()
  : (learningOutcome?.kind==="interlude" ? !(learningDialogue===learningLines.length-1&&learningHistory.length===2) : learningDialogue!==learningLevel.lines.length-1||(Boolean(learningLevel.interludeRule)?learningHistory.length!==0:learningHistory.length >= (learningLevel.correct?.length || 1)))));
 async function beginMotion(action,before){
  const moving=action.category==="drop"?action.piece:before.board[action.from[0]][action.from[1]];
  const captureAt=action.swap?null:action.captureAt??(before.board[action.to[0]][action.to[1]]?[...action.to]:null);
  const captured=captureAt?before.board[captureAt[0]][captureAt[1]]:null;
  const isNanokaShot=Boolean(moving?.type==="nanoka"&&action.magic==="銃撃"&&captured&&captureAt);
  const impactDelay=isNanokaShot?320:0;
  const duration=isNanokaShot?1050:captured?720:action.category==="drop"?470:550;
  const id=++motionSequence.current;
  const fx={id,action,moving,mover:before.turn,captureAt,captured,capturedOriginalSide:captured?.side??null,isNanokaShot,impactReached:!isNanokaShot,impactDelay,promotionRevealed:!action.promote,endsAt:performance.now()+duration};
  motionFxRef.current=fx;setMotionFx(fx);
  if(isNanokaShot)setTimeout(()=>{
   if(motionFxRef.current?.id!==id)return;
   const impacted={...motionFxRef.current,impactReached:true,impactDelay:0};
   motionFxRef.current=impacted;setMotionFx(impacted);
  },impactDelay);
  if(action.promote)setTimeout(()=>{
   if(motionFxRef.current?.id!==id)return;
   const revealed={...motionFxRef.current,promotionRevealed:true};
   motionFxRef.current=revealed;setMotionFx(revealed);
  },213);
  setTimeout(()=>{if(motionFxRef.current?.id===id)motionFxRef.current=null;setMotionFx(current=>current?.id===id?null:current)},duration);
 }

 const targets=new Map(selectable.map(a=>[`${a.to[0]},${a.to[1]}`,a]));
 const endMessage=mode==="learning"?"":resigned?"敗北…":result&&finishFxDone&&resultRevealReady?(result.winner===null?"引き分け":result.winner===humanSide?"勝利！":"敗北…"):"";
 const pieceFxClass=piece=>{
  if(!piece||piece.type!=="ema"||!finishFx)return"";
  if((finishFx.phase==="try-transform"||finishFx.phase==="try-arrow")&&piece.side===finishFx.winner)return" ema--try-glow";
  if(finishFx.phase==="loser-shake"&&piece.side===finishFx.losingSide)return" ema--loser-shake";
  if(finishFx.phase==="loser-fall"&&piece.side===finishFx.losingSide)return` ema--loser-fall ema--loser-fall-${piece.side===humanSide?"sente":"gote"}`;
  if(finishFx.phase==="done"&&piece.side===finishFx.losingSide)return" ema--gone";
  return"";
 };
 const findEmmaPosition=side=>{for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(state.board[r][c]?.type==="ema"&&state.board[r][c].side===side)return[r,c];return null};
 const arrowFrom=finishFx&&findEmmaPosition(finishFx.winner),arrowTo=finishFx&&findEmmaPosition(finishFx.losingSide);
 const showTryArrow=finishFx?.phase==="try-arrow"&&arrowFrom&&arrowTo;
 const showNanokaShot=Boolean(motionFx?.isNanokaShot&&motionFx.action.from&&motionFx.captureAt);
 const toVisual=([r,c])=>humanSide==="sente"?[r,c]:[5-r,5-c];
 const motionClass=(piece,r,c)=>{
  if(!motionFx||!piece||piece.side!==motionFx.mover)return"";
  if(motionFx.action.swap&&c===motionFx.action.from[1]&&r===motionFx.action.from[0])return" motion-swap-return";
  if(c!==motionFx.action.to[1]||r!==motionFx.action.to[0])return"";
  if(motionFx.action.category==="drop")return" motion-drop";
  if(motionFx.moving.type==="hanna"&&Math.abs(motionFx.action.to[0]-motionFx.action.from[0])===2)return" motion-float";
  if(motionFx.moving.type==="sherry"&&Math.abs(motionFx.action.to[0]-motionFx.action.from[0])===2)return" motion-dash";
  if(motionFx.action.magic==="跳躍暗殺")return" motion-jump";
  return" motion-slide";
 };
 const motionStyle=(r,c,moveClass)=>{
  if(!moveClass)return undefined;
  if(moveClass.includes("motion-drop"))return dropStyle(r,c);
  const direction=humanSide==="sente"?1:-1;
  if(moveClass.includes("motion-swap-return"))return {"--move-x":`${(motionFx.action.to[1]-c)*100*direction}%`,"--move-y":`${(motionFx.action.to[0]-r)*100*direction}%`};
  return motionFx?.action.from?{"--move-x":`${(motionFx.action.from[1]-c)*100*direction}%`,"--move-y":`${(motionFx.action.from[0]-r)*100*direction}%`}:undefined;
 };
 const captureOrder={sherry:0,hanna:1,hiro:2,nanoka:3,margo:4};
 const captureTargetIndex=motionFx?.captured?(motionFx.mover===humanSide?captureOrder[motionFx.captured.type]:4-captureOrder[motionFx.captured.type]):2;
 const visibleHand=side=>{
  const pieces=state.hands[side];
  if(!motionFx?.captured||motionFx.captured.type==="ema"||motionFx.mover!==side)return pieces;
  let hidden=-1;
  for(let i=pieces.length-1;i>=0;i--)if(pieces[i].type===motionFx.captured.type){hidden=i;break}
  return hidden<0?pieces:pieces.filter((_,i)=>i!==hidden);
 };
 const dropStyle=(r,c)=>{
  if(motionFx?.action.category!=="drop")return undefined;
  const orderIndex=HAND_ORDER.indexOf(motionFx.moving.type);
  const visualIndex=motionFx.mover===humanSide?orderIndex:HAND_ORDER.length-1-orderIndex;
  const sourceColumn=mobileLayout?(visualIndex+.5)*6/HAND_ORDER.length-.5:motionFx.mover===humanSide?6.72:-.72;
  const sourceRow=mobileLayout?(motionFx.mover===humanSide?6.72:-.72):(visualIndex+.5)*6/HAND_ORDER.length-.5;
  const [visualRow,visualColumn]=toVisual([r,c]);
  return {"--drop-x":`${(sourceColumn-visualColumn)*100}%`,"--drop-y":`${(sourceRow-visualRow)*100}%`};
 };

 const visualCells=Array.from({length:36},(_,index)=>{
  const visualRow=Math.floor(index/6),visualColumn=index%6;
  const [row,column]=humanSide==="sente"?[visualRow,visualColumn]:[5-visualRow,5-visualColumn];
  return{row,column};
 });
 const captureVisual=motionFx?.captureAt?toVisual(motionFx.captureAt):null;
 const captureDestination=mobileLayout
  ?{"--capture-left":`${(captureTargetIndex??2)*20+3}%`,"--capture-top":motionFx?.mover===humanSide?"104%":"-21%"}
  :{"--capture-left":motionFx?.mover===humanSide?"104%":"-21%","--capture-top":`${(captureTargetIndex??2)*20+3}%`};
 const shotFrom=showNanokaShot?toVisual(motionFx.action.from):null,shotTo=showNanokaShot?toVisual(motionFx.captureAt):null;
 const tryFrom=showTryArrow?toVisual(arrowFrom):null,tryTo=showTryArrow?toVisual(arrowTo):null;

 if(!started)return <main className="title-screen">
  <NicknameReset nickname={online.nickname} profile={online.profile} onLoad={online.loadProfile} onReset={online.resetNickname}/>
  <div className="title-screen__shade" aria-hidden="true"/>
 <h2 className="title-screen__logo"><span style={{display:"block",fontSize:"50%",lineHeight:1.5}}>【非公式作品】<br />計画性のないナノカちゃん作</span>魔法少女ノ魔法将棋</h2>
 <div className="title-screen__actions">
   <div className="title-screen__duo"><button className="title-screen__start" onClick={()=>setDifficultyPrompt("start")}>CPU戦</button><button className="title-screen__start title-screen__learning" onClick={startLearning}>学習モード</button></div>
   <button className={`title-screen__start title-screen__online ${onlineEventOpen?"":"title-screen__online--closed"}`} onClick={()=>{const hour=Number(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Tokyo",hour:"numeric",hourCycle:"h23"}).format(new Date()));if(hour===21)online.queue();else setShowOnlineClosed(true)}} disabled={online.status==="connecting"||online.status==="queued"}><span>オンライン対戦</span><span className="title-screen__online-sub">{onlineEventOpen?(online.waitingCount>0?`開催中（${online.waitingCount}人待機）`:"開催中！"):"（21:00～22:00開催）"}</span></button>
   <a className="title-screen__shop" href="https://nanochan-portal.vercel.app/" target="_blank" rel="noreferrer">Portalに戻る</a>
  </div>
  {showOnlineClosed&&<div className="online-closed-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setShowOnlineClosed(false)}}><section className="online-closed-dialog" role="dialog" aria-modal="true" aria-label="オンライン対戦の開催時間"><p>21:00まで待ってちょうだい。<br/>あなたは、待てもできないバカ犬なのかしら。<br/>まるで桜羽エマね。</p><button type="button" onClick={()=>setShowOnlineClosed(false)}>閉じる</button></section></div>}
  <OnlineLobby online={online} background={Boolean(difficultyPrompt||backgroundQueueMode)} onCpu={()=>startNewMatch(5,true)}/>
  {difficultyPrompt&&<DifficultyDialog onChoose={chooseCpuDifficulty} onCancel={()=>{setDifficultyPrompt(null);if(!alreadyWaiting)setBackgroundQueueMode(null)}}/>}
 </main>;

 return <div className={`app-shell ${mode==="learning"?"app-shell--learning":""}`}>
  <header className="topbar">
   {mode==="learning"?<button className="how-to-button learning-header-guide" type="button" onClick={()=>setShowHowTo(true)}>How to play</button>:<div className="branding"><div className="eyebrow">MANOSABA SHOGI</div><h1>魔法少女ノ魔法将棋</h1></div>}
   {mode==="learning"&&<LearningChapterHeading level={learningLevel}/>}
   <div className="match-actions">{mode==="learning"?<><button className="resign-button" onClick={restartLearningSection}>再挑戦</button><button onClick={()=>setLearningChapterSelect(true)}>章選択</button></>:<><button className="resign-button" onClick={resign} disabled={gameOver}>投了</button></>}</div>
  </header>
  {mode==="online"&&<div className="online-bar" role="status">
   <div className="online-bar__opponent"><span>VS {online.match?.nicknames?.[opponentSide]||"相手"}</span>{online.match?.profiles?.[opponentSide]?.rank&&<span className="opponent-rank-badge" aria-label={`相手の段位 ${online.match.profiles[opponentSide].rank}`}><RankLabel rank={online.match.profiles[opponentSide].rank}/></span>}</div>
   <div className="online-bar__clock">{online.match?.result?"対局終了":online.match?.paused?"再接続待ち":online.now<online.match?.readyAt?"準備中…":state.turn===humanSide?`残り${online.remaining}秒`:"\u00a0"}</div>
   {online.error&&<span>{online.error}</span>}
  </div>}
  <main className="game-stage">
   <Hand className="hand--opponent" title="相手の持ち駒" pieces={visibleHand(opponentSide)} disabled activeType={null} onPick={()=>{}} perspective={humanSide} reverse onGuideStart={beginPieceGuide} onGuideEnd={endPieceGuide}/>
   <div className="board-stack"><div className="board-frame"><div className="board-container"><div className="board">{visualCells.map(({row:r,column:c})=>{const key=`${r},${c}`,piece=state.board[r][c],target=targets.get(key),guideTarget=guideTargets.get(key),pendingCaptured=motionFx?.isNanokaShot&&!motionFx.impactReached&&motionFx.captureAt?.[0]===r&&motionFx.captureAt?.[1]===c?{...motionFx.captured,side:motionFx.capturedOriginalSide}:null,shownPiece=piece??pendingCaptured,fxClass=pieceFxClass(shownPiece),moveClass=motionClass(shownPiece,r,c),checkClass=shownPiece?.type==="ema"&&shownPiece.side===checkedSide?" ema--in-check":"",tryWinner=Boolean(shownPiece?.type==="ema"&&result?.reason==="ema-safe-try"&&shownPiece.side===result.winner),moveStyle=motionStyle(r,c,moveClass),promotedOverride=tryWinner?finishFx?.promotionRevealed===true:moveClass&&motionFx?.action.promote?Boolean(motionFx.promotionRevealed):undefined;return <button key={key} onClick={()=>click(r,c)} onPointerDown={()=>beginPieceGuide(piece,r,c)} onPointerUp={endPieceGuide} onPointerCancel={endPieceGuide} onPointerLeave={endPieceGuide} onContextMenu={event=>event.preventDefault()} className={`square ${(r+c)%2?"square--alt":""} ${selected?.[0]===r&&selected?.[1]===c?"square--selected":""} ${target?(target.piece?.type==="sherry"&&target.magic==="サイドステップ"?"square--capture-target":(target.category==="magic"||target.longForward)?"square--magic-target":"square--move-target"):""} ${activeGuide?.row===r&&activeGuide?.col===c?"square--guide-source":""} ${guideTarget?`square--guide-${guideTarget}`:""} ${(fxClass||moveClass)?"square--finish-fx":""}`}>{shownPiece&&<div style={moveStyle} className={`finish-piece${fxClass}${moveClass}${checkClass}${moveClass&&motionFx?.action.promote?" motion-promote":""}`}><Piece piece={shownPiece} perspective={humanSide} promotedOverride={promotedOverride}/></div>}</button>})}</div>{motionFx?.captured&&captureVisual&&(!motionFx.isNanokaShot||motionFx.impactReached)&&<div className={`capture-fly capture-fly--${motionFx.mover}`} style={{left:`${captureVisual[1]*100/6}%`,top:`${captureVisual[0]*100/6}%`,...captureDestination,"--capture-delay":`${motionFx.impactDelay||0}ms`}}><Piece piece={{...motionFx.captured,side:motionFx.capturedOriginalSide,promoted:false}} perspective={humanSide}/></div>}{showNanokaShot&&<svg className="nanoka-shot" viewBox="0 0 600 600" aria-hidden="true"><defs><filter id="nanoka-shot-glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><line x1={(shotFrom[1]+.5)*100} y1={(shotFrom[0]+.5)*100} x2={(shotTo[1]+.5)*100} y2={(shotTo[0]+.5)*100} pathLength="1"/><circle cx={(shotTo[1]+.5)*100} cy={(shotTo[0]+.5)*100} r="15"/></svg>}{showTryArrow&&<svg className="try-arrow" viewBox="0 0 600 600" aria-hidden="true"><defs><filter id="arrow-glow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><line x1={(tryFrom[1]+.5)*100} y1={(tryFrom[0]+.5)*100} x2={(tryTo[1]+.5)*100} y2={(tryTo[0]+.5)*100} pathLength="1"/></svg>}{endMessage&&<div className={`result-overlay ${endMessage.startsWith("勝利")?"result-overlay--win":"result-overlay--lose"}`} role="status"><div className="result-overlay__panel"><div className="result-overlay__text">{endMessage}</div><div className="result-overlay__actions"><button className="result-overlay__again" onClick={()=>{if(mode==="online"){setStarted(false);setSelected(null);setHandType(null);online.queue();}else setDifficultyPrompt("rematch")}}>再対局</button><button className="result-overlay__friend" onClick={()=>{if(mode==="online"&&savedReturnMode){restorePreviousMode();return;}if(mode==="online")online.leaveMatch();else if(backgroundQueueMode)online.cancel();setBackgroundQueueMode(null);setSavedReturnMode(null);returnSnapshotRef.current=null;try{localStorage.removeItem(STORAGE_KEY)}catch{}setStarted(false)}}>戻る</button></div></div></div>}</div></div><p className="board-note">桜羽エマを取られたら負けです。桜羽エマが成ると特殊勝利できます。<br/>エマだけは敵陣最下段、他の駒は敵陣二段目に移動すると魔女化します。<br/>取った駒は打てますが、敵陣最下段には打てません。<br/>長押しで駒の能力を見れます。</p></div>
   <Hand className="hand--player" title="自分の持ち駒" pieces={visibleHand(humanSide)} disabled={onlineBlocked||state.turn!==humanSide||thinking||motionFx||gameOver||learningBoardLocked} activeType={handType} onPick={type=>{if(guideTriggered.current){guideTriggered.current=false;return}if(pieceGuide){setPieceGuide(null);return}setHandType(type);setSelected(null)}} perspective={humanSide} onGuideStart={beginPieceGuide} onGuideEnd={endPieceGuide}/>
   {mode!=="learning"&&<button className="how-to-button" type="button" onClick={()=>setShowHowTo(true)}>How to play</button>}
  </main>
  {backgroundQueueMode&&online.status==='naming'&&<OnlineLobby online={online}/>}
  {mode==="learning"&&<LearningDialogue lines={learningLines} page={learningDialogue} outcome={learningOutcome} onPrevious={previousLearningPage} onNext={advanceLearningDialogue} navigationLocked={learningAutoMoving} allowFinishAdvance={Boolean(learningOutcome?.kind==="afterMove"||(learningLevel.scenes&&!learningOutcome&&!learningLevel.scenes[sceneIndex]?.correct?.length&&(!learningLevel.scenes[sceneIndex]?.autoMove&&!learningLevel.scenes[sceneIndex]?.autoSequence||sceneAutoDone))||(learningLevel.steps&&!learningOutcome&&learningHistory.length===learningLevel.steps.length))} onRetry={retryLearningMove} onNextChapter={advanceLearningChapter}/>}
  {mode==="learning"&&learningChapterSelect&&<LearningChapterSelect levels={LEARNING_LEVELS} currentIndex={learningLevelIndex} onSelect={requestLearningLevel} onTitle={()=>setConfirmLearningBack(true)} onClose={()=>setLearningChapterSelect(false)}/>}
  {mode==="learning"&&confirmLearningBack&&<LearningBackConfirm onConfirm={leaveLearning} onCancel={()=>setConfirmLearningBack(false)}/>}
  {pieceGuide&&<PieceGuide piece={pieceGuide.piece} onClose={()=>setPieceGuide(null)}/>} 
  {showHowTo&&<HowToPlayDialog onClose={()=>setShowHowTo(false)}/>} 
  {difficultyPrompt&&<DifficultyDialog onChoose={chooseCpuDifficulty} onCancel={()=>{setDifficultyPrompt(null);if(!alreadyWaiting)setBackgroundQueueMode(null)}}/>}
  </div>;
}

function OnlineLobby({online,background=false,onCpu}){
 const [expanded,setExpanded]=useState(false);
 const [draft,setDraft]=useState("");
 const naming=online.status==="naming";
 const estimateText=online.waitEstimateSeconds===null?"確認中":`${online.waitEstimateSeconds}秒`;
 const waiting=online.status==="queued"||online.status==="connecting";
 useEffect(()=>{if(naming)setDraft(Array.from(online.nickname||"").slice(0,10).join(""))},[naming,online.nickname]);
 if(!naming&&!waiting&&(!online.error||online.status==="match"))return null;
 if(background&&!naming)return <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",fontSize:12}}>
  <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)} style={{padding:"4px 8px",fontSize:12,borderRadius:6}}>{online.status==="queued"?`待機（推定${estimateText}）`:online.status==="connecting"?"接続中":"通信エラー"}</button>
  {expanded&&<>
   {online.error&&<span role="status">{online.error}</span>}
   {online.status!=="connecting"&&<button type="button" onClick={online.cancel} style={{padding:"4px 8px",fontSize:12}}>{waiting?"待機をやめる":"閉じる"}</button>}
  </>}
 </div>;
 return <div className="online-lobby">
  <section className="online-lobby__panel" aria-label="対戦ロビー">
   <h2>対戦ロビー</h2>
   {naming?<form onSubmit={event=>{event.preventDefault();online.submitNickname(draft)}}>
    <label htmlFor="online-nickname">ニックネーム</label>
    <input id="online-nickname" value={draft} onChange={event=>setDraft(Array.from(event.target.value).slice(0,10).join(""))} autoFocus autoComplete="nickname" placeholder="10文字以内"/>
    <div className="online-lobby__count">{Array.from(draft).length}/10</div>
    {online.error&&<p role="alert">{online.error}</p>}
    <button type="submit" disabled={!draft.trim()}>対戦相手を探す</button>
    <button type="button" onClick={online.cancel}>戻る</button>
   </form>:<>
    <p role="status">{waiting?(online.status==="connecting"?"サーバーに接続しています…":`待機（推定${estimateText}）`):online.error}</p>
    {!waiting&&<button onClick={online.editNickname}>再試行</button>}
    {online.status==="queued"&&<>
     <button type="button" onClick={onCpu}>待ちながらCPUと対戦</button>
     <p>表示時間は目安です。相手が見つかるとCPU戦を終了し、オンライン戦に切り替わります。</p>
    </>}
    {waiting&&<button onClick={online.cancel} disabled={online.status==="connecting"}>キャンセル</button>}
   </>}
  </section>
 </div>;
}
