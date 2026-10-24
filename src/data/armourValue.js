// ============================================================================
// ROUND 387 -- ARMOUR IS A VALUE.
//
//   "Armor on gear should be a value not a percentage."  Asked how, the user chose "Value, diminishing": gear, Power
//   and passives give Armor points; the total becomes physical damage reduction as Armor / (Armor + K), where K grows
//   with the attacker's rank, capped at 80%. Stacking armour gives less each point, and a higher-rank blow gets
//   through more.
//
// WHAT IS A VALUE AND WHAT IS A PERCENTAGE
//   points    `armor`     a piece's inherent armour, a rolled "+N Armor", Power's armour; summed on the sheet
//   percent   `armorPct`  "+5% armour" -- item effects, relic souls, rank riders, attribute additions, passive
//                         `armorBonus`, timed armour buffs and condition bonuses: each MULTIPLIES the points
//   sunder    the Sundered debuff takes its share of the points off, multiplicatively
//
// THE NUMBERS
//   Round 27's fractions become points at ARMOR_POINTS_PER_FRACTION (a chest's 7% is 70 Armor at Iron). A piece's
//   armour scales by its whole rank step (2.2x a rank, as flat stats always have), not the cube-root softening a
//   percentage needed to stay under its cap -- the formula does that job now. K scales by the same step, so a full
//   set of your own rank's armour reduces your own rank's blows by the same share at Iron as at Gold:
//     a full Iron set (240 points) against an Iron blow: 240 / (240 + 450) = 35%
//     the same set against a Bronze blow: 240 / (240 + 990) = 20%;   against a Normal one: 35% (Normal reads as Iron)
//   Power's armour (16 a point at Iron) scales by the holder's rank step too.
// ============================================================================

export const ARMOR_POINTS_PER_FRACTION = 1000;
/** K for an Iron-rank (and Normal-rank) attacker. */
export const ARMOR_K_IRON = 450;
/** Per rank above Iron, for K and for rank-scaled armour sources. Equal to stats.js GEAR_RANK_STEP. */
export const ARMOR_RANK_STEP = 2.2;
export const ARMOR_REDUCTION_CAP = 0.8;

/** RANK_ORDER index (normal 0, iron 1, bronze 2 ...) -> the step multiplier; Normal reads as Iron. */
export function armorRankScale(rankIdx = 1) {
  return Math.pow(ARMOR_RANK_STEP, Math.max(0, (Number(rankIdx) || 0) - 1));
}
export function armorK(rankIdx = 1) {
  return ARMOR_K_IRON * armorRankScale(rankIdx);
}

/** Effective points: base points times (1 + every percentage bonus), less the sundered share. */
export function effectiveArmor(points, pct = 0, sunder = 0) {
  const p = Math.max(0, Number(points) || 0) * Math.max(0, 1 + (Number(pct) || 0)) * Math.max(0, 1 - (Number(sunder) || 0));
  return p;
}

/** The share of a physical blow from an attacker of `attackerRankIdx` that `points` of armour turns aside. */
export function armorReduction(points, attackerRankIdx = 1) {
  const p = Math.max(0, Number(points) || 0);
  if (!(p > 0)) return 0;
  return Math.min(ARMOR_REDUCTION_CAP, p / (p + armorK(attackerRankIdx)));
}

/** "41% vs Iron, 24% vs Bronze" -- the sheet's reading of a total, at the holder's rank and the one above. */
export function armorReadout(points, rankIdx = 1, RANK_NAMES = ['Normal', 'Iron', 'Bronze', 'Silver', 'Gold', 'Diamond']) {
  const at = Math.max(1, rankIdx | 0);
  const pc = (x) => `${Math.round(x * 100)}%`;
  const here = `${pc(armorReduction(points, at))} vs ${RANK_NAMES[at] || 'your rank'}`;
  const up = at + 1 < RANK_NAMES.length ? `, ${pc(armorReduction(points, at + 1))} vs ${RANK_NAMES[at + 1]}` : '';
  return `${here}${up}`;
}

// ----------------------------------------------------------------------------
// SAVES FROM BEFORE THIS ROUND hold armour as fractions. `migrateArmorBuffs` converts one item in place, once:
//   inherent armour       -> the slot's points at the item's rank and level, keeping any stock bias (crafting) as the
//                            ratio of the old figure to the old formula's
//   a rolled armour buff  -> points, at the whole rank step rather than the softened one it was rolled at
//   an effect / relic     -> `armorPct` (it said "+5% armour", which is what it now does)
// Anything with |amount| >= 1 is already points and is left alone; the item is marked `armorPts`.
// `legacy` = { slotArmorLegacy(slot, rank, level), power(rank, level), soft(rank, level) } from stats.js.
// ----------------------------------------------------------------------------
export function migrateArmorBuffs(item, legacy, slotArmorNow) {
  if (!item || item.armorPts || !Array.isArray(item.buffs)) { if (item && Array.isArray(item.buffs)) item.armorPts = true; return item; }
  for (const b of item.buffs) {
    if (!b || b.stat !== 'armor' || typeof b.amount !== 'number') continue;
    if (Math.abs(b.amount) >= 1) continue;
    if (b.effect || b.relic || b.soul || !item.slot) { b.stat = 'armorPct'; continue; }
    if (b.inherent || b.armourClass) {
      const old = legacy.slotArmorLegacy(item.slot, item.rank, item.level);
      const now = slotArmorNow(item.slot, item.rank, item.level);
      b.amount = old > 0 ? Math.round((b.amount / old) * now) : Math.round(b.amount * ARMOR_POINTS_PER_FRACTION);
      continue;
    }
    const k = legacy.soft(item.rank, item.level) > 0 ? legacy.power(item.rank, item.level) / legacy.soft(item.rank, item.level) : 1;
    b.amount = Math.max(1, Math.round(b.amount * ARMOR_POINTS_PER_FRACTION * k));
  }
  item.armorPts = true;
  return item;
}
