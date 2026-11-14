// ============================================================================
// ROUND 422 -- WINDOWS, THE THINGS ON THE TABLES, PEOPLE SITTING AND SLEEPING, AND THE ROUNDHOUSE. Pure rules; the
// scene side is src/scenes/homeDress422Mixin.js. The art is the user's interiors2.zip, packed by
// tools/interiors_r422/pack_interiors2.py into src/data/interiors422.js.
//
//   windows      "about one window per 3-4 wall segments, never on the doorway run": `windowPicks` takes a back run's
//                tiles and the tiles it must not use (the corner, where an inside wall meets it, behind a stair or a
//                stove pipe) and spaces windows along it. One window style per house, from its culture.
//   tabletop     "candles, oil lamps, lantern, cups, books, scroll, baskets; plus household extras", put on tables,
//                nightstands, sideboards and low tables (`tabletopFor`) and on some window sills (`sillFor`). A candle
//                or a lamp is lit after dark and throws a small warm light (`SMALL_LIGHTS`).
//   residents    the ten looks that have seated and lying poses (`RESIDENT_LOOKS`), chosen by sex and how well off the
//                house is; `bedCell` says which lying cell suits a bed by the way it was drawn.
//   roundhouse   `dressRoundhouse`: the Celtic roundhouse, one circular room, the hearth in its middle.
// ============================================================================
import { SMALL_PROPS, POSED } from './interiors422.js';
import { kitWindowFor } from './buildingKits.js';

export function rngFrom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000003) / 1000003; };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

export const isNightHour = (h) => h >= 19 || h < 6.5;
export const isSleepHour = (h) => h >= 22 || h < 6;

// ---------------------------------------------------------------- windows
/** Window cells in kit_<m>_windows.png: [north, west] for each style (buildingKits.js KIT_WINDOW_PIECES). */
export const WINDOW_CELLS = Object.fromEntries(['square', 'arched', 'shuttered'].map(st => [st,
  [kitWindowFor('north', st).idx, kitWindowFor('west', st).idx]]));
/** Which style a house's windows are, by culture: [style, weight]. */
const WINDOW_STYLES = {
  warm: [['arched', 6], ['square', 3], ['shuttered', 1]],
  tiled: [['arched', 8], ['square', 2]],
  stone: [['arched', 5], ['square', 5]],
  east: [['square', 10]],
  eastwood: [['square', 6], ['shuttered', 4]],
  rustic: [['shuttered', 6], ['square', 4]],
  wild: [['shuttered', 8], ['square', 2]],
  cold: [['shuttered', 6], ['square', 4]],
  town: [['square', 6], ['shuttered', 2], ['arched', 2]],
};
export function windowStyleFor(culture, key) {
  const rng = rngFrom(`win|${key}`);
  const opts = WINDOW_STYLES[culture] || WINDOW_STYLES.town;
  let r = rng() * opts.reduce((s, o) => s + o[1], 0);
  for (const [s, w] of opts) { r -= w; if (r <= 0) return s; }
  return opts[0][0];
}
/** One window for every this many wall segments. */
export const WINDOW_EVERY = 3.5;

/**
 * Where the windows go on one back run.
 *   len      the run's length in tiles (index 0 is the room's back corner)
 *   banned   a Set of indices that must stay plain wall
 * Returns the chosen indices: round(len / WINDOW_EVERY) of them (at least one on a run of three or more free tiles),
 * as evenly spaced as the free tiles allow and never two side by side.
 */
export function windowPicks(len, banned) {
  if (len < 3) return [];   // a stub of wall between two corners is left plain
  const free = [];
  for (let i = 1; i < len; i++) if (!banned.has(i)) free.push(i);
  if (free.length === 0) return [];
  const want = Math.max(free.length >= 2 ? 1 : 0, Math.round(len / WINDOW_EVERY));
  const out = [];
  for (let k = 0; k < want; k++) {
    const target = (len * (k + 0.5)) / want;
    let best = null;
    for (const i of free) {
      if (out.some(j => Math.abs(j - i) < 2)) continue;
      if (best === null || Math.abs(i - target) < Math.abs(best - target)) best = i;
    }
    if (best !== null) out.push(best);
  }
  return out.sort((a, b) => a - b);
}

/** Props that stand tall against a back wall: no window behind them (a stove pipe through the glass). */
export const TALL_AT_WALL = new Set(['stoveIron', 'stoveTiled', 'potbelly', 'stoveCage', 'fireplacePale', 'fireplaceLit',
  'hearthStone', 'hearthRustic', 'fireplaceCone', 'jarShelves', 'scrollStand', 'loom', 'forgeLarge', 'forgeSmall',
  'weaponRack', 'netsCreels', 'stairFull', 'paperScreen', 'paperScreenDark', 'bedFluffy', 'bedBone']);

// ---------------------------------------------------------------- tabletop
/** The light a lit small thing throws (lighting.js shape). */
export const SMALL_LIGHTS = {
  candle: { kind: 'flame', color: 0xffc27a, radius: 70, power: 0.55, glow: 0.24 },
  lamp: { kind: 'flame', color: 0xffcf8a, radius: 96, power: 0.65, glow: 0.3 },
  hearth: { kind: 'ember', color: 0xff8a3c, radius: 190, power: 0.85, glow: 0.55 },
};
/** Drawn at half size: a 32px cup is about the size of a hand beside a 64px person. */
export const SMALL_PROP_SCALE = 0.5;

const TRADE_THINGS = {
  jarShelves: ['mortar_pestle', 'potion_red', 'potion_blue', 'dried_flowers', 'scales'],
  writingDesk: ['inkwell_quill', 'letter_quill', 'sealed_map', 'papers', 'scroll'],
  netsCreels: ['fish_plate', 'basket_empty'],
  workbenchJoiner: ['tool_box'],
  anvilCorner: ['tool_box', 'tankard'],
  loom: ['yarn_needles', 'sewing_box', 'basket_laundry'],
  sacks: ['bread_loaf', 'basket_bread'],
  laundryLine: ['basket_laundry', 'sewing_box'],
};

/**
 * What stands on one piece of furniture.
 *   kind  'table' | 'stand' | 'sideboard' | 'low' | 'meal'
 *   ctx   { key, culture, klass, trade, hour, household }
 * Returns up to `room` keys of SMALL_PROPS, the light-giving one first.
 */
export function tabletopFor(kind, ctx, salt = '') {
  const rng = rngFrom(`top|${ctx.key}|${kind}|${salt}`);
  const hour = ctx.hour === undefined ? 12 : ctx.hour;
  const night = isNightHour(hour);
  const well = ctx.klass === 'well', poor = ctx.klass === 'poor';
  const east = ctx.culture === 'east' || ctx.culture === 'eastwood';
  const out = [];
  const add = (k) => { if (k && SMALL_PROPS[k] && !out.includes(k)) out.push(k); };
  const light = () => (east ? 'oil_lamp_clay' : well ? pick(rng, ['candelabra', 'oil_lamp_brass', 'candle'])
    : poor ? pick(rng, ['candle_stub', 'oil_lamp_clay']) : pick(rng, ['candle', 'oil_lamp_clay', 'candles_cluster', 'lantern']));
  if (kind === 'meal') {
    // the laid table brings its own food; after dark it gets a light, and a drink at each end
    if (night) add(light());
    add(east ? 'tea_cup' : well ? 'goblet' : pick(rng, ['clay_mug', 'wooden_cup', 'tankard']));
    return out.slice(0, 2);
  }
  if (kind === 'low') {
    if (night) add('oil_lamp_clay');
    add('teapot'); add('tea_cup');
    return out.slice(0, 3);
  }
  if (kind === 'stand') {
    add(night ? 'candle_stub' : pick(rng, ['candle_stub', 'candle']));
    if (rng() < 0.6) add(pick(rng, well ? ['pocket_watch', 'spectacles', 'book_closed', 'hand_mirror', 'key_ring']
      : ['book_closed', 'hair_brush', 'key_ring', 'wooden_cup', 'pipe']));
    return out.slice(0, 2);
  }
  if (kind === 'sideboard') {
    add(pick(rng, east ? ['teapot', 'tea_cup'] : ['clay_jug', 'teapot', 'tankard']));
    add(pick(rng, ['basket_bread', 'basket_apples', 'berry_bowl', 'salt_jar', 'cheese_board', 'bread_loaf']));
    if (night && rng() < 0.5) out.unshift(light());
    return out.slice(0, 2);
  }
  // an ordinary table, between meals
  if (night || rng() < 0.6) add(light());
  const trade = ctx.trade && TRADE_THINGS[ctx.trade];
  if (trade && rng() < 0.7) add(pick(rng, trade));
  const life = well ? ['book_open', 'teapot', 'grapes_plate', 'playing_cards', 'hourglass', 'sealed_map', 'coin_stacks', 'goblet']
    : poor ? ['wooden_cup', 'dice_cup', 'bread_loaf', 'clay_mug', 'basket_empty', 'pipe']
      : ['book_closed', 'basket_bread', 'clay_jug', 'sewing_box', 'clay_mug', 'papers', 'yarn_needles', 'basket_apples', 'stew_bowl'];
  add(pick(rng, life));
  if ((ctx.household || 1) >= 3 && rng() < 0.35) add('toy_horse');
  else if (rng() < 0.45) add(pick(rng, life));
  return out.slice(0, 3);
}

/** A window sill's one thing, or null (most sills are bare). */
export function sillFor(ctx, i) {
  const rng = rngFrom(`sill|${ctx.key}|${i}`);
  if (rng() > 0.4) return null;
  if (isNightHour(ctx.hour === undefined ? 12 : ctx.hour) && rng() < 0.5) return 'candle';
  return pick(rng, ['potted_herb', 'dried_flowers', 'potted_herb', 'candle_stub']);
}

/** Does this small prop give light, and is it lit at this hour? */
export function smallLight(key, hour) {
  const d = SMALL_PROPS[key];
  if (!d || !d.light) return null;
  return isNightHour(hour) ? SMALL_LIGHTS[d.light] : null;
}

// ---------------------------------------------------------------- residents
/** The ten looks with seated poses, by who they suit. A look name is the npc_ sheet; variants are its recolours. */
export const RESIDENT_LOOKS = {
  female: ['npc_cheerful_peasant_girl', 'npc_female_adventurer'],
  male: ['npc_peasant_man', 'npc_farmer', 'npc_townsman', 'npc_grizzled_adventurer', 'npc_muscular_adventurer'],
  wellFemale: ['npc_posh_noble_girl', 'npc_cheerful_peasant_girl'],
  wellMale: ['npc_noble_standing', 'npc_townsman'],
  devout: ['npc_priest_f'],
};
/** Every recolour that has its seated pose packed, per base look. */
export const LOOK_VARIANTS = Object.fromEntries(Object.keys(RESIDENT_LOOKS).flatMap(k => RESIDENT_LOOKS[k]).map(m => [m,
  Object.keys(POSED).filter(k => POSED[k].model === m)]));

/** Which look a resident wears: stable per person. */
export function residentLook(person, klass, seed) {
  const rng = rngFrom(`look|${seed}|${person.name || ''}`);
  const female = !!person.female;
  let pool = female ? RESIDENT_LOOKS.female : RESIDENT_LOOKS.male;
  if (klass === 'well' && rng() < 0.7) pool = female ? RESIDENT_LOOKS.wellFemale : RESIDENT_LOOKS.wellMale;
  if (female && /priest|acolyte|temple/i.test(person.trade || '')) pool = RESIDENT_LOOKS.devout;
  const base = pick(rng, pool);
  const vs = LOOK_VARIANTS[base] && LOOK_VARIANTS[base].length ? LOOK_VARIANTS[base] : [base];
  // a priestess keeps her plain robe at home (the god-dyed ones are for the temples)
  return base === 'npc_priest_f' ? base : pick(rng, vs.filter(v => !/_(death|dominion|healing|heros|knowledge|liberty|purity|war)$/.test(v)));
}
export const seatedKey = (look) => `${look}_seated`;
export const lyingKey = (look) => (POSED[look] && POSED[look].lying ? `${look}_lying` : null);

/**
 * The lying cell for a bed, or -1 when nobody should be laid on it from this art.
 *   [0] head toward upper-right (a bed whose headboard is on its north side: a FURN bed facing southwest, or the
 *       unmade bed / futon as drawn); [1] head toward upper-left (facing southeast, or mirrored).
 * A bed whose head is on the near side (facing northeast / northwest) gets nobody: the poses lie head-away only.
 */
export function bedCell(face, flipped) {
  if (face === 'southwest') return 0;
  if (face === 'southeast') return 1;
  if (face === null || face === undefined) return flipped ? 1 : 0;
  return -1;
}

// ---------------------------------------------------------------- the roundhouse
export const ROUND_FLOORS = { 5: 'interior_floor_roundhouse_320', 7: 'interior_floor_roundhouse_448' };
/** Inside the circle, with a margin for the kerb drawn at its edge. */
export function roundWalkable(d, tx, ty) {
  const c = d / 2, r = d / 2 - 0.45;
  return Math.hypot(tx + 0.5 - c, ty + 0.5 - c) <= r;
}

/**
 * The Celtic roundhouse: one round room, the hearth in the middle (on the floor art), beds round the wall at the back,
 * stools by the fire, the work and the stores round the sides, and the doorway at the front kept clear.
 */
export function dressRoundhouse(ctx) {
  const d = ctx.size === 'small' ? 5 : 7;
  const rng = rngFrom(`round|${ctx.key}`);
  const c = d / 2;
  const hour = ctx.hour === undefined ? 12 : ctx.hour;
  const made = !(hour >= 5.5 && hour < 10);
  const props = [], spots = [];
  const P = (key, tx, ty, extra = {}) => props.push({ key, tx, ty, ...extra });
  // Laid out in the room's own tile coordinates (world north is the screen's upper right, world west its upper left);
  // the door is the middle of the south side, so the lower-left of the circle stays clear.
  const L = d === 7
    ? { bedN: [3.0, 0.95], bedW: [0.95, 3.0], cradle: [1.35, 1.35], s1: [4.0, 2.05], s2: [1.95, 3.8], trade: [5.2, 2.0],
      store: [5.25, 4.1], more: [1.0, 4.65] }
    : { bedN: [2.0, 0.75], bedW: null, cradle: null, s1: [2.95, 1.35], s2: [1.15, 2.6], trade: [3.75, 1.9], store: [3.6, 3.2], more: null };
  const beds = [[L.bedN, 'southwest'], [L.bedW, 'southeast']].filter(([p]) => p);
  for (const [[x, y], f] of beds.slice(0, (ctx.household || 1) >= 3 ? 2 : 1)) {
    if (made) P('bedFluffy', x, y, { face: f, free: true });
    else P(pick(rng, ['unmadeBed', 'unmadeBedBlue', 'unmadeBedGreen']), x, y, f === 'southeast' ? { flip: true } : {});
  }
  spots.push({ zone: 'bed', tx: c - 0.5, ty: c - 1.6, facing: 'northeast' });
  const s1 = L.s1, s2 = L.s2, e1 = L.trade;
  P('stoolWood', s1[0], s1[1]); P('stoolRound', s2[0], s2[1]);
  P(ctx.trade || 'washTub', e1[0], e1[1]);
  P(pick(rng, ['sacks', 'barrelStack', 'jugCluster']), L.store[0], L.store[1]);
  if (L.more) P(pick(rng, ['crateProduce', 'choppingBlock', 'jugCluster']), L.more[0], L.more[1]);
  if (L.cradle && (ctx.household || 1) >= 3 && rng() < 0.6) P('cradle', L.cradle[0], L.cradle[1]);
  spots.push({ zone: 'cook', tx: s1[0], ty: s1[1] + 0.8, facing: 'northwest' });
  spots.push({ zone: 'work', tx: e1[0] - 0.9, ty: e1[1], facing: 'east' });
  spots.push({ zone: 'table', tx: s2[0], ty: s2[1] + 0.8, facing: 'northeast' });
  return {
    w: d, h: d, door: { at: Math.floor(d / 2) - 1, span: 2 }, floor: 'round', kit: 'log', props, walls: [], spots,
    stair: null, round: d, hearth: { tx: c - 0.5, ty: c - 0.5 },
    name: 'A roundhouse', blurb: 'One round room under the thatch, the fire in the middle of it and the smoke finding its own way out.',
    summary: { culture: 'wild', round: d, props: props.length },
  };
}

/** Self-check for the suite: every key named here is a small prop that exists. */
export function homeDress422Faults() {
  const bad = [];
  const ctxs = [];
  for (const culture of ['town', 'east', 'warm', 'rustic']) for (const klass of ['poor', 'modest', 'well']) for (const hour of [8, 12.5, 15, 21]) {
    ctxs.push({ key: `${culture}${klass}${hour}`, culture, klass, hour, household: 3, trade: 'jarShelves' });
  }
  for (const c of ctxs) for (const kind of ['table', 'stand', 'sideboard', 'low', 'meal']) {
    for (const k of tabletopFor(kind, c)) if (!SMALL_PROPS[k]) bad.push(`${kind}: ${k} is not a small prop`);
  }
  for (const vs of Object.values(LOOK_VARIANTS)) if (!vs.length) bad.push('a resident look with no posed sheet');
  for (const [s, cells] of Object.entries(WINDOW_CELLS)) if (cells.some(c => c < 0 || c > 5)) bad.push(`window ${s}`);
  return bad;
}
