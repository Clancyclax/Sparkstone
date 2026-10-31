// ============================================================================
// ROUND 420 -- WHICH HOUSE GOES WHERE. Pure rules; the scene side is src/scenes/houses420Mixin.js.
//
// The user: "Pick styles to suit each region (e.g. roman/greek in warm southern towns, victorian in the larger
// cities, medieval in villages and the countryside, lightly magical sprinkled sparingly). Avoid two identical houses
// side by side." / "Cabins don't belong in cities, tree houses and stilts dont either. Place buildings as appropriate
// to the region and utilize the additional variation to further diversify the cities."
//
// Every house the town sheet would have drawn asks `pickHouse420` first. It answers with one of the 92 new models
// and one of its eight colourings, or with null -- "keep the old pool house" -- for the share of each region's old
// houses that still suit it (the pool's roman and greek rows in the warm south, its stone rows in the north).
//
// TIERS. `city` is a walled city of radius 40 or more (Cadence, Harrowmoor, Karsk Landing, Vashra); `town` is any
// other city or town, the bandit cities included; `village` a village or hamlet; `rural` a house that belongs to no
// settlement -- a farm, a steading, Cadence's outline houses past the wall.
// ============================================================================
import { HOUSE420 } from './houseArt420.js';

export const H420_TIERS = ['city', 'town', 'village', 'rural'];

/** Style weights, per region and tier. A style missing from a list is not built there. */
export const H420_REGION_STYLES = {
  // The Nek: grasslands and forest around Cadence -- the home counties.
  nek: {
    city: { victorian: 3, georgian: 2.2, tudor: 2, medieval: 1.6, gothic: 1, regency: 1, baroque: 0.8, dutch: 0.8, watchman: 0.4, elven: 0.25, 'lightly magical': 0.35 },
    town: { tudor: 2.5, medieval: 2.5, georgian: 1, victorian: 1, dutch: 1, gothic: 0.6, watchman: 0.5, 'lightly magical': 0.35 },
    village: { medieval: 4, tudor: 2.5, crofter: 1.2, celtic: 0.8, dutch: 1, halfling: 0.4, elven: 0.3, 'lightly magical': 0.45 },
    rural: { medieval: 4, tudor: 2, crofter: 1.5, celtic: 1, dutch: 1, halfling: 0.5, 'lightly magical': 0.5 },
  },
  // Ontaria: oceanside forest and plain, cities in the north-west, villages on the water.
  ontaria: {
    city: { victorian: 3, dutch: 2.4, georgian: 2, gothic: 1.4, tudor: 1, regency: 0.8, baroque: 0.6, watchman: 0.4, 'lightly magical': 0.3 },
    town: { dutch: 2.5, tudor: 2, medieval: 2, victorian: 1, georgian: 0.8, watchman: 0.4, 'lightly magical': 0.3 },
    village: { norse: 2, dutch: 2, medieval: 2.5, crofter: 1.5, celtic: 1, lake: 0.8, 'lightly magical': 0.4 },
    rural: { medieval: 3, dutch: 2, crofter: 2, norse: 1.5, celtic: 1, 'lightly magical': 0.4 },
  },
  // Elehyd: badlands and icy peaks.
  elehyd: {
    city: { alpine: 3, dwarf: 2.2, gothic: 1.5, slavic: 1.5, medieval: 1.4, watchman: 1, 'lightly magical': 0.25 },
    town: { alpine: 3, dwarf: 2, slavic: 1.5, medieval: 1.2, watchman: 1, norse: 1 },
    village: { alpine: 3, norse: 3, russian: 1.6, slavic: 1.5, dwarf: 1, crofter: 1, 'lightly magical': 0.3 },
    rural: { alpine: 3, norse: 3, russian: 2, slavic: 1, crofter: 1 },
  },
  // Bratugal: jungle, rainforest and swamp round Vashra.
  bratugal: {
    city: { indian: 3.2, chinese: 2, japanese: 1.6, moorish: 1.4, korean: 1, byzantine: 1, ottoman: 1, persian: 1, venetian: 0.8, 'lightly magical': 0.3 },
    town: { indian: 3, japanese: 1.5, chinese: 1.5, moorish: 1, ottoman: 1 },
    village: { indian: 2, swamp: 2, stilt: 2, lake: 1.5, treehouse: 1.4, japanese: 1.2, chinese: 1, elven: 0.4, 'lightly magical': 0.4 },
    rural: { swamp: 2, stilt: 1.8, treehouse: 1.5, lake: 1.5, indian: 1.5, japanese: 1 },
  },
  // Sirukh Sands: a hot island of dunes and salt pan -- the warm south.
  sirukh: {
    city: { greek: 4, roman: 3, moorish: 2, egypt: 1.5, riad: 1, persian: 1, ottoman: 1, byzantine: 1, spanish: 1, portuguese: 1, italian: 0.6 },
    town: { greek: 4, roman: 3, moorish: 1.6, egypt: 1.2, riad: 1, spanish: 0.8, portuguese: 0.8, byzantine: 0.6 },
    village: { greek: 3, desert: 3, egypt: 2, riad: 1, moorish: 1, roman: 1 },
    rural: { desert: 3, greek: 2, egypt: 2, riad: 1, roman: 1 },
  },
  // The Cinderwaste: ash plains and lava below Elehyd -- stone and soot.
  cinder: {
    city: { dwarf: 3, gothic: 2, medieval: 2, watchman: 1.5, byzantine: 0.6, roman: 0.8 },
    town: { dwarf: 3, gothic: 2, medieval: 2, watchman: 1.5, roman: 0.8 },
    village: { dwarf: 2, medieval: 2, watchman: 1, crofter: 1, egypt: 1, desert: 1 },
    rural: { dwarf: 2, medieval: 2, crofter: 1, desert: 1 },
  },
  // Ixcuatl: a stepped city swallowed by jungle; the camps are an expedition's.
  ixcuatl: {
    city: { spanish: 2, hacienda: 2, portuguese: 2, italian: 1.2, roman: 1, venetian: 0.6 },
    town: { spanish: 2, hacienda: 2, portuguese: 2, italian: 1.2, roman: 1 },
    village: { hacienda: 3, spanish: 2, portuguese: 2, italian: 2, swamp: 1, treehouse: 0.6, stilt: 0.5 },
    rural: { hacienda: 3, italian: 2, spanish: 1.5, portuguese: 1.5, swamp: 1, treehouse: 0.6 },
  },
};

/** How many of each region's old pool houses stay (when their family suits the region), per tier. */
export const H420_KEEP_OLD = {
  nek: { city: 0.3, town: 0.35, village: 0.3, rural: 0.3 },
  ontaria: { city: 0.3, town: 0.3, village: 0.25, rural: 0.25 },
  elehyd: { city: 0.2, town: 0.2, village: 0.15, rural: 0.15 },
  bratugal: { city: 0.1, town: 0.1, village: 0.05, rural: 0.05 },
  sirukh: { city: 0.35, town: 0.35, village: 0.25, rural: 0.2 },
  cinder: { city: 0.3, town: 0.3, village: 0.25, rural: 0.2 },
  ixcuatl: { city: 0.2, town: 0.2, village: 0.15, rural: 0.15 },
};

/** Which old pool families suit each region (TOWN_POOL_ROWS name prefixes). */
export const H420_OLD_FAMILIES = {
  nek: ['roman', 'greek', 'stone_b', 'stone_c', 'stone_d'],
  ontaria: ['roman', 'greek', 'stone_b', 'stone_c', 'stone_d'],
  elehyd: ['stone_b', 'stone_c', 'stone_d'],
  bratugal: ['roman', 'greek'],
  sirukh: ['roman', 'greek'],
  cinder: ['stone_b', 'stone_c', 'stone_d', 'roman'],
  ixcuatl: ['roman', 'greek', 'stone_c'],
};

/** At most one lightly-magical house in this many, per settlement -- "sprinkled sparingly". */
export const H420_MAGIC_ONE_IN = 14;
/** No two of the same model closer than this, in tiles -- "avoid two identical houses side by side". */
export const H420_SAME_MODEL_TILES = 20;
/** No two of the same old pool row closer than this, in tiles. */
export const H420_SAME_OLD_TILES = 9;

const IDS = Object.keys(HOUSE420);
const BY_STYLE = {};
for (const id of IDS) (BY_STYLE[HOUSE420[id].style] = BY_STYLE[HOUSE420[id].style] || []).push(id);
export const H420_BY_STYLE = BY_STYLE;

/** The drawn width on screen, px: the bbox at the door-matched scale. */
export function h420Width(id) {
  const h = HOUSE420[id];
  return h ? (h.bbox[2] - h.bbox[0]) * h.scale : 0;
}
/**
 * The widest house a lot may take, screen px. The old pool's houses draw 230-300 px wide and every city's lots were
 * laid out for them; a door-matched new house can come out at 400 (a courtyard house, a longhouse), so the widest
 * stay out of the packed streets and terraces and stand where there is room.
 */
export const H420_MAX_W = { city: 340, town: 340, village: 400, rural: 420, dense: 285 };

/** May this model stand in a settlement of this tier? Cabins, stilts, tree houses and the rest stay out of towns. */
export function h420Allowed(id, tier, maxW = Infinity) {
  const h = HOUSE420[id];
  if (!h) return false;
  if (h420Width(id) > maxW) return false;
  if ((tier === 'city' || tier === 'town') && !h.city) return false;
  if ((tier === 'village' || tier === 'rural') && !h.rural) return false;
  return true;
}

/** The weighted style list for a region and tier (falls back to the Nek's). */
export function h420Styles(regionId, tier) {
  const r = H420_REGION_STYLES[regionId] || H420_REGION_STYLES.nek;
  return r[tier] || r.town;
}

/** Does an old pool row (by its TOWN_POOL_ROWS name) suit this region? Shop fronts (`sign_*`) always stay. */
export function h420OldSuits(regionId, rowName) {
  if (!rowName) return false;
  if (rowName.startsWith('sign_')) return true;
  return (H420_OLD_FAMILIES[regionId] || H420_OLD_FAMILIES.nek).some(f => rowName.startsWith(f + '_'));
}

/**
 * Pick a model and a colouring. `rng` is a 0-1 function; `avoid` the set of model ids standing too close to repeat;
 * `magicLeft` false when this settlement has had its share of lightly-magical houses. Returns { id, variant } or null.
 */
export function pickHouse420(regionId, tier, rng, avoid = new Set(), magicLeft = true, maxW = H420_MAX_W[tier] || Infinity) {
  const styles = h420Styles(regionId, tier);
  const opts = [];
  let total = 0;
  for (const [style, w] of Object.entries(styles)) {
    if (style === 'lightly magical' && !magicLeft) continue;
    const ids = (BY_STYLE[style] || []).filter(id => h420Allowed(id, tier, maxW));
    const free = ids.filter(id => !avoid.has(id));
    if (!free.length) continue;
    opts.push([style, w, free]);
    total += w;
  }
  if (!opts.length) return null;
  let t = rng() * total;
  let pick = opts[opts.length - 1];
  for (const o of opts) { t -= o[1]; if (t <= 0) { pick = o; break; } }
  const ids = pick[2];
  const id = ids[Math.floor(rng() * ids.length) % ids.length];
  return { id, variant: Math.floor(rng() * 8) % 8, style: pick[0] };
}
