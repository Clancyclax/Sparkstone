// ===========================================================================
// ROUND 392 -- PAYOFFS ON A SHEET'S OWN CONDITIONS.
//
// The gap the twenty confluence sheets all filed (docs/CONFLUENCE_IDENTITY.md, `cond-payoff-passive`): "Passives that
// pay off on the sheet's OWN conditions (aftershocks spreading Quake-Shaken on death, breaking a Buried hold, a Fault
// Line that splits at full stacks). essenceConditions.js only knows its fixed list." The task's own three: "aftershocks
// spreading Quake-Shaken on a death, breaking Encased in Obsidian for bonus damage, healing from Scalded enemies".
//
// A sheet entry on `cond_payoff` (affliction) or `triggered_cond_payoff` (triggered) carries a `payoff`:
//
//   { "cond": "scorched", "on": "kill", "do": "spread", "radius": 128, "max": 1 }
//
//   on    do       what happens                                                     fields
//   kill  spread   the dead carrier's stacks pass to the nearest K enemies         radius, max (K)
//   kill  heal     you heal a share of your maximum health                          per
//   kill  lay      every enemy within reach of the body takes [then]               radius, then, stacks
//   hit   burst    a hit on a carrier ends the condition and deals a burst          dmgMult, type, types
//   hit   amp      hits deal more for each stack on the target (to a cap)           per, max, types
//   hit   lay      hits on a carrier also lay [then]                                then, stacks, types
//   full  lay      the condition reaching its full stacks lays [then] (and clears)  then, reset
//   full  burst    the condition reaching its full stacks bursts and clears         dmgMult, type
//   near  heal     every few seconds you heal per carrier near you (to a cap)       per, max, radius, every
//   near  amp      you deal more for each carrier near you (to a cap)               per, max, radius
//
// `cond` / `then` are the sheet's condition ids (registered as `cid_<Confluence>_<id>`); `type` is a damage type from
// the sheet's identity.damage; `types` restricts which hits count ("any fire hit on [Tinder-Dry]"). Resolved here
// into the spec's `condPayoff`, which WorldScene folds into passiveMods.condPayoffs and confluenceGapMixin pays.
// Pure data and text: no scene, no awakening.js (awakening imports this).
// ===========================================================================
import { conditionDef } from './debuffs.js';
import { conditionKey } from './confluenceIdentity.js';
import { typeWord } from './damageTypeText.js';

export const PAYOFF_SHAPES = {
  kill: ['spread', 'heal', 'lay'],
  hit: ['burst', 'amp', 'lay'],
  full: ['lay', 'burst'],
  near: ['heal', 'amp'],
};
/** The bounds a sheet's numbers must sit in (the validator reads these). */
export const PAYOFF_BOUNDS = {
  radius: [32, 320], max: { spread: [1, 4], amp: [0.05, 0.5], heal: [0.01, 0.15] },
  per: { amp: [0.01, 0.15], heal: [0.005, 0.05] }, dmgMult: [0.5, 3], stacks: [1, 3], every: [1, 6],
};
export const PAYOFF_FIELDS = new Set(['cond', 'on', 'do', 'then', 'radius', 'max', 'per', 'dmgMult', 'type', 'types',
  'reset', 'every', 'stacks']);
const DEFAULTS = { radius: { kill: 128, near: 192 }, max: { spread: 1, amp: 0.2, heal: 0.05 },
  per: { amp: 0.04, heal: 0.01 }, dmgMult: 1.5, every: 2, stacks: 1 };

const pct = (x) => Math.round((x || 0) * 100);
function tiles(units) {
  const t = Math.max(1, Math.round(((units || 0) / 32) * 2) / 2);
  return `${t} tile${t === 1 ? '' : 's'}`;
}
const listWords = (ws) => (ws.length <= 1 ? ws.join('') : `${ws.slice(0, -1).join(', ')} or ${ws[ws.length - 1]}`);

/** A sheet entry's `payoff` as the spec carries it (`condPayoff`), or null when it names nothing real. */
export function resolveSheetPayoff(p, sheet, base = 8) {
  if (!p || !sheet || !PAYOFF_SHAPES[p.on] || !PAYOFF_SHAPES[p.on].includes(p.do)) return null;
  const name = sheet.name || sheet.confluence;
  const key = conditionKey(name, p.cond);
  const def = conditionDef(key);
  if (!def) return null;
  const out = { cond: key, condLabel: def.label, on: p.on, do: p.do, stackCap: def.stackCap || 1 };
  if (p.do === 'lay') {
    const k2 = conditionKey(name, p.then);
    const d2 = conditionDef(k2);
    if (!d2) return null;
    out.then = k2; out.thenLabel = d2.label; out.stacks = p.stacks || DEFAULTS.stacks;
  }
  if (p.on === 'kill' || p.on === 'near') out.radius = p.radius || DEFAULTS.radius[p.on];
  if (p.do === 'spread') out.max = p.max || DEFAULTS.max.spread;
  if (p.do === 'amp' || p.do === 'heal') {
    out.per = p.per || DEFAULTS.per[p.do];
    if (p.on !== 'kill') out.max = p.max || DEFAULTS.max[p.do];
  }
  if (p.do === 'burst') {
    out.dmg = Math.max(1, Math.round(base * (p.dmgMult || DEFAULTS.dmgMult)));
    out.type = p.type || ((sheet.identity || {}).damage || [])[0] || 'physical';
  }
  if (p.on === 'near' && p.do === 'heal') out.every = p.every || DEFAULTS.every;
  if (p.on === 'full' && p.do === 'lay' && p.reset) out.reset = true;
  if (Array.isArray(p.types) && p.types.length && p.on === 'hit') out.types = p.types.slice();
  return out;
}

/** The card's sentence for a payoff: its trigger, then its effect, with the figures. */
export function condPayoffSentence(c) {
  if (!c) return '';
  const L = `[${c.condLabel}]`;
  const T = c.thenLabel ? `[${c.thenLabel}]` : '';
  const hitsOf = c.types ? `${listWords(c.types.map(typeWord))} hits` : 'hits';
  switch (`${c.on}/${c.do}`) {
    case 'kill/spread':
      return c.max > 1
        ? `When an enemy carrying ${L} dies, its stacks of ${L} pass to each of the ${c.max} nearest enemies within ${tiles(c.radius)} of it.`
        : `When an enemy carrying ${L} dies, its stacks of ${L} pass to the nearest enemy within ${tiles(c.radius)} of it.`;
    case 'kill/heal':
      return `When an enemy carrying ${L} dies, you heal ${pct(c.per)}% of your maximum health.`;
    case 'kill/lay':
      return `When an enemy carrying ${L} dies, every enemy within ${tiles(c.radius)} of it takes ${T}.`;
    case 'hit/burst':
      return `Your ${hitsOf} on an enemy carrying ${L} break it: ${L} ends, and the enemy takes ${c.dmg} ${typeWord(c.type)} damage.`;
    case 'hit/amp':
      return `Your ${hitsOf} deal ${pct(c.per)}% more damage for each stack of ${L} on the target, up to +${pct(c.max)}%.`;
    case 'hit/lay':
      return `Your ${hitsOf} on an enemy carrying ${L} also lay ${T}.`;
    case 'full/lay':
      return `When ${L} reaches its full ${c.stackCap} stacks on an enemy, that enemy also takes ${T}${c.reset ? `, and ${L} clears` : ''}.`;
    case 'full/burst':
      return `When ${L} reaches its full ${c.stackCap} stacks on an enemy, it bursts for ${c.dmg} ${typeWord(c.type)} damage and clears.`;
    case 'near/heal':
      return `Every ${c.every} seconds you heal ${pct(c.per)}% of your maximum health for each enemy carrying ${L} within ${tiles(c.radius)} of you, up to ${pct(c.max)}%.`;
    case 'near/amp':
      return `You deal ${pct(c.per)}% more damage for each enemy carrying ${L} within ${tiles(c.radius)} of you, up to +${pct(c.max)}%.`;
    default: return '';
  }
}

/** The stats line for a payoff (statsLineFor's `condPayoff` case). */
export function condPayoffStats(c) {
  if (!c) return 'no numbers yet';
  const L = c.condLabel;
  const ty = c.types ? `${c.types.map(typeWord).join('/')} ` : '';
  switch (`${c.on}/${c.do}`) {
    case 'kill/spread': return `${L} death: stacks pass to ${c.max} within ${tiles(c.radius)}`;
    case 'kill/heal': return `${L} death: heal ${pct(c.per)}% max HP`;
    case 'kill/lay': return `${L} death: ${c.thenLabel} on all within ${tiles(c.radius)}`;
    case 'hit/burst': return `${ty}hit on ${L}: ends it, ${c.dmg} ${typeWord(c.type)} dmg`;
    case 'hit/amp': return `${ty}hits +${pct(c.per)}% per ${L} stack (max +${pct(c.max)}%)`;
    case 'hit/lay': return `${ty}hit on ${L}: lays ${c.thenLabel}`;
    case 'full/lay': return `full ${L} (${c.stackCap}): lays ${c.thenLabel}${c.reset ? ', clears' : ''}`;
    case 'full/burst': return `full ${L} (${c.stackCap}): bursts for ${c.dmg} ${typeWord(c.type)} dmg`;
    case 'near/heal': return `heal ${pct(c.per)}% max HP per ${L} enemy within ${tiles(c.radius)} every ${c.every}s (max ${pct(c.max)}%)`;
    case 'near/amp': return `+${pct(c.per)}% dmg per ${L} enemy within ${tiles(c.radius)} (max +${pct(c.max)}%)`;
    default: return 'no numbers yet';
  }
}
