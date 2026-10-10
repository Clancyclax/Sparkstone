// ===========================================================================
// ROUND 310 (item 2.3) -- RITUAL MAGIC.
//
// The user's ruling, in his own numbering:
//
//   2.2.5 "Ritual Magic (Players should be able to gain Ritual Abilities only
//          if they learn ritual magic from a skill book)"
//   2.3   "Rituals magic unlocks abilities that require knowing ritual magic."
//   2.3.1 Summoning permanent familiars.
//   2.3.2 Summoning of consumables, food and potions.
//   2.3.3 Combat rituals with all of the following: long cast times (30-50
//         seconds uninterrupted) and long cooldowns (30-90 minutes), and high
//         costs (>90% of mana, stamina, and health), but mark an area on the
//         ground (up to twice the size of the player's aura) with an effect
//         lasting 10-30 minutes. The effect can be a damage reduction for the
//         team, an aura boost, damage boost, crit chance boost, elemental
//         resistance boost, triggered effects, slowing monsters, improving
//         party dodge chance, or more.
//   2.3.3.1 "As always a ritual ability is required to make thematic sense for
//         the essence awakening stone combination."
//   2.3.4 "Additionally later on ritual magic will enable the player special
//         avenues of investigation and problem solving."
//   2.3.5 "Rituals can in theory come from any essence once a player has read a
//         ritual magic skillbook."
//
// SHAPE. A ritual belongs to one (essence, stone) pairing, exactly as an
// ability does, and is derived from the pair deterministically -- the same
// pairing is always the same rite, so socketing and unsocketing never
// reshuffles what you know. Every pairing the player has socketed offers one.
// The FAMILIES the game already gives every essence and stone ("blade",
// "aquatic", "death", "light" ...) are what make it thematic: a death stone
// does not bless, a storm essence does not mend.
//
// 2.3.4 (investigation) is not built: it needs the investigation system to
// exist first, and this file says so rather than inventing a stub that does
// nothing. `ritualInvestigationReady()` is the single place a later round
// turns it on.
// ===========================================================================

import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { summonCreatureForSocket, SUMMON_CREATURES, SUMMON_CREATURE_BY_FAMILY } from './summonCreatures.js';

export function ritualInvestigationReady() { return false; }

// ---------------------------------------------------------------------------
// The numbers the user fixed.
// ---------------------------------------------------------------------------
export const COMBAT_CAST_S = [30, 50];          // 2.3.3 uninterrupted
export const COMBAT_COOLDOWN_S = [30 * 60, 90 * 60];
export const COMBAT_COST_FRAC = [0.91, 0.97];   // > 90% of mana, stamina, health
export const ZONE_LIFE_S = [10 * 60, 30 * 60];
export const ZONE_AURA_MULT = [1.4, 2.0];       // "up to twice the size of the aura"
export const FAMILIAR_CAST_S = [30, 40];
export const FAMILIAR_CAP = 3;
// ROUND 311 -- "Ritual magic should be a fairly rare outcome and no player
// should ever have more than 4 rituals." A pairing offers a rite about one time
// in seven (decided by the pair, so it never reshuffles), and a kit shows at
// most RITUAL_CAP of them in all, counting any canon ritual summon it holds.
export const RITUAL_CHANCE = 0.15;
export const RITUAL_CAP = 4;
/** Canon abilities that are RITUALS: they need ritual magic, and each counts
 *  as one of the player's four. Sanguine Horror, Avatar of Doom and Spartoi are
 *  in the game; Shadow of the Reaper is named here so that the day it is added
 *  it is already gated (it is not in the game's canon text yet). */
export const CANON_RITUAL_KEYS = ['sanguineHorror', 'shadowOfTheReaper', 'avatarOfDoom', 'spartoi'];
export const CONJURE_CAST_S = [20, 35];
export const CONJURE_COOLDOWN_S = [20 * 60, 45 * 60];
export const CONJURE_COST_FRAC = [0.5, 0.65];

// ---------------------------------------------------------------------------
// THEMES -- family -> what that family's rite does.
// ---------------------------------------------------------------------------
export const COMBAT_EFFECTS = {
  guard:  { label: 'Ward',        range: [12, 20], text: (v) => `everyone in the zone takes ${v}% less damage` },
  aura:   { label: 'Resonance',   range: [20, 35], text: (v) => `your aura reaches ${v}% further while you stand in the zone` },
  damage: { label: 'Fury',        range: [15, 25], text: (v) => `damage dealt from inside the zone is ${v}% higher` },
  crit:   { label: 'Marking',     range: [10, 18], text: (v) => `critical chance from inside the zone is ${v}% higher` },
  resist: { label: 'Veil',        range: [25, 40], text: (v, r) => `${v}% less ${r.elementLabel} damage taken inside the zone` },
  dodge:  { label: 'Drift',       range: [10, 18], text: (v) => `dodge chance inside the zone is ${v}% higher` },
  slow:   { label: 'Mire',        range: [30, 45], text: (v) => `monsters inside the zone move ${v}% slower` },
  strike: { label: 'Judgement',   range: [3, 3],   text: (v, r) => `every 3 seconds a ${r.elementLabel} strike falls on a foe inside the zone` },
  pulse:  { label: 'Bloom',       range: [4, 7],   text: (v) => `every 3 seconds everyone in the zone recovers ${v}% of their health` },
  drain:  { label: 'Tithe',       range: [4, 7],   text: (v) => `every 3 seconds a foe inside the zone is drained, and you recover what is taken` },
};
export const COMBAT_EFFECT_KEYS = Object.keys(COMBAT_EFFECTS);

/** family -> the effects that family's rites may take, strongest theme first. */
export const FAMILY_EFFECTS = {
  alchemy: ['pulse', 'resist'], motion: ['dodge', 'slow'], beast: ['damage', 'guard'],
  guard: ['guard', 'resist'], identity: ['aura', 'crit'], bludgeon: ['damage', 'strike'],
  order: ['guard', 'aura'], flyer: ['dodge', 'crit'], death: ['drain', 'slow'],
  blood: ['drain', 'damage'], ranged: ['crit', 'damage'], life: ['pulse', 'guard'],
  smallbeast: ['dodge', 'crit'], craft: ['slow', 'aura'], blade: ['crit', 'damage'],
  air: ['dodge', 'slow'], cold: ['slow', 'resist'], aquatic: ['resist', 'slow'],
  earth: ['guard', 'resist'], dark: ['slow', 'dodge'], water: ['pulse', 'resist'],
  space: ['aura', 'slow'], mind: ['aura', 'crit'], fire: ['strike', 'damage'],
  polearm: ['damage', 'crit'], light: ['pulse', 'aura'], storm: ['strike', 'dodge'],
  serpent: ['slow', 'drain'], force: ['damage', 'guard'],
};
/** family -> the element an elemental rite of that family speaks in. */
export const FAMILY_ELEMENT = {
  fire: 'fire', cold: 'frost', storm: 'lightning', water: 'frost', aquatic: 'frost',
  earth: 'nature', life: 'nature', alchemy: 'nature', air: 'lightning',
  light: 'radiant', dark: 'shadow', death: 'shadow', blood: 'shadow', serpent: 'nature',
};
export const ELEMENT_LABELS = { fire: 'fire', frost: 'frost', lightning: 'lightning', nature: 'nature', shadow: 'shadow', radiant: 'radiant' };
const ELEMENT_FALLBACK = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];

/** Families whose conjuring is a POTION rather than a meal. */
const POTION_FAMILIES = new Set(['alchemy', 'life', 'water', 'light', 'order']);

const NAME_TEMPLATES = {
  guard:  ['Ward of the {E}', '{S} Bastion Rite', 'Circle of the Sheltering {E}'],
  aura:   ['Resonance of the {E}', '{S} Concord', 'Ring of the {E} Voice'],
  damage: ['Hunt of the {E}', '{S} Pyre Rite', 'Rite of the Rending {E}'],
  crit:   ['Eye of the {E}', '{S} Sight Ritual', 'Rite of the Marked Prey'],
  resist: ['Veil of the {E}', '{S} Stillness Rite', 'Rite of the Unmoved {E}'],
  dodge:  ['Dance of the {E}', '{S} Drift Ritual', 'Rite of the Elusive {E}'],
  slow:   ['Mire of the {E}', '{S} Binding Rite', 'Rite of the Heavy {E}'],
  strike: ['Judgement of the {E}', '{S} Storm Rite', 'Rite of the Falling {S}'],
  pulse:  ['Bloom of the {E}', '{S} Mending Rite', 'Rite of the Gentle {E}'],
  drain:  ['Tithe of the {E}', '{S} Hunger Rite', 'Rite of the Patient {E}'],
};
const FOOD_TEMPLATES = ['Table of the {E}', '{S} Feast Rite', 'Rite of the Laden {E}'];
const POTION_TEMPLATES = ['Cauldron of the {E}', '{S} Brewing Rite', 'Rite of the Poured {E}'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
const pickIn = (h, shift, arr) => arr[((h >>> shift) & 0xffff) % arr.length];
const between = (h, shift, [lo, hi]) => lo + (((h >>> shift) & 0xffff) / 0xffff) * (hi - lo);

function shortName(id, catalog, strip) {
  const d = catalog[id];
  return String((d && d.name) || id).replace(strip, '').trim() || id;
}

// ---------------------------------------------------------------------------
// CHANTS (ROUND 311)
//
// "Give rituals a chant related to their essence thematic like the books. 1-2
// sentences should be sufficient." The books print an incantation under each
// ritual ability ("Let this mortal blood beckon the all-devouring power of the
// final threshold. Answer the call ..."), invoking what the ability is made of.
// So the first sentence calls on the ESSENCE's own phrase and the second says
// what the rite is for in the STONE's. Both phrases are already in the
// catalogues ("rending talons", "the open road"), so a chant is the pairing
// speaking in its own voice. Deterministic per pair, like the rite.
// ---------------------------------------------------------------------------
const CHANT_OPEN = [
  (pe) => `By ${pe}, I mark this ground.`,
  (pe) => `${cap(pe)}, hear the one who kneels here.`,
  (pe) => `Let ${pe} bear witness to this circle.`,
  (pe) => `I call on ${pe}; gather in this place.`,
];
const CHANT_CLOSE = {
  guard:  [(ps) => `Let ${ps} stand between us and every blow.`, (ps) => `Let ${ps} be a wall that nothing in this circle will break.`],
  aura:   [(ps) => `Let ${ps} swell until the circle is the measure of my reach.`, (ps) => `Let ${ps} ring outward, and let all who feel it know whose ground this is.`],
  damage: [(ps) => `Let ${ps} sharpen every blow struck within.`, (ps) => `Let ${ps} lend its edge to every hand in this circle.`],
  crit:   [(ps) => `Let ${ps} guide each strike to the place that ends it.`, (ps) => `Let ${ps} open the weak place in everything that comes.`],
  resist: [(ps, el) => `Let ${ps} turn aside what ${el} would take from us.`, (ps, el) => `Let ${ps} harden us against ${el}, and let it find nothing to hold.`],
  dodge:  [(ps) => `Let ${ps} carry us out of the way of every blow.`, (ps) => `Let ${ps} make us a thing that cannot be struck.`],
  slow:   [(ps) => `Let ${ps} settle on all who enter, and let them wade.`, (ps) => `Let ${ps} grow heavy in the limbs of everything that comes.`],
  strike: [(ps, el) => `Let ${ps} fall as ${el}, and judge what stands against us.`, (ps, el) => `Let ${ps} answer in ${el}, and let nothing here go unanswered.`],
  pulse:  [(ps) => `Let ${ps} bloom through us and close what is open.`, (ps) => `Let ${ps} be gentle, and let us rise.`],
  drain:  [(ps) => `Let ${ps} take what is owed from our enemies, and pay it to me.`, (ps) => `Let ${ps} be patient, and let the debt be collected.`],
  food:   [(ps) => `Let ${ps} lay a table where none was set, and let us be fed.`, (ps) => `Let ${ps} be gathered into plenty, and let the road be easy.`],
  potion: [(ps) => `Let ${ps} be poured into these hands, and let it heal.`, (ps) => `Let ${ps} run clear in the cup, and let it mend what it touches.`],
};
function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

/** The chant for a ritual: one or two sentences, as an array of sentences. */
export function chantFor(r) {
  const E = ESSENCE_CATALOG[r.essenceId], S = STONE_CATALOG[r.stoneId];
  if (!E || !S) return [];
  const h = hash(`chant|${r.essenceId}|${r.stoneId}`);
  const pe = String(E.phrase || String(E.name || r.essenceId).toLowerCase());
  const ps = String(S.phrase || String(S.name || r.stoneId).toLowerCase());
  const open = pickIn(h, 3, CHANT_OPEN)(pe);
  if (r.kind === 'familiar') {
    const cn = r.creatureName || 'Creature';
    return [open, `${cn}, come forth as ${ps} made flesh; bind yourself to me and walk beside me.`];
  }
  const key = r.kind === 'conjure' ? (r.conjure === 'potion' ? 'potion' : 'food') : r.effect;
  const el = ELEMENT_LABELS[r.element] || r.element || 'harm';
  const closers = CHANT_CLOSE[key] || CHANT_CLOSE.guard;
  return [open, pickIn(h, 7, closers)(ps, el)];
}

/** One ritual for one pairing (or null: most pairings offer none). Pure. */
export function ritualFor(essenceId, stoneId) {
  const r = ritualBase(essenceId, stoneId);
  if (r) r.chant = chantFor(r);
  return r;
}
function ritualBase(essenceId, stoneId) {
  const E = ESSENCE_CATALOG[essenceId], S = STONE_CATALOG[stoneId];
  if (!E || !S) return null;
  const h = hash(`ritual|${essenceId}|${stoneId}`);
  const ename = shortName(essenceId, ESSENCE_CATALOG, / Essence$/);
  const sname = shortName(stoneId, STONE_CATALOG, /^Stone of |^Stone /);
  // ROUND 311 -- most pairings offer no rite at all.
  if (hash(`gate|${essenceId}|${stoneId}`) % 1000 >= RITUAL_CHANCE * 1000) return null;
  const roll = (h >>> 3) % 100;
  const base = { key: `rit_${essenceId}_${stoneId}`, essenceId, stoneId, essenceFamily: E.family, stoneFamily: S.family };
  const fmt = (t) => t.replace(/\{E\}/g, ename).replace(/\{S\}/g, sname);

  if (roll < 50) {
    // ---- 2.3.3 the great combat ritual -----------------------------------
    const pool = [...(FAMILY_EFFECTS[E.family] || ['damage']), ...(FAMILY_EFFECTS[S.family] || ['guard'])];
    const eff = pickIn(h, 5, pool);
    const def = COMBAT_EFFECTS[eff];
    const element = FAMILY_ELEMENT[S.family] || FAMILY_ELEMENT[E.family] || pickIn(h, 9, ELEMENT_FALLBACK);
    const value = Math.round(between(h, 11, def.range));
    return {
      ...base, kind: 'combat', effect: eff, element,
      name: fmt(pickIn(h, 13, NAME_TEMPLATES[eff])),
      castS: Math.round(between(h, 15, COMBAT_CAST_S)),
      cooldownS: Math.round(between(h, 17, COMBAT_COOLDOWN_S) / 60) * 60,
      costFrac: Math.round(between(h, 19, COMBAT_COST_FRAC) * 100) / 100,
      zoneLifeS: Math.round(between(h, 21, ZONE_LIFE_S) / 60) * 60,
      zoneAuraMult: Math.round(between(h, 23, ZONE_AURA_MULT) * 100) / 100,
      value,
    };
  }
  if (roll < 75) {
    // ---- 2.3.2 conjuring --------------------------------------------------
    const potion = POTION_FAMILIES.has(E.family) || POTION_FAMILIES.has(S.family);
    return {
      ...base, kind: 'conjure', conjure: potion ? 'potion' : 'food',
      name: fmt(pickIn(h, 13, potion ? POTION_TEMPLATES : FOOD_TEMPLATES)),
      castS: Math.round(between(h, 15, CONJURE_CAST_S)),
      cooldownS: Math.round(between(h, 17, CONJURE_COOLDOWN_S) / 60) * 60,
      costFrac: Math.round(between(h, 19, CONJURE_COST_FRAC) * 100) / 100,
      count: potion ? 3 : 4,
    };
  }
  // ---- 2.3.1 a permanent familiar ------------------------------------------
  const fam = summonCreatureForSocket(stoneId, essenceId, [essenceId])
    || SUMMON_CREATURE_BY_FAMILY[E.family] || SUMMON_CREATURE_BY_FAMILY[S.family];
  const prof = fam ? SUMMON_CREATURES[fam] : null;
  if (!prof) {
    // Nothing in the roster answers to this pairing: it conjures instead,
    // which is still a ritual that makes sense for the pair.
    return {
      ...base, kind: 'conjure', conjure: 'food',
      name: fmt(pickIn(h, 13, FOOD_TEMPLATES)),
      castS: Math.round(between(h, 15, CONJURE_CAST_S)),
      cooldownS: Math.round(between(h, 17, CONJURE_COOLDOWN_S) / 60) * 60,
      costFrac: Math.round(between(h, 19, CONJURE_COST_FRAC) * 100) / 100,
      count: 4,
    };
  }
  const cname = (prof && prof.name) || ename;
  return {
    ...base, kind: 'familiar', familiarFamily: prof ? prof.family : null,
    creatureName: cname,
    name: `Binding of the ${cname}`,
    castS: Math.round(between(h, 15, FAMILIAR_CAST_S)),
    cooldownS: 0,
    costFrac: 0.6,
    familiarDmg: 5 + ((h >>> 7) % 5), familiarInterval: 1.2, familiarRange: 150,
  };
}

/** Every ritual a socketed kit offers: one per (essence slot, stone). Names
 *  are made unique within the list. */
export function ritualsFromSlots(slotEssence, slotStones, cap = RITUAL_CAP) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < 3; i++) {
    const e = slotEssence && slotEssence[i];
    if (!e) continue;
    for (const s of ((slotStones && slotStones[i]) || [])) {
      if (!s) continue;
      const r = ritualFor(e, s);
      if (!r || seen.has(r.key)) continue;
      seen.add(r.key);
      out.push(r);
    }
  }
  if (out.length > cap) out.length = Math.max(0, cap);   // ROUND 311 -- never more than four
  const names = new Map();
  for (const r of out) {
    const n = (names.get(r.name) || 0) + 1;
    names.set(r.name, n);
    if (n > 1) r.name = `${r.name} ${['', 'II', 'III', 'IV', 'V', 'VI'][n - 1] || n}`;
  }
  return out;
}

/** The sentence that goes on the card (ROUND 311: with its chant). */
export function ritualCard(r) {
  if (!r) return '';
  const body = ritualBody(r);
  return r.chant && r.chant.length ? `${body} Chant: "${r.chant.join(' ')}"` : body;
}
function ritualBody(r) {
  const mins = (s) => `${Math.round(s / 60)} minutes`;
  if (r.kind === 'combat') {
    const def = COMBAT_EFFECTS[r.effect];
    const rr = { elementLabel: ELEMENT_LABELS[r.element] || r.element };
    return `Combat ritual. ${r.castS} seconds of uninterrupted casting; ${mins(r.cooldownS)} before it can be cast again; `
      + `it takes ${Math.round(r.costFrac * 100)}% of your mana, stamina and health. It marks the ground around you `
      + `(up to ${r.zoneAuraMult}x your aura) for ${mins(r.zoneLifeS)}: ${def.text(r.value, rr)}.`;
  }
  if (r.kind === 'conjure') {
    return `Conjuring. ${r.castS} seconds of casting; ${mins(r.cooldownS)} before it can be cast again; it takes ${Math.round(r.costFrac * 100)}% of your mana and stamina. `
      + (r.conjure === 'potion' ? `It brings forth ${r.count} potions of your rank.` : `It brings forth ${r.count} trail meals.`);
  }
  if (r.kind === 'familiar') {
    return `Binding. ${r.castS} seconds of casting; it takes ${Math.round(r.costFrac * 100)}% of your mana. The ${r.creatureName} is bound to you for good: `
      + `it strikes for ${r.familiarDmg} every ${r.familiarInterval}s within range. You can keep ${FAMILIAR_CAP} bound familiars.`;
  }
  return '';
}

export function ritualFaults() {
  const out = [];
  let combat = 0, conj = 0, fam = 0, total = 0, made = 0;
  const ids = Object.keys(ESSENCE_CATALOG).slice(0, 40), sts = Object.keys(STONE_CATALOG).slice(0, 40);
  for (const e of ids) for (const s of sts) {
    const r = ritualFor(e, s);
    total++;
    if (!r) continue;   // ROUND 311 -- most pairings offer none
    made++;
    if (!Array.isArray(r.chant) || r.chant.length < 1 || r.chant.length > 2 || r.chant.some(x => !x || /undefined|\{/.test(x))) out.push(`${r.key} has chant ${JSON.stringify(r.chant)}`);
    if (r.kind === 'combat') {
      combat++;
      if (r.castS < 30 || r.castS > 50) out.push(`${r.key} casts for ${r.castS}s`);
      if (r.cooldownS < 1800 || r.cooldownS > 5400) out.push(`${r.key} cools down for ${r.cooldownS}s`);
      if (r.costFrac <= 0.9) out.push(`${r.key} costs only ${r.costFrac}`);
      if (r.zoneLifeS < 600 || r.zoneLifeS > 1800) out.push(`${r.key} lasts ${r.zoneLifeS}s`);
      if (r.zoneAuraMult > 2) out.push(`${r.key} is ${r.zoneAuraMult}x the aura`);
      if (!COMBAT_EFFECTS[r.effect]) out.push(`${r.key} has effect ${r.effect}`);
    } else if (r.kind === 'conjure') conj++;
    else if (r.kind === 'familiar') { fam++; if (!r.familiarFamily) out.push(`${r.key} has no creature`); }
    else out.push(`${r.key} has kind ${r.kind}`);
    if (!r.name || /\{/.test(r.name)) out.push(`${r.key} has name ${r.name}`);
  }
  if (made / total > 0.25 || made / total < 0.05) out.push(`rituals are not rare: ${made} of ${total} pairings`);
  if (!combat || !conj || !fam) out.push(`the mix is combat ${combat}, conjure ${conj}, familiar ${fam}`);
  return out;
}
