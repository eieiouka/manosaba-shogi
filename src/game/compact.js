
// Exact compact/canonical position encoding.
// 180° rotation + side swap is a game symmetry, so equivalent positions
// can share one node in the exhaustive graph.
//
// IMPORTANT: canonicalExactKey() uses the complete encoded bytes, not only a
// 64-bit hash, so game-theoretic solving does not depend on hash-collision luck.

const TYPE = { ema:1, nanoka:2, hanna:3, hiro:4, sherry:5, margo:6 };

export function encodePiece(p) {
  if (!p) return 0;
  return TYPE[p.type] | (p.side === "gote" ? 8 : 0) | (p.promoted ? 16 : 0);
}

function handCounts(hand) {
  const out = new Uint8Array(6);
  for (const p of hand) out[TYPE[p.type] - 1]++;
  return out;
}

export function encodeExactBytes(state) {
  const out = new Uint8Array(49);
  let i = 0;
  for (let r=0;r<6;r++) for (let c=0;c<6;c++) out[i++] = encodePiece(state.board[r][c]);
  out[i++] = state.turn === "gote" ? 1 : 0;
  for (const n of handCounts(state.hands.sente)) out[i++] = n;
  for (const n of handCounts(state.hands.gote)) out[i++] = n;
  return out;
}

export function encodeRotatedSideSwappedBytes(state) {
  const out = new Uint8Array(49);
  let i = 0;

  // 180-degree board rotation plus sente/gote swap.
  for (let r=5;r>=0;r--) {
    for (let c=5;c>=0;c--) {
      const p = state.board[r][c];
      if (!p) {
        out[i++] = 0;
      } else {
        out[i++] =
          TYPE[p.type] |
          (p.side === "sente" ? 8 : 0) |
          (p.promoted ? 16 : 0);
      }
    }
  }

  out[i++] = state.turn === "sente" ? 1 : 0;
  for (const n of handCounts(state.hands.gote)) out[i++] = n;
  for (const n of handCounts(state.hands.sente)) out[i++] = n;
  return out;
}

function compareBytes(a,b) {
  for (let i=0;i<a.length;i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

function bytesToBinaryString(bytes) {
  // All values are <= 31, so this is exact and compact enough for JS Map keys.
  let s = "";
  const chunk = 8192;
  for (let i=0;i<bytes.length;i+=chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i+chunk));
  }
  return s;
}

export function canonicalExactBytes(state) {
  const normal = encodeExactBytes(state);
  const symmetric = encodeRotatedSideSwappedBytes(state);
  return compareBytes(normal, symmetric) <= 0 ? normal : symmetric;
}

export function canonicalExactKey(state) {
  return bytesToBinaryString(canonicalExactBytes(state));
}

export function exactKeyWithoutSymmetry(state) {
  return bytesToBinaryString(encodeExactBytes(state));
}

// Optional fast pre-hash for bucketed maps. Never use this alone for exactness.
export function hashBytes64(bytes) {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * prime) & mask;
  }
  return h;
}

const REV_TYPE = [null, "ema", "nanoka", "hanna", "hiro", "sherry", "margo"];

export function decodeExactKey(key) {
  const bytes = new Uint8Array(key.length);
  for (let i = 0; i < key.length; i++) bytes[i] = key.charCodeAt(i);
  if (bytes.length !== 49) throw new Error(`bad compact key length: ${bytes.length}`);

  const board = Array.from({ length: 6 }, () => Array(6).fill(null));
  let i = 0;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const code = bytes[i++];
      if (!code) continue;
      const typeCode = code & 7;
      board[r][c] = {
        id: `p-${r}-${c}`,
        type: REV_TYPE[typeCode],
        side: (code & 8) ? "gote" : "sente",
        promoted: !!(code & 16),
      };
    }
  }
  const turn = bytes[i++] ? "gote" : "sente";
  const hands = { sente: [], gote: [] };
  for (const side of ["sente", "gote"]) {
    for (let t = 1; t <= 6; t++) {
      const count = bytes[i++];
      for (let k = 0; k < count; k++) {
        hands[side].push({ id: `h-${side}-${t}-${k}`, type: REV_TYPE[t], side, promoted: false });
      }
    }
  }
  return { board, hands, turn, lastMove: null, note: "", winner: null, winReason: null };
}

export function decodeExactBytes(bytes) {
  if (bytes.length !== 49) throw new Error(`bad compact byte length: ${bytes.length}`);
  const board = Array.from({ length: 6 }, () => Array(6).fill(null));
  let i = 0;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const code = bytes[i++];
      if (!code) continue;
      const typeCode = code & 7;
      board[r][c] = {
        id: `p-${r}-${c}`,
        type: REV_TYPE[typeCode],
        side: (code & 8) ? "gote" : "sente",
        promoted: !!(code & 16),
      };
    }
  }
  const turn = bytes[i++] ? "gote" : "sente";
  const hands = { sente: [], gote: [] };
  for (const side of ["sente", "gote"]) {
    for (let t = 1; t <= 6; t++) {
      const count = bytes[i++];
      for (let k = 0; k < count; k++) {
        hands[side].push({ id: `h-${side}-${t}-${k}`, type: REV_TYPE[t], side, promoted: false });
      }
    }
  }
  return { board, hands, turn, lastMove: null, note: "", winner: null, winReason: null };
}
