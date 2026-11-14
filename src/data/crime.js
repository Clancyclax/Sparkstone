// ===========================================================================
// ROUND 425 -- CRIME: THE RULES (pure; crimeMixin.js is the world).
//
//   "Houses locked at night; iron rank can bash doors; nearby NPCs summon guards to arrest. NPCs upset at night
//    entry, escalating to fetching guards. Shady merchants sell lockpicking skill books (also for locked barriers and
//    chests). Nightstands and chests hold stealable items; ordinary vendors refuse them; ask around for a fence.
//    Getting caught brings the guards; a jail with cells in each city while a fine is set. Popup 'This is an owned
//    object, would you like to steal it?' with a 'Don't show this message again' checkbox. Stolen items shown red in
//    the inventory; stealth abilities help. Houses hold mostly general items, rarely something valuable. Aristocratic
//    estates have valuable items (essences, awakening stones, weapons, trinkets, gear) and their own guards inside and
//    out who kill rather than jail; estates send adventurers, possibly a rank above the region, instead of guards. A
//    good reputation brings a 'take whatever you need' offer. Infamy, or being a full rank ahead of the region (e.g.
//    Silver in the Nek), makes people too afraid to call the guards."
//
// Everything here is a number or a table with no scene in it, so the suite can ask the rules directly.
// ===========================================================================
import { RANK_ORDER } from './ranks.js';
import { REGION_HUNTER_RANK } from './hunters.js';

// ---------------------------------------------------------------- the clock
/** A house is locked from 22:00 to 06:00 -- the hours its people are asleep (homeDress422 isSleepHour). */
export const LOCK_FROM = 22, LOCK_TO = 6;
export const isLockedHour = (h) => h >= LOCK_FROM || h < LOCK_TO;

// ---------------------------------------------------------------- the player's record
/** The crime record on the player (saved as `player.crime`). Normalised here so an old save reads as a clean slate. */
export function crimeOf(player) {
  const c = (player.crime && typeof player.crime === 'object') ? player.crime : (player.crime = {});
  if (!c.stolen || typeof c.stolen !== 'object') c.stolen = {};       // 'kind:id' -> how many of that are stolen
  if (!c.notoriety || typeof c.notoriety !== 'object') c.notoriety = {};   // regionId -> number
  if (!c.wanted || typeof c.wanted !== 'object') c.wanted = {};       // regionId -> { settlement, name, fine, lethal, estate, day }
  if (!c.searched || typeof c.searched !== 'object') c.searched = {}; // container key -> day searched
  if (!c.forced || typeof c.forced !== 'object') c.forced = {};       // house key -> day its door was forced or picked
  if (!Number.isFinite(c.thefts)) c.thefts = 0;
  if (!Number.isFinite(c.jailed)) c.jailed = 0;
  return c;
}

/** Total notoriety across every region: "infamy". */
export function infamyOf(player) {
  const n = crimeOf(player).notoriety;
  return Object.values(n).reduce((s, v) => s + (Number(v) || 0), 0);
}
/** Infamy at which people are too afraid of you to call anyone. */
export const INFAMY_FEARED = 30;

/** How far the player's rank stands above the region's (its hunters' rank: Nek iron ... Ixcuatl gold). */
export function rankLead(playerRank, regionId) {
  const pi = Math.max(0, RANK_ORDER.indexOf(playerRank || 'normal'));
  const ri = Math.max(0, RANK_ORDER.indexOf(REGION_HUNTER_RANK[regionId] || 'iron'));
  return pi - ri;
}
/** "Infamy, or being a full rank ahead of the region, makes people too afraid to call the guards." */
export function tooAfraidToReport(player, regionId) {
  return rankLead(player.rank, regionId) >= 1 || infamyOf(player) >= INFAMY_FEARED;
}

/** A good name in this place: a known adventurer (the street's fame tier 2+: iron with two Society stars, or bronze
 *  and up) with no notoriety in the region. Such a person, caught helping themselves, is told to take what they need. */
export function welcomeToTake(fameTier, notorietyHere) {
  return fameTier >= 2 && !(notorietyHere > 0);
}

// ---------------------------------------------------------------- noise and being seen
/** How likely each act is to wake one sleeper in the same room (before stealth). */
export const WAKE_CHANCE = { force: 0.75, pick: 0.08, pickFail: 0.35, steal: 0.12, strongbox: 0.3 };
/** Stealth (an active veil) cuts the chance of being heard or noticed to this share; the veil's aggro multiplier and
 *  the Cloak of Night / hidden nature then scale it further (`_playerAggroMult`). */
export const STEALTH_NOTICE = 0.25;
/** Chance a sleeper wakes for an act, given the player's stealth state. */
export function wakeChance(act, stealthed, aggroMult = 1) {
  const base = WAKE_CHANCE[act] ?? 0.1;
  const m = (stealthed ? STEALTH_NOTICE : 1) * Math.max(0.15, Math.min(1.5, aggroMult || 1));
  return Math.max(0, Math.min(1, base * m));
}
/** An awake resident in the same room notices a theft unless veiled; a veiled thief is noticed only this often. */
export const SEEN_WHILE_VEILED = 0.2;
/** Lockpicking: chance a lock opens, by the player's rank index (normal .. diamond). */
export const PICK_SUCCESS = [0.6, 0.75, 0.85, 0.92, 0.97, 1];
export function pickChance(playerRank) {
  return PICK_SUCCESS[Math.max(0, RANK_ORDER.indexOf(playerRank || 'normal'))] ?? 0.6;
}
/** Forcing a door takes an iron-ranked body. */
export function canForce(playerRank) { return RANK_ORDER.indexOf(playerRank || 'normal') >= RANK_ORDER.indexOf('iron'); }

// ---------------------------------------------------------------- escalation
/** Seconds an awake resident tolerates you standing in their house at night after telling you to leave. */
export const UPSET_GRACE_S = 6;
/** What a resident says, by step. */
export const RESIDENT_LINES = {
  upset: ['What are you doing in my house?!', 'Who\'s there? Get out!', 'You\'ve no business in here. Out!'],
  guards: ['Guards! Guards! Thief!', 'Help! Someone fetch the watch!', 'Thief! Call the guard!'],
  afraid: ['I— I didn\'t see anything. Take it. Just go.', 'Please. Take what you want. I won\'t tell anyone.', 'Don\'t hurt us. We never saw you.'],
  welcome: ['You? Oh — take whatever you need, friend. You\'ve done enough for this city.', 'For you? Take what you need. Just leave the cradle.', 'Help yourself. The Society\'s finest is welcome here.'],
  estate: ['Intruder! Guards, to me!', 'Seize them! No one robs this house!', 'Thief in the house! Kill them!'],
  knock: ['You could have knocked!', 'Next time, knock.'],
};

// ---------------------------------------------------------------- the law
/** The fine for a crime, in normal coin (IRON_COIN = 100), by kind and the region's rank. */
export const FINE_BASE = { trespass: 300, force: 600, theft: 900, resist: 1500, estate: 4000, breakout: 2500, arson: 6000 };   // ROUND 428 -- a gaol broken open, a settlement set alight
export function fineFor(kind, regionId, stolenValue = 0) {
  const ri = Math.max(1, RANK_ORDER.indexOf(REGION_HUNTER_RANK[regionId] || 'iron'));
  const base = FINE_BASE[kind] ?? 500;
  return Math.round(base * ri + Math.max(0, stolenValue) * 1.5);
}
/** Hours in the cell, if the fine is not paid: one hour per 300 coin of fine, between 4 and 48. */
export function sentenceHours(fine) { return Math.max(4, Math.min(48, Math.round(fine / 300))); }
/** Notoriety each reported act adds in its region. */
export const NOTORIETY = { trespass: 1, force: 2, theft: 3, estate: 6, resist: 4, feared: 1, breakout: 5, arson: 8 };
/** Responders a city or town sends to a reported crime (walled cities also have their gate pairs). */
export const RESPONDERS = 2;
/** Seconds the responders search before giving up and going back to their posts. */
export const RESPONDER_SEARCH_S = 150;
/** A warrant lapses after this many days (one for resisting arrest or breaking out does not). */
export const WANTED_DAYS = 7;
/** A forced door is mended in a day; a searched container is restocked in three. */
export const RESTOCK_DAYS = 3;

// ---------------------------------------------------------------- fences and vendors
/** Shops that buy stolen goods: the dive taverns' fence, and the hooded trader behind Cadence's tavern. */
export const FENCE_SHOPS = new Set(['market_fence', 'market_shady']);
/** What a fence pays for stolen goods: half the honest price. */
export const FENCE_CUT = 0.5;
export const VENDOR_REFUSALS = [
  'I don\'t buy stolen goods. Try asking around the dives. I hear there\'s a man there who doesn\'t ask questions.',
  'Where did you get that? No. Not in my shop. Ask in the slums, if you must.',
  'That has somebody else\'s name on it. Take it to a fence, not to me.',
];

// ---------------------------------------------------------------- what is in a house
/**
 * ROUND 425 -- "When I say objects I mean like books, rings, keys, tools, not full pieces of furniture." THE OWNED
 * OBJECTS: the small things round 422 set out on tables, shelves and sills (interiors422.js SMALL_PROPS) can each be
 * picked up, and a nightstand or a chest holds more of the same. Each is a GOOD -- a carried thing with a name and a
 * worth and no other use, kept in its own bag (`inventory.goods`) and sold like anything else (to a fence, if it is
 * stolen). Light sources stay where they are (a lit candle is not pocketed); coin is coin.
 *   value is in normal coin (100 = one iron).
 */
export const HOUSE_GOODS = {
  book_closed: { name: 'Bound Book', value: 40, prop: 'book_closed' },
  book_stack: { name: 'Stack of Books', value: 90, prop: 'book_stack' },
  book_open: { name: 'Open Book', value: 35, prop: 'book_open' },
  scroll: { name: 'Scroll', value: 30, prop: 'scroll' },
  sealed_map: { name: 'Sealed Map', value: 160, prop: 'sealed_map' },
  papers: { name: 'Bundle of Papers', value: 15, prop: 'papers' },
  letter_quill: { name: 'Letters and Quill', value: 20, prop: 'letter_quill' },
  inkwell_quill: { name: 'Inkwell and Quill', value: 25, prop: 'inkwell_quill' },
  key_ring: { name: 'Ring of Keys', value: 45, prop: 'key_ring' },
  padlock: { name: 'Padlock', value: 30, prop: 'padlock' },
  pocket_watch: { name: 'Pocket Watch', value: 320, prop: 'pocket_watch' },
  compass: { name: 'Brass Compass', value: 180, prop: 'compass' },
  spectacles: { name: 'Spectacles', value: 90, prop: 'spectacles' },
  magnifier: { name: 'Magnifying Glass', value: 110, prop: 'magnifier' },
  hourglass: { name: 'Hourglass', value: 120, prop: 'hourglass' },
  hand_mirror: { name: 'Hand Mirror', value: 85, prop: 'hand_mirror' },
  hair_brush: { name: 'Hair Brush', value: 20, prop: 'hair_brush' },
  scales: { name: 'Merchant\'s Scales', value: 140, prop: 'scales' },
  goblet: { name: 'Silver Goblet', value: 150, prop: 'goblet' },
  tankard: { name: 'Pewter Tankard', value: 30, prop: 'tankard' },
  tea_cup: { name: 'Tea Cup', value: 15, prop: 'tea_cup' },
  teapot: { name: 'Teapot', value: 45, prop: 'teapot' },
  wooden_cup: { name: 'Wooden Cup', value: 5, prop: 'wooden_cup' },
  clay_mug: { name: 'Clay Mug', value: 5, prop: 'clay_mug' },
  clay_jug: { name: 'Clay Jug', value: 10, prop: 'clay_jug' },
  cutlery: { name: 'Cutlery', value: 35, prop: 'cutlery' },
  cheese_knife: { name: 'Cheese Knife', value: 15, prop: 'cheese_knife' },
  salt_jar: { name: 'Salt Jar', value: 25, prop: 'salt_jar' },
  mortar_pestle: { name: 'Mortar and Pestle', value: 40, prop: 'mortar_pestle' },
  hand_bell: { name: 'Hand Bell', value: 30, prop: 'hand_bell' },
  sewing_box: { name: 'Sewing Box', value: 35, prop: 'sewing_box' },
  yarn_needles: { name: 'Yarn and Needles', value: 15, prop: 'yarn_needles' },
  tool_box: { name: 'Box of Tools', value: 70, prop: 'tool_box' },
  small_chest: { name: 'Small Keepsake Chest', value: 130, prop: 'small_chest' },
  playing_cards: { name: 'Deck of Cards', value: 20, prop: 'playing_cards' },
  dice_cup: { name: 'Dice Cup', value: 15, prop: 'dice_cup' },
  pipe: { name: 'Carved Pipe', value: 25, prop: 'pipe' },
  toy_horse: { name: 'Toy Horse', value: 10, prop: 'toy_horse' },
  dried_flowers: { name: 'Dried Flowers', value: 5, prop: 'dried_flowers' },
  potted_herb: { name: 'Potted Herb', value: 10, prop: 'potted_herb' },
  skull: { name: 'Curio Skull', value: 60, prop: 'skull' },
  potion_red: { name: 'Small Red Phial', value: 50, prop: 'potion_red' },
  potion_blue: { name: 'Small Blue Phial', value: 50, prop: 'potion_blue' },
  bread_loaf: { name: 'Loaf of Bread', value: 4, prop: 'bread_loaf' },
  basket_bread: { name: 'Basket of Bread', value: 10, prop: 'basket_bread' },
  basket_apples: { name: 'Basket of Apples', value: 10, prop: 'basket_apples' },
  cheese_board: { name: 'Cheese Board', value: 15, prop: 'cheese_board' },
  // kept in drawers and chests (no table piece of their own)
  plain_ring: { name: 'Plain Ring', value: 60 },
  silver_ring: { name: 'Silver Ring', value: 220 },
  gold_ring: { name: 'Gold Ring', value: 480 },
  locket: { name: 'Locket', value: 260 },
  prayer_beads: { name: 'Prayer Beads', value: 45 },
  chisel: { name: 'Chisel', value: 25 },
  hammer: { name: 'Claw Hammer', value: 30 },
  whetstone: { name: 'Whetstone', value: 20 },
  house_key: { name: 'House Key', value: 10 },
};
/** A table piece that is coin: picked up as coin (normal), between these. */
export const COIN_PROPS = { coin_stacks: [30, 120], coin_pouch: [40, 160], coin_purse: [60, 220] };
/** The small table piece -> the good it becomes (null: not taken -- lights, laid meals, empty baskets). */
export function goodForProp(key) {
  if (COIN_PROPS[key]) return 'coin';
  return HOUSE_GOODS[key] && HOUSE_GOODS[key].prop === key ? key : null;
}
/** What a nightstand or a chest holds in a house: the drawer things first. */
export const DRAWER_GOODS = ['plain_ring', 'silver_ring', 'locket', 'prayer_beads', 'house_key', 'key_ring', 'letter_quill', 'book_closed',
  'spectacles', 'pocket_watch', 'playing_cards', 'pipe', 'sewing_box', 'scroll', 'hand_mirror', 'hair_brush', 'dice_cup'];
export const CHEST_GOODS = ['chisel', 'hammer', 'whetstone', 'tool_box', 'yarn_needles', 'cutlery', 'book_stack', 'papers', 'candle_box',
  'small_chest', 'compass', 'hourglass', 'gold_ring', 'goblet'].filter(id => HOUSE_GOODS[id]);

/** Furniture that holds things, and the label it is searched by. FURN kind 'stand' (the nightstands) and these props. */
export const STASH_PROPS = {
  sideboard: 'the sideboard', writingDesk: 'the writing desk', jarShelves: 'the jar shelves', barrelStack: 'the barrels',
  crateProduce: 'the crates', sacks: 'the sacks', scrollStand: 'the scroll stand', amphora: 'the amphora',
  jewelCase: 'the jewel case', coinCase: 'the coin case', gemCase: 'the gem case',
};
/** Locked strongboxes: lockpicking opens them quietly; without it they are prised open, loudly. */
export const STRONGBOXES = new Set(['jewelCase', 'coinCase', 'gemCase']);
export const STAND_LABEL = 'the nightstand';

/**
 * What one container holds. `rng` is a 0..1 source. Returns a list of { kind, id?|item?, coin? }; the scene rolls gear
 * and weapons (they need its standing), so they come back as { kind: 'gear' } / { kind: 'weapon' } requests.
 *   house  -- "mostly general items, rarely something valuable": coin, food and potions, crafting stock; one in twelve
 *             a piece of gear, one in forty an awakening stone.
 *   estate -- "essences, awakening stones, weapons, trinkets, gear".
 */
export function stashRoll(where, klass, strongbox, rng, ids) {
  const out = [];
  const coin = (lo, hi) => out.push({ kind: 'coin', coin: Math.round(lo + rng() * (hi - lo)) });
  const pick = (arr) => arr && arr.length ? arr[Math.floor(rng() * arr.length) % arr.length] : null;
  if (where === 'estate') {
    coin(150, 900);
    const n = 1 + (rng() < 0.55 ? 1 : 0) + (strongbox ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const r = rng();
      if (r < 0.22) { const id = pick(ids.essences); if (id) out.push({ kind: 'essence', id }); }
      else if (r < 0.48) { const id = pick(ids.stones); if (id) out.push({ kind: 'stone', id }); }
      else if (r < 0.62) out.push({ kind: 'weapon' });
      else if (r < 0.82) out.push({ kind: 'gear', trinket: true });
      else out.push({ kind: 'gear' });
    }
    return out;
  }
  const rich = klass === 'well' ? 1.6 : klass === 'poor' ? 0.5 : 1;
  if (rng() < 0.6) coin(5 * rich, 60 * rich + (strongbox ? 120 : 0));
  // books, rings, keys, tools: what a drawer or a chest holds
  const pool = ids.goods || DRAWER_GOODS;
  const k = 1 + (rng() < 0.45 ? 1 : 0) + (strongbox ? 1 : 0);
  for (let i = 0; i < k; i++) {
    const r = rng();
    if (r < 0.82) { const id = pick(pool); if (id) out.push({ kind: 'goods', id }); }
    else { const id = pick(ids.consumables); if (id) out.push({ kind: 'consumable', id }); }
  }
  // rarely something valuable (better in a well-off house, and in a locked case)
  const v = rng();
  const gearOdds = (strongbox ? 0.25 : 1 / 12) * rich, stoneOdds = (strongbox ? 0.08 : 1 / 40) * rich;
  if (v < stoneOdds) { const id = pick(ids.stones); if (id) out.push({ kind: 'stone', id }); }
  else if (v < stoneOdds + gearOdds) out.push({ kind: 'gear', trinket: strongbox });
  return out;
}

/** The suite's fault list. */
export function crimeFaults() {
  const out = [];
  for (const r of Object.keys(REGION_HUNTER_RANK)) if (fineFor('theft', r) <= 0) out.push(`no fine in ${r}`);
  if (!(sentenceHours(fineFor('theft', 'ixcuatl', 5000)) <= 48)) out.push('sentence over 48 hours');
  if (rankLead('silver', 'nek') < 1) out.push('silver should lead the Nek');
  if (rankLead('iron', 'nek') !== 0) out.push('iron is the Nek\'s own rank');
  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const ids = { consumables: ['a'], stock: ['b'], parts: ['c'], stones: ['d'], essences: ['e'], goods: ['f'] };
  let estateGood = 0, houseGood = 0;
  for (let i = 0; i < 400; i++) {
    if (stashRoll('estate', 'well', false, rng, ids).some(x => x.kind !== 'coin')) estateGood++;
    if (stashRoll('house', 'modest', false, rng, ids).some(x => x.kind === 'gear' || x.kind === 'stone')) houseGood++;
  }
  if (estateGood < 380) out.push(`estates hold too little (${estateGood}/400)`);
  for (const id of [...DRAWER_GOODS, ...CHEST_GOODS]) if (!HOUSE_GOODS[id]) out.push(`no good ${id}`);
  for (const [id, g] of Object.entries(HOUSE_GOODS)) if (!(g.value > 0) || !g.name) out.push(`good ${id} has no worth or name`);
  if (houseGood > 60) out.push(`houses hold valuables too often (${houseGood}/400)`);
  return out;
}
