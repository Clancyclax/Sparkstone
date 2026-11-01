// ============================================================================
// ROUND 388 -- THE LAMPLIGHTERS WALK THE ROADS.
//
//   "Lamplighter pathing ignores all obstacles and collision, please route the
//    lamplighters on roads."
//
// Round 373's lamplighter slid in a straight line from one post to the next,
// through houses, walls, fences and the fountain. Now each leg of his chain is
// a path over the street network, found with the game's own A* (navGrid.js)
// on a grid where only open road tiles may be stood on:
//
//   lampAccess(...)   where a lamp is lit from: a standing spot BESIDE the post
//                     (its foot is solid, LAMP_FOOT_R), the nearest open road
//                     tile by walking, and the open walk between the two (the
//                     only steps of a leg that leave the road -- round 350 set
//                     every city post at least a tile back from the street).
//   planLampLeg(...)  one leg: off the road from the last post, along the road,
//                     and the final step to the next post. Null when the roads
//                     do not join -- the lamp is then skipped, never walked to
//                     through something.
//   pointAlong(...)   where a walker is, a distance along a planned leg.
//
// Kept free of the scene so it can be tested on a stub grid; the scene hands
// in `road(tx, ty)`, `solid(tx, ty)` (the nav grid: buildings, walls, props,
// trees, water) and the elevation `step` rule.
// ============================================================================
import { findPath, smoothPath } from './navGrid.js';

/** Tiles from a post searched for the road it is lit from. Cadence's posts stand on the courtyard paving at least a
 *  tile back from a street (round 350), some against a house well inside a block, so the reach is generous. */
export const LAMP_ROAD_REACH = 12;
/** The longest walk (in tiles) from that road tile to the standing spot. */
export const LAMP_LINK_MAX = 24;
/** One leg's search ceiling, and the window it may use. */
export const LAMP_LEG_EXPAND = 6000;
export const LAMP_LEG_WINDOW = 140;
/** At most this many legs are planned in one frame, however many lamplighters there are. */
export const LAMP_PLANS_PER_FRAME = 2;

// The standing spots round a post, the four sides before the corners.
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Where the lamp on tile (ltx, lty) is lit from.
 *   road(tx, ty)   true on a road tile
 *   solid(tx, ty)  true where nothing may stand (the post's own tile included)
 * Returns { stand: [tx, ty], road: [tx, ty], link: [[tx, ty], ...] stand -> road }
 * or null when there is no open road near enough, or no way from it to the post.
 */
export function lampAccess(ltx, lty, road, solid, reach = LAMP_ROAD_REACH) {
  // One breadth-first search out from every open spot beside the post at once, over open ground only (no corner
  // cutting), stopping at the first road tile: that is the nearest road BY WALKING, the spot beside the post it leads
  // to, and the way between. A post deep in a courtyard is reached by the shortest open walk from its street.
  const side = 2 * reach + 1;
  const idx = (tx, ty) => (ty - lty + reach) * side + (tx - ltx + reach);
  const inWin = (tx, ty) => Math.abs(tx - ltx) <= reach && Math.abs(ty - lty) <= reach;
  const came = new Int32Array(side * side).fill(-2);   // -2 unseen, -1 a seed (a spot beside the post)
  const open = new Map();
  const isOpen = (tx, ty) => {
    const k = (ty - lty) * 8192 + (tx - ltx);
    if (!open.has(k)) open.set(k, !solid(tx, ty));
    return open.get(k);
  };
  const q = [];
  for (const [dx, dy] of SIDES) {
    const tx = ltx + dx, ty = lty + dy;
    if (!isOpen(tx, ty)) continue;
    came[idx(tx, ty)] = -1; q.push(tx, ty);
  }
  for (let h = 0; h < q.length; h += 2) {
    const cx = q[h], cy = q[h + 1];
    if (road(cx, cy)) {
      const link = [];
      for (let k = idx(cx, cy); k !== -1; k = came[k]) link.push([(k % side) + ltx - reach, Math.floor(k / side) + lty - reach]);
      link.reverse();   // stand -> road
      if (link.length - 1 > LAMP_LINK_MAX) return null;
      return { stand: link[0], road: [cx, cy], link };
    }
    for (const [dx, dy] of SIDES) {
      const nx = cx + dx, ny = cy + dy;
      if (!inWin(nx, ny) || (nx === ltx && ny === lty)) continue;
      const k = idx(nx, ny);
      if (came[k] !== -2 || !isOpen(nx, ny)) continue;
      if (dx && dy && (!isOpen(cx + dx, cy) || !isOpen(cx, cy + dy))) continue;
      came[k] = idx(cx, cy); q.push(nx, ny);
    }
  }
  return null;
}

/**
 * One leg of a chain, from post A's standing spot to post B's, as tiles.
 *   A, B   lampAccess results
 *   step   optional (ax, ay, bx, by) -> bool, the elevation rule
 *   flat   optional step for smoothing (no shortcut across a change of height)
 * Returns { tiles: [[tx, ty], ...] | null, expanded }.
 */
export function planLampLeg(A, B, road, solid, step = null, flat = null, opts = {}) {
  if (!A || !B) return { tiles: null, expanded: 0 };
  const onRoad = (tx, ty) => !road(tx, ty) || solid(tx, ty);
  const r = findPath({ sx: A.road[0], sy: A.road[1], gx: B.road[0], gy: B.road[1], blocked: onRoad, step: step || undefined,
    maxExpand: opts.maxExpand || LAMP_LEG_EXPAND, pad: opts.pad == null ? 16 : opts.pad, maxWindow: opts.window || LAMP_LEG_WINDOW });
  if (!r.complete || !r.path) return { tiles: null, expanded: r.expanded };
  const mid = smoothPath(r.path, onRoad, flat || step);
  const tiles = [];
  const add = (p) => { const q = tiles[tiles.length - 1]; if (!q || q[0] !== p[0] || q[1] !== p[1]) tiles.push(p); };
  for (const p of A.link) add(p);                 // off the road from the last post
  for (const p of mid) add(p);                    // along the road
  for (let i = B.link.length - 1; i >= 0; i--) add(B.link[i]);   // the final step beside the next post
  return { tiles, expanded: r.expanded };
}

/** Tile path -> world points (tile centres) and length. */
export function legPoints(tiles, TILE) {
  const pts = tiles.map(([x, y]) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }));
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return { pts, len };
}

/** The point `s` along a polyline, and the direction of the segment it is on. */
export function pointAlong(pts, s) {
  if (!pts || !pts.length) return null;
  if (pts.length === 1 || s <= 0) {
    const b = pts[Math.min(1, pts.length - 1)];
    return { x: pts[0].x, y: pts[0].y, dx: b.x - pts[0].x, dy: b.y - pts[0].y };
  }
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (acc + seg >= s || i === pts.length - 1) {
      const f = seg > 0 ? Math.max(0, Math.min(1, (s - acc) / seg)) : 1;
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: b.x - a.x, dy: b.y - a.y };
    }
    acc += seg;
  }
  return null;
}

/** The walk a leg is timed for, before it is planned: the streets run on the grid, so the
 *  distance along them, plus a tile each end to step off the road to the post. */
export function legEstimate(a, b, TILE) {
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + 2 * TILE;
}
