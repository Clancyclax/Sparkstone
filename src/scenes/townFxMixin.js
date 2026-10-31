// ===========================================================================
// ROUND 403 -- "Add a minor effect to the fountain to give the illusion of flowing water."
//
// The city fountain (city_cityprops.png frame 10) is one still picture: a spout in a stone back and a basin. Over it,
// while it is on screen: three bright drops running down the stream from the spout's lip to the water, and a ring
// spreading from where they land, fading as it goes. One Graphics per fountain in view, drawn in the sprite's own
// pixels (so it scales and sits with the art), just above it in depth.
// ===========================================================================
import { REGIONS, MAP_TILES_TOTAL } from '../data/regions.js';
import { TILE_CITY, TILE_GRASS, isCarriagewayTile, isWaterTile } from '../data/town.js';
const FOUNTAIN_SHEET = 'cityProps', FOUNTAIN_FRAME = 10;
/** In the frame's own pixels (80px cell): the spout's lip and the splash on the water. */
export const FOUNTAIN_SPOUT = { x: 40, y: 45 }, FOUNTAIN_SPLASH = { x: 40, y: 58 };
const DROPS = 3, FALL_S = 0.55, RING_S = 1.1;

/** ROUND 403 -- how far (world px) a house's footprint is kept from a city wall's line. A wall stone is drawn about two
 *  tiles deep (WALL_COLLIDE_DEPTH), so a footprint within this of the line is a house built into the masonry. */
export const HOUSE_WALL_CLEAR = 48;

/** ROUND 404 -- how far either side of a city wall's line its base is looked for, and how far the ground is put right. */
export const WALL_BASE_REACH = 6, WALL_FLOOR_IN = 4, WALL_FLOOR_OUT = 4;

/** ROUND 404 -- where the courses of one run stand (in run units): every `spacing` (screen px) from the start, and one at
 *  the very end unless the last step already landed within two pixels of it. Pure, for the test. (WorldScene `_buildCityRectWall`.) */
export function wallCourseStops(r0, r1, L, spacing) {
  if (!(L > 0) || !(spacing > 0)) return [r0];
  const n = Math.floor(L / spacing);
  const out = [];
  for (let i = 0; i <= n; i++) out.push(r0 + (r1 - r0) * (i * spacing) / L);
  if (L - n * spacing > 2) out.push(r1);
  return out;
}

export const TownFxMixin = {
  /**
   * ROUND 404 -- "the city tiles should extend to under the base of the walls and stop there, with the area inside the
   * walls all brick and outside all terrain." The brick floor was stamped to the wall's LINE, but the stones stand off
   * that line (two tiles inside it on the south and east sides, two outside on the north and west), so there was a
   * strip of brick outside the wall on two sides and a strip of grass inside it on the other two. Each side is read off
   * the wall's own solid tiles (its base): inside it and under it, grass becomes brick; outside it, brick becomes the
   * ground beyond. Gates (no base) are left as they are.
   */
  _floorToWallBase() {
    const solidSet = this._solidTiles;
    if (!solidSet || !solidSet.size) return 0;
    const solid = (tx, ty) => solidSet.has(ty * MAP_TILES_TOTAL + tx);
    let changed = 0;
    const census = (this._wallFloorCensus = {});
    for (const region of REGIONS) {
      for (const st of region.settlements || []) {
        const rect = st._wallRect, c = st._centre;
        if (!rect || !c) continue;
        const ot = { tx: Math.floor(c.x / 32), ty: Math.floor(c.y / 32) };
        let n = 0;
        const sides = [
          { along: 'x', fixed: rect.y0, out: -1, a0: rect.x0, a1: rect.x1 },
          { along: 'x', fixed: rect.y1, out: 1, a0: rect.x0, a1: rect.x1 },
          { along: 'y', fixed: rect.x0, out: -1, a0: rect.y0, a1: rect.y1 },
          { along: 'y', fixed: rect.x1, out: 1, a0: rect.y0, a1: rect.y1 },
        ];
        for (const sd of sides) {
          // the base's band across the WHOLE side (its collision is fitted stone by stone, two rows here and three there;
          // the drawn base is the same all along), then laid wherever the side has a stone
          // (rows solid in at least a third as many columns as the commonest row: a rock or a gate's pillar is not the base)
          const cols = [];
          const count = {};
          for (let a = sd.a0; a <= sd.a1; a++) {
            const at = (k) => sd.along === 'x' ? [ot.tx + a, ot.ty + sd.fixed + k] : [ot.tx + sd.fixed + k, ot.ty + a];
            let any = false;
            for (let k = -WALL_BASE_REACH; k <= WALL_BASE_REACH; k++) { const [tx, ty] = at(k); if (solid(tx, ty)) { any = true; count[k] = (count[k] || 0) + 1; } }
            if (any) cols.push(at);   // a column with no base is a gate, or a gap a rock owns
          }
          if (!cols.length) continue;
          const top = Math.max(...Object.values(count));
          const band = Object.keys(count).map(Number).filter(k => count[k] >= top / 3);
          const lo = Math.min(...band), hi = Math.max(...band);
          const kin = sd.out > 0 ? lo : hi, kout = sd.out > 0 ? hi : lo;
          for (const at of cols) {
            const set = (k, t) => { const [tx, ty] = at(k); if (this._tileTypeAt(tx, ty) !== t) { this._setTile(tx, ty, t); n++; } };
            // inside, and under the base: brick
            for (let k = kin - sd.out * WALL_FLOOR_IN; k !== kout + sd.out; k += sd.out) {
              const [tx, ty] = at(k); const t = this._tileTypeAt(tx, ty);
              if (t === TILE_GRASS) set(k, TILE_CITY);   // a gravel path is a road: left alone
            }
            // outside the base: the country beyond
            const [bx, by] = at(kout + sd.out * (WALL_FLOOR_OUT + 2));
            let beyond = this._tileTypeAt(bx, by);
            if (beyond === TILE_CITY || isCarriagewayTile(beyond) || isWaterTile(beyond)) beyond = TILE_GRASS;
            for (let k = kout + sd.out; Math.abs(k - kout) <= WALL_FLOOR_OUT; k += sd.out) {
              const [tx, ty] = at(k);
              if (this._tileTypeAt(tx, ty) === TILE_CITY) set(k, beyond);
            }
          }
        }
        census[st.id] = n;
        changed += n;
      }
    }
    return changed;
  },

  /**
   * ROUND 403 -- "This house is overlapping the wall, remove it and any other houses doing the same thing." Every
   * house (not a named building, not a wall) whose ground footprint comes within HOUSE_WALL_CLEAR of a city wall's
   * line is taken down. The line is sampled along each wall stone's run, half a tile apart, three tiles either side.
   */
  _dropHousesOnWalls() {
    const walls = this._cityWalls || [];
    if (!walls.length) return 0;
    const T = 32;
    // the wall's line: each stone joined to its nearest neighbour (within eight tiles), sampled every half tile
    const pts = [];
    for (const w of walls) {
      pts.push({ x: w.x, y: w.y });
      let n = null, nd = 8 * T;
      for (const o of walls) { if (o === w) continue; const d = Math.hypot(o.x - w.x, o.y - w.y); if (d < nd) { nd = d; n = o; } }
      if (!n) continue;
      const steps = Math.ceil(nd / (T * 0.5));
      for (let k = 1; k < steps; k++) pts.push({ x: w.x + (n.x - w.x) * k / steps, y: w.y + (n.y - w.y) * k / steps });
    }
    const dropped = [];
    for (const b of (this.buildings || []).slice()) {
      if (!b || !b.sprite || b.wall || b.singleton || b.mansion || b.r400 || b.estate || b.civic) continue;
      if (!(b.house || b.townHouse || b.texKey === 'townPool' || (b.sprite.texture && b.sprite.texture.key === 'townPool'))) continue;
      const fp = this._artFootprint ? this._artFootprint(b.sprite) : null;
      const cx = fp ? fp.x : b.x, cy = fp ? fp.y : b.y;
      const hw = (fp ? fp.hw : (b.radius || 48)) + HOUSE_WALL_CLEAR, hh = (fp ? fp.hh : (b.radius || 48)) + HOUSE_WALL_CLEAR;
      // a wide pre-filter, then the samples
      if (!walls.some(w => Math.abs(w.x - cx) < hw + 6 * T && Math.abs(w.y - cy) < hh + 6 * T)) continue;
      if (!pts.some(q => Math.abs(q.x - cx) < hw && Math.abs(q.y - cy) < hh)) continue;
      dropped.push({ x: Math.round(b.x), y: Math.round(b.y), settlement: b.settlement || null });
      this._unplaceBuilding(b);
      this.doorways = (this.doorways || []).filter(d => d.building !== b);
    }
    this._housesOffWalls = dropped;
    return dropped.length;
  },

  _fountainFxTick(dt) {
    const all = this.cityProps || [];
    if (!this._fountainProps || this._fountainPropsN !== all.length) {
      this._fountainProps = all.filter(p => p && p.sheet === FOUNTAIN_SHEET && p.frame === FOUNTAIN_FRAME);
      this._fountainPropsN = all.length;
    }
    const list = this._fountainProps;
    if (!list.length) return;
    const t = (this._fxClock = (this._fxClock || 0) + Math.min(0.1, dt || 0));
    for (const p of list) {
      const sp = p.sprite;
      const on = sp && sp.scene && sp.visible && !this._insideRoom;
      if (!on) { if (p._fx) { p._fx.destroy(); p._fx = null; } continue; }
      const g = p._fx || (p._fx = this.add.graphics());
      g.clear();
      const sx = sp.scaleX, sy = sp.scaleY;
      const at = (nx, ny) => ({ x: sp.x + (nx - sp.displayOriginX) * sx, y: sp.y + (ny - sp.displayOriginY) * sy });
      const a = at(FOUNTAIN_SPOUT.x, FOUNTAIN_SPOUT.y), b = at(FOUNTAIN_SPLASH.x, FOUNTAIN_SPLASH.y);
      const ph = p._fxPh != null ? p._fxPh : (p._fxPh = ((p.x * 0.013 + p.y * 0.007) % 1));
      // the drops, running down the stream
      for (let i = 0; i < DROPS; i++) {
        const u = ((t / FALL_S) + i / DROPS + ph) % 1;
        const y = a.y + (b.y - a.y) * u * u;   // falling faster as it goes
        g.fillStyle(0xe8fbff, 0.85 - 0.3 * u);
        g.fillRect(a.x - sx * 0.5, y - sy, sx, sy * 1.6);
      }
      // the ring where they land, spreading and fading
      for (let i = 0; i < 2; i++) {
        const v = ((t / RING_S) + i / 2 + ph) % 1;
        g.lineStyle(Math.max(1, sx * 0.6), 0xd9f6ff, 0.55 * (1 - v));
        g.strokeEllipse(b.x, b.y, sx * (2 + 9 * v), sy * (1 + 4 * v));
      }
      g.setDepth(sp.depth + 0.02);
    }
  },
};
