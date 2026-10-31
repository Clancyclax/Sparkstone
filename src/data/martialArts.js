// ===========================================================================
// ROUND 310 (item 2.2.2) -- MARTIAL ARTS.  ROUND 398 -- far more varied, and a different handful in every run.
//
// The user (round 310):
//
//   "Martial Arts Proficiencies (Players should be able to pick out a martial
//    art skill book that slightly changes how they play) Examples: Way of the
//    patient hunter (reduces mana and stamina costs by 5% while holding
//    still); Way of the inevitable stinger (Increases movement speed and
//    dodge by .5% for each enemy with a DOT effect); Way of the meteor
//    (single target attacks with a cooldown are 3% stronger, and have their
//    cooldown reduced by 1%)"
//   "These should be generated with 100s of potential small effects like
//    above but a player can only pick to learn 1 martial art. The martial arts
//    effect improves at each rank as the players body and attributes improve."
//
// The user (round 398):
//
//   "lets update the martial arts styles to be more varied, Examples Way of the fanged serpent 'deals 5% more damage
//    with daggers and gains 2% dodge chance while wielding a dagger' Style of the striking meteor 'Attacks with great
//    weapons cost 10% less stamina, hit 5% harder, and swing 3% faster' Way of the shifting flame 'Fire spells scale
//    with weapon damage (x1.1), and dodge chance scales with fire resistance (gain 1% dodge for every 20% fire
//    resistance)' The martial arts should be super varied and which ones happen to be available in a run should be
//    random and searching for a specific one requires either finding a master or checking the auction house and
//    sales people repeatedly."
//
// AN ART IS A LIST OF CLAUSES. Each clause is WHEN (a condition) and WHAT (a bag of channel figures). Round 310's arts
// were one clause and one or two channels from a cross product; round 398's are built from themes:
//   * WEAPON arts -- the condition is the weapon in your hands (a dagger, a great weapon, a shield, two weapons...)
//     and the channels are the ones that weapon is about (a dagger's dodge and crit, a maul's stamina and guard).
//   * ELEMENT arts -- an element's spells hit harder, strike with your weapon's weight, or a resistance turns into
//     dodge, guard, damage or crit ("1% dodge for every 20% fire resistance").
//   * SITUATIONS -- round 310's conditions, now with two- and three-channel bags.
//   * TWO-FACED arts -- one thing while still and another while moving, hurt and hale, day and night.
//   * BARGAINS -- a large gift under a condition, paid for with a small loss at all times.
// New channels: weapon damage, swing stamina, swing speed, leech, restores on a kill, an element's spell damage, an
// element's spells striking for a share of the weapon blow, and the resistance-scaled ones.
//
// A RUN SEES ONLY SOME OF THEM. `runMartialPool(runSeed)` draws RUN_POOL_SIZE arts for the run (a spread across the
// themes). Every shelf -- the Society's, the market bookstall's, the auction house's few, a found book -- draws from
// that pool, a different handful each day; and MASTER_COUNT masters stand in random settlements, each teaching one.
// Round 310's single- and twin-channel arts stay in MARTIAL_BY_ID (a save that follows one keeps it) but are not
// offered any more (`legacy`).
//
// THE RUNTIME READS ONE THING: `effectsFor(art, ctx)` -> a plain bag of fractions; skillBookMixin applies it through
// the doors every other buff uses. Nothing here touches Phaser.
//
// MAGNITUDE. base (per channel) x condition weight x share (two channels 0.7, three 0.55) x rank multiplier x
// attribute lift. Iron figures are 0.5% to 10%; by gold they are about four times that.
// ===========================================================================

/** Rank multipliers, iron..gold. Between ranks the standing's fraction
 *  interpolates, so a martial art grows continuously rather than in steps. */
export const MARTIAL_RANK_MULT = [1, 1.7, 2.6, 3.8];
/** Each point of the linked attribute lifts the art by this fraction. */
export const MARTIAL_ATTR_LIFT = 0.04;
/** "Soft" channels (an element's spells striking for a share of the weapon blow) grow by this share of the scale. */
export const MARTIAL_SOFT_GROWTH = 0.25;
/** The arts a run offers, and the masters who each teach one. */
export const RUN_POOL_SIZE = 120;
export const MASTER_COUNT = 200;   // ROUND 399 -- twelve; ROUND 400 -- sixteen; ROUND 401 -- two hundred (the user's number)
/** ROUND 401 -- "about 60% of world map squares should, somewhere in the region have a dojo with a master" (of the
 *  explorable squares: 192 of 320), "as well as a few in main story regions". */
export const DOJO_SQUARE_SHARE = 0.6;
export const STORY_REGION_MASTERS = 8;
/** A resistance-scaled channel pays per this much resistance ("for every 20% fire resistance"). */
export const RESIST_STEP = 0.2;
import { masterLook, MASTER_CHAR_KEYS } from './masterArt.js';   // ROUND 399

export function martialScale(standing = 0, attrPoints = 0) {
  const s = Math.max(0, Number(standing) || 0);
  const i = Math.min(MARTIAL_RANK_MULT.length - 1, Math.floor(s));
  const f = Math.min(1, s - i);
  const hi = MARTIAL_RANK_MULT[Math.min(MARTIAL_RANK_MULT.length - 1, i + 1)];
  const rank = MARTIAL_RANK_MULT[i] + (hi - MARTIAL_RANK_MULT[i]) * f;
  return rank * (1 + MARTIAL_ATTR_LIFT * Math.max(0, attrPoints || 0));
}

// ---------------------------------------------------------------------------
// CONDITIONS -- WHEN. `key` is the field of the live context it reads (skillBookMixin `_martialTick`); `per` marks a
// per-count condition (the figure is multiplied by the count, capped at `cap`). `w` is the weight.
// ---------------------------------------------------------------------------
export const ELEMENTS6 = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];
const EL_LABEL = { fire: 'fire', frost: 'frost', lightning: 'lightning', nature: 'nature', shadow: 'shadow', radiant: 'radiant' };

export const CONDITIONS = [
  { id: 'still',    key: 'still',     w: 1.6, text: 'while holding still',                   epithets: ['patient', 'rooted', 'unmoving', 'quiet', 'waiting'] },
  { id: 'moving',   key: 'moving',    w: 1.0, text: 'while on the move',                     epithets: ['restless', 'wandering', 'drifting', 'running', 'roving'] },
  { id: 'combat',   key: 'inCombat',  w: 0.9, text: 'while in a fight',                      epithets: ['grim', 'steady', 'battle-born', 'unrelenting', 'hardened'] },
  { id: 'calm',     key: 'calm',      w: 1.5, text: 'while no fight is on',                  epithets: ['easy', 'idle', 'peaceful', 'unhurried', 'traveling'] },
  { id: 'hurt',     key: 'hurt',      w: 1.5, text: 'while below half health',               epithets: ['wounded', 'bleeding', 'cornered', 'desperate', 'last'] },
  { id: 'hale',     key: 'hale',      w: 1.0, text: 'while above nine tenths health',        epithets: ['hale', 'unbroken', 'untouched', 'proud', 'whole'] },
  { id: 'manalow',  key: 'manaLow',   w: 1.4, text: 'while mana is under a third',           epithets: ['empty', 'dry', 'ebbing', 'spent', 'parched'] },
  { id: 'manafull', key: 'manaFull',  w: 1.0, text: 'while mana is nearly full',             epithets: ['brimming', 'overflowing', 'clear', 'bright', 'full'] },
  { id: 'stamlow',  key: 'stamLow',   w: 1.4, text: 'while stamina is under a third',        epithets: ['winded', 'weary', 'gasping', 'flagging', 'burning'] },
  { id: 'stamfull', key: 'stamFull',  w: 1.0, text: 'while stamina is nearly full',          epithets: ['fresh', 'tireless', 'eager', 'springing', 'rested'] },
  { id: 'night',    key: 'night',     w: 1.2, text: 'at night',                              epithets: ['midnight', 'moonlit', 'dark', 'nocturnal', 'lantern'] },
  { id: 'day',      key: 'day',       w: 1.0, text: 'in daylight',                           epithets: ['noon', 'sunlit', 'bright', 'morning', 'open'] },
  { id: 'afterkill', key: 'afterKill', w: 1.4, text: 'for six seconds after a kill',         epithets: ['victorious', 'hungry', 'following', 'reaping', 'flowing'] },
  { id: 'afterhit', key: 'afterHit',  w: 1.4, text: 'for four seconds after you are struck', epithets: ['answering', 'stubborn', 'scarred', 'spiteful', 'tempered'] },
  { id: 'afterstrike', key: 'afterStrike', w: 1.2, text: 'for two seconds after you land a hit', epithets: ['following', 'chained', 'rolling', 'unbroken', 'quick'] },
  { id: 'perdot',   key: 'dotFoes',   per: true, cap: 8, w: 0.30, text: 'for each enemy near you suffering a damage-over-time effect', epithets: ['inevitable', 'patient', 'creeping', 'festering', 'slow'] },
  { id: 'perfoe',   key: 'foes',      per: true, cap: 8, w: 0.25, text: 'for each enemy near you',                  epithets: ['surrounded', 'crowded', 'hunted', 'many-handed', 'outnumbered'] },
  { id: 'crowd',    key: 'crowd',     w: 1.1, text: 'while three or more enemies are near',  epithets: ['mobbed', 'pressed', 'swarmed', 'whirling', 'wide'] },
  { id: 'duel',     key: 'duel',      w: 1.3, text: 'while exactly one enemy is near',       epithets: ['single', 'lone', 'duelling', 'focused', 'narrow'] },
  { id: 'unarmed',  key: 'unarmed',   w: 1.2, text: 'while bare-handed',                     epithets: ['open-handed', 'bare', 'empty-handed', 'plain', 'naked'] },
  { id: 'armed',    key: 'armed',     w: 0.8, text: 'while holding a weapon',                epithets: ['sworn', 'armed', 'edged', 'drawn', 'ready'] },
  { id: 'wet',      key: 'wet',       w: 1.4, text: 'while standing in water',               epithets: ['drowned', 'river', 'tidal', 'dripping', 'rain-soaked'] },
  { id: 'high',     key: 'high',      w: 1.3, text: 'while standing on higher ground than Cadence', epithets: ['high', 'summit', 'cliff', 'eagle', 'peak'] },
  { id: 'low',      key: 'low',       w: 1.3, text: 'while standing on lower ground than Cadence', epithets: ['sunken', 'valley', 'deep', 'low', 'hollow'] },
  { id: 'buffed',   key: 'buffed',    w: 1.1, text: 'while one of your own buffs is running', epithets: ['blessed', 'kindled', 'fed', 'lit', 'primed'] },
  { id: 'always',   key: 'always',    w: 0.55, text: 'at all times',                         epithets: ['quiet', 'steady', 'abiding', 'plain', 'constant'] },
];

// ROUND 398 -- the weapon in your hands. `fam` is the weapon base id (skillBookMixin reads the base of both hands);
// the groups are read off the same two hands. Each carries the channels the weapon is ABOUT and its own names.
export const WEAPON_STYLES = [
  { id: 'dagger',     noun: 'a dagger',          w: 1.6, ch: ['weaponDamage', 'dodge', 'crit', 'moveSpeed', 'swingSpeed', 'leech', 'killWind'],
    epithets: ['fanged', 'coiled', 'hidden', 'whispering', 'venomous', 'silent', 'needling'], figures: ['Serpent', 'Adder', 'Viper', 'Wasp', 'Scorpion', 'Asp', 'Mamba'] },
  { id: 'sword',      noun: 'a sword',           w: 1.6, ch: ['weaponDamage', 'crit', 'guard', 'swingSpeed', 'dodge', 'swingThrift'],
    epithets: ['tempered', 'dancing', 'crossed', 'honed', 'gallant', 'mirrored', 'bright'], figures: ['Heron', 'Kestrel', 'Fox', 'Swallow', 'Mantis', 'Hawk', 'Lion'] },
  { id: 'hammer',     noun: 'a warhammer',       w: 1.6, ch: ['weaponDamage', 'guard', 'swingThrift', 'killWind', 'vigor', 'crit'],
    epithets: ['thundering', 'falling', 'ringing', 'iron', 'pounding', 'stubborn', 'quaking'], figures: ['Ram', 'Anvil', 'Bull', 'Bear', 'Boulder', 'Ox', 'Rhino'] },
  { id: 'axe',        noun: 'an axe',            w: 1.6, ch: ['weaponDamage', 'crit', 'leech', 'swingSpeed', 'killMend', 'moveSpeed'],
    epithets: ['cleaving', 'red', 'hewing', 'wild', 'notched', 'howling', 'biting'], figures: ['Wolf', 'Woodsman', 'Badger', 'Wolverine', 'Boar', 'Beaver', 'Lynx'] },
  { id: 'spear',      noun: 'a spear',           w: 1.6, ch: ['weaponDamage', 'dodge', 'crit', 'guard', 'moveSpeed', 'swingSpeed'],
    epithets: ['long', 'piercing', 'reaching', 'level', 'patient', 'darting', 'pinning'], figures: ['Crane', 'Pike', 'Mantis', 'Narwhal', 'Kingfisher', 'Stork', 'Ibis'] },
  { id: 'scythe',     noun: 'a scythe',          w: 1.6, ch: ['weaponDamage', 'leech', 'killMend', 'crit', 'killFocus', 'swingThrift'],
    epithets: ['reaping', 'harvest', 'crescent', 'pale', 'sweeping', 'gleaning', 'mowing'], figures: ['Crow', 'Raven', 'Moth', 'Vulture', 'Jackdaw', 'Rook', 'Magpie'] },
  { id: 'whip',       noun: 'a whip',            w: 1.6, ch: ['weaponDamage', 'swingSpeed', 'dodge', 'moveSpeed', 'crit', 'killWind'],
    epithets: ['lashing', 'coiling', 'singing', 'cracking', 'curling', 'stinging', 'snapping'], figures: ['Eel', 'Vine', 'Snake', 'Cobra', 'Tendril', 'Lamprey', 'Ferret'] },
  { id: 'greatsword', noun: 'a greatsword',      w: 1.6, ch: ['weaponDamage', 'swingThrift', 'swingSpeed', 'guard', 'crit', 'killWind'],
    epithets: ['towering', 'oathbound', 'broad', 'kingly', 'sweeping', 'sundering', 'unbowed'], figures: ['Colossus', 'Titan', 'Lion', 'Bear', 'Mountain', 'Giant', 'Elk'] },
  { id: 'greataxe',   noun: 'a greataxe',        w: 1.6, ch: ['weaponDamage', 'swingThrift', 'leech', 'crit', 'killMend', 'swingSpeed'],
    epithets: ['raging', 'splitting', 'bloody', 'howling', 'felling', 'savage', 'riven'], figures: ['Bison', 'Mammoth', 'Wolverine', 'Aurochs', 'Ogre', 'Bear', 'Tusker'] },
  { id: 'glaive',     noun: 'a glaive',          w: 1.6, ch: ['weaponDamage', 'swingSpeed', 'dodge', 'crit', 'moveSpeed', 'swingThrift'],
    epithets: ['wheeling', 'crescent', 'circling', 'arcing', 'sweeping', 'turning', 'spinning'], figures: ['Mantis', 'Swift', 'Moon', 'Falcon', 'Scorpion', 'Swallow', 'Heron'] },
  { id: 'maul',       noun: 'a maul',            w: 1.6, ch: ['weaponDamage', 'swingThrift', 'guard', 'vigor', 'killWind', 'crit'],
    epithets: ['crushing', 'grinding', 'avalanche', 'quaking', 'ponderous', 'shattering', 'tolling'], figures: ['Mountain', 'Rhino', 'Tortoise', 'Bell', 'Boulder', 'Mammoth', 'Anvil'] },
  { id: 'javelin',    noun: 'a javelin',         w: 1.6, ch: ['weaponDamage', 'moveSpeed', 'crit', 'swingSpeed', 'dodge', 'killWind'],
    epithets: ['flung', 'hurtling', 'far-cast', 'arcing', 'hunting', 'sure', 'running'], figures: ['Hawk', 'Cheetah', 'Hunter', 'Gazelle', 'Osprey', 'Kestrel', 'Comet'] },
  { id: 'staff',      noun: 'a staff',           w: 1.6, ch: ['haste', 'focus', 'weaponDamage', 'tempo', 'guard', 'killFocus'],
    epithets: ['wandering', 'ash-wood', 'pilgrim', 'gnarled', 'humming', 'twisted', 'sage'], figures: ['Owl', 'Heron', 'Hermit', 'Lantern', 'Willow', 'Tortoise', 'Crane'] },
  { id: 'bow',        noun: 'a bow',             w: 1.6, ch: ['weaponDamage', 'crit', 'moveSpeed', 'swingSpeed', 'dodge', 'swingThrift'],
    epithets: ['drawn', 'feathered', 'singing', 'distant', 'keen', 'patient', 'loosed'], figures: ['Falcon', 'Osprey', 'Hunter', 'Owl', 'Eagle', 'Lynx', 'Hart'] },
  { id: 'crossbow',   noun: 'a crossbow',        w: 1.6, ch: ['weaponDamage', 'crit', 'swingSpeed', 'guard', 'swingThrift', 'killWind'],
    epithets: ['cranked', 'bolted', 'iron', 'level', 'cocked', 'steady', 'quarrel'], figures: ['Ballista', 'Hornet', 'Sentinel', 'Beetle', 'Pike', 'Badger', 'Stag'] },
  // groups
  { id: 'great',      noun: 'a great weapon',    w: 1.2, group: true, ch: ['weaponDamage', 'swingThrift', 'swingSpeed', 'guard', 'killWind', 'leech'],
    epithets: ['striking', 'thundering', 'colossal', 'heavy', 'earth-shaking', 'unstoppable', 'falling'], figures: ['Meteor', 'Avalanche', 'Landslide', 'Comet', 'Giant', 'Glacier', 'Tempest'] },
  { id: 'blade',      noun: 'a bladed weapon',   w: 1.2, group: true, ch: ['weaponDamage', 'crit', 'leech', 'swingSpeed', 'dodge'],
    epithets: ['keen', 'edged', 'whetted', 'flashing', 'silvered', 'razor'], figures: ['Mantis', 'Swallow', 'Shrike', 'Barracuda', 'Fin', 'Reed'] },
  { id: 'heavy',      noun: 'a heavy weapon',    w: 1.2, group: true, ch: ['weaponDamage', 'guard', 'swingThrift', 'vigor', 'killWind'],
    epithets: ['massive', 'crushing', 'leaden', 'ponderous', 'bulwark', 'granite'], figures: ['Ox', 'Elephant', 'Bison', 'Boulder', 'Ram', 'Hippo'] },
  { id: 'polearm',    noun: 'a polearm',         w: 1.2, group: true, ch: ['weaponDamage', 'dodge', 'guard', 'swingSpeed', 'moveSpeed'],
    epithets: ['long-reaching', 'hedge', 'ranked', 'warding', 'levelled', 'measured'], figures: ['Stork', 'Crane', 'Picket', 'Heron', 'Pikeman', 'Giraffe'] },
  { id: 'ranged',     noun: 'a ranged weapon',   w: 1.2, group: true, ch: ['weaponDamage', 'crit', 'moveSpeed', 'dodge', 'swingSpeed'],
    epithets: ['distant', 'far-sighted', 'hawk-eyed', 'skirmishing', 'wind-reading', 'skyward'], figures: ['Eagle', 'Kite', 'Harrier', 'Gull', 'Swift', 'Skylark'] },
  { id: 'shield',     noun: 'a shield',          w: 1.3, group: true, ch: ['guard', 'vigor', 'mend', 'weaponDamage', 'swingThrift', 'tempo'],
    epithets: ['walled', 'shielded', 'bastion', 'sheltering', 'iron-skinned', 'shell-backed'], figures: ['Tortoise', 'Pangolin', 'Armadillo', 'Gate', 'Rampart', 'Crab'] },
  { id: 'dual',       noun: 'a weapon in each hand', w: 1.2, group: true, ch: ['swingSpeed', 'weaponDamage', 'crit', 'dodge', 'leech', 'moveSpeed'],
    epithets: ['twin', 'paired', 'mirrored', 'two-fanged', 'double', 'crossed'], figures: ['Scorpion', 'Mantis', 'Crab', 'Swallowtail', 'Wasp', 'Lobster'] },
  { id: 'twohand',    noun: 'a two-handed weapon', w: 1.1, group: true, ch: ['weaponDamage', 'swingThrift', 'guard', 'crit', 'killWind'],
    epithets: ['two-handed', 'braced', 'full-bodied', 'grounded', 'rooted', 'wholehearted'], figures: ['Oak', 'Yew', 'Pillar', 'Ox', 'Cedar', 'Totem'] },
  { id: 'single',     noun: 'one weapon and an empty hand', w: 1.2, group: true, ch: ['dodge', 'crit', 'weaponDamage', 'moveSpeed', 'haste'],
    epithets: ['one-handed', 'free-handed', 'fencing', 'open-guarded', 'duellist', 'sleeved'], figures: ['Fencer', 'Cat', 'Heron', 'Fox', 'Mongoose', 'Ferret'] },
];
const WS = Object.fromEntries(WEAPON_STYLES.map(s => [s.id, s]));
for (const s of WEAPON_STYLES) {
  CONDITIONS.push({ id: `w_${s.id}`, key: `w_${s.id}`, w: s.w, text: `while wielding ${s.noun}`, epithets: s.epithets, weapon: s.id });
}
for (const el of ELEMENTS6) {
  CONDITIONS.push({ id: `res_${el}`, key: `res_${el}`, w: 1.2, text: `while your ${EL_LABEL[el]} resistance is at least 25%`, epithets: [], element: el });
}

// ---------------------------------------------------------------------------
// CHANNELS -- WHAT. `base` is the iron figure at weight 1, as a fraction; `attr` lifts it. `subj`/`more`/`less`
// write the phrase ({v} is the figure): a clause's phrases are grouped by subject, so three phrases about "your
// weapon attacks" read as one sentence. `neg: false` -- never generated as a loss.
// ---------------------------------------------------------------------------
export const CHANNELS = [
  { id: 'moveSpeed', base: 0.020, attr: 'speed',    noun: 'movement speed', more: 'move {v} faster', less: 'move {v} slower', figures: ['Hare', 'Gale', 'Courier', 'Heron', 'Stag'] },
  { id: 'dodge',     base: 0.015, attr: 'speed',    noun: 'dodge chance', more: 'gain {v} dodge chance', less: 'lose {v} dodge chance', figures: ['Willow', 'Reed', 'Eel', 'Moth', 'Weasel'] },
  { id: 'damage',    base: 0.020, attr: 'power',    noun: 'damage', more: 'deal {v} more damage', less: 'deal {v} less damage', figures: ['Anvil', 'Boar', 'Avalanche', 'Mallet', 'Rhino'] },
  { id: 'crit',      base: 0.015, attr: 'power',    noun: 'critical chance', more: 'gain {v} critical chance', less: 'lose {v} critical chance', figures: ['Falcon', 'Needle', 'Lightning', 'Viper', 'Arrow'] },
  { id: 'guard',     base: 0.015, attr: 'recovery', noun: 'damage reduction', more: 'take {v} less damage', less: 'take {v} more damage', figures: ['Tortoise', 'Wall', 'Oak', 'Shell', 'Bulwark'] },
  { id: 'thrift',    base: 0.040, attr: 'spirit',   noun: 'mana and stamina costs (lower)', more: 'pay {v} less mana and stamina', neg: false, figures: ['Hunter', 'Miser', 'Spider', 'Cat', 'Monk'] },
  { id: 'tempo',     base: 0.020, attr: 'speed',    noun: 'cooldown recovery speed', more: 'recover cooldowns {v} faster', less: 'recover cooldowns {v} slower', figures: ['Tide', 'Clock', 'Drum', 'Cricket', 'Pendulum'] },
  { id: 'haste',     base: 0.030, attr: 'spirit',   noun: 'cast speed', more: 'cast {v} faster', less: 'cast {v} slower', figures: ['Spark', 'Swift', 'Wren', 'Flicker', 'Hummingbird'] },
  { id: 'mend',      base: 0.050, attr: 'recovery', noun: 'healing received', more: 'receive {v} more healing', less: 'receive {v} less healing', figures: ['Spring', 'Moss', 'Bloom', 'Hearth', 'Salve'] },
  { id: 'wind',      base: 0.060, attr: 'recovery', noun: 'stamina recovery', more: 'recover stamina {v} faster', less: 'recover stamina {v} slower', figures: ['Ox', 'Marathon', 'Camel', 'Bellows', 'Wolf'] },
  { id: 'focus',     base: 0.060, attr: 'spirit',   noun: 'mana recovery', more: 'recover mana {v} faster', less: 'recover mana {v} slower', figures: ['Lotus', 'Lantern', 'Owl', 'Well', 'Crane'] },
  { id: 'vigor',     base: 0.060, attr: 'recovery', noun: 'health recovery', more: 'regenerate health {v} faster', less: 'regenerate health {v} slower', figures: ['Bear', 'Root', 'Phoenix', 'Briar', 'Kindling'] },
  // ROUND 398
  { id: 'weaponDamage', base: 0.045, attr: 'power', subj: 'atk', noun: 'weapon damage', more: 'hit {v} harder', less: 'hit {v} softer' },
  { id: 'swingThrift',  base: 0.120, attr: 'recovery', subj: 'atk', noun: 'swing stamina (lower)', more: 'cost {v} less stamina', neg: false },
  { id: 'swingSpeed',   base: 0.035, attr: 'speed', subj: 'atk', noun: 'swing speed', more: 'swing {v} faster', neg: false },
  { id: 'leech',        base: 0.020, attr: 'recovery', noun: 'leech', more: 'heal for {v} of the weapon damage you deal', neg: false },
  { id: 'killMend',     base: 0.030, attr: 'recovery', noun: 'health on a kill', more: 'restore {v} of your health on each kill', neg: false },
  { id: 'killWind',     base: 0.060, attr: 'recovery', noun: 'stamina on a kill', more: 'restore {v} of your stamina on each kill', neg: false },
  { id: 'killFocus',    base: 0.060, attr: 'spirit', noun: 'mana on a kill', more: 'restore {v} of your mana on each kill', neg: false },
];
for (const el of ELEMENTS6) {
  CHANNELS.push({ id: `spell_${el}`, base: 0.06, attr: 'spirit', subj: `sp_${el}`, element: el, noun: `${el} spell damage`,
    more: 'deal {v} more damage', less: 'deal {v} less damage' });
  CHANNELS.push({ id: `wscale_${el}`, base: 0.6, attr: 'power', subj: `sp_${el}`, element: el, soft: true, neg: false, times: true,
    noun: `${el} spells with your weapon's weight`, more: "also strike for {x} your weapon's damage" });
  for (const [to, base, word] of [['dodge', 0.01, 'dodge chance'], ['guard', 0.01, 'damage reduction'], ['damage', 0.012, 'damage'], ['crit', 0.008, 'critical chance']]) {
    CHANNELS.push({ id: `${to}Per_${el}`, base, attr: 'spirit', perResist: { to, el }, neg: false,
      noun: `${word} per ${el} resistance`, more: `gain {v} ${word} for every 20% ${el} resistance` });
  }
}
const CH = Object.fromEntries(CHANNELS.map(c => [c.id, c]));
const CO = Object.fromEntries(CONDITIONS.map(c => [c.id, c]));

/** Round 310's pairs (kept for the legacy arts' ids). */
export const TWIN_PAIRS = [
  ['moveSpeed', 'dodge'], ['damage', 'crit'], ['guard', 'vigor'], ['thrift', 'wind'],
  ['tempo', 'haste'], ['mend', 'vigor'], ['focus', 'haste'], ['wind', 'moveSpeed'],
];

const ESCAPE = { 'single': 'Lone', 'many-handed': 'Many-Handed' };
const cap = (s) => s.split(/(\s|-)/).map(p => (/^[a-z]/.test(p) ? p[0].toUpperCase() + p.slice(1) : p)).join('');
const cap1 = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

function pct(v) {
  const x = Math.abs(v) * 100;
  return `${x >= 10 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, '')}%`;
}
function times(v) { return `${(Math.round(v * 100) / 100).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}×`; }
const round3 = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------------------
// SIGNATURES -- the user's own six, in his words. `clauses` are the same fields the generated arts use.
// ---------------------------------------------------------------------------
export const SIGNATURE_ARTS = [
  { id: 'ma_patient_hunter', name: 'Way of the Patient Hunter', theme: 'sit',
    cond: 'still', fx: { thrift: 0.05 },
    text: 'reduces mana and stamina costs by 5% while holding still' },
  { id: 'ma_inevitable_stinger', name: 'Way of the Inevitable Stinger', theme: 'sit',
    cond: 'perdot', fx: { moveSpeed: 0.005, dodge: 0.005 },
    text: 'increases movement speed and dodge by 0.5% for each enemy near you with a damage-over-time effect' },
  // "single target attacks with a cooldown are 3% stronger, and have their cooldown reduced by 1%" -- applied to the
  // player's damage and cooldown recovery as a whole (round 310's note).
  { id: 'ma_meteor', name: 'Way of the Meteor', theme: 'sit',
    cond: 'always', fx: { damage: 0.03, tempo: 0.01 },
    text: 'your attacks are 3% stronger and your cooldowns recover 1% faster' },
  // ROUND 398 -- the user's three.
  { id: 'ma_fanged_serpent', name: 'Way of the Fanged Serpent', theme: 'w_dagger',
    cond: 'w_dagger', fx: { weaponDamage: 0.05, dodge: 0.02 },
    text: 'deals 5% more damage with daggers and gains 2% dodge chance while wielding a dagger' },
  { id: 'ma_striking_meteor', name: 'Style of the Striking Meteor', theme: 'w_great',
    cond: 'w_great', fx: { swingThrift: 0.10, weaponDamage: 0.05, swingSpeed: 0.03 },
    text: 'attacks with great weapons cost 10% less stamina, hit 5% harder, and swing 3% faster' },
  { id: 'ma_shifting_flame', name: 'Way of the Shifting Flame', theme: 'el_fire',
    cond: 'always', fx: { wscale_fire: 1.1, dodgePer_fire: 0.01 },
    text: "fire spells scale with weapon damage (they also strike for 1.1× your weapon's damage), and dodge chance "
      + 'scales with fire resistance (gain 1% dodge for every 20% fire resistance)' },
];

export const ART_PREFIXES = ['Way', 'Style', 'School', 'Path', 'Form', 'Discipline', 'Stance', 'Method'];

// ---------------------------------------------------------------------------
// THE BUILD
// ---------------------------------------------------------------------------
function rng(seed) {
  let h = 2166136261;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
}
function combos(arr, k) {
  const out = [];
  const rec = (start, pick) => {
    if (pick.length === k) { out.push(pick.slice()); return; }
    for (let i = start; i < arr.length; i++) { pick.push(arr[i]); rec(i + 1, pick); pick.pop(); }
  };
  rec(0, []);
  return out;
}
const SHARE = [0, 1, 0.7, 0.55];

function build() {
  const out = [];
  const used = new Set();
  const ids = new Set();
  const legacyUniq = (name) => {
    let n = name, k = 2;
    while (used.has(n)) { n = `${name} ${['II', 'III', 'IV', 'V', 'VI'][k - 2] || k}`; k++; }
    used.add(n); return n;
  };
  for (const s of SIGNATURE_ARTS) {
    used.add(s.name); ids.add(s.id);
    out.push({ ...s, signature: true, clauses: [{ cond: s.cond, fx: s.fx }] });
  }
  // ---- round 310's arts, kept so a save that follows one keeps it; not offered any more ----
  CONDITIONS.slice(0, 26).forEach((co, ci) => {
    CHANNELS.slice(0, 12).forEach((ch, hi) => {
      if (co.id === 'still' && ch.id === 'thrift') return;
      const e = co.epithets[(ci + hi) % co.epithets.length];
      const f = ch.figures[(ci * 3 + hi) % ch.figures.length];
      const name = legacyUniq(`Way of the ${cap(ESCAPE[e] || e)} ${f}`);
      const id = `ma_${co.id}_${ch.id}`;
      ids.add(id);
      out.push({ id, name, cond: co.id, fx: { [ch.id]: ch.base * co.w }, legacy: true, text: '' });
    });
    TWIN_PAIRS.forEach(([a, b], pi) => {
      if ((ci + pi) % 2) return;
      const A = CH[a], B = CH[b];
      const e = co.epithets[(ci + pi + 2) % co.epithets.length];
      const f = A.figures[(ci + pi) % A.figures.length];
      const name = legacyUniq(`Way of the ${cap(ESCAPE[e] || e)} ${f}`);
      const w = co.w * 0.7;
      const id = `ma_${co.id}_${a}_${b}`;
      ids.add(id);
      out.push({ id, name, cond: co.id, fx: { [a]: A.base * w, [b]: B.base * w }, legacy: true, text: '' });
    });
  });

  // ---- round 398's arts ----
  // A name: "<Prefix> of the <Epithet> <Figure>", unique. Tries the theme's own epithets and figures in a seeded
  // order, then the other prefixes, before ever falling back to a numeral.
  const named = (seed, epithets, figures) => {
    const r = rng(`name|${seed}`);
    const E = epithets.slice().sort(() => r() - 0.5), F = figures.slice().sort(() => r() - 0.5);
    const P = ART_PREFIXES.slice().sort(() => r() - 0.5);
    for (const p of P) for (const e of E) for (const f of F) {
      const n = `${p} of the ${cap(ESCAPE[e] || e)} ${f}`;
      if (!used.has(n)) { used.add(n); return n; }
    }
    return legacyUniq(`${P[0]} of the ${cap(E[0])} ${F[0]}`);
  };
  const fig = (chId) => (CH[chId] && CH[chId].figures) || ['Wanderer', 'Pilgrim', 'Sage', 'Stranger', 'Teacher'];
  const add = (id, theme, clauses, epithets, figures) => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const c of clauses) for (const k of Object.keys(c.fx)) c.fx[k] = round3(c.fx[k]);
    out.push({ id, theme, clauses, name: named(id, epithets, figures), text: '' });
  };
  const bag = (chs, w) => {
    const s = SHARE[chs.length] || 0.5;
    return Object.fromEntries(chs.map(c => [c, CH[c].base * w * s]));
  };

  // 1. WEAPON arts: every pair of the weapon's channels, and a few triples.
  for (const st of WEAPON_STYLES) {
    const cond = `w_${st.id}`;
    for (const pair of combos(st.ch, 2)) add(`ma_${cond}_${pair.join('_')}`, cond, [{ cond, fx: bag(pair, st.w) }], st.epithets, st.figures);
    const tri = combos(st.ch, 3);
    const r = rng(`tri|${st.id}`);
    for (let i = 0; i < 6 && tri.length; i++) {
      const t = tri.splice(Math.floor(r() * tri.length), 1)[0];
      add(`ma_${cond}_${t.join('_')}`, cond, [{ cond, fx: bag(t, st.w) }], st.epithets, st.figures);
    }
  }
  // 2. WEAPON + SITUATION: the weapon's first channel while wielding it, and a situational gift on top.
  const SIT = ['still', 'moving', 'hurt', 'hale', 'afterkill', 'afterhit', 'crowd', 'duel', 'night', 'day', 'stamfull', 'stamlow'];
  for (const st of WEAPON_STYLES.filter(s => !s.group)) {
    const cond = `w_${st.id}`;
    const r = rng(`ws|${st.id}`);
    for (let i = 0; i < 6; i++) {
      const sit = CO[SIT[Math.floor(r() * SIT.length)]];
      const a = st.ch[Math.floor(r() * st.ch.length)];
      let b = st.ch[Math.floor(r() * st.ch.length)];
      if (b === a) b = st.ch[(st.ch.indexOf(a) + 1) % st.ch.length];
      add(`ma_${cond}_${a}__${sit.id}_${b}`, cond,
        [{ cond, fx: bag([a], st.w * 0.8) }, { cond: sit.id, fx: bag([b], sit.w) }],
        [...st.epithets, ...sit.epithets], st.figures);
    }
  }
  // 3. ELEMENT arts.
  const EL_EPI = {
    fire: ['shifting', 'burning', 'kindled', 'smouldering', 'roaring', 'ember-eyed'], frost: ['frozen', 'still-water', 'winter', 'rimed', 'biting', 'glacial'],
    lightning: ['crackling', 'storm-born', 'flashing', 'thundering', 'forked', 'restless'], nature: ['rooted', 'green', 'thorned', 'blooming', 'wild', 'mossy'],
    shadow: ['veiled', 'hollow', 'dusk', 'unseen', 'eclipsed', 'whispering'], radiant: ['dawning', 'gilded', 'shining', 'haloed', 'morning', 'blazing'],
  };
  const EL_FIG = {
    fire: ['Flame', 'Ember', 'Phoenix', 'Salamander', 'Forge', 'Cinder'], frost: ['Glacier', 'Frost', 'Snow Owl', 'Ermine', 'Icicle', 'Walrus'],
    lightning: ['Storm', 'Thunderbird', 'Spark', 'Bolt', 'Squall', 'Eel'], nature: ['Thorn', 'Oak', 'Vine', 'Stag', 'Briar', 'Bramble'],
    shadow: ['Shade', 'Night', 'Bat', 'Raven', 'Eclipse', 'Moth'], radiant: ['Dawn', 'Sun', 'Lantern', 'Halo', 'Lark', 'Beacon'],
  };
  const PER = ['dodge', 'guard', 'damage', 'crit'];
  for (const el of ELEMENTS6) {
    const theme = `el_${el}`;
    const E = EL_EPI[el], F = EL_FIG[el];
    const sp = `spell_${el}`, ws = `wscale_${el}`;
    // the weapon's weight in the element's spells, with each resistance gift
    for (const to of PER) add(`ma_${ws}_${to}Per_${el}`, theme, [{ cond: 'always', fx: { [ws]: 0.6, [`${to}Per_${el}`]: CH[`${to}Per_${el}`].base } }], E, F);
    // the element's spells harder, with each resistance gift
    for (const to of PER) add(`ma_${sp}_${to}Per_${el}`, theme, [{ cond: 'always', fx: { [sp]: 0.05, [`${to}Per_${el}`]: CH[`${to}Per_${el}`].base } }], E, F);
    // two resistance gifts
    for (const [a, b] of combos(PER, 2)) add(`ma_${a}Per_${el}_${b}Per_${el}`, theme,
      [{ cond: 'always', fx: { [`${a}Per_${el}`]: CH[`${a}Per_${el}`].base * 0.8, [`${b}Per_${el}`]: CH[`${b}Per_${el}`].base * 0.8 } }], E, F);
    // the element's spells under a situation, with a second channel
    for (const [ci, c] of ['still', 'hurt', 'manafull', 'manalow', 'night', 'day', 'crowd', 'w_staff', `res_${el}`, 'afterhit'].entries()) {
      const co = CO[c];
      const second = ['haste', 'focus', 'tempo', 'guard', 'crit', 'killFocus', 'dodge', 'moveSpeed', 'weaponDamage', 'mend'][ci];
      add(`ma_${c}_${sp}_${second}`, theme, [{ cond: c, fx: bag([sp, second], co.w) }], [...E, ...(co.epithets || [])], F);
    }
    // the weapon's weight, while holding particular weapons
    for (const w of ['w_staff', 'w_sword', 'w_great', 'w_single', 'w_spear', 'w_dagger']) {
      add(`ma_${w}_${ws}`, theme, [{ cond: w, fx: { [ws]: 0.5 } }, { cond: 'always', fx: { [sp]: 0.03 } }], E, F);
    }
  }
  // 4. SITUATIONS: every condition with a spread of two- and three-channel bags.
  const SITCH = ['moveSpeed', 'dodge', 'damage', 'crit', 'guard', 'thrift', 'tempo', 'haste', 'mend', 'wind', 'focus', 'vigor',
    'weaponDamage', 'swingThrift', 'swingSpeed', 'leech', 'killMend', 'killWind', 'killFocus'];
  const sitConds = CONDITIONS.filter(c => !c.weapon && !c.element);
  sitConds.forEach((co) => {
    const r = rng(`sit|${co.id}`);
    const pairs = combos(SITCH, 2);
    for (let i = 0; i < 12; i++) {
      const p = pairs.splice(Math.floor(r() * pairs.length), 1)[0];
      add(`ma_${co.id}_${p.join('_')}`, `sit_${co.id}`, [{ cond: co.id, fx: bag(p, co.w) }], co.epithets, fig(p[0]));
    }
    const tris = combos(SITCH, 3);
    for (let i = 0; i < 4; i++) {
      const t = tris.splice(Math.floor(r() * tris.length), 1)[0];
      add(`ma_${co.id}_${t.join('_')}`, `sit_${co.id}`, [{ cond: co.id, fx: bag(t, co.w) }], co.epithets, fig(t[0]));
    }
  });
  // 5. TWO-FACED arts: one thing on each side of a line.
  const FACES = [['still', 'moving'], ['hurt', 'hale'], ['night', 'day'], ['manalow', 'manafull'], ['stamlow', 'stamfull'],
    ['crowd', 'duel'], ['combat', 'calm'], ['high', 'low'], ['unarmed', 'armed']];
  for (const [a, b] of FACES) {
    const A = CO[a], B = CO[b];
    const r = rng(`face|${a}|${b}`);
    for (let i = 0; i < 10; i++) {
      const x = SITCH[Math.floor(r() * SITCH.length)];
      let y = SITCH[Math.floor(r() * SITCH.length)];
      if (y === x) y = SITCH[(SITCH.indexOf(x) + 5) % SITCH.length];
      add(`ma_${a}_${x}__${b}_${y}`, `face_${a}`, [{ cond: a, fx: bag([x], A.w * 0.85) }, { cond: b, fx: bag([y], B.w * 0.85) }],
        [...A.epithets, ...B.epithets], [...fig(x), ...fig(y)]);
    }
  }
  // 6. BARGAINS: a large gift under a condition, paid for with a small loss at all times.
  const LOSS = ['moveSpeed', 'dodge', 'damage', 'crit', 'guard', 'tempo', 'haste', 'mend', 'wind', 'focus', 'vigor', 'weaponDamage'];
  const BCOND = [...sitConds.filter(c => !c.per && c.id !== 'always').map(c => c.id), ...WEAPON_STYLES.map(s => `w_${s.id}`)];
  {
    const r = rng('bargain');
    for (let i = 0; i < 160; i++) {
      const c = BCOND[Math.floor(r() * BCOND.length)];
      const co = CO[c];
      const pool = co.weapon ? WS[co.weapon].ch : SITCH;
      const gift = pool[Math.floor(r() * pool.length)];
      let loss = LOSS[Math.floor(r() * LOSS.length)];
      if (loss === gift) loss = LOSS[(LOSS.indexOf(loss) + 3) % LOSS.length];
      if (loss === gift) continue;
      add(`ma_${c}_${gift}__cost_${loss}`, co.weapon ? `w_${co.weapon}` : `bargain_${c}`,
        [{ cond: c, fx: { [gift]: CH[gift].base * co.w * 1.9 } }, { cond: 'always', fx: { [loss]: -CH[loss].base * 0.6 } }],
        [...(co.epithets || []), 'reckless', 'sworn', 'costly', 'bargained', 'blood-paid'], co.weapon ? WS[co.weapon].figures : fig(gift));
    }
  }

  for (const art of out) {
    if (!art.clauses) art.clauses = [{ cond: art.cond, fx: art.fx }];
    if (!art.text) art.text = describeArt(art, 1);
    if (!art.theme) art.theme = 'legacy';
  }
  return out;
}

/** One clause, at a scale: "you deal 4.5% more damage and gain 1.7% dodge chance while wielding a dagger". */
export function describeClause(cl, scale = 1) {
  const co = CO[cl.cond];
  if (!co) return '';
  const groups = [];
  for (const [k, raw] of Object.entries(cl.fx)) {
    const ch = CH[k];
    if (!ch) continue;
    const s = ch.soft ? 1 + (scale - 1) * MARTIAL_SOFT_GROWTH : scale;
    const v = raw * s;
    const tpl = v < 0 ? (ch.less || ch.more) : ch.more;
    const phrase = tpl.replace('{v}', pct(v)).replace('{x}', times(v));
    const subj = ch.subj === 'atk' ? 'your weapon attacks'
      : ch.subj && ch.subj.startsWith('sp_') ? `your ${EL_LABEL[ch.element]} spells` : 'you';
    const g = groups.find(x => x.subj === subj);
    if (g) g.p.push(phrase); else groups.push({ subj, p: [phrase] });
  }
  const list = (a) => a.length < 2 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
  const body = groups.map(g => `${g.subj} ${list(g.p)}`).join(', and ');
  const when = co.id === 'always' ? '' : ` ${co.text}${co.per ? ` (up to ${co.cap})` : ''}`;
  return `${body}${when}`;
}

/** The whole art: its clauses, the always-on one last ("...; at all times, you move 1.2% slower"). */
export function describeArt(art, scale = 1) {
  const a = typeof art === 'string' ? MARTIAL_BY_ID[art] : art;
  if (!a) return '';
  const cls = a.clauses || [{ cond: a.cond, fx: a.fx }];
  const parts = cls.map(cl => {
    const t = describeClause(cl, scale);
    return cl.cond === 'always' && cls.length > 1 ? `at all times, ${t}` : t;
  });
  return cap1(parts.join('; '));
}

/** Round 310's one-clause description, kept for callers that pass (fx, cond). */
export function describeEffects(fx, condId, scale = 1) {
  return describeClause({ cond: condId, fx }, scale);
}

export const MARTIAL_ARTS = build();
export const MARTIAL_BY_ID = Object.fromEntries(MARTIAL_ARTS.map(a => [a.id, a]));
/** The arts a run can offer: everything but round 310's legacy rows. */
export const OFFERED_ARTS = MARTIAL_ARTS.filter(a => !a.legacy);

export function martialArt(id) { return MARTIAL_BY_ID[id] || null; }

/**
 * What an art does RIGHT NOW. `ctx` carries the live readings named by the condition keys (booleans, and counts for
 * the per-count ones), `scale` from martialScale, an optional `attr` bag {power, spirit, speed, recovery}, and
 * `resist` {fire: 0.25, ...} for the resistance-scaled channels (folded into dodge / guard / damage / crit here).
 * Returns {} when no clause holds.
 */
export function effectsFor(art, ctx) {
  const a = typeof art === 'string' ? MARTIAL_BY_ID[art] : art;
  if (!a || !ctx) return {};
  const out = {};
  const base = ctx.scale || 1;
  for (const cl of (a.clauses || [{ cond: a.cond, fx: a.fx }])) {
    const co = CO[cl.cond];
    if (!co) continue;
    let n = 1;
    if (co.per) n = Math.min(co.cap || 8, Number(ctx[co.key]) || 0);
    else if (!ctx[co.key]) continue;
    if (!(n > 0)) continue;
    for (const [k, v] of Object.entries(cl.fx)) {
      const ch = CH[k];
      const lift = 1 + MARTIAL_ATTR_LIFT * Math.max(0, (ctx.attr && ch && ctx.attr[ch.attr]) || 0);
      const s = ch && ch.soft ? 1 + (base - 1) * MARTIAL_SOFT_GROWTH : base;
      let val = v * n * s * lift;
      if (ch && ch.perResist) {
        const r = Math.max(0, Number((ctx.resist || {})[ch.perResist.el]) || 0);
        val *= Math.floor(r / RESIST_STEP + 1e-9);
        out[ch.perResist.to] = (out[ch.perResist.to] || 0) + val;
        continue;
      }
      out[k] = (out[k] || 0) + val;
    }
  }
  return out;
}

/** The card for one art, at a given scale -- what the book shows, and what the player's own sheet shows. */
export function artCard(art, scale = 1) {
  const a = typeof art === 'string' ? MARTIAL_BY_ID[art] : art;
  if (!a) return '';
  if (a.signature && Math.abs(scale - 1) < 1e-9) return `${a.name}: ${cap1(a.text)}. It improves at every rank.`;
  return `${a.name}: ${describeArt(a, scale)}. It improves at every rank.`;
}

/** ROUND 398 -- the arts this run offers: RUN_POOL_SIZE, shuffled from the whole offer by the run's seed, no more
 *  than four from any one theme so a run's handful is spread across weapons, elements and situations. */
const _poolCache = new Map();
export function runMartialPool(runSeed) {
  if (!runSeed && runSeed !== 0) return OFFERED_ARTS;
  const key = String(runSeed);
  if (_poolCache.has(key)) return _poolCache.get(key);
  const r = rng(`pool|${key}`);
  const a = OFFERED_ARTS.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const per = {};
  const out = [];
  for (const art of a) {
    if (out.length >= RUN_POOL_SIZE) break;
    const t = art.theme || 'x';
    if ((per[t] || 0) >= 4) continue;
    per[t] = (per[t] || 0) + 1;
    out.push(art);
  }
  if (_poolCache.size > 8) _poolCache.clear();
  _poolCache.set(key, out);
  return out;
}

/** A daily shelf: `n` arts a seller offers today, drawn from the run's pool by the day and the counter. */
export function shelfFor(dayNumber, n = 14, cityKey = '', runSeed = null) {
  const rnd = rng(`${dayNumber}|${cityKey}`);
  const pool = runMartialPool(runSeed);
  const out = [];
  const seen = new Set();
  while (out.length < n && seen.size < pool.length) {
    const a = pool[Math.floor(rnd() * pool.length)];
    if (seen.has(a.id)) continue;
    seen.add(a.id); out.push(a);
  }
  return out;
}

// ---------------------------------------------------------------------------
// ROUND 398 -- THE MASTERS. MASTER_COUNT of them, in settlements the run's seed picks, each teaching one art of the
// run's pool (not one the day's shelves happen to hold: a master is how a player who wants THAT art gets it).
// ---------------------------------------------------------------------------
// ROUND 399 -- a master's body is one of the eight characters of public/assets/masters (masterArt.js picks the
// character, the stance from the art's weapon or element, and one of 20+ palettes); the name fits the body.
const MASTER_NAMES_M = ['Old Teodric', 'Master Hollis', 'Wen the Quiet', 'Brother Calder', 'Master Odo', 'Kesh of the Long Road',
  'Old Brannoc', 'Aldo the Patient', 'Master Rurik', 'Han Ironwrist', 'Father Osric', 'Sabo the Lean', 'Master Dunstan', 'Ivo Ashfoot'];
const MASTER_NAMES_W = ['Sister Ama', 'Grandmother Iska', 'Rasa Ninefingers', 'The Widow Pell', 'Master Ilse', 'Tamsin Greyhand',
  'Mother Sefa', 'Master Juno', 'Yara of the Reeds', 'Old Mag Corrow', 'Master Seren', 'Kaya Stillwater', 'Wren Halloway', 'Mistress Oda'];
// ROUND 401 -- two hundred masters want two hundred names: a given name and a way of being called, per body.
export const GIVEN_M = ['Teodric', 'Hollis', 'Calder', 'Odo', 'Kesh', 'Brannoc', 'Aldo', 'Rurik', 'Osric', 'Sabo', 'Dunstan', 'Ivo', 'Garet',
  'Halvard', 'Tomas', 'Jory', 'Benedek', 'Ansel', 'Corvin', 'Darrow', 'Emeric', 'Fennick', 'Gideon', 'Harl', 'Ishaan', 'Jonah', 'Kalen',
  'Lucan', 'Matthias', 'Niall', 'Orren', 'Pell', 'Quill', 'Rowan', 'Soren', 'Tavish', 'Ulric', 'Varro', 'Wystan', 'Yorick', 'Zeb', 'Akio',
  'Bram', 'Cass', 'Dov', 'Eskel', 'Faro', 'Gunnar'];
export const GIVEN_W = ['Ama', 'Iska', 'Rasa', 'Pell', 'Ilse', 'Tamsin', 'Sefa', 'Juno', 'Yara', 'Mag', 'Seren', 'Kaya', 'Wren', 'Oda', 'Adela',
  'Brisa', 'Corra', 'Dagny', 'Esme', 'Fenna', 'Greta', 'Hesper', 'Ione', 'Jessamy', 'Kestrel', 'Liesl', 'Maren', 'Nell', 'Orla', 'Petra',
  'Quinn', 'Rhosyn', 'Saoirse', 'Thea', 'Una', 'Vesna', 'Willa', 'Xanthe', 'Ysolde', 'Zora', 'Aiko', 'Bettany', 'Cerys', 'Dilys', 'Elowen',
  'Fia', 'Gwenna', 'Hana'];
const STYLE_M = ['Master {n}', 'Old {n}', 'Brother {n}', 'Father {n}', '{n} the Quiet', '{n} the Patient', '{n} Ironwrist', '{n} Ashfoot',
  '{n} of the Long Road', '{n} Stonepalm', '{n} the Unhurried', '{n} Greycloak'];
const STYLE_W = ['Master {n}', 'Old {n}', 'Sister {n}', 'Mother {n}', 'Grandmother {n}', '{n} the Quiet', '{n} Ninefingers', '{n} Stillwater',
  '{n} of the Reeds', '{n} Greyhand', '{n} the Unbowed', 'Mistress {n}'];
function masterName(r, woman, used) {
  const G = woman ? GIVEN_W : GIVEN_M, S = woman ? STYLE_W : STYLE_M;
  for (let i = 0; i < 60; i++) {
    const n = S[Math.floor(r() * S.length)].replace('{n}', G[Math.floor(r() * G.length)]);
    if (!used.has(n)) { used.add(n); return n; }
  }
  return `${woman ? 'Mistress' : 'Master'} ${G[Math.floor(r() * G.length)]} ${used.size}`;
}
export const MASTER_PRICE_MULT = 1.5;

/** `places`: [{key, cls?: 'village'|'wild'|'deep'|'dojo', tier?, region?, ...}] -- every place a master may stand.
 *  Returns [{...place, art, name, char, stance, palette, ramp, flame, element}]: the art, and a master dressed for it
 *  (masterArt.js `masterLook`).
 *  ROUND 401 -- DOJO_SQUARE_SHARE of the dojo places (the world map's explorable squares) and STORY_REGION_MASTERS
 *  from the story regions' hamlets, wilds and deep wilds, in turn. Every art of the run's pool is taught by someone
 *  before any is taught twice. */
export function martialMasters(runSeed, places) {
  const r = rng(`masters|${runSeed}`);
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const all = shuffle((places || []).slice());
  const dojos = all.filter(p => p.cls === 'dojo');
  const story = all.filter(p => p.cls !== 'dojo');
  const chosen = dojos.slice(0, Math.round(dojos.length * DOJO_SQUARE_SHARE));
  const byCls = {};
  for (const p of story) (byCls[p.cls || 'village'] || (byCls[p.cls || 'village'] = [])).push(p);
  const kinds = Object.keys(byCls);
  const wantStory = dojos.length ? STORY_REGION_MASTERS : Math.min(MASTER_COUNT, story.length);
  for (let i = 0, got = 0; got < wantStory && i < wantStory * 4 + 8; i++) {
    const k = kinds[i % kinds.length];
    const next = byCls[k] && byCls[k].shift();
    if (next) { chosen.push(next); got++; }
    if (!kinds.some(x => byCls[x] && byCls[x].length)) break;
  }
  const base = shuffle(runMartialPool(runSeed).slice());
  const used = new Set();
  const usedChars = new Set();
  const out = [];
  chosen.forEach((pl, i) => {
    const art = base[i % base.length];
    if (!art) return;
    if (usedChars.size >= MASTER_CHAR_KEYS.length) usedChars.clear();
    const look = masterLook(art, `${runSeed}|${pl.key}`, usedChars);
    const name = masterName(r, look.char.startsWith('w_'), used);
    out.push({ ...pl, art: art.id, name, ...look });
  });
  return out;
}

/** ROUND 400 -- the rank of country a style's GREAT master stands in, per run: "Some styles may be accessible with a
 *  master at iron rank, others may only exist in the gold rank of the southern hemisphere." 1 iron .. 4 gold. */
export const GREAT_MASTER_TIER_WEIGHTS = [0, 0.35, 0.3, 0.2, 0.15];
export function greatMasterTier(runSeed, artId) {
  const x = rng(`greattier|${runSeed}|${artId}`)();
  let acc = 0;
  for (let t = 1; t < GREAT_MASTER_TIER_WEIGHTS.length; t++) { acc += GREAT_MASTER_TIER_WEIGHTS[t]; if (x < acc) return t; }
  return 4;
}
/** The great master of `artId` this run: a place of the style's tier (gold: only the south, `p.south`), never one a
 *  run master already holds (`taken`, a Set of keys), and a master dressed for the art. */
export function greatMaster(runSeed, artId, places, taken = null) {
  const art = MARTIAL_BY_ID[artId];
  if (!art) return null;
  const tier = greatMasterTier(runSeed, artId);
  const free = (places || []).filter(p => !(taken && taken.has(p.key)) && p.cls !== 'village');
  let pool = free.filter(p => p.tier === tier && (tier < 4 || p.south));
  if (!pool.length) pool = free.filter(p => p.tier === tier);
  if (!pool.length) pool = free.filter(p => Math.abs((p.tier || 0) - tier) <= 1);
  if (!pool.length) pool = free;
  if (!pool.length) return null;
  const r = rng(`great|${runSeed}|${artId}`);
  const pl = pool[Math.floor(r() * pool.length)];
  const look = masterLook(art, `${runSeed}|great|${pl.key}`);
  const list = look.char.startsWith('w_') ? MASTER_NAMES_W : MASTER_NAMES_M;
  const base = list[Math.floor(r() * list.length)].replace(/^(Master|Mistress|Old|Sister|Brother|Mother|Father|Grandmother) /, '');
  return { ...pl, art: art.id, name: `Grandmaster ${base}`, great: true, tier, ...look };
}

const NAME_RE = new RegExp(`^(${ART_PREFIXES.join('|')}) of the `);
export function martialFaults() {
  const out = [];
  if (OFFERED_ARTS.length < 1000) out.push(`only ${OFFERED_ARTS.length} martial arts on offer; the ruling says "super varied"`);
  const ids = new Set(), names = new Set();
  for (const a of MARTIAL_ARTS) {
    if (ids.has(a.id)) out.push(`duplicate martial art id ${a.id}`);
    if (names.has(a.name)) out.push(`duplicate martial art name ${a.name}`);
    ids.add(a.id); names.add(a.name);
    for (const cl of a.clauses) {
      if (!CO[cl.cond]) out.push(`${a.id} has an unknown condition ${cl.cond}`);
      for (const k of Object.keys(cl.fx)) {
        if (!CH[k]) out.push(`${a.id} has an unknown channel ${k}`);
        else if (cl.fx[k] < 0 && CH[k].neg === false) out.push(`${a.id} takes away ${k}, which the runtime cannot take away`);
        if (!Number.isFinite(cl.fx[k]) || cl.fx[k] === 0) out.push(`${a.id} has a zero or broken figure for ${k}`);
      }
    }
    if (!NAME_RE.test(a.name)) out.push(`${a.name} is not named "<Way|Style|...> of the ..."`);
    if (/undefined|NaN/.test(a.text) || /undefined|NaN/.test(a.name)) out.push(`${a.id} reads ${a.name}: ${a.text}`);
  }
  return out;
}
