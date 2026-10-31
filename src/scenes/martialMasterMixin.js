// ============================================================================
// ROUND 398 -- THE MARTIAL MASTERS.
//
//   "The martial arts should be super varied and which ones happen to be available in a run should be random and
//    searching for a specific one requires either finding a master or checking the auction house and sales people
//    repeatedly."
//
// Every settlement has a place a master could stand (one entry each, built with the road priests and drawn the same
// lazy way: no sprite until it is on screen). Which TEN of them are there this run, and the art each teaches, come
// from the run's seed (martialArts.js `martialMasters`); a loaded save brings its own seed, so the masters move with
// it (`_mastersRefresh`, checked every martial tick). A master teaches one art of the run's pool: he sells you its
// manual, at half again the bookseller's price, and you read it in the rite as any other. He also names one other
// master and where to find them, so one master leads to the next.
//
// ROUND 399 -- AND A BODY OF THEIR OWN (Desktop\new-assets\martial-masters, MASTERS_BRIEF.md). Twelve masters now, each
// one of eight characters (monk, battlemage, knight, barbarian, wildwoman, witch, samurai, adventurer) in the stance of
// the art they teach -- its weapon, a shield, or flames for an element -- and dyed in one of 20+ mixed palettes (an
// element's own colours for an element's master: masterArt.js). The sheets load and are dyed only for a master near the
// player (`_masterTex`), one canvas per character x stance x palette x sheet. A master stands, drills a kata now and
// then (the Attack), and paces a few steps and back (the Running); turns to face you when you come close. The flames
// stance wears hand flames of its element's colour the whole time ("the sprite's own flames drop off after the attack
// burst"). The Death sheets are not shipped: a master is never fought.
//
// ROUND 400 -- WHERE THEY STAND, AND WHAT THEY TEACH. "Masters may be outside of cities, in the wilds, or in the deep
// wilds randomly scattered throughout the map." Every hamlet, village and ruin has a spot, and every region has
// WILD_SPOTS spots in its wilds (a third to two thirds of the way out from its arrival) and as many in its deep wilds
// (the outer reaches); each knows the rank of the country around it (the region's spawn bands at that distance). The
// run's twelve masters take a third from each kind. A GREAT MASTER of the player's own style is added once they
// follow one (martialArts.js `greatMaster`: iron to gold country, gold only in the south), and "adventure officials
// may occasionally send you the location": a Society runner finds you on a quiet day and the place goes on the map.
// A master of your own style sets your training for your rank (martialMastery.js); a master of another sells their
// manual, as before. Talking to a master also puts the master they name on your map.
//
// DOJOS. The user: "The masters exist even outside the region. Remember that every square on the world map generates a
// smaller region based on the terrain if the player wants to explore. Now masters can spawn in dojos isolated in their
// locations." So the overworld's generated squares are places too (`_dojoPlaces`: land squares outside the named
// regions, north and south; their rank is the square's). A master given a dojo square has no body until the party
// enters that square: then a lone hall is raised somewhere clear of the towns and the master stands at its door
// (`_placeSquareDojo`); leaving the square takes them down again. A known dojo is marked on the overworld map.
// ============================================================================
import { REGIONS, regionPoint, dangerFraction, REGION_TILES, regionOrigin } from '../data/regions.js';
import { stableHash } from '../data/awakening.js';
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { MASTER_SHEETS } from '../data/masterManifest.js';   // ROUND 399
import { dyeMasterPixels } from '../data/masterArt.js';
import { PLAYER_DIR_ORDER } from '../data/playerAnim.js';
import { MARTIAL_BY_ID, artCard, martialMasters, greatMaster, MASTER_PRICE_MULT } from '../data/martialArts.js';
import { masteryRecord, masteryState, trialSteps, trialDone, stepDone, rankLabel, VISIT_RADIUS } from '../data/martialMastery.js';   // ROUND 400
import { monsterKeysAtTier, MONSTER_TYPES } from '../data/monsters.js';
import { OW_SQUARE, OW_REGIONS, sheetOf, squareRank, squareName, squareStats, namedRegionAt, sqColsOf, sqRowsOf, squareBox } from '../data/overworld.js';   // ROUND 400 -- dojos
import { genRng } from '../data/overworldGen.js';
import { RANK_ORDER } from '../data/ranks.js';
import { DOJO_KEYS } from '../data/structureArt.js';   // ROUND 400 -- the four dojo halls
import { isCarriagewayTile } from '../data/town.js';
import { BESTIARY_FAMILY_INFO } from '../data/bestiary.js';
import { monsterLabelFor } from '../data/quests.js';
import { martialBook, MARTIAL_BOOK_PRICE, skillBooksOf } from '../data/skillBooks.js';
import { spendCoins, coinPurseValue } from '../data/inventory.js';
import { masterLesson, masterGift, masterPhilosophy, artTheme, lessonRankOf, inWindow, LESSON_RANK_NAMES } from '../data/masterQuests.js';   // ROUND 401/402 -- a master's lessons
import { grantLootToPlayer } from '../data/loot.js';

export const MASTER_PRICE = Math.round(MARTIAL_BOOK_PRICE * MASTER_PRICE_MULT);
const MASTER_DRAW_RANGE = 1100;     // world px: a master farther than this has no sprite
const MASTER_TEX_KEEP = 24;         // dyed sheets kept (the twelve masters, three sheets each, near ones only)
const KATA_FPS = 11, RUN_FPS = 12, PACE_SPEED = 70, PACE_RANGE = 2.2 * TILE;
const FACE_PLAYER_R = 150;
/** stableHash's low bits barely move between neighbouring strings; this spreads them before a modulo. */
const mixH = (h) => { h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
const WILD_SPOTS = 8;               // per region, in the wilds and again in the deep wilds
const CHAMPION_WAKE_R = 1300;       // a trial's champion is put out when the player comes this close
const RUNNER_CHANCE = 0.45;         // a quiet day's chance that the Society's runner finds you
const COMPASS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];

export const MartialMasterMixin = {
  /** Every place a master may stand (hidden until the run's seed puts one there): the hamlets, villages and ruins,
   *  and WILD_SPOTS spots in each region's wilds and deep wilds. */
  _buildMartialMasters() {
    this.martialMasters = [];
    const add = (x, y, region, cls, place, key, tier) => {
      const h = stableHash(`master|${key}`);
      const entry = {
        sprite: null, x, y, homeX: x, homeY: y, siteX: x, siteY: y, facing: 'south', name: 'A martial master', shopId: null, dialogue: null,
        martialMaster: true, settlement: key, key, cls, place, settlementName: place, regionId: region.id,
        regionName: region.name, tier, south: region.row >= 2,
        hidden: true, art: null, look: null,
        act: { mode: 'idle', t: 2 + (h % 500) / 100, f: 0, ft: 0, to: null, back: false },
        paceAngle: ((h >>> 9) % 360) * Math.PI / 180,
      };
      this.npcs.push(entry);
      this.martialMasters.push(entry);
    };
    const tierAt = (region, x, y) => {
      const d = dangerFraction(region, x, y);
      let t = 0;
      for (const g of (region.spawnGroups || [])) if (d >= (g.from || 0)) t = Math.max(t, g.tier || 0);
      return Math.max(1, Math.min(4, t));
    };
    const clear = (x, y) => !this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 16);
    for (const region of REGIONS) {
      const towns = (region.settlements || []).map(st => ({ st, c: regionPoint(region, st.at) }));
      for (const { st, c } of towns) {
        if (st.kind === 'city' || st.kind === 'town') continue;   // "outside of cities"
        const h = stableHash(`master|${region.id}|${st.id}`);
        const r = Math.max(TILE * 4, (st.radius || 9) * TILE * 0.35);
        const th = ((h % 360) * Math.PI / 180) + Math.PI;   // across the square from the town priest
        let x = c.x + Math.cos(th) * r, y = c.y + Math.sin(th) * r;
        for (let a = 0; a < 10 && !clear(x, y); a++) {
          const t2 = th + a * 0.7;
          x = c.x + Math.cos(t2) * (r + TILE * (1 + a * 0.3)); y = c.y + Math.sin(t2) * (r + TILE * (1 + a * 0.3));
        }
        if (!clear(x, y)) continue;
        add(x, y, region, 'village', st.name, st.id, tierAt(region, x, y));
      }
      // the wilds and the deep wilds
      const nearestTown = (x, y) => {
        let best = null, bd = Infinity;
        for (const t of towns) { const d = Math.hypot(t.c.x - x, t.c.y - y); if (d < bd) { bd = d; best = t; } }
        return best;
      };
      for (const [cls, lo, hi] of [['wild', 0.3, 0.65], ['deep', 0.7, 0.97]]) {
        let made = 0;
        for (let i = 0; made < WILD_SPOTS && i < WILD_SPOTS * 40; i++) {
          const hh = mixH(stableHash(`masterwild|${region.id}|${cls}|${i}`));
          const tx = 60 + (hh % (REGION_TILES - 120)), ty = 60 + ((hh >>> 11) % (REGION_TILES - 120));
          const { x, y } = regionPoint(region, { tx, ty });
          const d = dangerFraction(region, x, y);
          if (d < lo || d > hi) continue;
          if (!clear(x, y)) continue;
          if ((this._inAnySettlement && this._inAnySettlement(x, y)) || (this._inGridCity && this._inGridCity(x, y, 6))) continue;
          try { if (this._elev && Math.abs(this._elev.height(x, y)) > 0.01) continue; } catch (e) { /* flat */ }
          if (this.martialMasters.some(m => Math.hypot(m.x - x, m.y - y) < TILE * 40)) continue;
          const nt = nearestTown(x, y);
          let place;
          if (nt) {
            const ang = Math.atan2(y - nt.c.y, x - nt.c.x);
            const dir = COMPASS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
            place = cls === 'deep' ? `the deep wilds ${dir} of ${nt.st.name} (${region.name})` : `the wilds ${dir} of ${nt.st.name} (${region.name})`;
          } else place = cls === 'deep' ? `the deep wilds of ${region.name}` : `the wilds of ${region.name}`;
          add(x, y, region, cls, place, `${region.id}:${cls}:${i}`, tierAt(region, x, y));
          made++;
        }
      }
    }
    for (const d of this._dojoPlaces()) add(null, null, { id: d.region, name: d.regionName, row: d.south ? 2 : 0 }, 'dojo', d.place, d.key, d.tier);
    for (const e of this.martialMasters) if (e.cls === 'dojo') {
      const d = this._dojoPlaceCache.find(q => q.key === e.key);
      Object.assign(e, { sheet: d.sheet, sx: d.sx, sy: d.sy, south: d.south, inSquare: false });
    }
    this._masterSeed = undefined;
    this._mastersRefresh();
  },

  /** ROUND 400 -- every overworld square a dojo may stand in: land squares outside the named regions, on both
   *  continents. The world never changes, so this is worked out once. */
  _dojoPlaces() {
    if (this._dojoPlaceCache) return this._dojoPlaceCache;
    const out = [];
    try { if (this._owEnsureSouth) this._owEnsureSouth(); } catch (e) { /* the south registers on first use */ }
    for (const sheet of ['north', 'south']) {
      const cells = this._owCells ? this._owCells(sheet) : null;
      if (!cells) continue;
      for (let sy = 0; sy < sqRowsOf(sheet); sy++) for (let sx = 0; sx < sqColsOf(sheet); sx++) {
        if (namedRegionAt(sx, sy, sheet)) continue;
        let st;
        try { st = squareStats(cells, sx, sy, sheet); } catch (e) { continue; }
        if (!st || st.land < 0.12) continue;   // ROUND 401 -- every square a party can walk into (the overworld's own 12% rule)
        const rank = squareRank(sx, sy, sheet);
        const tier = Math.max(1, Math.min(4, RANK_ORDER.indexOf(rank)));
        let nm = '';
        try { nm = squareName(cells, sx, sy, null, sheet); } catch (e) { nm = ''; }
        out.push({ key: `dojo:${sheet}:${sx},${sy}`, sheet, sx, sy, tier, south: sheet === 'south', name: nm || 'the wilds',
          region: `ow:${sheet}`, regionName: sheet === 'south' ? 'the southern continent' : 'the northern continent',
          place: `a lone dojo in ${nm || 'the wilds'} (square ${sx},${sy} of ${sheet === 'south' ? 'the southern' : 'the northern'} continent)` });
      }
    }
    this._dojoPlaceCache = out;
    return out;
  },

  /** A generated square was just built: if this run's master keeps a dojo here, raise the hall and stand them at it. */
  _placeSquareDojo(region, plan) {
    const sheet = this._owSheetId ? this._owSheetId() : 'north';
    const sq = region && region.square;
    if (!sq) return;
    const e = (this.martialMasters || []).find(o => o.cls === 'dojo' && o.assigned && o.sheet === sheet && o.sx === sq.sx && o.sy === sq.sy);
    if (!e) return;
    const rng = genRng(plan.seed, 31);
    const arrival = regionPoint(region, region.arrival);
    for (let i = 0; i < 200; i++) {
      const tx = 90 + Math.floor(rng() * 844), ty = 90 + Math.floor(rng() * 844);
      const { x, y } = regionPoint(region, { tx, ty });
      if (Math.hypot(x - arrival.x, y - arrival.y) < 60 * TILE) continue;
      if ((region.settlements || []).some(st => { const c = regionPoint(region, st.at); return Math.hypot(c.x - x, c.y - y) < 90 * TILE; })) continue;
      // off the roads: none within six tiles
      const t0x = Math.floor(x / TILE), t0y = Math.floor(y / TILE);
      let road = false;
      for (let dy = -6; dy <= 6 && !road; dy += 2) for (let dx = -6; dx <= 6; dx += 2) if (isCarriagewayTile(this._tileTypeAt(t0x + dx, t0y + dy))) { road = true; break; }
      if (road) continue;
      const hx = Math.round(x / TILE) * TILE, hy = Math.round(y / TILE) * TILE;
      const hall = this._placeArtBuilding ? this._placeArtBuilding(e.hallKey || DOJO_KEYS[0], hx, hy, { region: region.id, roadMargin: 3 }) : null;
      if (!hall) continue;
      hall.dojoOf = e.key;
      const mx = hall.doorPoint.x + TILE * 0.5, my = hall.doorPoint.y;
      Object.assign(e, { x: mx, y: my, homeX: mx, homeY: my, inSquare: true, regionId: region.id, regionName: region.name, dojo: hall });
      if (this.npcs && !this.npcs.includes(e)) this.npcs.push(e);   // a square's teardown takes its people off the list
      this._dojoHere = e;
      this._masterSetVisible(e);
      return;
    }
  },

  /** ROUND 400 -- a master's hall near their place: off the main roads (no road tile within four tiles of the hall's
   *  foot), out from a hamlet's houses, the master at its door. Falls back to the master standing in the open. */
  _placeDojoFor(e) {
    if (!this._placeArtBuilding || !e.hallKey) return null;
    const cx = e.siteX, cy = e.siteY;
    const offRoad = (x, y) => {
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) if (isCarriagewayTile(this._tileTypeAt(tx + dx, ty + dy))) return false;
      return true;
    };
    const h = mixH(stableHash(`dojo|${e.key}`));
    const r0 = e.cls === 'village' ? 22 : 4, r1 = e.cls === 'village' ? 48 : 44;
    for (let i = 0; i < 90; i++) {
      const th = ((h % 360) * Math.PI / 180) + i * 2.399;
      const rr = (r0 + ((i * 7) % (r1 - r0 + 1))) * TILE;
      const x = Math.round((cx + Math.cos(th) * rr) / TILE) * TILE, y = Math.round((cy + Math.sin(th) * rr) / TILE) * TILE;
      if (!offRoad(x, y)) continue;
      if (e.cls !== 'village' && this._inAnySettlement && this._inAnySettlement(x, y)) continue;
      let b = null;
      try { b = this._placeArtBuilding(e.hallKey, x, y, { roadMargin: 3 }); } catch (err) { b = null; }
      if (!b) continue;
      b.dojoOf = e.key;
      e.dojo = b;
      e.homeX = b.doorPoint.x + TILE * 0.5; e.homeY = b.doorPoint.y;
      e.x = e.homeX; e.y = e.homeY;
      return b;
    }
    return null;
  },

  /** Leaving the square: the master goes with it. */
  _dojoTeardown() {
    const e = this._dojoHere;
    if (!e) return;
    e.inSquare = false; e.hidden = true; e.dojo = null;   // the hall goes with the square (_r400Teardown)
    this._masterDropSprite(e);
    this._dojoHere = null;
  },

  _masterSetVisible(e) {
    e.hidden = !e.assigned || (e.cls === 'dojo' && !e.inSquare) || e.homeX == null;
  },

  /** The places, as martialArts.js wants them. */
  _masterPlaces() {
    return (this.martialMasters || []).map(e => ({ key: e.key, cls: e.cls, tier: e.tier, south: e.south, region: e.regionId }));
  },

  /** Put this run's masters where its seed says, teach them their arts, and dress them for it; and the great master
   *  of the player's own style. Cheap when neither the seed nor the style has moved. */
  _mastersRefresh() {
    const list = this.martialMasters;
    if (!list || !list.length) return;
    const seed = this._shopSeed ? this._shopSeed() : 0;
    const style = this.player ? skillBooksOf(this.player).martialArt : null;
    const sig = `${seed}|${style || ''}`;
    if (sig === this._masterSeed) return;
    this._masterSeed = sig;
    const picks = martialMasters(seed, this._masterPlaces());
    const by = Object.fromEntries(picks.map(p => [p.key, p]));
    // the great master of the player's style: one of the run's masters if one already teaches it, else a place of its own
    // ROUND 401 -- "at least one (at random) be whatever art the player has chosen": the great master always stands at
    // a place of the style's own tier (iron most often, gold only in the south); the 200 may teach it too.
    if (style) {
      const g = greatMaster(seed, style, this._masterPlaces(), new Set(Object.keys(by)));
      if (g) by[g.key] = g;
      else { const p = picks.find(q => q.art === style) || picks[mixH(stableHash(`gm|${seed}|${style}`)) % Math.max(1, picks.length)];
        if (p) { const gm = greatMaster(seed, style, [p]) || null; Object.assign(p, gm ? { ...gm, key: p.key } : { art: style }, { great: true }); } }
    }
    for (const e of list) if (e.dojo && e.cls !== 'dojo') { this._removeArtBuilding && this._removeArtBuilding(e.dojo); e.dojo = null; if (e.siteX != null) { e.homeX = e.siteX; e.homeY = e.siteY; } }
    let hallN = 0;
    for (const e of list) {
      const p = by[e.key];
      e.assigned = !!p;
      // ROUND 400 -- "These are the homes of the martial arts masters ... one master per dojo, cycling the four hall
      // variants": a hall for every master standing in an authored region (a dojo square raises its own on entry)
      if (p && e.cls !== 'dojo') { e.hallKey = DOJO_KEYS[hallN++ % DOJO_KEYS.length]; this._placeDojoFor(e); }
      else if (p) e.hallKey = DOJO_KEYS[hallN++ % DOJO_KEYS.length];
      this._masterSetVisible(e);
      e.art = p ? p.art : null;
      e.great = !!(p && p.great);
      e.name = p ? p.name : 'A martial master';
      e.look = p ? { char: p.char, stance: p.stance, palette: p.palette, ramp: p.ramp, flame: p.flame, element: p.element } : null;
      if (e.homeX != null) { e.x = e.homeX; e.y = e.homeY; }
      this._masterDropSprite(e);
    }
  },

  /** The player's notes on masters (kept on the skill books, so a save carries them). */
  _masterLore() {
    const p = this.player;
    if (!p.skillBooks) p.skillBooks = { weapons: {}, martialArt: null };
    return p.skillBooks.masterLore || (p.skillBooks.masterLore = { known: [], lastDay: null, firstDay: null });
  },
  _masterKnow(e) {
    const lore = this._masterLore();
    if (e && !lore.known.includes(e.key)) lore.known.push(e.key);
  },
  _masterByKey(key) { return (this.martialMasters || []).find(o => o.key === key && o.assigned) || null; },

  // ---------------------------------------------------------------- the art

  /** The dyed texture for one sheet of a master's look, or null while it loads (the load is started here). */
  _masterTex(look, kind) {
    const sh = MASTER_SHEETS[look.char] && MASTER_SHEETS[look.char][look.stance] && MASTER_SHEETS[look.char][look.stance][kind];
    if (!sh) return null;
    const key = `mm_${sh.file}_${look.palette}`;
    const lru = this._mmLru || (this._mmLru = []);
    if (this.textures.exists(key)) {
      const i = lru.indexOf(key); if (i >= 0) lru.splice(i, 1); lru.push(key);
      return key;
    }
    const raw = `mmraw_${sh.file}`;
    if (!this.textures.exists(raw)) {
      const pend = this._mmLoading || (this._mmLoading = new Set());
      if (!pend.has(raw)) {
        pend.add(raw);
        this.load.image(raw, `./public/assets/masters/${sh.file}.png`);
        this.load.once(`filecomplete-image-${raw}`, () => pend.delete(raw));
        this.load.once('loaderror', (f) => { if (f && f.key === raw) pend.delete(raw); });
        if (!this.load.isLoading()) this.load.start();
      }
      return null;
    }
    try {
      const src = this.textures.get(raw).getSourceImage();
      const cnv = document.createElement('canvas');
      cnv.width = src.width; cnv.height = src.height;
      const ctx = cnv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, cnv.width, cnv.height);
      dyeMasterPixels(img.data, look.ramp);
      ctx.putImageData(img, 0, 0);
      this._registerRecoloredSpritesheet(key, cnv, sh.cell, sh.cell);
    } catch (err) {
      console.warn('[masters] dye failed', key, err && err.message);
      return null;
    }
    lru.push(key);
    // keep the cache small: drop the oldest dyed sheet no master on screen is wearing
    const inUse = new Set();
    for (const m of (this.martialMasters || [])) if (m.sprite && m.sprite.texture) inUse.add(m.sprite.texture.key);
    while (lru.length > MASTER_TEX_KEEP) {
      const i = lru.findIndex(k => !inUse.has(k) && k !== key);
      if (i < 0) break;
      const old = lru.splice(i, 1)[0];
      if (this.textures.exists(old)) this.textures.remove(old);
    }
    return key;
  },

  /** A white hand flame (generated once), tinted per master. */
  _masterFlameTex() {
    const key = 'mm_handflame';
    if (this.textures.exists(key)) return key;
    const W = 12, H = 18;
    const cnv = document.createElement('canvas'); cnv.width = W; cnv.height = H;
    const ctx = cnv.getContext('2d');
    const g = ctx.createRadialGradient(W / 2, H * 0.68, 1, W / 2, H * 0.62, H * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.quadraticCurveTo(W, H * 0.55, W / 2, H);
    ctx.quadraticCurveTo(0, H * 0.55, W / 2, 0);
    ctx.fill();
    this.textures.addCanvas(key, cnv);
    return key;
  },

  _masterDropSprite(e) {
    if (e.sprite) { e.sprite.destroy(); e.sprite = null; }
    if (e.flames) { for (const f of e.flames) f.destroy(); e.flames = null; }
  },

  /** Frame and origin for the master's current action. */
  _masterPose(e) {
    const look = e.look, act = e.act;
    const kind = act.mode === 'kata' ? 'attack' : act.mode === 'pace' ? 'run' : 'idle';
    const sh = MASTER_SHEETS[look.char][look.stance][kind];
    let key = this._masterTex(look, kind);
    let s = sh, k = kind;
    if (!key && kind !== 'idle') { key = this._masterTex(look, 'idle'); s = MASTER_SHEETS[look.char][look.stance].idle; k = 'idle'; }
    if (!key) return null;
    const dir = Math.max(0, PLAYER_DIR_ORDER.indexOf(e.facing));
    const frame = k === 'idle' ? dir : dir * 8 + Math.min(7, act.f);
    return { key, frame, ox: s.fx / s.cell, oy: s.fy / s.cell };
  },

  /** Every frame: draw the masters near the player, and let them stand, drill and pace. */
  _updateMasters(dt) {
    const list = this.martialMasters;
    if (!list || !list.length) return;
    this._lessonTick(dt);   // ROUND 401 -- meditation and champions for other masters' lessons
    const inside = !!this._insideRoom || !!this.indoors;
    const px = this.world.x, py = this.world.y;
    for (const e of list) {
      const near = !e.hidden && !inside && e.look && Math.abs(e.x - px) < MASTER_DRAW_RANGE && Math.abs(e.y - py) < MASTER_DRAW_RANGE;
      if (!near) { if (e.sprite || e.flames) this._masterDropSprite(e); continue; }
      this._masterAct(e, dt, px, py);
      const pose = this._masterPose(e);
      if (!pose) continue;
      const pt = isoProject(e.x, e.y);
      if (!e.sprite) e.sprite = this.add.sprite(pt.x, pt.y, pose.key, pose.frame);
      const sp = e.sprite;
      if (sp.texture.key !== pose.key) sp.setTexture(pose.key, pose.frame); else sp.setFrame(pose.frame);
      sp.setOrigin(pose.ox, pose.oy);
      sp.setPosition(pt.x, pt.y);
      sp.setDepth(isoDepth(e.x, e.y));
      if (e.look.stance === 'flames') this._masterFlames(e, pt, sp);
    }
  },

  /** Stand; now and then drill a kata; now and then pace out a few steps and back. Face the player when close. */
  _masterAct(e, dt, px, py) {
    const act = e.act;
    const dP = Math.hypot(px - e.x, py - e.y);
    if (act.mode === 'idle') {
      if (dP < FACE_PLAYER_R) { const f = facingFromMove(px - e.x, py - e.y); if (f) e.facing = f; }
      act.t -= dt;
      if (act.t <= 0) {
        const roll = Math.random();
        if (roll < 0.6 || dP < FACE_PLAYER_R) { act.mode = 'kata'; act.f = 0; act.ft = 0; }
        else {
          e.paceAngle += 0.9 + Math.random() * 1.4;
          act.mode = 'pace'; act.f = 0; act.ft = 0; act.back = false;
          act.to = { x: e.homeX + Math.cos(e.paceAngle) * PACE_RANGE, y: e.homeY + Math.sin(e.paceAngle) * PACE_RANGE };
          if (this._isWaterAt(act.to.x, act.to.y) || this._collidesObstacle(act.to.x, act.to.y, 14)) { act.mode = 'kata'; act.to = null; }
        }
      }
    } else if (act.mode === 'kata') {
      act.ft += dt;
      act.f = Math.floor(act.ft * KATA_FPS);
      if (act.f >= 8) { act.mode = 'idle'; act.f = 0; act.t = 4 + Math.random() * 5; }
    } else if (act.mode === 'pace') {
      act.ft += dt;
      act.f = Math.floor(act.ft * RUN_FPS) % 8;
      const to = act.back ? { x: e.homeX, y: e.homeY } : act.to;
      const dx = to.x - e.x, dy = to.y - e.y, d = Math.hypot(dx, dy);
      const step = PACE_SPEED * dt;
      if (d <= step || dP < FACE_PLAYER_R * 0.6) {
        if (d <= step) { e.x = to.x; e.y = to.y; }
        if (act.back || dP < FACE_PLAYER_R * 0.6) { act.mode = 'idle'; act.t = 3 + Math.random() * 4; act.f = 0; }
        else act.back = true;
      } else {
        e.x += dx / d * step; e.y += dy / d * step;
        const f = facingFromMove(dx, dy); if (f) e.facing = f;
      }
    }
  },

  /** The flames stance: a flame on each hand, in the master's element's colour, the whole time. */
  _masterFlames(e, pt, sp) {
    const key = this._masterFlameTex();
    if (!e.flames) {
      e.flames = [0, 1].map(() => this.add.image(pt.x, pt.y, key).setOrigin(0.5, 0.85));
    }
    const col = parseInt(String(e.look.flame || '#ffffff').slice(1), 16);
    const dir = Math.max(0, PLAYER_DIR_ORDER.indexOf(e.facing));
    const ang = dir * Math.PI / 4;                     // screen angle of the facing (east = 0, south = +90 deg)
    const fx = Math.cos(ang), fy = Math.sin(ang) * 0.5;
    const sx = -Math.sin(ang), sy = Math.cos(ang) * 0.5;   // the body's side axis, on screen
    const lift = e.act.mode === 'kata' ? 34 : 28;
    const tt = (this.time ? this.time.now : 0) / 1000;
    e.flames.forEach((f, i) => {
      const side = i ? 1 : -1;
      const hx = pt.x + sx * 11 * side + fx * 4, hy = pt.y - lift + sy * 11 * side + fy * 4;
      f.setPosition(hx, hy);
      f.setTint(col);
      const flick = 0.85 + 0.15 * Math.sin(tt * 13 + i * 2.1) + 0.08 * Math.sin(tt * 29 + i);
      f.setScale(1.15 * flick, 1.3 * flick);
      f.setAlpha(0.85);
      // the hand on the far side of the body is behind it
      const behind = (sy * side) < -0.05 || (dir >= 5 && dir <= 7 && Math.abs(sy) < 0.05);
      f.setDepth(sp.depth + (behind ? -0.001 : 0.001));
    });
  },

  /** The talk. A master of another style sells their manual; a master of YOUR style trains you for your rank. */
  _talkToMaster(e) {
    const a = MARTIAL_BY_ID[e.art];
    if (!a) return;
    if (e.act && e.act.mode === 'pace') { e.act.mode = 'idle'; e.act.t = 5; e.act.f = 0; }   // ROUND 399 -- he stops to talk
    { const f = facingFromMove(this.world.x - e.x, this.world.y - e.y); if (f) e.facing = f; }
    this._masterKnow(e);
    if (this._lessonDeliver(e)) return;   // ROUND 402 -- a letter from another master's lesson
    const sb = skillBooksOf(this.player);
    if (sb.martialArt === a.id) { this._masterTrainTalk(e, a); return; }
    const others = (this.martialMasters || []).filter(o => o.assigned && o !== e && MARTIAL_BY_ID[o.art]);
    const other = others.length ? others[mixH(stableHash(`${this._masterSeed}|${e.key}`)) % others.length] : null;
    const body = [
      `${e.name} looks you over the way a smith looks over iron.`,
      `"I teach one thing. ${a.name}."`,
      '',
      artCard(a),
      '',
    ];
    const choices = [];
    const book = martialBook(a.id);
    const carried = (this.player.bookBag || []).includes(book.id);
    const price = MASTER_PRICE;
    if (sb.martialArt) {
      const cur = MARTIAL_BY_ID[sb.martialArt];
      body.push(`"You follow ${cur ? cur.name : 'another art'}. A body learns one. Find a master of your own way."`);
    } else if (carried) body.push('"You carry my manual already. Read it in the rite; I have nothing to add to it."');
    else {
      body.push(`"My manual, in my own hand: ${Math.round(price / 100)} iron. Read it in the rite like any other."`);
      choices.push({ label: `Learn ${a.name} (${Math.round(price / 100)} iron)`, act: `martialMaster|${e.key}` });
    }
    this._masterLessonTalk(e, a, body, choices);   // ROUND 401
    if (other) {
      const oa = MARTIAL_BY_ID[other.art];
      body.push('', `"If my way is not yours: ${other.name} teaches ${oa.name}, at ${other.place}." (marked on your map)`);
      this._masterKnow(other);
    }
    if (this._compArtMasterAdd) this._compArtMasterAdd(e, body, choices);   // ROUND 406 -- a companion of yours whose master this is
    this._openDialogue(e.name, body.join('\n'), e, choices.length ? choices : null);
  },

  /** ROUND 400 -- training. The rank is the art's attuned rank; its record holds the count and the course. */
  _masterTrainTalk(e, a) {
    const raw = this.player.skillBooks;
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const st = masteryState(raw, rank);
    const rec = masteryRecord(raw, rank);
    const body = [`${e.name} watches you move for a long moment.`, ''];
    const choices = [];
    body.push(`You are ${/^[AEIOU]/.test(st.title) ? 'an' : 'a'} ${st.title} of ${a.name} (+${Math.round(st.bonus * 100)}%).`);
    if (this._deepeningDue && this._deepeningDue()) {
      body.push('', '"Your art lags behind the rest of you. Deepen it in the rite, then come back and I will set you your training."');
    } else if (rec.trained) {
      body.push('', `"There is nothing more for me to give you at ${rankLabel(rank)}. Rise, and come back."`);
    } else if (!rec.trial) {
      body.push('', `"I will train you at ${rankLabel(rank)}. Do what I set you, and come back: your art will run twice as deep at this rank."`);
      const steps = this._masterTrialPlan(e, rank);
      for (const s of steps) body.push(`  · ${s.label}`);
      choices.push({ label: `Begin training (${rankLabel(rank)})`, act: `masterTrain|${e.key}` });
    } else {
      const t = rec.trial;
      const by = this._masterByKey(t.master);
      body.push('', by && by !== e ? `"${by.name} is training you already. Finish with them, or begin again with me."` : '"Your training:"');
      for (const s of t.steps) body.push(`  ${stepDone(s) ? '✓' : '·'} ${s.label}${stepDone(s) ? '' : s.kind === 'visit' ? '' : ` (${Math.min(s.have || 0, s.need)}/${s.need})`}`);
      if (trialDone(t) && (!by || by === e)) {
        choices.push({ label: 'Show what you have learned', act: `masterGrad|${e.key}` });
      } else if (by && by !== e) {
        choices.push({ label: 'Begin again with this master', act: `masterTrain|${e.key}` });
      }
    }
    if (this._compArtMasterAdd) this._compArtMasterAdd(e, body, choices);   // ROUND 406
    this._openDialogue(e.name, body.join('\n'), e, choices.length ? choices : null);
  },

  /** The course a master sets (deterministic for the run, the master and the rank). */
  _masterTrialPlan(e, rank) {
    const spots = (this.martialMasters || []).filter(o => o.cls === 'wild' || o.cls === 'deep').map(o => ({
      x: o.homeX + TILE * 3, y: o.homeY + TILE * 2, region: o.regionId, tier: o.tier, deep: o.cls === 'deep', place: o.place,
    }));
    const famCache = {};
    const families = (tier) => famCache[tier] || (famCache[tier] = (() => {
      const seen = new Set(), out = [];
      for (const k of monsterKeysAtTier(tier)) {
        const fam = MONSTER_TYPES[k] && MONSTER_TYPES[k].family;
        if (!fam || seen.has(fam)) continue;
        seen.add(fam);
        const info = BESTIARY_FAMILY_INFO[fam];
        out.push({ family: fam, label: (info && info.label) || fam });
      }
      return out;
    })());
    const champions = (tier) => monsterKeysAtTier(tier).map(k => ({ key: k, label: monsterLabelFor(k) }));
    return trialSteps(rank, `${this._masterSeed}|${e.key}`, { spots, masterRegion: e.regionId, families, champions });
  },

  _masterBeginTraining(key) {
    const e = this._masterByKey(key);
    if (!e) return false;
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const rec = masteryRecord(this.player.skillBooks, rank);
    rec.trial = { master: key, rank, steps: this._masterTrialPlan(e, rank) };
    e.act.mode = 'kata'; e.act.f = 0; e.act.ft = 0;
    this._floatText(this.world.x, this.world.y - 40, `Training begun with ${e.name}`, '#ffd54f');
    return true;
  },

  _masterGraduate(key) {
    const e = this._masterByKey(key);
    if (!e) return false;
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const rec = masteryRecord(this.player.skillBooks, rank);
    if (!rec.trial || rec.trial.master !== key || !trialDone(rec.trial)) return false;
    rec.trained = true; rec.trial = null;
    const st = masteryState(this.player.skillBooks, rank);
    const a = MARTIAL_BY_ID[e.art];
    e.act.mode = 'kata'; e.act.f = 0; e.act.ft = 0;
    this._floatText(this.world.x, this.world.y - 60, `You are now ${/^[AEIOU]/.test(st.title) ? 'an' : 'a'} ${st.title} of ${a ? a.name : 'your art'}`, '#ffd54f');
    if (this._martialTick) { this._martialLive = null; this._martialTick(0); }
    return true;
  },

  /** ROUND 400 -- the course, as you go: meditation at a place of inspiration (stand still there), and a champion
   *  put out when you come near its place. Kills are counted in `_masterOnKill`. */
  _masterTrialTick(dt, still) {
    const p = this.player;
    const raw = p && p.skillBooks;
    if (!raw || !raw.martialArt || !raw.mastery) return;
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const rec = raw.mastery[String(rank)];
    const t = rec && rec.trial;
    if (!t) return;
    for (const s of t.steps) {
      if (stepDone(s)) continue;
      if (s.kind === 'visit') {
        const d = Math.hypot(this.world.x - s.x, this.world.y - s.y);
        if (d < VISIT_RADIUS && still) {
          s.have = (s.have || 0) + dt;
          if (s.have >= s.need) { s.done = true; this._floatText(this.world.x, this.world.y - 60, `Inspiration: ${s.place}`, '#b39ddb'); }
        }
      } else if (s.kind === 'champion') {
        const d = Math.hypot(this.world.x - s.x, this.world.y - s.y);
        if (d > CHAMPION_WAKE_R) continue;
        const alive = s.uid != null && (this.monsters || []).some(m => m && m.uid === s.uid && m.alive);
        if (!alive && !this._insideRoom) {
          const m = this._spawnMonster(s.key, s.x, s.y, null, { rankTier: Math.max(1, Math.min(4, rank)), label: s.name });
          s.uid = m ? m.uid : null;
          if (m) m.masterChampion = true;
        }
      }
    }
  },

  /** A defeat: the practice count for the art's rank, and any training step it answers. */
  _masterOnKill(m) {
    this._lessonOnKill(m);   // ROUND 401 -- other masters' lessons count with or without an art
    const p = this.player;
    const raw = p && p.skillBooks;
    if (!raw || !raw.martialArt || !MARTIAL_BY_ID[raw.martialArt]) return;
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const before = masteryState(raw, rank);
    const rec = masteryRecord(raw, rank);
    rec.kills = (rec.kills || 0) + 1;
    const after = masteryState(raw, rank);
    if (after.title !== before.title) {
      const a = MARTIAL_BY_ID[raw.martialArt];
      this._floatText(this.world.x, this.world.y - 60, `You are now ${/^[AEIOU]/.test(after.title) ? 'an' : 'a'} ${after.title} of ${a.name}`, '#ffd54f');
    }
    const t = rec.trial;
    if (!t) return;
    for (const s of t.steps) {
      if (stepDone(s)) continue;
      if (s.kind === 'kills') s.have = (s.have || 0) + 1;
      else if (s.kind === 'family' && m && m.type && m.type.family === s.family) s.have = (s.have || 0) + 1;
      else if (s.kind === 'champion' && m && s.uid != null && m.uid === s.uid) { s.have = 1; s.done = true; }
      if (stepDone(s)) this._floatText(this.world.x, this.world.y - 80, `Training: ${s.label.split(':')[0]} -- done`, '#a5d6a7');
    }
  },

  /** "Once a martial art style is chosen adventure officials may occasionally send you the location of a great master
   *  of your style." Once a day at most, on a quiet day, until you know where they are. */
  _masterRunnerTick(calm) {
    const raw = this.player && this.player.skillBooks;
    if (!raw || !raw.martialArt) return;
    const g = (this.martialMasters || []).find(o => o.great && o.assigned && o.art === raw.martialArt);
    if (!g) return;
    const lore = this._masterLore();
    if (lore.known.includes(g.key)) return;
    const day = this._dayIndex ? this._dayIndex() : 0;
    if (lore.firstDay == null) lore.firstDay = day;
    if (lore.lastDay !== day) {
      lore.lastDay = day;
      const h0 = stableHash(`runner|${day}|${this._masterSeed}`);
      const roll = ((Math.imul(h0 ^ (h0 >>> 16), 0x45d9f3b) >>> 0) % 1000) / 1000;   // mixed: the raw hash's low digits barely move day to day
      lore.pending = day > lore.firstDay && roll < RUNNER_CHANCE;
    }
    if (!lore.pending || !calm || this._dialogueOpen || this._shopOpen || this._insideRoom) return;
    lore.pending = false;
    this._masterKnow(g);
    const a = MARTIAL_BY_ID[g.art];
    this._openDialogue('A Society runner', [
      'A runner in Society colours catches up with you, out of breath, and presses a folded note into your hand.',
      '',
      `"From the hall. They heard you walk the way of ${a.name}. There is a great master of it -- ${g.name} -- at ${g.place}.`
        + ` ${rankLabel(g.tier)} country${g.south ? ', in the south' : ''}. Mind yourself out there."`,
      '',
      '(Marked on your map.)',
    ].join('\n'));
  },

  /** Map pins: the masters you know of, and the places your training sends you. */
  _masterMapMarks() {
    const out = [];
    const raw = this.player && this.player.skillBooks;
    const lore = raw && raw.masterLore;
    if (lore) for (const k of lore.known) {
      const e = this._masterByKey(k);
      const a = e && MARTIAL_BY_ID[e.art];
      if (a && e.cls !== 'dojo') out.push({ x: e.homeX, y: e.homeY, label: `${e.name} — ${a.name}`, color: e.great ? '#ffb74d' : '#ce93d8' });
    }
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const rec = raw && raw.mastery && raw.mastery[String(rank)];
    if (rec && rec.trial) for (const s of rec.trial.steps) {
      if (stepDone(s) || !(s.kind === 'visit' || s.kind === 'champion')) continue;
      out.push({ x: s.x, y: s.y, label: s.kind === 'visit' ? `Inspiration: ${s.place}` : s.name, color: '#b39ddb' });
    }
    for (const { key, s } of this._lessonSteps()) {   // ROUND 401/402 -- lessons' places in this region
      const e = this._masterByKey(key);
      const ds = s.shape === 'pilgrimage' ? s.stops.slice(s.at || 0) : [s.dest];
      for (const d of ds) if (d && d.x != null) out.push({ x: d.x, y: d.y, label: `${e ? e.name + ': ' : ''}${s.kind === 'champion' ? s.champs.map(c => c.name).join(' & ') : d.place}`, color: '#80cbc4' });
    }
    return out;
  },

  /** ROUND 400 -- the dojos you know of, for the overworld map: [{sx, sy, label, great}] on `sheet`. */
  _dojoMarks(sheet) {
    const raw = this.player && this.player.skillBooks;
    const lore = raw && raw.masterLore;
    if (!lore) return [];
    const out = [];
    for (const k of lore.known) {
      const e = this._masterByKey(k);
      const a = e && MARTIAL_BY_ID[e.art];
      if (a && e.cls === 'dojo' && e.sheet === sheet) out.push({ sx: e.sx, sy: e.sy, label: `${e.name} — ${a.name}`, great: e.great });
    }
    return out;
  },


  // =========================================================================================================
  // ROUND 401/402 -- A MASTER'S LESSONS (src/data/masterQuests.js). Three at every rank, art-shaped, abroad from
  // Bronze (sometimes) and Silver (always). Kept on the skill books:
  //   skillBooks.masterQuests[key] = { ranks: { [rankIdx]: { stage, step } } }   (round 401's { stage, step } is Iron's)
  // =========================================================================================================
  _lessonBook() {
    const raw = this.player.skillBooks || (this.player.skillBooks = {});
    return raw.masterQuests || (raw.masterQuests = {});
  },
  _lessonRank() { return lessonRankOf(this._playerRankIndex ? this._playerRankIndex() : 1); },
  /** One master's record at one rank (a round-401 record moves to Iron). */
  _lessonRec(key, rk) {
    const book = this._lessonBook();
    const q = book[key] || (book[key] = { ranks: {} });
    if (q.stage != null && !q.ranks) { q.ranks = { 1: { stage: q.stage, step: q.step || null } }; delete q.stage; delete q.step; }
    q.ranks = q.ranks || {};
    return q.ranks[rk] || (q.ranks[rk] = { stage: 0, step: null });
  },
  /** The rank a master is teaching you at: the lowest rank with a lesson still open, else your own. */
  _lessonRankFor(key) {
    const q = this._lessonBook()[key];
    if (q && q.ranks) for (const r of Object.keys(q.ranks).map(Number).sort((a, b) => a - b)) if (q.ranks[r] && q.ranks[r].step) return r;
    if (q && q.stage != null && q.step) return 1;
    return this._lessonRank();
  },
  /** Every open lesson: [{ key, rk, rec, s }]. */
  _lessonSteps() {
    const out = [];
    const book = this.player && this.player.skillBooks && this.player.skillBooks.masterQuests;
    if (!book) return out;
    for (const [key, q] of Object.entries(book)) {
      if (q && q.stage != null && !q.ranks) this._lessonRec(key, 1);
      for (const [rk, rec] of Object.entries((q && q.ranks) || {})) if (rec && rec.step && !rec.step.done) out.push({ key, rk: +rk, rec, s: rec.step });
    }
    return out;
  },
  /** Where the player is, as a lesson area: 'q:<sheet>:<sx>:<sy>' in a world-map square, 'r:<id>' in a region. */
  _areaKeyHere() {
    const R = this.currentRegion;
    if (!R) return null;
    if (R.square) return `q:${this._owSheetId ? this._owSheetId() : 'north'}:${R.square.sx}:${R.square.sy}`;
    return `r:${R.id}`;
  },
  _squareLabel(d) {
    return `${d.name || 'the wilds'} (square ${d.sx},${d.sy}${d.south ? ' of the south' : ''})`;
  },
  _masterHomeArea(e) {
    if (e.cls === 'dojo') return { area: `q:${e.sheet}:${e.sx}:${e.sy}`, label: this._squareLabel(this._dojoPlaces().find(d => d.key === e.key) || e), sheet: e.sheet, sx: e.sx, sy: e.sy };
    return { area: `r:${e.siteRegion || e.regionId}`, label: e.siteRegionName || e.regionName };
  },
  /** Everything masterLesson needs to choose its places. Built once a seed. */
  _lessonCtx(e) {
    const home = this._masterHomeArea(e);
    const key = `${this._masterSeed}`;
    let base = this._lessonCtxCache;
    if (!base || base.key !== key) {
      // only regions the world map shows (so every journey can be pinned on it): the north's five, and the south's
      const onMap = new Set([...OW_REGIONS.map(r => r.id), ...((sheetOf('south').regions) || []).map(r => r.id)]);
      const spots = (this.martialMasters || []).filter(o => (o.cls === 'wild' || o.cls === 'deep') && o.siteX != null && onMap.has(o.regionId)).map(o => ({
        x: o.siteX + TILE * 3, y: o.siteY + TILE * 2, place: o.place, tier: o.tier, regionId: o.regionId,
        area: `r:${o.regionId}`, areaLabel: o.regionName,
      }));
      const squares = this._dojoPlaces().map(d => ({ place: this._squareLabel(d), tier: d.tier, south: d.south, sheet: d.sheet, sx: d.sx, sy: d.sy,
        area: `q:${d.sheet}:${d.sx}:${d.sy}`, areaLabel: this._squareLabel(d) }));
      const famCache = {};
      const families = (tier) => famCache[tier] || (famCache[tier] = (() => {
        const seen = new Set(), out = [];
        for (const k of monsterKeysAtTier(tier)) {
          const fam = MONSTER_TYPES[k] && MONSTER_TYPES[k].family;
          if (!fam || seen.has(fam)) continue;
          seen.add(fam);
          const info = BESTIARY_FAMILY_INFO[fam];
          out.push({ family: fam, label: (info && info.label) || fam });
        }
        return out;
      })());
      const champions = (tier) => monsterKeysAtTier(tier).map(k => ({ key: k, label: monsterLabelFor(k) }));
      base = this._lessonCtxCache = { key, spots, squares, families, champions };
    }
    const masters = (this.martialMasters || []).filter(o => o.assigned && o !== e && o.art).map(o => {
      const h = this._masterHomeArea(o);
      return { key: o.key, name: o.name, place: o.place, area: h.area, local: h.area === home.area,
        dest: o.cls === 'dojo' ? { area: h.area, place: o.place, sheet: o.sheet, sx: o.sx, sy: o.sy, square: true }
          : { area: h.area, place: o.place, x: o.homeX, y: o.homeY, regionId: o.regionId } };
    });
    return {
      home, local: base.spots.filter(s => s.area === home.area),
      abroad: [...base.spots.filter(s => s.area !== home.area), ...base.squares.filter(s => s.area !== home.area)],
      families: base.families, champions: base.champions, masters,
    };
  },

  /** The lesson part of a master's talk (a master of another art). Adds to `body` and `choices`. */
  _masterLessonTalk(e, a, body, choices) {
    const rk = this._lessonRankFor(e.key);
    const rec = this._lessonRec(e.key, rk);
    const RN = LESSON_RANK_NAMES[rk];
    const seed = `${this._masterSeed}|${e.key}`;
    body.push('');
    if (rec.stage >= 3) { body.push(`"That is all ${a.name} has to teach you at ${RN}. Rise, and come back."`); return; }
    const stage = rec.stage + 1;
    if (!rec.step) {
      body.push(`${RN} lesson ${stage} of 3. ${masterPhilosophy(stage, a, seed, rk)}`);
      const L = masterLesson(stage, a, rk, seed, this._lessonCtx(e));
      body.push(`  · ${L.label}`);
      if (L.dest && L.dest.area !== this._masterHomeArea(e).area) body.push('  (A journey: marked on your map and the world map when you take it.)');
      body.push(`  (${['', 'An Uncommon ring or amulet', 'A Rare piece of armour', 'An Epic weapon or piece of armour'][stage]} of ${artTheme(a).label}, ${RN} make.)`);
      choices.push({ label: `Take the lesson (${RN} ${stage}/3)`, act: `mq|${e.key}|accept` });
      return;
    }
    const s = rec.step;
    const done = this._lessonDone(s);
    body.push(`${RN} lesson ${stage} of 3:`, `  ${done ? '✓' : '·'} ${s.label}${done ? '' : this._lessonProgress(s)}`);
    if (!done) { body.push('', '"Come back when it is done."'); return; }
    body.push('', s.shape === 'gather' ? `"You found it. Good." They turn the ${s.material.split(' ')[0]} over in their hands. "Then this is yours."` : '"Good. Then this is yours."');
    if (stage === 1) choices.push({ label: 'Take the ring', act: `mq|${e.key}|claim|ring` }, { label: 'Take the amulet', act: `mq|${e.key}|claim|amulet` });
    else if (stage === 2) choices.push({ label: 'Take the armour', act: `mq|${e.key}|claim|armor` });
    else choices.push({ label: 'Take the weapon', act: `mq|${e.key}|claim|weapon` }, { label: 'Take the armour', act: `mq|${e.key}|claim|armor` });
  },
  _lessonDone(s) { return !!s && (!!s.done || (s.kind !== 'waves' && s.kind !== 'champion' && s.kind !== 'visit' && (s.have || 0) >= s.need)); },
  _lessonProgress(s) {
    if (s.kind === 'count') return ` (${Math.min(s.have || 0, s.need)}/${s.need}${s.area ? `; counts in ${s.areaLabel}` : ''})`;
    if (s.kind === 'champion') return s.champs.length > 1 ? ` (${s.champs.filter(c => c.done).length}/${s.champs.length})` : '';
    if (s.kind === 'waves') return ` (${s.have || 0}/${s.need})`;
    if (s.shape === 'pilgrimage') return ` (${s.at || 0}/${s.stops.length})`;
    return '';
  },

  /** 'accept' a lesson, or 'claim' its gift (`choice`: ring | amulet | armor | weapon). */
  _masterLessonAct(key, what, choice) {
    const e = this._masterByKey(key);
    const a = e && MARTIAL_BY_ID[e.art];
    if (!a) return false;
    const rk = this._lessonRankFor(key);
    const rec = this._lessonRec(key, rk);
    const stage = (rec.stage || 0) + 1;
    if (stage > 3) return false;
    const seed = `${this._masterSeed}|${key}`;
    if (what === 'accept') {
      if (rec.step) return false;
      rec.step = masterLesson(stage, a, rk, seed, this._lessonCtx(e));
      rec.step.from = key;
      e.act.mode = 'kata'; e.act.f = 0; e.act.ft = 0;
      this._floatText(this.world.x, this.world.y - 40, `${LESSON_RANK_NAMES[rk]} lesson ${stage} from ${e.name}`, '#80cbc4');
      return true;
    }
    if (what === 'claim') {
      const s = rec.step;
      if (!this._lessonDone(s)) return false;
      const ok = stage === 1 ? ['ring', 'amulet'] : stage === 2 ? ['armor'] : ['weapon', 'armor'];
      if (!ok.includes(choice)) return false;
      const gift = masterGift(stage, choice, a, rk, seed, e.name);
      if (!gift || !grantLootToPlayer(this.player, gift)) {
        this._floatText(this.world.x, this.world.y - 40, 'Your bags are full.', '#ef9a9a');
        return false;
      }
      rec.stage = stage; rec.step = null;
      const it = gift.item || gift.rec;
      this._floatText(this.world.x, this.world.y - 60, `${e.name} gives you ${it.name}`, '#ffd54f');
      if (this._renderInventory) this._renderInventory();
      return true;
    }
    return false;
  },

  /** A letter delivered: talking to a master an open lesson sends a letter to. Returns true if it took the talk. */
  _lessonDeliver(e) {
    const hit = this._lessonSteps().find(x => x.s.kind === 'deliver' && x.s.to === e.key);
    if (!hit) return false;
    hit.s.have = 1; hit.s.done = true;
    const from = this._masterByKey(hit.key);
    const lines = ['laughs once, and folds it away. "Tell them I have not forgotten."', 'reads it twice and goes quiet for a while. "Thank you for carrying it."',
      'snorts. "Still arguing the same point, after all these years." They write a reply on the back and hand it to you.',
      'smiles. "So they finally found a student worth sending. Go on, then -- go back to them."'];
    this._openDialogue(e.name, `You hand ${e.name} the letter from ${from ? from.name : 'your master'}.\n\n${e.name} ${lines[mixH(stableHash(e.key)) % lines.length]}\n\n(Lesson done: return to ${from ? from.name : 'your master'}.)`, e);
    return true;
  },

  /** An event the lessons count: 'kill' (with the monster), 'crit', 'dodge', 'block'. */
  _lessonEvent(ev, m = null) {
    const steps = this._lessonSteps();
    if (!steps.length) return;
    const here = this._areaKeyHere();
    const hour = this._hourOfDay ? this._hourOfDay() : 12;
    const still = (this._lessonSt && this._lessonSt.still) || 0;
    for (const { key, s } of steps) {
      if (s.kind === 'count') {
        if (s.area && s.area !== here) continue;
        if (s.win && !inWindow(hour, s.win)) continue;
        let n = 0;
        if (ev === 'kill') {
          if (s.ev === 'kill') n = (!s.weapon || this._lessonWeaponOk(s.weapon)) ? 1 : 0;
          else if (s.ev === 'familyKill') n = m && m.type && m.type.family === s.family ? 1 : 0;
          else if (s.ev === 'nightKill' || s.ev === 'noHit') n = 1;
          else if (s.ev === 'stillKill') n = still >= 0.6 ? 1 : 0;
          else if (s.ev === 'spellKill') n = m && m._lastHitEl && (!s.el || m._lastHitEl === s.el) ? 1 : 0;
        } else if (s.ev === ev) n = 1;
        if (n) { s.have = (s.have || 0) + n; if (s.have >= s.need) { s.done = true; this._lessonNote(key, s); } }
      } else if (s.kind === 'champion' && ev === 'kill' && m) {
        const c = s.champs.find(q => q.uid != null && q.uid === m.uid && !q.done);
        if (!c) continue;
        let ok = true;
        if (s.shape === 'proving') {
          if (s.cond === 'noHit') ok = !s.touched;
          else if (s.cond === 'still') ok = !s.moved;
          else if (s.cond === 'weapon') ok = this._lessonWeaponOk(s.weapon);
          else if (s.cond === 'spell') ok = !!(m._lastHitEl && (!s.el || m._lastHitEl === s.el));
        }
        if (!ok) { c.uid = null; s.touched = false; s.moved = false;
          this._floatText(this.world.x, this.world.y - 70, 'Not like that. It will come again -- do it the master\'s way.', '#ef9a9a'); continue; }
        c.done = true;
        if (s.champs.every(q => q.done)) { s.have = s.need; s.done = true; this._lessonNote(key, s); }
      } else if (s.kind === 'waves' && ev === 'kill' && m && (s.uids || []).includes(m.uid)) {
        s.uids = s.uids.filter(u => u !== m.uid);
        if (!s.uids.length) {
          s.have = (s.have || 0) + 1;
          if (s.have >= s.need) { s.done = true; this._lessonNote(key, s); }
          else { s.nextAt = 4; this._floatText(this.world.x, this.world.y - 70, `Wave ${s.have} of ${s.need} held`, '#80cbc4'); }
        }
      }
    }
  },
  _lessonOnKill(m) { this._lessonEvent('kill', m); },
  _lessonWeaponOk(w) {
    // the same weapon conditions the arts themselves read (skillBookMixin _martialWeaponCtx): w_dagger, w_great, w_twohand ...
    const ctx = this._martialWeaponCtx ? this._martialWeaponCtx() : {};
    return !!ctx[`w_${w}`];
  },
  _lessonNote(k, s) {
    if (s && s.soc) return;   // ROUND 405 -- a Magic Society study says its own (societyChainMixin `_socTick`)
    const e = this._masterByKey(k);
    const what = s.shape === 'gather' ? `You gather ${s.material}` : `${e ? e.name + "'s lesson" : 'Lesson'} -- done`;
    this._floatText(this.world.x, this.world.y - 80, `${what}. Return to ${e ? e.name : 'your master'}.`, '#80cbc4');
  },
  /** Is the player at a lesson's place? A region spot: within `r`. A world-map square: anywhere in it. */
  _lessonAt(d, r = VISIT_RADIUS) {
    if (!d) return false;
    if (d.x != null) return Math.hypot(this.world.x - d.x, this.world.y - d.y) < r;
    return !!d.area && this._areaKeyHere() === d.area;
  },
  /** A clear point near the player (for a square's champion or waves): ~`tiles` away, not in water or a wall. */
  _lessonNearPoint(tiles = 9) {
    for (let k = 0; k < 16; k++) {
      const th = k * 0.9 + (this._clockT || 0);
      const x = this.world.x + Math.cos(th) * TILE * tiles, y = this.world.y + Math.sin(th) * TILE * tiles;
      if (!this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 16)) return { x, y };
    }
    return { x: this.world.x + TILE * tiles, y: this.world.y };
  },
  /** Every frame: stillness and hits (for the unbroken runs and the provings), places, vigils, champions and waves. */
  _lessonTick(dt) {
    const steps = this._lessonSteps();
    const lt = this._lessonSt || (this._lessonSt = { x: 0, y: 0, still: 0, hp: 0, sqT: 0, sq: null });
    const dx = this.world.x - lt.x, dy = this.world.y - lt.y;
    const moved = dx * dx + dy * dy > 0.09;
    if (moved) lt.still = 0; else lt.still += dt;
    lt.x = this.world.x; lt.y = this.world.y;
    const p = this.player;
    const hit = p && p.hp < lt.hp - 0.01;
    if (p) lt.hp = p.hp;
    const here = this._areaKeyHere();
    if (here !== lt.sq) { lt.sq = here; lt.sqT = 0; } else lt.sqT += dt;
    if (!steps.length || this._insideRoom) return;
    const hour = this._hourOfDay ? this._hourOfDay() : 12;
    const alive = (uid) => uid != null && (this.monsters || []).some(m => m && m.uid === uid && m.alive);
    const rk = this._lessonRank();
    for (const { key, s } of steps) {
      if (s.kind === 'count' && s.ev === 'noHit' && hit && (!s.area || s.area === here) && (s.have || 0) > 0) {
        s.have = 0; this._floatText(this.world.x, this.world.y - 70, 'Hit -- the run starts again', '#ef9a9a');
      }
      if (s.kind === 'visit') {
        const d = s.shape === 'pilgrimage' ? s.stops[s.at || 0] : s.dest;
        if (!this._lessonAt(d) || lt.still < 1.5 || (s.win && !inWindow(hour, s.win))) continue;
        s.have = (s.have || 0) + dt;
        if (s.have < s.need) continue;
        if (s.shape === 'pilgrimage' && (s.at || 0) + 1 < s.stops.length) {
          s.at = (s.at || 0) + 1; s.have = 0; s.dest = s.stops[s.at];
          this._floatText(this.world.x, this.world.y - 70, `Now: ${s.dest.place}`, '#80cbc4');
        } else { if (s.shape === 'pilgrimage') s.at = s.stops.length; s.done = true; this._lessonNote(key, s); }
      } else if (s.kind === 'champion') {
        const d = s.dest;
        const near = d && (d.x != null ? Math.hypot(this.world.x - d.x, this.world.y - d.y) < CHAMPION_WAKE_R : (this._lessonAt(d) && lt.sqT > 3));
        if (!near || (s.win && !inWindow(hour, s.win))) continue;
        const live = s.champs.some(c => !c.done && alive(c.uid));
        if (live) { if (hit) s.touched = true; if (moved && lt.fightMove !== false) s.moved = true; }
        for (const c of s.champs) {
          if (c.done || alive(c.uid)) continue;
          const at = d.x != null ? { x: d.x + (c === s.champs[1] ? TILE * 3 : 0), y: d.y } : this._lessonNearPoint(9);
          const m = this._spawnMonster(c.key, at.x, at.y, null, { rankTier: Math.max(1, Math.min(4, rk)), label: c.name });
          c.uid = m ? m.uid : null;
          if (m) { m.masterChampion = true; s.touched = false; s.moved = false; }
        }
      } else if (s.kind === 'waves') {
        const d = s.dest;
        if (!(d && (d.x != null ? this._lessonAt(d, CHAMPION_WAKE_R * 0.5) : (this._lessonAt(d) && lt.sqT > 3)))) continue;
        s.uids = (s.uids || []).filter(alive);
        if (s.uids.length || (s.have || 0) >= s.need) continue;
        if (s.nextAt > 0) { s.nextAt -= dt; continue; }
        const keys = monsterKeysAtTier(Math.max(1, Math.min(4, rk)));
        const n = 3 + Math.min(3, rk) + (s.have || 0);
        const c = d.x != null ? { x: d.x, y: d.y } : this._lessonNearPoint(7);
        for (let i = 0; i < n; i++) {
          const k = i === 0 ? s.waveKey : keys[(mixH(stableHash(`${key}|${s.have}|${i}`))) % Math.max(1, keys.length)];
          const th = (i / n) * Math.PI * 2;
          const m = this._spawnMonster(k, c.x + Math.cos(th) * TILE * 5, c.y + Math.sin(th) * TILE * 5, null, { rankTier: Math.max(1, Math.min(4, rk)) });
          if (m) { s.uids.push(m.uid); m.aggro = true; }
        }
        this._floatText(this.world.x, this.world.y - 70, `Wave ${(s.have || 0) + 1} of ${s.need}`, '#ffcc80');
      }
    }
  },

  /** ROUND 402 -- "Mark the location on the world map of the location needed to travel to for materials, challenges or
   *  events." The places open lessons and training send you, as world-map pins on `sheet`: [{ c, r, label }] in cells. */
  _lessonOwMarks(sheet) {
    const out = [];
    const cellOf = (d) => {
      if (!d) return null;
      if (d.sheet != null && d.sx != null && d.x == null) {
        if (d.sheet !== sheet) return null;
        return { c: (d.sx + 0.5) * OW_SQUARE, r: (d.sy + 0.5) * OW_SQUARE };
      }
      const rid = d.regionId || (d.area && d.area.startsWith('r:') ? d.area.slice(2) : null);
      if (!rid) return null;
      const box = (sheet === 'north' ? OW_REGIONS : (sheetOf('south').regions || [])).find(r => r.id === rid);
      const reg = REGIONS.find(r => r.id === rid);
      if (!box) return null;
      if (d.x == null || !reg) return { c: (box.c0 + box.c1) / 2, r: (box.r0 + box.r1) / 2 };
      const o = regionOrigin(reg);
      const tx = (d.x - o.x) / TILE, ty = (d.y - o.y) / TILE;
      return { c: box.c0 + (tx / REGION_TILES) * (box.c1 - box.c0), r: box.r0 + (ty / REGION_TILES) * (box.r1 - box.r0) };
    };
    for (const { key, s } of this._lessonSteps()) {
      const e = this._masterByKey(key);
      const who = s.soc ? 'Magic Society' : e ? e.name : 'A master';   // ROUND 405 -- a Society study site
      const ds = s.shape === 'pilgrimage' ? s.stops.slice(s.at || 0) : s.kind === 'count' ? (s.area ? [s.dest] : []) : [s.dest];
      for (const d of ds) {
        const at = cellOf(d);
        if (at && s.soc) { out.push({ ...at, label: `${who}: ${s.shape === 'study' ? 'study site' : 'trial'}`, color: '#b39ddb' }); continue; }
        if (at) out.push({ ...at, label: `${who}: ${s.shape === 'gather' ? 'materials' : s.kind === 'champion' || s.kind === 'waves' ? 'challenge' : s.kind === 'deliver' ? 'letter' : s.kind === 'count' ? 'practice' : 'event'}`, color: '#80cbc4' });
      }
    }
    // the training your own art's master set: its journeys and champions
    const raw = this.player && this.player.skillBooks;
    const rank = this._artRankNow ? (this._artRankNow() ?? 0) : 0;
    const tr = raw && raw.mastery && raw.mastery[String(rank)];
    if (tr && tr.trial) for (const s of tr.trial.steps) {
      if (stepDone(s) || !(s.kind === 'visit' || s.kind === 'champion')) continue;
      const at = cellOf({ x: s.x, y: s.y, regionId: s.region });
      if (at) out.push({ ...at, label: s.kind === 'visit' ? 'Training: inspiration' : 'Training: champion', color: '#b39ddb' });
    }
    return out;
  },

  /** The "Learn" button: the manual into the bag, paid for. */
  _buyFromMaster(key) {
    const e = this._masterByKey(key);
    const a = e && MARTIAL_BY_ID[e.art];
    if (!a) return false;
    const book = martialBook(a.id);
    const why = this._bookRefusal ? this._bookRefusal(book.id) : null;
    if (why) { this._floatText(this.world.x, this.world.y - 40, why, '#ef9a9a'); return false; }
    if (coinPurseValue(this.player.coins) < MASTER_PRICE || !spendCoins(this.player.coins, MASTER_PRICE)) {
      this._floatText(this.world.x, this.world.y - 40, 'Not enough coin.', '#ef9a9a');
      return false;
    }
    (this.player.bookBag || (this.player.bookBag = [])).push(book.id);
    e.act.mode = 'kata'; e.act.f = 0; e.act.ft = 0;   // ROUND 399 -- he shows you the first form
    this._floatText(this.world.x, this.world.y - 40, `${e.name} hands you ${book.name}`, '#ffd54f');
    if (this._renderInventory) this._renderInventory();
    return true;
  },
};
