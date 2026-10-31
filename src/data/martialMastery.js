// ===========================================================================
// ROUND 400 -- MARTIAL MASTERY: THROUGH PRACTICE, AND FROM A MASTER.
//
// The user:
//   "Learning a martial art from a skillbook is a primer, upgrading the skill book via ritual makes it better at each
//    rank but finding a master to teach you the ways drives it deeper. Finding a master of your martial art and
//    completing their training quests doubles the bonus at whatever rank you are when you train with them making you
//    a "rank" master. They have new more extreme quests at each rank, by silver requiring traveling the world for
//    inspiration and challenges or fighting and slaying specific monsters in locations outside of the major city
//    regions."
//   "Alternatively master through practice can be achieved. Learning a style via skillbook makes you an initiate, at
//    each rank killing 100 monsters makes you a "rank" journeyman with a 25% increase, 500 a "rank" adept with a 50%
//    increase, 1000 a "rank" expert with a 100% increase, and 2000 makes you a "rank" master with a 200% increase to
//    the base martial arts bonus for that rank."
//
// PER RANK. Everything here is kept per RANK of the art (its attuned rank, the one the Deepening Rite raises): a new
// rank starts a new count and a new course of training. Stored on the player's skill books as
//   skillBooks.mastery[rankIdx] = { kills, trained, trial: { master, rank, steps: [...] } | null }
// THE TWO ROADS DO NOT STACK: the art's bonus at a rank is multiplied by 1 + the better of the two -- the practice
// step's increase, or +100% for having trained with a master ("doubles the bonus"). The title is the better one too:
// "Iron Journeyman", "Bronze Expert" (training), "Silver Master" (2,000 defeats).
//
// TRIALS. A master sets the steps for your rank (`trialSteps`), harder at each:
//   kills      defeat N monsters while following the style
//   family     slay N of one kind of monster, of the rank you are training at
//   visit      go to a named place in the wilds and meditate there (stand still) -- "travelling the world for
//              inspiration"; from Bronze on, in other regions than the master's
//   champion   slay a named champion that waits at a place outside the cities -- "fighting and slaying specific
//              monsters in locations outside of the major city regions"
// The scene supplies the places (`spots`: wild and deep-wild points with their region and rank) and the monster
// rosters; this file only decides, deterministically from the seed, which.
// ===========================================================================

import { RANK_ORDER, RANK_LABELS } from './ranks.js';

export const MASTERY_LADDER = [
  { id: 'initiate',   label: 'Initiate',   kills: 0,    bonus: 0 },
  { id: 'journeyman', label: 'Journeyman', kills: 100,  bonus: 0.25 },
  { id: 'adept',      label: 'Adept',      kills: 500,  bonus: 0.5 },
  { id: 'expert',     label: 'Expert',     kills: 1000, bonus: 1.0 },
  { id: 'master',     label: 'Master',     kills: 2000, bonus: 2.0 },
];
/** Training with a master "doubles the bonus" at that rank. */
export const TRAINED_BONUS = 1.0;
/** Seconds of stillness at a place of inspiration. */
export const MEDITATE_SECONDS = 8;
export const VISIT_RADIUS = 110;   // world px

export function rankLabel(rankIdx) {
  return RANK_LABELS[RANK_ORDER[Math.max(0, Math.min(4, rankIdx | 0))]] || 'Normal';   // no diamond rank in the game (only the coin)
}

/** The record for one rank (created on first touch). `sbRaw` is the player's own skillBooks object. */
export function masteryRecord(sbRaw, rankIdx) {
  if (!sbRaw) return { kills: 0, trained: false, trial: null };
  const m = sbRaw.mastery || (sbRaw.mastery = {});
  const k = String(Math.max(0, rankIdx | 0));
  return m[k] || (m[k] = { kills: 0, trained: false, trial: null });
}

/** Where the art stands at a rank: the practice step, the next step, training, and the bonus and title they give. */
export function masteryState(sbRaw, rankIdx) {
  const rec = (sbRaw && sbRaw.mastery && sbRaw.mastery[String(Math.max(0, rankIdx | 0))]) || { kills: 0, trained: false };
  let step = MASTERY_LADDER[0];
  for (const s of MASTERY_LADDER) if ((rec.kills || 0) >= s.kills) step = s;
  const next = MASTERY_LADDER[MASTERY_LADDER.indexOf(step) + 1] || null;
  const trained = !!rec.trained;
  const bonus = Math.max(step.bonus, trained ? TRAINED_BONUS : 0);
  // the user: training "makes you a '<Rank> Expert'" -- the Expert step's own +100%; practice alone reaches Master
  const titleStep = trained && step.bonus < TRAINED_BONUS ? MASTERY_LADDER.find(x => x.id === 'expert') : step;
  return {
    kills: rec.kills || 0, step, next, trained, bonus,
    title: `${rankLabel(rankIdx)} ${titleStep.label}`,
    mult: 1 + bonus,
  };
}

/** The line for the character sheet. */
export function masteryLine(sbRaw, rankIdx) {
  const s = masteryState(sbRaw, rankIdx);
  const parts = [`${s.title}: +${Math.round(s.bonus * 100)}% to the art at this rank`];
  if (s.next) parts.push(`${s.kills} of ${s.next.kills} defeats to ${rankLabel(rankIdx)} ${s.next.label}`);
  else parts.push(`${s.kills} defeats`);
  parts.push(s.trained ? 'trained by a master' : 'a master of your style can train you');
  return parts.join(' · ');
}

function rng(seed) {
  let h = 2166136261;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
}

/**
 * The training a master sets for `rankIdx`.
 *   seed       stable per run, master and rank
 *   ctx.spots  [{x, y, region, regionName, tier, deep, place}] -- places outside the cities
 *   ctx.masterRegion  the master's own region id (the journey goes elsewhere)
 *   ctx.families(tier) -> [{family, label}]   ctx.champions(tier) -> [{key, label}]
 * Every step is { kind, label, need, have, done, ... }.
 */
export function trialSteps(rankIdx, seed, ctx = {}) {
  const r = rng(`trial|${seed}|${rankIdx}`);
  const pick = (a) => (a && a.length ? a[Math.floor(r() * a.length)] : null);
  const tier = Math.max(0, Math.min(4, rankIdx));
  const steps = [];
  const kills = [25, 60, 150, 250, 400, 600][Math.min(5, rankIdx)];
  steps.push({ kind: 'kills', need: kills, have: 0, label: `Defeat ${kills} monsters while following the style` });
  if (rankIdx >= 1) {
    const fam = pick((ctx.families && ctx.families(Math.max(1, tier))) || []);
    if (fam) {
      const need = [0, 12, 20, 25, 30, 30][Math.min(5, rankIdx)];
      steps.push({ kind: 'family', family: fam.family, need, have: 0, label: `Slay ${need} ${fam.label}` });
    }
  }
  const spots = (ctx.spots || []).slice();
  const away = spots.filter(s => s.region !== ctx.masterRegion);
  const placesNeeded = [0, 0, 1, 2, 3, 3][Math.min(5, rankIdx)];
  const usedRegions = new Set();
  for (let i = 0; i < placesNeeded; i++) {
    const pool = (rankIdx >= 2 ? away : spots).filter(s => !usedRegions.has(s.region) && s.tier <= Math.max(1, tier));
    const sp = pick(pool.length ? pool : away.length ? away : spots);
    if (!sp) break;
    usedRegions.add(sp.region);
    steps.push({ kind: 'visit', x: sp.x, y: sp.y, place: sp.place, region: sp.region, need: MEDITATE_SECONDS, have: 0,
      label: `Seek inspiration at ${sp.place}: meditate there` });
  }
  const champsNeeded = [0, 0, 0, 1, 2, 2][Math.min(5, rankIdx)];
  for (let i = 0; i < champsNeeded; i++) {
    const deep = spots.filter(s => (rankIdx >= 4 ? s.deep : true) && s.tier >= Math.min(tier, 4) - 1);
    const sp = pick(deep.length ? deep : spots);
    const ch = pick((ctx.champions && ctx.champions(Math.min(4, tier))) || []);
    if (!sp || !ch) break;
    const title = ['the Old', 'the Unbroken', 'the Hungry', 'Ashjaw', 'the Pale', 'Gravehide', 'the Long-Toothed', 'Stormback'][Math.floor(r() * 8)];
    steps.push({ kind: 'champion', key: ch.key, x: sp.x, y: sp.y, place: sp.place, region: sp.region, need: 1, have: 0,
      name: `${ch.label} ${title}`, label: `Slay ${ch.label} ${title}, which waits at ${sp.place}` });
  }
  return steps;
}

export const stepDone = (s) => !!s && (s.done || (s.have || 0) >= (s.need || 1));
export const trialDone = (t) => !!t && Array.isArray(t.steps) && t.steps.length > 0 && t.steps.every(stepDone);
