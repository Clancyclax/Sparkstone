// ROUND 303 -- WHAT THE ADVENTURE HALL SELLS, AND WHAT THE BANDIT TOWNS SELL THAT IT NEVER WILL.
//
//   "5) Essences and awakening stones in the adventure hall should change at
//    least daily. They should be more common/uncommon and adventure related
//    (never restricted)."
//   "6) In the bandit towns restricted essences should be for sale
//    semi-regularly."
//
// 5 SUPERSEDES ROUND 62. Round 62's ruling was "The adventurers guild inventory
// should be static 20 common essences, and 25 common awakening stones". It is
// not static any more: the clerk's shelf and the two relic brokers roll a seeded
// DAY, so a shelf is fixed until midnight and different tomorrow (the same
// trick the brokers have used since round 133). The counts stay at what round
// 62 set (20 essences, 25 stones for the clerk).
//
// "MORE COMMON/UNCOMMON" IS A WEIGHT, NOT A WALL. Common 6 : Uncommon 3 : Rare 1
// per draw, so most of a shelf is Common, a good third is Uncommon and a Rare is
// a lucky find, which is what "more common/uncommon" reads as. Epic and above
// never come out of a hall.
//
// "ADVENTURE RELATED" is the list below: what a person walking out of the
// Society's door into the wilds would reasonably carry -- arms, armour and
// tools, the beasts that are hunted, the weather and the ground, the senses and
// the footwork. The lists are of short names (essence `essSword` is 'sword',
// stone `stoneSword` is 'sword') so one line serves both catalogues.
//
// "NEVER RESTRICTED" is two filters: an essence the Society will not register
// (restricted.js's RESTRICTED_IDS -- Death, Corrupt) and the stones that carry
// the same names (Death, Corrupt, and the god-only Divine ones) are not in the
// pool whatever their rarity.
import { RESTRICTED_IDS } from './restricted.js';

const L = (s) => new Set(s.split(/\s+/).filter(Boolean));
// Arms, armour, tools and the road.
const KIT = 'adept armour axe bow cage chain cloth earth eye fire foot hammer hand hook hunt iron knife magic might net rake shield '
  + 'ship shovel sickle spear spike staff swift sword thread trap trowel vehicle water wheel whip wind sceptre fork';
// The beasts a hunter meets.
const BEASTS = 'ape bat bear bee bird cat cattle crocodile deer dog fox frog goat horse lizard locust monkey mouse pangolin rabbit rat '
  + 'shark skunk sloth snake spider turtle wasp whale wolf';
// Weather, ground and the things that grow.
const LAND = 'cloud cold dust ice lightning sand smoke plant tree fungus coral rain';
// Uncommon and Rare things an adventurer's pack would have.
const LORE = 'alchemy balance claw growth knowledge life light venom focus preparation reach vision antidote adventure '
  + 'resolute zeal gathering persistence';

export const HALL_NAMES = L(`${KIT} ${BEASTS} ${LAND} ${LORE}`);
export const HALL_RARITY_WEIGHT = { Common: 6, Uncommon: 3, Rare: 1 };
/** Stones that carry a restricted name or a god's, never stocked in a hall. */
const NEVER_STONE = new Set(['death', 'corrupt', 'undeath', 'dominion', 'war', 'peace', 'justice', 'healer', 'crops']);

const shortOf = (id) => String(id).replace(/^(ess|stone)/, '').toLowerCase();

/** Eligible essences, each with its draw weight. `catalog` is ESSENCE_CATALOG, `known` the ESSENCES that exist. */
export function hallEssencePool(ids, catalog, known = null) {
  const out = [];
  for (const id of ids) {
    if (RESTRICTED_IDS.includes(id)) continue;
    if (known && !known[id]) continue;
    const rarity = (catalog[id] && catalog[id].rarity) || 'Common';
    const w = HALL_RARITY_WEIGHT[rarity];
    if (!w || !HALL_NAMES.has(shortOf(id))) continue;
    out.push({ id, rarity, w });
  }
  return out;
}

export function hallStonePool(ids, catalog) {
  const out = [];
  for (const id of ids) {
    const c = catalog[id] || {};
    if (c.godOnly) continue;
    const rarity = c.rarity || 'Common';
    const w = HALL_RARITY_WEIGHT[rarity];
    const s = shortOf(id);
    if (!w || NEVER_STONE.has(s) || !HALL_NAMES.has(s)) continue;
    out.push({ id, rarity, w });
  }
  return out;
}

/** n distinct entries, weighted, drawn without replacement from `pool` with `rng`. */
export function drawWeighted(rng, pool, n) {
  const bag = pool.slice();
  const out = [];
  while (out.length < n && bag.length) {
    let tot = 0;
    for (const e of bag) tot += e.w;
    let r = rng() * tot, i = 0;
    for (; i < bag.length - 1; i++) { r -= bag[i].w; if (r < 0) break; }
    out.push(bag.splice(i, 1)[0]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE BANDIT TOWNS' BACK ROOM
// ---------------------------------------------------------------------------
/** A day in three, on average, a fence has a restricted essence under the counter. */
export const BANDIT_RESTRICTED_CHANCE = 0.34;
/** ...and it is dear: nobody else will sell it, and the town's half-again comes on top of this. */
export const BANDIT_RESTRICTED_PREMIUM = 1.5;

/** Which restricted essences a bandit city's fence has today: usually none, sometimes one, rarely both. `rng` is
 *  the day-and-city seeded stream, so the answer is the same for every counter in the town all day. */
export function banditRestrictedToday(rng) {
  if (rng() >= BANDIT_RESTRICTED_CHANCE) return [];
  const ids = RESTRICTED_IDS.slice();
  const first = ids.splice(Math.floor(rng() * ids.length), 1)[0];
  return rng() < 0.15 ? [first, ids[0]] : [first];
}
