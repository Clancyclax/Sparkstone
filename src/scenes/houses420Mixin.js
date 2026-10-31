// ============================================================================
// ROUND 420 -- THE NEW HOUSES, SCENE SIDE. Rules: src/data/houseStyles420.js. Art: src/data/houseArt420.js.
//
// ONE DOOR IN. Every generated house in the game is placed through `_placeTownBuilding` with `extra.house` -- Cadence
// and its infill, the outline houses, the settlement lots, the grid cities' blocks, the city-life infill -- so that
// is where `_h420Swap` is asked. A house it swaps is placed from the new sheets from the start: every rule that runs
// after placement (the road snap, the site checks, the wall sweep, the footprint fit, the doors) sees the new
// drawing, never the old one.
//
// ONE DRAWING, TWO SIDES. The art faces south-west with its door on one face. A placer asks for the facing its road
// is in; the house is used as drawn when its door face is that side, and from a MIRRORED copy of the sheet otherwise
// (built once in memory from the loaded sheet -- `_h420Textures`). The art was itself mirrored from a south-east
// render, so neither copy is lit "wrong". A house asked to face north, north-east or north-west keeps the old
// pool's eight-direction art: these drawings have no back door.
// ============================================================================
import { TILE } from '../data/iso.js';
import { REGIONS, regionPoint, regionAt } from '../data/regions.js';
import { HOUSE420, HOUSE420_CELL, HOUSE420_SHEETS } from '../data/houseArt420.js';
import {
  pickHouse420, h420OldSuits, H420_KEEP_OLD, H420_MAX_W, H420_MAGIC_ONE_IN, H420_SAME_MODEL_TILES, H420_SAME_OLD_TILES,
} from '../data/houseStyles420.js';
import { TOWN_POOL_ROWS, TOWN_ROW_REMAP } from '../data/town.js';
import { seededRng } from '../data/awakening.js';

const LEFT = { southwest: true, west: true };
const RIGHT = { southeast: true, east: true };

export function h420Key(sheet, mirrored) { return `houses420_${sheet}${mirrored ? 'm' : ''}`; }

export const Houses420Mixin = {
  /** Load the three sheets (called from preload). */
  _h420Load() {
    HOUSE420_SHEETS.forEach((f, s) => this.load.spritesheet(h420Key(s, false), `./public/assets/${f}`,
      { frameWidth: HOUSE420_CELL, frameHeight: HOUSE420_CELL }));
  },

  /** The mirrored copies, made once: each cell flipped in place, so a frame index means the same house in both. */
  _h420Textures() {
    if (this._h420Ready !== undefined) return this._h420Ready;
    this._h420Ready = false;
    try {
      for (let s = 0; s < HOUSE420_SHEETS.length; s++) {
        const key = h420Key(s, false), mkey = h420Key(s, true);
        if (!this.textures.exists(key)) return false;
        if (this.textures.exists(mkey)) continue;
        const src = this.textures.get(key).getSourceImage();
        const C = HOUSE420_CELL, cols = Math.round(src.width / C), rows = Math.round(src.height / C);
        const cv = document.createElement('canvas');
        cv.width = src.width; cv.height = src.height;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          ctx.save();
          ctx.translate((c + 1) * C, r * C);
          ctx.scale(-1, 1);
          ctx.drawImage(src, c * C, r * C, C, C, 0, 0, C, C);
          ctx.restore();
        }
        const tex = this.textures.addCanvas(mkey, cv);
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) tex.add(r * cols + c, 0, c * C, r * C, C, C);
      }
      this._h420Ready = true;
    } catch (e) { this._h420Ready = false; }
    return this._h420Ready;
  },

  /** Every settlement's centre, region, tier -- once. */
  _h420Settlements() {
    if (this._h420Sts) return this._h420Sts;
    const out = [];
    for (const rg of REGIONS) for (const st of rg.settlements || []) {
      if (st.kind === 'ruin') continue;
      const c = st._centre || (st.at ? regionPoint(rg, st.at) : null);
      if (!c) continue;
      const big = st.kind === 'city' && (st.radius || 0) >= 40 && !st.bandit;
      const tier = big ? 'city' : (st.kind === 'city' || st.kind === 'town') ? 'town' : 'village';
      out.push({ id: st.id, region: rg.id, tier, x: c.x, y: c.y, r: ((st.radius || 12) + 14) * TILE, magic: 0, houses: 0 });
    }
    this._h420Sts = out;
    return out;
  },

  /** Where a house stands: its settlement (by id, else the nearest whose ground it is on), region and tier. */
  _h420Where(wx, wy, extra) {
    const sts = this._h420Settlements();
    let st = extra && extra.settlement ? sts.find(s => s.id === extra.settlement) : null;
    if (!st) {
      let best = Infinity;
      for (const s of sts) {
        const d = Math.hypot(s.x - wx, s.y - wy);
        if (d < s.r && d < best) { best = d; st = s; }
      }
    }
    if (st) return { st, region: st.region, tier: st.tier };
    const rg = regionAt(wx, wy);
    return { st: null, region: (rg && rg.id) || 'nek', tier: 'rural' };
  },

  /**
   * Asked by `_placeTownBuilding` for a pool house. Returns null (keep the pool house as asked) or what to draw
   * instead: { key, frame, scale, originX, originY, facing, id, variant }.
   */
  _h420Swap(wx, wy, row, facing, extra) {
    if (!extra || !extra.house || extra.shop || extra.noH420) return null;
    const rowName = TOWN_POOL_ROWS[row];
    if (rowName && rowName.startsWith('sign_')) return null;      // the shop fronts stay: the bookshops are chosen from them
    const left = !!LEFT[facing], right = !!RIGHT[facing];
    const upScreen = !left && !right && facing !== 'south';
    if (!this._h420Textures()) return null;
    const where = this._h420Where(wx, wy, extra);
    const rng = seededRng(`h420|${Math.round(wx)}|${Math.round(wy)}|${row}`);
    // A house facing up-screen keeps the pool's turning art -- the new drawings have no back door -- but it is still
    // one that suits the region, and not the same row as its neighbour.
    if (upScreen) return this._h420OldRow(wx, wy, row, where, rng);
    // Who is standing near: the same model too close is what "two identical houses side by side" means.
    const near = new Set();
    let oldTwin = false;
    const R1 = H420_SAME_MODEL_TILES * TILE, R2 = H420_SAME_OLD_TILES * TILE;
    for (const b of this.buildings || []) {
      if (!b || b.wall || !b.sprite) continue;
      const bx = b.anchorX ?? b.x, by = b.anchorY ?? b.y;
      const dx = bx - wx, dy = by - wy;
      if (Math.abs(dx) > R1 || Math.abs(dy) > R1) continue;
      const d = Math.hypot(dx, dy);
      if (b.h420 && d < R1) near.add(b.h420);
      if (!b.h420 && d < R2 && b.sprite.texture && b.sprite.texture.key === 'townPool'
          && Math.floor(Number(b.sprite.frame.name) / 8) === row) oldTwin = true;
    }
    const keep = (H420_KEEP_OLD[where.region] || H420_KEEP_OLD.nek)[where.tier] || 0.25;
    if (!oldTwin && h420OldSuits(where.region, rowName) && rng() < keep) return null;
    // The sparing count is per settlement; the countryside keeps one per region.
    const rural = this._h420Rural = this._h420Rural || {};
    const st = where.st || (rural[where.region] = rural[where.region] || { id: null, region: where.region, magic: 0, houses: 0 });
    const magicLeft = (st.magic + 1) * H420_MAGIC_ONE_IN <= st.houses + H420_MAGIC_ONE_IN;
    const tight = extra.dense || extra.terrace || extra.infill;
    const maxW = tight ? H420_MAX_W.dense : H420_MAX_W[where.tier];
    const p = pickHouse420(where.region, where.tier, rng, near, magicLeft, maxW);
    if (!p) return null;
    const h = HOUSE420[p.id];
    const drawnLeft = h.facing === 'southwest';
    const wantLeft = left || (!right && rng() < 0.5);
    const mirrored = drawnLeft !== wantLeft;
    const C = HOUSE420_CELL;
    const fx = mirrored ? (C - 1 - h.foot[0]) : h.foot[0];
    return {
      key: h420Key(h.sheet, mirrored), frame: h.row * 8 + p.variant, scale: h.scale,
      originX: (fx + 0.5) / C, originY: (h.foot[1] + 0.5) / C,
      facing: wantLeft ? 'southwest' : 'southeast', id: p.id, variant: p.variant, style: p.style,
      mirrored, settlement: st, magic: p.style === 'lightly magical',
    };
  },

  /** An old pool row for a house facing up-screen: its own if that suits the region and no neighbour has it. */
  _h420OldRow(wx, wy, row, where, rng) {
    const R = H420_SAME_OLD_TILES * TILE;
    const taken = new Set();
    for (const b of this.buildings || []) {
      if (!b || b.wall || !b.sprite || !b.sprite.texture || b.sprite.texture.key !== 'townPool') continue;
      const bx = b.anchorX ?? b.x, by = b.anchorY ?? b.y;
      if (Math.abs(bx - wx) > R || Math.abs(by - wy) > R || Math.hypot(bx - wx, by - wy) >= R) continue;
      taken.add(Math.floor(Number(b.sprite.frame.name) / 8));
    }
    if (h420OldSuits(where.region, TOWN_POOL_ROWS[row]) && !taken.has(row)) return null;
    const rows = [];
    TOWN_POOL_ROWS.forEach((n, i) => {
      if (n.startsWith('sign_') || n.startsWith('stone_a_') || TOWN_ROW_REMAP[i] !== i) return;
      if (h420OldSuits(where.region, n) && !taken.has(i)) rows.push(i);
    });
    if (!rows.length) return null;
    return { oldRow: rows[Math.floor(rng() * rows.length) % rows.length] };
  },

  /** Book-keeping once the swapped house is really standing (the sparing-magic count is per settlement). */
  _h420Placed(entry, sw) {
    entry.h420 = sw.id; entry.h420Variant = sw.variant; entry.h420Style = sw.style; entry.h420Mirrored = sw.mirrored;
    if (sw.settlement) { sw.settlement.houses++; if (sw.magic) sw.settlement.magic++; }
  },

  /** For the tests and the shots: what stands where. */
  _h420Census() {
    const out = { total: 0, oldPool: 0, shops: 0, byStyle: {}, byModel: {}, byRegionTier: {}, twins: 0, inCityBanned: 0 };
    const hs = (this.buildings || []).filter(b => b && b.house && b.sprite);
    for (const b of hs) {
      const w = this._h420Where(b.anchorX ?? b.x, b.anchorY ?? b.y, b);
      const k = `${w.region}/${w.tier}`;
      const o = out.byRegionTier[k] = out.byRegionTier[k] || { new: 0, old: 0, other: 0, styles: {} };
      if (b.h420) {
        out.total++; o.new++;
        out.byStyle[b.h420Style] = (out.byStyle[b.h420Style] || 0) + 1;
        out.byModel[b.h420] = (out.byModel[b.h420] || 0) + 1;
        o.styles[b.h420Style] = (o.styles[b.h420Style] || 0) + 1;
        if ((w.tier === 'city' || w.tier === 'town') && !HOUSE420[b.h420].city) out.inCityBanned++;
      } else if (b.shop) { out.shops++; } else if (b.sprite.texture.key === 'townPool') { out.oldPool++; o.old++; } else o.other++;
    }
    for (let i = 0; i < hs.length; i++) {
      const a = hs[i];
      if (!a.h420) continue;
      for (let j = i + 1; j < hs.length; j++) {
        const b = hs[j];
        if (b.h420 !== a.h420) continue;
        const d = Math.hypot((a.anchorX ?? a.x) - (b.anchorX ?? b.x), (a.anchorY ?? a.y) - (b.anchorY ?? b.y));
        if (d < 8 * TILE) out.twins++;
        if (d < H420_SAME_MODEL_TILES * TILE) (out.closePairs = out.closePairs || []).push([a.h420, Math.round(d / TILE), Math.round(a.anchorX), Math.round(a.anchorY), Math.round(b.anchorX), Math.round(b.anchorY)]);
      }
    }
    return out;
  },
};
