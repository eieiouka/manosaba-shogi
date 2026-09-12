
全盤面探索エンジン v1

追加:
  src/game/solver.js
  src/game/solver.worker.js

solver.js:
- 勝ち / 引き分け / 負けの完全ゲーム木探索用 negamax
- 同一局面3回を引き分けとして扱う経路別 repetition map
- transposition table
- 勝ちなら最短勝ち、負けなら最長抵抗の手数を保持
- principal variation (PV) を返す
- ブラウザ検証用の深さ制限negamaxも併設

重要:
現在のルール本体が src/App.jsx 内にあるため、探索器とUIで同じ合法手生成を使うには
次に rules.js へ切り出す必要があります。

完全読み切りで結果を断定する条件:
1. UIと探索器が同じ generateLegalMoves を使う
2. 王手/詰み/エマ最下段勝利/成り/打ち/千日手をすべて状態遷移へ含める
3. WorkerまたはNode側で探索を最後まで完走
4. exact=true が返った局面だけ「読み切り」として採用

途中で打ち切った深さ制限探索は「読み切り」と呼ばない。


v2 shared rules:
- Added src/game/rules.js
- Exact board state, initial placement, promotion branching, drops, check filtering,
  Emma-goal win, no-legal-move terminal, and all six piece action generators.
- Added src/game/runSolve.js to solve the initial position and return PV labels.

Next computational step:
Run solveInitialPosition() in a non-UI Node/Worker process with no node cap.
Only exact=true is a completed readout.
