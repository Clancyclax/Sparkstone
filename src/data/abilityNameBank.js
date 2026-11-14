// ============================================================================
// ROUND 446 -- HAND-WRITTEN NAMES, BY ESSENCE AND BY WHAT THE ABILITY DOES.
//
// The user, on "Wasp Step Buff" and "Bill Step": "Just taking a duck word or a wasp word and adding step to it doesn't
// make a good name. Instead of wasp step maybe call it, flight of the stinger and instead of bill step it could be
// escape waddle. Please review names of ALL abilities and lets make them more creative and less (Smash 2 words
// together)."
//
// Measured over 300 random kits: 3,384 of 4,646 distinct names were two words, mostly an essence or stone word
// joined to a function word ("Cattle's Mend", "Hunger Step", "Plant Momentum"). No joining rule fixes that, so the
// names are written here by hand: per essence (or confluence, keyed `conf:<Name>`), per ROLE -- what the ability
// does -- three names each. `nameFromBank` (awakening.js, the last pass of a kit) replaces a smashed name with one of
// these; a name with something of its own to say ("Oiled Wings", "Takes Hold Anyway") is kept.
//
// The first round covers the essences of the user's two review kits; the rest follow once he has judged the style.
// ============================================================================

import { INNATE_POOLS } from './innatePools.js';

/** What an ability does, as one of the bank's roles. */
export const ROLE_OF_TEMPLATE = {
  projectileBall: 'strike', rangeStrike: 'strike', sunderStrike: 'strike', stackStrike: 'strike', chainStrike: 'strike',
  beam: 'strike', dispelStrike: 'strike', condPayoff: 'strike',
  aoeRing: 'spread', volley: 'spread', breathCone: 'spread', weakenRing: 'spread', corpseBlast: 'spread',
  bloomField: 'spread', corpseMine: 'spread', corpseMiasma: 'spread',
  passiveMove: 'motion', movementHaste: 'motion', dash: 'motion', teleport: 'motion', blink: 'motion',
  waterWalk: 'motion', townPortal: 'motion',
  absorbShield: 'guard', reflectWard: 'guard', barrierWall: 'guard', summonArmor: 'guard', immunityBuff: 'guard',
  armorBuff: 'guard', thornsBuff: 'guard',
  selfHot: 'mend', selfHeal: 'mend', aoeHealPulse: 'mend', cleanse: 'mend', resourceRestore: 'mend', corpseDrain: 'mend',
  selfPower: 'power', selfCritBuff: 'power', statBuff: 'power', partyBuff: 'power', rangeBuff: 'power',
  transform: 'power', cooldownReset: 'power',
  passiveBuff: 'edge', weaponAffinity: 'edge', imbueStrike: 'edge', summonWeapon: 'edge', summonGear: 'edge',
  attrBoost: 'edge', stacking: 'edge', twoHandWield: 'edge', unarmedFocus: 'edge', weaponMight: 'edge',
  elementPierce: 'edge', altResource: 'edge', cooldownPassive: 'edge',
  triggeredPassive: 'reflex', passiveConditional: 'reflex', fateReroll: 'reflex',
  perception: 'sense', stealthVeil: 'sense',
  summonBonded: 'kin', activeSummon: 'kin',
  aura: 'aura',
  virulence: 'blight',
  timeFreeze: 'control', confuseTurn: 'control', tauntPull: 'control', abilityLock: 'control',
};

export function roleOf(a) {
  if (!a) return null;
  if (a.template === 'summonBonded' && (a.vehicleId || a.mount)) return 'ride';
  // a themed passive (themePassives.js) is named for what its shape pays
  const TS = { hp: 'mend', armor: 'guard', move: 'motion', dmg: 'edge', crit: 'edge', cd: 'edge', resource: 'mend' };
  if (a.themeShape && TS[a.themeShape.slot]) return TS[a.themeShape.slot];
  if (a.template === 'passiveBuff') {   // a standing buff is named for what it buys
    if (a.lifeOnKill || a.buffKind === 'maxHp' || a.lifeRegen) return 'mend';
    if (a.buffKind === 'armor') return 'guard';
  }
  return ROLE_OF_TEMPLATE[a.template] || null;
}

export const NAME_BANK = {
  essWasp: {
    strike: ['One Clean Sting', 'The Needle Finds You', "Hornet's Kiss"],
    spread: ['The Nest Kicked Over', 'Swarm Unfolding', 'A Summer of Stings'],
    motion: ['Flight of the Stinger', 'Zigzag Retreat', 'Out Through the Window'],
    guard: ['Paper Fortress', 'The Nest Holds', 'Chitin Plates'],
    mend: ['Royal Jelly', 'Back to the Comb', 'The Queen Tends Her Own'],
    power: ['Late Summer Fury', 'The Swarm Rises', 'Angry Hum'],
    edge: ['Barbed Intent', 'Every Edge a Stinger', 'Narrow Waist, Wide Grudge'],
    reflex: ['Disturbed Nest', 'Sting Back', 'Never Swat a Wasp'],
    sense: ['Thousand-Lens Eye', 'Scent of the Nest', 'Hunting Hum'],
    kin: ['The Colony Comes', 'Drones of the Paper Nest', 'Brood of Stingers'],
    aura: ['Air Full of Wings', 'The Humming Halo', 'Picnic Ruined'],
    blight: ['Venom That Lingers', 'It Swells and Burns', 'Poison in the Paper'],
    control: ['Frozen by the Hum', "Don't Move a Muscle", 'Swarm Panic'],
  },
  essDuck: {
    strike: ['Bill to the Shin', 'Furious Quack', 'Breadcrumb Fury'],
    spread: ['Splash Landing', 'The Whole Pond Erupts', 'The Flock Takes Off'],
    motion: ['Escape Waddle', 'Paddle Away', 'Fly South'],
    guard: ["Water Off a Duck's Back", 'Down Pillow', 'Oiled Feathers'],
    mend: ['Preening', 'Warm Nest Down', 'Floating Rest'],
    power: ["Mother Duck's Wrath", 'Puffed Up', 'Head of the Line'],
    edge: ['Webbed Purchase', 'Pecking Order', 'Steady Under the Surface'],
    reflex: ['Calm Above, Kicking Below', 'Startled Flight', 'Ruffled Feathers'],
    sense: ['Eye on the Sky', 'Ripple Reader', 'Wise to Decoys'],
    kin: ['Ducklings in a Row', 'The Flock Follows', 'A Paddling of Ducks'],
    aura: ['The Pond Is Mine', 'Ring of Ripples', 'Feather Drift'],
    blight: ['Bad Bread', 'Pond Scum', 'Duckweed Choke'],
    control: ['Decoy', 'Honk of Alarm', 'Sitting Duck'],
  },
  essIron: {
    strike: ['Cold Iron', 'Hammer and Anvil', 'Pig Iron Fist'],
    spread: ['Shrapnel Rain', 'Scattered Filings', 'The Anvil Drops'],
    motion: ['Rolling Iron', 'Freight of Iron', 'Momentum of Metal'],
    guard: ['Wrought Skin', 'Iron Curtain', 'Proof Against Steel'],
    mend: ['Reforged', 'Quench and Temper', 'Hammered Back Into Shape'],
    power: ['White Heat', 'Iron Will', 'Strike While Hot'],
    edge: ['Fresh From the Grindstone', 'Holds an Edge', 'Iron Sharpens Iron'],
    reflex: ['Ring of the Anvil', 'Rust Never Sleeps', 'Spark Off the Blow'],
    sense: ['Lodestone Pull', 'Taste of Rust', 'Ore Sense'],
    kin: ['Iron Golem', 'Forged Retainers', 'Ironclad Companion'],
    aura: ['Magnetic Field', 'Lodestone Heart', 'Iron Filings Dance'],
    blight: ['Rust in the Wound', 'Tetanus', 'Red Rot'],
    control: ['Iron Shackles', 'Magnetic Hold', 'Cold Iron Binds'],
  },
  essCattle: {
    strike: ['Horns Down', 'Mad Bull', 'Branding Iron'],
    spread: ['Stampede', 'Thundering Herd', 'Cattle Drive'],
    motion: ['Bolt for the Gate', 'Running of the Bulls', 'Down the Chute'],
    guard: ['Thick Hide', 'Circle the Herd', 'Leather and Lowing'],
    mend: ['Chewing the Cud', 'Salt Lick', 'Second Stomach'],
    power: ['Seeing Red', 'Bull Market', 'Raging Bull'],
    edge: ['Tempered Horn', 'Weight of the Herd', 'Ox Strength'],
    reflex: ['Gored', 'Spooked Herd', 'Never Corner a Bull'],
    sense: ['Herd Instinct', 'Cows Lie Down Before Rain', 'Nose to the Wind'],
    kin: ['The Herd Answers', 'Prize Bull', 'Faithful Oxen'],
    aura: ['Automatic Slaughterhouse', 'Pasture of Plenty', 'Cowbell Toll'],
    blight: ['Mad Cow', 'Foot and Mouth', 'Bloat'],
    control: ['Roped and Tied', 'Lassoed', 'Penned In'],
  },
  essVehicle: {
    ride: ['Your Ride Awaits', 'Home Away From Home', 'The Long Haul'],
    strike: ['Hood Ornament', 'Ramming Speed', 'Hit and Run'],
    spread: ['Backfire', 'Drive-By', 'Jackknife'],
    motion: ['Full Throttle', 'Shifting Gears', 'Pedal to the Metal'],
    guard: ['Roll Cage', 'Crumple Zone', 'Armoured Chassis'],
    mend: ['Pit Stop', 'Roadside Repair', 'Topped Off'],
    power: ['Nitro', 'Redline', 'Afterburner'],
    edge: ['Precision Engineering', 'Torque', 'Well Oiled'],
    reflex: ['Airbag', 'Emergency Brake', 'Lean on the Horn'],
    sense: ['Rear-View Mirror', 'Headlights', 'Dashboard Gauges'],
    kin: ['The Convoy', 'Mechanical Outriders', 'Sidecar Companion'],
    aura: ['Engine Roar', 'Road Rage', 'Exhaust Cloud'],
    blight: ['Leaded Fumes', 'Oil Slick', 'Choking Exhaust'],
    control: ['Roadblock', 'Gridlock', 'Spike Strip'],
  },
  essAdept: {
    strike: ['The Perfect Strike', 'Ten Years in One Blow', 'The Precise Answer'],
    spread: ['Whirling Form', 'Every Direction at Once', 'The Wide Lesson'],
    motion: ['Light Feet', 'Inside Their Guard', 'Always Somewhere Else'],
    guard: ['Turning Aside', 'The Unbroken Stance', 'Empty Where They Strike'],
    mend: ["The Master's Breath", 'Measured Breathing', 'Centering'],
    power: ['Flow State', 'Mastery Unleashed', 'Peak Form'],
    edge: ['Practised Hands', 'Muscle Memory', 'The Weapon Is the Hand'],
    reflex: ['Trained Reflex', 'Counter Before the Blow', 'The Body Remembers'],
    sense: ['Reading the Shoulder', 'Telegraphed', 'Know Your Opponent'],
    kin: ['Students at Your Back', 'The Sparring Partner', 'Disciples of the Form'],
    aura: ['Presence of the Master', 'Dojo Ground', 'The Calm Before'],
    blight: ['Pressure Points', 'The Lingering Strike', 'The Delayed Blow'],
    control: ['Joint Lock', 'Off Balance', 'Sweep the Leg'],
  },
  'conf:Forge': {
    strike: ['Struck on the Anvil', 'Molten Rivet', 'The Smith\'s Answer'],
    spread: ['Slag Spray', 'Bellows Blast', 'Sparks Fly'],
    motion: ['Out of the Fire', 'Quick Quench', 'Hot Iron Runs'],
    guard: ['Fire-Hardened', 'Annealed', 'Plate of the Forge'],
    mend: ['Back in the Coals', 'Welded Whole', 'Tempering'],
    power: ['Stoke the Fire', 'Forge-Fire Heart', 'Bring It to Heat'],
    edge: ['Folded Steel', 'Honed on the Wheel', 'Masterwork'],
    reflex: ['Hammer Falls', 'Struck Sparks', 'Quenching Hiss'],
    sense: ['Colour of the Metal', 'The Smith\'s Eye', 'Heat Shimmer'],
    kin: ['The Apprentices', 'Animated Anvil', 'Bronze Servitor'],
    aura: ['Heat of the Forge', 'Ring of Hammers', 'Coal-Glow'],
    blight: ['Slag Burns', 'Clinging Cinders', 'Brand That Festers'],
    control: ['Cast in Place', 'Clamped in the Vice', 'Set Like Iron'],
  },
  'conf:Master': {
    strike: ['The Last Lesson', 'Single Correct Blow', 'Answer of the Old School'],
    spread: ['The Thousand-Hand Form', 'Circle of Mastery', 'A Lesson for All of You'],
    motion: ['Gone Before the Blow', 'The Unhurried Step', 'Walking Through Them'],
    guard: ['The Master Is Not There', 'Patient Guard', 'Water Takes the Blow'],
    mend: ['Stillness Heals', 'The Long Breath', 'Return to Centre'],
    power: ['The Old Fire', 'Mastery Remembered', 'Full Form'],
    edge: ['Ten Thousand Repetitions', 'The Weapon Remembers', 'Perfect Practice'],
    reflex: ['Already Countered', 'The Student Stumbles', 'Old Habits'],
    sense: ['Seen It Before', 'Every Tell', 'The Measured Gaze'],
    kin: ['Lineage of Masters', 'The Old School Answers', 'Senior Students'],
    aura: ['The Master\'s Hall', 'Room Falls Quiet', 'Weight of Years'],
    blight: ['The Delayed Death', 'Touch of the Old Master', 'Meridian Strike'],
    control: ['Pinned by a Look', 'The Lesson Holds', 'Nowhere to Go'],
  },
};

// ---------------------------------------------------------------------------------------------- the smash test
// A function word: what an ability does, said as a bare noun. A two-word name with one of these in it, or a name of
// three words or fewer that carries the essence's or stone's own word with nothing else to say, is a smashed name.
export const FUNCTION_WORDS = new Set(`bolt shot dart volley barrage breath gout beam ray burst nova ring lash chain strike thrust
sunder rend flurry strikes edge brand rupture mend balm renewal mending wellspring ward shell wall bulwark rush sprint
step flicker dash lunge stride rhythm tempo focus eye barbs spines riposte reversal hex blight brood kin purge
cleansing hold stillness momentum build instinct reflex fury mark hide vigour vigor heart buff debuff aura sense smash
surge spikes boost bind cloak shield armor armour strength blast wave slash punch kick bite claw charge call summon
form skin sight spear field trap snare swarm storm touch grip leap jump run speed guard barrier heal healing
regeneration shroud veil mantle zone herd watch stance dash horns tires rivets yoke ruts resilience effigy core
missile javelin smite grasp drink drifts companion sentry`.split(/\s+/).filter(Boolean));
const SMALL = new Set(['of', 'the', 'and', 'a', 'an', 'in', 'to', 'at', 'on', 'for', 'from', 'that', 'it', 'is']);
const clean = (w) => String(w || '').toLowerCase().replace(/[’']s?$/, '').replace(/[^a-z-]/g, '');

export function isSmashedName(name, { essName = null, stoneWord = null, extra = [] } = {}) {
  const words = String(name || '').replace(/-/g, ' ').split(/\s+/).filter(Boolean).map(clean).filter(Boolean);
  if (!words.length) return false;
  const ident = new Set([essName, stoneWord, ...extra].filter(Boolean)
    .flatMap(x => String(x).split(/\s+/)).map(clean).filter(w => w && !SMALL.has(w)));
  const smallCount = words.filter(w => SMALL.has(w)).length;
  if (words.length >= 3 && smallCount > 0 && !ident.size) return false;
  const hasIdent = words.some(w => ident.has(w));
  // "Boneless Arms of Shovel", "Down of Defiance": a body part or a thing, "of" the stone or the essence
  const ofAt = words.lastIndexOf('of');
  if (ofAt > 0 && ofAt === words.length - 2 && ident.has(words[words.length - 1]) && words.length <= 4) return true;
  const hasFn = words.some(w => FUNCTION_WORDS.has(w));
  if (words.length === 2 && (hasIdent || hasFn)) return true;
  if (words.length <= 4 && hasIdent && smallCount === 0) return true;   // "Vehicle Energy Core Boost", "Cattle Herd Sense"
  return false;
}

/** A bank name for this ability, or null when the bank has none (or every one is taken in the kit). */
// ROUND 448 -- a name that a fixed record owns (innatePools.js) is that record's alone: the bank never hands it to a
// generated ability. "no two abilities can share an exact name".
const STATIC_NAMES = new Set(Object.values(INNATE_POOLS).flat().map(r => r && r.name).filter(Boolean));
export function isStaticName(n) { return STATIC_NAMES.has(n); }

export function bankNameFor(bankKey, a, used, pickHash = 0) {
  const role = roleOf(a);
  const row = NAME_BANK[bankKey] && role ? NAME_BANK[bankKey][role] : null;
  if (!row || !row.length) return null;
  // Best first: the first name is the one written for the essence (the user's own, where he gave one); the others
  // are for a kit that holds two of that role. `pickHash` is kept for callers and no longer rotates the row.
  void pickHash;
  for (const n of row) if (!used.has(n) && !STATIC_NAMES.has(n)) return n;
  return null;
}
