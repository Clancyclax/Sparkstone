// ===========================================================================
// ROUND 390 -- RITUAL SUMMONS (contract stub; filled in this round).
//
// The user: "Permanent summons fall into 2 categories: summons that you have to find in the wild that align with the
// summon criteria, and summons that require a ritual to summon. Bonded companions can't be subsumed into the
// character, but ritual summons can be subsumed into the caster. Bonded companions generally get stronger and gain
// additional abilities as you rank up, whereas ritual summons may change forms, gain additional forms, and get
// stronger and often grant the player additional powers when subsumed, the powers granted growing stronger as they
// rank up. This is balanced in that a bonded companion is generally stronger but can die and a new bonded companion
// will need to be located and bonded using the essence ability."
//
// A permanent summon ability (template summonBonded) carries `bondKind`: 'wild' (bondThemes.js, wildBondMixin.js)
// or 'ritual' (this file, ritualSummonMixin.js). awakening.js rolls the kind and, for 'ritual', calls
// `rollRitualSummon` to fill the spec and `ritualSummonDesc` for its card.
//
// ROUND 390 -- WHAT A RITUAL SUMMON IS (this file is the data; ritualSummonMixin.js is the world).
//
//   THE BEING. The essence decides what is called across: an astral being, an elemental, a spirit or a construct of
//   the essence's kind (thirteen kinds, `RITUAL_KINDS`, keyed off the essence family with a few names that override
//   it -- Moon and Star are astral, Sun is radiant). A confluence asks its parents and takes the kind most of them
//   agree on. The STONE gets a vote too: a stone of another kind marks the being, and from Bronze it lends its
//   resistance to the subsumed powers.
//
//   ITS FORMS. Three roles, each its own body from the game's monster art and its own numbers: a FIGHTER (strikes
//   hardest), a GUARDIAN (throws itself into the blows aimed at you, and hardens your armour while it is out) and a
//   SCOUT (strikes from furthest, and shows you what lies hidden). One role is the base form; the ranks add the others
//   or CHANGE a form into its greater shape ("may change forms, gain additional forms"). Which, and in what order, is
//   one of three ladders rolled per ability, so two Fire summons need not grow the same way.
//
//   ITS STRENGTH. The being's strike is a share of the ability's own familiar damage (`dmgK` <= 0.8 even in its
//   greater shape), so it rises with rank exactly as that figure does and stays under a wild-bonded creature built
//   from the same figure -- "a bonded companion is generally stronger".
//
//   SUBSUMED. "ritual summons can be subsumed into the caster": it leaves the world and the caster gains its powers --
//   a stat rider and a resistance or sense from Iron, a triggered or on-hit power from Silver, the stone's mark from
//   Bronze -- each a field the game already reads (`RITUAL_SUMMON_FIELDS`), each growing at every rank.
//
//   THE RITE. The game's ritual rules (ritualMixin.js / skillBookMixin.js): performed in a ritual room -- the Society
//   ritual hall -- or anywhere with an awakened ritual ability such as Enact Ritual; thirty seconds, broken by moving or
//   being hurt, drawing mana and stamina as it runs (ritualStage.js `riteDrainFor('familiar', ...)`). If the being
//   falls, the rite can be performed again after `REFORM_SECONDS`; a dismissed one can be called again at once.
// ===========================================================================
import { ESSENCE_CATALOG } from './essenceCatalog.js';
import { STONE_CATALOG } from './stoneCatalog.js';
import { MONSTER_ART } from './monsterArt.js';
import { FAMILY_DISPLAY_NAME } from './monsters.js';
import { summonCreatureFor } from './summonCreatures.js';
import { riteThemeFor, riteDrainFor, RITE_SECONDS } from './ritualStage.js';
import { TILE } from './iso.js';
// ROUND 391 -- a confluence with an identity sheet calls its OWN beings (its sheet's `ritual`), not its parents' vote.
import { sheetRitualKind } from './confluenceIdentity.js';

/** The ranks a ritual summon grows through (an ability at Normal reads as Iron). */
// ROUND 390 -- no Diamond: the user's standing rule is no Diamond-rank content. A rank past Gold reads the Gold row.
export const RS_RANKS = ['iron', 'bronze', 'silver', 'gold'];
export const RS_RANK_LABEL = { iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
export function rsRankIdx(rank) {
  const i = RS_RANKS.indexOf(rank);
  if (i >= 0) return i;
  return rank === 'diamond' ? RS_RANKS.length - 1 : 0;   // Normal (or unknown) reads Iron; past Gold reads Gold
}

/** ROUND 390 -- after it falls, how long before the rite can call it again. */
export const REFORM_SECONDS = 300;
/** The rite's share of mana it needs to begin (the essence familiar rites' figure, rituals.js). */
export const RITE_COST_FRAC = 0.5;
/** A subsumed being heals this share of its health a second; a present one, out of the fight, this share. */
export const SUBSUMED_HEAL_PER_S = 0.05;
export const PRESENT_HEAL_PER_S = 0.02;
/** How long after its last wound a present being starts to heal. */
export const PRESENT_HEAL_DELAY_S = 6;

/**
 * THE THREE ROLES. `dmgK` is the share of the ability's familiar damage each strike deals; `share` is the part of each
 * blow that lands on the player which the being takes instead; `hp` is its health at unit scale (healthScale.js
 * `unitK` raises it with the player's rank). The greater shape multiplies strike and health by `GREATER_K`.
 */
export const RITUAL_ROLES = {
  fighter: { key: 'fighter', label: 'fighter', dmgK: 0.7, interval: 1.2, range: 150, share: 0.15, hp: 40 },
  guardian: { key: 'guardian', label: 'guardian', dmgK: 0.35, interval: 1.6, range: 110, share: 0.35, hp: 70,
    armorBonus: [0.05, 0.07, 0.09, 0.11] },
  scout: { key: 'scout', label: 'scout', dmgK: 0.5, interval: 1.0, range: 230, share: 0.08, hp: 30,
    lurkReveal: [0.3, 0.4, 0.5, 0.6] },
};
export const ROLE_KEYS = ['fighter', 'guardian', 'scout'];
export const GREATER_K = { dmg: 1.15, hp: 1.25 };

// --- the subsume powers' vocabulary ---------------------------------------------------------------------------------
// Each power names ONE field of `passiveMods` and the op that folds it in. The op list is closed and every field is
// one an existing reader consumes (the round-390 suite greps each).
//   add    mods[field] += v                  mult   mods[field] *= 1 + v
//   resist mods.resistBonus[el] += v         minor  mods.minorBonus[field] += v   (stats.js, natureMixin's door)
//   sense  mods[field] = max(mods[field], v) (a flag when v === true)
//   dot    mods.strikeDot = the stronger     (every weapon strike applies it)
//   trigger mods.triggers.push(...)          (_onTriggerEvent / _updateTriggers / _fireTrigger)
const P = (o) => o;
const R4 = (a, b, c, d) => [a, b, c, d];   // Iron, Bronze, Silver, Gold

/**
 * THE KINDS. `forms` are the three roles' bodies (MONSTER_ART families) and names, with the name and, where the art
 * allows, the body of the greater shape. `powers` are the subsume powers: [0] and [1] from Iron, [2] from Silver.
 */
export const RITUAL_KINDS = {
  ember: {
    label: 'a fire elemental', element: 'fire', resist: 'fire',
    forms: {
      fighter: { name: 'Cinder Hound', family: 'hellhound', greater: 'Pyre Hound' },
      guardian: { name: 'Kiln Warden', family: 'kilnwarden', greater: 'Furnace Warden' },
      scout: { name: 'Ember Wing', family: 'phoenix', greater: 'Sunfire Wing' },
    },
    powers: [
      P({ id: 'emberMight', op: 'mult', field: 'dmgMult', values: R4(0.04, 0.06, 0.08, 0.10) }),
      P({ id: 'emberWard', op: 'resist', el: 'fire', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'emberBrand', op: 'dot', label: 'Burn', values: R4(0, 0, 2, 3), ticks: 3, tickMs: 800 }),
    ],
  },
  frost: {
    label: 'a frost elemental', element: 'frost', resist: 'frost',
    forms: {
      fighter: { name: 'Rime Shard', family: 'shardling', greater: 'Glacial Shard' },
      guardian: { name: 'Rimebrute', family: 'yeti', greater: 'Winter Colossus' },
      scout: { name: 'Frost Fox', family: 'shiverfox', greater: 'Aurora Fox', greaterFamily: 'rimehare' },
    },
    powers: [
      P({ id: 'frostHide', op: 'add', field: 'armorBonus', values: R4(0.06, 0.09, 0.12, 0.15) }),
      P({ id: 'frostWard', op: 'resist', el: 'frost', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'frostBite', op: 'dot', label: 'Frostbite', values: R4(0, 0, 2, 3), ticks: 3, tickMs: 900 }),
    ],
  },
  storm: {
    label: 'a storm elemental', element: 'lightning', resist: 'lightning',
    forms: {
      fighter: { name: 'Storm Jar', family: 'stormjar', greater: 'Tempest Jar' },
      guardian: { name: 'Gale Elemental', family: 'elemental', greater: 'Thunderhead' },
      scout: { name: 'Squall Wing', family: 'thunderbird', greater: 'Stormroc' },
    },
    powers: [
      P({ id: 'stormStride', op: 'add', field: 'moveSpeedPct', values: R4(0.04, 0.06, 0.08, 0.10) }),
      P({ id: 'stormWard', op: 'resist', el: 'lightning', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'stormArc', op: 'trigger', on: 'strike', cooldown: 4,
        effect: { kind: 'boltNearest', range: 260 }, amountKey: 'damage', values: R4(0, 0, 10, 16) }),
    ],
  },
  tide: {
    label: 'a tide spirit', element: 'water', resist: 'water',
    forms: {
      fighter: { name: 'Brine Wight', family: 'drownwight', greater: 'Undertow Wight', greaterFamily: 'saltwife' },
      guardian: { name: 'Reef Warden', family: 'tidalTroll', greater: 'Tidewall Warden' },
      scout: { name: 'Lure Spirit', family: 'lurefin', greater: 'Deepglow Spirit' },
    },
    powers: [
      P({ id: 'tideBreath', op: 'minor', field: 'staminaRegen', values: R4(0.08, 0.12, 0.16, 0.20) }),
      P({ id: 'tideWard', op: 'resist', el: 'water', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'tideReturn', op: 'trigger', on: 'kill', cooldown: 3,
        effect: { kind: 'restoreResource', resource: 'mana' }, amountKey: 'amount', values: R4(0, 0, 8, 12) }),
    ],
  },
  stone: {
    label: 'a stone construct', element: 'earth', resist: 'earth',
    forms: {
      fighter: { name: 'Gem Boar', family: 'boar', greater: 'Crystalback Boar' },
      guardian: { name: 'Cairn Shell', family: 'geodeback', greater: 'Mountain Shell' },
      scout: { name: 'Scree Runner', family: 'scalecurl', greater: 'Landslide Runner' },
    },
    powers: [
      P({ id: 'stoneSpines', op: 'add', field: 'thornsPassive', values: R4(0.06, 0.09, 0.12, 0.15) }),
      P({ id: 'stoneWard', op: 'resist', el: 'earth', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'stoneBulwark', op: 'trigger', on: 'hpBelow', frac: 0.4, rearmAbove: 0.6, cooldown: 30,
        effect: { kind: 'wardBurst', duration: 6 }, amountKey: 'frac', values: R4(0, 0, 0.10, 0.14) }),
    ],
  },
  construct: {
    label: 'a clockwork construct', element: 'physical', resist: 'piercing',
    forms: {
      fighter: { name: 'Brass Raptor', family: 'steelRaptor', greater: 'Steel Raptor' },
      guardian: { name: 'Iron Mantle', family: 'rustmantle', greater: 'Bastion Mantle', greaterFamily: 'slimeGolem' },
      scout: { name: 'Clockwork Crawler', family: 'clockcrawler', greater: 'Chronometer Crawler' },
    },
    powers: [
      P({ id: 'gearTiming', op: 'add', field: 'cooldownReduction', values: R4(0.03, 0.05, 0.07, 0.09) }),
      P({ id: 'gearSight', op: 'sense', field: 'weakspotCrit', values: R4(0.04, 0.06, 0.08, 0.10), alsoFlag: 'healthbars' }),
      P({ id: 'gearSpring', op: 'trigger', on: 'crit', cooldown: 2,
        effect: { kind: 'restoreResource', resource: 'stamina' }, amountKey: 'amount', values: R4(0, 0, 6, 9) }),
    ],
  },
  shade: {
    label: 'a shadow spirit', element: 'shadow', resist: 'shadow',
    forms: {
      fighter: { name: 'Shade', family: 'shade', greater: 'Umbral Shade' },
      guardian: { name: 'Lantern Wraith', family: 'lanternwraith', greater: 'Gloam Wraith' },
      scout: { name: 'Smoke Cur', family: 'smokecur', greater: 'Night Cur' },
    },
    powers: [
      P({ id: 'shadeSlip', op: 'add', field: 'leverDodge', values: R4(0.03, 0.045, 0.06, 0.075) }),
      P({ id: 'shadeEyes', op: 'sense', field: 'nightVision', values: R4(0.3, 0.45, 0.6, 0.75) }),
      P({ id: 'shadeCut', op: 'trigger', on: 'kill', cooldown: 6,
        effect: { kind: 'critChance', strikes: 1 }, amountKey: 'amount', values: R4(0, 0, 0.5, 0.75) }),
    ],
  },
  wraith: {
    label: 'a grave spirit', element: 'necrotic', resist: 'necrotic',
    forms: {
      fighter: { name: 'Grave Herald', family: 'harbinger', greater: 'Doom Herald' },
      guardian: { name: 'Bone Knight', family: 'ossuaryKnight', greater: 'Ossuary Lord', greaterFamily: 'pallbearer' },
      scout: { name: 'Carrion Pecker', family: 'bonepecker', greater: 'Bone Crow' },
    },
    powers: [
      P({ id: 'graveFeed', op: 'add', field: 'lifeOnKill', values: R4(2, 3, 4, 5) }),
      P({ id: 'graveWard', op: 'resist', el: 'necrotic', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'graveDrink', op: 'trigger', on: 'strike', cooldown: 10,
        effect: { kind: 'lifedrainBuff', duration: 4 }, amountKey: 'amount', values: R4(0, 0, 0.06, 0.08) }),
    ],
  },
  radiant: {
    label: 'a radiant spirit', element: 'radiant', resist: 'radiant',
    forms: {
      fighter: { name: 'Halo Wing', family: 'birdangel', greater: 'Seraph Wing' },
      guardian: { name: 'Choir Ward', family: 'hollowchoir', greater: 'Cathedral Choir' },
      scout: { name: 'Lantern Moth', family: 'duskmoth', greater: 'Dawn Moth' },
    },
    powers: [
      P({ id: 'radiantVigour', op: 'add', field: 'maxHpBonus', values: R4(10, 15, 20, 25) }),
      P({ id: 'radiantWard', op: 'resist', el: 'radiant', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'radiantMend', op: 'trigger', on: 'kill', cooldown: 6,
        effect: { kind: 'regenBurst', duration: 4 }, amountKey: 'perSec', values: R4(0, 0, 4, 6) }),
    ],
  },
  astral: {
    label: 'an astral being', element: 'arcane', resist: 'arcane',
    forms: {
      fighter: { name: 'Astral Coil', family: 'spiritSerpent', greater: 'Starcoil' },
      guardian: { name: 'Watching Eye', family: 'monocul', greater: 'Eye of the Deep Sky' },
      scout: { name: 'Drift Spirit', family: 'driftreaver', greater: 'Void Drifter' },
    },
    powers: [
      P({ id: 'astralWell', op: 'minor', field: 'manaRegen', values: R4(0.08, 0.12, 0.16, 0.20) }),
      P({ id: 'astralWard', op: 'resist', el: 'arcane', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'astralSurge', op: 'trigger', on: 'kill', cooldown: 6,
        effect: { kind: 'nextSpellDamage', charges: 1 }, amountKey: 'amount', values: R4(0, 0, 0.3, 0.45) }),
    ],
  },
  verdant: {
    label: 'a verdant spirit', element: 'nature', resist: 'poison',
    forms: {
      fighter: { name: 'Bloom Sprite', family: 'bloomimp', greater: 'Blossom Sprite', greaterFamily: 'flowerhydra' },
      guardian: { name: 'Thorn Warden', family: 'vinegrasp', greater: 'Bramble Warden' },
      scout: { name: 'Spore Stag', family: 'sporehorn', greater: 'Greenwood Stag' },
    },
    powers: [
      P({ id: 'verdantSap', op: 'add', field: 'lifeRegenFlat', values: R4(0.6, 0.9, 1.2, 1.5) }),
      P({ id: 'verdantWard', op: 'resist', el: 'poison', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'verdantBloom', op: 'trigger', on: 'hpBelow', frac: 0.5, rearmAbove: 0.7, cooldown: 25,
        effect: { kind: 'healingTakenBuff', duration: 6 }, amountKey: 'amount', values: R4(0, 0, 0.15, 0.2) }),
    ],
  },
  totem: {
    label: 'a beast spirit', element: 'physical', resist: 'slashing',
    forms: {
      // The fighter is the essence's own creature where it has one (summonCreatures.js), drawn as its spirit.
      fighter: { name: 'Spirit Wolf', family: 'wolf', greater: 'Great Spirit Wolf', ownCreature: true },
      guardian: { name: 'Totem Warden', family: 'totemstalk', greater: 'Elder Totem' },
      scout: { name: 'Spirit Hart', family: 'direbuck', greater: 'White Hart' },
    },
    powers: [
      P({ id: 'totemFang', op: 'add', field: 'critChance', values: R4(0.02, 0.03, 0.04, 0.05) }),
      P({ id: 'totemTread', op: 'sense', field: 'tremorSense', values: R4(150, 280, 380, 480) }),
      P({ id: 'totemFury', op: 'trigger', on: 'kill', cooldown: 12,
        effect: { kind: 'physicalDamageMult', duration: 6 }, amountKey: 'amount', values: R4(0, 0, 0.3, 0.45) }),
    ],
  },
  armament: {
    label: 'an armament spirit', element: 'physical', resist: 'slashing',
    forms: {
      fighter: { name: 'Duel Wraith', family: 'mantis', greater: 'Thousand-Cut Wraith' },
      guardian: { name: 'Shield Bearer', family: 'pallbearer', greater: 'Phalanx Bearer' },
      scout: { name: 'Marionette Duelist', family: 'stringless', greater: 'Unstrung Duelist' },
    },
    powers: [
      P({ id: 'armsTempo', op: 'minor', field: 'attackSpeed', values: R4(0.03, 0.045, 0.06, 0.075) }),
      P({ id: 'armsWard', op: 'resist', el: 'slashing', values: R4(0.10, 0.14, 0.18, 0.22) }),
      P({ id: 'armsSecondWind', op: 'trigger', on: 'strike', cooldown: 1.5,
        effect: { kind: 'restoreResource', resource: 'stamina' }, amountKey: 'amount', values: R4(0, 0, 3, 4) }),
    ],
  },
};
export const RITUAL_KIND_KEYS = Object.keys(RITUAL_KINDS);

/** Every `passiveMods` field a ritual summon writes (present or subsumed) -- each must have a reader. */
export const RITUAL_SUMMON_FIELDS = (() => {
  const s = new Set(['familiars', 'armorBonus', 'lurkReveal', 'resistBonus', 'minorBonus', 'strikeDot', 'triggers']);
  for (const k of Object.values(RITUAL_KINDS)) {
    for (const p of k.powers) { if (p.field && p.op !== 'minor') s.add(p.field); if (p.alsoFlag) s.add(p.alsoFlag); }
  }
  return [...s];
})();
/** The minor stats a ritual summon adds to (stats.js MINOR_STATS keys). */
export const RITUAL_SUMMON_MINORS = [...new Set(Object.values(RITUAL_KINDS).flatMap(k => k.powers.filter(p => p.op === 'minor').map(p => p.field)))];

// --- which kind ----------------------------------------------------------------------------------------------------
const FAMILY_KIND = {
  fire: 'ember', cold: 'frost', storm: 'storm', air: 'storm', water: 'tide', aquatic: 'tide',
  earth: 'stone', guard: 'stone', craft: 'construct', motion: 'construct', alchemy: 'construct',
  dark: 'shade', death: 'wraith', blood: 'wraith', light: 'radiant', order: 'radiant',
  space: 'astral', mind: 'astral', identity: 'astral', life: 'verdant',
  beast: 'totem', smallbeast: 'totem', flyer: 'totem', serpent: 'totem',
  blade: 'armament', polearm: 'armament', bludgeon: 'armament', ranged: 'armament', force: 'armament',
};
const NAME_KIND = {
  essMoon: 'astral', essStar: 'astral', essSun: 'radiant', essLightning: 'storm', essIce: 'frost', essCold: 'frost',
  essCrystal: 'stone', essGlass: 'stone', essIron: 'construct', essTechnology: 'construct', essWheel: 'construct',
  essSmoke: 'shade', essVoid: 'astral', essDimension: 'astral', essBone: 'wraith', essBlood: 'wraith',
  essFungus: 'verdant', essCoral: 'tide',
  // ROUND 390 -- mind essences that are a hunter's or a beast's (not a mind from beyond), and the mirror's glass.
  essHunt: 'totem', essMirror: 'stone',
};
const ELEMENTAL_KINDS = ['ember', 'frost', 'storm', 'tide', 'stone'];

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function essIdOf(essDef, spec) {
  if (essDef && essDef.id && (ESSENCE_CATALOG[canonicalEssenceId(essDef.id)] || essDef.id === 'confluence')) return essDef.id === 'confluence' ? 'confluence' : canonicalEssenceId(essDef.id);
  if (spec && spec.essenceId) return canonicalEssenceId(spec.essenceId);
  if (essDef && essDef.name) {
    const n = String(essDef.name).toLowerCase();
    for (const [id, row] of Object.entries(ESSENCE_CATALOG)) if (String(row.name || '').toLowerCase() === n) return id;
  }
  return (essDef && essDef.id) || null;
}
/**
 * ROUND 390 -- the catalogue's id for whatever the caller passed. The game carries a few essences under two spellings
 * (the catalogue's bare `fire` / `shadow` / `might`, and `essFire` from quintessence.js and older saves); an id the
 * catalogue does not know was falling all the way through to the astral default -- a Fire essence summoning "an
 * astral being".
 */
export function canonicalEssenceId(essId) {
  if (!essId) return null;
  const id = String(essId);
  if (ESSENCE_CATALOG[id] || NAME_KIND[id]) return id;
  if (id.startsWith('ess')) {
    const bare = id.slice(3).toLowerCase();
    if (ESSENCE_CATALOG[bare]) return bare;
  } else {
    const ess = 'ess' + id.charAt(0).toUpperCase() + id.slice(1);
    if (ESSENCE_CATALOG[ess]) return ess;
  }
  return id;
}
/** Words that say what an essence is made of, for an id or name the tables do not know. */
const WORD_KIND = [
  [/fire|flame|volcan|ember|ash|magma|lava|pyre|inferno|cinder|blaze|burn|smoulder/i, 'ember'],
  [/ice|frost|cold|snow|winter|wendigo|rime|glacier|chill|freez/i, 'frost'],
  [/storm|lightning|wind|sky|thunder|cloud|tempest|gale|surge/i, 'storm'],
  [/water|tide|sea|deep|fish|ocean|rain|wave|river|coral|whale|shark|brine/i, 'tide'],
  [/earth|stone|rock|sand|dust|crystal|mountain|glass|gem/i, 'stone'],
  [/shadow|dark|night|void|smoke|shade|umbra/i, 'shade'],
  [/death|bone|blood|grave|undeath|corpse|blight|decay|rot/i, 'wraith'],
  [/light|sun|holy|radiant|pure|dawn|divine/i, 'radiant'],
  [/life|plant|tree|growth|heal|wood|flower|fungus|bloom|vine/i, 'verdant'],
  [/iron|steel|gear|clock|technolog|machine|wheel|metal/i, 'construct'],
  [/sword|blade|axe|spear|hammer|bow|gun|might|war/i, 'armament'],
  [/beast|wolf|cat|bear|bird|snake|hound|hunt/i, 'totem'],
];
export function ritualKindForWords(...words) {
  const w = words.filter(Boolean).join(' ').replace(/^ess(?=[A-Z])/, '');
  for (const [re, k] of WORD_KIND) if (re.test(w)) return k;
  return null;
}
/** The kind an essence id calls, or null. */
export function ritualKindForEssence(essId0) {
  if (!essId0) return null;
  const essId = canonicalEssenceId(essId0);
  if (NAME_KIND[essId]) return NAME_KIND[essId];
  const row = ESSENCE_CATALOG[essId];
  return (row && FAMILY_KIND[row.family]) || ritualKindForWords(essId, row && row.name) || null;
}
/** The kind a stone marks, or null. */
export function ritualKindForStone(stoneId) {
  if (!stoneId) return null;
  const twin = String(stoneId).startsWith('stone') ? 'ess' + String(stoneId).slice(5) : null;
  if (twin && NAME_KIND[twin]) return NAME_KIND[twin];
  const row = STONE_CATALOG[stoneId];
  return (row && FAMILY_KIND[row.family]) || null;
}
/**
 * The kind for (essence, stone, parents). The essence decides; a confluence asks its parents and takes the kind most
 * of them agree on (ties to the first parent); with no answer, its own family; then astral, the being from beyond.
 */
export function ritualKindFor(essId, essDef = null, parents = null, pick = 0) {
  if (canonicalEssenceId(essId) === 'essElemental') return ELEMENTAL_KINDS[pick % ELEMENTAL_KINDS.length];
  if (essId === 'confluence' || (!ESSENCE_CATALOG[canonicalEssenceId(essId)] && parents && parents.length)) {
    const votes = {};
    const order = [];
    for (const pid of (parents || [])) {
      const k = ritualKindForEssence(pid);
      if (!k) continue;
      if (!(k in votes)) order.push(k);
      votes[k] = (votes[k] || 0) + 1;
    }
    const best = order.sort((a, b) => votes[b] - votes[a])[0];
    if (best) return best;
  }
  return ritualKindForEssence(essId) || (essDef && FAMILY_KIND[essDef.family])
    || ritualKindForWords(essDef && essDef.name, essDef && essDef.phrase) || 'astral';
}

// --- the ladders ---------------------------------------------------------------------------------------------------
/**
 * Three ways a being grows. `add` is the rank a role's form becomes selectable; `greater` the rank it takes its
 * greater shape. r0 is the base role, r1 and r2 the others in their rolled order.
 */
export const RITUAL_LADDERS = {
  // A: a second form at Bronze, the first changes at Silver, a third form at Gold, where the other two change.
  widen: { r0: { add: 'iron', greater: 'silver' }, r1: { add: 'bronze', greater: 'gold' }, r2: { add: 'gold', greater: 'gold' } },
  // B: the first form changes at Bronze, a second form at Silver, a third at Gold, where the other two change.
  deepen: { r0: { add: 'iron', greater: 'bronze' }, r1: { add: 'silver', greater: 'gold' }, r2: { add: 'gold', greater: 'gold' } },
  // C: a form at each of Iron, Bronze and Silver; at Gold every form changes.
  ascend: { r0: { add: 'iron', greater: 'gold' }, r1: { add: 'bronze', greater: 'gold' }, r2: { add: 'silver', greater: 'gold' } },
};
export const RITUAL_LADDER_KEYS = Object.keys(RITUAL_LADDERS);

const creatureName = (fam) => FAMILY_DISPLAY_NAME[fam] || fam;
/** WorldScene's FAMILIAR_WEAPON_RE and its fowl words: a familiar named with one is drawn as that thing. */
export const NAME_TRAP_RE = /blade|sword|axe|dagger|spear|lance|hammer|maul|mace|scythe|sickle|whip|lash|chain|staff|glaive|halberd|fang|talon|claw|edge|knife|pike|cleaver|reaper|\b(duck|drake|mallard|waddle|hen|chick|chicken|fowl|brood|clutch|roost|flock)\b/i;

/** Fill a ritual summon's own fields on `spec` (forms, subsume powers, ritual). `roll(salt, n)` is the generator's
 *  seeded roll. Returns spec. ROUND 390 -- `opts.essenceIds` (optional) are a confluence's parent essences. */
export function rollRitualSummon(spec, essDef, stoneId, roll, opts = {}) {
  spec.bondKind = 'ritual';
  const seed = `${(spec && (spec.name || spec.key)) || ''}|${stoneId || ''}`;
  const r = typeof roll === 'function' ? (salt, n) => Math.abs(Math.floor(roll(`ritual|${salt}`, n) || 0)) % n
    : (salt, n) => hashStr(`${seed}|${salt}`) % n;
  // ROUND 390 -- `opts.essenceId` when the caller knows it and the row it passes does not (ESSENCES has no `essFire`).
  const essId = (opts.essenceId && canonicalEssenceId(opts.essenceId)) || essIdOf(essDef, spec);
  const parents = opts.essenceIds || spec.parentEssences || (essDef && (essDef.parents || essDef.essenceIds)) || null;
  let kindKey = ritualKindFor(essId, essDef, parents, r('elemental', ELEMENTAL_KINDS.length));
  // With no essence to read (no id reached us), the ability's own element is the next best witness.
  if (kindKey === 'astral' && !ritualKindForEssence(essId) && !(parents && parents.length)) kindKey = ritualKindForWords(spec.element) || kindKey;
  // ROUND 391 -- "The Volcano confluence should ... summon lava elementals or Salamanders": a confluence whose sheet
  // writes its beings calls those (one form per role, chosen by the same seeded roll), whatever its parents would vote.
  const sheetK = essId === 'confluence' && essDef && essDef.name ? sheetRitualKind(essDef.name, r) : null;
  if (sheetK) kindKey = sheetK.key;
  const K = sheetK || RITUAL_KINDS[kindKey];
  const stoneKind = ritualKindForStone(stoneId);
  // The roles' order: the base role, then the other two.
  const roles = ROLE_KEYS.slice();
  const first = roles.splice(r('role', 3), 1)[0];
  const second = roles.splice(r('role2', 2), 1)[0];
  const order = [first, second, roles[0]];
  const ladderKey = RITUAL_LADDER_KEYS[r('ladder', RITUAL_LADDER_KEYS.length)];
  const L = RITUAL_LADDERS[ladderKey];
  // The totem's fighter is the essence's own creature, where it has one with art.
  let own = null;
  if (kindKey === 'totem') {
    const fam = summonCreatureFor(essId === 'confluence' ? 'confluence' : essId, parents);
    if (fam && MONSTER_ART[fam]) own = fam;
  }
  const forms = order.map((role, i) => {
    const f = K.forms[role];
    const step = L[`r${i}`];
    const fam = (f.ownCreature && own) ? own : f.family;
    // A creature whose name carries a weapon or bird word ("Duskfang", "Clawstrider") would be drawn as a floating
    // weapon or a chicken by `_familiarSprite`'s name tests, so it keeps its body and takes the plain spirit name.
    const ownName = own && !NAME_TRAP_RE.test(creatureName(own)) ? creatureName(own) : 'Beast';
    const name = (f.ownCreature && own) ? `Spirit ${ownName}` : f.name;
    const greaterName = (f.ownCreature && own) ? `Great Spirit ${ownName}` : f.greater;
    return {
      id: role, role, name, family: MONSTER_ART[fam] ? fam : 'elemental',
      unlock: step.add, greaterAt: step.greater, greaterName,
      greaterFamily: f.greaterFamily && MONSTER_ART[f.greaterFamily] ? f.greaterFamily : null,
      // ROUND 391 -- a sheet being may name its shade ("an obsidian geodeback"); WorldScene `_summonShadeFor` reads it.
      ...(f.shade ? { shade: f.shade } : {}), ...(f.greaterShade ? { greaterShade: f.greaterShade } : {}),
    };
  });
  const powers = K.powers.map((p, i) => ({ ...p, values: p.values.slice(), unlock: p.unlock || (i === 2 ? 'silver' : 'iron') }));   // ROUND 391 -- a sheet power may name its rank
  // The stone's mark: a stone of another kind lends its resistance from Bronze, at about half the being's own.
  if (stoneKind && stoneKind !== kindKey) {
    const SK = RITUAL_KINDS[stoneKind];
    const el = SK.resist;
    if (!powers.some(p => p.op === 'resist' && p.el === el)) {
      powers.push({ id: `${stoneKind}Mark`, op: 'resist', el, values: R4(0, 0.06, 0.08, 0.10), unlock: 'bronze', stoneMark: stoneKind });
    }
  }
  const essName = (ESSENCE_CATALOG[essId] && ESSENCE_CATALOG[essId].name) || (essDef && essDef.name) || 'the essence';
  const theme = riteThemeFor({
    essenceId: essId, stoneId, essenceFamily: (ESSENCE_CATALOG[essId] || essDef || {}).family,
    stoneFamily: (STONE_CATALOG[stoneId] || {}).family,
  });
  const drain = riteDrainFor('familiar', theme, { costFrac: RITE_COST_FRAC });
  spec.ritual = {
    kind: kindKey, label: K.label, element: K.element, stoneKind: stoneKind && stoneKind !== kindKey ? stoneKind : null,
    ...(sheetK ? { sheet: sheetK.sheet } : {}),   // ROUND 391
    ladder: ladderKey, forms, powers,
    rite: {
      theme, castS: RITE_SECONDS, costFrac: RITE_COST_FRAC, reformS: REFORM_SECONDS, drain,
      chant: [`By ${String(essName).toLowerCase()}, I open the way across.`, `Come through, ${forms[0].name}, and take the shape I name.`],
    },
  };
  if (!(spec.familiarDmg > 0)) spec.familiarDmg = 5;
  if (!(spec.familiarInterval > 0)) spec.familiarInterval = 1.2;
  if (!(spec.familiarRange > 0)) spec.familiarRange = 150;
  // The ritual being's body is the base form's; the bonded-familiar creature fields belong to the wild kind.
  spec.familiarFamily = forms[0].family;
  spec.familiarCreatureName = forms[0].name;
  delete spec.mount; delete spec.mountFamily;
  return spec;
}

// --- reading a being at a rank ------------------------------------------------------------------------------------
/** The forms selectable at `rank`, each with `greater` (its greater shape reached) and its shown name and body. */
export function ritualFormsAt(ritual, rank) {
  if (!ritual || !Array.isArray(ritual.forms)) return [];
  const ri = rsRankIdx(rank);
  return ritual.forms.filter(f => rsRankIdx(f.unlock) <= ri).map(f => {
    const greater = !!f.greaterAt && rsRankIdx(f.greaterAt) <= ri;
    return { ...f, greater, shownName: greater ? (f.greaterName || f.name) : f.name,
      shownFamily: greater && f.greaterFamily ? f.greaterFamily : f.family,
      shownShade: greater && f.greaterFamily ? (f.greaterShade || null) : (f.shade || null) };   // ROUND 391
  });
}
/** The form a state asks for, if selectable at this rank; else the first selectable one. */
export function ritualFormPick(ritual, rank, want) {
  const forms = ritualFormsAt(ritual, rank);
  return forms.find(f => f.id === want) || forms[0] || null;
}
/** A form's numbers. `baseDmg` is the ability's (scaled) familiar damage; `unitK` the health scale for the rank. */
export function ritualFormStats(form, rank, baseDmg, unitK = 1) {
  const R = RITUAL_ROLES[form.role] || RITUAL_ROLES.fighter;
  const g = form.greater ? GREATER_K : { dmg: 1, hp: 1 };
  const ri = rsRankIdx(rank);
  return {
    familiarDmg: Math.max(1, Math.round((baseDmg || 5) * R.dmgK * g.dmg)),
    familiarInterval: R.interval, familiarRange: R.range, share: R.share,
    maxHp: Math.max(1, Math.round(R.hp * (unitK || 1) * g.hp)),
    armorBonus: R.armorBonus ? R.armorBonus[ri] : 0,
    lurkReveal: R.lurkReveal ? R.lurkReveal[ri] : 0,
  };
}
/** The subsume powers live at `rank`, each with its `value`. */
export function subsumePowersAt(ritual, rank) {
  if (!ritual || !Array.isArray(ritual.powers)) return [];
  const ri = rsRankIdx(rank);
  return ritual.powers.filter(p => rsRankIdx(p.unlock) <= ri && (p.values[ri] || 0) > 0)
    .map(p => ({ ...p, value: p.values[ri] }));
}
/**
 * Fold subsume powers into `mods`. `o.key` keys the triggers (`<key>|ritual:<id>`, so `_scaledAbility` finds no
 * ability behind it and the trigger's own spec is read); `o.name` names them. Flat health figures (lifeOnKill,
 * lifeRegenFlat, maxHpBonus, regenBurst) are scaled by their own readers (healthScale.js `unitK`).
 */
export function applySubsumePowers(mods, powers, o = {}) {
  for (const p of powers) {
    const v = p.value;
    switch (p.op) {
      case 'add': mods[p.field] = (mods[p.field] || 0) + v; break;
      case 'mult': mods[p.field] = (typeof mods[p.field] === 'number' ? mods[p.field] : 1) * (1 + v); break;
      case 'resist': mods.resistBonus = mods.resistBonus || {}; mods.resistBonus[p.el] = (mods.resistBonus[p.el] || 0) + v; break;
      case 'minor': mods.minorBonus = mods.minorBonus || {}; mods.minorBonus[p.field] = (mods.minorBonus[p.field] || 0) + v; break;
      case 'sense':
        mods[p.field] = Math.max(typeof mods[p.field] === 'number' ? mods[p.field] : 0, v);
        if (p.alsoFlag) mods[p.alsoFlag] = true;
        break;
      case 'dot': {
        const dot = { dmgPerTick: v, ticks: p.ticks || 3, tickMs: p.tickMs || 800, critChance: 0, label: p.label };
        if (!mods.strikeDot || (mods.strikeDot.dmgPerTick || 0) < v) mods.strikeDot = dot;
        break;
      }
      case 'trigger': {
        mods.triggers = mods.triggers || [];
        const tr = { on: p.on };
        if (p.frac != null) tr.frac = p.frac;
        if (p.rearmAbove != null) tr.rearmAbove = p.rearmAbove;
        mods.triggers.push({ key: `${o.key || 'ritual'}|ritual:${p.id}`,
          ability: { name: o.name || 'Subsumed', trigger: tr, cooldown: p.cooldown || 0, effect: { ...p.effect, [p.amountKey]: v } } });
        break;
      }
      default: break;
    }
  }
  return mods;
}

// --- the card ------------------------------------------------------------------------------------------------------
const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const tiles = (u) => { const t = Math.max(1, Math.round(((u || 0) / TILE) * 2) / 2); return `${t} tile${t === 1 ? '' : 's'}`; };
const RES_LABEL = { fire: 'fire', frost: 'frost', lightning: 'lightning', water: 'water', earth: 'earth', piercing: 'piercing',
  shadow: 'shadow', necrotic: 'necrotic', radiant: 'radiant', arcane: 'arcane', poison: 'poison', slashing: 'slashing' };
const MINOR_LABEL = { staminaRegen: 'stamina recovery', manaRegen: 'mana recovery', attackSpeed: 'weapon attack speed' };
/** Fields whose figure is a share (printed as N%); the rest are counts. */
const PCT_FIELDS = new Set(['dmgMult', 'armorBonus', 'moveSpeedPct', 'thornsPassive', 'cooldownReduction', 'leverDodge',
  'critChance', 'weakspotCrit', 'nightVision']);
/** How one figure of a power is printed. */
export function subsumeFigure(p, v) {
  if (p.op === 'resist' || p.op === 'minor') return pct(v);
  if (p.op === 'add' || p.op === 'mult' || p.op === 'sense') return PCT_FIELDS.has(p.field) ? pct(v) : String(v);
  if (p.op === 'trigger') return (p.amountKey === 'amount' || p.amountKey === 'frac') && p.effect.kind !== 'restoreResource' ? pct(v) : String(v);
  return String(v);
}
const ADD_TEXT = {
  dmgMult: (f) => `+${f} damage`,
  armorBonus: (f) => `+${f} armour`,
  moveSpeedPct: (f) => `+${f} movement speed`,
  thornsPassive: (f) => `${f} of the damage of each blow that lands on you is dealt back to the attacker`,
  cooldownReduction: (f) => `ability cooldowns reduced by ${f}`,
  leverDodge: (f) => `+${f} dodge chance`,
  lifeOnKill: (f) => `each kill restores ${f} health`,
  maxHpBonus: (f) => `+${f} maximum health`,
  lifeRegenFlat: (f) => `you regain ${f} health a second`,
  critChance: (f) => `+${f} critical hit chance`,
};
const SENSE_TEXT = {
  weakspotCrit: (f, p) => `you see where things are weak: +${f} critical chance on marked weak points${p.alsoFlag === 'healthbars' ? ', and every foe\'s remaining health shows over it' : ''}`,
  nightVision: (f) => `you see in the dark (night sight ${f})`,
  tremorSense: (f, p, v) => `you feel anything on the ground within ${tiles(v)} through walls and cover`,
};
const onWord = (p) => (p.on === 'kill' ? 'each kill' : p.on === 'crit' ? 'each critical hit' : 'each weapon strike that lands');
const TRIGGER_TEXT = {
  boltNearest: (f, p) => `${onWord(p)} sends a bolt of ${f} lightning damage into the nearest enemy (once every ${p.cooldown}s)`,
  restoreResource: (f, p) => `${onWord(p)} restores ${f} ${p.effect.resource} (once every ${p.cooldown}s)`,
  wardBurst: (f, p) => `when your health falls below ${pct(p.frac)}, a ward worth ${f} of your maximum health covers you for ${p.effect.duration}s (once every ${p.cooldown}s)`,
  critChance: (f, p) => `${onWord(p)} gives your next strike +${f} critical chance (once every ${p.cooldown}s)`,
  lifedrainBuff: (f, p) => `${onWord(p)} lets your blows drain ${f} of their damage as health for ${p.effect.duration}s (once every ${p.cooldown}s)`,
  regenBurst: (f, p) => `${onWord(p)} heals you ${f} health a second for ${p.effect.duration}s (once every ${p.cooldown}s)`,
  nextSpellDamage: (f, p) => `${onWord(p)} gives your next spell +${f} damage (once every ${p.cooldown}s)`,
  healingTakenBuff: (f, p) => `when your health falls below ${pct(p.frac)}, healing you receive rises by ${f} for ${p.effect.duration}s (once every ${p.cooldown}s)`,
  physicalDamageMult: (f, p) => `${onWord(p)} gives you +${f} physical damage for ${p.effect.duration}s (once every ${p.cooldown}s)`,
};
/** One power's sentence at a value. */
export function subsumePowerLine(p, v) {
  const f = subsumeFigure(p, v);
  switch (p.op) {
    case 'add': case 'mult': return (ADD_TEXT[p.field] || ((x) => `${p.field} +${x}`))(f);
    case 'resist': return `+${f} ${RES_LABEL[p.el] || p.el} resistance`;
    case 'minor': return `+${f} ${MINOR_LABEL[p.field] || p.field}`;
    case 'sense': return (SENSE_TEXT[p.field] || ((x) => `${p.field} ${x}`))(f, p, v);
    case 'dot': return `your weapon strikes set ${p.label}: ${f} damage every ${p.tickMs / 1000}s for ${p.ticks} ticks`;
    case 'trigger': return (TRIGGER_TEXT[p.effect.kind] || ((x) => `${p.effect.kind} ${x}`))(f, p);
    default: return '';
  }
}
/** ROUND 390 -- one power on the card: its first value, and the Gold value it reaches ("+8% stamina recovery, rising
 *  to +20% at Gold"). The "(once every Ns)" of a trigger stays at the end. */
function powerSummary(p) {
  const i0 = rsRankIdx(p.unlock);
  const v0 = p.values[i0] || p.values.find(x => x > 0);
  const vg = p.values[RS_RANKS.length - 1];
  let line = subsumePowerLine(p, v0);
  const m = line.match(/ \(once every [\d.]+s\)$/);
  const tail = m ? m[0] : '';
  if (m) line = line.slice(0, -tail.length);
  if (vg > v0) {
    const fig = p.op === 'sense' && p.field === 'tremorSense' ? tiles(vg) : subsumeFigure(p, vg);
    line += `, rising to ${line.startsWith('+') ? '+' : ''}${fig} at Gold`;
  }
  const from = i0 > 0 ? `from ${RS_RANK_LABEL[p.unlock]}, ` : '';
  return `${from}${line}${tail}${p.stoneMark ? ' (the stone\'s mark)' : ''}`;
}
function roleClause(role, stats) {
  const R = RITUAL_ROLES[role];
  const G = RS_RANKS.length - 1;
  let s = `${R.label}: ${stats.familiarDmg} dmg / ${R.interval}s, ${tiles(R.range)}, ${stats.maxHp} health, takes ${pct(R.share)} of your blows`;
  if (R.armorBonus) s += `; +${pct(R.armorBonus[0])} armour while out, +${pct(R.armorBonus[G])} at Gold`;
  if (R.lurkReveal) s += `; reveals hidden things near you while out (${pct(R.lurkReveal[0])}, ${pct(R.lurkReveal[G])} at Gold)`;
  return s;
}

/** The card's description of a ritual summon (states the mechanic; never compares). ROUND 390 -- kept short: one
 *  sentence for the rite, one for its life, the forms rank by rank, the subsumed powers as one list. */
export function ritualSummonDesc(spec) {
  const rt = spec && spec.ritual;
  if (!rt) return `Summoned by a ritual. ${(spec && spec.desc) || ''}`.trim();
  const d = rt.rite.drain || {};
  const draws = [d.mana ? `${pct(d.mana)} mana` : null, d.stamina ? `${pct(d.stamina)} stamina` : null,
    d.hp ? `${pct(d.hp)} health` : null].filter(Boolean).join(' and ');
  const base = spec.familiarDmg || 5;
  const out = [];
  out.push(`Summons ${rt.label} by ritual: a ${rt.rite.castS}s rite, begun from this card, in a ritual room (the Society ritual hall) `
    + `or anywhere with an awakened ritual ability such as Enact Ritual; it needs ${pct(rt.rite.costFrac)} mana to begin, draws ${draws}, `
    + `and breaks if you move or are hurt.`);
  out.push(`It stays, across saves, until it falls or you dismiss it; a fallen being can be summoned again after `
    + `${Math.round(rt.rite.reformS / 60)} minutes, a dismissed one at once.`);
  const formBits = [];
  for (const rk of RS_RANKS) {
    const bits = [];
    for (const f of rt.forms) {
      const isNew = f.unlock === rk, grows = f.greaterAt === rk;
      if (isNew) {
        const st = ritualFormStats({ ...f, greater: grows }, rk, base, 1);
        bits.push(`${f === rt.forms[0] ? '' : 'adds '}${grows ? f.greaterName : f.name} (${roleClause(f.role, st)})`);
      } else if (grows) {
        const gs = ritualFormStats({ ...f, greater: true }, rk, base, 1);
        bits.push(`${f.name} becomes ${f.greaterName} (${gs.familiarDmg} dmg, ${gs.maxHp} health)`);
      }
    }
    if (bits.length) formBits.push(`${RS_RANK_LABEL[rk]}: ${bits.join('; ')}.`);
  }
  out.push(`Forms (switch on this card; damage and health shown at Iron scale, rising with rank). ${formBits.join(' ')}`);
  out.push(`Subsumed (a button on this card), it leaves the world and heals, and you gain: ${rt.powers.slice().sort((x, y) => rsRankIdx(x.unlock) - rsRankIdx(y.unlock)).map(powerSummary).join('; ')}. `
    + `Released, it returns in its last form.`);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

/** ROUND 390 -- the stats line for a ritual summon: its base form's blow, as the card's first form states it. */
export function ritualSummonStatsLine(spec) {
  const rt = spec && spec.ritual;
  if (!rt || !rt.forms.length) return '';
  const f = rt.forms[0];
  const st = ritualFormStats({ ...f, greater: false }, 'iron', spec.familiarDmg || 5, 1);
  return `ritual ${RITUAL_ROLES[f.role].label} (${f.name}) strikes for ${st.familiarDmg} dmg every ${st.familiarInterval}s within ${tiles(st.familiarRange)}`
    + ` · takes ${pct(st.share)} of each blow · ${rt.forms.length} forms`;
}

/** Structural faults, for the suite. */
export function ritualSummonFaults() {
  const out = [];
  for (const [k, K] of Object.entries(RITUAL_KINDS)) {
    for (const role of ROLE_KEYS) {
      const f = K.forms[role];
      if (!f) { out.push(`${k}: no ${role}`); continue; }
      if (!MONSTER_ART[f.family]) out.push(`${k}.${role}: no art ${f.family}`);
      if (f.greaterFamily && !MONSTER_ART[f.greaterFamily]) out.push(`${k}.${role}: no art ${f.greaterFamily}`);
      if (!f.greater) out.push(`${k}.${role}: no greater name`);
    }
    if (K.powers.length < 3) out.push(`${k}: fewer powers`);
    for (const p of K.powers) {
      if (p.values.length !== RS_RANKS.length) out.push(`${k}.${p.id}: values`);
      for (let i = 1; i < RS_RANKS.length; i++) if (p.values[i] < p.values[i - 1]) out.push(`${k}.${p.id}: shrinks at ${RS_RANKS[i]}`);
    }
  }
  return out;
}
