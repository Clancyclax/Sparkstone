// ============================================================================
// ROUND 57 -- DEBUFFS, AND THE FACT THAT THEY REACH THE PLAYER
//
// The user's ask, verbatim:
//
//   "Debuffs need to affect the player.
//    We should have debuffs for all of the following with a chance to roll on
//    abilities (as thematically appropriate) and Monsters should have these as
//    well. (Also as thematically appropriate. I.E. Spiders slowing through webs
//    and poisoning, ice monsters freezing players, fire monsters burning
//    players)"
//
// Nineteen of them, listed by name. This file is the whole catalogue, and it is
// deliberately ONE table read by four different consumers:
//
//   - the runtime, applying them to the player     (WorldScene._applyDebuff)
//   - the runtime, applying them to monsters       (same function, same table)
//   - the generator, rolling them onto abilities   (awakening.js)
//   - the monster roster, carrying them thematically (monsterDebuffs.js)
//
// The single table is the point. Round 56 shipped `spellReflect` as a number on
// the player and a different number on the ability, and the two only agreed
// because one person wrote both in one afternoon. A debuff has to mean the same
// thing whichever side of the fight is carrying it, or the reflect that bounces
// one back becomes a lie.
//
// WHY THE PLAYER SIDE IS THE HARD HALF
//
// Monsters have carried afflictions since round 44. What did not exist was any
// route by which a monster's blow left something ON the player -- which is why
// round 56 refused to build debuff reflect and said so:
//
//   "Debuff reflect was deliberately NOT built -- verified the player carries
//    no debuffs at all, so there is nothing to reflect."
//
// That is now false, which is what makes the third item of this round possible.
// ============================================================================

import { ELEMENT_TYPES } from './stats.js';

/** How the runtime applies a debuff. The switch in _applyDebuffEffects is
 *  keyed on this, so a new debuff with a known kind needs no runtime work. */
export const DEBUFF_KINDS = {
  // Scales one already-existing rate down. Read at the point of use.
  rate: 'rate',
  // Lowers one of the four MAJOR attributes. The only kind that forces a stat
  // recompute, because the whole minor-stat stack hangs off the attributes.
  attribute: 'attribute',
  // Damage over time. Several may run at once -- see the note on STACKING.
  affliction: 'affliction',
  // Takes away the ability to act. Diminishing returns apply (see DR_STEPS).
  control: 'control',
  // Changes how much of something else lands: damage taken, healing received.
  amplify: 'amplify',
};

// ---------------------------------------------------------------------------
// DIMINISHING RETURNS -- the user's answer to "how hard should Stun and Freeze
// hit the player": "Short, with diminishing returns."
//
// Each application of a control debuff within the window lands at a smaller
// fraction of its listed length, and the fourth inside the window does not land
// at all. The window resets from the moment the last one EXPIRES, not the
// moment it was applied, or a long freeze would refresh its own immunity while
// still holding you.
// ---------------------------------------------------------------------------
export const DR_STEPS = [1, 0.5, 0.25, 0];
export const DR_WINDOW = 10;

/** How many stacks of one affliction may run at once. Matches round 44's
 *  STATUS_STACK_CAP so the icon digit never shows a number the maths ignores. */
export const DEBUFF_STACK_CAP = 5;

// ---------------------------------------------------------------------------
// THE TWENTY (nineteen in round 57; `expose` joined them in round 90)
//
// Fields every entry carries:
//   key        stable id, used by saves, abilities and monsters alike
//   label      what the player is told they have
//   icon       frame key in status_icons.png
//   color      float text and icon tint
//   kind       one of DEBUFF_KINDS
//   per        magnitude added per stack (see the kind for what it means)
//   cap        total magnitude ceiling however many stacks land
//   stackCap   how many stacks may run
//   dur        [min, max] seconds, before any scaling
//   elements   ability elements that may thematically roll it
//   levers     essence levers that may thematically roll it
//   blurb      one plain sentence stating the mechanic, for ability text
//
// The `elements`/`levers` lists are what "as thematically appropriate" means in
// code: a frost ability can freeze and slow, and can never inflict disease.
// ---------------------------------------------------------------------------
export const DEBUFFS = {

  // ---- the three the user listed first: rates ----------------------------
  slowMove: {
    key: 'slowMove', label: 'Slowed', icon: 'slowmove', color: '#4dd0e1',
    kind: DEBUFF_KINDS.rate, rate: 'moveSpeed',
    per: 0.14, cap: 0.55, stackCap: 3, dur: [3, 7],
    elements: ['frost', 'nature', 'shadow'], levers: ['bind', 'chain', 'stalk'],
    blurb: "slowing the target's movement",
  },
  slowAttack: {
    key: 'slowAttack', label: 'Hindered', icon: 'slowattack', color: '#ffb74d',
    kind: DEBUFF_KINDS.rate, rate: 'attackSpeed',
    per: 0.13, cap: 0.45, stackCap: 3, dur: [4, 8],
    elements: ['frost', 'shadow', 'physical'], levers: ['bind', 'ward', 'turn'],
    blurb: "slowing the target's attacks",
  },
  slowCast: {
    key: 'slowCast', label: 'Muddled', icon: 'slowcast', color: '#b39ddb',
    kind: DEBUFF_KINDS.rate, rate: 'castSpeed',
    per: 0.13, cap: 0.45, stackCap: 3, dur: [4, 8],
    elements: ['shadow', 'lightning', 'frost'], levers: ['turn', 'fate', 'shift'],
    blurb: "slowing the target's casting",
  },

  // ---- the two crit debuffs ----------------------------------------------
  critChanceDown: {
    key: 'critChanceDown', label: 'Blunted', icon: 'critdown', color: '#90a4ae',
    kind: DEBUFF_KINDS.rate, rate: 'critChance', flat: true,
    per: 0.07, cap: 0.25, stackCap: 3, dur: [5, 10],
    elements: ['shadow', 'frost', 'physical'], levers: ['ward', 'turn', 'fate'],
    blurb: "lowering the target's critical hit chance",
  },
  critDamageDown: {
    key: 'critDamageDown', label: 'Dulled', icon: 'critdmgdown', color: '#78909c',
    kind: DEBUFF_KINDS.rate, rate: 'critDamage', flat: true,
    per: 0.14, cap: 0.45, stackCap: 3, dur: [5, 10],
    elements: ['shadow', 'physical', 'frost'], levers: ['ward', 'raw', 'turn'],
    blurb: "lowering the target's critical damage",
  },

  // ---- the four attributes ------------------------------------------------
  // These are the only debuffs that force a stat recompute, and they are worth
  // it: taking Power off a player takes their health, block and armour with it,
  // because that is what Power buys. A debuff that only touched one number
  // would not be the attribute -- it would be a rate, and there are five of
  // those above already.
  //
  // MAGNITUDE, retuned after measurement. The first draft drained 2 per stack
  // to a cap of 8, which read as reasonable until the actual scale was checked:
  // inventory.js says it outright -- "a full Iron kit sits at 1 per attribute,
  // Diamond at 5 + ability boosts". One stack would have zeroed a mid-game
  // character's whole attribute and four would have zeroed anyone's. One per
  // stack to a cap of two is a real bite out of a small number without being
  // the entire number.
  powerDown: {
    key: 'powerDown', label: 'Weakened', icon: 'powerdown', color: '#e57373',
    kind: DEBUFF_KINDS.attribute, attr: 'power',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'nature', 'frost'], levers: ['siphon', 'bind', 'turn'],
    blurb: "draining the target's Power",
  },
  spiritDown: {
    key: 'spiritDown', label: 'Dimmed', icon: 'spiritdown', color: '#7986cb',
    kind: DEBUFF_KINDS.attribute, attr: 'spirit',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'radiant', 'lightning'], levers: ['siphon', 'turn', 'fate'],
    blurb: "draining the target's Spirit",
  },
  speedDown: {
    key: 'speedDown', label: 'Leaden', icon: 'speeddown', color: '#a1887f',
    kind: DEBUFF_KINDS.attribute, attr: 'speed',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['frost', 'nature', 'physical'], levers: ['bind', 'ward', 'stalk'],
    blurb: "draining the target's Speed",
  },
  recoveryDown: {
    key: 'recoveryDown', label: 'Fatigued', icon: 'recoverydown', color: '#9575cd',
    kind: DEBUFF_KINDS.attribute, attr: 'recovery',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'nature'], levers: ['siphon', 'linger', 'bind'],
    blurb: "draining the target's Recovery",
  },

  // ---- the six afflictions ------------------------------------------------
  // Every one of these deals damage over time, and every one does something
  // ELSE that the others do not. Six identical DoTs in six colours would be the
  // round-53 mistake again: variety that is not distinctiveness.
  poison: {
    key: 'poison', label: 'Poisoned', icon: 'poisoned', color: '#9ccc65',
    kind: DEBUFF_KINDS.affliction, element: 'nature',
    tickEvery: 1.0, per: 0.35, cap: 3, stackCap: 5, dur: [6, 12],
    elements: ['nature', 'shadow'], levers: ['linger', 'siphon', 'stalk'],
    blurb: "poisoning the target",
    // Poison is the one that STACKS high and ticks low: five stacks of a slow
    // drip is what makes a nest of spiders different from one snake.
  },
  burn: {
    key: 'burn', label: 'Burning', icon: 'burning', color: '#ff7043',
    kind: DEBUFF_KINDS.affliction, element: 'fire',
    tickEvery: 0.7, per: 0.75, cap: 3, stackCap: 3, dur: [4, 8],
    elements: ['fire', 'radiant'], levers: ['linger', 'burst', 'raw'],
    blurb: "setting the target alight",
  },
  bleed: {
    key: 'bleed', label: 'Bleeding', icon: 'bleeding', color: '#ef5350',
    kind: DEBUFF_KINDS.affliction, element: 'physical',
    tickEvery: 1.0, per: 0.55, cap: 3, stackCap: 4, dur: [5, 10],
    // THE THING BLEED DOES THAT THE OTHERS DO NOT: it ticks harder while its
    // victim is moving. A bleeding thing that stands still bleeds less, which
    // makes bleed and slow a real pairing rather than two damage numbers.
    movingMult: 1.8,
    elements: ['physical'], levers: ['raw', 'burst', 'stalk'],
    blurb: "opening a wound that bleeds harder while the target moves",
  },
  disease: {
    key: 'disease', label: 'Diseased', icon: 'diseased', color: '#a1a05e',
    kind: DEBUFF_KINDS.affliction, element: 'nature',
    tickEvery: 1.2, per: 0.3, cap: 2, stackCap: 3, dur: [8, 16],
    // Cuts healing RECEIVED. The long one: a disease is a problem you carry
    // through the next fight, not one you wait out behind a rock.
    healingCut: 0.25, healingCutCap: 0.6,
    elements: ['nature', 'shadow'], levers: ['linger', 'siphon'],
    blurb: "sickening the target so healing does less for them",
  },
  unholy: {
    key: 'unholy', label: 'Blighted', icon: 'unholy', color: '#7e57c2',
    kind: DEBUFF_KINDS.affliction, element: 'shadow',
    tickEvery: 1.0, per: 0.4, cap: 2.5, stackCap: 3, dur: [6, 12],
    // Eats maximum health while it holds. Distinct from raw damage: a healer
    // cannot heal past it, and it is the only affliction that makes the bar
    // itself shorter.
    maxHpCut: 0.05, maxHpCutCap: 0.20,
    elements: ['shadow'], levers: ['siphon', 'linger', 'bind'],
    blurb: "blighting the target so their very health withers",
  },
  holy: {
    key: 'holy', label: 'Judged', icon: 'holy', color: '#ffd54f',
    kind: DEBUFF_KINDS.affliction, element: 'radiant',
    // Ticks a share of MAXIMUM health rather than a flat number, so judgment
    // falls hardest on the mighty. On a slime it is a rounding error; on a
    // dragon it is the reason you brought a radiant essence.
    tickEvery: 1.2, per: 0.012, cap: 0.05, stackCap: 3, dur: [6, 10],
    ofMaxHp: true,
    elements: ['radiant'], levers: ['raw', 'burst', 'call'],
    blurb: "marking the target for judgement, burning a share of their full health",
  },

  // ---- the amplifier ------------------------------------------------------
  curse: {
    key: 'curse', label: 'Cursed', icon: 'cursed', color: '#ce93d8',
    kind: DEBUFF_KINDS.amplify, amplify: 'damageTaken',
    per: 0.12, cap: 0.40, stackCap: 3, dur: [6, 12],
    elements: ['shadow', 'radiant'], levers: ['turn', 'fate', 'siphon'],
    blurb: "cursing the target so everything wounds them more deeply",
  },

  // ---- the two controls ---------------------------------------------------
  freeze: {
    key: 'freeze', label: 'Frozen', icon: 'frozen', color: '#81d4fa',
    kind: DEBUFF_KINDS.control, stopsMove: true, stopsAct: false,
    per: 1, cap: 1, stackCap: 1, dur: [1.0, 2.0], dr: true,
    elements: ['frost'], levers: ['bind', 'turn'],
    // MEASURED. Freeze compounds two rarities: it is frost-only, and frost is
    // the rarest channel a debuff-carrying ability rolls (193 of 3,457 carriers
    // -- 5.6%). At the default control weight it came up 2 times in 24,000
    // generated abilities, and a deliberately frost-built kit produced NONE at
    // all, which is a debuff the player can read about and never cast. The
    // weight is set against frost's own scarcity rather than against the other
    // controls: stun sits on `physical`, which is a quarter of everything.
    pickWeight: 5,
    blurb: "freezing the target in place",
  },
  stun: {
    key: 'stun', label: 'Stunned', icon: 'stunned', color: '#fff176',
    kind: DEBUFF_KINDS.control, stopsMove: true, stopsAct: true,
    per: 1, cap: 1, stackCap: 1, dur: [0.6, 1.2], dr: true,
    elements: ['physical', 'lightning'], levers: ['raw', 'burst', 'bind'],
    blurb: "stunning the target outright",
  },

  // ---- armour -------------------------------------------------------------
  sunder: {
    key: 'sunder', label: 'Sundered', icon: 'armordown', color: '#bcaaa4',
    kind: DEBUFF_KINDS.rate, rate: 'armor', flat: true,
    per: 0.09, cap: 0.35, stackCap: 4, dur: [5, 10],
    // Fire is here because armour MELTS, and because without it fire had
    // exactly one debuff to its name -- a whole element with one option is a
    // whole element whose abilities cannot be told apart this way.
    elements: ['physical', 'lightning', 'fire'], levers: ['raw', 'burst', 'chain'],
    blurb: "shattering the target's armour",
  },

  // ---- resistance -- ROUND 90, THE TWENTIETH -------------------------------
  //
  // `sunder`'s missing twin, and the gap it fills was structural rather than
  // cosmetic. Armour explicitly does nothing against elemental damage -- that
  // split is the whole point of the stat -- so `sunder` is a physical build's
  // answer to a tough target and a FULL ELEMENTAL BUILD HAD NO ANSWER AT ALL.
  // A fire character facing a fire-resistant monster could only hit it more.
  //
  // Written here rather than in a crafting file, because the sentence that
  // produced it runs in both directions: "if the essence is likely to roll a
  // specific effect on abilities the quintessence should as well". If crafted
  // gear can strip resistances, so should the abilities of an essence that
  // ought to be able to -- and so should monsters, which now can.
  //
  // ELEMENTS IS EVERY ELEMENT, and that is deliberate: this is the one debuff
  // that belongs to no channel, because *every* channel wants a way through.
  // The levers are the four that read as getting past something rather than
  // adding to it.
  expose: {
    key: 'expose', label: 'Exposed', icon: 'resistdown', color: '#f06292',
    kind: DEBUFF_KINDS.rate, rate: 'resist', flat: true,
    per: 0.08, cap: 0.30, stackCap: 4, dur: [5, 10],
    elements: ['physical', 'fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'],
    levers: ['raw', 'burst', 'turn', 'siphon'],
    blurb: "stripping the target's resistance to the elements",
  },
};

export const DEBUFF_KEYS = Object.keys(DEBUFFS);
export const DEBUFF_LIST = DEBUFF_KEYS.map(k => DEBUFFS[k]);

/** The icon frames this file needs. status_icons.png is regenerated from this
 *  list, so a debuff added here without art fails the round's own suite rather
 *  than silently drawing frame 0 (a flame) over a frozen player. */
export const DEBUFF_ICON_KEYS = [...new Set(DEBUFF_LIST.map(d => d.icon))];

// ---------------------------------------------------------------------------
// STACKING, AND WHY EVERY DEBUFF GETS ITS OWN SLOT
//
// Before this round a monster had exactly ONE `m.dot`, so setting a wolf on
// fire cured its bleeding. That was tolerable while there were three
// afflictions and no player-side ones at all; with nineteen debuffs, four of
// which are afflictions that can plausibly land together from one kit, it is
// not. Debuffs now live in a map keyed by debuff key, so burning, bleeding and
// poisoned are three separate clocks on the same monster -- and the icon row
// over its head shows all three.
// ---------------------------------------------------------------------------

/** Total magnitude of `n` stacks, held to the debuff's own ceiling. */
export function debuffMagnitude(def, stacks = 1, scale = 1) {
  if (!def) return 0;
  const raw = def.per * Math.min(stacks, def.stackCap || 1) * scale;
  return Math.min(def.cap != null ? def.cap * scale : raw, raw);
}

/** Rolls a duration inside the debuff's band, seeded so the same ability
 *  always inflicts the same length. */
export function debuffDuration(def, roll01 = 0.5) {
  if (!def) return 0;
  const [lo, hi] = def.dur;
  return Math.round((lo + (hi - lo) * roll01) * 10) / 10;
}

/** Which debuffs an ability of this element and these levers may thematically
 *  inflict. Both halves must agree unless the ability has no levers at all, in
 *  which case the element decides on its own -- a plain fireball still burns.
 *
 *  This is the whole of "as thematically appropriate" as a function: it is why
 *  a frost bolt can freeze and a nature one cannot, and why nothing at all can
 *  inflict disease unless it is nature or shadow. */
export function thematicDebuffsFor(element, levers = []) {
  const el = element || 'physical';
  const byElement = DEBUFF_LIST.filter(d => d.elements.includes(el));
  if (!levers.length) return byElement;
  const both = byElement.filter(d => d.levers.some(l => levers.includes(l)));
  // An element with no lever agreement still gets its element's shortlist,
  // because "a fire ability may burn" should not depend on which levers the
  // essence happened to pull.
  return both.length ? both : byElement;
}

/** The clause an ability's description uses. Always states the mechanic --
 *  the user's standing rule is that the NAME carries flavour and the
 *  DESCRIPTION states what happens. */
export function debuffClause(def, { stacks = 1, duration = 0, chance = 1 } = {}) {
  if (!def) return '';
  const lead = chance >= 1
    ? 'It also'
    : `Each hit has a ${Math.round(chance * 100)}% chance of`;
  const verb = chance >= 1 ? ` ${def.blurb}` : ` ${gerund(def.blurb)}`;
  const forHow = duration ? ` for ${duration}s` : '';
  const st = stacks > 1 ? `, stacking up to ${stacks} times` : '';
  return `${lead}${verb}${forHow}${st}.`;
}

/** "slowing its movement" is already a gerund; "setting it alight" too. The
 *  blurbs are authored in that form precisely so both framings read, which is
 *  why this is identity rather than a stemmer that would mangle them. */
function gerund(blurb) { return blurb; }

/** Sanity: every element named by a debuff has to be a real element, or the
 *  thematic filter silently matches nothing and the debuff never rolls. Four
 *  dead ids in round 56's stone list cost a whole round's measurement to find;
 *  this is the same class of fault, caught at import. */
export const DEBUFF_UNKNOWN_ELEMENTS = (() => {
  const known = new Set([...ELEMENT_TYPES, 'physical']);
  const bad = [];
  for (const d of DEBUFF_LIST) {
    for (const e of d.elements) if (!known.has(e)) bad.push(`${d.key}:${e}`);
    if (d.element && !known.has(d.element)) bad.push(`${d.key}:element=${d.element}`);
  }
  return bad;
})();
