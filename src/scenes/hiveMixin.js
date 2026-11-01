// ===========================================================================
// ROUND 424 -- THE COLONIES, IN THE WORLD. The data is src/data/hives.js; this is where it stands and moves.
//
//   * _h424Preload        the user's nest art (hive_nests.zip): mounds, entrances, interior decoration
//   * _h424PlanSurface    per region, each colony's great mound with its entrance at the front / bottom-right, and
//                         SURFACE_MOUNDS minor mounds around it (house-sized, solid, vent holes only); in Bratugal the
//                         ants at the west end, the termites at the east and the skirmish spots between them
//   * _h424SurfacePacks   the colony's own packs around its mounds (ant mounds ant-line, termite mounds termite-line)
//                         and the Bratugal war bands; nothing else in the world spawns an ant or a termite
//   * _h424Enter / _h424Leave   down through the entrance, back up through the hole you arrived by
//   * _h424BuildInside    the underground's decoration, its solids, its packs and its queens, once
//   * _h424MonsterTick    from the monster loop: an ant and a termite in reach of each other fight (when neither is
//                         after the player); a queen holds her chamber and lays grubs and workers while she fights
//   * _h424Tick           the skirmish clock: a spent war band comes back after SKIRMISH_RESPAWN_S, not a day
// ===========================================================================
import {
  HIVE_LIST, HIVES, NEST_ART, NEST_KEYS, MOUND_SCALE, NEST_PROP_SCALE, moundKey, entranceKey, hiveContentsFor,
  HIVE_LINE, SURFACE_MOUNDS, SKIRMISH_SPOTS, SKIRMISH_RESPAWN_S, hiveRng,
} from '../data/hives.js';
import { HIVE_ROOM_BY_ID } from '../data/interiors.js';
import { REGIONS, REGION_TILES } from '../data/regions.js';
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { MONSTER_TYPES, monsterThreatTier } from '../data/monsters.js';

const texOf = (key) => `hive_${key}`;
const keyOf = (family, shade) => family + shade.charAt(0).toUpperCase() + shade.slice(1);
/** How far apart a colony's minor mounds stand from its great one, in tiles. */
const MINOR_RING = [12, 26];
const BROOD_EVERY_S = 7;
const BROOD_MAX = 6;
const QUEEN_LEASH_TILES = 6;
const WAR_SEEK_TILES = 8;

export const HiveMixin = {
  _h424Preload() {
    for (const k of NEST_KEYS) this.load.image(texOf(k), `./public/assets/hive/${k}.png`);
  },

  /** A nest sprite at a world point, standing on its foot. */
  _h424Sprite(key, wx, wy, scale) {
    const art = NEST_ART[key];
    if (!art || !this.textures.exists(texOf(key))) return null;
    const p = isoProject(wx, wy);
    const s = this.add.image(p.x, p.y, texOf(key));
    s.setOrigin(art.footX / art.size, art.footY / art.size);
    s.setScale(scale);
    s.setDepth(isoDepth(wx, wy));
    return s;
  },

  /** Is a mound (world radius r) allowed here? The site rules, plus no water, no rock and no road under it. */
  _h424SpotOk(wx, wy, r) {
    if (!this._siteSpotOk(wx, wy, { build: { kind: 'yard', radius: r } })) return false;
    if (this._waterWithinTiles && this._waterWithinTiles(wx, wy, Math.ceil(r / TILE) + 2)) return false;
    for (const o of (this.obstacles || [])) if (Math.hypot(o.x - wx, o.y - wy) < r + (o.radius || 16)) return false;
    for (const h of (this._hiveSites || [])) if (Math.hypot(h.x - wx, h.y - wy) < r + TILE * 8) return false;
    if (this._settlementAt && this._settlementAt(wx, wy)) return false;
    return true;
  },

  _h424PlanSurface() {
    this._hiveSites = [];
    this._hiveEntrances = [];
    this._hiveSkirmish = [];
    for (const hive of HIVE_LIST) {
      const region = REGIONS.find(r => r.id === hive.region);
      if (!region) continue;
      const rng = hiveRng(`surface|${hive.id}`);
      const ox = region.col * REGION_TILES * TILE, oy = region.row * REGION_TILES * TILE;
      const span = REGION_TILES * TILE;
      hive.sides.forEach((side, si) => {
        const [ax0, ax1] = side.area;
        const R = TILE * 2.2;   // the great mound's footprint radius at MOUND_SCALE
        let main = null;
        for (let t = 0; t < 900 && !main; t++) {
          const wx = ox + span * (ax0 + rng() * (ax1 - ax0));
          const wy = oy + span * (0.1 + rng() * 0.8);
          // the entrance stands at the mound's front, bottom-right on screen (+x in the world)
          const ex = wx + TILE * 3.4, ey = wy + TILE * 0.4;
          if (!this._h424SpotOk(wx, wy, R + TILE * 3) || !this._h424SpotOk(ex, ey, TILE * 2)) continue;
          main = { wx, wy, ex, ey };
        }
        if (!main) return;
        const style = side.mounds[0];
        const rec = { hive: hive.id, side: si, kind: side.kind, x: main.wx, y: main.wy, main: true, style, region: region.id };
        this._hiveSites.push(rec);
        const ent = { hive: hive.id, side: si, kind: side.kind, x: main.ex, y: main.ey, style, region: region.id,
          // where you come back up: just in front of the entrance
          out: { x: main.ex + TILE * 1.2, y: main.ey + TILE * 1.2 } };
        this._hiveEntrances.push(ent);
        // minor mounds around it
        let made = 0;
        for (let t = 0; t < 400 && made < SURFACE_MOUNDS; t++) {
          const a = rng() * Math.PI * 2, d = TILE * (MINOR_RING[0] + rng() * (MINOR_RING[1] - MINOR_RING[0]));
          const wx = main.wx + Math.cos(a) * d, wy = main.wy + Math.sin(a) * d;
          const rx = (wx - ox) / span;
          if (rx < ax0 - 0.04 || rx > ax1 + 0.04) continue;
          if (!this._h424SpotOk(wx, wy, R)) continue;
          this._hiveSites.push({ hive: hive.id, side: si, kind: side.kind, x: wx, y: wy, main: false,
            style: side.mounds[(made + 1) % side.mounds.length], region: region.id });
          made++;
        }
      });
      // Bratugal's skirmish ground: the band between the two colonies.
      if (hive.skirmish) {
        const [b0, b1] = hive.skirmish;
        let n = 0;
        for (let t = 0; t < 600 && n < SKIRMISH_SPOTS; t++) {
          const wx = ox + span * (b0 + rng() * (b1 - b0));
          const wy = oy + span * (0.15 + rng() * 0.7);
          if (!this._h424SpotOk(wx, wy, TILE * 4)) continue;
          if (this._hiveSkirmish.some(s => Math.hypot(s.x - wx, s.y - wy) < TILE * 40)) continue;
          this._hiveSkirmish.push({ hive: hive.id, x: wx, y: wy, region: region.id });
          n++;
        }
      }
    }
    // Clear the ground: the trees under and beside a mound go, as a site's do (round 63's glade rule).
    const clear = [...this._hiveSites.map(h => ({ x: h.x, y: h.y, r: TILE * (h.main ? 6 : 4.5) })),
      ...this._hiveEntrances.map(e => ({ x: e.x, y: e.y, r: TILE * 3 }))];
    if (this.forestTrees && clear.length) {
      const kept = this.forestTrees.filter(t => !clear.some(c => Math.hypot(t.x - c.x, t.y - c.y) < c.r));
      this.forestTrees = kept.map((t, i) => ({ ...t, id: i }));
    }
    for (const c of clear) (this._landmarkKeepOut = this._landmarkKeepOut || []).push({ x: c.x, y: c.y, r: c.r + TILE * 2 });
    // Draw them, and give each mound the collision its own art says it has (round 256's tile rule).
    for (const h of this._hiveSites) {
      const s = this._h424Sprite(moundKey(h.kind, h.style), h.x, h.y, MOUND_SCALE);
      if (!s) continue;
      h.sprite = s;
      const fp = this._artFootprint ? this._artFootprint(s) : null;
      if (fp && this._claimFootprintTiles) h.tiles = this._claimFootprintTiles(fp);
    }
    for (const e of this._hiveEntrances) {
      e.sprite = this._h424Sprite(entranceKey(e.kind, e.style), e.x, e.y, MOUND_SCALE);
      // in front of its mound, always: the entrance is the thing at the mound's foot
      if (e.sprite) e.sprite.setDepth(isoDepth(e.x, e.y) + 1);
    }
    return this._hiveSites.length;
  },

  /** The colony's packs on the surface, after `_buildMonsterSpawns` has made `spawnGroups`. */
  _h424SurfacePacks() {
    if (!this.spawnGroups || !this._hiveSites) return 0;
    let n = 0;
    const push = (region, key, x, y, count, label, extra = {}) => {
      if (!MONSTER_TYPES[key]) return null;
      const g = { region, key, x, y, homeX: x, homeY: y, count, tier: monsterThreatTier(key), label, roams: false,
        surged: false, roamDir: 0, roamLegT: 0, awake: false, cooldown: 0, members: [], hiveGroup: true, ...extra };
      this.spawnGroups.push(g);
      n++;
      return g;
    };
    for (const h of this._hiveSites) {
      const hive = HIVES[h.hive], side = hive.sides[h.side];
      const rng = hiveRng(`surface-packs|${h.hive}|${Math.round(h.x)}|${Math.round(h.y)}`);
      const shade = () => side.shades[rng() < 0.65 ? 0 : 1];
      const [grub, worker, soldier] = HIVE_LINE[side.kind];
      const near = (d) => { const a = rng() * Math.PI * 2; return [h.x + Math.cos(a) * TILE * d, h.y + Math.sin(a) * TILE * d]; };
      const label = side.kind === 'ant' ? 'ant colony' : 'termite colony';
      if (h.main) {
        push(h.region, keyOf(worker, shade()), ...near(4.5), 4, label);
        push(h.region, keyOf(soldier, shade()), ...near(4), 2, label);
        push(h.region, keyOf(grub, shade()), ...near(5), 5, label);
      } else {
        push(h.region, keyOf(worker, shade()), ...near(4), 2 + Math.floor(rng() * 2), label);
        if (rng() < 0.5) push(h.region, keyOf(soldier, shade()), ...near(3.5), 1, label);
      }
    }
    // The Bratugal war bands: each skirmish spot raises an ant band and a termite band a few tiles apart, and they
    // fight whenever they are awake (when the player is near enough to see it).
    for (const s of (this._hiveSkirmish || [])) {
      const hive = HIVES[s.hive];
      hive.sides.forEach((side, si) => {
        const dx = (si === 0 ? -1 : 1) * TILE * 3;
        const rng = hiveRng(`skirmish|${Math.round(s.x)}|${si}`);
        const [, worker, soldier] = HIVE_LINE[side.kind];
        const sh = side.shades[rng() < 0.6 ? 0 : 1];
        push(s.region, keyOf(soldier, sh), s.x + dx, s.y - TILE, 2, 'war band', { skirmish: true });
        push(s.region, keyOf(worker, sh), s.x + dx, s.y + TILE, 3, 'war band', { skirmish: true });
      });
    }
    return n;
  },

  // ---- the way down and the way up ------------------------------------------------------------------------------

  _h424NearEntrance() {
    if (this._insideRoom || !this._hiveEntrances) return null;
    for (const e of this._hiveEntrances) if (Math.hypot(e.x - this.world.x, e.y - this.world.y) < TILE * 2.4) return e;
    return null;
  },

  _h424NearExit() {
    const room = this._insideRoom;
    if (!room || !room.hive || !room._h424) return null;
    for (const x of room._h424.exits) if (Math.hypot(x.x - this.world.x, x.y - this.world.y) < TILE * 1.8) return x;
    return null;
  },

  _h424Enter(ent) {
    const room = HIVE_ROOM_BY_ID[ent.hive];
    if (!room) return false;
    this._stampRealm(room);
    this._h424BuildInside(room);
    this._realmReturn = { x: ent.out.x, y: ent.out.y, room: null };
    this._lastOutdoorPos = { x: ent.out.x, y: ent.out.y };
    const at = room.hiveEntry(ent.side);
    this._insideRoom = room;
    this.world.x = at.x; this.world.y = at.y;
    this._roomView(room);
    const pp = isoProject(at.x, at.y);
    const cam = this.cameras && this.cameras.main;
    if (this.playerSprite) this.playerSprite.setPosition(pp.x, pp.y);
    if (cam) { cam.centerOn(pp.x, pp.y); if (this.playerSprite) cam.startFollow(this.playerSprite, true, 0.12, 0.12); }
    this._updateGroundViewport(true);
    this._updateForestViewport(true);
    this._updateRockViewport(true);
    if (this._updateStaticViewport) this._updateStaticViewport(true);
    this._updateFloraViewport(true);
    this._showLocationBanner(room.name);
    this._doorCooldown = 0.5;
    return true;
  },

  _h424Leave() {
    if (!this._realmReturn) return false;
    this._leaveAstralRealm();
    return true;
  },

  /** The underground's decoration, solids, packs and queens -- once, the first time anyone goes down. */
  _h424BuildInside(room) {
    if (room._h424) return room._h424;
    const C = hiveContentsFor(room.hive);
    const spec = HIVES[room.hive];
    const toWorld = (t) => ({ x: room.x + (t.tx + 0.5) * TILE, y: room.y + (t.ty + 0.5) * TILE });
    const made = { props: [], exits: [], groups: [] };
    this.interiorSolids = this.interiorSolids || [];
    for (const p of C.props) {
      const w = toWorld(p);
      const s = this._h424Sprite(p.key, w.x, w.y, NEST_PROP_SCALE);
      if (s) {
        // floor things lie under whoever walks over them
        if (p.key === 'tunnel_hole_floor' || p.key === 'honeydew_pool') s.setDepth(isoDepth(w.x, w.y) - 40);
        made.props.push(s);
      }
      if (p.solid) this.interiorSolids.push({ x: w.x, y: w.y, radius: TILE * 0.42, hive: room.hive });
      if (p.exit) made.exits.push({ x: w.x, y: w.y - TILE, side: p.side });
    }
    if (!this.spawnGroups) this.spawnGroups = [];
    const push = (key, at, count, label, extra = {}) => {
      if (!MONSTER_TYPES[key]) return;
      const g = { region: spec.region, realm: room.id, key, x: at.x, y: at.y, homeX: at.x, homeY: at.y, count,
        tier: monsterThreatTier(key), label, roams: false, awake: false, cooldown: 0, members: [],
        spread: TILE * 1.6, hiveGroup: true, ...extra };
      this.spawnGroups.push(g);
      made.groups.push(g);
    };
    for (const g of C.groups) push(g.key, toWorld(g), g.count, g.chamber === 'war' ? 'war front' : `${g.kind} colony`);
    for (const q of C.queens) push(q.key, toWorld(q), 1, q.kind === 'ant' ? 'ant queen' : 'termite queen', { queen: true });
    room._h424 = made;
    return made;
  },

  // ---- behaviour --------------------------------------------------------------------------------------------------

  /** The living hive monsters, once per frame (the war seek scans these, not the whole roster). */
  _h424Alive() {
    const f = this.game && this.game.loop ? this.game.loop.frame : 0;
    if (this._h424AliveF !== f || !this._h424AliveList) {
      this._h424AliveF = f;
      this._h424AliveList = (this.monsters || []).filter(m => m.alive && m.type && m.type.hive);
    }
    return this._h424AliveList;
  },

  /**
   * Called from the monster loop for a hive monster. Returns true when it has done this monster's moving and fighting
   * for the frame (the loop then only ticks its cooldown, its dots and its sprite).
   */
  _h424MonsterTick(m, dt) {
    const t = m.type;
    const pd = Math.hypot(this.world.x - m.wx, this.world.y - m.wy);
    if (t.hiveRole === 'queen') {
      // She holds her chamber: past her leash she breaks off and goes home.
      const sp = m.spawnPoint;
      if (sp && m.state === 'chase' && Math.hypot(m.wx - sp.x, m.wy - sp.y) > TILE * QUEEN_LEASH_TILES) m.state = 'wander';
      // ...and while she fights, she lays.
      if (m.state === 'chase') {
        m._broodT = (m._broodT === undefined ? 3 : m._broodT) - dt;
        m._brood = (m._brood || []).filter(b => b.alive);
        if (m._broodT <= 0 && m._brood.length < BROOD_MAX) {
          m._broodT = BROOD_EVERY_S;
          const line = HIVE_LINE[t.hiveKind];
          const n = Math.random() < 0.7 ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const fam = Math.random() < 0.7 ? line[0] : line[1];
            const a = Math.random() * Math.PI * 2;
            const x = m.wx + Math.cos(a) * (t.radius + 18), y = m.wy + Math.sin(a) * (t.radius + 18);
            if (this._collidesObstacle(x, y, 10)) continue;
            const b = this._spawnMonster(keyOf(fam, t.shade), x, y, null);
            if (b) { b.state = 'chase'; b.brood = true; m._brood.push(b); }
          }
          if (this._floatText) this._floatText(m.wx, m.wy - 60, 'The queen lays', '#e8c070');
        }
      }
      return false;
    }
    // THE WAR. Not while the player is what it is after (the player always outranks the other colony), and only
    // against the other line.
    if (m.state === 'chase' || pd < t.aggro) return false;
    let foe = null, best = TILE * WAR_SEEK_TILES;
    for (const o of this._h424Alive()) {
      if (o === m || o.type.hiveKind === t.hiveKind) continue;
      const d = Math.hypot(o.wx - m.wx, o.wy - m.wy);
      if (d < best) { best = d; foe = o; }
    }
    if (!foe) return false;
    const dx = foe.wx - m.wx, dy = foe.wy - m.wy;
    const d = Math.hypot(dx, dy) || 1;
    const contact = (t.radius || 0) + (foe.type.radius || 0) + 4;
    if (d > contact) {
      const spd = t.speed * (this._monsterSpeedMult ? this._monsterSpeedMult(m) : 1);
      const nx = m.wx + (dx / d) * spd * dt, ny = m.wy + (dy / d) * spd * dt;
      if (!this._collidesObstacle(nx, ny, t.radius) && !this._isWaterAt(nx, ny)) { m.wx = nx; m.wy = ny; }
      m.moving = true;
    } else {
      m.moving = false;
      if (!(m.atkCd > 0)) {
        m.atkCd = t.atkCooldown;
        m.attackT = 0.3;
        m.lungeX = dx / d; m.lungeY = dy / d;
        this._damageMonster(foe, Math.max(1, Math.round(m.dmg || t.dmg)), false, true);
        this._hiveWarHits = (this._hiveWarHits || 0) + 1;
      }
    }
    m.facing = facingFromMove(dx, dy) || m.facing;
    return true;
  },

  /** A spent war band comes back after a few minutes rather than the day an ordinary pack stays cleared. */
  _h424Tick() {
    // ROUND 425 -- the hive lines' sheets are large, and fetched on demand they arrived seconds after the player was
    // already down in the warren (seen in Ontaria: grubs and soldiers alive and undrawn for 6 s). Near an entrance
    // (16 tiles) the line that lives below is fetched ahead, the way a sleeping pack's art is (`_prefetchLazyArt`).
    if (this._hiveEntrances && !this._insideRoom && this._ensureFamilyArt && (this._h425PfT = (this._h425PfT || 0) + 1) % 30 === 0) {
      for (const e of this._hiveEntrances) {
        if (Math.hypot(e.x - this.world.x, e.y - this.world.y) > TILE * 16) continue;
        const hv = HIVE_LIST.find(h => h.id === e.hive);
        const kinds = hv ? (hv.sides ? hv.sides.map(sd => sd.kind) : [hv.kind]) : [e.kind];
        for (const k of new Set(kinds)) for (const role of ['Grub', 'Worker', 'Soldier', 'Queen']) this._ensureFamilyArt(`${k}${role}`, false);
      }
    }
    if (!this.spawnGroups || !this._hiveSkirmish || !this._hiveSkirmish.length) return;
    const now = this._clockT || 0;
    for (const g of this.spawnGroups) {
      if (!g.skirmish || g.clearedUntil === undefined) continue;
      if (g.clearedUntil > now + SKIRMISH_RESPAWN_S) g.clearedUntil = now + SKIRMISH_RESPAWN_S;
    }
  },

  /** For the suite and the notes. */
  _h424Stats() {
    const alive = (this.monsters || []).filter(m => m.alive && m.type && m.type.hive);
    return {
      sites: (this._hiveSites || []).length, entrances: (this._hiveEntrances || []).length,
      skirmish: (this._hiveSkirmish || []).length,
      groups: (this.spawnGroups || []).filter(g => g.hiveGroup).length,
      alive: alive.length, ants: alive.filter(m => m.type.hiveKind === 'ant').length,
      termites: alive.filter(m => m.type.hiveKind === 'termite').length,
      warHits: this._hiveWarHits || 0,
      byRegion: Object.fromEntries(HIVE_LIST.map(h => [h.region, (this._hiveSites || []).filter(s => s.hive === h.id).map(s => s.kind + (s.main ? '*' : '')).join(',')])),
    };
  },
};
