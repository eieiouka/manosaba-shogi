// 第3章1節：宝生マーゴの基本。説明上の座標は先手視点。
// プレイヤーは先手。▲ナノカa1→a2後、△ハンナe6→e4を自動再生。
const guide=(type,square,side)=>[{type,square,side}];
export default {
 id:'margo-1',chapter:'第3章　1節',title:'宝生マーゴの動かし方',
 setup:{placements:[{side:'sente',type:'nanoka',to:'a2'}],turn:'gote'},humanSide:'sente',
 scenes:[
  {
   lines:[
    'この章では、宝生マーゴの使い方を教えるわよ。',
    '相手が遠野ハンナを繰り出してきたわ。',
    'いきなり、こちらの陣地に圧をかけてきたわね。',
    'ここで、覚えておいてほしい手があるわ。',
    '相手の遠野ハンナが進出するのを防ぐ手よ。',
    '宝生マーゴを進めて、自陣を守ってちょうだい。',
   ],
   autoMove:{piece:'hanna',from:'e6',to:'e4',magic:'浮遊'},autoMoveSide:'gote',autoMoveAt:1,autoDelayMs:300,
   pageGuides:[[],[],guide('hanna','e4','gote'),guide('hanna','e4','gote'),guide('hanna','e4','gote'),guide('margo','f1','sente')],
   playerMoveAt:5,
   correct:[{piece:'margo',side:'sente',from:'f1',to:'e2',category:'move'}],
   branches:[
    {when:{piece:'margo',from:'f1',to:'f2'},pageGuides:[guide('margo','f2','sente')],lines:['悪くはないけど、駒を端に動かすと使いづらいわ。']},
    {when:{piece:'margo',from:'f1'},lines:['マーゴを動かすのは合っているけど、そこじゃないわ。']},
   ],
   failureLines:['そんなことをして、相手の遠野ハンナに荒らされても良いのかしら。'],
  },
 ],
 successLines:[
  '正解よ。これで自陣を守れたわね。',
  '相手の遠野ハンナをブロックするのは、宝生マーゴの重要な役目だから',
  '突撃してきたら、忘れずに上がっておくのよ。',
 ],
 successPageGuides:[guide('margo','e2','sente'),guide('margo','e2','sente'),guide('margo','e2','sente')],
 defaultFailureLines:['指定された手を指してちょうだい。'],
};
