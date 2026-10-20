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
   failureLines:["関係ないことをしないでちょうだい。イライラするわ。"],
  },
  {
   // 直前の着手を教材上の初期盤面へ戻してから開始する。
   resetOnEnter:"initial",
   lines:[
    "次は魔法「空中浮遊」の説明よ。盤面を初期配置に戻したわ。",
    "空中浮遊の魔法を使って、2マス進んでみてちょうだい。",
   ],
   pageGuides:[guide("b1"),guide("b1")],
   playerMoveAt:1,
   correct:[{piece:"hanna",from:"b1",to:"b3",magic:"浮遊"}],
   afterMoveLines:["そうよ。これが2マス飛べる空中浮遊の魔法よ。"],
   afterMovePageGuides:[[]],
   branches:[
    {when:{piece:"hanna",from:"b1",category:"move"},lines:["今度は通常移動じゃなくて、空中浮遊の魔法を使ってちょうだい。"]},
   ],
   failureLines:["関係ないことをしないでちょうだい。イライラするわ。"],
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
    "今度は私（ナノカ）が遠野ハンナの前にいる盤面よ。",
    "途中に味方の駒がいても、空中浮遊なら飛び越えられるわ。試しにやってみなさい。",
   ],
   pageGuides:[guide("b1"),guide("b1")],
   playerMoveAt:1,
   correct:[{piece:"hanna",from:"b1",to:"b3",magic:"浮遊"}],
   branches:[
    {when:{piece:"hanna",from:"b1",category:"move"},lines:["ここは通常移動ではなく、空中浮遊で私を飛び越えてちょうだい。"]},
   ],
   failureLines:["関係ないことをしないでちょうだい。イライラするわ。"],
  },
  {
   lines:[
    "ちゃんと飛び越えられたわね。",
    "相手の宝生マーゴが遠野ハンナの前に出てきたわ。",
    "遠野ハンナの利きを見て。2マス先に敵がいると、浮遊で移動できないわ。",
    "途中の駒は飛び越えられても、着地点の駒は取れないのよ。覚えておきなさい。",
   ],
   pageGuides:[guide("b3"),[],guide("b3"),guide("b3")],
   autoMove:{piece:"margo",from:"a6",to:"b5"},
   autoMoveAt:1,
   autoDelayMs:250,
   // プレイヤーの操作なし。最後のページを送るとクリア。
  },
 ],
 successLines:[
  "これで、遠野ハンナの動きが分かったかしら？",
  "次の章からは、具体的な活用法を解説するわ。",
 ],
 defaultFailureLines:["ハンナの利きを見て、もう一度考えてちょうだい。"],
};
