import { GENERATED_SIGNATURES } from './essenceSignatures.js';
// ROUND 16 -- per-essence SIGNATURE ability pools.
//
// The user's ask: "Lets ensure that the abilities granted by each essence
// stone are varied as well. Develop 12-16 abilities that may be generated
// by each base essence entirely thematically tied to the essence. These
// should have actual names not just the essence stone name."
//
// Before this round, an essence's own (innate, no-stone) ability was a
// single hardcoded spec named after the essence itself -- every Fire user
// ever got an ability literally called "Fire". Each essence now carries a
// pool of 16 named, thematically-tied abilities; the innate is CHOSEN from
// that pool (synergy-scored against the kit being built, exactly like a
// stone socket), and the same pool also feeds essence-signature candidates
// into every stone socket on that slot -- so what a given stone grants
// varies with WHICH essence it was socketed into, not just with the stone.
//
// Names: real HWFWM TTRPG "Skills"-sheet names wherever the sheet has one
// that fits the slot (Flame Lash, Dragon's Breath, Cauterize, Phoenix
// Resurgence, Groundbreaker, Unyielding Will, Champion's Rally, Fountain
// of Life, Cycle Watcher, Midnight Eyes, Path of Shadows, Punition, Avatar
// Strike, Radiant Whip...). Where the sheet only offered a placeholder
// built out of the essence's own name ("Avatar Boost", "Avatar Cloak",
// "Defensive Avatar Barrier") it is deliberately REPLACED with an authored
// name, because a name that is just the essence word is exactly what the
// user asked us to stop producing. The Dark essence has only five rows in
// the sheet, so eleven of its sixteen are authored in the sheet's voice.
//
// Shape of an entry:
//   name   -- the ability's actual name (unique within its essence)
//   catKey -- an ABILITY_CATEGORIES key from awakening.js; this is what
//             decides kind/category/template AND what keeps the aura,
//             perception and movement caps honest, since the signature
//             flows through the same generateCategoryAbility() machinery
//             every stone-granted ability does.
//   desc   -- essence-specific flavor, replacing the generic stone phrase
//   mech   -- optional explicit mechanic overrides (applied after the
//             generator fills in the balance-band numbers), used where the
//             name promises something specific: a maxHp passive must not
//             roll a crit passive just because the hash said so.
//
// Every catKey used here already exists and is already handled end-to-end
// by WorldScene's cast/passive dispatch -- this round adds no new template.

export const HAND_AUTHORED_SIGNATURES = {
  // -------------------------------------------------------------------
  // FIRE -- burn, pressure, and the ember that outlives the body.
  // -------------------------------------------------------------------
  fire: [
    { name: 'Flame Lash', catKey: 'ranged_damage',
      desc: 'A whip of fire uncoils across the gap and cracks against the target.' },
    { name: 'Fireburst', catKey: 'ranged_aoe',
      desc: 'A compressed knot of flame that bursts on contact and washes over everything beside it.' },
    { name: 'Burning Brand', catKey: 'ranged_dot',
      desc: 'Marks the target with a brand that keeps burning long after the strike lands.' },
    { name: "Dragon's Breath", catKey: 'self_active_aoe',
      desc: 'Exhales a roaring gout of fire, scouring every enemy in reach.' },
    { name: 'Final Ember', catKey: 'self_active_damage',
      desc: 'Feeds the last of the inner furnace into every strike -- brief, and merciless.' },
    { name: 'Self-Immolation', catKey: 'self_active_crit',
      desc: 'Sets your own blood alight; for a short while nothing you hit is hit gently.' },
    { name: 'Ashen Veil', catKey: 'self_active_immunity',
      desc: 'The body sublimates into drifting ash -- for a few seconds there is nothing solid left to wound.' },
    { name: 'Cauterize', catKey: 'self_active_heal',
      desc: 'Sears a wound shut. It costs something, and it works immediately.' },
    { name: 'Phoenix Resurgence', catKey: 'self_active_hot',
      desc: 'Fire runs backwards through the wound, rebuilding what it burned.' },
    { name: 'Ember Step', catKey: 'movement_dash',
      desc: 'Becomes a streak of embers and reforms a body-length ahead.' },
    { name: 'Blazing Aura', catKey: 'self_passive_aoe',
      desc: 'A standing corona of heat that blisters anything that comes close enough to matter.' },
    { name: 'Flare', catKey: 'perception',
      desc: 'Throws a light nothing can hide behind -- every living thing in the region stands lit.' },
    { name: 'Furnace Heart', catKey: 'self_passive_buff', mech: { buffKind: 'maxHp' },
      desc: 'The chest carries a furnace now. It burns hot, and it holds far more punishment.' },
    { name: 'Inferno Sword', catKey: 'summon_weapon',
      desc: 'Calls a blade with a core of white fire into your hand.' },
    { name: 'Flameguard Plate', catKey: 'summon_armor',
      desc: 'Plates of banked coal-light settle over you and drink the force from every blow.' },
    { name: 'Pyroclast Staff', catKey: 'summon_gear',
      desc: 'A rod of cooling magma that sharpens every killing strike you make.' },
  ],

  // -------------------------------------------------------------------
  // MIGHT -- mass, leverage, and refusing to move.
  // -------------------------------------------------------------------
  might: [
    { name: 'Groundbreaker', catKey: 'ranged_damage',
      desc: 'Drives force through the earth so it surfaces under the target.' },
    { name: 'Shockwave Slam', catKey: 'self_active_aoe',
      desc: 'Brings everything you have down on the ground; the ring of it knocks the wind out of a circle of enemies.' },
    { name: 'Weight of the World', catKey: 'ranged_dot',
      desc: 'Hangs an unbearable weight on the target that keeps grinding it down.' },
    { name: 'Strength of the Colossus', catKey: 'self_active_damage',
      desc: 'For half a minute your arms belong to something far larger than you.' },
    { name: 'Battle Surge', catKey: 'self_active_crit',
      desc: 'Everything slows into openings, and you take every one of them.' },
    { name: 'Unyielding Will', catKey: 'self_active_immunity',
      desc: 'You simply decline to be harmed. Physics is invited to argue about it later.' },
    { name: "Hero's Recovery", catKey: 'self_active_heal',
      desc: 'Sheer refusal drags the body back to its feet, wounds and all.' },
    { name: "Champion's Rally", catKey: 'self_active_hot',
      desc: 'A second wind that keeps arriving, mending you over several seconds.' },
    { name: 'Heavy Guard', catKey: 'self_active_absorb',
      desc: 'Sets your whole mass behind your guard; the next several blows land on that instead of on you.' },
    { name: 'Juggernaut Charge', catKey: 'movement_dash',
      desc: 'Starts moving and stops being negotiable, closing the gap in one shove.' },
    { name: "Giant's Step", catKey: 'movement_passive',
      desc: 'Your stride simply covers more ground than it should. It always will now.' },
    { name: 'Dominance Aura', catKey: 'self_passive_aoe',
      desc: 'Standing near you is its own injury -- presence alone grinds at anything close.' },
    { name: 'Colossal Presence', catKey: 'perception',
      desc: 'You feel the weight of every living thing around you, through walls and distance alike.' },
    { name: 'Armored Frame', catKey: 'self_passive_buff', mech: { buffKind: 'maxHp' },
      desc: 'Bone thickened, frame rebuilt. There is a great deal more of you to get through.' },
    { name: 'Mightblade Sword', catKey: 'summon_weapon',
      desc: 'Summons a blade far too heavy for anyone else to lift, and swings it like it is not.' },
    { name: 'Colossus Shield', catKey: 'summon_armor',
      desc: 'A tower of a shield answers your hand and takes the edge off everything that lands.' },
  ],

  // -------------------------------------------------------------------
  // RENEWAL (internal id `heal`) -- growth, seasons, and coming back.
  // -------------------------------------------------------------------
  heal: [
    { name: 'Life Bolt', catKey: 'ranged_damage',
      desc: 'Growth turned outward and sharpened -- it does to a body what it does to stone.' },
    { name: 'Verdant Strike', catKey: 'ranged_dot',
      desc: 'Seeds the wound with something that keeps growing where it was never meant to.' },
    { name: 'Purifying Bloom', catKey: 'ranged_aoe',
      desc: 'A flower opens where it lands, and everything nearby is caught in the bloom.' },
    { name: 'Flow of Seasons', catKey: 'self_active_timefreeze',
      desc: 'Runs a whole year through the space around you; caught inside it, nothing can move at all.' },
    { name: 'Cycle Infusion', catKey: 'self_active_damage',
      desc: 'Draws on the turn of the seasons to put real force behind every strike.' },
    { name: "Season's Blessing", catKey: 'self_active_crit',
      desc: 'Everything ripens at once -- for a short while every strike finds the soft place.' },
    { name: 'Palm Heal', catKey: 'self_active_heal',
      desc: 'A hand laid flat, and the wound simply closes under it.' },
    { name: 'Fountain of Life', catKey: 'self_active_hot',
      desc: 'Opens a spring inside the body that keeps running until the damage is gone.' },
    { name: 'Bloom Shield', catKey: 'self_active_absorb',
      desc: 'Petals unfold into a living barrier and take the damage in your place.' },
    { name: 'Green Sanctuary', catKey: 'self_active_immunity',
      desc: 'Growth closes over you completely; for a few seconds nothing physical reaches through.' },
    { name: "Spring's Breath", catKey: 'movement_haste_active',
      desc: 'The first warm wind of the year gets into your legs.' },
    { name: 'Aura of Renewal', catKey: 'self_passive_heal',
      desc: 'A standing field of quiet growth that keeps mending its bearer.' },
    { name: 'Cycle Watcher', catKey: 'perception',
      desc: 'You feel every living thing turning through its own cycle, wherever it stands.' },
    { name: 'Enduring Roots', catKey: 'self_passive_buff', mech: { buffKind: 'maxHp' },
      desc: 'Something has taken root in you. It does not come out, and it holds a great deal.' },
    { name: 'Sapling Companions', catKey: 'summon_bonded',
      desc: 'Raises a bonded sapling that walks with you and strikes what comes near.' },
    { name: 'Rooted Guardian', catKey: 'summon_armor',
      desc: 'Bark and heartwood close over you and blunt every blow taken.' },
  ],

  // -------------------------------------------------------------------
  // DARK (internal id `shadow`) -- ambush, concealment, the killing strike.
  // The sheet has only five Dark rows; the rest are authored in its voice.
  // -------------------------------------------------------------------
  shadow: [
    { name: 'Umbral Bolt', catKey: 'ranged_damage',
      desc: 'A thrown piece of the dark that arrives before the sound does.' },
    { name: 'Punition', catKey: 'ranged_aoe',
      desc: 'Judgement delivered from the shadow, and it does not land on one target only.' },
    { name: 'Creeping Gloom', catKey: 'ranged_dot',
      desc: 'Leaves a patch of dark inside the wound that keeps eating outward.' },
    { name: 'Nightfall', catKey: 'self_active_aoe',
      desc: 'Drops full night over everything around you, and night here has weight.' },
    { name: 'Cloak of Night', catKey: 'self_active_crit',
      desc: 'You are not quite where you appear to be -- for a short while every strike lands where it kills.' },
    { name: "Killer's Focus", catKey: 'self_active_damage',
      desc: 'Everything narrows to one target and the strength to end it.' },
    { name: 'Shroud of the Unseen', catKey: 'self_active_immunity',
      desc: 'You step half out of the world. For a few seconds nothing physical can find you to hurt.' },
    { name: 'Leeching Dark', catKey: 'self_active_heal',
      desc: 'Takes back what the dark has been holding for you, and closes the wound with it.' },
    { name: 'Blinding Surge', catKey: 'self_active_absorb',
      desc: 'A curtain of black snaps up and swallows the next several blows whole.' },
    { name: 'Path of Shadows', catKey: 'movement_teleport',
      desc: 'Steps into one shadow and out of another some distance away.' },
    { name: 'Shadow Step', catKey: 'movement_dash',
      desc: 'A single silent stride that covers ground it should not.' },
    { name: 'Umbral Aura', catKey: 'self_passive_aoe',
      desc: 'A standing pool of dark around you that quietly wears down whatever stands in it.' },
    { name: 'Midnight Eyes', catKey: 'perception',
      desc: 'Darkness stopped hiding things from you some time ago -- every living thing in the region is felt.' },
    { name: "Assassin's Instinct", catKey: 'self_passive_buff', mech: { buffKind: 'crit' },
      desc: 'You have learned where things are weakest, and you no longer have to look for it.' },
    { name: 'Nightblade', catKey: 'summon_weapon',
      desc: 'Calls a blade with no shine on it at all into your hand.' },
    { name: 'Mantle of Dusk', catKey: 'summon_armor',
      desc: 'Dusk settles across your shoulders and takes the force out of what lands.' },
  ],

  // -------------------------------------------------------------------
  // AVATAR -- transcendence: the ideal form of the thing, briefly worn.
  // -------------------------------------------------------------------
  avatar: [
    { name: 'Avatar Strike', catKey: 'ranged_damage',
      desc: 'The blow as it should be struck, sent out at something that is only what it is.' },
    { name: 'Avatar Blast', catKey: 'ranged_aoe',
      desc: 'Perfected force released at a point, and everything near that point is included.' },
    { name: 'Radiant Whip', catKey: 'ranged_dot',
      desc: 'A lash of clean light that keeps burning in the wound it opened.' },
    { name: 'Ascendant Form', catKey: 'self_active_damage',
      desc: 'For half a minute you are the ideal of yourself, and it shows in every strike.' },
    { name: 'Perfect Clarity', catKey: 'self_active_crit',
      desc: 'Every flaw in everything around you becomes obvious, and briefly, reachable.' },
    { name: 'Untouchable Form', catKey: 'self_active_immunity',
      desc: 'You take the shape of the idea of yourself. Ideas do not bruise.' },
    { name: 'Still the World', catKey: 'self_active_timefreeze',
      desc: 'You hold the moment still. Everything around you waits inside it until you are done.' },
    { name: 'Healing Avatar Light', catKey: 'self_active_heal',
      desc: 'Light the shape of a whole body settles over a broken one and corrects it.' },
    { name: 'Aegis of the Ideal', catKey: 'self_active_absorb',
      desc: 'A barrier shaped like the perfect defence, holding for exactly as long as it must.' },
    { name: 'Stride Between', catKey: 'movement_teleport',
      desc: 'Declines the distance and arrives having never crossed it.' },
    { name: 'Aura of Divine Presence', catKey: 'self_passive_aoe',
      desc: 'A standing field of presence that everything nearby is measured against, and fails.' },
    { name: 'Eyes of the Ideal', catKey: 'perception',
      desc: 'You see each thing as it truly is, wherever in the region it happens to stand.' },
    { name: 'Perfected Body', catKey: 'self_passive_buff', mech: { buffKind: 'maxHp' },
      desc: 'The body has been quietly corrected toward its ideal, and it holds far more now.' },
    { name: 'Summon Avatar Construct', catKey: 'summon_bonded',
      desc: 'Calls a bonded construct of pure form that fights alongside you.' },
    { name: 'Breastplate of Radiance', catKey: 'summon_armor',
      desc: 'Radiant plate settles into place and takes the edge off everything that reaches you.' },
    { name: 'Sceptre of the Ideal', catKey: 'summon_gear',
      desc: 'A sceptre of settled light that hones every killing strike you make.' },
  ],
};

// ROUND 17 -- the five pools above are hand-authored and WIN. Every other
// essence in the 146-strong catalog gets the generated nine-ability pool
// from essenceSignatures.js (see gen_round17_signatures.mjs for how they
// are built out of the sheet's own skill names). The merge order matters:
// hand-authored last, so it overrides.

// ROUND 49 -- CHICKEN, hand-authored.
//
// The user added it while writing their team's backgrounds: Zeke the healer
// carries Renewal, Life and Chicken. Chicken is not in the HWFWM skills sheet,
// so the round-17 generator fell back to interpolating the essence's phrase and
// produced "Stubborn Hen Bolt" and "Creeping Stubborn Hen" -- precisely the
// mad-libs naming round 48 was spent removing. An essence that belongs to a
// named character is worth the hour.
//
// (Prosperity was briefly added here too, and removed: it is a CONFLUENCE
// name -- it is already in CONFLUENCE_NAMES with a 'heal' theme -- not a
// regular essence. The user caught it.)
//
// Chicken follows its motif (essenceMotifs.js): allies/ward/swift/taunt, all
// fuss and feathers until the flock is threatened.
HAND_AUTHORED_SIGNATURES.essChicken = [
  { name: 'Ruffle', catKey: 'self_active_armor',
    desc: 'Every feather stands on end at once, and what was a small bird is briefly a large problem.' },
  { name: 'Between the Fox and the Brood', catKey: 'self_passive_aoe',
    desc: 'You put yourself between the flock and whatever is coming. You always have.' },
  { name: 'Spur', catKey: 'martial_sunder',
    desc: 'The kick nothing that size should be able to throw, delivered exactly where it was not expected.' },
  { name: 'Scratch and Peck', catKey: 'ranged_damage',
    desc: 'Small, fast, and far more of them than the target had budgeted for.' },
  { name: 'Broody', catKey: 'self_passive_buff',
    desc: 'Being fussed at, crowded and underestimated has stopped costing you anything.' },
  { name: 'Flapping Retreat', catKey: 'movement_dash',
    desc: 'Not dignified. Extremely effective. You are somewhere else and still making noise about it.' },
  { name: 'The Roost', catKey: 'aoe_heal_pulse',
    desc: 'You call the flock in close, and close is where the flock is hardest to hurt.' },
  { name: 'Clutch', catKey: 'summon_bonded',
    desc: 'Something small follows you now, and it is not nearly as harmless as it looks.' },
  { name: 'Unbothered', catKey: 'self_passive_heal',
    desc: 'Whatever just happened, you have already gone back to what you were doing.' },
];

export const ESSENCE_SIGNATURES = { ...GENERATED_SIGNATURES, ...HAND_AUTHORED_SIGNATURES };

// Convenience -- used by the tests and the generator's guard rails.
export const SIGNATURE_ESSENCE_IDS = Object.keys(ESSENCE_SIGNATURES);
export function signaturesFor(essenceId) {
  return ESSENCE_SIGNATURES[essenceId] || [];
}
