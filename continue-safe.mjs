import {loadCheckpoint,continueCheckpointGraph,saveCheckpointAtomic,graphSnapshot} from './src/game/checkpointGraph.js';
const dir='/mnt/data/manosaba-exact-checkpoint-v11';
const target=5000000;
let g=loadCheckpoint(dir);
console.log('loaded',graphSnapshot(g));
continueCheckpointGraph(g,{maxStates:target,onProgress:p=>{if(p.expanded%50000===0)console.log(p)}});
console.log('snapshot',graphSnapshot(g));
saveCheckpointAtomic(g,dir);
console.log('saved',graphSnapshot(g));
