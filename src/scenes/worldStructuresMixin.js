// ============================================================================
// ROUND 400 -- INNS, DOJO HALLS AND THE MAGIC SOCIETY'S HALLS.
//
// Desktop\new-assets\structures (structures.json): single-direction art, south-east facing, 3/4 top-down, building
// only. The user, on scale: "Inns and Magic society should be scaled to the size adventure society building is scaled
// to. The dojos should be scaled like the houses." So an inn or a magic hall is drawn at the Adventure Society hall's
// display scale (TOWN_DISPLAY_SCALE x its civic multiplier) and a dojo at a house's (TOWN_DISPLAY_SCALE x the house
// multiplier) -- each at its own drawn size, never rescaled to a common one ("sizes are deliberate").
//
// ONE PLACER (`_placeArtBuilding`): the sprite stands on the art's anchor_bottom_centre; its collision is the
// RECTANGLE the game's footprint fit reads off the silhouette (`_artFootprint`, the round-256 V: the two front faces
// are the two world extents), claimed as solid tiles (`_claimFootprintTiles`) -- no circle. The door side is the
// bottom-right face (south-east): the interaction point stands a tile and a half out from the middle of that face,
// outside every claimed tile, and nothing is placed where that point is not clear ground.
//
//   INNS (`_buildRoadInns`, at world build; and one in some generated squares): beside the roads, outside the
//   settlements, the model chosen by setting -- a harbour on the coast, a watermill by a river, a crossroads where two
//   roads meet, a caravanserai in desert, a mountain lodge in the mountains, a stilt inn in the swamps, a treehouse in
//   forest, a hillside inn in open grassland. Each is an inn exactly as the towns' are (propertySignsMixin: the
//   VACANCY sign, a room for the night, the Innkeep's shelf).
//   MAGIC SOCIETY (`_buildMagicHalls`): one grand hall per major city where one fits -- never a bandit-held city --
//   with the Society's archivist at the door (the nine magical theories, and what the Society is).
//   DOJOS: martialMasterMixin asks for one per master (`_placeDojoFor`), cycling the four halls.
// ============================================================================
import { STRUCTURE_ART, INN_KEYS, DOJO_KEYS, MAGIC_KEYS } from '../data/structureArt.js';
import { REGIONS, regionPoint, desertStrength, MAP_TILES_TOTAL } from '../data/regions.js';
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { TOWN_DISPLAY_SCALE, isCarriagewayTile, TILE_WATER_DEEP, TILE_WATER_LIGHT, TILE_WATER_RAPIDS, isWaterTile } from '../data/town.js';
import { stableHash } from '../data/awakening.js';

// The Society hall's scale (round 372's civic multiplier for the guild) and a house's (round 372's 10% shrink).
export const SOCIETY_SCALE_MULT = 0.72;
export const HOUSE_SCALE_MULT_R400 = 0.9;
export const STRUCTURE_SCALE = {
  inn: TOWN_DISPLAY_SCALE * SOCIETY_SCALE_MULT,
  magic: TOWN_DISPLAY_SCALE * SOCIETY_SCALE_MULT,
  dojo: TOWN_DISPLAY_SCALE * HOUSE_SCALE_MULT_R400,
};
export const ST400_TEX = (key) => `st400_${key}`;
const DOOR_OUT = TILE * 1.6;          // the interaction point, out from the door face
const INNS_PER_REGION = 4;
const INN_SPACING = 140 * TILE;       // world px between two inns
const INN_FROM_TOWN = 34;             // tiles clear of any settlement's edge

export const WorldStructuresMixin = {
  /** Queue the fifteen images (called from preload). */
  _preloadR400Structures() {
    for (const [key, a] of Object.entries(STRUCTURE_ART)) {
      this.load.image(ST400_TEX(key), `./public/assets/structures/${a.file}`);
    }
  },

  /**
   * Stand one of the new buildings with its foot at (wx, wy). Returns the building entry, or null if the art is
   * missing or its footprint or door would land on water, a road, another building or anything solid -- in which
   * case nothing is left behind. `opts`: { clearRoads: true } refuses any road tile in the footprint;
   * { region } tags it (a generated square's buildings go when the square does).
   */
  _placeArtBuilding(key, wx, wy, opts = {}) {
    const a = STRUCTURE_ART[key];
    if (!a || !this.textures.exists(ST400_TEX(key))) return null;
    if (this._isWaterAt(wx, wy)) return null;
    const scale = STRUCTURE_SCALE[a.group] || TOWN_DISPLAY_SCALE;
    const p = isoProject(wx, wy);
    const sprite = this.add.image(p.x, p.y, ST400_TEX(key));
    sprite.setOrigin(a.footX / a.w, a.footY / a.h);
    sprite.setScale(scale);
    sprite.setDepth(isoDepth(wx, wy));
    const fp = this._artFootprint ? this._artFootprint(sprite) : null;
    if (!fp) { sprite.destroy(); return null; }
    // inset a little: the base's outermost pixels are eaves and steps, not wall
    const hw = fp.hw * 0.92, hh = fp.hh * 0.92;
    const e = {
      x: fp.x, y: fp.y, hw, hh, anchorX: wx, anchorY: wy, radius: Math.round(Math.hypot(hw, hh)),
      sprite, facing: 'southeast', artStructure: key, group: a.group, r400: true, fitted: true, region: opts.region || null,
    };
    // the door: the bottom-right face is world x = x + hw; its middle, out a tile and a half
    e.doorPoint = { x: e.x + hw + DOOR_OUT, y: e.y + hh * 0.15 };
    if (!this._artSiteClear(e, opts)) { sprite.destroy(); return null; }
    e.claimed = this._claimFootprintTiles ? this._claimFootprintTiles(e) : [];
    this.buildings = this.buildings || [];
    this.buildings.push(e);
    (this._occludables = this._occludables || []).push(e);
    this._clearScatterInRect(e);
    this._staticGrid = null;
    if (this._rebuildStaticGrid && this._r400Booted) this._rebuildStaticGrid();
    return e;
  },

  /** Is the footprint (and the door) on clear, dry ground, off the roads and clear of every other building? */
  _artSiteClear(e, opts = {}) {
    const x0 = e.x - e.hw, x1 = e.x + e.hw, y0 = e.y - e.hh, y1 = e.y + e.hh;
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor(y1 / TILE); ty++) {
      for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
        const t = this._tileTypeAt(tx, ty);
        if (isWaterTile(t)) return false;
        if (opts.clearRoads !== false && isCarriagewayTile(t)) return false;
        if (this._solidTiles && this._solidTiles.has(ty * MAP_TILES_TOTAL + tx)) return false;
      }
    }
    for (const b of (this.buildings || [])) {
      if (!b || b.wall || b.fence) continue;
      const bx = b.anchorX ?? b.x, by = b.anchorY ?? b.y;
      if (b.hw > 0) {
        if (Math.abs(b.x - e.x) < b.hw + e.hw + TILE * 2 && Math.abs(b.y - e.y) < b.hh + e.hh + TILE * 2) return false;
      } else if (Math.hypot(bx - e.x, by - e.y) < (b.radius || 60) + Math.max(e.hw, e.hh) + TILE * 2) return false;
    }
    // ROUND 400 -- a building out in the country keeps its distance from the road, most of all BEHIND it: the art
    // rises up-screen over the ground behind its base, and a road running there reads as running through the house.
    if (opts.roadMargin) {
      const m = opts.roadMargin * TILE, back = (opts.roadMargin + 6) * TILE;
      for (let ty = Math.floor((y0 - back) / TILE); ty <= Math.floor((y1 + m) / TILE); ty++) {
        for (let tx = Math.floor((x0 - back) / TILE); tx <= Math.floor((x1 + m) / TILE); tx++) {
          if (isCarriagewayTile(this._tileTypeAt(tx, ty))) return false;
        }
      }
    }
    const d = e.doorPoint;
    if (this._isWaterAt(d.x, d.y)) return false;
    // the door must not open onto another building or a wall (trees and rocks there are cleared)
    for (const b of (this.buildings || [])) {
      if (b && b.hw > 0 && Math.abs(d.x - b.x) < b.hw && Math.abs(d.y - b.y) < b.hh) return false;
    }
    return true;
  },

  /** Trees and rocks inside the footprint, or on the walk to the door, are cleared. */
  _clearScatterInRect(e) {
    // the footprint and a tile round it, and the ground in FRONT (the two faces that show, +x and +y) four tiles out,
    // so a tree never stands in front of the door or across the face of the building
    const inside = (x, y) => (x > e.x - e.hw - TILE && x < e.x + e.hw + TILE * 4 && y > e.y - e.hh - TILE && y < e.y + e.hh + TILE * 4)
      || (e.doorPoint && Math.hypot(x - e.doorPoint.x, y - e.doorPoint.y) < TILE * 2.5);
    const t0 = (this.forestTrees || []).length, r0 = (this.obstacles || []).length;
    if (this.forestTrees) this.forestTrees = this.forestTrees.filter(t => t.placed || !inside(t.x, t.y));
    if (this.obstacles) this.obstacles = this.obstacles.filter(r => r.placedBy === 'hand' || !inside(r.x, r.y));
    if (this.forestTrees && this.forestTrees.length !== t0) {
      this.forestTrees.forEach((t, i) => { t.id = i; });
      if (this._r400Booted && this._updateForestViewport) this._updateForestViewport(true);
    }
    if (this.obstacles && this.obstacles.length !== r0) {
      this.obstacles.forEach((o, i) => { o.id = i; });
      if (this._r400Booted && this._updateRockViewport) this._updateRockViewport(true);
    }
  },

  /** Take one down: the sprite, the entry and its solid tiles. */
  _removeArtBuilding(e) {
    if (!e) return;
    if (e.sprite) { e.sprite.destroy(); e.sprite = null; }
    this.buildings = (this.buildings || []).filter(b => b !== e);
    this._occludables = (this._occludables || []).filter(b => b !== e);
    if (this._solidTiles && e.claimed) for (const k of e.claimed) this._solidTiles.delete(k);
    e.claimed = [];
    this._staticGrid = null;
    if (this._rebuildStaticGrid && this._r400Booted) this._rebuildStaticGrid();
  },

  /** A generated square is going: its inn, its dojo and their keepers go too. */
  _r400Teardown(region) {
    if (!region) return;
    for (const b of (this.buildings || []).filter(b => b && b.r400 && b.region === region.id)) this._removeArtBuilding(b);
  },

  // ---------------------------------------------------------------- INNS
  /** The inn a setting asks for, read off the ground around (wx, wy) in `region`. */
  _innKindAt(region, wx, wy, junction) {
    const tx0 = Math.floor(wx / TILE), ty0 = Math.floor(wy / TILE);
    let deep = 0, river = 0, n = 0;
    for (let dy = -18; dy <= 18; dy += 3) for (let dx = -18; dx <= 18; dx += 3) {
      const t = this._tileTypeAt(tx0 + dx, ty0 + dy);
      n++;
      if (t === TILE_WATER_DEEP) deep++;
      else if ((t === TILE_WATER_LIGHT || t === TILE_WATER_RAPIDS) && !region.lava) river++;   // a lava river turns no wheel
    }
    if (deep / n > 0.12) return 'inn_harbour';
    if (river / n > 0.03) return 'inn_watermill';
    if (junction) return 'inn_crossroads';
    let desert = 0;
    try {
      if (!region.generated) {
        const o = regionPoint(region, { tx: 0, ty: 0 });
        desert = desertStrength(region, Math.floor((wx - o.x) / TILE), Math.floor((wy - o.y) / TILE)) || 0;
      }
    } catch (e) { desert = 0; }
    const ground = String(region.ground || region.accentPack || '');
    if (desert > 0.3 || /dry|sand|desert/.test(ground) || region.id === 'sirukh') return 'inn_caravanserai';
    if (/mountain|snow|rocky/.test(ground) || region.id === 'elehyd' || region.id === 'cinder') return 'inn_mountain_lodge';
    if (/swamp|jungle_soil|bog|marsh/.test(ground) || region.waterPack === 'slate_dark') return 'inn_swamp_stilt';
    // forest: trees close by
    let trees = 0;
    for (const t of (this.forestTrees || [])) {
      if (Math.abs(t.x - wx) < TILE * 22 && Math.abs(t.y - wy) < TILE * 22) { trees++; if (trees > 14) break; }
    }
    if (trees > 14 || (region.forestDensity || 0) > 1.05) return 'inn_treehouse';
    return 'inn_hillside';
  },

  /** Stand an inn beside the road at road point (wx, wy) (going along (ux, uy)); its keeper at the door. */
  _tryInnBeside(region, wx, wy, ux, uy, kind, opts = {}) {
    const a = STRUCTURE_ART[kind];
    if (!a) return null;
    const scale = STRUCTURE_SCALE.inn;
    const reach = ((a.bbox[2] - a.bbox[0]) * scale) / 2;   // about the footprint's half-diagonal, on screen
    for (const side of [1, -1]) {
      for (const extra of [6, 10, 15, 21, 28]) {
        const off = reach * 0.75 + extra * TILE;
        const fx = wx + (-uy) * side * off, fy = wy + ux * side * off;
        const e = this._placeArtBuilding(kind, Math.round(fx / TILE) * TILE, Math.round(fy / TILE) * TILE, { region: opts.region || null, roadMargin: 3 });
        if (!e) continue;
        e.innR400 = true;
        e.innName = opts.name || this._innNameFor(kind, region, fx, fy);
        e.settlement = null;
        const d = e.doorPoint;
        (this._pendingNpcs = this._pendingNpcs || []).push({
          name: 'Innkeep', artKey: null, sprite: null, x: d.x, y: d.y, facing: 'southeast',
          shopId: 'tavern', dialogue: 'Rooms upstairs, food at the bar. Mind the step.', r400Inn: e,
        });
        return e;
      }
    }
    return null;
  },

  _innNameFor(kind, region, x, y) {
    let h = stableHash(`inn|${kind}|${Math.round(x)}|${Math.round(y)}`); h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0);
    const NAMES = {
      inn_crossroads: ['The Four Ways', 'The Signpost', 'The Parting Roads', 'The Waymeet'],
      inn_harbour: ['The Lantern Quay', 'The Salt Light', 'The Mooring Rope', 'The Gull and Beacon'],
      inn_mountain_lodge: ['The Snowcap Lodge', 'The High Hearth', 'The Pinewood Lodge', 'The Cold Pass'],
      inn_caravanserai: ['The Dune Gate', 'The Camel\'s Rest', 'The Sandwell Serai', 'The Long Shade'],
      inn_swamp_stilt: ['The Stilted Heron', 'The Dry Plank', 'The Mire Lantern', 'The Reed House'],
      inn_hillside: ['The Green Door', 'The Turf and Barrel', 'The Hill Hollow', 'The Round Window'],
      inn_treehouse: ['The Old Bough', 'The Rookery', 'The Heartwood', 'The Leaf and Ladder'],
      inn_watermill: ['The Millwheel', 'The Turning Wheel', 'The Weir House', 'The Millrace'],
    };
    const list = NAMES[kind] || ['The Wayside Inn'];
    const used = this._innNamesUsed || (this._innNamesUsed = new Set());
    for (let k = 0; k < list.length; k++) {
      const n = `${list[(h + k) % list.length]} (${region.name})`;
      if (!used.has(n)) { used.add(n); return n; }
    }
    return `${list[h % list.length]} (${region.name})`;
  },

  /** At world build: inns along each authored region's roads, by setting, spaced well apart. */
  _buildRoadInns() {
    this._r400Inns = [];
    for (const region of REGIONS) {
      if (region.generated) continue;
      const towns = (region.settlements || []).map(st => ({ st, c: regionPoint(region, st.at), r: (st.radius || 10) }));
      const roads = (region.roads || []).map(rd => (rd.points || []).map(p => regionPoint(region, p)));
      // candidate road points: every ~60 tiles along each road, and where two roads meet
      const cands = [];
      roads.forEach((pts, ri) => {
        let acc = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const A = pts[i], B = pts[i + 1];
          const L = Math.hypot(B.x - A.x, B.y - A.y);
          if (!(L > 0)) continue;
          for (let s = (60 * TILE - acc); s < L; s += 60 * TILE) {
            const x = A.x + (B.x - A.x) * s / L, y = A.y + (B.y - A.y) * s / L;
            cands.push({ x, y, ux: (B.x - A.x) / L, uy: (B.y - A.y) / L, ri });
          }
          acc = (acc + L) % (60 * TILE);
        }
      });
      for (const c of cands) {
        c.junction = roads.some((pts, rj) => rj !== c.ri && pts.some(q => Math.hypot(q.x - c.x, q.y - c.y) < 14 * TILE));
      }
      const clearOfTowns = (c) => towns.every(t => Math.hypot(t.c.x - c.x, t.c.y - c.y) > (t.r + INN_FROM_TOWN) * TILE);
      const pool = cands.filter(clearOfTowns);
      // junctions first, then a spread
      pool.sort((p, q) => (q.junction - p.junction) || ((stableHash(`innc|${region.id}|${Math.round(p.x)}`) % 997) - (stableHash(`innc|${region.id}|${Math.round(q.x)}`) % 997)));
      const used = [];
      const kinds = new Set();
      for (const c of pool) {
        if (used.length >= INNS_PER_REGION) break;
        if (used.some(u => Math.hypot(u.x - c.x, u.y - c.y) < INN_SPACING)) continue;
        let kind = this._innKindAt(region, c.x, c.y, c.junction);
        if (kinds.has(kind) && kind === 'inn_crossroads') kind = this._innKindAt(region, c.x, c.y, false);
        const e = this._tryInnBeside(region, c.x, c.y, c.ux, c.uy, kind);
        if (!e) continue;
        used.push({ x: c.x, y: c.y });
        kinds.add(kind);
        this._r400Inns.push(e);
      }
    }
    return this._r400Inns.length;
  },

  /** A generated square: an inn on its road, about half the time, the model by the square's own ground. */
  _squareInn(region, plan) {
    const seed = (plan && plan.seed) || 0;
    if ((seed % 100) >= 45) return null;
    const rd = (region.roads || [])[0];
    if (!rd || !rd.points || rd.points.length < 2) return null;
    const pts = rd.points.map(p => regionPoint(region, p));
    const mid = Math.floor(pts.length / 2);
    const A = pts[Math.max(0, mid - 1)], B = pts[Math.min(pts.length - 1, mid)];
    const L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const junction = (region.roads || []).length >= 3;
    const kind = this._innKindAt(region, (A.x + B.x) / 2, (A.y + B.y) / 2, junction);
    const e = this._tryInnBeside(region, (A.x + B.x) / 2, (A.y + B.y) / 2, (B.x - A.x) / L, (B.y - A.y) / L, kind, { region: region.id });
    if (e && this._drainPendingNpcs) this._drainPendingNpcs();
    return e;
  },

  // ---------------------------------------------------------------- THE MAGIC SOCIETY
  /** One grand hall per major city where one fits, never a bandit-held one, and its archivist at the door. */
  _buildMagicHalls() {
    this._r400Magic = [];
    let i = 0;
    for (const region of REGIONS) {
      if (region.generated) continue;
      for (const st of (region.settlements || [])) {
        if (st.kind !== 'city' || st.bandit) continue;
        const key = MAGIC_KEYS[i % MAGIC_KEYS.length];   // the three halls in turn, city by city
        const e = this._placeCityMagicHall(region, st, key);
        if (e) { this._r400Magic.push(e); i++; }
      }
    }
    return this._r400Magic.length;
  },

  /** Search the city outward from a third of its radius for ground the hall's footprint fits. */
  _placeCityMagicHall(region, st, key) {
    const c = regionPoint(region, st.at);
    const R = (st.radius || 30) * TILE;
    for (let ring = 0.3; ring <= 1.25; ring += 0.08) {
      for (let k = 0; k < 24; k++) {
        const th = (k / 24) * Math.PI * 2 + ring * 3.1;
        const x = Math.round((c.x + Math.cos(th) * R * ring) / TILE) * TILE;
        const y = Math.round((c.y + Math.sin(th) * R * ring) / TILE) * TILE;
        const e = this._placeArtBuilding(key, x, y, {});
        if (!e) continue;
        e.magicHall = true; e.settlement = st.id; e.service = null;
        e.hallName = `The Magic Society of ${st.name}`;
        // ROUND 401 -- the hall's people (the archivist among them) are the Society's own: societyMixin _staffMagicHalls
        return e;
      }
    }
    return null;
  },

  /** The archivist: what the Society is, and the nine theories it keeps. */
  _magicSocietyTalk(npc) {
    const body = [
      `${npc.hallName || 'The Magic Society'}.`,
      '',
      '"Scholars and ritualists. We study what essences do and what rituals can be made to do -- and we keep the',
      'nine theories of ritual magic. Study one and the rituals open to you; a mind holds only one."',
    ].join('\n');
    this._openDialogue(npc.name, body, npc, [{ act: 'magicSociety|theories', label: 'The nine theories' }]);
  },
};
