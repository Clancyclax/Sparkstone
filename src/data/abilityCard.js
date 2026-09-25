// ===========================================================================
// ROUND 190 (update 10) -- THE ABILITY CARD, IN THE BOOKS' FORMAT.
//
//   Ability: [Burst Shield] (Shield)
//   Special ability (recovery, retribution, magic, curse).
//   Cost: Moderate mana.
//   Cooldown: 20 seconds.
//   Current rank: Silver 2 (61%).
//   Effect (iron): Create a short-lived shield that ...
//   Effect (bronze): Inflicts [Vibrant Echo] on anyone damaged by the blast.
//   Effect (silver): Inflicts [Slow Learner] on anyone damaged by the blast.
//   [Vibrant Echo] (affliction, damage-over-time, magic, stacking): ...
//
//   10.1 "Currently higher rank effects overwrite lower rank effects. Rank ups
//        add effects, not overwrite them."
//   10.2 "companion abilities also need to be formatted the same way"
//
// One builder, returning plain parts, so the essence screen, the companion
// sheet and anything else render the same card. Each rank's line is what that
// rank ADDS -- a perception or an aura, whose tables hold the whole state per
// rank, is diffed against the rank below so a clause appears once, at the
// rank that brought it.
// ===========================================================================
import { ASPECT_RANKS, rankAspectsFor, statsLineFor, rankScaled, formatRider,
  STONE_THEMES } from './awakening.js';
import { SENSES, senseAt } from './perception.js';
import { senseEffectClauses } from './senseClauses.js';
import { specAtRank as auraAtRank, auraEffectClauses } from './auras.js';
import { conditionDef, conditionByLabel } from './debuffs.js';
// ROUND 203 -- the one clause that says when a transcendent ability's damage
// is actually transcendent. See transcendent.js.
import { gateClause } from './transcendent.js';
import {
  cooldownPhrase, canonTags, costBand, drainPhrase, COOLDOWN_VARIES, VARIES_RULES,
  transformAtRank, transformEffectClauses,
} from './abilityCanon.js';

const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);

const TYPE_WORD = {
  absorbShield: 'Shield', armorBuff: 'Defence', immunityBuff: 'Defence', reflectWard: 'Ward', thornsBuff: 'Retribution',
  barrierWall: 'Barrier', tauntPull: 'Taunt', projectileBall: 'Bolt', volley: 'Volley', aoeRing: 'Nova',
  breathCone: 'Breath', chainStrike: 'Strike', sunderStrike: 'Strike', rangeStrike: 'Strike', stackStrike: 'Strike',
  imbueStrike: 'Strike', selfHeal: 'Healing', selfHot: 'Healing', aoeHealPulse: 'Healing', bloomField: 'Healing',
  cleanse: 'Cleansing', aura: 'Aura', perception: 'Perception', stacking: 'Stacking', activeSummon: 'Summon',
  summonBonded: 'Familiar', raiseDead: 'Summon', summonWeapon: 'Conjuration', summonArmor: 'Conjuration',
  summonGear: 'Conjuration', dash: 'Movement', teleport: 'Movement', movementHaste: 'Movement', passiveMove: 'Movement',
  stealthVeil: 'Concealment', timeFreeze: 'Control', confuseTurn: 'Control', abilityLock: 'Control',
  weakenRing: 'Curse', corpseBlast: 'Corpse', corpseMiasma: 'Corpse', corpseMine: 'Corpse', corpseDrain: 'Corpse',
  weaponAffinity: 'Weapon', twoHandWield: 'Weapon', unarmedFocus: 'Weapon', attrBoost: 'Attribute',
};

/** "Special attack", "Spell", "Special ability" or "Passive". */
function kindWord(a) {
  if (a.kind === 'passive') return 'Passive ability';
  if (a.requiresWeapon || (a.cost && a.cost.type === 'stamina' && a.category === 'attack')) return 'Special attack';
  if (a.category === 'attack') return 'Spell';
  return 'Special ability';
}

// ROUND 201 -- the tag vocabulary moved to abilityCanon.js, which added the
// seven canon tags nothing here could derive (dimension, illusion,
// shape-change, boon, holy, counter, counter-execute) and put the whole list
// in the books' own order. This wrapper is all that is left of the old one;
// the rules it used to hold are the first ten entries of CANON_TAG_RULES,
// carried over unchanged.
const tagWords = (a) => canonTags(a);

function costWord(a) {
  // ROUND 201 -- a per-second drain of one or two pools ([Eternal Moment]).
  // It is printed INSTEAD of the entry price when there is no entry price and
  // AFTER it when there is, because "Cost: Moderate mana. Very high mana and
  // stamina, per second." is two different prices and a player needs both.
  const drain = drainPhrase(a);
  if (a.kind === 'passive' || !a.cost) return drain || 'None.';
  const w = costBand(a.cost.amount);
  const entry = `${w} ${a.cost.type}${a.spammable ? ', rising with each unbroken repeat' : ''}${a.bloodSurrogate ? ' (health can pay)' : ''}.`;
  return drain ? `${entry} ${drain}` : entry;
}

// ROUND 201 -- `cooldownPhrase` (abilityCanon.js) replaces a band table that
// topped out at minutes, so a canon six-hour cooldown printed "360 minutes".
// It also answers the two cases that had no line at all: a real zero prints
// "None." (canon's word on [Castigate] and [Karmic Warrior]) and a cooldown
// computed at use prints "Varies." ([Blessing of Readiness]).
//
// The passive guard stays: a passive has no cooldown line whatever it carries,
// because a triggered passive's internal cooldown is a property of the trigger
// and is stated in the trigger's own clause.
function cooldownWord(a) {
  if (a.kind === 'passive') return null;
  // ROUND 203 -- the flag, not a sentinel in the number. `a.cooldown` holds
  // the FLOOR of a Varies cooldown so that everything doing arithmetic on it
  // keeps working; this is the one surface that has to say the canon word.
  if (a.variesCooldown && VARIES_RULES[a.variesCooldown]) return cooldownPhrase(COOLDOWN_VARIES);
  return cooldownPhrase(a.cooldown);
}

/** A clause with its numbers taken out: two clauses with the same shape are
 *  the same effect at different strengths. */
const shapeOf = (c) => String(c).toLowerCase().replace(/[0-9]+(\.[0-9]+)?/g, '#');

/** Diff a rank's full clause list against the rank below: new effects are
 *  ADDED, same-shaped ones with new numbers are STRONGER. */
function diffClauses(prev, now, rank = null) {
  const prevSet = new Set(prev);
  const prevShapes = new Set(prev.map(shapeOf));
  const added = [], stronger = [];
  for (const c of now) {
    if (prevSet.has(c)) continue;
    (prevShapes.has(shapeOf(c)) ? stronger : added).push(c);
  }
  const out = [];
  if (added.length) out.push(`Adds: ${added.join('; ')}`);
  // ===== ROUND 202 (item 3) -- `Stronger:` IS COUNTED, NOT RESTATED ========
  //
  // This used to print the whole clause list again with the numbers nudged, so
  // a gold aura's card carried the same seven clauses four times over:
  //
  //   Effect (silver): Adds: kills outright anything below 10% health.
  //     Stronger: enemies within 4.4 tiles gain a mark every 1.5s (up to 5);
  //     each mark makes them take 5% more damage; anything that attacks you
  //     from inside takes 15 damage back; you heal for 38% of the field's
  //     damage.
  //   Effect (gold): ... the same four clauses, at 4.9 tiles and 6 and 6%.
  //
  // It measured at 9.1% of all cards and it is the "one ability offered four
  // times" shape -- the same fault round 134 fixed for two abilities inside a
  // kit, here between four ranks of one ability. Every one of those numbers is
  // already on the card: `Numbers now:` prints the figures AT THE PLAYER'S
  // RANK, so a reader who wants the silver figure reads it there.
  //
  // What is worth saying is that the rank moved something and how many things
  // it moved, because that is the one fact the numbers line cannot give
  // (it shows one rank at a time). So the count survives and the restatement
  // does not.
  // ===== ROUND 204 (item 2.8.2 / 2.3.4) -- AND A COUNT IS NOT A SENTENCE ===
  //
  // The user, on round 202's answer: `"4 of its figures grow." makes no
  // sense`. It does not, and the reason it measured as an improvement last
  // round is that it replaced something worse rather than something good.
  //
  // What he asked for instead is explicit: "If it said Effect (bronze) and
  // said reduced enemy armor by an additional 10% on strike, or paces required
  // reduced by 50%, or cap increased to 48% any of those would be acceptable
  // ... abilities don't always have to get more complicated, they can just get
  // better (longer, more powerful, cheaper, faster)."
  //
  // So the clause is restated AT ITS NEW VALUE -- which is the concrete thing
  // he named -- and capped at two, which is what keeps round 202's finding
  // from coming back. That finding was never "do not restate a clause"; it was
  // that restating ALL SEVEN at each of four ranks printed one ability four
  // times. Two is enough to say what a rank did and short enough to read.
  // ===== ROUND 204c -- AND THERE IS NO `Stronger:` AT IRON ===============
  //
  // A census of 1,000 generated abilities found one real instance of the
  // user's sixth report of this fault, and it was not in a ladder: an IRON
  // card reading `Stronger: you pick things up from 80% further away.`
  //
  // Iron is diffed against the `normal` row -- a rank below the one every
  // character starts at, which no player has ever seen. So at iron the split
  // between "added" and "stronger" is a distinction the reader cannot make:
  // everything on that line is new to them. The clauses are real information
  // and are kept; they are simply listed as what the ability DOES rather than
  // as what it does better than a version that never existed.
  if (stronger.length && rank === ASPECT_RANKS[0]) {
    added.push(...stronger);
    stronger.length = 0;
    // Rebuilt, because the `Adds:` line above was written before this ran.
    out.length = 0;
    out.push(`Adds: ${added.join('; ')}`);
  }
  if (stronger.length) {
    const shown = stronger.slice(0, 2).join('; ');
    const rest = stronger.length - 2;
    out.push(`Stronger: ${shown}${rest > 0 ? `, and ${rest} more of its figures` : ''}`);
  }
  return out;
}

/** What each rank ADDS, as sentences. */
function rankAdds(a) {
  const out = {};
  const table = (rowAt) => {
    let prev = rowAt('normal');
    for (const r of ASPECT_RANKS) {
      const now = rowAt(r);
      out[r] = diffClauses(prev, now, r);
      prev = now;
    }
  };
  if (a.template === 'perception' && a.sense && SENSES[a.sense]) {
    table((r) => senseEffectClauses(senseAt(a.sense, r)));
    return out;
  }
  if (a.template === 'aura' && a.aura) {
    table((r) => { const row = auraAtRank(a.aura, r); return row ? auraEffectClauses(row.spec, row.trigger, row.effect) : []; });
    return out;
  }
  // ROUND 201 -- a transformation's table holds the WHOLE state per rank, the
  // same shape a perception and an aura use, so the same diff produces "gain
  // the ability to use magical tools" once at iron and "Stronger: +5" at
  // bronze rather than repeating five clauses four times.
  if (a.transform) {
    table((r) => transformEffectClauses(transformAtRank(a.transform, r)));
    return out;
  }
  // ===== ROUND 205 (item 1.1) -- THE AUTHORED RIDERS ARE RANK LINES TOO ====
  //
  // The user, on a Silver-rank mastery: "Ability is silver rank but doesn't
  // have a bronze or silver effect."
  //
  // `rankAspectsFor` dropping the mastery ladder was half of it; this is the
  // other half, and it is wider than the mastery. Round 77 gave the attribute
  // passives and the water walk their OWN hand-written rank tables -- bronze
  // "the small hurts close on their own", silver "you get your breath back
  // between things", gold "and everything you have comes round again sooner"
  // -- and round 190 rebuilt the card out of `rankAspects` alone. From that
  // round to this one the card has never printed a single one of them: every
  // attrBoost and every waterWalk in the game showed one iron line at every
  // rank, under a description that says in so many words "it goes on
  // deepening in other ways as you rank".
  //
  // Fault class 2 on this project's own list -- written by one side, read by
  // none. `rankEffectLine` reads them and nothing calls `rankEffectLine` for
  // the card any more.
  //
  // The rider's `text` is already a rank-effect clause in the card's own
  // voice, so it is pushed as one; `formatRider` supplies the figure, because
  // "the small hurts close on their own" without "+12% health recovery" is the
  // prose-without-mechanic half of this project's standing wording rule.
  for (const rd of (a.riders || [])) {
    if (!out[rd.rank]) out[rd.rank] = [];
    const where = a.template === 'waterWalk' ? ' while on water or swamp' : '';
    out[rd.rank].push(`${rd.text}${where} (${formatRider(rd)})`);
  }
  for (const x of (a.rankAspects || rankAspectsFor(a))) {
    (out[x.rank] = out[x.rank] || []).push(x.label);
  }
  return out;
}

function conditionsOf(a) {
  const out = [];
  const seen = new Set();
  const add = (def, label) => {
    const name = (def && def.label) || label;
    if (!name || seen.has(name)) return;
    seen.add(name);
    const tags = def && def.tags ? def.tags.join(', ') : 'affliction';
    const blurb = def && def.blurb ? cap(def.blurb) : '';
    out.push(`[${name}] (${tags})${blurb ? `: ${blurb}.` : ''}`);
  };
  if (a.debuff) add(conditionDef(a.debuff.key), a.debuff.key);
  // ===== ROUND 204 (item 2.7.1) -- EVERY AFFLICTION THE CARD NAMES ========
  //
  // The user, on a field passive: "Doesn't explain what Unity Mark or
  // Balancing Ledger do."
  //
  // Unity Mark is gone (it was a signature handle, not a thing -- see
  // awakening.js). Balancing Ledger is real and the card simply never
  // explained it, because this function only looked at `a.debuff` and `a.dot`
  // -- the two places an affliction arrives when the TEMPLATE puts it there.
  // An aura signature, a field, a rank rung or a composed rider names one in
  // prose and none of them touch those fields.
  //
  // So the card reads its own text: anything it prints in [brackets] is
  // something the player is being told about and is therefore something the
  // player is owed a definition of. One rule, and it cannot go stale as new
  // sources of afflictions are added, because it keys off the printed page
  // rather than off a list of the places an affliction can come from.
  for (const src of [a.desc, ...(a.rankAspects || []).map(x => x && x.label)]) {
    for (const m of String(src || '').matchAll(/\[([^\]]{2,40})\]/g)) {
      const name = m[1];
      const def = conditionDef(name) || conditionByLabel(name);
      if (def) add(def, name);
    }
  }
  const dotDef = (label) => ({ label, tags: ['affliction', 'damage-over-time'],
    blurb: `deals ongoing ${a.element && a.element !== 'physical' ? a.element : 'physical'} damage for a few seconds after the hit` });
  if (a.dot && a.dot.label) add(dotDef(a.dot.label), a.dot.label);
  for (const x of (a.rankAspects || [])) if (x.dot && x.dot.label) add(dotDef(x.dot.label), x.dot.label);
  return out;
}

/**
 * The card's parts. `standing` is {rank, level, progress}; omit it for a card
 * with no rank line (a preview). Effects are listed for every rank reached;
 * the next rank's is included separately, marked, so the reader can see what
 * is coming without it reading as something they have.
 */
export function abilityCard(a, standing = null) {
  const rank = standing && ASPECT_RANKS.includes(standing.rank) ? standing.rank : 'iron';
  const at = ASPECT_RANKS.indexOf(rank);
  const level = Math.max(0, Math.min(9, Math.round((standing && standing.level) || 0)));
  const adds = rankAdds(a);
  const effects = [];
  // ===== ROUND 204 (item 1) -- ONLY THE RANKS YOU HAVE ===================
  //
  // The user: "An ability should only report what it does currently.
  // Abilities don't report what they do at a rank until they are that rank."
  //
  // The `(next) Effect (silver): ...` line is gone. It was added on the
  // reasoning that a reader wants to see what is coming; the reader's own
  // ruling is that a card is a statement of what the ability DOES, and a
  // sentence about a rank you have not reached is a different kind of claim
  // sitting in the same list as the true ones. The rank ladder is still
  // visible where it belongs -- on the essence screen, which is about
  // progress -- and nothing about the ranks themselves changed.
  ASPECT_RANKS.forEach((r, i) => {
    if (i > at) return;
    let text = (adds[r] || []).map(cap).join('. ');
    if (i === 0) text = [String(a.desc || '').trim(), text].filter(Boolean).join(' ');
    if (!text) return;
    effects.push({ rank: r, text: text.replace(/\.?$/, '.'), reached: true });
  });
  const tags = tagWords(a);
  // ===== ROUND 204 (item 7) -- THE CARD IS READ AT THE LEVEL, TOO ========
  //
  // Every number below now comes off the SAME clone the runtime would cast,
  // so "Current rank: Iron 9" and the figures under it are talking about the
  // same ability. They were not: `rankScaled(a, rank)` took no level, so a
  // card at the top of a rank printed the level-0 damage -- about half of
  // what the ability actually dealt -- and the cost and cooldown lines read
  // the unscaled spec underneath it.
  const now = rankScaled(a, rank, level);
  return {
    // ROUND 201 -- THE PARENTHETICAL IS THE ESSENCE, not the template's
    // category word. Canon: "Ability: [Specious Sorcerer] (Charlatan)",
    // "Ability: [Castigate] (Sin)" -- Charlatan and Sin are essences. Ours
    // printed "(Bolt)", which is the template, and the template is already
    // said by the type line directly underneath.
    //
    // `_srcName` is stamped on every generated ability by the one door in
    // rebuildKnownAbilities (round 120's note), and it is the confluence's name
    // where there is one, which is also what the books do. The old category
    // word is the fallback for a hand-written spec with no essence behind it --
    // a test fixture, a monster's ability -- rather than an empty pair of
    // brackets.
    head: `Ability: [${a.name}] (${a._srcName || TYPE_WORD[a.template] || cap(a.category || 'Ability')})`,
    sub: `${kindWord(a)}${tags.length ? ` (${tags.join(', ')})` : ''}.`,
    // ===== ROUND 206b -- WHICH STONE MADE IT ==============================
    //
    // The user, on a shipped card: "This doesn't say what awakening stone it
    // came from. Its a good ability but it still needs to roll off of the
    // right awakening stone."
    //
    // The head line stays as canon writes it -- "Ability: [Specious Sorcerer]
    // (Charlatan)", the ESSENCE in the brackets, which is round 201's rule and
    // is not up for revision. The stone gets its own line instead, because the
    // player needs both: the essence says what family the ability belongs to
    // and the stone says which of that essence's hundred-odd faces they
    // actually rolled.
    //
    // Null for an innate and for a confluence's own grant, which come from no
    // stone at all -- `abilityCardLines` drops the empty line rather than
    // printing "Awakening stone: none", which would be a fact about nothing.
    stone: a.stoneId && STONE_THEMES[a.stoneId]
      ? `Awakening stone: ${STONE_THEMES[a.stoneId].word}.` : null,
    cost: `Cost: ${costWord(now)}`,
    cooldown: cooldownWord(now) ? `Cooldown: ${cooldownWord(now)}` : null,
    // ROUND 201 -- zero-padded to two digits. Canon writes "(00%)" at the
    // bottom of a rank and "(19%)" nineteen percent in; ours wrote "(0%)",
    // which is the same number in a different shape and is the kind of
    // difference a reader notices without being able to name.
    rank: standing ? `Current rank: ${cap(rank)} ${standing.level || 0} `
      + `(${String(Math.round((standing.progress || 0) * 100)).padStart(2, '0')}%).` : null,
    effects,
    numbers: `Numbers now: ${statsLineFor(now)}`,
    // ROUND 203 -- the transcendent gate, printed where the reader will look
    // for it: with the conditions, under the numbers.
    //
    // This line is why `gateClause` exists, and until now nothing called it --
    // a rule the game enforced on every swing and never told anyone. An
    // ability whose damage is only transcendent "while you are below a quarter
    // of your health" is unusable knowledge if the player has to infer it from
    // the colour of the numbers.
    gate: gateClause(a),
    conditions: conditionsOf(a),
  };
}

/** The card as plain lines, for tests and text surfaces. */
export function abilityCardLines(a, standing = null) {
  const c = abilityCard(a, standing);
  return [c.head, c.sub, c.stone, c.cost, c.cooldown, c.rank,
    ...c.effects.map(e => `${e.reached ? '' : '(next) '}Effect (${e.rank}): ${e.text}`),
    c.numbers, c.gate, ...c.conditions].filter(Boolean);
}
