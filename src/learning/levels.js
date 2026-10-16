import {makeInitialState} from "../game/rules.js";

// 各レベルの開始局面。board は6×6、hands は両陣営の持ち駒です。
// setup を省略したレベルは通常の初期配置を使用します。
// ★ ナノカのセリフを編集する場所：各レベルの lines: [ ... ] を書き換えてください。
// ★ セリフ・正解棋譜・分岐はここで編集します。
// 棋譜表記: a1a2 (移動)、N@a2 (駒打ち)。a～f、1～6 は盤面の座標です。
// moves は複数手を並べられます。各分岐は先頭から一致した棋譜で判定します。
export const LEARNING_LEVELS = [
 {id:"nanoka-1", title:"ナノカの動かし方 基本", chapter:"第1章　1節", setup:null,
  lines:[
   "黒部ナノカよ。まずは、凄くて偉くて天才な私の動かし方を学ぶのよ。",
   "駒を長押しすると、移動範囲と魔法を確認できるわ。How to playボタンも確認しなさい。",
   "黄色が移動マス、赤色が魔法を使えるマスを示しているわ。",
   "移動か魔法で相手の駒を取ることもできるわよ。",
   "相手の駒を取ったら、盤面に打つこともできるわ。",
   "後の章で、実際にやってみましょうね。",
   "私は最強の駒だから、序盤から前に出すのがセオリーよ。",
   "実際に操作して理解しなさい。私を二段目（前）に出して。",
  ],

    // 第1章1節：3ページ目にナノカの利きを自動表示
  pageGuides: {
    2: {
      side: "sente",
      type: "nanoka",
      square: "a1",
    },

    3: {
      side: "sente",
      type: "nanoka",
      square: "a1",
    },
  },

  // 1手目はナノカを自陣1段目から前へ1マス。後で棋譜配列にも置換可能。
  correct:[{piece:"nanoka",fromRank:1,toRank:2,forward:true}],
  successLines:["正解よ。三段目まで出すと狙われやすくなるから、二段目に出したら横に動かして使うわ。", "これで基本の動きは覚えたわね。次の章へ進みなさい。"],
  // moves:["a1a2"] のように棋譜を指定すると特定手順だけに反応します。
  branches:[
   {id:"nanoka-side",when:{piece:"nanoka"},lines:["そっちじゃないわ。私は一段前に出してほしいのよ。"]},
   {id:"hanna-float",when:{piece:"ema"},lines:["バカ犬と私の区別もつかなくなったのかしら？"]},
   {id:"other-piece",when:{notPiece:"nanoka"},lines:["私を動かしなさいって言ったでしょう？　他の駒じゃないわ。"]},
  ],
  defaultFailureLines:["私の知らない手を指さないでちょうだい。"],
 },
 {
  id:"nanoka-2",
  title:"ナノカ 生け捕りの筋",
  chapter:"第1章　2節",
  // 初期配置から指定された5枚だけを移動。残りの駒・持ち駒は初期状態のまま。
  setup:{
   placements:[
    {side:"gote",type:"hanna",to:"e4"},
    {side:"gote",type:"margo",to:"a5"},
    {side:"gote",type:"hiro",to:"d5"},
    {side:"sente",type:"margo",to:"e2"},
    {side:"sente",type:"nanoka",to:"b2"},
   ],
   turn:"sente",
  },
  lines:[
   "私の魔法を使って、相手の遠野ハンナを一方的に取りましょう。",
   "相手の遠野ハンナの動きを黄色マスで示すわ。",
   "こちらの宝生マーゴの動きも示すわ。遠野ハンナが移動したら捕獲できるわね。",
   "ここで、私の魔法「遠方狙撃」を使うわよ。",
   "私の移動方向と魔法を使えるマスはこんな感じだから",
   "魔法で、相手の遠野ハンナを狙える位置に私を動かしてちょうだい。",
  ],
  // セリフページ(0始まり)ごとに自動で移動範囲を表示。通常の長押し表示とは独立。
  pageGuides:{
   1:{side:"gote",type:"hanna",square:"e4"},
   2:{side:"sente",type:"margo",square:"e2"},
   4:{side:"sente",type:"nanoka",square:"b2"},
   5:{side:"sente",type:"nanoka",square:"b2"},
  },
  // 1手目ナノカ b2→c2、2手目は後手ヒロ d5→d4（自動）、3手目ナノカ c2→e4で銃撃。
  correct:["b2c2", {piece:"hiro",side:"gote",from:"d5",to:"d4"}, {piece:"nanoka",side:"sente",from:"c2",to:"e4",magic:"銃撃"}],
  interludeLines:[
   "正解よ。これで相手の遠野ハンナを狙える位置に来たわね。",
   "相手が二階堂ヒロで援軍を足してきたわ。",
   "でも私には関係ないわよ。遠方狙撃で遠野ハンナを取ってしまいなさい。",
  ],
  successLines:[
   "正解よ。遠方狙撃で遠野ハンナを一方的に取れたわね。",
   "相手の援軍がいても、射線が通っていればタダで取れるのが私の強みよ。",
  ],
  branches:[
   {id:"nanoka-other",when:{piece:"nanoka"},lines:["私を動かすのは正しいけど、そこじゃないわ。相手の遠野ハンナを狙いなさい。"]},
   {id:"wrong-piece",when:{notPiece:"nanoka"},lines:["私以外を動かしたら、私の魔法が使えるのかしら？"]},
  ],
  // 中継後、ナノカの遠方狙撃を間違えたときのセリフ（App.jsxに直書きしない）
  finalMoveFailureLines:["取れる駒を取らないなんて…。頭が悪いわ、まるで桜羽エマね。"],
  defaultFailureLines:["その手では生け捕りできないわ。最初からやり直しなさい。"],
 }

];
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
