// 第2章5節：エマの頭を縛る手筋。
// 第2章3節の最終局面を180度回転し、先後を入れ替えて開始する。
import {makeInitialState} from '../../../game/rules.js';

const sq=s=>[6-Number(s[1]),s.charCodeAt(0)-97];
const guide=(type,square,side='sente')=>[{side,type,square}];
function flippedLastPosition(){
 const initial=makeInitialState();
 const board=initial.board.map(row=>row.map(p=>p?{...p}:null));
 const take=s=>{const [r,c]=sq(s);const p=board[r][c];if(!p)throw Error('第2章4節: 駒がありません '+s);board[r][c]=null;return p};
 const put=(s,p)=>{const [r,c]=sq(s);if(board[r][c])throw Error('第2章4節: 配置先が埋まっています '+s);board[r][c]=p};
 // 3節開始局面: 先手ナノカb2、後手ナノカe5（各1枚）。
 for(const [side,to] of [['sente','b2'],['gote','e5']]){
  let found=null;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(board[r][c]?.side===side&&board[r][c]?.type==='nanoka')found=[r,c];
  if(!found)throw Error('第2章4節: ナノカが見つかりません');
  const p=board[found[0]][found[1]];board[found[0]][found[1]]=null;put(to,p);
 }
 // 3節: ▲ハンナb1-b3-b4 △マーゴa6-b5xb4 ▲ナノカb2xb4（銃撃）。
 // 最終盤面ではハンナ・マーゴは盤上になく、それぞれ相手の持ち駒。
 const hanna=take('b1'),margo=take('a6');
 const flipSide=side=>side==='sente'?'gote':'sente';
 const flipped=Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>{
  const p=board[5-r][5-c];return p?{...p,side:flipSide(p.side)}:null;
 }));
 // 反転後: 先手にハンナ1枚、後手にマーゴ1枚。
 return {board:flipped,hands:{sente:[{...hanna,side:'sente',promoted:false}],gote:[{...margo,side:'gote',promoted:false}]},turn:'sente'};
}

function headBlockPosition(){
 const setup=flippedLastPosition();
 const board=setup.board.map(row=>row.map(p=>p?{...p}:null));
 const move=(side,type,to)=>{
  let found=null;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++){
   if(board[r][c]?.side===side&&board[r][c]?.type===type){
    if(found)throw Error(`第2章5節: ${side}/${type} が複数あります`);
    found=[r,c];
   }
  }
  if(!found)throw Error(`第2章5節: ${side}/${type} が見つかりません`);
  const [r,c]=sq(to);
  if(board[r][c]&&!(r===found[0]&&c===found[1]))throw Error(`第2章5節: ${to} が埋まっています`);
  const piece=board[found[0]][found[1]];board[found[0]][found[1]]=null;board[r][c]=piece;
 };
 // 第4節の開始局面から指定の6手を反映し、後手ナノカe5・先手ナノカa2へ配置。
 // 1 ▲ハンナb3  2 △ナノカf5  3 ▲ヒロc2
 // 4 △エマd5    5 ▲シェリーe2 6 △ナノカf4
 // 教材開始時に後手ナノカf4→e5、先手ナノカ→a2へ変更。
 // この教材は盤上のハンナと、後で打つ持ち駒のハンナを両方使う。
 // 第4節の反転局面ではハンナは持ち駒なので、盤上用を別IDで配置する。
 const [hr,hc]=sq('b3');
 if(board[hr][hc])throw Error('第2章5節: b3 が埋まっています');
 const heldHanna=setup.hands.sente.find(p=>p.type==='hanna');
 if(!heldHanna)throw Error('第2章5節: 持ち駒のハンナがありません');
 board[hr][hc]={...heldHanna,id:'learning-hanna5-board-hanna',side:'sente',promoted:false};
 // b1に残った余分な先手ハンナだけ除去する。
 const [br,bc]=sq('b1');
 if(board[br][bc]?.side==='sente'&&board[br][bc]?.type==='hanna')board[br][bc]=null;
 move('gote','nanoka','f5');
 move('sente','hiro','c2');
 move('gote','ema','d5');
 move('sente','sherry','e2');
 move('gote','nanoka','f4');
 move('gote','nanoka','e5');
 move('sente','nanoka','a2');
 return {...setup,board,turn:'sente'};
}

const hannaGuide=square=>[{side:'sente',type:'hanna',square}];
const emaGuide=square=>[{side:'gote',type:'ema',square}];

export default {
 id:'hanna-5',chapter:'第2章　5節',title:'エマの進路を塞ぐ',
 setup:headBlockPosition(),
 // 実演は通常の合法手生成を使う。最初の応手のみ1秒、以降0.7秒。
 // side/from/to を明示し、別の駒を誤って動かさない。
 actionMode:'pseudo',ignoreTerminal:true,
 scenes:[
  {
   lines:[
    '遠野ハンナを持ち駒にしても、迂闊にエマに王手をかけるのは良くないわ。',
    '早速、その見本を見てみましょう。',
    '盤面の遠野ハンナを動かして、エマに王手をかけなさい。',
   ],
   pageGuides:[[],[],hannaGuide('b3')],playerMoveAt:2,
   correct:[{piece:'hanna',side:'sente',from:'b3',to:'c4',category:'move'}],
   branches:[
    {when:{piece:'hanna',category:'drop',to:'c4'},lines:['持ち駒を使わずに、盤面の駒を活かすのよ。']},
    {when:{piece:'hanna',category:'move'},lines:['それだと、桜羽エマに王手がかからないわ。']},
    {when:{piece:'hanna',from:'b3'},lines:['それだと、桜羽エマに王手がかからないわ。']},
   ],
   failureLines:['あなたは、指示すら聞けないバカ犬なのかしら？'],
  },
  {
   lines:[
    'ここからは自動で進むわ。王手で追いかけ続けた結果を見なさい。',
    '相手の桜羽エマが最下段まで来てしまったわね。',
    '桜羽エマが魔女化して、こちらの強制敗北になったわ。',
    '迂闊に王手をかけると、却って捕まらなくなるのよ。',
   ],
   pageGuides:[[],[],[]],
   autoSequence:[
    {side:'gote',piece:'ema',from:'d5',to:'e4'},
    {side:'sente',piece:'hanna',category:'drop',to:'d3'},
    {side:'gote',piece:'ema',from:'e4',to:'e3'},
    {side:'sente',piece:'ema',to:'e1'},
    {side:'gote',piece:'margo',category:'drop',to:'f2'},
    {side:'sente',piece:'ema',from:'e1',to:'d1'},
    {side:'gote',piece:'margo',from:'f2',to:'d2'},
    {side:'sente',piece:'hiro',to:'d2'},
    {side:'gote',piece:'ema',from:'e3',to:'f2'},
    {side:'sente',piece:'margo',category:'drop',to:'e1'},
    {side:'gote',piece:'ema',from:'f2',to:'f1'},
   ],
   firstDelayMs:1000,intervalMs:700,
   // 最後のトライ演出が終わるまで次のシーンに進ませない。
  },
  {
   resetOnEnter:'setup',setup:headBlockPosition(),
   lines:[
    '局面を戻したわ。今度は桜羽エマに王手をかけず、逃げ道を塞ぐのよ。',
    '遠野ハンナをどこに打てば、エマの前進を抑えられるかしら？',
   ],
   pageGuides:[[],[emaGuide('d5')]],playerMoveAt:1,
   correct:[{piece:'hanna',side:'sente',category:'drop',to:'d3'}],
   branches:[
    {when:{piece:'hanna',category:'drop',to:'f3'},pageGuides:[hannaGuide('f3')],lines:['惜しいけど、それだと桜羽エマの逃げ道を十分に塞げないわ。']},
    {when:{piece:'hanna',category:'drop',to:'c3'},response:{piece:'nanoka',from:'e5',to:'c3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['そのマスには、相手のナノちゃん（私）が効いてるわね。']},
    {when:{piece:'hanna',category:'drop',to:'e3'},response:{piece:'nanoka',from:'e5',to:'e3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['そのマスには、相手のナノちゃん（私）が効いてるわね。']},
    {when:{piece:'hanna',category:'drop'},lines:['それだと、桜羽エマの逃げ道を塞げないわね。']},
   ],
   failureLines:['今は持ち駒のハンナを打つ問題よ。関係ない駒を動かさないでちょうだい。'],
  },
 ],
 successLines:[
  '正解よ。桜羽エマの目の前に遠野ハンナを打てば、桜羽エマの逃げ道を先回りして塞げるわ。',
  'これはよく出てくる手筋だから、覚えておきなさい。',
 ],
 successPageGuides:[hannaGuide('d3'),hannaGuide('d3'),hannaGuide('d3')],
 defaultFailureLines:['指定された手を指してちょうだい。'],
};
