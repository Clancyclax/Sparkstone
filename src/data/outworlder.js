// ============================================================================
// ROUND 308 -- THE OUTWORLDER RACIALS, AND THE ASTRAL BLESSING.
//
//   "Outworlder racials need added to the game. These explain why the player
//    (and Prism) have the ability to see a minimap, speak all this new
//    language, their inventory and more. It also solves one of the biggest
//    issues, which is how do we get around hamstringing the ability and kit
//    generation."
//
// Two things live here.
//
//   RACIALS     what an Outworlder is born with. They are always on, for the
//               player and for Prism: they LABEL features the game already has
//               and gate nothing.
//   BLESSINGS   the Astral Blessing, answered during character creation after
//               the Keeper of Sands asks "Who are you?". Each one makes one
//               kind of ability about three times as likely to be rolled
//               (`BLESSING_PULL`, tuned against tools/kit_mix308.mjs), except
//               The Nameless, which is about what is FOUND, not what is rolled.
//
// And the BASELINE: with no influence at all, a kit of twenty is
//   3 special attacks, 4 spell attacks, 4 passives, 1 aura, 1 perception,
//   1 self heal, 1 defensive, 1 buff/debuff, 1 movement, 3 unassigned.
// ============================================================================

import { abilityRoles } from './buildClasses.js';

export const OUTWORLDER_RACIALS = [
  { id: 'minimap', name: 'Mini Map',
    line: 'The Nek has no maps like yours. Yours simply draws itself in the corner of your eye.' },
  { id: 'language', name: 'Language Adaptation',
    line: 'Every tongue in the Nek comes to you as your own, spoken and read. You can use skill books.' },
  { id: 'inventory', name: 'Inventory',
    line: 'Whatever you pick up goes somewhere only you can reach, and comes back when you reach for it.' },
  { id: 'loot', name: 'Loot Ability',
    line: 'What a kill leaves behind arrives in your hands. You do not have to dig.' },
  { id: 'identify', name: 'Item Identification',
    line: 'You know what a thing is when you hold it: its name, its worth, what it will do.' },
];

export const ASTRAL_BLESSINGS = [
  { id: 'reaper', name: 'The Reaper', favours: 'affliction abilities',
    line: 'Whatever you touch comes away worse for it.' },
  { id: 'phoenix', name: 'The World Phoenix', favours: 'movement abilities',
    line: 'The ground is a suggestion.' },
  { id: 'builder', name: 'The Builder', favours: 'defensive abilities and taunts',
    line: 'Things you stand behind stay standing.' },
  { id: 'moments', name: 'Keeper of Moments', favours: 'long cooldown abilities',
    line: 'You are patient. What you save is worth the wait.' },
  { id: 'book', name: 'The Celestial Book', favours: 'spell attacks',
    line: 'Every page is a different way to hurt someone.' },
  { id: 'legion', name: 'Legion', favours: 'summoning abilities',
    line: 'You are never quite alone.' },
  { id: 'eye', name: 'The All Devouring Eye', favours: 'area-of-effect abilities',
    line: 'It sees everything in front of you at once.' },
  { id: 'songs', name: 'The Seeker of Songs', favours: 'healing abilities',
    line: 'There is a tune that mends. You are learning it.' },
  { id: 'silence', name: 'Word in the Silence', favours: 'support abilities',
    line: 'What you say in the quiet carries to everyone.' },
  { id: 'throne', name: 'The Sundered Throne', favours: 'special attacks',
    line: 'A king\'s weapon, in a king\'s hand, without the king.' },
  { id: 'nameless', name: 'The Nameless', favours: 'restricted essences and awakening stones',
    line: 'Things that were never meant to be found keep finding you.' },
];

/** A special attack that asks only for A weapon in hand, whichever: what a kit
 *  with no single weapon identity gets (`requiresWeapon: 'any'`). */
export const ANY_WEAPON = 'any';

/** The odds that an eligible attack of a kit becomes a special attack. Tuned
 *  (tools/kit_mix308.mjs) so a DPS kit averages 3 special and 4 spell attacks,
 *  seven in all -- the baseline. The Sundered Throne turns the odds up
 *  threefold; the Celestial Book turns them down to a third, which leaves more
 *  of the attacks as spells. */
export const SPECIAL_SHARE = 0.5;
export function specialShareFor(blessingId) {
  const odds = SPECIAL_SHARE / (1 - SPECIAL_SHARE);
  const k = blessingId === 'throne' ? 3 : (blessingId === 'book' ? 1 / 3 : 1);
  return (odds * k) / (1 + odds * k);
}

export const BLESSING_IDS = ASTRAL_BLESSINGS.map(b => b.id);
export const blessingById = (id) => ASTRAL_BLESSINGS.find(b => b.id === id) || null;
export const isBlessing = (id) => BLESSING_IDS.includes(id);

/** The Nameless find restricted essences and awakening stones this many times
 *  as often. */
export const NAMELESS_FIND_MULT = 3;

/** Which blessing a player carries, or null (none chosen yet). */
export const blessingOf = (p) => (p && isBlessing(p.astralBlessing)) ? p.astralBlessing : null;

// --------------------------------------------------------------------------
// WHAT AN ABILITY IS, for the blessing and the baseline.
// --------------------------------------------------------------------------
const LONG_COOLDOWN = 45;   // seconds; tuned in tools/kit_mix308.mjs

/** A special attack is one the kit marks `special` or that asks for a weapon (round 309: a
 *  kit with no weapon essence marks its specials and asks for nothing in the hand). */
export function attackKindOf(a, dealsFn) {
  const r = abilityRoles(a, dealsFn);
  if (!r.attack) return null;
  return (a.requiresWeapon || a.special) ? 'special' : 'spell';
}

/** The baseline bucket an ability counts toward (exclusive). */
export function baselineBucket(a, dealsFn, categoryOf) {
  const cat = categoryOf ? categoryOf(a) : a.category;
  if (cat === 'aura') return 'aura';
  if (cat === 'perception') return 'perception';
  // the card's category (catKey) can differ from the spec's own
  if (categoryOf && cat !== a.category) a = { ...a, category: cat };
  const r = abilityRoles(a, dealsFn);
  if (r.attack) return (a.requiresWeapon || a.special) ? 'special' : 'spell';
  const active = a.kind === 'active';
  if (cat === 'movement') return 'movement';
  // A heal that reaches the caster: self, or self-and-ally. A heal for the
  // party or for others only is support, not a self heal.
  if (active && (cat === 'healing' || cat === 'restore' || a.template === 'selfHeal' || a.template === 'selfHot')
    && a.healScope !== 'party' && a.healScope !== 'allyNotSelf') return 'selfheal';
  if (active && r.defensive) return 'defensive';
  if (active && (r.buff || r.debuff)) return 'buffdebuff';
  if (a.kind === 'passive') return 'passive';
  return 'other';
}

/** The twenty, as the user wrote them. `other` stands for the 3 unassigned. */
export const BASELINE_KIT = {
  special: 3, spell: 4, passive: 4, aura: 1, perception: 1,
  selfheal: 1, defensive: 1, buffdebuff: 1, movement: 1, other: 3,
};
export const BASELINE_TOTAL = Object.values(BASELINE_KIT).reduce((a, b) => a + b, 0);

/** Counts per bucket for a kit. */
export function baselineTally(list, dealsFn, categoryOf) {
  const out = {};
  for (const k of Object.keys(BASELINE_KIT)) out[k] = 0;
  for (const a of list) { if (a) out[baselineBucket(a, dealsFn, categoryOf)]++; }
  return out;
}

/** Does this ability belong to what the blessing favours? */
export function blessingFavours(id, a, dealsFn) {
  if (!id || !a) return false;
  const r = abilityRoles(a, dealsFn);
  switch (id) {
    case 'reaper': return !!(r.dot || r.debuff) || a.category === 'affliction';
    case 'phoenix': return !!r.movement;
    case 'builder': return !!(r.defensive || a.template === 'tauntPull');
    case 'moments': return a.kind === 'active' && (a.cooldown || 0) >= LONG_COOLDOWN;
    case 'book': return !!r.attack && !a.requiresWeapon && !a.special;
    case 'legion': return !!r.summoning;
    case 'eye': return !!r.aoe;
    case 'songs': return !!r.healing;
    case 'silence': return !!r.support;
    case 'throne': return !!r.attack && !!(a.requiresWeapon || a.special);
    default: return false;
  }
}

/** What each blessing offers a socket's pool. `atoms` are the composer's leads
 *  (the essence's levers decide whether it can supply one), `keys` the ability
 *  category rows. The pool is only the OFFER; the pull decides the choice. */
export const BLESSING_SEATS = {
  reaper:  { pkeys: ['virulence_poison', 'virulence_bleed', 'virulence_curse', 'virulence_burn', 'virulence_all'], atoms: ['dot', 'debuff'], keys: ['ranged_dot', 'aoe_dot_ring', 'corpse_miasma', 'virulence_poison', 'virulence_bleed', 'virulence_curse', 'virulence_burn'] },
  phoenix: { pkeys: ['movement_passive', 'water_walk'], atoms: ['move'], keys: ['movement_dash', 'movement_teleport', 'movement_haste_active', 'movement_passive'] },
  builder: { pkeys: ['reflect_damage', 'self_passive_ward_aura'], atoms: ['taunt', 'shield'], keys: ['taunt_pull', 'barrier_block', 'self_active_absorb', 'self_active_armor', 'reflect_spell', 'thorns_active'] },
  moments: { atoms: ['control', 'summon_minion', 'buff'], keys: ['self_active_damage', 'self_active_crit', 'self_active_immunity', 'self_active_timefreeze', 'summon_creature', 'ranged_aoe', 'self_active_aoe'] },
  book:    { atoms: ['impact', 'dot', 'explode'], keys: ['ranged_damage', 'ranged_distant', 'ranged_aoe', 'ranged_cone', 'ranged_volley'] },
  legion:  { pkeys: ['summon_bonded'], atoms: ['summon_minion', 'summon_trap', 'summon_terrain'], keys: ['summon_creature', 'summon_turret', 'summon_trap', 'raise_dead'] },
  eye:     { atoms: ['explode'], keys: ['ranged_aoe', 'aoe_dot_ring', 'ranged_cone', 'self_active_aoe', 'aoe_weaken', 'aoe_heal_pulse', 'bloom_field', 'party_buff'] },
  songs:   { pkeys: ['self_passive_heal', 'triggered_regen_on_hit'], atoms: ['heal', 'hot'], keys: ['self_active_heal', 'self_active_hot', 'aoe_heal_pulse', 'bloom_field'] },
  silence: { pkeys: ['attr_boost', 'passive_conditional'], atoms: ['buff', 'dispel', 'cleanse'], keys: ['party_buff', 'buff_dodge', 'buff_cast_speed', 'cleanse_mass', 'dispel_one', 'reach_buff'] },
  throne:  { atoms: ['impact', 'imbue'], keys: ['martial_sunder', 'imbue_strike', 'martial_distance'] },
};
/** The share of a blessed kit's sockets whose pool carries one blessing offer. */
export const BLESSING_SEAT_ODDS = 0.9;

/** How much a favoured candidate is worth in the socket scorer. Tuned so a
 *  favoured kind turns up about three times as often as unblessed
 *  (tools/kit_mix308.mjs). */
export const BLESSING_PULL = 150;
export function blessingPull(id, a, dealsFn) {
  return blessingFavours(id, a, dealsFn) ? BLESSING_PULL : 0;
}

/** The pull toward the baseline: a candidate whose bucket the kit has not yet
 *  filled is worth this much. */
export const BASELINE_PULL = 45;
export function baselinePull(a, tally, dealsFn, categoryOf) {
  if (!tally) return 0;
  const b = baselineBucket(a, dealsFn, categoryOf);
  if (b === 'other' || b === 'passive' || b === 'aura' || b === 'perception') return 0;
  // The buckets the generator does not already guarantee a seat for are pulled harder.
  const w = (b === 'selfheal' || b === 'movement') ? BASELINE_PULL * 2.5 : BASELINE_PULL;
  return (tally[b] || 0) < BASELINE_KIT[b] ? w : 0;
}
