// Exact open-addressed table for fixed 49-byte canonical positions.
// Hashes are only filters: candidates are always byte-compared, so collisions
// cannot change game-theoretic results.

const KEY_BYTES = 49;

function nextPow2(n) {
  let x = 1;
  while (x < n) x <<= 1;
  return x;
}

export function hashPair49(bytes) {
  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x9e3779b9 >>> 0;
  for (let i = 0; i < KEY_BYTES; i++) {
    const b = bytes[i];
    h1 ^= b;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (b + i * 17) & 255;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    h2 ^= h2 >>> 13;
  }
  // Avoid the all-zero pair merely for easier debugging.
  if ((h1 | h2) === 0) h2 = 1;
  return [h1, h2];
}

export class ExactKeyTable49 {
  constructor(initialCapacity = 1 << 20, initialNodeCapacity = 1 << 20) {
    this.capacity = nextPow2(initialCapacity);
    this.mask = this.capacity - 1;
    this.ids = new Uint32Array(this.capacity); // node id + 1, zero = empty
    this.h1 = new Uint32Array(this.capacity);
    this.h2 = new Uint32Array(this.capacity);

    this.nodeCapacity = nextPow2(initialNodeCapacity);
    this.keyBytes = new Uint8Array(this.nodeCapacity * KEY_BYTES);
    this.length = 0;
  }

  ensureNodeCapacity(n) {
    if (n <= this.nodeCapacity) return;
    let cap = this.nodeCapacity;
    while (cap < n) cap *= 2;
    const next = new Uint8Array(cap * KEY_BYTES);
    next.set(this.keyBytes.subarray(0, this.length * KEY_BYTES));
    this.keyBytes = next;
    this.nodeCapacity = cap;
  }

  equalsNode(id, bytes) {
    let off = id * KEY_BYTES;
    for (let i = 0; i < KEY_BYTES; i++) {
      if (this.keyBytes[off + i] !== bytes[i]) return false;
    }
    return true;
  }

  keyView(id) {
    const off = id * KEY_BYTES;
    return this.keyBytes.subarray(off, off + KEY_BYTES);
  }

  writeKey(id, bytes) {
    this.ensureNodeCapacity(id + 1);
    this.keyBytes.set(bytes, id * KEY_BYTES);
  }

  findSlot(bytes, a, b) {
    let slot = (a ^ Math.imul(b, 0x9e3779b1)) & this.mask;
    let step = ((b >>> 16) | 1) & this.mask;
    if (step === 0) step = 1;
    while (true) {
      const stored = this.ids[slot];
      if (stored === 0) return [slot, -1];
      if (this.h1[slot] === a && this.h2[slot] === b) {
        const id = stored - 1;
        if (this.equalsNode(id, bytes)) return [slot, id];
      }
      slot = (slot + step) & this.mask;
    }
  }

  maybeGrowHash() {
    // <= 70% load keeps probing bounded.
    if ((this.length + 1) * 10 < this.capacity * 7) return;
    const oldIds = this.ids;
    const oldH1 = this.h1;
    const oldH2 = this.h2;
    this.capacity *= 2;
    this.mask = this.capacity - 1;
    this.ids = new Uint32Array(this.capacity);
    this.h1 = new Uint32Array(this.capacity);
    this.h2 = new Uint32Array(this.capacity);

    for (let s = 0; s < oldIds.length; s++) {
      const stored = oldIds[s];
      if (!stored) continue;
      const a = oldH1[s], b = oldH2[s];
      let slot = (a ^ Math.imul(b, 0x9e3779b1)) & this.mask;
      let step = ((b >>> 16) | 1) & this.mask;
      if (step === 0) step = 1;
      while (this.ids[slot]) slot = (slot + step) & this.mask;
      this.ids[slot] = stored;
      this.h1[slot] = a;
      this.h2[slot] = b;
    }
  }

  getOrInsert(bytes) {
    this.maybeGrowHash();
    const [a, b] = hashPair49(bytes);
    const [slot, found] = this.findSlot(bytes, a, b);
    if (found >= 0) return { id: found, inserted: false };

    const id = this.length++;
    this.writeKey(id, bytes);
    this.ids[slot] = id + 1;
    this.h1[slot] = a;
    this.h2[slot] = b;
    return { id, inserted: true };
  }
}

export const FIXED_KEY_BYTES = KEY_BYTES;
