import {makeInitialState} from "../game/rules.js";
// 駒名の略号（棋譜用）。ルール側の名称とは独立しています。
const LEARNING_PIECE_CODES={ema:"E",nanoka:"N",hanna:"H",hiro:"I",sherry:"S",margo:"M"};
export function learningMoveRecord(action,before){
 const piece=action.category==="drop"?action.piece:before.board[action.from[0]][action.from[1]];
 const sq=([r,c])=>String.fromCharCode(97+c)+String(6-r);
 return {piece:piece?.type,side:before.turn,from:action.from?sq(action.from):null,to:sq(action.to),
  notation:action.category==="drop"?`${LEARNING_PIECE_CODES[piece?.type]||"?"}@${sq(action.to)}`:`${sq(action.from)}${sq(action.to)}`,
  fromRank:action.from?6-action.from[0]:null,toRank:6-action.to[0],
  forward:Boolean(action.from&&action.to[0]===action.from[0]+(before.turn==="sente"?-1:1)&&action.to[1]===action.from[1]),
  category:action.category,magic:action.magic||null};
}
export function learningStepMatches(expected,actual){
 if(typeof expected==="string")return expected===actual.notation;
 return Object.entries(expected).every(([key,value])=>actual[key]===value);
}
export function learningBranchMatches(branch,history){
 if(branch.moves)return branch.moves.length<=history.length&&branch.moves.every((move,i)=>learningStepMatches(move,history[i]));
 if(branch.when){const last=history[history.length-1];return Object.entries(branch.when).every(([key,value])=>key==="notPiece"?last.piece!==value:last[key]===value)}
 return false;
}
export function learningStartState(level){
 const base=makeInitialState();
 if(!level.setup)return base;
 // setup.board は6行×6列の配列。空マスは null。
 // 駒は {type:"nanoka",side:"sente",promoted:false,id:"..."} 形式。
 const setup=level.setup;
 if(setup.board&&(!Array.isArray(setup.board)||setup.board.length!==6||setup.board.some(row=>!Array.isArray(row)||row.length!==6)))throw new Error("学習盤面は6×6で指定してください");
 let board=setup.board?setup.board.map(row=>row.map(piece=>piece?{...piece}:null)):base.board.map(row=>row.map(piece=>piece?{...piece}:null));
 if(setup.placements){
  // 既存駒を動かすだけなので、未指定の駒と持ち駒は保持します。
  const moving=[];
  const square=notation=>{
   if(!/^[a-f][1-6]$/.test(notation))throw new Error(`不正な座標: ${notation}`);
   return [6-Number(notation[1]),notation.charCodeAt(0)-97];
  };
  for(const item of setup.placements){
   let found=null;
   for(let r=0;r<6;r++)for(let c=0;c<6;c++){
    if(board[r][c]?.type===item.type&&board[r][c]?.side===item.side){
     if(found)throw new Error(`同種の駒が複数あります: ${item.side}/${item.type}`);
     found=[r,c];
    }
   }
   if(!found)throw new Error(`初期盤面に駒がありません: ${item.side}/${item.type}`);
   moving.push({...item,piece:board[found[0]][found[1]]});
   board[found[0]][found[1]]=null;
  }
  for(const item of moving){
   const [r,c]=square(item.to);
   if(board[r][c])throw new Error(`移動先に別の駒があります: ${item.to}`);
   board[r][c]=item.piece;
  }
 }
 return {...base,
  board,
  ...(setup.hands?{hands:{sente:(setup.hands.sente||[]).map(p=>({...p})),gote:(setup.hands.gote||[]).map(p=>({...p}))}}:{}),
  ...(setup.turn?{turn:setup.turn}:{})};
}

// 判定処理は学習専用モジュールに集約。App.jsx は結果を画面に反映するだけ。
export function evaluateLearningHistory(level,history){
 const correct=level.correct||[];
 // 正解手順未設定の教材は練習用として1手だけ許可し、結果セリフへは移行しません。
 if(correct.length===0)return null;
 const prefix=history.every((move,i)=>i<correct.length&&learningStepMatches(correct[i],move));
 if(!prefix){
  const branch=level.branches?.find(item=>learningBranchMatches(item,history));
  return {kind:"failure",lines:branch?.lines||level.defaultFailureLines||["もう一度挑戦して。"]};
 }
 if(history.length===correct.length)return {kind:"success",lines:level.successLines||["よくできたわ。"]};
 return null;
}
