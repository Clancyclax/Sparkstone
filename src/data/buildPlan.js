// ============================================================================
// ROUND 384 -- THE STAGED BUILD PLAN (the build's seed).
//
// The user: "When a player selects an essence a seed should be created to
// create a synergized build from the essence. When a new essence is added a new
// seed should be created looking at the existing abilities to further create a
// planned build, finally when the third and confluence (which happen together)
// are selected a final seed should be generated for a synergized comprehensive
// build. This should focus on 2-3 payoffs based on the essences, synergy
// between the essences, and be influenced by the astral blessing as well."
//
// And: "In canon individuals are warned not to slot too many stones before
// absorbing all their essences or their build may end up uneven and that
// threat is fine to carry over in game." Abilities awakened under an earlier
// stage keep the payoffs that stage planned (the ability lock), so a build that
// socketed everything at stage 1 carries stage-1 payoffs the final plan may no
// longer lean on. That is the canon risk, kept on purpose.
//
// Pure. `planBuild` turns essences / confluence / blessing / the abilities
// already held into 2-3 PAYOFF THEMES (a condition each, with why and shape
// preferences). essenceConditions.js `applyEssenceConditionPayoffs` places the
// themes (helpers.plan); awakening.js records the stages (resolveBuildPlans).
// ============================================================================
import { ESSENCES } from './abilities.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { conditionDef } from './debuffs.js';
import { CONDITIONS, ESSENCE_CONDITIONS, abilityLaysCondition } from './essenceConditions.js';

// The condition an essence or stone FAMILY lays (awakening.js FAMILY_TRAITS `dot`, read through dotConditionOf; a
// test holds the two together). An essence with no condition of its own leans on its family's: Sickle and Sword are
// blade (Bleed), Feast and Hunger are blood, Bone and Blight are death (Decay), the sea creatures are aquatic (Soak).
export const FAMILY_CONDITION = {
  blade: 'bleeding', blood: 'bleeding', death: 'decaying', dark: 'decaying', alchemy: 'corroded', cold: 'frostbitten',
  aquatic: 'soaked', water: 'soaked', light: 'seared', fire: 'burning', storm: 'shocked', serpent: 'poisoned',
};

// How each blessing bends the plan (outworlder.js ASTRAL_BLESSINGS). `shapes` go first in a theme's shape order,
// `carrier` is the kind of attack a theme prefers to ride, `stacking` favours the stacking afflictions, `extra`
// widens the plan by one theme.
export const BLESSING_PLAN = {
  reaper: { note: 'The Reaper: affliction payoffs favoured', shapes: ['perStack', 'consume'], stacking: 1, extra: 1 },
  throne: { note: 'The Sundered Throne: payoffs ride special attacks', carrier: 'special' },
  book: { note: 'The Celestial Book: payoffs ride spells', carrier: 'spell' },
  eye: { note: 'The All Devouring Eye: payoffs count enemies around you and ride area attacks', shapes: ['perCarrier'], carrier: 'area' },
  songs: { note: 'The Seeker of Songs: payoffs heal you for each afflicted enemy', shapes: ['healPer'] },
  phoenix: { note: 'The World Phoenix: payoffs make you harder to hit', shapes: ['dodgePer'] },
};

// The shapes a blessing may add to a condition that does not list them itself (healPer and dodgePer read any
// condition: they count carriers near you).
const ANY_COND_SHAPES = new Set(['healPer', 'dodgePer']);

/** How many themes a stage plans for. */
export const STAGE_THEMES = { 1: 2, 2: 2, 3: 3 };
const MIN_SCORE = 2;   // below this a condition is not a theme (one stray ability laying it is not a build)

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const essName = (id) => (ESSENCES[id] && ESSENCES[id].name) || id;
/** The condition an essence trades in, and whether it is its own or its family's. */
export function essenceLean(id) {
  if (ESSENCE_CONDITIONS[id]) return { cond: ESSENCE_CONDITIONS[id], own: true };
  const fam = ESSENCES[id] && ESSENCES[id].family;
  return FAMILY_CONDITION[fam] ? { cond: FAMILY_CONDITION[fam], own: false } : null;
}
/** The condition a socketed stone's family lays, or null. */
export function stoneCondition(stoneId) {
  const s = STONE_CATALOG[stoneId];
  return (s && FAMILY_CONDITION[s.family]) || null;
}

/** The order a theme tries shapes in: the blessing's first, then the condition's own, rotated by the seed. */
function shapeOrderFor(cond, blessing, seed) {
  const own = CONDITIONS[cond].shapes.slice();
  const rot = hash(`${seed}|${cond}|planShape`) % own.length;
  const base = own.slice(rot).concat(own.slice(0, rot));
  const pref = ((BLESSING_PLAN[blessing] || {}).shapes || []).filter(s => own.includes(s) || ANY_COND_SHAPES.has(s));
  return [...new Set([...pref, ...base])];
}

/**
 * The plan for one stage.
 * @param o { essenceIds (1-3, slot order), confluence (def or null), blessing, existingAbilities (ability objects
 *   already held -- the locked ones), charSeed, stage (1-3; defaults to the essence count) }
 * @returns { stage, essences, confluence, blessing, themes: [{ cond, label, score, why: [..], shapes: [..],
 *   carrier }], open, synergies: [{ conds, note }], notes: [..] }
 */
export function planBuild(o = {}) {
  const essenceIds = (o.essenceIds || []).filter(Boolean);
  const stage = o.stage || Math.min(3, essenceIds.length) || 1;
  const blessing = o.blessing || null;
  const B = BLESSING_PLAN[blessing] || {};
  const seed = String(o.charSeed || '');
  const cands = new Map();
  const add = (cond, pts, why, src) => {
    if (!cond || !CONDITIONS[cond]) return;
    const c = cands.get(cond) || { cond, score: 0, why: [], src: [] };
    c.score += pts;
    if (why && !c.why.includes(why)) c.why.push(why);
    if (src) c.src.push(src);
    cands.set(cond, c);
  };
  // 1. the essences: their own condition (Fire: Burning), else their family's (Sickle: Bleeding)
  const byCond = {};
  for (const id of essenceIds) {
    const l = essenceLean(id);
    if (!l) continue;
    add(l.cond, l.own ? 3 : 2, essName(id), { kind: 'essence', id });
    (byCond[l.cond] = byCond[l.cond] || []).push(id);
  }
  // two essences on one condition double down on it
  for (const [cond, ids] of Object.entries(byCond)) if (ids.length > 1) add(cond, 2, null, null);
  // 2. the confluence (stage 3): its concept's family
  const conf = o.confluence || null;
  if (conf && FAMILY_CONDITION[conf.family]) add(FAMILY_CONDITION[conf.family], 2, `${conf.name} confluence`, { kind: 'confluence' });
  // 3. the abilities already held (stage 2+): what they lay, what their stones lay, what they already pay on
  const held = (o.existingAbilities || []).filter(Boolean);
  const lay = {}, stones = {}, paid = {};
  for (const a of held) {
    for (const cond of Object.keys(CONDITIONS)) if (abilityLaysCondition(a, cond, conditionDef)) lay[cond] = (lay[cond] || 0) + 1;
    const sc = a.stoneId ? stoneCondition(a.stoneId) : (a.stone && stoneCondition(a.stone)) || null;
    if (sc) stones[sc] = (stones[sc] || 0) + 1;
    for (const ec of [a.essCond, a.essCond2]) if (ec && ec.cond) paid[ec.cond] = (paid[ec.cond] || 0) + 1;
  }
  for (const [cond, n] of Object.entries(lay)) add(cond, Math.min(2, n * 0.75), `${n} of your abilities lay it`, { kind: 'kit' });
  for (const [cond, n] of Object.entries(stones)) add(cond, Math.min(2, n), `${n} socketed stone${n > 1 ? 's' : ''}`, { kind: 'stones' });
  for (const [cond, n] of Object.entries(paid)) add(cond, 1.5 * Math.min(2, n), 'already paid on', { kind: 'paid' });
  // 4. the blessing: the Reaper favours the stacking afflictions
  if (B.stacking) for (const c of cands.values()) if (CONDITIONS[c.cond].stacking) { c.score += B.stacking; c.why.push('The Reaper'); }
  // pick
  const ranked = [...cands.values()].sort((x, y) => (y.score - x.score) || (hash(`${seed}|${x.cond}|plan`) - hash(`${seed}|${y.cond}|plan`)));
  const target = Math.min(3, (STAGE_THEMES[stage] || 2) + (B.extra && stage >= 2 ? B.extra : 0));
  const picked = ranked.filter(c => c.score >= MIN_SCORE).slice(0, target);
  const carrier = B.carrier || null;
  const themes = picked.map(c => {
    // the essence a theme came from, so the placer can prefer that essence's own attacks
    const ess = c.src.filter(s => s.kind === 'essence').map(s => s.id);
    const why = c.why.length ? c.why : ['your kit'];
    return { cond: c.cond, label: CONDITIONS[c.cond].label, score: Math.round(c.score * 10) / 10, why, essences: ess,
      shapes: shapeOrderFor(c.cond, blessing, seed), carrier };
  });
  // synergy: two themes from two different essences meet; an attack of one essence socketed with the other's stone
  // family may pay on both
  const synergies = [];
  for (let i = 0; i < themes.length; i++) for (let j = i + 1; j < themes.length; j++) {
    const A = themes[i], Bt = themes[j];
    const ea = A.essences[0], eb = Bt.essences.find(e => e !== ea);
    if (!ea || !eb) continue;
    synergies.push({ conds: [A.cond, Bt.cond], essences: [ea, eb],
      note: `${essName(ea)} × ${essName(eb)}: [${A.label}] and [${Bt.label}] -- an attack carrying both can pay on both` });
  }
  const notes = [];
  if (B.note) notes.push(B.note);
  for (const [cond, ids] of Object.entries(byCond)) if (ids.length > 1) notes.push(`${ids.map(essName).join(' and ')} both lay [${CONDITIONS[cond].label}]`);
  return { stage, essences: essenceIds.slice(), confluence: conf ? conf.name : null, blessing, themes,
    open: Math.max(0, target - themes.length), synergies, notes };
}

/**
 * A plan's open theme slots, filled from what the kit lays now (its stones above all): a stage whose essence lays
 * nothing plans around the first stones socketed into it. Returns a copy; the stored plan is not written.
 * @param kitConds [{ cond, n, why }] most-laid first
 */
export function fillOpenThemes(plan, kitConds) {
  if (!plan) return null;
  const out = { ...plan, themes: plan.themes.map(t => ({ ...t })) };
  for (const k of (kitConds || [])) {
    if (out.open <= 0) break;
    if (!CONDITIONS[k.cond] || out.themes.some(t => t.cond === k.cond)) continue;
    out.themes.push({ cond: k.cond, label: CONDITIONS[k.cond].label, score: k.n, why: [k.why || 'your stones'], essences: [],
      shapes: shapeOrderFor(k.cond, plan.blessing, ''), carrier: (BLESSING_PLAN[plan.blessing] || {}).carrier || null, filled: true });
    out.open--;
  }
  return out;
}

/**
 * The stages, kept in step with the essences held. A plan is recorded the first time a rebuild sees a new essence
 * count (absorbing an essence), from the abilities already held (`existing`, the locked ones); a stage whose
 * essences are no longer all held is dropped (an essence taken out). Old saves with no plans get one, for the
 * stage they are at, the first time they rebuild.
 */
export function resolveBuildPlans(prev, ctx) {
  const ids = (ctx.essenceIds || []).filter(Boolean);
  if (!ids.length) return [];
  const have = new Set(ids);
  const plans = (Array.isArray(prev) ? prev : []).filter(p => p && p.plan && (p.essences || []).every(e => have.has(e))
    && p.stage <= ids.length);
  const stage = Math.min(3, ids.length);
  const last = plans[plans.length - 1];
  const sameBlessing = last && (last.plan.blessing || null) === (ctx.blessing || null);
  if (last && last.stage === stage && sameBlessing) return plans;
  const plan = planBuild({ essenceIds: ids, confluence: stage === 3 ? ctx.confluence : null, blessing: ctx.blessing,
    existingAbilities: ctx.existing || [], charSeed: ctx.charSeed, stage });
  const kept = plans.filter(p => p.stage < stage);
  return [...kept, { stage, essences: ids.slice(), plan }];
}

/** The one line the Abilities page shows: "Your build leans on: Burning (Fire), Bleeding (Blood × Fire)." */
export function planLine(plan) {
  if (!plan || !plan.themes || !plan.themes.length) return '';
  const parts = plan.themes.map(t => {
    const src = t.essences && t.essences.length ? t.essences.map(essName).join(' × ')
      : (t.why[0] || '').replace(/^\d+ /, '');
    return `${t.label}${src ? ` (${src})` : ''}`;
  });
  return `Your build leans on: ${parts.join(', ')}.`;
}

/** For the stage recorder: the stone conditions in a kit, most-laid first. */
export function kitStoneConditions(entries) {
  const n = {};
  for (const en of entries) {
    const c = en && en.stoneId ? stoneCondition(en.stoneId) : null;
    if (c) n[c] = (n[c] || 0) + 1;
  }
  return Object.entries(n).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1)).map(([cond, k]) => ({ cond, n: k, why: `${k} socketed stone${k > 1 ? 's' : ''}` }));
}
