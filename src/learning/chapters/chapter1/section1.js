// 第1章1節：ナノカの動かし方 基本
// 既存のセリフ・失敗分岐を維持し、正解後のa2の利きを表示する。
// scenes形式に統一することで、App.jsxの既存successPageGuides処理を利用。
export default {
  id: "nanoka-1",
  title: "ナノカの動かし方 基本",
  chapter: "第1章　1節",
  setup: null,

  scenes: [
    {
      lines: [
        "黒部ナノカよ。まずは、凄くて偉くて天才な私の動かし方を学ぶのよ。",
        "駒を長押しすると、移動範囲と魔法を確認できるわ。How to playボタンも確認しなさい。",
        "黄色が移動マス、赤色が魔法を使えるマスを示しているわ。",
        "移動か魔法で相手の駒を取ることもできるわよ。",
        "相手の駒を取ったら、盤面に打つこともできるわ。",
        "後の章で、実際にやってみましょうね。",
        "私は最強の駒だから、序盤から前に出すのがセオリーよ。",
        "実際に操作して理解しなさい。私を二段目（前）に出して。",
      ],

      pageGuides: [
        [], // 1ページ目
        [], // 2ページ目
        [{side:"sente",type:"nanoka",square:"a1"}], // 3ページ目
        [{side:"sente",type:"nanoka",square:"a1"}], // 4ページ目
        [], // 5ページ目
        [], // 6ページ目
        [{side:"sente",type:"nanoka",square:"a1"}], // 7ページ目
        [{side:"sente",type:"nanoka",square:"a1"}], // 8ページ目
      ],

      playerMoveAt: 7, // 8ページ目で着手解禁
      correct: [
        {piece:"nanoka",fromRank:1,toRank:2,forward:true},
      ],
      branches: [
        {id:"nanoka-side",when:{piece:"nanoka"},lines:["そっちじゃないわ。私は一段前に出してほしいのよ。"]},
        {id:"hanna-float",when:{piece:"ema"},lines:["バカ犬と私の区別もつかなくなったのかしら？"]},
        {id:"other-piece",when:{notPiece:"nanoka"},lines:["私を動かしなさいって言ったでしょう？　他の駒じゃないわ。"]},
      ],
      failureLines: ["私の知らない手を指さないでちょうだい。"],
    },
  ],

  successLines: [
    "正解よ。三段目まで出すと狙われやすくなるから、二段目に出したら横に動かして使うわ。",
    "これで基本の動きは覚えたわね。次の章へ進みなさい。",
  ],
  // 正解後のa2にいるナノカの通常移動（黄色）と魔法（赤色）を両方表示
  successPageGuides: [
    [{side:"sente",type:"nanoka",square:"a2"}], // 成功1ページ目
    [{side:"sente",type:"nanoka",square:"a2"}], // 成功2ページ目
  ],
  defaultFailureLines: ["私の知らない手を指さないでちょうだい。"],
};
