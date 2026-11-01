// ===========================================================================
// ROUND 393 -- THE NEW BODIES, AND WHERE THEY STAND IN FOR THE STAND-INS.
//
//   "13 new bodies: 12 to place plus a spare ... Pack them the way the other monster atlases are packed, then swap
//    them in for the stand-ins ... These go everywhere the stand-ins were used: summons, ritual beings, wild bonds,
//    greater shapes." -- and -- "Don't forget to recolor all the new monster and animations for elemental variation."
//
// THE ART LAYER, NOT THE SHEETS. The confluence sheets (tools/conf_source, and the generated confluenceIdentityData.js)
// keep naming the stand-in (`summonFamily: 'whitelion', summonShade: 'gilded'` for "Call the Griffin"); this module
// answers, at the moment a body is chosen, "what does that creature LOOK like now". Keyed by the creature's NAME and
// the stand-in family together -- both must match -- because a family alone is ambiguous: `whitelion:gilded` is the
// griffin on the Griffin sheet and a lion on the Chimera sheet; `chimera:tawny` is the manticore on the Manticore
// sheet and the chimera itself on the Chimera sheet. The names are the sheets' own (`summonCreatureName`, a ritual
// form's `name` / `greater`).
//
// SHADES. Every new family carries the art as drawn plus seven elemental rows (ember, frost, storm, void, verdant,
// stone, radiant -- tools/pack_round393_creatures.py). `r393ShadeFor` picks one: the sheet's pinned shade where the new
// family has it (or an alias of it -- "umbral" is void, "glacial" frost, "gilded" radiant), else the element of the
// ability that calls it, else the art as drawn. A stand-in's own default colour (the griffin stand-in's "gilded", the
// manticore's "tawny") is the new body's art as drawn.
//
// Wild monsters: no row of MONSTER_TYPES stands in for any of these creatures (the gilded white lion, the tawny chimera,
// the yetis, direbucks, bellhives and cairnbeasts in the world are those animals), so the roaming wilds keep them. The
// wild creature a confluence's WILD BOND calls is another matter: where the sheet's wildBond list names a stand-in
// (the Griffin sheet's `whitelion`), the creature that answers -- and the companion it becomes -- wears the new body
// (R393_BOND_SWAP, creatureArtR393Mixin `_r393WildBondBody`).
// ===========================================================================
import { MONSTER_ART } from './monsterArt.js';
import { DEATH_ART } from './deathArt.js';
import { R393_ART, R393_DEATH } from './creatureArtR393Rows.js';

// ---- the rows join the tables every reader already uses ----------------------------------------------------------
for (const [fam, row] of Object.entries(R393_ART)) if (!MONSTER_ART[fam]) MONSTER_ART[fam] = row;
for (const [fam, row] of Object.entries(R393_DEATH)) if (!DEATH_ART.mon[fam]) DEATH_ART.mon[fam] = row;

/** The twelve placed, the spare, and the three free reuses. */
export const R393_FAMILIES = Object.keys(R393_ART);
export const R393_PLACED = ['griffin', 'manticore', 'wendigo', 'troll', 'swarmgolem', 'behemoth', 'leviathan', 'juggernaut',
  'riderWar', 'riderFamine', 'riderPestilence', 'riderDeath'];
export const R393_SPARE = 'manticoreGoofball';
export const R393_DISPLAY_NAME = {
  griffin: 'Griffin', manticore: 'Manticore', wendigo: 'Wendigo', troll: 'Hill Troll', swarmgolem: 'Swarm Golem',
  behemoth: 'Behemoth', leviathan: 'Leviathan', juggernaut: 'Juggernaut Engine', riderWar: 'Rider of War',
  riderFamine: 'Rider of Famine', riderPestilence: 'Rider of Pestilence', riderDeath: 'Rider of Death',
  manticoreGoofball: 'Manticore', lavaElemental: 'Lava Elemental', salamander: 'Salamander', stoneStatue: 'Living Statue',
  garrisonKnight: 'Garrison Knight',
};

// ---- the swap ----------------------------------------------------------------------------------------------------
/**
 * name -> [stand-in family, new family, scale]. `scale` (optional) multiplies the body's display scale: the wyrmling
 * and the fledgling are the dragon and the phoenix "scaled down".
 */
export const R393_NAME_SWAP = {
  // griffin: the gilded white lion (Griffin -- "Call the Griffin", the ritual fighter and its greater shape)
  'Griffin': ['whitelion', 'griffin'],
  'Sovereign Griffin': ['whitelion', 'griffin'],
  // manticore: the tawny chimera (Manticore -- summon, ritual fighter, greater shape)
  'Manticore': ['chimera', 'manticore'],
  'Man-Eater of the Waste': ['chimera', 'manticore'],
  // wendigo: the direbuck / yeti (Wendigo -- the Hollow Stag and the ritual's antlered and rime-hulk beings)
  'Hollow Stag': ['direbuck', 'wendigo'],
  'Hollow Stalker': ['direbuck', 'wendigo'],
  'Antlered Famine': ['direbuck', 'wendigo'],
  'Rime Hulk': ['yeti', 'wendigo'],
  // troll: the hill / cave troll stand-ins (bog and river trolls stay on mon_tidalTroll)
  'Cave Troll': ['yeti', 'troll'],
  'Mountain Troll': ['yeti', 'troll'],
  // ROUND 393 -- the Troll sheet's gap names a third stand-in: "mon_cairnbeast mossy (mossback)" -- the moss-grown
  // hill troll the new body is drawn as.
  'Mossback': ['cairnbeast', 'troll'],
  'Old Mossback': ['cairnbeast', 'troll'],
  // swarmgolem: the bellhive (Swarm's hive walker and its greater shape; Unity's hive of one mind)
  'Hive Walker': ['bellhive', 'swarmgolem'],
  'Hive Colossus': ['bellhive', 'swarmgolem'],
  'Hive of One Mind': ['bellhive', 'swarmgolem'],
  'Hive Herald': ['bellhive', 'swarmgolem'],
  'Voice of the Hive': ['bellhive', 'swarmgolem'],
  // behemoth: the mossy cairnbeast (Hill Calf, the guardian being, its greater shape)
  'Hill Calf': ['cairnbeast', 'behemoth'],
  'Hill-Backed Behemoth': ['cairnbeast', 'behemoth'],
  'Walking Tor': ['cairnbeast', 'behemoth'],
  // leviathan: the leviathan stand-ins (the sea-giants' greater shapes, the moat leviathan)
  'Island-Back': ['tidalTroll', 'leviathan'],
  'Sail-Backed Behemoth': ['spinosaurus', 'leviathan'],
  'Moat Leviathan': ['urchinroll', 'leviathan'],
  // horseman-sprite: the Pale Rider and its greater shape
  'Pale Rider': ['shade', 'riderDeath'],
  'Rider of the Last Day': ['shade', 'riderDeath'],
  // free reuses
  'Lava Elemental': ['elemental', 'lavaElemental'],
  'Magma Titan': ['elemental', 'lavaElemental', 1.25],   // ROUND 393 -- the lava elemental's greater shape
  'Colossus of the Garden': ['cairnbeast', 'stoneStatue', 1.2],   // ROUND 393 -- the Living Statue's greater shape
  'Knight-Castellan': ['ossuaryKnight', 'garrisonKnight'],   // ROUND 393 -- the Garrison Knight's greater shape
  'Salamander': ['lizard', 'salamander'],
  'Living Statue': ['cairnbeast', 'stoneStatue'],
  'Walking Statue': ['cairnbeast', 'stoneStatue'],
  'Wyrmling': ['dragon', 'dragon', 0.5],
  'Burrowing Wyrmling': ['dragon', 'dragon', 0.5],
  'Phoenix Fledgling': ['phoenix', 'phoenix', 0.55],
  'Garrison Knight': ['ossuaryKnight', 'garrisonKnight'],
};

/** A pinned stand-in shade, read as one of the new rows. */
export const R393_SHADE_ALIAS = {
  ember: 'ember', fire: 'ember', infernal: 'ember', cinder: 'ember', sanguine: 'ember', crimson: 'ember', charred: 'ember',
  glacial: 'frost', frost: 'frost', white: 'frost', winter: 'frost', frostbitten: 'frost', ice: 'frost',
  storm: 'storm', lightning: 'storm', cobalt: 'storm', tidal: 'storm',
  umbral: 'void', void: 'void', obsidian: 'void', sable: 'void', twilit: 'void', amethyst: 'void', violet: 'void',
  darkness: 'void', black: 'void', nightstone: 'void', jet: 'void', blackened: 'void',
  verdant: 'verdant', emerald: 'verdant', venom: 'verdant', green: 'verdant', swamp: 'verdant', bloodmoss: 'verdant',
  ashen: 'stone', bone: 'stone', bleached: 'stone', grey: 'stone', earth: 'stone', rosestone: 'stone', pale: 'stone',
  gilded: 'radiant', radiant: 'radiant', sunlit: 'radiant', golden: 'radiant', gold: 'radiant', bronzed: 'radiant',
};
/** The stand-in's own colour is the new body as drawn: these pinned shades mean "the art as drawn" for that family. */
export const R393_BASE_PINS = {
  griffin: ['gilded'], manticore: ['tawny'], wendigo: ['umbral'], troll: ['umbral', 'mossy'], swarmgolem: ['honeyed'],
  behemoth: ['mossy', 'verdant'], leviathan: ['azure', 'abyssal'], riderDeath: ['ashen', 'pale'],
  lavaElemental: ['fire'], salamander: ['ember'], stoneStatue: ['bleached'], garrisonKnight: ['bronzed'],
};
/** The ability's element -> the elemental row. */
export const R393_ELEMENT_SHADE = {
  fire: 'ember', frost: 'frost', ice: 'frost', water: 'frost',
  lightning: 'storm', wind: 'storm', resonating: 'storm',
  shadow: 'void', dark: 'void', curse: 'void', necrotic: 'void', death: 'void', blood: 'void', dimension: 'void',
  nature: 'verdant', plant: 'verdant', poison: 'verdant', life: 'verdant',
  earth: 'stone', rock: 'stone', sand: 'stone',
  radiant: 'radiant', light: 'radiant', holy: 'radiant', arcane: 'radiant',
};

/**
 * ROUND 394 -- swaps keyed by `family|name` together (creatureArtR394.js fills it): a name two sheets use for two
 * different stand-ins ("Walking Statue" is Transfiguration's cairnbeast and Monolith's geodeback) needs both keys.
 * Read before R393_NAME_SWAP. Same row shape: [stand-in family, new family, scale].
 */
export const R393_PAIR_SWAP = {};
/** ROUND 394 -- a pinned shade read differently for one family (the golem's "ashen" is its mortar row). */
export const R393_FAMILY_ALIAS = {};

/** The swap for a creature named `name` that its source draws as `family`, or null. */
export function r393SwapFor(family, name) {
  const s = name && (R393_PAIR_SWAP[`${family}|${name}`] || R393_NAME_SWAP[String(name)]);   // ROUND 394 -- pairs first
  if (!s || s[0] !== family || !MONSTER_ART[s[1]]) return null;
  return { family: s[1], scale: s[2] || 1 };
}

/**
 * The shade NAME a body of `family` wears, given what its source pinned and the element calling it. Returns one of
 * `MONSTER_ART[family].shades` (the first -- the art as drawn -- when nothing better is known).
 */
export function r393ShadeFor(family, pinned = null, element = null) {
  const art = MONSTER_ART[family];
  if (!art || !art.shades || !art.shades.length) return null;
  const has = (s) => s && art.shades.includes(s);
  // ROUND 393 -- a BASE pin (the stand-in's own colour -- "Call the Griffin"'s gilded lion) carries no elemental
  // intent, so the element of the confluence's ability decides ("summons, ritual beings and bonds pick the shade that
  // matches the confluence's element"); a slashing / blunt one leaves the body as drawn.
  const base = pinned && (R393_BASE_PINS[family] || []).includes(pinned);
  const fa = R393_FAMILY_ALIAS[family];   // ROUND 394
  if (!base && fa && pinned && has(fa[pinned])) return fa[pinned];
  if (!base && has(pinned)) return pinned;
  if (!base && pinned && has(R393_SHADE_ALIAS[pinned])) return R393_SHADE_ALIAS[pinned];
  if (element && has(R393_ELEMENT_SHADE[element])) return R393_ELEMENT_SHADE[element];
  return art.shades[0];
}

/**
 * ROUND 393 -- WILD BONDS. A confluence's sheet lists the wild creatures it bonds (`wildBond`), and some of those
 * entries ARE the stand-ins ("griffin-sprite ... the ritual fighter and wild bonds use the same"). The creature such a
 * bond calls out of the wilds wears the new body, and so does the companion it becomes. Keyed by confluence name, then
 * `family:shade` or the bare family (as the sheets' wildBond lists write them).
 */
export const R393_BOND_SWAP = {
  Griffin: { whitelion: 'griffin' },
  Manticore: { chimera: 'manticore' },
  Wendigo: { yeti: 'wendigo', direbuck: 'wendigo' },
  Troll: { yeti: 'troll', cairnbeast: 'troll' },
  Behemoth: { cairnbeast: 'behemoth' },
  Swarm: { bellhive: 'swarmgolem' },
  Unity: { bellhive: 'swarmgolem' },
  Leviathan: { 'tidalTroll:amethyst': 'leviathan' },
  Doom: { 'shade:ashen': 'riderDeath' },
  Volcano: { 'lizard:ember': 'salamander', 'elemental:fire': 'lavaElemental' },
  Gorgon: { 'cairnbeast:bleached': 'stoneStatue' },
};
/** The new family a wild bond of confluence `conf` dresses a `family` / `shade` creature in, or null. */
export function r393BondSwap(conf, family, shade) {
  const t = conf && R393_BOND_SWAP[conf];
  if (!t || !family) return null;
  const to = t[`${family}:${shade}`] || t[family] || null;
  return to && MONSTER_ART[to] ? to : null;
}

// ---- the animated props ------------------------------------------------------------------------------------------
/** The art drop's animated props (public/assets/r393props/<key>.png + _still + _<element>), frame sizes as shipped. */
export const R393_PROPS = {
  belltower: { w: 64, h: 96 }, greatclock: { w: 64, h: 96 }, ballistatower: { w: 64, h: 96 }, barbican: { w: 64, h: 96 },
  skullpillar: { w: 48, h: 80 }, tombstone: { w: 48, h: 64 }, tentacle: { w: 64, h: 96 }, serpenthead: { w: 96, h: 64 },
  graspinghands: { w: 64, h: 64 },
};
export const R393_PROP_FRAMES = 8;
export const R393_PROP_ELEMENTS = ['ember', 'frost', 'storm', 'void', 'verdant', 'stone', 'radiant'];
/** "Turrets (replace the generic turret)" -- by the sheet entry's id (and its name, for a spec without one). */
export const R393_TURRETS = {
  'knell-tower': 'belltower', 'Knell Tower': 'belltower',
  'tolling-bell-tower': 'belltower', 'Tolling Bell Tower': 'belltower',
  'doomsday-clock': 'greatclock', 'Doomsday Clock': 'greatclock',
  'ballista-tower': 'ballistatower', 'Ballista Tower': 'ballistatower',
  'barbican': 'barbican', 'Barbican': 'barbican',
  'skull-pillar': 'skullpillar', 'Skull Pillar': 'skullpillar',
  'wailing-tombstone': 'tombstone', 'Wailing Tombstone': 'tombstone',
  'lurking-arm': 'tentacle', 'Lurking Arm': 'tentacle',
};
/** Damage types that are not an element: the prop keeps its own colour. And each prop's own native elements. */
const PLAIN_TYPES = new Set(['physical', 'blunt', 'piercing', 'slashing']);
const PROP_NATIVE = {
  tentacle: ['water'], serpenthead: ['poison'], graspinghands: ['necrotic', 'death'], skullpillar: ['necrotic', 'death'],
  tombstone: ['necrotic', 'death', 'curse'], belltower: ['resonating'], greatclock: ['dimension', 'arcane'],
};
/** Which tint of `prop` an ability of `element` gets: null for the art as drawn. */
export function r393PropTint(prop, element) {
  if (!element || PLAIN_TYPES.has(element) || (PROP_NATIVE[prop] || []).includes(element)) return null;
  const t = R393_ELEMENT_SHADE[element];
  return t && R393_PROP_ELEMENTS.includes(t) ? t : null;
}

/**
 * "Ground-rising effects and summons": the cast art an ability's sheet entry asks for, by entry id / name.
 *   kind: tentacles | heads | snakehair | hands | tail | riders | engine
 */
export const R393_CAST_ART = {
  // tentacle: Thrashing Arms, Sweeping Arms, Drag Under, Thicket of Arms, Held in the Grasp (Hold from Below, Lurking
  // Arm and Wall of Arms are bodies: the familiar, the turret and the wall)
  'thrashing-arms': 'tentacles', 'sweeping-arms': 'tentacles', 'drag-under': 'tentacles',
  'thicket-of-arms': 'tentacles', 'held-in-the-grasp': 'tentacles', 'wall-of-arms': 'tentacleWall',
  // serpenthead: the hydra's head-strike-fx; small and several, the gorgon's snake-hair-fx
  'venomjaw': 'heads', 'draining-bite': 'heads', 'manystrike': 'heads', 'thrashing-heads': 'heads',
  'jet-of-spittle': 'snakehair',
  // graspinghands: Grasping Dead, Open Grave, Shallow Grave (and the Wall of the Dead). "Grasped from Below" is the
  // Undeath CONDITION: the hands rise under whatever it holds (creatureArtR393Mixin _r393MonsterConditionArt).
  'grasping-dead': 'hands', 'open-grave': 'hands', 'shallow-grave': 'hands',
  'wall-of-the-dead': 'handsWall',
  // recoloured green, the tentacle is the chimera's tail-strike-fx
  'serpent-tail-strike': 'tail', 'serpent-tail-sting': 'tail',
  // horseman-sprite: Four Riders
  'four-riders': 'riders',
  // vehicle-body: the juggernaut
  'scythed-hubs': 'engine',
};
const CAST_ART_BY_NAME = {
  'Thrashing Arms': 'tentacles', 'Sweeping Arms': 'tentacles', 'Drag Under': 'tentacles', 'Thicket of Arms': 'tentacles',
  'Held in the Grasp': 'tentacles', 'Wall of Arms': 'tentacleWall', 'Venomjaw': 'heads', 'Draining Bite': 'heads',
  'Manystrike': 'heads', 'Thrashing Heads': 'heads', 'Jet of Spittle': 'snakehair', 'Grasping Dead': 'hands',
  'Open Grave': 'hands', 'Shallow Grave': 'hands', 'Wall of the Dead': 'handsWall',
  'Serpent-Tail Strike': 'tail', 'Serpent-Tail Sting': 'tail', 'Four Riders': 'riders', 'Scythed Hubs': 'engine',
};
export function r393CastArtFor(a) {
  if (!a) return null;
  return (a.confEntry && R393_CAST_ART[a.confEntry]) || CAST_ART_BY_NAME[a.name] || null;
}
export function r393TurretFor(a) {
  if (!a) return null;
  return (a.confEntry && R393_TURRETS[a.confEntry]) || R393_TURRETS[a.name] || null;
}
/** Familiars that are not monster bodies: Hold from Below's arm, and the hydra's second head. */
export const R393_FAMILIAR_ART = {
  'Grasping Arm': { prop: 'tentacle' },
  'Second Head': { crop: 'hydra' },
};
