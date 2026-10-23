// 第3章2節：ハンナ棒銀への対策。先手視点で座標を統一。
import {makeInitialState} from '../../../game/rules.js';
const guide=(type,square,side='sente')=>[{type,square,side}];
const sq=s=>[6-Number(s[1]),s.charCodeAt(0)-97];
function startingPosition(){
 const base=makeInitialState(),board=base.board.map(row=>row.map(p=>p?{...p}:null));
 const move=(side,type,to)=>{
  let pos=null;
  for(let r=0;r<6;r++)for(let c=0;c<6;c++)if(board[r][c]?.side===side&&board[r][c]?.type===type){if(pos)throw Error('同種の駒が複数');pos=[r,c]}
  if(!pos)throw Error(`${side}/${type} がない`);
  const [r,c]=sq(to);if(board[r][c])throw Error(`${to} が埋まっている`);
  board[r][c]=board[pos[0]][pos[1]];board[pos[0]][pos[1]]=null;
 };
 // 第3章1節終了後のマーゴe2と、双方のナノカb2・e5。
 move('sente','nanoka','b2');move('gote','nanoka','e5');
 move('sente','margo','e2');move('gote','hanna','e4');
 return {...base,board,turn:'sente'};
}
// 分岐の比較に使う、初期配置の△ハンナe4、▲ナノカc2 ▲マーゴd3後の局面。
function forkPosition(){
 const setup=startingPosition(),board=setup.board.map(row=>row.map(p=>p?{...p}:null));
 const move=(from,to)=>{const [r,c]=sq(from),[rr,cc]=sq(to);if(!board[r][c]||board[rr][cc])throw Error(`移動不可 ${from}-${to}`);board[rr][cc]=board[r][c];board[r][c]=null};
 move('b2','c2');move('e4','e3');move('e2','d3');
 return {...setup,board,turn:'gote'};
}
const margo=square=>guide('margo',square);
// 誤った移動先でも、その場所にいる駒の利きを表示する。
const allSquares=Array.from({length:36},(_,i)=>'abcdef'[i%6]+(Math.floor(i/6)+1));
const misplaced=(piece,from,exclude,lines)=>allSquares.filter(to=>!exclude.includes(to)).map(to=>({when:{piece,from,to},lines,pageGuides:[guide(piece,to)]}));
export default {
 id:'margo-2',chapter:'第3章　2節',title:'ハンナ棒銀への対策',
 setup:startingPosition(),ignoreTerminal:true,
 scenes:[
  {
   lines:['今回は、相手のハンナ棒銀への対策を教えるわ。','まずは私を使って、相手の遠野ハンナを狙いましょう。'],
   pageGuides:[[],guide('nanoka','b2')],playerMoveAt:1,
   correct:[{piece:'nanoka',from:'b2',to:'c2',side:'sente'}],
   branches:[...misplaced('nanoka','b2',['c2'],['それだと、相手の遠野ハンナを狙えないわ。'])],
   failureLines:['指示を…守りなさいよ…。'],
  },
  {
   lines:['これで、相手の遠野ハンナを狙える位置に進められたわ。','相手が遠野ハンナをぶつけてきたわね。','これを取ってしまうと、相手のハンナ棒銀が成功してしまうわ。','上手い受けを考えてちょうだい。'],
   autoMove:{piece:'hanna',from:'e4',to:'e3'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[guide('nanoka','c2'),[],margo('e2'),margo('e2')],playerMoveAt:3,
   correct:[{piece:'margo',from:'e2',to:'d3'}],
   branches:[
    {when:{piece:'margo',from:'e2',to:'e3'},response:{piece:'nanoka',from:'e5',to:'e3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['これだと、相手に宝生マーゴを渡して駒損よ。']},
    {when:{piece:'margo',from:'e2',to:'f3'},pageGuides:[margo('f3')],lines:['それでも良いけど、せっかくだから駒を中央に使いたいわ。']},
    ...misplaced('margo','e2',['d3','e3','f3'],['惜しいわね、でもそれだと上手く行かないわ。']),
   ],failureLines:['それだと、宝生マーゴを取られて上手く行かないわ。'],
  },
  {
   lines:['素晴らしいわ。相手の遠野ハンナを躱すのが良い手よ。','相手は宝生マーゴを中央に展開してきたわ。','ここで、跳躍暗殺の魔法が役立つわ。','宝生マーゴで、遠野ハンナを取ってちょうだい。'],
   autoMove:{piece:'margo',from:'a6',to:'b5'},autoMoveAt:1,autoDelayMs:650,
   pageGuides:[margo('d3'),margo('d3'),margo('d3'),margo('d3')],playerMoveAt:3,
   correct:[{piece:'margo',from:'d3',to:'f3',magic:'跳躍暗殺'}],
   afterMoveLines:['正解よ。相手のナノちゃん（私）の利きを躱して取れたわね。','次は相手が駒取りを受けてきた場合を見てみましょう。'],
   afterMovePageGuides:[guide('nanoka','e5','gote'),guide('nanoka','e5','gote')],
   failureLines:['ここでは、遠野ハンナを取るのが狙いよ。'],
  },
  {
   resetOnEnter:'setup',setup:forkPosition(),
   lines:['相手が可愛いナノちゃん（私）を動かして、受けてきたわ。','同時に、こちらの宝生マーゴも狙われてるわね。','また上手い切り返しがあるわよ。考えてみなさい。'],
   autoMove:{piece:'nanoka',from:'e5',to:'d5'},autoMoveAt:0,autoDelayMs:650,
   pageGuides:[[],guide('nanoka','d5','gote'),margo('d3')],playerMoveAt:2,
   correct:[{piece:'margo',from:'d3',to:'e4'}],
   branches:[
    {when:{piece:'margo',from:'d3',to:'f3',magic:'跳躍暗殺'},response:{piece:'nanoka',from:'d5',to:'f3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['ここで遠野ハンナを取ると、私の銃撃で宝生マーゴを取り返されてしまうわ。']},
    {when:{piece:'margo',from:'d3',to:'c4'},pageGuides:[margo('c4')],lines:['もっと良い手があるわよ。']},
    {when:{piece:'margo',from:'d3',to:'e3'},response:{piece:'nanoka',from:'d5',to:'e3',magic:'銃撃'},delayMs:1000,finishDelayMs:1100,lines:['すぐに遠野ハンナを取ると、私の銃撃で取り返されてしまうわ。']},
    ...misplaced('margo','d3',['e4','e3','f3','c4'],['そこに動かすと、私にタダで取られるわよ。']),
   ],failureLines:['それだと、宝生マーゴを取られて上手く行かないわね。'],
  },
  {
   lines:['流石ね。相手の死角を突いた受け方よ。','相手はやることがないから、宝生マーゴを動かしてきたわね。','あとは、言わずとも分かるわね。'],
   autoMove:{piece:'margo',from:'a6',to:'b5'},autoMoveAt:1,autoDelayMs:650,
   pageGuides:[margo('e4'),margo('e4'),margo('e4')],playerMoveAt:2,
   correct:[{piece:'margo',from:'e4',to:'e2',magic:'跳躍暗殺'}],
   branches:[
    {when:{piece:'margo',from:'e4',to:'d5'},response:{piece:'hiro',to:'d5'},delayMs:1000,finishDelayMs:800,lines:['可愛いナノちゃん（私）を取っても、取り返されてしまうわよ。']},
    {when:{piece:'margo',from:'e4',to:'f5'},pageGuides:[margo('f5')],lines:['魔女化させるよりも、得する手があるわよ。']},
   ],
   failureLines:['真面目にやる気があるのかしら…'],
  },
 ],
 successLines:['正解よ。これで、相手の遠野ハンナを生け捕りにできたわね。','単純なハンナ棒銀は成立しないのよ。覚えておきなさい。'],
 successPageGuides:[[],[]],
 defaultFailureLines:['指定された手を指してちょうだい。'],
};
