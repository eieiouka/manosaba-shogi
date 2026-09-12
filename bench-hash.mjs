import { buildPackedHashGraph } from './src/game/packedGraphHash.js';
const maxStates=Number(process.argv[2]||200000);
const t0=performance.now();
const g=buildPackedHashGraph({maxStates});
const t1=performance.now();
const m=process.memoryUsage();
console.log(JSON.stringify({maxStates,states:g.keyTable.length,expanded:g.expanded,edges:g.edgeTo.length,moves:g.generatedMoves,sec:(t1-t0)/1000,rssMB:m.rss/1048576,heapMB:m.heapUsed/1048576,complete:g.complete,hashCapacity:g.keyTable.capacity,keyStoreMB:g.keyTable.keyBytes.byteLength/1048576}));
