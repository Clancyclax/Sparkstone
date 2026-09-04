// ===========================================================================
// ROUND 51 -- LEVER CHARTERS: what an essence is allowed to REFUSE.
//
// The user, on the generated roster: "I'm not seeing enough separation between
// builds... I really want each build to feel somewhat unique instead of the
// same generic build with some flavor text."
//
// Measured before this file existed, over 1,200 generated abilities:
//
//   - `projectileBall` was 16.3% of everything. One ability in six.
//   - Two random 20-ability builds shared 41.7% of their template multiset,
//     and the most-alike pair shared 73.9%.
//   - Probing sixteen different stones against one essence, nearly every
//     candidate pool offered the same core five: bolt, ring, aura, perception,
//     triggered passive.
//   - Within 196 generated bolts there were 108 distinct `_leverRider` values
//     but only 11 distinct `base` damages and 5 distinct projectile speeds.
//     The variety was a garnish on an identical dish.
//
// The structural cause is that an essence could only ever REORDER one shared
// pool of categories. The bias list nudges what gets tried first; nothing
// could say "Renewal does not produce a plain damage bolt." So every essence,
// eventually, produced one.
//
// This file is that missing "no". Each of the nineteen levers gets a charter:
// the effect FAMILIES it may produce, and the families it may not. An essence
// inherits the union of its motif levers' charters, and a deny beats an allow.
// All 146 essences get a shape from this without a line of per-essence
// authoring -- the marquee jobs (round 51 phase 7) then narrow it further.
//
// Families are named at a coarser grain than templates on purpose. "Renewal
// may not deal direct damage" is a design statement; "Renewal may not use
// projectileBall" is an implementation detail that would need rewriting the
// first time a new damage template landed.
// ===========================================================================

/**
 * Effect families. A category may belong to more than one -- a leeching bolt
 * is both damage and siphon, an armour summon is both a summon and a shield --
 * and a deny on ANY of a category's families removes it.
 *
 * Several families have no categories behind them yet (`cleanse`, `resource`,
 * `tether`). They are named here because the charters are the design document
 * as much as the code, and a lever that will be allowed to cleanse once phase 2
 * lands should say so now rather than being edited later and silently changing
 * what every essence carrying it can do.
 */
export const EFFECT_FAMILIES = [
  'damage_direct',    // deals damage on use
  'damage_overtime',  // afflictions, ground effects, delayed payloads
  'heal',             // restores health
  'cleanse',          // removes afflictions                       (phase 2)
  'resource',         // restores mana or stamina                  (phase 2)
  'shield',           // absorbs, armour, resistances, immunity
  'buff_self',        // combat buffs that only ever help the caster
  'buff_ally',        // buffs and heals that reach other people
  'attribute',        // long-lived attribute growth
  'control',          // slows, weakens, freezes, confuses
  'tether',           // leashes, pulls, movement punishment        (phase 4)
  'movement',         // dashes, blinks, haste
  'summon',           // familiars and conjured gear
  'aura',             // persistent radius effects
  'perception',       // sight, reveals, weak points
  'stealth',          // concealment and ambush
  'taunt',            // threat and forced targeting
  'reflect',          // thorns, returns, counters
  'trigger',          // conditional passives that fire on an event
  'weapon',           // weapon affinities
  'fate',             // rerolls and guaranteed outcomes
  'utility',          // travel, convenience
];

/**
 * Category key -> the families it belongs to.
 *
 * `attr_boost` is deliberately `attribute` rather than `buff_self`: it is the
 * round-6 "Strength of Atlas" pattern, a staple of every build, and an essence
 * that refuses selfish COMBAT buffs (see `allies` below) should still be able
 * to grow. Splitting it out is what lets `allies` deny `buff_self` without
 * taking the staple away from every support build in the game.
 */
export const CATEGORY_FAMILIES = {
  // --- damage ---
  ranged_damage:            ['damage_direct'],
  ranged_aoe:               ['damage_direct'],
  self_active_aoe:          ['damage_direct'],
  martial_sunder:           ['damage_direct'],
  martial_distance:         ['damage_direct'],
  martial_reaper:           ['damage_direct'],
  ranged_leech:             ['damage_direct'],
  // ROUND 51 -- these two are BOTH. Measured on the first pass: marking them
  // damage_overtime alone let every mend essence keep a bolt, because a bolt
  // that also applies a burn is still a bolt -- `ranged_dot` generates a
  // projectileBall with a real `base` and a dot rider on top, and `aoe_dot_ring`
  // an aoeRing the same way. A refusal of direct damage that a damage-over-time
  // label could walk around would not be a refusal.
  //
  // A pure affliction with no impact damage is a phase-2 template, and when it
  // exists it gets `damage_overtime` on its own.
  ranged_dot:               ['damage_direct', 'damage_overtime'],
  aoe_dot_ring:             ['damage_direct', 'damage_overtime'],
  imbue_strike:             ['damage_overtime', 'buff_self'],
  // ROUND 55 -- the three new shapes. A breath and a volley are plainly direct
  // damage; the pierce passive is a buff to the bearer's own output, which is
  // `buff_self` rather than `damage_direct` because it deals none itself and an
  // essence that refuses to hurt people should still be able to refuse it.
  ranged_cone:              ['damage_direct'],
  ranged_volley:            ['damage_direct'],
  passive_element_pierce:   ['buff_self'],
  // ROUND 56 -- barriers, reflection, cadence.
  //
  // A blocking wall is `control` and NOT damage: it deals none, and an essence
  // that refuses to hurt people should still be allowed to put a rock in the
  // way. The burning and collapsing walls do harm and say so, which is what
  // keeps a Renewal from laying a line of fire.
  barrier_block:            ['control', 'shield'],
  barrier_burn:             ['damage_direct', 'damage_overtime', 'control'],
  barrier_pull:             ['control', 'tether'],
  reflect_spell:            ['reflect', 'shield'],
  reflect_damage:           ['reflect'],
  // ROUND 57 -- returning the affliction rather than the blow. Filed under
  // control as well as reflect: what comes back is a debuff, and inflicting
  // debuffs is what the control family is.
  reflect_debuff:           ['reflect', 'control'],
  cooldown_passive:         ['buff_self'],

  // --- restoration ---
  self_active_heal:         ['heal'],
  self_active_hot:          ['heal'],
  aoe_heal_pulse:           ['heal', 'buff_ally'],
  // ROUND 55 -- the user's two worked HoT cases. The bloom reaches allies, so
  // it is buff_ally as well as heal; the troll reflex is a trigger that mends.
  bloom_field:              ['heal', 'buff_ally'],
  triggered_regen_on_hit:   ['heal', 'trigger'],

  // --- protection ---
  self_active_absorb:       ['shield'],
  self_active_armor:        ['shield'],
  self_active_immunity:     ['shield'],
  thorns_active:            ['reflect'],

  // --- self buffs ---
  // ROUND 76 (item 5) -- and the ONE ability in the game that buffs somebody
  // else. Filed under `buff_ally` rather than `buff_self`, which is the whole
  // point of it: an essence charterd for self-buffs does not get to hand its
  // strength to the team, and an essence about allies does.
  party_buff:               ['buff_ally'],
  self_active_damage:       ['buff_self'],
  self_active_crit:         ['buff_self'],
  reach_buff:               ['buff_self'],
  self_passive_buff:        ['buff_self'],
  attr_boost:               ['attribute'],

  // --- control ---
  aoe_weaken:               ['control'],
  confuse_turn:             ['control'],
  self_active_timefreeze:   ['control'],

  // --- movement ---
  movement_dash:            ['movement'],
  movement_teleport:        ['movement'],
  movement_haste_active:    ['movement'],
  movement_passive:         ['movement'],
  // ROUND 77 -- the two power passives.
  //
  // Both are filed even though both are reached OFF-CHARTER: `charterAllows`
  // returns true for an uncategorised key ("no opinion, let it through"), so a
  // missing entry would not have broken either ability -- which is exactly why
  // it needs to be here. An unfiled category is a silent hole in the one table
  // that decides what an essence is willing to do, and the next round to reach
  // one of these through an ordinary route would find no opinion where there
  // should be one. Caught by test_round51_charters, which asserts the table is
  // TOTAL for precisely this reason.
  //
  // `buff_self` for the one-handed grip: it deals nothing and changes only what
  // its bearer can hold, so an essence that refuses to hurt people can still
  // carry it. `movement` for water walking, which is what crossing a lake is.
  two_hand_wield:           ['buff_self'],
  water_walk:               ['movement'],
  town_portal:              ['utility'],

  // --- auras ---
  self_passive_aoe:         ['aura', 'damage_direct'],
  self_passive_heal:        ['aura', 'heal'],
  self_passive_slow_aura:   ['aura', 'control'],
  self_passive_weaken_aura: ['aura', 'control'],
  // ROUND 58 -- a warding field shields; it does not control anything.
  self_passive_ward_aura:   ['aura', 'shield', 'buff_self'],

  // --- summons ---
  summon_bonded:            ['summon'],
  // ROUND 59 -- the active summons. Filed under damage as well as summon,
  // because unlike a bonded familiar these exist to kill things: a charter
  // that called them summon-only would have kept them out of every offensive
  // essence in the game, which is exactly where they belong.
  summon_creature:          ['summon', 'damage_direct'],
  summon_turret:            ['summon', 'damage_direct'],
  summon_trap:              ['summon', 'damage_direct', 'control'],
  summon_weapon:            ['summon', 'weapon'],
  summon_armor:             ['summon', 'shield'],
  summon_gear:              ['summon'],

  // ROUND 75 -- THE STACKING FAMILY.
  //
  // These are `rareOnly` and are offered on the 1-in-40 rare seat, but they
  // still pass through the charter like everything else -- so an essence that
  // refuses to hurt things must not be handed Jason's Mark of Sin just because
  // the socket rolled rare. Filed by what each SHAPE actually does:
  //
  //   boon    builds on your own actions and pays into yourself. `trigger`
  //           because it fires on an event, `buff_self` because that is what
  //           the payout is.
  //   mark    builds on an ENEMY and detonates. `damage_direct` is the whole
  //           point of it, and `trigger` for the same reason as the boon.
  //   ledger  builds from what is done TO you. `reflect` is exactly the family
  //           for that -- thorns and returns and counters -- and it is what
  //           lets a defensive essence reach one while an assassin's does not.
  //
  // Caught by test_round51_charters, which asserts every category has a family
  // and would otherwise have let three new ones through `charterAllows`'s
  // "uncategorised: no opinion, let it through" fallback -- silently exempt
  // from the charter system entirely, which for the rarest and most
  // build-defining abilities in the game is the worst place to be exempt.
  stack_boon:               ['trigger', 'buff_self'],
  stack_mark:               ['trigger', 'damage_direct'],
  stack_ledger:             ['trigger', 'reflect', 'damage_direct'],

  // --- the rest ---
  perception:               ['perception'],
  weapon_affinity:          ['weapon'],
  fate_reroll:              ['fate'],
  passive_conditional:      ['trigger'],
  triggered_wounded_fury:   ['trigger'],
  triggered_kill_bolt:      ['trigger'],
  triggered_crit_empower:   ['trigger'],
  triggered_crit_drought:   ['trigger'],
  taunt_pull:               ['taunt'],
  stealth_veil:             ['stealth'],
};

/**
 * The nineteen charters.
 *
 * `may` is what this lever contributes to an essence's allowed space. `mayNot`
 * is what it takes OFF the table for the whole essence, whatever its other
 * levers say -- that asymmetry is the point. An essence that carries `mend`
 * cannot buy its way back to a damage bolt by also carrying `raw`; a healer
 * with a violent streak expresses it as a weapon or an affliction, not as a
 * bolt with a heal-flavoured name.
 *
 * `signature` names the mechanic that belongs to this lever and nothing else.
 * Most are phase 2-6 work; they are recorded here so the charter reads as the
 * whole design rather than only the half that exists today.
 */
export const LEVER_CHARTERS = {
  mend: {
    may: ['heal', 'cleanse', 'resource', 'buff_ally', 'aura', 'summon', 'trigger', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'conversion',   // afflictions removed become healing
  },
  ward: {
    may: ['shield', 'reflect', 'aura', 'trigger', 'buff_self', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'payout',       // the shield's remainder pays out on expiry
  },
  bind: {
    may: ['control', 'tether', 'aura', 'trigger', 'damage_overtime', 'damage_direct'],
    // ROUND 51 -- `damage_direct` was in mayNot on the first pass and it was too
    // strong. Caught by this phase's own suite: Might is raw + burst + BIND, and
    // a deny beats an allow, so the archetypal attack essence came out unable to
    // produce an attack. Bind means stunning blows as much as it means shackles.
    // Its identity comes from what it CAN do -- control, tethers, punishing a
    // target for acting -- not from refusing to hit anything.
    mayNot: [],
    signature: 'punish_on_action',
  },
  allies: {
    may: ['heal', 'buff_ally', 'aura', 'shield', 'summon', 'attribute'],
    // "May not: self-only buffs." An essence about the people standing with
    // you does not produce a buff only you can feel.
    mayNot: ['buff_self'],
    signature: 'ally_scaling',
  },
  raw: {
    may: ['damage_direct', 'buff_self', 'weapon', 'attribute', 'perception'],
    mayNot: ['control', 'utility'],
    signature: 'escalation',   // no cooldown, climbing cost
  },
  burst: {
    may: ['damage_direct', 'buff_self', 'attribute'],
    mayNot: ['damage_overtime'],
    signature: 'charge',
  },
  linger: {
    may: ['damage_overtime', 'aura', 'trigger', 'control', 'attribute'],
    mayNot: [],
    signature: 'detonation',
  },
  // ROUND 52 -- lingering's mending polarity, and the charter is the whole
  // reason it had to be its own lever rather than a branch inside `linger`.
  // `may` is a union across an essence's levers, so a Renewal that carried
  // `linger` inherited `damage_overtime` and `control` whether or not the
  // flavour hook ever used them -- which is how a healer's kit acquired a
  // hex, a freeze and a Burn. This list admits nothing that harms, and
  // `mayNot: ['damage_direct']` says so twice, since deny beats allow when a
  // motif pairs this with something bloodier.
  renew: {
    may: ['heal', 'aura', 'trigger', 'buff_ally', 'resource', 'cleanse', 'attribute'],
    mayNot: ['damage_direct'],
    signature: 'persistence',
  },
  chain: {
    may: ['control', 'tether', 'damage_direct', 'buff_ally', 'aura', 'movement'],
    mayNot: ['stealth'],
    signature: 'tether',
  },
  swift: {
    may: ['movement', 'buff_self', 'trigger', 'weapon', 'attribute'],
    mayNot: [],
    signature: 'refund',       // cooldown returned per enemy hit
  },
  siphon: {
    may: ['damage_direct', 'damage_overtime', 'heal', 'resource', 'trigger'],
    mayNot: [],
    signature: 'conversion',   // damage dealt becomes a resource
  },
  reach: {
    may: ['damage_direct', 'damage_overtime', 'control', 'perception', 'aura'],
    mayNot: [],
    signature: 'distance_scaling',
  },
  stalk: {
    // Deliberately NO damage_direct. Stalk is the opener -- crit, marks, first
    // strikes -- and its damage arrives through a weapon or a critical hit,
    // not through a bolt. This one omission is most of what makes a Foot build
    // stop looking like every other build.
    may: ['buff_self', 'stealth', 'perception', 'trigger', 'weapon', 'attribute'],
    mayNot: ['taunt'],
    signature: 'opener',
  },
  call: {
    may: ['summon', 'buff_ally', 'aura', 'attribute'],
    mayNot: [],
    signature: 'inheritance',  // the summon carries your afflictions
  },
  shift: {
    may: ['movement', 'control', 'utility', 'trigger'],
    mayNot: [],
    signature: 'swap',
  },
  turn: {
    may: ['reflect', 'shield', 'trigger', 'aura'],
    mayNot: [],
    signature: 'return',
  },
  fate: {
    may: ['fate', 'trigger', 'buff_self', 'attribute'],
    mayNot: [],
    signature: 'reroll',
  },
  taunt: {
    may: ['taunt', 'shield', 'aura', 'control', 'attribute'],
    mayNot: ['stealth'],
    signature: 'threat_defence',
  },
  stealth: {
    // Not `aura` in mayNot, though the two are thematically opposed: the
    // kit-completing aura probe (round 47) guarantees every kit one aura, and
    // a lever that vetoed it would leave a stealth build a piece short. Round
    // 49 already handles the real tension -- a damaging aura is suppressed
    // while the veil holds.
    may: ['stealth', 'movement', 'buff_self', 'perception', 'trigger'],
    mayNot: ['taunt'],
    signature: 'break_for_bonus',
  },
};

/**
 * The allowed and denied family sets for a set of levers.
 *
 * Deny wins. An essence with no recognised levers gets an empty charter, which
 * `charterAllows` reads as "no opinion" and lets everything through -- that is
 * the correct behaviour for a confluence or for anything a caller hands in
 * from outside the catalog, and it is why this can be added to a live
 * generator without stranding the essences it does not know about.
 */
export function charterFor(levers) {
  const allow = new Set(), deny = new Set();
  if (!levers || !levers.length) return { allow, deny, empty: true };
  let known = 0;
  for (const lv of levers) {
    const c = LEVER_CHARTERS[lv];
    if (!c) continue;
    known++;
    for (const f of c.may) allow.add(f);
    for (const f of c.mayNot) deny.add(f);
  }
  return { allow, deny, empty: known === 0 };
}

/** Does this charter permit a category? */
export function charterAllows(charter, categoryKey) {
  if (!charter || charter.empty) return true;
  const fams = CATEGORY_FAMILIES[categoryKey];
  if (!fams) return true;            // uncategorised: no opinion, let it through
  for (const f of fams) if (charter.deny.has(f)) return false;
  return fams.some(f => charter.allow.has(f));
}

/** Can an ability of this category deal direct damage? Read by the kit-level
 *  one-damage-option guarantee (the user's answer to round 51's question 4:
 *  "yes, but guarantee one damage option"). */
export function categoryDeals(categoryKey) {
  const fams = CATEGORY_FAMILIES[categoryKey] || [];
  return fams.includes('damage_direct') || fams.includes('damage_overtime')
      || fams.includes('weapon') || fams.includes('summon');
}

/** The families a category belongs to. Exported for the audit and the tests. */
export function familiesOf(categoryKey) { return CATEGORY_FAMILIES[categoryKey] || []; }
