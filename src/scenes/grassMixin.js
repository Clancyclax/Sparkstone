// ===========================================================================
// ROUND 313 (item 2) -- GRASS THAT MOVES.
//
// "Add grass and animate it moving as players, npcs or monsters move through
// it."
//
// WHAT IT IS. Small tufts of blade scattered over the GRASS ground tiles, drawn
// as sprites standing on the ground. They are procedural (no art file): one
// canvas texture of four tuft shapes, made once, and tinted a little so a
// meadow is not four repeated stamps.
//
// HOW MANY, AND WHERE. A tuft belongs to a tile. Whether a tile has tufts, how
// many, and where on the tile they stand, is a hash of the tile's coordinates
// -- so the same field is the same field every time the world is built, and a
// save never has to store grass. Only tiles inside the camera's view (plus a
// margin) have sprites; they are taken from a pool and returned to it, the way
// the forest's trees are. Tiles that are not plain GRASS -- road, plaza, path,
// water -- get none, and nothing grows indoors.
//
// HOW IT MOVES. Two things, both cheap:
//   * a breeze: every tuft sways a few degrees on its own phase;
//   * a push: anything standing or walking within PUSH_R of a tuft pushes it
//     away, sideways on the screen, harder the closer and the faster it goes.
//     Each tuft is a little spring (angle + angular velocity), so it bows when
//     something passes and swings back past upright before settling -- which is
//     the part that reads as grass rather than as a sprite being rotated.
// Pushers are the player, the party, NPCs, monsters and summons. The tufts near
// them are found through a coarse hash of the view's tufts, so the cost is
// (pushers in view) x (a few tufts each), not (pushers x every tuft).
// ===========================================================================

import { TILE, ISO_TW, isoProject, isoUnproject, isoDepth } from '../data/iso.js';
import { isWaterTile, TILE_GRASS } from '../data/town.js';
import { MAP_TILES_TOTAL, regionAt } from '../data/regions.js';

/** The user's own sprites (pixellab, 25 clumps, 32x32 each, 5x5 sheet). */
export const GRASS_TEX = 'grassTufts';
export const GRASS_SHEET = 'grass_tufts.png';
export const GRASS_FRAME = 32;
export const GRASS_FRAMES = 25;

// Which frames are which, by their colour. 1-based, as the files are numbered.
const F = (...ns) => ns.map(n => n - 1);
const LUSH = F(3, 5, 7, 9, 11, 13, 14, 16, 17, 22, 23);   // ordinary green
const SPARSE = F(1, 10);                                    // a few thin blades
const DARK = F(2, 4, 6, 8, 12);                             // deep green
const DRY = F(19, 20, 21, 24, 25);                          // straw yellow
const PALE = F(15);                                         // grey-silver
const BRIGHT = F(18);                                       // spring green
// What each region grows. [frames, weight] lists; the rest of the map is "meadow".
const MIX = {
  meadow: [[LUSH, 0.62], [SPARSE, 0.10], [DARK, 0.10], [DRY, 0.10], [BRIGHT, 0.05], [PALE, 0.03]],
  dry: [[DRY, 0.58], [SPARSE, 0.14], [LUSH, 0.16], [PALE, 0.12]],
  bog: [[DARK, 0.5], [LUSH, 0.38], [BRIGHT, 0.07], [SPARSE, 0.05]],
};
const REGION_MIX = { elehyd: 'dry', sirukh: 'dry', cinder: 'dry', bratugal: 'bog' };

/** Average tufts per grass tile. ~1 keeps a lawn lawn-like without a sprite
 *  count that costs frames; the viewport holds a few hundred tiles. */
export const GRASS_DENSITY = 0.9;
/** Hard ceiling on live tufts, so an unusually wide view cannot run away. */
export const GRASS_MAX = 900;
/** World px within which a body bends a tuft. A little over half a tile. */
export const GRASS_PUSH_R = 26;
/** Radians of lean a fully pushed tuft settles at. */
export const GRASS_MAX_LEAN = 0.75;

const SPRING_K = 90;      // pull back to upright
const SPRING_C = 7.5;     // damping: a few visible swings, not a wobble forever
const PUSH_FORCE = 50;    // spring force per unit of push (steady lean ~ 0.55 rad per unit)
const CELL = 48;          // world px, the push lookup's bucket size


function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The frame a tuft wears: the tile's hash picks a family by weight, then a frame in it. */
function grassFrameFor(tx, ty, i, mix) {
  let r = hash2(tx, ty, 70 + i), acc = 0;
  for (const [frames, w] of mix) {
    acc += w;
    if (r < acc) return frames[Math.floor(hash2(tx, ty, 80 + i) * frames.length) % frames.length];
  }
  const last = mix[0][0];
  return last[Math.floor(hash2(tx, ty, 80 + i) * last.length) % last.length];
}

export const GrassMixin = {

  _grassState() {
    if (!this._grass) this._grass = { pool: [], live: [], buckets: new Map(), viewKey: '', t: 0, on: true };
    return this._grass;
  },

  _grassReset() {
    const g = this._grass;
    if (!g) return;
    for (const t of g.live) { try { t.s.destroy(); } catch (e) { /* already gone */ } }
    for (const s of g.pool) { try { s.destroy(); } catch (e) { /* already gone */ } }
    this._grass = null;
  },

  /** Which entities push grass this frame, as {x, y, vx, vy} in world px. */
  _grassPushers(minX, maxX, minY, maxY, dt) {
    const out = [];
    const prev = this._grassPrev || (this._grassPrev = new WeakMap());
    const take = (o, x, y) => {
      if (x < minX || x > maxX || y < minY || y > maxY) return;
      const p = prev.get(o);
      let speed = 0;
      if (p && dt > 0) speed = Math.min(400, Math.hypot(x - p.x, y - p.y) / dt);
      prev.set(o, { x, y });
      out.push({ x, y, speed });
    };
    take(this.player, this.world.x, this.world.y);
    for (const m of (this.party || [])) if (m && m.recruited !== false && m.x != null) take(m, m.x, m.y);
    for (const n of (this.npcs || [])) if (n && n.x != null) take(n, n.x, n.y);
    for (const m of (this.monsters || [])) if (m && m.alive && m.wx != null) take(m, m.wx, m.wy);
    for (const s of (this._summons || [])) if (s && s.wx != null && s.kind === 'creature') take(s, s.wx, s.wy);
    return out;
  },

  /** Reconciles the live tufts with the camera view. Cheap when nothing moved. */
  _grassRefill(g, force) {
    const view = this.cameras.main.worldView;
    const margin = ISO_TW * 1.5;
    const corners = [
      [view.x - margin, view.y - margin], [view.x + view.width + margin, view.y - margin],
      [view.x - margin, view.y + view.height + margin], [view.x + view.width + margin, view.y + view.height + margin],
    ];
    let minWx = Infinity, maxWx = -Infinity, minWy = Infinity, maxWy = -Infinity;
    for (const [sx, sy] of corners) {
      const w = isoUnproject(sx, sy);
      if (w.x < minWx) minWx = w.x; if (w.x > maxWx) maxWx = w.x;
      if (w.y < minWy) minWy = w.y; if (w.y > maxWy) maxWy = w.y;
    }
    const tx0 = Math.floor(minWx / TILE), tx1 = Math.floor(maxWx / TILE);
    const ty0 = Math.floor(minWy / TILE), ty1 = Math.floor(maxWy / TILE);
    const key = `${tx0},${ty0},${tx1},${ty1}`;
    if (!force && key === g.viewKey) return;
    g.viewKey = key;

    // Everything goes back to the pool; the ones still wanted are re-taken.
    // (Tuft state is a pure function of the tile, so nothing is lost -- only a
    // tuft mid-swing is reset, and it is off screen or about to be.)
    const keep = new Map();
    for (const t of g.live) keep.set(t.id, t);
    const next = [];
    const buckets = new Map();
    let count = 0;
    const screenMinY = view.y - margin, screenMaxY = view.y + view.height + margin;
    const screenMinX = view.x - margin, screenMaxX = view.x + view.width + margin;

    const solid = this._solidTiles, mapTiles = MAP_TILES_TOTAL;
    for (let ty = ty0; ty <= ty1 && count < GRASS_MAX; ty++) {
      for (let tx = tx0; tx <= tx1 && count < GRASS_MAX; tx++) {
        if (tx < 0 || ty < 0) continue;
        const tt = this._tileTypeAt(tx, ty);
        if (tt !== TILE_GRASS || isWaterTile(tt)) continue;
        if (solid && solid.has(ty * mapTiles + tx)) continue;   // a building, a fence post: no lawn under it
        const reg = regionAt((tx + 0.5) * TILE, (ty + 0.5) * TILE);
        const mix = MIX[REGION_MIX[reg && reg.id] || 'meadow'];
        // 0, 1 or 2 tufts, averaging GRASS_DENSITY
        const r = hash2(tx, ty, 1);
        const n = r < GRASS_DENSITY - 1 ? 2 : (r < 0.88 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const wx = (tx + 0.12 + hash2(tx, ty, 10 + i) * 0.76) * TILE;
          const wy = (ty + 0.12 + hash2(tx, ty, 20 + i) * 0.76) * TILE;
          const p = isoProject(wx, wy);
          if (p.x < screenMinX || p.x > screenMaxX || p.y < screenMinY || p.y > screenMaxY) continue;
          const id = (ty * 100003 + tx) * 4 + i;
          let t = keep.get(id);
          if (t) keep.delete(id);
          else {
            let s = g.pool.pop();   // a clump of the user's art, by region (see MIX)
            if (!s) s = this.add.image(0, 0, GRASS_TEX, 0);
            s.setVisible(true);
            s.setTexture(GRASS_TEX, grassFrameFor(tx, ty, i, mix));
            s.setOrigin(0.5, 0.94);
            const sc = 0.7 + hash2(tx, ty, 40 + i) * 0.35;
            s.setScale(sc);
            t = { id, s, wx, wy, a: 0, v: 0, ph: hash2(tx, ty, 60 + i) * 6.283, sc, push: 0, dir: 0 };
          }
          s_place(t, p);
          next.push(t); count++;
          const bk = Math.floor(wx / CELL) + ',' + Math.floor(wy / CELL);
          let b = buckets.get(bk); if (!b) buckets.set(bk, b = []);
          b.push(t);
        }
      }
    }
    for (const t of keep.values()) { t.s.setVisible(false); g.pool.push(t.s); }
    g.live = next;
    g.buckets = buckets;
    g.bounds = { minWx, maxWx, minWy, maxWy };
  },

  /** Called every frame from the scene's update. */
  _updateGrass(dt) {
    const g = this._grassState();
    // nothing grows indoors, and a world mid-rebuild has no meaningful view
    if (this._insideRoom || !this.tileType || !g.on) {
      if (g.live.length) { for (const t of g.live) { t.s.setVisible(false); g.pool.push(t.s); } g.live = []; g.buckets = new Map(); g.viewKey = ''; }
      return;
    }
    if (g.live.length && g.live[0].s && !g.live[0].s.scene) { this._grassReset(); return this._updateGrass(dt); }
    this._grassRefill(g, false);
    g.t += dt;
    const b = g.bounds;
    if (!b) return;

    // 1. the pushes this frame
    const pushers = this._grassPushers(b.minWx, b.maxWx, b.minWy, b.maxWy, dt);
    for (const t of g.live) t.push = 0;
    const R = GRASS_PUSH_R;
    for (const o of pushers) {
      const cx = Math.floor(o.x / CELL), cy = Math.floor(o.y / CELL);
      const sp = 0.55 + Math.min(1.6, o.speed / 110);   // standing bends a little, running bends a lot
      const op = isoProject(o.x, o.y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const list = g.buckets.get((cx + dx) + ',' + (cy + dy));
          if (!list) continue;
          for (const t of list) {
            const d = Math.hypot(t.wx - o.x, t.wy - o.y);
            if (d >= R) continue;
            const f = (1 - d / R) * sp;
            if (f > Math.abs(t.push)) {
              const tp = isoProject(t.wx, t.wy);
              const side = tp.x - op.x;
              t.push = f * (Math.abs(side) < 1.5 ? (t.ph > 3.14 ? 1 : -1) : (side > 0 ? 1 : -1));
            }
          }
        }
      }
    }

    // 2. the springs, and the draw
    const step = Math.min(dt, 0.05);
    const time = g.t;
    for (const t of g.live) {
      const idle = Math.abs(t.a) < 0.003 && Math.abs(t.v) < 0.003 && t.push === 0;
      if (!idle) {
        const force = -SPRING_K * t.a - SPRING_C * t.v + PUSH_FORCE * t.push;
        t.v += force * step;
        t.a += t.v * step;
        if (t.a > GRASS_MAX_LEAN) { t.a = GRASS_MAX_LEAN; t.v = 0; }
        else if (t.a < -GRASS_MAX_LEAN) { t.a = -GRASS_MAX_LEAN; t.v = 0; }
      }
      const sway = 0.045 * Math.sin(time * 1.7 + t.ph) + 0.02 * Math.sin(time * 3.1 + t.ph * 2);
      t.s.setRotation(t.a + sway);
      // a bowed tuft is a little shorter
      t.s.setScale(t.sc * (1 + Math.abs(t.a) * 0.08), t.sc * (1 - Math.min(0.28, Math.abs(t.a) * 0.35)));
    }
  },
};

function s_place(t, p) {
  t.s.setPosition(p.x, p.y);
  t.s.setDepth(isoDepth(t.wx, t.wy) - 0.001);
}
