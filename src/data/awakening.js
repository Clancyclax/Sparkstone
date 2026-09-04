// RESTORED round 5, CORRECTED round 6 -- the essence/awakening-stone/
// confluence ability generation system, ported back from the original
// sparkstone_prototype.html (the canonical 22MB build). The user's standing
// directive, verbatim: "The essence/awajening stone architecture is the
// single most important aspect of the gameplay... DO NOT REMOVE THESE
// SYSTEMS UNDER UNLESS SPECIFICALLY DIRECTED."
//
// Round-5 port provenance (line refs into sparkstone_prototype.html):
//   - CONFLUENCE_NAMES: the authentic 101-name confluence list (line 1753),
//     verbatim, plus resolveConfluenceName's stable-hash pick (line 1755).
//   - confluenceThemeFor + CONFLUENCE_THEME_OVERRIDES (line 2932).
//   - The category taxonomy + '{A}'-substituted name banks (line 1909) --
//     now demoted to FALLBACK naming, see the round-6 note below.
//   - rebuildKnownAbilities' threading discipline (line 3062): ONE shared
//     usedNames set, ONE shared aura counter (cap 1, rarely 2), ONE shared
//     perception counter (cap 1, rarely 2), pairOccurrence/variantIndex.
//   - computeHasMultiAuraPassive/computeHasMultiPerceptionPassive (line
//     2994): the ~1-in-300 essence-triplet rare cap-raisers.
//   - The v0.34 Normal-until-bonded rank rule and the v0.35 12-active/
//     8-passive shape with the 2-movement cap.
//
// ROUND 6 corrections (user's list, applied here):
//   1. Attribute economy reworked (inventory.js): binding grants 1 point,
//      +1 per rank past Iron -- stones no longer feed attributes, so the
//      only thing a socket grants is its generated ability.
//   2. NEW attr_boost passive category ("Strength of Atlas" / "Gaia's
//      Fountain" pattern): +1 to the slot's bound attribute per rank from
//      Iron up.
//   3. REAL names throughout: the 12-stone catalog (inventory.js
//      STONE_DEFS) now uses verbatim awakening stones from the user's
//      HWFWM_TTRPG.xlsx "Awakening Stones" sheet; generated abilities
//      draw their names from the sheet's own 7,300-row "Skills" tab
//      (skillNames.js, keyed by essence AND confluence essence + type),
//      preferring names that carry the stone's theme word; the round-5
//      synthetic name banks survive only as a last-resort fallback.
//   4. Every ability spec carries a `stats` line (real damage/cooldown/
//      duration numbers) alongside its flavor `desc`.
//   5. Active buffs retuned to the powerful/short/long-cooldown pattern
//      (+30-45% damage 30s / 5min cd), plus two NEW buff templates from
//      the user's own examples: physical immunity (8-12s / 10min) and
//      time freeze (stops every creature in aura range 5s / 10min).
//
// ROUND 47 corrections (the user's balance list, items 3-5):
//   3. BUFF CAP. "Spawning too many 'buff' abilities a player should have 2
//      buff spells maximum." Threaded exactly like the round-5 aura and
//      perception counters: ONE shared buffState object created in
//      rebuildKnownAbilities and passed through every pool build, every
//      signature probe and every tryCat, so the cap holds across the WHOLE
//      kit (innates included) rather than per socket. What counts is the
//      five kind:'active' + category:'buff' categories, marked isBuff below.
//   4. MOVEMENT RETUNE. "Movement skills are costing too much stamina making
//      them hardly worth more than sprinting. Reduce the cost by 50% and
//      double the durations." MOVEMENT_COST_MULT halves every movement
//      active's stamina price in assignAbilityCost; MOVEMENT_DURATION_MULT
//      doubles the one movement duration the generator rolls (movementHaste's
//      buffDuration). Dash/teleport are instantaneous -- see the note on
//      MOVEMENT_DURATION_MULT for why their distances were left alone. The
//      round-5 2-movement cap is untouched.
//   5. TRIGGERED PASSIVES. "Some passive abilities should be triggered
//      abilities" -- four of them, from the user's own examples, generated
//      like everything else (real sheet names, stone-themed flavor, a stats
//      line). They keep kind:'passive' so the existing passive budget, the
//      roster and the 8-passive shape all keep working; what marks them is
//      template === TRIGGERED_PASSIVE_TEMPLATE plus a machine-readable
//      `trigger`/`effect` pair the runtime switches on (TRIGGER_KINDS).
//
// HWFWM lore rules honored: every essence user's kit wants an aura and a
// perception power (those categories probe first until owned); ranks run
// normal -> iron -> bronze -> silver -> gold -> diamond; the confluence is
// determined by WHICH three essences are combined.
// ROUND 48 -- "An awakening stone of fire in an ape essence shouldn't be a
// simple 'gain 15% crit chance' or 'throw a fireball' but should take a look at
// the intersection between the two with more weight on the essence itself."
//
// The two data files below are that intersection. essenceLevers.js says what
// KIND of mechanic an essence produces (the lever) and what a stone is MADE of
// (the material); essenceMotifs.js gives every essence its own levers, body
// parts, verbs and adjectives. Everything downstream of this import -- the
// category bias, the mechanical twist, the description and the name -- now
// reads the essence first and the stone second.
import { LEVERS, elementForFamily } from './essenceLevers.js';
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { SHEET_SKILLS } from './skillNames.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { ESSENCE_SIGNATURES } from './essenceAbilities.js';
// ROUND 51 -- the charters: what an essence is allowed to REFUSE.
import { charterFor, charterAllows, categoryDeals, LEVER_CHARTERS } from './leverCharters.js';
// ROUND 52 PHASE 2 -- conditional scaling: the lever decides WHETHER, the
// stone's family decides WHAT. See abilityScaling.js.
import {
  SCALE_MODES, SCALING_SIGNATURES, scaleModeForFamily, scaleDelayForFamily,
  scalingClause, scalableMagnitude,
  SCALE_CLAUSE_VARIANTS,   // ROUND 74 -- how many phrasings a mode carries
} from './abilityScaling.js';
// ROUND 53 -- an essence's levers are now a REPERTOIRE, and which of them it
// actually uses is decided by the trio it was bonded alongside. See
// leverRepertoire.js for why this is the layer the separation problem lives on.
import { repertoireFor, leverOrderFor, leverSpine } from './leverRepertoire.js';
// ROUND 53 -- the confluence stops being a special case. See confluenceConcepts.js.
import { conceptFor } from './confluenceConcepts.js';
// ROUND 55 -- the twenty hand-authored confluences.
import { confluenceSignaturesFor, MARQUEE_CONFLUENCES } from './confluenceSignatures.js';
import { rollBuffs, formatBuff, ELEMENT_TYPES } from './stats.js';
import { ESSENCE_MOTIFS } from './essenceMotifs.js';
// ROUND 47 (item 7) -- weapon affinities name a real weapon, so the taxonomy
// comes from the weapon table itself rather than a parallel list that could
// drift out of step with it. weapons.js imports nothing, so this is a leaf.
// ROUND 74 -- WEAPON_ORDER left with `weaponFromTheme`. Its only reader was
// that function's seeded fallback ("pick any of the seven"), and the fallback
// is what the user's item 6 was a report of. `isRangedWeapon` arrived with the
// four new weapons: only a weapon that puts something in the air can roll a
// split, a pierce or a bounce.
import { WEAPONS, isRangedWeapon, canBeWieldedOneHanded, MELEE_ORDER } from './weapons.js';
// ROUND 77 -- the rank ladder, for the attribute abilities' rank riders.
import { RANK_ORDER } from './ranks.js';
import { DEBUFFS, thematicDebuffsFor, debuffDuration, debuffClause } from './debuffs.js';
import {
  SUMMON_KINDS, rollSummonTiming, summonStrength, summonNoun,
  summonTimeWord, summonTimeShort, clampSummonCooldown,
} from './activeSummons.js';
// ROUND 75 (item 6) -- the thirteen creatures a summon can actually be.
import { summonCreatureFor, SUMMON_CREATURES, SUMMON_CREATURE_BY_FAMILY } from './summonCreatures.js';
// ROUND 76 (item 2) -- one job per summon, and the temporary-cap threshold.
import { pickSummonRole, SUMMON_ROLES, SUMMON_TEMP_SECONDS } from './summonRoles.js';
// ROUND 76 (item 2.2) -- the odd summons: a solid iron cow. See oddSummons.js.
import { oddSummonFor, oddSummonDesc, ODD_GUARD } from './oddSummons.js';
// ROUND 75 -- stacking instances that accumulate and are consumed.
import {
  STACK_SHAPES, STACK_TRIGGERS, STACK_PAYOUTS, STACK_SIGNATURES,
  STACK_SIGNATURE_BY_ESSENCE, stackClause, stackMagnitude, stackIconFor,
} from './stacking.js';

// Tiny deterministic rng from a string seed -- used so a summoned relic's
// EPIC-tier stat rolls (round 10) are stable per essence+stone combo.
export function seededRng(seedStr) {
  let s = stableHash(seedStr) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- stable string hash -- same technique as the original's stableHash ---
export function stableHash(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// --- Confluence names -- VERBATIM from the original (line 1753) ---
export const CONFLUENCE_NAMES = ['Action', 'Alchemy', 'Ambush', 'Animate', 'Anzu', 'Arsenal', 'Avatar', 'Battlefield', 'Behemoth', 'Boundary', 'Bounty', 'Cataclysm', 'Chaotic', 'Charlatan', 'Chimera', 'Cyborg', 'Cycle', 'Dawn', 'Desolate', 'Discordant', 'Doom', 'Doppelganger', 'Dragon', 'Eclipse', 'Edifice', 'Effigy', 'Empower', 'Fertile', 'Fey', 'Firebird', 'Force', 'Forge', 'Fortress', 'Garuda', 'Gate', 'Glimeron', 'Gorgon', 'Griffin', 'Guardian', 'Harpy', 'Harvest', 'Hydra', 'Immortal', 'Juggernaut', 'Karmic', 'Kraken', 'Leviathan', 'Lotus', 'Magitech', 'Manticore', 'Master', 'Ministration', 'Minotaur', 'Mirage', 'Monolith', 'Mystic', 'Nebula', 'Nemesis', 'Network', 'Oasis', 'Ocean', 'Onslaught', 'Phantasmagoria', 'Phoenix', 'Predatory', 'Prison', 'Prosperity', 'Refracting', 'Resonating', 'Roc', 'Sacrifice', 'Scribe', 'Serpent', 'Simulacrum', 'Skirmish', 'Sky', 'Soaring', 'Sovereign', 'Stellar', 'Storm', 'Succubus', 'Swarm', 'Talisman', 'Thunderbird', 'Time', 'Tranquil', 'Transfiguration', 'Transgression', 'Troll', 'Twilight', 'Undeath', 'Unity', 'Verdant', 'Vessel', 'Vision', 'Volcano', 'Vortex', 'Weave', 'Wendigo', 'Wrath', 'Ziz'];

/**
 * ROUND 49 -- WHAT EACH CONFLUENCE NAME IS ABOUT.
 *
 * Keyword stems, matched at a word boundary against an essence's whole
 * vocabulary (name, family, phrase, description, levers, motif parts, verbs,
 * adjectives and body line). Stems rather than whole words so that one entry
 * covers "crackle"/"crackling" and "plate"/"plated"/"plates".
 *
 * These are SUBJECT keywords, not mechanical ones -- the mechanics already had
 * their say in confluenceThemeForEssences, and a name only ever competes
 * inside its own theme's pool. What this table decides is which of fifteen
 * area names a lightning-and-open-air trio deserves, not whether that trio is
 * an area trio at all.
 *
 * A few lever words do appear (stalk, ward, taunt, mend) because for some
 * names the lever IS the subject: an Ambush is a stalk, a Guardian is a ward.
 */
const CONFLUENCE_AFFINITY = {
  // --- heal ---
  Immortal: ['immortal', 'undying', 'deathless', 'eternal', 'return', 'again', 'revive', 'rebirth', 'endur'],
  Fertile: ['seed', 'brood', 'clutch', 'roost', 'egg', 'spawn', 'hatch', 'bloom', 'fruit', 'nest', 'sow', 'litter', 'fertil'],
  Harvest: ['harvest', 'reap', 'grain', 'sheaf', 'crop', 'gather', 'store', 'bounty', 'yield', 'glean', 'sickle'],
  Oasis: ['oasis', 'spring', 'well', 'water', 'pool', 'shade', 'palm', 'rest', 'thirst', 'draught', 'refuge'],
  Tranquil: ['calm', 'still', 'quiet', 'serene', 'peace', 'settle', 'unhurried', 'steady', 'breath', 'hush'],
  Prosperity: ['coin', 'gold', 'wealth', 'rich', 'bounty', 'plenty', 'fortune', 'prosper', 'trade', 'purse', 'hoard'],
  Verdant: ['green', 'sprout', 'root', 'leaf', 'sap', 'bloom', 'shoot', 'moss', 'vine', 'bud', 'grow', 'verdant', 'bark'],
  Lotus: ['lotus', 'flower', 'petal', 'bloom', 'pond', 'serene', 'open', 'unfold', 'stillness', 'breath'],
  Ministration: ['tend', 'mend', 'knit', 'salve', 'balm', 'bind', 'nurse', 'care', 'hand', 'grace', 'bless'],
  Phoenix: ['ash', 'ember', 'fire', 'flame', 'burn', 'rebirth', 'rise', 'feather', 'wing', 'pyre', 'renew'],
  Firebird: ['fire', 'flame', 'ember', 'feather', 'wing', 'plume', 'bird', 'crest', 'blaze', 'spark'],
  Dawn: ['dawn', 'light', 'sun', 'morning', 'radian', 'gleam', 'gold', 'first', 'wake', 'shine', 'glow'],
  Unity: ['allies', 'flock', 'troop', 'pack', 'band', 'company', 'together', 'shared', 'unity', 'chorus', 'bond', 'kin'],
  Alchemy: ['brew', 'vial', 'flask', 'reagent', 'distil', 'transmute', 'mixture', 'salt', 'quicksilver', 'alchem', 'tincture'],
  Bounty: ['bounty', 'plenty', 'gather', 'drop', 'find', 'trove', 'spoil', 'purse', 'gift', 'yield'],
  Cycle: ['season', 'turn', 'cycle', 'wheel', 'again', 'return', 'tide', 'moon', 'round', 'renew'],
  Empower: ['grant', 'boost', 'lift', 'allies', 'raise', 'strengthen', 'bolster', 'gift', 'empower', 'charge'],
  Fey: ['fey', 'glamour', 'charm', 'trick', 'wild', 'thorn', 'mushroom', 'moss', 'ring', 'laughter', 'green'],
  Sacrifice: ['blood', 'offer', 'give', 'cost', 'wound', 'spend', 'altar', 'pyre', 'toll', 'sacrifice', 'debt'],

  // --- guard ---
  Fortress: ['wall', 'bulwark', 'rampart', 'bastion', 'shield', 'plate', 'armour', 'armor', 'guard', 'gate', 'stone', 'iron', 'steadfast', 'unbroken', 'unbending', 'block', 'brace', 'hold', 'ward'],
  Guardian: ['ward', 'guard', 'protect', 'shelter', 'sentinel', 'watch', 'keep', 'taunt', 'shieldwall', 'bulwark', 'stand', 'between'],
  Monolith: ['stone', 'slab', 'pillar', 'weight', 'immovable', 'unmoving', 'heavy', 'block', 'granite', 'monolith', 'unbending', 'root'],
  Boundary: ['edge', 'line', 'border', 'limit', 'threshold', 'rim', 'bound', 'fence', 'margin', 'hedge', 'bind'],
  Prison: ['cage', 'lock', 'snare', 'shackle', 'trap', 'bar', 'fetter', 'cell', 'manacle', 'bind'],
  Refracting: ['light', 'glass', 'prism', 'mirror', 'facet', 'bend', 'split', 'shine', 'refract', 'crystal', 'lens'],
  Vessel: ['vessel', 'hold', 'carry', 'shell', 'husk', 'body', 'contain', 'brim', 'fill', 'urn', 'core'],
  Sovereign: ['crown', 'throne', 'rule', 'command', 'lord', 'king', 'reign', 'banner', 'decree', 'sovereign', 'noble'],
  Gate: ['gate', 'door', 'threshold', 'portal', 'arch', 'open', 'shut', 'pass', 'hinge', 'key', 'shift'],
  Animate: ['animate', 'wake', 'stir', 'move', 'puppet', 'limb', 'quicken', 'summon', 'call', 'raise', 'servant'],
  Charlatan: ['trick', 'feint', 'bluff', 'mask', 'lie', 'sleight', 'guise', 'con', 'coin', 'grin', 'misdirect'],
  Doppelganger: ['double', 'copy', 'twin', 'mirror', 'echo', 'likeness', 'mimic', 'shape', 'wear', 'face'],
  Edifice: ['build', 'stone', 'wall', 'tower', 'raise', 'structure', 'beam', 'column', 'foundation', 'edifice'],
  Effigy: ['effigy', 'straw', 'figure', 'doll', 'likeness', 'burn', 'stand-in', 'decoy', 'taunt', 'draw', 'mock'],
  Forge: ['forge', 'anvil', 'hammer', 'iron', 'ingot', 'coal', 'quench', 'temper', 'smith', 'metal', 'heat', 'nail'],
  Karmic: ['fate', 'debt', 'balance', 'owed', 'return', 'weigh', 'scale', 'judge', 'reckon', 'karmic', 'due'],
  Mirage: ['mirage', 'haze', 'shimmer', 'illusion', 'waver', 'heat', 'false', 'blur', 'sand', 'vanish', 'sight'],
  Mystic: ['mystic', 'rune', 'sigil', 'secret', 'arcane', 'veil', 'rite', 'chant', 'hidden', 'mind', 'lore'],
  Scribe: ['scribe', 'ink', 'page', 'write', 'word', 'book', 'record', 'lore', 'letter', 'knowledge', 'mark'],
  Simulacrum: ['copy', 'double', 'image', 'likeness', 'model', 'shell', 'stand-in', 'decoy', 'form', 'mimic'],
  Talisman: ['charm', 'token', 'amulet', 'ward', 'bead', 'knot', 'luck', 'talisman', 'carve', 'hang', 'sign'],
  Time: ['time', 'hour', 'slow', 'delay', 'moment', 'clock', 'before', 'after', 'linger', 'season', 'age'],
  Transfiguration: ['change', 'shape', 'shift', 'become', 'form', 'alter', 'remake', 'turn', 'transform', 'flesh'],
  Vision: ['sight', 'see', 'eye', 'watch', 'foresee', 'gaze', 'reveal', 'vision', 'clear', 'perceiv', 'sightline'],
  Weave: ['weave', 'thread', 'strand', 'knot', 'loom', 'braid', 'web', 'stitch', 'cloth', 'pattern', 'lattice'],

  // --- aoe ---
  // Storm carries the whole weather vocabulary. The user's own reading:
  // Lightning + Wind + Vast "shoukd result in the Storm Confluence".
  Storm: ['storm', 'lightning', 'thunder', 'bolt', 'arc', 'spark', 'static', 'fork', 'crackl', 'jolt', 'wind', 'gale', 'gust', 'squall', 'tempest', 'rain', 'cloud', 'sky', 'air', 'howl', 'keening', 'buffet', 'scour', 'draught', 'slipstream'],
  Wrath: ['rage', 'fury', 'anger', 'wrath', 'roar', 'lash', 'seethe', 'vengeance', 'burn', 'strike'],
  Doom: ['doom', 'end', 'fall', 'toll', 'knell', 'fate', 'ruin', 'omen', 'final', 'dread'],
  Cataclysm: ['break', 'shatter', 'rend', 'quake', 'collapse', 'ruin', 'sunder', 'crack', 'cataclysm', 'upheaval'],
  Volcano: ['lava', 'magma', 'ash', 'vent', 'erupt', 'molten', 'cinder', 'basalt', 'sulphur', 'fire', 'burn', 'ember'],
  Onslaught: ['charge', 'rush', 'surge', 'wave', 'press', 'batter', 'assault', 'onslaught', 'drive', 'march', 'trample'],
  Desolate: ['waste', 'barren', 'empty', 'dust', 'ash', 'hollow', 'ruin', 'silence', 'desolat', 'bleak', 'cold'],
  Discordant: ['discord', 'jangle', 'clash', 'noise', 'grate', 'shriek', 'break', 'unmake', 'wrong', 'sour'],
  Chaotic: ['chaos', 'random', 'wild', 'scatter', 'roil', 'churn', 'unruly', 'chaotic', 'lurch', 'reroll', 'fate'],
  Transgression: ['forbid', 'break', 'trespass', 'cross', 'defy', 'sin', 'taboo', 'profane', 'unmake', 'void'],
  Battlefield: ['banner', 'war', 'muster', 'melee', 'front', 'troop', 'company', 'rank', 'regiment', 'field'],
  Eclipse: ['shadow', 'dark', 'shade', 'cover', 'moon', 'black', 'dim', 'eclipse', 'umbra', 'night', 'blot'],
  Nebula: ['star', 'dust', 'cloud', 'void', 'drift', 'nebula', 'gas', 'glow', 'space', 'cosmic', 'far'],
  // The user's own definition: "vortex keys off of Wind, water, void,
  // dimension. Think things that swirl such as whirlpools, tornados, or
  // portals."
  Vortex: ['whirl', 'spiral', 'swirl', 'vortex', 'maelstrom', 'eddy', 'current', 'water', 'tide', 'void', 'portal', 'dimension', 'drain', 'funnel', 'cyclone', 'wind', 'pull', 'suck', 'churn'],
  Swarm: ['swarm', 'many', 'hive', 'insect', 'wing', 'cloud', 'brood', 'teem', 'flock', 'chitter', 'crawl', 'sting'],
  Skirmish: ['skirmish', 'dart', 'harry', 'raid', 'flank', 'hit', 'scatter', 'quick', 'peel', 'loose'],
  Glimeron: ['shimmer', 'gleam', 'glimmer', 'prism', 'refract', 'facet', 'light', 'sheen', 'iridesc', 'shine'],
  Magitech: ['gear', 'cog', 'engine', 'circuit', 'lens', 'rune', 'device', 'machine', 'clockwork', 'brass', 'wire'],
  Network: ['link', 'node', 'relay', 'connect', 'network', 'lattice', 'circuit', 'chain', 'web'],
  Ocean: ['sea', 'ocean', 'wave', 'tide', 'salt', 'deep', 'brine', 'water', 'swell', 'current', 'foam'],
  Phantasmagoria: ['phantom', 'dream', 'vision', 'illusion', 'shade', 'spectre', 'unreal', 'haze', 'mask', 'shift'],
  Resonating: ['resonat', 'ring', 'hum', 'chime', 'echo', 'harmonic', 'tone', 'vibrat', 'note', 'chord', 'sound'],
  Sky: ['sky', 'air', 'cloud', 'wing', 'feather', 'soar', 'height', 'horizon', 'open', 'wide', 'aloft'],
  Soaring: ['soar', 'wing', 'lift', 'rise', 'glide', 'height', 'feather', 'aloft', 'flight', 'updraft', 'far'],
  Stellar: ['star', 'light', 'cosmic', 'burn', 'distant', 'constellat', 'sky', 'radian', 'stellar', 'void'],
  Twilight: ['dusk', 'twilight', 'gloam', 'half-light', 'shadow', 'fade', 'dim', 'evening', 'between', 'grey'],

  // --- strike ---
  Dragon: ['dragon', 'scale', 'wing', 'claw', 'fire', 'breath', 'hoard', 'talon', 'wyrm', 'horn'],
  Serpent: ['serpent', 'snake', 'coil', 'fang', 'venom', 'scale', 'hiss', 'strike', 'slither', 'tongue'],
  Hydra: ['head', 'many', 'regrow', 'coil', 'venom', 'hydra', 'serpent', 'swamp', 'sever', 'return'],
  Kraken: ['tentacle', 'deep', 'sea', 'kraken', 'grip', 'drag', 'sucker', 'brine', 'crush', 'ink'],
  Leviathan: ['leviathan', 'deep', 'vast', 'sea', 'whale', 'huge', 'immense', 'swell', 'sound', 'weight'],
  Manticore: ['manticore', 'spine', 'quill', 'tail', 'lion', 'sting', 'barb', 'mane', 'maw'],
  Chimera: ['chimera', 'mixed', 'many', 'graft', 'beast', 'horn', 'mane', 'goat', 'lion', 'hybrid'],
  Gorgon: ['gaze', 'stone', 'snake', 'gorgon', 'petrif', 'eye', 'stare', 'hair', 'freeze', 'still'],
  Minotaur: ['horn', 'bull', 'charge', 'maze', 'gore', 'hoof', 'minotaur', 'bellow', 'muscle', 'ram'],
  Griffin: ['griffin', 'wing', 'talon', 'beak', 'feather', 'lion', 'dive', 'aloft', 'eagle', 'claw'],
  Harpy: ['harpy', 'wing', 'talon', 'shriek', 'feather', 'snatch', 'claw', 'wind', 'dive', 'cry'],
  Wendigo: ['hunger', 'cold', 'frost', 'gaunt', 'antler', 'starve', 'wendigo', 'winter', 'famine', 'gnaw'],
  Troll: ['troll', 'regrow', 'hide', 'club', 'stone', 'lumber', 'brute', 'thick', 'knuckle', 'moss'],
  Succubus: ['charm', 'drain', 'siphon', 'kiss', 'lure', 'wing', 'desire', 'seduce', 'leech', 'sweet'],
  Anzu: ['anzu', 'storm', 'wing', 'talon', 'feather', 'bird', 'lion', 'cry', 'thunder', 'steal'],
  Ziz: ['ziz', 'wing', 'huge', 'bird', 'feather', 'sky', 'shadow', 'span', 'aloft', 'vast'],
  Roc: ['roc', 'wing', 'talon', 'bird', 'huge', 'lift', 'carry', 'feather', 'aerie', 'span'],
  // "for a Thunderbird confluence I would expect a wing, lightning, wind, or
  // something related to a thunderbird."
  Thunderbird: ['thunder', 'lightning', 'bolt', 'wing', 'feather', 'storm', 'bird', 'sky', 'arc', 'crackl', 'beak', 'plume', 'talon', 'cloud'],
  Behemoth: ['huge', 'mass', 'weight', 'bulk', 'immense', 'behemoth', 'trample', 'ground', 'heavy', 'shoulder'],
  Juggernaut: ['unstoppable', 'roll', 'crush', 'charge', 'weight', 'plate', 'grind', 'drive', 'momentum', 'trample'],
  Predatory: ['stalk', 'hunt', 'prey', 'track', 'pounce', 'claw', 'fang', 'scent', 'patient', 'kill'],
  Ambush: ['stalk', 'hidden', 'quiet', 'wait', 'spring', 'sudden', 'sheath', 'slip', 'blind', 'behind', 'surprise'],
  Nemesis: ['hunt', 'mark', 'pursue', 'vengeance', 'relentless', 'nemesis', 'owed', 'name', 'follow', 'doom'],
  Cyborg: ['metal', 'graft', 'wire', 'plate', 'servo', 'iron', 'implant', 'machine', 'limb', 'steel'],
  Action: ['quick', 'swift', 'fast', 'act', 'move', 'instant', 'immediate', 'sudden', 'flick', 'seize', 'first'],
  Arsenal: ['weapon', 'blade', 'axe', 'spear', 'bow', 'hammer', 'arm', 'rack', 'edge', 'point', 'haft'],
  Avatar: ['will', 'embody', 'incarn', 'avatar', 'form', 'divine', 'vessel', 'bear', 'become', 'shape'],
  Force: ['force', 'push', 'shove', 'impact', 'concussi', 'slam', 'wallop', 'batter', 'sledge'],
  Garuda: ['garuda', 'wing', 'talon', 'feather', 'bird', 'sun', 'serpent', 'sky', 'gold', 'dive'],
  // Master is skill and discipline: the trained hand, the drilled stance, the
  // long march. "Much more fitting is the Master confluence."
  Master: ['master', 'adept', 'skill', 'practiced', 'mastery', 'deft', 'schooled', 'drill', 'technique', 'discipline', 'precis', 'knife', 'blade', 'footwork', 'stance', 'poise', 'reflex', 'expert', 'march', 'stride'],
  Undeath: ['dead', 'undead', 'bone', 'grave', 'rot', 'crypt', 'shroud', 'raise', 'corpse', 'carrion'],
};

/**
 * The confluence's name, DERIVED FROM WHAT THE THREE ESSENCES DO.
 *
 * ROUND 49. This used to be `CONFLUENCE_NAMES[stableHash(ids) % 101]` -- a
 * pure hash, so the name had no relationship to the essences that formed it.
 * The user hit it head-on while writing their team's backgrounds: Might + Iron
 * + Blood, a tank's trio, resolved to "Storm" with an AOE theme, and Lightning
 * + Fire + Potent, a ranged elemental DPS, resolved to "Simulacrum" with a
 * GUARD theme. Both are the mad-libs problem round 48 removed from ability
 * names, still living in confluence names.
 *
 * Round 48 gave every essence a set of mechanical LEVERS, so the fix is
 * available: pool the trio's levers, find which of the three confluence themes
 * they actually add up to, and draw the name from that theme's own names. The
 * pick within a theme is still hashed -- two guard trios should not be forced
 * to share a name -- but it can now only land on a name that MEANS what the
 * trio does.
 *
 * `sortedIds` is still the seed, so a given trio is still perfectly stable
 * across reloads; it just picks from a smaller, correct list.
 */
/**
 * ROUND 96 -- THREE ANIMALS MAKE A BEAST.
 *
 * The user's rule, verbatim: "3 animal essences should almost always result in
 * a mythical animal confluence."
 *
 * They are right, and the old code could not obey it even by accident. The
 * mythical beasts -- Chimera, Kraken, Griffin, Hydra, Manticore and the rest --
 * are almost all in the STRIKE pool, so a three-animal trio whose levers happen
 * to add up to `guard` or `aoe` could never reach one however well it matched.
 * Measured before this change, over eight three-animal trios: four landed on a
 * beast and four landed on Sky, Ambush, Action and Time. Crocodile + Rat + Wasp
 * came out as TIME.
 *
 * So the animal gate runs BEFORE the theme filter and replaces it. Subject
 * matter outranks mechanics here, which is the opposite of the round-49 rule
 * and is deliberate: what a confluence of three animals IS is not a question
 * about levers.
 *
 * "Almost always" is honoured as ALWAYS at three of three, and not at all at
 * two of three -- a wolf, a knife and a fire is a hunter, not a chimera, and
 * softening the gate to two would swallow every trio with an animal in it.
 */
export const ANIMAL_FAMILIES = new Set(['beast', 'smallbeast', 'flyer', 'aquatic', 'serpent']);

/** In an animal family and not an animal: a body part, or the stuff a creature
 *  carries. A trio of Wing + Venom + Tentacle is not three animals. */
export const NOT_ANIMALS = new Set(['essWing', 'essVenom', 'essTentacle', 'essClaw', 'essCoral']);

/** Animals whose catalogue family is not an animal family. Horse is filed under
 *  `motion` because of what it DOES, which is right for every other purpose. */
export const ANIMAL_EXTRA = new Set(['essHorse']);

export function isAnimalEssence(id) {
  if (ANIMAL_EXTRA.has(id)) return true;
  if (NOT_ANIMALS.has(id)) return false;
  const def = ESSENCE_CATALOG[id];
  return !!def && ANIMAL_FAMILIES.has(def.family);
}

/** The mythical beasts among the 101 authentic names. Named explicitly rather
 *  than detected, because "is Avatar a beast" is a judgement and a judgement
 *  belongs in a list somebody can read. */
export const MYTHIC_BEASTS = new Set([
  'Anzu', 'Behemoth', 'Chimera', 'Dragon', 'Firebird', 'Garuda', 'Gorgon',
  'Griffin', 'Harpy', 'Hydra', 'Kraken', 'Leviathan', 'Manticore', 'Minotaur',
  'Phoenix', 'Roc', 'Serpent', 'Thunderbird', 'Troll', 'Wendigo', 'Ziz',
]);

/** Mythic, and NOT an animal. Held as its own list rather than simply left out
 *  of the set above, because "why is Succubus not in there" is a question the
 *  next person will ask, and Bear + Shark + Bat resolving to SUCCUBUS is the
 *  answer -- a beast gate that can pick a humanoid is not a beast gate. Gorgon
 *  stays: she is a woman with snakes, and the snakes are the point. */
export const MYTHIC_NOT_BEASTS = ['Succubus', 'Avatar', 'Fey', 'Doppelganger'];

/** How far the whole catalogue has to beat the theme pool before the theme is
 *  overruled. Tuned by measurement, not by taste -- see the note at the widen
 *  step, and the anchors in the data lane that pin it. */
/**
 * ROUND 96 -- CONFLUENCES THAT ARE BUILT AND NOT YET SUPPORTABLE.
 *
 * The user: "in order for the gun, cyborg and magitech essences to work I need
 * to add a variety of guns both modern and scifi. For now lets block those
 * essences until everything for them to work is available."
 *
 * Cyborg and Magitech are CONFLUENCE names rather than essences -- there is no
 * essCyborg and no essMagitech -- so this is where they are held back. Both are
 * machine confluences: Cyborg's vocabulary is servos, plate and implanted limbs,
 * Magitech's is gears, circuits and clockwork, and both would generate a kit
 * about hardware the build cannot draw. The Gun essence is blocked alongside
 * them in essenceCatalog.js, where the reasoning is written out in full.
 *
 * BLOCKED FROM BEING FORMED, not deleted: their concepts, signatures and
 * crafter lines all stay, so unblocking is removing a name from this set and
 * nothing else. A save that already carries one still resolves.
 */
export const BLOCKED_CONFLUENCES = new Set(['Cyborg', 'Magitech']);

/** The names a trio may actually resolve to. Every pool below is filtered
 *  through this, so a blocked confluence leaves the game by one edit. */
export const AVAILABLE_CONFLUENCE_NAMES = CONFLUENCE_NAMES.filter(n => !BLOCKED_CONFLUENCES.has(n));

export const CONFLUENCE_WIDEN_MARGIN = 13;

/** What a trio of three DIFFERENT animal families is worth to Chimera. Two
 *  essences' worth of breadth: a chimera is definitionally a creature of
 *  mismatched parts, so it should be hard for a single beast to beat -- but not
 *  impossible, because a crocodile, a rat and a wasp really are a Manticore
 *  (tail, sting, barb) and that reading should still win. Raised from 10 after
 *  the user reported Fox + Spider + Bird resolving to GARUDA. */
export const CHIMERA_BONUS = 20;

export function resolveConfluenceName(sortedIds) {
  const key = sortedIds.join(',');
  const theme = confluenceThemeForEssences(sortedIds);
  // Only names with an EXPLICIT theme are eligible. confluenceThemeFor falls
  // back to a hash for names it has no opinion about, which would let
  // "Mystic" and "Charlatan" into the strike pool purely by accident -- and a
  // blood-and-iron trio resolving to "Confluence of Mystic" is the same
  // failure this function was rewritten to remove, just one layer down.
  const pool = AVAILABLE_CONFLUENCE_NAMES.filter(n => CONFLUENCE_THEME_OVERRIDES[n] === theme);
  // THE ANIMAL GATE, ahead of the theme. See the note above resolveConfluenceName.
  const allAnimals = sortedIds.length === 3 && sortedIds.every(isAnimalEssence);
  const beasts = allAnimals ? AVAILABLE_CONFLUENCE_NAMES.filter(n => MYTHIC_BEASTS.has(n)) : [];
  let list = beasts.length ? beasts : (pool.length ? pool : AVAILABLE_CONFLUENCE_NAMES);

  // WHEN THE THEME HAS NOTHING TO SAY, STOP LISTENING TO IT.
  //
  // The theme filter exists because a tank trio must not resolve to Storm
  // (round 49). It earns that when the pool it selects actually matches the
  // trio -- but a trio can be mechanically `aoe` and have no aoe name that
  // knows anything about it. Staff + Paper + Brush is the user's own example:
  // the best aoe name touched ONE of the three essences on one incidental
  // word, and the result was Doom, which is no better than the Battlefield it
  // replaced. Across the whole catalogue the same trio matches Talisman on all
  // three -- a staff, a charm, a sign.
  //
  // So: if nothing in the theme pool manages more than a single incidental
  // word, the pool is not informative and the whole list is ranked instead.
  //
  // THE THRESHOLD IS DELIBERATELY MEAN. The first draft widened whenever the
  // pool's best touched fewer than two essences, and that took Predatory off
  // Wolf + Water + Sickle -- a name the user had just reviewed and kept --
  // because a hunter trio is carried by ONE strong essence and that is fine.
  // Twelve is one essence plus two words: below it the pool has said nothing
  // (Staff + Paper + Brush's best aoe name scored 11, on `end`), at or above it
  // the pool has an opinion and keeps its say.
  if (!beasts.length && list !== AVAILABLE_CONFLUENCE_NAMES) {
    const corporaProbe = sortedIds.map(essenceCorpus);
    let bestIn = 0;
    for (const n of list) bestIn = Math.max(bestIn, affinityScore(n, corporaProbe));
    let bestAll = 0;
    for (const n of AVAILABLE_CONFLUENCE_NAMES) bestAll = Math.max(bestAll, affinityScore(n, corporaProbe));
    // ROUND 96 -- and widen again when the pool has AN opinion but a much
    // weaker one than the catalogue.
    //
    // The user, reviewing: Moon + Dance + Shimmer came out as AMBUSH. The
    // strike pool's best genuinely scored 22 -- above the silence threshold --
    // while Glimeron, whose whole vocabulary is shimmer, gleam and prism, scored
    // 35 outside it. A trio can be mechanically `strike` and be ABOUT light, and
    // when the gap is this wide the theme is not the thing the confluence is
    // named for.
    //
    // The margin is tuned against the names the user has already kept: it is
    // the largest gap that leaves all five of them and all of round 49/51's
    // anchors standing. See CONFLUENCE_WIDEN_MARGIN.
    if (bestIn < 12 || (bestAll - bestIn) >= CONFLUENCE_WIDEN_MARGIN) list = AVAILABLE_CONFLUENCE_NAMES;
  }

  // STAGE TWO -- SUBJECT MATTER.
  //
  // The theme filter got the trio into the right pool. It cannot tell Storm
  // from Vortex, because mechanically they are the same thing: an area theme.
  // The user hit exactly that: Lightning + Wind + Vast landed on Vortex, and
  // "vortex keys off of Wind, water, void, dimension. Think things that swirl
  // such as whirlpools, tornados, or portals." A trio that is lightning and
  // open air is a STORM. Likewise a knife-and-training trio is a Master, not a
  // Thunderbird -- "for a Thunderbird confluence I would expect a wing,
  // lightning, wind, or something related to a thunderbird."
  //
  // So every name carries a keyword set, and the pool is ranked against the
  // trio's actual VOCABULARY -- the essence names, families, phrases and the
  // whole round-48 motif (parts, verbs, adjectives, body line, levers). Breadth
  // beats depth: a name that touches all three essences outranks one that hits
  // a single essence a dozen times, because a confluence is what the three
  // have in COMMON.
  const corpora = sortedIds.map(essenceCorpus);
  // A CHIMERA IS MADE OF PARTS OF DIFFERENT ANIMALS, which is a definition and
  // not a preference. Three animals out of three different families is exactly
  // that, and without this a wolf, a bird and a snake resolved to Serpent on
  // the strength of the one snake in it. Weighted at one essence's worth of
  // breadth: enough to win a trio that no single beast speaks for, not enough
  // to beat a beast that genuinely matches two of the three.
  const chimeric = allAnimals
    && new Set(sortedIds.map(id => (ESSENCE_CATALOG[id] || {}).family)).size === 3;
  let bestScore = -1;
  const winners = [];
  for (const name of list) {
    const s = affinityScore(name, corpora) + (chimeric && name === 'Chimera' ? CHIMERA_BONUS : 0);
    if (s > bestScore) { bestScore = s; winners.length = 0; winners.push(name); }
    else if (s === bestScore) winners.push(name);
  }
  // Hash only ever breaks a genuine tie now -- two names the trio matches
  // equally well. Same seed as before, so a trio with no keyword signal at all
  // still resolves exactly where it used to within its theme.
  return winners[stableHash(key) % winners.length];
}

/** Everything a confluence name is allowed to recognise an essence by: its
 *  name, family and phrase from the catalog, plus its whole motif. Lowercased
 *  and joined into one blob because the keywords are word-boundary regexes and
 *  do not care which field a word came from. */
function essenceCorpus(id) {
  const def = ESSENCE_CATALOG[id] || {};
  const m = ESSENCE_MOTIFS[id] || {};
  const bits = [
    def.name, def.family, def.phrase, def.desc,
    ...(m.levers || []), ...(m.parts || []), ...(m.verbs || []), ...(m.adjs || []),
    m.body,
  ];
  return bits.filter(Boolean).join(' ').toLowerCase();
}

/**
 * ROUND 96 -- THE KEYWORD MATCH IS ANCHORED AT BOTH ENDS NOW.
 *
 * The user, reviewing ten generated confluences: "some of these made 0 sense",
 * naming Cold + Hammer + Thread resolving to OCEAN and Staff + Paper + Brush
 * resolving to BATTLEFIELD.
 *
 * The cause was one character. The test was `new RegExp('\\b' + k)` -- anchored
 * at the START of a word and open at the end -- so every keyword matched any
 * word BEGINNING with it, and the table is full of short keywords:
 *
 *     'sea'  matched  seam, seamless, seabed, searing, sear
 *     'war'  matched  ward, warm, warn, wary, warp
 *     'dim'  matched  dimension
 *     'see'  matched  seed, seep
 *     'cry'  matched  crystal
 *     'kin'  matched  kindness, kindle
 *     'con'  matched  conjures, constellation, concentrated, constrict
 *     'gas'  matched  gashes
 *     'pond' matched  ponderous
 *     'sever' matched several
 *
 * So a THREAD essence read as the ocean because its motif says "seamless", and
 * a staff, a sheet of paper and a brush all read as a battlefield because all
 * three of them WARD. And because the score is breadth-first -- ten points per
 * distinct essence touched -- a false friend that hits all three essences beats
 * a real keyword that hits one. The two names the user called out are exactly
 * the two shapes that fault produces.
 *
 * Anchored at both ends, with a suffix allowance so "wave" still finds "waves"
 * and "burn" still finds "burning". Keywords that are genuinely STEMS carry a
 * trailing '*' and keep the old prefix behaviour -- there are eleven of them
 * and they are listed in CONFLUENCE_STEMS, which is short enough to read.
 *
 * Measured over the whole table and every essence corpus: 39 keywords were
 * matching only as prefixes, and 30 of those 39 were matching words with no
 * relation to them at all.
 */
// STRICT. The first draft of this list included `d`, `e`, `t`, `en`, `y` and
// `ion` so that "wasted", "endure", "radiant", "golden" and "constellation"
// would still be found -- and it re-created the exact fault it was written to
// remove, because `war` + `d` is WARD. Staff, paper and brush all ward, so
// Staff + Paper + Brush came out as BATTLEFIELD a second time, which is the
// user's own example. Every suffix here changes the word's inflection and not
// its identity; the handful of keywords that need a real stem are listed
// below instead, where they can be read.
const AFFINITY_SUFFIX = '(?:s|es|ed|ing|er|ers|ies)?';

/** Keywords that are deliberately stems -- a compound or a doubled consonant
 *  the suffix list cannot reach. Everything else is matched whole. */
export const CONFLUENCE_STEMS = new Set([
  // compounds and doubled consonants the suffix list cannot reach
  'bud', 'brim', 'weigh', 'hour', 'clock', 'crawl', 'gold', 'ash', 'waste',
  // keywords written as stems in the first place
  'radian', 'crackl', 'petrif', 'perceiv', 'iridesc', 'desolat', 'resonat',
  'vibrat', 'refract', 'concussi', 'fertil', 'prosper', 'constellat', 'precis',
  'endur', 'immortal', 'machine', 'border', 'verdant', 'chaotic', 'talisman',
  'stellar', 'wendigo', 'sacrifice', 'nebula', 'manticore', 'minotaur',
]);

/**
 * ROUND 96 -- A NOTE ON WHAT WAS MEASURED AND DELIBERATELY NOT DONE.
 *
 * With the match anchored, the obvious next move was to discount keywords that
 * are common across the whole vocabulary. Measured over all 148 essence
 * corpora, six keywords are very common indeed:
 *
 *     bind    59 of 148 essences   (40%)
 *     war     52                   (35%)
 *     ward    51                   (34%)
 *     linger  42                   (28%)
 *     bond    40                   (27%)
 *     swift   37                   (25%)
 *
 * Ignoring keywords above a 15% share was built, run against the ten trios the
 * user had just reviewed, and REVERTED. It cost four names the user had already
 * approved -- Transfiguration became Refracting, Guardian became Time, Boundary
 * became Talisman -- because `ward` and `bind` and `shift` are common AND are
 * the actual vocabulary of Guardian, Boundary and Transfiguration. A word being
 * common is not the same as a word being uninformative when the name is about
 * that word.
 *
 * Written down rather than deleted, because it is the obvious idea and the next
 * person to look at this will have it too.
 */
const _affinityRe = new Map();
function affinityRe(k) {
  let re = _affinityRe.get(k);
  if (re) return re;
  re = CONFLUENCE_STEMS.has(k)
    ? new RegExp(`\\b${k}`)
    : new RegExp(`\\b${k}${AFFINITY_SUFFIX}\\b`);
  _affinityRe.set(k, re);
  return re;
}

/** Breadth-first affinity: 10 per DISTINCT essence the name speaks to, +1 per
 *  keyword hit as the fine grain. A name with no keywords at all scores 0 and
 *  is only reachable when nothing in its pool matches, which keeps the
 *  unopinionated names alive for trios with no clear subject. */
function affinityScore(name, corpora) {
  const keys = CONFLUENCE_AFFINITY[name];
  if (!keys || !keys.length) return 0;
  let touched = 0, hits = 0;
  for (const c of corpora) {
    let n = 0;
    for (const k of keys) if (affinityRe(k).test(c)) n++;
    if (n) { touched++; hits += n; }
  }
  return touched * 10 + hits;
}

/** Which of the three confluence themes a trio's levers add up to.
 *
 *  Each lever votes for the theme it expresses. A trio of 2-4 levers apiece
 *  gives 6-12 votes, which is enough to separate a guard trio from a strike
 *  one without being so fine that one shared lever flips the result. Ties go
 *  to the FIRST essence's leading lever, because that is the essence the
 *  player bonded first and the one they think of the confluence as growing
 *  from. */
export function confluenceThemeForEssences(ids) {
  const votes = { strike: 0, aoe: 0, guard: 0, heal: 0 };
  const leads = { strike: 0, aoe: 0, guard: 0, heal: 0 };
  for (const id of ids) {
    const m = ESSENCE_MOTIFS[id];
    if (!m) continue;
    m.levers.forEach((l, i) => {
      const t = LEVER_THEME[l];
      if (!t) return;
      // The leading lever counts double: it is what the essence IS, the rest
      // are what it can also do.
      votes[t] += (i === 0 ? 2 : 1);
      if (i === 0) leads[t] += 1;
    });
  }
  // Ties are common -- a Shield/Iron/Blood trio splits 5-5 between guard and
  // strike -- so the tie-break has to mean something.
  //
  // It first asks how many of the three essences LEAD with each theme, which
  // is the honest question: a trio where two essences are fundamentally
  // offensive is an offensive trio even if the third carries enough defensive
  // levers to level the raw count. Only if that is also tied does it fall to a
  // fixed precedence.
  //
  // An earlier version broke ties on "the first essence's leading lever",
  // described in the comment as the essence the player bonded first. That was
  // wrong twice over: confluenceDefFor SORTS the ids before calling this, so
  // "first" was alphabetical accident, and the bond order is not carried here
  // at all. Shield/Iron/Blood resolved by whether the word "Blood" sorts
  // before "Shield", which is not a design.
  const TIE_ORDER = ['guard', 'heal', 'aoe', 'strike'];
  let best = 'strike', bestN = -1, bestLeads = -1;
  for (const t of TIE_ORDER) {
    const n = votes[t], l = leads[t];
    if (n > bestN || (n === bestN && l > bestLeads)) { best = t; bestN = n; bestLeads = l; }
  }
  return best;
}

/** Lever -> confluence theme. The four themes are the ones the confluence
 *  innate already understands (see confluenceInnateAbility). */
const LEVER_THEME = {
  raw: 'strike', burst: 'strike', stalk: 'strike', siphon: 'strike', swift: 'strike',
  chain: 'aoe', linger: 'aoe', turn: 'aoe', bind: 'aoe', reach: 'aoe',
  ward: 'guard', shift: 'guard', call: 'guard', fate: 'guard',
  // ROUND 49 -- taunt is the tank's lever and votes GUARD. It was missing on
  // the first pass, which meant Shield and Iron -- two of the three most
  // protective essences in the catalog -- were casting no vote at all, and a
  // Shield/Iron/Blood trio came out with a STRIKE theme because only Blood's
  // siphon was being counted.
  // ROUND 49 -- taunt is 'guard' and not 'aoe' even though it catches a group.
  // What the vote is measuring is what a TRIO is for, and a trio carrying two
  // taunts is a tank, not an area controller. Benjamin's own Shield+Iron trio
  // is the case the user hit by hand. It was missing entirely on the first
  // pass, which meant Shield and Iron -- two of the three most protective
  // essences in the catalog -- cast no vote at all.
  taunt: 'guard',
  // ROUND 49 -- stealth votes STRIKE, not guard, even though what it does is
  // avoid being hit. What the vote measures is what a TRIO is FOR, and a trio
  // built on Knife, Dark and Cat is an assassin: the veil is how it reaches the
  // back line, not how it survives the front one. Filed beside `stalk`, which
  // is its near neighbour and votes the same way.
  stealth: 'strike',
  mend: 'heal', allies: 'heal',
};

// Ported (line 2932). ROUND 49: COMPLETED to all 101 names. It used to cover
// 62 of them and resolveConfluenceName filters the pool by this map, so the
// other 39 -- Master and Forge and Fertile among them -- could never be drawn
// at all. That is how Ædia's knife-and-training trio ended up on Thunderbird:
// the name the user actually wanted was not in the running.
const CONFLUENCE_THEME_OVERRIDES = {
  Immortal: 'heal', Fertile: 'heal', Harvest: 'heal', Oasis: 'heal', Tranquil: 'heal',
  Prosperity: 'heal', Verdant: 'heal', Lotus: 'heal', Ministration: 'heal', Phoenix: 'heal',
  Firebird: 'heal', Dawn: 'heal', Unity: 'heal',
  Alchemy: 'heal', Bounty: 'heal', Cycle: 'heal', Empower: 'heal', Fey: 'heal', Sacrifice: 'heal',
  Fortress: 'guard', Guardian: 'guard', Monolith: 'guard', Boundary: 'guard', Prison: 'guard',
  Refracting: 'guard', Vessel: 'guard', Sovereign: 'guard', Gate: 'guard',
  Animate: 'guard', Charlatan: 'guard', Doppelganger: 'guard', Edifice: 'guard', Effigy: 'guard',
  Forge: 'guard', Karmic: 'guard', Mirage: 'guard', Mystic: 'guard', Scribe: 'guard',
  Simulacrum: 'guard', Talisman: 'guard', Time: 'guard', Transfiguration: 'guard',
  Vision: 'guard', Weave: 'guard',
  Storm: 'aoe', Wrath: 'aoe', Doom: 'aoe', Cataclysm: 'aoe', Volcano: 'aoe', Onslaught: 'aoe',
  Desolate: 'aoe', Discordant: 'aoe', Chaotic: 'aoe', Transgression: 'aoe', Battlefield: 'aoe',
  Eclipse: 'aoe', Nebula: 'aoe', Vortex: 'aoe', Swarm: 'aoe', Skirmish: 'aoe',
  Glimeron: 'aoe', Magitech: 'aoe', Network: 'aoe', Ocean: 'aoe', Phantasmagoria: 'aoe',
  Resonating: 'aoe', Sky: 'aoe', Soaring: 'aoe', Stellar: 'aoe', Twilight: 'aoe',
  Dragon: 'strike', Serpent: 'strike', Hydra: 'strike', Kraken: 'strike', Leviathan: 'strike',
  Manticore: 'strike', Chimera: 'strike', Gorgon: 'strike', Minotaur: 'strike', Griffin: 'strike',
  Harpy: 'strike', Wendigo: 'strike', Troll: 'strike', Succubus: 'strike', Anzu: 'strike',
  Ziz: 'strike', Roc: 'strike', Thunderbird: 'strike', Behemoth: 'strike', Juggernaut: 'strike',
  Predatory: 'strike', Ambush: 'strike', Nemesis: 'strike', Cyborg: 'strike',
  Action: 'strike', Arsenal: 'strike', Avatar: 'strike', Force: 'strike', Garuda: 'strike',
  Master: 'strike', Undeath: 'strike',
};
export function confluenceThemeFor(name) {
  if (CONFLUENCE_THEME_OVERRIDES[name]) return CONFLUENCE_THEME_OVERRIDES[name];
  const lower = name.toLowerCase();
  if (/heal|life|vital|grow|bloom|fertil|prosper/.test(lower)) return 'heal';
  if (/guard|fortress|wall|bound|shield|armor|monolith|bastion|prison/.test(lower)) return 'guard';
  if (/storm|wrath|doom|chaos|cataclysm|volcano|onslaught|desolat|discord/.test(lower)) return 'aoe';
  return ['strike', 'aoe', 'guard'][stableHash(name) % 3];
}

export function confluenceDefFor(essenceDefs) {
  if (essenceDefs.length < 3 || essenceDefs.some(d => !d)) return null;
  const sortedIds = essenceDefs.map(d => d.id).slice().sort();
  const name = resolveConfluenceName(sortedIds);
  const avgBase = Math.round(essenceDefs.reduce((s, d) => s + (d.base || 6), 0) / 3 * 1.6);
  const color = essenceDefs[1].color;
  const theme = confluenceThemeFor(name);
  // ROUND 53 -- a family, so materialFor stops falling through to
  // DEFAULT_ELEMENT ('essence', physical, no affliction). A Dragon confluence
  // is made of fire; a Kraken of the deep. Without this every confluence
  // ability in the game was elementally colourless.
  const concept = conceptFor(name);
  return { id: 'confluence', name, color, theme, base: avgBase, cooldown: 6,
    family: concept.family };
}

// ROUND 51 -- alternative nouns for a confluence innate whose first choice is
// already taken.
//
// The confluence names its innate after itself: `${c.name} Strike`. Some
// confluence names are also ESSENCE names -- Avatar is both -- and the essence's
// authored signature pool already contains an ability called "Avatar Strike".
// So a heal+shadow+avatar kit generated that name twice: once as the avatar
// essence's own innate, once as the Avatar confluence's.
//
// Two round-16 assertions had been failing on this for several rounds. The
// duplicate name is the obvious one; the subtler one is that the confluence's
// copy carries a GENERATED description while the name belongs to an AUTHORED
// ability, so "an authored name still leads with its authored flavor" failed on
// a line nobody had authored.
//
// The list is walked in order and the first free name wins, so a kit with no
// collision is completely unchanged.
// ROUND 63 -- widened, because this list is the whole name space for a
// confluence's innate and it was being read from the front every time.
const CONFLUENCE_INNATE_NOUNS = {
  heal: ['Rebirth', 'Renewal', 'Restoration', 'Convalescence', 'Mending',
    'Recovery', 'Quickening', 'Second Wind', 'Wellspring', 'Resurgence'],
  guard: ['Bulwark', 'Aegis', 'Rampart', 'Redoubt', 'Bastion',
    'Wall', 'Shieldwall', 'Standfast', 'Palisade', 'Keep'],
  strike: ['Strike', 'Lance', 'Spear', 'Javelin', 'Thrust',
    'Cut', 'Cleave', 'Impale', 'Rend', 'Sunder'],
  aoe: ['Nova', 'Cataclysm', 'Detonation', 'Upheaval', 'Eruption',
    'Shockwave', 'Rupture', 'Convulsion', 'Outburst', 'Storm'],
};

/**
 * The first `${c.name} <noun>` for this theme that is free.
 *
 * "Free" means two things, and the second is the one that took a second pass to
 * find. Not already in this kit, obviously. But also not a name some essence's
 * AUTHORED signature pool has reserved -- round 48 built exactly that set
 * (isReservedSignatureName) to stop the generated tiers handing out authored
 * names, and the confluence innate was the one path that never asked. A kit
 * where "Avatar Strike" happened to be unused still must not mint it here: the
 * name belongs to an authored ability with authored flavour, and this one would
 * arrive carrying a generated sentence instead.
 *
 * Falls back to the first noun when every option is taken, which keeps the
 * function total.
 */
function confluenceInnateName(c, theme, usedNames, buildSeed = '') {
  const nouns = CONFLUENCE_INNATE_NOUNS[theme] || CONFLUENCE_INNATE_NOUNS.aoe;
  // ROUND 63 -- START SOMEWHERE, NOT ALWAYS AT THE FRONT.
  //
  // This walked the list from index 0 and returned the first free option. The
  // dedupe is per-KIT and a kit holds exactly one confluence innate, so nothing
  // was ever taken and it returned nouns[0] every single time. Every confluence
  // in the game had exactly one innate name.
  //
  // That is where the worst name repetition in the game actually lived, and it
  // took four wrong turns to find: the count sat at exactly 125 through fixes
  // to the sheet tier, the thin-bucket rule, the synthetic bank and the label
  // rotation, because "Ambush Strike" was never coming from pickAbilityName at
  // all. An identical number across four unrelated edits is the tell.
  //
  // Offset by the confluence and its stones, so a given build still names its
  // innate the same way every time while two builds on the same confluence do
  // not. The list is also twice as long as it was.
  // Seeded off the BUILD, not the confluence: the confluence's own name is
  // constant across every kit that forms it, so keying on that alone gave all
  // 125 Ambush builds the same noun -- the count did not move, only the word
  // did. The three essences that formed it are what differ.
  const start = stableHash(`${buildSeed}|${c.name}|innate|${theme}`) % nouns.length;
  for (let i = 0; i < nouns.length; i++) {
    const noun = nouns[(start + i) % nouns.length];
    const candidate = `${c.name} ${noun}`;
    if (usedNames && usedNames.has(candidate)) continue;
    if (isReservedSignatureName(candidate)) continue;
    return candidate;
  }
  return `${c.name} ${nouns[start]}`;
}

// ===========================================================================
// ROUND 79 (bugs 2, 2.1) -- THE CONFLUENCE INNATE SAYS WHAT IT IS.
//
// The user, on being handed "Concentrates the Leviathan confluence into a
// single bolt aimed at 1 enemy":
//
//   "this is lazy, and worthless ... This has nothing to do with leviathan's
//    and is a complete flavor letdown for the first ability of a confluence
//    essence."
//
// They are right, and the galling part is that everything needed to write a
// good sentence was already loaded and thrown away. Round 53 built
// CONFLUENCE_CONCEPTS for exactly this complaint -- 101 confluences, each with
// the concrete nouns it gives a body, what it DOES, how it does it, and one
// clause about what bonding it feels like. The innate builder even computes
// `part`, `verb` and `adj` from it three lines above, and then every one of
// its four templates ignores all three and slots `c.name` into a fixed
// sentence.
//
// So this composes instead. Two vocabularies meet in every line:
//
//   the CONCEPT   Leviathan's "sounding depth", "sound", "deep-running"
//   the MATERIAL  aquatic's noun "tide" and adj "brine-slick"
//
// which is what turns "a bolt of the Leviathan confluence" into "a
// deep-running bolt of tide with a sounding depth behind it" -- the shape the
// user asked for in 2.1.1.
//
// Naming rule, as always: the NAME carries the flavour, the DESCRIPTION states
// the mechanic. These sentences say what the ability does; the numbers stay in
// the stats line.
// ===========================================================================
function confluenceInnateLine(c, concept, theme) {
  const mat = elementForFamily(concept.family) || {};
  const roll = (salt, n) => stableHash(`${c.name}|innate|${salt}`) % n;
  const pick = (arr, salt) => (arr && arr.length ? arr[roll(salt, arr.length)] : null);
  const part = pick(concept.parts, 'p');
  const verb = pick(concept.verbs, 'v');
  const adj = pick(concept.adjs, 'a');
  const noun = mat.noun || 'force';
  const madj = mat.adj || null;
  // Two adjectives in one sentence reads as a thesaurus rather than as a
  // voice, so the material's adjective is used only where the concept has
  // none -- which happens for the handful of concepts with a short adjs list.
  const bolt = madj && adj ? `${adj} ${noun}` : `${adj || madj || ''} ${noun}`.trim();
  switch (theme) {
    case 'heal':
      // The body clause is the best line in the concept and it is a statement
      // about the bearer, which is exactly what a self-heal is.
      return `${cap(concept.body)} -- and while it holds, the ${part} closes what has been opened in you.`;
    case 'armor':
      return `The ${part} turns outward and sets. Blows land on ${bolt} instead of on you, for as long as you can hold the shape.`;
    case 'guard':
      return `A ${bolt} rises between you and the world, in the shape of a ${part}, and holds until it is spent.`;
    case 'strike':
      return `Sends a bolt of ${bolt} out ahead of you with the weight of a ${part} behind it -- enough to ${verb} whatever it finds.`;
    default:
      return `Everything within reach is made to ${verb}. The ${part} opens outward, and the ${noun} goes with it.`;
  }
}


// The confluence's INNATE ability -- theme decides the shape. Round 6:
// carries a real `stats` line like every other ability.
// ROUND 51 -- `usedNames` is the kit's name set so far; see the note above.
export function confluenceInnateAbility(confDef, usedNames = null, spine = null, buildSeed = '',
  // ROUND 76 (item 4) -- may this kit still take a barrier? The confluence
  // innate is the FOURTH route to an absorb shield and was the only one with
  // no cap on it: every guard-themed confluence produced one unconditionally,
  // and it is added LAST, after all sixteen sockets and all three essence
  // innates have had their turn. Measured, that was the leak -- 31 of the 79
  // over-cap kits were a guard confluence stacked on a barrier something else
  // had already taken.
  //
  // Defaulted true so every caller that predates the cap is unaffected.
  barrierAllowed = true) {
  const c = confDef;
  // ROUND 53 -- THE SENTENCE THE USER QUOTED.
  //
  //   "Hurls a concentrated bolt of Dragon confluence is so uninspired and
  //    nonsensical as to be comedic."
  //
  // It was one of four hardcoded strings living here, and no amount of work
  // elsewhere could reach them: this function built its spec by hand, wrote its
  // own description, and returned before anything that adds flavour ever saw
  // it. So the innate now does what every other ability in the game does --
  // declares a category and goes through applyEssenceFlavour, which since this
  // round can read the confluence's own motif (its concept vocabulary) and pull
  // the build's spine on it.
  //
  // The seed descriptions below are written from the concept rather than from
  // the name, so even the case where no lever applies reads as something. The
  // difference is the difference between "a bolt of the Dragon confluence" and
  // "the furnace-throat opens".
  const concept = conceptFor(c.name);
  const roll = (salt, n) => stableHash(`${c.name}|${salt}`) % n;
  const part = concept.parts[roll('part', concept.parts.length)];
  const verb = concept.verbs[roll('verb', concept.verbs.length)];
  const adj = concept.adjs[roll('adj', concept.adjs.length)];

  let spec, catKey;
  if (c.theme === 'heal') {
    catKey = 'self_active_hot';
    spec = {
      name: confluenceInnateName(c, 'heal', usedNames, buildSeed), kind: 'active', category: 'healing', template: 'selfHot',
      color: c.color, cooldown: 9, hotPerSec: Math.max(3, Math.round(c.base * 0.35)), hotDuration: 5,
      desc: confluenceInnateLine(c, concept, 'heal'),
    };
  } else if (c.theme === 'guard' && !barrierAllowed) {
    // ROUND 76 (item 4) -- THE GUARD CONFLUENCE THAT CANNOT HAVE A BARRIER
    // HARDENS YOU INSTEAD.
    //
    // Refusing outright was the wrong shape: a guard-themed confluence with no
    // defensive innate at all is the confluence losing its identity to a cap
    // meant to stop repetition. Armour is the other half of what `guard`
    // means, it is the same category, and it is a genuinely different button
    // -- a barrier eats one big blow, armour blunts every blow -- so the kit
    // keeps a defensive innate and stops holding two of the same thing.
    catKey = 'self_active_armor';
    spec = {
      name: confluenceInnateName(c, 'guard', usedNames, buildSeed), kind: 'active', category: 'defensive', template: 'armorBuff',
      color: c.color, cooldown: 11, armorBonus: 0.14, buffDuration: 8,
      desc: confluenceInnateLine(c, concept, 'armor'),
    };
  } else if (c.theme === 'guard') {
    catKey = 'self_active_absorb';
    spec = {
      name: confluenceInnateName(c, 'guard', usedNames, buildSeed), kind: 'active', category: 'defensive', template: 'absorbShield',
      // ROUND 48 -- armorBonus was never set here, and absorbShield's stats line
      // prints it unconditionally, so every guard-themed confluence in the game
      // shipped a row reading "+0% armor for 6s".
      color: c.color, cooldown: 11, shieldAmount: Math.round(c.base * 2.2), shieldDuration: 6,
      armorBonus: 0.10,
      desc: confluenceInnateLine(c, concept, 'guard'),
    };
  } else if (c.theme === 'strike') {
    catKey = 'ranged_damage';
    spec = {
      name: confluenceInnateName(c, 'strike', usedNames, buildSeed), kind: 'active', category: 'attack', template: 'projectileBall',
      color: c.color, cooldown: 2.2, base: Math.round(c.base * 1.3), speed: 300, radius: 8,
      desc: confluenceInnateLine(c, concept, 'strike'),
    };
  } else {
    catKey = 'ranged_aoe';
    spec = {
      name: confluenceInnateName(c, 'aoe', usedNames, buildSeed), kind: 'active', category: 'attack', template: 'aoeRing',
      color: c.color, cooldown: 6, base: c.base, range: 120,
      desc: confluenceInnateLine(c, concept, 'aoe'),
    };
  }
  spec.catKey = catKey;
  spec.essenceId = 'confluence';
  // The same seam every other ability crosses: the mechanic is rolled, then the
  // build's agreed levers are pulled on it. `keepText` because the seed
  // sentence above is already the confluence's own voice -- the twist arrives
  // as one added clause rather than a rewrite, which is how an authored
  // signature is treated too.
  const cat = ABILITY_CATEGORY_BY_KEY[catKey];
  if (cat) {
    applyEssenceFlavour(spec, c, null, cat, roll, c.base, { keepText: true, spine });
    applyRuntimeFieldNames(spec);
  }
  assignAbilityCost(spec, null);   // ROUND 38 -- confluence innates pay mana like any other active
  // ROUND 79 (bug 9) -- a confluence has no essence id of its own (all 101 are
  // the literal 'confluence'), so it asks on behalf of its three parents --
  // the same route the creature summon takes for a confluence socket.
  // A confluence def carries no parent ids (id, name, color, theme, base,
  // cooldown, family), so the lookup falls to its FAMILY -- which is the rung
  // summonCreatures.js built for exactly this: an essence with no creature of
  // its own is answered by what its family calls.
  bindFamiliarCreature(spec, { id: 'confluence', family: confDef.family });
  spec.rankAspects = rankAspectsFor(spec);
  spec.stats = statsLineFor(spec);
  return spec;
}

// --- Awakening stone themes -- ROUND 9: derived for ALL 180 catalog
// stones (stoneCatalog.js) from each stone's thematic FAMILY. A family
// carries the category bias probed FIRST when building that stone's
// candidate pools -- the round-6 "thematically appropriate" technique,
// now spanning the full sheet: a Wolf stone leans bonded summons and
// attribute deepening, a Shield stone leans conjured armor, a Venom
// stone leans lingering-poison bolts, a Dimension stone leans blinks and
// stopped time. The DoT label is the family's damage-over-time flavor
// (null for families whose harm isn't lingering). 28 families cover the
// catalog; a stone's word/color/phrase come from its own catalog entry.
// ROUND 47 -- five families now lean on a TRIGGERED passive as well, where
// the trigger IS the family's flavor: storm and death fire the kill-bolt,
// blood answers a wound, mind rides a critical hit, dark waits for one.
// Bias only changes probe ORDER, so this makes those pairings likelier
// without taking anything off the table for the rest.
// ROUND 52 -- every family now carries a `hot` alongside its `dot`.
//
// The user: "Confirm that for healing we have HOTs as the counterpart to DOTs.
// This might have been why Renewal generated a linger lever." It was. HoTs
// existed as a TEMPLATE (selfHot, the regen aura, the heal pulse) but not as a
// RIDER, and the whole vocabulary of persistence -- Burn, Venom, Decay, Bleed
// -- was written for harm only. So a lever whose entire idea is "and it keeps
// working after it lands" had one polarity available to it and reached for
// that one wherever it was socketed, including on a healer.
//
// A dot label names the thing eating you. A hot label names the thing closing
// you up, in the same voice: a fire stone cauterises, a serpent stone sheds
// and regrows, a death stone grants a reprieve. Families with no affliction
// still get one of these, because a family that cannot rot can still mend.
export const FAMILY_TRAITS = {
  blade: { bias: ['summon_weapon', 'self_active_crit', 'martial_sunder', 'ranged_damage'], dot: 'Bleed', hot: 'Knitting' },
  bludgeon: { bias: ['martial_sunder', 'summon_weapon', 'self_active_aoe', 'self_active_damage'], dot: null, hot: 'Setting' },
  polearm: { bias: ['summon_weapon', 'martial_sunder', 'ranged_damage', 'movement_dash'], dot: null, hot: 'Steadying' },
  ranged: { bias: ['ranged_damage', 'ranged_aoe', 'perception'], dot: null, hot: 'Second Wind' },
  guard: { bias: ['self_active_armor', 'summon_armor', 'self_active_absorb', 'self_passive_buff'], dot: null, hot: 'Bulwark' },
  beast: { bias: ['summon_bonded', 'summon_creature', 'attr_boost', 'self_active_damage'], dot: null, hot: 'Vigour' },
  smallbeast: { bias: ['movement_dash', 'movement_passive', 'perception'], dot: null, hot: 'Quickening' },
  flyer: { bias: ['movement_haste_active', 'movement_dash', 'ranged_aoe'], dot: null, hot: 'Updraft' },
  aquatic: { bias: ['self_active_hot', 'self_active_heal', 'summon_bonded'], dot: 'Soak', hot: 'Tide' },
  serpent: { bias: ['ranged_dot', 'self_active_crit', 'summon_bonded'], dot: 'Venom', hot: 'Shedding' },
  fire: { bias: ['ranged_dot', 'self_active_aoe', 'self_passive_aoe'], dot: 'Burn', hot: 'Cautery' },
  water: { bias: ['self_active_hot', 'self_active_heal', 'self_passive_heal'], dot: 'Soak', hot: 'Freshet' },
  air: { bias: ['movement_dash', 'movement_haste_active', 'movement_passive'], dot: null, hot: 'Second Wind' },
  earth: { bias: ['self_active_armor', 'summon_armor', 'martial_sunder', 'self_active_absorb'], dot: null, hot: 'Bedrock' },
  cold: { bias: ['self_active_timefreeze', 'ranged_dot', 'self_active_absorb'], dot: 'Frostbite', hot: 'Numbing' },
  storm: { bias: ['ranged_damage', 'ranged_aoe', 'self_active_crit', 'triggered_kill_bolt'], dot: 'Shock', hot: 'Charge' },
  light: { bias: ['self_passive_heal', 'self_active_heal', 'self_passive_aoe'], dot: 'Sear', hot: 'Grace' },
  dark: { bias: ['self_active_crit', 'ranged_dot', 'perception', 'triggered_crit_drought'], dot: 'Wither', hot: 'Umbral Rest' },
  life: { bias: ['attr_boost', 'self_active_hot', 'summon_bonded'], dot: null, hot: 'Flourish' },
  death: { bias: ['ranged_dot', 'self_passive_aoe', 'summon_creature', 'summon_bonded', 'triggered_kill_bolt'], dot: 'Decay', hot: 'Reprieve' },
  blood: { bias: ['ranged_dot', 'self_active_hot', 'attr_boost', 'triggered_wounded_fury'], dot: 'Bleed', hot: 'Transfusion' },
  // ROUND 73 -- ALCHEMY, a family of its own, added with the potion slots.
  //
  // The user: "Awakening stones and Essences that might reduce this time
  // should exist, such as alchemy related stones." They have to EXIST before
  // they can reduce anything, and there were none -- no stone and no essence in
  // 188 and 146 respectively said alchemy, brewing, or anything adjacent. The
  // closest was the Alchemy CONFLUENCE name, which is a title the generator
  // hands out, not something you can go and find.
  //
  // Its own family rather than a flag on `craft`, because the family is what
  // FAMILY_TRAITS keys the generation bias off: an alchemy stone should roll
  // draughts and restoratives, and filed under `craft` it would have rolled
  // nets and thread. A new family needs an entry HERE or it silently falls to
  // `{bias: [], dot: null, hot: null}` and generates blandly -- which is the
  // trap that makes adding one look free.
  alchemy: { bias: ['self_active_heal', 'self_active_hot', 'self_passive_heal', 'self_active_buff'],
    dot: 'Corrosion', hot: 'Draught' },
  mind: { bias: ['perception', 'self_active_crit', 'attr_boost', 'triggered_crit_empower'], dot: null, hot: 'Composure' },
  motion: { bias: ['movement_haste_active', 'movement_passive', 'movement_teleport'], dot: null, hot: 'Momentum' },
  force: { bias: ['self_active_damage', 'martial_sunder', 'attr_boost', 'self_active_aoe'], dot: null, hot: 'Reinforcement' },
  order: { bias: ['self_active_absorb', 'self_active_armor', 'self_passive_heal', 'self_active_immunity'], dot: null, hot: 'Restitution' },
  craft: { bias: ['summon_gear', 'summon_turret', 'self_active_armor', 'summon_trap', 'summon_weapon', 'summon_armor'], dot: null, hot: 'Repair' },
  space: { bias: ['movement_teleport', 'self_active_timefreeze', 'movement_dash'], dot: null, hot: 'Realignment' },
  identity: { bias: ['self_active_immunity', 'attr_boost', 'summon_bonded'], dot: null, hot: 'Selfsame' },
};
export const STONE_THEMES = Object.fromEntries(Object.entries(STONE_CATALOG).map(([id, s]) => {
  const t = FAMILY_TRAITS[s.family] || { bias: [], dot: null, hot: null };
  return [id, { word: s.name, color: s.color, dot: t.dot ? { label: t.dot } : null,
    hot: t.hot ? { label: t.hot } : null, phrase: s.phrase, bias: t.bias, family: s.family }];
}));

// --- Category taxonomy. Round 6: buff actives retuned to powerful/short/
// long-cooldown, two NEW buff templates (immunity, time freeze), and the
// NEW attr_boost passive. Name banks are the FALLBACK when the TTRPG
// sheet has no unused name (see pickAbilityName). ---
export const ABILITY_CATEGORIES = [
  // ---- ACTIVES ----
  { key: 'ranged_damage', kind: 'active', category: 'attack', template: 'projectileBall',
    sheetTypes: ['Spell', 'Melee Attack', 'Ranged Attack'],
    names: ['{A} Bolt', '{A} Shot', '{A} Lance', '{A} Ray'] },
  { key: 'ranged_dot', kind: 'active', category: 'attack', template: 'projectileBall', wantsDot: true,
    sheetTypes: ['Spell', 'Melee Attack', 'Ranged Attack'],
    names: ['{A} Toxic Bolt', '{A} Blighted Shot', '{A} Festering Bolt', '{A} Corroding Ray'] },
  { key: 'ranged_aoe', kind: 'active', category: 'attack', template: 'projectileBall', explode: true,
    sheetTypes: ['Spell', 'Melee Attack', 'Ranged Attack'],
    names: ['{A} Detonation', '{A} Blast Bolt', '{A} Shockwave', '{A} Volley Burst'] },
  // ROUND 55 -- the three shapes the marquee confluences needed and the game
  // could not express. The user, on Dragon: "A breath attack like a dragon /
  // A storm of fireballs shooting 3 fireballs in seperate directions / ...
  // Dragon fire passive that buffs all fire into dragonfire which can't be
  // resisted." None of these were reachable by reskinning an existing template,
  // which is the bar this project set for adding one.
  // ROUND 56 -- the user's three: "Physical barriers (Could be terrain
  // manipulation, walls of fire, ice, or earth. Black holes or walls of force.)
  // / Reflection (spell reflect, debuff reflect, damage reflect) / Cooldown
  // reduction".
  //
  // Barriers come in three kinds because the user named three different things
  // and they are not one mechanic: a wall of EARTH stops you, a wall of FIRE
  // punishes you for crossing, and a black hole does the opposite of both.
  { key: 'barrier_block', kind: 'active', category: 'defensive', template: 'barrierWall',
    wallKind: 'block', sheetTypes: ['Defensive', 'Spell'],
    names: ['Wall of {A}', '{A} Bulwark', 'Raised {A}', '{A} Rampart'] },
  { key: 'barrier_burn', kind: 'active', category: 'attack', template: 'barrierWall',
    wallKind: 'burn', sheetTypes: ['Spell', 'Debuff'],
    names: ['{A} Barrier', 'Line of {A}', 'Searing {A}', '{A} Curtain'] },
  { key: 'barrier_pull', kind: 'active', category: 'attack', template: 'barrierWall',
    wallKind: 'pull', sheetTypes: ['Spell', 'Debuff'],
    names: ['{A} Singularity', 'Collapsing {A}', 'Maw of {A}', '{A} Wellspring'] },
  // Reflection. Damage-reflect had a template (thornsBuff); spell-reflect did
  // not, and that is the one worth adding -- a monster with a `dmgElement` is
  // answered by resistances rather than armour, so returning THAT is a
  // genuinely different defensive choice from returning a sword blow.
  { key: 'reflect_spell', kind: 'active', category: 'defensive', template: 'reflectWard',
    reflectKind: 'spell', sheetTypes: ['Defensive', 'Buff'],
    names: ['{A} Mirror', 'Turning {A}', '{A} Rebound', 'Answering {A}'] },
  { key: 'reflect_damage', kind: 'passive', category: 'passive buff', template: 'reflectWard',
    reflectKind: 'damage', sheetTypes: ['passive', 'Defensive'],
    names: ['{A} Barbs', 'Answering {A}', '{A} Recoil', 'Returned {A}'] },
  // ROUND 57 -- THE THIRD REFLECTION, and the one round 56 refused to build.
  //
  // The user listed "spell reflect, debuff reflect, damage reflect" in round
  // 56. Two were built and the third was declined, in those words:
  //
  //   "Debuff reflect was deliberately NOT built -- verified the player carries
  //    no debuffs at all, so there is nothing to reflect."
  //
  // That was the right call then and it is the wrong call now, because the same
  // round-57 request that adds the nineteen debuffs is what makes this real. It
  // is also the most interesting of the three: spell and damage reflect return
  // a NUMBER, and this one returns the thing itself -- a spider that webs you
  // gets webbed, on its own terms and at its own strength.
  { key: 'reflect_debuff', kind: 'active', category: 'defensive', template: 'reflectWard',
    reflectKind: 'debuff', sheetTypes: ['Defensive', 'Buff', 'Utility'],
    names: ['{A} Reversal', 'Turning {A}', '{A} Riposte', 'Answering {A}'] },
  // Cooldown reduction. The STAT already existed and was already applied at
  // cast -- what was missing was any way for a build to choose it.
  { key: 'cooldown_passive', kind: 'passive', category: 'passive buff', template: 'cooldownPassive',
    sheetTypes: ['passive', 'Buff'],
    names: ['{A} Cadence', 'Quickened {A}', '{A} Rhythm', 'Unhesitating {A}'] },
  { key: 'ranged_cone', kind: 'active', category: 'attack', template: 'breathCone',
    sheetTypes: ['Spell', 'Ranged Attack'],
    names: ['{A} Breath', 'Gout of {A}', '{A} Exhalation', 'Wash of {A}'] },
  { key: 'ranged_volley', kind: 'active', category: 'attack', template: 'volley',
    sheetTypes: ['Spell', 'Ranged Attack'],
    names: ['{A} Storm', 'Scatter of {A}', '{A} Salvo', 'Three-Fold {A}'] },
  { key: 'passive_element_pierce', kind: 'passive', category: 'passive buff', template: 'elementPierce',
    sheetTypes: ['passive', 'Buff'],
    names: ['Unanswerable {A}', 'True {A}', '{A} Unbarred', 'Pure {A}'] },
  { key: 'self_active_aoe', kind: 'active', category: 'attack', template: 'aoeRing',
    sheetTypes: ['Spell', 'Melee Attack'],
    names: ['Ring of {A}', '{A} Nova', '{A} Eruption', 'Burst of {A}'] },
  // ROUND 47 -- isBuff marks the categories the 2-buff cap counts (the
  // user's "a player should have 2 buff spells maximum"). It is exactly the
  // kind:'active' + category:'buff' family and nothing else: the 'defensive'
  // actives (armorBuff, absorbShield, thornsBuff) are a separate budget the
  // synergy scorer already treats separately, and the 'passive buff' family
  // (self_passive_buff, attr_boost, passive_conditional) is always-on
  // passives, not spells the player casts.
  { key: 'self_active_damage', kind: 'active', category: 'buff', template: 'selfPower', isBuff: true,
    sheetTypes: ['Buff'],
    names: ['{A} Battle Fury', '{A} Empowerment', '{A} War Cry', '{A} Adrenaline'] },
  { key: 'self_active_crit', kind: 'active', category: 'buff', template: 'selfCritBuff', isBuff: true,
    sheetTypes: ['Buff'],
    names: ['{A} Focus', '{A} Killer Instinct', '{A} Deadeye', "{A} Hunter's Edge"] },
  { key: 'self_active_immunity', kind: 'active', category: 'buff', template: 'immunityBuff', isBuff: true,
    sheetTypes: ['Buff', 'Defensive'],
    names: ['{A} Invulnerability', '{A} Iron Skin', 'Untouchable {A}', '{A} Absolute Guard'] },
  { key: 'self_active_timefreeze', kind: 'active', category: 'buff', template: 'timeFreeze', isBuff: true,
    sheetTypes: ['Buff', 'Spell'],
    names: ['{A} Stasis', 'Frozen Moment of {A}', '{A} Time Lock', '{A} Standstill'] },
  { key: 'self_active_heal', kind: 'active', category: 'healing', template: 'selfHeal',
    sheetTypes: ['Healing'],
    names: ['{A} Restoration', 'Healing {A}', '{A} Mending Rush', '{A} Second Wind'] },
  // ROUND 55 -- the user's two worked examples, as categories rather than as
  // one-off riders, so any essence whose build reaches them can produce one.
  //
  //   "Growth essence with a life awakening stone could generate a short lived
  //    plant that places blooms onto the player or nearby allies healing over
  //    time while in range."
  //   "A troll essence with a blood awakening stone might generate a small HOT
  //    on the user as a trigger every time they are hit with non fire damage.
  //    (Thematically to represent how trolls are know to regenerate unless
  //    burned.)"
  //
  // Both are gated on `renew`, so they appear only on a build whose three
  // essences agreed that things should keep working after they land.
  // ROUND 76 (item 5) -- this IS the user's AOE_HOT; see the note by party_buff.
  { key: 'bloom_field', kind: 'active', category: 'healing', template: 'bloomField', isSupport: true,
    leverGate: 'renew', sheetTypes: ['Healing', 'summon'],
    names: ['{A} Bloom', 'Field of {A}', '{A} Grove', 'Rooted {A}'] },
  { key: 'triggered_regen_on_hit', kind: 'passive', category: 'triggered', template: 'triggeredPassive',
    leverGate: 'renew', isTriggered: true,
    trigger: { on: 'hurtNonFire', cooldown: 4 },
    effect: { kind: 'regenBurst', perSec: 3, duration: 4 },
    sheetTypes: ['passive', 'Healing'],
    names: ['{A} Knitting', 'Troll-Blooded {A}', '{A} Regrowth', 'Unclosing {A}'] },
  { key: 'self_active_hot', kind: 'active', category: 'healing', template: 'selfHot',
    sheetTypes: ['Healing'],
    names: ['{A} Regeneration', '{A} Renewal', 'Lingering {A}', '{A} Recovery'] },
  { key: 'self_active_absorb', kind: 'active', category: 'defensive', template: 'absorbShield',
    sheetTypes: ['Defensive'],
    names: ['{A} Aegis', '{A} Bulwark Shell', '{A} Wardglass', 'Barrier of {A}'] },
  // ROUND 27 -- the user's ask: "Review abilities around defensive themes and
  // look for opportunities to add armor bonuses. Additionally look for martial
  // abilities and opportunities to sunder or reduce armor."
  //
  // Two new categories rather than only bolting armour onto the existing ones,
  // because the Armor stat needs BOTH halves to be interesting: something that
  // grants it, and something that takes it away. Without a sunder in the
  // ability pool, armour is a stat the player buys and monsters passively
  // have, and nobody ever interacts with it.
  { key: 'self_active_armor', kind: 'active', category: 'defensive', template: 'armorBuff',
    sheetTypes: ['Defensive', 'Buff'],
    names: ['{A} Ironhide', 'Plating of {A}', '{A} Carapace', '{A} Warding Skin'] },
  { key: 'martial_sunder', kind: 'active', category: 'attack', template: 'sunderStrike',
    sheetTypes: ['Melee Attack', 'Ranged Attack'],
    names: ['{A} Sunder', '{A} Rending Blow', 'Shatterstrike of {A}', '{A} Breach'] },
  { key: 'movement_dash', kind: 'active', category: 'movement', template: 'dash', isMovement: true,
    sheetTypes: ['Utility', 'Spell'],
    names: ['{A} Step', '{A} Dash', '{A} Surge', 'Quickstep of {A}'] },
  { key: 'movement_teleport', kind: 'active', category: 'movement', template: 'teleport', isMovement: true,
    sheetTypes: ['Utility', 'Spell'],
    names: ['{A} Blink', '{A} Warp', 'Rift of {A}', '{A} Shift'] },
  { key: 'movement_haste_active', kind: 'active', category: 'movement', template: 'movementHaste', isMovement: true,
    sheetTypes: ['Utility', 'Buff'],
    names: ['{A} Sprint', 'Swift {A}', '{A} Burst', '{A} Rush'] },
  // ---- ROUND 38 -- the skill-variety review (the user's sections 6.1-6.10).
  // Each of the ten requested families now has at least one category the
  // generator can roll, and every one keeps the flavor contract: names and
  // descriptions come from the stone's own theme words, so a Blood stone
  // rolls "Blood Communion Pulse" where a Frost stone rolls the same shape
  // as "Frost Communion Pulse" with frost phrasing.
  { key: 'aoe_heal_pulse', kind: 'active', category: 'healing', template: 'aoeHealPulse',      // 6.1
    isSupport: true,   // ROUND 76 (item 5) -- this IS the user's AOE_Heal
    sheetTypes: ['Healing', 'Spell'],
    names: ['{A} Communion Pulse', 'Circle of {A} Mending', '{A} Restoring Wave', 'Balm of {A}'] },
  // ===== ROUND 76 (item 5) -- THE SUPPORT KIT =============================
  //
  // The user: "Add AOE_HOT, AOE_Heal, party_Buff, AOE_Debuff to enable healing
  // and support kits."
  //
  // THREE OF THE FOUR ALREADY EXIST, and saying so plainly is worth more than
  // shipping near-duplicates beside them:
  //
  //     AOE_Heal   = `aoe_heal_pulse`  (directly above)
  //     AOE_HOT    = `bloom_field`     -- "a field that stands where it is cast
  //                                       and mends whoever is in it"
  //     AOE_Debuff = `aoe_weaken`      (directly below)
  //
  // All three are round 38's, all three are correct, and all three are
  // effectively absent. Measured over 400 kits: 22 heal pulses, 25 bloom
  // fields and 41 weakens, against 338 SELF-only heals. Round 50's complaint
  // -- "Healing powers I'm seeing are very self focused" -- is still true at
  // fifteen to one, and it was never a missing mechanic. It is the
  // reserved-seat lesson for the fifth time, and item 5's SUPPORT SEAT is the
  // fix. A fourth healing ring beside three unreachable ones would have made
  // the roster larger and a healer no likelier.
  //
  // ONE IS GENUINELY MISSING. PARTY_BUFF is the first ability in this game
  // that buffs somebody ELSE -- every buff until now wrote into the caster,
  // which is the other half of why a support kit could not be built. It pays
  // out through `auraGrant`, the `allies` lever's giving half, because that is
  // the one channel that already reaches a companion's damage (_partyDamage
  // reads it) and a second channel would mean two places deciding what a
  // companion hits for.
  { key: 'party_buff', kind: 'active', category: 'buff', template: 'partyBuff', isBuff: true,
    isSupport: true,
    sheetTypes: ['Buff', 'Spell'],
    names: ['{A} Rally', 'Banner of {A}', '{A} Exhortation', 'Shared {A}',
      '{A} Warcry', 'Gift of {A}'] },
  { key: 'aoe_dot_ring', kind: 'active', category: 'attack', template: 'aoeRing', wantsDot: true,  // 6.1
    sheetTypes: ['Spell'],
    names: ['{A} Miasma', 'Creeping Ring of {A}', '{A} Contagion', 'Spreading {A}'] },
  { key: 'aoe_weaken', kind: 'active', category: 'attack', template: 'weakenRing',             // 6.1
    isSupport: true,   // ROUND 76 (item 5) -- this IS the user's AOE_Debuff
    sheetTypes: ['Spell', 'Curse'],
    names: ['{A} Enfeeblement', 'Withering {A}', '{A} Malediction', 'Hex of {A}'] },
  { key: 'martial_distance', kind: 'active', category: 'attack', template: 'rangeStrike',      // 6.2
    sheetTypes: ['Melee Attack', 'Ranged Attack'],
    names: ['{A} Gap-Closer', 'Hurled {A}', '{A} Longstrike', 'Reaching {A}'] },
  { key: 'martial_reaper', kind: 'active', category: 'attack', template: 'stackStrike',        // 6.2
    sheetTypes: ['Melee Attack'],
    names: ['{A} Reaping', 'Harvest of {A}', '{A} Culmination', '{A} Detonating Blow'] },
  { key: 'ranged_leech', kind: 'active', category: 'attack', template: 'projectileBall', leech: true,  // 6.3
    sheetTypes: ['Spell'],
    names: ['{A} Siphon', 'Draining {A}', '{A} Lifetap', 'Hungering {A}'] },
  { key: 'imbue_strike', kind: 'active', category: 'buff', template: 'imbueStrike', isBuff: true,  // 6.4
    sheetTypes: ['Buff'],
    names: ['{A}-Laced Edge', 'Envenomed {A}', '{A} Anointment', 'Cursed Edge of {A}'] },
  { key: 'thorns_active', kind: 'active', category: 'defensive', template: 'thornsBuff',       // 6.6
    sheetTypes: ['Defensive'],
    names: ['{A} Bramblecoat', 'Spines of {A}', '{A} Retribution', 'Barbed {A}'] },
  { key: 'town_portal', kind: 'active', category: 'movement', template: 'townPortal', isMovement: true,  // 6.5
    sheetTypes: ['Utility', 'Spell'],
    names: ['{A} Gateway', 'Doorway of {A}', '{A} Homestep', 'Recall of {A}'] },
  // ---- ROUND 48 -- two categories the LEVER vocabulary requires.
  //
  // essenceLevers.js's `turn` biases 'confuse_turn' first and `fate` biases
  // 'fate_reroll' first. Both levers were added because two motif authors
  // working on different batches independently reached for the same two missing
  // shapes -- enemies fighting each other, and a second chance at a roll. Without
  // the categories here, both levers would quietly fall through to their
  // second-choice bias and the two essences that most wanted them would produce
  // the same generic control abilities as everything else.
  //
  // confuse_turn is filed under 'attack' rather than 'buff' on purpose: it is
  // offensive, it costs mana, and it must not eat one of the two buff slots.
  { key: 'confuse_turn', kind: 'active', category: 'attack', template: 'confuseTurn',
    sheetTypes: ['Spell', 'Curse'],
    names: ['{A} Discord', 'Turncoat {A}', '{A} Betrayal', 'Maddening {A}'] },
  // ---- ROUND 49 -- TAUNTS. The user's ask, verbatim:
  //
  //   "Also a new ability type that needs added, Taunts (Drawing monsters to
  //    the tank and away from the team)"
  //
  // Filed under 'defensive' rather than 'attack' or 'buff', and each of those
  // three placements is a real decision:
  //   - NOT 'buff', because round 47 capped the kit at two buff spells on the
  //     user's own instruction, and a tank spending one of its two on the
  //     ability that defines the role would leave the role with no room to be
  //     anything else. A taunt is not a self-buff; it changes what the MONSTERS
  //     do.
  //   - NOT 'attack', because it deals no damage and a category:'attack' spec
  //     is read as offensive by specTags, which steers the name banks toward
  //     harm words over a spell that does none.
  //   - 'defensive' puts it in the same budget as the shields and the armour
  //     buffs, which is where a tank already shops.
  //
  // sheetFilter is the taunt vocabulary the user's phrasing implies, so the
  // authored TTRPG-sheet names get first refusal before the '{A}' bank does:
  // a real "Challenging Roar" on the sheet should beat a synthesised
  // "Iron Provocation" every time.
  // leverGate: the one category in the taxonomy an essence has to EARN. See
  // categoryAllowedFor for the measurement that made it necessary.
  { key: 'taunt_pull', kind: 'active', category: 'defensive', template: 'tauntPull',
    leverGate: 'taunt',
    sheetTypes: ['Defensive', 'Buff', 'Utility'],
    sheetFilter: /roar|challeng|provo\w*|goad|bellow|dare|taunt|jeer|rally|beckon|bait|draw|shout|cry|call\w*|insult|scorn|mark/i,
    names: ['{A} Challenge', 'Roar of {A}', '{A} Provocation', 'Bellow of {A}'] },
  // ROUND 49 -- STEALTH. "Character becomes semi tranaparent reducing agro
  // radius and allowing for movement past monsters."
  //
  // Filed 'defensive' for the same three reasons the taunt above it is, and the
  // middle one is the load-bearing one: this is not a self-buff, it changes
  // what the MONSTERS do. A stealth that cost one of the kit's two buff slots
  // (round 47's cap, on the user's own instruction) would price a rogue out of
  // being a rogue.
  //
  // leverGate 'stealth': an essence has to EARN this one. Fifteen carry the
  // lever -- Dark, Smoke, Lurker, Cat, Mouse, Fox, Spider, Knife, Void, Malign,
  // Bat, Moon, Lizard, Snake and Hunt -- and nothing else in the catalog can
  // generate it, which is what keeps "appropriate essences" true rather than
  // aspirational.
  { key: 'stealth_veil', kind: 'active', category: 'defensive', template: 'stealthVeil',
    leverGate: 'stealth',
    sheetTypes: ['Defensive', 'Utility', 'Buff'],
    sheetFilter: /stealth|hide|hidden|conceal|shroud|veil|cloak|vanish|unseen|shadow|blend|slip|silent|quiet|fade|obscur|dim|smoke|mist|invisib|prowl|creep|skulk/i,
    names: ['{A} Veil', 'Shroud of {A}', '{A} Concealment', 'Unseen {A}'] },
  { key: 'fate_reroll', kind: 'passive', category: 'passive buff', template: 'fateReroll',
    sheetTypes: ['passive'], sheetFilter: /fate|fortune|luck|chance|second|again|destin|omen|providen|reprieve|turn|thread/i,
    names: ['{A} Second Chance', 'Fortune of {A}', '{A} Reprieve', 'Twice-Told {A}'] },
  // ---- PASSIVES ----
  { key: 'self_passive_aoe', kind: 'passive', category: 'aura', template: 'aura', auraEffect: 'damage', isAura: true,
    sheetTypes: ['Aura'],
    names: ['Aura of {A}', '{A} Resonance', 'Radiant {A}', '{A} Field'] },
  { key: 'self_passive_heal', kind: 'passive', category: 'aura', template: 'aura', auraEffect: 'regen', isAura: true,
    sheetTypes: ['Aura'],
    // ROUND 63 -- 'Passive {A} Mending' carried the same spreadsheet-label
    // artifact the sheet names did, and it is the last place the word survived:
    // cleanSheetName covers the sheet and signature tiers, but a template in
    // this table is minted, not looked up, so it never passed through either.
    names: ['Aura of {A} Renewal', "{A}'s Grace", 'Steady {A} Mending', '{A} Blessing'] },
  // ROUND 38 -- 6.9's other aura shapes: one that SLOWS what stands in it,
  // one that WEAKENS (armour + resist shred, so the whole kit hits harder).
  { key: 'self_passive_slow_aura', kind: 'passive', category: 'aura', template: 'aura', auraEffect: 'slow', isAura: true,
    sheetTypes: ['Aura'],
    names: ['Aura of Dragging {A}', '{A} Quagmire', 'Clinging {A}', '{A} Undertow'] },
  { key: 'self_passive_weaken_aura', kind: 'passive', category: 'aura', template: 'aura', auraEffect: 'weaken', isAura: true,
    sheetTypes: ['Aura'],
    names: ['Aura of {A} Decay', 'Unravelling {A}', '{A} Erosion', 'Corroding {A}'] },
  // ROUND 58 -- THE WARDING AURA. "Elemental resistance should also come from
  // some passive abilities, buffs, and aura abilities not exclusively gear."
  //
  // The other four auras all do something to what stands inside them; this one
  // does something for whoever carries it. It is also the aura whose worth is
  // most changed by this round's other half: Spirit widens every aura by 12% a
  // point, so a warding field is the one ability that gets better at protecting
  // your team specifically because you invested in Spirit.
  { key: 'self_passive_ward_aura', kind: 'passive', category: 'aura', template: 'aura', auraEffect: 'ward', isAura: true,
    sheetTypes: ['Aura', 'Defensive'],
    names: ['Aura of {A} Warding', '{A} Bulwark', 'Sheltering {A}', '{A} Aegis'] },
  // ROUND 38 -- 6.8: conditional passives. The CONDITION and the BONUS both
  // roll from the seed, so one essence/stone pair yields "at night" dodge
  // where another yields "against fire-touched foes" damage.
  { key: 'passive_conditional', kind: 'passive', category: 'passive buff', template: 'passiveConditional',
    sheetTypes: ['passive'],
    names: ['{A} Instinct', 'Opportunist of {A}', '{A} Predation', 'Favour of {A}'] },
  // ---- ROUND 47 -- TRIGGERED passives. The user: "Some passive abilities
  // should be triggered abilities", with four worked examples, all four
  // implemented here as generatable specs.
  //
  // They stay kind:'passive' deliberately. A new kind value would have made
  // them invisible to everything that already sorts a kit by kind -- the
  // 8-passive stone budget in rebuildKnownAbilities, the forced-kind filter,
  // the roster's A/P column, and the runtime's own passive list -- so the
  // marker is the TEMPLATE (TRIGGERED_PASSIVE_TEMPLATE) plus the trigger
  // descriptor, not the kind. The runtime finds them with isTriggeredPassive()
  // and switches on trigger.on, which is one of TRIGGER_KINDS.
  //
  // Numbers are the user's own, verbatim, and are NOT rolled: 100% extra
  // physical damage for 15s, +50% on the next spell, +100% crit chance,
  // 5-second cooldowns where specified. The only rolled number is the kill-
  // bolt's damage, because the user didn't give one -- it scales off the
  // combo base like every other generated damage figure.
  { key: 'triggered_wounded_fury', kind: 'passive', category: 'triggered', template: 'triggeredPassive',
    isTriggered: true,
    // rearmAbove: the trigger arms again only once HP climbs back over the
    // threshold, so this fires ONCE per time the player is driven under half
    // rather than every frame they spend there.
    trigger: { on: 'hpBelow', frac: 0.5, rearmAbove: 0.5 },
    effect: { kind: 'physicalDamageMult', amount: 1.0, duration: 15 },
    sheetTypes: ['passive'], sheetFilter: /rage|fury|wrath|desperat|last stand|defian|final|corner|berserk|blood|reckon/i,
    names: ['{A} Last Stand', 'Cornered {A}', '{A} Desperation', 'Wrath of Wounded {A}'] },
  { key: 'triggered_kill_bolt', kind: 'passive', category: 'triggered', template: 'triggeredPassive',
    isTriggered: true,
    trigger: { on: 'kill' },
    effect: { kind: 'boltNearest', target: 'nextNearest', onScreen: true },
    cooldown: 5,
    sheetTypes: ['passive'], sheetFilter: /reap|harvest|slay|cull|execut|hunter|fallen|storm|toll|scaveng|echo/i,
    names: ['{A} Chain of Death', "{A} Reaper's Toll", 'Arc of {A}', '{A} Deathspark'] },
  { key: 'triggered_crit_empower', kind: 'passive', category: 'triggered', template: 'triggeredPassive',
    isTriggered: true,
    trigger: { on: 'crit' },
    effect: { kind: 'nextSpellDamage', amount: 0.5, charges: 1 },
    cooldown: 5,
    sheetTypes: ['passive'], sheetFilter: /focus|precis|keen|edge|instinct|deadly|lethal|mark|hawk|flow|resonan/i,
    names: ['{A} Follow-Through', 'Resonant {A}', "{A} Killer's Rhythm", '{A} Momentum'] },
  { key: 'triggered_crit_drought', kind: 'passive', category: 'triggered', template: 'triggeredPassive',
    isTriggered: true,
    trigger: { on: 'critDrought', seconds: 15 },
    effect: { kind: 'critChance', amount: 1.0, strikes: 1 },
    sheetTypes: ['passive'], sheetFilter: /patien|stalk|momentum|coil|lurk|prowl|wait|still|sniper|ambush/i,
    names: ['{A} Patience', 'Coiled {A}', '{A} Pent Strike', 'Waiting {A}'] },
  // ---- ROUND 47 (item 7) -- WEAPON AFFINITY.
  //
  //   "some abilities should increase the strike range or attack speed of
  //    attacks with a specific weapon type (obviously a spear essence is
  //    likely to grant bonuses for having a spear equipped). This should
  //    affect the translucent indicator that tells the player where their
  //    strike is hitting."
  //
  // The weapon is not rolled blind: weaponFromTheme() reads the stone's own
  // theme words first, so a Lance/Pike/Impaler stone genuinely produces a
  // spear affinity and only an unmatched stone falls back to the seed. That
  // is the "obviously" in the user's sentence -- the connection has to be
  // legible, or an affinity is just a stat with a weapon name stapled on.
  //
  // sheetFilter deliberately catches the martial vocabulary so the authored
  // skill-sheet names get first refusal before the {A}-template names do.
  // ROUND 48 -- the user's second Ape x Fire example, verbatim:
  //   "Buff 'Ape arms', attacks and spells have double range for 45 seconds
  //    on a 5 minute cooldown."
  // The `reach` lever could previously only express itself as a permanent
  // range increase, so the BUFF form of it -- the form the user actually
  // described -- had runtime support (template 'rangeBuff') and nothing that
  // generated it. isBuff, so it counts against round 47's 2-buff cap like any
  // other castable buff.
  { key: 'reach_buff', kind: 'active', category: 'buff', template: 'rangeBuff', isBuff: true,
    sheetTypes: ['Buff', 'Utility'],
    sheetFilter: /reach|arm|long|extend|far|grasp|span|stretch/i,
    names: ['{A} Arms', 'Long {A}', '{A} Grasp', 'Reach of {A}'] },
  { key: 'weapon_affinity', kind: 'passive', category: 'weapon affinity', template: 'weaponAffinity',
    isWeaponAffinity: true,
    sheetTypes: ['passive'], sheetFilter: /grip|mastery|form|stance|drill|hand|craft|art|discipl|training|kata|wield/i,
    names: ['{A} Grip', 'Form of {A}', '{A} Mastery', "{A} Weaponcraft"] },
  { key: 'perception', kind: 'passive', category: 'perception', template: 'perception', isPerception: true,
    sheetTypes: ['passive'], sheetFilter: /eye|sight|sense|percep|aware|vision|watch/i,
    names: ['{A} Sight', '{A} Awareness', 'Eyes of {A}', '{A} Perception'] },
  { key: 'summon_bonded', kind: 'passive', category: 'summon', template: 'summonBonded',
    sheetTypes: ['summon'], sheetFilter: /construct|companion|guardian|familiar|sentinel|ally|sapling|revival/i,
    names: ['Bonded {A}', '{A} Companion', 'Oath of {A}', '{A}-Bound Ally'] },
  // ROUND 59 -- THE ACTIVE SUMMONS. "Creatures, turrets, traps, and generally
  // short lived summons that have high damage."
  //
  // Measured before this round: Summon was 10.6% of every kit -- the second
  // largest function in the game -- and all 4,251 across 2,000 kits were
  // passive. There was no summon a player could cast. These three are the
  // first, and they are three BEHAVIOURS rather than one with three names:
  // the creature hunts, the turret holds ground, the trap waits.
  { key: 'summon_creature', kind: 'active', category: 'summon', template: 'activeSummon', namesAreNouns: true,
    summonKind: 'creature',
    sheetTypes: ['summon', 'Attack'],
    // Body-part words (claw, fang, maw) are deliberately absent: the sheet
    // files 'Claw Sword' and 'Claw Dagger' as weapon names, and a creature
    // summon called Claw Sword names the wrong noun entirely.
    sheetFilter: /beast|hound|wolf|hunter|swarm|horror|spawn|brood|stalker|familiar|companion/i,
    // ROUND 76 -- TEN TEMPLATES, WAS FOUR, and this is item 2's bill coming in.
    //
    // The reserved summon seat and the escalating pull took `summon_creature`
    // from 25 abilities in 10,000 to a category that appears in most kits, and
    // the name bank did not move with it: four templates times one stone word
    // is four names per stone for a category now generating twenty times as
    // many abilities. Measured by round 63's own probe, "Frog Unleashed"
    // reached 0.79% of an 18,000-ability roster -- edging past "Ambush Strike"
    // at 0.78%, which is the exact name that probe was written to catch.
    //
    // Ten templates divides the peak by two and a half and costs nothing else.
    // The right fix for a monoculture is more vocabulary, not a looser test.
    names: ['{A} Unleashed', 'Call the {A}', '{A} Hunter', 'Loosed {A}',
      'The {A} Answers', '{A} at Heel', 'Summon the {A}', '{A} Bound',
      'Whistle for the {A}', '{A} Kept'] },
  { key: 'summon_turret', kind: 'active', category: 'summon', template: 'activeSummon', namesAreNouns: true,
    summonKind: 'turret',
    sheetTypes: ['summon', 'Attack'],
    sheetFilter: /tower|spire|engine|pylon|sentry|obelisk|beacon|totem|pillar|brazier/i,
    names: ['{A} Sentry', 'Pillar of {A}', '{A} Engine', 'Standing {A}'] },
  { key: 'summon_trap', kind: 'active', category: 'summon', template: 'activeSummon', namesAreNouns: true,
    summonKind: 'trap',
    sheetTypes: ['summon', 'Attack', 'Utility'],
    // `gin`, `catch`, `spring` and `pit` were all too loose: they matched
    // 'enGINe', 'Catch of the Day', 'HandSPRING' and 'PITy' respectively.
    // A vocabulary that admits the wrong word is worse than a short one --
    // what it rejects falls through to the authored bank, which is on-theme
    // by construction.
    sheetFilter: /trap|snare|\bmine\b|jaws|pitfall|tripwire|deadfall|noose/i,
    names: ['{A} Snare', 'Buried {A}', '{A} Jaws', 'Waiting {A}'] },
  { key: 'movement_passive', kind: 'passive', category: 'movement', template: 'passiveMove', isMovement: true,
    sheetTypes: ['passive'], sheetFilter: /step|stride|speed|swift|quick|fleet|wind/i,
    names: ['{A} Stride', '{A} Wind-Step', 'Fleet {A}', '{A} Gait'] },
  { key: 'self_passive_buff', kind: 'passive', category: 'passive buff', template: 'passiveBuff',
    sheetTypes: ['passive'],
    names: ['{A} Resolve', '{A} Temper', '{A} Ascendance', "{A}'s Might"] },
  // ROUND 6 -- the "Strength of Atlas" / "Gaia's Fountain" pattern: +1 to
  // the slot's bound attribute per rank from Iron up. Falls under the
  // spec's "passive buffs" family.
  { key: 'attr_boost', kind: 'passive', category: 'passive buff', template: 'attrBoost',
    sheetTypes: [],
    names: ['{A} Attunement', 'Gift of {A}', '{A} Communion', '{A} Wellspring'] },
  // ===== ROUND 77 (items 6.1 and 6.3) ====================================
  //
  // Two passives that are POWERS rather than numbers: one lets you hold a
  // scythe in one hand, the other lets you walk on water. Neither adds a
  // percentage to anything, which is why both are gated to a named list of
  // sources rather than being reachable from any strong-sounding essence --
  // an ability that changes what you can DO is worth being rare.
  //
  // Both sit in 'passive buff' so the kit-shape arithmetic (12 active, 8
  // passive) is untouched by their arrival; what makes them different is the
  // seat, not the category.
  { key: 'two_hand_wield', kind: 'passive', category: 'passive buff', template: 'twoHandWield',
    sheetTypes: [],
    names: ['The Unburdened Grip', "Titan's Hand", 'One-Hand Hold', 'The Easy Weight',
      'Carrying Strength', 'The Light Scythe'] },
  { key: 'water_walk', kind: 'passive', category: 'movement', template: 'waterWalk',
    isMovement: true, sheetTypes: [],
    names: ['The Dry Step', 'Surface Tension', 'Waterstride', 'The Unbroken Skin',
      'Skim', 'Feet of the Still Water'] },
  // ===== ROUND 75 -- THE STACKING FAMILY ==================================
  //
  //   "rare build-defining buffs/debuffs with stacking instances that
  //    accumulate and are consumed"
  //
  // with Sophie's Blessing of Anticipation, Jason's Sin / Mark of Sin and
  // Sophie's Agent of Karma as the named examples. The user chose a GENERATED
  // rare family with those three authored as signatures inside it, rather than
  // the three alone -- so these three categories are the family, and
  // stacking.js's STACK_SIGNATURES are the named ones the right essences reach.
  //
  // `rareOnly` is what makes them build-defining rather than common. Every
  // other category competes for an ordinary socket; these are offered ONLY on
  // the 1-in-40 rare seat (see the isRare branch in the socket loop), which
  // means a kit either has one and is built around it or does not have one at
  // all. A stacking effect in every third socket would be a stat line; one per
  // several kits is a build.
  { key: 'stack_boon', kind: 'passive', category: 'stacking', template: 'stacking',
    stackShape: 'boon', rareOnly: true,
    sheetTypes: ['passive', 'Buff', 'Utility'],
    sheetFilter: /focus|patience|momentum|rhythm|resolve|prepar|foresight|poise|tempo|vigil/i,
    names: ['{A} Momentum', 'Gathering {A}', '{A} Ascendant', 'Rising {A}'] },
  { key: 'stack_mark', kind: 'passive', category: 'stacking', template: 'stacking',
    stackShape: 'mark', rareOnly: true,
    sheetTypes: ['passive', 'Attack', 'Debuff'],
    sheetFilter: /mark|brand|tally|sin|debt|sigil|stain|reckon|judge|weight/i,
    names: ['Mark of {A}', '{A} Reckoning', 'Brand of {A}', 'The {A} Tally'] },
  { key: 'stack_ledger', kind: 'passive', category: 'stacking', template: 'stacking',
    stackShape: 'ledger', rareOnly: true,
    sheetTypes: ['passive', 'Buff', 'Defence'],
    sheetFilter: /balance|karma|scale|ledger|answer|return|recompense|justice|due|debt/i,
    names: ['Agent of {A}', '{A} Recompense', 'The {A} Ledger', '{A} Answered'] },

  { key: 'summon_weapon', kind: 'passive', category: 'weapon summon', template: 'summonWeapon',
    sheetTypes: ['summon'], sheetFilter: /sword|blade|axe|spear|dagger|staff|whip|chain|bow|weapon|knife|sickle|scythe/i,
    names: ['Summon {A} Insignia', '{A}-Etched Talisman', 'Relic of {A} Might', '{A} War Charm'] },
  { key: 'summon_armor', kind: 'passive', category: 'armor summon', template: 'summonArmor',
    sheetTypes: ['summon'], sheetFilter: /breastplate|plate|armor|armour|shield|helm|vestment|carapace|ward/i,
    names: ['Summon {A} Ward', '{A}-Blessed Vestments', 'Relic of {A} Protection', '{A} Aegis Charm'] },
  { key: 'summon_gear', kind: 'passive', category: 'gear summon', template: 'summonGear',
    sheetTypes: ['summon'], sheetFilter: /gauntlet|boot|helmet|ring|amulet|charm|trinket|regalia|talisman|insignia|glove/i,
    names: ['{A} Regalia', '{A} Trinket of Power', '{A} Lucky Charm', '{A} Signet'] },
];
export const ABILITY_CATEGORY_BY_KEY = Object.fromEntries(ABILITY_CATEGORIES.map(c => [c.key, c]));
const ACTIVE_CATEGORIES = ABILITY_CATEGORIES.filter(c => c.kind === 'active');
const PASSIVE_CATEGORIES = ABILITY_CATEGORIES.filter(c => c.kind === 'passive');

// ROUND 47 -- the triggered-passive contract, exported so the runtime has
// ONE place to switch on rather than string-matching names or templates by
// hand. Every generated triggered passive carries:
//   template === TRIGGERED_PASSIVE_TEMPLATE
//   trigger  = { on: <one of TRIGGER_KINDS>, ...descriptor fields }
//   effect   = { kind: <one of TRIGGER_EFFECT_KINDS>, ...descriptor fields }
//   cooldown = seconds, or undefined where the trigger has no cooldown
// The runtime handler is expected to switch on trigger.on, then apply
// effect.kind. Nothing else about the spec is load-bearing to it.
// ROUND 47 -- the templates the isBuff categories generate, derived rather
// than listed so the two can never drift apart. Used to judge a catKey-less
// INNATE against the buff cap: an essence with no signature pool keeps its
// ESSENCE_DEFS-shaped ability, and Might's "+35% damage for 30s" is a buff
// spell by any reading and spends a slot -- but a fallback carrying no
// template at all is not a castable buff and must not eat the budget.
export const BUFF_TEMPLATES = [...new Set(ABILITY_CATEGORIES.filter(c => c.isBuff).map(c => c.template))];

// ROUND 47 (item 7) -- the weapon-affinity contract. A generated affinity
// carries:
//   template === WEAPON_AFFINITY_TEMPLATE
//   weaponId       -- a key of WEAPONS
//   rangePct       -- fraction added to that weapon's reach (0 if speed-only)
//   attackSpeedPct -- fraction cut off its cooldown (0 if reach-only)
// The runtime reads both at the top of the swing so the hit test, the damage
// and the telegraph all use the SAME reach. Nothing else is load-bearing.
export const WEAPON_AFFINITY_TEMPLATE = 'weaponAffinity';
export const WEAPON_AFFINITY_MODES = ['reach', 'speed', 'both'];

// --- ROUND 74 (item 6): WHERE A WEAPON BONUS IS ALLOWED TO COME FROM -------
//
// The user, with a screenshot:
//
//   "awakening stone of magic with a bow essence gave me a spear bonus. This
//    makes no sense, weapon bonus effects need to come from either the
//    appropriate weapon essence or awakening stone of that weapon."
//
// WHAT WENT WRONG, exactly. Rounds 47 and 48 picked the weapon by matching a
// regex table against a concatenated blob of the stone's word and phrase, the
// essence's name, and the essence's motif parts and verbs. `spear` was tested
// first and its pattern included `skewer` -- and `skewer` is one of the BOW
// essence's own motif verbs (essenceMotifs.js). So the haystack for Magic x
// Bow read "...nock arrow quiver fletching bracer loose draw sight skewer",
// the spear pattern hit on the bow's own vocabulary, and the affinity came
// back `spear`. Nothing in the whole path ever asked whether the weapon had
// anything to do with the essence or the stone.
//
// That is fault class four from HANDOFF.md -- a naming convention read as a
// behaviour claim. A word appearing in a description is not a statement about
// what the thing IS, and a regex over prose can only ever guess.
//
// So the guessing is gone. A weapon affinity now comes from an ITEM THAT IS A
// WEAPON, declared here as data. Twenty-six essences and twenty-six stones
// carry a weapon identity in their own name (they are the four weapon
// families -- blade, polearm, bludgeon, ranged), and every other essence and
// stone in the game has NO weapon identity at all. Magic does not. Neither
// does Fire, or Shield, or Ape.
//
// Keyed by the catalogue NAME rather than by id, because the essence and the
// stone of a weapon share it -- `essBow` and `stoneBow` are both 'Bow' -- and
// two rows per weapon is two rows to forget to update.
export const WEAPON_BY_IDENTITY = {
  // blade
  Sword: 'sword', Knife: 'dagger', Needle: 'dagger', Claw: 'dagger',
  Sickle: 'scythe', Spike: 'javelin', Whip: 'whip',
  'the Unbroken Line': 'sword',       // stoneDivineWar, the war god's own
  // polearm
  Spear: 'spear', Staff: 'staff', Fork: 'spear', Rake: 'scythe',
  Hook: 'whip', Sceptre: 'staff', Shovel: 'hammer', Trowel: 'dagger',
  // bludgeon
  Axe: 'axe', Hammer: 'hammer',
  // ranged
  Bow: 'bow', Gun: 'crossbow',
};

/** The weapon a single catalogue row IS, or null if it is not a weapon.
 *  Takes an ESSENCE_CATALOG or STONE_CATALOG row -- they have the same shape
 *  and the same names, which is the whole reason one table serves both. */
export function weaponIdentityOf(def) {
  if (!def) return null;
  // `name` OR `word`: the same catalogue row reaches this function under two
  // shapes. ESSENCE_CATALOG and STONE_CATALOG rows call the display name
  // `name`; STONE_THEMES -- the derived view the generator actually holds at
  // the point an affinity is built -- renames it `word` (see the
  // Object.fromEntries above). Reading only `name` silently returned null for
  // every stone in the generator's own hot path, which meant the ESSENCE
  // always won: measured, essSword x stoneRake produced a sword affinity when
  // the socketed stone was a Rake.
  return WEAPON_BY_IDENTITY[def.name || def.word] || null;
}

/**
 * The weapon a socket's affinity is FOR, or null if it may not have one.
 *
 * The stone is asked first and the essence second, because the stone is the
 * thing the player chose to put in this particular socket: an Awakening Stone
 * of Sword in a Bow essence is a player asking for a sword bonus, and the
 * essence is what that bonus is made of. With neither naming a weapon the
 * answer is NULL and the category is refused outright (see tryCat) -- there
 * is deliberately no seeded fallback any more. A fallback is what turned "we
 * could not tell" into "here is a spear", which is the bug.
 */
export function weaponForAffinity(stone, essDef) {
  return weaponIdentityOf(stone) || weaponIdentityOf(essDef) || null;
}

// ROUND 49 (taunts) -- THE FIELD CONTRACT, generator side. The runtime side of
// the same contract is at the top of WorldScene.js under "THE FIELD CONTRACT
// LIVES HERE", and these are the names it reads:
//
//   template: 'tauntPull'   kind: 'active'   category: 'defensive'
//     tauntRadius    number  how far the pull reaches
//     tauntDuration  number  seconds monsters stay fixed on the taunter
//     tauntMax       number  how many monsters it can hold
//     threatMult     number  damage multiplier while taunted (>= 1, optional)
//
// Written down here rather than only over there because of what round 48 cost:
// the twist and the runtime were authored in parallel, picked different names
// for the same mechanic, and shipped 45 chain / 46 ally / 19 reroll specs that
// had correct stats lines, correct descriptions and did NOTHING in play. The
// defaults below are the numbers the runtime falls back to, so a hand-written
// spec that omits a field still behaves rather than reading NaN.
export const TAUNT_TEMPLATE = 'tauntPull';
export const TAUNT_DEFAULT_RADIUS = 220;
export const TAUNT_DEFAULT_DURATION = 6;
export const TAUNT_DEFAULT_MAX = 6;
/** Every field a taunt-carrying spec must have by the time it leaves the
 *  generator. Exported so the suite checks the contract instead of a list it
 *  copied out of this file and can silently fall behind. */
export const TAUNT_CONTRACT_FIELDS = ['tauntRadius', 'tauntDuration', 'tauntMax'];
/** True for anything the taunt runtime should act on -- the dedicated category
 *  AND any ability wearing the lever's rider. One predicate, so the cast path
 *  and the suite can never disagree about what counts as a taunt. */
export function isTaunt(a) {
  return !!a && (a.template === TAUNT_TEMPLATE || typeof a.tauntRadius === 'number');
}

// ROUND 49 (stealth) -- THE FIELD CONTRACT, generator side. Runtime side lives
// in WorldScene under "THE STEALTH RUNTIME".
//
//   template: 'stealthVeil'   kind: 'active'   category: 'defensive'
//     stealthDuration  number  seconds the veil holds if nothing breaks it
//     stealthAlpha     number  0..1, how solid you still look while veiled
//     aggroMult        number  0..1, what a monster's sight range is multiplied
//                              by while you are veiled -- this is the "reducing
//                              agro radius" half, and the "movement past
//                              monsters" half falls out of it
//     stealthSpeedPct  number  optional move-speed bonus while veiled
export const STEALTH_TEMPLATE = 'stealthVeil';
/** Every field a stealth-carrying spec must have by the time it leaves the
 *  generator. Exported so the suite asserts the same list the runtime reads. */
export const STEALTH_CONTRACT_FIELDS = ['stealthDuration', 'stealthAlpha', 'aggroMult'];
/** 'self' (most of them) or 'party'. See the generator's note on scope. */
export const STEALTH_SCOPES = ['self', 'party'];
/** True for anything the stealth runtime should act on. Same shape as isTaunt,
 *  and for the same reason: one predicate the generator, the runtime and the
 *  suite all share, so they cannot disagree about what counts. */
export function isStealth(a) {
  return !!a && (a.template === STEALTH_TEMPLATE || typeof a.aggroMult === 'number');
}

export const TRIGGERED_PASSIVE_TEMPLATE = 'triggeredPassive';
// ROUND 55 -- `hurtNonFire` and `regenBurst` join the contract: the troll's
// reflex ("a small HOT on the user as a trigger every time they are hit with
// non fire damage"). This pair of lists is what round 47's suite checks every
// triggered passive against, so a new trigger that is not named here is a
// trigger the runtime may not honour -- which is exactly what the assertion is
// for, and it caught this one.
export const TRIGGER_KINDS = ['hpBelow', 'kill', 'crit', 'critDrought', 'hurtNonFire'];
export const TRIGGER_EFFECT_KINDS = ['physicalDamageMult', 'boltNearest', 'nextSpellDamage',
  'critChance', 'regenBurst'];
export const TRIGGERED_CATEGORY_KEYS = ABILITY_CATEGORIES.filter(c => c.isTriggered).map(c => c.key);
export function isTriggeredPassive(a) {
  return !!a && a.template === TRIGGERED_PASSIVE_TEMPLATE && !!a.trigger;
}

// Authored attr-boost name banks -- the user's own two examples verbatim,
// plus companions in the same voice, per attribute.
export const ATTR_BOOST_NAMES = {
  power: ['Strength of Atlas', 'Might of the Colossus', "Titan's Burden", 'Heart of the Mountain'],
  spirit: ['Wisdom of the Ancients', 'Soul of the Magus', 'Font of Arcana', "Seer's Insight"],
  speed: ['Winds of Hermes', 'Quicksilver Soul', 'Stride of the Zephyr', "Falcon's Grace"],
  recovery: ["Gaia's Fountain", 'Phoenix Blood', 'Wellspring of Life', "Troll's Vigor"],
};
const ATTR_LABEL_LOCAL = { power: 'Power', spirit: 'Spirit', speed: 'Speed', recovery: 'Recovery' };

// ===========================================================================
// ROUND 77 (item 6.2) -- WHAT AN ATTRIBUTE ABILITY GAINS WITH RANK.
//
// The user: "Passive abilities (from thematically appropriate essences) to
// increase Power, Speed, Spirit, or Recovery by 1 (WITH ADDITIONAL EFFECTS NOT
// ADDITIONAL ATTRIBUTE POINTS) as you move up through the ranks."
//
// The emphasis is theirs and it inverts what round 6 built. `attr_boost` has
// granted `1 + rankStepsPastIron(rank)` since the day it was written -- one
// point at Iron and four at Gold, which is precisely "additional attribute
// points as you move up through the ranks" and precisely what this sentence
// rules out. It is also what made the cap in 6.2.1 necessary, since one such
// ability took a bound attribute from 4 to 8.
//
// So: ONE POINT, FOREVER. What ranks up is the ability, not the number.
//
// Each rank from Bronze adds a NAMED RIDER, drawn from what that attribute
// already feeds (stats.js ATTR_SCALE), so the growth reads as the same power
// deepening rather than as three unrelated bonuses stapled to a stat stick.
// Power buys health, crit damage, block and armour -- so Power's riders are
// armour, then block, then a thorn. Speed buys stamina, attack speed, dodge
// and movement -- so Speed's are movement, then dodge, then attack speed.
//
// The amounts are deliberately modest. This ability's real payoff is the cap
// it unlocks (see attrCapFor); the riders are what stop the intervening ranks
// feeling like nothing happened.
// ===========================================================================
export const ATTR_RANK_RIDERS = {
  power: [
    { rank: 'bronze', stat: 'armor', amount: 0.06, text: 'your skin turns a blow it would not have' },
    { rank: 'silver', stat: 'blockChance', amount: 0.05, text: 'you set yourself against a strike without thinking about it' },
    { rank: 'gold', stat: 'critDamage', amount: 0.15, text: 'and what you do land, lands ruinously' },
  ],
  speed: [
    { rank: 'bronze', stat: 'moveSpeed', amount: 0.05, text: 'ground goes by faster than it used to' },
    { rank: 'silver', stat: 'dodgeChance', amount: 0.05, text: 'you are somewhere else by the time it arrives' },
    { rank: 'gold', stat: 'attackSpeed', amount: 0.08, text: 'and your hands have stopped waiting for you' },
  ],
  spirit: [
    { rank: 'bronze', stat: 'manaRegen', amount: 0.10, text: 'the well fills quicker than you empty it' },
    { rank: 'silver', stat: 'castSpeed', amount: 0.06, text: 'the working is done before you have finished thinking it' },
    { rank: 'gold', stat: 'critChance', amount: 0.04, text: 'and now and then it comes out better than you meant' },
  ],
  recovery: [
    { rank: 'bronze', stat: 'hpRegen', amount: 0.12, text: 'the small hurts close on their own' },
    { rank: 'silver', stat: 'staminaRegen', amount: 0.12, text: 'you get your breath back between things' },
    { rank: 'gold', stat: 'cooldownReduction', amount: 0.06, text: 'and everything you have comes round again sooner' },
  ],
};

/** The riders live at this rank, in ladder order. `rank` is the player's, so
 *  an ability's effects grow as its owner does with nothing stored. */
export function attrRidersAt(attr, rank) {
  const all = ATTR_RANK_RIDERS[attr] || [];
  const at = RANK_ORDER.indexOf(rank);
  return all.filter(r => at >= RANK_ORDER.indexOf(r.rank));
}

/**
 * ROUND 77 -- WATER WALKING'S OWN RIDERS.
 *
 * "later ranks have bonuses from standing on water or swamp tiles". Same
 * ladder as the attribute riders and deliberately so: two abilities that grow
 * with rank should grow at the same three ranks, or the player has two mental
 * models of what "later ranks" means.
 *
 * These are stronger than the attribute riders because they are CONDITIONAL --
 * they pay only while the player is standing on the water they can now cross,
 * which in most fights is nowhere at all. A number that applies a tenth of the
 * time has to be worth having when it does.
 */
export const WATER_WALK_RIDERS = [
  { rank: 'bronze', stat: 'moveSpeed', amount: 0.15, text: 'you move over it faster than over ground' },
  { rank: 'silver', stat: 'manaRegen', amount: 0.35, text: 'and it gives something back while you stand on it' },
  { rank: 'gold', stat: 'dodgeChance', amount: 0.12, text: 'and nothing that has to wade can lay a hand on you' },
];
export function waterRidersAt(rank) {
  const at = RANK_ORDER.indexOf(rank);
  return WATER_WALK_RIDERS.filter(r => at >= RANK_ORDER.indexOf(r.rank));
}

/** One rider as a short phrase, for the stats line. Shared by both families so
 *  the two can never describe the same stat two different ways. */
export function formatRider(r) {
  const pctStat = ['armor', 'blockChance', 'dodgeChance', 'critChance', 'attackSpeed',
    'castSpeed', 'cooldownReduction', 'moveSpeed'];
  const label = { armor: 'armour', blockChance: 'block', dodgeChance: 'dodge',
    critChance: 'crit chance', critDamage: 'crit damage', attackSpeed: 'attack speed',
    castSpeed: 'cast speed', cooldownReduction: 'cooldown reduction', moveSpeed: 'movement',
    hpRegen: 'health recovery', manaRegen: 'mana recovery', staminaRegen: 'stamina recovery' }[r.stat] || r.stat;
  const n = pctStat.includes(r.stat) ? `+${Math.round(r.amount * 100)}%` : `+${Math.round(r.amount * 100)}%`;
  return `${n} ${label}`;
}

/** Faults a suite can assert. Kept beside the table so the two cannot drift. */
export function attrRiderFaults() {
  const out = [];
  for (const attr of Object.keys(ATTR_LABEL_LOCAL)) {
    const rs = ATTR_RANK_RIDERS[attr];
    if (!rs || !rs.length) { out.push(`${attr} has no rank riders`); continue; }
    // Every attribute must grow at the same three ranks, or one attribute's
    // ability is quietly worse than another's for reasons nobody chose.
    const ranks = rs.map(r => r.rank).join(',');
    if (ranks !== 'bronze,silver,gold') out.push(`${attr} riders are at ${ranks}, not bronze,silver,gold`);
    for (const r of rs) {
      if (!r.stat) out.push(`${attr} ${r.rank} rider names no stat`);
      if (!(r.amount > 0)) out.push(`${attr} ${r.rank} rider has no amount`);
      if (!r.text) out.push(`${attr} ${r.rank} rider has no prose`);
    }
  }
  return out;
}

// Kit-shape constants -- the round-5 spec's exact numbers.
export const ESSENCE_SLOTS = 3;
export const STONES_PER_SLOT = 4;
export const TOTAL_STONE_SOCKETS = 16;
export const ACTIVE_TARGET = 12;
export const PASSIVE_TARGET = 8;
export const STONE_ACTIVE_TARGET = 8;
export const STONE_PASSIVE_TARGET = 8;

/**
 * ROUND 74 (item 5) -- HOW MANY OF THOSE ACTIVES HAVE TO BE ATTACKS.
 *
 * The user, with a screenshot:
 *
 *   "The technology/bow/staff/nebula build only produced 2 attacks in the
 *    first 12 abilities... this isn't a case of mostly defensive essences."
 *
 * He was right, and it was not that build. MEASURED over 300 random kits
 * before this change:
 *
 *   active abilities per kit .................. 9.48
 *   of which deal damage ...................... 2.69
 *   kits with 2 or fewer attacks .............. 174 of 300  (58%)
 *   kits with NO attack at all ................   7 of 300
 *   the reported build, exactly ............... 2  (Static Shock, Technology Rivet)
 *
 * And the composition of those 9.48 actives, per kit: 2.93 attack, 2.35
 * defensive, 1.79 buff, 1.18 healing, 1.05 movement, 0.20 summon. More than
 * half of what a character could press did not hurt anything.
 *
 * WHY THE EXISTING FLOOR DID NOT CATCH IT. Round 51 added a "one damage
 * option" guarantee, and it was doing its job as written -- `abilityDeals`
 * counts a weapon affinity, a thorns passive and a bonded familiar's damage,
 * all of which are damage OPTIONS and none of which is a thing you press. So a
 * kit with a spear affinity, a thorns aura and one bolt satisfied a floor
 * named "damage" while the player had one attack. Fault class four: the name
 * said one thing and the player read another.
 *
 * The floor is on ACTIVE attacks now, and it is expressed the same way the
 * 8/8 active-passive split already is -- as a target the socket loop forces
 * toward once the remaining budget is no longer enough to reach it. A kit that
 * makes four attacks on its own never notices this constant exists, which is
 * what keeps builds from converging on exactly four.
 *
 * Four of the eight active sockets, not more: half your castable kit being
 * attacks is a floor a player would recognise as an ARPG character, and
 * setting it higher would start deciding builds rather than catching broken
 * ones.
 */
export const STONE_ATTACK_TARGET = 4;
export const MOVEMENT_CAP = 2;
// ROUND 47 -- "a player should have 2 buff spells maximum". Same shape as
// MOVEMENT_CAP: a hard ceiling counted across the whole kit, enforced at
// candidate-pool time so a capped-out kit never even offers a third buff.
// Unlike the aura/perception caps there is no rare essence-triplet raiser --
// the user's number is a maximum, not a target.
export const BUFF_CAP = 2;
// ROUND 56 -- how many abilities in one kit may come through a STONE DOOR: a
// category the socketed stone opens that the essence's own levers never could.
// Two, not one, because a player who sockets three shadow stones into a healer
// is deliberately building a healer that hides and should get more than a
// single token of it -- and not more than two, because the seat is reserved
// ahead of the bias fill and a third would start displacing the essence's own
// identity rather than adding to it.
export const STONE_DOOR_CAP = 2;
/**
 * ROUND 76 (item 5) -- how many RESERVED support seats one kit may spend.
 *
 * The seat is per-socket and 33 of the 148 essences carry a mending or ally
 * lever, so a Life slot reserved a support seat in all four of its sockets and
 * a kit holding one healer essence came out with three or four AOE heals.
 * Measured without this cap: 601 support abilities across 400 kits, 44% of
 * kits holding two or more, and support outnumbering self-only healing two to
 * one -- which is round 50's complaint inverted rather than answered.
 *
 * Three, counted the way the stone door's allowance is: what the kit has
 * TAKEN, not what it has been offered. Support beyond three is still perfectly
 * reachable, it just has to win a seat on merit like everything else -- which
 * is what makes a real support build a BUILD rather than a consequence of
 * socketing one Life essence.
 */
export const SUPPORT_SEAT_CAP = 3;
/** The four the user named. One list, read by the seat and by its allowance. */
export const SUPPORT_CATEGORY_KEYS = ['aoe_heal_pulse', 'bloom_field', 'party_buff', 'aoe_weaken'];
export const POOL_MIN = 6, POOL_MAX = 8;

export function hasMultiAuraPassive(essenceIds) {
  const ids = essenceIds.filter(Boolean);
  if (ids.length < 3) return false;
  return stableHash(ids.slice().sort().join(',') + '|multiaura') % 300 === 0;
}
export function hasMultiPerceptionPassive(essenceIds) {
  const ids = essenceIds.filter(Boolean);
  if (ids.length < 3) return false;
  return stableHash(ids.slice().sort().join(',') + '|multiperception') % 300 === 0;
}

// Formats a cooldown for stats lines -- long cooldowns read in minutes.
function fmtCd(cd) {
  if (cd >= 120) return `${Math.round(cd / 60)}m cd`;
  return `${cd}s cd`;
}
// ROUND 10: a summoned relic's Epic-tier stat rolls, appended to its line.
function relicBuffsLine(a) {
  if (!a.itemBuffs || !a.itemBuffs.length) return '';
  // ROUND 79 (bug 2.3) -- the "Epic:" label is gone. A conjured relic's buffs
  // are live the moment it is equipped, so grouping them behind a quality word
  // read as a second rank gate sitting inside the rank heading the card now
  // carries ("Iron Rank Effect: +20% weapon damage . Epic: ..."). They are
  // simply more of what the relic does.
  return ' · ' + a.itemBuffs.map(formatBuff).join(' · ');
}

// ROUND 6 -- the real-numbers line shown alongside every ability's flavor
// text ("Ability descriptions need to have the actual damage and cooldown
// alongside the flavor"). One place, covers every template (innates and
// generated abilities alike).
// ROUND 38 -- resource costs (the user's 6.3): "Spells and abilities need to
// consume mana, and weapon strikes should be consuming stamina. Maybe some
// blood related abilities allow the use of life force in place of stamina or
// mana." Martial and movement actives draw on STAMINA (they are exertions of
// the body); everything else active draws on MANA. A gore-themed combination
// (blood, bone, sacrifice, death...) can pay in LIFE when the well runs dry
// -- at a 1.5x exchange, so blood is a lifeline and not a free third bar.
export const MARTIAL_TEMPLATES = ['sunderStrike', 'rangeStrike', 'stackStrike', 'imbueStrike'];
export const MOVEMENT_COST_TEMPLATES = ['dash', 'teleport', 'movementHaste', 'townPortal'];
// ROUND 47 -- the user: "Movement skills are costing too much stamina making
// them hardly worth more than sprinting. Reduce the cost by 50% and double
// the durations." Both halves are expressed as multipliers against the
// round-38 numbers rather than as rewritten literals, so the before/after is
// legible in the source and a future retune is one constant.
//
// Measured against the yardstick the user named: sprint (WorldScene's
// SPRINT_STAMINA_PER_SEC) burns 12 stamina/second for +55% speed. At the
// round-38 price a dash cost 8 stamina -- two thirds of a second of
// sprinting for one ~110px hop -- which is the complaint, exactly. At 4 it
// is a third of a second, and it is instant and passes over ground a sprint
// has to cross.
//
// DURATIONS: only movementHaste actually rolls one (buffDuration, 4-6s ->
// 8-12s). Dash and teleport are instantaneous -- their scalar is a DISTANCE,
// not a duration, and doubling a blink's range is a reach change the user
// didn't ask for, so those are left where they are and the halved cost
// carries the retune for them. townPortal has no duration either.
export const MOVEMENT_COST_MULT = 0.5;
export const MOVEMENT_DURATION_MULT = 2;
export const BLOOD_THEME_RE = /blood|gore|bone|death|sacrif|pain|carnage|butcher|vampir|leech|flesh|reaper|grave/i;
export function assignAbilityCost(spec, stone) {
  if (spec.kind !== 'active') return;
  const power = spec.base || spec.healAmount || spec.shieldAmount || spec.armorBonus * 40 || 8;
  if (MARTIAL_TEMPLATES.includes(spec.template)) {
    spec.cost = { type: 'stamina', amount: Math.max(5, Math.round(5 + power * 0.5)) };
  } else if (MOVEMENT_COST_TEMPLATES.includes(spec.template)) {
    // ROUND 47 -- halved (townPortal 15 -> 8, everything else 8 -> 4).
    const full = spec.template === 'townPortal' ? 15 : 8;
    spec.cost = { type: 'stamina', amount: Math.max(1, Math.round(full * MOVEMENT_COST_MULT)) };
  } else {
    spec.cost = { type: 'mana', amount: Math.max(4, Math.round(4 + power * 0.55)) };
  }
  const themed = `${(stone && stone.word) || ''} ${(stone && stone.phrase) || ''} ${spec.name || ''}`;
  if (BLOOD_THEME_RE.test(themed)) spec.bloodSurrogate = true;
}

// ===========================================================================
// ROUND 57 -- CAST TIMES
//
// "I still havent seen any spells with a cast time. Some stronger attacks
//  should take a 1-5 seconds (scaling with strength) to cast."
//
// Two words in that sentence do the work. "SOME": most abilities stay instant,
// or the game becomes a queue. And "STRONGER": the cast time has to be earned
// by the ability's own magnitude, not sprinkled on at random, or a player
// cannot learn the rule that big things take time.
// ===========================================================================
export const CAST_TIME_MIN = 1;
export const CAST_TIME_MAX = 5;

// What never gets one, and why:
//   movement   -- a dash you have to charge for is a different mechanic, and a
//                 worse one; escape that takes three seconds is not escape.
//   martial    -- a swing is a swing. The weapon's own cadence is its timing.
//   reactive   -- a shield, a ward or a heal you must charge is a shield that
//                 arrives after the blow it was meant to stop.
//   triggered  -- fires on its own; there is nobody to hold the button.
export const NO_CAST_TIME_TEMPLATES = [
  ...MOVEMENT_COST_TEMPLATES, ...MARTIAL_TEMPLATES,
  'absorbShield', 'armorBuff', 'selfHeal', 'selfHot', 'aoeHealPulse',
  'reflectWard', 'immunityBuff', 'thornsBuff', 'stealthVeil', 'tauntPull',
  'fateReroll', 'perception', 'aura',
];

/**
 * How big this ability is, on a 0..1 scale, blending the two things that
 * actually say "big" in this game: what it does, and how long you wait to do
 * it again. Neither alone is enough -- a long cooldown on a weak utility is not
 * a heavy spell, and a big number on a six-second cooldown is a rotation
 * staple.
 */
// How much wider than one target a template reaches. This is the missing half
// of "strength": at level 0 every ability's `base` sits between 4 and 23, so
// raw damage barely discriminates -- what actually separates a heavy ability
// from a light one is how many things it lands on and how many times.
export const CAST_AREA_MULT = {
  timeFreeze: 3.0, aoeRing: 2.6, aoeDotRing: 2.4, breathCone: 2.2,
  weakenRing: 2.2, confuseTurn: 2.0, barrierWall: 1.8, bloomField: 1.6,
};

export function castStrength(spec) {
  const mag = spec.base || spec.healAmount || spec.shieldAmount
    || (spec.tickAmount ? spec.tickAmount * 3 : 0) || 0;
  // MEASURED, not guessed. Across 3,905 eligible actives the magnitude band is
  // p10=4, p50=7, p90=12, max=23, and the cooldown band is p50=7s, p75=12s,
  // p90=330s, max=600s. The first draft of this function normalised magnitude
  // against 30 and cooldown against 300, so the median ability scored 0.11 and
  // nothing but the ten-minute ultimates cleared the bar -- every cast time in
  // the game came out between 1.1s and 1.2s, which is not a scale.
  //
  // Magnitude is normalised against its OWN band, and cooldown logarithmically,
  // because that band is bimodal: everything is 1-12s or it is 4-10 minutes,
  // and a linear read of that gap makes the whole middle of the roster zero.
  // IMPACT, not damage. A second draft: normalising `mag` alone put a cast bar
  // on the three ultimate self-buffs and on almost nothing else, because a
  // bolt and a firestorm have nearly the same `base` and differ entirely in
  // what they land on. Multiplying by the volley count and the area reach is
  // what makes "a storm of fireballs" read as stronger than one fireball,
  // which is the distinction the user was pointing at.
  // ROUND 79 (bug 5) -- AN AOE'S IMPACT IS READ BACK AT FULL STRENGTH.
  //
  // `mag` is per-target damage, and round 79 halved that for every AOE in the
  // game (see AOE_TARGET_FRAC). The area multipliers above were measured when
  // an AOE dealt roughly a bolt's damage to each thing it caught, so they
  // encode "how many targets" against a full-strength base -- and with a
  // halved base they under-count an AOE by exactly the factor the balance
  // change introduced.
  //
  // That is not a small bookkeeping point. Cast time is derived from strength,
  // so leaving it alone silently pulled the top off the user's own 1-5 second
  // band: measured, the longest cast in the game fell from 4.8s to 2.6s and
  // the four- and five-second casts vanished entirely. Nothing about the game
  // had become gentler -- an AOE still hits a crowd for the same total, which
  // is what this function is asking about. Only the number it was reading had
  // moved.
  const impact = mag
    * (spec.isAoe ? 1 / AOE_TARGET_FRAC : 1)
    * Math.max(1, spec.volleyCount || 1)
    * (CAST_AREA_MULT[spec.template] || 1)
    * (spec.explodeRadius ? 1.5 : 1);
  const impactN = Math.max(0, Math.min(1, (impact - 8) / 35));
  const cd = spec.cooldown || 0;
  const cdN = cd <= 5 ? 0 : Math.min(1, Math.log(cd / 5) / Math.log(120));
  // Weighted toward impact because the user asked for stronger ATTACKS to take
  // longer; the cooldown is as much a statement about how OFTEN you may do a
  // thing as about how big it is, so it is the smaller half.
  return impactN * 0.65 + cdN * 0.35;
}

// Below this an ability is instant; at the ceiling it casts for the full five
// seconds. BOTH numbers are measured, not chosen: across 3,905 eligible actives
// castStrength runs 0 to 0.598, with p20 at 0.296. Mapping the band 0.28-0.60
// onto 1-5s is what makes the user's "1-5 seconds" a real scale rather than a
// label -- the first draft divided by (1 - threshold) and, since nothing in the
// game ever scores above 0.6, produced a game where every cast time was 1.2s.
export const CAST_TIME_THRESHOLD = 0.28;
export const CAST_STRENGTH_CEILING = 0.6;

// ===========================================================================
// ROUND 57 -- THE DEBUFF AN ABILITY LEAVES BEHIND
//
// "...with a chance to roll on abilities (as thematically appropriate)"
// "These debuffs can add further diversity to differentiate otherwise similar
//  abilities."
//
// That second sentence is the design brief, and it is the same problem rounds
// 51 to 56 have been chipping at from the other end: two kits that both roll a
// bolt are two kits that feel alike. Every previous answer worked by making the
// bolts RARER. This one makes two bolts different from each other -- one
// freezes and one blights -- which is the first tool this project has had that
// adds separation without removing anything.
//
// It is gated on element AND lever together (see thematicDebuffsFor), so it can
// never become a nineteen-sided die: a frost essence's bolt has seven things it
// might do and none of them is disease.
// ===========================================================================

// Templates that put something ON an enemy. A shield cannot poison anybody, and
// a debuff whose stats line promised otherwise would be round 48's bug again --
// correct text, no effect.
export const DEBUFF_CARRIER_TEMPLATES = [
  'projectileBall', 'aoeRing', 'imbueStrike', 'breathCone', 'volley',
  'rangeStrike', 'stackStrike', 'sunderStrike', 'chainStrike',
  'weakenRing', 'barrierWall', 'aoeDotRing', 'confuseTurn', 'timeFreeze',
];

/** Roughly two in five carriers get one. Enough that a kit of twelve actives
 *  has several, few enough that the player can still tell them apart. */
export const DEBUFF_ROLL_RATE = 0.4;

export function assignAbilityDebuff(spec, essDef, comboSeed) {
  if (!spec || !DEBUFF_CARRIER_TEMPLATES.includes(spec.template)) return;
  const h = (salt) => stableHash(`${comboSeed}|dbf|${spec.name || ''}|${salt}`);
  if ((h('has') % 1000) / 1000 >= DEBUFF_ROLL_RATE) return;

  // Both halves of "thematically appropriate": the channel it deals in, and
  // what its essence is actually about. The applied lever leads because it is
  // the most specific statement about THIS ability.
  const motif = ESSENCE_MOTIFS[essDef && essDef.id];
  const levers = [spec.lever, ...((motif && motif.levers) || [])].filter(Boolean);
  const pool = thematicDebuffsFor(spec.element, levers);
  if (!pool.length) return;
  // WEIGHTED, not uniform. A uniform pick over each element's shortlist gave
  // stun 317 rolls and freeze 9 across 24,000 abilities -- not because stun is
  // better but because `physical` is the commonest element and has the shortest
  // list, so everything in it came up often. Weighting by kind rather than by
  // pool position makes the two controls equally rare wherever they appear,
  // which is what "rarer because stronger" should mean.
  const weightOf = (d) => (d.pickWeight != null ? d.pickWeight
    : d.kind === 'control' ? 2 : d.kind === 'amplify' ? 2 : 3);
  const total = pool.reduce((n, d) => n + weightOf(d), 0);
  let tick = h('pick') % total;
  let def = pool[pool.length - 1];
  for (const d of pool) { tick -= weightOf(d); if (tick < 0) { def = d; break; } }

  // A control debuff is worth far more than a slow, so it lands far less often.
  // Without this split a frost bolt with a 45% freeze would simply be the best
  // ability in the game.
  const isControl = def.kind === 'control';
  const chance = isControl
    ? 0.10 + (h('chance') % 11) / 100      // 10%..20%
    : 0.25 + (h('chance') % 31) / 100;     // 25%..55%

  spec.debuff = {
    key: def.key,
    chance: Math.round(chance * 100) / 100,
    duration: debuffDuration(def, (h('dur') % 100) / 100),
    stacks: 1,
    potency: 1,
  };
}

/**
 * ROUND 57 -- the DESCRIPTION says it too.
 *
 * The user's standing rule is that the name carries flavour and the description
 * states the mechanic, so a bolt that freezes has to say it freezes in the
 * sentence, not only in the spec line the player has to decode.
 */
export function appendDebuffClause(spec) {
  const d = spec && spec.debuff;
  const def = d && DEBUFFS[d.key];
  if (!def) return spec;
  spec.desc = `${String(spec.desc || '').replace(/\s*$/, '')} `
    + debuffClause(def, { duration: d.duration, chance: d.chance });
  return spec;
}

/** The stats-line fragment. Kept separate from the description so the two can
 *  say the same thing in their own registers -- the line is a spec sheet, the
 *  description is a sentence. */
export function debuffStatsFragment(a) {
  const d = a && a.debuff;
  const def = d && DEBUFFS[d.key];
  if (!def) return '';
  return ` · ${Math.round(d.chance * 100)}% ${def.label.toLowerCase()} ${d.duration}s`;
}

export function assignCastTime(spec) {
  if (!spec || spec.kind !== 'active') return;
  if (NO_CAST_TIME_TEMPLATES.includes(spec.template)) return;
  const s = castStrength(spec);
  if (s < CAST_TIME_THRESHOLD) return;
  // Remapped so the threshold is the bottom of the 1s band rather than a step:
  // the weakest ability that qualifies casts in about a second, not in three.
  const raw = Math.min(1, (s - CAST_TIME_THRESHOLD)
    / (CAST_STRENGTH_CEILING - CAST_TIME_THRESHOLD));
  // The strength distribution is heavily bottom-loaded -- p50 is 0.074 and p20
  // is 0.296 -- so among the abilities that DO qualify, most sit just above the
  // bar. A linear map put 1.2% of them above 2.5s, which means a player would
  // essentially never see a long cast and the top of the user's "1-5 seconds"
  // would be decoration. The exponent lifts the middle of the qualifying set
  // without moving either end: the weakest that qualifies still casts in 1s and
  // the strongest in the game still casts in 5s.
  const t = Math.pow(raw, 0.6);
  spec.castTime = Math.round((CAST_TIME_MIN + (CAST_TIME_MAX - CAST_TIME_MIN) * t) * 10) / 10;
}

/**
 * ROUND 58 -- THE ONE PLACE AN ABILITY IS GRANTED RESISTANCE.
 *
 * Two call sites wrote `spec.resist` directly -- the `ward` lever and the
 * no-lever fallback -- and both carried the same two faults:
 *
 *   PHYSICAL IS NOT AN ELEMENT. `materialFor` returns 'physical' for a great
 *   many stones and there is no `resist_physical` stat; ELEMENT_TYPES is the
 *   six magical channels. Those abilities promised "+14% physical resistance"
 *   and wrote a key nothing reads. Armour is this game's physical resistance --
 *   _monsterHitPlayer answers typed damage with resist_* and untyped damage
 *   with armour, as two exclusive branches -- so a physical ward hardens armour
 *   instead: the same promise, in the currency the runtime has.
 *
 *   A WARDING AURA ALREADY IS THIS EFFECT. Adding a second, smaller grant
 *   beside it produced "grants 21% fire resistance ... It also grants 9% fire
 *   resistance" -- the fifth duplicate-rider of the shape round 56 documented.
 *   It folds into the aura's own number instead.
 *
 * @returns the clause to say, or '' when the grant folded into something the
 *          base line already prints.
 */
// ROUND 62 -- ONE CLAUSE, SEVERAL SENTENCES.
//
// The user recognised an exact sentence and was right to. Gating `ward` cut it
// from 15.1% of levers to 9.3%, but the armour CLAUSE only fell from 13.7% of
// abilities to 12.0% -- because grantResistance funnels every physical stone
// into the same two strings, so the fewer times ward fires, the higher the
// share of those firings that print the identical words.
//
// A lever's share is a balance question. Whether the same words come out every
// time is a writing question, and it is the one the player actually notices.
// Picked deterministically so an ability keeps its own phrasing.
const ARMOUR_PHRASES_ACTIVE = [
  (n) => `While it holds, it also hardens your armour by ${n}%.`,
  (n) => `It thickens your guard by ${n}% for as long as it lasts.`,
  (n) => `Your armour answers ${n}% better while it is up.`,
  (n) => `For its duration, blows land ${n}% shallower.`,
  (n) => `It sets ${n}% more armour between you and the next hit.`,
];
const ARMOUR_PHRASES_PASSIVE = [
  (n) => `It also hardens your armour by ${n}% at all times.`,
  (n) => `Your guard is permanently ${n}% thicker for carrying it.`,
  (n) => `It keeps ${n}% more armour on you, always.`,
  (n) => `Everything you wear turns blows ${n}% better.`,
  (n) => `A standing ${n}% improvement to your armour.`,
];
const RESIST_PHRASES_ACTIVE = [
  (n, e) => `While it holds, it also grants ${n}% ${e} resistance.`,
  (n, e) => `${cap(e)} bites ${n}% less deeply while it lasts.`,
  (n, e) => `For its duration you shrug off ${n}% of incoming ${e}.`,
  (n, e) => `It stands ${n}% ${e} resistance up around you.`,
];
const RESIST_PHRASES_PASSIVE = [
  (n, e) => `It also grants ${n}% ${e} resistance at all times.`,
  (n, e) => `You carry ${n}% ${e} resistance for as long as you carry it.`,
  (n, e) => `${cap(e)} is permanently ${n}% less dangerous to you.`,
  (n, e) => `A standing ${n}% guard against ${e}.`,
];
// ROUND 62 -- which reading a perception takes, from the essence's own theme.
// Ordered like FAMILY_TOKENS: the first match wins, so the most specific
// vocabulary sits first. An essence matching nothing falls to a seeded roll,
// which keeps every mode reachable rather than leaving the unmatched half of
// the catalogue on one default.
const PERCEPTION_TOKENS = [
  ['truesight', /wolf|hound|hunt|stalk|predator|spider|owl|cat|lynx|prey|track|scent|ambush|veil|hidden|reveal/i],
  ['bondsense', /unity|bond|pack|ally|companion|oath|kin|heart|troop|banner|shield|guardian|shepherd|renewal|life/i],
  ['nightsight', /night|dark|dusk|gloom|moon|shadow|umbra|eclipse|black|raven|bat/i],
  ['weakspots', /adept|scholar|insight|knowledge|precision|needle|edge|flaw|crack|break|study|sage|rune|arcane/i],
  ['healthbars', /blood|flesh|vital|wound|hunger|feast|devour|vein|pulse|butcher|carrion/i],
  ['mapsense', /star|sky|compass|road|journey|travel|wander|wind|bird|map|horizon|scout|beacon/i],
];
const PERCEPTION_MODES = ['mapsense', 'nightsight', 'healthbars', 'weakspots', 'truesight', 'bondsense'];
function perceptionModeFor(essDef, stone, roll) {
  const text = `${(essDef && essDef.name) || ''} ${(essDef && essDef.id) || ''} ${stone || ''}`;
  for (const [mode, re] of PERCEPTION_TOKENS) if (re.test(text)) return mode;
  return PERCEPTION_MODES[roll('percmode', PERCEPTION_MODES.length)];
}

/** Deterministic index into a phrase bank, from whatever identifies this spec. */
function phraseIndex(spec, mat, n) {
  const key = `${spec.template || ''}|${spec.category || ''}|${mat.element || ''}`;
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  return h % n;
}

function grantResistance(spec, mat, amt, opts = {}) {
  const pctOf = (x) => Math.round(x * 100);
  if (mat.element === 'physical') {
    spec.armorBonus = Math.round(((spec.armorBonus || 0) + amt) * 100) / 100;
    const bank = spec.kind === 'passive' ? ARMOUR_PHRASES_PASSIVE : ARMOUR_PHRASES_ACTIVE;
    return bank[phraseIndex(spec, mat, bank.length)](pctOf(amt));
  }
  if (spec.template === 'aura' && spec.auraEffect === 'ward' && spec.wardResist
      && spec.wardResist.element === mat.element) {
    spec.wardResist.amount = Math.round(Math.min(0.5, spec.wardResist.amount + amt) * 100) / 100;
    spec._leverFolded = true;
    return '';
  }
  spec.resist = { element: mat.element, amount: Math.round(amt * 100) / 100 };
  if (opts.softenArmor && typeof spec.armorBonus === 'number' && spec.armorBonus > 0) {
    spec.armorBonus = Math.round(spec.armorBonus * 0.6 * 100) / 100;
    if (opts.scalars) opts.scalars.armorBonus = 0.6;
  }
  const bank = spec.kind === 'passive' ? RESIST_PHRASES_PASSIVE : RESIST_PHRASES_ACTIVE;
  return bank[phraseIndex(spec, mat, bank.length)](pctOf(amt), mat.element);
}

// ============================================================================
// ROUND 79 (bugs 10 and 10.3) -- RANK-UPS THAT ARE THEMATIC, VISIBLE AND REAL.
//
//   "10) The rank up effects shouldn't display before the rank is reached.
//    10.3) Confirm all abilities have thematic rank ups."
//
// Both halves were true of the shipped game and neither was visible.
//
// The DISPLAY half: `statsLineFor` printed an attribute ability's whole rider
// table -- "bronze: +10% mana recovery . silver: +6% cast speed . gold: +4%
// crit chance" -- on an Iron character who had reached none of them. Round 77
// wrote the filter (`attrRidersAt`) and used it in the runtime; the card never
// called it.
//
// The THEMATIC half was worse. `RANK_ASPECTS` in essenceRank.js held FOUR
// aspects for the whole game -- every one of 404,040 generated abilities
// promised "strikes apply a light bleed" at Iron, including the self-heals --
// and `_scaledAbility` hung them on `out._aspects`, which nothing read and
// nothing displayed. So the rank-ups were neither thematic nor, in any sense
// a player could observe, present.
//
// What follows builds four aspects PER ABILITY, out of that ability's own
// element and what it does. Deliberately expressed in fields the runtime
// ALREADY applies -- `dot`, `chain`, `critChanceBonus`, and a potency
// multiplier over essenceRank's own SCALED_FIELDS -- because an aspect that
// needs a new system is an aspect that ships as a label and does nothing,
// which is the state this is fixing.
export const ASPECT_RANKS = ['iron', 'bronze', 'silver', 'gold'];

// The words an aspect is written in, by the ability's own element. Drawn from
// STONE_ELEMENTS' own dot labels so a fire ability's rank-up says Burn and a
// shadow one says Decay -- the same vocabulary its description already uses.
const ASPECT_WORDS = {
  fire:      { dot: 'Burn',      noun: 'fire',      spreads: 'catches on' },
  frost:     { dot: 'Frostbite', noun: 'frost',     spreads: 'creeps to' },
  lightning: { dot: 'Shock',     noun: 'lightning', spreads: 'arcs to' },
  nature:    { dot: 'Venom',     noun: 'venom',     spreads: 'spreads to' },
  shadow:    { dot: 'Decay',     noun: 'the dark',  spreads: 'reaches' },
  radiant:   { dot: 'Sear',      noun: 'light',     spreads: 'spills onto' },
  physical:  { dot: 'Bleed',     noun: 'the wound', spreads: 'carries to' },
};
function aspectWords(a) { return ASPECT_WORDS[a && a.element] || ASPECT_WORDS.physical; }

// What an ability that does not hurt anything is getting BETTER AT, in its own
// voice. Keyed by what the finished spec is, not by its template name, so a
// lever that turned a buff into a ward is described as a ward.
function aspectSubject(tags) {
  if (tags.heals) return { it: 'the mending', more: 'closes wounds' };
  if (tags.defensive) return { it: 'the guard', more: 'holds' };
  if (tags.movement) return { it: 'the stride', more: 'carries you' };
  if (tags.perception) return { it: 'the sense', more: 'reaches' };
  if (tags.summon) return { it: 'what it calls', more: 'stands' };
  if (tags.aura) return { it: 'the field', more: 'presses' };
  return { it: 'the working', more: 'holds' };
}

/**
 * The four rank-ups this ability gains, weakest first.
 *
 * An OFFENSIVE ability gets four different mechanics; anything else gets a
 * potency ladder with one cadence step in it, because "15% of the damage
 * carries to nearby foes" is not a sentence a self-heal can honestly say and a
 * label that lies is the fault this is fixing.
 *
 * Every aspect carries BOTH a `label` -- the sentence the rank-up announces
 * itself with, one rank at a time -- and the field the runtime applies. The
 * card does not print the labels one after another: `rankEffectLine` merges
 * them by kind, because four lines reading "10% better", "20% better", "25%
 * better again" is a changelog, not a card.
 */
export function rankAspectsFor(a) {
  // An ability that already carries an AUTHORED rider table -- the attribute
  // passives and the water walk, both round 77's -- has its rank-ups written
  // by hand and named after what they do ("+6% cast speed at silver"). A
  // generic potency step on top of those would be a second, vaguer answer to
  // a question that already has a good one, and worse: neither ability's
  // fields are in essenceRank's SCALED_FIELDS, so the potency would be a label
  // with nothing behind it.
  if (a.riders && a.riders.length) return [];
  const tags = specTags(a);
  const w = aspectWords(a);
  // NARROWER THAN `tags.offensive` ON PURPOSE. That flag is wide by design --
  // it counts a perception with an opener-crit rider as offensive so a harm
  // word in its NAME is not rejected -- and reusing it here gave a scrying
  // passive "every hit leaves Decay behind". What earns the striking ladder is
  // an ability that actually lands blows, or one that arms the blows you land.
  const strikes = tags.damages || a.category === 'attack'
    || a.template === 'imbueStrike' || a.template === 'weaponAffinity'
    || a.template === 'summonWeapon';
  if (strikes) {
    return [
      { rank: 'iron', kind: 'affliction',
        label: `every hit leaves ${w.dot} behind`,
        dot: { dmgPerTick: 1, ticks: 3, tickMs: 700, critChance: 0.05, label: w.dot } },
      { rank: 'bronze', kind: 'carry',
        label: `15% of the damage ${w.spreads} two more foes nearby`,
        chain: { count: 2, radius: 90, frac: 0.15 } },
      { rank: 'silver', kind: 'edge',
        label: '+10% critical chance with this ability',
        critChanceBonus: 0.10 },
      { rank: 'gold', kind: 'potency', subject: 'it strikes',
        label: 'it strikes a quarter harder', potency: 0.25 },
    ];
  }
  const s = aspectSubject(tags);
  return [
    { rank: 'iron', kind: 'potency', subject: s.it,
      label: `${s.it} ${s.more} a tenth further than it did`, potency: 0.10 },
    { rank: 'bronze', kind: 'potency', subject: s.it,
      label: `${s.it} ${s.more} a fifth further again`, potency: 0.20 },
    { rank: 'silver', kind: 'cadence',
      label: 'it comes back 10% sooner', cooldownFrac: 0.10 },
    { rank: 'gold', kind: 'potency', subject: s.it,
      label: `${s.it} ${s.more} a quarter further still`, potency: 0.25 },
  ];
}

/** What the aspects reached so far amount to, as card bits -- one per KIND, so
 *  three potency steps read as one figure rather than three sentences. */
export function mergeAspectBits(list) {
  const bits = [];
  let potency = 0, cadence = 0, subject = 'it';
  for (const x of (list || [])) {
    if (x.potency) { potency += x.potency; if (x.subject) subject = x.subject; continue; }
    if (x.cooldownFrac) { cadence += x.cooldownFrac; continue; }
    bits.push(x.label);
  }
  if (potency) {
    const n = Math.round(potency * 100);
    // ROUND 89 -- "the guard is 10% stronger" DID NOT SAY WHAT IT MEANT.
    //
    // The user, verbatim: "Unclear ability note '· the guard is 10% stronger'
    // what does this mean?" -- and it is a fair question, because the sentence
    // has an abstract subject and an abstract verb and names no quantity. "The
    // guard" is `aspectSubject`'s flavour noun for a defensive ability; the
    // player has never seen that phrase anywhere else, and "stronger" could
    // mean the shield, the duration, the radius or the cooldown.
    //
    // What potency actually does is scale every one of the ability's rolled
    // fields (essenceRank's SCALED_FIELDS), so the honest sentence names that:
    // everything it does, by that much. The flavour is not lost -- the
    // per-rank labels ("the guard holds a tenth further than it did") still
    // carry it at the moment the rank is announced. This is the CARD, and the
    // standing rule is that the name carries the flavour and the description
    // states the mechanic.
    bits.push(subject === 'it strikes'
      ? `it strikes ${n}% harder`
      : `everything it does is ${n}% stronger`);
  }
  if (cadence) bits.push(`it comes back ${Math.round(cadence * 100)}% sooner`);
  return bits;
}

/** The aspects an ability at `rank` has actually reached, weakest first. */
export function rankAspectsAt(a, rank) {
  const at = ASPECT_RANKS.indexOf(rank);
  if (at < 0) return [];
  const all = a.rankAspects || rankAspectsFor(a);
  return all.filter(x => ASPECT_RANKS.indexOf(x.rank) <= at);
}

/** The riders this ability has reached, whatever kind it carries them as.
 *  attrBoost and waterWalk keep their own authored tables; everything else
 *  answers with nothing, and the aspects above are its rank-ups. */
function reachedRiders(a, rank) {
  if (!a.riders || !a.riders.length) return [];
  const at = RANK_ORDER.indexOf(rank);
  return a.riders.filter(r => at >= RANK_ORDER.indexOf(r.rank));
}

/**
 * THE CARD'S ONE LINE, at the rank the reader has actually reached.
 *
 * The user, on what a card should carry: "Flavour, current rank's effects,
 * nothing else" -- and, on how to head it: prefer "Iron Rank Effect)" and then
 * list them. So: the ability's own numbers, the riders it has reached, and the
 * aspects it has reached, under one heading naming the rank they are true at.
 */
export function rankEffectLine(a, rank = 'iron') {
  if (!a) return '';
  const r = ASPECT_RANKS.includes(rank) ? rank : 'iron';
  const bits = [];
  const base = String(a.stats || '').trim();
  if (base) bits.push(base);
  for (const rd of reachedRiders(a, r)) {
    bits.push(a.template === 'waterWalk'
      ? `${formatRider(rd)} while on water or swamp` : formatRider(rd));
  }
  for (const b of mergeAspectBits(rankAspectsAt(a, r))) bits.push(b);
  if (!bits.length) return '';
  return `${r.charAt(0).toUpperCase() + r.slice(1)} Rank Effect: ${bits.join(' · ')}`;
}


// ===========================================================================
// ROUND 79 (bug 5) -- WHAT IT COSTS TO HIT EVERYTHING.
//
//   "5) AOE abilities need to cost more, have a longer cooldown, or hit
//    softer than single target abilities."
//
// Asked which, the user chose two of the three: "softer per target, plus a
// longer cooldown." Cost is deliberately untouched.
//
// MEASURED BEFORE THIS, over 2,664 sockets of each: the single-target bolt
// averaged 7.8 damage on a 1.03s cooldown and the BLAST bolt averaged 8.0 on
// 1.06s -- more damage, same recharge, and it splashed 60% to everything else
// in the radius on top. It was not a trade-off, it was the same ability with
// a free area attached, which is why a kit holding one had no reason to press
// anything else. The ring was 7.1 at 6.2s, which at least paid in recharge but
// still hit each target for 91% of a bolt.
//
// The policy: an AOE's PER-TARGET damage is half what the same socket's
// single-target ability would have rolled, and its cooldown is at least 1.5x
// that ability's. Both are floors rather than assignments -- the ring already
// recharges four times slower than a bolt and is left where it is rather than
// pushed further out.
export const AOE_TARGET_FRAC = 0.5;
export const AOE_COOLDOWN_MULT = 1.5;

/** Price a finished AOE spec against the single-target figures the same socket
 *  would have produced. `spec.cooldown` must already hold whatever its own
 *  shape asks for; this only ever raises it. */
function priceAsAoe(spec, singleBase, singleCooldown, frac = AOE_TARGET_FRAC) {
  spec.base = Math.max(2, Math.round(singleBase * frac));
  const floor = Math.round(singleCooldown * AOE_COOLDOWN_MULT * 10) / 10;
  spec.cooldown = Math.max(spec.cooldown || 0, floor);
  spec.isAoe = true;
}


/**
 * ROUND 79 (bugs 9 and 9.1) -- A FAMILIAR IS A CREATURE TOO.
 *
 *   "9) The summon for a water x cat essence gave the placeholder model.
 *    9.1) Check for other summons that are not correctly showing models."
 *
 * Checked, and the placeholder was not a miss in the creature table -- a Cat
 * essence has summoned a whitelion since round 75. It was that the table was
 * only ever asked by ONE of the three things this game calls a summon.
 *
 * `activeSummon` asked it. The BONDED FAMILIAR never did, and neither did the
 * ESCORT the `call` lever attaches to ordinary abilities -- both went to
 * `_familiarSprite`, which knew about chickens, ducks and floating weapons and
 * sent everything else to round 73's diagnostic dragon. Measured over 300 kits:
 * 80 bonded familiars and 488 escorts, against 390 creature summons. Two thirds
 * of every summoned thing in the game was reaching the stand-in.
 *
 * So the same question gets the same answer wherever it is asked. A Cat
 * essence's familiar is a whitelion, its escort is a whitelion, and its
 * creature summon is a whitelion -- which is also the right reading of what a
 * familiar IS.
 */
// The essences whose familiar is a BIRD, drawn from its own standalone sheet
// rather than from the monster roster. Named here so the generator's data says
// what the runtime draws: `_familiarSprite` checks the fowl sheets before the
// creature path, so without this a Chicken essence's familiar carried
// `familiarFamily: 'thunderbird'` (its family is `flyer`) and rendered as a
// chicken -- a table saying one thing while the screen shows another, which is
// this project's own recurring fault written into a new field.
const FOWL_FAMILIAR_ESSENCES = new Set(['essChicken', 'essDuck', 'essBird', 'essFeather', 'essFlock']);

function bindFamiliarCreature(spec, essDef, opts = {}) {
  if (!spec) return;
  if (spec.template !== 'summonBonded' && !spec.escort) return;
  if (spec.familiarFamily) return;
  if (FOWL_FAMILIAR_ESSENCES.has(essenceIdOf(essDef))) return;
  const family = summonCreatureFor(essenceIdOf(essDef), opts.essenceIds)
    // A confluence has no id the catalogue knows and, at the innate, no parent
    // list either -- but it does have a FAMILY, which is the rung
    // summonCreatures.js built for essences with no creature of their own.
    || (essDef && essDef.family ? SUMMON_CREATURE_BY_FAMILY[essDef.family] : null);
  const prof = family ? SUMMON_CREATURES[family] : null;
  if (prof) {
    spec.familiarFamily = prof.family;
    spec.familiarCreatureName = prof.name;
    return;
  }
  // No creature -- and for the sixteen WEAPON essences that is not a gap, it
  // is the answer. A Sword essence's familiar is the blade itself, and the
  // floating-weapon sprite has existed since round 50; it was reachable only
  // by NAME (`FAMILIAR_WEAPON_RE`), so a Spear essence whose familiar happened
  // to be called "Long Reach" got the dragon instead of the spear it is.
  const wid = weaponForAffinity(null, essDef);
  if (wid) spec.familiarWeaponId = wid;
}

export function statsLineFor(a) {
  // ROUND 57 -- the cast bar and the mark it leaves, appended in the order the
  // player meets them: how long before it goes off, then what it does, then
  // what it leaves behind, then what it cost.
  const cast = a.castTime > 0 ? ` · ${a.castTime}s cast` : '';
  const line = statsLineBase(a) + leverStatsRider(a) + debuffStatsFragment(a) + cast;
  if (a.kind === 'active' && a.cost) {
    const blood = a.bloodSurrogate ? ' (or blood)' : '';
    return `${line} · ${a.cost.amount} ${a.cost.type}${blood}`;
  }
  return line;
}

// ROUND 48 -- the numbers the ESSENCE's lever added, appended to whatever the
// template's own line already says. Without this the twist would be real in the
// mechanics and invisible in the UI, which is the same complaint one layer down:
// the player has to be able to SEE that their Ape essence lengthened the reach.
// Only riders the base line does not already print appear here.
function leverStatsRider(a) {
  const pct = (n) => Math.round(n * 100);
  const bits = [];
  if (a.chain) bits.push(`chains to ${a.chain.count} more within ${a.chain.radius} at ${pct(a.chain.frac)}%`);
  if (a.resist) bits.push(`+${pct(a.resist.amount)}% ${a.resist.element} resistance`);
  if (a.allyScaling) bits.push(`+${pct(a.allyScaling.per)}%/ally within ${a.allyScaling.range} (max ${a.allyScaling.max})`);
  // Suppressed where the base line already carries the lengthened figure: a
  // weapon affinity prints its own strike range, a perception its own pickup
  // reach, and anything with a real distance field had that field scaled.
  if (a.reachPct && a.template !== 'weaponAffinity' && a.template !== 'perception'
    && !REACH_FIELDS.some(f => typeof a[f] === 'number')) bits.push(`+${pct(a.reachPct)}% reach`);
  if (a.dot && !DOT_IN_BASE_LINE.includes(a.template)) bits.push(`+${a.dot.dmgPerTick}×${a.dot.ticks} ${a.dot.label}`);
  // ROUND 52 -- the mending rider, printed in the same slot and the same shape
  // as the affliction rider directly above it. selfHot never carries one (its
  // own base line already IS a heal-over-time), so there is nothing to suppress.
  if (a.hot) bits.push(`+${a.hot.perSec} HP/s for ${a.hot.duration}s (${a.hot.label})`);
  // ROUND 52 PHASE 2 -- the condition, in the same voice as every other rider.
  // One source (abilityScaling.scalingClause) so the row, any tooltip and the
  // tests cannot drift into three different sentences about one mechanic.
  if (a.scaleOn) { const c = scalingClause(a); if (c) bits.push(c); }
  if (a.leech && a.template !== 'projectileBall') bits.push(`heals ${pct(a.leech)}% of damage dealt`);
  if (a.leechOverTime) bits.push(`heals ${pct(a.leechOverTime.frac)}% of damage dealt over ${a.leechOverTime.duration}s`);
  // ROUND 55 -- summonGear prints its own, so the rider must not repeat it.
  if (a.lifeOnKill && a.template !== 'summonGear') bits.push(`+${a.lifeOnKill} HP per kill`);
  if (a.healOnUse) bits.push(`restores ${a.healOnUse} HP`);
  if (a.hasteOnUse) bits.push(`+${pct(a.hasteOnUse.pct)}% move speed for ${a.hasteOnUse.duration}s`);
  // ROUND 56 -- cooldownPassive prints its own; the rider must not repeat it.
  if (a.cooldownReduction && a.template !== 'cooldownPassive') bits.push(`-${pct(a.cooldownReduction)}% ability cooldowns`);
  if (a.regenPerSec) bits.push(`+${a.regenPerSec} HP/s`);
  if (a.openerCrit) bits.push(`+${pct(a.openerCrit.amount)}% crit vs unwounded foes`);
  if (a.bindOnHit) bits.push(`-${pct(a.bindOnHit.slowPct)}% enemy speed for ${a.bindOnHit.duration}s`);
  // ROUND 73 -- prints the lifetime only when there is one. See the `call`
  // lever: a passive escort has no duration field at all now, and printing
  // "for undefineds" is how a fix becomes a new bug.
  if (a.escort) {
    bits.push(`escort strikes for ${a.escort.dmg} every ${a.escort.interval}s`
      + (a.escort.duration ? ` for ${a.escort.duration}s` : ''));
  }
  if (a.blinkOnUse) bits.push(`${a.blinkOnUse}px reposition`);
  if (a.dodgeBonus) bits.push(`+${pct(a.dodgeBonus)}% dodge`);
  // ROUND 49 -- the taunt RIDER only. A tauntPull's own numbers are already the
  // whole of its base line, so printing them again here would give the row two
  // copies of the same three figures.
  if (a.taunt && a.template !== TAUNT_TEMPLATE) bits.push(`draws ${a.taunt.max} enemies within ${a.taunt.radius} for ${a.taunt.duration}s`);
  if (a.confuse && a.template !== 'confuseTurn') bits.push(`${pct(a.confuse.chance)}% chance to turn a foe for ${a.confuse.duration}s`);
  if (a.reroll && a.template !== 'fateReroll') bits.push(`${pct(a.reroll.chance)}% chance to reroll a failed strike`);
  return bits.length ? ' · ' + bits.join(' · ') : '';
}

function statsLineBase(a) {
  switch (a.template) {
    // ROUND 75 -- THE STACKING LINE LIVES HERE, not in `spec.desc`.
    //
    // Round 74 learned this the expensive way with the ranged twists: the
    // lever pass runs after the template switch and REWRITES `desc` from
    // `mechanicalDesc`, so a sentence written into desc in the switch is
    // discarded before a player ever sees it. It cost a whole round's feature
    // being invisible. `statsLine` is built after the lever pass and survives.
    case 'stacking':
      return stackClause(a);
    case 'projectileBall': {
      let s = `${a.base} dmg · ${fmtCd(a.cooldown)}`;
      if (a.dot) s += ` · +${a.dot.dmgPerTick}×${a.dot.ticks} ${a.dot.label} over ${(a.dot.ticks * a.dot.tickMs / 1000).toFixed(1)}s`;
      // ROUND 79 (bug 5) -- says what the blast DOES, not just how wide it is.
      // A radius on its own left the player to guess whether the neighbours
      // took the same hit as the target; they now take exactly the figure two
      // fields to the left, and the row says so.
      if (a.explodeRadius) {
        s += a.splashFrac >= 1
          ? ` · ${a.explodeRadius}px blast, all of it for the same`
          : ` · ${a.explodeRadius}px blast at ${Math.round((a.splashFrac || 0.6) * 100)}%`;
      }
      if (a.executeThreshold) s += ` · guaranteed crit below ${Math.round(a.executeThreshold * 100)}% HP`;
      if (a.leech) s += ` · heals ${Math.round(a.leech * 100)}% of damage dealt`;
      return s;
    }
    case 'barrierWall': {
      const what = { block: `a ${a.wallLength} wall nothing crosses`,
        burn: `a ${a.wallLength} line dealing ${a.base} dmg to anything crossing it`,
        pull: `a ${a.wallLength} collapse dragging enemies inward` }[a.wallKind]
        || `a ${a.wallLength} wall`;
      return `${what} for ${a.wallDuration}s · ${fmtCd(a.cooldown)}`;
    }
    case 'reflectWard':
      if (a.reflectKind === 'debuff') {
        return `${Math.round(a.reflectChance * 100)}% chance to send an affliction back${a.buffDuration ? ` for ${a.buffDuration}s` : ''}${a.cooldown ? ` · ${fmtCd(a.cooldown)}` : ''}`;
      }
      return a.reflectKind === 'spell'
        ? `returns ${Math.round(a.reflectFrac * 100)}% of elemental damage taken${a.buffDuration ? ` for ${a.buffDuration}s` : ''}${a.cooldown ? ` · ${fmtCd(a.cooldown)}` : ''}`
        : `returns ${Math.round(a.reflectFrac * 100)}% of damage taken`;
    case 'cooldownPassive':
      return `-${Math.round(a.cooldownReduction * 100)}% ability cooldowns`;
    case 'breathCone': {
      let s = `${a.base} dmg to everything in a ${a.range} cone · ${fmtCd(a.cooldown)}`;
      if (a.dot) s += ` · +${a.dot.dmgPerTick}×${a.dot.ticks} ${a.dot.label}`;
      return s;
    }
    case 'volley': {
      let s = `${a.volleyCount} bolts, ${a.base} dmg each · ${fmtCd(a.cooldown)}`;
      if (a.dot) s += ` · +${a.dot.dmgPerTick}×${a.dot.ticks} ${a.dot.label} per bolt`;
      if (a.explodeRadius) s += ` · ${a.explodeRadius}px blast`;
      return s;
    }
    case 'elementPierce':
      return `your ${a.pierceElement || a.element} damage cannot be resisted`;
    case 'aoeRing': {
      let s = `${a.base} dmg to all enemies within ${a.range} · ${fmtCd(a.cooldown)}`;
      if (a.dot) s += ` · +${a.dot.dmgPerTick}×${a.dot.ticks} ${a.dot.label}`;
      return s;
    }
    // ---- ROUND 38 (sections 6.1-6.10) ----
    case 'bloomField': return `a field within ${a.range} restoring ${a.healPerSec} HP/s to you and allies for ${a.fieldDuration}s · ${fmtCd(a.cooldown)}`;
    case 'partyBuff': return `allies within ${a.range}: +${Math.round(a.partyDmgPct * 100)}% damage and +${a.partyPower} power for ${a.buffDuration}s · ${fmtCd(a.cooldown)}`;
    case 'aoeHealPulse': return `restores ${a.healAmount} HP (+1% per 1% cast speed) to you and allies within ${a.range} · ${fmtCd(a.cooldown)}`;
    case 'weakenRing': return `-${Math.round(a.sunder.amount * 100)}% armor, -${Math.round(a.slowPct * 100)}% speed to enemies within ${a.range} for ${a.sunder.duration}s · ${fmtCd(a.cooldown)}`;
    case 'rangeStrike': return `${a.base} dmg, up to ×${a.maxMult.toFixed(1)} at ${a.range} range · ${fmtCd(a.cooldown)}`;
    case 'stackStrike': return `${a.base} dmg + ×${a.stackMult.toFixed(1)} of the target's remaining afflictions, consumed · ${fmtCd(a.cooldown)}`;
    case 'imbueStrike': return `next ${a.strikes} strikes apply ${a.dot.dmgPerTick}×${a.dot.ticks} ${a.dot.label}${a.sunder ? ` and -${Math.round(a.sunder.amount * 100)}% armor` : ''} · ${fmtCd(a.cooldown)}`;
    case 'thornsBuff': return `returns ${Math.round(a.thornsFrac * 100)}% of damage taken for ${a.buffDuration}s · ${fmtCd(a.cooldown)}`;
    case 'townPortal': return `opens a portal to town — and back again · ${fmtCd(a.cooldown)}`;
    // ---- ROUND 49 ----
    // Every field the runtime contract names appears in this line, in the same
    // order the player will experience them: how many, how far, how long. The
    // threat rider is the price, so it is last and it is only printed when the
    // roll actually gave one.
    case 'tauntPull': {
      const threat = (a.threatMult > 1)
        ? ` · they strike ${Math.round((a.threatMult - 1) * 100)}% harder while held`
        : '';
      return `draws up to ${a.tauntMax} enemies within ${a.tauntRadius} onto you for ${a.tauntDuration}s${threat} · ${fmtCd(a.cooldown)}`;
    }
    // ---- ROUND 49 ----
    case 'stealthVeil': {
      const seen = Math.round((1 - a.aggroMult) * 100);
      const fast = a.stealthSpeedPct ? ` · +${a.stealthSpeedPct}% move speed` : '';
      const who = a.stealthScope === 'party' ? 'you and your team are' : 'you are';
      return `${who} veiled for ${a.stealthDuration}s: enemies notice you ${seen}% later${fast} · breaks on attack · ${fmtCd(a.cooldown)}`;
    }
    // ---- ROUND 48 ----
    case 'confuseTurn':
      return `turns up to ${a.maxTargets} enemies within ${a.range} against each other for ${a.confuseDuration}s · ${fmtCd(a.cooldown)}`;
    case 'fateReroll': {
      const what = {
        strike: 'a missed strike is rolled again',
        crit: 'a strike that did not crit is rolled again',
        dodge: 'a failed dodge is rolled again',
        death: 'a killing blow is refused, leaving you at 1 HP',
      }[a.rerollKind] || 'a failed roll is taken again';
      return a.rerollKind === 'death'
        ? `${what} · ${fmtCd(a.cooldown)}`
        : `${Math.round(a.rerollChance * 100)}% chance: ${what}`;
    }
    case 'passiveConditional': {
      const cond = {
        night: 'at night', day: 'in daylight', vsElement: `vs ${a.condElement}-touched foes`,
        vsDebuffed: 'vs foes carrying your afflictions', targetLowHp: 'vs foes below 50% HP', onRoads: 'on paved ground',
      }[a.condition];
      const bonus = a.bonusKind === 'dmg' ? `+${Math.round(a.amount * 100)}% damage`
        : a.bonusKind === 'dodge' ? `+${Math.round(a.amount * 100)}% dodge` : `+${Math.round(a.amount * 100)}% armor`;
      return `${bonus} ${cond}`;
    }
    // ROUND 47 -- a triggered passive's line reads "<when>: <what>", built
    // straight off the same trigger/effect descriptors the runtime switches
    // on, so the row can never drift from the mechanic.
    case 'triggeredPassive': {
      const t = a.trigger || {}, e = a.effect || {};
      const when = {
        hpBelow: `below ${Math.round((t.frac || 0.5) * 100)}% health`,
        kill: 'on a kill',
        crit: 'on a critical hit',
        critDrought: `after ${t.seconds}s without a critical hit`,
        // ROUND 55 -- the troll's reflex. Fire is the exception because fire is
        // the thing a troll's regeneration has never been able to answer.
        hurtNonFire: 'when hurt by anything but fire',
      }[t.on] || 'when triggered';
      const what = e.kind === 'regenBurst' ? `${e.perSec} HP/s for ${e.duration}s`
        : e.kind === 'physicalDamageMult' ? `+${Math.round(e.amount * 100)}% physical damage for ${e.duration}s`
        : e.kind === 'boltNearest' ? `${e.damage} lightning damage to the next nearest enemy within ${e.range}`
          : e.kind === 'nextSpellDamage' ? `+${Math.round(e.amount * 100)}% damage on your next spell`
            : `+${Math.round(e.amount * 100)}% crit chance on your next ${(e.strikes || 1) > 1 ? `${e.strikes} strikes` : 'strike'}`;
      return `${when}: ${what}${a.cooldown ? ` · ${fmtCd(a.cooldown)}` : ''}`;
    }
    case 'rangeBuff':
      return `x${a.rangeMult.toFixed(2)} attack and spell range for ${Math.round(a.buffDuration)}s · ${fmtCd(a.cooldown)}`;
    case 'selfPower': return `+${Math.round((a.powerMult - 1) * 100)}% damage for ${a.buffDuration}s · ${fmtCd(a.cooldown)}`;
    case 'selfCritBuff': return `+${Math.round(a.critChanceBonus * 100)}% crit chance for ${a.buffDuration}s · ${fmtCd(a.cooldown)}`;
    case 'immunityBuff': return `immune to physical damage for ${a.immunityDuration}s · ${fmtCd(a.cooldown)}`;
    case 'timeFreeze': return `freezes every creature within ${a.freezeRadius} for ${a.freezeDuration}s · ${fmtCd(a.cooldown)}`;
    // ROUND 50 -- the stats line names WHO, because that is now a real
    // difference between two abilities that otherwise read identically.
    case 'selfHeal': return `restores ${a.healAmount} HP ${healWho(a.healScope)} · ${fmtCd(a.cooldown)}`;
    case 'selfHot': return `${a.hotPerSec} HP/s for ${a.hotDuration}s ${healWho(a.healScope)} · ${fmtCd(a.cooldown)}`;
    case 'absorbShield': return `absorbs ${a.shieldAmount} dmg, +${Math.round((a.armorBonus || 0) * 100)}% armor for ${a.shieldDuration}s · ${fmtCd(a.cooldown)}`;
    case 'armorBuff': return `+${Math.round(a.armorBonus * 100)}% armor for ${a.buffDuration}s · ${fmtCd(a.cooldown)}`;
    case 'sunderStrike': return `${a.base} dmg, -${Math.round(a.sunder.amount * 100)}% enemy armor for ${a.sunder.duration}s · ${fmtCd(a.cooldown)}`;
    case 'dash': return `${a.dashDist}px dash · ${fmtCd(a.cooldown)}`;
    case 'teleport': return `${a.teleportRange}px blink · ${fmtCd(a.cooldown)}`;
    case 'movementHaste': return `+${Math.round((a.speedMult - 1) * 100)}% move speed for ${a.buffDuration}s · ${fmtCd(a.cooldown)}`;
    case 'aura':
      if (a.auraEffect === 'damage') return `${a.tickAmount} dmg every ${a.tickInterval}s to enemies within ${a.auraRadius}`;
      if (a.auraEffect === 'slow') return `-${Math.round(a.slowPct * 100)}% move speed to enemies within ${a.auraRadius}`;
      if (a.auraEffect === 'weaken') return `-${Math.round(a.sunderAmt * 100)}% armor on enemies within ${a.auraRadius}`;
      if (a.auraEffect === 'ward') return `+${Math.round(a.wardResist.amount * 100)}% ${a.wardResist.element} resistance within ${a.auraRadius}`;
      return `restores ${a.tickAmount} HP every ${a.tickInterval}s`;
    case 'perception': {
      // ROUND 62 -- the reveal is a MODE now, so the line states the reading
      // this ability actually has instead of claiming a map reveal every one of
      // them used to share.
      const mode = {
        mapsense: 'reveals every living creature on the map',
        nightsight: 'sight pierces the night',
        healthbars: 'enemy health above their heads',
        weakspots: `marks elemental weaknesses (+${Math.round((a.markCritBonus || 0.1) * 100)}% crit vs marked)`,
        truesight: 'lurking enemies show themselves',
        bondsense: 'companion health above their heads',
      }[a.mode] || 'sharpened senses';
      // ROUND 48 -- reads the real field rather than the literal 50: a reach
      // essence lengthens it, and a stats line that ignores that is lying.
      return `${mode} · +${Math.round(((a.pickupRadiusMult || 1.5) - 1) * 100)}% pickup reach`;
    }
    case 'summonBonded': return `familiar strikes for ${a.familiarDmg} dmg every ${a.familiarInterval}s within ${a.familiarRange}`;
    case 'activeSummon': {
      const life = summonTimeShort(a.summonDuration);
      if (a.summonKind === 'trap') {
        return `${a.summonDmg} dmg blast, ${a.summonCharges} charges, armed ${life} · ${fmtCd(a.cooldown)}`;
      }
      // ROUND 76 (item 2.2) -- A GUARDIAN'S LINE IS NOT A DAMAGE LINE.
      //
      // The generic clause printed "creature: 0 dmg every 1.82s within 46" for
      // an odd summon, which is three numbers about a thing that does not
      // attack. A stats line that leads with a zero teaches the player the
      // ability is broken. It says what a guardian actually does instead.
      if (a.summonRole === 'guard') {
        return `guardian: -${Math.round((a.summonGuardPct || 0) * 100)}% damage taken within `
          + `${a.summonGuardRadius}, taunts ${a.summonTauntMax} every ${a.summonTauntEvery}s, `
          + `lasts ${life} · ${fmtCd(a.cooldown)}`;
      }
      const what = a.summonKind === 'turret' ? 'turret' : 'creature';
      return `${what}: ${a.summonDmg} dmg every ${a.summonInterval}s within ${a.summonRange}, lasts ${life} · ${fmtCd(a.cooldown)}`;
    }
    case 'passiveMove': return `+${Math.round(a.moveSpeedPct * 100)}% movement speed`;
    // ROUND 47 (item 7). The weapon is named first because it is the
    // condition: the whole line is worthless to a player who is not holding
    // one, and burying that at the end reads as an unconditional buff.
    case 'weaponAffinity': {
      const bits = [];
      if (a.rangePct) bits.push(`+${Math.round(a.rangePct * 100)}% strike range`);
      if (a.attackSpeedPct) bits.push(`+${Math.round(a.attackSpeedPct * 100)}% attack speed`);
      // ROUND 74 (item 2) -- THE RANGED TWISTS, SAID HERE.
      //
      // The generator appended these to `spec.desc` first, and they vanished:
      // the lever pass downstream REWRITES the description (see the `reach`
      // lever's `mech = ...` for a weaponAffinity), so anything written into
      // the desc before it ran was overwritten and the player never saw a
      // word about the split they had rolled. The stats line is where a
      // mechanic belongs anyway, by this project's own naming rule -- "the
      // name carries flavour, the description states the mechanic" -- and it
      // is the one string nothing downstream replaces.
      if (a.shotSplit) bits.push(`shots split into ${a.shotSplit + 1}`
        + ` (${Math.round((a.shotSplitDamage || 0.6) * 100)}% damage each)`);
      if (a.shotPierce) bits.push(`shots pierce ${a.shotPierce} more`);
      if (a.shotBounce) bits.push(`shots bounce to ${a.shotBounce} more`
        + ` within ${a.shotBounceRange}`);
      if (a.shotSpeedPct) bits.push(`+${Math.round(a.shotSpeedPct * 100)}% shot speed`);
      return `${a.weaponName || a.weaponId}: ${bits.join(' · ')}`;
    }
    case 'passiveBuff':
      if (a.buffKind === 'dmg') return `+${Math.round(a.amount * 100)}% all damage`;
      if (a.buffKind === 'crit') return `+${Math.round(a.amount * 100)}% crit chance`;
      if (a.buffKind === 'armor') return `+${Math.round(a.amount * 100)}% armor`;
      return `+${a.amount} max HP`;
    // ROUND 77 -- one point, and what the rank has added to it. The old line
    // read "+1 per rank (Iron and above)", which was true of the old mechanic
    // and is the thing item 6.2 rules out.
    case 'attrBoost': {
      // ROUND 79 (bug 10) -- THE RIDERS ARE NOT PRINTED HERE ANY MORE.
      //
      // This line used to end "bronze: +10% mana recovery . silver: +6% cast
      // speed . gold: +4% crit chance" on an Iron character who had reached
      // none of them. Round 77 built `attrRidersAt` to answer exactly that
      // question and the card never asked it. `rankEffectLine` asks it now,
      // and the riders appear under the rank they are true at.
      return `+1 ${ATTR_LABEL_LOCAL[a.attr] || a.attr} · raises your ${ATTR_LABEL_LOCAL[a.attr] || a.attr} ceiling by 1`;
    }
    case 'twoHandWield':
      return `wield ${(a.frees || []).join(' and ')} in one hand`;
    case 'waterWalk':
      // ROUND 79 (bug 10) -- same as attrBoost above: the footing riders are
      // rank-gated and belong under the rank heading, not on the base line.
      return 'cross water on foot';
    case 'summonWeapon': return `+${Math.round(a.weaponDmgPct * 100)}% weapon damage`
      + (a.strikeDot ? ` · every strike applies ${a.strikeDot.dmgPerTick}×${a.strikeDot.ticks} ${a.strikeDot.label}` : '')
      + relicBuffsLine(a);
    case 'summonArmor':
      return `-${a.damageReduction} damage from every hit taken · +${Math.round((a.armorBonus || 0) * 100)}% armor`
        + (a.thornsFrac ? ` · returns ${Math.round(a.thornsFrac * 100)}% of damage taken` : '')
        + relicBuffsLine(a);
    case 'summonGear': return `+${Math.round(a.critChance * 100)}% crit chance · +${a.critDamage.toFixed(2)}x crit damage`
      + (a.lifeOnKill ? ` · +${a.lifeOnKill} HP per kill` : '') + relicBuffsLine(a);
    default: return '';
  }
}

// ROUND 6 name resolution: real sheet names first. Looks up the essence's
// (or confluence's) own authored skill list in SHEET_SKILLS by the
// category's sheet types, preferring names that carry the stone's theme
// word, then names passing the category's flavor filter, then any unused
// sheet name -- and only if the sheet is exhausted falls back to the
// round-5 synthetic '{A}' bank.
// ROUND 16 -- the "Skills" sheet contains two kinds of row. Most are real
// authored names (Flame Lash, Phoenix Resurgence, Champion's Rally). But
// for the essences the sheet's author never filled in by hand, it holds
// auto-generated placeholders built out of the essence's OWN name plus a
// generic mechanical word: "Avatar Boost", "Avatar Cloak", "Passive Avatar
// Eyes", "Defensive Avatar Barrier", "Doppelganger Bind Pulse". Those are
// precisely what the user asked us to stop shipping ("These should have
// actual names not just the essence stone name"), so they are filtered out
// of the sheet tier -- the signature pool below supplies a real name in
// their place. The test is deliberately narrow: strip a leading
// qualifier, and reject only when what remains STARTS with the essence
// name and every following word is generic. "Aura of Avatar Majesty" and
// "Aura of Renewal" survive it; "Avatar Strike" does not.
const GENERIC_SKILL_TOKENS = /^(boost|cloak|bind|pulse|blast|strike|shield|staff|spear|chain|barrier|wave|slash|construct|aura|eyes|light|flame|whip|surge|spell|nova|form|field|mist|ward|touch|step)$/i;
function isPlaceholderSheetName(name, essName) {
  const stripped = name.replace(/^(passive|defensive|healing|summon)\s+/i, '').trim();
  const esc = essName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lead = new RegExp(`^${esc}\\b`, 'i');
  if (!lead.test(stripped)) return false;
  const rest = stripped.replace(lead, '').trim();
  if (!rest) return true; // the name was literally just the essence word
  return rest.split(/\s+/).every(w => GENERIC_SKILL_TOKENS.test(w));
}

// Built once, lazily -- ESSENCE_SIGNATURES spans 146 pools and ~1,340
// names, and this is read on every single name pick.
// ROUND 48 -- the reservation compared raw strings, and the two catalogs do not
// agree on which apostrophe they use: the signature pools are written with the
// typographic U+2019 ("Dragon's Breath") while the TTRPG skills sheet exports
// the ASCII U+0027 ("Dragon's Breath"). Measured: authored signature names were
// escaping their reservation and being handed out by the sheet tier to whatever
// category happened to ask, which is precisely the failure the reservation was
// added to stop. Both sides are normalised now, so the comparison is on the
// word rather than on the typography.
function normApos(s) { return String(s).replace(/[‘’ʼ´`]/g, "'"); }
let _allSigNames = null;
function allSignatureNames() {
  if (_allSigNames) return _allSigNames;
  _allSigNames = new Set();
  for (const list of Object.values(ESSENCE_SIGNATURES)) {
    for (const e of list) _allSigNames.add(normApos(e.name));
  }
  return _allSigNames;
}
function isReservedSignatureName(n) { return allSignatureNames().has(normApos(n)); }

// ===========================================================================
// ROUND 48 -- THE ESSENCE/STONE INTERSECTION.
//
// Everything from here to generateCategoryAbility exists to answer one
// complaint: "Essences in particular are not seeming to pull enough weight in
// determining how an awakening stone effects the output... should take a look
// at the intersection between the two with more weight on the essence itself."
//
// The split (see essenceLevers.js): the ESSENCE names a mechanical LEVER and
// the body it acts through; the STONE names the MATERIAL that lever is made of.
// Three things read that split now, where before all three read only the stone:
//   1. the category bias (essenceLeverBias + mergedBiasKeys)
//   2. the mechanic itself (applyEssenceFlavour)
//   3. the name (composeAbilityName, after the mechanics are known)
// ===========================================================================

function cap(s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); }

/** "the drawn string" -> "the drawn string"; "searing flame" -> "the searing
 *  flame". Half the 180 catalog phrases already carry their own article, and
 *  writing `The ${phrase}` in front of them produced "The the drawn string".
 *  The triggered-passive descs dodged this by dropping the article entirely;
 *  this lets a sentence that genuinely needs one have it. */
function theP(phrase) {
  const p = String(phrase || 'raw essence');
  return /^(the|a|an|your|its)\s/i.test(p) ? p : `the ${p}`;
}

// ESSENCE_CATALOG is keyed BY id and its rows carry no `id` field of their own.
// WorldScene's guard and NPC kit builders pass those raw rows straight in as
// `essDef`, so essDef.id is undefined on every generated guard ability. Name is
// the only identity such a row carries, so it is the fallback key.
const _essIdByName = new Map();
for (const [id, e] of Object.entries(ESSENCE_CATALOG)) {
  if (e && e.name) _essIdByName.set(String(e.name).toLowerCase(), id);
}
export function essenceIdOf(essDef) {
  if (!essDef) return null;
  if (essDef.id && (ESSENCE_MOTIFS[essDef.id] || ESSENCE_CATALOG[essDef.id])) return essDef.id;
  if (essDef.name) {
    const byName = _essIdByName.get(String(essDef.name).toLowerCase());
    if (byName) return byName;
  }
  return essDef.id || null;
}
/**
 * ROUND 55 -- the signature list for ANY slot, confluence included.
 *
 * ESSENCE_SIGNATURES is keyed by essence id, and every confluence shares the id
 * 'confluence', so a raw lookup would have given all 101 the same marquee set.
 * The confluence is identified by its NAME instead -- which is the only thing
 * that distinguishes a Dragon from a Hydra -- and the eighty-one derived ones
 * return an empty list and keep generating from their concept and the spine,
 * exactly as the user reviewed them.
 */
export function signaturesFor(essDef) {
  if (essDef && essDef.id === 'confluence') return confluenceSignaturesFor(essDef.name);
  return ESSENCE_SIGNATURES[essenceIdOf(essDef)] || [];
}

export function motifForEssence(essDef) {
  const id = essenceIdOf(essDef);
  return (id && ESSENCE_MOTIFS[id]) || null;
}

/**
 * ROUND 53 -- THE MOTIF AS THIS BUILD SEES IT.
 *
 * The authored motif is what the essence CAN do; this is what it does HERE.
 * Its levers are reordered so whatever the trio agreed on leads, and any
 * extended lever the trio agreed on is admitted. An essence's authored core is
 * never removed -- an essence does not stop being itself because of its
 * company -- so the worst case is the motif exactly as authored, which is
 * precisely what every caller got before this round and is what they still get
 * when no spine is supplied.
 */
export function effectiveMotif(essDef, spine) {
  // ROUND 53 -- THE CONFLUENCE GETS A MOTIF, and this is the whole fix for
  // "Hurls a concentrated bolt of Dragon confluence".
  //
  // There was never a bad sentence to replace; there was no sentence at all.
  // confluenceDefFor returned a def with no entry in ESSENCE_MOTIFS, so
  // motifForEssence returned null, applyEssenceFlavour bailed on the first
  // line, no lever ever fired, and the description fell through to a stock
  // template string. Fifty of fifty confluence abilities in ten random builds
  // carried no lever. The payoff slot was the only slot generating blind.
  //
  // Its vocabulary is the confluence's own concept; its LEVERS are the build's
  // spine -- what its three essences agreed on. That is the user's other
  // request in the same object: "at least the intersections between the 3
  // essences that generate the confluence". A Dragon formed by three burst
  // essences is an explosive Dragon; formed by three menders it is a warden
  // Dragon. The name supplies the voice, the trio supplies the mechanics.
  if (essDef && essDef.id === 'confluence') {
    const c = conceptFor(essDef.name);
    return {
      levers: (spine && spine.length) ? spine.slice() : [],
      parts: c.parts, verbs: c.verbs, adjs: c.adjs, body: c.body,
    };
  }
  const motif = motifForEssence(essDef);
  if (!motif || !spine || !spine.length) return motif;
  const rep = repertoireFor(essDef, motif);
  return { ...motif, levers: leverOrderFor(rep, spine) };
}
/** What the mechanic is MADE of. The stone's family first (the stone is the
 *  material), the essence's family as a fallback for an innate with no stone. */
export function materialFor(stone, essDef) {
  return elementForFamily((stone && stone.family) || (essDef && essDef.family) || null);
}

/** The essence's own category bias, interleaved across its levers so the most
 *  characteristic lever's best category leads, then the second lever's best,
 *  and so on -- rather than exhausting lever 1 before lever 2 is heard from. */
export function essenceLeverBias(essDef, spine = null) {
  const motif = effectiveMotif(essDef, spine);
  if (!motif) return [];
  const lists = motif.levers.map(l => (LEVERS[l] && LEVERS[l].bias) || []);
  const out = [], seen = new Set();
  const depth = Math.max(0, ...lists.map(l => l.length));
  for (let d = 0; d < depth; d++) {
    for (const list of lists) {
      const k = list[d];
      if (k && !seen.has(k)) { seen.add(k); out.push(k); }
    }
  }
  return out;
}

/** The probe order for a socket. The ESSENCE LEADS -- two of its categories for
 *  every one of the stone's -- which is the "more weight on the essence itself"
 *  the user asked for, without throwing the stone's own character away. */
export function mergedBiasKeys(essDef, stone, stoneId = null, spine = null) {
  const ess = essenceLeverBias(essDef, spine);
  let st = (stone && stone.bias) || [];
  // ROUND 49 -- A STONE THAT OPENS A LEVER ALSO PUSHES IT.
  //
  // categoryAllowedFor lets a stealth stone unlock stealth on an essence that
  // has no stealth lever. On its own that was a door nobody ever knocked on:
  // the gate is checked inside tryCat, and tryCat is only ever CALLED for
  // categories on this bias list -- which is built from the essence's levers
  // and the stone's own bias, neither of which mentions the granted category.
  // Measured before this: two of six non-stealth essences could produce a
  // stealth ability off any of the twenty-two stealth stones, and the four that
  // could were the two that happened to share a bias category with it.
  //
  // So the granted lever's categories are spliced in behind the stone's own.
  // Behind, not in front: the stone is still mostly what it has always been,
  // and this is the extra thing it can now teach.
  for (const [lever, keys] of Object.entries(LEVER_STONE_KEYS)) {
    if (!stoneId || !keys.includes(stoneId)) continue;
    const granted = (LEVERS[lever] && LEVERS[lever].bias) || [];
    if (granted.length) st = st.concat(granted);
  }
  if (!ess.length) return st.slice();
  const out = [], seen = new Set();
  const push = (k) => { if (k && !seen.has(k)) { seen.add(k); out.push(k); } };
  // ROUND 53 -- THE BUILD LEADS.
  //
  // Reordering an essence's own levers was not enough, and the measurement is
  // unambiguous: one Fire essence on one stone across twelve different trios
  // produced six distinct pools with 88% template similarity, because the spine
  // only changed anything when it happened to name a lever in that essence's
  // extension -- three levers out of nineteen, so most trios changed nothing at
  // all.
  //
  // What the user asked for was synergy: "based on the 3 essences and
  // confluence essences it identifies a set of mostly shared levers to promote
  // synergy". So the agreed levers put THEIR categories at the head of the
  // probe order for every slot, whether or not this particular essence would
  // have reached for them alone. A trio that agreed on stealth leans toward
  // hiding in all four slots; a trio that agreed on mending leans toward
  // mending in all four.
  //
  // Safe because the charter is downstream and unchanged: tryCat still refuses
  // any category this essence may not produce, so a trio agreeing on `mend`
  // makes an Axe essence lean toward whatever mending-adjacent thing it can
  // honestly do, and where the answer is "nothing", the lean costs it nothing.
  // The bias decides what is TRIED first; the charter still decides what is
  // allowed at all.
  const spineFirst = [];
  for (const lv of (spine || [])) {
    for (const k of ((LEVERS[lv] && LEVERS[lv].bias) || [])) spineFirst.push(k);
  }
  for (const k of spineFirst) push(k);
  let ei = 0, si = 0;
  while (ei < ess.length || si < st.length) {
    push(ess[ei++]); push(ess[ei++]);
    push(st[si++]);
  }
  return out;
}

/** Which of this essence's levers the rolled template is actually about. A
 *  lever that names this category FIRST in its bias beats one that names it
 *  fourth, and a lever earlier in the motif beats a later one on a tie. When
 *  the category is on none of them the essence still has to speak, so its most
 *  characteristic lever is used and the twist lands as a rider. */
/** Which levers suit a TEMPLATE when the rolled category is on none of the
 *  essence's bias lists. Without this the fallback was a seeded pick, and since
 *  the seed is per-socket rather than per-category every unbiased category in a
 *  socket drew the SAME lever -- a heal, an aura and a dash all coming out
 *  "company", which is the old one-mechanic-per-socket failure wearing a new
 *  hat. Templates get the levers that can say something true about them. */
const TEMPLATE_LEVER_AFFINITY = {
  selfHeal: ['mend', 'renew', 'allies', 'ward'], selfHot: ['mend', 'renew', 'allies'],
  aoeHealPulse: ['allies', 'mend', 'renew', 'reach'],
  armorBuff: ['ward', 'raw', 'bind'], absorbShield: ['ward', 'allies', 'burst'],
  immunityBuff: ['ward', 'shift', 'burst'], thornsBuff: ['ward', 'linger', 'raw'],
  dash: ['swift', 'shift', 'burst'], teleport: ['shift', 'swift'],
  movementHaste: ['swift', 'shift'], townPortal: ['shift', 'call'],
  passiveMove: ['swift', 'shift'],
  aura: ['allies', 'renew', 'linger', 'bind', 'reach'],
  projectileBall: ['chain', 'linger', 'burst', 'reach', 'siphon', 'raw'],
  aoeRing: ['burst', 'chain', 'linger', 'reach'],
  weakenRing: ['bind', 'turn', 'linger'],
  rangeStrike: ['reach', 'raw', 'burst'], stackStrike: ['burst', 'linger', 'raw'],
  sunderStrike: ['raw', 'burst', 'bind'], imbueStrike: ['linger', 'siphon', 'raw'],
  selfPower: ['raw', 'burst', 'swift'], selfCritBuff: ['stalk', 'fate', 'burst'],
  timeFreeze: ['bind', 'turn', 'shift'],
  perception: ['stalk', 'reach', 'fate'], weaponAffinity: ['reach', 'swift', 'raw'],
  passiveBuff: ['raw', 'ward', 'stalk'], attrBoost: ['raw', 'mend'],
  passiveConditional: ['stalk', 'fate', 'ward'],
  triggeredPassive: ['burst', 'chain', 'fate', 'stalk'],
  summonBonded: ['call', 'allies'], summonWeapon: ['call', 'raw'],
  summonArmor: ['call', 'ward'], summonGear: ['call', 'stalk'],
  confuseTurn: ['turn', 'bind'], fateReroll: ['fate', 'stalk'],
  // ROUND 49 -- `taunt` first for the obvious reason, then the levers that can
  // say something true about a shout that pulls a pack: ward (you can survive
  // what you just invited), bind (they arrive slowed), allies (the team you
  // took them off), raw (you hit back harder for it).
  tauntPull: ['taunt', 'ward', 'bind', 'allies', 'raw'],
  // ROUND 49 -- `stealth` first for the obvious reason, then the levers that
  // can plausibly dress a veil: shifting (you are elsewhere), stalking (you
  // were waiting), swift (you are past before it turns).
  stealthVeil: ['stealth', 'shift', 'stalk', 'swift'],
};

export function leverForCategory(essDef, cat, roll, spine = null) {
  const motif = effectiveMotif(essDef, spine);
  if (!motif || !motif.levers.length) return null;
  const catKey = cat && cat.key ? cat.key : cat;
  const template = (cat && cat.template) || null;
  const affinity = (template && TEMPLATE_LEVER_AFFINITY[template]) || [];
  let best = null, bestScore = Infinity;
  motif.levers.forEach((l, i) => {
    const idx = ((LEVERS[l] && LEVERS[l].bias) || []).indexOf(catKey);
    const aIdx = affinity.indexOf(l);
    // A lever that names this CATEGORY outright beats one that merely suits the
    // template, which beats the essence's own running order.
    const s = idx >= 0 ? idx * 10 + i
      : aIdx >= 0 ? 100 + aIdx * 10 + i
        : 1000 + i;
    if (s < bestScore) { bestScore = s; best = l; }
  });
  if (best) return best;
  return motif.levers[roll ? roll('leverpick', motif.levers.length) : 0];
}

// The fields a reach twist lengthens and a raw/burst twist inflates. Listed
// rather than guessed at from the spec so a future template that happens to
// carry a `range` it does not mean geometrically cannot be silently scaled.
// ROUND 49 -- tauntRadius is a genuine geometric distance ("how far the pull
// reaches"), so a reach essence lengthens it exactly like it lengthens a nova.
// Listed here rather than left out because the alternative -- an Ape-armed tank
// whose every other radius grew and whose shout did not -- is the invisible
// inconsistency this list exists to prevent.
const REACH_FIELDS = ['range', 'radius', 'auraRadius', 'explodeRadius', 'teleportRange',
  'dashDist', 'familiarRange', 'freezeRadius', 'tauntRadius'];
// Whole numbers a raw/burst twist inflates...
const MAGNITUDE_FIELDS = ['base', 'healAmount', 'shieldAmount', 'hotPerSec', 'tickAmount',
  'familiarDmg', 'damageReduction'];
// ...and the FRACTIONS it inflates. Kept separate because Math.round on a 0.20
// armour bonus is 0, which is how a "28% heavier" twist can silently delete the
// only number an ability had.
const MAGNITUDE_FRACTIONS = ['armorBonus', 'thornsFrac', 'weaponDmgPct', 'moveSpeedPct', 'amount'];
// Multipliers expressed as 1+x. Scaling the whole figure would turn a +30%
// damage buff into +56%; only the excess over 1 is the ability's magnitude.
const MAGNITUDE_MULTS = ['powerMult', 'speedMult'];
const HEAL_TEMPLATES = ['selfHeal', 'selfHot', 'aoeHealPulse'];
// ROUND 62 -- what a warding lever may attach to: things the player raises,
// wears or stands inside. Everything else is offence, and armour bolted to a
// projectile is what made `ward` universal.
const WARD_TEMPLATES = ['armorBuff', 'absorbShield', 'thornsBuff', 'immunityBuff',
  'aura', 'selfHeal', 'selfHot', 'aoeHealPulse'];
// The fields that mean an ability is ALREADY about not being hurt. The first
// version of this gate said `spec.kind === 'passive'`, which accepted every
// passive in the game and moved ward only 15.1% -> 13.0%: a passive that
// quickens your feet was still being handed "it also hardens your armour".
// Being a passive is not the same as being defensive.
const DEFENSIVE_FIELDS = ['armorBonus', 'damageReduction', 'shieldAmount',
  'thornsFrac', 'maxHpBonus', 'blockChance', 'dodgeChance'];
function isDefensive(spec) {
  if (WARD_TEMPLATES.includes(spec.template)) return true;
  if (healsFriendlies(spec)) return true;
  if (spec.resist || spec.wardResist) return true;
  if (spec.template === 'passiveBuff'
      && (spec.buffKind === 'armor' || spec.buffKind === 'maxHp')) return true;
  return DEFENSIVE_FIELDS.some(f => typeof spec[f] === 'number' && spec[f] > 0);
}
// ROUND 50 -- where a heal lands. Read by the runtime (WorldScene's heal
// branches and _guardCastAbility) rather than guessed from the template name.
export const HEAL_SCOPES = ['self', 'ally', 'party'];
// The weighting, written out rather than expressed as thresholds so the odds
// are the literal thing on the page: 2/5 self, 2/5 one ally, 1/5 everyone.
const HEAL_SCOPE_ROLL = ['self', 'ally', 'self', 'ally', 'party'];
/** The clause a heal's stats line uses to say who it lands on. Undefined
 *  reads as 'self' so an ability generated before this round still prints. */
function healWho(scope) {
  if (scope === 'party') return 'to you and your team';
  if (scope === 'ally') return 'to the ally who needs it most';
  return 'to yourself';
}
// ROUND 55 -- breathCone and volley print their own affliction, so the rider
// must not print it a second time. Caught immediately on the new templates
// ('+3x3 Burn * +3x3 Burn'), which is what this list has always been for.
const DOT_IN_BASE_LINE = ['projectileBall', 'aoeRing', 'imbueStrike', 'breathCone', 'volley'];

function scaleFields(spec, fields, mult, out) {
  let touched = false;
  for (const f of fields) {
    if (typeof spec[f] !== 'number' || spec[f] <= 0) continue;
    spec[f] = spec[f] < 1 ? Math.round(spec[f] * mult * 100) / 100 : Math.max(1, Math.round(spec[f] * mult));
    out[f] = mult;
    touched = true;
  }
  return touched;
}
function scaleMagnitude(spec, mult, out) {
  let touched = scaleFields(spec, MAGNITUDE_FIELDS, mult, out);
  touched = scaleFields(spec, MAGNITUDE_FRACTIONS, mult, out) || touched;
  for (const f of MAGNITUDE_MULTS) {
    if (typeof spec[f] === 'number' && spec[f] > 1) {
      // Damped and clamped. Round 6 set the active-buff band deliberately
      // ("powerful but relatively short lived", +30-45% for 30s on a 5-minute
      // cooldown); an undamped +28% raw twist would take it to +58% and quietly
      // re-open a balance question the user already settled. A raw essence
      // should push the top of the band, not leave it.
      const damped = 1 + (mult - 1) * 0.6;
      spec[f] = Math.min(1.55, Math.round((1 + (spec[f] - 1) * damped) * 100) / 100);
      touched = true;
    }
  }
  return touched;
}
function hasMagnitude(spec) {
  return [...MAGNITUDE_FIELDS, ...MAGNITUDE_FRACTIONS].some(f => typeof spec[f] === 'number' && spec[f] > 0)
    || MAGNITUDE_MULTS.some(f => typeof spec[f] === 'number' && spec[f] > 1);
}

/**
 * The `swift` rider, composed from the cut that ACTUALLY landed.
 *
 * ROUND 59 -- it used to say "a quarter shorter" as a literal, which was true
 * everywhere until a template arrived that clamps its own cooldown afterwards.
 * Building the sentence from the two numbers means the clamp cannot make it
 * lie, and when the clamp eats the cut entirely the cooldown half of the
 * sentence disappears instead of claiming a reduction of nothing.
 */
/**
 * ROUND 73 -- A RIDER MAY NOT BE A WORSE COPY OF THE THING IT IS RIDING.
 *
 * The user, with a screenshot: an ability whose base line reads "+39% move
 * speed for 12s" and whose rider reads "+12% move speed for 3s". Their rule,
 * verbatim: "Secondary and tertiary effects are a good thing, but they should
 * generally not be a worse version of the primary effect." And they had seen it
 * before -- "This is the same as the abilities that use to generate crit chance
 * with crit chance."
 *
 * THEY ARE RIGHT THAT IT IS THE SAME BUG, AND THAT IS THE POINT. This exact
 * shape has now been fixed FIVE separate times, each as its own special case:
 *
 *   round 54  fate on fateReroll        -- two rerolls, two percentages
 *   round 56  swift on cooldownPassive  -- "the fourth duplicate-rider of this
 *                                          shape", says the comment there
 *   round 56  reach on a ranged base    -- print suppressed in leverStatsRider
 *   round 58  ward on a warding aura    -- "the fifth"
 *   round 62  stalk on selfCritBuff     -- the crit case the user remembers
 *
 * Five patches, each written where the last one was not, and a sixth arrived
 * anyway. Patching `swift` on `movementHaste` would make it six and guarantee a
 * seventh. So this is the rule instead: stated once, applied to every lever,
 * and asserted by `abilityFaults` so a new lever cannot reintroduce it quietly.
 *
 * WHAT COUNTS AS A DUPLICATE is deliberately narrow: the rider and the primary
 * must move the SAME axis in the same direction. A blink on a teleport is not a
 * duplicate (distance is not dodge); a chain on a ranged bolt is not one
 * (extra targets are not extra range). Measured across 7,880 generated
 * abilities, exactly two pairs qualify, and both are real:
 *
 *   hasteOnUse + speedMult   64 abilities   <- the user's screenshot
 *   bindOnHit  + slowPct    129 abilities   <- the same fault, unreported,
 *                                              and twice as common
 *
 * FOLD, DO NOT DROP. The rider's magnitude is worth something; it is only its
 * SECOND SENTENCE that is worthless. So the number goes into the primary and
 * the clause disappears -- which is what round 56 and round 58 each decided
 * independently, and is the behaviour this generalises.
 *
 * The fold is TIME-WEIGHTED where both sides have a duration: a 12% bonus for
 * 3s folded into a 39% bonus for 12s is worth 12% * 3/12 = 3 points, not 12.
 * Adding the rider's headline figure would turn a fix for an ability being too
 * wordy into a stealth buff.
 */
const DUPLICATE_RIDERS = [
  {
    rider: 'hasteOnUse', axis: 'move speed', primary: ['speedMult', 'moveSpeedPct'],
    fold: (spec, r) => {
      const gain = foldWeight(r.pct, r.duration, spec.buffDuration);
      // `speedMult` is a multiplier (1.39) and `moveSpeedPct` a fraction; both
      // take the same additive gain, which is why the axis is one axis.
      if (typeof spec.speedMult === 'number') spec.speedMult = round2(spec.speedMult + gain);
      else spec.moveSpeedPct = round2((spec.moveSpeedPct || 0) + gain);
    },
    rebuild: (spec) => swiftClause(spec),
  },
  {
    rider: 'bindOnHit', axis: 'enemy slow', primary: ['slowPct'],
    fold: (spec, r) => {
      spec.slowPct = round2(spec.slowPct + foldWeight(r.slowPct, r.duration, spec.debuffDuration));
    },
    // The bind lever's only clause IS the duplicate one, so folding leaves the
    // rider with nothing to say and the base line reports the combined figure.
    rebuild: () => '',
  },
];

function round2(n) { return Math.round(n * 100) / 100; }

/**
 * ROUND 73 -- the rule above, as a question anything can ask.
 *
 * Exported so the round-73 suite can sweep thousands of generated abilities and
 * assert the count is zero, rather than asserting that two particular pairs
 * were fixed. A sixth instance of this shape arrived because each of the five
 * fixes checked only itself; this checks the rule.
 */
export function duplicateRiderFaults(a) {
  const out = [];
  if (!a) return out;
  for (const rule of DUPLICATE_RIDERS) {
    if (a[rule.rider] == null) continue;
    const dup = rule.primary.find(f => typeof a[f] === 'number');
    if (dup) out.push(`${a.name || a.template}: ${rule.rider} duplicates ${dup} (${rule.axis})`);
  }
  return out;
}

/** What a rider worth `pct` for `riderDur` seconds is worth folded into a
 *  primary that lasts `primaryDur`. With no primary duration -- a passive is
 *  always on -- there is no honest ratio, so it takes a quarter: enough that
 *  the fold is not a nerf, small enough that it is not a buff. */
function foldWeight(pct, riderDur, primaryDur) {
  if (!pct) return 0;
  if (primaryDur && riderDur) return round2(pct * Math.min(1, riderDur / primaryDur));
  return round2(pct * 0.25);
}

/** Returns `{ mech }` when a rider was folded away, or null when nothing on
 *  this spec duplicates anything. */
function foldDuplicateRiders(spec) {
  let hit = null;
  for (const rule of DUPLICATE_RIDERS) {
    const r = spec[rule.rider];
    if (r == null) continue;
    if (!rule.primary.some(f => typeof spec[f] === 'number')) continue;
    rule.fold(spec, r);
    delete spec[rule.rider];
    hit = rule;
  }
  if (!hit) return null;
  return { mech: hit.rebuild(spec) || '' };
}

function swiftClause(spec) {
  const from = spec._cdCutFrom;
  const cutPct = (from && spec.cooldown && spec.cooldown < from)
    ? Math.round((1 - spec.cooldown / from) * 100) : 0;
  const word = cutPct >= 23 && cutPct <= 27 ? 'a quarter shorter' : `${cutPct}% shorter`;
  // ROUND 73 -- the haste half is OPTIONAL now. `foldDuplicateRiders` deletes
  // `hasteOnUse` when the ability is already a movement buff, and this used to
  // paper over the absence with a default of "12% for 3s" -- so a folded rider
  // would have gone on printing a made-up number that matched nothing on the
  // spec. A missing rider means the sentence does not mention it.
  const h = spec.hasteOnUse;
  if (!h) return cutPct >= 1 ? `Its cooldown is ${word}.` : '';
  const haste = `using it increases your movement speed by ${Math.round(h.pct * 100)}% for ${h.duration}s`;
  if (cutPct < 1) return `${cap(haste)}.`;
  return `Its cooldown is ${word}, and ${haste}.`;
}

/**
 * ROUND 59 -- THE SUMMON TRADE SURVIVES THE LEVER.
 *
 * A summon's damage is DERIVED from its duration and cooldown -- that is the
 * user's whole rule, "the shorter the duration and longer the cooldown the
 * stronger the summon should be". The lever pass runs after that derivation and
 * `swift` moves the cooldown, so an ability could print a 3-minute cooldown
 * while hitting for what a 5-minute one earns. Measured: 18 of 178 active
 * summons disagreed with their own timing, every one of them swift, each one a
 * silent 17% damage bonus the trade never priced.
 *
 * So the trade is re-derived from the FINAL numbers, and the final cooldown is
 * pulled back inside the user's band first. Damage moves by the ratio rather
 * than being recomputed from scratch, so anything a lever legitimately did to
 * the figure survives.
 *
 * `swift` is still worth having on a summon -- it is now worth the right
 * amount. Cutting the cooldown a quarter costs 0.75^0.55 = 14% of the damage
 * and buys 33% more casts: a real gain, measured instead of free.
 */
function reconcileSummonTrade(spec, mech) {
  const before = spec._summonStrength;
  if (!before || !spec.summonDuration) return mech;
  const finalCd = clampSummonCooldown(spec.cooldown);
  const after = summonStrength(spec.summonDuration, finalCd);
  if (finalCd === spec.cooldown && Math.abs(after - before) < 0.005) return mech;
  spec.summonDmg = Math.max(1, Math.round((spec.summonDmg || 1) * (after / before)));
  spec.cooldown = finalCd;
  spec._summonStrength = Math.round(after * 100) / 100;
  // The clamp may have eaten part of the cut the rider announced.
  return spec.lever === 'swift' ? swiftClause(spec) : mech;
}
/** Does this ability touch enemies at all? A slow, a turn or a stalking crit
 *  bonus bolted onto a self-heal is the same disagreement as a harm word in its
 *  name, one layer down in the mechanics. */
function touchesEnemies(spec, tags) {
  return tags.damages || typeof spec.slowPct === 'number' || !!spec.sunder || !!spec.sunderAmt
    || spec.template === 'weakenRing' || spec.template === 'timeFreeze' || spec.template === 'confuseTurn'
    || (spec.template === 'aura' && spec.auraEffect !== 'regen');
}
/**
 * ROUND 52 -- does this ability MEND? The mirror of touchesEnemies, and the
 * reason it had to be written: `linger` asked only `tags.damages`, so on a
 * healer the lever declined every socket it was offered and the next lever
 * took it. A wound that keeps working after it lands and a heal that keeps
 * working after it lands are the same idea; the generator had a word for one.
 *
 * Deliberately broader than HEAL_TEMPLATES: a `mend` twist can hang healOnUse
 * or regenPerSec on an ability of any shape, and once it has, that ability is
 * something the lingering lever can honestly lengthen.
 */
function healsFriendlies(spec) {
  if (!spec) return false;
  return HEAL_TEMPLATES.includes(spec.template)
    || (spec.template === 'aura' && spec.auraEffect === 'regen')
    || (typeof spec.healAmount === 'number' && spec.healAmount > 0)
    || (typeof spec.hotPerSec === 'number' && spec.hotPerSec > 0)
    || (typeof spec.healOnUse === 'number' && spec.healOnUse > 0)
    || (typeof spec.regenPerSec === 'number' && spec.regenPerSec > 0);
}

/**
 * ROUND 54 -- WHAT, EXACTLY, WOULD BE ROLLED AGAIN?
 *
 * Returns the name of the chance this spec actually rolls, or null when it
 * rolls none. `fate` uses it twice: to decline sockets it has no business on,
 * and to say which roll it is retrying instead of the contentless "if it
 * fails". The order matters -- the most specific chance the spec carries is the
 * one a player would expect a second attempt at.
 */
// Shapes that produce their effect on a clock or a condition rather than on a
// roll: an aura ticks, a familiar is simply present, a knack either applies or
// does not. Nothing here has a failure a second attempt could rescue.
const NO_ROLL_TEMPLATES = new Set([
  'aura', 'summonBonded', 'summonWeapon', 'summonArmor', 'summonGear',
  'passiveMove', 'passiveBuff', 'passiveConditional', 'triggeredPassive',
  'attrBoost', 'perception', 'weaponAffinity', 'townPortal', 'rangeBuff',
  'selfHot', 'selfHeal', 'aoeHealPulse', 'absorbShield', 'armorBuff',
  'immunityBuff', 'movementHaste', 'dash', 'teleport', 'stealthVeil',
]);
function chanceToReroll(spec, tags) {
  if (!spec) return null;
  if (spec.template === 'fateReroll') return 'strike';
  if (NO_ROLL_TEMPLATES.has(spec.template)) {
    // ...unless the spec has picked up an explicit chance from another lever
    // (a confuse rider on a barrier, a crit buff on a veil). Those are real
    // rolls and are allowed through below.
    if (!spec.confuse && !(spec.critChanceBonus > 0) && !spec.openerCrit
      && !(spec.dodgeBonus > 0)) return null;
  }
  if (spec.confuse || spec.template === 'confuseTurn') return 'confuse';
  if (typeof spec.critChanceBonus === 'number' && spec.critChanceBonus > 0) return 'crit';
  if (spec.openerCrit) return 'crit';
  if (typeof spec.dodgeBonus === 'number' && spec.dodgeBonus > 0) return 'dodge';
  // A blow rolls to crit whether or not anything else about it is chancy, so
  // any ability that actually deals damage has a roll worth a second attempt.
  if (tags && tags.damages) return 'strike';
  if (typeof spec.base === 'number' && spec.base > 0) return 'strike';
  return null;
}

/** Whether a lever has anything to grab on THIS spec. Checked before any
 *  mutation, so a lever that cannot apply costs nothing and the next lever in
 *  the essence's own order gets the socket instead. */
function leverApplies(lever, spec, tags) {
  switch (lever) {
    case 'reach': return REACH_FIELDS.some(f => typeof spec[f] === 'number' && spec[f] > 0)
      || spec.template === 'weaponAffinity' || spec.template === 'perception';
    case 'raw': case 'burst': return hasMagnitude(spec);
    case 'chain': return tags.damages;
    // ROUND 52 -- `linger` is the HARMFUL polarity and only that. It declines
    // a heal outright rather than lengthening it, so an essence that rolled a
    // heal from some other lever never has a Burn stapled to it; the next
    // lever in the motif's own order takes that socket instead. The mending
    // polarity is `renew`, immediately below, and an essence reaches it by
    // carrying it in its motif -- not by what a given socket happened to roll.
    case 'linger': return tags.damages && !healsFriendlies(spec);
    case 'renew': return healsFriendlies(spec);
    case 'bind': case 'turn': return touchesEnemies(spec, tags);
    // ROUND 62 -- THE USER: "Buffs with effects on strike don't make sense,
    // they don't hit enemies."
    //
    // `typeof spec.critChanceBonus === 'number'` is what let this onto
    // selfCritBuff, and the result printed "Against an enemy that has not yet
    // been wounded, its critical hit chance is 40% higher" on an ability that
    // never touches an enemy. A crit rider needs a blow to ride.
    //
    // A passive keeps it -- a passive conditional IS a standing rule about the
    // player's strikes -- but an active must actually strike.
    case 'stalk': return tags.damages
      || spec.template === 'perception' || spec.template === 'passiveConditional';
    // ROUND 49 -- a taunt is something you DO, at a moment of your choosing.
    // There is no honest passive form of "and now they are all looking at me",
    // and a passive that pulled a pack the instant one wandered into radius
    // would be a permanent aggro magnet rather than a tank's cooldown. So the
    // lever declines every passive and the essence's next lever takes the
    // socket, which is the same hand-off an Axe essence makes on a perception.
    case 'taunt': return spec.kind === 'active';
    // ROUND 54 -- A REROLL NEEDS A ROLL. The user: "The roll again is being used
    // incorrectly. It should be used on abilities with a % chance to trigger an
    // effect." `fate` fell through to the default `true` and attached itself to
    // anything, so a regen aura and a weapon grip both shipped with "If it
    // fails, it has a 20% chance to be rolled again" -- rerolling a failure that
    // has no way to occur. It now declines every spec with nothing to retry, and
    // the next lever in the essence's own order takes the socket.
    case 'fate': return chanceToReroll(spec, tags) !== null;
    // ROUND 62 -- `ward` had NO gate and fell through to `default: true`, so it
    // applied to literally everything. Round 58 then gave it an armour fallback
    // for physical stones (grantResistance), which is most stones -- so it
    // stopped declining anything at all and became the universal lever.
    //
    // Measured over 24,000 abilities: ward was 15.1% of every lever rolled,
    // nearly double the next (swift, 7.9%), and its two armour sentences landed
    // on 13.7% of ALL abilities. That is why the user recognised the wording --
    // one ability in seven was carrying the same armour clause.
    //
    // A ward is PROTECTION. It belongs on something you hold up or carry, not
    // bolted to a fire bolt. So it now declines pure offence and takes the
    // defensive sockets it was always for; the essence's next lever takes the
    // rest, which is the same hand-off `linger` and `taunt` already make.
    case 'ward': return isDefensive(spec);
    default: return true;   // allies, swift, mend, siphon, call, shift
  }
}

/** A short word for the SHAPE of the rolled ability, so a composed description
 *  can say what the thing is without repeating the stats line. */
function shapeWord(spec) {
  return {
    projectileBall: 'bolt', aoeRing: 'ring', aoeHealPulse: 'pulse', weakenRing: 'hex',
    rangeStrike: 'hurled blow', stackStrike: 'finishing blow', imbueStrike: 'anointing',
    thornsBuff: 'coat of barbs', townPortal: 'doorway', passiveConditional: 'knack',
    triggeredPassive: 'reflex', selfPower: 'surge', selfCritBuff: 'sharpening',
    immunityBuff: 'hardening', timeFreeze: 'stillness', selfHeal: 'mending',
    selfHot: 'slow mending', absorbShield: 'barrier', armorBuff: 'hardening',
    sunderStrike: 'rending blow', dash: 'step', teleport: 'blink',
    movementHaste: 'quickening', aura: 'aura', perception: 'sense',
    summonBonded: 'bonded thing', passiveMove: 'gait', weaponAffinity: 'grip',
    passiveBuff: 'temper', attrBoost: 'attunement', summonWeapon: 'weapon-relic',
    summonArmor: 'armour-relic', summonGear: 'trinket', confuseTurn: 'discord',
    fateReroll: 'second chance', tauntPull: 'challenge',
  }[spec.template] || 'power';
}

/**
 * ROUND 48 -- the mechanical twist the ESSENCE applies to a rolled ability.
 *
 * This is the hinge of the whole round. Before it, four different essences on
 * one stone produced one description and one mechanic and differed only in the
 * name; the essence's entire numeric contribution was `essDef.base`, which 60%
 * of the catalog does not define. Now the essence picks a LEVER, the lever
 * makes a real change to the numbers, and the description is composed from the
 * essence's own body and the stone's own material rather than from a fixed
 * per-template sentence with the stone's phrase dropped into it.
 *
 * It runs AFTER the template switch and BEFORE assignAbilityCost/statsLineFor,
 * so the cost and the stats line reflect whatever it did without any further
 * plumbing.
 *
 * `_leverScalars` is left on the spec so a signature that PINS a mechanic after
 * the fact (buildSignatureAbility, and the lent-signature block) can re-apply
 * the twist to the pinned figures exactly once instead of either losing it or
 * doubling it.
 *
 * opts.keepText -- an authored signature keeps its authored description; the
 * twist still lands, and a one-clause rider says what it did.
 */
export function applyEssenceFlavour(spec, essDef, stone, cat, roll0, comboBase, opts = {}) {
  const mat = materialFor(stone, essDef);
  const motif = effectiveMotif(essDef, opts.spine);
  // Salted with the CATEGORY. The socket seed is shared by every category the
  // pool probes, so an unsalted roll gave all twelve candidates in a socket the
  // same twist figures and the same sentence opener -- twelve rows that read as
  // one row twelve times, which is the complaint restated.
  const roll = (salt, n) => roll0(`${cat.key}|${salt}`, n);
  spec.element = mat.element;
  if (!motif) {
    // No motif (a confluence, or an essence outside the catalog): there is no
    // essence lever to pull, so the rolled description stands. Nothing else in
    // the kit depends on spec.lever being non-null.
    spec.lever = null;
    return spec;
  }
  // The essence's own running order, best-suited lever first. A lever with
  // nothing to grab on this template hands off to the next one rather than
  // asserting a twist it did not make -- before this check an Axe essence on a
  // perception passive claimed "28% heavier" over a spec with no magnitude in
  // it at all, which is a stats line that lies.
  const tags0 = specTags(spec);
  const first = leverForCategory(essDef, cat, roll, opts.spine);
  const order = [first, ...motif.levers.filter(l => l !== first)];
  const lever = order.find(l => leverApplies(l, spec, tags0)) || null;
  spec.lever = lever;
  spec.leverLabel = (LEVERS[lever] && LEVERS[lever].label) || null;
  const scalars = {};
  const pct = (n) => Math.round(n * 100);
  let mech = '';

  switch (lever) {
    case 'reach': {
      const m = 1.25 + roll('lvreach', 5) * 0.05;                 // +25%..+45%
      const grew = scaleFields(spec, REACH_FIELDS, m, scalars);
      if (spec.template === 'weaponAffinity') {
        spec.rangePct = Math.round((spec.rangePct || 0.15) * m * 100) / 100;
        spec.affinityMode = spec.attackSpeedPct ? 'both' : 'reach';
      }
      if (spec.template === 'perception') {
        spec.pickupRadiusMult = Math.round((spec.pickupRadiusMult || 1.5) * m * 100) / 100;
      }
      spec.reachPct = Math.round((m - 1) * 100) / 100;
      mech = spec.template === 'weaponAffinity'
        ? `The grip runs longer than the haft does: ${pct(spec.rangePct)}% more reach with a ${(spec.weaponName || 'weapon').toLowerCase()} in hand.`
        : spec.template === 'perception'
          ? `The senses run ${pct(m - 1)}% further out than the body they belong to.`
          : grew
            // ROUND 79 (bug 2.2) -- the last of the four. "Than the same
            // trick in other hands" is the same empty comparison as "than the
            // same ability would elsewhere", and `reach` is common enough that
            // it accounted for 238 of 6,000 generated abilities on the pass
            // that fixed the other three.
            ? `It reaches out past where the gesture ends, and keeps going.`
            : `Your ${mat.noun} carries further than your arm does, while it holds.`;
      break;
    }
    case 'allies': {
      spec.allyScaling = { per: 0.05 + roll('lvally', 8) / 100, max: 4, range: 180 };
      if (spec.template === 'aura' || spec.template === 'aoeHealPulse') spec.auraAffectsAllies = true;
      // ROUND 50 -- an ALLIES essence pushes a heal all the way out to the
      // whole company. This is the lever that means "the people with you", so
      // a heal wearing it and still landing only on the caster would be the
      // lever contradicting itself -- and it is the specific route by which a
      // healer build (Renewal, Life, Unity) reliably produces group heals
      // rather than hoping the scope roll came up kind.
      if (HEAL_TEMPLATES.includes(spec.template)) spec.healScope = 'party';
      // ROUND 62 -- varied for the same reason the armour clause was: with
      // `ward` gated this became the single most repeated sentence in the game
      // at 6.4% of every ability.
      {
        const per = pct(spec.allyScaling.per), rng = spec.allyScaling.range,
          max = spec.allyScaling.max;
        const tail = spec.auraAffectsAllies ? ', and it covers them too' : '';
        const bank = [
          () => `Its effect increases by ${per}% for each ally within ${rng}, up to ${max} allies${tail}.`,
          () => `Every ally inside ${rng} makes it ${per}% stronger, to a limit of ${max}${tail}.`,
          () => `It draws ${per}% more from each of up to ${max} companions standing within ${rng}${tail}.`,
          () => `Fighting beside others pays: +${per}% per ally within ${rng}, capped at ${max}${tail}.`,
        ];
        mech = bank[phraseIndex(spec, mat, bank.length)]();
      }
      break;
    }
    case 'raw': {
      const m = 1.18 + roll('lvraw', 6) * 0.02;                   // +18%..+28%
      scaleMagnitude(spec, m, scalars);
      if (spec.cooldown) { spec.cooldown = Math.round(spec.cooldown * 1.1 * 10) / 10; scalars.cooldown = 1.1; }
      // =================================================================
      // ROUND 79 (bug 2.2) -- SAY WHAT THE FORCE IS, NOT THAT IT IS MORE.
      //
      // The user: "I am also seeing a preponderance of 'It hit, restores, does
      // X harder, better than the same ability would elsewhere.' This is a
      // throwaway sentence and is meaningless to the ability."
      //
      // They are right twice over. It compares the ability to an imaginary
      // version of itself somewhere else, which tells the player nothing they
      // can act on -- and because `raw` is the most widely applicable lever in
      // the game, it was the most repeated sentence in it.
      //
      // The mechanic is sound: this lever means "the same working, with more
      // behind it". So the sentence now says what the MORE is, in the
      // material's own vocabulary -- the same treatment round 62 gave the
      // `allies` lever when it hit 6.4% of every ability in the game, and for
      // the same reason. The number itself lives in the stats line, where a
      // number belongs.
      {
        const bank = spec.cooldown ? [
          () => `There is more ${mat.noun} behind it than the shape needs, and it takes a moment longer to gather.`,
          () => `It comes in heavier than it looks, and asks for the extra time back.`,
          () => `The ${mat.noun} does not let up until it is spent -- which is slower, and worth it.`,
          () => `Overfilled. It ${mat.verb || 'lands'} with more than the working can politely hold, and needs longer to refill.`,
        ] : [
          () => `There is more ${mat.noun} behind it than the shape needs.`,
          () => `It runs ${mat.adj || 'heavy'} where the same working would run thin.`,
          () => `Whatever the limit of this is, you are not near it.`,
          () => `The ${mat.noun} keeps coming after the gesture has finished.`,
        ];
        mech = bank[phraseIndex(spec, mat, bank.length)]();
      }
      break;
    }
    case 'ward': {
      // The user's "thick fur" case: the defensive roll partly BECOMES
      // resistance in the stone's own element rather than generic armour.
      const amt = 0.10 + roll('lvward', 11) / 100;                // +10%..+20%
      // ROUND 56 -- "While it holds" presumes a duration; a passive has nothing
      // to hold. ROUND 58 -- and physical, and the warding aura. All three live
      // in grantResistance now, because the fallback clause below needed every
      // one of the same answers.
      mech = grantResistance(spec, mat, amt, { softenArmor: true, scalars });
      if (mech === '') spec._leverFolded = true;
      break;
    }
    case 'swift': {
      if (spec.kind === 'active') {
        if (spec.cooldown) {
          // ROUND 59 -- remember what it was cut FROM. A template that owns a
          // cooldown band (activeSummon) clamps this back afterwards, and the
          // clause has to report the cut that survived, not the one attempted.
          spec._cdCutFrom = spec.cooldown;
          spec.cooldown = Math.max(0.5, Math.round(spec.cooldown * 0.75 * 10) / 10);
          scalars.cooldown = 0.75;
        }
        spec.hasteOnUse = { pct: 0.12 + roll('lvswift', 9) / 100, duration: 3 + roll('lvswiftd', 3) };
        mech = swiftClause(spec);
      } else {
        // A passive has no cooldown of its own to cut, so the quickness goes
        // to the ones that do.
        // ROUND 56 -- the fourth duplicate-rider of this shape. `cooldownPassive`
        // IS this effect, and its own base line already reports the final
        // figure, so on that template the lever ADDS to the number instead of
        // announcing a second one. "Every ability comes round 9% sooner. It also
        // reduces the cooldown of every other ability by 9%" was one effect
        // printed twice.
        const cdrAdd = Math.round((0.05 + roll('lvswiftp', 8) / 100) * 100) / 100;
        if (spec.template === 'cooldownPassive') {
          spec.cooldownReduction = Math.round(
            Math.min(0.45, (spec.cooldownReduction || 0) + cdrAdd) * 100) / 100;
          mech = '';
          spec._leverFolded = true;
        } else {
          spec.cooldownReduction = cdrAdd;
          mech = `It also reduces the cooldown of every other ability you have by ${pct(spec.cooldownReduction)}%.`;
        }
      }
      break;
    }
    case 'chain': {
      spec.chain = { count: 1 + roll('lvchain', 3), radius: 80 + roll('lvchainr', 5) * 15, frac: 0.5 + roll('lvchainf', 4) / 10 };
      mech = `It then leaps to ${spec.chain.count} more ${spec.chain.count === 1 ? 'enemy' : 'enemies'} within ${spec.chain.radius}, each hit dealing ${pct(spec.chain.frac)}% of the original damage.`;
      break;
    }
    // ROUND 52 -- THE MENDING POLARITY: `linger` turned the other way round.
    //
    // Four shapes, because "it keeps working afterwards" means four different
    // things depending on what it is already doing:
    //   selfHot     -- already a trickle, so it simply runs LONGER.
    //   regen aura  -- stronger and wider; a standing field, not a pulse.
    //   instant heal -- a quarter of it is held back and paid out over the
    //                  seconds after. The same trade the harmful branch makes
    //                  when it shaves `base` to seed a DoT: nothing is created,
    //                  it is the same healing on a slower clock.
    //   anything else mending -- gains a trailing regen it did not have.
    case 'renew': {
      {
        const hLabel = (stone && stone.hot && stone.hot.label) || mat.hot || 'Mending';
        if (spec.template === 'selfHot') {
          const add = 3 + roll('lvhotdur', 3);
          spec.hotDuration = spec.hotDuration + add;
          // ROUND 79 (bug 2.2) -- and the same for the mending half.
          mech = `The ${mat.hot ? String(mat.hot).toLowerCase() : 'mending'} keeps working for ${add}s after it should have stopped.`;
        } else if (spec.template === 'aura' && spec.auraEffect === 'regen') {
          const m = 1.25 + roll('lvhotaura', 4) * 0.05;
          scaleFields(spec, ['tickAmount'], m, scalars);
          spec.auraRadius = Math.round((spec.auraRadius || 120) * 1.15);
          mech = `It restores ${pct(m - 1)}% more than it otherwise would, and reaches ${spec.auraRadius}.`;
        } else if (typeof spec.healAmount === 'number' && spec.healAmount > 3) {
          const held = Math.max(1, Math.round(spec.healAmount * 0.25));
          spec.healAmount = spec.healAmount - held;
          scalars.healAmount = 0.75;
          const dur = 4 + roll('lvhotd', 4);
          spec.hot = { perSec: Math.max(1, Math.round((held * 2) / dur)), duration: dur, label: hLabel };
          mech = `Part of the healing is held back and paid out afterwards: ${spec.hot.perSec} health a second for ${dur}s.`;
        } else {
          const dur = 5 + roll('lvhotd2', 4);
          spec.hot = { perSec: Math.max(1, Math.round(comboBase * 0.12)), duration: dur, label: hLabel };
          mech = `It also leaves a lasting mend: ${spec.hot.perSec} health a second for ${dur}s.`;
        }
      }
      break;
    }
    case 'linger': {
      const label = (stone && stone.dot && stone.dot.label) || mat.dot || cap(mat.noun);
      if (spec.dot) {
        spec.dot = { ...spec.dot, ticks: spec.dot.ticks + 1 + roll('lvling', 2) };
        mech = `Its affliction runs longer than most: ${spec.dot.dmgPerTick} damage per tick, ${spec.dot.ticks} ticks of ${label.toLowerCase()}.`;
      } else {
        spec.dot = { dmgPerTick: Math.max(2, Math.round(comboBase * 0.25)), ticks: 3 + roll('lvlingt', 3), tickMs: 800, critChance: 0.08, label };
        if (typeof spec.base === 'number' && spec.base > 3) { spec.base = Math.max(3, Math.round(spec.base * 0.85)); scalars.base = 0.85; }
        mech = `It also applies ${label.toLowerCase()}, dealing ${spec.dot.dmgPerTick} damage per tick for ${spec.dot.ticks} ticks.`;
      }
      break;
    }
    case 'burst': {
      const m = 1.30 + roll('lvburst', 5) * 0.05;
      scaleMagnitude(spec, m, scalars);
      if (spec.cooldown) { spec.cooldown = Math.round(spec.cooldown * 1.35 * 10) / 10; scalars.cooldown = 1.35; }
      // A passive relic has no cooldown to lengthen, so the trade is not offered.
      // ROUND 79 (bug 2.2) -- the burst lever, on the same terms as `raw`
      // above. Burst's TRADE is real and worth stating (much harder, much
      // slower), so the cooldown clause stays; what goes is the comparison to
      // an ability that does not exist.
      {
        const bank = spec.cooldown ? [
          () => `All of it arrives at once, and then there is nothing for a while -- the cooldown is a third longer.`,
          () => `It spends everything on one moment. A third longer before you can do it again.`,
          () => `The whole of the ${mat.noun} goes in the first instant, and it is a third longer coming back.`,
        ] : [
          () => `It spends everything on the moment it happens.`,
          () => `All at once, with nothing kept back.`,
          () => `The ${mat.noun} arrives all in one piece.`,
        ];
        mech = bank[phraseIndex(spec, mat, bank.length)]();
      }
      break;
    }
    case 'mend': {
      if (HEAL_TEMPLATES.includes(spec.template) || (spec.template === 'aura' && spec.auraEffect === 'regen')) {
        const m = 1.20 + roll('lvmend', 4) * 0.05;
        scaleFields(spec, ['healAmount', 'hotPerSec', 'tickAmount'], m, scalars);
        // ROUND 50 -- a MEND essence is a healer's essence, and a healer's
        // heal reaches past their own skin. Self-only heals under this lever
        // are lifted one step; a scope the roll already widened is left alone.
        if (spec.healScope === 'self') spec.healScope = 'ally';
        // ROUND 79 (bug 2.2) -- and the mending one.
        mech = spec.healScope === 'self'
          ? `What it closes, it closes properly.`
          : `It reaches past your own skin: what it mends, it mends for whoever is standing there.`;
      } else if (spec.kind === 'active') {
        spec.healOnUse = Math.max(2, Math.round(comboBase * (0.4 + roll('lvmendh', 4) / 10)));
        mech = `Using it also restores ${spec.healOnUse} health.`;
      } else {
        spec.regenPerSec = Math.round((0.5 + roll('lvmendp', 6) * 0.25) * 10) / 10;
        mech = `It also regenerates ${spec.regenPerSec} health a second, permanently.`;
      }
      break;
    }
    case 'siphon': {
      const damages = spec.category === 'attack' || (typeof spec.base === 'number' && spec.base > 0);
      // ROUND 55 -- SIPHON THAT MENDS SLOWLY. The user: "The right awakening
      // stones in a blood essence should generate abilities that deal damage
      // and generate a heal over time for a percentage of damage dealt."
      //
      // A siphon essence whose trio also agreed on RENEWAL takes its stolen
      // life back on a clock instead of all at once -- which is a different
      // thing to hold: worse burst sustain, better sustained sustain, and it
      // keeps working after the target is dead. The spine is what unlocks it,
      // so this is only reachable on a build that asked for both.
      // Reachable two ways, and the second is the one that matters: the trio
      // agreed on renewal, OR the socketed stone is itself a mending stone.
      // Gating on the spine alone measured 0 of 4,000 -- `renew` reaches a
      // spine about 3% of the time -- and the user's own phrasing puts it on
      // the stone anyway: "The right awakening stones in a blood essence".
      // ROUND 56 -- DEVOURING, not family. The user: "I could see awakening
      // stones of Feast (devouring), Hunger (devouring), Bat (vampire bat),
      // Undeath (draining life), Spider (draining life) all having potential to
      // generate an over time leech effect in the right essence."
      //
      // Three of those five are not in a mending family at all -- Bat is
      // `flyer`, Undeath is `death`, Spider is `serpent` -- so the family gate
      // could never have reached them. What they share is a THEME: something
      // that feeds. That is what DEVOURING_STONES names, and it sits alongside
      // the mending families rather than replacing them, because a blood
      // essence taking its life back slowly is still the case that started this.
      const mendingStone = stone
        && (['life', 'blood', 'water', 'light', 'aquatic'].includes(stone.family)
          || DEVOURING_STONES.includes(stoneIdOfTheme(stone)));
      if (damages && (mendingStone
        || (Array.isArray(opts.spine) && opts.spine.includes('renew')))) {
        const frac = 0.12 + roll('lvsiphhot', 10) / 100;
        const dur = 4 + roll('lvsiphhd', 4);
        const hLabel = (stone && stone.hot && stone.hot.label) || mat.hot || 'Mending';
        spec.leechOverTime = { frac: Math.round(frac * 100) / 100, duration: dur, label: hLabel };
        mech = `${pct(frac)}% of the damage it deals comes back as healing over the following ${dur}s, rather than at once.`;
        break;
      }
      if (damages) {
        spec.leech = Math.min(0.6, Math.round(((spec.leech || 0) + 0.15 + roll('lvsiph', 16) / 100) * 100) / 100);
        mech = `${pct(spec.leech)}% of the damage it deals is returned to you as health.`;
      } else {
        spec.lifeOnKill = 2 + roll('lvsiphk', 5);
        // ROUND 76 -- WHOSE KILL, and it is not the same answer twice.
        //
        // One sentence covered both cases and round 62's probe found it at
        // 5.36% of every description in the game, over its 5% ceiling. The
        // cause is item 2: the reserved summon seat made creature summons
        // common, a third of them take the aura or heal role and deal no
        // damage, and a non-damaging ability is exactly what this branch
        // catches -- so the siphon lever started landing here in bulk.
        //
        // The fix is not a synonym. For a SUMMON the killer is the minion, and
        // for a self-buff it is the player; the old wording said neither, and
        // "while it is active" on a creature you sent across the field is
        // actively misleading about where you have to be standing.
        mech = spec.template === 'activeSummon'
          ? `Each kill it makes returns ${spec.lifeOnKill} health to you, wherever you are standing.`
          : `Each kill you make while it is active restores ${spec.lifeOnKill} health.`;
      }
      break;
    }
    case 'stalk': {
      spec.openerCrit = { amount: 0.25 + roll('lvstalk', 6) * 0.05 };
      if (typeof spec.critChanceBonus === 'number') { spec.critChanceBonus = Math.round(spec.critChanceBonus * 1.2 * 100) / 100; scalars.critChanceBonus = 1.2; }
      // ROUND 62 -- "its critical hit chance" parses as the ENEMY's, which is
      // the opposite of what happens. The subject is the player.
      mech = `You are ${pct(spec.openerCrit.amount)}% more likely to critically strike an enemy that has not yet been wounded.`;
      break;
    }
    case 'bind': {
      if (typeof spec.slowPct === 'number') { spec.slowPct = Math.round(spec.slowPct * 1.25 * 100) / 100; scalars.slowPct = 1.25; }
      spec.bindOnHit = { slowPct: 0.15 + roll('lvbind', 16) / 100, duration: 2 + roll('lvbindd', 3) };
      mech = `Whatever it hits is slowed by ${pct(spec.bindOnHit.slowPct)}% for ${spec.bindOnHit.duration}s.`;
      break;
    }
    case 'call': {
      if (typeof spec.familiarDmg === 'number') {
        spec.familiarDmg = Math.round(spec.familiarDmg * 1.3); scalars.familiarDmg = 1.3;
        mech = `What it summons arrives stronger than the summoning would normally allow.`;
      } else {
        // ROUND 73 -- THE DURATION ONLY MEANS SOMETHING ON AN ACTIVE.
        //
        // Round 73 gave this rider a runtime (WorldScene's `_escortAsFamiliar`
        // and `_spawnEscort`); measuring where it lands showed 436 of 671 are
        // on PASSIVES, and a passive is always on. An escort that expired after
        // nine seconds and never came back would be worse than the nothing it
        // replaced, so a passive escort is permanent -- and then "While it
        // lasts... for 9s" is a promise about a number that does not exist.
        // The sentence now says which of the two this is.
        const timed = spec.kind === 'active';
        spec.escort = { dmg: Math.max(2, Math.round(comboBase * 0.45)), interval: 1.4 };
        if (timed) spec.escort.duration = 6 + roll('lvcalld', 5);
        mech = timed
          ? `While it lasts, an escort of ${mat.noun} fights beside you, striking for ${spec.escort.dmg} every ${spec.escort.interval}s.`
          : `An escort of ${mat.noun} fights beside you, striking for ${spec.escort.dmg} every ${spec.escort.interval}s.`;
      }
      break;
    }
    case 'shift': {
      if (typeof spec.teleportRange === 'number') { spec.teleportRange = Math.round(spec.teleportRange * 1.3); scalars.teleportRange = 1.3; }
      else if (spec.kind === 'active') spec.blinkOnUse = 60 + roll('lvshift', 5) * 15;
      spec.dodgeBonus = Math.round((0.04 + roll('lvshiftd', 6) / 100) * 100) / 100;
      // ROUND 59 -- "where the blow was aimed" assumes the ability IS a blow.
      // It is not, for the three things a player can now place in the world: a
      // trap read "You finish it 105px from where the blow was aimed", which
      // describes a strike that never happened.
      const blinkFrom = spec.template === 'activeSummon' ? 'where you called it'
        : 'where the blow was aimed';
      mech = spec.blinkOnUse
        ? `You finish it ${spec.blinkOnUse}px from ${blinkFrom}, +${pct(spec.dodgeBonus)}% harder to hit for it.`
        : `The step is a third longer, and you are +${pct(spec.dodgeBonus)}% harder to hit taking it.`;
      break;
    }
    case 'turn': {
      spec.confuse = { chance: 0.25 + roll('lvturn', 6) * 0.05, duration: 3 + roll('lvturnd', 4) };
      mech = `Each enemy it catches has a ${pct(spec.confuse.chance)}% chance to turn on its nearest ally for ${spec.confuse.duration}s.`;
      break;
    }
    case 'fate': {
      // ROUND 54 -- on an ability that IS a reroll, DEEPEN it rather than
      // stapling a second one beside it. Without this the fate essence's own
      // signature shipped two rerolls with two different percentages -- "21%
      // chance: a strike that did not crit is rolled again" on the stats line
      // and "a critical hit roll it fails has a 19% chance" in the description.
      // Same shape as `linger` extending an existing DoT instead of adding one.
      if (spec.template === 'fateReroll' && spec.rerollKind !== 'death') {
        const before = spec.rerollChance;
        spec.rerollChance = Math.min(0.75,
          Math.round((spec.rerollChance + 0.08 + roll('lvfatedeep', 8) / 100) * 100) / 100);
        scalars.rerollChance = spec.rerollChance / (before || 1);
        mech = `Its second chance comes more often than it would elsewhere: ${pct(spec.rerollChance)}% rather than ${pct(before)}%.`;
        break;
      }
      const kind = spec.template === 'fateReroll'
        ? (spec.rerollKind || 'strike')
        : (chanceToReroll(spec, tags0) || 'strike');
      spec.reroll = { kind, chance: 0.15 + roll('lvfate', 16) / 100 };
      const c = pct(spec.reroll.chance);
      mech = {
        strike: `When a strike from it misses or fails to crit, it has a ${c}% chance to be rolled again.`,
        crit: `A critical hit roll it fails has a ${c}% chance to be rolled again.`,
        dodge: `A dodge it fails has a ${c}% chance to be rolled again.`,
        confuse: `When it fails to turn an enemy, it has a ${c}% chance to be rolled again.`,
        death: `A killing blow taken under it has a ${c}% chance to be refused outright.`,
      }[kind] || `A failed roll under it has a ${c}% chance to be rolled again.`;
      break;
    }
    // ROUND 49 -- "Drawing monsters to the tank and away from the team".
    //
    // Two shapes, and the split is the same one `linger` makes with a DoT. On a
    // spec that is ALREADY a taunt the lever cannot add a second one, so it
    // deepens the one that is there -- longer and holding more -- exactly as
    // linger extends an existing dot instead of stapling a new one beside it.
    // On anything else it attaches a smaller RIDER, which is what makes an
    // Armour essence's shield-wall or its ironhide also turn heads: the
    // protective essence pulls the pack whatever socket it landed in.
    case 'taunt': {
      if (spec.template === TAUNT_TEMPLATE) {
        const extraS = 1 + roll('lvtauntd', 3);
        const extraN = 1 + roll('lvtauntn', 2);
        spec.tauntDuration = (spec.tauntDuration || TAUNT_DEFAULT_DURATION) + extraS;
        spec.tauntMax = (spec.tauntMax || TAUNT_DEFAULT_MAX) + extraN;
        mech = `It holds ${spec.tauntMax} enemies for ${spec.tauntDuration}s, and none of them will target anyone but you.`;
      } else {
        spec.taunt = {
          radius: 150 + roll('lvtauntr', 5) * 20,      // 150..230
          duration: 3 + roll('lvtaunts', 3),           // 3..5s
          max: 2 + roll('lvtauntm', 3),                // 2..4
        };
        mech = `Using it also pulls ${spec.taunt.max} enemies within ${spec.taunt.radius} onto you for ${spec.taunt.duration}s.`;
      }
      break;
    }
    default: break;
  }

  // Nothing in this essence's 2-4 levers could grab this template (an Axe
  // essence -- raw/burst/chain -- landing on a perception passive, say). The
  // essence still has to be present in the row, so it contributes the one thing
  // every ability can carry: the material it is bonded through. Small, real,
  // and rare -- it only fires when every authored lever has genuinely declined.
  if (!mech) {
    spec.lever = spec.lever || motif.levers[0];
    spec.leverLabel = (LEVERS[spec.lever] && LEVERS[spec.lever].label) || null;
    const amt = 0.06 + roll('lvfall', 7) / 100;
    // ROUND 58 -- through the same door as the ward lever. This clause fires
    // when every authored lever has declined the template, and it was writing
    // dead `resist_physical` keys and doubling up on warding auras exactly as
    // the lever was.
    mech = grantResistance(spec, mat, amt);
    if (mech === '') spec._leverFolded = true;
  }

  // ROUND 52 PHASE 2 -- THE CONDITION.
  //
  // Attached after the lever twist rather than inside it, because it is a
  // different KIND of statement: the twist says what this ability does, the
  // condition says when it does more of it. Bolting it into the switch would
  // have meant writing it four times, once per qualifying lever, and the four
  // copies would have drifted.
  //
  // Three gates, all of which must hold:
  //   the LEVER's charter signature is one that means "this grows"
  //   the STONE's family names a condition
  //   the SPEC has a magnitude worth conditioning -- a scaling clause on an
  //   ability with no number to multiply is a sentence and nothing else.
  const sig = lever && LEVER_CHARTERS[lever] && LEVER_CHARTERS[lever].signature;
  if (globalThis.__SCDBG) { globalThis.__SCDBG.push({lever, sig, fam: (stone&&stone.family), field: scalableMagnitude(spec), tmpl: spec.template}); }
  if (sig && SCALING_SIGNATURES.has(sig)) {
    const fam = (stone && stone.family) || (essDef && essDef.family) || null;
    const mode = scaleModeForFamily(fam);
    const field = scalableMagnitude(spec);
    if (mode && field) {
      const delay = scaleDelayForFamily(fam);
      // Per-step and cap are rolled together so the pair always makes sense:
      // a cap is a number of steps' worth of growth, not an unrelated ceiling.
      const per = Math.round((0.06 + roll('scper', 7) * 0.01) * 100) / 100;
      const steps = 4 + roll('scsteps', 4);
      spec.scaleOn = mode;
      spec.scalePer = per;
      spec.scaleCap = Math.round(per * steps * 100) / 100;
      if (delay) spec.scaleDelay = delay;
      // ROUND 74 -- WHICH of the mode's three phrasings this ability uses,
      // decided here, once, and carried on the spec. See scalingClause for why
      // it cannot be derived at print time (its two callers run before and
      // after the ability is named). Rolled on the same seeded `roll` as the
      // magnitudes above, so a build's wording is as stable as its numbers.
      spec.scaleVariant = roll('scvariant', SCALE_CLAUSE_VARIANTS);
      // A condition is paid for. The base figure gives back roughly what the
      // condition will hand over at its midpoint, so a conditional ability is
      // a BET rather than a free upgrade -- weaker than its flat sibling when
      // the condition is cold, better when it is hot. A delayed one gives back
      // less, because waiting is already the cost.
      const give = delay ? 0.92 : 1 - Math.min(0.22, spec.scaleCap / 2);
      if (typeof spec[field] === 'number' && spec[field] > 3) {
        spec[field] = Math.max(2, Math.round(spec[field] * give));
        scalars[field] = (scalars[field] || 1) * give;
      }
      const clause = scalingClause(spec);
      // ROUND 54 -- was "And it reads the room: ...". The user: "'it reads the
      // room' can probably be removed." It was a narrator's phrase in a slot
      // that should state a rule, and the clause after it already says the
      // whole thing plainly.
      mech = mech ? `${mech} ${cap(clause)}.` : `${cap(clause)}.`;
    }
  }

  // ROUND 59 -- the summon's damage is derived from its own timing, and the
  // lever pass above may have moved that timing. Re-derive before any text is
  // built from either number.
  if (spec.template === 'activeSummon') mech = reconcileSummonTrade(spec, mech);

  // ROUND 73 -- and the duplicate-rider rule, applied to whatever the switch
  // above just built. See DUPLICATE_RIDERS.
  const folded = foldDuplicateRiders(spec);
  if (folded) { mech = folded.mech; spec._leverFolded = true; }

  spec._leverScalars = scalars;
  spec._leverRider = mech;
  // ROUND 56 -- a lever that FOLDS INTO the base line instead of adding a
  // clause (swift on `cooldownPassive`) leaves `mech` empty, but it has still
  // changed a number the base line prints. Without this the description would
  // keep the figure from before the fold.
  if (!opts.keepText && !mech && spec._leverFolded) {
    spec.desc = mechanicalDesc(spec, mat);
  } else if (!opts.keepText && mech) {
    spec.desc = `${mechanicalDesc(spec, mat)}${mech ? ' ' + mech : ''}`;
  } else if (opts.keepText && mech) {
    // An authored signature keeps its own voice; the twist still has to be
    // legible, so it arrives as one extra clause rather than a rewrite.
    spec.desc = `${String(spec.desc || '').replace(/\s*$/, '')} ${mech}`;
  }
  return spec;
}

/** Re-applies the twist's numeric scalars to figures a signature PINNED after
 *  the fact. Called exactly once per pinned mech, so a pinned range is
 *  lengthened by a reach essence the same amount a rolled one would be, and a
 *  figure the pin did not touch is never scaled twice. */
function reapplyLeverScalars(spec, mech) {
  const sc = spec._leverScalars;
  if (!sc || !mech) return;
  for (const f of Object.keys(sc)) {
    if (typeof mech[f] === 'number' && typeof spec[f] === 'number') {
      // Same rounding rule as scaleFields: anything under 1 is a fraction and
      // keeps two decimals, or a 0.20 armour bonus rounds to zero.
      spec[f] = (spec[f] < 1 || f === 'cooldown')
        ? Math.round(spec[f] * sc[f] * 100) / 100
        : Math.max(1, Math.round(spec[f] * sc[f]));
    }
  }
}

/**
 * The description, composed rather than templated.
 *
 * Sentence one is the ESSENCE (its body clause, its parts, its adjectives) and
 * the STONE (its material noun and adjective) meeting on the SHAPE the roll
 * actually produced. Sentence two is the mechanic the lever applied, with its
 * real numbers in it. Nothing in here is a per-template fixed sentence, which
 * is what 74% of descriptions were before this round.
 */
/**
 * ROUND 54 -- WHAT THE ABILITY DOES, IN PLAIN ENGLISH.
 *
 * The user, on the generated descriptions:
 *
 *   "Flavor is better but lots of bizarre wording, comes across as almost
 *    english as a second language. Look back at the wording for in lore essence
 *    abilities. The name has flavor but mechanically the ability just channels
 *    the name into an effect. It doesnt say 'Relentless Assualt: The power of a
 *    might charge repeated strikes with repeating power of might'. It says
 *    'Each use of this attack in quick succession increases the damage of this
 *    attack...'"
 *
 * That is a rule, and it retires a whole layer rather than editing it. What
 * stood here was a bank of six sentence frames that assembled a motif part, a
 * motif verb, a stone noun and a shape word into things like:
 *
 *   "You crush with the long tail this essence grew, and green goes along the
 *    reflex."
 *   "Unlooked-for cool spring, and self with it: the bolt is both at once."
 *
 * Every word in those is real and the grammar parses, which is exactly why it
 * read as a translation: the sentence has a shape but no meaning. No amount of
 * reworking the frames fixes that, because the frames were being asked to carry
 * flavour the NAME is already carrying.
 *
 * So the division is the user's: the name is where the flavour lives, and the
 * description says what the thing does. The element still appears -- "a bolt of
 * fire" is both mechanical and flavoured -- but it appears as a fact about the
 * ability rather than as a metaphor about the bearer.
 */
// The word a description can put after "a bolt of". The stone's own noun is
// wrong here about half the time -- the table carries body and weapon words
// (edge, claw, weight, shot) beside the substances, and "a bolt of edge" is
// exactly the translated-sounding phrase this round is removing. The stone's
// character is carried by the NAME; the description names the damage channel,
// which is a fact the player can act on.
const ELEMENT_PHRASE = {
  fire: 'fire', frost: 'frost', lightning: 'lightning', nature: 'nature',
  shadow: 'shadow', radiant: 'light', physical: 'force',
};
/** ROUND 54 -- what a magnitude increase DOES to this particular ability.
 *  The plainer wording exposed a disagreement the literary phrasing had hidden:
 *  `burst` and `raw` both said "it hits harder", which is nonsense on a heal
 *  ("Oasis Rebirth... restores 5 HP/s. It hits 45% harder") and on a barrier.
 *  One helper so every magnitude lever agrees with the thing it is scaling. */
function magnitudeVerb(spec) {
  if (spec.template === 'selfHeal' || spec.template === 'selfHot'
    || spec.template === 'aoeHealPulse'
    || (spec.template === 'aura' && spec.auraEffect === 'regen')) return 'restores';
  if (spec.template === 'absorbShield') return 'absorbs';
  if (spec.template === 'armorBuff' || spec.template === 'immunityBuff') return 'protects';
  if (typeof spec.base === 'number' && spec.base > 0) return 'hits';
  return 'works';
}
function magnitudePhrase(spec, pctMore) {
  const v = magnitudeVerb(spec);
  if (v === 'hits') return `It hits ${pctMore}% harder`;
  if (v === 'restores') return `It restores ${pctMore}% more`;
  if (v === 'absorbs') return `It absorbs ${pctMore}% more`;
  if (v === 'protects') return `It protects ${pctMore}% better`;
  return `It works ${pctMore}% harder`;
}

/**
 * ROUND 54 -- WHICH "AUTHORED" DESCRIPTIONS ARE ACTUALLY AUTHORED.
 *
 * essenceAbilities.js carries 1,349 signature descriptions, and they are not
 * all hand-written: 31% of them share a frame used four or more times --
 * "Throws a lance of X" (55), "A single condensed bolt of X, and it does not
 * miss by much" (47), "Raises a shell of X" (29). Those were bulk-filled at
 * some point and have been treated as authored ever since, which is why the
 * signature path kept producing lines like "A single condensed bolt of the
 * traveler's third leg" -- the same translated-sounding construction this round
 * removed from the generator, sitting one file over and exempt from the fix
 * because `keepText` protects authored voices.
 *
 * So the exemption is earned rather than assumed. A description whose frame is
 * shared by four or more entries is a filled template and goes through
 * mechanicalDesc; one that appears in three or fewer is somebody's sentence and
 * is left alone. Computed from the data at load, so hand-writing a replacement
 * automatically re-earns the exemption.
 */
const GENERIC_SIGNATURE_FRAMES = (() => {
  const frameOf = (d) => String(d || '').replace(/\b(of|with|through|into)\s+[^,.]+/g, '$1 X');
  const n = {};
  for (const list of Object.values(ESSENCE_SIGNATURES)) {
    for (const e of list) { const f = frameOf(e.desc); if (f) n[f] = (n[f] || 0) + 1; }
  }
  return { frames: new Set(Object.keys(n).filter(k => n[k] >= 4)), frameOf };
})();
function isFilledTemplateDesc(desc) {
  return GENERIC_SIGNATURE_FRAMES.frames.has(GENERIC_SIGNATURE_FRAMES.frameOf(desc));
}

function mechanicalDesc(spec, mat) {
  const pct = (v) => Math.round((v || 0) * 100);
  const el = ELEMENT_PHRASE[(mat && mat.element) || 'physical'] || 'force';
  const n = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);
  const secs = (v) => `${n(v)} second${n(v) === 1 ? '' : 's'}`;
  const who = spec.healScope === 'party' ? 'you and your team'
    : spec.healScope === 'ally' ? 'the ally who needs it most' : 'you';
  switch (spec.template) {
    // ROUND 75 -- the stacking sentence, HERE. `mechanicalDesc` is what the
    // lever pass rewrites `desc` from, so a template that has no case here
    // falls through to the generic tail ("Channels shadow into effect") and
    // the ability describes nothing at all. Round 74's ranged twists were
    // moved to `statsLine` to escape that rewrite; the better answer, found
    // this round, is to give the template a case so the rewrite produces the
    // right sentence instead of being routed around.
    case 'stacking': {
      const line = stackClause(spec);
      // The authored three carry a line of their own voice in front of the
      // mechanic -- the project's naming rule, that the name carries the
      // flavour and the description states the mechanic, with the flavour
      // allowed one sentence when it is a signature the reader may know.
      return spec.stackFlavour ? `${spec.stackFlavour} ${line}` : line;
    }
    case 'projectileBall':
      return `Throws a bolt of ${el} that deals ${spec.base} damage to the first enemy it hits.`;
    case 'aoeRing':
      return `Bursts outward, dealing ${spec.base} damage to every enemy within ${spec.range}.`;
    case 'breathCone':
      // ROUND 56 -- "Breathes force" was the physical case reading badly: you
      // breathe fire, you do not breathe force. Untyped damage gets a verb that
      // fits an unbreathable thing.
      return spec.element === 'physical'
        ? `Looses a wide cone of raw force ahead of you, dealing ${spec.base} damage to everything caught in it.`
        : `Breathes ${el} in a wide cone ahead of you, dealing ${spec.base} damage to everything caught in it.`;
    case 'barrierWall':
      switch (spec.wallKind) {
        case 'burn':
          return `Draws a line of ${el} across the ground ahead. Anything that crosses it takes ${spec.base} damage, and it holds for ${secs(spec.wallDuration)}.`;
        case 'pull':
          return `Collapses a point of ${el} ahead of you for ${secs(spec.wallDuration)}, dragging every enemy near it inward.`;
        default:
          return `Raises a wall of ${el} across the ground ahead. Enemies cannot cross it for ${secs(spec.wallDuration)}.`;
      }
    case 'reflectWard':
      if (spec.reflectKind === 'debuff') {
        return `Turns afflictions back on whoever inflicts them: each debuff laid on you has a ${pct(spec.reflectChance)}% chance to be sent back to its source instead${spec.buffDuration ? `, for ${secs(spec.buffDuration)}` : ''}.`;
      }
      return spec.reflectKind === 'spell'
        ? `Turns elemental harm back on its source: ${pct(spec.reflectFrac)}% of typed damage you take is returned to whoever dealt it${spec.buffDuration ? `, for ${secs(spec.buffDuration)}` : ''}.`
        : `${pct(spec.reflectFrac)}% of the damage you take is dealt straight back to whoever dealt it.`;
    case 'cooldownPassive':
      return `Every ability you have comes round ${pct(spec.cooldownReduction)}% sooner.`;
    case 'volley':
      return `Looses ${spec.volleyCount} bolts of ${el} at once, spread apart, each dealing ${spec.base} damage.`;
    case 'elementPierce':
      return `Your ${spec.pierceElement || el} damage can no longer be resisted. Enemies that would shrug it off take it in full.`;
    case 'aoeHealPulse':
      // ROUND 58 -- the cast-speed scaling is stated, because it is now an
      // official property of Spirit rather than an undocumented quirk. The
      // number cannot be baked in: it is the player's stat at the moment of the
      // cast, so the description names the RULE and the stats line names the
      // base the rule multiplies.
      return `Restores ${spec.healAmount} health to you and every ally within ${spec.range}, and more the faster you cast.`;
    case 'partyBuff':
      // Named in the order a player cares about: WHO it reaches, then what
      // they get. A buff whose sentence opens with a number reads as a
      // self-buff, which is the one thing this is not.
      return `Every ally within ${spec.range} strikes ${pct(spec.partyDmgPct)}% harder for ${secs(spec.buffDuration)}, and fights with ${spec.partyPower} more power while it holds.`;
    case 'bloomField':
      return `Raises a short-lived growth where you stand. For ${spec.fieldDuration} seconds it restores ${spec.healPerSec} health a second to you and any ally inside it.`;
    case 'weakenRing':
      return `Strips ${pct(spec.sunder.amount)}% armour and ${pct(spec.slowPct)}% movement speed from every enemy within ${spec.range}.`;
    case 'rangeStrike':
      return `A thrown blow that hits harder the further it travels, up to ${spec.maxMult.toFixed(1)} times its damage at maximum range.`;
    case 'stackStrike':
      return `Consumes every affliction on the target, adding ${spec.stackMult.toFixed(1)} times their remaining damage to this blow.`;
    case 'imbueStrike':
      return `Coats your weapon in ${el}: your next ${spec.strikes} strikes each apply a lasting affliction.`;
    case 'sunderStrike':
      return `A heavy blow that breaks armour, leaving the target ${pct(spec.sunder.amount)}% easier to wound.`;
    case 'thornsBuff':
      return `For ${secs(spec.buffDuration)}, ${pct(spec.thornsFrac)}% of the damage you take is dealt back to whoever dealt it.`;
    case 'selfHeal':
      return `Restores ${spec.healAmount} health to ${who}.`;
    case 'selfHot':
      return `Restores ${spec.hotPerSec} health a second to ${who}, for ${secs(spec.hotDuration)}.`;
    case 'absorbShield':
      return `Raises a barrier that absorbs the next ${spec.shieldAmount} damage and holds for ${secs(spec.shieldDuration)}.`;
    case 'armorBuff':
      return `Raises your armour by ${pct(spec.armorBonus)}% for ${secs(spec.buffDuration)}.`;
    case 'immunityBuff':
      // immunityDuration, not buffDuration -- see the stats line. Same class of
      // bug as timeFreeze's radius: a description that was a metaphor never had
      // to name a field correctly, so nothing caught the typo.
      return `For ${secs(spec.immunityDuration)}, incoming physical damage cannot reduce you below one health.`;
    case 'selfPower':
      return `Increases your damage by ${pct(spec.powerMult - 1)}% for ${secs(spec.buffDuration)}.`;
    case 'selfCritBuff':
      return `Increases your critical hit chance by ${pct(spec.critChanceBonus)}% for ${secs(spec.buffDuration)}.`;
    case 'timeFreeze':
      // freezeRadius, not range -- the stats line has always used the former and
      // the description was reading a field this template never sets, printing
      // "within undefined". Invisible while the description was a metaphor.
      return `Holds every creature within ${spec.freezeRadius} in place for ${secs(spec.freezeDuration || 5)}.`;
    case 'confuseTurn':
      return `Turns up to ${spec.confuseMax || 2} enemies within ${spec.range} against each other for ${secs(spec.confuseDuration || 6)}.`;
    case 'dash':
      return `A short burst of movement that carries you ${spec.dashDist} forward.`;
    case 'teleport':
      return `Steps you instantly to a point up to ${spec.teleportRange} away.`;
    case 'movementHaste':
      // speedMult (a 1+x multiplier), not moveSpeedPct -- see the stats line.
      // The third field-name mismatch this rewrite has surfaced; a description
      // that never named a real field could not fail loudly enough to be found.
      return `Increases your movement speed by ${pct((spec.speedMult || 1) - 1)}% for ${secs(spec.buffDuration)}.`;
    case 'passiveMove':
      return `Your movement speed is permanently increased by ${pct(spec.moveSpeedPct)}%.`;
    case 'townPortal':
      return `Opens a doorway back to town, and a second one to return by.`;
    case 'aura':
      // FOUR effects, not two. `self_passive_slow_aura` and
      // `self_passive_weaken_aura` are auras with no tickAmount at all, and the
      // damage branch was printing "deals undefined damage" on them -- 1 of
      // 3,000, found only because the descriptions now name real fields.
      switch (spec.auraEffect) {
        case 'regen':
          return `A standing field that restores ${spec.tickAmount} health every ${n(spec.tickInterval || 1.2)}s to you and nearby allies.`;
        case 'slow':
          return `A standing field that slows every enemy within ${spec.auraRadius} while they stay in it.`;
        case 'weaken':
          return `A standing field that wears down the armour of every enemy within ${spec.auraRadius}.`;
        case 'ward':
          return `A standing field that grants ${pct(spec.wardResist.amount)}% ${spec.wardResist.element} resistance to you and any ally within ${spec.auraRadius}.`;
        default:
          return `A standing field of ${el} that deals ${spec.tickAmount} damage to enemies within ${spec.auraRadius}.`;
      }
    case 'perception':
      return `Sharpens your senses: you can pick things up from further away, and see what others miss.`;
    case 'weaponAffinity': {
      // The template rolls EITHER extra reach or extra speed (see the stats
      // line), and a fixed "reach further" sentence contradicted half of them.
      const w = spec.weaponName || spec.weaponId || 'one weapon';
      const bits = [];
      if (spec.rangePct) bits.push(`reach ${pct(spec.rangePct)}% further`);
      if (spec.attackSpeedPct) bits.push(`land ${pct(spec.attackSpeedPct)}% faster`);
      if (!bits.length) return `Long practice with the ${w}.`;
      return `Long practice with the ${w}: your strikes with it ${bits.join(' and ')}.`;
    }
    case 'passiveBuff':
      return `A permanent increase to one of your core statistics.`;
    case 'attrBoost':
      return `Your bond with this attribute deepens by one with every rank the essence gains.`;
    case 'passiveConditional':
      return `A knack that pays off only under one specific circumstance.`;
    // ROUND 56 -- this used to return "A reflex that fires on its own when the
    // right thing happens in a fight", which names neither the condition nor
    // the payoff. The stats line has always built "<when>: <what>" off the
    // trigger/effect descriptors; the description now states the same mechanic
    // in prose, so the two can never disagree.
    case 'triggeredPassive': {
      const t = spec.trigger || {}, e = spec.effect || {};
      const when = {
        hpBelow: `Once your health falls below ${pct(t.frac || 0.5)}%`,
        kill: 'Each time you kill something',
        crit: 'Each time you land a critical hit',
        critDrought: `After ${t.seconds} seconds without a critical hit`,
        hurtNonFire: 'Each time you are hurt by anything other than fire',
      }[t.on] || 'When its condition is met';
      const what = {
        regenBurst: `you regenerate ${e.perSec} health a second for ${e.duration} seconds`,
        physicalDamageMult: `your physical damage rises by ${pct(e.amount)}% for ${e.duration} seconds`,
        boltNearest: `a bolt leaps to the nearest enemy within ${e.range}, dealing ${e.damage} damage`,
        nextSpellDamage: `your next spell deals ${pct(e.amount)}% more damage`,
        critChance: `your crit chance rises by ${pct(e.amount)}% for your next ${(e.strikes || 1) > 1 ? `${e.strikes} strikes` : 'strike'}`,
      }[e.kind] || 'its effect fires';
      return `${when}, ${what}.${spec.cooldown ? ` This can happen once every ${spec.cooldown} seconds.` : ''}`;
    }
    case 'summonBonded':
      return `Calls a bonded familiar of ${el} that fights beside you, striking for ${spec.familiarDmg} damage.`;
    case 'activeSummon': {
      const noun = summonNoun(spec.summonKind, spec.element);
      const life = summonTimeWord(spec.summonDuration);
      if (spec.summonKind === 'trap') {
        // ROUND 75 (item 7) -- the placement is the first thing a player needs
        // to know about a trap, so it opens the sentence rather than being a
        // footnote: where it goes decides whether the ability is used before a
        // fight, during one, or to start one.
        const place = spec.trapDelivery === 'dropped' ? 'Drops'
          : spec.trapDelivery === 'spawned' ? 'Conjures' : 'Throws';
        const where = spec.trapDelivery === 'dropped' ? ' at your feet'
          : spec.trapDelivery === 'spawned' ? ' onto the nearest enemy' : ' out ahead of you';
        return `${place} ${noun}${where}. It waits ${life}, and the first ${spec.summonCharges} enemies to come within ${spec.summonRange} take ${spec.summonDmg} damage in a blast around it.`;
      }
      if (spec.summonKind === 'turret') {
        return `Sets down ${noun} for ${life}. It cannot move, and it strikes anything within ${spec.summonRange} for ${spec.summonDmg} damage every ${spec.summonInterval}s.`;
      }
      // ===== ROUND 76 -- THE MINION'S JOB, SAID ON ITS CARD ==================
      //
      // Item 2 gave every creature summon exactly one of five roles and the
      // description never mentioned which. A player looking at two summons
      // could not tell that one heals and the other carries an aura -- the
      // whole "board of eight that reads as a menagerie" only works if the
      // player can tell them apart before casting.
      //
      // It also fixes a monoculture item 2 caused. The reserved seat took this
      // category from rare to common, and round 62's own probe found ONE
      // sentence -- "It hunts on its own, striking for # damage every #s" --
      // at 8.37% of every description in the game, past its 5% ceiling. More
      // vocabulary is the right answer to that, and saying the true thing is
      // where the vocabulary was hiding.
      const dur = `Calls ${noun} for ${life}.`;
      switch (spec.summonRole) {
        case 'spell':
          return `${dur} It hangs back and throws ${el} at what you are fighting, for ${spec.summonDmg} damage every ${spec.summonInterval}s from up to ${spec.summonRange} away.`;
        case 'dot':
          return `${dur} Its bite festers: ${spec.summonDmg} damage every ${spec.summonInterval}s, and the wound keeps working after.`;
        case 'aura':
          return `${dur} It never strikes. Everything you do lands harder while it is beside you.`;
        case 'heal':
          return `${dur} It never strikes. It follows you and tends your wounds.`;
        default:
          return `${dur} It hunts on its own, striking for ${spec.summonDmg} damage every ${spec.summonInterval}s.`;
      }
    }
    case 'summonWeapon': {
      // ROUND 79 (bug 11) -- names the weapon when the socket knows it. "A
      // weapon of shadow" was the description that let a gauntlet name stand
      // beside it without contradiction; "a sword of shadow" does not.
      const what = spec.relicWeaponName ? spec.relicWeaponName.toLowerCase() : 'weapon';
      return spec.strikeDot
        ? `Conjures a ${what} of ${el}. It increases your weapon damage by ${pct(spec.weaponDmgPct)}%, and every strike with it leaves ${String(spec.strikeDot.label).toLowerCase()} in the wound.`
        : `Conjures a ${what} of ${el} that increases your weapon damage by ${pct(spec.weaponDmgPct)}%.`;
    }
    case 'summonArmor':
      return spec.thornsFrac
        ? `Conjures armour of ${el}. It blunts every blow you take and returns ${pct(spec.thornsFrac)}% of the damage to whoever dealt it.`
        : `Conjures armour of ${el} that blunts every blow you take.`;
    case 'summonGear':
      return spec.lifeOnKill
        ? `Conjures a trinket of ${el} that sharpens your killing strikes and returns ${spec.lifeOnKill} health for each kill.`
        : `Conjures a trinket of ${el} that sharpens your killing strikes.`;
    case 'fateReroll': {
      const what = {
        strike: 'a strike that missed', crit: 'a strike that failed to crit',
        dodge: 'a dodge that came up short', death: 'a killing blow taken',
      }[spec.rerollKind] || 'a failed roll';
      return spec.rerollKind === 'death'
        ? `Once its cooldown allows, a killing blow taken is refused outright and you are left standing.`
        : `Gives ${what} a ${pct(spec.rerollChance)}% chance to be rolled a second time.`;
    }
    case 'tauntPull':
      return `A challenge that pulls up to ${spec.tauntMax} enemies within ${spec.tauntRadius} onto you for ${secs(spec.tauntDuration)}.`;
    case 'stealthVeil':
      return `Veils you for ${secs(spec.stealthDuration)}. Enemies notice you far later, and the veil breaks the moment you attack.`;
    case 'rangeBuff':
      return `Extends the reach of everything you do for a short while.`;
    default:
      return `Channels ${el} into effect.`;
  }
}

// ---------------------------------------------------------------------------
// ROUND 48 -- NAME/MECHANIC AGREEMENT.
//
// "Ability names feel somewhat divorced from their effects... I'm currently
// seeing abilities and descriptions that feel more like mad libs."
//
// The cause was structural: pickAbilityName ran BEFORE the switch that rolls
// the mechanic, and drew from a coarse `sheetTypes` bucket in which eight
// different categories share ['Spell','Melee Attack','Ranged Attack']. A Venom
// name could and did land on a self-heal aura -- observed: "Aura of Paralysis"
// on "restores 2 HP every 1.2s". Names are now chosen AFTER the mechanic is
// known, and every authored candidate is checked against what the finished
// spec actually does.
// ---------------------------------------------------------------------------

/** Which concrete item each conjuring template hands over. */
const RELIC_SLOT_BY_TEMPLATE = {
  summonWeapon: 'weapon', summonArmor: 'armour', summonGear: 'trinket',
  summonBonded: 'creature',
};
/** What the FINISHED spec does. Everything below judges names against this. */
export function specTags(spec) {
  const aura = spec.template === 'aura';
  const heals = HEAL_TEMPLATES.includes(spec.template) || (aura && spec.auraEffect === 'regen')
    || !!spec.healOnUse || !!spec.leech || !!spec.lifeOnKill;
  const damages = spec.category === 'attack' || (aura && spec.auraEffect === 'damage')
    || (typeof spec.base === 'number' && spec.base > 0) || !!spec.dot
    || !!(spec.effect && spec.effect.kind === 'boltNearest')
    || spec.template === 'thornsBuff' || spec.template === 'summonBonded';
  // OFFENSIVE is wider than DAMAGES on purpose. A harm word over "+100% crit
  // chance on your next strike" is not the failure the user reported -- that
  // ability is entirely about hurting things, it just does not carry the damage
  // figure itself. The failure was a harm word over "restores 2 HP every 1.2s".
  const offensive = damages || spec.template === 'imbueStrike' || spec.template === 'weaponAffinity'
    || spec.template === 'triggeredPassive' || spec.template === 'sunderStrike'
    || spec.template === 'confuseTurn' || spec.template === 'weakenRing'
    || typeof spec.powerMult === 'number' || typeof spec.critChanceBonus === 'number'
    || !!spec.openerCrit || !!spec.chain || !!spec.bindOnHit
    || ((spec.template === 'passiveBuff' || spec.template === 'passiveConditional')
      && (spec.buffKind === 'dmg' || spec.buffKind === 'crit' || spec.bonusKind === 'dmg'));
  return {
    aura, heals, damages, offensive,
    projectile: spec.template === 'projectileBall',
    defensive: spec.category === 'defensive' || spec.template === 'immunityBuff'
      || spec.template === 'summonArmor' || !!spec.resist || (spec.armorBonus > 0)
      || (spec.template === 'passiveBuff' && spec.buffKind === 'armor'),
    movement: spec.category === 'movement' || !!spec.hasteOnUse || !!spec.blinkOnUse,
    summon: /^summon/.test(spec.template),
    perception: spec.template === 'perception',
    weapon: spec.template === 'weaponAffinity',
    confuse: !!spec.confuse || spec.template === 'confuseTurn',
    fate: !!spec.reroll || spec.template === 'fateReroll',
    // ROUND 49 -- reads BOTH the dedicated template and the lever's rider,
    // because a name is being judged against what the finished spec DOES and an
    // armour buff that also pulls the pack does the taunting thing too.
    taunt: spec.template === TAUNT_TEMPLATE || !!spec.taunt || typeof spec.tauntRadius === 'number',
    // ROUND 79 (bug 11) -- what this ability puts in the player's hands, when
    // it puts anything there. 'creature' is included because the same nonsense
    // reaches the bonded familiar from the same sheet bucket: the shipped
    // signature list held "Summon Gauntlets of the Wolf" on a creature summon.
    relic: RELIC_SLOT_BY_TEMPLATE[spec.template] || null,
    // The specific weapon this ability is ABOUT, when it is about one. Both
    // templates that name a weapon feed it: the affinity (which has said
    // "Long practice with the sword" since round 74) and round 79's conjured
    // relic. Measured on the affinity alone, 44 of 9,472 named a different
    // weapon than the one their own description was about.
    relicWeapon: spec.relicWeaponId
      || (spec.template === 'weaponAffinity' ? spec.weaponId : null) || null,
  };
}

// A name that says one of these has to be describing a spec that does it.
const NAME_REQUIRES = [
  { re: /\b(heal|healing|heals|mend|mending|renew|renewal|restor\w*|regenerat\w*|regen|balm|salve|cure|convalescen\w*|remedy|soothing|succour|succor|rejuvenat\w*|revitalis\w*|revitaliz\w*)\b/i, need: 'heals' },
  { re: /\b(bolt|shot|arrow|ray|lance|missile|javelin|dart|volley|barrage|quarrel)\b/i, need: 'projectile' },
  { re: /\b(aura|nimbus|corona|halo|presence|resonance|emanation)\b/i, need: 'aura' },
  { re: /\b(step|stride|dash|blink|warp|sprint|gait|quickstep|homestep|gateway|recall|teleport\w*|footwork)\b/i, need: 'movement' },
  { re: /\b(summon|summoned|conjur\w*|familiar|companion|bonded|relic|talisman|insignia|regalia|signet|vestments?|effigy)\b/i, need: 'summon' },
  { re: /\b(sight|eye|eyes|vision|perception|awareness|gaze|farsight|scrying)\b/i, need: 'perception' },
  { re: /\b(shield|aegis|bulwark|barrier|wardglass|carapace|ironhide|plating|bastion|armou?r|invulnerab\w*)\b/i, need: 'defensive' },
];
// ROUND 49 -- the taunt vocabulary, used ONLY to RANK names (see
// positiveNameRe), never to reject one. It is deliberately not a NAME_REQUIRES
// rule: "roar", "cry" and "challenge" are ordinary words for an attack ("Lion's
// Roar", "War Cry"), and a rejection rule built on them would strike out
// perfectly good authored names across the whole catalog to protect one
// category. Preferring them on a taunt costs nothing and takes nothing away.
const NAME_TAUNT_RE = /\b(taunt\w*|roar|bellow|challeng\w*|provoc\w*|provoke\w*|goad|dare|jeer|scorn|rally\w*|beckon\w*|shout|cry|call\w*|insult\w*|bait)\b/i;
// A name that says one of these has to be describing a spec that HARMS.
const NAME_HARM_RE = /\b(bolt|blast|strike|slash|sunder|rend\w*|wound\w*|slay\w*|kill\w*|death|deathspark|doom|venom\w*|toxic|toxin|blight\w*|plague|rot|paralys\w*|paralyz\w*|curse|cursed|hex|malediction|malefic\w*|torment|agony|shatter\w*|scorch\w*|impal\w*|maim|reap\w*|reaping|carnage|butcher\w*|annihilat\w*|devastat\w*|ruin|corros\w*|corrupt\w*|fester\w*|smite|detonat\w*|eruption|nova|shockwave|cull|execution|massacre|slaughter|razor|fang|talon|barbed|spines?)\b/i;

// ============================================================================
// ROUND 79 (bug 11) -- THE ITEM A NAME PROMISES.
//
//   "Ability 'Summon Gauntlets of Blades' / Sword x Awakening Stone of
//    Gathering / Conjures the drawn blade in a shape that has an edge on it.
//    The name is nonsensical, it's a sword, not gauntlets."
//
// The three relic categories have carried a `sheetFilter` since round 59 that
// looks right -- summon_weapon filters to /sword|blade|axe|spear|.../ and
// summon_gear to /gauntlet|boot|ring|.../ -- and it let this through anyway,
// because a regex `.test()` asks whether the weapon word is ANYWHERE in the
// string. "Summon Gauntlets of Blades" holds "Blades", so it passed the weapon
// filter while promising armour. Same failure the other way: summon_gear's own
// filter accepted "Sigil Dagger".
//
// English decides this for us. In "<X> of <Y>" the head is X -- gauntlets of
// blades are gauntlets. So the item a name PROMISES is the FIRST item noun in
// it, and that is the one the mechanic has to deliver. Measured before the
// fix: of 37,888 generated relic abilities, 13,001 named an item and 2,188 of
// those -- 17% -- named the wrong kind.
//
// Three slots, and the game's own three descriptions decide them rather than a
// taxonomy invented here: summonWeapon "conjures a weapon", summonArmor
// "conjures armour ... it blunts every blow you take", summonGear "conjures a
// trinket". So anything WORN is armour -- a helmet and a gauntlet blunt blows,
// whatever bucket a spreadsheet filed them under -- and only what is CARRIED is
// a trinket. Splitting them the other way would have left "Summon Helmet of
// Thunder" standing over "conjures a trinket", which is the same sentence the
// bug is about with a different noun in it.
const RELIC_ITEM_CLASSES = [
  ['weapon', /\b(sword|greatsword|longsword|broadsword|sabre|saber|blades?|dagger|dirk|stiletto|knife|kris|axe|hatchet|cleaver|hammer|maul|mace|club|spear|lance|pike|javelin|glaive|halberd|trident|scythe|sickle|whip|lash|flail|chain|bow|longbow|crossbow|staff|stave|quarterstaff|sceptre|scepter)\b/i],
  ['armour', /\b(breastplate|cuirass|hauberk|greaves|sabatons|pauldrons?|vambraces?|carapace|plate|mail|shield|buckler|aegis|gauntlets?|gloves?|boots?|helmet|helm|coif|bracers?|vestments?|robes?|mantle|cloak)\b/i],
  ['trinket', /\b(ring|amulet|pendant|charm|talisman|torc|circlet|crown|diadem|brooch|locket|signet|insignia|regalia|trinket|idol)\b/i],
];
/** The concrete item a name promises, or null when it names none. The first
 *  match wins because the first item noun is the head of the phrase. */
export function namedRelicItem(name) {
  let best = null;
  for (const [cls, re] of RELIC_ITEM_CLASSES) {
    const m = re.exec(String(name || ''));
    if (m && (!best || m.index < best.index)) best = { cls, index: m.index, word: m[0] };
  }
  return best;
}
// Which WEAPON a name promises, when it promises a specific one. Generic
// edged words (blade, edge) are deliberately absent: they fit a sword, a
// dagger and a scythe alike, and refusing "Blade Ward" on a conjured dagger
// would cost good names to buy nothing.
const RELIC_WEAPON_NOUNS = [
  [/\b(sword|greatsword|longsword|broadsword|sabre|saber)\b/i, ['sword']],
  [/\b(dagger|dirk|stiletto|knife|kris)\b/i, ['dagger']],
  [/\b(axe|hatchet|cleaver)\b/i, ['axe']],
  [/\b(hammer|maul|mace|club)\b/i, ['hammer']],
  [/\b(spear|lance|pike|javelin|glaive|halberd|trident)\b/i, ['spear', 'javelin']],
  [/\b(scythe|sickle)\b/i, ['scythe']],
  [/\b(whip|lash|flail|chain)\b/i, ['whip']],
  [/\b(bow|longbow|crossbow)\b/i, ['bow', 'crossbow']],
  [/\b(staff|stave|quarterstaff|sceptre|scepter)\b/i, ['staff']],
];
/** True when the name promises a weapon that is NOT the one the spec conjures.
 *  Silent when the name names no specific weapon, or the spec names none. */
function namePromisesWrongWeapon(name, weaponId) {
  if (!weaponId) return false;
  for (const [re, ids] of RELIC_WEAPON_NOUNS) {
    if (re.test(name)) return !ids.includes(weaponId);
  }
  return false;
}

/** True when an authored name says something the finished mechanic does not do.
 *  This is a REJECTION test, not a scoring one -- a name that contradicts the
 *  mechanic is never the least-bad option, because the row it produces reads as
 *  a bug ("Aura of Paralysis: restores 2 HP every 1.2s"). */
export function nameContradictsSpec(name, tags, identityWords) {
  // A word that IS the essence's or the stone's own name is identity, not a
  // mechanical claim. An Awakening Stone of Ruin granting "Ruin Vigil", or an
  // Eye essence granting "Eye of Judgement", is the naming working correctly --
  // rejecting those leaves the generator with no legal name at all for those
  // sockets and pushes it onto the ungated fallback, which is strictly worse.
  let n = normApos(name);
  for (const w of (identityWords || [])) {
    if (w && String(w).length > 2) n = n.replace(new RegExp(String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ');
  }
  for (const rule of NAME_REQUIRES) {
    if (rule.re.test(n) && !tags[rule.need]) return true;
  }
  if (NAME_HARM_RE.test(n) && !tags.offensive && !tags.confuse) return true;
  // ROUND 79 (bug 11) -- the item the name promises must be the item the
  // ability delivers. Only relic and creature summons are judged: a name is
  // allowed to be flavoured after a weapon when nothing is being conjured at
  // all ("Blade Dance" on a Sword essence's attack is the naming rule working,
  // not failing), so this deliberately stays silent on every other template.
  if (tags.relic) {
    const item = namedRelicItem(n);
    if (item) {
      // A creature summon may still be named for a blade -- a bonded spirit
      // that takes the shape of one is a thing this setting does. Armour and
      // accessories are not creatures under any reading.
      if (tags.relic === 'creature') { if (item.cls !== 'weapon') return true; }
      else if (item.cls !== tags.relic) return true;
    }
  }
  // A name may not promise one weapon over a description about another --
  // "Carving Knife Closing: long practice with the sword".
  if ((tags.weapon || tags.relic === 'weapon') && namePromisesWrongWeapon(n, tags.relicWeapon)) return true;
  return false;
}

/** The vocabulary a name for THIS spec would ideally carry. Used to rank the
 *  surviving candidates, never to reject one. */
function positiveNameRe(tags) {
  // ROUND 49 -- ahead of the generic defensive preference on purpose. A
  // tauntPull is category:'defensive', so without this the ranking would reach
  // for "Aegis" and "Bulwark" over "Challenging Roar" on the one ability in the
  // kit whose whole point is that it makes a noise.
  if (tags.taunt) return NAME_TAUNT_RE;
  if (tags.perception) return NAME_REQUIRES[5].re;
  if (tags.summon) return NAME_REQUIRES[4].re;
  if (tags.heals && !tags.damages) return NAME_REQUIRES[0].re;
  if (tags.aura) return NAME_REQUIRES[2].re;
  if (tags.movement && !tags.damages) return NAME_REQUIRES[3].re;
  if (tags.defensive && !tags.damages) return NAME_REQUIRES[6].re;
  return null;
}

/**
 * ROUND 48 -- a name built out of the ESSENCE and the STONE when nothing
 * authored fits the mechanic.
 *
 * This is what makes the user's own four examples reachable. Ape's motif gives
 * parts (fur, arms, fists, troop) and adjectives (thick, long, brute); a fire
 * stone gives the material (fire, burning); the lever picked for the rolled
 * mechanic chooses the shape. ward -> "Thick Fur". reach -> "Ape Arms".
 * chain -> "Ape Makes Fire". allies -> "Apes Together".
 */
export function composeAbilityName(spec, essDef, stone, roll, usedNames, tags) {
  // ROUND 53 -- effectiveMotif, not motifForEssence. This returned null for the
  // confluence, so the composed tier declined and naming fell through to the
  // synthetic bank, which builds from the STONE. That is how a Dragon
  // confluence shipped abilities called "Feeble Culmination" and "Frog
  // Betrayal" -- named after whichever stone was socketed, with the confluence
  // that owns the slot not mentioned anywhere in its own name.
  const motif = effectiveMotif(essDef, null);
  if (!motif) return null;
  const mat = materialFor(stone, essDef);
  const ess = essDef.name || 'Essence';
  const identity = [stone && stone.word, ess].filter(Boolean);
  const N = cap(mat.noun), MA = cap(mat.adj);
  const lever = spec.lever;
  const start = roll('cname', 31);
  const nParts = motif.parts.length, nAdjs = motif.adjs.length, nVerbs = motif.verbs.length;
  const rounds = Math.max(nParts, nAdjs, nVerbs);
  // ROUND 53 -- a NAME title-cases every word, not just the first. `cap` is
  // right for a sentence and wrong here: motif parts are often two words
  // ("long tail", "opening move", "swallowed light"), and capitalising only
  // the first produced "Twice-Asked Long tail" and "Wrong noon Elsewhere".
  // Invisible until the confluences started naming themselves this round,
  // because the essence motifs that fed this path happened to be single words.
  const title = (w) => String(w || '').split(' ')
    .map(x => x ? x[0].toUpperCase() + x.slice(1) : x).join(' ');
  for (let i = 0; i < rounds; i++) {
    const p = title(motif.parts[(start + i) % nParts]);
    const a = title(motif.adjs[(start + i) % nAdjs]);
    const v = title(motif.verbs[(start + i) % nVerbs]);
    const byLever = {
      allies: [`${ess}s Together`, `Company of ${N}`, `Shared ${p}`, `${a} Company`],
      reach: [`${ess} ${p}`, `Long ${p}`, `Far ${N}`, `${p} at Length`],
      ward: [`${a} ${p}`, `${p} of ${N}`, `${MA} ${p}`],
      chain: [`${ess} Makes ${N}`, `Leaping ${N}`, `${p} and ${N}`],
      linger: [`${MA} ${p}`, `${p} That Stay`, `Slow ${N}`],
      // ROUND 63 -- `All at Once` was a LITERAL in an otherwise-composed bank:
      // no substitution, so every burst ability reaching this rotation got the
      // identical string. 140 of 24,000 abilities were called it -- the single
      // most repeated name in the game, and repeated for a reason no amount of
      // essence or stone variety could break.
      burst: [`${p} All at Once`, `${a} ${N}`, `${p} Spent`, `${ess} Unspent`, `${a} ${p} at Once`],
      swift: [`${a} ${p}`, `${p} First`, `Quick ${N}`],
      raw: [`${a} ${p}`, `${p} of ${N}`, `${ess} ${v}`],
      mend: [`${p} Closing`, `${a} ${p}`, `${N} That Knits`],
      siphon: [`Hungering ${p}`, `${p} That Takes`, `${a} Thirst`],
      stalk: [`Waiting ${p}`, `${a} Patience`, `${p} in the Dark`],
      bind: [`Clinging ${N}`, `${a} ${p}`, `${p} Underfoot`],
      call: [`${ess} Calls`, `${a} ${p}`, `${p} Answering`],
      shift: [`${p} Elsewhere`, `${a} ${p}`, `${N} Sidestep`],
      turn: [`${ess} Sows ${N}`, `Turncoat ${p}`, `${a} Discord`],
      fate: [`Twice-Asked ${p}`, `${a} Fortune`, `${p} Again`],
      // ROUND 49 -- without this entry a taunt fell through to the generic
      // `${a} ${p}` shapes and came out as "Stubborn Anchor": a fine name for
      // an armour buff and one that says nothing about the ability making a
      // noise. Every shape here is a thing that CALLS -- which is what makes
      // the composed name reachable for the case the sheet cannot serve.
      taunt: [`${ess} Bellows`, `${a} Challenge`, `Roar of ${N}`, `${p} They Answer`, `Come and Take My ${N}`],
    }[lever] || [];
    // What the ability DOES steers the shape too, not only the lever: a name
    // for something that hits wants an action or a material in it, and "Ape
    // Hide" over "6 dmg at 188 range" is the same divorce in miniature.
    const byTag = tags && tags.damages ? [`${ess} ${v}`, `${p} of ${N}`, `${MA} ${p}`]
      : tags && tags.heals ? [`${a} ${p}`, `${p} Closing`, `${N} That Knits`]
        : [];
    const shapes = tags && tags.damages
      ? [...byTag, ...byLever, `${a} ${p}`, `${ess} ${p}`, `${MA} ${p}`]
      : [...byLever, ...byTag, `${a} ${p}`, `${ess} ${p}`, `${p} of ${N}`, `${MA} ${p}`];
    for (const s of shapes) {
      if (!usedNames.has(s) && !nameContradictsSpec(s, tags, identity)) return s;
    }
  }
  return null;
}

/**
 * ROUND 63 -- CLEANING THE AUTHORED SHEET ON THE WAY OUT.
 *
 * skillNames.js carries 7,307 authored names, and 215 of them begin with the
 * literal word "Passive" -- "Passive Hair of Shadows", "Passive Quickened
 * Blood". That is a spreadsheet column leaking into the game: the row was filed
 * under a passive bucket and the label came with it. "Passive Hair of Shadows"
 * was the third most repeated name in the game at 105 of 24,000, and it reads
 * as a database field, which is the exact objection round 16 answered when it
 * stopped minting "Rune Dark Iron Skin".
 *
 * 1,093 more are mid-sentence lowercase ("Blessing of readiness"), which is a
 * title that was typed as a sentence.
 *
 * Fixed here rather than in the data so the sheet stays the artist's file and
 * one function owns the presentation.
 */
const NAME_SMALL_WORDS = new Set(['of', 'the', 'and', 'in', 'at', 'to', 'a', 'on', 'for', 'from']);
function cleanSheetName(n) {
  let out = String(n || '').replace(/^Passive\s+/i, '').trim();
  out = out.split(' ').map((w, i) => {
    if (!w) return w;
    if (i > 0 && NAME_SMALL_WORDS.has(w.toLowerCase())) return w.toLowerCase();
    return w[0].toUpperCase() + w.slice(1);
  }).join(' ');
  return out || String(n || '');
}

/**
 * ROUND 77 -- the category's own AUTHORED name bank, or null.
 *
 * `attr_boost` has walked its bank by hand since round 6 and it is the only
 * category that does; every other one goes through `pickAbilityName`, which
 * composes from the sheet, the motif and the stone. That is right for the 46
 * categories whose flavour comes from what they are bonded to, and wrong for
 * the handful whose mechanic IS their identity.
 *
 * Measured on the first draft of items 6.1 and 6.3, which did not do this:
 * "Other Other Body", "Unfixed Other Body", "Raw Element Inheritance" -- 250
 * distinct names across the two, and not one of them said anything about
 * holding a scythe one-handed or walking on water. The user's rule is that the
 * name carries the flavour and the description states the mechanic; a
 * generated name that names neither fails both halves.
 *
 * Walks the bank from a seeded offset so two sockets in one kit cannot collide,
 * and returns null when the bank is exhausted so the caller falls through to
 * the generator rather than shipping nothing.
 */
function pickAuthoredName(cat, comboSeed, usedNames, salt) {
  const bank = (cat && cat.names) || [];
  if (!bank.length) return null;
  const start = stableHash(comboSeed + salt);
  for (let i = 0; i < bank.length; i++) {
    const n = bank[(start + i) % bank.length];
    if (!usedNames.has(n)) return n;
  }
  return null;
}

function pickAbilityName(cat, essDef, stoneId, comboSeed, usedNames, spec, roll) {
  const tags = spec ? specTags(spec) : null;
  const stone = STONE_THEMES[stoneId];
  const identity = [stone && stone.word, essDef && essDef.name].filter(Boolean);
  const ok = (n) => !tags || !nameContradictsSpec(n, tags, identity);
  const sheet = SHEET_SKILLS[essDef.name];
  if (sheet && cat.sheetTypes && cat.sheetTypes.length) {
    // ROUND 63 -- cleaned AS READ, not at the returns.
    //
    // The first version cleaned at each return site, which meant the filters
    // above still tested raw strings while the shipped name was the cleaned
    // one -- so "Passive Wing Agility" and "Wing Agility" collapsed to the same
    // name and a kit could hold both. Normalising the candidate list once means
    // the dedupe, the vocabulary gate and the pick all see the same strings.
    const candidates = [];
    for (const t of cat.sheetTypes) {
      for (const n of (sheet[t] || [])) candidates.push(cleanSheetName(n));
    }
    // ROUND 16 -- a name that belongs to a SIGNATURE pool is reserved for
    // it, even when the sheet also lists it. Otherwise the sheet tier could
    // hand "Dragon's Breath" to a plain bolt attack (the sheet files it
    // under Melee Attack) while the authored entry files it as a cone --
    // and the row would read "Dragon's Breath: hurls a bolt of the drawn
    // blade at the target."
    //
    // ROUND 17 -- the reservation is now GLOBAL rather than per-essence.
    // With 146 pools instead of 5, a name owned by the Renewal pool was
    // being handed out by the sheet tier on a Void slot, so the same
    // ability name shipped with two different descriptions.
    // ROUND 48 -- `ok` is the new gate. The sheet buckets are coarse (eight
    // categories share ['Spell','Melee Attack','Ranged Attack']), so this is
    // where a Venom name used to land on a self-heal aura. A candidate whose
    // words contradict the finished mechanic is dropped outright.
    // ROUND 63 -- dedupe on the CLEANED name, because that is the one that
    // ships. Cleaning collapsed "Passive Wing Agility" and "Wing Agility" onto
    // the same string, so a kit that already held one could still draw the
    // other and print the same name twice -- caught by the suite at 3 per 900
    // kits, immediately after the cleaning went in.
    let unused = candidates.filter(n =>
      !usedNames.has(n) && !isReservedSignatureName(n)
      && !isPlaceholderSheetName(n, essDef.name) && ok(n));
    // ROUND 59 -- THE FILTER IS A GATE, NOT A FALLBACK.
    //
    // The note further down has always said a filtered category "should NOT
    // grab an arbitrary off-flavor sheet name", and that was the intent -- but
    // the filter was consulted only AFTER the positive-match and stone-word
    // tiers, so either of those could hand a filtered category a name from
    // outside its own vocabulary before the filter was ever reached.
    //
    // Round 59 caught it on the new active summons: a creature summon came out
    // named "Blazing Shield" because the stone-word tier matched first. It has
    // been doing the same to perception, taunt, stealth, fate, the four
    // triggered families and the bonded familiar since round 48.
    //
    // Gating first means the three preference tiers now choose WITHIN the
    // category's own vocabulary, and an empty result drops to the authored
    // `names:` bank exactly as the note intended.
    if (cat.sheetFilter) {
      const inVocab = unused.filter(n => cat.sheetFilter.test(n));
      unused = inVocab;
    }
    // ROUND 63 -- A THIN BUCKET MUST NOT BECOME A MONOCULTURE.
    //
    // Measured: 48% of the sheet's 2,136 essence x bucket pairs hold two names
    // or fewer, and 267 hold exactly ONE. Ambush/Melee Attack holds only
    // "Ambush Strike", so every melee-shaped category on an Ambush essence got
    // that string -- 125 of 24,000 abilities, the most repeated name in the
    // game, and no amount of widening the later tiers could touch it because
    // the sheet tier wins first and always had something.
    //
    // So a thin bucket now yields part of the time instead of all of it: with
    // one name it holds a quarter of its combos, with two a half, and the rest
    // fall through to the composed tier, which builds from this essence's motif
    // and this stone's material and is different for every pair. The authored
    // name stays reachable -- it is good writing and it should appear -- it
    // just stops being the only answer.
    if (unused.length) {
      const start = stableHash(comboSeed + cat.key);
      const probe = (list) => list.length ? list[start % list.length] : null;
      // ROUND 48 -- a name that AGREES with the mechanic outranks one that
      // merely carries the stone's word: "Aura of Renewal" on a regen aura is
      // a better row than "Frost Cut" on the same aura, whatever stone it came
      // from. The stone-word preference is kept, one tier down.
      const posRe = tags ? positiveNameRe(tags) : null;
      const positive = posRe ? unused.filter(n => posRe.test(n)) : [];
      const stoneWordRe = stone ? new RegExp(stone.word, 'i') : null;
      const stoneMatched = stoneWordRe ? unused.filter(n => stoneWordRe.test(n)) : [];
      // The pool is already gated to the category's vocabulary above, so
      // whatever is left is on-flavour and the ordinary pick applies.
      const chosen = positive.length ? positive : stoneMatched.length ? stoneMatched : unused;
      // ROUND 63 -- A THIN RESULT MUST NOT BECOME A MONOCULTURE.
      //
      // Measured: 48% of the sheet's 2,136 essence x bucket pairs hold two
      // names or fewer and 267 hold exactly one. But the first version of this
      // gate tested the POOL, and that was the wrong list: "Ambush Strike" kept
      // its 125 occurrences because the pool was large and the *preference*
      // filter narrowed to one -- it is the only name in the pool that reads as
      // a strike, so every damaging category on an Ambush essence chose it.
      //
      // What matters is the size of the list actually being picked FROM. With
      // one candidate it holds a quarter of its combos, with two a half, and
      // the rest fall through to the composed tier, which builds from this
      // essence's motif and this stone's material and differs for every pair.
      // The authored name stays reachable; it stops being the only answer.
      const thin = chosen.length <= 2
        && (stableHash(`${comboSeed}|thin|${cat.key}`) % 4) >= chosen.length;
      if (!thin) return probe(chosen);
    }
  }
  // ROUND 16 -- second tier: this ESSENCE's own signature names
  // (essenceAbilities.js). The sheet is thin for some essences (Dark has
  // five rows total), and when it ran dry the old code dropped straight to
  // the synthetic bank, which produced exactly what the user asked us to
  // stop producing -- names that are just the stone word plus the essence
  // word ("Rune Dark Iron Skin", "Moon Dark's Grace"). A signature name of
  // the SAME category is a real, authored, on-theme name, so it is tried
  // before any synthetic construction. Exact category first, then any
  // signature of the same kind.
  // EXACT category matches only. A near-match would lend a name whose
  // authored flavor no longer describes the mechanic it landed on
  // ("Nightblade" on a set of conjured armor), and generateCategoryAbility
  // adopts the entry's flavor text along with its name -- so the name and
  // the description have to be describing the same thing.
  const sigList = signaturesFor(essDef);
  if (sigList.length) {
    const exact = sigList.map(e => ({ ...e, name: cleanSheetName(e.name) }))
      .filter(e => e.catKey === cat.key && !usedNames.has(e.name) && ok(e.name))
      .map(e => e.name);
    if (exact.length) return exact[stableHash(comboSeed + '|signame' + cat.key) % exact.length];
  }

  // ROUND 48 -- THIRD tier, and the one the user's examples live in: a name
  // composed from the ESSENCE's own parts and adjectives and the STONE's
  // material. This is what "Thick Fur" and "Ape Arms" are -- names that could
  // not exist while the only construction available was "<stone word> +
  // <category template>". It sits ahead of the synthetic bank because the bank
  // is generic by construction: every essence in the game gets the same four
  // strings with a different word substituted, which is the mad-libs the user
  // named. A composed name is specific to this essence and this stone.
  //
  // ROUND 59 -- `namesAreNouns` opts a category OUT of the composed tier.
  //
  // The composed name is built from the essence's parts and the stone's
  // material, and it is the right answer for an ability that DOES something --
  // "Thick Fur", "Ape Arms". It is the wrong answer for one that puts a THING
  // in the world: the first active summons came out called "Pulse Closing" and
  // "Heavy Grip", which are perfectly good flavour and tell a player looking at
  // their hotbar nothing about the fact that a creature is about to appear.
  //
  // Only the summon categories set it. Everything else keeps the composed tier,
  // which is where the user's own examples live.
  if (spec && roll && !cat.namesAreNouns) {
    // Salted with the category, or every candidate in a socket would start from
    // the same part and the pool would fill with one composed name that the
    // dedupe then throws away eleven times.
    const nameRoll = (s, n) => roll(`${cat.key}|name|${s}`, n);
    const composed = composeAbilityName(spec, essDef, stone, nameRoll, usedNames, tags);
    if (composed) return composed;
  }

  // Last resort: the round-5 synthetic bank. ROUND 16 -- the substituted
  // label is now the STONE'S theme word ALONE, not "<stone> <essence>":
  // the roster already prints "Fire × Awakening Stone of Rune" directly
  // above the name, so folding the essence word into the name itself only
  // ever produced the three-word mush the user objected to. "Rune Iron
  // Skin" reads as a name; "Rune Dark Iron Skin" reads as a database key.
  // ROUND 63 -- the bank substitutes SEVERAL labels, not one.
  //
  // It used to be `cat.names` x the stone word alone, so a category with four
  // templates had exactly four names available per stone -- and for a category
  // the sheet does not serve at all (attr_boost declares `sheetTypes: []`)
  // that was the whole name space. Measured: 27 distinct names across 327
  // attr_boost abilities, 8.3% unique, the worst in the game.
  //
  // Which label leads is ROTATED by the seed rather than fixed on the stone.
  //
  // Keeping the stone word permanently first was still a monoculture: it is
  // always available, so it always won, and the alternates were only ever
  // reached once it was taken. That is where the real repeats lived --
  // "Ambush Strike", "Fortress Bulwark", "Arsenal Strike" are all
  // `{A} <noun>` on a stone word, and "Ambush Strike" was the most repeated
  // name in the game at 125 of 24,000.
  //
  // (It also took a wrong turn to find: the sheet has an `Ambush` bucket, so
  // the obvious reading was that the sheet tier was serving it. There is no
  // essence named Ambush -- that bucket is orphaned data the lookup can never
  // reach -- and the name was coming from the synthetic bank the whole time.)
  //
  // Round 16 chose the stone word for a real reason and it stays in the mix,
  // but the roster already prints "Fire x Awakening Stone of Rune" directly
  // above the name, so the name repeating the stone is the least informative
  // of the four options, not the most.
  const mat = materialFor(stoneId, essDef);
  const labels = [];
  if (stone && stone.word) labels.push(stone.word);
  if (essDef && essDef.name) labels.push(essDef.name);
  if (mat && mat.noun) labels.push(cap(mat.noun));
  if (mat && mat.adj) labels.push(cap(mat.adj));
  if (!labels.length) labels.push('Sparkstone');
  const lead = stableHash(`${comboSeed}|lead|${cat.key}`) % labels.length;
  const rotated = labels.slice(lead).concat(labels.slice(0, lead));
  labels.length = 0; labels.push(...rotated);
  const spin = stableHash(comboSeed + cat.key);
  const synth = [];
  for (let L = 0; L < labels.length; L++) {
    for (let i = 0; i < cat.names.length; i++) {
      synth.push(cat.names[(spin + i) % cat.names.length].replace(/\{A\}/g, labels[L]));
    }
  }
  for (const candidate of synth) if (!usedNames.has(candidate) && ok(candidate)) return candidate;
  for (const candidate of synth) if (!usedNames.has(candidate)) return candidate;
  return `${labels[0]} ${cat.key}`;
}

// Generates one concrete ability spec for a category + essence + stone.
export function generateCategoryAbility(catKey, essDef, stoneId, comboSeed, usedNames, opts = {}) {
  // ROUND 52 -- NAMES THE CALLER HAS ALREADY SPENT IN THIS POOL.
  //
  // This one line is the whole reason heal-over-time abilities did not exist.
  // The resolver avoided `usedNames` (the kit) but had no idea which names the
  // pool it was currently filling had already taken, and the sheet buckets are
  // coarse: `self_active_heal` and `self_active_hot` both declare
  // sheetTypes ['Healing'], so on a healer they drew the SAME sheet name and
  // tryCat threw the second one away as a duplicate. Measured on Renewal
  // before this: self_active_hot was probed 393 times across 180 stones and
  // accepted 0 times. The healer's own heal-over-time was structurally
  // unreachable, which is a naming bug wearing a game-design bug's clothes --
  // and the `linger` lever was only ever the second half of the story.
  //
  // Safe to fold into `usedNames` here because this function only ever READS
  // it; the kit builder is what adds to the real set once a candidate is
  // actually taken.
  if (opts.avoidNames && opts.avoidNames.size) {
    usedNames = new Set([...usedNames, ...opts.avoidNames]);
  }
  const cat = ABILITY_CATEGORY_BY_KEY[catKey];
  const stone = STONE_THEMES[stoneId];
  const color = stone ? stone.color : essDef.color;
  const roll = (salt, n) => stableHash(comboSeed + '|' + salt) % n;
  const essBase = essDef.base || 6;
  const comboBase = Math.round(essBase * 0.65 + (6 + roll('stonebase', 4)) * 0.65);
  // ROUND 9 fix: clamp the essence's cooldown contribution -- a long-
  // cooldown BUFF innate (Might's 5-minute surge, round 6) must not bleed
  // 3-minute cooldowns into every attack generated on its slot. Attacks
  // derive from at most a 3s essence rhythm.
  const comboCooldown = (Math.min(essDef.cooldown || 1, 3) + 1.0) / 2;

  let name;
  if (cat.key === 'attr_boost') {
    // Authored bank keyed to the slot's bound attribute (the user's own
    // "Strength of Atlas" / "Gaia's Fountain" examples live here).
    const attr = opts.slotAttr || ['power', 'spirit', 'speed', 'recovery'][roll('battr', 4)];
    const bank = ATTR_BOOST_NAMES[attr];
    name = null;
    for (let i = 0; i < bank.length; i++) {
      const candidate = bank[(stableHash(comboSeed + 'attrboost') + i) % bank.length];
      if (!usedNames.has(candidate)) { name = candidate; break; }
    }
    const spec0 = {
      name: 'x', kind: 'passive', category: cat.category, template: 'attrBoost', color, catKey, stoneId, essenceId: essDef.id,
      attr, element: materialFor(stone, essDef).element, lever: null,
      desc: `Deepens the bond with the ${ATTR_LABEL_LOCAL[attr]} attribute itself, growing with every rank attained.`,
    };
    // ROUND 48 -- attr_boost's mechanic is fixed by design (+1 per rank, the
    // user's own "Strength of Atlas" pattern), so it takes no lever twist. Its
    // DESCRIPTION was still one sentence shared by all 146 essences, which is
    // the same fixed-sentence problem, so that at least is composed.
    const motifAB = effectiveMotif(essDef, null);   // ROUND 53
    if (motifAB) {
      const partAB = motifAB.parts[roll('abpart', motifAB.parts.length)];
      spec0.desc = `${cap(motifAB.body)} -- and it does not stop at the ${partAB}: your bond with ${ATTR_LABEL_LOCAL[attr]} itself is one point deeper, and it goes on deepening in other ways as you rank.`;
    }
    // ROUND 77 (item 6.2) -- the riders ride on the SPEC, so the description,
    // the stats line and the runtime all read one list. They are the whole
    // table rather than the ones live at the player's current rank: an ability
    // is a thing you own, and what it will do at Gold is part of what it is.
    // `attrRidersAt` filters at the point of use.
    spec0.riders = ATTR_RANK_RIDERS[attr] || [];
    spec0.raisesCap = 1;
    if (!name) name = pickAbilityName(cat, essDef, stoneId, comboSeed, usedNames, spec0, roll);
    spec0.name = name;
    spec0.rankAspects = rankAspectsFor(spec0);
    spec0.stats = statsLineFor(spec0);
    return spec0;
  }

  // ===== ROUND 77 (item 6.1) -- the one-handed two-hander ==================
  if (cat.key === 'two_hand_wield') {
    // WHAT IT FREES IS DERIVED, NOT LISTED. `canBeWieldedOneHanded` is round
    // 74's rule -- two-handed and not ranged -- and asking it about every
    // melee weapon means the answer stays right if a weapon's handedness ever
    // changes. Writing "hammer and scythe" here instead would be a second copy
    // of a fact that already has one home, which is this project's fault class
    // two and has bitten it in five separate tables.
    const frees = MELEE_ORDER.filter(w => canBeWieldedOneHanded(w));
    const specTH = {
      name: '', kind: 'passive', category: cat.category, template: 'twoHandWield',
      color, catKey, stoneId, essenceId: essDef.id,
      element: materialFor(stone, essDef).element, lever: null,
      frees, source: opts.heavyHandSource || 'essence',
      desc: '',
    };
    const motifTH = effectiveMotif(essDef, stone);
    const partTH = motifTH ? motifTH.parts[roll('thpart', motifTH.parts.length)] : 'arm';
    const list = frees.length === 2 ? `${frees[0]} or a ${frees[1]}` : frees.join(', ');
    specTH.desc = `The weight goes somewhere -- into the ${partTH}, into the stance, into whatever `
      + `${essDef.name} put in you. A ${list} that needs both hands from anyone else needs one from you, `
      + `and the other hand is free for a shield or a second weapon.`;
    specTH.name = pickAuthoredName(cat, comboSeed, usedNames, 'twohand')
      || pickAbilityName(cat, essDef, stoneId, comboSeed, usedNames, specTH, roll);
    specTH.rankAspects = rankAspectsFor(specTH);
    specTH.stats = statsLineFor(specTH);
    return specTH;
  }

  // ===== ROUND 77 (item 6.3) -- water walking =============================
  if (cat.key === 'water_walk') {
    const specWW = {
      name: '', kind: 'passive', category: cat.category, template: 'waterWalk',
      color, catKey, stoneId, essenceId: essDef.id,
      element: materialFor(stone, essDef).element, lever: null,
      riders: WATER_WALK_RIDERS, isMovement: true,
      source: opts.waterWalkSource || 'essence',
      desc: '',
    };
    const motifWW = effectiveMotif(essDef, stone);
    const partWW = motifWW ? motifWW.parts[roll('wwpart', motifWW.parts.length)] : 'sole';
    specWW.desc = `Water holds you the way ground does. It is the ${partWW} that learns it first, and `
      + `after that a lake is a field you have not crossed yet -- and the deeper you go into `
      + `${essDef.name}, the more standing on the water gives back.`;
    specWW.name = pickAuthoredName(cat, comboSeed, usedNames, 'waterwalk')
      || pickAbilityName(cat, essDef, stoneId, comboSeed, usedNames, specWW, roll);
    specWW.rankAspects = rankAspectsFor(specWW);
    specWW.stats = statsLineFor(specWW);
    return specWW;
  }

  const phrase = stone ? stone.phrase : 'raw essence';
  // ROUND 48 -- the spec is built and rolled FIRST; the name is chosen at the
  // bottom, once there is a mechanic for it to agree with. See pickAbilityName.
  const spec = { name: '', kind: cat.kind, category: cat.category, template: cat.template, color, catKey, stoneId, essenceId: essDef.id };
  switch (cat.template) {
    case 'projectileBall':
      spec.base = comboBase; spec.cooldown = Math.max(0.8, Math.round(comboCooldown * 10) / 10);
      spec.speed = 240 + roll('speed', 5) * 30; spec.radius = 5 + roll('radius', 4);
      if (cat.leech) {
        // ROUND 38 (6.3) -- the siphon: a share of the harm comes home.
        spec.leech = 0.35 + roll('leech', 16) / 100;
        spec.base = Math.max(3, Math.round(spec.base * 0.85));
        spec.desc = `A hungering bolt of ${phrase}; a share of the harm it does flows back to you as life.`;
      } else if (cat.wantsDot) {
        const label = (stone && stone.dot && stone.dot.label) || 'Blight';
        spec.dot = { dmgPerTick: 2 + roll('dotdmg', 3), ticks: 3 + roll('dotticks', 3), tickMs: 800, critChance: 0.1, label };
        spec.base = Math.max(3, Math.round(spec.base * 0.7));
        spec.desc = `A bolt of ${phrase} that leaves a lingering ${label.toLowerCase()} on the target.`;
      } else if (cat.explode) {
        spec.explodeRadius = 55 + roll('explode', 4) * 10;
        // ROUND 79 (bug 5) -- half the damage, half again as long to come
        // back, and the blast now hits EVERYTHING in it for that same figure
        // rather than the target for full and the neighbours for 60% of full.
        // One number on the card instead of two, and the trade it names is a
        // real one: fewer, softer hits spread wide.
        priceAsAoe(spec, comboBase, spec.cooldown);
        spec.splashFrac = 1;
        spec.desc = `A charge of ${phrase} that detonates on impact, striking everything nearby for the same.`;
      } else {
        spec.desc = `Hurls a bolt of ${phrase} at the target.`;
      }
      break;
    case 'barrierWall': {
      spec.wallKind = cat.wallKind || 'block';
      spec.wallLength = 130 + roll('walllen', 5) * 20;
      spec.wallDuration = 5 + roll('walldur', 5);
      spec.wallThickness = 26 + roll('wallthk', 3) * 4;
      spec.cooldown = Math.max(9, Math.round((comboCooldown + 10) * 10) / 10);
      if (spec.wallKind === 'burn') spec.base = Math.max(2, Math.round(comboBase * 0.35));
      if (spec.wallKind === 'pull') spec.pullForce = 26 + roll('wallpull', 5) * 6;
      break;
    }
    case 'reflectWard':
      spec.reflectKind = cat.reflectKind || 'damage';
      spec.reflectFrac = Math.round((0.18 + roll('refl', 12) / 100) * 100) / 100;
      // ROUND 57 -- a debuff ward returns the AFFLICTION, not a share of the
      // damage, so its number is a chance rather than a fraction. Banded higher
      // than the damage fractions because sending one debuff back is worth less
      // than returning a quarter of every blow -- most hits carry no debuff at
      // all, so a 40% reversal fires far less often than the number suggests.
      if (spec.reflectKind === 'debuff') {
        spec.reflectChance = Math.round((0.35 + roll('reflc', 26) / 100) * 100) / 100;
      }
      if (spec.kind === 'active') {
        spec.buffDuration = 6 + roll('refld', 5);
        spec.cooldown = Math.max(12, Math.round((comboCooldown + 12) * 10) / 10);
      }
      break;
    case 'cooldownPassive':
      // Capped well under the 60% the runtime clamps at, so this is a real
      // choice rather than the only choice.
      spec.cooldownReduction = Math.round((0.05 + roll('cdr', 8) / 100) * 100) / 100;
      break;
    case 'breathCone':
      // A breath trades a bolt's reach for width and a guaranteed multi-hit, so
      // it is priced between the bolt and the ring: more than one target, less
      // range than either, and a cooldown that stops it being the whole rotation.
      spec.range = 170 + roll('conerange', 5) * 20;
      spec.coneAngle = (Math.PI / 6) + (roll('coneangle', 4) * Math.PI / 40);
      spec.cooldown = Math.max(3, Math.round((comboCooldown + 3) * 10) / 10);
      // ROUND 79 (bug 5) -- the top of the band rather than the middle. A
      // breath still has to be AIMED and reaches less far than either the bolt
      // or the ring, so it keeps the sliver of extra damage that was always
      // the reason to pick it; what it loses is the 90% that made it a bolt
      // with a cone drawn round it.
      priceAsAoe(spec, comboBase, comboCooldown, 0.55);
      break;
    case 'volley': {
      // Three by default, and the per-bolt damage is cut so a volley is a
      // COVERAGE choice rather than a strictly-better bolt. Two bolts landing
      // is more than one bolt landing; three landing on one target is the
      // reward for lining them up.
      const count = 2 + roll('volleyn', 3);
      spec.volleyCount = count;
      spec.volleySpread = 0.3 + roll('volleysp', 4) * 0.06;
      spec.base = Math.max(3, Math.round(comboBase * (count === 2 ? 0.62 : count === 3 ? 0.5 : 0.42)));
      // ROUND 79 (bug 5) -- already inside the band round 79 set for every
      // other AOE, and priced there in round 74 for the same reason. Flagged
      // rather than re-priced, so the audit counts it and does not move it.
      spec.isAoe = true;
      spec.speed = 240 + roll('volleysp2', 4) * 25;
      spec.radius = 5 + roll('volleyr', 3);
      spec.range = 220;
      spec.cooldown = Math.max(1.6, Math.round((comboCooldown + 1.4) * 10) / 10);
      break;
    }
    case 'elementPierce':
      // No number of its own. What it does is remove one of the target's, which
      // is why it reads as a build-defining passive rather than as a small one.
      spec.pierceElement = materialFor(stone, essDef).element;
      break;
    case 'aoeRing':
      spec.cooldown = 5 + roll('novacd', 3);
      spec.range = 90 + roll('novarange', 5) * 10;
      // ROUND 79 (bug 5) -- the ring already paid in recharge (five to eight
      // seconds against a bolt's one) and `priceAsAoe`'s cooldown floor is
      // therefore a no-op here, which is the point of it being a floor. What
      // it had NOT paid was damage: 7.1 per target against the bolt's 7.8.
      priceAsAoe(spec, comboBase, comboCooldown);
      if (cat.wantsDot) {
        // ROUND 38 (6.1) -- the AOE that lingers: less up-front, a DoT on
        // everything caught in the ring.
        const label = (stone && stone.dot && stone.dot.label) || 'Blight';
        // The lingering ring trades some of its (already halved) up-front for
        // the gnawing. 0.7 rather than round 38's 0.5, because it is now
        // taking that cut from half a bolt instead of from nine tenths of one.
        spec.base = Math.max(2, Math.round(spec.base * 0.7));
        spec.dot = { dmgPerTick: 2 + roll('rdotdmg', 3), ticks: 4 + roll('rdotticks', 3), tickMs: 900, critChance: 0.05, label };
        spec.desc = `A creeping ring of ${phrase} that leaves ${label.toLowerCase()} gnawing at everything it touches.`;
      } else {
        spec.desc = `Erupts in a ring of ${phrase}, striking every enemy around you.`;
      }
      break;
    // ---- ROUND 38 -- the 6.x families ------------------------------------
    case 'bloomField':
      // A field that stands where it is cast and mends whoever is in it. The
      // user's growth example. Priced against aoeHealPulse: less at once, more
      // in total, and only for those who stay in the ring.
      spec.healPerSec = 2 + roll('bloomps', 3);
      spec.fieldDuration = 6 + roll('bloomdur', 5);
      spec.range = 110 + roll('bloomr', 4) * 15;
      spec.cooldown = Math.max(8, Math.round((comboCooldown + 8) * 10) / 10);
      spec.healScope = 'party';
      break;
    case 'aoeHealPulse':   // 6.1 -- heals the caster AND nearby friendly units
      spec.cooldown = 10 + roll('ahpcd', 5);
      spec.range = 110 + roll('ahprange', 4) * 15;
      spec.healAmount = Math.round(comboBase * 1.2) + 4;
      spec.healScope = 'party';   // ROUND 50 -- it always was; now it says so
      spec.desc = `A pulse of ${phrase} that mends you and every ally standing near.`;
      break;
    // ROUND 76 (item 5) -- THE FIRST ABILITY IN THIS GAME THAT BUFFS SOMEBODY
    // ELSE. Every buff before it wrote into the caster.
    //
    // Priced against the `allies` lever's own grant, which is the same payout
    // through the same channel: that lever gives about +1 power and +15% while
    // an ally stands in a passive aura, so an ACTIVE that has to be pressed,
    // costs a slot and runs out gives a little more for a while and nothing
    // the rest of the time.
    case 'partyBuff': {
      spec.cooldown = 22 + roll('pbcd', 10);
      spec.range = 140 + roll('pbrange', 4) * 20;
      spec.buffDuration = 8 + roll('pbdur', 6);
      spec.partyPower = 1 + roll('pbpow', 3);
      spec.partyDmgPct = Math.round((0.10 + roll('pbdmg', 11) / 100) * 100) / 100;
      spec.desc = `A surge of ${phrase} that lends your strength to everyone fighting beside you.`;
      break;
    }
    case 'weakenRing':     // 6.1 -- AOE debuff, no damage of its own
      spec.cooldown = 9 + roll('wkcd', 4);
      spec.range = 100 + roll('wkrange', 4) * 12;
      spec.sunder = { amount: 0.10 + roll('wkarm', 8) / 100, duration: 6 + roll('wkdur', 3) };
      spec.slowPct = 0.15 + roll('wkslow', 11) / 100;
      spec.desc = `A hex of ${phrase} settles over everything nearby, softening armour and dragging at their limbs.`;
      break;
    case 'rangeStrike':    // 6.2 -- damage GROWS with distance to the target
      spec.cooldown = 5 + roll('rscd', 3);
      spec.range = 150 + roll('rsrange', 4) * 20;
      spec.base = Math.round(comboBase * 0.7);
      spec.maxMult = 2.2 + roll('rsmult', 9) / 10;   // at full range
      spec.desc = `A hurled strike of ${phrase} that lands harder the further it travels.`;
      break;
    case 'stackStrike':    // 6.2 -- consumes the target's remaining DoT for burst
      spec.cooldown = 8 + roll('sscd', 4);
      spec.range = 60 + roll('ssrange', 4) * 8;
      spec.base = Math.round(comboBase * 0.6);
      spec.stackMult = 1.6 + roll('ssmult', 8) / 10;  // x remaining DoT damage
      spec.desc = `A finishing blow of ${phrase} that detonates every lingering affliction on the target at once.`;
      break;
    case 'imbueStrike': {  // 6.4 -- the next N weapon strikes carry a DoT/debuff
      const label = (stone && stone.dot && stone.dot.label) || 'Blight';
      spec.cooldown = 12 + roll('imbcd', 5);
      spec.strikes = 2 + roll('imbn', 3);
      spec.dot = { dmgPerTick: 2 + roll('imbdmg', 3), ticks: 3 + roll('imbticks', 3), tickMs: 800, critChance: 0.05, label };
      if (roll('imbsund', 3) === 0) spec.sunder = { amount: 0.10, duration: 4 };
      spec.desc = `Anoints your weapons with ${phrase}: the next few strikes leave ${label.toLowerCase()} behind${spec.sunder ? ' and split armour open' : ''}.`;
      break;
    }
    case 'thornsBuff':     // 6.6 -- retaliation window
      spec.cooldown = 14 + roll('thcd', 5);
      spec.buffDuration = 6 + roll('thdur', 4);
      spec.thornsFrac = 0.5 + roll('thfrac', 6) / 10;   // fraction of damage returned
      spec.desc = `Sheathes the body in barbed ${phrase}; for a time, whatever strikes you is struck back.`;
      break;
    case 'townPortal':     // 6.5 -- portal to town, and back to where you left
      spec.cooldown = 30 + roll('tpcd', 4) * 5;
      spec.desc = `Opens a doorway of ${phrase} to the town plaza. Cast again in town to return to where you opened it.`;
      break;
    case 'passiveConditional': {  // 6.8 -- a bonus that only lives in its moment
      const conds = ['night', 'day', 'vsElement', 'vsDebuffed', 'targetLowHp', 'onRoads'];
      spec.condition = conds[roll('pccond', conds.length)];
      if (spec.condition === 'vsElement') {
        const els = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];
        spec.condElement = els[roll('pcel', els.length)];
      }
      const kinds = ['dmg', 'dodge', 'armor'];
      spec.bonusKind = kinds[roll('pckind', kinds.length)];
      spec.amount = spec.bonusKind === 'dmg' ? 0.12 + roll('pcamt', 9) / 100
        : spec.bonusKind === 'dodge' ? 0.08 + roll('pcamt2', 7) / 100
          : 0.08 + roll('pcamt3', 7) / 100;
      const condText = {
        night: 'under the night sky', day: 'under the open sun',
        vsElement: `against ${spec.condElement}-touched foes`,
        vsDebuffed: 'against foes carrying your afflictions',
        targetLowHp: 'against wounded foes (below half health)',
        onRoads: 'while standing on paved ground',
      }[spec.condition];
      // ROUND 48 -- `The ${phrase}` produced "The the drawn blade in you
      // sharpens" on roughly half the 180 catalog stones, whose phrases carry
      // their own article. theP() supplies one only where one is missing --
      // the same trap the triggered-passive descs below dodge by dropping the
      // article altogether.
      spec.desc = `${cap(theP(phrase))} in you sharpens ${condText}.`;
      break;
    }
    // ROUND 47 -- the triggered passives (the user's four examples). The
    // descriptors are COPIED off the category table, never referenced: they
    // are module-level constants shared by every kit ever generated, and the
    // kill-bolt below writes a rolled damage figure into its own effect.
    case 'triggeredPassive': {
      spec.trigger = { ...cat.trigger };
      spec.effect = { ...cat.effect };
      if (cat.cooldown != null) spec.cooldown = cat.cooldown;
      if (spec.effect.kind === 'boltNearest') {
        // The one figure the user left open ("fire a bolt of lightning" --
        // no number given). Same combo-base band as a generated bolt, a
        // shade under one you pay for, since this one is free.
        spec.effect.damage = Math.max(3, Math.round(comboBase * 0.8));
        spec.effect.range = 220 + roll('trigboltrange', 5) * 20;
      }
      // Note the phrasing: no article in front of ${phrase}. Half the 180
      // catalog stones carry a phrase that already begins with "the" ("the
      // falling edge", "the drawn string"), so "the ${phrase}" reads "the the
      // falling edge" on every second stone.
      spec.desc = {
        hpBelow: `Driven below half health, ${phrase} takes over -- every physical blow lands with doubled force.`,
        kill: `Each kill discharges the gathered charge of ${phrase} as a bolt of lightning, leaping to the next foe in sight.`,
        crit: `A telling blow leaves ${phrase} ringing in the air, and the next spell you cast rides that resonance.`,
        critDrought: `Strike after strike without a weak point found coils ${phrase} tighter -- and all of it goes into the next blow.`,
        // ROUND 55 -- the troll's reflex, and the one trigger whose flavour has
        // to name its own exception: the regeneration answers everything but
        // fire, which is the whole reason the creature is killed with fire.
        hurtNonFire: `Wounds close over on their own where ${phrase} runs -- everything but fire, which it has never learned to answer.`,
      }[spec.trigger.on] || `A latent knot of ${phrase} that answers the moment it is called for.`;
      break;
    }
    // ROUND 6 -- "These should be powerful but relatively short lived
    // increases": +30-45% damage for 30s on a 5-minute cooldown.
    // ROUND 48 -- "attacks and spells have double range for 45 seconds on a
    // 5 minute cooldown". The user's numbers are the ceiling of the band, not
    // the middle: a full doubling is what the strongest roll gives, and the
    // long cooldown is what pays for it.
    case 'rangeBuff':
      spec.rangeMult = 1.5 + roll('reachmult', 6) / 10;      // 1.5x .. 2.0x
      spec.buffDuration = 30 + roll('reachdur', 4) * 5;      // 30s .. 45s
      spec.cooldown = 240 + roll('reachcd', 5) * 15;         // 4min .. 5min
      spec.desc = `Everything you reach with runs longer -- weapon and spell alike.`;
      break;
    case 'selfPower':
      spec.cooldown = 300 + roll('powcd', 4) * 15; spec.powerMult = 1.30 + roll('powmult', 16) / 100;
      spec.buffDuration = 30;
      spec.desc = `Channels ${phrase} into overwhelming striking power for half a minute.`;
      break;
    case 'selfCritBuff':
      spec.cooldown = 240 + roll('critcd', 4) * 15; spec.critChanceBonus = 0.25 + roll('critbonus', 11) / 100;
      spec.buffDuration = 20;
      spec.desc = `Sharpens the senses with ${phrase} -- for a short while every strike hunts a weak point.`;
      break;
    // ROUND 6 NEW -- the user's own example: brief total physical immunity
    // on a very long cooldown.
    case 'immunityBuff':
      spec.cooldown = 600; spec.immunityDuration = 8 + roll('immdur', 5);
      spec.desc = `The body becomes ${phrase} made flesh -- briefly beyond the reach of any physical harm.`;
      break;
    // ROUND 6 NEW -- the user's own example: freezes time for creatures in
    // aura range on a very long cooldown.
    case 'timeFreeze':
      spec.cooldown = 600; spec.freezeDuration = 5; spec.freezeRadius = 220 + roll('frzrad', 5) * 20;
      spec.desc = `Time itself congeals in a shell of ${phrase} -- every creature nearby hangs motionless.`;
      break;
    // ROUND 50 -- WHO A HEAL REACHES.
    //
    // The user: "Healing powers I'm seeing are very self focused. Zeke in
    // particular can't be much of a healer if he can only heal himself."
    //
    // He was right twice over. Two of the three heal templates were named
    // `self*` and written that way -- the runtime put every point of it on the
    // caster -- so a companion whose whole role is Healer had a list of
    // abilities that did nothing for the person he was standing next to. The
    // templates keep their names (they are a shape: an instant and a
    // heal-over-time) but they now carry a SCOPE, the same way round 49's
    // veil carries stealthScope, and the runtime reads it to decide where the
    // healing lands.
    //
    // Weighted against self on purpose. A heal that only ever fixes the caster
    // is the thing being complained about; two in five still do, because a
    // self-patch is a real and useful ability and a party of nothing but
    // group heals is its own kind of flat.
    case 'selfHeal':
      spec.cooldown = 8 + roll('healcd', 4); spec.healAmount = 12 + roll('healamt', 9);
      spec.critChance = 0.12;
      spec.healScope = HEAL_SCOPE_ROLL[roll('healscope', HEAL_SCOPE_ROLL.length)];
      spec.desc = spec.healScope === 'self'
        ? `A rush of ${phrase} knits your own wounds closed on the spot.`
        : spec.healScope === 'ally'
          ? `A rush of ${phrase}, sent into whoever beside you needs it worst.`
          : `A rush of ${phrase} breaks over the whole company at once.`;
      break;
    case 'selfHot':
      spec.cooldown = 10 + roll('hotcd', 4); spec.hotPerSec = 2 + roll('hotamt', 3);
      spec.hotDuration = 5 + roll('hotdur', 3);
      spec.healScope = HEAL_SCOPE_ROLL[roll('hotscope', HEAL_SCOPE_ROLL.length)];
      spec.desc = spec.healScope === 'self'
        ? `Suffuses your body with ${phrase}, mending it over several seconds.`
        : spec.healScope === 'ally'
          ? `Lays ${phrase} over a companion, mending them over several seconds.`
          : `Settles ${phrase} over the whole company, mending them as it goes.`;
      break;
    case 'absorbShield':
      spec.cooldown = 10 + roll('shieldcd', 5); spec.shieldAmount = 16 + roll('shieldamt', 12);
      spec.shieldDuration = 6;
      // ROUND 27 -- a barrier that only soaks a fixed pool is worth less the
      // harder you are being hit, which is backwards for a defensive cooldown.
      // It now also hardens you while it holds.
      spec.armorBonus = 0.06 + roll('shieldarm', 7) / 100;
      spec.desc = `Raises a barrier of ${phrase} that absorbs damage and hardens the body while it holds.`;
      break;
    case 'armorBuff':
      spec.cooldown = 14 + roll('armcd', 6);
      spec.armorBonus = 0.10 + roll('armamt', 11) / 100;   // +10-20% armour
      spec.buffDuration = 8 + roll('armdur', 5);
      spec.desc = `Hardens the skin with ${phrase}, turning aside blades and claws for a time.`;
      break;
    case 'sunderStrike':
      spec.cooldown = 7 + roll('sundcd', 4);
      spec.range = 70 + roll('sundrange', 5) * 8;
      spec.base = 6 + roll('sunddmg', 8);
      spec.sunder = { amount: 0.12 + roll('sundamt', 9) / 100, duration: 5 + roll('sunddur', 3) };
      spec.desc = `A rending blow of ${phrase} that splits armour open and leaves the wound exposed.`;
      break;
    case 'dash':
      spec.cooldown = 3 + roll('dashcd', 3); spec.dashDist = 90 + roll('dashdist', 5) * 10;
      spec.desc = `A burst of ${phrase} carries you instantly forward.`;
      break;
    case 'teleport':
      spec.cooldown = 5 + roll('telecd', 3); spec.teleportRange = 160 + roll('telerange', 5) * 20;
      spec.desc = `Steps through a rift of ${phrase} to reappear a distance away.`;
      break;
    case 'movementHaste':
      spec.cooldown = 9 + roll('hastecd', 4); spec.speedMult = 1.3 + roll('hastemult', 15) / 100;
      // ROUND 47 -- doubled (was 4-6s): the only rolled duration in the
      // movement family, and the one the user's "double the durations" lands
      // on. 8-12s of +30-44% against a 9-12s cooldown makes the haste a
      // travel power rather than a four-second twitch.
      spec.buffDuration = (4 + roll('hastedur', 3)) * MOVEMENT_DURATION_MULT;
      spec.desc = `Rides a current of ${phrase} for a burst of movement speed.`;
      break;
    case 'aura':
      spec.auraEffect = cat.auraEffect;
      spec.auraRadius = 70 + roll('aurarad', 4) * 10; spec.tickInterval = 1.2;
      if (cat.auraEffect === 'damage') {
        spec.tickAmount = 2 + roll('auradmg', 3);
        spec.desc = `A standing aura of ${phrase} that scorches every enemy inside it.`;
      } else if (cat.auraEffect === 'slow') {
        // ROUND 38 (6.9) -- drags at everything inside it.
        spec.slowPct = 0.22 + roll('auraslow', 13) / 100;
        spec.desc = `A standing aura of ${phrase} that clings to enemies and drags their every step.`;
      } else if (cat.auraEffect === 'weaken') {
        // ROUND 38 (6.9) -- shreds armour and resistances of what stands in it.
        spec.sunderAmt = 0.10 + roll('aurawk', 9) / 100;
        spec.desc = `A standing aura of ${phrase} that eats at armour and wards alike.`;
      } else if (cat.auraEffect === 'ward') {
        // ROUND 58 -- banded above the ward LEVER's 10-20% because this is the
        // whole ability rather than a rider on one, and it only pays while you
        // are inside your own field.
        // Physical is not one of the six resistances (see the ward lever), and
        // an aura is a field rather than worn plate, so a physical material
        // takes the nearest magical channel its stone can justify rather than
        // promising a stat that does not exist.
        const wardEl0 = materialFor(stone, essDef).element;
        const wardEl = wardEl0 === 'physical'
          ? ELEMENT_TYPES[roll('wardel', ELEMENT_TYPES.length)]
          : wardEl0;
        spec.wardResist = {
          element: wardEl,
          amount: Math.round((0.14 + roll('auraward', 13) / 100) * 100) / 100,
        };
        spec.desc = `A standing aura of ${phrase} that shelters whoever stands in it.`;
      } else {
        spec.tickAmount = 1 + roll('aurareg', 2);
        spec.desc = `A standing aura of ${phrase} that steadily mends its bearer.`;
      }
      break;
    // ROUND 62 -- THE USER: "Perception effects need to be more varied, it
    // shouldn't always reveal all the enemies on the minimap. Maybe improving
    // visibility of stealthy enemies, making companion health visible above
    // their heads, or enemy health bars visible above their heads and more.
    // These should be fitting to the essence thematically."
    //
    // Every perception used to do TWO things: reveal the whole map (always,
    // unconditionally) plus one of three specialties. So the headline effect
    // was identical on all of them and the specialty was a footnote -- which is
    // why the base sentence was the 5th most repeated line in the game at 4% of
    // every ability generated.
    //
    // The map reveal is now ONE of six readings rather than the floor under all
    // of them, and which reading an essence gets is chosen from its own theme
    // words rather than rolled blind: a Wolf sees what is hiding, a Unity sees
    // its companions, a Star reads the map.
    case 'perception': {
      spec.pickupRadiusMult = 1.5;
      spec.mode = perceptionModeFor(essDef, stone, roll);
      if (spec.mode === 'nightsight') spec.nightVision = 0.55 + roll('percnv', 4) / 10;
      if (spec.mode === 'weakspots') spec.markCritBonus = 0.10 + roll('percwk', 6) / 100;
      if (spec.mode === 'truesight') spec.lurkReveal = 0.55 + roll('perctv', 4) / 10;
      const modeText = {
        mapsense: 'every living creature in the region is felt, wherever it stands',
        nightsight: 'the dark itself thins before you',
        healthbars: "every foe's remaining strength hangs over its head",
        weakspots: 'the flaws in every foe stand out, begging to be exploited',
        truesight: 'nothing that lies in wait stays hidden',
        bondsense: 'you feel what your companions feel, and how much they have left',
      }[spec.mode];
      spec.desc = `Extends the senses through ${phrase} -- ${modeText}.`;
      break;
    }
    case 'summonBonded':
      spec.familiarDmg = 4 + roll('famdmg', 4); spec.familiarRange = 150; spec.familiarInterval = 1.2;
      spec.desc = `A bonded familiar of ${phrase} fights at your side, striking nearby enemies.`;
      break;
    // ROUND 59 -- THE ACTIVE SUMMONS.
    //
    // Duration and cooldown are rolled TOGETHER from one point on the spectrum
    // (see rollSummonTiming) rather than independently, because the user's rule
    // is a trade: "the shorter the duration and longer the cooldown the stronger
    // the summon should be". Rolling them apart would have produced three-minute
    // summons on ten-minute cooldowns -- strictly worse than everything else in
    // the system -- and thirty-second ones on two-minute cooldowns, strictly
    // better. That is a spectrum with a right answer rather than a choice.
    case 'activeSummon': {
      const kind = SUMMON_KINDS[cat.summonKind] || SUMMON_KINDS.creature;
      spec.summonKind = kind.key;
      const timing = rollSummonTiming(roll('sumspec', 100) / 100, roll('sumjit', 100) / 100);
      spec.summonDuration = timing.duration;
      spec.cooldown = timing.cooldown;
      const strength = summonStrength(timing.duration, timing.cooldown);
      spec._summonStrength = Math.round(strength * 100) / 100;
      // The damage a summon deals per hit is the ordinary combo base, scaled by
      // where it sits on the spectrum and by which of the three shapes it is.
      // A trap's number is enormous because it fires at most twice and only if
      // something walks into it.
      spec.summonDmg = Math.max(1, Math.round(comboBase * kind.dmgMult * strength));
      spec.summonRange = kind.range;
      spec.summonInterval = kind.interval;
      spec.summonMoves = !!kind.moves;
      if (kind.moves) { spec.summonSpeed = kind.speed; spec.summonLeash = kind.leash; }
      // ROUND 75 (item 6) -- WHICH CREATURE, and it is the essence that says.
      //
      // The user, asked how a player should get each of the thirteen: the
      // essence decides, and it matters. So the creature is looked up from the
      // ESSENCE that generated this ability -- a Crocodile essence summons a
      // crocodile -- and the creature's own profile then overrides the generic
      // `creature` numbers this case just set. A summoned scorpion hits for
      // two thirds of what a summoned thunderbird does and strikes half a
      // second sooner, because that is what those two animals are.
      //
      // Only the `creature` kind takes one. A turret is a machine and a trap
      // is a device; neither becomes a mantis because the essence was Locust.
      // And an essence with no creature (Paper, Sword) leaves `summonFamily`
      // null and the ability stays the abstract summon it has always been --
      // see summonCreatures.js on why that is better than hashing every
      // essence onto one of thirteen.
      if (kind.key === 'creature') {
        // ROUND 76 -- ONE JOB. Rolled here and never changed, so an ability
        // always calls the same KIND of creature: a minion whose job varied
        // between casts is one a player cannot build around.
        //
        // The damage is NOT decided here. It is capped at cast time against
        // the player's rank (see _spawnSummon), because the ceiling is "no
        // harder than a monster at the same rank" and rank is not known when
        // the ability is generated -- the same kit exists at iron and at gold.
        spec.summonRole = pickSummonRole(roll('sumrole', 1000) / 1000);
        const roleSpec = SUMMON_ROLES[spec.summonRole];
        spec.summonRoleLabel = roleSpec.label;
        if (roleSpec.aura) spec.summonAura = true;
        if (roleSpec.heals) spec.summonHeals = true;
        if (roleSpec.applies === 'dot') spec.summonAfflicts = true;
        if (roleSpec.ranged) spec.summonRanged = true;
        // A short-lived creature counts against the TEMPORARY cap rather than
        // the permanent one -- see summonRoles.js on why they are separate.
        spec.summonTemporary = (spec.summonDuration || 0) <= SUMMON_TEMP_SECONDS;

        // `essenceIdOf`, not `essDef.id`. ESSENCE_CATALOG is keyed by id and
        // its rows carry no id of their own, and WorldScene's guard and NPC
        // kit builders pass those raw rows straight in -- so `essDef.id` is
        // undefined for a large fraction of real callers and every one of them
        // would have summoned nothing. The resolver above already exists for
        // exactly this trap; using it is the whole fix.
        // `opts.essenceIds`, threaded from the pool builder: a CONFLUENCE
        // socket asks what its three parent essences summon, because its own
        // id is the literal 'confluence' for all 101 of them.
        const family = summonCreatureFor(essenceIdOf(essDef), opts.essenceIds);
        const prof = family ? SUMMON_CREATURES[family] : null;
        if (prof) {
          spec.summonFamily = prof.family;
          spec.summonCreatureName = prof.name;
          spec.summonDmg = Math.max(1, Math.round(spec.summonDmg * prof.dmgMult));
          spec.summonSpeed = prof.speed;
          spec.summonInterval = prof.interval;
          spec.summonRange = prof.range;
        }

        // ===== ROUND 76 (item 2.2) -- THE ODD SUMMON ========================
        //
        // "An iron essence with a awakening stone of the bull might give you
        // an iron cow, or with an awakening stone of the bird an iron duck."
        //
        // The pair, not the essence. Everything above this line is decided by
        // the ESSENCE alone -- which is why an Iron essence's summon is a
        // Slime Golem in all four of its sockets. The odd summons are the one
        // place the STONE gets a vote on what appears, and they are the last
        // word because the whole point is that this particular combination
        // produces something the essence on its own never would.
        //
        // It overwrites the creature, the material, the role and the damage,
        // in that order, and the damage is ZERO. A guardian that also chipped
        // in would break the user's one-job rule and would make the eighteen
        // best summons in the game the eighteen jokes.
        const odd = oddSummonFor(essenceIdOf(essDef), stoneId);
        if (odd) {
          spec.oddSummon = odd.key;
          spec.oddSummonName = odd.name;
          spec.oddSummonFlavour = odd.flavour;
          spec.oddSummonDesc = oddSummonDesc(odd);
          spec.summonMaterial = odd.material;
          spec.summonBody = odd.body;
          spec.summonFamily = odd.bodyDef.kind === 'family' ? odd.bodyDef.family : null;
          spec.summonSheet = odd.bodyDef.kind === 'sheet' ? odd.bodyDef.sheet : null;
          spec.summonCreatureName = odd.name;
          spec.summonRole = 'guard';
          spec.summonRoleLabel = SUMMON_ROLES.guard.label;
          spec.summonDmg = 0;
          spec.summonAura = false;
          spec.summonHeals = false;
          spec.summonAfflicts = false;
          // A bodyguard is a slot in the build, not a button in a fight -- so
          // it is never temporary however the timing spectrum rolled, and it
          // gets the guard numbers rather than the creature's own.
          spec.summonTemporary = false;
          spec.color = odd.mat.color;
          // The guardian's NUMBERS are deliberately NOT set here -- they are
          // pinned after the lever pass, below. See the note there: everything
          // written in this switch is fair game for the essence's twist, and a
          // card that promises three taunts while the mechanic holds two is
          // the defect class this project keeps rediscovering.
        }
      }
      if (kind.key === 'trap') {
        spec.summonCharges = kind.charges;
        spec.summonBlast = kind.blast;
        spec.summonArmDelay = kind.armDelay;
        // ROUND 75 (item 7) -- "A set of assets for dropped, thrown, and
        // SPAWNED traps from abilities". Three words, and until now the game
        // had one placement: everything landed 70 units ahead of the caster.
        // The art divides on exactly those three lines (see
        // extract_round75_traps.py), so the mechanic does too, and the three
        // are genuinely different to play:
        //
        //   dropped  at your feet. Arms fastest and has the widest blast,
        //            because you have to be standing in the danger to lay it.
        //   thrown   out at the full reach of the throw. The safest to use and
        //            the slowest to arm -- a lit fuse takes time.
        //   spawned  conjured ON something, at no fixed distance. Arms almost
        //            instantly and blasts smallest: it is already where it
        //            needs to be, so it buys none of the positioning the other
        //            two pay for.
        //
        // Rolled per ability rather than chosen by element, so two frost trap
        // abilities from different combos are not the same ability twice.
        const deliv = roll('trapdeliv', 3);
        spec.trapDelivery = deliv === 0 ? 'dropped' : deliv === 1 ? 'thrown' : 'spawned';
        if (spec.trapDelivery === 'dropped') {
          spec.summonBlast = Math.round(kind.blast * 1.25);
          spec.summonArmDelay = Math.round(kind.armDelay * 0.6 * 100) / 100;
        } else if (spec.trapDelivery === 'thrown') {
          spec.summonArmDelay = Math.round(kind.armDelay * 1.6 * 100) / 100;
        } else {
          spec.summonBlast = Math.round(kind.blast * 0.8);
          spec.summonArmDelay = 0.1;
        }
      }
      spec.desc = `${kind.blurb(summonNoun(kind.key, materialFor(stone, essDef).element))}.`;
      break;
    }
    // ===== ROUND 75 -- THE STACKING FAMILY ================================
    //
    // Three parts and they are rolled, not fixed: the SHAPE comes from the
    // category (boon, mark or ledger), and the trigger that builds it and the
    // payout that spends it are chosen from what that shape allows. Two Mark
    // abilities from different combos differ in what feeds them and what they
    // pay, which is the whole reason the user asked for a generated family
    // rather than three hand-written effects.
    //
    // THE SIGNATURE OVERRIDE. If this socket's essence is one of the five
    // that carry a named effect -- Sin for Jason's, Balance for Sophie's Agent
    // of Karma, Omen for her Blessing of Anticipation -- the roll is discarded
    // and the authored one is used whole, name included. That is the user's
    // answer read literally: a generated family with the named ones as
    // signatures inside it. A player running a Sin essence gets the Mark of
    // Sin, not a procedural approximation of it wearing a different name.
    case 'stacking': {
      const shape = STACK_SHAPES[cat.stackShape] || STACK_SHAPES.boon;
      const sig = STACK_SIGNATURES[STACK_SIGNATURE_BY_ESSENCE[essenceIdOf(essDef)]];
      const useSig = sig && sig.shape === shape.key;
      spec.stackShape = shape.key;
      spec.stackBuild = useSig ? sig.build
        : shape.builds[roll('stkbuild', shape.builds.length)];
      // WHAT BUILDS IT MUST NOT BE WHAT SPENDS IT.
      //
      // The mark shape builds on `hit` or `crit` and is spent by a CRIT, so a
      // mark that rolled `crit` to build was consumed by the same blow that
      // added the stack -- it could never hold more than one, and its card
      // promised twelve. Caught by reading a generated sample out loud:
      // "Every time you land a critical hit, a stack builds. A critical hit
      // spends them all."
      //
      // Fixed as a general rule rather than by editing the mark's list,
      // because the collision is a property of any shape whose spend is also a
      // trigger, and the next shape added would walk into it again.
      if (spec.stackBuild === shape.spend) {
        const alt = shape.builds.filter((t) => t !== shape.spend);
        if (alt.length) spec.stackBuild = alt[roll('stkbuild2', alt.length)];
      }
      spec.stackPay = useSig ? sig.pay
        : shape.pays[roll('stkpay', shape.pays.length)];
      spec.stackCap = shape.cap;
      spec.stackDecay = shape.decaySeconds;
      spec.stackSpend = shape.spend;
      spec.stackOn = shape.on;
      // The magnitude varies a little per ability so two Marks of the same
      // shape are not numerically identical -- +/-20% around the payout's own
      // per-stack value, which keeps the full-stack total inside a band a
      // player can reason about.
      spec.stackScale = Math.round((0.8 + roll('stkscale', 5) / 10) * 100) / 100;
      if (useSig) {
        spec.stackSignature = sig.key;
        spec.name = sig.name;
        spec.stackIcon = sig.icon;
        spec.stackFlavour = sig.flavour;
      } else {
        // A generated one takes an icon that suits its ELEMENT, so a frost
        // build's stacks look like frost. Falls back to the shape's own symbol
        // when the element has none.
        spec.stackIcon = stackIconFor(materialFor(stone, essDef).element, shape.key);
      }
      spec.desc = stackClause(spec);
      break;
    }

    case 'passiveMove':
      spec.moveSpeedPct = 0.08 + roll('pmove', 7) / 100;
      spec.desc = `The body is permanently quickened by ${phrase}.`;
      break;
    // ROUND 47 (item 7) -- weapon affinity. Reach is the more visible of the
    // two (it redraws the telegraph, which is what the user asked for), so it
    // is the likelier roll: reach 3/8, speed 2/8, both 3/8 -- and 'both' takes
    // roughly two thirds of each number rather than stacking two full ones.
    case 'weaponAffinity': {
      // ROUND 48 -- the theme text no longer includes the ability's own name
      // (the name is chosen after the mechanic now, so there is none to read
      // yet), and instead includes the ESSENCE's own motif words. That is a
      // strict improvement on the old input: a Spear essence's parts are
      // "shaft, point, haft", which names the weapon far more reliably than a
      // sheet name drawn from a coarse bucket ever did.
      // ROUND 74 -- the weapon comes from the stone's or the essence's own
      // weapon identity, and from nothing else. The motif-word blob rounds 48
      // and 53 fed to `weaponFromTheme` is gone along with the function; see
      // WEAPON_BY_IDENTITY above for what it was doing wrong.
      //
      // `|| 'sword'` is a belt-and-braces default, not a fallback with an
      // opinion: `tryCat` refuses this category outright when the answer is
      // null, so the only way to arrive here without one is a caller that
      // bypassed the pool builder, and a Sword affinity is the least
      // surprising thing to hand such a caller.
      const wid = weaponForAffinity(stone, essDef) || 'sword';
      const w = WEAPONS[wid] || WEAPONS.sword;
      const modeRoll = roll('affmode', 8);
      const mode = modeRoll < 3 ? 'reach' : modeRoll < 5 ? 'speed' : 'both';
      const damp = mode === 'both' ? 0.65 : 1;
      spec.weaponId = wid;
      spec.weaponName = w.name;
      spec.affinityMode = mode;
      // 15-28% reach, 10-19% off the cooldown, before damping. A quarter more
      // reach on a spear is about a tile and a half and is plainly visible in
      // the telegraph; a fifth off a dagger's 0.2s cooldown is felt rather
      // than seen, which is why the two are separate rolls.
      spec.rangePct = (mode === 'speed') ? 0 : Math.round((0.15 + roll('affrange', 14) / 100) * damp * 100) / 100;
      spec.attackSpeedPct = (mode === 'reach') ? 0 : Math.round((0.10 + roll('affspeed', 10) / 100) * damp * 100) / 100;
      const what = mode === 'reach' ? `reaches further` : mode === 'speed' ? `strikes faster` : `reaches further and strikes faster`;
      spec.desc = `Long practice with ${phrase} settles into the hands: a ${w.name.toLowerCase()} ${what} while you hold one.`;
      // --- ROUND 74 (item 2) -- WHAT A RANGED AFFINITY CAN DO -------------
      //
      // The user, twice. First as item 2 of the round:
      //
      //   "Essences should make interesting projectiles, imagine a javazon or
      //    a demon hunter from diablo 3."
      //
      // and then, sending the arrow and bolt art:
      //
      //   "1.4) ...abilities can now (if thematically related by weapon
      //    essence or awakening stone) increase the range an attack will fly,
      //    increase the speed the attack will fly, decrease the interval
      //    between attacks, create arrows, spears, or magic bolts that split,
      //    or duplicate, bounce between targets, pierce targets, and more."
      //
      // Reach and swing speed already existed and are the two clauses above.
      // The three that only make sense once a weapon puts something IN THE
      // AIR are added here, and ONLY here -- a sword affinity cannot roll
      // them, because a sword has no missile to split. `isRangedWeapon` is
      // the gate, read off the weapon's own shape (weapons.js) rather than
      // from a second list of ids.
      //
      // ONE twist per affinity, not a menu. Three passives that each add a
      // pierce is a build; one that splits, one that pierces and one that
      // bounces are three different builds, and that is the whole point of
      // the essence system. Rolled at 1-in-2 so a ranged affinity is still
      // sometimes just reach and speed.
      if (isRangedWeapon(wid) && roll('rangedtwist', 2) === 0) {
        const twist = roll('rangedkind', 3);
        if (twist === 0) {
          // SPLIT -- the javazon's fan. Two extra shafts either side, and
          // each carries a share of the blow rather than a copy of it: three
          // full-damage arrows for one press is a damage multiplier wearing
          // a spread's clothes.
          spec.shotSplit = 2 + roll('splitn', 2);              // 2..3 extra
          spec.shotSplitDamage = 0.55 + roll('splitdmg', 4) * 0.05;  // 0.55..0.70
          // The SENTENCE for this lives in the stats line, not here -- see
          // the note in statsLine's weaponAffinity case. A desc written now
          // is overwritten by the lever pass before the player sees it.
        } else if (twist === 1) {
          // PIERCE -- the demon hunter's line. Stacks with a crossbow's own,
          // which is what makes a crossbow the piercing build rather than
          // the only weapon that pierces.
          spec.shotPierce = 1 + roll('piercen', 2);            // 1..2 extra

        } else {
          // BOUNCE -- "bounce between targets". A shot that has spent itself
          // on one body turns and finds another instead of falling.
          spec.shotBounce = 1 + roll('bouncen', 2);            // 1..2 hops
          spec.shotBounceRange = 120 + roll('bouncer', 5) * 20;  // 120..200

        }
      }
      // The FLIGHT SPEED lever, rolled independently of the twist: "increase
      // the speed the attack will fly" is its own thing and pairs with any of
      // the three. Only on ranged, for the obvious reason.
      if (isRangedWeapon(wid) && roll('shotspd', 3) === 0) {
        spec.shotSpeedPct = 0.15 + roll('shotspdn', 16) / 100;   // 15..30%

      }
      break;
    }
    case 'passiveBuff': {
      // ROUND 27 -- a fourth kind, 'armor', so the passive pool can roll
      // permanent protection and not only damage/crit/health.
      const kindRoll = roll('pbuffkind', 4);
      if (kindRoll === 0) { spec.buffKind = 'dmg'; spec.amount = 0.08 + roll('pbuffdmg', 7) / 100; spec.desc = `Every strike carries a measure of ${phrase}.`; }
      else if (kindRoll === 1) { spec.buffKind = 'crit'; spec.amount = 0.04 + roll('pbuffcrit', 4) / 100; spec.desc = `${stone ? stone.word : 'Essence'}-tempered instincts find weak points more often.`; }
      else if (kindRoll === 2) { spec.buffKind = 'maxHp'; spec.amount = 10 + roll('pbuffhp', 11); spec.desc = `The body is reinforced by ${phrase}.`; }
      else { spec.buffKind = 'armor'; spec.amount = 0.04 + roll('pbuffarm', 6) / 100; spec.desc = `The skin thickens where ${phrase} has settled into it.`; }
      break;
    }
    // ROUND 10: "Summoned items should have an ability specific impact
    // plus be at an epic level for stats" -- each conjured relic keeps its
    // signature effect AND rolls an Epic-tier (3-slot) minor-stat buff
    // set, deterministic per combo.
    // ROUND 55 -- CONJURED GEAR DOES SOMETHING, not just +12%.
    //
    // The user: "Weapons, shields, and Armor summons should also be more
    // complex. Continuing with dragon examples a sword that inflicts a burn on
    // every strike, boots that grant 'dragon claws'..." A relic that only moves
    // a percentage is a stat stick with a name on it, and three of them in a kit
    // read as one item printed three times.
    //
    // Each relic now carries a MECHANIC drawn from the stone: a blade that
    // afflicts on contact, armour that answers the blow, a trinket that pays out
    // on a kill. The stone decides which affliction and how much; the shape of
    // the rider is the relic's.
    case 'summonWeapon': {
      spec.weaponDmgPct = 0.10 + roll('sweap', 9) / 100;
      spec.itemBuffs = rollBuffs('Epic', seededRng(comboSeed + '|relicbuffs'));
      // ROUND 79 (bug 11) -- WHAT, EXACTLY, IS CONJURED.
      //
      // This template has always conjured "a weapon" and never said which,
      // which is how a Sword essence shipped "Summon Gauntlets of Blades":
      // with no item on the spec there was nothing for a name to contradict.
      // The socket already knows -- `weaponForAffinity` is the same question
      // the affinity category asks, and it answers from the stone first and
      // the essence second. Null is a legitimate answer (a Fire essence with
      // a Rain stone names no weapon), and it means the same thing it means
      // there: we could not tell. A generic conjured blade is fine; a name
      // claiming a specific WRONG one is not, and `nameContradictsSpec` refuses
      // it.
      //
      // The field is `relicWeaponId`, not `weaponId`, on purpose. Two readers
      // -- the stats line at `case 'weaponAffinity'` and the affinity
      // description -- switch on `weaponName` inside a template check today,
      // and reusing the field would make that check the only thing standing
      // between a conjured relic and an affinity's prose. A separate name
      // cannot be read by accident.
      const rwid = weaponForAffinity(stone, essDef);
      if (rwid && WEAPONS[rwid]) {
        spec.relicWeaponId = rwid;
        spec.relicWeaponName = WEAPONS[rwid].name;
      }
      const wLabel = (stone && stone.dot && stone.dot.label) || materialFor(stone, essDef).dot;
      if (wLabel) {
        spec.strikeDot = { dmgPerTick: 1 + roll('sweapd', 3), ticks: 2 + roll('sweapt', 3),
          tickMs: 800, critChance: 0.06, label: wLabel };
      }
      break;
    }
    case 'summonArmor':
      spec.armorBonus = 0.05 + roll('sarmarm', 6) / 100;
      spec.damageReduction = 1 + roll('sarm', 3);
      spec.itemBuffs = rollBuffs('Epic', seededRng(comboSeed + '|relicbuffs'));
      spec.thornsFrac = Math.round((0.06 + roll('sarmth', 8) / 100) * 100) / 100;
      break;
    case 'summonGear':
      spec.critChance = 0.04 + roll('sgearc', 3) / 100; spec.critDamage = 0.15 + roll('sgeard', 11) / 100;
      spec.lifeOnKill = 2 + roll('sgeark', 5);   // ROUND 55
      spec.itemBuffs = rollBuffs('Epic', seededRng(comboSeed + '|relicbuffs'));
      spec.desc = `Conjures a trinket of ${phrase} that hones killing strikes.`;
      break;
    // ---- ROUND 48 -- the two shapes the lever vocabulary needed and the
    // category taxonomy did not have. `turn` biases confuse_turn first and
    // `fate` biases fate_reroll first, so without these two the two newest
    // levers would have silently degraded into their second-choice categories
    // -- which is exactly the invisible failure this round exists to remove.
    case 'confuseTurn':
      spec.cooldown = 14 + roll('cfcd', 7);
      spec.range = 90 + roll('cfrange', 5) * 12;
      spec.confuseDuration = 4 + roll('cfdur', 4);
      spec.maxTargets = 2 + roll('cftgt', 3);
      // They fight with their OWN numbers, so this scales with what it catches
      // rather than with the caster -- a control spell, not a damage spell.
      spec.confuseDamageFrac = 1;
      spec.desc = `Sets ${phrase} loose in the heads of everything nearby: they stop telling friend from foe and turn on each other.`;
      break;
    // ---- ROUND 49 -- THE TAUNT. "Drawing monsters to the tank and away from
    // the team."
    //
    // Every rolled band is centred on the contract's documented default
    // (220 / 6s / 6) rather than starting there, so the default is the middle
    // of what the generator produces and not its floor -- a spec that fell back
    // to a default would be indistinguishable from an ordinary roll, which is
    // how a silently-defaulted field goes unnoticed for a round.
    //
    // The cooldown is long by the standards of this file (16-24s against a
    // shield's 10-15) because of what the ability is worth: pulling a pack off
    // the healer is the single highest-value thing a tank does in a fight, and
    // at a short cooldown there would be no fight in which the answer is
    // anything else.
    case 'tauntPull':
      spec.cooldown = 16 + roll('tauntcd', 9);                  // 16..24s
      spec.tauntRadius = 180 + roll('tauntrad', 5) * 20;        // 180..260
      spec.tauntDuration = 5 + roll('tauntdur', 4);             // 5..8s
      spec.tauntMax = 4 + roll('taunttgt', 5);                  // 4..8
      // The price of being listened to. A monster fixed on you swings harder
      // at you than it would have at whoever it was chasing -- so a taunt is a
      // real decision (can I take this?) rather than a free pack reset. Rolled
      // between +0% and +15%; at zero the stats line simply omits the clause.
      spec.threatMult = 1 + roll('tauntthreat', 4) * 0.05;      // 1.00..1.15
      spec.desc = `Every eye nearby comes off whoever it was on and settles on you, and ${theP(phrase)} is what they come through to get there.`;
      break;
    case 'stealthVeil':
      spec.cooldown = 20 + roll('stcd', 11);                    // 20..30s
      spec.stealthDuration = 6 + roll('stdur', 5);              // 6..10s
      // How solid you still look. Deliberately never 0: an invisible player is
      // a player who cannot see themselves in a crowd, and the user asked for
      // "semi transparent", which is a look as much as a mechanic.
      spec.stealthAlpha = 0.3 + roll('stalpha', 4) * 0.05;      // 0.30..0.45
      // The whole point. A monster's sight range is multiplied by this while
      // the veil holds, so at 0.35 a wolf that saw you at 300 units now sees
      // you at 105 -- which is what "allowing for movement past monsters"
      // means in the one number the aggro check actually reads.
      spec.aggroMult = 0.3 + roll('stagg', 5) * 0.05;           // 0.30..0.50
      // A small hurry, on some of them. Slipping past is a timed thing.
      spec.stealthSpeedPct = roll('stspd', 4) * 5;              // 0, 5, 10, 15
      // ROUND 49 -- WHO THE VEIL COVERS. The user: "Not every stealth ability
      // should affect allies."
      //
      // Most veils are one person going quiet, which is what stealth IS; a veil
      // that hides the whole party is a rarer and bigger thing, and it should
      // feel like one. Rolled at 1-in-5, and gated on the ability being wide
      // enough to plausibly cover other people -- a knife-fighter's slip into
      // shadow does not hide the tank standing behind them.
      //
      // The scope is what the RUNTIME reads to decide whether an ally's veil
      // silences your aura, so it is a generator field rather than a runtime
      // guess. See WorldScene's "THE STEALTH RUNTIME".
      spec.stealthScope = (roll('stscope', 5) === 0) ? 'party' : 'self';
      spec.desc = `You go quiet and go thin, and ${theP(phrase)} is the last of you anything sees until you choose otherwise.`;
      break;
    case 'fateReroll': {
      const kinds = ['strike', 'crit', 'dodge', 'death'];
      spec.rerollKind = kinds[roll('frkind', kinds.length)];
      spec.rerollChance = spec.rerollKind === 'death' ? 1 : Math.round((0.15 + roll('frch', 16) / 100) * 100) / 100;
      // The death reroll is absolute when it fires, so it is the only one on a
      // cooldown -- everything else is a chance, and a chance needs no gate.
      if (spec.rerollKind === 'death') spec.cooldown = 120 + roll('frcd', 5) * 30;
      spec.desc = {
        strike: `A blow that missed is quietly asked again, ${phrase} standing behind the second question.`,
        crit: `A blow that landed flat is asked a second time for a weak point, ${phrase} answering.`,
        dodge: `A step that would not have been enough is taken twice, ${phrase} covering the difference.`,
        death: `A killing blow is refused outright once ${phrase} has been spent on it, leaving you standing on nothing.`,
      }[spec.rerollKind];
      break;
    }
  }
  // ROUND 48 -- THE SEAM. The mechanic has been rolled; the essence now pulls
  // its lever on it. Cost and the stats line are computed after this point, so
  // whatever it changes is reflected in both without further plumbing.
  if (!opts.skipFlavour) applyEssenceFlavour(spec, essDef, stone, cat, roll, comboBase, { spine: opts.spine });

  // ROUND 48 -- and only NOW is the name chosen, against a finished mechanic.
  spec.name = pickAbilityName(cat, essDef, stoneId, comboSeed, usedNames, spec, roll);

  // ROUND 16 -- if the name we drew is one of this essence's SIGNATURE
  // names (pickAbilityName's second tier, used when the sheet has no
  // unused name for this category), take the authored flavor with it. The
  // template switch above writes a generic stone-phrase description, and
  // pairing an authored name with it produced lines like "Dragon's
  // Breath -- hurls a bolt of the drawn blade at the target." The lend is
  // exact-category-only, so the authored flavor always describes the
  // mechanic that actually got rolled.
  const lent = signaturesFor(essDef).find(e => e.name === spec.name && e.catKey === cat.key);
  if (lent) {
    // The authored voice wins the prose; the lever's twist survives as a
    // trailing clause so the description still names what the mechanic does.
    spec.desc = spec._leverRider ? `${lent.desc} ${spec._leverRider}` : lent.desc;
    spec.signature = true;
    if (lent.mech) {
      Object.assign(spec, lent.mech);
      normalizeSignatureMech(spec, comboSeed);
      // A pinned figure has to be twisted the same way a rolled one was, or a
      // reach essence's pinned range is the only number in the kit the essence
      // did not touch. Applied to the PINNED keys only, exactly once.
      reapplyLeverScalars(spec, lent.mech);
      applyRuntimeFieldNames(spec);   // ROUND 48 -- re-twisting can rewrite the source fields
    }
  }
  // ROUND 48 -- RECONCILE THE LEVER FIELDS WITH THE RUNTIME CONTRACT.
  //
  // The lever twists above and the runtime that executes them were built in
  // parallel and named the same mechanics differently -- the twist writes
  // `chain: {count, radius, frac}`, the runtime reads `chainCount` /
  // `chainRange` / `chainDamagePct`. Neither naming is wrong, but a spec that
  // satisfies only one of them is INERT, and inert is the exact failure this
  // round exists to remove: it would have looked correct in every roster, in
  // every stats line, and done nothing in play.
  //
  // The runtime's names win, because the runtime is what has to read them and
  // its contract is written down (WorldScene.js, "THE FIELD CONTRACT LIVES
  // HERE"). This adapter is deliberately one small block in one place rather
  // than a rename scattered through the twist cases, so the next person can
  // see the whole mapping at once and delete it if the two ever converge.
  // ROUND 76 (item 2.2) -- AN ODD SUMMON KEEPS ITS OWN NAME AND ITS OWN CARD.
  //
  // Placed after pickAbilityName and after the signature lend, because both of
  // those assign `spec.name` unconditionally and an odd summon that came out
  // called "Wing Agility" would be the table having no effect the player can
  // see. This is the same shape as the signature path -- an authored identity
  // over a generated mechanic -- and it is late for the same reason.
  //
  // The description is GENERATED from ODD_GUARD rather than typed beside each
  // name, so all twenty say the same true thing and a change to the guardian's
  // numbers cannot leave twenty cards lying. Flavour carries the joke; the
  // description states the mechanic.
  if (spec.oddSummon) {
    if (!usedNames || !usedNames.has(spec.oddSummonName)) spec.name = spec.oddSummonName;
    spec.desc = `${spec.oddSummonDesc} ${spec.oddSummonFlavour || ''}`.trim();
    spec.signature = true;
    // AND THE NUMBERS ARE PINNED HERE, past the lever.
    //
    // The first draft wrote these inside the template switch, where the lever
    // pass then scaled them: `tauntRadius` is in REACH_FIELDS, so an Ape
    // essence's reach lever stretched it, and the taunt lever rolled the max
    // and the duration down to 2 and 3. The card said "taunts up to 3 every
    // 8s" over a mechanic holding two for three seconds -- the description
    // states the mechanic, and it was not.
    //
    // Twenty rows, one set of numbers, no per-essence variation. That is the
    // right call for a curated table: the player who finds The Vitrine and the
    // player who finds The Geode should be able to compare them on the animal
    // rather than on which essence happened to twist the taunt further.
    // NAMESPACED `summonTaunt*`, NOT the runtime's `taunt*`. Round 49's
    // `isTaunt()` is the single predicate for "does this ABILITY taunt", and it
    // answers on the presence of `tauntRadius` -- so writing the guardian's
    // numbers under those names made every guardian a taunt ability. Its
    // suite caught it immediately: five essences the taunt lever never reaches
    // were suddenly producing taunts, and the guardian's own stats line failed
    // a band check written for a different mechanic.
    //
    // And it was right to. A guardian is a SUMMON THAT TAUNTS: the player
    // casts a creature, and the creature shouts on its own clock afterwards.
    // The ability does not draw aggro when pressed, which is what every other
    // consumer of `isTaunt` -- the companion AI, the tank's pick order, the
    // stats rider -- means by the word.
    spec.summonGuardPct = ODD_GUARD.auraPct;
    spec.summonGuardRadius = ODD_GUARD.auraRadius;
    spec.summonTauntRadius = ODD_GUARD.tauntRadius;
    spec.summonTauntDuration = ODD_GUARD.tauntDuration;
    spec.summonTauntMax = ODD_GUARD.tauntMax;
    spec.summonTauntEvery = ODD_GUARD.tauntEvery;
    spec.summonHpPct = ODD_GUARD.hpPct;
    spec.summonDmg = 0;
    // AND ITS UPTIME -- moved to the mildest corner of the timing spectrum
    // rather than off it. See ODD_GUARD.duration: the trade is life for power,
    // and a guardian has no power to trade. `_summonStrength` is recomputed
    // from the new pair rather than left where the roll put it, because round
    // 59 checks that every summon's recorded strength agrees with its own
    // timing -- and a spec whose strength and timing disagree is inert data
    // that reads as correct, which is this project's fault class 1 again.
    spec.summonDuration = ODD_GUARD.duration;
    spec.cooldown = ODD_GUARD.cooldown;
    spec._summonStrength = Math.round(summonStrength(spec.summonDuration, spec.cooldown) * 100) / 100;
    // AND THE ESCORT LEVER IS REFUSED. It bolts a second, damage-dealing
    // creature onto a summon -- which is a good rider on any of the other five
    // roles and is two jobs on this one. The Reliquary shipped a first draft
    // reading "deals no damage" beside "escort strikes for 4 every 1.4s", and
    // both halves were true, which is worse than either being wrong.
    delete spec.escort;
  }
  applyRuntimeFieldNames(spec);
  assignAbilityCost(spec, stone);   // ROUND 38 -- every active carries a resource cost
  assignCastTime(spec);             // ROUND 57 -- the heavy ones take a moment
  assignAbilityDebuff(spec, essDef, comboSeed);  // ROUND 57 -- and some leave a mark
  appendDebuffClause(spec);
  bindFamiliarCreature(spec, essDef, opts);
  spec.rankAspects = rankAspectsFor(spec);
  spec.stats = statsLineFor(spec);
  return spec;
}

// ROUND 16 -- essence SIGNATURE abilities (see essenceAbilities.js).
//
// A signature is NOT a separate mechanic: it is a normal category ability
// generated by the machinery above, with its identity (name + flavor)
// replaced by an authored, essence-specific one, and its mechanic pinned
// where the name promises something specific. That is deliberate -- it
// means every signature stays inside the same balance band as everything
// else, and the aura/perception/movement caps and the active/passive
// budget keep working untouched, because a signature still carries a real
// catKey.
function normalizeSignatureMech(spec, seedStr) {
  // A pinned passiveBuff kind has to bring its own amount: the generator
  // rolled an amount for whichever kind IT chose, and a damage-percent
  // number (0.08-0.15) read as max HP would say "+0.12 max HP".
  if (spec.template === 'passiveBuff') {
    const r = (salt, n) => stableHash(seedStr + '|' + salt) % n;
    if (spec.buffKind === 'dmg') spec.amount = 0.08 + r('sigdmg', 7) / 100;
    else if (spec.buffKind === 'crit') spec.amount = 0.04 + r('sigcrit', 4) / 100;
    else if (spec.buffKind === 'armor') spec.amount = 0.04 + r('sigarm', 6) / 100;
    else spec.amount = 10 + r('sighp', 11);
  }
}

export function buildSignatureAbility(entry, essDef, stoneId, comboSeed, usedNames, opts = {}) {
  const cat = ABILITY_CATEGORY_BY_KEY[entry.catKey];
  if (!cat) return null;
  // ROUND 48 -- the base spec is rolled WITHOUT the essence twist, because this
  // function then overwrites the name and the description and may PIN the
  // mechanic outright. Applying the twist inside generateCategoryAbility and
  // again out here would either be clobbered by the pin or applied twice; doing
  // it once, below, after the pin, is the only ordering that is both correct
  // and idempotent. A signature that carried no twist at all would be the worse
  // failure -- a sixteenth of every kit is a signature, and they are the
  // abilities the player actually notices.
  const spec = generateCategoryAbility(entry.catKey, essDef, stoneId, comboSeed, usedNames,
    { ...opts, skipFlavour: true });
  // ROUND 63 -- an authored signature is adopted WHOLESALE here (name plus its
  // flavour text), which is a different path from pickAbilityName -- so
  // "Passive Wing Agility" survived cleaning the sheet and signature tiers
  // both. Same presentation rule, applied where the name actually lands.
  //
  // ...and the cleaning made a collision possible that could not happen before.
  // essAxe's signature is authored as the lowercase "double swing"; title-cased
  // it becomes "Double Swing", which is a name another socket's picker may
  // already have spent from the sheet. This path never consulted usedNames at
  // all -- it did not need to while the authored string was unique by accident.
  // If the name is taken, the generated one stands: the kit keeps the
  // signature's mechanic and flavour, and no kit prints a name twice.
  {
    const cleaned = cleanSheetName(entry.name);
    if (!usedNames || !usedNames.has(cleaned)) spec.name = cleaned;
  }
  spec.desc = entry.desc;
  spec.signature = true;
  spec.essenceId = essDef.id || essenceIdOf(essDef);
  if (entry.mech) {
    Object.assign(spec, entry.mech);
    normalizeSignatureMech(spec, comboSeed);
  }
  const roll = (salt, n) => stableHash(comboSeed + '|' + salt) % n;
  const essBase = essDef.base || 6;
  const comboBase = Math.round(essBase * 0.65 + (6 + roll('stonebase', 4)) * 0.65);
  // ROUND 54 -- only a genuinely authored voice is kept. See
  // isFilledTemplateDesc: a third of the signature bank is bulk-filled frames,
  // and those get the same plain mechanical treatment as everything else.
  const authored = !isFilledTemplateDesc(spec.desc);
  if (!authored) spec.desc = mechanicalDesc(spec, materialFor(STONE_THEMES[stoneId], essDef));
  applyEssenceFlavour(spec, essDef, STONE_THEMES[stoneId], cat, roll, comboBase,
    { keepText: true, spine: opts.spine });
  // ROUND 48 -- the signature path needs the SAME field reconciliation the
  // socket path gets. Without it, measured, 45 chain / 46 ally / 19 reroll
  // specs shipped carrying only the pre-adapter names -- correct stats lines,
  // correct descriptions, and completely inert at runtime. Signature abilities
  // are the essence's own marquee grants, so those were exactly the wrong ones
  // to leave dead.
  applyRuntimeFieldNames(spec);
  assignAbilityCost(spec, STONE_THEMES[stoneId]);   // ROUND 38 -- re-run: a mech pin can change the template family
  // ROUND 57 -- signatures get the same two passes the socket path gets, and
  // for the same reason round 48 gave them applyRuntimeFieldNames: a signature
  // is a normal ability with an authored name, not a separate mechanic. The
  // first draft ran assignAbilityDebuff only on the socket path, so a marquee
  // ability came out with "35% dulled 6.6s" in its stats line and not a word
  // about it in its description -- the exact split the user's own wording rule
  // exists to prevent.
  assignCastTime(spec);
  assignAbilityDebuff(spec, essDef, `${comboSeed}|sig`);
  appendDebuffClause(spec);
  bindFamiliarCreature(spec, essDef, opts);
  spec.rankAspects = rankAspectsFor(spec);
  spec.stats = statsLineFor(spec);
  return spec;
}

// Picks ONE signature for an essence, synergy-scored against the kit built
// so far exactly the way a stone socket's pick is -- so which of the 16 a
// player's Fire slot actually grants depends on what else they are running,
// not on a hardcoded row. Returns null for an essence with no pool (the
// confluence essences, which keep their own innate).
export function pickSignatureAbility({
  essDef, knownList, usedNames, auraState, perceptionState, movementCount,
  // ROUND 47 -- buffState is threaded exactly like auraState/perceptionState.
  // It defaults so an outside caller that predates the cap (WorldScene's
  // guard-kit builder calls buildCandidatePool the same way) still works and
  // simply gets a fresh per-call budget.
  buffState = { count: 0, cap: BUFF_CAP },
  // ROUND 76 (item 4) -- and the barrier counter, threaded and defaulted the
  // same way. The essence signature is a THIRD route into a kit, alongside the
  // stone sockets and the innates, and a cap that only one of the three
  // respects is not a cap.
  absorbState = { count: 0, cap: ABSORB_CAP },
  seedStr, stoneId = null, slotAttr = null, forcedKind = null,
}) {
  const list = signaturesFor(essDef);
  const pool = [];
  for (const entry of list) {
    const cat = ABILITY_CATEGORY_BY_KEY[entry.catKey];
    if (!cat) continue;
    if (forcedKind && cat.kind !== forcedKind) continue;
    if (cat.isAura && auraState.count >= auraState.cap) continue;
    if (cat.isPerception && perceptionState.count >= perceptionState.cap) continue;
    if (cat.isMovement && movementCount >= MOVEMENT_CAP) continue;
    if (cat.isBuff && buffState.count >= buffState.cap) continue;
    if (cat.key === 'self_active_absorb' && absorbState.count >= absorbState.cap) continue;
    // ROUND 74 (item 6) -- the weapon door, the same one tryCat holds. An
    // AUTHORED signature is still a weapon affinity when its category is one,
    // and the whole point of the rule is that there is no route to a weapon
    // bonus that does not pass a weapon.
    if (cat.isWeaponAffinity && !weaponForAffinity(STONE_CATALOG[stoneId], essDef)) continue;
    if (usedNames.has(entry.name)) continue;
    const spec = buildSignatureAbility(entry, essDef, stoneId, `${seedStr}|${entry.name}`, usedNames, { slotAttr });
    if (spec) pool.push(spec);
  }
  if (!pool.length) return null;
  let best = null, bestScore = -1;
  for (const c of pool) {
    const s = synergyScore(c, knownList) * 10 + (stableHash(seedStr + '|' + c.name) % 10);
    if (s > bestScore) { best = c; bestScore = s; }
  }
  return best;
}

// Builds the 6-8 candidate pool for one essence+stone socket. Half-ish
// active, half-ish passive by construction. Probe order: the stone's own
// bias categories first (round 6 -- "thematically appropriate to the
// essence and awakening stone used"), then aura/perception if the kit
// lacks one (the HWFWM every-kit-gets-both rule), then the hashed
// rotation.
// The user's round-17 floor: "each essence, awakening stone combination
// should have no less than 12 possible abilities."
export const CANDIDATE_FLOOR = 12;

/**
 * ROUND 49 -- THE LEVER GATE, and why exactly one category has one.
 *
 * The user, on the taunt lever: it "should mark an essence as protective."
 * Measured without this gate, it did not. 24% of the kits containing NO
 * protective essence still produced a taunt, against 34% of the kits that had
 * one -- a 1.4x edge, which is not a mark, it is a rounding error. The cause is
 * structural and pre-dates this round: the bias list only changes probe ORDER,
 * and once it is exhausted buildCandidatePool rotates through EVERY category to
 * reach round 17's hard floor of 12 candidates a socket. So any essence could
 * be handed any category eventually, and a Bat essence rolling a taunt is the
 * "mad libs" complaint the last round existed to remove, in a new place.
 *
 * The gate is deliberately narrow. It is not a general facility for restricting
 * categories -- everything else in the taxonomy is still reachable from every
 * essence, which is what keeps the floor achievable and the kits varied. It
 * applies to the ONE category that is a claim about the character rather than a
 * claim about the stone: anybody can carry a bolt made of any material, and not
 * anybody is the one who steps in front.
 *
 * Two escapes, both deliberate:
 *   - an essence with NO motif and no confluence theme (a caller passing a row
 *     from outside the catalog -- WorldScene's guard/NPC builders do this) is
 *     let through rather than silently losing a category, because a gate that
 *     fails closed on unknown input turns a data gap into a missing ability.
 *   - a CONFLUENCE is judged by its theme. A guard-themed confluence is the sum
 *     of three essences that voted guard (confluenceThemeForEssences), which is
 *     a stronger protective claim than any single motif makes; a strike-themed
 *     one has no business granting a taunt and does not.
 */
/**
 * ROUND 49 -- WHICH AWAKENING STONES CAN OPEN A LEVER AN ESSENCE DOES NOT HAVE.
 *
 * The user: "allies should have a chance to end up with stealth abilities
 * depending on awakening stones. Maybe some aura abilities, or intersections of
 * vast and the foot, master, or illusion/light based essences."
 *
 * The gate above is essence-only, which is correct for the PLAYER -- they pick
 * their essences and can go and find a rogue one. A companion cannot: their
 * three essences are fixed by who they are, so an essence-only gate means Zeke
 * can never learn to hide no matter what the player does for him. The stone is
 * the one half of the combination the player CAN change, so it is the right
 * place for the second door.
 *
 * Named stones, not a blanket "any stone may open any lever". A stone opens a
 * lever when the stone is ABOUT that lever, which keeps the gate meaning
 * something: Shadow, Glass and Mirage can teach an essence to hide; Iron cannot.
 *
 * The intersections the user names are here too -- Vast (distance stops being a
 * cost), Foot (the long march), Master (practiced mastery) and the light and
 * illusion stones. Those are the "you were already somewhere else" and "you have
 * done this ten thousand times" readings of stealth, as against the "you are in
 * the dark" one, and both are stealth.
 */
/**
 * ROUND 56 -- stones that FEED. Named by the user, plus the obvious neighbours
 * that would look strange left out once these are in.
 *
 * Kept as ids rather than as a family because that is the whole point: the
 * theme cuts across families, and every attempt to express "devouring" as a
 * family list either missed Bat and Spider or dragged in every flyer and
 * serpent in the catalogue.
 */
export const DEVOURING_STONES = [
  // the user's five
  'stoneFeast', 'stoneHunger', 'stoneBat', 'stoneUndeath', 'stoneSpider',
  // and their neighbours: blood already fed, these two simply say so
  'stoneBlood', 'stoneFlesh',
  // things that end something and keep part of it back
  'stoneBlight', 'stoneCorrupt', 'stoneReaper', 'stoneMalign', 'stoneVoid',
];
/** STONE_THEMES entries carry no id, so resolve one back by its word. Built
 *  once; a linear scan per candidate would be 180 string compares a socket. */
const _themeWordToId = (() => {
  const m = new Map();
  for (const [id, t] of Object.entries(STONE_THEMES)) if (t && t.word) m.set(t.word, id);
  return m;
})();
// Exported so the suite can prove the gate actually opens. The list is matched
// through the theme WORD, not the id, so an id that looks plausible but whose
// theme word never round-trips is a door that silently never opens -- four of
// the first draft's thirteen were exactly that, and nothing else catches it.
export function stoneIdOfTheme(stone) {
  return (stone && _themeWordToId.get(stone.word)) || null;
}

// ============================================================================
// ROUND 76 (item 3) -- THE DEVICE DOOR: WHO GETS TRAPS AND TURRETS.
//
// The user: "traps/turret stay rare except on bow, crossbow, technology,
// trap, charlatan, adept-style essences; goes with physical ranged and stealth
// builds."
//
// MEASURED FIRST, and the measurement inverted the job. Across 400 generated
// kits (8,000 abilities): ONE trap and TWO turrets, on essFox, essHand and
// essGun. The first half of the sentence -- "stay rare" -- was not merely
// satisfied, it was overshot into nonexistence. Round 75 shipped twenty-two
// trap designs with three delivery modes and a ballista, and a player would
// meet one about once every two hundred characters.
//
// So this is not a restriction. It is the SECOND half of the sentence, which
// was never built: rare everywhere, and CHARACTERISTIC on the essences the
// user named. The `craft` motif has biased both categories since round 75 and
// it changed nothing, for the reason rounds 56, 74, 75 and 76 have each
// rediscovered -- a bias competes for six seats against the essence's
// signature, the stone's lever and the rotation, and usually loses. Allowing
// is not reaching.
//
// TWO IDS IN THE USER'S LIST DO NOT EXIST, and they are written down here
// rather than quietly approximated:
//   - CROSSBOW is a weapon in this game, not an essence or a stone. The Bow
//     essence and the Bow stone are what the catalogue has that means it.
//   - CHARLATAN is an essence in the source material and is not in this
//     catalogue's 148. The nearest thing the game has is misdirection -- the
//     Mirror and Visage essences, which are literally about showing someone
//     something other than the truth -- so those stand in, and if a Charlatan
//     essence is ever added it goes in this list and nothing else changes.
const DEVICE_ESSENCES = [
  'essBow', 'essGun',            // "bow, crossbow"
  'essTechnology', 'essTrap',    // "technology, trap"
  'essAdept',                    // "adept-style"
  'essMirror', 'essVisage',      // the stand-in for "charlatan" -- see above
  'essNet', 'essHook',           // the snare-setters, which is what a trap IS
];
const DEVICE_STONES = [
  'stoneBow', 'stoneGun', 'stoneTechnology', 'stoneTrap', 'stoneAdept',
  'stoneMirror', 'stoneVisage', 'stoneNet', 'stoneHook', 'stoneTurtle',
];
// "goes with physical ranged and stealth builds" -- the build's SPINE, which
// is where "this trio is a ranged build" already lives (round 53). `stalk` is
// the hunting lever and `stealth` the hiding one.
const DEVICE_SPINE_LEVERS = ['stalk', 'stealth'];

/** Is this socket entitled to a device? Essence, or stone, or the build. */
export function deviceSocket(essId, stoneId, spine) {
  if (essId && DEVICE_ESSENCES.includes(essId)) return 'essence';
  if (stoneId && DEVICE_STONES.includes(stoneId)) return 'stone';
  if (Array.isArray(spine) && spine.some(l => DEVICE_SPINE_LEVERS.includes(l))) return 'spine';
  return null;
}

// ============================================================================
// ROUND 77 (item 6.1) -- A TWO-HANDED WEAPON IN ONE HAND.
//
// The user: "Strength related passives allowing the wielding of 2 handed
// weapons in 1 hand", obtainable from "Empower, Might, Juggernaut, Leviathan,
// Kraken, Minotaur, Wrath, Hand, Potent, Avatar".
//
// FOUR OF THOSE TEN ARE ESSENCES AND SIX ARE CONFLUENCES, and finding that out
// is the whole reason this list is split in two. Searching ESSENCE_CATALOG for
// the ten names returns four hits, which reads as "six of these do not exist"
// -- and that is what round 76 concluded about Charlatan, offering to add it as
// a new essence. It was wrong then and it would have been wrong here: Charlatan
// is in CONFLUENCE_CONCEPTS, and so are all six of these. They are essences you
// cannot buy; you get them by having the right three at once.
//
// Which makes this a BETTER ability than it would have been with ten flat
// sources. Four essences put it within reach of anyone who finds one of them;
// six confluences make it something a whole build arrives at.
//
// THE MECHANIC ALREADY EXISTS AND HAS NEVER BEEN READ. Round 74 wrote
// `canBeWieldedOneHanded(wid)` in weapons.js against exactly this ask -- "a
// one-handed exemption applies to a weapon only if that weapon is two-handed
// AND NOT RANGED" -- and asked the user which weapons it should free. They
// answered hammer and scythe. That function has been correct and unread for
// three rounds; this is the ability that calls it.
// ============================================================================

/** The three the player can find in the world.
  *
  * ROUND 78 -- `avatar` LEFT THIS LIST AND JOINED THE ONE BELOW. Round 77 read
  * the user's ten names against both catalogues and found Avatar in each, so it
  * was filed as an essence route. Round 78's bug 2 -- "Avatar should be
  * exclusively a confluence essence" -- settles which one they meant: the
  * essence has been renamed Aspect, and Avatar is the confluence. So the route
  * moves rather than disappearing, and the ability still reaches all ten of the
  * sources they named.
  *
  * The Avatar STONE keeps its name and its route (see HEAVY_HAND_STONES): the
  * user's correction is that stones may share a name with a confluence.
  */
export const HEAVY_HAND_ESSENCES = ['might', 'essHand', 'essPotent'];
/** And the seven they can only arrive at. Names, because a confluence is
 *  identified by its name everywhere else in this file. */
export const HEAVY_HAND_CONFLUENCES = ['Empower', 'Juggernaut', 'Leviathan', 'Kraken', 'Minotaur', 'Wrath', 'Avatar'];
/**
 * Stones that carry the same claim. A stone is the other half of every socket,
 * and leaving it out entirely would mean the ability was reachable from four
 * essences and nothing else -- which is how round 76's traps ended up at one
 * per four hundred kits.
 *
 * THE FOUR NAMED ONES AND NOTHING ELSE. The first draft added six more that
 * merely sound strong -- Hammer, Axe, Bear, Ape, Cattle, Iron -- and measured
 * at 179 kits in 400. Forty-five percent of every build in the game wielding a
 * scythe one-handed is not the "strength related passive" the user asked for,
 * it is the default. A stone that sounds strong is not one of the ten sources
 * they named, and the honest reading of a named list is that it is the list.
 */
export const HEAVY_HAND_STONES = ['stoneMight', 'stoneHand', 'stonePotent', 'stoneAvatar'];

/**
 * May this socket carry the one-handed-two-hander passive?
 *
 * Returns the REASON rather than a boolean, because "you got this from the
 * confluence" and "you got this from a Might essence" are different facts
 * about a build and the description says which.
 *
 * THE CONFLUENCE ROUTE BELONGS TO THE CONFLUENCE SOCKET. `essId` is
 * `'confluence'` on the fourth slot and an ordinary essence id on the other
 * three, so the route only opens where the confluence actually is. The first
 * version tested `confluenceName` regardless of which socket was asking, which
 * meant a Wrath build could produce the passive from all sixteen of its
 * sockets -- and combined with the missing category door below, 34% of every
 * kit in the game had it.
 */
export function heavyHandSocket(essId, stoneId, confluenceName) {
  if (essId && HEAVY_HAND_ESSENCES.includes(essId)) return 'essence';
  if (essId === 'confluence' && confluenceName && HEAVY_HAND_CONFLUENCES.includes(confluenceName)) return 'confluence';
  if (stoneId && HEAVY_HAND_STONES.includes(stoneId)) return 'stone';
  return null;
}

// ============================================================================
// ROUND 77 (item 6.3) -- WATER WALKING.
//
// The user: "Water walking, ability to cross water (later ranks have bonuses
// from standing on water or swamp tiles)".
//
// Two halves, and the second is the interesting one: crossing water is a
// TRAVERSAL power, which is worth a great deal in a world with three lakes, a
// river system, an ocean coast and a bog across the west of Bratugal -- and
// worth nothing at all in a fight. The rank bonuses are what make it a combat
// ability as well, and they only pay while you are standing on the thing the
// first half let you stand on. A build that takes this to Gold is a build that
// fights on the water on purpose.
// ============================================================================
// The user named no essences for this one, so the list is argued rather than
// quoted -- and kept SHORT for the same reason the heavy-hand stone list was
// cut. A traversal power that half the builds in the game have is not a power,
// it is the movement rules. These are the essences that are about the water
// itself, plus the one that is about a hull sitting on top of it.
export const WATER_WALK_ESSENCES = [
  'essWater', 'essIce', 'essShip', 'essDeep',
  'essFish', 'essShark', 'essWhale', 'essManatee',
];
export const WATER_WALK_CONFLUENCES = ['Ocean', 'Leviathan', 'Kraken', 'Oasis', 'Tranquil'];
export const WATER_WALK_STONES = ['stoneWater', 'stoneIce', 'stoneShip', 'stoneDeep'];

export function waterWalkSocket(essId, stoneId, confluenceName) {
  if (essId && WATER_WALK_ESSENCES.includes(essId)) return 'essence';
  if (essId === 'confluence' && confluenceName && WATER_WALK_CONFLUENCES.includes(confluenceName)) return 'confluence';
  if (stoneId && WATER_WALK_STONES.includes(stoneId)) return 'stone';
  return null;
}

/** One per kit for each. Both are BINARY powers -- you can wield a scythe in
 *  one hand or you cannot, you can cross water or you cannot -- so a second
 *  copy is a wasted socket rather than a stronger build, which is exactly the
 *  shape of thing round 76's absorb cap was written for. */
export const HEAVY_HAND_CAP = 1;
export const WATER_WALK_CAP = 1;

// ============================================================================
// ROUND 76 (item 4) -- HOW MANY BARRIERS ONE KIT MAY HOLD.
//
// The user: "self_active_absorb massively overrepresented -- should be a
// generally once per kit item outside of a build looking to specialize in
// magical defense."
//
// MEASURED: 397 absorb shields across 400 kits -- 0.99 per kit on average,
// which sounds like the ask and is not it. The distribution is what matters:
//
//     shields in a kit :  0    1    2   3   4
//     kits             : 122  184   71  20   3
//
// Ninety-four kits in four hundred -- one in four -- carried two or more, and
// 4.97% of every ability in the game was an absorb shield. "Generally once per
// kit" is a statement about the SHAPE of that distribution, not about its
// mean, and the mean was hiding it.
//
// So it takes a kit-level counter, threaded exactly as the aura, perception
// and buff counters are (round 47's pattern, used a fourth time). The cap is 1
// -- and 3 for the build the user carved out, which is identified by the
// `ward` lever reaching the trio's SPINE. That is the game's own existing
// answer to "is this build about magical defence": ward is the barrier lever,
// and a spine is what three essences agreed on.
export const ABSORB_CAP = 1;
export const ABSORB_CAP_SPECIALIST = 3;
/** The cap this trio earns. `ward` in the spine is the specialist. */
export function absorbCapFor(spine) {
  return (Array.isArray(spine) && spine.includes('ward')) ? ABSORB_CAP_SPECIALIST : ABSORB_CAP;
}

export const LEVER_STONE_KEYS = {
  // Every id here is checked against STONE_CATALOG by the suite. The first
  // draft named six stones that do not exist (Shadow, Night, Mirage, Prism,
  // Illusion, Master) -- a dead id in a gate list is a door that silently never
  // opens, which is worse than no door, so the suite asserts they all resolve.
  stealth: [
    // in the dark
    'stoneDark', 'stoneSmoke', 'stoneVoid', 'stoneMalign',
    // illusion and light -- the eye is told something other than the truth
    'stoneGlass', 'stoneShimmer', 'stoneLight', 'stoneCrystal', 'stoneMoon', 'stoneEcho',
    // the user's own intersections: distance, the march, and practised skill.
    // "intersections of vast and the foot, master, or illusion/light based
    // essences" -- Adept is the catalog's word for mastery ("practiced
    // mastery"), so it stands in for the Master the user named.
    'stoneVast', 'stoneFoot', 'stoneAdept', 'stoneDance', 'stoneSwift',
    // and the creatures that do it by nature
    'stoneCat', 'stoneFox', 'stoneMouse', 'stoneSpider', 'stoneBat', 'stoneSnake', 'stoneKnife',
  ],
  // ROUND 55 -- THE MENDING DOOR. The user's two worked examples both name a
  // STONE rather than an essence: "Growth essence with a LIFE awakening stone",
  // "A troll essence with a BLOOD awakening stone". That is the right gate.
  // `renew` is authored onto one motif in 146 and reaches a build's spine about
  // 3% of the time, so gating the growth-bloom and the troll-reflex on the
  // spine alone made both effectively unreachable -- measured at 1 and 0 across
  // 4,000 generated abilities. A stone that is ABOUT regrowth teaches regrowth
  // to whatever it is set into, which is round 49's stone-door rule applied to
  // the mechanic the user actually asked for.
  renew: [
    // living green -- the growth example's own stone is in here by name
    'stoneGrowth', 'stoneLife', 'stonePlant', 'stoneRebirth', 'stoneRenewal',
    'stoneTree', 'stoneBrush', 'stoneCrops', 'stoneHealer', 'stoneWood',
    // blood, which is where the troll example lives
    'stoneBlood', 'stoneFlesh', 'stoneFeast',
    // water and light, the other two families that mend by nature
    'stoneWater', 'stoneRain', 'stoneDeep', 'stoneCoral', 'stoneManatee',
    'stonePure', 'stoneSun', 'stoneCelestial',
  ],
};

/** Does this stone open `lever` on an essence that does not carry it? */
export function stoneOpensLever(lever, stoneId) {
  const keys = LEVER_STONE_KEYS[lever];
  return !!(keys && stoneId && keys.includes(stoneId));
}

export function categoryAllowedFor(cat, essDef, stoneId = null, spine = null) {
  const lever = cat && cat.leverGate;
  if (!lever) return true;
  // THE STONE'S DOOR. Checked first and on its own terms: a stone that is about
  // hiding teaches hiding, whatever it is bonded to.
  if (stoneOpensLever(lever, stoneId)) return true;
  const motif = effectiveMotif(essDef, spine);
  if (motif) return motif.levers.includes(lever);
  if (essDef && essDef.id === 'confluence') return essDef.theme === LEVER_THEME[lever];
  return true;
}

/**
 * ROUND 51 -- can this finished ability hurt something?
 *
 * Asked of the SPEC rather than of its category, because the category records
 * what was asked for and the essence-flavour pass (applyEssenceFlavour) can add
 * a payload to something that had none -- a mend lever puts healOnUse on an
 * active, a linger lever puts a dot on a strike. Reading the spec is the only
 * way to answer honestly.
 *
 * A weapon affinity and a bonded familiar both count. The user's rule was
 * "guarantee one damage option", and a build whose damage comes out of a
 * conjured sword or a familiar has one.
 */
export function abilityDeals(a) {
  if (!a) return false;
  if (typeof a.base === 'number' && a.base > 0) return true;
  if (a.dot && a.dot.dmgPerTick > 0) return true;
  if (typeof a.familiarDmg === 'number' && a.familiarDmg > 0) return true;
  if (typeof a.tickAmount === 'number' && a.tickAmount > 0 && a.auraEffect === 'damage') return true;
  if (a.template === 'weaponAffinity' || a.template === 'summonWeapon') return true;
  if (typeof a.thornsFrac === 'number' && a.thornsFrac > 0) return true;
  return false;
}

/**
 * ROUND 51 -- the essence's charter, cached per essence id.
 *
 * Built from the motif levers, so all 146 essences get one without a line of
 * per-essence authoring. A confluence, or anything a caller hands in from
 * outside the catalog, gets an EMPTY charter -- which charterAllows reads as
 * "no opinion" and lets everything through. That is deliberate: a confluence is
 * a third thing made of three essences and should not inherit their refusals,
 * and an unknown essDef must never be silently stripped to nothing.
 */
// ROUND 51 -- how many candidates in one pool may share a template.
// See the note in tryCat.
const POOL_TEMPLATE_CAP = 2;
const _charterCache = new Map();
export function charterForPool(essDef, stoneId, spine = null) {
  const base = charterForEssence(essDef, spine);
  if (!stoneId) return base;
  let opened = null;
  for (const lever of Object.keys(LEVER_STONE_KEYS)) {
    if (!stoneOpensLever(lever, stoneId)) continue;
    const c = LEVER_CHARTERS[lever];
    if (!c) continue;
    if (!opened) opened = { allow: new Set(base.allow), deny: base.deny, empty: base.empty };
    for (const f of c.may) opened.allow.add(f);
  }
  return opened || base;
}

export function charterForEssence(essDef, spine = null) {
  const id = essenceIdOf(essDef);
  // ROUND 53 -- the cache key carries the spine. An essence's charter is no
  // longer a property of the essence alone: the same Fire beside two burst
  // essences may produce things it could not produce beside two menders, and a
  // cache keyed on the id alone would hand the first build's answer to the
  // second. This is the whole reason charters are built from ACTIVE levers
  // rather than from the full repertoire -- see activeLeversFor. Widening what
  // an essence can reach must not widen what it may produce until the build
  // has earned it, or round 51's refusals evaporate on contact.
  const key = id ? `${id}|${(spine || []).join(',')}` : null;
  if (key && _charterCache.has(key)) return _charterCache.get(key);
  const motif = effectiveMotif(essDef, spine);
  const ch = charterFor(motif ? motif.levers : null);
  if (key) _charterCache.set(key, ch);
  return ch;
}

export function buildCandidatePool({
  essDef, stoneId, variantIndex, usedNames, auraState, perceptionState, movementCount,
  // ROUND 47 -- the shared buff counter, same threading as auraState and
  // perceptionState. Defaulted for callers outside rebuildKnownAbilities
  // (WorldScene's guard/NPC kit builders), which then get a per-call budget
  // rather than a crash.
  buffState = { count: 0, cap: BUFF_CAP },
  // ROUND 56 -- how many STONE-DOOR abilities the kit has taken so far, and
  // how many it may. See tryStoneDoor: the reserved seat is a kit-level
  // guarantee, threaded the same way auraState and buffState are, and defaulted
  // for callers outside rebuildKnownAbilities so they get a per-call budget
  // rather than a crash.
  doorState = { count: 0, cap: STONE_DOOR_CAP },
  // ROUND 76 (item 5) -- how many reserved SUPPORT seats the kit has spent,
  // and how many it may. Same threading and same defaulting as doorState
  // directly above. See SUPPORT_SEAT_CAP.
  supportState = { count: 0, cap: SUPPORT_SEAT_CAP },
  // ROUND 76 -- does the kit still owe a socket-granted signature? While it
  // does, the two seats this round added are not built at all. Yielding in the
  // SCORER was not enough: a seat that loses on score has still occupied a
  // pool slot and can still outscore the signature on synergy alone, and
  // test_round16's floor (min 1 signature per kit) stayed broken. Not building
  // it makes the pool byte-identical to the one before these seats existed,
  // which is the only version of "stand aside" that is actually true.
  owesSignature = false,
  // ROUND 76 (item 4) -- how many absorb shields the kit has taken, and how
  // many it may. Same threading as auraState/buffState/doorState above, and
  // defaulted the same way so the guard and NPC kit builders get a per-call
  // budget rather than a crash. See ABSORB_CAP.
  absorbState = { count: 0, cap: ABSORB_CAP },
  // ROUND 75 -- has this socket already rolled RARE? The stacking family is
  // `rareOnly` and is offered on no other seat, so the pool has to know before
  // it is built. Defaulted false, so the guard and NPC kit builders (which do
  // not roll rarity at all) simply never see one -- which is right: a town
  // guard should not be running Jason's Sin.
  rare = false,
  // ROUND 76 -- the kit's three essence ids, so a CONFLUENCE socket can ask
  // what its parents summon. Defaulted empty: a caller that does not pass them
  // gets a confluence that summons nothing, which is the old behaviour and is
  // safe rather than wrong.
  essenceIds = [],
  // ROUND 77 (items 6.1, 6.3) -- the two power seats, threaded exactly as
  // doorState and supportState are and defaulted the same way, so the guard and
  // NPC kit builders get a per-call budget rather than a crash. Six of the ten
  // sources the user named for 6.1 are CONFLUENCES, so the confluence's name
  // has to reach the pool: defaulted null, which simply means those six routes
  // are closed for a caller that does not know its confluence.
  heavyHandState = { count: 0, cap: HEAVY_HAND_CAP },
  waterWalkState = { count: 0, cap: WATER_WALK_CAP },
  confluenceName = null,
  ownedAuras, ownedPerception, slotAttr,
  // ROUND 53 -- what this BUILD's three essences agreed on. Supplied by
  // rebuildKnownAbilities, which computes it once for the whole kit. Absent for
  // callers outside it (WorldScene's guard and NPC kit builders), which then
  // generate from the essence's authored core exactly as before.
  spine = null,
  // ROUND 51 -- the kit-level one-damage-option guarantee. rebuildKnownAbilities
  // sets this once it can see the kit is running out of sockets without a way
  // to hurt anything; while it is true the charter's damage refusal is lifted
  // for this pool only. The user's answer to the round-51 scoping question was
  // "yes [a build may be pure support], but guarantee one damage option".
  needDamage = false,
}) {
  const comboSeed = variantIndex ? `${essDef.id}|${stoneId}|v${variantIndex}` : `${essDef.id}|${stoneId}`;
  const seed = stableHash(comboSeed);
  const stone = STONE_THEMES[stoneId];
  // ROUND 17 -- the user raised the floor: "each essence, awakening stone
  // combination should have no less than 12 possible abilities." The pool
  // was 6-8 (3-4 active + 3-4 passive); it is now 12-14 (6-7 of each).
  // There are 16 active and 10 passive categories to draw from (round 27
  // added the armour buff and the sunder strike), so a pool
  // that size is still filled with genuinely distinct candidates rather
  // than padded with near-duplicates -- and the synergy scorer downstream
  // now has twice as much to choose between, which is the point.
  const nActive = 6 + (seed % 2);
  const nPassive = 6 + (stableHash(comboSeed + '|np') % 2);
  const pool = [];
    // ROUND 51 -- THE STONE GETS A VOTE ON THE CHARTER, exactly as it already
  // gets one on the lever gate (categoryAllowedFor's "the stone's door").
  //
  // Caught by round 49's own assertion: "an essence with no stealth lever can
  // roll it off the right stone" went to 0 of 6 the moment the charter landed,
  // because the charter was built from the ESSENCE's levers alone and stealth
  // is not one of Foot's. That is the wrong reading of what a socket is. A
  // Stone of Sin set into an essence that has never punished anybody for moving
  // is exactly the interesting case, and the whole point of the round-51 model
  // is that the stone TRANSFORMS rather than relabels.
  //
  // So a lever the stone opens contributes its `may` families to this pool's
  // charter -- and only to this pool's. Its `mayNot` is deliberately NOT
  // applied: a stone widens what an essence can do, it does not get to take
  // away what the essence already was.
  const charter = charterForPool(essDef, stoneId, spine);   // ROUND 51, spine ROUND 53
  const tryCat = (cat, opts = {}) => {
    if (!cat) return false;
    // ROUND 49 -- THE LEVER GATE. See categoryAllowedFor: a lever-gated
    // category is offered only by essences that carry the lever. Checked here
    // because tryCat is the single funnel every non-signature path runs
    // through -- the bias list, the rotation and round 17's top-up -- so one
    // line covers all three and there is no route around it.
    // ROUND 49 -- the stone gets a vote on the lever gate now, so pass it.
    if (!categoryAllowedFor(cat, essDef, stoneId, spine)) return false;
    // ROUND 51 -- THE CHARTER. The lever gate above asks "has this essence
    // earned this category"; this asks the prior question, "is this the KIND of
    // thing this essence does at all". See leverCharters.js for why the second
    // question did not exist until now and what it cost.
    //
    // Two exemptions, both kit-shape guarantees that outrank identity:
    // `_allowCompleting` is the round-47 aura/perception probe, and `needDamage`
    // is the one-damage-option floor.
    //
    // The third exemption is round 49's stone door, kept absolute. A category
    // with a `leverGate` is one the essence has to EARN, and round 49's rule
    // was that a stone which opens that lever teaches it "whatever it is bonded
    // to". Widening the charter with the opened lever's `may` families (see
    // charterForPool) is not enough on its own, because a deny still beats an
    // allow and four of the six essences in round 49's own probe carry `taunt`,
    // which refuses `stealth`. Measured: the assertion went from 6 of 6 to 2 of
    // 6. A player who sockets a Stone of Shadow into a Shield essence is
    // deliberately building a tank that hides, and that is the whole point of
    // the socket.
    const stoneDoor = cat.leverGate && stoneOpensLever(cat.leverGate, stoneId);
    if (!charterAllows(charter, cat.key)
        && !(opts.completing) && !(opts.offCharter) && !stoneDoor
        && !(needDamage && categoryDeals(cat.key))) return false;
    if (cat.isAura && auraState.count >= auraState.cap) return false;
    if (cat.isPerception && perceptionState.count >= perceptionState.cap) return false;
    if (cat.isMovement && movementCount >= MOVEMENT_CAP) return false;
    if (cat.isBuff && buffState.count >= buffState.cap) return false;
    // ROUND 76 (item 4) -- the barrier cap. Placed with the other kit-shape
    // gates and NOT inside the generator, for the same reason the weapon door
    // below is: a category that must not appear should never be BUILT and then
    // discarded, or it costs a pool seat that another ability could have had.
    if (cat.key === 'self_active_absorb' && absorbState.count >= absorbState.cap) return false;
    // ROUND 77 -- the two power caps, HERE and not only at the seat.
    //
    // The first version checked the cap where the seat is built, which reads
    // as sufficient and is not: `tryCat` is the funnel for the bias list, the
    // rotation AND round 17's kind-floor top-up, and the top-up reaches a
    // category without going anywhere near its reserved seat. Measured with the
    // check only at the seat: 19 kits in 400 held two or three of these, and
    // one held three -- three separate abilities all claiming to let you wield
    // a scythe one-handed. Round 76 wrote the absorb cap directly above for
    // exactly this reason and I put mine in the wrong place anyway.
    if (cat.key === 'two_hand_wield' && heavyHandState.count >= heavyHandState.cap) return false;
    if (cat.key === 'water_walk' && waterWalkState.count >= waterWalkState.cap) return false;
    // ROUND 77 -- AND THE DOOR, which is the half I first left out entirely.
    //
    // The reserved seat puts these in the pool for an entitled socket. It does
    // NOT keep them out of anyone else's pool, because `tryCat` is also the
    // funnel for the bias list, the rotation and round 17's kind-floor top-up,
    // and all three will happily offer any category the charter allows.
    // `passive buff` and `movement` are allowed almost everywhere.
    //
    // Measured with the seat alone: 137 kits in 400 had the one-handed passive
    // and 149 had water walking -- and EVERY LAST ONE came from the confluence
    // socket via the top-up, on essences with nothing to do with either. A
    // Blight stone was producing water walking.
    //
    // This is the weapon door six lines below, for the same reason and in the
    // same place: a category the socket is not entitled to should never be
    // BUILT, so the seat it would have taken goes to something the socket can
    // actually justify.
    if (cat.key === 'two_hand_wield'
      && !heavyHandSocket(essenceIdOf(essDef), stoneId, confluenceName)) return false;
    if (cat.key === 'water_walk'
      && !waterWalkSocket(essenceIdOf(essDef), stoneId, confluenceName)) return false;
    // ROUND 74 (item 6) -- THE WEAPON DOOR. "weapon bonus effects need to come
    // from either the appropriate weapon essence or awakening stone of that
    // weapon." A socket where neither the essence nor the stone IS a weapon
    // does not roll a weapon affinity at all -- it rolls something else, from
    // the same pool, and the seat is not wasted. This is a refusal and not a
    // correction on purpose: picking a "best guess" weapon for a Magic x Fire
    // socket is exactly what produced the spear the user was looking at.
    //
    // Placed with the other category gates rather than inside the generator,
    // because a category that must not appear should never be BUILT and then
    // discarded -- the pool has 6-8 seats and a discarded candidate is a seat
    // spent on nothing.
    if (cat.isWeaponAffinity && !weaponForAffinity(stone, essDef)) return false;
    // ROUND 75 -- THE RARE DOOR. A `rareOnly` category is offered only when the
    // socket has already rolled rare (1 in 40). Refused here with the other
    // category gates rather than filtered out of the finished pool, for the
    // reason the weapon door gives directly above: a candidate that must not
    // appear should never be BUILT, because the pool has 6-8 seats and one
    // spent on a discard is a seat the kit does not get back.
    if (cat.rareOnly && !rare) return false;
    const spec = generateCategoryAbility(cat.key, essDef, stoneId, comboSeed, usedNames,
      // ROUND 77 -- the two power seats pass their ROUTE through, so the
      // generated ability can say whether it came from the essence, the
      // confluence or the stone. Undefined for every other category, which is
      // what the spec builders default on.
      { slotAttr, avoidNames: new Set(pool.map(p => p.name)), spine, essenceIds,
        heavyHandSource: opts.heavyHandSource, waterWalkSource: opts.waterWalkSource });   // ROUND 52, spine 53, essenceIds 76
    // ROUND 53 -- a nameless candidate poisons the kit selector. attr_boost
    // can return name === null when its authored bank is exhausted, and
    // synergyScore ends with `stableHash(c.name) % 10`, which on undefined
    // yields NaN -- so `s > bestScore` is false for EVERY candidate and the
    // selector hands back null. It surfaced this round only because the
    // kind-floor top-up probes the passive categories harder than anything did
    // before. Refuse it here, where every other malformed candidate is refused.
    if (!spec.name) return false;
    if (usedNames.has(spec.name)) return false;
    if (pool.some(p => p.name === spec.name)) return false;
    // ROUND 51 -- ONE SHAPE, TWICE AT MOST.
    //
    // Six of the 48 categories generate a projectileBall and four generate an
    // aoeRing, so a damage essence could be offered five bolts in a pool of
    // thirteen and the synergy scorer would be choosing between near-identical
    // things. Measured across 1,200 abilities, projectileBall alone was 16.3%
    // of everything generated -- more a property of the category list than of
    // anyone's build.
    //
    // Two rather than one: two bolts with different riders is a real choice
    // (a leeching one and a chaining one are not the same ability), three is
    // padding. The completing and damage-guarantee probes are exempt for the
    // same reason they are exempt from the charter -- a kit-shape floor
    // outranks variety.
    // `opts.topup` is round 17's hard floor pass ("each essence, awakening stone
    // combination should have no less than 12 possible abilities" -- the user's
    // own number). Five of the categories generate a triggeredPassive and four
    // an aoeRing, so a narrow charter plus this cap could not always reach
    // twelve: measured, 252 of 3,796 pools fell short, the worst at seven. The
    // floor wins over the variety cap, which is the right order -- a pool that
    // is one shape twice is worse than a pool with two of a shape in it.
    if (!opts.completing && !opts.topup && !(needDamage && categoryDeals(cat.key))
        && pool.filter(p => p.template === spec.template).length >= POOL_TEMPLATE_CAP) return false;
    // ROUND 49 -- mark a candidate whose category is here ONLY because the
    // STONE opened its lever. synergyScore pays that a bonus, because a stone
    // socketed into an essence that cannot use it on its own was socketed on
    // purpose. Computed here, where both halves are in scope, rather than
    // re-derived in the scorer.
    if (cat.leverGate && stoneOpensLever(cat.leverGate, stoneId)
        && !categoryAllowedFor(cat, essDef, null, spine)) {
      spec._leverByStone = cat.leverGate;
    }
    pool.push(spec);
    return true;
  };
  // ROUND 48 -- this line WAS the entire bias system, and it read only the
  // stone: 100% of the category pressure on a socket came from the awakening
  // stone, which is precisely why four essences on one stone produced one
  // mechanic. mergedBiasKeys now leads with the ESSENCE's levers -- two of its
  // categories for every one of the stone's -- so an Ape slot leans reach,
  // company and force whatever stone is in it, and the stone decides what those
  // are made of. It degrades to the old stone-only order for any essDef with no
  // motif (a confluence, or a caller passing something outside the catalog).
  const biasCats = mergedBiasKeys(essDef, stone, stoneId, spine).map(k => ABILITY_CATEGORY_BY_KEY[k]).filter(Boolean);

  // ROUND 16 -- one active and one passive slot of every pool are reserved
  // for an ESSENCE SIGNATURE (essenceAbilities.js). This is what makes a
  // socket's grant depend on the essence and not just the stone: the same
  // Awakening Stone of Sword offers "Flame Lash" in a Fire slot and
  // "Groundbreaker" in a Might slot, and the synergy scorer downstream
  // decides whether the signature or a stone-themed candidate wins. Pool
  // size is unchanged (still 6-8) -- a signature takes a slot, it doesn't
  // add one.
  const trySignature = (kind) => {
    const list = signaturesFor(essDef);
    if (!list.length) return false;
    const start = stableHash(comboSeed + '|sig' + kind);
    for (let i = 0; i < list.length; i++) {
      const entry = list[(start + i) % list.length];
      const cat = ABILITY_CATEGORY_BY_KEY[entry.catKey];
      if (!cat || cat.kind !== kind) continue;
      // ROUND 51 -- a signature is authored for the essence, but it is still
      // subject to the essence's own charter: several hand-authored pools carry
      // a ranged_damage entry for essences that should not produce one, and a
      // signature slipping past the refusal would be the one hole big enough to
      // put a bolt in every kit through.
      if (!charterAllows(charter, cat.key)
          && !(cat.leverGate && stoneOpensLever(cat.leverGate, stoneId))
          && !(needDamage && categoryDeals(cat.key))) continue;
      if (cat.isAura && auraState.count >= auraState.cap) continue;
      if (cat.isPerception && perceptionState.count >= perceptionState.cap) continue;
      if (cat.isMovement && movementCount >= MOVEMENT_CAP) continue;
      if (cat.isBuff && buffState.count >= buffState.cap) continue;
      // ROUND 76 (item 4) -- the barrier cap holds against SIGNATURES too. A
      // cap the signature path walks around is a cap on two thirds of the
      // sockets, and signatures are the abilities a player actually notices.
      if (cat.key === 'self_active_absorb' && absorbState.count >= absorbState.cap) continue;
      if (cat.isWeaponAffinity && !weaponForAffinity(stone, essDef)) continue;   // ROUND 74
      if (usedNames.has(entry.name)) continue;
      if (pool.some(p => p.name === entry.name)) continue;
      const spec = buildSignatureAbility(entry, essDef, stoneId, `${comboSeed}|sig|${entry.name}`, usedNames, { slotAttr, spine });
      if (!spec) continue;
      pool.push(spec);
      return true;
    }
    return false;
  };

  // ROUND 56 -- THE STONE DOOR GETS A RESERVED SEAT, for the same reason the
  // aura and the perception got one in round 47.
  //
  // Round 49's promise is that the right stone teaches an essence something its
  // own levers never had -- a Stone of Glass in a Heal essence can produce a
  // veil. tryCat has always ALLOWED that (the `stoneDoor` exemption above), but
  // allowing is not reaching: the door category still had to win a seat in a
  // pool of 6-7 per kind, against the essence's bias list and a rotation over
  // every category there is. Round 55 added four categories and round 56 six
  // more, and every one of them is another competitor for those seats.
  //
  // Measured: round 49's own probe ("an essence with no stealth lever can roll
  // it off the right stone") went 6 of 6 -> 3 of 6 across those two rounds, and
  // the pool it fell out of shows exactly what displaced it -- reflect_spell,
  // reflect_damage and triggered_regen_on_hit sitting where the veil had been.
  // Left alone this erodes again every round the roster grows, which makes it a
  // structural problem rather than a tuning one.
  //
  // So: one seat per kind, probed before the bias fill, for a category this
  // STONE opens and this ESSENCE could not reach on its own.
  //
  // And the seat is KIT-LEVEL, threaded in exactly as `ownedAuras` is, not
  // per-socket. The first version of this reserved it on every socket holding a
  // matching stone, and 21 of the ~180 stones open `renew`, so across sixteen
  // sockets nearly every kit hit one: bloom_field went from 14% of builds to
  // 59% in a single change. That is round 53's lesson again -- a guarantee
  // applied uniformly makes builds alike, and uniformity is not distinctiveness.
  // The socket a player DELIBERATELY built for is the interesting case; a stone
  // that happens to match is not, and the rotation already serves that one.
  const stoneDoorCats = ABILITY_CATEGORIES.filter(c =>
    c.leverGate && stoneOpensLever(c.leverGate, stoneId)
    && !categoryAllowedFor(c, essDef, null, spine));
  const tryStoneDoor = (kind) => {
    if (doorState.count >= doorState.cap) return false;
    const start = stableHash(comboSeed + '|door' + kind);
    for (let i = 0; i < stoneDoorCats.length; i++) {
      const cat = stoneDoorCats[(start + i) % stoneDoorCats.length];
      if (cat.kind !== kind) continue;
      if (tryCat(cat)) { pool[pool.length - 1]._doorReserved = true; return true; }
    }
    return false;
  };

  // ===== ROUND 76 (item 2) -- THE SUMMON SEAT ==============================
  //
  // The user: "Not every build needs multiple summons, but it should be very
  // possible for a build to end up with 6-8 constant summons and 2-4 short
  // duration summons and be a 'Minion build'."
  //
  // MEASURED BEFORE THIS: `summon_creature` was 25 abilities in 10,000 -- one
  // kit in twenty. Six in one kit was not unlikely, it was arithmetically out
  // of reach. The category generated correctly and simply never won a seat:
  // the pool has six to eight, and a summon competes against the essence's
  // signature, the stone's lever and the rotation for every one of them.
  //
  // So it gets a reserved seat, exactly as the stone door (round 56), the
  // attack floor (round 74) and the rare seat (round 75) do -- and for the
  // reason all three of those exist: ALLOWING IS NOT REACHING.
  //
  // GATED ON THE ESSENCE, which is what keeps "not every build" true. The seat
  // is offered only when this socket's essence actually binds to a creature
  // (94 of the 148 do -- a Paper essence summons nothing and asks for no
  // seat), and only while the charter agrees the essence is the summoning
  // kind. A Sword essence with a Bull stone still gets no minions.
  if (summonCreatureFor(essenceIdOf(essDef), essenceIds)) {
    const cat = ABILITY_CATEGORY_BY_KEY.summon_creature;
    if (cat && tryCat(cat)) pool[pool.length - 1]._summonSeat = true;
  }

  // ===== ROUND 76 (item 5) -- THE SUPPORT SEAT ==============================
  //
  // "Add AOE_HOT, AOE_Heal, party_Buff, AOE_Debuff to enable healing and
  // support kits."
  //
  // ENABLE is the operative word, and three of the four already existed. What
  // did not exist was any way to REACH them: 22 heal pulses, 25 bloom fields
  // and 41 weakens across 400 kits, against 338 self-only heals. A player who
  // wants to be the healer could take a Life essence, a Healer stone and a
  // Growth confluence and still come out with four abilities that mend nobody
  // but themselves.
  //
  // So a socket whose essence or stone is ABOUT mending or about the team gets
  // a support seat, on the same terms as the device seat above. The gate is
  // the game's own vocabulary rather than a new list: the `mend`, `renew` and
  // `allies` levers are what "this essence heals" and "this essence is about
  // the party" already mean, in the essence's own repertoire or in the trio's
  // spine.
  //
  // ONE of the four by seed, for the reason the rare and device seats give:
  // four support candidates in one pool would crowd out everything else the
  // socket is choosing between, and they are close enough in purpose that
  // offering all four mostly spends seats to duplicate a decision.
  const supportLevers = ['mend', 'renew', 'allies'];
  // `effectiveMotif` rather than the raw repertoire, and for round 53's
  // reason: an essence's ACTIVE levers are its authored core plus whatever the
  // trio agreed on, and asking the full repertoire would say every essence
  // with `mend` anywhere in reach is a healer. This is the same function
  // charterForEssence uses, so the seat and the charter cannot disagree about
  // what this essence is.
  const _motif = effectiveMotif(essDef, spine || []);
  const ownLevers = (_motif && _motif.levers) || [];
  // NO SEPARATE SPINE BRANCH, and that is deliberate. `effectiveMotif` already
  // folds in whichever spine levers this essence can actually REACH, so a trio
  // that agreed on `mend` gives the seat to the essences capable of mending and
  // not to the Axe standing beside them -- which is round 53's own sentence
  // ("the trio agreeing on `mend` does not teach an Axe essence to heal").
  //
  // The first draft tested the raw spine as a second route. Measured, it took
  // support abilities to 630 across 400 kits with 44% of kits holding two or
  // more -- support outnumbering self-only heals two to one, which is the
  // original complaint inverted rather than fixed.
  const supportVia = supportLevers.some(l => ownLevers.includes(l)) ? 'essence'
    : (stoneOpensLever('renew', stoneId) ? 'stone' : null);
  if (supportVia && !owesSignature && supportState.count < supportState.cap) {
    // WHICH OF THE FOUR -- and it prefers one the kit does not already hold.
    //
    // Seeded alone, a dedicated healer trio came out with two heal pulses and
    // two bloom fields: four support abilities and two distinct ones. The
    // per-pool guard below stops a socket offering a duplicate of what is in
    // ITS pool and knows nothing about the other fifteen. A support kit is
    // meant to be a toolkit -- a burst heal, a field, a rally and a hex --
    // rather than one answer pressed four times, which is the same argument
    // item 2 makes about a board of eight identical minions.
    //
    // Still SEEDED, not round-robin: the seed decides where in the list to
    // start, so which category a given socket offers is stable for that
    // socket, and the rotation only skips what is already taken.
    const taken = supportState.taken || [];
    const start = stableHash(`${comboSeed}|support`) % SUPPORT_CATEGORY_KEYS.length;
    let which = SUPPORT_CATEGORY_KEYS[start];
    for (let i = 0; i < SUPPORT_CATEGORY_KEYS.length; i++) {
      const k = SUPPORT_CATEGORY_KEYS[(start + i) % SUPPORT_CATEGORY_KEYS.length];
      if (!taken.includes(k)) { which = k; break; }
    }
    const cat = ABILITY_CATEGORY_BY_KEY[which];
    // ON-CHARTER, always. Unlike the device seat there is no entitlement to
    // override with: an essence that the charter says does not heal genuinely
    // does not heal, and the three levers above are exactly the charter's own
    // reason for saying it does. Forcing it would put a healing ring on a
    // Sword essence, which is round 51's whole complaint.
    if (cat && !pool.some(c => c.catKey === which) && tryCat(cat)) {
      pool[pool.length - 1]._supportSeat = supportVia;
    }
  }

  // ===== ROUND 76 (item 3) -- THE DEVICE SEAT ===============================
  //
  // "traps/turret stay rare except on bow, crossbow, technology, trap,
  // charlatan, adept-style essences; goes with physical ranged and stealth
  // builds."
  //
  // Measured before this: ONE trap and TWO turrets across 400 kits. Round 75's
  // twenty-two trap designs, three delivery modes and a ballista were reachable
  // in principle and effectively absent in play -- the `craft` motif has biased
  // both categories since then and it changed nothing, because a bias competes
  // for six seats against the essence's signature, the stone's lever and the
  // rotation and usually loses.
  //
  // So the entitled sockets get a seat, and nothing else changes: everywhere
  // else traps and turrets keep exactly the rarity they have, which is already
  // rarer than "rare". See deviceSocket for the three routes in and for the two
  // ids in the user's list that this catalogue does not have.
  //
  // ONE of the two, chosen by seed rather than by offering both -- the same
  // argument the rare seat makes directly below. Two device candidates in one
  // pool would crowd out the ordinary abilities the socket is also choosing
  // between, and a trap and a turret are near enough the same answer that
  // offering both mostly costs a seat to duplicate a choice.
  const deviceVia = owesSignature ? null : deviceSocket(essenceIdOf(essDef), stoneId, spine);
  if (deviceVia) {
    const which = stableHash(`${comboSeed}|device`) % 2 ? 'summon_trap' : 'summon_turret';
    const cat = ABILITY_CATEGORY_BY_KEY[which];
    // `offCharter` FOR THE NAMED LISTS ONLY, and this distinction is the
    // difference between the user's two clauses. "except on bow, crossbow,
    // technology, trap, charlatan, adept-style essences" is an ENTITLEMENT --
    // a Bow essence whose charter refuses `summon` is exactly the case named,
    // and honouring the charter there would leave the feature where it was
    // found. "goes with physical ranged and stealth builds" is a LEANING, so
    // the spine route stays inside the charter and simply makes a device more
    // likely on essences that could already produce one.
    //
    // Measured with the spine route off-charter too: traps reached 78 of the
    // 148 essences, with essApe and essBone as common as essTrap. That is not
    // "rare except on", that is everywhere.
    const off = deviceVia !== 'spine';
    if (cat && !pool.some(c => c.catKey === which) && tryCat(cat, { offCharter: off })) {
      // The ROUTE is stored, not a flag: the scorer weighs an essence or
      // stone entitlement above a spine one, and it runs in
      // rebuildKnownAbilities where this local is long out of scope.
      pool[pool.length - 1]._deviceSeat = deviceVia;
    }
  }

  // ===== ROUND 76 (item 2.2) -- THE ODD SEAT ================================
  //
  // Twenty pairs out of 148 essences x 184 stones. A player who happens to
  // socket an Iron essence under a Bull stone has hit a one-in-1,400 pairing,
  // and the summon seat above would then have offered it in ONE of six to
  // eight candidates -- so the odd summon would have been visible about once
  // in ten thousand sockets. That is not rare content, that is content nobody
  // ever sees, and the whole point of a curated table is that its rows show up
  // when their combination does.
  //
  // So the pair gets its own seat, INDEPENDENT of the summon seat: it is
  // offered whether or not the essence binds to a creature (an Earth essence
  // under a Frog stone is not a summoner by any other measure) and whether or
  // not the charter thinks this essence is the summoning kind. The rarity is
  // already in the pairing; gating it twice would be gating it away.
  //
  // The pick weight then does the rest -- see `oddPull` in the scoring below.
  const oddRow = oddSummonFor(essenceIdOf(essDef), stoneId);
  // ...and not twice in one kit. Nine pairs on average reach each guardian, so
  // an Iron trio holding both a Cattle and a Grazen stone would otherwise be
  // offered The Ploughshare in two sockets; the second would lose the name to
  // `usedNames` and ship as a guardian wearing a generated attack name. The
  // kit-wide name set is already threaded here and is exactly the right test.
  if (oddRow && !(usedNames && usedNames.has(oddRow.name))) {
    const cat = ABILITY_CATEGORY_BY_KEY.summon_creature;
    if (cat && !pool.some(c => c.oddSummon)) {
      // `offCharter`: the charter gate is bypassed for this seat and no other.
      // See above -- the pairing IS the gate. `summon_creature` carries no
      // leverGate, so this is the only door in front of it.
      if (tryCat(cat, { offCharter: true })) pool[pool.length - 1]._oddSeat = true;
    }
  }

  // ===== ROUND 77 (items 6.1 and 6.3) -- THE TWO POWER SEATS ===============
  //
  // Both follow round 76's device-seat pattern exactly, and both are gated on
  // an explicit list of essences, confluences and stones rather than on a
  // charter, because a charter answers "is this essence the sort of thing that
  // does X" and the user has answered that question by name.
  //
  // ONE PER KIT, each. Both are binary powers -- you can hold a scythe in one
  // hand or you cannot -- so a second copy is a wasted socket rather than a
  // stronger build. Counted off what the kit has TAKEN, like every other cap
  // in this file, so a seat the socket declined does not spend the allowance.
  //
  // OFF-CHARTER, deliberately. A Might essence's charter has no clause about
  // wielding a scythe one-handed and never will; the entitlement IS the gate,
  // which is the same argument the odd-summon seat makes. Both categories are
  // `passive buff` and `movement`, so nothing about the 12/8 kit shape moves.
  //
  // NOT WHILE THE KIT OWES A SIGNATURE, for the reason round 76 wrote at
  // length: a seat that merely loses on score has still occupied a pool slot.
  if (!owesSignature && heavyHandState.count < heavyHandState.cap) {
    const via = heavyHandSocket(essenceIdOf(essDef), stoneId, confluenceName);
    if (via) {
      const cat = ABILITY_CATEGORY_BY_KEY.two_hand_wield;
      if (cat && !pool.some(c => c.catKey === 'two_hand_wield')
        && tryCat(cat, { offCharter: true, heavyHandSource: via })) {
        pool[pool.length - 1]._heavyHandSeat = via;
      }
    }
  }
  if (!owesSignature && waterWalkState.count < waterWalkState.cap) {
    const via = waterWalkSocket(essenceIdOf(essDef), stoneId, confluenceName);
    if (via) {
      const cat = ABILITY_CATEGORY_BY_KEY.water_walk;
      if (cat && !pool.some(c => c.catKey === 'water_walk')
        && tryCat(cat, { offCharter: true, waterWalkSource: via })) {
        pool[pool.length - 1]._waterWalkSeat = via;
      }
    }
  }

  // ROUND 75 -- THE RARE SEAT. Same argument as the stone door directly above
  // and the attack floor directly below: allowing is not reaching. `rareOnly`
  // lets a stacking category through the gate, but the pool has six or seven
  // seats filled by the essence's signature, the stone's lever and the
  // rotation, and a category that is merely permitted usually never comes up.
  // A rare socket is 1 in 40; letting it roll rare and then not offer the rare
  // thing would make the family almost unreachable.
  //
  // One of the three shapes, chosen by seed rather than by trying all three:
  // three stacking candidates in one pool would crowd out the ordinary
  // abilities the socket is also choosing between, and a rare socket should
  // still be a choice.
  if (rare) {
    const stackCats = ABILITY_CATEGORIES.filter(c => c.rareOnly && c.template === 'stacking');
    // AN ESSENCE THAT CARRIES A NAMED SIGNATURE GETS THAT SIGNATURE'S SHAPE
    // FIRST. Without this the seat picks a shape by seed and the signature is
    // used only when the two happen to agree -- so a Sin essence would produce
    // Jason's Mark of Sin about a third of the time and a generated ledger the
    // rest, which is the opposite of what a signature is for.
    const sig = STACK_SIGNATURES[STACK_SIGNATURE_BY_ESSENCE[essenceIdOf(essDef)]];
    const ordered = sig
      ? [...stackCats.filter(c => c.stackShape === sig.shape),
        ...stackCats.filter(c => c.stackShape !== sig.shape)]
      : stackCats;
    const start = sig ? 0 : stableHash(comboSeed + '|stackseat');
    for (let i = 0; i < ordered.length; i++) {
      if (tryCat(ordered[(start + i) % ordered.length])) {
        pool[pool.length - 1]._rareSeat = true;
        break;
      }
    }
  }

  // ROUND 74 (item 5) -- THE ATTACK FLOOR GETS A RESERVED SEAT, for exactly
  // the reason the stone door got one in round 56: allowing is not reaching.
  //
  // `needDamage` lifts the charter's refusal so a damage category MAY be
  // offered, and that is all round 51 ever did. But the pool has six or seven
  // active seats and they are filled by the essence's signature, the stone's
  // door, the stone's bias list and then a rotation over every active category
  // there is -- so a lifted refusal still had to beat that field to appear at
  // all. Measured with the lift alone and no seat: the attack floor moved kits
  // from 2.69 attacks to 3.49 and left 135 of 300 stuck one short of the
  // target, because the socket that was supposed to fix it was offered a pool
  // with nothing in it that hurt anything.
  //
  // The seat is claimed only while the kit is behind (see `needDamage` at the
  // call site) and only if the pool does not already hold an attack, so a kit
  // that is making attacks on its own never spends a seat on this.
  const tryDamageSeat = () => {
    if (!needDamage) return false;
    if (pool.some(p => p.kind === 'active' && abilityDeals(p))) return false;
    const cats = ACTIVE_CATEGORIES.filter(c => categoryDeals(c.key));
    const start = stableHash(comboSeed + '|dmgseat');
    for (let i = 0; i < cats.length; i++) {
      if (tryCat(cats[(start + i) % cats.length])) return true;
    }
    return false;
  };

  // Actives: one essence signature, the attack floor's seat, the stone's door,
  // then stone-bias actives, then rotation.
  let added = 0;
  if (trySignature('active')) added++;
  if (added < nActive && tryDamageSeat()) added++;   // ROUND 74 -- see above
  if (added < nActive && tryStoneDoor('active')) added++;
  for (const cat of biasCats) {
    if (added >= nActive) break;
    if (cat.kind === 'active' && tryCat(cat)) added++;
  }
  for (let i = 0; i < ACTIVE_CATEGORIES.length && added < nActive; i++) {
    if (tryCat(ACTIVE_CATEGORIES[(seed + i) % ACTIVE_CATEGORIES.length])) added++;
  }
  // Passives: one essence signature, then kit-completing aura/perception,
  // then stone bias, then rotation.
  added = 0;
  if (trySignature('passive')) added++;
  if (added < nPassive && tryStoneDoor('passive')) added++;   // ROUND 56 -- see above
  // ROUND 47 -- these two are the KIT-COMPLETING probes: every kit is meant
  // to end up with one aura and one perception passive. They were only ever
  // put into the pool and left to win on synergy score, which held at 100%
  // while the passive pool was small -- but round 47 added five passive
  // categories (four triggered families plus weapon affinity) and every one
  // of them is another candidate that can outscore the aura in all sixteen
  // sockets. Measured before this flag: 99.9% of kits got an aura, 99.3% a
  // perception. Marking them _completes and paying that a large score bonus
  // downstream restores the guarantee instead of leaving it to arithmetic
  // that gets worse every time the roster grows.
  const markCompleting = () => { if (pool.length) pool[pool.length - 1]._completes = true; return true; };
  // ROUND 51 -- the aura probe tries the CHARTERED order first. A mend essence
  // gets the regen aura and a raw one gets the damage aura, rather than the
  // coin-flip the seed used to decide; only if neither is chartered does the
  // completing exemption force one through, because a kit without an aura is a
  // kit missing a piece the user specified.
  //
  // ROUND 58 -- AND IT NOW KNOWS ABOUT ALL FIVE OF THEM.
  //
  // This named `self_passive_heal` and `self_passive_aoe` literally. There are
  // five aura shapes: round 38 added `slow` and `weaken`, and round 58 added
  // `ward`. Because the kit's aura cap is ONE and this probe always claims it,
  // the three the list did not name could never appear in a build at all.
  //
  // Measured across 800 kits before this change: regen 779, damage 23, slow 0,
  // weaken 0, ward 0. Two of those zeroes had been shipping since round 38 --
  // a whole authored mechanic, generating correctly, unreachable in play, and
  // invisible because nothing had ever counted auras by their effect.
  //
  // The chartered ones are rotated on the seed rather than ranked in a fixed
  // order, because a fixed order is what made regen 97% of every aura in the
  // game: `heal` is a broadly-admitted family, so trying it first meant trying
  // it always.
  if (!ownedAuras && added < nPassive) {
    const AURA_KEYS = ABILITY_CATEGORIES.filter(c => c.isAura).map(c => c.key);
    const rot = stableHash(comboSeed + '|auraorder');
    const rotated = AURA_KEYS.map((_, i) => AURA_KEYS[(rot + i) % AURA_KEYS.length]);
    const chartered = rotated.filter(k => charterAllows(charter, k));
    // Chartered first, in seeded order; then the rest, so the guarantee still
    // holds for an essence whose charter admits no aura at all.
    const auraOrder = [...chartered, ...rotated.filter(k => !chartered.includes(k))];
    let got = false;
    for (const k of auraOrder) {
      if (tryCat(ABILITY_CATEGORY_BY_KEY[k], { completing: true })) { got = true; break; }
    }
    if (got && markCompleting()) added++;
  }
  if (!ownedPerception && added < nPassive) { if (tryCat(ABILITY_CATEGORY_BY_KEY.perception, { completing: true }) && markCompleting()) added++; }
  for (const cat of biasCats) {
    if (added >= nPassive) break;
    if (cat.kind === 'passive' && tryCat(cat)) added++;
  }
  for (let i = 0; i < PASSIVE_CATEGORIES.length && added < nPassive; i++) {
    if (tryCat(PASSIVE_CATEGORIES[(stableHash(comboSeed + '|pp') + i) % PASSIVE_CATEGORIES.length])) added++;
  }

  // ROUND 17 -- top-up. The floor the user set is a HARD floor ("no less
  // than 12 possible abilities"), and the per-kind fills above can come up
  // short: a category is skipped when the name it generates is already
  // spoken for elsewhere in the kit, and with 146 essences drawing on a
  // shared sheet that happens. So if the pool is still under the floor,
  // keep probing every remaining category, either kind, until it clears --
  // caps (aura, perception, movement) are still enforced by tryCat, so this
  // can never violate them.
  if (pool.length < CANDIDATE_FLOOR) {
    const rotation = stableHash(comboSeed + '|topup');
    for (let i = 0; i < ABILITY_CATEGORIES.length && pool.length < CANDIDATE_FLOOR; i++) {
      const n0 = pool.length;
      if (tryCat(ABILITY_CATEGORIES[(rotation + i) % ABILITY_CATEGORIES.length], { topup: true })
          && pool.length > n0) pool[pool.length - 1]._topup = true;
    }
  }
  // ROUND 51 -- and a SECOND top-up that sets the charter aside, because two
  // user requirements collide here and both are real.
  //
  // "No less than 12 possible abilities" per essence/stone pair (round 17) is a
  // hard floor. A charter that refuses whole families can leave a narrow essence
  // short of twelve chartered candidates -- measured, 198 of 3,796 pairs, worst
  // case seven.
  //
  // The resolution is that the two requirements are about different things. The
  // floor is about how many OPTIONS a socket has; the charter is about what
  // actually gets CHOSEN. So these candidates are generated, counted, and
  // marked `_offCharter` -- and synergyScore pays that a penalty large enough
  // that a chartered candidate always outranks one. They fill the list and
  // essentially never win it, which satisfies both.
  if (pool.length < CANDIDATE_FLOOR) {
    const rotation = stableHash(comboSeed + '|offcharter');
    for (let i = 0; i < ABILITY_CATEGORIES.length && pool.length < CANDIDATE_FLOOR; i++) {
      const before = pool.length;
      if (tryCat(ABILITY_CATEGORIES[(rotation + i) % ABILITY_CATEGORIES.length],
          { topup: true, offCharter: true }) && pool.length > before) {
        pool[pool.length - 1]._offCharter = true;
      }
    }
  }
  // ROUND 53 -- EVERY POOL OFFERS BOTH KINDS.
  //
  // rebuildKnownAbilities keeps the kit at 12 active / 8 passive by FORCING a
  // kind when the running totals demand it -- and its force is a filter over
  // the pool, which silently gives up when the pool holds nothing of that kind
  // (`if (filtered.length) candidates = filtered`). That was safe while the
  // probe order was the essence's own, because an essence's bias list mixes
  // kinds. Round 53's spine leads the order for all four slots at once, so a
  // trio that agreed on three active-flavoured levers could fill a whole pool
  // with actives and the force had nothing to bite on. Measured: 11 of 400 kits
  // came out off-shape, worst 15/5.
  //
  // The 12/8 split is one of the protected kit properties, so the guarantee
  // belongs here rather than in the caller: a pool that cannot offer both kinds
  // is a pool that can break the shape no matter how carefully it is drawn from.
  // Two of each, so the forced pick is still a CHOICE rather than whatever
  // single candidate happened to qualify.
  const KIND_FLOOR = 2;
  for (const kind of ['active', 'passive']) {
    const have = () => pool.filter(c => c.kind === kind).length;
    if (have() >= KIND_FLOOR) continue;
    const list = kind === 'active' ? ACTIVE_CATEGORIES : PASSIVE_CATEGORIES;
    const rotation = stableHash(comboSeed + '|kind|' + kind);
    for (let i = 0; i < list.length && have() < KIND_FLOOR; i++) {
      const before = pool.length;
      // `topup` so the per-pool template cap cannot block the guarantee, and
      // offCharter as the last resort for an essence whose charter genuinely
      // has almost nothing of this kind in it -- the -1000 in synergyScore
      // still keeps those from winning a socket they were not meant to.
      if (!tryCat(list[(rotation + i) % list.length], { topup: true })) {
        tryCat(list[(rotation + i) % list.length], { topup: true, offCharter: true });
        if (pool.length > before) pool[pool.length - 1]._offCharter = true;
      }
      if (pool.length > before) pool[pool.length - 1]._kindFloor = true;
    }
  }
  return pool;
}

// Synergy score of one candidate against the already-known kit:
//   +2 per known ability sharing this candidate's DoT status label
//   +1 per known ability from the same stone theme
//   +2 for a buff/defensive when the kit already has 2+ attacks
//   +2 for an attack when the kit has 2+ buffs
//   +1 if the kit doesn't own this category yet (variety pressure)
// ROUND 52 -- templates that more than two categories can produce. Computed
// rather than listed so that adding a category cannot silently un-scope the
// penalty below. Currently projectileBall (4), aura (4), triggeredPassive (4).
const MULTI_SOURCE_TEMPLATES = (() => {
  const n = {};
  for (const c of ABILITY_CATEGORIES) n[c.template] = (n[c.template] || 0) + 1;
  return new Set(Object.keys(n).filter(t => n[t] >= 3));
})();

export function synergyScore(candidate, knownList) {
  let score = 0;
  // ROUND 51 -- an off-charter candidate exists only to keep the pool above
  // round 17's floor of twelve (see the second top-up in buildCandidatePool).
  // It is a thing this essence does not do, so it loses to anything the essence
  // DOES do. -1000 clears the ceiling of every positive term in this function
  // combined, and of the +200 kit-completing bonus applied by the caller, so it
  // can only ever win when the pool holds nothing else at all.
  if (candidate._offCharter) score -= 1000;
  const dotLabel = candidate.dot && candidate.dot.label;
  let attacks = 0, buffs = 0, sameCat = 0, sameTemplate = 0;
  for (const k of knownList) {
    if (dotLabel && k.dot && k.dot.label === dotLabel) score += 2;
    if (k.stoneId && candidate.stoneId && k.stoneId === candidate.stoneId) score += 1;
    if (k.category === 'attack') attacks++;
    if (k.category === 'buff') buffs++;
    if (k.category === candidate.category) sameCat++;
    if (k.template === candidate.template) sameTemplate++;
  }
  if ((candidate.category === 'buff' || candidate.category === 'defensive') && attacks >= 2) score += 2;
  if (candidate.category === 'attack' && buffs >= 2) score += 2;
  if (sameCat === 0) score += 1;
  // ROUND 52 -- THE SAME CAP, ONE FLOOR UP.
  //
  // Round 51 capped a single candidate POOL at two of any one template, and
  // that cap was doing less than it looked: a kit draws from sixteen sockets,
  // so "two per pool" permits thirty-two bolts in one kit and nothing said no.
  // It went unnoticed because a second bolt in a pool was usually killed by a
  // name collision instead -- an accident, not a rule. Round 52's naming fix
  // removed the accident and the bolt share went straight back up (12.6% to
  // 14.6%), which is the tell that the cap was never what was holding it down.
  //
  // Same principle as the pool cap, so the same number: two of a shape is a
  // real choice (a leeching bolt and a chaining bolt are different abilities),
  // the third is padding. Free for the second, then escalating, so a kit built
  // honestly around one shape can still have it twice.
  //
  // Weighted at 4 per excess copy: enough to lose to a fresh shape, never
  // enough to beat the +200 `_completes` marker or to strand the one-damage
  // guarantee, which is enforced outside this function.
  //
  // SCOPED, and the scoping is the interesting part. Applied to every template
  // this drops the bolt share to 11.7% and pushes MEAN BUILD OVERLAP UP, from
  // 39.1% to 41.6% -- which is the opposite of what the round is for. The
  // reason is worth writing down, because it is counter-intuitive and the
  // obvious fix is the wrong one: forcing every kit to spread across many
  // shapes makes each kit internally varied and therefore mutually IDENTICAL.
  // Twenty abilities over thirty-five templates, evenly spread, is the same
  // even spread in everyone's kit. Uniformity is not distinctiveness.
  //
  // What actually separates builds is each essence being confined to a
  // DIFFERENT narrow slice, which is the charter's job, not this function's.
  // So the penalty is aimed only where the crowding is a structural accident
  // rather than a choice: the three templates that more than two categories
  // generate. A bolt wins sockets partly because four different categories
  // roll one, and that is a property of the category list, not of anyone's
  // build. Everything else is left alone to be as lopsided as its essence is.
  if (sameTemplate > 1 && MULTI_SOURCE_TEMPLATES.has(candidate.template)) {
    score -= (sameTemplate - 1) * 4;
  }
  // ROUND 49 -- A STONE THAT OPENED A DOOR GETS TO WALK THROUGH IT.
  //
  // `_leverByStone` is set by buildCandidatePool on a candidate whose category
  // was gated behind a lever the ESSENCE does not carry and the STONE does.
  // Without this bonus the gate opened onto nothing useful: measured, only two
  // of six non-stealth essences could produce a stealth ability off any of the
  // twenty-two stealth stones, because the category still had to out-score a
  // pool built entirely around what the essence IS good at.
  //
  // Weighted at 4 -- above the variety nudge and the category bonuses, below
  // the `_completes` marker that guarantees the aura and perception slots. The
  // reasoning is intent: a player does not socket a Cat stone into a healer by
  // accident, and the one thing that combination is FOR is the thing the
  // essence could not do alone.
  // ROUND 56 -- but only when it EARNED the seat, not when it was given one.
  //
  // Round 56 reserved a pool seat for the stone door (see tryStoneDoor), and
  // paying the alignment bonus on top of the reservation stacked two different
  // promises into one candidate: round 49 promised the door would be OFFERED,
  // and separately that a stone genuinely aligned with the build would WIN.
  // Reserving the seat satisfies the first on its own; the bonus is for the
  // second. Together they took the socket outright -- bloom_field went from 14%
  // of builds to 55%. A candidate that reached the pool through the bias list
  // or the rotation still had to align with the essence to get there, so it
  // still collects the bonus; a reserved one competes on its own merits.
  if (candidate._leverByStone && !candidate._doorReserved) score += 4;
  return score;
}

// Full kit rebuild -- the port of the original's rebuildKnownAbilities,
// extended with the round-5 pool/synergy/budget selection and the round-6
// slotAttr threading (attr_boost abilities bind to the slot's own
// attribute). slots = { slotEssence: [id|null x3], slotStones: [[..] x4],
// slotAttr: [attr|null x4] }.

/** Every element this kit can actually DEAL damage in. Read off finished
 *  specs, never off categories, for round 51's reason: the category says what
 *  was asked for and the flavour pass decides what arrived. */
export function kitDamageElements(list) {
  const els = new Set();
  for (const a of (list || [])) {
    if (!a || !abilityDeals(a)) continue;
    if (a.element) els.add(a.element);
    if (a.dot && a.dot.element) els.add(a.dot.element);
    // A conjured relic's strike rider is a damage channel of its own.
    if (a.strikeDot && a.element) els.add(a.element);
  }
  return els;
}

/**
 * Retarget the conditions that can name something the kit never produces.
 *
 * Mutates in place and rewrites only the exact sentence fragments the two
 * templates build, rather than regenerating the ability. Regenerating would
 * re-run the namer against a `usedNames` set that already holds this
 * ability's own name, so the kit would silently lose the name it had picked --
 * a fix that costs a second thing to buy the first.
 *
 * Returns how many abilities it moved, so a suite can measure it.
 */
export function reconcileKitSynergy(list) {
  const els = [...kitDamageElements(list)];
  if (!els.length) return 0;
  let moved = 0;
  // Deterministic: the element a kit deals MOST is the one a dependent passive
  // is pointed at. Not a roll -- two calls on the same kit must agree, and the
  // most-dealt element is also the one the player will notice.
  const freq = new Map();
  for (const a of list) {
    if (a && abilityDeals(a) && a.element) freq.set(a.element, (freq.get(a.element) || 0) + 1);
  }
  const lead = els.slice().sort((x, y) => (freq.get(y) || 0) - (freq.get(x) || 0)
    || (x < y ? -1 : 1))[0];
  for (const a of list) {
    if (!a) continue;
    if (a.pierceElement && !els.includes(a.pierceElement)) {
      const old = a.pierceElement;
      a.pierceElement = lead;
      a.desc = String(a.desc || '').split(`Your ${old} damage`).join(`Your ${lead} damage`);
      a.stats = String(a.stats || '').split(`your ${old} damage`).join(`your ${lead} damage`);
      moved++;
    }
    if (a.condition === 'vsElement' && a.condElement && !els.includes(a.condElement)) {
      const old = a.condElement;
      a.condElement = lead;
      a.desc = String(a.desc || '').split(`against ${old}-touched foes`).join(`against ${lead}-touched foes`);
      a.stats = String(a.stats || '').split(`vs ${old}-touched foes`).join(`vs ${lead}-touched foes`);
      moved++;
    }
  }
  return moved;
}

/**
 * ROUND 89 -- AN ABILITY IS FIXED WHEN IT AWAKENS.
 *
 * The user's rule, verbatim:
 *
 *   "abilities are actively changing as more are awakened. Abilities should be
 *    set when they awaken, they may unlock additional effect as you rank up,
 *    but they should never outright change into a different ability."
 *
 * WHY IT WAS HAPPENING. This function rebuilds the ENTIRE kit from scratch on
 * every call, and it is called on every socket, every bond and every load. The
 * selection is deliberately synergy-aware -- `synergyScore(c, knownList)`, the
 * `_completes` kit-completion bonus worth 200, the aura/perception/buff/absorb
 * counters, the `usedNames` set -- so the pool a socket picks from and the
 * score every candidate gets both depend on WHAT ELSE IS IN THE KIT AT THAT
 * MOMENT. Socket a fifth stone and the first stone's ability is re-scored
 * against a kit that now has an aura in it, and a different candidate wins.
 *
 * That is good generation and a terrible promise. The essence architecture is
 * the centre of this game and its whole proposition is that a bond is
 * PERMANENT: "Neither bond can be undone. An essence slot and its stones are
 * permanent, which is what makes the choice a choice." An ability that
 * silently becomes a different ability three sockets later breaks that in the
 * one place the player is least able to see it happening.
 *
 * THE FIX IS A LOCK, NOT A REWRITE OF THE GENERATOR. `locked` maps a socket
 * key to the ability that key produced the first time it produced one. On
 * every later rebuild, a key whose lock still matches the stone and essence
 * actually in that socket reuses its stored ability instead of re-rolling.
 * Everything else is untouched: the generation itself, the ordering, the caps.
 *
 * The lock is keyed on `${slot}:s${index}:${stoneId}` and CHECKED against the
 * live socket, so it cannot resurrect an ability for a stone that is no longer
 * there -- and because both bonds are permanent, in the shipped game that
 * check can only ever pass. It matters for the character creator's re-rolls
 * and for a loaded save whose kit was generated by an older build.
 *
 * IT STILL RANKS UP. `rankAspectsAt` reads the ability's rank at display and
 * apply time, so a locked ability keeps gaining its four aspects exactly as
 * before -- which is the other half of the user's sentence, "they may unlock
 * additional effect as you rank up".
 */
export function rebuildKnownAbilities(slots, ESSENCES, locked = null) {
  const known = {};
  const knownList = [];
  const usedNames = new Set();
  const pairOccurrence = new Map();
  const essenceIds = slots.slotEssence.filter(Boolean);
  // ROUND 53 -- WHAT THESE THREE AGREED ON, decided once for the whole kit.
  //
  // Computed here and nowhere else, because it is a property of the BUILD
  // rather than of any essence in it, and because computing it per socket
  // would let one slot's answer differ from another's for the same trio. Every
  // pool, every signature and every flavour pass below is handed the same
  // spine. The confluence does NOT vote -- it is the thing built out of the
  // agreement, so letting it vote would put the conclusion in the premises.
  const _reps = essenceIds.map(id => {
    const d = ESSENCES[id];
    return repertoireFor(d, motifForEssence(d));
  });
  const spineInfo = essenceIds.length >= 3 ? leverSpine(_reps)
    : { spine: [], tier: 'bound', tierLabel: '', tierBlurb: '', ranked: [], scores: {} };
  const spine = spineInfo.spine;
  // ROUND 77 (item 6.1) -- WHAT THIS TRIO'S CONFLUENCE IS CALLED.
  //
  // Six of the ten sources the user named for the one-handed passive are
  // confluences (Empower, Juggernaut, Leviathan, Kraken, Minotaur, Wrath), so
  // every socket's pool has to be able to ask. Computed once here for the same
  // reason `spine` is: it is a property of the BUILD, and a per-socket answer
  // could differ between slots for the same three essences.
  //
  // Null until three essences are socketed, which closes the six confluence
  // routes and leaves the four essence ones open. That is the right shape
  // rather than a limitation: a partial build has not formed a confluence and
  // has not earned what one grants.
  const _confDef = confluenceDefFor(slots.slotEssence.map(id => (id ? ESSENCES[id] : null)));
  const confluenceNameForKit = (_confDef && _confDef.name) || null;
  const auraState = { count: 0, cap: hasMultiAuraPassive(essenceIds) ? 2 : 1 };
  const perceptionState = { count: 0, cap: hasMultiPerceptionPassive(essenceIds) ? 2 : 1 };
  // ROUND 47 -- ONE shared buff counter for the whole kit, threaded through
  // every pool build and signature probe below exactly as the aura and
  // perception counters are. No rare cap-raiser: the user's 2 is a maximum.
  const buffState = { count: 0, cap: BUFF_CAP };
  // ROUND 76 (item 4) -- ONE shared barrier counter for the whole kit, on the
  // same pattern. Unlike the buff cap this one has a RAISER: a trio whose
  // spine agreed on `ward` is the "build looking to specialize in magical
  // defense" the user carved out, and it may hold three.
  const absorbState = { count: 0, cap: absorbCapFor(spine) };
  // ROUND 51 -- the one-damage-option floor. See addKnown and the socket loop.
  // ROUND 74 (item 5) -- `attacks` joins it: how many ACTIVE damage abilities
  // the kit has taken so far, which is the number the player counts. `has` is
  // kept and still means "can this kit hurt anything at all, by any route",
  // because a thorns aura genuinely is a damage option even though it is not
  // an attack -- the two questions are different and both are worth asking.
  const damageState = { has: false, attacks: 0 };
  const slotAttrs = slots.slotAttr || [null, null, null, null];
  let movementCount = 0;
  let stoneActive = 0, stonePassive = 0, socketOrdinal = 0;

  const addKnown = (key, ability, slotIndex, stoneId, essenceId) => {
    // ROUND 89 -- THE LOCK, applied at the one place every generated ability
    // passes through, so no call site can forget it. A lock is honoured only
    // when it was recorded for the SAME stone in the SAME socket of the SAME
    // essence; anything else is a different socket that happens to share a key
    // shape, and reusing across that would be worse than re-rolling.
    const lk = locked && locked[key];
    if (lk && lk.ability && lk.stoneId === (stoneId || null)
        && lk.essenceId === (essenceId || null)) {
      ability = lk.ability;
    }
    known[key] = { ability, slotIndex, stoneId, essenceId };
    knownList.push(ability);
    usedNames.add(ability.name);
    // ROUND 51 -- can this kit hurt anything yet? Read off the finished spec
    // rather than off its category, because the category only says what was
    // ASKED for and the flavour pass can add or remove a payload. A weapon
    // affinity and a bonded familiar both count: the user's rule was "guarantee
    // one damage option", not "guarantee one damage spell".
    if (!damageState.has && abilityDeals(ability)) damageState.has = true;
    // ROUND 74 (item 5) -- and separately, is it a thing you can PRESS that
    // hurts something. Same `abilityDeals` read (the finished spec, not the
    // category, for round 51's reason) narrowed to actives.
    if (ability.kind === 'active' && abilityDeals(ability)) damageState.attacks++;
    if (ability.catKey && ABILITY_CATEGORY_BY_KEY[ability.catKey]) {
      const cat = ABILITY_CATEGORY_BY_KEY[ability.catKey];
      if (cat.isAura) auraState.count++;
      if (cat.isPerception) perceptionState.count++;
      if (cat.isMovement) movementCount++;
      if (cat.isBuff) buffState.count++;   // ROUND 47
      if (ability.catKey === 'self_active_absorb') absorbState.count++;   // ROUND 76
    } else if (ability.kind === 'active' && ability.category === 'buff' && BUFF_TEMPLATES.includes(ability.template)) {
      // ROUND 47 -- catKey-less actives still spend a buff slot. That is the
      // essence fallback innate (an essence with no signature pool keeps its
      // ESSENCE_DEFS-shaped ability, and a selfPower one like Might's is a
      // buff by any reading) and, in principle, a confluence innate. The cap
      // the user asked for is on the KIT, not on the generator, so anything
      // the player can cast that reads "+x% for y seconds" counts against it.
      buffState.count++;
    }
  };

  const processStones = (slotIndex, essDef) => {
    slots.slotStones[slotIndex].forEach((stoneId, arrIdx) => {
      if (!stoneId) return;
      const pairKey = `${essDef.id}|${stoneId}`;
      const variantIndex = pairOccurrence.get(pairKey) || 0;
      pairOccurrence.set(pairKey, variantIndex + 1);
      const key = `${slotIndex}:s${arrIdx}:${stoneId}`;

      const remaining = TOTAL_STONE_SOCKETS - socketOrdinal;
      const needA = STONE_ACTIVE_TARGET - stoneActive;
      const needP = STONE_PASSIVE_TARGET - stonePassive;
      let forced = null;
      if (needA <= 0) forced = 'passive';
      else if (needP <= 0) forced = 'active';
      else if (needA >= remaining) forced = 'active';
      else if (needP >= remaining) forced = 'passive';

      // ROUND 51 -- with three sockets left and nothing in the kit that can
      // deal damage, the charter's refusal is lifted until something can. Three
      // rather than one so the guarantee is met by a candidate that was SCORED
      // against the kit, not by whatever the very last socket happened to hold.
      //
      // ROUND 74 (item 5) -- and the same lift now serves the ATTACK floor.
      //
      // PACED, not triggered at the brink. The first cut of this asked whether
      // the active sockets still to come were enough to reach the target, the
      // way `needA`/`needP` above ask it -- and that arrives too late to be a
      // floor at all. Measured: a kit sitting at one attack with two active
      // sockets left is already three short, and forcing both of them still
      // lands on three. 135 of 300 kits piled up on exactly three that way.
      //
      // So the rule is a PACE instead: every second ACTIVE the kit has taken
      // should be an attack, until it has four.
      //
      // Paced against the kit's own actives, not against `stoneActive` and not
      // against STONE_ACTIVE_TARGET. Both of those are socket bookkeeping, and
      // the second cut of this used them -- which capped the floor at three,
      // because a player's fourth essence slot holds a CONFLUENCE whose four
      // sockets only exist once it has formed, so a real kit fills twelve
      // sockets and takes about six actives from them, and half of six is
      // three. Counting `knownList` instead counts what the player counts:
      // every castable thing on the bar, innates and confluence included.
      const activesSoFar = knownList.reduce((n, a) => n + (a.kind === 'active' ? 1 : 0), 0);
      const attackPace = Math.min(STONE_ATTACK_TARGET, Math.ceil(activesSoFar / 2));
      const needAttack = damageState.attacks < attackPace;
      const needDamage = (!damageState.has && (TOTAL_STONE_SOCKETS - socketOrdinal) <= 3)
        || needAttack;
      // ROUND 75 -- MOVED ABOVE THE POOL BUILD. `isRare` used to be computed
      // after it, which was fine while rarity was only a flag stamped on the
      // chosen ability. The stacking family is offered on the rare seat and
      // nowhere else, so the pool has to be built knowing.
      const rareSeed = stableHash(`${essenceIds.slice().sort().join(',')}|${key}|rare`);
      const isRare = rareSeed % 40 === 0;
      const pool = buildCandidatePool({
        essDef, stoneId, variantIndex, usedNames, auraState, perceptionState,
        movementCount, buffState, absorbState, needDamage, spine, rare: isRare, essenceIds,
        // ROUND 76 (item 5) -- counted off what the kit has TAKEN, exactly as
        // doorState below is: a support seat the socket then declined must not
        // spend the kit's allowance.
        // ROUND 76 -- see the parameter's own note in buildCandidatePool.
        owesSignature: !knownList.some(a => a.signature && !a.innate),
        supportState: {
          count: knownList.filter(a => SUPPORT_CATEGORY_KEYS.includes(a.catKey)).length,
          cap: SUPPORT_SEAT_CAP,
          // Which of the four the kit already holds, so the seat offers a
          // different one. Read off the known list for the same reason the
          // count is: what was TAKEN, not what was offered.
          taken: [...new Set(knownList.map(a => a.catKey).filter(k => SUPPORT_CATEGORY_KEYS.includes(k)))],
        },
        // ROUND 56 -- counted off what the kit has actually TAKEN, not off what
        // has been offered. A pool seat the socket then declined should not
        // spend the kit's allowance, for the same reason `ownedAuras` reads the
        // known list rather than a pooled-candidate tally.
        doorState: { count: knownList.filter(a => a._leverByStone).length, cap: STONE_DOOR_CAP },
        // ROUND 77 -- the two power seats, counted off what was TAKEN.
        heavyHandState: { count: knownList.filter(a => a.template === 'twoHandWield').length, cap: HEAVY_HAND_CAP },
        waterWalkState: { count: knownList.filter(a => a.template === 'waterWalk').length, cap: WATER_WALK_CAP },
        // Six of item 6.1's ten sources are confluences, so the seat has to be
        // able to ask what this build's confluence IS. `conf` is the name the
        // kit formed; null before three essences are socketed, which closes
        // those six routes and leaves the four essence ones open -- correct,
        // because a build with no confluence has not earned the confluence
        // route.
        confluenceName: confluenceNameForKit,
        ownedAuras: knownList.some(a => a.template === 'aura'),
        ownedPerception: knownList.some(a => a.template === 'perception'),
        slotAttr: slotAttrs[slotIndex],
      });
      if (!pool.length) { socketOrdinal++; return; }

      let candidates = pool;
      if (!isRare && forced) {
        const filtered = pool.filter(c => c.kind === forced);
        if (filtered.length) candidates = filtered;
      }
      // ROUND 74 (item 5) -- and when the attack floor is in danger, narrow to
      // the candidates that ARE attacks. Lifting the charter (needDamage,
      // above) only puts them in the pool; a pool of eight where one is an
      // attack still loses to the synergy scorer most of the time, which is
      // how round 51's floor could be "satisfied" by a thorns passive. This
      // runs AFTER the active/passive filter and re-filters its result, so the
      // 8/8 split is never broken to feed the attack floor -- if the two
      // disagree, the narrower list is empty and the split wins.
      if (!isRare && needAttack) {
        const attacks = candidates.filter(c => c.kind === 'active' && abilityDeals(c));
        if (attacks.length) candidates = attacks;
      }
      const lagging = stoneActive < stonePassive ? 'active' : (stonePassive < stoneActive ? 'passive' : null);
      // ===== ROUND 76 -- THE NEW SEATS STAND ASIDE FOR A SIGNATURE =========
      //
      // "stone sockets also grant essence signatures" has held since round 16
      // without ever being guaranteed: a signature went into every pool and
      // won on synergy, which was safe while the pool was small. Round 76 put
      // three more reserved seats into it -- summon, device, support -- and
      // kits started arriving with NO socket-granted signature at all, against
      // an average of 1.6. That is round 47's aura failure again: a guarantee
      // resting on out-scoring everything else expires the next time the
      // roster grows.
      //
      // The first fix tried was a FLOOR -- a large bonus on the signature
      // candidate. It worked and it cost something else: the signature banks
      // lean on bolts, so forcing one moved round 51's bolt-share ratchet from
      // 12.9% to 13.7% against a 13.5% ceiling. Paying for one guarantee by
      // breaking another is not a fix.
      //
      // So the seats YIELD instead. While a kit still owes a signature, the
      // seats this round added score zero and the socket decides exactly as it
      // did before they existed -- nothing forced, nothing else moved. They
      // resume the moment the kit has its signature, which is usually the very
      // next socket.
      //
      // A property of the KIT, so it is computed once per socket rather than
      // per candidate. The first draft declared it inside the scoring loop,
      // below two of its own uses, and every kit in the game died on a
      // temporal-dead-zone ReferenceError -- caught by the next suite run
      // reporting a bolt share of NaN.
      const owesSignature = !knownList.some(a2 => a2.signature && !a2.innate);
      let best = null, bestScore = -1;
      for (const c of candidates) {
        // ROUND 47 -- the kit-completing aura/perception outranks everything.
        // 200 clears the ceiling of the other three terms combined (synergy
        // tops out well under 100 after the x10, lagging is 15, jitter is 9),
        // so a kit that still lacks an aura takes the aura in the first socket
        // that offers one. It only ever appears in the pool while the kit
        // lacks that piece, so this can never crowd the roster.
        // ===== ROUND 76 (item 2) -- A MINION BUILD COMPOUNDS =================
        //
        // The reserved seat above puts a summon in the POOL. Measured, that
        // alone took `summon_creature` from 25 in 10,000 to 69 in 8,000 -- and
        // still produced at most TWO in a kit, with none reaching four. One
        // seat in a pool of eight wins about one time in eight, which is a
        // sprinkling, not a build.
        //
        // So the preference ESCALATES: each summon the kit has already taken
        // makes the next one likelier. That is what "a build may tend to be
        // more summon focused" actually means -- the first minion is chance,
        // and the rest follow from it. A kit that never takes the first one
        // never starts down this road, which is what keeps "not every build
        // needs multiple summons" true.
        //
        // Capped at six steps so it is a strong pull and never a certainty:
        // even a committed minion build keeps taking other things, and the
        // 12-active/8-passive shape is untouched.
        // Slope and cap TUNED AGAINST MEASUREMENT, not chosen. At 12 + 26n the
        // best kit in 120 summon-leaning rolls reached three minions; the
        // synergy term is `score * 10` and tops out under 100, so a pull of 64
        // at n=2 was winning only sometimes. At 20 + 45n a build that has taken
        // two is strongly committed and one that has taken none is untouched.
        const summonPull = (c._summonSeat && !owesSignature)
          ? 20 + 45 * Math.min(7, knownList.filter(a2 => a2.summonKind === 'creature').length)
          : 0;
        // ROUND 76 (item 2.2) -- and the ODD SEAT outranks all of it, at the
        // same 200 the kit-completing aura uses.
        //
        // Not a preference: a taken. The pairing is already one in fourteen
        // hundred (twenty rows across 148 essences and 184 stones), so the
        // scarcity is entirely in reaching the socket at all. Making the
        // player win a second lottery inside the pool would be reserving a
        // seat and then letting the general scorer decide -- rounds 56, 74 and
        // 75 each learned that costs the feature.
        const oddPull = (owesSignature || !c._oddSeat) ? 0 : 200;
        // ROUND 76 (item 3) -- the device seat pulls hard but not absolutely.
        // 85 beats the synergy term's practical ceiling without clearing the
        // kit-completing 200, so a Bow build reliably ends up with traps and a
        // Bow build that still has no aura takes the aura first. A `spine`-only
        // entitlement pulls less than an essence or stone one: "goes with
        // ranged and stealth builds" is a leaning, and the two named lists are
        // the actual ask.
        const devicePull = (owesSignature || !c._deviceSeat) ? 0 : (c._deviceSeat === 'spine' ? 40 : 85);
        // ROUND 76 (item 5) -- and the support seat, on the same scale. An
        // essence that carries a mending lever IS a healer and takes it; a
        // stone that opens `renew` on an essence that does not is teaching it
        // something, which is worth less than being it.
        const supportPull = (owesSignature || !c._supportSeat) ? 0 : (c._supportSeat === 'stone' ? 45 : 85);
        // ROUND 77 (items 6.1, 6.3) -- the two power seats, on the device
        // seat's scale and split the same way by ROUTE. An essence or a
        // confluence the user named by name is the ask itself and pulls 85; a
        // stone that merely leans that way is a leaning and pulls 45. Neither
        // clears the kit-completing 200, so a build that still has no aura
        // takes the aura first -- these are powers worth having and they are
        // not worth having instead of a working kit.
        const heavyPull = (owesSignature || !c._heavyHandSeat) ? 0 : (c._heavyHandSeat === 'stone' ? 45 : 85);
        const waterPull = (owesSignature || !c._waterWalkSeat) ? 0 : (c._waterWalkSeat === 'stone' ? 45 : 85);

        const s = synergyScore(c, knownList) * 10 + (c.kind === lagging ? 15 : 0)
          + (c._completes ? 200 : 0) + summonPull + oddPull + devicePull + supportPull
          + heavyPull + waterPull + (stableHash(c.name) % 10);
        if (s > bestScore) { best = c; bestScore = s; }
      }
      // A belt to the braces above: whatever else is true, a socket that had
      // candidates must not return nothing.
      if (!best) best = candidates[0];
      // ROUND 75 -- and a rare socket that WAS offered a stacking ability takes
      // it. Leaving it to the synergy scorer would mean the rare seat produced
      // an ordinary ability most of the time, which is the reserved-seat lesson
      // from rounds 56 and 74 for a third time: reserving a seat and then
      // letting the general scorer decide is the same as not reserving one.
      if (isRare) {
        const stacked = candidates.find(c => c._rareSeat);
        if (stacked) best = stacked;
        best = { ...best, rare: true };
      }
      addKnown(key, best, slotIndex, stoneId, essDef.id);
      if (best.kind === 'active') stoneActive++; else stonePassive++;
      socketOrdinal++;
    });
    socketOrdinal += STONES_PER_SLOT - slots.slotStones[slotIndex].length;
  };

  for (let i = 0; i < ESSENCE_SLOTS; i++) {
    const essId = slots.slotEssence[i];
    if (!essId) { socketOrdinal += STONES_PER_SLOT; continue; }
    const e = ESSENCES[essId];
    // ROUND 16 -- the essence's own ability is now DRAWN from its 16-strong
    // signature pool rather than being one hardcoded spec named after the
    // essence ("every Fire user gets an ability called Fire"). The pick is
    // synergy-scored against the kit built so far and seeded on the whole
    // essence triplet plus this slot, so it varies with the loadout and is
    // still perfectly stable across reloads.
    const sig = pickSignatureAbility({
      essDef: e, knownList, usedNames, auraState, perceptionState, movementCount, buffState, absorbState,
      seedStr: `${essId}|innate|${essenceIds.slice().sort().join(',')}|slot${i}`,
      slotAttr: slotAttrs[i],
      // The innate MUST stay active: the full-kit shape the user specified
      // is 4 innate actives + 8 stone actives + 8 stone passives = 12/8.
      // A passive innate would silently make it 11/9.
      forcedKind: 'active',
    });
    let innate;
    if (sig) {
      innate = { ...sig, innate: true, essenceId: essId, stoneId: null, color: e.color };
    } else {
      // Fallback, unchanged: an essence with no authored pool keeps the
      // original essence-shaped innate.
      innate = {
        name: e.name, kind: 'active', category: e.template === 'selfHeal' ? 'healing' : (e.template === 'projectileBall' ? 'attack' : 'buff'),
        template: e.template, color: e.color, cooldown: e.cooldown, innate: true,
        essenceId: essId, catKey: null,
        base: e.base, speed: e.speed, radius: e.radius, dot: e.dot || null,
        powerMult: e.powerMult, buffDuration: e.buffDuration,
        critChanceBonus: e.critChanceBonus, critDamageBonus: e.critDamageBonus,
        executeThreshold: e.executeThreshold, healAmount: e.healAmount, critChance: e.critChance,
        desc: `The ${e.name} essence's own innate ability.`,
      };
      innate.rankAspects = rankAspectsFor(innate);
      innate.stats = statsLineFor(innate);
    }
    addKnown(`${i}:innate`, innate, i, null, essId);
    processStones(i, e);
  }

  const confDef = confluenceDefFor(slots.slotEssence.map(id => (id ? ESSENCES[id] : null)));
  if (confDef) {
    // ROUND 51 -- usedNames is handed over so the confluence cannot re-mint a
    // name one of the three essences already produced. See CONFLUENCE_INNATE_NOUNS.
    const innate = { ...confluenceInnateAbility(confDef, usedNames, spine,
      slots.slotEssence.filter(Boolean).join('|'),
      absorbState.count < absorbState.cap), innate: true, essenceId: 'confluence' };
    addKnown('3:innate', innate, 3, null, 'confluence');
    processStones(3, confDef);
  }

  // ========================================================================
  // ROUND 79 (bug 8) -- A KIT MUST NOT DEPEND ON WHAT IT CANNOT DO.
  //
  //   "8) Kits are rolling without synergy. A shadow pierce with no shadow
  //    damage in the kit."
  //
  // And the user's own limit on the repair, asked and answered before it was
  // written: a soft touch. "Kits should feel like they have variety, a kit
  // might have 4 or 5 different synergies but it shouldn't generate buffs or
  // triggers that rely on actions or effects the rest of the kit can't
  // generate." So nothing here removes an ability or narrows a pool. It
  // RETARGETS the two conditions in the generator that can name something the
  // kit never produces, and it leaves everything else alone.
  //
  // Both are element conditions, and they got their element from different
  // wrong places. `elementPierce` took the SOCKET's material -- a Shadow stone
  // in a Fire essence made a shadow pierce over a kit that deals fire -- and
  // `passiveConditional`'s vsElement rolled one of six at random with no
  // reference to the build at all.
  //
  // Why this runs HERE rather than inside the pool builder: what a kit deals
  // is not known until the kit exists. Sixteen sockets are filled in order and
  // the first of them cannot be told what the sixteenth will bring. The
  // alternative -- constraining every socket to the elements chosen so far --
  // would make the first socket's roll decide the whole build's palette, which
  // is the opposite of the variety the user asked to keep.
  reconcileKitSynergy(knownList);

  const counts = {
    total: knownList.length,
    active: knownList.filter(a => a.kind === 'active').length,
    passive: knownList.filter(a => a.kind === 'passive').length,
    rare: knownList.filter(a => a.rare).length,
    // ROUND 47 -- reported so the cap is checkable from outside without
    // re-deriving what "a buff" means; buffs must never exceed BUFF_CAP.
    buffs: buffState.count,
    triggered: knownList.filter(isTriggeredPassive).length,
  };
  return { known, confluence: confDef, counts, spine: spineInfo };
}


/**
 * Map the lever twists' field names onto the names WorldScene's lever runtime
 * actually reads. See the comment at the call site in generateCategoryAbility.
 *
 * Every mapping here is a rename or a shape change, never a new number: the
 * magnitudes were already rolled and are already reflected in the stats line.
 */
export function applyRuntimeFieldNames(spec) {
  if (!spec) return spec;

  // CHAIN: {count, radius, frac} -> chainCount / chainRange / chainDamagePct.
  // chainDamagePct rather than chainDamage on purpose -- the runtime prices a
  // hop as a fraction of `base`, and `base` is in SCALED_FIELDS, so the hop
  // grows with the essence's rank for free.
  if (spec.chain && typeof spec.chain === 'object') {
    spec.chainCount = spec.chain.count;
    spec.chainRange = spec.chain.radius;
    spec.chainDamagePct = spec.chain.frac;
  }

  // ALLIES: the twist rolls one scaling figure; the runtime wants it split
  // into what allies GAIN and what the bearer gains PER ally.
  if (spec.allyScaling && typeof spec.allyScaling === 'object') {
    const per = spec.allyScaling.per || 0.05;
    spec.allyGrant = spec.allyGrant || { power: 1, dmgPct: Math.round(per * 300) / 100 };
    spec.perAllyGain = spec.perAllyGain || {
      resistPct: Math.round(per * 200) / 100,
      dotChancePct: Math.round(per * 200) / 100,
    };
    spec.allyRange = spec.allyScaling.range;
    spec.allyMax = spec.allyScaling.max;
  }

  // TURN: the twist can attach a confuse rider to an ordinary attack, and the
  // confuse_turn CATEGORY rolls its own fields. Normalise both onto the pair
  // the runtime reads, without letting the rider overwrite the category's own
  // (deliberately larger) numbers.
  if (spec.confuse && typeof spec.confuse === 'object') {
    if (spec.confuseDuration === undefined) spec.confuseDuration = spec.confuse.duration;
    if (spec.confuseChance === undefined) spec.confuseChance = spec.confuse.chance;
  }
  if (spec.template === 'confuseTurn') {
    if (spec.duration === undefined) spec.duration = spec.confuseDuration;
    if (spec.confuseDamagePct === undefined) {
      spec.confuseDamagePct = spec.confuseDamageFrac !== undefined ? spec.confuseDamageFrac : 1;
    }
  }

  // FATE: the runtime takes a LIST of reroll kinds and a per-kind cooldown.
  if (spec.reroll && typeof spec.reroll === 'object') {
    spec.rerollKinds = spec.rerollKinds || [spec.reroll.kind || 'crit'];
    if (spec.rerollChance === undefined) spec.rerollChance = spec.reroll.chance;
  }
  if (spec.template === 'fateReroll') {
    spec.rerollKinds = spec.rerollKinds || [spec.rerollKind || 'crit'];
    if (spec.rerollCooldown === undefined) {
      // A death-save must not be re-armable every few seconds; everything else
      // is cheap enough to retry often.
      spec.rerollCooldown = spec.rerollKind === 'death' ? 120 : 8;
    }
  }

  // ROUND 49 -- TAUNT. Two sources land here and both must come out wearing the
  // SAME three names, because the runtime looks for exactly those three and
  // nothing else:
  //   1. the taunt_pull CATEGORY, which rolls tauntRadius/Duration/Max itself
  //      and needs only its defaults filled in;
  //   2. the `taunt` LEVER's rider, which rolls a nested {radius,duration,max}
  //      (the shape every other lever twist writes) and has to be flattened.
  // The category's own numbers win where both exist -- a dedicated taunt is
  // deliberately stronger than a rider bolted onto a shield -- which is why
  // each assignment below is guarded rather than unconditional.
  if (spec.taunt && typeof spec.taunt === 'object') {
    if (spec.tauntRadius === undefined) spec.tauntRadius = spec.taunt.radius;
    if (spec.tauntDuration === undefined) spec.tauntDuration = spec.taunt.duration;
    if (spec.tauntMax === undefined) spec.tauntMax = spec.taunt.max;
  }
  if (spec.template === TAUNT_TEMPLATE || spec.tauntRadius !== undefined) {
    if (spec.tauntRadius === undefined) spec.tauntRadius = TAUNT_DEFAULT_RADIUS;
    if (spec.tauntDuration === undefined) spec.tauntDuration = TAUNT_DEFAULT_DURATION;
    if (spec.tauntMax === undefined) spec.tauntMax = TAUNT_DEFAULT_MAX;
    // Rounded here rather than at every read site. The reach twist multiplies
    // tauntRadius by 1.25-1.45 and scaleFields already re-rounds it, but a
    // signature that PINS a radius can hand over a fraction.
    spec.tauntRadius = Math.max(1, Math.round(spec.tauntRadius));
    spec.tauntMax = Math.max(1, Math.round(spec.tauntMax));
    spec.tauntDuration = Math.round(spec.tauntDuration * 10) / 10;
    // A threat multiplier below 1 would make a taunt REDUCE the damage the
    // monsters it pulled deal, which is not what the field means and is the
    // kind of sign error that reads as balanced until someone measures it.
    if (typeof spec.threatMult === 'number') spec.threatMult = Math.max(1, Math.round(spec.threatMult * 100) / 100);
  }

  // REACH: a rangeBuff needs an explicit multiplier for the runtime to apply.
  if (spec.template === 'rangeBuff' && spec.rangeMult === undefined) {
    spec.rangeMult = spec.reachMult || 2;
  }

  // RESIST: {element, amount} is already the shape _recomputeDerivedStats
  // reads, so it only needs the element to be a real channel.
  return spec;
}
