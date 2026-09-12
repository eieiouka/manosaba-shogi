
/*
  Manosaba Shogi search engine v1
  --------------------------------
  Goal: exact game-tree solving, not heuristic-only play.

  Result convention:
    +1 = side to move can force a win
     0 = draw / unresolved cycle under repetition rule
    -1 = side to move is forced to lose

  This module is deliberately independent from React so the same state
  transition and legal-move code can later be shared with a Worker/Node solver.
*/

export const WIN = 1;
export const DRAW = 0;
export const LOSS = -1;

const opposite = (s) => (s === "sente" ? "gote" : "sente");

export function stablePieceCode(p) {
  if (!p) return ".";
  const side = p.side === "sente" ? "S" : "G";
  const type = {
    ema: "E",
    nanoka: "N",
    hanna: "H",
    hiro: "I",
    sherry: "S",
    margo: "M",
  }[p.type];
  return `${side}${type}${p.promoted ? "+" : "-"}`;
}

function handCode(hand) {
  return [...hand]
    .map((p) => p.type)
    .sort()
    .join(",");
}

export function positionKey(state) {
  const board = state.board
    .flat()
    .map(stablePieceCode)
    .join("|");
  return `${state.turn}#${board}#${handCode(state.hands.sente)}#${handCode(state.hands.gote)}`;
}

/*
  Adapter interface.
  The UI currently owns the exact rules. The solver calls these adapters,
  which makes it possible to move the rules into a shared module without
  changing the search algorithm.
*/
export function createSolver({
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
  maxNodes = Infinity,
  onProgress = null,
}) {
  const table = new Map();
  let nodes = 0;
  let stopped = false;

  function stop() {
    stopped = true;
  }

  function solve(rootState) {
    nodes = 0;
    stopped = false;
    const repetitions = new Map();
    const pv = [];
    const result = dfs(rootState, repetitions, pv);
    return {
      ...result,
      nodes,
      tableSize: table.size,
      stopped,
    };
  }

  function dfs(state, repetitions, pvOut) {
    if (stopped || nodes >= maxNodes) {
      stopped = true;
      return { score: DRAW, distance: null, exact: false, pv: [] };
    }

    nodes++;
    if (onProgress && nodes % 10000 === 0) onProgress(nodes);

    const key = positionKey(state);
    const seen = (repetitions.get(key) || 0) + 1;

    // Same position three times = draw.
    if (seen >= 3) {
      return { score: DRAW, distance: 0, exact: true, pv: [] };
    }

    const terminal = terminalResult(state);
    if (terminal) {
      return {
        score: terminal.score,
        distance: 0,
        exact: true,
        pv: [],
        reason: terminal.reason,
      };
    }

    // Transposition results are safe only when this path has not already
    // visited the same position, because repetition count is path-dependent.
    const canUseTable = seen === 1;
    if (canUseTable) {
      const hit = table.get(key);
      if (hit?.exact) return hit;
    }

    const moves = generateAllLegalActions(state);
    if (moves.length === 0) {
      // No legal move: checkmate/stalemate semantics are delegated to
      // terminalResult where possible. In this game, no legal move while
      // Emma is threatened is a loss. The adapter should detect it.
      return { score: LOSS, distance: 0, exact: true, pv: [], reason: "no-legal-move" };
    }

    repetitions.set(key, seen);

    let bestWin = null;
    let bestDraw = null;
    let slowestLoss = null;
    let allExact = true;

    for (const move of moves) {
      const child = applyLegalAction(state, move);
      const childResult = dfs(child, repetitions, []);

      if (!childResult.exact) allExact = false;

      // Negamax: child's result is from child's side-to-move perspective.
      const score = -childResult.score;
      const distance =
        childResult.distance == null ? null : childResult.distance + 1;
      const candidate = {
        score,
        distance,
        exact: childResult.exact,
        pv: [move, ...(childResult.pv || [])],
      };

      if (score === WIN) {
        // Winning side chooses the shortest forced win.
        if (
          !bestWin ||
          (distance != null &&
            (bestWin.distance == null || distance < bestWin.distance))
        ) {
          bestWin = candidate;
        }
      } else if (score === DRAW) {
        if (!bestDraw) bestDraw = candidate;
      } else {
        // Losing side delays defeat as long as possible.
        if (
          !slowestLoss ||
          (distance != null &&
            (slowestLoss.distance == null || distance > slowestLoss.distance))
        ) {
          slowestLoss = candidate;
        }
      }

      // Exact proven win is enough for this node. We still do not claim
      // shortest mate unless all alternative winning lines have been checked.
      // For complete "read everything" mode, do not break here.
    }

    repetitions.set(key, seen - 1);
    if (seen - 1 === 0) repetitions.delete(key);

    let result;
    if (bestWin) {
      result = { ...bestWin, exact: allExact && bestWin.exact };
    } else if (bestDraw) {
      result = { ...bestDraw, exact: allExact && bestDraw.exact };
    } else {
      result = {
        ...(slowestLoss || { score: LOSS, distance: 0, pv: [] }),
        exact: allExact && (slowestLoss?.exact ?? true),
      };
    }

    if (canUseTable && result.exact) table.set(key, result);
    return result;
  }

  return { solve, stop, table };
}

/*
  Iterative deepening fallback for browser testing.
  This does NOT replace exact solving. It is useful only to validate that
  move generation and state transitions work before an exhaustive solve.
*/
export function negamaxDepthLimited({
  state,
  depth,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
  evaluate = () => 0,
}) {
  const terminal = terminalResult(state);
  if (terminal) return { score: terminal.score * 100000, pv: [] };
  if (depth === 0) return { score: evaluate(state), pv: [] };

  let best = { score: -Infinity, pv: [] };
  for (const move of generateAllLegalActions(state)) {
    const child = applyLegalAction(state, move);
    const r = negamaxDepthLimited({
      state: child,
      depth: depth - 1,
      generateAllLegalActions,
      applyLegalAction,
      terminalResult,
      evaluate,
    });
    const score = -r.score;
    if (score > best.score) best = { score, pv: [move, ...r.pv] };
  }
  return best;
}
