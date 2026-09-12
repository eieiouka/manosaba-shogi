import {
  makeInitialState,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
} from "./rules.js";
import { canonicalExactKey, decodeExactKey } from "./compact.js";

// Memory-reduced exact graph builder.
// Stores one canonical compact key per position; full JS state objects are reconstructed only while expanding a node.
// Edges are stored as numeric successor IDs. Edge actions are not retained; PV labels can be reconstructed later.
export function buildPackedReachableGraph({ maxStates = Infinity, onProgress = null } = {}) {
  const rootState = makeInitialState();
  const rootKey = canonicalExactKey(rootState);
  const keys = [rootKey];
  const idByKey = new Map([[rootKey, 0]]);
  const edges = [];
  const terminal = [];
  let head = 0;
  let complete = true;
  let generatedMoves = 0;

  while (head < keys.length) {
    if (keys.length >= maxStates) { complete = false; break; }
    const st = decodeExactKey(keys[head]);
    const term = terminalResult(st);
    if (term) {
      terminal[head] = term;
      edges[head] = [];
      head++;
      continue;
    }

    const actions = generateAllLegalActions(st);
    generatedMoves += actions.length;
    const tos = new Array(actions.length);
    for (let i = 0; i < actions.length; i++) {
      const ns = applyLegalAction(st, actions[i]);
      const k = canonicalExactKey(ns);
      let id = idByKey.get(k);
      if (id === undefined) {
        id = keys.length;
        keys.push(k);
        idByKey.set(k, id);
      }
      tos[i] = id;
    }
    edges[head] = tos;
    head++;
    if (onProgress && head % 10000 === 0) onProgress({ expanded: head, states: keys.length, generatedMoves });
  }

  return { root: 0, keys, idByKey, edges, terminal, expanded: head, generatedMoves, complete };
}

export function packedRetrogradeSolve(graph) {
  if (!graph.complete) throw new Error("graph must be complete for exact solve");
  const n = graph.keys.length;
  const preds = Array.from({ length: n }, () => []);
  const remaining = new Int32Array(n);
  const result = new Int8Array(n); // 0 draw/unknown, +1 win, -1 loss
  const dist = new Int32Array(n);
  const maxChildWinDist = new Int32Array(n);

  for (let u = 0; u < n; u++) {
    const es = graph.edges[u] || [];
    remaining[u] = es.length;
    for (const v of es) preds[v].push(u);
  }

  const q = [];
  let qh = 0;
  for (let u = 0; u < n; u++) {
    const term = graph.terminal[u];
    if (term?.score === -1) {
      result[u] = -1;
      dist[u] = 0;
      q.push(u);
    }
  }

  while (qh < q.length) {
    const v = q[qh++];
    for (const u of preds[v]) {
      if (result[u] !== 0) continue;
      if (result[v] === -1) {
        result[u] = 1;
        dist[u] = dist[v] + 1;
        q.push(u);
      } else if (result[v] === 1) {
        remaining[u]--;
        if (dist[v] > maxChildWinDist[u]) maxChildWinDist[u] = dist[v];
        if (remaining[u] === 0) {
          result[u] = -1;
          dist[u] = maxChildWinDist[u] + 1;
          q.push(u);
        }
      }
    }
  }
  return { result, dist };
}
