import {
  makeInitialState,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
} from './rules.js';
import { canonicalExactKey, decodeExactKey } from './compact.js';

class GrowU32 {
  constructor(capacity = 1 << 20) {
    this.a = new Uint32Array(capacity);
    this.length = 0;
  }
  ensure(n) {
    if (n <= this.a.length) return;
    let cap = this.a.length;
    while (cap < n) cap *= 2;
    const b = new Uint32Array(cap);
    b.set(this.a.subarray(0, this.length));
    this.a = b;
  }
  push(v) {
    this.ensure(this.length + 1);
    this.a[this.length++] = v >>> 0;
  }
  view() { return this.a.subarray(0, this.length); }
}

class GrowU8 {
  constructor(capacity = 1 << 20) {
    this.a = new Uint8Array(capacity);
    this.length = 0;
  }
  ensure(n) {
    if (n <= this.a.length) return;
    let cap = this.a.length;
    while (cap < n) cap *= 2;
    const b = new Uint8Array(cap);
    b.set(this.a.subarray(0, this.length));
    this.a = b;
  }
  push(v) {
    this.ensure(this.length + 1);
    this.a[this.length++] = v;
  }
  set(i,v) { this.ensure(i+1); if (i >= this.length) this.length=i+1; this.a[i]=v; }
  view() { return this.a.subarray(0, this.length); }
}

// Exact packed graph in CSR-like form.
// nodeStart[u]..nodeStart[u]+nodeDegree[u] indexes successor IDs in edgeTo.
// This avoids one JS Array object per node and is materially cheaper at millions of states.
export function buildPackedCSRGraph({ maxStates = Infinity, onProgress = null } = {}) {
  const root = makeInitialState();
  const rootKey = canonicalExactKey(root);
  const keys = [rootKey];
  const idByKey = new Map([[rootKey, 0]]);

  const nodeStart = new GrowU32();
  const nodeDegree = new GrowU32();
  const terminalScore = new GrowU8(); // 0 nonterminal, 1 terminal loss for side-to-move
  const edgeTo = new GrowU32();

  let head = 0;
  let generatedMoves = 0;
  let complete = true;

  while (head < keys.length) {
    if (keys.length >= maxStates) { complete = false; break; }

    nodeStart.push(edgeTo.length);
    const state = decodeExactKey(keys[head]);
    const term = terminalResult(state);

    if (term) {
      nodeDegree.push(0);
      terminalScore.push(term.score === -1 ? 1 : 0);
      head++;
      continue;
    }

    terminalScore.push(0);
    const actions = generateAllLegalActions(state);
    generatedMoves += actions.length;
    nodeDegree.push(actions.length);

    for (const action of actions) {
      const next = applyLegalAction(state, action);
      const key = canonicalExactKey(next);
      let id = idByKey.get(key);
      if (id === undefined) {
        id = keys.length;
        keys.push(key);
        idByKey.set(key, id);
      }
      edgeTo.push(id);
    }

    head++;
    if (onProgress && head % 10000 === 0) {
      onProgress({ expanded: head, states: keys.length, edges: edgeTo.length, generatedMoves });
    }
  }

  // Ensure arrays cover discovered-but-not-expanded nodes when partial.
  return {
    root: 0,
    keys,
    idByKey,
    nodeStart: nodeStart.view(),
    nodeDegree: nodeDegree.view(),
    terminalScore: terminalScore.view(),
    edgeTo: edgeTo.view(),
    expanded: head,
    generatedMoves,
    complete,
  };
}

// Reverse adjacency is built only after the forward graph is complete.
// Uses two flat Uint32 arrays, no predecessor JS arrays.
export function buildReverseCSR(graph) {
  if (!graph.complete) throw new Error('graph must be complete');
  const n = graph.keys.length;
  const indegree = new Uint32Array(n);
  for (let e=0; e<graph.edgeTo.length; e++) indegree[graph.edgeTo[e]]++;

  const predStart = new Uint32Array(n + 1);
  for (let i=0;i<n;i++) predStart[i+1] = predStart[i] + indegree[i];
  const cursor = predStart.slice(0, n);
  const predFrom = new Uint32Array(graph.edgeTo.length);

  for (let u=0;u<n;u++) {
    const start = graph.nodeStart[u];
    const degree = graph.nodeDegree[u];
    for (let j=0;j<degree;j++) {
      const v = graph.edgeTo[start+j];
      predFrom[cursor[v]++] = u;
    }
  }
  return { predStart, predFrom };
}

export function solvePackedCSR(graph) {
  if (!graph.complete) throw new Error('graph must be complete for exact solve');
  const n = graph.keys.length;
  const { predStart, predFrom } = buildReverseCSR(graph);

  // 0 = unresolved/draw, 1 = win, 2 = loss
  const result = new Uint8Array(n);
  const distance = new Uint32Array(n);
  const remaining = new Uint32Array(n);
  const maxWinChildDistance = new Uint32Array(n);
  remaining.set(graph.nodeDegree);

  const queue = new Uint32Array(n);
  let qh = 0, qt = 0;
  for (let u=0;u<n;u++) {
    if (graph.terminalScore[u] === 1) {
      result[u] = 2;
      queue[qt++] = u;
    }
  }

  while (qh < qt) {
    const v = queue[qh++];
    for (let k=predStart[v]; k<predStart[v+1]; k++) {
      const u = predFrom[k];
      if (result[u] !== 0) continue;

      if (result[v] === 2) {
        // Move to a losing child => current is winning.
        result[u] = 1;
        distance[u] = distance[v] + 1;
        queue[qt++] = u;
      } else {
        // This child is winning for the opponent. If all children are wins,
        // current is a forced loss. Delay as long as possible.
        if (remaining[u] > 0) remaining[u]--;
        if (distance[v] > maxWinChildDistance[u]) maxWinChildDistance[u] = distance[v];
        if (remaining[u] === 0) {
          result[u] = 2;
          distance[u] = maxWinChildDistance[u] + 1;
          queue[qt++] = u;
        }
      }
    }
  }

  // Unresolved nodes are game-theoretic draws/cycles under the graph model.
  return { result, distance, predStart, predFrom };
}
