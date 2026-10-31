// ============================================================================
// ROUND 381 -- THE NEW PROPS, LAID WHERE THEY BELONG.
//
// 64 props on one new sheet (city_props_r381.png; the table is CITY_PROPS_R381 in data/cityProps.js). This is the
// dressing pass for the ones with a PLACE -- a window box under a window, a guard post at a gate, a trough by the
// inn -- and it is not a second placer: it is called from `_buildCityProps` with that method's own `put`, the single
// door every generated city prop walks through, so the water test, the collision test, the "not on top of another
// prop" test, the hand-placed-ground test and the doorstep keep-out all apply exactly as they do to a barrel. The new
// CLUTTER needs no pass of its own: it joined the round-89 clutter bank, which already lays piles against walls.
//
// Cadence first and fullest; the other cities and towns get a lighter version round their wellhead and tavern.
// Deterministic throughout: every choice is a hash of a fixed string, never Math.random, so a given wall in a given
// town carries the same flower box every time the world is built.
//
// Three rules on top of `put`'s:
//   * nothing generated here stands ON a road (the festival arch is the one exception, and it is not solid: it is
//     built to be walked under);
//   * a thing hung on a building (a window box, a basket, a wall banner) keeps clear of that building's doorstep;
//   * nothing is laid within a few units of another prop (the `hang` overlap test, the same one round 373 uses).
//
// NOT IN THIS PASS YET (round 380 continues): the tavern / lab / ritual interiors, farms, river banks and crossings,
// caves and astral space. Their table entries, art and draw support (flat decals, floating scenery) are in place.
// ============================================================================
import { TILE, ISO_TW, ISO_TH, isoProject, isoDepth, moveFromFacing } from '../data/iso.js';
import { ART_TURNS, artTurns } from '../data/artFacings.js';
import { artDoorPixel, artDoorFixed, artDoorFacing } from '../data/artDoors.js';
import { REGIONS, regionPoint } from '../data/regions.js';
import { TILE_CITY, TILE_PATH, TILE_GARDEN, TILE_GRASS, TOWN_ATLAS_COLS, isCarriagewayTile, isWaterTile, isRoadTile } from '../data/town.js';
import { roomTileCentre, roomEntryPoint } from '../data/interiors.js';
import { CADENCE_DISTRICTS } from '../data/cadence.js';
import { hashStr } from '../data/cityLife.js';
import { CITY_PROP_ART_R381 as ART, CITY_PROPS_R381 as DEFS, RITUAL_CIRCLES_HD } from '../data/cityProps.js';   // ROUND 387 -- HD circles

const CITY = 'nek_city';
/** chests.js's CULT_SITE_KEYS, repeated (two strings) rather than imported, so this mixin pulls in no chest code. */
const R381_CULT_SITES = ['cultChamber', 'hiddenLair'];
const rngOf = (key) => { let h = hashStr(key) || 1; return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000003) / 1000003; }; };
/** Cadence's built extent in tiles from its centre (the same box round 373's infill searches). */
const CADENCE_BOX = { x0: -191, x1: 251, y0: -101, y1: 164 };
/** The kerbside planting reaches this far from the square: the main streets, not every back lane. */
export const R381_KERB_REACH_T = 110;
export const R381_KERB_MAX = 70;
export const R381_KERB_GAP_T = 5;

export const CityPropsR381Mixin = {
  /** ROUND 403 -- one festival arch per city park, as its gateway: the middle of the park's south edge (a grid city's
   *  park), or three tiles south of a Cadence park's pond. Walked under (not solid), as before. */
  _parkArches(ART, DEFS) {
    const def = DEFS.festivalArch;
    if (!def) return 0;
    const spots = [];
    // one per city, at its biggest park: a key place, not a street fitting
    for (const g of Object.values(this._gridPlans || {})) {
      const parks = ((g.plan && g.plan.parks) || []).slice().sort((a, b) => (b.x1 - b.x0) * (b.y1 - b.y0) - (a.x1 - a.x0) * (a.y1 - a.y0));
      const p = parks[0];
      if (p) spots.push({ tx: g.ctx + Math.round((p.x0 + p.x1) / 2), ty: g.cty + p.y1 });
    }
    if (this._cadenceParkPonds && this._cadenceParkPonds.length && this._outlineOriginTile) {
      const { tx: ox, ty: oy } = this._outlineOriginTile();
      const q = this._cadenceParkPonds.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
      spots.push({ tx: ox + q.x + Math.round(q.w / 2), ty: oy + q.y + q.h + 3 });
    }
    let n = 0;
    for (const sp of spots) {
      const x = (sp.tx + 0.5) * TILE, y = (sp.ty + 0.5) * TILE;
      if (this._isWaterAt(x, y)) continue;
      if (this._cityPropNearR381 && this._cityPropNearR381(x, y, 6 * TILE, 'festivalArch')) continue;
      this.cityProps.push({ x, y, sprite: null, sheet: ART.key, art: ART, frame: def.idx, radius: 0, solid: false,
        cityProp: true, prop: 'festivalArch', r381: 'flags', scaleMul: def.scale, arch: true, parkGate: true });
      n++;
    }
    return n;
  },
  _r381Props(put, onPaving) {
    if (!this.textures.exists(ART.key) || !this.townOrigin) return;
    const census = (this._r381Census = {});
    const count = (k) => { census[k] = (census[k] || 0) + 1; };
    const tileAt = (x, y) => this._tileTypeAt(Math.floor(x / TILE), Math.floor(y / TILE));
    const onRoad = (x, y) => isCarriagewayTile(tileAt(x, y));
    const roadNear = (x, y, r) => {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (isCarriagewayTile(this._tileTypeAt(tx + dx, ty + dy))) return true;
      return false;
    };
    const crowded = (x, y, r = 20) => {
      for (const o of this.cityProps) if (Math.abs(o.x - x) < r + 4 && Math.abs(o.y - y) < r + 4 && Math.hypot(o.x - x, o.y - y) < r) return true;
      return false;
    };
    const stamp = (rec, def) => {
      rec.scaleMul = def.scale;
      if (def.flat) { rec.flat = true; rec.squash = def.squash || 1; rec.oy = def.oy; rec.solid = false; rec.radius = 0; }
      if (def.float) { rec.float = true; rec.solid = false; rec.radius = 0; }
      return rec;
    };
    // Free-standing: through `put`, so every guard applies. Never on a road.
    const doors = (this.doorways || []).filter(d => d && d.kind === 'enter' && !d.room?.astral);
    const place = (key, x, y, tag = {}) => {
      const def = DEFS[key];
      if (!def || onRoad(x, y)) return null;
      if (def.solid && doors.some(d => Math.abs(d.x - x) < 120 && Math.hypot(d.x - x, d.y - y) < (def.radius || 0) + (d.radius || 40) + 8)) return null;
      const rec = put(ART.key, ART, def.idx, x, y, def, { prop: key, r381: def.cat, ...tag });
      if (!rec) return null;
      count(key);
      return stamp(rec, def);
    };
    // Hung on or stood against a building: laid directly (as round 373's `hang`), because `put` keeps everything a
    // clear step off a building's front by design. Still never on a road, in water, on another prop, or on the door.
    const hang = (key, x, y, tag = {}, over = null, door = null) => {
      const def = DEFS[key];
      if (!def || this._isWaterAt(x, y) || onRoad(x, y) || crowded(x, y)) return null;
      if (door && Math.hypot(door.x - x, door.y - y) < 30) return null;
      if (this._placedBlocks && this._placedBlocks(x, y)) return null;
      const rec = { x, y, sprite: null, sheet: ART.key, art: ART, frame: def.idx, radius: 0, solid: false,
        cityProp: true, clutter: true, prop: key, r381: def.cat, ...tag };
      if (over && this._clFrontBias) rec.depthBias = this._clFrontBias(over, x, y);
      this.cityProps.push(stamp(rec, def));
      count(key);
      return rec;
    };
    // Around a point, nearest ring first, the first angle that takes it.
    const ring = (key, cx, cy, radiiT, a0 = 0, tag = {}, n = 12) => {
      for (const r of radiiT) {
        for (let a = 0; a < n; a++) {
          const th = a0 + a * (2 * Math.PI / n);
          const rec = place(key, cx + Math.cos(th) * r * TILE, cy + Math.sin(th) * r * TILE, tag);
          if (rec) return rec;
        }
      }
      return null;
    };
    const frontOf = (b) => {
      const dir = this._doorDirectionWithFacing ? this._doorDirectionWithFacing(b) : { dx: 0, dy: 1 };
      const step = dir.step || ((b.radius || 52) + 44);
      return { dx: dir.dx, dy: dir.dy, step, door: { x: b.x + dir.dx * step, y: b.y + dir.dy * step } };
    };
    // A point in front of a building: `out` along the door's direction, `side` across it.
    const at = (b, f, out, side) => ({ x: b.x + f.dx * out - f.dy * side, y: b.y + f.dy * out + f.dx * side });

    for (const region of REGIONS) {
      for (const st of (region.settlements || [])) {
        const c = st._centre || regionPoint(region, st.at);
        const R = st.radius * TILE;
        const capital = st.id === CITY;
        if (!capital && st.kind !== 'city' && st.kind !== 'town' && st.kind !== 'village') continue;
        const rng = rngOf(`r381|${region.id}|${st.id}`);
        const tag = { settlement: st.id };
        // Cadence's built ground reaches far past its nominal radius, so its buildings are the ones its lamp map counts.
        const mine = (this.buildings || []).filter(b => b && !b.wall && !b.fence && (capital && this._clInCadenceXY
          ? this._clInCadenceXY(b.x, b.y) : Math.hypot(b.x - c.x, b.y - c.y) < R + TILE * 6));
        // ROUND 381 -- first smoke run dressed every Cadence house: 524 window boxes in all. Six in ten reads as a lived-in
        // street rather than a uniform; fewer again in a town and a village.
        this._r381HouseFronts(mine, capital ? 0.6 : (st.kind === 'village' ? 0.2 : 0.35), rng, hang, place, frontOf, at, tag);
        this._r381Tavern(mine, hang, place, frontOf, at, tag);
        if (capital) continue;   // Cadence's square, streets, gates and civic fronts are laid below, from its own map
        // --- the lighter set: round the wellhead
        const well = this._settlementWells && this._settlementWells[st.id];
        const sq = well || c;
        const a0 = (hashStr(st.id) % 360) * Math.PI / 180;
        ring(st.kind === 'city' ? 'flagpoleCity' : 'bannerPoleGreen', sq.x, sq.y, [4, 5, 6], a0, tag);
        ring('noticeBoard', sq.x, sq.y, [4, 5, 6], a0 + 1.6, tag);
        ring('benchStone', sq.x, sq.y, [3.5, 4.5, 5.5], a0 + 3.1, tag);
        ring('benchBacked', sq.x, sq.y, [3.5, 4.5, 5.5], a0 + 4.7, tag);
        ring('planterUrn', sq.x, sq.y, [3, 4, 5], a0 + 0.8, tag);
        if (st.kind === 'city') { ring('wantedPillar', sq.x, sq.y, [5, 6, 7], a0 + 2.4, tag); ring('bellPost', sq.x, sq.y, [6, 7, 8], a0 + 5.5, tag); }
        else ring('potCluster', sq.x, sq.y, [3, 4], a0 + 2.4, tag);
      }
    }
    if (this._glDress) this._glDress(place, hang, ring, frontOf, at, roadNear);   // ROUND 416 -- the grid cities' square, kerbs, gates, slums
    this._r381Cadence(place, hang, ring, frontOf, at, roadNear, onPaving, rngOf('r381|cadence'));
    // ROUND 381 -- out of town: the farms, the river's banks and crossings. Same `place`, so the same guards.
    this._r381Farms(place, ring);
    this._r381River(place);
  },

  /** ROUND 381 -- every steading (round 145's four a region): a scarecrow and two or three vegetable patches in its
   *  field, a beehive or two at the field's edge. Round the yard, never on the yard itself or a road. */
  _r381Farms(place, ring) {
    let n = 0;
    for (const sd of (this._steadings || [])) {
      const a0 = (hashStr(String(sd.id)) % 360) * Math.PI / 180;
      const tag = { farm: sd.id };
      const patches = 2 + (hashStr(sd.id + '|p') % 2);
      for (let i = 0; i < patches; i++) if (ring('vegetablePatch', sd.x, sd.y, [7, 8, 9, 10], a0 + i * 0.55, tag, 16)) n++;
      if (ring('scarecrow', sd.x, sd.y, [8.5, 9.5, 11], a0 + 0.3, tag, 16)) n++;
      if (ring('clothesline', sd.x, sd.y, [4, 5, 6], a0 + Math.PI, { ...tag, yard: true }, 16)) n++;   // the yard role
      if (ring('beehiveBox', sd.x, sd.y, [11.5, 12.5, 13.5], a0 + 1.9, tag, 16)) n++;
      if (hashStr(sd.id + '|b') % 2 && ring('beehiveBox', sd.x, sd.y, [11.5, 12.5, 13.5], a0 + 2.3, tag, 16)) n++;
    }
    // Garden plots in town (round 245's restored beds, the fence yards): a scarecrow at the odd one.
    this._r381Census.farm = n;
  },

  /** ROUND 381 -- the river and the lakes. Reeds on bank tiles (dry, a water tile beside them), thinned by a hash so a
   *  bank is tufted rather than hedged; a washing station on the bank nearest each town that has water within reach;
   *  stepping stones across a narrow run of shallow water near a town, the tiles under them made walkable. */
  _r381River(place) {
    const M = Math.round(Math.sqrt(this.tileType.length));
    const tt = this.tileType;
    const water = (tx, ty) => tx >= 0 && ty >= 0 && tx < M && ty < M && isWaterTile(tt[ty * M + tx]);
    const T = TILE;
    // Every bank tile on a three-tile lattice that the hash keeps, then thinned EVENLY to the cap -- a cap that simply
    // stopped the scan filled the map's top rows and left Cadence's own ponds bare (the first smoke run).
    const REED_MAX = 600;
    const STEP = 3;
    const cands = [];
    for (let ty = 2; ty < M - 2; ty += STEP) {
      for (let tx = 2 + (ty % 2); tx < M - 2; tx += STEP) {
        const t = tt[ty * M + tx];
        if (isWaterTile(t) || isRoadTile(t) || t === TILE_CITY || t === TILE_PATH) continue;
        if (!(water(tx + 1, ty) || water(tx - 1, ty) || water(tx, ty + 1) || water(tx, ty - 1))) continue;
        if (hashStr(`reed|${tx}|${ty}`) % 5 > 1) continue;
        cands.push([tx, ty]);
      }
    }
    const every = Math.max(1, Math.ceil(cands.length / REED_MAX));
    let reeds = 0;
    for (let i = 0; i < cands.length; i += every) {
      const [tx, ty] = cands[i];
      if (place('reedCluster', (tx + 0.5) * T, (ty + 0.5) * T, { bank: true })) reeds++;
    }
    this._r381Census.reedCandidates = cands.length;
    this._r381Census.reeds = reeds;
    // Towns with water near: a washing station on the nearest bank. (The crossings are `_r383Fords`, below.)
    let wash = 0, stones = 0;
    const fords = (this._r381Fords = []);
    for (const region of REGIONS) {
      for (const st of (region.settlements || [])) {
        if (st.kind !== 'town' && st.kind !== 'village' && st.kind !== 'city' && st.id !== CITY) continue;
        const c = st._centre || regionPoint(region, st.at);
        const ctx = Math.floor(c.x / T), cty = Math.floor(c.y / T);
        const R0 = Math.max(8, Math.round(st.radius || 10)), R1 = R0 + 30;
        let bank = null;
        for (let r = R0; r <= R1 && !bank; r++) {
          for (let a = 0; a < 48 && !bank; a++) {
            const th = a * Math.PI / 24;
            const tx = ctx + Math.round(Math.cos(th) * r), ty = cty + Math.round(Math.sin(th) * r);
            if (water(tx, ty)) continue;
            if (!(water(tx + 1, ty) || water(tx - 1, ty) || water(tx, ty + 1) || water(tx, ty - 1))) continue;
            const t = tt[ty * M + tx];
            if (isRoadTile(t) || t === TILE_CITY) continue;
            bank = place('washingStation', (tx + 0.5) * T, (ty + 0.5) * T, { settlement: st.id, riverside: true });
          }
        }
        if (bank) wash++;
      }
    }
    // ROUND 383 -- "There's only one ford." The crossing was looked for once per town, on the ring of tiles round it,
    // and kept only if no other ford stood within 40 tiles -- so the one town whose ring met a narrow neck got it and
    // the rest of the world had none. Now every narrow run in reach of a town, a farm or a road is a candidate.
    stones = this._r383Fords(water, fords);
    Object.assign(this._r381Census, { wash, stones, fords: fords.length });
  },

  /** ROUND 383 -- STEPPING STONES WHEREVER A RIVER, STREAM OR POND NECK NARROWS TO FIVE TILES OR LESS WITHIN REACH OF
   *  A TOWN, A FARM OR A ROAD. Candidates are scanned only in 16-tile cells that are in reach (a settlement within its
   *  radius + 60 tiles, a steading within 40, or a road sampled in the cell), so the scan is a few million tile reads,
   *  not the whole 6,800-square map. A candidate is the MIDDLE tile of a run of water 1-5 tiles long along x or y,
   *  dry and unobstructed at both ends, with the water carrying on either side of it (a crossing, not a puddle).
   *  Ranked: a road or path at either end first ("where a road meets water"), then a town, then a farm; shorter runs
   *  first; ties by a hash. Picked greedily at least 24 tiles apart, at most 15. Every tile of a chosen run becomes
   *  TILE_PATH -- walkable, exactly as round 381's single ford -- and the stones lie along it as flat decals, turned
   *  to the run's axis (the art runs along world y; an x run is drawn mirrored). Deterministic: no randomness at all. */
  _r383Fords(water, fords) {
    const tt = this.tileType;
    const M = Math.round(Math.sqrt(tt.length));
    const T = TILE;
    const C = 16, CM = Math.ceil(M / C);
    const reach = new Uint8Array(CM * CM);   // 1 town, 2 farm, 4 road
    const mark = (cx, cy, rT, bit) => {
      const r = Math.ceil(rT / C);
      const x0 = Math.floor(cx / C), y0 = Math.floor(cy / C);
      for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) if (x >= 0 && y >= 0 && x < CM && y < CM) reach[y * CM + x] |= bit;
    };
    const towns = [];
    for (const region of REGIONS) {
      for (const st of (region.settlements || [])) {
        const c = st._centre || regionPoint(region, st.at);
        if (!c) continue;
        const rT = (st.radius || 10) + 60;
        towns.push({ tx: c.x / T, ty: c.y / T, rT, id: st.id });
        mark(c.x / T, c.y / T, rT, 1);
      }
    }
    const farms = (this._steadings || []).filter(sd => sd && Number.isFinite(sd.x));
    for (const sd of farms) mark(sd.x / T, sd.y / T, 40, 2);
    for (let cy = 0; cy < CM; cy++) for (let cx = 0; cx < CM; cx++) {
      if (reach[cy * CM + cx] & 4) continue;
      let road = false;
      for (let y = cy * C + 2; y < Math.min(M, cy * C + C) && !road; y += 4) for (let x = cx * C + 2; x < Math.min(M, cx * C + C); x += 4) {
        if (isCarriagewayTile(tt[y * M + x])) { road = true; break; }
      }
      if (road) { reach[cy * CM + cx] |= 4; }
    }
    // An end is a place to step off onto: dry, unobstructed, and so is the tile beyond it (the walk-up), and no solid
    // prop laid this pass (which `_collidesObstacle` cannot see yet) stands on either.
    const dryOk = (tx, ty, dx, dy) => {
      for (const k of [0, 1]) {
        const x0 = tx + dx * k, y0 = ty + dy * k;
        if (x0 < 1 || y0 < 1 || x0 >= M - 1 || y0 >= M - 1 || water(x0, y0)) return false;
        const x = (x0 + 0.5) * T, y = (y0 + 0.5) * T;
        if (this._collidesObstacle && this._collidesObstacle(x, y, 14)) return false;
        if (this.cityProps.some(o => o.solid && Math.abs(o.x - x) < 60 && Math.hypot(o.x - x, o.y - y) < (o.radius || 12) + 18)) return false;
      }
      return true;
    };
    const roadAt = (tx, ty, r) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = tx + dx, y = ty + dy;
        if (x >= 0 && y >= 0 && x < M && y < M && isCarriagewayTile(tt[y * M + x])) return true;
      }
      return false;
    };
    // ROUND 393 -- not across a city park's pond. Round 187/188's "a 5x7 set of water tiles" in every park is a whole
    // pond five tiles wide, not the NECK of one, but it passed this scan as a crossing (water running on either side of
    // the middle row) and the nearest-the-road ranking put a ford through the middle of five of them -- a row of path
    // across the pond (test_round187 / test_round188: "every pond is 5 x 7 water tiles").
    const parkPonds = [];
    for (const g of Object.values(this._gridPlans || {})) for (const q of (g.ponds || [])) parkPonds.push(q);
    if (this._cadenceParkPonds && this._outlineOriginTile) {
      const { tx: ox, ty: oy } = this._outlineOriginTile();
      for (const q of this._cadenceParkPonds) parkPonds.push({ tx: ox + q.x, ty: oy + q.y, w: q.w, h: q.h });
    }
    const inParkPond = (tx, ty) => parkPonds.some(q => tx >= q.tx && tx < q.tx + q.w && ty >= q.ty && ty < q.ty + q.h);
    const cands = [];
    for (let cy = 0; cy < CM; cy++) for (let cx = 0; cx < CM; cx++) {
      const bits = reach[cy * CM + cx];
      if (!bits) continue;
      for (let ty = Math.max(3, cy * C); ty < Math.min(M - 3, cy * C + C); ty++) {
        for (let tx = Math.max(3, cx * C); tx < Math.min(M - 3, cx * C + C); tx++) {
          if (!isWaterTile(tt[ty * M + tx])) continue;
          if (parkPonds.length && inParkPond(tx, ty)) continue;   // ROUND 393
          if (this._isLavaAt && this._isLavaAt((tx + 0.5) * T, (ty + 0.5) * T)) continue;   // Cinder's flows are not fordable
          for (const [dx, dy] of [[0, 1], [1, 0]]) {
            let a = 0, b = 0;
            while (a < 5 && water(tx - dx * (a + 1), ty - dy * (a + 1))) a++;
            while (b < 5 && water(tx + dx * (b + 1), ty + dy * (b + 1))) b++;
            const len = a + b + 1;
            if (len > 5 || (a !== b && a !== b - 1)) continue;   // the run's middle tile only, so each run is seen once
            const ex0 = tx - dx * (a + 1), ey0 = ty - dy * (a + 1), ex1 = tx + dx * (b + 1), ey1 = ty + dy * (b + 1);
            if (water(ex0, ey0) || water(ex1, ey1)) continue;   // longer than 5
            const px = dy, py = dx;
            if (!water(tx + px * 2, ty + py * 2) || !water(tx - px * 2, ty - py * 2)) continue;   // a crossing, not a puddle
            if (!dryOk(ex0, ey0, -dx, -dy) || !dryOk(ex1, ey1, dx, dy)) continue;
            let why = null, rank = 9;
            if ((bits & 4) && (roadAt(ex0, ey0, 3) || roadAt(ex1, ey1, 3))) { why = 'road'; rank = 0; }
            else if ((bits & 1) && towns.some(q => Math.hypot(q.tx - tx, q.ty - ty) < q.rT)) { why = 'town'; rank = 1; }
            else if ((bits & 2) && farms.some(sd => Math.hypot(sd.x / T - tx, sd.y / T - ty) < 40)) { why = 'farm'; rank = 2; }
            if (!why) continue;
            cands.push({ tx, ty, dx, dy, a, b, len, why, rank, h: hashStr(`ford|${tx}|${ty}`) % 10007 });
          }
        }
      }
    }
    cands.sort((p, q) => p.rank - q.rank || p.len - q.len || p.h - q.h);
    const MAX = 15, GAP = 24;
    const def = DEFS.steppingStones;
    let stones = 0;
    for (const c of cands) {
      if (fords.length >= MAX) break;
      if (fords.some(f => Math.abs(f.tx - c.tx) < GAP && Math.abs(f.ty - c.ty) < GAP)) continue;
      // the crossing: every tile of the run becomes walkable ground
      const tiles = [];
      for (let i = -c.a; i <= c.b; i++) tiles.push((c.ty + c.dy * i) * M + (c.tx + c.dx * i));
      if (tiles.some(k => !isWaterTile(tt[k]))) continue;
      for (const k of tiles) tt[k] = TILE_PATH;
      // the reeds are laid first (bank tiles) and a clump on a ford's landing is in the way: cleared off the run's ends
      const lx0 = (c.tx - c.dx * (c.a + 1) + 0.5) * T, ly0 = (c.ty - c.dy * (c.a + 1) + 0.5) * T;
      const lx1 = (c.tx + c.dx * (c.b + 1) + 0.5) * T, ly1 = (c.ty + c.dy * (c.b + 1) + 0.5) * T;
      // ...and each landing becomes a scrap of path too, so the forest (grown after this pass) leaves the step-off clear
      for (const [lx, ly] of [[lx0, ly0], [lx1, ly1]]) { const k = Math.floor(ly / T) * M + Math.floor(lx / T); if (!isWaterTile(tt[k])) tt[k] = TILE_PATH; }
      for (let i = this.cityProps.length - 1; i >= 0; i--) {
        const o = this.cityProps[i];
        if (o.prop === 'reedCluster' && (Math.hypot(o.x - lx0, o.y - ly0) < T * 1.6 || Math.hypot(o.x - lx1, o.y - ly1) < T * 1.6)) this.cityProps.splice(i, 1);
      }
      const near = towns.reduce((m, q) => { const d = Math.hypot(q.tx - c.tx, q.ty - c.ty); return d < m.d ? { d, id: q.id } : m; }, { d: 1e9, id: null });
      // one string of stones for a short run, two end to end for a long one, scaled to the run
      const n = c.len <= 3 ? 1 : 2;
      const k0 = c.len <= 2 ? 0.6 : 0.85;
      for (let i = 0; i < n; i++) {
        const f = -c.a - 0.5 + c.len * (i + 0.5) / n;   // tiles along the run from its middle tile's centre
        const x = (c.tx + c.dx * f + 0.5) * T, y = (c.ty + c.dy * f + 0.5) * T;
        this.cityProps.push({ x, y, sprite: null, sheet: ART.key, art: ART, frame: def.idx, radius: 0, solid: false,
          cityProp: true, prop: 'steppingStones', r381: 'river', scaleMul: def.scale * k0, flat: true, squash: def.squash || 1,
          oy: def.oy, settlement: near.id, ford: true, flipX: c.dx === 1 });
        stones++;
      }
      const mid = (c.b - c.a) / 2;
      fords.push({ x: (c.tx + c.dx * mid + 0.5) * T, y: (c.ty + c.dy * mid + 0.5) * T, tx: c.tx, ty: c.ty, settlement: near.id,
        len: c.len, axis: c.dx === 1 ? 'x' : 'y', why: c.why });
    }
    this._r381Census.fordCandidates = cands.length;
    return stones;
  },

  /** A narrow run of water through (tx, ty): dry on both sides within 5 tiles, along x or along y. Returns its tiles. */
  _r381FordAt(tx, ty, water) {
    const M = Math.round(Math.sqrt(this.tileType.length));
    for (const [dx, dy] of [[0, 1], [1, 0]]) {
      let a = 0, b = 0;
      while (a < 6 && water(tx - dx * (a + 1), ty - dy * (a + 1))) a++;
      while (b < 6 && water(tx + dx * (b + 1), ty + dy * (b + 1))) b++;
      const len = a + b + 1;
      if (len > 5 || a >= 6 || b >= 6) continue;
      // a crossing, not a puddle: the water must carry on either side of it (a river or a lake's neck)
      const px = dy, py = dx;
      if (!water(tx + px * 2, ty + py * 2) || !water(tx - px * 2, ty - py * 2)) continue;
      const tiles = [];
      for (let i = -a; i <= b; i++) tiles.push((ty + dy * i) * M + (tx + dx * i));
      const mid = (b - a) / 2;
      return { tiles, dx: 0, dy: 0, x: (tx + dx * mid + 0.5) * TILE, y: (ty + dy * mid + 0.5) * TILE };
    }
    return null;
  },

  /** ROUND 381 -- THE INSIDES. Called once per room from `_buildRoomContents`, after the furniture and the kit, so the
   *  free-floor test sees every collider the room already has. Taverns and inns, labs and alchemists, ritual floors,
   *  caves (stalagmites) and astral spaces (islands). Everything is drawn into `interiorSprites` with the room's tag,
   *  so the room's own show/hide covers it; solids go into `interiorSolids`. Deterministic: every choice is a hash of
   *  the room id. */
  _r381RoomDress(room) {
    // No "already dressed" flag: `_buildRoomContents` runs this once per build, and a pooled house room (round 66's
    // generic interiors) is undressed and rebuilt for every building it stands in for, so it must be dressed again.
    if (!room || !this.textures.exists(ART.key)) return;
    const census = (this._r381RoomCensus = this._r381RoomCensus || {});
    const id = String(room.id || '');
    const b = room._forBuilding || null;
    const site = room._site !== undefined && room._site !== null ? (this.sites || []).find(q => q && q.id === room._site) : null;
    const label = [id, room.name, room.building, room._clKind, room._layoutId, b && b.service, b && b.singleton, b && b.clSite]
      .filter(Boolean).join(' ').toLowerCase();
    const cultDen = !!(site && R381_CULT_SITES.includes(site.key)) || !!room._darkChurch;
    const cave = typeof room.caveWalkable === 'function' && typeof room.caveFloor === 'function';
    const walk = (tx, ty) => cave ? !!room.caveWalkable(tx, ty) : (tx >= 0 && ty >= 0 && tx < room.w && ty < room.h);
    // The wall run's colliders sit on the room's edge lines; furniture is everything else. A thing stood near a wall
    // must keep clear of the furniture there, not of the wall it stands against.
    const X0 = room.x, Y0 = room.y, X1 = room.x + (room.w || 0) * TILE, Y1 = room.y + (room.h || 0) * TILE;
    const onEdge = (o) => !cave && (Math.abs(o.x - X0) < 20 || Math.abs(o.x - X1) < 20 || Math.abs(o.y - Y0) < 20 || Math.abs(o.y - Y1) < 20);
    const solids = this.interiorSolids.filter(o => o.room === room.id && !onEdge(o));
    const keep = [];
    try { const e = roomEntryPoint(room); keep.push({ x: e.x, y: e.y, r: 3 * TILE }); } catch (e) { /* no door */ }
    for (const d of (this.doorways || [])) if (d.room === room || (d.to && d.kind !== 'enter' && d.room === room)) keep.push({ x: d.x, y: d.y, r: 3 * TILE });
    for (const k of ['inner', 'secret', 'stairs', 'upstairs', 'downstairs']) {
      const q = room[k];
      if (q && q.tx !== undefined) { const c = roomTileCentre(room, q.tx, q.ty); keep.push({ x: c.x, y: c.y, r: 2.5 * TILE }); }
    }
    for (const p of (room.props || [])) if (/stair|door|ladder/i.test(p.key || '')) { const c = roomTileCentre(room, p.tx, p.ty); keep.push({ x: c.x, y: c.y, r: 2.5 * TILE }); }
    for (const c of (this.chests || [])) if (c.room === room) keep.push({ x: c.x, y: c.y, r: 1.5 * TILE });
    const laid = [];
    // ROUND 383 -- what already stands in the room that `solids` does not hold: a den's boulders and trees (round 90's
    // dresser puts them on `obstacles` / `forestTrees`, tagged with the room), and the room's drawn furniture. The
    // stalagmites and a ritual circle keep a tile and a half clear of all of it ("stalagmites can crowd the cave
    // boulders"; a chalk circle was drawn under a boulder in a cult den).
    const occupied = [];
    for (const o of [...(this.obstacles || []), ...(this.forestTrees || [])]) if (o && o.den === room.id) occupied.push({ x: o.x, y: o.y, r: o.radius || 16 });
    for (const o of solids) occupied.push({ x: o.x, y: o.y, r: o.radius || 16 });
    for (const p of (room.props || [])) if (p && p.tx !== undefined) { const c = roomTileCentre(room, p.tx, p.ty); occupied.push({ x: c.x, y: c.y, r: 16 }); }
    const roomy = (x, y, gap) => !occupied.some(o => Math.abs(o.x - x) < o.r + gap + 2 && Math.hypot(o.x - x, o.y - y) < o.r + gap);
    const free = (x, y, r) => {
      if (keep.some(k => Math.hypot(k.x - x, k.y - y) < k.r + r)) return false;
      if (solids.some(o => Math.hypot(o.x - x, o.y - y) < (o.radius || 16) + r + 4)) return false;
      if (laid.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 6)) return false;
      return true;
    };
    const draw = (key, x, y, o = {}) => {
      const def = DEFS[key];
      const p = isoProject(x, y);
      // ROUND 387 -- a ritual circle from the 4x sheet when it is loaded, at a quarter of the scale
      const hd = RITUAL_CIRCLES_HD.frames[key] !== undefined && this.textures.exists(RITUAL_CIRCLES_HD.key);
      const s = hd ? this.add.image(p.x, p.y - (o.lift || 0), RITUAL_CIRCLES_HD.key, RITUAL_CIRCLES_HD.frames[key])
        : this.add.image(p.x, p.y - (o.lift || 0), ART.key, def.idx);
      s.setOrigin(ART.footX, def.flat ? def.oy : ART.footY);
      const k = def.scale * (o.scale || 1) / (hd ? RITUAL_CIRCLES_HD.up : 1);
      s.setScale(k, k * (def.flat ? (def.squash || 1) : 1));
      s.setDepth(def.flat ? isoDepth(x, y) - 50000 : (o.depth !== undefined ? o.depth : isoDepth(x, y)));
      s._fogWorld = { x, y };
      s._r381 = key;
      this.interiorSprites.push(this._tagRoom(s, room));
      const solid = def.solid && !o.noSolid;
      if (solid) { const c = { room: room.id, x, y, radius: def.radius }; this.interiorSolids.push(c); solids.push(c); }
      laid.push({ x, y, r: o.r !== undefined ? o.r : (def.radius || 12) });
      census[key] = (census[key] || 0) + 1;
      return s;
    };
    const tc = (tx, ty) => roomTileCentre(room, tx, ty);
    // the first free tile from a list of candidates
    const first = (key, cands, r, o = {}) => {
      for (const [tx, ty] of cands) {
        if (!walk(tx, ty)) continue;
        const c = tc(tx, ty);
        if (free(c.x, c.y, r)) return draw(key, c.x, c.y, o);
      }
      return null;
    };
    const W = room.w, H = room.h;
    const h = hashStr(id);
    const tavern = /tavern|\binn\b|alehouse|taproom/.test(label);
    const lab = /alchem|apothec|division_lab|harvest_works|magicshop|potion/.test(label);
    // --- tavern: a stage in a back corner, a dice table on the floor, mugs on the tables, three things on the back wall
    if (tavern && !cave) {
      // a corner first (back corners before front), then anywhere along a side wall
      const corners = [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]];
      if (h % 2) corners.reverse();
      for (let ty = 2; ty < H - 2; ty++) corners.push([1, ty], [W - 2, ty]);
      for (let tx = 2; tx < W - 2; tx++) corners.push([tx, 1]);
      first('bardStage', corners, DEFS.bardStage.radius);
      const mid = [];
      for (let ty = 1; ty < H - 1; ty++) for (let tx = 1; tx < W - 1; tx++) mid.push([tx, ty]);
      mid.sort((a, b) => (hashStr(`${id}|d|${a}`) % 97) - (hashStr(`${id}|d|${b}`) % 97));
      first('diceTable', mid, DEFS.diceTable.radius);
      let mugs = 0;
      for (const p of (room.props || [])) {
        if (mugs >= 3 || !/^table/i.test(p.key || '')) continue;
        const c = tc(p.tx, p.ty);
        draw('mugsAndPlates', c.x, c.y, { lift: 14, depth: isoDepth(c.x, c.y) + 2, noSolid: true, r: 0 });
        mugs++;
      }
      // the back (north) wall: hung at the wall line, lifted onto it, drawn over it
      // Hung high enough to clear a counter or a sideboard below (`lift`), so they need keep clear only of the door,
      // the stairs and each other -- never solid, nothing stands on them.
      // The dartboard is on its own stand (see the art): it stands on the floor against a side wall, solid, clear of
      // the furniture. The menu board and the boar's head hang.
      const along = [];
      for (let ty = 2; ty < H - 2; ty++) along.push([1, ty], [W - 2, ty]);
      for (let tx = 2; tx < W - 2; tx++) along.push([tx, 1]);
      along.sort((a, c) => (hashStr(`${id}|b|${a}`) % 211) - (hashStr(`${id}|b|${c}`) % 211));
      first('dartboard', along, DEFS.dartboard.radius + 6);
      const wallKeys = ['menuBoard', 'boarHead'];
      const wallSpots = [];
      for (let tx = 2; tx < W - 2; tx += 2) wallSpots.push({ x: X0 + (tx + 0.5) * TILE, y: Y0 + TILE * 0.3 });
      for (let ty = 2; ty < H - 2; ty += 2) wallSpots.push({ x: X0 + TILE * 0.3, y: Y0 + (ty + 0.5) * TILE });
      wallSpots.sort((a, b) => (hashStr(`${id}|w|${a.x},${a.y}`) % 997) - (hashStr(`${id}|w|${b.x},${b.y}`) % 997));
      for (const key of wallKeys) {
        const at = wallSpots.find(q => !keep.some(k => Math.hypot(k.x - q.x, k.y - q.y) < k.r + 10)
          && !laid.some(o => o.wall && Math.hypot(o.x - q.x, o.y - q.y) < 3 * TILE));
        if (!at) break;
        draw(key, at.x, at.y, { lift: 64, noSolid: true, r: 0 });
        laid[laid.length - 1].wall = true;
      }
    }
    // --- lab: the alembic rig against the back wall
    if (lab && !cave) {
      const back = [];
      for (let ty = 1; ty <= 3; ty++) for (let tx = 1; tx < W - 1; tx++) back.push([tx, ty]);
      back.sort((a, b) => (hashStr(`${id}|l|${a}`) % 89) - (hashStr(`${id}|l|${b}`) % 89));
      first('alembicRig', back, DEFS.alembicRig.radius);
    }
    // --- ritual floors: chalk for cults and hedge mages, gold for temples and the Society's ritual hall, silver for
    // moon, astral and celestial rites
    let circle = null;
    if (room.astral || /moon|lunar|astral|celestial/.test(label)) circle = 'ritualCircleSilver';
    else if (room.templeGod || id.startsWith('guild_ritual')) circle = 'ritualCircleGold';
    else if (cultDen || /cult|hedge|witch|coven|hideout|shrine cell/.test(label)) circle = 'ritualCircleChalk';
    // A realm is hundreds of tiles across: its circle and islands go round the point the player arrives at.
    let astralAnchor = null;
    if (room.astral) {
      try { astralAnchor = typeof room.realmEntry === 'function' ? room.realmEntry() : null; } catch (e) { astralAnchor = null; }
      if (!astralAnchor) astralAnchor = { x: room.x + W * TILE / 2, y: room.y + H * TILE / 2 };
    }
    if (circle) {
      const ca = astralAnchor ? { tx: Math.floor((astralAnchor.x - room.x) / TILE), ty: Math.floor((astralAnchor.y - room.y) / TILE) - 5 } : null;
      const cx = ca ? ca.tx : Math.floor(W / 2), cy = ca ? ca.ty : Math.floor(H / 2);
      const cands = [];
      for (let r = 0; r <= 7; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) cands.push([cx + dx, cy + dy]);
      // a decal: nothing stands on it, but it need not keep clear of the furniture's whole footprint
      for (const [tx, ty] of cands) {
        if (!walk(tx, ty)) continue;
        const c = tc(tx, ty);
        if (keep.some(k => Math.hypot(k.x - c.x, k.y - c.y) < k.r + TILE)) continue;
        if (solids.some(o => Math.hypot(o.x - c.x, o.y - c.y) < (o.radius || 16) + TILE * 0.8)) continue;
        if (!roomy(c.x, c.y, TILE * 1.5)) continue;   // ROUND 383 -- never under a boulder
        draw(circle, c.x, c.y, { r: 0 });
        break;
      }
    }
    // --- caves, mines and dungeons: stalagmites in the open, never in a neck
    if (cave) {
      const floor = room.caveFloor() || [];
      // open floor: the 3x3 round it all floor, and at most four rock tiles in the 5x5 -- a chamber, never a neck
      const open = floor.filter(t => {
        let rock = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (room.caveWalkable(t.tx + dx, t.ty + dy)) continue;
          if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) return false;
          rock++;
        }
        return rock <= 4;
      });
      open.sort((a, b) => (hashStr(`${id}|s|${a.tx},${a.ty}`) % 1009) - (hashStr(`${id}|s|${b.tx},${b.ty}`) % 1009));
      const want = 2 + (h % 3);
      const crystal = /crystal|mine|gem|ice|elehyd/.test(label) || (h % 3 === 0);
      let n = 0;
      for (const t of open) {
        if (n >= want) break;
        const c = tc(t.tx, t.ty);
        if (laid.some(o => Math.hypot(o.x - c.x, o.y - c.y) < 3.5 * TILE)) continue;
        if (!free(c.x, c.y, 24)) continue;
        if (!roomy(c.x, c.y, 8 + TILE * 1.5)) continue;   // ROUND 383 -- a tile and a half (and a little) clear of every boulder and tree
        occupied.push({ x: c.x, y: c.y, r: 24 });
        draw(crystal && n % 2 === 0 ? 'stalagmitesCrystal' : 'stalagmites', c.x, c.y);
        n++;
      }
    }
    // --- astral spaces: islands floating off the floor round the way in, above the floor layer, never solid. Up-screen
    // of the arrival point (north and west), so they sort behind a player who walks in.
    if (room.astral) {
      const o = astralAnchor;
      // ROUND 383 -- in the first screen. The old spots ([-8,-7], [6,-10], [-13,0], [2,-15]) were 400-800 screen pixels
      // from the arrival at the realm's zoom: every island was off the edge of the view the player arrives to. These
      // are up-screen (so they sort behind the player) and within about 300 pixels of the way in, lifted 56 off the floor.
      const spots = [[-6, 1], [3, -6], [-3, -4], [-8, -3], [-2, -8], [5, -9]];
      let n = 0;
      for (const [dx, dy] of spots) {
        if (n >= 3) break;
        const x = o.x + dx * TILE, y = o.y + dy * TILE;
        if (laid.some(q => Math.hypot(q.x - x, q.y - y) < 3 * TILE)) continue;
        const key = (h + n) % 2 ? 'astralIslandTwin' : 'astralIslandSmall';
        const sp = draw(key, x, y, { lift: 56, noSolid: true, r: 0 });
        laid[laid.length - 1].r = 2 * TILE;
        if (sp && this.tweens) this.tweens.add({ targets: sp, y: sp.y - 8, duration: 2600 + n * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        n++;
      }
    }
  },

  /** Window boxes under the windows either side of the door, a hanging basket beside the door, pots on the step, a
   *  rose trellis against a mansion's garden front, a rain barrel at the side wall. `share` is the fraction of houses
   *  dressed: 0.6 in Cadence, 0.35 in a town or city, 0.2 in a village. */
  _r381HouseFronts(mine, share, rng, hang, place, frontOf, at, tag) {
    const boxes = ['flowerboxGeranium', 'flowerboxMarigold'];
    for (const b of mine) {
      if (!b.sprite || b.clShed) continue;
      if (!(b.house || b.mansion || b.infill || b.terrace)) continue;
      if (rng() >= share) continue;
      const f = frontOf(b);
      const s = rng() < 0.5 ? 1 : -1;
      // under a window: a little in from the front wall, well to one side of the door
      if (rng() < 0.7) hang(boxes[Math.floor(rng() * 2)], ...xy(at(b, f, f.step - 12, s * 62)), { ...tag, window: true }, b, f.door);
      if (rng() < 0.35) hang(boxes[Math.floor(rng() * 2)], ...xy(at(b, f, f.step - 12, -s * 62)), { ...tag, window: true }, b, f.door);
      // beside the door, not in it
      if (rng() < 0.3) hang('hangingBasket', ...xy(at(b, f, f.step - 6, -s * 34)), { ...tag, doorside: true }, b, f.door);
      else if (rng() < 0.25) hang('potCluster', ...xy(at(b, f, f.step + 4, -s * 38)), { ...tag, doorside: true }, b, f.door);
      if (b.mansion && rng() < 0.6) place('roseTrellis', ...xy(at(b, f, f.step + 20, s * 110)), { ...tag, garden: true });
      // the side wall: a rain barrel under the eaves (clutter, so `put`'s smaller keep-out applies)
      if (rng() < 0.18) {
        const r = (b.radius || 52) + 26;
        place('rainBarrel', b.x - f.dy * r * s, b.y + f.dx * r * s, { ...tag, clutter: true });
      }
    }
  },

  /** The tavern: its hanging sign and a sandwich board beside the door, a trough and a hitching rail along its side
   *  (the inn's yard). Also a sandwich board at each magic shop. */
  _r381Tavern(mine, hang, place, frontOf, at, tag) {
    for (const b of mine) {
      if (b.singleton === 'tavern' || /tavern|inn/i.test(String(b.service || b.clName || ''))) {
        const f = frontOf(b);
        place('shopSign', ...xy(at(b, f, f.step + 18, 64)), { ...tag, tavern: true }) ||
          place('shopSign', ...xy(at(b, f, f.step + 18, -64)), { ...tag, tavern: true });
        place('sandwichBoard', ...xy(at(b, f, f.step + 26, -54)), { ...tag, tavern: true }) ||
          place('sandwichBoard', ...xy(at(b, f, f.step + 26, 54)), { ...tag, tavern: true });
        // ROUND 383 -- THE TROUGH NEVER ONCE PLACED. It was tried at the building's radius + 40 to the side, 10 out --
        // and `put` keeps every non-clutter prop the building's radius + 52 off any building, its own included, so the
        // spot was refused in every town every time. A trough and a rail belong against the inn's side wall exactly as
        // a barrel does, so they take clutter's berth (radius + 22), and several spots are tried down the side wall,
        // either side, before giving up.
        this._r383InnYard(b, f, place, at, { ...tag, inn: true });
      } else if (b.service === 'magicshop') {
        const f = frontOf(b);
        place('sandwichBoard', ...xy(at(b, f, f.step + 24, 50)), { ...tag, shop: true });
      }
    }
  },

  /** ROUND 383 -- a trough and a hitching rail down an inn's side wall: the first side spot `put` accepts, the rail one
   *  trough-length further along the same wall. Returns true when the trough went in. */
  _r383InnYard(b, f, place, at, tag) {
    const R = b.radius || 52;
    const t2 = { ...tag, clutter: true };
    for (const s of [1, -1]) {
      for (const side of [R + 30, R + 42, R + 58]) {
        for (const out of [10, -22, 38, -50]) {
          const p = at(b, f, out, s * side);
          if (!place('waterTrough', p.x, p.y, t2)) continue;
          for (const o2 of [out + 52, out - 52, out + 72, out - 72]) {
            const q = at(b, f, o2, s * side);
            if (place('hitchingRail', q.x, q.y, t2)) break;
          }
          return true;
        }
      }
    }
    return false;
  },

  /** ROUND 383 -- the stable yards (round 200), which are built after the city props: a water trough and a hitching rail
   *  by each yard's gate, inside the fence line if there is room, just outside it if not. Drawn as the yard's wagons
   *  are -- a sprite on `_stableProps`, which the static grid and the occluder pass already read -- so they are solid
   *  and fade like the rest of the yard. Called from the end of `_buildStableYards`. */
  _r383StableYardProps() {
    if (!this.textures.exists(ART.key) || !this._stables) return 0;
    this._stableProps = this._stableProps || [];
    const census = (this._r381Census = this._r381Census || {});
    const T = TILE;
    const clear = (x, y, r) => {
      if (this._isWaterAt(x, y)) return false;
      if (isCarriagewayTile(this._tileTypeAt(Math.floor(x / T), Math.floor(y / T)))) return false;
      if (this._collidesObstacle && this._collidesObstacle(x, y, r + 6)) return false;
      for (const e of this._stableProps) if (Math.hypot(e.x - x, e.y - y) < (e.radius || 12) + r + 14) return false;
      for (const d of (this.doorways || [])) if (d && Math.abs(d.x - x) < 200 && Math.hypot(d.x - x, d.y - y) < (d.radius || 40) + r + 10) return false;
      return true;
    };
    const draw = (key, x, y, yard) => {
      const def = DEFS[key];
      const p = isoProject(x, y);
      const sp = this.add.image(p.x, p.y, ART.key, def.idx).setOrigin(ART.footX, ART.footY);
      sp.setScale(ART.scale * def.scale).setDepth(isoDepth(x, y));
      const e = { x, y, anchorX: x, anchorY: y, radius: def.radius || 0, sprite: sp, stable: yard.id, r381: 'stable', prop: key };
      this._stableProps.push(e);
      if (this._occludables) this._occludables.push(e);
      census[key] = (census[key] || 0) + 1;
      return e;
    };
    let n = 0;
    for (const yard of this._stables) {
      const W = yard.w, H = yard.h;
      // the gate edge, as a line along which `u` runs, and `v` pointing out through the gate
      const g = yard.gate;
      const horiz = g === 'north' || g === 'south';
      const L = horiz ? W : H;
      const edge = (u, v) => {
        // u: tiles along the gate edge from its middle; v: tiles out from the fence (negative = inside the yard)
        let tx, ty;
        if (g === 'north') { tx = W / 2 + u; ty = -v; }
        else if (g === 'south') { tx = W / 2 + u; ty = H + v; }
        else if (g === 'west') { tx = -v; ty = H / 2 + u; }
        else { tx = W + v; ty = H / 2 + u; }
        return { x: (yard.tx0 + tx) * T, y: (yard.ty0 + ty) * T };
      };
      const h = hashStr(yard.id);
      const sgn = h % 2 ? 1 : -1;
      let done = false;
      for (const v of [-1.5, 1.6, -2.5, 2.6]) {
        for (const u0 of [L / 2 - 3, L / 2 - 5, L / 2 - 7]) {
          for (const s of [sgn, -sgn]) {
            const a = edge(s * u0, v);
            if (!clear(a.x, a.y, DEFS.waterTrough.radius)) continue;
            // the rail a trough-length nearer the gate, on the same line
            const b = edge(s * (u0 - 1.8), v);
            if (!clear(b.x, b.y, DEFS.hitchingRail.radius)) continue;
            draw('waterTrough', a.x, a.y, yard);
            draw('hitchingRail', b.x, b.y, yard);
            n++; done = true; break;
          }
          if (done) break;
        }
        if (done) break;
      }
    }
    census.stableYards = n;
    return n;
  },

  /** ROUND 383 -- WHERE A BUILDING'S FRONT WALL MEETS THE GROUND AT ITS DOOR, from the art (round 306's door pixel, or
   *  the art box when the sheet's door has not been read): the same arithmetic `_artDoor` does, stopped before it steps
   *  out to a standable doorstep. A thing hung on the wall is laid along the wall from here, not along the doorstep. */
  _r383WallDoor(b) {
    try {
      const sp = b && b.sprite;
      if (!sp || !sp.texture || !ART_TURNS[sp.texture.key]) return null;
      const frame = Number(sp.frame && sp.frame.name);
      const row = Number.isFinite(frame) ? Math.floor(frame / 8) : null;
      const facing = artDoorFacing(sp.texture.key, row)   // ROUND 420
        || ((artTurns(sp.texture.key, row) && !artDoorFixed(sp.texture.key, row)) ? (b.facing || 'south') : 'south');
      const d = moveFromFacing(facing);
      if (!d) return null;
      const col = Number.isFinite(frame) ? frame % TOWN_ATLAS_COLS : null;
      const px = col == null ? null : artDoorPixel(sp.texture.key, row, col);
      const ax = b.anchorX ?? b.x, ay = b.anchorY ?? b.y;
      if (px && sp.frame) {
        const sdx = (px[0] - sp.originX * sp.frame.width) * sp.scaleX;
        const sdy = (px[1] - sp.originY * sp.frame.height) * sp.scaleY;
        const gx = sdx / ISO_TW + sdy / ISO_TH, gy = sdy / ISO_TH - sdx / ISO_TW;
        return { x: ax + gx * TILE, y: ay + gy * TILE, dx: d.dx, dy: d.dy };
      }
      if (!this._artBox) return null;
      const side = this._artBox(sp).w / (TILE * 2);
      const cx = ax / TILE - side / 2, cy = ay / TILE - side / 2;
      const t = (side / 2) / Math.max(Math.abs(d.dx), Math.abs(d.dy), 1e-6);
      return { x: (cx + d.dx * t) * TILE, y: (cy + d.dy * t) * TILE, dx: d.dx, dy: d.dy };
    } catch (e) { return null; }
  },

  /** Cadence, from its own map: the square, the kerbs of the main streets, the market, the gates, the civic fronts. */
  _r381Cadence(place, hang, ring, frontOf, at, roadNear, onPaving, rng) {
    if (!this._clAt) return;
    const tag = { settlement: CITY };
    const T = TILE;
    const sq = this._clAt(0, 0);
    const civTag = { ...tag, square: true };
    // --- the square: flags, the bell, the vane, benches, a flower bed, the notice board and the wanted pillars
    ring('flagpoleCity', sq.x, sq.y, [12, 14, 16], Math.PI * 0.25, civTag, 16);
    ring('flagpoleCity', sq.x, sq.y, [12, 14, 16], Math.PI * 1.25, civTag, 16);
    ring('bannerPoleGreen', sq.x, sq.y, [11, 13, 15], Math.PI * 0.75, civTag, 16);
    ring('bannerPoleBlue', sq.x, sq.y, [11, 13, 15], Math.PI * 1.75, civTag, 16);
    ring('bellPost', sq.x, sq.y, [9, 11, 13], Math.PI * 0.5, civTag, 16);
    ring('weatherVane', sq.x, sq.y, [14, 16, 18], Math.PI * 1.5, civTag, 16);
    ring('noticeBoard', sq.x, sq.y, [8, 10, 12], Math.PI * 1.0, civTag, 16);
    ring('wantedPillar', sq.x, sq.y, [10, 12, 14], Math.PI * 0.1, civTag, 16);
    ring('wantedPillar', sq.x, sq.y, [10, 12, 14], Math.PI * 1.1, civTag, 16);
    ring('guardPost', sq.x, sq.y, [15, 17, 19], Math.PI * 1.9, civTag, 16);
    ring('knightStatue', sq.x, sq.y, [16, 18, 20], Math.PI * 0.9, civTag, 16);
    ring('stocks', sq.x, sq.y, [17, 19, 21], Math.PI * 0.6, civTag, 16);
    for (let i = 0; i < 6; i++) ring(i % 2 ? 'benchBacked' : 'benchStone', sq.x, sq.y, [7, 9, 11], i * Math.PI / 3 + 0.3, civTag, 16);
    for (let i = 0; i < 2; i++) ring('flowerBed', sq.x, sq.y, [9, 11, 13], i * Math.PI + 1.3, civTag, 16);
    for (let i = 0; i < 4; i++) ring('bollardsChain', sq.x, sq.y, [13, 15, 17], i * Math.PI / 2 + 0.8, civTag, 16);
    // --- the market: the crier's podium on the market square, a flower cart or two, bunting along it, festival arches
    const M = CADENCE_DISTRICTS && CADENCE_DISTRICTS.market;
    if (M) {
      const mc = this._clAt((M.x0 + M.x1) / 2, (M.y0 + M.y1) / 2);
      const mTag = { ...tag, market: true };
      ring('criersPodium', mc.x, mc.y, [2, 4, 6, 8], 0.4, mTag, 16);
      let carts = 0, bunting = 0, arches = 0;
      for (let y = M.y0 + 3; y <= M.y1 - 3; y += 4) {
        for (let x = M.x0 + 3; x <= M.x1 - 3; x += 4) {
          const w = this._clAt(x, y);
          const kerb = !isCarriagewayTile(this._tileTypeAt(Math.floor(w.x / T), Math.floor(w.y / T))) && roadNear(w.x, w.y, 1);
          if (!kerb) continue;
          const r = rng();
          if (carts < 3 && r < 0.08) { if (place('flowerCart', w.x, w.y, mTag)) carts++; }
          else if (bunting < 8 && r < 0.22) { if (place('buntingPosts', w.x, w.y, mTag)) bunting++; }
        }
      }
      // ROUND 403 -- "This random arch should be moved into a park or the wilderness for a key location." The festival
      // arches no longer stand across the market street: each city park gets one, as the gateway on its south side
      // (`_parkArches`, below), where it reads as the way into somewhere.
      arches = this._parkArches ? this._parkArches(ART, DEFS) : 0;
      (this._r381Census.market = { carts, bunting, arches });
    }
    // --- the kerbs of the main streets: planters, urns, topiary, young trees, the odd bench
    {
      const B = CADENCE_BOX;
      const cands = [];
      for (let y = B.y0 + 3; y <= B.y1 - 3; y += 3) {
        for (let x = B.x0 + 3; x <= B.x1 - 3; x += 3) {
          if (Math.hypot(x, y) > R381_KERB_REACH_T) continue;
          const w = this._clAt(x + 0.5, y + 0.5);
          const t = this._tileTypeAt(Math.floor(w.x / T), Math.floor(w.y / T));
          if (t !== TILE_CITY || isCarriagewayTile(t)) continue;
          if (!roadNear(w.x, w.y, 1)) continue;   // the kerb: paving with a road beside it
          cands.push(w);
        }
      }
      for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
      const kinds = ['planterUrn', 'topiaryPot', 'treePlanter', 'planterBarrel', 'flowerboxLavender', 'benchBacked', 'treePlanter', 'benchStone'];
      const laid = [];
      for (const w of cands) {
        if (laid.length >= R381_KERB_MAX) break;
        if (laid.some(o => Math.hypot(o.x - w.x, o.y - w.y) < R381_KERB_GAP_T * T)) continue;
        const rec = place(kinds[laid.length % kinds.length], w.x, w.y, { ...tag, kerb: true });
        if (rec) laid.push(rec);
      }
      this._r381Census.kerb = laid.length;
    }
    // --- the gates: a guard post and a flag inside, a signpost just in, a milestone on the road outside
    {
      const r = this._cadenceWallRect, entries = this._cadenceEntries || [];
      const o = this._outlineOriginTile ? this._outlineOriginTile() : null;
      if (r && o) {
        for (const e of entries) {
          if (!e.side) continue;
          const along = e.side === 'north' || e.side === 'south';
          const fixed = { north: r.y0, south: r.y1, west: r.x0, east: r.x1 }[e.side];
          const gx = (o.tx + (along ? e.at : fixed)) * T, gy = (o.ty + (along ? fixed : e.at)) * T;
          const n = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] }[e.side];   // inward
          const t = [-n[1], n[0]];
          const half = ((e.width || 3) / 2 + 1.5) * T;
          const gTag = { ...tag, gate: e.side };
          const tryAt = (key, inT, side) => {
            for (const extra of [0, 1, 2, 3]) {
              const d = half + extra * T * 0.8;
              const rec = place(key, gx + n[0] * inT * T + t[0] * d * side, gy + n[1] * inT * T + t[1] * d * side, gTag);
              if (rec) return rec;
            }
            return null;
          };
          tryAt('guardPost', 3, 1);
          tryAt('flagpoleRed', 3, -1) || tryAt('bannerPoleBlue', 3, -1);
          tryAt('signpost', 6, -1);
          // outside: beside the road leaving town, a few tiles out
          for (const out of [8, 10, 12]) if (tryAt('milestone', -out, 1)) break;
        }
      }
    }
    // --- the civic fronts: the Society hall, the temples, the library and the barracks
    for (const b of (this.buildings || [])) {
      if (!b || !b.sprite || b.wall || !this._clInCadenceXY || !this._clInCadenceXY(b.x, b.y)) continue;
      const civic = b.singleton === 'guild' || b.temple || b.clSite === 'library' || b.clSite === 'barracks' || b.service === 'guild';
      if (!civic) continue;
      const f = frontOf(b);
      const cTag = { ...tag, civic: b.singleton || b.temple || b.clSite || 'civic' };
      for (const s of [1, -1]) {
        place('flagpoleCity', ...xy(at(b, f, f.step + 40, s * 120)), cTag) ||
          place('flagpoleCity', ...xy(at(b, f, f.step + 70, s * 150)), cTag);
      }
      // ROUND 383 -- ON the wall, not a step out in front of it: "wall banners stand a little out from the wall". They
      // were laid along the doorstep line (the door's step less 14), which is the first STANDABLE ground out from the
      // door -- half a tile and more in front of the wall -- and drawn standing on the ground there. Now the foot is on
      // the wall line itself either side of the door (`_r383WallDoor`, the art's own door base), the sprite lifted up
      // the wall (`lift`) and sorted over its own building. The doorstep keep-out is the same as before.
      const wd = this._r383WallDoor(b);
      for (const s of [1, -1]) {
        if (wd) {
          // along the wall: square to the door's direction, a little in so the foot is inside the wall's line
          const px = -wd.dy, py = wd.dx;
          const x = wd.x + px * s * 52 - wd.dx * 4, y = wd.y + py * s * 52 - wd.dy * 4;
          const rec = hang('bannerWall', x, y, { ...cTag, wall: true, lift: 22 }, b, null);
          if (rec) continue;
        }
        hang('bannerWall', ...xy(at(b, f, f.step - 14, s * 80)), cTag, b, f.door);
      }
      if (b.singleton === 'guild' || b.service === 'guild') {
        place('guildStandard', ...xy(at(b, f, f.step + 46, 76)), cTag) || place('guildStandard', ...xy(at(b, f, f.step + 46, -76)), cTag);
      }
      if (b.clSite === 'barracks') place('stocks', ...xy(at(b, f, f.step + 90, 140)), cTag);
    }
    // --- the estates' gardens: a birdbath, a flower bed, a rose trellis
    const E = CADENCE_DISTRICTS && CADENCE_DISTRICTS.estates;
    if (E) {
      const ec = this._clAt((E.x0 + E.x1) / 2, (E.y0 + E.y1) / 2);
      ring('birdbath', ec.x, ec.y, [2, 4, 6, 8, 10], 0.2, { ...tag, garden: true }, 16);
      ring('birdbath', ec.x, ec.y, [12, 14, 16], 2.9, { ...tag, garden: true }, 16);
      ring('flowerBed', ec.x, ec.y, [4, 6, 8, 10], 1.7, { ...tag, garden: true }, 16);
    }
  },

  _cityPropNearR381(x, y, r, key) {
    for (const o of (this.cityProps || [])) if (o.prop === key && Math.hypot(o.x - x, o.y - y) < r) return true;
    return false;
  },
};

function xy(p) { return [p.x, p.y]; }
