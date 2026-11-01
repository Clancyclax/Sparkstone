// ===========================================================================
// ROUND 401 -- THE MAGIC SOCIETY'S PEOPLE (Desktop\new-assets\magic-society, SOCIETY_BRIEF.md).
//
// The user: "Recolor the below NPCs ... to provide extensive variety. Each damage type for the NPCs (clothing only)
// and they should be mixed at each magic society building." The robes are drawn white; every damage type has a robe
// colour (`SOCIETY_ROBES`, shadow / body / highlight), and a member's colour is the damage type they study, chosen per
// run and per post. Skin, hair, belts, boots and staff wood stay as drawn: the dye only touches bright, unsaturated
// pixels, and the packer marks the grey and white hair and beards (which share the robes' colours) with alpha 254,
// which the dye leaves alone (tools/pack_society.py).
// ===========================================================================
import { SOCIETY_NPCS } from './societyManifest.js';

/** Robe colours by damage type: [shadow, body, highlight]. All 28 types the game has. */
export const SOCIETY_ROBES = {
  fire: ['#5a1208', '#c2410c', '#fdba74'], frost: ['#1e3a5f', '#5b9bd5', '#dbeafe'], lightning: ['#3b2f6b', '#7c6cf0', '#fde68a'],
  nature: ['#1f3d1a', '#4d8b31', '#bef264'], shadow: ['#1a1026', '#3f2b5c', '#8b7aa8'], radiant: ['#7a5a12', '#e8c547', '#fffbe0'],
  water: ['#0c3550', '#1f7fb5', '#9ee6ff'], ice: ['#3a5f7a', '#a5d8f0', '#f0fbff'], rock: ['#3b3530', '#7a6e62', '#c9bfb2'],
  earth: ['#3e2a16', '#8a5a2b', '#d6b48a'], sand: ['#6b5326', '#cfae6b', '#f6e7c1'], wind: ['#3c6b5e', '#8fd3c1', '#eafff8'],
  light: ['#8a7b3a', '#f2e6a0', '#ffffff'], dark: ['#0b0b12', '#24243a', '#5a5a7a'], plant: ['#284a12', '#6aa834', '#d9f99d'],
  life: ['#7a2f4f', '#e07aa6', '#ffe0ee'], death: ['#1c1c1c', '#4a4a48', '#a3a39a'], blood: ['#3b0508', '#8b1018', '#e0606a'],
  poison: ['#2c3d08', '#7a9a14', '#e2f37a'], necrotic: ['#1d2b1e', '#4b6b4c', '#a8c4a0'], curse: ['#2b0b2e', '#6d1f74', '#d08ad8'],
  arcane: ['#26125a', '#6b3fd4', '#d6c4ff'], slashing: ['#40464f', '#8b96a5', '#e5ebf2'], blunt: ['#4a3a2a', '#9c7b55', '#ead9bd'],
  piercing: ['#2f3f4a', '#6e8ca0', '#d3e3ee'], resonating: ['#4a2c08', '#d0821c', '#ffd9a0'], disruptive: ['#5a0f3a', '#d6337f', '#ffc2e0'],
  dimension: ['#0b1a3a', '#2a4fa8', '#b3f0ff'], transcendent: ['#6a6250', '#e2d8b4', '#fffdf2'],
};
export const SOCIETY_TYPES = Object.keys(SOCIETY_ROBES);
export const SOCIETY_KEYS = Object.keys(SOCIETY_NPCS);
export const RESEARCHERS = SOCIETY_KEYS.filter(k => SOCIETY_NPCS[k].role === 'researcher');
export const BUREAUCRATS = SOCIETY_KEYS.filter(k => SOCIETY_NPCS[k].role === 'bureaucrat');
/** "the Archmage (ms_m70) and Magister (ms_m60) are the senior figures" */
export const SENIOR = ['ms_m70', 'ms_m60'];

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Dye white robes in place (RGBA bytes). Alpha-254 pixels are hair and beard: never touched. */
export function dyeSocietyPixels(data, ramp) {
  const [S, M, H] = ramp.map(rgb);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 255) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const light = mx / 255, sat = mx ? (mx - mn) / mx : 0;
    // robes are drawn between ~45% (deep folds) and 100%, near-neutral (a cool blue-grey cast, < 15% saturation)
    const wl = Math.min(1, Math.max(0, (light - 0.4) / 0.12));
    const ws = Math.min(1, Math.max(0, (0.2 - sat) / 0.07));
    const w = wl * ws;
    if (w <= 0) continue;
    const t = Math.min(1, Math.max(0, (light - 0.45) / 0.53));
    let c;
    if (t < 0.7) { const u = t / 0.7; c = [S[0] + (M[0] - S[0]) * u, S[1] + (M[1] - S[1]) * u, S[2] + (M[2] - S[2]) * u]; }
    else { const u = (t - 0.7) / 0.3; c = [M[0] + (H[0] - M[0]) * u, M[1] + (H[1] - M[1]) * u, M[2] + (H[2] - M[2]) * u]; }
    data[i] = Math.round(r + (c[0] - r) * w);
    data[i + 1] = Math.round(g + (c[1] - g) * w);
    data[i + 2] = Math.round(b + (c[2] - b) * w);
  }
  return data;
}

function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function rng(seed) { let h = hash(seed); return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; }

/** The staff of one hall: [{ key, type, post, title }]. Mixed damage types, never two of one colour at a hall. Post:
 *  'senior' (the Archmage or the Magister, at the heart of a city's first halls), 'door' and 'desk' (bureaucrats),
 *  'wander' (researchers). `n` hall index decides who the senior is. */
export function hallStaff(seed, hallIdx) {
  const r = rng(`hall|${seed}|${hallIdx}`);
  const types = SOCIETY_TYPES.slice();
  for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [types[i], types[j]] = [types[j], types[i]]; }
  let ti = 0;
  const out = [];
  const senior = SENIOR[hallIdx % SENIOR.length];
  out.push({ key: senior, type: types[ti++], post: 'senior' });
  const bur = BUREAUCRATS.filter(k => k !== senior);
  const res = RESEARCHERS.filter(k => k !== senior);
  const pick = (a) => a[Math.floor(r() * a.length)];
  out.push({ key: pick(bur), type: types[ti++], post: 'door' });
  out.push({ key: pick(bur), type: types[ti++], post: 'desk' });
  const nRes = 3 + Math.floor(r() * 2);
  const seenR = new Set();
  for (let i = 0; i < nRes; i++) { let k = pick(res); for (let a = 0; a < 6 && seenR.has(k); a++) k = pick(res); seenR.add(k); out.push({ key: k, type: types[ti++], post: 'wander' }); }
  return out.map(o => ({ ...o, title: SOCIETY_NPCS[o.key].title }));
}

/** One official in the field (a study site, or met in the wilds): any member but the two seniors. */
export function fieldOfficial(seed) {
  const r = rng(`field|${seed}`);
  const pool = SOCIETY_KEYS.filter(k => !SENIOR.includes(k));
  const key = pool[Math.floor(r() * pool.length)];
  return { key, type: SOCIETY_TYPES[Math.floor(r() * SOCIETY_TYPES.length)], title: SOCIETY_NPCS[key].title };
}

const GIVEN_W = ['Ysolde', 'Maren', 'Ottilie', 'Cassia', 'Liesl', 'Henrike', 'Saffi', 'Brisa', 'Tove', 'Ingrid', 'Mireille', 'Anouk', 'Delphine', 'Rhoswen'];
const GIVEN_M = ['Aurel', 'Benedek', 'Corwin', 'Evander', 'Florian', 'Gideon', 'Lucan', 'Mattias', 'Ottokar', 'Piers', 'Quentin', 'Severin', 'Tobiah', 'Ulric'];
const FAMILY = ['Vane', 'Holloway', 'Ashgrove', 'Merrow', 'Quill', 'Starling', 'Thorne', 'Wexley', 'Brightwater', 'Calloway', 'Fennick', 'Locke', 'Penhallow', 'Rook'];
export function societyName(key, seed) {
  const r = rng(`name|${seed}|${key}`);
  const L = SOCIETY_NPCS[key] && SOCIETY_NPCS[key].sex === 'woman' ? GIVEN_W : GIVEN_M;
  return `${L[Math.floor(r() * L.length)]} ${FAMILY[Math.floor(r() * FAMILY.length)]}`;
}

/** A damage type's display label. */
export const typeLabel = (t) => t ? t[0].toUpperCase() + t.slice(1) : '';
