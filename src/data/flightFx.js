// ============================================================================
// ROUND 370 -- WHAT A SPELL LOOKS LIKE IN THE AIR.
//
//   "Look to existing spells and review all available spell animations. I tend to only see 4 or 5 different shapes for
//    spells moving through the air and I know the available variety is much higher."
//
// He was right, and the count is exact. Every projectile ability flew as one of four sheets -- the straight bolt
// (boltaim), the fireball (fireflight), the comet streak (dashstreak, for comet/meteor names) and a blade's slice --
// with the flat circle as the fallback. spellFx.pickFlightFx chose between the first two by COLOUR alone: orange-ish
// rode a fireball, everything else a bolt. Meanwhile the game holds:
//   * the round-338/340 sheets, none of which fly;
//   * the mote (spellFx2 `mote`), a looping 32px glow drawn for exactly this and never flown;
//   * the 1,050-effect library, with 25 round, swirling, held shapes -- spheres, coils, pinwheels, a spinning disc --
//     that only ever played where a spell landed (flightOrbs.js, tools/pick_flight_orbs.py);
//   * and this round's drop: a lance, two throwing stars and a tumbling boulder, cut in every damage type (spellFx5.js).
//
// So the flight is now chosen the way the cast already is: from what the ability SAYS it is first, then from the damage
// it deals, then -- for an ability that says nothing either way -- seeded off the ability's own identity, so one ability
// always flies the same way and two in one kit do not.
//
//   1. its NAME and description (FLIGHT_TOKENS): a comet streaks, a boulder tumbles, a shuriken spins, a lance or a
//      spike flies point-first, an orb or a wisp is one of the orbs, fire words ride the fireball, bolt words the bolt;
//   2. its DAMAGE TYPE (TYPE_FLIGHT): rock and earth tumble, piercing flies point-first, slashing spins, fire burns;
//      the rest choose between the bolt, the lance, the mote and the orbs;
//   3. otherwise a seeded draw over the general pool.
//
// A blade's projectile (sliceFx.js) is decided before any of this and is untouched.
// ============================================================================
import { FX5_FAMILIES } from './spellFx5.js';
import { FLIGHT_ORBS } from './flightOrbs.js';
import { damageFxFor } from './damageFx.js';
import { fxHash } from './fxCompose.js';
import { pickFlightFx, fxFamilyInfo, nearestFxColor } from './spellFx.js';
import { flight393For } from './fxArt393.js';   // ROUND 393
import { flight394For } from './beamWall394.js';   // ROUND 394

/** [regex over name + description, kind]. First match wins. */
export const FLIGHT_TOKENS = [
  [/comet|meteor(?!ite)|falling star|starfall|shooting star/i, 'comet'],
  [/boulder|\brock(?:s|fall)?\b|\bstones?\b|pebble|rubble|gravel|\bclod\b|meteorite|landslide|avalanche|catapult|\bsling/i, 'rock'],
  [/shuriken|throwing star|\bstars?\b|pinwheel|\bdisc\b|discus|chakram|caltrop|buzz ?saw|saw ?blade|whirling blade|spinning blade/i, 'star'],
  [/lance|javelin|\bspears?\b|\bspikes?\b|needle|\bdarts?\b|skewer|impale|icicle|harpoon|stinger|\bquills?\b|\bshards?\b|splinter|\bthorns?\b|\bspines?\b|lancet|\barrows?\b/i, 'lance'],
  [/\borbs?\b|sphere|\bballs?\b|globe|\bmotes?\b|\bwisps?\b|\bsouls?\b|spirit|\bspores?\b|\bseeds?\b|pearl|bubble|marble|pellet|droplet|\bglob/i, 'orb'],
  [/fire|flame|ember|blaze|inferno|magma|lava|\bpyre|\bsun\b|solar|scorch|burn|\bheat\b|cinder/i, 'fire'],
  [/\bbolt\b|missile|\bzap\b|\bray\b|\bbeam\b/i, 'bolt'],
];

/** What a damage type flies as when the words do not say. A list: the seed picks one. */
export const TYPE_FLIGHT = {
  rock: ['rock'], earth: ['rock'], sand: ['rock', 'orb'], blunt: ['rock'],
  piercing: ['lance'], slashing: ['star'],
  fire: ['fire'],
  frost: ['lance', 'orb', 'bolt'], ice: ['lance', 'star'], water: ['orb', 'bolt'],
  lightning: ['bolt', 'orb'], wind: ['star', 'bolt'], radiant: ['bolt', 'orb', 'lance'], light: ['orb', 'bolt'],
  transcendent: ['orb', 'lance'],
  nature: ['orb', 'mote', 'lance'], plant: ['orb', 'lance'], life: ['mote', 'orb'], poison: ['orb', 'lance'],
  shadow: ['orb', 'bolt'], dark: ['orb'], death: ['orb', 'mote'], necrotic: ['orb'], curse: ['orb', 'mote'],
  blood: ['orb', 'lance'], arcane: ['orb', 'bolt', 'star'], dimension: ['orb', 'star'],
  resonating: ['orb', 'star'], disruptive: ['orb', 'lance'],
};
/** The pool for an ability that names nothing and deals no typed damage. */
export const GENERAL_FLIGHT = ['bolt', 'bolt', 'orb', 'orb', 'lance', 'mote', 'star'];

const fx5 = (family, dtype) => {
  const f = FX5_FAMILIES[family];
  if (!f) return null;
  const color = f.colors.includes(dtype) ? dtype : 'native';
  return {
    family, color, key: `fx_${family}_${color}`, fx5: true, cell: f.cell, cellH: f.cellH, frames: f.frames,
    frameMs: f.frameMs, baseAngle: 0, heading: f.heading || 'aim', flightScale: f.flightScale || 1, impact: null,
    nativeKey: `fx_${family}_native`,
  };
};

/** One of the library orbs, by seed: greyscale, tinted to the cast at runtime, played ping-pong through its hold. */
export function orbFlight(seed) {
  const o = FLIGHT_ORBS[(fxHash('orbflight', seed) >>> 8) % FLIGHT_ORBS.length];
  return {
    family: 'liborb', id: o.id, color: null, key: `fx2_${o.page}`, frame0: o.start, frames: o.frames, frameMs: 70,
    pingpong: true, baseAngle: 0, heading: 'none', tinted: true,
    // drawn about 30px across whatever the art's own size, like the other flight sheets
    flightScale: Math.max(0.35, Math.min(1, 30 / Math.max(8, o.size))), impact: null,
  };
}

/** A sheet from the eleven-colour banks, in the colour nearest the ability's own (the round-343 bolt and fireball). */
function named(family, colorHex, extra = {}) {
  const info = fxFamilyInfo(family);
  if (!info) return null;
  let color = nearestFxColor(colorHex);
  if (info.colors && !info.colors.includes(color)) color = info.native;
  return { family, color, key: `fx_${family}_${color}`, ...info, baseAngle: 0, heading: 'aim', flightScale: 1, impact: null, ...extra };
}

/**
 * The flight art for a projectile ability. Returns a spec the WorldScene projectile code plays: { key, frames, frameMs,
 * frame0?, pingpong?, heading ('aim' turns onto the flight, 'none' does not), baseAngle, flightScale, tinted?, impact,
 * why ('words' | 'type' | 'colour' | 'seed') }.
 */
export function pickFlightArt(ability) {
  const a = ability || {};
  const text = `${a.name || ''} ${a.desc || ''}`;
  const seed = `${a.name || ''}|${a.catKey || a.template || ''}`;
  const dtype = damageFxFor(a);
  // ROUND 393 -- an entry that waited on the r391 projectile art flies it: a still (arrow, bolt, feather, quill, horn,
  // labrys, rim, skull, soul wisp, boulder) the scene turns, spins, tints and trails (fxArt393.js flight393For).
  // ROUND 394 -- the r392 drop's stills and looping flights (beamWall394.js flight394For) for the rows they fill
  const r394 = flight394For(a);
  if (r394) return r394;
  const r393 = flight393For(a);
  if (r393) return r393;
  let kind = null, why = null;
  // ROUND 391 -- a confluence identity sheet names what its bolt flies as (`flight` on the entry -> `flightHint`).
  if (['comet', 'rock', 'star', 'lance', 'orb', 'mote', 'fire', 'bolt'].includes(a.flightHint)) { kind = a.flightHint; why = 'sheet'; }
  if (!kind) for (const [re, k] of FLIGHT_TOKENS) { if (re.test(text)) { kind = k; why = 'words'; break; } }
  if (!kind) {
    const t = a.element && a.element !== 'physical' ? a.element : null;
    const list = (t && TYPE_FLIGHT[t]) || null;
    if (list) { kind = list[(fxHash('flightType', seed) >>> 8) % list.length]; why = 'type'; }
  }
  if (!kind) {
    // an untyped ability in a fiery colour still rides the fireball, as it always has
    const base = pickFlightFx(a.color, '');
    if (base && base.family === 'fireflight') { kind = 'fire'; why = 'colour'; }
    else { kind = GENERAL_FLIGHT[(fxHash('flightGen', seed) >>> 8) % GENERAL_FLIGHT.length]; why = 'seed'; }
  }
  let spec = null;
  if (kind === 'comet') spec = { ...pickFlightFx(a.color, 'comet'), heading: 'aim', flightScale: 1 };
  else if (kind === 'rock') spec = fx5('rockfly', dtype);
  else if (kind === 'star') spec = fx5(sizeOfAbility(a) === 'large' ? 'starlg' : 'starsm', dtype);
  else if (kind === 'lance') spec = fx5('lancefly', dtype);
  else if (kind === 'orb') spec = orbFlight(seed);
  else if (kind === 'mote') spec = named('mote', a.color, { heading: 'none' });
  else if (kind === 'fire') {
    const f = named('fireflight', a.color);
    if (f) f.impact = { family: 'fireburst', color: f.color, key: `fx_fireburst_${f.color}`, ...fxFamilyInfo('fireburst') };
    spec = f;
  } else spec = named('boltaim', a.color);
  if (spec) { spec.why = why; spec.kind = kind; }
  return spec;
}

function sizeOfAbility(a) {
  return a.radius >= 90 || a.aoe || (a.base || a.mag || 0) >= 24 ? 'large' : 'small';
}
