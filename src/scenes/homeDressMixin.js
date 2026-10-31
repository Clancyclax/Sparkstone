// ============================================================================
// ROUND 421 -- A HOME THAT SAYS WHO LIVES IN IT: THE SCENE SIDE. The rules are src/data/homeDress421.js.
//
// Wired in at four places, each a call that does nothing when this file is absent:
//   _enterGenericBuilding  -> _h421Plan / _h421Apply   a house's ground floor (and its floors above)
//   _clFillHome            -> _h421Household / spots   who lives here, what they do, and where they stand
//   after the footprints   -> _h421Laundry             washing lines beside some houses, outdoors
//   the pool rooms         -> _h421Stamp               the floor re-laid at the house's own size
// ============================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import {
  dressHome, HOME_SIZES, HOME_MAX_W, HOME_MAX_H, STYLE_CULTURE, POOL_CULTURE, CULTURE_DRESS, TRADE_PIECE,
} from '../data/homeDress421.js';
import { dressRoundhouse, roundWalkable } from '../data/homeDress422.js';
import { roomFloorPaintRect, TILE_VOID, houseUpRoomId, HOUSE_UP_SETS, interiorRoomById, INTERIOR_PROPS, INTERIOR_PROP_ART } from '../data/interiors.js';
import { TOWN_POOL_ROWS, isCarriagewayTile } from '../data/town.js';
import { HOUSE420 } from '../data/houseArt420.js';
import { householdFor } from '../data/cityLife.js';
import { BANDIT_CITY_BY_ID } from '../data/banditCities.js';

/** Houses that read as well-off or as poor, by their drawing. */
const WELL_STYLES = new Set(['regency_villa', 'baroque_house', 'georgian_manor', 'georgian_town', 'vic_mansard', 'vic_turret',
  'rom_villa', 'indian_palace_house', 'egypt_villa', 'venetian_house', 'tudor_manor', 'alpine_chalet', 'persian_house',
  'indian_haveli', 'gothic_merchant', 'dutch_bell', 'chinese_tower']);
const POOR_STYLES = new Set(['crofter', 'swamp_shack', 'stilt_fisher', 'norse_turf', 'celtic_round', 'alpine_hut',
  'med_longhouse', 'rom_insula', 'desert_adobe', 'norse_fisher', 'lake_house']);
const STRUCT_CULTURE = { cabin: 'rustic', cabinwealthy: 'rustic', cabinsnowy: 'cold', brickhouse: 'town', farmhouse: 'rustic', shack: 'rustic' };
/** The trades a household's first member may be given by where they live, before the generic list. */
const LOCAL_TRADES = { water: 'a fisher', cinder: 'a smith', elehyd: 'a carpenter', bratugal: 'a weaver', sirukh: 'a dyer', ixcuatl: 'a herbalist' };

export const HomeDressMixin = {
  /** Does this building get a dressed home? Every dwelling does; shops, sheds, barns and the dark church do not. */
  _h421Wants(b) {
    if (!b || !b.house || b.darkChurch || b.shop || b.clShed || b.diveTavern || b.bookshop || b.clSite || b.singleton || b.service) return false;
    const model = this._buildingModel ? this._buildingModel(b) : 'house';
    return !model || model === 'house' || STRUCT_CULTURE[model] !== undefined;
  },

  /** The household, with its first member's trade made local (a fisher by the water, a smith in the Cinderwaste). */
  _h421Household(b) {
    const key = `${Math.round(b.anchorX ?? b.x)}|${Math.round(b.anchorY ?? b.y)}`;
    this._h421HH = this._h421HH || new Map();
    if (this._h421HH.has(key)) return this._h421HH.get(key);
    const hh = householdFor(key);
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) >>> 0;
    const roll = (h % 1000) / 1000;
    const where = this._h420Where ? this._h420Where(b.anchorX ?? b.x, b.anchorY ?? b.y, b) : null;
    const nearWater = this._h421NearWater(b);
    const local = nearWater ? LOCAL_TRADES.water : (where && LOCAL_TRADES[where.region]);
    if (hh.people[0] && local && roll < (nearWater ? 0.5 : 0.25)) hh.people[0] = { ...hh.people[0], trade: local };
    this._h421HH.set(key, hh);
    return hh;
  },

  _h421NearWater(b) {
    if (!this._isWaterAt) return false;
    const x = b.anchorX ?? b.x, y = b.anchorY ?? b.y;
    for (let r = 4; r <= 12; r += 4) for (let a = 0; a < 8; a++) {
      const t = a * Math.PI / 4;
      if (this._isWaterAt(x + Math.cos(t) * r * TILE, y + Math.sin(t) * r * TILE)) return true;
    }
    return false;
  },

  /** What the house is, from its drawing and where it stands. */
  _h421Context(b) {
    let culture = null, style = b.h420 || null;
    if (b.h420Style) culture = STYLE_CULTURE[b.h420Style];
    if (!culture && b.sprite && b.sprite.texture && b.sprite.texture.key === 'townPool') {
      const name = TOWN_POOL_ROWS[Math.floor(Number(b.sprite.frame.name) / 8)] || '';
      const fam = Object.keys(POOL_CULTURE).find(f => name.startsWith(f + '_'));
      culture = fam ? POOL_CULTURE[fam] : 'town';
    }
    const model = this._buildingModel ? this._buildingModel(b) : null;
    if (!culture && STRUCT_CULTURE[model]) culture = STRUCT_CULTURE[model];
    const where = this._h420Where ? this._h420Where(b.anchorX ?? b.x, b.anchorY ?? b.y, b) : { region: 'nek', tier: 'rural' };
    if (!culture) culture = where.region === 'elehyd' ? 'cold' : 'town';
    let klass = 'modest';
    if (BANDIT_CITY_BY_ID[b.settlement] || b.slum || POOR_STYLES.has(style) || model === 'shack') klass = 'poor';
    else if (WELL_STYLES.has(style) || model === 'cabinwealthy') klass = 'well';
    // the size, from the width the house is drawn at
    let wpx = 0;
    if (b.h420 && HOUSE420[b.h420]) { const h = HOUSE420[b.h420]; wpx = (h.bbox[2] - h.bbox[0]) * h.scale; }
    else if (this._artBox && b.sprite) { try { wpx = this._artBox(b.sprite).w; } catch (e) { wpx = 0; } }
    const size = wpx && wpx < 235 ? 'small' : wpx >= 305 ? 'large' : 'standard';
    const held = !!(this._homeHeld && this._homeHeld(b));
    const hh = held ? null : this._h421Household(b);
    const trade = hh && hh.people[0] ? (TRADE_PIECE[hh.people[0].trade] || null) : null;
    return { key: `${Math.round(b.anchorX ?? b.x)}|${Math.round(b.anchorY ?? b.y)}`, culture, klass, trade, size, held, style,
      household: hh ? hh.people.length : 1, region: where.region, tier: where.tier };
  },

  /** The plan for a house's ground floor (nothing is changed yet). */
  _h421Plan(b, storeys) {
    const ctx = this._h421Context(b);
    const hour = this._clHour ? this._clHour() : 12;
    const hh = ctx.held ? null : this._h421Household(b);
    const home = ctx.held ? 1 : (hh ? hh.people.filter(p => (hour >= 20 || hour < 7) || p.dayHome).length : 1);
    // ROUND 422 -- the Celtic roundhouse is one round room on the ground, whatever its drawing's storey count
    if (ctx.style === 'celtic_round') {
      const base = { ...ctx, storeys: 1, hour, home, klass: ctx.held ? 'well' : ctx.klass };
      return { ctx: base, ground: dressRoundhouse({ ...base, level: 0 }) };
    }
    const base = { ...ctx, storeys, hour, home, klass: ctx.held ? 'well' : ctx.klass };
    return { ctx: base, ground: dressHome({ ...base, level: 0 }) };
  },

  /** Re-lay the pool room's floor at its new size: floor inside, nothing outside, across the whole reserved block. */
  _h421Stamp(room) {
    if (!room || !this._setTile) return;
    const t0x = Math.floor(room.x / TILE), t0y = Math.floor(room.y / TILE);
    const paint = roomFloorPaintRect(room);
    const tile = this._h421FloorTile ? this._h421FloorTile(room.floor) : null;
    for (let ty = -1; ty <= HOME_MAX_H; ty++) {
      for (let tx = -1; tx <= HOME_MAX_W; tx++) {
        const cx = (t0x + tx) * TILE + TILE / 2, cy = (t0y + ty) * TILE + TILE / 2;
        let inside = cx >= paint.x0 && cx < paint.x1 && cy >= paint.y0 && cy < paint.y1;
        if (room.roundFloor) inside = tx >= 0 && ty >= 0 && tx < room.w && ty < room.h && room.roundWalkable(tx, ty);   // ROUND 422
        this._setTile(t0x + tx, t0y + ty, inside && tile !== null ? tile : TILE_VOID);
      }
    }
    if (this._insideRoom === room && this._updateGroundViewport) this._updateGroundViewport(true);
  },

  /** Size a pool room (and keep the door in the middle of its south wall). */
  _h421Size(room, w, h) {
    if (room.w === w && room.h === h && room._h421Floor === room.floor && (room._h421Round || 0) === (room.roundFloor || 0)) return;
    room._h421Round = room.roundFloor || 0;
    room.w = w; room.h = h;
    room.door = { at: Math.floor(w / 2) - 1, span: room.door ? room.door.span : 2 };
    room._h421Floor = room.floor;
    this._h421Stamp(room);
  },

  /** Put a plan into a (just undressed) pool room. */
  _h421Apply(room, b, plan, storeys) {
    const g = plan.ground;
    // ROUND 422 -- the round room, or back to a rectangle
    room.roundFloor = g.round || 0;
    room.roundWalkable = g.round ? (tx, ty) => roundWalkable(g.round, tx, ty) : null;
    room._h422Ctx = { ...plan.ctx, level: 0 };
    room._h422Hearth = null;
    if (g.round) storeys = 1;
    room.floor = g.floor;
    room.kitMaterial = g.kit;
    this._h421Size(room, g.w, g.h);
    room.name = g.name;
    room.blurb = g.blurb;
    room.props = g.props.map(p => ({ ...p }));
    room.partitions = g.walls.length ? g.walls.map(w => ({ ...w, gap: w.gap ? [...w.gap] : undefined })) : null;
    room._layoutId = `h421:${plan.ctx.culture}:${plan.ctx.size}:${storeys > 1 ? 'multi' : 'one'}`;
    room._homeSpots = g.spots;
    room._h421 = plan.ctx;
    room.inners = null;
    if (storeys > 1) this._h421Upper(room, b, plan, storeys);
  },

  /** The floors above: the same footprint, bedrooms and an attic, joined by the stair on the west wall. */
  _h421Upper(room, b, plan, storeys) {
    const set = (room.houseSlot || 0) % HOUSE_UP_SETS;
    const levels = Math.min(storeys - 1, 2);
    const g = plan.ground;
    room.inners = [{ tx: g.stair.tx, ty: g.stair.ty, toRoom: houseUpRoomId(set, 1), label: 'go upstairs' }];
    for (let level = 1; level <= 2; level++) {
      const up = interiorRoomById(houseUpRoomId(set, level));
      if (!up) continue;
      this._undressHouseRoom(up);
      up._contentsBuilt = false;
      if (level > levels) { up.props = []; up.inners = []; up.partitions = null; continue; }
      const L = dressHome({ ...plan.ctx, level, climbsOn: level === 1 && levels >= 2 });
      up.floor = L.floor;
      up.kitMaterial = L.kit;
      this._h421Size(up, L.w, L.h);
      up.name = L.name;
      up.blurb = L.blurb;
      up.props = L.props.map(p => ({ ...p }));
      up.partitions = L.walls.length ? L.walls.map(w => ({ ...w, gap: w.gap ? [...w.gap] : undefined })) : null;
      up.inners = [{ tx: L.stair.tx, ty: L.stair.ty, toRoom: level === 1 ? room.id : houseUpRoomId(set, 1), label: 'go downstairs' }];
      if (L.stairUp) up.inners.push({ tx: L.stairUp.tx, ty: L.stairUp.ty, toRoom: houseUpRoomId(set, 2), label: 'go up to the attic' });
      up._homeSpots = L.spots;
      up._forBuilding = b;
      up._h422Ctx = { ...plan.ctx, level };   // ROUND 422 -- windows, tabletops and the sleepers up here
      up.roundFloor = 0; up.roundWalkable = null; up._h422Hearth = null;
    }
  },

  /** A pool room going back to the old 11 x 9 layouts (a barn, a shed, a store). */
  _h421Standard(room) {
    room.roundFloor = 0; room.roundWalkable = null; room._h422Ctx = null; room._h422Hearth = null;   // ROUND 422
    room.kitMaterial = null;
    room.partitions = null;
    room.floor = 'hall';
    this._h421Size(room, HOME_SIZES.standard.w, HOME_SIZES.standard.h);
  },

  // ------------------------------------------------------------------------------------------- outdoors
  /** ROUND 421 -- "laundry_line also works outdoors beside houses": a washing line on the yard side of some houses
   *  outside the packed city blocks (the slums already hang theirs across the alleys). */
  _h421Laundry() {
    const def = INTERIOR_PROPS.laundryLine, dyed = INTERIOR_PROPS.laundryLineDyed;
    if (!def || !this.textures.exists(INTERIOR_PROP_ART.key)) return 0;
    let n = 0;
    const placed = [];
    for (const b of this.buildings || []) {
      if (!b || !b.house || b.wall || b.dense || b.terrace || b.slum || b.shop || !b.sprite) continue;
      const key = `${Math.round(b.anchorX ?? b.x)}|${Math.round(b.anchorY ?? b.y)}`;
      let h = 0;
      for (let i = 0; i < key.length; i++) h = (Math.imul(h, 33) + key.charCodeAt(i)) >>> 0;
      if (h % 100 >= 14 || n >= 140) continue;
      const hw = (b.hw || 2 * TILE), hh = (b.hh || 2 * TILE);
      // the side away from the door: a house facing south-west hangs its washing on its north-east side
      const sides = b.facing === 'southwest' ? [[hw + TILE * 1.6, 0], [0, -hh - TILE * 1.6]] : [[0, -hh - TILE * 1.6], [hw + TILE * 1.6, 0]];
      for (const [dx, dy] of sides) {
        const x = b.x + dx, y = b.y + dy;
        if (this._collidesObstacle && this._collidesObstacle(x, y, 18)) continue;
        if (this._isWaterAt && this._isWaterAt(x, y)) continue;
        if (this._tileTypeAt && isCarriagewayTile(this._tileTypeAt(Math.floor(x / TILE), Math.floor(y / TILE)))) continue;
        if (placed.some(p => Math.hypot(p.x - x, p.y - y) < TILE * 8)) continue;
        const p = isoProject(x, y);
        const s = this.add.image(p.x, p.y, INTERIOR_PROP_ART.key, (h & 1) && dyed ? dyed.idx : def.idx).setOrigin(0.5, 1);
        if (dx === 0) s.setFlipX(true);
        s.setDepth(isoDepth(x, y));
        (this._h421Outdoor = this._h421Outdoor || []).push(s);
        // two posts, each a small disc (the grid picks these up in _rebuildStaticGrid)
        const off = dx === 0 ? [TILE * 0.55, 0] : [0, TILE * 0.55];
        for (const sg of [-1, 1]) (this._h421Solids = this._h421Solids || []).push({ x: x + sg * off[0], y: y + sg * off[1], radius: 5, laundry: true });
        placed.push({ x, y });
        n++;
        break;
      }
    }
    this._h421LaundryCount = n;
    return n;
  },
};
