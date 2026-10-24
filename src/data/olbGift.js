// ============================================================================
// ROUND 389 -- OLB'S SACRIFICE: THE GIFT EVOLUTION IT OFFERS, CHOSEN FOR THE KIT.
//
//   "Olb's sacrifice now offers a gift evolution, this is good. It shouldn't
//    always be the same -- it should pull from all of the available options and
//    try to look for something that synergizes with the character's kit."
//
// Round 388 paid the moment with whatever `eligibleEvolutions()[0]` was, which
// was always the soul scar's (The Soul Laid Open listed first). Now:
//
//   THE POOL      every nature gift evolution the player could wake at that
//                 moment: each Outworlder nature ability not yet evolved, once
//                 for each catalyst the catalogue has an entry for (the three
//                 essences and the confluence); the Astral Blessing's own
//                 evolution when it is eligible, dressed by each catalyst; and
//                 the soul scar's (The Soul Laid Open / Eyes Behind the Scar).
//                 This is a quest reward, so the catalogue's "the blessing
//                 first" ordering (which paces the stress rolls) does not gate
//                 the pool.
//   THE SCORE     each candidate's closing tag words and its fx, read against
//                 the kit as it stands: the damage it deals, the conditions it
//                 lays, its summons, heals, buffs, movement and guards, its aura
//                 and perception, spells against special attacks, the resource
//                 it spends, and the catalyst essence's share of the kit. The
//                 soul scar's evolution scores only when the kit holds an aura
//                 (or a perception) switched off by the one-a-kit cap, which it
//                 would switch back on.
//   THE PICK      the best; candidates scoring close to it are drawn between
//                 on the run's seed, so a reload offers the same and two runs
//                 need not. The game shows no choice for nature gift
//                 evolutions anywhere, so the best is awarded, not offered.
//   THE WHY       one plain line in the reward text: "It took this shape
//                 because your kit lays Burning."
// ============================================================================

import { abilityRoles } from './buildClasses.js';
import { CONDITIONS, dotConditionOf } from './essenceConditions.js';
import {
  NATURE_EVOLUTIONS, evolutionEligible, CATALOGUE_REFS, catalystsFor, catalogueEvolution, specKeyOf, SCAR_SENSE_TRACK,
} from './natures.js';

// ---------------------------------------------------------------------------
// THEMES: a damage type, and the tag words that name the same thing
// ---------------------------------------------------------------------------
export const THEME_OF_TYPE = {
  fire: 'fire', frost: 'cold', ice: 'cold', water: 'water', lightning: 'storm', wind: 'storm',
  nature: 'nature', plant: 'nature', earth: 'earth', rock: 'earth', sand: 'earth', life: 'life',
  light: 'light', radiant: 'light', dark: 'dark', shadow: 'dark', death: 'death', necrotic: 'death',
  blood: 'blood', poison: 'poison', curse: 'curse', arcane: 'arcane', dimension: 'arcane', disruptive: 'arcane',
};
const THEME_WORDS = {
  fire: ['fire', 'flame', 'flames', 'burn', 'burning', 'ember', 'embers', 'pyre', 'heat', 'ash'],
  cold: ['frost', 'ice', 'cold', 'winter', 'snow', 'freeze', 'frozen'],
  water: ['water', 'tide', 'sea', 'flood', 'rain', 'ocean'],
  storm: ['lightning', 'storm', 'thunder', 'wind', 'air', 'static'],
  nature: ['nature', 'growth', 'plant', 'wood', 'forest', 'root', 'roots'],
  earth: ['earth', 'stone', 'rock', 'sand', 'mountain'],
  life: ['life', 'vitality'],
  light: ['light', 'holy', 'radiant', 'sun', 'purification'],
  dark: ['shadow', 'shadows', 'darkness', 'dark', 'night'],
  death: ['death', 'necromantic', 'necrotic', 'undeath', 'decay', 'corpse'],
  blood: ['blood'],
  poison: ['poison', 'venom', 'toxin'],
  curse: ['curse', 'hex'],
  arcane: ['arcane', 'magic', 'dimension', 'space', 'astral'],
};
const THEME_SAY = {
  fire: 'fire', cold: 'frost', water: 'water', storm: 'lightning', nature: 'nature', earth: 'earth', life: 'life',
  light: 'radiant', dark: 'shadow', death: 'necrotic', blood: 'blood', poison: 'poison', curse: 'curse', arcane: 'arcane',
};
const WORD_THEME = {};
for (const [t, ws] of Object.entries(THEME_WORDS)) for (const w of ws) WORD_THEME[w] = t;

// conditions: the words a tag uses for one
const COND_WORDS = {
  burning: ['burn', 'burning', 'scorch', 'ember', 'embers', 'blaze'], bleeding: ['bleed', 'bleeding', 'blood'],
  poisoned: ['poison', 'poisoned', 'venom', 'toxin'], shocked: ['shock', 'shocked', 'static'],
  frozen: ['freeze', 'frozen', 'ice'], sin: ['sin'], seared: ['sear', 'seared'], soaked: ['soak', 'soaked', 'drench'],
  frostbitten: ['frostbite', 'frostbitten'], decaying: ['decay', 'decaying', 'wither'], corroded: ['corrode', 'corroded', 'acid'],
};
const WORD_COND = {};
for (const [c, ws] of Object.entries(COND_WORDS)) for (const w of ws) WORD_COND[w] = c;

// roles and kinds: word -> the kit feature it answers
const WORD_FEATURE = {
  summoning: 'summon', conjuration: 'summon', animation: 'summon', command: 'summon', swarm: 'summon', minion: 'summon', familiar: 'summon', companion: 'summon',
  healing: 'heal', restoration: 'heal', growth: 'heal', rebirth: 'heal', mending: 'heal', regeneration: 'heal',
  support: 'buff', sound: 'buff', resonance: 'buff', harmony: 'buff', boon: 'buff', blessing: 'buff', inspiration: 'buff',
  movement: 'movement', momentum: 'movement', haste: 'movement', flight: 'movement', travel: 'movement', teleportation: 'movement', speed: 'movement',
  defensive: 'guard', protection: 'guard', warding: 'guard', barrier: 'guard', shield: 'guard', evasion: 'guard', salvage: 'guard',
  tracking: 'perception', hunting: 'perception', perception: 'perception', revelation: 'perception', detection: 'perception', sensing: 'perception',
  aura: 'aura',
  area: 'aoe', annihilation: 'aoe', explosion: 'aoe', explosive: 'aoe',
  affliction: 'debuff', binding: 'debuff', restraint: 'debuff', control: 'debuff', curse: 'debuff', weakening: 'debuff',
  mastery: 'spell', spell: 'spell', spellcraft: 'spell',
  transformation: 'special', weapon: 'special', martial: 'special', combat: 'special',
  mana: 'mana', stamina: 'stamina',
};
// fx keys -> the kit feature they answer
const FX_EFFECT_FEATURE = { summon: 'summon', heal: 'heal', life: 'heal', buff: 'buff', movement: 'movement', spell: 'spell', special: 'special' };

/** What each feature is worth, and how it is said ("because your kit ..."). */
const FEATURE = {
  summon: { w: 2, say: 'calls summons' },
  heal: { w: 2, say: 'heals' },
  buff: { w: 2, say: 'lays buffs' },
  movement: { w: 2, say: 'has movement abilities' },
  guard: { w: 2, say: 'guards and shields' },
  perception: { w: 2, say: 'senses with a perception ability' },
  aura: { w: 2, say: 'runs an aura' },
  aoe: { w: 2, say: 'strikes in an area' },
  debuff: { w: 2, say: 'lays afflictions' },
  dot: { w: 2, say: 'lays damage over time' },
  spell: { w: 1, say: 'is built on spells' },
  special: { w: 1, say: 'is built on special attacks' },
  mana: { w: 1, say: 'spends mana' },
  stamina: { w: 1, say: 'spends stamina' },
};
// an ability the player earned and cannot run outweighs any lean of the kit's (the best fits score in the twenties)
const THEME_W = 2, COND_W = 3, RESIST_W = 1, CATALYST_W = 0.5, FREES_W = 100;
/** Candidates within this share of the best score are drawn between (variety among near-ties). */
export const GIFT_CLOSE = 0.15;

const condLabel = (c) => (CONDITIONS[c] && CONDITIONS[c].label) || c;

// ---------------------------------------------------------------------------
// THE KIT
// ---------------------------------------------------------------------------
/**
 * What the kit is made of. `entries` are { ability, slotIndex, essenceId, live } (live: switched on, or a non-passive);
 * `held` { aura: [names], perception: [names] } is what the one-a-kit cap holds switched off.
 */
export function kitProfile(entries, held = {}, dealsFn = null) {
  const deals = dealsFn || ((a) => (typeof a.base === 'number' && a.base > 0) || !!(a.dot && a.dot.dmgPerTick > 0));
  const P = { themes: {}, conds: {}, feats: {}, bySlot: {}, held: { aura: [...(held.aura || [])], perception: [...(held.perception || [])] }, n: 0 };
  const inc = (o, k, by = 1) => { if (k) o[k] = (o[k] || 0) + by; };
  for (const e of entries || []) {
    const a = e && e.ability;
    if (!a || e.live === false) continue;
    P.n++;
    inc(P.bySlot, e.slotIndex);
    const r = abilityRoles(a, deals);
    const dealt = deals(a);
    if (dealt || r.attack) inc(P.themes, THEME_OF_TYPE[a.element]);
    if (a.dot && a.dot.element) inc(P.themes, THEME_OF_TYPE[a.dot.element]);
    // conditions laid: a dot read by its label, a debuff by its key, a condition the ability plays on
    if (a.dot) { const c = dotConditionOf(a.dot.label); if (c) inc(P.conds, c); }
    const dk = a.debuff && (typeof a.debuff === 'string' ? a.debuff : a.debuff.key);
    if (dk) for (const [c, def] of Object.entries(CONDITIONS)) if ((def.keys || []).some(k => String(dk).startsWith(k)) || (def.dotRe && def.dotRe.test(String(dk)))) { inc(P.conds, c); break; }
    if (a.essCond && a.essCond.cond) inc(P.conds, a.essCond.cond);
    if (r.summoning) inc(P.feats, 'summon');
    if (r.healing || r.hot) inc(P.feats, 'heal');
    if (r.buff || r.support) inc(P.feats, 'buff');
    if (r.movement) inc(P.feats, 'movement');
    if (r.defensive || r.shield) inc(P.feats, 'guard');
    if (r.aoe) inc(P.feats, 'aoe');
    if (r.debuff) inc(P.feats, 'debuff');
    if (r.dot) inc(P.feats, 'dot');
    if (a.template === 'aura') inc(P.feats, 'aura');
    if (a.template === 'perception') inc(P.feats, 'perception');
    if (r.attack) inc(P.feats, (a.requiresWeapon || a.special) ? 'special' : 'spell');
    const res = a.cost && a.cost.type;
    if (res === 'mana' || res === 'stamina') inc(P.feats, res);
  }
  return P;
}

// ---------------------------------------------------------------------------
// THE CANDIDATE
// ---------------------------------------------------------------------------
const wordsOf = (t) => String(t || '').toLowerCase().replace(/^this is an? /, '').replace(/ effects?\.?$/, '').split(/[^a-z]+/).filter(Boolean);
const tagOf = (evo) => evo.tag || (evo.lines && evo.lines[evo.lines.length - 1]) || '';

/** What a candidate leans on: { themes, conds, feats, resist } (sets), from its closing tag and its fx. */
export function giftSignals(evo) {
  const S = { themes: new Set(), conds: new Set(), feats: new Set(), resist: new Set() };
  for (const w of wordsOf(tagOf(evo))) {
    if (WORD_THEME[w]) S.themes.add(WORD_THEME[w]);
    if (WORD_COND[w]) S.conds.add(WORD_COND[w]);
    if (WORD_FEATURE[w]) S.feats.add(WORD_FEATURE[w]);
  }
  const fx = evo.fx || {};
  for (const [t, v] of Object.entries(fx.effect || {})) if (v > 0 && FX_EFFECT_FEATURE[t]) S.feats.add(FX_EFFECT_FEATURE[t]);
  for (const [t, v] of Object.entries(fx.dmg || {})) {
    if (!(v > 0)) continue;
    if (t === 'dot') S.feats.add('dot');
    else if (t.startsWith('el:') && THEME_OF_TYPE[t.slice(3)]) S.themes.add(THEME_OF_TYPE[t.slice(3)]);
  }
  for (const [el, v] of Object.entries(fx.resist || {})) if (v > 0 && THEME_OF_TYPE[el]) S.resist.add(THEME_OF_TYPE[el]);
  if (fx.guard > 0 || fx.dodge > 0) S.feats.add('guard');
  if (fx.perception > 0) S.feats.add('perception');
  if (fx.move > 0) S.feats.add('movement');
  if (fx.healTaken > 0) S.feats.add('heal');
  if (fx.manaRegen > 0 || fx.manaRestore > 0 || fx.manaUpkeepCut > 0 || fx.maxManaPct > 0) S.feats.add('mana');
  if (fx.maxStaminaPct > 0 || fx.sprintCostCut > 0) S.feats.add('stamina');
  if (fx.afflictCut > 0 && S.feats.has('dot')) S.feats.add('debuff');
  // the soul scar's own: what it lifts is scored on its own terms (scoreGift), not as "the kit runs an aura"
  if (fx.multiAura || fx.multiPerception) { S.feats.delete('aura'); S.feats.delete('perception'); }
  return S;
}

/** The kind the soul scar's evolution lifts the cap for, or null. */
export const giftLifts = (evo) => (evo && evo.fx && evo.fx.multiAura ? 'aura' : (evo && evo.fx && evo.fx.multiPerception ? 'perception' : null));

/**
 * How well `evo` fits the kit. Returns { score, reasons: [{ w, kind, text }] }, strongest reason first.
 * `catalyst` { slotIndex, name } is the slot the catalyst essence sits in, when the candidate has one.
 */
export function scoreGift(evo, P, catalyst = null) {
  const reasons = [];
  const add = (w, kind, text) => { if (w > 0) reasons.push({ w, kind, text }); };
  const lifts = giftLifts(evo);
  if (lifts) {
    // "The Soul Laid Open scores high only when it would actually free something."
    const held = (P.held && P.held[lifts]) || [];
    if (held.length) add(FREES_W + held.length, 'frees', `holds ${held[0]} switched off, and this lets it run`);
    const score = reasons.reduce((s, r) => s + r.w, 0);
    return { score, reasons, frees: held.length > 0, lifts };
  }
  const S = giftSignals(evo);
  const k = (n) => Math.min(3, n || 0);
  for (const c of S.conds) add(COND_W * k(P.conds[c]), 'cond', `lays ${condLabel(c)}`);
  for (const t of S.themes) add(THEME_W * k(P.themes[t]), 'theme', `deals ${THEME_SAY[t] || t} damage`);
  for (const t of S.resist) if (!S.themes.has(t)) add(RESIST_W * Math.min(1, P.themes[t] || 0), 'theme', `deals ${THEME_SAY[t] || t} damage`);
  for (const f of S.feats) if (FEATURE[f]) add(FEATURE[f].w * k(P.feats[f]), f, FEATURE[f].say);
  if (catalyst && catalyst.slotIndex != null) {
    const n = (P.bySlot && P.bySlot[catalyst.slotIndex]) || 0;
    add(CATALYST_W * Math.min(4, n), 'catalyst', `draws on your ${catalyst.name}`);
  }
  reasons.sort((a, b) => b.w - a.w);
  return { score: reasons.reduce((s, r) => s + r.w, 0), reasons, frees: false, lifts: null };
}

/** The reward text's line. Plain: what in the kit it answers, no comparisons. */
export function giftWhyLine(reasons) {
  const rs = (reasons || []).filter(r => r && r.text);
  if (!rs.length) return '';
  const top = rs[0];
  if (top.kind === 'frees') return `It took this shape because your kit ${top.text}.`;
  const kitSaid = rs.filter(r => r.kind !== 'catalyst' && r.kind !== 'frees');
  const seen = new Set(), parts = [];
  for (const r of kitSaid) { if (seen.has(r.text)) continue; seen.add(r.text); parts.push(r.text); if (parts.length >= 2) break; }
  const cat = rs.find(r => r.kind === 'catalyst');
  if (!parts.length) return cat ? `It took this shape because it ${cat.text}.` : '';
  return `It took this shape because your kit ${parts.join(' and ')}.`;
}

// ---------------------------------------------------------------------------
// THE POOL
// ---------------------------------------------------------------------------
/**
 * Every nature gift evolution the player could wake now, for Olb's sacrifice. `st` is natureMixin's `_natureState()`
 * shape (natureId, have, essences, essenceNames, confluence, scars, senseWant, blessing, kitComplete); `cat` the
 * catalogue (null when it has not loaded), `specs` its specs, `seed` the run's. Returns [{ evo, catalyst }] where
 * `catalyst` is { id, name } or null.
 */
export function olbGiftCandidates(st, cat = null, specs = null, seed = 0) {
  if (!st || st.natureId !== 'outworlder') return [];
  const have = st.have || {};
  const out = [];
  const seen = new Set();
  const push = (evo, catalyst) => { if (evo && !seen.has(evo.id)) { seen.add(evo.id); out.push({ evo, catalyst }); } };
  const book = (ref) => (cat && cat.racials && cat.racials[ref]) || null;
  const specOf = (ref, entry) => (specs ? specs[specKeyOf(ref, entry.catalyst)] || null : null);
  // the static table: the soul scar's, and the Astral Blessing's own (each with its own rule)
  for (const e of NATURE_EVOLUTIONS) {
    if (!evolutionEligible(e, st)) continue;
    if (e.of === 'outworlder.blessing' && e.tier === 1 && e.when && e.when.blessing && book(`outworlder.blessing@${e.when.blessing}`)) {
      const bref = `outworlder.blessing@${e.when.blessing}`;
      let any = false;
      for (const c of catalystsFor(st, bref, seed)) {
        const entry = book(bref)[String(c.name).toLowerCase()];
        if (!entry || entry.blocked) continue;
        const dressed = catalogueEvolution(bref, entry, c.id, 1, e.fx, specOf(bref, entry));
        // one id per catalyst while it is a candidate; recorded under the blessing's own id when it wakes
        push({ ...dressed, id: `${e.id}|${String(c.name).toLowerCase()}`, blessingId: e.id, of: e.of }, c);
        any = true;
      }
      if (any) continue;
    }
    push(e, null);
  }
  // the catalogue: each Outworlder ability not yet evolved, once per catalyst it has an entry for
  for (const ref of CATALOGUE_REFS) {
    if ((have[ref] || []).length || !book(ref)) continue;
    for (const c of catalystsFor(st, ref, seed)) {
      const entry = book(ref)[String(c.name).toLowerCase()];
      if (!entry || entry.blocked) continue;
      push(catalogueEvolution(ref, entry, c.id, 1, {}, specOf(ref, entry)), c);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE PICK
// ---------------------------------------------------------------------------
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return h; };

/**
 * `scored` [{ evo, score, frees, lifts, reasons }]. The best, drawn on `key` among those close to it; the soul scar's
 * evolution is passed over when it would free nothing, unless nothing else is on offer. Returns { pick, band, ranked }.
 */
export function pickGift(scored, key) {
  const all = (scored || []).filter(Boolean);
  if (!all.length) return { pick: null, band: [], ranked: [] };
  const useful = all.filter(s => !(s.lifts && !s.frees));
  const pool = useful.length ? useful : all;
  const ranked = [...pool].sort((a, b) => (b.score - a.score) || (a.evo.id < b.evo.id ? -1 : a.evo.id > b.evo.id ? 1 : 0));
  const best = ranked[0].score;
  const floor = best - Math.max(0.5, best * GIFT_CLOSE);
  const band = ranked.filter(s => s.score >= floor);
  const pick = band[hash(`${key}|${band.map(s => s.evo.id).join(',')}`) % band.length];
  return { pick, band, ranked };
}

/** The evolution as it is recorded when it wakes: a dressed blessing goes back under the blessing's own id. */
export function giftAsAwarded(evo) {
  if (!evo || !evo.blessingId) return evo;
  const { blessingId, ...rest } = evo;
  return { ...rest, id: blessingId };
}

export const OLB_GIFT_TRACKS = { scar: SCAR_SENSE_TRACK };
