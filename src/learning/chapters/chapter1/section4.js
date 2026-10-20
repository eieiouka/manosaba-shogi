// 第1章4節：セリフ・利き・正解手を編集可能
export default {
  "id": "nanoka-4",
  "chapter": "第1章　4節",
  "title": "ナノカの両取り",
  "setup": {
    "board": [
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        {
          "id": "learning4-gote-hiro",
          "type": "hiro",
          "side": "gote",
          "promoted": false
        },
        null,
        {
          "id": "learning4-gote-hanna",
          "type": "hanna",
          "side": "gote",
          "promoted": false
        }
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        null,
        null
      ],
      [
        null,
        null,
        null,
        null,
        {
          "id": "learning4-sente-sherry",
          "type": "sherry",
          "side": "sente",
          "promoted": false
        },
        null
      ]
    ],
    "hands": {
      "sente": [
        {
          "id": "learning4-hand-nanoka",
          "type": "nanoka",
          "side": "sente",
          "promoted": false
        }
      ],
      "gote": []
    },
    "turn": "sente"
  },
  "scenes": [
    {
      "lines": [
        "相手の駒を取ったら、好きな場所に打つことができるわ。",
        "ただし、一番奥の段には置けないから注意よ。",
        "私を持ち駒にしたら、両取りを狙うのが良いわ。",
        "1マス空きで敵の駒がいたら、チャンスよ。",
        "相手の遠野ハンナ・二階堂ヒロを、ダブルで狙える位置（両取り）に私を打ってちょうだい。"
      ],
      "pageGuides": [
        [],
        [],
        [],
        [],
        []
      ],
      "playerMoveAt": 4,
      "correct": [
        {
          "piece": "nanoka",
          "category": "drop",
          "to": "d2"
        }
      ],
      "branches": [
        {
          "when": {"piece":"nanoka","category":"drop","to":"f2"},
          "lines": ["（ここにf2失敗の説明を入れる）"]
        },
        {
          "when": {"piece":"nanoka","category":"drop","to":"e4"},
          "lines": ["（ここにe4失敗の説明を入れる）"]
        }
      ],
      "failureLines": [
        "そこに打っても、両取りにならないわね。"
      ]
    },
    {
      "lines": [
        "これで、二階堂ヒロと遠野ハンナの両取りがかかったわね。",
        "相手が遠野ハンナで抵抗してきたわ。",
        "駒得するには、どうするのが良いかしら？"
      ],
      "pageGuides": [
        [{"side":"sente","type":"nanoka","square":"d2"}],
        [],
        []
      ],
      "autoMove": {
        "piece": "hanna",
        "from": "f4",
        "to": "e3"
      },
      "autoMoveAt": 1,
      "playerMoveAt": 2,
      "correct": [
        {
          "piece": "nanoka",
          "from": "d2",
          "to": "d4",
          "magic": "銃撃"
        }
      ],
      "failureLines": [
        "それだと上手く行かないわ。もっと考えなさい。"
      ]
    },
    {
      "lines": [
        "正解よ、二階堂ヒロを取れたわね。",
        "相手が遠野ハンナで、私（ナノカ）を奪ってきたわ。",
        "何をすれば良いか、もう分かるわね。"
      ],
      "pageGuides": [
        [],
        [],
        []
      ],
      "autoMove": {
        "piece": "hanna",
        "from": "e3",
        "to": "d2"
      },
      "autoMoveAt": 1,
      "playerMoveAt": 2,
      "correct": [
        {
          "piece": "sherry",
          "from": "e1",
          "to": "d2"
        }
      ],
      "failureLines": [
        "ここまで来て失敗するなんて…。まるで、桜羽エマね。"
      ]
    }
  ],
  "successLines": [
    "お見事よ、これで遠野ハンナと二階堂ヒロの両方を取れたわね。",
    "代わりに私（ナノカ）を取られてしまったけど、2枚取れて駒得よ。",
    "私の両取りは強力だから、使いこなしてちょうだい。"
  ],
  "forkFailureLines": [
    "遠野ハンナで両取りを防がれてしまったわ。打つ位置が悪かったわね。"
  ],
  // e4打ち後、ヒロd4→e4でナノカを取られた際のセリフ。自由に編集可能。
  "hiroFailureLines": [
    "両取りはかかったけど、相手の二階堂ヒロにすぐ取られてしまったわ。やり直しよ。"
  ],
  "defaultFailureLines": [
    "（ここにその他の失敗時セリフを入れる）"
  ]
};
