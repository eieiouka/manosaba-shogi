
import { useMemo, useState } from "react";
import "./App.css";

const FILES = ["6", "5", "4", "3", "2", "1"];
const RANKS = ["一", "二", "三", "四", "五", "六"];

const PIECES = {
  nanoka: { name: "黒部ナノカ", short: "ナノカ" },
  hanna: { name: "遠野ハンナ", short: "ハンナ" },
  hiro: { name: "二階堂ヒロ", short: "ヒロ" },
  ema: { name: "桜羽エマ", short: "エマ" },
  sherry: { name: "橘シェリー", short: "シェリー" },
  margo: { name: "宝生マーゴ", short: "マーゴ" },
};

const INITIAL_ORDER = ["nanoka", "hanna", "hiro", "ema", "sherry", "margo"];

const inside = (r, c) => r >= 0 && r < 6 && c >= 0 && c < 6;
const opposite = (side) => (side === "sente" ? "gote" : "sente");
const forwardDir = (side) => (side === "sente" ? -1 : 1);
const sqKey = (r, c) => `${r},${c}`;
const squareName = (r, c) => `${FILES[c]}${RANKS[r]}`;

const inEnemyCamp = (side, row) =>
  side === "sente" ? row <= 1 : row >= 4;

const onEnemyLastRank = (side, row) =>
  side === "sente" ? row === 0 : row === 5;

function promotionStatus(piece, fromRow, toRow) {
  if (!piece || piece.type === "ema" || piece.promoted) {
    return { canPromote: false, mustPromote: false };
  }

  const canPromote =
    inEnemyCamp(piece.side, fromRow) || inEnemyCamp(piece.side, toRow);

  const mustPromote = onEnemyLastRank(piece.side, toRow);

  return { canPromote, mustPromote };
}

function makeInitialBoard() {
  const board = Array.from({ length: 6 }, () => Array(6).fill(null));
  INITIAL_ORDER.forEach((type, col) => {
    // 先手は画面左→右が ナノカ, ハンナ, ヒロ, エマ, シェリー, マーゴ。
    board[5][col] = { id: `s-${type}`, type, side: "sente", promoted: false };

    // 後手は相手から見て同じ並びになるため、先手視点では左右反転。
    // 画面左→右: マーゴ, シェリー, エマ, ヒロ, ハンナ, ナノカ
    board[0][5 - col] = { id: `g-${type}`, type, side: "gote", promoted: false };
  });
  return board;
}

function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function imageFor(piece) {
  return `/images/pieces/${piece.type}_${piece.promoted ? "red" : "black"}.png`;
}

function moveAction(piece, from, to, extra = {}) {
  return {
    category: "move",
    kind: "normal",
    piece,
    from,
    to,
    ...extra,
  };
}

function magicAction(piece, from, to, magic, extra = {}) {
  return {
    category: "magic",
    kind: "special",
    piece,
    from,
    to,
    magic,
    ...extra,
  };
}

function canLand(board, side, r, c) {
  return inside(r, c) && (!board[r][c] || board[r][c].side !== side);
}

function isEnemy(board, side, r, c) {
  return inside(r, c) && board[r][c] && board[r][c].side !== side;
}

function isFriendly(board, side, r, c) {
  return inside(r, c) && board[r][c] && board[r][c].side === side;
}

/**
 * 研究UI用の擬似合法手生成。
 * 現段階では「王手放置」「詰み」「千日手」「成りゾーン」はまだ未接続。
 * 駒固有の移動/魔法だけをここで一元管理する。
 */
function generatePieceActions(state, row, col) {
  const board = state.board;
  const piece = board[row][col];
  if (!piece) return [];

  const side = piece.side;
  const f = forwardDir(side);
  const from = [row, col];
  const actions = [];

  const addStep = (dr, dc, opts = {}) => {
    const r = row + dr;
    const c = col + dc;
    if (!inside(r, c)) return;
    const target = board[r][c];
    if (target?.side === side) return;
    if (opts.mustBeEmpty && target) return;
    if (opts.mustBeEnemy && (!target || target.side === side)) return;
    actions.push(moveAction(piece, from, [r, c], opts));
  };

  // 魔女化後（エマ除く）の共通移動：八方1マス
  const addPromotedKingMoves = () => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        addStep(dr, dc);
      }
    }
  };

  switch (piece.type) {
    case "ema": {
      // 魔女殺し：八方1マス。魔女化なし。
      addPromotedKingMoves();
      break;
    }

    case "nanoka": {
      // 銃撃
      if (piece.promoted) {
        addPromotedKingMoves();
      } else {
        // 通常移動：前・左右1マス、後退不可。通常移動で捕獲可。
        addStep(f, 0);
        addStep(0, -1);
        addStep(0, 1);
      }

      // 射撃：正面2 / 斜め前2。間に駒があると不可。
      const shots = [
        [2 * f, 0],
        [2 * f, -2],
        [2 * f, 2],
      ];
      for (const [dr, dc] of shots) {
        const tr = row + dr;
        const tc = col + dc;
        const mr = row + dr / 2;
        const mc = col + dc / 2;
        if (!inside(tr, tc)) continue;
        if (board[mr][mc]) continue;
        if (!isEnemy(board, side, tr, tc)) continue;
        actions.push(
          magicAction(piece, from, [tr, tc], "銃撃", {
            captureAt: [tr, tc],
            movePiece: false,
          })
        );
      }
      break;
    }

    case "hiro": {
      // 居合切り
      if (piece.promoted) {
        addPromotedKingMoves();
      } else {
        // 前・左右1マス、後退不可。
        addStep(f, 0);
        addStep(0, -1);
        addStep(0, 1);
      }

      // 八方の味方と入れ替え。
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const tr = row + dr;
          const tc = col + dc;
          if (isFriendly(board, side, tr, tc)) {
            actions.push(
              magicAction(piece, from, [tr, tc], "居合切り", {
                swap: true,
              })
            );
          }
        }
      }
      break;
    }

    case "sherry": {
      // サイドステップ
      if (piece.promoted) {
        // 成り後：八方1マスは通常捕獲可。
        addPromotedKingMoves();

        // 2マス前進能力は維持。途中/着地点とも空き。
        const midR = row + f;
        const endR = row + 2 * f;
        if (
          inside(endR, col) &&
          !board[midR][col] &&
          !board[endR][col]
        ) {
          actions.push(moveAction(piece, from, [endR, col], { longForward: true }));
        }
      } else {
        // 前1：空きマスのみ。敵駒は取れない。
        const r1 = row + f;
        if (inside(r1, col) && !board[r1][col]) {
          actions.push(moveAction(piece, from, [r1, col]));
        }

        // 前2：途中/着地点とも空き。
        const r2 = row + 2 * f;
        if (
          inside(r2, col) &&
          !board[r1][col] &&
          !board[r2][col]
        ) {
          actions.push(moveAction(piece, from, [r2, col], { longForward: true }));
        }

        // 捕獲は斜め前1のみ。ここは「特殊捕獲」として赤矢印表示。
        for (const dc of [-1, 1]) {
          const tr = row + f;
          const tc = col + dc;
          if (isEnemy(board, side, tr, tc)) {
            actions.push(
              magicAction(piece, from, [tr, tc], "サイドステップ", {
                captureAt: [tr, tc],
                movePiece: true,
              })
            );
          }
        }
      }
      break;
    }

    case "margo": {
      // 跳躍暗殺
      if (piece.promoted) {
        addPromotedKingMoves();
      } else {
        // 通常：前/斜め前1マス。
        addStep(f, -1);
        addStep(f, 0);
        addStep(f, 1);
      }

      // 特殊：横/後/斜め後ろのみ。
      // 敵駒1枚を飛び越え、着地点が空なら敵駒を取る。
      const back = -f;
      const dirs = [
        [0, -1],
        [0, 1],
        [back, -1],
        [back, 0],
        [back, 1],
      ];
      for (const [dr, dc] of dirs) {
        const mr = row + dr;
        const mc = col + dc;
        const tr = row + 2 * dr;
        const tc = col + 2 * dc;
        if (!inside(tr, tc)) continue;
        if (!isEnemy(board, side, mr, mc)) continue;
        if (board[tr][tc]) continue;

        actions.push(
          magicAction(piece, from, [tr, tc], "跳躍暗殺", {
            captureAt: [mr, mc],
            movePiece: true,
          })
        );
      }
      break;
    }

    case "hanna": {
      // 浮遊
      if (piece.promoted) {
        addPromotedKingMoves();
      } else {
        // 通常：前・斜め前へ1マス。通常移動で捕獲可。
        addStep(f, -1);
        addStep(f, 0);
        addStep(f, 1);
      }

      // 浮遊：前方へ2マス。間の駒の有無に関係なく飛び越え可、着地点は空き。
      const mr = row + f;
      const tr = row + 2 * f;
      if (
        inside(tr, col) &&
        !board[tr][col]
      ) {
        actions.push(
          magicAction(piece, from, [tr, col], "浮遊", {
            jumpOver: [mr, col],
            movePiece: true,
          })
        );
      }
      break;
    }

    default:
      break;
  }

  return actions;
}


function findEmma(board, side) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const p = board[r][c];
      if (p?.side === side && p.type === "ema") return [r, c];
    }
  }
  return null;
}

function actionCapturesSquare(state, action, targetRow, targetCol) {
  // 射撃・跳躍暗殺など、着地点とは別のマスを取る能力。
  if (action.captureAt) {
    return action.captureAt[0] === targetRow && action.captureAt[1] === targetCol;
  }

  // 通常移動による捕獲。
  if (action.category === "move") {
    return action.to[0] === targetRow && action.to[1] === targetCol;
  }

  // シェリーの斜め捕獲など「特殊だが駒自身もそのマスへ進む」能力。
  if (action.category === "magic" && action.movePiece) {
    return action.to[0] === targetRow && action.to[1] === targetCol;
  }

  // ヒロの入替などは敵を取らない。
  return false;
}

function isEmmaInCheck(state, side) {
  const ema = findEmma(state.board, side);
  if (!ema) return true;

  const [er, ec] = ema;
  const enemy = opposite(side);

  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const p = state.board[r][c];
      if (!p || p.side !== enemy) continue;

      const enemyActions = generatePieceActions(state, r, c);
      for (const action of enemyActions) {
        if (actionCapturesSquare(state, action, er, ec)) {
          return true;
        }
      }
    }
  }

  return false;
}

function isActionKingSafe(state, action) {
  const moving = state.board[action.from[0]][action.from[1]];
  if (!moving) return false;

  // 成る/成らないで盤上の占有関係は同じなので、
  // 王手判定は未成として仮適用すれば足りる。
  const next = applyAction(state, action, false);

  // 手番は applyAction で交代するが、守るべきエマは「指した側」。
  return !isEmmaInCheck(next, moving.side);
}

function generateLegalPieceActions(state, row, col) {
  const piece = state.board[row][col];
  if (!piece) return [];
  return generatePieceActions(state, row, col).filter((action) =>
    isActionKingSafe(state, action)
  );
}

function applyAction(state, action, promoteChoice = false) {
  const board = cloneBoard(state.board);
  const hands = {
    sente: [...state.hands.sente],
    gote: [...state.hands.gote],
  };

  const [fr, fc] = action.from;
  const [tr, tc] = action.to;
  const moving = board[fr][fc];

  const capturePieceAt = (r, c) => {
    const captured = board[r][c];
    if (!captured) return;
    hands[moving.side].push({
      id: `hand-${captured.type}-${Date.now()}-${Math.random()}`,
      type: captured.type,
      side: moving.side,
      promoted: false,
    });
    board[r][c] = null;
  };

  if (action.swap) {
    const temp = board[tr][tc];
    board[tr][tc] = moving;
    board[fr][fc] = temp;
  } else if (action.magic === "銃撃") {
    const [cr, cc] = action.captureAt;
    capturePieceAt(cr, cc);
    // ナノカ自身は移動しない。
  } else {
    if (action.captureAt) {
      const [cr, cc] = action.captureAt;
      capturePieceAt(cr, cc);
    } else if (board[tr][tc] && board[tr][tc].side !== moving.side) {
      capturePieceAt(tr, tc);
    }

    board[fr][fc] = null;
    board[tr][tc] = {
      ...moving,
      promoted:
        moving.type === "ema"
          ? false
          : moving.promoted || promoteChoice,
    };
  }

  const marker = action.category === "magic" ? "✦" : "";
  const moveText = `${state.turn === "sente" ? "▲" : "△"}${PIECES[moving.type].short} ${squareName(fr, fc)}→${squareName(tr, tc)}${marker}${action.magic ? ` ${action.magic}` : ""}`;

  return {
    board,
    hands,
    turn: opposite(state.turn),
    lastMove: { from: [fr, fc], to: [tr, tc], category: action.category },
    note: moveText,
  };
}

function Piece({ piece, compact = false }) {
  const meta = PIECES[piece.type];
  return (
    <div
      className={[
        "piece",
        piece.side === "gote" ? "piece--gote" : "",
        compact ? "piece--compact" : "",
      ].join(" ")}
      title={`${meta.name}${piece.promoted ? "（魔女化）" : ""}`}
    >
      <img src={imageFor(piece)} alt={meta.name} draggable={false} />
    </div>
  );
}

function ArrowOverlay({ actions, selected }) {
  if (!selected || actions.length === 0) return null;

  const startX = (selected.col + 0.5) * (100 / 6);
  const startY = (selected.row + 0.5) * (100 / 6);

  return (
    <svg className="arrow-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <marker
          id="arrow-black"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L5,2.5 L0,5 z" fill="#111" />
        </marker>
        <marker
          id="arrow-red"
          markerWidth="5"
          markerHeight="5"
          refX="4"
          refY="2.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L5,2.5 L0,5 z" fill="#c51f28" />
        </marker>
      </defs>

      {actions.map((a, i) => {
        const endX = (a.to[1] + 0.5) * (100 / 6);
        const endY = (a.to[0] + 0.5) * (100 / 6);
        const dx = endX - startX;
        const dy = endY - startY;
        const len = Math.hypot(dx, dy) || 1;

        // 少し内側から始め/終えることで駒の顔を潰しにくくする。
        const inset = 2.5;
        const sx = startX + (dx / len) * inset;
        const sy = startY + (dy / len) * inset;
        const ex = endX - (dx / len) * inset;
        const ey = endY - (dy / len) * inset;

        const magic = a.category === "magic";
        return (
          <g key={`${i}-${sqKey(...a.to)}-${a.magic || "move"}`}>
            <line
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              className={magic ? "arrow arrow--magic" : "arrow arrow--move"}
              markerEnd={magic ? "url(#arrow-red)" : "url(#arrow-black)"}
            />
            {magic && (
              <circle
                cx={endX}
                cy={endY}
                r="1.35"
                className="magic-end"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Hand({ title, side, pieces, selectedHand, onSelect }) {
  return (
    <div className={`hand hand--${side}`}>
      <div className="hand-title">{title}</div>
      <div className="hand-pieces">
        {pieces.length === 0 ? (
          <span className="hand-empty">なし</span>
        ) : (
          pieces.map((piece) => (
            <button
              key={piece.id}
              className={[
                "hand-piece",
                selectedHand?.id === piece.id ? "active" : "",
              ].join(" ")}
              onClick={() => onSelect(piece)}
            >
              <Piece piece={piece} compact />
              <span>{PIECES[piece.type].short}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default function App() {
  const initialState = useMemo(
    () => ({
      board: makeInitialBoard(),
      hands: { sente: [], gote: [] },
      turn: "sente",
      lastMove: null,
      note: "初期局面",
    }),
    []
  );

  const [timeline, setTimeline] = useState([initialState]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState(null);
  const [selectedHand, setSelectedHand] = useState(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [suggestion, setSuggestion] = useState(null);

  const state = timeline[cursor];

  const actions = useMemo(() => {
    if (!selected) return [];
    return generateLegalPieceActions(state, selected.row, selected.col);
  }, [state, selected]);

  const actionMap = useMemo(() => {
    const m = new Map();
    for (const a of actions) {
      const key = sqKey(...a.to);
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(a);
    }
    return m;
  }, [actions]);

  function commit(next) {
    const trimmed = timeline.slice(0, cursor + 1);
    setTimeline([...trimmed, next]);
    setCursor(trimmed.length);
    setSelected(null);
    setSelectedHand(null);

    if (state.turn === "gote") {
      setSuggestion("先手AI最善手：探索エンジン接続予定");
    } else {
      setSuggestion(null);
    }
  }

  function executeAction(action) {
    const moving = state.board[action.from[0]][action.from[1]];
    const status = promotionStatus(moving, action.from[0], action.to[0]);

    if (status.mustPromote) {
      commit(applyAction(state, action, true));
      return;
    }

    if (status.canPromote) {
      setPendingPromotion({ action, piece: moving });
      return;
    }

    commit(applyAction(state, action, false));
  }

  function resolvePromotion(promote) {
    if (!pendingPromotion) return;
    commit(applyAction(state, pendingPromotion.action, promote));
    setPendingPromotion(null);
  }

  function handleSquareClick(row, col) {
    const clicked = state.board[row][col];

    if (selectedHand) {
      if (clicked) return;
      const board = cloneBoard(state.board);
      const hands = {
        sente: [...state.hands.sente],
        gote: [...state.hands.gote],
      };
      const idx = hands[state.turn].findIndex((p) => p.id === selectedHand.id);
      if (idx < 0) return;

      const [piece] = hands[state.turn].splice(idx, 1);
      board[row][col] = {
        ...piece,
        id: `${state.turn}-${piece.type}-${Date.now()}`,
        side: state.turn,
        promoted: false,
      };

      commit({
        ...state,
        board,
        hands,
        turn: opposite(state.turn),
        lastMove: { from: null, to: [row, col], category: "drop" },
        note: `${state.turn === "sente" ? "▲" : "△"}${PIECES[piece.type].short}打 ${squareName(row, col)}`,
      });
      return;
    }

    if (selected) {
      const choices = actionMap.get(sqKey(row, col));
      if (choices?.length) {
        // 同一着地点に通常/魔法が重なるケースでは魔法を優先。
        const action = choices.find((a) => a.category === "magic") || choices[0];
        executeAction(action);
        return;
      }
    }

    if (clicked && clicked.side === state.turn) {
      if (selected?.row === row && selected?.col === col) {
        setSelected(null);
        setSelectedHand(null);
      } else {
        setSelected({ row, col });
        setSelectedHand(null);
      }
      return;
    }

    setSelected(null);
  }

  function selectHand(piece) {
    if (piece.side !== state.turn) return;
    setSelected(null);
    setSelectedHand(selectedHand?.id === piece.id ? null : piece);
  }

  function jump(delta) {
    const next = Math.max(0, Math.min(timeline.length - 1, cursor + delta));
    setCursor(next);
    setSelected(null);
    setSelectedHand(null);
    setPendingPromotion(null);
    setSuggestion(null);
  }

  function reset() {
    setTimeline([initialState]);
    setCursor(0);
    setSelected(null);
    setSelectedHand(null);
    setPendingPromotion(null);
    setSuggestion(null);
  }

  const selectedPiece = selected ? state.board[selected.row][selected.col] : null;
  const currentInCheck = isEmmaInCheck(state, state.turn);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">MANOSABA SHOGI LAB</div>
          <h1>魔法少女ノ魔法将棋 — 研究盤</h1>
        </div>
        <div className={`turn-badge turn-badge--${state.turn} ${currentInCheck ? "turn-badge--check" : ""}`}>
          {state.turn === "sente" ? "先手番" : "後手番"}
          {currentInCheck && <span className="check-label">王手</span>}
        </div>
      </header>

      <main className="main-grid">
        <section className="left-panel">
          <Hand
            title="後手 持ち駒"
            side="gote"
            pieces={state.hands.gote}
            selectedHand={selectedHand}
            onSelect={selectHand}
          />

          <div className="board-frame">
            <div className="coords coords--top">
              {FILES.map((file) => <span key={file}>{file}</span>)}
            </div>

            <div className="board-wrap">
              <div className="board-container">
                <div className="board">
                  {state.board.map((row, r) =>
                    row.map((piece, c) => {
                      const selectedHere = selected?.row === r && selected?.col === c;
                      const targetActions = actionMap.get(sqKey(r, c)) || [];
                      const hasMove = targetActions.some((a) => a.category === "move");
                      const hasMagic = targetActions.some((a) => a.category === "magic");

                      return (
                        <button
                          key={`${r}-${c}`}
                          className={[
                            "square",
                            (r + c) % 2 ? "square--alt" : "",
                            selectedHere ? "square--selected" : "",
                            hasMove ? "square--move-target" : "",
                            hasMagic ? "square--magic-target" : "",
                          ].join(" ")}
                          onClick={() => handleSquareClick(r, c)}
                        >
                          {piece && <Piece piece={piece} />}
                          <span className="square-label">{squareName(r, c)}</span>
                        </button>
                      );
                    })
                  )}
                </div>
                <ArrowOverlay actions={actions} selected={selected} />
              </div>

              <div className="coords coords--right">
                {RANKS.map((rank) => <span key={rank}>{rank}</span>)}
              </div>
            </div>

          </div>

          <Hand
            title="先手 持ち駒"
            side="sente"
            pieces={state.hands.sente}
            selectedHand={selectedHand}
            onSelect={selectHand}
          />

          <div className="toolbar">
            <button onClick={() => jump(-1)} disabled={cursor === 0}>← 1手戻る</button>
            <button onClick={() => jump(1)} disabled={cursor === timeline.length - 1}>1手進む →</button>
            <button disabled>
              成りは敵陣で選択
            </button>
            <button className="danger" onClick={reset}>初期局面</button>
          </div>
        </section>

        <aside className="right-panel">
          <section className="panel-card">
            <div className="panel-title">選択中の駒</div>
            {selectedPiece ? (
              <>
                <div className="selected-info">
                  <strong>{PIECES[selectedPiece.type].name}</strong>
                  <span>{selectedPiece.promoted ? "魔女化" : "通常"}</span>
                </div>
                <div className="legend">
                  <div><span className="line-sample line-sample--move" />黒矢印：通常移動</div>
                  <div><span className="line-sample line-sample--magic" />赤矢印：魔法 / 特殊能力</div>
                </div>
              </>
            ) : (
              <div className="muted">盤上の自分の駒を押してください。</div>
            )}
          </section>

          <section className="panel-card">
            <div className="panel-title">先手AI 推奨手</div>
            <div className="suggestion">
              {suggestion || "後手が指したあと、ここに先手の最善手を表示する想定。"}
            </div>
            <div className="engine-meta">
              <span>探索</span><strong>未接続</strong>
              <span>評価</span><strong>—</strong>
            </div>
          </section>

          <section className="panel-card">
            <div className="panel-title">現在入っている駒ルール</div>
            <div className="rule-list">
              <div><b>エマ</b> 八方1</div>
              <div><b>ナノカ</b> 前/左右1 + 前方2系射撃</div>
              <div><b>ヒロ</b> 前/左右1 + 八方味方入替</div>
              <div><b>シェリー</b> 前1/2 + 斜め前捕獲</div>
              <div><b>マーゴ</b> 前3方向 + 横/後方跳躍暗殺</div>
              <div><b>ハンナ</b> 前・斜め前1 + 前方2浮遊</div>
            </div>
            <p className="muted">
              魔女化後はエマ以外が八方1マス移動。個別能力は維持。
              敵陣2段目以降への侵入・敵陣内・敵陣から出る手では成る/成らないを選択。
              相手最下段へ未成で進む場合は自動で魔女化します。
              エマが取られるマスへの移動、王手放置になる着手は合法手から除外済みです。
              詰み・千日手は次段階で接続します。
            </p>
          </section>

          <section className="panel-card history-card">
            <div className="panel-title">棋譜</div>
            <div className="history">
              {timeline.slice(1).map((s, i) => (
                <button
                  key={i}
                  className={cursor === i + 1 ? "history-row active" : "history-row"}
                  onClick={() => {
                    setCursor(i + 1);
                    setSelected(null);
                    setSelectedHand(null);
                  }}
                >
                  <span>{i + 1}</span>
                  <span>{s.note}</span>
                </button>
              ))}
              {timeline.length === 1 && <div className="muted">まだ着手はありません。</div>}
            </div>
          </section>
        </aside>
      </main>

      {pendingPromotion && (
        <div className="promotion-backdrop" onClick={() => resolvePromotion(false)}>
          <div className="promotion-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="promotion-title">魔女化しますか？</div>
            <div className="promotion-piece-name">
              {PIECES[pendingPromotion.piece.type].name}
            </div>
            <div className="promotion-preview">
              <div>
                <span>成らない</span>
                <Piece piece={{ ...pendingPromotion.piece, promoted: false }} compact />
              </div>
              <div>
                <span>魔女化</span>
                <Piece piece={{ ...pendingPromotion.piece, promoted: true }} compact />
              </div>
            </div>
            <div className="promotion-actions">
              <button onClick={() => resolvePromotion(false)}>成らない</button>
              <button className="promote" onClick={() => resolvePromotion(true)}>魔女化する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
