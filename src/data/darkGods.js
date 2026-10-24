// ============================================================================
// ROUND 300 -- THE DARK GODS TAKE TURNS.
//
// His words: 'Use a shack model for a "dark" church. The gods take turns
// showing up each with their own agendas and rewards. They only appear to
// outlaws and if a hero enters the shack while it's still a temple room they
// merely get an eerie feeling and it's labeled "mysterious room".'
//
// One god keeps the church on a given in-game day; the city decides where in
// the cycle it starts, so two cities are rarely holding the same god. Each
// god asks for one thing, pays one way:
//
//   Undeath      "Send me the dead."       kills while the promise stands
//   Destruction  "Break something open."   chests opened
//   Deception    "A lie told for me."      crew jobs done off the board
//   Avarice      "Everything is owed."     a tribute, handed back at 150% a
//                                          day later
//
// The progress counters are the player's own (kills, chests, jobs), read as
// the difference from the moment the promise was taken, so nothing here has to
// hook the combat or chest code. State is `player.darkVisits`, made on first
// touch, plain fields so the save carries it.
// ============================================================================

export const GOD_ORDER = ['undeath', 'deception', 'avarice', 'destruction'];

/** What a promise pays in coins, by the region's den tier (normal-coin units). */
export const GOD_COIN_REWARD = [60, 140, 300, 560, 1000];

/** Avarice's tribute is the tier's figure; it comes back this much larger. */
export const AVARICE_RETURN = 1.5;
export const AVARICE_TRIBUTE = [100, 200, 400, 800, 1600];

/** The god who has pledged followers gets paid a quarter better. */
export const PLEDGE_BONUS = 1.25;

export const GOD_VISITS = {
  undeath: {
    art: 'god_undeath', metric: 'kills', need: 8,
    ask: 'Eight dead, by your hand, and I will pour something back into you.',
    arrive: 'The air in the shack goes cold and still. Something that was buried is standing where the altar was.',
    progress: (n, need) => `${Math.min(n, need)} of ${need} dead`,
    buff: { key: 'lifedrain', amount: 0.08, duration: 900, label: 'a stolen life, for fifteen minutes' },
    done: 'Good. They will not need it any more.',
  },
  destruction: {
    art: 'god_destruction', metric: 'chests', need: 3,
    ask: 'Three locks broken open. What is inside is yours. The breaking is mine.',
    arrive: 'Ash drifts down inside a shack with no fire. The Ashen Mouth is smiling and there is a great deal of it.',
    progress: (n, need) => `${Math.min(n, need)} of ${need} chests opened`,
    buff: { key: 'cooldownRate', amount: 0.15, duration: 900, label: 'a quickened hand, for fifteen minutes' },
    done: 'Open is better than shut. Take this.',
  },
  deception: {
    art: 'god_deception', metric: 'jobs', need: 2,
    ask: 'Two jobs off the crew board, done quietly. Somebody should believe it was somebody else.',
    arrive: 'The shack has more shadow than a shack should. The Veiled Hand is in it, and does not seem to be in any one place.',
    progress: (n, need) => `${Math.min(n, need)} of ${need} crew jobs done`,
    buff: { key: 'dodgeChance', amount: 0.10, duration: 900, label: 'a slipperiness, for fifteen minutes' },
    done: 'Nobody will remember it was you. Not even you, if I am generous.',
  },
  avarice: {
    art: 'god_avarice', metric: 'tribute',
    ask: 'Leave me a tribute. Come back after a night, and I will give you half again.',
    arrive: 'A ledger is open on the altar and a woman is writing in it without looking down. She has already written your name.',
    done: 'Everything is owed. Everything is paid. Here is your half again.',
  },
};

/** Which god keeps this city's church on this day. Stable for the whole day. */
export function godOnDuty(day, cityId) {
  let h = 0;
  for (const ch of String(cityId || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const d = Math.max(0, Math.floor(day || 0));
  return GOD_ORDER[(d + h) % GOD_ORDER.length];
}

/** The player's record with the gods, made on first touch. */
export function darkVisitState(p) {
  if (!p) return null;
  if (!p.darkVisits || typeof p.darkVisits !== 'object') {
    p.darkVisits = { active: null, kept: 0, log: [] };
  }
  return p.darkVisits;
}

/** The promise in hand, if any: { god, city, day, tier, base, need? , tribute? }. */
export function activePromise(p) {
  const v = darkVisitState(p);
  return v ? v.active : null;
}

/** How far the player has got on a promise, given the three live counters. */
export function promiseProgress(promise, counters) {
  if (!promise) return { have: 0, need: 0, ready: false };
  const g = GOD_VISITS[promise.god];
  if (!g) return { have: 0, need: 0, ready: false };
  if (g.metric === 'tribute') {
    const ready = (counters.day || 0) > promise.day;
    return { have: ready ? 1 : 0, need: 1, ready };
  }
  const now = counters[g.metric] || 0;
  const have = Math.max(0, now - promise.base);
  return { have, need: g.need, ready: have >= g.need };
}

/** What a finished promise pays: { coins, buff|null }. */
export function promiseReward(promise, pledged) {
  const g = GOD_VISITS[promise.god];
  const tier = Math.max(0, Math.min(GOD_COIN_REWARD.length - 1, promise.tier || 0));
  const mult = pledged === promise.god ? PLEDGE_BONUS : 1;
  if (g.metric === 'tribute') {
    return { coins: Math.round((promise.tribute || 0) * AVARICE_RETURN * mult), buff: null };
  }
  return { coins: Math.round(GOD_COIN_REWARD[tier] * mult), buff: g.buff ? { ...g.buff } : null };
}

/** Nothing here disagrees with itself. */
export function darkGodFaults(godIds = null) {
  const out = [];
  if (godIds && GOD_ORDER.slice().sort().join() !== godIds.slice().sort().join()) out.push('the rotation must name exactly the dark gods');
  for (const id of GOD_ORDER) {
    const g = GOD_VISITS[id];
    if (!g) { out.push(`${id}: no visit`); continue; }
    if (!g.art || !g.ask || !g.arrive || !g.done) out.push(`${id}: missing art or lines`);
    if (g.metric !== 'tribute' && !(g.need > 0)) out.push(`${id}: no goal`);
    if (g.metric !== 'tribute' && !g.buff) out.push(`${id}: no reward buff`);
  }
  return out;
}
