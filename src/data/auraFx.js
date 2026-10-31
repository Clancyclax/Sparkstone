// ============================================================================
// ROUND 371 -- WHAT AN AURA LOOKS LIKE.
//
//   "I've added a ton of different Aura animations through the 370+ rounds but only every see 1 animation with a few
//    recolors. Lets increase the variety significantly."
//
// Exact again. Every aura in the game was drawn by `_rebuildFamiliars` as ONE of two sheets: the round-39 `ring`, or
// for an aura with an effect (slow, weaken, sunder...) the `pulse` -- each in the eleven colour names. Meanwhile:
//
//   * the first bank has five more looping ground circles: the sigil, the rune circle, the thorn mandala, and the two
//     gold rings (gold alone);
//   * the round-338 drop has five iso-flat magic circles (circle1..5) and a flat spiral (vortex), drawn ON the ground
//     plane already, which no aura ever used;
//   * the 1,050-effect library holds 110 held rings and sigils (shape ring/sigil, motion hold), greyscale and tinted at
//     runtime -- fifty of which read as a field on the ground rather than as a spark (AURA_LIBRARY, picked by eye off
//     a contact sheet of all 110).
//
// So an aura now draws one of ~60 looks, chosen the way a cast is (spellFx.js): from what the aura SAYS it is first,
// then seeded off its own identity, so one aura always looks the same and two in a kit -- or on two adventurers --
// do not. The colour is the aura's own, as before.
// ============================================================================
import { FX2_FAMILIES } from './spellFx2.js';
import { FX3_FAMILIES } from './spellFx3.js';
import { FX_ATLAS } from './fxAtlas.js';
import { fxInfo } from './fxLibrary.js';
import { fxHash } from './fxCompose.js';
import { nearestFxColor } from './spellFx.js';

/** The named sheets an aura can be. `flat` -- drawn on the ground plane already (no squash); otherwise the art is seen
 *  from above and is squashed to half height like the round-39 ring. `fill` -- how much of the cell the art spans. */
export const AURA_NAMED = [
  { family: 'ring', fill: 0.92 },
  { family: 'pulse', fill: 0.92, debuff: true },
  { family: 'sigil', fill: 0.9 },
  { family: 'runecircle', fill: 0.9 },
  { family: 'thornshield', fill: 0.92, debuff: true },
  { family: 'goldring', fill: 0.85, goldOnly: true },
  { family: 'summonring', fill: 0.85, goldOnly: true },
  { family: 'circle1', flat: true, fill: 0.95 },
  { family: 'circle2', flat: true, fill: 0.95 },
  { family: 'circle3', flat: true, fill: 0.95 },
  { family: 'circle4', flat: true, fill: 0.95 },
  { family: 'circle5', flat: true, fill: 0.95 },
  { family: 'vortex', flat: true, fill: 0.56, debuff: true },
];

/** The library's held rings and sigils that read as a field on the ground. */
export const AURA_LIBRARY = [750, 1093, 1104, 1114, 1132, 1137, 1148, 1150, 1168, 1170, 1190, 1204, 1206, 1226, 1259,
  1284, 1285, 1331, 1370, 1386, 1387, 1398, 1400, 1417, 1418, 1420, 1421, 1437, 1485, 1486, 1488, 1489, 1542, 1609,
  1612, 1659, 1670, 1687, 1688, 1692, 1745, 1757, 1773, 1775, 1782, 1783, 1785, 1792, 1796, 1798];

const LIB_FILL = { small: 0.45, mid: 0.7, large: 0.92 };

/** Words that ask for a look. First match wins; the seed picks within the list. */
const AURA_TOKENS = [
  [/thorn|spike|bramble|barb|nettle|briar/i, ['thornshield']],
  [/rune|glyph|sigil|seal|ward|script|circle|arcane|mystic|magus|magister/i, ['runecircle', 'sigil', 'circle1', 'circle2', 'circle3', 'circle4', 'circle5']],
  [/vortex|whirl|maelstrom|cyclone|spiral|storm|gale|tempest|void|abyss|gravity/i, ['vortex']],
  [/halo|crown|holy|sacred|divine|radian|sun|gold|regal|king|queen|majest/i, ['goldring', 'summonring', 'ring']],
  [/pulse|throb|beat|heart|dread|terror|fear|oppress|weight|pressure|presence/i, ['pulse']],
];

const hexToInt = (hex) => { const n = parseInt(String(hex || '').replace('#', ''), 16); return Number.isFinite(n) ? n : 0xffd54f; };

function namedSpec(entry, color) {
  const info = FX2_FAMILIES[entry.family] || FX3_FAMILIES[entry.family];
  if (!info) return null;
  let c = nearestFxColor(color || '#ffd54f');
  if (!info.colors.includes(c)) c = info.native;
  const frames = info.frames;
  return {
    kind: 'named', family: entry.family, key: `fx_${entry.family}_${c}`, frame0: 0, frames, frameMs: Math.max(70, info.frameMs || 90),
    // a sheet drawn to loop loops; one drawn to play once (the round-338 circles) is played there and back, so it
    // breathes rather than popping back to its first frame
    pingpong: !info.loop, cell: info.cell, cellH: info.cellH || info.cell, flat: !!entry.flat, fill: entry.fill || 0.9,
    tint: null, color: c,
  };
}

function librarySpec(id) {
  const at = FX_ATLAS[id], inf = fxInfo(id);
  if (!at || !inf) return null;
  return {
    kind: 'library', family: 'lib', id, key: `fx2_${at[0]}`, frame0: at[1], frames: at[2], frameMs: 110, pingpong: true,
    cell: 64, cellH: 64, flat: false, fill: LIB_FILL[inf.size] || 0.7, tint: true,
  };
}

/** Every look an aura can take: [{ kind, family|id }]. */
export function auraLooks() {
  return [...AURA_NAMED.map(e => ({ kind: 'named', family: e.family })), ...AURA_LIBRARY.map(id => ({ kind: 'library', id }))];
}

/**
 * The look of one aura. `a` -- the aura ability (name, desc, color, auraEffect); `seed` -- what makes it this aura
 * (its key, or the adventurer who carries it). Returns { key, frame0, frames, frameMs, pingpong, cell, cellH, flat,
 * fill, tint (a 0xRRGGBB to tint with, or null), why }.
 */
export function pickAuraFx(a, seed = '') {
  const aa = a || {};
  const text = `${aa.name || ''} ${aa.desc || ''}`;
  const color = aa.color || '#ffd54f';
  const cName = nearestFxColor(color);
  const golden = cName === 'gold' || cName === 'yellow' || cName === 'orange';
  const id = `${aa.name || ''}|${aa.auraEffect || ''}|${seed}`;
  const h = (salt) => fxHash(`aura|${salt}`, id) >>> 8;
  // 1. the words
  for (const [re, fams] of AURA_TOKENS) {
    if (!re.test(text)) continue;
    const ok = fams.filter(f => { const e = AURA_NAMED.find(x => x.family === f); return e && (!e.goldOnly || golden); });
    if (!ok.length) continue;
    // a third of the time the words still give way to a library look of the same kind, so two "Runic" auras differ
    if (h('lib') % 3 === 0) break;
    const e = AURA_NAMED.find(x => x.family === ok[h('word') % ok.length]);
    const s = namedSpec(e, color);
    if (s) return { ...s, tint: null, why: 'words' };
  }
  // 2. an aura that presses on enemies leans to the pressing looks
  if (aa.auraEffect && h('fx') % 2 === 0) {
    const pool = AURA_NAMED.filter(e => e.debuff);
    const s = namedSpec(pool[h('fxpick') % pool.length], color);
    if (s) return { ...s, why: 'effect' };
  }
  // 3. the seed, over everything (the library is the larger share: it is most of the variety)
  const named = AURA_NAMED.filter(e => !e.goldOnly || golden);
  const n = named.length + AURA_LIBRARY.length;
  const k = h('any') % n;
  if (k < named.length) {
    const s = namedSpec(named[k], color);
    if (s) return { ...s, why: 'seed' };
  }
  const lib = librarySpec(AURA_LIBRARY[(k - named.length + AURA_LIBRARY.length) % AURA_LIBRARY.length]);
  if (lib) return { ...lib, tint: hexToInt(color), why: 'seed' };
  return { ...namedSpec(AURA_NAMED[0], color), why: 'fallback' };
}

/** The sprite scale that makes a look `radius` world units across its own art (x, y). */
export function auraScale(spec, radius) {
  const across = Math.max(8, spec.cell * (spec.fill || 0.9));
  const sx = (radius * 2) / across;
  // a top-down look is squashed onto the ground; a flat one keeps its drawn proportion
  return { x: sx, y: spec.flat ? sx : sx * 0.5 };
}

/** The frame to show `t` ms into a look's loop. */
export function auraFrame(spec, t) {
  const n = Math.max(1, spec.frames);
  const step = Math.floor(t / (spec.frameMs || 90));
  if (!spec.pingpong || n < 3) return (spec.frame0 || 0) + (step % n);
  const period = 2 * n - 2, s = step % period;
  return (spec.frame0 || 0) + (s < n ? s : period - s);
}
