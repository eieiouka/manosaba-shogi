import { hashPair49, FIXED_KEY_BYTES } from './keyTable.js';

const KEY_BYTES = FIXED_KEY_BYTES;

export class SegmentedExactKeyTable49 {
  constructor({ids,h1,h2,length,baseKeys,chunkNodes=1<<20}) {
    this.ids=ids; this.h1=h1; this.h2=h2;
    this.capacity=ids.length; this.mask=this.capacity-1;
    this.length=length;
    this.baseLength=length;
    this.baseKeys=baseKeys; // exact bytes loaded once, no copy
    this.chunkNodes=chunkNodes;
    this.chunks=[];
    this.nodeCapacity=length;
  }
  _loc(id) {
    if (id < this.baseLength) return ['base', id*KEY_BYTES];
    const rel=id-this.baseLength;
    const ci=Math.floor(rel/this.chunkNodes);
    const ni=rel-ci*this.chunkNodes;
    return [ci, ni*KEY_BYTES];
  }
  equalsNode(id,bytes) {
    const [where,off]=this._loc(id);
    const a=where==='base'?this.baseKeys:this.chunks[where];
    for(let i=0;i<KEY_BYTES;i++) if(a[off+i]!==bytes[i]) return false;
    return true;
  }
  keyView(id) {
    const [where,off]=this._loc(id);
    const a=where==='base'?this.baseKeys:this.chunks[where];
    return a.subarray(off,off+KEY_BYTES);
  }
  writeKey(id,bytes) {
    const rel=id-this.baseLength;
    const ci=Math.floor(rel/this.chunkNodes);
    const ni=rel-ci*this.chunkNodes;
    while(this.chunks.length<=ci) this.chunks.push(new Uint8Array(this.chunkNodes*KEY_BYTES));
    this.chunks[ci].set(bytes,ni*KEY_BYTES);
    this.nodeCapacity=this.baseLength+this.chunks.length*this.chunkNodes;
  }
  findSlot(bytes,a,b) {
    let slot=(a ^ Math.imul(b,0x9e3779b1)) & this.mask;
    let step=((b>>>16)|1)&this.mask; if(step===0) step=1;
    while(true){
      const stored=this.ids[slot];
      if(stored===0) return [slot,-1];
      if(this.h1[slot]===a && this.h2[slot]===b){const id=stored-1;if(this.equalsNode(id,bytes))return[slot,id];}
      slot=(slot+step)&this.mask;
    }
  }
  maybeGrowHash(){
    // Memory-safe continuation: permit up to 90% before rehashing.
    // Exactness is unchanged; only probe length may increase.
    if((this.length+1)*10 < this.capacity*9) return;
    throw new Error('hash table reached 90% load; checkpoint rehash required');
  }
  getOrInsert(bytes){
    this.maybeGrowHash();
    const [a,b]=hashPair49(bytes); const [slot,found]=this.findSlot(bytes,a,b);
    if(found>=0)return{id:found,inserted:false};
    const id=this.length++; this.writeKey(id,bytes);
    this.ids[slot]=id+1; this.h1[slot]=a; this.h2[slot]=b;
    return{id,inserted:true};
  }
}
