// 第3章3節：ハンナ端棒銀の受け方
import {makeInitialState} from '../../../game/rules.js';
const sq=s=>[6-Number(s[1]),s.charCodeAt(0)-97];
const guide=(type,square,side='sente')=>[{type,square,side}];
function startingPosition(){
 const base=makeInitialState(),board=base.board.map(row=>row.map(p=>p?{...p}:null));
 const move=(from,to,type,side)=>{
  const [r,c]=sq(from),[rr,cc]=sq(to),piece=board[r][c];
  if(!piece||piece.type!==type||piece.side!==side||board[rr][cc])throw Error(`第3章3節の初期配置が不正: ${from}→${to}`);
  board[rr][cc]=piece;board[r][c]=null;
 };
 move('a1','a2','nanoka','sente');
 move('f6','f5','nanoka','gote');
 move('a2','b2','nanoka','sente');
 return {...base,board,turn:'gote'};
}
export default {
 id:'margo-3',chapter:'第3章　3節',title:'ハンナ端棒銀の受け方',
 setup:startingPosition(),ignoreTerminal:true,
 scenes:[
  {
   lines:['今回は、遠野ハンナを端から進める攻めへの受け方を教えるわ。','相手の遠野ハンナが、空中浮遊で一気に前進してきたわ。','まずは宝生マーゴを前に出してちょうだい。'],
   autoMove:{piece:'hanna',from:'e6',to:'e4',magic:'浮遊'},autoMoveAt:1,autoDelayMs:1000,
   pageGuides:[[],guide('hanna','e4','gote'),guide('margo','f1')],playerMoveAt:2,
   correct:[{piece:'margo',from:'f1',to:'e2'}],failureLines:['宝生マーゴを左斜め前に進めてちょうだい。']
  },
  {
   lines:['遠野ハンナが、こちらの宝生マーゴに迫ってきたわ。','ここは遠野ハンナを宝生マーゴで取るのよ。'],
   autoMove:{piece:'hanna',from:'e4',to:'f3'},autoMoveAt:0,autoDelayMs:1000,
   pageGuides:[guide('hanna','f3','gote'),guide('margo','e2')],playerMoveAt:1,
   correct:[{piece:'margo',from:'e2',to:'f3'}],
   branches:[
    {when:{piece:'margo',from:'e2',to:'d3'},response:{piece:'nanoka',from:'f5',to:'d3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['そこでは、黒部ナノカの銃撃で宝生マーゴを取られてしまうわ。']},
    {when:{piece:'margo',from:'e2',to:'e3'},response:{piece:'hanna',from:'f3',to:'f1'},delayMs:1000,finishDelayMs:900,lines:['遠野ハンナに最下段へ進まれてしまうわ。端の突破を許しては駄目よ。']},
   ],failureLines:['ここは宝生マーゴで遠野ハンナを取ってちょうだい。']
  },
  {
   lines:['遠野ハンナを取ったけれど、相手の黒部ナノカに取り返されるわ。','黒部ナノカの銃撃を確認してちょうだい。','遠野ハンナを取ったら、次は黒部ナノカを狙うのが手筋よ。','取った遠野ハンナを、相手の黒部ナノカを追い詰める位置に打ってちょうだい。'],
   autoMove:{piece:'nanoka',from:'f5',to:'f3',magic:'銃撃'},autoMoveAt:1,autoDelayMs:1000,
   pageGuides:[[],guide('nanoka','f5','gote'),guide('nanoka','f5','gote'),guide('hanna','e4')],playerMoveAt:3,
   correct:[{piece:'hanna',category:'drop',to:'e4'}],
   branches:[{when:{piece:'hanna',category:'drop',to:'f4'},response:{piece:'nanoka',from:'f5',to:'f4'},delayMs:1000,finishDelayMs:850,lines:['そこでは黒部ナノカに遠野ハンナを取られてしまうわ。もう少し中央寄りに打つのよ。']}],
   failureLines:['遠野ハンナは、相手の黒部ナノカを追い詰める位置に打ってちょうだい。']
  },
  {
   lines:['相手の黒部ナノカが一歩前に出てきたわ。','遠野ハンナを一歩前に進めて、魔女化させましょう。'],
   autoMove:{piece:'nanoka',from:'f5',to:'f4'},autoMoveAt:0,autoDelayMs:1000,
   pageGuides:[guide('nanoka','f4','gote'),guide('hanna','e4')],playerMoveAt:1,
   correct:[{piece:'hanna',from:'e4',to:'e5'}],
   branches:[
    {when:{piece:'hanna',from:'e4',to:'e6',magic:'浮遊'},response:{piece:'hiro',from:'d6',to:'e6'},delayMs:1000,finishDelayMs:850,lines:['そこでは相手の二階堂ヒロに遠野ハンナを取られてしまうわ。']},
    {when:{piece:'hanna',from:'e4',to:'f5'},lines:['その位置では狙いが続かないわ。遠野ハンナをまっすぐ一歩前に進めてちょうだい。']},
   ],failureLines:['遠野ハンナをまっすぐ一歩前に進めてちょうだい。']
  },
  {
   lines:['相手の黒部ナノカが前進して、桜羽エマに王手をかけてきたわ。','桜羽エマを右斜め前に逃がしましょう。'],
   autoMove:{piece:'nanoka',from:'f4',to:'f3'},autoMoveAt:0,autoDelayMs:1000,
   pageGuides:[guide('nanoka','f3','gote'),guide('ema','d1')],playerMoveAt:1,
   correct:[{piece:'ema',from:'d1',to:'e2'}],
   branches:[
    {when:{piece:'ema',from:'d1',to:'c2'},response:{piece:'margo',category:'drop',to:'e2'},delayMs:1000,finishDelayMs:800,lines:['そこでは相手の宝生マーゴを、桜羽エマの近くに打たれてしまうわ。']},
    {when:{piece:'ema',from:'d1',to:'d2'},response:{piece:'margo',category:'drop',to:'e3'},delayMs:1000,finishDelayMs:800,lines:['そこでは相手の宝生マーゴに、逃げ道を狙われてしまうわ。']},
   ],failureLines:['桜羽エマを右斜め前に逃がすのが正解よ。']
  },
  {
   lines:['相手が宝生マーゴを打って、こちらに迫ってきたわ。','でも、黒部ナノカを取れる位置に桜羽エマがいるわね。','桜羽エマで、隣にいる黒部ナノカを取ってちょうだい。'],
   autoMove:{piece:'margo',category:'drop',to:'e3'},autoMoveAt:0,autoDelayMs:1000,
   pageGuides:[guide('margo','e3','gote'),guide('nanoka','f3','gote'),guide('ema','e2')],playerMoveAt:2,
   correct:[{piece:'ema',from:'e2',to:'f3'}],failureLines:['桜羽エマで、隣にいる黒部ナノカを取ってちょうだい。']
  }
 ],
 successLines:['正解よ。遠野ハンナで受けを作り、最後は桜羽エマで黒部ナノカを取れたわね。','遠野ハンナを取ったあと、黒部ナノカを狙う手筋を覚えておきなさい。'],
 successPageGuides:[[],[]],defaultFailureLines:['指定された手を指してちょうだい。']
};
