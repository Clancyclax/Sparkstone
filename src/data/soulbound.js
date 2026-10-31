// ============================================================================
// ROUND 327 -- SOULBOUND ITEMS.
//
//   "Epic items and above should be soulbound. Meaning once a character equips
//    it no other character may do so."
//
// The rule, said once. An item whose rarity is Epic or higher BINDS to the
// first character who equips it (the player, or a companion by their roster id).
// From then on only that character may equip it; anyone else is refused at the
// door. Nothing else changes: it can still be carried, sold, dropped or taken
// off again -- it is the wearer that is fixed, not the item's whereabouts.
//
// This replaces Round 323's reading ("soul-bound = 300 seconds of wear"), which
// he corrected. The Soul-Imprinting Triune's "growth items that are soul-bound
// to you" are now simply the Epic-and-above items bound to the player.
//
// Pure: no scene, no save state. The owner is recorded ON the item as `boundTo`
// ('player' or a companion's id), which a save already keeps. `soulBound` (the
// Round 323 flag) is kept in step for the Triune and for old saves: an item that
// carries it and no `boundTo` is read as bound to the player.
// ============================================================================

export const SOULBOUND_FROM = 'Epic';
const LADDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Divine'];

/** The owner id the player is recorded under. */
export const PLAYER_ID = 'player';

/** Does an item of this rarity bind when equipped? */
export function isSoulboundRarity(rarity) {
  const i = LADDER.indexOf(rarity);
  return i >= LADDER.indexOf(SOULBOUND_FROM);
}

/** Who this item is bound to, or null. */
export function boundTo(item) {
  if (!item) return null;
  if (item.boundTo) return item.boundTo;
  return item.soulBound ? PLAYER_ID : null;
}

/** Is it bound to this character? */
export function isBoundTo(item, charId) {
  return boundTo(item) === charId;
}

/** Why this character may not equip the item, or null if they may. */
export function bindingRefusal(item, charId) {
  const owner = boundTo(item);
  if (!owner || owner === charId) return null;
  return { owner, reason: 'soulbound' };
}

/** Bind on equip. Returns true when this call is the one that bound it. */
export function bindOnEquip(item, charId) {
  if (!item || !isSoulboundRarity(item.rarity) || boundTo(item)) return false;
  item.boundTo = charId;
  if (charId === PLAYER_ID) item.soulBound = true;
  return true;
}

/** The line a card prints. `nameOf` turns an owner id into a name. */
export function boundLine(item, nameOf = (id) => (id === PLAYER_ID ? 'you' : id)) {
  const owner = boundTo(item);
  if (owner) return owner === PLAYER_ID ? 'Soulbound to you.' : `Soulbound to ${nameOf(owner)}.`;
  if (item && isSoulboundRarity(item.rarity)) return 'Binds to the first to equip it.';
  return null;
}
