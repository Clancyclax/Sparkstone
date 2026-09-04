// ===========================================================================
// ROUND 78 -- WHAT GOES WHERE, BY NUMBER.
//
// Round 77 rendered every tile in the game to a numbered contact sheet so the
// user could "sort by number what should be placed where". They did, in
// fourteen instructions, and this file is those instructions.
//
// -------------------------------------------------------------------------
// THE NUMBERS ARE THE CONTRACT
// -------------------------------------------------------------------------
// A global tile number is a handle the user has written down. So TILE_SETS is
// append-only: a new pack goes on the END and every number already in use
// keeps meaning what it meant. Nothing is ever removed from an atlas and no
// frame is ever renumbered.
//
// "Eliminated" therefore means NOT PLACED, on the user's own answer when
// asked: the frame stays in its sheet, keeps its number, and the world
// generator stops selecting it. Re-including one later is one entry in one
// list, and the sheet the user sorted stays true forever.
//
// -------------------------------------------------------------------------
// LAYERS, BECAUSE THAT IS THE VOCABULARY THE INSTRUCTIONS USE
// -------------------------------------------------------------------------
// The user did not describe a flat random mix. They wrote:
//
//   "29, 36, and 34 should be the MAJORITY of tiles in region 2 wilderness,
//    with PATCHES of 31 and 37 MIXED TOGETHER, LARGE PATCHES of 43, and mixed
//    patches of 40 and 41. 32 and 33 should be placed RARELY AND RANDOMLY."
//
// Four different distributions in one sentence, and only the last is a
// per-tile roll. A patch is a coherent blob -- pick the blob, then pick a
// frame inside it -- which the scene has had since round 4 as `patchPick` for
// exactly this reason ("a ~6-tile patch shares one group... patches of
// consistent tone with real variety inside them"). This generalises that: a
// layer names its frames, its weight, and the SIZE of blob it comes in.
//
//   patch: 0    per tile. "rarely and randomly".
//   patch: n    blobs about n tiles across, all of one layer.
//
// Weights are relative within a role. A layer with `rare: true` is rolled
// per-tile against its own small chance and short-circuits the rest, which is
// what "placed rarely and randomly" means and what a weight cannot express --
// a weight of 1 against 40 is still a blob's worth of tiles when it wins.
// ===========================================================================

import { tileVariantHash } from './iso.js';

// ---------------------------------------------------------------------------
// THE SETS, IN NUMBER ORDER. Append only.
// ---------------------------------------------------------------------------
// `key` is the Phaser texture key the scene loads the sheet under, so a plan
// entry can name a set and the renderer needs no second table to resolve it.
//
// ROUND 78 -- city_stone and dock_wood are HERE and were missing from round
// 77's sheet, which is why that sheet said 288 and this says 320. Both are
// loaded and drawn by the running game (`cityStone` is every paved street and
// the grey half of every plaza; `dockWood` is the Ontaria jetty), and both
// were left out because round 77 built its list from a hand-written set list
// rather than from what the scene loads. They are appended rather than
// inserted, so numbers 1-288 are exactly what the user already sorted.
export const TILE_SETS = [
  { key: 'grassTile', file: 'grassTileAtlas.png', title: 'Grass', count: 28 },
  { key: 'region_meadow', file: 'region_meadow.png', title: 'Meadow', count: 16 },
  { key: 'region_grass_plank', file: 'region_grass_plank.png', title: 'Grass + plank', count: 16 },
  { key: 'region_jungle_soil', file: 'region_jungle_soil.png', title: 'Jungle soil', count: 16 },
  { key: 'region_swamp', file: 'region_swamp.png', title: 'Swamp', count: 16 },
  { key: 'region_mountain', file: 'region_mountain.png', title: 'Mountain', count: 16 },
  { key: 'region_ice_rune', file: 'region_ice_rune.png', title: 'Ice + rune', count: 16 },
  { key: 'region_slate_dark', file: 'region_slate_dark.png', title: 'Dark water', count: 16 },
  { key: 'region_water', file: 'region_water.png', title: 'Water (pack)', count: 16 },
  { key: 'waterLightTile', file: 'water_light.png', title: 'Water, shallow', count: 4 },
  { key: 'waterDeepTile', file: 'water_deep.png', title: 'Water, deep', count: 4 },
  { key: 'waterRapidsTile', file: 'water_rapids.png', title: 'Water, rapids', count: 4 },
  { key: 'waterFallsTile', file: 'water_falls.png', title: 'Water, falls', count: 4 },
  { key: 'pathTile', file: 'path_tile.png', title: 'Path / gravel', count: 28 },
  { key: 'streetTile', file: 'street_tile.png', title: 'Street', count: 24 },
  { key: 'cityTile', file: 'city_tiles.png', title: 'City paving', count: 32 },
  { key: 'gardenTile', file: 'garden_tile.png', title: 'Garden bed', count: 16 },
  { key: 'templeFloor', file: 'temple_floor_tiles.png', title: 'Temple floor', count: 16 },
  // --- appended in round 78; numbers 289 and up ---
  { key: 'cityStone', file: 'city_stone.png', title: 'City stone (herringbone)', count: 16 },
  { key: 'dockWood', file: 'dock_wood.png', title: 'Dock planking', count: 16 },
];

// Global number <-> (set, frame). Built once; the numbering is the contract, so
// it is derived from ONE list rather than written down twice.
const _first = new Map();
{
  let n = 1;
  for (const s of TILE_SETS) { _first.set(s.key, n); n += s.count; }
}
export const TILE_TOTAL = TILE_SETS.reduce((a, s) => a + s.count, 0);

/** The global number of a frame, for a suite or a contact sheet. */
export function tileNumber(setKey, frame) {
  const f = _first.get(setKey);
  return f === undefined ? null : f + frame;
}
/** And back: `{ setKey, frame }`, or null for a number nothing owns. */
export function tileAt(number) {
  for (const s of TILE_SETS) {
    const f = _first.get(s.key);
    if (number >= f && number < f + s.count) return { setKey: s.key, frame: number - f };
  }
  return null;
}
/** Frames of a set, given as GLOBAL numbers. Lets a plan be written in the
 *  numbers the user actually sorted rather than in frame indices, which is the
 *  difference between a table that can be checked against their message and one
 *  that has to be translated first. */
function n2f(setKey, numbers) {
  const first = _first.get(setKey);
  return numbers.map(x => x - first);
}

// ===========================================================================
// ELIMINATED -- by global number, transcribed straight from the instructions.
// ===========================================================================
// Kept as ONE list rather than folded into the plans below, because "these are
// never placed" is a different claim from "this role uses these" and a suite
// should be able to check it directly against the world.
export const ELIMINATED = [
  // 7.1  "Tiles 1 through 16 should be eliminated"
  ...range(1, 16),
  // 7.3  "Tiles 30, 38, 39, 42, and 44 should be eliminated"
  30, 38, 39, 42, 44,
  // 7.6  "tiles 131 & 139 should be eliminated"
  131, 139,
  // 7.7  "201-216 should be eliminated"
  ...range(201, 216),
  // 7.8  the thirteen city-paving frames
  241, 242, 243, 245, 246, 248, 249, 250, 252, 253, 254, 255, 256,
  // 7.10 "274, 274, 277, 281, & 282 should be eliminated"
  //
  // 274 IS LISTED TWICE and 273 is not listed at all, which is almost
  // certainly a typo for one of the two. Only the number actually written is
  // eliminated: guessing at 273 would remove a tile on my reading of a slip,
  // and re-including one is a one-line change while a tile quietly missing
  // from the world is not something anyone would notice.
  274, 277, 281, 282,
  // 7.14 "173-177 should be eliminated, 182-185 should be eliminated,
  //       195-197 should be eliminated"
  ...range(173, 177), ...range(182, 185), ...range(195, 197),
  // 7.15 "157-160 should be eliminated"  -- the whole shallow-water sheet.
  ...range(157, 160),
  // ===================================================================
  // ROUND 89 -- 164 AND 172 ARE BLANK PNG FRAMES, AND THEY HAVE BEEN
  // PUNCHING HOLES IN EVERY RIVER IN THE GAME.
  //
  // Measured, not inferred: `water_deep.png` and `water_falls.png` are both
  // 256x32 -- four 64x32 frames -- and the FOURTH frame of each contains
  // 0 opaque pixels out of 2048. The other two water sheets are fine.
  //
  // Nothing draws in the hole, so the camera background shows through it:
  // OUTDOOR_BG is '#3a5a3a', which is exactly the flat dark olive the
  // screenshot shows sitting in the middle of the river. A quarter of every
  // deep-water tile and a quarter of every shallow tile in The Nek (whose
  // shallows plan draws from waterFallsTile) came out as a diamond-shaped
  // hole in the water.
  //
  // HOW IT GOT IN, because the history is the lesson. WorldScene.js:824 used
  // to say WATER_DEEP_COUNT = 3 and WATER_FALLS_COUNT = 3. Round 78 raised
  // both to 4 and left a comment celebrating that "one frame of each has
  // never been drawn in seventy-four rounds". It had never been drawn
  // because it is empty. The 3 was not a bug being fixed; it was the bug
  // being introduced, and the evidence for the change was the symptom of the
  // thing that made the change wrong.
  //
  // Round 83 then found the empty frame while palette-shifting the sewer,
  // wrote it down in ROUND83_NOTES.md -- "harmless in the river, where the
  // plan never picks it" -- and fixed the sewer only. That sentence is
  // false: TILE_WATER_DEEP has no plan at all, it is a bare pickAllowed over
  // all four frames. The bug was seen, described, and reasoned past.
  //
  // Eliminated here rather than by re-cropping the PNGs, because this list
  // is the one place the project already means "never place this" and a
  // suite can check it. test_round89 additionally asserts that no ALLOWED
  // frame of any water sheet is empty, so the next art drop with a blank
  // frame fails a test instead of appearing in a river six rounds later.
  164, 172,
];
function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }
export const ELIMINATED_SET = new Set(ELIMINATED);

/**
 * A set with EVERY frame eliminated, on purpose, because something else took
 * its job. Not a fallback and not a mistake -- a declaration.
 *
 * 7.15 does both halves of one move in one sentence: "157-160 should be
 * eliminated, 169-172 should be used as shallows". 157-160 is the whole of
 * `water_light.png`, so the shallow-water sheet is retired and the FALLS sheet
 * becomes the shallows. Without this list, `allowedFrames` sees a set with
 * nothing left, assumes a transcription error and falls back to the whole set
 * -- which would quietly put every eliminated tile straight back in the world.
 * The difference between "retired" and "broken" has to be written down.
 */
export const RETIRED_SETS = new Set(['waterLightTile']);

/** Is this frame allowed to appear in the world at all? */
export function tileAllowed(setKey, frame) {
  const n = tileNumber(setKey, frame);
  return n !== null && !ELIMINATED_SET.has(n);
}

/**
 * Every frame of a set that is still allowed, as frame indices.
 *
 * THIS IS THE WORKHORSE, and it exists because the eliminations are spread
 * across seven different sets that the renderer reaches by seven different
 * routes -- the path under a road, the paving in a plaza, the shallow water at
 * a lake edge. Every one of those routes was `hash % COUNT`, which cannot
 * express a hole. Replacing each with a pick from this list means one rule
 * covers all of them and a set with no eliminations behaves exactly as before.
 *
 * Memoised because it is called from the ground renderer, which runs over
 * every tile in the viewport.
 */
const _allowed = new Map();
export function allowedFrames(setKey) {
  let a = _allowed.get(setKey);
  if (a) return a;
  const s = TILE_SETS.find(x => x.key === setKey);
  if (!s) return null;
  a = [];
  for (let i = 0; i < s.count; i++) if (tileAllowed(setKey, i)) a.push(i);
  // A set eliminated down to nothing renders as a blank hole in the world,
  // which is worse than the tile the user wanted gone -- UNLESS it was retired
  // on purpose, in which case nothing should ever ask for it and falling back
  // would put every eliminated frame straight back on screen.
  if (!a.length && !RETIRED_SETS.has(setKey)) {
    a = []; for (let i = 0; i < s.count; i++) a.push(i);
  }
  _allowed.set(setKey, a);
  return a;
}

/** Pick an allowed frame of a set by hash. The drop-in for `hash % COUNT`. */
export function pickAllowed(setKey, hash) {
  const a = allowedFrames(setKey);
  if (!a || !a.length) return 0;
  return a[hash % a.length];
}

// ===========================================================================
// THE PLANS
// ===========================================================================
// A plan is a list of layers. `pickFromPlan` walks it: rare layers first (each
// rolled per tile against its own chance), then the weighted patch layers.
//
// Every `frames` list is written in GLOBAL NUMBERS and converted once at load,
// so this table can be read side by side with the user's message.

// ROUND 89 -- A LAYER CANNOT NAME AN ELIMINATED FRAME.
//
// ELIMINATED's own header says it is "these are never placed", and it was not
// true: `pickAllowed` consulted it but a PLAN did not, because plans list
// global numbers directly and `n2f` only subtracts the set's first index. So
// The Nek's shallows plan named 172 -- the blank fourth frame of
// water_falls.png -- and drew it a quarter of the time, straight through the
// eliminated list that exists to stop exactly that.
//
// Filtering here makes the one list authoritative for both paths, which is
// what a reader of that header would already believe. A layer that filters
// down to nothing keeps its first number rather than becoming an empty list:
// an empty `frames` would make `pickFromPlan` return undefined and put a hole
// in the ground, which is the failure this whole change is about.
const L = (setKey, numbers, opts = {}) => {
  const kept = numbers.filter(x => !ELIMINATED_SET.has(x));
  const use = kept.length ? kept : numbers.slice(0, 1);
  return {
    set: setKey,
    frames: n2f(setKey, use),
    numbers: use,
    weight: opts.weight === undefined ? 1 : opts.weight,
    patch: opts.patch === undefined ? 6 : opts.patch,
    rare: opts.rare || 0,
  };
};

export const TILE_PLANS = {
  // ---------------------------------------------------------------- 7.4 ---
  // "tiles 29, 36, and 34 should be the majority of tiles in region 2
  //  wilderness, with patches of 31 and 37 mixed together, large patches of
  //  43, and mixed patches of 40 and 41. 32 and 33 should be placed rarely
  //  and randomly."
  //
  // Weight 12 against 3/3/2 makes the first layer the majority without making
  // it the only thing -- measured over a region, about 60% of ground. The
  // "large" patch of 43 is 14 tiles across against the ordinary 6.
  //
  // Tile 35 is in neither the majority, the patches nor the eliminated list,
  // so it is simply not placed. Called out here rather than silently dropped:
  // it is the one frame of this pack the instructions do not mention.
  ontaria_ground: [
    L('region_meadow', [29, 36, 34], { weight: 12, patch: 7 }),
    L('region_meadow', [31, 37], { weight: 3, patch: 6 }),
    L('region_meadow', [43], { weight: 3, patch: 14 }),
    L('region_meadow', [40, 41], { weight: 2, patch: 6 }),
    L('region_meadow', [32, 33], { rare: 0.02, patch: 0 }),
  ],

  // ---------------------------------------------------------------- 7.2 ---
  // "Tiles 23, 24, and 25 should be mixed along rivers and small lakes in
  //  region 1, 2, and 4."
  //
  // A BANK role rather than a ground layer: it applies within a few tiles of
  // water and nowhere else, so it needs the geometry the scene has and this
  // table does not. The scene asks for `bank` when it is near water and for
  // `ground` when it is not.
  bank: [
    L('grassTile', [23, 24, 25], { weight: 1, patch: 4 }),
  ],

  // ---------------------------------------------------------------- 7.6 ---
  // "125-140 should be used as the water tiles in Bratugal, however tiles 131
  //  & 139 should be eliminated, and tile 140 should be rare."
  //
  // 131 and 139 are in ELIMINATED above; 140 gets its own rare layer so it
  // appears as an occasional single tile rather than as a patch.
  bratugal_water: [
    L('region_slate_dark', [125, 126, 127, 128, 129, 130, 132, 133, 134, 135, 136, 137, 138], { weight: 1, patch: 5 }),
    L('region_slate_dark', [140], { rare: 0.03, patch: 0 }),
  ],

  // ---------------------------------------------------------------- 7.9 ---
  // "244, 247, 251 should be used for the full city of Vashra and the roads in
  //  Bratugal."
  //
  // ROUND 80 (item 1.3) -- SUPERSEDED FOR THE CITY FLOOR, KEPT FOR THE ROADS.
  //
  // The instruction had one plan doing two jobs, and the user has now split
  // them: "Bratugal should use the red brick tile for the full city floor."
  // So Vashra's floor moves to `vashra_city_floor` below and this stays what
  // it also always was -- the paving on Bratugal's roads.
  bratugal_paving: [
    L('cityTile', [244, 247, 251], { weight: 1, patch: 0 }),
  ],

  // ---------------------------------------------- ROUND 80, items 1.2/1.3 ---
  // "Ontaria should use the grey city tile for the city floor."
  // "Bratugal should use the red brick tile for the full city floor."
  //
  // THE TWO HALVES OF ONE SHEET. `city_tiles.png` is 32 frames in two blocks
  // of sixteen -- global 225-240 is the red brick and 241-256 is the grey
  // dressed stone (CITY_RED_FRAMES / CITY_GREY_FRAMES in tiles37.js). The user
  // is naming those two blocks, so each plan is one of them and neither picks
  // frames by taste.
  //
  // The grey block is the one 7.8 cut down: thirteen of its sixteen are
  // eliminated and 244, 247 and 251 survive, so "the grey city tile" is those
  // three and this plan is deliberately identical to `bratugal_paving`. Two
  // names for the same three frames, because they are now two different
  // instructions and one of them will move again.
  //
  // The red block has no eliminations, so it is the full sixteen.
  harrowmoor_city_floor: [
    L('cityTile', [244, 247, 251], { weight: 1, patch: 0 }),
  ],
  vashra_city_floor: [
    L('cityTile', range(225, 240), { weight: 1, patch: 0 }),
  ],

  // --------------------------------------------------------- 7.12, 7.13 ---
  // "Karsk, and Harrowmoor should use 217, 218, and 219, as the base tiles"
  // "The roads in Elehyd should be made of 220, 221, and 222"
  //
  // Both come out of `street_tile.png`, WHICH NOTHING HAS EVER DRAWN. The
  // sheet has been loaded every session since round 30 and every reference to
  // it went to `cityTile` or `cityStone` instead -- 24 frames of the user's
  // art, present in memory, on screen never. These two instructions are the
  // first thing to ask for it.
  // ROUND 80 (item 1.2) -- HARROWMOOR HAS LEFT THIS PLAN. The name is kept
  // because it is what 7.12 asked for and Karsk Landing still uses it; only
  // Ontaria's routing moved, to `harrowmoor_city_floor`.
  karsk_harrowmoor_base: [
    L('streetTile', [217, 218, 219], { weight: 1, patch: 0 }),
  ],
  elehyd_road: [
    L('streetTile', [220, 221, 222], { weight: 1, patch: 0 }),
  ],

  // --------------------------------------------------------------- 7.15 ---
  // "157-160 should be eliminated, 169-172 should be used as shallows"
  //
  // The whole of `water_light.png` goes, and the FALLS sheet becomes the
  // shallows. Note 169-172 is four frames: the scene has declared
  // WATER_FALLS_COUNT = 3 since round 4, so one of these has never been drawn
  // either.
  shallows: [
    L('waterFallsTile', [169, 170, 171, 172], { weight: 1, patch: 0 }),
  ],

  // ---------------------------------------------------------------- 7.5 ---
  // "Tiles 109-124 should be in ice caves, small 'dungeons' available within
  //  region 3."
  ice_cave: [
    L('region_ice_rune', range(109, 124), { weight: 1, patch: 5 }),
  ],
};

// ---------------------------------------------------------------------------
// SELECTION
// ---------------------------------------------------------------------------
/**
 * Pick `{ key, frame }` from a plan for one tile.
 *
 * `hash` is the tile's own variant hash, which every other tile decision in
 * the game already uses -- so the same tile resolves the same way on every
 * reload with nothing stored, which is the property the whole world generator
 * is built on.
 *
 * Rare layers are tested FIRST and short-circuit. A rare tile competing on
 * weight would arrive in blobs the moment it won a patch, and "rarely and
 * randomly" is the opposite of that.
 */
export function pickFromPlan(planKey, tx, ty, hash) {
  const plan = TILE_PLANS[planKey];
  if (!plan || !plan.length) return null;
  for (let i = 0; i < plan.length; i++) {
    const l = plan[i];
    if (!l.rare) continue;
    // Its own independent roll, off a salt unique to this layer, so two rare
    // layers in one plan cannot correlate.
    if ((tileVariantHash(tx * 7 + i * 101, ty * 13 - i * 57) % 10000) < l.rare * 10000) {
      return { key: l.set, frame: l.frames[hash % l.frames.length] };
    }
  }
  const weighted = plan.filter(l => !l.rare);
  if (!weighted.length) return null;
  // The PATCH decides which layer, so a blob is all one layer; the tile's own
  // hash decides which frame inside it. Patch size comes from the layer the
  // blob lands on, which is circular by nature -- so the blob coordinate is
  // taken at the plan's COARSEST patch and the layer's own size then subdivides
  // it. That keeps a 14-tile layer genuinely large without letting a 6-tile
  // layer break it up.
  const coarse = Math.max(...weighted.map(l => l.patch || 1));
  // ===================================================================
  // THE BOUNDARY IS RAGGED, NOT RULED.
  //
  // `floor(tx / patch)` puts every patch edge on an exact tile boundary, and a
  // straight line in tile space is a straight DIAGONAL on an isometric screen
  // -- so the first screenshot of Ontaria's new ground had the meadow meeting
  // the flowered grass along a perfect diagonal running the width of the
  // frame. Round 4's patching got away with this because its three groups
  // differed in tone only; these layers are visibly different tiles, and the
  // seam is the first thing the eye finds.
  //
  // Jittering the coordinate by up to one tile before dividing costs nothing,
  // leaves the patch SIZE alone, and turns every edge into a ragged one -- the
  // tiles either side of a boundary each independently fall on their own side
  // of it. Derived from the tile's own hash, so it is as stable as everything
  // else here.
  const jx = (tileVariantHash(tx + 5501, ty - 8803) % 3) - 1;
  const jy = (tileVariantHash(tx - 2213, ty + 6607) % 3) - 1;
  const bx = Math.floor((tx + jx) / coarse), by = Math.floor((ty + jy) / coarse);
  const total = weighted.reduce((a, l) => a + l.weight, 0);
  let roll = tileVariantHash(bx + 9173, by - 4441) % total;
  let chosen = weighted[weighted.length - 1];
  for (const l of weighted) { roll -= l.weight; if (roll < 0) { chosen = l; break; } }
  // Subdivide: inside the coarse blob, a layer with a smaller patch varies
  // again at its own scale.
  let frames = chosen.frames;
  if (chosen.patch && chosen.patch < coarse && frames.length > 1) {
    // Jittered for the same reason as the coarse blob above.
    const sx = Math.floor((tx + jx) / chosen.patch), sy = Math.floor((ty + jy) / chosen.patch);
    const g = tileVariantHash(sx + 313, sy - 977) % frames.length;
    return { key: chosen.set, frame: frames[g] };
  }
  return { key: chosen.set, frame: frames[hash % frames.length] };
}

// ---------------------------------------------------------------------------
// 7.11 -- THE TEMPLE FLOORS, ONE COLOUR PER GOD
// ---------------------------------------------------------------------------
// "283, 287, and 288 should have filters applied for a variety of colors
//  (golds, reds, blacks, blues, greens) so that they can be more specific to
//  the god in question."
//
// A FILTER, not new art: the three frames are recoloured at load into one
// sheet per god, the same luminance-remap machinery round 76 used for the odd
// summons (see palettes.js `remapPixelsWithLut`). A tint would not do it --
// tint multiplies, so a gold tint on grey stone is grey-gold stone rather than
// gold; the remap throws the colour away and keeps only the shading.
//
// The colours are each god's OWN colour from gods.js rather than a palette
// invented here, so a temple floor and the god standing on it cannot disagree.
export const TEMPLE_FILTER_NUMBERS = [283, 287, 288];
export function templeFilterFrames() { return n2f('templeFloor', TEMPLE_FILTER_NUMBERS); }

// ---------------------------------------------------------------------------
// FAULTS
// ---------------------------------------------------------------------------
export function tilePlanFaults() {
  const out = [];
  // Every number named anywhere must exist.
  const check = (n, where) => { if (!tileAt(n)) out.push(`${where} names tile ${n}, which no set holds`); };
  for (const n of ELIMINATED) check(n, 'ELIMINATED');
  for (const [k, plan] of Object.entries(TILE_PLANS)) {
    for (const l of plan) {
      for (const n of l.numbers) {
        check(n, k);
        // THE CHECK THAT MATTERS: a plan may not place a tile the user
        // eliminated. Both lists are transcribed from the same message and
        // this is the one way they can contradict each other.
        if (ELIMINATED_SET.has(n)) out.push(`${k} places tile ${n}, which is eliminated`);
        // ...and every frame in a layer must come from the set the layer names.
        const at = tileAt(n);
        if (at && at.setKey !== l.set) out.push(`${k} puts tile ${n} (${at.setKey}) in a ${l.set} layer`);
      }
      if (!l.frames.length) out.push(`${k} has an empty layer`);
      if (l.rare && l.patch) out.push(`${k}: a rare layer may not also be a patch`);
    }
    // A plan of nothing but rare layers can return null for most tiles.
    if (!plan.some(l => !l.rare)) out.push(`${k} has no ordinary layer to fall back on`);
  }
  for (const n of TEMPLE_FILTER_NUMBERS) {
    check(n, 'TEMPLE_FILTER_NUMBERS');
    if (ELIMINATED_SET.has(n)) out.push(`temple filter names eliminated tile ${n}`);
  }
  // A set eliminated to nothing renders as a hole -- unless it was retired on
  // purpose and something else took its role. See RETIRED_SETS.
  for (const s of TILE_SETS) {
    let live = 0;
    for (let i = 0; i < s.count; i++) if (tileAllowed(s.key, i)) live++;
    if (!live && !RETIRED_SETS.has(s.key)) out.push(`${s.key} has every frame eliminated`);
    if (live && RETIRED_SETS.has(s.key)) out.push(`${s.key} is marked retired but still has ${live} live frames`);
  }
  // The numbering is the contract: it must be dense and start at 1.
  if (tileNumber(TILE_SETS[0].key, 0) !== 1) out.push('numbering does not start at 1');
  if (tileAt(TILE_TOTAL) === null) out.push('numbering is not dense to TILE_TOTAL');
  if (tileAt(TILE_TOTAL + 1) !== null) out.push('numbering runs past TILE_TOTAL');
  return out;
}
