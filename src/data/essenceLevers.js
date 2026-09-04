// ROUND 48 -- THE LEVER VOCABULARY.
//
// The user's diagnosis, verbatim:
//
//   "Essences in particular are not seeming to pull enough weight in
//    determining how an awakening stone effects the output. An awakening
//    stone of fire in an ape essence shouldn't be a simple 'gain 15% crit
//    chance' or 'throw a fireball' but should take a look at the intersection
//    between the two with more weight on the essence itself."
//
// Their four Ape x Fire examples say exactly what the intersection is. Read
// them again as a pattern rather than as four abilities:
//
//   "Thick fur"           -> the ESSENCE gives a BODY PART, the STONE gives an
//                            ELEMENT, and the mechanic is RESISTANCE.
//   "Ape arms"            -> the ESSENCE gives long arms, and the mechanic is
//                            REACH. The stone barely appears.
//   "Ape Make Fire"       -> the ESSENCE gives a crude melee blow, the STONE
//                            gives the fire that leaps off it: a CHAIN.
//   "Apes together strong" -> the ESSENCE gives a troop, and the mechanic is
//                            ALLY-COUNT SCALING, elementally coloured.
//
// So the essence is not a flavour word. It is a claim about WHAT KIND OF
// MECHANIC this character produces, and the stone says what that mechanic is
// made of. That is the split this file encodes:
//
//        ESSENCE -> the LEVER (the mechanical shape, and the body it acts on)
//        STONE   -> the ELEMENT (what the shape is made of)
//
// Before this round the generator had it backwards. Measured over 400 sockets:
// 74% of descriptions were a fixed sentence with the STONE's phrase dropped
// in, the stone owned the colour, the DoT label and the entire category bias,
// and the essence's only numeric contribution was `essDef.base` -- which 60%
// of the catalog does not even define, so it fell back to the literal 6. Four
// different essences on one stone produced one description and one mechanic
// and differed only in the name. That is the "mad libs" the user is seeing.

/**
 * The levers. This list is CLOSED on purpose.
 *
 * Fourteen was enough to describe every essence in the catalog without the
 * vocabulary collapsing into "one lever per essence", which would just be the
 * old system with more steps. Each lever names a mechanical shape the game can
 * actually express, biases the categories that express it, and carries a twist
 * that fires after the numbers are rolled.
 *
 * It has grown twice since, to sixteen (round 48) and seventeen (round 49), and
 * both times by the same test rather than by taste: a lever is added when there
 * is a mechanic the existing vocabulary can only reach by mangling something
 * into a shape it does not fit. CLOSED still means what it said -- the bar is
 * "nothing here can express this", not "this would be nice to have".
 *
 * `bias`  -- ability categories this lever pulls toward, best first.
 * `blurb` -- how to describe the lever's effect in a sentence, for composed
 *            descriptions. Written as a verb phrase with no subject.
 */
export const LEVERS = {
  reach:      { label: 'Reach',
    bias: ['martial_distance', 'weapon_affinity', 'ranged_damage', 'self_passive_aoe'],
    blurb: 'lengthens what it acts through -- arms, blades, the carry of a spell' },
  allies:     { label: 'Company',
    bias: ['self_passive_aoe', 'self_passive_heal', 'aoe_heal_pulse', 'summon_bonded'],
    blurb: 'binds those standing with you into one another\'s strength' },
  raw:        { label: 'Force',
    bias: ['self_active_damage', 'martial_sunder', 'passive_element_pierce', 'self_passive_buff', 'martial_reaper'],
    blurb: 'puts plain weight behind a blow' },
  ward:       { label: 'Ward',
    bias: ['self_active_armor', 'self_passive_ward_aura', 'reflect_spell', 'self_active_absorb', 'reflect_damage', 'reflect_debuff', 'self_passive_buff', 'thorns_active'],
    blurb: 'turns harm aside before it lands' },
  swift:      { label: 'Quickness',
    bias: ['movement_haste_active', 'cooldown_passive', 'movement_passive', 'movement_dash', 'weapon_affinity'],
    blurb: 'moves sooner and more often than it should be able to' },
  chain:      { label: 'Chain',
    bias: ['ranged_volley', 'triggered_kill_bolt', 'ranged_aoe', 'aoe_dot_ring', 'self_active_aoe'],
    blurb: 'will not stop at the first thing it touches' },
  linger:     { label: 'Lingering',
    bias: ['ranged_dot', 'aoe_dot_ring', 'barrier_burn', 'imbue_strike', 'self_passive_weaken_aura'],
    blurb: 'stays in the wound after the blow is over' },
  // ROUND 52 -- LINGERING, MENDING SIDE. The nineteenth lever.
  //
  // The user: "This might have been why Renewal generated a linger lever,
  // perhaps linger needs split into linger damage vs linger healing." Exactly
  // so. `linger` is one idea -- an effect that keeps working after it lands --
  // wearing one name for two opposite polarities, and every part of the
  // generator that touched it had only been taught the harmful one: its bias
  // list is four affliction categories, its charter admits damage_overtime and
  // control, and its flavour hook writes `spec.dot` and nothing else. Put that
  // lever on a healer and you get "Purifying Bloom, 7 dmg, +2x4 Burn".
  //
  // A single polarity-aware lever was tried first and is the wrong shape: the
  // bias list and the CHARTER are both consulted before any ability exists to
  // read the polarity from, so a mending Renewal still inherited linger's
  // freeze-and-hex permissions and still stapled a Burn onto the one rolled
  // ability that did not heal. Two levers decide it at the only moment the
  // decision can be made cleanly -- when the motif is written.
  // Bias order matters and is deliberate: leverForCategory gives a category to
  // whichever lever names it EARLIEST, so `aoe_heal_pulse` sits second here to
  // beat `mend`, which names it third. A group heal that keeps giving is the
  // clearest thing this lever can be, and without the reorder `mend` won every
  // heal in the game on motif order alone and `renew` only ever lengthened a
  // trickle that was already a trickle.
  renew:      { label: 'Renewing',
    // `aoe_heal_pulse` must stay at index 1: leverForCategory gives a category to
    // whichever lever names it earliest, `mend` names it third, and dropping it
    // to fourth to make room for the new pair handed every group heal back to
    // `mend` -- which took the mending RIDER with it, 0 of 180 pools.
    bias: ['self_active_hot', 'aoe_heal_pulse', 'bloom_field', 'triggered_regen_on_hit', 'self_passive_heal', 'self_active_heal'],
    blurb: 'keeps closing the wound long after the hand is lifted' },
  burst:      { label: 'Burst',
    // ROUND 55 -- the breath and the volley join the list. A new category that
    // no lever names is only ever reached by the top-up rotation: measured at 8
    // and 3 across 4,000 abilities before this line.
    bias: ['ranged_cone', 'ranged_aoe', 'ranged_volley', 'self_active_aoe', 'martial_reaper', 'triggered_wounded_fury'],
    blurb: 'spends everything at once and asks for the cooldown afterwards' },
  mend:       { label: 'Mending',
    bias: ['self_active_heal', 'self_active_hot', 'aoe_heal_pulse', 'self_passive_heal'],
    blurb: 'closes what has been opened' },
  siphon:     { label: 'Siphon',
    bias: ['ranged_leech', 'triggered_crit_empower', 'self_active_damage', 'imbue_strike'],
    blurb: 'takes from what it wounds and keeps it' },
  stalk:      { label: 'Stalking',
    bias: ['self_active_crit', 'triggered_crit_drought', 'perception', 'passive_conditional'],
    blurb: 'waits for the opening and does not miss it twice' },
  bind:       { label: 'Binding',
    // ROUND 56 -- a wall is the purest form of taking the ground away, so the
    // binding lever leads with one.
    bias: ['barrier_block', 'aoe_weaken', 'barrier_pull', 'self_passive_slow_aura', 'self_active_timefreeze', 'self_passive_weaken_aura'],
    blurb: 'takes the ground and the tempo away from what it faces' },
  call:       { label: 'Calling',
    // ROUND 59 -- the active summons lead. `call` is the lever that means
    // "brings something else to the fight", and until this round everything it
    // could bring was passive: a bonded familiar and three conjured items. The
    // one lever in the game about summoning could not produce a summon you cast.
    bias: ['summon_creature', 'summon_bonded', 'summon_turret', 'summon_trap',
      'summon_weapon', 'summon_armor', 'summon_gear'],
    blurb: 'brings something else to the fight' },
  shift:      { label: 'Shifting',
    bias: ['movement_teleport', 'town_portal', 'movement_dash', 'self_active_immunity'],
    blurb: 'is somewhere other than where the blow was aimed' },
  // ROUND 48 -- two levers the first fourteen could not express.
  //
  // Both were asked for by the motif authors INDEPENDENTLY, working on
  // different batches with no sight of each other, which is the useful signal:
  // Discord kept wanting enemies to fight each other and Omen kept wanting a
  // second chance at a roll, and both had to be mangled into `bind` and
  // `stalk` to fit. When two separate passes over different data reach for the
  // same missing thing, the vocabulary is short, not the essences.
  turn: { label: 'Turning',
    bias: ['confuse_turn', 'aoe_weaken', 'self_passive_weaken_aura', 'self_active_timefreeze'],
    blurb: 'sets what it touches against whatever stands nearest to it' },
  fate: { label: 'Fate',
    bias: ['fate_reroll', 'triggered_crit_drought', 'passive_conditional', 'perception'],
    blurb: 'gets the roll it needed the second time it is asked for' },
  // ROUND 49 -- the seventeenth lever. The user, verbatim:
  //
  //   "Also a new ability type that needs added, Taunts (Drawing monsters to
  //    the tank and away from the team)"
  //
  // Note which half of that sentence is the mechanic. "Drawing monsters to the
  // tank" is a target change; "and away from the team" is the CONSEQUENCE, and
  // it is the reason this could not be expressed as a variation on `ward`.
  // Every defensive lever the file already had makes the BEARER harder to kill
  // -- ward turns harm aside, bind takes the ground away, mend closes what
  // opened. None of them move a monster's attention off somebody else, so a
  // tank essence could only ever produce a character who survived well while
  // the healer got eaten behind them. That is a role the vocabulary could
  // describe and not a role it could play.
  //
  // The bias leads with the new category and then falls back to the guard
  // family, so an essence carrying this lever still reads as protective in
  // every socket that cannot roll a taunt outright.
  taunt: { label: 'Drawing',
    bias: ['taunt_pull', 'self_active_armor', 'self_active_absorb', 'thorns_active'],
    blurb: 'puts itself between the pack and everyone standing behind it' },
  // ROUND 49 -- STEALTH. The user: "Stealth for monsters, and appropriate
  // essences. Character becomes semi tranaparent reducing agro radius and
  // allowing for movement past monsters. Monsters sit semi transparent to
  // ambush adventurers."
  //
  // A separate lever from `stalk`, which is a near neighbour and not the same
  // thing: stalk is about WAITING for the opening (its bias is crit and
  // perception -- it makes the strike land harder when it comes), stealth is
  // about NOT BEING SEEN AT ALL. An essence can carry either without the other,
  // and the ones that carry both -- Knife, Cat, Lurker -- are the ones the
  // fantasy actually describes as rogues.
  stealth: { label: 'Veiling',
    bias: ['stealth_veil', 'movement_dash', 'self_active_crit', 'passive_conditional'],
    blurb: 'is not where the eye goes, and is already past by the time it looks' },
};

export const LEVER_KEYS = Object.keys(LEVERS);

/**
 * The MATERIAL a STONE contributes, keyed by the stone's family.
 *
 * Both catalogs use the SAME 28 families -- confirmed by counting them: 146
 * essences and 180 stones across an identical family list. That is exactly why
 * the old generator could get away with reading only the stone's copy, and
 * exactly why the fix is not "read the essence instead" but "ask the two
 * halves DIFFERENT questions". Several of these families are not elemental at
 * all (polearm, guard, identity, craft), so what the stone really supplies is
 * a material and a method -- what the mechanic is MADE OF -- while the essence
 * supplies the mechanical shape.
 *
 * `element`  -- the damage/resist channel. Constrained to the SIX the game
 *              actually has (stats.js ELEMENT_TYPES: fire, frost, lightning,
 *              nature, shadow, radiant) plus 'physical'. An earlier draft of
 *              this table invented 'poison', 'earth', 'holy' and 'arcane';
 *              nothing downstream has resistances for those, so a stone built
 *              on one would have rolled resistance bonuses against a channel
 *              no monster can deal.
 * `noun`     -- what the element IS, for names ("fire", "frost", "venom").
 * `adj`      -- the element as a modifier ("burning", "frozen").
 * `verb`     -- what it does on contact, for attack descriptions.
 * `dot`      -- the status label it applies, or null where it applies none.
 * `hot`      -- ROUND 52. The MENDING label, the counterpart to `dot`. A
 *              lingering effect has two polarities and the table only had a
 *              word for one of them, which is why the `linger` lever declined
 *              every healing socket it was ever offered.
 */
export const STONE_ELEMENTS = {
  fire:       { element: 'fire',      noun: 'fire',      adj: 'burning',     verb: 'sears',      dot: 'Burn', hot: 'Cautery' },
  cold:       { element: 'frost',       noun: 'frost',     adj: 'frozen',      verb: 'numbs',      dot: 'Frostbite', hot: 'Numbing' },
  storm:      { element: 'lightning', noun: 'lightning', adj: 'crackling',   verb: 'jolts',      dot: 'Shock', hot: 'Charge' },
  air:        { element: 'lightning',       noun: 'wind',      adj: 'howling',     verb: 'scatters',   dot: null, hot: 'Second Wind' },
  water:      { element: 'frost',     noun: 'water',     adj: 'drowning',    verb: 'crushes',    dot: null, hot: 'Freshet' },
  aquatic:    { element: 'frost',     noun: 'tide',      adj: 'brine-slick', verb: 'drags',      dot: null, hot: 'Tide' },
  earth:      { element: 'nature',     noun: 'stone',     adj: 'stonebound',  verb: 'batters',    dot: null, hot: 'Bedrock' },
  serpent:    { element: 'nature',    noun: 'venom',     adj: 'envenomed',   verb: 'poisons',    dot: 'Venom', hot: 'Shedding' },
  blood:      { element: 'physical',  noun: 'blood',     adj: 'bloody',      verb: 'opens',      dot: 'Bleed', hot: 'Transfusion' },
  death:      { element: 'shadow',      noun: 'grave',     adj: 'grave-cold',  verb: 'withers',    dot: 'Decay', hot: 'Reprieve' },
  dark:       { element: 'shadow',      noun: 'shadow',    adj: 'shadowed',    verb: 'smothers',   dot: 'Decay', hot: 'Umbral Rest' },
  light:      { element: 'radiant',      noun: 'light',     adj: 'radiant',     verb: 'scours',     dot: null, hot: 'Grace' },
  life:       { element: 'nature',    noun: 'green',     adj: 'quickening',  verb: 'floods',     dot: null, hot: 'Flourish' },
  mind:       { element: 'shadow',    noun: 'thought',   adj: 'unravelling', verb: 'confounds',  dot: null, hot: 'Composure' },
  space:      { element: 'shadow',    noun: 'rift',      adj: 'folded',      verb: 'displaces',  dot: null, hot: 'Realignment' },
  order:      { element: 'radiant',    noun: 'law',       adj: 'ordered',     verb: 'binds',      dot: null, hot: 'Restitution' },
  identity:   { element: 'shadow',    noun: 'self',      adj: 'many-faced',  verb: 'usurps',     dot: null, hot: 'Selfsame' },
  motion:     { element: 'physical',  noun: 'momentum',  adj: 'running',     verb: 'overruns',   dot: null, hot: 'Momentum' },
  force:      { element: 'physical',  noun: 'force',     adj: 'driven',      verb: 'slams',      dot: null, hot: 'Reinforcement' },
  beast:      { element: 'physical',  noun: 'claw',      adj: 'feral',       verb: 'mauls',      dot: 'Bleed', hot: 'Vigour' },
  smallbeast: { element: 'physical',  noun: 'fang',      adj: 'scurrying',   verb: 'worries',    dot: 'Bleed', hot: 'Quickening' },
  flyer:      { element: 'physical',       noun: 'talon',     adj: 'stooping',    verb: 'rakes',      dot: 'Bleed', hot: 'Updraft' },
  guard:      { element: 'physical',  noun: 'bulwark',   adj: 'warded',      verb: 'turns',      dot: null, hot: 'Bulwark' },
  craft:      { element: 'physical',  noun: 'forge',     adj: 'tempered',    verb: 'hammers',    dot: null, hot: 'Repair' },
  blade:      { element: 'physical',  noun: 'edge',      adj: 'keen',        verb: 'cuts',       dot: 'Bleed', hot: 'Knitting' },
  polearm:    { element: 'physical',  noun: 'point',     adj: 'levelled',    verb: 'runs through', dot: 'Bleed', hot: 'Steadying' },
  bludgeon:   { element: 'physical',  noun: 'weight',    adj: 'crushing',    verb: 'staves in',  dot: null, hot: 'Setting' },
  ranged:     { element: 'physical',  noun: 'shot',      adj: 'loosed',      verb: 'punches through', dot: 'Bleed', hot: 'Second Wind' },
};

/** Fallback for any family the table above does not name. */
// ROUND 73 -- the alchemy family, added with the potion slots. Without an
// entry here `elementForFamily` falls to DEFAULT_ELEMENT and every alchemy
// ability would describe itself as "raw essence", which is the blandest text
// the generator can produce and would make the new family read as a mistake.
// Nature, because a draught is a distillation of growing things, and Corrosion
// because the other half of alchemy is what the acid does.
STONE_ELEMENTS.alchemy = { element: 'nature', noun: 'reagent', adj: 'distilled',
  verb: 'corrodes', dot: 'Corrosion', hot: 'Draught' };

export const DEFAULT_ELEMENT = {
  element: 'physical', noun: 'essence', adj: 'raw', verb: 'strikes', dot: null, hot: 'Mending',
};

export function elementForFamily(family) {
  return STONE_ELEMENTS[family] || DEFAULT_ELEMENT;
}
