// 第2章4節：ナノカのこびんにハンナを打つ手筋。
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

export default {
 id:'hanna-4',chapter:'第2章　4節',title:'ナノカの急所を攻める',
 setup:flippedLastPosition(),
 scenes:[
  {
   lines:[
    '遠野ハンナを持ち駒にしたら、私（可愛いナノちゃん）を狙うのが手筋よ。',
    'どこに遠野ハンナを打つのが良いか、考えてみなさい。',
   ],
   pageGuides:[[],[guide('nanoka','e5','gote')]],playerMoveAt:1,
   correct:[{piece:'hanna',side:'sente',category:'drop',to:'f4'}],
   branches:[
    {when:{piece:'hanna',category:'drop',to:'d4'},response:{piece:'nanoka',from:'e5',to:'f5'},delayMs:1000,finishDelayMs:800,lines:['惜しいけど、そこに打つと私に逃げられるわ。']},
    {when:{piece:'hanna',category:'drop',to:'e4'},response:{piece:'nanoka',from:'e5',to:'e4'},delayMs:1000,finishDelayMs:800,lines:['そこに打ったら、タダで取られるわよ。']},
    {when:{piece:'hanna',category:'drop'},lines:['そこに打っても、何も起こらないわよ。']},
   ],
   failureLines:['遠野ハンナを打ちなさいと言ってるのよ。理解力が桜羽エマ並みね。'],
  },
  {
   lines:[
    '正解よ。これで相手のナノちゃん（私）に圧をかけられるわ。',
    '私は最強の駒だから、遠野ハンナなんかと交換になったら損よ。',
    'だから、横に逃げるとするわ。',
    '駒は取れないけど、遠野ハンナをさらに進めましょう。',
   ],
   autoMove:{piece:'nanoka',from:'e5',to:'d5'},autoMoveAt:2,autoDelayMs:800,
   pageGuides:[[],[],[],[guide('hanna','f4')]],playerMoveAt:3,
   correct:[{piece:'hanna',from:'f4',to:'f5',category:'move'}],
   branches:[
    {when:{piece:'hanna',from:'f4',to:'f6',magic:'浮遊'},lines:['そこに移動するのも悪くないけど、遠野ハンナが盤面隅で使いづらいわ。']},
    {when:{piece:'hanna',from:'f4',to:'e5'},response:{piece:'nanoka',from:'d5',to:'e5'},delayMs:1000,finishDelayMs:800,lines:['そこに移動したら、私に取られてしまうわね。']},
    {when:{piece:'hanna',from:'f4'},lines:['ハンナを動かすのは合っているけど、進むマスが違うわ。']},
   ],
   failureLines:['何をしているのかしら。'],
  },
 ],
 successLines:[
  '流石ね、正解よ。これで、遠野ハンナを魔女化させられたわね。',
  '敵陣二段目に移動すると魔女化して、能力が大幅アップするわ。',
  '遠野ハンナは、私（ナノカ）の死角である斜めを狙えるから',
  '持ち駒にしたら、相手のナノちゃんを狙うのが鉄板よ。',
 ],
 defaultFailureLines:['指定された手を指してちょうだい。'],
};
