import {
  makeInitialState,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
} from './rules.js';
import { canonicalExactBytes, decodeExactBytes } from './compact.js';
import { ExactKeyTable49 } from './keyTable.js';

class GrowU32 {
  constructor(capacity = 1 << 20) { this.a = new Uint32Array(capacity); this.length = 0; }
  ensure(n) { if (n <= this.a.length) return; let cap=this.a.length; while(cap<n) cap*=2; const b=new Uint32Array(cap); b.set(this.a.subarray(0,this.length)); this.a=b; }
  push(v) { this.ensure(this.length+1); this.a[this.length++]=v>>>0; }
  view() { return this.a.subarray(0,this.length); }
}
class GrowU8 {
  constructor(capacity = 1 << 20) { this.a = new Uint8Array(capacity); this.length = 0; }
  ensure(n) { if(n<=this.a.length)return; let cap=this.a.length; while(cap<n)cap*=2; const b=new Uint8Array(cap); b.set(this.a.subarray(0,this.length)); this.a=b; }
  push(v) { this.ensure(this.length+1); this.a[this.length++]=v; }
  view(){return this.a.subarray(0,this.length);}
}

// v8: no JS Map and no 49-char JS string per position.
// Exact 49-byte canonical keys live in one flat Uint8Array and are indexed by
// an open-addressed typed-array hash table with bytewise collision checks.
export function buildPackedHashGraph({maxStates=Infinity,onProgress=null}={}) {
  const root = makeInitialState();
  const table = new ExactKeyTable49(1 << 20, 1 << 20);
  table.getOrInsert(canonicalExactBytes(root)); // root id 0

  const nodeStart=new GrowU32();
  const nodeDegree=new GrowU32();
  const terminalScore=new GrowU8();
  const edgeTo=new GrowU32();
  let head=0, generatedMoves=0, complete=true;

  while (head < table.length) {
    if (table.length >= maxStates) { complete=false; break; }
    nodeStart.push(edgeTo.length);
    const state=decodeExactBytes(table.keyView(head));
    const term=terminalResult(state);
    if (term) {
      nodeDegree.push(0);
      terminalScore.push(term.score===-1?1:0);
      head++;
      continue;
    }

    terminalScore.push(0);
    const actions=generateAllLegalActions(state);
    generatedMoves += actions.length;
    nodeDegree.push(actions.length);

    for (const action of actions) {
      const next=applyLegalAction(state,action);
      const {id}=table.getOrInsert(canonicalExactBytes(next));
      edgeTo.push(id);
    }
    head++;
    if (onProgress && head%10000===0) onProgress({expanded:head,states:table.length,edges:edgeTo.length,generatedMoves});
  }

  return {
    root:0,
    keyTable:table,
    nodeStart:nodeStart.view(),
    nodeDegree:nodeDegree.view(),
    terminalScore:terminalScore.view(),
    edgeTo:edgeTo.view(),
    expanded:head,
    generatedMoves,
    complete,
  };
}

export function buildReverseCSRHash(graph) {
  if (!graph.complete) throw new Error('graph must be complete');
  const n=graph.keyTable.length;
  const indegree=new Uint32Array(n);
  for(let e=0;e<graph.edgeTo.length;e++) indegree[graph.edgeTo[e]]++;
  const predStart=new Uint32Array(n+1);
  for(let i=0;i<n;i++) predStart[i+1]=predStart[i]+indegree[i];
  const cursor=predStart.slice(0,n);
  const predFrom=new Uint32Array(graph.edgeTo.length);
  for(let u=0;u<n;u++) {
    const start=graph.nodeStart[u], degree=graph.nodeDegree[u];
    for(let j=0;j<degree;j++) { const v=graph.edgeTo[start+j]; predFrom[cursor[v]++]=u; }
  }
  return {predStart,predFrom};
}

export function solvePackedHash(graph) {
  if (!graph.complete) throw new Error('graph must be complete for exact solve');
  const n=graph.keyTable.length;
  const {predStart,predFrom}=buildReverseCSRHash(graph);
  const result=new Uint8Array(n); // 0 draw/unresolved, 1 win, 2 loss
  const distance=new Uint32Array(n);
  const remaining=new Uint32Array(n); remaining.set(graph.nodeDegree);
  const maxWinChildDistance=new Uint32Array(n);
  const queue=new Uint32Array(n); let qh=0,qt=0;
  for(let u=0;u<n;u++) if(graph.terminalScore[u]===1){result[u]=2;queue[qt++]=u;}
  while(qh<qt){
    const v=queue[qh++];
    for(let k=predStart[v];k<predStart[v+1];k++){
      const u=predFrom[k]; if(result[u]!==0) continue;
      if(result[v]===2){ result[u]=1; distance[u]=distance[v]+1; queue[qt++]=u; }
      else {
        if(remaining[u]>0) remaining[u]--;
        if(distance[v]>maxWinChildDistance[u]) maxWinChildDistance[u]=distance[v];
        if(remaining[u]===0){ result[u]=2; distance[u]=maxWinChildDistance[u]+1; queue[qt++]=u; }
      }
    }
  }
  return {result,distance,predStart,predFrom};
}
