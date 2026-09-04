// Tree art + procedural forest scatter, round 4. The user's own words:
// "Added a series of tree with multiple angles. Complete a pass to slightly
// recolor the trees in all the different angles. Then generate a randomized
// mix of these trees and angles and these should appear like a mostly
// natural forest." -- 10 species (5 of them named maple3-maple7, i.e. 5
// independent maple variants, not animation frames -- confirmed against the
// uploaded packs), each extracted by extract_round4_trees.py into a base
// atlas + 2 soft recolor variants (tree_<key>.png / _v1 / _v2), all
// single-row 8-column PixelLab "object" atlases (rotations only, same
// bottom_anchor_paste/PLAYER_DIR_ORDER convention as the round-3 fence
// prop) -- see that script's header comment for the full extraction
// rationale.
//
// TREE_ART holds each species' real native cell size (they're NOT padded to
// a shared size -- see the extraction script) plus the anchor point
// (footX/footY, matching the baseline_margin the atlas was built with) so
// WorldScene can bottom-anchor a placed tree exactly the same way buildings/
// NPCs/the fence already do.
// ROUND 20 -- the user's ask: "Trees need the size increased by about 200%."
// Trees were drawn at their native cell size (85-136px) against a ~40px
// player, which read as shrubs rather than as a forest. Applied as a display
// scale rather than by re-exporting the art, so the trunk-collision radius
// below scales with it from one number.
export const TREE_DISPLAY_SCALE = 2.6;

// ROUND 45 -- three new species join the same convention (one 8-column sheet
// per species+variant, native cell): a tall jungle tree and a swampy jungle
// tree for Bratugal, and a grey dead tree for Elehyd's badlands. They are in
// TREE_SPECIES so the atlas preloads them, but WHERE they grow is a region
// property -- see REGION_TREE_SPECIES below. A palm has no business in The
// Nek and a dead grey stick has none in a temperate forest.
export const TREE_SPECIES = ['aspen', 'dogwood', 'maple3', 'maple4', 'maple5', 'maple6', 'maple7', 'redwood', 'willow', 'pine',
  'jungletall', 'jungleswamp', 'deadgrey'];
export const TREE_VARIANTS = ['', '_v1', '_v2']; // '' = base recolor

const CELLS = { aspen: 113, dogwood: 85, maple3: 97, maple4: 124, maple5: 124, maple6: 124, maple7: 136, redwood: 136, willow: 113, pine: 113,
  jungletall: 136, jungleswamp: 136, deadgrey: 136 };

// Which species a region's forest draws from. A region absent here uses the
// temperate set, which is every species the game had before round 45 -- so
// The Nek and Ontaria are untouched by this addition.
const TEMPERATE = ['aspen', 'dogwood', 'maple3', 'maple4', 'maple5', 'maple6', 'maple7', 'redwood', 'willow', 'pine'];
export const REGION_TREE_SPECIES = {
  nek: TEMPERATE,
  ontaria: TEMPERATE,
  // "Desolate badlands and icy peaks" -- almost nothing grows, and what does
  // is dead. Pine survives as the one living species at the treeline.
  elehyd: ['deadgrey', 'deadgrey', 'deadgrey', 'pine'],
  // "Jungle, rainforest and swamp" -- the two jungle species carry it, with
  // redwood and willow as the temperate stand-ins that read closest to
  // rainforest canopy and hanging swamp growth.
  bratugal: ['jungletall', 'jungletall', 'jungleswamp', 'jungleswamp', 'redwood', 'willow'],
};
export function treeSpeciesFor(regionId) { return REGION_TREE_SPECIES[regionId] || TEMPERATE; }
const BASELINE_MARGIN = 2;

export const TREE_ART = {};
for (const key of TREE_SPECIES) {
  const cell = CELLS[key];
  const art = { cell, footX: cell / 2, footY: cell - BASELINE_MARGIN };
  for (const v of TREE_VARIANTS) TREE_ART[`${key}${v}`] = art;
}

// Every placed-tree art key -- WorldScene preloads one spritesheet per key
// (8 cols x 1 row, cell x cell each) and _buildForest picks a uniformly
// random one per placed tree, per the "randomized mix of these trees and
// angles" ask.
export const TREE_ART_KEYS = Object.keys(TREE_ART);

// Rough per-species world-space TRUNK collision radius -- deliberately much
// smaller than the canopy's visual size (a player should be able to walk
// under low branches / between canopies, just not through the trunk), and
// varies a little with the species' native art size so a redwood blocks a
// bit more than a dogwood.
// ROUND 62 -- THE USER: "Tree collision should be reduced by about 50%. This
// should reduce the chance of enemies spawning inside the object, as well as
// improve movement through thick forest."
//
// Round 20 set 0.09 of the art cell so the player could not walk through the
// bole. That was the right call for one tree and the wrong one for a forest:
// the collision circle is centred on the trunk but sized off the whole CANOPY
// cell, so a dense stand fused into a wall with no gaps a body could fit
// through, and every spawn check inside that wall failed.
//
// Halved. The bole is still solid -- a trunk is nowhere near half a canopy
// wide -- so nothing becomes walk-through; what opens up is the space BETWEEN
// trunks, which is where movement and spawning actually happen.
const TRUNK_RADIUS_FRAC = 0.045;
export function trunkRadiusFor(key) {
  const base = TREE_ART[key] ? TREE_ART[key].cell : 113;
  return Math.max(4, Math.round(base * TRUNK_RADIUS_FRAC * TREE_DISPLAY_SCALE));
}

// Deterministic hash, same shape as iso.js's tileVariantHash (different
// constants so the two don't correlate) -- used to seed both cluster
// density and per-tree jitter from plain (cx,cy)/(tx,ty) integers, so forest
// layout is stable across reloads with no stored state.
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h >>> 0;
}
function rand01(a, b, salt) {
  return hash2(a * 92821 + salt, b * 68917 + salt * 7) / 4294967295;
}

// Procedural "mostly natural forest" scatter across the wilderness ring.
// Shape: a coarse CLUSTER grid (clusterSize world units per cell) where each
// cluster cell independently rolls a density (0..1, hashed from its own
// coordinates) -- above a threshold it's a forest clump and gets several
// trees jittered around its center; below, it's open wilderness with none.
// This clumpy-with-gaps pattern reads as much more natural than an even
// per-tile scatter (real forests have thickets and clearings, not uniform
// density), while staying entirely deterministic/stateless.
//
// Stays out of the town (skips any cluster inside cityRadius + margin) and
// off the map edges (margin from the map boundary); does NOT independently
// avoid the fence/farmstead yard or individual monster spawn points --
// those are sparse enough, and far enough from the dense part of the
// cluster grid's typical spawn ring, that an occasional close tree reads as
// scenery rather than a placement bug. Returns plain descriptors (x, y,
// artKey, facing) -- WorldScene turns these into sprites/collision/
// occlusion entries.
// ROUND 19 -- `isBlocked(x, y)` lets the caller veto a position. Before this
// round the scatter knew nothing about the rest of the world, so trees grew
// in the middle of the river and straight through the cardinal paths. The
// predicate is supplied by WorldScene (which owns the tile map) rather than
// re-derived here, so there is exactly one source of truth for "what is at
// this spot".
// ROUND 45 -- `species` lets a caller hand in the region's own species list
// (treeSpeciesFor). Defaults to the full roster so every existing caller and
// test behaves exactly as before.
export function generateForest({ cityRadius, mapHalf, clusterSize = 500, margin = 250, isBlocked = null, species = null }) {
  const SPECIES = species && species.length ? species : TREE_SPECIES;
  const trees = [];
  const innerR = cityRadius + margin;
  const outerR = mapHalf - margin;
  const cMin = Math.floor(-outerR / clusterSize), cMax = Math.ceil(outerR / clusterSize);
  const facingOrder = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

  for (let cy = cMin; cy <= cMax; cy++) {
    for (let cx = cMin; cx <= cMax; cx++) {
      const centerX = (cx + 0.5) * clusterSize, centerY = (cy + 0.5) * clusterSize;
      const centerDist = Math.hypot(centerX, centerY);
      if (centerDist < innerR || centerDist > outerR) continue;

      const density = rand01(cx, cy, 1); // 0..1, this cluster's own roll
      if (density < 0.48) continue; // ~52% of cluster cells are open wilderness/clearings

      // Denser clusters (higher density roll) get more trees -- 3 to 9.
      const count = 3 + Math.floor(density * 7);
      for (let i = 0; i < count; i++) {
        const jx = (rand01(cx, cy, 100 + i * 2) - 0.5) * clusterSize;
        const jy = (rand01(cx, cy, 101 + i * 2) - 0.5) * clusterSize;
        const wx = centerX + jx, wy = centerY + jy;
        const dist = Math.hypot(wx, wy);
        if (dist < innerR || dist > outerR) continue; // a jittered point can still land just inside/outside the ring
        if (isBlocked && isBlocked(wx, wy)) continue;   // water, river bed, roads

        const speciesIdx = Math.floor(rand01(cx, cy, 200 + i * 3) * SPECIES.length) % SPECIES.length;
        const variantIdx = Math.floor(rand01(cx, cy, 201 + i * 3) * TREE_VARIANTS.length) % TREE_VARIANTS.length;
        const facingIdx = Math.floor(rand01(cx, cy, 202 + i * 3) * facingOrder.length) % facingOrder.length;
        const artKey = `${SPECIES[speciesIdx]}${TREE_VARIANTS[variantIdx]}`;
        trees.push({ x: wx, y: wy, artKey, facing: facingOrder[facingIdx] });
      }
    }
  }
  return trees;
}

// ROUND 19 -- trees INSIDE the town. The wilderness scatter deliberately
// stops at the city wall, which left the town itself completely treeless and
// reading as a paved grid rather than a place people live. This is a much
// sparser, tidier scatter over the town's own grass -- gardens and street
// trees, not forest -- and it leans on the same isBlocked predicate to stay
// off roads, out of the plaza and clear of the buildings.
//
// Deliberately NOT merged into generateForest: the two want opposite
// densities and opposite clumping, and folding them together would mean one
// set of tuning constants serving neither well.
// ROUND 45 -- `species` here for the same reason generateForest has it: the
// capital's street trees were picking from the full roster, so once the
// roster gained jungle palms and dead grey wood, Cadence started growing
// them. A street tree is still a tree of the region it stands in.
export function generateTownTrees({ cityRadius, isBlocked = null, spacing = 260, species = null }) {
  const trees = [];
  const SPECIES = species && species.length ? species : TREE_SPECIES;
  const facingOrder = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  const n = Math.ceil(cityRadius / spacing);
  for (let gy = -n; gy <= n; gy++) {
    for (let gx = -n; gx <= n; gx++) {
      const roll = rand01(gx, gy, 4242);
      if (roll < 0.55) continue; // most cells stay empty -- this is a town, not a wood
      const jx = (rand01(gx, gy, 4243) - 0.5) * spacing * 0.8;
      const jy = (rand01(gx, gy, 4244) - 0.5) * spacing * 0.8;
      const wx = gx * spacing + jx, wy = gy * spacing + jy;
      if (Math.hypot(wx, wy) > cityRadius - 120) continue;
      if (isBlocked && isBlocked(wx, wy)) continue;
      const s2 = Math.floor(rand01(gx, gy, 4245) * SPECIES.length) % SPECIES.length;
      const v2 = Math.floor(rand01(gx, gy, 4246) * TREE_VARIANTS.length) % TREE_VARIANTS.length;
      const f2 = Math.floor(rand01(gx, gy, 4247) * facingOrder.length) % facingOrder.length;
      trees.push({ x: wx, y: wy, artKey: `${SPECIES[s2]}${TREE_VARIANTS[v2]}`, facing: facingOrder[f2] });
    }
  }
  return trees;
}
