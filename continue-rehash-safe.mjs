import {loadCheckpoint,continueCheckpointGraph,saveCheckpointAtomic,graphSnapshot} from './src/game/checkpointGraph.js';
import {SegmentedExactKeyTable49} from './src/game/segmentedKeyTable.js';
import {hashPair49} from './src/game/keyTable.js';
const dir='/mnt/data/manosaba-exact-checkpoint-v11';
let g=loadCheckpoint(dir);
console.log('loaded',graphSnapshot(g),'cap',g.table.capacity);
if ((g.table.length+2500000)*10 >= g.table.capacity*9) {
  let cap=g.table.capacity;
  while ((g.table.length+2500000)*10 >= cap*8) cap*=2;
  const ids=new Uint32Array(cap), h1=new Uint32Array(cap), h2=new Uint32Array(cap), mask=cap-1;
  for(let id=0;id<g.table.length;id++){
    const bytes=g.table.keyView(id); const [a,b]=hashPair49(bytes);
    let slot=(a ^ Math.imul(b,0x9e3779b1)) & mask; let step=((b>>>16)|1)&mask; if(step===0)step=1;
    while(ids[slot]) slot=(slot+step)&mask;
    ids[slot]=id+1; h1[slot]=a; h2[slot]=b;
  }
  g.table=new SegmentedExactKeyTable49({ids,h1,h2,length:g.table.length,baseKeys:g.table.baseKeys,chunkNodes:1<<20});
  console.log('rehash done cap',cap);
}
continueCheckpointGraph(g,{maxStates:5000000,onProgress:p=>{if(p.expanded%50000===0)console.log(p)}});
console.log('snapshot',graphSnapshot(g));
saveCheckpointAtomic(g,dir);
console.log('saved',graphSnapshot(g),'cap',g.table.capacity);
