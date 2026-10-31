// ============================================================================
// ROUND 376 -- KIT ARCHETYPES, AND AFFLICTIONS AS AN IDENTITY RATHER THAN A SEASONING.
//
//   "Across all kits I see an overuse of afflictions and bonuses for afflictions ... I haven't rolled a character
//    yet that didn't have an ability that did damage based on the number of afflictions on the target. Having a few
//    afflictions in a kit makes sense, but every single kit having affliction synergy is lazy."
//
//   "A special attacker should look like Humphrey. A spell caster should look something like Clive. An evasion tank
//    like Sophie. A healer like Neil. Affliction skirmisher like Jason -- melee afflictions, escalating single target
//    damage, movement, healing. Jack of all trades like Belinda. AOE direct damage specialist like Zara. Affliction
//    caster -- spell based dots, few defensives, movement abilities and healing and more wide area attacks."
//
// Measured before this round (150 random kits, no blessing): an affliction PAYOFF (damage per affliction, crits
// the afflicted, consume / spread afflictions, affliction shards, "against a target already suffering one of your
// afflictions", triggers on afflicting) was on 19% of all abilities and in 148 of 150 kits. The commonest single
// source was the strike ladder's iron rung "a hit that lands on something already afflicted crits", rolled for one
// damaging ability in three whatever the kit was.
//
// THE RULE NOW. A kit is given an ARCHETYPE when it is built (`archetypeFor`): from the Astral Blessing if the
// player chose one that names a shape (The Sundered Throne is a special attacker, The Celestial Book a spell caster,
// The Seeker of Songs a healer, The All Devouring Eye an area specialist, The World Phoenix an evasion tank, The
// Reaper an affliction kit), otherwise from the essences and the confluence class. Then:
//   * AFFLICTION PAYOFFS appear only in the two affliction archetypes (and a Reaper kit). Everywhere else they are
//     not offered: the scaling pass picks another condition, the rank ladders skip their affliction rungs, the attack
//     roles take their other options, the synergy gates skip "on the afflicted", the shards resource is not chosen,
//     and a hand-authored fusion that carries one gives way to one of the pair's others.
//   * AFFLICTIONS THEMSELVES (named conditions laid by an attack) are rolled at the archetype's own rate: freely in
//     an affliction kit, sparingly in a direct-damage one. "A few afflictions in a kit makes sense."
//   * THE ARCHETYPE PULLS. Each one wants some kinds of ability (up to a count) and turns away from others; that
//     pull joins the socket scorer beside the class and blessing pulls, its own seat offers the kinds it wants, and
//     among a pair's fusions the one that fits the archetype is taken.
// ============================================================================
import { abilityRoles } from './buildClasses.js';
import { isSpecialAttack } from './strikes.js';

export const ARCHETYPES = {
  special: {
    name: 'Special attacker', like: 'Humphrey', afflictions: false, debuffRate: 0.12,
    blurb: 'weapon special attacks that hit hard, a charge, battle buffs and some armour',
    want: { special: 7, single: 5, burst: 3, buff: 2, movement: 1, defensive: 2 },
    avoid: { dot: -150, spell: -80, payoff: -400 },
  },
  spell: {
    name: 'Spell caster', like: 'Clive', afflictions: false, debuffRate: 0.15,
    blurb: 'spells -- bolts, beams, blasts -- with shields and utility around them',
    want: { spell: 8, ranged: 6, aoe: 2, shield: 2, support: 1, movement: 1 },
    avoid: { special: -100, melee: -70, dot: -80, payoff: -400 },
  },
  evasion: {
    name: 'Evasion tank', like: 'Sophie', afflictions: false, debuffRate: 0.18,
    blurb: 'dodging, moving, countering and quick strikes rather than armour',
    want: { evasion: 3, movement: 3, counter: 2, melee: 4, single: 3, taunt: 1 },
    avoid: { dot: -60, summoning: -60, payoff: -400, ranged: -30 },
  },
  healer: {
    name: 'Healer', like: 'Neil', afflictions: false, debuffRate: 0.12,
    blurb: 'heals, heals over time, shields on others, cleansing and party support',
    want: { healing: 6, hot: 2, shield: 3, support: 3, defensive: 1 },
    avoid: { dot: -50, payoff: -400 },
  },
  afflictionSkirmisher: {
    name: 'Affliction skirmisher', like: 'Jason', afflictions: true, debuffRate: 0.6,
    blurb: 'melee afflictions, single-target damage that climbs with what is on the target, movement and self-healing',
    want: { dot: 4, payoff: 4, melee: 4, single: 4, movement: 2, selfheal: 2, debuff: 2 },
    avoid: { ranged: -40, summoning: -40 },
  },
  jack: {
    name: 'Jack of all trades', like: 'Belinda', afflictions: false, debuffRate: 0.3,
    blurb: 'a little of everything: traps, tricks, buffs, debuffs, a heal, a way out',
    want: { attack: 4, trap: 2, debuff: 2, buff: 2, evasion: 1, movement: 1, healing: 1, defensive: 1, summoning: 1 },
    avoid: { payoff: -400 },
    spread: true,
  },
  aoe: {
    name: 'Area direct damage', like: 'Zara', afflictions: false, debuffRate: 0.12,
    blurb: 'blasts, novas, cones and bursts that hit everything at once, now',
    want: { aoe: 7, direct: 7, burst: 2, movement: 1 },
    avoid: { dot: -150, single: -30, payoff: -400 },
  },
  afflictionCaster: {
    name: 'Affliction caster', like: '', afflictions: true, debuffRate: 0.6,
    blurb: 'spell damage over time, wide areas, movement and healing, few defences',
    want: { dot: 5, spell: 4, aoe: 3, payoff: 3, movement: 2, healing: 2 },
    avoid: { defensive: -50, special: -70, melee: -40 },
  },
};
export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);
export const AFFLICTION_ARCHETYPES = ['afflictionSkirmisher', 'afflictionCaster'];

/** What each archetype offers a socket's pool, in the blessing seats' format (outworlder.js BLESSING_SEATS). */
export const ARCHETYPE_SEATS = {
  special: { atoms: ['impact'], keys: ['martial_sunder', 'martial_distance', 'self_active_crit', 'self_active_damage', 'movement_dash'], pkeys: ['weapon_might', 'triggered_crit_empower'] },
  spell: { atoms: ['impact', 'explode'], keys: ['ranged_damage', 'ranged_distant', 'ranged_volley', 'ranged_aoe', 'barrier_block', 'buff_cast_speed'], pkeys: ['cooldown_passive', 'passive_element_pierce'] },
  evasion: { atoms: ['move', 'stealth'], keys: ['buff_dodge', 'movement_dash', 'movement_teleport', 'reflect_damage', 'thorns_active', 'stealth_veil', 'taunt_pull'], pkeys: ['movement_passive', 'reflect_damage'] },
  healer: { atoms: ['heal', 'hot', 'shield', 'cleanse'], keys: ['self_active_heal', 'aoe_heal_pulse', 'bloom_field', 'self_active_hot', 'cleanse_one', 'cleanse_mass', 'buff_healing_received'], pkeys: ['self_passive_heal', 'triggered_regen_on_hit'] },
  afflictionSkirmisher: { atoms: ['dot', 'drain', 'imbue', 'move'], keys: ['imbue_strike', 'martial_reaper', 'ranged_leech', 'movement_dash', 'virulence_bleed', 'virulence_poison'], pkeys: ['virulence_all', 'triggered_reactive'] },
  jack: { atoms: ['summon_trap', 'stealth', 'buff', 'debuff', 'move'], keys: ['summon_trap', 'stealth_veil', 'confuse_turn', 'aoe_weaken', 'party_buff', 'movement_teleport', 'fate_reroll', 'reflect_debuff'], pkeys: ['attr_boost', 'passive_conditional'] },
  aoe: { atoms: ['explode', 'impact'], keys: ['ranged_aoe', 'ranged_cone', 'self_active_aoe', 'corpse_blast', 'ranged_volley'], pkeys: ['self_passive_aoe'] },
  afflictionCaster: { atoms: ['dot', 'rot', 'explode', 'move', 'heal'], keys: ['ranged_dot', 'aoe_dot_ring', 'corpse_miasma', 'virulence_curse', 'movement_teleport', 'self_active_hot'], pkeys: ['virulence_all', 'self_passive_weaken_aura'] },
};
export const ARCHETYPE_SEAT_OFFERS = 2;

// ROUND 382 -- "evasion tanks get a taunt in only 1 of 30 kits and healers a cleanse in 4 of 30": an offer is not a
// guarantee. What an archetype is not that archetype without, each with the categories that make one and the test
// that recognises one already held. awakening.js reserves an active socket for each one the kit still owes.
const quickMeleeStrike = (a, dealsFn) => {
  if (!a || a.kind !== 'active' || !(dealsFn ? dealsFn(a) : a.base > 0)) return false;
  const t = archTags(a, dealsFn);
  // melee, or a weapon blow where the kit's weapon is a bow (a Bow evasion tank's quick strike is a quick shot)
  return t.has('attack') && (t.has('melee') || t.has('special')) && !t.has('aoe') && (a.cooldown || 0) <= 3;
};
export const ARCHETYPE_MUSTS = {
  evasion: [
    { id: 'taunt', keys: ['taunt_pull'], test: (a) => !!a && a.template === 'tauntPull' },
    { id: 'quickStrike', keys: ['martial_sunder'], test: quickMeleeStrike },
  ],
  healer: [
    { id: 'cleanse', keys: ['cleanse_one', 'cleanse_mass'],
      test: (a) => !!a && a.kind === 'active' && (a.template === 'cleanse' || (Array.isArray(a.cleanseTags) && a.cleanseTags.length > 0)) },
  ],
};
/** ROUND 382 -- the must-haves this archetype's kit does not hold yet. */
export function archetypeMustsOwed(arch, list, dealsFn) {
  return (ARCHETYPE_MUSTS[arch] || []).filter(m => !(list || []).some(a => m.test(a, dealsFn)));
}
export { quickMeleeStrike };

// ROUND 383 -- "Taunts and cleanses can now come from essences that wouldn't normally give them, like a taunt named
// 'Soft Spores'... Not every single kit needs them, having them built is... okay but the use case should be exceedingly
// rare." The owed seat (awakening.js, ROUND 382) used to let a taunt / cleanse past ANY essence's lever gate, so 35 of
// 40 Phoenix kits took a taunt from an essence with no taunt in it. Now a must-have whose category is lever-gated
// (the taunt: `taunt`; the cleanse: `mend`) is still owed and still offered on its own seat, but only an essence (or
// stone) that earns the lever can fill it -- except in the rare kit that wins this seeded roll. The quick strike has no
// lever gate, so it is untouched.
export const ARCH_MUST_BYPASS_PCT = 3;
const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
/** ROUND 383 -- does this kit win the rare roll that lets a must-have pass an essence's lever gate (~3% of kits). */
export function archMustBypassFor(charSeed, essenceIds) {
  return (fnv(`${charSeed || ''}|${(essenceIds || []).join(',')}|archMustBypass`) % 100) < ARCH_MUST_BYPASS_PCT;
}

/** The blessings that name a shape. The Reaper's depends on the kit's reach. Builder, Legion, Keeper of Moments,
 *  Word in the Silence and the Nameless leave it to the essences. */
export const BLESSING_ARCHETYPE = {
  throne: 'special', book: 'spell', songs: 'healer', eye: 'aoe', phoenix: 'evasion', reaper: 'affliction',
};

/** Essences whose nature is affliction: a lead lever of `linger`, a death / blood / serpent family, or Sin. */
const AFF_FAMILIES = new Set(['serpent', 'death', 'blood']);
const AFF_ESSENCES = new Set(['essSin', 'essDark']);
export function afflictionNatured(essDef, motif) {
  if (!essDef) return false;
  if (AFF_ESSENCES.has(essDef.id) || AFF_FAMILIES.has(essDef.family)) return true;
  return !!(motif && motif.levers && motif.levers[0] === 'linger');
}

/**
 * Which archetype a kit is. `essDefs` the bonded essences, `motifs` their ESSENCE_MOTIFS rows, `kitClass` the
 * confluence class (null before one forms), `identity` dps / tank / healing / support (buildClasses kitIdentityFor),
 * `lean` the summed melee(+)/ranged(-) lean of the essences, `weaponed` whether the kit has a weapon.
 */
export function archetypeFor({ blessing = null, essDefs = [], motifs = [], kitClass = null, identity = 'dps', lean = 0, weaponed = false } = {}) {
  const affCount = essDefs.filter((e, i) => afflictionNatured(e, motifs[i])).length;
  const affPick = () => (lean > 0 || weaponed ? 'afflictionSkirmisher' : 'afflictionCaster');
  const b = BLESSING_ARCHETYPE[blessing];
  if (b) return b === 'affliction' ? affPick() : b;
  if (identity === 'healing') return 'healer';
  if (identity === 'support') return 'jack';
  const dotClass = !!(kitClass && (kitClass.secondary || []).includes('dot'));
  if (affCount >= 2 || (affCount >= 1 && dotClass)) return affPick();
  if (identity === 'tank') {
    const nimble = motifs.some(m => m && m.levers && ['swift', 'shift', 'stealth'].includes(m.levers[0]));
    return nimble ? 'evasion' : null;   // an armoured tank keeps the guardian shape the class already gives it
  }
  const aoeClass = !!(kitClass && (kitClass.tertiary || []).includes('aoe'));
  if (aoeClass && lean <= 0) return 'aoe';
  if (weaponed || lean > 0) return 'special';
  return 'spell';
}

/** Does the kit allow affliction payoffs at all. */
export function archetypeAllowsAfflictions(arch, blessing, essDefs = [], motifs = []) {
  if (blessing === 'reaper') return true;
  if (arch) return !!(ARCHETYPES[arch] && ARCHETYPES[arch].afflictions);
  // no archetype (an armoured tank, a summoner, a support kit with no shape): only if the essences are about it
  return essDefs.filter((e, i) => afflictionNatured(e, motifs[i])).length >= 2;
}

/** The rate an attack rolls a named affliction (awakening.js DEBUFF_ROLL_RATE is 0.4). */
export function archetypeDebuffRate(arch, allowsAfflictions) {
  if (arch && ARCHETYPES[arch]) return ARCHETYPES[arch].debuffRate;
  return allowsAfflictions ? 0.4 : 0.22;
}

// ---------------------------------------------------------------------------- what an ability IS, for the pull
const PAYOFF_TEXT = /(carr(?:y|ies|ying)\s+(?:one of\s+)?your afflictions|per affliction|each affliction|every affliction|your afflictions|already afflicted|already suffering|afflictions? (?:already )?(?:on|eating) (?:the target|them)|each time you afflict|afflictions you laid|a condition you laid)/i;

/** An ability that rewards afflictions: the thing that is now kept to affliction kits. */
export function hasAfflictionPayoff(a) {
  if (!a) return false;
  if (a.scaleOn === 'targetAfflictions' || a.critOnAfflicted || a.consumeAffliction || a.consumeAfflictionsPer
    || a.spreadAfflictions || a.template === 'stackStrike' || a.synergyGate === 'onAfflicted') return true;
  if (/^virulence/.test(String(a.catKey || a.category || ''))) return true;
  const trig = a.trigger && (a.trigger.on || a.trigger.event);
  if (trig === 'inflictCondition' || trig === 'conditionExpired') return true;
  if (a.cond === 'vsDebuffed' || a.condition === 'vsDebuffed' || (a.conditional && a.conditional.cond === 'vsDebuffed')) return true;
  return PAYOFF_TEXT.test(String(a.desc || ''));
}

/** The tags the archetypes speak in. */
export function archTags(a, dealsFn) {
  const r = abilityRoles(a, dealsFn);
  const t = new Set();
  for (const [k, v] of Object.entries(r)) if (v) t.add(k);
  const json = JSON.stringify(a).toLowerCase();
  if (r.attack) {
    // ROUND 378 -- the game's own definition (strikes.js), which the card prints: a weapon it asks for, the `special`
    // mark, OR a stamina cost. "Wood Thicken", a stamina-paid heavy blow, was counted here as a spell, so a Celestial
    // Book kit was steered toward it as one and the review page called it a Spell.
    t.add((a.requiresWeapon || a.special || isSpecialAttack(a)) ? 'special' : 'spell');
    if (!r.aoe) t.add('single');
    if (!r.dot) t.add('direct');
  }
  if (/dodge|evasion|evade/.test(json) || a.template === 'stealthVeil') t.add('evasion');
  if (a.template === 'thornsBuff' || /reflect|thorns|riposte|counter/.test(String(a.catKey || a.category || a.template || ''))) t.add('counter');
  if (a.template === 'tauntPull') t.add('taunt');
  if (a.leech || a.template === 'selfHeal' || a.template === 'selfHot' || a.healScope === 'self') t.add('selfheal');
  if (r.terrain || a.summonKind === 'trap' || a.template === 'summonTrap') t.add('trap');
  if (hasAfflictionPayoff(a)) t.add('payoff');
  return t;
}

/** Counts of each tag in a kit. */
export function archTally(list, dealsFn) {
  const out = {};
  for (const a of (list || [])) if (a) for (const t of archTags(a, dealsFn)) out[t] = (out[t] || 0) + 1;
  return out;
}

/** What a candidate is worth to the archetype, given what the kit holds. */
export const ARCH_WANT_PULL = 140;
export const ARCH_WANT_FULL = 25;
export function archetypePull(arch, a, tally, dealsFn) {
  const A = ARCHETYPES[arch];
  if (!A || !a) return 0;
  const tags = archTags(a, dealsFn);
  let p = 0;
  for (const [tag, n] of Object.entries(A.want)) {
    if (!tags.has(tag)) continue;
    const have = (tally && tally[tag]) || 0;
    // a jack of all trades wants the first of everything most
    p += have < n ? (A.spread && have > 0 ? ARCH_WANT_PULL / 2 : ARCH_WANT_PULL) : ARCH_WANT_FULL;
  }
  for (const [tag, w] of Object.entries(A.avoid)) if (tags.has(tag)) p += w;
  return p;
}

/** A self-check for the tests. */
export function archetypeFaults(categoryKeys) {
  const out = [];
  for (const [id, A] of Object.entries(ARCHETYPES)) {
    if (!A.name || !A.want || !A.avoid || typeof A.debuffRate !== 'number') out.push(`${id}: incomplete`);
    const seat = ARCHETYPE_SEATS[id];
    if (!seat) { out.push(`${id}: no seat`); continue; }
    if (categoryKeys) for (const k of [...(seat.keys || []), ...(seat.pkeys || [])]) if (!categoryKeys.includes(k)) out.push(`${id}: seat key ${k} unknown`);
    if (!A.afflictions && (A.want.payoff || 0) > 0) out.push(`${id}: wants payoffs it may not have`);
  }
  return out;
}
