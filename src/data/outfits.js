import { LEATHER_PARTS } from './leatherManifest.js';

// ROUND 303 -- OUTFITS: the look of the player's body, chosen on the Equipment
// screen with the arrows either side of the body cell.
//
//   "On the Equipment screen I'd like to add some arrows on either side of
//    body. Toggling to the left or right will enable the player to swap
//    through outfits for their body type. Currently in game the only outfit
//    option is Fully Armored, however I've added a Body Type 2 BattleMage
//    outfit ... Each outfit will have it's own suite of weapon animations."
//
// 'armored' is what the game has always drawn (the full-metal knight once
// helmet, chest, gloves and boots are on; the partial-armour sets before that),
// so it is the default and an old save with no `player.outfit` is on it.
// ROUND 328 -- the BattleMage is now worn by both bodies: body type 1 has its own
// forty-five combos (BATTLEMAGE_BT1_SHEETS), body type 2 forty-four.
// Every other outfit carries its own idle, swing and run for each weapon combo
// (battlemageManifest.js lists them), and is drawn whatever armour is worn.
//
// `bodies` says which body types may wear it. 'bt1' is m_muscular, 'bt2' is
// f_muscular (the same split `_armoredIsBt1` makes).
// ROUND 337 -- LEATHER & CHAINMAIL, both bodies: 45 weapon sets and the 31 partial-gear looks each
// (leatherManifest.js). It is the DEFAULT WHILE IN THE SEWER (see `sewerDefaultApplies`).
export const OUTFITS = {
  armored:    { id: 'armored',    name: 'Fully Armored',       bodies: ['bt1', 'bt2'] },
  battlemage: { id: 'battlemage', name: 'BattleMage',          bodies: ['bt1', 'bt2'] },   // ROUND 328: body type 1 too
  leather:    { id: 'leather',    name: 'Leather & Chainmail', bodies: ['bt1', 'bt2'] },   // ROUND 337
  // ROUND 369 -- "why are the pugilist and duelist outfits not available in the equipment menu." Their 45 weapon sets per
  // body arrived complete (duelistManifest.js / pugilistManifest.js); worn whole, like the BattleMage, no partial gear.
  duelist:    { id: 'duelist',    name: 'Duelist',             bodies: ['bt1', 'bt2'] },
  pugilist:   { id: 'pugilist',   name: 'Pugilist',            bodies: ['bt1', 'bt2'] },
};
export const OUTFIT_ORDER = ['armored', 'battlemage', 'leather', 'duelist', 'pugilist'];

/** ROUND 352 -- LEATHER & CHAINMAIL: THE STAND-INS, LISTED (the ARMORED_ART_GAPS convention: "use the stand-in, this will
 *  allow me to identify where models are needed vs not working in the future", round 73).
 *
 *  The 45 full-set weapon sheets have idle, attack and run. The 31 partial-gear looks (and the bare body under the
 *  Leather outfit) have idle and run ONLY -- "Partial sets have no weapon or attack art yet. Sword attacks for every
 *  partial combination and the bare body are being generated and will arrive in a later drop." Until then a swing taken
 *  in a partial look is the body's own default swing (`playerTexKeys.attack`), drawn from the plain body rather than
 *  from the worn pieces. One entry per look per body, so the next drop can be ticked off against it. Exported, and a
 *  test (test_round352.cjs) asserts it is exactly the partial manifest plus the bare body, so it cannot drift. */
export const LEATHER_ART_GAPS = [];
for (const bk of ['bt1', 'bt2']) {
  for (const slots of Object.keys(LEATHER_PARTS[bk] || {})) {
    LEATHER_ART_GAPS.push({ outfit: 'leather', body: bk, look: `part_${slots}`, missing: 'attack',
      borrows: "the body's own default swing", why: 'partial-gear sets ship idle + run only' });
  }
  LEATHER_ART_GAPS.push({ outfit: 'leather', body: bk, look: 'bare', missing: 'attack',
    borrows: "the body's own default swing", why: 'bare-body sword attack not drawn yet' });
}

/** ROUND 337 -- "These are to become the new default while in the sewer." The sewer's default is Leather & Chainmail
 *  for a player who has never picked an outfit with the arrows (`player.outfitChosen`) and whose saved outfit is still
 *  the old default (or none). Anyone who chose Fully Armored, or the BattleMage, on purpose is left as they chose. */
export function sewerDefaultApplies(player, inSewer) {
  if (!inSewer || !player || player.outfitChosen) return false;
  return !player.outfit || player.outfit === 'armored';
}

export function bodyKeyOf(bodyType) { return bodyType === 'm_muscular' ? 'bt1' : 'bt2'; }

/** The outfits this body type may wear, in the order the arrows walk them. */
export function outfitsForBody(bodyType) {
  const b = bodyKeyOf(bodyType);
  return OUTFIT_ORDER.filter(id => OUTFITS[id].bodies.includes(b));
}

/** The outfit actually in force: the chosen one if this body may wear it, else the default. */
export function effectiveOutfit(id, bodyType, sewerDefault = false) {
  const list = outfitsForBody(bodyType);
  if (sewerDefault && list.includes('leather')) return 'leather';   // ROUND 337
  return list.includes(id) ? id : 'armored';
}

/** One step through the list, wrapping. */
export function stepOutfit(id, bodyType, dir, sewerDefault = false) {
  const list = outfitsForBody(bodyType);
  const i = Math.max(0, list.indexOf(effectiveOutfit(id, bodyType, sewerDefault)));
  return list[(i + (dir < 0 ? -1 : 1) + list.length) % list.length];
}
