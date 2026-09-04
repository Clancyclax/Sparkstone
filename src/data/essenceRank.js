// ROUND 47 -- PER-ESSENCE RANK PROGRESSION.
//
// The user's brief, verbatim:
//
//   "Experience is split between the 4 essences. Each essence moves up through
//    Iron on it's own from 0% when it's first obtained and is iron 0 to 100%
//    when it's iron 1, this continues up through iron 9 to bronze 0. As earlier
//    stated moving past bronze 0 means all essences must have hit bronze. As
//    each essence moves up the abilities tied to that essence should minorly
//    increase. Examples, A skill that does 8 damage at iron 0 should be dealing
//    16 damage by iron 9. A movement speed buff that lasts 10 seconds at iron 0
//    should be lasting 20 seconds at iron 9, or perhaps the speed increase
//    moves from 10% to 20%. Remember additional aspects to each abilities are
//    unlocked at a rank change providing more opportunities for synergy."
//
//   "6.1) An essence can't start to rank up until all it's awakening stone
//    slots are filled."
//
// WHAT CHANGED, structurally. Rank used to be ONE number on the player,
// derived from banked xp (ranks.js rankForLevel). It still exists -- the
// tyranny of rank, the region gates and the monster scaling all read it -- but
// it is DERIVED now: the player's rank is the rank of their WEAKEST essence.
// That is what makes "moving past bronze 0 means all essences must have hit
// bronze" true by construction rather than by a separate check.
//
// Each of the four slots carries its own xp, its own rank and its own level
// 0-9 within that rank.

import { RANK_ORDER } from './ranks.js';

/** Levels within a rank: iron 0 through iron 9, then bronze 0. */
export const LEVELS_PER_RANK = 10;

/** XP for one level of one essence. The whole-player curve used to be 100 xp
 *  per level with a rank every 4-5 levels; a rank is ten levels now and the xp
 *  is split four ways, so this is set to keep the time-to-Bronze in the same
 *  neighbourhood rather than to make the number look tidy. */
export const XP_PER_ESSENCE_LEVEL = 45;

/** The ceiling. No diamond content exists anywhere in the world (the user's
 *  standing note from round 43), so no essence climbs into it. */
export const MAX_ESSENCE_RANK = 'gold';

/** How much an ability grows across one rank of its essence.
 *
 *  "A skill that does 8 damage at iron 0 should be dealing 16 damage by iron 9"
 *  -- so exactly 2x from level 0 to level 9, and the steps between are linear:
 *  a level is +1/9 of the base. Linear rather than compounding because the
 *  user gave the endpoints and a straight line is the only reading of them
 *  that hits both without inventing a curve. */
export function abilityScale(level) {
  return 1 + Math.max(0, Math.min(LEVELS_PER_RANK - 1, level)) / (LEVELS_PER_RANK - 1);
}

/** The ability fields that grow with the essence's level.
 *
 *  Damage, durations and magnitudes -- the things the user's two examples name
 *  ("8 damage ... 16 damage", "lasts 10 seconds ... 20 seconds", "10% to 20%").
 *  Deliberately NOT scaled: range, radius, cooldown and resource cost. Those
 *  change how an ability is USED rather than how strong it is, and doubling a
 *  radius over a rank would quietly turn every nova into a screen-clear. */
export const SCALED_FIELDS = [
  'base', 'healAmount', 'hotPerSec', 'shieldAmount', 'absorb',
  'duration', 'buffDuration', 'slowDuration',
  'speedPct', 'slowPct', 'dmgPct', 'armorPct', 'critPct', 'thornsPct',
  // ROUND 47 (item 7) -- a weapon affinity is an ability like any other, so
  // its reach and speed bonuses grow with the essence that granted it. A
  // spear essence at iron 9 reaches meaningfully further than the same
  // essence at iron 0, and the telegraph shows it.
  'rangePct', 'attackSpeedPct',
  // ROUND 48 -- the lever twists. Both the generator and the runtime flagged
  // that these were being left behind: an essence's whole POINT is now the
  // lever it pulls, so a lever bonus that stayed flat while the ability's base
  // damage doubled would make the essence matter LESS the further you levelled
  // it -- the exact inversion of what round 47 item 6 promised.
  //
  // chainDamagePct is deliberately absent: the runtime prices a chain hop as a
  // fraction of `base`, and `base` already scales, so scaling the fraction too
  // would compound it into roughly quadruple by iron 9.
  'rangeMult', 'chainCount', 'chainRange', 'chainDamage',
  'confuseDuration', 'confuseChance', 'rerollChance',
  // ROUND 49 -- how LONG a taunt holds is its magnitude, and it doubles by
  // iron 9 like every other duration on this list.
  //
  // tauntRadius and tauntMax are deliberately absent, by this list's own rule:
  // a radius is a range, and how many enemies a shout can hold is how it is
  // USED (do I pull the pack or peel one?) rather than how strong it is. A
  // tauntMax that doubled would turn a tank's peel into a screen-clear at
  // exactly the point in the game where the packs get big enough to matter,
  // which is the nova failure the paragraph above already names.
  'tauntDuration',
  // ROUND 49 -- how long the veil HOLDS is its magnitude, and it doubles by
  // iron 9 like every other duration on this list.
  //
  // aggroMult and stealthAlpha are deliberately absent, and for a reason this
  // list has not had to state before: they are fractions where SMALLER is
  // stronger. abilityScale multiplies, so scaling them would make a veil weaker
  // the more you levelled it -- the exact inversion of the promise. If they
  // ever need to grow they need their own inverse curve, not this one.
  'stealthDuration', 'stealthSpeedPct',
];
/** Nested specs whose own numbers scale too (a DoT's per-tick damage). */
// ROUND 47 -- `effect` joins them for the triggered passives: a kill-bolt's
// damage is the ability's damage and has to grow with the essence like any
// other. `amount` covers the multiplier-style effects (a 100% physical bonus,
// a 50% next-spell bonus) and `duration` their windows.
export const SCALED_NESTED = {
  dot: ['dmgPerTick', 'ticks'],
  // ROUND 52 -- the mending rider grows with rank exactly as the affliction
  // rider does. Without this line a healer's linger would be the one twist in
  // the game that got no stronger as the essence ranked up.
  hot: ['perSec', 'duration'],
  sunder: ['amount', 'duration'],
  effect: ['damage', 'amount', 'duration'],
  // ROUND 48 -- the lever twists' nested blocks.
  resist: ['amount'],
  allyGrant: ['power', 'dmgPct'],
  perAllyGain: ['resistPct', 'dotChancePct', 'dmgPct'],
};

/**
 * The extra aspect an ability gains at each rank change: "additional aspects
 * to each abilities are unlocked at a rank change providing more opportunities
 * for synergy."
 *
 * Keyed by the rank the essence has REACHED, so an Iron essence's abilities
 * carry the iron aspect, a Bronze essence's carry iron AND bronze, and so on.
 * These are deliberately synergy hooks rather than raw numbers -- the raw
 * numbers are what abilityScale already does.
 */
export const RANK_ASPECTS = {
  iron: { id: 'iron', label: 'Iron: strikes apply a light bleed',
          dot: { dmgPerTick: 1, ticks: 3, tickMs: 700, label: 'Bleed' } },
  bronze: { id: 'bronze', label: 'Bronze: 15% of the damage splashes to nearby foes',
            splash: { frac: 0.15, radius: 90 } },
  silver: { id: 'silver', label: 'Silver: critical strikes refund 20% of the cost',
            refund: 0.2 },
  gold: { id: 'gold', label: 'Gold: the first hit each cooldown cannot be resisted',
          pierce: true },
};

/** Aspects an essence at `rank` has unlocked, weakest first. */
export function aspectsFor(rank) {
  const out = [];
  for (const r of RANK_ORDER) {
    if (r === 'normal') continue;
    if (RANK_ASPECTS[r]) out.push(RANK_ASPECTS[r]);
    if (r === rank) break;
  }
  return out;
}

/** A fresh progression record for one slot. `banked` holds xp earned while the
 *  slot was ineligible (stones not yet all socketed) -- it is applied the
 *  moment it becomes eligible rather than thrown away, so filling the last
 *  socket pays out the play that earned it. */
export function newSlotProgress() {
  return { xp: 0, banked: 0, rank: 'iron', level: 0 };
}

/** Is this slot allowed to progress? "An essence can't start to rank up until
 *  all it's awakening stone slots are filled." */
export function slotEligible(slots, i, stonesPerSlot) {
  const ess = i === 3 ? (slots.confluence || slots.slotEssence.every(Boolean)) : slots.slotEssence[i];
  if (!ess) return false;
  return (slots.slotStones[i] || []).length >= stonesPerSlot;
}

/**
 * Advance one slot's level/rank from its xp, honouring the all-essences gate.
 *
 * `floorRank` is the lowest rank across ALL the player's essences. An essence
 * may always climb as far as (nextRank, level 0) on its own -- that is what
 * "up through iron 9 to bronze 0" describes -- but it cannot pass level 0 of a
 * rank until every essence has reached that rank. Returns true if the rank or
 * level changed.
 */
export function recomputeSlot(prog, floorRank) {
  const before = `${prog.rank}:${prog.level}`;
  const maxIdx = RANK_ORDER.indexOf(MAX_ESSENCE_RANK);
  let rankIdx = Math.max(1, RANK_ORDER.indexOf(prog.rank || 'iron'));  // iron is the floor
  let level = Math.floor(prog.xp / XP_PER_ESSENCE_LEVEL);
  // Walk the levels up into higher ranks.
  while (level >= LEVELS_PER_RANK && rankIdx < maxIdx) {
    level -= LEVELS_PER_RANK;
    rankIdx++;
  }
  if (rankIdx >= maxIdx) level = Math.min(level, LEVELS_PER_RANK - 1);
  // THE GATE. Level 0 of a rank is always reachable; past it, every essence
  // must have reached this rank.
  const floorIdx = Math.max(1, RANK_ORDER.indexOf(floorRank || 'iron'));
  if (rankIdx > floorIdx) level = 0;
  prog.rank = RANK_ORDER[rankIdx];
  prog.level = Math.max(0, Math.min(LEVELS_PER_RANK - 1, level));
  return `${prog.rank}:${prog.level}` !== before;
}

/** Progress through the current level, 0..1 -- what a bar should show. */
export function slotProgress(prog) {
  const into = prog.xp % XP_PER_ESSENCE_LEVEL;
  return Math.max(0, Math.min(1, into / XP_PER_ESSENCE_LEVEL));
}

/** The player's own rank: the rank of their WEAKEST essence. An essence slot
 *  that is empty does not count -- a character with one essence is ranked by
 *  that one. With none, they are Normal, which is the round-5 rule that a
 *  character is Normal until bonded, unchanged. */
export function playerRankFrom(progs, slots) {
  let worst = null;
  for (let i = 0; i < progs.length; i++) {
    const has = i === 3 ? !!(slots.confluence) : !!slots.slotEssence[i];
    if (!has) continue;
    const idx = RANK_ORDER.indexOf(progs[i].rank || 'iron');
    if (worst === null || idx < worst) worst = idx;
  }
  return worst === null ? 'normal' : RANK_ORDER[worst];
}

/**
 * ROUND 74 (item 7) -- THE PLAYER'S OWN STANDING, as ONE reading.
 *
 * The user:
 *
 *   "Level should match the value next to the abilities. i.e. 76% into iron 4,
 *    not level 5."
 *
 * There were FOUR independent level curves in the game when this was written,
 * and the HUD was reading the wrong one:
 *
 *   1. `player.xp / 100 + 1`, printed in the HUD as "Lv N" -- the round-5
 *      whole-player curve, which round 47 replaced and nobody deleted.
 *   2. the per-essence progression in this file, shown beside each essence.
 *   3. a copy of (1) in saves.js, for the save-slot list.
 *   4. `RANK_LEVEL_FLOOR` in ranks.js, mapping (1) onto rank names.
 *
 * They cannot be reconciled by formula -- one of them has to BE the answer and
 * the rest have to read it. This is the answer, because it is the one the game
 * already acts on: `playerRankFrom` above derives the player's rank from their
 * WEAKEST essence, and that rank is what gates regions, scales monsters and
 * decides what the tyranny of rank will tolerate. A "level" that disagreed
 * with it was never describing the character.
 *
 * So the player's standing is the weakest slot's standing, compared on all
 * three parts in order -- rank, then level within it, then progress through
 * that level. Rank alone is not enough: four Iron essences at levels 0, 4, 4
 * and 9 are an Iron 0 character, and reporting Iron 9 because one essence got
 * there would be the same overstatement `playerRankFrom` already refuses.
 *
 * `standing` is the CONTINUOUS form -- rank index plus the fraction through
 * that rank -- and it is deliberately the same shape `ranks.js rankStanding`
 * returns, because the party's rank offsets ("roughly 10% ahead of or behind
 * the player") are expressed in it and needed no change to start reading a
 * truer number.
 */
export function playerStandingFrom(progs, slots) {
  let best = null;
  for (let i = 0; i < progs.length; i++) {
    const has = i === 3 ? !!(slots.confluence) : !!slots.slotEssence[i];
    if (!has) continue;
    const p = progs[i];
    const rankIdx = Math.max(1, RANK_ORDER.indexOf(p.rank || 'iron'));
    const cand = { rank: RANK_ORDER[rankIdx], rankIdx, level: p.level || 0, progress: slotProgress(p) };
    if (!best
      || cand.rankIdx < best.rankIdx
      || (cand.rankIdx === best.rankIdx && cand.level < best.level)
      || (cand.rankIdx === best.rankIdx && cand.level === best.level && cand.progress < best.progress)) {
      best = cand;
    }
  }
  if (!best) return { rank: 'normal', rankIdx: RANK_ORDER.indexOf('normal'), level: 0, progress: 0, standing: 0 };
  best.standing = best.rankIdx + Math.min(0.999, (best.level + best.progress) / LEVELS_PER_RANK);
  return best;
}

/** The player's standing as the user asked to read it: "76% into Iron 4".
 *  One formatter, so the HUD, the save list and anything else that prints a
 *  level cannot drift into printing different numbers for the same character. */
export function formatStanding(st) {
  if (!st || st.rank === 'normal') return 'Normal';
  const name = st.rank.charAt(0).toUpperCase() + st.rank.slice(1);
  return `${Math.round(st.progress * 100)}% into ${name} ${st.level}`;
}

/**
 * Split banked xp across the four slots.
 *
 * "Experience is split between the 4 essences." An even split -- but a slot
 * that cannot progress yet (empty, or with an unfilled socket) HOLDS its share
 * in `banked` rather than losing it. Filling the last socket then pays out
 * everything that essence earned while you were still assembling it, which is
 * the difference between a rule that teaches and a rule that punishes.
 */
export function awardEssenceXp(progs, slots, amount, stonesPerSlot) {
  const share = amount / progs.length;
  const out = [];
  for (let i = 0; i < progs.length; i++) {
    const p = progs[i];
    if (slotEligible(slots, i, stonesPerSlot)) {
      p.xp += share + (p.banked || 0);
      if (p.banked) { out.push({ slot: i, released: p.banked }); p.banked = 0; }
    } else {
      p.banked = (p.banked || 0) + share;
    }
  }
  return out;
}
