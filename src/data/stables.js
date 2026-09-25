// ============================================================================
// ROUND 200 -- THE STABLE YARD.
//
// The user:
//
//   "3.1) Transports should sit just outside the city walls in a small fenced
//         off 'stable' area."
//
// and, asked whether a yard appears where you last parked or stands at every
// city: "It's always there, in every city."
//
// WHICH IS THE DECISION THAT MAKES THIS SIMPLE, and it is worth saying why.
// The alternative -- a yard that exists where you left the wagon -- makes the
// transport a thing you can lose track of, and the rest of round 200 hangs a
// great deal on the transport being a place: it is where dismissed companions
// go, where the team is between journeys, and where a player is meant to be
// able to walk in and talk to someone. A home you have to remember the
// coordinates of is not a home. So every walled settlement has a yard, the
// yard always holds everything you own, and "where is my wagon" has one
// answer everywhere in the world.
//
// WHAT A YARD IS, AS DATA. A rectangle of open ground outside the wall, fenced
// on all four sides with a gap facing the city, and a grid of parking bays
// inside it. Nothing in here knows where it is -- `_buildStableYards` sweeps
// for the ground, because where a yard can stand depends on the roads, the
// water and the buildings that region actually generated, and none of that is
// knowable from a table.
//
// SIZED FOR THE WHOLE COLLECTION, NOT FOR WHAT YOU HAVE. Nine vehicles exist
// and the yard has nine bays, so a player who owns all nine sees all nine and
// a player who owns one sees one standing in a yard with room. A yard that
// grew as you bought things would move its own fence line every purchase,
// which is a rebuild of the ground in the middle of a shop transaction.
// ============================================================================

import { VEHICLES } from './vehicles.js';

/** Bays across and down. Nine vehicles, three by three. */
export const STABLE_COLS = 3, STABLE_ROWS = 3;

/** Tiles between bay centres. A vehicle's art is a 128px cell drawn at about
 *  three tiles wide, so four tiles apart leaves a lane a person walks down
 *  rather than a row of wagons touching. */
export const STABLE_BAY_PITCH = 4;

/** The fenced rectangle, in tiles, measured from the bay grid plus a margin
 *  wide enough to walk round the outside row. */
export const STABLE_W = (STABLE_COLS - 1) * STABLE_BAY_PITCH + 6;
export const STABLE_H = (STABLE_ROWS - 1) * STABLE_BAY_PITCH + 6;

/** How far outside the wall the yard's near edge sits, in tiles. Far enough
 *  that the fence is not standing in the masonry's own footprint (a wall
 *  course draws about nine tiles wide -- see `STONE_HALF` in WorldScene), and
 *  near enough that "just outside the city walls" is a fair description. */
export const STABLE_WALL_GAP = 8;

/** Bay centres, as offsets in tiles from the yard's north-west floor corner.
 *  In the order VEHICLES is declared, so the cheapest wagon takes the bay
 *  nearest the gate and the dragon house stands at the back -- which is both
 *  the order a player acquires them and the order that looks right. */
export function stableBays() {
  const out = [];
  for (let i = 0; i < STABLE_COLS * STABLE_ROWS; i++) {
    const c = i % STABLE_COLS, r = Math.floor(i / STABLE_COLS);
    out.push({
      i,
      tx: 3 + c * STABLE_BAY_PITCH,
      ty: 3 + r * STABLE_BAY_PITCH,
      vehicle: VEHICLES[i] ? VEHICLES[i].id : null,
    });
  }
  return out;
}

export const STABLE_BAYS = stableBays();

/** Which settlements get one: everything with a wall round it. A village has
 *  no wall and therefore no "outside the walls" for a yard to be outside of --
 *  and a village is not where a team keeps its skyship. */
export function stableSettlements(settlements) {
  return (settlements || []).filter(s => s.kind === 'city' || s.kind === 'town');
}

/** The prompt on a parked transport. Named rather than generic, because a
 *  yard with nine things in it needs the label to say which one you are
 *  standing at. */
export function stableBoardLabel(vehicleName) {
  return `board the ${String(vehicleName || 'transport').toLowerCase()}`;
}

export function stableFaults() {
  const out = [];
  const bays = STABLE_BAYS;
  if (bays.length !== STABLE_COLS * STABLE_ROWS) out.push(`${bays.length} bays`);
  // Every vehicle in the game has somewhere to stand. If a tenth is ever
  // added, this is the line that says the yard did not grow with it -- which
  // is the failure that would otherwise show as one wagon you own and can
  // never find.
  const parked = new Set(bays.map(b => b.vehicle).filter(Boolean));
  for (const v of VEHICLES) if (!parked.has(v.id)) out.push(`${v.id} has no bay`);
  const seen = new Set();
  for (const b of bays) {
    const k = `${b.tx},${b.ty}`;
    if (seen.has(k)) out.push(`two bays on ${k}`);
    seen.add(k);
    // A bay must be inside the fence with a tile to spare, or a wagon is
    // parked through the railing.
    if (b.tx < 2 || b.ty < 2 || b.tx > STABLE_W - 3 || b.ty > STABLE_H - 3) {
      out.push(`bay ${b.i} at ${k} is outside a ${STABLE_W}x${STABLE_H} yard`);
    }
  }
  return out;
}
