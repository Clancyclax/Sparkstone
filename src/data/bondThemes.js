// ===========================================================================
// ROUND 390 -- WHAT A SUMMONING ESSENCE CAN BOND IN THE WILD.
//
// The user: "Permanent summons fall into 2 categories. (1.1) summons that you have to find in the wild that align
// with the summon criteria (i.e a hydra that you bond with a frog essence summon, a flame elemental you bond with a
// fire or volcano essence, a raptor you bond with the lizard essence, etc.) (1.2) Summons that require a ritual to
// summon." ... "This is balanced in that a bonded companion is generally stronger but can die and a new bonded
// companion will need to be located and bonded using the essence ability."
//
// Asked how a wild creature is matched: "Theme lists per essence" -- a written list of the creature families each
// essence can bond, rank-gated so an Iron can't bond a Gold beast. This file is that list and its readers:
//
//   BOND_THEMES             essence id -> the families (and, where it matters, the shades) it can bond
//   CONFLUENCE_BOND_THEMES  confluence name -> the same; a confluence not listed falls to its family's list
//   bondThemeFor            the list for one ability (its essence or confluence, and an animal stone's own list)
//   bondCandidates          the monster types of that list that live in a region at or below a rank
//   regionsWithBond         where they live, for "none here -- try ..."
//   wildBondLadder          what the bonded creature gains at Bronze, Silver and Gold
//   wildBondDesc            the card (states the mechanic; never compares)
//
// An entry is 'family' or 'family:shade,shade' -- the families and shades are the game's own (monsters.js /
// monsterArt.js), so a theme can only name a creature the world actually spawns. test_round390_wildbond checks that
// every essence and confluence has at least one, and that every family and shade written here exists.
// The runtime (calling, bonding, the fight, death) is src/scenes/wildBondMixin.js.
// ===========================================================================

import { MONSTER_TYPES, MONSTER_ART, MONSTER_FAMILY_BASE, FAMILY_DISPLAY_NAME, monsterThreatTier,
  monsterKeysAtTier, monsterKeysInBand } from './monsters.js';
import { REGIONS } from './regions.js';
import { RANK_ORDER } from './ranks.js';
import { DEBUFFS } from './debuffs.js';
import { monsterDebuffRoll, monsterElement } from './monsterDebuffs.js';
import { FAMILY_ELEMENT } from './stats.js';
// ROUND 391 -- a confluence with an identity sheet bonds the wild creatures its sheet lists.
import { sheetWildBond } from './confluenceIdentity.js';

/** "It's about 66% chance to attack and 33% chance to bond." */
export const WILD_BOND_CHANCE = 1 / 3;
/** A bonded wild creature's blow, against the ability's base figure. A ritual summon of the same rank starts from
 *  the base figure (ritualSummons.js), so this is what makes the bonded companion "generally stronger". */
export const WILD_BOND_POWER = 1.35;
/** Seconds before the wilds answer another call, after a called creature turns and attacks. */
export const WILD_BOND_RECALL_CD = 20;
/** How far off a called creature appears, and how near it comes before it stops to be bonded (world units). */
export const WILD_BOND_CALL_DIST = 280;
export const WILD_BOND_NEAR = 74;
/** The bonded creature's health, by the ability's rank: its own wild health times this. */
export const WILD_BOND_HP_BY_RANK = { normal: 1, iron: 1, bronze: 1.3, silver: 1.7, gold: 2.2, diamond: 2.8 };

// --- what each family is called on a card -----------------------------------
// Plain words for the cards; the in-world name (FAMILY_DISPLAY_NAME, what the player sees over the creature) is
// printed beside it.
export const FAMILY_NOUN = {
  slime: 'slime', lizard: 'lizard', bat: 'bat', spider: 'spider', shade: 'shade', raptor: 'raptor', wolf: 'wolf',
  boar: 'boar', demon: 'demon', slimeGolem: 'slime golem', elemental: 'elemental', hydra: 'hydra', chimera: 'chimera',
  skeleton: 'skeleton', hellhound: 'hellhound', spinosaurus: 'sail-backed lizard', trex: 'tyrant lizard', dragon: 'dragon',
  scorpion: 'scorpion', direbuck: 'stag', hornram: 'ram', giantToad: 'giant toad', cobra: 'cobra', mantis: 'mantis',
  crocodile: 'crocodile', whitelion: 'lion', medusa: 'gorgon', yeti: 'yeti', minotaur: 'minotaur', phoenix: 'phoenix',
  thunderbird: 'thunderbird', quillFiend: 'quill fiend', gnoll: 'gnoll', spiritSerpent: 'spirit serpent',
  steelRaptor: 'steel raptor', shellborn: 'shell crab', harbinger: 'harbinger', sixArmApe: 'six-armed ape',
  tidalTroll: 'tidal troll', glasscat: 'glass cat', sharkcrab: 'shark crab', flowerhydra: 'flower hydra',
  birdangel: 'haloed bird', demonsloth: 'demon sloth', bloomimp: 'bloom imp', vinegrasp: 'thorn vine',
  snapmaw: 'snapping plant', gnawling: 'giant rat', grubwyrm: 'grub wyrm', duskmoth: 'great moth', gourdkin: 'gourd creature',
  inkwell: 'ink creature', cinderlamb: 'cinder lamb', longshanks: 'longshanks spider', bellhive: 'hive swarm',
  clockcrawler: 'clockwork crawler', sporemother: 'spore mother', pitcherling: 'pitcher plant', bonepecker: 'bone-pecker bird',
  driftreaver: 'drifting jelly', urchinroll: 'urchin', gravesown: 'grave bloom', tunnelmaw: 'tunnel worm',
  stringless: 'stringless puppet', rimehare: 'frost hare', shiverfox: 'frost fox', tuskmaw: 'tusked seal', lurefin: 'anglerfish',
  drownwight: 'drowned wight', lanternwraith: 'lantern wraith', rustmantle: 'rust beast', smokecur: 'smoke hound',
  sporehorn: 'spore stag', saltwife: 'salt spirit', monocul: 'one-eyed watcher', mournhusk: 'wrapped husk',
  kilnwarden: 'kiln golem', ossuaryKnight: 'bone knight', pallbearer: 'pallbearer', geodeback: 'crystal tortoise',
  hollowchoir: 'choir ghost', glasswader: 'glass heron', stormjar: 'storm jar', cairnbeast: 'cairn bear', totemstalk: 'totem beast',
  scalecurl: 'armoured curler', shardling: 'shardling',
};
/** A shade that is its own creature on a card ("a flame elemental you bond with a fire or volcano essence"). */
export const SHADE_NOUN = {
  'elemental:fire': 'flame elemental', 'elemental:water': 'water elemental', 'elemental:earth': 'earth elemental',
  'elemental:lightning': 'storm elemental', 'elemental:darkness': 'shadow elemental', 'lizard:ember': 'salamander',
  'raptor:storm': 'storm raptor', 'quillFiend:storm': 'storm quill fiend', 'wolf:white': 'white wolf',
  'dragon:fire': 'fire dragon', 'cinderlamb:glacial': 'frost lamb', 'gourdkin:frostbitten': 'frostbitten gourd creature', 'dragon:water': 'sea dragon', 'chimera:glacial': 'frost chimera',
};

// --- the theme lists -----------------------------------------------------------
// Most characteristic first: the first entry is the one the card leads with and the one whose own monster abilities
// the bonded creature's rank ladder is read from (wildBondLadder). Every list holds at least one creature an Iron
// can bond somewhere.
export const BOND_THEMES = {
  // alchemy
  essAlchemy: ['slime', 'slimeGolem', 'sporemother', 'pitcherling'],
  essElixir: ['slime', 'sporemother', 'pitcherling', 'bellhive'],
  // motion
  essAdept: ['gnoll', 'raptor', 'shiverfox', 'mantis'],
  essDance: ['stringless', 'duskmoth', 'direbuck', 'mantis'],
  essFoot: ['direbuck', 'raptor', 'rimehare', 'hornram'],
  essHorse: ['direbuck', 'hornram', 'sporehorn', 'minotaur'],
  essShip: ['driftreaver', 'lurefin', 'drownwight', 'sharkcrab'],
  essSwift: ['rimehare', 'direbuck', 'raptor', 'hellhound'],
  essVehicle: ['clockcrawler', 'urchinroll', 'steelRaptor', 'scalecurl'],
  essWheel: ['urchinroll', 'clockcrawler', 'scalecurl', 'geodeback'],
  // beast
  essApe: ['sixArmApe', 'yeti', 'gnoll', 'cairnbeast'],
  essBear: ['cairnbeast', 'boar', 'yeti', 'tuskmaw', 'quillFiend'],
  essCattle: ['minotaur', 'boar', 'hornram', 'sporehorn', 'direbuck'],
  essDog: ['wolf', 'gnoll', 'smokecur', 'hellhound'],
  essGoat: ['hornram', 'cinderlamb', 'direbuck'],
  essHeidel: ['hornram', 'direbuck', 'raptor', 'boar'],
  essSloth: ['demonsloth', 'grubwyrm', 'cairnbeast'],
  essWolf: ['wolf', 'shiverfox', 'hellhound', 'totemstalk', 'gnoll'],
  // guard
  essArmour: ['rustmantle', 'shellborn', 'scalecurl', 'ossuaryKnight', 'slimeGolem', 'urchinroll', 'clockcrawler'],
  essCage: ['pallbearer', 'lanternwraith', 'clockcrawler', 'slimeGolem'],
  essIron: ['rustmantle', 'steelRaptor', 'clockcrawler', 'slimeGolem'],
  essPangolin: ['scalecurl', 'quillFiend', 'urchinroll', 'geodeback'],
  essShield: ['shellborn', 'geodeback', 'scalecurl', 'ossuaryKnight', 'urchinroll'],
  essTurtle: ['shellborn', 'geodeback', 'urchinroll', 'crocodile'],
  // identity
  avatar: ['shade', 'stringless', 'shardling', 'hollowchoir'],
  essElemental: ['elemental', 'stormjar', 'kilnwarden', 'saltwife', 'cinderlamb'],
  essMirror: ['shardling', 'glasscat', 'shade', 'chimera'],
  essVisage: ['chimera', 'medusa', 'cobra', 'stringless', 'hollowchoir'],
  // bludgeon
  essAxe: ['minotaur', 'gnoll', 'gourdkin', 'ossuaryKnight'],
  essHammer: ['kilnwarden', 'minotaur', 'cairnbeast', 'geodeback', 'boar', 'clockcrawler'],
  // order
  essBalance: ['spiritSerpent', 'birdangel', 'shiverfox', 'duskmoth'],
  essHarmonic: ['hollowchoir', 'bellhive', 'stormjar', 'bonepecker'],
  essSerene: ['spiritSerpent', 'lurefin', 'duskmoth', 'birdangel'],
  essSong: ['hollowchoir', 'bonepecker', 'bellhive', 'thunderbird'],
  // flyer
  essBat: ['bat', 'duskmoth', 'bonepecker'],
  essBee: ['bellhive', 'mantis', 'duskmoth'],
  essBird: ['bonepecker', 'thunderbird', 'glasswader', 'phoenix', 'birdangel'],
  essChicken: ['bonepecker', 'glasswader', 'thunderbird'],
  essDuck: ['glasswader', 'bonepecker', 'driftreaver'],
  essLocust: ['mantis', 'bellhive', 'duskmoth', 'grubwyrm'],
  essWasp: ['bellhive', 'mantis', 'scorpion'],
  essWing: ['bat', 'bonepecker', 'duskmoth', 'thunderbird', 'dragon'],
  // death
  essBlight: ['gravesown', 'sporemother', 'gnawling', 'medusa'],
  essBone: ['skeleton', 'bonepecker', 'ossuaryKnight', 'pallbearer'],
  essCorrupt: ['demon', 'gravesown', 'smokecur', 'slime'],
  essDeath: ['skeleton', 'drownwight', 'harbinger', 'pallbearer', 'mournhusk', 'gravesown', 'bonepecker'],
  essFeeble: ['demonsloth', 'skeleton', 'gnawling', 'mournhusk'],
  // blood
  essBlood: ['wolf', 'gnoll', 'hydra', 'demon'],
  essFeast: ['grubwyrm', 'gnawling', 'snapmaw', 'trex'],
  essFlesh: ['slime', 'grubwyrm', 'gravesown', 'chimera'],
  essHunger: ['grubwyrm', 'gnawling', 'snapmaw', 'pitcherling', 'trex'],
  // ranged
  essBow: ['quillFiend', 'longshanks', 'glasswader', 'monocul'],
  essGun: ['clockcrawler', 'quillFiend', 'steelRaptor', 'stormjar'],
  // life
  essBrush: ['inkwell', 'bloomimp', 'vinegrasp'],
  essFungus: ['sporemother', 'slime', 'sporehorn', 'gravesown'],
  essGrowth: ['bloomimp', 'grubwyrm', 'vinegrasp', 'cairnbeast'],
  essLife: ['bloomimp', 'sporemother', 'birdangel', 'phoenix'],
  essPlant: ['bloomimp', 'pitcherling', 'vinegrasp', 'snapmaw', 'flowerhydra'],
  heal: ['bloomimp', 'sporemother', 'birdangel', 'phoenix'],
  essTree: ['vinegrasp', 'gourdkin', 'totemstalk', 'cairnbeast'],
  essWood: ['gourdkin', 'stringless', 'totemstalk', 'vinegrasp'],
  // smallbeast
  essCat: ['whitelion', 'glasscat', 'shiverfox'],
  essDeer: ['direbuck', 'sporehorn'],
  essFlea: ['gnawling', 'longshanks', 'spider'],
  essFox: ['shiverfox', 'smokecur', 'rimehare', 'gnawling'],
  essMonkey: ['gnoll', 'sixArmApe', 'stringless'],
  essMouse: ['gnawling', 'rimehare', 'tunnelmaw'],
  essRabbit: ['rimehare', 'gnawling', 'direbuck'],
  essRat: ['gnawling', 'grubwyrm', 'bat'],
  essSkunk: ['smokecur', 'gnawling', 'sporemother'],
  // craft
  essChain: ['pallbearer', 'clockcrawler', 'ossuaryKnight', 'lanternwraith'],
  essCloth: ['gourdkin', 'mournhusk', 'stringless', 'duskmoth'],
  essHair: ['gnoll', 'wolf', 'yeti', 'sixArmApe'],
  essHand: ['inkwell', 'stringless', 'gnoll', 'sixArmApe'],
  essNet: ['spider', 'longshanks', 'driftreaver'],
  essPaper: ['inkwell', 'bellhive', 'mournhusk'],
  essTechnology: ['clockcrawler', 'steelRaptor', 'stormjar'],
  essThread: ['spider', 'longshanks', 'stringless', 'duskmoth'],
  essTrap: ['spider', 'scorpion', 'pitcherling', 'snapmaw', 'tunnelmaw'],
  // blade
  essClaw: ['raptor', 'lizard', 'scorpion', 'whitelion', 'mantis'],
  essKnife: ['gnoll', 'scorpion', 'mantis'],
  essNeedle: ['quillFiend', 'scorpion', 'bellhive', 'urchinroll'],
  essSickle: ['mantis', 'gourdkin', 'scorpion'],
  essSpike: ['quillFiend', 'urchinroll', 'scorpion', 'hornram', 'spinosaurus'],
  essSword: ['gnoll', 'ossuaryKnight', 'mantis', 'rustmantle'],
  essWhip: ['scorpion', 'vinegrasp', 'cobra', 'driftreaver'],
  // air
  essCloud: ['thunderbird', 'stormjar', 'duskmoth', 'bat'],
  essWind: ['bat', 'bonepecker', 'duskmoth', 'thunderbird'],
  // cold
  essCold: ['shiverfox', 'rimehare', 'tuskmaw', 'yeti', 'cinderlamb:glacial', 'gourdkin:frostbitten'],
  essIce: ['rimehare', 'shiverfox', 'tuskmaw', 'yeti', 'chimera:glacial', 'cinderlamb:glacial', 'gourdkin:frostbitten'],
  // aquatic
  essCoral: ['urchinroll', 'sharkcrab', 'shellborn'],
  essCrocodile: ['crocodile', 'lizard', 'spinosaurus'],
  essFish: ['lurefin', 'sharkcrab', 'spinosaurus', 'driftreaver', 'urchinroll'],
  // "a hydra that you bond with a frog essence summon" -- and the toads and the amphibians.
  essFrog: ['giantToad', 'hydra', 'lizard'],
  essManatee: ['tuskmaw', 'shellborn', 'tidalTroll', 'driftreaver'],
  essOctopus: ['driftreaver', 'sharkcrab', 'hydra'],
  essShark: ['sharkcrab', 'lurefin', 'spinosaurus', 'driftreaver'],
  essTentacle: ['driftreaver', 'snapmaw', 'hydra'],
  essWhale: ['tuskmaw', 'lurefin', 'tidalTroll', 'driftreaver'],
  // earth
  essCrystal: ['boar', 'glasscat', 'saltwife', 'geodeback', 'shardling', 'quillFiend'],
  essDust: ['scorpion', 'duskmoth', 'tunnelmaw', 'saltwife'],
  essEarth: ['tunnelmaw', 'elemental:earth', 'geodeback', 'cairnbeast', 'kilnwarden'],
  essGlass: ['glasscat', 'glasswader', 'shardling', 'slime'],
  essSand: ['scorpion', 'tunnelmaw', 'saltwife'],
  // dark
  shadow: ['shade', 'bat', 'smokecur', 'harbinger'],
  essDiscord: ['gnoll', 'demon', 'harbinger', 'hollowchoir'],
  essLurker: ['shade', 'spider', 'crocodile', 'lanternwraith'],
  essMalign: ['demon', 'smokecur', 'hellhound', 'demonsloth', 'shade', 'gnoll'],
  essSin: ['shade', 'demon', 'demonsloth'],
  essSmoke: ['smokecur', 'shade', 'kilnwarden'],
  essVoid: ['shade', 'spiritSerpent', 'harbinger', 'elemental:darkness'],
  // water
  essDeep: ['lurefin', 'driftreaver', 'drownwight', 'hydra', 'tidalTroll'],
  essWater: ['giantToad', 'driftreaver', 'crocodile', 'elemental:water', 'tidalTroll'],
  // space
  essDimension: ['spiritSerpent', 'harbinger', 'shardling'],
  essGathering: ['gnawling', 'longshanks', 'bellhive'],
  essMyriad: ['gnawling', 'bellhive', 'hydra', 'chimera'],
  essVast: ['tuskmaw', 'spinosaurus', 'trex', 'dragon', 'grubwyrm'],
  // mind
  essEcho: ['bat', 'duskmoth', 'hollowchoir'],
  essEye: ['tunnelmaw', 'monocul', 'medusa'],
  essHunt: ['raptor', 'wolf', 'gnoll', 'whitelion'],
  essKnowledge: ['inkwell', 'monocul', 'harbinger'],
  essMagic: ['inkwell', 'spiritSerpent', 'stormjar', 'elemental'],
  essOmen: ['bat', 'bonepecker', 'duskmoth', 'harbinger'],
  essRune: ['inkwell', 'stringless', 'mournhusk', 'kilnwarden'],
  // "a flame elemental you bond with a fire or volcano essence" -- and the salamanders.
  fire: ['elemental:fire', 'lizard:ember', 'cinderlamb', 'kilnwarden', 'hellhound', 'phoenix'],
  // polearm
  essFork: ['gnawling', 'gnoll', 'quillFiend'],
  essHook: ['mantis', 'driftreaver', 'sharkcrab'],
  essRake: ['gourdkin', 'tunnelmaw', 'mantis'],
  essSceptre: ['lanternwraith', 'demon', 'harbinger', 'birdangel', 'spiritSerpent'],
  essShovel: ['tunnelmaw', 'gnawling', 'grubwyrm'],
  essSpear: ['quillFiend', 'gnoll', 'hornram', 'glasswader'],
  essStaff: ['gnoll', 'monocul', 'demon'],
  essTrowel: ['tunnelmaw', 'gourdkin', 'geodeback'],
  // light
  essLight: ['lanternwraith', 'lurefin', 'birdangel', 'phoenix', 'duskmoth', 'bloomimp'],
  essMoon: ['duskmoth', 'rimehare', 'shiverfox', 'wolf'],
  essPure: ['cinderlamb', 'whitelion', 'birdangel'],
  essShimmer: ['duskmoth', 'glasscat', 'shardling'],
  essStar: ['duskmoth', 'shiverfox', 'lanternwraith', 'birdangel'],
  essSun: ['cinderlamb', 'lizard:ember', 'birdangel', 'phoenix'],
  // storm
  essLightning: ['quillFiend:storm', 'stormjar', 'raptor:storm', 'elemental:lightning', 'thunderbird'],
  // serpent -- "a raptor you bond with the lizard essence"
  essLizard: ['lizard', 'raptor', 'spinosaurus', 'dragon'],
  essSnake: ['cobra', 'spiritSerpent', 'medusa', 'hydra'],
  essSpider: ['spider', 'longshanks', 'clockcrawler'],
  essVenom: ['spider', 'scorpion', 'cobra', 'giantToad'],
  // force
  might: ['boar', 'minotaur', 'cairnbeast', 'trex', 'gnoll'],
  essPotent: ['boar', 'hornram', 'chimera', 'gnoll'],
  essResolute: ['hornram', 'shellborn', 'geodeback', 'ossuaryKnight', 'urchinroll'],
  essZeal: ['cinderlamb', 'hellhound', 'whitelion', 'dragon'],
};

/** A confluence's list. Written out for every one of the 101; `bondThemeFor` falls back to the confluence's family
 *  if a new name arrives before it is written here. */
export const CONFLUENCE_BOND_THEMES = {
  Action: ['raptor', 'direbuck', 'hellhound'],
  Alchemy: ['slime', 'sporemother', 'slimeGolem'],
  Ambush: ['spider', 'crocodile', 'scorpion', 'shade'],
  Animate: ['stringless', 'gourdkin', 'clockcrawler', 'kilnwarden'],
  Anzu: ['bonepecker', 'thunderbird'],
  Arsenal: ['gnoll', 'quillFiend', 'ossuaryKnight'],
  Avatar: ['shade', 'shardling', 'hollowchoir'],
  Battlefield: ['gnoll', 'skeleton', 'minotaur'],
  Behemoth: ['boar', 'cairnbeast', 'trex', 'tidalTroll', 'grubwyrm'],
  Boundary: ['shellborn', 'scalecurl', 'geodeback', 'urchinroll'],
  Bounty: ['bloomimp', 'gourdkin', 'bellhive'],
  Cataclysm: ['elemental', 'kilnwarden', 'dragon', 'cinderlamb'],
  Chaotic: ['gnoll', 'demon', 'chimera'],
  Charlatan: ['stringless', 'shade', 'glasscat'],
  Chimera: ['chimera', 'gnoll', 'whitelion'],
  Cyborg: ['clockcrawler', 'steelRaptor', 'rustmantle'],
  Cycle: ['grubwyrm', 'duskmoth', 'phoenix'],
  Dawn: ['cinderlamb', 'birdangel', 'phoenix'],
  Desolate: ['scorpion', 'skeleton', 'saltwife'],
  Discordant: ['gnoll', 'hollowchoir', 'harbinger'],
  Doom: ['skeleton', 'harbinger', 'demon', 'shade'],
  Doppelganger: ['shade', 'stringless', 'shardling'],
  Dragon: ['lizard', 'raptor', 'dragon'],
  Eclipse: ['shade', 'duskmoth', 'harbinger'],
  Edifice: ['slimeGolem', 'geodeback', 'kilnwarden', 'clockcrawler'],
  Effigy: ['stringless', 'gourdkin', 'totemstalk'],
  Empower: ['boar', 'hornram', 'whitelion'],
  Fertile: ['bloomimp', 'sporemother', 'grubwyrm'],
  Fey: ['bloomimp', 'duskmoth', 'shiverfox'],
  Firebird: ['cinderlamb', 'bonepecker', 'phoenix'],
  Force: ['boar', 'hornram', 'minotaur', 'gnoll'],
  Forge: ['kilnwarden', 'rustmantle', 'clockcrawler'],
  Fortress: ['shellborn', 'geodeback', 'scalecurl', 'urchinroll'],
  Garuda: ['bonepecker', 'cobra', 'thunderbird'],
  Gate: ['spiritSerpent', 'harbinger', 'lanternwraith'],
  Glimeron: ['shardling', 'glasscat', 'lanternwraith', 'duskmoth'],
  Gorgon: ['cobra', 'medusa', 'spiritSerpent'],
  Griffin: ['whitelion', 'bonepecker', 'thunderbird'],
  Guardian: ['shellborn', 'ossuaryKnight', 'cairnbeast', 'wolf', 'urchinroll'],
  Harpy: ['bat', 'bonepecker', 'thunderbird'],
  Harvest: ['gourdkin', 'bloomimp', 'mantis'],
  Hydra: ['giantToad', 'cobra', 'hydra', 'flowerhydra', 'lizard'],
  Immortal: ['phoenix', 'skeleton', 'sporemother'],
  Juggernaut: ['boar', 'minotaur', 'rustmantle', 'clockcrawler'],
  Karmic: ['spiritSerpent', 'birdangel', 'hollowchoir'],
  Kraken: ['driftreaver', 'sharkcrab', 'hydra'],
  Leviathan: ['lurefin', 'sharkcrab', 'tidalTroll', 'spinosaurus', 'driftreaver'],
  Lotus: ['bloomimp', 'pitcherling', 'spiritSerpent'],
  Magitech: ['clockcrawler', 'stormjar', 'steelRaptor'],
  Manticore: ['scorpion', 'whitelion', 'chimera'],
  Master: ['gnoll', 'mantis', 'whitelion'],
  Ministration: ['bloomimp', 'birdangel', 'sporemother'],
  Minotaur: ['hornram', 'boar', 'minotaur', 'direbuck'],
  Mirage: ['glasscat', 'shardling', 'saltwife', 'duskmoth'],
  Monolith: ['geodeback', 'slimeGolem', 'cairnbeast', 'tunnelmaw'],
  Mystic: ['inkwell', 'spiritSerpent', 'elemental'],
  Nebula: ['duskmoth', 'lanternwraith', 'shardling'],
  Nemesis: ['wolf', 'hellhound', 'shade'],
  Network: ['spider', 'longshanks', 'clockcrawler'],
  Oasis: ['giantToad', 'pitcherling', 'saltwife'],
  Ocean: ['driftreaver', 'lurefin', 'sharkcrab', 'tidalTroll'],
  Onslaught: ['wolf', 'raptor', 'minotaur', 'gnoll'],
  Phantasmagoria: ['shade', 'stringless', 'hollowchoir'],
  // "a flame elemental you bond with a fire or volcano essence" -- the phoenix confluence takes the fire beasts too.
  Phoenix: ['cinderlamb', 'lizard:ember', 'elemental:fire', 'phoenix'],
  Predatory: ['raptor', 'wolf', 'crocodile', 'whitelion'],
  Prison: ['pallbearer', 'lanternwraith', 'slimeGolem', 'clockcrawler'],
  Prosperity: ['bellhive', 'gnawling', 'boar'],
  Refracting: ['glasscat', 'shardling', 'glasswader', 'duskmoth'],
  Resonating: ['bellhive', 'hollowchoir', 'stormjar'],
  Roc: ['bonepecker', 'thunderbird'],
  Sacrifice: ['demon', 'gravesown', 'pallbearer'],
  Scribe: ['inkwell', 'mournhusk', 'monocul'],
  Serpent: ['lizard', 'cobra', 'spiritSerpent'],
  Simulacrum: ['stringless', 'shardling', 'shade'],
  Skirmish: ['gnoll', 'raptor', 'direbuck'],
  Sky: ['bat', 'thunderbird', 'stormjar'],
  Soaring: ['bonepecker', 'duskmoth', 'thunderbird'],
  Sovereign: ['whitelion', 'birdangel', 'dragon'],
  Stellar: ['duskmoth', 'lanternwraith', 'birdangel'],
  Storm: ['quillFiend:storm', 'raptor:storm', 'stormjar', 'elemental:lightning', 'thunderbird'],
  Succubus: ['demon', 'shade', 'medusa'],
  Swarm: ['gnawling', 'bellhive', 'mantis', 'spider'],
  Talisman: ['inkwell', 'lanternwraith', 'totemstalk'],
  Thunderbird: ['quillFiend:storm', 'stormjar', 'thunderbird'],
  Time: ['spiritSerpent', 'clockcrawler', 'harbinger'],
  Tranquil: ['spiritSerpent', 'lurefin', 'duskmoth'],
  Transfiguration: ['slime', 'duskmoth', 'chimera'],
  Transgression: ['demon', 'smokecur', 'demonsloth', 'shade'],
  Troll: ['gnoll', 'tidalTroll', 'cairnbeast'],
  Twilight: ['bat', 'duskmoth', 'shade'],
  Undeath: ['skeleton', 'drownwight', 'pallbearer', 'mournhusk', 'gravesown', 'bonepecker'],
  Unity: ['wolf', 'bellhive', 'gnawling'],
  Verdant: ['bloomimp', 'vinegrasp', 'flowerhydra'],
  Vessel: ['gourdkin', 'stormjar', 'mournhusk'],
  Vision: ['monocul', 'medusa', 'tunnelmaw'],
  // "a flame elemental you bond with a fire or volcano essence"
  Volcano: ['lizard:ember', 'cinderlamb', 'elemental:fire', 'kilnwarden', 'hellhound'],
  Vortex: ['stormjar', 'elemental', 'driftreaver'],
  Weave: ['spider', 'longshanks', 'stringless'],
  Wendigo: ['shiverfox', 'rimehare', 'yeti', 'skeleton', 'cinderlamb:glacial'],
  Wrath: ['hellhound', 'demon', 'minotaur', 'gnoll'],
  Ziz: ['bonepecker', 'thunderbird', 'glasswader'],
};

/** An essence family's list: the union of its essences' own, for a confluence name no row above has yet. */
export function familyBondTheme(family) {
  const out = [];
  for (const [id, list] of Object.entries(BOND_THEMES)) {
    if (ESSENCE_FAMILY_OF[id] !== family) continue;
    for (const e of list) if (!out.includes(e)) out.push(e);
  }
  return out;
}
// Filled by `setEssenceFamilies` (the catalog is imported by the caller, which already has it, to keep this file
// off essenceCatalog's import graph).
const ESSENCE_FAMILY_OF = {};
export function setEssenceFamilies(catalog) {
  for (const [id, d] of Object.entries(catalog || {})) if (d && d.family) ESSENCE_FAMILY_OF[id] = d.family;
}

// --- reading an entry --------------------------------------------------------------
export function parseEntry(entry) {
  const [family, shadeStr] = String(entry).split(':');
  return { family, shades: shadeStr ? shadeStr.split(',').filter(Boolean) : null, entry: String(entry) };
}

/** The monster types (MONSTER_TYPES keys) an entry names. */
export function entryMonsterKeys(entry) {
  const { family, shades } = parseEntry(entry);
  return Object.keys(MONSTER_TYPES).filter(k => {
    const t = MONSTER_TYPES[k];
    return t.family === family && (!shades || shades.includes(t.shade));
  });
}

const _keyCache = new Map();
function keysOf(entry) {
  if (!_keyCache.has(entry)) _keyCache.set(entry, entryMonsterKeys(entry));
  return _keyCache.get(entry);
}

export function entryNoun(entry) {
  const { family, shades } = parseEntry(entry);
  if (shades && shades.length === 1 && SHADE_NOUN[`${family}:${shades[0]}`]) return SHADE_NOUN[`${family}:${shades[0]}`];
  return FAMILY_NOUN[family] || FAMILY_DISPLAY_NAME[family] || family;
}

/** The lowest monster tier (0 normal .. 4 gold) at which an entry has a creature. */
export function entryMinTier(entry) {
  let lo = Infinity;
  for (const k of keysOf(entry)) lo = Math.min(lo, monsterThreatTier(k));
  return lo;
}

export function rankIndex(rank) {
  const i = RANK_ORDER.indexOf(rank);
  return i < 0 ? 1 : i;
}

/** Whether the creature of this type can be bonded by someone of this rank: "an Iron can't bond a Gold beast". */
export function bondableAtRank(typeKey, rank) {
  return monsterThreatTier(typeKey) <= rankIndex(rank);
}

// --- which list an ability reads ------------------------------------------------------
/**
 * The theme list for one permanent summon. `essenceId` is the essence that made the ability ('confluence' for a
 * confluence socket, with `confluenceName`); `stoneId` is its awakening stone, and an ANIMAL stone adds its own
 * essence's list after the essence's (the Wendigo x Crocodile stone bonds a crocodile too).
 */
export function bondThemeFor({ essenceId = null, confluenceName = null, confluenceFamily = null, stoneId = null } = {}) {
  let list = [];
  if (essenceId === 'confluence' || (!essenceId && confluenceName)) {
    list = (confluenceName && (sheetWildBond(confluenceName) || CONFLUENCE_BOND_THEMES[confluenceName])) || familyBondTheme(confluenceFamily) || [];
  } else if (essenceId && BOND_THEMES[essenceId]) {
    list = BOND_THEMES[essenceId];
  }
  list = list.slice();
  if (stoneId && String(stoneId).startsWith('stone')) {
    const twin = 'ess' + String(stoneId).slice(5);
    for (const e of (BOND_THEMES[twin] || [])) if (!list.includes(e)) list.push(e);
  }
  if (!list.length && confluenceFamily) list = familyBondTheme(confluenceFamily);
  return list;
}

// --- where they live -----------------------------------------------------------------
const _regionPool = new Map();
/** Every monster type a region's spawn bands can put in the world (round 195's banded pools, as the world builds them). */
export function regionPoolKeys(region) {
  if (!region) return new Set();
  if (_regionPool.has(region.id)) return _regionPool.get(region.id);
  const out = new Set();
  for (const band of (region.spawnGroups || [])) {
    const keys = band.band ? monsterKeysInBand(band.tier, band.band[0], band.band[1]) : monsterKeysAtTier(band.tier);
    for (const k of keys) out.add(k);
  }
  _regionPool.set(region.id, out);
  return out;
}

/** The theme's monster types that live in this region, at or below this rank. */
export function bondCandidates(theme, region, rank) {
  const pool = regionPoolKeys(region);
  const out = [];
  for (const e of (theme || [])) {
    for (const k of keysOf(e)) if (pool.has(k) && bondableAtRank(k, rank) && !out.includes(k)) out.push(k);
  }
  return out;
}

/** The regions where at least one creature of the theme lives at or below this rank. */
export function regionsWithBond(theme, rank, regions = REGIONS) {
  return regions.filter(r => bondCandidates(theme, r, rank).length > 0);
}

/** Every region a theme's creatures live in at all (any rank). */
export function themeSpawnsSomewhere(theme, regions = REGIONS) {
  return regions.some(r => bondCandidates(theme, r, 'diamond').length > 0);
}

// --- what the bonded creature grows into ------------------------------------------------
function firstKeyOf(entry) {
  const ks = keysOf(entry);
  if (!ks.length) return null;
  return ks.slice().sort((a, b) => monsterThreatTier(a) - monsterThreatTier(b))[0];
}

/**
 * "Bonded companions generally get stronger and gain themselves additional abilities as you rank up." Read from the
 * theme's lead creature's OWN monster abilities (monsterDebuffs.js -- what that creature leaves on you in the wild)
 * and its family's nature, so a wolf bonds into a wolf's bite and a hydra into a hydra's venom:
 *   bronze  its strikes can leave the lead creature's first affliction
 *   silver  an ambusher's opening blow / a heavy creature's hide / everything else mends on a kill
 *   gold    the creature's second affliction, or (with none) its strikes carry to everything around the target
 */
export function wildBondLadder(theme, onlyKey = null) {
  // ROUND 410 -- `onlyKey`: the ladder of ONE creature, the one actually bonded, rather than the theme's lead.
  const lead = onlyKey ? null : ((theme || []).find(e => keysOf(e).length) || null);
  const key = onlyKey && MONSTER_TYPES[onlyKey] ? onlyKey : (lead ? firstKeyOf(lead) : null);
  const t = key ? MONSTER_TYPES[key] : null;
  const family = t ? t.family : null;
  const base = family ? (MONSTER_FAMILY_BASE[family] || {}) : {};
  let afflictions = [];
  if (key) {
    try {
      afflictions = monsterDebuffRoll(key, family, monsterElement(key, family, FAMILY_ELEMENT[family]))
        .filter(d => DEBUFFS[d.key]).sort((a, b) => b.chance - a.chance);
    } catch (e) { afflictions = []; }
  }
  const a1 = afflictions[0] || { key: 'bleed', chance: 0.2, potency: 0.9 };
  const a2 = afflictions.find(d => d.key !== a1.key) || null;
  const bronze = { kind: 'afflict', debuff: a1.key, chance: Math.max(0.2, Math.round(a1.chance * 100) / 100), potency: a1.potency || 1 };
  let silver;
  if ((base.ambushChance || 0) > 0) silver = { kind: 'ambush', mult: 2 };
  else if ((base.hp || 0) >= 60) silver = { kind: 'hide', reduce: 0.3 };
  else silver = { kind: 'mend', pct: 0.15 };
  const gold = a2
    ? { kind: 'afflict', debuff: a2.key, chance: Math.max(0.2, Math.round(a2.chance * 100) / 100), potency: a2.potency || 1 }
    : { kind: 'cleave', frac: 0.5, radius: 48 };
  return { family, bronze, silver, gold };
}

function debuffLabel(key) {
  const d = DEBUFFS[key];
  return d ? `[${d.label}]` : `[${key}]`;
}

/** One rung, in the card's words. `dmgAt(rank)` is the bonded creature's blow at that rank. */
export function ladderClause(step, rank, dmgAt, tiles) {
  if (!step) return '';
  switch (step.kind) {
    case 'afflict': return `its strikes have a ${Math.round(step.chance * 100)}% chance to leave ${debuffLabel(step.debuff)}`;
    // A bonded creature's blow reaches the damage path untyped (WorldScene's familiar strike), so these are physical.
    case 'ambush': return `its first strike on each enemy deals ${Math.round(dmgAt(rank) * step.mult)} physical damage`;
    case 'hide': return `blows against it lose ${Math.round(step.reduce * 100)}% of their damage`;
    case 'mend': return `it regains ${Math.round(step.pct * 100)}% of its health each time it kills`;
    case 'cleave': return `each strike also hits every enemy within ${tiles(step.radius)} of its target for ${Math.max(1, Math.round(dmgAt(rank) * step.frac))} physical damage`;
    default: return '';
  }
}

const RANK_WORD = ['Iron', 'Iron', 'Bronze', 'Silver', 'Gold'];
/** "At Iron, a salamander (Quillrunner) or cinder lamb (Cinderlamb); from Silver, also a flame elemental ..." */
export function themeRankPhrase(theme) {
  const byTier = new Map();
  for (const e of (theme || [])) {
    const lo = entryMinTier(e);
    if (!Number.isFinite(lo)) continue;
    const word = RANK_WORD[Math.max(0, Math.min(4, lo))];
    if (!byTier.has(word)) byTier.set(word, []);
    const parsed = parseEntry(e);
    const shown = FAMILY_DISPLAY_NAME[parsed.family];
    const noun = entryNoun(e);
    byTier.get(word).push(shown && shown.toLowerCase() !== noun.toLowerCase() ? `${noun} (${shown})` : noun);
  }
  const order = ['Iron', 'Bronze', 'Silver', 'Gold'].filter(w => byTier.has(w));
  const orList = (xs) => xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
  const art = (s) => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;
  return order.map((w, i) => {
    const xs = byTier.get(w);
    const head = i === 0 ? `at ${w}` : `from ${w}`;
    return `${head}, ${i === 0 ? '' : 'also '}${art(orList(xs))}`;
  }).join('; ');
}

/**
 * The card of a wild bond. States the mechanic -- what it bonds, how, that it fights beside you, grows with your rank
 * and what it gains, and that it can die -- and never compares it with anything. `opts`:
 *   combat   the "striking for N damage every Ns ..." clause (already in the ability's own words)
 *   rest     the ability's other sentences (its riders), kept as they were
 *   dmgAt    rank -> the bonded creature's blow at that rank
 *   tiles    world units -> "N tiles"
 */
export function wildBondDesc(spec, opts = {}) {
  const theme = spec.bondTheme || [];
  const ladder = spec.wildBondRanks || wildBondLadder(theme);
  const dmgAt = opts.dmgAt || (() => spec.familiarDmg || 0);
  const tiles = opts.tiles || ((u) => `${Math.round((u / 32) * 10) / 10} tiles`);
  const combat = opts.combat
    || `striking an enemy within ${tiles(spec.familiarRange || 150)} for ${spec.familiarDmg} damage every ${spec.familiarInterval || 1.2} seconds`;
  const parts = [];
  parts.push(`Bonds a creature from the wild, of your rank or below: ${themeRankPhrase(theme)}.`);
  parts.push('In the wilds, use this ability to call one that lives in the region, then use it again while the creature is near: one time in three it bonds to you; otherwise it turns on you and attacks.');
  parts.push(`Once bonded, it fights beside you, ${combat}. It has the health it had in the wild, takes blows from what you fight, and recovers out of a fight.`);
  const rungs = [['Bronze', 'bronze', ladder.bronze], ['Silver', 'silver', ladder.silver], ['Gold', 'gold', ladder.gold]]
    .map(([w, r, s]) => { const c = ladderClause(s, r, dmgAt, tiles); return c ? `at ${w} ${c}` : ''; }).filter(Boolean);
  parts.push(`It grows with your rank${rungs.length ? `: ${rungs.join('; ')}` : ''}.`);
  if (spec.mount) parts.push('If the creature you bond can carry a rider, you can ride it.');
  parts.push('It cannot be subsumed. If it dies, it is gone, and you must call and bond another.');
  const rest = String(opts.rest || '').trim();
  if (rest) parts.push(rest);
  return parts.join(' ');
}

/** For tests and tools: every family and shade a theme names, checked against the game's own tables. */
export function bondThemeFaults() {
  const out = [];
  const check = (who, list) => {
    if (!Array.isArray(list) || !list.length) { out.push(`${who}: no theme`); return; }
    for (const e of list) {
      const { family, shades } = parseEntry(e);
      if (!MONSTER_ART[family] || !MONSTER_FAMILY_BASE[family]) { out.push(`${who}: no family ${family}`); continue; }
      for (const s of (shades || [])) if (!(MONSTER_ART[family].shades || []).includes(s)) out.push(`${who}: ${family} has no shade ${s}`);
      if (!keysOf(e).length) out.push(`${who}: ${e} names no monster type`);
    }
  };
  for (const [id, list] of Object.entries(BOND_THEMES)) check(id, list);
  for (const [n, list] of Object.entries(CONFLUENCE_BOND_THEMES)) check(n, list);
  return out;
}

// ===========================================================================
// ROUND 410 -- EACH BONDED CREATURE IS ITS OWN.
//
// The user: "When a familiar is bonded it is unique based on it's form. ... it should tell you the creatures you can
// bond then once bonded tell you what AT THE CURRENT RANK that particular creature brings to the table. A pallidjaw
// having water resistance and a large slow attack, vs a quillrunner having higher crit chance and attack speed but
// lower HP. The player bonds one and then finds out." And: "Abilities only display the information about their
// current rank."
//
// `bondProfile(typeKey)` reads the creature's own wild figures (monsters.js) against the others of its threat tier:
//   tempo     size over speed -- a big, slow body (the Pallidjaw) strikes seldom and hard, a small quick one (the
//             Quillrunner) often and light. The blow's interval is the ability's times the tempo; the blow itself
//             is scaled by the same tempo, so the damage over time is set by the creature's real menace (`dps`),
//             not by its rhythm.
//   dps       its damage per second against the median of its tier (0.75 .. 1.4)
//   crit      its own critical chance, and more for a quick striker
//   hide      half its armour, turned against every blow it takes (to 35%)
//   resist    its element (40%), and water for a creature of the rivers and the sea (40%)
//   reach     a creature that keeps its distance in the wild (a kiter) strikes from further off
// Its health is already its own (the wild bond keeps the health it had in the wild). Its Bronze/Silver/Gold rungs
// come from ITS monster abilities (`wildBondLadder(theme, typeKey)`), not the theme's first creature.
// ===========================================================================
export const AQUATIC_BOND_FAMILIES = new Set(['crocodile', 'lurefin', 'driftreaver', 'drownwight', 'sharkcrab',
  'urchinroll', 'saltwife', 'giantToad', 'tidalTroll', 'glasswader', 'hydra', 'spiritSerpent']);
const ELEMENT_WORD = { fire: 'fire', frost: 'frost', lightning: 'lightning', nature: 'nature', shadow: 'shadow',
  radiant: 'radiant', dimension: 'dimension', water: 'water' };

let _tierDps = null;
function tierDps(tier) {
  if (!_tierDps) {
    const by = {};
    for (const [k, t] of Object.entries(MONSTER_TYPES)) {
      if (t.young || !(t.dmg > 0)) continue;
      const tr = monsterThreatTier(k);
      (by[tr] = by[tr] || []).push(t.dmg / (t.atkCooldown || 0.8));
    }
    _tierDps = {};
    for (const [tr, xs] of Object.entries(by)) { xs.sort((a, b) => a - b); _tierDps[tr] = xs[xs.length >> 1]; }
  }
  return _tierDps[tier] || _tierDps[1] || 10;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r2 = (v) => Math.round(v * 100) / 100;

/** What one creature brings, as multipliers on the ability's familiar figures plus its own traits. */
export function bondProfile(typeKey) {
  const t = MONSTER_TYPES[typeKey];
  if (!t) return null;
  const tier = monsterThreatTier(typeKey);
  const tempo = r2(clamp(((t.radius || 13) / 13) * (80 / (t.speed || 80)), 0.65, 1.7));
  const dps = r2(clamp((t.dmg / (t.atkCooldown || 0.8)) / tierDps(tier), 0.75, 1.4));
  const crit = r2(clamp((t.critChance || 0.05) + (tempo < 1 ? (1 - tempo) * 0.3 : 0), 0.03, 0.4));
  const hide = r2(clamp((t.armor || 0) * 0.5, 0, 0.35));
  const resist = {};
  let el = null;
  try { el = monsterElement(typeKey, t.family, FAMILY_ELEMENT[t.family]); } catch (e) { el = null; }
  if (el && ELEMENT_WORD[el]) resist[el] = 0.4;
  if (AQUATIC_BOND_FAMILIES.has(t.family)) resist.water = 0.4;
  const kite = t.gait === 'kite';
  return {
    typeKey, family: t.family, tier, tempo, dps, crit, hide, resist, kite,
    dmgMult: r2(dps * tempo), intervalMult: tempo, rangeMult: kite ? 1.35 : 1,
    style: tempo >= 1.2 ? 'heavy' : tempo <= 0.85 ? 'quick' : 'steady',
  };
}

/** The familiar figures of a bonded creature: the ability's own, through the creature's profile. */
export function bondFamiliarFigures(spec, prof) {
  if (!prof) return { familiarDmg: spec.familiarDmg, familiarInterval: spec.familiarInterval, familiarRange: spec.familiarRange };
  return {
    familiarDmg: Math.max(1, Math.round((spec.familiarDmg || 1) * prof.dmgMult)),
    familiarInterval: Math.round((spec.familiarInterval || 1.2) * prof.intervalMult * 10) / 10,
    familiarRange: Math.round((spec.familiarRange || 150) * prof.rangeMult),
    familiarCrit: prof.crit,
  };
}

/** "a crocodile (Pallidjaw), lizard (Quillrunner) or quill fiend (Silverquill)" -- the creatures this rank may bond. */
export function bondableList(theme, rank) {
  const at = rankIndex(rank);
  const xs = [];
  for (const e of (theme || [])) {
    const lo = entryMinTier(e);
    if (!Number.isFinite(lo) || lo > at) continue;
    const parsed = parseEntry(e);
    const shown = FAMILY_DISPLAY_NAME[parsed.family];
    const noun = entryNoun(e);
    const w = shown && shown.toLowerCase() !== noun.toLowerCase() ? `${noun} (${shown})` : noun;
    if (!xs.includes(w)) xs.push(w);
  }
  if (!xs.length) return '';
  const list = xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`;
  return (/^[aeiou]/i.test(list) ? 'an ' : 'a ') + list;
}

const RANK_TITLE = { normal: 'Normal', iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };
const STYLE_WORD = { heavy: 'a heavy, unhurried blow', quick: 'quick, light strikes', steady: 'a steady rhythm' };
const pctW = (v) => `${Math.round(v * 100)}%`;

/** The parts of an old card (from before the combat clause and riders were kept on the spec). */
export function wildBondCardPartsOf(spec) {
  const d = String(spec.desc || '');
  const m = /Once bonded, it fights beside you, (.*?)\. It has the health/.exec(d);
  const tail = d.split('you must call and bond another.')[1];
  return { combat: spec.bondCombat || (m ? m[1] : ''), rest: spec.bondRest != null ? spec.bondRest : String(tail || '').trim() };
}

/**
 * ROUND 410 -- the wild bond's card at the reader's rank. Unbonded: the creatures THIS rank can bond (no later rank's
 * list), how a call works, and that what a creature brings is found out by bonding it. Bonded: that creature -- how it
 * fights, its health, its hide, what it shrugs off, and the rungs its bond has reached by now (none it has not).
 * `opts`: { rank (the ability's), playerRank, bond, profile, ladder, maxHp, tiles }.
 */
export function wildBondDescAt(spec, opts = {}) {
  const rank = opts.rank || 'iron';
  const playerRank = opts.playerRank || rank;
  const tiles = opts.tiles || ((u) => `${Math.round((u / 32) * 10) / 10} tiles`);
  const theme = spec.bondTheme || [];
  const { combat: combat0, rest } = wildBondCardPartsOf(spec);
  const parts = [];
  const bond = opts.bond || null;
  if (!bond) {
    const list = bondableList(theme, playerRank);
    parts.push(list
      ? `Bonds a creature from the wild, of your rank or below. At ${RANK_TITLE[playerRank] || 'your rank'} you can bond ${list}.`
      : 'Bonds a creature from the wild, of your rank or below; none it can bond is within your rank yet.');
    parts.push('In the wilds, use this ability to call one that lives in the region, then use it again while the creature is near: one time in three it bonds to you; otherwise it turns on you and attacks.');
    parts.push('Each creature fights in its own way; what yours brings, you find out once it is bonded.');
  } else {
    const prof = opts.profile || null;
    let combat = combat0 || `striking an enemy within ${tiles(spec.familiarRange || 150)} for ${spec.familiarDmg} damage every ${spec.familiarInterval || 1.2} seconds`;
    // The clause carries the figures the spec now carries (the creature's), in the same words.
    if (opts.baseFigures) {
      const b = opts.baseFigures;
      combat = combat
        .replace(new RegExp(`\\b${b.familiarDmg}(?= (?:[a-z]+ )?damage)`), String(spec.familiarDmg))
        .replace(new RegExp(`every ${String(b.familiarInterval).replace('.', '\\.')} seconds`), `every ${spec.familiarInterval} seconds`)
        .replace(tiles(b.familiarRange || 150), tiles(spec.familiarRange || 150));
    }
    const label = bond.label || FAMILY_DISPLAY_NAME[bond.family] || 'creature';
    const noun = FAMILY_NOUN[bond.family] || '';
    parts.push(`Bonded: your ${label}${noun && noun.toLowerCase() !== String(label).toLowerCase() ? ` (a ${noun})` : ''}.`);
    const style = prof ? `, ${STYLE_WORD[prof.style]}` : '';
    const crit = prof && prof.crit ? `, and ${pctW(prof.crit)} of its blows strike critically` : '';
    parts.push(`It fights beside you, ${combat}${style}${crit}.`);
    if (opts.maxHp) parts.push(`It has ${opts.maxHp} health${prof && prof.tempo <= 0.85 ? ' -- quick, but not hardy' : prof && prof.tempo >= 1.2 ? ' and a body built to take punishment' : ''}, takes blows from what you fight, and recovers out of a fight.`);
    const traits = [];
    if (prof && prof.hide >= 0.05) traits.push(`its hide turns aside ${pctW(prof.hide)} of every blow`);
    const res = prof ? Object.entries(prof.resist || {}) : [];
    if (res.length) traits.push(`it shrugs off ${res.map(([el, v]) => `${ELEMENT_WORD[el] || el} (${pctW(v)})`).join(' and ')}`);
    if (prof && prof.kite) traits.push('it keeps its distance and strikes from further off');
    if (traits.length) parts.push(`${traits.join('; ').replace(/^./, c => c.toUpperCase())}.`);
    const ladder = opts.ladder || null;
    if (ladder) {
      const at = ['bronze', 'silver', 'gold'].filter(r => RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf(r));
      const dmgAt = () => spec.familiarDmg;
      const grown = at.map(r => ladderClause(ladder[r], r, dmgAt, tiles)).filter(Boolean);
      if (grown.length) parts.push(`Your bond has grown: ${grown.join('; ')}.`);
    }
  }
  if (spec.mount) parts.push(bond ? 'If it can carry a rider, you can ride it.' : 'If the creature you bond can carry a rider, you can ride it.');
  parts.push(bond ? 'It cannot be subsumed. If it dies, it is gone, and you must call and bond another.' : 'It cannot be subsumed. If it dies, it is gone, and you must call and bond another.');
  if (rest) parts.push(rest);
  return parts.join(' ');
}

