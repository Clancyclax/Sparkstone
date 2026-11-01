// ============================================================================
// ROUND 366 -- THE NATURE GIFT EVOLUTION ENGINE, IN THE SCENE. The vocabulary is src/data/evoEngine.js.
//
// The player's evolutions are recorded on `player.natureEvoRec` (round 365), each carrying the spec it was written
// with. `_evoSpecs()` gathers them; `_evoOn(event, ctx)` runs every rule listening for that event; `_evoTick(dt)`
// runs zones, intervals, the fight clock and the hover card. The passives (hover info, map marks, condemn, gear on
// summons, prices, sight) are read at their own doors through `_evoPassive(key)`.
//
// Hooks into the rest of the scene (one line each, marked ROUND 366):
//   _onTriggerEvent           kill, strike, crit, inflictCondition (as afflict)
//   _monsterHitPlayerCore     hurt
//   corpseMixin               loot
//   _castKnownAbilityCore     cast
//   summon spawn              summon (and the summon boost / gear)
//   _takeLoot                 pickup
//   _triggerDeath             wouldDie
//   _openDialogue / _openShop talk / shop
//   _drawFlatMap              map marks, and where the map is for the hover card
//   the bag                   Condemn / Give to summons buttons
// ============================================================================
import { TILE, isoProject, isoUnproject } from '../data/iso.js';
import { RANK_ORDER } from '../data/ranks.js';
import { pickSpellFx } from '../data/spellFx.js';
import { rankScaledFrac, EVENTS } from '../data/evoEngine.js';
import { abilityRoles } from '../data/buildClasses.js';
import { attackKindOf, blessingFavours } from '../data/outworlder.js';
import { abilityDeals } from '../data/awakening.js';
import { coreDropFor, CORE_DEFS } from '../data/crafting.js';
import { rollStoneDrop } from '../data/stoneCatalog.js';
import { rollEssenceDrop } from '../data/essenceCatalog.js';
import { rollPotion } from '../data/potions.js';
import { rollConsumableDrop } from '../data/inventory.js';
import { monsterLabelFor } from '../data/quests.js';
import { TAG } from '../data/debuffs.js';

const ELEMENT_COLOR = { fire: '#ff7043', frost: '#81d4fa', lightning: '#4dd0e1', nature: '#9ccc65', shadow: '#9575cd', radiant: '#ffe082',
  dimension: '#b388ff', physical: '#e0e0e0', disruptive: '#ce93d8', resonating: '#80cbc4', transcendent: '#fff59d', necrotic: '#a5d6a7' };
const HOVER_ELEMENTS = ['physical', 'fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant', 'dimension', 'necrotic', 'disruptive', 'resonating'];
const RARITY_RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Divine: 5, common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };

export const EvoMixin = {
  // ------------------------------------------------------------------ the specs
  /** Every spec the player holds: [{ id, name, spec }]. Cached per natureStamp. */
  _evoSpecs() {
    const p = this.player;
    if (!p) return [];
    const stamp = `${p.natureStamp || 0}|${p.natureEvoRec ? Object.keys(p.natureEvoRec).length : 0}`;
    if (this._evoCache && this._evoCache.stamp === stamp) return this._evoCache.list;
    const list = [];
    for (const [id, rec] of Object.entries(p.natureEvoRec || {})) {
      if (rec && rec.spec) list.push({ id, name: rec.name, spec: rec.spec });
    }
    this._evoCache = { stamp, list };
    return list;
  },

  /** The value of one engine passive across everything held: numbers add, flags OR, lists join. */
  _evoPassive(key) {
    let out;
    for (const { spec } of this._evoSpecs()) {
      const v = spec.passive && spec.passive[key];
      if (v === undefined) continue;
      if (typeof v === 'number') out = (out || 0) + v;
      else if (Array.isArray(v)) out = [...(out || []), ...v];
      else if (v) out = true;
    }
    return out;
  },

  // ------------------------------------------------------------------ the evolution key (N)
  /** Held evolutions with a `use` rule: [{ id, name, spec }]. */
  _evoUsable() { return this._evoSpecs().filter(x => (x.spec.rules || []).some(r => r.on === 'use')); },
  /** The one on the key: the player's choice, else the newest usable. */
  _evoActive() {
    const list = this._evoUsable();
    if (!list.length) return null;
    return list.find(x => x.id === this.player.evoActive) || list[list.length - 1];
  },
  _evoSetActive(id) { this.player.evoActive = id; if (this._floatText) { const a = this._evoActive(); if (a) this._floatText(this.world.x, this.world.y - 60, `${a.name} on N`, '#b3e5fc'); } },
  /** Press N: the active evolution's `use` rules. Says why when nothing happens. */
  _evoUse() {
    const a = this._evoActive();
    if (!a) { this._floatText(this.world.x, this.world.y - 50, 'No evolution to use', '#9e9e9e'); return false; }
    const now = this._evoClock || 0;
    const waits = (a.spec.rules || []).map((r, i) => r.on === 'use' ? Math.max(0, (this._evoRuleState(`${a.id}#${i}`).readyAt || 0) - now) : null).filter(v => v !== null);
    const fired = this._evoOn('use', {}, a.id);
    if (!fired) {
      const w = Math.min(...waits);
      this._floatText(this.world.x, this.world.y - 50, w > 0 ? `${a.name}: ${Math.ceil(w)}s` : `${a.name}: not now`, '#9e9e9e');
    }
    return !!fired;
  },

  _evoRankOf(m) { return this._monsterRankIndex ? this._monsterRankIndex(m) : 1; },
  _evoMyRank() { return Math.max(0, RANK_ORDER.indexOf((this.player && this.player.rank) || 'normal')); },
  _evoDay() { return this._dayIndex ? this._dayIndex() : 0; },

  // ------------------------------------------------------------------ the events
  /** Run every rule listening for `event`. ctx: { victim, corpse, ability, key, summon, item, taken } */
  _evoOn(event, ctx = {}, only = null) {
    // ROUND 388 -- Drawn From Nowhere: opening a shop is when its vendor collects for a stone called off his shelf
    if (event === 'shop' && this._evoOnShopOpen) { try { this._evoOnShopOpen(ctx.shopId, ctx.npcName); } catch (e) { this._evoWarn('shop debt', e); } }
    const specs = this._evoSpecs();
    if (!specs.length || !EVENTS[event]) return false;
    // ROUND 367 -- an evolution's own afflictions, blows and kills do not set off evolutions again (an `afflict` rule
    // that afflicts would otherwise answer itself forever). One level deep: the event, never the echo.
    if (this._evoDepth > 0) return false;
    this._evoDepth = 1;
    try { return this._evoRun(event, ctx, only, specs); } finally { this._evoDepth = 0; }
  },
  _evoRun(event, ctx, only, specs) {
    let fired = false;
    for (const { id, name, spec } of specs) {
      if (only && id !== only) continue;
      if (event === 'use' && !only) continue;   // the key uses one evolution, never all of them
      (spec.rules || []).forEach((r, i) => {
        if (r.on !== event) return;
        if (!this._evoWhen(r, ctx)) return;
        const st = this._evoRuleState(`${id}#${i}`);
        const now = this._evoClock || 0;
        if (r.cd && now < (st.readyAt || 0)) return;
        if (r.perDay) {
          const d = this._evoDay();
          if (st.day !== d) { st.day = d; st.n = 0; }
          if (st.n >= r.perDay) return;
        }
        if (r.chance !== undefined && Math.random() >= r.chance) return;
        if (r.cost && !this._evoPay(r.cost)) return;
        if (r.cd) st.readyAt = now + r.cd;
        if (r.perDay) st.n++;
        for (const op of r.do) {
          try { if (this._evoOp(this._evoScaled(op, ctx), ctx, event) === 'saved') fired = 'saved'; } catch (e) { this._evoWarn(`${name}: ${op.op}`, e); }
        }
        // ROUND 367 -- "after three hits": a tally the rule waited on is spent when it fires
        const tw = r.when && r.when.tally;
        if (tw && tw.consume) { const bag = this._evoTallyBag(tw.at || 'target', ctx); if (bag) delete bag[tw.key]; }
        if (fired !== 'saved') fired = true;
      });
    }
    return fired;
  },

  _evoWarn(what, e) {
    this._evoWarned = this._evoWarned || new Set();
    if (this._evoWarned.has(what)) return;
    this._evoWarned.add(what);
    console.warn('[evolutions]', what, e);
  },

  _evoRuleState(k) {
    this._evoRules = this._evoRules || {};
    return (this._evoRules[k] = this._evoRules[k] || {});
  },

  _evoWhen(r, ctx) {
    const w = r.when || {};
    const p = this.player;
    if (w.hpBelow !== undefined && !(p.maxHp > 0 && p.hp / p.maxHp < w.hpBelow)) return false;
    if (w.inCombat !== undefined && !!(this._fightingNow && this._fightingNow()) !== !!w.inCombat) return false;
    if (w.stealthed && !(this._isStealthed && this._isStealthed())) return false;
    const m = (w.targetBelow !== undefined || w.rankAbove !== undefined) ? (ctx.victim || (ctx.corpse ? null : this._evoTargetOf(ctx))) : ctx.victim;
    if (w.targetBelow !== undefined && !(m && m.maxHp > 0 && m.hp / m.maxHp < w.targetBelow)) return false;
    const rankOf = m ? this._evoRankOf(m) : (ctx.corpse && Number.isFinite(ctx.corpse.rank) ? ctx.corpse.rank : null);   // a looted body keeps its rank
    if (w.rankAbove !== undefined && !(rankOf !== null && rankOf - this._evoMyRank() >= w.rankAbove)) return false;
    if (w.element && !((ctx.ability && ctx.ability.element === w.element) || (ctx.key && String(ctx.key).includes(w.element)))) return false;
    if (w.kind && w.kind !== 'any' && !this._evoIsKind(ctx.ability, w.kind, ctx)) return false;
    // ROUND 367 -- the memory per target: a count it must have reached, and how afflicted the target is
    if (w.tally && !(this._evoTallyGet(this._evoTallyBag(w.tally.at || 'target', ctx), w.tally.key, ctx, w.tally.at || 'target') >= (w.tally.atLeast || 1))) return false;
    if (w.targetAfflictions !== undefined) {
      const t = this._evoReadTarget(ctx);
      if (!(t && Object.keys(t.debuffs || {}).length >= w.targetAfflictions)) return false;
    }
    return true;
  },

  _evoIsKind(a, kind, ctx) {
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
      case 'favoured': return !!(this.player.astralBlessing && blessingFavours(this.player.astralBlessing, a, abilityDeals));
      default: return true;
    }
  },

  _evoPay(cost) {
    const p = this.player;
    const need = {};
    for (const [pool, frac] of Object.entries(cost)) {
      const max = pool === 'health' ? p.maxHp : pool === 'mana' ? p.maxMana : p.maxStamina;
      const have = pool === 'health' ? p.hp : p[pool];
      need[pool] = Math.ceil((max || 0) * frac);
      if (!(have > need[pool] + (pool === 'health' ? 1 : 0))) return false;
    }
    for (const [pool, n] of Object.entries(need)) {
      if (pool === 'health') p.hp -= n; else p[pool] -= n;
    }
    return true;
  },

  // ------------------------------------------------------------------ the ops
  /** Where an op lands: { x, y, m } */
  _evoAt(op, ctx) {
    const at = op.at || 'target';
    if (at === 'self') return { x: this.world.x, y: this.world.y, m: null };
    if (at === 'ally') { const a = this._evoAlly(); return a ? { x: a.x, y: a.y, m: null, ally: a } : { x: this.world.x, y: this.world.y, m: null }; }
    if (at === 'ahead') { const f = this._evoFacing(); return { x: this.world.x + f.x * 70, y: this.world.y + f.y * 70, m: null }; }
    if (at === 'corpse' && ctx.corpse) return { x: ctx.corpse.x, y: ctx.corpse.y, m: null };
    if (at === 'corpse' && ctx.victim && ctx.victim.alive === false) return { x: ctx.victim.wx, y: ctx.victim.wy, m: null };   // ROUND 367 -- on a kill, where it fell
    const m = this._evoTargetOf(ctx);
    if (at === 'nearest') { const n = this._evoNearest(this.world.x, this.world.y, 9 * TILE); return n ? { x: n.wx, y: n.wy, m: n } : null; }
    if (m) return { x: m.wx, y: m.wy, m };
    if (ctx.corpse) return { x: ctx.corpse.x, y: ctx.corpse.y, m: null };
    return { x: this.world.x, y: this.world.y, m: null };
  },

  /** The enemy an op means by "target": the one in this event, else your selected target, else the nearest. */
  _evoTargetOf(ctx = {}) {
    if (ctx.victim && ctx.victim.alive !== false && !ctx.victim.isPlayer && !ctx.victim.person) return ctx.victim;
    const sel = this._currentTarget ? this._currentTarget('enemy') : null;
    if (sel && sel.alive && !sel.person && Number.isFinite(sel.wx)) return sel;
    return this._evoNearest(this.world.x, this.world.y, 9 * TILE);
  },
  /** The body a count or a condition is READ from: the one in this event even if this blow killed it (a kill's
   *  victim still carries its stacks and its tallies), else the live target. */
  _evoReadTarget(ctx = {}) {
    if (ctx.victim && !ctx.victim.isPlayer && !ctx.victim.person && Number.isFinite(ctx.victim.wx)) return ctx.victim;
    return this._evoTargetOf(ctx);
  },
  /** Which way you face, as a unit vector: toward your target if you have one, else your facing. */
  _evoFacing() {
    const t = this._evoTargetOf({});
    if (t) { const d = Math.hypot(t.wx - this.world.x, t.wy - this.world.y) || 1; return { x: (t.wx - this.world.x) / d, y: (t.wy - this.world.y) / d }; }
    const F = { east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1], northeast: [0.7, -0.7], northwest: [-0.7, -0.7], southeast: [0.7, 0.7], southwest: [-0.7, 0.7] };
    const v = F[(this.player && this.player.facing) || this.facing || 'south'] || [0, 1];
    return { x: v[0], y: v[1] };
  },

  // ------------------------------------------------------------------ ROUND 367: the chosen ally
  /** The ally an op means: the one you selected (Q / D-pad up), else the most wounded within reach, else none. */
  _evoAlly(range = 12 * TILE) {
    const all = this._canonAllies ? this._canonAllies() : [];
    if (!all.length) return null;
    const sel = this._targets && this._targets.ally;
    const near = all.filter(x => Math.hypot(x.x - this.world.x, x.y - this.world.y) <= range);
    const hit = sel && near.find(x => x.ref === sel);
    if (hit) return hit;
    const frac = (x) => { const r = x.ref; return (r.maxHp > 0 ? r.hp / r.maxHp : 1); };
    return near.sort((a, b) => frac(a) - frac(b))[0] || null;
  },
  _evoAllyHeal(a, frac) {
    const r = a.ref, amt = Math.max(1, Math.round((r.maxHp || 50) * frac));
    if (this._healFriendly) this._healFriendly(a, amt); else r.hp = Math.min(r.maxHp || r.hp, r.hp + amt);
  },

  // ------------------------------------------------------------------ ROUND 367: the memory per target
  /** Where a tally lives: on the enemy (target), on the chosen ally, or on you (self). */
  _evoTallyBag(at, ctx) {
    if (at === 'self') return (this._evoSelfTally = this._evoSelfTally || {});
    const body = at === 'ally' ? ((this._evoAlly() || {}).ref || null) : this._evoReadTarget(ctx);
    if (!body) return null;
    return (body._evoTally = body._evoTally || {});
  },
  /** A count. `@afflictions` (how many conditions the target carries), `@stacks:<key>` (stacks of one),
   *  `@enemies` (enemies within six tiles of you) and `@allies` are read live; any other key is a tally. */
  _evoTallyGet(bag, key, ctx = {}, at = 'target') {
    if (!key) return 0;
    if (key[0] === '@') {
      if (key === '@enemies') return this._evoIn(this.world.x, this.world.y, 6 * TILE).length;
      if (key === '@allies') return this._canonAllies ? this._canonAllies().length : 0;
      const t = at === 'self' ? this.player : (at === 'ally' ? ((this._evoAlly() || {}).ref || null) : this._evoReadTarget(ctx));
      const deb = (t && t.debuffs) || {};
      if (key === '@afflictions') return Object.keys(deb).length;
      if (key.startsWith('@stacks:')) { const d = deb[key.slice(8)]; return d ? (d.stacks || 1) : 0; }
      return 0;
    }
    const e = bag && bag[key];
    if (!e) return 0;
    if (e.until && e.until < (this._evoClock || 0)) { delete bag[key]; return 0; }
    return e.n || 0;
  },
  /** An op whose numbers grow with a count: `perStack: { key, at, k, max }` -- each counted one adds k (capped at max counts, 10). */
  _evoScaled(op, ctx) {
    const ps = op && op.perStack;
    if (!ps) return op;
    const at = ps.at || 'target';
    const n = Math.min(ps.max || 10, this._evoTallyGet(this._evoTallyBag(at, ctx), ps.key, ctx, at));
    const k = 1 + (ps.k || 0.2) * n;
    const out = { ...op };
    for (const f of ['frac', 'dps', 'amount', 'heal', 'extra', 'dist']) if (typeof out[f] === 'number') out[f] = out[f] * k;
    if (typeof out.seconds === 'number' && ps.seconds) out.seconds = Math.min(120, out.seconds * k);
    return out;
  },

  _evoNearest(x, y, r, not = null) {
    let best = null, bd = r;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || m.person || m === not) continue;
      const d = Math.hypot(m.wx - x, m.wy - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  },

  _evoIn(x, y, r) { return (this.monsters || []).filter(m => m && m.alive && !m.person && Math.hypot(m.wx - x, m.wy - y) <= r + ((m.type && m.type.radius) || 0)); },

  _evoHit(m, frac, element) {
    if (!m || !m.alive) return 0;
    const f = rankScaledFrac(frac || 0.05, this._evoMyRank(), this._evoRankOf(m));
    const dmg = Math.max(1, Math.round((m.maxHp || m.hp || 20) * f));
    this._damageMonster(m, dmg, true, !element || element === 'physical', element && element !== 'physical' ? element : null);
    return dmg;
  },

  _evoFx(name, element, x, y, scale = 1) {
    let fx = null;
    try { fx = pickSpellFx({ name, element: element || 'physical', color: ELEMENT_COLOR[element] || '#e0e0e0', template: 'aoeRing' }); } catch (e) { fx = null; }
    if (fx && this._playSpellFx) this._playSpellFx(fx, x, y, scale);
  },

  _evoOp(op, ctx, event) {
    const p = this.player;
    switch (op.op) {
      case 'damage': {
        const at = this._evoAt(op, ctx); if (!at) return;
        const list = op.at === 'area' || op.radius ? this._evoIn(at.x, at.y, op.radius || 90) : (at.m ? [at.m] : []);
        for (const m of list) this._evoHit(m, op.frac, op.element);
        this._evoFx(op.name || 'strike', op.element, at.x, at.y, (op.radius || 60) / 60);
        return;
      }
      case 'zone': {
        const at = op._x !== undefined ? { x: op._x, y: op._y } : this._evoAt(op, ctx); if (!at) return;
        this._evoZones = this._evoZones || [];
        const g = this.add.graphics();
        g.setDepth(2);
        this._evoZones.push({ x: at.x, y: at.y, r: op.radius || 80, t: op.seconds || 5, total: op.seconds || 5, element: op.element || 'physical',
          dps: op.dps || 0, afflict: op.afflict || null, slow: !!op.slow, heal: op.heal || 0, acc: 0, g, bound: op._bound || null });
        this._evoFx(op.name || 'field', op.element, at.x, at.y, (op.radius || 80) / 60);
        return;
      }
      case 'throw': {
        const m = this._evoNearest(this.world.x, this.world.y, 10 * TILE); if (!m) return;
        this._evoHit(m, op.frac, op.element);
        if (op.stun && this._applyDebuff) this._applyDebuff(m, 'stun', { duration: op.stun, fromPlayer: true, source: p });
        this._evoFx(op.name || 'hurl', op.element, m.wx, m.wy, 1);
        return;
      }
      case 'afflict': {
        const at = this._evoAt(op, ctx); if (!at) return;
        const list = (op.at === 'area' || op.radius) ? this._evoIn(at.x, at.y, op.radius || 90) : (at.m ? [at.m] : []);
        for (const m of list) for (let s = 0; s < (op.stacks || 1); s++) this._applyDebuff(m, op.key, { duration: op.seconds, fromPlayer: true, source: p });
        return;
      }
      case 'spread': {
        const dead = ctx.victim; if (!dead || !dead.debuffs) return;
        const next = this._evoNearest(dead.wx, dead.wy, op.radius || 160, dead); if (!next) return;
        for (const [k, d] of Object.entries(dead.debuffs)) {
          for (let s = 0; s < Math.min(5, (d && d.stacks) || 1); s++) this._applyDebuff(next, k, { duration: Math.max(2, (d && d.t) || 4), fromPlayer: true, source: p });
        }
        return;
      }
      case 'control': {
        const at = this._evoAt(op, ctx); if (!at) return;
        const list = (op.at === 'area' || op.radius) ? this._evoIn(at.x, at.y, op.radius || 90) : (at.m ? [at.m] : []);
        for (const m of list) this._applyDebuff(m, op.key || 'stun', { duration: op.seconds || 1.5, fromPlayer: true, source: p });
        return;
      }
      case 'confuse': {
        const at = this._evoAt(op, ctx); if (!at) return;
        const list = (op.at === 'area' || op.radius) ? this._evoIn(at.x, at.y, op.radius || 90) : (at.m ? [at.m] : []);
        for (const m of list) this._confuseMonster(m, op.seconds || 3, 0.6);
        return;
      }
      case 'decoy': return this._evoDecoy(op);
      case 'stealth': if (this._applyStealth) this._applyStealth({ name: op.name || 'Unseen', stealthDuration: op.seconds || 3 }); return;
      case 'shield': if (op.at === 'ally') { const a = this._evoAlly(); if (a) { const r = a.ref, amt = Math.round((r.maxHp || 50) * (op.frac || 0.1));
          if (a.kind === 'summon') r.rungShield = (r.rungShield || 0) + amt; else r.evoShield = Math.min(r.maxHp || amt, (r.evoShield || 0) + amt);
          this._floatText(a.x, a.y - 44, 'Shielded', '#90caf9'); return; } }
        p.shieldHp = Math.min(p.maxHp, (p.shieldHp || 0) + Math.round(p.maxHp * (op.frac || 0.1))); this._floatText(this.world.x, this.world.y - 50, 'Shielded', '#90caf9'); return;
      case 'restore': {
        const pool = op.pool || 'health';
        if (op.at === 'ally') {
          const a = this._evoAlly();
          if (a) {
            if (pool === 'health') this._evoAllyHeal(a, op.frac || 0.05);
            else if (a.ref[`max${pool[0].toUpperCase()}${pool.slice(1)}`]) { const mx = a.ref[`max${pool[0].toUpperCase()}${pool.slice(1)}`]; a.ref[pool] = Math.min(mx, (a.ref[pool] || 0) + mx * (op.frac || 0.05)); }
            return;
          }
        }
        if (pool === 'health') { if (this._healPlayer) this._healPlayer(Math.round(p.maxHp * (op.frac || 0.05))); else p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (op.frac || 0.05)); }
        else p[pool] = Math.min(pool === 'mana' ? p.maxMana : p.maxStamina, (p[pool] || 0) + (pool === 'mana' ? p.maxMana : p.maxStamina) * (op.frac || 0.05));
        return;
      }
      case 'cooldown': {
        const cds = p.abilityCdByKey || {};
        for (const k of Object.keys(cds)) {
          if (ctx.key && k === ctx.key) continue;
          if (op.kind) { const e = (p.knownAbilities || {})[k]; if (!e || !this._evoIsKind(e.ability, op.kind, {})) continue; }
          cds[k] = Math.max(0, cds[k] * (1 - (op.frac || 0.1)));
        }
        return;
      }
      case 'buff': {
        const s = op.stat || 'dmg';
        if (op.at === 'ally') {
          const a = this._evoAlly();
          if (a && a.kind === 'party') {
            const r = a.ref, now = this.time ? this.time.now : 0, secs = op.seconds || 5;
            if (s === 'dmg' || s === 'crit' || s === 'castSpeed' || s === 'cooldownRate') {
              const g = r.auraGrant && (r.auraGrant.expires || 0) > now ? r.auraGrant : {};
              r.auraGrant = { ...g, dmgPct: Math.max(g.dmgPct || 0, op.amount || 0.1), expires: Math.max(g.expires || 0, now + secs * 1000) };
            } else if (s === 'regenHealth' && this._applyHot) this._applyHot(a, Math.max(1, Math.round((r.maxHp || 50) * (op.amount || 0.02))), secs);
            else r.evoGuard = { k: Math.min(0.3, op.amount || 0.1), until: (this._evoClock || 0) + secs };
            this._floatText(a.x, a.y - 44, op.name || 'Bolstered', '#a5d6a7');
            return;
          }
          if (a && a.kind === 'summon') { a.ref.rungShield = (a.ref.rungShield || 0) + Math.round((a.ref.maxHp || 30) * Math.min(0.3, op.amount || 0.1)); return; }
        }
        if (s === 'dmg' || s === 'speed' || s === 'crit') {
          p.buffs = p.buffs || {};
          if (s === 'dmg') p.buffs.power = { mult: 1 + (op.amount || 0.1), t: op.seconds || 5 };
          if (s === 'speed') p.buffs.speed = { mult: 1 + (op.amount || 0.1), t: op.seconds || 5 };
          if (s === 'crit') p.buffs.crit = { bonus: op.amount || 0.05, t: op.seconds || 5 };
        } else if (this._grantStatBuff) {
          const key = s === 'dodge' ? 'dodgeChance' : s;
          this._grantStatBuff(key, op.amount || 0.1, op.seconds || 5);
        }
        return;
      }
      case 'husk': return this._evoHusk(op, ctx);
      case 'summonBoost': {
        for (const r of (this._summons || [])) {
          if (!r || r.hp <= 0) continue;
          if (Number.isFinite(r.dmg)) r.dmg = Math.round(r.dmg * (1 + (op.frac || 0.1)));
          if (Number.isFinite(r.maxHp)) { r.maxHp = Math.round(r.maxHp * (1 + (op.frac || 0.1))); r.hp = Math.min(r.maxHp, r.hp + r.maxHp * (op.frac || 0.1)); }
        }
        return;
      }
      case 'loot': {
        const m = ctx.victim || null;
        if (m && Math.random() < Math.min(1, op.extra || 0.25) && this._dropLootFromKill) this._dropLootFromKill(m);
        return;
      }
      case 'core': return this._evoCoreFrom(ctx);
      case 'mark': {
        this._evoMarks = this._evoMarks || [];
        this._evoMarks.push({ what: op.what || 'enemies', r: (op.radius || 30) * TILE, until: (this.time ? this.time.now : 0) + (op.seconds || 20) * 1000, x: this.world.x, y: this.world.y });
        this._floatText(this.world.x, this.world.y - 60, `Marked: ${op.what || 'enemies'}`, '#b3e5fc');
        return;
      }
      case 'teleport': {
        const at = this._evoAt({ at: op.to || 'target' }, ctx); if (!at) return;
        if (op.to === 'ally' && !at.ally) return;
        const a = Math.atan2(this.world.y - at.y, this.world.x - at.x);
        const x = at.x + Math.cos(a) * 40, y = at.y + Math.sin(a) * 40;
        if (!(this._collidesObstacle && this._collidesObstacle(x, y, 12)) && !(this._isWaterAt && this._isWaterAt(x, y)) && this.teleportTo) this.teleportTo(x, y);
        return;
      }
      case 'deathSave': {
        if (event !== 'wouldDie') return;
        p.hp = Math.max(1, Math.round(p.maxHp * (op.hp || 0.15)));
        this._floatText(this.world.x, this.world.y - 70, op.name || 'Not yet', '#ffd54f');
        return 'saved';
      }
      case 'fx': { const at = this._evoAt(op, ctx); if (at) this._evoFx(op.name || 'flare', op.element, at.x, at.y, 1); return; }
      // ===== ROUND 367 -- tallies, the chosen ally, pulling and pushing, placed objects
      case 'tally': {
        const bag = this._evoTallyBag(op.at || 'target', ctx); if (!bag) return;
        const key = op.key || 'count';
        if (op.reset) { delete bag[key]; return; }
        const cur = this._evoTallyGet(bag, key);
        bag[key] = { n: Math.min(op.max || 10, cur + (op.add === undefined ? 1 : op.add)), until: (this._evoClock || 0) + (op.seconds || 10) };
        return;
      }
      case 'cleanse': {
        const a = op.at === 'ally' ? this._evoAlly() : null;
        const ent = a ? a.ref : p;
        if (op.key) { if (ent.debuffs && ent.debuffs[op.key]) delete ent.debuffs[op.key]; return; }   // a named condition, or nothing
        if (this._cleanseConditions) this._cleanseConditions(ent, { tag: op.tag === 'affliction' ? TAG.affliction : (op.tag === 'control' ? TAG.control : null), count: op.count || 1 });
        return;
      }
      case 'push':
      case 'pull': {
        const at = this._evoAt(op, ctx); if (!at) return;
        const list = (op.at === 'area' || op.radius) ? this._evoIn(at.x, at.y, op.radius || 100) : (at.m ? [at.m] : []);
        for (const m of list) this._evoShove(m, op.op, op.dist || 90, op.from === 'target' ? at : null);
        return;
      }
      case 'place': return this._evoPlace(op, ctx);
      case 'drop': {
        if (op.chance !== undefined && Math.random() >= op.chance) return;
        const src = ctx.corpse || (ctx.victim ? { x: ctx.victim.wx, y: ctx.victim.wy } : { x: this.world.x, y: this.world.y });
        const rank = ctx.victim ? this._evoRankOf(ctx.victim) : (ctx.corpse && Number.isFinite(ctx.corpse.rank) ? ctx.corpse.rank : this._evoMyRank());
        const rankKey = RANK_ORDER[rank] || 'normal';
        const w = op.what || 'stone';
        if (w === 'coin') { if (this._spawnCoinPickup) this._spawnCoinPickup(src.x, src.y, Math.max(1, Math.round(5 * Math.pow(3, rank))), rankKey); return; }
        let drop = null;
        if (w === 'stone') drop = { kind: 'stone', id: rollStoneDrop(Math.random) };
        else if (w === 'essence') drop = { kind: 'essence', id: rollEssenceDrop(Math.random) };
        else if (w === 'potion') drop = { kind: 'consumable', id: rollPotion(Math.random, rankKey) };
        else if (w === 'consumable') drop = { kind: 'consumable', id: rollConsumableDrop(Math.random, rankKey) };
        else if (w === 'core') drop = { kind: 'core', id: coreDropFor(rank).id };
        if (drop && drop.id && this._dropLoot) this._dropLoot(src.x, src.y, drop);
        return;
      }
      default: return;
    }
  },

  // ------------------------------------------------------------------ ROUND 367: pulling and pushing
  /** Move an enemy `dist` px away from you (push) or toward you (pull), over a quarter second, through the
   *  monsters' own step so walls and water still hold. Big things move less; a boss a third as far. */
  _evoShove(m, kind, dist, from = null) {
    if (!m || !m.alive || m.person) return;
    const ox = from ? from.x : this.world.x, oy = from ? from.y : this.world.y;
    let dx = m.wx - ox, dy = m.wy - oy;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    let go = dist * (m.boss || m.bossName ? 0.35 : 1) * (((m.type && m.type.radius) || 14) > 26 ? 0.6 : 1);
    if (kind === 'pull') { go = Math.min(go, Math.max(0, d - 34)); dx = -dx; dy = -dy; }
    if (!(go > 1)) return;
    m._evoShove = { vx: dx * go / 0.25, vy: dy * go / 0.25, t: 0.25 };
  },
  _evoShoveTick(dt) {
    for (const m of (this.monsters || [])) {
      const sh = m && m._evoShove;
      if (!sh) continue;
      const step = Math.min(dt, sh.t);
      sh.t -= step;
      if (m.alive && this._monsterStep) this._monsterStep(m, m.wx + sh.vx * step, m.wy + sh.vy * step);
      if (sh.t <= 0) m._evoShove = null;
    }
  },

  // ------------------------------------------------------------------ ROUND 367: placed objects
  /** `place`: a wall (a line across your facing that enemies cannot walk or shoot through), a statue (your likeness in
   *  stone, which draws enemies to it and takes their blows), or a pillar (a plain standing stone, struck but not
   *  shouted at unless `taunt`). `around` is a zone (as the zone op) that stands where the object stands while it does. */
  _evoPlace(op, ctx) {
    const what = op.what || 'wall';
    const secs = Math.min(60, op.seconds || 8);
    const at = op.at ? this._evoAt(op, ctx) : null;
    const f = this._evoFacing();
    const cx = at ? at.x : this.world.x + f.x * 70, cy = at ? at.y : this.world.y + f.y * 70;
    let bound = null;
    if (what === 'wall') {
      const len = Math.max(48, Math.min(320, op.length || 160));
      const px = -f.y, py = f.x;   // across the facing
      const w = { ax: cx - px * len / 2, ay: cy - py * len / 2, bx: cx + px * len / 2, by: cy + py * len / 2, r: 12, t: secs, total: secs, g: null };
      w.g = this.add ? this.add.graphics() : null;
      if (w.g) {
        const n = Math.max(3, Math.round(len / 22));
        for (let i = 0; i < n; i++) {
          const k = (i + 0.5) / n, wx = w.ax + (w.bx - w.ax) * k, wy = w.ay + (w.by - w.ay) * k;
          const pr = isoProject(wx, wy);
          w.g.fillStyle(0x6d6258, 1); w.g.fillRect(pr.x - 12, pr.y - 30, 24, 30);
          w.g.fillStyle(0x8d8073, 1); w.g.fillRect(pr.x - 12, pr.y - 34, 24, 6);
          w.g.lineStyle(1, 0x3e3731, 1); w.g.strokeRect(pr.x - 12, pr.y - 30, 24, 30);
        }
        const mid = isoProject(cx, cy);
        w.g.setDepth(mid.y + 1);
      }
      (this._evoWalls = this._evoWalls || []).push(w);
      bound = w;
      // anything standing in the line is pushed out of it, to the far side
      for (const m of this._evoIn(cx, cy, len / 2 + 20)) if (this._evoWallHit(m.wx, m.wy, (m.type && m.type.radius) || 12, [w])) this._evoShove(m, 'push', 40);
    } else {
      const p = this.player;
      const rec = { kind: 'evoObject', what, name: op.name || (what === 'statue' ? 'Your likeness' : 'Standing stone'), color: '#bcaaa4',
        wx: cx, wy: cy, t: secs, maxHp: Math.max(10, Math.round((p.maxHp || 100) * Math.min(1.5, op.frac || 0.5))), sprite: null };
      rec.hp = rec.maxHp;
      const pr = isoProject(cx, cy);
      if (what === 'statue' && this.playerSprite && this.playerSprite.texture && this.add) {
        rec.sprite = this.add.sprite(pr.x, pr.y, this.playerSprite.texture.key, this.playerSprite.frame ? this.playerSprite.frame.name : 0);
        rec.sprite.setOrigin(this.playerSprite.originX, this.playerSprite.originY);
        rec.sprite.setScale(this.playerSprite.scaleX, this.playerSprite.scaleY);
        rec.sprite.setTint(0x9e9e9e);
        rec.sprite.setDepth(pr.y);
      } else if (this.add) {
        const g = this.add.graphics();
        g.fillStyle(0x7d7064, 1); g.fillRect(pr.x - 9, pr.y - 46, 18, 46);
        g.fillStyle(0x9c8f82, 1); g.fillRect(pr.x - 11, pr.y - 50, 22, 6);
        g.lineStyle(1, 0x3e3731, 1); g.strokeRect(pr.x - 9, pr.y - 46, 18, 46);
        g.setDepth(pr.y);
        rec.gfx = g;   // not `sprite`: the shadow pass and the retinue read a sprite's size, which a drawing does not have
      }
      (this._summons = this._summons || []).push(rec);
      if (rec.gfx) (this._evoGfxObjects = this._evoGfxObjects || []).push(rec);
      bound = rec;
      const taunt = op.taunt !== undefined ? !!op.taunt : what === 'statue';
      if (taunt && this._applyTaunt) {
        rec.evoTaunt = { radius: op.radius || 220, every: 3, acc: 3 };
      }
      this._floatText(cx, cy - 56, rec.name, '#d7ccc8');
    }
    if (op.around) this._evoOp({ op: 'zone', ...op.around, at: undefined, seconds: secs, _bound: bound, _x: cx, _y: cy }, ctx, 'place');
  },

  /** Is a body of radius r at (x, y) inside a placed wall? */
  _evoWallHit(x, y, r, walls = this._evoWalls) {
    if (!walls || !walls.length) return false;
    for (const w of walls) {
      if (!(w.t > 0)) continue;
      const vx = w.bx - w.ax, vy = w.by - w.ay, L = vx * vx + vy * vy || 1;
      const k = Math.max(0, Math.min(1, ((x - w.ax) * vx + (y - w.ay) * vy) / L));
      const qx = w.ax + vx * k, qy = w.ay + vy * k;
      if (Math.hypot(x - qx, y - qy) < w.r + r) return true;
    }
    return false;
  },

  /** Placed objects through time: walls fade and fall, statues keep calling enemies to them. */
  _evoObjectsTick(dt) {
    if (this._evoWalls && this._evoWalls.length) {
      for (const w of this._evoWalls) {
        w.t -= dt;
        if (w.g) w.g.setAlpha(Math.max(0.25, Math.min(1, w.t / 1.5)));
        if (w.t <= 0 && w.g) { w.g.destroy(); w.g = null; }
      }
      this._evoWalls = this._evoWalls.filter(w => w.t > 0);
    }
    // a drawn stone goes with its record (the summon tick only knows sprites)
    this._evoGfxObjects = (this._evoGfxObjects || []).filter(rec => {
      const gone = !(rec.hp > 0) || !(rec.t > 0) || !(this._summons || []).includes(rec);
      if (gone && rec.gfx) { rec.gfx.destroy(); rec.gfx = null; }
      else if (rec.gfx) rec.gfx.setAlpha(rec.t < 1.5 ? Math.max(0.25, rec.t / 1.5) : 1);
      return !gone;
    });
    for (const rec of (this._summons || [])) {
      if (!rec || rec.kind !== 'evoObject' || !rec.evoTaunt || !(rec.hp > 0)) continue;
      rec.evoTaunt.acc += dt;
      if (rec.evoTaunt.acc < rec.evoTaunt.every) continue;
      rec.evoTaunt.acc = 0;
      this._applyTaunt({ kind: 'summon', ref: rec, pos: () => ({ x: rec.wx, y: rec.wy }), alive: () => rec.hp > 0 && (this._summons || []).includes(rec) },
        { tauntRadius: rec.evoTaunt.radius, tauntDuration: 3.5, tauntMax: 8 });
    }
  },

  /** A decoy: a pale likeness where you stand that enemies near it go after (the taunt system's source). */
  _evoDecoy(op) {
    const p = this.player;
    const pr = isoProject(this.world.x, this.world.y);
    const key = this.playerSprite && this.playerSprite.texture ? this.playerSprite.texture.key : null;
    const spr = key ? this.add.sprite(pr.x, pr.y, key, this.playerSprite.frame ? this.playerSprite.frame.name : 0) : null;
    if (spr) { spr.setOrigin(this.playerSprite.originX, this.playerSprite.originY); spr.setAlpha(0.55); spr.setTint(0xb3e5fc); spr.setDepth(this.playerSprite.depth - 1); }
    const rec = { x: this.world.x, y: this.world.y, t: op.seconds || 4, spr, hp: 1 };
    (this._evoDecoys = this._evoDecoys || []).push(rec);
    if (this._applyTaunt) {
      this._applyTaunt({ kind: 'decoy', ref: rec, pos: () => ({ x: rec.x, y: rec.y }), alive: () => rec.t > 0 },
        { tauntRadius: op.radius || 220, tauntDuration: op.seconds || 4, tauntMax: 8 });
    }
    this._floatText(this.world.x, this.world.y - 60, op.name || 'Decoy', '#b3e5fc');
  },

  /** The corpse (or the target) rises and fights for you a while. */
  _evoHusk(op, ctx) {
    const src = ctx.corpse || ctx.victim;
    if (!src || !this._spawnSummon) return;
    const x = src.x != null ? src.x : src.wx, y = src.y != null ? src.y : src.wy;
    const a = { name: op.name || 'Risen Husk', kind: 'active', template: 'summonCreature', summonKind: 'creature',
      summonDuration: op.seconds || 20, summonHp: Math.max(10, Math.round((src.maxHp || 30) * (op.frac || 0.3))), summonDmg: 6, element: op.element || 'necrotic', _evoHusk: true, _at: { x, y } };
    try { this._spawnSummon(a); } catch (e) { this._evoWarn('husk', e); }
  },

  /** A core from a kill: the rank of what died. */
  _evoCoreFrom(ctx) {
    const m = ctx.victim || null;
    const rank = m ? this._evoRankOf(m) : (ctx.corpse && Number.isFinite(ctx.corpse.rank) ? ctx.corpse.rank : this._evoMyRank());
    return this._evoGrantCore(rank, ctx.corpse ? { x: ctx.corpse.x, y: ctx.corpse.y } : null);
  },
  _evoGrantCore(rank, at = null) {
    const core = coreDropFor(rank);
    if (!core || !core.id) return false;
    const inv = this.player.inventory;
    (inv.cores = inv.cores || []).push(core.id);
    const def = CORE_DEFS[core.id] || {};
    this._floatText((at || this.world).x, (at || this.world).y - 50, `+ ${def.name || def.label || 'core'}`, '#ffcc80');
    return true;
  },

  // ------------------------------------------------------------------ the tick
  _evoTick(dt) {
    const p = this.player;
    if (!this._evoClickWired && typeof document !== 'undefined') {
      this._evoClickWired = true;
      document.addEventListener('click', (ev) => {
        const b = ev.target && ev.target.closest ? ev.target.closest('[data-evoactive]') : null;
        if (!b) return;
        this._evoSetActive(b.dataset.evoactive);
        if (this._renderInventory) this._renderInventory();
      });
    }
    if (!p || !(dt > 0)) return;
    this._evoClock = (this._evoClock || 0) + dt;   // the engine's own clock: game time, paused with the panels
    const specs = this._evoSpecs();
    // zones
    if (this._evoZones && this._evoZones.length) {
      for (const z of this._evoZones) {
        z.t -= dt; z.acc += dt;
        if (z.bound && (z.bound.t <= 0 || (z.bound.hp !== undefined && z.bound.hp <= 0))) z.t = 0;   // ROUND 367 -- it falls with what it stood on
        const pr = isoProject(z.x, z.y);
        const k = Math.max(0, z.t / z.total);
        z.g.clear();
        z.g.fillStyle(parseInt((ELEMENT_COLOR[z.element] || '#e0e0e0').slice(1), 16), 0.18 * k + 0.05);
        z.g.fillEllipse(pr.x, pr.y, z.r * 2, z.r);
        z.g.lineStyle(2, parseInt((ELEMENT_COLOR[z.element] || '#e0e0e0').slice(1), 16), 0.5 * k + 0.2);
        z.g.strokeEllipse(pr.x, pr.y, z.r * 2, z.r);
        if (z.acc >= 1) {
          z.acc -= 1;
          for (const m of this._evoIn(z.x, z.y, z.r)) {
            if (z.dps) this._evoHit(m, z.dps, z.element);
            if (z.afflict) this._applyDebuff(m, z.afflict, { duration: 3, fromPlayer: true, source: p });
            if (z.slow) this._applyDebuff(m, 'slowMove', { duration: 1.5, fromPlayer: true, source: p });
          }
          if (z.heal && Math.hypot(this.world.x - z.x, this.world.y - z.y) <= z.r && this._healPlayer) this._healPlayer(Math.round(p.maxHp * z.heal));
          if (z.heal && this._healFriendly) {
            for (const c of (this._activeParty ? this._activeParty() : [])) {
              if (!c || c.downT > 0 || Math.hypot(c.x - z.x, c.y - z.y) > z.r) continue;
              try { this._healFriendly({ kind: 'party', ref: c, x: c.x, y: c.y }, Math.round((c.maxHp || 50) * z.heal)); } catch (e) { /* a heal never breaks the tick */ }
            }
          }
        }
      }
      for (const z of this._evoZones) if (z.t <= 0) z.g.destroy();
      this._evoZones = this._evoZones.filter(z => z.t > 0);
    }
    // decoys
    if (this._evoDecoys && this._evoDecoys.length) {
      for (const d of this._evoDecoys) { d.t -= dt; if (d.t <= 0 && d.spr) d.spr.destroy(); else if (d.spr) d.spr.setAlpha(0.3 + 0.25 * Math.min(1, d.t)); }
      this._evoDecoys = this._evoDecoys.filter(d => d.t > 0);
    }
    if (this._evoMarks) this._evoMarks = this._evoMarks.filter(m => m.until > (this.time ? this.time.now : 0));
    this._evoShoveTick(dt);   // ROUND 367
    this._evoObjectsTick(dt);   // ROUND 367
    this._evoHoverTick();
    if (this._evoLootTick) this._evoLootTick(dt);   // ROUND 388 -- tentacles, spoils left behind, held specs refreshed
    if (!specs.length) return;
    // the fight clock: combatStart, lowHealth (once a fight), intervals
    const fighting = !!(this._fightingNow && this._fightingNow());
    if (fighting && !this._evoFighting) { this._evoLowFired = false; this._evoOn('combatStart', {}); }
    this._evoFighting = fighting;
    if (fighting && !this._evoLowFired && p.maxHp > 0) {
      const thresholds = specs.flatMap(s => (s.spec.rules || []).filter(r => r.on === 'lowHealth').map(r => (r.when && r.when.hpBelow) || 0.3));
      if (thresholds.some(t => p.hp / p.maxHp < t)) { this._evoLowFired = true; this._evoOn('lowHealth', { victim: null }); }
    }
    if (fighting) this._evoOn('interval', {});
  },

  /** On wouldDie: true when something held keeps you alive. */
  _evoWouldDie() {
    return this._evoOn('wouldDie', {}) === 'saved' && this.player.hp > 0;
  },

  // ------------------------------------------------------------------ passives
  /** Summon gear: what a summon gains from the gear given to it from your bag. Applied as it appears. */
  _evoSummonGear(rec) {
    if (!rec || !this._evoPassive('summonGear')) return;
    const worn = ((this.player.inventory && this.player.inventory.gearItems) || []).filter(g => g.summonWorn);
    if (!worn.length) return;
    let k = 0;
    for (const g of worn) k += 0.06 * (1 + (RARITY_RANK[g.rarity] || 0));
    if (Number.isFinite(rec.dmg)) rec.dmg = Math.max(1, Math.round(rec.dmg * (1 + k)));
    if (Number.isFinite(rec.maxHp)) { rec.maxHp = Math.round(rec.maxHp * (1 + k)); rec.hp = rec.maxHp; }
    rec.evoGear = k;
  },

  /** Condemn a gear item from the bag into cores whose rank matches its quality. */
  _evoCondemn(uid) {
    const inv = this.player.inventory;
    const at = (inv.gearItems || []).findIndex(g => String(g.uid) === String(uid));
    if (at < 0 || !this._evoPassive('condemn')) return false;
    const g = inv.gearItems[at];
    inv.gearItems.splice(at, 1);
    const rank = Math.min(4, RARITY_RANK[g.rarity] || 0);
    const n = 1 + Math.floor(rank / 2);
    for (let i = 0; i < n; i++) this._evoGrantCore(rank);
    this._floatText(this.world.x, this.world.y - 70, `${g.name} condemned`, '#ef9a9a');
    if (this._renderInventory) this._renderInventory();
    return true;
  },

  _evoToggleSummonGear(uid) {
    const g = ((this.player.inventory && this.player.inventory.gearItems) || []).find(x => String(x.uid) === String(uid));
    if (!g) return false;
    const worn = this.player.inventory.gearItems.filter(x => x.summonWorn).length;
    if (!g.summonWorn && worn >= 3) { this._floatText(this.world.x, this.world.y - 50, 'Your summons carry three pieces at most', '#ef9a9a'); return false; }
    g.summonWorn = !g.summonWorn;
    if (this._renderInventory) this._renderInventory();
    return true;
  },

  /** The bag's extra buttons on a gear row. */
  _evoGearButtons(g) {
    let out = '';
    if (this._evoPassive('condemn')) out += ` <button class="action-btn" data-act="gearcondemn" data-uid="${g.uid}">Condemn</button>`;
    if (this._evoPassive('summonGear')) out += ` <button class="action-btn" data-act="gearsummon" data-uid="${g.uid}">${g.summonWorn ? 'Take from summons' : 'Give to summons'}</button>`;
    return out;
  },

  /** Prices: priceCut on what you buy, sellBonus on what you sell. */
  _evoBuyMult() { return 1 - Math.min(0.5, this._evoPassive('priceCut') || 0); },
  _evoSellMult() { return 1 + Math.min(0.5, this._evoPassive('sellBonus') || 0); },
  _evoSightMult() { return 1 - Math.min(0.6, this._evoPassive('sightCut') || 0); },

  // ------------------------------------------------------------------ the map
  /** Marks on the map: the passives' standing marks and the mark op's timed ones. */
  _evoMapMarks(ctx, toM, onLayer, onMap) {
    if (this._evoSpoilMapDots) this._evoSpoilMapDots(ctx, toM, onLayer, onMap);   // ROUND 388 -- Borderless Spoils' gold rings
    const standing = this._evoPassive('mapMarks') || [];
    const timed = this._evoMarks || [];
    if (!standing.length && !timed.length) return;
    const radius = (this._evoPassive('mapRadius') || 40) * TILE;
    const want = [...standing.map(w => ({ what: w, x: this.world.x, y: this.world.y, r: radius })), ...timed];
    const draw = (wx, wy, color, size = 2.5) => {
      if (onLayer && !onLayer(wx, wy)) return;
      const p = toM(wx, wy);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI * 2); ctx.fill();
    };
    this._evoMapDots = [];
    for (const w of want) {
      if (w.what === 'enemies') {
        for (const m of (this.monsters || [])) {
          if (!m || !m.alive || m.person || Math.hypot(m.wx - w.x, m.wy - w.y) > w.r) continue;
          draw(m.wx, m.wy, '#ef5350', 2.6);
          const p = toM(m.wx, m.wy);
          this._evoMapDots.push({ canvas: ctx.canvas, x: p.x, y: p.y, m });
        }
      } else if (w.what === 'corpses') {
        for (const c of (this.corpses || [])) if (c && !c.looted && Math.hypot(c.x - w.x, c.y - w.y) <= w.r) draw(c.x, c.y, '#bcaaa4', 2);
      } else if (w.what === 'chests') {
        for (const c of (this.chests || [])) if (c && !c.opened && Math.hypot(c.x - w.x, c.y - w.y) <= w.r) draw(c.x, c.y, '#ffd54f', 2.6);
      } else if (w.what === 'nodes') {
        for (const n of (this.harvestNodes || [])) if (n && Math.hypot(n.x - w.x, n.y - w.y) <= w.r) draw(n.x, n.y, '#a5d6a7', 2);
      } else if (w.what === 'stones' || w.what === 'essences') {
        for (const s of (this.sites || [])) if (s && Math.hypot(s.x - w.x, s.y - w.y) <= w.r) draw(s.x, s.y, w.what === 'stones' ? '#ce93d8' : '#80deea', 2.8);
        for (const l of (this.lootDrops || [])) if (l && l.kind === (w.what === 'stones' ? 'stone' : 'essence') && Math.hypot(l.x - w.x, l.y - w.y) <= w.r) draw(l.x, l.y, '#ce93d8', 2.2);
      }
    }
  },

  // ------------------------------------------------------------------ the hover card
  /** "Hovering over an enemy shows its health, resistances and weaknesses" -- in the world, and on the map's dots. */
  _evoHoverTick() {
    if (!this._evoPassive('hoverInfo')) { this._evoHoverHide(); return; }
    let m = null, sx = 0, sy = 0;
    const ptr = this.input && this.input.activePointer;
    if (ptr) {
      for (const c of (this.monsters || [])) {
        if (!c || !c.alive || c.person) continue;
        const pr = isoProject(c.wx, c.wy);
        if (Math.abs(ptr.worldX - pr.x) < 26 && ptr.worldY < pr.y + 8 && ptr.worldY > pr.y - 70) { m = c; break; }
      }
      sx = ptr.x; sy = ptr.y;
    }
    if (!m && this._evoMapPtr && this._evoMapDots) {
      const mp = this._evoMapPtr;
      const hit = this._evoMapDots.find(d => d.canvas === mp.canvas && Math.hypot(d.x - mp.x, d.y - mp.y) < 6);
      if (hit && hit.m && hit.m.alive) { m = hit.m; sx = mp.cx; sy = mp.cy; }
    }
    if (!m) { this._evoHoverHide(); return; }
    this._evoHoverShow(m, sx, sy);
  },

  _evoHoverHide() { if (typeof document === 'undefined') return; const el = document.getElementById('evoHover'); if (el) el.style.display = 'none'; },

  _evoHoverShow(m, sx, sy) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('evoHover');
    if (!el) {
      el = document.createElement('div');
      el.id = 'evoHover';
      el.style.cssText = 'position:fixed;z-index:40;pointer-events:none;padding:6px 9px;border-radius:6px;background:rgba(14,12,20,.92);'
        + 'border:1px solid #b3e5fc;color:#e3f2fd;font:12px system-ui,sans-serif;max-width:240px;line-height:1.35;';
      document.body.appendChild(el);
      // the map's canvases: where the pointer is over them, for the dots
      document.addEventListener('mousemove', (ev) => {
        const t = ev.target;
        if (t && t.tagName === 'CANVAS' && t !== (this.game && this.game.canvas)) {
          const r = t.getBoundingClientRect();
          this._evoMapPtr = { canvas: t, x: (ev.clientX - r.left) * (t.width / r.width), y: (ev.clientY - r.top) * (t.height / r.height), cx: ev.clientX, cy: ev.clientY };
        } else this._evoMapPtr = null;
      });
    }
    const weak = [], resist = [];
    for (const e of HOVER_ELEMENTS) {
      let k = 1;
      try { k = e === 'physical' ? 1 : (this._monsterElementMult ? this._monsterElementMult(m, e) : 1); } catch (err) { k = 1; }
      if (k > 1.01) weak.push(`${e} ×${k.toFixed(2)}`);
      else if (k < 0.99) resist.push(`${e} ×${k.toFixed(2)}`);
    }
    const name = m.bossName || m.name || (m.key ? monsterLabelFor(m.key) : (m.type && m.type.name)) || 'Enemy';
    const rank = RANK_ORDER[this._evoRankOf(m)] || '';
    const best = weak.length ? weak.sort((a, b) => parseFloat(b.split('×')[1]) - parseFloat(a.split('×')[1]))[0].split(' ')[0] : null;
    el.innerHTML = `<b>${name}</b> <span style="opacity:.7">${rank}</span><br>Health ${Math.round(m.hp)} / ${Math.round(m.maxHp || m.hp)}`
      + `<br><span style="color:#a5d6a7">Weak to:</span> ${weak.length ? weak.join(', ') : 'nothing'}`
      + `<br><span style="color:#ef9a9a">Resists:</span> ${resist.length ? resist.join(', ') : 'nothing'}`
      + (best ? `<br><span style="opacity:.8">Most exposed to ${best}</span>` : '');
    const rect = this.game && this.game.canvas ? this.game.canvas.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
    const scale = rect.width / ((this.game && this.game.canvas && this.game.canvas.width) || rect.width);
    const x = this._evoMapPtr ? sx : rect.left + sx * scale;
    const y = this._evoMapPtr ? sy : rect.top + sy * scale;
    el.style.left = `${Math.round(x + 14)}px`;
    el.style.top = `${Math.round(y + 10)}px`;
    el.style.display = 'block';
  },
};
