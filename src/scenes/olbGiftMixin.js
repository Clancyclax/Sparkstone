// ===========================================================================
// ROUND 389 -- OLB'S CHAPTER: THE GIFT HER SACRIFICE PAYS, AND THE DOOR TO THE HUNT.
//
//   "Olb's sacrifice now offers a gift evolution, this is good. It shouldn't
//    always be the same -- it should pull from all of the available options and
//    try to look for something that synergizes with the character's kit."
//   "Olb shouldn't offer the last stage of the quest until you have all 4 of
//    your essences absorbed."
//
// The rules are in src/data/olbGift.js (the pool, the score, the pick) and
// src/data/olbHunt.js (the four essences, and her words). This is where they
// meet the player:
//
//   _olbGiftKit()           the kit as it stands, for the score (live abilities, and what the cap holds off)
//   _olbGiftScored()        every candidate, scored, with the catalyst's slot
//   _olbGiftReward()        from _natureAchieve('olb', ...): the pick, woken with its reason; banked if nothing can wake
//   _olbHuntGap()           { held, essences, confluence, ready } -- three essences and the confluence
//   _olbHuntReady()         all four are in
//   _olbHuntRefuse(npc)     her line when they are not
//   _olbHuntWaitLine()      the quest log's line while she waits
//
// Player field: `olbGift` { id, why, pool } -- what the sacrifice paid and why (for the sheet and a bug report).
// ===========================================================================

import { kitProfile, scoreGift, olbGiftCandidates, pickGift, giftWhyLine, giftAsAwarded } from '../data/olbGift.js';
import { olbHuntEssenceGap, olbHuntNeedLine, olbHuntNeedLog } from '../data/olbHunt.js';
import { OLB_NAME } from '../data/olbArc.js';
import { abilityDeals } from '../data/awakening.js';
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';

const kindOf = (a) => (a && a.template === 'aura' ? 'aura' : (a && a.template === 'perception' ? 'perception' : null));

export const OlbGiftMixin = {
  // ---------------------------------------------------------------- the gift
  /** The kit, for the score: what runs, and what the one-a-kit cap holds switched off. */
  _olbGiftKit() {
    const p = this.player || {};
    const known = p.knownAbilities || {};
    const capHeld = p.senseCapHeld || {};
    const held = { aura: [], perception: [] };
    const entries = [];
    for (const [k, e] of Object.entries(known)) {
      if (!e || !e.ability) continue;
      const kind = kindOf(e.ability);
      const heldOff = (capHeld[k] && capHeld[k] === e.ability.name) || (!!e.overCap && !(p.senseChoice && p.senseChoice[k] === e.ability.name));
      if (kind && heldOff) { held[kind].push(e.ability.name); continue; }
      const live = this._passiveOn ? this._passiveOn(k) : true;
      const slotIndex = e.slotIndex != null ? e.slotIndex : Number(String(k).split(':')[0]);
      entries.push({ ability: e.ability, slotIndex: Number.isFinite(slotIndex) ? slotIndex : null, essenceId: e.essenceId || null, live });
    }
    return kitProfile(entries, held, abilityDeals);
  },

  /** Every candidate, scored against the kit. */
  _olbGiftScored() {
    const p = this.player;
    const st = this._natureState ? this._natureState() : null;
    if (!st) return [];
    const cat = this._natureCatalogue ? this._natureCatalogue() : null;
    const seed = this._shopSeed ? this._shopSeed() : 0;
    const cands = olbGiftCandidates(st, cat, this._natureSpecs || null, seed);
    const prof = this._olbGiftKit();
    const slotOf = (c) => {
      if (!c) return null;
      if (c.id == null) return { slotIndex: 3, name: `${c.name} confluence` };   // the confluence sits in the fourth slot
      const i = (p.slotEssence || []).indexOf(c.id);
      const nm = (ESSENCE_CATALOG[c.id] && ESSENCE_CATALOG[c.id].name) || c.name;
      return { slotIndex: i >= 0 ? i : null, name: `${nm} essence` };
    };
    return cands.map(({ evo, catalyst }) => ({ evo, ...scoreGift(evo, prof, slotOf(catalyst)) }));
  },

  /** Olb's sacrifice: the best fit for the kit, woken now with its reason; banked when nothing can wake. */
  _olbGiftReward() {
    const p = this.player;
    if (!p) return null;
    const scored = this._olbGiftScored();
    const seed = this._shopSeed ? this._shopSeed() : 0;
    const { pick } = pickGift(scored, `${seed}|olbGift`);
    if (!pick) { p.natureBanked = (p.natureBanked || 0) + 1; return null; }
    const why = giftWhyLine(pick.reasons);
    const evo = giftAsAwarded(pick.evo);
    p.olbGift = { id: evo.id, name: evo.name, why, pool: scored.length };
    return this._natureEvolve(evo, 'reward', why);
  },

  // ---------------------------------------------------------------- the door to the hunt
  _olbHuntGap() {
    const p = this.player || {};
    return olbHuntEssenceGap(p.slotEssence, p.confluence);
  },
  _olbHuntReady() { return this._olbHuntGap().ready; },

  /** She will not take you yet, and says what is missing. */
  _olbHuntRefuse(npc) {
    this._openDialogue(OLB_NAME, olbHuntNeedLine(this._olbHuntGap()), npc || this._lastTalkNpc || null);
  },

  /** The quest log's line while she waits: what is still missing, or the old "find Olb" when all four are in. */
  _olbHuntWaitLine() {
    const g = this._olbHuntGap();
    return g.ready ? 'Rest, then find Olb for the hunt' : olbHuntNeedLog(g);
  },
};
