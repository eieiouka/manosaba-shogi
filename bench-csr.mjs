import { buildPackedCSRGraph } from './src/game/packedGraphCSR.js';
const maxStates = Number(process.argv[2] || 1000000);
const t0=performance.now();
const g=buildPackedCSRGraph({maxStates});
const t1=performance.now();
const m=process.memoryUsage();
console.log(JSON.stringify({maxStates,states:g.keys.length,expanded:g.expanded,edges:g.edgeTo.length,moves:g.generatedMoves,sec:(t1-t0)/1000,rssMB:m.rss/1048576,heapMB:m.heapUsed/1048576,complete:g.complete}));
