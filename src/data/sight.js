// ===========================================================================
// ROUND 350 -- LINE OF SIGHT, AND THE HALF-LIT TILE BEYOND IT.
//
//   "Torches are lighting through walls."
//   "Players should have their line of site blocked by a wall, not extend
//    through it."
//   "Player vision in the dark should go out 1 tile further but only halfway
//    lit up to create a gradual transition."
//
// Pure, on a tile grid: no scene in it, so the suite can check the geometry
// against cases whose answers are known by hand. `blocked(tx, ty)` says whether
// a tile stops sight (a wall). A wall tile can itself be SEEN -- it is the face
// the light lands on -- but nothing behind it can.
// ===========================================================================

/** Tiles of half-lit transition added past a light or a sight window. */
export const SIGHT_FADE_TILES = 1;

/** How lit the transition tile is, against a fully lit one. */
export const SIGHT_FADE_LEVEL = 0.5;

/**
 * Can (x0,y0) see (x1,y1)? A grid walk (Amanatides-Woo) from centre to centre.
 * Every tile the line passes through is asked; the start is never asked, and
 * the end may be a wall. A line that slips exactly through a corner between two
 * walls is blocked, because light does not squeeze through a diagonal seam.
 */
export function lineClear(blocked, x0, y0, x1, y1) {
  if (x0 === x1 && y0 === y1) return true;
  const dx = x1 - x0, dy = y1 - y0;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  const ax = Math.abs(dx), ay = Math.abs(dy);
  let x = x0, y = y0;
  // Parametric distance to the next vertical / horizontal tile edge, in units
  // where the whole segment is ax*ay long on each axis (integer maths).
  let tx = ax ? 0.5 / ax : Infinity;
  let ty = ay ? 0.5 / ay : Infinity;
  const dtx = ax ? 1 / ax : Infinity, dty = ay ? 1 / ay : Infinity;
  const EPS = 1e-9;
  let guard = ax + ay + 4;
  while ((x !== x1 || y !== y1) && guard-- > 0) {
    if (Math.abs(tx - ty) < EPS) {
      // Straight through a corner: both side tiles must not be walls.
      if (blocked(x + sx, y) && blocked(x, y + sy)) return false;
      x += sx; y += sy; tx += dtx; ty += dty;
    } else if (tx < ty) { x += sx; tx += dtx; }
    else { y += sy; ty += dty; }
    if (x === x1 && y === y1) return true;
    if (blocked(x, y)) return false;
  }
  return true;
}

/**
 * How lit the tile at offset (dx, dy) from the viewer is: 1 inside `radius`
 * tiles (Chebyshev), SIGHT_FADE_LEVEL in the next `SIGHT_FADE_TILES`, 0 beyond
 * -- and 0 anywhere a wall is in the way.
 */
export function sightTier(blocked, ox, oy, tx, ty, radius, fade = SIGHT_FADE_TILES) {
  const d = Math.max(Math.abs(tx - ox), Math.abs(ty - oy));
  if (d > radius + fade) return 0;
  if (!lineClear(blocked, ox, oy, tx, ty)) return 0;
  return d <= radius ? 1 : SIGHT_FADE_LEVEL;
}

/** Faults: the properties the whole file exists for. */
export function sightFaults() {
  const out = [];
  const wall = new Set(['2,0']);
  const b = (x, y) => wall.has(`${x},${y}`);
  if (!lineClear(b, 0, 0, 1, 0)) out.push('an open neighbour is not seen');
  if (!lineClear(b, 0, 0, 2, 0)) out.push('the wall face itself is not seen');
  if (lineClear(b, 0, 0, 4, 0)) out.push('sight passes through a wall');
  if (lineClear(b, 0, 0, 3, 0)) out.push('sight passes through a wall by one tile');
  const seam = new Set(['1,0', '0,1']);
  if (lineClear((x, y) => seam.has(`${x},${y}`), 0, 0, 3, 3)) out.push('sight squeezes through a diagonal seam');
  if (sightTier(b, 0, 0, 1, 0, 2) !== 1) out.push('inside the window is not fully lit');
  if (sightTier(() => false, 0, 0, 3, 0, 2) !== SIGHT_FADE_LEVEL) out.push('the tile past the window is not half lit');
  if (sightTier(() => false, 0, 0, 4, 0, 2) !== 0) out.push('two tiles past the window is lit');
  return out;
}
