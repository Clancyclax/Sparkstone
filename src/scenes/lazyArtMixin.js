// ============================================================================
// ROUND 328 -- MONSTER ART THAT IS FETCHED WHEN IT IS NEEDED.
//
// Forty families arrived at once, eight shades each, in cells up to 127px:
// together 394 megapixels, which is 1.5 GB decoded if every sheet is resident.
// The forty-seven families before them were loaded at boot (about 90 MP) and
// that was affordable; this is not, so the new rows in monsterArt.js carry
// `lazy: true` and the boot loop in WorldScene skips them.
//
// THE RULES, because eviction is where this goes wrong:
//
//   * A family is fetched when something needs it: a spawn group coming into
//     range (`_prefetchLazyArt`, 1,500 units before it wakes -- about seven
//     seconds of walking), a spawn, a familiar, a summon.
//   * At most LAZY_FAMILY_CAP lazy families are resident. A ninth evicts the
//     least recently drawn one -- and ONLY one nothing is using. A live
//     monster, a body that still draws from it, a summon or a familiar protects
//     its family, and if every resident family is protected the cap is soft:
//     the new one loads anyway. An invisible monster is worse than a heavy tab.
//   * A monster spawned before its sheet arrives is not an error. It exists,
//     it fights, and it is simply not drawn (see `_updateMonsterSprite`) until
//     the sheet lands, which is a fraction of a second on a local server.
//   * Death sheets are separate and tiny, and have their own lazy path in
//     corpseMixin.js; they are never evicted.
//
// `_whenFamilyArt(family)` is a promise for the test harness and for any caller
// that would rather wait than poll.
// ============================================================================
import { MONSTER_ART } from '../data/monsterArt.js';
import { MONSTER_TYPES } from '../data/monsters.js';

/** How many lazy families stay resident. About 10 MP (40 MB) each. */
export const LAZY_FAMILY_CAP = 8;
/** The states a lazy family can have, in load order. */
const LAZY_STATES = ['idle', 'run', 'attack', 'crouch', 'fly'];   // ROUND 393 -- 'fly': the griffin's Flying loop
/** Prefetch groups this far past the wake radius (1,400). */
export const LAZY_PREFETCH_EXTRA = 1500;
/** Load attempts before a family is given up on (a 404 must not loop). */
const LAZY_MAX_TRIES = 3;

function statesOf(art) {
  return LAZY_STATES.filter((s) => {
    if (s === 'attack') return !!art.attackFrames;
    if (s === 'crouch') return !!art.crouchFrames;
    if (s === 'fly') return !!art.flyFrames;   // ROUND 393
    return true;
  });
}

export const LazyArtMixin = {
  /** family -> { status: 'loading'|'ready'|'failed', left, tries, used } */
  _lazyState() {
    if (!this._lazyArt) this._lazyArt = new Map();
    return this._lazyArt;
  },

  /** Is this family's art in the texture manager right now? Non-lazy families
   *  are always ready (the boot loop loaded them). */
  _familyArtReady(family) {
    const art = MONSTER_ART[family];
    if (!art) return false;
    if (!art.lazy) return true;
    for (const s of statesOf(art)) {
      if (!this.textures.exists(`mon_${family}_${s}`)) return false;
    }
    return true;
  },

  /** Mark a family as drawn this frame (the LRU clock). Cheap by design. */
  _touchFamilyArt(art) {
    if (art && art.lazy) art._lastUsed = this.time ? this.time.now : Date.now();
  },

  /** Is any live thing still drawing from this family's sheets? */
  _familyArtInUse(family) {
    for (const m of (this.monsters || [])) {
      if (m && m.type && m.type.family === family) return true;
    }
    for (const c of (this.corpses || [])) {
      if (c && (c.family === family || (c.fallback && String(c.fallback.key || '').startsWith(`mon_${family}_`)))) return true;
    }
    for (const s of (this._summons || [])) {
      if (s && s.family === family) return true;
    }
    for (const f of (this._familiars || [])) {
      if (f && f.family === family) return true;
    }
    return false;
  },

  /** Drop the least recently drawn idle lazy family. True if one went. */
  _evictLazyFamily(except) {
    let victim = null, oldest = Infinity;
    for (const [family, st] of this._lazyState()) {
      if (st.status !== 'ready' || family === except) continue;
      const art = MONSTER_ART[family];
      if (!art) continue;
      const used = art._lastUsed || 0;
      if (used < oldest && !this._familyArtInUse(family)) { oldest = used; victim = family; }
    }
    if (!victim) return false;
    const art = MONSTER_ART[victim];
    for (const s of statesOf(art)) {
      const key = `mon_${victim}_${s}`;
      if (this.textures.exists(key)) this.textures.remove(key);
    }
    this._lazyState().delete(victim);
    return true;
  },

  _residentLazyCount() {
    let n = 0;
    for (const st of this._lazyState().values()) if (st.status === 'ready' || st.status === 'loading') n++;
    return n;
  },

  /**
   * Make sure a family's sheets are loaded or loading. Returns true when they
   * are ready NOW. `hard` is a real need (a spawn, a summon): it may exceed the
   * cap when everything resident is in use. A prefetch (`hard` false) never
   * does, and never evicts what it cannot spare.
   */
  _ensureFamilyArt(family, hard = true) {
    const art = MONSTER_ART[family];
    if (!art) return false;
    if (!art.lazy) return true;
    this._touchFamilyArt(art);
    const map = this._lazyState();
    let st = map.get(family);
    if (this._familyArtReady(family)) {
      if (!st || st.status !== 'ready') map.set(family, { status: 'ready', left: 0, tries: 0 });
      return true;
    }
    if (st && st.status === 'loading') return false;
    if (st && st.status === 'failed' && st.tries >= LAZY_MAX_TRIES) return false;
    if (this._residentLazyCount() >= LAZY_FAMILY_CAP) {
      const freed = this._evictLazyFamily(family);
      if (!freed && !hard) return false;
    }
    // A quiet cap on how many families load at once: two is plenty and keeps
    // the main thread's decode work from landing in a single frame.
    if (!hard) {
      let loading = 0;
      for (const v of map.values()) if (v.status === 'loading') loading++;
      if (loading >= 2) return false;
    }
    const states = statesOf(art);
    st = { status: 'loading', left: states.length, tries: (st ? st.tries : 0) + 1, waiters: (st && st.waiters) || [] };
    map.set(family, st);
    for (const s of states) {
      const key = `mon_${family}_${s}`;
      if (this.textures.exists(key)) { st.left--; continue; }
      this.load.spritesheet(key, `./public/assets/${art.dir || ''}mon_${family}_${s}.png`,   // ROUND 394 -- `dir`: the r392 bodies live in creatures/
        { frameWidth: art.cell, frameHeight: art.cell });
      this.load.once(`filecomplete-spritesheet-${key}`, () => {
        st.left--;
        if (st.left <= 0) this._lazyFamilyDone(family, st, true);
      });
    }
    if (st.left <= 0) { this._lazyFamilyDone(family, st, true); return true; }
    if (!this._lazyErrHooked) {
      this._lazyErrHooked = true;
      this.load.on('loaderror', (file) => {
        const m = /^mon_(\w+?)_(idle|run|attack|crouch|fly)$/.exec(file && file.key);   // ROUND 393 -- and fly
        if (!m) return;
        const stx = this._lazyState().get(m[1]);
        if (stx && stx.status === 'loading') this._lazyFamilyDone(m[1], stx, false);
      });
    }
    this._ensureMonsterDeathArt && this._ensureMonsterDeathArt(family);
    if (!this.load.isLoading()) this.load.start();
    return false;
  },

  _lazyFamilyDone(family, st, ok) {
    st.status = ok ? 'ready' : 'failed';
    const waiters = st.waiters || [];
    st.waiters = [];
    for (const w of waiters) { try { w(ok); } catch (e) { /* a waiter's fault is its own */ } }
  },

  /** A promise that settles once the family's art is loaded (true) or has
   *  failed (false). Resolves at once for a family that needs no loading. */
  _whenFamilyArt(family) {
    return new Promise((resolve) => {
      if (this._ensureFamilyArt(family, true)) { resolve(true); return; }
      const st = this._lazyState().get(family);
      if (!st || st.status === 'failed') { resolve(false); return; }
      st.waiters = st.waiters || [];
      st.waiters.push(resolve);
    });
  },

  /**
   * Called from `_updateSpawnActivation` for each sleeping group a little past
   * the wake radius: fetch its family's art so it is there when the pack wakes.
   */
  _prefetchLazyArt(g) {
    const t = g && MONSTER_TYPES[g.key];
    if (!t) return;
    const art = MONSTER_ART[t.family];
    if (!art || !art.lazy) return;
    this._ensureFamilyArt(t.family, false);
  },
};
