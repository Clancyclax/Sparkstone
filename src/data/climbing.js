// ============================================================================
// ROUND 310 -- WHO CAN CLIMB VINES
//
//   "Vines should only be climbable with the appropriate skill. Gained from an
//    essence or awakening stone (Monkey, bear, claw, ape, hand, adept, etc)."
//
// A ladder is for anyone. Vines are for a body that can hang and haul: any
// essence or awakening stone below that grips, claws, clings or climbs
// qualifies. Pure data and one question, so the scene, the tooltip and the
// tests all ask the same thing.
// ============================================================================

/** Essence and stone SUFFIXES (essMonkey / stoneMonkey) that grant a climb. */
export const CLIMB_KINDS = {
  Monkey: 'a monkey\'s hands and tail',
  Ape: 'an ape\'s long arms',
  Bear: 'a bear\'s claws and weight',
  Claw: 'hooked claws',
  Hand: 'a hand that will not let go',
  Adept: 'practised, easy movement',
  Cat: 'a cat\'s claws and balance',
  Lizard: 'clinging feet',
  Spider: 'sticky legs',
  Sloth: 'a hanging grip',
  Foot: 'sure feet',
  Hook: 'a hook to catch a handhold',
  Rake: 'tines that bite into a surface',
  Pangolin: 'armoured claws that dig in',
  Needle: 'a needle-point grip',
};

/** The essence or stone ids in `slotEssence` / `slotStones` that give a climb. */
export function climbSources(player) {
  if (!player) return [];
  const out = [];
  const ids = [];
  for (const id of (player.slotEssence || [])) if (id) ids.push(id);
  for (const row of (player.slotStones || [])) for (const id of (row || [])) if (id) ids.push(id);
  for (const id of ids) {
    const m = /^(?:ess|stone)([A-Z][A-Za-z]*)$/.exec(String(id));
    if (m && CLIMB_KINDS[m[1]] && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Can this player climb vines? */
export function canClimbVines(player) {
  if (!player) return false;
  if (player.canClimbVines) return true;   // a granted skill (a future book, an item)
  return climbSources(player).length > 0;
}
