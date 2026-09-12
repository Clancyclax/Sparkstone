// ROUND 43 -- THE FOUR REGIONS OF PALLIMUSTUS.
//
// The user's world design, encoded. Everything the world generator needs to
// build a region lives here as data: where it sits in the world grid, what
// its ground is made of, which settlements stand in it, where its water and
// roads run, which ranks of monster live there and in what group sizes, and
// what it takes to leave.
//
// -----------------------------------------------------------------------
// WHY ONE ARRAY AND NOT FOUR MAPS
// -----------------------------------------------------------------------
// The tile map is a flat Uint8Array and anything outside it has no floor at
// all (the round-36 temples proved that the hard way -- they sat outside the
// array and rendered as black rooms for five rounds). So all four regions
// live in ONE array as a 2x2 grid of REGION_TILES squares, with a reserved
// INTERIOR BAND of rows below them for every interior. Travel between
// regions is a gate, a ship or a portal -- never a walk across a border --
// so their grid adjacency is bookkeeping, not geography.
//
// -----------------------------------------------------------------------
// RANK IS THE REGION'S PROPERTY, NOT THE DISTANCE'S
// -----------------------------------------------------------------------
// Round 41 capped coin rank by distance band. From here the REGION sets the
// band and distance-from-arrival only shifts the mix inside it: The Nek is
// Normal/Iron wherever you stand, Bratugal is Bronze/Silver/Gold wherever
// you stand. `spawnGroups[].from` is the fraction of the region's radius at
// which a group starts appearing, which is what "the standard danger
// increasing as you move farther away from the spawn point" means once rank
// itself is fixed by where you are in the world.
//
// -----------------------------------------------------------------------
// PACKS AND SUPER PACKS
// -----------------------------------------------------------------------
// The user, verbatim: "When I say 'packs' and 'super packs' I'm referring to
// groups of the same monster together. The intent is to allow players to
// feel how much stronger their abilities are getting as they move from
// killing 1-2 of a creature to dozens, while also demonstrating how much
// tougher enemies are getting at each rank." So a group is one SPECIES
// repeated, and the size band is the whole point: 10-30 of a rank you have
// outgrown, 2-8 of your own rank, 1 of the rank above you.
//
// TIERS ARE RANKS. monsterThreatTier returns 0-4 and the coin ladder already
// reads that as normal/iron/bronze/silver/gold (monsters.js
// COIN_RANK_BY_TIER). DIAMOND IS DELIBERATELY ABSENT -- the user's note:
// "no region is actually diamond rank and no monsters should be diamond
// rank", so tier 4 (gold) is the ceiling anywhere in the world.

import { TILE } from './iso.js';
// ROUND 134 (item 6) -- the desktop editor's overlay. A leaf module: it
// imports nothing, so this file importing it cannot create a cycle.
import { applyRegionEdits } from './regionEdits.js';

// One new tile id beyond the ones town.js (0-7) and interiors.js (8-11) own:
// a region's ROUGH ground -- Elehyd's icy peaks, Bratugal's bog. It renders
// from whichever pack that region names as its accent, so one id covers
// every biome's second surface.
export const TILE_ACCENT = 12;

// ===========================================================================
// ROUND 134 (item 6) -- WHAT A PAINT STROKE MAY BE MADE OF.
//
// The user asked for a region's terrain -- "biomes and coastline" -- to be
// editable in the desktop editor. A region's `terrain` array is a list of
// painted rectangles, each naming one of these; `_stampTerrainPatch` in
// WorldScene writes them into `tileType` after every generator has had its
// say, so a stroke is a correction that wins.
//
// A SHORT LIST, ON PURPOSE. `tileType` carries eighteen values and most of
// them are not terrain: TILE_CITY, TILE_STREET, TILE_PLAZA and TILE_DOCK are
// things a settlement or a jetty STAMPS and mean "a town is here", so
// painting one would claim a town that does not exist -- the streets would
// draw and nothing would stand on them. TILE_VOID is the dark beyond a room
// and TILE_GARDEN belongs to the soul space.
//
// What is left is the five surfaces a coastline and a biome band are actually
// made of: ground, rough ground, and the three depths of water. That is
// enough to widen a bay, cut an inlet, run a shoal along a shore, or push a
// band of peaks another mile south -- which is the whole of what was asked.
//
// Keyed by a WORD rather than by the number. A data file full of `type: 5` is
// a data file nobody can review, and this one is meant to be read in a diff.
export const TERRAIN_PAINT = {
  ground: { code: 0, label: 'Ground' },          // TILE_GRASS
  rough: { code: 12, label: 'Rough ground' },    // TILE_ACCENT -- peaks, bog
  shallows: { code: 4, label: 'Shallow water' },  // TILE_WATER_LIGHT
  deep: { code: 5, label: 'Deep water' },         // TILE_WATER_DEEP
  rapids: { code: 6, label: 'Rapids' },           // TILE_WATER_RAPIDS
};
export const TERRAIN_PAINT_KEYS = Object.keys(TERRAIN_PAINT);
/** The lookup the rasteriser uses: word -> tile id. */
export const TERRAIN_PAINT_CODES = Object.fromEntries(
  Object.entries(TERRAIN_PAINT).map(([k, v]) => [k, v.code]));
/** The widest single stroke, in tiles. A region is 1024 across; a stroke that
 *  could cover a quarter of it is a stroke somebody made by accident. */
export const TERRAIN_PATCH_MAX = 128;

/**
 * Faults in one region's `terrain` array.
 *
 * Same shape and same job as `placedFaults`: a patch that names a type the
 * rasteriser does not know draws nothing and says nothing, which is this
 * project's most repeated fault and the one worth a check every time.
 */
export function terrainFaults(region, regionTiles = 1024) {
  const out = [];
  (region.terrain || []).forEach((t, i) => {
    const at = `${region.id}.terrain[${i}]`;
    if (!t || typeof t !== 'object') { out.push(`${at} is not a patch`); return; }
    if (!TERRAIN_PAINT[t.type]) {
      out.push(`${at} paints '${t.type}'; the types are ${TERRAIN_PAINT_KEYS.join(', ')}`);
    }
    if (!t.at || typeof t.at.tx !== 'number' || typeof t.at.ty !== 'number') {
      out.push(`${at} has no position`); return;
    }
    const w = t.w === undefined ? 1 : t.w;
    const h = t.h === undefined ? 1 : t.h;
    for (const [n, v] of [['w', w], ['h', h]]) {
      if (!Number.isFinite(v) || v < 1 || v > TERRAIN_PATCH_MAX) {
        out.push(`${at} has ${n}=${v}; a patch is 1-${TERRAIN_PATCH_MAX} tiles`);
      }
    }
    if (t.at.tx < 0 || t.at.ty < 0
      || t.at.tx + w > regionTiles || t.at.ty + h > regionTiles) {
      out.push(`${at} runs from ${t.at.tx},${t.at.ty} for ${w}x${h}, off the region`);
    }
  });
  return out;
}

// ROUND 45 -- FRAME SUBSETS.
//
// The eight region packs shipped in round 37 and were wired up in round 43 by
// NAME, on the assumption that a pack's sixteen tiles are sixteen variants of
// one material. Two of them are not, and looking at regions 3 and 4 on screen
// this round made that obvious:
//
//   'mountain' is four different biomes in one pack -- grey rock (0-3, 13),
//   snow and ice (4-7, 14-15) and desert sand (8-12). Picking uniformly from
//   all sixteen scattered snow, stone and dune across the same hillside like
//   confetti.
//
//   'slate_dark' is not slate at all: it is dark, rippling, murky WATER, fish
//   included. Elehyd named it as its GROUND, so the entire badlands region
//   was rendering as the bottom of a lake.
//
// So a region can now name a subset of a pack's frames per role rather than
// the whole pack. Absent an entry, all of a pack's frames are used, which is
// what every other pack wants.
export const PACK_FRAMES = {
  mountain: {
    // Bare rock and stone for the ground you walk on...
    ground: [0, 1, 2, 3, 13, 15],
    // ...snow and ice for the peaks (TILE_ACCENT).
    accent: [4, 5, 6, 7, 14, 15],
    // ROUND 77 -- ...and the desert. See `desert` on Elehyd below.
    //
    // Round 45 identified frames 8-12 as desert sand and correctly kept them
    // OUT of both roles, because mixing dunes into a snowfield by hash is what
    // it was fixing. What it could not do was give them anywhere else to go,
    // so they have been loaded and drawn zero times for thirty-two rounds --
    // found by rendering all 288 tiles side by side for item 3, which is the
    // second time this round that looking at the art rather than the code
    // turned up something the code could not show.
    //
    // It matters because the user calls Elehyd "region 3's mountainous desert"
    // and has now sent fifty cacti for it, and the desert was not there: the
    // first screenshots of the new flora are saguaros standing on snow.
    desert: [8, 9, 10, 11, 12],
  },

  // ROUND 103 -- THE SCREAMING BRAIN SETS ARE VARIETY PACKS, NOT BIOME PACKS,
  // so every one of them needs a subset here or it reads as a patchwork quilt.
  //
  // "Dry" is sand AND cracked clay AND olive scrub AND grey gravel AND pink
  // stone -- six grounds, not six shades of one. Tiled at random it
  // checkerboards; grouping by luminance (the GRASS_TILE_GROUPS trick) only
  // half fixes it, because the spread is in HUE. Measured and then looked at,
  // which is the only way any of this was ever going to be decided.
  //
  // These subsets were FIRST picked by measuring mean hue, luminance and
  // saturation per tile. That failed: `sirukh` still checkerboarded, because a
  // saturation threshold cannot tell pink clay from cream sand when both are
  // pale and both are warm. The lists below were picked BY EYE off labelled
  // contact sheets (tools/label_sbs_sheet.py), which took twenty minutes and
  // is the only method that has ever worked on this pack.
  // A `groundGroups` entry, where present, is used INSTEAD of `ground` and is
  // read through patchPick: a low-frequency hash picks the group for a 6x6
  // patch, the tile's own hash picks within it. `ground` stays as the flat
  // union for anything that asks for the role directly.
  //
  // This is the other half of the checkerboard, and curation alone would not
  // have fixed it: the pack draw picked `subset[hash % subset.length]` per
  // tile with nothing tying neighbours together, so even eight tiles of one
  // hue alternated hard. Grouping also promotes the strongest tiles from
  // noise to terrain -- the dune ripples now arrive in fields of them, which
  // is what a dune is.
  sbs_dry: {
    // Cream and ochre sand. No clay reds (12, 26), no olive scrub (1, 19, 25),
    // no grey gravel (10, 13, 14, 15).
    ground: [2, 6, 21, 23, 24, 30, 31, 32, 33],
    // A GROUP HAS TO AGREE WITH ITSELF. The first pass grouped by "sand",
    // which put peach 2 next to yellow 21 next to cream 24 next to pink 31 --
    // patched, and still checkering inside every patch. The difference goes
    // BETWEEN groups; within a group the tiles have to be near enough to
    // interchangeable that the variation reads as grain.
    //
    // Repeated entries weight the roll: patchPick picks a group uniformly, so
    // the pale flats appear twice and carry 2/7 of the island each, and the
    // dune field is one seventh, which is roughly what a dune field is.
    groundGroups: [
      [21, 24], [21, 24],   // pale cream flats -- the bulk of the island
      [2, 31, 32], [2, 31, 32], // the warmer peach-pink flats
      [6],                  // flat ochre
      [23, 33],             // ripple, which wants to arrive in fields
      [30],                 // the one dune with a shadow in it, alone, so its
                            // chevron reads as relief instead of as noise
    ],
    // Salt pan, crust and shell gravel -- the pale end, for a desert island's
    // margins where the sea got in and then left.
    accent: [27, 28, 34, 35],
  },
  sbs_rocky: {
    // Basalt. Mid-to-dark grey with no cast: 33 is lilac and 21/28 are salmon,
    // which is how the measured pass got a pink volcano.
    ground: [11, 14, 15, 23, 25, 27],
    groundGroups: [
      [11, 14, 27],      // mid grey, rough
      [15, 23, 25],      // the darker flows
    ],
    // Lava. Orange cracks scattered sparsely over basalt, which is what a
    // cooling flow looks like from above. 20 and 26 are grey tiles with a
    // little glow in them and at tile size they read as pink dirt, not as
    // fire; the three left are unambiguous.
    accent: [19, 24, 29],
  },
  sbs_stones: {
    // Warm tan-grey worked paving and the bare earth between it.
    ground: [2, 10, 15, 17, 19, 21, 24],
    groundGroups: [
      [2, 21, 24],       // tan paving, still laid
      [10, 15, 19],      // grey-brown cobble, broken up
      [17],              // bare earth -- one tile is a group, and a patch of
                         // nothing but soil is exactly what a ruin has.
    ],
    // Moss in the joints and rubble in the gutters: the city losing.
    accent: [1, 6, 16, 29, 35],
  },
  // Not a water pack -- an ELEMENTS pack: twenty shades of sea, then fire,
  // acid, blood and slime. Cinder names it for the fire, and the two roles
  // here are what a lava river is made of. Anything asking `sbs_elements` for
  // ordinary water would want 0-16 and should say so in its own subset.
  // Roles are inverted against what the names suggest, deliberately. The
  // water pass calls the BANKS light and the CHANNEL deep, and a lava river
  // is the other way round: it crusts over at the edge where it touches cold
  // rock and runs brightest down the middle. So `water` is the crust and
  // `deep` is the molten core.
  //
  // Two frames each, not three. The first pass took 21, 24 and 32 together
  // and the river came back striped pink-red-brown, one tile at a time --
  // the same checkerboard the ground packs had, for the same reason, and a
  // river is nine tiles wide so there is nowhere for it to hide.
  sbs_elements: {
    water: [19, 20],       // crusted, cooling: the banks
    deep: [21, 32],        // molten: the channel
  },
  sbs_ice: {
    // Kept for the region that has not been built yet. Pale and desaturated,
    // luminance 152-245, and the one palette in the whole pack that reads as
    // a coherent field with no curation beyond this line.
    ground: [0, 1, 2, 4, 5, 6, 9, 11, 12, 17, 21, 22],
    accent: [3, 7, 13, 15, 16],
  },
};
/**
 * ROUND 103 -- HOW DANGEROUS A REGION'S DENS ARE, on the four-step scale the
 * den tables use.
 *
 * The region's own top declared spawn tier, clamped to the tables' four rows.
 * Every den table in the game -- DEN_PACK_SIZE, REGION_DEN_FAMILIES,
 * denMonsterKeys -- is four entries indexed by this, and every one of them was
 * being indexed by the region's INDEX instead, which was the same number by
 * coincidence while there were four regions and stopped being one the moment
 * there were seven. One function, so the next thing to grow this way finds an
 * answer rather than a fifth copy of the coincidence.
 */
export function regionDenTier(region) {
  const r = typeof region === 'number' ? REGIONS[region] : region;
  if (!r) return 0;
  return Math.max(0, Math.min(3, Math.max(0, ...((r.spawnGroups || []).map(g => g.tier || 0)))));
}

export function packFrames(pack, role) {
  const e = PACK_FRAMES[pack];
  return (e && e[role]) || null;
}

/**
 * ROUND 77 -- is this tile in its region's desert band, and how strongly?
 *
 * Returns 0 outside the band, 1 deep inside it, and a fraction across the
 * blend. Takes REGION-LOCAL tile coordinates, like every other authoring
 * helper in this file.
 *
 * A fraction rather than a boolean because a hard edge between rock and sand
 * across the width of a region is the thing that would make this look
 * generated. The caller compares it against the tile's own position hash, so
 * the mixing is stable and needs nothing stored -- the same trick
 * `_stampSwamp` uses for the bog's edge.
 */
export function desertStrength(region, tx, ty) {
  const d = region && region.desert;
  if (!d) return 0;
  const blend = d.blend || 1;
  if (ty <= d.southOf) return 0;
  return Math.min(1, (ty - d.southOf) / blend);
}

// --- world geometry --------------------------------------------------------
// 1024 tiles a side: 32,768 world units, about 218 seconds to cross at a run.
// The user picked this size knowing that number.
export const REGION_TILES = 1024;
// ROUND 103 -- 2x2 -> 3x3. Acts 2, 3 and 4 each gain a region: a sandy desert
// island, a volcanic region, and an abandoned city. Nine slots for seven
// regions, and the two empty ones are deliberate headroom -- `regionAtTile`
// returns null for a slot no region claims, which is already how the map
// margins behave.
//
// 3x3 rather than 4x2 because the tile array is SQUARE: 4x2 would need it
// 4096 a side (16.8 MB) where 3x3 needs 3680 (13.5 MB), and a 4-wide world is
// a long thin map nobody asked for.
export const WORLD_COLS = 3, WORLD_ROWS = 3;
// Rows of tiles reserved BELOW the region grid for every interior in the
// game (see interiors.js). 128 tiles is room for the eleven rooms that exist
// plus the ones the story still needs, with void margin around each.
export const INTERIOR_BAND_TILES = 128;
// ROUND 88 -- AND A SECOND BAND UNDER IT, FOR THE ASTRAL REALMS.
//
// Measured before it was chosen: after `resiteInteriorsIntoBand` lays the 54
// interiors, the band's last occupied row is 2132 and there are 44 rows spare.
// A realm is 224 tiles a side (see astral.js for why that number and not the
// 341 the ask asked for), so four of them need 480 rows they cannot have.
//
// A SEPARATE band rather than a bigger one, and the separation is what makes
// this cheap: `_stampInteriorBand` walks every row it is given, and growing
// the interior band from 128 to 608 would have quadrupled a build-time loop
// that paints nothing for four fifths of its length. The realms are stamped
// ON ENTRY instead, one at a time, by the player who goes there -- so this
// band is reserved space that costs nothing until it is used.
export const ASTRAL_BAND_TILES = 480;
export const WORLD_TILES = REGION_TILES * WORLD_COLS;                    // 2048
export const INTERIOR_BAND_Y0 = REGION_TILES * WORLD_ROWS;               // first interior row
export const ASTRAL_BAND_Y0 = INTERIOR_BAND_Y0 + INTERIOR_BAND_TILES;    // 2176
export const INTERIOR_BAND_Y1 = ASTRAL_BAND_Y0;   // one past the last ordinary interior row
// ROUND 103 -- THE SQUARE ARRAY HAS TO COVER THE WIDER AXIS, NOT JUST THE ROWS.
//
// This was `REGION_TILES * WORLD_ROWS + bands` -- rows only -- and it was
// correct for exactly as long as the grid was square. `this.tileType` is
// `new Uint8Array(MAP_TILES * MAP_TILES)` and `_setTile` bounds-checks
// `tx >= MAP_TILES`, so the moment WORLD_COLS exceeded WORLD_ROWS the whole
// right-hand column of the world would have been OUTSIDE THE ARRAY: every
// tile written there dropped on the floor, every read back as TILE_VOID, no
// error anywhere. A third of the new world would simply have rendered as
// nothing, and the first symptom would have been an empty region.
//
// Flagged in WORLD_SCALE.md before the grid was touched, and fixed before it
// was touched, which is the only reason it is a note rather than a round.
export const MAP_TILES_TOTAL = Math.max(
  REGION_TILES * WORLD_COLS,
  REGION_TILES * WORLD_ROWS + INTERIOR_BAND_TILES + ASTRAL_BAND_TILES,
);                                                                       // 3680

// Region-local helpers: authoring is in TILES from the region's own corner.
const R = (tx, ty) => ({ tx, ty });

// --- the regions -----------------------------------------------------------
export const REGIONS = [
  {
    id: 'nek', name: 'The Nek', index: 0, col: 0, row: 0,
    // ROUND 107 -- HAND-PLACED OBJECTS. One entry of each of the four kinds,
    // in Cadence and just outside it, so the feature ships with something a
    // person can walk to rather than only with the machinery to express it.
    // An empty `placed` on every region would have been a system nobody could
    // tell was working.
    //
    // Coordinates are region-LOCAL tiles, the same as `settlements`, `lakes`
    // and every `R(x, y)` in this file. Cadence sits at 442,512 with a radius
    // of 61, so these are on and around its square.
    // THE COORDINATES ARE CHOSEN TO CONTEST GROUND THE GENERATOR WANTS, and
    // that is not decoration -- it is what makes the keep-clear testable.
    // The first draft put these on quiet ground, round 107's probe passed,
    // and then it went on passing with every keep-clear hook commented out.
    // A check that cannot fail is decoration; these tiles were read off the
    // running game (a stall at 447,510, spicePots at 447,512, the generated
    // fountain at 436,529, trees at 499,456-462) so that removing the guard
    // visibly puts a market stall inside a statue.
    placed: [
      // Standing in the middle of the market row.
      { kind: 'cityProp', key: 'statue', at: R(447, 511) },
      // Where the generated fountain goes.
      { kind: 'cityProp', key: 'well', at: R(436, 529) },
      // In the thick of the trees east of the city.
      { kind: 'scenery', key: 'tree', at: R(499, 459) },
      { kind: 'scenery', key: 'rock', at: R(489, 452) },
    ],
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 0.95, rockDensity: 0.9,
    blurb: 'Grasslands and forests, a city where two rivers meet.',
    // Region 1 keeps the hand-tuned grass atlas the game has always used --
    // it IS grassland, and the eight region packs were sent "in preparation
    // for the additional regions", not to repaint this one.
    ground: null, accentPack: 'grass_plank',
    // Where a new arrival stands. Region 1 is where the game begins, so this
    // is also the player's world spawn.
    // ROUND 49 -- MOVED 70 TILES WEST (40, then 10, then another 20). The user, on the outline: "Move the
    // entire city and all objects / NPCs 40 tiles west, this should put the
    // river running past instead of through the city." -- and then, once that
    // landed with the water hugging the east wall: "Move the whole city another
    // 10 tiles west", and then "Lets move the city another 20 tiles west". The
    // rivers are defined
    // below in their own region-tile coordinates and deliberately do NOT move
    // with it -- that is the whole point of the move: the water stays where it
    // is and the city steps out of it.
    //
    // Moving BOTH `arrival` and nek_city's `at` is what makes "the entire city
    // and all objects / NPCs" true in one edit rather than forty. townOrigin is
    // arrivalPoint(startRegion()), and every part of the capital is measured
    // from it -- the outline square, the bullseye, the wall, the quest board,
    // the player's spawn, the townsfolk, the watch and the gods. The
    // settlement's own `at` has to move with it or the two disagree: `at`
    // drives _inAnySettlement, the meditation check, the monster-spawn
    // exclusion and the region gate, none of which read townOrigin.
    arrival: R(442, 512), isStart: true,
    settlements: [
      { id: 'nek_city', name: 'Cadence', kind: 'city', at: R(442, 512), radius: 61, full: true },
      // "1 or 2 small communities (3-5 houses) should have their own bounty
      // boards along this road"
      { id: 'nek_hamlet_1', name: 'Milrow', kind: 'hamlet', at: R(360, 660), radius: 9, houses: 4, bountyBoard: true },
      { id: 'nek_hamlet_2', name: 'Fenn Cross', kind: 'hamlet', at: R(200, 830), radius: 9, houses: 5, bountyBoard: true },
    ],
    // "2 rivers merging at the city" -- two headwaters off the north edge
    // that join just above the city, and one river out of it to the south.
    // ROUND 74 (item 9) -- "Need 1-2 bridges across the river to explore the
    // full map."
    //
    // He was right and the number was worse than it looked. MEASURED before
    // this change: The Nek was 47.7% reachable on foot. These three rivers
    // make a Y -- two arms falling from the north edge to a confluence at
    // (512, 470), then one nine-tile channel running from there to the south
    // edge -- and not one of them carried a crossing of any kind, so the
    // water was an unbroken wall from the top of the map to the bottom.
    // 437,792 tiles (44.9%) sat behind it, plus a 72,172-tile wedge (7.4%)
    // between the two arms. Cadence is on the west bank, so a player spawning
    // there could reach neither.
    //
    // Two crossings on the long southern channel and one on each arm, placed
    // by FRACTION along each river rather than by a spacing (see _stampRiver
    // for why `bridgesEvery` could not say this). Three rivers, four bridges,
    // and the wedge and the whole eastern half both open.
    rivers: [
      { width: 7, bridgesAt: [0.55], points: [R(430, 0), R(452, 120), R(468, 250), R(492, 380), R(512, 470)] },
      { width: 6, bridgesAt: [0.45], points: [R(760, 0), R(700, 110), R(620, 250), R(560, 380), R(512, 470)] },
      { width: 9, bridgesAt: [0.28, 0.72], points: [R(512, 470), R(534, 640), R(560, 800), R(548, 1023)] },
    ],
    // "3 large lakes on the left side of the map"
    lakes: [
      { at: R(150, 300), rx: 62, ry: 88 },
      { at: R(120, 560), rx: 54, ry: 76 },
      // ROUND 44 -- moved north off the southwest road. At R(190,800) this
      // lake swallowed Fenn Cross: the hamlet stamped its paving over the
      // water (settlements stamp last) and the result was five houses on an
      // island in the middle of a lake, reachable only by swimming.
      { at: R(175, 715), rx: 70, ry: 58 },
    ],
    // "a road travels southwest to the edge of the map with scattered houses
    // and farmplots"
    // ROUND 65 -- `bridges: true` removed from three of these. It was read by
    // NOTHING: _stampRoad paves whatever it crosses ("a road crossing water IS
    // the bridge"), so the flag described behaviour that was unconditional
    // anyway. A field written, printed and read by nothing is the fault this
    // project keeps finding; deleted rather than left to look meaningful.
    roads: [
      // ROUND 49 -- ONE ROAD PER GATE, EACH RUNNING TO THE MAP EDGE.
      //
      // The user: "extend all the roads from the gaps in the city wall
      // continuing the same direction out to the edge of the map with some
      // minor turns or twists."
      //
      // The city sits at region tile (442,512) with a 100x100 square, so its
      // walls are x 392..492 and y 462..562. The three gates, in region tiles:
      //   west   (392, 484)   the west wall's northern gap
      //   north  (468, 462)   the north wall's eastern gap
      //   south  (468, 562)   the south wall's eastern gap
      // Each road below starts on its gate and leaves in that gate's own
      // direction. The waypoints between are the "minor turns or twists" --
      // enough that a road reads as a road rather than as a ruled line, not so
      // much that it stops going where it set out to go.
      //
      // THE NORTH ROAD IS ROUTED, NOT DRAWN STRAIGHT. The Nek's first river
      // runs from (430,0) through (452,120), (468,250) and (492,380) down to
      // the merge -- which is to say it occupies almost exactly the column a
      // straight road north would want. This one stays 50-60 tiles west of it
      // the whole way up, which is why it drifts west as it climbs.
      //
      // THE SOUTH ROAD IS THE OLD SOUTHWEST ROAD, re-anchored. It still runs
      // through Milrow and Fenn Cross and still ends on the region exit at
      // (52,986), because both hamlets and the gate to Ontaria are on it; what
      // changed is that it now leaves the city through the south gate instead
      // of starting inside the walls. Its dogleg east of Fenn Cross keeps it
      // clear of the third lake (175,715 / 70x58).
      { width: 5, farms: true, points: [R(392, 484), R(330, 476), R(255, 486), R(180, 466), R(100, 452), R(0, 446)] },
      { width: 5, points: [R(468, 462), R(450, 420), R(420, 340), R(410, 250), R(400, 140), R(395, 0)] },
      // ROUND 116, BUG 10 -- "Next region gate in the Nek is not at the edge
      // of the map, it should be." The road stopped at (52, 986), which is
      // fifty-two tiles short of the west edge and thirty-eight short of the
      // south one -- a gate standing in a field with more of The Nek behind
      // it. It runs to the corner now, and the exit below sits on the last
      // tile of it.
      { width: 5, farms: true, points: [R(468, 562), R(450, 600), R(410, 630), R(360, 660), R(300, 700), R(260, 770), R(200, 830), R(140, 900), R(52, 986), R(3, 1020)] },
    ],
    // Normal super packs, Normal packs, solo Iron, small Iron packs.
    //
    // =======================================================================
    // ROUND 77 -- WHICH OF THESE MOVE.
    //
    // The user: "Not all monsters should be in packs waiting in an area, some
    // monsters should roam solo (generally the stronger monsters for a
    // region), some monsters in packs should roam to make the encounters and
    // danger feel dynamic."
    //
    // Two fields, and the whole of the answer is in which bands carry them:
    //
    //   roams        this band always roams. On every `solo` band, in every
    //                region, because a region's solo band IS its stronger
    //                monsters -- tier 1 in The Nek, tier 4 in Bratugal.
    //                Bratugal's already said so and nothing read it.
    //   roamChance   the fraction of this band's groups that roam, decided
    //                per group off its own position. A band is not all one
    //                thing: half the wolf packs hold a hunting ground and
    //                half of them walk it, which is the difference between a
    //                world with routes in it and a world of furniture.
    //
    // SUPER PACKS NEVER ROAM, and that is a design line rather than an
    // oversight. Thirty monsters have a place they are: a warren, a nest, a
    // hive. Thirty of them walking is a migration, which is a different piece
    // of content and would also be the frame budget's worst case moving at
    // speed through terrain it did not spawn on.
    // =======================================================================
    spawnGroups: [
      { tier: 0, size: [10, 30], from: 0.00, weight: 2, label: 'super pack' },
      { tier: 0, size: [2, 8], from: 0.00, weight: 5, label: 'pack', roamChance: 0.35 },
      { tier: 1, size: [1, 1], from: 0.25, weight: 4, label: 'solo', roams: true },
      { tier: 1, size: [2, 3], from: 0.55, weight: 2, label: 'small pack', roamChance: 0.5 },
      // ROUND 134 (item 14.2) -- BRONZE, FAR FROM CADENCE.
      //
      // The user: "increase the quantity of bronze ranks enemies wandering
      // around when you get far away from the main city".
      //
      // There were none to increase. The Nek's ladder stopped at tier 1, so
      // the hardest thing in the whole region was a lone iron-rank wanderer --
      // and The Nek is where the player stays until Bronze, because the
      // southwest gate will not pass them under it. A player who has reached
      // Bronze, recruited two companions and cannot leave yet had literally
      // nothing left in the region that could threaten them, which is the
      // report this item is.
      //
      // `from: 0.7` puts them in the outer third measured from the arrival
      // point, which is the far country in the sense the ask means: a long
      // walk from the capital, out past where the iron solos start. `roams`,
      // because "wandering around" is the user's word and a bronze that
      // stands still is a landmark rather than a danger. Small numbers -- one
      // or two -- because a bronze pair at this rank is already the hardest
      // encounter in the region and a pack of them would be a wall rather
      // than an escalation.
      { tier: 2, size: [1, 2], from: 0.70, weight: 3, label: 'bronze wanderer', roams: true },
    ],
    // "Map exit is at the end of the road to the south west and should have 2
    // gate guards that wont let a player through until they reach Bronze."
    exit: {
      // ROUND 116, BUG 10 -- ON THE EDGE TILE, not fifty tiles inside it.
      // The pad's radius is 96 world units (three tiles) and the guards stand
      // 44 units south of it, so the gate has to be far enough in that both
      // are on the map: tile 5 puts the pad's west rim on tile 2 and leaves
      // The Nek behind you rather than around you.
      kind: 'gate', at: R(5, 1018), to: 'ontaria', requiredRank: 'bronze', guards: 2,
      label: 'the southwest gate',
      refuse: 'The road south is no place for a hunter under Bronze. Come back when the world has made you harder.',
      allow: 'Bronze already? Go on then — Ontaria keeps its own kind of trouble.',
    },
  },

  {
    id: 'ontaria', name: 'Ontaria', index: 1, col: 1, row: 0,
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 0.8, rockDensity: 0.7,
    blurb: 'Oceanside forests and plains, cities in the northwest, villages on the water.',
    // ROUND 78 (7.4) -- MEADOW IS THE GROUND NOW, and grass_plank becomes the
    // accent. The user assigned Ontaria's wilderness tile by tile ("29, 36 and
    // 34 should be the majority... patches of 31 and 37... large patches of
    // 43... 32 and 33 rarely and randomly"), and every number in that sentence
    // is in the MEADOW pack, which this region was using only for its rough
    // ground. The two swap.
    //
    // The mix itself is not here: a `ground` pack name can only say "pick
    // uniformly from these frames", and the instruction is four different
    // distributions. See TILE_PLANS.ontaria_ground.
    ground: 'meadow', accentPack: 'grass_plank',
    // "Player arrives by road north of the main city"
    arrival: R(300, 120),
    settlements: [
      // ROUND 72 -- "Harrowmare should have the walls bordering as a hexagon,
      // and Karsk Landing as an Octagon."  `wall.sides` is the polygon's side
      // count and `wall.rotation` the angle of its FIRST VERTEX, in radians.
      // Both are read by WorldScene's _buildPolygonWalls; a settlement with no
      // `wall` block keeps the ring.  `plan: 'outline'` routes the settlement
      // to the Cadence-style planner (temple row, civic row, house lattice)
      // instead of the roadside lots, which put Harrowmoor's houses 131 tiles
      // from its centre and Karsk Landing's 284.
      //
      // rotation 0 puts hexagon vertices due east and west, so its six EDGES
      // face north, south and the four obliques -- and the north-south road
      // through the city pierces an edge rather than splitting a corner.
      { id: 'ont_city', name: 'Harrowmoor', kind: 'city', at: R(300, 250), radius: 48,
        wall: { sides: 6, rotation: 0 }, plan: 'outline' },
      { id: 'ont_west', name: 'Little Gale', kind: 'town', at: R(120, 380), radius: 26 },
      { id: 'ont_village_a', name: 'Sailmend', kind: 'village', at: R(400, 840), radius: 12, houses: 6 },
      { id: 'ont_village_b', name: 'Cobb Point', kind: 'village', at: R(640, 890), radius: 12, houses: 5 },
    ],
    // The ocean takes the south and east of the region.
    ocean: { southFrom: 930, eastFrom: 880 },
    rivers: [
      // ROUND 115 (item 9) -- ONTARIA'S RIVER HAD NO CROSSING EITHER.
      //
      // Round 79 found the same thing in Bratugal (see that region's note) and
      // three more survived it: this one, Cinder's lava flow and Ixcuatl's
      // first river all carried neither `bridgesAt` nor `bridgesEvery`. They
      // read as crossable in `test_round79b` only because a ROAD happened to
      // be paving ninety tiles of Ontaria's river out of existence, which is
      // the fault that round fixed -- and fixing it revealed that the
      // "crossing" was the bug.
      //
      // One span at the midpoint, which is where a road wants it.
      { width: 7, bridgesAt: [0.5], points: [R(300, 250), R(340, 480), R(390, 700), R(400, 840)] },
    ],
    // ROUND 65 -- two inland meres behind the coast. Ontaria is "oceanside
    // forests and plains" and had no standing fresh water at all against The
    // Nek's three lakes; a coast with nothing behind it reads as a strip
    // rather than a country.
    lakes: [
      { at: R(560, 340), rx: 52, ry: 40 },
      { at: R(720, 640), rx: 44, ry: 56 },
    ],
    roads: [
      { width: 5, points: [R(300, 120), R(300, 250)] },
      { width: 4, points: [R(300, 250), R(210, 320), R(120, 380)] },
      { width: 4, farms: true, points: [R(300, 250), R(350, 520), R(400, 840)] },
      { width: 4, points: [R(400, 840), R(520, 880), R(640, 890)] },
    ],
    spawnGroups: [
      // ROUND 77 -- see the note on The Nek's bands. Ontaria's pack band is
      // its ONLY pack band, so it carries the higher share: this is the
      // region the player crosses at Bronze and the one whose moors are
      // meant to feel exposed.
      { tier: 1, size: [2, 8], from: 0.00, weight: 6, label: 'pack', roamChance: 0.45 },
      { tier: 2, size: [1, 1], from: 0.30, weight: 4, label: 'solo', roams: true },
    ],
    // "Map exit to next region is by ship, guards will not let you board
    // unless the player is silver rank as next is a high magic area."
    exit: {
      kind: 'ship', at: R(430, 900), to: 'elehyd', requiredRank: 'silver', guards: 2,
      label: 'the Elehyd packet',
      refuse: 'Elehyd is a high magic country. Under Silver you would not last the walk up from the dock.',
      allow: 'Silver. Right — mind the swell, and mind what waits on the other side.',
    },
  },

  {
    id: 'elehyd', name: 'Elehyd', index: 2, col: 0, row: 1,
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 0.12, rockDensity: 1.6,
    blurb: 'Desolate badlands and icy peaks; roads fade into dirt.',
    // ROUND 45 -- was ground:'slate_dark', which is the murky-water pack (see
    // PACK_FRAMES): the badlands rendered as a lake bed. Both roles draw from
    // 'mountain' now, ground taking its bare rock frames and the peaks taking
    // its snow and ice -- which is what "desolate badlands and icy peaks"
    // asks for, out of the one pack that actually contains both.
    ground: 'mountain', accentPack: 'mountain',
    // ROUND 77 -- THE DESERT HALF OF "MOUNTAINOUS DESERT".
    //
    // Same shape as Bratugal's `swamp` block below and deliberately so: a band
    // across part of a region where the ground draws from a different subset of
    // its own pack. Bratugal's runs west; Elehyd's runs SOUTH, because the
    // peaks are the north of the map and Karsk Landing sits at (220, 800) in
    // the southwest -- so the player arrives in the desert and climbs into the
    // mountains, which is the right way round for a region whose blurb is
    // "desolate badlands and icy peaks".
    //
    // `blend` is the width in tiles of the band where the two mix, so the
    // desert does not begin on a ruled line across the map. Inside it, the
    // chance of a sand tile rises from none to all with distance south.
    desert: { southOf: 470, blend: 150 },
    // "Players arrive via boat in the southwest city."
    arrival: R(220, 800),
    settlements: [
      // rotation PI/8 turns the octagon an eighth of a side, which puts flat
      // edges on all four world axes AND on the four diagonals -- so half its
      // walls run along a world axis (as Cadence's square does) and half run
      // along a SCREEN axis.  A rotation of 0 would have given it eight
      // oblique edges and no face square to anything.
      { id: 'ele_city', name: 'Karsk Landing', kind: 'city', at: R(220, 800), radius: 44,
        wall: { sides: 8, rotation: Math.PI / 8 }, plan: 'outline' },
      // ROUND 64 -- "the little scattered communities in EACH region should
      // have a bounty board with 5 items". Elehyd and Bratugal had exactly one
      // settlement apiece, so a region's worth of that ask had nowhere to
      // land. Both hamlets sit south of the east-west river and clear of the
      // northern peak band, on the same side of the water as the city.
      { id: 'ele_hamlet_1', name: 'Coldharrow', kind: 'hamlet', at: R(430, 790), radius: 9, houses: 4, bountyBoard: true },
      { id: 'ele_hamlet_2', name: 'Gravemarch', kind: 'hamlet', at: R(760, 850), radius: 9, houses: 5, bountyBoard: true },
    ],
    // Icy peaks across the north: a band of mountain tiles rather than a
    // settlement or a lake.
    peaks: { northTo: 300, patchiness: 0.55 },
    rivers: [
      { width: 8, bridgesEvery: 260, points: [R(0, 520), R(240, 560), R(493, 684), R(730, 657), R(1023, 700)] },
      { width: 6, bridgesEvery: 300, points: [R(560, 0), R(600, 220), R(643, 401), R(700, 640), R(760, 1023)] },
    ],
    // ROUND 65 -- two frozen tarns under the peaks. Elehyd had no standing
    // water at all against The Nek's three lakes; meltwater that never gets
    // anywhere is the badlands' own version of a lake and gives the north
    // something to walk to.
    lakes: [
      { at: R(430, 330), rx: 34, ry: 26 },
      { at: R(700, 300), rx: 28, ry: 34 },
    ],
    // "roads often fade into dirt" -- these are drawn as PATH, not street,
    // and stop short of their destination on purpose.
    roads: [
      // ROUND 65 -- `farms` on the road out of Karsk Landing. Roadside
      // steadings were a nek-and-ontaria-only feature purely because those
      // were the only regions whose roads carried the flag; a badlands holding
      // clinging to the last dirt road is exactly the detail this region was
      // missing.
      { width: 3, dirt: true, fade: 0.6, farms: true, points: [R(220, 800), R(491, 687), R(701, 639), R(1023, 656)] },
      { width: 3, dirt: true, fade: 0.45, points: [R(220, 800), R(180, 620), R(210, 420), R(314, 0)] },
    ],
    spawnGroups: [
      { tier: 1, size: [10, 30], from: 0.00, weight: 3, label: 'super pack' },
      { tier: 2, size: [2, 8], from: 0.15, weight: 5, label: 'pack', roamChance: 0.4 },
      { tier: 3, size: [1, 1], from: 0.35, weight: 4, label: 'solo', roams: true },
    ],
    // "Map Exit is a portal specialist (sent by Rob Collins) who will only
    // teleport the player if they have reached gold rank. The portal
    // specialist doesn't even appear in the city until the player is at least
    // silver 9 in multiple abilities."
    exit: {
      kind: 'portal', at: R(238, 782), to: 'bratugal', requiredRank: 'gold', guards: 0,
      label: 'the portal specialist',
      hidden: { silverAbilities: 3 },
      refuse: 'I can open the way to Bratugal. I will not open it for anything under Gold — I have seen what comes back.',
      allow: 'Gold. Rob said you would get here. Hold still, this is the unpleasant part.',
    },
  },

  {
    id: 'bratugal', name: 'Bratugal', index: 3, col: 1, row: 1,
    // Scatter density relative to the round-19 wilderness (1.0 = as thick as The Nek).
    forestDensity: 1.0, rockDensity: 0.5,
    blurb: 'Jungle, rainforest and swamp around one great city in the east.',
    ground: 'jungle_soil', accentPack: 'swamp',
    // ROUND 45 -- bog water, not river shallows. The swamp's wetness stamps
    // TILE_WATER_LIGHT pools across the western half, and those were drawing
    // the bright cyan river-shallows art: on jungle green they read as spilled
    // paint rather than as standing water. 'slate_dark' -- the pack Elehyd
    // wrongly used as its GROUND -- is dark, murky, rippling water with fish
    // in it, which is exactly what a bog pool should look like.
    waterPack: 'slate_dark',
    // "The player arrives via portal into the portal square."
    arrival: R(830, 500),
    settlements: [
      // ROUND 72 -- "Make the grid in the bratugal city twice as large (wider
      // plots, and poplate it entirely with buildings facing south west".
      //
      // `grid` is passed to town.js's gridOptions, which is what BOTH the
      // ground stamp and the lot generator read -- see the note there for why
      // this is a parameter and not an edit to BLOCK_SIZE.  `blockScale: 2` is
      // the "twice as large" ask; `cityRadius` is the settlement's own radius
      // rather than the capital's CITY_RADIUS, so the grid fills the disc the
      // wall encloses; `guildLot: null` because Vashra has no guildmaster's
      // lawn and the reservation was punching an empty rectangle in its grid.
      // `facing` forces every building's facing, which is the rest of the ask.
      { id: 'bra_city', name: 'Vashra', kind: 'city', at: R(830, 500), radius: 66, full: true,
        grid: { blockScale: 2, cityRadius: 66 * 32, guildLot: null, alleyTiles: 0 },
        facing: 'southwest', fill: true },
      // ROUND 64 -- see the note in Elehyd. Both sit on the DRY east half:
      // `swamp.westOf` is 520, and a hamlet in standing water is a hamlet
      // whose bounty board the player has to swim to.
      { id: 'bra_hamlet_1', name: 'Stiltrow', kind: 'hamlet', at: R(880, 760), radius: 9, houses: 4, bountyBoard: true },
      { id: 'bra_hamlet_2', name: 'Thornwick', kind: 'hamlet', at: R(700, 190), radius: 9, houses: 5, bountyBoard: true },
    ],
    // Swamp takes the west half; the deeper west, the wetter.
    swamp: { westOf: 520, wetness: 0.55 },
    // ROUND 79 (bug 4) -- BRATUGAL'S TWO RIVERS HAD NO CROSSINGS AT ALL.
    //
    // Found while cutting the bridge models down to three-tile spans: these
    // two carried neither `bridgesAt` nor `bridgesEvery`, so nothing ever
    // paved a step across them. A ten-tile channel and an eight-tile one, both
    // impassable, cutting the rainforest into three pieces since the region
    // was written. Not a round-79 regression -- a round-79 FINDING, and the
    // measurement that turned it up is now a check in test_round79b.
    //
    // Two crossings on the long river and one on the short, at fractions along
    // their own length, exactly as The Nek names its own.
    rivers: [
      { width: 10, bridgesAt: [0.35, 0.7], points: [R(1023, 300), R(820, 340), R(600, 400), R(360, 470), R(0, 614)] },
      { width: 8, bridgesAt: [0.5], points: [R(700, 1023), R(704, 885), R(490, 647), R(600, 402)] },
    ],
    lakes: [
      { at: R(240, 700), rx: 90, ry: 70 },
      { at: R(140, 380), rx: 76, ry: 96 },
    ],
    // "No roads outside of the main city." -- so the city gets its streets and
    // the jungle gets none. ROUND 65: Bratugal had `roads: []` outright, which
    // honoured the second half of that sentence and dropped the first: Vashra
    // was the only city in the world with no paved approach at all, and with
    // no road anywhere the region could not have a roadside anything. These
    // three all begin and end inside the city's own radius.
    roads: [
      { width: 5, points: [R(830, 500), R(830, 430)] },
      { width: 5, points: [R(830, 500), R(896, 522)] },
      { width: 4, points: [R(830, 500), R(786, 560)] },
    ],
    // "super packs of bronze, packs of Silver and solo Gold... The gold rank
    // enemies have large territories and they path everywhere outside the
    // city randomly. silver rank enemies stick farther to the west with
    // bronze packs getting larger as you move farther west."
    spawnGroups: [
      { tier: 2, size: [10, 30], from: 0.00, weight: 4, label: 'super pack', growsWestward: true },
      { tier: 3, size: [2, 8], from: 0.25, weight: 4, label: 'pack', westOnly: true, roamChance: 0.5 },
      // This one has claimed to roam since the day the field was written and
      // has never moved a step: nothing in 25,000 lines ever read `roams`.
      // Round 77 is the round it becomes true.
      { tier: 4, size: [1, 1], from: 0.00, weight: 2, label: 'solo', roams: true },
    ],
    exit: null,   // story continues past this point
  },

  // ==========================================================================
  // ROUND 103 -- THE THREE SECOND-HALF REGIONS, one per act from II on.
  //
  //   Act II   Ontaria (1,0) -> SIRUKH SANDS (2,0), east across the water
  //   Act III  Elehyd  (0,1) -> THE CINDERWASTE (0,2), south, downhill, hot
  //   Act IV   Bratugal(1,1) -> IXCUATL (1,2), south, under the jungle
  //
  // EACH SITS BESIDE THE REGION IT BELONGS TO, which is not decoration: the
  // grid is what `regionAtTile` reads, so an act's two halves being adjacent
  // is what lets the player walk (or sail) between them rather than crossing
  // the world. The two unclaimed slots, (2,1) and (2,2), are headroom --
  // `regionAtTile` already returns null for ground no region owns, which is
  // how the map margins have always behaved.
  //
  // WHAT IS DELIBERATELY THIN HERE: settlements, rivers, roads and spawn bands
  // are a first pass sized off the region each one extends. They are meant to
  // be argued with. The ground packs are the part that is decided, because
  // that is what the tile round was for.
  // ==========================================================================
  {
    id: 'sirukh', name: 'Sirukh Sands', index: 4, col: 2, row: 0,
    // Almost nothing grows and there is little loose stone -- it is dune and
    // hardpan, so both scatters go very low. The Nek is 0.95/0.9 for scale.
    forestDensity: 0.06, rockDensity: 0.35,
    blurb: 'A hot island of dunes and salt pan, ringed by reef water.',
    // ROUND 103 -- the first region dressed from the Screaming Brain pack.
    // `sbs_dry` is sand, hardpan and cracked clay; `sbs_stones` carries the
    // pale flat rock the salt pans want. Curated per REGIONS_NEXT.md rather
    // than used whole -- the sets are variety packs and a whole one reads as
    // patchwork. The mix is TILE_PLANS.sirukh_ground.
    ground: 'sbs_dry', accentPack: 'sbs_dry',
    // ROUND 103 -- sun-bleached stone. The base rock sheet is Ontarian
    // granite with green tufts painted into it, and grass does not grow on a
    // dune. `bonefield` is the pale grey-tan ramp.
    rockPalette: 'bonefield',
    arrival: R(512, 60),
    settlements: [
      { id: 'sir_town', name: 'Tolbrand Quay', kind: 'town', at: R(470, 190), radius: 28 },
      { id: 'sir_village', name: 'Salt Gate', kind: 'village', at: R(680, 520), radius: 12, houses: 5 },
      // A third community, because a region's boards are a main one and at
      // least two others (test_round64) -- and because a whole island with two
      // places on it is a shorter island than this one is.
      { id: 'sir_hamlet', name: 'Dunmouth', kind: 'hamlet', at: R(300, 690), radius: 9, houses: 4, bountyBoard: true },
    ],
    // An ISLAND, so the ocean takes three sides rather than two. The north
    // edge is where the packet puts in.
    ocean: { southFrom: 900, eastFrom: 900, westTo: 90 },
    rivers: [],
    lakes: [
      // Not lakes -- salt pans, which the water pass draws as standing water
      // and the eye reads as glare. Shallow and very wide.
      { at: R(300, 600), rx: 90, ry: 44 },
      { at: R(620, 760), rx: 70, ry: 36 },
    ],
    roads: [
      { width: 4, points: [R(512, 60), R(470, 190)] },
      { width: 3, farms: true, points: [R(470, 190), R(560, 380), R(680, 520)] },
      { width: 4, points: [R(683, 521), R(1023, 524)] },
      { width: 4, points: [R(557, 821), R(296, 689), R(170, 604), R(278, 525), R(533, 577), R(680, 517)] },
      { width: 4, points: [R(556, 823), R(564, 1023)] },
    ],
    // Act II country: the player crosses it around Bronze.
    spawnGroups: [
      { tier: 1, size: [2, 8], from: 0.00, weight: 5, label: 'pack', roamChance: 0.4 },
      { tier: 1, size: [10, 24], from: 0.35, weight: 2, label: 'super pack' },
      { tier: 2, size: [1, 1], from: 0.45, weight: 3, label: 'solo', roams: true },
    ],
    exit: null,   // reached from Ontaria and returned from; not a one-way door
  },

  {
    id: 'cinder', name: 'The Cinderwaste', index: 5, col: 0, row: 2,
    // Nothing grows in ash. What there IS, is stone -- more of it than
    // anywhere else in the world, which is what the rockDensity says.
    forestDensity: 0.03, rockDensity: 1.9,
    blurb: 'Ash plains and lava fields below Elehyd, where the badlands catch fire.',
    // `sbs_rocky` is the darkest, most varied stone in the library and
    // `sbs_elements` carries what a lava field needs from a water pass.
    ground: 'sbs_rocky', accentPack: 'sbs_rocky',
    // ROUND 103 -- scorched. Same reason as Sirukh: the base rock art has
    // moss on it, and the Cinderwaste's first screenshot had three green
    // boulders in a lava field.
    rockPalette: 'ember',
    arrival: R(120, 80),
    settlements: [
      // Nobody lives here who is not working, so both of these are work
      // camps rather than towns -- but there are TWO of them, because one
      // was a region a player could cross without meeting anybody.
      // Measured by test_round65's own per-region floors: with a single camp
      // the Cinderwaste held 8 props against a floor of 15 and one road
      // against a floor of two.
      { id: 'cin_camp', name: 'Ashfall Station', kind: 'village', at: R(260, 300), radius: 14, houses: 7 },
      // The far end of the same operation: where what the Station cannot use
      // is carried to and left. Named for what it is.
      { id: 'cin_slag', name: 'Slagward', kind: 'village', at: R(720, 640), radius: 13, houses: 8 },
      // A relay on the haul road: three sheds, a water butt and whoever drew
      // the short straw. Sized so the region clears test_round65's floor of
      // fifteen standing structures, which it missed by one with two camps.
      { id: 'cin_relay', name: 'Kiln Halt', kind: 'hamlet', at: R(500, 480), radius: 9, houses: 4, bountyBoard: true },
    ],
    ocean: null,
    rivers: [
      // Lava, drawn by the river pass. It is water as far as the code is
      // concerned and fire as far as the player is; the ground pack and the
      // water pack are what make the difference.
      // ROUND 115 (item 9) -- and this one had no crossing. See Ontaria.
      // Two, because it runs the whole diagonal of the region and one span
      // would still leave a quarter of Cinder behind it.
      { width: 9, bridgesAt: [0.33, 0.72], points: [R(120, 80), R(300, 420), R(520, 700), R(640, 990)] },
      { width: 6, bridgesAt: [0.5], points: [R(694, 349), R(910, 578), R(642, 990)] },
      { width: 6, bridgesAt: [0.5], points: [R(644, 989), R(633, 1023)] },
    ],
    lakes: [
      // Lava pools, not water. Both wide and shallow, because a deep one
      // reads as a hole in the world at this camera angle.
      { at: R(700, 300), rx: 60, ry: 48 },
      { at: R(420, 780), rx: 74, ry: 40 },
    ],
    waterPack: 'sbs_elements',
    roads: [
      { width: 4, points: [R(120, 80), R(260, 300)] },
      // The haul road. It follows the ground the flows have already crossed
      // and cooled, which is why it bends the way it does.
      //
      // `farms: true` on a lava field, deliberately. The flag is what puts
      // outbuildings along a road -- sheds, barns, a house at the end of a
      // track -- and it is the only thing in the region schema that does.
      // Without it the Cinderwaste stood at 14 structures against
      // test_round65's floor of 15 and read as empty ground with two camps
      // in it. What these are is the ash-farms: crews working the fall for
      // sulphur and glass, which is what people actually do beside a
      // volcano, and it looks like sheds beside a haul road because that is
      // what it is.
      { width: 3, farms: true, points: [R(260, 300), R(500, 480), R(720, 640)] },
      { width: 4, points: [R(719, 640), R(914, 577), R(1023, 623)] },
      { width: 4, points: [R(260, 299), R(300, 419), R(303, 450), R(507, 710), R(521, 698), R(717, 640)] },
      { width: 4, points: [R(508, 711), R(285, 764), R(2, 1022)] },
    ],
    // Act III country: Silver and up.
    spawnGroups: [
      { tier: 3, size: [2, 6], from: 0.00, weight: 5, label: 'pack', roamChance: 0.5 },
      { tier: 3, size: [10, 26], from: 0.40, weight: 2, label: 'super pack' },
      { tier: 4, size: [1, 1], from: 0.55, weight: 2, label: 'solo', roams: true },
    ],
    exit: null,
  },

  {
    id: 'ixcuatl', name: 'Ixcuatl', index: 6, col: 1, row: 2,
    // The jungle has taken it back, so the scatter is Bratugal's or heavier --
    // the point of the place is that it is a city you cannot see.
    forestDensity: 1.15, rockDensity: 0.8,
    blurb: 'A stepped city swallowed by jungle. Nobody has lived here in a long time.',
    // Stone under leaf. `sbs_stones` is the worked paving of a city that is
    // still there under everything, and the jungle pack is what grew over it.
    // ROUND 103 -- the accent is `sbs_stones`' OWN accent role, which is the
    // mossed pavers and the rubble. Naming a different pack got the jungle
    // sheet's frames chosen by an index that means nothing in it; naming this
    // one gets the five tiles that were picked to be the city losing.
    ground: 'sbs_stones', accentPack: 'sbs_stones',
    arrival: R(512, 40),
    settlements: [
      // ROUND 103, SECOND PASS -- ONE LIVING CAMP, AND HERE IS WHY.
      //
      // The first cut gave this region no settlement at all: `kind: 'ruin'`
      // and a note saying the builders would learn it later. Two things were
      // wrong with that. The builders never did learn it, so the kind was
      // inert and the region generated as nothing -- 8 props against
      // test_round65's floor of 15, no roads, no NPCs, no quest board and no
      // bench. And it left an Act IV region with nowhere to stand, which is
      // not "atmospheric", it is a region a player crosses and leaves.
      //
      // A camp fixes both and is better story than the absence was. Act IV
      // is about the Division's missing people; a Society expedition digging
      // at the edge of the dead city is where they were last seen, and it
      // gives the region the one thing an abandoned place needs to read as
      // abandoned -- somebody there to say so.
      // Houses sized against test_round65's per-region floors rather than
      // guessed: a region needs 15 props and 12 people to talk to before it
      // reads as a place, and one six-house camp gave 10 and 8.
      // WEST OF THE RIVER, deliberately: it is what makes the causeway cross
      // the water instead of running down the valley beside it (see the roads
      // below, and round 79's Ontaria pin for what running beside it costs).
      { id: 'ixc_camp', name: 'Lastlight Camp', kind: 'village', at: R(160, 250), radius: 14, houses: 9 },
      // The dig itself, at the city's edge -- tents and a winch rather than a
      // village, which is what the smaller radius and the house count say.
      { id: 'ixc_dig', name: 'The Cut', kind: 'village', at: R(470, 430), radius: 11, houses: 5 },
      // And a forward post further in, where the causeway stops being safe.
      { id: 'ixc_post', name: 'Kepen Rest', kind: 'hamlet', at: R(700, 720), radius: 9, houses: 4, bountyBoard: true },
      // The city itself stays a ruin and stays unbuilt. `kind: 'ruin'` is
      // still a kind nothing knows, and it is still the right shape for what
      // this is -- but the region no longer DEPENDS on it, so it can be built
      // in its own round instead of being a hole in this one.
      { id: 'ixc_ruin', name: 'The Stepped City', kind: 'ruin', at: R(684, 587), radius: 60 },
    ],
    ocean: null,
    rivers: [
      // ROUND 115 (item 9) -- and this one. See Ontaria.
      { width: 6, bridgesAt: [0.5], points: [R(155, 1), R(360, 400), R(582, 642), R(560, 990)] },
      { width: 6, bridgesAt: [0.5], points: [R(1023, 0), R(601, 402), R(579, 644)] },
    ],
    lakes: [
      { at: R(561, 990), rx: 50, ry: 44 },
      // A reservoir the city built and the jungle kept. Rectangular once.
      { at: R(579, 642), rx: 56, ry: 38 },
    ],
    // THE CAUSEWAYS. Not roads the way Ontaria has roads -- these are the
    // city's own raised ways, still there because they were built out of the
    // same stone the ground pack draws. "The roads are under the leaf litter"
    // was the first cut's note and it was a nice line about a region with
    // nothing in it; a causeway you can actually walk is the better version
    // of the same idea, and it is what gets a player from the camp to the
    // city without three minutes of hacking through canopy.
    roads: [
      { width: 4, points: [R(512, 40), R(160, 250)] },
      // The dig has been here long enough to plant: `farms: true` puts the
      // camp's own plots and sheds along the causeway, which is the
      // difference between an expedition and a picture of one.
      //
      // ROUND 103, SECOND PASS -- THE MIDDLE POINT MOVED EAST, AND THAT IS
      // THE WHOLE EDIT. The first route ran (230,180) -> (400,380) -> the
      // ruin, which is almost exactly the line the river takes from (180,60)
      // to (360,400) -- so the road did not CROSS the river, it ran down the
      // valley on top of it, and `_stampRoad` paved twenty-seven tiles of
      // river out of existence. That is the identical fault round 79 pinned
      // in Ontaria and refused to let spread ("no NEW stretch of river has
      // been paved over by a road"), and test_round79b caught this one the
      // round it was introduced instead of two rounds later.
      //
      // The camp moved WEST of the river and the middle point went away
      // entirely: both legs now run from one side of the water to the other
      // and cross it once each, at an angle, which is what a causeway over a
      // river looks like from above. A road that shares a heading with a
      // river for any distance erases it, however the points are arranged.
      // Two legs, and the first one runs nearly EAST. A crossing's width on
      // the map is the road's width divided by the sine of the angle it meets
      // the water at, so a road that crosses at 25 degrees leaves a gap three
      // times its own width -- measured, a single diagonal leg here erased
      // twelve tiles of river against test_round79b's eight-tile ceiling for
      // what counts as a span. Crossing across the current instead of along
      // it costs one extra point and puts the gap back under the ceiling.
      // Width three rather than four for the same arithmetic: a causeway is a
      // raised way for people on foot, not a carriage road, and every tile of
      // width is another tile of river the crossing swallows.
      { width: 3, farms: true, points: [R(160, 250), R(600, 400), R(687, 587)] },
    ],
    // Act IV country: Gold, and it is the hardest ground in the game.
    //
    // ROUND 103, SECOND PASS -- and one of them ROAMS. Every other region in
    // the world has a solo of its top tier walking around in it (round 77's
    // item 2.1, and test_round77a asserts it); this region declared two
    // stationary group bands and nothing that moves, so it was the one place
    // where nothing could come to you. On the hardest ground in the game.
    spawnGroups: [
      // ROUND 103, SECOND PASS -- A BAND, NOT A SINGLE TIER.
      //
      // This declared tier 4 and nothing else, and it was the only region in
      // the world with a one-tier band. That made it wrong in two ways at
      // once: nowhere for a Gold player to warm up, and -- the reason it was
      // caught -- the region's DENS hold Silver, because the den tables are
      // four rows deep and a Gold region indexes the top one, which is the
      // Bratugal row. test_round43's "every region matches its declared
      // bands" reported tier 3 in a region declaring only 4.
      //
      // Silver packs and Gold everything else, which is Bratugal's shape one
      // act later and is what "the hardest ground in the game" should feel
      // like: the ordinary things here are what you fought last act, and the
      // ones that are not are the reason to be careful.
      { tier: 3, size: [4, 12], from: 0.00, weight: 3, label: 'pack', roamChance: 0.5 },
      { tier: 4, size: [2, 8], from: 0.15, weight: 5, label: 'pack', roamChance: 0.55 },
      { tier: 4, size: [10, 30], from: 0.30, weight: 3, label: 'super pack' },
      { tier: 4, size: [1, 1], from: 0.40, weight: 2, label: 'solo', roams: true },
    ],
    exit: null,
  },
];

// ROUND 134 (item 6) -- THE EDITOR'S OVERLAY, FOLDED IN HERE AND NOWHERE ELSE.
//
// `src/data/regionEdits.js` carries the two arrays the desktop editor writes:
// `placed` (round 107's override layer, which this round gives a `blank` kind
// so a building can be REMOVED as well as added) and `terrain` (painted
// rectangles over the tile types). See that file for why they are not written
// into this one.
//
// Applied BEFORE `REGION_BY_ID` is built and before anything exports, so every
// one of the several hundred reads of `REGIONS` in this codebase sees the
// finished list and none of them has to know an overlay exists.
applyRegionEdits(REGIONS);

export const REGION_BY_ID = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// --- lookups ---------------------------------------------------------------
/** Region containing this world point, or null (the interior band). */
export function regionAt(wx, wy) {
  const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
  return regionAtTile(tx, ty);
}
export function regionAtTile(tx, ty) {
  if (tx < 0 || ty < 0 || ty >= INTERIOR_BAND_Y0 || tx >= WORLD_TILES) return null;
  const col = Math.floor(tx / REGION_TILES), row = Math.floor(ty / REGION_TILES);
  return REGIONS.find(r => r.col === col && r.row === row) || null;
}
/** A region's own origin, in world units. */
export function regionOrigin(region) {
  return { x: region.col * REGION_TILES * TILE, y: region.row * REGION_TILES * TILE };
}
/** Region-local tile coords -> absolute world units, on the tile CORNER.
 *  Not the tile centre, and the difference matters: the town's paving rings
 *  are struck in whole tiles from the town centre (round 30), so a centre
 *  sitting half a tile off the grid lands the ring boundaries asymmetrically
 *  -- measured as 4 of 14 mirrored pairs matching instead of 14 of 14. */
export function regionPoint(region, p) {
  const o = regionOrigin(region);
  return { x: o.x + p.tx * TILE, y: o.y + p.ty * TILE };
}
/** The world point a player lands on when they enter this region. */
export function arrivalPoint(region) { return regionPoint(region, region.arrival); }
/** The region the game starts in. */
export function startRegion() { return REGIONS.find(r => r.isStart) || REGIONS[0]; }

/** 0..1 -- how far this point is from its region's arrival, as a fraction of
 *  the region's half-width. Drives which spawn groups are allowed to appear. */
export function dangerFraction(region, wx, wy) {
  const a = arrivalPoint(region);
  const half = (REGION_TILES * TILE) / 2;
  return Math.min(1, Math.hypot(wx - a.x, wy - a.y) / half);
}

/** Every settlement in the world, tagged with its region. */
export function allSettlements() {
  const out = [];
  for (const r of REGIONS) for (const s of (r.settlements || [])) out.push({ ...s, region: r });
  return out;
}
