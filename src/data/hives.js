// ===========================================================================
// ROUND 424 -- THE ANTS AND THE TERMITES.
//
//   "Addition of 2 new monster groups, Ant Monsters and Termite Monsters.
//    These will have minor surface 'hive areas' scattered around relevant maps ... but ultimately will have large
//    hives underground where the full array of them exist. In most maps either have the ants or the termites not
//    both. But in 1 map they should both exist with hives at opposite ends of the map and skirmishes between them
//    regularly occurring. In their underground a player intent on exploration will find that their tunnels
//    intersect and the 2 groups are fully at war with one another. ... color the monsters for all elemental
//    affinities, but ... keep each hive to 1 or 2 affinities relevant to their location. Their underground caves
//    should also be heavily inspired by their location (i.e. ice caves or volcanic caves)."
//
// PURE DATA AND PURE FUNCTIONS. Nothing here imports a scene or another data module, so monsters.js, monsterArt.js,
// deathArt.js and interiors.js can all import it without a cycle. The scene side is src/scenes/hiveMixin.js.
//
//   * HIVE_FAMILIES     the eight families (the user's hive_monsters.zip), their role, base numbers and art rows
//   * HIVE_SHADES       nine colourings per line: two plain (ants red-brown and black, termites ochre and pale) and
//                       seven elemental -- the shade NAME is what sets the element (monsterDebuffs.js VARIANT_ELEMENT)
//   * HIVES             one per region: which line, which two colourings, how strong, which mound art, which ground
//   * hiveGrid(id)      the underground: chambers joined by dug tunnels, every floor tile reachable from the way in
//   * hiveContents(id)  what stands in it: the queens, the packs by chamber, the nest props, the way out
//   * NEST_ART          the user's hive_nests.zip (mounds, entrances, interior decoration) with its anchors
// ===========================================================================

/** The eight. `role` decides where a family stands in a hive and how it behaves (hiveMixin.js): grubs swarm, workers
 *  are the common body of the colony, soldiers are the tough melee, a queen holds her chamber and lays brood. Grubs
 *  and the termite queen have no real legs, so their speed is a crawl (their "run" sheets are the crawl). */
export const HIVE_FAMILIES = {
  antGrub:        { kind: 'ant',     role: 'grub',    name: 'Ant Grub',       base: { hp: 8,  speed: 44, dmg: 3, aggro: 150, radius: 10, xp: 4 } },
  antWorker:      { kind: 'ant',     role: 'worker',  name: 'Ant Worker',     base: { hp: 14, speed: 96, dmg: 4, aggro: 162, radius: 11, xp: 8 } },
  antSoldier:     { kind: 'ant',     role: 'soldier', name: 'Ant Soldier',    base: { hp: 26, speed: 88, dmg: 6, aggro: 176, radius: 13, xp: 18 } },
  antQueen:       { kind: 'ant',     role: 'queen',   name: 'Ant Queen',      base: { hp: 58, speed: 52, dmg: 8, aggro: 190, radius: 20, xp: 70 } },
  termiteGrub:    { kind: 'termite', role: 'grub',    name: 'Termite Grub',   base: { hp: 9,  speed: 38, dmg: 3, aggro: 148, radius: 10, xp: 4 } },
  termiteWorker:  { kind: 'termite', role: 'worker',  name: 'Termite Worker', base: { hp: 16, speed: 78, dmg: 4, aggro: 158, radius: 12, xp: 8 } },
  termiteSoldier: { kind: 'termite', role: 'soldier', name: 'Termite Soldier', base: { hp: 30, speed: 70, dmg: 6, aggro: 172, radius: 13, xp: 18 } },
  termiteQueen:   { kind: 'termite', role: 'queen',   name: 'Termite Queen',  base: { hp: 66, speed: 22, dmg: 7, aggro: 186, radius: 22, xp: 70 } },
};
export const HIVE_FAMILY_KEYS = Object.keys(HIVE_FAMILIES);
export const HIVE_LINE = {
  ant: ['antGrub', 'antWorker', 'antSoldier', 'antQueen'],
  termite: ['termiteGrub', 'termiteWorker', 'termiteSoldier', 'termiteQueen'],
};

/** Weakest-looking first is NOT the rule here (as it is for the older families): a hive colouring's strength comes
 *  from the HIVE it lives in, not from its place in this list (see hiveVariantStats). */
export const HIVE_SHADES = {
  ant:     ['russet', 'sable', 'ember', 'glacial', 'storm', 'verdant', 'venom', 'umbral', 'gilded'],
  termite: ['ochre', 'pale', 'ember', 'glacial', 'storm', 'verdant', 'venom', 'umbral', 'gilded'],
};

/** Packed by tools/hive_r424/pack_hive.py (cell, foot line) -- the MONSTER_ART rows. */
const ART = {
  antGrub:        { cell: 70,  originY: 0.8571, displayScale: 0.46 },
  antWorker:      { cell: 92,  originY: 0.9022, displayScale: 0.74 },
  antSoldier:     { cell: 106, originY: 0.8679, displayScale: 0.84 },
  antQueen:       { cell: 144, originY: 0.9514, displayScale: 1.12 },
  termiteGrub:    { cell: 60,  originY: 0.95,   displayScale: 0.5 },
  termiteWorker:  { cell: 86,  originY: 0.8837, displayScale: 0.74 },
  termiteSoldier: { cell: 94,  originY: 0.8298, displayScale: 0.84 },
  termiteQueen:   { cell: 138, originY: 0.8913, displayScale: 1.12 },
};
export const HIVE_ART = Object.fromEntries(HIVE_FAMILY_KEYS.map(f => [f, {
  cell: ART[f].cell, shades: HIVE_SHADES[HIVE_FAMILIES[f].kind].slice(), runFrames: 8, attackFrames: 8,
  displayScale: ART[f].displayScale, runFrameMs: HIVE_FAMILIES[f].role === 'grub' || f === 'termiteQueen' ? 120 : 80,
  originY: ART[f].originY, hitFrame: 4, lazy: true,
}]));
/** The procedural deaths the packer writes (public/assets/death/mon_<family>_death.png): one row per shade. */
export const HIVE_DEATH = Object.fromEntries(HIVE_FAMILY_KEYS.map(f => [f, {
  cell: ART[f].cell, frames: 8, dx: 0, dy: 0, loopLast: 0, gif: 'procedural (tools/hive_r424/pack_hive.py)',
}]));

// ---------------------------------------------------------------------------
// THE HIVES. `tier` is the colony's WORKER tier (the region's own floor); soldiers sit a tier above, the queen
// above that, never past gold (tier 4). `theme` picks the tunnel floor (public/assets/hive_floor_<theme>.png) and
// `mounds` the user's mound / entrance pairs that fit the ground.
// ---------------------------------------------------------------------------
export const HIVES = {
  hive_nek: {
    id: 'hive_nek', region: 'nek', name: 'The Underhill', theme: 'earth', w: 96, h: 80,
    blurb: 'Packed earth, dug in galleries, and the smell of formic acid.',
    sides: [{ kind: 'ant', shades: ['russet', 'verdant'], tier: 0, mounds: ['meadow', 'thatch'], area: [0.12, 0.88] }],
  },
  hive_ontaria: {
    id: 'hive_ontaria', region: 'ontaria', name: 'The Damp Galleries', theme: 'earth', w: 96, h: 80,
    blurb: 'Chewed timber and wet clay, cold as the sea it lies beside.',
    sides: [{ kind: 'termite', shades: ['pale', 'glacial'], tier: 1, mounds: ['dome', 'mushroom'], area: [0.12, 0.88] }],
  },
  hive_elehyd: {
    id: 'hive_elehyd', region: 'elehyd', name: 'The Rime Warren', theme: 'frost', w: 96, h: 80,
    blurb: 'Frozen soil, hoarfrost on the walls, and somewhere below, thunder.',
    sides: [{ kind: 'ant', shades: ['glacial', 'storm'], tier: 2, mounds: ['harvester', 'twig'], area: [0.12, 0.88] }],
  },
  hive_sirukh: {
    id: 'hive_sirukh', region: 'sirukh', name: 'The Sand Cathedral', theme: 'sand', w: 96, h: 80,
    blurb: 'Sand cemented into pillars, cool after the dunes, bright with something gilded.',
    sides: [{ kind: 'termite', shades: ['ochre', 'gilded'], tier: 1, mounds: ['magnetic', 'fused'], area: [0.12, 0.88] }],
  },
  hive_cinder: {
    id: 'hive_cinder', region: 'cinder', name: 'The Kiln Mound', theme: 'ash', w: 96, h: 80,
    blurb: 'Ash and baked clay, the walls warm to the touch, the dark full of embers.',
    sides: [{ kind: 'termite', shades: ['ember', 'umbral'], tier: 3, mounds: ['cathedral', 'chimney'], area: [0.12, 0.88] }],
  },
  hive_ixcuatl: {
    id: 'hive_ixcuatl', region: 'ixcuatl', name: 'The Buried Court', theme: 'ruin', w: 96, h: 80,
    blurb: 'Tunnels through the stepped city\'s foundations, the old stone gilded by the colony.',
    sides: [{ kind: 'ant', shades: ['gilded', 'sable'], tier: 3, mounds: ['clay', 'fire'], area: [0.12, 0.88] }],
  },
  // THE ONE MAP WITH BOTH: Bratugal's jungle. Ants at the west end, termites at the east, the skirmish band in the
  // middle, and one underground in which the two colonies' galleries have dug into each other.
  hive_bratugal: {
    id: 'hive_bratugal', region: 'bratugal', name: 'The Broken Galleries', theme: 'loam', w: 176, h: 84, war: true,
    blurb: 'Two colonies, one darkness. Their tunnels met, and neither gave ground.',
    sides: [
      { kind: 'ant', shades: ['umbral', 'venom'], tier: 3, mounds: ['thatch', 'twig'], area: [0.06, 0.34], x: [0, 0.42] },
      { kind: 'termite', shades: ['verdant', 'ochre'], tier: 3, mounds: ['mushroom', 'dome'], area: [0.66, 0.94], x: [0.58, 1] },
    ],
    skirmish: [0.42, 0.58],
  },
};
export const HIVE_IDS = Object.keys(HIVES);
export const HIVE_LIST = HIVE_IDS.map(id => HIVES[id]);
export const HIVE_BY_REGION = Object.fromEntries(HIVE_LIST.map(h => [h.region, h]));
export const HIVE_THEMES = ['earth', 'sand', 'frost', 'ash', 'loam', 'ruin'];
/** Minor surface mounds per colony (house-sized, vent holes only, not enterable). */
export const SURFACE_MOUNDS = 4;
/** Where in the Bratugal skirmish band the war bands meet. */
export const SKIRMISH_SPOTS = 4;
/** Seconds between a skirmish spot raising a fresh war band on each side, once the last one is spent. */
export const SKIRMISH_RESPAWN_S = 150;

/** Stat multipliers by colony tier (worker tier). Chosen so a worker of a tier-N hive lands at threat tier N, a
 *  soldier one above it and a queen above that, by monsterThreatTier's effective-HP ceilings [16, 40, 80, 150]. */
const TIER_MULT = [
  { hp: 1.0, dmg: 1.0, xp: 1.0 },
  { hp: 2.0, dmg: 1.5, xp: 2.4 },
  { hp: 3.8, dmg: 2.2, xp: 5.0 },
  { hp: 7.0, dmg: 3.2, xp: 9.5 },
];
const TEMPER = {
  grub:    { chaseDropMult: 1.3, atkSpeedMult: 1.1, armorFactor: 0.006 },
  worker:  { chaseDropMult: 1.6, atkSpeedMult: 1.1, armorFactor: 0.014 },
  soldier: { chaseDropMult: 1.7, atkSpeedMult: 0.95, armorFactor: 0.030 },
  queen:   { chaseDropMult: 1.2, atkSpeedMult: 0.8, armorFactor: 0.034 },
};
export const HIVE_TEMPERAMENT = Object.fromEntries(HIVE_FAMILY_KEYS.map(f => [f, TEMPER[HIVE_FAMILIES[f].role]]));

/** The hive (and side) a colouring of a line belongs to; null for the two colourings no hive uses (ember ants,
 *  storm termites), which keep a middling strength for summons, bonds and the bestiary. */
export function hiveSideForShade(kind, shade) {
  for (const h of HIVE_LIST) for (const s of h.sides) if (s.kind === kind && s.shades.includes(shade)) return { hive: h, side: s };
  return null;
}

/** The numbers for one variant: its family's base, scaled by the tier of the hive its colouring lives in. */
export function hiveVariantStats(family, shade) {
  const f = HIVE_FAMILIES[family];
  if (!f) return null;
  const at = hiveSideForShade(f.kind, shade);
  const tier = at ? at.side.tier : 2;
  const m = TIER_MULT[Math.max(0, Math.min(TIER_MULT.length - 1, tier))];
  const b = f.base;
  const second = at && at.side.shades.indexOf(shade) === 1 ? 1.08 : 1;   // a hive's second colouring is its rarer, harder one
  return {
    hp: Math.round(b.hp * m.hp * second), dmg: Math.max(1, Math.round(b.dmg * m.dmg * second)),
    xp: Math.round(b.xp * m.xp * second), speed: b.speed, aggro: b.aggro + tier * 8, radius: b.radius,
    hiveTier: tier,
  };
}

// ---------------------------------------------------------------------------
// THE NEST ART (hive_nests.zip; tools/hive_r424/src/hive_nests_index.json). Mounds are 128 px, entrances and the
// interior decoration 80 px; foot = the bottom-centre anchor. `solid` follows the user's notes: mounds block, the
// entrances are the interactable thresholds, tunnel_arch / tunnel_pillar / dirt_rubble / resin_column block,
// eggs, bones and fungus are low decoration. A collapsed entrance is impassable; a sealed one is a locked door.
// ---------------------------------------------------------------------------
const NEST = (size, footX, footY, extra = {}) => ({ size, footX, footY, ...extra });
export const NEST_ART = {
  ant_mound_thatch: NEST(128, 64, 110, { kind: 'ant', mound: 'thatch', solid: true }),
  ant_mound_harvester: NEST(128, 64, 108, { kind: 'ant', mound: 'harvester', solid: true }),
  ant_mound_clay: NEST(128, 64, 120, { kind: 'ant', mound: 'clay', solid: true }),
  ant_mound_meadow: NEST(128, 64, 113, { kind: 'ant', mound: 'meadow', solid: true }),
  ant_mound_fire: NEST(128, 64, 113, { kind: 'ant', mound: 'fire', solid: true }),
  ant_mound_twig: NEST(128, 63, 113, { kind: 'ant', mound: 'twig', solid: true }),
  termite_mound_cathedral: NEST(128, 64, 120, { kind: 'termite', mound: 'cathedral', solid: true }),
  termite_mound_chimney: NEST(128, 64, 118, { kind: 'termite', mound: 'chimney', solid: true }),
  termite_mound_magnetic: NEST(128, 64, 121, { kind: 'termite', mound: 'magnetic', solid: true }),
  termite_mound_mushroom: NEST(128, 64, 118, { kind: 'termite', mound: 'mushroom', solid: true }),
  termite_mound_fused: NEST(128, 65, 120, { kind: 'termite', mound: 'fused', solid: true }),
  termite_mound_dome: NEST(128, 64, 117, { kind: 'termite', mound: 'dome', solid: true }),
  ant_entrance_thatch: NEST(80, 40, 73, { kind: 'ant', entrance: 'thatch' }),
  ant_entrance_harvester: NEST(80, 40, 70, { kind: 'ant', entrance: 'harvester' }),
  ant_entrance_clay: NEST(80, 40, 69, { kind: 'ant', entrance: 'clay' }),
  ant_entrance_meadow: NEST(80, 39, 71, { kind: 'ant', entrance: 'meadow' }),
  ant_entrance_fire: NEST(80, 40, 71, { kind: 'ant', entrance: 'fire' }),
  ant_entrance_twig: NEST(80, 40, 72, { kind: 'ant', entrance: 'twig' }),
  termite_entrance_cathedral: NEST(80, 40, 76, { kind: 'termite', entrance: 'cathedral' }),
  termite_entrance_chimney: NEST(80, 39, 70, { kind: 'termite', entrance: 'chimney' }),
  termite_entrance_magnetic: NEST(80, 40, 72, { kind: 'termite', entrance: 'magnetic' }),
  termite_entrance_mushroom: NEST(80, 40, 71, { kind: 'termite', entrance: 'mushroom' }),
  termite_entrance_fused: NEST(80, 40, 74, { kind: 'termite', entrance: 'fused' }),
  termite_entrance_dome: NEST(80, 39, 70, { kind: 'termite', entrance: 'dome' }),
  tunnel_hole_floor: NEST(80, 40, 74, {}),
  tunnel_hole_wall: NEST(80, 40, 74, {}),
  collapsed_entrance: NEST(80, 40, 75, { solid: true }),
  sealed_entrance: NEST(80, 39, 71, { solid: true }),
  egg_single: NEST(80, 40, 76, {}),
  egg_cluster: NEST(80, 40, 74, {}),
  egg_pile_resin: NEST(80, 40, 75, {}),
  egg_hatched: NEST(80, 40, 78, {}),
  larva_cells: NEST(80, 42, 71, {}),
  bones_pile: NEST(80, 39, 70, {}),
  skull_pile: NEST(80, 40, 74, {}),
  skeleton_remains: NEST(80, 40, 76, {}),
  shed_carapace: NEST(80, 40, 78, {}),
  tunnel_arch: NEST(80, 40, 78, { solid: true }),
  tunnel_pillar: NEST(80, 39, 77, { solid: true }),
  dirt_rubble: NEST(80, 39, 72, { solid: true }),
  fungus_garden: NEST(80, 40, 76, {}),
  food_cache: NEST(80, 40, 74, {}),
  honeydew_pool: NEST(80, 40, 70, {}),
  resin_column: NEST(80, 40, 78, { solid: true }),
};
export const NEST_KEYS = Object.keys(NEST_ART);
/** Drawn scale outdoors: a mound is house-sized. Indoors the decoration is drawn at the interior props' own size. */
export const MOUND_SCALE = 2.0;
export const NEST_PROP_SCALE = 1.0;
export const moundKey = (kind, style) => `${kind}_mound_${style}`;
export const entranceKey = (kind, style) => `${kind}_entrance_${style}`;

// ---------------------------------------------------------------------------
// THE UNDERGROUND. 0 = rock (void), 1 = floor, 2 = floor against the wall (the darker edge tile).
// ---------------------------------------------------------------------------
function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}
export function hiveRng(seed) {
  let s = hash(seed);
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/** Chamber roles, in the order a side lays them out after its entry and its queen. */
const SIDE_ROLES = ['nursery', 'garden', 'barracks', 'stores', 'graveyard', 'nursery', 'barracks', 'garden'];

export function buildHiveGrid(id) {
  const spec = HIVES[id];
  if (!spec) return null;
  const W = spec.w, H = spec.h;
  const g = new Uint8Array(W * H);
  const r = hiveRng(`hive|${id}`);
  const at = (x, y) => y * W + x;
  const disc = (cx, cy, rx, ry) => {
    for (let y = Math.max(2, Math.floor(cy - ry)); y <= Math.min(H - 3, Math.ceil(cy + ry)); y++) {
      for (let x = Math.max(2, Math.floor(cx - rx)); x <= Math.min(W - 3, Math.ceil(cx + rx)); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) g[at(x, y)] = 1;
      }
    }
  };
  const chambers = [];
  const entries = [];
  for (let si = 0; si < spec.sides.length; si++) {
    const side = spec.sides[si];
    const [fx0, fx1] = side.x || [0, 1];
    const x0 = Math.max(8, Math.round(fx0 * W) + 6), x1 = Math.min(W - 9, Math.round(fx1 * W) - 6);
    const span = x1 - x0;
    // The way in: the bottom edge, toward the side's outer end in the war map (so the two entrances are as far
    // apart as the map allows), in the middle otherwise.
    const ex = spec.war ? (si === 0 ? x0 + span * 0.22 : x1 - span * 0.22) : x0 + span * (0.4 + r() * 0.2);
    const entry = { side: si, role: 'entry', x: ex, y: H - 8, rx: 4.5, ry: 3.5 };
    // The queen: the far (top) end, and in the war map the outer corner -- as far from the enemy as she can be.
    const qx = spec.war ? (si === 0 ? x0 + span * 0.18 : x1 - span * 0.18) : x0 + span * (0.3 + r() * 0.4);
    const queen = { side: si, role: 'queen', x: qx, y: 10, rx: 8.5, ry: 6 };
    chambers.push(entry, queen);
    entries.push({ side: si, tx: Math.round(ex), ty: H - 6 });
    const mine = [entry, queen];
    const want = spec.war ? 7 : 8;
    let guard = 0;
    while (mine.length < want + 2 && guard++ < 600) {
      const c = { side: si, role: SIDE_ROLES[(mine.length - 2) % SIDE_ROLES.length],
        x: x0 + r() * span, y: 14 + r() * (H - 30), rx: 4.5 + r() * 2.5, ry: 3.4 + r() * 1.6 };
      if (mine.some(o => Math.hypot((o.x - c.x) / 1.0, (o.y - c.y) * 1.3) < 15)) continue;
      mine.push(c); chambers.push(c);
    }
  }
  // The war front: chambers in the middle band that both colonies dug into.
  if (spec.war) {
    const bx0 = Math.round((spec.skirmish ? spec.skirmish[0] : 0.42) * W), bx1 = Math.round((spec.skirmish ? spec.skirmish[1] : 0.58) * W);
    let guard = 0, n = 0;
    while (n < 3 && guard++ < 400) {
      const c = { side: -1, role: 'war', x: bx0 + r() * (bx1 - bx0), y: 14 + r() * (H - 30), rx: 6 + r() * 2, ry: 4.5 + r() };
      if (chambers.some(o => Math.hypot(o.x - c.x, (o.y - c.y) * 1.3) < 15)) continue;
      chambers.push(c); n++;
    }
  }
  for (const c of chambers) disc(c.x, c.y, c.rx, c.ry);
  // Tunnels: per side, a minimum spanning tree over that side's chambers plus two loops, each tunnel a wandering
  // line with two bends; the war chambers join the nearest chamber of EACH side, which is where the galleries meet.
  const edges = [];
  const tree = (list) => {
    if (list.length < 2) return;
    const inT = [list[0]]; const out = list.slice(1);
    while (out.length) {
      let best = null;
      for (const a of inT) for (const b of out) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (!best || d < best.d) best = { a, b, d };
      }
      edges.push([best.a, best.b]); inT.push(best.b); out.splice(out.indexOf(best.b), 1);
    }
    for (let k = 0; k < 2; k++) {
      const a = list[Math.floor(r() * list.length)], b = list[Math.floor(r() * list.length)];
      if (a !== b) edges.push([a, b]);
    }
  };
  for (let si = 0; si < spec.sides.length; si++) tree(chambers.filter(c => c.side === si));
  const wars = chambers.filter(c => c.role === 'war');
  if (wars.length) {
    tree(wars);
    for (const w of wars) for (let si = 0; si < spec.sides.length; si++) {
      const mine = chambers.filter(c => c.side === si && c.role !== 'queen');
      mine.sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y));
      if (mine[0]) edges.push([w, mine[0]]);
    }
  }
  for (const [a, b] of edges) {
    const pts = [[a.x, a.y]];
    for (let k = 1; k <= 2; k++) {
      const t = k / 3;
      pts.push([a.x + (b.x - a.x) * t + (r() - 0.5) * 9, a.y + (b.y - a.y) * t + (r() - 0.5) * 7]);
    }
    pts.push([b.x, b.y]);
    const rad = 1.35 + r() * 0.5;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, rad, rad);
      }
    }
  }
  // Reachability from the first way in; anything else is filled back in.
  const seen = new Uint8Array(W * H);
  const stack = [at(entries[0].tx, entries[0].ty)];
  if (!g[stack[0]]) disc(entries[0].tx, entries[0].ty, 2, 2);
  seen[stack[0]] = 1;
  while (stack.length) {
    const k = stack.pop(); const x = k % W, y = (k - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nk = at(x + dx, y + dy);
      if (seen[nk] || !g[nk]) continue;
      seen[nk] = 1; stack.push(nk);
    }
  }
  for (let i = 0; i < g.length; i++) if (g[i] && !seen[i]) g[i] = 0;
  // The edge: a floor tile with rock on any of its eight sides.
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!g[at(x, y)]) continue;
    for (let dy = -1; dy <= 1 && g[at(x, y)] === 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!g[at(x + dx, y + dy)]) { g[at(x, y)] = 2; break; }
    }
  }
  return { grid: g, w: W, h: H, chambers, entries };
}

const GRID_CACHE = new Map();
export function hiveGrid(id) {
  let v = GRID_CACHE.get(id);
  if (!v) { v = buildHiveGrid(id); GRID_CACHE.set(id, v); }
  return v;
}

/** What the props of each chamber role are (keys of NEST_ART), and the packs that hold it (family role, count). */
const ROLE_DRESS = {
  entry:     { props: ['dirt_rubble', 'shed_carapace'], packs: [['worker', 2, 3]] },
  queen:     { props: ['egg_pile_resin', 'egg_cluster', 'egg_cluster', 'larva_cells', 'egg_single', 'egg_hatched', 'PILLAR', 'PILLAR'], packs: [['soldier', 2, 2]] },
  nursery:   { props: ['egg_cluster', 'egg_single', 'egg_single', 'egg_hatched', 'larva_cells', 'egg_pile_resin'], packs: [['grub', 5, 8], ['worker', 1, 2]] },
  garden:    { props: ['fungus_garden', 'fungus_garden', 'food_cache', 'POOL'], packs: [['worker', 3, 5]] },
  stores:    { props: ['food_cache', 'food_cache', 'PILLAR', 'dirt_rubble'], packs: [['worker', 2, 4], ['grub', 2, 3]] },
  graveyard: { props: ['bones_pile', 'skull_pile', 'skeleton_remains', 'shed_carapace', 'shed_carapace'], packs: [['worker', 2, 3], ['soldier', 1, 1]] },
  barracks:  { props: ['shed_carapace', 'dirt_rubble', 'PILLAR'], packs: [['soldier', 2, 4], ['worker', 1, 2]] },
  war:       { props: ['bones_pile', 'skull_pile', 'shed_carapace', 'shed_carapace', 'dirt_rubble', 'collapsed_entrance'], packs: [] },
};
const rolePick = (kind, key) => key === 'PILLAR' ? (kind === 'termite' ? 'resin_column' : 'tunnel_pillar')
  : key === 'POOL' ? (kind === 'termite' ? 'fungus_garden' : 'honeydew_pool') : key;

/**
 * Everything that stands in a hive, in HIVE-LOCAL tiles, deterministic from the hive id. Every point is taken from
 * the floor the grid already proved reachable, and a blocking prop is refused if it would seal off any floor --
 * the promise caveShapes.js and astral.js keep, checked the same way (`hiveFaults`).
 */
export function hiveContents(id) {
  const spec = HIVES[id];
  const G = hiveGrid(id);
  if (!spec || !G) return null;
  const { grid: g, w: W, h: H } = G;
  const r = hiveRng(`hive-contents|${id}`);
  const at = (x, y) => y * W + x;
  const taken = new Set();
  const blocked = new Uint8Array(W * H);
  const props = [], groups = [], queens = [], exits = [];
  const keyOf = (family, shade) => family + shade.charAt(0).toUpperCase() + shade.slice(1);
  const floorIn = (c, inner = 0.8) => {
    const out = [];
    for (let y = Math.floor(c.y - c.ry); y <= Math.ceil(c.y + c.ry); y++) for (let x = Math.floor(c.x - c.rx); x <= Math.ceil(c.x + c.rx); x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      const dx = (x - c.x) / c.rx, dy = (y - c.y) / c.ry;
      if (dx * dx + dy * dy > inner) continue;
      if (g[at(x, y)] && !taken.has(at(x, y))) out.push([x, y]);
    }
    return out;
  };
  const edgeIn = (c) => {
    const out = [];
    for (let y = Math.floor(c.y - c.ry - 1); y <= Math.ceil(c.y + c.ry + 1); y++) for (let x = Math.floor(c.x - c.rx - 1); x <= Math.ceil(c.x + c.rx + 1); x++) {
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      if (g[at(x, y)] === 2 && !taken.has(at(x, y))) out.push([x, y]);
    }
    return out;
  };
  // Would blocking this tile cut any floor off from the first way in?
  const sealsOff = (k) => {
    blocked[k] = 1;
    const seen = new Uint8Array(W * H);
    const s0 = at(G.entries[0].tx, G.entries[0].ty);
    const stack = [s0]; seen[s0] = 1; let n = 1;
    while (stack.length) {
      const q = stack.pop(); const x = q % W, y = (q - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = at(x + dx, y + dy);
        if (seen[nk] || !g[nk] || blocked[nk]) continue;
        seen[nk] = 1; n++; stack.push(nk);
      }
    }
    let floor = 0;
    for (let i = 0; i < g.length; i++) if (g[i] && !blocked[i]) floor++;
    if (n < floor) { blocked[k] = 0; return true; }
    return false;
  };
  const place = (key, x, y) => {
    const solid = !!(NEST_ART[key] && NEST_ART[key].solid);
    const k = at(x, y);
    if (solid && sealsOff(k)) return false;
    taken.add(k);
    // keep a one-tile berth around a prop so the next does not stand inside it
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) taken.add(at(x + dx, y + dy));
    props.push({ key, tx: x, ty: y, solid });
    return true;
  };
  // The ways out, first: a hole in the floor where each way in arrives.
  for (const e of G.entries) {
    exits.push({ side: e.side, tx: e.tx, ty: e.ty });
    taken.add(at(e.tx, e.ty));
    props.push({ key: 'tunnel_hole_floor', tx: e.tx, ty: e.ty + 1, solid: false, exit: true, side: e.side });
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) taken.add(at(e.tx + dx, e.ty + dy));
  }
  for (const c of G.chambers) {
    const side = c.side >= 0 ? spec.sides[c.side] : null;
    const kind = side ? side.kind : 'ant';
    const dress = ROLE_DRESS[c.role] || ROLE_DRESS.stores;
    // decoration: low things in the chamber's middle, blocking things toward its wall
    for (const raw of dress.props) {
      const key = rolePick(kind, raw);
      const solid = NEST_ART[key] && NEST_ART[key].solid;
      const pool = solid ? (edgeIn(c).length ? edgeIn(c) : floorIn(c)) : floorIn(c, 0.7);
      for (let t = 0; t < 8 && pool.length; t++) {
        const [x, y] = pool.splice(Math.floor(r() * pool.length), 1)[0];
        if (place(key, x, y)) break;
      }
    }
    if (c.role === 'war') {
      // the breach where one colony's gallery broke into the other's
      const pool = edgeIn(c);
      if (pool.length) { const [x, y] = pool[Math.floor(r() * pool.length)]; place('tunnel_hole_wall', x, y); }
    }
    const spot = () => {
      const pool = floorIn(c, 0.6);
      return pool.length ? pool[Math.floor(r() * pool.length)] : [Math.round(c.x), Math.round(c.y)];
    };
    const shadeFor = (s) => s.shades[r() < 0.65 ? 0 : 1];
    const packFor = (s, role, lo, hi, chamberRole) => {
      const fam = HIVE_LINE[s.kind][['grub', 'worker', 'soldier', 'queen'].indexOf(role)];
      const [x, y] = spot();
      groups.push({ side: spec.sides.indexOf(s), kind: s.kind, role, chamber: chamberRole, key: keyOf(fam, shadeFor(s)),
        tx: x, ty: y, count: lo + Math.floor(r() * (hi - lo + 1)) });
    };
    if (c.role === 'queen') {
      const fam = HIVE_LINE[side.kind][3];
      queens.push({ side: c.side, kind: side.kind, key: keyOf(fam, side.shades[0]), tx: Math.round(c.x), ty: Math.round(c.y) });
    }
    if (c.role === 'war') {
      // both colonies in every war chamber: soldiers and workers, facing each other across it
      for (const s of spec.sides) { packFor(s, 'soldier', 2, 3, 'war'); packFor(s, 'worker', 2, 3, 'war'); }
      continue;
    }
    for (const [role, lo, hi] of dress.packs) packFor(side, role, lo, hi, c.role);
  }
  // A sealed gallery somewhere at a dead end of each side: the colony walled something off.
  for (let si = 0; si < spec.sides.length; si++) {
    const cands = G.chambers.filter(c => c.side === si && c.role !== 'queen' && c.role !== 'entry');
    const c = cands[Math.floor(r() * cands.length)];
    if (!c) continue;
    const pool = edgeIn(c);
    for (let t = 0; t < 10 && pool.length; t++) {
      const [x, y] = pool.splice(Math.floor(r() * pool.length), 1)[0];
      if (place('sealed_entrance', x, y)) break;
    }
  }
  return { props, groups, queens, exits };
}
const CONTENT_CACHE = new Map();
export function hiveContentsFor(id) {
  let v = CONTENT_CACHE.get(id);
  if (!v) { v = hiveContents(id); CONTENT_CACHE.set(id, v); }
  return v;
}

/** The checks: every family has art, shades and stats; every hive's floor is one connected place, holds a queen per
 *  colony, puts each colony's monsters only in its own colourings, and keeps every blocking prop from sealing
 *  anything; the war hive has both colonies meeting in the middle; nothing is above gold. */
export function hiveFaults() {
  const out = [];
  for (const f of HIVE_FAMILY_KEYS) {
    if (!HIVE_ART[f] || HIVE_ART[f].shades.length !== 9) out.push(`${f}: art row`);
    for (const s of HIVE_SHADES[HIVE_FAMILIES[f].kind]) if (!hiveVariantStats(f, s)) out.push(`${f}${s}: no stats`);
  }
  for (const h of HIVE_LIST) {
    for (const s of h.sides) {
      if (s.shades.length < 1 || s.shades.length > 2) out.push(`${h.id}: ${s.kind} has ${s.shades.length} colourings`);
      for (const sh of s.shades) if (!HIVE_SHADES[s.kind].includes(sh)) out.push(`${h.id}: no ${s.kind} colouring ${sh}`);
      for (const m of s.mounds) if (!NEST_ART[moundKey(s.kind, m)] || !NEST_ART[entranceKey(s.kind, m)]) out.push(`${h.id}: no ${s.kind} mound ${m}`);
      if (s.tier + 1 > 4) out.push(`${h.id}: its queen would be above gold`);
    }
    const G = hiveGrid(h.id), C = hiveContentsFor(h.id);
    if (!G || !C) { out.push(`${h.id}: no grid`); continue; }
    if (C.queens.length !== h.sides.length) out.push(`${h.id}: ${C.queens.length} queens for ${h.sides.length} colonies`);
    if (C.exits.length !== h.sides.length) out.push(`${h.id}: ${C.exits.length} ways out`);
    for (const gr of C.groups) {
      const s = h.sides[gr.side];
      if (!s.shades.some(sh => gr.key.toLowerCase().endsWith(sh))) out.push(`${h.id}: ${gr.key} is not this colony's colouring`);
      if (!G.grid[gr.ty * G.w + gr.tx]) out.push(`${h.id}: a pack stands in rock at ${gr.tx},${gr.ty}`);
    }
    if (h.war) {
      const sides = new Set(C.groups.filter(g => g.chamber === 'war').map(g => g.kind));
      if (sides.size !== 2) out.push(`${h.id}: the war chambers do not hold both colonies`);
    }
    // connectivity with every solid prop in place
    const blocked = new Set(C.props.filter(p => p.solid).map(p => p.ty * G.w + p.tx));
    const seen = new Uint8Array(G.grid.length);
    const s0 = G.entries[0].ty * G.w + G.entries[0].tx;
    const stack = [s0]; seen[s0] = 1; let n = 1;
    while (stack.length) {
      const q = stack.pop(); const x = q % G.w, y = (q - x) / G.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = (y + dy) * G.w + x + dx;
        if (seen[nk] || !G.grid[nk] || blocked.has(nk)) continue;
        seen[nk] = 1; n++; stack.push(nk);
      }
    }
    let floor = 0;
    for (let i = 0; i < G.grid.length; i++) if (G.grid[i] && !blocked.has(i)) floor++;
    if (n !== floor) out.push(`${h.id}: ${floor - n} floor tiles cannot be reached`);
    for (const e of G.entries) if (!seen[e.ty * G.w + e.tx]) out.push(`${h.id}: a way in is sealed`);
  }
  return out;
}

/** Census for the notes and the suite. */
export function hiveCensus() {
  const out = {};
  for (const h of HIVE_LIST) {
    const G = hiveGrid(h.id), C = hiveContentsFor(h.id);
    let floor = 0;
    for (let i = 0; i < G.grid.length; i++) if (G.grid[i]) floor++;
    out[h.id] = { floor, chambers: G.chambers.length, props: C.props.length, packs: C.groups.length,
      monsters: C.groups.reduce((a, g) => a + g.count, 0) + C.queens.length };
  }
  return out;
}
