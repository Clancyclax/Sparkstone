// ===========================================================================
// ROUND 351 -- ROADS RUN STRAIGHT.
//
//   "Roads and tiles not straight or even on the map"
//
// The authored roads are polylines with arbitrary-angle segments (the Nek's
// north road runs 840,680 -> 820,500, a line that is 20 tiles across over 180
// tiles up). `_stampRoad` walks such a line in half-tile steps and rounds each
// step to a tile, so a shallow segment paves as a staircase with a one-tile
// jog every few tiles -- on the isometric ground that is a ragged sawtooth
// both in the world and on the map. A road of width 5 makes it worse: the
// circular brush lumps at every jog.
//
// The cure is in the DATA, once, so every reader of `region.roads` (the
// stamper, the road priests, the gate roads, the farm roads) agrees on one
// line: a segment that is not already along an axis becomes a few LONG
// axis-aligned runs joined by short square jogs. Endpoints are untouched, so
// every road still starts and ends where it was authored.
//
// A diagonal of `major` x `minor` tiles is cut into `k` stairs, each one
// "half the major run, the jog, the other half"; `k` is the number of
// ROAD_JOG_TILES the minor offset spans, so a gentle bend gets one jog and a
// true diagonal gets a few evenly spaced ones rather than a tile-by-tile
// saw. Collinear neighbours merge, so a run is one straight run.
// ===========================================================================

/** The longest single sideways jog a squared road makes. */
export const ROAD_JOG_TILES = 18;

/** The fewest tiles of straight run left between two jogs. */
export const ROAD_MIN_RUN_TILES = 6;

function sameAxis(a, b, c) {
  return (a.tx === b.tx && b.tx === c.tx) || (a.ty === b.ty && b.ty === c.ty);
}

/** Drop duplicate points and the middle point of every collinear triple. */
function tidy(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && last.tx === p.tx && last.ty === p.ty) continue;
    out.push({ tx: p.tx, ty: p.ty });
  }
  for (let i = out.length - 2; i > 0; i--) {
    if (sameAxis(out[i - 1], out[i], out[i + 1])) out.splice(i, 1);
  }
  return out;
}

/** One segment A -> B as axis-aligned points (A excluded, B included). */
export function squareSegment(a, b) {
  const dx = b.tx - a.tx, dy = b.ty - a.ty;
  if (dx === 0 || dy === 0) return [{ tx: b.tx, ty: b.ty }];
  const alongX = Math.abs(dx) >= Math.abs(dy);
  const M = alongX ? dx : dy;          // signed run along the major axis
  const m = alongX ? dy : dx;          // signed offset along the minor axis
  let k = Math.max(1, Math.round(Math.abs(m) / ROAD_JOG_TILES));
  k = Math.max(1, Math.min(k, Math.floor(Math.abs(M) / (2 * ROAD_MIN_RUN_TILES)) || 1));
  const at = (fMajor, fMinor) => {
    const u = Math.round(M * fMajor), v = Math.round(m * fMinor);
    return alongX ? { tx: a.tx + u, ty: a.ty + v } : { tx: a.tx + v, ty: a.ty + u };
  };
  const out = [];
  for (let i = 0; i < k; i++) {
    out.push(at((i + 0.5) / k, i / k));       // half the major run
    out.push(at((i + 0.5) / k, (i + 1) / k)); // the jog
    out.push(at((i + 1) / k, (i + 1) / k));   // the other half
  }
  out[out.length - 1] = { tx: b.tx, ty: b.ty };
  return out;
}

/** A polyline made of axis-aligned runs only. Already-square lines come back
 *  unchanged (as a copy). */
export function squareRoadPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return points;
  const out = [{ tx: points[0].tx, ty: points[0].ty }];
  for (let i = 1; i < points.length; i++) {
    out.push(...squareSegment(points[i - 1], points[i]));
  }
  return tidy(out);
}

/** Square every road in a region list, in place. Idempotent. */
export function squareRegionRoads(regions) {
  for (const r of regions || []) {
    for (const road of (r.roads || [])) {
      if (road && !road._squared) {
        road.points = squareRoadPoints(road.points);
        Object.defineProperty(road, '_squared', { value: true, enumerable: false });
      }
    }
  }
  return regions;
}

/** Is every run of this line along an axis? */
export function isSquareRoad(points) {
  for (let i = 1; i < (points || []).length; i++) {
    if (points[i].tx !== points[i - 1].tx && points[i].ty !== points[i - 1].ty) return false;
  }
  return true;
}
