import fs from 'node:fs';
import {createCheckpointGraph,continueCheckpointGraph,saveCheckpointAtomic,graphSnapshot} from './src/game/checkpointGraph.js';
const dir='/mnt/data/manosaba-exact-checkpoint-v11';
const target=2500000;
let g=createCheckpointGraph();
continueCheckpointGraph(g,{maxStates:target,onProgress:p=>{if(p.expanded%50000===0)console.log(p)}});
console.log('snapshot',graphSnapshot(g));
saveCheckpointAtomic(g,dir);
console.log('saved',graphSnapshot(g));
