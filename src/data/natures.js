// ============================================================================
// ROUND 361 -- NATURES, AND NATURE GIFT EVOLUTIONS.
//
//   "Everywhere that I used the word racial, change to nature."
//   "Each creature possesses six abilities inherent to their nature, and these
//    can evolve to reflect the soul."
//   "In canon nature abilities can evolve under extreme stress (or as a quest
//    reward for massive achievements). These are called 'Nature Gift
//    Evolutions' and are rare and secretive. Even rarer is that ability can
//    evolve again. Within the game we will only have them add additional
//    effects so as not to lose key game features. Most often they tie in with
//    a character's essences."
//   "The first ability affected should be the astral blessing as after a player
//    gets all their essence abilities it has no purpose anymore."
//   "For now work out how to add the systems in and I'll provide a list."
//
// THREE THINGS LIVE HERE.
//
//   NATURES             five natures, six abilities each. An ability's `fx` is
//                       what it does in play (see FX below); `lead` says the
//                       game already does it (the Outworlder's minimap and the
//                       like label features that exist and gate nothing).
//   NATURE_EVOLUTIONS   additive evolutions, keyed by `<nature>.<ability>`.
//                       Tier 1 and tier 2 ("even rarer"). The astral blessing
//                       is the first written: one pair per blessing, unlocked
//                       when every essence ability has awakened. The user's own
//                       list drops into the same table.
//   THE TRIGGER         stress (near death in a fight, the soul running dry)
//                       rolls for an evolution the ability is eligible for;
//                       a quest reward grants one outright, or is banked until
//                       one becomes eligible.
//
// FX -- every key is additive, so a nature or an evolution can only ADD to a
// character, never take a feature away (6.2).
//   awaken    { spell|special: k }   more likely to awaken that kind (kit roll)
//   effect    { <tag>: frac }        tagged abilities have increased effect
//               tags: spell special heal buff dispel summon nature life holy
//                     dimension favoured (the astral blessing's own kind)
//                     essence:<id> (one essence's abilities)
//   dmg       { <tag>: frac }        tagged damage increased (same tags + transcendent)
//   resist    { <element>: frac }    resistance (elements with a resist stat)
//   attr      { power|speed|...: n } attribute points
//   loot      frac                   additional loot from every enemy
//   cdCut     { <tag>: frac }        tagged abilities' cooldowns shortened
//   move      frac                   movement speed
//   guard     frac                   damage reduction
//   afflictResist, afflictCut, manaUpkeepCut, manaDrainResist, mindResist,
//   meleePerEssence, essenceXp, oneHandTwoHanders, breath
//             recorded for every reader; see natureFaults for which have a door.
// ============================================================================

/** The six ability slots every nature fills. */
export const NATURE_ABILITY_COUNT = 6;

import { AURA_GIFT_ESSENCES, PERCEPTION_GIFT_ESSENCES } from './senseAllowance.js';   // ROUND 388

const ab = (id, name, line, fx = {}, extra = {}) => ({ id, name, line, fx, ...extra });

export const NATURES = {
  outworlder: {
    id: 'outworlder', name: 'Outworlder',
    line: 'Born somewhere else. Whatever brought you here wrote a few things into you on the way.',
    abilities: [
      ab('minimap', 'Mini Map', 'The Nek has no maps like yours. Yours simply draws itself in the corner of your eye.', {}, { lead: true }),
      ab('language', 'Language Adaptation', 'Every tongue in the Nek comes to you as your own, spoken and read. You can use skill books.', {}, { lead: true }),
      ab('inventory', 'Inventory', 'Whatever you pick up goes somewhere only you can reach, and comes back when you reach for it.', {}, { lead: true }),
      ab('loot', 'Loot Ability', 'What a kill leaves behind arrives in your hands. You do not have to dig.', {}, { lead: true }),
      ab('identify', 'Item Identification', 'You know what a thing is when you hold it: its name, its worth, what it will do.', {}, { lead: true }),
      ab('blessing', 'Astral Blessing', 'Something out past the stars took an interest in you. It leans what your essences give you.', {}, { lead: true }),
    ],
  },
  human: {
    id: 'human', name: 'Human',
    line: 'Short-lived, stubborn, and quicker to grow than anything that should know better.',
    abilities: [
      ab('ambition', 'Human Ambition', 'Essence abilities advance more quickly.', { essenceXp: 0.15 }),
      ab('specialApt', 'Special Attack Aptitude', 'More likely to awaken special attacks, and special attacks have increased effect.',
        { awaken: { special: 1 }, effect: { special: 0.1 } }),
      ab('gift1', 'Essence Gift', 'A gift that waits for an essence. It evolves when a new essence is bound.', {}, { essenceGift: 0 }),
      ab('gift2', 'Essence Gift', 'A gift that waits for an essence. It evolves when a new essence is bound.', {}, { essenceGift: 1 }),
      ab('gift3', 'Essence Gift', 'A gift that waits for an essence. It evolves when a new essence is bound.', {}, { essenceGift: 2 }),
      ab('gift4', 'Essence Gift', 'A gift that waits for an essence. It evolves when a new essence is bound.', {}, { essenceGift: 3 }),
    ],
  },
  elf: {
    id: 'elf', name: 'Elf',
    line: 'Old blood that the world listens to. Magic comes easily to them, and so does patience.',
    abilities: [
      ab('spellApt', 'Spell Aptitude', 'More likely to awaken spells, and spells have increased effect.',
        { awaken: { spell: 1 }, effect: { spell: 0.1 } }),
      ab('natureAff', 'Nature Affinity', 'Increased resistance to nature effects; nature abilities have increased effect and nature damage is increased.',
        { resist: { nature: 0.1 }, effect: { nature: 0.1 }, dmg: { nature: 0.1 } }),
      ab('lifeAff', 'Life Affinity', 'Positive life effects, used or received, have greater effect.',
        { effect: { heal: 0.1, life: 0.1 }, healTaken: 0.1 }),
      ab('magicAff', 'Magic Affinity', 'Buffs given and received are stronger; afflictions are resisted and weaker and shorter when they land; a dispel may remove one more effect.',
        { effect: { buff: 0.1 }, dispelExtra: 0.15, afflictResist: 0.1, afflictCut: 0.15 }),
      // ROUND 361 -- the user named these two and gave no description. These
      // lines and numbers are PLACEHOLDERS, flagged in ROUND361_NOTES.md, to be
      // replaced when the user writes them.
      ab('mysticBlood', 'Mystic Bloodline', 'The old magic in the blood answers more readily: mana returns a little faster.',
        { manaRegen: 0.1 }),
      ab('grace', 'Grace', 'Light on the feet and hard to pin: a little quicker, a little harder to hit.',
        { move: 0.03, dodge: 0.02 }),
    ],
  },
  celestine: {
    id: 'celestine', name: 'Celestine',
    line: 'Long-lived and luminous, with something of the high places in them.',
    abilities: [
      ab('bounty', 'Celestial Bounty', 'Gain 5% additional loot from all enemies.', { loot: 0.05 }),
      ab('manaIntegrity', 'Mana Integrity', 'Ongoing mana costs for maintained abilities are reduced; resistance to mana drain is increased.',
        { manaUpkeepCut: 0.25, manaDrainResist: 0.25 }),
      ab('astralAff', 'Astral Affinity', 'Dimension and astral resistance; dimension abilities have increased effect; transcendent damage is increased.',
        { resist: { dimension: 0.1 }, effect: { dimension: 0.1 }, dmg: { transcendent: 0.1 } }),
      ab('holyAff', 'Holy Affinity', 'Holy resistance; holy abilities have increased effect; transcendent damage is increased.',
        { resist: { radiant: 0.1 }, effect: { holy: 0.1 }, dmg: { transcendent: 0.1 } }),
      ab('specialAbilityApt', 'Special Ability Aptitude', 'More likely to awaken special attacks, and special attacks have increased effect.',
        { awaken: { special: 1 }, effect: { special: 0.1 } }),
      ab('swiftness', 'Celestial Swiftness', 'The Speed attribute is increased.', { attr: { speed: 1 } }),
    ],
  },
  draconian: {
    id: 'draconian', name: 'Draconian',
    line: 'Dragon somewhere back up the line, and it has not let go.',
    abilities: [
      ab('magicAff', 'Magic Affinity', 'Buffs given and received are stronger; afflictions are resisted and weaker and shorter when they land; a dispel may remove one more effect.',
        { effect: { buff: 0.1 }, dispelExtra: 0.15, afflictResist: 0.1, afflictCut: 0.15 }),
      ab('ancestry', 'Dragon Ancestry', 'Resistant to mind control; melee damage +3% for each essence type absorbed.',
        { mindResist: 0.3, meleePerEssence: 0.03 }),
      ab('might', 'Draconic Might', 'Wield two-handed weapons in one hand.', { oneHandTwoHanders: true }),
      ab('power', 'Draconic Power', 'Power +1.', { attr: { power: 1 } }),
      ab('scales', 'Dragon Scales', '5% elemental resistance.', { resist: { fire: 0.05, frost: 0.05, lightning: 0.05, nature: 0.05 } }),
      ab('breath', 'Dragon Breath', 'A conic breath attack whose damage is set by the essences absorbed.', { breath: true }),
    ],
  },
  // ROUND 363 -- the user's own six for the runic and the leonid (round 362 had placeholders here).
  runic: {
    id: 'runic', name: 'Runic',
    line: 'People written on: the runes in their skin were there at birth, and magic runs through them like water through a channel.',
    abilities: [
      ab('spellApt', 'Spell Aptitude', 'More likely to awaken spells, and spells have increased effect.',
        { awaken: { spell: 1 }, effect: { spell: 0.1 } }),
      ab('magicAff', 'Magic Affinity', 'Buffs given and received are stronger; afflictions are resisted and weaker and shorter when they land; a dispel may remove one more effect.',
        { effect: { buff: 0.1 }, dispelExtra: 0.15, afflictResist: 0.1, afflictCut: 0.15 }),
      ab('spellborn', 'Spellborn', 'Absorb 10% of magical damage taken directly into mana.', { spellToMana: 0.1 }),
      ab('wellspring', 'Wellspring', 'Gain 50% additional maximum mana.', { maxManaPct: 0.5 }),
      ab('adaptive', 'Adaptive Resistance', 'Take 10% less damage from any spell damage taken in the past 10 seconds.', { adaptiveResist: 0.1 }),
      ab('manaBeacon', 'Mana Beacon', 'Effects that restore or regenerate mana are 25% stronger.', { manaRestore: 0.25 }),
    ],
  },
  leonid: {
    id: 'leonid', name: 'Leonid',
    line: 'The lion people: taller than humans, proud, loud, and loyal to a pride before anything else.',
    abilities: [
      ab('ancestralStrength', 'Ancestral Strength', 'Power +1.', { attr: { power: 1 } }),
      ab('ancestralSwiftness', 'Ancestral Swiftness', 'Speed +1.', { attr: { speed: 1 } }),
      ab('boonAptitude', 'Boon Aptitude', 'Buffs applied by and to this creature gain 25% additional effectiveness.', { effect: { buff: 0.25 }, buffTaken: 0.25 }),
      ab('tireless', 'Tireless', 'Maximum stamina increased by 50%.', { maxStaminaPct: 0.5 }),
      ab('sprint', 'Sprint', 'Sprinting is 15% faster and consumes 25% less stamina.', { sprintSpeed: 0.15, sprintCostCut: 0.25 }),
      ab('roar', 'Leonid\'s Roar', 'A roar that stuns enemies and increases the damage they take.', { roar: true }),
    ],
  },
};

export const NATURE_IDS = Object.keys(NATURES);
export const isNature = (id) => NATURE_IDS.includes(id);
export const natureById = (id) => NATURES[id] || null;
export const natureAbilityRef = (natureId, abilityId) => `${natureId}.${abilityId}`;
export function natureAbility(ref) {
  const [n, a] = String(ref || '').split('@')[0].split('.');   // ROUND 388 -- a side track (`...@scar`) is its ability's
  const N = NATURES[n];
  return N ? (N.abilities.find(x => x.id === a) || null) : null;
}

/** The player is an Outworlder, always (round 308). Companions say theirs in party.js. */
export const PLAYER_NATURE = 'outworlder';

/** The Outworlder's first five, in the shape round 308 exported them. */
export const OUTWORLDER_NATURE = NATURES.outworlder.abilities;

// ============================================================================
// NATURE GIFT EVOLUTIONS.
//
// `of`      the nature ability it evolves (`<nature>.<ability>`)
// `tier`    1, or 2 ("even rarer is that ability can evolve again"); a tier-2
//           needs its tier-1 first
// `when`    what must be true before stress or a reward can wake it:
//             blessing: '<id>'    the player's astral blessing is this one
//             kitComplete: true   every essence ability has awakened
//             essence: '<id>' / family: '<f>'   a bound essence (6.3)
// `fx`      ADDED to the ability's own (see FX above)
// ============================================================================
const BLESSING_EVOS = {
  reaper:   [['The Reaper\'s Harvest', 'What you wither stays withered: afflictions you lay are stronger.'],
             ['The Reaper\'s Own', 'Nothing you mark gets up again the same.']],
  phoenix:  [['Phoenix Ascendant', 'The ground stopped arguing with you. Movement is stronger and you are quicker.'],
             ['Phoenix Reborn', 'Every step is a small rebirth.']],
  builder:  [['The Builder\'s Bulwark', 'What you raise holds: defences are stronger and blows land lighter.'],
             ['The Builder\'s Keep', 'You are the wall now.']],
  moments:  [['Keeper of Hours', 'The long work comes round sooner: long-cooldown abilities return faster and hit harder.'],
             ['Keeper of Ages', 'Time keeps its appointments with you.']],
  book:     [['The Open Book', 'The pages turn themselves: spells are stronger.'],
             ['The Written World', 'Whatever you write, the world reads.']],
  legion:   [['Legion Unbound', 'Your summons come through stronger and hardier.'],
             ['Legion Eternal', 'You have never been alone, and now they know it too.']],
  eye:      [['The Eye Unclosed', 'It never blinks now: area abilities are stronger.'],
             ['The Eye That Devours', 'All of it, all at once.']],
  songs:    [['The Song Remembered', 'The tune that mends is yours by heart: healing is stronger.'],
             ['The Song Unending', 'It does not stop when you stop singing.']],
  silence:  [['The Word Spoken', 'What you say in the quiet is louder: support is stronger.'],
             ['The Last Word', 'Everyone hears it. Everyone answers.']],
  throne:   [['The Throne Reclaimed', 'A king\'s weapon remembers the king: special attacks are stronger.'],
             ['The Throne Restored', 'The hand fits the hilt as if it had always been there.']],
  nameless: [['The Named', 'The things that were never meant to be found have learned your name.'],
             ['The Unwritten', 'You are a page nobody wrote, and the world keeps reading it.']],
};
const BLESSING_EXTRA = {
  reaper: [{ dmg: { dot: 0.1 } }, { dmg: { dot: 0.15 } }],
  phoenix: [{ move: 0.05 }, { move: 0.05 }],
  builder: [{ guard: 0.03 }, { guard: 0.04 }],
  moments: [{}, {}],
  book: [{}, {}],
  legion: [{}, {}],
  eye: [{}, {}],
  songs: [{ healTaken: 0.05 }, { healTaken: 0.05 }],
  silence: [{}, {}],
  throne: [{}, {}],
  nameless: [{ findMult: 0.5 }, { findMult: 0.5 }],
};

export const NATURE_EVOLUTIONS = [];

// ===== ROUND 388 -- THE SOUL SCAR'S EVOLUTION. "The soul scar would have been a good opportunity for a gift evolution
// leading to the ability to awaken 1 aura for each essence." The scar is Olb's sacrifice: Destruction's aura laid down
// on the player's soul (soulScars.js `destruction`), the character-defining moment that already pays a nature gift
// evolution (NATURE_ACHIEVEMENTS.olb). It evolves the Astral Blessing -- the gift that leans what the essences give --
// on a track of its own (`@scar`), so the blessing's own two tiers are untouched. Listed FIRST, so the reward the Olb
// moment pays is this one. One of the two, never both: perception only when the kit's held-off extra is a perception.
export const SCAR_SENSE_TRACK = 'outworlder.blessing@scar';
export const SCAR_SENSE_EVOS = [
  { id: 'scar_aura', of: SCAR_SENSE_TRACK, tier: 1, name: 'The Soul Laid Open',
    transfigured: 'Transfigured from [Outworlder] ability [Astral Blessing]. Catalyst: the soul scar left by Destruction\'s aura.',
    lines: ['Retains all effects of [Astral Blessing].',
      'A god\'s aura was laid on your soul and your soul held its shape. You can awaken one aura ability on each of your essences and on your confluence, up to four.',
      'Each aura you hold projects its own field and has its own switch.',
      'This is an aura effect.'],
    when: { scar: 'destruction', senseWant: 'aura' }, fx: { multiAura: true } },
  { id: 'scar_eyes', of: SCAR_SENSE_TRACK, tier: 1, name: 'Eyes Behind the Scar',
    transfigured: 'Transfigured from [Outworlder] ability [Astral Blessing]. Catalyst: the soul scar left by Destruction\'s aura.',
    lines: ['Retains all effects of [Astral Blessing].',
      'A god\'s aura was laid on your soul and your soul learned to see past it. You can awaken one perception ability on each of your essences and on your confluence, up to four.',
      'Each perception you hold senses on its own and has its own switch.',
      'This is a perception effect.'],
    when: { scar: 'destruction', senseWant: 'perception' }, fx: { multiPerception: true } },
];
for (const e of SCAR_SENSE_EVOS) { e.line = e.lines.slice(1, -1).join(' '); e.tag = e.lines[e.lines.length - 1]; NATURE_EVOLUTIONS.push(e); }

for (const [bid, pair] of Object.entries(BLESSING_EVOS)) {
  pair.forEach(([name, line], i) => {
    const tier = i + 1;
    const favoured = bid === 'nameless' ? {} : { favoured: tier === 1 ? 0.2 : 0.2 };
    NATURE_EVOLUTIONS.push({
      id: `blessing_${bid}_${tier}`, of: 'outworlder.blessing', tier, name, line,
      when: { blessing: bid, kitComplete: true },
      fx: { effect: favoured, cdCut: tier === 2 && bid !== 'nameless' ? { favoured: 0.15 } : {}, ...BLESSING_EXTRA[bid][i] },
    });
  });
}

// The human Essence Gifts (6.11): "evolves when new Essence is bound on Human".
// Gift N wakes with the Nth essence bound; it is the one evolution that needs no
// stress, because the user wrote its trigger.
//
// ROUND 362 -- "Examples of canon human essence gifts for better generation."
// Canon gifts are not "+5% to that essence": each is TRANSFIGURED into a named
// ability that is about the essence -- Gourmet & Gourmand from Feast, Wing Raider
// from Wing, Unstoppable from Might or Magic, The Price of Power from Trap, Face
// in the Crowd from Charlatan, Dragon Blood from Dragon. Those six are written
// out below (abridged into the game's terms; the canon wording is kept in
// `canon`). Every other essence takes its FAMILY's transfiguration, named for the
// essence. `fx` stays additive, as round 361 ruled: no gift takes a feature away.
export const ESSENCE_GIFT_EFFECT = 0.05;
export const CANON_ESSENCE_GIFTS = {
  essFeast: { name: 'Gourmet & Gourmand', line: 'Your senses of taste and smell are sharpened. You hold one more magical food effect without harm, and you process a potion’s remnant magic faster, so the next of the same kind is safe sooner.',
    fx: { potionCdCut: 0.25, extraFood: 1 }, canon: 'Gourmet & Gourmand (Feast)' },
  essWing: { name: 'Wing Raider', line: 'Movement-type special attacks are faster and hit harder. Heavy conjured weapons and armour cost no extra stamina and do not slow your movement abilities.',
    fx: { effect: { movement: 0.15 }, move: 0.03, conjuredLight: true }, canon: 'Wing Raider (Wing)' },
  might: { name: 'Unstoppable', line: 'Your movement cannot be impaired: slows, roots and pins do not take hold of you. Movement abilities are stronger.',
    fx: { effect: { movement: 0.1, special: 0.05 }, moveUnimpeded: true }, canon: 'Unstoppable (Might or Magic)' },
  essMagic: { name: 'Unstoppable', line: 'Your movement cannot be impaired: slows, roots and pins do not take hold of you. Movement abilities are stronger.',
    fx: { effect: { movement: 0.1, spell: 0.05 }, moveUnimpeded: true }, canon: 'Unstoppable (Might or Magic)' },
  essTrap: { name: 'The Price of Power', line: 'A curse rides your blows: whoever carries it takes disruptive-force damage each time they attack.',
    fx: { effect: { 'essence:essTrap': 0.1 }, priceOfPower: true }, canon: 'The Price of Power (Trap)' },
  essCharlatan: { name: 'Face in the Crowd', line: 'Your aura blends into the auras around you: enemies, even those of a higher rank, notice you only from closer.',
    fx: { auraHidden: 0.5 }, canon: 'Face in the Crowd (Charlatan)' },
  essDragon: { name: 'Dragon Blood', line: 'Your Power and Spirit attributes are enhanced, for a moderate cost in mana every second.',
    fx: { attr: { power: 1, spirit: 1 }, manaUpkeep: 1 }, canon: 'Dragon Blood (Dragon)' },
};
/** The family transfigurations: `{E}` is the essence's name. */
export const FAMILY_ESSENCE_GIFTS = {
  fire:      { name: '{E}heart', line: 'Fire lives in you now. Your fire abilities burn hotter, and heat troubles you less.', fx: { resist: { fire: 0.08 } } },
  cold:      { name: 'Winterblood', line: 'The cold has made itself at home. Your {E} abilities bite deeper, and frost finds little purchase on you.', fx: { resist: { frost: 0.08 } } },
  storm:     { name: 'Stormcaller’s Nerve', line: 'Lightning answers faster. Your {E} abilities strike harder, and shocks slide off you.', fx: { resist: { lightning: 0.08 } } },
  air:       { name: 'Windward', line: 'You move with the wind behind you. Movement abilities are stronger and you are a little quicker.', fx: { effect: { movement: 0.08 }, move: 0.02 } },
  water:     { name: 'Tidesense', line: 'You feel the pull of water. Your {E} abilities flow further, and you heal a little more from every source.', fx: { healTaken: 0.05 } },
  aquatic:   { name: 'Deepwater Born', line: 'The sea is in your lungs. Your {E} abilities strike harder, and you heal a little more from every source.', fx: { healTaken: 0.05 } },
  earth:     { name: 'Bedrock', line: 'Stand on the ground and the ground stands with you. Blows land a little lighter.', fx: { guard: 0.03 } },
  life:      { name: 'Evergreen', line: 'Life clings to you. Heals you give and receive are stronger.', fx: { effect: { heal: 0.08 }, healTaken: 0.08 } },
  light:     { name: 'Lightbearer', line: 'Light gathers where you stand. Your {E} abilities shine brighter, and radiant force troubles you less.', fx: { resist: { radiant: 0.08 } } },
  dark:      { name: 'Shadowkin', line: 'The dark knows your name. Your {E} abilities strike from deeper shadow, and darkness troubles you less.', fx: { resist: { shadow: 0.08 } } },
  death:     { name: 'Gravewise', line: 'You have looked at death and it looked away first. Afflictions on you are weaker and shorter.', fx: { afflictCut: 0.1 } },
  blood:     { name: 'Iron in the Blood', line: 'Your blood answers you. You heal a little more from every source.', fx: { healTaken: 0.08 } },
  blade:     { name: '{E} Born', line: 'The blade is an extension of you now. Special attacks strike harder.', fx: { effect: { special: 0.08 } } },
  bludgeon:  { name: '{E} Born', line: 'Heavy things are light in your hands. Special attacks strike harder.', fx: { effect: { special: 0.08 } } },
  polearm:   { name: '{E} Born', line: 'Reach is a habit now. Special attacks strike harder.', fx: { effect: { special: 0.08 } } },
  ranged:    { name: 'Deadeye', line: 'You see the shot before you take it. Special attacks strike harder, and you see where a target’s hide is thin: the target frame shows its hide.', fx: { effect: { special: 0.08 }, readHide: true } },   // ROUND 385
  force:     { name: 'Unbending', line: 'Nothing moves you that you do not allow. Movement abilities cannot be easily stopped.', fx: { effect: { movement: 0.05 }, moveUnimpeded: true } },
  guard:     { name: 'Living Wall', line: 'You were made to be stood behind. Blows land lighter on you.', fx: { guard: 0.04 } },
  beast:     { name: 'Pack Instinct', line: 'The beast in you knows its people. Buffs you give and receive are stronger.', fx: { effect: { buff: 0.08 } } },
  smallbeast:{ name: 'Quick Little Heart', line: 'Small and fast and hard to catch. You are a little quicker.', fx: { move: 0.04 } },
  flyer:     { name: 'Skyborn', line: 'Your feet are only on the ground by choice. Movement abilities are stronger.', fx: { effect: { movement: 0.1 } } },
  serpent:   { name: 'Cold Blood', line: 'Venom is a language you speak. Afflictions you lay are stronger, and those laid on you weaker.', fx: { dmg: { dot: 0.08 }, afflictCut: 0.05 } },
  space:     { name: 'Wider Than It Looks', line: 'Space bends a little around you. Your {E} abilities reach further and hit harder.', fx: {} },
  mind:      { name: 'Clear Mind', line: 'Your thoughts are your own. Minds that reach for yours slide off.', fx: { mindResist: 0.25 } },
  order:     { name: 'Harmonious', line: 'Everything you do is a little more in tune. Buffs you give and receive are stronger.', fx: { effect: { buff: 0.08 } } },
  motion:    { name: 'Never Still', line: 'Movement is your native tongue. Movement abilities are stronger and you are a little quicker.', fx: { effect: { movement: 0.08 }, move: 0.02 } },
  craft:     { name: 'Maker’s Hands', line: 'What you make, you make well. Your {E} abilities work a little better, and you can tell how a creature is put together: the target frame shows its hide.', fx: { readHide: true } },   // ROUND 385
  identity:  { name: 'Many Faces', line: 'Who you are is a matter of choice. Your aura blends into those around you.', fx: { auraHidden: 0.25 } },
  alchemy:   { name: 'Iron Stomach', line: 'Potions sit easy. You process a potion’s remnant magic faster.', fx: { potionCdCut: 0.15 } },
};
/** The fourth gift, if the fourth essence bound is the confluence of the three. */
export const CONFLUENCE_GIFT = { name: 'Confluent Soul', line: 'The three essences run together in you like one river. The abilities of your {E} confluence have increased effect, and so do the others, a little.', fx: { effect: { spell: 0.03, special: 0.03 } } };
export function essenceGiftEvolution(index, essence) {
  if (!essence || !essence.id) return null;
  const canon = CANON_ESSENCE_GIFTS[essence.id];
  const fam = FAMILY_ESSENCE_GIFTS[essence.family] || null;
  const conf = essence.id === 'confluence' || essence.confluence;
  const tpl = canon || (conf ? CONFLUENCE_GIFT : null) || fam || { name: 'Gift of {E}', line: 'The gift took the shape of {E}: its abilities have increased effect.', fx: {} };
  const E = essence.name || essence.id;
  // two essences of one family must not wake the same gift twice: the second of a family is its "Child of" form
  const nameTpl = (!canon && !conf && fam && index % 2 === 1) ? 'Child of {E}' : tpl.name;
  const fx = { ...tpl.fx, effect: { ...(tpl.fx.effect || {}), [`essence:${essence.id}`]: ESSENCE_GIFT_EFFECT } };
  // ROUND 388 -- "the human gift adaptation for a relevant essence such as magic or eye (aura and perception
  // respectively)". The gift's own transfiguration (a canon one included) is kept as written; the adaptation is a
  // sentence of its own after it, and a flag the kit generator reads (senseAllowance.js).
  let adapt = '';
  if (AURA_GIFT_ESSENCES.includes(essence.id)) {
    fx.multiAura = true;
    adapt = ` Adapted to ${E}: you can awaken one aura ability on each of your essences, up to four.`;
  } else if (PERCEPTION_GIFT_ESSENCES.includes(essence.id)) {
    fx.multiPerception = true;
    adapt = ` Adapted to ${E}: you can awaken one perception ability on each of your essences, up to four.`;
  }
  return {
    id: `gift${index + 1}_${essence.id}`, of: `human.gift${index + 1}`, tier: 1,
    name: nameTpl.split('{E}').join(E),
    line: `Transfigured from Human ability Essence Gift. ${tpl.line.split('{E}').join(E)}${adapt}`,
    canon: !!canon, when: { essence: essence.id }, fx,
  };
}

// ROUND 362 -- THE ACHIEVEMENTS THAT GIVE A NATURE GIFT EVOLUTION (the user's three), as quest rewards.
export const NATURE_ACHIEVEMENTS = {
  olb: { source: 'reward', toast: 'What you lived through in the Seam is written into you.' },
  killAbove: { solo: 1, team: 2, source: 'reward', toast: 'You killed something that should have killed you.' },
  brink: { hpFrac: 0.01, quietS: 8, source: 'near death', toast: 'One breath from the end, and you held.' },
  story: { source: 'reward' },   // ROUND 367 -- the character-defining story moments, below
};

// ===== ROUND 367 -- "Major high stakes story quests, such as Olb's sacrifice. It has to be a character defining moment
// to trigger a nature gift evolution." Each is once per character, and each is a quest reward: it evolves something now,
// or waits until something can (the blessing still evolves first, once the kit is complete). Olb's sacrifice is
// NATURE_ACHIEVEMENTS.olb above. (Round 368: climbing out of the sewer was dropped at the user's word.) Side quests, contracts, repeatable fights and conversations never count.
export const NATURE_STORY_MOMENTS = {
  div_confront:  { title: 'The Breakthrough', toast: 'The Division broke against you, and the Nek is still standing.' },
  div3_overseer: { title: 'The Overseer', toast: 'The Overseer\'s works are ash, and you are the one who burned them.' },
  div4_rory:     { title: 'The Breakthrough, Kept', toast: 'Rory Matheson is dead. You will carry that.' },
  div4_child:    { title: 'The Back Room', toast: 'You carried the child out of the back room. The gods are watching now.' },
  div4h_mouth:   { title: 'What Did The Telling', toast: 'The telling is answered. Whoever you were before it, you are not now.' },
  godBond:       { title: 'Bonded to a god', toast: 'A god\'s essence sits where your confluence was. There is no going back.' },
  surge:         { title: 'The surge ends', toast: 'The surge is over. What you held, and what you lost, is written into you.' },
  outlaw:        { title: 'Struck off', toast: 'Struck from the Society and hunted. You chose this road.' },
  petition:      { title: 'Pardoned', toast: 'The record is answered and you are taken back. You chose to come home.' },
};
export const NATURE_STORY_STAGES = ['div_confront', 'div3_overseer', 'div4_rory', 'div4_child', 'div4h_mouth'];

// ROUND 362 -- DRAGON BREATH: "a conic breath attack that's damage is determined by the absorbed essences".
// The first essence's family sets the element; each essence absorbed adds a share.
const BREATH_ELEMENT = { fire: 'fire', cold: 'frost', storm: 'lightning', air: 'lightning', water: 'frost', aquatic: 'frost',
  earth: 'nature', life: 'nature', light: 'radiant', dark: 'shadow', death: 'shadow', blood: 'shadow', serpent: 'nature', space: 'radiant', mind: 'radiant' };
const BREATH_COLOR = { fire: '#ff7043', frost: '#81d4fa', lightning: '#4dd0e1', nature: '#9ccc65', radiant: '#ffe082', shadow: '#9575cd', physical: '#bcaaa4' };
export function breathElementFor(essences, catalog) {
  for (const id of (essences || [])) { const f = catalog && catalog[id] && catalog[id].family; if (f && BREATH_ELEMENT[f]) return BREATH_ELEMENT[f]; }
  return 'fire';
}
export function breathPlan(essences, catalog) {
  const n = (essences || []).filter(Boolean).length;
  const element = breathElementFor(essences, catalog);
  return { element, color: BREATH_COLOR[element] || '#ff7043', frac: 0.06 + 0.03 * n, range: 150 + 12 * n, halfArc: Math.PI / 6 };
}

export const evolutionById = (id) => NATURE_EVOLUTIONS.find(e => e.id === id) || null;
export const evolutionsOf = (ref) => NATURE_EVOLUTIONS.filter(e => e.of === ref);

// ============================================================================
// THE TRIGGER.
//
// Stress is near death in a fight or the soul running dry. Each counts once
// per STRESS_GAP_S, so one bad fight is one roll, not thirty. A tier-2 needs
// STRESS_FOR_SECOND stresses survived since the tier-1, and rolls far lower.
// ============================================================================
export const NATURE_STRESS = {
  hpBelow: 0.15,        // health under this, in a fight
  soulBelow: 0.1,       // soul under this fraction of its maximum
  gapS: 120,            // one stress roll per this many seconds
  chance1: 0.25,        // a first evolution, per stress, when one is eligible
  chance2: 0.05,        // a second
  stressForSecond: 5,   // stresses survived since the first before a second can roll
};

/** Can this evolution wake for `st`? st = { natureId, blessing, kitComplete, essences:[ids], families:[f], have:{ref:[evoIds]} } */
export function evolutionEligible(evo, st) {
  if (!evo || !st) return false;
  const [nid] = evo.of.split('.');
  if (nid !== st.natureId) return false;
  // ROUND 388 -- the soul scar's: a scar from this source, and the kind the kit wants (aura unless told otherwise)
  if (evo.when && evo.when.scar && !(st.scars || []).includes(evo.when.scar)) return false;
  if (evo.when && evo.when.senseWant && evo.when.senseWant !== (st.senseWant || 'aura')) return false;
  const have = (st.have && st.have[evo.of]) || [];
  if (have.includes(evo.id)) return false;
  if (have.length !== evo.tier - 1) return false;   // tier 1 first, then tier 2, one at a time
  const w = evo.when || {};
  if (w.blessing && st.blessing !== w.blessing) return false;
  if (w.kitComplete && !st.kitComplete) return false;
  if (w.essence && !(st.essences || []).includes(w.essence)) return false;
  if (w.family && !(st.families || []).includes(w.family)) return false;
  return true;
}

/** Every evolution that could wake now, lowest tier first. */
export function eligibleEvolutions(st) {
  // ROUND 365 -- plus the catalogue's (`st.extra`, built by catalogueCandidates): the other five Outworlder abilities
  return [...NATURE_EVOLUTIONS.filter(e => evolutionEligible(e, st)), ...((st && st.extra) || [])].sort((a, b) => a.tier - b.tier);
}

/** One stress roll. `rng()` in [0,1). Returns the evolution that woke, or null. */
export function rollStressEvolution(st, rng, stressSince = 0) {
  const list = eligibleEvolutions(st);
  if (!list.length) return null;
  const e = list[0];
  if (e.tier >= 2 && stressSince < NATURE_STRESS.stressForSecond) return null;
  const p = e.tier >= 2 ? NATURE_STRESS.chance2 : NATURE_STRESS.chance1;
  return rng() < p ? e : null;
}

// ============================================================================
// SUMMING.
// ============================================================================
const addInto = (out, fx, k = 1) => {
  for (const [key, v] of Object.entries(fx || {})) {
    if (v && typeof v === 'object') {
      out[key] = out[key] || {};
      for (const [t, n] of Object.entries(v)) out[key][t] = (out[key][t] || 0) + n * k;
    } else if (typeof v === 'number') out[key] = (out[key] || 0) + v * k;
    else if (v === true) out[key] = true;
  }
  return out;
};

/** A nature's whole effect: its six abilities plus the evolutions it holds.
 *  `evos` is a list of evolution objects (static ones by id, gifts built). `amp` scales every number (Child of the Celestial Wind). */
export function natureFxOf(natureId, evos = [], amp = 1, who = null) {
  const N = NATURES[natureId];
  const out = {};
  if (!N) return out;
  for (const a of natureAbilitiesFor(natureId, who)) addInto(out, a.fx, amp);
  for (const e of evos) if (e) addInto(out, e.fx, amp);
  return out;
}

// ===== ROUND 368 -- "Ranking up to silver should change x1 affinity that doesn't match a players or characters essences
// to match. i.e. nature affinity changing to fire affinity for an elf character with the fire essence."
//
// The element affinities are Nature (elf), Holy and Astral (celestine). At Silver, ONE of them that none of the
// character's essences answers to becomes the affinity of the first of their essences that has an element and is not
// already answered by another affinity. Life and Magic Affinity are not elements and never change. `who` is
// { essences: [ids], rank: 'silver' | index }; without it (or below Silver) the nature reads as written.
export const AFFINITY_ELEMENT = { natureAff: 'nature', holyAff: 'radiant', astralAff: 'dimension' };
export const FAMILY_ELEMENT_OF = { fire: 'fire', cold: 'frost', water: 'frost', aquatic: 'frost', storm: 'lightning', air: 'lightning',
  life: 'nature', earth: 'nature', serpent: 'nature', light: 'radiant', dark: 'shadow', death: 'shadow', blood: 'shadow', space: 'dimension' };
const ELEMENT_WORD = { fire: 'Fire', frost: 'Frost', lightning: 'Lightning', nature: 'Nature', radiant: 'Holy', shadow: 'Shadow', dimension: 'Astral' };
const ELEMENT_TAG = { nature: 'nature', radiant: 'holy', dimension: 'dimension' };
export const elementTagOf = (el) => ELEMENT_TAG[el] || `el:${el}`;
const SILVER = 3;   // RANK_ORDER index
let essenceFamilyOf = () => null;
/** natureMixin hands this the essence catalogue (natures.js stays free of it). */
export function setAffinityCatalog(catalog) { essenceFamilyOf = (id) => (catalog && catalog[id] && catalog[id].family) || null; }
const RANK_NAMES = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];

/** The one affinity a character has turned at Silver, or null: { from: ability id, to: element }. */
export function affinityShift(natureId, who) {
  const N = NATURES[natureId];
  if (!N || !who) return null;
  const rank = typeof who.rank === 'number' ? who.rank : RANK_NAMES.indexOf(who.rank || 'normal');
  if (!(rank >= SILVER)) return null;
  const els = [];
  for (const id of (who.essences || []).filter(Boolean)) {
    const fam = who.families && who.families[id] ? who.families[id] : essenceFamilyOf(id);
    const el = FAMILY_ELEMENT_OF[fam];
    if (el && !els.includes(el)) els.push(el);
  }
  if (!els.length) return null;
  const affs = N.abilities.filter(a => AFFINITY_ELEMENT[a.id]);
  const held = new Set(affs.map(a => AFFINITY_ELEMENT[a.id]));
  const off = affs.find(a => !els.includes(AFFINITY_ELEMENT[a.id]));
  if (!off) return null;
  const to = els.find(el => !held.has(el));
  return to ? { from: off.id, to } : null;
}

/** An affinity for `el`, in the shape the nature's own are written. */
export function affinityAbility(el, from) {
  const w = ELEMENT_WORD[el] || el, tag = elementTagOf(el), lw = w.toLowerCase();
  return { id: from, name: `${w} Affinity`, line: `Increased resistance to ${lw} effects; ${lw} abilities have increased effect and ${lw} damage is increased.`,
    fx: { resist: { [el]: 0.1 }, effect: { [tag]: 0.1 }, dmg: { [tag]: 0.1 } }, turnedAtSilver: true, element: el };
}

/** A nature's six as this character holds them: the Silver affinity shift applied. */
export function natureAbilitiesFor(natureId, who = null) {
  const N = NATURES[natureId];
  if (!N) return [];
  const sh = affinityShift(natureId, who);
  if (!sh) return N.abilities;
  return N.abilities.map(a => (a.id === sh.from ? { ...affinityAbility(sh.to, a.id), was: a.name } : a));
}

/** Resolve the ids a character holds into evolution objects (gifts are built from their essence). */
export function resolveEvolutions(have, catalog = null, recs = null) {
  const out = [];
  for (const [ref, ids] of Object.entries(have || {})) {
    for (const id of (ids || [])) {
      // ROUND 365 -- an evolution from the catalogue (or a blessing evolution dressed by it) is recorded on the
      // character when it wakes, so it resolves without the catalogue loaded
      const rec = recs && recs[id];
      if (rec) { out.push(rec); continue; }
      const e = evolutionById(id);
      if (e) { out.push(e); continue; }
      const m = /^gift(\d)_(.+)$/.exec(id);
      if (m && catalog && catalog[m[2]]) out.push(essenceGiftEvolution(Number(m[1]) - 1, { id: m[2], ...catalog[m[2]] }));
    }
  }
  return out;
}

// What an ability IS, for the effect and damage tags. `roles` is abilityRoles'
// answer; `ess` the essence it came from ({ id, family }).
const NATURE_FAMILY_ESSENCES = new Set(['essBrush', 'essFungus', 'essGrowth', 'essPlant', 'essTree', 'essWood']);
export function natureTagsOf(a, roles, ess = null, attackKind = null, favoured = false) {
  const t = new Set();
  if (!a) return t;
  const r = roles || {};
  if (attackKind === 'spell') t.add('spell');
  if (attackKind === 'special') t.add('special');
  if (r.healing || r.hot) t.add('heal');
  if (r.buff) t.add('buff');
  if (r.movement) t.add('movement');   // ROUND 362 -- Wing Raider, Unstoppable
  if (r.summoning) t.add('summon');
  if (r.dot) t.add('dot');
  if (a.template === 'dispelOne' || a.template === 'cleanseMass' || /dispel|cleanse/i.test(a.category || '')) t.add('dispel');
  const el = a.element || '';
  if (el === 'nature' || (ess && NATURE_FAMILY_ESSENCES.has(ess.id))) t.add('nature');
  if (el === 'life' || r.healing || r.hot || (ess && ess.family === 'life')) t.add('life');
  if (el === 'radiant' || el === 'light' || (ess && ess.family === 'light')) t.add('holy');
  if ((ess && ess.family === 'space') || el === 'dimension') t.add('dimension');   // ROUND 366 -- and the damage type
  if (el === 'transcendent') t.add('transcendent');
  // ROUND 368 -- an element, for an affinity turned at Silver: the ability's own element, or its essence's
  if (el) t.add(`el:${el}`);
  if (ess && FAMILY_ELEMENT_OF[ess.family]) t.add(`el:${FAMILY_ELEMENT_OF[ess.family]}`);
  if (ess && ess.id) t.add(`essence:${ess.id}`);
  if (favoured) t.add('favoured');
  return t;
}

/** The effect multiplier and cooldown cut for one ability under `fx`. */
export function natureAbilityMult(fx, tags) {
  let k = 0, cd = 0;
  for (const tag of tags) {
    k += (fx.effect && fx.effect[tag]) || 0;
    k += (fx.dmg && fx.dmg[tag]) || 0;
    cd += (fx.cdCut && fx.cdCut[tag]) || 0;
  }
  return { k: 1 + k, cd: Math.min(0.4, cd) };
}

/** Resist keys a nature names that the game has no resist stat for are folded
 *  onto the nearest one that exists. */
export const RESIST_FOLD = { holy: 'radiant', light: 'radiant', plant: 'nature', earth: 'nature', poison: 'nature', ice: 'frost', water: 'frost', wind: 'lightning' };
export const RESIST_STATS = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];

// ============================================================================
// SELF-CHECK.
// ============================================================================
/** The fx keys a reader exists for (natureMixin.js / WorldScene). Anything else is data only, and says so. */
export const NATURE_FX_WIRED = ['awaken', 'effect', 'dmg', 'resist', 'attr', 'loot', 'cdCut', 'move', 'guard', 'oneHandTwoHanders',
  'meleePerEssence', 'findMult', 'essenceXp',
  // ROUND 362 -- the five the user asked to be built, and the gifts' own
  'manaUpkeepCut', 'manaDrainResist', 'afflictResist', 'afflictCut', 'mindResist', 'healTaken', 'breath',
  // ROUND 363 -- the runic and leonid six
  'spellToMana', 'maxManaPct', 'adaptiveResist', 'manaRestore', 'maxStaminaPct', 'sprintSpeed', 'sprintCostCut', 'roar',
  // ROUND 366 -- the ten nature fixes
  'manaRegen', 'dodge', 'potionCdCut', 'extraFood', 'conjuredLight', 'moveUnimpeded', 'priceOfPower', 'auraHidden', 'manaUpkeep', 'dispelExtra', 'perception',
  // ROUND 385 -- a creature read (combatReads.js), read by natureMixin `_natureApplyMods`
  'readHide', 'readResist', 'readWeak',
  // ROUND 388 -- one aura / perception on each essence: read by the kit rebuild (senseCapMixin `_senseAllowance`)
  'multiAura', 'multiPerception'];

export function natureFaults() {
  const f = [];
  for (const [id, N] of Object.entries(NATURES)) {
    if (N.abilities.length !== NATURE_ABILITY_COUNT) f.push(`${id} has ${N.abilities.length} abilities, not six`);
    const ids = new Set();
    for (const a of N.abilities) {
      if (ids.has(a.id)) f.push(`${id}.${a.id} twice`);
      ids.add(a.id);
      if (!a.name || !a.line) f.push(`${id}.${a.id} unnamed`);
      if (/racial/i.test(a.name + a.line)) f.push(`${id}.${a.id} says racial`);
    }
  }
  for (const e of NATURE_EVOLUTIONS) {
    if (!natureAbility(e.of)) f.push(`${e.id} evolves nothing (${e.of})`);
    if (e.tier === 2 && !NATURE_EVOLUTIONS.some(x => x.of === e.of && x.tier === 1 && x.when.blessing === e.when.blessing)) f.push(`${e.id} has no first tier`);
    for (const k of Object.keys(e.fx)) if (typeof e.fx[k] === 'number' && e.fx[k] < 0) f.push(`${e.id} takes something away (${k})`);
  }
  return f;
}


// ============================================================================
// ROUND 365 -- THE CATALOGUE. "Added a template for nature gift evolutions to be added in game": the user's
// 16 nature abilities x 249 essences and confluences, in public/assets/data/nature_evolutions.json (built by
// tools/build_nature_evolutions.py; 2.4 MB, fetched once, when the game is running).
//
//   WHICH EVOLVES, AND WHEN. The Astral Blessing first ("the first ability affected should be the astral
//   blessing"): its evolution is round 361's, still woken by stress or a reward once every essence ability has
//   awakened, and the catalogue gives it its name and its words. After it, each of the other five -- Mini Map,
//   Language Adaptation, Inventory, Loot Ability, Item Identification -- can evolve once, the same way.
//   THE CATALYST is one of the character's own essences or their confluence ("most often they tie in with a
//   character's essences"), drawn per ability and per run, so two runs with the same build can differ.
//   WHAT IT DOES. The words are the user's, shown in full. The catalogue holds no numbers (on purpose, so they can
//   be tuned here): what each one ADDS in play is read from its closing tag ("This is a fire and conjuration
//   effect.") through CATALOGUE_TAG_FX, plus a small increased effect for the catalyst essence's abilities. The
//   bespoke mechanics each entry describes (a pyre on a looted corpse, a tactical map) are not built yet.
// ============================================================================
export const CATALOGUE_URL = './public/assets/data/nature_evolutions.json';
export const CATALOGUE_SPECS_URL = './public/assets/data/nature_evolution_specs.json';   // ROUND 366
export const CATALOGUE_REFS = ['outworlder.minimap', 'outworlder.language', 'outworlder.inventory', 'outworlder.loot', 'outworlder.identify'];

/** A tag word -> what it adds. Additive, small; several words stack. */
export const CATALOGUE_TAG_FX = {
  fire: { resist: { fire: 0.04 } }, flame: { resist: { fire: 0.04 } }, burn: { dmg: { dot: 0.03 } },
  frost: { resist: { frost: 0.04 } }, ice: { resist: { frost: 0.04 } }, cold: { resist: { frost: 0.04 } }, water: { resist: { frost: 0.03 } },
  lightning: { resist: { lightning: 0.04 } }, storm: { resist: { lightning: 0.04 } }, wind: { move: 0.01 },
  nature: { resist: { nature: 0.04 } }, growth: { effect: { heal: 0.03 } }, poison: { dmg: { dot: 0.04 } },
  shadow: { resist: { shadow: 0.04 } }, darkness: { resist: { shadow: 0.04 } }, necromantic: { resist: { shadow: 0.03 } }, death: { resist: { shadow: 0.03 } },
  light: { resist: { radiant: 0.04 } }, holy: { resist: { radiant: 0.04 } }, radiant: { resist: { radiant: 0.04 } }, purification: { afflictCut: 0.05 },
  affliction: { dmg: { dot: 0.04 } }, curse: { dmg: { dot: 0.03 } },
  movement: { move: 0.02, effect: { movement: 0.04 } }, momentum: { move: 0.02 }, haste: { move: 0.02 }, flight: { effect: { movement: 0.04 } }, travel: { move: 0.02 },
  evasion: { guard: 0.01 }, stealth: { move: 0.01 },
  defensive: { guard: 0.02 }, protection: { guard: 0.02 }, warding: { guard: 0.02 }, barrier: { guard: 0.02 }, shield: { guard: 0.02 }, salvage: { guard: 0.01 },
  healing: { effect: { heal: 0.05 }, healTaken: 0.03 }, restoration: { effect: { heal: 0.04 } }, rebirth: { healTaken: 0.04 },
  summoning: { effect: { summon: 0.05 } }, conjuration: { effect: { summon: 0.03 } }, animation: { effect: { summon: 0.03 } }, command: { effect: { summon: 0.03 } }, swarm: { effect: { summon: 0.03 } },
  support: { effect: { buff: 0.04 } }, sound: { effect: { buff: 0.02 } }, resonance: { effect: { buff: 0.02 } }, mastery: { effect: { special: 0.03, spell: 0.03 } },
  area: { effect: { spell: 0.02 } }, annihilation: { effect: { spell: 0.03 } },
  time: { cdCut: { favoured: 0.03 } }, precognition: { guard: 0.01 },
  tracking: { perception: 0.08 }, hunting: { perception: 0.05 }, perception: { perception: 0.08 }, revelation: { perception: 0.05 }, detection: { perception: 0.08 },
  harvest: { loot: 0.02 }, harvesting: { loot: 0.02 }, alchemy: { loot: 0.01 }, transmutation: { loot: 0.01 }, salvaging: { loot: 0.01 },
  transformation: { effect: { special: 0.03 } }, binding: { effect: { spell: 0.02 } }, restraint: { effect: { spell: 0.02 } },
};
export function catalogueTagFx(tag) {
  const out = {};
  const words = String(tag || '').toLowerCase().replace(/^this is an? /, '').replace(/ effects?\.?$/, '').split(/[^a-z]+/);
  for (const w of words) {
    const fx = CATALOGUE_TAG_FX[w];
    if (!fx) continue;
    for (const [k, v] of Object.entries(fx)) {
      if (v && typeof v === 'object') { out[k] = out[k] || {}; for (const [t, n] of Object.entries(v)) out[k][t] = (out[k][t] || 0) + n; }
      else out[k] = (out[k] || 0) + v;
    }
  }
  return out;
}

const slugOf = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** The evolution object for a catalogue entry. `catalystId` is the essence id (null for a confluence). */
export function catalogueEvolution(ref, entry, catalystId, tier = 1, baseFx = {}, spec = null) {
  // ROUND 366 -- an entry with a written spec (nature_evolution_specs.json) does what its spec says: its passive
  // nature keys join the fx and its rules run in evoMixin. Without one, the round-365 tag bonus stands in.
  const fx = spec ? natureKeysOf(spec.passive) : catalogueTagFx(entry.tag);
  for (const [k, v] of Object.entries(baseFx || {})) {
    if (v && typeof v === 'object') { fx[k] = fx[k] || {}; for (const [t, n] of Object.entries(v)) fx[k][t] = (fx[k][t] || 0) + n; }
    else if (typeof v === 'number') fx[k] = (fx[k] || 0) + v;
    else if (v === true) fx[k] = true;
  }
  if (!spec) fx.effect = { ...(fx.effect || {}), ...(catalystId ? { [`essence:${catalystId}`]: ((fx.effect || {})[`essence:${catalystId}`] || 0) + ESSENCE_GIFT_EFFECT } : { spell: ((fx.effect || {}).spell || 0) + 0.03 }) };
  return {
    id: `cat|${ref}|${slugOf(entry.name)}`, of: ref.split('@')[0], tier, name: entry.name,
    line: entry.lines.join(' '), lines: entry.lines, transfigured: entry.transfigured, catalyst: entry.catalyst,
    catalogue: true, when: {}, fx, spec: spec || null, specKey: specKeyOf(ref, entry.catalyst),
  };
}

/** The key a spec is filed under in nature_evolution_specs.json. */
export function specKeyOf(ref, catalyst) { return `${ref}|${String(catalyst).toLowerCase()}`; }

/** The nature fx keys of a spec's passive block (the engine's own passives stay with the spec). */
const NATURE_PASSIVE = new Set(['awaken', 'effect', 'dmg', 'resist', 'attr', 'loot', 'cdCut', 'move', 'guard', 'perception', 'healTaken',
  'afflictResist', 'afflictCut', 'mindResist', 'manaRestore', 'manaRegen', 'dodge', 'potionCdCut', 'extraFood', 'findMult', 'auraHidden', 'dispelExtra']);
export function natureKeysOf(passive) {
  const out = {};
  for (const [k, v] of Object.entries(passive || {})) if (NATURE_PASSIVE.has(k)) out[k] = (v && typeof v === 'object') ? { ...v } : v;
  return out;
}

/** The character's catalysts, in their draw order for this ability and run: essence ids and the confluence. */
export function catalystsFor(st, ref, seed) {
  const list = [...(st.essences || []).map(id => ({ id, name: st.essenceNames ? st.essenceNames[id] : id })),
    ...(st.confluence ? [{ id: null, name: st.confluence }] : [])].filter(c => c.name);
  let h = 2166136261;
  for (const ch of `${seed}|${ref}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return list.map((c, i) => ({ c, k: (h + i * 2654435761) >>> 0 })).sort((a, b) => a.k - b.k).map(x => x.c);
}

/** The catalogue's entry for this ability and character: the first catalyst the catalogue has an entry for. */
export function catalogueEntryFor(cat, ref, st, seed) {
  const book = cat && cat.racials && cat.racials[ref];
  if (!book) return null;
  for (const c of catalystsFor(st, ref, seed)) {
    const e = book[String(c.name).toLowerCase()];
    if (e && !e.blocked) return { entry: e, catalystId: c.id };
  }
  return null;
}

/** What the catalogue can wake now: each of the other five, once the blessing has evolved. */
export function catalogueCandidates(st, cat, seed, specs = null) {
  if (!cat || !st || st.natureId !== 'outworlder') return [];
  const have = st.have || {};
  if (!((have['outworlder.blessing'] || []).length)) return [];   // the blessing first
  const out = [];
  for (const ref of CATALOGUE_REFS) {
    if ((have[ref] || []).length) continue;
    const hit = catalogueEntryFor(cat, ref, st, seed);
    if (hit) out.push(catalogueEvolution(ref, hit.entry, hit.catalystId, 1, {}, specs ? specs[specKeyOf(ref, hit.entry.catalyst)] || null : null));
  }
  return out;
}

// ============================================================================
// ROUND 386 -- THE COMPANION NATURES EVOLVE. "Start on creating evolutions" for the Elf, Celestine, Draconian, Runic and
// Leonid, as a full catalyst catalogue like the Outworlder's: every nature ability x 245 essences and confluences
// (public/assets/data/nature_evolutions_party.json, built by tools/build_party_evolutions.py from
// tools/evo_source/party/*.md). These natures belong to companions and adventurers; the player is always an Outworlder.
//
//   WHAT WAKES ONE (the user's two picks): nearly dying in a fight in your party (the player's own stress rule, per
//   companion), and a character-defining story moment, which evolves one outright or is banked until one can.
//   WHICH ABILITY. Any of the six not yet evolved, drawn per companion and run; each evolves once.
//   THE CATALYST. One of the companion's essences or their confluence, drawn the way the player's is (`catalystsFor`).
//   WHAT IT DOES. As the Outworlder catalogue does: the words are shown in full, and what each adds in play is read from
//   its closing tag (CATALOGUE_TAG_FX), plus a small increased effect for the catalyst essence's abilities.
// ============================================================================
export const PARTY_CATALOGUE_URL = './public/assets/data/nature_evolutions_party.json';
// ROUND 388 -- and Human (Human Ambition, Special Attack Aptitude: tools/evo_source/party/human-*.md).
export const PARTY_EVO_NATURES = ['human', 'elf', 'celestine', 'draconian', 'runic', 'leonid'];
/** Per companion: one stress roll per gap, at this chance, while their health is under this fraction in a fight. */
export const PARTY_STRESS = { hpBelow: NATURE_STRESS.hpBelow, gapS: NATURE_STRESS.gapS, chance: NATURE_STRESS.chance1 };

/** What a companion can wake now: [{ ref, entry, catalystId }] for each nature ability not yet evolved. `st` is
 *  { natureId, essences, essenceNames, confluence, have: { ref: true } }. */
export function partyEvoCandidates(cat, st, seed = 0) {
  if (!cat || !cat.natures || !st || !PARTY_EVO_NATURES.includes(st.natureId)) return [];
  const N = NATURES[st.natureId];
  const out = [];
  for (const a of N.abilities) {
    const ref = `${st.natureId}.${a.id}`;
    if (st.have && st.have[ref]) continue;
    const book = cat.natures[ref];
    if (!book) continue;
    for (const c of catalystsFor(st, ref, seed)) {
      const e = book[String(c.name).toLowerCase()];
      if (e) { out.push({ ref, entry: e, catalystId: c.id }); break; }
    }
  }
  return out;
}

/** Which of the candidates wakes: drawn on the companion, the run and how many they hold, so a reload rolls the same. */
export function pickPartyEvo(cands, key) {
  if (!cands || !cands.length) return null;
  let h = 2166136261;
  for (const ch of String(key)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return cands[h % cands.length];
}

/** A stored companion evolution ({ entry, catalystId }) as an evolution object -- needs no catalogue to resolve.
 *  ROUND 389 -- with its spec (nature_evolution_specs_party.json) it does what the spec says: the spec's nature keys
 *  are its fx and its rules run in scenes/partyEvoMixin.js. Without one, the tag bonus stands in as before. */
export function partyEvolution(ref, stored, spec = null) {
  if (!stored || !stored.entry) return null;
  const e = catalogueEvolution(ref, stored.entry, stored.catalystId || null, 1, {}, spec || null);
  return { ...e, party: true, how: stored.how || null };
}
/** ROUND 389 -- the companions' evolution specs: `{ v, specs: { "<nature>.<ability>|<catalyst lower>": spec } }`,
 *  written from tools/evo_source/party_specs/ by tools/build_party_specs.py, fetched once when a companion first needs one. */
export const PARTY_SPECS_URL = './public/assets/data/nature_evolution_specs_party.json';
