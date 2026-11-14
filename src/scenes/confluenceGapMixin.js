// ===========================================================================
// ROUND 392 -- THREE SHARED GAPS FROM THE CONFLUENCE SHEETS, AT RUNTIME.
//
// docs/CONFLUENCE_IDENTITY.md's gap list, filed by all twenty sheets:
//
//   beam-template        "shoot beams of lava": a line from the caster that holds for a moment and hits everything
//                        along it, every tick. The art was already in the game (fx5 beamthin / beammid / beamcone, fx3
//                        flamethrower / drainbeam; sheetFxMixin `_sheetBeam` stretches one between two live points).
//                        _castBeam (the player), _guardBeam (a companion), _beamLineHits (the line test).
//   dual-type-hit        "one hit dealing two damage types (fire + earth)": while a split ability's hit lands
//                        (`_hitSplit`), WorldScene `_damageMonster` answers each share with its own resistance and
//                        conditions (_splitFor / _splitMult) and floats both parts in their colours (_splitHitFloat).
//   cond-payoff-passive  payoffs on a sheet's OWN conditions (condPayoff.js): on a hit (_condPayoffOnHit), a kill or a
//                        condition reaching its full stacks (_condPayoffEvent), or while carriers stand near you
//                        (_condPayoffTick). Read from passiveMods.condPayoffs, folded in `_recomputePassives`.
//
// Every entry point answers quietly when the scene lacks what it reads, so a stub scene in a test can drive each one.
// ===========================================================================
import { conditionDef } from '../data/debuffs.js';
import { rollCrit, CRIT_COLOR } from '../data/combat.js';
import { DAMAGE_FX_COLORS, damageFxFor } from '../data/damageFx.js';
import { fxFamilyInfo } from '../data/spellFx.js';
import { typeWord } from '../data/damageTypeText.js';

/** The sheets a beam may be drawn with (the art lies along +x from bx0 to bx1). */
export const BEAM_FAMILIES = new Set(['beamthin', 'beammid', 'beamcone', 'flamethrower', 'drainbeam']);
export const BEAM_DEFAULT_FAMILY = 'beammid';
const hexOf = (n) => `#${(n >>> 0).toString(16).padStart(6, '0')}`;

export const ConfluenceGapMixin = {
  // ------------------------------------------------------------------------------------------------ the beam --
  /** Which beam sheet a beam is drawn with: its authored cast art when that is a beam, else the mid beam. */
  _beamFamily(a) {
    if (a && BEAM_FAMILIES.has(a.fxHint)) return a.fxHint;
    if (a && BEAM_FAMILIES.has(a.beamFx)) return a.beamFx;
    return BEAM_DEFAULT_FAMILY;
  },

  /** Everything alive on the line from (x, y) along `ang`, `len` long and `width` across (a body's radius counts). */
  _beamLineHits(x, y, ang, len, width) {
    const out = [];
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive) continue;
      const r = (m.type && m.type.radius) || 12;
      const rx = m.wx - x, ry = m.wy - y;
      const along = rx * dx + ry * dy;
      if (along < -r || along > len + r) continue;
      if (Math.abs(rx * dy - ry * dx) > width / 2 + r) continue;
      out.push(m);
    }
    return out;
  },

  /**
   * The player's beam: `beamTicks` hits `beamTickMs` apart, each on everything along the line from where you stand
   * along where you aim (re-read every tick, so the beam follows a turn). The first tick lands at once. The mark it
   * lays (its condition, its dot) is laid once per body per cast; crits roll per tick. Returns the cast's state.
   */
  _castBeam(a) {
    if (!a || !this.player || !this.world) return null;
    const mods = this.player.passiveMods || {};
    const crit = this._playerCritStats ? this._playerCritStats(a) : { chance: 0, mult: 1.5 };
    const bonus = this._consumeNextSpellBonus ? this._consumeNextSpellBonus() : 1;
    const st = {
      a, el: this._specElement ? this._specElement(a) : (a.damageType || a.element || null),
      len: (a.range || 260) * (this._reachMult ? this._reachMult() : 1),
      width: a.beamWidth || 28, ticks: Math.max(1, a.beamTicks || 3), every: Math.max(60, a.beamTickMs || 250),
      chance: crit.chance, mult: crit.mult,
      dmgBase: Math.max(1, Math.round((a.base || 4) * (mods.dmgMult || 1) * bonus)),
      ctx: this._rungHitCtx || null, castA: this._rungCastA || null,
      n: 0, hits: 0, touched: new Set(), done: false,
    };
    this._beamCasts = (this._beamCasts || 0) + 1;
    this._beamTick(st);
    for (let i = 1; i < st.ticks; i++) {
      if (this.time && this.time.delayedCall) this.time.delayedCall(i * st.every, () => this._beamTick(st));
    }
    this._beamDraw(st);
    if (this._floatText) this._floatText(this.world.x, this.world.y - 40, a.name, a.color || '#ffcc80');
    return st;
  },

  /** One tick of a held beam. */
  _beamTick(st) {
    if (!st || st.done || st.n >= st.ticks) return 0;
    st.n++;
    if (!this.player || !(this.player.hp > 0)) { st.done = true; return 0; }
    const a = st.a;
    const ang = this.player.aimAngle || 0;
    const targets = this._beamLineHits(this.world.x, this.world.y, ang, st.len, st.width);
    const was = { ctx: this._rungHitCtx, castA: this._rungCastA, split: this._hitSplit };
    if (st.ctx) this._rungHitCtx = st.ctx;
    if (st.castA) this._rungCastA = st.castA;
    this._hitSplit = a.damageSplit || null;
    let n = 0;
    try {
      for (const m of targets) {
        if (!m.alive) continue;
        const chance = this._critChanceVs ? this._critChanceVs(m, st.chance, a) : st.chance;
        const { dmg, isCrit } = rollCrit(Math.random, chance, st.dmgBase, st.mult);
        this._damageMonster(m, dmg, true, false, st.el);
        if (!st.touched.has(m)) {
          st.touched.add(m);
          if (this._applyAbilityDebuff) this._applyAbilityDebuff(a, m);
          if (a.dot && this._applyDot) this._applyDot(m, a.dot);
        }
        if (isCrit && this._floatText) { this._floatText(m.wx, m.wy - 30, 'Crit!', CRIT_COLOR); if (this._lessonEvent) this._lessonEvent('crit'); }
        n++;
      }
    } finally {
      this._rungHitCtx = was.ctx; this._rungCastA = was.castA; this._hitSplit = was.split || null;
    }
    st.hits += n;
    this._beamHits = (this._beamHits || 0) + n;
    if (st.n >= st.ticks) st.done = true;
    return n;
  },

  /** The beam on screen: its sheet stretched from you to the end of the line, for the whole hold, in the damage
   *  type's own cut (fetched lazily, the art as drawn standing in meanwhile). Rings along the line when no sheet is
   *  loaded, so a cast is never invisible. Returns the family drawn, or 'rings'. */
  _beamDraw(st) {
    const a = st.a;
    let fam = this._beamFamily(a);
    let info = fxFamilyInfo(fam);
    let colour = info && info.fx5 ? damageFxFor(a) : (a.color || '#ffffff');
    // ROUND 393 -- a beam whose gap names its own sheet (the gorgon's stare: beamthin in grey), fxArt393Mixin.js
    const ov393 = this._fx393BeamOverride ? this._fx393BeamOverride(a) : null;
    if (ov393 && fxFamilyInfo(ov393.family)) { fam = ov393.family; info = fxFamilyInfo(fam); colour = ov393.color; }
    const ms = st.ticks * st.every + 160;
    const thick = Math.max(0.3, Math.min(1.4, st.width / 40));
    const from = () => (this.world ? { x: this.world.x, y: this.world.y } : null);
    const to = () => {
      if (!this.world || !this.player) return null;
      const ang = this.player.aimAngle || 0;
      return { x: this.world.x + Math.cos(ang) * st.len, y: this.world.y + Math.sin(ang) * st.len };
    };
    // ROUND 394 -- "replace the stretched 222 px beam sheet with the 3-part system": the beam's material (start, mids,
    // end; the flare and a splash a tick), beamWall394Mixin.js. The stretched sheet stands in only while it loads.
    // ROUND 394 -- a beam that IS a line drawn in code (a thread, a cord, a wire, the follow spot: fxMap394.js `override:
    // { drawn: 'line' }`) draws no sheet at all; its line is the gap's own layer, laid by _fx393BeamExtra below.
    const line394 = !!(ov393 && ov393.drawn && this._fxm394Owns);
    const drew394 = !line394 && this._beam394Draw ? this._beam394Draw(a, from, to, { ms, width: st.width, ticks: st.ticks, every: st.every, len: st.len }) : false;
    const spr = drew394 || line394 ? null : (this._sheetBeam ? this._sheetBeam(fam, colour, from, to, { ms, thick, add: true, alpha: 0.95 }) : null);
    st.drawn = line394 ? 'line' : drew394 ? 'r394' : spr ? fam : 'rings';
    if (this._fx393BeamExtra) st.extra393 = this._fx393BeamExtra(st, ms);   // ROUND 393 -- the gap's own art laid on the beam
    if (!spr && !drew394 && !line394 && this._spawnRingFx) {
      const ang = this.player.aimAngle || 0;
      for (let i = 1; i <= 3; i++) {
        const d = (st.len / 3) * i;
        this._spawnRingFx(this.world.x + Math.cos(ang) * d, this.world.y + Math.sin(ang) * d, Math.max(16, st.width), a.color);
      }
    }
    return st.drawn;
  },

  /** A companion's or a guard's beam: once, along the line from them through their target, the whole hold's worth
   *  on each body it crosses (they have no aim to hold). `dmgOf(base, scale)` is `_guardCastAbility`'s pricing. */
  _guardBeam(g, a, t, dmgOf) {
    if (!g || !a || !t) return 0;
    const ang = Math.atan2(t.wy - g.y, t.wx - g.x);
    const len = a.range || 260;
    const hits = this._beamLineHits(g.x, g.y, ang, len, a.beamWidth || 28);
    const el = this._specElement ? this._specElement(a) : null;
    for (const m of hits) {
      this._damageMonster(m, dmgOf(a.base, a.beamTicks || 1), false, false, el);
      if (a.dot && this._applyDot) this._applyDot(m, a.dot, false);
    }
    const fam = this._beamFamily(a);
    const info = fxFamilyInfo(fam);
    // ROUND 394 -- the companion's beam is the same three-part material as the player's
    const ms394 = (a.beamTicks || 3) * (a.beamTickMs || 250);
    const drew394 = this._beam394Draw ? this._beam394Draw(a, { x: g.x, y: g.y }, { x: g.x + Math.cos(ang) * len, y: g.y + Math.sin(ang) * len },
      { ms: ms394, width: a.beamWidth || 28, ticks: a.beamTicks || 3, every: a.beamTickMs || 250, len }) : false;
    if (!drew394 && this._sheetBeam) {
      this._sheetBeam(fam, info && info.fx5 ? damageFxFor(a) : (a.color || '#ffffff'), { x: g.x, y: g.y },
        { x: g.x + Math.cos(ang) * len, y: g.y + Math.sin(ang) * len },
        { ms: (a.beamTicks || 3) * (a.beamTickMs || 250), thick: Math.max(0.3, Math.min(1.4, (a.beamWidth || 28) / 40)), add: true });
    }
    this._guardBeams = (this._guardBeams || 0) + 1;
    return hits.length;
  },

  // ------------------------------------------------------------------------------------- one hit, two types --
  /** The live split for a blow of element `el`: the casting ability's (or the bolt's) two shares, when `el` is its
   *  first type. A blow of any other type (a proc, an aura bite) is not split. */
  _splitFor(el) {
    const s = this._hitSplit;
    return (s && s.length === 2 && s[0] && s[0].type === el) ? s : null;
  },
  /** Sum over the shares of share x fn(type); `record` keeps each part for the float. */
  _splitMult(split, fn, record = false) {
    let total = 0;
    const parts = [];
    for (const p of split) {
      const w = (p.share || 0) * fn(p.type);
      total += w;
      parts.push({ type: p.type, w });
    }
    if (record) this._splitParts = parts;
    return total;
  },
  /** Each type's part of the dealt figure over the struck body, in that type's colour ("6 fire", "6 earth"). Said at
   *  most every 200ms per body, since a beam ticks. Returns the parts said, or null. */
  _splitHitFloat(m, dealt) {
    const parts = this._splitParts;
    if (!m || !parts || !parts.length) return null;
    const now = (this.time && this.time.now) || 0;
    if (m._splitFloatAt != null && now - m._splitFloatAt < 200) return null;
    m._splitFloatAt = now;
    const sum = parts.reduce((s, p) => s + p.w, 0) || 1;
    const said = parts.map(p => ({ type: p.type, n: Math.max(0, Math.round((dealt * p.w) / sum)) }));
    // ROUND 394 -- the two-tone spark: both types' r392 spark sheets on the body together, one mirrored (fxOneoff394Mixin)
    if (this._fx394TwoTone) { try { this._fx394TwoTone(m, said); } catch (e) { /* art is optional */ } }
    if (this._floatText) {
      said.forEach((p, i) => {
        const c = DAMAGE_FX_COLORS[p.type];
        this._floatText(m.wx - 14 + i * 28, m.wy - 40 - i * 8, `${p.n} ${typeWord(p.type)}`, c != null ? hexOf(c) : '#ffffff');
      });
    }
    this._splitFloats = (this._splitFloats || 0) + 1;
    return said;
  },

  // ------------------------------------------------------------------------------- condition payoffs (sheet) --
  _condPayoffs() {
    const mods = this.player && this.player.passiveMods;
    return (mods && mods.condPayoffs) || [];
  },
  /** Stacks of a (sheet) condition on a body. */
  _payStacks(m, key) {
    const d = m && m.debuffs && m.debuffs[key];
    return d ? Math.max(1, d.stacks || 1) : 0;
  },
  /** Living enemies carrying `key` within `radius` of (x, y). */
  _payCarriersNear(key, x, y, radius) {
    let n = 0;
    for (const o of (this.monsters || [])) {
      if (!o || !o.alive || Math.hypot(o.wx - x, o.wy - y) > radius) continue;
      if (this._payStacks(o, key) > 0) n++;
    }
    return n;
  },
  /** A burst a payoff deals: its own typed blow, never split, never paying payoffs again. */
  _payBurst(m, p) {
    if (!m || !m.alive || !(p.dmg > 0)) return 0;
    const was = this._hitSplit;
    this._hitSplit = null;
    this._payoffDepth = (this._payoffDepth || 0) + 1;
    let dealt = 0;
    try { dealt = this._damageMonster(m, p.dmg, true, false, p.type || null) || 0; } finally { this._payoffDepth--; this._hitSplit = was; }
    if (this._floatText) this._floatText(m.wx, m.wy - 50, `${p.name || 'Payoff'}`, '#ffab91');
    // the burst on screen: the ring sheet in the burst type's colour (stand-in for a shatter -- see the round report)
    const c = DAMAGE_FX_COLORS[p.type];
    // ROUND 394 -- the payoff ability's own r392 art (a cocoon bursting, a jar cracking), else the shatter-burst sheet in
    // the burst's type; the ring stays the fallback while those load
    let drew394 = false;
    if (this._fx394Payoff) { try { drew394 = this._fx394Payoff(m, p); } catch (e) { drew394 = false; } }
    if (!drew394 && this._ringSheet) { try { this._ringSheet(m.wx, m.wy, 48, c != null ? hexOf(c) : '#ffab91'); } catch (e) { /* art is optional */ } }
    this._payoffBursts = (this._payoffBursts || 0) + 1;
    return dealt;
  },
  _payLay(m, key, stacks = 1, opts = {}) {
    if (!m || !m.alive || !this._applyDebuff) return null;
    this._payoffDepth = (this._payoffDepth || 0) + 1;
    try { return this._applyDebuff(m, key, { fromPlayer: true, source: this.player, stacks, ...opts }); } finally { this._payoffDepth--; }
  },

  /**
   * A blow the player lands (`_damageMonster`, before mitigation): every 'hit' payoff on the target as it stands
   * before this blow, and the 'near' amp. `element` is the blow's type (a split blow counts as each of its types).
   * Returns the blow's figure.
   */
  _condPayoffOnHit(m, dmg, element) {
    const list = this._condPayoffs();
    if (!list.length || !m || m === this.player || this._payoffDepth > 0) return dmg;
    const types = new Set([element, ...((this._splitFor && this._splitFor(element)) || []).map(s => s.type)].filter(Boolean));
    let mult = 1;
    const bursts = [];
    for (const p of list) {
      if (p.on === 'near' && p.do === 'amp') {
        const n = this._payCarriersNear(p.cond, this.world.x, this.world.y, p.radius || 192);
        if (n) mult *= 1 + Math.min(p.max || 0.2, (p.per || 0.03) * n);
        continue;
      }
      if (p.on !== 'hit') continue;
      if (p.types && !p.types.some(t => types.has(t))) continue;
      const s = this._payStacks(m, p.cond);
      if (!s) continue;
      if (p.do === 'amp') mult *= 1 + Math.min(p.max || 0.2, (p.per || 0.04) * s);
      else if (p.do === 'lay') this._payLay(m, p.then, p.stacks || 1);
      else if (p.do === 'burst') { delete m.debuffs[p.cond]; bursts.push(p); }
      this._payoffsPaid = (this._payoffsPaid || 0) + 1;
    }
    for (const p of bursts) this._payBurst(m, p);
    return mult !== 1 ? Math.max(1, Math.round(dmg * mult)) : dmg;
  },

  /** A kill, or a condition laid (the trigger events): 'kill' payoffs on the dead carrier, 'full' payoffs on a
   *  condition that has just reached its full stacks. */
  _condPayoffEvent(kind, ctx = {}) {
    const list = this._condPayoffs();
    if (!list.length || this._payoffDepth > 0) return 0;
    const v = ctx.victim;
    if (!v || v === this.player) return 0;
    let paid = 0;
    if (kind === 'kill') {
      for (const p of list) {
        if (p.on !== 'kill') continue;
        const s = this._payStacks(v, p.cond);
        if (!s) continue;
        const near = (this.monsters || []).filter(o => o && o !== v && o.alive && Math.hypot(o.wx - v.wx, o.wy - v.wy) <= (p.radius || 128))
          .sort((x, y) => Math.hypot(x.wx - v.wx, x.wy - v.wy) - Math.hypot(y.wx - v.wx, y.wy - v.wy));
        // the leap on screen: a zap from the body to each body it reaches, in the condition's colour
        const zap = (o, key) => {
          const def = conditionDef(key);
          // ROUND 394 -- the leap arc (r392 "leap-arc ... stand-in thin-beam zap"), in the payoff's type
          if (this._fx394Leap) { try { if (this._fx394Leap({ x: v.wx, y: v.wy }, { x: o.wx, y: o.wy }, p.type || (def && def.element) || 'physical')) return; } catch (e) { /* art is optional */ } }
          if (!this._zapSheet) return;
          try { this._zapSheet('bolt', (def && def.color) || '#ffab91', { x: v.wx, y: v.wy }, { x: o.wx, y: o.wy }, { ms: 320 }); } catch (e) { /* art is optional */ }
        };
        if (p.do === 'spread') {
          for (const o of near.slice(0, Math.max(1, p.max || 1))) { this._payLay(o, p.cond, s); zap(o, p.cond); paid++; }
        } else if (p.do === 'lay') {
          for (const o of near) { this._payLay(o, p.then, p.stacks || 1); zap(o, p.then); paid++; }
        } else if (p.do === 'heal') {
          const amt = Math.max(1, Math.round((this.player.maxHp || 0) * (p.per || 0.03)));
          if (this._healPlayer) this._healPlayer(amt, { quiet: true });
          else this.player.hp = Math.min(this.player.maxHp || Infinity, (this.player.hp || 0) + amt);
          paid++;
        }
      }
    } else if (kind === 'inflictCondition') {
      for (const p of list) {
        if (p.on !== 'full' || p.cond !== ctx.key) continue;
        const cap = p.stackCap || ((conditionDef(p.cond) || {}).stackCap) || 1;
        if (this._payStacks(v, p.cond) < cap) continue;
        if (p.do === 'lay') {
          this._payLay(v, p.then, p.stacks || 1);
          if (this._convertFlash394) this._convertFlash394(v, p.then);   // ROUND 394 -- "convert-flash: a full-stack condition converts"
          if (p.reset && v.debuffs) delete v.debuffs[p.cond];
        } else if (p.do === 'burst') {
          if (v.debuffs) delete v.debuffs[p.cond];
          this._payBurst(v, p);
        }
        paid++;
      }
    }
    if (paid) this._payoffsPaid = (this._payoffsPaid || 0) + paid;
    return paid;
  },

  /** The 'near' heals: every `every` seconds, a share of your maximum health for each carrier near you (capped). */
  _condPayoffTick(dt) {
    const list = this._condPayoffs();
    if (!list.length || !this.player || !(this.player.hp > 0)) return 0;
    this._payNearT = this._payNearT || {};
    let healed = 0;
    for (const p of list) {
      if (p.on !== 'near' || p.do !== 'heal') continue;
      const k = `${p.key || p.name}|${p.cond}`;
      this._payNearT[k] = (this._payNearT[k] || 0) + dt;
      if (this._payNearT[k] < (p.every || 2)) continue;
      this._payNearT[k] = 0;
      const n = this._payCarriersNear(p.cond, this.world.x, this.world.y, p.radius || 192);
      if (!n) continue;
      const amt = Math.max(1, Math.round((this.player.maxHp || 0) * Math.min(p.max || 0.05, (p.per || 0.01) * n)));
      if (this._healPlayer) this._healPlayer(amt, { quiet: true });
      else this.player.hp = Math.min(this.player.maxHp || Infinity, (this.player.hp || 0) + amt);
      healed += amt;
    }
    if (healed) this._payNearHealed = (this._payNearHealed || 0) + healed;
    return healed;
  },
};

// The point a beam reaches, for anything that wants to draw or test it without the scene.
export function beamEnd(x, y, ang, len) {
  return { x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len };
}
