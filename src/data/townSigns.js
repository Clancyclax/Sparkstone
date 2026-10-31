// ===========================================================================
// ROUND 396 (item 10, part A) -- TOWN, CITY AND BATHHOUSE SIGNS: THE PURE HALF.
//
//   "44 transparent PNGs ... The lettering is part of each image and is spelled correctly ... Do not overlay text on
//    any sign." "Pack all 44 foot-anchored, the same way as the city props ... Keep them at 1:1 art scale."
//   "Use the real settlement ids and positions, and don't scatter the signs as decoration."
//
// THE SHEET. tools/pack_town_signs_r396.py packs every sign foot-anchored into one uniform cell (each sign's `foot`
// from signs.json on the same point), magnified 2x NEAREST -- whole pixels -- and drawn at sprite scale 1/2, which is
// 1:1 art scale in the world. `posts` are each sign's posts as screen-x offsets from the foot in art pixels, measured
// off the art by the packer: the sign is solid there and nowhere else.
//
// WHICH SIGN: a settlement's sign is its NAME (Fenn Cross -> fenn_cross); a bandit city shows its daubed board while
// held and the clean `_former` board once cleared (the game's liberation state, player.banditCities[id].cleared).
// There is no state for BEFORE the bandits took a city -- they hold it from the start of every run -- so the former
// board is shown only after liberation. A bathhouse's style is chosen by region, deterministic per building.
// The scene half is scenes/townSignsMixin.js.
// ===========================================================================

export const TOWN_SIGN_ART = {
  key: 'townSignsR396', file: './public/assets/signs/town_signs_r396.png',
  cellW: 402, cellH: 252, up: 2, cols: 8, count: 44,
  foot: [0.49254, 0.89683],
};
/** Sprite scale for an art scale of 1: the sheet is magnified `up` times. */
export const TOWN_SIGN_SPRITE_SCALE = 1 / TOWN_SIGN_ART.up;

export const TOWN_SIGNS = {
  cadence: { idx: 0, kind: "city", text: "Cadence", region: "nek", w: 192, h: 112, posts: [-50.5, 50.0] },
  harrowmoor: { idx: 1, kind: "city", text: "Harrowmoor", region: "ontaria", w: 192, h: 112, posts: [-56.0, 54.0] },
  karsk_landing: { idx: 2, kind: "city", text: "Karsk Landing", region: "elehyd", w: 192, h: 112, posts: [0.0] },
  vashra: { idx: 3, kind: "city", text: "Vashra", region: "bratugal", w: 192, h: 112, posts: [-56.5, 57.0] },
  tolbrand_quay: { idx: 4, kind: "city", text: "Tolbrand Quay", region: "sirukh", w: 192, h: 112, posts: [-53.5, 51.5] },
  slagward: { idx: 5, kind: "city", text: "Slagward", region: "cinder", w: 192, h: 112, posts: [0.0] },
  gallowsreach_former: { idx: 6, kind: "city (former name)", text: "Hollin Ford", region: "nek", w: 192, h: 112, posts: [-39.5, 38.5] },
  gallowsreach: { idx: 7, kind: "bandit city", text: "Gallowsreach", region: "nek", w: 192, h: 112, posts: [-39.5, 38.5], former: "Hollin Ford" },
  tollmarket_former: { idx: 8, kind: "city (former name)", text: "Sedge Crossing", region: "ontaria", w: 192, h: 112, posts: [2.0] },
  tollmarket: { idx: 9, kind: "bandit city", text: "Tollmarket", region: "ontaria", w: 192, h: 112, posts: [2.0], former: "Sedge Crossing" },
  cinderwatch_former: { idx: 10, kind: "city (former name)", text: "Marrow Hill", region: "elehyd", w: 192, h: 112, posts: [0.5] },
  cinderwatch: { idx: 11, kind: "bandit city", text: "Cinderwatch", region: "elehyd", w: 192, h: 112, posts: [0.5], former: "Marrow Hill" },
  magpie_roost_former: { idx: 12, kind: "city (former name)", text: "Wren Stead", region: "bratugal", w: 192, h: 112, posts: [-45.0, 45.5] },
  magpie_roost: { idx: 13, kind: "bandit city", text: "Magpie Roost", region: "bratugal", w: 192, h: 112, posts: [-45.0, 45.5], former: "Wren Stead" },
  shareholt_former: { idx: 14, kind: "city (former name)", text: "Tarrow Quay", region: "sirukh", w: 192, h: 112, posts: [0.0] },
  shareholt: { idx: 15, kind: "bandit city", text: "Shareholt", region: "sirukh", w: 192, h: 112, posts: [0.0], former: "Tarrow Quay" },
  hush_former: { idx: 16, kind: "city (former name)", text: "Emberfall", region: "cinder", w: 192, h: 112, posts: [-75.5, 75.5] },
  hush: { idx: 17, kind: "bandit city", text: "Hush", region: "cinder", w: 192, h: 112, posts: [-75.5, 75.5], former: "Emberfall" },
  blackmarch_former: { idx: 18, kind: "city (former name)", text: "Kalen Terrace", region: "ixcuatl", w: 192, h: 112, posts: [-1.5] },
  blackmarch: { idx: 19, kind: "bandit city", text: "Blackmarch", region: "ixcuatl", w: 192, h: 112, posts: [-1.5], former: "Kalen Terrace" },
  milrow: { idx: 20, kind: "village/hamlet", text: "Milrow", region: "nek", w: 96, h: 64, posts: [-15.5, 17.0] },
  fenn_cross: { idx: 21, kind: "village/hamlet", text: "Fenn Cross", region: "nek", w: 96, h: 64, posts: [-1.0] },
  little_gale: { idx: 22, kind: "town", text: "Little Gale", region: "ontaria", w: 112, h: 72, posts: [-1.0] },
  sailmend: { idx: 23, kind: "village/hamlet", text: "Sailmend", region: "ontaria", w: 96, h: 64, posts: [0.5] },
  cobb_point: { idx: 24, kind: "village/hamlet", text: "Cobb Point", region: "ontaria", w: 96, h: 64, posts: [-1.5] },
  coldharrow: { idx: 25, kind: "village/hamlet", text: "Coldharrow", region: "elehyd", w: 96, h: 64, posts: [0.5] },
  gravemarch: { idx: 26, kind: "village/hamlet", text: "Gravemarch", region: "elehyd", w: 96, h: 64, posts: [-0.5] },
  stiltrow: { idx: 27, kind: "village/hamlet", text: "Stiltrow", region: "bratugal", w: 96, h: 64, posts: [1.0] },
  thornwick: { idx: 28, kind: "village/hamlet", text: "Thornwick", region: "bratugal", w: 96, h: 64, posts: [-14.0, 16.0] },
  salt_gate: { idx: 29, kind: "village/hamlet", text: "Salt Gate", region: "sirukh", w: 96, h: 64, posts: [-1.5] },
  dunmouth: { idx: 30, kind: "village/hamlet", text: "Dunmouth", region: "sirukh", w: 96, h: 64, posts: [-2.5] },
  ashfall_station: { idx: 31, kind: "village/hamlet", text: "Ashfall Station", region: "cinder", w: 96, h: 64, posts: [0.0] },
  kiln_halt: { idx: 32, kind: "village/hamlet", text: "Kiln Halt", region: "cinder", w: 96, h: 64, posts: [-0.5] },
  lastlight_camp: { idx: 33, kind: "village/hamlet", text: "Lastlight Camp", region: "ixcuatl", w: 96, h: 64, posts: [-26.5, -14.0, 24.0] },
  the_cut: { idx: 34, kind: "village/hamlet", text: "The Cut", region: "ixcuatl", w: 96, h: 64, posts: [-2.0] },
  kepen_rest: { idx: 35, kind: "village/hamlet", text: "Kepen Rest", region: "ixcuatl", w: 96, h: 64, posts: [-4.0, 21.5] },
  bath_rustic: { idx: 36, kind: "bathhouse", text: "BATHS", region: null, w: 64, h: 64, posts: [1.0] },
  bath_marble: { idx: 37, kind: "bathhouse", text: "BATH HOUSE", region: null, w: 64, h: 64, posts: [-0.5] },
  bath_copper: { idx: 38, kind: "bathhouse", text: "HOT BATHS", region: null, w: 64, h: 64, posts: [0.5] },
  bath_magic: { idx: 39, kind: "bathhouse", text: "SPRINGS", region: null, w: 64, h: 64, posts: [-2.0] },
  bath_hanging: { idx: 40, kind: "bathhouse", text: "BATH", region: null, w: 64, h: 64, posts: [-21.5] },
  bath_salt: { idx: 41, kind: "bathhouse", text: "SALT BATHS", region: null, w: 64, h: 64, posts: [-3.0] },
  bath_steam: { idx: 42, kind: "bathhouse", text: "STEAM HOUSE", region: null, w: 64, h: 64, posts: [-18.0, 12.5, 17.5] },
  bath_stone: { idx: 43, kind: "bathhouse", text: "THERMAE", region: null, w: 64, h: 64, posts: [0.0] },
};
export const TOWN_SIGN_KEYS = Object.keys(TOWN_SIGNS);

/** Art scale per kind, whole numbers only (the brief: "If you scale, use nearest-neighbour and a whole-number factor").
 *  The city boards (192 x 112) read at 1:1 -- checked in screenshots of every approach. The town, village and hamlet
 *  boards (96 x 64, Little Gale 112 x 72) and the bathhouse signs (64 x 64) did not: their lettering is four or five
 *  art pixels tall and came out as a smudge at the outdoor zoom, so they are drawn at 2x, which puts them at about a
 *  character's height and their words at the size the city boards' are. */
export const TOWN_SIGN_SCALE = { 'city': 1, 'bandit city': 1, 'city (former name)': 1, 'town': 2, 'village/hamlet': 2, 'bathhouse': 2 };
export function townSignScale(key) {
  const s = TOWN_SIGNS[key];
  return (s && TOWN_SIGN_SCALE[s.kind]) || 1;
}

/** A post's collision disc (world units): "solid only at the posts". */
export const TOWN_SIGN_POST_R = 7;

/** The sign key a settlement's name carries: "Fenn Cross" -> fenn_cross, "Karsk Landing" -> karsk_landing. */
export function settlementSignKey(name) {
  return String(name || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** The board a settlement shows now. `bandit` -- a bandit city; `cleared` -- liberated. Null where none was drawn. */
export function townSignFor(st, { cleared = false } = {}) {
  if (!st) return null;
  const k = settlementSignKey(st.name);
  if (st.bandit) {
    const want = cleared ? `${k}_former` : k;
    return TOWN_SIGNS[want] ? want : null;
  }
  return TOWN_SIGNS[k] ? k : null;
}

/** How many roads in get a sign: every major road for a city (up to four), one for a town, village or hamlet. */
export function signsPerSettlement(st) {
  return st && st.kind === 'city' ? 4 : 1;
}

// ---------------------------------------------------------------------------
// BATHHOUSES -- the brief's suggestions, deterministic per building.
// ---------------------------------------------------------------------------
export const BATH_STYLE_BY_REGION = {
  nek: 'bath_rustic', elehyd: 'bath_rustic', cinder: 'bath_copper', bratugal: 'bath_steam',
  ontaria: 'bath_salt', sirukh: 'bath_salt', ixcuatl: 'bath_stone',
};
/** "capital and Harrowmoor districts" wear marble; Slagward copper; Vashra the steam house. */
export const BATH_STYLE_BY_SETTLEMENT = { nek_city: 'bath_marble', ont_city: 'bath_marble', cin_slag: 'bath_copper', bra_city: 'bath_steam' };
export function bathSignFor({ settlement = null, region = null, magic = false, ruin = false } = {}) {
  if (magic) return 'bath_magic';
  if (ruin) return 'bath_stone';
  return BATH_STYLE_BY_SETTLEMENT[settlement] || BATH_STYLE_BY_REGION[region] || 'bath_hanging';
}

/** The posts' world positions for a sign whose foot is at (x, y): a post `p` art pixels right of the foot is p x scale
 *  screen pixels right, which is world (+X/2, -X/2) (the art faces the camera). */
export function townSignPosts(key, x, y) {
  const s = TOWN_SIGNS[key];
  const k = townSignScale(key);
  return (s ? s.posts : [0]).map(p => ({ x: x + (p * k) / 2, y: y - (p * k) / 2, radius: TOWN_SIGN_POST_R }));
}

export function townSignFaults(settlements = []) {
  const out = [];
  if (TOWN_SIGN_KEYS.length !== 44) out.push(`${TOWN_SIGN_KEYS.length} signs, the brief has 44`);
  const idx = new Set(TOWN_SIGN_KEYS.map(k => TOWN_SIGNS[k].idx));
  if (idx.size !== TOWN_SIGN_KEYS.length) out.push('two signs share a cell');
  for (const st of settlements) {
    if (st.kind === 'ruin') continue;
    const k = townSignFor(st);
    if (!k) out.push(`${st.id} (${st.name}) has no sign`);
    if (st.bandit && !TOWN_SIGNS[`${settlementSignKey(st.name)}_former`]) out.push(`${st.name} has no former-name board`);
  }
  return out;
}
