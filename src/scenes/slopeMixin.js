// ============================================================================
// ROUND 310 -- THE SLOPE OF THE NEK, built into the world.
//
// src/data/elevation.js owns the shape (`planSlopeAxis`) and the height
// field's `slope`. This file is the scene's half: where Cadence's level band
// is, what a step must avoid, the ways across every step (ramps, stairs, and
// a ramp wherever a road crosses), the waterfalls where a river crosses one,
// and clearing the trees off the ways so nobody is walled in by a wood.
//
//   _buildNekSlope(field, occupied, N)   called by _buildElevation
//   _canClimbVines()                     the vine gate (src/data/climbing.js)
// ============================================================================
import { TILE } from '../data/iso.js';
import { planSlopeAxis, elevRng, RAMP_LEN } from '../data/elevation.js';
import { REGION_BY_ID, REGION_TILES } from '../data/regions.js';
import { isWaterTile, isRoadTile } from '../data/town.js';
import { canClimbVines, CLIMB_KINDS } from '../data/climbing.js';

// Cadence's level band is the city's rectangle and this much more on each side.
const BAND_MARGIN = 40;
// The longest a step may be slid to find a quieter line, in tiles.
const STEP_SHIFT = 110;
// One way across a step about every this many tiles of its length.
const WAY_SPACING = 56;
const WAY_WIDTH = 3;
const STAIR_LEN = 2;

export const SlopeMixin = {
  /** Does this player carry a climbing essence or stone? */
  _canClimbVines() {
    return canClimbVines(this.player);
  },

  /** "Vines -- you need Monkey..." once in a while, when vines stopped you. */
  _elevNoteVines(x0, y0, x1, y1) {
    const f = this._elev;
    if (!f || !f.climbs.size || !this.time || this.time.now < (this._vineHintAt || 0)) return;
    const T = f.T;
    const a = Math.floor(y0 / T) * f.N + Math.floor(x0 / T), b = Math.floor(y1 / T) * f.N + Math.floor(x1 / T);
    if (a === b || f.climbs.get(`${a}|${b}`) !== 'vines' || this._canClimbVines()) return;
    this._vineHintAt = this.time.now + 5000;
    if (this._floatText) this._floatText(x0, y0 - 44, 'Vines -- you need a climbing essence or stone (Monkey, Bear, Claw, Ape, Hand, Adept...)', '#c5e1a5');
  },

  /** The Nek's slope. Returns a report of what was built. */
  _buildNekSlope(field, occupied, N) {
    const reg = REGION_BY_ID.nek;
    if (!reg) return null;
    const R = REGION_TILES;
    const ox = reg.col * R, oy = reg.row * R;
    const city = (reg.settlements || []).find(s => s.id === 'nek_city');
    const cb = city ? city.bounds : { x0: -191, x1: 251, y0: -101, y1: 164 };
    const cx = city ? city.at.tx : 754, cy = city ? city.at.ty : 1024;
    const band = { x0: cx + cb.x0 - BAND_MARGIN, x1: cx + cb.x1 + BAND_MARGIN, y0: cy + cb.y0 - BAND_MARGIN, y1: cy + cb.y1 + BAND_MARGIN };
    const T = this.tileType, solid = this._solidTiles;

    // ----- what a step wants to stay off, priced per tile column / row -----
    const bad = (k) => occupied.has(k) || (solid && solid.has(k));
    const tilePrice = (k) => {
      let c = 0;
      if (bad(k)) c += 3;
      const t = T[k];
      if (isWaterTile(t)) c += 3; else if (isRoadTile(t)) c += 0.5;
      return c;
    };
    const colMemo = new Map(), rowMemo = new Map();
    const colPrice = (x) => {
      if (colMemo.has(x)) return colMemo.get(x);
      let c = 0;
      for (let y = 0; y < R; y++) c += tilePrice((oy + y) * N + ox + x);
      colMemo.set(x, c); return c;
    };
    const rowPrice = (y) => {
      if (rowMemo.has(y)) return rowMemo.get(y);
      let c = 0;
      for (let x = 0; x < R; x++) c += tilePrice((oy + y) * N + ox + x);
      rowMemo.set(y, c); return c;
    };
    // A step between tile p-1 and tile p is priced by both columns.
    const xs = planSlopeAxis(R, band.x0, band.x1, (p) => colPrice(p - 1) + colPrice(p), { shift: STEP_SHIFT });
    const ys = planSlopeAxis(R, band.y0, band.y1, (p) => rowPrice(p - 1) + rowPrice(p), { shift: STEP_SHIFT });
    field.setSlope({ x0: ox, y0: oy, w: R, h: R, ax: xs.levels, ay: ys.levels });

    // ----- the ways across ------------------------------------------------
    const rand = elevRng('slope|nek');
    const ways = [];                  // {axis, x, y, w, h, dir, hi, lo, style}
    const footprint = new Set();      // tile indices a way and its approach cover
    const walkable = (tx, ty) => {
      if (tx < ox + 2 || ty < oy + 2 || tx > ox + R - 3 || ty > oy + R - 3) return false;
      const k = ty * N + tx;
      if (isWaterTile(T[k])) return false;
      if (solid && solid.has(k)) return false;
      return true;
    };
    // Open ground for a way: not water, not solid, not near a placed thing
    // (a road tile is fine even when a house is near it: roads are the point).
    const openForWay = (tx, ty) => walkable(tx, ty) && (!occupied.has(ty * N + tx) || isRoadTile(T[ty * N + tx]));
    const rectOpen = (x0, y0, x1, y1) => {
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (!openForWay(tx, ty)) return false;
      return true;
    };
    const taken = (x0, y0, x1, y1) => {
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (footprint.has(ty * N + tx)) return true;
      return false;
    };
    const addWay = (axis, pos, along, w, len, style) => {
      // `pos` is the step's tile, `along` the first tile along the step.
      // An x-step at X: hi at X-1, ramp covers X..X+len-1 (dir E).
      // A y-step at Y: hi at Y-1, ramp covers Y..Y+len-1 (dir S).
      const x = axis === 'x' ? pos : along, y = axis === 'x' ? along : pos;
      const rw = axis === 'x' ? len : w, rh = axis === 'x' ? w : len;
      const hi = field.levelAt(axis === 'x' ? x - 1 : x, axis === 'x' ? y : y - 1);
      const lo = field.levelAt(x + (axis === 'x' ? len : 0), y + (axis === 'y' ? len : 0));
      if (hi - lo !== 1) return false;
      // The way, a tile of landing beyond it and a tile of approach behind it.
      const bx0 = axis === 'x' ? x - 2 : x - 1, by0 = axis === 'y' ? y - 2 : y - 1;
      const bx1 = x + rw - 1 + (axis === 'x' ? 1 : 1), by1 = y + rh - 1 + (axis === 'y' ? 1 : 1);
      if (!rectOpen(bx0, by0, bx1, by1) || taken(bx0, by0, bx1, by1)) return false;
      field.addRamp(x, y, rw, rh, axis === 'x' ? 'E' : 'S', hi, lo, style);
      for (let ty = by0; ty <= by1; ty++) for (let tx = bx0; tx <= bx1; tx++) footprint.add(ty * N + tx);
      ways.push({ axis, pos, u: along, x, y, w: rw, h: rh, dir: axis === 'x' ? 'E' : 'S', hi, lo, style });
      return true;
    };
    const stepLines = [
      ...xs.ups.concat(xs.downs).map(p => ({ axis: 'x', pos: ox + p })),
      ...ys.ups.concat(ys.downs).map(p => ({ axis: 'y', pos: oy + p })),
    ];
    let roadWays = 0, openWays = 0, stairWays = 0;
    for (const line of stepLines) {
      const isX = line.axis === 'x';
      const tileAt = (u) => isX ? [line.pos, u] : [u, line.pos];
      const prevAt = (u) => isX ? [line.pos - 1, u] : [u, line.pos - 1];
      // First the roads: wherever one crosses the step, its way is a ramp
      // over it, as wide as the road.
      let u = oy < 0 ? 0 : (isX ? oy : ox) + 4;
      const lo0 = (isX ? oy : ox) + 4, hi0 = (isX ? oy : ox) + R - 8;
      u = lo0;
      const lastWayAt = [];
      while (u < hi0) {
        const [ax, ay] = tileAt(u), [bx, by] = prevAt(u);
        const road = isRoadTile(T[ay * N + ax]) || isRoadTile(T[by * N + bx]);
        if (!road) { u++; continue; }
        let v = u;
        while (v < hi0) {
          const [cx2, cy2] = tileAt(v), [dx2, dy2] = prevAt(v);
          if (!(isRoadTile(T[cy2 * N + cx2]) || isRoadTile(T[dy2 * N + dx2]))) break;
          v++;
        }
        const run = v - u;
        const w = Math.max(3, Math.min(6, run));
        const start = Math.round((u + v) / 2 - w / 2);
        let ok = false;
        for (const off of [0, -2, 2, -4, 4, -6, 6]) {
          if (addWay(line.axis, line.pos, start + off, w, RAMP_LEN, 'ramp')) { ok = true; break; }
        }
        if (ok) { roadWays++; lastWayAt.push(start); }
        u = v + 4;
      }
      // Then, along the rest of the step, a way about every WAY_SPACING tiles.
      for (let t = lo0 + 20; t < hi0; t += WAY_SPACING) {
        const aim = t + Math.floor((rand() - 0.5) * 20);
        if (lastWayAt.some(a => Math.abs(a - aim) < WAY_SPACING * 0.6)) continue;
        const stairs = rand() < 0.3;
        let placed = false;
        for (const off of [0, 6, -6, 12, -12, 20, -20, 30, -30]) {
          const s = aim + off;
          if (s < lo0 || s > hi0) continue;
          if (stairs ? addWay(line.axis, line.pos, s, WAY_WIDTH + 1, STAIR_LEN, 'stairs')
            : addWay(line.axis, line.pos, s, WAY_WIDTH, RAMP_LEN, 'ramp')) { placed = true; if (stairs) stairWays++; else openWays++; break; }
        }
        if (placed) lastWayAt.push(aim);
      }
    }

    // ----- every cell reaches its neighbour: a way in each stretch of every step
    // between the steps that cross it (the corners and the narrow terraces
    // are where the spaced ways above can miss).
    let mended = 0, unmended = 0;
    for (const line of stepLines) {
      const isX = line.axis === 'x';
      const lo0 = (isX ? oy : ox) + 4, hi0 = (isX ? oy : ox) + R - 6;
      const cuts = (isX ? ys : xs).ups.concat((isX ? ys : xs).downs).map(p => p + (isX ? oy : ox)).sort((a, b) => a - b);
      const edges = [lo0 - 4].concat(cuts, [hi0 + 6]);
      for (let i = 0; i + 1 < edges.length; i++) {
        const a = edges[i], b = edges[i + 1];
        if (b - a < 4) continue;
        if (ways.some(w => w.axis === line.axis && w.pos === line.pos && w.u >= a - 3 && w.u < b)) continue;
        // Walk outward from the middle of the stretch, narrowest last.
        const mid = Math.round((a + b) / 2);
        let done = false;
        for (const [wd, len, style] of [[3, RAMP_LEN, 'ramp'], [4, STAIR_LEN, 'stairs'], [2, RAMP_LEN, 'ramp'], [2, STAIR_LEN, 'stairs']]) {
          for (let off = 0; off <= (b - a) / 2 && !done; off++) {
            for (const sgn of (off ? [1, -1] : [1])) {
              const st = mid + sgn * off - (wd >> 1);
              if (st < Math.max(lo0, a) || st + wd > Math.min(hi0 + 4, b)) continue;
              if (addWay(line.axis, line.pos, st, wd, len, style)) { done = true; break; }
            }
          }
          if (done) break;
        }
        if (done) mended++; else unmended++;
      }
    }

    // ----- the waterfalls: water at the top of a step with a lower neighbour ---
    const falls = [];
    for (const line of stepLines) {
      const isX = line.axis === 'x';
      for (let u = (isX ? oy : ox); u < (isX ? oy : ox) + R; u++) {
        const tx = isX ? line.pos - 1 : u, ty = isX ? u : line.pos - 1;
        if (!isWaterTile(T[ty * N + tx])) continue;
        const nx = isX ? tx + 1 : tx, ny = isX ? ty : ty + 1;
        if (field.isRamp(tx, ty) || field.isRamp(nx, ny)) continue;
        const d = field.tileHeight(tx, ty) - field.tileHeight(nx, ny);
        if (d > 0.5) falls.push({ tx, ty, side: isX ? 'se' : 'sw', drop: d, footX: (nx + 0.5) * TILE, footY: (ny + 0.5) * TILE, slope: true });
      }
    }

    // ----- clear the ways of trees, rocks and flora ----------------------------
    const inWay = (x, y) => footprint.has(Math.floor(y / TILE) * N + Math.floor(x / TILE));
    if (this.forestTrees) {
      this.forestTrees = this.forestTrees.filter(t => !inWay(t.x, t.y));
      this.forestTrees.forEach((t, i) => { t.id = i; });
    }
    if (this.obstacles) {
      this.obstacles = this.obstacles.filter(o => o.hw > 0 || o.placedBy === 'hand' || !inWay(o.x, o.y));
      this.obstacles.forEach((o, i) => { o.id = i; });
      this._rockSprites = new Map();
    }
    if (this._floraBlocked) {
      const prev = this._floraBlocked;
      this._floraBlocked = (x, y) => inWay(x, y) || prev(x, y);
    }
    // Stone stairs are cut stone: drawn paved.
    for (const w of ways) if (w.style === 'stairs') {
      for (let ty = w.y; ty < w.y + w.h; ty++) for (let tx = w.x; tx < w.x + w.w; tx++) {
        if (!isWaterTile(T[ty * N + tx]) && this._paveStair) this._paveStair(ty * N + tx);
      }
    }
    this._elevDirty = { grid: true, views: true, minimap: true, ...(this._elevDirty || {}) };

    // How many of each step's tiles sit on something a step would rather avoid.
    const conflicts = stepLines.map(l => {
      let n = 0;
      for (let u = (l.axis === 'x' ? oy : ox); u < (l.axis === 'x' ? oy : ox) + R; u++) {
        const [tx, ty] = l.axis === 'x' ? [l.pos, u] : [u, l.pos];
        const [px, py] = l.axis === 'x' ? [l.pos - 1, u] : [u, l.pos - 1];
        if (bad(ty * N + tx) || bad(py * N + px)) n++;
      }
      return { axis: l.axis, pos: l.pos, bad: n };
    });
    this._nekSlope = { band, xs: { ups: xs.ups, downs: xs.downs }, ys: { ups: ys.ups, downs: ys.downs },
      ways, roadWays, openWays, stairWays, mended, unmended, falls, conflicts, footprint };
    return this._nekSlope;
  },
};
