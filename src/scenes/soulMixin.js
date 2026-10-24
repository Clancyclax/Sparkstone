// ===========================================================================
// ROUND 359 (item 6.1, 3.5) -- THE SOUL BAR. See src/data/soulResource.js for the rules.
//
// `player.soul` is the current value (missing = full); `player.soulEvents` counts the soul events. The bar is
// `#barSoul`, under stamina. A scene may hold the bar (`_soulHold = frac`): the god's aura in the Seam drains it from
// full to one point over the beats of the finale (olbFinaleMixin.js), and nothing else moves it while it is held.
// ===========================================================================

import {
  maxSoulOf, soulStep, softenedBySoul, weakenedBySpentSoul, SOUL_EVENT_COOLDOWN_S, SOUL_PRESS_COST,
} from '../data/soulResource.js';

export const SoulMixin = {
  _soulMax() { return maxSoulOf(this.player); },

  _soulNow() {
    const p = this.player;
    if (!p) return 0;
    const max = this._soulMax();
    if (!Number.isFinite(p.soul)) p.soul = max;
    if (p.soul > max) p.soul = max;
    return p.soul;
  },

  /** Every frame. */
  _soulTick(dt) {
    const p = this.player;
    if (!p) return;
    const max = this._soulMax();
    if (this._soulHold != null) {
      p.soul = Math.max(1, Math.round(max * this._soulHold * 10) / 10);
    } else {
      const pressed = !!this._playerAuraSuppRaw;
      const pressing = !!(this._auraSuppressed && this._auraSuppressed.length);
      const before = this._soulNow();
      p.soul = soulStep(before, max, dt, pressed, pressing);
      // a soul held until it ran dry is a soul EVENT: it comes back a little larger
      if (before > 0 && p.soul <= 0) this._soulEvent('held until it ran dry');
    }
    this._soulHud();
  },

  /** The aura contest asks: soften the press on the player, or weaken the player's press, by what the soul has left. */
  _soulOnContest(c) {
    const soul = this._soulNow();
    this._playerAuraSuppRaw = this._playerAuraSupp;
    if (this._playerAuraSupp) this._playerAuraSupp = softenedBySoul(this._playerAuraSupp, soul);
    // ROUND 362 -- a mind that resists control (a nature's mindResist) feels a stronger soul's press less
    const mc = this._natureMindCut ? this._natureMindCut() : 0;
    if (mc > 0 && this._playerAuraSupp) {
      const o = {};
      for (const [k, v] of Object.entries(this._playerAuraSupp)) o[k] = typeof v === 'number' ? v * (1 - mc) : v;
      this._playerAuraSupp = o;
    }
    if (c && c.winner === 'team' && !(soul > 0)) {
      for (const m of (this._auraSuppressed || [])) if (m && m._auraSupp) m._auraSupp = weakenedBySpentSoul(m._auraSupp, soul);
    }
  },

  /** A soul event: the soul grows. `force` skips the cooldown (a scar, the god). */
  _soulEvent(why, force = false, n = 1) {
    const p = this.player;
    if (!p) return;
    const now = this._clockT || (this.time ? this.time.now / 1000 : 0);
    if (!force && p.soulEventAt != null && now - p.soulEventAt < SOUL_EVENT_COOLDOWN_S) return;
    p.soulEventAt = now;
    p.soulEvents = ((p.soulEvents | 0) + n);
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 64, 'Your soul grows stronger', '#f5f5f5');
  },

  /** Spend soul on a deliberate act (a soul attack in conversation). False if there is not enough. */
  _soulSpend(amount = SOUL_PRESS_COST) {
    const v = this._soulNow();
    if (v < amount) return false;
    this.player.soul = v - amount;
    return true;
  },

  _soulHud() {
    if (typeof document === 'undefined') return;
    const el = this._soulBarEl || (this._soulBarEl = document.getElementById('barSoul'));
    if (!el) return;
    const max = this._soulMax(), v = this._soulNow();
    const w = `${Math.max(0, Math.min(100, 100 * v / max))}%`;
    const fill = el.querySelector('.bar-fill');
    if (fill && fill.style.width !== w) fill.style.width = w;
    const t = `${Math.round(v)} / ${Math.round(max)}`;
    const txt = el.querySelector('.bar-text');
    if (txt && txt.textContent !== t) txt.textContent = t;
    el.classList.toggle('soul-held', this._soulHold != null);
  },
};
