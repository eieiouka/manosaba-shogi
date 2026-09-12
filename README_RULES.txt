
manosaba-shogi 研究UI / 駒ルール表示 v1

既存の Vite + React プロジェクトへ以下を上書き:
- src/App.jsx
- src/App.css
- src/main.jsx
- public/images/pieces/

今回追加:
- 選択した駒の通常移動を黒矢印
- 魔法/特殊能力を赤矢印
- 実際に矢印先をクリックすると着手
- ナノカ銃撃: 駒は動かず対象だけ捕獲
- ヒロ居合切り: 味方と入替
- シェリー: 前1/2 + 斜め前捕獲
- マーゴ: 跳躍暗殺
- ハンナ: 浮遊
- 魔女化後: エマ以外は八方1 + 個別能力維持
- 1手戻る / 1手進む / 棋譜

まだ未実装:
- 王手放置禁止
- 詰み判定
- エマ最下段到達の即勝利処理
- 千日手3回
- 正式な成り可否/強制成り
- 持ち駒の最下段打ち禁止
- 探索AI

まず目視確認用のルールUIとして作成。


v2 fixes:
- Hanna floating arrow: always show 2-square forward magic move when landing square is empty
- Clicking the currently selected piece again now deselects it


v3 fix:
- Gote initial setup is horizontally reversed from Sente's screen view.
- Screen top row left->right: Margo, Sherry, Ema, Hiro, Hanna, Nanoka.
- Therefore Nanoka is on Gote's own left, which appears on the right from Sente's view.


v4 promotion:
- Optional promotion dialog when a non-Ema unpromoted piece moves into, within, or out of the opponent's two-rank camp.
- Reaching opponent's last rank unpromoted forces promotion automatically.
- Promotion dialog previews black vs red piece art.


v5 king safety:
- Emma is treated as the king for check legality.
- Moves that leave own Emma capturable are filtered out before arrows are drawn.
- Emma cannot move onto an attacked square.
- Capturing/blocking the checking piece is allowed if it removes check.
- Nanoka shooting / Margo jump assassination / Sherry special capture are included in attack detection.
- Hiro friendly swap does not count as an attack.
- Current side shows 王手 when its Emma is under attack.
- Checkmate detection is not yet added.


v6 Hanna fix:
- Hanna normal movement corrected to forward + forward-diagonals by 1 square.
- Hanna floating remains a 2-square forward magic move to an empty landing square.


v7 shogi coordinates:
- Coordinates changed to Japanese shogi notation.
- Top-right square = 1一.
- Bottom-left square = 6六.
- Files run right-to-left: 1,2,3,4,5,6.
- Ranks run top-to-bottom: 一,二,三,四,五,六.


v8 coordinates:
- Coordinate labels are shown only on the top and right edges.
- Left and bottom duplicate labels removed.
- Top-right remains 1一; bottom-left remains 6六.


v9 coordinate visibility:
- Top and right shogi coordinate labels enlarged from 11px to 20px.
- Font weight increased and coordinate gutter widened.


v10 side panel typography:
- Right-side panel text enlarged to roughly 1.5x.
- Applies to headings, descriptions, AI suggestion, engine values, rule list, and move history.
