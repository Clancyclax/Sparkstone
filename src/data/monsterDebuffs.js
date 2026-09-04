// ============================================================================
// ROUND 57 -- WHAT EACH MONSTER LEAVES ON YOU
//
// The user's own examples are the specification:
//
//   "Monsters should have these as well. (Also as thematically appropriate.
//    I.E. Spiders slowing through webs and poisoning, ice monsters freezing
//    players, fire monsters burning players)"
//
// Two of those three could not have worked before this file existed, and not
// because the debuffs were missing.
//
// THE ICE MONSTERS WERE NOT ICE
//
// A spawned monster takes its damage element from FAMILY_ELEMENT, which is
// keyed by FAMILY only. So all five elementals were `lightning` -- including
// elementalWater -- and every chimera was `fire`, including chimeraGlacial. The
// game had ninety monsters and not one of them dealt frost damage. "Ice
// monsters freezing players" had no ice monsters to start from.
//
// The variant suffix has always carried the theme (Water, Glacial, Ember,
// Void); nothing had ever read it. VARIANT_ELEMENT below is that reading, and
// it is a fix to the existing element system as much as a foundation for
// debuffs: frost resistance and the round-38 weakspot passive both key off
// dmgElement, and both were blind to half the roster's actual character.
// ============================================================================

import { DEBUFFS } from './debuffs.js';

// ---------------------------------------------------------------------------
// VARIANT -> ELEMENT. Applied over FAMILY_ELEMENT, never under it: a family
// with a strong identity (every hellhound is a fire creature) keeps it unless
// the variant says otherwise, and a variant that names an element outright
// wins. Only suffixes that genuinely name an element appear here -- Gilded,
// Ashen and Crimson are colours, not claims, and are left to the family.
// ---------------------------------------------------------------------------
export const VARIANT_ELEMENT = {
  // water and cold
  Water: 'frost', Azure: 'frost', Glacial: 'frost', Blue: 'frost',
  Quartz: 'frost',
  // fire
  Fire: 'fire', Ember: 'fire', Infernal: 'fire', Red: 'fire', Ruby: 'fire',
  // storm
  Lightning: 'lightning', Storm: 'lightning',
  // living growth
  Verdant: 'nature', Verdigris: 'nature', Emerald: 'nature', Jade: 'nature',
  Green: 'nature', Swamp: 'nature', Venom: 'nature',
  // dark
  Darkness: 'shadow', Void: 'shadow', Umbral: 'shadow', Gloom: 'shadow',
  Onyx: 'shadow', Obsidian: 'shadow', Dusk: 'shadow', Black: 'shadow',
  Violet: 'shadow', Amethyst: 'shadow', Purple: 'shadow',
  // light
  Gilded: 'radiant', Gold: 'radiant', White: 'radiant',
  // earth and bone read as untyped force
  Earth: null, Bone: null, Rusted: null, Grey: null,
};

/** The element a spawned monster of this type actually deals. Variant first,
 *  family second. Exported because the spawn path and the bestiary both need
 *  the same answer, and round 27 already shipped one bug from two places
 *  disagreeing about a monster's element. */
export function monsterElement(typeKey, family, familyElement) {
  const suffix = String(typeKey || '').slice(String(family || '').length);
  if (Object.prototype.hasOwnProperty.call(VARIANT_ELEMENT, suffix)) {
    return VARIANT_ELEMENT[suffix];
  }
  return familyElement || null;
}

// ---------------------------------------------------------------------------
// WHAT THE FAMILY DOES
//
// Each entry is a list of { key, chance, potency }. `chance` is per landed
// blow; `potency` scales the debuff's own magnitude and duration bands, so a
// dragon's burn is the same debuff as a bat's but a worse one to be carrying.
//
// Chances are deliberately low. Nineteen debuffs applied liberally is a player
// who is permanently five things at once and cannot tell which of them is
// hurting -- the round-53 lesson in a new costume. One thing at a time, landing
// often enough to notice, is the goal.
// ---------------------------------------------------------------------------
const D = (key, chance, potency = 1) => ({ key, chance, potency });

export const FAMILY_DEBUFFS = {
  // The user's own first example, in full: the web AND the venom.
  spider: [D('slowMove', 0.30, 1.1), D('poison', 0.35, 1.0)],

  // Ambush predators open wounds.
  wolf: [D('bleed', 0.28, 1.0)],
  raptor: [D('bleed', 0.30, 1.1), D('slowMove', 0.12)],
  trex: [D('bleed', 0.35, 1.4), D('stun', 0.10, 1.0)],
  spinosaurus: [D('bleed', 0.30, 1.3), D('slowMove', 0.15, 1.2)],

  // Weight and impact.
  // The tusk that turns a killing blow into a glancing one.
  boar: [D('stun', 0.16, 1.0), D('slowMove', 0.15), D('critDamageDown', 0.22, 1.0)],
  slimeGolem: [D('sunder', 0.30, 1.2), D('slowMove', 0.20, 1.1), D('speedDown', 0.18, 1.1)],

  // Things that corrode.
  slime: [D('sunder', 0.25, 1.0), D('slowMove', 0.18)],
  lizard: [D('poison', 0.25, 0.9)],
  hydra: [D('poison', 0.35, 1.2), D('disease', 0.15, 1.0)],

  // Fire, the user's third example.
  hellhound: [D('burn', 0.40, 1.1)],
  dragon: [D('burn', 0.45, 1.5), D('sunder', 0.20, 1.3)],
  chimera: [D('burn', 0.30, 1.2), D('bleed', 0.20, 1.0)],

  // The dead and the damned.
  skeleton: [D('unholy', 0.25, 1.0), D('slowAttack', 0.20)],
  shade: [D('curse', 0.25, 1.0), D('spiritDown', 0.22, 1.0), D('recoveryDown', 0.18, 1.0)],
  demon: [D('curse', 0.28, 1.3), D('unholy', 0.22, 1.2), D('powerDown', 0.20, 1.2)],
  bat: [D('disease', 0.25, 0.9), D('slowCast', 0.18)],

  // Elementals carry whatever they are made of -- resolved per variant below,
  // because "elemental" as a family says nothing about what it does to you.
  elemental: [],
};

// ---------------------------------------------------------------------------
// WHAT THE ELEMENT DOES, on top of the family
//
// This is what makes elementalWater a different fight from elementalFire
// without needing five hand-written entries per family. A monster whose element
// resolves to frost can freeze you whatever it is; one that resolves to shadow
// can curse you.
// ---------------------------------------------------------------------------
export const ELEMENT_DEBUFFS = {
  // Cold takes the strength out of a blow as much as the speed out of a step.
  frost: [D('freeze', 0.14, 1.0), D('slowMove', 0.30, 1.2), D('slowAttack', 0.18),
    D('critDamageDown', 0.20, 1.0)],
  fire: [D('burn', 0.35, 1.1)],
  lightning: [D('stun', 0.14, 1.0), D('slowCast', 0.25, 1.1), D('sunder', 0.15)],
  nature: [D('poison', 0.30, 1.0), D('disease', 0.12)],
  shadow: [D('curse', 0.20, 1.0), D('unholy', 0.20, 1.0), D('spiritDown', 0.15)],
  radiant: [D('holy', 0.22, 1.0), D('critChanceDown', 0.18)],
};

// ---------------------------------------------------------------------------
// A HANDFUL OF NAMED VARIANTS
//
// Only where the name promises something neither its family nor its element
// would give it. Everything else is covered by the two tables above, which is
// the point -- ninety hand-written entries would rot the first time a monster
// was added.
// ---------------------------------------------------------------------------
export const VARIANT_DEBUFFS = {
  spiderWidow: [D('poison', 0.45, 1.4)],          // the widow is the venom one
  spiderVoid: [D('curse', 0.20, 1.1)],
  wolfCrimson: [D('bleed', 0.40, 1.3)],
  skeletonBloodforged: [D('bleed', 0.30, 1.2)],
  shadeSanguine: [D('bleed', 0.28, 1.1), D('recoveryDown', 0.22, 1.0)],
  hellhoundVoid: [D('unholy', 0.25, 1.1)],
  batGloom: [D('critChanceDown', 0.25, 1.1)],
  slimeViolet: [D('spiritDown', 0.20, 1.0)],
  trexBone: [D('powerDown', 0.20, 1.1)],
  lizardBone: [D('powerDown', 0.18, 1.0)],
  boarOnyx: [D('speedDown', 0.22, 1.0)],
  demonGilded: [D('holy', 0.20, 1.2)],
  dragonDarkness: [D('curse', 0.28, 1.5)],
  dragonWater: [D('freeze', 0.18, 1.2), D('slowMove', 0.30, 1.3)],
  chimeraGlacial: [D('freeze', 0.16, 1.1)],

  // ---- ROUND 90: EXPOSED, and it goes on FOUR VARIANTS, not on a family ----
  //
  // CRAFTING_SPEC.md left this open deliberately rather than by default: "a
  // monster that strips your resistances is a genuinely new kind of threat.
  // But it is also the debuff that makes everything else hurt more, which on
  // the receiving end may simply read as unfair."
  //
  // Both halves are true, so the answer is neither "no monster" nor "the
  // whole roster". It goes to four VARIANTS -- the most specific tier in this
  // table, and the one already used for the roster's genuine specialists (the
  // widow's venom, the crimson wolf's bleed) -- chosen because getting THROUGH
  // something is what each of them is for. Four monsters in a roster of 161 is
  // a threat you meet rarely enough to remember and specifically enough to
  // prepare for, and it makes the twentieth debuff symmetric, which is round
  // 57's founding rule: "a debuff has to mean the same thing whichever side of
  // the fight is carrying it."
  //
  // The chances are the lowest in this table and the potencies are 1.0. It
  // strips a fraction of one channel for a few seconds; it does not undress
  // you.
  //
  // Every key here is a REAL variant, checked against MONSTER_TYPES by
  // `MONSTER_DEBUFF_UNKNOWN` at import -- the first draft named four that do
  // not exist (dragonVoid, demonAbyssal, hydraVenom, elementalVoid) and the
  // checker said nothing, because it only validates the DEBUFF ids. That is
  // round 56's dead-stone-id fault wearing a different hat, and it is why the
  // suite counts the monsters that actually carry this rather than reading
  // the table.
  demonVoid: [D('expose', 0.14, 1.0)],        // it finds the seam in whatever you wear
  hydraPurple: [D('expose', 0.15, 1.0)],      // the venom eats the ward first
  elementalDarkness: [D('expose', 0.14, 1.0)],// made of the absence of a channel
  shadeVoid: [D('expose', 0.16, 1.0)],        // a hole where a resistance was
};

/** Everything a monster of this type may leave on whoever it hits, merged from
 *  family, element and variant. A key named by more than one source keeps the
 *  HIGHEST chance and potency: the most specific statement about a monster is
 *  the one that was written with it in mind. */
export function monsterDebuffRoll(typeKey, family, element) {
  const out = new Map();
  const take = (list) => {
    for (const e of (list || [])) {
      const prev = out.get(e.key);
      if (!prev || e.chance > prev.chance) {
        out.set(e.key, { key: e.key, chance: e.chance, potency: Math.max(e.potency, prev ? prev.potency : 0) });
      } else if (e.potency > prev.potency) {
        prev.potency = e.potency;
      }
    }
  };
  // The family goes in FIRST, and loses any entry whose debuff belongs to an
  // element this monster is not. A Glacial chimera inherited `burn` from the
  // chimera family and `freeze` from its own frost element, and arrived
  // setting people on fire while freezing them. The variant suffix is the more
  // specific statement about the creature, so where they disagree it wins.
  //
  // Physical afflictions (bleed, stun, sunder) survive the filter on purpose:
  // teeth are teeth whatever the beast is made of.
  const suitsElement = (e) => {
    const def = DEBUFFS[e.key];
    if (!def || !def.element) return true;
    return def.element === element || def.element === 'physical';
  };
  take((FAMILY_DEBUFFS[family] || []).filter(suitsElement));
  take(ELEMENT_DEBUFFS[element]);
  take(VARIANT_DEBUFFS[typeKey]);
  const list = [...out.values()].filter(e => DEBUFFS[e.key]);
  // Nothing should be able to hit you and leave nothing behind at all -- a
  // monster with no debuff of its own is a monster the whole system is
  // invisible on. Physical creatures with no element and no family entry get
  // the plain one: it hurts, and the wound stays open.
  if (!list.length) list.push(D('bleed', 0.20, 0.9));
  return list;
}

/** Cached per type key -- monsterDebuffRoll runs on every landed blow
 *  otherwise, and a pack of thirty spiders swings a lot. */
const _rollCache = new Map();
export function monsterDebuffsCached(typeKey, family, element) {
  const ck = `${typeKey}|${family}|${element}`;
  let v = _rollCache.get(ck);
  if (!v) { v = monsterDebuffRoll(typeKey, family, element); _rollCache.set(ck, v); }
  return v;
}

/** Every debuff key these tables name has to be a real debuff, for the same
 *  reason round 56's stone ids did: a typo here is a monster that silently
 *  never inflicts the thing its own name promises. */
export const MONSTER_DEBUFF_UNKNOWN = (() => {
  const bad = [];
  const check = (label, list) => {
    for (const e of (list || [])) if (!DEBUFFS[e.key]) bad.push(`${label}:${e.key}`);
  };
  for (const [f, l] of Object.entries(FAMILY_DEBUFFS)) check(f, l);
  for (const [e, l] of Object.entries(ELEMENT_DEBUFFS)) check(e, l);
  for (const [v, l] of Object.entries(VARIANT_DEBUFFS)) check(v, l);
  return bad;
})();

/**
 * ROUND 90 -- THE VARIANT KEYS MUST NAME MONSTERS THAT EXIST.
 *
 * `MONSTER_DEBUFF_UNKNOWN` above validates every DEBUFF id and has done since
 * round 57. It has never validated the other half: the KEY a variant entry is
 * filed under. Round 90's first draft of the expose carriers named four --
 * dragonVoid, demonAbyssal, hydraVenom, elementalVoid -- and not one of them
 * is a monster in this game. The table looked right, imported cleanly, and
 * gave `expose` to nobody at all, which is round 56's dead-stone-id fault
 * wearing a different hat.
 *
 * Takes `MONSTER_TYPES` as an argument rather than importing it, because
 * monsters.js is the larger module and this one is imported by the roster.
 */
export function monsterDebuffFaults(MONSTER_TYPES) {
  const out = [...MONSTER_DEBUFF_UNKNOWN];
  const keys = new Set(Object.keys(MONSTER_TYPES || {}));
  for (const k of Object.keys(VARIANT_DEBUFFS)) {
    if (!keys.has(k)) out.push(`VARIANT_DEBUFFS.${k} names no monster`);
  }
  const fams = new Set(Object.values(MONSTER_TYPES || {}).map(t => t.family));
  for (const k of Object.keys(FAMILY_DEBUFFS)) {
    if (!fams.has(k)) out.push(`FAMILY_DEBUFFS.${k} names no family`);
  }
  // And every debuff in the table must be REACHABLE by some monster, which is
  // the promise round 57's suite makes and the one this round nearly broke.
  const carried = new Set();
  for (const [key, t] of Object.entries(MONSTER_TYPES || {})) {
    for (const e of monsterDebuffsCached(key, t.family, null)) carried.add(e.key);
  }
  return { faults: out, carried: [...carried] };
}

export const MONSTER_DEBUFFS = { FAMILY_DEBUFFS, ELEMENT_DEBUFFS, VARIANT_DEBUFFS };
