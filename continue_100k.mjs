import {loadCheckpoint,continueCheckpointGraph,saveCheckpoint,graphSnapshot} from './src/game/checkpointGraph.js';
const dir='/mnt/data/manosaba-exact-checkpoint-current';
console.log('loading');
const g=loadCheckpoint(dir); console.log('loaded',graphSnapshot(g), 'rssMB',process.memoryUsage().rss/1e6);
continueCheckpointGraph(g,{maxExpanded:g.head+100000,maxMillis:60000,onProgress:x=>{if(x.expanded%50000===0)console.log(x,'rssMB',process.memoryUsage().rss/1e6)}});
console.log('after',graphSnapshot(g),'rssMB',process.memoryUsage().rss/1e6);
saveCheckpoint(g,dir); console.log('saved');
