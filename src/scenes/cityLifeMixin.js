// ============================================================================
// ROUND 373 -- CADENCE, LIVED IN: THE SCENE SIDE.
//
// The rules (the clock, the calendar, the crier's news, who lives where) are in src/data/cityLife.js; this is the part
// that needs a scene. It is wired in at nine places in WorldScene, each a one-line call that does nothing if this file
// is absent:
//
//   _buildCadenceMap      -> _clPlaceSites      the barracks, library and bathhouse; ground cleared for the cemetery and
//                                               the fish market; a second infill of houses and outbuildings
//   _buildCityProps       -> _clProps           everything that stands in the street: stones, dummies, signs, laundry,
//                                               flower boxes, banners, the fish stalls, the crier's box, market-day stalls
//   _buildInteriors       -> _clDoors           a door on the tavern (it had none), and the new buildings' door labels
//   _buildStableYards     -> _clYard            the caravan yard: wagons on show, the board, a hand
//   after _buildGuards    -> _buildCityLife     the people: crier, lamplighters, the barracks yard, the road wagons
//   update                -> _cityLifeTick      the clock running all of it
//   _enterGenericBuilding -> _clLayoutGeneric / _clFurnishGeneric   who and what is inside
//   the E dispatch        -> _cityLifeTalk / _cityLifeAct
//   _damageMonster/_killMonster -> the training dummies never die
//
// NO HORSES. The user: "No horses or draft animals", "just using the existing low rank vehicles powered by magic." The
// yard's stock and the wagons on the roads are the covered and plated wagons (vehicles.js wagon_wood, wagon_metal), each
// with a faint blue rune-glow where the axle would be: they drive themselves.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { REGIONS, regionPoint } from '../data/regions.js';
import { TILE_CITY, isCarriagewayTile, TOWN_POOL_ROWS, TOWN_DISPLAY_SCALE } from '../data/town.js';
import { CADENCE_DISTRICTS } from '../data/cadence.js';
import { roomTileCentre, HOUSE_LAYOUTS } from '../data/interiors.js';
import { grantCoins, spendCoins, CONSUMABLE_DEFS } from '../data/inventory.js';
import { ESSENCE_IDS, ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import { STONE_IDS, STONE_CATALOG } from '../data/stoneCatalog.js';
import { VEHICLE_BY_ID, VEHICLE_COLOURS, VEHICLE_WORLD_SCALE, VEHICLE_WORLD_RADIUS } from '../data/vehicles.js';
import { ADV_BY_ID, ADV_TEAM_BY_ID } from '../data/adventurers.js';
import { mansionHousehold } from '../data/mansions.js';
import { CITYLIFE_FRAMES, LIT_POOL_ROWS, LIT_LARGE_ROWS } from '../data/cityLifeArt.js';
import {
  GODS8, GOD_NAME, stallsOpen, TEMPLE_HOURS, inTempleHours, worshippersAt, tavernCrowdAt, sheltersFrom, RAIN_HURRY,
  LAMPLIGHT, isMarketDay, holyDayGod, nextHolyDay, PROCESSION_HOURS, PROCESSION_SIZE, HOLY_BLESSING, BLESSING_SECONDS,
  HOLY_GIFT, HOLY_QUEST_KIND, HOLY_LINES, crierHeadlines, fameTier, FAME_GREETINGS, deedRumour, OLD_GRAVES, epitaphFor,
  funeralFor, householdFor, homeAt, DISTRICT_SOUNDS, TEMPLE_BELL, HEAVY_RAIN, MARKET_WEEK, MARKET_DAY, hashStr,
} from '../data/cityLife.js';
// ROUND 388 -- "route the lamplighters on roads": the leg planner (the game's A* on a road-only grid)
import { lampAccess, planLampLeg, legPoints, pointAlong, legEstimate, LAMP_LEG_EXPAND, LAMP_PLANS_PER_FRAME } from '../data/lampRoute.js';

export const CL_ART = { key: 'cityLife', file: './public/assets/citylife/citylife.png', cell: 80, scale: 1.95, footX: 0.5, footY: 0.94 };
export const CL_TRAVELLER_SHOP = 'market_traveller';
/** ROUND 403/407 -- the round-373 hanging shop signs (tankard, anvil, book, bath, fish ...) are retired. */
export const CL_SIGNS_RETIRED = true;
const CITY = 'nek_city';
import { SHELF_IDS } from './bookshopMixin.js';

/** Where the new places go, in tiles from Cadence's centre (cadence.js's frame). Each is one street block of the drawn
 *  city, chosen off a dump of the built map: the empty block in the south-west corner for the barracks and its yard,
 *  the block behind the War and Healing temples for the cemetery, the block below the market square for the fish
 *  market, and a block either side of the plaza for the library and the bathhouse. */
export const CL_SITES = {
  barracks: { block: [-185, 139, -161, 163], at: [-174, 145], tex: 'townLarge', row: 'mansion_c_charcoal', scale: 0.6, name: 'the Guard Barracks', label: 'enter the barracks', sign: 'shield' },
  library: { block: [4, 4, 28, 28], at: [16, 14], tex: 'townLarge', row: 'mansion_a_charcoal', scale: 0.52, name: 'the Cadence Library', label: 'enter the library', sign: 'book' },
  bathhouse: { block: [-50, 4, -26, 35], at: [-38, 16], tex: 'townPool', row: 'greek_native', scale: 1.22, name: 'the Bathhouse', label: 'enter the bathhouse', sign: 'bath' },
};
/** ROUND 404 -- a bookshop: shelves along the north and west walls (bookshopMixin `_buildShelves`), the counter with the
 *  bookseller behind it, a reading corner. */
export const BOOKSHOP_PROPS = [
  { key: 'counterLong', tx: 7, ty: 4 }, { key: 'rugRound', tx: 4.6, ty: 5 }, { key: 'chairPadded', tx: 2.4, ty: 5.6 },
  { key: 'doorMat', tx: 5, ty: 7 },
];
export const BOOKSHOP_SHELVES = [
  { wall: 'north', at: 1.6 }, { wall: 'north', at: 3.1 }, { wall: 'north', at: 4.6 }, { wall: 'north', at: 6.1 }, { wall: 'north', at: 7.6 },
  { wall: 'west', at: 2.4 }, { wall: 'west', at: 3.9 },
];
export const CL_CLEAR = {
  cemetery: [166, 139, 190, 163],
  fishmarket: [-104, 85, -80, 112],
};
/** The second infill: closer than the first (CADENCE_INFILL_GAP 11), and every lot still passes the same rules. */
export const CL_INFILL_GAP = 9;
export const CL_INFILL_STEP = 2;
export const CL_SHEDS_MAX = 45;
const NIGHT_GLOW_TINT = 0xffc070;
/** The bath: two iron (200 in the purse's smallest coin), once a day. */
export const BATH_PRICE = 200;
const CREW = 'clCrew';

const rngOf = (key) => { let h = hashStr(key) || 1; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000003) / 1000003; }; };

export const CityLifeMixin = {
  // ============================================================== state
  _clState() {
    const p = this.player;
    if (!p) return {};
    if (!p.cityLife || typeof p.cityLife !== 'object') {
      p.cityLife = { v: 1, lastRank: null, rankUp: null, starsSeen: null, starsDay: null, gifts: {}, blessed: {}, holyQuests: 0,
        holyDone: {}, funerals: 0, funeralSeen: {}, bathDay: null, news: [] };
    }
    return p.cityLife;
  },
  _clHour() { return this._hourOfDay ? this._hourOfDay() : 12; },
  _clDay() { return this._dayIndex ? this._dayIndex() : 0; },
  _clAt(x, y) { return this._cadencePoint ? this._cadencePoint([x, y]) : { x: 0, y: 0 }; },
  _clInCadence(wx = this.world && this.world.x, wy = this.world && this.world.y) {
    if (this._insideRoom) return false;
    const c = this._lampCityFor ? this._lampCityFor(wx, wy, 6) : null;
    return !!(c && c.st && c.st.id === CITY);
  },

  // ============================================================== 1. the sites (from _buildCadenceMap)
  _clPlaceSites() {
    if (!this.townOrigin) return;
    const T = TILE;
    const o = { tx: Math.floor(this.townOrigin.x / T), ty: Math.floor(this.townOrigin.y / T) };
    const inBlock = (b, blk, pad = 0) => {
      const ax = Math.round((b.anchorX ?? b.x) / T) - o.tx, ay = Math.round((b.anchorY ?? b.y) / T) - o.ty;
      return ax >= blk[0] - pad && ax <= blk[2] + pad && ay >= blk[1] - pad && ay <= blk[3] + pad;
    };
    const clearBlock = (blk) => {
      let n = 0;
      for (const b of (this.buildings || []).slice()) {
        if (!b || !b.sprite || b.wall || b.fence || b.singleton || b.temple || b.mansion || b.estate !== undefined) continue;
        if (!b.house && !b.infill && !b.terrace) continue;
        if (!inBlock(b, blk, 3)) continue;
        this._unplaceBuilding(b); n++;
      }
      return n;
    };
    const census = (this._clSiteCensus = { cleared: {}, placed: {}, moved: {}, infill: 0, sheds: 0 });
    for (const [id, blk] of Object.entries(CL_CLEAR)) census.cleared[id] = clearBlock(blk);
    this._clSites = {};
    for (const [id, s] of Object.entries(CL_SITES)) {
      census.cleared[id] = clearBlock(s.block);
      const row = s.tex === 'townLarge' ? this._sheetRow('townLarge', s.row) : TOWN_POOL_ROWS.indexOf(s.row);
      if (row < 0) continue;
      let e = null, moved = null;
      for (let r = 0; r <= 9 && !e; r++) {
        for (let dy = -r; dy <= r && !e; dy++) {
          for (let dx = -r; dx <= r && !e; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const tx = s.at[0] + dx, ty = s.at[1] + dy;
            if (tx < s.block[0] || tx > s.block[2] || ty < s.block[1] || ty > s.block[3]) continue;
            const w = this._clAt(tx, ty);
            const cand = this._placeTownBuilding(w.x, w.y, s.tex, row, TOWN_DISPLAY_SCALE * s.scale, { clSite: id, civicLife: true }, null);
            if (!cand) continue;
            if (this._cadenceSiteProblem(cand, this.buildings, { civic: true })) { this._unplaceBuilding(cand); continue; }
            e = cand; moved = [dx, dy];
          }
        }
      }
      if (!e) continue;
      // `_placeTownBuilding` takes the display scale as given: TOWN_DISPLAY_SCALE is an ordinary building's, so
      // `TOWN_DISPLAY_SCALE * s.scale` is "this fraction of an ordinary building".
      e.clName = s.name;
      this._clSites[id] = e;
      census.placed[id] = true; census.moved[id] = moved;
    }
    census.infill = this._clInfill(o);
  },

  /** ROUND 373 -- "More houses and structures to further fill in blank spaces around the city without colliding
   *  structures together." A second pass over the same ground the round-269 infill searched, two tiles at a time and
   *  at a closer gap, held to every rule the first pass is held to (`_cadenceSiteProblem`: off the road with its
   *  setback, on paving, clear of water, apart from every other building by tiles AND by drawn art). Where a house will
   *  not fit, a smaller outbuilding is tried: a shed, a store, a workshop. */
  _clInfill(o) {
    const D = CADENCE_DISTRICTS || {};
    const skip = ['market', 'temple', 'estates'].map(k => D[k]).filter(Boolean);
    const blocks = [...Object.values(CL_SITES).map(s => s.block), ...Object.values(CL_CLEAR)];
    const inSkip = (x, y) => skip.some(d => x >= d.x0 - 4 && x <= d.x1 + 4 && y >= d.y0 - 4 && y <= d.y1 + 4)
      || blocks.some(b => x >= b[0] - 6 && x <= b[2] + 6 && y >= b[1] - 6 && y <= b[3] + 6);
    const rng = rngOf('cl|infill');
    const B = { x0: -191, x1: 251, y0: -101, y1: 164 };
    const cands = [];
    for (let y = B.y0 + 4; y <= B.y1 - 4; y += CL_INFILL_STEP) {
      for (let x = B.x0 + 4; x <= B.x1 - 4; x += CL_INFILL_STEP) {
        if (inSkip(x, y)) continue;
        if (this._tileTypeAt(o.tx + x, o.ty + y) !== TILE_CITY) continue;
        cands.push([x, y]);
      }
    }
    for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
    const houseRows = TOWN_POOL_ROWS.map((_, i) => i);
    const near = (wx, wy, r) => (this.buildings || []).some(q => q && q.sprite && !q.wall
      && Math.abs((q.anchorX ?? q.x) - wx) < r && Math.abs((q.anchorY ?? q.y) - wy) < r
      && Math.hypot((q.anchorX ?? q.x) - wx, (q.anchorY ?? q.y) - wy) < r);
    let houses = 0, sheds = 0;
    for (const [x, y] of cands) {
      const wx = (o.tx + x) * TILE, wy = (o.ty + y) * TILE;
      if (near(wx, wy, 7 * TILE)) continue;
      let placed = false;
      if (!near(wx, wy, CL_INFILL_GAP * TILE)) {
        const row = houseRows[Math.floor(rng() * houseRows.length)];
        let e = this._placeTownBuilding(wx, wy, 'townPool', row, TOWN_DISPLAY_SCALE, { house: true, infill: true, clInfill: true }, null);
        if (e) {
          e = this._snapHouseToRoad(e, row, { house: true, infill: true, clInfill: true }, { houseGap: CL_INFILL_GAP });
          if (e._unfronted || this._cadenceSiteProblem(e, this.buildings, { houseGap: CL_INFILL_GAP })) this._unplaceBuilding(e);
          else { houses++; placed = true; }
        }
      }
      if (placed) continue;
      // An outbuilding: the round-45 shack and farmhouse models at about two-thirds size, in a gap a house cannot take --
      // but only a few, and well apart, so the city does not turn into a shanty: CL_SHEDS_MAX, eight tiles from anything.
      if (sheds >= CL_SHEDS_MAX || near(wx, wy, 8 * TILE)) continue;
      // ROUND 420 -- "Cabins don't belong in cities": the outbuilding is the farmhouse model now, never the shack.
      const model = 'farmhouse';
      const s = this._placeStructure(model, wx, wy, { scale: TOWN_DISPLAY_SCALE * 0.62, tag: { clShed: true } });
      if (!s) continue;
      if (!s.sprite || this._cadenceSiteProblem(s, this.buildings, { houseGap: 7 })) { this._unplaceBuilding(s); continue; }
      sheds++;
    }
    this._clSiteCensus.sheds = sheds;
    return houses;
  },

  // ============================================================== 2. the street furniture (from _buildCityProps)
  _clProps(put) {
    if (!this.textures.exists(CL_ART.key) || !this.townOrigin) return;
    const F = CITYLIFE_FRAMES;
    const cl = (name, x, y, opts = {}) => {
      if (F[name] === undefined) return null;
      return put(CL_ART.key, CL_ART, F[name], x, y, { radius: opts.radius || 0, solid: !!opts.solid },
        { clutter: true, cl: name, ...(opts.tag || {}) });
    };
    // Hung on or stood against a building (a sign, a flower box, a banner, a poster): laid directly, because `put` keeps
    // every prop a clear step off a building's front by design. Still never on a road, in water, or on top of another.
    const hang = (name, x, y, tag = {}, over = null) => {
      if (F[name] === undefined || this._isWaterAt(x, y)) return null;
      if (isCarriagewayTile(this._tileTypeAt(Math.floor(x / TILE), Math.floor(y / TILE)))) return null;
      for (const o of this.cityProps) if (Math.abs(o.x - x) < 24 && Math.abs(o.y - y) < 24 && Math.hypot(o.x - x, o.y - y) < 20) return null;
      const rec = { x, y, sprite: null, sheet: CL_ART.key, art: CL_ART, frame: F[name], radius: 0, solid: false, cityProp: true, clutter: true, cl: name, ...tag };
      if (over) rec.depthBias = this._clFrontBias(over, x, y);
      this.cityProps.push(rec);
      return rec;
    };
    const at = (x, y) => this._clAt(x, y);
    const census = (this._clPropCensus = {});
    const count = (k) => { census[k] = (census[k] || 0) + 1; };
    // --- the cemetery: stones in rows, old ones first; the rest wait for names
    this._clPlots = [];
    {
      const [x0, y0, x1, y1] = CL_CLEAR.cemetery;
      const rng = rngOf('cl|graves');
      const old = OLD_GRAVES.slice();
      for (let y = y0 + 3; y <= y1 - 2; y += 3) {
        for (let x = x0 + 2; x <= x1 - 2; x += 3) {
          const w = at(x + 0.5, y + 0.5);
          const plot = { x: w.x, y: w.y, rec: null, who: null };
          if (old.length && rng() < 0.62) {
            const [name, line] = old.splice(Math.floor(rng() * old.length), 1)[0];
            const kind = ['grave_round', 'grave_cross', 'grave_slab', 'grave_obelisk', 'grave_mossy'][Math.floor(rng() * 5)];
            plot.rec = cl(kind, w.x, w.y, { radius: 10, solid: true });
            if (plot.rec) { plot.old = { name, line }; count('graves'); }
          }
          this._clPlots.push(plot);
        }
      }
      for (const [cx, cy] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, y1 - 1], [x1 - 1, y1 - 1]]) {
        const w = at(cx, cy); if (cl('stoneLantern', w.x, w.y, { radius: 12, solid: true, tag: { clLantern: true } })) count('lanterns');
      }
      const c = at((x0 + x1) / 2, y0 + 1);
      if (put('cityProps', { key: 'cityProps', cell: 80, scale: 1.95, footX: 0.5, footY: 0.94 }, 0, c.x, c.y, { radius: 24, solid: true }, { prop: 'statue', clutter: true })) count('statue');
    }
    // --- the barracks yard: dummies, a target, a rack
    this._clYardSpots = [];
    {
      const s = CL_SITES.barracks.block;
      const b = this._clSites && this._clSites.barracks;
      const foot = b ? this._footprintTiles(b) : null;
      const ox = Math.floor(this.townOrigin.x / TILE), oy = Math.floor(this.townOrigin.y / TILE);
      const free = (tx, ty) => !foot || tx < foot.x0 - ox - 2 || tx > foot.x1 - ox + 2 || ty < foot.y0 - oy - 2 || ty > foot.y1 - oy + 2;
      const spots = [];
      for (let y = s[1] + 2; y <= s[3] - 2; y += 3) for (let x = s[0] + 2; x <= s[2] - 2; x += 3) if (free(x, y)) spots.push([x, y]);
      const freeSpots = [];
      let d = 0;
      for (const [x, y] of spots) {
        const w = at(x, y);
        if (d < 4 && (x + y) % 2 === 0) { this._clDummySpots = this._clDummySpots || []; this._clDummySpots.push(w); d++; continue; }
        if (!census.target && cl('target', w.x, w.y, { radius: 14, solid: true })) { census.target = 1; continue; }
        if ((census.racks || 0) < 2 && cl('spearRack', w.x, w.y, { radius: 16, solid: true })) { count('racks'); continue; }
        if (!this._collidesObstacle(w.x, w.y, 16)) freeSpots.push(w);
      }
      this._clYardSpots = freeSpots;
      census.dummySpots = (this._clDummySpots || []).length;
    }
    // --- the fish market: stalls in a row, with their fishmongers, and the racks and barrels round them
    {
      const [x0, y0, x1, y1] = CL_CLEAR.fishmarket;
      const art = this._cityStallArt ? this._cityStallArt() : null;
      let n = 0;
      for (let x = x0 + 4; x <= x1 - 4 && art; x += 5) {
        const w = at(x, y0 + 8);
        // the empty-countered stalls (green stripe, grey cover, green awning), and the ice counter of fish in front
        const rec = put(art.key, art.art, [13, 14, 1][n % 3], w.x, w.y, art.def, { prop: 'stallAwning', market: true, clFish: true, trade: 'fish', settlement: CITY });
        if (!rec) continue;
        n++;
        hang('fishCounter', w.x + 30, w.y + 30, { clFishCounter: true });
        if (this._stageStallVendor) this._stageStallVendor(rec, 'fish');
      }
      census.fishStalls = n;
      for (let x = x0 + 3; x <= x1 - 3; x += 6) {
        const w = at(x, y0 + 16);
        if (cl(x % 12 ? 'fishRack' : 'fishBarrel', w.x, w.y, { radius: 12, solid: true })) count('fishDressing');
      }
      const s = at(x0 + 2, y0 + 4);
      void s;   // ROUND 403 -- the fish market's hanging sign is gone with the rest of the old shop signs
    }
    // --- the crier's box, in the plaza
    {
      for (let r = 6; r <= 16 && !this._clCrierAt; r += 2) {
        for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const w = at(dx * r, dy * r);
          if (cl('crierBox', w.x, w.y, { radius: 18, solid: true })) { this._clCrierAt = { x: w.x + TILE * 1.2, y: w.y + TILE * 1.2 }; break; }
        }
      }
    }
    this._clCityBuildings = (this.buildings || []).filter(b => b && b.sprite && !b.wall && this._clInCadenceXY(b.x, b.y));
    // --- laundry between close neighbours, and flower boxes under front windows
    {
      const houses = this._clCityBuildings.filter(b => b.house && !b.clShed);
      const rng = rngOf('cl|dressing');
      let lines = 0, boxes = 0;
      for (let i = 0; i < houses.length; i++) {
        const a = houses[i];
        // ROUND 387 -- "Old planters should be removed." The round-373 flower boxes are no longer laid: round 381's
        // window boxes and planters dress the house fronts. The draws are still taken, so the laundry lines below land
        // where they always have.
        if (rng() < 0.5) { rng(); rng(); }
        if (lines > 60) continue;
        for (let j = i + 1; j < houses.length; j++) {
          const b = houses[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d < 8 * TILE || d > 15 * TILE) continue;
          if (Math.abs(dx) > 2.5 * TILE && Math.abs(dy) > 2.5 * TILE) continue;   // the line runs along one axis
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const t = this._tileTypeAt(Math.floor(mx / TILE), Math.floor(my / TILE));
          if (t !== TILE_CITY || this._clRoadNear(mx, my, 2)) continue;
          if (rng() > 0.35) continue;
          if (cl(Math.abs(dx) > Math.abs(dy) ? 'laundryX' : 'laundryY', mx, my, { radius: 0 })) { lines++; break; }
        }
      }
      census.laundry = lines; census.flowerBoxes = boxes;
    }
    // --- the households' banners, either side of each estate's gate (mansions.js names the four households)
    {
      const arms = ['ashford', 'meadowlark', 'pembrook', 'ravensholt'];
      (this._estateGates || []).forEach((g, i) => {
        const house = String(mansionHousehold(`${CITY}:${i}`).house || '').toLowerCase();
        const key = arms.includes(house) ? house : arms[i % 4];
        const [gx, gy, width, side] = g;
        const out = side === 'east' ? 2 : side === 'west' ? -2 : 0;
        for (const k of [-1, 1]) {
          const along = k * (width / 2 + 1);
          const w = at(gx + out + (side === 'north' || side === 'south' ? along : 0), gy + (side === 'east' || side === 'west' ? along : 0) + (side === 'south' ? 2 : side === 'north' ? -2 : 0));
          if (hang(`banner_${key}`, w.x, w.y, { clBanner: key })) count('estateBanners');
        }
      });
    }
    // --- the dynamic things: built now as records, shown when their day comes (`hidden` is read by the prop pool)
    this._clDyn = { holy: {}, market: [], wanted: [], drape: [] };
    // holy-day banners: four in front of each temple
    for (const b of (this.buildings || [])) {
      if (!b || !b.temple || !this._clInCadenceXY(b.x, b.y)) continue;
      const dir = this._doorDirectionWithFacing ? this._doorDirectionWithFacing(b) : { dx: -1, dy: -1 };
      const step = (dir.step || 160) + 24;
      const list = (this._clDyn.holy[b.temple] = []);
      for (const side of [-2, -1, 1, 2]) {
        const x = b.x + dir.dx * step - dir.dy * 46 * side, y = b.y + dir.dy * step + dir.dx * 46 * side;
        const rec = hang(`banner_${b.temple}`, x, y, { clHoly: b.temple });
        if (rec) { rec.hidden = true; list.push(rec); }
      }
      b._clTempleDoor = { x: b.x + dir.dx * (step + 30), y: b.y + dir.dy * (step + 30) };
    }
    // wanted posters: by the Society hall, the tavern and the crier
    for (const near of ['guild', 'tavern']) {
      const b = (this.buildings || []).find(q => q && q.singleton === near && this._clInCadenceXY(q.x, q.y));
      if (!b) continue;
      const dir = this._doorDirectionWithFacing ? this._doorDirectionWithFacing(b) : { dx: 0, dy: 1 };
      // out in the street in front of the door, not against the wall: a building is drawn over anything up-screen of
      // its own foot, and the hall's foot is well out from its collision centre
      const step = (dir.step || 120) + 70;
      const x = b.x + dir.dx * step + dir.dy * 70, y = b.y + dir.dy * step - dir.dx * 70;
      const rec = hang('posterWanted', x, y, { clPoster: near }, b);
      if (rec) { rec.hidden = true; this._clDyn.wanted.push(rec); }
      if (near === 'guild') {
        // the bunting across the hall's front: the first spot along the front that is not road
        for (const [out, side] of [[10, 70], [10, -70], [40, 0], [40, 110], [40, -110], [70, 40], [70, -40]]) {
          const d = hang('drape', b.x + dir.dx * (step + out) - dir.dy * side, b.y + dir.dy * (step + out) + dir.dx * side, { clDrape: true }, b);
          if (d) { d.hidden = true; this._clDyn.drape.push(d); break; }
        }
      }
    }
    if (this._clCrierAt) {
      const rec = hang('posterWanted', this._clCrierAt.x + 50, this._clCrierAt.y - 30, { clPoster: 'crier' });
      if (rec) { rec.hidden = true; this._clDyn.wanted.push(rec); }
    }
    // market-day stalls: tents round the edge of the market square, each with a travelling merchant
    {
      const D = CADENCE_DISTRICTS.market;
      const rng = rngOf('cl|marketday');
      const spots = [];
      for (let y = D.y0 + 4; y <= D.y1 - 4; y += 3) for (let x = D.x0 + 4; x <= D.x1 - 4; x += 3) spots.push([x, y]);
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      const tents = ['tentRed', 'tentBlue', 'tentGreen', 'tentPurple'];
      let n = 0;
      for (const [x, y] of spots) {
        if (n >= 6) break;
        const w = at(x, y);
        if (this._clRoadNear(w.x, w.y, 2)) continue;
        if (this._tileTypeAt(Math.floor(w.x / TILE), Math.floor(w.y / TILE)) !== TILE_CITY) continue;
        const rec = cl(tents[n % 4], w.x, w.y, { radius: 30, solid: true, tag: { clMarketDay: true, market: true } });
        if (!rec) continue;
        rec.hidden = true;
        this._clDyn.market.push(rec);
        n++;
      }
      census.marketDayStalls = n;
    }
  },

  /** How much to lift a thing stood at a building's door so it is drawn in front of that building. A building is sorted
   *  by its foot -- the front corner of its ground -- so its own doorstep sorts behind it, which is right for a person
   *  (the building fades for them) and wrong for a sign or a flower box, which nothing fades for. */
  _clFrontBias(b, x, y) {
    if (!b || !b.sprite) return 0;
    const need = (b.sprite.depth || isoDepth(b.anchorX ?? b.x, b.anchorY ?? b.y)) - isoDepth(x, y);
    return need > 0 ? need + 0.5 : 0;
  },

  _clInCadenceXY(x, y) {
    const c = this._lampCityFor ? this._lampCityFor(x, y, 4) : null;
    return !!(c && c.st && c.st.id === CITY);
  },
  _clRoadNear(wx, wy, r) {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isCarriagewayTile(this._tileTypeAt(tx + dx, ty + dy))) return true;
    return false;
  },

  // ============================================================== 3. doors (from _buildInteriors, after the generic doors)
  _clDoors() {
    // The tavern is a singleton, and singletons are skipped by `_buildGenericDoorways` because each was meant to have a
    // room of its own. The tavern never got one, so it has had no door at all. It gets the generic door now: a
    // pooled room, dressed as a taproom, with as many drinkers in it as the hour says (`_clFurnishGeneric`).
    const tav = this._cadenceTavern || (this.buildings || []).find(b => b && b.singleton === 'tavern' && this._clInCadenceXY(b.x, b.y));
    if (tav && !(this.doorways || []).some(d => d.building === tav)) {
      const dir = this._doorDirectionWithFacing(tav);
      const step = dir.step || ((tav.radius || 40) + 44);
      let x = tav.x + dir.dx * step, y = tav.y + dir.dy * step;
      for (const push of [0, 16, 32, 48]) {
        const ax = tav.x + dir.dx * (step + push), ay = tav.y + dir.dy * (step + push);
        if (!this._collidesObstacle(ax, ay, 14)) { x = ax; y = ay; break; }
      }
      this.doorways.push({ kind: 'enter', generic: true, building: tav, x, y, radius: 52, label: 'go into the tavern', to: null, clTavern: true });
      this._clTavernDoor = true;
    }
    for (const [id, b] of Object.entries(this._clSites || {})) {
      const d = (this.doorways || []).find(q => q.building === b);
      if (d) d.label = CL_SITES[id].label;
    }
    // ROUND 403 -- "I don't know what this sign is for, but it looks low quality, remove them" / "Also remove the old
    // bathhouse signs": the round-373 hanging shop signs (tankard, anvil, book, bath, fish, shield, coin, potion, cart) are
    // no longer hung. `_clHangSigns` stays, unused, for the record.
    // this._clHangSigns();
  },

  /** Signs: hung beside the door of every civic building and every shop-fronted house -- placed off the DOORSTEP
   *  (known only once the doors are hung), so a sign always stands in front of its building rather than behind it. */
  _clHangSigns() {
    // ROUND 407 -- "Another low quality sign to remove": the book board on its post is this function's (frame
    // sign_book). Retired outright, so nothing can hang one again by calling it.
    if (CL_SIGNS_RETIRED) return 0;
    if (!this.textures.exists(CL_ART.key)) return 0;
    const F = CITYLIFE_FRAMES;
    const signFor = (b) => {
      if (b.clSite) return CL_SITES[b.clSite].sign;
      const s = b.singleton;
      if (s === 'tavern') return 'tankard';
      if (s === 'blacksmith') return 'anvil';
      if (s === 'auction') return 'coin';
      if (s === 'guild') return 'shield';
      if (s === 'research') return 'potion';
      return null;
    };
    let n = 0;
    const doorOf = new Map();
    const bySingleton = new Map();
    for (const b of (this._clCityBuildings || [])) if (b.singleton) bySingleton.set(b.singleton, b);
    for (const d of (this.doorways || [])) {
      if (!d || d.kind !== 'enter') continue;
      // a generic door names its building; a civic room's door names the room, whose `building` is the singleton
      const b = d.building || (d.room && d.room.building ? bySingleton.get(d.room.building) : null);
      if (b && !doorOf.has(b)) doorOf.set(b, d);
    }
    for (const b of (this._clCityBuildings || [])) {
      const g = signFor(b);
      const row = b.sprite && b.sprite.texture && b.sprite.texture.key === 'townPool' ? Math.floor(Number(b.sprite.frame.name) / 8) : -1;
      const isShop = !g && b.house && row >= 12 && row <= 16;
      if (!g && !isShop) continue;
      const glyph = g || ['tankard', 'potion', 'coin', 'fish', 'book', 'anvil'][hashStr(`${Math.round(b.x)}|${Math.round(b.y)}`) % 6];
      const d = doorOf.get(b) || (b.singleton ? { x: b.x + 0, y: b.y + (b.radius || 60) + 40 } : null);
      if (!d) continue;
      // along the building's face: across the line from the building's centre to its door
      const ux = d.x - b.x, uy = d.y - b.y, ul = Math.hypot(ux, uy) || 1;
      const px = -uy / ul, py = ux / ul;
      for (const side of (b.clSite ? [1, -1] : [1])) {
        for (const off of [46, 64, 30]) {
          const x = d.x + px * off * side + ux / ul * 6, y = d.y + py * off * side + uy / ul * 6;
          if (this._isWaterAt(x, y) || isCarriagewayTile(this._tileTypeAt(Math.floor(x / TILE), Math.floor(y / TILE)))) continue;
          if (this.cityProps.some(o => Math.abs(o.x - x) < 20 && Math.abs(o.y - y) < 20)) continue;
          this.cityProps.push({ x, y, sprite: null, sheet: CL_ART.key, art: CL_ART, frame: F[`sign_${glyph}`], radius: 0, solid: false,
            cityProp: true, clutter: true, cl: `sign_${glyph}`, clSign: glyph, depthBias: this._clFrontBias(b, x, y) });
          n++;
          break;
        }
      }
    }
    if (this._clPropCensus) this._clPropCensus.signs = (this._clPropCensus.signs || 0) + n;
    return n;
  },

  // ============================================================== 4. the caravan yard (from _buildStableYards)
  _clYard() {
    const yard = (this._stables || []).find(y => y.settlement === CITY);
    this._clYardStock = [];
    if (!yard || !this.textures.exists('veh_wagon_wood')) return;
    const used = new Set((yard.bays || []).map(b => `${b.tx},${b.ty}`));
    const stock = [['wagon_wood', 'asbuilt'], ['wagon_metal', 'asbuilt'], ['wagon_wood', 'forest'], ['wagon_metal', 'deepsea'], ['wagon_wood', 'oxblood']];
    let k = 0;
    const W = yard.w, H = yard.h;
    // ROUND 403 -- five tiles apart, not four: at 1.3x the wagons touched
    for (let ty = 3; ty < H - 1 && k < stock.length; ty += 5) {
      for (let tx = 3; tx < W - 1 && k < stock.length; tx += 5) {
        if (used.has(`${tx},${ty}`)) continue;
        const [vid, colour] = stock[k];
        const v = VEHICLE_BY_ID[vid];
        if (!v) continue;
        const wx = (yard.tx0 + tx) * TILE, wy = (yard.ty0 + ty) * TILE;
        if (this._collidesObstacle(wx, wy, 26)) continue;
        const texKey = this._vehicleTexture(v.art, colour);
        if (!this.textures.exists(texKey)) continue;
        const p = isoProject(wx, wy);
        const facing = ['south', 'southeast', 'southwest', 'east', 'west'][k % 5];
        const sprite = this.add.image(p.x, p.y, texKey, dirRow(facing));
        sprite.setOrigin(0.5, 0.86).setScale(VEHICLE_WORLD_SCALE).setDepth(isoDepth(wx, wy));   // ROUND 403 -- 30% bigger
        const e = { x: wx, y: wy, anchorX: wx, anchorY: wy, radius: VEHICLE_WORLD_RADIUS, sprite, facing, stable: yard.id, clStock: vid };
        this._occludables.push(e);
        this._stableProps = this._stableProps || [];
        this._stableProps.push(e);
        this._clYardStock.push(e);
        k++;
      }
    }
    this._clYardAt = { x: (yard.tx0 + W / 2) * TILE, y: (yard.ty0 + H / 2) * TILE, yard };
    // the yard's board by its gate side: CARAVANS -- the cart sign
    if (this.textures.exists(CL_ART.key)) {
      const bx = (yard.tx0 + (yard.gate === 'west' ? -1 : yard.gate === 'east' ? W + 1 : W / 2)) * TILE;
      const by = (yard.ty0 + (yard.gate === 'north' ? -1 : yard.gate === 'south' ? H + 1 : H / 2 + 3)) * TILE;
      const p = isoProject(bx, by);
      const sp = this.add.image(p.x, p.y, CL_ART.key, CITYLIFE_FRAMES.yardBoard).setOrigin(CL_ART.footX, CL_ART.footY).setScale(CL_ART.scale).setDepth(isoDepth(bx, by));
      const e = { x: bx, y: by, anchorX: bx, anchorY: by, radius: 0, sprite: sp, stable: yard.id, clBoard: true };
      this._stableProps.push(e);
      this._clYardStock.push(e);
    }
  },

  // ============================================================== 5. the people (after _buildGuards)
  _buildCityLife() {
    try {
      this._clBuildPeople();
      this._clBuildLampRoutes();
      this._clBuildWagonRoutes();
      this._clBuildSounds();
    } catch (e) {
      console.warn('[cityLife] build', e);
    }
  },

  _clNpc(def) {
    const art = NPC_ART[def.artKey];
    if (!art || !this.textures.exists(def.artKey)) return null;
    const p = isoProject(def.x, def.y);
    const sprite = this.add.sprite(p.x, p.y, def.artKey, dirRow(def.facing || 'south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale(art.scale || 1);
    sprite.setDepth(isoDepth(def.x, def.y));
    const n = { ...def, sprite, cityLife: def.cityLife || true };
    this.npcs.push(n);
    return n;
  },

  _clBuildPeople() {
    this._clPeople = [];
    // the town crier, on his box in the plaza
    if (this._clCrierAt) {
      const c = this._clNpc({ name: 'Bellam the Crier', artKey: 'npc_townsman_v2', x: this._clCrierAt.x, y: this._clCrierAt.y,
        facing: 'south', cityLife: 'crier', dialogue: null, reach: 70 });
      if (c) { this._clCrier = c; this._clPeople.push(c); }
    }
    // the barracks: a drill sergeant at the gate of the yard, two pairs sparring, a few watching
    const yard = this._clYardSpots || [];
    if (yard.length >= 4) {
      const sg = yard[0];
      const s = this._clNpc({ name: 'Sergeant Dace Holloway', artKey: 'npc_grizzled_adventurer_v1', x: sg.x, y: sg.y, facing: 'southeast',
        cityLife: 'sergeant', dialogue: null });
      if (s) this._clPeople.push(s);
      this._clSparring = [];
      const pairs = [[yard[Math.min(2, yard.length - 1)], 'guardCity', 'guardM'], [yard[Math.min(5, yard.length - 1)], 'guardF', 'guardCity']];
      for (const [spot, a1, a2] of pairs) {
        if (!spot) continue;
        for (const [k, art] of [[0, a1], [1, a2]]) {
          const x = spot.x + (k ? 26 : -26), y = spot.y + (k ? 26 : -26);
          if (!this.textures.exists(`${art}_idle`)) continue;
          const pp = isoProject(x, y);
          const sp = this.add.sprite(pp.x, pp.y, `${art}_idle`, dirRow(k ? 'northwest' : 'southeast'));
          sp.setOrigin(0.5, 0.95).setDepth(isoDepth(x, y));
          this._clSparring.push({ art, sprite: sp, x, y, hx: x, hy: y, facing: k ? 'northwest' : 'southeast', t: k * 0.9, k });
        }
      }
      // low-rank adventurers trying the dummies, and two watching from the side
      const watchers = [['npc_female_adventurer', 'Iron-rank Hesk'], ['npc_shield_adventurer', 'Iron-rank Tamsin Oake'], ['npc_muscular_adventurer', 'Recruit Bodo']];
      for (let i = 0; i < watchers.length && i + 7 < yard.length; i++) {
        const w = yard[i + 7];
        const n = this._clNpc({ name: watchers[i][1], artKey: NPC_ART[watchers[i][0]] ? watchers[i][0] : 'npc_townsman', x: w.x, y: w.y,
          facing: 'northeast', cityLife: 'trainee', dialogue: null });
        if (n) this._clPeople.push(n);
      }
    }
    // the caravan yard's hand, by the wagons (the yardmaster sells; she explains)
    if (this._clYardAt) {
      const y = this._clYardAt;
      const h = this._clNpc({ name: 'Wren, the yard hand', artKey: 'npc_sporty_woman', x: y.x + TILE * 2, y: y.y + TILE * 4,
        facing: 'south', cityLife: 'yardhand', dialogue: null });
      if (h) this._clPeople.push(h);
    }
    // market day: a travelling merchant at each tent, there only on the day
    this._clMerchants = [];
    const trades = ['traveller', 'otherworld', 'traveller', 'drinks', 'traveller', 'fish'];
    const names = ['Ondo of the Long Road', 'Saffi Twelve-Bags', 'Old Mother Quell', 'Pell from Milrow', 'Jessamy Far', 'Brannoc Saltcart'];
    (this._clDyn ? this._clDyn.market : []).forEach((rec, i) => {
      const trade = trades[i % trades.length];
      const m = this._clNpc({ name: names[i % names.length], artKey: ['npc_merchant', 'npc_sleek_woman', 'npc_patterned_man', 'npc_confident_woman'][i % 4],
        x: rec.x - 20, y: rec.y + 46, facing: 'south', shopId: trade === 'books' ? 'skillbooks_market' : `market_${trade}`, cityLife: 'merchant',
        dialogue: null, reach: 70, clMarketDay: true, hidden: true });
      if (m) { m.sprite.setVisible(false); this._clMerchants.push(m); }
    });
    // the headstones are things you can read: an entry each, no sprite of their own
    for (const plot of (this._clPlots || [])) {
      if (!plot.old) continue;
      this.npcs.push({ name: plot.old.name, x: plot.x, y: plot.y + 12, sprite: null, cityLife: 'grave', prompt: 'read the headstone',
        reach: 34, noDot: true, plot });
    }
    for (const rec of (this._clDyn ? this._clDyn.wanted : [])) {
      const n = { name: 'Wanted poster', x: rec.x, y: rec.y + 10, sprite: null, cityLife: 'poster', prompt: 'read the poster',
        reach: 40, noDot: true, hidden: true, rec };
      rec.npc = n;
      this.npcs.push(n);
    }
  },

  // ---------------------------------------------------------------- the lamps
  /** ROUND 373 -- "A lamplighter walking the streets at dusk lighting each lamp." Cadence has hundreds of lamps and two
   *  hours of dusk to light them in, so the round is split between as many lamplighters as it takes a man walking
   *  briskly (LAMPLIGHT.speed) to cover: chains of lamps each a clear walk from the last, cut at about two hours' work.
   *  Each lamp's lighting time is its place on its chain, so a lamp is lit by the man who reaches it, whether or not
   *  you are there to see him do it. The lamplighter you meet walks his chain on the same clock. */
  _clBuildLampRoutes() {
    const lamps = (this.lampposts || []).filter(l => l && l.city && (l.settlement === CITY || this._clInCadenceXY(l.x, l.y)));
    this._clLamps = lamps;
    const left = new Set(lamps);
    const routes = [];
    const CELL = 22 * TILE;
    const grid = new Map();
    for (const l of lamps) { const k = `${Math.floor(l.x / CELL)},${Math.floor(l.y / CELL)}`; (grid.get(k) || grid.set(k, []).get(k)).push(l); }
    const budget = LAMPLIGHT.span * 25 * LAMPLIGHT.speed * 0.9;   // two game hours of walking, in world units
    // a clear walk between two posts: sampled along the middle of the line, so the posts themselves (which are solid)
    // do not count against it
    const clear = (a, b) => {
      for (let i = 1; i <= 7; i++) {
        const t = 0.12 + (i / 8) * 0.76;
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 8)) return false;
      }
      return true;
    };
    while (left.size) {
      // start each chain at the westernmost lamp left, so the chains sweep the city rather than speckle it
      let start = null;
      for (const l of left) if (!start || l.x + l.y < start.x + start.y) start = l;
      left.delete(start);
      const chain = [start];
      let len = 0;
      for (;;) {
        const cur = chain[chain.length - 1];
        // the lamps within reach, nearest first, through a coarse grid rather than over all of them
        const cand = [];
        const gx = Math.floor(cur.x / CELL), gy = Math.floor(cur.y / CELL);
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
          for (const l of (grid.get(`${gx + i},${gy + j}`) || [])) {
            if (!left.has(l)) continue;
            const d = Math.hypot(l.x - cur.x, l.y - cur.y);
            if (d < 22 * TILE) cand.push([d, l]);
          }
        }
        cand.sort((a, b) => a[0] - b[0]);
        let best = null, bd = 0;
        // ROUND 388 -- the chain's length is the walk along the streets (legEstimate), not the straight line, so a chain
        // is still about two hours' real walking now that he keeps to the roads
        for (const [d, l] of cand.slice(0, 6)) if (clear(cur, l)) { best = l; bd = legEstimate(cur, l, TILE); break; }
        if (!best || len + bd > budget) break;
        left.delete(best); chain.push(best); len += bd;
      }
      routes.push({ lamps: chain, len });
    }
    // timings: every chain starts at dusk and its lamps are lit as the walk reaches them
    const hourPerUnit = 1 / (LAMPLIGHT.speed * 25);
    for (const r of routes) {
      let t = LAMPLIGHT.start + ((hashStr(`${Math.round(r.lamps[0].x)}`) % 20) / 100);
      r.legs = [];
      for (let i = 0; i < r.lamps.length; i++) {
        if (i > 0) t += legEstimate(r.lamps[i - 1], r.lamps[i], TILE) * hourPerUnit;   // ROUND 388 -- timed for the road walk
        r.lamps[i]._clLightAt = t;
        r.legs.push(t);
        t += LAMPLIGHT.pause / 25;
      }
      r.end = t;
      r._legPaths = new Map();   // ROUND 388 -- each leg's road path, planned when the leg is first walked near the player
    }
    this._clLampRoutes = routes;
    this._clLighters = [];
  },

  /** ROUND 388 -- "route the lamplighters on roads": what a lamplighter may walk on. `road` is a carriageway tile
   *  (street, plaza, path -- not the courtyard paving every lot in Cadence stands on); `solid` is the nav grid
   *  (buildings, walls, fences, props, trees, the lamp feet, water). Rebuilt when the nav grid is. */
  _clLampWalk() {
    const ver = this._navVersion || 0;
    if (this._clWalkFns && this._clWalkFns.ver === ver) return this._clWalkFns;
    const road = (tx, ty) => isCarriagewayTile(this._tileTypeAt(tx, ty));
    const solid = this._navBlockedFn ? this._navBlockedFn({})
      : (tx, ty) => this._isWaterAt((tx + 0.5) * TILE, (ty + 0.5) * TILE) || this._collidesObstacle((tx + 0.5) * TILE, (ty + 0.5) * TILE, 12);
    const step = this._navStepFn ? this._navStepFn({}) : null;
    const elev = this._elev;
    const flat = step && elev
      ? (ax, ay, bx, by) => step(ax, ay, bx, by) && !elev.isRamp(ax, ay) && !elev.isRamp(bx, by) && elev.tileHeight(ax, ay) === elev.tileHeight(bx, by)
      : step;
    this._clWalkFns = { ver, road, solid, step, flat };
    return this._clWalkFns;
  },

  /** ROUND 388 -- where a lamp is lit from (lampAccess), worked out once per nav grid. */
  _clLampAccess(l) {
    const W = this._clLampWalk();
    if (l._clAccVer !== W.ver) {
      l._clAccVer = W.ver;
      l._clAcc = lampAccess(Math.floor(l.x / TILE), Math.floor(l.y / TILE), W.road, W.solid);
      if (l._clAcc) {
        const [sx, sy] = l._clAcc.stand;
        l._clStand = { x: (sx + 0.5) * TILE, y: (sy + 0.5) * TILE };
      }
    }
    return l._clAcc;
  },

  /** ROUND 388 -- the road path for one leg (lamp index `from` to `to` on route `r`): from the cache, or planned now if
   *  this frame still has a plan to spare (LAMP_PLANS_PER_FRAME and the shared nav budget). Returns the leg
   *  ({ pts, len }), null when the roads do not join (the caller skips the lamp), or undefined when it must wait. */
  _clLegPath(r, from, to) {
    const W = this._clLampWalk();
    if (r._legVer !== W.ver) { r._legVer = W.ver; r._legPaths = new Map(); }
    const key = from * 4096 + to;
    if (r._legPaths.has(key)) return r._legPaths.get(key);
    if ((this._clPlansLeft || 0) <= 0) return undefined;
    if (this._navBudget != null && this._navBudget < 1500) return undefined;
    this._clPlansLeft--;
    const A = this._clLampAccess(r.lamps[from]), B = this._clLampAccess(r.lamps[to]);
    let leg = null;
    if (A && B) {
      // the whole ceiling, not what is left of the frame's budget: a search cut short would read as "no road" and skip
      // a lamp that has one
      const res = planLampLeg(A, B, W.road, W.solid, W.step, W.flat, { maxExpand: LAMP_LEG_EXPAND });
      if (this._navBudget != null) this._navBudget -= res.expanded;
      if (res.tiles) leg = legPoints(res.tiles, TILE);
    }
    r._legPaths.set(key, leg);
    this._clLegsPlanned = (this._clLegsPlanned || 0) + 1;
    return leg;
  },

  _clLampTick() {
    const hour = this._clHour();
    for (const l of (this._clLamps || [])) {
      const at = l._clLightAt;
      if (at === undefined) continue;
      // from dusk until its lighter reaches it, a lamp is dark; after midnight and by day, lit (by day nothing shows)
      l.unlit = hour >= LAMPLIGHT.start && hour < at;
    }
  },

  /** ROUND 388 -- "Lamplighter pathing ignores all obstacles and collision, please route the lamplighters on roads."
   *  Where route `r`'s lamplighter is at `hour` (k = the last lamp whose time has come): standing beside a post, lighting
   *  it, facing it; or partway along the ROAD PATH of his current leg (planned once when the leg is first walked near
   *  the player, then read from the cache), at the same clock as before. A lamp whose roads do not join the chain is
   *  skipped -- he walks on to the next -- rather than walked to through something. Returns false when there is no
   *  lamplighter to show, null when this frame had no plan to spare (he keeps where he was). */
  _clLighterAt(r, hour, k) {
    const W = this._clLampWalk();
    if (r._legVer !== W.ver) { r._legVer = W.ver; r._legPaths = new Map(); r._skip = new Set(); }
    const skip = r._skip || (r._skip = new Set());
    const n = r.lamps.length;
    for (let tries = 0; tries < 4; tries++) {
      let from = k; while (from >= 0 && skip.has(from)) from--;
      let to = k + 1; while (to < n && skip.has(to)) to++;
      if (from < 0) {   // nothing reached yet: he waits beside the first post he can reach
        if (to >= n) return false;
        from = to; to = from + 1; while (to < n && skip.has(to)) to++;
      }
      const a = r.lamps[from];
      if (!this._clLampAccess(a)) { skip.add(from); continue; }   // no road to this post: skipped
      const S = a._clStand;
      const face = facingFromMove(a.x - S.x, a.y - S.y) || 'south';
      const tLit = r.legs[from], t0 = tLit + LAMPLIGHT.pause / 25;
      // beside the post, facing it: lighting it, or done for the night
      if (to >= n || hour < t0) return { x: S.x, y: S.y, moving: false, facing: face, lighting: hour >= tLit && hour < t0, lamp: a };
      const leg = this._clLegPath(r, from, to);
      if (leg === undefined) return null;
      if (leg === null) { skip.add(to); continue; }   // the roads do not join: that lamp is skipped
      const t1 = r.legs[to];
      const f = t1 <= t0 ? 1 : Math.max(0, Math.min(1, (hour - t0) / (t1 - t0)));
      const q = pointAlong(leg.pts, f * leg.len);
      return { x: q.x, y: q.y, moving: f < 1, facing: facingFromMove(q.dx, q.dy) || face, lighting: false, lamp: null };
    }
    return null;
  },

  /** The lamplighters near the player, walking their chains on the clock. */
  _clLighterTick(dt) {
    const hour = this._clHour();
    const routes = this._clLampRoutes || [];
    const px = this.world.x, py = this.world.y;
    const want = new Set();
    this._clPlansLeft = LAMP_PLANS_PER_FRAME;   // ROUND 388 -- however many lamplighters, at most this many legs planned a frame
    if (!this._insideRoom && hour >= LAMPLIGHT.start - 0.05 && hour < LAMPLIGHT.start + LAMPLIGHT.span + 0.6) {
      for (const r of routes) {
        if (hour > r.end + 0.05) continue;
        // where he is on his chain now
        let i = 0;
        while (i + 1 < r.legs.length && hour >= r.legs[i + 1]) i++;
        // ROUND 388 -- a cheap test first, so no leg is planned for a lamplighter nobody is near
        if (Math.hypot(r.lamps[i].x - px, r.lamps[i].y - py) > 1300 + 26 * TILE) continue;
        const at = this._clLighterAt(r, hour, i);
        if (at === false) continue;
        if (at === null) { if (r._lighter && r._at) { r._at.moving = false; want.add(r); } continue; }
        if (Math.hypot(at.x - px, at.y - py) > 1300) continue;
        want.add(r);
        r._at = at;
      }
    }
    this._clLighters = this._clLighters || [];
    for (const L of this._clLighters) if (!want.has(L.route)) { L.route._lighter = null; if (L.sprite) L.sprite.destroy(); L.dead = true; this.npcs = this.npcs.filter(n => n !== L); }
    this._clLighters = this._clLighters.filter(L => !L.dead);
    for (const r of want) {
      let L = r._lighter;
      if (!L) {
        L = this._clNpc({ name: 'Lamplighter', artKey: 'npc_townsman', x: r._at.x, y: r._at.y, facing: 'south', cityLife: 'lamplighter', dialogue: null });
        if (!L) continue;
        L.route = r; r._lighter = L; this._clLighters.push(L);
      }
      L.x = r._at.x; L.y = r._at.y; L.facing = r._at.facing;
      const p = isoProject(L.x, L.y);
      L.sprite.setPosition(p.x, p.y).setDepth(isoDepth(L.x, L.y));
      if (this._npcWalkFrame) this._npcWalkFrame(L, L.artKey, L.facing, r._at.moving, dt);
      if (r._at.lighting && !L._flared) {
        L._flared = true;
        const lamp = r._at.lamp;   // ROUND 388 -- the post he is standing beside
        if (lamp && lamp.sprite && this.textures.exists('glowBlob')) {
          const g = this.add.image(lamp.sprite.x, lamp.sprite.y - 70, 'glowBlob').setBlendMode('ADD').setTint(0xffd27a)
            .setScale(0.02).setAlpha(0.9).setDepth(lamp.sprite.depth + 1);
          this.tweens.add({ targets: g, scale: 0.12, alpha: 0, duration: 650, onComplete: () => g.destroy() });
        }
      } else if (!r._at.lighting) L._flared = false;
    }
  },

  // ---------------------------------------------------------------- the wagons on the roads
  /** ROUND 373 -- the wagons on the main roads: the covered and plated wagons, driving themselves (no horses, the
   *  user's rule), out from Cadence's gates along the Nek's roads and back. Each one's place is a pure function of the
   *  clock, so a wagon nobody is near costs nothing and is where it should be when somebody arrives. */
  _clBuildWagonRoutes() {
    const region = REGIONS.find(r => r.id === 'nek');
    this._clWagons = [];
    if (!region) return;
    const routes = [];
    for (const road of (region.roads || [])) {
      const pts = (road.points || []).map(pt => regionPoint(region, pt)).filter(Boolean);
      if (pts.length < 2) continue;
      // From the first point outside the city's wall, outward, for about 170 tiles.
      let i0 = pts.findIndex(p => !this._clInCadenceXY(p.x, p.y));
      if (i0 < 0) continue;
      if (i0 > 0) i0 -= 1;
      const path = [pts[i0]];
      let len = 0;
      for (let i = i0 + 1; i < pts.length && len < 170 * TILE; i++) { len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); path.push(pts[i]); }
      if (len < 40 * TILE) continue;
      routes.push({ path, len });
    }
    const kinds = [['wagon_wood', 'asbuilt'], ['wagon_metal', 'asbuilt'], ['wagon_wood', 'amber'], ['wagon_metal', 'verdigris']];
    routes.forEach((r, i) => {
      const [vid, colour] = kinds[i % kinds.length];
      const v = VEHICLE_BY_ID[vid];
      if (!v) return;
      this._clWagons.push({ route: r, vid, colour, art: v.art, move: v.move, speed: 150 + (i % 3) * 20, phase: (i * 0.37) % 1, sprite: null, glow: null });
    });
    // the moving sheets are fetched the first time a wagon is seen
  },

  _clWagonTick(dt) {
    const px = this.world.x, py = this.world.y;
    const t = (this._clockT || 0);
    for (const w of (this._clWagons || [])) {
      const R = w.route;
      const period = (2 * R.len) / w.speed;
      let s = ((t / period + w.phase) % 1) * 2 * R.len;
      const back = s > R.len;
      if (back) s = 2 * R.len - s;
      // walk the path to arc length s
      let i = 0, acc = 0;
      while (i + 1 < R.path.length) {
        const seg = Math.hypot(R.path[i + 1].x - R.path[i].x, R.path[i + 1].y - R.path[i].y);
        if (acc + seg >= s) break;
        acc += seg; i++;
      }
      const a = R.path[i], b = R.path[Math.min(i + 1, R.path.length - 1)];
      const seg = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const f = Math.min(1, (s - acc) / seg);
      // drive on the right of the road's line, so two wagons passing do not drive through each other
      const nx = -(b.y - a.y) / seg, ny = (b.x - a.x) / seg, off = back ? -18 : 18;
      const x = a.x + (b.x - a.x) * f + nx * off, y = a.y + (b.y - a.y) * f + ny * off;
      w.x = x; w.y = y;
      const near = !this._insideRoom && Math.hypot(x - px, y - py) < 1500;
      if (!near) { if (w.sprite) { w.sprite.destroy(); w.sprite = null; } if (w.glow) { w.glow.destroy(); w.glow = null; } continue; }
      const sheet = w.move && w.move.sheet;
      if (!sheet) continue;
      if (!this.textures.exists(sheet)) { this._clLoadSheet(sheet, w.move.cell); continue; }
      const dx = (b.x - a.x) * (back ? -1 : 1), dy = (b.y - a.y) * (back ? -1 : 1);
      const facing = facingFromMove(dx, dy) || 'south';
      const step = Math.floor((t * 1000) / (w.move.frameMs || 70)) % (w.move.framesPerDir || 1);
      const frame = dirRow(facing) * (w.move.framesPerDir || 1) + step;
      const p = isoProject(x, y);
      if (!w.sprite) {
        w.sprite = this.add.sprite(p.x, p.y, sheet, frame);
        w.sprite.setOrigin(0.5, (w.move.footY || 127) / (w.move.cell || 128));
        w.sprite.setScale(VEHICLE_WORLD_SCALE);   // ROUND 403 -- 30% bigger
        if (this.textures.exists('glowBlob')) w.glow = this.add.image(p.x, p.y, 'glowBlob').setBlendMode('ADD').setTint(0x6fb6ff).setScale(0.07).setAlpha(0.55);
      }
      w.sprite.setFrame(frame).setPosition(p.x, p.y).setDepth(isoDepth(x, y));
      if (w.glow) w.glow.setPosition(p.x, p.y - 8).setDepth(isoDepth(x, y) - 1).setAlpha(0.35 + 0.2 * Math.sin(t * 3 + w.phase * 9));
    }
  },

  _clLoadSheet(sheet, cell) {
    this._clLoading = this._clLoading || new Set();
    if (this._clLoading.has(sheet)) return;
    this._clLoading.add(sheet);
    this.load.spritesheet(sheet, `./public/assets/${sheet}.png`, { frameWidth: cell || 128, frameHeight: cell || 128 });
    if (!this.load.isLoading()) this.load.start();
  },

  // ---------------------------------------------------------------- sound
  _clBuildSounds() {
    const site = (id) => {
      if (id === 'market') { const D = CADENCE_DISTRICTS.market; return this._clAt((D.x0 + D.x1) / 2, (D.y0 + D.y1) / 2); }
      const b = (this.buildings || []).find(q => q && q.singleton === id && this._clInCadenceXY(q.x, q.y));
      return b ? { x: b.x, y: b.y } : null;
    };
    this._clSounds = DISTRICT_SOUNDS.map(d => ({ ...d, at: site(d.site), snd: null })).filter(d => d.at);
    const T = CADENCE_DISTRICTS.temple;
    this._clBellAt = T ? this._clAt((T.x0 + T.x1) / 2, (T.y0 + T.y1) / 2) : null;
  },

  _clSoundTick() {
    if (!this.sound || !this._clSounds) return;
    const bus = this._busVolume ? this._busVolume('ambiance') : 1;
    const hour = this._clHour();
    const room = this._insideRoom;
    for (const s of this._clSounds) {
      let v = 0;
      if (!room) {
        const d = Math.hypot(this.world.x - s.at.x, this.world.y - s.at.y) / TILE;
        const near = Math.max(0, 1 - d / s.reach);
        v = s.vol * Math.pow(near, 1.4) * s.hours(hour);
      } else if (room._forBuilding && room._forBuilding.singleton === s.site) {
        v = s.vol * 1.25 * Math.max(0.15, s.hours(hour));   // inside the tavern, you are in the noise
      } else if (room.id === 'blacksmith' && s.site === 'blacksmith') {
        v = s.vol * 1.1 * s.hours(hour);
      }
      v *= bus;
      // ROUND 410 -- a one-shot (`every`): played once when you come in reach, then once every `every` seconds while you
      // stay; it follows your distance while it plays, and is not started again until the wait is over.
      if (s.every) {
        if (v <= 0.004) { if (!s.snd) s.wait = s.firstAfter || 8; }
        else {
          s.wait = (s.wait == null ? (s.firstAfter || 8) : s.wait) - 0.5;
          if (!s.snd && s.wait <= 0) {
            if (!this.cache.audio.exists(s.key)) { if (this._requestAudio) this._requestAudio(s.key); s.wait = 1; }
            else {
              try {
                s.snd = this.sound.add(s.key, { loop: false, volume: v }); s.cur = v;
                s.snd.once('complete', () => { try { s.snd && s.snd.destroy(); } catch (e) { /* gone */ } s.snd = null; });
                s.snd.play();
                this._clAnvilPlays = (this._clAnvilPlays || 0) + 1;
              } catch (e) { s.snd = null; }
              s.wait = s.every;
            }
          }
        }
        if (s.snd) { s.cur = (s.cur || 0) + (v - (s.cur || 0)) * 0.3; try { s.snd.setVolume(s.cur); } catch (e) { /* gone */ } }
        continue;
      }
      if (v > 0.004 && !s.snd) {
        if (!this.cache.audio.exists(s.key)) { if (this._requestAudio) this._requestAudio(s.key); continue; }
        try { s.snd = this.sound.add(s.key, { loop: true, volume: 0 }); s.snd.play(); } catch (e) { s.snd = null; }
      }
      if (s.snd) {
        // eased toward the target on our own number (a sound's `volume` is not dependable on every backend)
        const cur = s.cur || 0;
        s.cur = cur + (v - cur) * 0.15;
        s.snd.setVolume(s.cur);
        if (v <= 0.002 && s.cur < 0.004) { try { s.snd.stop(); s.snd.destroy(); } catch (e) { /* gone */ } s.snd = null; s.cur = 0; }
      }
    }
    // the temple bells, on the hour, from six until ten at night
    const h = Math.floor(hour);
    if (this._clBellHour !== h) {
      const was = this._clBellHour;
      this._clBellHour = h;
      if (was !== undefined && h >= 6 && h <= 22 && this._clBellAt && !room) {
        const d = Math.hypot(this.world.x - this._clBellAt.x, this.world.y - this._clBellAt.y) / TILE;
        const vol = TEMPLE_BELL.vol * Math.max(0, 1 - d / TEMPLE_BELL.reach) * bus;
        if (vol > 0.01) {
          if (this.cache.audio.exists(TEMPLE_BELL.key)) { try { this.sound.play(TEMPLE_BELL.key, { volume: vol }); } catch (e) { /* quiet */ } }
          else if (this._requestAudio) this._requestAudio(TEMPLE_BELL.key);
          this._clBellRung = (this._clBellRung || 0) + 1;
        }
      }
    }
  },
};

// ============================================================================================ the clock running it all
Object.assign(CityLifeMixin, {
  _cityLifeTick(dt) {
    if (!this.player || !this.townOrigin) return;
    try {
      this._clLighterTick(dt);
      this._clWagonTick(dt);
      if (this._gridLifeTick) this._gridLifeTick(dt);   // ROUND 416 -- the grid cities' walkers and parties
      this._clSparTick(dt);
      this._clProcessionTick(dt);
      this._clNightFx(dt);
      this._clDummyFrameTick(dt);
      if (this._h422Tick) this._h422Tick(dt);   // ROUND 422 -- the roundhouse hearth's smoke
      this._clA = (this._clA || 0) + dt;
      if (this._clA >= 0.5) {
        this._clA = 0;
        this._clSoundTick();
        this._clScheduleTick();
        this._clGreetTick();
        this._clCrierTick();
        this._clRoomTick();
        this._clDummyTick();
      }
      this._clB = (this._clB || 0) + dt;
      if (this._clB >= 1) {
        this._clB = 0;
        this._clLampTick();
        this._clNewsTick();
        this._clRainNow = this._clRainId();
      }
    } catch (e) {
      if (!this._clErrLogged) { this._clErrLogged = true; console.warn('[cityLife]', e); }
    }
  },

  // ---------------------------------------------------------------- rain: everyone runs for a doorway
  _clRainId() {
    const w = this._wx;
    if (!w || !w.id || (w.s || 0) < 0.35) return null;
    return w.id;
  },
  /** Does this townsperson want out of the weather right now? (WorldScene `_stepFolk` asks.) */
  _clShelterNow(f) {
    const id = this._clRainNow;
    if (!id || !f || !f.life) return false;
    return sheltersFrom(id, f.life.sociability);
  },
  /** Somebody indoors stays in while it is still coming down. */
  _clKeepInside(f) { return this._clShelterNow(f); },

  // ---------------------------------------------------------------- the schedule
  _clScheduleTick() {
    const hour = this._clHour(), day = this._clDay();
    const open = stallsOpen(hour);
    const market = isMarketDay(day);
    const holy = holyDayGod(day);
    // the stallholders keep the market's hours (every market, not only Cadence's)
    for (const n of (this.npcs || [])) {
      if (!n || !n.vendor || !n.stallRef) continue;
      if (n.shady && this._shadyGone && this._shadyGone()) continue;
      const shut = !open || (n.clMarketDay && !market);
      if (!!n.hidden !== shut) {
        n.hidden = shut;
        if (n.sprite) n.sprite.setVisible(!shut);
        n.stallRef._closed = shut;
      }
    }
    // the goods on the tables are packed away with them
    for (const c of (this.cityProps || [])) {
      if (!c || !(c.prop === 'spicePots' || c.prop === 'produceCrates')) continue;
      c.hidden = !open;
      if (c.sprite && !open) { c.sprite.setVisible(false); this._cityPropPool.push(c.sprite); c.sprite = null; }
    }
    const D = this._clDyn;
    if (D) {
      const show = (rec, on) => {
        if (!rec) return;
        rec.hidden = !on;
        if (!on && rec.sprite) { rec.sprite.setVisible(false); this._cityPropPool.push(rec.sprite); rec.sprite = null; }
      };
      for (const rec of D.market) show(rec, market && open);
      for (const [g, list] of Object.entries(D.holy)) for (const rec of list) show(rec, holy === g);
      // the hooded trader: wanted while he is at large, CAUGHT for five days after
      const sh = this.player.shady || {};
      const wanted = sh.quest === 'arrest';
      const caught = (sh.quest === 'arrested' || sh.quest === 'done') && day - (sh.arrestedDay || 0) <= 5;
      for (const rec of D.wanted) {
        const want = wanted ? CITYLIFE_FRAMES.posterWanted : caught ? CITYLIFE_FRAMES.posterCaught : null;
        if (want !== null && rec.frame !== want) { rec.frame = want; if (rec.sprite) rec.sprite.setFrame(want); }
        show(rec, want !== null);
        if (rec.npc) rec.npc.hidden = want === null;
      }
      // the Society hall in black while one of its own is being mourned
      const adv = this.player.adv;
      const mourning = !!(adv && adv.mourning && Object.keys(adv.mourning).length);
      for (const rec of D.drape) show(rec, mourning);
    }
    // the market day's merchants
    for (const m of (this._clMerchants || [])) {
      const on = market && open;
      m.hidden = !on;
      if (m.sprite) m.sprite.setVisible(on && !this._insideRoom);
    }
    this._clSurgeWatch();
    this._clCemeteryTick(day, hour);
  },

  // ---------------------------------------------------------------- the news
  _clNewsTick() {
    const p = this.player, st = this._clState();
    const order = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
    const rank = p.rank || 'normal';
    if (st.lastRank && order.indexOf(rank) > order.indexOf(st.lastRank)) st.rankUp = { rank, day: this._clDay() };
    st.lastRank = rank;
    const soc = this._societyState ? this._societyState() : null;
    if (soc && soc.joined) {
      const key = `${soc.rank}:${soc.stars}`;
      if (st.starsSeen && st.starsSeen !== key) st.starsDay = this._clDay();
      st.starsSeen = key;
    }
  },

  _clWorldSnapshot() {
    const p = this.player, st = this._clState(), day = this._clDay();
    const adv = p.adv || {};
    const deaths = Object.entries(adv.dead || {}).map(([who, d]) => ({ who, ...d, funeralDay: d.day + 1 }))
      .sort((a, b) => b.day - a.day).slice(0, 4);
    const soc = this._societyState ? this._societyState() : null;
    let marketNextIn = null;
    for (let k = 0; k < MARKET_WEEK; k++) if (isMarketDay(day + k)) { marketNextIn = k; break; }
    return {
      day, name: p.name, rank: p.rank || 'normal',   // ROUND 388 -- the crier grades only a Bronze or better
      surging: !!(this._surging && this._surging()),
      shady: (p.shady || {}).quest || null, shadyDay: (p.shady || {}).arrestedDay, shadyBy: p.name,
      deaths, teamNames: adv.teamNames || {},
      rankUp: st.rankUp, stars: soc && soc.joined ? soc.stars : null, starsDay: st.starsDay,
      holyToday: holyDayGod(day), holyNext: nextHolyDay(day + 1) ? { ...nextHolyDay(day + 1), inDays: nextHolyDay(day + 1).day - day } : null,
      marketToday: isMarketDay(day), marketNextIn, heavyRain: HEAVY_RAIN.includes(this._clRainNow),
    };
  },
  _clHeadlines() { return crierHeadlines(this._clWorldSnapshot()); },

  _clCrierTick() {
    const c = this._clCrier;
    if (!c || this._insideRoom) return;
    const d = Math.hypot(this.world.x - c.x, this.world.y - c.y);
    if (d > 14 * TILE) return;
    this._clCrierT = (this._clCrierT === undefined ? 2 : this._clCrierT) - 0.5;
    if (this._clCrierT > 0) return;
    this._clCrierT = 15;
    // ROUND 388 -- the real headlines, then a piece of the city's own news from his pool (townTalk.js, Cadence's
    // crier), in turn. A quiet day used to be one notice read every fifteen seconds all day.
    const news = this._clHeadlines().filter(h => h.k !== 'quiet');
    this._clCrierIdx = ((this._clCrierIdx || 0) + 1) % (news.length + 1);
    const slot = this._clCrierIdx % (news.length + 1);
    const line = slot < news.length ? news[slot].text
      : ((this._ttPoolLine && this._ttPoolLine(c, CITY, 'crier')) || this._clHeadlines()[0].text);
    if (this._sayOverhead) this._sayOverhead(c, line, '#ffe082', 6.5);
    this._clCrierSaid = (this._clCrierSaid || 0) + 1;
  },

  // ---------------------------------------------------------------- being known in the street
  _clFame() {
    return fameTier(this.player.rank, this._societyState ? this._societyState() : null);
  },
  _clDeeds() {
    const p = this.player, st = this._clState();
    const sh = p.shady || {};
    return {
      shadyCaught: sh.quest === 'arrested' || sh.quest === 'done',
      olb: !!(this._olbChainDone && this._olbChainDone()),
      holyQuests: st.holyQuests || 0,
      contracts: (p.quests || []).filter(q => q.state === 'turnedIn').length + ((this._societyState && this._societyState().done) || 0),
      rankUp: st.rankUp && this._clDay() - st.rankUp.day <= 3 ? st.rankUp.rank : null,
      funerals: st.funerals || 0,
    };
  },
  /** One line from a townsperson who knows who you are, or null. Used by the street talk (WorldScene's generic branch)
   *  and by the crowd as you pass. */
  _clKnownLine(npc, seed = 0) {
    if (npc && (npc.guard || npc.shopId || npc.vendor || npc.party || npc.adventurer)) return null;
    // ROUND 388 -- "When the player is iron rank a few might learn something about them". This was appended to
    // EVERY townsperson you talked to, so every one of them greeted an Iron with "Safe roads, iron." Now a deed is
    // mentioned one time in three, and your standing only by as many people as it deserves where you are standing
    // (townTalk.js rankStanding): a nobody here, one in ten; a name, one in four; above that, most of them.
    const tier = this._clFame();
    const s = ((seed >>> 0) + this._clDay()) >>> 0;
    const rumour = deedRumour(this._clDeeds(), s);
    if (rumour && s % 3 === 0) return rumour;
    if (!tier) return null;
    const standing = this._ttStanding ? this._ttStanding() : tier - 2;
    if (standing <= 0 && s % 10 !== 0) return null;
    if (standing === 1 && s % 4 !== 0) return null;
    const pool = FAME_GREETINGS[tier];
    return pool[s % pool.length];
  },
  _clGreetTick() {
    if (this._insideRoom || this._dialogueOpen) return;
    this._clGreetCd = Math.max(0, (this._clGreetCd || 0) - 0.5);
    if (this._clGreetCd > 0) return;
    // ROUND 388 -- "NPCs all say the same insane line about being iron." Seven passers-by in ten used to say a
    // FAME_GREETINGS line, and for an Iron those were "Iron yet? You will be." and "Safe roads, iron." Now a person
    // says what THEY have on their mind, out of their city's pool for their role (townTalk.js, about 35 lines a
    // pool, a shuffle bag each so nobody repeats themselves back to back); a holy or market day in Cadence is in
    // some mouths; your rank comes up only as rarely as RANK_NODS allows; and what you did, now and then.
    const deeds = this._clDeeds();
    const day = this._clDay();
    const holy = holyDayGod(day), market = isMarketDay(day) && stallsOpen(this._clHour());
    const best = this._ttSpeakerNear ? this._ttSpeakerNear(4.5 * TILE) : null;
    if (!best) return;
    const seed = (((best.life && best.life.seed) || hashStr(String(best.name || best.id || 'guard'))) >>> 4) + Math.floor((this._clockT || 0) / 30);
    const inCadence = this._ttCityOf ? this._ttCityOf(best) === CITY : true;
    const festive = !inCadence ? null
      : holy ? [`Blessings of ${GOD_NAME[holy]} on you!`, `${GOD_NAME[holy]}'s day! Have you seen the procession?`, 'The temple is giving gifts at the door, did you hear?']
      : market ? ['Market day! The traders from away are in.', 'Have you been to the tents? Saffron, for a price.', 'Mind your purse, it\'s market day.'] : null;
    let line = null;
    if (festive && seed % 10 < 3) line = festive[seed % festive.length];
    if (!line && this._ttNodFor) line = this._ttNodFor(best);
    if (!line && best.life && seed % 12 === 0) line = deedRumour(deeds, seed);
    if (!line && this._ttAmbientLine) line = this._ttAmbientLine(best);
    if (!line) { best._clGreetUntil = (this._clockT || 0) + 30; return; }   // nothing to say: look past them for a while
    best._clGreetUntil = (this._clockT || 0) + 90;
    this._clGreetCd = 9 + (seed % 6);
    if (this._ttSay) this._ttSay(best, line);
    else if (this._folkSay && best.life) this._folkSay(best, line);
    this._clGreets = (this._clGreets || 0) + 1;
  },

  // ---------------------------------------------------------------- the cemetery and the funerals
  /** A stone for each adventurer the world has lost, the morning-after funeral, and the mourners. */
  _clCemeteryTick(day, hour) {
    const adv = this.player.adv;
    if (!adv || !this._clPlots) return;
    const dead = Object.entries(adv.dead || {}).sort((a, b) => a[1].day - b[1].day);
    const free = this._clPlots.filter(p => !p.old);
    this._clGraveOf = this._clGraveOf || {};
    dead.forEach(([who, d], i) => {
      const plot = free[i];
      if (!plot) return;
      const fresh = day - d.day <= 3;
      const frame = CITYLIFE_FRAMES[fresh ? 'grave_fresh' : 'grave_round'];
      if (!plot.rec) {
        const ep = epitaphFor(who, d, adv.teamNames);
        if (!ep) return;
        plot.rec = { x: plot.x, y: plot.y, sprite: null, sheet: CL_ART.key, art: CL_ART, frame, radius: 10, solid: false, cityProp: true, clutter: true, cl: 'grave', who };
        this.cityProps.push(plot.rec);
        plot.who = who;
        this.npcs.push({ name: ep.name, x: plot.x, y: plot.y + 12, sprite: null, cityLife: 'grave', prompt: 'read the headstone', reach: 34, noDot: true, plot, ep });
        this._clGraveOf[who] = plot;
      } else if (plot.rec.frame !== frame) {
        plot.rec.frame = frame;
        if (plot.rec.sprite) plot.rec.sprite.setFrame(frame);
      }
    });
    // the funeral
    const fun = funeralFor(adv.dead, day, hour);
    const plot = fun && this._clGraveOf[fun.who];
    if (fun && plot && !this._clFuneral) this._clStartFuneral(fun, plot);
    if ((!fun || !plot) && this._clFuneral) this._clEndFuneral();
    if (this._clFuneral && !this._insideRoom && Math.hypot(this.world.x - plot.x, this.world.y - plot.y) < 6 * TILE) {
      const st = this._clState();
      const key = `${fun.who}|${fun.day}`;
      if (!st.funeralSeen[key]) { st.funeralSeen[key] = true; st.funerals = (st.funerals || 0) + 1; }
    }
  },

  _clStartFuneral(fun, plot) {
    const a = ADV_BY_ID[fun.who];
    const team = ADV_TEAM_BY_ID[fun.team];
    const adv = this.player.adv || {};
    const teamName = (adv.teamNames && adv.teamNames[fun.team]) || (team && team.name) || 'their team';
    const out = [];
    const priest = this._clNpc({ name: 'Priest of Death', artKey: NPC_ART.npc_priest_old_death ? 'npc_priest_old_death' : 'npc_priest_m_death',
      x: plot.x, y: plot.y - 46, facing: 'southwest', cityLife: 'mourner', dialogue: null,
      eulogy: `"${a ? a.name : 'They'} of ${teamName}. The road kept them; the city keeps their name. Say it with me, and then go home and live well. That is the whole rite."` });
    if (priest) out.push(priest);
    const models = ['npc_townsman', 'npc_confident_woman', 'npc_grizzled_adventurer', 'npc_sleek_woman', 'npc_patterned_man', 'npc_female_adventurer'];
    const alive = team ? team.members.filter(id => !(adv.dead || {})[id]) : [];
    for (let i = 0; i < 6; i++) {
      const ang = Math.PI * (0.15 + i * 0.16);
      const x = plot.x + Math.cos(ang) * 64, y = plot.y + Math.sin(ang) * 64;
      if (this._collidesObstacle(x, y, 10)) continue;
      const mate = alive[i] && ADV_BY_ID[alive[i]];
      const n = this._clNpc({ name: mate ? mate.name : 'Mourner', artKey: models[i % models.length], x, y,
        facing: facingFromMove(plot.x - x, plot.y - y) || 'north', cityLife: 'mourner', dialogue: null,
        eulogy: mate ? `"We'll manage. We always said we'd manage. Thank you for coming."` : `"I didn't know them well. I came anyway. Somebody should."` });
      if (n) out.push(n);
    }
    this._clFuneral = { who: fun.who, people: out };
  },
  _clEndFuneral() {
    for (const n of (this._clFuneral ? this._clFuneral.people : [])) { if (n.sprite) n.sprite.destroy(); }
    const gone = new Set(this._clFuneral ? this._clFuneral.people : []);
    this.npcs = (this.npcs || []).filter(n => !gone.has(n));
    this._clFuneral = null;
  },

  // ---------------------------------------------------------------- the surge: the watch doubled
  _clSurgeWatch() {
    const surge = !!(this._surging && this._surging());
    if (surge && !this._clWatch) {
      this._clWatch = [];
      const spots = [];
      for (const w of (this._cityWalls || [])) if (w && w.gateArch && this._clInCadenceXY(w.x, w.y)) spots.push(w);
      const c = this._clAt(0, 0);
      const toward = (g, k) => { const dx = c.x - g.x, dy = c.y - g.y, d = Math.hypot(dx, dy) || 1; return { x: g.x + dx / d * (5 + k) * TILE, y: g.y + dy / d * (5 + k) * TILE }; };
      const arts = ['guardCity', 'guardM', 'guardF'];
      spots.slice(0, 6).forEach((g, i) => {
        for (const k of [0, 1]) {
          const at = toward(g, k * 1.4);
          const pos = { x: at.x + (k ? 40 : -40), y: at.y + (k ? -40 : 40) };
          if (this._collidesObstacle(pos.x, pos.y, 12)) continue;
          const art = arts[(i + k) % 3];
          if (!this.textures.exists(`${art}_idle`)) continue;
          const pp = isoProject(pos.x, pos.y);
          const sp = this.add.sprite(pp.x, pp.y, `${art}_idle`, dirRow(facingFromMove(g.x - c.x, g.y - c.y) || 'south'));
          sp.setOrigin(0.5, 0.95).setDepth(isoDepth(pos.x, pos.y));
          const n = { name: 'Surge Watch', x: pos.x, y: pos.y, sprite: sp, cityLife: 'watch', dialogue: null };
          this.npcs.push(n); this._clWatch.push(n);
        }
      });
    } else if (!surge && this._clWatch) {
      const gone = new Set(this._clWatch);
      for (const n of this._clWatch) if (n.sprite) n.sprite.destroy();
      this.npcs = this.npcs.filter(n => !gone.has(n));
      this._clWatch = null;
    }
    if (this._clWatch) for (const n of this._clWatch) if (n.sprite) n.sprite.setVisible(!this._insideRoom);
  },

  // ---------------------------------------------------------------- the barracks yard
  _clSparTick(dt) {
    const S = this._clSparring;
    if (!S || !S.length || this._insideRoom) return;
    if (Math.hypot(this.world.x - S[0].x, this.world.y - S[0].y) > 1400) return;
    for (const g of S) {
      g.t += dt;
      const cyc = 2.4;
      const ph = (g.t % cyc) / cyc;
      const swinging = ph < 0.45;
      const a = this._clGuardArt(g.art);
      if (!a) continue;
      const anim = swinging ? 'attack' : 'idle';
      const key = `${g.art}_${anim}`;
      const spec = a[anim];
      const step = swinging ? Math.min(spec.framesPerDir - 1, Math.floor((ph / 0.45) * spec.framesPerDir)) : 0;
      const frame = dirRow(g.facing) * spec.framesPerDir + step;
      if (g.sprite.texture.key !== key) { g.sprite.setTexture(key, frame); g.sprite.setOrigin(0.5, spec.foot / spec.cell); }
      else g.sprite.setFrame(frame);
      // a half step in on the swing and back out again
      const lunge = swinging ? Math.sin(ph / 0.45 * Math.PI) * 10 : 0;
      const dir = g.k ? -1 : 1;
      const x = g.hx + dir * lunge, y = g.hy + dir * lunge;
      const p = isoProject(x, y);
      g.sprite.setPosition(p.x, p.y).setDepth(isoDepth(x, y));
    }
  },
  _clGuardArt(art) {
    this._clGuardArtCache = this._clGuardArtCache || {};
    if (this._clGuardArtCache[art] !== undefined) return this._clGuardArtCache[art];
    const g = (this.guards || []).find(q => q.artKey === art);
    return (this._clGuardArtCache[art] = g ? g.art : null);
  },

  // ---------------------------------------------------------------- the training dummies
  /** "It could double as a place to test special attacks on dummies." Four dummies in the barracks yard: real targets
   *  -- selectable, homed on, struck by every weapon, ability, damage-over-time and debuff the game has -- that never
   *  die, never move and never strike back. Each keeps a tally over its head: the last blow, and the damage per second
   *  over the last ten seconds. Their rank is read as the player's own, so the numbers are the numbers. */
  _clDummyTick() {
    const spots = this._clDummySpots || [];
    if (!spots.length || !this.monsters || !this.currentRegion || this.currentRegion.id !== 'nek') return;
    const near = Math.hypot(this.world.x - spots[0].x, this.world.y - spots[0].y) < 2400 && !this._insideRoom;
    this._clDummies = (this._clDummies || []).filter(m => m && m.alive && this.monsters.includes(m));
    if (!near) return;
    for (let i = this._clDummies.length; i < spots.length; i++) {
      const at = spots.find(s => !this._clDummies.some(m => Math.hypot(m.wx - s.x, m.wy - s.y) < 8));
      if (!at) break;
      const m = this._spawnMonster('slimeVerdant', at.x, at.y, null, null);
      if (!m) break;
      m.dummy = true;
      m.type = { ...m.type, name: 'Training Dummy', armor: 0, xp: 0, speed: 0, aggro: 0, dmg: 0, critChance: 0 };
      m.xp = 0; m.dmg = 0;
      m.hp = m.maxHp = 1000000;
      m.lurk = false; m.state = 'idle'; m._artHidden = false;
      if (m.sprite) {
        m.sprite.setTexture(CL_ART.key, CITYLIFE_FRAMES.dummy);
        m.sprite.setOrigin(CL_ART.footX, CL_ART.footY).setScale(CL_ART.scale).setVisible(true).setAlpha(1);
        const p = isoProject(at.x, at.y);
        m.sprite.setPosition(p.x, p.y).setDepth(isoDepth(at.x, at.y));
      }
      m._clHits = [];
      this._clDummies.push(m);
    }
  },
  /** A blow landed on a dummy (WorldScene `_damageMonster` calls this instead of killing it). */
  _clDummyHit(m, dmg, credit = true) {
    if (m.hp < m.maxHp * 0.5) m.hp = m.maxHp;
    if (!credit) return;   // a companion's blows land, but the tally is yours
    const now = (this._clockT || 0);
    m._clHits = (m._clHits || []).filter(h => now - h.t <= 10);
    m._clHits.push({ t: now, d: dmg });
    m._clLast = dmg;
  },
  _clDummyFrameTick() {
    const now = (this._clockT || 0);
    for (const m of (this._clDummies || [])) {
      if (!m.alive || !m.sprite) continue;
      const hits = (m._clHits || []).filter(h => now - h.t <= 10);
      const first = hits.length ? Math.min(...hits.map(h => h.t)) : now;
      const span = Math.max(1, Math.min(10, now - first + 1));
      const total = hits.reduce((a, h) => a + h.d, 0);
      const text = hits.length ? `last ${m._clLast}  ·  ${Math.round(total / span)} DPS` : '';
      if (!m._clLabel && text) {
        m._clLabel = this.add.text(0, 0, text, { fontFamily: 'monospace', fontSize: '11px', color: '#ffe082', backgroundColor: 'rgba(12,14,18,0.7)', padding: { x: 3, y: 1 } }).setOrigin(0.5, 1);
      }
      if (m._clLabel) {
        const p = isoProject(m.wx, m.wy);
        m._clLabel.setText(text).setPosition(p.x, p.y - 96).setDepth(isoDepth(m.wx, m.wy) + 4000).setVisible(!!text && !this._insideRoom);
      }
    }
  },

  // ---------------------------------------------------------------- the procession
  _clProcessionTick(dt) {
    const day = this._clDay(), hour = this._clHour();
    const god = holyDayGod(day);
    const on = god && hour >= PROCESSION_HOURS[0] && hour < PROCESSION_HOURS[1] && !this._insideRoom;
    if (!on) { if (this._clProc) this._clEndProcession(); return; }
    const temple = (this.buildings || []).find(b => b && b.temple === god && this._clInCadenceXY(b.x, b.y));
    if (!temple || !temple._clTempleDoor) return;
    const door = temple._clTempleDoor;
    if (Math.hypot(this.world.x - door.x, this.world.y - door.y) > 2600) { if (this._clProc) this._clEndProcession(); return; }
    if (!this._clProc || this._clProc.god !== god) {
      if (this._clProc) this._clEndProcession();
      const path = this._clProcessionPath(door);
      if (!path || path.length < 2) return;
      const people = [];
      const priestArt = `npc_priest_old_${god}`;
      const lead = this._clNpc({ name: `High Priest of ${GOD_NAME[god]}`, artKey: NPC_ART[priestArt] ? priestArt : `npc_priest_m_${god}`,
        x: door.x, y: door.y, facing: 'south', cityLife: 'procession', god, dialogue: null });
      if (lead) people.push(lead);
      for (let i = 1; i < PROCESSION_SIZE; i++) {
        const art = [`npc_priest_m_${god}`, `npc_priest_f_${god}`][i % 2];
        const n = this._clNpc({ name: i % 2 ? 'Acolyte' : 'Priest', artKey: NPC_ART[art] ? art : 'npc_townsman', x: door.x, y: door.y,
          facing: 'south', cityLife: 'procession', god, dialogue: null });
        if (n) people.push(n);
      }
      let len = 0;
      for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      this._clProc = { god, path, len, people };
    }
    const P = this._clProc;
    const span = PROCESSION_HOURS[1] - PROCESSION_HOURS[0];
    const f = (hour - PROCESSION_HOURS[0]) / span;
    const s0 = (f < 0.5 ? f * 2 : (1 - f) * 2) * P.len;
    const back = f >= 0.5;
    const pointAt = (s) => {
      s = Math.max(0, Math.min(P.len, s));
      let acc = 0;
      for (let i = 1; i < P.path.length; i++) {
        const a = P.path[i - 1], b = P.path[i], d = Math.hypot(b.x - a.x, b.y - a.y);
        if (acc + d >= s) { const t = d ? (s - acc) / d : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y }; }
        acc += d;
      }
      const z = P.path[P.path.length - 1]; return { x: z.x, y: z.y, dx: 0, dy: 1 };
    };
    P.people.forEach((n, i) => {
      const at = pointAt(s0 + (back ? 1 : -1) * i * 34);
      const moving = Math.abs(dt) > 0;
      const facing = facingFromMove(back ? -at.dx : at.dx, back ? -at.dy : at.dy) || 'south';
      const off = (i % 2 ? 1 : -1) * (i ? 14 : 0);
      n.x = at.x + off; n.y = at.y - off;
      n.facing = facing;
      const p = isoProject(n.x, n.y);
      n.sprite.setPosition(p.x, p.y).setDepth(isoDepth(n.x, n.y));
      if (this._npcWalkFrame) this._npcWalkFrame(n, n.artKey, facing, moving, dt);
    });
  },
  /** The route: from the temple's door toward the plaza, along the paths the town's own walkers use, for at most
   *  sixty tiles; then back the same way. */
  _clProcessionPath(door) {
    this._clProcPaths = this._clProcPaths || {};
    const key = `${Math.round(door.x)},${Math.round(door.y)}`;
    if (this._clProcPaths[key]) return this._clProcPaths[key];
    // The town's own path-finder (navMixin.js), toward the plaza; tried at three reaches in case the far one is beyond it.
    const c = this._clAt(0, 0);
    let path = null;
    const budget = this._navBudget;
    this._navBudget = 200000;   // once per holy day, so it may take the whole search
    for (const f of [1, 0.6, 0.35]) {
      const gx = door.x + (c.x - door.x) * f, gy = door.y + (c.y - door.y) * f;
      path = this._navFind ? this._navFind(door.x, door.y, gx, gy, {}) : null;
      if (path && path.length > 1) break;
    }
    this._navBudget = budget;
    const out = [{ x: door.x, y: door.y }];
    let len = 0;
    for (const p of (path || [])) {
      const last = out[out.length - 1];
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (len + d > 60 * TILE) break;
      out.push({ x: p.x, y: p.y }); len += d;
    }
    if (out.length < 3) return out;   // not kept: the next tick tries again
    return (this._clProcPaths[key] = out);
  },
  _clEndProcession() {
    const P = this._clProc;
    if (!P) return;
    const gone = new Set(P.people);
    for (const n of P.people) if (n.sprite) n.sprite.destroy();
    this.npcs = (this.npcs || []).filter(n => !gone.has(n));
    this._clProc = null;
  },
});

// ============================================================================================ night, inside, talk
Object.assign(CityLifeMixin, {
  // ---------------------------------------------------------------- night details: lit windows, chimney smoke, stall lanterns
  _clNightFx(dt) {
    this._clFxT = (this._clFxT || 0) + dt;
    const dark = this._insideRoom ? 0 : (this._darkness || 0);
    // lit windows: an additive copy of each house's own frame with only its glass painted (tools/make_citylife_art.py)
    if (this._clFxT >= 0.25 || this._clWinDirty) {
      this._clFxT = 0; this._clWinDirty = false;
      this._clWindowPass(dark);
      this._clLanternPass(dark);
    }
    for (const w of (this._clWinUsed || [])) w.setAlpha(Math.min(1, dark * 1.1) * 0.95);
    this._clSmokePass(dt);
  },

  _clLitTonight(b, hour) {
    const h = hashStr(`lit|${Math.round(b.anchorX ?? b.x)}|${Math.round(b.anchorY ?? b.y)}`) % 100;
    let share = 72;
    if (hour >= 23.5 || hour < 1) share = 45;
    else if (hour >= 1 && hour < 4.5) share = 12;
    else if (hour >= 4.5 && hour < 6) share = 30;
    return h < share;
  },

  _clWindowPass(dark) {
    const pool = (this._clWinPool = this._clWinPool || []);
    let used = 0;
    if (dark > 0.02 && this.textures.exists('townPoolLit')) {
      const hour = this._clHour();
      const pRows = this._clPoolRowSet || (this._clPoolRowSet = new Set(LIT_POOL_ROWS));
      const lRows = this._clLargeRowSet || (this._clLargeRowSet = new Set(LIT_LARGE_ROWS));
      for (const b of (this.buildings || [])) {
        const sp = b && b.sprite;
        if (!sp || !sp.displayList || !sp.visible || b.wall) continue;
        const key = sp.texture && sp.texture.key;
        if (key !== 'townPool' && key !== 'townLarge') continue;
        const fr = Number(sp.frame && sp.frame.name);
        if (!Number.isFinite(fr)) continue;
        const row = Math.floor(fr / 8);
        if (key === 'townPool' ? !pRows.has(row) : !lRows.has(row)) continue;
        if (!this._clLitTonight(b, hour)) continue;
        let g = pool[used];
        const tex = key === 'townPool' ? 'townPoolLit' : 'townLargeLit';
        if (!this.textures.exists(tex)) continue;
        if (!g) { g = this.add.image(0, 0, tex, fr); g.setBlendMode('ADD'); pool.push(g); }
        g.setTexture(tex, fr).setVisible(true).setPosition(sp.x, sp.y).setOrigin(sp.originX, sp.originY)
          .setScale(sp.scaleX, sp.scaleY).setFlipX(sp.flipX).setDepth(sp.depth + 0.002);
        used++;
      }
    }
    for (let i = used; i < pool.length; i++) pool[i].setVisible(false);
    this._clWinUsed = pool.slice(0, used);
    this._clWindowCensus = used;
  },

  _clLanternPass(dark) {
    const pool = (this._clLanPool = this._clLanPool || []);
    let used = 0;
    if (dark > 0.02 && this.textures.exists('glowBlob')) {
      for (const c of (this.cityProps || [])) {
        const sp = c && c.sprite;
        if (!sp || !sp.visible || c.hidden || c._closed) continue;
        const stall = c.sheet === 'cityStalls' || c.clMarketDay;
        const lantern = c.clLantern;
        if (!stall && !lantern) continue;
        const spots = lantern ? [[0, -62]] : [[-46, -118], [46, -118]];
        for (const [ox, oy] of spots) {
          let g = pool[used];
          if (!g) { g = this.add.image(0, 0, 'glowBlob'); g.setBlendMode('ADD'); pool.push(g); }
          g.setVisible(true).setPosition(sp.x + ox, sp.y + oy).setScale(lantern ? 0.06 : 0.09).setTint(NIGHT_GLOW_TINT)
            .setAlpha(Math.min(1, dark) * (lantern ? 0.7 : 0.8)).setDepth(sp.depth + 0.6);
          used++;
        }
      }
    }
    for (let i = used; i < pool.length; i++) pool[i].setVisible(false);
    this._clLanternCensus = used;
  },

  /** Where a building's chimney is: the highest drawn pixel of its frame, which on the families picked below is the
   *  chimney's top (measured once per frame and kept). */
  _clChimneyOf(sp) {
    const key = sp.texture.key, fr = sp.frame.name;
    this._clChimCache = this._clChimCache || {};
    const ck = `${key}|${fr}`;
    if (this._clChimCache[ck] !== undefined) return this._clChimCache[ck];
    let out = null;
    try {
      const f = sp.frame;
      const img = f.source.image;
      const cv = document.createElement('canvas'); cv.width = f.cutWidth; cv.height = f.cutHeight;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
      const d = cx.getImageData(0, 0, f.cutWidth, f.cutHeight).data;
      scan: for (let y = 0; y < f.cutHeight; y++) for (let x = 0; x < f.cutWidth; x++) if (d[(y * f.cutWidth + x) * 4 + 3] > 200) { out = { x, y, w: f.cutWidth, h: f.cutHeight }; break scan; }
    } catch (e) { out = null; }
    return (this._clChimCache[ck] = out);
  },

  _clSmokePass(dt) {
    const parts = (this._clSmoke = this._clSmoke || []);
    // the particles already in the air
    for (const q of parts) {
      if (!q.on) continue;
      q.t += dt;
      const k = q.t / q.life;
      if (k >= 1 || this._insideRoom) { q.on = false; q.img.setVisible(false); continue; }
      q.img.setPosition(q.x + q.drift * q.t * 14, q.y - q.t * 22).setScale(q.s0 + k * 0.9).setAlpha(q.a0 * (1 - k));
    }
    this._clSmokeT = (this._clSmokeT || 0) - dt;
    if (this._clSmokeT > 0 || this._insideRoom) return;
    this._clSmokeT = 0.35;
    if (!this.textures.exists('clSmoke')) {
      const c = this.textures.createCanvas('clSmoke', 32, 32);
      const g = c.getContext();
      const grd = g.createRadialGradient(16, 16, 2, 16, 16, 15);
      grd.addColorStop(0, 'rgba(210,210,214,0.9)'); grd.addColorStop(1, 'rgba(210,210,214,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 32, 32); c.refresh();
    }
    const hour = this._clHour();
    const homeFires = hour >= 16 || hour < 9;
    const forge = hour >= 6 && hour < 20;
    const wind = this._wx && this._wx.id ? 1 : 0.4;
    let spawned = 0;
    for (const b of (this.buildings || [])) {
      const sp = b && b.sprite;
      if (!sp || !sp.displayList || !sp.visible || b.wall) continue;
      const key = sp.texture && sp.texture.key;
      const row = Math.floor(Number(sp.frame && sp.frame.name) / 8);
      let smoky = false, steam = false;
      if (b.clSite === 'bathhouse') { smoky = hour >= 6 && hour < 23; steam = true; }   // the bathhouse steams all day
      else if (key === 'townPool' && row >= 32 && row <= 36) smoky = homeFires;
      else if (key === 'townLarge' && row >= 2 && row <= 6) smoky = homeFires;
      else if (key === 'structuresXl' && row >= 6 && row <= 10) smoky = homeFires;   // the brick house
      else if (key === 'structuresXl' && row >= 11 && row <= 20) smoky = forge;     // the forges
      if (!smoky) continue;
      if (!steam && hashStr(`smoke|${Math.round(b.x)}|${Math.round(b.y)}`) % 10 >= 7 && !(key === 'structuresXl' && row >= 11)) continue;
      const ch = this._clChimneyOf(sp);
      if (!ch) continue;
      const sx = sp.x + (ch.x - sp.originX * ch.w) * sp.scaleX * (sp.flipX ? -1 : 1);
      const sy = sp.y + (ch.y - sp.originY * ch.h) * sp.scaleY;
      let q = parts.find(z => !z.on);
      if (!q) {
        if (parts.length >= 140) continue;
        q = { img: this.add.image(0, 0, 'clSmoke'), on: false };
        parts.push(q);
      }
      q.on = true; q.t = 0; q.life = 3 + Math.random() * 1.5; q.x = sx + (Math.random() - 0.5) * 6; q.y = sy - 4;
      q.drift = wind * (0.6 + Math.random() * 0.8); q.s0 = 0.35 + Math.random() * 0.2; q.a0 = 0.32 + Math.random() * 0.12;
      if (steam) {
        q.x += (Math.random() - 0.5) * 60 * sp.scaleX; q.s0 += 0.5; q.a0 += 0.25; q.life += 1.5;
        if (Math.random() < 0.6) this._clSmokeT = 0.12;   // the bathhouse breathes more often than a chimney
      }
      q.img.setVisible(true).setPosition(q.x, q.y).setScale(q.s0).setAlpha(q.a0).setDepth(sp.depth + 1).setTint(steam ? 0xffffff : 0xb4b4b8);
      spawned++;
    }
    this._clSmokeCensus = { active: parts.filter(z => z.on).length, spawned };
  },

  // ---------------------------------------------------------------- inside: the temples by their hours, the pooled rooms by theirs
  _clRoomTick() {
    const room = this._insideRoom || null;
    const hour = this._clHour();
    const bucket = Math.floor(hour);
    if (room !== this._clRoomWas) {
      this._clClearCrew(this._clRoomWas);
      this._clRoomWas = room;
      this._clRoomBucket = null;
      // ROUND 422 -- a house floor's people are put back whenever you step onto it (up the stair, or back down)
      if (room && room._h422Ctx && room._forBuilding && this._h422FillRoom) this._h422FillRoom(room);
    }
    if (!room) return;
    if (this._clRoomBucket === bucket) return;
    this._clRoomBucket = bucket;
    if (room.templeGod) { this._clClearCrew(room); this._clFillTemple(room, hour); }
    else if (room._forBuilding && room._clKind === 'tavern') { this._clClearCrew(room, 'patron'); this._clFillTavern(room, hour); }
    else if (room._forBuilding && room._clKind === 'dive' && this._glFillDive) {   // ROUND 416 -- a dive's patrons
      this._clClearCrew(room, 'divePatron');
      this._glFillDive(room, hour, (...a) => this._clRoomPerson(...a), tavernCrowdAt);
    }
  },

  _clClearCrew(room, only = null) {
    if (!room) return;
    const keep = [];
    for (const n of (this.npcs || [])) {
      if (n && n[CREW] === room.id && (!only || n.cityLife === only)) { if (n.sprite && n.sprite.destroy) n.sprite.destroy(); continue; }
      keep.push(n);
    }
    this.npcs = keep;
  },

  /** A body in a room: a painted crowd texture (the town's own people), standing where the room has space. */
  _clRoomPerson(room, tx, ty, model, variant, facing, def) {
    const at = roomTileCentre(room, tx, ty);
    if (this._collidesObstacle(at.x, at.y, 10)) return null;
    const tex = this._folkTexture ? this._folkTexture(model, variant) : null;
    const art = NPC_ART[model];
    if (!tex || !art || !this.textures.exists(tex)) return null;
    const p = isoProject(at.x, at.y);
    const sp = this.add.sprite(p.x, p.y, tex, dirRow(facing));
    sp.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL)).setScale(art.scale || 1).setDepth(isoDepth(at.x, at.y));
    if (this._tagRoom) this._tagRoom(sp, room);
    (this.interiorSprites = this.interiorSprites || []).push(sp);
    const n = { x: at.x, y: at.y, facing, sprite: sp, interior: room.id, [CREW]: room.id, noDot: true, ...def };
    this.npcs.push(n);
    return n;
  },

  _clFillTemple(room, hour) {
    const god = room.templeGod;
    let n = worshippersAt(god, hour);
    if (holyDayGod(this._clDay()) === god && hour >= 6 && hour < 22) n += 4;
    const rng = rngOf(`temple|${god}|${this._clDay()}|${Math.floor(hour)}`);
    const models = ['npc_farmer', 'npc_peasant_man', 'npc_cheerful_peasant_girl', 'npc_townsman', 'npc_confident_woman', 'npc_patterned_man', 'npc_merchant', 'npc_sleek_woman'];
    const spots = [];
    for (let ty = 5; ty <= room.h - 3; ty += 2) for (let tx = 2; tx <= room.w - 3; tx += 2) spots.push([tx, ty]);
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    let placed = 0;
    const lines = [`*a whisper* ${GOD_NAME[god]}'s hour. Stay, if you like.`, '*head bowed*', 'Shh.', 'I come every day at this hour. Habit, then faith, then habit again.'];
    for (const [tx, ty] of spots) {
      if (placed >= n) break;
      const p = this._clRoomPerson(room, tx, ty, models[Math.floor(rng() * models.length)], Math.floor(rng() * 8), 'northeast',
        { name: 'Worshipper', cityLife: 'worshipper', line: lines[Math.floor(rng() * lines.length)] });
      if (p) placed++;
    }
    this._clTempleCensus = { god, placed, want: n };
  },

  _clFillTavern(room, hour) {
    const n = tavernCrowdAt(hour);
    const rng = rngOf(`tavern|${this._clDay()}|${Math.floor(hour)}`);
    const models = ['npc_farmer', 'npc_peasant_man', 'npc_grizzled_adventurer', 'npc_townsman', 'npc_sporty_woman', 'npc_patterned_man', 'npc_female_adventurer', 'npc_cheerful_peasant_girl'];
    const spots = [];
    for (let ty = 3; ty <= room.h - 3; ty++) for (let tx = 1; tx <= room.w - 2; tx++) spots.push([tx, ty]);
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    let placed = 0;
    for (const [tx, ty] of spots) {
      if (placed >= n) break;
      const facing = ['southeast', 'southwest', 'northeast', 'northwest'][Math.floor(rng() * 4)];
      const p = this._clRoomPerson(room, tx, ty, models[Math.floor(rng() * models.length)], Math.floor(rng() * 8), facing,
        { name: 'Drinker', cityLife: 'patron', seed: Math.floor(rng() * 1000) });
      if (p) placed++;
    }
    this._clTavernCensus = { placed, want: n };
  },

  // ---------------------------------------------------------------- the pooled rooms: what each building is inside
  /** Called by `_enterGenericBuilding` once the layout is chosen and before the room is built: the new buildings have
   *  their own furniture lists. */
  _clLayoutGeneric(room, b) {
    room._clKind = null;
    if (!b) return;
    if (b.diveTavern && this._glDiveLayout) { this._glDiveLayout(room, b); return; }   // ROUND 416 -- a slum's dive
    if (b.singleton === 'tavern' && this._clInCadenceXY(b.x, b.y)) {
      // the taproom the round-262 counters were laid out for: a bar along the back wall, tables, the hearth
      room._clKind = 'tavern'; room.name = 'The Tavern';
      const tap = (HOUSE_LAYOUTS || []).find(l => l.id === 'taproom');
      if (tap) { room.props = tap.props.map(q => ({ ...q })); room.blurb = tap.blurb; room._layoutId = 'taproom'; }
      return;
    }
    // ROUND 404 -- "no more libraries, those become bookshops": Cadence's library and one house in every other city
    if (b.bookshop) {
      room._clKind = 'bookshop';
      room.name = b.bookshop.name;
      room.blurb = 'Shelves to the ceiling, and the smell of paper.';
      room.partitions = null;
      room.props = BOOKSHOP_PROPS.map(q => ({ ...q }));
      const seed = hashStr(`shelves|${b.bookshop.id}`);
      const designs = [SHELF_IDS[seed % SHELF_IDS.length], SHELF_IDS[(seed >> 4) % SHELF_IDS.length]];
      room.shelves = BOOKSHOP_SHELVES.map((q, i) => ({ ...q, design: designs[i % 2] }));
      room._layoutId = 'bookshop';
      return;
    }
    const id = b.clSite;
    if (!id) return;
    room._clKind = id;
    room.name = CL_SITES[id].name.replace(/^the /, 'The ');
    const P = {
      barracks: [
        { key: 'bedIron', tx: 2, ty: 1 }, { key: 'bedIron', tx: 5, ty: 1 }, { key: 'weaponRack', tx: 8, ty: 1 },
        { key: 'armourPile', tx: 9, ty: 3 }, { key: 'tableLong', tx: 4, ty: 4 }, { key: 'stoolWood', tx: 3, ty: 5 },
        { key: 'stoolWood', tx: 6, ty: 5 }, { key: 'barrelStack', tx: 1, ty: 6 }, { key: 'brazierIron', tx: 9, ty: 6 }, { key: 'doorMat', tx: 5, ty: 7 },
      ],
      library: [
        { key: 'fireplaceLit', tx: 9, ty: 1 }, { key: 'rugRound', tx: 5, ty: 4 }, { key: 'chairPadded', tx: 3, ty: 4 },
        { key: 'chairPadded', tx: 7, ty: 4 }, { key: 'scrollStand', tx: 1, ty: 6 }, { key: 'sideboard', tx: 9, ty: 5 }, { key: 'doorMat', tx: 5, ty: 7 },
      ],
      bathhouse: [
        { key: 'benchStone', tx: 1, ty: 2 }, { key: 'benchStone', tx: 9, ty: 2 }, { key: 'washTub', tx: 1, ty: 5 },
        { key: 'washTub', tx: 9, ty: 5 }, { key: 'planter', tx: 2, ty: 7 }, { key: 'planter', tx: 8, ty: 7 }, { key: 'brazierBowl', tx: 9, ty: 1 }, { key: 'doorMat', tx: 5, ty: 7 },
      ],
    }[id];
    if (P) room.props = P.map(q => ({ ...q }));
    if (id === 'bathhouse') { room.kitMaterial = 'tiled'; room.floor = 'marble'; }   // ROUND 421 -- glazed tile, as the user asked
    if (id === 'bathhouse' && this._h421Size) { room._h421Floor = null; this._h421Size(room, room.w, room.h); }
  },

  /** Called after the room is built: the things from this round's own sheet, and the people. */
  _clFurnishGeneric(room, b) {
    if (!room || !b) return;
    const kind = room._clKind;
    const sheet = (name, tx, ty, solid = 12) => {
      const f = CITYLIFE_FRAMES[name];
      if (f === undefined || !this.textures.exists(CL_ART.key)) return null;
      const at = roomTileCentre(room, tx, ty);
      const p = isoProject(at.x, at.y);
      const sp = this.add.image(p.x, p.y, CL_ART.key, f).setOrigin(CL_ART.footX, CL_ART.footY).setScale(CL_ART.scale * 0.8).setDepth(isoDepth(at.x, at.y));
      if (this._tagRoom) this._tagRoom(sp, room);
      (this.interiorSprites = this.interiorSprites || []).push(sp);
      if (solid) (this.interiorSolids = this.interiorSolids || []).push({ room: room.id, x: at.x, y: at.y, radius: solid });
      return sp;
    };
    const person = (artKey, tx, ty, facing, def) => {
      const at = roomTileCentre(room, tx, ty);
      const art = NPC_ART[artKey];
      if (!art || !this.textures.exists(artKey)) return null;
      const p = isoProject(at.x, at.y);
      const sp = this.add.sprite(p.x, p.y, artKey, dirRow(facing)).setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL))
        .setScale(art.scale || 1).setDepth(isoDepth(at.x, at.y));
      if (this._tagRoom) this._tagRoom(sp, room);
      (this.interiorSprites = this.interiorSprites || []).push(sp);
      const n = { x: at.x, y: at.y, facing, sprite: sp, interior: room.id, [CREW]: room.id, artKey, ...def };
      this.npcs.push(n);
      return n;
    };
    if (kind === 'barracks') {
      sheet('bunk', 8, 5, 14);
      person('npc_city_guard', 5, 3, 'south', { name: 'Off-duty guard', cityLife: 'offduty' });
      person('npc_grizzled_adventurer', 2, 4, 'east', { name: 'Quartermaster Rusk', cityLife: 'quartermaster', shopId: 'weapon' });
    } else if (kind === 'bookshop') {
      sheet('readingDesk', 3.4, 5.6, 12); sheet('lectern', 8.4, 6, 10);
      person('npc_noble_standing_v1', 6.2, 2.9, 'south', { name: `${room.name}'s bookseller`, cityLife: 'bookseller', shopId: 'skillbooks_library' });
      person('npc_mage', 2.6, 4.4, 'west', { name: 'A browser', cityLife: 'reader' });
    } else if (kind === 'library') {
      for (const [tx, ty] of [[1, 1], [3, 1], [5, 1], [7, 1], [1, 3]]) sheet('bookshelf', tx, ty, 14);
      sheet('readingDesk', 4, 6, 12); sheet('readingDesk', 7, 6, 12); sheet('lectern', 9, 3, 10);
      person('npc_noble_standing_v1', 6, 3, 'south', { name: 'Librarian Ottoline Vey', cityLife: 'librarian', shopId: 'skillbooks_library' });
      person('npc_mage', 3, 6, 'east', { name: 'A reader', cityLife: 'reader' });
    } else if (kind === 'bathhouse') {
      sheet('bathPool', 5, 3, 0);
      (this.interiorSolids = this.interiorSolids || []).push({ room: room.id, ...roomTileCentre(room, 5, 3), radius: 40 });
      const st = sheet('steam', 5, 2, 0);
      if (st) { st.setAlpha(0.8); this.tweens.add({ targets: st, alpha: 0.35, yoyo: true, repeat: -1, duration: 2200 }); }
      sheet('towelBench', 2, 6, 10);
      person('npc_sporty_woman', 8, 6, 'west', { name: 'Bath attendant Lissa', cityLife: 'bathAttendant' });
    } else if (kind === 'dive' && this._glDiveFurnish) {
      this._glDiveFurnish(room, person);   // ROUND 416
    } else if (kind === 'tavern') {
      person('npc_merchant', 4, 1, 'south', { name: 'Hob, the barkeep', cityLife: 'barkeep', shopId: 'market_drinks' });
      this._clRoomBucket = null;   // the drinkers are stood up on the next tick, by the hour
    } else if (!b.clShed && b.house && !(room.home)) {
      this._clFillHome(room, b);
    }
  },

  /** "Each with someone living in it": the household of an ordinary house, home or not by the hour. A house with a
   *  sale or rental notice outside (round 345) is empty -- that is why it is on the market. */
  _clFillHome(room, b) {
    const key = `${Math.round(b.anchorX ?? b.x)}|${Math.round(b.anchorY ?? b.y)}`;
    const listed = (this._homeSigns || []).some(s => s.b === b);
    if (listed) { room._clEmpty = true; return; }
    // ROUND 422 -- a dressed house seats its people, puts them to bed and spreads them over its floors
    if (room._h422Ctx && this._h422FillRoom && this._h422FillRoom(room)) return;
    const hh = this._h421Household ? this._h421Household(b) : householdFor(key);   // ROUND 421 -- the trade made local
    const hour = this._clHour();
    const home = homeAt(hh, hour);
    const rng = rngOf(`home|${key}`);
    const F = ['npc_cheerful_peasant_girl', 'npc_confident_woman', 'npc_sporty_woman', 'npc_sleek_woman'];
    const M = ['npc_farmer', 'npc_peasant_man', 'npc_townsman', 'npc_patterned_man', 'npc_merchant'];
    // ROUND 421 -- people at their furniture, not on open floor: by the bed late at night, at the table at meals, at
    // the stove in the morning and the evening, at their work by day (the spots come from the house's dressing).
    let spots = [[3, 5], [7, 5], [5, 3], [2, 3], [8, 3], [5, 6]];
    const H = room._homeSpots;
    if (H && H.length) {
      const order = (hour >= 22 || hour < 6) ? ['bed', 'table', 'cook', 'work']
        : (hour >= 12 && hour < 13.5) || (hour >= 18 && hour < 19.5) ? ['table', 'cook', 'work', 'bed']
        : (hour < 9 || hour >= 17) ? ['cook', 'table', 'work', 'bed'] : ['work', 'table', 'cook', 'bed'];
      const pref = [];
      for (const z of order) for (const sp of H) if (sp.zone === z) pref.push([sp.tx, sp.ty, sp.facing]);
      spots = [...pref, ...pref.map(([x, y, f]) => [x + 1, y, f]), [Math.floor(room.w / 2), room.h - 3]];
    }
    let i = 0;
    for (const p of home) {
      while (i < spots.length) {
        const [tx, ty, facing] = spots[i++];
        const model = (p.female ? F : M)[Math.floor(rng() * (p.female ? F.length : M.length))];
        const n = this._clRoomPerson(room, tx, ty, model, Math.floor(rng() * 8), facing || 'south',
          { name: p.name, cityLife: 'resident', resident: p, household: hh.surname });
        if (n) break;
      }
    }
    room._clHousehold = { surname: hh.surname, home: home.length, of: hh.people.length };
    this._clHomeCensus = room._clHousehold;
  },

  _clInLibrary() { const r = this._insideRoom; return !!(r && (r._clKind === 'library' || r._clKind === 'bookshop')); },   // ROUND 404 -- a bookshop's reading corner

  // ---------------------------------------------------------------- talk
  /** E on one of this round's people. Returns true when it was handled. */
  _cityLifeTalk(npc) {
    const k = npc && npc.cityLife;
    if (!k) return false;
    const say = (name, text, choices = null) => { this._openDialogue(name, text, npc, choices); return true; };
    const day = this._clDay();
    const known = this._clKnownLine(null, (npc.seed || 0) + day);
    if (this._glTalk && (k === 'glife' || k === 'divePatron' || k === 'diveKeep' || k === 'fence')) return this._glTalk(npc, say);   // ROUND 416
    switch (k) {
      case 'crier': {
        const news = this._clHeadlines();
        return say(npc.name, `He rings the handbell twice before he will speak to anyone.\n\n${news.map(h => `"${h.text}"`).join('\n\n')}`);
      }
      case 'lamplighter':
        // ROUND 388 -- thirty-odd things a lamplighter says (townTalk.js), his own bag, never the same twice running
        return say('Lamplighter', `"${(this._ttPoolLine && this._ttPoolLine(npc, CITY, 'lamplighter')) || ['Evening. Mind the pole.', 'They give us the long streets. The short ones go to the boys.'][day % 2]}"`);
      case 'sergeant': {
        const n = (this._clDummies || []).length;
        return say(npc.name, `"The yard's open to anyone with a Society badge. ${n ? `There are ${n} dummies out` : 'The dummies are out back'}, and they don't die and they don't hit back, which is more than I can say for the recruits."\n\n"Try your specials on them. Each one keeps a tally over its head: the last blow, and what it's taking every second. Their rank's read as yours, so the numbers are honest."`,
          [{ act: 'city|dummyReset', label: "Clear the dummies' tallies" }]);
      }
      case 'trainee':
        return say(npc.name, known ? `"${known}"` : ['"Sergeant says another hundred swings before lunch."', '"I nearly passed iron last week. Nearly."', '"Watch the guards. They make it look easy, and it isn\'t."'][day % 3]);
      case 'offduty':
        return say(npc.name, '"Off watch till dusk. If you\'re looking for the sergeant, he\'s in the yard shouting at a straw man."');
      case 'quartermaster':
      case 'merchant':
        return false;   // falls through to the shop
      case 'yardhand':
        return say(npc.name, '"No horses in this yard, and none on the road either. Every wagon Torvald sells runs on a rune-core in the axle -- charge it at the yard, it pulls itself. Cheaper than oats and it never bites."\n\n"The ones out front are this week\'s stock. Torvald does the selling. I just keep them charged."');
      case 'grave': {
        const plot = npc.plot || {};
        if (plot.old) return say('Headstone', `${plot.old.name}\n\n${plot.old.line}`);
        const ep = npc.ep || epitaphFor(plot.who, ((this.player.adv || {}).dead || {})[plot.who] || {}, (this.player.adv || {}).teamNames);
        return say('Headstone', ep ? `${ep.name}\n\n${ep.line}\n\n"${ep.words}"` : 'The stone is new. The name is not cut yet.');
      }
      case 'poster': {
        const sh = this.player.shady || {};
        return say('Wanted poster', sh.quest === 'arrest'
          ? 'WANTED, by order of the Adventure Society: a hooded trader, last seen behind the tavern, for the sale of a restricted essence. Report him at the Society hall. Do not buy from him.'
          : 'WANTED -- and across it, in red, CAUGHT. Somebody has written a name underneath in charcoal. It is yours.');
      }
      case 'resident': {
        const r = npc.resident || {};
        if (npc.asleep) return say(npc.name, `${npc.name} is asleep, and does not stir.`);   // ROUND 422
        return say(npc.name, `${npc.name} is ${r.trade || 'at home'}.\n\n"${r.line || 'Hello.'}"${known ? `\n\n"${known}"` : ''}`);
      }
      case 'patron':
        return say('Drinker', `"${this._clTavernLine(npc)}"`);
      case 'worshipper':
        return say('Worshipper', npc.line || 'Shh.');
      case 'mourner':
        return say(npc.name, npc.eulogy || '...');
      case 'procession':
        return say(npc.name, `"${HOLY_LINES[npc.god] || 'Walk with us.'}"`);
      case 'watch':
        return say('Surge Watch', ['"Doubled watch till the surge breaks. Keep moving."', '"If you\'re iron or better, the hall wants you. If you\'re not, home."', '"Saw the glow on the hills last night. That\'s them."'][day % 3]);
      case 'bathAttendant': {
        const st = this._clState();
        const done = st.bathDay === day;
        return say(npc.name, done ? '"You\'ve had your soak today. Come back tomorrow, you\'ll prune."'
          : '"Hot water, cold plunge, clean towel. Two iron. You\'ll come out lighter than you went in -- everything mended and a spring in your step for a while."',
          done ? [] : [{ act: 'city|bath', label: 'Take a bath (2 iron)' }]);
      }
      case 'librarian':
        return say(npc.name, '"Quiet in the stacks, please. A skill book may be read here, at the desks: you don\'t need the Society\'s ritual hall for a book, only for a rite. The deepenings and the theories still want the hall."\n\n"The shelf by the door is for sale."',
          [{ act: 'city|shop:skillbooks_library', label: 'Browse the shelf' }]);
      case 'reader':
        return say('A reader', '"*turns a page* ...Sorry? No, I\'m not finished. I\'m never finished."');
      case 'barkeep':
        // ROUND 389 -- the Tavern lets rooms: the booking is at the counter (propertySignsMixin.js).
        return say(npc.name, `"What'll it be?"\n\n"${this._clTavernLine(npc)}"`, [{ act: 'city|shop:market_drinks', label: 'Buy a drink' },
          ...((this._innChoices && this._innForNpc) ? this._innChoices(this._innForNpc(npc)) : [])]);
      default:
        return false;
    }
  },

  _clTavernLine(npc) {
    const news = this._clHeadlines().filter(h => h.k !== 'quiet');
    const seed = (npc && npc.seed) || 0;
    const known = this._clKnownLine(null, seed);
    const pool = [
      ...news.map(h => `Did you hear? ${h.text.replace(/^Hear ye! /, '')}`),
      ...(known ? [known] : []),
      'Another round! No, the other one.', 'Best ale in the Nek. Worst everything else.', 'My cousin says the auction house had a dragon scale last week. My cousin says a lot of things.',
    ];
    return pool[seed % pool.length];
  },

  /** The holy day's buttons on a priest of that god; nothing on any other day. Rides with `_openDialogue`'s choices. */
  _cityLifeAddendum(npc) {
    if (!npc || !npc.isPriest) return [];
    const day = this._clDay();
    const god = holyDayGod(day);
    const priestGod = npc.god || (npc.interior && String(npc.interior).replace(/^temple_/, '')) || null;
    if (!god || priestGod !== god) return [];
    const st = this._clState();
    const out = [];
    if (st.blessed[god] !== day) out.push({ act: `city|bless:${god}`, label: `Receive ${GOD_NAME[god]}'s blessing (${HOLY_BLESSING[god].label})` });
    if (st.gifts[god] !== day) out.push({ act: `city|gift:${god}`, label: 'Accept the holy-day gift' });
    const q = (this.player.quests || []).find(x => x.holyGod === god && x.holyDay === day);
    if (!q && st.holyDone[god] !== day) out.push({ act: `city|quest:${god}`, label: "Ask about the holy day's task" });
    if (q && q.state !== 'turnedIn' && this._questDone && this._questDone(q)) out.push({ act: `city|report:${god}`, label: "Report the holy day's task" });
    return out;
  },

  _cityLifeAct(act) {
    const [, cmd] = act.split('|');
    const [what, arg] = cmd.split(':');
    const st = this._clState();
    const day = this._clDay();
    const later = (fn) => this.time.delayedCall(0, fn);
    const p = this.player;
    if ((what === 'bless' || what === 'gift' || what === 'quest' || what === 'report') && !GODS8.includes(arg)) return;
    if (what === 'bless') {
      if (st.blessed[arg] === day) return;
      st.blessed[arg] = day;
      const B = HOLY_BLESSING[arg];
      const t = BLESSING_SECONDS;
      if (B.buff === 'power') p.buffs.power = { mult: Math.max(B.mult, p.buffs.power ? p.buffs.power.mult : 1), t: Math.max(t, p.buffs.power ? p.buffs.power.t : 0) };
      else if (B.buff === 'critChance') p.buffs.critChance = { bonus: Math.max(B.bonus, p.buffs.critChance ? p.buffs.critChance.bonus : 0), t };
      else if (B.buff === 'speed') p.buffs.speed = { mult: B.mult, t };
      else if (B.buff === 'hot' && this._applyHot) this._applyHot({ kind: 'player' }, Math.max(1, (p.maxHp || 100) * B.pct), t);
      if (this._floatText) this._floatText(this.world.x, this.world.y - 60, `${GOD_NAME[arg]}'s blessing: ${B.label}`, '#ffe082');
      later(() => this._openDialogue(`Priest of ${GOD_NAME[arg]}`, `The priest touches two fingers to your brow and says a word you don't quite catch.\n\n"${GOD_NAME[arg]} sees you. Go well."`, null));
    } else if (what === 'gift') {
      if (st.gifts[arg] === day) return;
      st.gifts[arg] = day;
      const id = HOLY_GIFT[arg];
      if (id && CONSUMABLE_DEFS[id]) {
        p.inventory.consumables = p.inventory.consumables || [];
        p.inventory.consumables.push(id);
        later(() => this._openDialogue(`Priest of ${GOD_NAME[arg]}`, `"From the temple, on ${GOD_NAME[arg]}'s day." You are given ${CONSUMABLE_DEFS[id].name}.`, null));
      } else {
        grantCoins(p.coins, 'iron', 1);
        later(() => this._openDialogue(`Priest of ${GOD_NAME[arg]}`, '"From the temple, on its day." An iron coin, pressed into your hand.', null));
      }
      if (this._inventoryOpen && this._renderInventory) this._renderInventory();
    } else if (what === 'quest') {
      const region = (this.currentRegion && this.currentRegion.id === 'nek') ? this.currentRegion : REGIONS.find(r => r.id === 'nek');
      const rng = rngOf(`holy|${arg}|${day}`);
      let offer = null;
      for (const kind of [HOLY_QUEST_KIND[arg], 'cull', 'hunt']) {
        for (let a = 0; a < 3 && !offer; a++) offer = this._makeOffer ? this._makeOffer(kind, `holy_${arg}_${day}`, region, rng) : null;
        if (offer) break;
      }
      if (!offer) { later(() => this._openDialogue(`Priest of ${GOD_NAME[arg]}`, '"Nothing today that wants a blade. Take the blessing, and go home early."', null)); return; }
      offer.title = `${GOD_NAME[arg]}'s day: ${offer.title || 'a task'}`;
      const q = { ...offer, state: 'active', have: 0, holyGod: arg, holyDay: day, giver: `Priest of ${GOD_NAME[arg]}` };
      p.quests.push(q);
      if (this._autoTrackQuest) this._autoTrackQuest(q);
      if (q.kind === 'hunt' && this._spawnBountyTargetFor) this._spawnBountyTargetFor(q);
      later(() => this._openDialogue(`Priest of ${GOD_NAME[arg]}`, `"${HOLY_LINES[arg]}"\n\n"There is a task for the day, if you'll take it: ${q.title.replace(/^.*?: /, '')}. Come back to any of us at this temple when it is done."`, null));
      if (this._floatText) this._floatText(this.world.x, this.world.y - 62, `New task: ${q.title}`, '#ffd54f');
    } else if (what === 'report') {
      const q = (p.quests || []).find(x => x.holyGod === arg && x.holyDay === day && x.state !== 'turnedIn');
      if (!q || !this._questDone(q)) return;
      this._turnInBounty(q, { fromChain: true });
      st.holyDone[arg] = day;
      st.holyQuests = (st.holyQuests || 0) + 1;
      later(() => this._openDialogue(`Priest of ${GOD_NAME[arg]}`, `"Done, and on the day. ${GOD_NAME[arg]} will remember it; so will we."`, null));
    } else if (what === 'bath') {
      if (st.bathDay === day) return;
      if (!p.coins || !spendCoins(p.coins, BATH_PRICE)) { later(() => this._openDialogue('Bath attendant Lissa', '"Two iron, love. Come back when you have it."', null)); return; }
      st.bathDay = day;
      p.hp = p.maxHp; if (p.maxMana) p.mana = p.maxMana; if (p.maxStamina) p.stamina = p.maxStamina;
      if (this._clearDebuffs) this._clearDebuffs(p);
      p.buffs.speed = { mult: 1.06, t: 90 };
      if (this._floatText) this._floatText(this.world.x, this.world.y - 60, 'Clean, mended and lighter on your feet', '#b3e5fc');
      later(() => this._openDialogue('The Bathhouse', 'Hot water, then cold, then a towel that smells of cedar. Everything that ached has stopped.\n\n(Health, mana and stamina restored; a little faster on your feet for a while.)', null));
    } else if (what === 'dummyReset') {
      for (const m of (this._clDummies || [])) { m._clHits = []; m._clLast = 0; m.hp = m.maxHp; }
    } else if (what === 'shop') {
      later(() => this._openShop(arg, arg === 'market_drinks' ? 'Hob, the barkeep' : 'Librarian Ottoline Vey'));
    }
  },

  // ---------------------------------------------------------------- the travelling merchants' shelf
  /** Market day's rare stock, beyond the bottles marketGoods.js lays out: two Uncommon-or-Rare essences and two stones,
   *  at the hall's price and a third again. Called by `_restockShop` with its own pricers. */
  _clTravellerShelf(rng, pricedEssence, pricedStone) {
    const rare = (r) => r === 'Uncommon' || r === 'Rare';
    const es = ESSENCE_IDS.filter(id => ESSENCE_CATALOG[id] && rare(ESSENCE_CATALOG[id].rarity));
    const ss = STONE_IDS.filter(id => STONE_CATALOG[id] && rare(STONE_CATALOG[id].rarity));
    for (let i = 0; i < 2 && es.length; i++) { const id = es.splice(Math.floor(rng() * es.length), 1)[0]; pricedEssence(id, ESSENCE_CATALOG[id].rarity); }
    for (let i = 0; i < 2 && ss.length; i++) { const id = ss.splice(Math.floor(rng() * ss.length), 1)[0]; pricedStone(id, STONE_CATALOG[id].rarity); }
  },

  // ---------------------------------------------------------------- census, for the suite and for the notes
  _cityLifeCensus() {
    const lamps = this._clLamps || [];
    return {
      sites: Object.fromEntries(Object.entries(this._clSites || {}).map(([k, b]) => [k, !!(b && b.sprite)])),
      siteCensus: this._clSiteCensus || null,
      props: this._clPropCensus || null,
      plots: (this._clPlots || []).length, oldGraves: (this._clPlots || []).filter(p => p.old).length,
      lampRoutes: (this._clLampRoutes || []).length, lamps: lamps.length, unlit: lamps.filter(l => l.unlit).length,
      lighters: (this._clLighters || []).length,
      wagons: (this._clWagons || []).length, wagonsDrawn: (this._clWagons || []).filter(w => w.sprite).length,
      yardStock: (this._clYardStock || []).length, tavernDoor: !!this._clTavernDoor,
      people: (this._clPeople || []).length, crier: !!this._clCrier, sparring: (this._clSparring || []).length,
      merchants: (this._clMerchants || []).length,
      dummies: (this._clDummies || []).length, dummySpots: (this._clDummySpots || []).length,
      sounds: (this._clSounds || []).map(s => ({ key: s.key, playing: !!s.snd, vol: s.snd ? Math.round((s.cur || 0) * 1000) / 1000 : 0 })),
      windows: this._clWindowCensus || 0, lanterns: this._clLanternCensus || 0, smoke: this._clSmokeCensus || null,
      procession: this._clProc ? { god: this._clProc.god, people: this._clProc.people.length, path: this._clProc.path.length } : null,
      funeral: this._clFuneral ? { who: this._clFuneral.who, people: this._clFuneral.people.length } : null,
      watch: this._clWatch ? this._clWatch.length : 0, greets: this._clGreets || 0, crierSaid: this._clCrierSaid || 0,
      rain: this._clRainNow || null, bells: this._clBellRung || 0,
    };
  },
});
