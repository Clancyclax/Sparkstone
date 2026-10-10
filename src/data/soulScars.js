// ============================================================================
// ROUND 314 (item 3) -- SOUL SCARS.
//
// THE USER:
//
//   "Come up with a way to add soul scars"
//   "When the player wakes up they will have a procedurally generated scar on
//    their body or face somewhere."
//
// A soul scar is what is left when something reaches the soul and does not
// quite kill it: a god's aura laid down on you, a curse that took hold, a rite
// that turned on its caster, a night too close to an astral rift. It does not
// heal. It is a MARK -- on the face or the body, somewhere specific -- and it is
// a record: it says what did it, and when.
//
// THE WAY TO ADD ONE is one function, `rollScar(source, seed)`, and one door in
// the scene, `_addSoulScar(source, opts)`. A source is a row in SCAR_SOURCES; a
// later round that wants a new cause adds a row and calls the door, and gets a
// new, unique scar with its own colour, shapes, names and wording for free.
//
// PROCEDURAL means the same thing it does everywhere else in this game: a seeded
// roll. The seed is stored on the scar and the scar's whole look -- where it
// sits, its shape, its length, its lean, its branching -- is a pure function of
// (source, seed). So a save stores a few numbers per scar and the face is
// redrawn exactly, every time, with nothing baked.
//
// WHAT IT DOES. Cosmetic and a record. Mechanical weight is deliberately left to
// the source's own story (Destruction's curse is not made lighter or heavier by
// the mark that says it happened), and kept off this file so a scar can never
// quietly become a stat.
// ============================================================================

import { seededRng } from './awakening.js';

/** The player field the scars live in. A plain array, saved with everything
 *  else because `captureSave` walks the player's own fields. */
export const SCAR_FLAG = 'soulScars';

/** Most scars a body will carry on the sheet; later ones still count but the
 *  oldest stop being drawn on the portrait, which is 36 px wide. */
export const SCAR_PORTRAIT_MAX = 3;

/**
 * Where a scar can be. `zone` 'face' ones are drawn on the HUD portrait; the
 * rest are named on the Character page. `x`,`y` are fractions of the portrait
 * canvas for the face, `size` its reach as a fraction of the canvas width, and
 * `lean` the base angle in radians a scar there tends to run at.
 */
export const SCAR_PLACES = [
  { id: 'brow',        zone: 'face', label: 'across your brow',          x: 0.50, y: 0.30, size: 0.30, lean: -0.15 },
  { id: 'leftBrow',    zone: 'face', label: 'through your left brow',    x: 0.38, y: 0.30, size: 0.20, lean: 1.20 },
  { id: 'rightBrow',   zone: 'face', label: 'through your right brow',   x: 0.62, y: 0.30, size: 0.20, lean: -1.20 },
  { id: 'leftCheek',   zone: 'face', label: 'down your left cheek',      x: 0.36, y: 0.48, size: 0.28, lean: 1.45 },
  { id: 'rightCheek',  zone: 'face', label: 'down your right cheek',     x: 0.64, y: 0.48, size: 0.28, lean: 1.70 },
  { id: 'jaw',         zone: 'face', label: 'along your jaw',            x: 0.52, y: 0.62, size: 0.30, lean: 0.25 },
  { id: 'temple',      zone: 'face', label: 'at your temple',            x: 0.70, y: 0.26, size: 0.20, lean: 0.9 },
  { id: 'neck',        zone: 'body', label: 'on your neck' },
  { id: 'shoulder',    zone: 'body', label: 'across your shoulder' },
  { id: 'chest',       zone: 'body', label: 'over your heart' },
  { id: 'ribs',        zone: 'body', label: 'along your ribs' },
  { id: 'back',        zone: 'body', label: 'between your shoulder blades' },
  { id: 'leftForearm', zone: 'body', label: 'down your left forearm' },
  { id: 'rightForearm', zone: 'body', label: 'down your right forearm' },
  { id: 'hand',        zone: 'body', label: 'across the back of your hand' },
  { id: 'thigh',       zone: 'body', label: 'on your thigh' },
];
export const SCAR_PLACE_BY_ID = Object.fromEntries(SCAR_PLACES.map(p => [p.id, p]));

/** The shapes a scar is drawn as. See `scarPoints`. */
export const SCAR_SHAPES = ['fork', 'slash', 'burst', 'web', 'brand', 'streak'];

/**
 * Where a scar can come from. Every row is complete: a later source is one more
 * entry here and nothing else.
 *
 *   zones      which of 'face' / 'body' it may land on, in order of preference
 *   shapes     the shapes this cause leaves
 *   palette    [dark edge, mid, bright core] -- the three colours it is drawn in
 *   names      [adjectives, nouns] -- the scar is called "<Adjective> <Noun>"
 *   cause      the sentence the Character page prints, under the name
 */
export const SCAR_SOURCES = {
  destruction: {
    label: "Destruction's mark",
    zones: ['face', 'body'], faceWeight: 0.55,
    shapes: ['fork', 'burst', 'web', 'brand'],
    palette: ['#1a0507', '#9b1c1c', '#ff5a4d'],
    names: [['Ember', 'Cinder', 'Ruin', 'Ashen', 'Unmade', 'Sundered', 'Red'], ['Fork', 'Brand', 'Wound', 'Crack', 'Seam', 'Kiss']],
    cause: 'Left when the aura of the god of Destruction was pressed down on you. It has not faded and will not.',
    gain: 'Something has been written into you.',
  },
  curse: {
    label: 'A curse that took hold',
    zones: ['body', 'face'], faceWeight: 0.35,
    shapes: ['web', 'brand', 'streak'],
    palette: ['#10051a', '#5e2a8f', '#c78bff'],
    names: [['Hollow', 'Bound', 'Quiet', 'Tethered', 'Marked'], ['Thread', 'Sigil', 'Lattice', 'Knot']],
    cause: 'A curse reached your soul and settled in. The mark is where it went in.',
    gain: 'The curse has found somewhere to live.',
  },
  godAura: {
    label: 'A god looked at you',
    zones: ['face', 'body'], faceWeight: 0.5,
    shapes: ['burst', 'slash', 'fork'],
    palette: ['#1c1405', '#a77c1a', '#ffe08a'],
    names: [['Gilt', 'Bright', 'Sunburnt', 'Branded', 'Unwelcome'], ['Gaze', 'Print', 'Scorch', 'Blaze']],
    cause: 'A god leaned on you with something that was not meant for mortals, and you are still here. This is the print.',
    gain: 'You were noticed, and it left a mark.',
  },
  ritual: {
    label: 'A rite that turned',
    zones: ['body', 'face'], faceWeight: 0.2,
    shapes: ['slash', 'web', 'streak', 'brand'],
    palette: ['#071419', '#1f7a8c', '#7fe3f5'],
    names: [['Backfired', 'Open', 'Spent', 'Circled', 'Burned-out'], ['Ring', 'Line', 'Circuit', 'Weal']],
    cause: 'A ritual turned on the one who cast it. The scar follows the pattern of the circle.',
    gain: 'The rite left its shape on you.',
  },
  rift: {
    label: 'Too long in the astral',
    zones: ['body', 'face'], faceWeight: 0.3,
    shapes: ['streak', 'fork', 'web'],
    palette: ['#0a0d1c', '#3b4fb0', '#9fb4ff'],
    names: [['Pale', 'Drifting', 'Starved', 'Thin', 'Far'], ['Crack', 'Fray', 'Seam', 'Tear']],
    cause: 'The astral wears the soul thin where it has been standing too long. This is where it wore through.',
    gain: 'Something thin has opened in you.',
  },
};
export const SCAR_SOURCE_IDS = Object.keys(SCAR_SOURCES);

/**
 * Roll one. Pure: the same (source, seed) is the same scar. `opts.place` forces a
 * place id (a story beat that wants "on the face"); `opts.zone` forces a zone;
 * `opts.exclude` lists place ids to avoid, so a second scar is never drawn on
 * top of the first.
 */
export function rollScar(source, seed, opts = {}) {
  const src = SCAR_SOURCES[source];
  if (!src) throw new Error(`rollScar: unknown source "${source}"`);
  const rng = seededRng(`scar|${source}|${seed}`);
  const pick = (arr) => arr[Math.floor(rng() * arr.length) % arr.length];
  // zone: a weighted coin between the source's two zones
  let zone = opts.zone || null;
  if (!zone) zone = rng() < (src.faceWeight != null ? src.faceWeight : 0.5) ? 'face' : 'body';
  if (!src.zones.includes(zone)) zone = src.zones[0];
  const exclude = new Set(opts.exclude || []);
  let places = SCAR_PLACES.filter(p => p.zone === zone && !exclude.has(p.id));
  if (!places.length) places = SCAR_PLACES.filter(p => p.zone === zone);
  const place = opts.place && SCAR_PLACE_BY_ID[opts.place] ? SCAR_PLACE_BY_ID[opts.place] : pick(places);
  const shape = pick(src.shapes);
  const name = `${pick(src.names[0])} ${pick(src.names[1])}`;
  return {
    id: `${source}-${seed}`,
    source, seed: String(seed),
    place: place.id, zone: place.zone,
    shape,
    name,
    // how far it runs and which way it leans from the place's own lean, in
    // radians; two numbers are the whole of the variation a viewer sees
    lean: Math.round((rng() * 1.1 - 0.55) * 1000) / 1000,
    reach: Math.round((0.75 + rng() * 0.6) * 1000) / 1000,
    // the number of times it branches; read by `scarPoints`
    branches: 1 + Math.floor(rng() * 3),
    at: opts.at || 0,
  };
}

/**
 * The strokes of a scar as polylines in a unit box centred on 0,0 (x and y in
 * about -0.5..0.5), deterministic from the scar's own numbers. Returns an array
 * of strokes, each `{ pts: [[x,y],...], w }` where `w` is a relative width
 * (1 = the main line). The renderer scales and rotates the whole thing.
 */
export function scarPoints(scar) {
  const rng = seededRng(`strokes|${scar.id}|${scar.seed}`);
  const strokes = [];
  const jag = (len, steps, spread) => {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push([(t - 0.5) * len, (rng() - 0.5) * spread * Math.sin(Math.PI * t)]);
    }
    return pts;
  };
  const shape = scar.shape;
  if (shape === 'slash') {
    // one long clean line with a break in it
    const a = jag(1, 6, 0.06);
    strokes.push({ pts: a.slice(0, 4), w: 1 }, { pts: a.slice(4), w: 0.7 });
  } else if (shape === 'streak') {
    strokes.push({ pts: jag(1, 8, 0.1), w: 1 });
    strokes.push({ pts: jag(0.55, 5, 0.1).map(([x, y]) => [x * 0.9 - 0.05, y + 0.1]), w: 0.55 });
  } else if (shape === 'fork') {
    const main = jag(1, 7, 0.16);
    strokes.push({ pts: main, w: 1 });
    for (let b = 0; b < scar.branches; b++) {
      const at = main[2 + Math.floor(rng() * 3)];
      const dir = rng() < 0.5 ? -1 : 1;
      const pts = [at];
      let [x, y] = at;
      for (let i = 0; i < 3; i++) { x += 0.12; y += dir * (0.07 + rng() * 0.07); pts.push([x, y]); }
      strokes.push({ pts, w: 0.6 });
    }
  } else if (shape === 'burst') {
    const n = 5 + scar.branches * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng() * 0.5;
      const r = 0.22 + rng() * 0.28;
      strokes.push({ pts: [[0, 0], [Math.cos(a) * r * 0.5 + (rng() - 0.5) * 0.04, Math.sin(a) * r * 0.5], [Math.cos(a) * r, Math.sin(a) * r]], w: i % 3 === 0 ? 1 : 0.6 });
    }
  } else if (shape === 'web') {
    const n = 4 + scar.branches;
    const ring = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const r = 0.16 + rng() * 0.1; ring.push([Math.cos(a) * r, Math.sin(a) * r]); }
    ring.push(ring[0]);
    strokes.push({ pts: ring, w: 0.7 });
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.2; const r = 0.4 + rng() * 0.1; strokes.push({ pts: [ring[i], [Math.cos(a) * r, Math.sin(a) * r]], w: 0.8 }); }
  } else { // brand: a ring with a bar through it
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; pts.push([Math.cos(a) * 0.2, Math.sin(a) * 0.2]); }
    strokes.push({ pts, w: 0.9 });
    strokes.push({ pts: [[-0.42, 0.02 * (rng() - 0.5)], [0.42, 0.02 * (rng() - 0.5)]], w: 1 });
    if (scar.branches > 1) strokes.push({ pts: [[0, -0.4], [0.02, 0.4]], w: 0.7 });
  }
  return strokes;
}

/**
 * Draw a face scar onto a portrait canvas context (any size). Body scars are
 * not drawn here -- they have no place on a head-and-shoulders crop -- and this
 * returns false for them so the caller can tell.
 */
export function drawScarOnPortrait(ctx, scar, w, h) {
  const place = SCAR_PLACE_BY_ID[scar.place];
  if (!place || place.zone !== 'face') return false;
  const src = SCAR_SOURCES[scar.source] || SCAR_SOURCES.curse;
  const [edge, mid, core] = src.palette;
  const strokes = scarPoints(scar);
  const size = place.size * w * scar.reach;
  const ang = place.lean + scar.lean;
  const cx = place.x * w, cy = place.y * h;
  const c = Math.cos(ang), s = Math.sin(ang);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pass = (colour, width) => {
    ctx.strokeStyle = colour;
    for (const st of strokes) {
      ctx.lineWidth = Math.max(0.6, width * st.w);
      ctx.beginPath();
      st.pts.forEach(([x, y], i) => {
        const px = cx + (x * c - y * s) * size, py = cy + (x * s + y * c) * size;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      });
      ctx.stroke();
    }
  };
  const unit = Math.max(1, w / 36);
  pass(edge, 2.6 * unit);
  pass(mid, 1.6 * unit);
  pass(core, 0.8 * unit);
  ctx.restore();
  return true;
}

/** The scar as the sentence the Character page prints. */
export function scarLine(scar) {
  const src = SCAR_SOURCES[scar.source];
  const place = SCAR_PLACE_BY_ID[scar.place];
  return `${scar.name} — ${place ? place.label : 'somewhere on you'}`;
}
export function scarCause(scar) {
  const src = SCAR_SOURCES[scar.source];
  return src ? src.cause : 'A mark on the soul.';
}

/** Add a scar to a player object. Returns the scar. Pure bookkeeping: the scene
 *  door `_addSoulScar` wraps it with the redraw and the message. */
export function addScar(p, source, opts = {}) {
  if (!Array.isArray(p[SCAR_FLAG])) p[SCAR_FLAG] = [];
  const taken = p[SCAR_FLAG].map(s => s.place);
  // the seed is a number you could not guess from the player's name, so two
  // characters hit by the same god do not wear the same mark
  const n = p[SCAR_FLAG].length;
  const seed = opts.seed != null ? opts.seed : `${p.name || 'x'}|${source}|${n}|${(p.xp || 0) | 0}|${Math.floor((opts.clock || 0))}`;
  const scar = rollScar(source, seed, { ...opts, exclude: [...(opts.exclude || []), ...taken], at: opts.clock || 0 });
  p[SCAR_FLAG].push(scar);
  return scar;
}

/** Faults a test (or a future source) can ask about: every source is complete. */
export function soulScarFaults() {
  const out = [];
  for (const [id, s] of Object.entries(SCAR_SOURCES)) {
    if (!s.palette || s.palette.length !== 3) out.push(`${id}: palette needs 3 colours`);
    if (!s.shapes || !s.shapes.length) out.push(`${id}: no shapes`);
    for (const sh of (s.shapes || [])) if (!SCAR_SHAPES.includes(sh)) out.push(`${id}: unknown shape ${sh}`);
    if (!s.names || s.names.length !== 2 || !s.names[0].length || !s.names[1].length) out.push(`${id}: names`);
    if (!s.cause) out.push(`${id}: no cause line`);
    if (!s.gain) out.push(`${id}: no gain line`);
    if (!s.zones || !s.zones.length) out.push(`${id}: zones`);
  }
  for (const p of SCAR_PLACES) {
    if (p.zone === 'face' && !(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1 && p.size > 0)) out.push(`place ${p.id}: face geometry`);
  }
  return out;
}
