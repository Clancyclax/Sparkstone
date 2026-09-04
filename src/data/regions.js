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

// One new tile id beyond the ones town.js (0-7) and interiors.js (8-11) own:
// a region's ROUGH ground -- Elehyd's icy peaks, Bratugal's bog. It renders
// from whichever pack that region names as its accent, so one id covers
// every biome's second surface.
export const TILE_ACCENT = 12;

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
};
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
export const WORLD_COLS = 2, WORLD_ROWS = 2;
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
export const MAP_TILES_TOTAL = REGION_TILES * WORLD_ROWS
  + INTERIOR_BAND_TILES + ASTRAL_BAND_TILES;                             // 2656

// Region-local helpers: authoring is in TILES from the region's own corner.
const R = (tx, ty) => ({ tx, ty });

// --- the regions -----------------------------------------------------------
export const REGIONS = [
  {
    id: 'nek', name: 'The Nek', index: 0, col: 0, row: 0,
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
      { width: 5, farms: true, points: [R(468, 562), R(450, 600), R(410, 630), R(360, 660), R(300, 700), R(260, 770), R(200, 830), R(140, 900), R(52, 986)] },
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
    ],
    // "Map exit is at the end of the road to the south west and should have 2
    // gate guards that wont let a player through until they reach Bronze."
    exit: {
      kind: 'gate', at: R(52, 986), to: 'ontaria', requiredRank: 'bronze', guards: 2,
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
      { width: 7, points: [R(300, 250), R(340, 480), R(390, 700), R(400, 840)] },
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
      { width: 8, bridgesEvery: 260, points: [R(0, 520), R(240, 560), R(520, 600), R(800, 660), R(1023, 700)] },
      { width: 6, bridgesEvery: 300, points: [R(560, 0), R(600, 220), R(640, 430), R(700, 640), R(760, 1023)] },
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
      { width: 3, dirt: true, fade: 0.6, farms: true, points: [R(220, 800), R(360, 700), R(520, 620), R(660, 560)] },
      { width: 3, dirt: true, fade: 0.45, points: [R(220, 800), R(180, 620), R(210, 420), R(260, 300)] },
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
      { width: 10, bridgesAt: [0.35, 0.7],
        points: [R(1023, 300), R(820, 340), R(600, 400), R(360, 470), R(120, 560)] },
      { width: 8, bridgesAt: [0.5],
        points: [R(700, 1023), R(660, 800), R(600, 620), R(520, 470)] },
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
];

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
