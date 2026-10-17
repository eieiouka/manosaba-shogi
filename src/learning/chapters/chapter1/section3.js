// 第1章3節：シーンごとにセリフ・利き表示・着手・失敗分岐を編集します。
// エマの特殊失敗セリフは「桜羽エマで利きを足して」のシーンに配置。
export default {
  "id": "nanoka-3",
  "chapter": "第1章　3節",
  "title": "三段目の駒はナノカの標的",
  "setup": null,
  "scenes": [
    {
      "lines": [
        "三段目まで出た駒は、私の遠方狙撃の標的になるわ。実戦で確かめましょう。",
        "まずは橘シェリーの全力突進で、2マス前に進めてちょうだい。"
      ],
      "pageGuides": [
        [],
        [
          {
            "side": "sente",
            "type": "sherry",
            "square": "e1"
          }
        ]
      ],
      "playerMoveAt": 1,
      "correct": [
        {
          "piece": "sherry",
          "from": "e1",
          "to": "e3",
          "category": "move"
        }
      ],
      "branches": [
        {
          "when": {
            "piece": "sherry",
            "from": "e1",
            "to": "e2"
          },
          "lines": [
            "橘シェリーを動かすのは合っているけど、魔法を使ってほしいわ。"
          ]
        },
        {
          "when": {
            "piece": "nanoka"
          },
          "lines": [
            "私じゃなくて、橘シェリーを動かしなさい。"
          ]
        }
      ],
      "failureLines": []
    },
    {
      "lines": [
        "先に進めれば分かるけど、この橘シェリーは取られる運命にあるわ。",
        "相手の遠野ハンナが空中浮遊の魔法で飛んできたわね。",
        "このままだと、橘シェリーを取られてしまうわ。",
        "宝生マーゴを動かして、橘シェリーを守ってあげなさい。"
      ],
      "pageGuides": [
        [],
        [],
        [
          {
            "side": "gote",
            "type": "hanna",
            "square": "e4"
          }
        ],
        []
      ],
      "autoMove": {
        "piece": "hanna",
        "from": "e6",
        "to": "e4",
        "magic": "浮遊"
      },
      "autoMoveAt": 1,
      "playerMoveAt": 3,
      "correct": [
        {
          "piece": "margo",
          "from": "f1",
          "to": "e2"
        }
      ],
      "branches": [
        {
          "when": {
            "piece": "margo",
            "from": "f1",
            "to": "f2"
          },
          "lines": [
            "そこに動かしても守れるけど、中央に駒を進めた方が使いやすいわよ。"
          ]
        }
      ],
      "failureLines": []
    },
    {
      "lines": [
        "これで、相手が橘シェリーを取ってきても、宝生マーゴで取り返せるわね。",
        "相手が私（ナノカ）を援軍に出してきたわ。",
        "こちらも私（ナノカ）を前に出しましょう。"
      ],
      "pageGuides": [
        [
          {
            "side": "sente",
            "type": "margo",
            "square": "e2"
          }
        ],
        [],
        []
      ],
      "autoMove": {
        "piece": "nanoka",
        "from": "f6",
        "to": "f5"
      },
      "autoMoveAt": 1,
      "playerMoveAt": 2,
      "correct": [
        {
          "piece": "nanoka",
          "from": "a1",
          "to": "a2"
        }
      ],
      "branches": [],
      "failureLines": []
    },
    {
      "lines": [
        "相手が私（ナノカ）を横に使ってきたわ。",
        "このままだと、橘シェリーが危ないわよ。",
        "桜羽エマで利きを足して、守ってあげなさい。"
      ],
      "pageGuides": [
        [],
        [],
        [
          {
            "side": "sente",
            "type": "ema",
            "square": "d1"
          }
        ]
      ],
      "autoMove": {
        "piece": "nanoka",
        "from": "f5",
        "to": "e5"
      },
      "autoMoveAt": 0,
      "playerMoveAt": 2,
      "correct": [
        {
          "piece": "ema",
          "from": "d1",
          "to": "d2"
        }
      ],
      "branches": [
        {
          "when": {
            "piece": "ema",
            "from": "d1",
            "to": "c2"
          },
          "lines": [
            "桜羽エマをそこに動かしても、橘シェリーを守れないわよ。"
          ],
          "pageGuides": [
            [
              {
                "side": "sente",
                "type": "ema",
                "square": "c2"
              }
            ]
          ]
        },
        {
          "when": {
            "piece": "ema",
            "from": "d1",
            "to": "e1"
          },
          "lines": [
            "桜羽エマをそこに動かしても、橘シェリーを守れないわよ。"
          ],
          "pageGuides": [
            [
              {
                "side": "sente",
                "type": "ema",
                "square": "e1"
              }
            ]
          ]
        }
      ],
      "failureLines": []
    },
    {
      "lines": [
        "これで橘シェリーを守れたように見えるけど…",
        "構わず、遠野ハンナで取ってきたわ。",
        "宝生マーゴで取り返しましょう。",
      ],
      "pageGuides": [
        [],
        [],
        []
      ],
      "autoMove": {
        "piece": "hanna",
        "from": "e4",
        "to": "e3"
      },
      "autoMoveAt": 1,
      "playerMoveAt": 2,
      "correct": [
        {
          "piece": "margo",
          "to": "e3",
          "category": "move"
        }
      ],
      "branches": [],
      "failureLines": []
    },
    {
      "lines": [
        "宝生マーゴは桜羽エマで守れてる…ように見えるけど",
        "私（ナノカ）の遠隔狙撃からは逃れられないわ。",
        "相手の遠野ハンナを取れたけど、2枚取られて大損よ。",
      ],
      "pageGuides": [
        [
          {
            "side": "sente",
            "type": "ema",
            "square": "d2"
          }
        ],
        [],
        []
      ],
      "autoMove": {
        "piece": "nanoka",
        "from": "e5",
        "to": "e3",
        "magic": "銃撃"
      },
      "autoMoveAt": 1,
      "branches": [],
      "failureLines": []
    }
  ],
  "successLines": [
    "このように、迂闊に三段目に駒を出すと私の餌食になるわ。",
    "なるべく、二段目までで駒組みするのが良いわよ。"
  ],
  "defaultFailureLines": [
    "その手じゃないわ。直前の局面からやり直しなさい。"
  ]
};
