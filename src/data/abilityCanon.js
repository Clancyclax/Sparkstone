// ===========================================================================
// ROUND 201 -- THE CANON LAYER: WHAT THE BOOKS CAN SAY THAT WE COULD NOT.
//
// Ten abilities transcribed from HWFWM canon (nine in round 200, plus
// [Castigate] this round) were read against our own cards in
// docs/ABILITY_CANON_GAP.md. The finding there was that the FORMAT was already
// right and the MODEL was the thing that could not speak: five cost/cooldown
// rhythms we had no way to express, a self-transformation archetype that is
// three of the ten, a targeting exclusion ("an ally and not yourself") that had
// no word, and a handful of tags with no derivation behind them.
//
// This module is that missing vocabulary, and it is a DATA module with no
// imports from the scene on purpose: every rule here is a pure function over a
// spec, so a suite can ask "what would the card say" without a browser, a
// world, or a fight. It is the same reason advancement.js is a data module.
//
// WHAT IS DELIBERATELY NOT HERE. The essence/awakening architecture is not
// touched -- nothing in this file generates an ability, picks a socket, or
// decides what a stone grants. It describes SHAPES that a generated ability may
// declare, and the generator opts in by setting a field.
// ===========================================================================

// ===========================================================================
// 1. TIME -- CANON HOURS, PLAYED AT SIX TO ONE.
//
// The user's ruling, given with the reason:
//
//   "1 hour cooldown should become 10 minutes IRL, 6 hour cooldown should
//    become 60 minutes IRL. An 24 hour cooldown should become 4 hours. This
//    lets the player still feel like they have to use a resource without
//    slowing down the actual gameplay too much."
//
// Three worked examples, and all three are the same ratio: 60/10, 360/60,
// 1440/240. So this is ONE divisor rather than a lookup table, and the table
// would have been the worse answer -- a fourth canon figure (Deny the Reaper's
// is written in days in one printing) would have had no row and would have
// fallen through to "unchanged", which is the silent-wrong-answer shape this
// project keeps finding.
//
// THE CANON FIGURE IS KEPT, not overwritten. `canonCooldownHours` stays on the
// spec so the card, a tooltip or a lore screen can still say what the book
// said, and `cooldown` -- the only field the runtime reads -- is the played
// number. An ability that stored only the divided figure could never be
// checked against its source again.
// ===========================================================================

/** Canon hours run six times faster in play. One number, three worked
 *  examples, and `abilityCanonFaults` asserts all three. */
export const CANON_HOUR_DIVISOR = 6;

/** A canon cooldown written in hours, as seconds of play. */
export function canonHours(hours) {
  return Math.round((Number(hours) || 0) * 3600 / CANON_HOUR_DIVISOR);
}

/** The reverse, for a card that wants to quote the book. */
export function playedToCanonHours(seconds) {
  return Math.round((Number(seconds) || 0) * CANON_HOUR_DIVISOR / 3600 * 100) / 100;
}

/**
 * Stamp a spec authored in canon hours. Sets the played `cooldown` and keeps
 * the canon figure beside it. Returns the spec so it can be used inline.
 */
export function withCanonCooldown(spec, hours) {
  spec.canonCooldownHours = hours;
  spec.cooldown = canonHours(hours);
  return spec;
}

// ===========================================================================
// 2. COOLDOWN AND COST BANDS -- INCLUDING THE THREE THE CARD COULD NOT PRINT.
//
// `cooldownWord` in abilityCard.js topped out at minutes, so a six-hour canon
// cooldown printed as "360 minutes". It also had no case for a cooldown of
// zero (canon writes "Cooldown: None." on [Castigate] and [Karmic Warrior])
// and none for one computed at use ("Cooldown: Varies." on [Blessing of
// Readiness], whose cooldown is the time it just removed from someone else's).
//
// WHERE THE HOURS BAND STARTS is a real decision and not an obvious one. The
// user phrased their own compression as "6 hour cooldown should become 60
// minutes", so the played figure they have in mind for that ability is sixty
// MINUTES, and a band that started at 3600s would print "1 hour" and quietly
// disagree with the sentence that specified it. So hours begin at ninety
// minutes: 3600s reads "60 minutes", 14400s reads "4 hours", and both match
// the words the rule was written in.
// ===========================================================================

/** A cooldown computed at use. Assign it to `spec.cooldown` in place of a
 *  number; the runtime asks `resolveVariesCooldown` for the real figure. */
export const COOLDOWN_VARIES = 'varies';

/** Below this many seconds a cooldown is phrased in minutes, at or above it in
 *  hours. Ninety minutes -- see the note above. */
export const HOURS_BAND_START = 5400;
/** Below this many seconds a cooldown is phrased in seconds. */
export const MINUTES_BAND_START = 120;

/** The books' phrasing for any cooldown, including None, Varies and hours. */
export function cooldownPhrase(cd) {
  if (cd === COOLDOWN_VARIES) return 'Varies.';
  if (cd == null || typeof cd !== 'number' || !isFinite(cd)) return null;
  if (cd <= 0) return 'None.';
  if (cd >= HOURS_BAND_START) {
    const h = Math.round(cd / 360) / 10;
    return `${h % 1 === 0 ? h : h.toFixed(1)} hour${h === 1 ? '' : 's'}.`;
  }
  if (cd >= MINUTES_BAND_START) {
    const m = Math.round(cd / 60);
    return `${m} minute${m === 1 ? '' : 's'}.`;
  }
  return `${Math.round(cd * 10) / 10} seconds.`;
}

/**
 * [Blessing of Readiness]: "Cooldown: Varies." -- its cooldown is the amount of
 * cooldown it removed from the ally it was cast on. A spec declares
 * `variesCooldown` as a rule name; this resolves it against the context the
 * runtime hands in. A rule with no entry returns the spec's `cooldownFloor`,
 * which is how an unknown rule degrades to something finite rather than to
 * zero.
 */
export const VARIES_RULES = {
  /** Equal to the time removed from the target. */
  reciprocal: (ctx) => Math.max(0, ctx.removed || 0),
  // ROUND 203 -- there was a third rule here, `mirrorRemaining`: "equal to the
  // remaining duration of what it copied". It is deleted rather than kept,
  // because round 201 wrote it against a copy-a-buff template the game does
  // not have, and nothing in the generator could ever stamp it. A rule with no
  // writer and no reader is round 134's fault in its purest form -- the file
  // describes a mechanic, the game does not have it, and the description is
  // what a reader trusts. If a mimic template ever lands, it comes back with
  // a caller.
  /** Equal to how long the effect it granted lasts. */
  durationOfGrant: (ctx) => Math.max(0, ctx.duration || 0),
};

export function resolveVariesCooldown(spec, ctx = {}) {
  const floor = Math.max(0, spec.cooldownFloor || 0);
  const rule = VARIES_RULES[spec.variesCooldown];
  if (!rule) return floor;
  return Math.max(floor, rule(ctx));
}

// ===========================================================================
// 3. PER-SECOND DRAIN OF TWO POOLS.
//
// [Eternal Moment]: "Cost: Very high mana and stamina, per second." Our
// `spec.cost` is one {type, amount} charged once at cast, which cannot say
// either half of that -- not two pools, and not per second.
//
// A spec declares `drain: [{type, perSec}, ...]` and keeps `cost` for the
// entry price. Both are honoured; an ability may have one, the other, or both.
// The drain ENDS THE ABILITY when a pool cannot pay, which is the mechanic
// rather than a safety check: an ability you can hold only as long as you can
// afford it is the thing the canon line describes.
// ===========================================================================

/** The pools a drain may name. Health is included: a drain that eats health is
 *  a real HWFWM shape and the wounding path already answers it. */
export const DRAIN_POOLS = ['mana', 'stamina', 'health'];

/** One second of drain, as {pool: amount}. Pure -- the caller spends it. */
export function drainTick(spec, seconds = 1) {
  const out = {};
  for (const d of (spec.drain || [])) {
    if (!DRAIN_POOLS.includes(d.type)) continue;
    out[d.type] = (out[d.type] || 0) + (d.perSec || 0) * seconds;
  }
  return out;
}

/** Can `pools` (a {mana, stamina, health} snapshot) pay one tick? */
export function canPayDrain(spec, pools, seconds = 1) {
  const tick = drainTick(spec, seconds);
  for (const [k, v] of Object.entries(tick)) {
    if ((pools[k] || 0) < v) return false;
  }
  return true;
}

/** The cost band word, shared with the card. Split out of abilityCard so the
 *  drain line and the entry line use one vocabulary. */
export const COST_BANDS = [
  { max: 4, word: 'Very low' }, { max: 9, word: 'Low' }, { max: 18, word: 'Moderate' },
  { max: 32, word: 'High' }, { max: Infinity, word: 'Very high' },
];
export function costBand(n) {
  for (const b of COST_BANDS) if (n <= b.max) return b.word;
  return 'Very high';
}

/** "Very high mana and stamina, per second." */
export function drainPhrase(spec) {
  const d = (spec.drain || []).filter(x => DRAIN_POOLS.includes(x.type));
  if (!d.length) return null;
  const band = costBand(Math.max(...d.map(x => x.perSec || 0)));
  const pools = d.map(x => x.type);
  const joined = pools.length === 1 ? pools[0]
    : `${pools.slice(0, -1).join(', ')} and ${pools[pools.length - 1]}`;
  return `${band} ${joined}, per second.`;
}

// ===========================================================================
// 4. THE SELF-TRANSFORMATION TEMPLATE.
//
// Three of the ten canon abilities -- [Specious Sorcerer], [Counterfeit
// Combatant], [Instant Adept] -- are ONE ability with three swaps. Each:
//
//   * grants a significant increase to ONE attribute,
//   * grants the PROFICIENCY to use a class of equipment,
//   * raises the MAXIMUM of one pool,
//   * adds an ongoing RECOVERY of that pool,
//   * for a duration, on an hours-scale cooldown.
//
// That is a strong signal and it is why this is a row with three swaps rather
// than three features. It also brings in PROFICIENCY, which the game had only
// in the negative: `requiresWeapon` gates an ability on a weapon being in hand,
// and nothing anywhere ever GRANTED the ability to use one.
// ===========================================================================

// ROUND 202 -- THE PROFICIENCY TABLE MOVED, AND ITS CONTENTS CHANGED.
//
// Round 201 invented four proficiencies (magicalTools, martialWeapons,
// heavyArmour, ritualTools) because canon named "magical tools" and nothing
// said what the rest of the set was. The user has now set it: five, named
// after what they cover -- magical tools, blade, power, polearm, dexterity --
// and two of round 201's four (heavyArmour, ritualTools) were guesses with no
// weapon behind them. They are deleted rather than kept beside the real ones,
// because a proficiency nothing can grant and no weapon requires is the
// "written by one side, read by none" fault in its purest form.
//
// proficiencies.js owns the table now; this file re-exports it so nothing that
// imported it from here has to move.
import { PROFICIENCIES, PROFICIENCY_KEYS } from './proficiencies.js';
export { PROFICIENCIES, PROFICIENCY_KEYS };

/** The three canon rows, as the swaps. `attr` is the attribute raised, `pool`
 *  the one whose maximum grows and which then recovers, `prof` what it lets
 *  you use. Named after the books so the source of each is readable. */
export const TRANSFORMATIONS = {
  // ROUND 202 -- re-pointed at the user's five. Canon gives Specious Sorcerer
  // "magical tools" by name, so that one is unchanged; Counterfeit Combatant's
  // "martial weapons" is the whole armed half of the taxonomy and `power` is
  // the heavy end of it, which is what a Charlatan pretending to be a warrior
  // is pretending to be; Instant Adept's was `ritualTools`, a round-201
  // invention with no weapon behind it, and `blade` is what a borrowed
  // competence most plausibly borrows.
  // ROUND 204 (item 2.8.1) -- WHAT A COUNTERFEIT COMBATANT COUNTERFEITS.
  //
  // The user, on a spear kit that was handed this: "This kit has a spear
  // essence it doesn't need the ability to use heavy arms."
  //
  // Round 202 narrowed canon's "martial weapons" to `power` alone, on the
  // reading that power is "the heavy end of the taxonomy". That was the wrong
  // trade: it made the clause redundant on exactly the builds most likely to
  // roll it -- a weapon kit already holds one martial proficiency and now
  // gains a second it has no weapon for -- and it made the ability smaller
  // than the book. Canon says martial weapons, plural and unqualified, so it
  // is all four of them: on a caster that is the whole fantasy of the
  // ability, and on a spear kit it is three proficiencies it did not have.
  //
  // `profs` is a list because the answer is a list. One field, so no reader
  // has to know that two of the three rows happen to name only one.
  speciousSorcerer: { label: 'Specious Sorcerer', attr: 'spirit', pool: 'mana', profs: ['magicalTools'] },
  counterfeitCombatant: { label: 'Counterfeit Combatant', attr: 'power', pool: 'stamina', profs: ['blade', 'power', 'polearm', 'dexterity'] },
  instantAdept: { label: 'Instant Adept', attr: 'recovery', pool: 'health', profs: ['blade'] },
};
export const TRANSFORMATION_KEYS = Object.keys(TRANSFORMATIONS);

/** The rank-by-rank strength of a transformation. A "significant increase" is
 *  the band the books use for the largest attribute grant an ability gives, so
 *  it starts where `attrBoost`'s single point ends and climbs from there. */
// ROUND 203 -- THE FIGURES ARE THE ONES THE GAME CAN ACTUALLY DELIVER.
//
// The first cut ran 3 / 5 / 8 / 12, reasoning from "significant increase" and
// nothing else. Attributes in this game run 0..6 (inventory.js: ATTR_SOFT_CAP
// 4, ATTR_HARD_CAP 6, the user's own "as high as 6"), and `computeAttrTotal`
// clamps the total at the ceiling -- so +8 and +12 measured IDENTICALLY to
// +6 on a live character. The card printed twelve and the player received
// six: an ability whose stated effect and real effect disagree, which is the
// thing this project checks for above almost anything else.
//
// So the ladder now ends AT the hard cap. Gold makes a character with no
// spirit at all into a 6 -- the ceiling of what anyone may permanently be,
// held for ninety seconds on an hour's cooldown, which is the books' conceit
// exactly: you are briefly the sorcerer you are pretending to be, and you
// cannot pretend to be better than the best. The runtime raises the CEILING
// by the same amount for the duration (WorldScene's `_applyTransform` seam),
// so a character already at the soft cap of four still gets the two points
// they were promised rather than silently nothing.
export const TRANSFORM_BY_RANK = {
  iron:   { attrAmount: 2, maxPoolPct: 0.20, regenPerSec: 2, duration: 30 },
  bronze: { attrAmount: 3, maxPoolPct: 0.30, regenPerSec: 3, duration: 45 },
  silver: { attrAmount: 4, maxPoolPct: 0.40, regenPerSec: 5, duration: 60 },
  gold:   { attrAmount: 6, maxPoolPct: 0.55, regenPerSec: 8, duration: 90 },
};
// `attrAmount`, not `attr`: the row names the attribute and the rank names how
// much of it, and spreading one over the other with the same key is how the
// first draft of this silently turned [Spirit] into [3].

/** The whole state of a transformation at a rank -- not a delta. The card
 *  diffs consecutive ranks itself, exactly as it does for perceptions and
 *  auras, so a clause appears once at the rank that brought it. */
export function transformAtRank(key, rank = 'iron') {
  const row = TRANSFORMATIONS[key];
  const by = TRANSFORM_BY_RANK[rank];
  if (!row || !by) return null;
  return { ...row, ...by, key };
}

/** The clause list for a transformation at a rank, in the books' voice. */
export function transformEffectClauses(state) {
  if (!state) return [];
  const profs = (state.profs || []).map(k => PROFICIENCIES[k]).filter(Boolean);
  // ROUND 204 -- four proficiencies read as a list of four weapon pairs, which
  // is a sentence nobody finishes. The four martial ones together are "every
  // martial weapon", which is canon's own phrase and is shorter than any of
  // the parts.
  const MARTIAL = ['blade', 'power', 'polearm', 'dexterity'];
  const allMartial = MARTIAL.every(k => (state.profs || []).includes(k));
  const profWords = allMartial ? 'every martial weapon'
    : profs.map(p => p.short).join(', ');
  return [
    `gain a significant increase to the [${cap(state.attr)}] attribute (+${state.attrAmount})`,
    // ROUND 202 -- `short` rather than `label`: the new table's labels are
    // title-case names for a UI row ("Magical Tools") and this is the middle
    // of a sentence. Canon's own line is "gain the ability to use magical
    // tools", which is the short form exactly.
    profWords ? `gain the ability to use ${profWords}` : null,
    `your maximum ${state.pool} increases by ${Math.round(state.maxPoolPct * 100)}%`,
    `you gain an ongoing ${state.pool} recovery effect of ${state.regenPerSec} a second`,
    `lasts ${state.duration} seconds`,
  ].filter(Boolean);
}

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

// ===========================================================================
// 5. TARGETING -- A SCOPE WITH AN EXCLUSION.
//
// `HEAL_SCOPES` gave us self / ally / party, on healing only, and its 'ally'
// deliberately INCLUDES the caster ("the ally who needs it most is a
// comparison, not an exclusion" -- round 50's own note, and it is right for a
// heal). Canon needs two things that cannot be said with it:
//
//   [Blessing of Readiness]  "Can only be used on others, not yourself."
//   [Bait and Switch]        "Target an ally or yourself." -- on a non-heal.
//
// So the scope is lifted out of healing and given a third axis. `self` is
// 'only' / 'allow' / 'exclude' rather than a boolean, because all three occur.
// The three old names keep their old meanings exactly, so every existing heal
// reads the same through the new table.
// ===========================================================================

export const TARGET_SCOPES = {
  self:         { side: 'friendly', self: 'only',    count: 1 },
  ally:         { side: 'friendly', self: 'allow',   count: 1 },
  allyNotSelf:  { side: 'friendly', self: 'exclude', count: 1 },
  allyOrSelf:   { side: 'friendly', self: 'allow',   count: 1 },
  party:        { side: 'friendly', self: 'allow',   count: Infinity },
  partyNotSelf: { side: 'friendly', self: 'exclude', count: Infinity },
  enemy:        { side: 'hostile',  self: 'exclude', count: 1 },
  enemies:      { side: 'hostile',  self: 'exclude', count: Infinity },
};
export const TARGET_SCOPE_KEYS = Object.keys(TARGET_SCOPES);

/** The three heal scopes, unchanged, so nothing that reads HEAL_SCOPES has to
 *  learn the bigger table. */
export const LEGACY_HEAL_SCOPES = ['self', 'ally', 'party'];

/** May this scope land on the caster? */
export function scopeAllowsSelf(scope) {
  const s = TARGET_SCOPES[scope] || TARGET_SCOPES.self;
  return s.self !== 'exclude';
}
/** Must it land on the caster and nobody else? */
export function scopeIsSelfOnly(scope) {
  return (TARGET_SCOPES[scope] || TARGET_SCOPES.self).self === 'only';
}
export function scopeSide(scope) {
  return (TARGET_SCOPES[scope] || TARGET_SCOPES.self).side;
}

/** The clause a stats line uses. The three legacy phrasings are preserved word
 *  for word; the new scopes get the canon sentence. */
export function scopeWho(scope) {
  switch (scope) {
    case 'party': return 'to you and your team';
    case 'partyNotSelf': return 'to your team but not to you';
    case 'ally': return 'to the ally who needs it most';
    case 'allyNotSelf': return 'to an ally, never to yourself';
    case 'allyOrSelf': return 'to an ally or to yourself';
    case 'enemy': return 'to your target';
    case 'enemies': return 'to every enemy in reach';
    default: return 'to yourself';
  }
}

// ===========================================================================
// 6. REACTIVES THAT ARE ALLOWED TO BE FREE.
//
// [Karmic Warrior]: "Cooldown: None." and it fires "whenever you are affected
// by a harmful effect, even if that effect is wholly negated." Two things our
// triggers could not do. `composedTriggerFields` ended with
//
//     cooldown: trigger.cooldown || 6
//
// which turns a deliberate zero into six -- the classic `||` fault on a falsy
// legitimate value -- and every trigger kind fired on damage LANDED, so an
// attack that was absorbed, resisted or dodged reached nothing.
//
// `harmAttempted` is the new trigger kind and it is a different event from
// `hurt`: it is raised at the point harm is DIRECTED at you, before mitigation
// decides whether any of it arrives.
// ===========================================================================

/** Trigger kinds that may legitimately carry a zero internal cooldown. A
 *  trigger not on this list still floors at its authored number, so the fix to
 *  `||` cannot accidentally make every composed trigger free. */
export const FREE_TRIGGERS = ['harmAttempted', 'negatedHarm'];

/** The internal cooldown a trigger actually gets. Zero survives only for a
 *  trigger written to be free. */
export function triggerIcd(trigger, fallback = 6) {
  if (!trigger) return fallback;
  if (typeof trigger.cooldown !== 'number') return fallback;
  if (trigger.cooldown > 0) return trigger.cooldown;
  return FREE_TRIGGERS.includes(trigger.on) ? 0 : fallback;
}

// ===========================================================================
// 7. THE TAG VOCABULARY.
//
// Seven canon tags had no derivation behind them, which meant an ability could
// never carry them however it was built. Each is given a rule over the spec
// here rather than a hand-written list, for the reason this project keeps
// relearning: a hand-maintained list beside a generator is a list that drifts.
//
// `boon` and `holy` are the interesting pair -- both already existed on the
// CONDITION side (debuffs.js's TAG table has them) and simply never reached the
// ability's own tag list, so [Agent of Karma] could be tagged holy while the
// ability that grants it could not.
// ===========================================================================

export const CANON_TAG_RULES = {
  recovery: (a) => a.category === 'healing' || !!(a.healAmount || a.hot || a.healOnUse),
  healing: (a) => !!(a.healAmount || a.hot) && a.category === 'healing',
  retribution: (a) => a.template === 'thornsBuff' || !!a.retaliate,
  magic: (a) => !!(a.cost && a.cost.type === 'mana')
    || (a.drain || []).some(d => d.type === 'mana'),
  curse: (a) => !!a.debuff || a.template === 'weakenRing',
  'damage-over-time': (a) => !!a.dot,
  area: (a) => !!a.explodeRadius || /aoe|Ring|Cone|Field/i.test(a.template || ''),
  conjuration: (a) => /^summon|Summon|raiseDead/.test(a.template || ''),
  repeatable: (a) => !!a.spammable,
  stacking: (a) => !!a.stackShape,
  // --- the seven that had no source ----------------------------------------
  dimension: (a) => a.template === 'teleport' || !!a.blinkOnUse || !!a.phaseShift,
  illusion: (a) => !!a.decoy || a.template === 'stealthVeil',
  'shape-change': (a) => !!a.transform,
  boon: (a) => !!a.boon || !!(a.grantsCondition && a.grantsCondition.friendly),
  holy: (a) => HOLY_ELEMENTS.includes(a.element) || !!a.holy,
  'counter-execute': (a) => !!(a.trigger && a.reactive && a.execute),
  counter: (a) => !!(a.trigger && a.reactive) && !a.execute,
};

/** The elements the books treat as holy. `life` is here and `nature` is not:
 *  a healing vine is not a holy effect and tagging it so would make the tag
 *  mean nothing. */
export const HOLY_ELEMENTS = ['radiant', 'light', 'life'];

/** Every tag the vocabulary can produce, in the order the books list them. */
export const CANON_TAG_ORDER = [
  'recovery', 'healing', 'boon', 'holy', 'retribution', 'counter', 'counter-execute',
  'magic', 'curse', 'damage-over-time', 'area', 'conjuration', 'dimension',
  'illusion', 'shape-change', 'repeatable', 'stacking',
];

/** The tags an ability carries, derived. Element comes last, as it always did. */
export function canonTags(a) {
  const out = [];
  for (const t of CANON_TAG_ORDER) {
    const rule = CANON_TAG_RULES[t];
    if (rule && rule(a)) out.push(t);
  }
  const el = a.element && a.element !== 'physical' ? a.element : null;
  if (el && !out.includes(el)) out.push(el);
  return [...new Set(out)];
}

// ===========================================================================
// 8. FAULTS.
//
// The rule this project has settled on: a check that counts the roster is not
// a test. Every assertion below is a PROPERTY -- the three worked examples the
// user gave, the bands either side of their boundaries, the exclusion that is
// the whole point of the new scope table.
// ===========================================================================

export function abilityCanonFaults() {
  const out = [];

  // --- the user's three worked examples, exactly ---------------------------
  const want = [[1, 600], [6, 3600], [24, 14400]];
  for (const [h, s] of want) {
    if (canonHours(h) !== s) out.push(`canonHours(${h}) is ${canonHours(h)}, the ruling says ${s}`);
  }
  // ...and the words they were written in.
  if (cooldownPhrase(canonHours(1)) !== '10 minutes.') out.push(`1 canon hour prints "${cooldownPhrase(canonHours(1))}", not "10 minutes."`);
  if (cooldownPhrase(canonHours(6)) !== '60 minutes.') out.push(`6 canon hours print "${cooldownPhrase(canonHours(6))}", not "60 minutes."`);
  if (cooldownPhrase(canonHours(24)) !== '4 hours.') out.push(`24 canon hours print "${cooldownPhrase(canonHours(24))}", not "4 hours."`);

  // --- the bands the card could not reach ----------------------------------
  if (cooldownPhrase(0) !== 'None.') out.push('a zero cooldown no longer prints "None."');
  if (cooldownPhrase(COOLDOWN_VARIES) !== 'Varies.') out.push('a computed cooldown no longer prints "Varies."');
  if (cooldownPhrase(0.6) !== '0.6 seconds.') out.push('sub-second cooldowns lost their decimal');
  if (cooldownPhrase(119) !== '119 seconds.') out.push('the seconds band ends in the wrong place');
  if (cooldownPhrase(120) !== '2 minutes.') out.push('the minutes band starts in the wrong place');
  if (/minutes/.test(cooldownPhrase(HOURS_BAND_START)) ) out.push('the hours band starts in the wrong place');
  if (cooldownPhrase(null) !== null) out.push('a spec with no cooldown should print no line at all');

  // --- Varies resolves, and an unknown rule degrades to the floor ----------
  const bor = { cooldown: COOLDOWN_VARIES, variesCooldown: 'reciprocal', cooldownFloor: 5 };
  if (resolveVariesCooldown(bor, { removed: 40 }) !== 40) out.push('a reciprocal cooldown does not equal what it removed');
  if (resolveVariesCooldown(bor, { removed: 1 }) !== 5) out.push('a reciprocal cooldown ignores its floor');
  if (resolveVariesCooldown({ variesCooldown: 'nonesuch', cooldownFloor: 7 }, {}) !== 7) {
    out.push('an unknown varies rule does not fall back to the floor');
  }

  // --- the drain, both halves ----------------------------------------------
  const em = { drain: [{ type: 'mana', perSec: 40 }, { type: 'stamina', perSec: 40 }] };
  const tick = drainTick(em, 1);
  if (tick.mana !== 40 || tick.stamina !== 40) out.push('a two-pool drain does not charge both pools');
  if (canPayDrain(em, { mana: 100, stamina: 10 })) out.push('a drain claims it can be paid from an empty pool');
  if (!canPayDrain(em, { mana: 100, stamina: 100 })) out.push('a drain refuses a payment it can afford');
  if (drainPhrase(em) !== 'Very high mana and stamina, per second.') {
    out.push(`the drain line reads "${drainPhrase(em)}"`);
  }
  if (drainPhrase({}) !== null) out.push('an ability with no drain still prints a drain line');
  if (drainTick({ drain: [{ type: 'nonesuch', perSec: 99 }] }).nonesuch) {
    out.push('a drain accepts a pool that does not exist');
  }

  // --- the transformation is one row with three swaps ---------------------
  const attrs = new Set(), pools = new Set(), profs = new Set();
  for (const k of TRANSFORMATION_KEYS) {
    const t = TRANSFORMATIONS[k];
    attrs.add(t.attr); pools.add(t.pool);
    // ROUND 204 -- `profs`, a list: a Counterfeit Combatant lends all four
    // martial proficiencies, which is what canon's "martial weapons" says.
    if (!Array.isArray(t.profs) || !t.profs.length) out.push(`${k} lends no proficiency at all`);
    for (const pk of (t.profs || [])) {
      profs.add(pk);
      if (!PROFICIENCIES[pk]) out.push(`${k} grants a proficiency that does not exist: ${pk}`);
    }
    if (!DRAIN_POOLS.includes(t.pool)) out.push(`${k} raises a pool that does not exist: ${t.pool}`);
  }
  if (attrs.size !== TRANSFORMATION_KEYS.length) out.push('two transformations raise the same attribute');
  if (pools.size !== TRANSFORMATION_KEYS.length) out.push('two transformations raise the same pool');
  // ROUND 204 -- the three must not be INTERCHANGEABLE, which is what this
  // rule was really guarding: one proficiency each meant one per row. Now that
  // the Counterfeit Combatant lends all four martial proficiencies, `blade`
  // legitimately appears twice -- so the rule is stated as what it meant. No
  // two rows may lend the SAME SET; a Specious Sorcerer and an Instant Adept
  // that both handed over magical tools would be one ability with two names.
  {
    const sets = TRANSFORMATION_KEYS.map(k => (TRANSFORMATIONS[k].profs || []).slice().sort().join(','));
    if (new Set(sets).size !== sets.length) out.push('two transformations lend the same proficiencies');
  }
  // Every rank is stronger than the one below it on every axis -- if it is
  // not, a rank-up prints a clause that takes something away.
  const ranks = ['iron', 'bronze', 'silver', 'gold'];
  for (let i = 1; i < ranks.length; i++) {
    const lo = TRANSFORM_BY_RANK[ranks[i - 1]], hi = TRANSFORM_BY_RANK[ranks[i]];
    for (const f of ['attrAmount', 'maxPoolPct', 'regenPerSec', 'duration']) {
      if (!(hi[f] > lo[f])) out.push(`transformation ${f} does not grow from ${ranks[i - 1]} to ${ranks[i]}`);
    }
  }
  const clauses = transformEffectClauses(transformAtRank('speciousSorcerer', 'iron'));
  for (const need of ['Spirit', 'magical tools', 'maximum mana', 'recovery']) {
    if (!clauses.join(' ').includes(need)) out.push(`the transformation clause list no longer mentions ${need}`);
  }
  if (transformAtRank('nonesuch', 'iron')) out.push('an unknown transformation resolves to something');

  // --- the exclusion that is the whole point ------------------------------
  if (scopeAllowsSelf('allyNotSelf')) out.push('allyNotSelf allows the caster, which is the one thing it exists to forbid');
  if (!scopeAllowsSelf('allyOrSelf')) out.push('allyOrSelf excludes the caster');
  if (!scopeIsSelfOnly('self')) out.push('self is no longer self-only');
  if (scopeIsSelfOnly('ally')) out.push('ally became self-only');
  for (const s of LEGACY_HEAL_SCOPES) {
    if (!TARGET_SCOPES[s]) out.push(`the heal scope ${s} has no row in the new table`);
  }
  if (!scopeAllowsSelf('ally')) out.push("the legacy 'ally' scope changed meaning; round 50's rule was that it includes the caster");
  if (scopeSide('enemy') !== 'hostile') out.push('the enemy scope is not hostile');
  if (scopeWho('allyNotSelf') !== 'to an ally, never to yourself') out.push('the exclusion has no sentence');

  // --- free triggers, and only where they were written to be free ---------
  if (triggerIcd({ on: 'harmAttempted', cooldown: 0 }) !== 0) out.push('a trigger written to be free still floors at six seconds');
  if (triggerIcd({ on: 'strike', cooldown: 0 }) !== 6) out.push('an ordinary trigger got a free ride from the zero fix');
  if (triggerIcd({ on: 'strike', cooldown: 3 }) !== 3) out.push('an authored internal cooldown was discarded');
  if (triggerIcd(null) !== 6) out.push('a missing trigger does not fall back');

  // --- the seven tags that had no source ----------------------------------
  const cases = [
    ['dimension', { template: 'teleport' }],
    ['illusion', { decoy: true }],
    ['shape-change', { transform: 'speciousSorcerer' }],
    ['boon', { boon: true }],
    ['holy', { element: 'radiant' }],
    ['counter-execute', { trigger: { on: 'harmAttempted' }, reactive: true, execute: true }],
    ['healing', { category: 'healing', healAmount: 10 }],
  ];
  for (const [tag, spec] of cases) {
    if (!canonTags(spec).includes(tag)) out.push(`nothing can be tagged ${tag}`);
  }
  // ...and they do not appear on things that have not earned them.
  const plain = canonTags({ template: 'projectileBall', cost: { type: 'mana', amount: 8 } });
  for (const t of ['dimension', 'illusion', 'shape-change', 'boon', 'holy', 'counter-execute']) {
    if (plain.includes(t)) out.push(`a plain bolt is tagged ${t}`);
  }
  // A counter is not a counter-execute, and an execute reactive is not both.
  const ce = canonTags({ trigger: { on: 'harmAttempted' }, reactive: true, execute: true });
  if (ce.includes('counter')) out.push('a counter-execute is tagged counter as well, which reads as two effects');
  // Every tag in the order list has a rule, and every rule is in the order
  // list -- the two-hand-maintained-lists fault, checked rather than trusted.
  for (const t of CANON_TAG_ORDER) if (!CANON_TAG_RULES[t]) out.push(`${t} is listed but nothing can produce it`);
  for (const t of Object.keys(CANON_TAG_RULES)) if (!CANON_TAG_ORDER.includes(t)) out.push(`${t} can be produced but is never printed`);

  return out;
}

// ===========================================================================
// 9. THE TEN TRANSCRIPTIONS, AS SPECS.
//
// The user supplied ten abilities word for word out of the books -- nine in
// round 200 and [Castigate] in round 201. They are written out here as real
// specs, and that is the point of them: the gap document CLAIMED the model
// could not express five particular shapes, and the only way to know that it
// can now is to write the ten down and read the cards back.
//
// These are REFERENCE ROWS, not content. Nothing generates from them, no
// socket can roll one, and the essence/awakening architecture does not know
// they exist. `canonExemplarFaults` renders each one and asserts the lines the
// books print -- so if a later round breaks the hours band, the exclusion or
// the drain, the failure names the canon ability that stopped reading right
// rather than an abstraction.
// ===========================================================================

export const CANON_EXEMPLARS = {
  speciousSorcerer: {
    name: 'Specious Sorcerer', _srcName: 'Charlatan', category: 'utility',
    kind: 'active', template: 'attrBoost', transform: 'speciousSorcerer',
    cost: { type: 'mana', amount: 40 }, ...withCanonCooldown({}, 6),
    desc: 'Become, for a little while, the mage you are pretending to be.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
  },
  counterfeitCombatant: {
    name: 'Counterfeit Combatant', _srcName: 'Charlatan', category: 'utility',
    kind: 'active', template: 'attrBoost', transform: 'counterfeitCombatant',
    cost: { type: 'stamina', amount: 40 }, ...withCanonCooldown({}, 6),
    desc: 'Become, for a little while, the swordsman you are pretending to be.',
    wantCost: 'Very high stamina.', wantCooldown: '60 minutes.',
  },
  instantAdept: {
    name: 'Instant Adept', _srcName: 'Adept', category: 'utility',
    kind: 'active', template: 'attrBoost', transform: 'instantAdept',
    cost: { type: 'mana', amount: 40 }, ...withCanonCooldown({}, 6),
    desc: 'Borrow a competence you have not earned.',
    wantCost: 'Very high mana.', wantCooldown: '60 minutes.',
  },
  blessingOfReadiness: {
    name: 'Blessing of Readiness', _srcName: 'Adept', category: 'utility',
    kind: 'active', template: 'cleanse', scope: 'allyNotSelf',
    cost: { type: 'mana', amount: 16 },
    cooldown: COOLDOWN_VARIES, variesCooldown: 'reciprocal', cooldownFloor: 5,
    boon: true, element: 'light',
    desc: "Take time off an ally's cooldowns, and pay for it with your own.",
    wantCost: 'Moderate mana.', wantCooldown: 'Varies.', wantTags: ['boon', 'holy'],
  },
  baitAndSwitch: {
    name: 'Bait and Switch', _srcName: 'Trap', category: 'utility',
    kind: 'active', template: 'teleport', scope: 'allyOrSelf',
    cost: { type: 'mana', amount: 12 }, cooldown: 30,
    decoy: true, blinkOnUse: true,
    desc: 'Leave something that looks like you standing where you were.',
    wantCooldown: '30 seconds.', wantTags: ['dimension', 'illusion'],
  },
  denyTheReaper: {
    name: 'Deny the Reaper', _srcName: 'Balance', category: 'attack',
    kind: 'active', template: 'chainStrike', element: 'transcendent',
    cost: { type: 'health', amount: 20 }, cooldown: 0,
    trigger: { on: 'harmAttempted', cooldown: 0 }, reactive: true, execute: true,
    desc: 'The closer you are to the end, the harder you answer.',
    wantCooldown: 'None.', wantTags: ['counter-execute'],
  },
  karmicWarrior: {
    name: 'Karmic Warrior', _srcName: 'Balance', category: 'utility',
    kind: 'active', template: 'thornsBuff', element: 'radiant',
    cost: { type: 'mana', amount: 6 }, cooldown: 0,
    trigger: { on: 'harmAttempted', cooldown: 0 }, reactive: true, boon: true,
    desc: 'Every slight against you is written down.',
    wantCost: 'Low mana.', wantCooldown: 'None.', wantTags: ['boon', 'holy', 'retribution'],
  },
  childOfTheCelestialWind: {
    name: 'Child of the Celestial Wind', _srcName: 'Wind', category: 'utility',
    kind: 'passive', template: 'passiveMove', element: 'wind',
    racial: true, resist: { element: 'disruptive' },
    desc: 'What your blood already knows, amplified.',
    wantCost: 'None.',
  },
  eternalMoment: {
    name: 'Eternal Moment', _srcName: 'Swift', category: 'utility',
    kind: 'active', template: 'timeFreeze',
    drain: [{ type: 'mana', perSec: 40 }, { type: 'stamina', perSec: 40 }],
    ...withCanonCooldown({}, 24),
    desc: 'For as long as you can pay, the world takes its time.',
    wantCost: 'Very high mana and stamina, per second.', wantCooldown: '4 hours.',
  },
  castigate: {
    name: 'Castigate', _srcName: 'Sin', category: 'attack',
    kind: 'active', template: 'projectileBall', element: 'transcendent',
    cost: { type: 'mana', amount: 14 }, cooldown: 0,
    holy: true, debuff: { key: 'sin' }, brandUnhealable: true,
    desc: 'Burns a painful brand into the target, inflicting slight '
      + 'transcendent damage and the [Sin] and [Mark of Sin] conditions. '
      + 'The brand cannot be healed so long as the target retains any '
      + 'instances of [Sin].',
    wantCost: 'Moderate mana.', wantCooldown: 'None.', wantTags: ['curse', 'holy'],
  },
};
export const CANON_EXEMPLAR_KEYS = Object.keys(CANON_EXEMPLARS);

/**
 * Render each transcription and assert the lines the books print. Takes the
 * card builder as an argument rather than importing it, because abilityCard.js
 * imports THIS file and a cycle between them would be a load-order bug waiting
 * for the day someone reorders the imports.
 */
export function canonExemplarFaults(cardFn) {
  const out = [];
  for (const [key, a] of Object.entries(CANON_EXEMPLARS)) {
    const lines = cardFn(a, { rank: 'iron', level: 0, progress: 0 });
    const text = lines.join('\n');
    // The essence goes in the parenthetical, which is the most visible of the
    // format deltas and the one a regression would silently undo.
    if (!text.includes(`Ability: [${a.name}] (${a._srcName})`)) {
      out.push(`${key}: the head line is "${lines[0]}"`);
    }
    if (a.wantCost && !text.includes(`Cost: ${a.wantCost}`)) {
      out.push(`${key}: cost reads "${lines.find(l => l.startsWith('Cost:'))}", canon says "Cost: ${a.wantCost}"`);
    }
    if (a.wantCooldown && !text.includes(`Cooldown: ${a.wantCooldown}`)) {
      out.push(`${key}: cooldown reads "${lines.find(l => l.startsWith('Cooldown:'))}", canon says "Cooldown: ${a.wantCooldown}"`);
    }
    for (const t of (a.wantTags || [])) {
      if (!lines[1].includes(t)) out.push(`${key}: not tagged ${t} -- "${lines[1]}"`);
    }
    // Zero-padded, every time.
    const rankLine = lines.find(l => l.startsWith('Current rank:'));
    if (a.kind !== 'passive' && rankLine && !/\(\d\d%\)\.$/.test(rankLine)) {
      out.push(`${key}: the percentage is not zero-padded -- "${rankLine}"`);
    }
    // A canon-hour ability keeps the figure the book gave it.
    if (a.canonCooldownHours && canonHours(a.canonCooldownHours) !== a.cooldown) {
      out.push(`${key}: the played cooldown is not its canon hours divided by ${CANON_HOUR_DIVISOR}`);
    }
  }
  // The three transformations are the same template with three swaps, and
  // their cards must therefore differ in exactly the three swapped clauses.
  const ex = CANON_EXEMPLARS;
  const bodies = ['speciousSorcerer', 'counterfeitCombatant', 'instantAdept']
    .map(k => cardFn(ex[k], { rank: 'iron', level: 0, progress: 0 })
      .filter(l => l.startsWith('Effect (iron)')).join(' '));
  if (new Set(bodies).size !== 3) out.push('two transformations print the same effect line');
  for (const b of bodies) {
    if (!/significant increase to the \[\w+\] attribute/.test(b)) out.push('a transformation lost its attribute clause');
    if (!/ability to use /.test(b)) out.push('a transformation lost its proficiency grant');
    if (!/maximum \w+ increases/.test(b)) out.push('a transformation lost its raised pool');
    if (!/recovery effect/.test(b)) out.push('a transformation lost its ongoing regen');
  }
  return out;
}
