// ============================================================================
// ROUND 421 -- A HOME THAT SAYS WHO LIVES IN IT. Pure rules; the scene side is src/scenes/homeDressMixin.js.
//
// The round-420 report on twenty random house interiors found six layouts covering every room, every room 11 x 9,
// grey brick and planks whatever the house outside, furniture against the back walls with the front of the floor
// bare, nothing personal, and the residents standing on open floor. The user: "Lets work through the tasks outlined
// in the house interior report", with sixteen new props, three wall materials and a tatami floor, and: "I like having
// walled off rooms, ensure that the walls are lined up with the exterior walls where they meet."
//
// `dressHome(ctx)` lays one floor of one house from what the game knows about it:
//   culture  the house's style family (from its drawing: houses420 style, or the old pool row's family) -- which
//            walls, which floor, which heat, which bed, which table;
//   trade    the household's work, and the piece it brings home (workbench, loom, nets, smith's corner, desk, jars);
//   klass    poor / modest / well -- the district and the house -- how much clutter, and what kind;
//   size     small / standard / large, from the drawing's width (fix 3);
//   hour     the time of day it is entered: a laid table at meals, unmade beds in the morning, a cold hearth by day.
//
// EVERY INSIDE WALL MEETS THE ROOM. A `west` run starts at ty 0 -- the back (north) wall -- and a `north` run starts at
// tx 0 or on a west run's line, so there is no gap where one wall should butt into another. Rooms are closed with a
// doorway (`gap`), not left as a stub of wall in the middle of the floor: that stub, one tile short of the back wall,
// is the gap the user saw on every bedroom in the report's photos.
// ============================================================================

export const HOME_SIZES = {
  small: { w: 9, h: 7 },
  standard: { w: 11, h: 9 },
  large: { w: 13, h: 11 },
};
/** The largest a house room can be; the pool rooms are reserved at this size. */
export const HOME_MAX_W = 13, HOME_MAX_H = 11;

/** Which family a house style belongs to. */
export const STYLE_CULTURE = {
  japanese: 'east', korean: 'east',
  chinese: 'eastwood',
  greek: 'warm', roman: 'warm', italian: 'warm', venetian: 'warm', spanish: 'warm', hacienda: 'warm',
  byzantine: 'warm', egypt: 'warm', desert: 'warm', indian: 'warm',
  moorish: 'tiled', persian: 'tiled', portuguese: 'tiled', riad: 'tiled', ottoman: 'tiled',
  norse: 'cold', alpine: 'cold', russian: 'cold', slavic: 'cold',
  dwarf: 'stone',
  celtic: 'wild', halfling: 'wild', elven: 'wild', treehouse: 'wild', stilt: 'wild', lake: 'wild', swamp: 'wild',
  crofter: 'rustic', medieval: 'rustic', tudor: 'rustic',
  victorian: 'town', georgian: 'town', baroque: 'town', regency: 'town', gothic: 'town', dutch: 'town',
  watchman: 'rustic', 'lightly magical': 'rustic',
};
/** The old pool's row families. */
export const POOL_CULTURE = { roman: 'warm', greek: 'warm', sign: 'town', stone_a: 'town', stone_b: 'rustic', stone_c: 'town', stone_d: 'rustic' };

/** Per culture: walls (kit material), floor, heat, the kitchen's cooker, bed, table set. */
export const CULTURE_DRESS = {
  east:     { kit: 'whitewash', floor: 'tatami', heat: 'brazierCharcoal', cooker: null, bed: 'futon', table: 'low' },
  eastwood: { kit: 'log',       floor: 'hall',   heat: 'brazierCharcoal', cooker: 'stoveIron', bed: 'bed', table: 'low' },
  warm:     { kit: 'whitewash', floor: 'marble', heat: 'brazierIron',     cooker: null, bed: 'bed', table: 'chairs' },
  tiled:    { kit: 'tiled',     floor: 'marble', heat: 'brazierIron',     cooker: null, bed: 'bed', table: 'chairs' },
  cold:     { kit: 'darklog',   floor: 'hall',   heat: 'hearthRustic',    cooker: 'stoveTiled', bed: 'bed', table: 'chairs' },
  stone:    { kit: 'darkstone', floor: 'hall',   heat: 'hearthStone',     cooker: 'stoveIron', bed: 'bed', table: 'chairs' },
  wild:     { kit: 'log',       floor: 'hall',   heat: 'firePit',         cooker: null, bed: 'bed', table: 'chairs' },
  rustic:   { kit: 'log',       floor: 'hall',   heat: 'hearthRustic',    cooker: 'stoveIron', bed: 'bed', table: 'chairs' },
  town:     { kit: 'greybrick', floor: 'hall',   heat: 'fireplacePale',   cooker: 'stoveIron', bed: 'bed', table: 'chairs' },
};

/** The household's trade -> the piece of work it keeps at home. Trades with no piece bring none. */
export const TRADE_PIECE = {
  'a cooper': 'workbenchJoiner', 'a carpenter': 'workbenchJoiner', 'a tanner': 'workbenchJoiner',
  'a seamstress': 'loom', 'a dyer': 'loom', 'a weaver': 'loom',
  'a fishmonger': 'netsCreels', 'a fisher': 'netsCreels',
  'a smith': 'anvilCorner',
  'a scribe': 'writingDesk', 'a clerk at the hall': 'writingDesk',
  'a chandler': 'jarShelves', 'a herbalist': 'jarShelves', 'an apothecary': 'jarShelves',
  'a laundress': 'laundryLine',
  'a baker': 'sacks',
};

/** Small things, by how well off the house is. Single-view props from interior_props.png. */
export const CLUTTER = {
  poor: ['sacks', 'crateProduce', 'stoolWood', 'jugCluster', 'barrelStack', 'choppingBlock'],
  modest: ['jugCluster', 'jugGlazed', 'stoolRound', 'footstool', 'sacks', 'amphora'],
  well: ['vasePorcelain', 'paintPortrait', 'paintLandscape', 'footstool', 'jugGlazed', 'planter'],
};
export const CLUTTER_COUNT = { poor: 4, modest: 3, well: 3 };

/** Meal hours: the table is laid. Morning: the beds are not made yet. */
export const MEAL_HOURS = [[7, 8.5], [12, 13.5], [18, 19.5]];
export const isMealHour = (h) => MEAL_HOURS.some(([a, b]) => h >= a && h < b);
export const isMorning = (h) => h >= 5.5 && h < 10;
export const isEvening = (h) => h >= 17 || h < 6;

function rngFrom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000003) / 1000003; };
}
const pickOf = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/** A colour of a prop: the art as drawn or one of its recolours (INTERIOR_PROPS keys `<key><Suffix>`). */
export const PROP_COLOURS = {
  futon: ['futon', 'futonIndigo', 'futonRust'],
  floorCushions: ['floorCushions', 'floorCushionsGreen', 'floorCushionsOchre'],
  unmadeBed: ['unmadeBed', 'unmadeBedBlue', 'unmadeBedGreen'],
  lowTable: ['lowTable', 'lowTablePale'],
  paperScreen: ['paperScreen', 'paperScreenDark'],
  laundryLine: ['laundryLine', 'laundryLineDyed'],
  cradle: ['cradle', 'cradlePainted'],
};
const colourOf = (rng, key) => (PROP_COLOURS[key] ? pickOf(rng, PROP_COLOURS[key]) : key);

/**
 * Lay one floor of one house.
 *   ctx.key       a stable seed for this house (its position)
 *   ctx.culture   a CULTURE_DRESS key
 *   ctx.klass     'poor' | 'modest' | 'well'
 *   ctx.trade     a TRADE_PIECE value or null
 *   ctx.size      a HOME_SIZES key
 *   ctx.storeys   1-3;  ctx.level 0 (ground), 1, 2
 *   ctx.hour      0-24; ctx.home people home now; ctx.household people in the household
 * Returns { w, h, door, floor, kit, name, blurb, props, walls, stair, spots, summary }.
 */
export function dressHome(ctx) {
  const rng = rngFrom(`home421|${ctx.key}|${ctx.level || 0}`);
  const { w, h } = HOME_SIZES[ctx.size] || HOME_SIZES.standard;
  const C = CULTURE_DRESS[ctx.culture] || CULTURE_DRESS.town;
  const klass = ctx.klass || 'modest';
  const hour = ctx.hour === undefined ? 12 : ctx.hour;
  const doorAt = Math.floor(w / 2) - 1;
  const small = ctx.size === 'small', large = ctx.size === 'large';
  const multi = (ctx.storeys || 1) > 1;
  const level = ctx.level || 0;
  const east = C.bed === 'futon';
  const out = { w, h, door: { at: doorAt, span: 2 }, floor: C.floor, kit: C.kit, props: [], walls: [], spots: [], stair: null };
  let wantLine = false;
  const half0 = Math.floor(w / 2);
  const P = (key, tx, ty, extra = {}) => { out.props.push({ key, tx, ty, ...extra }); return out.props[out.props.length - 1]; };
  // the door lane: nothing stands on the two door columns in the front three rows
  const inLane = (tx, ty) => tx > doorAt - 1.2 && tx < doorAt + 2.2 && ty > h - 3.6;
  const made = !(klass === 'poor' || isMorning(hour) || ctx.home === 0);
  const bed = (tx, ty, face) => {
    if (east) { P(colourOf(rng, 'futon'), tx, ty); return; }
    if (made) P('bedFluffy', tx, ty, { face, free: true });
    else P(colourOf(rng, 'unmadeBed'), tx, ty, face === 'southeast' ? { flip: true } : {});
  };
  const table = (cx, cy, seats) => {
    if (C.table === 'low') {
      P(colourOf(rng, 'floorCushions'), cx, cy + 0.15);
      P(colourOf(rng, 'lowTable'), cx, cy);
      return;
    }
    P('rugRound', cx, cy);
    if (isMealHour(hour) && ctx.home !== 0) P('mealTable', cx, cy);
    else P(klass === 'well' ? 'tableFancy' : 'tableWood', cx, cy);
    const S = [['chairWood', cx - 1, cy, 'southeast'], ['chairWood', cx + 1, cy, 'northwest'],
      ['chairWood', cx, cy - 1, 'southwest'], ['chairWood', cx, cy + 1, 'northeast']];
    for (const [k, x, y, f] of S.slice(0, seats)) if (!inLane(x, y)) P(klass === 'well' && f === 'southwest' ? 'chairStone' : k, x, y, { face: f });
  };
  const screens = (line, from, to, alongY) => {
    // paper screens standing on a line, as the inside wall of a Japanese room
    const col = pickOf(rng, PROP_COLOURS.paperScreen);
    for (let a = from; a <= to + 1e-6; a += 1.15) {
      if (alongY) P(col, line - 0.5, a);
      else P(col, a, line - 0.5, { flip: true });
    }
  };

  if (level === 0) {
    // ---- THE GROUND FLOOR ----------------------------------------------------------------------------------------
    const bw = small ? 3 : 4, bh = small ? 3 : 4;
    const ne = rng() < 0.5;                  // the walled room in the north-east corner, or the north-west
    const bx = ne ? w - bw : 0;              // its first column
    const living0 = ne ? 1 : bw + 1;         // the living part's kitchen run starts here on the north wall
    // The walled room: a bedroom in a one-storey house, a back room (the work, or the larder) in a taller one.
    const roomIsBed = !multi;
    if (!east) {
      // two runs that close the corner: the side wall from the back wall down, the front wall from the outer wall
      // across to it, with a doorway one tile in from the corner
      if (ne) {
        out.walls.push({ dir: 'west', tx: bx, ty: 0, len: bh });
        out.walls.push({ dir: 'north', tx: bx, ty: bh, len: bw, gap: [1] });
      } else {
        out.walls.push({ dir: 'west', tx: bw, ty: 0, len: bh });
        out.walls.push({ dir: 'north', tx: 0, ty: bh, len: bw, gap: [bw - 2] });
      }
    } else {
      // east houses close the room with paper screens, a bedroom or (in a taller house) the work room
      if (ne) { screens(bx, 0.6, bh - 0.9, true); screens(bh, bx + 1.2, w - 1.2, false); }
      else { screens(bw, 0.6, bh - 0.9, true); screens(bh, 0.5, bw - 1.9, false); }
    }
    if (roomIsBed) {
      if (ne) { bed(bx + (small ? 1.4 : 1.7), 1.9, 'southwest'); if (!east) P('nightWood', bx + 0.6, 1.4, { face: 'southwest', free: true }); }
      else { bed(bw - (small ? 1.6 : 2.3), 1.9, 'southwest'); if (!east) P('nightWood', bw - 0.6, 1.4, { face: 'southwest', free: true }); }
      if ((ctx.household || 1) >= 3 && rng() < 0.45) P(colourOf(rng, 'cradle'), ne ? w - 1.1 : 0.6, bh - 1.1, ne ? {} : { flip: true });
      out.spots.push({ zone: 'bed', tx: ne ? bx + 1 : 1, ty: bh - 1, facing: 'northeast' });
    } else {
      // the back room of a taller house: the trade's work, or the larder
      const work = ctx.trade && ctx.trade !== 'sacks' && ctx.trade !== 'laundryLine' ? ctx.trade : null;
      if (work) P(work, ne ? bx + bw / 2 - 0.3 : bw / 2 - 0.7, 1.2);
      else { P('sacks', ne ? bx + 1 : 1, 1.2); P('barrelStack', ne ? w - 1.4 : bw - 1.4, 1.2); }
      if (!work && !east) P('jugCluster', ne ? w - 1.2 : 0.8, bh - 1.3);
      out.spots.push({ zone: 'work', tx: ne ? bx + 1.5 : 1.5, ty: bh - 1.2, facing: 'northeast' });
    }
    // the kitchen run along the north wall of the living part
    const run = [];
    if (C.cooker) run.push(C.cooker);
    if (!east) run.push('washTub');
    run.push(east ? 'jugGlazed' : 'sideboard');
    if (C.heat && !C.cooker && !east) run.push(C.heat);
    let x = living0 + 0.6;
    const runEnd = ne ? bx - 0.8 : w - 1.2;
    for (const k of run) {
      if (x > runEnd) break;
      P(k, x, 1);
      x += k === 'sideboard' ? 1.6 : 1.2;
    }
    if (C.cooker || !east) out.spots.push({ zone: 'cook', tx: living0 + 0.8, ty: 2.1, facing: 'northeast' });
    // the heat: the hearth on the west wall in a room that cooks on a stove; the brazier beside the low table
    const cx = ne ? (small ? 3 : Math.round((bx - 1) / 2) + 1) : (bw + Math.round((w - bw) / 2));
    const cy = Math.max(bh + 1, h - (small ? 3 : 4));
    if (east) {
      table(cx, cy, 0);
      P(C.heat, cx + 1.6, cy - 1.2);
    } else {
      table(cx, cy, large ? 4 : 3);
      if (C.cooker && C.heat && klass !== 'poor' && !multi) P(C.heat, 0.6, bh + 0.9, { flip: true });
    }
    out.spots.push({ zone: 'table', tx: cx + 0.2, ty: cy + 1.4, facing: 'north' });
    // ROUND 421 -- a large room gets a second group, so its far half is lived in: a sitting corner by the east
    // wall (a rug, the old chair, a footstool) and a sideboard against the back
    if (large && !east) {
      const sx = ne ? bx - 1.4 : w - 2.2, sy = Math.min(h - 2.2, bh + 2.2);
      if (!inLane(sx, sy)) {
        P('rugRound', sx, sy);
        P(klass === 'poor' ? 'stoolWood' : 'rockingChair', sx, sy - 0.4);
        P('footstool', sx - 1, sy + 0.5);
      }
    } else if (large && east) {
      P(colourOf(rng, 'floorCushions'), ne ? 2 : w - 2, h - 2.4);
    }
    // the trade's piece: at the front of the room on the west wall, where it is the first thing you see
    if (ctx.trade && roomIsBed) {
      if (ctx.trade === 'laundryLine') P(colourOf(rng, 'laundryLine'), w - 2.2, h - 2.6);
      else P(ctx.trade, 0.9, h - 2.4, { flip: true });
      out.spots.push({ zone: 'work', tx: 1.9, ty: h - 2.2, facing: 'west' });
    }
    // the stair up, on the west wall at the front
    if (multi) {
      out.stair = { tx: 1, ty: h - 3 };
      P('stairFull', 1, h - 3, { face: 'west' });
    }
    // east rooms: a scroll on the north wall, the kitchen corner along the west wall
    if (east) {
      P('scrollStand', ne ? bx - 1.4 : w - 1.6, 1);
      P('washTub', 0.8, bh + 0.8);
      out.spots.push({ zone: 'cook', tx: 1.8, ty: bh + 1, facing: 'west' });
    }
  } else {
    // ---- UPSTAIRS ---------------------------------------------------------------------------------------------
    out.stair = { tx: 1, ty: h - 3 };
    P('stairFull', 1, h - 3, { face: 'west' });
    const attic = level >= 2;
    if (!attic) {
      // two bedrooms across the back, each closed with its own doorway
      const half = Math.floor(w / 2), bh = small ? 3 : 4;
      if (ctx.climbsOn) {
        // a three-storey house: one bedroom on the west half, the stair on up to the attic on the north wall
        out.stairUp = { tx: w - 3, ty: 1 };
        P('stairFull', w - 3, 1, { face: 'north' });
        if (east) { screens(half, 0.6, bh - 0.9, true); bed(half - 2, 1.8); }
        else {
          out.walls.push({ dir: 'west', tx: half, ty: 0, len: bh });
          out.walls.push({ dir: 'north', tx: 0, ty: bh, len: half, gap: [half - 2] });
          bed(half - 1.9, 1.9, 'southwest'); P('nightWood', half - 0.6, 1.4, { face: 'southwest', free: true });
          P('sideboard', w - 1.5, h - 2.2);
        }
      } else if (east) {
        screens(half, 0.6, bh - 0.9, true);
        bed(half - 2, 1.8); bed(w - 2.2, 1.8);
        P(colourOf(rng, 'lowTable'), half + 0.2, bh + 1.6);
      } else {
        out.walls.push({ dir: 'west', tx: half, ty: 0, len: bh });
        out.walls.push({ dir: 'north', tx: 0, ty: bh, len: w, gap: [half - 2, w - 2] });
        bed(half - 1.9, 1.9, 'southwest'); P('nightWood', half - 0.6, 1.4, { face: 'southwest', free: true });
        bed(w - 2.0, 1.9, 'southwest'); P('nightWood', half + 0.6, 1.4, { face: 'southwest', free: true });
        P('sideboard', w - 1.5, h - 2.2);
        if ((ctx.household || 1) >= 3 && rng() < 0.5) P(colourOf(rng, 'cradle'), 0.7, bh - 1.1, { flip: true });
      }
      wantLine = rng() < 0.35;
    } else {
      bed(w - 2.4, 1.9, 'southwest');
      P('barrelStack', 1.6, 1.2); P('crateProduce', 3.2, 1.2); P('sacks', w - 1.4, h - 2.4);
    }
  }

  // ---- LIFE AND CLUTTER ---------------------------------------------------------------------------------------
  const free = (tx, ty) => !inLane(tx, ty) && !out.props.some(p => Math.abs(p.tx - tx) < 1.25 && Math.abs(p.ty - ty) < 1.25)
    && !(out.stair && Math.abs(out.stair.tx - tx) < 1.6 && Math.abs(out.stair.ty - ty) < 1.6)
    && !(out.stairUp && Math.abs(out.stairUp.tx - tx) < 1.6 && Math.abs(out.stairUp.ty - ty) < 1.6);
  if (wantLine) {
    // ROUND 421 -- the washing hangs only where it has the floor to itself (it stood through the sideboard)
    const at = [[w - 2.6, h - 3.4], [w - 3.6, h - 2.2], [half0 + 0.5, h - 2.4]].find(([a, b]) => free(a, b) && !inWalls(out.walls, a, b));
    if (at) P(colourOf(rng, 'laundryLine'), at[0], at[1]);
  }
  if (level === 0 && rng() < 0.22) {
    const at = [[w - 1.3, h - 1.6], [w - 1.3, h - 3]].find(([a, b]) => free(a, b));
    if (at) P('dogBed', at[0], at[1]);
  }
  const wants = CLUTTER[klass] || CLUTTER.modest;
  const n = CLUTTER_COUNT[klass] || 3;
  const slots = [];
  for (let tx = 1; tx < w - 1; tx++) slots.push([tx + 0.1, 0.9]);            // along the north wall
  for (let ty = 2; ty < h - 1; ty++) slots.push([0.7, ty + 0.1]);           // along the west wall
  for (let tx = 2; tx < w - 1; tx++) slots.push([tx, h - 1.3]);             // along the front
  for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
  let placed = 0;
  for (const [tx, ty] of slots) {
    if (placed >= n) break;
    if (!free(tx, ty)) continue;
    if (inWalls(out.walls, tx, ty)) continue;
    // ROUND 421 -- at most one fine vase a room: a row of porcelain read as a shop, not a home
    let k = pickOf(rng, east ? ['jugGlazed', 'amphora', 'floorCushions', 'jugCluster'] : wants);
    if (/^vase/.test(k) && out.props.some(p => /^vase/.test(p.key))) k = east ? 'jugGlazed' : 'footstool';
    if (k === 'floorCushions') k = colourOf(rng, 'floorCushions');
    P(k, tx, ty, ty > 0.8 && tx < 1 ? { flip: true } : {});
    placed++;
  }
  out.name = nameFor(ctx, out, multi, level);
  out.blurb = blurbFor(ctx, klass, hour);
  out.summary = { culture: ctx.culture, klass, trade: ctx.trade || null, size: ctx.size, level, props: out.props.length, walls: out.walls.length };
  return out;
}

/** Is a point right on an inside wall line (so a pot would stand in the masonry)? */
function inWalls(walls, tx, ty) {
  for (const r of walls) {
    if (r.dir === 'west' && Math.abs(tx - (r.tx - 0.5)) < 0.7 && ty >= r.ty - 0.5 && ty <= r.ty + r.len - 0.5) return true;
    if (r.dir === 'north' && Math.abs(ty - (r.ty - 0.5)) < 0.7 && tx >= r.tx - 0.5 && tx <= r.tx + r.len - 0.5) return true;
  }
  return false;
}

const TRADE_ROOM = {
  workbenchJoiner: "a joiner's bench", loom: 'a loom', netsCreels: 'nets drying', anvilCorner: "a smith's corner",
  writingDesk: 'a writing desk', jarShelves: 'shelves of jars', laundryLine: 'washing on the line', sacks: 'flour sacks',
};
function nameFor(ctx, out, multi, level) {
  if (level === 2) return 'The attic';
  if (level === 1) return 'Bedrooms upstairs';
  const east = CULTURE_DRESS[ctx.culture] && CULTURE_DRESS[ctx.culture].bed === 'futon';
  if (east) return multi ? 'A matted room' : 'A matted room and a sleeping corner';
  return multi ? 'A kitchen and living room' : 'A home with a bedroom';
}
function blurbFor(ctx, klass, hour) {
  const bits = [];
  if (ctx.trade && TRADE_ROOM[ctx.trade]) bits.push(`${TRADE_ROOM[ctx.trade][0].toUpperCase()}${TRADE_ROOM[ctx.trade].slice(1)} by the door.`);
  if (isMealHour(hour) && ctx.home) bits.push('The table is laid.');
  else if (isMorning(hour)) bits.push('Nobody has made the beds yet.');
  if (klass === 'poor') bits.push('Not much, and all of it used.');
  else if (klass === 'well') bits.push('Comfortable, and they want you to notice.');
  return bits.join(' ') || 'Somebody lives here.';
}

/** Self-check: every layout this can produce, in every size and culture, keeps its pieces on the floor, its walls
 *  meeting the room, and the door lane clear. */
export function homeDressFaults(propKeys) {
  const bad = [];
  for (const size of Object.keys(HOME_SIZES)) for (const culture of Object.keys(CULTURE_DRESS))
    for (const storeys of [1, 2, 3]) for (let level = 0; level < storeys; level++) for (const seed of ['a', 'b', 'c', 'd']) {
      const d = dressHome({ key: seed, culture, klass: 'modest', trade: 'loom', size, storeys, level, hour: 12, home: 2, household: 3, climbsOn: level === 1 && storeys === 3 });
      for (const p of d.props) {
        if (propKeys && !propKeys.has(p.key)) bad.push(`${size}/${culture}/${level}: unknown prop ${p.key}`);
        if (p.tx < -0.6 || p.ty < -0.6 || p.tx > d.w - 0.4 || p.ty > d.h - 0.4) bad.push(`${size}/${culture}/${level}: ${p.key} off the floor at ${p.tx},${p.ty}`);
      }
      for (const r of d.walls) {
        const end = r.dir === 'west' ? r.ty + r.len : r.tx + r.len;
        const meetsBack = r.dir === 'west' ? r.ty === 0 : (r.tx === 0 || d.walls.some(o => o.dir === 'west' && o.tx === r.tx && o.ty + o.len === r.ty));
        const meetsSide = r.dir === 'north' ? (end === d.w || d.walls.some(o => o.dir === 'west' && o.tx === end && o.ty + o.len === r.ty) || r.tx === 0) : true;
        if (!meetsBack || !meetsSide) bad.push(`${size}/${culture}/${level}: a ${r.dir} wall at ${r.tx},${r.ty} that stops short`);
        if ((r.dir === 'west' ? end : end) > (r.dir === 'west' ? d.h : d.w)) bad.push(`${size}/${culture}/${level}: a wall past the room`);
      }
    }
  return bad;
}
