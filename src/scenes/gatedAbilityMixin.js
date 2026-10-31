// ============================================================================
// ROUND 390 -- CONDITIONAL MOVES LIGHT UP WHEN THEY CAN BE USED.
//
//   "Conditional moves like this which can only be used if certain conditions
//    are met should light up with a glow when the condition is met to let the
//    player know it can be used. It should be greyed out when it can't be used
//    and not trigger an animation."
//
// His example was Wendigo Shot: "Can only be used on an enemy at or below 20%
// health." A gated ability is one whose card names a condition on the world at
// the moment of the press -- not a price, not a clock. The kinds the game has:
//
//   execute      `requiresTargetBelow` -- an enemy at or below N% health
//                (attackRoles.js 'execute' role; awakening.js executeLadder)
//   afflicted    `consumeAffliction` / `consumeAfflictionsPer` -- an enemy
//                carrying one of your afflictions (attackRoles.js)
//   corpse       a corpse template -- a body in reach (corpseAbilities.js)
//   canon        the canon cards that state one: [Feast of Blood] (a bleeding
//                target), [Blood Harvest] (a body with blood), [Unstoppable
//                Force] (a heavy weapon), [Hero's Moment] / [Blessing of
//                Readiness] / [Bolster] (an ally, never yourself), [Mirror
//                Magic] (an ally's spell to mirror)
//
// `requiresWeapon` (round 112) is a condition too, and the bar has greyed it
// with a lock since then; it keeps that look and is not repeated here.
//
// ONE QUESTION, TWO READERS. `_abilityGateCheck(a, key)` is the cast's own gate
// (_castKnownAbilityCoreRaw asks it before the swing, the price and the
// cooldown) and `_abilityUsableNow(key)` asks the same function for the bar, so
// the glow and the press cannot disagree. Neither one speaks or spends; the
// cast's refusal is `_gateRefuse`, which is a shake and a rate-limited word.
//
// THE TARGET IS THE ONE THE CAST WILL HIT. An execute names whom it checked: the
// selected enemy when one is selected and in reach (every chokepoint in the cast
// -- the bolt's homing, the cone, the nearest -- answers with the selection
// first), otherwise the nearest weak enemy in reach, which the cast then selects
// (`_gateAcquire`) so the bolt homes on the very body the gate measured.
// ============================================================================
import { isCorpseTemplate, CORPSE_REACH } from '../data/corpseAbilities.js';
import { CANON_RT } from '../data/canonRuntime.js';

/** How often the bar re-asks its gated slots (ms). Five times a second. */
export const GATE_PAINT_MS = 200;
/** How often one ability may say why it refused (ms). */
export const GATE_SAY_MS = 1200;
/** How long the refusal shake runs (ms). */
export const GATE_SHAKE_MS = 320;
/** Canon cards whose own text names a condition of the moment. */
export const GATE_CANON_KEYS = new Set([
  'feastOfBlood', 'bloodHarvest', 'unstoppableForce',
  'herosMoment', 'blessingOfReadiness', 'bolster', 'mirrorMagic',
]);

/** The gate kinds an ability carries -- static, from its fields. Empty: ungated. */
export function abilityGateKinds(a) {
  if (!a || a.kind !== 'active') return [];
  const out = [];
  if (a.requiresTargetBelow > 0) out.push('execute');
  if (a.consumeAffliction || a.consumeAfflictionsPer > 0) out.push('afflicted');
  if (isCorpseTemplate(a.template)) out.push('corpse');
  if (a.canonKey && GATE_CANON_KEYS.has(a.canonKey)) out.push('canon');
  return out;
}

const GATE_CSS = `
.hotbar-slot.gate-ready { border-color: var(--gate-col, #ffd54f); animation: gate390pulse 1.1s ease-in-out infinite; }
@keyframes gate390pulse {
  0%, 100% { box-shadow: 0 0 3px 1px var(--gate-col, #ffd54f); }
  50% { box-shadow: 0 0 11px 3px var(--gate-col, #ffd54f); }
}
.hotbar-slot.gate-unmet { filter: grayscale(1) brightness(0.62); opacity: 0.55; }
.hotbar-slot.gate-shake { animation: gate390shake 0.32s linear 1; }
@keyframes gate390shake {
  0%, 100% { transform: translateX(0); } 20% { transform: translateX(-3px); }
  50% { transform: translateX(3px); } 80% { transform: translateX(-2px); }
}`;

const NO = (kind, why) => ({ gated: true, ok: false, kind, why, target: null });

export const GatedAbilityMixin = {
  // --------------------------------------------------------------------------
  // THE QUESTION
  // --------------------------------------------------------------------------
  /** Is this ability, as `a` stands for this press, usable right now?
   *  { gated, ok, kind, why, target }. Silent: no float, no spend, no select. */
  _abilityGateCheck(a, key) {
    const kinds = abilityGateKinds(a);
    if (!kinds.length) return { gated: false, ok: true, kind: null, why: '', target: null };
    let target = null;
    for (const kind of kinds) {
      if (kind === 'execute') {
        const r = this._executeGateTarget(a);
        if (!r.target) return NO(kind, r.why);
        target = target || r.target;
      } else if (kind === 'afflicted') {
        // The role's own finder -- `_rolePrecheck` and `_rolePay` ask it too.
        const m = this._afflictedInReach ? this._afflictedInReach(a) : null;
        if (!m) return NO(kind, 'no afflicted enemy in reach');
        target = target || m;
      } else if (kind === 'corpse') {
        if (!this._corpseAbilityHasBody(a)) return NO(kind, 'no body in reach');
      } else if (kind === 'canon') {
        const why = this._canonGateWhy(a, key);
        if (why) return NO(kind, why);
      }
    }
    return { gated: true, ok: true, kind: kinds[0], why: '', target };
  },

  /** The bar's reader: the ability as the cast would hold it, then the gate. */
  _abilityUsableNow(key) {
    const e = this.player && this.player.knownAbilities && this.player.knownAbilities[key];
    if (!e || !e.ability || !abilityGateKinds(e.ability).length) {
      return { gated: false, ok: true, kind: null, why: '', target: null };
    }
    let a = (this._scaledAbility && this._scaledAbility(key)) || e.ability;
    if (this._reachScaled) a = this._reachScaled(a);
    return this._abilityGateCheck(a, key);
  },

  /** The execute's target: the selection if it is in reach (weak or not --
   *  that is who the cast would hit), else the nearest weak enemy in reach. */
  _executeGateTarget(a) {
    const reach = this._abilityReach ? this._abilityReach(a)
      : (a.range || a.radius || 220) * (this._reachMult ? this._reachMult() : 1);
    const x = this.world.x, y = this.world.y;
    const weak = (m) => (m.hp / Math.max(1, m.maxHp))
      <= (this._executeThreshold ? this._executeThreshold(m, a.requiresTargetBelow) : a.requiresTargetBelow);
    const near = (m) => Math.hypot((m.wx ?? m.x) - x, (m.wy ?? m.y) - y) <= reach;
    const sel = this._currentTarget ? this._currentTarget('enemy') : null;
    if (sel && sel.alive && near(sel)) {
      return weak(sel) ? { target: sel, why: '' } : { target: null, why: 'the target is not weak enough' };
    }
    let best = null, bd = Infinity;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || !weak(m)) continue;
      const d = Math.hypot(m.wx - x, m.wy - y);
      if (d <= reach && d < bd) { bd = d; best = m; }
    }
    return best ? { target: best, why: '' } : { target: null, why: 'nothing weak enough in reach' };
  },

  /** A corpse ability's body, asked without a word (corpseMixin's
   *  `_corpseAbilityReady` is this plus the float). */
  _corpseAbilityHasBody(a) {
    if (!isCorpseTemplate(a.template)) return true;
    const reach = (a.range || CORPSE_REACH) * (this._reachMult ? this._reachMult() : 1);
    return !!(this._corpsesNear && this._corpsesNear(this.world.x, this.world.y, reach).length);
  },

  /** The canon conditions, read with the same helpers `_canonPrecheck` uses. */
  _canonGateWhy(a, key) {
    const ck = a.canonKey;
    if (!this._canonPrecheck) return '';
    const rank = this._canonRankOf ? this._canonRankOf(key) : 'iron';
    const rt = CANON_RT[ck] || {};
    switch (ck) {
      case 'feastOfBlood': {
        const mode = this._canonModeOf ? this._canonModeOf(ck, rank) : null;
        if (mode && mode.id === 'wide') {
          const any = (this.monsters || []).some(m => m && m.alive && this._canonBleeding(m)
            && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) <= rt.wide);
          return any ? '' : 'nothing bleeding';
        }
        const t = this._canonTarget(rt.range);
        if (!t) return 'no target';
        return this._canonBleeding(t) ? '' : 'it is not bleeding';
      }
      case 'bloodHarvest':
        return this._canonHarvestBodies(rank).length ? '' : 'no body with blood in reach';
      case 'unstoppableForce':
        return this._canonHeavyInHand() ? '' : 'needs a heavy weapon';
      case 'herosMoment':
        return this._canonAlly(rt.range) ? '' : 'no ally in reach';
      case 'blessingOfReadiness': case 'bolster': {
        const al = this._canonAlly(rt.range);
        return al && al.kind === 'party' ? '' : 'no ally in reach';
      }
      case 'mirrorMagic': {
        const m = this._mirrorable;
        const now = this._clockT || 0;
        return (!m || now - m.at > rt.window || m.used) ? 'no spell to mirror' : '';
      }
      default: return '';
    }
  },

  // --------------------------------------------------------------------------
  // THE PRESS
  // --------------------------------------------------------------------------
  /** Point the cast at what the gate measured. Never over a selection in reach
   *  (the gate already used it); over one out of reach, the finisher takes the
   *  body it can finish rather than flying at the one it cannot. */
  _gateAcquire(t) {
    if (!t) return;
    this._targets = this._targets || { enemy: null, ally: null };
    const sel = this._currentTarget ? this._currentTarget('enemy') : this._targets.enemy;
    if (sel === t) return;
    this._targets.enemy = t;
    this._targetActedT = this._clockT || 0;
  },

  /** "Not now": the slot shakes, and the reason is said once in a while. No
   *  swing, no cost, no cooldown, no cast sound -- the cast has returned. */
  _gateRefuse(key, a, gate) {
    this._gateRefusals = (this._gateRefusals || 0) + 1;
    this._gateShake(key);
    const now = (this.time && this.time.now) || Date.now();
    const said = (this._gateSaidAt = this._gateSaidAt || {});
    if (said[key] != null && now - said[key] < GATE_SAY_MS) return;
    said[key] = now;
    if (this._floatText) this._floatText(this.world.x, this.world.y - 40, `${a.name} — ${gate.why}`, '#90a4ae');
  },

  _gateShake(key) {
    if (typeof document === 'undefined') return;
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    for (const el of bar.children) {
      if (!el.dataset || el.dataset.gateKey !== key) continue;
      el.classList.remove('gate-shake');
      void el.offsetWidth;   // restart the animation on a quick second press
      el.classList.add('gate-shake');
      setTimeout(() => el.classList.remove('gate-shake'), GATE_SHAKE_MS);
    }
  },

  // --------------------------------------------------------------------------
  // THE BAR
  // --------------------------------------------------------------------------
  _gateCss() {
    if (this._gateCssDone || typeof document === 'undefined' || !document.head) return;
    this._gateCssDone = true;
    if (document.getElementById('gate390-css')) return;
    const st = document.createElement('style');
    st.id = 'gate390-css';
    st.textContent = GATE_CSS;
    document.head.appendChild(st);
  },

  /** Called by `_updateHotbarDom` each frame; does its work five times a
   *  second, or at once when the bar was rebuilt. `keys` is in cell order. */
  _gatedHotbarPaint(keysFn) {
    if (typeof document === 'undefined') return;
    const bar = document.getElementById('hotbar');
    if (!bar) return;
    const now = (this.time && this.time.now) || 0;
    const rebuilt = bar.firstElementChild !== this._gatePaintFirst || bar.childElementCount !== this._gatePaintN;
    if (!rebuilt && this._gatePaintAt != null && now - this._gatePaintAt < GATE_PAINT_MS) return;
    this._gatePaintAt = now;
    this._gatePaintFirst = bar.firstElementChild;
    this._gatePaintN = bar.childElementCount;
    this._gateCss();
    const keys = typeof keysFn === 'function' ? keysFn() : (keysFn || []);
    const cells = bar.children;
    for (let n = 0; n < cells.length; n++) this._gatePaintSlot(cells[n], keys[n] || null);
  },

  /** One cell: `gate-ready` (a pulsing glow in the ability's colour) when its
   *  condition holds and nothing else stops it, `gate-unmet` (greyed) when the
   *  condition fails, neither for an ungated ability. */
  _gatePaintSlot(el, key) {
    if (!el) return;
    const known = (this.player && this.player.knownAbilities) || {};
    const a = key && known[key] && known[key].ability;
    const gated = !!a && abilityGateKinds(a).length > 0;
    if (el.dataset) { if (key) el.dataset.gateKey = key; else delete el.dataset.gateKey; }
    if (!gated) {
      el.classList.remove('gate-ready');
      el.classList.remove('gate-unmet');
      return;
    }
    const g = this._abilityUsableNow(key);
    const cooling = ((this.player.abilityCdByKey || {})[key] || 0) > 0;
    const armed = !a.requiresWeapon || !this._wielding || this._wielding(a.requiresWeapon);
    el.classList.toggle('gate-ready', g.ok && !cooling && armed);
    el.classList.toggle('gate-unmet', !g.ok);
    if (el.style && el.style.setProperty) el.style.setProperty('--gate-col', a.color || '#ffd54f');
  },
};
