// ============================================================================
// ROUND 382 -- THE THEMED PASSIVES, IN PLAY.
//
// data/themePassives.js gives a generic stat passive a trigger and a reward
// from its essence x stone pairing ("After you hit an enemy suffering an
// affliction, you move 20% faster for 3s"; "A critical hit takes 1s off your
// abilities' cooldowns"). The passive fold collects them into
// `passiveMods.themeShapes`; this file makes each sentence do what it says, at
// the seams the scene already has:
//
//   _themeOnHit(m, dmg)        every blow the player lands (_damageMonster, after the role)
//   _themeOnEvent(kind, ctx)   crit / kill / inflictCondition / moveDistance (_onTriggerEvent)
//   _themeOnHurt()             the player took damage
//   _themeOnDodge()            the player dodged
//   _themeOnCast(a)            an ability was used (_rolePay)
//
// Rewards go through machinery that already exists: `buffs.speed`, the
// cooldown map, `_grantStatBuff` (cooldownRate, lifedrain), `_applyArmorBuff`,
// `buffs.guaranteedCrit`, `_healPlayer`. The one new piece of state is a timed
// damage multiplier, read back in `_themeOnHit`.
// ============================================================================
import { conditionDef } from '../data/debuffs.js';

const shapesOf = (scene) => ((scene.player && scene.player.passiveMods && scene.player.passiveMods.themeShapes) || []);

export const ThemePassiveMixin = {
  /** How strongly this passive pays now: its rank/level scale, doubled below half health with that rung. */
  _themeK(t) {
    const p = this.player;
    let k = (t.ability && t.ability._scale) || 1;
    if (t.ability && t.ability.doublesWhenHurt && p.hp < p.maxHp * 0.5) k *= 2;
    return Math.min(k, 3);
  },

  _themeState(key) {
    this._themeSt = this._themeSt || {};
    return this._themeSt[key] || (this._themeSt[key] = { readyAt: 0, count: 0 });
  },

  _themeNow() { return this.time ? this.time.now : 0; },

  /** Does the condition on a shape hold for this target? */
  _themeCond(sh, m) {
    if (!sh.cond) return true;
    if (!m) return false;
    if (sh.cond === 'lowHp') return m.hp < (m.maxHp || 1) * 0.5;
    if (sh.cond === 'fullHp') return m.hp >= (m.maxHp || 1);
    if (sh.cond === 'afflicted') {
      if (this._monAfflictions) return this._monAfflictions(m).length > 0;
      if (m.dot && m.dot.ticksLeft !== 0) return true;
      return Object.keys(m.debuffs || {}).some(k => { const d = conditionDef(k); return !!(d && d.kind === 'affliction'); });
    }
    return false;
  },

  /** Pay a shape's reward. Returns true when it paid (so an internal cooldown starts). */
  _themePay(t, sh) {
    const p = this.player;
    const k = this._themeK(t);
    const amt = (sh.amt || 0) * k;
    switch (sh.eff) {
      case 'speed': {
        const cur = p.buffs && p.buffs.speed;
        p.buffs = p.buffs || {};
        p.buffs.speed = { mult: Math.max(1 + Math.min(amt, 0.6), cur ? cur.mult : 1), t: Math.max(sh.dur || 3, cur ? cur.t : 0) };
        return true;
      }
      case 'cdCut': {
        const cds = p.abilityCdByKey || {};
        let any = false;
        for (const key of Object.keys(cds)) if (cds[key] > 0) { cds[key] = Math.max(0, cds[key] - amt); any = true; }
        return any;
      }
      case 'cdRate': if (this._grantStatBuff) this._grantStatBuff('cooldownRate', Math.min(amt, 0.5), sh.dur || 4); return true;
      case 'lifedrain': if (this._grantStatBuff) this._grantStatBuff('lifedrain', Math.min(amt, 0.5), sh.dur || 4); return true;
      case 'armor': if (this._applyArmorBuff) this._applyArmorBuff(Math.min(amt, 0.5), sh.dur || 4); return true;
      case 'dmgFor': {
        const now = this._themeNow();
        const cur = this._themeDmg;
        const live = cur && cur.until > now;
        this._themeDmg = { mult: Math.max(1 + amt, live ? cur.mult : 1), until: Math.max(now + (sh.dur || 3) * 1000, live ? cur.until : 0) };
        return true;
      }
      case 'nextCrit': p.buffs = p.buffs || {}; p.buffs.guaranteedCrit = { bonus: 1, strikes: 1 }; return true;
      case 'heal': {
        const n = Math.max(1, Math.round((p.maxHp || 1) * Math.min(amt, 0.2)));
        if (this._healPlayer) this._healPlayer(n); else p.hp = Math.min(p.maxHp, p.hp + n);
        return true;
      }
      default: return false;
    }
  },

  /** Fire every shape listening for `on`, honouring its condition, its every-Nth count and its internal cooldown. */
  _themeFire(on, m) {
    const now = this._themeNow();
    for (const t of shapesOf(this)) {
      const sh = t.ability && t.ability.themeShape;
      if (!sh || sh.on !== on || sh.eff === 'dmgNow') continue;
      if (!this._themeCond(sh, m)) continue;
      const st = this._themeState(t.key);
      if (now < st.readyAt) continue;
      if (sh.every > 1) { st.count = (st.count || 0) + 1; if (st.count < sh.every) continue; st.count = 0; }
      if (this._themePay(t, sh) && sh.icd > 0) st.readyAt = now + sh.icd * 1000;
    }
  },

  /** A blow the player landed. Returns the (maybe raised) damage. */
  _themeOnHit(m, dmg) {
    if (!(dmg > 0) || !m) return dmg;
    const list = shapesOf(this);
    if (!list.length && !this._themeDmg) return dmg;
    let mult = 1;
    for (const t of list) {
      const sh = t.ability && t.ability.themeShape;
      if (sh && sh.on === 'hit' && sh.eff === 'dmgNow' && this._themeCond(sh, m)) mult *= 1 + (sh.amt || 0) * this._themeK(t);
    }
    const tb = this._themeDmg;
    if (tb && tb.until > this._themeNow()) mult *= tb.mult;
    this._themeFire('hit', m);
    return mult === 1 ? dmg : Math.round(dmg * mult);
  },

  /** The scene's trigger events: crit, kill, an affliction inflicted, distance travelled. */
  _themeOnEvent(kind, ctx = {}) {
    const on = kind === 'inflictCondition' ? 'afflict' : kind === 'moveDistance' ? 'move' : kind;
    if (on === 'afflict') {
      const d = ctx.key ? conditionDef(ctx.key) : null;
      if (d && d.kind !== 'affliction') return;
    }
    if (on === 'crit' || on === 'kill' || on === 'afflict' || on === 'move') this._themeFire(on, ctx.victim || null);
  },

  _themeOnHurt() { this._themeFire('hurt', null); },
  _themeOnDodge() { this._themeFire('dodge', null); },
  _themeOnCast(a) { if (a && a.kind !== 'passive') this._themeFire('cast', null); },
};
