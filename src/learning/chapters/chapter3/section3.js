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
   lines:['今回は、ハンナ端棒銀の受け方を解説するわ。','相手の遠野ハンナが、また空中浮遊で一気に前進してきたわね。','ここは宝生マーゴで守るのが定石よ。'],
   autoMove:{piece:'hanna',from:'e6',to:'e4',magic:'浮遊'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[[],guide('hanna','e4','gote'),guide('margo','f1')],playerMoveAt:2,
   correct:[{piece:'margo',from:'f1',to:'e2'}],failureLines:['普遍的に言えることだけど、駒を端に動かすと使いづらいわよ。']
  },
  {
   lines:['相手の遠野ハンナが端にすり込んできたわ。','どう対処するのが正しいか、考えてちょうだい。'],
   autoMove:{piece:'hanna',from:'e4',to:'f3'},autoMoveAt:0,autoDelayMs:1000,
   pageGuides:[guide('hanna','f3','gote'),guide('margo','e2')],playerMoveAt:1,
   correct:[{piece:'margo',from:'e2',to:'f3'}],
   branches:[
    {when:{piece:'margo',from:'e2',to:'d3'},response:{piece:'nanoka',from:'f5',to:'d3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['その位置は、私の銃撃圏内ね。']},
    {when:{piece:'margo',from:'e2',to:'e3'},response:{piece:'hanna',from:'f3',to:'f1'},delayMs:1000,finishDelayMs:900,lines:['相手の遠野ハンナに魔女化を許してしまったわ。今回は悪手よ。']},
   ],failureLines:['宝生マーゴを動かさないと、相手から取られて損するわよ。']
  },
  {
   lines:['端から突っ込んでくるハンナ棒銀の場合は、素直に取るのが正解よ。','私に取られて駒損してしまうけど…','ここから相手のナノちゃん（私）を生け捕りにしましょう。','取った遠野ハンナを打って、相手のナノちゃん（私）を狙いましょう。'],
   autoMove:{piece:'nanoka',from:'f5',to:'f3',magic:'銃撃'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[[],guide('nanoka','f5','gote'),guide('nanoka','f5','gote'),guide('nanoka','f5','gote')],playerMoveAt:3,
   correct:[{piece:'hanna',category:'drop',to:'e4'}],
   branches:[{when:{piece:'hanna',category:'drop',to:'f4'},response:{piece:'nanoka',from:'f5',to:'f4'},delayMs:1000,finishDelayMs:850,lines:['そこは私の利きがあるわよ。']}],
   failureLines:['遠野ハンナを打ちなさいと言ってるのに…。まるで桜羽エマね。']
  },
  {
   lines:['正解よ。私の弱点は斜め前だから、遠野ハンナで積極的に狙うと良いわ。','相手がナノちゃん（私）を躱してきたわね。','フリーになった地点に進めて、遠野ハンナを魔女化させましょう。'],
   autoMove:{piece:'nanoka',from:'f5',to:'f4'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[guide('nanoka','f5','gote'),[],guide('hanna','e4')],playerMoveAt:2,
   correct:[{piece:'hanna',from:'e4',to:'e5'}],
   branches:[
    {when:{piece:'hanna',from:'e4',to:'d5'},response:{piece:'hiro',from:'d6',to:'d5'},delayMs:1000,finishDelayMs:850,lines:['その位置だと、二階堂ヒロに取られてしまうわよ。']},
    {when:{piece:'hanna',from:'e4',to:'e6',magic:'浮遊'},response:{piece:'hiro',from:'d6',to:'e6'},delayMs:1000,finishDelayMs:850,lines:['その位置だと、二階堂ヒロに取られてしまうわよ。']},
    {when:{piece:'hanna',from:'e4',to:'f5'},lines:['そこでも悪くないけど、駒はなるべく中央に動かした方が良いわよ。']},
   ],failureLines:['遠野ハンナを動かしなさいと言ってるでしょう。']
  },
  {
   lines:['これで、次に相手のナノちゃん（私）を取れるわ。','相手は躱しつつ、逆に王手をかけてきたわね。','上手い切り返しがあるわよ。考えてみなさい。'],
   autoMove:{piece:'nanoka',from:'f4',to:'f3'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[guide('hanna','e2'),guide('nanoka','f3','gote'),guide('ema','d1')],playerMoveAt:2,
   correct:[{piece:'ema',from:'d1',to:'e2'}],
   branches:[
    {when:{piece:'sherry',from:'e1',to:'e2'},response:{piece:'nanoka',from:'f3',to:'f2',promote:true},delayMs:1000,finishDelayMs:850,lines:['橘シェリーで防ぐと、前に隙が生まれてしまうわ。']},
    {when:{piece:'ema',from:'d1',to:'c2'},response:{piece:'margo',category:'drop',to:'e2'},delayMs:1000,finishDelayMs:800,lines:['そこに逃げると、橘シェリーが危なくなるわね。']},
    {when:{piece:'ema',from:'d1',to:'d2'},response:{piece:'margo',category:'drop',to:'e3'},delayMs:1000,finishDelayMs:800,lines:['宝生マーゴで王手を続けられると、一気に負けになるわ。']},
   ],failureLines:['王手を防ぎなさい。逆に、どうやって指したのかしら？']
  },
  {
   lines:['相手が宝生マーゴを打って、王手を継続してきたわ。','でも、この手には隙があるわよ。','相手の隙を突いて、駒得してちょうだい。'],
   autoMove:{piece:'margo',category:'drop',to:'e3'},autoMoveAt:0,autoDelayMs:1000,
   pageGuides:[guide('margo','e3','gote'),guide('margo','e3','gote'),guide('ema','e2')],playerMoveAt:2,
   correct:[{piece:'ema',from:'e2',to:'f3'}],failureLines:['桜羽エマで、隣にいる黒部ナノカを取ってちょうだい。']
  }
 ],
 successLines:['正解よ。宝生マーゴの跳躍暗殺は、飛びながら駒を取るから','飛び先に空きがないと、取ることができないわ。','これがハンナ端棒銀への対策よ。覚えておきなさい。'],
 successPageGuides:[guide('margo','e3','gote'),guide('margo','e3','gote')],defaultFailureLines:['指定された手を指してちょうだい。']
};
