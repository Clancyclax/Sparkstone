// Monster data + atlas layouts, ported from sparkstone_prototype.html's
// MONSTER_TYPES (lines 4012-4102) and species-specific draw constants
// (WOLF_CELL/SLIME_CELL/HYDRA_CELL/RAPTOR_CELL/CHIMERA_CELL/HELLHOUND_CELL/
// DRAGON_CELL/WHITE_DRAGON_CELL/WATER_ELEMENTAL_CELL, lines ~8429-8723).
// All 39 original entries are ported this round (up from 2 last round) --
// every atlas grid below was measured against the real extracted PNGs, not
// guessed.

// ROUND 24 -- the roster is GENERATED, not hand-typed.
//
// The user re-uploaded every creature with a run AND an attack animation and
// set the target explicitly: "With 5 shades of each monster and 15 monsters we
// have established sufficient variety to call that good for now." That is 75
// monsters. Hand-typing 75 stat lines is how a roster ends up with a shade
// that is accidentally weaker than the one below it, so the table is derived
// instead: each family declares ONE set of base stats, and the five shades are
// the same fixed progression applied to all of them.
//
// The shade names come from src/data/monsterArt.js -- the same list the
// extractor baked into the atlas rows -- so a monster key can never name a
// shade that has no art, and adding a shade to the art automatically adds it
// to the roster.
//
// ROUND 25 -- back to EIGHTEEN families (90 monsters). Round 24 retired four
// families the re-upload had not covered; the user then sent the skeletal
// warrior and hellhound packs and asked for the wyrm back, so three of the
// four returned. Only saberCanis stays retired -- no art was sent for it and
// it was always the family closest to the panterimp it sat beside.
//
// All three keep the names round 3 gave them (Boneguard, Cindermaw, Wyrm),
// which never left FAMILY_DISPLAY_NAME below.
//
// NEW THIS ROUND: `shade` (a humanoid shadow creature) and `demon` (a
// staff-bearing dark caster), the "few new additions" from the upload.

// Per-family base stats. These describe the WEAKEST shade of each family;
// everything else is derived. Ordered weakest family to strongest, which is
// also the order they end up spread across the spawn rings once
// monsterThreatTier() reads their hp and damage back out.
export const MONSTER_FAMILY_BASE = {
  // ROUND 49 -- `ambushChance` is how often a monster of this family SPAWNS
  // LYING IN WAIT. The user: "Monsters sit semi transparent to ambush
  // adventurers", and then: "Make sure predatory monsters have a chance to roll
  // with a stealth/ambush ability."
  //
  // A lurking monster is drawn at LURK_ALPHA, watches a radius far shorter than
  // its own `aggro`, and is worth AMBUSH_DAMAGE_MULT on the swing it stands up
  // with (see WorldScene's "THE STEALTH RUNTIME").
  //
  // A CHANCE, not a flag, and the change is worth more than it looks. As a flag
  // it was five families where every single member lurked -- so a spider was
  // always an ambush and a wolf never was, and after one pack of each the
  // player knew which was which by the sprite. Rolled per monster at spawn, an
  // ambush is a thing that can happen ANYWHERE a predator hunts, which is what
  // makes checking the treeline worth doing.
  //
  // Three bands, and the reasoning is the same one that kept boars out of it:
  //   0.7-0.85  the dedicated ambushers -- the spider in its web, the shade in
  //             the dark, the bat on the ceiling, the raptor in the long grass,
  //             the lizard on the rock. Most of them lie in wait; a few are
  //             caught out in the open.
  //   0.3       pack and pursuit predators -- wolf, hellhound, chimera. They
  //             usually run you down, and sometimes they were already waiting.
  //   0.2       the big hunters -- trex, spinosaurus, hydra. Rare, because a
  //             thing that size in ambush should be a story.
  // Everything else is 0: a slime does not lie in wait, a boar CHARGES, and a
  // skeleton was not hunting anything. Giving those a chance would make every
  // encounter an ambush, which is the same as none of them being one.
  slime:       { hp: 12,  speed: 44,  dmg: 3,  aggro: 150, radius: 12, xp: 8 },
  lizard:      { hp: 14,  speed: 80,  dmg: 4,  aggro: 165, radius: 11, xp: 10, ambushChance: 0.4 },
  bat:         { hp: 11,  speed: 98,  dmg: 4,  aggro: 190, radius: 10, xp: 10, ambushChance: 0.35 },
  spider:      { hp: 18,  speed: 86,  dmg: 6,  aggro: 180, radius: 12, xp: 14, ambushChance: 0.45 },
  shade:       { hp: 22,  speed: 74,  dmg: 7,  aggro: 190, radius: 12, xp: 18, dmgType: 'magical', ambushChance: 0.45 },
  raptor:      { hp: 30,  speed: 118, dmg: 9,  aggro: 175, radius: 13, xp: 28, ambushChance: 0.35 },
  wolf:        { hp: 34,  speed: 108, dmg: 10, aggro: 200, radius: 13, xp: 30, ambushChance: 0.18 },
  boar:        { hp: 38,  speed: 92,  dmg: 11, aggro: 170, radius: 14, xp: 34 },
  demon:       { hp: 48,  speed: 80,  dmg: 15, aggro: 210, radius: 14, xp: 55, dmgType: 'magical' },
  slimeGolem:  { hp: 55,  speed: 52,  dmg: 12, aggro: 165, radius: 16, xp: 44 },
  elemental:   { hp: 62,  speed: 70,  dmg: 13, aggro: 195, radius: 15, xp: 60, dmgType: 'magical' },
  hydra:       { hp: 78,  speed: 66,  dmg: 16, aggro: 205, radius: 18, xp: 85, dmgType: 'magical', ambushChance: 0.12 },
  chimera:     { hp: 130, speed: 82,  dmg: 24, aggro: 215, radius: 19, xp: 130, dmgType: 'magical', ambushChance: 0.18 },
  skeleton:    { hp: 44,  speed: 84,  dmg: 13, aggro: 195, radius: 14, xp: 40 },
  hellhound:   { hp: 52,  speed: 128, dmg: 16, aggro: 215, radius: 14, xp: 62, dmgType: 'magical', ambushChance: 0.18 },
  spinosaurus: { hp: 175, speed: 88,  dmg: 30, aggro: 220, radius: 21, xp: 210, ambushChance: 0.12 },
  trex:        { hp: 240, speed: 76,  dmg: 38, aggro: 225, radius: 24, xp: 320, ambushChance: 0.12 },
  // The wyrm sits at the very top, above both apex dinosaurs -- which is where
  // round 3 had it (220-280hp against the direjaw's 240) and where a dragon
  // belongs.
  dragon:      { hp: 300, speed: 74,  dmg: 42, aggro: 245, radius: 26, xp: 420, dmgType: 'magical' },

  // ===== ROUND 75 (item 6) -- THIRTEEN NEW FAMILIES ========================
  //
  //   "6) A host of new summons and monsters, please run through palette
  //    changes as needed to increase monster and summon variety."
  //
  // and, asked whether these were monsters or summons: "Both, all of them."
  // So every one of these thirteen is here AND in activeSummons.js's creature
  // table -- the same art, the same name, met in the wild before it can be
  // called.
  //
  // PLACEMENT IS NOT WRITTEN ANYWHERE, AND THAT IS THE POINT. A family's
  // region and its distance from town both come from `monsterThreatTier`,
  // which reads hp and damage off these rows -- so choosing the stats IS
  // choosing where it lives, and there is no second table to disagree with
  // this one. The thirteen are deliberately spread across the whole span
  // rather than bolted on at the top: a scorpion belongs at the town gate as
  // much as a thunderbird belongs at the far edge, and a drop of thirteen
  // creatures that all outclass the existing roster would make everything
  // already in the game irrelevant.
  //
  // MEASURED after the fact, not asserted -- `monsterThreatTier` derives the
  // tier from these numbers, so the only honest way to state the spread is to
  // read it back out. The weakest and strongest SHADE of each family, which is
  // why most span two tiers:
  //
  //   scorpion     1-2      the near ring
  //   direbuck     2-3
  //   hornram      2-3      the middle distance
  //   giantToad    2-3
  //   cobra        2-3
  //   mantis       3-4
  //   crocodile    3-4      the far country
  //   whitelion    3-4
  //   medusa       3-4
  //   yeti         4        the edge
  //   minotaur     4
  //   phoenix      4
  //   thunderbird  4
  //
  // Four of thirteen are apex-only; nine fill the roster in rather than
  // sitting on top of it, and the roster goes from 90 monsters to 155.
  scorpion:    { hp: 20,  speed: 92,  dmg: 6,  aggro: 170, radius: 11, xp: 16, ambushChance: 0.5 },
  // The fastest thing on four legs in the game -- 124 beats the hellhound's
  // 128 only because the hellhound is magical and this is a deer. It is a
  // FLEEING creature that turns and gores, which is what the low damage and
  // high speed together say.
  direbuck:    { hp: 26,  speed: 124, dmg: 8,  aggro: 155, radius: 12, xp: 22 },
  hornram:     { hp: 32,  speed: 96,  dmg: 11, aggro: 165, radius: 13, xp: 28 },
  // Sits still and lets things come to it -- TIED for the highest ambush chance
  // in the roster (with the scorpion and the cobra, all three at the ceiling),
  // paired with the lowest speed of any tier-2 family. A toad that could also
  // chase would be strictly better than everything near it.
  // ROUND 76 -- 0.55 -> 0.50. Round 50 states the rule ("no family lurks more
  // than half the time") and its suite has asserted it since; the toad and the
  // crocodile have both broken it since round 75 and NEITHER WAS EVER SEEN,
  // because that assertion samples the monsters actually spawned near the
  // player and both families are tier 2 and above. Item 7's tier-0 crocodile
  // rung put one in the sample and the roster's own rule failed on its first
  // look. The toad keeps the top of the ladder -- see the note above, which
  // was the OTHER half of this: it claimed the highest ambush chance in the
  // roster while the crocodile sat six points above it.
  giantToad:   { hp: 40,  speed: 58,  dmg: 10, aggro: 150, radius: 14, xp: 32, ambushChance: 0.50 },
  cobra:       { hp: 36,  speed: 88,  dmg: 12, aggro: 175, radius: 12, xp: 36, ambushChance: 0.5 },
  mantis:      { hp: 46,  speed: 104, dmg: 15, aggro: 185, radius: 13, xp: 50, ambushChance: 0.45 },
  // ROUND 76 -- 0.6 -> 0.45, below the toad. See the toad's note directly
  // above: this was the roster's highest ambush chance, above the family whose
  // comment calls itself the highest, and above the ceiling round 50 wrote
  // down. Two claims and a rule, and the crocodile broke all three.
  crocodile:   { hp: 58,  speed: 70,  dmg: 17, aggro: 160, radius: 15, xp: 58, ambushChance: 0.45 },
  whitelion:   { hp: 68,  speed: 116, dmg: 19, aggro: 205, radius: 15, xp: 78, ambushChance: 0.3 },
  medusa:      { hp: 84,  speed: 72,  dmg: 20, aggro: 200, radius: 15, xp: 105, dmgType: 'magical', ambushChance: 0.3 },
  yeti:        { hp: 96,  speed: 68,  dmg: 22, aggro: 190, radius: 18, xp: 100 },
  minotaur:    { hp: 110, speed: 90,  dmg: 26, aggro: 210, radius: 17, xp: 135 },
  phoenix:     { hp: 140, speed: 100, dmg: 28, aggro: 215, radius: 18, xp: 190, dmgType: 'magical' },
  // The biggest flier in the game, and the only new family above the
  // spinosaurus. Still under the wyrm, which round 25 put at the top on
  // purpose and this round does not move.
  thunderbird: { hp: 190, speed: 112, dmg: 33, aggro: 230, radius: 20, xp: 265, dmgType: 'magical' },
};

// The five shades, weakest to strongest. `weight` is the spawn/bounty rarity
// roll, so the strongest shade of a family is also its rarest -- which is what
// makes finding a gilded anything feel like something rather than like the
// next colour along.
const SHADE_STEPS = [
  { hp: 1.00, dmg: 1.00, xp: 1.00, speed: 1.00, weight: 1.00 },
  { hp: 1.25, dmg: 1.12, xp: 1.30, speed: 1.03, weight: 0.62 },
  { hp: 1.55, dmg: 1.26, xp: 1.70, speed: 1.06, weight: 0.38 },
  { hp: 1.90, dmg: 1.42, xp: 2.20, speed: 1.09, weight: 0.22 },
  { hp: 2.35, dmg: 1.60, xp: 2.90, speed: 1.12, weight: 0.12 },
];

// Family rarity: how common the family itself is, before the shade step. A
// slime should be the thing you trip over and a two-headed direjaw should not
// be, and without this every family would be equally likely at its own tier.
const FAMILY_WEIGHT = {
  slime: 10, lizard: 9, bat: 9, spider: 7, shade: 6, raptor: 6, wolf: 6, boar: 5,
  skeleton: 5, hellhound: 3, demon: 3.5, slimeGolem: 4, elemental: 3.5, hydra: 2.5,
  chimera: 1.2, spinosaurus: 0.7, trex: 0.35, dragon: 0.2,
  // ROUND 75. Weighted against the families they share a tier with, not
  // against each other: a scorpion is as ordinary as a spider, a thunderbird
  // as rare as a chimera. The thirteen are collectively a little lighter than
  // the eighteen so the roster the player already knows stays the roster --
  // adding thirteen equally-weighted families would halve how often any old
  // one appears, which reads as the existing monsters being deleted.
  scorpion: 7, direbuck: 6, hornram: 5, giantToad: 4.5, cobra: 4.5,
  mantis: 4, crocodile: 3.5, whitelion: 3, medusa: 2.5, yeti: 2.5,
  minotaur: 1.8, phoenix: 0.9, thunderbird: 0.5,
};

// ============================================================================
// ROUND 76 (item 7) -- THICKENING TIER 0 AND TIER 1.
//
// The user: "Thicken tier 0. Add the crocodiles, lions, and direbuck into the
// tier 0 and tier 1 pool."
//
// MEASURED FIRST. Tier 0 held FIVE shades in the whole game -- two slimes, one
// lizard and two bats -- and tier 1 held fourteen. Everything a starting
// character can meet outside the town gate came from those five, which is why
// the first hour looks the same for everybody.
//
// The three families the user named sit well above that: the weakest crocodile
// is tier 3, the weakest Snowmane tier 3, the weakest Palehart tier 2. Their
// stats cannot simply be lowered -- these are the mid-ladder animals a bronze
// character fights, and moving the family moves the whole rung.
//
// SO THE FAMILIES GET A YOUNGER RUNG, which is what "add them to the tier 0
// pool" means when the adults belong where they are. A hatchling crocodile is
// a crocodile: same family, same art, same behaviour, a fraction of the
// numbers -- and a starting character meeting one has met a crocodile, which
// is the whole point of the ask.
//
// NO NEW ART. Each rung names a shade the family already carries (`shadeRow`
// resolves art by shade NAME, not by index), so the tier-0 rung wears the
// palest of the five and the tier-1 rung the next one along. A juvenile drawn
// in its family's own weakest palette is the reading the art already supports.
//
// The multipliers are chosen against monsterThreatTier's own arithmetic --
// `hp + max(0, dmg - 4) * 4` against ceilings [16, 40, 80, ...] -- and the
// suite asserts the resulting tier rather than trusting the sum here.
const YOUNG_RUNGS = [
  // family, key suffix, the shade whose art it wears, and its label.
  // RUNT, not "Fawn", and the render is why. The Palehart's bone shade is a
  // small white deer WITH A FULL RACK OF ANTLERS, and a fawn is by definition
  // antlerless -- the word promised something the picture does not show. Runt
  // is the same idea (a smaller one, weaker than its kind) and is true of the
  // art. The cub and the hatchling both survived the same look unchanged.
  { family: 'direbuck', suffix: 'Runt', shade: 'bone', label: 'Palehart Runt',
    hp: 0.50, dmg: 0.45, xp: 0.45, speed: 0.92, weight: 1.4, scale: 0.62 },
  { family: 'direbuck', suffix: 'Yearling', shade: 'tawny', label: 'Palehart Yearling',
    hp: 0.72, dmg: 0.62, xp: 0.65, speed: 0.96, weight: 1.1, scale: 0.80 },
  { family: 'crocodile', suffix: 'Hatchling', shade: 'bone', label: 'Pallidjaw Hatchling',
    hp: 0.22, dmg: 0.24, xp: 0.30, speed: 0.90, weight: 1.2, scale: 0.52 },
  { family: 'crocodile', suffix: 'Yearling', shade: 'swamp', label: 'Pallidjaw Yearling',
    hp: 0.40, dmg: 0.30, xp: 0.50, speed: 0.94, weight: 0.9, scale: 0.74 },
  { family: 'whitelion', suffix: 'Cub', shade: 'bone', label: 'Snowmane Cub',
    hp: 0.19, dmg: 0.21, xp: 0.30, speed: 0.88, weight: 1.2, scale: 0.55 },
  { family: 'whitelion', suffix: 'Yearling', shade: 'gilded', label: 'Snowmane Yearling',
    hp: 0.34, dmg: 0.26, xp: 0.50, speed: 0.93, weight: 0.9, scale: 0.76 },
];

function buildRoster() {
  const out = {};
  for (const [family, base] of Object.entries(MONSTER_FAMILY_BASE)) {
    const art = MONSTER_ART[family];
    if (!art) continue; // a family with no packed art simply does not exist
    art.shades.forEach((shade, i) => {
      const step = SHADE_STEPS[i] || SHADE_STEPS[SHADE_STEPS.length - 1];
      const key = family + shade.charAt(0).toUpperCase() + shade.slice(1);
      out[key] = {
        hp: Math.round(base.hp * step.hp),
        speed: Math.round(base.speed * step.speed),
        dmg: Math.round(base.dmg * step.dmg),
        aggro: base.aggro + i * 6,
        radius: base.radius + (i >= 3 ? 1 : 0),
        xp: Math.round(base.xp * step.xp),
        minDist: 0,
        weight: Math.round(FAMILY_WEIGHT[family] * step.weight * 100) / 100,
        family,
        shade,
        ...(base.dmgType ? { dmgType: base.dmgType } : {}),
        // ROUND 49 -- carried through to every SHADE of an ambush family. This
        // roster builder names each field it forwards rather than spreading
        // `base`, so a flag added to MONSTER_FAMILY_BASE and not added here is
        // silently dropped -- which is exactly what happened to `ambush` on the
        // first pass, and the reason the suite asks MONSTER_TYPES rather than
        // MONSTER_FAMILY_BASE whether a type can lie in wait.
        //
        // `ambush` is kept as a derived boolean beside the chance: it is the
        // question every reader actually asks ("can this thing ambush?"), and
        // deriving it here means no caller has to remember that 0 and undefined
        // both mean no.
        ...(base.ambushChance ? { ambushChance: base.ambushChance, ambush: true } : {}),
      };
    });
  }
  // ROUND 76 (item 7) -- the young rungs, built through the SAME shape as
  // every other row above rather than hand-written objects, so a field added
  // to the roster is added to these too. `ambush` in particular: a crocodile
  // lies in wait, and a hatchling that did not would have been the round-49
  // dropped-flag bug repeated on purpose.
  for (const y of YOUNG_RUNGS) {
    const base = MONSTER_FAMILY_BASE[y.family];
    const art = MONSTER_ART[y.family];
    if (!base || !art || !art.shades.includes(y.shade)) continue;
    out[y.family + y.suffix] = {
      hp: Math.max(4, Math.round(base.hp * y.hp)),
      speed: Math.round(base.speed * y.speed),
      dmg: Math.max(1, Math.round(base.dmg * y.dmg)),
      // Notices you later than the adult does. A cub that spotted you at the
      // adult's 205 units would be a tier-0 monster with a tier-4 leash.
      aggro: Math.round(base.aggro * 0.8),
      radius: Math.max(8, base.radius - 3),
      xp: Math.max(2, Math.round(base.xp * y.xp)),
      minDist: 0,
      weight: Math.round(FAMILY_WEIGHT[y.family] * y.weight * 100) / 100,
      family: y.family,
      shade: y.shade,
      // What the player is told it is. Every other row has no label and falls
      // back to its family's display name, which is why five crocodiles all
      // read "Pallidjaw"; a rung that read the same as the adult standing
      // beside it at four times the health would be worse than unnamed.
      label: y.label,
      young: true,
      // AND IT IS DRAWN SMALLER, which is the half that was nearly missed.
      //
      // A rung wears its family's own art, so without this a tier-0 hatchling
      // and a tier-3 adult crocodile are the SAME PICTURE at the same size --
      // and the player walking toward one has no way to tell which. That is
      // not a difficulty curve, it is a trap. `scaleMult` multiplies the
      // family's display scale (see _displayScaleFor), so a fawn is a bit over
      // half a Palehart and a yearling most of one.
      scaleMult: y.scale,
      ...(base.dmgType ? { dmgType: base.dmgType } : {}),
      ...(base.ambushChance ? { ambushChance: base.ambushChance, ambush: true } : {}),
    };
  }
  return out;
}

import { MONSTER_ART } from './monsterArt.js';

export const MONSTER_TYPES = buildRoster();

// ===========================================================================
// ROUND 114 -- WHAT A BODY IS, for the senses that care.
//
// Two of the user's 23 senses turn on a distinction the roster had never made:
//
//   heatSight   "living bodies through cover, NOT undead or constructs"
//   tremorSense "ground-contact bodies only, ignores fliers"
//
// Both are the sense's COUNTER, and the user wrote them as such -- "The undead
// and the constructed show NOTHING. Against Undeath this sense is blind" and
// "Anything airborne is invisible to it. Fliers are the counter." A sense with
// no counter is a strictly-better sense, so these two facts are load-bearing
// rather than decoration.
//
// PER FAMILY, NOT PER TYPE. `buildRoster` stamps every shade of a family from
// its base, so a skeleton is bloodless whether it is the weakest or the
// strongest one; classifying the 30 families rather than the 150 types means
// there is one place to be right. A family missing from either list fails a
// data check rather than defaulting -- "unclassified" would silently mean
// "warm and walking", which is the answer that hides the mistake.
//
// THE CALLS, and the reasoning, because these are judgements:
//
//   BLOODLESS -- shows nothing to heat-sight. A skeleton has no flesh to be
//   warm; a shade is not a body at all; a slime golem and an elemental are
//   animate matter rather than animals. A DEMON is deliberately not on this
//   list: it is monstrous, not dead, and hellfire is if anything hotter than a
//   living thing. A SLIME likewise -- cold-blooded is not bloodless.
//
//   AIRBORNE -- shows nothing to tremor-sense. The three that fly by wing (bat,
//   thunderbird, phoenix), the dragon, and the shade, which touches the ground
//   least of anything in the game. A mantis and a scorpion walk.
export const BLOODLESS_FAMILIES = new Set([
  'skeleton', 'shade', 'slimeGolem', 'elemental',
]);
export const AIRBORNE_FAMILIES = new Set([
  'bat', 'thunderbird', 'phoenix', 'dragon', 'shade',
]);

/** True for anything heat-sight cannot see. Asked of the MONSTER rather than
 *  the family id, so a caller cannot accidentally pass one when it means the
 *  other -- the mistake `weaponIdentityOf` made in round 103. */
export function isBloodless(m) {
  const fam = m && (m.family || (m.type && m.type.family));
  return !!fam && BLOODLESS_FAMILIES.has(fam);
}
/** True for anything tremor-sense cannot feel. */
export function isAirborne(m) {
  const fam = m && (m.family || (m.type && m.type.family));
  return !!fam && AIRBORNE_FAMILIES.has(fam);
}


// --- Player-facing family display names (NEW round 3): the user's own
// words -- "All monsters should be renamed to reference the creature they
// originally were named after but not be named that exactly. The wolf in
// particular should be renamed panterimp." -- applied to every family's
// PLAYER-FACING name only. Internal MONSTER_TYPES keys (wolfGrey, hydraBlue,
// ...), family ids ('wolf', 'hydra', ...), and color-field names (wolfColor,
// hydraColor, ...) are all left completely untouched on purpose, so this is
// a pure presentation-layer rename with zero risk to game logic -- every
// consumer of a monster's display text (quests.js's monsterLabelFor, the
// bestiary) routes through this single map instead of hand-splitting keys.
// slimeGolem/saberCanis keep the exact names the user gave their new
// uploads verbatim -- those were already non-literal, so the rule is
// already satisfied for them without any further renaming.
export const FAMILY_DISPLAY_NAME = {
  slime: 'Ichorling',
  bat: 'Duskfang',
  wolf: 'Panterimp', // explicit user instruction
  hydra: 'Hydrix',
  raptor: 'Clawstrider',
  chimera: 'Triskelith',
  hellhound: 'Cindermaw',
  elemental: 'Elementum',
  dragon: 'Wyrm',
  trex: 'Direjaw',
  boar: 'Gemtusk',
  skeleton: 'Boneguard',
  spinosaurus: 'Hexfin',
  spider: 'Webstalker',
  lizard: 'Quillrunner',
  shade: 'Umbrathane',   // ROUND 24, new family -- same non-literal naming rule as the rest
  demon: 'Hexbound',     // ROUND 24, new family
  slimeGolem: 'Slime Golem', // user's own name for this new upload -- kept as-is
  saberCanis: 'Saber Canis', // user's own name for this new upload -- kept as-is
  // ROUND 75 -- the same non-literal naming rule the rest of the roster
  // follows (a wolf is a Panterimp, a T-Rex a Direjaw). The player should meet
  // a creature, not a label off an animal chart.
  scorpion: 'Barbtail',
  direbuck: 'Palehart',
  hornram: 'Coilhorn',
  giantToad: 'Gulletmaw',
  cobra: 'Hoodspine',
  mantis: 'Sicklekin',
  crocodile: 'Pallidjaw',
  whitelion: 'Snowmane',
  medusa: 'Gorgonet',
  yeti: 'Rimebrute',
  minotaur: 'Bullwarden',
  phoenix: 'Emberwake',
  thunderbird: 'Stormroc',
};

// --- Summons (NEW this round, art only): the duck and chicken PixelLab
// uploads ("a duck in a waddling [walk]" / "a stout chicken with bright
// [colors]") are explicitly NOT wild monsters -- the user's own words: "The
// duck and chicken are meant to be summons, not monsters." Their art is
// extracted and atlased (duck_idle/run/flavor.png, chicken_idle/run/
// flavor.png -- see src/data/summons.js for layout constants), but there is
// no summon-casting ability in this game yet to attach them to, so they are
// deliberately NOT added to MONSTER_TYPES/FAMILY_TEMPERAMENT and don't
// spawn as hostiles. Wiring an actual summon mechanic (an ability that
// spawns a friendly, controllable-or-following creature) is real, scoped
// future work, not attempted this round -- flagged rather than either
// silently skipped or guessed into an unrequested feature.

// minDist (real original values, e.g. wolf 520 / raptors 600-720 / dragons
// 820-900) gated spawns by distance from the world's center on the original's
// much larger map. This test world is small, so every minDist above is
// relaxed to 0 -- otherwise most of the roster could never legally spawn.

// --- Combat "temperament": aggression, attack speed, and defense, layered
// on top of the hp/speed/dmg block above. These are NOT ported from the
// original (it has no equivalent system -- every monster there shared one
// global attack cooldown and one global chase-give-up distance, and had no
// armor stat at all) -- this is new, added because a same-cooldown/no-
// armor roster made every fight feel the same regardless of what you were
// actually fighting.
//
// Rather than hand-picking 3 more numbers per entry (117 more numbers to
// keep internally consistent across 39 monsters), each family gets one
// small "personality" -- how tenacious it is in a chase, how its natural
// speed maps to how often it swings, and how thick its hide is relative to
// its own HP -- and every entry in that family derives its actual
// atkCooldown/armor/chaseDropMult from its own hp/speed through that
// personality. Color variants within a family (slimeRed vs slimeGold, etc)
// still end up with genuinely different numbers, because they still have
// different hp/speed -- they just share the same *kind* of behavior, which
// reads as "this is still recognizably a slime" instead of 39 unrelated
// stat blocks.
const FAMILY_TEMPERAMENT = {
  // chaseDropMult: how many multiples of its own aggro range a monster will
  //   pursue before giving up and wandering back home (replaces the
  //   original's one-size-fits-all 1.6x) -- higher = more relentless.
  // atkSpeedMult: multiplies the speed-derived base attack cooldown below --
  //   below 1 = swings even faster than its raw speed would suggest, above
  //   1 = slower/heavier swings than its speed would suggest.
  // armorFactor: armor = round(hp * armorFactor) -- thicker-hided families
  //   get a bigger factor, so their naturally-higher-hp entries end up
  //   armored too, not just individually tankier.
  // ROUND 24 -- the two new families from the re-upload.
  shade:     { chaseDropMult: 1.8, atkSpeedMult: 1.10, armorFactor: 0.012 }, // incorporeal stalker -- hard to shake, nothing solid to armour
  demon:     { chaseDropMult: 1.6, atkSpeedMult: 0.80, armorFactor: 0.024 }, // a caster: slow deliberate strikes behind a warded hide
  slime:     { chaseDropMult: 1.3, atkSpeedMult: 0.85, armorFactor: 0.010 }, // lazy blobs -- lose interest fast, barely any natural armor
  bat:       { chaseDropMult: 1.4, atkSpeedMult: 1.25, armorFactor: 0.010 }, // erratic flier, quick nips, paper-thin
  wolf:      { chaseDropMult: 1.9, atkSpeedMult: 1.05, armorFactor: 0.020 }, // persistent pack hunter
  hydra:     { chaseDropMult: 1.5, atkSpeedMult: 0.80, armorFactor: 0.026 }, // territorial, guards its ground, thick hide
  raptor:    { chaseDropMult: 2.1, atkSpeedMult: 1.30, armorFactor: 0.015 }, // relentless pack hunter, fastest attacker in the roster
  chimera:   { chaseDropMult: 1.7, atkSpeedMult: 0.90, armorFactor: 0.030 }, // apex hybrid, heavily armored
  hellhound: { chaseDropMult: 2.3, atkSpeedMult: 1.15, armorFactor: 0.018 }, // the most relentless chaser in the game -- matches its "lunge" atlas
  elemental: { chaseDropMult: 1.4, atkSpeedMult: 0.85, armorFactor: 0.025 }, // bound close to its territory, magic-dense body
  dragon:    { chaseDropMult: 1.8, atkSpeedMult: 0.75, armorFactor: 0.028 }, // apex predator, slow devastating attacks, thickest natural armor
  // --- NEW this round ---
  trex:        { chaseDropMult: 2.0,  atkSpeedMult: 0.85, armorFactor: 0.026 }, // twin jaws bite faster than a single-head apex its size would
  boar:        { chaseDropMult: 1.6,  atkSpeedMult: 1.00, armorFactor: 0.032 }, // literal crystal hide -- even more armored than chimera
  skeleton:    { chaseDropMult: 2.0,  atkSpeedMult: 0.95, armorFactor: 0.022 }, // undead, doesn't tire; worn rusted armor, less protective than living hide of the same hp
  spinosaurus: { chaseDropMult: 1.9,  atkSpeedMult: 0.65, armorFactor: 0.030 }, // 6 arms = faster successive strikes than any other apex despite the huge frame
  spider:      { chaseDropMult: 1.6,  atkSpeedMult: 1.10, armorFactor: 0.012 }, // quick venomous bites, thin exoskeleton despite its size
  lizard:      { chaseDropMult: 2.0,  atkSpeedMult: 1.20, armorFactor: 0.014 }, // fastest bite in the roster, thin scaled hide -- a raptor-like glass cannon
  // --- NEW round 3 ---
  slimeGolem: { chaseDropMult: 1.3, atkSpeedMult: 1.30, armorFactor: 0.045 }, // lumbering construct -- doesn't chase far (like slime), but a stone core makes it the most armored low/mid-tier family in the roster
  saberCanis: { chaseDropMult: 2.2, atkSpeedMult: 1.10, armorFactor: 0.016 }, // even more relentless than a panterimp pack, quick bites, thin hide -- speed over armor
  // --- ROUND 75 ---
  scorpion:    { chaseDropMult: 1.5, atkSpeedMult: 1.25, armorFactor: 0.024 }, // chitin plate over a small frame -- better armoured than anything else its size
  direbuck:    { chaseDropMult: 1.2, atkSpeedMult: 0.95, armorFactor: 0.010 }, // bolts rather than pursues: the shortest chase in the roster
  hornram:     { chaseDropMult: 1.6, atkSpeedMult: 0.80, armorFactor: 0.022 }, // charges, recovers, charges again -- slow swings, thick skull
  giantToad:   { chaseDropMult: 1.1, atkSpeedMult: 1.15, armorFactor: 0.014 }, // gives up almost immediately; the tongue is fast, the toad is not
  cobra:       { chaseDropMult: 1.7, atkSpeedMult: 1.30, armorFactor: 0.012 }, // strikes faster than anything but a raptor, and is just as thin
  mantis:      { chaseDropMult: 1.8, atkSpeedMult: 1.35, armorFactor: 0.016 }, // the fastest attacker in the game -- serrated forelimbs, two of them
  crocodile:   { chaseDropMult: 1.3, atkSpeedMult: 0.70, armorFactor: 0.038 }, // ambush, then one enormous slow bite; armoured like the boar
  whitelion:   { chaseDropMult: 2.2, atkSpeedMult: 1.05, armorFactor: 0.018 }, // runs things down over open ground
  medusa:      { chaseDropMult: 1.5, atkSpeedMult: 1.00, armorFactor: 0.014 }, // holds her ground and lets the snakes do the work
  yeti:        { chaseDropMult: 1.6, atkSpeedMult: 0.70, armorFactor: 0.034 }, // slow, enormous, and buried in fur
  minotaur:    { chaseDropMult: 2.0, atkSpeedMult: 0.85, armorFactor: 0.030 }, // will follow you a very long way; heavy armour, heavy swings
  phoenix:     { chaseDropMult: 1.7, atkSpeedMult: 1.10, armorFactor: 0.016 }, // flame has nothing to armour, and it flies
  thunderbird: { chaseDropMult: 1.9, atkSpeedMult: 0.90, armorFactor: 0.022 }, // a roc's wingbeat is not quick, and there is a lot of bird behind it
};

// atkCooldown (seconds between attacks): a base curve from speed (faster
// movers naturally swing faster -- 0.45s at the roster's top speed, 1.5s at
// a near-standstill), then tempered per-family above. Weighed against
// weapon damage (sword 8 / axe 13 / hammer 17 / spear 9 / dagger 4, see
// weapons.js) rather than picked in isolation: even the roster's slowest
// attacker (~1.4s) is still a real threat, and even its fastest (~0.5s)
// doesn't out-swing the player's own quickest weapon (dagger, 0.2s cd).
//
// armor: a flat subtraction from incoming weapon/spell damage (see
// WorldScene._damageMonster), floored so a hit always does at least 1 --
// armor makes weak weapons feel weak against tanky monsters, not
// impossible. Capped in practice around 6-8 (the roster's toughest
// dragons/chimera) specifically so it stays meaningfully below even a bare
// dagger's 4 base damage isn't fully negated, and a hammer's 17 always
// still lands hard.
// critChance: NEW this round (critical hits) -- "monsters should generally
// have a crit correlating to speed" (the user's own words). Derived off the
// same REF_SPEED curve as atkCooldown above so it's consistent with the
// rest of this file's "derive, don't hand-type" approach: the roster's
// slowest mover (slimeBlue, speed 52) lands around 4.6% crit, its fastest
// (hellhound, speed 130) around 16%. Bounty-tagged spawns add a further
// rank-tier bonus on top of this base (see quests.js's
// bountyCritChanceBonus/bountyCritDamageBonus and WorldScene._spawnMonster)
// -- the user's "at higher ranks things can be more dangerous across the
// board" applied specifically to the crit stat.
const MONSTER_CRIT_MIN = 0.04, MONSTER_CRIT_MAX = 0.16;
function deriveCombatStats(type) {
  const t = FAMILY_TEMPERAMENT[type.family];
  const REF_SPEED = 130; // the roster's fastest mover (hellhound) -- normalizes the speed->cooldown curve
  const speedFrac = Math.min(type.speed, REF_SPEED) / REF_SPEED;
  const baseCooldown = 1.55 - speedFrac * 1.1;
  const atkCooldown = Math.round(Math.min(1.5, Math.max(0.45, baseCooldown * t.atkSpeedMult)) * 100) / 100;
  // ROUND 27 -- armour is a PERCENTAGE now, matching the player's new Armor
  // minor stat ("As with all stats they should be applied to monsters as
  // well"). Derived from the same per-family armorFactor the flat version
  // used, so the roster's relative toughness ordering is untouched -- an
  // ichorling is still the softest thing in the game and a gemtusk is still
  // the hardest. The x12 factor puts that 0.010-0.032 range onto a
  // 0.12-0.38 percentage, which lands a hit against the toughest families
  // roughly where the old flat subtraction did against a starting sword
  // while no longer being a rounding error against a late-game ability.
  const armor = Math.min(0.6, Math.round(t.armorFactor * 12 * 1000) / 1000);
  const critChance = Math.round((MONSTER_CRIT_MIN + speedFrac * (MONSTER_CRIT_MAX - MONSTER_CRIT_MIN)) * 1000) / 1000;
  return Object.assign(type, { atkCooldown, armor, chaseDropMult: t.chaseDropMult, critChance });
}
for (const key of Object.keys(MONSTER_TYPES)) deriveCombatStats(MONSTER_TYPES[key]);

// ROUND 24 -- the per-family art constants that used to live here
// (SLIME_CELL, WOLF_COLORS, wolfColorRow, TREX_DISPLAY_SCALE and about forty
// more) are gone. Every one of them described the layout of one family's
// atlas, and every family's atlas now has the SAME layout, generated by
// extract_round24_monsters.py and described in src/data/monsterArt.js:
//
//   cell, shades[], runFrames, attackFrames, displayScale
//
// so WorldScene reads one manifest instead of importing forty constants and
// branching per family. The switch statement that used to render monsters --
// one hand-written case per family, each with its own frame arithmetic --
// collapsed into a single generic block as a direct result.
export { MONSTER_ART, MONSTER_FAMILIES, shadeRow } from './monsterArt.js';


// AI tuning constants, ported from the update-loop constants documented in
// the original (wander speed is 35% of full speed, home radius keeps
// wanderers near their spawn point). The original's single global
// chase-give-up multiplier (1.6x aggro) and single global attack cooldown
// (1.0s) are GONE from here -- every monster now carries its own
// chaseDropMult/atkCooldown (see FAMILY_TEMPERAMENT/deriveCombatStats
// above), which is the actual point of this round's change: different
// monsters behaving differently instead of sharing one behavior.
export const WANDER_SPEED_FACTOR = 0.35;
export const WANDER_HOME_RADIUS = 160;
export const WANDER_RETURN_MIN = 1.2, WANDER_RETURN_RAND = 1.6;
export const PLAYER_HIT_INVULN = 0.6;

// --- Loot, ported from killMonster() (lines 5051-5097). Coin amount and the
// four independent chance-rolls are faithful; WHAT drops (essence/modifier/
// part/consumable/gear identity) is simplified to a generic "loot" pickup
// since this port doesn't have those inventory systems yet -- the DROP RATES
// and the coin formula are real, not the item variety.
export function coinDropAmount(xp, rand) {
  return Math.max(1, Math.round(xp * (0.5 + rand() * 0.7)));
}

// ROUND 31 -- "Coin drops from monsters should be increased, with 20-30
// normal rank coins coming from the lowest rank enemies and scaling up with
// strength. Obviously for iron rank enemies this would apply to iron rank
// coins, bronze rank enemies to bronze rank coins and so on."
//
// A monster's THREAT TIER (0-4, see monsterThreatTier) is its rank, so the
// tier picks the coin RANK and the monster's strength within that tier picks
// the AMOUNT. Two consequences worth stating plainly:
//
//  * The purse ladder converts at 100x per rank (inventory.js), so a tier-1
//    kill is worth roughly a hundred tier-0 kills. That is not a rounding
//    artefact, it is what rank-matched currency means, and it is what makes
//    the auction house reachable: one iron-rank kill buys about one common
//    awakening stone.
//  * Diamond is deliberately unreachable from kills. There are five threat
//    tiers and six coin ranks, so the ladder tops out at gold -- diamond
//    stays something the world grants rather than something farmed.
export const COIN_RANK_BY_TIER = ['normal', 'iron', 'bronze', 'silver', 'gold'];
export const COIN_DROP_MIN = 20, COIN_DROP_MAX = 30;

// Strength inside the tier, 0..1, measured against the species that are
// ACTUALLY in that tier rather than against the tier's nominal HP band.
// The band would be the obvious choice and it is the wrong one: tier 0 runs
// 0..16 on paper, but nothing in the roster is anywhere near 0, so every
// tier-0 species read as "top of its band" and the weakest slime paid out
// double. Measuring against real peers is what makes the weakest thing in
// the game actually sit at the bottom of the 20-30 range the user asked for.
const _effHp = (t) => t.hp + Math.max(0, (t.dmg || 0) - 4) * 4;
let _tierRange = null;
function tierRange() {
  if (_tierRange) return _tierRange;
  _tierRange = {};
  for (const k of Object.keys(MONSTER_TYPES)) {
    const tier = monsterThreatTier(k);
    const e = _effHp(MONSTER_TYPES[k]);
    const r = (_tierRange[tier] = _tierRange[tier] || { lo: Infinity, hi: -Infinity });
    r.lo = Math.min(r.lo, e); r.hi = Math.max(r.hi, e);
  }
  return _tierRange;
}
function tierStrength(key) {
  const t = MONSTER_TYPES[key];
  if (!t) return 0;
  const r = tierRange()[monsterThreatTier(key)];
  if (!r || r.hi <= r.lo) return 0;
  return Math.max(0, Math.min(1, (_effHp(t) - r.lo) / (r.hi - r.lo)));
}

// -> { rank, amount }. The weakest thing at a tier drops COIN_DROP_MIN..MAX
// of that tier's coin; the strongest drops double that.
export function coinDropFor(key, rand = Math.random) {
  const tier = monsterThreatTier(key);
  const rank = COIN_RANK_BY_TIER[Math.min(tier, COIN_RANK_BY_TIER.length - 1)];
  const base = COIN_DROP_MIN + rand() * (COIN_DROP_MAX - COIN_DROP_MIN);
  const amount = Math.max(1, Math.round(base * (1 + tierStrength(key))));
  return { rank, amount };
}
// ROUND 63 -- THE USER: "Need to reduce essence and awakening stone drops from
// enemies. However awakening stones and essences should spawn in appropriate
// areas occasionally in the overworld."
//
// Was 0.22 -- better than one kill in five handed over an essence or a stone,
// which made grinding the fastest way to collect both and left the world with
// nothing to offer that killing things did not offer faster. Cut to a quarter
// of that. The overworld sites (sites.js) are the interesting source now, and
// they are deliberately stingier still.
export const LOOT_ROLL_CHANCE = 0.055; // essence-or-modifier
export const PART_ROLL_CHANCE = 0.18;
export const CONSUMABLE_ROLL_CHANCE = 0.12;
export const GEAR_ROLL_CHANCE = 0.05;
// ROUND 85 -- QUINTESSENCE, ROLLED ON ITS OWN COIN.
//
// The four chances above are branches of ONE roll and they compete: a fifth
// branch would take drops away from the other four and quietly undo five
// rounds of tuning. Quintessence gets its own roll, and a generous one --
// what element a thing was made of is a fact about the fight rather than a
// prize for winning it, and roughly one kill in three should leave you
// holding some. It is a sale item and nothing else, so it cannot unbalance
// anything but the purse.
export const QUINT_ROLL_CHANCE = 0.34;
export const RESPAWN_COOLDOWN_MIN = 6, RESPAWN_COOLDOWN_RAND = 6;

// ROUND 19 -- danger tiering, so distance from town actually means
// something. The user's ask, verbatim: "Need to weaken the monsters just
// outside of town. Initial monsters should be killable with just a regular
// sword in roughly 2 strikes. The really dangerous monsters should only be
// encountered well outside of town."
//
// A plain sword is 8 damage (weapons.js), so "two strikes" is 16 HP. That
// number is the tier-0 ceiling and everything else is scaled off the same
// idea: how many plain-sword hits a species takes, tempered by how hard it
// hits back. Nothing about the monsters' own stats changes -- what changes
// is WHERE each tier is allowed to stand.
export const SWORD_BASE_DAMAGE = 8;
export const TIER_HP_CEILINGS = [16, 40, 80, 150, Infinity];

export function monsterThreatTier(key) {
  const t = MONSTER_TYPES[key];
  if (!t) return 0;
  // Damage counts too: a 15 HP monster that hits for 11 does not belong at
  // the town gate next to a slime that hits for 2. Effective HP is padded by
  // four points per point of damage above the tier-0 baseline.
  const effective = t.hp + Math.max(0, (t.dmg || 0) - 4) * 4;
  for (let i = 0; i < TIER_HP_CEILINGS.length; i++) {
    if (effective <= TIER_HP_CEILINGS[i]) return i;
  }
  return TIER_HP_CEILINGS.length - 1;
}

// ===========================================================================
// ROUND 126 -- WHAT A MONSTER IS WORTH DEPENDS ON WHO KILLED IT.
//
// The user's bug report, second half:
//
//   "iron rank monsters should be worth almost nothing by silver rank."
//
// Before this, a monster's xp was its type's `xp` field and nothing anywhere
// read the player's rank: a Panterimp Grey was worth thirty experience at Iron
// and thirty at Gold. Combined with a flat rank curve (see essenceRank.js),
// that meant the fastest route to Gold was to never leave the first field --
// the safest monsters in the game paid the same as the worst ones.
//
// A MONSTER'S RANK IS ITS THREAT TIER. That equivalence is the project's own,
// established when the tier rings were built and read the same way by the
// iron-and-above stat doubling in `_spawnMonster`: tier 0 is Normal, tier 1
// Iron, and so on up. So the gap is a subtraction and needs no second table.
//
// NOT ZERO. "Almost nothing" is the brief, and it is the right brief: a player
// clearing a road they have outgrown should still see the number move, because
// a hard zero reads as a bug to everyone who has not read this comment. Two
// per cent of a Panterimp is one experience -- visibly nothing, honestly not
// nothing.
// ===========================================================================

/** What a kill is worth, as a fraction, by how many ranks the player is ABOVE
 *  the monster. Index 0 is "the same rank or better than me". */
export const XP_RANK_DECAY = [1, 0.30, 0.08, 0.02];

/**
 * The multiplier on a monster's xp for a player of a given rank index.
 *
 * Being UNDER-ranked is worth full value and no more. A bonus for punching
 * above your weight sounds fair and is the oldest exploit in the genre: it
 * pays best exactly where a player is most likely to be power-levelled by
 * somebody else's party, and this game has a party.
 */
export function xpRankMult(monsterTier, playerRankIdx) {
  const gap = Math.max(0, (playerRankIdx || 0) - (monsterTier || 0));
  return XP_RANK_DECAY[Math.min(gap, XP_RANK_DECAY.length - 1)];
}

/** A kill's actual experience, decayed. Rounded UP off a non-zero value, so a
 *  monster that is worth anything at all is never silently worth nothing --
 *  the difference between "almost nothing" and a bug report. */
export function xpForKill(baseXp, monsterTier, playerRankIdx) {
  const raw = (baseXp || 0) * xpRankMult(monsterTier, playerRankIdx);
  if (raw <= 0) return 0;
  return Math.max(1, Math.round(raw));
}

// ===========================================================================
// ROUND 132 -- A DAMAGE LADDER, WHERE THERE WAS A STEP.
//
// The user:
//
//   "Iron rank monsters should have their damage increased by 15%, bronze by
//    25%, and silver by 40% and gold by 50%."
//
// WHAT THIS REPLACES, and why the ask is a correction rather than a tuning
// pass. Round 116's `IRON_PLUS_MONSTER_MULT` doubles hp AND damage for every
// monster at iron tier or above -- "iron rank or above" was the phrase and a
// single constant was the honest reading of it at the time. But it means the
// whole danger curve above Normal is FLAT: a gold-tier horror hits for exactly
// the same multiple of its sheet as the first iron wolf. All the difference
// between ranks lived in the sheet numbers, and the sheet is authored per
// species rather than per rank, so the ranks blurred into each other.
//
// This is the rank ladder that was missing. It is a SEPARATE factor from the
// doubling, multiplied on top, and it is deliberately damage-only: the ask
// names damage, round 116's ask named health and damage together, and folding
// them into one number would quietly re-tune the health of every monster in
// the game on a request that said nothing about health.
//
// Indexed by THREAT TIER, which is the monster's rank -- the same equivalence
// `xpRankMult` above and the doubling in `_spawnMonster` already use, so this
// needs no second table and cannot drift from one. Tier 0 is Normal and stays
// at 1.0: every ask about monster scaling this project has had has started at
// iron, and the prologue is balanced against a character with nothing.
// ===========================================================================

/** Damage multiplier by the monster's own threat tier (= its rank).
 *  [normal, iron, bronze, silver, gold] */
export const RANK_DMG_MULT = [1, 1.15, 1.25, 1.40, 1.50];

/** The damage ladder's factor for a monster of this tier. Clamped at both ends
 *  so a tier outside the table (a sixth ring, a bad key) takes the top rung
 *  rather than `undefined`, which would multiply a monster's damage to NaN and
 *  make it hit for nothing at all. */
export function rankDmgMult(monsterTier) {
  const t = Math.max(0, Math.min(RANK_DMG_MULT.length - 1, monsterTier || 0));
  return RANK_DMG_MULT[t];
}

// ===========================================================================
// ROUND 134 (items 14.1, 14.4) -- THE THIRD AND FOURTH RIDERS.
//
//   "14.1) increase of health of all enemies iron rank or higher by another
//    50% ... 14.4) increase the damage of enemies by 20%"
//
// Beside the ladder rather than folded into it, on the argument the paragraph
// above makes for keeping the ladder separate from round 116's doubling: each
// of these is a statement the user made on its own day about its own thing,
// and one combined figure loses which is which the first time one of them is
// wrong. An iron monster's health is 2.0 x 1.5 = 3.0x its sheet; its damage is
// 2.0 x 1.2 x 1.15 = 2.76x, rounded per step.
//
// TWO DIFFERENT SCOPES, which is the user's own wording rather than an
// oversight. 14.1 says "all enemies iron rank or higher" and 14.4 says "the
// damage of enemies" with no rank named, so the health rider joins the
// iron-and-above branch in `_spawnMonster` and the damage rider applies at
// every tier including Normal.
//
// The PROLOGUE is exempt from both -- see `_wakeSpawnGroup`, which undoes them
// for a sewer group beside where it already undoes the doubling and the
// ladder. The ask names its own scope ("once players have recruited 2
// companions") and the sewer is the one stretch with no companions at all.
//
// Exported from HERE rather than kept as module constants in WorldScene so a
// checker can read them: round 132 put the ladder here for the same reason,
// and "the number has one home" is the rule this file keeps being right about.
// ===========================================================================

/** Health multiplier on iron-and-above monsters, on top of the doubling. */
export const ROUND134_HP_MULT = 1.5;
/** Damage multiplier on every monster, at every rank. */
export const ROUND134_DMG_MULT = 1.2;

// ===========================================================================
// ROUND 132 -- HOW A MONSTER MOVES WHILE IT IS FIGHTING YOU.
//
// The user:
//
//   "Monsters should have added movement behaviors. Monsters with ranged
//    attacks should occasionally try to put distance between them and the
//    player, some melee monsters should circle the player. Make combat more
//    dynamic."
//
// WHAT EXISTED. One behaviour, for all hundred and sixty-one species: close
// the straight line, then stand still. `m.state` had two values, 'wander' and
// 'chase', and the chase branch was four lines of normalise-and-step. Every
// fight in the game therefore had the same shape -- the monster arrives on the
// line between you and it, and from that moment neither of you moves. That is
// the "dynamic" the ask is about.
//
// THERE ARE NO RANGED MONSTERS. This has to be said plainly because the first
// half of the ask presumes them: nothing in the roster has an attack range, a
// projectile, or a `range` field. A monster's only hostile act is a contact
// blow. So "monsters with ranged attacks" is read as the nearest thing the
// game actually has, which is the same reading round 115 arrived at
// independently for `silenceChance` -- the fifty species whose damage is
// `magical` are its casters, and for those the blow IS the channel.
//
// A caster that simply retreated would never attack again, so KITE IS
// HIT-AND-RUN rather than stand-off: press, strike, break away, come back. The
// user's word is "occasionally", and that is what the phase clock buys --
// a kiter spends most of its time closing and short bursts backing off, so the
// behaviour reads as a decision rather than as a movement mode.
//
// THE GAIT IS A SPECIES TRAIT, not a per-monster roll. Every Direjaw circles
// or none of them does. A pack whose members each rolled their own gait looks
// like noise; a pack that all circle looks like a pack of circling animals,
// and the player can learn it. Hashed off the species key so it is stable
// across runs, saves and machines without a table anyone has to maintain.
// ===========================================================================

/** Stable small hash of a species key. Not cryptographic and not trying to be:
 *  it needs to be the same number everywhere for the same string, and spread
 *  161 keys evenly enough that the shares below come out near their targets. */
function gaitHash(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** Share of casters that kite, and of physical species that circle. */
export const GAIT_KITE_SHARE = 0.65;
export const GAIT_CIRCLE_SHARE = 0.40;

/**
 * 'kite' | 'circle' | 'charge' for a species.
 *
 * The slimes are excluded by name and it is not cosmetic: they are the
 * prologue, they are the first thing anybody fights, and the sewer is a
 * corridor. A slime that backs away down a passage the player cannot flank is
 * a worse fight than a slime that comes at you, and round 89's ruling on the
 * prologue ("slightly too dangerous for the player initially") is the standing
 * instruction about what happens down there.
 */
export function monsterGait(key) {
  const t = MONSTER_TYPES[key];
  if (!t) return 'charge';
  if (String(key).startsWith('slime')) return 'charge';
  const r = gaitHash(key);
  if (t.dmgType === 'magical') return r < GAIT_KITE_SHARE ? 'kite' : 'charge';
  return r < GAIT_CIRCLE_SHARE ? 'circle' : 'charge';
}

/** The census, so a check can assert the roster actually got all three rather
 *  than asserting the function returns a string. */
export function gaitCensus() {
  const out = { charge: 0, circle: 0, kite: 0 };
  for (const k of Object.keys(MONSTER_TYPES)) out[monsterGait(k)]++;
  return out;
}

// Every species that is safe to meet at the town gate -- used to guarantee
// the near ring is populated rather than merely permitted.
export function monsterKeysAtTier(tier) {
  return Object.keys(MONSTER_TYPES).filter(k => monsterThreatTier(k) === tier);
}
