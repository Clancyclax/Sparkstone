// ===========================================================================
// ROUND 406 -- EVERY COMPANION GETS A MARTIAL ART.
//
// The user (asked at round 400): "every companion gets a martial art (recruit or journey), grows by kills or training
// with their master; finding each companion's master is part of their story."
//
// THE TWO WAYS IN. A companion either arrives KNOWING an art (they learned it before you met them, from a master who is
// still out there teaching it), or has a JOURNEY to make: they have heard of a master whose way suits them and want to
// find them. Either way the art and the master are fixed per run: one of the run's assigned masters whose art fits the
// companion's role (a tank a guard art, a healer a casting or mending art, a ranged fighter a quick or keen one, a melee
// fighter a weapon or footwork art). Bring them to that master: a journey companion learns the art; a companion who knows
// it is trained, once per rank.
//
// THE TWO WAYS UP, the player's own rule (martialMastery.js) at a companion's pace: their KILLS at each rank make them a
// Journeyman, Adept, Expert, Master of their art (the thresholds are a quarter of the player's -- a companion lands fewer
// killing blows), and TRAINING with their master at a rank "doubles the bonus" there. The better of the two counts.
//
// WHAT IT DOES. The art's own clauses (martialArts.js `effectsFor`), read off the companion's own situation (in a fight,
// hurt, outnumbered, after a kill ...), scaled by their rank and their mastery. Of the channels, the ones a companion has
// a body for land: damage, weapon damage and crits on their blows, movement speed, dodge and damage reduction on the
// blows they take, and the health they win back (leech, on a kill, regeneration).
// ===========================================================================
import { MASTERY_LADDER, TRAINED_BONUS } from './martialMastery.js';
import { MARTIAL_BY_ID, martialScale, effectsFor, CONDITIONS } from './martialArts.js';
import { artTheme } from './masterQuests.js';

/** A companion's mastery steps at a quarter of the player's kills. */
export const COMP_KILL_SCALE = 0.25;
/** Kills at a rank before their master will train them there. */
export const COMP_TRAIN_KILLS = 20;
/** How close to the master the companion must be (world px) to learn or train. */
export const COMP_MASTER_NEAR = 32 * 14;
/** The channels a companion's body can use. */
export const COMP_CHANNELS = ['damage', 'weaponDamage', 'crit', 'moveSpeed', 'dodge', 'guard', 'leech', 'killMend', 'vigor', 'swingSpeed'];

const mix = (h) => { h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0; };
const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return mix(h); };

/** Does an art suit a role? */
export function artFitsRole(art, role) {
  const T = artTheme(art);
  switch (role) {
    case 'tank': return T.heavy;
    case 'healer': return T.vigor || T.caster;
    case 'ranged': return T.crit || T.speed || T.weapon === 'bow' || T.weapon === 'dagger';
    case 'melee': return !!T.weapon || T.crit || T.dodge;
    default: return true;
  }
}

/** The plan for a companion: { art, master, how: 'known' | 'journey' }. `masters`: [{ key, art }] (assigned, with an art). */
export function compArtPlan(memberId, role, masters, seed) {
  const usable = (masters || []).filter(o => o && o.art && MARTIAL_BY_ID[o.art]);
  if (!usable.length) return null;
  // an art whose clauses a companion's body can use (damage, crits, speed, dodge, guard, health back), fitting the role
  // where one does; then any usable one; then any
  const usesBody = (a) => (a.clauses || [{ fx: a.fx || {} }]).some(cl => Object.entries(cl.fx || {}).some(([k, v]) => v > 0 && COMP_CHANNELS.includes(k)));
  const body = usable.filter(o => usesBody(MARTIAL_BY_ID[o.art]));
  const fit = body.filter(o => artFitsRole(MARTIAL_BY_ID[o.art], role));
  const pool = fit.length ? fit : body.length ? body : usable;
  const h = hash(`compart|${seed}|${memberId}`);
  const m = pool[h % pool.length];
  return { art: m.art, master: m.key, how: (h >>> 11) % 2 ? 'known' : 'journey' };
}

/** Where a companion stands in their art at a rank: { step, bonus, title, kills, next }. */
export function compMastery(rec) {
  const kills = (rec && rec.kills) || 0;
  let step = MASTERY_LADDER[0];
  for (const s of MASTERY_LADDER) if (kills >= Math.round(s.kills * COMP_KILL_SCALE)) step = s;
  const nx = MASTERY_LADDER[MASTERY_LADDER.indexOf(step) + 1] || null;
  const trained = !!(rec && rec.trained);
  const bonus = Math.max(step.bonus, trained ? TRAINED_BONUS : 0);
  const titleStep = trained && step.bonus < TRAINED_BONUS ? MASTERY_LADDER.find(x => x.id === 'expert') : step;
  return { step, bonus, title: titleStep.label, kills, trained, next: nx ? { label: nx.label, kills: Math.round(nx.kills * COMP_KILL_SCALE) } : null };
}

/** What a companion's art does right now: only the channels a companion can use. `rankIdx` iron = 1. */
export function compArtFx(artId, ctx, rankIdx, bonus = 0) {
  const a = MARTIAL_BY_ID[artId];
  if (!a) return {};
  const scale = martialScale(Math.max(0, (rankIdx || 1) - 1)) * (1 + (bonus || 0));
  // a companion practises their art with its own weapon: the art's weapon conditions hold for them
  const wctx = {};
  for (const cl of (a.clauses || [{ cond: a.cond }])) {
    if (!/^w_/.test(cl.cond || '')) continue;
    const co = CONDITIONS.find(c => c.id === cl.cond);
    if (co) wctx[co.key] = true;
  }
  const fx = effectsFor(a, { ...ctx, ...wctx, scale });
  const out = {};
  for (const k of COMP_CHANNELS) if (fx[k]) out[k] = fx[k];
  return out;
}

/** What they say about it -- the five story companions in their own voices, everyone else in a common one. `{art}`,
 *  `{master}`, `{place}`. */
export const COMP_ART_LINES = {
  zeke: {
    known: 'Learned {art} off {master} the winter the bottoms flooded, when there was nothing to do but mend fences and listen. {master} still teaches it, at {place}.',
    journey: 'There\'s a teacher at {place} -- {master}. {art}. I\'ve watched a man who knew it keep three people alive at once. I\'d like to learn it before my knees go.',
    learned: '{master} says I\'ve the patience for it, and the stubbornness. That\'s the farm, that is.',
  },
  encykla: {
    known: '{art}. {master} taught it to me at {place}, between lectures I was meant to be attending. I attended these instead.',
    journey: 'I have read about {art}. Reading is not doing. {master} teaches it at {place}, and I would like to stop only reading about it.',
    learned: 'It is better done than read. Do not tell Aedia I said so.',
  },
  aedia: {
    known: '{master} at {place}. {art}. My sister thinks it is beneath us. My sister has never been cornered.',
    journey: 'Encykla has her books. I want {art}. {master} teaches it at {place}, and I mean to have it.',
    learned: 'There. Now we each have something the other does not.',
  },
  benjamin: {
    known: '{art}, from {master}, out at {place}. It was the first thing anyone ever taught me that I was good at.',
    journey: 'Everyone keeps telling me I swing like a man chopping wood. {master} at {place} teaches {art}. I want to swing like something else.',
    learned: 'I don\'t swing like a woodcutter any more. I swing like a woodcutter who knows what he\'s doing.',
  },
  prism: {
    known: '{art}! {master} taught me at {place}. I was very bad at it and then I was not, which is how everything goes.',
    journey: 'There is a master at {place}, {master}, who teaches {art}, and I would very much like to be bad at it and then not.',
    learned: 'I was bad at it. Then I was not. I told you.',
  },
  _: {
    known: 'I follow {art}. {master} taught me, at {place}, and they are teaching there still.',
    journey: 'There is a master of {art} at {place}: {master}. Their way suits me. I would like to learn it, if our road goes that way.',
    learned: 'It was worth the walk.',
  },
};
export function compArtLine(memberId, kind, vars) {
  const bank = COMP_ART_LINES[memberId] || COMP_ART_LINES._;
  return (bank[kind] || COMP_ART_LINES._[kind] || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : '');
}

export function compArtFaults() {
  const out = [];
  for (const [id, b] of Object.entries(COMP_ART_LINES)) for (const k of ['known', 'journey', 'learned']) if (!b[k]) out.push(`${id} has no ${k} line`);
  if (!(COMP_KILL_SCALE > 0 && COMP_KILL_SCALE < 1)) out.push('kill scale');
  return out;
}
