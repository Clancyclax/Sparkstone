// ===========================================================================
// ROUND 310 (item 2.2.6) -- COOKING.
//
//   "Cooking (players can learn how to cook monster parts into food with
//    small temporary buffs)"
//
// A dish is a CONSUMABLE the player cooks from one monster part: it goes into
// the same bag, drinks the same way (`_useConsumable`), and is registered into
// CONSUMABLE_DEFS here at import time. It is `shopOnly`, which is the existing
// flag that keeps a consumable out of the loot tables -- a dish is something
// somebody cooked, never something that falls out of a wolf.
//
// THE BUFF IS SMALL ON PURPOSE (the ruling says small, and a dish sits beside
// Prism's chain, whose top rungs are the big ones). Each family's part is
// given one flavour of buff, rotated by its place in the table, so the same
// part always cooks the same dish. Four to nine per cent, three minutes, and
// a little food to go with it.
//
// WHICH PARTS COOK. A talon, a wing, a tusk and a jar of ooze can be a meal;
// a core, a bone shard and a smear of shade cannot, and the cook says so.
// ===========================================================================

import { CONSUMABLE_DEFS, PART_DEFS } from './inventory.js';

/** Parts that are not food. */
export const INEDIBLE_FAMILIES = new Set(['skeleton', 'elemental', 'slimeGolem', 'shade', 'demon', 'dragon']);

const DISH_SECONDS = 180;
/** The flavours, in rotation. `buff` uses the player's `buffs` shapes;
 *  `statBuffs` uses the stat-buff keys (`_grantStatBuff`). */
const FLAVOURS = [
  { tag: 'Hearty',    line: 'hits 6% harder',               buff: { power: { mult: 1.06, t: DISH_SECONDS } } },
  { tag: 'Zesty',     line: 'quickens your stride by 6%',   buff: { speed: { mult: 1.06, t: DISH_SECONDS } } },
  { tag: 'Peppered',  line: 'adds 4% to critical chance',   buff: { crit: { bonus: 0.04, t: DISH_SECONDS } } },
  { tag: 'Supple',    line: 'adds 4% dodge',                statBuffs: { dodgeChance: { amount: 0.04, t: DISH_SECONDS } } },
  { tag: 'Slow-roast', line: 'recovers stamina 20% faster', statBuffs: { regenStamina: { amount: 0.20, t: DISH_SECONDS } } },
  { tag: 'Broth',     line: 'recovers health 20% faster',   statBuffs: { regenHealth: { amount: 0.20, t: DISH_SECONDS } } },
  { tag: 'Clear',     line: 'recovers mana 20% faster',     statBuffs: { regenMana: { amount: 0.20, t: DISH_SECONDS } } },
  { tag: 'Poultice',  line: 'adds 8% to healing received',  statBuffs: { healingReceived: { amount: 0.08, t: DISH_SECONDS } } },
];

export function cookableFamilies() {
  return Object.keys(PART_DEFS).filter(f => !INEDIBLE_FAMILIES.has(f));
}

/** The dish for a part id, or null when the part is not food. */
export function dishForPart(partId) {
  const fam = Object.keys(PART_DEFS).find(f => PART_DEFS[f].id === partId);
  if (!fam || INEDIBLE_FAMILIES.has(fam)) return null;
  const idx = cookableFamilies().indexOf(fam);
  const fl = FLAVOURS[idx % FLAVOURS.length];
  const part = PART_DEFS[fam];
  const id = `dish_${partId}`;
  return {
    id, name: `${fl.tag} ${part.name}`, family: fam, partId,
    desc: `Cooked from the ${part.name}. For three minutes it ${fl.line}.`,
    hp: 10, stamina: 10, food: true, shopOnly: true, cooked: true,
    buff: fl.buff, statBuffs: fl.statBuffs,
  };
}

export const DISHES = {};
for (const fam of cookableFamilies()) {
  const d = dishForPart(PART_DEFS[fam].id);
  if (d) { DISHES[d.id] = d; CONSUMABLE_DEFS[d.id] = d; }
}

export function cookingFaults() {
  const out = [];
  for (const fam of cookableFamilies()) {
    const d = DISHES[`dish_${PART_DEFS[fam].id}`];
    if (!d) { out.push(`no dish for ${fam}`); continue; }
    if (!d.buff && !d.statBuffs) out.push(`${d.id} has no buff`);
    if (!d.shopOnly) out.push(`${d.id} could fall out of a monster`);
    for (const b of Object.values(d.buff || {})) {
      if ((b.mult || 1) > 1.1 || (b.bonus || 0) > 0.06) out.push(`${d.id} is not a SMALL buff`);
    }
  }
  return out;
}
