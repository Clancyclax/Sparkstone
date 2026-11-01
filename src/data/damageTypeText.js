// ===========================================================================
// ROUND 383 -- EVERY BLOW SAYS WHAT IT IS MADE OF.
//
// The user: "Every single attack or damaging spell in the game should call out
// what type of damage it deals. Physical, Blood, Fire, Ice, Dimension, etc. It
// might deal physical damage and trigger a different type of damage such as
// bleed, or it deals lightning damage but inflicts a condition that deals holy
// damage."
//
// ONE POST-PASS, run last on a built kit (and on the card's rank lines and the
// "Numbers now" line), that writes the type in front of every dealt-damage
// figure that does not already carry one: "deals 12 damage" -> "deals 12 fire
// damage", "8 dmg" -> "8 fire dmg". It never doubles a word ("fire fire
// damage") because a figure that already names a type is left alone.
//
// THE TYPE IS THE ONE THE RUNTIME DEALS, not a flavour word:
//   the hit      WorldScene `_specElement(a)`: the spec's element when it is a
//                real damage type, otherwise untyped -- which armour answers,
//                i.e. physical. A special attack that requires a weapon names
//                that weapon's own type (slashing / blunt / piercing, from
//                WEAPON_DAMAGE_TYPE), because those three are "physical damage
//                with a name" that armour answers exactly like untyped damage
//                (stats.js damageMitigationKind). A staff's `arcane` is NOT
//                used: the runtime does not resist-mitigate a staff special.
//   a condition  the condition's own `element` (debuffs.js / afflictions.js),
//                which the debuff engine hands to `_damageMonster` per tick.
//   a spec dot   (`a.dot`, "applies frostbite, dealing 2 damage per tick") --
//                the runtime ticks it as raw health loss, so its type is the
//                condition it is named for: Bleed is the [Bleeding] condition's
//                physical, Burn is [Burning]'s fire, Blight is [Blighted]'s
//                shadow, and the family labels (Soak, Wither, Sear, Corrosion)
//                are their stone family's channel (essenceLevers STONE_ELEMENTS).
//   an escort / familiar / summoned ally -- their blows reach `_damageMonster`
//                with no element, so physical.
//   a triggered "bolt to the next nearest enemy" -- lightning (the runtime
//                passes it since this round; it was untyped before).
//
// Canon abilities are EXACT and are never touched.
// ===========================================================================
import { DAMAGE_TYPES, ELEMENT_TYPES, damageMitigationKind } from './stats.js';
import { weaponDamageType } from './weapons.js';
import { conditionByLabel, conditionDef, hasTag } from './debuffs.js';

/** WorldScene `_specElement`, byte for byte in logic: null means untyped (physical, armour answers it). */
export function runtimeElement(a) {
  // ROUND 384 -- `damageType` (combatTypes.js) is the hit's own one of the 28 and wins over the channel, as in WorldScene.
  const el = a && (a.damageType || a.element);
  if (!el || el === 'physical') return null;
  return (ELEMENT_TYPES.includes(el) || DAMAGE_TYPES[el]) ? el : null;
}

/** The word printed for a damage type key: "fire", "resonating-force" (canon's own hyphenation). */
export function typeWord(key) {
  const d = DAMAGE_TYPES[key];
  return String((d && d.label) || key || 'physical').toLowerCase().replace(/\s+/g, '-');
}

/** Every word that already names a type, so a figure carrying one is left alone. */
const TYPE_WORDS = new Set([...Object.keys(DAMAGE_TYPES).map(typeWord), ...Object.keys(DAMAGE_TYPES), 'holy', 'unholy', 'elemental', 'magical', 'typed', 'untyped']);
// The generator's ELEMENT_PHRASE writes "force" for physical and "light" for radiant ("Hits the first thing in
// its path for 3 force damage"). Neither is the type dealt: `force` is not a damage type at all and `light` is a
// DIFFERENT one from the radiant the runtime deals. These two are corrected rather than kept.
const SUBSTITUTE_WORDS = new Set(['force', 'light']);

/** The type key of the ability's own hit. */
export function hitTypeKey(a) {
  // An imbued strike swings the real weapon swing (`_doPlayerAttack`, "a swing is physical"): the ability's element
  // rides on its dot, not on the blow.
  const rt = a && a.template === 'imbueStrike' ? null : runtimeElement(a);
  if (rt) return rt;
  const w = a && a.requiresWeapon;
  if (w && w !== 'any' && w !== 'unarmed') {
    const t = weaponDamageType(w);
    if (t && damageMitigationKind(t) === 'armour') return t;
  }
  return 'physical';
}

// A spec dot's label -> the condition it is, or its stone family's channel (STONE_ELEMENTS / FAMILY_TRAITS).
const DOT_LABEL_TYPE = {
  bleed: 'bleed', bleeding: 'bleed', burn: 'burn', burning: 'burn', venom: 'poison', poison: 'poison',
  blight: 'unholy', blighted: 'unholy', shock: 'shocked', shocked: 'shocked',
};
const DOT_FAMILY_TYPE = {
  frostbite: 'frost', soak: 'frost', decay: 'shadow', wither: 'shadow', sear: 'radiant', corrosion: 'nature',
};
/** The type key a spec dot's ticks are named as. */
export function dotTypeKey(dot, a = null) {
  if (!dot) return null;
  if (dot.element && (DAMAGE_TYPES[dot.element] || ELEMENT_TYPES.includes(dot.element))) return dot.element;
  const l = String(dot.label || '').toLowerCase().trim();
  const ck = DOT_LABEL_TYPE[l];
  const def = ck ? conditionDef(ck) : conditionByLabel(dot.label);
  if (def && def.element) return def.element;
  if (DOT_FAMILY_TYPE[l]) return DOT_FAMILY_TYPE[l];
  return a ? hitTypeKey(a) : 'physical';
}

/** A condition that deals damage, and the type the runtime ticks it as. */
export function conditionDamageType(def) {
  if (!def) return null;
  const ticks = def.tickEvery > 0 && (hasTag(def, 'affliction') || hasTag(def, 'dot'));
  if (!ticks && !def.damageOnApplyPerStack && !def.hurtOnBenefit) return null;
  return def.element || 'physical';
}

const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const close = (n, v) => v !== null && Math.abs(n - v) < 0.51;
// A figure that is a shield, a resistance or a cap, not damage dealt.
const NOT_DEALT_BEFORE = /(?:\b(?:absorb\w*|soak\w*|stops?|blocks?|negat\w*|ignor\w*|reduc\w*|prevent\w*|resist\w*|off|less|next|first|least)(?:\s+(?:up to|the next|the first))?|\b(?:over|above|below|every))\s*$/i;
const NOT_DEALT_AFTER = /^\s*(?:taken|you take|you would take|incoming|is spent|it stops)/i;
const SUMMON_WORDS = /\b(?:escort\w*|familiar\w*|summon\w*|spirits?|wraiths?|constructs?|homunculi|hounds?|vermin|raptors?|phantoms?|doubles of you|guardians?|serpents?|restless dead|motes?|vines|wardens?|archers?|skeleton|ally|allies|companion\w*|beast|creature|it fights|fights? (?:beside|for) you|bird|turret)\b/i;

/** The damaging condition labels a sentence names, as [{ at, type }]. */
function sentenceConditions(s) {
  const out = [];
  for (const m of s.matchAll(/\[([^\]]+)\]/g)) {
    const t = conditionDamageType(conditionByLabel(m[1]));
    if (t) out.push({ at: m.index, end: m.index + m[0].length, type: t, label: m[1] });
  }
  return out;
}

/**
 * Which type a figure in this sentence is, from the spec. `n` is the figure, `before`/`after` the sentence text
 * either side of it.
 */
function tickingAfter(after) {
  return /^\s*(?:(?:[a-z-]+\s+)?(?:damage|dmg)\s+)?(?:a|per|each|every)\s+(?:tick|second)\b/i.test(after)
    || /\bticks? of\b/i.test(after) || /\bper tick\b/i.test(after.slice(0, 30));
}
export function figureTypeKey(a, n, before, after, sentence) {
  const ticking = tickingAfter(after);
  const conds = sentenceConditions(sentence);
  const condBefore = conds.filter(c => c.end <= before.length);
  if (ticking) {
    if (condBefore.length) return condBefore[condBefore.length - 1].type;
    if (a.dot) return dotTypeKey(a.dot, a);
    if (conds.length) return conds[0].type;
    return hitTypeKey(a);
  }
  // "...inflicts [Judged], dealing 5 damage on application" -- a figure after a damaging condition's name is its own.
  if (condBefore.length && /\]\s*(?:,|--|—)?\s*(?:dealing|which deals|that deals|deals)\s+$/i.test(before)) return condBefore[condBefore.length - 1].type;
  const dotLabel = a.dot && a.dot.label ? String(a.dot.label).toLowerCase() : null;
  if (dotLabel && close(n, num(a.dot.dmgPerTick)) && !close(n, num(a.base)) && sentence.toLowerCase().includes(dotLabel)) return dotTypeKey(a.dot, a);
  // An escort's or a familiar's blow reaches the damage path with no element (WorldScene `_updateFamiliars`), so
  // physical. A summoned creature, trap or turret is NOT one of these: `_spawnSummon` stamps `_specElement(a)` on it.
  const minion = [num(a.escort && a.escort.dmg), num(a.familiarDmg)];
  if (minion.some(v => close(n, v)) && (!close(n, num(a.base)) || SUMMON_WORDS.test(sentence))) return 'physical';
  if (a.escort && /\bescort\b/i.test(sentence) && /\bstrik\w*\b[^.;]*$/i.test(before)) return 'physical';
  // A triggered bolt at the next nearest enemy is lightning (WorldScene `boltNearest`) -- ROUND 392 -- unless the
  // ability types it (`effect.element`: a confluence sheet's molten rock, earth tremor, poison spit).
  const e = a.effect;
  if (e && e.kind === 'boltNearest' && close(n, num(e.damage)) && /nearest/i.test(sentence)) return e.element || 'lightning';
  // The weapon's own type names the weapon's blow; a rider off an untyped special (a trap, a ground line) is plain physical.
  const hit = hitTypeKey(a);
  if (!runtimeElement(a) && hit !== 'physical' && !close(n, num(a.base))) return 'physical';
  return hit;
}

// "<figure>[ extra][ <type>] damage|dmg". Up to two words between the figure and the noun; anything that is not a
// filler word or a type word means the figure is not a damage figure ("2.6 times its damage").
const FIGURE_RE = /(\d+(?:\.\d+)?)((?: [a-z][a-z-]*){0,2}) (damage|dmg)\b/gi;
const FILLER = new Set(['extra', 'additional', 'bonus', 'more']);
const BARE_RIDER_RE = /(\b(?:takes?|dealing|deals?) |\bfestering for )(\d+(?:\.\d+)?)((?=[.,;](?:\s|$))|(?= (?:to|on|around) (?:whatever|everything|every|anything|each|all)\b)|(?= (?:a|per|each|every) (?:tick|second)\b))/g;
const BARE_BLOW_RE = /\b(strik(?:es|ing)|strikes?|bitten|hits|hitting) for (\d+(?:\.\d+)?)(?= every\b|, at most\b| at most\b|\.(?:\s|$)|$| ·)/g;

/**
 * ROUND 392 -- ONE HIT OF TWO TYPES. "Let an entry's damage list of two types split the hit ... typed text naming both
 * ('12 fire and 12 earth damage')". `a.damageSplit` is [{ type, share }, { type, share }] (awakening.js
 * buildConfluenceSheetAbility); the hit's own figure is printed as its two parts, a card's "and", a stats line's "+".
 */
function splitFigureText(a, n, filler, noun, isStats) {
  const [p, q] = a.damageSplit;
  const n1 = Math.max(1, Math.round(n * p.share));
  const n2 = Math.max(1, Math.round(n - n1));
  const f = filler.length ? `${filler.join(' ')} ` : '';
  return `${n1} ${f}${typeWord(p.type)} ${isStats ? '+' : 'and'} ${n2} ${typeWord(q.type)} ${noun}`;
}
/** Is this figure the split hit's own (not a tick, a condition's, a minion's)? */
function isSplitHit(a, n, pre, after, s) {
  if (!a.damageSplit || a.damageSplit.length !== 2 || !close(n, num(a.base))) return false;
  if (tickingAfter(after)) return false;
  return figureTypeKey(a, n, pre, after, s) === hitTypeKey(a);
}

/** Types every dealt-damage figure in `text` (a desc, a rank line or a stats line) for ability `a`. */
export function typeDamageText(a, text, { stats = null } = {}) {
  if (!a || !text || a.canonKey) return text;
  const str = String(text);
  const isStats = stats === null ? (str.includes(' · ') || /\bdmg\b/.test(str)) : !!stats;
  // Sentences for a card, segments for a stats line.
  const parts = isStats && !/[.!?]\s/.test(str) ? str.split(/( · )/) : str.split(/((?<=[.!?])\s+)/);
  return parts.map((s0) => {
    if (!/\d/.test(s0)) return s0;
    // A blow with no noun: "striking for 4 every 1.4s", "is bitten for 3, at most once every 1s".
    const s = s0.replace(BARE_BLOW_RE, (m, verb, n, off) => {
      const after = s0.slice(off + m.length);
      return `${verb} for ${n} ${typeWord(figureTypeKey(a, Number(n), s0.slice(0, off + m.length - n.length), after, s0))} ${isStats ? 'dmg' : 'damage'}`;
    });
    // A rider figure with no noun at all, on a card: "the first thing within 2 tiles of it takes 4.", "dealing 2 to
    // whatever stands in it", "left festering for 1 a tick".
    const s2 = isStats ? s : s.replace(BARE_RIDER_RE, (m, lead, n, tail, off) => {
      const after = s.slice(off + m.length - tail.length);
      return `${lead}${n} ${typeWord(figureTypeKey(a, Number(n), s.slice(0, off + lead.length), after, s))} damage${tail}`;
    });
    if (!/\b(?:damage|dmg)\b/i.test(s2)) return s2;
    return s2.replace(FIGURE_RE, (m, n, words, noun, off) => {
      const pre = s.slice(0, off);
      if (/[%×x+\-\d.]$/.test(pre) || /×\s*$/.test(pre)) return m;
      if (NOT_DEALT_BEFORE.test(pre)) return m;
      const after = s.slice(off + m.length);
      if (NOT_DEALT_AFTER.test(after)) return m;
      const ws = words.trim() ? words.trim().split(' ') : [];
      const typed = ws.filter(w => TYPE_WORDS.has(w.toLowerCase()));
      const subs = ws.filter(w => SUBSTITUTE_WORDS.has(w.toLowerCase()));
      if (ws.some(w => !FILLER.has(w.toLowerCase()) && !TYPE_WORDS.has(w.toLowerCase()) && !SUBSTITUTE_WORDS.has(w.toLowerCase()))) return m;
      // ROUND 392 -- the split hit's own figure (untyped, or typed with its first type) prints both parts.
      if (a.damageSplit && (!typed.length || (typed.length === 1 && [typeWord(a.damageSplit[0].type), typeWord(a.element || 'physical')].includes(typed[0].toLowerCase())))
        && isSplitHit(a, Number(n), pre, after, s)) {
        return splitFigureText(a, Number(n), ws.filter(w => FILLER.has(w.toLowerCase())), noun, isStats);
      }
      // ROUND 384 -- a figure typed with the CHANNEL word ("3 frost damage") on an ability whose hit is now a finer
      // type (water) is re-named to what the runtime deals; any other typed figure (a condition's, a tick's) is kept.
      if (typed.length && !subs.length && a.damageType && typed.length === 1 && typed[0].toLowerCase() === typeWord(a.element || 'physical')) {
        const now = typeWord(figureTypeKey(a, Number(n), pre, after, s));
        if (now === typed[0].toLowerCase()) return m;
        return m.replace(new RegExp(`\\b${escRe(typed[0])}\\b`), now);
      }
      if (typed.length && !subs.length) return m;   // already typed: never doubled
      const want = typeWord(figureTypeKey(a, Number(n), pre, after, s));
      const keep = ws.filter(w => FILLER.has(w.toLowerCase()));
      return `${n}${keep.length ? ' ' + keep.join(' ') : ''} ${want} ${noun}`;
    });
  }).join('').replace(/\[([^\]]+)\](?![^.]*?\b(?:[a-z-]+) damage\b)/g, (m, label, off, whole) => {
    // A damaging condition named with no figure ("a 25% chance of [Judged] for 4s") says its type once.
    if (isStats) return m;
    // Only where the sentence LAYS it ("a 25% chance of [Judged]", "applies [Bleeding]"), not where a payoff merely
    // reads it ("for each stack of [Bleeding] on the target").
    const lead = whole.slice(Math.max(0, whole.lastIndexOf('.', off) + 1), off);
    if (!/(?:chance (?:of|to)|\bappl\w*|\binflict\w*|\bleft|\bleaves?|\bsets?(?: \w+)?|\bIt also|\bafflict\w*|\bbeing|\bwith)\s*$/i.test(lead)) return m;
    const t = conditionDamageType(conditionByLabel(label));
    if (!t) return m;
    const next = whole.slice(off + m.length, off + m.length + 40);
    if (/^\s*\(/.test(next)) return m;
    const sentenceEnd = whole.indexOf('.', off + m.length);
    const rest = whole.slice(off + m.length, sentenceEnd < 0 ? undefined : sentenceEnd);
    if (new RegExp(`\\b${escRe(typeWord(t))} damage\\b`, 'i').test(rest)) return m;
    return `${m} (${typeWord(t)} damage over time)`;
  });
}

/** Does the card already name the type of the ability's own blow (not a tick, not a condition's)? */
function hitNamed(a, desc) {
  const word = escRe(typeWord(a.familiarDmg > 0 && !(a.base > 0) ? 'physical' : hitTypeKey(a)));
  // ROUND 392 -- a split hit names its first type and then its second ("6 fire and 6 earth damage").
  if (a.damageSplit && a.damageSplit.length === 2
    && new RegExp(`\\b${escRe(typeWord(a.damageSplit[0].type))} (?:and|\\+) \\d+(?:\\.\\d+)? ${escRe(typeWord(a.damageSplit[1].type))} (?:damage|dmg)\\b`, 'i').test(desc)) return true;
  return new RegExp(`(?<!ongoing )\\b${word} (?:damage|dmg)\\b(?!\\s+(?:a|per|each|every)\\s+(?:tick|second)| over time)`, 'i').test(desc);
}
const NO_HIT_TEMPLATES = new Set(['corpseMiasma', 'corpseDrain', 'weaponAffinity', 'weaponMight', 'summonGear', 'summonWeapon']);
/**
 * A damaging card whose sentences never give the blow a figure ("A heavy blow that reduces the target's armour by
 * 19% for 5s.", "A field around you that ... hits back at whatever attacks you") says the type once, plainly.
 */
export function withHitClause(a, desc) {
  if (!a || a.canonKey || !desc || hitNamed(a, desc)) return desc;
  if (a.vehicleId || a.mount || NO_HIT_TEMPLATES.has(a.template)) return desc;
  const word = typeWord(hitTypeKey(a));
  if (a.retaliate > 0 && /hits back at whatever attacks you(?! with)/.test(desc)) {
    return desc.replace(/hits back at whatever attacks you(?! with)/, `hits back at whatever attacks you with ${word} damage`);
  }
  let clause = null;
  if (typeof a.base === 'number' && a.base > 0 && (a.kind === 'active' || a.category === 'attack')) clause = `It deals ${Math.round(a.base)} ${word} damage.`;
  else if (a.template === 'imbueStrike') clause = `The strike deals ${word} damage.`;
  else if (a.familiarDmg > 0 && a.template === 'summonBonded') clause = `It strikes for ${Math.round(a.familiarDmg)} physical damage.`;
  // A summoned creature carries the ability's own element (`_spawnSummon` stamps `_specElement(a)`).
  else if (a.summonDmg > 0 && /\b(?:fights?|strikes?|attacks?|bites?)\b/i.test(desc)) clause = `It strikes for ${Math.round(a.summonDmg)} ${word} damage.`;
  if (!clause) return desc;
  // After the opening sentence: that sentence says what the ability is, this one what its blow deals.
  const m = String(desc).match(/^(?:[^.!?]|\.(?=\d))*[.!?](?:\s+|$)/);
  if (!m) return `${String(desc).replace(/\s*$/, '')} ${clause}`;
  return `${m[0].replace(/\s*$/, '')} ${clause}${desc.length > m[0].length ? ' ' + desc.slice(m[0].length) : ''}`;
}

/** The post-pass: types the desc and the stats line of every non-canon ability in a built kit. */
export function applyDamageTypeCallouts(known) {
  for (const en of Object.values(known || {})) {
    const a = en && en.ability;
    if (!a || a.canonKey) continue;
    const desc = withHitClause(a, typeDamageText(a, a.desc, { stats: false })), stats = typeDamageText(a, a.stats, { stats: true });
    if (desc === a.desc && stats === a.stats) continue;
    en.ability = { ...a, desc, stats };
  }
  return known;
}
