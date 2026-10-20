// 第2章1節：通常移動、浮遊、飛び越え、着地点に敵がいる場合を学ぶ。
// pageGuides は常に通常移動と魔法の両方を共通描画します。
const guide=(square)=>[{side:"sente",type:"hanna",square}];
export default {
 id:"hanna-1",chapter:"第2章　1節",title:"遠野ハンナの動かし方",
 scenes:[
  {
   lines:[
    "遠野ハンナの動きを覚えましょう。黄色は通常移動、赤色は魔法の移動先よ。",
    "ハンナは前方と斜め前の3方向に1マス進めるわ。黄色のマスへ動かしてみて。",
   ],
   afterMoveLines:["お見事ね。これが遠野ハンナの基本移動よ。"],
   afterMovePageGuides:[[]],
   branches:[
    {when:{piece:"hanna",from:"b1",magic:"浮遊"},lines:["今は魔法じゃなくて、普通に1マス動かしてほしいわ。"]},
   ],
   pageGuides:[guide("b1"),guide("b1")],
   playerMoveAt:1,
   correct:[{piece:"hanna",from:"b1",category:"move",toRank:2}],
   failureLines:["まずは黄色で表示された通常移動を試してちょうだい。"],
  },
  {
   // 直前の着手を教材上の初期盤面へ戻してから開始する。
   resetOnEnter:"initial",
   lines:[
    "次は魔法「空中浮遊」よ。盤面を初期配置に戻したわ。",
    "ハンナをb1からb3へ、2マス飛ばしてみてちょうだい。",
   ],
   pageGuides:[guide("b1"),guide("b1")],
   playerMoveAt:1,
   correct:[{piece:"hanna",from:"b1",to:"b3",magic:"浮遊"}],
   afterMoveLines:["そうよ。これが2マス飛べる空中浮遊の魔法ね。"],
   afterMovePageGuides:[[]],
   branches:[
    {when:{piece:"hanna",from:"b1",category:"move"},lines:["今度は通常移動じゃなくて、空中浮遊を使ってちょうだい。"]},
   ],
   failureLines:["赤色のb3へ、空中浮遊を使って進んでちょうだい。"],
  },
  {
   // ナノカb2が途中にいてもハンナは飛び越えられる。
   resetOnEnter:"setup",
   setup:{
    placements:[
     {side:"sente",type:"nanoka",to:"b2"},
     {side:"gote",type:"nanoka",to:"e5"},
    ],
    turn:"sente",
   },
   lines:[
    "今度は私（ナノカ）がb2にいる盤面よ。相手のナノカもe5に移したわ。",
    "途中に味方の駒がいても、空中浮遊なら飛び越えられるわ。b3へ進めて。",
   ],
   pageGuides:[guide("b1"),guide("b1")],
   playerMoveAt:1,
   correct:[{piece:"hanna",from:"b1",to:"b3",magic:"浮遊"}],
   branches:[
    {when:{piece:"hanna",from:"b1",category:"move"},lines:["ここは通常移動ではなく、空中浮遊でナノカを飛び越えてちょうだい。"]},
   ],
   failureLines:["b2に駒がいても、浮遊でb3まで飛べるわよ。"],
  },
  {
   lines:[
    "ちゃんと飛び越えられたわね。",
    "相手の宝生マーゴがa6からb5に出てきたわ。",
    "ハンナの利きを見て。2マス先に敵がいると、浮遊では取れないのよ。",
    "途中の駒は飛び越えられても、着地点の駒は取れない。覚えておきなさい。",
   ],
   pageGuides:[guide("b3"),[],guide("b3"),guide("b3")],
   autoMove:{piece:"margo",from:"a6",to:"b5"},
   autoMoveAt:1,
   autoDelayMs:250,
   // プレイヤーの操作なし。最後のページを送るとクリア。
  },
 ],
 successLines:[
  "通常移動と空中浮遊の違い、分かったかしら。",
  "浮遊は途中の駒を飛び越えられるけど、着地点に駒がいると使えないのよ。",
 ],
 defaultFailureLines:["ハンナの利きを見て、もう一度考えてちょうだい。"],
};
