// 第1章5節：シェリーの援護がない両取りの失敗例。
// セリフと利きはこのファイルだけで変更できます。
export default {
  id:"nanoka-5",
  chapter:"第1章　5節",
  title:"ナノカ 両取りの落とし穴",
  actionMode:"pseudo", // エマを配置しない教材盤面
  ignoreTerminal:true,
  setup:{
    board:Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>{
      const pieces={
        "2,3":{id:"learning5-gote-hiro",type:"hiro",side:"gote",promoted:false}, // d4
        "2,5":{id:"learning5-gote-hanna",type:"hanna",side:"gote",promoted:false}, // f4
        "4,3":{id:"learning5-sente-nanoka",type:"nanoka",side:"sente",promoted:false}, // d2
      };
      return pieces[`${r},${c}`]??null;
    })),
    hands:{sente:[],gote:[]},
    turn:"sente",
  },
  scenes:[
    {
      lines:[
        "さっきと同じく、私（ナノカ）で両取りをかけているわ。",
        "でも、こっちの盤面に橘シェリーがいないわね。",
        "これだけで状況が一変するから、見ててちょうだい。",
        "両取りに対して、相手の遠野ハンナが近づいてきたわ。",
        "さっきと同じように、私の遠方狙撃で二階堂ヒロを取ってちょうだい。",
      ],
      pageGuides:[
        [{side:"sente",type:"nanoka",square:"d2"}], // 1ページ目：両取りの利き
        [{side:"sente",type:"nanoka",square:"d2"}], // 2ページ目：表示なし
        [{side:"sente",type:"nanoka",square:"d2"}], // 2ページ目：表示なし
        [{side:"sente",type:"nanoka",square:"d2"}], // 3ページ目：狙撃の利き
        [{side:"sente",type:"nanoka",square:"d2"}], // 2ページ目：表示なし
      ],
      autoMove:{piece:"hanna",from:"f4",to:"e3"},
      autoMoveAt:3,
      autoDelayMs:250, // セリフをめくった後：0.25秒待機
      playerMoveAt:4,
      correct:[{piece:"nanoka",from:"d2",to:"d4",magic:"銃撃"}],
      failureLines:["ここでは二階堂ヒロを銃撃してちょうだい。"],
    },
    {
      lines:[
        "相手の二階堂ヒロを取れたわね。これで成功したように見えるけど…",
        "相手の遠野ハンナが私（ナノカ）を取って、魔女化してしまったわ。",
        "第4節と違って、遠野ハンナを取り返す手段がないわね。",
        "こうなると、私と二階堂ヒロの交換で駒損が残るわよ。",
        "遠野ハンナにも侵入されて、圧倒的不利になってしまったわ。",
      ],
      pageGuides:[
        [], // 1ページ目
        [], // 2ページ目
        [], // 3ページ目
        [], // 4ページ目
      ],
      autoMove:{piece:"hanna",from:"e3",to:"d2"},
      autoMoveAt:1,
      autoDelayMs:250, // セリフをめくった後：0.25秒待機
      // correct を省略：相手の着手後はセリフ送りだけでクリア。
    },
  ],
  successLines:[
    "私（ナノカ）の両取りをかける時は、私を取られても取り返せることが重要よ。",
    "駒得するつもりが、むしろ駒損にならないように注意することね。",
  ],
  defaultFailureLines:["指定された手順でもう一度考えてちょうだい。"],
};
