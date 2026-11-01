// ROUND 338 -- WHERE THE SECOND SPELL-ANIMATION DROP GETS CAST.
//
//   "Attached are a group of spell animations to be added. Please recolor to provide sufficient variety, except for
//    rainbow smoke which I already provided a number of different recolors and shapes to allow for somewhat random
//    rainbow smoke explosions on looting monsters."
//
// The sheets are cut by tools/make_spell_anims.py into public/assets/fx3/ and described in spellFx3.js (generated).
// This module is the pure half that decides WHEN each one plays, so it can be measured in node with no Phaser:
//
//   1. NEW_ART_TOKENS  -- what an ability's NAME has to say for the new art to claim it outright. Name only, not the
//      description: a generated description names half the vocabulary, and the name is the one place an ability says
//      what it IS ("Wall of Cinders" is a wall whatever its flavour text says). These casts always play their own
//      sheet (they have no library pool behind them) and borrow an existing family's sound and sparks.
//   2. FX3_ALT_POOLS   -- families that already had a hand-made sheet gain the new art as extra members of that sheet's
//      pool, chosen by the ability's own seed, so one ability always casts the same way and two in one kit differ.
//   3. SHEET_SHARE     -- the 1-in-8 chance the hand-made sheet beats the library pool is raised for the rune circle,
//      because five new circles are exactly the art a buff cast was missing.
import { fxHash } from './fxCompose.js';
import { FX3_FAMILIES, FX3_RAINBOW } from './spellFx3.js';

/** [token regex, pool of sheet families, family whose sound and sparks it borrows, optional guard(ability)]. First match wins. */
export const NEW_ART_TOKENS = [
  [/\bwall of (?:fire|flames?|embers|cinders)|fire ?wall|flame ?wall|conflagration|\bpyre\b/i, ['firewall'], 'explosion'],
  [/\bpath of (?:fire|flames?|embers)|trail of (?:fire|flames?|embers)|fire ?trail|flame ?trail|burning (?:path|ground|earth)|scorch|ember ?trail|cinder/i, ['firepath'], 'explosion'],
  [/blizzard|ice ?storm|snow ?storm|frost ?storm|whiteout|hail ?storm|sleet|glacial (?:gale|wind)/i, ['icestorm'], 'rain'],
  [/portal|gateway|doorway|\brift\b|wormhole|warp ?gate|stargate|dimensional|planar/i, ['portal'], 'goldring'],
  [/pillar of|beacon|sanctif|consecrat|column of light|shaft of|ray of (?:light|hope)/i, ['healpillar'], 'bloom'],
  // ROUND 340 -- the third drop. Streams and cones (a breath only when it is not a healing one), ground patches, splashes
  // and electrical/arcane rings.
  [/flame ?thrower|flame ?jet|fire ?jet|\bgout\b|\bcone of\b|stream of (?:fire|flames?|embers|frost|acid|venom|poison|lightning)|\bspray\b/i, ['flamethrower'], 'explosion'],
  [/\bbreath\b/i, ['flamethrower'], 'explosion', (a) => !(a.healAmount || a.hotPerSec || a.hot) && a.element !== 'radiant' && a.template !== 'selfHeal' && a.template !== 'aoeHealPulse'],
  // ROUND 341 -- a standing whirlpool / vortex and a tornado. Before the portal and liquid tokens below, which also
  // listed "vortex" and "whirlpool".
  [/vortex|whirlpool|maelstrom|\beddy\b|riptide|undertow|quicksand|sinkhole|gravity well|black hole|singularity/i, ['vortex'], 'voidburst'],
  [/tornado|twister|cyclone|whirlwind|dust devil|wind ?storm|hurricane|typhoon|sand ?storm|dust ?storm/i, ['tornado'], 'rain'],
  [/ice ?patch|frost ?patch|black ice|permafrost|hoarfrost|\bglaze\b|\bslick\b|\bpuddle|\bpatch of\b|\b(?:ice|frost|frozen|slime|oil|mud|tar|blood|bile|acid|venom|water) ?(?:patch|pool|sheet|floor)\b/i, ['icepatch'], 'rain'],
  // ROUND 370 -- a breaking wave: the sea rising and crashing. A shock, heat or sound wave is not water, and does not match.
  [/(?<!(?:heat|shock|sound|brain|radio|micro) )\b(?:tidal )?waves?\b(?! of)|\btide\b|\bsurf\b|breaker|\bcrest\b|\bswell\b|billow/i, ['wavecrest'], 'rain'],
  [/splash|geyser|tidal|tsunami|flood|\bdeluge\b|\bdownpour\b|acid (?:burst|bath)/i, ['aoeliquid'], 'rain'],
  [/static|discharge|\bsurge\b|overload|arc ?(?:burst|flash)|electro|galvan|arcane (?:burst|blast|nova|ring)|aether burst|mana burst|spell ?ring/i, ['aoearcane'], 'lightning'],
  // ROUND 370 -- the fourth drop (cut per damage type). Beams first: a beam, ray, laser or cannon is a line from the
  // caster that holds for a moment (the three widths: a thin ray, a beam, a cone for a cannon or a blast that widens).
  [/\b(?:cannon|blaster|annihilat|kamehameha|wave motion|hyper ?beam|death ray)/i, ['beamcone'], 'lightning'],
  [/\blaser|\bray\b|\bbeams?\b|\blance of (?:light|fire|frost|lightning)|light ?lance/i, ['beamthin', 'beammid'], 'lightning'],
  // a crescent: a moon-shaped cut that hangs and fades
  [/crescent|lunar|half.?moon|moon ?(?:blade|slash|cut|edge)|sickle/i, ['crescent'], 'cracks'],
  // a rain of needles: a volley that falls on a place
  [/needles?|rain of (?:arrows|needles|thorns|spikes|blades|daggers|knives|quills)|arrow ?(?:rain|storm)|\bvolley\b|barrage|fusillade|hail of|\bquills\b/i, ['needlerain'], 'rain'],
  [/slash|slice|sever|scythe|crescent|reap|carve|razor|\brake\b|claw/i, ['slasha', 'slashb', 'slashc', 'crescent'], 'cracks'],
  [/smash|slam|\bbash|crush|pound|hammer|wallop|pummel|thump|bludgeon|\bmaul\b/i, ['hitflash'], 'cracks'],
];

/** The new-art claim on an ability, by NAME: { family, soundFamily } or null. */
// ROUND 391 -- a confluence identity sheet names each entry's cast art (`fxHint`: an fx/fx2/fx3/fx5 family), and it is
// cast outright, borrowing the sound and sparks of the family it looks most like.
export const FX_HINT_SOUND = {
  firewall: 'explosion', firepath: 'explosion', blastsm: 'explosion', blastlg: 'explosion', flamethrower: 'explosion',
  icestorm: 'rain', aoeliquid: 'rain', icepatch: 'rain', needlerain: 'rain', wavecrest: 'rain', tornado: 'rain',
  beamthin: 'lightning', beammid: 'lightning', beamcone: 'lightning', aoearcane: 'lightning', lancefly: 'lightning',
  portal: 'goldring', circle1: 'runecircle', circle2: 'runecircle', circle3: 'runecircle', circle4: 'runecircle',
  circle5: 'runecircle', healpillar: 'bloom', vortex: 'voidburst', drainbeam: 'leechspiral', slasha: 'cracks',
  slashb: 'cracks', slashc: 'cracks', crescent: 'cracks', hitflash: 'cracks', rockfly: 'cracks', skystrike: 'boltstrike',
  starsm: 'lightning', starlg: 'lightning',
};
export function newArtFor(ability) {
  const a = ability || {};
  if (a.template === 'townPortal') return null;           // the ceremonial gold ring keeps its own
  if (a.fxHint) return { family: a.fxHint, soundFamily: FX_HINT_SOUND[a.fxHint] || a.fxHint };   // ROUND 391
  const name = a.name || '';
  if (!name) return null;
  // a name that asks the flames to draw a shape (wall, line, circle, star) casts copies of the flame
  const pattern = wallPatternFor(a);
  if (pattern) return { family: pattern.family, soundFamily: 'explosion', pattern };
  for (const [re, pool, sound, guard] of NEW_ART_TOKENS) {
    if (re.test(name) && (!guard || guard(a))) {
      const seed = `${name}|${a.catKey || a.template || ''}`;
      return { family: pool[(fxHash('newart', seed) >>> 8) % pool.length], soundFamily: sound };
    }
  }
  return null;
}

/** Families whose hand-made sheet gains the new art as extra members of its pool (the original stays one). */
export const FX3_ALT_POOLS = {
  explosion: ['explosion', 'blastsm', 'blastlg'],
  bloom: ['bloom', 'healpillar'],
  boltstrike: ['boltstrike', 'skystrike'],
  runecircle: ['runecircle', 'circle1', 'circle2', 'circle3', 'circle4', 'circle5'],
  summonring: ['summonring', 'circle2', 'circle4', 'circle5'],
  // ROUND 340
  pulse: ['pulse', 'aoearcane'],
  lightning: ['lightning', 'aoearcane'],
  rain: ['rain', 'aoeliquid', 'needlerain'],   // ROUND 370 -- and the rain of needles
  leechspiral: ['leechspiral', 'drainbeam'],
  // ROUND 341
  voidburst: ['voidburst', 'vortex'],
};

/** Which sheet a family casts for this seed: itself, or one of the new art in its pool. */
export function sheetFamilyFor(family, seed) {
  const pool = FX3_ALT_POOLS[family];
  if (!pool) return family;
  // the high bits: fxHash's low bits track its last character, which would tie this to the sheet-wins draw (same seed)
  return pool[(fxHash('alt', seed) >>> 8) % pool.length];
}

/** Per-family override of the 1-in-N chance the hand-made sheet wins over the pooled library. */
export const SHEET_SHARE = { runecircle: 2 };

export function isFx3Family(f) { return !!FX3_FAMILIES[f]; }

// ---------------------------------------------------------------------------
// THE LOOT SMOKE. A looted body goes out in a burst of rainbow smoke: one main burst at the body, and now and then one
// or two smaller ones beside it a beat later. Which of the artist's 25 sheets (three shapes: smoke3, smoke4, smoke5,
// each in several colourings) and where they sit is random every time, so no two bodies vanish the same way and two
// bodies looted together do not repeat each other. Pure: takes any () => [0,1) so the suite can drive it.
// ---------------------------------------------------------------------------
/** @returns {{id:string,dx:number,dy:number,delayMs:number,scale:number,flip:boolean,rot:number}[]} */
export function rainbowBurstPlan(rng = Math.random, sheets = FX3_RAINBOW) {
  if (!sheets || !sheets.length) return [];
  const pickIdx = (not) => {
    let i = Math.floor(rng() * sheets.length) % sheets.length;
    if (not && not.size < sheets.length) { while (not.has(i)) i = (i + 1) % sheets.length; }
    return i;
  };
  const used = new Set();
  const extra = rng() < 0.5 ? (rng() < 0.45 ? 2 : 1) : 0;
  const plan = [];
  for (let n = 0; n <= extra; n++) {
    const i = pickIdx(used); used.add(i);
    const main = n === 0;
    plan.push({
      id: sheets[i].id,
      dx: main ? 0 : (rng() - 0.5) * 44,
      dy: main ? 0 : (rng() - 0.5) * 22,
      delayMs: main ? 0 : 90 + Math.round(rng() * 220),
      scale: main ? 1.15 + rng() * 0.35 : 0.7 + rng() * 0.3,
      flip: rng() < 0.5,
      rot: (rng() - 0.5) * 0.5,
    });
  }
  return plan;
}

// ---------------------------------------------------------------------------
// ROUND 338 (update) -- SHAPES MADE OF FIRE.
//
//   "Various abilities that utilize Wall of fire should use multiple copies of the spell to: draw lines ('Wall of Fire',
//    'Line of fire'); circles ('barricade, circle, fortress'); stars ('Stamp, scar'). Sometimes the spell may be built so
//    that it places each animation in order drawing out the shape, other times it might place all at once."
//
// One flame is a sprite; a wall is a row of them. `wallPatternFor` reads the ability's NAME for the shape it names and
// `wallPlan` lays the copies out (world units, relative to the cast point) with the time each one lights:
//
//   line    'wall'  -- across the aim, centred a little ahead of the caster ("Wall of Fire")
//           'line'  -- from the caster out along the aim ("Line of Fire", "Path of Embers", "Trail of Flame")
//   circle  'ring'  -- round the cast point ("Barricade", "Circle of Fire", "Fortress")
//   star    'star'  -- a five-point star drawn in one stroke, point up on the screen ("Stamp", "Scar", "Brand")
//
// SEQUENCE lights the copies one after another in drawing order so the shape is traced; BURST lights them all together
// (with a few tens of ms of jitter so it does not read as one flat sheet). Which of the two is the ability's own seed, so
// a given ability always draws the same way and two in one kit differ.
//
// A shape word on its own is too common to claim ("Fortress Stance", "Magic Circle", "Star Fall" are not fire walls), so
// every shape except the explicit "wall of fire" family also needs fire in the name or in the ability's element.
// ---------------------------------------------------------------------------
const FIRE_WORD = /fire|flame|ember|cinder|inferno|blaze|pyre|burn|scorch|magma|lava|molten|immolat|brand/i;
const WALL_EXPLICIT = /\bwall of (?:fire|flames?|embers|cinders)|fire ?wall|flame ?wall/i;
const LINE_ALONG = /\bline of\b|\bfire ?line|flame ?line|\bpath of\b|\btrail of\b|\b(?:fire|flame|ember) ?trail|\btrail\b|\bstreak\b|\bstripe/i;
const WALL_ACROSS = /\bwall\b|barrier|screen of/i;
const RING = /barricade|\bcircle\b|fortress|bulwark|rampart|palisade|stockade|\bring of\b|enclos|cordon|bastion|citadel|\bcorral/i;
const STAR = /\bstamp|\bscars?\b|\bstar\b|pentagram|pentacle|\bbrand\b/i;
const SMALL_FLAME = /\bpath of\b|\btrail of\b|\btrail\b|ember ?trail|fire ?trail|flame ?trail/i;
const SEQUENCE_PCT = { line: 50, circle: 65, star: 70 };

/** The shape a name asks the flames to draw: { shape, kind, mode, family, seed } or null. */
export function wallPatternFor(ability) {
  const a = ability || {};
  const name = a.name || '';
  if (!name) return null;
  const fireCtx = FIRE_WORD.test(name) || a.element === 'fire';
  let shape = null, kind = null;
  if (WALL_EXPLICIT.test(name)) { shape = 'line'; kind = 'wall'; }
  else if (fireCtx && STAR.test(name)) { shape = 'star'; kind = 'star'; }
  else if (fireCtx && RING.test(name)) { shape = 'circle'; kind = 'ring'; }
  else if (fireCtx && LINE_ALONG.test(name)) { shape = 'line'; kind = 'line'; }
  else if (fireCtx && WALL_ACROSS.test(name)) { shape = 'line'; kind = 'wall'; }
  if (!shape) return null;
  const seed = `${name}|${a.catKey || a.template || ''}`;
  const mode = (fxHash('mode', seed) >>> 8) % 100 < SEQUENCE_PCT[shape] ? 'sequence' : 'burst';
  return { shape, kind, mode, family: (SMALL_FLAME.test(name) || shape === 'star') ? 'firepath' : 'firewall', seed };   // a star lies on the ground: the small flames read as a mark, the tall ones as a thicket
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const PLAN_MAX = 40;
const DRAW_MS = 640;      // a traced shape takes about this long to complete
const SPACING = { firewall: 20, firepath: 14 };

function _along(points, spacing) {
  // points: a polyline; returns copies spaced ~`spacing` apart, both ends included, in stroke order
  const out = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(len / spacing));
    for (let k = (i === 0 ? 0 : 1); k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}

/**
 * The copies of a pattern, in drawing order.
 * @param {object} pattern  from wallPatternFor
 * @param {number} scale    the cast's reach / 60 (>= 1): how far the shape extends
 * @param {number} aim      the caster's aim, radians in WORLD space
 * @returns {{dx:number,dy:number,delayMs:number}[]}  world-unit offsets from the cast point
 */
export function wallPlan(pattern, scale = 1, aim = 0) {
  if (!pattern) return [];
  const sp = SPACING[pattern.family] || 20;
  const seed = pattern.seed || '';
  const unit = (tag) => (fxHash(tag, seed) >>> 8) / 16777216;
  const s = Math.max(1, scale);
  let pts = [];
  if (pattern.shape === 'line') {
    const L = clamp(64 * s, 72, 200), ca = Math.cos(aim), sa = Math.sin(aim);
    if (pattern.kind === 'wall') {                       // across the aim, centred
      const px = -sa, py = ca, flip = unit('flip') < 0.5 ? 1 : -1;
      pts = _along([[-px * L / 2 * flip, -py * L / 2 * flip], [px * L / 2 * flip, py * L / 2 * flip]], sp);
    } else {                                              // out along the aim from the caster
      pts = _along([[ca * 14, sa * 14], [ca * (14 + L), sa * (14 + L)]], sp);
    }
  } else if (pattern.shape === 'circle') {
    const R = clamp(40 * s, 52, 110), n = clamp(Math.round(2 * Math.PI * R / (sp + 2)), 8, 28);
    const a0 = unit('start') * Math.PI * 2, dir = unit('dir') < 0.5 ? 1 : -1;
    for (let k = 0; k < n; k++) { const a = a0 + dir * k * 2 * Math.PI / n; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
  } else if (pattern.shape === 'star') {
    const R = clamp(52 * s, 64, 120);
    const up = -3 * Math.PI / 4;                          // world direction that points up the screen
    const v = (k) => [Math.cos(up + k * 2 * Math.PI / 5) * R, Math.sin(up + k * 2 * Math.PI / 5) * R];
    pts = _along([0, 2, 4, 1, 3, 0].map(v), sp * 1.7);      // one unbroken stroke
  }
  if (pts.length > PLAN_MAX) { const step = pts.length / PLAN_MAX; pts = Array.from({ length: PLAN_MAX }, (_, i) => pts[Math.floor(i * step)]); }
  const n = pts.length, seq = pattern.mode === 'sequence';
  return pts.map(([dx, dy], i) => ({
    dx: Math.round(dx * 10) / 10, dy: Math.round(dy * 10) / 10,
    delayMs: seq ? Math.round(DRAW_MS * i / Math.max(1, n - 1)) : Math.round((fxHash('jit', seed, i) >>> 8) % 50),
  }));
}
