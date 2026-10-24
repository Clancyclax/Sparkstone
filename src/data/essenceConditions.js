// ============================================================================
// ROUND 382 -- ESSENCE CONDITION PAYOFFS.
//
// The user: "I'm not seeing enough (or any) abilities that tie directly to an
// essence theme. Fire essence should have some abilities that benefit
// specifically from stacks of burning or # of enemies burning. Similarly the
// blood essence should have some abilities that benefit from each bleeding
// enemy or the number of stacks of bleed. Not every single essence has a
// relevant condition but where they do they should have payoff abilities
// specific to that condition/affliction. Examples: Ice: Freeze, Sin: Sin,
// Fire: Burning, Blood: Bleeding, and more."
//
// This is the ESSENCE'S identity, not the generic "per affliction" payoff
// round 376 kept to affliction kits: a Fire ability that grows with Burning is
// what Fire is, whatever the kit's archetype. So these carry their own field
// (`essCond`), their own wording (never "your afflictions" / "per affliction",
// which kitArchetypes.PAYOFF_TEXT reads), and hasAfflictionPayoff does not
// count them.
//
// Pure data + text. awakening.js calls `applyEssenceConditionPayoffs` at the
// end of a kit build; attackRoleMixin `_roleOnHit` pays `essCond` on every hit
// (`essenceConditionCount` / `essenceConditionStacks` below are what it reads).
// ============================================================================

// How a condition is LAID by the payoff ability when the kit lays it nowhere
// else, and how it is RECOGNISED on a creature.
//   dot    -- the single affliction slot (`m.dot`); recognised by its label.
//             Re-application adds a stack (WorldScene._applyDot, cap 9).
//   debuff -- the debuff map (`m.debuffs[key]`); recognised by key or tag.
export const CONDITIONS = {
  burning: {
    // ROUND 383 -- 'sear' left this pattern: a Light / Sun dot ('Sear') is [Seared], its own condition (below).
    label: 'Burning', adj: 'burning', dotRe: /\b(burn|scorch|ember|immolat|cinder|blaze|flame)/i,
    keys: ['burn'], tag: 'burning', stacking: true,
    apply: { via: 'dot', label: 'Burn', ticks: 5, tickMs: 800 },
    applyText: (n, t) => `Each hit sets the target [Burning], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
  bleeding: {
    label: 'Bleeding', adj: 'bleeding', dotRe: /\b(bleed|hemor|lacerat|gash)/i,
    keys: ['bleed'], tag: null, stacking: true,
    apply: { via: 'dot', label: 'Bleed', ticks: 5, tickMs: 1000 },
    applyText: (n, t) => `Each hit leaves the target [Bleeding], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume', 'healPer'],
  },
  poisoned: {
    label: 'Poisoned', adj: 'poisoned', dotRe: /\b(poison|venom|toxin)/i,
    keys: ['poison'], tag: 'poison', stacking: true,
    apply: { via: 'debuff', key: 'poison', duration: 8 },
    applyText: () => 'Each hit adds a stack of [Poisoned] to the target for 8s, up to 5 stacks.',
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
  shocked: {
    label: 'Shocked', adj: 'shocked', dotRe: /\b(shock|volt|static|thunder)/i,
    keys: ['shocked'], tag: 'shock', stacking: false,
    apply: { via: 'debuff', key: 'shocked', duration: 6 },
    applyText: () => 'Each hit leaves the target [Shocked] for 6s.',
    shapes: ['perCarrier', 'consume'],
  },
  frozen: {
    label: 'Frozen', adj: 'frozen', dotRe: null,
    keys: ['freeze'], tag: null, stacking: false,
    apply: { via: 'debuff', key: 'freeze', duration: 1.5, chance: 0.3 },
    applyText: () => 'Each hit has a 30% chance to leave the target [Frozen] in place for 1.5s.',
    shapes: ['shatter', 'perCarrier'],
  },
  sin: {
    label: 'Sin', adj: 'sin-marked', noun: true, dotRe: null,
    keys: ['sin'], tag: null, stacking: true,
    apply: { via: 'debuff', key: 'sin', duration: 15 },
    applyText: () => 'Each hit adds a stack of [Sin] to the target for 15s, up to 5 stacks.',
    shapes: ['perStack', 'consume', 'perCarrier'],
  },
  // ROUND 383 -- "Light and Sun (Sear) and the stone families have no condition payoffs yet. Yes, they don't all need
  // to payoff at iron rank but they should by silver." The dots the stone families already lay (awakening.js
  // FAMILY_TRAITS `dot`) that had no condition of their own: each is now one, recognised by its own label.
  seared: {
    label: 'Seared', adj: 'seared', dotRe: /\b(sear)/i,
    keys: [], tag: null, stacking: true,
    apply: { via: 'dot', label: 'Sear', ticks: 5, tickMs: 800 },
    applyText: (n, t) => `Each hit leaves the target [Seared], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
  soaked: {
    label: 'Soaked', adj: 'soaked', dotRe: /\b(soak|drench|brine)/i,
    keys: [], tag: null, stacking: true,
    apply: { via: 'dot', label: 'Soak', ticks: 5, tickMs: 1000 },
    applyText: (n, t) => `Each hit leaves the target [Soaked], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
  frostbitten: {
    label: 'Frostbitten', adj: 'frostbitten', dotRe: /\b(frostbite|frostbitten|chilblain)/i,
    keys: [], tag: null, stacking: true,
    apply: { via: 'dot', label: 'Frostbite', ticks: 5, tickMs: 1000 },
    applyText: (n, t) => `Each hit leaves the target [Frostbitten], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
  decaying: {
    label: 'Decaying', adj: 'decaying', dotRe: /\b(decay|wither|necros)/i,
    keys: [], tag: null, stacking: true,
    apply: { via: 'dot', label: 'Decay', ticks: 5, tickMs: 1000 },
    applyText: (n, t) => `Each hit leaves the target [Decaying], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
  corroded: {
    label: 'Corroded', adj: 'corroded', dotRe: /\b(corro|acid)/i,
    keys: [], tag: null, stacking: true,
    apply: { via: 'dot', label: 'Corrosion', ticks: 5, tickMs: 1000 },
    applyText: (n, t) => `Each hit leaves the target [Corroded], dealing ${n} damage per tick for ${t} ticks; each further hit adds a stack.`,
    shapes: ['perStack', 'perCarrier', 'consume'],
  },
};

// ROUND 383 -- which condition a DOT is. The previous builder flagged that a 'Sear' or 'Decay' dot was read as
// Burning: WorldScene's statusKindForDot files every dot it does not recognise under 'burning' (it picks the icon),
// and the Burning pattern matched 'sear'. A dot is now read by its LABEL first, most specific condition first; the
// `kind` is trusted only where statusKindForDot recognised something ('bleeding' / 'poisoned' / 'shocked'), never its
// catch-all 'burning'.
const DOT_ORDER = ['seared', 'soaked', 'frostbitten', 'decaying', 'corroded', 'bleeding', 'poisoned', 'shocked', 'burning'];
const KIND_COND = { bleeding: 'bleeding', poisoned: 'poisoned', shocked: 'shocked' };
export function dotConditionOf(label, kind = null) {
  const L = String(label || '');
  if (L) for (const c of DOT_ORDER) { const re = CONDITIONS[c] && CONDITIONS[c].dotRe; if (re && re.test(L)) return c; }
  return (kind && KIND_COND[kind]) || null;
}

// The essences whose own kits trade in a condition. Only essences with a real,
// appliable condition are listed; an essence absent here gets nothing. Stone
// families are deliberately NOT listed: a fire stone in a Water kit is the
// stone's flavour, and the payoff is the ESSENCE's identity.
export const ESSENCE_CONDITIONS = {
  fire: 'burning',
  essBlood: 'bleeding',
  essIce: 'frozen',
  essCold: 'frozen',
  essSin: 'sin',
  essVenom: 'poisoned',
  essSnake: 'poisoned',
  essLightning: 'shocked',
  // ROUND 383 -- the radiant essences' Sear. Rank-gated (RANK_GATED_ESSENCES): "they don't all need to payoff at iron
  // rank but they should by silver". Moon (night light), Pure and Shimmer are light-family but do not burn.
  essLight: 'seared',
  essSun: 'seared',
  essStar: 'seared',
};
export const RANK_GATED_ESSENCES = new Set(['essLight', 'essSun', 'essStar']);

// ROUND 383 -- THE RANK GATE for the conditions added this round (the radiant essences and the stone families).
// A kit at silver or above holds at least one payoff for each such condition it carries; below silver each condition
// is a seeded roll at this chance. The roll is one number per kit and condition, so a payoff a kit holds at iron is
// still there at bronze and at silver (the chance only rises). Chosen over a rank-ladder rung because the payoff is a
// whole sentence on the card from the rank it appears, rather than a rung on one ability's ladder that the stone or
// essence never picked.
export const RANK_PAYOFF_CHANCE = { normal: 0.5, iron: 0.5, bronze: 0.75 };
export function rankPayoffChance(rank) {
  const c = RANK_PAYOFF_CHANCE[rank || 'iron'];
  return c == null ? 1 : c;   // silver, gold, diamond
}

export const COND_RADIUS = 192;   // 6 tiles (TILE = 32)
const RADIUS_TILES = 6;

// The numbers each shape pays. Fixed percentages, so rank scaling of `base`
// leaves the sentence true.
export const SHAPES = {
  perCarrier: { per: 0.10, max: 0.40 },
  perStack: { per: 0.08, max: 0.40 },
  consume: { per: 0.20, max: 1.0, flat: 0.6 },
  healPer: { per: 0.02, max: 0.10 },
  shatter: { mult: 2 },
  // ROUND 384 -- the World Phoenix's payoff ("blessing ... Phoenix -> dodge/evade ones"): a timed dodge chance per
  // carrier near you, through the same _grantStatBuff('dodgeChance') the dodge lever uses.
  dodgePer: { per: 0.03, max: 0.12, dur: 4 },
};
// ROUND 384 -- "Not every single affliction or condition needs a payoff in a kit, but every kit that inflicts a
// condition should have a chance to roll a payoff." A condition the kit lays that its build plan (buildPlan.js) does
// not lean on rolls this chance, seeded per kit and condition; at most OFF_PLAN_CAP of them per kit ("Capping stone
// payoffs per kit ... acceptable as additional considerations and backups for synergy").
export const OFF_PLAN_CHANCE = 0.3;
export const OFF_PLAN_CAP = 2;
// ROUND 384 -- a plan theme no free attack can carry goes onto a kit-wide passive: "Your attacks deal 6% more damage
// to [Soaked] enemies" (paid on every blow, attackRoleMixin `_condAmpOnHit`).
export const PLAN_AMP_PCT = 0.06;

// Templates whose every hit runs through `_damageMonster` with the ability as
// `_rungHitCtx` (so `_roleOnHit` sees it). imbueStrike hands its effect to a
// LATER weapon swing and is left out; the confuse and weaken rings are about
// something other than their damage.
const HIT_TEMPLATES = new Set(['projectileBall', 'aoeRing', 'sunderStrike', 'volley', 'rangeStrike', 'breathCone',
  'chainStrike', 'corpseBlast', 'beam']);   // ROUND 392 -- a beam's ticks run with its cast as `_rungHitCtx`

/** The condition an essence trades in, or null. */
export function essenceCondition(essenceId) {
  const c = ESSENCE_CONDITIONS[essenceId];
  return c ? { id: c, ...CONDITIONS[c] } : null;
}

// ---------------------------------------------------------------- recognition
/** Does this dot (label, and kind where statusKindForDot recognised one) read as the condition? ROUND 383 */
function dotIs(cond, label, kind = null) {
  return !!CONDITIONS[cond] && dotConditionOf(label, kind) === cond;
}

/** Does a debuff key (with its definition) read as the condition? */
function debuffIs(cond, key, def) {
  const c = CONDITIONS[cond];
  if (!c) return false;
  if (c.keys.includes(key)) return true;
  if (c.tag && def && (def.tags || []).includes(c.tag) && (def.tags || []).includes('affliction')) return true;
  return false;
}

/**
 * Stacks of a condition on one creature: its affliction slot (when the label
 * reads as the condition) plus every matching debuff's stacks. `defOf` is
 * debuffs.conditionDef, passed in so this file imports nothing.
 */
export function essenceConditionStacks(m, cond, defOf) {
  if (!m) return 0;
  let n = 0;
  if (m.dot && (m.dot.ticksLeft == null || m.dot.ticksLeft > 0) && dotIs(cond, m.dot.label, m.dot.kind)) n += Math.max(1, m.dot.stacks || 1);
  for (const [k, v] of Object.entries(m.debuffs || {})) {
    if (!v) continue;
    if (debuffIs(cond, k, defOf ? defOf(k) : null)) n += Math.max(1, v.stacks || 1);
  }
  return n;
}

/** Take the condition off a creature; returns the stacks removed. */
export function consumeEssenceCondition(m, cond, defOf) {
  if (!m) return 0;
  let n = 0;
  if (m.dot && dotIs(cond, m.dot.label, m.dot.kind)) { n += Math.max(1, m.dot.stacks || 1); m.dot = null; }
  for (const k of Object.keys(m.debuffs || {})) {
    const v = m.debuffs[k];
    if (v && debuffIs(cond, k, defOf ? defOf(k) : null)) { n += Math.max(1, v.stacks || 1); delete m.debuffs[k]; }
  }
  return n;
}

/** Living enemies within `radius` of (x, y) carrying the condition. */
export function essenceConditionCount(monsters, x, y, cond, defOf, radius = COND_RADIUS) {
  let n = 0;
  for (const o of (monsters || [])) {
    if (!o || !o.alive) continue;
    if (Math.hypot((o.wx ?? o.x) - x, (o.wy ?? o.y) - y) > radius) continue;
    if (essenceConditionStacks(o, cond, defOf) > 0) n++;
  }
  return n;
}

/** Does this ability already lay the condition itself? */
export function abilityLaysCondition(a, cond, defOf) {
  if (!a) return false;
  if (a.dot && dotIs(cond, a.dot.label)) return true;
  for (const d of [a.debuff, a.synergyDebuff, ...(Array.isArray(a.debuffs) ? a.debuffs : [])]) {
    if (d && d.key && debuffIs(cond, d.key, defOf ? defOf(d.key) : null)) return true;
  }
  if (a.essCond && a.essCond.apply && a.essCond.cond === cond) return true;
  if (a.essCond2 && a.essCond2.apply && a.essCond2.cond === cond) return true;   // ROUND 384 -- the second payoff
  if (cond === 'frozen' && a.freezeCondition === 'freeze') return true;   // ROUND 388 -- a frost hold lays [Frozen]
  // An iron rung's "every hit leaves Burn behind" is live from the first rank.
  if ((a.rankAspects || []).some(r => r && r.rank === 'iron' && r.dot && dotIs(cond, r.dot.label))) return true;
  return false;
}

// ------------------------------------------------------------------- the text
const pct = (x) => Math.round(x * 100);

/** The card sentence for a payoff. */
export function payoffSentence(ec) {
  const c = CONDITIONS[ec.cond];
  if (!c) return '';
  const L = `[${c.label}]`;
  // "each [Burning] enemy" reads; "each [Sin] enemy" does not -- Sin is a noun.
  const each = c.noun ? `enemy carrying ${L}` : `${L} enemy`;
  switch (ec.shape) {
    case 'perCarrier':
      return `It deals ${pct(ec.per)}% more damage for each ${each} within ${RADIUS_TILES} tiles of you, up to +${pct(ec.max)}%.`;
    case 'perStack':
      return `It deals ${pct(ec.per)}% more damage for each stack of ${L} on the target, up to +${pct(ec.max)}%.`;
    case 'consume':
      return c.stacking
        ? `Against a ${L} target it consumes every stack, dealing ${pct(ec.per)}% more damage per stack, up to +${pct(ec.max)}%.`
        : `Against a ${L} target it ends the condition and deals ${pct(ec.flat)}% more damage.`;
    case 'healPer':
      return `Each use that hits heals you ${pct(ec.per)}% of your maximum health for each ${each} within ${RADIUS_TILES} tiles of you, up to ${pct(ec.max)}%.`;
    case 'shatter':
      return `Against a ${L} target it deals double damage and shatters the ice, ending the freeze.`;
    case 'dodgePer':   // ROUND 384
      return `Each use that hits gives you ${pct(ec.per)}% dodge chance for ${ec.dur || 4}s for each ${each} within ${RADIUS_TILES} tiles of you, up to ${pct(ec.max)}%.`;
    default: return '';
  }
}

/** ROUND 384 -- the kit-wide backup's sentence: "Your attacks deal 6% more damage to [Soaked] enemies." */
export function condAmpSentence(amp) {
  const c = CONDITIONS[amp && amp.cond];
  if (!c) return '';
  return `Your attacks deal ${pct(amp.pct)}% more damage to ${c.noun ? `enemies carrying [${c.label}]` : `[${c.label}] enemies`}.`;
}

/** The card sentence for the condition the payoff ability lays itself. */
export function applySentence(ec) {
  const c = CONDITIONS[ec.cond];
  if (!c || !ec.apply) return '';
  return c.applyText(ec.apply.dmgPerTick, ec.apply.ticks);
}

/** The stats-line fragment (statsLineFor appends it). */
export function essenceConditionStatsFragment(a, field = null) {
  // ROUND 384 -- an ability may carry a second payoff (`essCond2`); with no field named, both are on the line.
  if (!field && a && a.essCond2) return essenceConditionStatsFragment(a, 'essCond') + essenceConditionStatsFragment(a, 'essCond2');
  const ec = a && a[field || 'essCond'];
  if (!ec || !CONDITIONS[ec.cond]) return '';
  const lab = CONDITIONS[ec.cond].label;
  const near = CONDITIONS[ec.cond].noun ? `enemy with ${lab} near` : `${lab} enemy near`;
  const parts = [];
  if (ec.apply) {
    parts.push(ec.apply.via === 'dot' ? `+${ec.apply.dmgPerTick}×${ec.apply.ticks} ${lab}`
      : `${ec.apply.chance < 1 ? `${pct(ec.apply.chance)}% ` : ''}${lab} ${ec.apply.duration}s`);
  }
  switch (ec.shape) {
    case 'perCarrier': parts.push(`+${pct(ec.per)}% per ${near} (max +${pct(ec.max)}%)`); break;
    case 'perStack': parts.push(`+${pct(ec.per)}% per ${lab} stack (max +${pct(ec.max)}%)`); break;
    case 'consume': parts.push(CONDITIONS[ec.cond].stacking ? `consumes ${lab}: +${pct(ec.per)}%/stack (max +${pct(ec.max)}%)` : `ends ${lab}: +${pct(ec.flat)}%`); break;
    case 'healPer': parts.push(`heal ${pct(ec.per)}% max HP per ${near} (max ${pct(ec.max)}%)`); break;
    case 'shatter': parts.push(`×2 vs ${lab}, shatters`); break;
    case 'dodgePer': parts.push(`+${pct(ec.per)}% dodge ${ec.dur || 4}s per ${near} (max ${pct(ec.max)}%)`); break;   // ROUND 384
    default: break;
  }
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}

// --------------------------------------------------------------- generation
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Is this one of the essence's own damaging abilities a payoff may ride? */
function eligible(a, deals) {
  if (!a || a.canonKey || a.kind !== 'active' || a.category !== 'attack') return false;
  if (!HIT_TEMPLATES.has(a.template)) return false;
  if (a.essCond) return false;
  try { return !!deals(a); } catch (e) { return false; }
}

// ROUND 388 -- THE PAYOFF FITS ITS HOST. The user, on Phoenix Convulsion (the Phoenix confluence's innate): "a phoenix
// ability directly from the phoenix essence with no awakening stone involved does fire damage that freezes enemies and
// is buffed by frozen enemies." The plan placed a kit theme (Frozen, from a cold essence elsewhere in the trio) on
// whichever free attack scored best -- `pref` only PREFERS a linked host, and with no linked attack free the fire
// innate scored 0 and still won; payOne then laid [Frozen] on it. (The same door relabelled a fire innate's Burn into
// Bleed for a bleeding theme.) A host must now have a reason to carry the condition: it already lays it, its own
// essence's condition is it (or the theme names its essence), its socketed stone lays it, or its element is the
// condition's element. Nothing else -- in particular no stone-less innate takes a condition alien to its essence.
export const COND_ELEMENTS = { burning: ['fire'], frozen: ['frost'], frostbitten: ['frost'], shocked: ['lightning'], seared: ['radiant'] };
export function conditionFitsHost(a, cond, { essenceId = null, stoneCond = null, themeEssences = null, defOf = null } = {}) {
  if (!a || !CONDITIONS[cond]) return false;
  if (abilityLaysCondition(a, cond, defOf)) return true;
  if (essenceId && (ESSENCE_CONDITIONS[essenceId] === cond || (themeEssences || []).includes(essenceId))) return true;
  if (stoneCond && stoneCond === cond) return true;
  const el = a.fallbackElement || a.element;
  return !!(el && (COND_ELEMENTS[cond] || []).includes(el));
}

/** ROUND 383 -- could this ability still take a payoff (an attack through the hit seam, none yet)? For tests/probes. */
export function canCarryPayoff(a, deals) { return eligible(a, deals); }

/**
 * The pass. Mutates `known` / `knownList` in place (cloning each ability it
 * touches, so a shared spec is never written into).
 *
 * @param helpers { deals, statsLineFor, defOf, salt, kitRank, stoneDotOf }
 *   ROUND 383: `kitRank` drives the rank gate (rankPayoffChance) and `stoneDotOf(stoneId)` returns the dot label a
 *   socketed stone lays (awakening STONE_THEMES), which names the stone's condition (dotConditionOf).
 * @returns a small report { [essenceId | 'stone:<cond>']: { cond, payoffs, applied, gated? } }
 */
export function applyEssenceConditionPayoffs(known, knownList, slotEssence, helpers) {
  const { deals, statsLineFor, defOf, salt = '', kitRank = 'iron', stoneDotOf = null, plan = null, isSpecial = null } = helpers || {};
  const report = {};
  const seen = new Set();
  // ROUND 383 -- the rank gate's roll, one per kit and condition source (see RANK_PAYOFF_CHANCE).
  const gatePasses = (tag) => (hash(`${salt}|${tag}|rankgate`) / 4294967296) < rankPayoffChance(kitRank);
  const kitLaysCond = (cond) => Object.values(known).some(en => en && en.ability && abilityLaysCondition(en.ability, cond, defOf));
  // One payoff on one ability (the round-382 body, unchanged, lifted out so the stone pass can share it).
  const payOne = ([key, en], cond, shape0, order, rep, extra) => {
    const C = CONDITIONS[cond];
    const a0 = en.ability;
    // ROUND 384 -- "abilities that inflict multiple options for payoff are totally fine, especially where an
    // intersection of essence and awakening stones call for it": an ability that already pays takes the second as
    // `essCond2` (never relabelling its dot, which is the first condition's).
    const field = a0.essCond ? 'essCond2' : 'essCond';
    const selfLays = abilityLaysCondition(a0, cond, defOf);
    const needsApply = !rep._kitLays && !selfLays;
    // A payoff that USES UP the condition is not the one that has to lay it
    // for the whole kit: when this ability is the kit's only source, take
    // the next shape instead.
    let shape = shape0;
    // ...and the same when this ability is the only thing in the kit that lays it.
    const othersLay = Object.values(known).some(o => o && o.ability && o.ability !== a0 && abilityLaysCondition(o.ability, cond, defOf));
    if ((needsApply || !othersLay) && shape === 'consume') shape = order.find(s => s !== 'consume') || shape;
    // ROUND 384 -- a second payoff takes a different shape from the first, so the card reads as two things
    if (field === 'essCond2' && a0.essCond.shape === shape) {
      shape = order.find(x => x !== shape && !(x === 'consume' && (needsApply || !othersLay))) || shape;
    }
    const S = SHAPES[shape];
    const ec = { cond, shape, essence: extra && extra.essence || rep._essId, radius: COND_RADIUS };
    if (extra && extra.stone) ec.stone = extra.stone;   // ROUND 383 -- the stone whose family named the condition
    if (S.per != null) ec.per = S.per;
    if (S.max != null) ec.max = S.max;
    if (S.flat != null) ec.flat = S.flat;
    if (S.mult != null) ec.mult = S.mult;
    if (S.dur != null) ec.dur = S.dur;   // ROUND 384 -- dodgePer
    const a = { ...a0 };
    let desc = String(a.desc || '').trim();
    let relabel = null;
    // A dot of another kind on this ability would overwrite the condition in
    // the one affliction slot the moment it landed (the dot is applied after
    // the hit), so a Fire ability's lingering damage IS its burn.
    // ROUND 391 -- a confluence identity sheet's dot is the confluence's own ("weapon strikes applying blight shadow
    // damage" was a Volcano card): the payoff rides on it without renaming it.
    if (field === 'essCond' && !(extra && extra.keepDot) && !a0.confSheet && C.apply.via === 'dot' && a.dot && !dotIs(cond, a.dot.label)) {
      const old = String(a.dot.label || '');
      a.dot = { ...a.dot, label: C.apply.label };
      relabel = old ? [new RegExp(`\\b${old}\\b`, 'g'), C.apply.label] : null;
      if (old) desc = desc.replace(new RegExp(`\\b${old}\\b`, 'g'), C.apply.label).replace(new RegExp(`\\b${old.toLowerCase()}\\b`, 'g'), C.apply.label.toLowerCase());
    }
    // Relabelled above, the ability now lays the condition through its own dot.
    if (needsApply && !abilityLaysCondition(a, cond, defOf)) {
      if (C.apply.via === 'dot') {
        ec.apply = { via: 'dot', label: C.apply.label, dmgPerTick: Math.max(2, Math.round((a.base || 6) * 0.25)), ticks: C.apply.ticks, tickMs: C.apply.tickMs };
      } else {
        ec.apply = { via: 'debuff', key: C.apply.key, duration: C.apply.duration, chance: C.apply.chance ?? 1 };
      }
    }
    if (needsApply) { rep._kitLays = true; rep.applied = true; }
    a[field] = ec;
    const add = [ec.apply ? applySentence(ec) : '', payoffSentence(ec)].filter(Boolean).join(' ');
    a.desc = `${desc}${desc ? ' ' : ''}${add}`;
    // The fragment goes into the line the ability already has (ahead of its cost), rather than rebuilding the
    // line: a few earlier passes hand-edit `stats`. statsLineFor carries the same fragment for "Numbers now".
    const frag = essenceConditionStatsFragment(a, field).replace(/^ · /, '');
    if (a0.stats && frag) {
      const parts = String(a0.stats).split(' · ');
      const last = parts[parts.length - 1] || '';
      const isCost = a.cost && new RegExp(`^${a.cost.amount} ${a.cost.type}`).test(last.trim());
      if (isCost) parts.splice(parts.length - 1, 0, frag); else parts.push(frag);
      a.stats = parts.join(' · ');
      if (relabel) a.stats = a.stats.replace(relabel[0], relabel[1]);
    } else if (statsLineFor) { try { a.stats = statsLineFor(a); } catch (e) { /* keep the old line */ } }
    const at = knownList ? knownList.indexOf(a0) : -1;
    en.ability = a;
    if (at >= 0) knownList[at] = a;
    rep.payoffs.push({ key, name: a.name, shape, ...(field === 'essCond2' ? { second: true } : {}) });
  };
  const shapeOrder = (tag, cond) => {
    const shapes = CONDITIONS[cond].shapes.slice();
    const rot = hash(`${salt}|${tag}|shape`) % shapes.length;
    return shapes.slice(rot).concat(shapes.slice(0, rot));
  };
  const finish = (rep) => { delete rep._kitLays; delete rep._essId; return rep; };
  // ROUND 384 -- THE BUILD PLAN replaces round 383's "every condition by silver". The user: "This should focus on 2-3
  // payoffs based on the essences, synergy between the essences, and be influenced by the astral blessing ... Not
  // every single affliction or condition needs a payoff in a kit, but every kit that inflicts a condition should have
  // a chance to roll a payoff." The plan's themes (buildPlan.js) are placed at every rank; every other condition the
  // kit inflicts rolls OFF_PLAN_CHANCE (at most OFF_PLAN_CAP); a theme no attack can carry is returned in
  // `report.ampPending` for the kit-wide passive (applyPlanAmps).
  if (plan) return placePlan(plan);
  function placePlan(plan) {
    const ents = () => Object.entries(known).filter(([, en]) => en && en.ability);
    const condsOf = (a) => [a.essCond, a.essCond2].filter(Boolean).map(e => e.cond);
    const paidN = (cond) => ents().filter(([, en]) => condsOf(en.ability).includes(cond)).length;
    const stoneCondOf = (en) => {
      let lab = null; try { lab = en.stoneId && stoneDotOf ? stoneDotOf(en.stoneId) : null; } catch (e) { lab = null; }
      return lab ? dotConditionOf(lab) : null;
    };
    const essOf = (en) => en.essenceId || en.ability.essenceId || null;
    const special = (a) => (isSpecial ? !!isSpecial(a) : !!(a.special || a.requiresWeapon));
    const AREA = new Set(['aoeRing', 'breathCone', 'volley', 'chainStrike', 'corpseBlast']);
    const layers = (cond) => ents().filter(([, en]) => abilityLaysCondition(en.ability, cond, defOf)).length;
    const planConds = new Set(plan.themes.map(t => t.cond));
    const ownCond = (en) => (en.ability.dot ? dotConditionOf(en.ability.dot.label) : null) || stoneCondOf(en);
    const laidElsewhere = (cond, en) => ents().some(([, o]) => o !== en && abilityLaysCondition(o.ability, cond, defOf));
    // the intersection: an attack whose own dot (or stone) is ANOTHER theme's condition, carrying this theme too --
    // it keeps its dot (no relabel) when this theme's condition is laid elsewhere in the kit. "abilities that inflict
    // multiple options for payoff are totally fine, especially where an intersection of essence and awakening stones
    // call for it"
    const intersects = (en, t) => { const d = ownCond(en); return !!d && d !== t.cond && planConds.has(d) && laidElsewhere(t.cond, en); };
    const pref = (t, [, en]) => {
      const a = en.ability; let sc = 0;
      if ((t.essences || []).includes(essOf(en))) sc += 4;
      if (stoneCondOf(en) === t.cond) sc += 3;
      if (abilityLaysCondition(a, t.cond, defOf)) sc += 2;
      if (intersects(en, t)) sc += 2;
      if (t.carrier === 'special' && special(a)) sc += 3;
      if (t.carrier === 'spell' && !special(a)) sc += 3;
      if (t.carrier === 'area' && AREA.has(a.template)) sc += 3;
      return sc;
    };
    // never one whose own dot is the kit's only source of another condition (relabelling would take it off the kit)
    const free = (en, t) => {
      const d = en.ability.dot ? dotConditionOf(en.ability.dot.label) : null;
      return !d || d === t.cond || layers(d) > 1 || intersects(en, t);
    };
    // ROUND 388 -- and the host must fit the condition (conditionFitsHost): no theme lands on an alien attack.
    const fits = (en, t) => conditionFitsHost(en.ability, t.cond, { essenceId: essOf(en), stoneCond: stoneCondOf(en), themeEssences: t.essences, defOf });
    const pickFor = (t, tag) => ents().filter(([, en]) => eligible(en.ability, deals) && free(en, t) && fits(en, t))
      .map(e => [e, pref(t, e)])
      .sort((x, y) => (y[1] - x[1]) || (hash(`${salt}|${tag}|${x[0][1].ability.name}`) - hash(`${salt}|${tag}|${y[0][1].ability.name}`)))
      .map(x => x[0])[0] || null;
    // the second payoff: an attack already paying on another theme whose own dot, stone or essence calls for this
    // condition, when it lays the condition itself or the kit lays it elsewhere (a creature has one affliction slot,
    // and on this attack it is the first condition's).
    const secondHost = (t) => ents().find(([, en]) => {
      const a = en.ability;
      if (!a.essCond || a.essCond2 || a.canonKey || a.essCond.cond === t.cond || !planConds.has(a.essCond.cond)) return false;
      const calls = ownCond(en) === t.cond || stoneCondOf(en) === t.cond || (t.essences || []).includes(essOf(en));
      if (!calls) return false;
      return abilityLaysCondition(a, t.cond, defOf) || laidElsewhere(t.cond, en) || CONDITIONS[t.cond].apply.via !== 'dot';
    }) || null;
    const out = { plan: true, ampPending: [] };
    const planned = new Set(plan.themes.map(t => t.cond));
    for (const t of plan.themes) {
      if (!CONDITIONS[t.cond]) continue;
      const tag = `plan|${t.cond}`;
      const rep = { cond: t.cond, payoffs: [], applied: false, theme: true, _kitLays: kitLaysCond(t.cond), _essId: (t.essences || [])[0] || null };
      if (paidN(t.cond)) { rep.held = true; out[`plan:${t.cond}`] = finish(rep); continue; }   // already paid (an earlier stage's lock)
      const order = (t.shapes || CONDITIONS[t.cond].shapes).filter(x => SHAPES[x]);
      const host = secondHost(t) || pickFor(t, tag);
      if (!host) { rep.noCarrier = true; out.ampPending.push(t.cond); out[`plan:${t.cond}`] = finish(rep); continue; }
      payOne(host, t.cond, order[0], order, rep, { essence: essOf(host[1]), stone: stoneCondOf(host[1]) === t.cond ? host[1].stoneId : undefined,
        keepDot: !host[1].ability.essCond && intersects(host[1], t) });
      out[`plan:${t.cond}`] = finish(rep);
    }
    // the intersection pass: an attack paying on one theme whose STONE or ESSENCE lays another theme's condition (a
    // Fire attack socketed with a blade stone: Burning, and Bleeding) takes that as a second payoff -- one a kit.
    for (const [k, en] of ents()) {
      const a = en.ability;
      if (!a.essCond || a.essCond2 || a.canonKey || !planConds.has(a.essCond.cond)) continue;
      // the stone's condition, or (a stone-theme payoff on an essence's attack) the essence's own
      const sc = stoneCondOf(en), ecd = ESSENCE_CONDITIONS[essOf(en)] || null;
      const c2 = [sc, ecd].find(c => c && c !== a.essCond.cond && planConds.has(c)) || null;
      if (!c2) continue;
      if (!(abilityLaysCondition(a, c2, defOf) || laidElsewhere(c2, en) || CONDITIONS[c2].apply.via !== 'dot')) continue;
      const t = plan.themes.find(x => x.cond === c2);
      const order = (t.shapes || CONDITIONS[c2].shapes).filter(x => SHAPES[x]);
      const rep = { cond: c2, payoffs: [], applied: false, theme: true, intersection: true, _kitLays: kitLaysCond(c2), _essId: null };
      payOne([k, en], c2, order[0], order, rep, { essence: essOf(en), stone: en.stoneId });
      out[`intersect:${c2}`] = finish(rep);
      break;
    }
    // everything else the kit inflicts: its essences' conditions, its stones' dots, anything an ability lays
    const inflicts = new Map();
    const bump = (c) => { if (c && CONDITIONS[c]) inflicts.set(c, (inflicts.get(c) || 0) + 1); };
    for (const e of (slotEssence || [])) bump(ESSENCE_CONDITIONS[e]);
    for (const [, en] of ents()) {
      bump(stoneCondOf(en));
      for (const c of Object.keys(CONDITIONS)) if (abilityLaysCondition(en.ability, c, defOf)) bump(c);
    }
    let extras = new Set(ents().flatMap(([, en]) => condsOf(en.ability)).filter(c => !planned.has(c))).size;
    for (const cond of [...inflicts.keys()].sort((x, y) => (inflicts.get(y) - inflicts.get(x)) || (x < y ? -1 : 1))) {
      if (planned.has(cond) || paidN(cond)) continue;
      const tag = `offplan|${cond}`;
      const rep = { cond, payoffs: [], applied: false, _kitLays: kitLaysCond(cond), _essId: null };
      if ((hash(`${salt}|${tag}`) / 4294967296) >= OFF_PLAN_CHANCE) { out[`extra:${cond}`] = { cond, payoffs: [], applied: false, rolled: false }; continue; }
      if (extras >= OFF_PLAN_CAP) { out[`extra:${cond}`] = { cond, payoffs: [], applied: false, capped: true }; continue; }
      const t = { cond, essences: (slotEssence || []).filter(e => ESSENCE_CONDITIONS[e] === cond), carrier: (plan.themes[0] || {}).carrier || null };
      const host = pickFor(t, tag);
      if (!host) { rep.noCarrier = true; out[`extra:${cond}`] = finish(rep); continue; }
      const order = shapeOrder(tag, cond);
      payOne(host, cond, order[0], order, rep, { essence: essOf(host[1]), stone: stoneCondOf(host[1]) === cond ? host[1].stoneId : undefined });
      extras++;
      out[`extra:${cond}`] = finish(rep);
    }
    return out;
  }
  for (const essId of (slotEssence || [])) {
    if (!essId || seen.has(essId)) continue;
    seen.add(essId);
    const cond = ESSENCE_CONDITIONS[essId];
    if (!cond) continue;
    // ROUND 383 -- the radiant essences' Sear waits on the rank gate: a coin at iron, certain from silver.
    if (RANK_GATED_ESSENCES.has(essId) && !gatePasses(essId)) { report[essId] = { cond, payoffs: [], applied: false, gated: true }; continue; }
    const own = Object.entries(known).filter(([, en]) => en && en.ability && (en.essenceId === essId || en.ability.essenceId === essId));
    const cands = own.filter(([, en]) => eligible(en.ability, deals))
      .sort((x, y) => hash(`${salt}|${essId}|${x[1].ability.name}`) - hash(`${salt}|${essId}|${y[1].ability.name}`));
    if (!cands.length) continue;
    // One when the essence brings one or two damaging abilities a payoff can
    // ride, two when it brings three or more -- the user's "not enough (or any)".
    const want = cands.length >= 3 ? 2 : 1;
    const order = shapeOrder(essId, cond);
    // Does the kit already lay the condition anywhere (any essence, any ability)?
    const rep = { cond, payoffs: [], applied: false, _kitLays: kitLaysCond(cond), _essId: essId };
    cands.slice(0, want).forEach((c, i) => payOne(c, cond, order[i % order.length], order, rep, null));
    report[essId] = finish(rep);
  }

  // ROUND 383 -- "Light and Sun (Sear) and the stone families have no condition payoffs yet. Yes, they don't all need
  // to payoff at iron rank but they should by silver." A socketed stone whose family lays a dot (a water stone's
  // Soak, a storm stone's Shock, a death stone's Decay ...) names a condition; the kit gets ONE payoff on it, on the
  // ability that stone made where that ability can carry one (else another ability of the same essence slot, else
  // any in the kit, so the silver guarantee holds). Not when the kit already pays on that condition (a fire stone in
  // a Fire kit). Through the rank gate: a seeded coin per condition below silver, certain from silver.
  if (stoneDotOf) {
    const byCond = new Map();
    for (const [key, en] of Object.entries(known)) {
      if (!en || !en.ability || !en.stoneId) continue;
      let lab = null; try { lab = stoneDotOf(en.stoneId); } catch (e) { lab = null; }
      const cond = lab ? dotConditionOf(lab) : null;
      if (!cond || !CONDITIONS[cond]) continue;
      if (!byCond.has(cond)) byCond.set(cond, []);
      byCond.get(cond).push([key, en]);
    }
    const paid = new Set(Object.values(known).filter(en => en && en.ability && en.ability.essCond).map(en => en.ability.essCond.cond));
    // The condition more of the kit's stones lay is placed first: a kit has only so many attacks a payoff can ride.
    for (const cond of [...byCond.keys()].sort((x, y) => (byCond.get(y).length - byCond.get(x).length) || (x < y ? -1 : 1))) {
      if (paid.has(cond)) continue;
      const tag = `stone|${cond}`;
      const rep = { cond, payoffs: [], applied: false, _kitLays: kitLaysCond(cond) };
      if (!gatePasses(tag)) { report[`stone:${cond}`] = { cond, payoffs: [], applied: false, gated: true }; continue; }
      const holders = byCond.get(cond);
      // never one whose own dot is another condition (relabelling it would take that condition off the kit)
      const free = (en) => { const d = en.ability.dot; const dc = d ? dotConditionOf(d.label) : null; return !dc || dc === cond; };
      const ord = (xs) => xs.filter(([, en]) => free(en)).sort((x, y) => hash(`${salt}|${tag}|${x[1].ability.name}`) - hash(`${salt}|${tag}|${y[1].ability.name}`));
      const slots = new Set(holders.map(([k]) => String(k).split(':')[0]));
      const stoneOfSlot = (k) => (holders.find(([hk]) => String(hk).split(':')[0] === String(k).split(':')[0]) || holders[0])[1].stoneId;
      let pick = ord(holders.filter(([, en]) => eligible(en.ability, deals)))[0] || null;
      if (!pick) pick = ord(Object.entries(known).filter(([k, en]) => en && en.ability && slots.has(String(k).split(':')[0]) && eligible(en.ability, deals)))[0] || null;
      // ROUND 388 -- the last resort (any attack in the kit) only takes one that fits the condition (conditionFitsHost).
      if (!pick) pick = ord(Object.entries(known).filter(([, en]) => en && en.ability && eligible(en.ability, deals)
        && conditionFitsHost(en.ability, cond, { essenceId: en.essenceId || en.ability.essenceId, defOf })))[0] || null;
      if (!pick) { rep.noCarrier = true; report[`stone:${cond}`] = finish(rep); continue; }   // no free attack left to ride
      const order = shapeOrder(tag, cond);
      const stone = pick[1].stoneId && byCond.get(cond).some(([k]) => k === pick[0]) ? pick[1].stoneId : stoneOfSlot(pick[0]);
      payOne(pick, cond, order[0], order, rep, { stone, essence: pick[1].essenceId || pick[1].ability.essenceId });
      paid.add(cond);
      report[`stone:${cond}`] = finish(rep);
    }
  }
  return report;
}


/**
 * ROUND 384 -- the backup: "putting a payoff that finds no free attack onto a kit-wide passive like 'Your attacks deal
 * 6% more damage to [Soaked] enemies'". Each pending plan condition goes onto one passive (a non-canon one, the
 * theme's essence's first), as `condAmps` -- folded into passiveMods.condAmps and paid on every blow
 * (attackRoleMixin `_condAmpOnHit`). Returns the conditions it could not host.
 */
export function applyPlanAmps(known, knownList, conds, { plan = null, statsLineFor = null } = {}) {
  const left = [];
  for (const cond of (conds || [])) {
    if (!CONDITIONS[cond]) continue;
    if (Object.values(known).some(en => en && en.ability && (en.ability.condAmps || []).some(x => x.cond === cond))) continue;   // one per kit (a lock keeps it)
    const t = plan && (plan.themes || []).find(x => x.cond === cond);
    const ess = (t && t.essences) || [];
    const hosts = Object.entries(known).filter(([, en]) => en && en.ability && en.ability.kind === 'passive' && !en.ability.canonKey
      && !(en.ability.condAmps || []).some(x => x.cond === cond))
      .sort((x, y) => ((ess.includes(y[1].essenceId) ? 1 : 0) - (ess.includes(x[1].essenceId) ? 1 : 0))
        || ((x[1].ability.condAmps || []).length - (y[1].ability.condAmps || []).length) || (x[0] < y[0] ? -1 : 1));
    if (!hosts.length) { left.push(cond); continue; }
    const [, en] = hosts[0];
    const a0 = en.ability;
    const amp = { cond, pct: PLAN_AMP_PCT };
    const a = { ...a0, condAmps: [...(a0.condAmps || []), amp] };
    const desc = String(a0.desc || '').trim();
    a.desc = `${desc}${desc ? ' ' : ''}${condAmpSentence(amp)}`;
    const frag = `+${pct(amp.pct)}% vs [${CONDITIONS[cond].label}]`;
    a.stats = a0.stats ? `${a0.stats} · ${frag}` : (statsLineFor ? (() => { try { return statsLineFor(a); } catch (e) { return frag; } })() : frag);
    const at = knownList ? knownList.indexOf(a0) : -1;
    en.ability = a;
    if (at >= 0) knownList[at] = a;
  }
  return left;
}
