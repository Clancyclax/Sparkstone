// ============================================================================
// ROUND 370 -- A COLOUR FOR EVERY DAMAGE TYPE.
//
// The user, sending the fourth spell-animation drop: "Please recolor for all damage types."
//
// Every earlier drop was cut in the eleven colour NAMES (spellFx.js FX_COLORS: bloodred, orange, gold ... white), and an
// ability's cast picks the name nearest its own colour. That palette has no purple, no cyan, no teal and no pink, so a
// curse, an arcane bolt, an ice shard and a resonating blow had nowhere honest to land. This drop (spellFx5.js, cut by
// tools/make_spell_anims_dtype.py) is cut once per DAMAGE TYPE instead -- all thirty of stats.js DAMAGE_TYPES -- in the
// colour below, and an ability casts it in the colour of the damage it actually deals.
//
// The python cutter reads this object (one `type: 0xRRGGBB,` per line), so this file is the one place a colour is set.
// ============================================================================

export const DAMAGE_FX_COLORS = {
  fire: 0xff6a2a,
  frost: 0x7fe6ff,
  lightning: 0xffee55,
  nature: 0x6fd83c,
  shadow: 0x8a4fc4,
  radiant: 0xffdf80,
  water: 0x2f86ff,
  ice: 0xc4f2ff,
  rock: 0x9a8b7a,
  earth: 0x8f5a2c,
  sand: 0xe3c27a,
  wind: 0xd2f7e8,
  light: 0xfff4c4,
  dark: 0x3c2458,
  plant: 0x39b04a,
  life: 0xff8fbf,
  death: 0x6e6a72,
  blood: 0xb3122a,
  poison: 0xa8e030,
  necrotic: 0x5e7d48,
  curse: 0xa0186f,
  arcane: 0x5266ff,
  slashing: 0xd8dde4,
  blunt: 0xab9f92,
  piercing: 0xeef2f6,
  physical: 0xc9cdd3,
  resonating: 0x4fd6c4,
  disruptive: 0xd06ce0,
  transcendent: 0xe2f4ff,
  dimension: 0xb388ff,
};
export const DAMAGE_FX_TYPES = Object.keys(DAMAGE_FX_COLORS);

/** Nearest damage type to a colour (an ability with no damage type still has a colour). */
export function nearestDamageFx(hex) {
  let c = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  if (!Number.isFinite(c)) return 'physical';
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  let best = 'physical', bd = Infinity;
  for (const [t, v] of Object.entries(DAMAGE_FX_COLORS)) {
    if (t === 'transcendent') continue;   // a declared type, never a colour an ability falls into (see spellFx.js r203)
    const dr = r - ((v >> 16) & 255), dg = g - ((v >> 8) & 255), db = b - (v & 255);
    const d = dr * dr + dg * dg + db * db;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

/** The damage type an ability's cast is drawn in: its own type when it has one, else the nearest to its colour. */
export function damageFxFor(ability) {
  const a = ability || {};
  const t = a.damageType || a.element;
  // 'physical' is "no channel" for a cast (spellFx.js castTintFor): an untyped ability is drawn in its own colour
  if (t && t !== 'physical' && DAMAGE_FX_COLORS[t] != null) return t;
  return nearestDamageFx(a.color || '#c9cdd3');
}
