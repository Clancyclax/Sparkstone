// ============================================================================
// ROUND 416 -- THE GRID CITIES, LIVED IN: THE SCENE SIDE. The rules are src/data/gridLife.js.
//
// Wired in at six places, each a one-line call that does nothing if this file is absent:
//
//   _buildCityProps  -> _glProps(stallAt)     the market square's stalls (item 8.2)
//   _r381Props       -> _glDress(...)         the square, the market's podium and bunting, the kerbs, the gates, the
//                                             civic fronts, the estates' gardens, the slums' clutter (items 8.1, 8.5)
//   after the bookshops -> _glDives()         a dive tavern in each slum (item 8.5)
//   after _buildCityLife -> _buildGridLife()  the district walkers, the adventurers' parties, the wagons (8.4, 9)
//   _cityLifeTick    -> _gridLifeTick(dt)     moving them
//   the rooms        -> _clLayoutGeneric / _clFurnishGeneric / _clRoomTick: the dives' insides and their patrons
//
// The people and the parties are drawn only near the player (GL_DRAW_RADIUS) and exist everywhere else as a few
// numbers, the same discipline as every other crowd in the game: a city full of people costs only the screen you are
// standing in. The wagons go on cityLifeMixin's own list (`_clWagons`), so they are drawn and driven by the same code
// as Cadence's.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove, moveFromFacing } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { REGIONS, regionPoint } from '../data/regions.js';
import { isCarriagewayTile, isWaterTile } from '../data/town.js';
import { VEHICLE_BY_ID } from '../data/vehicles.js';
import { CITY_PROP_ART_R381 as ART, CITY_PROPS_R381 as DEFS } from '../data/cityProps.js';
import { CITYLIFE_FRAMES } from '../data/cityLifeArt.js';
import { HOUSE_LAYOUTS } from '../data/interiors.js';
import {
  rngOf, hashStr, marketStallSpots, marketCentre, marketAisles, slumBlocks, GL_SLUM_PROPS, GL_SLUM_PROPS_PER_BLOCK,
  GL_DIVES_MAX, GL_DIVE_NAMES, GL_FOLK, GL_FOLK_NAME, GL_FOLK_LINES, folkCountFor, GL_WALK_SPEED, GL_STAND, GL_DRAW_RADIUS,
  patrolPlan, GL_ADV_MODELS, GL_ADV_RANKS, GL_ADV_LINES, GL_PATROL_SPEED, GL_BROWSE_S, GL_HUNT_S,
  GL_WAGONS, GL_WAGON_ROAD_REACH, GL_WAGON_SPEED, gridStreetGraph, spliceOnAvenue, streetPath, walkAt,
  GL_MARKET_MAX, GL_DIVE_PATRONS, GL_DIVE_LINES, GL_KERB_KINDS, glKerbCap,
} from '../data/gridLife.js';

const CL_ART_LOCAL = { key: 'cityLife', cell: 80, scale: 1.95, footX: 0.5, footY: 0.94 };

export const GridLifeMixin = {
  /** Every grid city, with its plan record and the helpers the passes share. */
  _glCities() {
    const out = [];
    for (const region of REGIONS) {
      for (const st of (region.settlements || [])) {
        if (!this._isGridCity || !this._isGridCity(st) || st.bandit) continue;
        const g = this._gridPlans && this._gridPlans[st.id];
        if (!g || !g.plan) continue;
        const W = (x, y) => ({ x: (g.ctx + x + 0.5) * TILE, y: (g.cty + y + 0.5) * TILE });
        const big = (g.plan.half || 0) >= 150;
        out.push({ region, st, g, plan: g.plan, W, big });
      }
    }
    return out;
  },
  /** Does this grid city lay its own market (so the old row through the square is skipped)? */
  _glOwnsMarket(st) {
    return !!(this._isGridCity && this._isGridCity(st) && this._gridPlans && this._gridPlans[st.id] && this._gridPlans[st.id].plan.marketSquare);
  },

  // ------------------------------------------------------------------------------------------- 8.2 the market
  _glProps(stallAt) {
    const census = (this._glCensus = this._glCensus || {});
    for (const c of this._glCities()) {
      const sq = c.plan.marketSquare;
      if (!sq) continue;
      const spots = marketStallSpots(sq).slice(0, GL_MARKET_MAX);
      const tr = {};
      let n = 0;
      for (const s of spots) {
        const w = c.W(s.x, s.y);
        const rec = stallAt(s.trade, n, w.x, w.y, { settlement: c.st.id, market: true, glMarket: true });
        if (!rec) continue;
        n++;
        tr[s.trade] = (tr[s.trade] || 0) + 1;
      }
      (census[c.st.id] = census[c.st.id] || {}).stalls = n;
      census[c.st.id].trades = tr;
    }
  },

  // ------------------------------------------------------------------------------- 8.1 / 8.5 the dressing
  _glDress(place, hang, ring, frontOf, at, roadNear) {
    const census = (this._glCensus = this._glCensus || {});
    const T = TILE;
    const tileAt = (x, y) => this._tileTypeAt(Math.floor(x / T), Math.floor(y / T));
    // CITYLIFE frames (laundry, posters), hung directly as cityLifeMixin's `hang` does
    const clHang = (name, x, y, tag = {}) => {
      const f = CITYLIFE_FRAMES[name];
      if (f === undefined || !this.textures.exists(CL_ART_LOCAL.key) || this._isWaterAt(x, y)) return null;
      if (isCarriagewayTile(tileAt(x, y))) return null;
      for (const o of this.cityProps) if (Math.abs(o.x - x) < 24 && Math.abs(o.y - y) < 24 && Math.hypot(o.x - x, o.y - y) < 20) return null;
      if (this._collidesObstacle(x, y, 4)) return null;
      const rec = { x, y, sprite: null, sheet: CL_ART_LOCAL.key, art: CL_ART_LOCAL, frame: f, radius: 0, solid: false, cityProp: true, clutter: true, cl: name, ...tag };
      this.cityProps.push(rec);
      return rec;
    };
    for (const c of this._glCities()) {
      const { st, plan, W } = c;
      const tag = { settlement: st.id, glDress: true };
      const k = (census[st.id] = census[st.id] || {});
      const count = (key, rec) => { if (rec) k[key] = (k[key] || 0) + 1; return rec; };
      const rng = rngOf(`gl|dress|${st.id}`);
      // --- the plaza: flags, the bell, the vane, benches, beds, the boards, the statue, the stocks, the bollards
      const sq = W(0, 0);
      const civ = { ...tag, square: true };
      count('square', ring('flagpoleCity', sq.x, sq.y, [12, 14, 16], Math.PI * 0.25, civ, 16));
      count('square', ring('flagpoleCity', sq.x, sq.y, [12, 14, 16], Math.PI * 1.25, civ, 16));
      count('square', ring('bannerPoleGreen', sq.x, sq.y, [11, 13, 15], Math.PI * 0.75, civ, 16));
      count('square', ring('bannerPoleBlue', sq.x, sq.y, [11, 13, 15], Math.PI * 1.75, civ, 16));
      count('square', ring('bellPost', sq.x, sq.y, [9, 11, 13], Math.PI * 0.5, civ, 16));
      count('square', ring('weatherVane', sq.x, sq.y, [14, 16, 18], Math.PI * 1.5, civ, 16));
      count('square', ring('noticeBoard', sq.x, sq.y, [8, 10, 12], Math.PI * 1.0, civ, 16));
      count('square', ring('wantedPillar', sq.x, sq.y, [10, 12, 14], Math.PI * 0.1, civ, 16));
      count('square', ring('knightStatue', sq.x, sq.y, [16, 18, 20], Math.PI * 0.9, civ, 16));
      count('square', ring('stocks', sq.x, sq.y, [17, 19, 21], Math.PI * 0.6, civ, 16));
      count('square', ring('guardPost', sq.x, sq.y, [15, 17, 19], Math.PI * 1.9, civ, 16));
      for (let i = 0; i < 6; i++) count('square', ring(i % 2 ? 'benchBacked' : 'benchStone', sq.x, sq.y, [7, 9, 11], i * Math.PI / 3 + 0.3, civ, 16));
      for (let i = 0; i < 2; i++) count('square', ring('flowerBed', sq.x, sq.y, [9, 11, 13], i * Math.PI + 1.3, civ, 16));
      for (let i = 0; i < 4; i++) count('square', ring('bollardsChain', sq.x, sq.y, [13, 15, 17], i * Math.PI / 2 + 0.8, civ, 16));
      // --- the market: the crier's podium in the lattice's open middle, flower carts and bunting round the edge
      const ms = plan.marketSquare;
      if (ms) {
        const mTag = { ...tag, market: true };
        const mc = marketCentre(ms), w = W(mc.x, mc.y);
        count('market', ring('criersPodium', w.x, w.y, [0, 1, 2], 0.4, mTag, 8));
        const edge = [];
        for (let x = ms.x0 + 1; x <= ms.x1 - 1; x += 4) { edge.push([x, ms.y0 + 1]); edge.push([x, ms.y1 - 1]); }
        for (let y = ms.y0 + 5; y <= ms.y1 - 5; y += 4) { edge.push([ms.x0 + 1, y]); edge.push([ms.x1 - 1, y]); }
        let carts = 0, bunting = 0, boards = 0;
        for (const [x, y] of edge) {
          const p = W(x, y), r = rng();
          if (carts < 3 && r < 0.18) { if (place('flowerCart', p.x, p.y, mTag)) carts++; }
          else if (bunting < 8 && r < 0.6) { if (place('buntingPosts', p.x, p.y, mTag)) bunting++; }
          else if (boards < 4) { if (place('sandwichBoard', p.x, p.y, mTag)) boards++; }
        }
        Object.assign(k, { carts, bunting, boards });
        count('market', ring('noticeBoard', w.x, w.y, [3, 4], 2.2, mTag, 12));
        count('market', ring('waterTrough', w.x, w.y, [3, 4], 4.0, mTag, 12));
      }
      // --- the kerbs: paving with a street beside it, every few tiles, the city over
      {
        const H = plan.half;
        const cands = [];
        for (let y = -H + 2; y <= H - 2; y += 3) {
          for (let x = -H + 2; x <= H - 2; x += 3) {
            if (Math.abs(x) < 27 && Math.abs(y) < 27) continue;   // the plaza is dressed above
            const p = W(x, y);
            const t = tileAt(p.x, p.y);
            if (isCarriagewayTile(t) || isWaterTile(t)) continue;
            if (!roadNear(p.x, p.y, 1)) continue;
            cands.push(p);
          }
        }
        for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
        const cap = glKerbCap(H), laid = [];
        for (const p of cands) {
          if (laid.length >= cap) break;
          if (laid.some(o => Math.abs(o.x - p.x) < 5 * T && Math.abs(o.y - p.y) < 5 * T)) continue;
          const rec = place(GL_KERB_KINDS[laid.length % GL_KERB_KINDS.length], p.x, p.y, { ...tag, kerb: true });
          if (rec) laid.push(rec);
        }
        k.kerb = laid.length;
      }
      // --- the gates: a guard post and a flag inside, a signpost just in, a milestone on the road outside
      {
        const wall = c.g.wall;
        for (const e of (c.g.entries || [])) {
          const along = e.side === 'north' || e.side === 'south';
          const fixed = { north: wall.y0, south: wall.y1, west: wall.x0, east: wall.x1 }[e.side];
          const gp = along ? W(e.at, fixed) : W(fixed, e.at);
          const n = { north: [0, 1], south: [0, -1], west: [1, 0], east: [-1, 0] }[e.side];
          const t = [-n[1], n[0]];
          const half = ((e.width || 4) / 2 + 1.5) * T;
          const gTag = { ...tag, gate: e.side };
          const tryAt = (key, inT, side) => {
            for (const extra of [0, 1, 2, 3]) {
              const d = half + extra * T * 0.8;
              const rec = place(key, gp.x + n[0] * inT * T + t[0] * d * side, gp.y + n[1] * inT * T + t[1] * d * side, gTag);
              if (rec) return rec;
            }
            return null;
          };
          count('gates', tryAt('guardPost', 4, 1));
          count('gates', tryAt('flagpoleRed', 4, -1) || tryAt('bannerPoleBlue', 4, -1));
          count('gates', tryAt('signpost', 7, -1));
          for (const out of [8, 10, 12]) if (count('gates', tryAt('milestone', -out, 1))) break;
        }
      }
      // --- the civic fronts: a flag either side of each temple's and the Society hall's door
      {
        const B = st.bounds, cx = st._centre.x, cy = st._centre.y;
        const inCity = (b) => b.x >= cx + B.x0 * T && b.x <= cx + B.x1 * T && b.y >= cy + B.y0 * T && b.y <= cy + B.y1 * T;
        for (const b of (this.buildings || [])) {
          if (!b || !b.sprite || b.wall || !inCity(b)) continue;
          const civic = b.temple || b.cityTemple || b.singleton === 'guild' || b.service === 'guild' || b.singleton === 'auction';
          if (!civic) continue;
          const f = frontOf(b);
          const cTag = { ...tag, civic: b.temple || b.singleton || 'civic' };
          for (const s of [1, -1]) {
            count('civic', place('flagpoleCity', f.door.x + f.dx * 40 - f.dy * s * 120, f.door.y + f.dy * 40 + f.dx * s * 120, cTag)
              || place('flagpoleCity', f.door.x + f.dx * 70 - f.dy * s * 150, f.door.y + f.dy * 70 + f.dx * s * 150, cTag));
          }
          if (b.singleton === 'guild' || b.service === 'guild') {
            count('civic', place('guildStandard', f.door.x + f.dx * 46 - f.dy * 76, f.door.y + f.dy * 46 + f.dx * 76, cTag));
          }
        }
      }
      // --- the estates' gardens (the aristocracy district): birdbaths, flower beds, rose trellises
      {
        const A = plan.districts && plan.districts.aristocracy;
        if (A) {
          const gTag = { ...tag, garden: true };
          for (let i = 0; i < 10; i++) {
            const x = A.x0 + 6 + rng() * (A.x1 - A.x0 - 12), y = A.y0 + 6 + rng() * (A.y1 - A.y0 - 12);
            const p = W(Math.round(x), Math.round(y));
            count('gardens', ring(['birdbath', 'flowerBed', 'roseTrellis', 'topiaryPot'][i % 4], p.x, p.y, [0, 2, 4, 6], rng() * 6, gTag, 12));
          }
        }
      }
      // --- the slums: clutter on every free patch, laundry across the alleys, posters on the walls
      {
        const slums = slumBlocks(plan);
        st._glSlums = slums;
        let clutter = 0, laundry = 0, posters = 0;
        for (const s of slums) {
          const cands = [];
          for (let y = s.y0 + 1; y <= s.y1 - 1; y += 2) for (let x = s.x0 + 1; x <= s.x1 - 1; x += 2) cands.push(W(x, y));
          for (let i = cands.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [cands[i], cands[j]] = [cands[j], cands[i]]; }
          let n = 0, ln = 0;
          for (const p of cands) {
            if (n >= GL_SLUM_PROPS_PER_BLOCK) break;
            const key = GL_SLUM_PROPS[n % GL_SLUM_PROPS.length];
            if (place(key, p.x, p.y, { ...tag, slum: true })) { n++; continue; }
            // against a wall: laundry strung across, or a poster
            if (ln < 6 && this._collidesObstacle(p.x, p.y, 40) && !this._collidesObstacle(p.x, p.y, 6)) {
              if (clHang(rng() < 0.5 ? 'laundryX' : 'laundryY', p.x, p.y, { slum: true, settlement: st.id })) { ln++; laundry++; continue; }
            }
            if (posters < 4 * slums.length && this._collidesObstacle(p.x, p.y, 34) && !this._collidesObstacle(p.x, p.y, 6)) {
              if (clHang('posterWanted', p.x, p.y, { slum: true, settlement: st.id })) posters++;
            }
          }
          clutter += n;
        }
        Object.assign(k, { slumBlocks: slums.length, slumClutter: clutter, laundry, posters });
      }
    }
  },

  // ------------------------------------------------------------------------------------- 8.5 the dive taverns
  _glDives() {
    const census = (this._glCensus = this._glCensus || {});
    const doorOf = (b) => (this.doorways || []).find(d => d.kind === 'enter' && d.building === b);
    const used = new Set();
    const dives = (this._glDiveList = []);
    for (const c of this._glCities()) {
      const { st, W } = c;
      const slums = st._glSlums || slumBlocks(c.plan);
      const T = TILE;
      const inRect = (b, s) => { const p0 = W(s.x0, s.y0), p1 = W(s.x1, s.y1); return b.x >= p0.x - T && b.x <= p1.x + T && b.y >= p0.y - T && b.y <= p1.y + T; };
      // every house in the slums is a slum house (the walkers' and the census's)
      for (const b of (this.buildings || [])) if (b && b.house && b.settlement === st.id && slums.some(s => inRect(b, s))) b.slum = true;
      let n = 0;
      for (const s of slums) {
        if (n >= GL_DIVES_MAX) break;
        const mid = W((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2);
        let best = null, bd = Infinity;
        for (const b of (this.buildings || [])) {
          if (!b || !b.slum || !b.sprite || b.settlement !== st.id || b.bookshop || b.singleton || b.diveTavern || !inRect(b, s)) continue;
          if ((this._homeSigns || []).some(h => h.b === b)) continue;
          if (!doorOf(b)) continue;
          const d = Math.hypot(b.x - mid.x, b.y - mid.y);
          if (d < bd) { bd = d; best = b; }
        }
        if (!best) continue;
        let i = hashStr(`dive|${st.id}|${n}`) % GL_DIVE_NAMES.length;
        for (let k = 0; k < GL_DIVE_NAMES.length && used.has(GL_DIVE_NAMES[i]); k++) i = (i + 1) % GL_DIVE_NAMES.length;
        used.add(GL_DIVE_NAMES[i]);
        best.diveTavern = { name: GL_DIVE_NAMES[i], settlement: st.id };
        const d = doorOf(best);
        d.enterLabel = d.label = `enter ${GL_DIVE_NAMES[i]}`;
        // the dive's front: a menu board by the door, a dice table out on the step
        const ux = d.x - best.x, uy = d.y - best.y, ul = Math.hypot(ux, uy) || 1;
        const px = -uy / ul, py = ux / ul;
        for (const [key, along, out] of [['menuBoard', 46, 10], ['diceTable', -64, 30], ['mugsAndPlates', -40, 22]]) {
          const def = DEFS[key];
          if (!def) continue;
          const x = d.x + px * along + ux / ul * out, y = d.y + py * along + uy / ul * out;
          if (this._isWaterAt(x, y) || isCarriagewayTile(this._tileTypeAt(Math.floor(x / T), Math.floor(y / T)))) continue;
          if ((this.cityProps || []).some(o => Math.abs(o.x - x) < 22 && Math.abs(o.y - y) < 22)) continue;
          if (this._collidesObstacle(x, y, 4)) continue;
          const rec = { x, y, sprite: null, sheet: ART.key, art: ART, frame: def.idx, radius: 0, solid: false, cityProp: true,
            prop: key, r381: def.cat, scaleMul: def.scale, glDive: best.diveTavern.name, settlement: st.id };
          if (def.flat) { rec.flat = true; rec.squash = def.squash || 1; rec.oy = def.oy; }
          if (this._clFrontBias) rec.depthBias = this._clFrontBias(best, x, y);
          this.cityProps.push(rec);
        }
        dives.push(best);
        n++;
      }
      (census[st.id] = census[st.id] || {}).dives = n;
      census[st.id].slumHouses = (this.buildings || []).filter(b => b && b.slum && b.settlement === st.id).length;
    }
    return dives.length;
  },
  _glDiveLayout(room, b) {
    room._clKind = 'dive';
    room.name = b.diveTavern.name;
    room.blurb = 'Low beams, a sticky floor, and nobody looking at anybody.';
    const tap = (HOUSE_LAYOUTS || []).find(l => l.id === 'taproom') || null;
    if (tap) { room.props = tap.props.map(q => ({ ...q })); room._layoutId = 'taproom'; }
  },
  _glDiveFurnish(room, person) {
    const name = room.name || 'the dive';
    person('npc_bandit_brute', 4, 1, 'south', { name: `${name}'s keeper`, cityLife: 'diveKeep', shopId: 'market_drinks' });
    person('npc_bandit_skinny', 8, 2, 'southwest', { name: 'Sallow Pim, the fence', cityLife: 'fence', shopId: 'market_fence' });
    this._clRoomBucket = null;   // the patrons are stood up on the next tick
  },
  /** The patrons: the same hours as the Tavern's, never fewer than five (a dive is never empty), and none of them
   *  anyone you would leave your purse with. */
  _glFillDive(room, hour, roomPerson, tavernCrowdAt) {
    const n = Math.max(5, tavernCrowdAt(hour));
    const rng = rngOf(`dive|${room.name}|${Math.floor(hour)}|${this._clDay ? this._clDay() : 0}`);
    const spots = [];
    // the whole floor bar the door row: a small house's room is only a few tiles deep
    for (let ty = Math.min(3, Math.max(1, room.h - 4)); ty <= room.h - 2; ty++) for (let tx = 1; tx <= room.w - 2; tx++) spots.push([tx, ty]);
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    let placed = 0;
    for (const [tx, ty] of spots) {
      if (placed >= n) break;
      const facing = ['southeast', 'southwest', 'northeast', 'northwest'][Math.floor(rng() * 4)];
      const model = GL_DIVE_PATRONS[Math.floor(rng() * GL_DIVE_PATRONS.length)];
      const p = roomPerson(room, tx, ty, model, 0, facing,
        { name: 'Patron', cityLife: 'divePatron', line: GL_DIVE_LINES[Math.floor(rng() * GL_DIVE_LINES.length)] });
      if (p) placed++;
    }
    this._glDiveCensus = { placed, want: n };
  },
  _glTalk(npc, say) {
    switch (npc.cityLife) {
      case 'glife': return say(npc.name, `"${npc.line || 'Hm?'}"`);
      case 'divePatron': return say('Patron', `"${npc.line || '...'}"`);
      case 'diveKeep':
        return say(npc.name, '"Drink, or get out. If you\'re here for Pim, he\'s in the corner, and he didn\'t send for you."',
          [{ act: 'city|shop:market_drinks', label: 'Buy a drink' }]);
      case 'fence': return false;   // falls through to the shop
      default: return false;
    }
  },

  // ------------------------------------------------------------------------- 8.4 / 9 the people and the wagons
  _buildGridLife() {
    this._glFolk = [];
    this._glParties = [];
    this._glT = 0;
    const census = (this._glCensus = this._glCensus || {});
    for (const c of this._glCities()) {
      const k = (census[c.st.id] = census[c.st.id] || {});
      try {
        k.folk = this._glBuildFolk(c);
        const G = this._glGraph(c);
        k.parties = this._glBuildParties(c, G);
        k.wagons = this._glBuildWagons(c, G);
      } catch (e) {
        console.warn('[gridLife]', c.st.id, e && e.message);
      }
    }
  },
  _glGraph(c) {
    const G = gridStreetGraph(c.plan, c.g.wall, c.g.entries || []);
    const ms = c.plan.marketSquare;
    if (ms) {
      const aisles = marketAisles(ms);
      const mid = (ms.y0 + ms.y1) / 2;
      const aisle = aisles.slice().sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
      const ay = Math.round(aisle);
      const east = ms.x0 > 0;
      G.market = { door: spliceOnAvenue(G, 0, ay), entry: { x: east ? ms.x0 + 1 : ms.x1 - 1, y: ay }, deep: { x: east ? ms.x1 - 4 : ms.x0 + 4, y: ay } };
    }
    return G;
  },

  /** Walkers: homes scattered over their district (the slums' over the slum blocks, the market's mostly in the square),
   *  each wandering a dozen tiles from home. */
  _glBuildFolk(c) {
    const { st, plan, W } = c;
    const rng = rngOf(`gl|folk|${st.id}`);
    const D = plan.districts || {};
    const groups = [];
    const area = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
    for (const kind of ['housing', 'market', 'temple', 'aristocracy']) {
      const r = D[kind];
      if (r) groups.push({ kind, rects: [r], n: folkCountFor(kind, area(r)) });
    }
    const slums = st._glSlums || slumBlocks(plan);
    if (slums.length) groups.push({ kind: 'slum', rects: slums, n: folkCountFor('slum', slums.reduce((a, s) => a + area(s), 0)) });
    const ms = plan.marketSquare;
    let made = 0;
    for (const gp of groups) {
      for (let i = 0; i < gp.n; i++) {
        let r = gp.rects[i % gp.rects.length];
        if (gp.kind === 'market' && ms && i % 3 !== 2) r = ms;
        let home = null;
        for (let a = 0; a < 14 && !home; a++) {
          const x = r.x0 + 1 + rng() * Math.max(1, r.x1 - r.x0 - 2), y = r.y0 + 1 + rng() * Math.max(1, r.y1 - r.y0 - 2);
          const p = W(x, y);
          if (this._isWaterAt(p.x, p.y) || this._collidesObstacle(p.x, p.y, 14)) continue;
          home = p;
        }
        if (!home) continue;
        const models = GL_FOLK[gp.kind], names = GL_FOLK_NAME[gp.kind], lines = GL_FOLK_LINES[gp.kind];
        const artKey = models[Math.floor(rng() * models.length)];
        if (!NPC_ART[artKey]) continue;
        const roam = (gp.kind === 'slum' ? 7 : gp.kind === 'market' ? 9 : 12) * TILE;
        const pr = W(r.x0, r.y0), pr1 = W(r.x1, r.y1);
        this._glFolk.push({
          city: st.id, kind: gp.kind, artKey, name: names[Math.floor(rng() * names.length)], line: lines[Math.floor(rng() * lines.length)],
          home, roam, box: { x0: Math.min(pr.x, pr1.x), y0: Math.min(pr.y, pr1.y), x1: Math.max(pr.x, pr1.x), y1: Math.max(pr.y, pr1.y) },
          x: home.x, y: home.y, to: null, wait: rng() * 4, facing: 'south', moving: false, sprite: null,
          owl: gp.kind === 'slum' ? 0.8 : rng() * 0.6, rng: rngOf(`gl|walker|${st.id}|${gp.kind}|${i}`),
          cityLife: 'glife', glife: true, noDot: true,
        });
        made++;
      }
    }
    return made;
  },

  /** Adventurers: lone ones and teams, on a loop that runs from outside one gate, through the city to the market's
   *  weapons and armour (the gear-seekers) or the plaza (the hunters), and out of another gate to the road beyond. */
  _glBuildParties(c, G) {
    const { st, W } = c;
    if (!G.gates.length) return 0;
    const plan = patrolPlan(st.id, c.big);
    const rng = rngOf(`gl|parties|${st.id}`);
    let made = 0;
    plan.forEach((pp, i) => {
      const gA = G.gates[i % G.gates.length], gB = G.gates[(i + 1) % G.gates.length];
      let pts = [], stops = {};
      if (pp.purpose === 'gear' && G.market && G.market.door !== null) {
        const a = streetPath(G, gA.outN, G.market.door);
        const b = streetPath(G, G.market.door, gB.outN);
        if (!a || !b) return;
        pts = [...a, G.market.entry, G.market.deep];
        stops[pts.length - 1] = GL_BROWSE_S;
        // and back out the way they came in, on to the other gate
        pts.push(G.market.entry, ...b);
      } else {
        const hub = G.node(G.P, 0);
        const a = streetPath(G, gA.innerN, hub);
        const b = streetPath(G, hub, gB.outN);
        if (!a || !b) return;
        pts = [...a, ...b.slice(1)];
        stops[a.length - 1] = 6;
      }
      // beyond the far gate, out on the road: the hunt
      const last = pts[pts.length - 1], prev = pts[pts.length - 2] || last;
      const dx = Math.sign(last.x - prev.x), dy = Math.sign(last.y - prev.y);
      pts.push({ x: last.x + dx * 14, y: last.y + dy * 14 });
      stops[pts.length - 1] = pp.purpose === 'hunt' ? GL_HUNT_S : GL_HUNT_S / 2;
      const world = pts.map(p => W(p.x, p.y));
      const members = [];
      for (let m = 0; m < pp.size; m++) {
        const artKey = GL_ADV_MODELS[Math.floor(rng() * GL_ADV_MODELS.length)];
        const rank = GL_ADV_RANKS[Math.floor(rng() * GL_ADV_RANKS.length)];
        const nm = this._uniqueVillagerName ? this._uniqueVillagerName(`gl|adv|${st.id}|${i}|${m}`) : `Adventurer ${m + 1}`;
        const lines = GL_ADV_LINES[pp.purpose];
        members.push({ artKey, name: `${rank} ${nm}`, line: lines[(i + m) % lines.length], sprite: null, x: world[0].x, y: world[0].y,
          facing: 'south', cityLife: 'glife', glife: true, glAdv: true, noDot: true, k: m });
      }
      this._glParties.push({ city: st.id, purpose: pp.purpose, size: pp.size, pts: world, stops, members, phase: rng() * 400, speed: GL_PATROL_SPEED });
      made++;
    });
    return made;
  },

  /** The wagons: road -> gate -> through the city -> gate -> road, there and back, on cityLifeMixin's list. */
  _glBuildWagons(c, G) {
    const { st, region, W } = c;
    if (!G.gates.length) return 0;
    const n = c.big ? GL_WAGONS.big : GL_WAGONS.small;
    const roads = this._gridCityRoads ? this._gridCityRoads(region) : (region.roads || []);
    const cx = st._centre.x, cy = st._centre.y;
    // the road leaving a gate, from the gate outward, as world points
    const roadOut = (gate) => {
      const o = W(gate.out[0], gate.out[1]);
      let best = null;
      for (const road of roads) {
        const pts = (road.points || []).map(p => regionPoint(region, p));
        pts.forEach((p, i) => {
          const d = Math.hypot(p.x - o.x, p.y - o.y);
          if (d < 20 * TILE && (!best || d < best.d)) best = { pts, i, d };
        });
      }
      if (!best) return [];
      const { pts, i } = best;
      const away = (j) => Math.hypot(pts[j].x - cx, pts[j].y - cy);
      // which way is out: toward the road's far end (a road wiggles, so the next point can be nearer the centre)
      const dir = away(pts.length - 1) >= away(0) ? 1 : -1;
      const out = [];
      let len = 0;
      for (let j = i + dir; j >= 0 && j < pts.length && len < GL_WAGON_ROAD_REACH * TILE; j += dir) {
        const prev = out.length ? out[out.length - 1] : o;
        len += Math.hypot(pts[j].x - prev.x, pts[j].y - prev.y);
        out.push(pts[j]);
      }
      return out;
    };
    const kinds = [['wagon_wood', 'asbuilt'], ['wagon_metal', 'asbuilt'], ['wagon_wood', 'amber'], ['wagon_metal', 'verdigris']];
    this._clWagons = this._clWagons || [];
    let made = 0;
    for (let i = 0; i < n; i++) {
      const gA = G.gates[i % G.gates.length];
      const gB = G.gates.length > 1 ? G.gates[(i + 1) % G.gates.length] : null;
      let inner = gB ? streetPath(G, gA.outN, gB.outN) : (G.market ? streetPath(G, gA.outN, G.market.door) : null);
      if (!inner || inner.length < 2) continue;
      const path = [...roadOut(gA).reverse(), ...inner.map(p => W(p.x, p.y)), ...(gB ? roadOut(gB) : [])];
      let len = 0;
      for (let j = 1; j < path.length; j++) len += Math.hypot(path[j].x - path[j - 1].x, path[j].y - path[j - 1].y);
      const [vid, colour] = kinds[(i + hashStr(st.id)) % kinds.length];
      const v = VEHICLE_BY_ID[vid];
      if (!v || len < 20 * TILE) continue;
      this._clWagons.push({ route: { path, len }, vid, colour, art: v.art, move: v.move, speed: GL_WAGON_SPEED + (i % 3) * 20,
        phase: ((i * 0.37) + (hashStr(st.id) % 100) / 100) % 1, sprite: null, glow: null, city: st.id, glWagon: true });
      made++;
    }
    return made;
  },

  // ------------------------------------------------------------------------------------- ROUND 418: temple doors
  /**
   * "Please add doors for all temples." The grid cities' temples were placed (round 188) with no room behind them;
   * Cadence's eight each have one (interiors.js TEMPLE_ROOMS). Every grid-city temple now gets a door into its god's
   * temple room -- the same room Cadence's temple of that god opens on, so the god, the priests, the pews and the holy
   * days are all there -- and the way out leads back to the door you came in by (`_glTempleExit`, on every entry).
   * The door is the art's own (round 417's door base, south face), the doorstep the first clear ground in front of it.
   * Runs right after `_buildInteriors`, so the footprint pass that follows keeps every doorstep clear.
   */
  _glTempleDoors(doorReach) {
    const census = (this._glCensus = this._glCensus || {});
    let n = 0;
    for (const b of (this.buildings || [])) {
      if (!b || !b.cityTemple || !b.sprite || b._hasRoom) continue;
      const god = b.cityTemple;
      const room = (this.doorways || []).find(d => d.kind === 'enter' && d.room && d.room.templeGod === god && !d.gridTemple);
      const exit = room && (this.doorways || []).find(d => d.kind === 'exit' && d.room === room.room);
      if (!room || !exit) continue;
      const ad = this._artDoor ? this._artDoor(b) : null;
      if (!ad) continue;
      const dir = moveFromFacing(ad.facing || 'south') || { dx: 1, dy: 1 };
      let outAt = { x: ad.x, y: ad.y };
      for (const push of [96, 72, 56]) {
        const c = { x: ad.x + dir.dx * push, y: ad.y + dir.dy * push };
        if (!this._collidesObstacle(c.x, c.y, 14) && !this._isWaterAt(c.x, c.y)) { outAt = c; break; }
      }
      b._hasRoom = true;
      this.doorways.push({ kind: 'enter', room: room.room, x: ad.x, y: ad.y, radius: doorReach, label: room.label,
        to: { ...room.to }, gridTemple: b.settlement, building: b, outAt });
      const k = (census[b.settlement] = census[b.settlement] || {});
      k.templeDoors = (k.templeDoors || 0) + 1;
      n++;
    }
    return n;
  },
  /** Coming into a temple room by any door: the room's way out leads back to that door. */
  _glTempleExit(d) {
    if (!d || d.kind !== 'enter' || !d.room || !d.room.templeGod) return;
    const exit = (this.doorways || []).find(q => q.kind === 'exit' && q.room === d.room);
    if (!exit) return;
    if (!d.room._homeExit) d.room._homeExit = { ...exit.to };   // Cadence's, kept the first time
    exit.to = d.gridTemple ? { ...d.outAt } : { ...d.room._homeExit };
  },

  // ------------------------------------------------------------------------------------------------- the tick
  _gridLifeTick(dt) {
    if (!this._glFolk || !this.world) return;
    this._glT = (this._glT || 0) + dt;
    const px = this.world.x, py = this.world.y;
    const inside = !!this._insideRoom;
    const hour = this._hourOfDay ? this._hourOfDay() : 12;
    const night = hour >= 23 || hour < 5;
    const R = GL_DRAW_RADIUS;
    // the walkers
    for (const e of this._glFolk) {
      const near = !inside && Math.abs(e.x - px) < R && Math.abs(e.y - py) < R && Math.hypot(e.x - px, e.y - py) < R;
      const out = !night || e.owl > 0.55;
      if (!near || !out) { if (e.sprite) this._glHide(e); continue; }
      this._glWalk(e, dt);
      if (!e.sprite) this._glShow(e);
      this._glPlace(e, dt);
    }
    // the parties
    for (const pty of (this._glParties || [])) {
      const at = walkAt(pty.pts, pty.speed, pty.stops, this._glT + pty.phase);
      const L = Math.hypot(at.dx, at.dy) || 1;
      const ux = at.dx / L, uy = at.dy / L;
      const facing = facingFromMove(at.dx, at.dy) || 'south';
      for (const m of pty.members) {
        const k = m.k;
        const back = k ? 30 * Math.ceil(k / 2) : 0, side = k ? (k % 2 ? 18 : -18) : 0;
        m.x = at.x - ux * back - uy * side; m.y = at.y - uy * back + ux * side;
        m.facing = facing; m.moving = at.moving;
        const near = !inside && Math.hypot(m.x - px, m.y - py) < R;
        if (!near) { if (m.sprite) this._glHide(m); continue; }
        if (!m.sprite) this._glShow(m);
        this._glPlace(m, dt);
      }
    }
  },
  _glWalk(e, dt) {
    if (e.wait > 0) { e.wait -= dt; e.moving = false; return; }
    if (!e.to) {
      for (let a = 0; a < 6 && !e.to; a++) {
        const th = e.rng() * Math.PI * 2, r = e.roam * Math.sqrt(e.rng());
        const x = Math.max(e.box.x0, Math.min(e.box.x1, e.home.x + Math.cos(th) * r));
        const y = Math.max(e.box.y0, Math.min(e.box.y1, e.home.y + Math.sin(th) * r));
        if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 12)) continue;
        e.to = { x, y };
      }
      if (!e.to) { e.wait = 1.5; return; }
    }
    const dx = e.to.x - e.x, dy = e.to.y - e.y, d = Math.hypot(dx, dy);
    const step = GL_WALK_SPEED * dt;
    if (d <= step) {
      e.x = e.to.x; e.y = e.to.y; e.to = null; e.moving = false;
      e.wait = GL_STAND[0] + e.rng() * (GL_STAND[1] - GL_STAND[0]);
      return;
    }
    const nx = e.x + dx / d * step, ny = e.y + dy / d * step;
    if (this._collidesObstacle(nx, ny, 10) || this._isWaterAt(nx, ny)) { e.to = null; e.wait = 0.6; e.moving = false; return; }
    e.x = nx; e.y = ny; e.moving = true;
    e.facing = facingFromMove(dx, dy) || e.facing;
  },
  _glShow(e) {
    const art = NPC_ART[e.artKey];
    if (!art || !this.textures.exists(e.artKey)) return;
    const p = isoProject(e.x, e.y);
    const sp = this.add.sprite(p.x, p.y, e.artKey, dirRow(e.facing || 'south'));
    sp.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sp.setScale(art.scale || 1);
    sp.setDepth(isoDepth(e.x, e.y));
    e.sprite = sp;
    this.npcs.push(e);
  },
  _glHide(e) {
    if (e.sprite) { e.sprite.destroy(); e.sprite = null; }
    const i = this.npcs.indexOf(e);
    if (i >= 0) this.npcs.splice(i, 1);
  },
  _glPlace(e, dt) {
    if (!e.sprite) return;
    const p = isoProject(e.x, e.y);
    e.sprite.setPosition(p.x, p.y).setDepth(isoDepth(e.x, e.y));
    if (this._npcWalkFrame) this._npcWalkFrame(e, e.artKey, e.facing, e.moving, dt);
  },

  /** For the suite and the notes: what each city has. */
  _gridLifeCensus() {
    const out = {};
    for (const [id, k] of Object.entries(this._glCensus || {})) out[id] = { ...k };
    for (const e of (this._glFolk || [])) { const k = (out[e.city] = out[e.city] || {}); k.byKind = k.byKind || {}; k.byKind[e.kind] = (k.byKind[e.kind] || 0) + 1; }
    for (const p of (this._glParties || [])) { const k = out[p.city]; k.adventurers = (k.adventurers || 0) + p.size; k.solo = (k.solo || 0) + (p.size === 1 ? 1 : 0); k.teams = (k.teams || 0) + (p.size > 1 ? 1 : 0); }
    return out;
  },
};
