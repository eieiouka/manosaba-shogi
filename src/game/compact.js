
// Compact encoding utilities for exhaustive Manosaba Shogi research.
// Keeps React objects at the boundary, but graph keys are numeric/typed-array friendly.

const TYPE = { ema:1, nanoka:2, hanna:3, hiro:4, sherry:5, margo:6 };

export function encodePiece(p) {
  if (!p) return 0;
  // bits: 0..2 type, bit3 side, bit4 promoted
  return TYPE[p.type] | (p.side === "gote" ? 8 : 0) | (p.promoted ? 16 : 0);
}

export function encodeBoardBytes(state) {
  const out = new Uint8Array(36);
  let i = 0;
  for (let r=0;r<6;r++) for (let c=0;c<6;c++) out[i++] = encodePiece(state.board[r][c]);
  return out;
}

// 64-bit FNV-1a. BigInt is used only for the hash, avoiding huge string keys.
export function hashPosition64(state) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  const push = (v) => { h ^= BigInt(v); h = (h * prime) & mask; };

  for (const b of encodeBoardBytes(state)) push(b);
  push(state.turn === "gote" ? 1 : 0);

  const counts = (hand) => {
    const a = new Uint8Array(6);
    for (const p of hand) a[TYPE[p.type]-1]++;
    return a;
  };
  for (const n of counts(state.hands.sente)) push(n);
  for (const n of counts(state.hands.gote)) push(n);
  return h;
}

export function compactKey(state) {
  return hashPosition64(state);
}
