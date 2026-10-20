export default {
  id:"nanoka-2",
  interludeRule:{
   afterMove:1,trigger:"b2c2",autoAtPage:1,
   autoMove:{piece:"hiro",from:"d5",to:"d4",category:"move"},
   finishAt:3,finalMove:{piece:"nanoka",from:"c2",to:"e4",magic:"銃撃"},
   captureSquare:"e4",capturePiece:"hanna",
  },
  title:"ナノカ 生け捕りの筋",
  chapter:"第1章　2節",
  // 初期配置から指定された5枚だけを移動。残りの駒・持ち駒は初期状態のまま。
  setup:{
   placements:[
    {side:"gote",type:"hanna",to:"e4"},
    {side:"gote",type:"margo",to:"a5"},
    {side:"gote",type:"hiro",to:"d5"},
    {side:"sente",type:"margo",to:"e2"},
    {side:"sente",type:"nanoka",to:"b2"},
   ],
   turn:"sente",
  },
  lines:[
   "私の魔法を使って、相手の遠野ハンナを一方的に取りましょう。",
   "相手の遠野ハンナの動きを黄色マスで示すわ。",
   "こちらの宝生マーゴの動きも示すわ。相手の遠野ハンナが移動したら捕獲できるわね。",
   "ここで、私の魔法「遠方狙撃」を使うわよ。",
   "私の移動方向と魔法を使えるマスはこんな感じだから",
   "魔法で相手の遠野ハンナを狙える位置に、私を動かしてちょうだい。",
  ],
  // セリフページ(0始まり)ごとに自動で移動範囲を表示。通常の長押し表示とは独立。
  pageGuides: [
    [], // 1ページ目
    [{side:"gote",type:"hanna",square:"e4"}], // 2ページ目
    [{side:"sente",type:"margo",square:"e2"}], // 3ページ目
    [], // 4ページ目
    [{side:"sente",type:"nanoka",square:"b2"}], // 5ページ目
    [{side:"sente",type:"nanoka",square:"b2"}], // 6ページ目
  ],
  // 中継セリフは利き表示なし（必要ならここへ追加）
  interludePageGuides: [
    [{side:"sente",type:"nanoka",square:"c2"}], // 1ページ目
    [], // 2ページ目
    [], // 3ページ目
  ],

  // 1手目ナノカ b2→c2、2手目は後手ヒロ d5→d4（自動）、3手目ナノカ c2→e4で銃撃。
  correct:["b2c2", {piece:"hiro",side:"gote",from:"d5",to:"d4"}, {piece:"nanoka",side:"sente",from:"c2",to:"e4",magic:"銃撃"}],
  interludeLines:[
   "正解よ。これで相手の遠野ハンナを狙える位置に来たわね。",
   "相手が二階堂ヒロで援軍を足してきたわ。",
   "でも私には関係ないわよ。遠方狙撃で遠野ハンナを取ってしまいなさい。",
  ],
  successLines:[
   "正解よ。遠方狙撃で遠野ハンナを一方的に取れたわね。",
   "相手の援軍がいても、射線が通っていればタダで取れるのが私の強みよ。",
   "相手が駒を飛び出してきたら、積極的に狙うと良いわ。",
  ],
  // 失敗時の利き表示も、セリフ1ページにつき配列1つで指定します。
  // 特定手の分岐は汎用の nanoka-other より前に置いてください。
  branches:[
   {
    id:"nanoka-a2",when:{piece:"nanoka",from:"b2",to:"a2"},
    lines:["私を動かすのは正しいけど、そこじゃないわ。相手の遠野ハンナを狙いなさい。"],
    pageGuides:[
     [{side:"sente",type:"nanoka",square:"a2"}], // 1ページ目：a2のナノカの通常移動・魔法
    ],
   },
   {
    id:"nanoka-b3",when:{piece:"nanoka",from:"b2",to:"b3"},
    lines:["私を動かすのは正しいけど、そこじゃないわ。相手の遠野ハンナを狙いなさい。"],
    pageGuides:[
     [{side:"sente",type:"nanoka",square:"b3"}], // 1ページ目：b3のナノカの通常移動・魔法
    ],
   },
   {
    id:"nanoka-other",when:{piece:"nanoka"},
    lines:["私を動かすのは正しいけど、そこじゃないわ。相手の遠野ハンナを狙いなさい。"],
    pageGuides:[
     [], // 1ページ目：利き表示なし
    ],
   },
   {
    id:"wrong-piece",when:{notPiece:"nanoka"},
    lines:["私以外を動かしたら、私の魔法が使えるのかしら？"],
    pageGuides:[
     [], // 1ページ目：利き表示なし
    ],
   },
  ],
  // 中継後、ナノカの遠方狙撃を間違えたときのセリフ（App.jsxに直書きしない）
  finalMoveFailureLines:["取れる駒を取らないなんて…。頭が悪いわ、まるで桜羽エマね。"],
  defaultFailureLines:["私の知らない手を指さないでちょうだい。"],
 };
