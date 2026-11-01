// ===========================================================================
// ROUND 393 -- THE ART DROP'S EFFECTS, PROJECTILES AND PROPS: WHAT EACH GAP DRAWS.
//
//   "Wire each base to the gaps the brief lists, replacing the stand-ins named in the r391 CSV. Where the brief says so,
//    use speed, scale and tint, or layer an existing sheet on top."
//   "Don't forget to recolor all the new monster and animations for elemental variation."
//
// The twelve new white bases are cut once per damage type (tools/make_fx_r393.py -> public/assets/fx6, spellFx6.js),
// exactly as fx5 is, so a layer whose colour is 'type' is drawn in the ability's own damage type: a fire roar is
// orange, a frost one pale blue, a resonating one teal. A layer the brief tints ("ink: black or violet", "steam: white",
// "bog: black-green", "eruption: lava") names its tint instead. Pure data and pure functions -- the scene half that
// plays them is src/scenes/fxArt393Mixin.js -- so the suite (tools/tests/test_round393_fxart.cjs) measures it in node.
//
// Which entries draw which gap: src/data/fxArt393Gaps.js (generated from the sheets' `needs` and the r391 list).
//
// A LAYER: { f: family, c: colour, shape, speed, scale, delay, alpha, add, laps, n, lift, fade }
//   f      an fx6 family (the new art) or an existing fx2/fx3/fx5 family laid with it (runecircle, puff, blastsm, ...)
//   c      'type' = the ability's damage type; a damage type ('fire', 'water', ...); a named tint ('ink', 'bog',
//          'pitch', 'ash', 'stone'); 'native' (the white as drawn); or one of the eleven colour names
//   shape  'flat'     lies on the ground round the point, sized to the ability's reach (a ring, a quake, a pool)
//          'centre'   stands on the point, centred a little above it (a cloud, a burst)
//          'ground'   stands on the point, base on the ground (a geyser, a wave, a strike)
//          'cone'     origin on the caster (at the head with `lift`), turned to the aim, stretched to the reach
//          'travel'   stands on the ground and moves out along the aim to the reach while it plays (a breaking wave)
//          'scatter'  `n` copies round the point within the reach, staggered (a geyser field, a ring of cloud)
//          'along'    `n` copies on the line out along the aim, staggered (a cone of cloud, a quake rolling out)
//          'fall'     drops out of the sky onto the point, turned to fall (the comet's fireflight)
//          'pour'     a column turned upside down, falling onto the point (boiling pitch from a murder-hole)
//          'bodies'   over every struck body near the point, as a mask on its own silhouette (the stone creep)
//          'feathers' `n` loose feathers flung out from the point (the shed pinions)
//          'conjure'  a projectile still (`f`) turning down into the caster's hand (a conjured weapon: The Labrys)
//   speed  frame-rate multiplier (0.5 = half speed);  scale  size multiplier;  laps  plays through this many times
// ===========================================================================
import { FX393_ENTRY_GAPS, FX393_ENTRY_NAMES } from './fxArt393Gaps.js';
import { FX6_FAMILIES, FX6_BEAMS, PROJ393, PROPS393 } from './spellFx6.js';
// ROUND 394 -- the gap rows drawn from art already in the game (the r391 carry-over, the r392 brief's sections 1 and 2):
// their own table and entry map, merged in below beside this round's (fxMap394.js; the shapes are fxMap394Mixin's).
import { fxMapArtsFor, fxMapField, flightMapSpec } from './fxMap394.js';

export const FX393_TINTS = ['ink', 'bog', 'pitch', 'ash', 'stone'];

/** What each gap draws. `ring` is the default (played where the cast lands); `cone` when the ability is a cone;
 *  `beam` laid on a held beam (with `override` replacing the beam sheet itself); `move` along a dash or blink path;
 *  `flight` the projectile; `sound` the existing family whose sound and sparks it borrows. */
export const GAP_ART = {
  // ---- shockring ---------------------------------------------------------------------------------------------------
  'roar-fx': {
    sound: 'pulse',
    ring: [{ f: 'shockring', c: 'type', shape: 'flat', scale: 1 }, { f: 'shockring', c: 'type', shape: 'flat', scale: 0.7, delay: 140, alpha: 0.8 }],
    cone: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 30 }, { f: 'shockcone', c: 'type', shape: 'cone', lift: 30, delay: 160, scale: 0.85, alpha: 0.8 }],
    beam: [{ f: 'shockring', c: 'type', shape: 'along', n: 5, scale: 0.35, every: 110 }],
  },
  'bell-fx': {
    sound: 'pulse',
    // "bell-fx: slow, plus runecircle"
    ring: [{ f: 'runecircle', c: 'type', shape: 'flat', scale: 0.55, alpha: 0.7, speed: 0.6 },
      { f: 'shockring', c: 'type', shape: 'flat', speed: 0.5 }, { f: 'shockring', c: 'type', shape: 'flat', speed: 0.5, delay: 420, scale: 0.8, alpha: 0.75 }],
    cone: [{ f: 'runecircle', c: 'type', shape: 'flat', scale: 0.4, alpha: 0.7, speed: 0.6 }, { f: 'shockcone', c: 'type', shape: 'cone', lift: 30, speed: 0.5 }],
    beam: [{ f: 'shockring', c: 'type', shape: 'along', n: 4, scale: 0.4, speed: 0.5, every: 180 }, { f: 'runecircle', c: 'type', shape: 'flat', scale: 0.35, alpha: 0.7, speed: 0.6 }],
  },
  'call-fx': {
    sound: 'pulse',
    // "call-fx: about half speed, about 1.5x scale"
    ring: [{ f: 'shockring', c: 'type', shape: 'flat', speed: 0.5, scale: 1.5 }, { f: 'shockring', c: 'type', shape: 'flat', speed: 0.5, scale: 1.5, delay: 500, alpha: 0.7 }],
    cone: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 26, speed: 0.5, scale: 1.5 }],
    beam: [{ f: 'shockring', c: 'type', shape: 'along', n: 4, scale: 0.55, speed: 0.5, every: 200 }],
  },
  'trumpet-roar-fx': {
    sound: 'pulse',
    ring: [{ f: 'shockring', c: 'type', shape: 'flat' }, { f: 'puff', c: 'type', shape: 'scatter', n: 5, scale: 1.4, alpha: 0.8 }],
    cone: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 30 }, { f: 'puff', c: 'sand', shape: 'along', n: 3, scale: 1.4, alpha: 0.7, every: 70 }],
    beam: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 30, laps: 3 }],
  },
  'impact-fx': {
    sound: 'explosion',
    // "impact-fx: plus puff and blastsm" (and groundquake is "also usable under impact-fx")
    ring: [{ f: 'groundquake', c: 'type', shape: 'flat', scale: 0.8, alpha: 0.85 }, { f: 'shockring', c: 'type', shape: 'flat' },
      { f: 'blastsm', c: 'type', shape: 'centre', scale: 1.1 }, { f: 'puff', c: 'native', shape: 'scatter', n: 6, scale: 1.6, alpha: 0.85 }],
  },
  // ---- shockcone ---------------------------------------------------------------------------------------------------
  'bellow-fx': {
    sound: 'pulse',
    ring: [{ f: 'shockring', c: 'type', shape: 'flat' }],
    cone: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 30 }, { f: 'shockcone', c: 'type', shape: 'cone', lift: 30, delay: 150, alpha: 0.8 }],
    beam: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 30, laps: 3 }],
  },
  // ---- groundquake -------------------------------------------------------------------------------------------------
  'quake-fx': {
    sound: 'cracks', shake: 140,
    ring: [{ f: 'groundquake', c: 'type', shape: 'flat', scale: 1.2 }, { f: 'groundquake', c: 'type', shape: 'flat', scale: 0.8, delay: 220, alpha: 0.8 }],
    cone: [{ f: 'shockcone', c: 'type', shape: 'cone', lift: 20 }, { f: 'groundquake', c: 'type', shape: 'along', n: 3, scale: 0.55, every: 120 }],
  },
  // ---- thunderclap -------------------------------------------------------------------------------------------------
  'thunder-fx': {
    sound: 'lightning', flash: true,
    ring: [{ f: 'thunderclap', c: 'type', shape: 'flat', scale: 1.1, add: true }, { f: 'shockring', c: 'type', shape: 'flat', delay: 120, alpha: 0.7 }],
    cone: [{ f: 'thunderclap', c: 'type', shape: 'flat', scale: 0.6, add: true }, { f: 'shockcone', c: 'type', shape: 'cone', lift: 30, delay: 80 }],
  },
  // ---- billowcloud -------------------------------------------------------------------------------------------------
  'ink-fx': {
    sound: 'voidburst',
    ring: [{ f: 'billowcloud', c: 'ink', shape: 'centre', scale: 1.3 }, { f: 'billowcloud', c: 'ink', shape: 'scatter', n: 3, scale: 0.8, alpha: 0.85 }],
    cone: [{ f: 'billowcloud', c: 'ink', shape: 'along', n: 4, scale: 0.9, every: 70 }],
    beam: [{ f: 'billowcloud', c: 'ink', shape: 'along', n: 6, scale: 0.6, every: 90, alpha: 0.9 }],
  },
  'steam-fx': {
    sound: 'rain',
    // "steam-fx: white"; geyser "steam vents: white"
    ring: [{ f: 'geyser', c: 'native', shape: 'scatter', n: 3, scale: 0.9, alpha: 0.9 }, { f: 'billowcloud', c: 'native', shape: 'centre', scale: 1.2, alpha: 0.85 }],
    cone: [{ f: 'billowcloud', c: 'native', shape: 'along', n: 4, scale: 0.9, every: 60, alpha: 0.85 }],
    beam: [{ f: 'billowcloud', c: 'native', shape: 'along', n: 6, scale: 0.55, every: 80, alpha: 0.8 }, { f: 'geyser', c: 'native', shape: 'centre', scale: 0.6 }],
    move: [{ f: 'billowcloud', c: 'native', shape: 'along', n: 4, scale: 0.7, every: 50, alpha: 0.8 }, { f: 'geyser', c: 'native', shape: 'ground', at: 'start', scale: 0.8 }],
  },
  'blizzard-fx': {
    sound: 'rain',
    // "blizzard-fx: white, plus icestorm"
    ring: [{ f: 'billowcloud', c: 'native', shape: 'scatter', n: 5, scale: 1.0, alpha: 0.85 }, { f: 'icestorm', c: 'white', shape: 'centre', scale: 1.1, alpha: 0.9 }],
    cone: [{ f: 'billowcloud', c: 'native', shape: 'along', n: 4, scale: 0.9, every: 60, alpha: 0.85 }, { f: 'icestorm', c: 'white', shape: 'along', n: 2, scale: 0.7, every: 140 }],
    beam: [{ f: 'billowcloud', c: 'native', shape: 'along', n: 6, scale: 0.6, every: 80, alpha: 0.8 }, { f: 'icestorm', c: 'white', shape: 'end', scale: 0.6 }],
  },
  'ash-rise-fx': {
    sound: 'explosion',
    // "the ash part of ash-rise-fx" (billowcloud grey), "ash-rise column: grey" (geyser), plus mote embers
    ring: [{ f: 'geyser', c: 'ash', shape: 'ground', scale: 1.3 }, { f: 'billowcloud', c: 'ash', shape: 'centre', scale: 1.2, delay: 120 },
      { f: 'mote', c: 'orange', shape: 'scatter', n: 6, scale: 1, delay: 200, add: true }],
    move: [{ f: 'geyser', c: 'ash', shape: 'ground', at: 'start', scale: 1.1 }, { f: 'billowcloud', c: 'ash', shape: 'centre', at: 'start', scale: 1 },
      { f: 'geyser', c: 'ash', shape: 'ground', at: 'end', scale: 1.1, delay: 120 }, { f: 'mote', c: 'orange', shape: 'scatter', at: 'end', n: 5, add: true, delay: 160 }],
  },
  // ---- speckswarm (over billowcloud) ---------------------------------------------------------------------------------
  'swarm-cloud-fx': {
    sound: 'rain',
    // "speckswarm: swarm-cloud-fx, tinted dark and laid over billowcloud"
    ring: [{ f: 'billowcloud', c: 'death', shape: 'scatter', n: 3, scale: 0.9, alpha: 0.6 }, { f: 'speckswarm', c: 'pitch', shape: 'scatter', n: 4, scale: 1.3, laps: 2, delay: 60 }],
    cone: [{ f: 'billowcloud', c: 'death', shape: 'along', n: 3, scale: 0.8, every: 60, alpha: 0.6 }, { f: 'speckswarm', c: 'pitch', shape: 'along', n: 4, scale: 1.2, every: 60, laps: 2 }],
    move: [{ f: 'speckswarm', c: 'pitch', shape: 'along', n: 5, scale: 1.1, every: 40, laps: 2 }],
  },
  // ---- bubblepool --------------------------------------------------------------------------------------------------
  'bog-ground-fx': {
    sound: 'rain',
    ring: [{ f: 'bubblepool', c: 'bog', shape: 'flat', scale: 1, laps: 3 }],
  },
  'pitch-fx': {
    sound: 'explosion',
    // "pitch-fx: black, plus firepath"; the murder-hole pour is the geyser turned over
    ring: [{ f: 'bubblepool', c: 'pitch', shape: 'flat', laps: 3 }, { f: 'firepath', c: 'orange', shape: 'scatter', n: 3, scale: 0.8, delay: 150 }],
    cone: [{ f: 'geyser', c: 'pitch', shape: 'pour', scale: 1.1 }, { f: 'bubblepool', c: 'pitch', shape: 'flat', laps: 3, delay: 380, scale: 0.8 },
      { f: 'firepath', c: 'orange', shape: 'scatter', n: 2, scale: 0.7, delay: 450 }],
    beam: [{ f: 'geyser', c: 'pitch', shape: 'pour', at: 'end', scale: 1 }, { f: 'bubblepool', c: 'pitch', shape: 'flat', at: 'end', laps: 3, delay: 380, scale: 0.6 }],
  },
  // ---- geyser ------------------------------------------------------------------------------------------------------
  'eruption-fx': {
    sound: 'explosion', shake: 120,
    // "eruption-fx: lava"
    ring: [{ f: 'geyser', c: 'fire', shape: 'scatter', n: 5, scale: 1.1 }, { f: 'geyser', c: 'fire', shape: 'ground', scale: 1.4 },
      { f: 'blastsm', c: 'orange', shape: 'centre', delay: 260, scale: 0.9 }],
  },
  // ---- breathcone --------------------------------------------------------------------------------------------------
  'breath-fx': {
    sound: 'explosion',
    // "breath-fx, with the origin anchored at the caster's head"
    ring: [{ f: 'breathcone', c: 'type', shape: 'cone', lift: 44 }],
    cone: [{ f: 'breathcone', c: 'type', shape: 'cone', lift: 44 }, { f: 'breathcone', c: 'type', shape: 'cone', lift: 44, delay: 220, alpha: 0.7, scale: 0.9 }],
    beam: [{ f: 'breathcone', c: 'type', shape: 'cone', lift: 44, laps: 2 }],
  },
  // ---- sparkfan ----------------------------------------------------------------------------------------------------
  'sparks-fx': {
    sound: 'lightning',
    // ROUND 393 -- the ability's type picks the colour, and a bare physical type (Grinding Sparks is slashing) draws the
    // fire cut: "a fan of bright orange-white sparks" (r392 sheet) -- hot metal, not grey specks
    ring: [{ f: 'sparkfan', c: 'type', phys: 'fire', shape: 'cone', lift: 16, laps: 2, add: true }],
    cone: [{ f: 'sparkfan', c: 'type', phys: 'fire', shape: 'cone', lift: 16, laps: 3, add: true }],
    beam: [{ f: 'sparkfan', c: 'type', phys: 'fire', shape: 'cone', lift: 16, laps: 6, add: true, scale: 0.6 }],
  },
  // ---- wavecrash ---------------------------------------------------------------------------------------------------
  'wave-fx': {
    sound: 'rain',
    // "wave-fx (travels along the ability's line)"; "wave-fx breach: water" (the geyser)
    ring: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.1 }],
    cone: [{ f: 'wavecrash', c: 'water', shape: 'travel', scale: 1.1 }],
    move: [{ f: 'geyser', c: 'water', shape: 'ground', at: 'start', scale: 1.1 }, { f: 'wavecrash', c: 'water', shape: 'travel', scale: 0.9 },
      { f: 'geyser', c: 'water', shape: 'ground', at: 'end', scale: 1.2, delay: 140 }],
  },
  // ---- stonecreep --------------------------------------------------------------------------------------------------
  'petrify-fx': {
    sound: 'cracks',
    // "stonecreep: petrify-fx, as a mask over the struck body. The stare beam is beamthin in grey."
    ring: [{ f: 'stonecreep', c: 'stone', shape: 'bodies' }],
    beam: [{ f: 'stonecreep', c: 'stone', shape: 'bodies' }],
    override: { family: 'beamthin', color: 'physical' },
  },
  // ---- no new art --------------------------------------------------------------------------------------------------
  'whirlpool-fx': {
    sound: 'voidburst',
    // "fx3 vortex in deep blue"
    ring: [{ f: 'vortex', c: 'blue', shape: 'flat', laps: 3, tint: 0x6f8fd8 }],
  },
  'tail-sweep-fx': {
    sound: 'cracks',
    // "fx5 crescent in scale colours"
    ring: [{ f: 'crescent', c: 'type', shape: 'sweep', scale: 1.2 }, { f: 'crescent', c: 'type', shape: 'sweep', scale: 1.0, delay: 120, flip: true, alpha: 0.8 }],
  },
  'comet-fx': {
    sound: 'explosion', shake: 160,
    // "fireflight rotated to fall, then skystrike, then blastlg on impact"
    ring: [{ f: 'fireflight', c: 'orange', shape: 'fall', scale: 1.4 }, { f: 'skystrike', c: 'orange', shape: 'ground', delay: 330 },
      { f: 'blastlg', c: 'orange', shape: 'centre', delay: 420, scale: 1.2 }],
  },
  // ---- projectiles -------------------------------------------------------------------------------------------------
  'feather-fx': {
    sound: 'cracks',
    // "feather: Griffin pinion tinted tan or gold"
    ring: [{ f: 'feathers', c: 0xd9b26a, shape: 'feathers', n: 9 }],
    flight: { art: 'feather', tint: 0xd9b26a, scale: 0.75 },
  },
  'feather-flight-fx': {
    sound: 'explosion',
    // "Phoenix quill tinted orange with a fireflight trail"
    ring: [{ f: 'fireburst', c: 'orange', shape: 'centre', scale: 0.7 }, { f: 'feathers', c: 0xff8a3a, shape: 'feathers', n: 5, add: true }],
    flight: { art: 'feather', tint: 0xff8a3a, scale: 0.75, trail: { f: 'fireflight', c: 'orange', scale: 0.55 } },
  },
  'siege-flight': {
    sound: 'cracks',
    // "arrow, ballistabolt: siege-flight: Ballista Bolt, Arrow-Slit Shot, Battlement Volley, Scorpion Salvo"
    ring: [{ f: 'puff', c: 'native', shape: 'centre', scale: 1.4 }],
    flight: { art: 'arrow', scale: 0.8, byEntry: { 'ballista-bolt': 'ballistabolt', 'scorpion-salvo': 'ballistabolt' } },
  },
  'quill-fx': {
    sound: 'cracks',
    ring: [{ f: 'puff', c: 'native', shape: 'centre', scale: 1.2 }],
    beam: [{ f: 'quills', shape: 'stream', every: 70 }],
    flight: { art: 'quill', scale: 0.7 },
  },
  'horn-flight': {
    sound: 'cracks',
    ring: [{ f: 'puff', c: 'native', shape: 'centre', scale: 1.3 }],
    flight: { art: 'horn', scale: 0.75, spin: 9 },
  },
  'labrys-art': {
    sound: 'cracks',
    // thrown, it spins; conjured (The Labrys), the weapon itself turns into the hand
    ring: [{ f: 'slashb', c: 'silver', shape: 'centre', scale: 0.8 }],
    conjure: [{ f: 'labrys', shape: 'conjure' }, { f: 'puff', c: 'native', shape: 'centre', scale: 1.2, delay: 380 }],
    flight: { art: 'labrys', scale: 0.8, spin: 16 },
  },
  'rim-flight': {
    sound: 'cracks',
    // "Runaway Rim; spin it"
    ring: [{ f: 'puff', c: 'native', shape: 'centre', scale: 1.3 }],
    flight: { art: 'rim', scale: 0.6, spin: 22, sparks: true },
  },
  'skull-flight': {
    sound: 'voidburst',
    // "skull: green fireflight trail"
    ring: [{ f: 'fireburst', c: 'green', shape: 'centre', scale: 0.9 }],
    flight: { art: 'skull', scale: 0.7, trail: { f: 'fireflight', c: 'green', scale: 0.7 } },
  },
  'soul-fx': {
    sound: 'voidburst',
    // "soul wisp: mote trail"; "voidburst for Soul Nova"
    ring: [{ f: 'voidburst', c: 'silver', shape: 'centre', scale: 1.1 }],
    flight: { art: 'soulwisp', scale: 0.8, trail: { f: 'mote', c: 'silver', scale: 0.8, puff: true } },
  },
  'boulder-throw-fx': {
    sound: 'cracks', shake: 90,
    // "boulder-throw-fx; tumble it, blastlg on impact"
    ring: [{ f: 'blastlg', c: 'type', shape: 'centre', scale: 1.1 }, { f: 'groundquake', c: 'rock', shape: 'flat', scale: 0.5, alpha: 0.8 }],
    flight: { art: 'boulder', scale: 0.8, spin: 7 },
  },
};

/** The new art's families (spellFx6.js) -- every one of them cut in every damage type and the named tints. */
export const FX393_FAMILIES = Object.keys(FX6_FAMILIES);
export const FX393_BEAMS = Object.keys(FX6_BEAMS);
export const FX393_PROJECTILES = Object.keys(PROJ393);
/** Shapes that are not a sheet at all (drawn from the projectile stills). */
export const SPRITE_SHAPES = new Set(['feathers', 'stream', 'conjure']);

/** The gap ids an ability's confluence entry waits on that this round's art covers, or null. */
export function fx393GapsFor(ability) {
  const a = ability || {};
  // Only an ability a confluence sheet made: a generated "Whirlpool" or "Boulder Toss" keeps the art its words pick.
  if (!a.confSheet) return null;
  let key = a.confEntry ? `${a.confSheet}|${a.confEntry}` : null;
  if (!key || !FX393_ENTRY_GAPS[key]) key = (a.name && FX393_ENTRY_NAMES[a.name]) || key;
  const g = key && FX393_ENTRY_GAPS[key];
  return g && g.length ? g : null;
}

/** Which form of a gap's art this ability casts: a cone, a held beam, a dash/blink, or the ring (the default). */
export function fx393Kind(ability) {
  const t = (ability && ability.template) || '';
  if (t === 'breathCone' || t === 'cone') return 'cone';
  if (t === 'beam') return 'beam';
  if (t === 'dash' || t === 'teleport') return 'move';
  if (t === 'summonWeapon') return 'conjure';
  return 'ring';
}

/**
 * The plan for an ability: { gaps, kind, layers, sound, shake, flash, override } or null. A two-gap entry (Geyser Field
 * waits on both steam and eruption) lays both, the second a beat later. Layers fall back to the ring form when a gap
 * has no form of the asked kind (a roar cast as a ring, a beam that only wants its override).
 */
export function fxArt393For(ability) {
  // ROUND 394 -- each source answers with its own art: round 393's gaps from GAP_ART, fxMap394's from its table (with
  // its per-sheet and per-entry forms already merged).
  // A gap both name (Pressure Front's impact-fx) is fxMap394's: it finishes what this table started.
  const mine = fxMapArtsFor(ability), mineGaps = new Set(mine.map(x => x.gap));
  const arts = [...(fx393GapsFor(ability) || []).filter(g => !mineGaps.has(g)).map(g => ({ gap: g, art: GAP_ART[g] })), ...mine];
  if (!arts.length) return null;
  const gaps = arts.map(x => x.gap);
  const kind = fx393Kind(ability);
  const layers = [];
  let sound = null, shake = 0, flash = false, override = null;
  arts.forEach(({ gap: g, art }, gi) => {
    if (!art) return;
    const form = art[kind] || (kind === 'move' ? null : art.ring) || [];
    for (const L of form) layers.push({ ...L, delay: (L.delay || 0) + gi * 180, gap: g });
    sound = sound || art.sound || null;
    shake = Math.max(shake, art.shake || 0);
    flash = flash || !!art.flash;
    override = override || (kind === 'beam' ? art.override || null : null);
  });
  if (!layers.length && !override) return null;
  return { gaps, kind, layers, sound: sound || 'pulse', shake, flash, override };
}

/** The flight sprite for a projectile ability whose entry waits on one of the projectile gaps, or null. The spec is the
 *  one WorldScene's projectile code plays (key, frames, frameMs, heading, baseAngle, flightScale) plus the round-393
 *  extras the scene half reads: spin (rad/s, the art turns as it flies), tint, trail. */
export function flight393For(ability) {
  // ROUND 394 -- a flight from fxMap394's table: a round-393 still, or a sheet (coin, leaf, moth, comet, swarm, streak)
  const fm = fxMapField(ability, 'flight');
  if (fm) { const f = flightMapSpec(fm.gap, fm.spec, ability); if (f) return f; }
  const gaps = fx393GapsFor(ability);
  if (!gaps) return null;
  for (const g of gaps) {
    const fl = GAP_ART[g] && GAP_ART[g].flight;
    if (!fl) continue;
    const art = (fl.byEntry && ability.confEntry && fl.byEntry[ability.confEntry]) || fl.art;
    const p = PROJ393[art];
    if (!p) continue;
    return {
      family: 'proj393', kind: 'r393', r393: true, gap: g, art, key: `fx393_proj_${art}`, cell: p.w, cellH: p.h,
      frames: 1, frameMs: 1000, heading: fl.spin ? 'none' : 'aim', baseAngle: p.base || 0,
      flightScale: fl.scale || 1, spin: fl.spin || 0, tint: fl.tint != null ? fl.tint : null,
      trail: fl.trail || null, sparks: !!fl.sparks, impact: null, why: 'gap',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------- loading --
/** Every sheet the scene loads at boot for this round: the projectile stills and the props (each a spritesheet whose
 *  frame is the cell), the two beams in eleven colours, and the twelve new families as drawn (their damage-type cuts
 *  are fetched when an ability wants one, like fx5's). */
export function fx393BootSheets() {
  const out = [];
  for (const [name, p] of Object.entries(PROJ393)) out.push({ key: `fx393_proj_${name}`, url: `./public/assets/proj393/${name}.png`, cell: p.w, cellH: p.h });
  for (const [fam, f] of Object.entries(FX6_FAMILIES)) out.push({ key: `fx_${fam}_native`, url: `./public/assets/fx6/${fam}_native.png`, cell: f.cell, cellH: f.cellH });
  for (const [fam, f] of Object.entries(FX6_BEAMS)) {
    for (const c of f.colors) out.push({ key: `fx_${fam}_${c}`, url: `./public/assets/fx2/${fam}_${c}.png`, cell: f.cell, cellH: f.cellH });
  }
  const P = PROPS393;
  for (const rank of P.coin.ranks) {
    out.push({ key: `fx393_coin_${rank}`, url: `./public/assets/props393/coin_${rank}.png`, cell: 32, cellH: 32 });
    out.push({ key: `fx393_coinspin_${rank}`, url: `./public/assets/props393/coin_spin_${rank}.png`, cell: 32, cellH: 32 });
  }
  for (const name of ['pawprints', 'rite_book', 'lightning_rod', 'pendulum', 'pendulum_still']) {
    out.push({ key: `fx393_${name}`, url: `./public/assets/props393/${name}.png`, cell: P[name].cell, cellH: P[name].cellH });
  }
  return out;
}

/** One damage-type (or tint) cut of a new family, for the lazy loader: { key, url, cell, cellH } or null. */
export function fx6Sheet(key) {
  const m = /^fx_([a-z]+)_([a-z]+)$/.exec(key || '');
  const f = m && FX6_FAMILIES[m[1]];
  if (!f || !f.colors.includes(m[2])) return null;
  return { key, url: `./public/assets/fx6/${m[1]}_${m[2]}.png`, cell: f.cell, cellH: f.cellH };
}

/** Coin art per rank on the ground ("there is no diamond-rank coin": a diamond drop keeps the drawn disc). */
export function coinArtKey(rank) {
  return PROPS393.coin.ranks.includes(rank) ? `fx393_coinspin_${rank}` : null;
}
