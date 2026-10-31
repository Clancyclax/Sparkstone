// ===========================================================================
// ROUND 394 -- THE GAP ROWS THAT NEED NO NEW ART: WHAT EACH ONE DRAWS.
//
//   r392 brief, section 0: "These are r391 gaps whose art is already in art-r391. They only need the r391 wiring
//                           finished." ("Travelling impact: shockring moved along the line.")
//   section 1: "Covered by r391 / r388 art -- no new files. Map each row to the existing sheet and apply the tint, speed,
//               scale or layering shown."
//   section 2: "Engine-only (no art)": player copies, lighting and screen effects, lines drawn in code, tracer streams,
//               redaction.
//   "Don't forget to recolor all the new monster and animations for elemental variation."
//
// The same shape as round 393's table (src/data/fxArt393.js GAP_ART -- read its header for a layer's fields), and the
// same plumbing: fxArt393For() merges these gaps in beside its own (each source keeps its own art table), so a covered
// entry's cast, cone, beam or dash plays these layers through fxArt393Mixin, in the ability's damage type where a
// layer's colour is 'type'. The shapes round 393 did not have -- copies of the player, screen washes, drawn lines, a
// prop out of the ground, coins, leaves, stills raining -- are drawn by src/scenes/fxMap394Mixin.js (FXMAP_SHAPES).
//
// Which entries draw which gap: src/data/fxMap394Gaps.js (tools/build_fxmap394_gaps.mjs: the sheets' `needs`, and the
// entries each gap's own text names).
//
// Other agents' art this table only REFERENCES (their texture keys, each with a fallback that is already in the
// game): claw_rake, empower_burst, crystal_shatter, mirror_shard (effects/oneoff), roc_egg, egg_burst, pyre_logs, rivet,
// broadhead (projectiles), the roc / garuda / straw_man bodies (creatures). An `ext` layer lists candidate keys and
// draws the first that is loaded; when none is, it draws its `fb` layer instead.
// ===========================================================================
import { FXMAP_ENTRY_GAPS, FXMAP_ENTRY_NAMES, FXMAP_ROWS } from './fxMap394Gaps.js';
import { FX6_FAMILIES, PROJ393 } from './spellFx6.js';
import { DAMAGE_FX_COLORS, damageFxFor } from './damageFx.js';

// ---- tints (the brief's words) -------------------------------------------------------------------------------------
export const TMAP = {
  gold: 0xffd25a, paleGold: 0xffe7a0, bronze: 0xd99a4e, greyGold: 0xd8c890, violet: 0xc4a6ff, pink: 0xff8ac4,
  cyan: 0x6ff4ff, ochre: 0xd2a45a, grey: 0xbdbdbd, brown: 0x8f6a3e, lavender: 0xcdb2ff, green: 0x9ee05a,
  acid: 0xa8f04a, orange: 0xff9a3c, whiteGold: 0xfff3c4, clearBlue: 0xa8e2ff, ice: 0xbfe8ff, mothPale: 0xf3ecd6,
  redBlack: 0x8a2a1a, greyViolet: 0xb0a2c8, seaGrey: 0xb7c2c8, ageGrey: 0xa8a090, salt: 0xf4f4ee, deepBlue: 0x4f78d0,
  wormViolet: 0xa070ff, roseRed: 0xd8202a, steel: 0xd8e4ee, straw: 0xe0c070, mortar: 0x9a9a92,
};
const T = TMAP;

// ---- layer builders --------------------------------------------------------------------------------------------------
const ring = (c, o = {}) => ({ f: 'shockring', c, shape: 'flat', ...o });
const cone = (f, c, o = {}) => ({ f, c, shape: 'cone', lift: 28, ...o });
const tinted = (f, tint, o = {}) => ({ f, c: 'native', tint, ...o });
/** Three rings rolling out a beat apart (the sound families: "two or three wobbling concentric rings"). */
const rings3 = (c, tint, o = {}) => [0, 1, 2].map(i => ({ f: 'shockring', c, tint, shape: 'flat', scale: (o.scale || 1) * (1 - i * 0.14),
  delay: (o.delay || 0) + i * (o.every || 110), alpha: 1 - i * 0.15, speed: o.speed }));
const alongBeam = (f, c, n, o = {}) => ({ f, c, shape: 'along', n, every: 90, ...o });

/**
 * What each gap draws, by the form the ability casts (ring / cone / beam / move -- fxArt393.js fx393Kind), plus:
 *   flight    the projectile's art (a round-393 still: art, tint, scale, spin, trail; or a sheet: sheet / coin / leaf /
 *             butterfly / streak, with hue / swell / sy)  -- flight394For
 *   override  a held beam's body: { drawn: 'line' } draws no sheet at all (the line layer IS the beam); { family, color }
 *             another sheet, as round 393's stare beam
 *   turret    the turret's body (_fx394SummonSprite):  city prop / r393 prop / pendulum / a copy of the player / a still / a sheet
 *   summon    a called creature's body: a copy of the player, an NPC sheet tinted, or a monster family and shade
 *   byEntry   per-entry forms, merged over the gap's own (entry id -> partial record)
 *   byConf    per-sheet forms (sheet name -> partial record) -- two sheets filed one gap id for different things
 */
export const FXMAP_GAP_ART = {
  // =============================================================================== section 0: the r391 carry-over ==
  'impact-fx': {
    // "Travelling impact: shockring moved along the line." Pressure Front is a bolt: the ring of shimmering air IS the
    // flight, and where it lands the r393 impact (groundquake, ring, debris) plays.
    sound: 'explosion',
    ring: [ring('type', { scale: 0.9 }), { f: 'groundquake', c: 'type', shape: 'flat', scale: 0.7, alpha: 0.8 },
      { f: 'puff', c: 'white', shape: 'scatter', n: 5, scale: 1.4, alpha: 0.8 }],
    cone: [{ f: 'shockring', c: 'type', shape: 'travelflat', scale: 0.7 }, { f: 'shockring', c: 'type', shape: 'travelflat', scale: 0.55, delay: 140, alpha: 0.7 }],
    flight: { sheet: 'shockring', c: 'type', scale: 0.42, sy: 0.5, heading: 'none' },
  },
  'petrify-fx': {
    // the stone creep over what the time-stop, the snare, the turret's grit and the shard catch (r393: the attacks)
    sound: 'cracks',
    ring: [{ f: 'stonecreep', c: 'stone', shape: 'bodies', reach: 1.6 }, { f: 'groundquake', c: 'stone', shape: 'flat', scale: 0.6, alpha: 0.6 }],
    beam: [{ f: 'stonecreep', c: 'stone', shape: 'bodies' }],   // the beam's body is the stone ray (beamWall394)
  },
  'tentacle-fx': {
    // Unrolling Arm: "a LOOPING arm-laid-along-the-ground body that tiles along its length" -- the r391 tentacle risen
    // in a row down the beam, as the r393 Wall of Arms raises it across a wall
    sound: 'cracks',
    beam: [{ shape: 'propalong', prop: 'tentacle', n: 5, scale: 0.62, every: 90, hold: 1, lie: true }],
  },

  // ======================================================================================= section 1: shockring ==
  'sound-ring-fx': { sound: 'pulse', ring: rings3('type', null, { every: 90 }), cone: [cone('shockcone', 'type'), cone('shockcone', 'type', { delay: 120, alpha: 0.8, scale: 0.85 })] },
  'sound-ripple-fx': {
    sound: 'pulse',
    ring: rings3('native', T.violet), cone: [tinted('shockcone', T.violet, { shape: 'cone', lift: 26 }), tinted('shockcone', T.violet, { shape: 'cone', lift: 26, delay: 130, scale: 0.85, alpha: 0.8 })],
    move: [tinted('shockring', T.violet, { shape: 'along', n: 3, every: 60 }), tinted('shockring', T.violet, { shape: 'flat', at: 'end', scale: 0.8 })],
  },
  'toll-fx': { sound: 'pulse', ring: rings3('native', T.greyGold, { speed: 0.6, every: 260 }), cone: [tinted('shockcone', T.greyGold, { shape: 'cone', lift: 28, speed: 0.6 })] },
  'vespers-fx': { sound: 'pulse', ring: [...rings3('native', T.paleGold, { speed: 0.6, every: 240, scale: 1.2 }), { f: 'mote', c: 'gold', shape: 'scatter', n: 6, add: true, delay: 200 }] },
  'taunt-ring-fx': { sound: 'pulse', ring: [tinted('shockring', T.gold, { shape: 'flat', scale: 1.25, boost: 1.3 }), tinted('shockring', T.gold, { shape: 'flat', scale: 1.0, delay: 140 })] },
  'ping-ring-fx': { sound: 'pulse', ring: [tinted('shockring', T.cyan, { shape: 'flat', scale: 0.9, alpha: 0.75, add: true }), { f: 'mote', c: 'blue', tint: T.cyan, shape: 'centre', scale: 0.8, add: true }] },
  'bell-ring-fx': {
    sound: 'pulse',
    ring: [...rings3('native', T.bronze, { speed: 0.7, every: 200, scale: 1.3 }), { f: 'runecircle', c: 'gold', shape: 'flat', scale: 0.45, alpha: 0.6, speed: 0.6 }],
    cone: [tinted('shockcone', T.bronze, { shape: 'cone', lift: 28, speed: 0.7 })],
    beam: [tinted('shockring', T.bronze, { shape: 'along', n: 6, scale: 0.4, every: 120 })],
  },
  'chime-fx': {
    // "twelve rings of sound in quick succession, pale gold"
    sound: 'pulse',
    ring: Array.from({ length: 12 }, (_, i) => tinted('shockring', T.paleGold, { shape: 'flat', scale: 0.45 + i * 0.07, delay: i * 70, alpha: 0.75, add: true })),
  },
  'gong-fx': { sound: 'pulse', ring: [tinted('shockring', T.bronze, { shape: 'flat', boost: 1.3 }), tinted('shockring', T.bronze, { shape: 'flat', delay: 160, scale: 0.8, alpha: 0.8 }), { f: 'hitflash', c: 'gold', shape: 'centre', scale: 0.7, alpha: 0.8 }] },
  'hum-fx': {
    sound: 'pulse',
    ring: rings3('native', T.paleGold, { speed: 0.45, every: 300 }),
    beam: [tinted('shockring', T.paleGold, { shape: 'along', n: 5, scale: 0.35, speed: 0.5, every: 180 })],
  },
  'kiai-fx': { sound: 'pulse', cone: [cone('shockcone', 'type', { boost: 1.2 }), ring('type', { scale: 0.45, alpha: 0.8 })], ring: rings3('type', null, { every: 80 }) },
  'chorus-pulse-fx': { sound: 'pulse', ring: rings3('native', T.paleGold, { every: 120, scale: 1.2 }), cone: [tinted('shockcone', T.paleGold, { shape: 'cone', lift: 28 }), tinted('shockcone', T.paleGold, { shape: 'cone', lift: 28, delay: 120, alpha: 0.8 })] },
  'dinner-bell-fx': { sound: 'pulse', ring: [...rings3('native', T.gold, { every: 140, scale: 1.3 }), { shape: 'prop', prop: 'belltower', scale: 0.32, lift: 70, hold: 380, alpha: 0.9 }] },
  'dawn-chorus-fx': { sound: 'pulse', ring: [...rings3('native', T.gold, { every: 150, scale: 1.2 }), { f: 'mote', c: 'gold', shape: 'scatter', n: 8, add: true, delay: 150 }] },
  'temple-bell-art': {
    // "r391 belltower: the temple-bell drop" and the temple-bell ring
    sound: 'pulse',
    ring: [{ shape: 'prop', prop: 'belltower', drop: true, scale: 0.7, alpha: 0.7, hold: 520 }, ...rings3('native', T.bronze, { delay: 320, every: 160, scale: 1.3 })],
    cone: [{ shape: 'prop', prop: 'belltower', drop: true, scale: 0.55, alpha: 0.7, hold: 380 }, tinted('shockcone', T.bronze, { shape: 'cone', lift: 28, delay: 300 })],
  },
  'charm-fx': { sound: 'pulse', ring: [tinted('shockring', T.pink, { shape: 'flat', add: true, scale: 1.1 }), tinted('shockring', T.pink, { shape: 'flat', delay: 150, scale: 0.85, alpha: 0.75, add: true })] },
  'anvil-fx': { sound: 'pulse', ring: [tinted('shockring', 0xf0f0f0, { shape: 'flat', delay: 260, scale: 1.3 }), { f: 'groundquake', c: 'rock', shape: 'flat', delay: 240, scale: 0.5, alpha: 0.7 }] },

  // ========================================================================================== shockcone ==
  'noise-cone-fx': {
    // "layer 3 copies in clashing tints, out of phase"
    sound: 'pulse',
    cone: [tinted('shockcone', 0xff5f8f, { shape: 'cone', lift: 26, add: true }), tinted('shockcone', 0x5fffd0, { shape: 'cone', lift: 26, delay: 90, scale: 0.9, add: true }),
      tinted('shockcone', 0xffe04a, { shape: 'cone', lift: 26, delay: 180, scale: 0.8, add: true })],
  },
  'sirocco-fx': { sound: 'rain', cone: [tinted('shockcone', T.ochre, { shape: 'cone', lift: 22 }), tinted('billowcloud', T.ochre, { shape: 'along', n: 4, every: 70, alpha: 0.85 })] },

  // ======================================================================================== groundquake ==
  'shockwave-fx': { sound: 'cracks', shake: 120, ring: [{ f: 'groundquake', c: 'type', phys: 'earth', shape: 'flat', scale: 1.2 }, ring('type', { phys: 'earth', delay: 120, alpha: 0.7 })] },
  'shockwave-ring-fx': { sound: 'cracks', shake: 100, ring: [{ f: 'groundquake', c: 'type', phys: 'earth', shape: 'flat', scale: 1.0 }, { f: 'puff', c: 'brown', shape: 'scatter', n: 6, scale: 1.3, alpha: 0.8 }] },
  'roc-landing-fx': {
    sound: 'cracks', shake: 160,
    ring: [{ f: 'groundquake', c: 'earth', shape: 'flat', scale: 1.2 }, { shape: 'ext', keys: ['fx_claw_rake_native', 'fx394_claw_rake', 'oneoff_claw_rake', 'claw_rake'], anchor: 'centre', scale: 1.2, fb: { f: 'slashb', c: 'brown', shape: 'centre', scale: 1.0 } },
      { f: 'puff', c: 'brown', shape: 'scatter', n: 7, scale: 1.4, alpha: 0.85 }],
  },
  'collapse-fx': {
    sound: 'cracks', shake: 120,
    ring: [{ f: 'groundquake', c: 'rock', shape: 'flat', scale: 1.1 }, tinted('billowcloud', T.grey, { shape: 'scatter', n: 4, scale: 0.9, delay: 220, alpha: 0.8 }), { f: 'blastsm', c: 'brown', shape: 'centre', scale: 0.9, delay: 100 }],
    cone: [{ f: 'groundquake', c: 'rock', shape: 'along', n: 3, scale: 0.6, every: 110 }, tinted('billowcloud', T.grey, { shape: 'along', n: 3, every: 120, delay: 200, alpha: 0.8 })],
  },
  'withering-ring-fx': { sound: 'cracks', ring: [tinted('groundquake', T.brown, { shape: 'flat', scale: 1.1 }), { f: 'mote', c: 'grey', shape: 'scatter', n: 8, delay: 180 }] },

  // ======================================================================================== billowcloud ==
  'mist-fx': {
    sound: 'rain',
    ring: [tinted('billowcloud', 0xeef2f4, { shape: 'scatter', n: 4, alpha: 0.65, speed: 0.7 })],
    cone: [tinted('billowcloud', 0xeef2f4, { shape: 'along', n: 4, every: 70, alpha: 0.65, speed: 0.7 })],
    move: [tinted('billowcloud', 0xeef2f4, { shape: 'centre', scale: 1.1, alpha: 0.7 }), tinted('billowcloud', 0xeef2f4, { shape: 'centre', at: 'end', scale: 1.1, alpha: 0.7, delay: 80 })],
  },
  'sea-fog-fx': { sound: 'rain', ring: [tinted('billowcloud', T.seaGrey, { shape: 'scatter', n: 5, alpha: 0.7, speed: 0.6 })] },
  'fog-bank-fx': {
    sound: 'rain',
    ring: [tinted('billowcloud', T.greyViolet, { shape: 'scatter', n: 5, alpha: 0.7, speed: 0.6 })],
    cone: [tinted('billowcloud', T.greyViolet, { shape: 'along', n: 4, every: 70, alpha: 0.7, speed: 0.7 })],
  },
  'sedative-mist-fx': { sound: 'rain', ring: [tinted('billowcloud', T.lavender, { shape: 'scatter', n: 3, alpha: 0.75 })], cone: [tinted('billowcloud', T.lavender, { shape: 'along', n: 3, every: 80, alpha: 0.75 })] },
  'quench-steam-fx': {
    sound: 'rain',
    ring: [{ f: 'billowcloud', c: 'native', shape: 'scatter', n: 4, alpha: 0.85 }, { f: 'geyser', c: 'native', shape: 'centre', scale: 0.6, alpha: 0.8 }],
    cone: [{ f: 'billowcloud', c: 'native', shape: 'along', n: 4, every: 60, alpha: 0.85 }],
  },
  'grey-cloud-fx': {
    // "each projectile a knot of grey-brown insects" -- the swarm flies, and thins into grey cloud where it lands
    sound: 'rain',
    ring: [tinted('billowcloud', 0x9a8a70, { shape: 'centre', scale: 0.6, alpha: 0.75 }), tinted('speckswarm', 0x8a7a60, { shape: 'centre', scale: 0.8 })],
    flight: { sheet: 'speckswarm', c: 'native', tint: 0xc8b898, scale: 1.0, heading: 'none' },
  },
  'marsh-gas-fx': {
    sound: 'rain',
    ring: [tinted('billowcloud', T.green, { shape: 'scatter', n: 3, alpha: 0.75 })],
    beam: [],   // the plume is the gas material, bog-tinted (beamWall394)
  },
  'haboob-fx': {
    sound: 'rain',
    ring: [tinted('billowcloud', T.ochre, { shape: 'scatter', n: 5, alpha: 0.85 }), { f: 'puff', c: 'brown', shape: 'scatter', n: 5, scale: 1.3, alpha: 0.7 }],
    cone: [tinted('billowcloud', T.ochre, { shape: 'along', n: 4, every: 60, alpha: 0.85 })],
    beam: [],   // Driven Grit Stream is the gas material in sand (beamWall394)
  },
  'flash-powder-fx': {
    sound: 'explosion',
    ring: [{ f: 'blastsm', c: 'white', shape: 'centre', scale: 0.9, add: true }, tinted('billowcloud', 0xe0d0ff, { shape: 'centre', delay: 120, alpha: 0.7 }),
      { f: 'sparkfan', c: 'arcane', shape: 'scatter', n: 4, add: true, delay: 60 }],
    cone: [{ f: 'blastsm', c: 'white', shape: 'along', n: 2, every: 70, add: true }, tinted('billowcloud', 0xe0d0ff, { shape: 'along', n: 3, every: 80, delay: 100, alpha: 0.7 })],
  },

  // ========================================================================================= speckswarm ==
  'moth-cloud-fx': { sound: 'rain', ring: [tinted('speckswarm', T.mothPale, { shape: 'scatter', n: 4, scale: 1.3, laps: 3 })] },
  'ant-column-fx': { sound: 'rain', ring: [tinted('speckswarm', T.redBlack, { shape: 'scatter', n: 5, scale: 0.8, laps: 2 })], beam: [] },   // the beam is the gas material with the swarm over it (beamWall394)

  // ========================================================================================= bubblepool ==
  'acid-pool-fx': { sound: 'rain', ring: [tinted('bubblepool', T.acid, { shape: 'flat', laps: 3 })] },
  'oil-fire-fx': {
    sound: 'explosion',
    ring: [{ f: 'bubblepool', c: 'pitch', shape: 'flat', laps: 3 }, { f: 'firepath', c: 'orange', shape: 'scatter', n: 4, scale: 0.8, delay: 120 }],
    cone: [{ f: 'bubblepool', c: 'pitch', shape: 'along', n: 2, laps: 2, every: 100 }, { f: 'firepath', c: 'orange', shape: 'along', n: 3, every: 80, delay: 150 }],
  },
  'molten-metal-ground': { sound: 'explosion', ring: [tinted('bubblepool', T.orange, { shape: 'flat', laps: 3, add: true }), { f: 'firepath', c: 'orange', shape: 'scatter', n: 2, scale: 0.6, delay: 200 }] },

  // ============================================================================================= geyser ==
  'spring-upwelling-fx': { sound: 'rain', ring: [{ f: 'geyser', c: 'water', shape: 'scatter', n: 4, scale: 0.9 }, { f: 'geyser', c: 'water', shape: 'ground', scale: 1.1 }] },
  'smite-fx': { sound: 'explosion', ring: [tinted('geyser', T.whiteGold, { shape: 'pour', scale: 1.4, add: true }), { f: 'blastsm', c: 'gold', shape: 'centre', delay: 260, scale: 0.8, add: true }] },
  'green-eruption-fx': {
    sound: 'explosion',
    ring: [{ f: 'geyser', c: 'plant', shape: 'scatter', n: 5 }, { f: 'geyser', c: 'nature', shape: 'ground', scale: 1.2 }],
    cone: [{ f: 'geyser', c: 'plant', shape: 'along', n: 4, every: 80 }],
  },
  'pyre-fx': {
    // "the pyre flame (over projectiles/pyre_logs)"
    sound: 'explosion',
    ring: [{ shape: 'ext', keys: ['proj394_pyre_logs', 'fx394p_pyre_logs', 'pyre_logs', 'proj392_pyre_logs'], anchor: 'ground', scale: 1.6, hold: 900, fb: { f: 'firepath', c: 'orange', shape: 'centre', scale: 0.9 } },
      { f: 'geyser', c: 'fire', shape: 'ground', scale: 1.2, laps: 2 }],
    cone: [{ f: 'geyser', c: 'fire', shape: 'along', n: 3, every: 90 }],
    beam: [{ f: 'geyser', c: 'fire', shape: 'along', n: 6, scale: 0.6, every: 110 }],
  },
  'thermal-fx': {
    sound: 'rain',
    ring: [{ f: 'geyser', c: 'native', shape: 'ground', scale: 1.4, speed: 0.5, alpha: 0.4, laps: 2 }, { f: 'tornado', c: 'white', shape: 'ground', scale: 0.7, alpha: 0.35 }],
    beam: [{ f: 'geyser', c: 'native', shape: 'along', n: 5, speed: 0.5, alpha: 0.4, every: 140 }],
    move: [{ f: 'geyser', c: 'native', shape: 'ground', speed: 0.5, alpha: 0.45, scale: 1.3 }, { f: 'geyser', c: 'native', shape: 'ground', at: 'end', speed: 0.5, alpha: 0.45, scale: 1.3 }],
  },

  // ========================================================================================== boltstrike ==
  'strike-fx': {
    sound: 'lightning', flash: true,
    ring: [{ f: 'boltstrike', cut: 'lightning', shape: 'ground', scale: 1.4, add: true, boost: 2.3, speed: 0.6 }, ring('lightning', { scale: 0.6, delay: 80 })],
    cone: [{ f: 'boltstrike', cut: 'lightning', shape: 'along', n: 4, every: 110, add: true, boost: 2.3 }],
  },
  'orbital-ray-fx': {
    // "column, scaled wide": boltstrike's column cut down the beam's line
    sound: 'lightning',
    beam: [{ f: 'boltstrike', cut: 'fire', shape: 'along', n: 6, every: 90, scale: 2.0, add: true, boost: 2.3 }, { f: 'puff', c: 'grey', shape: 'along', n: 4, every: 150, delay: 300, alpha: 0.7 }],
  },

  // ========================================================================================== stonecreep ==
  'gilding-fx': { sound: 'cracks', ring: [{ f: 'stonecreep', c: 'native', tint: T.gold, shape: 'bodies' }] },
  'gilded-hold-overlay': {
    sound: 'cracks',
    ring: [{ f: 'stonecreep', c: 'native', tint: T.gold, shape: 'bodies' }, { f: 'mote', c: 'gold', shape: 'scatter', n: 5, add: true, delay: 400 }],
    beam: [{ f: 'stonecreep', c: 'native', tint: T.gold, shape: 'bodies' }],
  },
  'ageing-fx': {
    sound: 'cracks',
    ring: [{ f: 'stonecreep', c: 'native', tint: T.ageGrey, shape: 'bodies' }, { f: 'mote', c: 'grey', shape: 'scatter', n: 5, delay: 200 }],
    cone: [{ f: 'stonecreep', c: 'native', tint: T.ageGrey, shape: 'bodies' }, tinted('shockcone', T.ageGrey, { shape: 'cone', lift: 24, alpha: 0.7 })],
    beam: [{ f: 'stonecreep', c: 'native', tint: T.ageGrey, shape: 'bodies' }],
  },
  'held-stare-fx': { sound: 'cracks', ring: [{ f: 'stonecreep', c: 'stone', shape: 'bodies' }] },
  'salt-crust-fx': { sound: 'cracks', ring: [{ f: 'stonecreep', c: 'native', tint: T.salt, shape: 'bodies' }, tinted('groundquake', T.salt, { shape: 'flat', scale: 1.0, alpha: 0.7 })] },
  'prism-hold-overlay': {
    // "prism-hold (clear blue, plus crystal_shatter on break)"
    sound: 'cracks',
    ring: [{ f: 'stonecreep', c: 'native', tint: T.clearBlue, shape: 'bodies', add: true },
      { shape: 'ext', keys: ['fx_crystal_shatter_native', 'fx394_crystal_shatter', 'oneoff_crystal_shatter', 'crystal_shatter'], anchor: 'centre', onBodies: true, delay: 1350, fb: { f: 'icestorm', c: 'blue', shape: 'centre', scale: 0.5, delay: 1350 } }],
  },
  'greening-overlay': { sound: 'pulse', ring: [{ f: 'stonecreep', c: 'native', tint: T.green, shape: 'selfmask' }, { f: 'mote', c: 'green', shape: 'scatter', n: 5, delay: 200, add: true }] },

  // ============================================================================================ sparkfan ==
  'spark-shower-fx': {
    sound: 'lightning',
    ring: [{ f: 'sparkfan', c: 'fire', shape: 'cone', lift: 18, laps: 2, add: true, scale: 1.2 }, { f: 'sparkfan', c: 'fire', shape: 'scatter', n: 3, add: true, delay: 120 }],
    cone: [{ f: 'sparkfan', c: 'fire', shape: 'cone', lift: 18, laps: 3, add: true, scale: 1.3 }],
  },
  'welding-arc-fx': { sound: 'lightning', beam: [{ f: 'sparkfan', c: 'lightning', shape: 'end', laps: 6, add: true, scale: 0.9 }, { f: 'sparkfan', c: 'fire', shape: 'end', laps: 6, add: true, scale: 0.7, delay: 120 }] },

  // ============================================================================================ wavecrash ==
  'tidal-wave-fx': { sound: 'rain', cone: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.4 }], ring: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.2 }] },
  'tide-wave-fx': {
    sound: 'rain',
    ring: [{ f: 'wavecrash', c: 'water', shape: 'scatter', n: 3, scale: 0.9 }, { f: 'bubblepool', c: 'water', shape: 'flat', delay: 300, laps: 2, alpha: 0.7 }],
    beam: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.0, laps: 1 }, { f: 'wavecrash', c: 'water', shape: 'travel', scale: 0.8, delay: 450 }],
  },
  'wave-ride-fx': { sound: 'rain', move: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.0 }, { f: 'geyser', c: 'water', shape: 'ground', at: 'end', scale: 1.2, delay: 160 }] },
  'flood-fx': {
    sound: 'rain',
    ring: [{ f: 'wavecrash', c: 'water', shape: 'scatter', n: 4, scale: 1.0 }, { f: 'bubblepool', c: 'water', shape: 'flat', laps: 3, delay: 250 }],
    cone: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.3 }, { f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.0, delay: 200 }],
  },

  // ======================================================================================= graspinghands ==
  'refusal-fx': {
    // "refusal (dark hand, then the empower_burst flash)"
    sound: 'voidburst',
    ring: [{ shape: 'prop', prop: 'graspinghands', scale: 1.3, hold: 560 },   // the dead hand as drawn (a void cut is lost on dark ground)
      { shape: 'ext', keys: ['fx_empower_burst_native', 'fx394_empower_burst', 'oneoff_empower_burst', 'empower_burst'], anchor: 'centre', scale: 1.3, delay: 700, add: true, fb: { f: 'bloom', c: 'yellow', shape: 'centre', scale: 1.5, delay: 700, add: true } }],
  },
  'many-hands-fx': {
    sound: 'cracks',
    ring: [{ shape: 'prop', prop: 'graspinghands', tint: 'stone', n: 5, spread: 0.7, scale: 0.85, alpha: 0.6, hold: 420 }],
    cone: [{ shape: 'prop', prop: 'graspinghands', tint: 'stone', n: 4, along: true, scale: 0.8, alpha: 0.6, hold: 380 }],
  },
  'grave-fx': {
    sound: 'voidburst',
    ring: [{ shape: 'prop', prop: 'graspinghands', n: 2, spread: 0.4, scale: 0.9, hold: 650 }, tinted('groundquake', T.brown, { shape: 'flat', scale: 0.55, alpha: 0.8 })],
    move: [{ shape: 'prop', prop: 'graspinghands', scale: 0.9, hold: 380 }, { shape: 'prop', prop: 'graspinghands', at: 'end', scale: 0.9, hold: 380, delay: 120 }],
  },

  // ===================================================================================== fx3 vortex / tornado ==
  'whirlpool-ring-fx': { sound: 'voidburst', ring: [{ f: 'vortex', c: 'blue', tint: 0x6f8fd8, shape: 'flat', laps: 3 }] },
  'maelstrom-fx': { sound: 'voidburst', ring: [{ f: 'vortex', c: 'blue', tint: T.deepBlue, shape: 'flat', laps: 3 }, { f: 'puff', c: 'white', shape: 'scatter', n: 4, alpha: 0.6, delay: 300 }] },
  'wormhole-fx': {
    sound: 'voidburst',
    ring: [{ f: 'vortex', c: 'blue', tint: T.wormViolet, shape: 'flat', laps: 3, add: true }],
    beam: [{ f: 'vortex', c: 'blue', tint: T.wormViolet, shape: 'along', n: 4, scale: 0.6, every: 150, add: true }, { f: 'vortex', c: 'blue', tint: T.wormViolet, shape: 'end', scale: 0.5, add: true, laps: 2 }],
  },
  'spin-pull-fx': { sound: 'voidburst', ring: [{ f: 'vortex', c: 'grey', shape: 'flat', laps: 2, alpha: 0.6 }, { f: 'tornado', c: 'grey', shape: 'onbodies', scale: 0.35, alpha: 0.5 }] },
  'gyre-hold-fx': { sound: 'voidburst', beam: [{ f: 'tornado', c: 'white', shape: 'onbodies', scale: 0.45, alpha: 0.7 }, { f: 'tornado', c: 'white', shape: 'along', n: 3, scale: 0.4, every: 160, alpha: 0.5 }] },
  'sinkhole-fx': { sound: 'cracks', shake: 90, ring: [{ f: 'vortex', c: 'brown', shape: 'flat', laps: 3 }, { f: 'groundquake', c: 'earth', shape: 'flat', scale: 0.7, alpha: 0.8 }] },
  'vortex-column-fx': {
    sound: 'voidburst',
    ring: [{ f: 'tornado', c: 'type', shape: 'ground', scale: 1.4, laps: 2 }, { f: 'puff', c: 'grey', shape: 'scatter', n: 6, alpha: 0.7, delay: 200 }],
    turret: { sheet: 'tornado', scale: 0.8 },
  },
  'grit-devil-fx': {
    sound: 'rain',
    ring: [{ f: 'tornado', c: 'brown', tint: T.ochre, shape: 'ground', scale: 0.9, laps: 2 }, { f: 'puff', c: 'brown', shape: 'scatter', n: 4, delay: 300 }],
    turret: { sheet: 'tornado', colour: 'brown', tint: T.ochre, scale: 0.6 },
  },

  // ========================================================================================== comet merge ==
  'meteor-fx': {
    // comet-fx's merge: fireflight turned to fall, then skystrike, then blastlg -- and a crater ring left behind
    sound: 'explosion', shake: 150,
    ring: [{ f: 'fireflight', c: 'orange', shape: 'fall', scale: 1.3 }, { f: 'skystrike', c: 'orange', shape: 'ground', delay: 330 },
      { f: 'blastlg', c: 'orange', shape: 'centre', delay: 420, scale: 1.1 }, { f: 'groundquake', c: 'fire', shape: 'flat', delay: 420, scale: 0.6 }],
  },
  'comet-art': {
    // "an ice-blue comet": the same merge in ice, and the comet flight flies blue
    sound: 'explosion',
    ring: [{ f: 'fireflight', c: 'white', tint: T.ice, shape: 'fall', scale: 1.2 }, { f: 'icestorm', c: 'blue', shape: 'centre', delay: 330, scale: 0.8 }],
    move: [{ f: 'fireflight', c: 'white', tint: T.ice, shape: 'along', n: 4, every: 50, add: true }],
    flight: { sheet: 'fireflight', colour: 'white', tint: T.ice, scale: 0.8, heading: 'aim', trail: { f: 'mote', c: 'blue', puff: true, scale: 0.7 } },
  },
  'boulder-drop-fx': {
    // "boulder-drop (r391 boulder falling)"
    sound: 'cracks', shake: 120,
    ring: [{ shape: 'stilldrop', art: 'fx393_proj_boulder', scale: 1.3, spin: 5 }, { f: 'blastlg', c: 'brown', shape: 'centre', delay: 430, scale: 0.9 },
      { f: 'groundquake', c: 'rock', shape: 'flat', delay: 420, scale: 0.6 }],
  },
  'falling-egg-fx': {
    // "falling-egg (projectiles/roc_egg, plus egg_burst)"
    sound: 'explosion', shake: 140,
    ring: [{ shape: 'stilldrop', keys: ['proj394_roc_egg', 'fx394p_roc_egg', 'roc_egg', 'proj392_roc_egg'], art: 'fx393_proj_boulder', tintFb: 0xf2e8d0, scale: 1.8 },
      { shape: 'ext', keys: ['proj394_egg_burst', 'fx394p_egg_burst', 'egg_burst', 'proj392_egg_burst'], anchor: 'centre', scale: 2.4, delay: 440, fb: { f: 'wavecrash', c: 'water', shape: 'scatter', n: 3, delay: 440 } },
      { f: 'bubblepool', c: 'water', shape: 'flat', delay: 520, laps: 2 }],
  },

  // ============================================================================================== coins ==
  'coin-flip-fx': { sound: 'pulse', ring: [{ shape: 'coinflip', rank: 'gold' }] },
  'coin-fx': {
    sound: 'pulse',
    ring: [{ shape: 'coins', rank: 'gold', n: 9 }, { f: 'mote', c: 'gold', shape: 'centre', add: true }],
    cone: [{ shape: 'coins', rank: 'gold', n: 12, cone: true }],
    flight: { coin: 'gold', scale: 0.55, byEntry: { 'bad-penny': 'bronze' } },
  },
  'coin-flight': { sound: 'pulse', ring: [{ shape: 'coins', rank: 'gold', n: 5 }], flight: { coin: 'gold', scale: 0.5, byEntry: { 'tarnishing-coin': 'bronze' } } },
  'gold-burst-fx': { sound: 'pulse', ring: [{ shape: 'coins', rank: 'gold', n: 16, fountain: true }, { f: 'bloom', c: 'yellow', shape: 'centre', scale: 1.1, add: true }], cone: [{ shape: 'coins', rank: 'gold', n: 14, cone: true }] },
  'cornucopia-fx': { sound: 'pulse', ring: [{ shape: 'coins', rank: 'gold', n: 10, fountain: true }, { shape: 'particles', kind: 'leaf', n: 8, tint: 0xffc060 }, { f: 'mote', c: 'gold', shape: 'scatter', n: 5, add: true }] },
  'harvest-projectiles': { sound: 'pulse', ring: [{ shape: 'coins', rank: 'gold', n: 4 }], flight: { coin: 'gold', scale: 0.5 } },

  // ============================================================================================ pendulum ==
  'pendulum-fx': { sound: 'cracks', ring: [{ shape: 'pendulum', scale: 1.4 }], cone: [{ shape: 'pendulum', ahead: 0.5, scale: 1.5 }] },
  'pendulum-turret-sprite': { turret: { pendulum: true, scale: 1.0 } },

  // ================================================================================== leaves / snow / butterfly ==
  'falling-leaves-fx': {
    sound: 'rain',
    ring: [{ shape: 'particles', kind: 'leaf', n: 18, tint: 0xd8783a }], cone: [{ shape: 'particles', kind: 'leaf', n: 18, cone: true, tint: 0xd8783a }],
    flight: { leaf: true, tint: 0xd8783a, scale: 1.1 },
  },
  'leaf-gale-fx': {
    // "leaf-gale (plus shockcone)"
    sound: 'rain',
    cone: [tinted('shockcone', T.green, { shape: 'cone', lift: 22, alpha: 0.8 }), { shape: 'particles', kind: 'leaf', n: 22, cone: true }],
    ring: [{ shape: 'particles', kind: 'leaf', n: 16 }],
    flight: { leaf: true, scale: 1.0 },
  },
  'flurry-fx': {
    // a flurry of blows: fist impacts all round, and the snow-white grit they kick up
    sound: 'cracks',
    ring: [{ f: 'hitflash', c: 'white', shape: 'scatter', n: 9, scale: 0.45, every: 35, add: true }, { shape: 'particles', kind: 'snow', n: 14, tint: 0xffffff }],
  },
  'moth-flurry-fx': { sound: 'rain', flight: { butterfly: true, tint: T.mothPale, scale: 0.9 } },

  // ============================================================================== feather / quill / arrow ==
  'feather-flight': {
    sound: 'cracks',
    ring: [{ f: 'puff', c: 'gold', shape: 'centre', scale: 1.1 }, { f: 'feathers', c: T.gold, shape: 'feathers', n: 4 }],
    flight: { art: 'feather', tint: T.gold, scale: 0.7 },
  },
  'quill-flight': {
    sound: 'cracks',
    ring: [{ f: 'puff', c: 'white', shape: 'centre', scale: 1.1 }],
    byConf: {
      Roc: { flight: { art: 'feather', tint: 0xe2cfa8, scale: 1.0 }, beam: [{ shape: 'stream394', art: 'fx393_proj_feather', tint: 0xe2cfa8, every: 70, base: -0.61 }],
        ring: [{ shape: 'stillrain', art: 'fx393_proj_feather', tint: 0xe2cfa8, n: 10, base: -0.61 }] },
      Transfiguration: { flight: { art: 'quill', scale: 0.6 }, beam: [{ shape: 'stream394', art: 'fx393_proj_quill', every: 60, base: -0.56 }],
        ring: [{ f: 'feathers', c: 0x303030, shape: 'feathers', n: 8, art: 'fx393_proj_quill' }] },
    },
  },
  'plumage-flare-fx': {
    // "plumage-flare (fan of feathers)"
    sound: 'explosion',
    ring: [{ f: 'feathers', c: T.orange, shape: 'feathers', n: 12, add: true, fan: true }, { f: 'starlg', c: 'radiant', shape: 'centre', scale: 1.1, add: true, delay: 160 }],
  },
  'arrow-flight': {
    sound: 'cracks',
    ring: [{ f: 'puff', c: 'white', shape: 'centre', scale: 1.0 }],
    flight: { art: 'arrow', scale: 0.7 },   // beamWall394's broadhead flies first where it is loaded
  },
  'arrowstorm-fx': { sound: 'cracks', ring: [{ shape: 'stillrain', art: 'fx393_proj_arrow', n: 16, base: Math.PI, dark: true }, { f: 'puff', c: 'brown', shape: 'scatter', n: 6, delay: 420, scale: 1.1 }], flight: { art: 'arrow', scale: 0.7 } },

  // ============================================================================================ soulwisp ==
  'wisp-fx': {
    sound: 'voidburst',
    ring: [{ f: 'mote', c: 'green', shape: 'scatter', n: 4, add: true }],
    flight: { art: 'soulwisp', tint: 0x9dff9a, scale: 0.7, trail: { f: 'mote', c: 'green', scale: 0.7, puff: true } },
    turret: { still: 'fx393_proj_soulwisp', tint: 0x9dff9a, scale: 0.9, bob: true, add: true },
  },

  // =========================================================================================== belltower ==
  'cracked-bell-sprite': { turret: { prop: 'belltower', crack: true, scale: 0.9 } },

  // ========================================================================================== world props ==
  'skep-turret-sprite': { turret: { city: 'beehiveBox', scale: 1.6, over: { f: 'speckswarm', tint: 0xffc84a, scale: 0.6, lift: 22 } } },
  'still-turret-sprite': { turret: { city: 'alembicRig', scale: 1.2, over: { f: 'billowcloud', tint: 0xd8ffd0, scale: 0.35, lift: 44, every: 900 } } },
  'pike-rank-sprite': { turret: { city: 'guardPost', crop: [12, 33, 22, 37], scale: 2.0 } },   // the guard post's spear rack
  'seal-circle-fx': { sound: 'pulse', ring: [{ shape: 'decal', circle: 'ritualCircleChalk', tint: 0xff4a3a, scale: 1.0, hold: 900 }, tinted('shockring', 0xff4a3a, { shape: 'flat', delay: 200, scale: 0.9 })] },
  'mandala-art': { sound: 'pulse', ring: [{ shape: 'decal', circle: 'ritualCircleGold', tint: 0xf0c8ff, scale: 1.5, hold: 1200, spin: 0.5, grow: true }, { shape: 'decal', circle: 'ritualCircleSilver', tint: 0xb08aff, scale: 0.9, hold: 1100, spin: -0.7, delay: 150 }] },
  'stance-fx': { sound: 'pulse', ring: [{ shape: 'decal', circle: 'ritualCircleSilver', tint: 0xffffff, scale: 0.45, hold: 1400, pulse: true }] },
  'candle-ring-fx': { sound: 'explosion', ring: [{ shape: 'decal', circle: 'ritualCircleGold', tint: 0xffd9a0, scale: 1.1, hold: 1600 }, { f: 'firepath', c: 'orange', shape: 'ringof', n: 10, scale: 0.4, laps: 4 }] },

  // ===================================================================================== creatures and shades ==
  'old-master-sprite': { summon: { npc: 'npc_priest_old', tint: 0xc8ccd2, alpha: 0.62 } },
  'spring-elemental-sprite': { summon: { family: 'elemental', shade: 'water', reeds: true } },
  'fire-whirl-sprite': { summon: { family: 'elemental', shade: 'fire' } },

  // ===================================================================================== section 2: copies ==
  'afterimage-fx': {
    sound: 'pulse',
    move: [{ shape: 'ghost', mode: 'trail', n: 3, fringe: true, alpha: 0.5 }],
    ring: [{ shape: 'ghost', mode: 'trail', n: 3, fringe: true, alpha: 0.5 }],
  },
  'decoy-double-sprite': { ring: [{ shape: 'ghost', mode: 'here', tint: 0xb48aff, alpha: 0.6, edge: 0x9a5aff, hold: 1600 }], summon: { copy: 'decoy' } },
  'player-double-sprite': { summon: { copy: 'double' }, ring: [{ shape: 'haze', on: 'caster', ms: 600 }] },
  'player-likeness-art': {
    ring: [{ shape: 'ghost', mode: 'wall', n: 5, tint: 0xe8ecf4, alpha: 0.55, jitter: 2, hold: 2600 }],
    summon: { copy: 'likeness' }, turret: { copy: 'likeness' },
  },
  'shadow-double-sprite': { summon: { copy: 'shadow' } },
  'replica-sprite': { summon: { copy: 'replica' } },
  'phantom-double-fx': {
    sound: 'pulse',
    ring: [{ shape: 'ghost', mode: 'lunge', tint: 0xb0e0ff, alpha: 0.55, fringe: true }, { shape: 'ghost', mode: 'side', tint: 0xffb0f0, alpha: 0.5, delay: 90 }],
    move: [{ shape: 'ghost', mode: 'trail', n: 3, tint: 0xb0e0ff, alpha: 0.5, fringe: true }],
  },
  'copies-burst-fx': { sound: 'pulse', ring: [{ shape: 'ghost', mode: 'ring', n: 7, tint: 0xd8d8ff, alpha: 0.5, slash: true }] },
  'copy-spawn-fx': {
    ring: [{ shape: 'ghost', mode: 'peel', tint: 0xf0f0f0, alpha: 0.6, flat: true }],
    move: [{ shape: 'ghost', mode: 'peel', tint: 0xf0f0f0, alpha: 0.6, flat: true }],
    beam: [{ shape: 'ghost', mode: 'beamrow', n: 4, tint: 0xf0f0f0, alpha: 0.5, flat: true }],
  },
  'foresight-ghost-fx': { ring: [{ shape: 'ghost', mode: 'ahead', tint: 0xe0f4ff, alpha: 0.5 }], move: [{ shape: 'ghost', mode: 'ahead', tint: 0xe0f4ff, alpha: 0.5 }] },
  'reflection-shatter-fx': {
    // "reflection-shatter (plus mirror_shard)"
    sound: 'voidburst',
    ring: [{ shape: 'ghost', mode: 'ring', n: 5, tint: 0xe8f4ff, alpha: 0.55, near: true, hold: 300 },
      { shape: 'ext', keys: ['fx_mirror_shard_native', 'fx394_mirror_shard', 'oneoff_mirror_shard', 'mirror_shard'], anchor: 'centre', ringOf: 5, delay: 520, add: true, fb: { f: 'mote', c: 'white', shape: 'ringof', n: 5, delay: 520, add: true } }],
  },
  'rewind-fx': {
    sound: 'voidburst',
    ring: [{ shape: 'ghost', mode: 'back', tint: 0xb8d8ff, alpha: 0.55 }, { f: 'vortex', c: 'blue', tint: 0xa8c8ff, shape: 'flat', scale: 0.5, flipX: true, add: true, laps: 1 }],
    move: [{ shape: 'ghost', mode: 'back', tint: 0xb8d8ff, alpha: 0.55 }],
    beam: [{ shape: 'ghost', mode: 'back', tint: 0xb8d8ff, alpha: 0.5, onBodies: true }],
  },
  'return-fx': {
    sound: 'pulse',
    ring: [{ shape: 'ghost', mode: 'lunge', tint: 0xfff0c0, alpha: 0.5 }, ring('type', { delay: 100, scale: 0.8 })],
    beam: [{ shape: 'ghost', mode: 'lunge', tint: 0xfff0c0, alpha: 0.5 }],
  },
  'animated-weapon-fx': { ring: [{ shape: 'weaponspin' }] },
  'avatar-form-sprite': { ring: [{ shape: 'pulse', tint: 0xffd060, scale: 1.5, ms: 1600 }] },

  // ============================================================================== section 2: lighting & screen ==
  'totality-dim': { sound: 'voidburst', ring: [{ shape: 'screen', mode: 'dim', ms: 2200, rim: true }] },
  'slowmo-fx': { sound: 'pulse', ring: [{ shape: 'screen', mode: 'desat', ms: 2400 }, { shape: 'streaks', n: 7, hang: true, ms: 2000 }] },
  'darkened-sky-fx': {
    sound: 'lightning',
    ring: [{ shape: 'screen', mode: 'darken', amount: 0.38, ms: 1800 }, { f: 'billowcloud', c: 'pitch', shape: 'scatter', n: 5, sky: 120, alpha: 0.9, scale: 1.3 },
      { f: 'boltstrike', cut: 'lightning', shape: 'scatter', n: 3, every: 260, delay: 300, add: true, boost: 2.3 }],
  },
  'follow-spot-fx': { sound: 'pulse', beam: [{ shape: 'line', style: 'spot' }], override: { drawn: 'line' } },
  'dawn-dusk-fx': {
    sound: 'pulse',
    ring: [{ shape: 'screen', mode: 'dawn', ms: 1600 }, tinted('geyser', T.whiteGold, { shape: 'ground', scale: 1.3, add: true, delay: 200 })],
    byEntry: { nightfall: { cone: [{ shape: 'screen', mode: 'dusk', ms: 1600 }], ring: [{ shape: 'screen', mode: 'dusk', ms: 1600 }] }, 'dusk-to-dawn': { move: [{ shape: 'screen', mode: 'dusk', ms: 900 }, { shape: 'screen', mode: 'dawn', ms: 900, delay: 700 }] } },
  },
  'great-shadow-fx': { sound: 'voidburst', ring: [{ shape: 'shadowpass', families: ['garuda', 'griffin', 'thunderbird'], fly: true, scale: 5.5, ms: 1200 }] },
  'immense-shadow-fx': { sound: 'voidburst', ring: [{ shape: 'shadowpass', families: ['ziz', 'roc', 'thunderbird', 'griffin'], fly: true, scale: 6.5, ms: 1300 }] },
  'long-shadow-fx': { sound: 'voidburst', beam: [{ shape: 'line', style: 'shadowband' }], override: { drawn: 'line' } },
  'roc-shadow-fx': {
    sound: 'voidburst',
    ring: [{ shape: 'shadowpass', families: ['roc', 'griffin', 'thunderbird'], fly: true, scale: 6, ms: 1300 }],
    beam: [{ shape: 'shadowpass', families: ['roc', 'griffin', 'thunderbird'], fly: true, scale: 5, ms: 1100, alongAim: true }],
  },
  'heat-haze-fx': { sound: 'rain', ring: [{ shape: 'haze', on: 'area', ms: 1600 }] },
  'heat-shimmer-fx': { sound: 'rain', ring: [{ shape: 'haze', on: 'caster', ms: 1200 }, { shape: 'haze', on: 'bodies', ms: 1200 }], move: [{ shape: 'haze', on: 'caster', ms: 900 }] },
  'mirage-shimmer-fx': {
    sound: 'rain',
    ring: [{ shape: 'haze', on: 'area', ms: 1400 }, { shape: 'haze', on: 'bodies', ms: 1200 }],
    move: [{ shape: 'ghost', mode: 'here', at: 'start', tint: 0xfff4d8, alpha: 0.5, hold: 400 }, { shape: 'haze', on: 'caster', ms: 800 }],
  },
  'glitch-fx': { sound: 'voidburst', ring: [{ shape: 'glitch', on: 'bodies', ms: 1200 }, { shape: 'glitch', on: 'caster', ms: 700 }] },
  'emp-fx': {
    sound: 'lightning',
    ring: [tinted('shockring', 0x9fe4ff, { shape: 'flat', add: true, scale: 1.1 }), { shape: 'glitch', on: 'bodies', ms: 800, scan: true }],
    beam: [{ shape: 'glitch', on: 'bodies', ms: 900, scan: true }],   // the ray itself is the lightning material (beamWall394)
  },
  'red-mist-overlay': { sound: 'explosion', ring: [{ shape: 'pulse', tint: 0xff3a2a, n: 4, ms: 2400, mist: true }] },
  'empower-glow-fx': { sound: 'pulse', ring: [{ shape: 'pulse', tint: 0xfff0b0, n: 2, ms: 700, rise: true }] },
  'season-cycle-fx': { sound: 'pulse', ring: [{ shape: 'huering', f: 'runecircle', hues: [0x7ed957, 0xffc23a, 0xc8642a, 0xf2f8ff], ms: 1200, scale: 1.2 }] },
  'prismatic-flight': { flight: { sheet: 'starsm', c: 'native', scale: 0.55, hue: true, heading: 'none', trail: { f: 'mote', c: 'white', puff: true, scale: 0.6, hue: true } } },
  'swelling-orb-flight': { flight: { sheet: 'mote', colour: 'gold', tint: 0xd9a8ff, scale: 0.7, swell: [0.6, 1.9], heading: 'none' } },

  // ================================================================================ section 2: drawn lines ==
  // "1-6 px core plus a soft glow, with a travelling bead or knot" -- the line IS the beam (override drawn), or, cast
  // as a ring / cone / pull / taunt, one line from the caster's hand to each body it holds.
  'thread-beam-fx': {
    beam: [{ shape: 'line', style: 'thread' }], override: { drawn: 'line' },
    byEntry: { 'humming-loom': { beam: [{ shape: 'line', style: 'warp' }] }, 'plucked-string': { beam: [{ shape: 'line', style: 'pluck' }] } },
  },
  'sympathy-cord-beam': { beam: [{ shape: 'line', style: 'cord' }], override: { drawn: 'line' } },
  'soul-tether-beam-fx': { beam: [{ shape: 'line', style: 'soul' }], override: { drawn: 'line' } },
  'want-beam-fx': { beam: [{ shape: 'line', style: 'want' }], override: { drawn: 'line' } },
  'measure-beam-fx': { beam: [{ shape: 'line', style: 'measure' }], override: { drawn: 'line' } },
  'razor-wire-fx': { beam: [{ shape: 'line', style: 'wire' }], override: { drawn: 'line' } },
  'string-fx': {
    sound: 'pulse',
    beam: [{ shape: 'line', style: 'string' }], override: { drawn: 'line' },
    ring: [{ shape: 'line', style: 'string', toBodies: 5, ms: 1100 }], cone: [{ shape: 'line', style: 'string', toBodies: 5, ms: 900 }],
    move: [{ shape: 'line', style: 'string', toBodies: 1, ms: 500 }],
  },
  'link-line-fx': { sound: 'pulse', ring: [{ shape: 'line', style: 'link', toBodies: 4, toAllies: true, ms: 1300 }], beam: [{ shape: 'line', style: 'link' }] },
  'rope-fx': { sound: 'cracks', ring: [{ shape: 'line', style: 'rope', toBodies: 4, ms: 900, haul: true }] },
  'drawn-line-fx': {
    sound: 'pulse',
    beam: [{ shape: 'line', style: 'drawn' }], override: { drawn: 'line' },
    ring: [{ shape: 'line', style: 'drawn', circle: true, ms: 1400 }],
    byEntry: { 'the-drawn-line': { ring: [] } },   // the wall is beamWall394's burn strip
  },
  'fence-wall-art': { sound: 'lightning', beam: [{ shape: 'line', style: 'fence' }], override: { drawn: 'line' } },
  'web-fx': { sound: 'cracks', beam: [{ shape: 'line', style: 'web' }], override: { drawn: 'line' } },
  'fuse-line-fx': { sound: 'explosion', beam: [{ shape: 'line', style: 'fuse' }, { f: 'sparkfan', c: 'fire', shape: 'runner', add: true, scale: 0.6 }, { f: 'puff', c: 'grey', shape: 'along', n: 6, every: 140, alpha: 0.7 }], override: { drawn: 'line' } },

  // ============================================================================== section 2: tracer streams ==
  'bullet-flight': { sound: 'cracks', flight: { streak: true, tint: 0xffd890, scale: 1 } },

  // ===================================================================================== section 2: redaction ==
  'redaction-fx': { sound: 'voidburst', ring: [{ shape: 'redact', ms: 1100 }], cone: [{ shape: 'redact', ms: 1100 }] },
};

/** The shapes fxMap394Mixin draws (the rest are fxArt393Mixin's). */
export const FXMAP_SHAPES = new Set(['travelflat', 'prop', 'propalong', 'coins', 'coinflip', 'pendulum', 'particles',
  'stillrain', 'stilldrop', 'stream394', 'decal', 'ghost', 'screen', 'shadowpass', 'haze', 'pulse', 'huering', 'line',
  'streaks', 'redact', 'selfmask', 'ext', 'glitch', 'onbodies', 'ringof', 'runner', 'weaponspin']);

/** The drawn lines, "1-6 px core plus a soft glow, with a travelling bead or knot". w: core px; glow: glow width
 *  multiple; bead: what travels; beadEvery: px between beads; speed: px/s of the beads (negative runs to the caster). */
export const LINE_STYLES = {
  thread:  { core: 0xe8c8ff, glow: 0xffd27a, w: 2, glowW: 4, bead: 'glint', beadEvery: 90, speed: 260 },
  warp:    { core: 0xd8c0ff, glow: 0xb090ff, w: 1.5, glowW: 3, strands: 5, gap: 7, bead: 'glint', beadEvery: 120, speed: 200 },
  pluck:   { core: 0xfff0d0, glow: 0x9fe8ff, w: 2, glowW: 4, wave: 4, bead: 'glint', beadEvery: 110, speed: 240 },
  cord:    { core: 0xe03040, glow: 0xff6060, w: 3, glowW: 3, bead: 'knot', beadEvery: 70, speed: 120 },
  soul:    { core: 0xe8ecf0, glow: 0xa8b8c8, w: 2, glowW: 4, bead: 'face', beadEvery: 85, speed: -70 },
  want:    { core: 0xe4eef4, glow: 0x9fd8ff, w: 2, glowW: 4, bead: 'frost', beadEvery: 60, speed: -110 },
  bond:    { core: 0xb8dcff, glow: 0x7fb8ff, w: 2, glowW: 4, braid: 3, bead: 'knot', beadEvery: 80, speed: 150 },
  measure: { core: 0x8a6a3e, glow: 0xb48a5a, w: 3, glowW: 2, bead: 'mark', beadEvery: 48, speed: 0, markColour: 0xb070ff },
  wire:    { core: 0xf0f6ff, glow: 0xb8c8d8, w: 1, glowW: 3, bead: 'glint', beadEvery: 180, speed: 520, weight: true },
  string:  { core: 0xc890ff, glow: 0x9a5aff, w: 1.5, glowW: 4, bead: 'glint', beadEvery: 100, speed: 180, sway: 6, crossbar: true },
  link:    { core: 0xbffcff, glow: 0x5ff2ff, w: 1, glowW: 4, bead: 'pulse', beadEvery: 120, speed: 300 },
  rope:    { core: 0xa07a46, glow: 0x5a4024, w: 4, glowW: 1.6, bead: 'knot', beadEvery: 40, speed: 0, twist: true },
  drawn:   { core: 0xf4e8ff, glow: 0xc8a0ff, w: 2, glowW: 5, bead: 'glint', beadEvery: 140, speed: 340, draw: true },
  fence:   { core: 0xd8d8d8, glow: 0xfff07a, w: 1.5, glowW: 3, bead: 'spark', beadEvery: 140, speed: 420, posts: 48 },
  web:     { core: 0xf8f8f8, glow: 0xd8d8d8, w: 1.5, glowW: 3, bead: 'drop', beadEvery: 50, speed: 0, sag: 6 },
  blood:   { core: 0x8a0a14, glow: 0xff3040, w: 3, glowW: 3, bead: 'bead', beadEvery: 55, speed: 160 },
  bloodMid:{ core: 0x8a0a14, glow: 0xff3040, w: 6, glowW: 2.4, bead: 'bead', beadEvery: 50, speed: -140 },
  fuse:    { core: 0x26201c, glow: 0x5a4a3a, w: 5, glowW: 1.6, bead: 'none', speed: 0 },
  shadowband: { core: 0x1a0f26, glow: 0x3a1f5a, w: 16, glowW: 1.8, bead: 'none', speed: 0, flat: true, alpha: 0.55 },
  warble:  { core: 0xc8f2ff, glow: 0x6fd4ff, w: 2, glowW: 4, wave: 5, waveFast: true, bead: 'pulse', beadEvery: 90, speed: 380 },
  spot:    { core: 0xffffff, glow: 0xfff8e0, spot: true, bead: 'none', speed: 0 },
};

// ------------------------------------------------------------------------------------------------- lookups --
/** The record for a gap as an entry of `sheet` (entry id `id`) draws it: the gap's own, with its per-sheet and
 *  per-entry forms merged over it. */
export function fxMapArtFor(gap, sheet = null, id = null) {
  const base = FXMAP_GAP_ART[gap];
  if (!base) return null;
  const bc = sheet && base.byConf && base.byConf[sheet];
  const be = id && base.byEntry && base.byEntry[id];
  if (!bc && !be) return base;
  return { ...base, ...(bc || {}), ...(be || {}) };
}

/** The sheet key and entry id an ability answers to (as round 393's lookup does), or null. */
export function fxMapKeyFor(ability) {
  const a = ability || {};
  if (!a.confSheet) return null;
  let key = a.confEntry ? `${a.confSheet}|${a.confEntry}` : null;
  if (!key || !FXMAP_ENTRY_GAPS[key]) key = (a.name && FXMAP_ENTRY_NAMES[a.name]) || key;
  return key && FXMAP_ENTRY_GAPS[key] ? key : null;
}

/** The gap ids an ability's confluence entry waits on that this layer draws, or null. */
export function fxMapGapsFor(ability) {
  const key = fxMapKeyFor(ability);
  const g = key && FXMAP_ENTRY_GAPS[key];
  return g && g.length ? g : null;
}

/** [{ gap, art }] for an ability: each of its gaps with its merged record (sheet and entry forms applied). */
export function fxMapArtsFor(ability) {
  const key = fxMapKeyFor(ability);
  if (!key) return [];
  const [sheet, id] = key.split('|');
  return (FXMAP_ENTRY_GAPS[key] || []).map(gap => ({ gap, art: fxMapArtFor(gap, sheet, id) })).filter(x => x.art);
}

/** The first record among an ability's gaps that carries `field` (turret, summon, flight, override), or null. */
export function fxMapField(ability, field) {
  for (const { gap, art } of fxMapArtsFor(ability)) if (art[field]) return { gap, spec: art[field] };
  return null;
}

/** A turret's / a called creature's body spec, or null. */
export const fxMapTurretFor = (a) => fxMapField(a, 'turret');
export const fxMapSummonFor = (a) => fxMapField(a, 'summon');

/** Every entry a row covers ("Sheet|gap" -> entry ids), for the suite. */
export { FXMAP_ENTRY_GAPS, FXMAP_ENTRY_NAMES, FXMAP_ROWS };

// ------------------------------------------------------------------------------------------------- flights --
/** The fx2 / fx5 sheets a flight may fly as (their frame geometry, as spellFx.js knows it -- repeated here because
 *  spellFx.js imports this module through fxArt393.js). */
const FLIGHT_SHEETS = {
  fireflight: { cell: 64, cellH: 64, frames: 4, frameMs: 83, colours: true },
  mote: { cell: 32, cellH: 32, frames: 16, frameMs: 63, colours: true },
  starsm: { cell: 84, cellH: 87, frames: 16, frameMs: 50, fx5: true },
};
export const STREAK_KEY = 'fxm394_streak';
export const STREAK_SIZE = { w: 36, h: 6 };

/**
 * The flight spec a projectile ability flies (WorldScene's projectile code: key, frames, frameMs, frame0, heading,
 * baseAngle, flightScale, faceX; and round 393's extras the scene half reads: r393, spin, tint, trail), from a gap's
 * `flight` record. `fxmap` carries what fxMap394Mixin adds on top (hue, swell, sy). Null when the record names nothing.
 */
export function flightMapSpec(gap, fl, ability) {
  if (!fl) return null;
  const a = ability || {};
  const dtype = damageFxFor(a);
  const base = { family: 'fxmap', kind: 'fxmap', r393: true, gap, why: 'gap', impact: null, sparks: false, trail: fl.trail || null,
    spin: fl.spin || 0, flightScale: fl.scale || 1, frames: 1, frameMs: 1000, baseAngle: 0, heading: fl.heading || 'aim',
    tint: fl.tint != null ? fl.tint : null, fxmap: { hue: !!fl.hue, swell: fl.swell || null, sy: fl.sy || null } };
  if (fl.art) {
    const p = PROJ393[fl.art];
    if (!p) return null;
    return { ...base, art: fl.art, key: `fx393_proj_${fl.art}`, cell: p.w, cellH: p.h, baseAngle: p.base || 0, heading: fl.spin ? 'none' : 'aim' };
  }
  if (fl.coin) {
    const rank = (fl.byEntry && a.confEntry && fl.byEntry[a.confEntry]) || fl.coin;
    return { ...base, art: 'coin', key: `fx393_coinspin_${rank}`, cell: 32, cellH: 32, frames: 6, frameMs: 70, heading: 'none' };
  }
  if (fl.leaf) {
    const row = ((a.name || '').length) % 4;   // one of the four leaves, the same for an ability every cast
    return { ...base, art: 'leaf', key: 'wxa_leaves', cell: 16, cellH: 16, frame0: row * 4, frames: 4, frameMs: 90, heading: 'none', spin: fl.spin || 4 };
  }
  if (fl.butterfly) return { ...base, art: 'butterfly', key: 'wxa_butterfly', cell: 32, cellH: 32, frames: 8, frameMs: 55, heading: 'none', faceX: true };
  if (fl.streak) return { ...base, art: 'streak', key: STREAK_KEY, cell: STREAK_SIZE.w, cellH: STREAK_SIZE.h, heading: 'aim' };
  if (fl.sheet) {
    const f6 = FX6_FAMILIES[fl.sheet];
    const tint = fl.c === 'type' ? (DAMAGE_FX_COLORS[dtype] != null ? DAMAGE_FX_COLORS[dtype] : 0xffffff) : base.tint;
    if (f6) return { ...base, art: fl.sheet, key: `fx_${fl.sheet}_native`, cell: f6.cell, cellH: f6.cellH, frames: f6.frames, frameMs: f6.frameMs, tint };
    const f = FLIGHT_SHEETS[fl.sheet];
    if (!f) return null;
    const key = f.fx5 ? `fx_${fl.sheet}_native` : `fx_${fl.sheet}_${fl.colour || 'white'}`;
    return { ...base, art: fl.sheet, key, cell: f.cell, cellH: f.cellH, frames: f.frames, frameMs: f.frameMs, tint };
  }
  return null;
}
