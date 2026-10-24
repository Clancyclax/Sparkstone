// ===========================================================================
// ROUND 78 ITEM 6.1, PLACED IN ROUND 79 -- THE MARKET AND THE STREET.
//
//   "Market stalls and city props for the cities."
//
// Round 78 packed both sheets and placed neither, and said so plainly:
// "scattering them through twenty-five settlements needs placement rules of
// its own, and I would rather do that properly than sprinkle them." This is
// those rules.
//
// WHAT EACH CELL ACTUALLY IS was settled by LOOKING AT THE SHEET, not by
// reading the pack's prompts -- all sixteen stalls are prompted "Market
// Stalls" and ten of the eleven city objects are prompted "medieval city
// objects", so the metadata cannot tell a fountain from an anvil. Round 78
// learned this the expensive way when a pack's metadata called an old bald
// man a female priest.
//
// The ROLE is what the placer reads, and it is the whole of the design:
//
//   landmark  one per settlement, on the square. A town has a fountain or a
//             well the way it has a name -- you should be able to say "meet
//             me at the fountain" -- so exactly one is placed and it is the
//             same one every time the world is built.
//   market    a stall. Laid in a ROW along a street rather than scattered,
//             because a market is a row; three stalls dotted round a plaza
//             read as three abandoned stalls.
//   goods     what a stall SELLS, set down beside one. Never solid: the
//             player has to be able to walk up to the counter.
//   street    furniture that belongs on a pavement -- a bench, a handcart.
//   clutter   what is stacked against a wall and forgotten.
//   smithy    the anvil, which goes beside a forge or nowhere at all.
// ===========================================================================

export const CITY_STALL_ART = {
  key: 'cityStalls', file: './public/assets/city_stalls.png',
  cell: 80, count: 16,
  // The sheets are packed foot-anchored into an 80px cell by
  // extract_round78_objects.py's `paste_cell`, so the contact point is the
  // bottom-centre of the cell less its two-pixel margin -- the same anchor
  // convention INTERIOR_PROP_ART uses, and for the same reason: an object
  // sorted by its middle sinks into the ground behind it.
  // ROUND 79 -- 0.62 -> 0.85 after looking at Cadence's square (a stall stood
  // shorter than the character walking past it), then 0.85 -> 2.55 on the
  // user's own review: "Market Stalls should be about 200% larger."
  //
  // 200% LARGER IS THREE TIMES, not two -- the phrase names the increase, not
  // the result -- so 0.85 x 3. A stall is now roughly two and a half
  // characters tall, which is about right for a timber frame with an awning
  // over it and is what makes a market read as a place rather than as
  // furniture.
  scale: 2.55, footX: 0.5, footY: 0.94,
};
export const CITY_PROP_ART = {
  key: 'cityProps', file: './public/assets/city_cityprops.png',
  cell: 80, count: 11,
  // ROUND 89 -- 0.78 -> 1.95, MEASURED RATHER THAN NUDGED.
  //
  //   "The added objects to the city are scattered haphazardly and way too
  //    small to see."
  //
  // The stalls were tripled to 2.55 in round 79 on the note directly above
  // this one and the props were left at 0.78, so the two have been drawn at a
  // 3.3x disparity ever since. Measured content inside the 80px cells: props
  // carry 42-62px of real ink, so 0.78 put a barrel on screen at about 40px
  // tall. A character is 60-75px and a tile diamond is 64x32 -- the props were
  // half a person high and well under a tile wide, which is precisely "too
  // small to see".
  //
  // 1.95 puts a barrel at roughly 100px: clearly bigger than a person, clearly
  // smaller than a market stall, and legible from across a square. Deliberately
  // NOT matched to the stalls' 2.55 -- a stall is a building you shop at and a
  // barrel is a thing beside a wall, and that difference should still read.
  scale: 1.95, footX: 0.5, footY: 0.94,
};

// ROUND 381 -- THE 64 NEW PROPS (42 city: flowers, flags, street, clutter; 22 world: city, tavern, lab, ritual, farm,
// river, cave, astral -- the windmill and the water wheel are left out on the user's word). One sheet, packed by
// tools/pack_props_r381.py into 80px cells foot-anchored at (40, 77) the way extract_round78_objects.py's paste_cell
// packed city_cityprops.png, so the same footX/footY. The manifest beside the sheet (city_props_r381.json) is the
// key -> cell map; CITY_PROPS_R381 below repeats it as code so nothing has to fetch JSON at load.
//
// SCALE IS PER PROP, because the source art is not drawn to one pixel scale (a bench is 46px of ink and a flagpole
// 74). `scale` is the sprite scale, chosen against a character of about 64px on screen: a bench knee-to-waist
// (~30px), a flagpole, bell post, pillar or statue two characters and more (~140-160px), mugs and plates small enough
// to sit on a table top (~25px). The sheet itself is drawn at scale 1; the per-prop number rides on the record.
//
//   role   the existing placer role (street / clutter / landmark ...) -- what the round-79 generic loop reads
//   at     where the round-380 dressing pass (cityPropsR381Mixin.js) puts it
//   flat   a floor decal: squashed vertically by `squash`, drawn under everything, never solid; `oy` is the middle of
//          its ink in the cell, so the circle is centred on its point rather than standing on it
//   float  floating scenery: drawn above the floor layer, never solid
export const CITY_PROP_ART_R381 = {
  key: 'cityPropsR381', file: './public/assets/city_props_r381.png',
  cell: 80, count: 64, scale: 1, footX: 0.5, footY: 0.94,
};
/** ROUND 387 -- the ritual circles at 4x (tools/make_ritual_hd.py: cells 52-54 of city_props_r381.png, nearest-neighbour),
 *  drawn at 1/4 of the prop's scale. Same ink, same anchor, whole pixels. */
export const RITUAL_CIRCLES_HD = { key: 'ritualCirclesHd', file: './public/assets/ritual_circles_hd.png', cell: 320, up: 4,
  frames: { ritualCircleChalk: 0, ritualCircleGold: 1, ritualCircleSilver: 2 } };
/** ROUND 389 -- the property signs join the street props' family: For Rent / For Purchase / For Rent or Purchase /
 *  Vacancy / No Vacancy, wooden and magical, packed foot-anchored as the r381 sheet (tools/pack_signs_r389.py) and
 *  magnified 4x nearest as the ritual circles were. Their table, scale and the rules for where they stand and what
 *  they say live in propertySigns.js; they are placed by what they say (homeMixin.js, propertySignsMixin.js), never
 *  by the dressing pass. */
export { PROPERTY_SIGN_ART, PROPERTY_SIGNS } from './propertySigns.js';
export const CITY_PROPS_R381 = {
  // flowers
  flowerboxGeranium:  { idx: 0,  cat: 'flowers', role: 'street',  at: 'window',  scale: 1.1 },
  flowerboxLavender:  { idx: 1,  cat: 'flowers', role: 'street',  at: 'kerb',    scale: 1.2,  solid: true, radius: 16 },
  flowerboxMarigold:  { idx: 2,  cat: 'flowers', role: 'street',  at: 'window',  scale: 1.1 },
  planterUrn:         { idx: 3,  cat: 'flowers', role: 'street',  at: 'kerb',    scale: 1.2,  solid: true, radius: 12 },
  planterBarrel:      { idx: 4,  cat: 'flowers', role: 'street',  at: 'kerb',    scale: 1.15, solid: true, radius: 12 },
  hangingBasket:      { idx: 5,  cat: 'flowers', role: 'street',  at: 'door',    scale: 1.1 },
  potCluster:         { idx: 6,  cat: 'flowers', role: 'street',  at: 'door',    scale: 1.0 },
  flowerBed:          { idx: 7,  cat: 'flowers', role: 'street',  at: 'square',  scale: 1.5,  solid: true, radius: 26 },
  roseTrellis:        { idx: 8,  cat: 'flowers', role: 'street',  at: 'wall',    scale: 1.3,  solid: true, radius: 12 },
  topiaryPot:         { idx: 9,  cat: 'flowers', role: 'street',  at: 'kerb',    scale: 1.3,  solid: true, radius: 12 },
  treePlanter:        { idx: 10, cat: 'flowers', role: 'street',  at: 'kerb',    scale: 1.8,  solid: true, radius: 16 },
  flowerCart:         { idx: 11, cat: 'flowers', role: 'market',  at: 'market',  scale: 1.4,  solid: true, radius: 20 },
  // flags
  flagpoleCity:       { idx: 12, cat: 'flags',   role: 'street',  at: 'civic',   scale: 2.0,  solid: true, radius: 10 },
  flagpoleRed:        { idx: 13, cat: 'flags',   role: 'street',  at: 'gate',    scale: 2.0,  solid: true, radius: 8 },
  bannerPoleBlue:     { idx: 14, cat: 'flags',   role: 'street',  at: 'gate',    scale: 1.8,  solid: true, radius: 8 },
  bannerPoleGreen:    { idx: 15, cat: 'flags',   role: 'street',  at: 'square',  scale: 1.8,  solid: true, radius: 8 },
  bannerWall:         { idx: 16, cat: 'flags',   role: 'street',  at: 'front',   scale: 1.2 },
  buntingPosts:       { idx: 17, cat: 'flags',   role: 'market',  at: 'market',  scale: 1.9 },
  guildStandard:      { idx: 18, cat: 'flags',   role: 'street',  at: 'front',   scale: 1.7,  solid: true, radius: 12 },
  festivalArch:       { idx: 19, cat: 'flags',   role: 'market',  at: 'market',  scale: 2.6 },
  // street
  benchBacked:        { idx: 20, cat: 'street',  role: 'street',  at: 'square',  scale: 1.3,  solid: true, radius: 14 },
  benchStone:         { idx: 21, cat: 'street',  role: 'street',  at: 'square',  scale: 1.3,  solid: true, radius: 14 },
  signpost:           { idx: 22, cat: 'street',  role: 'street',  at: 'junction', scale: 2.0, solid: true, radius: 8 },
  shopSign:           { idx: 23, cat: 'street',  role: 'street',  at: 'tavern',  scale: 2.2,  solid: true, radius: 8 },
  noticeBoard:        { idx: 24, cat: 'street',  role: 'street',  at: 'square',  scale: 2.1,  solid: true, radius: 14 },
  sandwichBoard:      { idx: 25, cat: 'street',  role: 'street',  at: 'tavern',  scale: 1.25, solid: true, radius: 8 },
  waterTrough:        { idx: 26, cat: 'street',  role: 'street',  at: 'inn',     scale: 1.4,  solid: true, radius: 18 },
  hitchingRail:       { idx: 27, cat: 'street',  role: 'street',  at: 'inn',     scale: 1.5,  solid: true, radius: 16 },
  bollardsChain:      { idx: 28, cat: 'street',  role: 'street',  at: 'square',  scale: 1.3,  solid: true, radius: 14 },
  milestone:          { idx: 29, cat: 'street',  role: 'street',  at: 'road',    scale: 1.0,  solid: true, radius: 8 },
  birdbath:           { idx: 30, cat: 'street',  role: 'street',  at: 'garden',  scale: 1.0,  solid: true, radius: 10 },
  criersPodium:       { idx: 31, cat: 'street',  role: 'street',  at: 'square',  scale: 1.6,  solid: true, radius: 18 },
  bellPost:           { idx: 32, cat: 'street',  role: 'street',  at: 'square',  scale: 1.9,  solid: true, radius: 8 },
  weatherVane:        { idx: 33, cat: 'street',  role: 'street',  at: 'square',  scale: 1.9,  solid: true, radius: 8 },
  knightStatue:       { idx: 34, cat: 'street',  role: 'landmark', at: 'square', scale: 2.2,  solid: true, radius: 14 },
  stocks:             { idx: 35, cat: 'street',  role: 'street',  at: 'square',  scale: 1.5,  solid: true, radius: 16 },
  // clutter -- against walls, in yards and back lanes, never mid-road
  rainBarrel:         { idx: 36, cat: 'clutter', role: 'clutter', at: 'wall',    scale: 1.2,  solid: true, radius: 12 },
  hayBales:           { idx: 37, cat: 'clutter', role: 'clutter', at: 'wall',    scale: 1.4,  solid: true, radius: 16 },
  firewoodStack:      { idx: 38, cat: 'clutter', role: 'clutter', at: 'wall',    scale: 1.3,  solid: true, radius: 16 },
  bucketBroom:        { idx: 39, cat: 'clutter', role: 'clutter', at: 'wall',    scale: 1.3 },
  clothesline:        { idx: 40, cat: 'clutter', role: 'yard',    at: 'yard',    scale: 2.2 },
  pumpkinPile:        { idx: 41, cat: 'clutter', role: 'clutter', at: 'wall',    scale: 1.2,  solid: true, radius: 14 },
  // world -- astral, cave, river, farm
  astralIslandSmall:  { idx: 42, cat: 'astral',  role: 'scenery', at: 'astral',  scale: 2.0,  float: true },
  astralIslandTwin:   { idx: 43, cat: 'astral',  role: 'scenery', at: 'astral',  scale: 2.0,  float: true },
  stalagmites:        { idx: 44, cat: 'cave',    role: 'scenery', at: 'cave',    scale: 2.0,  solid: true, radius: 20 },
  stalagmitesCrystal: { idx: 45, cat: 'cave',    role: 'scenery', at: 'cave',    scale: 2.0,  solid: true, radius: 20 },
  reedCluster:        { idx: 46, cat: 'river',   role: 'scenery', at: 'bank',    scale: 1.7 },
  steppingStones:     { idx: 47, cat: 'river',   role: 'scenery', at: 'crossing', scale: 1.6, flat: true, squash: 1, oy: 0.644 },
  washingStation:     { idx: 48, cat: 'river',   role: 'scenery', at: 'bank',    scale: 1.3,  solid: true, radius: 14 },
  scarecrow:          { idx: 49, cat: 'farm',    role: 'scenery', at: 'field',   scale: 1.5,  solid: true, radius: 10 },
  beehiveBox:         { idx: 50, cat: 'farm',    role: 'scenery', at: 'fieldEdge', scale: 1.25, solid: true, radius: 12 },
  vegetablePatch:     { idx: 51, cat: 'farm',    role: 'scenery', at: 'field',   scale: 1.8 },
  // ritual -- flat floor decals, squashed to lie on the iso floor
  ritualCircleChalk:  { idx: 52, cat: 'ritual',  role: 'interior', at: 'cult',   scale: 2.4,  flat: true, squash: 0.6, oy: 0.656 },
  ritualCircleGold:   { idx: 53, cat: 'ritual',  role: 'interior', at: 'temple', scale: 2.6,  flat: true, squash: 0.6, oy: 0.7 },
  ritualCircleSilver: { idx: 54, cat: 'ritual',  role: 'interior', at: 'astral', scale: 2.8,  flat: true, squash: 0.6, oy: 0.6625 },
  // lab, tavern
  alembicRig:         { idx: 55, cat: 'lab',     role: 'interior', at: 'lab',    scale: 1.5,  solid: true, radius: 22 },
  bardStage:          { idx: 56, cat: 'tavern',  role: 'interior', at: 'corner', scale: 1.8,  solid: true, radius: 26 },
  dartboard:          { idx: 57, cat: 'tavern',  role: 'interior', at: 'wall',   scale: 1.4,  solid: true, radius: 8 },
  diceTable:          { idx: 58, cat: 'tavern',  role: 'interior', at: 'floor',  scale: 1.5,  solid: true, radius: 20 },
  mugsAndPlates:      { idx: 59, cat: 'tavern',  role: 'interior', at: 'table',  scale: 0.7 },
  menuBoard:          { idx: 60, cat: 'tavern',  role: 'interior', at: 'wall',   scale: 1.2 },
  boarHead:           { idx: 61, cat: 'tavern',  role: 'interior', at: 'wall',   scale: 1.1 },
  // city
  guardPost:          { idx: 62, cat: 'city',    role: 'street',  at: 'gate',    scale: 2.0,  solid: true, radius: 22 },
  wantedPillar:       { idx: 63, cat: 'city',    role: 'street',  at: 'square',  scale: 1.8,  solid: true, radius: 12 },
};
export const CITY_PROP_KEYS_R381 = Object.keys(CITY_PROPS_R381);
/** ROUND 381 -- the new clutter joins the round-89 clutter loop's bank, so every town gets some, against its walls. */
export const CITY_CLUTTER_R381 = CITY_PROP_KEYS_R381.filter(k => CITY_PROPS_R381[k].role === 'clutter');
/** ROUND 381 -- the same self-check as cityPropFaults, for the new sheet. */
export function cityPropR381Faults() {
  const out = [];
  const seen = new Set();
  for (const k of CITY_PROP_KEYS_R381) {
    const p = CITY_PROPS_R381[k];
    if (!(p.idx >= 0 && p.idx < CITY_PROP_ART_R381.count)) out.push(`${k}: idx ${p.idx} is off the sheet`);
    if (seen.has(p.idx)) out.push(`two props share cell ${p.idx}`);
    seen.add(p.idx);
    if (p.solid && !(p.radius > 0)) out.push(`${k}: solid with no radius`);
    if ((p.flat || p.float) && p.solid) out.push(`${k}: a decal or floating prop must not be solid`);
    if (!(p.scale > 0)) out.push(`${k}: no scale`);
  }
  if (CITY_PROP_KEYS_R381.length !== 64) out.push(`expected 64 props, have ${CITY_PROP_KEYS_R381.length}`);
  for (const k of ['windmill', 'waterWheel']) if (CITY_PROPS_R381[k]) out.push(`${k} must be left out`);
  return out;
}

export const CITY_PROPS = {
  // ROUND 89 -- THE RADII GREW, BUT NOT BY THE FULL 2.5x, AND THE REASON IS
  // WORTH KEEPING.
  //
  // Round 79's note one table up says a collision circle must move with the
  // art, and it must. The first attempt multiplied every radius by the same
  // 2.5 the scale grew by, and that is wrong twice over: a collision radius is
  // a circle on the GROUND, and most of what a 2.5x scale buys an isometric
  // sprite is HEIGHT. A barrel drawn two and a half times taller does not sit
  // on two and a half times as much floor.
  //
  // It also broke placement outright. `put` rejects a spot whose
  // `_collidesObstacle(x, y, radius + 6)` hits anything, so a fountain at
  // radius 47 could not find room anywhere near a square -- measured, nine of
  // the eleven prop kinds stopped reaching the world at all, caught by round
  // 79c's "every one of the eleven city objects reaches the world".
  //
  // 1.6x is the footprint growth rather than the height growth: big enough
  // that the player cannot walk through the middle of a fountain, small enough
  // that the thing can still be put down.
  statue:        { idx: 0,  role: 'landmark', solid: true,  radius: 24 },
  benchStone:    { idx: 1,  role: 'street',   solid: false },
  // ROUND 79 -- radius 17 -> 44 with the art. A collision circle that stayed
  // at the old size while the sprite tripled would let two stalls stand inside
  // each other's canopies and let the player walk through the counter.
  stallAwning:   { idx: 2,  role: 'market',   solid: true,  radius: 44 },
  spicePots:     { idx: 3,  role: 'goods',    solid: false },
  produceCrates: { idx: 4,  role: 'goods',    solid: false },
  handcart:      { idx: 5,  role: 'street',   solid: true,  radius: 21 },
  barrelStack:   { idx: 6,  role: 'clutter',  solid: true,  radius: 22 },
  well:          { idx: 7,  role: 'landmark', solid: true,  radius: 24 },
  amphorae:      { idx: 8,  role: 'clutter',  solid: false },
  anvil:         { idx: 9,  role: 'smithy',   solid: true,  radius: 19 },
  fountain:      { idx: 10, role: 'landmark', solid: true,  radius: 30 },
};
export const CITY_PROP_KEYS = Object.keys(CITY_PROPS);
const byRole = (r) => CITY_PROP_KEYS.filter(k => CITY_PROPS[k].role === r);
export const CITY_LANDMARKS = byRole('landmark');
export const CITY_GOODS = byRole('goods');
export const CITY_STREET = byRole('street');
export const CITY_CLUTTER = byRole('clutter');

/**
 * The landmark a settlement of this size gets.
 *
 * A city gets the fountain, because a fountain is civic engineering and a
 * hamlet has not got the money. A hamlet gets the well, because a hamlet
 * needs water and has no aqueduct. The statue goes to the middle rung, where
 * a place is proud enough to raise one and small enough that it is the only
 * thing to look at.
 *
 * Deliberately a function of the SETTLEMENT KIND rather than a roll: the
 * player should be able to tell how big somewhere is before they have walked
 * it, and "there is a fountain here" is that information.
 */
export function landmarkFor(kind, radiusTiles) {
  if (kind === 'city' || radiusTiles >= 30) return 'fountain';
  if (kind === 'town' || radiusTiles >= 14) return 'statue';
  return 'well';
}

/** How many stalls a settlement of this size supports, and 0 for the ones
 *  too small to hold a market at all. Two stalls is a market; one is a man
 *  with a table. */
export function stallCountFor(radiusTiles) {
  if (radiusTiles < 12) return 0;
  return Math.max(2, Math.min(8, Math.round(radiusTiles / 7)));
}

/** Everything the sheets declare, checked against itself -- an index past the
 *  end of a sheet draws nothing at all, which looks exactly like a prop that
 *  was never placed. */
export function cityPropFaults() {
  const out = [];
  for (const k of CITY_PROP_KEYS) {
    const p = CITY_PROPS[k];
    if (p.idx < 0 || p.idx >= CITY_PROP_ART.count) out.push(`${k}: idx ${p.idx} is off the sheet`);
    if (p.solid && !(p.radius > 0)) out.push(`${k}: solid with no radius`);
  }
  const idx = CITY_PROP_KEYS.map(k => CITY_PROPS[k].idx);
  for (const i of idx) if (idx.filter(x => x === i).length > 1) out.push(`two props share cell ${i}`);
  if (!CITY_LANDMARKS.length) out.push('no landmark prop');
  if (!CITY_GOODS.length) out.push('no goods prop');
  return [...new Set(out)];
}
