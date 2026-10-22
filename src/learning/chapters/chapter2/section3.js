// 第2章3節：ハンナ棒銀。
// 初期配置から ▲ナノカa2 △ナノカf5 ▲ナノカb2 △ナノカe5 と進んだ局面。
// ナノカは各陣営1枚のまま、他の駒も初期配置を維持する。
const guide=(type,square,side='sente')=>[{side,type,square}];
export default {
 id:'hanna-3',chapter:'第2章　3節',title:'「ハンナ棒銀」ってなに？',
 setup:{placements:[
  {side:'sente',type:'nanoka',to:'b2'},
  {side:'gote',type:'nanoka',to:'e5'},
 ],turn:'sente'},
 scenes:[
  {
   lines:[
    '今回は、遠野ハンナを使った攻め筋「ハンナ棒銀」を教えてあげるわ。',
    'ハンナの空中浮遊を使って、三段目まで進めてちょうだい。',
   ],
   pageGuides:[[],guide('hanna','b1')],playerMoveAt:1,
   correct:[{piece:'hanna',from:'b1',to:'b3',magic:'浮遊'}],
   branches:[{when:{piece:'hanna',from:'b1'},lines:['ハンナを動かすのは合っているけど、魔法を使ってちょうだい。']}],
   failureLines:['私の指示を無視するんじゃないわ。はっ倒すわよ。'],
  },
  {
   lines:[
    '遠野ハンナを前線に出せたわね。',
    '定石通り、相手は宝生マーゴで受けてきたわ。',
    'ここで遠野ハンナを突撃させるのが「ハンナ棒銀」よ。',
    '私（ナノカ）の利きを活かして、遠野ハンナを前に進めなさい。',
   ],
   autoMove:{piece:'margo',from:'a6',to:'b5'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[[],[],guide('hanna','b3'),guide('hanna','b3')],playerMoveAt:3,
   correct:[{piece:'hanna',from:'b3',to:'b4',category:'move'}],
   branches:[{when:{piece:'hanna',from:'b3'},lines:['そこに遠野ハンナを動かすと、タダで取られてしまうわ。']}],
   failureLines:['私の指示を無視するんじゃないわ。はっ倒すわよ。'],
  },
  {
   lines:[
    'これで、相手の宝生マーゴにアタックできるわね。',
    '相手は、こちらの遠野ハンナを素直に取ってきたわ。',
    '私の遠隔狙撃で、取り返してちょうだい。',
   ],
   autoMove:{piece:'margo',from:'b5',to:'b4'},autoMoveAt:1,autoDelayMs:300,
   pageGuides:[[],[],[],guide('nanoka','b2'),guide('nanoka','b2')],playerMoveAt:2,
   correct:[{piece:'nanoka',from:'b2',to:'b4',magic:'銃撃'}],
   branches:[{when:{piece:'nanoka',from:'b2'},lines:['私の魔法を使いなさいと言ってるのよ。']}],
   failureLines:['私の指示を無視するんじゃないわ。はっ倒すわよ。'],
  },
 ],
 successLines:[
  'これで、遠野ハンナと宝生マーゴを交換できたわね。',
  'この交換は、宝生マーゴを入手したこっちが駒得よ。',
  '私と協力して遠野ハンナを繰り出すのが、ハンナ棒銀よ。',
  'ここまで早いタイミングで攻めると、反撃を食らうけどね。',
  'それでも基本となる攻め筋だから、しっかり覚えておきなさい。',
 ],
 defaultFailureLines:['私の指示を無視するんじゃないわ。はっ倒すわよ。'],
};
