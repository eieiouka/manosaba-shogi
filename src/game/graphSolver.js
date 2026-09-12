import {
  makeInitialState,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
  actionLabel,
} from './rules.js';

function pieceCode(p) {
  if (!p) return '.';
  const s = p.side === 'sente' ? 's' : 'g';
  const t = ({ema:'e',nanoka:'n',hanna:'h',hiro:'i',sherry:'s',margo:'m'})[p.type];
  return s+t+(p.promoted?'1':'0');
}
function handKey(hand) {
  const cnt = {ema:0,nanoka:0,hanna:0,hiro:0,sherry:0,margo:0};
  for (const p of hand) cnt[p.type]++;
  return `${cnt.nanoka}${cnt.hanna}${cnt.hiro}${cnt.sherry}${cnt.margo}`;
}
export function keyOf(st) {
  return (st.turn==='sente'?'s':'g') + ':' + st.board.flat().map(pieceCode).join('') + ':' + handKey(st.hands.sente)+':'+handKey(st.hands.gote);
}

export function buildReachableGraph({maxStates=Infinity, onProgress=null}={}) {
  const root = makeInitialState();
  const states=[root];
  const keys=[keyOf(root)];
  const idByKey=new Map([[keys[0],0]]);
  const edges=[];
  const edgeActions=[];
  let head=0;
  let complete=true;

  while (head < states.length) {
    if (states.length >= maxStates) { complete=false; break; }
    const st=states[head];
    const term=terminalResult(st);
    if (term) {
      edges[head]=[]; edgeActions[head]=[]; head++;
      continue;
    }
    const acts=generateAllLegalActions(st);
    const tos=[]; const aa=[];
    for (const a of acts) {
      const ns=applyLegalAction(st,a);
      const k=keyOf(ns);
      let id=idByKey.get(k);
      if (id===undefined) {
        id=states.length;
        idByKey.set(k,id);
        states.push(ns); keys.push(k);
      }
      tos.push(id); aa.push(a);
    }
    edges[head]=tos; edgeActions[head]=aa;
    head++;
    if (onProgress && head % 10000===0) onProgress({expanded:head,states:states.length});
  }
  return {root:0,states,keys,idByKey,edges,edgeActions,expanded:head,complete};
}

// Exact W/D/L on a fully expanded finite graph. Remaining cycles are draws.
export function retrogradeSolve(graph) {
  if (!graph.complete) throw new Error('graph must be complete for exact solve');
  const n=graph.states.length;
  const preds=Array.from({length:n},()=>[]);
  const remaining=new Int32Array(n);
  const result=new Int8Array(n); // 0 unknown/draw, 1 win, -1 loss
  const dist=new Int32Array(n);
  const maxChildWinDist=new Int32Array(n);

  for (let u=0;u<n;u++) {
    const es=graph.edges[u]||[];
    remaining[u]=es.length;
    for (const v of es) preds[v].push(u);
  }

  // tiny binary heap by distance; entries [distance,node]
  const heap=[];
  const push=(d,u)=>{ let i=heap.length; heap.push([d,u]); while(i){let p=(i-1)>>1;if(heap[p][0]<=d)break;heap[i]=heap[p];i=p;}heap[i]=[d,u]; };
  const pop=()=>{ const root=heap[0], last=heap.pop(); if(heap.length){let i=0;heap[0]=last;for(;;){let l=i*2+1,r=l+1,m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[i],heap[m]]=[heap[m],heap[i]];i=m;}} return root; };

  for (let u=0;u<n;u++) {
    const term=terminalResult(graph.states[u]);
    if (term && term.score===-1) { result[u]=-1; dist[u]=0; push(0,u); }
  }

  while(heap.length) {
    const [d,v]=pop();
    if (dist[v]!==d) continue;
    for (const u of preds[v]) {
      if (result[u]!==0) continue;
      if (result[v]===-1) {
        // Can move to opponent loss => win. Heap order ensures shortest such loss child.
        result[u]=1; dist[u]=d+1; push(dist[u],u);
      } else if (result[v]===1) {
        remaining[u]--;
        if (d>maxChildWinDist[u]) maxChildWinDist[u]=d;
        if (remaining[u]===0) {
          result[u]=-1; dist[u]=maxChildWinDist[u]+1; push(dist[u],u);
        }
      }
    }
  }

  return {result,dist};
}

export function principalVariation(graph, solved, start=0, maxPlies=1000) {
  const out=[]; let u=start;
  for (let ply=0;ply<maxPlies;ply++) {
    const r=solved.result[u];
    if (r===0) break;
    const es=graph.edges[u]||[];
    if (!es.length) break;
    let best=-1;
    if (r===1) {
      let bd=Infinity;
      for(let i=0;i<es.length;i++) if(solved.result[es[i]]===-1 && solved.dist[es[i]]<bd){bd=solved.dist[es[i]];best=i;}
    } else {
      let bd=-1;
      for(let i=0;i<es.length;i++) if(solved.result[es[i]]===1 && solved.dist[es[i]]>bd){bd=solved.dist[es[i]];best=i;}
    }
    if(best<0) break;
    const a=graph.edgeActions[u][best];
    out.push({node:u, action:a, label:actionLabel(graph.states[u],a), next:es[best]});
    u=es[best];
  }
  return out;
}
