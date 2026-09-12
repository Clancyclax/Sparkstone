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

import { ELEMENT_TYPES, DAMAGE_TYPE_KEYS } from './stats.js';

// ===========================================================================
// ROUND 105 -- TAGS REPLACE `kind`.
//
// The user's model, from the books, and their instruction when asked whether
// tags should sit alongside `kind` or replace it: replace it.
//
//     [Bleeding]        (affliction, wounding, blood)
//     [Leech Toxin]     (affliction, poison, blood, stacking)
//     [Ruination of the Spirit]  (damage-over-time, curse, stacking)
//
// A single `kind` could not express any of those. It said what the runtime
// should DO and nothing about what the condition IS, so there was no way to
// ask "is this poison" -- and without that question there is no cleansing,
// which is why the game has never had any. Three identical necrotic
// damage-over-time effects that need three DIFFERENT cleanses is the whole
// point of the Ruination example, and it is the thing one enum cannot say.
//
// TWO KINDS OF TAG, and keeping them apart is what stops this becoming a bag
// of strings:
//
//   BEHAVIOURAL  the runtime dispatches on these. A condition with several
//                does several things -- which is the expressiveness `kind`
//                was costing us.
//   CLEANSING    these carry NO behaviour. They exist so something can be
//                named as the thing that removes it.
//
// A condition may carry any number of each.
// ===========================================================================
// ROUND 113 -- the user's affliction library. debuffs.js may depend on it and
// not the other way round: afflictions.js is generated data with no imports of
// its own, which is what keeps this file free of the awakening.js dependency
// its own note above insists on.
import { AFFLICTIONS } from './afflictions.js';

export const TAG = {
  // --- behavioural ---------------------------------------------------------
  affliction: 'affliction',   // ongoing damage on a tick
  dot: 'damage-over-time',    // ongoing damage that runs until cleansed
  wounding: 'wounding',       // absorbs incoming healing, then ends
  stacking: 'stacking',       // instances accumulate cumulatively
  control: 'control',         // takes movement or action; DR applies
  rate: 'rate',               // scales one existing rate down
  attribute: 'attribute',     // lowers one of the four major attributes
  amplify: 'amplify',         // changes how much of something else lands
  drain: 'drain',             // ongoing transfer to whoever applied it
  // ROUND 105 -- takes ABILITIES away rather than stats. The first tag whose
  // effect is on what the carrier can do at all, and the reason it is its own
  // tag rather than a flag on `control`: a stun stops you for a second and a
  // suppression stops your KIT, and a cleanse that answers one should not
  // silently answer the other.
  suppress: 'suppress',
  // --- cleansing -----------------------------------------------------------
  poison: 'poison',
  disease: 'disease',
  curse: 'curse',
  blood: 'blood',
  unholy: 'unholy',
  holy: 'holy',
  frost: 'frost',
  burning: 'burning',
  shock: 'shock',
};
/** The behavioural half, as a set -- the runtime dispatches on exactly these. */
export const BEHAVIOUR_TAGS = [TAG.affliction, TAG.dot, TAG.wounding, TAG.stacking,
  TAG.control, TAG.rate, TAG.attribute, TAG.amplify, TAG.drain, TAG.suppress];
/** The cleansing half. A cleanse names one of these; nothing here does anything
 *  on its own, which is the point -- they are handles, not behaviour. */
export const CLEANSE_TAGS = [TAG.poison, TAG.disease, TAG.curse, TAG.blood,
  TAG.unholy, TAG.holy, TAG.frost, TAG.burning, TAG.shock];
/** Does this condition carry that tag? One predicate, so the runtime, the
 *  generator and the suite can never disagree about what counts. */
export function hasTag(def, tag) {
  return !!(def && def.tags && def.tags.includes(tag));
}

/** DEPRECATED as of round 105 -- kept only so an old save's stored `kind`
 *  string does not crash a lookup. Nothing reads it to decide behaviour. */
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
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'moveSpeed',
    per: 0.14, cap: 0.55, stackCap: 3, dur: [3, 7],
    elements: ['frost', 'nature', 'shadow'], levers: ['anchor', 'chain', 'stalk'],
    blurb: "slowing the target's movement",
  },
  slowAttack: {
    key: 'slowAttack', label: 'Hindered', icon: 'slowattack', color: '#ffb74d',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'attackSpeed',
    per: 0.13, cap: 0.45, stackCap: 3, dur: [4, 8],
    elements: ['frost', 'shadow', 'physical'], levers: ['muzzle', 'bulwark', 'turn'],
    blurb: "slowing the target's attacks",
  },
  slowCast: {
    key: 'slowCast', label: 'Muddled', icon: 'slowcast', color: '#b39ddb',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'castSpeed',
    per: 0.13, cap: 0.45, stackCap: 3, dur: [4, 8],
    elements: ['shadow', 'lightning', 'frost'], levers: ['turn', 'fate', 'shift'],
    blurb: "slowing the target's casting",
  },

  // ---- the two crit debuffs ----------------------------------------------
  critChanceDown: {
    key: 'critChanceDown', label: 'Blunted', icon: 'critdown', color: '#90a4ae',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'critChance', flat: true,
    per: 0.07, cap: 0.25, stackCap: 3, dur: [5, 10],
    elements: ['shadow', 'frost', 'physical'], levers: ['bulwark', 'turn', 'fate'],
    blurb: "lowering the target's critical hit chance",
  },
  critDamageDown: {
    key: 'critDamageDown', label: 'Dulled', icon: 'critdmgdown', color: '#78909c',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'critDamage', flat: true,
    per: 0.14, cap: 0.45, stackCap: 3, dur: [5, 10],
    elements: ['shadow', 'physical', 'frost'], levers: ['bulwark', 'raw', 'turn'],
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
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'power',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'nature', 'frost'], levers: ['siphon', 'muzzle', 'turn'],
    blurb: "draining the target's Power",
  },
  spiritDown: {
    key: 'spiritDown', label: 'Dimmed', icon: 'spiritdown', color: '#7986cb',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'spirit',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'radiant', 'lightning'], levers: ['siphon', 'turn', 'fate'],
    blurb: "draining the target's Spirit",
  },
  speedDown: {
    key: 'speedDown', label: 'Leaden', icon: 'speeddown', color: '#a1887f',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'speed',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['frost', 'nature', 'physical'], levers: ['anchor', 'bulwark', 'stalk'],
    blurb: "draining the target's Speed",
  },
  recoveryDown: {
    key: 'recoveryDown', label: 'Fatigued', icon: 'recoverydown', color: '#9575cd',
    kind: DEBUFF_KINDS.attribute,
    tags: [TAG.attribute], attr: 'recovery',
    per: 1, cap: 2, stackCap: 2, dur: [6, 12],
    elements: ['shadow', 'nature'], levers: ['siphon', 'linger', 'muzzle'],
    blurb: "draining the target's Recovery",
  },

  // ---- the six afflictions ------------------------------------------------
  // Every one of these deals damage over time, and every one does something
  // ELSE that the others do not. Six identical DoTs in six colours would be the
  // round-53 mistake again: variety that is not distinctiveness.
  poison: {
    key: 'poison', label: 'Poisoned', icon: 'poisoned', color: '#9ccc65',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.poison], element: 'nature',
    tickEvery: 1.0, per: 0.35, cap: 3, stackCap: 5, dur: [6, 12],
    elements: ['nature', 'shadow'], levers: ['linger', 'siphon', 'stalk'],
    blurb: "poisoning the target",
    // Poison is the one that STACKS high and ticks low: five stacks of a slow
    // drip is what makes a nest of spiders different from one snake.
  },
  burn: {
    key: 'burn', label: 'Burning', icon: 'burning', color: '#ff7043',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.burning], element: 'fire',
    tickEvery: 0.7, per: 0.75, cap: 3, stackCap: 3, dur: [4, 8],
    elements: ['fire', 'radiant'], levers: ['linger', 'burst', 'raw'],
    blurb: "setting the target alight",
  },
  bleed: {
    key: 'bleed', label: 'Bleeding', icon: 'bleeding', color: '#ef5350',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.wounding, TAG.stacking, TAG.blood],
    // ROUND 105 -- how much healing one stack absorbs before the bleed closes.
    // Eight is four ticks' worth of its own damage, so healing through a bleed
    // costs about what the bleed was going to cost you -- a trade, not a tax.
    woundAbsorb: 8, element: 'physical',
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
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.disease], element: 'nature',
    tickEvery: 1.2, per: 0.3, cap: 2, stackCap: 3, dur: [8, 16],
    // Cuts healing RECEIVED. The long one: a disease is a problem you carry
    // through the next fight, not one you wait out behind a rock.
    healingCut: 0.25, healingCutCap: 0.6,
    elements: ['nature', 'shadow'], levers: ['linger', 'siphon'],
    blurb: "sickening the target so healing does less for them",
  },
  unholy: {
    key: 'unholy', label: 'Blighted', icon: 'unholy', color: '#7e57c2',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.unholy], element: 'shadow',
    tickEvery: 1.0, per: 0.4, cap: 2.5, stackCap: 3, dur: [6, 12],
    // Eats maximum health while it holds. Distinct from raw damage: a healer
    // cannot heal past it, and it is the only affliction that makes the bar
    // itself shorter.
    maxHpCut: 0.05, maxHpCutCap: 0.20,
    // ROUND 105 -- "lengthens and strengthens other DOTs", the half of the
    // user's necrotic line that was never built. It multiplies the TICK of
    // every other affliction on the same target and extends what lands while
    // it holds, which makes blight the opener of a DOT kit rather than a
    // fourth damage number in one -- and pointedly does not amplify itself,
    // or two stacks of blight would compound into each other.
    dotAmp: { mag: 0.20, dur: 0.15, cap: 0.60 },
    elements: ['shadow'], levers: ['siphon', 'linger', 'muzzle'],
    blurb: "blighting the target so their very health withers and every other affliction bites harder",
  },
  holy: {
    key: 'holy', label: 'Judged', icon: 'holy', color: '#ffd54f',
    kind: DEBUFF_KINDS.affliction,
    tags: [TAG.affliction, TAG.stacking, TAG.holy], element: 'radiant',
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
    kind: DEBUFF_KINDS.amplify,
    tags: [TAG.amplify, TAG.curse], amplify: 'damageTaken',
    per: 0.12, cap: 0.40, stackCap: 3, dur: [6, 12],
    elements: ['shadow', 'radiant'], levers: ['turn', 'fate', 'siphon'],
    blurb: "cursing the target so everything wounds them more deeply",
  },

  // ---- the two controls ---------------------------------------------------
  freeze: {
    key: 'freeze', label: 'Frozen', icon: 'frozen', color: '#81d4fa',
    kind: DEBUFF_KINDS.control,
    tags: [TAG.control, TAG.frost], stopsMove: true, stopsAct: false,
    per: 1, cap: 1, stackCap: 1, dur: [1.0, 2.0], dr: true,
    elements: ['frost'], levers: ['anchor', 'turn'],
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
    kind: DEBUFF_KINDS.control,
    tags: [TAG.control], stopsMove: true, stopsAct: true,
    per: 1, cap: 1, stackCap: 1, dur: [0.6, 1.2], dr: true,
    elements: ['physical', 'lightning'], levers: ['raw', 'burst', 'muzzle'],
    blurb: "stunning the target outright",
  },

  // ---- armour -------------------------------------------------------------
  // ===== ROUND 105 -- THE FOUR CURSED CONDITIONS ===========================
  //
  // From the taxonomy: "cursed movement (take damage when you move, stacking)"
  // and its three siblings for mana, stamina and striking.
  //
  // These are the reason the trigger work and the condition work are one
  // round. "Take damage when you move" is the same MOMENT as "something
  // happens when you move" -- so they key off the identical event, and there
  // is one event system with two consumers rather than two that drift.
  // `punishOn` names the event; `_onTriggerEvent` charges them.
  //
  // Stacking, per the taxonomy, and small per stack: the point of a cursed
  // condition is that it makes you choose differently, not that it kills you
  // while you stand still.
  cursedMove: {
    key: 'cursedMove', label: 'Cursed Step', icon: 'cursed', color: '#ce93d8',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'moveDistance',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'dark'], levers: ['anchor', 'turn', 'stalk'],
    blurb: 'making every step cost blood',
  },
  cursedMana: {
    key: 'cursedMana', label: 'Cursed Channel', icon: 'cursed', color: '#b39ddb',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'spendMana',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'arcane'], levers: ['muzzle', 'siphon', 'turn'],
    blurb: 'making spent power draw on the body instead',
  },
  cursedStamina: {
    key: 'cursedStamina', label: 'Cursed Wind', icon: 'cursed', color: '#ffab91',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'spendStamina',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'blood'], levers: ['muzzle', 'siphon', 'raw'],
    blurb: 'making every effort tear at what is left',
  },
  cursedStrike: {
    key: 'cursedStrike', label: 'Cursed Hand', icon: 'cursed', color: '#ef9a9a',
    tags: [TAG.affliction, TAG.stacking, TAG.curse],
    punishOn: 'strike',
    per: 3, cap: 15, stackCap: 5, dur: [8, 14],
    elements: ['shadow', 'curse', 'blood'], levers: ['muzzle', 'turn', 'bulwark'],
    blurb: 'making every swing open the swinger',
  },

  sunder: {
    key: 'sunder', label: 'Sundered', icon: 'armordown', color: '#bcaaa4',
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'armor', flat: true,
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
    kind: DEBUFF_KINDS.rate,
    tags: [TAG.rate], rate: 'resist', flat: true,
    per: 0.08, cap: 0.30, stackCap: 4, dur: [5, 10],
    elements: ['physical', 'fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'],
    levers: ['raw', 'burst', 'turn', 'siphon'],
    blurb: "stripping the target's resistance to the elements",
  },

  // =========================================================================
  // ROUND 105 -- THE NINE THE AUDIT COULD NOT FIND
  //
  // Eight taxonomy lines and one whole special-debuff row had nothing behind
  // them. Several were blocked before this round rather than merely unbuilt,
  // and the two things that unblocked them are worth naming, because they are
  // the reason these are nine table rows rather than nine features:
  //
  //   TAGS. A single `kind` could say "affliction" OR "rate" and not both, so
  //   [Shocked] -- which ticks AND slows recovery -- was not a tuning problem,
  //   it was inexpressible. It is now two tags on one row.
  //
  //   TWENTY-EIGHT DAMAGE TYPES. [Wet] wants to raise cold and lightning taken
  //   while lowering fire and earth. Earth was not a damage type before this
  //   round, so half the condition had nothing to point at.
  //
  // The three that carry a NEW behavioural tag or field say so on their row.
  // Every icon here is a frame that already exists in status_icons.png --
  // `shocked` has sat unused at frame 3 since round 44, waiting for this.
  // =========================================================================

  // Ticking electrical damage that also slows every pool's refill, and does
  // NOT stack -- the user's line says so, and it is the right call: a
  // no-stack condition that hits three rates at once is a different pressure
  // from poison, which stacks five times and does one thing.
  shocked: {
    key: 'shocked', label: 'Shocked', icon: 'shocked', color: '#4fc3f7',
    tags: [TAG.affliction, TAG.rate, TAG.shock], element: 'lightning',
    rates: ['regenHealth', 'regenMana', 'regenStamina'],
    tickEvery: 0.8, per: 0.30, cap: 0.30, stackCap: 1, dur: [4, 8],
    elements: ['lightning'], levers: ['burst', 'chain', 'raw'],
    blurb: "shocking the target so nothing they have refills",
  },

  // The first condition whose amplification is PER DAMAGE TYPE. `ampTypes` is
  // read by the same amplifier reader `curse` uses; a condition with no
  // `ampTypes` amplifies everything, exactly as before.
  //
  // Why the numbers are lopsided (+5 / -2): being soaked is a liability, not
  // a defensive cooldown. Whoever applied it should be glad they did.
  wet: {
    key: 'wet', label: 'Soaked', icon: 'stackTide', color: '#4dd0e1',
    tags: [TAG.amplify, TAG.stacking, TAG.frost], amplify: 'damageTaken',
    ampTypes: { frost: 0.05, lightning: 0.05, water: 0.02, fire: -0.02, earth: -0.02 },
    per: 1, cap: 3, stackCap: 3, dur: [8, 14],
    elements: ['frost', 'nature'], levers: ['linger', 'chain', 'turn'],
    blurb: "soaking the target so cold and lightning bite deeper and fire less",
  },

  // NEW BEHAVIOURAL TAG. `suppress` is the first condition that takes away
  // abilities rather than stats: the aura goes out and nothing can be cast.
  // Diminishing returns apply, and the duration is the shortest in the table,
  // because a long one is not a debuff -- it is being spectator to a fight.
  suppressed: {
    key: 'suppressed', label: 'Suppressed', icon: 'stackWard', color: '#9575cd',
    tags: [TAG.control, TAG.suppress, TAG.curse],
    suppress: true, stopsMove: false, stopsAct: false,
    per: 1, cap: 1, stackCap: 1, dur: [2.0, 3.5], dr: true,
    elements: ['shadow', 'lightning'], levers: ['muzzle', 'turn', 'fate'],
    blurb: "smothering the target's auras and putting their abilities out of reach",
  },

  // Karma cuts BOTH ways off one stack, which is why it needed two fields
  // rather than a second condition: `karmaTo` is what whoever applied it deals
  // extra, `karmaFrom` is what the carrier deals less of to everyone else. A
  // ledger, and the person holding it is the one who gets paid.
  karma: {
    key: 'karma', label: 'Karma', icon: 'stackKarma', color: '#ffb74d',
    tags: [TAG.amplify, TAG.stacking, TAG.curse], amplify: 'karma',
    karmaTo: 0.015, karmaFrom: 0.015,
    per: 1, cap: 8, stackCap: 8, dur: [10, 20],
    elements: ['radiant', 'shadow'], levers: ['fate', 'turn', 'siphon'],
    blurb: "opening a ledger against the target -- your blows land harder, theirs land softer",
  },

  // ABILITY damage specifically, which is the half `expose` never covered:
  // a mark that raises everything is just a curse with a different icon.
  // `minimap: true` is the other half of the user's line, and it is read by
  // the minimap rather than by the damage path -- being able to SEE what you
  // marked through a wall is most of what marking is for.
  marked: {
    key: 'marked', label: 'Marked', icon: 'stackEye', color: '#f06292',
    tags: [TAG.amplify, TAG.stacking], amplify: 'damageTaken',
    ampAbility: 0.05, minimap: true,
    per: 1, cap: 5, stackCap: 5, dur: [12, 20],
    elements: ['radiant', 'shadow', 'physical'], levers: ['stalk', 'fate', 'reach'],
    blurb: "marking the target so your abilities bite deeper, and showing them on the map",
  },

  // The three plain rate cuts the taxonomy names and nothing supplied. Each is
  // the mirror of a buff that now exists, and they are rates rather than
  // attributes on purpose: `recoveryDown` already lowers the RECOVERY
  // attribute, which is not the same thing as lowering the three refill rates
  // it feeds -- the audit was right to call that a partial rather than a hit.
  dodgeDown: {
    key: 'dodgeDown', label: 'Leaden', icon: 'stackGale', color: '#90a4ae',
    tags: [TAG.rate], rate: 'dodgeChance', flat: true,
    per: 0.06, cap: 0.20, stackCap: 3, dur: [5, 10],
    elements: ['frost', 'shadow', 'earth'], levers: ['anchor', 'stalk', 'bulwark'],
    blurb: "weighting the target down so blows are harder to slip",
  },
  cooldownSlow: {
    key: 'cooldownSlow', label: 'Stalled', icon: 'stackAnticipation', color: '#b0bec5',
    tags: [TAG.rate], rate: 'cooldownRate',
    per: 0.15, cap: 0.45, stackCap: 3, dur: [6, 12],
    elements: ['shadow', 'frost', 'arcane'], levers: ['muzzle', 'turn', 'fate'],
    blurb: "stalling the target so their abilities come back slower",
  },
  enervate: {
    key: 'enervate', label: 'Enervated', icon: 'stackWraith', color: '#7e8a97',
    tags: [TAG.rate], rates: ['regenHealth', 'regenMana', 'regenStamina'],
    per: 0.20, cap: 0.60, stackCap: 3, dur: [8, 16],
    elements: ['shadow', 'nature', 'necrotic'], levers: ['siphon', 'linger', 'muzzle'],
    blurb: "enervating the target so health, mana and stamina all crawl back",
  },

  // "decrease specific damage type." Authored with NO element, which means
  // every type -- and that is the general case a specific one is composed
  // from: `composeCondition` mints [Damped Fire] off this shape with an
  // `element` set, which is what the user meant by the listed debuffs being a
  // sample. The reader matches on `element` being absent OR equal.
  dampen: {
    key: 'dampen', label: 'Damped', icon: 'stackShatter', color: '#78909c',
    tags: [TAG.rate], rate: 'dmgElement',
    per: 0.10, cap: 0.35, stackCap: 3, dur: [6, 12],
    elements: ['frost', 'shadow', 'arcane', 'physical'], levers: ['bulwark', 'turn', 'muzzle'],
    blurb: "damping the target's damage",
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
  // ROUND 113 -- A NAMED AFFLICTION SAYS ITS NAME.
  //
  // The thirty-two authored conditions have labels that read as adjectives --
  // "25% sundered 9.1s" is a sentence -- and the blurb alone is enough for
  // them. The user's 1,088 are proper nouns: [The Coil], [Blackened Veins],
  // [Under the Mirror]. A card that describes the mechanic and never names the
  // thing leaves the player unable to connect the pip on the target to the
  // ability that put it there, which is the whole point of naming them.
  //
  // Bracketed, which is the convention this project already uses for
  // conditions (see `conditionLine`) and the one the books use.
  const named = def.composed ? ` [${def.label}]` : '';
  return `${lead}${named}${named ? ' --' : ''}${verb}${forHow}${st}.`;
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
  // ROUND 105 -- every DAMAGE type now, not just the geared six. A condition
  // typed `blood` or `necrotic` is legal from this round.
  const known = new Set([...DAMAGE_TYPE_KEYS, 'physical']);
  const bad = [];
  for (const d of DEBUFF_LIST) {
    for (const e of d.elements) if (!known.has(e)) bad.push(`${d.key}:${e}`);
    if (d.element && !known.has(d.element)) bad.push(`${d.key}:element=${d.element}`);
  }
  return bad;
})();


// ===========================================================================
// ROUND 105 -- CONDITIONS AN ABILITY MINTS FOR ITSELF.
//
//   "the debuffs listed should all be added but these are also meant to be a
//    sample that can be used to generate custom debuffs for special attacks
//    and abilities. Debuffs can be multiple types and have varied effects."
//
// The twenty above are the reference set -- what a condition looks like when a
// person writes one. This is how an ability writes its own, from the same
// parts, so [Ruination of the Blood], [Leech Toxin] and [Tainted Meridians]
// are generated rather than being three more hand-written rows and then three
// more next round.
//
// THE ID HAS TO SURVIVE A SAVE. A character's debuff map stores keys, and a
// key naming a condition that no longer exists is dropped on load -- which for
// a composed condition would mean it silently vanished when the game restarted.
// So the id is a hash of the condition's own CONTENT: the same recipe always
// produces the same id, and abilities are regenerated deterministically from
// the player's slots at load time, so re-composing them re-registers exactly
// the ids the save is holding. No separate persistence, and nothing to keep in
// step with the save format.
//
// The registry is deliberately not cleared between kit rebuilds. A condition
// already on a monster must keep resolving even if the player has since
// unsocketed the stone that made it, and the entries are a few dozen bytes.
// ===========================================================================
const CONDITION_REGISTRY = new Map();

/** Stable 32-bit hash of a string. Same shape as the generator's own
 *  `stableHash`, duplicated rather than imported because debuffs.js must not
 *  depend on awakening.js -- the dependency runs the other way. */
function hashOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Build (and register) a condition from a recipe, returning its definition.
 *
 * Required: `label` and `tags`. Everything else takes the shape the twenty
 * authored conditions use, so a composed condition and a written one are the
 * same kind of object to every reader -- which is what lets the runtime, the
 * status bar, the ability card and the cleanse all treat them alike.
 */
export function composeCondition(recipe) {
  const tags = [...new Set(recipe.tags || [])];
  if (!recipe.label || !tags.length) return null;
  // ROUND 113 -- A RECIPE MAY BRING ITS OWN KEY.
  //
  // The hash below is right for a condition MINTED by an ability: two abilities
  // that compose the same thing should share it. The 1,088 named afflictions
  // are not minted, they are authored -- they arrive from the CSVs with keys
  // the user chose (`sig_venom_2`), and those keys are what a save carries and
  // what a bug report can be written about. A hashed id would make every one of
  // them unreadable and would change the moment a number was retuned, which is
  // a save-compatibility break disguised as a tweak.
  const body = {
    label: recipe.label,
    tags,
    icon: recipe.icon || 'poison',
    color: recipe.color || '#b39ddb',
    element: recipe.element || null,
    per: recipe.per ?? 2,
    cap: recipe.cap ?? (recipe.per ?? 2) * 5,
    stackCap: tags.includes(TAG.stacking) ? (recipe.stackCap ?? DEBUFF_STACK_CAP) : 1,
    dur: recipe.dur || [6, 12],
    tickEvery: recipe.tickEvery ?? 1,
    blurb: recipe.blurb || 'afflicting the target',
    composed: true,
  };
  // ROUND 105 -- the passthrough list is the composer's whole vocabulary, and
  // a field missing from it is a field a composed condition silently loses.
  // Second half added with the nine new rows: everything they introduced,
  // plus `punishOn`, `woundAbsorb` and the healing cut, which the authored
  // conditions have carried since earlier this round and which a composed
  // [Leech Toxin] or [Ruination] plainly wants.
  for (const f of ['rate', 'rates', 'attr', 'amplify', 'stopsMove', 'stopsAct', 'dr',
    'ofMaxHp', 'movingMult', 'maxHpCut', 'maxHpCutCap', 'drainPerTick',
    'punishOn', 'woundAbsorb', 'healingCut', 'healingCutCap', 'flat',
    'ampTypes', 'ampAbility', 'minimap', 'karmaTo', 'karmaFrom',
    'dotAmp', 'suppress']) {
    if (recipe[f] !== undefined) body[f] = recipe[f];
  }
  // The id is content, not a counter: two abilities that mint the same
  // condition share it, and the same ability minted twice does not accumulate
  // registry entries.
  //
  // ROUND 105 -- hashed over the WHOLE body rather than a hand-listed subset.
  // The first version listed nine fields, which was correct for the nine
  // fields the composer could then set; the passthrough list above has since
  // grown to twenty-three, and every field left out of the hash is a pair of
  // genuinely different conditions that collide on one id and silently become
  // each other. A hand-maintained list that must stay in step with another
  // hand-maintained list is the fault this project keeps finding, so this one
  // reads the object it is actually identifying. `body` is built field-by-field
  // in a fixed order above, so the stringify is stable.
  // Tags are SORTED for the hash only: the display order is the author's
  // (`[Bleeding] (affliction, wounding, blood)` reads in the books' order),
  // but two recipes that list the same tags differently are one condition.
  const key = recipe.key
    || `c_${hashOf(JSON.stringify({ ...body, tags: tags.slice().sort() }))}`;
  const existing = CONDITION_REGISTRY.get(key);
  if (existing) return existing;
  const def = { ...body, key };
  CONDITION_REGISTRY.set(key, def);
  return def;
}

// ===========================================================================
// ROUND 113 -- THE NAMED AFFLICTIONS JOIN THE REGISTRY.
//
// The user authored 1,088 of them across 247 essence and confluence pools, and
// their answer on how they should surface was "the named affliction replaces
// the generic": a Venom essence's bolt applies [Blackened Veins], not [Poison].
//
// THEY GO THROUGH `composeCondition` RATHER THAN INTO `DEBUFFS`, and that is
// the whole design. Everything downstream -- the tick loop, the status bar, the
// ability card, the cleanse, the contagion spread -- already reads conditions
// through `conditionDef`, so a named affliction registered here needs not one
// line of new plumbing anywhere. The thirty-two authored conditions in DEBUFFS
// stay exactly as they are and remain the fallback for any source with no pool.
//
// REGISTERED LAZILY, on first ask. Eleven hundred `composeCondition` calls at
// module load would run before anything needs one, and the registry is
// deliberately never cleared, so building it on demand costs nothing and keeps
// a save that carries an affliction resolvable whether or not its pool has
// been touched this session.
let _afflictionsRegistered = false;
export function registerNamedAfflictions() {
  if (_afflictionsRegistered) return CONDITION_REGISTRY;
  _afflictionsRegistered = true;
  for (const [key, a] of Object.entries(AFFLICTIONS)) {
    // `key` is the user's own (`sig_venom_2`), not a hash -- see the note in
    // composeCondition. The pooling metadata (origin, scope, family, licence,
    // archetype, stones) is deliberately NOT passed: it decides which builds
    // can surface the affliction and is nothing to do with what it does once
    // applied, and composeCondition's passthrough list would drop it anyway.
    composeCondition({ ...a, key });
  }
  return CONDITION_REGISTRY;
}

/** Every condition the game knows right now -- the twenty authored plus
 *  whatever has been composed. The one lookup the runtime should use. */
export function conditionDef(key) {
  if (DEBUFFS[key]) return DEBUFFS[key];
  // ROUND 113 -- an unknown key may be a named affliction nothing has asked
  // for yet. One registration pass, then the ordinary lookup. Without this a
  // save carrying [Blackened Veins] would resolve to null on load and the tick
  // loop would delete it as a dangling condition.
  if (!_afflictionsRegistered && AFFLICTIONS[key]) registerNamedAfflictions();
  return CONDITION_REGISTRY.get(key) || null;
}
/** For suites and tools; not used in play. */
export function composedConditions() { return [...CONDITION_REGISTRY.values()]; }

/** Render a condition the way the books do, which is the convention the user
 *  chose for the cards: the bracketed name, its tags, then the mechanic. */
export function conditionLine(def) {
  if (!def) return '';
  return `[${def.label}] (${def.tags.join(', ')})`;
}
