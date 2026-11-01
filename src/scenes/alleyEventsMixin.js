// ===========================================================================
// ROUND 345 (item 2.1) -- BACK-ALLEY EVENTS: THE SCENE SIDE.
//
// Which alleys carry an event, and every word said, is data/alleyEvents.js.
// This is the part that needs a world: noticing the player has stepped into
// one, standing the people up, the choices, and what each choice costs.
//
// THE PEOPLE. A thief and a gang are the game's ordinary hostile folk
// (`_spawnBandit`, the same ones an overworld ambush raises), so a fight is
// the existing fight: they hit through `_monsterHitPlayer`, are hit through
// `_hitBandits`, and drop what a person drops. They are spawned HELD -- they
// stand and wait -- until the choice is made; `_updateBandits` skips a held
// one (and releases it the moment it is hurt, so a swing first is a fight).
// The injured guard is a picture of the city guard, laid on his side.
//
// ONCE EACH, and written down before anything opens, so a save made in the
// middle of a hold-up does not find the same thief again.
// ===========================================================================
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { MAP_TILES_TOTAL } from '../data/regions.js';

const MAP_TILES = MAP_TILES_TOTAL;
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { RANK_ORDER } from '../data/ranks.js';
import { CONSUMABLE_DEFS, coinPurseValue, spendCoins, grantCoins } from '../data/inventory.js';
import {
  planAlleyEvents, thiefDemand, THIEF_LINES, GANG_LINES, GANG_NAME, GUARD_LINES,
  isHealingConsumable, isHealingAbility, coinWords,
  alleyReward, alleyReadsAsAlley, BOUNTY_LINES,
} from '../data/alleyEvents.js';
import { xpForKill } from '../data/monsters.js';
import { xpWithParty } from '../data/party.js';

/** How close to the middle of an alley the player has to be to set it off. */
const ALLEY_TRIGGER = TILE * 1.4;

export const AlleyEventsMixin = {
  /** What has happened in the alleys, on the player so the save carries it. */
  _alleyState() {
    const p = this.player;
    if (!p.alley || typeof p.alley !== 'object') p.alley = { done: {}, gang: false, favour: 0 };
    if (!p.alley.done) p.alley.done = {};
    return p.alley;
  },

  /** The playthrough's events, planned once off the run seed. */
  _alleyPlan() {
    if (!this._alleyEvents || this._alleyPlanFor !== (this._alleys || []).length) {
      this._alleyPlanFor = (this._alleys || []).length;
      // ROUND 350 -- only lanes that READ as lanes carry an event.
      const lanes = (this._alleys || []).filter((a) => alleyReadsAsAlley(this._alleyFacts(a)));
      this._alleyLanes = lanes.length;
      this._alleyEvents = planAlleyEvents(lanes, this._shopSeed());
    }
    return this._alleyEvents;
  },

  /**
   * ROUND 350 -- what an alley is made of, in tiles, for `alleyReadsAsAlley`.
   *   "House placed too close to the wall, near an injured guard. Didn't
   *    clearly read as an alley."
   * The gap and two tiles past each mouth must be open ground (not solid, not
   * water); the houses must overlap three tiles or more; and no town wall may
   * stand within six tiles of the middle.
   */
  _alleyFacts(a) {
    const alongY = a.axis === 'x';
    const width = Math.round(((alongY ? a.x1 - a.x0 : a.y1 - a.y0)) / TILE);
    const depth = Math.round(((alongY ? a.y1 - a.y0 : a.x1 - a.x0)) / TILE);
    const x0 = Math.floor(a.x0 / TILE) - (alongY ? 0 : 2), x1 = Math.ceil(a.x1 / TILE) - 1 + (alongY ? 0 : 2);
    const y0 = Math.floor(a.y0 / TILE) - (alongY ? 2 : 0), y1 = Math.ceil(a.y1 / TILE) - 1 + (alongY ? 2 : 0);
    let blocked = false;
    for (let ty = y0; ty <= y1 && !blocked; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if ((this._solidTiles && this._solidTiles.has(ty * MAP_TILES + tx))
            || this._isWaterAt((tx + 0.5) * TILE, (ty + 0.5) * TILE)) { blocked = true; break; }
      }
    }
    // Any OTHER building (not the two mates) whose footprint reaches into the lane, its mouths, or
    // the tile around them is a house in the alley: it does not read as a lane.
    if (!blocked) {
      for (const bd of (this.buildings || [])) {
        if (!bd || bd === a.a || bd === a.b || !bd.sprite || bd.wall || bd.fence) continue;
        if (Math.abs(bd.anchorX - a.cx) > TILE * 14 || Math.abs(bd.anchorY - a.cy) > TILE * 14) continue;
        let f = null;
        try { f = this._footprintTiles(bd); } catch (e) { f = null; }
        if (!f) continue;
        if (f.x1 >= x0 - 1 && f.x0 <= x1 + 1 && f.y1 >= y0 - 1 && f.y0 <= y1 + 1) { blocked = true; break; }
      }
    }
    const cx = a.cx / TILE, cy = a.cy / TILE;
    let wallDist = Infinity;
    for (const key of (this._wallClaimedTiles || [])) {
      const ty = Math.floor(key / MAP_TILES), tx = key - ty * MAP_TILES;
      const d = Math.max(Math.abs(tx + 0.5 - cx), Math.abs(ty + 0.5 - cy));
      if (d < wallDist) wallDist = d;
    }
    for (const slabs of [this._slabs, this._fenceSlabs]) {
      for (const w of (slabs || [])) {
        const sl = w.slab;
        if (!sl) continue;
        const along = sl.along === 'x' ? a.cx : a.cy, across = sl.along === 'x' ? a.cy : a.cx;
        const da = Math.max(0, sl.a0 - along, along - sl.a1) / TILE, dc = Math.abs(across - sl.f1) / TILE;
        const d = Math.max(da, dc);
        if (d < wallDist) wallDist = d;
      }
    }
    return { width, depth, blocked, wallDist };
  },

  _updateAlleyEvents(dt) {
    this._alleyBountyCheck();
    if (!this.player || this.player.dead) return;
    if (this._insideRoom || this._dialogueOpen || this._creatorOpen || this._act0Running
        || this._overworldOpen || this._inventoryOpen || this._shopOpen || this._alleyCur) return;
    this._alleyT = (this._alleyT || 0) + dt;
    if (this._alleyT < 0.35) return;
    this._alleyT = 0;
    const plan = this._alleyPlan();
    if (!plan.length) return;
    const st = this._alleyState();
    for (const ev of plan) {
      if (st.done[ev.id]) continue;
      if (Math.hypot(this.world.x - ev.x, this.world.y - ev.y) > ALLEY_TRIGGER) continue;
      this._alleyBegin(ev);
      break;
    }
  },

  // -------------------------------------------------------------------------
  // BEGINNING ONE
  // -------------------------------------------------------------------------
  _alleyBegin(ev) {
    const st = this._alleyState();
    st.done[ev.id] = true;           // before anything opens -- see the header
    const rk = this._playerRankStanding ? this._playerRankStanding().rank : 'normal';
    this._alleyCur = { ev, folk: [], actors: [], tier: Math.max(0, Math.min(2, RANK_ORDER.indexOf(rk))) };
    if (ev.kind === 'thief') this._alleyThief(ev);
    else if (ev.kind === 'gang') this._alleyGang(ev);
    else this._alleyGuard(ev);
  },

  /** Stand `n` held fighters a couple of tiles from the player. */
  _alleySpawnFolk(ev, n, label) {
    const cur = this._alleyCur;
    const rank = this._playerRankStanding ? this._playerRankStanding().rank : 'normal';
    const tier = Math.max(0, Math.min(2, RANK_ORDER.indexOf(rank)));
    const crew = this._crewForTier && this._crewForTier(tier, `alley|${ev.id}`);
    if (!crew || !this._spawnBandit) return [];
    const q = { id: `alley|${ev.id}`, tier, ambush: true, state: 'active' };
    const made = [];
    for (let i = 0; i < n; i++) {
      let at = null;
      for (let a = 0; a < 16 && !at; a++) {
        const th = (i / n) * Math.PI * 2 + a * 0.55 + 0.7;
        const r = TILE * (1.4 + (a % 4) * 0.35);
        const x = this.world.x + Math.cos(th) * r, y = this.world.y + Math.sin(th) * r;
        if (!this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 16)) at = { x, y };
      }
      if (!at) continue;
      const m = this._spawnBandit(q, crew, (i + Math.floor(ev.x / TILE)) % 9, at.x, at.y);
      if (!m) continue;
      m.hold = true;
      m.alleyOf = ev.id;
      m.name = label;
      made.push(m);
      cur.folk.push(m);
    }
    return made;
  },

  /** Pay out one of the table's rewards: banked xp, coin, items. */
  _alleyPay(how, tier) {
    const p = this.player;
    const r = alleyReward(how, tier);
    if (r.xp > 0) {
      r.xp = xpWithParty(
        xpForKill(r.xp, tier || 0, RANK_ORDER.indexOf(p.rank || 'normal')),
        this._partyXpCompanions ? this._partyXpCompanions() : []);
      p.pendingXp = (p.pendingXp || 0) + r.xp;
    }
    if (r.coins > 0) grantCoins(p.coins, 'normal', r.coins);
    const bag = (p.inventory = p.inventory || {}).consumables = (p.inventory.consumables || []);
    const got = [];
    for (const id of r.items) {
      if (!CONSUMABLE_DEFS[id]) continue;
      bag.push(id);
      got.push(CONSUMABLE_DEFS[id].name);
    }
    this._floatText(this.world.x, this.world.y - 54, `+${coinWords(r.coins)}`, '#aed581');
    this._floatText(this.world.x, this.world.y - 72, `+${r.xp} xp`, '#90caf9');
    if (got.length) this._floatText(this.world.x, this.world.y - 90, got.join(', '), '#ffe082');
    return { ...r, got };
  },

  /** A fight begun in an alley: remember who to wait for. */
  _alleyWatchFight(cur) {
    (this._alleyFights = this._alleyFights || []).push({
      id: cur.ev.id, kind: cur.ev.kind, tier: cur.tier || 0, folk: cur.folk.slice(),
    });
  },

  /** Every one of an alley's people down (by the player's hand): the bounty. */
  _alleyBountyCheck() {
    const fights = this._alleyFights;
    if (!fights || !fights.length || !this.player || this._dialogueOpen) return;
    for (let i = fights.length - 1; i >= 0; i--) {
      const f = fights[i];
      if (f.folk.some((m) => m.alive)) continue;
      fights.splice(i, 1);
      if (f.folk.some((m) => m.despawned) || this.player.dead) continue;
      const how = f.kind === 'gang' ? 'gangBeaten' : 'thiefBeaten';
      const r = this._alleyPay(how, f.tier);
      this._openDialogue(f.kind === 'gang' ? 'Gutter Saint' : 'Alley thief',
        `${BOUNTY_LINES[how]}\n\n+${coinWords(r.coins)}, +${r.xp} xp${r.got.length ? `, ${r.got.join(' and ')}` : ''}.`, null, []);
    }
  },

  _alleyLetGo(cur) {
    for (const m of (cur ? cur.folk : [])) { m.hold = false; m.alive = false; m.despawned = true; }
    for (const a of (cur ? cur.actors : [])) if (a.sprite && a.sprite.destroy) a.sprite.destroy();
    if (cur) { cur.folk = []; cur.actors = []; }
  },

  _alleyRelease(cur) {
    for (const m of (cur ? cur.folk : [])) m.hold = false;
  },

  // -------------------------------------------------------------------------
  // THE THIEF
  // -------------------------------------------------------------------------
  _alleyThief(ev) {
    const st = this._alleyState();
    if (st.gang) {
      this._alleySpawnFolk(ev, 1, 'Alley thief');
      this._openDialogue('Alley thief', THIEF_LINES.gangSpared, null, []);
      this._alleyEndSoon(2.5);
      return;
    }
    const purse = coinPurseValue(this.player.coins);
    const demand = thiefDemand(purse);
    this._alleySpawnFolk(ev, 2, 'Alley thief');
    if (!demand) {
      this._openDialogue('Alley thief', THIEF_LINES.empty, null, []);
      this._alleyEndSoon(2.5);
      return;
    }
    this._alleyCur.demand = demand;
    this._openDialogue('Alley thief', THIEF_LINES.stop, null, [
      { act: 'alley|pay', label: `Hand it over (${coinWords(demand)})` },
      { act: 'alley|fight', label: 'Draw steel' },
    ]);
  },

  // -------------------------------------------------------------------------
  // THE GANG
  // -------------------------------------------------------------------------
  _alleyGang(ev) {
    const st = this._alleyState();
    this._alleySpawnFolk(ev, 3, 'Gutter Saint');
    if (st.gang) {
      this._openDialogue('Gutter Saint', GANG_LINES.already, null, []);
      this._alleyEndSoon(2.5);
      return;
    }
    this._openDialogue('Gutter Saint', GANG_LINES.ask, null, [
      { act: 'alley|join', label: `Join ${GANG_NAME}` },
      { act: 'alley|decline', label: 'Not interested' },
      { act: 'alley|fight', label: 'Draw steel' },
    ]);
  },

  // -------------------------------------------------------------------------
  // THE GUARD
  // -------------------------------------------------------------------------
  _alleyGuard(ev) {
    const cur = this._alleyCur;
    const x = this.world.x + TILE * 0.9, y = this.world.y;
    const key = 'npc_city_guard';
    if (this.textures.exists(key)) {
      const art = NPC_ART[key] || { footX: 46, footY: 78, scale: 1 };
      const p = isoProject(x, y);
      const s = this.add.sprite(p.x, p.y, key, dirRow('southwest'));
      s.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
      s.setScale(art.scale || 1);
      s.setDepth(isoDepth(x, y));
      s.setAngle(78);          // down on his side
      s.setTint(0xffb0b0);
      cur.actors.push({ sprite: s, x, y });
    }
    this._alleyGuardAsk();
  },

  _alleyGuardAsk(note) {
    const p = this.player;
    const choices = [];
    let n = 0;
    for (const [key, entry] of Object.entries(p.knownAbilities || {})) {
      const a = entry && entry.ability;
      if (!isHealingAbility(a)) continue;
      const cost = a.cost ? a.cost.amount || 0 : 0;
      const pool = a.cost && a.cost.type === 'stamina' ? 'stamina' : 'mana';
      if (cost && (p[pool] || 0) < cost) continue;
      choices.push({ act: `alley|ab|${key}`, label: `Heal him with ${a.name}` });
      if (++n >= 3) break;
    }
    const bag = (p.inventory && p.inventory.consumables) || [];
    let best = -1, bestV = Infinity;
    bag.forEach((id, i) => {
      const d = CONSUMABLE_DEFS[id];
      if (isHealingConsumable(d) && (d.value || 0) < bestV) { best = i; bestV = d.value || 0; }
    });
    if (best >= 0) choices.push({ act: `alley|pot|${best}`, label: `Give him a ${CONSUMABLE_DEFS[bag[best]].name}` });
    choices.push({ act: 'alley|leave', label: 'Leave him for the patrol' });
    this._openDialogue('Injured guard', (note ? `${note}\n\n` : '') + GUARD_LINES.ask, null, choices);
  },

  // -------------------------------------------------------------------------
  // THE CHOICES
  // -------------------------------------------------------------------------
  _alleyAct(act) {
    const [, way, arg] = String(act).split('|');
    const cur = this._alleyCur;
    const p = this.player;
    const st = this._alleyState();
    if (!cur) { this._closeDialogue(); return; }
    // The guard may take a second try (an ability that could not be paid), so
    // that page is the one that does not close on its own.
    if (way === 'ab' || way === 'pot') { this._alleyHealGuard(way, arg); return; }
    this._closeDialogue();
    if (way === 'pay') {
      const demand = cur.demand || 0;
      if (spendCoins(p.coins, demand)) {
        this._floatText(this.world.x, this.world.y - 54, `-${coinWords(demand)}`, '#ef9a9a');
        this._alleyLetGo(cur);
        this._alleyCur = null;
        this._openDialogue('Alley thief', THIEF_LINES.paid, null, []);
      } else {
        this._alleyRelease(cur);   // could not pay: it is a fight after all
        this._alleyWatchFight(cur);
        this._alleyCur = null;
      }
      return;
    }
    if (way === 'join') {
      st.gang = true;
      this._floatText(this.world.x, this.world.y - 36, `Joined ${GANG_NAME}`, '#ce93d8');
      this._alleyPay('joined', cur.tier || 0);
      this._alleyLetGo(cur);
      this._alleyCur = null;
      this._openDialogue('Gutter Saint', GANG_LINES.joined, null, []);
      return;
    }
    if (way === 'decline') {
      this._alleyLetGo(cur);
      this._alleyCur = null;
      this._openDialogue('Gutter Saint', GANG_LINES.declined, null, []);
      return;
    }
    if (way === 'fight') {
      this._alleyRelease(cur);
      this._alleyWatchFight(cur);
      this._floatText(this.world.x, this.world.y - 54,
        (cur.ev.kind === 'gang' ? GANG_LINES.fight : THIEF_LINES.fight), '#ef9a9a');
      this._alleyCur = null;
      return;
    }
    // 'leave' (the guard): he waits for the patrol.
    this._alleyLetGo(cur);
    this._alleyCur = null;
    this._openDialogue('Injured guard', GUARD_LINES.refused, null, []);
  },

  _alleyHealGuard(way, arg) {
    const cur = this._alleyCur;
    const p = this.player;
    let line = null;
    if (way === 'ab') {
      const entry = (p.knownAbilities || {})[arg];
      const a = entry && (this._scaledAbility ? this._scaledAbility(arg) : null) || (entry && entry.ability);
      if (!a || !this._payAbilityCost(a)) {
        this._closeDialogue();
        this._alleyGuardAsk('You cannot muster it just now.');
        return;
      }
      line = GUARD_LINES.abilityHealed;
    } else {
      const i = Number(arg);
      const bag = (p.inventory && p.inventory.consumables) || [];
      if (!(i >= 0 && i < bag.length) || !isHealingConsumable(CONSUMABLE_DEFS[bag[i]])) {
        this._closeDialogue();
        this._alleyGuardAsk('That bottle is gone.');
        return;
      }
      bag.splice(i, 1);
      line = GUARD_LINES.potionHealed;
    }
    const st = this._alleyState();
    st.favour = (st.favour || 0) + 1;
    const paid = this._alleyPay('helped', cur.tier || 0);
    for (const a of cur.actors) if (a.sprite) { a.sprite.setAngle(0); a.sprite.clearTint(); }
    this._closeDialogue();
    this._openDialogue('Injured guard',
      `${line}\n\n${GUARD_LINES.tip}\n\n+${coinWords(paid.coins)}, +${paid.xp} xp${paid.got.length ? `, ${paid.got.join(' and ')}` : ''}.`, null, []);
    this._alleyEndSoon(6);
  },

  /** Take the actors off the stage a little after the box closes. */
  _alleyEndSoon(secs) {
    const cur = this._alleyCur;
    this._alleyCur = null;
    if (!cur) return;
    this.time.delayedCall(secs * 1000, () => this._alleyLetGo(cur));
  },
};
