// ===========================================================================
// ROUND 393 -- WATER: what kind it is, what colour it is, and the cells the
// water system bakes. Pure data and pure functions; the scene half is
// src/scenes/waterMixin.js.
//
//   "I want water to improve the tiles feel lackluster and I'd really like a
//    water system that feels high quality. Related on lake or ocean shores I
//    want water to have beaches with minor waves coming up and receding."
//
// THE FIELD. Every tile near water gets one signed number at its centre:
// positive in the water (how far from the nearest dry tile), negative on land
// (how far from the nearest water), with the waterline at zero. A tile CORNER
// is the average of the four tiles that share it, and a pixel inside a tile is
// the bilinear blend of its four corners. That one field drives everything:
//
//   * depth colour   -- shallow at 0, deep further out, in dithered bands;
//   * the shoreline  -- the zero contour, which rounds the stair-step coast a
//                       tile grid draws into a curve without moving a single
//                       tile (collision still reads the tiles, untouched);
//   * the beach      -- a sand strip over f in [-width, 0] on the land side;
//   * the swash      -- a wave front that runs up to f = -reach and back.
//
// A corner where water meets PAVED or walled ground (a quay, a canal, a
// cliff) is pinned to exactly zero, so built edges stay straight: only a
// natural bank is rounded.
//
// THE CELLS. Because a pixel's value is a function of its four corners only,
// a cell is keyed by (palette, four quantised corners) and baked once into a
// shared canvas page -- a long coast reuses a handful of cells. Animated cells
// (the swash, the lapping line) add a frame number. Baking is a table lookup
// per pixel and happens when a new shape first scrolls into view, never per
// frame.
// ===========================================================================

/** Tile types the system dresses. Sewer water (17) and every interior keep their own art. */
export const W393_WATER_TYPES = new Set([4, 5, 6, 7]);
/** Ground that may carry a beach or a bank: grass and the rough accent (bog, peaks). */
export const W393_NATURAL_LAND = new Set([0, 12]);
/** Counted as water when the field is measured, so a bridge or jetty does not grow a beach of its own. */
export const W393_DOCK_TYPE = 13;

/** The diamond footprint of one ground cell, row by row: [x0, x1) of the
 *  shipped ground tiles' alpha (water_deep.png), so a baked cell covers
 *  exactly the pixels a ground tile does. */
export const W393_SPANS = [
  [32, 33], [30, 35], [28, 37], [26, 39], [24, 41], [22, 43], [20, 45], [18, 47], [16, 49], [14, 51], [12, 53],
  [10, 55], [8, 57], [6, 59], [4, 61], [2, 63], [1, 64], [3, 62], [5, 60], [7, 58], [9, 56], [11, 54], [13, 52],
  [15, 50], [17, 48], [19, 46], [21, 44], [23, 42], [25, 40], [27, 38], [29, 36], [31, 34],
];
export const W393_CW = 64, W393_CH = 32;

/** The surface sheets made by tools/make_water_r393.py. P tiles of world
 *  period, F frames of loop, COLS cells a row; cell = frame*P*P + j*P + i. */
export const W393_SHEETS = {
  lake: { key: 'w393Lake', file: 'public/assets/water/lake.png', P: 8, F: 16, cols: 32, w: 2048, h: 1024 },
  ocean: { key: 'w393Ocean', file: 'public/assets/water/ocean.png', P: 8, F: 16, cols: 32, w: 2048, h: 1024 },
};
export function w393SheetCell(sheet, frame, tx, ty) {
  const P = sheet.P;
  return (frame % sheet.F) * P * P + (((ty % P) + P) % P) * P + (((tx % P) + P) % P);
}

// ---------------------------------------------------------------------------
// KINDS. Read off the region data the water was STAMPED from, rather than
// guessed from the shape on the ground: the ocean is the `ocean` block, a lake
// is inside one of `lakes`' ellipses, a river is near one of `rivers'`
// polylines (and flows the way the polyline is drawn -- headwater first), a
// marsh is in the `swamp` band. Anything else -- a park pond, a stream a
// verticality mockup cut, a moat -- is a pond, or rapids if the tile says so.
// ---------------------------------------------------------------------------
export const W393_KINDS = ['ocean', 'lake', 'river', 'rapids', 'pond', 'swamp', 'lava'];
/** "on lake and ocean shores ... beaches" -- not rivers, swamps or sewers. */
export const W393_BEACH_KINDS = new Set(['lake', 'ocean']);

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / L2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return { d: Math.sqrt(qx * qx + qy * qy), dx: dx / Math.sqrt(L2), dy: dy / Math.sqrt(L2) };
}

/**
 * What kind of water a tile is. `ltx, lty` are REGION-LOCAL tile coords (the
 * same space `lakes`, `rivers` and `ocean` are authored in); `tileType` is the
 * tile's own type (6 rapids, 7 falls). Returns { kind, fx, fy } where (fx, fy)
 * is the unit flow direction in WORLD axes for running water, else 0, 0.
 */
export function w393Classify(region, ltx, lty, tileType) {
  if (!region) return { kind: 'pond', fx: 0, fy: 0 };
  if (region.lava) return { kind: 'lava', fx: 0, fy: 0 };
  const oc = region.ocean;
  if (oc) {
    const depth = Math.max(
      oc.southFrom !== undefined ? lty - oc.southFrom : -Infinity,
      oc.northTo !== undefined ? oc.northTo - lty : -Infinity,
      oc.eastFrom !== undefined ? ltx - oc.eastFrom : -Infinity,
      oc.westTo !== undefined ? oc.westTo - ltx : -Infinity);
    if (depth >= -2) return { kind: 'ocean', fx: 0, fy: 0 };
  }
  for (const lake of (region.lakes || [])) {
    const dx = ltx - lake.at.tx, dy = lty - lake.at.ty;
    if ((dx * dx) / (lake.rx * lake.rx) + (dy * dy) / (lake.ry * lake.ry) <= 1.15) return { kind: 'lake', fx: 0, fy: 0 };
  }
  let best = null;
  for (const river of (region.rivers || [])) {
    const pts = river.points || [];
    const reach = (river.width || 6) / 2 + 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const s = segDist(ltx, lty, pts[i].tx, pts[i].ty, pts[i + 1].tx, pts[i + 1].ty);
      if (s.d <= reach && (!best || s.d < best.d)) best = s;
    }
  }
  const fast = tileType === 6 || tileType === 7;
  if (best) return { kind: fast ? 'rapids' : 'river', fx: best.dx, fy: best.dy };
  if (region.swamp && ltx < region.swamp.westOf) return { kind: 'swamp', fx: 0, fy: 0 };
  if (fast) return { kind: 'rapids', fx: 0, fy: 0 };   // direction found from the ground, see the mixin
  return { kind: 'pond', fx: 0, fy: 0 };
}

// ---------------------------------------------------------------------------
// PALETTES. Each kind draws from one, and every colour is a band of the field
// so the water darkens away from the shore in steps, pixel-art style, with a
// 4x4 ordered dither across each step instead of a smooth gradient.
//   bands  [[upper f, rgb], ...] in rising f; the last band runs on forever.
//   bank   the land side: [[lower f, rgb], ...] from the waterline inward.
// ---------------------------------------------------------------------------
const C = (r, g, b) => [r, g, b];
export const W393_PALETTES = {
  lake: {
    bands: [[0, C(150, 128, 88)], [0.28, C(118, 182, 170)], [0.75, C(84, 164, 176)], [1.6, C(62, 138, 168)],
      [2.8, C(48, 114, 154)], [Infinity, C(38, 92, 138)]],
    // ROUND 393 -- widened after the first in-game look (1.15 / 0.55): at the game's zoom the strip read as a
    // path, and a swash half a tile long was too short to see roll in.
    bank: { width: 1.5, fade: 0.45, colours: [[-0.14, C(152, 130, 92)], [-0.45, C(184, 162, 118)], [-9, C(208, 188, 142)]] },
    ripple: 'lake', rippleAlpha: 0.85, shore: 'beach', reach: 0.72, cycleMs: 3800, jitter: 0.05, frames: 16,
  },
  ocean: {
    bands: [[0, C(150, 128, 88)], [0.3, C(122, 190, 176)], [0.9, C(86, 168, 182)], [1.9, C(58, 138, 172)],
      [3.4, C(42, 110, 160)], [5.5, C(32, 88, 142)], [Infinity, C(26, 72, 124)]],
    bank: { width: 2.2, fade: 0.55, colours: [[-0.16, C(150, 128, 90)], [-0.55, C(186, 166, 122)], [-9, C(214, 196, 150)]] },
    ripple: 'ocean', rippleAlpha: 0.9, shore: 'beach', reach: 1.1, cycleMs: 5200, jitter: 0.06, frames: 16,
  },
  river: {
    bands: [[0, C(98, 82, 58)], [0.3, C(92, 150, 134)], [0.9, C(70, 138, 146)], [1.8, C(54, 118, 142)], [Infinity, C(44, 100, 130)]],
    bank: { width: 0.42, fade: 0.22, colours: [[-0.12, C(88, 74, 52)], [-9, C(110, 92, 64)]] },
    ripple: 'lake', rippleAlpha: 0.55, shore: 'lap', flowSpeed: 34, jitter: 0.04, frames: 8, cycleMs: 2600,
  },
  rapids: {
    bands: [[0, C(98, 82, 58)], [0.3, C(140, 196, 186)], [0.9, C(104, 176, 180)], [Infinity, C(78, 154, 170)]],
    bank: { width: 0.42, fade: 0.22, colours: [[-0.12, C(84, 74, 60)], [-9, C(106, 96, 80)]] },
    ripple: 'lake', rippleAlpha: 0.75, shore: 'lap', flowSpeed: 92, jitter: 0.05, frames: 8, cycleMs: 1800,
  },
  pond: {
    bands: [[0, C(98, 84, 60)], [0.3, C(96, 160, 150)], [0.8, C(72, 146, 156)], [1.7, C(56, 124, 150)], [Infinity, C(46, 104, 138)]],
    bank: { width: 0.4, fade: 0.2, colours: [[-0.12, C(90, 76, 54)], [-9, C(112, 94, 66)]] },
    ripple: 'lake', rippleAlpha: 0.7, shore: 'lap', jitter: 0.04, frames: 8, cycleMs: 3000,
  },
  swamp: {
    bands: [[0, C(66, 58, 40)], [0.35, C(78, 92, 64)], [1.0, C(62, 80, 60)], [Infinity, C(48, 66, 54)]],
    bank: { width: 0.34, fade: 0.2, colours: [[-9, C(70, 60, 42)]] },
    ripple: 'lake', rippleAlpha: 0.3, shore: 'scum', jitter: 0.04, frames: 8, cycleMs: 4200,
  },
};
export function w393Palette(kind) { return W393_PALETTES[kind] || null; }

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
/** The ordered-dither threshold for a pixel, 0..1. */
export function w393Bayer(x, y) { return BAYER4[(y & 3) * 4 + (x & 3)]; }

/** A fixed per-pixel grain for one cell (64x32), 0..1 -- sand grain, foam breakup. */
export const W393_GRAIN = (() => {
  const g = new Float32Array(W393_CW * W393_CH);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < g.length; i++) {
    h ^= i + 0x9e3779b9; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    g[i] = (h >>> 8) / 16777216;
  }
  return g;
})();

/** Water colour at field value f (f >= 0, or the bank colour in the first band), dithered by `th`. */
export function w393WaterRgb(pal, f, th) {
  const b = pal.bands;
  let i = 0;
  while (i < b.length - 1 && f >= b[i][0]) i++;
  const D = 0.14;
  if (i > 0 && i < b.length) {
    const lo = b[i - 1][0];
    // The waterline itself (the step up from the bank colour) dithers over a
    // much narrower strip: a wide one reads as a dotted brown rim on the water.
    const d = i === 1 ? 0.04 : D;
    if (f - lo < d && th < 0.5 * (1 - (f - lo) / d)) return b[i - 1][1];
  }
  if (i < b.length - 1) {
    const hi = b[i][0];
    if (hi - f < D && th < 0.5 * (1 - (hi - f) / D)) return b[i + 1][1];
  }
  return b[i][1];
}

/** Bank colour at f <= 0 (dithered), and whether the pixel is drawn at all. */
export function w393BankRgb(pal, f, th, grain) {
  const bk = pal.bank;
  if (f < -bk.width) return null;
  // The inland edge dissolves into the grass over `fade`, one whole pixel at
  // a time -- coverage by ordered dither, never a soft alpha ramp.
  const inner = -bk.width + bk.fade;
  if (f < inner && th > (f + bk.width) / bk.fade) return null;
  const cs = bk.colours;
  let c = cs[cs.length - 1][1];
  for (let i = 0; i < cs.length; i++) {
    if (f >= cs[i][0]) { c = cs[i][1]; break; }
  }
  // grain: the odd darker or paler pixel, so sand reads as sand.
  if (grain > 0.94) return [c[0] - 22, c[1] - 22, c[2] - 20];
  if (grain < 0.05) return [c[0] + 14, c[1] + 13, c[2] + 10];
  return c;
}

// ---------------------------------------------------------------------------
// THE FIELD. Corners are quantised to eighths of a tile for the cell key:
// both tiles that share an edge share its two corners, so they agree along it
// exactly however the value was rounded.
// ---------------------------------------------------------------------------
export const W393_Q = 8;
export function w393Quant(v, lo = -3, hi = 6) {
  const q = Math.round(v * W393_Q);
  return Math.max(lo * W393_Q, Math.min(hi * W393_Q, q));
}

/**
 * The field at one tile's centre. `isWet(x, y)` says whether a tile counts as
 * water. Water: distance to the nearest dry tile centre, less half a tile, so
 * a tile on a straight shore reads 0.5 and the shared edge reads 0. Land: the
 * same, negative, toward the nearest water. Capped at R either way. Returns
 * { F, wx, wy } where (wx, wy) is the nearest water tile, for a land tile's
 * kind (a beach belongs to the water it faces).
 */
export function w393Measure(isWet, tx, ty, Rw = 6, Rl = 3) {
  const wet = isWet(tx, ty);
  const R = wet ? Rw : Rl;
  let best = R + 0.5, bx = -1, by = -1;
  for (let r = 1; r <= R; r++) {
    if (r - 0.0001 > best) break;   // nothing in this ring can beat what we have
    for (let dy = -r; dy <= r; dy++) {
      const edge = dy === -r || dy === r;
      for (let dx = -r; dx <= r; dx += edge ? 1 : 2 * r) {
        if (isWet(tx + dx, ty + dy) === wet) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < best) { best = d; bx = tx + dx; by = ty + dy; }
      }
    }
  }
  const F = Math.min(R, best - 0.5);
  return wet ? { F, wx: tx, wy: ty } : { F: -F, wx: bx, wy: by };
}

/**
 * One tile CORNER from the four tiles around it (each { F, wet, hard }): the
 * mean of their fields, except that a corner where water meets hard ground --
 * paving, a wall, a cliff -- is pinned to 0, so a quay keeps its straight
 * edge and only a natural bank is rounded.
 */
export function w393Corner(a, b, c, d) {
  const anyWet = a.wet || b.wet || c.wet || d.wet;
  if (anyWet && (a.hard || b.hard || c.hard || d.hard)) {
    const allWet = a.wet && b.wet && c.wet && d.wet;
    if (!allWet) return 0;
  }
  return (a.F + b.F + c.F + d.F) / 4;
}

/** Per-pixel (s, t) for every pixel inside the diamond, and its grain/dither. */
export const W393_PIX = (() => {
  const list = [];
  for (let y = 0; y < W393_CH; y++) {
    const [x0, x1] = W393_SPANS[y];
    for (let x = x0; x < x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const s = (px / 32 + py / 16 - 1) / 2, t = (py / 16 - px / 32 + 1) / 2;
      list.push({ x, y, s: Math.max(0, Math.min(1, s)), t: Math.max(0, Math.min(1, t)) });
    }
  }
  const n = list.length;
  return {
    n,
    x: Int16Array.from(list, p => p.x), y: Int16Array.from(list, p => p.y),
    s: Float32Array.from(list, p => p.s), t: Float32Array.from(list, p => p.t),
    th: Float32Array.from(list, p => w393Bayer(p.x, p.y)),
    grain: Float32Array.from(list, p => W393_GRAIN[p.y * W393_CW + p.x]),
  };
})();

/**
 * ROUND 393 -- THE SEAM GUTTER. The game samples textures LINEARLY (main.js,
 * round 146) at a zoom near 2, so the last texel of a diamond is blended with
 * the transparent texel beside it: every tile edge came out half-transparent
 * and the camera's dark background showed through as a diamond grid laid over
 * the water (it was there under the old tiles as well). Each pixel of the cell
 * rectangle just OUTSIDE the footprint (8-neighbour ring) takes the colour of
 * the nearest footprint pixel, when that pixel is opaque -- so the edge samples
 * opaque colour and neighbouring tiles meet without a line. Semi-transparent
 * pixels (the swash, the sand's dissolve) are not spread: two overlapping
 * half-alpha strips would draw a brighter line instead of a darker one.
 */
export const W393_GUTTER = (() => {
  const inside = new Int32Array(W393_CW * W393_CH).fill(-1);
  for (let i = 0; i < W393_PIX.n; i++) inside[W393_PIX.y[i] * W393_CW + W393_PIX.x[i]] = i;
  const dst = [], src = [];
  for (let y = 0; y < W393_CH; y++) for (let x = 0; x < W393_CW; x++) {
    if (inside[y * W393_CW + x] >= 0) continue;
    let best = -1, bd = 9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W393_CW || yy >= W393_CH) continue;
      const j = inside[yy * W393_CW + xx];
      const d = dx * dx + dy * dy;
      if (j >= 0 && d < bd) { bd = d; best = j; }
    }
    if (best >= 0) { dst.push(y * W393_CW + x); src.push(best); }
  }
  return { dst: Int32Array.from(dst), src: Int32Array.from(src) };
})();

/** Fill the gutter ring of one baked cell from its opaque edge pixels. */
export function w393FillGutter(out, off, stride, keep = null) {
  const G = W393_GUTTER, P = W393_PIX;
  for (let k = 0; k < G.dst.length; k++) {
    const i = G.src[k];
    if (keep && !keep(i)) continue;
    const so = off + P.y[i] * stride + P.x[i] * 4;
    if (out[so + 3] !== 255) continue;
    const d = G.dst[k], dx = d % W393_CW, dy = (d - dx) / W393_CW;
    const o = off + dy * stride + dx * 4;
    if (out[o + 3]) continue;
    out[o] = out[so]; out[o + 1] = out[so + 1]; out[o + 2] = out[so + 2]; out[o + 3] = 255;
  }
}

function fieldAt(c, i) {
  const s = W393_PIX.s[i], t = W393_PIX.t[i];
  return c[0] * (1 - s) * (1 - t) + c[1] * s * (1 - t) + c[2] * (1 - s) * t + c[3] * s * t;
}

/**
 * Bake one STATIC cell into `out` (RGBA, row stride `stride` bytes, top-left at
 * byte `off`). `corners` = [NW(top), NE(right), SW(left), SE(bottom)] field
 * values. `layer`: 'water' fills the whole diamond (the water tile's own
 * ground image), 'land' draws only water-or-bank pixels over a land tile.
 */
export function w393BakeStatic(out, off, stride, pal, corners, layer) {
  const P = W393_PIX;
  let drawn = 0;
  for (let i = 0; i < P.n; i++) {
    const f = fieldAt(corners, i);
    let rgb;
    if (f > 0) rgb = w393WaterRgb(pal, f, P.th[i]);
    else {
      rgb = w393BankRgb(pal, f, P.th[i], P.grain[i]);
      // A water tile is opaque everywhere: where its rounded corner is bank,
      // the bank's colour carries on past its own fade.
      if (!rgb && layer === 'water') rgb = pal.bank.colours[pal.bank.colours.length - 1][1];
    }
    if (!rgb) continue;
    const o = off + P.y[i] * stride + P.x[i] * 4;
    out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; out[o + 3] = 255;
    drawn++;
  }
  // ROUND 393 -- no grid line between tiles (see W393_GUTTER). On a land cell only where the sand is solid: in
  // its dithered dissolve a spread pixel would draw the diamond's outline into the grass.
  const solid = -pal.bank.width + pal.bank.fade;
  if (drawn) w393FillGutter(out, off, stride, layer === 'land' ? (i) => fieldAt(corners, i) >= solid : null);
  return drawn;
}

// ---------------------------------------------------------------------------
// THE SHORE, ANIMATED. A table per palette: for each frame of the loop and
// each field value (1/64 tile steps over W393_LUT_MIN..MAX), one RGBA. Baking
// an animated cell is then a lookup per pixel.
// ---------------------------------------------------------------------------
export const W393_SHORE_FRAMES = 16;   // the most any palette uses; a bank's lapping needs only `frames: 8`
/** Shore cells are keyed on corners rounded to quarter tiles (statics use eighths): the swash is jittered by a
 *  few hundredths anyway, and it halves the shapes a curving coast needs. */
export const W393_SHORE_Q = 4;
export const W393_LUT_MIN = -2.5, W393_LUT_MAX = 1.5, W393_LUT_STEP = 64;
const LUT_N = Math.round((W393_LUT_MAX - W393_LUT_MIN) * W393_LUT_STEP) + 1;

/** Where the swash front stands at loop phase p (a field value: negative is up the sand). */
export function w393SwashFront(p, reach) {
  const SET = 0.14;            // the backwash drains a little below the waterline
  const UP = 0.38;             // fraction of the loop spent running up
  if (p < UP) {
    const u = p / UP;
    return SET - (SET + reach) * (1 - (1 - u) * (1 - u));
  }
  const u = (p - UP) / (1 - UP);
  const e = u * u * (3 - 2 * u);
  return -reach + (SET + reach) * e;
}
/** The incoming breaker, out in the shallows before it reaches the sand. */
export function w393Breaker(p) {
  if (p < 0.72) return null;
  return 0.95 * (1 - (p - 0.72) / 0.28) + 0.14;
}

function mixA(dst, rgb, a) {
  // Composite (rgb, a) OVER the straight-alpha dst [r,g,b,a 0..1].
  const oa = a + dst[3] * (1 - a);
  if (oa <= 0) return;
  for (let k = 0; k < 3; k++) dst[k] = (rgb[k] * a + dst[k] * dst[3] * (1 - a)) / oa;
  dst[3] = oa;
}

const FOAM = [244, 250, 246], FILM = [168, 222, 220], WET = [92, 72, 44], LAP = [214, 240, 236], SCUM = [120, 128, 84];

/** One shore pixel: field f, loop phase p, for palette `pal`. RGBA 0..255 or null. */
export function w393ShorePixel(pal, f, p) {
  const px = [0, 0, 0, 0];
  if (pal.shore === 'beach') {
    const reach = pal.reach;
    const front = w393SwashFront(p, reach);
    const running = p < 0.38;
    // Wet sand behind the retreating water: how long since the swash last
    // covered this point, measured back round the loop.
    if (f <= 0.2 && f >= -reach - 0.02 && f < front) {
      let since = 1;
      for (let k = 1; k <= 48; k++) {
        const q = p - k / 48;
        if (w393SwashFront(((q % 1) + 1) % 1, reach) <= f) { since = k / 48; break; }
      }
      const wet = Math.exp(-since / 0.32);
      if (wet > 0.04) mixA(px, WET, 0.5 * wet);
    }
    // The receding water exposes the first strip of wet sand below the line.
    if (f > 0 && f < front) mixA(px, [146, 124, 86], 0.85);
    // The sheet of water running up the sand.
    if (f <= 0 && f >= front) {
      const depth = Math.min(1, (f - front) / 0.35);
      mixA(px, FILM, (running ? 0.56 : 0.4) + 0.25 * depth);
    }
    // The foam lip at the front: bright and solid running up, thin and
    // broken draining back.
    // ROUND 393 -- a little wider than first drawn (0.075 / 0.045): at the game's zoom the lip was a hairline.
    const lipW = running ? 0.11 : 0.06;
    if (f >= front && f - front < lipW && front < 0.12) mixA(px, FOAM, running ? 0.95 : 0.7);
    // Bubbles left behind the lip.
    if (f >= front + lipW && f - front < lipW + 0.11 && front < 0.1) {
      const wob = Math.sin((f - front) * 90 + p * 40);
      if (wob > 0.55) mixA(px, FOAM, 0.5);
    }
    // The breaker out in the shallows, rolling in.
    const br = w393Breaker(p);
    // A soft band rather than a line: the stagger between neighbouring tiles
    // would cut a thin bright line into tile-long dashes.
    if (br !== null && f > 0 && f >= br - 0.03 && f - br < 0.12) mixA(px, [206, 240, 236], f - br < 0.03 ? 0.34 : 0.2);
  } else if (pal.shore === 'lap') {
    // Water lapping a bank: a thin bright line that breathes on and off the
    // mud, and a fainter second line just off it.
    const w = 0.03 + 0.05 * (0.5 + 0.5 * Math.sin(p * Math.PI * 2));
    if (f >= -0.02 && f < w) mixA(px, LAP, 0.6);
    const ring = 0.16 + 0.07 * Math.sin(p * Math.PI * 2 + 1.3);
    if (f > 0 && Math.abs(f - ring) < 0.025) mixA(px, LAP, 0.32);
  } else if (pal.shore === 'scum') {
    if (f >= -0.02 && f < 0.07) mixA(px, SCUM, 0.45 + 0.15 * Math.sin(p * Math.PI * 2));
  }
  if (px[3] <= 0.01) return null;
  return [Math.round(px[0]), Math.round(px[1]), Math.round(px[2]), Math.round(px[3] * 255)];
}

/** The table for one palette: Uint8ClampedArray(frames * LUT_N * 4). */
export function w393ShoreLut(pal, frames = W393_SHORE_FRAMES) {
  const lut = new Uint8ClampedArray(frames * LUT_N * 4);
  for (let fr = 0; fr < frames; fr++) {
    const p = fr / frames;
    for (let i = 0; i < LUT_N; i++) {
      const f = W393_LUT_MIN + i / W393_LUT_STEP;
      const c = w393ShorePixel(pal, f, p);
      if (!c) continue;
      const o = (fr * LUT_N + i) * 4;
      lut[o] = c[0]; lut[o + 1] = c[1]; lut[o + 2] = c[2]; lut[o + 3] = c[3];
    }
  }
  return lut;
}

/** Bake one animated shore cell from the table. Returns the pixels drawn. */
export function w393BakeShore(out, off, stride, lut, frame, corners, jitter = 0.05) {
  const P = W393_PIX;
  let drawn = 0;
  const base = frame * LUT_N;
  for (let i = 0; i < P.n; i++) {
    const f = fieldAt(corners, i) + (P.grain[i] - 0.5) * jitter;
    let k = Math.round((f - W393_LUT_MIN) * W393_LUT_STEP);
    if (k < 0 || k >= LUT_N) continue;
    const li = (base + k) * 4;
    if (!lut[li + 3]) continue;
    const o = off + P.y[i] * stride + P.x[i] * 4;
    out[o] = lut[li]; out[o + 1] = lut[li + 1]; out[o + 2] = lut[li + 2]; out[o + 3] = lut[li + 3];
    drawn++;
  }
  return drawn;
}

/** Does this cell's corner set reach the shore band at all (worth an animated layer)? */
export function w393TouchesShore(pal, corners) {
  const mn = Math.min(corners[0], corners[1], corners[2], corners[3]);
  const mx = Math.max(corners[0], corners[1], corners[2], corners[3]);
  const lo = pal.shore === 'beach' ? -pal.reach - 0.1 : -0.1;
  const hi = pal.shore === 'beach' ? 1.15 : 0.3;
  return mx >= lo && mn <= hi;
}

/**
 * "small waves that roll up the sand and recede on a loop ... staggered along
 * the shore so it isn't in lockstep." The phase drifts slowly along the coast,
 * well under a frame per tile, so neighbouring tiles break almost together
 * and the set travels along the beach as a wave does coming in at an angle.
 */
export function w393ShorePhase(tx, ty) {
  const a = 0.047 * (tx + 0.63 * ty);
  const n = Math.sin(tx * 0.071 + ty * 0.113) * 0.21 + Math.sin(tx * 0.029 - ty * 0.047 + 1.7) * 0.17;
  const v = a + n;
  return v - Math.floor(v);
}

/** Per-corner alpha for a surface sprite, from the diamond's four vertex
 *  alphas [top, right, left, bottom] to the quad's [TL, TR, BL, BR]: the
 *  least-squares fit of a bilinear quad to the diamond, exact whenever
 *  top + bottom == left + right. */
export function w393QuadAlpha(aTop, aRight, aLeft, aBottom) {
  const m = (aTop + aRight + aLeft + aBottom) / 4;
  const c = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  return [c(aTop + aLeft - m), c(aTop + aRight - m), c(aLeft + aBottom - m), c(aRight + aBottom - m)];
}

// ---------------------------------------------------------------------------
// LIGHT. The surface catches whatever is lighting the world: white sun at
// noon, gold at the ends of the day, a cold blue moon at night. Read off the
// same clock `_updateDayNight` runs (sunrise ~05:00, sunset ~22:00).
// ---------------------------------------------------------------------------
const SKY = [
  [0, [150, 172, 236]], [4.5, [150, 172, 236]], [5.5, [255, 190, 170]], [7, [255, 236, 214]],
  [9, [255, 255, 255]], [18, [255, 255, 255]], [20.5, [255, 214, 150]], [22, [240, 170, 140]],
  [22.6, [150, 172, 236]], [24, [150, 172, 236]],
];
export function w393SkyRgb(hours) {
  const h = ((hours % 24) + 24) % 24;
  for (let i = 0; i < SKY.length - 1; i++) {
    const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1];
    if (h >= h0 && h <= h1) {
      const u = h1 > h0 ? (h - h0) / (h1 - h0) : 0;
      return [0, 1, 2].map(k => Math.round(c0[k] + (c1[k] - c0[k]) * u));
    }
  }
  return [255, 255, 255];
}
export function w393RgbInt(c) { return ((c[0] & 255) << 16) | ((c[1] & 255) << 8) | (c[2] & 255); }

/** How many glints the visible water shows, 0..1, from the hour: most with a high sun, a few under the moon. */
export function w393GlintDensity(hours, darkness) {
  const h = ((hours % 24) + 24) % 24;
  const sun = h > 5 && h < 22 ? Math.sin(Math.PI * (h - 5) / 17) : 0;
  return Math.max(0.18 * darkness, 0.25 + 0.75 * sun * (1 - darkness));
}

// ---------------------------------------------------------------------------
// ROUND 393 -- THE SHORE, CONTINUOUS (WebGL). Lead's note on the first in-game
// look: "the shore still reads as tiles ... the pale shallow band, the
// wet-sand band and the foam all follow the diamond staircase ... make the
// shore continuous." The baked shore cell above is one frame per TILE, and the
// stagger that keeps the waves out of lockstep put each tile at its own frame
// -- so every tile drew its own lozenge of swash. On WebGL the whole shore band
// is now one fragment shader over the screen:
//
//   * the field comes from a small texture of per-tile field values around
//     the camera (64 x 64 tiles, rebuilt when the camera has moved a few
//     tiles, never per frame), sampled with a cubic B-spline -- a smoothed,
//     per-pixel distance to the shore, so the waterline is a curve and not a
//     staircase;
//   * the phase of the swash is a smooth function of WORLD position, so the
//     set rolls along the beach continuously instead of tile by tile;
//   * it paints the whole band from the wet sand to the shallows (opaque, in
//     the palette's own colours, fading out through an ordered dither into the
//     baked sand and water either side), so the baked cells' waterline is never
//     seen under it;
//   * it is evaluated per ART pixel (iso pixel), with a 4x4 Bayer dither, so it
//     reads as pixel art beside the baked tiles.
//
// The texture's G channel is the MODE of a tile (read at the tile's centre,
// nearest): 0 nothing (lava, paving, docks, bridges, raised ground, interiors
// -- the baked shore still covers raised water), then the shore styles below.
// ---------------------------------------------------------------------------
export const W393_FIELD_N = 64;
export const W393_MODE = { none: 0, lap: 51, scum: 102, lake: 170, ocean: 255 };
/** Field value -> the texture's red channel (8 bits over -3..3 tiles). */
export function w393FieldByte(f) { return Math.round((Math.max(-3, Math.min(3, f)) + 3) / 6 * 255); }

const glc = (c) => `vec3(${(c[0] / 255).toFixed(4)}, ${(c[1] / 255).toFixed(4)}, ${(c[2] / 255).toFixed(4)})`;
const glf = (v) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

/** The fragment source for the shore shader (Phaser 4 Shader game object). */
export function w393ShoreFrag() {
  const beach = (name, pal) => {
    const bk = pal.bank.colours;
    return `
    if (${name}) {
      reach = ${glf(pal.reach)}; cycle = ${glf(pal.cycleMs / 1000)};
      wetC = ${glc(bk[0][1])}; midC = ${glc(bk[1][1])}; dryC = ${glc(bk[bk.length - 1][1])};
      wetB = ${glf(bk[0][0])}; midB = ${glf(bk[1][0])};
      shallowC = ${glc(pal.bands[1][1])}; nextC = ${glc(pal.bands[2][1])}; nextB = ${glf(pal.bands[1][0])};
    }`;
  };
  return `#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uField;
uniform vec4 uQuad;     // iso-space left, top, width, height of the quad
uniform vec3 uFieldO;   // field origin (tile x, tile y) and its size N
uniform float uTime;    // seconds
uniform vec3 uSky;      // the light on the water
varying vec2 outTexCoord;

float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float hash(vec2 p) { return fract(43757.5453 * sin(dot(p, vec2(12.9898, 78.233)))); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
vec2 fUV(vec2 c) { return (c + 0.5) / uFieldO.z; }
float fAt(vec2 c) { return texture2D(uField, fUV(c)).r * 6.0 - 3.0; }
// Cubic B-spline over the per-tile field: four bilinear taps. Smooth (C2), so
// the waterline is a curve through the tile grid instead of its staircase.
float field(vec2 g) {
  vec2 t = g - uFieldO.xy - 0.5;
  vec2 i = floor(t), f = t - i;
  vec2 f2 = f * f, f3 = f2 * f;
  vec2 w0 = (1.0 - 3.0 * f + 3.0 * f2 - f3) / 6.0;
  vec2 w1 = (4.0 - 6.0 * f2 + 3.0 * f3) / 6.0;
  vec2 w2 = (1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3) / 6.0;
  vec2 w3 = f3 / 6.0;
  vec2 s0 = w0 + w1, s1 = w2 + w3;
  vec2 h0 = i - 1.0 + w1 / s0, h1 = i + 1.0 + w3 / s1;
  return s0.y * (s0.x * fAt(h0) + s1.x * fAt(vec2(h1.x, h0.y)))
       + s1.y * (s0.x * fAt(vec2(h0.x, h1.y)) + s1.x * fAt(h1));
}
const float SET = 0.14;
const float UP = 0.38;
float front(float p, float reach) {
  if (p < UP) { float u = p / UP; return SET - (SET + reach) * (1.0 - (1.0 - u) * (1.0 - u)); }
  float u = (p - UP) / (1.0 - UP);
  return -reach + (SET + reach) * (u * u * (3.0 - 2.0 * u));
}
void over(inout vec4 d, vec3 c, float a) {
  float oa = a + d.a * (1.0 - a);
  if (oa <= 0.0) return;
  d.rgb = (c * a + d.rgb * d.a * (1.0 - a)) / oa;
  d.a = oa;
}
void main() {
  vec2 iso = vec2(uQuad.x + outTexCoord.x * uQuad.z, uQuad.y + (1.0 - outTexCoord.y) * uQuad.w);
  vec2 ip = floor(iso) + 0.5;                       // one art pixel
  vec2 g = vec2(ip.x / 64.0 + ip.y / 32.0, ip.y / 32.0 - ip.x / 64.0);
  vec2 cell = floor(g) - uFieldO.xy;
  if (cell.x < 2.0 || cell.y < 2.0 || cell.x > uFieldO.z - 3.0 || cell.y > uFieldO.z - 3.0) discard;
  float mode = texture2D(uField, fUV(cell)).g;
  if (mode < 0.1) discard;
  float th = bayer4(ip);
  float f = field(g) + (vnoise(ip * vec2(0.18, 0.36)) - 0.5) * 0.09 + (hash(ip) - 0.5) * 0.035;
  float phi = 0.047 * (g.x + 0.63 * g.y) + 0.21 * sin(g.x * 0.071 + g.y * 0.113) + 0.17 * sin(g.x * 0.029 - g.y * 0.047 + 1.7);
  vec4 d = vec4(0.0);
  if (mode > 0.5) {
    float reach = 0.7, cycle = 4.0, wetB = -0.14, midB = -0.45, nextB = 0.28;
    vec3 wetC = vec3(0.6), midC = vec3(0.7), dryC = vec3(0.8), shallowC = vec3(0.5), nextC = vec3(0.4);
    ${beach('mode > 0.85', W393_PALETTES.ocean)}
    ${beach('mode <= 0.85', W393_PALETTES.lake)}
    float p = fract(uTime / cycle + phi);
    bool running = p < UP;
    float fr = front(p, reach);
    // The band itself, opaque, dissolving into the baked sand and water.
    float lo = -reach - 0.12, hi = 0.5;
    float cover = f < 0.0 ? clamp((f - lo + 0.14) / 0.14, 0.0, 1.0) : clamp((hi - f) / 0.2, 0.0, 1.0);
    if (th < cover) {
      vec3 base = f > 0.0 ? (f > nextB && th < (f - nextB) / 0.2 ? nextC : shallowC)
                          : (f > wetB ? wetC : (f > midB ? midC : dryC));
      over(d, base, 1.0);
    }
    // Wet sand behind the water that just drained off it.
    if (f <= 0.2 && f >= -reach - 0.02 && f < fr) {
      float e = clamp((f + reach) / (SET + reach), 0.0, 1.0);
      float uu = 0.5 - sin(asin(1.0 - 2.0 * e) / 3.0);
      float pu = UP + uu * (1.0 - UP);
      float since = fract(p - pu + 1.0);
      float wet = exp(-since / 0.32);
      if (wet > 0.04) over(d, vec3(0.361, 0.282, 0.173), 0.5 * wet);
    }
    if (f > 0.0 && f < fr) over(d, vec3(0.573, 0.486, 0.337), 0.85);
    if (f <= 0.0 && f >= fr) {
      float dep = min(1.0, (f - fr) / 0.35);
      over(d, vec3(0.659, 0.871, 0.863), (running ? 0.56 : 0.4) + 0.25 * dep);
    }
    float lipW = running ? 0.11 : 0.06;
    if (f >= fr && f - fr < lipW && fr < 0.12) over(d, vec3(0.957, 0.98, 0.965), running ? 0.95 : 0.7);
    if (f >= fr + lipW && f - fr < lipW + 0.11 && fr < 0.1 && hash(ip + floor(p * 16.0)) > 0.55) over(d, vec3(0.957, 0.98, 0.965), 0.5);
    if (p > 0.72 && f > 0.0) {
      float br = 0.95 * (1.0 - (p - 0.72) / 0.28) + 0.14;
      if (f >= br - 0.03 && f - br < 0.12) over(d, vec3(0.808, 0.941, 0.925), f - br < 0.03 ? 0.34 : 0.2);
    }
  } else {
    // A bank: a bright line that breathes on and off the mud (rivers, ponds),
    // or a band of scum (the marsh).
    float p = fract(uTime / ${glf(W393_PALETTES.river.cycleMs / 1000)} + phi * 0.6);
    float s = sin(p * 6.2831853);
    if (mode > 0.3) {
      if (f >= -0.02 && f < 0.07) over(d, vec3(0.47, 0.502, 0.329), 0.45 + 0.15 * s);
    } else {
      float w = 0.03 + 0.05 * (0.5 + 0.5 * s);
      if (f >= -0.02 && f < w) over(d, vec3(0.839, 0.941, 0.925), 0.6);
      float ring = 0.16 + 0.07 * sin(p * 6.2831853 + 1.3);
      if (f > 0.0 && abs(f - ring) < 0.025) over(d, vec3(0.839, 0.941, 0.925), 0.32);
    }
  }
  if (d.a <= 0.004) discard;
  d.rgb *= uSky;
  gl_FragColor = vec4(d.rgb * d.a, d.a);
}
`;
}
/** Sanity of the tables, for the suite: every kind with a palette, bands rising. */
export function w393Faults() {
  const out = [];
  for (const [k, pal] of Object.entries(W393_PALETTES)) {
    for (let i = 1; i < pal.bands.length; i++) if (!(pal.bands[i][0] > pal.bands[i - 1][0])) out.push(`${k}: bands not rising at ${i}`);
    if (!(pal.bank.width > pal.bank.fade)) out.push(`${k}: bank fade wider than the bank`);
    if (!W393_SHEETS[pal.ripple]) out.push(`${k}: ripple sheet ${pal.ripple} missing`);
    if (!(pal.frames >= 4 && pal.frames <= W393_SHORE_FRAMES)) out.push(`${k}: shore frames ${pal.frames} out of range`);
    if (!(pal.cycleMs > 500)) out.push(`${k}: no shore cycle`);
  }
  for (const k of W393_BEACH_KINDS) if (W393_PALETTES[k].shore !== 'beach') out.push(`${k}: beach kind without a beach shore`);
  if (W393_SPANS.length !== W393_CH) out.push('spans: not one per row');
  return out;
}
