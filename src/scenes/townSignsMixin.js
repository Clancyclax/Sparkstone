// ===========================================================================
// ROUND 396 (item 10, part A) -- TOWN, CITY AND BATHHOUSE SIGNS: THE SCENE SIDE.
//
//   "City signs: beside the main road where it approaches the city, just outside the wall or edge, facing the
//    traveller. Add one on each major road in."
//   "Bandit cities: the same placement, but the sign follows the city's state."
//   "Town, village and hamlet signs: one at the edge of each settlement on its road in."
//   "Bathhouses: one outside each bathhouse or bath building that exists."
//   "Collision: solid only at the posts. Never block a road, door or gate path."
//
// WHERE A ROAD COMES IN is MEASURED, not authored: a ring is walked just outside each settlement's edge (its radius,
// or Cadence's traced rectangle), and every run of carriageway tiles the ring crosses is a road in. A city signs its
// widest four, everywhere else signs its widest one. The sign stands beside that road -- off the paving, clear of it by
// a tile at every post, out of water and solid ground, off any building, away from every doorway and gate -- on the
// first side and distance that passes, tried nearest first. Deterministic: the same world places the same signs.
//
// Drawn only near the player (like the round-389 property signs) and re-chosen on that beat, so a bandit city's board
// changes to its former name the moment the city is cleared. The pure half is data/townSigns.js.
// ===========================================================================
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { REGIONS, regionPoint } from '../data/regions.js';
import { isCarriagewayTile, isRoadTile, isWaterTile } from '../data/town.js';
import {
  TOWN_SIGN_ART, TOWN_SIGNS, TOWN_SIGN_SPRITE_SCALE, townSignFor, townSignScale, townSignPosts, signsPerSettlement,
  bathSignFor,
} from '../data/townSigns.js';

const TS_SHOW = 2000;   // drawn within this many units of the player
const TS_HIDE = 2600;   // and put away beyond this
const TS_BEAT_MS = 400;
const RING_OFFSETS = [3, 5, 8, 12, 16, 20];          // tiles beyond the edge the ring is walked at, nearest first
const ALONG_TRIES = [1.6, 2.3, 3.1, 4.0, 5.2, 6.5];   // tiles from the road's edge, along the ring
const OUT_TRIES = [0.5, 1.4, 0, 2.4, 3.6, 5.0];      // tiles outward from the ring
const SIGN_SPACING = TILE * 5;                // no two signs nearer than this
const DOOR_CLEAR = TILE * 3;                  // nor this near a doorway or a gate
const OCCLUDE_RISE_PX = 120;                  // how far below a sign's foot (on screen) a wall's foot can be and still cover it
const TREE_RISE_PX = 260;                     // and a tree's canopy, which stands taller and wider than a wall course

export const TownSignsMixin = {
  /** World build: every settlement's signs on its roads in, and every bathhouse's. */
  _placeTownSigns() {
    this._townSigns = [];
    this._townSignRoads = [];
    for (const r of REGIONS) {
      for (const st of (r.settlements || [])) {
        if (st.kind === 'ruin' || !townSignFor(st)) continue;
        const c = regionPoint(r, st.at);
        if (!c) continue;
        for (const sp of this._tsRoadSpots(st, c, signsPerSettlement(st))) {
          this._townSigns.push({ kind: 'settlement', st, region: r.id, x: sp.x, y: sp.y, road: sp.road, key: null, sprite: null });
        }
      }
    }
    // Bathhouses: every building that is one (Cadence's, round 373's `clSite`), styled by where it stands.
    for (const b of (this.buildings || [])) {
      if (!(b.clSite === 'bathhouse' || b.bathhouse || b.service === 'bathhouse')) continue;
      const st = this._psSettlementOf ? this._psSettlementOf(b) : null;
      const region = (REGIONS.find(r => (r.settlements || []).includes(st)) || {}).id || null;
      const key = bathSignFor({ settlement: st ? st.id : null, region });
      const at = this._tsBesideDoor(b, key);
      if (at) this._townSigns.push({ kind: 'bath', building: b, bathKey: key, x: at.x, y: at.y, key: null, sprite: null });
    }
    this._staticGrid = null;   // the posts join the static grid on its next build (`_rebuildStaticGrid`)
    return this._townSigns.length;
  },

  /** The ring just outside a settlement, as ordered world points with their outward normals. */
  _tsRing(st, c, off) {
    const pts = [];
    if (st.bounds) {
      const b = st.bounds;
      const x0 = c.x + (b.x0 - off) * TILE, x1 = c.x + (b.x1 + off) * TILE;
      const y0 = c.y + (b.y0 - off) * TILE, y1 = c.y + (b.y1 + off) * TILE;
      for (let x = x0; x <= x1; x += TILE) pts.push({ x, y: y0, nx: 0, ny: -1 });
      for (let y = y0; y <= y1; y += TILE) pts.push({ x: x1, y, nx: 1, ny: 0 });
      for (let x = x1; x >= x0; x -= TILE) pts.push({ x, y: y1, nx: 0, ny: 1 });
      for (let y = y1; y >= y0; y -= TILE) pts.push({ x: x0, y, nx: -1, ny: 0 });
      return pts;
    }
    const R = ((st.radius || 9) + off) * TILE;
    const n = Math.max(24, Math.ceil((2 * Math.PI * R) / (TILE * 0.75)));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R, nx: Math.cos(a), ny: Math.sin(a) });
    }
    return pts;
  },

  _tsTile(x, y) { return this._tileTypeAt(Math.floor(x / TILE), Math.floor(y / TILE)); },

  /** The roads crossing the ring, widest first: { mid, width (tiles), nx, ny }. */
  _tsCrossings(st, c, off) {
    const ring = this._tsRing(st, c, off);
    const on = ring.map(p => isCarriagewayTile(this._tsTile(p.x, p.y)));
    if (!on.some(Boolean) || on.every(Boolean)) return [];
    const start = on.indexOf(false);   // walk from a gap so a run cannot wrap
    const runs = [];
    let cur = null;
    for (let k = 1; k <= ring.length; k++) {
      const i = (start + k) % ring.length;
      if (on[i]) { (cur = cur || []).push(ring[i]); }
      else if (cur) { runs.push(cur); cur = null; }
    }
    const step = st.bounds ? 1 : 0.75;
    return runs.map(run => {
      const m = run[Math.floor(run.length / 2)];
      return { x: m.x, y: m.y, nx: m.nx, ny: m.ny, width: run.length * step };
    }).filter(r => r.width >= 1).sort((a, b) => b.width - a.width);
  },

  /** Sign spots beside up to `want` roads in. Each road is signed at the nearest ring that gives it a clear spot: a road
   *  whose spot just outside the wall is covered (a gate arch, a tower) is tried further out along the same road, and a
   *  road already signed is not signed twice (matched by its bearing out of the settlement). */
  _tsRoadSpots(st, c, want) {
    const out = [];
    const signed = [];   // outward bearings already signed
    const key = townSignFor(st);
    let first = null;   // the nearest ring any road crosses: the roads IN are the ones crossing it
    for (const off of RING_OFFSETS) {
      if (out.length >= want) break;
      const cr = this._tsCrossings(st, c, off);
      if (cr.length && first === null) first = off;
      for (const road of cr) {
        if (out.length >= want) break;
        if (signed.some(b => this._tsSameRoad(b, road, c))) continue;
        // a lane that only appears further out is not a road in: it must have crossed the first ring too
        if (off !== first && !this._tsRoadSeenNearer(st, c, road, off)) continue;
        const spot = this._tsBesideRoad(road, key);
        if (spot) { out.push({ ...spot, road }); signed.push(road); this._townSignRoads.push({ st: st.id, off, ...road }); }
      }
    }
    return out;
  },

  /** Two crossings are the same road when they leave the settlement on the same bearing: the gap between their
   *  bearings, measured as an arc at the further one's distance, is within half their widths and four tiles. (A
   *  bearing alone is not enough: three of Harrowmoor's roads leave by its south side a few tiles apart.) */
  _tsSameRoad(a, b, c) {
    const fa = Math.atan2(a.y - c.y, a.x - c.x), fb = Math.atan2(b.y - c.y, b.x - c.x);
    let d = Math.abs(fa - fb); if (d > Math.PI) d = 2 * Math.PI - d;
    const R = Math.max(Math.hypot(a.x - c.x, a.y - c.y), Math.hypot(b.x - c.x, b.y - c.y));
    return d * R < ((a.width + b.width) / 2 + 4) * TILE;
  },

  /** Was this road (by bearing) already crossing a nearer ring? */
  _tsRoadSeenNearer(st, c, road, off) {
    for (const o of RING_OFFSETS) {
      if (o >= off) break;
      if (this._tsCrossings(st, c, o).some(r => this._tsSameRoad(r, road, c))) return true;
    }
    return false;
  },

  _tsBesideRoad(road, key) {
    const tx = -road.ny, ty = road.nx;
    const half = road.width / 2;
    for (const along of ALONG_TRIES) {
      for (const outT of OUT_TRIES) {
        for (const side of [1, -1]) {
          const d = (half + along) * TILE * side;
          const x = road.x + tx * d + road.nx * outT * TILE, y = road.y + ty * d + road.ny * outT * TILE;
          if (this._tsSpotOk(key, x, y)) return { x, y };
        }
      }
    }
    return null;
  },

  /** Beside a bathhouse's door: either side, a little out toward the street. */
  _tsBesideDoor(b, key) {
    const door = (this.doorways || []).find(d => d.kind === 'enter' && d.building === b)
      || { x: (b.anchorX ?? b.x), y: (b.anchorY ?? b.y) + (b.hh || TILE) + TILE };
    const cx = b.anchorX ?? b.x, cy = b.anchorY ?? b.y;
    let dx = door.x - cx, dy = door.y - cy; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    for (const side of [2.6, 3.2, 3.9, 4.6]) {
      for (const o of [0.6, 1.4, 0]) {
        for (const s of [1, -1]) {
          const x = door.x + dx * o * TILE - dy * side * TILE * s, y = door.y + dy * o * TILE + dx * side * TILE * s;
          if (this._tsSpotOk(key, x, y, { doorClear: TILE * 1.6, inTown: true })) return { x, y };
        }
      }
    }
    return null;
  },

  /** May a sign's posts stand here? Off every road (a tile of clearance), out of water and solid ground, off every
   *  building, clear of doorways and gates, and not crowding another sign. */
  _tsSpotOk(key, x, y, { doorClear = DOOR_CLEAR, inTown = false } = {}) {
    const posts = townSignPosts(key, x, y);
    for (const p of [...posts, { x, y }]) {
      const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
      // Out in the country a sign keeps a tile off any paving. Inside a town (a bathhouse's), where the whole ground is
      // paved, it keeps off the carriageway -- the street and the path -- and stands on the square's own flags.
      if (inTown) { if (isCarriagewayTile(this._tileTypeAt(ptx, pty))) return false; }
      else for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (isRoadTile(this._tileTypeAt(ptx + ox, pty + oy))) return false;
      }
      const t = this._tileTypeAt(ptx, pty);
      if (isWaterTile(t)) return false;
      if (this._solidTiles && this._solidTiles.has(pty * this._mapTilesForTest + ptx)) return false;
    }
    for (const o of this._staticNear(x, y, 140)) {
      if (o.hw > 0 && Math.abs(o.x - x) < o.hw + TILE && Math.abs(o.y - y) < o.hh + TILE) return false;
      if (!(o.hw > 0) && (o.radius || 0) > 0 && Math.hypot(o.x - x, o.y - y) < (o.radius || 0) + TILE * 0.8) return false;
    }
    for (const d of (this.doorways || [])) if (Math.hypot(d.x - x, d.y - y) < doorClear) return false;
    for (const g of (this.gates || this._gates || [])) if (g && Math.hypot((g.x ?? g.wx) - x, (g.y ?? g.wy) - y) < DOOR_CLEAR) return false;
    for (const s of (this._townSigns || [])) if (Math.hypot(s.x - x, s.y - y) < SIGN_SPACING) return false;
    if (this._tsOccluded(key, x, y)) return false;
    return true;
  },

  /** Would anything solid in front of the sign (a wall course, a tower, a house) be drawn over its board? Tested on the
   *  screen: any solid tile whose foot is below the sign's foot by less than a wall's height, within the board's width.
   *  A sign behind a wall from the camera's side is a sign nobody can read. */
  _tsOccluded(key, x, y) {
    const def = TOWN_SIGNS[key];
    if (!def || !this._solidTiles) return false;
    const k = townSignScale(key);
    const halfW = (def.w * k) / 2 + 12, rise = OCCLUDE_RISE_PX;
    const sx0 = x - y, sy0 = (x + y) / 2;
    const span = Math.ceil((rise * 2 + halfW) / TILE) + 2;
    const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    // a tree in front, whose canopy would stand over the board (and fade whenever the player is behind it)
    if (this.forestTrees && this._nearFrom) {
      for (const t of this._nearFrom('forestTrees', this.forestTrees, x, y, (o) => o.radius || 0, TREE_RISE_PX * 2)) {
        const sx = t.x - t.y, sy = (t.x + t.y) / 2;
        if (Math.abs(sx - sx0) <= halfW + 70 && sy - sy0 > -TILE && sy - sy0 < TREE_RISE_PX) return true;
      }
    }
    // a gate arch or a wall course in front: walkable or not, its art stands over whatever is just behind it
    for (const o of (this._occludables || [])) {
      if (!o || !(o.slab || o.wall)) continue;
      const ox = o.anchorX ?? o.x, oy = o.anchorY ?? o.y;
      if (Math.abs(ox - x) > 900 || Math.abs(oy - y) > 900) continue;
      const sx = ox - oy, sy = (ox + oy) / 2;
      const ow = (o.sprite && o.sprite.displayWidth) ? o.sprite.displayWidth / 2 : 120;
      if (Math.abs(sx - sx0) <= halfW + ow && sy - sy0 > -TILE / 2 && sy - sy0 < OCCLUDE_RISE_PX * 2) return true;
    }
    const MT = this._mapTilesForTest;
    for (let dy = -2; dy <= span; dy++) {
      for (let dx = -2; dx <= span; dx++) {
        const tx = tx0 + dx, ty = ty0 + dy;
        if (!this._solidTiles.has(ty * MT + tx)) continue;
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
        const sx = cx - cy, sy = (cx + cy) / 2;
        if (Math.abs(sx - sx0) <= halfW && sy - sy0 > 4 && sy - sy0 < rise) return true;
      }
    }
    return false;
  },

  /** The board a sign shows now: a bandit city's follows its state. */
  _tsKeyNow(s) {
    if (s.kind === 'bath') return s.bathKey;
    const cleared = !!(s.st.bandit && this._banditCityState && this._banditCityState(s.st.id).cleared);
    return townSignFor(s.st, { cleared });
  },

  /** Near the player: draw, re-face or put away. On its own beat. */
  _updateTownSigns(force = false) {
    if (!this._townSigns || !this.world) return;
    const now = (this.time && this.time.now) || 0;
    if (!force && now - (this._tsBeatAt || 0) < TS_BEAT_MS) return;
    this._tsBeatAt = now;
    const ok = this.textures.exists(TOWN_SIGN_ART.key);
    for (const s of this._townSigns) {
      const d = Math.hypot(s.x - this.world.x, s.y - this.world.y);
      if (!ok || d > TS_HIDE || this._insideRoom) { if (s.sprite) { s.sprite.destroy(); s.sprite = null; s.key = null; } continue; }
      if (d > TS_SHOW && !s.sprite) continue;
      const key = this._tsKeyNow(s);
      if (!key) { if (s.sprite) { s.sprite.destroy(); s.sprite = null; } s.key = null; continue; }
      const def = TOWN_SIGNS[key];
      if (!s.sprite) {
        const p = isoProject(s.x, s.y);
        s.sprite = this.add.image(p.x, p.y, TOWN_SIGN_ART.key, def.idx);
        s.sprite.setOrigin(TOWN_SIGN_ART.foot[0], TOWN_SIGN_ART.foot[1]);
        const bias = this._propFrontBias ? this._propFrontBias({ x: s.x, y: s.y }) : 0;
        s.sprite.setDepth(isoDepth(s.x, s.y) + bias);
        s._townSign = true;
      } else if (s.key !== key) {
        s.sprite.setFrame(def.idx);
      }
      s.sprite.setScale(TOWN_SIGN_SPRITE_SCALE * townSignScale(key));
      s.key = key;
    }
  },

  /** Every sign's posts, for `_rebuildStaticGrid`. The posts of whichever board stands there now; a bandit city's two
   *  boards are the same board, so its posts do not move when it changes. */
  _townSignSolids() {
    const out = [];
    for (const s of (this._townSigns || [])) {
      const key = s.kind === 'bath' ? s.bathKey : townSignFor(s.st);
      for (const p of townSignPosts(key, s.x, s.y)) out.push({ ...p, townSign: true, sign: s, sprite: null });
    }
    return out;
  },

  /** The browser check's handle: every sign, where it stands, what it shows. */
  _townSignsDebug() {
    return (this._townSigns || []).map(s => ({
      kind: s.kind, settlement: s.st ? s.st.id : null, name: s.st ? s.st.name : null, bandit: !!(s.st && s.st.bandit),
      key: this._tsKeyNow(s), x: Math.round(s.x), y: Math.round(s.y),
      roadWidth: s.road ? s.road.width : null, drawn: !!s.sprite,
      posts: townSignPosts(s.kind === 'bath' ? s.bathKey : townSignFor(s.st), s.x, s.y),
    }));
  },
};
