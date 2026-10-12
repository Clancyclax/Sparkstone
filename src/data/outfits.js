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
// Every other outfit carries its own idle, swing and run for each weapon combo
// (battlemageManifest.js lists them), and is drawn whatever armour is worn.
//
// `bodies` says which body types may wear it. 'bt1' is m_muscular, 'bt2' is
// f_muscular (the same split `_armoredIsBt1` makes).
export const OUTFITS = {
  armored:    { id: 'armored',    name: 'Fully Armored', bodies: ['bt1', 'bt2'] },
  battlemage: { id: 'battlemage', name: 'BattleMage',    bodies: ['bt2'] },
};
export const OUTFIT_ORDER = ['armored', 'battlemage'];

export function bodyKeyOf(bodyType) { return bodyType === 'm_muscular' ? 'bt1' : 'bt2'; }

/** The outfits this body type may wear, in the order the arrows walk them. */
export function outfitsForBody(bodyType) {
  const b = bodyKeyOf(bodyType);
  return OUTFIT_ORDER.filter(id => OUTFITS[id].bodies.includes(b));
}

/** The outfit actually in force: the chosen one if this body may wear it, else the default. */
export function effectiveOutfit(id, bodyType) {
  const list = outfitsForBody(bodyType);
  return list.includes(id) ? id : 'armored';
}

/** One step through the list, wrapping. */
export function stepOutfit(id, bodyType, dir) {
  const list = outfitsForBody(bodyType);
  const i = Math.max(0, list.indexOf(effectiveOutfit(id, bodyType)));
  return list[(i + (dir < 0 ? -1 : 1) + list.length) % list.length];
}
