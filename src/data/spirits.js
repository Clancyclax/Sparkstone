// ===========================================================================
// ROUND 346 (item 4, 4.1) -- ANIMAL SPIRITS OVER THE CAST.
//
//   "I've added a number of animal spirit head sprites. These can be used to
//    spice up animations from various creature essences. A static shrunken
//    version of the sprite 70% transparent and colored to match the element
//    appearing over the character, NPC, or enemy depending on the attack.
//    4.1 I've also added some actual animations that only need to be made 50%
//    transparent and can also be used to spice up spell and attack animations
//    for their related creature."
//
// This file is the PURE half: which creature spirit belongs to which essence
// or monster, and how each is drawn. The scene half is spiritMixin.js.
//
// TWENTY HEADS, SEVEN ANIMATIONS. Every spirit has a static 160x160 head
// (public/assets/spirits/head_<name>.png). Seven of them -- crocodile, deer,
// dragon, eagle, gorilla, griffon, lion -- also have a sheet of 160px frames
// (anim_<name>.png: crocodile 13 frames in 4 columns, the rest 17 in 5).
//
// THE TABLES ARE AUTHORED, AND THEY READ BOTH LISTS. An ability's `_srcName` is
// the name of the essence it came out of -- one of the 145 ordinary essences OR
// one of the 101 CONFLUENCE essences (awakening.js CONFLUENCE_NAMES), and a
// confluence is every bit an essence with its own abilities. Most of the
// creatures are confluences: Dragon, Manticore, Griffin, Gorgon, Phoenix,
// Firebird, Thunderbird, Roc, Hydra, Serpent and so on. The rest are ordinary
// essences named for the animal (Crocodile, Deer, Lizard, Shark, Snake, Spider,
// Turtle, Ape, Bird, Cat, Sickle). Change a line here and the cast changes.
// ===========================================================================

export const SPIRIT_NAMES = [
  'crocodile', 'deer', 'dragon', 'eagle', 'gorilla', 'griffon', 'lion', 'lizard', 'manticore', 'mantis',
  'medusa', 'phoenix', 'scorpion', 'shark', 'snake', 'spider', 'trex', 'tiger', 'turtle', 'unicorn',
];

/** The animated ones: sheet columns and frames, 160px cells. */
export const SPIRIT_ANIMS = {
  crocodile: { cols: 4, frames: 13 },
  deer: { cols: 5, frames: 17 },
  dragon: { cols: 5, frames: 17 },
  eagle: { cols: 5, frames: 17 },
  gorilla: { cols: 5, frames: 17 },
  griffon: { cols: 5, frames: 17 },
  lion: { cols: 5, frames: 17 },
};
export const SPIRIT_CELL = 160;
export const SPIRIT_ANIM_MS = 62;

/** 70% transparent. */
export const SPIRIT_HEAD_ALPHA = 0.30;
/** 50% transparent. */
export const SPIRIT_ANIM_ALPHA = 0.50;
/** The 160px head is shrunk to this much of its size (56px on screen). */
export const SPIRIT_HEAD_SCALE = 0.35;
export const SPIRIT_ANIM_SCALE = 0.55;
/** How long a static head stays up, and how far it drifts. */
export const SPIRIT_HEAD_MS = 1100;
/** The same entity does not summon its spirit more often than this. */
export const SPIRIT_COOLDOWN_MS = 1600;

/**
 * Essence NAME (as `ability._srcName` carries it -- ordinary essence or
 * confluence) -> spirit.
 */
export const ESSENCE_SPIRIT = {
  // ----- ordinary essences named for the animal -----
  Crocodile: 'crocodile',
  Deer: 'deer',
  Lizard: 'lizard',
  Shark: 'shark',
  Snake: 'snake',
  Spider: 'spider',
  Turtle: 'turtle',
  Ape: 'gorilla',
  Bird: 'eagle',
  Cat: 'tiger',
  Sickle: 'mantis',
  Venom: 'scorpion',      // no scorpion essence or confluence exists
  Renewal: 'phoenix',     // what a phoenix gives (creatureEssences)
  // ----- confluence essences that ARE the creature -----
  Dragon: 'dragon',
  Manticore: 'manticore',
  Griffin: 'griffon',
  Gorgon: 'medusa',
  Phoenix: 'phoenix',
  Firebird: 'phoenix',
  Thunderbird: 'eagle',
  Roc: 'eagle',
  Garuda: 'eagle',
  Anzu: 'eagle',
  Ziz: 'eagle',
  Hydra: 'snake',
  Serpent: 'snake',
  Leviathan: 'shark',
  // ----- confluences that are the creature's kin -----
  Chimera: 'lion',
  Predatory: 'tiger',
  Behemoth: 'trex',
  Troll: 'gorilla',
  Wendigo: 'deer',        // the antlered one
  Fey: 'unicorn',
};

/** Monster family -> spirit. */
export const MONSTER_SPIRIT = {
  crocodile: 'crocodile',
  direbuck: 'deer',
  hornram: 'deer',
  dragon: 'dragon',
  thunderbird: 'eagle',
  sixArmApe: 'gorilla',
  birdangel: 'griffon',
  whitelion: 'lion',
  lizard: 'lizard',
  chimera: 'manticore',
  mantis: 'mantis',
  medusa: 'medusa',
  phoenix: 'phoenix',
  scorpion: 'scorpion',
  sharkcrab: 'shark',
  cobra: 'snake',
  hydra: 'snake',
  flowerhydra: 'snake',
  spiritSerpent: 'snake',
  spider: 'spider',
  trex: 'trex',
  spinosaurus: 'trex',
  glasscat: 'tiger',
  shellborn: 'turtle',
};

export function spiritForEssenceName(name) {
  return (name && ESSENCE_SPIRIT[name]) || null;
}

export function spiritForMonster(family) {
  return (family && MONSTER_SPIRIT[family]) || null;
}

/** The spirit an ability calls: the essence it came out of, if that essence has one. */
export function spiritForAbility(ability) {
  if (!ability) return null;
  return spiritForEssenceName(ability._srcName) || null;
}

export function spiritHeadKey(name) { return `spirit_head_${name}`; }
export function spiritAnimKey(name) { return `spirit_anim_${name}`; }
export function spiritHeadFile(name) { return `./public/assets/spirits/head_${name}.png`; }
export function spiritAnimFile(name) { return `./public/assets/spirits/anim_${name}.png`; }

/**
 * Recolour a head to an element: luminance-mapped, so the carved detail stays
 * and the whole thing reads as that element's colour. Pure maths on one pixel
 * (r,g,b 0..255, `tint` 0xRRGGBB) so a test can check it without a canvas.
 */
export function tintPixel(r, g, b, tint) {
  const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  const k = 0.22 + 1.25 * lum;
  const tr = (tint >> 16) & 255, tg = (tint >> 8) & 255, tb = tint & 255;
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return [c(tr), c(tg), c(tb)];
}
