// ============================================================================
// ROUND 389 -- THE COMPANIONS' NATURE GIFT EVOLUTIONS, IN PLAY. "Effects in play: ... Should any be built?" -- yes.
//
// The player's evolutions run in scenes/evoMixin.js. This is the same spec grammar (src/data/evoEngine.js) run for a
// COMPANION: "self" is the companion -- their health, mana and stamina, their kit, where they stand, what they fight --
// and the player is one of their allies. The player's runtime is not touched; the pieces that do not depend on whose
// evolution it is (the fx, pushes and pulls, placed stones, drops, the player's own buff door) are borrowed from it.
//
//   THE SPECS. public/assets/data/nature_evolution_specs_party.json, keyed `<nature>.<ability>|<catalyst lower>` as the
//   player's are, fetched once the first time a companion's evolutions are read (`_pevoSpecsFile`). A woken companion
//   evolution with a spec runs it (and its passive nature keys are its fx); one without keeps the round-386 tag bonus.
//   THE PARTY SIDE OF THE GRAMMAR (evoEngine PARTY_*): its own events (windup, fightEnd, rankUp, rest, fall, rise, evade,
//   travel, and what the holder sees its allies do), ops (advance, empower, refund, ready, oneOf), when keys for the
//   companion's situation, `perFight`, and the live counts a companion can read.
//   PRACTICE. A companion's abilities do not climb ranks as the player's do (their rank follows yours), so "advancement"
//   is a practice track per ability: `advance` fills it, each practice rank (PRACTICE_MAX of them) gives that ability
//   PRACTICE_STEP increased effect and fires rankUp. Kept on the companion and saved with the party (`evoAdv`, `evoUses`,
//   `evoFocus`, `evoTally`, `evoSeen`, `evoQuarry`, `evoStreak`, `evoOpener`).
//
// Doors in WorldScene (one line each, marked ROUND 389):
//   _updateParty      the cast (windup, its cost, cast + the kills it made, the preferred pick), the swing (strike, crit, kill)
//   _partyCast        the cast's effect (practice and empower)
//   _damagePartyMember   dodge and guard boons, evade, a block, hurt, lowHealth, wouldDie, fall
//   _partyDamage / _partyHaste   the dmg and speed boons
//   _onTriggerEvent / the player's cast   allyKill, allyCrit / allyCast
//   _restInTransport / _startMeditation   rest
//   the frame          _pevoTick: fights starting and ending, intervals, `use` (a companion uses its own when it can),
//                      rising, travel, zones, regen and haste boons
// ============================================================================
import { TILE, isoProject } from '../data/iso.js';
import { PARTY_BY_ID } from '../data/party.js';
import { RANK_ORDER } from '../data/ranks.js';
import { rankScaledFrac, EVENTS, PARTY_EVENTS, PRACTICE_STEP, PRACTICE_MAX } from '../data/evoEngine.js';
import { abilityRoles } from '../data/buildClasses.js';
import { attackKindOf } from '../data/outworlder.js';
import { abilityDeals } from '../data/awakening.js';
import { PARTY_SPECS_URL, specKeyOf } from '../data/natures.js';
import { TAG } from '../data/debuffs.js';
import { subtypeOf, isAirborne } from '../data/monsters.js';

const ALL_EVENTS = { ...EVENTS, ...PARTY_EVENTS };
const ALLY_REACH = 8 * TILE;
const TRAVEL_STEP = 40 * TILE;   // `travel`: every forty tiles walked outside a fight
const ZONE_COLOR = { fire: 0xff7043, frost: 0x81d4fa, lightning: 0x4dd0e1, nature: 0x9ccc65, shadow: 0x9575cd, radiant: 0xffe082,
  dimension: 0xb388ff, physical: 0xe0e0e0, disruptive: 0xce93d8, resonating: 0x80cbc4, transcendent: 0xfff59d, necrotic: 0xa5d6a7 };
const famOf = (mon) => (mon && (mon.family || (mon.type && mon.type.family))) || null;

export const PartyEvoMixin = {
  // ------------------------------------------------------------------ the specs
  /** The companion spec file's `specs`, fetched once; null until it lands. On landing, every companion's nature fx is
   *  read again (a spec replaces the tag bonus) and their kits are rebuilt the way an evolution rebuilds them. */
  _pevoSpecsFile() {
    if (this._pevoSpecMap !== undefined) return this._pevoSpecMap;
    this._pevoSpecMap = null;
    if (typeof fetch === 'function') {
      fetch(PARTY_SPECS_URL).then(r => (r.ok ? r.json() : null)).then(j => {
        this._pevoSpecMap = (j && j.specs) || null;
        if (this._pevoSpecMap) this._pevoRefreshKits();
      }).catch(() => { console.warn('[natures] the companion evolution specs did not load'); });
    }
    return this._pevoSpecMap;
  },
  _pevoRefreshKits() {
    this._partyNatureFxCache = null;
    this._pevoCache = null;
    for (const m of (this.party || [])) {
      if (!m || !m.natureEvo || !Object.keys(m.natureEvo).length) continue;
      try {
        const def = PARTY_BY_ID[m.id] || m;
        if (this._buildPartyKit) m.kit = this._buildPartyKit(def, m);
        if (this._recomputePartyGear) this._recomputePartyGear(m);
      } catch (e) { if (this._evoWarn) this._evoWarn('party kit', e); }
    }
  },
  /** The spec for one stored companion evolution ({ entry }), or null. */
  _pevoSpecFor(ref, stored) {
    if (!stored || !stored.entry) return null;
    const map = this._pevoSpecsFile();
    return (map && map[specKeyOf(ref, stored.entry.catalyst)]) || null;
  },
  /** Every spec companion `m` holds: [{ id, name, spec }]. */
  _pevoSpecs(m) {
    if (!m || !m.natureEvo || !Object.keys(m.natureEvo).length) return [];   // nothing woken: the file is not even fetched
    const map = this._pevoSpecsFile();
    if (!map) return [];
    const stamp = Object.keys(m.natureEvo).join(',');
    this._pevoCache = this._pevoCache || {};
    const c = this._pevoCache[m.id || m.name];
    if (c && c.stamp === stamp) return c.list;
    const list = [];
    for (const [ref, st] of Object.entries(m.natureEvo)) {
      const spec = this._pevoSpecFor(ref, st);
      if (spec) list.push({ id: ref, name: (st.entry && st.entry.name) || ref, spec });
    }
    this._pevoCache[m.id || m.name] = { stamp, list };
    return list;
  },
  /** One passive across what the companion holds: numbers add, flags OR. */
  _pevoPassive(m, key) {
    let out;
    for (const { spec } of this._pevoSpecs(m)) {
      const v = spec.passive && spec.passive[key];
      if (v === undefined) continue;
      if (typeof v === 'number') out = (out || 0) + v; else if (v) out = true;
    }
    return out;
  },

  // ------------------------------------------------------------------ state
  /** What the runtime remembers of a companion and does not save: rule clocks, the fight, boons, charges, its last uses. */
  _pevoState(m) {
    this._pevoStates = this._pevoStates || {};
    const k = m.id || m.name;
    return (this._pevoStates[k] = this._pevoStates[k] || { rules: {}, fight: false, fightId: 0, fightT: 0, low: false, used: {}, last: null,
      prev: null, hist: [], buffs: {}, empower: [], prefer: null, down: false, killsBy: {}, fixed: null, today: null,
      pos: null, movedAt: -99, walk: 0, lastHurtAt: -99, allyCastAt: -99, lastFightUsed: {} });
  },
  /** The runtime's clock, in seconds: the game clock where there is one (saved, so a count's expiry survives a load). */
  _pevoNow() { return Number.isFinite(this._clockT) ? this._clockT : (this._pevoClock || 0); },
  _pevoRank(m) { return Math.max(0, RANK_ORDER.indexOf((m && m.rank) || 'iron')); },
  _pevoMonRank(mon) { return this._monsterRankIndex ? this._monsterRankIndex(mon) : 1; },
  _pevoActive() { return this._activeParty ? this._activeParty() : (this.party || []).filter(m => m && m.recruited && !m.dismissed); },
  _pevoHolders() { return this._pevoActive().filter(m => m && m.natureEvo && !(m.downT > 0) && this._pevoSpecs(m).length); },

  // ------------------------------------------------------------------ the events
  /** Run every rule companion `m` holds that listens for `event`. ctx: { victim, ability, attack, paid, taken, melee, hit } */
  _pevoOn(m, event, ctx = {}, only = null) {
    if (!m || !ALL_EVENTS[event]) return false;
    const specs = this._pevoSpecs(m);
    if (!specs.length) return false;
    if (this._pevoDepth > 0) return false;   // as the player's: an evolution's own echo never sets evolutions off again
    this._pevoDepth = 1;
    let out = false;
    try { out = this._pevoRun(m, event, ctx, only, specs); } finally { this._pevoDepth = 0; }
    this._pevoFlushRankUps(m);
    return out;
  },
  _pevoRun(m, event, ctx, only, specs) {
    let fired = false;
    const st = this._pevoState(m);
    for (const { id, name, spec } of specs) {
      if (only && id !== only) continue;
      (spec.rules || []).forEach((r, i) => {
        if (r.on !== event) return;
        if (!this._pevoWhen(m, r, ctx)) return;
        const rs = st.rules[`${id}#${i}`] = st.rules[`${id}#${i}`] || {};
        const now = this._pevoNow();
        if (r.cd && now < (rs.readyAt || 0)) return;
        if (r.perDay) {
          const d = this._dayIndex ? this._dayIndex() : 0;
          if (rs.day !== d) { rs.day = d; rs.n = 0; }
          if (rs.n >= r.perDay) return;
        }
        if (r.perFight) {
          if (rs.fight !== st.fightId) { rs.fight = st.fightId; rs.fn = 0; }
          if (rs.fn >= r.perFight) return;
        }
        if (r.chance !== undefined && Math.random() >= r.chance) return;
        if (r.cost && !this._pevoPay(m, r.cost)) return;
        if (r.cd) rs.readyAt = now + r.cd;
        if (r.perDay) rs.n++;
        if (r.perFight) rs.fn++;
        for (const op of r.do) {
          try { if (this._pevoOp(m, this._pevoScaled(m, op, ctx), ctx, event) === 'saved') fired = 'saved'; } catch (e) { if (this._evoWarn) this._evoWarn(`${m.name}: ${name}: ${op.op}`, e); }
        }
        const tw = r.when && r.when.tally;
        if (tw && tw.consume) { const bag = this._pevoTallyBag(m, tw.at || 'target', ctx); if (bag) delete bag[tw.key]; }
        if (fired !== 'saved') fired = true;
      });
    }
    return fired;
  },

  _pevoPay(m, cost) {
    const need = {};
    for (const [pool, frac] of Object.entries(cost)) {
      const max = pool === 'health' ? m.maxHp : pool === 'mana' ? m.maxMana : m.maxStamina;
      const have = pool === 'health' ? m.hp : m[pool];
      need[pool] = Math.ceil((max || 0) * frac);
      if (!(have > need[pool] + (pool === 'health' ? 1 : 0))) return false;
    }
    for (const [pool, n] of Object.entries(need)) { if (pool === 'health') m.hp -= n; else m[pool] -= n; }
    return true;
  },

  /** The enemy an op means by "target": this event's, else the one the companion fights, else its nearest. */
  _pevoTarget(m, ctx = {}) {
    if (ctx.victim && ctx.victim.alive !== false && !ctx.victim.person && Number.isFinite(ctx.victim.wx)) return ctx.victim;
    if (m.target && m.target.alive && Number.isFinite(m.target.wx)) return m.target;
    return this._evoNearest ? this._evoNearest(m.x, m.y, 9 * TILE) : null;
  },
  /** The body a count or a condition is read from: this event's even if it just died, else the live target. */
  _pevoReadTarget(m, ctx = {}) {
    if (ctx.victim && !ctx.victim.person && Number.isFinite(ctx.victim.wx)) return ctx.victim;
    return this._pevoTarget(m, ctx);
  },
  /** The ally an op means: the most wounded of you and the other companions within 12 tiles; you when level. */
  _pevoAlly(m, range = 12 * TILE) {
    const out = this._pevoAllies(m, range);
    const frac = (a) => (a.ref.maxHp > 0 ? a.ref.hp / a.ref.maxHp : 1);
    return out.sort((a, b) => frac(a) - frac(b) || (a.kind === 'player' ? -1 : 1))[0] || null;
  },
  _pevoAllies(m, range) {
    const p = this.player;
    const out = [];
    if (p && this.world && Math.hypot(this.world.x - m.x, this.world.y - m.y) <= range) out.push({ kind: 'player', ref: p, x: this.world.x, y: this.world.y });
    for (const o of this._pevoActive()) {
      if (!o || o === m || o.downT > 0 || Math.hypot(o.x - m.x, o.y - m.y) > range) continue;
      out.push({ kind: 'party', ref: o, x: o.x, y: o.y });
    }
    return out;
  },
  _pevoAlliesNear(m, r) { return this._pevoAllies(m, r).length; },
  _pevoEnemiesNear(m, r) { return this._evoIn ? this._evoIn(m.x, m.y, r) : []; },
  _pevoKitNames(m, kind = null) {
    return (m.kit || []).filter(k => k && k.ability && (!kind || this._pevoIsKind(m, k.ability, kind, {}))).map(k => k.ability.name);
  },
  /** Is a monster busy with someone other than this companion? (Monsters hunt you first; a taunt names who holds them.) */
  _pevoBusyElsewhere(m, mon) {
    const src = mon && mon.taunt && mon.taunt.src;
    if (src && src.kind === 'party') return src.ref !== m;
    return !!mon && mon.state === 'chase';
  },
  _pevoOnMe(m, mon) {
    const src = mon && mon.taunt && mon.taunt.src;
    if (src && src.kind === 'party' && src.ref === m) return true;
    return !!mon && Math.hypot(mon.wx - m.x, mon.wy - m.y) <= ((mon.type && mon.type.radius) || 14) + 30 && mon.state === 'chase';
  },
  _pevoFirstUse(m, name) { return !!name && !this._pevoState(m).used[name]; },

  _pevoWhen(m, r, ctx) {
    const w = r.when || {};
    const st = this._pevoState(m);
    const now = this._pevoNow();
    const frac = (v, mx) => (mx > 0 ? (v || 0) / mx : 1);
    if (w.hpBelow !== undefined && !(frac(m.hp, m.maxHp) < w.hpBelow)) return false;
    if (w.hpAbove !== undefined && !(frac(m.hp, m.maxHp) > w.hpAbove)) return false;
    if (w.manaBelow !== undefined && !(frac(m.mana, m.maxMana) < w.manaBelow)) return false;
    if (w.manaAbove !== undefined && !(frac(m.mana, m.maxMana) > w.manaAbove)) return false;
    if (w.staminaBelow !== undefined && !(frac(m.stamina, m.maxStamina) < w.staminaBelow)) return false;
    if (w.staminaAbove !== undefined && !(frac(m.stamina, m.maxStamina) > w.staminaAbove)) return false;
    if (w.inCombat !== undefined && !!st.fight !== !!w.inCombat) return false;
    if (w.stealthed && !(m.stealth && m.stealth.t > 0)) return false;
    // ---- the target
    const t = this._pevoReadTarget(m, ctx);
    const tRank = t ? this._pevoMonRank(t) : null;
    if (w.targetBelow !== undefined && !(t && t.maxHp > 0 && t.hp / t.maxHp < w.targetBelow)) return false;
    if (w.rankAbove !== undefined && !(t && tRank - this._pevoRank(m) >= w.rankAbove)) return false;
    if (w.rankBelow !== undefined && !(t && this._pevoRank(m) - tRank >= w.rankBelow)) return false;
    if (w.targetBoss !== undefined && !!(t && (t.boss || t.bossName || (t.type && t.type.boss))) !== !!w.targetBoss) return false;
    if (w.targetFamily && !(t && [].concat(w.targetFamily).includes(famOf(t)))) return false;
    if (w.targetKind && !(t && [].concat(w.targetKind).includes(subtypeOf(t)))) return false;
    if (w.targetFlying !== undefined && !!(t && isAirborne(t)) !== !!w.targetFlying) return false;
    if (w.targetHuge && !(t && (((t.type && t.type.radius) || 0) >= 26 || t.boss || t.bossName))) return false;
    if (w.targetSmall && !(t && ((t.type && t.type.radius) || 14) < 14)) return false;
    if (w.targetHas && !(t && [].concat(w.targetHas).some(k => t.debuffs && t.debuffs[k]))) return false;
    if (w.targetTurned && !(t && t.confusedT > 0)) return false;
    if (w.targetUnaware && !(t && t.state !== 'chase' && !(t.taunt && t.taunt.src))) return false;
    if (w.targetBusy && !(t && this._pevoBusyElsewhere(m, t))) return false;
    if (w.targetOnMe && !(t && this._pevoOnMe(m, t))) return false;
    if (w.targetIsolated && !(t && this._evoIn(t.wx, t.wy, 2 * TILE).filter(o => o !== t).length === 0)) return false;
    if (w.targetRecovering && !(t && (t.atkCd || 0) > ((t.type && t.type.atkCooldown) || 1) * 0.5)) return false;
    if (w.targetWinding && !(t && (t.attackT || 0) > 0)) return false;
    if (w.targetMoving && !(t && t.state === 'chase' && Math.hypot(t.wx - m.x, t.wy - m.y) > 40)) return false;
    if (w.targetFar !== undefined && !(t && Math.hypot(t.wx - m.x, t.wy - m.y) >= w.targetFar * TILE)) return false;
    if (w.targetNear !== undefined && !(t && Math.hypot(t.wx - m.x, t.wy - m.y) <= w.targetNear * TILE)) return false;
    if (w.weakTo && !(t && ctx.ability && ctx.ability.element && this._monsterElementMult && this._monsterElementMult(t, ctx.ability.element) > 1.01)) return false;
    if (w.newFoe && !(t && famOf(t) && !((m.evoSeen || {})[famOf(t)] > 0))) return false;
    if (w.quarry && !(t && m.evoQuarry && famOf(t) === m.evoQuarry)) return false;
    if (w.sharedTarget && !(t && (this._currentTarget && this._currentTarget('enemy') === t
      || this._pevoActive().some(o => o && o !== m && o.target === t)))) return false;
    if (w.targetAfflictions !== undefined && !(t && Object.keys(t.debuffs || {}).length >= w.targetAfflictions)) return false;
    // ---- the holder
    if (w.selfHas && !([].concat(w.selfHas).some(k => (k === 'any' ? Object.keys(m.debuffs || {}).length > 0 : !!(m.debuffs && m.debuffs[k]))))) return false;
    if (w.element && !((ctx.ability && ctx.ability.element === w.element) || (ctx.key && String(ctx.key).includes(w.element)))) return false;
    if (w.kind && w.kind !== 'any' && !this._pevoIsKind(m, ctx.ability, w.kind, ctx)) return false;
    if (w.tally && !(this._pevoTallyGet(m, this._pevoTallyBag(m, w.tally.at || 'target', ctx), w.tally.key, ctx, w.tally.at || 'target') >= (w.tally.atLeast || 1))) return false;
    if (w.noTally && this._pevoTallyGet(m, this._pevoTallyBag(m, w.noTally.at || 'self', ctx), w.noTally.key, ctx, w.noTally.at || 'self') > 0) return false;
    if (w.tallyMod) {
      const tm = w.tallyMod;
      const n = this._pevoTallyGet(m, this._pevoTallyBag(m, tm.at || 'self', ctx), tm.key, ctx, tm.at || 'self');
      if (![].concat(tm.is).includes(n % (tm.of || 2))) return false;
    }
    if (w.alone !== undefined && (this._pevoAlliesNear(m, 6 * TILE) === 0) !== !!w.alone) return false;
    if (w.allyNear !== undefined && !(this._pevoAlliesNear(m, w.allyNear * TILE) > 0)) return false;
    if (w.allyBelow !== undefined && !(this._pevoAllies(m, 12 * TILE).some(a => a.ref.maxHp > 0 && a.ref.hp / a.ref.maxHp < w.allyBelow))) return false;
    if (w.partyUp && this._pevoActive().some(o => o && o.downT > 0)) return false;
    if (w.surrounded !== undefined && !(this._pevoEnemiesNear(m, 3 * TILE).length >= w.surrounded)) return false;
    if (w.enemiesAtMost !== undefined && !(this._pevoEnemiesNear(m, 8 * TILE).length <= w.enemiesAtMost)) return false;
    if (w.still !== undefined && (now - st.movedAt >= 2) !== !!w.still) return false;
    if (w.moving !== undefined && (now - st.movedAt < 0.6) !== !!w.moving) return false;
    if (w.untargeted && (now - st.lastHurtAt < 4 || this._evoIn(m.x, m.y, 8 * TILE).some(o => this._pevoOnMe(m, o)))) return false;
    if (w.blocked && !ctx.blocked) return false;
    if (w.hardHit && !(ctx.taken >= (m.maxHp || 1) * 0.1)) return false;
    if (w.melee !== undefined && !!ctx.melee !== !!w.melee) return false;
    if (w.noBoons && this._pevoHasBoon(m)) return false;
    if (w.regenerating && !(m.hp < m.maxHp && ((m.hot && m.hot.t > 0) || this._pevoStat(m, 'regenHealth') > 0 || ((m.stats || {}).hpRegen && !m.target)))) return false;
    if (w.wet && !((m.debuffs && m.debuffs.wet) || (this._isWaterAt && this._isWaterAt(m.x, m.y)))) return false;
    const outdoors = !this._insideRoom || !!this._insideRoom.astral;
    if (w.outdoors !== undefined && outdoors !== !!w.outdoors) return false;
    const hour = this._hourOfDay ? this._hourOfDay() : 12;
    if (w.daylight && !(outdoors && hour >= 6 && hour < 20)) return false;
    if (w.night && !(hour < 6 || hour >= 20)) return false;
    if (w.raining) { const wt = this._weatherTarget ? this._weatherTarget() : null; if (!(outdoors && wt && (wt.fall === 'rain' || /storm|rain/i.test(wt.id || '')))) return false; }
    // ---- the ability in this event
    const a = ctx.ability, nm = a && a.name;
    if (w.firstCast && Object.values(st.used).reduce((x, y) => x + y, 0) !== (ctx.counted ? 1 : 0)) return false;
    if (w.firstUse && !(nm && (ctx.counted ? st.used[nm] === 1 : !st.used[nm]))) return false;
    if (w.useCountAtMost !== undefined && !(nm && (st.used[nm] || 0) <= w.useCountAtMost)) return false;
    if (w.afterOther !== undefined) { const pr = st.prev; if (!(pr && nm && pr.name !== nm && now - pr.t <= w.afterOther)) return false; }
    if (w.afterOtherEssence !== undefined) {
      const pr = st.prev, ps = pr && this._pevoSlot(m, pr.name);
      if (!(pr && a && ps && ps.ability.essenceId && a.essenceId && ps.ability.essenceId !== a.essenceId && now - pr.t <= w.afterOtherEssence)) return false;
    }
    if (w.afterKind) { const pr = st.prev, ps = pr && this._pevoSlot(m, pr.name); if (!(ps && now - pr.t <= (w.afterKind.seconds || 3) && this._pevoIsKind(m, ps.ability, w.afterKind.kind, {}))) return false; }
    if (w.afterAlly !== undefined && !(now - st.allyCastAt <= w.afterAlly)) return false;
    if (w.repeat !== undefined && !!(st.prev && nm && st.prev.name === nm) !== !!w.repeat) return false;
    if (w.routine && !this._pevoRoutine(st)) return false;
    if (w.alternating && !this._pevoAlternating(st)) return false;
    if (w.isTop && !(nm && this._pevoIsTop(m, a))) return false;
    if (w.isHighest && !(nm && this._pevoHighest(m) === nm)) return false;
    if (w.isFixed && !(nm && st.fixed === nm)) return false;
    if (w.inSeason && !(nm && this._pevoSeason(m) === nm)) return false;
    if (w.nearRank && !(nm && m.evoAdv && m.evoAdv[nm] && m.evoAdv[nm].r < PRACTICE_MAX && m.evoAdv[nm].p >= 0.8)) return false;
    if (w.practiceGap !== undefined) {
      const ps = this._pevoKitNames(m).map(n => this._pevoPractice(m, n));
      if (!(ps.length && Math.max(...ps) - Math.min(...ps) >= w.practiceGap)) return false;
    }
    if (w.sameOpener !== undefined && !!(nm && m.evoOpener && m.evoOpener === nm) !== !!w.sameOpener) return false;
    if (w.notLastFight && !(nm && !st.lastFightUsed[nm])) return false;
    if (w.usedAll && !(this._pevoKitNames(m).length && this._pevoKitNames(m).every(n => st.used[n]))) return false;
    if (w.readyKind && !(m.kit || []).some(k => k && k.ability && !(k.cd > 0) && this._pevoIsKind(m, k.ability, w.readyKind, {}))) return false;
    if (w.noneReady) { const ks = (m.kit || []).filter(k => k && k.ability && this._pevoIsKind(m, k.ability, w.noneReady, {})); if (!(ks.length && ks.every(k => k.cd > 0))) return false; }
    if (w.lastReady) {
      const ks = (m.kit || []).filter(k => k && k.ability && this._pevoIsKind(m, k.ability, w.lastReady, {}));
      if (!(ks.length >= 2 && ks.filter(k => !(k.cd > 0)).length === 1)) return false;
    }
    return true;
  },
  _pevoHasBoon(m) {
    const st = this._pevoState(m), now = this._pevoNow();
    return Object.values(st.buffs).some(b => b.until > now) || st.empower.some(e => e.until > now && e.uses > 0);
  },
  /** The last three uses repeat the three before them, in order. */
  _pevoRoutine(st) { const h = st.hist; if (h.length < 6) return false; const a = h.slice(-3), b = h.slice(-6, -3); return a.join('|') === b.join('|') && new Set(a).size > 1; },
  /** The last four uses alternate between two abilities. */
  _pevoAlternating(st) { const h = st.hist.slice(-4); return h.length === 4 && h[0] !== h[1] && h[0] === h[2] && h[1] === h[3]; },
  /** The ability used most (ever) among those of its own kind -- its signature. */
  _pevoIsTop(m, a) {
    const kind = this._pevoIsKind(m, a, 'special', {}) ? 'special' : (this._pevoIsKind(m, a, 'spell', {}) ? 'spell' : null);
    const names = this._pevoKitNames(m, kind);
    const uses = m.evoUses || {};
    return names.length > 0 && names.slice().sort((x, y) => (uses[y] || 0) - (uses[x] || 0))[0] === a.name && (uses[a.name] || 0) > 0;
  },
  _pevoHighest(m) { const ns = this._pevoKitNames(m); return ns.slice().sort((a, b) => this._pevoPractice(m, b) - this._pevoPractice(m, a))[0] || null; },
  /** The ability in season this fight: the kit in a fixed rotation, one a fight. */
  _pevoSeason(m) { const ns = this._pevoKitNames(m); return ns.length ? ns[this._pevoState(m).fightId % ns.length] : null; },

  _pevoIsKind(m, a, kind, ctx = {}) {
    if (kind === 'attack') return !!ctx.attack;
    if (kind === 'affliction') return !!(ctx && ctx.key) || !!(a && (abilityRoles(a, abilityDeals).dot || abilityRoles(a, abilityDeals).debuff));
    if (!a) return false;
    const r = abilityRoles(a, abilityDeals);
    switch (kind) {
      case 'spell': return attackKindOf(a, abilityDeals) === 'spell';
      case 'special': return attackKindOf(a, abilityDeals) === 'special';
      case 'summon': return !!r.summoning;
      case 'movement': return !!r.movement;
      case 'heal': return !!(r.healing || r.hot);
      case 'buff': return !!r.buff;
      case 'aoe': return !!r.aoe;
      case 'longCooldown': return (a.cooldown || 0) >= 45;
      case 'favoured': return false;   // a companion has no Astral Blessing to favour anything
      default: return true;
    }
  },
  /** attack, defence or movement: what "the same kind" means for Mimic's Study. */
  _pevoBroadKind(m, a) {
    if (!a) return 'attack';
    const r = abilityRoles(a, abilityDeals);
    if (r.movement) return 'movement';
    if (r.buff || r.healing || r.hot) return 'defence';
    return 'attack';
  },

  // ------------------------------------------------------------------ tallies (counts kept per companion)
  /** A count's bag: on the holder (saved with it), on the enemy (one per companion), or on the chosen ally. */
  _pevoTallyBag(m, at, ctx) {
    if (at === 'self') return (m.evoTally = m.evoTally || {});
    if (at === 'ally') { const a = this._pevoAlly(m); if (!a) return null; const r = a.ref; r._pevoTally = r._pevoTally || {}; return (r._pevoTally[m.id] = r._pevoTally[m.id] || {}); }
    const body = this._pevoReadTarget(m, ctx);
    if (!body) return null;
    body._pevoTally = body._pevoTally || {};
    return (body._pevoTally[m.id] = body._pevoTally[m.id] || {});
  },
  /** A count. The `@` keys are read live (see PARTY_LIVE in evoEngine); any other is a tally. */
  _pevoTallyGet(m, bag, key, ctx = {}, at = 'target') {
    if (!key) return 0;
    if (key[0] === '@') {
      const st = this._pevoState(m), now = this._pevoNow();
      const t = at === 'self' ? m : (at === 'ally' ? ((this._pevoAlly(m) || {}).ref || null) : this._pevoReadTarget(m, ctx));
      const nm = ctx.ability && ctx.ability.name;
      switch (key) {
        case '@enemies': return this._pevoEnemiesNear(m, 6 * TILE).length;
        case '@allies': return this._pevoAlliesNear(m, 6 * TILE);
        case '@rankGap': { const tt = this._pevoReadTarget(m, ctx); return tt ? Math.max(0, this._pevoMonRank(tt) - this._pevoRank(m)) : 0; }
        case '@victimRank': { const tt = this._pevoReadTarget(m, ctx); return tt ? this._pevoMonRank(tt) : 0; }
        case '@range': { const tt = this._pevoReadTarget(m, ctx); return tt ? Math.floor(Math.hypot(tt.wx - m.x, tt.wy - m.y) / TILE) : 0; }
        case '@hit': return ctx.hit || 0;
        case '@idle': { const last = (nm && st.lastUse && st.lastUse[nm]) || st.fightT; return Math.floor(Math.max(0, now - last) / 5); }
        case '@ranks': return Object.values(m.evoAdv || {}).reduce((s, r) => s + ((r && r.r) || 0), 0);
        case '@practice': return nm && m.evoAdv && m.evoAdv[nm] ? m.evoAdv[nm].r || 0 : 0;
        case '@sinceRank': return nm && m.evoAdv && m.evoAdv[nm] ? Math.floor((m.evoAdv[nm].since || 0) / 5) : 0;
        case '@fightLen': return st.fight || ctx.fightLen ? Math.floor((ctx.fightLen !== undefined ? ctx.fightLen : now - st.fightT) / 10) : 0;
        case '@streak': return nm ? ((m.evoStreak || {})[nm] || 0) : 0;
        case '@armor': return Math.floor((((m.stats || {}).armor) || 0) / 20);
        default: break;
      }
      const deb = (t && t.debuffs) || {};
      if (key === '@afflictions') return Object.keys(deb).length;
      if (key.startsWith('@stacks:')) { const d = deb[key.slice(8)]; return d ? (d.stacks || 1) : 0; }
      return 0;
    }
    const e = bag && bag[key];
    if (!e) return 0;
    if (e.until && e.until < this._pevoNow()) { delete bag[key]; return 0; }
    return e.n || 0;
  },
  _pevoScaled(m, op, ctx) {
    const ps = op && op.perStack;
    if (!ps) return op;
    const at = ps.at || 'target';
    const n = Math.min(ps.max || 10, this._pevoTallyGet(m, this._pevoTallyBag(m, at, ctx), ps.key, ctx, at));
    const k = 1 + (ps.k || 0.2) * n;
    const out = { ...op };
    for (const f of ['frac', 'dps', 'amount', 'heal', 'extra', 'dist']) if (typeof out[f] === 'number') out[f] = out[f] * k;
    if (typeof out.seconds === 'number' && ps.seconds) out.seconds = Math.min(120, out.seconds * k);
    return out;
  },

  // ------------------------------------------------------------------ practice (the companion's "advancement")
  /** The kit entry for an ability name. */
  _pevoSlot(m, name) { return (m.kit || []).find(k => k && k.ability && k.ability.name === name) || null; },
  _pevoPractice(m, name) { const r = m.evoAdv && m.evoAdv[name]; return r ? (r.r || 0) + (r.p || 0) : 0; },
  /** Which abilities an `advance` reaches. */
  _pevoAdvanceTargets(m, to, ctx, kind) {
    const st = this._pevoState(m);
    const names = this._pevoKitNames(m, kind || null);
    if (!names.length) return [];
    const uses = m.evoUses || {};
    const pickMax = (score) => names.slice().sort((a, b) => score(b) - score(a))[0];
    const today = st.today && st.today.day === (this._dayIndex ? this._dayIndex() : 0) ? st.today.uses : {};
    const me = (ctx.ability && ctx.ability.name) || null;
    switch (to || 'ctx') {
      case 'all': return names;
      case 'used': return names.filter(n => st.used[n]);
      case 'unused': return names.filter(n => !st.used[n]);
      case 'most': { const n = pickMax(x => st.used[x] || 0); return st.used[n] ? [n] : []; }
      case 'top': return [pickMax(x => uses[x] || 0)];
      case 'least': return [names.slice().sort((a, b) => this._pevoPractice(m, a) - this._pevoPractice(m, b))[0]];
      case 'leastUsed': return [names.slice().sort((a, b) => (uses[a] || 0) - (uses[b] || 0))[0]];
      case 'highest': return [this._pevoHighest(m)].filter(n => n && names.includes(n));
      case 'random': return [names[Math.floor(Math.random() * names.length)]];
      case 'focus': { const f = m.evoFocus && names.includes(m.evoFocus) ? m.evoFocus : pickMax(x => uses[x] || 0); return f === me ? [] : [f]; }
      case 'fixed': return st.fixed && names.includes(st.fixed) ? [st.fixed] : [];
      case 'season': { const s = this._pevoSeason(m); return s && names.includes(s) ? [s] : []; }
      case 'today': { const n = pickMax(x => today[x] || 0); return today[n] ? [n] : []; }
      case 'onceToday': return names.filter(n => today[n] === 1);
      case 'killers': return names.filter(n => st.killsBy[n]);
      case 'recent': return [...new Set(st.hist.slice(-3))].filter(n => names.includes(n));
      case 'same': { const want = this._pevoBroadKind(m, ctx.ability); return [names.filter(n => this._pevoBroadKind(m, this._pevoSlot(m, n).ability) === want).sort((a, b) => this._pevoPractice(m, a) - this._pevoPractice(m, b))[0]].filter(Boolean); }
      case 'essence': { const sl = me && this._pevoSlot(m, me); const e = sl && sl.ability.essenceId; return e ? names.filter(n => n !== me && this._pevoSlot(m, n).ability.essenceId === e) : []; }
      case 'last': return st.last && names.includes(st.last.name) ? [st.last.name] : [];
      default: { const n = me || (st.last && st.last.name); return n && names.includes(n) ? [n] : []; }
    }
  },
  /** Practise one ability by `amount` of a practice rank (taken away, with `drain`); a rank reached is queued as rankUp. */
  _pevoAdvanceOne(m, name, amount, drain = false) {
    if (!name || !(amount > 0)) return 0;
    m.evoAdv = m.evoAdv || {};
    const rec = m.evoAdv[name] = m.evoAdv[name] || { p: 0, r: 0, since: 0 };
    if (drain) { const was = rec.p; rec.p = Math.max(0, rec.p - amount); return was - rec.p; }   // "the drained advancement is lost": never a rank
    if (rec.r >= PRACTICE_MAX) return 0;
    rec.p += amount;
    while (rec.p >= 1 && rec.r < PRACTICE_MAX) {
      rec.p -= 1; rec.r++; rec.since = 0;
      const st = this._pevoState(m);
      (st.rankUps = st.rankUps || []).push(name);
      if (this._floatText && m.x != null) this._floatText(m.x, m.y - 64, `${name}: practised ${rec.r}`, '#e1bee7');
    }
    if (rec.r >= PRACTICE_MAX) rec.p = 0;
    return amount;
  },
  /** Ranks reached during a run, each answered as its own rankUp once the run is over (never inside one); the
   *  companions near enough to see it hear allyRankUp. A rank reached while answering one is kept, not answered. */
  _pevoFlushRankUps(m) {
    const st = this._pevoState(m);
    const q = st.rankUps;
    if (!q || !q.length || st.flushing) return;
    st.rankUps = [];
    st.flushing = true;
    try {
      for (const name of q) {
        const sl = this._pevoSlot(m, name);
        const ability = sl ? sl.ability : { name };
        this._pevoOn(m, 'rankUp', { ability });
        for (const o of this._pevoHolders()) if (o !== m && Math.hypot(o.x - m.x, o.y - m.y) <= ALLY_REACH) this._pevoOn(o, 'allyRankUp', { ability });
      }
    } finally { st.flushing = false; st.rankUps = []; }
  },

  // ------------------------------------------------------------------ the ops
  _pevoHit(m, mon, frac, element) {
    if (!mon || !mon.alive) return 0;
    const f = rankScaledFrac(frac || 0.05, this._pevoRank(m), this._pevoMonRank(mon));
    const dmg = Math.max(1, Math.round((mon.maxHp || mon.hp || 20) * f));
    this._damageMonster(mon, dmg, false, !element || element === 'physical', element && element !== 'physical' ? element : null);
    return dmg;
  },
  /** Where an op lands, from the companion: { x, y, mon } */
  _pevoAt(m, op, ctx) {
    const at = op.at || 'target';
    if (at === 'self' || at === 'ahead') return { x: m.x, y: m.y, mon: null };
    if (at === 'ally') { const a = this._pevoAlly(m); return a ? { x: a.x, y: a.y, mon: null, ally: a } : { x: m.x, y: m.y, mon: null }; }
    if (at === 'corpse' && ctx.victim && ctx.victim.alive === false) return { x: ctx.victim.wx, y: ctx.victim.wy, mon: null };
    if (at === 'nearest') { const n = this._evoNearest(m.x, m.y, 9 * TILE); return n ? { x: n.wx, y: n.wy, mon: n } : null; }
    const t = this._pevoTarget(m, ctx);
    if (at === 'beside') {   // the nearest other enemy to the target
      const from = t || ctx.victim;
      const n = from ? this._evoNearest(from.wx, from.wy, 5 * TILE, from) : null;
      return n ? { x: n.wx, y: n.wy, mon: n } : null;
    }
    if (t) return { x: t.wx, y: t.wy, mon: t };
    if (ctx.victim) return { x: ctx.victim.wx, y: ctx.victim.wy, mon: null };
    return null;
  },
  _pevoList(m, op, ctx, at, r0 = 90) {
    if (!at) return [];
    return (op.at === 'area' || op.radius || op.at === 'self') ? this._evoIn(at.x, at.y, op.radius || r0) : (at.mon ? [at.mon] : []);
  },
  _pevoDebuff(m, mon, key, seconds) { if (this._applyDebuff) this._applyDebuff(mon, key, { duration: seconds, fromPlayer: false, source: m }); },

  _pevoOp(m, op, ctx, event) {
    const st = this._pevoState(m);
    const now = this._pevoNow();
    switch (op.op) {
      case 'damage': {
        const at = this._pevoAt(m, op, ctx); if (!at) return;
        for (const mon of this._pevoList(m, op, ctx, at)) this._pevoHit(m, mon, op.frac, op.element);
        if (this._evoFx) this._evoFx(op.name || 'strike', op.element, at.x, at.y, (op.radius || 60) / 60);
        return;
      }
      case 'zone': {
        const at = this._pevoAt(m, op, ctx); if (!at) return;
        const g = this.add && this.add.graphics ? this.add.graphics() : null;
        if (g && g.setDepth) g.setDepth(2);
        (this._pevoZones = this._pevoZones || []).push({ owner: m, x: at.x, y: at.y, r: op.radius || 80, t: op.seconds || 5, total: op.seconds || 5,
          element: op.element || 'physical', dps: op.dps || 0, afflict: op.afflict || null, slow: !!op.slow, heal: op.heal || 0, pool: op.pool || 'health', acc: 0, g });
        if (this._evoFx) this._evoFx(op.name || 'field', op.element, at.x, at.y, (op.radius || 80) / 60);
        return;
      }
      case 'throw': {
        const mon = this._evoNearest(m.x, m.y, 10 * TILE); if (!mon) return;
        this._pevoHit(m, mon, op.frac, op.element);
        if (op.stun) this._pevoDebuff(m, mon, 'stun', op.stun);
        if (this._evoFx) this._evoFx(op.name || 'hurl', op.element, mon.wx, mon.wy, 1);
        return;
      }
      case 'afflict': {
        const at = this._pevoAt(m, op, ctx);
        for (const mon of this._pevoList(m, op, ctx, at)) for (let s = 0; s < (op.stacks || 1); s++) this._pevoDebuff(m, mon, op.key, op.seconds || 4);
        return;
      }
      case 'spread': {
        const from = ctx.victim; if (!from || !from.debuffs) return;
        const next = this._evoNearest(from.wx, from.wy, op.radius || 160, from); if (!next) return;
        for (const [k, d] of Object.entries(from.debuffs)) for (let s = 0; s < Math.min(5, (d && d.stacks) || 1); s++) this._pevoDebuff(m, next, k, Math.max(2, (d && d.t) || 4));
        return;
      }
      case 'control': {
        const at = this._pevoAt(m, op, ctx);
        for (const mon of this._pevoList(m, op, ctx, at)) this._pevoDebuff(m, mon, op.key || 'stun', op.seconds || 1.5);
        return;
      }
      case 'confuse': {
        const at = this._pevoAt(m, op, ctx);
        for (const mon of this._pevoList(m, op, ctx, at)) if (this._confuseMonster) this._confuseMonster(mon, op.seconds || 3, 0.6);
        return;
      }
      case 'stealth': if (this._applyPartyStealth) this._applyPartyStealth(m, { name: op.name || 'Unseen', stealthDuration: op.seconds || 3 }); return;
      case 'shield': {
        const a = op.at === 'ally' ? this._pevoAlly(m) : null;
        if (a && a.kind === 'player') { const p = this.player; p.shieldHp = Math.min(p.maxHp, (p.shieldHp || 0) + Math.round(p.maxHp * (op.frac || 0.1))); if (this._floatText) this._floatText(a.x, a.y - 50, 'Shielded', '#90caf9'); return; }
        const r = a ? a.ref : m;
        r.evoShield = Math.min(r.maxHp || 50, (r.evoShield || 0) + Math.round((r.maxHp || 50) * (op.frac || 0.1)));
        if (this._floatText) this._floatText(r.x, r.y - 44, 'Shielded', '#90caf9');
        return;
      }
      case 'restore': {
        const pool = op.pool || 'health';
        const a = op.at === 'ally' ? this._pevoAlly(m) : null;
        if (a && a.kind === 'player') {
          const p = this.player;
          if (pool === 'health') { if (this._healFriendly) this._healFriendly({ kind: 'player', x: a.x, y: a.y }, Math.max(1, Math.round(p.maxHp * (op.frac || 0.05)))); }
          else { const mx = pool === 'mana' ? p.maxMana : p.maxStamina; p[pool] = Math.min(mx, (p[pool] || 0) + mx * (op.frac || 0.05)); }
          return;
        }
        const r = a ? a.ref : m;
        if (pool === 'health') {
          const amt = Math.max(1, Math.round((r.maxHp || 50) * (op.frac || 0.05)));
          if (this._healFriendly) this._healFriendly({ kind: 'party', ref: r, x: r.x, y: r.y }, amt); else r.hp = Math.min(r.maxHp, r.hp + amt);
        } else {
          const mx = pool === 'mana' ? r.maxMana : r.maxStamina;
          if (mx > 0) r[pool] = Math.min(mx, (r[pool] || 0) + mx * (op.frac || 0.05));
        }
        return;
      }
      case 'cooldown': {
        const which = op.which || 'others';
        const me = ctx.ability && ctx.ability.name;
        let slots = (m.kit || []).filter(k => k && k.ability);
        if (op.kind) slots = slots.filter(k => this._pevoIsKind(m, k.ability, op.kind, {}));
        if (which === 'ctx') slots = slots.filter(k => k.ability.name === me);
        else if (which === 'others') slots = slots.filter(k => k.ability.name !== me);
        else if (which === 'longest') slots = slots.slice().sort((a, b) => (b.cd || 0) - (a.cd || 0)).slice(0, 1);
        for (const k of slots) k.cd = Math.max(0, (k.cd || 0) * (1 - Math.min(1, op.frac || 0.1)));
        return;
      }
      case 'buff': {
        const a = op.at === 'ally' ? this._pevoAlly(m) : null;
        if (a && a.kind === 'player') {   // you: the player's own buff door
          if (this._evoOp) this._evoOp({ op: 'buff', stat: ['guard', 'costCut'].includes(op.stat) ? 'dodge' : op.stat, amount: op.amount, seconds: op.seconds, name: op.name }, {}, event);
          return;
        }
        const who = a ? a.ref : m;
        const bs = this._pevoState(who).buffs;
        const s = op.stat || 'dmg', cur = bs[s];
        const live = cur && cur.until > now;
        bs[s] = { amount: Math.max(live ? cur.amount : 0, op.amount || 0.1), until: Math.max(live ? cur.until : 0, now + (op.seconds || 5)), fight: !!op.fight || !!(live && cur.fight) };
        if (this._floatText && who.x != null) this._floatText(who.x, who.y - 50, op.name || 'Bolstered', '#a5d6a7');
        return;
      }
      case 'loot': case 'drop':
        // what a kill leaves is the same whoever made it: the player's own door
        if (this._evoOp) this._evoOp(op, { victim: ctx.victim || null }, event);
        return;
      case 'fx': { const at = this._pevoAt(m, op, ctx); if (at && this._evoFx) this._evoFx(op.name || 'flare', op.element, at.x, at.y, 1); return; }
      case 'teleport': {
        const at = this._pevoAt(m, { at: op.to || 'target' }, ctx); if (!at) return;
        if (op.to === 'ally' && !at.ally) return;
        const ang = Math.atan2(m.y - at.y, m.x - at.x);
        const x = at.x + Math.cos(ang) * 40, y = at.y + Math.sin(ang) * 40;
        if (!(this._collidesObstacle && this._collidesObstacle(x, y, 12)) && !(this._isWaterAt && this._isWaterAt(x, y))) { m.x = x; m.y = y; }
        return;
      }
      case 'deathSave': {
        if (event !== 'wouldDie') return;
        m.hp = Math.max(1, Math.round(m.maxHp * (op.hp || 0.15)));
        if (this._floatText) this._floatText(m.x, m.y - 70, op.name || 'Not yet', '#ffd54f');
        return 'saved';
      }
      case 'tally': {
        const bag = this._pevoTallyBag(m, op.at || 'target', ctx); if (!bag) return;
        const key = op.key || 'count';
        if (op.reset) { delete bag[key]; return; }
        const cur = this._pevoTallyGet(m, bag, key);
        const n = Math.max(0, Math.min(op.max || 10, cur + (op.add === undefined ? 1 : op.add)));
        if (n <= 0) delete bag[key]; else bag[key] = { n, until: now + (op.seconds || 10) };
        return;
      }
      case 'cleanse': {
        const a = op.at === 'ally' ? this._pevoAlly(m) : null;
        const ent = a ? a.ref : m;
        if (op.key) { if (ent.debuffs && ent.debuffs[op.key]) delete ent.debuffs[op.key]; return; }
        if (this._cleanseConditions) this._cleanseConditions(ent, { tag: op.tag === 'affliction' ? TAG.affliction : (op.tag === 'control' ? TAG.control : null), count: op.count || 1 });
        return;
      }
      case 'push': case 'pull': {
        const at = this._pevoAt(m, op, ctx);
        const origin = op.from === 'target' && at ? at : { x: m.x, y: m.y };
        for (const mon of this._pevoList(m, op, ctx, at, 100)) if (this._evoShove) this._evoShove(mon, op.op, op.dist || 90, origin);
        return;
      }
      case 'place': {
        // a standing stone where the companion stands (or its target), through the player's own door; its health is the
        // companion's share, not yours. A statue is the player's likeness there, so a companion's "effigy" is a stone
        // that calls enemies to it (taunt) under the companion's name; a wall has no facing of its own and stands as one.
        if (!this._evoPlace) return;
        const at = op.at === 'target' ? this._pevoAt(m, op, ctx) : { x: m.x, y: m.y };
        if (!at) return;
        const p = this.player;
        const frac = Math.min(1.5, (op.frac || 0.5) * ((m.maxHp || 50) / Math.max(1, (p && p.maxHp) || m.maxHp || 50)));
        const first = String(m.name || 'Companion').split(' ')[0];
        this._evoPlace({ ...op, what: 'pillar', taunt: op.taunt !== undefined ? !!op.taunt : op.what === 'statue', at: 'corpse', frac,
          name: op.name ? `${first}: ${op.name}` : `${first}'s ${op.what === 'statue' ? 'effigy' : 'stone'}` }, { corpse: at });
        return;
      }
      // ===== the companion's own
      case 'advance': {
        if (op.at === 'allies') {   // the other companions near enough (your own abilities advance by your own rules)
          for (const o of this._pevoActive()) {
            if (!o || o === m || o.downT > 0 || Math.hypot(o.x - m.x, o.y - m.y) > ALLY_REACH) continue;
            for (const n of this._pevoAdvanceTargets(o, op.to === 'ctx' ? 'same' : op.to, ctx, op.kind)) this._pevoAdvanceOne(o, n, op.amount || 0.05);
            this._pevoFlushRankUps(o);
          }
          return;
        }
        for (const n of this._pevoAdvanceTargets(m, op.to, ctx, op.kind)) this._pevoAdvanceOne(m, n, op.amount || 0.05, !!op.drain);
        return;
      }
      case 'empower': {
        if (op.at === 'ally') {
          const a = this._pevoAlly(m);
          if (a && a.kind === 'player') { if (this._evoOp) this._evoOp({ op: 'buff', stat: 'dmg', amount: Math.min(0.3, op.frac || 0.1), seconds: 6, name: op.name }, {}, event); return; }
          if (a) { this._pevoState(a.ref).empower.push({ frac: Math.min(1, op.frac || 0.1), uses: op.uses || 1, kind: op.kind || null, crit: !!op.crit, until: now + (op.seconds || 30), name: null }); if (this._floatText) this._floatText(a.x, a.y - 58, op.name || 'Empowered', '#ffcc80'); }
          return;
        }
        st.empower.push({ frac: Math.min(1, op.frac || 0.1), uses: op.uses || 1, kind: op.kind || null, crit: !!op.crit, until: now + (op.seconds || 30),
          name: op.same && ctx.ability ? ctx.ability.name : null });
        if (this._floatText && m.x != null) this._floatText(m.x, m.y - 58, op.name || 'Empowered', '#ffcc80');
        return;
      }
      case 'refund': {
        const paid = ctx.paid;
        if (!paid || !(paid.n > 0)) return;
        const mx = paid.pool === 'mana' ? m.maxMana : m.maxStamina;
        m[paid.pool] = Math.min(mx || Infinity, (m[paid.pool] || 0) + paid.n * Math.min(1, op.frac || 0.25));
        return;
      }
      case 'ready': { m.castCd = 0; st.prefer = op.kind || 'any'; return; }
      case 'oneOf': {
        const list = op.ops || [];
        if (!list.length) return;
        return this._pevoOp(m, this._pevoScaled(m, list[Math.floor(Math.random() * list.length)], ctx), ctx, event);
      }
      default: return;
    }
  },

  // ------------------------------------------------------------------ doors: the companion's ability
  /** _updateParty, before the cast: the windup (an empower here strengthens this very use), and who stands near what it
   *  aims at, so the kills it makes can be told apart from the ones it did not. */
  _pevoBeforeCast(m, ability) {
    if (!this._pevoSpecs(m).length) return null;
    const t = m.target && m.target.alive ? m.target : null;
    this._pevoOn(m, 'windup', { ability, victim: t });
    const reach = (ability && (ability.range || ability.explodeRadius)) || 140;
    const near = t ? this._evoIn(t.wx, t.wy, reach) : [];
    return { near, t, aoe: !!(ability && (ability.template === 'aoeRing' || ability.template === 'weakenRing' || ability.explodeRadius)) };
  },
  /** _partyCast: what this use is worth -- the ability's practice ranks and any empower charge it spends. */
  _pevoCastMult(m, ability) {
    if (!m || !m.natureEvo) return 1;
    let k = 1;
    const rec = ability && m.evoAdv && m.evoAdv[ability.name];
    if (rec && rec.r > 0) k *= 1 + PRACTICE_STEP * Math.min(PRACTICE_MAX, rec.r);
    k *= this._pevoSpend(m, (e) => (!e.name || (ability && e.name === ability.name))
      && (!e.kind || e.kind === 'any' || (e.kind !== 'attack' && this._pevoIsKind(m, ability, e.kind, {}))));
    return k;
  },
  /** The swing's share of the empower charges (kind 'attack'). */
  _pevoSwingMult(m) {
    if (!m || !m.natureEvo) return 1;
    return this._pevoSpend(m, (e) => e.kind === 'attack');
  },
  _pevoSpend(m, fits) {
    const st = this._pevoState(m), now = this._pevoNow();
    if (!st.empower.length) return 1;
    let add = 0;
    for (const e of st.empower) {
      if (!(e.uses > 0) || e.until <= now || !fits(e)) continue;
      add += e.crit ? 0.5 + (((m.stats || {}).critDamage) || 0) : e.frac;
      e.uses--;
      if (e.crit && this._floatText && m.x != null) this._floatText(m.x, m.y - 62, 'Critical!', '#ffd54f');
    }
    st.empower = st.empower.filter(e => e.uses > 0 && e.until > now);
    return 1 + Math.min(1.5, add);
  },
  /** The cast's cost after a costCut boon. */
  _pevoCostMult(m) { return 1 - Math.min(1, this._pevoStat(m, 'costCut')); },
  /** _updateParty, which ability: an op asked for one of a kind next. */
  _pevoPick(m, ready) {
    if (!m || !m.natureEvo) return null;
    const st = this._pevoState(m);
    if (!st.prefer) return null;
    const want = st.prefer;
    st.prefer = null;
    return want === 'any' ? null : (ready.find(k => this._pevoIsKind(m, k.ability, want, {})) || null);
  },
  /** _updateParty, after the cast and its cooldown: cast, the kills it made, practice; the companions near see it. */
  _pevoAfterCast(m, slot, pre, cost = 0) {
    if (!m || !slot || !slot.ability || !this._pevoSpecs(m).length) return;
    const a = slot.ability, st = this._pevoState(m), now = this._pevoNow();
    st.prev = st.last;
    st.last = { name: a.name, t: now };
    st.hist.push(a.name); if (st.hist.length > 8) st.hist.shift();
    st.used[a.name] = (st.used[a.name] || 0) + 1;
    if (Object.keys(st.used).length === 1 && st.used[a.name] === 1) st.opener = a.name;
    const day = this._dayIndex ? this._dayIndex() : 0;
    if (!st.today || st.today.day !== day) st.today = { day, uses: {} };
    st.today.uses[a.name] = (st.today.uses[a.name] || 0) + 1;
    m.evoUses = m.evoUses || {};
    m.evoUses[a.name] = (m.evoUses[a.name] || 0) + 1;
    const rec = m.evoAdv && m.evoAdv[a.name];
    if (rec) rec.since = (rec.since || 0) + 1;
    const t = pre && pre.t;
    const hit = pre && pre.aoe ? (pre.near || []).length : (t ? 1 : 0);
    this._pevoOn(m, 'cast', { ability: a, victim: t && Number.isFinite(t.wx) ? t : null, paid: { pool: 'mana', n: cost }, hit, counted: true });
    st.lastUse = st.lastUse || {}; st.lastUse[a.name] = now;
    for (const mon of ((pre && pre.near) || [])) {
      if (!mon || mon.alive !== false) continue;
      st.killsBy[a.name] = (st.killsBy[a.name] || 0) + 1;
      this._pevoOn(m, 'kill', { victim: mon, ability: a });
      this._pevoSeeAlly(m, 'allyKill', { victim: mon });
    }
    if (t && famOf(t)) { m.evoSeen = m.evoSeen || {}; m.evoSeen[famOf(t)] = (m.evoSeen[famOf(t)] || 0) + 1; }
    const rate = this._pevoPassive(m, 'practice');
    if (rate > 0) { this._pevoAdvanceOne(m, a.name, rate); this._pevoFlushRankUps(m); }
    this._pevoSeeAlly(m, 'allyCast', { ability: a });
  },
  /** What a companion does, as the other companions near it see it. */
  _pevoSeeAlly(m, ev, ctx) {
    for (const o of this._pevoHolders()) {
      if (o === m || Math.hypot(o.x - m.x, o.y - m.y) > ALLY_REACH) continue;
      if (ev === 'allyCast') this._pevoState(o).allyCastAt = this._pevoNow();
      this._pevoOn(o, ev, ctx);
    }
  },
  /** _updateParty, after a weapon swing lands. */
  _pevoSwing(m, mon, dmg, crit, cost = 0) {
    if (!m || !mon || !this._pevoSpecs(m).length) return;
    const ctx = { victim: mon, attack: true, paid: { pool: 'stamina', n: cost } };
    this._pevoOn(m, 'strike', ctx);
    if (crit) { this._pevoOn(m, 'crit', ctx); this._pevoSeeAlly(m, 'allyCrit', { victim: mon }); }
    if (mon.alive === false) {
      this._pevoOn(m, 'kill', { victim: mon, attack: true });
      this._pevoSeeAlly(m, 'allyKill', { victim: mon });
      if (famOf(mon)) { m.evoSeen = m.evoSeen || {}; m.evoSeen[famOf(mon)] = (m.evoSeen[famOf(mon)] || 0) + 1; }
    }
  },

  // ------------------------------------------------------------------ doors: the companion is struck
  _pevoStat(m, stat) {
    const b = m && this._pevoStates && this._pevoStates[m.id || m.name] && this._pevoStates[m.id || m.name].buffs[stat];
    return b && b.until > this._pevoNow() ? b.amount || 0 : 0;
  },
  _pevoDmgMult(m) { return 1 + this._pevoStat(m, 'dmg'); },
  /** _damagePartyMember, before mitigation: a dodge boon may turn it aside, a guard boon cuts it. */
  _pevoTaken(m, dmg) {
    const dg = this._pevoStat(m, 'dodge');
    if (dg > 0 && Math.random() < Math.min(0.5, dg)) { if (this._floatText) this._floatText(m.x, m.y - 24, 'Dodge!', '#aed581'); this._pevoEvade(m); return 0; }
    const gd = this._pevoStat(m, 'guard');
    return gd > 0 ? Math.max(1, Math.round(dmg * (1 - Math.min(0.5, gd)))) : dmg;
  },
  /** _damagePartyMember, when the companion's own dodge turns a blow aside. */
  _pevoEvade(m) { if (m && m.natureEvo && this._pevoSpecs(m).length) this._pevoOn(m, 'evade', {}); },
  /** _damagePartyMember, after the blow: hurt, and the once-a-fight lowHealth. A block it made rides in on the member. */
  _pevoHurt(m, taken, attacker = null) {
    const blocked = !!m._pevoBlocked;
    m._pevoBlocked = false;
    if (!this._pevoSpecs(m).length || !(m.hp > 0)) return;
    const st = this._pevoState(m);
    st.lastHurtAt = this._pevoNow();
    this._pevoOn(m, 'hurt', { victim: attacker && attacker.alive !== false ? attacker : null, taken, melee: !!attacker, blocked });
    if (!st.low && m.maxHp > 0) {
      const th = this._pevoSpecs(m).flatMap(s => (s.spec.rules || []).filter(r => r.on === 'lowHealth').map(r => (r.when && r.when.hpBelow) || 0.3));
      if (th.some(x => m.hp / m.maxHp < x)) { st.low = true; this._pevoOn(m, 'lowHealth', {}); }
    }
  },
  /** _damagePartyMember, at a killing blow: true when something held keeps them standing. */
  _pevoWouldDie(m) {
    if (!this._pevoSpecs(m).length) return false;
    return this._pevoOn(m, 'wouldDie', {}) === 'saved' && m.hp > 0;
  },
  _pevoFell(m) {
    m._pevoBlocked = false;
    if (this._pevoSpecs(m).length) { this._pevoState(m).down = true; this._pevoOn(m, 'fall', {}); }
    for (const o of this._pevoHolders()) if (o !== m && Math.hypot(o.x - m.x, o.y - m.y) <= 12 * TILE) this._pevoOn(o, 'allyFall', {});
  },

  // ------------------------------------------------------------------ doors: you, as their ally; resting
  /** From the player's own kill, crit and cast: allyKill / allyCrit / allyCast for each companion near enough to see it. */
  _pevoAllyEvent(kind, ctx = {}) {
    const ev = { kill: 'allyKill', crit: 'allyCrit', cast: 'allyCast' }[kind];
    if (!ev) return;
    for (const m of this._pevoHolders()) {
      const x = ev !== 'allyCast' && ctx.victim ? ctx.victim.wx : this.world.x, y = ev !== 'allyCast' && ctx.victim ? ctx.victim.wy : this.world.y;
      if (Math.hypot(m.x - x, m.y - y) > ALLY_REACH) continue;
      if (ev === 'allyCast') this._pevoState(m).allyCastAt = this._pevoNow();
      this._pevoOn(m, ev, ev === 'allyCast' ? { ability: ctx.ability } : { victim: ctx.victim });
    }
  },
  /** The party rests: each companion names its focus (the ability it has used most) and its quarry (the kind of enemy it
   *  has fought most), then its rest rules run. */
  _pevoRest() {
    for (const m of this._pevoActive()) {
      if (!m || !m.natureEvo || !this._pevoSpecs(m).length) continue;
      const uses = m.evoUses || {};
      const top = this._pevoKitNames(m).sort((a, b) => (uses[b] || 0) - (uses[a] || 0))[0];
      if (top) m.evoFocus = top;
      const seen = Object.entries(m.evoSeen || {}).sort((a, b) => b[1] - a[1])[0];
      if (seen) m.evoQuarry = seen[0];
      this._pevoOn(m, 'rest', {});
    }
  },

  // ------------------------------------------------------------------ the frame
  _pevoTick(dt) {
    if (!(dt > 0)) return;
    this._pevoClock = (this._pevoClock || 0) + dt;
    const now = this._pevoNow();
    this._pevoZoneTick(dt);
    const party = this._pevoActive();
    if (!party.some(m => m && m.natureEvo && Object.keys(m.natureEvo).length)) return;
    const fighting = !!(this._fightingNow && this._fightingNow());
    for (const m of party) {
      if (!m || !m.natureEvo || !this._pevoSpecs(m).length) continue;
      const st = this._pevoState(m);
      // where it is: standing still, moving, and the road it has walked outside a fight
      if (st.pos) {
        const d = Math.hypot(m.x - st.pos.x, m.y - st.pos.y);
        if (d > 2) st.movedAt = now;
        if (!fighting && d < 200) {
          st.walk += d;
          if (st.walk >= TRAVEL_STEP) { st.walk -= TRAVEL_STEP; this._pevoOn(m, 'travel', {}); }
        }
      }
      st.pos = { x: m.x, y: m.y };
      // boons that act through time: regeneration, a quicker cooldown, a quicker hand
      for (const [s, b] of Object.entries(st.buffs)) {
        if (!(b.until > now)) { delete st.buffs[s]; continue; }
        if (s === 'regenHealth' && m.hp > 0 && !(m.downT > 0)) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * b.amount * dt);
        if (s === 'regenMana' && m.maxMana) m.mana = Math.min(m.maxMana, (m.mana || 0) + m.maxMana * b.amount * dt);
        if (s === 'regenStamina' && m.maxStamina) m.stamina = Math.min(m.maxStamina, (m.stamina || 0) + m.maxStamina * b.amount * dt);
        if (s === 'cooldownRate') for (const k of (m.kit || [])) k.cd = Math.max(0, (k.cd || 0) - dt * b.amount);
        if (s === 'castSpeed') m.castCd = Math.max(0, (m.castCd || 0) - dt * b.amount);
      }
      if (st.down && !(m.downT > 0)) { st.down = false; this._pevoOn(m, 'rise', {}); }
      if (m.downT > 0 || m.meditating > 0) continue;
      if (fighting && !st.fight) {
        st.fight = true; st.fightId++; st.fightT = now; st.low = false; st.used = {}; st.killsBy = {};
        const ns = this._pevoKitNames(m);
        st.fixed = ns.length ? ns[Math.floor(Math.random() * ns.length)] : null;
        this._pevoOn(m, 'combatStart', {});
      } else if (!fighting && st.fight) {
        st.fight = false;
        this._pevoFightOver(m, st, now);
      }
      if (st.fight) {
        this._pevoOn(m, 'interval', {});
        const t = m.target && m.target.alive ? m.target : null;
        if (t) this._pevoOn(m, 'use', { victim: t });   // a companion uses its own "you can" when it can
      }
    }
  },
  /** A fight is over: fightEnd (with what the fight was), then what carries to the next one -- each ability's run of
   *  consecutive fights, the opener, what was used -- and the boons that last "until the fight ends" go. */
  _pevoFightOver(m, st, now) {
    this._pevoOn(m, 'fightEnd', { fightLen: now - st.fightT });
    m.evoStreak = m.evoStreak || {};
    for (const n of this._pevoKitNames(m)) m.evoStreak[n] = st.used[n] ? (m.evoStreak[n] || 0) + 1 : 0;
    if (st.opener) m.evoOpener = st.opener;
    st.opener = null;
    st.lastFightUsed = st.used;
    st.used = {}; st.killsBy = {};
    for (const [s, b] of Object.entries(st.buffs)) if (b.fight) delete st.buffs[s];
  },
  _pevoZoneTick(dt) {
    if (!this._pevoZones || !this._pevoZones.length) return;
    for (const z of this._pevoZones) {
      z.t -= dt; z.acc += dt;
      if (z.g && z.g.clear) {
        const pr = isoProject(z.x, z.y), k = Math.max(0, z.t / z.total), col = ZONE_COLOR[z.element] || 0xe0e0e0;
        z.g.clear();
        z.g.fillStyle(col, 0.18 * k + 0.05); z.g.fillEllipse(pr.x, pr.y, z.r * 2, z.r);
        z.g.lineStyle(2, col, 0.5 * k + 0.2); z.g.strokeEllipse(pr.x, pr.y, z.r * 2, z.r);
      }
      if (z.acc < 1) continue;
      z.acc -= 1;
      const m = z.owner;
      for (const mon of this._evoIn(z.x, z.y, z.r)) {
        if (z.dps) this._pevoHit(m, mon, z.dps, z.element);
        if (z.afflict) this._pevoDebuff(m, mon, z.afflict, 3);
        if (z.slow) this._pevoDebuff(m, mon, 'slowMove', 1.5);
      }
      if (z.heal) {
        const bodies = [];
        if (this.world && Math.hypot(this.world.x - z.x, this.world.y - z.y) <= z.r) bodies.push({ kind: 'player', ref: this.player, x: this.world.x, y: this.world.y });
        for (const c of this._pevoActive()) if (c && !(c.downT > 0) && Math.hypot(c.x - z.x, c.y - z.y) <= z.r) bodies.push({ kind: 'party', ref: c, x: c.x, y: c.y });
        for (const b of bodies) {
          try {
            if (z.pool === 'mana') { const r = b.ref; if (r.maxMana) r.mana = Math.min(r.maxMana, (r.mana || 0) + r.maxMana * z.heal); }
            else if (this._healFriendly) this._healFriendly(b.kind === 'player' ? { kind: 'player', x: b.x, y: b.y } : b, Math.max(1, Math.round((b.ref.maxHp || 50) * z.heal)));
          } catch (e) { /* a heal never breaks the tick */ }
        }
      }
    }
    for (const z of this._pevoZones) if (z.t <= 0 && z.g && z.g.destroy) z.g.destroy();
    this._pevoZones = this._pevoZones.filter(z => z.t > 0);
  },

  /** For the Team tab: the practice a companion's abilities carry. */
  _pevoPracticeLine(m) {
    const rows = Object.entries((m && m.evoAdv) || {}).filter(([, r]) => r && r.r > 0).map(([n, r]) => `${n} ${r.r}`);
    return rows.length ? `Practised: ${rows.join(', ')}` : '';
  },
};
