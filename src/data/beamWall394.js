// ===========================================================================
// ROUND 394 -- THE R392 DROP'S BEAMS, WALLS AND PROJECTILES: WHAT EACH ABILITY DRAWS.
//
//   "Beams -- parts: each material has _start (32x48), _mid (64x48, seamless, loops) and _end (32x48). Draw start, then
//    repeat mid to length, then end, all white and cut per element. Replaces the stretched 222 px sheet (beam-3part)."
//   "Walls -- segments: one tileable still per wall. Repeat it along the barrier line and raise it out of the ground in
//    code over about 0.3 s, with the existing puff along the base."
//   "Projectiles -- stills flying right or seen flat. The engine rotates them along the flight and spins the tumbling
//    ones ... draw them at the target size with nearest-neighbour scaling."
//
// Pure data and pure functions (the scene half is src/scenes/beamWall394Mixin.js), so the suite
// (tools/tests/test_round394_beamwall.cjs) measures it in node. Which sheet entries are which: beamWall394Entries.js
// (generated from the sheets' `needs`, `fx` and `damage`). The art itself: beamWall394Art.js (tools/make_beamwall_r394.py).
//
// A beam's MATERIAL comes, in order, from: the entry's own row where one gap covers several looks (BEAM_ENTRY), its gap
// id (BEAM_GAP), the words of its name (BEAM_WORDS), its fx hint (BEAM_FX), and last its damage type (BEAM_TYPE) -- so
// every ranged_beam entry, and every beam the generator makes, draws one; none is left on the old stretched sheet.
// Its CUT is the ability's damage type (damageFx.js) unless the row names a tint ("barren-line (tinted grey-brown)",
// "equinox (tint the two strands gold and indigo)").
// ===========================================================================
import { BW394_BEAMS, BW394_WALLS, BW394_FLIGHTS, BW394_NAMES } from './beamWall394Entries.js';
import { BEAM394, BEAMFX394, WALL394, WALLANIM394, OVERLAY394, STRIP394, PROJ394, PROJANIM394, CUTS394 } from './beamWall394Art.js';
import { damageFxFor } from './damageFx.js';

export const BEAM_MATERIALS = Object.keys(BEAM394);

// ------------------------------------------------------------------------------------------------------- beams --
// A row: { m: material, c: cut ('type' = the damage type, else a tint or a braid pair), thin / wide (a thickness
// multiplier), rev (the flow plays backwards: a draw, a drain), stream (projectile stills repeated along the beam),
// splash (the per-tick splash's sheet: 'convert' for a transmuting beam), swarm (speckswarm laid over it) }
const T = (m, o = {}) => ({ m, ...o });
export const BEAM_GAP = {
  // ray -- "dawn, solstice, solar-flare, gilt, ripening, ichor, hellfire, stare, brow, glory, laser and plasma-torch
  // (scaled thin), tractor (scaled wide), holy-fire, mirror ray, pulsar beam, crepuscular"
  'dawn-beam-fx': T('ray'), 'dawn-ray-fx': T('ray'), 'solstice-beam-fx': T('ray'), 'solar-flare-beam-fx': T('ray', { wide: 1.2 }),
  'gilt-beam-fx': T('ray', { c: 'gold' }), 'ripening-ray-fx': T('ray'), 'ichor-beam-fx': T('ray', { c: 'gold' }),
  'hellfire-beam-fx': T('ray'), 'petrify-fx': T('ray', { c: 'stone', thin: 0.7 }), 'brow-beam-art': T('ray'),
  'laser-beam-fx': T('ray', { thin: 0.45 }), 'laser-fx': T('ray', { thin: 0.45 }), 'plasma-torch-fx': T('ray', { thin: 0.5 }),
  'tractor-beam-fx': T('ray', { wide: 1.7 }), 'holy-fire-fx': T('ray'), 'broken-reflection-art': T('ray', { c: 'silver' }),
  'pulsar-art': T('ray', { thin: 0.55 }), 'crepuscular-rays-fx': T('ray', { wide: 1.3 }), 'bleaching-ray-fx': T('ray'),
  'dew-glare-beam-fx': T('ray'), 'midwinter-ray-fx': T('ray'), 'orbital-ray-fx': T('ray', { wide: 1.6 }),
  'lantern-beam-fx': T('ray'), 'follow-spot-fx': T('ray', { wide: 1.5 }), 'predator-eyes-fx': T('ray', { thin: 0.5 }),
  'snake-hair-fx': T('liquid'), 'raised-hand-fx': T('ray'), 'gilded-hold-overlay': T('ray', { c: 'gold' }),
  'long-shadow-fx': T('ray', { c: 'pitch', wide: 1.2 }), 'roc-shadow-fx': T('gas', { c: 'pitch', wide: 1.3 }),
  'shadow-line-fx': T('ray', { c: 'pitch', thin: 0.6 }), 'pyre-fx': T('ray'),
  // braid -- "rose-gold, prism-ray, hymn, equinox (gold and indigo), scales (gold and black), bond"
  'rose-gold-beam-fx': T('braid', { c: 'rosegold' }), 'prism-ray-fx': T('braid', { c: 'prism' }), 'prism-split-fx': T('braid', { c: 'prism' }),
  'hymn-beam-fx': T('braid', { c: 'hymn' }), 'equinox-line-fx': T('braid', { c: 'equinox' }), 'scales-fx': T('braid', { c: 'scales' }),
  'bond-beam-fx': T('braid', { c: 'bond' }),
  // the lines the brief draws thin ("thread, sympathy-cord, soul-tether, want, bond, measure, razor-wire, string, drawn
  // line, the web strand"): the braid's two strands, scaled to a cord
  'thread-beam-fx': T('braid', { thin: 0.45 }), 'sympathy-cord-beam': T('braid', { thin: 0.45 }), 'soul-tether-beam-fx': T('braid', { thin: 0.5 }),
  'want-beam-fx': T('braid', { thin: 0.45 }), 'measure-beam-fx': T('braid', { thin: 0.4, c: 'gold' }), 'razor-wire-fx': T('braid', { thin: 0.4, c: 'silver' }),
  'string-fx': T('braid', { thin: 0.35 }), 'drawn-line-fx': T('braid', { thin: 0.35 }), 'thread-of-maybe-fx': T('braid', { thin: 0.45 }),
  'silk-stream-fx': T('braid', { thin: 0.5, c: 'silver' }), 'web-fx': T('braid', { thin: 0.4, c: 'silver' }),
  'drain-tether-fx': T('liquid', { thin: 0.6, rev: true }), 'line-art': T('earth', { c: 'violet', thin: 0.4 }),
  'fuse-line-fx': T('earth', { c: 'pitch', thin: 0.45 }),
  // liquid -- "torrent x2, current, honey, pour, tonic, molten-pour, grave-gush, pitch-jet, venom-jet, quicksilver,
  // acid-stream, spit stream, crimson-draw (play reversed), blood"
  'torrent-beam-fx': T('liquid'), 'levee-torrent-fx': T('liquid', { c: 'mud' }), 'current-beam-fx': T('liquid'),
  'honey-beam-fx': T('liquid', { c: 'honey' }), 'tonic-jet-fx': T('liquid'), 'molten-pour-beam': T('liquid', { c: 'fire' }),
  'grave-gush-beam-fx': T('liquid'), 'pitch-jet-fx': T('liquid', { c: 'pitch' }), 'pitch-fx': T('liquid', { c: 'pitch' }),
  'venom-jet-fx': T('liquid'), 'quicksilver-thread-fx': T('liquid', { c: 'silver', thin: 0.55 }), 'acid-stream-fx': T('liquid', { c: 'poison' }),
  'crimson-draw-fx': T('liquid', { c: 'blood', rev: true }), 'blood-beam': T('liquid', { c: 'blood' }),
  // gas -- "chaff, pollen, sulphur, grit-spew, pyroclastic, wind, storm jet and monsoon, blizzard, steam-lance, ink,
  // swarm-stream (with speckswarm over it), contrail"
  'chaff-beam-fx': T('gas'), 'pollen-stream-fx': T('gas', { c: 'gold' }), 'sulphur-jet-beam-fx': T('gas', { c: 'poison' }),
  'grit-spew-beam-fx': T('gas', { c: 'sand' }), 'grit-jet-fx': T('gas', { c: 'sand' }), 'pyroclastic-flow-fx': T('gas', { c: 'fire', wide: 1.2 }),
  'wind-beam-fx': T('gas'), 'storm-beam-fx': null, 'blizzard-fx': T('gas', { c: 'ice' }), 'steam-fx': T('gas', { c: 'native' }),
  'ink-fx': T('gas', { c: 'ink' }), 'swarm-stream-fx': T('gas', { c: 'pitch', swarm: true }), 'ant-column-fx': T('gas', { c: 'pitch', swarm: true, thin: 0.6 }),
  'hoarfrost-stream-fx': T('gas', { c: 'frost' }), 'marsh-gas-fx': T('gas', { c: 'bog' }), 'haboob-fx': T('gas', { c: 'sand', wide: 1.3 }),
  'wingbeat-gust-fx': T('gas', { c: 'wind' }), 'thermal-fx': T('gas', { c: 'native' }), 'gyre-hold-fx': T('gas'), 'hail-fx': T('gas', { c: 'ice' }),
  // sound -- "roar x2, unison, sound x2, standing-wave, shriek, bellow, tocsin, trumpet, eyrie shriek, patter, engine-drone"
  'roar-beam-fx': T('sound'), 'roar-fx': T('sound'), 'unison-beam-fx': T('sound'), 'sound-beam-fx': T('sound'),
  'standing-wave-beam': T('sound'), 'shriek-fx': T('sound'), 'bellow-fx': T('sound', { wide: 1.2 }), 'trumpet-roar-fx': T('sound', { wide: 1.2 }),
  'call-fx': T('sound', { wide: 1.2 }), 'bell-fx': T('sound'), 'bell-ring-fx': T('sound'), 'hum-fx': T('sound', { thin: 0.7 }),
  'patter-stream-fx': T('sound'), 'engine-drone-fx': T('sound'),
  // lightning -- "forked, thunderhead-discharge, thunderhead-lance, welding-arc x2, gale, arc beam"
  'forked-beam-fx': T('lightning'), 'thunderhead-discharge-fx': T('lightning'), 'thunderhead-lance-fx': T('lightning', { thin: 0.7 }),
  'welding-arc-beam': T('lightning', { thin: 0.6 }), 'welding-arc-fx': T('lightning', { thin: 0.6 }), 'arc-fx': T('lightning'),
  'emp-fx': T('lightning'), 'haywire-current-fx': T('lightning'), 'fence-wall-art': T('lightning', { thin: 0.5 }), 'sparks-fx': T('lightning'),
  // vine -- "creeper, bindweed, root-run, root-line, root-furrow, bramble-runner"
  'creeper-beam-fx': T('vine'), 'bindweed-beam-fx': T('vine'), 'root-run-fx': T('vine'), 'root-line-fx': T('vine'),
  'root-furrow-fx': T('vine'), 'bramble-runner-fx': T('vine'), 'tentacle-fx': T('vine', { c: 'water' }),
  // earth -- "churn, stampede, tread-furrow, trench-collapse, barren-line (tinted grey-brown)"
  'churn-beam-fx': T('earth', { c: 'mud' }), 'stampede-beam-fx': T('earth'), 'cavalry-fx': T('earth'), 'tread-furrow-fx': T('earth'),
  'trench-collapse-fx': T('earth'), 'barren-line-fx': T('earth', { c: 'stone' }), 'furrow-fx': T('earth', { c: 'mud' }),
  'horn-row-fx': T('earth'), 'breach-fx': T('tear'),
  // glyph -- "script-line, scroll, ward-ray, stopped (clock faces), sutra line, ledger line"
  'scroll-beam-fx': T('glyph'), 'ward-ray-fx': T('glyph'), 'ward-beam-fx': null, 'stopped-beam-fx': T('glyph'), 'ledger-fx': T('glyph', { c: 'gold' }),
  'brand-fx': T('glyph'), 'rewind-fx': T('glyph', { rev: true }), 'return-fx': T('glyph', { rev: true }), 'ageing-fx': T('glyph'),
  // tear -- "rift-seam, the rift beam"
  'rift-seam-fx': T('tear'), 'rift-beam-fx': T('tear'), 'rift-fx': T('tear'), 'wormhole-fx': T('tear'), 'entropy-beam-fx': T('tear'),
  'gravity-fx': T('tear', { wide: 1.2 }),
  'still-surface-beam-art': T('water_surface'),
  'course-beam-art': T('stones'), 'procession-fx': T('stones'), 'shield-wall-art': T('stones'),
  // rainbow (in colour) -- "colour-beam, spectrum, prism-beam, aurora beam"; scarves (in colour) -- "endless-scarves"
  'colour-beam-sheet': T('rainbow'), 'spectrum-beam-fx': T('rainbow'), 'prism-beam-fx': T('rainbow'), 'aurora-fx': T('rainbow', { wide: 1.2 }),
  'endless-scarves-fx': T('scarves'),
  // tracer streams: "the projectile stills repeated along the beam" -- over a thin ray in the damage type
  'tracer-stream-fx': T('ray', { thin: 0.35, stream: 'tracer' }), 'tracer-stream-beam': T('ray', { thin: 0.35, stream: 'tracer' }),
  'arrow-stream-fx': T('ray', { thin: 0.3, stream: 'broadhead' }), 'enfilade-fx': T('ray', { thin: 0.3, stream: 'broadhead' }),
  'quarrel-stream-fx': T('ray', { thin: 0.3, stream: 'bodkin' }), 'rivet-stream-fx': T('ray', { thin: 0.3, stream: 'rivet' }),
  'blade-stream-fx': T('ray', { thin: 0.3, stream: 'dirk' }), 'quill-fx': T('ray', { thin: 0.3 }), 'quill-flight': T('ray', { thin: 0.3 }),
  // the multi-look rows answer per entry (BEAM_ENTRY) or by the entry's words and type
  'dragon-beam-art': null, 'chimera-beam-art': null, 'doom-beam-art': null, 'behemoth-beam-art': null, 'ministration-beam-art': null,
  'transmute-beam-art': T('ray', { splash: 'convert' }), 'lotus-beam-fx': null,
};
/** The rows one gap answers in several looks, per entry. */
export const BEAM_ENTRY = {
  'Lotus|pond-jet': T('liquid'), 'Lotus|held-bell-note': T('sound', { c: 'gold', thin: 0.6 }), 'Lotus|petals-on-the-current': T('liquid'),
  'Lotus|lotus-root-runner': T('vine'),
  'Dragon|wyrmfire-lance': T('ray'), 'Dragon|mana-ray': T('ray'), 'Dragon|spellfire-torrent': T('gas', { c: 'fire' }), 'Dragon|unbroken-bellow': T('sound', { wide: 1.2 }),
  'Chimera|horned-heads-flame': T('gas', { c: 'fire' }), 'Chimera|hissing-stream': T('liquid'), 'Chimera|unending-roar': T('sound'),
  'Chimera|mingled-torrent': T('braid', { c: 'fire' }),
  'Doom|shadow-cast-by-the-end': T('tear'), 'Doom|sands-running-out': T('gas', { c: 'sand', rev: true }), 'Doom|brimstone-torrent': T('gas', { c: 'fire' }),
  'Doom|the-pointing-finger': T('ray', { thin: 0.5 }),
  'Behemoth|bedrock-lance': T('earth', { thin: 0.7 }), 'Behemoth|subsonic-rumble': T('sound', { wide: 1.2 }), 'Behemoth|grinding-fault': T('earth'),
  'Behemoth|disgorged-river': T('liquid', { c: 'mud' }),
  'Ministration|purifying-ray': T('ray'), 'Ministration|triage-glare': T('ray'), 'Ministration|vital-stream': T('liquid', { rev: true }),
  'Ministration|cautery-line': T('ray', { thin: 0.5 }),
  'Transfiguration|line-of-petrification': T('ray', { c: 'stone', splash: 'convert' }), 'Transfiguration|transmuting-ray': T('ray', { splash: 'convert' }),
  'Transfiguration|gold-leaf-beam': T('ray', { c: 'gold', splash: 'convert' }),
  'Guardian|lantern-held-high': T('ray'), 'Guardian|null-seam': T('tear'), 'Guardian|the-oath-spoken': T('glyph', { c: 'gold' }),
  'Guardian|pouring-hours': T('gas', { c: 'sand' }),
  'Thunderbird|gale-torrent': T('gas', { c: 'wind' }), 'Thunderbird|charged-torrent': T('lightning'), 'Ziz|river-of-the-upper-air': T('gas', { c: 'wind' }),
  'Ziz|standing-thunderstroke': T('lightning'), 'Ziz|sideways-monsoon': T('gas', { c: 'water' }), 'Ziz|column-of-high-frost': T('gas', { c: 'frost', thin: 0.7 }),
};
/** Words in a beam's name that say what it is made of (for a beam whose gap does not). First match wins. */
export const BEAM_WORDS = [
  [/\b(?:roar|bellow|scream|screech|shriek|howl|keen(?:ing)?|skirl|drone|hum(?:ming)?|chant|hymn|song|chorus|peal|toll|tocsin|clarion|horn-?call|trumpet|note|chord|voice|cry|wail|call|eyrie|siren|thrum|rumble|resonan\w*|sonic)\b/i, 'sound'],
  [/\b(?:lightning|thunder\w*|arc|spark\w*|charged|current of sparks|bolt|voltage|static|galvanic)\b/i, 'lightning'],
  [/\b(?:root\w*|vine\w*|creeper|bramble|briar|thorn\w*|tendril\w*|ivy|bindweed|runner|creeping)\b/i, 'vine'],
  [/\b(?:rift|tear|seam|rent|void|wound in|crack in the world|edge)\b/i, 'tear'],
  [/\b(?:script|glyph\w*|rune\w*|sigil\w*|scroll|writ|ledger|sutra|verse|oath|word|scripture|clock|hours)\b/i, 'glyph'],
  [/\b(?:gale|wind\w*|gust\w*|breath|smoke|steam|fog|mist|sleet|blizzard|monsoon|squall|sand\w*|dust|grit|ash|spore\w*|pollen|cloud|vapou?r|miasma|plume)\b/i, 'gas'],
  [/\b(?:torrent|stream|jet|river|current|gush|spew|spittle|pour\w*|flood|tide|rip|spit|deluge|cascade|flow|ichor|blood|bile|venom|draught)\b/i, 'liquid'],
  [/\b(?:furrow|trench|quake|fault|stampede|churn\w*|landslide|rockslide|avalanche|earth\w*|stone\w*|bedrock|tremor)\b/i, 'earth'],
  [/\b(?:rainbow|spectrum|prism\w*|aurora|colours?)\b/i, 'rainbow'],
  [/\b(?:ray|beam|lance|glare|gaze|stare|light|shine|radiance|sunbeam|laser|searchlight|lantern|flare|finger)\b/i, 'ray'],
];
/** The beam sheet a sheet's `fx` names (a drain flows home; a flamethrower or a cone is a jet of gas). */
export const BEAM_FX = {
  drainbeam: T('liquid', { rev: true, thin: 0.8 }), flamethrower: T('gas'), beamcone: T('gas', { wide: 1.25 }), cracks: T('earth'),
  needlerain: T('stones'),
};
/** What a damage type is made of, for a beam that says nothing else. */
export const BEAM_TYPE = {
  fire: 'ray', radiant: 'ray', light: 'ray', transcendent: 'ray', life: 'ray', arcane: 'ray', death: 'ray', dark: 'ray', shadow: 'ray',
  resonating: 'sound', disruptive: 'lightning', lightning: 'lightning',
  water: 'liquid', poison: 'liquid', blood: 'liquid',
  wind: 'gas', sand: 'gas', frost: 'gas', ice: 'gas', necrotic: 'gas',
  earth: 'earth', rock: 'earth', blunt: 'stones',
  plant: 'vine', nature: 'vine',
  dimension: 'tear', slashing: 'tear', curse: 'ray',
  piercing: 'ray', physical: 'ray',
};
const GASSY = new Set(['fire', 'wind', 'frost', 'ice', 'sand', 'radiant', 'light', 'lightning', 'slashing', 'piercing']);
const THIN_FX = { beamthin: 0.6, beammid: 1, beamcone: 1, drainbeam: 1, flamethrower: 1 };

function entryKey(a) {
  if (!a || !a.confSheet) return null;
  let key = a.confEntry ? `${a.confSheet}|${a.confEntry}` : null;
  if (key && !BW394_BEAMS[key] && !BW394_WALLS[key] && !BW394_FLIGHTS[key]) key = (a.name && BW394_NAMES[a.name]) || key;
  return key;
}
export { entryKey as bw394EntryKey };

/**
 * The material plan for a beam ability: { m, cut, thin, rev, stream, swarm, splash, why, gap }. Never null for a beam:
 * the damage type always answers.
 */
export function beamMaterialFor(ability) {
  const a = ability || {};
  const key = entryKey(a);
  const row = key && BW394_BEAMS[key];
  const dtype = damageFxFor(a);
  let pick = null, why = null, gap = null;
  if (key && BEAM_ENTRY[key]) { pick = BEAM_ENTRY[key]; why = 'entry'; }
  if (!pick && row) {
    for (const g of row.n) { if (BEAM_GAP[g]) { pick = BEAM_GAP[g]; why = 'gap'; gap = g; break; } }
  }
  const fx = (row && row.fx) || a.fxHint || a.beamFx || null;
  if (!pick) {
    const text = a.name || '';
    for (const [re, m] of BEAM_WORDS) if (re.test(text)) { pick = T(m); why = 'words'; break; }
    // a "stream" or "jet" of fire, wind, frost or light is a jet of gas, not water; a flamethrower sheet says so too
    if (pick && pick.m === 'liquid' && (GASSY.has(dtype) || fx === 'flamethrower')) pick = T('gas');
  }
  // the sheet's beam family: a drain flows home; a flamethrower or a cone is a jet of gas -- unless the damage type has
  // a material of its own (a cone of lightning is lightning, a cone of sound is sound)
  if (!pick && fx && BEAM_FX[fx]) {
    const own = BEAM_TYPE[dtype];
    pick = (fx === 'beamcone' || fx === 'flamethrower') && own && own !== 'ray' && own !== 'stones' ? T(own, { wide: BEAM_FX[fx].wide }) : BEAM_FX[fx];
    why = 'fx';
  }
  if (!pick) { pick = T(BEAM_TYPE[dtype] || 'ray'); why = 'type'; }
  const info = BEAM394[pick.m];
  let cut = pick.c && pick.c !== 'type' ? pick.c : dtype;
  if (!info.cuts.includes(cut)) cut = info.cuts.includes(dtype) ? dtype : info.cuts[0];
  // a thin sheet hint keeps its weight on the new art; a row's own `thin` / `wide` wins
  const weight = pick.thin || pick.wide || (fx && THIN_FX[fx]) || 1;
  return { m: pick.m, cut, thin: weight, rev: !!pick.rev, stream: pick.stream || null, swarm: !!pick.swarm,
    splash: pick.splash || 'splash', why, gap, key: key || null, colour: info.colour };
}

/** The texture key and url of a beam material's sheet in a cut, and of a shared sheet (flare / splash / convert). */
export function beamSheetKey(m, cut) { return `bw394_beam_${m}_${cut}`; }
export function beamFxKey(name, cut) { return `bw394_${name}_${cut}`; }
export function beamSheet(m, cut) {
  const b = BEAM394[m];
  if (!b || !b.cuts.includes(cut)) return null;
  return { key: beamSheetKey(m, cut), url: `./public/assets/beamwall/beams/${m}_${cut}.png`, cell: b.cell, cellH: b.cellH };
}
// the flare and the splash of a two-strand braid take its warmer strand's cut
const BRAID_FX = { equinox: 'radiant', scales: 'radiant', rosegold: 'life', hymn: 'radiant', prism: 'native', bond: 'life' };
export function beamFxSheet(name, cut) {
  const s = BEAMFX394[name];
  if (s && !CUTS394.includes(cut)) cut = BRAID_FX[cut] || 'native';
  if (!s || !CUTS394.includes(cut)) return null;
  return { key: beamFxKey(name, cut), url: `./public/assets/beamwall/beams/${name}_${cut}.png`, cell: s.cell, cellH: s.cellH };
}

/**
 * How a beam of screen length `len` is laid: the start, `n` mids (the last cut to `lastW` px) and the end, in the art's
 * own pixels from the caster's anchor. { startX, midX0, n, lastW, endX } (x of each piece's left edge, start anchored
 * on the caster, end anchored on the far point).
 */
export function beamLayout(m, len) {
  const b = BEAM394[m];
  const s = b.parts.start, mid = b.parts.mid, e = b.parts.end;
  const startX = s ? -s.ax : 0;
  const midX0 = s ? startX + s.w : 0;
  const endX = e ? len - e.ax : len;
  const span = Math.max(0, endX - midX0);
  const n = Math.max(1, Math.ceil(span / mid.w));
  const lastW = Math.max(1, Math.round(span - (n - 1) * mid.w)) || mid.w;
  return { startX, midX0, n, lastW: Math.min(mid.w, lastW), endX };
}

// ------------------------------------------------------------------------------------------------------- walls --
// A wall: { seg (walls/segments), tint, anim (walls/animated: flame, cloud, whirl, arc_fence, candles), ac (its cut:
// 'type' or a cut), plane (the energy plane, tinted `pt`), overlay (plane_overlays), edge (a burning top edge, cut),
// strip (ground_strips, laid flat, tinted `st`), over (a second anim laid over a segment: the fire on rose walls),
// disc (the eclipse disc as a pull's body), burst (a projectiles/animated burst played as it is laid), drop (the
// portcullis-drop one-shot key), low (a low wall: height multiplier) }
const S = (seg, o = {}) => ({ seg, ...o });
const A = (anim, ac = 'type', o = {}) => ({ anim, ac, ...o });
const P = (pt, overlay = null, o = {}) => ({ plane: true, pt, overlay, ...o });
const L = (strip, o = {}) => ({ strip, ...o });
export const PORTCULLIS_KEY = 'fx394_portcullis_drop';   // effects/oneoff/portcullis_drop, the one-off agent's sheet
export const WALL_GAP = {
  'admirer-wall-art': S('admirers'), 'antler-wall-art': S('antlers'), 'barricade-wall-art': S('steel_bulkhead'),
  'blood-wall-art': S('blood_rampart'), 'book-wall-art': S('books'), 'ledger-wall-art': S('books'),
  'boundary-wall-art': S('menhirs'), 'briar-wall-art': S('hedge'), 'bridge-wall-art': S('rubble'),
  'caltrop-scatter-fx': L('caltrops', { burst: 'caltrop_scatter' }), 'caltrop-sprite': L('caltrops'),
  'cell-wall-art': S('cell_bars'), 'chaos-wall-art': S('chaos_blocks'),
  'cloud-wall-art': A('cloud', 'ash'), 'code-wall-art': P(0x4cff7a, 'code'), 'coil-wall-art': S('serpent_heads'),
  'cover-wall-art': S('overturned_table'), 'cutout-wall-art': S('mannequins'), 'dawn-dusk-fx': P(0xffc86a, null, { edge: 'radiant' }),
  'eclipse-wall-art': P(0x0a0610, null, { edge: 'fire', alpha: 0.82, solid: true }), 'effigy-wall-art': S('straw_figures'),
  'feather-wall-art': S('feathers'), 'fence-wall-art': S('fence_wire', { over: 'arc_fence', oc: 'lightning' }),
  'firmament-wall-art': P(0x1a2a78, 'stars', { edge: null, alpha: 0.85, ot: 0xfff4c4 }), 'flame-wall-art': A('flame', 'fire'),
  'force-wall-art': P(0x8fe8ff, 'hex'), 'forge-wall-art': S('anvils'), 'fortress-wall-art': S('fortress_curtain'),
  'furrow-fx': S('trench'), 'gate-wall-art': S('closed_doors'), 'gear-wall-art': S('gears'),
  'gel-wall-art': P(0x9cf0a8, null, { alpha: 0.6 }), 'gold-wall-art': S('gold_bars'), 'haboob-fx': A('cloud', 'sand'),
  'hardlight-wall-art': P(0x6fb8ff, 'hex'), 'head-wall-art': S('serpent_heads'), 'hedge-wall-art': S('hedge'),
  'hedgerow-art': S('hedge'), 'hoard-wall-art': S('gold_hoard'), 'horizon-wall-fx': P(0xffcf7a, null, { edge: 'life' }),
  'ice-wall-art': S('glacier'), 'idol-wall-art': S('idols'), 'illusion-wall-art': S('painted_flat'), 'backdrop-wall-art': S('painted_flat'),
  'laser-grid-fx': A('arc_fence', 'blood'), 'lens-wall-art': S('lenses'), 'lily-pad-wall-art': S('lily_reeds'),
  'line-art': L('red_ink', { st: 0x5a2a8a }), 'masonry-wall-art': S('masonry'), 'maze-wall-art': S('maze'),
  'mirage-wall-art': P(0xffe2a8, 'sine', { alpha: 0.4, ot: 0xffffff, oa: 0.35 }), 'nest-wall-art': S('nest_heap'), 'obsidian-wall-art': S('basalt'),
  'ossuary-wall-art': S('ossuary'), 'palisade-art': S('palisade'), 'palm-wall-art': S('palm_palisade'),
  'pavise-wall-art': S('pavises'), 'pike-wall-art': S('pikes'), 'plume-wall-art': S('feathers', { tint: 0xff9a4a, over: 'flame', oc: 'fire' }),
  'prism-wall-art': S('prisms'), 'quarantine-line-art': L('chalk_glyphs'), 'quill-wall-art': S('quills'),
  'red-ink-art': L('red_ink'), 'rib-wall-art': S('whale_ribs'), 'ridge-wall-art': S('ridge'),
  'rose-wall-art': S('black_roses', { over: 'flame', oc: 'violet', ol: 0.8 }), 'sail-wall-art': S('sail'), 'salt-line-art': L('salt', { st: 0xfff2c0 }),
  'salt-pillar-wall-art': S('salt_pillars'), 'scarecrow-row-art': S('straw_figures'), 'seawall-art': S('wreck_hull'),
  'shadow-wall-art': P(0x2a1240, null, { edge: 'fire', alpha: 0.85, solid: true }), 'shield-wall-art': S('shield_wall'),
  'silk-wall-art': S('woven_cloth', { tint: 0xf4f0ff }), 'sound-wall-art': P(0xb07ae8, 'sine'),
  'stake-line-art': L('stakes'), 'stake-wall-art': S('palisade'), 'standing-wave-fx': P(0x4fd6c4, 'sine'),
  'statue-wall-art': S('statues'), 'stopped-line-art': L('frozen_droplets'), 'storm-wall-art': A('cloud', 'ash'),
  'sutra-script-art': L('chalk_glyphs', { st: 0xffd76a }), 'swarm-wall-art': S('comb'), 'tomb-wall-art': S('tomb'),
  'urn-wall-art': S('urns'), 'vigil-candle-art': A('candles', 'radiant'), 'wakened-wall-art': S('flagstones'),
  'ward-cord-wall-art': S('ward_cord'), 'ward-wall-art': P(0xffd76a, 'sigils'), 'water-wall-art': P(0x4f9cff, 'sine', { alpha: 0.55, ot: 0xd0ecff }),
  'weave-wall-art': S('woven_cloth'), 'web-wall-art': S('web'), 'whirling-wall-art': A('whirl', 'native'),
  'wing-wall-art': S('feathers'), 'wrath-wall-art': S('palisade', { tint: 0x5a3028, over: 'flame', oc: 'blood' }),
  'wreck-wall-art': S('wreck_hull'), 'breastwork-wall-art': S('breastwork'), 'eclipse-disc-art': S('masonry', { disc: true }),
};
/** Per entry, where a gap draws several walls (and the tints the brief names: "feathers: gold for Garuda, brown for Roc,
 *  burning for plume, white for wing"). */
export const WALL_ENTRY = {
  'Action|flipped-car': S('wreck_wagon'), 'Alchemy|salt-line': L('salt'), 'Ambush|web-curtain': S('web'),
  'Animate|row-of-standing-statues': S('statues'), 'Anzu|haboob-front': A('cloud', 'sand'),
  'Arsenal|palisade-of-spare-arms': S('pikes'), 'Avatar|gilded-rampart': S('gilded_wall'),
  'Battlefield|trench-line': S('trench', { low: 0.7 }), 'Battlefield|earthwork-rampart': S('ridge'), 'Battlefield|wall-of-pavises': S('pavises'),
  'Boundary|boundary-ditch': S('trench', { low: 0.7 }), 'Boundary|standing-hedge': S('hedge'),
  'Bounty|hedgerow': S('hedge_flowering'), 'Bounty|stacked-sheaves': S('hedge_flowering'),
  'Cycle|hedgerow': S('hedge_flowering'), 'Cycle|bramble-hedge': S('hedge_flowering'), 'Cycle|solstice-henge': S('menhirs'),
  'Cycle|dawnline': P(0xffc86a, null, { edge: 'radiant', low: 0.6 }),
  'Eclipse|rim-of-glare': P(0xffffff, null, { alpha: 0.75, add: true, low: 0.5 }),
  'Eclipse|pull-of-the-disc': S('masonry', { disc: true }),
  'Edifice|stake-palisade': S('palisade'), 'Edifice|rubble-line': S('rubble'), 'Edifice|colonnade': S('statues'),
  'Edifice|portcullis-drop': S('cell_bars', { drop: true }),
  'Effigy|row-of-burning-scarecrows': S('straw_figures', { over: 'flame', oc: 'fire', ol: 0.8 }),
  'Fey|elf-mound-wall': S('fairy_mound'),
  'Forge|rolled-plate-wall': S('steel_bulkhead'), 'Fortress|stake-palisade': S('palisade'), 'Fortress|rampart': S('masonry'),
  'Garuda|rampart-of-pinions': S('feathers', { tint: 0xffcf4a }), 'Roc|great-feathers-mantled': S('feathers', { tint: 0x9a6a3a }),
  'Griffin|feathered-rampart': S('feathers'), 'Griffin|crag-wall': S('ridge'),
  'Gate|portcullis-of-gates': S('cell_bars', { drop: true }),
  'Guardian|dune-rampart': S('ridge', { tint: 0xe8c88a }), 'Guardian|null-partition': P(0x3a2a5a, 'sigils', { ot: 0xb388ff, alpha: 0.75 }),
  'Harpy|feather-rampart': S('nest_heap'), 'Hydra|bog-embankment': S('lily_reeds'),
  'Dragon|mantled-pinions': S('feathers', { tint: 0xd8a040 }),
  'Karmic|line-of-script': L('red_ink', { st: 0xffd76a }),
  'Ministration|curtained-bed': S('woven_cloth', { tint: 0xf8f8ff }), 'Ministration|linen-screens': S('woven_cloth', { tint: 0xf8f8ff }),
  'Minotaur|trench-of-the-maze': S('trench', { low: 0.7 }),
  'Monolith|menhir-row': S('menhirs'), 'Monolith|wall-of-dressed-stone': S('masonry'), 'Monolith|dolmen': S('menhirs'),
  'Ocean|seawall': S('masonry', { tint: 0xb8c8d0 }), 'Onslaught|pavise-line': S('pavises'),
  'Phoenix|ash-rampart': S('feathers', { tint: 0x8a8580 }), 'Prosperity|golden-railing': S('gilded_wall', { low: 0.7 }),
  'Refracting|curtain-of-colour': S('prisms'), 'Soaring|hull-planks-raised': S('wreck_hull'),
  'Sovereign|palace-walls': S('gilded_wall'), 'Stellar|orbiting-bulwark': P(0x1a2a78, 'stars', { alpha: 0.85, ot: 0xfff4c4 }),
  'Time|wall-of-stopped-seconds': P(0xcfe8ff, null, { alpha: 0.35, strip: 'frozen_droplets' }),
  'Tranquil|frozen-weir': S('glacier'), 'Unity|levelled-pikes': S('pikes'), 'Vortex|waterspout-curtain': A('whirl', 'water'),
  'Wendigo|frozen-treeline': S('glacier'), 'Wendigo|snowbank': S('glacier', { low: 0.8 }), 'Ziz|feathered-palisade': S('feathers'),
  'Juggernaut|overturned-wagon': S('wreck_wagon'), 'Juggernaut|laager': S('wreck_wagon'),
  'Thunderbird|gale-wall': A('cloud', 'wind'), 'Storm|gale-curtain': A('cloud', 'wind'), 'Ziz|standing-squall': A('cloud', 'ash'),
  // barriers whose own row is another kind of art, but which are walls the drop draws ("holy fire", "arc-fx fence strip",
  // the web segment, the quill palisade, the salt line, the plane's mirage / water / shadow uses)
  'Wrath|pale-flame-wall': A('flame', 'radiant'), 'Roc|quill-palisade': S('quills'), 'Predatory|wall-of-webbing': S('web'),
  'Predatory|strung-webbing': S('web', { low: 0.8 }), 'Magitech|live-sigil-fence': A('arc_fence', 'arcane'),
  'Magitech|laser-tripwire-grid': A('arc_fence', 'blood'), 'Forge|spark-curtain': A('arc_fence', 'fire'),
  'Transfiguration|petrified-rampart': S('statues', { tint: 0xc8c4bc }), 'Desolate|salt-line': L('salt'),
  'Boundary|the-drawn-line': L('chalk_glyphs'), 'Phantasmagoria|wall-of-fog': A('cloud', 'native'), 'Kraken|ink-curtain': A('cloud', 'ink'),
  'Leviathan|wall-of-swell': P(0x2f86ff, 'sine', { alpha: 0.6, ot: 0xd0ecff }), 'Leviathan|standing-wave': P(0x2f86ff, 'sine', { alpha: 0.6, ot: 0xd0ecff }),
  'Nemesis|row-of-broken-reflections': P(0xdfe8ff, null, { alpha: 0.5, add: true }),
};
/** The wall art for a barrier ability, or null (the round-388 sheet wall stays). */
export function wallArtFor394(ability) {
  const key = entryKey(ability);
  if (!key) return null;
  if (WALL_ENTRY[key]) return { ...WALL_ENTRY[key], key, why: 'entry' };
  for (const g of (BW394_WALLS[key] || [])) if (WALL_GAP[g]) return { ...WALL_GAP[g], key, gap: g, why: 'gap' };
  return null;
}
export function wallSegKey(name) { return `bw394_seg_${name}`; }
export function wallAnimKey(name, cut) { return `bw394_wall_${name}_${cut}`; }
export function wallAnimSheet(name, cut) {
  const w = WALLANIM394[name];
  if (!w) return null;
  const c = w.cuts.includes(cut) ? cut : w.cuts[0];
  return { key: wallAnimKey(name, c), url: `./public/assets/beamwall/walls/anim/${name}_${c}.png`, cell: w.cell, cellH: w.cellH, cut: c };
}
/** Every sheet one wall plan needs: [{ key, url, cell?, cellH?, image? }]. `dtype` answers an anim cut of 'type'. */
export function wallSheetsFor(plan, dtype) {
  const out = [];
  if (!plan) return out;
  if (plan.seg) out.push({ key: wallSegKey(plan.seg), url: `./public/assets/beamwall/walls/seg/${plan.seg}.png`, image: true });
  const cut = (c) => (c === 'type' || !c ? dtype : c);
  if (plan.anim) out.push(wallAnimSheet(plan.anim, cut(plan.ac)));
  if (plan.over) out.push(wallAnimSheet(plan.over, cut(plan.oc)));
  if (plan.plane) out.push(wallAnimSheet('plane', 'native'));
  if (plan.edge) out.push(wallAnimSheet('flame', plan.edge));
  if (plan.overlay) out.push({ key: `bw394_ov_${plan.overlay}`, url: `./public/assets/beamwall/walls/overlay/plane_${plan.overlay}.png`, image: true });
  if (plan.strip) out.push({ key: `bw394_strip_${plan.strip}`, url: `./public/assets/beamwall/walls/strip/strip_${plan.strip}.png`, image: true });
  if (plan.disc) out.push(projAnimSheet('eclipse_disc', 'fire'));
  if (plan.burst) out.push(projAnimSheet(plan.burst, 'native'));
  return out.filter(Boolean);
}

// ------------------------------------------------------------------------------------------------- projectiles --
// How each still moves: spin (rad/s; tumbles), base (the way the art points, radians on screen: it is turned onto the
// flight), face (flipped to face the way it flies), flat (stays as drawn).
export const PROJ_MOTION = {
  acacia_thorn: { base: -Math.PI / 2 }, amphora: { spin: 7 }, apple: { spin: 6 }, athame: { base: Math.PI / 2 }, billet: { flat: true },
  black_rose: { spin: 4 }, blank_mask: { spin: 10 }, blood_gout: { base: Math.PI / 2 }, bodkin: { base: 2.356 }, bola_rope: { spin: 11 },
  bolas_arms: { spin: 12 }, broadhead: { base: 0 }, caltrop: { spin: 10 }, card_chaotic: { spin: 14 }, card_charlatan: { spin: 14 },
  cedar: { spin: 3 }, censer: { spin: 6 }, chess_pawn: { flat: true }, cobblestone: { spin: 7 }, coffin_lid: { spin: 8 }, cork: { spin: 12 },
  date_pit: { spin: 12 }, decree: { spin: 6 }, die: { spin: 10 }, dirk: { base: -0.785 }, falchion: { spin: 16 }, finned_rocket: { base: -0.6 },
  firecracker: { spin: 8 }, flanged_mace: { spin: 12 }, flask_glass: { spin: 8 }, frag_grenade: { spin: 10 }, gannet: { face: true },
  gargoyle: { spin: 4 }, gourd: { spin: 6 }, gourd_small: { spin: 6 }, grain_clot: { spin: 4 }, hailstone_storm: { spin: 6 },
  hailstone_ziz: { spin: 6 }, harpoon: { base: -0.785 }, hatpin: { base: 2.356 }, honey_glob: { spin: 4 }, iron_nail: { base: 2.356 },
  kitchen_knife: { spin: 14 }, lidded_urn: { spin: 6 }, loose_page: { spin: 8 }, manacle: { spin: 10 }, mannequin: { spin: 5 },
  maypole: { flat: true }, micro_missile: { base: -0.785 }, ofuda: { flat: true, wobble: true }, oil_flask_lit: { spin: 8 },
  ouroboros_ring: { spin: 5 }, paper_bird: { face: true }, paper_crane: { face: true }, petal_lotus: { spin: 6 }, petal_rose: { spin: 6 },
  phial: { spin: 10 }, portent_card: { spin: 12 }, pressure_pin: { base: Math.PI / 2 }, pyre_logs: { flat: true }, rivet: { spin: 10 },
  roc_egg: { spin: 5 }, seedpod: { spin: 6 }, shears: { spin: 12 }, shuttle: { base: -0.3 }, sigil_grenade: { spin: 8 }, spindle: { spin: 10 },
  targe: { spin: 16 }, tumbleweed: { spin: 9 }, venom_gob: { spin: 4 }, wrong_note: { flat: true },
};
// the looping flights (projectiles/animated): how they move
export const ANIM_MOTION = {
  glyph_packet_fly: { flat: true }, note_ring_fly: { flat: true }, palm_wave_fly: { base: 0 }, protostar_fly: { flat: true },
  rocket_fist: { base: 0 }, shadow_hound_run: { face: true }, eclipse_disc: { flat: true }, pulsar: { flat: true },
};
// A flight row: { art (a still) | anim (a looping flight), burst (an impact burst), bc (its cut: 'type' or a cut),
// tint (on the still), fan (a burst played at the caster as a volley leaves), byEntry: { id: art } }
const F = (art, o = {}) => ({ art, ...o });
export const FLIGHT_GAP = {
  'blood-flight': F('blood_gout', { burst: 'blood_splash', bc: 'blood' }),
  'card-flight': F('card_chaotic', { fan: 'card_fan' }), 'card-flight-fx': F('card_charlatan', { fan: 'card_fan' }),
  'censer-flight': F('censer'), 'crane-flight': F('paper_crane'),
  'clay-jar-flight': F('amphora', { burst: 'flask_shatter', bc: 'type', byEntry: { 'uncorked-phial': 'phial', 'brine-flask': 'phial', 'popped-cork': 'cork', 'cork-barrage': 'cork' } }),
  'date-pit-flight': F('date_pit', { byEntry: { 'scatter-of-thorns': 'acacia_thorn', 'burr-shot': 'acacia_thorn' } }),
  'dice-flight': F('die'), 'egg-flight': F('roc_egg', { burst: 'egg_burst' }),
  'flask-flight': F('flask_glass', { burst: 'flask_shatter', bc: 'type' }), 'grain-flight': F('grain_clot'),
  'grenade-flight': F('frag_grenade'), 'harpoon-flight': F('harpoon'),
  'harvest-projectiles': F('apple', { byEntry: { 'gourd-burst': 'gourd', 'honey-glob': 'honey_glob' }, burstBy: { 'gourd-burst': 'gourd_splat' } }),
  'manacle-flight': F('manacle'), 'missile-flight-fx': F('micro_missile'),
  'ofuda-fx': F('ofuda', { burst: 'ofuda_slap' }),
  'petal-flight': F('petal_lotus', { bySheet: { Succubus: 'petal_rose' } }), 'portent-glyph-flight': F('portent_card', { burst: 'portent_flip', bc: 'dimension' }),
  'ritual-blade-flight': F('athame'), 'thrown-targe-flight': F('targe'),
  'arms-flights': F('dirk', { byEntry: { 'flung-mace': 'flanged_mace', 'spinning-falchion': 'falchion', 'flung-oil-flask': 'oil_flask_lit', 'bolas-cast': 'bolas_arms', 'the-rack-let-loose': 'falchion' } }),
  // "arrow-flight broadhead": the broadhead is the row's variant (Broadhead Loose); the rest fly the r391 arrow (fxMap394)
  'arrow-flight': F('broadhead', { only: ['broadhead-loose'] }), 'billet-flight': F('billet', { byEntry: { 'heading-tool-shot': 'rivet' } }),
  'caltrop-sprite': F('caltrop'), 'caltrop-scatter-fx': F('caltrop', { burst: 'caltrop_scatter' }),
  'coffin-lid-sprite': F('coffin_lid', { burst: 'coffin_splinter' }), 'decree-flight': F('decree'), 'diver-flight': F('gannet'),
  'grenade-sprite': F('sigil_grenade', { byEntry: { 'rocket-swarm': 'finned_rocket' } }),
  'hail-and-cedar-flight': F('hailstone_ziz', { byEntry: { 'uprooted-cedar': 'cedar' } }), 'hail-fx': F('hailstone_storm'),
  'loom-projectiles': F('shuttle', { byEntry: { 'flung-bodkin': 'bodkin', 'spindle-dart': 'spindle', 'hail-of-dressmakers-pins': 'bodkin' } }),
  'nail-flight': F('iron_nail'), 'note-projectile-sprite': F('wrong_note'),
  'object-flights': F('cobblestone', { byEntry: { 'flung-gargoyle': 'gargoyle', 'folded-messenger': 'paper_bird', 'bursting-mannequin': 'mannequin',
    'gourd-bomb': 'gourd_small', 'bursting-urn': 'lidded_urn', 'restless-cutlery': 'kitchen_knife', 'marching-pawns': 'chess_pawn', 'flight-of-shears': 'shears' },
    burstBy: { 'gourd-bomb': 'gourd_splat' } }),
  'pin-flight': F('hatpin', { bySheet: { Master: 'pressure_pin' } }), 'seedpod-flight': F('seedpod'), 'tumbleweed-sprite': F('tumbleweed'),
  'black-rose-fx': F('black_rose'), 'firecracker-fx': F('firecracker'), 'mask-fx': F('blank_mask'), 'page-flurry-fx': F('loose_page'),
  'rope-fx': F('bola_rope'), 'spit-fx': F('venom_gob', { burst: 'blood_splash', bc: 'poison' }),
  // the looping flights
  'note-flight': { anim: 'note_ring_fly', ac: 'type' }, 'glyph-packet-flight': { anim: 'glyph_packet_fly', ac: 'type', burst: 'glyph_scatter', bc: 'type' },
  'palm-wave-fx': { anim: 'palm_wave_fly', ac: 'type', burst: 'palm_wave_hit', bc: 'type' },
  'protostar-art': { anim: 'protostar_fly', ac: 'native', burst: 'protostar_burst', bc: 'native' },
  'rocket-fist-fx': { anim: 'rocket_fist', ac: 'native' },
  'shadow-hound-art': { anim: 'shadow_hound_run', ac: 'type', burst: 'shadow_hound_pounce', bc: 'type' },
  'sutra-script-art': { anim: 'glyph_packet_fly', ac: 'gold', burst: 'glyph_scatter', bc: 'gold' },
};
export const FLIGHT_STILLS = Object.keys(PROJ394);

/** The size a still is drawn at: the CSV's target, longest side to longest side of the drawn box (nearest-neighbour). */
export function stillScale(name) {
  const p = PROJ394[name];
  if (!p) return 1;
  const t = p.target || [24, 24];
  return Math.max(t[0], t[1]) / Math.max(1, p.bw, p.bh);
}
export function projStillKey(name) { return `bw394_proj_${name}`; }
export function projAnimKey(name, cut) { return `bw394_pa_${name}_${cut}`; }
export function projAnimSheet(name, cut) {
  const p = PROJANIM394[name];
  if (!p) return null;
  const c = p.cuts.includes(cut) ? cut : p.cuts[0];
  return { key: projAnimKey(name, c), url: `./public/assets/beamwall/proj/anim/${name}_${c}.png`, cell: p.cell, cellH: p.cellH, cut: c };
}

/**
 * The flight spec for a projectile ability whose entry waits on a projectile row, or null. Played by WorldScene's
 * projectile code like round 393's stills (`r393: true` -- spin, tint) with the round-394 extras the mixin reads:
 * r394 (burst on impact, a fan at the caster, nearest-neighbour), sheets (what must be loaded first).
 */
export function flight394For(ability) {
  const a = ability || {};
  const key = entryKey(a);
  const gaps = key && BW394_FLIGHTS[key];
  if (!gaps) return null;
  const dtype = damageFxFor(a);
  const cutOf = (c) => (!c || c === 'type' ? dtype : c);
  for (const g of gaps) {
    const row = FLIGHT_GAP[g];
    if (!row || (row.only && !row.only.includes(a.confEntry))) continue;
    const burstName = (row.burstBy && row.burstBy[a.confEntry]) || row.burst || null;
    const burst = burstName ? projAnimSheet(burstName, cutOf(row.bc)) : null;
    const fan = row.fan ? projAnimSheet(row.fan, 'native') : null;
    const base = { family: 'proj394', kind: 'r394', r393: true, r394: true, gap: g, why: 'gap', impact: null, trail: null, sparks: false,
      tint: null, burst: burst && { ...burst, name: burstName }, fan: fan && { ...fan, name: row.fan } };
    if (row.anim) {
      const sh = projAnimSheet(row.anim, cutOf(row.ac));
      const pa = PROJANIM394[row.anim], mo = ANIM_MOTION[row.anim] || { flat: true };
      return { ...base, art: row.anim, key: sh.key, url: sh.url, cell: pa.cell, cellH: pa.cellH, frames: pa.frames, frameMs: pa.ms,
        heading: mo.base != null ? 'aim' : 'none', baseAngle: mo.base || 0, faceX: !!mo.face, spin: 0,
        flightScale: Math.max(0.6, Math.min(1.2, 28 / Math.max(pa.cell, pa.cellH))) * (pa.cell <= 16 ? 1.6 : 1), sheets: [sh, burst, fan].filter(Boolean) };
    }
    const art = (row.byEntry && row.byEntry[a.confEntry]) || (row.bySheet && row.bySheet[a.confSheet]) || row.art;
    const p = PROJ394[art];
    if (!p) continue;
    const mo = PROJ_MOTION[art] || { flat: true };
    const still = { key: projStillKey(art), url: `./public/assets/beamwall/proj/${art}.png`, image: true, nearest: true };
    return { ...base, art, key: still.key, url: still.url, cell: p.w, cellH: p.h, frames: 1, frameMs: 1000,
      heading: mo.base != null ? 'aim' : 'none', baseAngle: mo.base || 0, faceX: !!mo.face, spin: mo.spin || 0, wobble: !!mo.wobble,
      flightScale: stillScale(art), sheets: [still, burst, fan].filter(Boolean) };
  }
  return null;
}

/** Every entry key each part covers (for the suite and the round report). */
export function bw394Coverage() {
  return { beams: Object.keys(BW394_BEAMS), walls: Object.keys(BW394_WALLS), flights: Object.keys(BW394_FLIGHTS) };
}
export { BW394_BEAMS, BW394_WALLS, BW394_FLIGHTS };
