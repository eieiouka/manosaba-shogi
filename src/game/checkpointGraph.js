import fs from 'node:fs';
import path from 'node:path';
import {
  makeInitialState,
  generateAllLegalActions,
  applyLegalAction,
  terminalResult,
} from './rules.js';
import { canonicalExactBytes, decodeExactBytes } from './compact.js';
import { ExactKeyTable49 } from './keyTable.js';
import { SegmentedExactKeyTable49 } from './segmentedKeyTable.js';

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
function fromU32(view) { const g=new GrowU32(Math.max(1<<20, view.length || 1)); g.ensure(view.length); g.a.set(view); g.length=view.length; return g; }
function fromU8(view) { const g=new GrowU8(Math.max(1<<20, view.length || 1)); g.ensure(view.length); g.a.set(view); g.length=view.length; return g; }

export function createCheckpointGraph() {
  const table = new ExactKeyTable49(1 << 20, 1 << 20);
  table.getOrInsert(canonicalExactBytes(makeInitialState()));
  return { table, nodeStart:new GrowU32(), nodeDegree:new GrowU32(), terminalScore:new GrowU8(), edgeTo:new GrowU32(), head:0, generatedMoves:0, complete:false };
}

export function continueCheckpointGraph(g,{maxStates=Infinity,maxExpanded=Infinity,maxMillis=Infinity,onProgress=null}={}) {
  const started=performance.now();
  while(g.head < g.table.length) {
    if (g.table.length >= maxStates || g.head >= maxExpanded || performance.now()-started >= maxMillis) { g.complete=false; return g; }
    g.nodeStart.push(g.edgeTo.length);
    const state=decodeExactBytes(g.table.keyView(g.head));
    const term=terminalResult(state);
    if(term) { g.nodeDegree.push(0); g.terminalScore.push(term.score===-1?1:0); g.head++; continue; }
    g.terminalScore.push(0);
    const actions=generateAllLegalActions(state);
    g.generatedMoves += actions.length;
    g.nodeDegree.push(actions.length);
    for(const action of actions) {
      const next=applyLegalAction(state,action);
      const {id}=g.table.getOrInsert(canonicalExactBytes(next));
      g.edgeTo.push(id);
    }
    g.head++;
    if(onProgress && g.head%10000===0) onProgress({expanded:g.head,states:g.table.length,edges:g.edgeTo.length,generatedMoves:g.generatedMoves});
  }
  g.complete=true;
  return g;
}

function writeTyped(file, typed, usedLength=typed.length) {
  const bytes = Buffer.from(typed.buffer, typed.byteOffset, usedLength*typed.BYTES_PER_ELEMENT);
  const fd=fs.openSync(file,'w');
  try { fs.writeSync(fd,bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function readU32(file) { const b=fs.readFileSync(file); return new Uint32Array(b.buffer,b.byteOffset,b.byteLength/4); }
function readU8(file) { const b=fs.readFileSync(file); return new Uint8Array(b.buffer,b.byteOffset,b.byteLength); }

function saveRaw(g,dir) {
  fs.mkdirSync(dir,{recursive:true});
  const meta={ version:2, head:g.head, generatedMoves:g.generatedMoves, complete:g.complete, tableLength:g.table.length, tableCapacity:g.table.capacity, tableNodeCapacity:g.table.nodeCapacity, nodeStartLength:g.nodeStart.length, nodeDegreeLength:g.nodeDegree.length, terminalScoreLength:g.terminalScore.length, edgeToLength:g.edgeTo.length };
  writeTyped(path.join(dir,'table_ids.u32'),g.table.ids);
  writeTyped(path.join(dir,'table_h1.u32'),g.table.h1);
  writeTyped(path.join(dir,'table_h2.u32'),g.table.h2);
  const keyFile=path.join(dir,'keys.u8');
  const fd=fs.openSync(keyFile,'w');
  try {
    if (g.table.baseKeys) {
      fs.writeSync(fd,Buffer.from(g.table.baseKeys.buffer,g.table.baseKeys.byteOffset,g.table.baseLength*49));
      let remaining=g.table.length-g.table.baseLength;
      for(const chunk of g.table.chunks){ if(remaining<=0) break; const n=Math.min(remaining,g.table.chunkNodes); fs.writeSync(fd,Buffer.from(chunk.buffer,chunk.byteOffset,n*49)); remaining-=n; }
    } else {
      fs.writeSync(fd,Buffer.from(g.table.keyBytes.buffer,g.table.keyBytes.byteOffset,g.table.length*49));
    }
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  writeTyped(path.join(dir,'nodeStart.u32'),g.nodeStart.view());
  writeTyped(path.join(dir,'nodeDegree.u32'),g.nodeDegree.view());
  writeTyped(path.join(dir,'terminalScore.u8'),g.terminalScore.view());
  writeTyped(path.join(dir,'edgeTo.u32'),g.edgeTo.view());
  const metaTmp=path.join(dir,'meta.json.tmp');
  fs.writeFileSync(metaTmp,JSON.stringify(meta));
  const mfd=fs.openSync(metaTmp,'r'); try{fs.fsyncSync(mfd);}finally{fs.closeSync(mfd);}
  fs.renameSync(metaTmp,path.join(dir,'meta.json'));
  validateCheckpoint(dir,meta);
  return meta;
}

export function validateCheckpoint(dir,metaOverride=null) {
  const m=metaOverride ?? JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
  const expected={
    'keys.u8':m.tableLength*49,
    'table_ids.u32':m.tableCapacity*4,
    'table_h1.u32':m.tableCapacity*4,
    'table_h2.u32':m.tableCapacity*4,
    'nodeStart.u32':m.nodeStartLength*4,
    'nodeDegree.u32':m.nodeDegreeLength*4,
    'terminalScore.u8':m.terminalScoreLength,
    'edgeTo.u32':m.edgeToLength*4,
  };
  for(const [name,size] of Object.entries(expected)) {
    const got=fs.statSync(path.join(dir,name)).size;
    if(got!==size) throw new Error(`${name} size ${got} != ${size}`);
  }
  if(m.head>m.tableLength) throw new Error('head exceeds states');
  return true;
}

export function saveCheckpointAtomic(g,dir) {
  const parent=path.dirname(dir), base=path.basename(dir);
  const tmp=path.join(parent,`${base}.tmp-${process.pid}-${Date.now()}`);
  const bak=path.join(parent,`${base}.bak`);
  fs.rmSync(tmp,{recursive:true,force:true});
  saveRaw(g,tmp);
  fs.rmSync(bak,{recursive:true,force:true});
  if(fs.existsSync(dir)) fs.renameSync(dir,bak);
  try {
    fs.renameSync(tmp,dir);
    validateCheckpoint(dir);
  } catch(e) {
    fs.rmSync(dir,{recursive:true,force:true});
    if(fs.existsSync(bak)) fs.renameSync(bak,dir);
    throw e;
  }
  return true;
}

export const saveCheckpoint = saveCheckpointAtomic;

export function loadCheckpoint(dir) {
  validateCheckpoint(dir);
  const m=JSON.parse(fs.readFileSync(path.join(dir,'meta.json'),'utf8'));
  if(m.version!==1 && m.version!==2) throw new Error('unsupported checkpoint version');
  const ids=readU32(path.join(dir,'table_ids.u32'));
  const h1=readU32(path.join(dir,'table_h1.u32'));
  const h2=readU32(path.join(dir,'table_h2.u32'));
  const baseKeys=readU8(path.join(dir,'keys.u8'));
  const table=new SegmentedExactKeyTable49({ids,h1,h2,length:m.tableLength,baseKeys});
  return { table, nodeStart:fromU32(readU32(path.join(dir,'nodeStart.u32'))), nodeDegree:fromU32(readU32(path.join(dir,'nodeDegree.u32'))), terminalScore:fromU8(readU8(path.join(dir,'terminalScore.u8'))), edgeTo:fromU32(readU32(path.join(dir,'edgeTo.u32'))), head:m.head, generatedMoves:m.generatedMoves, complete:m.complete };
}

export function graphSnapshot(g) { return {states:g.table.length,expanded:g.head,edges:g.edgeTo.length,generatedMoves:g.generatedMoves,complete:g.complete}; }
