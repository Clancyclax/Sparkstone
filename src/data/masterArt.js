// ===========================================================================
// ROUND 399 -- HOW A MARTIAL MASTER LOOKS.
//
// The art (tools/pack_masters.py -> masterManifest.js) is 8 characters x 11 stances in WHITE gear: "Only gear is white,
// for recolouring; skin and hair keep their natural colours". The user: "Make at least 20 recolors of each stance to
// provide a very large base of martial arts masters. Line up weapons, shields, and elements to fit with the martial
// art they teach. mix multiple colors together as needed to fill out the 20 and then match elements, magic, shields
// and weapons to the various martial arts."
//
// THE DYE is a gradient map over the gear: a white-gear pixel (bright and unsaturated -- skin has hue, hair is dark or
// coloured, a blade is a darker grey and mostly survives) is replaced by a three-stop ramp, shadow -> body -> highlight,
// read off its own brightness, so the shading the artist drew survives and two or three colours MIX across the cloth
// (crimson cloth with gold lights, ink-black with violet sheen). GENERAL_PALETTES are for every stance; ELEMENT_PALETTES
// dress an element's master; each element also names the colour of the hand flames the flames stance wears.
//
// THE MATCH: `stanceForArt` reads the art's weapon (its theme, then its clauses' conditions) -- a dagger art is taught
// by a master holding a dagger, a shield art behind a shield, an element art with flames in the hands. `masterLook`
// adds the character (a stance's own fitting people first) and the palette (the element's, or any general one).
// ===========================================================================

export const MASTER_STANCES = ['unarmed', 'sword', 'axe', 'dagger', 'spear', 'scythe', 'shield', 'whip', 'bow', 'staff', 'flames'];
export const MASTER_CHAR_KEYS = ['m_monk', 'm_battlemage', 'm_knight', 'm_barbarian', 'w_wildwoman', 'w_witch', 'w_samurai', 'w_adventurer'];

/** [shadow, body, highlight] -- a name each, for the notes and the tests. */
export const GENERAL_PALETTES = [
  { id: 'crimson_gold',   name: 'crimson and gold',     ramp: ['#3a0b10', '#9b1b2a', '#e8b84a'] },
  { id: 'navy_silver',    name: 'navy and silver',      ramp: ['#0d1630', '#24407a', '#c9d3e6'] },
  { id: 'forest_bark',    name: 'forest and bark',      ramp: ['#1a2410', '#3f6a2a', '#b59a64'] },
  { id: 'ochre_rust',     name: 'ochre and rust',       ramp: ['#3a1d0c', '#a35a1f', '#e6c27a'] },
  { id: 'violet_rose',    name: 'violet and rose',      ramp: ['#240f33', '#6a2f8f', '#e39ac2'] },
  { id: 'teal_bronze',    name: 'teal and bronze',      ramp: ['#0c2a2a', '#1f7a72', '#d6a65a'] },
  { id: 'charcoal_ember', name: 'charcoal and ember',   ramp: ['#141414', '#3d3a3a', '#e0702a'] },
  { id: 'saffron_maroon', name: 'saffron and maroon',   ramp: ['#40121a', '#c9741a', '#f4d36a'] },
  { id: 'slate_ice',      name: 'slate and ice',        ramp: ['#1e2329', '#56606e', '#cfe7f2'] },
  { id: 'ivory_umber',    name: 'ivory and umber',      ramp: ['#3b2a1c', '#a8926f', '#f2ead6'] },
  { id: 'black_crimson',  name: 'black and crimson',    ramp: ['#0b0b0e', '#262630', '#c4283b'] },
  { id: 'jade_white',     name: 'jade and white',       ramp: ['#0f2e1f', '#2f8a5c', '#e6f2ea'] },
  { id: 'indigo_copper',  name: 'indigo and copper',    ramp: ['#120f33', '#36307a', '#d48a52'] },
  { id: 'plum_grey',      name: 'plum and grey',        ramp: ['#2a1324', '#6e3a5e', '#bdb6bb'] },
  { id: 'sand_sky',       name: 'sand and sky',         ramp: ['#4a3b22', '#c8b07c', '#a6d4f0'] },
  { id: 'moss_gold',      name: 'moss and gold',        ramp: ['#1f2410', '#5a6a22', '#e6c95a'] },
  { id: 'wine_cream',     name: 'wine and cream',       ramp: ['#2b0a14', '#6e1a32', '#f0e2c4'] },
  { id: 'steel_blue',     name: 'steel and blue',       ramp: ['#1a2230', '#5a6a80', '#9fc4ec'] },
  { id: 'brick_bone',     name: 'brick and bone',       ramp: ['#33140e', '#8a3a26', '#e8dcc2'] },
  { id: 'pine_snow',      name: 'pine and snow',        ramp: ['#0e2218', '#1e4a34', '#f2f6f4'] },
  { id: 'dusk_amber',     name: 'dusk and amber',       ramp: ['#1c1430', '#4a3a6a', '#f0a43a'] },
  { id: 'clay_turquoise', name: 'clay and turquoise',   ramp: ['#3a2216', '#9a5a3a', '#4ad0c4'] },
  { id: 'soot_bone',      name: 'soot and bone',        ramp: ['#101010', '#4a4642', '#e2d6bc'] },
  { id: 'cobalt_white',   name: 'cobalt and white',     ramp: ['#0a1440', '#1f4ab0', '#f2f4fa'] },
];

/** An element's masters wear its colours, and the hand flames burn in its colour. */
export const ELEMENT_PALETTES = {
  fire:      { flame: '#ff8a2a', ramps: [['#2e0a06', '#b8261a', '#ffb43a'], ['#1a0a08', '#6a1a10', '#ff6a1a'], ['#3a1806', '#d0601a', '#ffe08a'], ['#24080a', '#8a1a2a', '#ffcf4a']] },
  frost:     { flame: '#9fe4ff', ramps: [['#0a1a2e', '#3a7ab0', '#e8f8ff'], ['#141e2a', '#6a8aa6', '#cfefff'], ['#08223a', '#2a9ad0', '#f2fbff'], ['#1a2030', '#8aa0c0', '#ffffff']] },
  lightning: { flame: '#d8c4ff', ramps: [['#140a30', '#4a2aa0', '#f2e85a'], ['#0e1430', '#3a4ab0', '#e0f0ff'], ['#200a2a', '#7a2ab0', '#fff27a'], ['#101018', '#3a3a5a', '#c0a8ff']] },
  nature:    { flame: '#9aef6a', ramps: [['#0e2410', '#2f7a2a', '#c8e66a'], ['#1e1a0c', '#5a4a1a', '#8ad04a'], ['#0a2a1a', '#2a8a5a', '#e6f2a0'], ['#22240e', '#6a7a1a', '#f0d070']] },
  shadow:    { flame: '#b48aff', ramps: [['#06060a', '#1e1a2a', '#7a4ab0'], ['#0a0612', '#2a1a3a', '#c06aff'], ['#080808', '#262626', '#6a6a8a'], ['#12060e', '#3a1028', '#a03a6a']] },
  radiant:   { flame: '#fff2b0', ramps: [['#4a3610', '#d0a840', '#fffbe6'], ['#3a2a10', '#f0d070', '#ffffff'], ['#2a2416', '#c8b88a', '#fff6c8'], ['#40300a', '#e8c040', '#fff0a0']] },
};
export const NEUTRAL_FLAME = '#ffffff';

// A stance's own fitting people first (the rest may teach it too).
const STANCE_CHARS = {
  unarmed: ['m_monk', 'w_wildwoman', 'm_barbarian', 'w_samurai'],
  sword:   ['m_knight', 'w_samurai', 'w_adventurer', 'm_battlemage'],
  axe:     ['m_barbarian', 'm_knight', 'w_adventurer'],
  dagger:  ['w_adventurer', 'w_wildwoman', 'm_monk'],
  spear:   ['w_samurai', 'm_knight', 'm_monk'],
  scythe:  ['w_witch', 'm_battlemage', 'm_barbarian'],
  shield:  ['m_knight', 'w_adventurer', 'm_monk'],
  whip:    ['w_witch', 'w_wildwoman', 'm_barbarian'],
  bow:     ['w_adventurer', 'w_wildwoman', 'w_samurai'],
  staff:   ['m_monk', 'w_witch', 'm_battlemage'],
  flames:  ['m_battlemage', 'w_witch', 'm_monk', 'w_wildwoman'],
};

// The weapon a master holds, from the weapon their art is about.
const WEAPON_STANCE = {
  dagger: 'dagger', sword: 'sword', greatsword: 'sword', blade: 'sword', single: 'sword', dual: 'sword',
  axe: 'axe', greataxe: 'axe', hammer: 'axe', maul: 'axe', heavy: 'axe', great: 'sword',
  spear: 'spear', glaive: 'spear', polearm: 'spear', javelin: 'spear', twohand: 'spear',
  scythe: 'scythe', whip: 'whip', bow: 'bow', crossbow: 'bow', ranged: 'bow', staff: 'staff', shield: 'shield',
};

/** The element an art is about ("el_fire", or a clause on fire spells / fire resistance), or null. */
export function elementOfArt(art) {
  if (!art) return null;
  const m = /^el_(\w+)$/.exec(art.theme || '');
  if (m) return m[1];
  for (const cl of (art.clauses || [])) {
    const r = /^res_(\w+)$/.exec(cl.cond || '');
    if (r) return r[1];
    for (const k of Object.keys(cl.fx || {})) {
      const e = /^(?:spell|wscale|\w+Per)_(\w+)$/.exec(k);
      if (e) return e[1];
    }
  }
  return null;
}

/** The weapon an art is about, or null: its theme ("w_dagger"), else the first weapon condition among its clauses. */
export function weaponOfArt(art) {
  if (!art) return null;
  const m = /^w_(\w+)$/.exec(art.theme || '');
  if (m) return m[1];
  for (const cl of (art.clauses || [])) {
    const w = /^w_(\w+)$/.exec(cl.cond || '');
    if (w) return w[1];
  }
  return null;
}

/** The stance a master of this art stands in. */
export function stanceForArt(art) {
  if (elementOfArt(art)) return 'flames';
  const w = weaponOfArt(art);
  if (w && WEAPON_STANCE[w]) return WEAPON_STANCE[w];
  // haste, mana and cast arts are a caster's: a staff; everything else is taught with the bare hands
  const keys = (art && art.clauses || []).flatMap(c => Object.keys(c.fx || {}));
  const cast = keys.filter(k => k === 'haste' || k === 'focus' || k === 'killFocus' || k === 'tempo').length;
  if (cast && cast * 2 >= keys.length) return 'staff';   // mostly a caster's art
  return 'unarmed';
}

/** Every palette a stance can wear (the general ones, plus the element ones for flames): at least 20 for any. */
export function palettesForStance(stance, element = null) {
  if (element && ELEMENT_PALETTES[element]) {
    return ELEMENT_PALETTES[element].ramps.map((ramp, i) => ({ id: `${element}_${i}`, name: `${element} ${i + 1}`, ramp, flame: ELEMENT_PALETTES[element].flame }));
  }
  const out = GENERAL_PALETTES.map(p => ({ ...p, flame: NEUTRAL_FLAME }));
  if (stance === 'flames') {
    for (const el of Object.keys(ELEMENT_PALETTES)) out.push(...palettesForStance('flames', el));
  }
  return out;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** {char, stance, palette, flame} for a master of `art`. `seed` varies it per master; `usedChars` (a Set) spreads the
 *  eight characters across the masters of one run. */
export function masterLook(art, seed, usedChars = null) {
  const stance = stanceForArt(art);
  const element = elementOfArt(art);
  const h = hash(`${seed}|${art && art.id}`);
  const pref = STANCE_CHARS[stance] || MASTER_CHAR_KEYS;
  const order = [...pref, ...MASTER_CHAR_KEYS.filter(c => !pref.includes(c))];
  let char = order[h % pref.length];
  if (usedChars) {
    const fresh = order.filter(c => !usedChars.has(c));
    if (fresh.length && usedChars.has(char)) char = fresh[(h >>> 4) % Math.min(fresh.length, 3)];
    usedChars.add(char);
  }
  const pals = stance === 'flames' && element ? palettesForStance('flames', element) : palettesForStance(stance === 'flames' ? 'unarmed' : stance);
  const palette = pals[(h >>> 8) % pals.length];
  return { char, stance, element, palette: palette.id, ramp: palette.ramp, flame: palette.flame || NEUTRAL_FLAME };
}

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Dye white gear in an RGBA buffer in place: a three-stop gradient map over each gear pixel's brightness. */
export function dyeMasterPixels(data, ramp) {
  const [S, M, H] = ramp.map(rgb);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const light = mx / 255, sat = mx ? (mx - mn) / mx : 0;
    // gear: bright and unsaturated. Full weight above 70% brightness and under 8% saturation, fading to none at 48%
    // brightness or 16% saturation, so skin (hued), dark hair, wood and a darker blade stay as drawn.
    const wl = Math.min(1, Math.max(0, (light - 0.48) / 0.22));
    const ws = Math.min(1, Math.max(0, (0.16 - sat) / 0.08));
    const w = wl * ws;
    if (w <= 0) continue;
    // white gear is drawn between ~55% (its deepest folds) and 100%; most of it sits near 85%, which is the BODY colour,
    // so the shadow colour fills the folds and the highlight only the brightest edges.
    const t = Math.min(1, Math.max(0, (light - 0.55) / 0.45));
    let c;
    if (t < 0.72) { const u = t / 0.72; c = [S[0] + (M[0] - S[0]) * u, S[1] + (M[1] - S[1]) * u, S[2] + (M[2] - S[2]) * u]; }
    else { const u = (t - 0.72) / 0.28; c = [M[0] + (H[0] - M[0]) * u, M[1] + (H[1] - M[1]) * u, M[2] + (H[2] - M[2]) * u]; }
    data[i] = Math.round(r + (c[0] - r) * w);
    data[i + 1] = Math.round(g + (c[1] - g) * w);
    data[i + 2] = Math.round(b + (c[2] - b) * w);
  }
  return data;
}

/** Faults for the tests: every stance has art for every character and at least 20 palettes. */
export function masterArtFaults(MASTER_SHEETS) {
  const out = [];
  for (const c of MASTER_CHAR_KEYS) for (const s of MASTER_STANCES) {
    const e = MASTER_SHEETS && MASTER_SHEETS[c] && MASTER_SHEETS[c][s];
    if (!e || !e.idle || !e.attack || !e.run) out.push(`${c} ${s} has no sheets`);
  }
  for (const s of MASTER_STANCES) if (palettesForStance(s).length < 20) out.push(`${s} has only ${palettesForStance(s).length} palettes`);
  for (const el of Object.keys(ELEMENT_PALETTES)) if (palettesForStance('flames', el).length < 4) out.push(`${el} has too few palettes`);
  return out;
}
