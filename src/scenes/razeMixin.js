// ============================================================================
// ROUND 428 -- RAZING, for Destruction's secret.
//
// "Destruction is the right idea but maybe we need a new mechanic to destroy cities or villages?"
//
// THE FIREBRAND. Pitch and rag on a stick, sold by the fences in the bandit cities. Used from the bag or a potion slot,
// it is thrown at the nearest building within 3 tiles and sets it alight.
// FIRE SPREADS. A building burns for 40 seconds. From its twelfth second, every second, it may catch a neighbour within
// 24 tiles in the same settlement (one in five). Walls, fences, ponds and temples do not burn.
// THE SETTLEMENT FALLS when 60% of what can burn in it has burned. Its people die where they stood, the rubble and the
// bodies go down as for a city the surge took (`_applyFallen`, scoped to the settlement), and Destruction notices: a
// hamlet, village or town wins the minor favour, a walled city the major.
// IT IS A CRIME. Setting a fire where anyone can see it calls the watch, and the warrant is lethal.
// State: `player.razed428` { burnt: { stId: [buildingKey] }, fallen: { stId: { day, region, kind } } }.
// ============================================================================
import { TILE, isoProject } from '../data/iso.js';
import { regionPoint, REGIONS } from '../data/regions.js';
import { spendCoins, coinPurseValue } from '../data/inventory.js';
import { FIREBRAND_ID, FIREBRAND_PRICE, FIREBRAND_BUNDLE, RAZE } from '../data/raze428.js';

const BURNT_TINT = 0x3b302a;

export const RazeMixin = {
  _razeState() {
    const p = this.player;
    if (!p.razed428 || typeof p.razed428 !== 'object') p.razed428 = { burnt: {}, fallen: {} };
    if (!p.razed428.burnt) p.razed428.burnt = {};
    if (!p.razed428.fallen) p.razed428.fallen = {};
    return p.razed428;
  },
  _razeKey(b) { return `${Math.round(b.x)}|${Math.round(b.y)}`; },
  _razeBurnable(b) { return !!(b && b.sprite && !b.wall && !b.fence && !b.pond && !b.temple && !b.gate && !b.isGate); },

  /** The settlement a point stands in (any region), with its centre and reach. */
  _razeSettlementAt(x, y) {
    for (const region of REGIONS) {
      for (const st of (region.settlements || [])) {
        if (!['hamlet', 'village', 'town', 'city'].includes(st.kind)) continue;
        const c = st._centre || regionPoint(region, st.at);
        if (!c) continue;
        const r = this._settlementExtentTiles ? this._settlementExtentTiles(st) : (st.radius || 10);
        if (Math.hypot(x - c.x, y - c.y) <= (r + 2) * TILE) return { st, region, at: { x: c.x, y: c.y }, radiusTiles: r + 2 };
      }
    }
    return null;
  },

  /** Every building that can burn in this settlement. Cached per settlement. */
  _razeBuildingsOf(S) {
    this._razeCache = this._razeCache || {};
    if (this._razeCache[S.st.id]) return this._razeCache[S.st.id];
    const out = (this.buildings || []).filter(b => this._razeBurnable(b)
      && Math.hypot(b.x - S.at.x, b.y - S.at.y) <= S.radiusTiles * TILE);
    this._razeCache[S.st.id] = out;
    return out;
  },

  /** Throw a firebrand from the bag. */
  _razeThrow(bagIdx) {
    const p = this.player;
    if (this._insideRoom) { this._floatText(this.world.x, this.world.y - 40, 'Not in here.', '#ffcc80'); return false; }
    let best = null, bd = Infinity;
    for (const b of (this.buildings || [])) {
      if (!this._razeBurnable(b) || b._razeBurning || b._razeBurnt) continue;
      const d = Math.hypot(b.x - this.world.x, b.y - this.world.y) - (b.radius || 40);
      if (d <= RAZE.throwTiles * TILE && d < bd) { best = b; bd = d; }
    }
    const S = best && this._razeSettlementAt(best.x, best.y);
    if (!best || !S) { this._floatText(this.world.x, this.world.y - 40, 'Nothing close enough that will burn', '#ffcc80'); return false; }
    if (this._razeState().fallen[S.st.id]) { this._floatText(this.world.x, this.world.y - 40, 'There is nothing left here to burn', '#ffcc80'); return false; }
    p.inventory.consumables.splice(bagIdx, 1);
    if (this._renderInventory && this._inventoryOpen) this._renderInventory();
    this._razeIgnite(best, S, true);
    // seen setting it, the watch is called and the warrant is lethal
    const seen = this._banditJobWitnesses ? this._banditJobWitnesses(null) : [];
    if (seen.length && this._crimeReport && this._crime) {
      this._crimeReport('arson', { b: { settlement: S.st.id } });
      const C = this._crime(), rid = this._crimeRegion ? this._crimeRegion() : null;
      if (rid && C.wanted && C.wanted[rid]) C.wanted[rid].lethal = true;
    }
    return true;
  },

  _razeIgnite(b, S, byHand = false) {
    if (b._razeBurning || b._razeBurnt) return;
    b._razeBurning = { t: 0, st: S.st.id, catchT: 0 };
    b._razeS = S;
    (this._razeFires = this._razeFires || []).push(b);
    this._razeFlames(b);
    if (byHand) this._floatText(b.x, b.y - 80, `${S.st.name} is burning`, '#ff7043');
  },

  /** Three flickering tongues of fire over the roof. */
  _razeFlames(b) {
    const sp = b.sprite;
    if (!sp || !this.add) return;
    const bounds = sp.getBounds();
    const made = [];
    for (let i = 0; i < 3; i++) {
      const x = bounds.centerX + (i - 1) * bounds.width * 0.22;
      const y = bounds.top + bounds.height * (0.32 + 0.08 * (i % 2));
      const e = this.add.ellipse(x, y, bounds.width * 0.26, bounds.height * 0.34, i === 1 ? 0xffb74d : 0xff5722, 0.5);
      e.setDepth((sp.depth || 0) + 0.5);
      if (e.setBlendMode) e.setBlendMode(1);   // ADD
      if (this.tweens) this.tweens.add({ targets: e, scaleY: { from: 0.8, to: 1.25 }, alpha: { from: 0.35, to: 0.65 }, duration: 260 + i * 70, yoyo: true, repeat: -1 });
      made.push(e);
    }
    b._razeFx = made;
    sp.setTint(0xff8a50);
  },

  _razeBurnOut(b) {
    for (const e of (b._razeFx || [])) { if (this.tweens) this.tweens.killTweensOf(e); e.destroy(); }
    b._razeFx = null;
    if (b.sprite) b.sprite.setTint(BURNT_TINT);
    b._razeBurnt = true;
    const st = b._razeBurning && b._razeBurning.st;
    b._razeBurning = null;
    if (!st) return;
    const R = this._razeState();
    const list = R.burnt[st] = R.burnt[st] || [];
    const k = this._razeKey(b);
    if (!list.includes(k)) list.push(k);
    if (b._razeS) this._razeCheckFall(b._razeS);
  },

  _razeTick(dt) {
    const fires = this._razeFires;
    if (!fires || !fires.length) return;
    for (const b of fires.slice()) {
      const f = b._razeBurning;
      if (!f) { this._razeFires = this._razeFires.filter(x => x !== b); continue; }
      f.t += dt;
      if (f.t >= RAZE.catchAfterS) {
        f.catchT += dt;
        while (f.catchT >= 1) {
          f.catchT -= 1;
          if (Math.random() >= RAZE.catchChance) continue;
          const S = b._razeS;
          const near = this._razeBuildingsOf(S).filter(o => o !== b && !o._razeBurning && !o._razeBurnt
            && Math.hypot(o.x - b.x, o.y - b.y) <= RAZE.catchTiles * TILE);
          if (near.length) this._razeIgnite(near[Math.floor(Math.random() * near.length)], S);
        }
      }
      if (f.t >= RAZE.burnS) {
        this._razeBurnOut(b);
        this._razeFires = this._razeFires.filter(x => x !== b);
      }
    }
  },

  /** Enough of it has burned: the settlement falls. */
  _razeCheckFall(S) {
    const R = this._razeState();
    if (R.fallen[S.st.id]) return;
    const all = this._razeBuildingsOf(S);
    if (!all.length) return;
    const burnt = all.filter(b => b._razeBurnt).length;
    if (burnt / all.length < RAZE.fallFrac) return;
    R.fallen[S.st.id] = { day: (this._dayIndex ? this._dayIndex() : 0) || 1, region: S.region.id, kind: S.st.kind };
    this._razeApplyFallen(S);
    const major = S.st.kind === 'city';
    if (this._dsDeed) this._dsDeed('destruction', major ? 'major' : 'minor', S.st.id);
    this._openDialogue(S.st.name, `${S.st.name} burns to the ground. Nobody puts it out.\n\n[ ${S.st.name} is gone: its people dead where they stood, its houses ash. ]`);
  },

  _razeApplyFallen(S) {
    if (!this._applyFallen) return 0;
    try { return this._applyFallen(S.region.id, { key: `raze:${S.st.id}`, at: S.at, radiusTiles: S.radiusTiles }); } catch (e) { console.warn('[raze] fall', e && e.message); return 0; }
  },

  /** After a load: what burned is ash again, and what fell is empty again. */
  _razeRestore() {
    const R = this._razeState();
    this._razeCache = {};
    this._razeFires = [];
    const ids = new Set([...Object.keys(R.burnt), ...Object.keys(R.fallen)]);
    for (const id of ids) {
      let S = null;
      for (const region of REGIONS) {
        const st = (region.settlements || []).find(x => x.id === id);
        if (st) { const c = st._centre || regionPoint(region, st.at); if (c) S = this._razeSettlementAt(c.x, c.y); break; }
      }
      if (!S) continue;
      const keys = new Set(R.burnt[id] || []);
      for (const b of this._razeBuildingsOf(S)) {
        if (!keys.has(this._razeKey(b))) continue;
        b._razeBurnt = true;
        if (b.sprite) b.sprite.setTint(BURNT_TINT);
      }
      if (R.fallen[id]) this._razeApplyFallen(S);
    }
  },

  /** A fence in a bandit city sells firebrands. Joined to `_societyAddendum` through `_throneAddendum`'s neighbour. */
  _razeAddendum(npc) {
    const body = [], choices = [];
    if (!npc || !npc.banditCity || !npc.shopId) return { body, choices };
    choices.push({ label: `Buy ${FIREBRAND_BUNDLE} Firebrands`, act: 'raze|buy' });
    return { body, choices };
  },

  _razeAct(act) {
    const what = String(act).split('|')[1];
    if (what !== 'buy') return;
    const p = this.player;
    const ok = coinPurseValue(p.coins) >= FIREBRAND_PRICE && spendCoins(p.coins, FIREBRAND_PRICE);
    this._closeDialogue();
    if (!ok) { this._openDialogue('The fence', '"Coin first. Then fire."'); return; }
    for (let i = 0; i < FIREBRAND_BUNDLE; i++) (p.inventory.consumables = p.inventory.consumables || []).push(FIREBRAND_ID);
    this._openDialogue('The fence', `"Do not light them in here."\n\n(${FIREBRAND_BUNDLE} Firebrands added to your pack.)`);
    if (this._renderInventory) this._renderInventory();
  },
};
