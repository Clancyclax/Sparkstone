// ===========================================================================
// ROUND 392 -- RIDERS ON THE FOUR ONE-NUMBER TEMPLATES.
//
// Every one of the twenty confluence sheets listed the same four gaps: `unarmedFocus` was "+X% while both hands are
// empty", `weaponAffinity` was reach and/or speed, `summonArmor`'s thorns were untyped and laid nothing, and
// `summonGear` was crit chance, crit damage and life on kill. The user: "a conjured armour that burns attackers / lays a
// condition on whoever strikes you / grants a resistance; obsidian weapons that ignore armour or lay a condition;
// unarmed strikes that lay a condition, stagger, or splash; weapon affinity that adds a typed rider or a condition to
// that weapon's hits; gear that grants a triggered effect."
//
// A RIDER is one line of data on the ability (`effectRiders: [ ... ]`): WHEN it fires (`on`, an optional `when` gate, a
// chance, an internal cooldown) and WHAT it does (a condition, a typed share of the blow, a splash, a knockback, an
// armour strip, a heal, a resource, a ward, a cooldown refund ...). The sheet authors it in `mech.effectRiders` with a sheet
// condition's id; `resolveRiders` turns that into the runtime shape (the condition's registry key and a duration in
// its band) when the entry is built. What scopes it is the template:
//
//   unarmedFocus   bare-handed blows, and blows that land on you while both hands are empty
//   weaponAffinity strikes with that weapon, and blows that land on you while you hold it
//   summonArmor    anything, while the conjured piece is worn
//   summonGear     anything, while the conjured trinket is carried (worn)
//
// The runtime is src/scenes/gearRiderMixin.js. The card sentence is `riderSentence` (it states the mechanic, never
// compares), the numbers line `riderStatsLine`, and the validator's field check `riderFaults`.
//
// Also here: `summonArmor.thornsElement` (typed thorns -- "molten armour that burns attackers"), and the vocabulary
// the validator needs for `summonRole` pins and a triggered bolt's `element`.
// ===========================================================================
import { TILE } from './iso.js';

export const RIDER_TEMPLATES = ['unarmedFocus', 'weaponAffinity', 'summonArmor', 'summonGear'];
/** What fires a rider. */
export const RIDER_ON = ['hit', 'crit', 'nth', 'kill', 'struck', 'block', 'dodge', 'interval', 'trail'];
/** An optional gate on top of `on`. */
export const RIDER_WHEN = ['still', 'moving', 'afterMove', 'first', 'lowTarget', 'lowSelf', 'behind', 'carrying', 'firstInFight'];
export const RIDER_AT = ['target', 'nearest', 'around'];
export const RIDER_FROM = ['melee', 'ranged', 'any'];
/** The stat buffs a rider may grant for a few seconds (WorldScene `_grantStatBuff`'s bag, read by `_statBuff`). */
export const RIDER_BUFF_STATS = ['dodgeChance', 'castSpeed', 'cooldownRate', 'lifedrain', 'healingReceived'];
/** Every field a rider may carry, and its type. */
export const RIDER_FIELDS = {
  on: 'string', when: 'string', every: 'number', chance: 'number', cd: 'number', below: 'number', carrying: 'string',
  from: 'string', at: 'string', radius: 'number',
  cond: 'string', condDur: 'number', dmgFrac: 'number', element: 'string', extraHits: 'number', knockback: 'number',
  sunder: 'number', healFrac: 'number', stamina: 'number', mana: 'number', ward: 'number', cdRefund: 'number',
  armorIgnore: 'number', block: 'number', fury: 'number', buff: 'object',
};
const EFFECT_FIELDS = ['cond', 'dmgFrac', 'extraHits', 'knockback', 'sunder', 'healFrac', 'stamina', 'mana', 'ward', 'cdRefund',
  'armorIgnore', 'block', 'fury', 'buff'];
/** Triggers on the strike side (the blow you land) and the defence side (the blow that lands on you). */
const STRIKE_ON = new Set(['hit', 'crit', 'nth']);
const DEFEND_ON = new Set(['struck', 'block', 'dodge']);
/** `summonRole` pins: the role keys of summonRoles.js, and the labels a sheet author may write instead. */
export const SUMMON_ROLE_PINS = { attack: 'attack', attacker: 'attack', spell: 'spell', caster: 'spell', ranged: 'spell',
  dot: 'dot', afflicter: 'dot', aura: 'aura', 'standard-bearer': 'aura', 'banner-bearer': 'aura', heal: 'heal', healer: 'heal', tender: 'heal',
  guard: 'guard', guardian: 'guard', taunter: 'guard', tank: 'guard' };
export const RIDER_FURY_SECONDS = 6;
export const RIDER_SUNDER_SECONDS = 4;
export const RIDER_BUFF_SECONDS = 5;
export const RIDER_TRAIL_LIFE = 2.4;   // seconds a trail point lies on the ground
export const RIDER_FIGHT_GAP = 10;     // seconds without being struck before the next blow "opens a fight"

const pct = (v) => Math.round((v || 0) * 100);
function tiles(units) {
  const t = Math.max(0.5, Math.round(((units || 0) / TILE) * 2) / 2);
  return `${t} tile${t === 1 ? '' : 's'}`;
}
const ORD = { 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 12: 'twelfth' };
const ordinal = (n) => ORD[n] || `${n}th`;
const nth = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`;
/** The word a rider's damage type is printed as (a combat type key; `rock` is "rock", `blunt` is "blunt"). */
const typeWord = (t) => String(t || 'physical').toLowerCase();

// ---------------------------------------------------------------------------
// FROM THE SHEET TO THE RUNTIME
// ---------------------------------------------------------------------------
/**
 * The sheet's riders (`mech.effectRiders`, condition by sheet id) as the runtime reads them: `cond` becomes `condKey` (the
 * registry key, `cid_<Conf>_<id>`) with `condDuration` in seconds from the condition's band and `condLabel` for the
 * card; `carrying` becomes `carryingKey` / `carryingLabel`; defaults filled. `condLookup(id)` answers { key, label,
 * dur } for a sheet condition id (or a registry key), `element` is the sheet's primary damage type (what an untyped
 * `dmgFrac` deals). Returns a fresh array; the input is not touched.
 */
export function resolveRiders(list, { condLookup = () => null, element = null } = {}) {
  const out = [];
  for (const r0 of (Array.isArray(list) ? list : [])) {
    if (!r0 || typeof r0 !== 'object' || !RIDER_ON.includes(r0.on)) continue;
    const r = { ...r0 };
    if (r.buff) r.buff = { ...r.buff };
    if (r.cond && !r.condKey) {
      const c = condLookup(r.cond);
      if (c) {
        r.condKey = c.key; r.condLabel = c.label;
        const [lo, hi] = c.dur || [3, 6];
        const p = typeof r.condDur === 'number' ? r.condDur : 0.5;
        r.condDuration = Math.round((lo + (hi - lo) * p) * 10) / 10;
      }
    }
    if (r.carrying && !r.carryingKey) {
      const c = condLookup(r.carrying);
      if (c) { r.carryingKey = c.key; r.carryingLabel = c.label; }
    }
    if ((r.dmgFrac > 0 || r.extraHits > 0) && !r.element) r.element = element || 'physical';
    if (typeof r.chance !== 'number') r.chance = 1;
    if (r.on === 'interval' && !(r.every > 0)) r.every = 20;
    if ((r.at === 'around' || r.on === 'interval') && !(r.radius > 0)) r.radius = 80;
    if (DEFEND_ON.has(r.on) && !r.from) r.from = r.on === 'dodge' ? 'any' : 'melee';
    out.push(r);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE CARD. "The name carries the flavour, the description states the mechanic", and never compares.
// ---------------------------------------------------------------------------
function scopeWords(spec) {
  const w = spec.weaponName ? spec.weaponName.toLowerCase() : 'your weapon';
  const aw = /^[aeiou]/.test(w) ? `an ${w}` : `a ${w}`;
  switch (spec.template) {
    case 'unarmedFocus': return { blow: 'bare-handed blow', blows: 'bare-handed blows', crit: 'bare-handed critical hit', crits: 'bare-handed critical hits',
      kill: 'bare-handed kill', hold: 'while both hands are empty', strikeOf: 'blow' };
    case 'weaponAffinity': return { blow: `strike with ${aw}`, blows: `strikes with ${aw}`, crit: `critical strike with ${aw}`, crits: `critical strikes with ${aw}`,
      kill: `kill with ${aw}`, hold: `while you hold ${aw}`, strikeOf: 'strike' };
    case 'summonArmor': return { blow: 'strike', blows: 'strikes', crit: 'critical strike', crits: 'critical strikes', kill: 'kill',
      hold: 'while you wear it', strikeOf: 'blow', worn: true, pre: 'while you wear it, ' };
    default: return { blow: 'strike', blows: 'strikes', crit: 'critical strike', crits: 'critical strikes', kill: 'kill',
      hold: 'while you carry it', strikeOf: 'blow', worn: true, pre: 'while you carry it, ' };
  }
}

/** The effects of one rider as verb phrases: [infinitive, third-person-singular]. */
function effectPhrases(r, side) {
  const out = [];
  const nearest = r.on === 'interval' ? ' on the nearest enemy' : ' on the nearest other enemy';
  const where = r.at === 'around' ? ` on every enemy within ${tiles(r.radius)} of you`
    : r.at === 'nearest' ? nearest
      : (r.radius > 0 ? (side === 'strike' ? ` on the target and every enemy within ${tiles(r.radius)} of it` : ` on the attacker and every enemy within ${tiles(r.radius)} of it`) : '');
  if (r.condLabel) {
    const on = where || (side === 'defend' ? ' on the attacker' : side === 'trail' ? ' on it' : '');
    out.push([`lay [${r.condLabel}]${on}`, `lays [${r.condLabel}]${on}`]);
  }
  if (r.dmgFrac > 0 && !(r.extraHits > 0)) {
    const t = typeWord(r.element);
    const basis = side === 'defend' ? 'the blow' : (side === 'strike' ? 'its damage' : 'your weapon\'s damage');
    const tgt = r.at === 'around' ? ` to every enemy within ${tiles(r.radius)} of you`
      : r.at === 'nearest' ? nearest.replace(' on ', ' to ')
        : side === 'defend' ? ' to the attacker' : side === 'trail' ? ' to it'
          : (r.radius > 0 ? ` to everything within ${tiles(r.radius)} of the target` : '');
    if (side === 'defend') {
      // A blow taken goes back: "sends 15% of the blow back at the attacker as fire".
      const back = r.at === 'around' ? `at every enemy within ${tiles(r.radius)} of you` : r.at === 'nearest' ? 'at the nearest other enemy' : 'at the attacker';
      out.push([`send ${pct(r.dmgFrac)}% of the blow back ${back} as ${t}`, `sends ${pct(r.dmgFrac)}% of the blow back ${back} as ${t}`]);
    } else {
      const again = side === 'strike' ? ' again' : '';
      out.push([`deal ${pct(r.dmgFrac)}% of ${basis}${again} as ${t}${tgt}`, `deals ${pct(r.dmgFrac)}% of ${basis}${again} as ${t}${tgt}`]);
    }
  }
  if (r.extraHits > 0) {
    const n = Math.round(r.extraHits);
    const times = n === 1 ? 'once more' : `${n} more times`;
    out.push([`land ${times}, each for ${pct(r.dmgFrac || 0.5)}% of its damage`, `lands ${times}, each for ${pct(r.dmgFrac || 0.5)}% of its damage`]);
  }
  if (r.sunder > 0) out.push([`strip ${pct(r.sunder)}% of the target's armour for ${RIDER_SUNDER_SECONDS}s`, `strips ${pct(r.sunder)}% of the target's armour for ${RIDER_SUNDER_SECONDS}s`]);
  if (r.armorIgnore > 0) out.push([`ignore ${pct(r.armorIgnore)}% of the target's armour`, `ignores ${pct(r.armorIgnore)}% of the target's armour`]);
  if (r.knockback > 0) {
    const who = side === 'defend' ? 'the attacker' : 'the target';
    out.push([`knock ${who} back ${tiles(r.knockback)}`, `knocks ${who} back ${tiles(r.knockback)}`]);
  }
  if (r.healFrac > 0) {
    const of = side === 'defend' ? 'the blow' : 'the damage dealt';
    out.push([`return ${pct(r.healFrac)}% of ${of} to you as health`, `returns ${pct(r.healFrac)}% of ${of} to you as health`]);
  }
  if (r.stamina > 0) out.push([`restore ${Math.round(r.stamina)} stamina`, `restores ${Math.round(r.stamina)} stamina`]);
  if (r.mana > 0) out.push([`restore ${Math.round(r.mana)} mana`, `restores ${Math.round(r.mana)} mana`]);
  if (r.ward > 0) out.push([`close a shield worth ${pct(r.ward)}% of your health over you for 6s`, `closes a shield worth ${pct(r.ward)}% of your health over you for 6s`]);
  if (r.cdRefund > 0) out.push([`take ${r.cdRefund}s off every cooldown you have running`, `takes ${r.cdRefund}s off every cooldown you have running`]);
  if (r.fury > 0) out.push([`raise your physical damage by ${pct(r.fury)}% for ${RIDER_FURY_SECONDS}s`, `raises your physical damage by ${pct(r.fury)}% for ${RIDER_FURY_SECONDS}s`]);
  if (r.buff && RIDER_BUFF_STATS.includes(r.buff.stat) && r.buff.amount > 0) {
    const word = { dodgeChance: 'dodge chance', castSpeed: 'casting speed', cooldownRate: 'cooldown recovery',
      lifedrain: 'life drain', healingReceived: 'healing you receive' }[r.buff.stat];
    const s = r.buff.duration || RIDER_BUFF_SECONDS;
    const obj = r.buff.stat === 'healingReceived' ? `the ${word}` : `your ${word}`;   // ROUND 392: not "your healing you receive"
    out.push([`raise ${obj} by ${pct(r.buff.amount)}% for ${s}s`, `raises ${obj} by ${pct(r.buff.amount)}% for ${s}s`]);
  }
  return out;
}
const joinList = (xs) => (xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** One rider, stated. `spec` is the finished ability (its template and weapon name scope the words). */
export function riderSentence(r, spec) {
  const S = scopeWords(spec);
  const side = STRIKE_ON.has(r.on) ? 'strike' : DEFEND_ON.has(r.on) ? 'defend' : r.on === 'trail' ? 'trail' : 'other';
  const fx = effectPhrases(r, side);
  const below = Math.round((r.below || 0.5) * 100);
  // ROUND 392: a state gate, joined to the scope's own "while ..." clause wherever there is one.
  const gateCore = (r.when === 'still') ? 'you stand still' : (r.when === 'moving') ? 'you are moving'
    : (r.when === 'lowSelf') ? `you are below ${below}% health` : '';
  if (r.on === 'block') {
    const from = r.from === 'ranged' ? 'shots' : r.from === 'any' ? 'blows' : 'melee blows';
    const hold = gateCore ? `${S.hold} and ${gateCore}` : S.hold;   // ROUND 392: the gate was left off the card
    const share = `${pct(r.chance)}% of the ${from} that reach you ${hold} are turned aside, losing ${pct(r.block || 0.5)}% of their force`;
    const tail = fx.length ? `; a blow turned aside ${joinList(fx.map(f => f[1]))}` : '';
    return `${cap(share)}${tail}${cdTail(r)}.`;
  }
  if (!fx.length) return '';
  let subj, plural = false;
  switch (r.on) {
    case 'hit': subj = `your ${S.blows}`; plural = true; break;
    case 'crit': subj = `your ${S.crits}`; plural = true; break;
    case 'nth': subj = `every ${ordinal(Math.round(r.every || 3))} ${S.blow}`; break;
    case 'kill': subj = (r.every > 1) ? `every ${ordinal(Math.round(r.every))} ${S.kill}${S.worn ? ` ${S.hold}` : ''}` : (S.worn ? `each kill ${S.hold}` : `each ${S.kill}`); break;
    case 'struck': subj = r.from === 'ranged' ? `a shot that hits you ${S.hold}` : r.from === 'any' ? `a blow that lands on you ${S.hold}` : `a melee blow that lands on you ${S.hold}`; break;
    case 'dodge': subj = `a blow you dodge ${S.hold}`; break;
    case 'interval': {
      const w = whenWords(r, below);
      const body = r.chance < 1 ? `it has a ${pct(r.chance)}% chance to ${joinList(fx.map(f => f[0]))}` : `it ${joinList(fx.map(f => f[1]))}`;
      return `${cap(`once every ${r.every}s ${S.hold}${w ? ` and ${w}` : ''}, if an enemy is within ${tiles(r.radius)}, ${body}`)}.`;
    }
    case 'trail': {
      const caught = r.chance < 1 ? `has a ${pct(r.chance)}% chance to be caught, and the trail ${joinList(fx.map(f => f[1]))}`
        : `is caught: the trail ${joinList(fx.map(f => f[1]))}`;
      return `${cap(`${S.hold}, you leave a trail where you walk: an enemy that crosses it within ${RIDER_TRAIL_LIFE}s of you passing ${caught}`)}${cdTail(r)}.`;
    }
    default: subj = `your ${S.blows}`; plural = true;
  }
  // A strike's gate reads as part of its subject ("your first bare-handed blow on each enemy").
  switch (r.when) {
    case 'first': if (STRIKE_ON.has(r.on)) { subj = `your first ${r.on === 'crit' ? S.crit : S.blow} on each enemy`; plural = false; } break;
    case 'afterMove': if (STRIKE_ON.has(r.on)) { subj = `the first ${r.on === 'crit' ? S.crit : S.blow} after a dash or a movement ability`; plural = false; } break;
    case 'lowTarget': subj += ` on an enemy below ${below}% health`; break;
    case 'carrying': {
      const lab = `[${r.carryingLabel || 'its condition'}]`;
      // ROUND 392: a kill reads "each kill of an enemy carrying [X] while you carry it", not "... carry it on an enemy ...".
      if (r.on === 'kill' && !(r.every > 1)) subj = S.worn ? `each kill of an enemy carrying ${lab} ${S.hold}` : `each ${S.kill} of an enemy carrying ${lab}`;
      else subj += ` on an enemy carrying ${lab}`;
      break;
    }
    // ROUND 392: the runtime's "behind" is an enemy behind where you face; on a strike it reads as that enemy.
    case 'behind': subj += STRIKE_ON.has(r.on) ? ' on an enemy behind you' : ' from behind you'; break;
    case 'firstInFight':
      if (r.on === 'struck') { subj = `the first blow that lands on you in a fight ${S.hold}`; plural = false; }
      // ROUND 392: the gate was silent on strikes; it holds while nothing has struck you for RIDER_FIGHT_GAP seconds.
      else if (STRIKE_ON.has(r.on) || r.on === 'kill') subj += ` while nothing has struck you in the last ${RIDER_FIGHT_GAP}s`;
      break;
    default: break;
  }
  // Worn gear names its condition first ("While you wear it, your critical hits lay ...").
  if (S.pre && (STRIKE_ON.has(r.on) || (r.on === 'kill' && !/while you/.test(subj)))) subj = `${S.pre}${subj}`;
  // ROUND 392: a state gate joins the scope's own "while ..." clause instead of stacking a second one
  // ("while you carry it and you are below 40% health", not "while you carry it while you are below ...").
  let gate = '';
  if (gateCore) {
    if (S.pre && subj.startsWith(S.pre)) subj = `${S.pre.replace(/, $/, '')} and ${gateCore}, ${subj.slice(S.pre.length)}`;
    else if (subj.includes(S.hold)) subj = subj.replace(S.hold, `${S.hold} and ${gateCore}`);
    else gate = ` while ${gateCore}`;
  }
  let body = r.chance < 1
    ? `${plural ? 'have' : 'has'} a ${pct(r.chance)}% chance to ${joinList(fx.map(f => f[0]))}`
    : joinList(fx.map(f => f[plural ? 0 : 1]));
  if (plural) body = body.replace(/of its damage/g, 'of their damage');   // ROUND 392: "your blows deal 20% of their damage again"
  if (gate && S.pre && subj.startsWith(S.pre)) gate = '';
  return `${cap(`${subj}${gate} ${body}`)}${cdTail(r)}.`;
}
function whenWords(r, below) {
  if (r.when === 'still') return 'standing still';
  if (r.when === 'moving') return 'moving';
  if (r.when === 'lowSelf') return `below ${below}% health`;
  return '';
}
function cdTail(r) { return r.cd > 0 ? `, at most once every ${r.cd}s` : ''; }

/** Every rider's sentence, for the card, joined. */
export function riderSentences(spec) {
  return (spec && Array.isArray(spec.effectRiders) ? spec.effectRiders : []).map(r => riderSentence(r, spec)).filter(Boolean).join(' ');
}

/** The base mechanic of a template whose sheet card is a lead line, where the generator printed none. */
export function riderBaseSentence(spec) {
  if (!spec) return '';
  if (spec.template === 'unarmedFocus' && spec.unarmedPct > 0) {
    return `While both hands are empty, everything you do lands ${pct(spec.unarmedPct)}% harder.`;
  }
  return '';
}

/** The numbers line's share: one compact bit per rider. */
export function riderStatsLine(a) {
  const rs = a && Array.isArray(a.effectRiders) ? a.effectRiders : [];
  const bits = [];
  for (const r of rs) {
    const when = r.on === 'nth' ? `every ${nth(Math.round(r.every))} hit` : r.on === 'interval' ? `every ${r.every}s`
      : r.on === 'kill' && r.every > 1 ? `every ${nth(Math.round(r.every))} kill` : ({ hit: 'on hit', crit: 'on crit', kill: 'on kill', struck: 'when struck',
        block: 'block', dodge: 'on dodge', trail: 'trail' })[r.on] || r.on;
    const fx = [];
    if (r.on === 'block') fx.push(`${pct(r.chance)}% of blows lose ${pct(r.block || 0.5)}%`);
    if (r.condLabel) fx.push(`[${r.condLabel}]${r.chance < 1 && r.on !== 'block' ? ` ${pct(r.chance)}%` : ''}`);
    if (r.dmgFrac > 0 && !(r.extraHits > 0)) fx.push(`+${pct(r.dmgFrac)}% as ${typeWord(r.element)}`);
    if (r.extraHits > 0) fx.push(`+${Math.round(r.extraHits)} hit${r.extraHits > 1 ? 's' : ''} at ${pct(r.dmgFrac || 0.5)}%`);
    if (r.sunder > 0) fx.push(`-${pct(r.sunder)}% armour`);
    if (r.armorIgnore > 0) fx.push(`ignores ${pct(r.armorIgnore)}% armour`);
    if (r.knockback > 0) fx.push(`knockback ${tiles(r.knockback)}`);
    if (r.healFrac > 0) fx.push(`heals ${pct(r.healFrac)}%`);
    if (r.stamina > 0) fx.push(`+${Math.round(r.stamina)} stamina`);
    if (r.mana > 0) fx.push(`+${Math.round(r.mana)} mana`);
    if (r.ward > 0) fx.push(`${pct(r.ward)}% ward`);
    if (r.cdRefund > 0) fx.push(`-${r.cdRefund}s cooldowns`);
    if (r.fury > 0) fx.push(`+${pct(r.fury)}% physical ${RIDER_FURY_SECONDS}s`);
    if (r.buff && r.buff.amount > 0) {
      // ROUND 392: words, not the raw stat keys ("+15% dodgeChance").
      const w = { dodgeChance: 'dodge', castSpeed: 'cast speed', cooldownRate: 'cooldown recovery', lifedrain: 'life drain',
        healingReceived: 'healing received' }[r.buff.stat] || r.buff.stat;
      fx.push(`+${pct(r.buff.amount)}% ${w}`);
    }
    if (r.radius > 0 && (r.at === 'around' || r.at === 'target' || !r.at)) fx.push(`${tiles(r.radius)} radius`);
    if (r.cd > 0) fx.push(`${r.cd}s cd`);
    if (fx.length) bits.push(`${when}: ${fx.join(', ')}`);
  }
  return bits.join(' · ');
}

// ---------------------------------------------------------------------------
// THE VALIDATOR'S CHECK (tools/build_confluence_identity.mjs). `condIds` are the sheet's condition ids, `types` the
// 28 combat types. Returns a list of faults, empty when the riders are well formed.
// ---------------------------------------------------------------------------
export function riderFaults(list, { template, condIds = new Set(), types = [] } = {}) {
  const out = [];
  if (!RIDER_TEMPLATES.includes(template)) return [`riders ride ${RIDER_TEMPLATES.join(', ')} only (this is a ${template})`];
  if (!Array.isArray(list) || !list.length) return ['riders must be a list of one or more riders'];
  if (list.length > 3) out.push('at most three riders on one ability');
  list.forEach((r, i) => {
    const at = `riders[${i}]`;
    if (!r || typeof r !== 'object' || Array.isArray(r)) { out.push(`${at}: a rider is an object`); return; }
    for (const [k, v] of Object.entries(r)) {
      const ty = RIDER_FIELDS[k];
      if (!ty) { out.push(`${at}.${k}: not a rider field (${Object.keys(RIDER_FIELDS).join(', ')})`); continue; }
      if ((Array.isArray(v) ? 'array' : typeof v) !== ty) out.push(`${at}.${k}: a ${ty}`);
    }
    if (!RIDER_ON.includes(r.on)) out.push(`${at}.on: one of ${RIDER_ON.join(', ')}`);
    if (r.when != null && !RIDER_WHEN.includes(r.when)) out.push(`${at}.when: one of ${RIDER_WHEN.join(', ')}`);
    if (r.at != null && !RIDER_AT.includes(r.at)) out.push(`${at}.at: one of ${RIDER_AT.join(', ')}`);
    if (r.from != null && !RIDER_FROM.includes(r.from)) out.push(`${at}.from: one of ${RIDER_FROM.join(', ')}`);
    if (r.from != null && !DEFEND_ON.has(r.on)) out.push(`${at}.from: only on struck / block / dodge`);
    if ((r.on === 'nth') && !(Number.isInteger(r.every) && r.every >= 2 && r.every <= 12)) out.push(`${at}.every: an nth rider fires every 2..12 strikes`);
    if (r.on === 'interval' && !(r.every >= 3 && r.every <= 120)) out.push(`${at}.every: an interval rider fires every 3..120 seconds`);
    if (r.on === 'kill' && r.every != null && !(Number.isInteger(r.every) && r.every >= 2 && r.every <= 10)) out.push(`${at}.every: every 2..10 kills`);
    if (r.every != null && !['nth', 'interval', 'kill'].includes(r.on)) out.push(`${at}.every: only on nth, interval or kill`);
    if (r.chance != null && !(r.chance > 0 && r.chance <= 1)) out.push(`${at}.chance: in (0, 1]`);
    if (r.cd != null && !(r.cd >= 0.5 && r.cd <= 120)) out.push(`${at}.cd: 0.5..120 seconds`);
    if (r.below != null && !(r.below > 0 && r.below < 1)) out.push(`${at}.below: a health fraction`);
    if (r.below != null && !['lowTarget', 'lowSelf'].includes(r.when)) out.push(`${at}.below: only with when lowTarget / lowSelf`);
    if (r.cond != null && !condIds.has(r.cond)) out.push(`${at}.cond: "${r.cond}" is not one of this sheet's conditions`);
    if (r.condDur != null && !(r.condDur >= 0 && r.condDur <= 1)) out.push(`${at}.condDur: a 0..1 point in the condition's dur band`);
    if (r.when === 'carrying' && !condIds.has(r.carrying)) out.push(`${at}.carrying: a sheet condition id (when: carrying)`);
    if (r.carrying != null && r.when !== 'carrying') out.push(`${at}.carrying: only with when: carrying`);
    if (r.element != null && !types.includes(r.element)) out.push(`${at}.element: "${r.element}" is not one of the 28 combat types`);
    if (r.dmgFrac != null && !(r.dmgFrac > 0 && r.dmgFrac <= 2)) out.push(`${at}.dmgFrac: a share of the blow, 0..2`);
    if (r.extraHits != null && !(Number.isInteger(r.extraHits) && r.extraHits >= 1 && r.extraHits <= 8)) out.push(`${at}.extraHits: 1..8`);
    if (r.extraHits != null && !STRIKE_ON.has(r.on)) out.push(`${at}.extraHits: only on a strike (hit, crit, nth)`);
    if (r.radius != null && !(r.radius >= 16 && r.radius <= 256)) out.push(`${at}.radius: 16..256 world units`);
    if (r.knockback != null && !(r.knockback >= 8 && r.knockback <= 96)) out.push(`${at}.knockback: 8..96 world units`);
    for (const k of ['sunder', 'healFrac', 'ward', 'armorIgnore', 'block', 'fury']) if (r[k] != null && !(r[k] > 0 && r[k] <= 1)) out.push(`${at}.${k}: a share, 0..1`);
    for (const k of ['stamina', 'mana']) if (r[k] != null && !(r[k] > 0 && r[k] <= 40)) out.push(`${at}.${k}: 1..40`);
    if (r.cdRefund != null && !(r.cdRefund > 0 && r.cdRefund <= 30)) out.push(`${at}.cdRefund: 1..30 seconds`);
    if (r.armorIgnore != null && !STRIKE_ON.has(r.on)) out.push(`${at}.armorIgnore: only on a strike (hit, crit, nth)`);
    if (r.on === 'block' && !(r.block > 0)) out.push(`${at}: a block rider says how much of the blow it turns aside (block)`);
    if (r.block != null && r.on !== 'block') out.push(`${at}.block: only on: block`);
    if (r.on === 'block' && !(r.chance > 0 && r.chance <= 0.5)) out.push(`${at}.chance: a block rider turns aside up to half the blows (0..0.5)`);
    if (r.buff != null && !(RIDER_BUFF_STATS.includes(r.buff.stat) && r.buff.amount > 0 && r.buff.amount <= 0.6)) out.push(`${at}.buff: { stat: ${RIDER_BUFF_STATS.join(' | ')}, amount 0..0.6, duration? }`);
    if (r.on !== 'block' && !EFFECT_FIELDS.some(k => r[k] != null)) out.push(`${at}: a rider does something (${EFFECT_FIELDS.join(', ')})`);
    if (r.on === 'trail' && !r.cond && !(r.dmgFrac > 0)) out.push(`${at}: a trail lays a condition or deals damage`);
    if ((r.at === 'around' || r.at === 'nearest') && ['healFrac', 'stamina', 'mana', 'ward', 'cdRefund', 'fury', 'buff'].some(k => r[k] != null) && !r.cond && !(r.dmgFrac > 0)) out.push(`${at}.at: "${r.at}" aims at enemies; this rider only helps you`);
    if (template === 'unarmedFocus' && (r.on === 'interval' || r.on === 'trail')) out.push(`${at}: an unarmed rider fires on a blow, a kill, a block, a dodge or a blow taken`);
  });
  return out;
}
