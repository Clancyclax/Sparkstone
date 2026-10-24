// ============================================================================
// ROUND 362 -- THE OTHER ADVENTURERS, IN THE WORLD. The cast, the teams and the
// rules are src/data/adventurers.js.
//
// A UNIT is one of the six who start alone (`solo:<id>`) or one of the eight
// teams (`team:<id>`). Units live off-screen as state on `player.adv`, and are
// put into the world only around the player:
//
//   at a board        a lone adventurer (or a team) reading the board in the day, then heading out
//   in an act-3 city  a team walking in to the Society hall, or out of it to work
//   in the field      a unit hunting near the player, fighting whatever is there
//   in the surge      teams (and the region's own lone adventurers) on the line beside the player
//
// They fight monsters the way the guards do (both ways, by fractions of each
// other's health so ranks read right), cast their named abilities with the spell
// art, bark in passing and talk on E (round 369: in first person; their story is told by others). What the player does moves their
// bond and rivalry with each unit (adventurers.js `stanceOf`):
//   a friendly word, saving one of them in a fight            -> bond
//   needling them, taking a kill they were winning, a race     -> rivalry
// A rival races you for a purse, and takes more of the board's contracts.
//
// Off-screen, once a game day: a team the player has met may lose someone
// (adventurers.js ADV_LOSS); the next time you meet them they are somber, and the
// first of them you talk to tells you what went wrong.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { RANK_ORDER } from '../data/ranks.js';
import { REGIONS, regionAt } from '../data/regions.js';
import { REGION_ACT, SURGE_REGIONS } from '../data/acts.js';
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import { hunterStats } from '../data/hunters.js';
import { ADVENTURER_ART, ADV_ART_KINDS } from '../data/adventurerArtManifest.js';   // ROUND 365 -- their own sprites
import { pickSpellFx } from '../data/spellFx.js';
import { pickAuraFx, auraScale, auraFrame } from '../data/auraFx.js';   // ROUND 371 -- their auras
import { ESSENCES } from '../data/abilities.js';
import { grantCoins, spendCoins, coinPurseValue } from '../data/inventory.js';
import {
  ADVENTURERS, ADV_BY_ID, ADV_TEAMS, ADV_TEAM_BY_ID, EARLY_ADVENTURERS, ADV_FORM_ACT, ADV_TEAM_ACT,
  advArtKey, advArtFrame, advSpriteSize, advStandModels, teamNameFor, stanceOf, boardClaims, ADV_RACE, ADV_LOSS, lossChance, lossTelling,
  MOURNING_BARKS, FIGHT_BARKS, SURGE_BARKS, STEAL_BARKS, SAVED_BARKS, advRng,
} from '../data/adventurers.js';
import {
  advGreeting, advSmallTalk, advOriginTales, advMet, advKnown, advMarkMet, advMarkKnown, advMigrateMet,
  advAskList, advClerkTelling, advTeammateOptions, advTeammateTelling,
} from '../data/advTalk.js';   // ROUND 369 -- first person to your face; their story from someone else

const NEAR_TILES = 5;           // a bark in passing
const DESPAWN_TILES = 62;       // gone when the player is this far off
const ENGAGE_TILES = 10;        // they go for a monster this close to them
const ENC_GAP = [70, 150];      // seconds between encounters
const ENC_GAP_SURGE = [30, 65];
const STAND_COLOR = { friend: '#a5d6a7', neutral: '#e0e0e0', rival: '#ef9a9a' };

const rankIdxOf = (r) => Math.max(0, RANK_ORDER.indexOf(r || 'iron'));
// ROUND 371 -- an adventurer's aura: its reach by rank (iron and up have one), and the colour of their first essence
const ADV_AURA_R = [0, 72, 92, 116, 140, 166];
const ADV_AURA_RETRACT = 0.22;   // the faint glow an aura is pulled into in a town (the player's own is round 121's)
function advAuraColor(a) {
  for (const id of (a.essences || [])) {
    const e = ESSENCES[id] || ESSENCES[`ess${String(id).charAt(0).toUpperCase()}${String(id).slice(1)}`];
    if (e && e.color) return e.color;
  }
  return '#9fd3ff';
}
const first = (name) => String(name || '').split(' ')[0];

export const AdventurersMixin = {
  // ------------------------------------------------------------------ state
  _advState() {
    const p = this.player;
    if (!p.adv || p.adv.v !== 1) {
      p.adv = { v: 1, day: null, formed: null, dead: {}, rel: {}, teamNames: {}, mourning: {}, race: null, encT: 40, seen: {} };
    }
    const st = p.adv;
    advMigrateMet(p);   // ROUND 369 -- a save from before `player.advMet`: the lone ones you had talked to
    // the teams that exist from the start are named on the first look
    const taken = new Set(Object.values(st.teamNames));
    for (const t of ADV_TEAMS) {
      if (st.teamNames[t.id]) continue;
      if (t.founders && !st.formed) continue;
      st.teamNames[t.id] = teamNameFor(t, this._advSeed(), ESSENCE_CATALOG, REGIONS, taken);
    }
    return st;
  },

  _advSeed() { return (this._shopSeed ? this._shopSeed() : 0) || 'sparkstone'; },

  _advAlive(id) { return !this._advState().dead[id]; },

  /** The units: { key, kind: 'solo'|'team', id, name, members:[adventurer], team? }. */
  _advUnit(key) {
    const st = this._advState();
    const [kind, id] = String(key).split(':');
    if (kind === 'solo') {
      const a = ADV_BY_ID[id];
      return a ? { key, kind, id, name: a.name, members: [a] } : null;
    }
    const t = ADV_TEAM_BY_ID[id];
    if (!t) return null;
    return { key, kind: 'team', id, team: t, name: st.teamNames[t.id] || 'a team', members: t.members.map(m => ADV_BY_ID[m]).filter(a => a && !st.dead[a.id] && !(this._leadJoined && this._leadJoined(a.id))) };   // ROUND 374 -- nor the ones who follow you
  },

  _advRel(key) {
    const st = this._advState();
    st.rel[key] = st.rel[key] || { bond: 0, rivalry: 0, met: 0, story: 0, kindDay: -1, needleDay: -1, stealT: 0 };
    return st.rel[key];
  },

  /** Which units can be met in this region right now. */
  _advUnitsHere(regionId) {
    const st = this._advState();
    const act = REGION_ACT[regionId];
    const surge = this._surging && this._surging() && SURGE_REGIONS.includes(regionId);
    const out = [];
    for (const a of EARLY_ADVENTURERS) {
      if (st.dead[a.id]) continue;
      if (this._leadJoined && this._leadJoined(a.id)) continue;   // ROUND 374 -- walking with you now
      if (a.early.joins && st.formed) continue;               // they are with their team now
      if (a.early.home === regionId) out.push(`solo:${a.id}`);
    }
    for (const t of ADV_TEAMS) {
      if (t.founders && !st.formed) continue;
      const here = (act !== undefined && act >= ADV_TEAM_ACT && t.regions.includes(regionId)) || surge;
      if (here) out.push(`team:${t.id}`);
    }
    return out.filter(k => { const u = this._advUnit(k); return u && u.members.length; });
  },

  // --------------------------------------------------------------- the day
  _advDayTick() {
    const st = this._advState();
    const day = this._dayIndex ? this._dayIndex() : 0;
    if (st.day === null) { st.day = day; return; }
    if (day <= st.day) return;
    const from = Math.max(st.day + 1, day - 30);   // a long absence counts the last month only
    st.day = day;
    const surging = !!(this._surging && this._surging());
    for (let d = from; d <= day; d++) {
      for (const t of ADV_TEAMS) {
        if (t.founders && !st.formed) continue;
        const rel = st.rel[`team:${t.id}`];
        if (!rel || !rel.met) continue;   // they only lose people once you know them, so you see the before and the after
        const alive = t.members.filter(id => !st.dead[id] && !(this._leadJoined && this._leadJoined(id)));   // ROUND 374 -- your followers are not theirs to lose
        if (alive.length <= ADV_LOSS.minTeam) continue;
        const rng = advRng(`${this._advSeed()}|day|${d}|${t.id}`);
        if (rng() >= lossChance(t.feel, surging)) continue;
        const who = alive[Math.floor(rng() * alive.length)];
        const region = surging ? (SURGE_REGIONS.find(r => t.regions.includes(r)) || t.regions[0]) : t.regions[Math.floor(rng() * t.regions.length)];
        st.dead[who] = { day: d, team: t.id, region, surge: surging };
        st.mourning[t.id] = { who, day: d, told: false, region, surge: surging };
      }
    }
    for (const [tid, m] of Object.entries(st.mourning)) if (day - m.day > ADV_LOSS.mournDays && m.told) delete st.mourning[tid];
  },

  /** "By region 3 ... some of the characters met in regions 1 and 2 should have formed into teams." */
  _advCheckFormed() {
    const st = this._advState();
    if (st.formed) return;
    const rid = this.currentRegion && this.currentRegion.id;
    if (!rid || !(REGION_ACT[rid] >= ADV_FORM_ACT)) return;
    st.formed = (this._dayIndex ? this._dayIndex() : 0) || 1;
    const taken = new Set(Object.values(st.teamNames));
    for (const t of ADV_TEAMS) if (t.founders && !st.teamNames[t.id]) st.teamNames[t.id] = teamNameFor(t, this._advSeed(), ESSENCE_CATALOG, REGIONS, taken);
  },

  // ------------------------------------------------------------ per frame
  _updateAdventurers(dt) {
    try {
      if (this._leadTick) this._leadTick(dt);   // ROUND 374 -- the followers' clock runs indoors too
      this._advUpdate(dt);
    } catch (e) {
      if (!this._advErrLogged) { this._advErrLogged = true; console.warn('[adventurers]', e); }
    }
  },

  _advUpdate(dt) {
    const p = this.player;
    if (!p || !this.currentRegion) return;
    const st = this._advState();
    this._advT = (this._advT || 0) + dt;
    if (this._advT > 1) { this._advT = 0; this._advDayTick(); this._advCheckFormed(); }
    this._advRaceTick(dt);
    const away = this._insideRoom || this._overworldOpen || this._act0Running || this._preGameHold;
    if (away) { this._advClearAll(); return; }
    const ents = this._advEnts || [];
    for (const e of ents) this._advStep(e, dt);
    // gone when far, or arrived where they were going
    for (const e of ents) {
      const d = Math.hypot(e.x - this.world.x, e.y - this.world.y);
      if (d > DESPAWN_TILES * TILE || e.done) this._advDespawn(e);
    }
    this._advEnts = (this._advEnts || []).filter(e => !e.gone);
    if (this._dialogueOpen || this._creatorOpen) return;
    // the next encounter
    st.encT = (st.encT == null ? 40 : st.encT) - dt;
    if (st.encT > 0 || this._advEnts.length) return;
    const surge = !!(this._surging && this._surging());
    const gap = surge ? ENC_GAP_SURGE : ENC_GAP;
    st.encT = gap[0] + Math.random() * (gap[1] - gap[0]);
    this._advEncounter(surge);
  },

  /** Choose who, and where. */
  _advEncounter(surge) {
    const st = this._advState();
    const rid = this.currentRegion.id;
    const keys = this._advUnitsHere(rid);
    if (!keys.length) return null;
    // the least recently seen first, so the cast turns over
    keys.sort((a, b) => (st.seen[a] || -1) - (st.seen[b] || -1) + (Math.random() - 0.5) * 2);
    const key = keys[0];
    const unit = this._advUnit(key);
    const hours = this._gameHours == null ? 12 : this._gameHours;
    const day = hours >= 7 && hours < 20;
    // 1) a board nearby, in the day: they are reading it
    const board = day && (this.questBoards || []).find(b => b && b.settlement && Math.hypot(b.x - this.world.x, b.y - this.world.y) < 24 * TILE
      && (unit.kind === 'team' || (unit.members[0].early && unit.members[0].early.haunts.includes(b.settlement))));
    if (board && !surge) return this._advSpawnUnit(unit, { x: board.x + TILE * 1.5, y: board.y + TILE * 1.5 }, 'board', { leave: this._advFieldPoint(board, 50) });
    // 2) an act-3 city: a team walks in to the hall, or out of it
    const hall = unit.kind === 'team' && this._advNearHallDoor(30);
    if (hall && !surge) {
      if (Math.random() < 0.6) {
        const from = this._advFieldPoint(hall, 26);
        return this._advSpawnUnit(unit, from, 'arrive', { goal: hall });
      }
      return this._advSpawnUnit(unit, hall, 'depart', { goal: this._advFieldPoint(hall, 60) });
    }
    // 3) the field: near something to fight, if there is something
    const prey = (this.monsters || []).filter(m => m && m.alive && !m.person && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) < 26 * TILE);
    let at;
    if (prey.length) {
      const m = prey[Math.floor(Math.random() * prey.length)];
      const a = Math.atan2(m.wy - this.world.y, m.wx - this.world.x);
      at = this._advLand(m.wx + Math.cos(a) * 9 * TILE, m.wy + Math.sin(a) * 9 * TILE);
    } else {
      at = this._advFieldPoint({ x: this.world.x, y: this.world.y }, 18);
    }
    if (!at) return null;
    return this._advSpawnUnit(unit, at, surge ? 'surge' : 'hunt', { goal: this._advFieldPoint({ x: this.world.x, y: this.world.y }, 45) });
  },

  /** The Society hall door nearest the player, if one is within `tiles`. */
  _advNearHallDoor(tiles) {
    let best = null, bd = tiles * TILE;
    for (const d of (this.doorways || [])) {
      if (d.kind !== 'enter' || !d.room) continue;
      const b = (this.buildings || []).find(x => x.civic === 'guild' && x.singleton && d.room.building === x.singleton);
      if (!b) continue;
      const dist = Math.hypot(d.x - this.world.x, d.y - this.world.y);
      if (dist < bd) { bd = dist; best = { x: d.x, y: d.y }; }
    }
    return best;
  },

  /** Somewhere dry and clear about `tiles` from `c`. */
  _advFieldPoint(c, tiles) {
    const th0 = Math.random() * Math.PI * 2;
    for (let i = 0; i < 16; i++) {
      const th = th0 + i * 0.41;
      const r = tiles * TILE * (0.85 + (i % 3) * 0.1);
      const at = this._advLand(c.x + Math.cos(th) * r, c.y + Math.sin(th) * r);
      if (at) return at;
    }
    return null;
  },
  _advLand(x, y) {
    if (this._isWaterAt && this._isWaterAt(x, y)) return null;
    if (this._collidesObstacle && this._collidesObstacle(x, y, 14)) return null;
    const r = regionAt(x, y);
    if (!r || (this.currentRegion && r.id !== this.currentRegion.id)) return null;
    return { x, y };
  },

  // ------------------------------------------------------------- spawning
  _advSpawnUnit(unit, at, mode, opts = {}) {
    if (!unit || !at) return null;
    const st = this._advState();
    st.seen[unit.key] = this._dayIndex ? this._dayIndex() : 0;
    const made = [];
    const n = unit.members.length;
    unit.members.forEach((a, i) => {
      const off = i === 0 ? { x: 0, y: 0 } : { x: Math.cos(i * 2.1) * (1.2 + i * 0.35) * TILE, y: Math.sin(i * 2.1) * (1.2 + i * 0.35) * TILE };
      let x = at.x + off.x, y = at.y + off.y;
      if ((this._isWaterAt && this._isWaterAt(x, y)) || (this._collidesObstacle && this._collidesObstacle(x, y, 12))) { x = at.x; y = at.y; }
      const e = this._advMakeEnt(a, unit, x, y, i === 0, mode, opts, i, n);
      if (e) made.push(e);
    });
    if (!made.length) return null;
    this._advEnts = (this._advEnts || []).concat(made);
    return made;
  },

  _advMakeEnt(a, unit, x, y, lead, mode, opts, i) {
    // ROUND 365 -- their own sheets (ADVENTURER_ART), fetched the first time they are needed. Until a sheet has landed
    // (a fraction of a second on a local server) the shared stand-in from round 362 is drawn, and swapped out in
    // `_advDraw` the moment the art is in. A key with no sheet at all keeps the stand-in and is logged once.
    const artKey = advArtKey(a);
    const ownReady = this._advEnsureArt(artKey);
    const stand = advStandModels(a).find(k => this.textures.exists(k));
    const key = ownReady ? `${artKey}_idle` : stand;
    if (!key) return null;
    const own = !!ownReady;
    const oa = own ? ADVENTURER_ART[artKey].idle : null;
    const art = own ? { footX: oa.fx, footY: oa.fy, cell: oa.cell, scale: 1 } : (NPC_ART[key] || { footX: 32, footY: 63, scale: 1 });
    const pr = isoProject(x, y);
    const sprite = this.add.sprite(pr.x, pr.y, key, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    // a stand-in for one of the tall natures is drawn a quarter larger (round 363); their own art at its packed scale
    sprite.setScale(own ? (ADVENTURER_ART[artKey].scale || 1) : (art.scale || 1) * (advSpriteSize(a) > 64 ? advSpriteSize(a) / 64 : 1));
    sprite.setDepth(isoDepth(x, y));
    const ri = rankIdxOf(a.rank);
    const stat = hunterStats(ri, lead);
    const st = this._advState();
    const stance = stanceOf(this._advRel(unit.key));
    // the lead carries the team's name; the rest show theirs only up close (a team of six labels is a wall of text)
    const label = this.add.text(pr.x, pr.y - 60, unit.kind === 'team' && lead ? `${a.name} · ${st.teamNames[unit.id] || ''}` : a.name, {
      fontSize: '10px', color: STAND_COLOR[stance], stroke: '#000', strokeThickness: 3, align: 'center',
    });
    label.setOrigin(0.5, 1);
    label.setDepth(999000);   // over the props, under the spoken lines
    const e = {
      uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
      adv: a, unit, key: unit.key, lead, i, name: a.name, sprite, label, artKey: key,
      x, y, hp: stat.hp, maxHp: stat.hp, rankIdx: ri, speed: (stat.speed || 120) * 0.8,
      ownArt: own ? artKey : null, wantArt: ADVENTURER_ART[artKey] ? artKey : null, animKind: 'idle', animT: 0, deathT: 0,
      mode, goal: opts.goal || null, leave: opts.leave || null, idleT: mode === 'board' ? 25 + Math.random() * 20 : 0,
      swingT: 0.6 + Math.random() * 0.6, castT: 3 + Math.random() * 4, barkT: 0, wardT: 0, downT: 0,
      facing: 'south', alive: true, adventurer: true,
    };
    // talk: the same proximity door every NPC uses, following them like a guard's entry
    e.npc = { name: a.name, x, y, adventurer: e, reach: 62, artKey: key };
    if (this.npcs) this.npcs.push(e.npc);
    return e;
  },

  _advDespawn(e) {
    if (e.gone) return;
    e.gone = true;
    if (e.aura) { if (e.aura._near) e.aura._near.destroy(); e.aura.destroy(); e.aura = null; }   // ROUND 371
    if (e.sprite) e.sprite.destroy();
    if (e.label) e.label.destroy();
    if (this.npcs && e.npc) this.npcs = this.npcs.filter(n => n !== e.npc);
    if (this.nearNpc === e.npc) this.nearNpc = null;
  },

  _advClearAll() {
    for (const e of (this._advEnts || [])) this._advDespawn(e);
    this._advEnts = [];
  },

  // --------------------------------------------------------------- the AI
  _advStep(e, dt) {
    if (e.gone) return;
    e.swingT -= dt; e.castT -= dt; e.barkT -= dt; e.wardT = Math.max(0, e.wardT - dt);
    // downed: they get back up (a teammate pulls them up sooner)
    if (e.downT > 0) {
      e.downT -= dt * (e.unit.kind === 'team' ? 1.6 : 1);
      if (e.downT <= 0) { e.hp = Math.round(e.maxHp * 0.5); e.deathT = 0; this._sayOverhead(e, 'Still here.', '#cfd8dc', 2); }
      this._advDraw(e, false, dt);
      return;
    }
    const lead = (this._advEnts || []).find(x => x.key === e.key && x.lead && !x.gone) || e;
    // a monster in reach of them, theirs or the player's
    let t = e.target && e.target.alive ? e.target : null;
    if (!t || Math.hypot(t.wx - e.x, t.wy - e.y) > ENGAGE_TILES * 1.5 * TILE) {
      t = null;
      let bd = ENGAGE_TILES * TILE;
      for (const m of (this.monsters || [])) {
        if (!m || !m.alive || m.person || m.despawned) continue;
        const d = Math.hypot(m.wx - e.x, m.wy - e.y);
        if (d < bd) { bd = d; t = m; }
      }
    }
    e.target = t;
    let moving = false;
    if (t) {
      const ranged = ['ranged', 'caster', 'healer', 'support'].includes(e.adv.role);
      const reach = (ranged ? 150 : 40) + ((t.type && t.type.radius) || 14);
      const d = Math.hypot(t.wx - e.x, t.wy - e.y);
      e.facing = facingFromMove(t.wx - e.x, t.wy - e.y) || e.facing;
      if (d > reach) moving = this._personStep(e, t.wx, t.wy, e.speed * dt);
      else if (e.swingT <= 0) {
        e.swingT = 1.1 + Math.random() * 0.4;
        this._advHit(e, t, 1);
        e.atkAnim = e.ownArt ? 0.64 : 0.35;   // ROUND 365 -- eight attack frames want a little longer than the stand-in's one
      }
      if (e.castT <= 0) { e.castT = 6 + Math.random() * 4; this._advCast(e, t); }
      if (e.barkT <= 0 && Math.random() < 0.02) this._advBark(e, 'fight');
      this._advTakeBlows(e, t, d, reach);
    } else {
      // no fight: the lead goes where the unit is going, the rest follow the lead
      let goal = null;
      if (e === lead) {
        if (e.mode === 'board') {
          e.idleT -= dt;
          if (e.idleT <= 0) { e.mode = 'hunt'; e.goal = e.leave; }
        } else goal = e.goal;
      } else {
        goal = { x: lead.x + Math.cos(e.i * 2.1) * 1.6 * TILE, y: lead.y + Math.sin(e.i * 2.1) * 1.6 * TILE };
        if (Math.hypot(goal.x - e.x, goal.y - e.y) < 0.8 * TILE) goal = null;
      }
      if (goal) {
        const d = Math.hypot(goal.x - e.x, goal.y - e.y);
        if (d > 18) {
          moving = this._personStep(e, goal.x, goal.y, e.speed * dt);
          e.facing = facingFromMove(goal.x - e.x, goal.y - e.y) || e.facing;
        } else if (e === lead && (e.mode === 'arrive')) {
          // in through the hall door: the team goes in after them
          for (const x of this._advEnts) if (x.key === e.key) x.done = true;
        } else if (e === lead) {
          e.goal = null;
        }
      }
      // in passing: a word when the player walks by
      const dp = Math.hypot(this.world.x - e.x, this.world.y - e.y);
      if (dp < NEAR_TILES * TILE && e.barkT <= 0 && e === lead) this._advBark(e, 'greet');
      if (!moving && e.mode !== 'board' && !e.goal && e === lead && dp > 20 * TILE) e.goal = this._advFieldPoint(e, 30);
    }
    this._advDraw(e, moving, dt);
  },

  _advDraw(e, moving, dt) {
    const pr = isoProject(e.x, e.y);
    e.sprite.setPosition(pr.x, pr.y);
    e.sprite.setDepth(isoDepth(e.x, e.y));
    this._advAura(e, pr, dt);   // ROUND 371
    // ROUND 365 -- with their own art, a fall is the Death clip (played once, the last frame held), not a fade
    if (!e.ownArt && e.wantArt && this._advArtReady(e.wantArt)) {
      e.ownArt = e.wantArt;
      e.sprite.setScale(ADVENTURER_ART[e.ownArt].scale || 1);
    }
    if (e.ownArt) {
      this._advArtTouch(e.ownArt);
      e.sprite.setAlpha(1);
      if (e.label) {
        e.label.setPosition(pr.x, pr.y - this._advLabelLift(e));
        e.label.setVisible(e.lead || Math.hypot(this.world.x - e.x, this.world.y - e.y) < NEAR_TILES * TILE);
      }
      if (e.npc) { e.npc.x = e.x; e.npc.y = e.y; }
      this._advAnimate(e, moving, dt);
      return;
    }
    e.sprite.setAlpha(e.downT > 0 ? 0.5 : 1);
    if (e.label) {
      e.label.setPosition(pr.x, pr.y - 62);
      e.label.setVisible(e.lead || Math.hypot(this.world.x - e.x, this.world.y - e.y) < NEAR_TILES * TILE);
    }
    if (e.npc) { e.npc.x = e.x; e.npc.y = e.y; }
    if (e.atkAnim > 0 && this._npcAttackFrame) {
      e.atkAnim = Math.min(e.atkAnim, 0.35);
      e.atkAnim -= dt;
      if (this._npcAttackFrame(e, e.artKey, e.facing, 1 - Math.max(0, e.atkAnim) / 0.35)) return;
    }
    if (this._npcWalkFrame) this._npcWalkFrame(e, e.artKey, e.facing || 'south', moving, dt);
  },

  /**
   * ROUND 371 -- "When the player gains their aura ability they should see the auras of other adventurers when they
   * encounter them outside town. Additionally other adventurers should auto retract their auras when they enter the
   * city."
   *
   * Seen only once the player has an aura of their own (an aura is a thing you learn to feel by having one), and only
   * on an adventurer of iron rank or better (a normal-rank one has none). Each one's look is their own (auraFx.js,
   * seeded on who they are) in the colour of their first essence, its reach by rank. In a settlement it is pulled in
   * to the faint glow the player's own retracts to, on the same quick tween; out of one it is projected.
   */
  _advAura(e, pr, dt) {
    const pm = this.player && this.player.passiveMods;
    const feels = !!(pm && pm.auras && pm.auras.length);
    const r = ADV_AURA_R[e.rankIdx] || 0;
    if (!feels || !r || e.downT > 0 || this._insideRoom) {
      if (e.aura) { e.aura.setVisible(false); if (e.aura._near) e.aura._near.setVisible(false); }
      return;
    }
    if (!e.aura) {
      const look = pickAuraFx({ name: `${e.adv.name} aura`, color: advAuraColor(e.adv) }, `adv|${e.adv.id}`);
      if (!look || !this.textures.exists(look.key)) return;
      const ring = this.add.sprite(pr.x, pr.y, look.key, look.frame0 || 0);
      const sc = auraScale(look, r);
      ring._fullScaleX = sc.x; ring._fullScaleY = sc.y; ring._fullAlpha = look.tint ? 0.5 : 0.45;
      ring.setScale(sc.x * ADV_AURA_RETRACT, sc.y * ADV_AURA_RETRACT);
      ring.setAlpha(ring._fullAlpha * 0.5);
      if (look.tint) { ring.setTint(look.tint); ring.setBlendMode('ADD'); }
      ring._fxAnim = { fx: look, t: Math.random() * 2000 };
      ring._auraR = r;
      if (this._splitAuraRing) this._splitAuraRing(ring);
      e.aura = ring;
    }
    const ring = e.aura;
    ring.setVisible(true);
    // in a town or city: retracted
    const inTown = !!(this._settlementAt && this._settlementAt(e.x, e.y));
    e.auraOut = !inTown;
    const wantX = inTown ? ring._fullScaleX * ADV_AURA_RETRACT : ring._fullScaleX;
    const wantY = inTown ? ring._fullScaleY * ADV_AURA_RETRACT : ring._fullScaleY;
    const wantA = inTown ? ring._fullAlpha * 0.5 : ring._fullAlpha;
    const k = Math.min(1, dt * 6);
    ring.setScale(ring.scaleX + (wantX - ring.scaleX) * k, ring.scaleY + (wantY - ring.scaleY) * k);
    ring.setAlpha(ring.alpha + (wantA - ring.alpha) * k);
    ring._fxAnim.t += dt * 1000;
    ring.setFrame(auraFrame(ring._fxAnim.fx, ring._fxAnim.t));
    if (this._placeAuraRing) this._placeAuraRing(ring, pr.x, pr.y, e.x, e.y);
    else { ring.setPosition(pr.x, pr.y); ring.setDepth(1); }
  },

  /** A blow on a monster, sized against the monster: ranks read right whatever the health scale. */
  _advHit(e, m, mult) {
    if (!m || !m.alive) return 0;
    const mr = this._monsterRankIndex ? this._monsterRankIndex(m) : 1;
    const frac = Math.max(0.02, Math.min(0.35, 0.07 * Math.pow(1.6, e.rankIdx - mr))) * mult;
    const dmg = Math.max(1, Math.round((m.maxHp || m.hp || 20) * frac));
    m._advEngaged = { uid: e.uid, key: e.key, t: this.time.now };
    m._advDmg = (m._advDmg || 0) + dmg;
    this._damageMonster(m, dmg, false, true);
    return dmg;
  },

  /** The monster swings back, the way a guard's does. */
  _advTakeBlows(e, m, d, reach) {
    if (!m.alive || d > reach + 10 || !(m.atkCd <= 0) || !m.type) return;
    m.atkCd = m.type.atkCooldown || 1.2;
    m.attackT = 0.35;
    m.facing = facingFromMove(e.x - m.wx, e.y - m.wy) || m.facing;
    const mr = this._monsterRankIndex ? this._monsterRankIndex(m) : 1;
    let frac = Math.max(0.02, Math.min(0.3, 0.07 * Math.pow(1.6, mr - e.rankIdx)));
    const warded = (this._advEnts || []).some(x => x.key === e.key && x.wardT > 0);
    if (warded) frac *= 0.5;
    e.hp -= Math.max(1, Math.round(e.maxHp * frac));
    if (e.hp <= 0) {
      e.hp = 0; e.downT = 14; e.target = null;
      this._floatText(e.x, e.y - 50, `${first(e.name)} is down!`, '#ffcc80');
    }
  },

  /** One of their named abilities, with the spell art. */
  _advCast(e, t) {
    const list = e.adv.abilities || [];
    if (!list.length) return;
    // ROUND 362 -- a draconian breathes: Dragon Breath, by the essences they have absorbed (natureMixin)
    if (e.adv.nature === 'draconian' && this._natureDragonBreath && Math.random() < 0.35) {
      this._natureDragonBreath(e, t.wx, t.wy, e.adv.essences, e.rankIdx, false);
      return;
    }
    // ROUND 363 -- a leonid roars: Leonid's Roar stuns what is close and leaves it taking more damage
    if (e.adv.nature === 'leonid' && this._natureRoar && Math.random() < 0.3) {
      this._natureRoar(e, e.rankIdx, false);
      return;
    }
    const team = (this._advEnts || []).filter(x => x.key === e.key && !x.gone);
    const hurt = team.filter(x => x.hp < x.maxHp * 0.6 && x.downT <= 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    let ab = null;
    if (hurt) ab = list.find(a => a.kind === 'heal');
    if (!ab) ab = list.filter(a => a.kind !== 'heal')[Math.floor(Math.random() * list.filter(a => a.kind !== 'heal').length)];
    if (!ab) return;
    const spec = { name: ab.name, element: ab.element, color: ab.color, template: ab.kind === 'nova' ? 'aoeRing' : (ab.kind === 'heal' ? 'selfHeal' : 'bolt') };
    let fx = null;
    try { fx = pickSpellFx(spec); } catch (err) { fx = null; }
    if (ab.kind === 'heal' && hurt) {
      hurt.hp = Math.min(hurt.maxHp, hurt.hp + Math.round(hurt.maxHp * 0.3));
      if (fx) this._playSpellFx(fx, hurt.x, hurt.y, 1);
    } else if (ab.kind === 'ward') {
      for (const x of team) x.wardT = 5;
      if (fx) this._playSpellFx(fx, e.x, e.y, 1.2);
    } else if (ab.kind === 'nova') {
      for (const m of (this.monsters || [])) {
        if (!m.alive || m.person || Math.hypot(m.wx - t.wx, m.wy - t.wy) > 100) continue;
        this._advHit(e, m, 1.1);
      }
      if (fx) this._playSpellFx(fx, t.wx, t.wy, 1.5);
    } else {
      this._advHit(e, t, ab.kind === 'strike' ? 1.8 : 1.6);
      if (fx) this._playSpellFx(fx, t.wx, t.wy, 1.1);
    }
    this._floatText(e.x, e.y - 66, ab.name, ab.color || '#90caf9');
  },

  _advBark(e, why) {
    e.barkT = 22 + Math.random() * 14;
    const st = this._advState();
    const rel = this._advRel(e.key);
    const stance = stanceOf(rel);
    let line;
    const team = e.unit.team;
    const mourning = team && st.mourning[team.id];
    if (mourning) line = MOURNING_BARKS[Math.floor(Math.random() * MOURNING_BARKS.length)];
    else if (why === 'fight') {
      const pool = (this._surging && this._surging()) ? SURGE_BARKS : (team ? FIGHT_BARKS[team.feel] : FIGHT_BARKS.solo);
      line = pool[Math.floor(Math.random() * pool.length)];
    } else if (!rel.met) {
      line = team ? `${st.teamNames[team.id]}. Society.` : `${e.name}. You're new.`;
    } else {
      line = team ? team.greet[stance] : (e.adv.greet && e.adv.greet[stance]);
    }
    if (line) this._sayOverhead(e, line, STAND_COLOR[stance], 3.2);
  },

  // -------------------------------------------------------------- talking
  // ROUND 369 -- "Random adventurers should talk to you in first person, they don't introduce their backstory. If you
  // want to learn their backstory you would need to talk to an NPC about them, probably at the adventures guild or
  // later on someone on their team. You don't know to ask about people you haven't met before."
  // To your face: a first-person hello (advTalk.js ADV_HELLO), then their stance line; "How's the work going?" is small
  // talk with the origin tales left out. Their story (`about`) is told by a Society clerk (`_advAskAddendum`) or by a
  // teammate ("Ask about a teammate"), and only about people the player has met (`player.advMet`). Who you have been
  // told about is `player.advKnown`; once you know, you can ask them how they got their start.
  /** E on one of them. */
  _advTalk(npc) {
    const e = npc && npc.adventurer;
    if (!e || e.gone) return;
    const st = this._advState();
    const p = this.player;
    const unit = e.unit, a = e.adv, team = unit.team;
    const rel = this._advRel(unit.key);
    const day = (this._dayIndex ? this._dayIndex() : 0) || 1;
    rel.met = rel.met || day;
    // ROUND 369 -- met is per PERSON: talking to the lead of a team is not meeting the other five
    const metBefore = advMet(p, a.id);
    advMarkMet(p, a.id, day);
    // somber, and nobody has told you yet
    const mourn = team && st.mourning[team.id];
    if (mourn && !mourn.told) {
      const dead = ADV_BY_ID[mourn.who];
      const speaker = a.id === mourn.who ? unit.members[0] : a;
      const tell = lossTelling(team, dead, speaker, mourn.region, mourn.surge, this._advSeed());
      mourn.told = true;
      return this._openDialogue(`${speaker.name} — ${st.teamNames[team.id]}`, tell.pages.join('\n\n'), npc, [
        { act: `adv|sorry|${unit.key}`, label: `I'm sorry about ${first(dead.name)}.` },
        { act: 'adv|bye', label: 'Leave them be' },
      ]);
    }
    const stance = stanceOf(rel);
    const teamName = team ? st.teamNames[team.id] : '';
    // "Told you I'd have a team" is said once, by them, and only to someone who met them before it formed
    rel.laterBy = rel.laterBy || {};
    if (rel.laterSaid && unit.kind === 'solo') rel.laterBy[a.id] = true;   // a save from before round 369
    const laterDue = metBefore && a.later && a.early && st.formed && !rel.laterBy[a.id] && (team ? a.early.joins : !a.early.joins);
    let open;
    if (laterDue) {
      rel.laterBy[a.id] = true;
      open = a.later;
    } else {
      open = advGreeting({ a, team, teamName, stance, firstMeet: !metBefore });
    }
    if (mourn) open = `${MOURNING_BARKS[1]} ${open}`;
    return this._openDialogue(team ? `${a.name} — ${teamName}` : a.name, open, npc, this._advChoices(unit, rel, a));
  },

  /** ROUND 369 -- small talk: the hunt, the board, the team. Never their origin tale (advTalk.js `advSmallTalk`). */
  _advNextStory(unit, a, rel) {
    const pool = advSmallTalk(a, unit.team);
    if (!pool.length) return `Not much to tell. Same as yesterday.`;
    const s = pool[(rel.story || 0) % pool.length];
    rel.story = (rel.story || 0) + 1;
    return s;
  },

  /** ROUND 369 -- their own origin tale, asked for, once someone has told you who they are. */
  _advNextPast(a, rel) {
    const pool = advOriginTales(a);
    if (!pool.length) return `There's not much to it, honestly.`;
    rel.pastAt = rel.pastAt || {};
    const i = rel.pastAt[a.id] || 0;
    rel.pastAt[a.id] = i + 1;
    return (i === 0 ? `Someone's been talking, then. Fine. ` : '') + pool[i % pool.length];
  },

  _advChoices(unit, rel, speaker = null) {
    const day = this._dayIndex ? this._dayIndex() : 0;
    const p = this.player;
    const who = speaker || unit.members[0];
    // ROUND 369 -- "Another story?" was the next of their stories, which began with how they got their essence
    const out = [{ act: `adv|story|${unit.key}`, label: 'How\'s the work going?' }];
    if (who && advKnown(p, who.id) && advOriginTales(who).length) out.push({ act: `adv|past|${unit.key}`, label: 'Ask how they got their start' });
    if (unit.team && who && advTeammateOptions(p, who, unit.team).length) out.push({ act: `adv|mates|${unit.key}`, label: 'Ask about a teammate' });
    if (rel.kindDay !== day) out.push({ act: `adv|kind|${unit.key}`, label: 'Wish them good hunting' });
    if (rel.needleDay !== day) out.push({ act: `adv|needle|${unit.key}`, label: 'Needle them' });
    if (!this._advState().race && (stanceOf(rel) === 'rival' || (rel.rivalry || 0) >= 2)) out.push({ act: `adv|race|${unit.key}`, label: 'Race them: first to eight kills' });
    // ROUND 374 -- "players need to navigate before they can be added to the players party"
    const lead = who && this._leadChoiceFor ? this._leadChoiceFor(who) : null;
    if (lead) out.push(lead);
    out.push({ act: 'adv|bye', label: 'Go on your way' });
    return out;
  },

  /** The dialogue buttons (wired through the one delegated handler, prefix `adv|`). */
  _advAct(act) {
    const [, op, key, arg] = String(act).split('|');
    // ROUND 369 -- the Society desk: no unit behind these
    if (op === 'ask') { this._advAskPage(); return; }
    if (op === 'about') { this._advAskAbout(key); return; }
    if (op === 'bye' || !key) { this._closeDialogue(); return; }
    const unit = this._advUnit(key);
    if (!unit) { this._closeDialogue(); return; }
    const rel = this._advRel(key);
    const day = this._dayIndex ? this._dayIndex() : 0;
    const npc = this._lastTalkNpc;
    const speaker = (npc && npc.adventurer && npc.adventurer.adv) || unit.members[0];
    const title = unit.team ? `${speaker.name} — ${unit.name}` : speaker.name;
    let text;
    let choices = null;
    if (op === 'story') text = this._advNextStory(unit, speaker, rel);
    else if (op === 'past') text = this._advNextPast(speaker, rel);
    else if (op === 'mates') {
      // ROUND 369 -- which of their own you can ask about: the ones you have met
      const ids = advTeammateOptions(this.player, speaker, unit.team);
      text = ids.length ? `Who, then?` : `You haven't met the others yet. Say hello to them first.`;
      choices = [...ids.map(id => ({ act: `adv|mate|${key}|${id}`, label: ADV_BY_ID[id].name })), { act: `adv|back|${key}`, label: 'Never mind' }];
    } else if (op === 'mate') {
      const subject = ADV_BY_ID[arg];
      if (!subject || !advTeammateOptions(this.player, speaker, unit.team).includes(arg)) text = `Who? Never mind.`;
      else {
        text = advTeammateTelling(subject, speaker, unit.team, { dead: !!this._advState().dead[arg] });
        advMarkKnown(this.player, arg);
      }
    } else if (op === 'back') text = `Anything else?`;
    else if (op === 'kind') {
      rel.kindDay = day; rel.bond = (rel.bond || 0) + 1;
      text = stanceOf(rel) === 'friend' ? `And you. Truly. Come find us any time.` : `Ha. Thanks. You too.`;
    } else if (op === 'needle') {
      rel.needleDay = day; rel.rivalry = (rel.rivalry || 0) + 1;
      text = stanceOf(rel) === 'rival' ? (speaker.raceTaunt || `Oh, it's like that? Fine. It's like that.`) : `...Right. We'll see, won't we.`;
    } else if (op === 'sorry') {
      rel.bond = (rel.bond || 0) + 1;
      text = `Thank you. Truly. Not many people say anything.`;
    } else if (op === 'race') {
      text = this._advRaceStart(unit, speaker);
    }
    this._openDialogue(title, text || '...', npc, choices || this._advChoices(unit, rel, speaker));
  },

  // ------------------------------------------------------- the Society desk
  /** ROUND 369 -- a clerk's extra button (asked by WorldScene `_societyAddendum`): only once you have met someone. */
  _advAskAddendum(npc) {
    const body = [], choices = [];
    if (!npc || npc.adventurer || !this._societyRole || this._societyRole(npc) !== 'clerk') return { body, choices };
    if (this._leadClerkChoices) for (const c of this._leadClerkChoices()) choices.push(c);   // ROUND 374 -- your people waiting in the hall
    if (!advAskList(this.player).length) return { body, choices };
    choices.push({ label: 'Ask about an adventurer', act: 'adv|ask' });
    return { body, choices };
  },

  /** The clerk's pages are opened with no npc, so the desk's own buttons are not stacked under them again. */
  _advDeskPage(text, choices) {
    const clerk = this._advAskNpc;
    if (this._talk) this._closeDialogue();   // opened from a topic tree: shut the tree first (round 351's note)
    this._openDialogue((clerk && clerk.name) || 'The Society clerk', text, null, choices);
  },

  _advAskPage() {
    const n = this._lastTalkNpc;
    if (n && !n.adventurer && this._societyRole && this._societyRole(n) === 'clerk') this._advAskNpc = n;
    const ids = advAskList(this.player);
    if (!ids.length) { this._advDeskPage(`Who? I can't look someone up if you don't know who they are.`, [{ act: 'adv|bye', label: 'Never mind' }]); return; }
    this._advDeskPage(`Which one? I can tell you what is in the Society's file. Not more than that.`,
      [...ids.map(id => ({ act: `adv|about|${id}`, label: ADV_BY_ID[id].name })), { act: 'adv|bye', label: "That's all" }]);
  },

  _advAskAbout(id) {
    const a = ADV_BY_ID[id];
    const p = this.player;
    if (!a || !advMet(p, id)) { this._advAskPage(); return; }
    const st = this._advState();
    const tid = a.team || (a.early && a.early.joins && st.formed ? a.early.joins : null);
    const teamName = tid ? (st.teamNames[tid] || 'a team') : null;
    advMarkKnown(p, id);
    this._advDeskPage(advClerkTelling(a, { teamName, dead: !!st.dead[id] }),
      [{ act: 'adv|ask', label: 'Ask about someone else' }, { act: 'adv|bye', label: "That's all" }]);
  },

  // ----------------------------------------------------------------- race
  _advRaceStart(unit, speaker) {
    const st = this._advState();
    const p = this.player;
    const purse = ADV_RACE.purseByRank[p.rank] || 120;
    const staked = coinPurseValue(p.coins || {}) >= purse && spendCoins(p.coins, purse);
    const [lo, hi] = ADV_RACE.perMinute;
    st.race = {
      key: unit.key, who: speaker.name, id: speaker.id, need: ADV_RACE.need, you: 0, them: 0, acc: 0,
      perSec: (lo + Math.random() * (hi - lo)) * (1 + 0.15 * rankIdxOf(speaker.rank)) / 60,
      left: ADV_RACE.seconds, purse: staked ? purse : 0,
    };
    this._advRaceHud();
    return `${speaker.raceTaunt || 'You\'re on.'}\n\nFirst to ${ADV_RACE.need} kills in five minutes${staked ? `, for ${purse} coin a side` : ', for pride (you could not cover the purse)'}. Go!`;
  },

  _advRaceTick(dt) {
    const st = this.player && this.player.adv;
    const r = st && st.race;
    if (!r) { this._advRaceHud(); return; }
    if (this._dialogueOpen) return;
    r.left -= dt;
    r.acc += r.perSec * dt * (0.6 + Math.random() * 0.8);
    while (r.acc >= 1) { r.acc -= 1; r.them++; }
    if (r.you >= r.need || r.them >= r.need || r.left <= 0) this._advRaceEnd();
    else this._advRaceHud();
  },

  _advRaceEnd() {
    const st = this._advState();
    const r = st.race;
    if (!r) return;
    st.race = null;
    const rel = this._advRel(r.key);
    const p = this.player;
    let msg;
    if (r.you > r.them) {
      if (r.purse) grantCoins(p.coins, 'normal', r.purse * 2);
      rel.rivalry = (rel.rivalry || 0) + 1; rel.bond = (rel.bond || 0) + 1;
      msg = `You beat ${first(r.who)}, ${r.you} to ${r.them}${r.purse ? ` (+${r.purse * 2} coin)` : ''}`;
    } else if (r.them > r.you) {
      rel.rivalry = (rel.rivalry || 0) + 1;
      msg = `${first(r.who)} beat you, ${r.them} to ${r.you}${r.purse ? ` (−${r.purse} coin)` : ''}`;
    } else {
      if (r.purse) grantCoins(p.coins, 'normal', r.purse);
      msg = `A draw with ${first(r.who)}, ${r.you} all`;
    }
    this._floatText(this.world.x, this.world.y - 70, msg, '#ffd54f');
    if (this._leadOnRace) this._leadOnRace(r.id, r.you > r.them);   // ROUND 374 -- beating them is a kind of argument
    this._advRaceHud();
    if (this._refreshCoinHud) this._refreshCoinHud();
  },

  _advRaceHud() {
    let el = document.getElementById('advRace');
    const r = this.player && this.player.adv && this.player.adv.race;
    if (!r) { if (el) el.style.display = 'none'; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'advRace';
      el.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:30;padding:4px 10px;border-radius:6px;'
        + 'background:rgba(20,16,10,.82);border:1px solid #ffd54f;color:#ffe9a8;font:600 12px system-ui,sans-serif;pointer-events:none;';
      document.body.appendChild(el);
    }
    const s = Math.max(0, Math.ceil(r.left));
    el.textContent = `Race vs ${r.who}: you ${r.you} · ${first(r.who)} ${r.them} · first to ${r.need} · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    el.style.display = 'block';
  },

  // ---------------------------------------------------- the player's kills
  /** Called from _killMonster: the race count, and a kill taken off one of them (or one of them saved). */
  _advOnKill(m, credit) {
    if (!credit || !m || m.person) return;
    const st = this.player && this.player.adv;
    if (!st) return;
    if (st.race) { st.race.you++; this._advRaceHud(); }
    const eng = m._advEngaged;
    if (!eng || this.time.now - eng.t > 4000) return;
    const e = (this._advEnts || []).find(x => x.uid === eng.uid && !x.gone);
    if (!e) return;
    const rel = this._advRel(e.key);
    if (this.time.now - (rel.stealT || 0) < 30000) return;
    const team = (this._advEnts || []).filter(x => x.key === e.key && !x.gone);
    const inTrouble = team.some(x => x.downT > 0 || x.hp < x.maxHp * 0.4);
    if (inTrouble) {
      rel.bond = (rel.bond || 0) + 1; rel.stealT = this.time.now;
      this._sayOverhead(e, SAVED_BARKS[Math.floor(Math.random() * SAVED_BARKS.length)], STAND_COLOR.friend, 3);
    } else if ((m._advDmg || 0) >= (m.maxHp || 1) * 0.25) {
      rel.rivalry = (rel.rivalry || 0) + 1; rel.stealT = this.time.now;
      this._sayOverhead(e, STEAL_BARKS[Math.floor(Math.random() * STEAL_BARKS.length)], STAND_COLOR.rival, 3);
    }
  },

  // ---------------------------------------------------------- the board
  /** Mark the contracts the region's adventurers have taken this week (a rival takes more). Idempotent. */
  _advClaimBoard(board, offers) {
    if (!board || !offers || !offers.length || !board.settlement) return;
    const region = regionAt(board.x, board.y);
    if (!region) return;
    const day = this._dayIndex ? this._dayIndex() : 0;
    const dow = day % 7;
    const st = this._advState();
    let claimed = offers.filter(o => o.takenBy).length;
    for (const key of this._advUnitsHere(region.id)) {
      const unit = this._advUnit(key);
      if (unit.kind === 'solo' && !unit.members[0].early.haunts.includes(board.settlement)) continue;
      const want = boardClaims(stanceOf(st.rel[key]), dow);
      const have = offers.filter(o => o.takenByKey === key).length;
      if (have >= want) continue;
      const rng = advRng(`${this._advSeed()}|claim|${board.settlement}|${Math.floor(day / 7)}|${key}`);
      const order = offers.map((o, i) => ({ o, r: rng() })).sort((x, y) => x.r - y.r).map(x => x.o);
      let n = have;
      for (const o of order) {
        if (n >= want || claimed >= 8) break;
        if (o.taken || o.takenBy || (o.star || 1) > 2) continue;
        o.takenBy = unit.kind === 'team' ? unit.name : unit.members[0].name;
        o.takenByKey = key;
        n++; claimed++;
      }
    }
  },

  // ===================================================================== ROUND 365 -- THEIR OWN ART
  // Four sheets per adventurer (idle, attack, run, death), packed by tools/pack_adventurers.py and listed in
  // adventurerArtManifest.js. Fetched when first needed; at most ADV_ART_CAP sets stay resident, and a set is only
  // evicted when nobody on screen is wearing it.
  _advArtState() { if (!this._advArt) this._advArt = new Map(); return this._advArt; },

  _advArtReady(artKey) {
    return ADV_ART_KINDS.every(k => this.textures.exists(`${artKey}_${k}`));
  },

  /** True when the art is in now; otherwise asks for it (once) and returns false. */
  _advEnsureArt(artKey) {
    const def = ADVENTURER_ART[artKey];
    if (!def) {
      this._advArtMissing = this._advArtMissing || new Set();
      if (!this._advArtMissing.has(artKey)) { this._advArtMissing.add(artKey); console.warn(`[adventurers] no sheet for ${artKey}: drawing the shared stand-in`); }
      return false;
    }
    if (this._advArtReady(artKey)) { this._advArtTouch(artKey); return true; }
    const map = this._advArtState();
    const st = map.get(artKey);
    if (st && (st.status === 'loading' || (st.status === 'failed' && st.tries >= 3))) return false;
    this._advEvictArt();
    const rec = { status: 'loading', left: 0, tries: (st ? st.tries : 0) + 1, used: this.time ? this.time.now : 0 };
    map.set(artKey, rec);
    for (const k of ADV_ART_KINDS) {
      const tex = `${artKey}_${k}`;
      if (this.textures.exists(tex)) continue;
      rec.left++;
      this.load.spritesheet(tex, `./public/assets/adventurers/${tex}.png`, { frameWidth: def[k].cell, frameHeight: def[k].cell });
      this.load.once(`filecomplete-spritesheet-${tex}`, () => { rec.left--; if (rec.left <= 0) rec.status = 'ready'; });
    }
    if (!this._advLoadErrHooked) {
      this._advLoadErrHooked = true;
      this.load.on('loaderror', (file) => {
        const m = /^(adv_\w+?)_(idle|attack|run|death)$/.exec(file && file.key);
        if (!m) return;
        const r = this._advArtState().get(m[1]);
        if (r) { r.status = 'failed'; console.warn(`[adventurers] ${file.key} failed to load: drawing the shared stand-in`); }
      });
    }
    if (rec.left <= 0) { rec.status = 'ready'; return true; }
    if (!this.load.isLoading()) this.load.start();
    return false;
  },

  _advArtTouch(artKey) {
    const r = this._advArtState().get(artKey);
    if (r) r.used = this.time ? this.time.now : 0;
    else this._advArtState().set(artKey, { status: 'ready', left: 0, tries: 1, used: this.time ? this.time.now : 0 });
  },

  /** Keep at most ADV_ART_CAP sets: drop the least recently drawn one nobody is wearing. */
  _advEvictArt() {
    const CAP = 14;
    const map = this._advArtState();
    const resident = [...map.entries()].filter(([k, r]) => r.status === 'ready' && this._advArtReady(k));
    if (resident.length < CAP) return;
    const worn = new Set((this._advEnts || []).filter(e => !e.gone).map(e => e.ownArt || e.wantArt));
    for (const m of (this.party || [])) if (m && m.advId) worn.add(m.artKey);   // ROUND 374 -- the ones walking with you
    const free = resident.filter(([k]) => !worn.has(k)).sort((a, b) => a[1].used - b[1].used)[0];
    if (!free) return;
    for (const k of ADV_ART_KINDS) { const tex = `${free[0]}_${k}`; if (this.textures.exists(tex)) this.textures.remove(tex); }
    map.delete(free[0]);
  },

  /** How high the name sits: over the head of whatever they are drawn as. */
  _advLabelLift(e) {
    const d = e.ownArt && ADVENTURER_ART[e.ownArt];
    return d ? Math.round((d.height || d.idle.fy * 0.95) * (d.scale || 1)) + 6 : 62;
  },

  /** Idle when standing, run when moving, attack when they strike, death when they fall (once, last frame held). */
  _advAnimate(e, moving, dt) {
    const def = ADVENTURER_ART[e.ownArt];
    const row = dirRow(e.facing || 'south');
    let kind, frame;
    if (e.downT > 0) {
      e.deathT = (e.deathT || 0) + dt;
      kind = 'death';
      frame = row * 8 + Math.min(def.death.frames - 1, Math.floor(e.deathT / 0.11));
    } else if (e.atkAnim > 0) {
      e.atkAnim -= dt;
      kind = 'attack';
      const p = 1 - Math.max(0, e.atkAnim) / 0.64;
      frame = row * 8 + Math.min(def.attack.frames - 1, Math.floor(p * def.attack.frames));
    } else if (moving) {
      e.animT = (e.animT || 0) + dt;
      kind = 'run';
      frame = row * 8 + (Math.floor(e.animT / 0.09) % def.run.frames);
    } else {
      kind = 'idle';
      frame = row;
    }
    const tex = `${e.ownArt}_${kind}`;
    if (!this.textures.exists(tex)) return;
    const s = def[kind];
    if (e.sprite.texture.key !== tex) {
      e.sprite.setTexture(tex, frame);
      e.sprite.setOrigin(s.fx / s.cell, s.fy / s.cell);
    } else {
      e.sprite.setFrame(frame);
    }
    e.animKind = kind;
  },
};
