// ============================================================================
// ROUND 416 -- THE GRID CITIES, LIVED IN (the user's city review, items 8.1, 8.2, 8.4, 8.5 and 9).
//
//   8.1  "Lots of props and city items."
//   8.2  "A market square selling food, books, weapons, armour and other things."
//   8.4  "NPCs wander their district; adventurers patrol alone or in teams looking for gear or hunting monsters."
//   8.5  "Every city has a little underworld and slums, with taverns full of morally dubious patrons."
//   9    "Wagons and other vehicles travel the roads occasionally, on routes between the city and other towns or
//         through the city."
//
// Harrowmoor, Karsk Landing, Vashra, Tolbrand Quay and Slagward -- the five cities built from gridCity.js. Cadence is
// hand-built and has its own (cityLife.js, cityLifeMixin.js, cityPropsR381Mixin.js); it is not touched here.
//
// This file is the rules, and imports nothing from the scene, so the suite reads it directly
// (tools/tests/test_round416.cjs). gridLifeMixin.js is what puts it in the world. Every choice is a hash of a fixed
// string, never the unseeded random, so a city is the same city every time it is built.
// ============================================================================
import { GRID_PLAZA_HALF } from './gridCity.js';

export const hashStr = (s) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
export const rngOf = (key) => {
  let h = hashStr(key) || 1;
  return () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 1000003) / 1000003; };
};

// ------------------------------------------------------------------------------------------------- 8.2 the market
/** Stalls stand on a lattice this many tiles apart, leaving an aisle about four tiles wide between rows. */
export const GL_MARKET_PITCH = 6;
/** Tiles kept clear inside the square's edge. */
export const GL_MARKET_INSET = 3;
/** What the stalls sell, dealt down the lattice in this order, so every trade the user named is in every market. Food
 *  is the rations, the stranger's kitchen, the juice and the fish; the rest are books, weapons, armour, potions and
 *  monster parts. */
export const GL_MARKET_TRADES = [
  'rations', 'weapons', 'books', 'armour', 'otherworld', 'potions', 'drinks', 'parts', 'fish',
  'weapons', 'armour', 'rations', 'books', 'potions', 'drinks', 'otherworld', 'parts', 'armour',
  'weapons', 'rations', 'fish', 'books', 'potions', 'armour',
];
/** The food trades, for the census. */
export const GL_FOOD_TRADES = ['rations', 'otherworld', 'drinks', 'fish'];
/** A tall square (Tolbrand Quay's) holds more lattice points than a market needs: two dozen stalls at most. */
export const GL_MARKET_MAX = 24;
/** The new trades this round adds to the market's list (marketGoods.js): weapons and armour on the square, and the
 *  fence in the back of a dive. */
export const GL_NEW_TRADES = ['weapons', 'armour', 'fence'];

/** The stall sites in a market square (tiles, relative to the city's centre), with the trade each one takes. The
 *  middle of the lattice is left open for the crier's podium. */
export function marketStallSpots(sq) {
  if (!sq) return [];
  const xs = [], ys = [];
  for (let x = sq.x0 + GL_MARKET_INSET; x <= sq.x1 - GL_MARKET_INSET; x += GL_MARKET_PITCH) xs.push(x);
  for (let y = sq.y0 + GL_MARKET_INSET; y <= sq.y1 - GL_MARKET_INSET; y += GL_MARKET_PITCH) ys.push(y);
  const mi = Math.floor((xs.length - 1) / 2), mj = Math.floor((ys.length - 1) / 2);
  const out = [];
  ys.forEach((y, j) => xs.forEach((x, i) => {
    if (i === mi && j === mj) return;
    out.push({ x, y, i, j });
  }));
  out.forEach((s, n) => { s.trade = GL_MARKET_TRADES[n % GL_MARKET_TRADES.length]; });
  return out;
}
/** The open middle of the lattice (the podium's place), and the aisles between the rows (where shoppers walk). */
export function marketCentre(sq) {
  const spots = [];
  for (let x = sq.x0 + GL_MARKET_INSET; x <= sq.x1 - GL_MARKET_INSET; x += GL_MARKET_PITCH) spots.push(x);
  const ys = [];
  for (let y = sq.y0 + GL_MARKET_INSET; y <= sq.y1 - GL_MARKET_INSET; y += GL_MARKET_PITCH) ys.push(y);
  return { x: spots[Math.floor((spots.length - 1) / 2)], y: ys[Math.floor((ys.length - 1) / 2)] };
}
export function marketAisles(sq) {
  const out = [];
  for (let y = sq.y0 + GL_MARKET_INSET + GL_MARKET_PITCH / 2; y < sq.y1 - GL_MARKET_INSET; y += GL_MARKET_PITCH) out.push(y);
  return out;
}

// ------------------------------------------------------------------------------------------ 8.5 the slums
/** How many housing blocks make up the slums: two in the small cities, three in the big ones. */
export const GL_SLUM_BLOCKS = { small: 2, big: 3 };
/** A slum block is within this many tiles (centre to centre) of the first one picked. */
export const GL_SLUM_REACH = 80;
/** Dive taverns: one per slum block, at most this many a city. */
export const GL_DIVES_MAX = 2;
export const GL_DIVE_NAMES = [
  'The Rusty Hook', 'The Drowned Rat', 'The Crooked Lantern', 'The Last Copper', 'The Gutter Crown',
  'The Bent Nail', 'The Black Tallow', 'The Cutpurse Arms', 'The Sour Barrel', 'The Knife and Candle',
];

const centreOf = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

/** The slums: the dense block farthest from the centre (back against the wall, where cities keep their poor), and the
 *  housing blocks nearest it. Festival blocks are never slums. Returns block rectangles in plan tiles. */
export function slumBlocks(plan) {
  const housing = ((plan.blocks && plan.blocks.housing) || []).filter(b => !b.festival);
  const dense = (plan.dense && plan.dense.length) ? plan.dense : housing.filter(b => b.dense);
  if (!dense.length && !housing.length) return [];
  const pool = dense.length ? dense : housing;
  const first = pool.slice().sort((a, b) => {
    const ca = centreOf(a), cb = centreOf(b);
    return Math.hypot(cb.x, cb.y) - Math.hypot(ca.x, ca.y) || ca.x - cb.x || ca.y - cb.y;
  })[0];
  const want = (plan.half || 0) >= 150 ? GL_SLUM_BLOCKS.big : GL_SLUM_BLOCKS.small;
  const f = centreOf(first);
  const same = (a, b) => a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1;
  const near = housing.filter(b => !same(b, first)).map(b => ({ b, d: Math.hypot(centreOf(b).x - f.x, centreOf(b).y - f.y) }))
    .filter(o => o.d <= GL_SLUM_REACH).sort((a, b) => (a.b.dense ? 0 : 1) - (b.b.dense ? 0 : 1) || a.d - b.d);
  const out = [{ x0: first.x0, y0: first.y0, x1: first.x1, y1: first.y1, dense: dense.length > 0 || !!first.dense }];
  for (const o of near) {
    if (out.length >= want) break;
    out.push({ x0: o.b.x0, y0: o.b.y0, x1: o.b.x1, y1: o.b.y1, dense: !!o.b.dense });
  }
  return out;
}
/** What lies about in a slum: on the alleys and against the house walls. */
export const GL_SLUM_PROPS = ['firewoodStack', 'rainBarrel', 'bucketBroom', 'hayBales', 'clothesline', 'rainBarrel', 'firewoodStack', 'pumpkinPile'];
/** Who drinks in a dive. */
export const GL_DIVE_PATRONS = ['npc_bandit_skinny', 'npc_bandit_woman', 'npc_bandit_brute', 'npc_pirate', 'npc_cultist_man',
  'npc_cultist_woman', 'npc_grizzled_adventurer_v2', 'npc_peasant_man_v2', 'npc_muscular_adventurer_v2'];
export const GL_DIVE_LINES = [
  'Didn\'t see a thing. Never do.', 'Keep your hand off your purse. It tells people where it is.',
  'Pim\'ll buy anything. Ask him where it came from and he\'ll forget your face.', 'Dice? Lose a copper, lose a silver, lose a finger.',
  'The watch drinks here too. Off duty. Mostly.', 'Somebody\'s cousin\'s friend has a job going. No questions. Good pay.',
  'This ale was a mistake. So was the last one.', 'Sit down or move along. You\'re blocking the light.',
];
/** Slum props per block, at most. */
export const GL_SLUM_PROPS_PER_BLOCK = 22;

// -------------------------------------------------------------------------------- 8.4 people in their districts
/** Who walks in each district: how many, and the models they are drawn from. */
export const GL_FOLK = {
  housing: ['npc_farmer', 'npc_farmer_v1', 'npc_peasant_man', 'npc_peasant_man_v1', 'npc_peasant_man_v2', 'npc_cheerful_peasant_girl',
    'npc_cheerful_peasant_girl_v1', 'npc_cheerful_peasant_girl_v2', 'npc_townsman', 'npc_townsman_v1', 'npc_townsman_v2', 'npc_sporty_woman'],
  market: ['npc_merchant', 'npc_confident_woman', 'npc_patterned_man', 'npc_townsman_v3', 'npc_townsman_v4', 'npc_sleek_woman',
    'npc_cheerful_peasant_girl', 'npc_farmer_v2', 'npc_hiker_m', 'npc_hiker_f'],
  temple: ['npc_priest_m', 'npc_priest_f', 'npc_priest_old', 'npc_townsman', 'npc_confident_woman', 'npc_peasant_man_v1', 'npc_cheerful_peasant_girl_v2'],
  aristocracy: ['npc_posh_noble_girl', 'npc_posh_noble_girl_v1', 'npc_posh_noble_girl_v2', 'npc_noble_standing', 'npc_noble_standing_v1',
    'npc_noble_standing_v2', 'npc_sleek_woman', 'npc_patterned_man'],
  slum: ['npc_bandit_skinny', 'npc_bandit_woman', 'npc_bandit_brute', 'npc_peasant_man_v2', 'npc_farmer_v2', 'npc_pirate'],
};
export const GL_FOLK_NAME = {
  housing: ['Townsman', 'Townswoman', 'Neighbour', 'Labourer', 'Washerwoman', 'Carter'],
  market: ['Shopper', 'Porter', 'Haggler', 'Market-goer', 'Errand runner'],
  temple: ['Pilgrim', 'Acolyte', 'Worshipper', 'Lay brother', 'Lay sister'],
  aristocracy: ['Noble', 'Steward', 'Lady of the house', 'Heir', 'Courtier'],
  slum: ['Cutpurse', 'Beggar', 'Hired knife', 'Fence\'s runner', 'Dockside tough', 'Gambler'],
};
export const GL_FOLK_LINES = {
  housing: ['Mind the washing.', 'Rent\'s due Fifthday and the landlord never forgets.', 'Kids have been at the well again.',
    'Heard a crash two streets over last night. Nobody went to look.', 'Lovely day for it. Whatever it is.'],
  market: ['The smith\'s stall has a blade I can\'t afford. I come and look at it.', 'Fish is fresh. Smell it, don\'t ask.',
    'Bread\'s up a copper again.', 'If you want books, the stall by the potions has the good ones.', 'Haggle. They expect it.'],
  temple: ['Walk softly on the temple steps.', 'Every god has an hour. Mine is nearly here.', 'Light a candle, if you\'ve a copper.',
    'The priests say the bells keep the dark off. I hope they\'re right.'],
  aristocracy: ['You are aware this is a private street?', 'The gardeners are late again.', 'Mother will hear of this.',
    'One does not simply walk through the estates.', 'We are expecting guests. Not you.'],
  slum: ['Lost, are you? Shame.', 'Nice boots. Be a pity if they walked off.', 'Ask at the tavern. Ask quiet.',
    'Watch knows better than to come down here after dark.', 'Got a copper? No? Then keep walking.',
    'You didn\'t see me. I didn\'t see you.'],
};
/** Wanderers per district, by the size of the district: one per this many square tiles, within a floor and a cap. */
export const GL_FOLK_DENSITY = { housing: 240, market: 200, temple: 420, aristocracy: 650, slum: 110 };
export const GL_FOLK_MIN = { housing: 24, market: 24, temple: 10, aristocracy: 8, slum: 12 };
export const GL_FOLK_MAX = { housing: 170, market: 80, temple: 40, aristocracy: 30, slum: 34 };
export function folkCountFor(kind, areaTiles) {
  const n = Math.round(areaTiles / (GL_FOLK_DENSITY[kind] || 1000));
  return Math.max(GL_FOLK_MIN[kind] || 0, Math.min(GL_FOLK_MAX[kind] || 20, n));
}
/** The kerbs: what stands on the paving beside a street, and how many a city gets (by its half-width in tiles). */
export const GL_KERB_KINDS = ['planterUrn', 'benchBacked', 'treePlanter', 'rainBarrel', 'topiaryPot', 'benchStone', 'planterBarrel',
  'hitchingRail', 'flowerboxLavender', 'treePlanter', 'waterTrough', 'sandwichBoard'];
export function glKerbCap(half) { return Math.max(30, Math.min(260, Math.round(half * half * 4 / 600))); }
/** A walker's pace (px/s) and how long they stand at each stop. */
export const GL_WALK_SPEED = 46;
export const GL_STAND = [2, 7];
/** People are drawn (and walk) only near the player. */
export const GL_DRAW_RADIUS = 1400;

// ----------------------------------------------------------------------------- 8.4 adventurers on patrol
/** Parties per city: a size and a purpose each. Lone adventurers and teams of two to four. */
export const GL_PATROLS = { small: 4, big: 7 };
export const GL_PATROL_SIZES = [1, 3, 2, 1, 4, 2, 1, 3];
export const GL_PATROL_PURPOSES = ['gear', 'hunt', 'gear', 'hunt', 'hunt', 'gear', 'hunt', 'gear'];
export const GL_ADV_MODELS = ['npc_bearded_adventurer', 'npc_muscular_adventurer', 'npc_muscular_adventurer_v1', 'npc_female_adventurer',
  'npc_female_adventurer_v1', 'npc_female_adventurer_v2', 'npc_grizzled_adventurer', 'npc_grizzled_adventurer_v1', 'npc_shield_adventurer',
  'npc_mage', 'npc_mage_v1', 'npc_plate', 'npc_plate_v1', 'npc_muscular_adventurer_v2', 'npc_mage_v2'];
export const GL_ADV_RANKS = ['Iron-rank', 'Iron-rank', 'Iron-rank', 'Bronze-rank', 'Bronze-rank', 'Silver-rank'];
export const GL_ADV_LINES = {
  gear: ['Looking for a better blade before we head out. The market stalls have been picking over the same junk all week.',
    'New armour. The last lot took a bite out of my shoulder and the plate went with it.',
    'If you see a decent shield going cheap, it\'s mine. I saw it first.',
    'Fitting out. Potions, rations, something that cuts. Then the road.'],
  hunt: ['Something\'s been taking travellers on the road out. We mean to find it.',
    'Contract off the Society board. Three days\' work, if it goes well.',
    'Patrol out to the treeline and back. Anything that bites, we bite back.',
    'There\'s a bounty on a nest past the gate. We\'re the bounty\'s problem now.'],
};
export const GL_PATROL_SPEED = 62;
/** How long a party lingers: at the market (browsing) and outside the gate (the hunt). Seconds. */
export const GL_BROWSE_S = 28, GL_HUNT_S = 40;
export function patrolPlan(cityId, big) {
  const n = big ? GL_PATROLS.big : GL_PATROLS.small;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ size: GL_PATROL_SIZES[(i + (hashStr(cityId) % 3)) % GL_PATROL_SIZES.length], purpose: GL_PATROL_PURPOSES[i % GL_PATROL_PURPOSES.length] });
  }
  return out;
}

// ------------------------------------------------------------------------------------------------- 9 the wagons
/** Wagons a city keeps on its routes: each runs road -> gate -> through the city -> gate -> road, and back. */
export const GL_WAGONS = { small: 2, big: 3 };
/** How far out along the roads a wagon's route reaches beyond the gate (tiles). */
export const GL_WAGON_ROAD_REACH = 160;
export const GL_WAGON_SPEED = 150;

// ---------------------------------------------------------------------------- the streets as a graph (pure)
/**
 * The routes walkers and wagons follow inside a grid city, as a small graph in plan tiles: the ring road, the two
 * avenues from the ring to the plaza, a loop round the inside of the plaza (so nothing drives through the fountain),
 * and each gate (its inner point on the ring, the gap in the wall, and a point outside on its road).
 * Returns { nodes: [{x,y}], adj: Map(i -> [j]), gate: [{inner, gap, out, side}] }.
 */
export function gridStreetGraph(plan, wall, entries) {
  const R = plan.ringC, P = GRID_PLAZA_HALF - 3;
  const nodes = [];
  const key = (x, y) => `${x},${y}`;
  const idx = new Map();
  const node = (x, y) => { const k = key(x, y); if (!idx.has(k)) { idx.set(k, nodes.length); nodes.push({ x, y }); } return idx.get(k); };
  const adj = new Map();
  const link = (a, b) => {
    if (a === b) return;
    if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
    if (!adj.get(a).includes(b)) adj.get(a).push(b);
    if (!adj.get(b).includes(a)) adj.get(b).push(a);
  };
  // the ring: its corners, the avenue ends, and each gate's inner point, in order round the perimeter
  const perim = (x, y) => {
    if (y === -R) return x + R;                 // north, west to east
    if (x === R) return 2 * R + (y + R);         // east, north to south
    if (y === R) return 4 * R + (R - x);         // south, east to west
    return 6 * R + (R - y);                      // west, south to north
  };
  const ringPts = [[-R, -R], [R, -R], [R, R], [-R, R], [0, -R], [R, 0], [0, R], [-R, 0]];
  const gates = [];
  for (const e of (entries || [])) {
    const at = e.at;
    const inner = { north: [at, -R], south: [at, R], west: [-R, at], east: [R, at] }[e.side];
    const gap = { north: [at, wall.y0], south: [at, wall.y1], west: [wall.x0, at], east: [wall.x1, at] }[e.side];
    const out = { north: [at, wall.y0 - 8], south: [at, wall.y1 + 8], west: [wall.x0 - 8, at], east: [wall.x1 + 8, at] }[e.side];
    if (!inner) continue;
    ringPts.push(inner);
    gates.push({ side: e.side, at, inner, gap, out });
  }
  const ring = ringPts.map(([x, y]) => ({ x, y, p: perim(x, y) })).sort((a, b) => a.p - b.p);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    link(node(a.x, a.y), node(b.x, b.y));
  }
  // the plaza loop and the avenues onto it
  const plaza = [[0, -P], [P, -P], [P, 0], [P, P], [0, P], [-P, P], [-P, 0], [-P, -P]];
  for (let i = 0; i < plaza.length; i++) link(node(...plaza[i]), node(...plaza[(i + 1) % plaza.length]));
  link(node(0, -R), node(0, -P)); link(node(0, R), node(0, P)); link(node(-R, 0), node(-P, 0)); link(node(R, 0), node(P, 0));
  for (const g of gates) {
    g.innerN = node(...g.inner); g.gapN = node(...g.gap); g.outN = node(...g.out);
    link(g.innerN, g.gapN); link(g.gapN, g.outN);
  }
  return { nodes, adj, gates, node, R, P };
}
/** A point on an avenue between the ring and the plaza, spliced into the graph (for the market's door, say). */
export function spliceOnAvenue(G, x, y) {
  const { node, adj, R, P } = G;
  const vertical = x === 0 && Math.abs(y) > P && Math.abs(y) < R;
  const horizontal = y === 0 && Math.abs(x) > P && Math.abs(x) < R;
  if (!vertical && !horizontal) return null;
  const n = node(x, y);
  const sg = vertical ? Math.sign(y) : Math.sign(x);
  const on = [];
  G.nodes.forEach((q, k) => {
    const v = vertical ? (q.x === 0 ? q.y : null) : (q.y === 0 ? q.x : null);
    if (v !== null && Math.sign(v) === sg && Math.abs(v) >= P && Math.abs(v) <= R) on.push({ k, v });
  });
  on.sort((a, b) => a.v - b.v);
  const set = new Set(on.map(o => o.k));
  for (const o of on) adj.set(o.k, (adj.get(o.k) || []).filter(j => !set.has(j)));
  for (let i = 0; i + 1 < on.length; i++) { adj.get(on[i].k).push(on[i + 1].k); adj.get(on[i + 1].k).push(on[i].k); }
  return n;
}
/** The shortest way between two nodes, as a list of plan-tile points (every leg axis-aligned). */
export function streetPath(G, from, to) {
  const N = G.nodes.length;
  const dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  dist[from] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < N; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0 || u === to) break;
    done[u] = true;
    for (const v of (G.adj.get(u) || [])) {
      const a = G.nodes[u], b = G.nodes[v];
      const d = dist[u] + Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; }
    }
  }
  if (!Number.isFinite(dist[to])) return null;
  const out = [];
  for (let v = to; v >= 0; v = prev[v]) { out.push({ ...G.nodes[v] }); if (v === from) break; }
  return out.reverse();
}
export const pathLength = (pts) => {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return L;
};
/** Where a ping-pong walker is at time t along a path with dwell stops: { x, y, dx, dy, moving, stop }. `stops` maps
 *  a point index to seconds spent there (each way). */
export function walkAt(pts, speed, stops, t) {
  const legs = [];
  let T = 0;
  for (let i = 0; i < pts.length; i++) {
    const s = (stops && stops[i]) || 0;
    if (s) { legs.push({ kind: 'stop', i, t0: T, dur: s }); T += s; }
    if (i + 1 < pts.length) {
      const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      legs.push({ kind: 'move', i, t0: T, dur: d / speed }); T += d / speed;
    }
  }
  if (T <= 0) return { x: pts[0].x, y: pts[0].y, dx: 0, dy: 1, moving: false };
  let u = ((t % (2 * T)) + 2 * T) % (2 * T);
  const back = u > T;
  if (back) u = 2 * T - u;
  let leg = legs[legs.length - 1];
  for (const l of legs) if (u >= l.t0 && u <= l.t0 + l.dur) { leg = l; break; }
  if (leg.kind === 'stop') {
    const p = pts[leg.i];
    const q = pts[Math.min(leg.i + 1, pts.length - 1)], r = pts[Math.max(leg.i - 1, 0)];
    return { x: p.x, y: p.y, dx: (back ? r.x - p.x : q.x - p.x) || 0, dy: (back ? r.y - p.y : q.y - p.y) || 1, moving: false, stop: leg.i };
  }
  const a = pts[leg.i], b = pts[leg.i + 1];
  const f = leg.dur ? (u - leg.t0) / leg.dur : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, dx: (b.x - a.x) * (back ? -1 : 1), dy: (b.y - a.y) * (back ? -1 : 1), moving: true };
}
