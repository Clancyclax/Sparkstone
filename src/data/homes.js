// ===========================================================================
// ROUND 345 (item 3) -- HOUSES YOU CAN BUY OR RENT.
//
//   "Randomly some houses should have a sign out front for purchase as a
//    private domicile, or a rental agreement.
//    3.1 The cheapest houses are 1 silver and the cheapest rent is 12 iron
//        rank coins.
//    3.2 Purchasing a home allows you to sleep in the bed, creates a chest
//        like the one in the adventurers guild to store essences for other
//        playthroughs, and creates a location for recruited companions to
//        wait for you if you want to adventure on your own for a time."
//
// This file is the PURE half: which houses carry a sign, what they cost, how a
// rental runs, and where inside a house the chest and the waiting companions
// go. The scene half is homeMixin.js.
//
// PRICES ARE IN NORMAL-RANK COIN UNITS, the unit every purse comparison in the
// game already uses (100 of one rank is one of the next):
//
//     1 silver = 100^3 = 1,000,000        12 iron = 12 x 100 = 1,200
//
// The cheapest house of all is exactly 1 silver and the cheapest rent exactly
// 12 iron coins, as asked; a larger or taller house costs a multiple of that.
//
// A RENTAL IS A WEEK AT A TIME. Seven days of the game's clock (a day is ten
// real minutes), paid in advance and renewable up to four terms ahead. While
// it is paid it is every bit a home -- the bed, the chest, the waiting room.
// When it lapses the door closes behind it and any companion waiting there
// comes back to the party. The chest's CONTENTS are the account-wide
// reliquary record (vault.js), so nothing in it is ever at risk: it just
// cannot be opened from a house you no longer hold.
// ===========================================================================
import { seededRng } from './awakening.js';

/** Share of houses that carry a sign. */
export const HOME_SIGN_SHARE = 0.10;
export const HOME_BUY_BASE = 1000000;   // 1 silver coin
export const HOME_RENT_BASE = 1200;     // 12 iron coins
/** By size tier 1..4: x1, x1.5, x2, x3. Tier 1 is the cheapest house there is. */
export const HOME_TIER_MULT = [1, 1.5, 2, 3];
export const RENT_TERM_DAYS = 7;
export const RENT_MAX_TERMS_AHEAD = 4;

/** A stable id for a house, from where it stands. */
export function homeKey(b, tile = 32) {
  const x = Math.round((b.anchorX ?? b.x) / tile), y = Math.round((b.anchorY ?? b.y) / tile);
  return `${x},${y}`;
}

/** How big a house is, 1 (a cottage) to 4 (tall and broad). */
export function homeTier(artWidthPx, storeys = 1) {
  const w = Number(artWidthPx) || 0;
  let t = w < 310 ? 1 : w < 345 ? 2 : 3;
  if (storeys > 1) t += 1;
  return Math.max(1, Math.min(4, t));
}

export function homePrices(tier) {
  const m = HOME_TIER_MULT[Math.max(1, Math.min(4, tier)) - 1];
  return { buy: Math.round(HOME_BUY_BASE * m), rent: Math.round(HOME_RENT_BASE * m) };
}

/**
 * What a house's sign offers, or null for no sign. Seeded off the run seed and
 * the house's place, so each playthrough has its own for-sale streets and a
 * loaded game has the same ones. `kinds` is ['buy'], ['rent'] or both.
 */
export function homeOffer(seed, key, tier) {
  const rng = seededRng(`home|${seed}|${key}`);
  if (rng() >= HOME_SIGN_SHARE) return null;
  const r = rng();
  const kinds = r < 0.4 ? ['buy'] : r < 0.8 ? ['rent'] : ['buy', 'rent'];
  return { kinds, tier, ...homePrices(tier) };
}

/** Where a rental stands on `day`: lapsed or not, how many days are left, and
 *  how many whole terms are paid ahead. Owned homes never lapse. */
export function rentStatus(home, day) {
  if (!home) return { held: false, lapsed: false, daysLeft: 0, terms: 0 };
  if (home.kind === 'own') return { held: true, lapsed: false, daysLeft: Infinity, terms: Infinity };
  const left = (home.paidThrough || 0) - day;
  return { held: left > 0, lapsed: left <= 0, daysLeft: Math.max(0, left), terms: Math.max(0, Math.ceil(left / RENT_TERM_DAYS)) };
}

/** The day a rent paid on `day` runs to: from today, or from the end of the
 *  current term if it is not yet over. */
export function rentPaidThrough(home, day) {
  const from = home && home.paidThrough > day ? home.paidThrough : day;
  return from + RENT_TERM_DAYS;
}

/** May another term be paid? Up to RENT_MAX_TERMS_AHEAD weeks in hand. */
export function canRenew(home, day) {
  const st = rentStatus(home, day);
  return st.terms < RENT_MAX_TERMS_AHEAD;
}

const near = (a, b) => Math.hypot(a.tx - b.tx, a.ty - b.ty);

/**
 * A free floor tile in a house room: off the walls' corners, off the door
 * lane, and clear of every prop and of the tiles in `avoid`. Along the north
 * wall first, then the east, then the west, then anywhere -- chests stand
 * against walls. Null when the room has no free tile (the caller then does
 * without rather than put a chest on a table).
 */
export function homeFreeSpot(props, w, h, avoid = [], gap = 1.5) {
  const taken = [...(props || []).map((p) => ({ tx: p.tx, ty: p.ty })), ...avoid];
  const ok = (tx, ty, g) => {
    if (tx < 1 || tx > w - 2 || ty < 1 || ty > h - 3) return false;
    if (tx >= 3 && tx <= 7 && ty >= h - 4) return false;          // the lane in from the door
    return taken.every((p) => near({ tx, ty }, p) >= g);
  };
  const order = [];
  for (let tx = w - 2; tx >= 1; tx--) order.push([tx, 1]);
  for (let ty = 2; ty <= h - 3; ty++) order.push([w - 2, ty]);
  for (let ty = 2; ty <= h - 3; ty++) order.push([1, ty]);
  for (let ty = 2; ty <= h - 3; ty++) for (let tx = 2; tx <= w - 3; tx++) order.push([tx, ty]);
  // The authored layouts pack their furniture, so ask for elbow room first and
  // settle for "not on the same tile" last.
  for (const g of [gap, 1.2, 1.0]) {
    for (const [tx, ty] of order) if (ok(tx, ty, g)) return { tx, ty };
  }
  return null;
}

export const HOME_LINES = {
  // ROUND 389 -- the notice reads what the painted sign out front says (propertySigns.js).
  buyHead: 'FOR PURCHASE',
  rentHead: 'FOR RENT',
  both: 'FOR RENT OR PURCHASE',
  noPurse: 'You do not have that much.',
  bought: 'The deed is yours. The door will open to you, and the bed is your own to sleep in.',
  rented: 'The agreement is signed. The house is yours for the term, and the key is on your belt.',
  renewed: 'Another week is paid.',
  held: 'You hold this house.',
  lapsed: 'Your rental here has run out. Pay the next term to take the key back.',
  tooFar: 'You already hold the longest term the landlord will take in advance.',
};
