// ===========================================================================
// ROUND 345 (item 2.1) -- THINGS THAT HAPPEN IN THE BACK ALLEYS.
//
//   "Some back alley locations in the city should have random events.
//    2.1.1 a thief who holds up the player forcing them to give up their money
//          or fight
//    2.1.2 A gang looking to recruit
//    2.1.3 an injured guard who needs healing either via an ability or a
//          potion"
//
// The alleys themselves are the two-tile gaps between terrace houses
// (WorldScene._placeCadenceTerraces records them in `_alleys`). This file is
// the PURE half: which alleys carry an event, of what kind, and what is said.
// The scene half -- standing the people up, the dialogue, the fight -- is
// alleyEventsMixin.js.
//
// RANDOM PER PLAYTHROUGH, FIXED WITHIN ONE. The plan is drawn from the run
// seed, so a new game finds the events in new alleys and a loaded game finds
// them in the same ones. Each fires once; what has happened is on the player
// (`player.alley`), which the save carries like any other plain field.
// ===========================================================================
import { seededRng } from './awakening.js';
import { COIN_RANKS } from './inventory.js';

export const ALLEY_EVENT_KINDS = ['thief', 'gang', 'guard'];
export const ALLEY_EVENT_COUNT = 12;
/** No two events within this many tiles of each other: "some", not "every". */
export const ALLEY_EVENT_APART_TILES = 22;

/**
 * Which alleys carry an event. `alleys` is a list of `{ cx, cy }` (world
 * units, the alley's middle); returns `[{ id, kind, x, y }]`, kinds dealt
 * round-robin from a seeded start so every kind turns up.
 */
export function planAlleyEvents(alleys, seed, count = ALLEY_EVENT_COUNT, apartTiles = ALLEY_EVENT_APART_TILES, tile = 32) {
  const rng = seededRng(`alleyEvents|${seed}`);
  const pool = (alleys || []).map((a) => ({ x: a.cx, y: a.cy }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [];
  const apart = apartTiles * tile;
  const start = Math.floor(rng() * ALLEY_EVENT_KINDS.length);
  for (const a of pool) {
    if (out.length >= count) break;
    if (out.some((e) => Math.hypot(e.x - a.x, e.y - a.y) < apart)) continue;
    const kind = ALLEY_EVENT_KINDS[(start + out.length) % ALLEY_EVENT_KINDS.length];
    out.push({ id: `alley${out.length}`, kind, x: Math.round(a.x), y: Math.round(a.y) });
  }
  return out;
}

// --- the hold-up -----------------------------------------------------------

/** A thief's price, in normal-coin units: two fifths of what you carry, never
 *  less than one iron coin, and never more than you have. Nothing to take,
 *  nothing demanded. */
export function thiefDemand(purseValue) {
  const have = Math.max(0, Math.floor(purseValue || 0));
  if (have <= 0) return 0;
  return Math.min(have, Math.max(100, Math.ceil(have * 0.4)));
}

export const THIEF_LINES = {
  stop: 'Evening. This is a short alley and I am a tall problem. Your purse, now, or we do this the loud way.',
  empty: 'You have nothing on you at all. Go on, then. Get out of my alley before I start to feel sorry for you.',
  paid: 'Sensible. Nobody bleeds. The alley will remember you kindly.',
  fight: 'Loud it is, then!',
  gangSpared: "...Those are the Saints' colours. My mistake, friend. Go on, go.",
};

// --- the gang --------------------------------------------------------------

export const GANG_NAME = 'the Gutter Saints';
export const GANG_JOIN_STIPEND = 500;   // five iron coins, in normal units

export const GANG_LINES = {
  ask: 'Quiet, quiet. We are the Gutter Saints, and we watch these alleys so nobody else has to. You look like you can handle yourself, and we are looking for people who can. Wear our knot, take a share of what the lanes earn, and when someone comes at you in the dark you will have friends. What do you say?',
  joined: 'Welcome to the Saints. Here, an advance on your share. The knot goes on your belt, and anyone in these alleys who knows it will leave you be.',
  declined: 'No hard feelings. The offer stands if you change your mind. We will be around, as we always are.',
  fight: 'Turn us down and keep walking? No. Show us what you are worth, then!',
  already: "Saints' colours. Good to see you working the lanes.",
};

// --- the guard -------------------------------------------------------------

export const GUARD_LINES = {
  ask: 'Here... over here. I took a blade in the side chasing a cutpurse down this alley, and I cannot stand. I am not asking for coin. Have you a healing ability, or a potion to spare? Anything.',
  abilityHealed: 'That did it. The edges are closing. Thank you, adventurer. I will remember who stopped to help.',
  potionHealed: 'Gods, that stings... and then it does not. Thank you. I will not forget who stopped.',
  refused: 'Then... I will wait for the patrol. Go on. Go.',
  tip: 'Take this. The watch does not pay much, but it is honest.',
};
export const GUARD_TIP = 300;   // three iron coins

// ===========================================================================
// ROUND 350 -- WHAT AN ALLEY PAYS.
//
//   "need to implement some sort of experience, money, or item rewards for the
//    little alley events"
//
// Until now the guard tipped three iron coins and the gang an advance of five,
// and the thief and the fight paid nothing at all beyond what the bandits
// dropped. One table now: every way through an alley that is NOT paying a
// thief or walking away hands back experience (the banked `pendingXp`, the same
// pot a kill feeds), coin, and a small item. The numbers are for a Normal-rank
// character and scale with the rank the alley's people were raised at (`tier`:
// 0 Normal .. 2 Bronze), the way every other reward in the game does.
//
//   how            xp   coins (normal units)   items
//   helped         60   300  (three iron)      a small red, a ration
//   joined         30   500  (five iron)       a small blue
//   thief beaten   45   250                    a ration (what was in his purse)
//   gang beaten    110  600                    a small red, a small blue
//
// Coin and xp multiply by (tier + 1); items do not.
// ===========================================================================
export const ALLEY_REWARDS = {
  helped:      { xp: 60,  coins: GUARD_TIP,        items: ['minorHealPotion', 'staminaRation'] },
  joined:      { xp: 30,  coins: GANG_JOIN_STIPEND, items: ['manaTonic'] },
  thiefBeaten: { xp: 45,  coins: 250,              items: ['staminaRation'] },
  gangBeaten:  { xp: 110, coins: 600,              items: ['minorHealPotion', 'manaTonic'] },
};

export function alleyReward(how, tier = 0) {
  const r = ALLEY_REWARDS[how];
  if (!r) return { xp: 0, coins: 0, items: [] };
  const k = Math.max(0, Math.floor(tier)) + 1;
  return { xp: r.xp * k, coins: r.coins * k, items: r.items.slice() };
}

export const BOUNTY_LINES = {
  thiefBeaten: 'The thief had a cut purse on him -- yours, and a few others. You keep it all.',
  gangBeaten: 'The Saints scatter their stash as they fall. You gather it up.',
};

/**
 * Does an alley READ as one? "House placed too close to the wall ... didn't
 * clearly read as an alley." A lane needs: open ground the whole way (no solid
 * tile, no water) for the gap and two tiles past each mouth, a real depth
 * (three tiles or more between the houses' fronts and backs), and no town wall
 * or fence within `WALL_CLEAR_TILES` of its middle. `facts` is
 * `{ width, depth, blocked, wallDist }` in tiles, measured by the scene.
 */
export const ALLEY_MIN_DEPTH_TILES = 3;
export const ALLEY_WALL_CLEAR_TILES = 6;
export function alleyReadsAsAlley(facts) {
  if (!facts) return false;
  return facts.width >= 2 && facts.depth >= ALLEY_MIN_DEPTH_TILES
    && !facts.blocked && !(facts.wallDist < ALLEY_WALL_CLEAR_TILES);
}

/** Does this consumable mend health? A potion that restores `hp` outright, or
 *  a share of every pool (the clear elixirs). */
export function isHealingConsumable(def) {
  return !!def && (Number(def.hp) > 0 || Number(def.pct) > 0);
}

/** Abilities the player may use on a hurt friend: an ACTIVE heal. */
const HEAL_TEMPLATES = new Set(['selfHeal', 'aoeHealPulse', 'healOther', 'bloomField']);
export function isHealingAbility(a) {
  return !!a && a.kind === 'active'
    && (a.category === 'healing' || HEAL_TEMPLATES.has(a.template));
}

/** A sum of normal-coin units in words: "1 silver and 20 iron coins". One
 *  place, so every line that names a price agrees with every other. */
export function coinWords(units) {
  let left = Math.max(0, Math.floor(units));
  const parts = [];
  let lastN = 0;
  for (let i = COIN_RANKS.length - 1; i >= 0; i--) {
    const m = 100 ** i;
    const n = Math.floor(left / m);
    left -= n * m;
    if (n > 0) { parts.push(`${n} ${COIN_RANKS[i]}`); lastN = n; }
  }
  if (!parts.length) return '0 coins';
  const body = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `${body} coin${lastN === 1 ? '' : 's'}`;
}
