// ===========================================================================
// ROUND 389 -- PROPERTY SIGNS AND INNS: THE PURE HALF.
//
//   "New property signs ... 10 signs at 64x64 ... The lettering is part of
//    each image and spelled correctly. Do not overlay text on them."
//   "Hook them to what they say ... Don't scatter them as decoration."
//   "Mark some buildings as inns where a player can spend a night for 35
//    normal rank coins, allowing them to sleep until 6:00AM the next morning."
//
// What is here needs no world: the art table (which cell, which foot), which
// sign a property shows for what the player holds, wooden or magical, where a
// sign may stand beside a door, and the inn's rules -- the price, the night,
// the rooms and the clock. The scene half is scenes/propertySignsMixin.js
// (inns, drawing, the prompt) and scenes/homeMixin.js (the houses).
// ===========================================================================

/**
 * THE SHEET. tools/pack_signs_r389.py packs the ten 64px signs into 80px cells
 * foot-anchored exactly as pack_props_r381.py packed city_props_r381.png (each
 * sign's `foot` from signs.json on (40, 78), its last row of ink on row 77),
 * then magnifies the sheet 4x NEAREST, as make_ritual_hd.py did for the ritual
 * circles: 320px cells, drawn at sprite scale `scale / up`.
 *
 * SCALE 2, A WHOLE NUMBER: every pixel of the art is two world pixels, so the
 * lettering (five art pixels tall) is ten world pixels -- about nineteen on
 * screen at the outdoor zoom -- and the board (art rows 11-39 of a sign whose
 * foot is row 57) runs from 36 to 92 world pixels above the ground: from the
 * chest of a 60px character to a little over the head, which is where a
 * street sign's board is read from. At 1x the words were five screen pixels of
 * smear.
 */
export const PROPERTY_SIGN_ART = {
  key: 'propertySignsR389', file: './public/assets/property_signs_r389.png',
  cell: 320, srcCell: 80, up: 4, cols: 5, count: 10,
  scale: 2,
};
/** The sprite scale the HD sheet is drawn at: the art's world scale over the magnification. */
export const PROPERTY_SIGN_SPRITE_SCALE = PROPERTY_SIGN_ART.scale / PROPERTY_SIGN_ART.up;
/** ROUND 403 -- "For rent and for sale signs need to shrink by 50%." Per kind: the house signs are half size; the inns'
 *  Vacancy / No Vacancy boards keep theirs. */
export const PROPERTY_SIGN_KIND_SCALE = { rent: 0.5, buy: 0.5, both: 0.5, vacancy: 1, noVacancy: 1 };
/** The drawn scale of one sign key. */
export function propertySignScale(key) {
  const s = PROPERTY_SIGNS[key];
  return PROPERTY_SIGN_SPRITE_SCALE * ((s && PROPERTY_SIGN_KIND_SCALE[s.kind]) || 1);
}

/** key -> cell, the words it carries, its style, its kind, and its foot (fraction of the cell; tools/property_signs_r389.json).
 *  `posts` are the posts' screen-x offsets from the foot in ART pixels: the wooden board stands on two, the magical one on one. */
export const PROPERTY_SIGNS = {
  signForRent:                { idx: 0, text: 'FOR RENT',             style: 'wooden',  kind: 'rent',      foot: [0.4938, 0.975], posts: [-21.5, 21.5] },
  signForPurchase:            { idx: 1, text: 'FOR PURCHASE',         style: 'wooden',  kind: 'buy',       foot: [0.4938, 0.975], posts: [-21.5, 21.5] },
  signForRentOrPurchase:      { idx: 2, text: 'FOR RENT OR PURCHASE', style: 'wooden',  kind: 'both',      foot: [0.4938, 0.975], posts: [-21.5, 21.5] },
  signVacancy:                { idx: 3, text: 'VACANCY',              style: 'wooden',  kind: 'vacancy',   foot: [0.4938, 0.975], posts: [-21.5, 21.5] },
  signNoVacancy:              { idx: 4, text: 'NO VACANCY',           style: 'wooden',  kind: 'noVacancy', foot: [0.4938, 0.975], posts: [-21.5, 21.5] },
  magicSignForRent:           { idx: 5, text: 'FOR RENT',             style: 'magical', kind: 'rent',      foot: [0.5, 0.975], posts: [0] },
  magicSignForPurchase:       { idx: 6, text: 'FOR PURCHASE',         style: 'magical', kind: 'buy',       foot: [0.5, 0.975], posts: [0] },
  magicSignForRentOrPurchase: { idx: 7, text: 'FOR RENT OR PURCHASE', style: 'magical', kind: 'both',      foot: [0.5, 0.975], posts: [0] },
  magicSignVacancy:           { idx: 8, text: 'VACANCY',              style: 'magical', kind: 'vacancy',   foot: [0.5, 0.975], posts: [0] },
  magicSignNoVacancy:         { idx: 9, text: 'NO VACANCY',           style: 'magical', kind: 'noVacancy', foot: [0.5, 0.975], posts: [0] },
};
export const PROPERTY_SIGN_KEYS = Object.keys(PROPERTY_SIGNS);
/** A post's collision disc (world units): "solid only at the post". */
export const SIGN_POST_R = 6;

/** The sign that says `kind` ('rent' | 'buy' | 'both' | 'vacancy' | 'noVacancy') in `style`. */
export function signKeyFor(kind, style) {
  const magic = style === 'magical';
  for (const k of PROPERTY_SIGN_KEYS) {
    const s = PROPERTY_SIGNS[k];
    if (s.kind === kind && (s.style === 'magical') === magic) return k;
  }
  return null;
}

/**
 * WHAT A HOUSE'S SIGN SAYS, from what it offers (homes.js homeOffer: ['buy'],
 * ['rent'] or both) and what the player holds there now:
 *
 *   not held                 the offer: For Rent / For Purchase / For Rent or Purchase
 *   rented (paid up)         For Purchase if it can also be bought -- the one option left -- else no sign
 *   owned                    no sign
 *
 * A lapsed rental is not held, so its sign comes back. Null is "no sign".
 */
export function homeSignKind(kinds, held) {
  const k = Array.isArray(kinds) ? kinds : [];
  const buy = k.includes('buy'), rent = k.includes('rent');
  if (held && held.kind === 'own') return null;
  if (held && held.kind === 'rent') return buy ? 'buy' : null;
  if (buy && rent) return 'both';
  if (buy) return 'buy';
  if (rent) return 'rent';
  return null;
}

// ---------------------------------------------------------------------------
// WOODEN OR MAGICAL
// ---------------------------------------------------------------------------
/** Settlements that lean magical as a whole: the cities of the high-rank regions (their monsters run to tier 4) and
 *  Karsk Landing, whose region's way on is a portal (astral-adjacent). Bandit cities are outlaws, not mages. */
export const MAGIC_SETTLEMENTS = ['bra_city', 'cin_slag', 'cin_camp', 'ixc_camp', 'ele_city'];
/** Within this many tiles of the Society's hall, the Department of Essence Development, a magic shop or a temple: the
 *  Society's district, the mage quarter, the gods' quarter. */
export const MAGIC_REACH_T = 26;

/**
 * Wooden or magical for one building. Deterministic: a function of where it
 * stands and what stands near it, never a roll. `ctx`:
 *   settlement   the settlement id
 *   bandit       a bandit city
 *   magicNear    true when a magic building (see MAGIC_REACH_T) is in reach
 */
export function signStyleFor(ctx) {
  const c = ctx || {};
  if (c.bandit) return 'wooden';
  if (c.magicNear) return 'magical';
  if (MAGIC_SETTLEMENTS.includes(c.settlement)) return 'magical';
  return 'wooden';
}

/** Is this building one of the magic ones a district gathers round? (Society hall, civic guild hall, the Department,
 *  a magic shop, a temple.) */
export function isMagicBuilding(b) {
  if (!b) return false;
  const s = String(b.singleton || '');
  return s === 'guild' || s.startsWith('guild_') || b.civic === 'guild' || s === 'research' || !!b.department
    || b.service === 'magicshop' || b.service === 'guild' || !!b.temple;
}

// ---------------------------------------------------------------------------
// WHERE A SIGN STANDS
// ---------------------------------------------------------------------------
const TILE = 32;
/** No post nearer the doorstep than this. */
export const SIGN_DOOR_CLEAR = TILE * 1.5;
/** The walk to a door: a lane this wide either side of the line from the building's front through the doorstep and
 *  out SIGN_PATH_OUT beyond it. No post in it. */
export const SIGN_PATH_HALF = TILE * 0.9;
export const SIGN_PATH_OUT = TILE * 3;
/** How far to the side of the door a sign is tried, and how far out toward the street (both in world units). */
export const SIGN_SIDE_TRIES = [TILE * 2.6, TILE * 3.1, TILE * 3.7, TILE * 4.4];
export const SIGN_OUT_TRIES = [TILE * 0.4, TILE * 0, TILE * 1.0, TILE * 1.8];

/** The posts' world positions for a sign whose foot is at (x, y). The art faces the camera, so a post `p` art pixels
 *  to the right of the foot is p x scale screen pixels right, which is world (+X/2, -X/2). */
export function signPosts(key, x, y) {
  const s = PROPERTY_SIGNS[key];
  const k = PROPERTY_SIGN_ART.scale * ((s && PROPERTY_SIGN_KIND_SCALE[s.kind]) || 1);   // ROUND 403 -- a half-size sign's posts are closer
  return (s ? s.posts : [0]).map(p => ({ x: x + (p * k) / 2, y: y - (p * k) / 2, radius: SIGN_POST_R }));
}

/** Distance from a point to the segment a-b. */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  const L = vx * vx + vy * vy;
  const t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

/**
 * Does a sign at (x, y) keep off the door? `door` is { x, y } (the doorstep), `dir` the unit vector out of the
 * building through it. Every post must be SIGN_DOOR_CLEAR off the doorstep and outside the walk to the door: the lane
 * from one tile inside the doorstep (the threshold) to SIGN_PATH_OUT outside it.
 */
export function signClearsDoor(key, x, y, door, dir) {
  if (!door || !dir) return true;
  const a = { x: door.x - dir.dx * TILE, y: door.y - dir.dy * TILE };
  const b = { x: door.x + dir.dx * SIGN_PATH_OUT, y: door.y + dir.dy * SIGN_PATH_OUT };
  for (const p of signPosts(key, x, y)) {
    if (Math.hypot(p.x - door.x, p.y - door.y) < SIGN_DOOR_CLEAR + p.radius) return false;
    if (segDist(p.x, p.y, a.x, a.y, b.x, b.y) < SIGN_PATH_HALF + p.radius) return false;
  }
  return true;
}

/** The spots tried for a sign beside a door, nearest first: either side of the door, a little toward the street. */
export function signSpotsBesideDoor(door, dir) {
  const out = [];
  const px = -dir.dy, py = dir.dx;
  for (const side of SIGN_SIDE_TRIES) {
    for (const o of SIGN_OUT_TRIES) {
      for (const s of [1, -1]) out.push({ x: door.x + dir.dx * o + px * side * s, y: door.y + dir.dy * o + py * side * s });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE INN
// ---------------------------------------------------------------------------
/** "35 normal rank coins" -- in the purse's units (one normal coin is one unit; 100 of a rank is one of the next). */
export const INN_ROOM_PRICE = 35;
/** "sleep until 6:00AM the next morning" */
export const INN_WAKE_HOUR = 6;
/** The clock: _clockT seconds, 08:00 at zero, 24 game hours to 600 seconds (WorldScene._dayIndex). */
export const CLOCK_START_HOUR = 8;
export const CLOCK_SECS_PER_HOUR = 600 / 24;

/** Absolute game hours since the first midnight. */
export function clockHours(clockT) { return CLOCK_START_HOUR + (clockT || 0) / CLOCK_SECS_PER_HOUR; }
/** The hour of the day, 0-24. */
export function hourOfDay(clockT) { return ((clockHours(clockT) % 24) + 24) % 24; }

/**
 * THE INN'S NIGHT: an inn lets a room from one 06:00 to the next, so the night
 * a booking is for is counted from 06:00 -- a room taken at 23:00 and one taken
 * at 02:00 the morning after are the same night. Integer, rises by one at every
 * 06:00.
 */
export function innNight(clockT) { return Math.floor((clockHours(clockT) - INN_WAKE_HOUR) / 24); }

/**
 * The clock after sleeping until `wakeHour`: the NEXT `wakeHour` -- the same
 * morning if it is still before it (00:00-05:59 wakes at 06:00 that morning),
 * tomorrow's otherwise; exactly on the hour, never a fraction past. Returns the
 * new `_clockT` and the game hours slept.
 */
export function sleepClockT(clockT, wakeHour = INN_WAKE_HOUR) {
  const h = clockHours(clockT);
  let target = Math.floor((h - wakeHour) / 24) * 24 + wakeHour + 24;
  if (target - h > 24) target -= 24;   // float edge: never sleep more than a day
  if (target - h < 1e-6) target += 24;
  return { clockT: (target - CLOCK_START_HOUR) * CLOCK_SECS_PER_HOUR, hours: target - h };
}

const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** How many rooms an inn lets: three to five, fixed per inn. */
export function innRooms(innId) { return 3 + (fnv(`innRooms|${innId}`) % 3); }

/** How many of them other travellers have taken on a given night: 0..rooms, seeded off the run, the inn and the night,
 *  so it is the same all night, different the next, and the same on a reload. A full house is one night in four to
 *  six. */
export function innGuests(seed, innId, night) {
  const rooms = innRooms(innId);
  return fnv(`innGuests|${seed}|${innId}|${night}`) % (rooms + 1);
}

/**
 * WHERE AN INN STANDS TONIGHT, for the player.
 *
 *   booked   the player has a room here tonight (paid, not yet slept off): "No Vacancy" -- they cannot take a second one,
 *            and the prompt offers the room they have.
 *   full     every room is taken by other travellers: "No Vacancy".
 *   vacancy  a room can be had for INN_ROOM_PRICE.
 *
 * `booking` is player.inns[innId] (`{ night }`) or null; a booking for an earlier night is spent.
 */
export function innState(seed, innId, clockT, booking) {
  const night = innNight(clockT);
  const rooms = innRooms(innId);
  const guests = innGuests(seed, innId, night);
  const booked = !!(booking && booking.night === night);
  const full = guests >= rooms;
  return { night, rooms, guests, booked, full, vacancy: !booked && !full, sign: (!booked && !full) ? 'vacancy' : 'noVacancy' };
}

export const INN_LINES = {
  take: `Take a room for the night — ${INN_ROOM_PRICE} coins`,
  sleepBooked: 'Sleep in your room until 06:00',
  noPurse: '"Thirty-five coins, friend. Come back when you have them."',
  full: '"Full up tonight, I\'m afraid. Every bed\'s taken. Try again tomorrow, or the next town over."',
  booked: '"Your room\'s made up. Sleep when you like; I\'ll knock at six."',
  woke: 'You wake at six, rested.',
};

/** Everything wrong with the table, checkable without a running game. */
export function propertySignFaults() {
  const out = [];
  const seen = new Set();
  for (const k of PROPERTY_SIGN_KEYS) {
    const s = PROPERTY_SIGNS[k];
    if (!(s.idx >= 0 && s.idx < PROPERTY_SIGN_ART.count)) out.push(`${k}: idx off the sheet`);
    if (seen.has(s.idx)) out.push(`${k}: shares a cell`);
    seen.add(s.idx);
    if (!(s.foot[0] > 0 && s.foot[0] < 1 && s.foot[1] > 0 && s.foot[1] <= 1)) out.push(`${k}: no foot`);
    if (k.startsWith('magic') !== (s.style === 'magical')) out.push(`${k}: style does not match its key`);
  }
  for (const kind of ['rent', 'buy', 'both', 'vacancy', 'noVacancy']) {
    for (const st of ['wooden', 'magical']) if (!signKeyFor(kind, st)) out.push(`no ${st} ${kind} sign`);
  }
  if (PROPERTY_SIGN_KEYS.length !== 10) out.push(`expected 10 signs, have ${PROPERTY_SIGN_KEYS.length}`);
  if (!Number.isInteger(PROPERTY_SIGN_ART.scale)) out.push('the art scale is not a whole number');
  return out;
}
