// ===========================================================================
// ROUND 394 -- THE FORTY r392 BODIES AND THE FIFTY-ONE TURRET / TRAP BODIES, AND WHAT EACH ONE STANDS IN FOR.
//
//   "Swap each in for its stand-in from the brief's section 7 table, everywhere the stand-ins appear: summons, ritual
//    beings, wild bonds, greater shapes. Use the art-layer remap round 393 built" -- and, for section 6, "Replace the
//    generic turret/trap body for every row in `serves` ... Merged bodies are tinted per confluence ... Give them
//    element tints too, as round 393 did for its turrets."
//
// THE ART LAYER, NOT THE SHEETS, exactly as round 393 (creatureArtR393.js -- read its header): this module only adds
// rows to round 393's tables, so `r393SwapFor`, `r393ShadeFor` and `r393BondSwap` answer for the new bodies with no
// second code path:
//   * R393_PAIR_SWAP   `standInFamily|name` -> [stand-in, new family, scale]. Keyed by BOTH because a name alone is
//                      ambiguous ("Walking Statue" is Transfiguration's cairnbeast and Monolith's geodeback). The names
//                      are the sheets' own (`summonCreatureName`, a ritual form's `name` / `greater`); the suite checks
//                      every pair against tools/conf_source.
//   * R393_BASE_PINS   the stand-in's own colour is the new body as drawn (Call the Suparna's `gilded` thunderbird is
//                      the garuda as drawn, and the confluence's element picks its row).
//   * R393_FAMILY_ALIAS  a pin read per family: the golem's `ashen` / `bleached` is its MORTAR row (the mortar golem).
//   * R393_BOND_SWAP   per confluence, the wild creatures its bond list names that answer in a new body.
//
// HELD (not here, by the brief): the player transform bodies, the Ziz, the kraken body.
// ===========================================================================
import { MONSTER_ART } from './monsterArt.js';
import { DEATH_ART } from './deathArt.js';
import { R394_ART, R394_DEATH } from './creatureArtR394Rows.js';
import {
  R393_PAIR_SWAP, R393_BASE_PINS, R393_FAMILY_ALIAS, R393_SHADE_ALIAS, R393_BOND_SWAP, R393_ELEMENT_SHADE,
  R393_DISPLAY_NAME, r393SwapFor,
} from './creatureArtR393.js';

for (const [fam, row] of Object.entries(R394_ART)) if (!MONSTER_ART[fam]) MONSTER_ART[fam] = row;
for (const [fam, row] of Object.entries(R394_DEATH)) if (!DEATH_ART.mon[fam]) DEATH_ART.mon[fam] = row;

export const R394_FAMILIES = Object.keys(R394_ART);
export const R394_DISPLAY_NAME = {
  anzu: 'Anzu', garuda: 'Suparna', roc: 'Roc', firebird: 'Firebird', harpy: 'Harpy', herald: 'Herald', owl: 'Owl',
  lark: 'Lark', heron: 'Heron', koi: 'Koi', pixie: 'Pixie', toad: 'Toad', gremlin: 'Gremlin', homunculus: 'Homunculus',
  cambion: 'Cambion', devourer: 'Devourer Hound', forgeHound: 'Forge Hound', dustDevilCur: 'Grit Devil Cur',
  golem: 'Golem', harness: 'Walking Harness', swornKnight: 'Sworn Knight', royalGuard: 'Household Knight',
  gaoler: 'Gaoler', turnkey: 'Turnkey', livingStatue: 'Living Statue', walkingOak: 'Walking Oak',
  thunderheadSpirit: 'Thunderhead Spirit', coalescedGiant: 'Coalesced Giant', constellationLion: 'Constellation Lion',
  greatSerpent: 'Great Serpent', livingSutra: 'Living Sutra', doppelganger: 'Doppelganger', cutOutWarrior: 'Cut-Out Warrior',
  huskBearer: 'Husk Bearer', lampKeeper: 'Lamp Keeper', livingPrism: 'Living Prism', relayDrone: 'Relay Drone',
  gunDrone: 'Gun Drone', forceFist: 'Force Fist', strawMan: 'Straw Man',
};
Object.assign(R393_DISPLAY_NAME, R394_DISPLAY_NAME);

// ---- the swap -----------------------------------------------------------------------------------------------------
/** [stand-in family, creature name (the sheet's), new family, scale?] -- grouped by the brief's section-7 rows. */
export const R394_SWAPS = [
  // anzu-sprite: the gilded thunderbird. "The 32 px fledgling is this, scaled down": Call the Storm-Eaglet.
  ['thunderbird', 'Gilded Storm-Eaglet', 'anzu', 0.45], ['thunderbird', 'Storm-Eagle', 'anzu'], ['thunderbird', 'Great Anzu', 'anzu', 1.15],
  // garuda-sprite: Call the Suparna, the ritual fighter, its greater shape
  ['thunderbird', 'Suparna', 'garuda'], ['birdangel', 'Suparna Lord', 'garuda', 1.15],
  // roc-sprite (Roc, and the Firebird's roc); the Roc sheet's fledglings are the roc scaled down
  ['thunderbird', 'Thunder-Roc', 'roc'], ['thunderbird', 'Storm-Crowned Roc', 'roc', 1.15],
  ['bonepecker', 'Gilded Roc Fledgling', 'roc', 0.45], ['bonepecker', 'Roc Fledgling', 'roc', 0.45], ['bonepecker', 'Half-Grown Roc', 'roc', 0.7],
  ['thunderbird', 'Roc Sentinel', 'roc'], ['thunderbird', 'Roc', 'roc'], ['thunderbird', 'Great Roc', 'roc', 1.15],
  // ...and the Harpy sheet's guardian is a roc by name
  ['thunderbird', 'Storm Roc', 'roc'], ['thunderbird', 'Elder Roc', 'roc', 1.15],
  // firebird-sprite: the phoenix stand-in
  ['phoenix', 'Young Firebird', 'firebird'], ['phoenix', 'Elder Firebird', 'firebird', 1.15],
  // harpy-sprite / herald-sprite: the umbral bird-angel
  ['birdangel', 'Harpy Sister', 'harpy'], ['birdangel', 'Harpy', 'harpy'], ['birdangel', 'Harpy Matriarch', 'harpy', 1.15],
  ['birdangel', 'Herald of Retribution', 'herald'], ['birdangel', 'Avenging Herald', 'herald', 1.15],
  // heron-sprite: the cobalt glasswader; koi-sprite: the Mist Koi scout (lurefin)
  ['glasswader', 'Shore Heron', 'heron'], ['glasswader', 'Grey Heron', 'heron'], ['glasswader', 'Old Heron of the Reeds', 'heron', 1.15],
  ['lurefin', 'Mist Koi', 'koi'], ['lurefin', 'Golden Koi of the Shrine', 'koi', 1.2],
  // pixie-sprite: the rosebud / bluebell bloom-imp (and Verdant's sprite in bluebells)
  ['bloomimp', 'Pixie Attendant', 'pixie'], ['bloomimp', 'Bluebell Sprite', 'pixie'], ['bloomimp', 'Pixie', 'pixie'],
  ['bloomimp', 'Pixie Courtier', 'pixie', 1.15], ['bloomimp', 'Sprite in Bluebells', 'pixie'], ['bloomimp', 'Herald of the Wild Spring', 'pixie', 1.15],
  // gremlin-sprite: Havoc Imp; cambion-sprite: the crimson demon
  ['demon', 'Havoc Imp', 'gremlin'],
  ['demon', 'Cambion Attendant', 'cambion'], ['demon', 'Cambion', 'cambion'], ['demon', 'Cambion Duke', 'cambion', 1.2],
  // devourer-sprite / forge-hound-sprite: the hellhound
  ['hellhound', 'Devourer Hound', 'devourer'], ['hellhound', 'Hound That Eats the Noon', 'devourer', 1.15],
  ['hellhound', 'Forge Hound', 'forgeHound'], ['hellhound', 'Bellows Hound', 'forgeHound'], ['hellhound', 'Furnace Hound', 'forgeHound', 1.15],
  // dust-devil-sprite: the stormcloud smokecur
  ['smokecur', 'Grit Devil Cur', 'dustDevilCur'],
  // golem: the clay golem as drawn (cairnbeast autumn), the mortar golem in its grey rubble row (slimeGolem ashen)
  ['cairnbeast', 'Clay Golem', 'golem'], ['cairnbeast', 'Fired Colossus', 'golem', 1.3],
  ['slimeGolem', 'Mortar Golem', 'golem'], ['cairnbeast', 'Rubble Colossus', 'golem', 1.3],
  // animated-harness-sprite (and the Animate sheet's empty suit of armour, the same idea)
  ['ossuaryKnight', 'Walking Harness', 'harness'], ['ossuaryKnight', 'Bronze-Cast Colossus', 'harness', 1.25],
  ['ossuaryKnight', 'Empty Suit', 'harness'], ['ossuaryKnight', 'Hollow Paladin', 'harness', 1.15],
  // sworn-knight-sprite / royal-guard-sprite: the bronzed ossuary knight
  ['ossuaryKnight', 'Sworn Knight', 'swornKnight'], ['ossuaryKnight', 'Oathbound Knight', 'swornKnight'],
  ['ossuaryKnight', 'Knight of the Last Watch', 'swornKnight', 1.15],
  ['ossuaryKnight', 'Household Knight', 'royalGuard'], ['ossuaryKnight', 'Lord Protector', 'royalGuard', 1.15],
  // gaoler-sprite: the moonlit lantern-wraith; turnkey-sprite: the brass clock-crawler
  ['lanternwraith', 'Lantern Gaoler', 'gaoler'], ['lanternwraith', 'Lamp of the Night Watch', 'gaoler', 1.15],
  ['clockcrawler', 'Turnkey Construct', 'turnkey'], ['clockcrawler', 'Turnkey Crawler', 'turnkey'], ['clockcrawler', 'Gaol Engine', 'turnkey', 1.25],
  // living-statue-sprite: Monolith's geodeback (Gorgon's Living Statue keeps round 393's stoneStatue)
  ['geodeback', 'Statue Off Its Plinth', 'livingStatue'], ['geodeback', 'Walking Statue', 'livingStatue'],
  ['cairnbeast', 'Marble Colossus', 'livingStatue', 1.3],
  // walking-oak-sprite: the verdant totemstalk
  ['totemstalk', 'Old Walking Oak', 'walkingOak'],
  // thunderhead-spirit-sprite: the lightning elemental (and Anzu's thunderhead warden)
  ['elemental', 'Thunderhead Spirit', 'thunderheadSpirit'], ['elemental', 'Thunderhead Colossus', 'thunderheadSpirit', 1.2],
  ['elemental', 'Thunderhead Warden', 'thunderheadSpirit'], ['elemental', 'Keeper of the Black Heavens', 'thunderheadSpirit', 1.15],
  // coalesced-giant-sprite: the darkness elemental
  ['elemental', 'Coalesced Giant', 'coalescedGiant'], ['elemental', 'Giant of the Pillars', 'coalescedGiant', 1.15],
  // constellation-beast-sprite: the gilded white lion
  ['whitelion', 'Constellation Lion', 'constellationLion'], ['whitelion', 'Lion of the Zenith', 'constellationLion', 1.15],
  // great-serpent-sprite: the green hydra
  ['hydra', 'Great Coil', 'greatSerpent'], ['hydra', 'World-Coil', 'greatSerpent', 1.2],
  // living-sutra-sprite: the goldleaf inkwell
  ['inkwell', 'Living Sutra', 'livingSutra'], ['inkwell', 'Scripture Unbound', 'livingSutra', 1.15],
  // doppelganger-sprite: the ashen stringless / sanguine shade
  ['stringless', 'Faceless Mimic', 'doppelganger'], ['shade', 'Skin-Thief', 'doppelganger'], ['stringless', 'Harlequin of Many Faces', 'doppelganger', 1.15],
  // cut-out-sprite: the harlequin stringless
  ['stringless', 'Cut-Out Warrior', 'cutOutWarrior'], ['stringless', 'Folded Champion', 'cutOutWarrior', 1.15],
  // jar-creature-sprites: "the walking jar stays the stormjar"; the husk bearer and the lamp keeper are their own
  ['mournhusk', 'Husk Bearer', 'huskBearer'], ['mournhusk', 'Wrapped Husk', 'huskBearer'], ['mournhusk', 'Husk of the Long Keeping', 'huskBearer', 1.15],
  ['lanternwraith', 'Lamp Keeper', 'lampKeeper'], ['lanternwraith', 'Kept Lamp', 'lampKeeper'], ['lanternwraith', 'Lamp of the Sealed Room', 'lampKeeper', 1.15],
  // prism-shardling-sprite: the prismatic shardling (Glimeron; and Doppelganger's Prism Shardling guardian)
  ['shardling', 'Prismatic Shardling', 'livingPrism'], ['shardling', 'Prism Shardling', 'livingPrism'],
  // relay-drone-sprite: the bluesteel clock-crawler
  ['clockcrawler', 'Relay Drone', 'relayDrone'], ['clockcrawler', 'Relay Crawler', 'relayDrone'], ['clockcrawler', 'Switchboard Crawler', 'relayDrone', 1.2],
  // force-construct-sprite: the fist (the knot -- Kinetic Wisp -- is the one-off sheet fx394_force_knot, R394_SUMMON_PROPS)
  ['elemental', 'Shaped-Force Fist', 'forceFist'],
  // scarecrow-sprite x2, straw-double-sprite: the totemstalk; and Scarecrow Risen, a raised body (corpseMixin's skeleton)
  ['totemstalk', 'Scarecrow Sentinel', 'strawMan'], ['totemstalk', 'Scarecrow', 'strawMan'], ['totemstalk', 'Straw Colossus', 'strawMan', 1.3],
  ['totemstalk', 'Scarecrow Warden', 'strawMan'], ['totemstalk', 'The Burning Scarecrow', 'strawMan', 1.25],
  ['totemstalk', 'Walking Effigy', 'strawMan'], ['totemstalk', 'Straw Stand-In', 'strawMan'],
  ['skeleton', 'Scarecrow Risen', 'strawMan'],
];
for (const [from, name, to, scale] of R394_SWAPS) R393_PAIR_SWAP[`${from}|${name}`] = scale ? [from, to, scale] : [from, to];

/** The stand-in shades that mean "the new body as drawn" (the element then picks the row). */
Object.assign(R393_BASE_PINS, {
  anzu: ['gilded'], garuda: ['gilded'], roc: ['gilded'], firebird: ['ember'], harpy: ['umbral'], herald: ['umbral'],
  heron: ['cobalt'], koi: ['amber', 'pale'], pixie: ['rosebud'], gremlin: ['crimson'], cambion: ['crimson'],
  devourer: ['void'], forgeHound: ['ember'], dustDevilCur: ['stormcloud'], golem: ['autumn'], harness: ['bronzed'],
  swornKnight: ['bronzed'], royalGuard: ['bronzed'], gaoler: ['moonlit'], turnkey: ['brass'], livingStatue: ['moonstone'],
  walkingOak: ['verdant'], thunderheadSpirit: ['lightning'], coalescedGiant: ['darkness'], constellationLion: ['gilded'],
  greatSerpent: ['green'], livingSutra: ['goldleaf'], doppelganger: ['ashen'], cutOutWarrior: ['harlequin'],
  huskBearer: ['goldwrapped'], lampKeeper: ['turquoise'], livingPrism: ['prismatic'], relayDrone: ['bluesteel'],
  forceFist: ['earth'], strawMan: ['painted'],
});
/** Per-family readings of a pin: the golem's ashen / bleached is the mortar golem's grey rubble. */
Object.assign(R393_FAMILY_ALIAS, {
  golem: { ashen: 'mortar', bleached: 'mortar' },
  strawMan: { ashen: 'stone' },
  pixie: { bluebell: 'frost', violet: 'void' },
});
/** Pins the round-393 alias table did not read. */
for (const [k, v] of Object.entries({ inkblack: 'void', bluebell: 'frost', moonlit: 'frost', sunlit: 'radiant',
  silvered: 'stone', teal: 'frost', amber: 'ember' })) {
  if (!R393_SHADE_ALIAS[k]) R393_SHADE_ALIAS[k] = v;
}

/** Wild bonds: per confluence, the stand-in its wildBond list names -> the body it answers in. */
const BONDS = {
  Anzu: { thunderbird: 'anzu' },
  Garuda: { 'thunderbird:gilded': 'garuda' },
  Roc: { thunderbird: 'roc' },
  Firebird: { phoenix: 'firebird' },
  Harpy: { birdangel: 'harpy' },
  Nemesis: { birdangel: 'herald' },
  Tranquil: { glasswader: 'heron', lurefin: 'koi' },
  Fey: { bloomimp: 'pixie' },
  Chaotic: { 'demon:crimson': 'gremlin' },
  Succubus: { 'demon:crimson': 'cambion' },
  Eclipse: { hellhound: 'devourer' },
  Forge: { hellhound: 'forgeHound', 'ossuaryKnight:bronzed': 'harness' },
  Vortex: { 'smokecur:stormcloud': 'dustDevilCur' },
  Animate: { 'cairnbeast:autumn': 'golem' },
  Edifice: { 'slimeGolem:ashen': 'golem' },
  Guardian: { ossuaryKnight: 'swornKnight' },
  Prison: { lanternwraith: 'gaoler', clockcrawler: 'turnkey' },
  Monolith: { 'geodeback:moonstone': 'livingStatue' },
  Storm: { 'elemental:lightning': 'thunderheadSpirit' },
  Nebula: { 'elemental:darkness': 'coalescedGiant' },
  Stellar: { 'whitelion:gilded': 'constellationLion' },
  Serpent: { 'hydra:green': 'greatSerpent' },
  Mystic: { inkwell: 'livingSutra' },
  Doppelganger: { stringless: 'doppelganger' },
  Talisman: { stringless: 'cutOutWarrior' },
  Vessel: { mournhusk: 'huskBearer', lanternwraith: 'lampKeeper' },
  Glimeron: { 'shardling:prismatic': 'livingPrism' },
  Network: { clockcrawler: 'relayDrone' },
  Harvest: { 'totemstalk:painted': 'strawMan' },
  Effigy: { totemstalk: 'strawMan' },
};
export const R394_BOND_SWAP = BONDS;
for (const [conf, t] of Object.entries(BONDS)) R393_BOND_SWAP[conf] = { ...(R393_BOND_SWAP[conf] || {}), ...t };

/** The swap for `family` named `name` (round 393's lookup, which now reads the pairs). */
export const r394SwapFor = r393SwapFor;

// ---- the turret and trap bodies -----------------------------------------------------------------------------------
/** public/assets/creatures/props/<prop>.png (8 frames) + _still + _<element> + _<confluence tint>. */
export const R394_PROPS = {
  arc_pylon: { w: 32, h: 64 }, archer_blind: { w: 48, h: 48 }, ballista_small: { w: 48, h: 48 }, belfry_roost: { w: 32, h: 48 },
  blowhole_rock: { w: 48, h: 48 }, brazier: { w: 48, h: 64 }, briar_bush: { w: 32, h: 32 }, crystal_pylon: { w: 32, h: 64 },
  disc_mine: { w: 32, h: 32 }, emplacement: { w: 48, h: 48 }, feast_table: { w: 64, h: 32 }, flame_pillar: { w: 32, h: 64 },
  floating_lens: { w: 32, h: 32 }, gilded_idol: { w: 32, h: 48 }, hanging_prism: { w: 32, h: 32 }, hourglass: { w: 32, h: 48 },
  iron_lantern: { w: 32, h: 48 }, jack_box: { w: 32, h: 32 }, jaw_trap: { w: 48, h: 32 }, loom_frame: { w: 48, h: 64 },
  magic_font: { w: 48, h: 48 }, magic_lantern: { w: 48, h: 48 }, menhir_sigil: { w: 32, h: 64 }, mimic_chest: { w: 32, h: 32 },
  mortar_pit: { w: 48, h: 48 }, obelisk: { w: 32, h: 64 }, open_belfry: { w: 32, h: 48 }, paper_lantern: { w: 32, h: 32 },
  pillory: { w: 32, h: 48 }, pincushion: { w: 32, h: 32 }, pod_plant: { w: 48, h: 48 }, practice_dummy: { w: 32, h: 48 },
  prayer_drum: { w: 32, h: 48 }, roc_nest: { w: 64, h: 64 }, rose_trellis: { w: 32, h: 48 }, sarcophagus: { w: 48, h: 32 },
  sealed_jar: { w: 32, h: 32 }, sealed_note: { w: 32, h: 32 }, sleet_squall: { w: 32, h: 48 }, storm_spire: { w: 32, h: 64 },
  sundial_shrine: { w: 32, h: 48 }, tally_post: { w: 32, h: 48 }, thunderhead: { w: 48, h: 32 }, training_post: { w: 32, h: 48 },
  tripod_sentry: { w: 48, h: 48 }, war_banner: { w: 32, h: 64 }, war_drum: { w: 32, h: 32 }, warding_post: { w: 32, h: 48 },
  watch_cairn: { w: 48, h: 48 }, watchtower: { w: 32, h: 48 }, zoetrope: { w: 48, h: 48 },
};
export const R394_PROP_FRAMES = 8;
export const R394_PROP_FRAME_MS = 100;
export const R394_PROP_ELEMENTS = ['ember', 'frost', 'storm', 'void', 'verdant', 'stone', 'radiant'];
/** The merged bodies' confluence tints (tools/pack_round394_props.py CONF_TINTS). */
export const R394_PROP_TINTS = {
  brazier: ['gold', 'crimson', 'violet', 'white'], ballista_small: ['iron', 'sea', 'moss'], tripod_sentry: ['arcane', 'chrome'],
  arc_pylon: ['chrome', 'arcane', 'violet'], pod_plant: ['lotus', 'harvest'], floating_lens: ['sun', 'gold'],
  obelisk: ['weathered'], war_banner: ['sable', 'gold'], jaw_trap: ['rust', 'iron'], magic_font: ['gold'],
};
/** A prop's own colours already ARE these elements: an ability of one of them keeps the art as drawn. */
export const R394_PROP_NATIVE = {
  brazier: ['fire'], flame_pillar: ['fire', 'radiant', 'light', 'holy'], thunderhead: ['lightning', 'wind'],
  sleet_squall: ['frost', 'ice', 'water'], storm_spire: ['lightning'], blowhole_rock: ['water'], crystal_pylon: ['resonating', 'light'],
  arc_pylon: ['lightning'], gilded_idol: ['radiant', 'light'], hourglass: ['sand', 'dimension'], rose_trellis: ['piercing', 'plant'],
  briar_bush: ['piercing', 'plant', 'nature'], pod_plant: ['plant', 'nature'], magic_font: ['arcane'], hanging_prism: ['radiant', 'light'],
  floating_lens: ['light', 'radiant'], open_belfry: ['resonating'], war_drum: ['resonating'], obelisk: ['resonating'],
  roc_nest: ['rock'], sundial_shrine: ['radiant', 'light'], sealed_jar: ['arcane'], iron_lantern: ['light'], paper_lantern: ['light'],
};

/**
 * Every row the props serve, by `confSheet/confEntry` (the sheet and the entry id the ability carries -- two sheets
 * can share an id: Action's and Cyborg's `sentry-turret`).
 *   prop     the body
 *   tint     a confluence tint (R394_PROP_TINTS) or an element row; omitted = the element of the ability, else as drawn
 *   brush    draw a briar bush in front (the hidden ballista)       coins  gold coins spout from it (the coin fountain)
 *   crown    a second prop on top (the meteor beacon's brazier)     as     'turret' | 'trap' | 'creature' | 'gear' |
 *            'aura' (shown while a passive is up) | 'cast' (rises where it is cast, for `ms`) with `layout`
 *            'one' | 'line' | 'ring' | 'self'
 */
export const R394_PROP_USES = {
  // brazier: "tint the flame per confluence"
  'Immortal/undying-brazier': { prop: 'brazier', tint: 'gold' },
  'Sacrifice/votive-brazier': { prop: 'brazier', tint: 'crimson' },
  'Succubus/hellfire-brazier': { prop: 'brazier', tint: 'violet' },
  'Wrath/brazier-of-grievances': { prop: 'brazier', tint: null },
  'Wrath/pillar-of-righteous-flame': { prop: 'flame_pillar', tint: null },
  // ballista_small: ballista x2, the deck ballista, the hidden one (brush in front), the blind's ballista
  'Arsenal/emplaced-ballista': { prop: 'ballista_small', tint: 'iron' },
  'Arsenal/crank-arbalest-post': { prop: 'ballista_small', tint: 'iron' },
  'Battlefield/ballista-emplacement': { prop: 'ballista_small', tint: null },
  'Ocean/harpoon-ballista': { prop: 'ballista_small', tint: 'sea' },
  'Ambush/concealed-ballista': { prop: 'ballista_small', tint: 'moss', brush: true },
  'Ambush/hidden-launcher': { prop: 'ballista_small', tint: 'moss', brush: true },
  'Predatory/waiting-ballista': { prop: 'ballista_small', tint: null },
  'Battlefield/archers-post': { prop: 'archer_blind' },
  'Predatory/thicket-blind': { prop: 'archer_blind' },
  // tripod_sentry / arc_pylon
  'Action/sentry-turret': { prop: 'tripod_sentry', tint: null },
  'Action/mounted-repeater': { prop: 'tripod_sentry', tint: null },
  'Magitech/sigil-sentry-turret': { prop: 'tripod_sentry', tint: 'arcane' },
  'Magitech/flame-turret': { prop: 'tripod_sentry', tint: 'ember' },
  'Cyborg/sentry-turret': { prop: 'tripod_sentry', tint: 'chrome' },
  'Cyborg/tesla-pylon': { prop: 'arc_pylon', tint: 'chrome' },
  'Magitech/arc-tower': { prop: 'arc_pylon', tint: 'arcane' },
  'Empower/charged-pylon': { prop: 'arc_pylon', tint: 'violet' },
  // pod_plant
  'Lotus/seed-pod-spitter': { prop: 'pod_plant', tint: 'lotus' },
  'Fertile/seedpod-spitter': { prop: 'pod_plant', tint: null },
  'Bounty/popping-seedpod': { prop: 'pod_plant', tint: 'harvest' },
  // lanterns
  'Twilight/hanging-lantern': { prop: 'iron_lantern' },
  'Twilight/tossed-lamp': { prop: 'iron_lantern' },
  'Twilight/lamp-for-the-moths': { prop: 'iron_lantern', as: 'cast', layout: 'one', ms: 4000 },
  'Twilight/lamps-along-the-road': { prop: 'iron_lantern', as: 'cast', layout: 'line', ms: 5000 },
  'Twilight/pool-of-lamplight': { prop: 'iron_lantern', as: 'cast', layout: 'one', ms: 6000 },
  'Twilight/ring-of-lanterns': { prop: 'iron_lantern', as: 'cast', layout: 'ring', ms: 4000 },
  'Tranquil/lantern-path-home': { prop: 'paper_lantern', as: 'cast', layout: 'line', ms: 3000 },
  'Tranquil/lantern-of-the-shrine': { prop: 'paper_lantern', as: 'creature' },
  'Tranquil/shrine-lantern-on-a-pole': { prop: 'paper_lantern', as: 'gear' },
  'Phantasmagoria/brass-projecting-lantern': { prop: 'magic_lantern' },
  'Phantasmagoria/spinning-zoetrope': { prop: 'zoetrope' },
  // floating_lens / obelisk
  'Mirage/burning-lens': { prop: 'floating_lens', tint: 'sun' },
  'Vision/watching-lens': { prop: 'floating_lens', tint: null },
  'Monolith/humming-obelisk': { prop: 'obelisk', tint: null },
  'Immortal/obelisk-of-ages': { prop: 'obelisk', tint: 'weathered' },
  'Boundary/warding-menhir': { prop: 'menhir_sigil' },
  'Boundary/watch-cairn': { prop: 'watch_cairn' },
  'Resonating/singing-pylon': { prop: 'crystal_pylon' },
  'Refracting/standing-prism': { prop: 'crystal_pylon' },
  'Refracting/frost-lens': { prop: 'crystal_pylon', tint: 'frost' },
  // war_banner: shown while the banner passive is up / where the rally point is planted
  'Battlefield/raised-banner': { prop: 'war_banner', tint: null, as: 'aura' },
  'Onslaught/raised-colours': { prop: 'war_banner', tint: 'sable', as: 'aura' },
  'Onslaught/rally-point': { prop: 'war_banner', tint: 'sable', as: 'cast', layout: 'one', ms: 6000 },
  // jaw_trap
  'Ambush/snapping-jaws': { prop: 'jaw_trap', tint: 'iron' },
  'Predatory/toothed-snare': { prop: 'jaw_trap', tint: 'rust' },
  'Predatory/line-of-snares': { prop: 'jaw_trap', tint: 'rust', as: 'cast', layout: 'line', ms: 5000 },
  // traps
  'Doppelganger/mimic-chest': { prop: 'mimic_chest' },
  'Immortal/sleeping-sarcophagus': { prop: 'sarcophagus' },
  'Vessel/sealed-jar': { prop: 'sealed_jar' },
  'Vessel/thrown-flask': { prop: 'sealed_jar' },
  'Karmic/promissory-note': { prop: 'sealed_note' },
  'Karmic/binding-contract': { prop: 'sealed_note' },
  'Magitech/sigil-mine': { prop: 'disc_mine' },
  'Magitech/sticky-charge': { prop: 'disc_mine' },
  'Magitech/glyph-tripwire': { prop: 'disc_mine' },
  'Phantasmagoria/jack-in-the-box-horror': { prop: 'jack_box' },
  // posts and drums
  'Unity/drummer-on-the-wall': { prop: 'war_drum' },
  'Unity/beat-the-drum': { prop: 'war_drum', as: 'cast', layout: 'self', ms: 2500 },
  'Transgression/pillory': { prop: 'pillory' },
  'Karmic/tally-post': { prop: 'tally_post' },
  'Talisman/warding-post': { prop: 'warding_post' },
  'Master/spinning-post': { prop: 'training_post' },
  'Master/practice-dummy': { prop: 'practice_dummy', as: 'creature' },
  // magic_font: "the coin fountain is this with gold coin particles"
  'Chaotic/wild-magic-font': { prop: 'magic_font', tint: null },
  'Chaotic/spinning-prism': { prop: 'hanging_prism' },
  'Prosperity/coin-fountain': { prop: 'magic_font', tint: 'gold', coins: true },
  'Prosperity/gilded-shrine': { prop: 'magic_font', tint: 'gold' },
  // the rest
  'Weave/loom-frame': { prop: 'loom_frame' },
  'Weave/pincushion-sentry': { prop: 'pincushion' },
  'Mystic/prayer-drum': { prop: 'prayer_drum' },
  'Succubus/rose-trellis': { prop: 'rose_trellis' },
  'Verdant/briar-bush': { prop: 'briar_bush' },
  'Verdant/nettle-clump': { prop: 'briar_bush', tint: 'verdant' },   // "+ nettle recolour"
  'Onslaught/firing-emplacement': { prop: 'emplacement' },
  'Onslaught/mortar-pit': { prop: 'mortar_pit' },
  'Ocean/spouting-rock': { prop: 'blowhole_rock' },
  'Ziz/captive-thunderhead': { prop: 'thunderhead' },
  'Ziz/pinned-sleet-squall': { prop: 'sleet_squall' },
  'Cataclysm/storm-spire': { prop: 'storm_spire' },
  'Cataclysm/meteor-beacon': { prop: 'storm_spire', tint: null, crown: 'brazier' },   // "meteor beacon = engine brazier flame on top"
  'Time/standing-hourglass': { prop: 'hourglass' },
  'Cycle/seasonal-shrine': { prop: 'sundial_shrine' },
  'Avatar/graven-idol': { prop: 'gilded_idol' },
  'Avatar/shrine-of-gilt': { prop: 'gilded_idol' },
  'Roc/fledgling-nest': { prop: 'roc_nest' },
  'Roc/boulder-dropping-perch': { prop: 'roc_nest' },
  'Roc/the-great-nest': { prop: 'roc_nest', as: 'cast', layout: 'one', ms: 6000 },
  'Twilight/belfry-roost': { prop: 'belfry_roost' },
  'Edifice/watchtower': { prop: 'watchtower' },
  // royal-guard-sprite's other row: the Sovereign's Guard Tower is a squat watchtower with a household knight on it
  'Sovereign/guard-tower': { prop: 'watchtower', crownBody: 'royalGuard' },
  'Edifice/belfry': { prop: 'open_belfry' },
  'Bounty/laden-table': { prop: 'feast_table', as: 'cast', layout: 'one', ms: 8000 },   // design-only on the sheet today
};
/** The rows the props leave to other paths, so the suite can say every served row was looked at. */
export const R394_PROP_NOT_PLACED = {};

/** The use for an ability (`a.confSheet` / `a.confEntry`), or null. */
export function r394PropUseFor(a) {
  if (!a || !a.confEntry) return null;
  return (a.confSheet && R394_PROP_USES[`${a.confSheet}/${a.confEntry}`]) || null;
}

const PLAIN_TYPES = new Set(['physical', 'blunt', 'piercing', 'slashing', 'disruptive']);
/**
 * The tint file a use wears, given the ability's element: a pinned confluence tint (or element row) first; else the
 * element's row unless the prop's own colours already are that element; else null (the art as drawn).
 */
export function r394PropTint(use, element) {
  if (!use) return null;
  if (use.tint !== undefined) {
    if (use.tint === null) return null;
    const ok = (R394_PROP_TINTS[use.prop] || []).includes(use.tint) || R394_PROP_ELEMENTS.includes(use.tint);
    return ok ? use.tint : null;
  }
  if (!element || PLAIN_TYPES.has(element) || (R394_PROP_NATIVE[use.prop] || []).includes(element)) return null;
  const t = R393_ELEMENT_SHADE[element];
  return t && R394_PROP_ELEMENTS.includes(t) ? t : null;
}

/** On-screen size: a turret reads at about a man's height, a trap at half that. */
export function r394PropScale(prop, as = 'turret') {
  const d = R394_PROPS[prop];
  if (!d) return 1;
  const want = as === 'trap' ? 40 : 60;
  return Math.max(1, Math.min(1.6, want / d.h));
}

// ---- creature summons that are not monster bodies -------------------------------------------------------------------
/** Called creatures drawn as a prop or a one-off sheet rather than a monster atlas. */
export const R394_SUMMON_PROPS = {
  'Force/kinetic-wisp': { fx: 'force_knot', scale: 2.2 },   // "Its knot is the one-off agent's key fx394_force_knot"
  'Master/practice-dummy': { prop: 'practice_dummy' },
  'Tranquil/lantern-of-the-shrine': { prop: 'paper_lantern', float: true },
};
export function r394SummonPropFor(a) {
  if (!a || !a.confEntry || !a.confSheet) return null;
  return R394_SUMMON_PROPS[`${a.confSheet}/${a.confEntry}`] || null;
}

// ---- the bodies a cast shows for a moment ---------------------------------------------------------------------------
/**
 * Abilities that are not summons but whose sheet entry asks for one of the new bodies: the owl's stoops, the lark's
 * darts, the koi dart, the heron's stab, the polymorph toad, the straw double and the wicker man's straw base.
 *   kind: 'stoop' (the body flies from above you onto the target) | 'swim' (it travels out along the aim) |
 *         'stab' (it rises beside the target and strikes) | 'toad' (drawn over the target for a while) |
 *         'double' (stands where you were) | 'wicker' (a great straw man at your feet, ember) |
 *         'glide' (flies beside you along a dash) | 'drone' (orbits you while the gear is worn) | 'mob' (gremlins
 *         scamper round you while the aura is up)
 */
export const R394_CAST_BODIES = {
  'Twilight/silent-stoop': { kind: 'stoop', family: 'owl' },
  'Twilight/owls-drop': { kind: 'stoop', family: 'owl' },
  'Twilight/the-owl-hour': { kind: 'stoop', family: 'owl', count: 3 },
  'Twilight/owls-glide': { kind: 'glide', family: 'owl' },
  'Dawn/larks-dart': { kind: 'stoop', family: 'lark' },
  'Dawn/lark-rising': { kind: 'stoop', family: 'lark', count: 2 },
  'Dawn/larkstride': { kind: 'glide', family: 'lark' },
  'Tranquil/koi-dart': { kind: 'swim', family: 'koi' },
  'Tranquil/heron-waits': { kind: 'stab', family: 'heron' },
  'Transfiguration/toad-for-a-breath': { kind: 'toad', family: 'toad', ms: 3000 },
  'Effigy/straw-double': { kind: 'double', family: 'strawMan', ms: 4000 },
  'Effigy/wicker-man': { kind: 'wicker', family: 'strawMan', ms: 1400, scale: 2.2 },
  'Chaotic/gremlin-mob': { kind: 'mob', family: 'gremlin', count: 3 },
  'Cyborg/drone-remote': { kind: 'drone', family: 'gunDrone' },
  'Tranquil/koi-scale-charm': { kind: 'drone', family: 'koi', scale: 0.5, lift: 20 },   // the charm's koi swims round you
};
export function r394CastBodyFor(a) {
  if (!a || !a.confEntry || !a.confSheet) return null;
  return R394_CAST_BODIES[`${a.confSheet}/${a.confEntry}`] || null;
}
/** Worn / standing bodies: read off the running kit, not a cast. */
export const R394_WORN = new Set(['Cyborg/drone-remote', 'Tranquil/shrine-lantern-on-a-pole', 'Battlefield/raised-banner',
  'Onslaught/raised-colours', 'Chaotic/gremlin-mob', 'Tranquil/koi-scale-charm']);
