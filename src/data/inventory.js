// Restored equipment/inventory/currency system, round 4. The user's own
// words: "the original inventory screen allowing the player to attach
// essences and awakening stones, showed the attributes 'Power, Spirit,
// Speed, and Recovery' had an actual inventory and equipment slots, this
// also tracked your the players currency in the various coins need to be
// restored... essence stones added back in, awakening stones, monster
// drops, coins, and the inventory screen from before."
//
// Ported CONCEPTS from sparkstone_prototype.html (the canonical 22MB
// original, NOT the differently-named/older sparkstone_prototype_5.html
// upload): COIN_RANKS/COIN_CONVERSION (line ~1686), ATTR_NAMES (line
// ~2838), the RESOURCE_BASE idea that Power/Spirit/Speed feed max HP/Mana/
// Stamina (line ~2849), bindEssenceAttribute/unbindEssenceAttribute (an
// essence equipped into a slot randomly binds that slot to one of the 4
// attributes, granting a flat bonus for as long as it's equipped).
//
// DELIBERATE SCOPE CUTS from the original (documented per this project's
// own practice of flagging rather than silently faking a descoped feature):
//   - Only 3 essence slots (ESSENCE_SLOT_COUNT), not the original's 4
//     (3 real + a "confluence" 4th slot that auto-combines all 3 into a
//     procedurally generated ability). The confluence mechanic needs the
//     original's full computeAbility/generateVastAbility machinery, which
//     this port never built (see abilities.js's own header note: only 4 of
//     ~18 templates exist here). With 3 slots and 4 attributes, one
//     attribute is always left unbound at any given time -- an accepted
//     simplification, not a bug.
//   - Awakening stones do NOT share the essence id-space or generate new
//     procedural abilities the way they do in the original (there, a stone
//     is just another essence/elemental id socketed alongside the main one,
//     and the PAIR determines the generated ability). This port's 5-essence
//     roster doesn't map onto that system at all, so STONE_DEFS below is a
//     separate, independent catalog: flat, fixed bonuses to whichever
//     slot's bound attribute the stone is socketed into, nothing procedural.
//   - No gear/armor paperdoll (helmet/chest/legs/boots/gauntlets/
//     accessories) -- the user's own ask named "essences and awakening
//     stones" specifically as what needed restoring, not armor slots.
//     player.gearCritChance/gearCritDamage (the existing GEAR_ROLL_CHANCE
//     stand-in from an earlier round) are left as they were.

export const ATTR_NAMES = ['power', 'spirit', 'speed', 'recovery'];
export const ATTR_LABEL = { power: 'Power', spirit: 'Spirit', speed: 'Speed', recovery: 'Recovery' };

export const ESSENCE_SLOT_COUNT = 3;
// RESTORED round 5: 4 awakening-stone sockets per essence slot -- the
// original prototype's own capacity ("Up to 4 awakening stones per essence
// slot"), which round 4 had temporarily descoped to 2. The confluence slot
// (index 3) carries 4 sockets of its own, same as the manual slots. See
// src/data/awakening.js for the ability generation each socket feeds.
export const STONE_SLOT_CAP = 4; // per essence slot (and per the confluence slot)

// ROUND 6 attribute economy -- corrected per the user's spec: "at the
// start all attributes are 0. Once each essence is bonded all attributes
// should be 1. When the character ranks up from Iron to Bronze, or Bronze
// to Silver and so on the attributes should each go up by 1." So an
// attribute's value is now:
//     (1 if an essence slot is bonded to it, else 0)
//   + 1 per rank-up past Iron (Bronze +1, Silver +2, Gold +3, Diamond +4)
//   + any ability-granted points ("Strength of Atlas"-style attr-boost
//     passives -- see awakening.js's attr_boost category)
// The round-4/5 flat bonuses (6 per essence, 3 per stone) are GONE --
// stones no longer feed attributes at all; their whole contribution is the
// ability each socket generates.
import { RANK_ORDER } from './ranks.js';
import { progressFromTenths } from './healthScale.js';   // ROUND 324
import { TRIUNE_DEF } from './canonItems323.js';   // ROUND 323
// ROUND 125 -- Prism's five cooked dishes. See CONSUMABLE_DEFS below for why
// they join the ordinary consumable table rather than getting one of their own.
import { PRISM_FOOD } from './prismChain.js';
import { POTION_DEFS, rollPotion } from './potions.js';   // ROUND 281
import { OTHERWORLD_FOOD, FRUIT_DRINKS, FISH_FOODS } from './marketGoods.js';   // ROUND 307 (371: the juice stall; 373: the fish market)
export function rankStepsPastIron(rank) {
  return Math.max(0, RANK_ORDER.indexOf(rank) - RANK_ORDER.indexOf('iron'));
}

// ROUND 58 -- FOUR RESOURCE FORMULAS LIVED HERE AND NONE OF THEM RAN.
//
// `computeMaxHp`, `computeMaxMana`, `computeMaxStamina` and `computeRegenMult`
// were exported from this file and imported by nothing. Round 10's minor-stat
// system took the whole job -- stats.js `computeMinorStats` is the only path
// that has produced a player's maxima since -- and these were left behind.
//
// Three of them were merely redundant. `computeRegenMult` was worse than that:
// it returned `1 + recovery * 0.25`, a MULTIPLIER on some base rate, where the
// live code adds a flat rate to a base of zero for health and 1.5%/s for the
// other two pools. Anyone reading this file to understand Recovery -- which is
// reasonable, since this is where attributes are defined -- would come away
// with the wrong model of the attribute entirely.
//
// Deleted rather than corrected: a second implementation that agrees today is
// the one that disagrees after the next retune. This round's 4x rescale is
// exactly the sort of change that would have broken them again silently.
//
// The attribute -> stat map lives in stats.js `ATTR_SCALE`, and the totals that
// feed it come from `computeAttrTotal` below.

// Total attribute value for `attr` under the ROUND 6 economy (see the
// header note above): bond point + rank steps + ability-granted points.
// The rank bonus applies to every attribute unconditionally ("the
// attributes should EACH go up by 1"), the bond point only while an
// essence slot (or the formed confluence, slot 3) is actually bonded to
// this attribute, and ability points come from passiveMods.attrBonus --
// aggregated by WorldScene._recomputeDerivedStats BEFORE this is called.
// ===========================================================================
// ROUND 77 (item 6.2.1) -- THE ATTRIBUTE CAP.
//
// The user: "Previously noted was an attribute cap, which if the build doesn't
// role any of the above should cap at gold ranks 4, but with the right
// abilities (or divine items) could go as high as 6."
//
// THE FLOOR WAS ALREADY RIGHT AND NOTHING ENFORCED IT. `computeAttrTotal` is
// `(bound ? 1 : 0) + rankStepsPastIron(rank) + abilityBonus`, so a bound
// attribute at Gold is 1 + 3 = 4 before any ability touches it -- exactly the
// number the user names. What was missing is that `abilityBonus` had no
// ceiling at all: `attr_boost` granted `1 + rankStepsPastIron(rank)`, four more
// at Gold, so one such ability took a bound attribute to 8 and two took it to
// 12. Against a system where round 58 moved saturation to ~4.1 points and the
// user's own note says "a character will get so few attribute points they
// should be more impactful", 12 is not a big number, it is a broken one.
//
// So there are two caps and they are different things:
//
//   ATTR_SOFT_CAP (4)   where a build with no attribute abilities stops. It
//                       is not enforced as a clamp -- it is simply what the
//                       rank ladder adds up to, and it is written down here so
//                       the number has a name and a suite can assert it.
//   ATTR_HARD_CAP (6)   the ceiling nothing passes. Two more than the floor,
//                       which is the user's "as high as 6".
//
// Each attribute ability bound to an attribute raises THAT attribute's ceiling
// by one, and each divine item that names it raises it by one, to the hard
// cap. So the ability is not "+1 attribute" bolted onto a fixed ladder -- it
// is permission to go one point further than a build without it can, which is
// what makes taking two of them, or one plus a divine relic, a real choice.
// ===========================================================================
export const ATTR_SOFT_CAP = 4;
export const ATTR_HARD_CAP = 6;

/**
 * The ceiling on one attribute for this player: 4, plus what they have earned
 * the right to, never more than 6.
 *
 * `attrCapBonus` is written by WorldScene's passive pass (one per attribute
 * ability bound to that attribute) and by the divine-item pass. Read through
 * `passiveMods` like every other ability contribution, so a suite can set it
 * directly and a save carries nothing extra.
 */
export function attrCapFor(player, attr) {
  const mods = player && player.passiveMods;
  const raised = (mods && mods.attrCapBonus && mods.attrCapBonus[attr]) || 0;
  return Math.min(ATTR_HARD_CAP, ATTR_SOFT_CAP + raised);
}

// ROUND 324 -- IN-RANK PROGRESS, the figure the health bands are read with
// (healthScale.js). The tenths of a bound attribute (the linked slot's level, 0..9) are
// the progress inside the rank; they are NOT capped by `attrCapFor`, because at Gold the
// cap of 4 is reached by the rank steps alone and clamping the tenths away would pin every
// Gold character to the floor of the band. Ability-granted points count only up to the
// room the cap leaves them, so an attribute ability still has to earn its ceiling.
// 0 = bottom of the band, 1 = a full tenths bar, more only through abilities.
export function attrRankProgress(player, attr) {
  const { bound, tenths, abilityBonus } = attrParts(player, attr);
  const steps = rankStepsPastIron(player.rank);
  const room = Math.max(0, attrCapFor(player, attr) - steps - (bound ? 1 : 0));
  const counted = Math.min(abilityBonus, room);
  return progressFromTenths(bound ? tenths : Math.max(0, counted - 1), bound ? counted : 0);
}

function attrParts(player, attr) {
  let bound = false;
  // ROUND 190 (8.7) -- "The linked attribute also progresses with abilities.
  // I.e. if the might abilities average Iron 3 then the linked attribute is
  // 1.3 not 1.0." The linked slot's level (the mean of its abilities, see
  // abilityLevels.syncSlotsFromAbilities) adds its tenths; the best linked
  // slot counts when two share an attribute.
  let tenths = 0;
  const lvl = (i) => {
    const pr = player.slotProgress && player.slotProgress[i];
    // ROUND 320 -- "Until all of an essence's abilities have been unlocked the tied attribute
    // can't advance ... because I have 4 open slots the lowest is actually Iron 0." The linked
    // attribute follows the LOWEST ability of the essence, and a socket with nothing in it is
    // the lowest there is. The one ability that was awakened reading Iron 2 gave Recovery 1.2
    // while three of its four stone sockets stood empty.
    const ess = i === 3 ? (player.confluence || player.slotEssence.every(Boolean)) : player.slotEssence[i];
    if (!ess || (player.slotStones[i] || []).length < STONE_SLOT_CAP) return 0;
    return pr ? Math.max(0, Math.min(9, pr.level || 0)) / 10 : 0;
  };
  for (let i = 0; i < ESSENCE_SLOT_COUNT; i++) {
    if (player.slotEssence[i] && player.slotAttr[i] === attr) { bound = true; tenths = Math.max(tenths, lvl(i)); }
  }
  if (player.confluence && player.slotAttr[3] === attr) { bound = true; tenths = Math.max(tenths, lvl(3)); }
  const abilityBonus = (player.passiveMods && player.passiveMods.attrBonus && player.passiveMods.attrBonus[attr]) || 0;
  return { bound, tenths, abilityBonus };
}

export function computeAttrTotal(player, attr) {
  const { bound, tenths, abilityBonus } = attrParts(player, attr);
  const raw = (bound ? 1 + tenths : 0) + rankStepsPastIron(player.rank) + abilityBonus;
  // ROUND 77 -- and the ceiling. Clamped HERE rather than at each contributor
  // because the cap is a claim about the total, and three separate places
  // each clamping their own share would let the sum exceed all of them.
  return Math.min(raw, attrCapFor(player, attr));
}

// Picks a random attribute for a newly-equipped essence to bind its slot
// to -- weighted toward attributes NOT already bound by another occupied
// slot, so equipping essences into all 3 slots tends to cover 3 distinct
// attributes rather than stacking the same one 3 times (falls back to a
// fully random pick once every attribute is already covered, or if that's
// simply how the dice land).
// RESTORED round 5: with the confluence as a 4th binding slot, a full kit
// covers all 4 attributes -- the confluence's own binding (see WorldScene's
// _maybeFormConfluence) uses this same roll, which by the
// prefer-unused weighting lands on whichever attribute the 3 manual slots
// left unbound.
export function rollSlotAttribute(player, rng = Math.random) {
  const used = player.slotAttr.filter(a => a !== null);
  let choices = ATTR_NAMES.filter(a => !used.includes(a));
  if (!choices.length) choices = ATTR_NAMES;
  return choices[Math.floor(rng() * choices.length)];
}

// --- Ranked coin purse -- ported near-verbatim from the original's
// COIN_RANKS/COIN_CONVERSION/normalizeCoins/grantCoins. ---
// ROUND 11 -- lore-accurate spirit-coin ladder, confirmed and labeled:
// normal rank coins -> iron -> bronze -> silver -> gold -> diamond, each
// worth 100x the previous tier (COIN_CONVERSION below drives every
// normalize/grant/spend cascade). COIN_COLORS is the original prototype's
// own palette (line ~1688), verbatim -- these drive the per-rank coin
// ICONS the inventory now tracks currency under (itemArt.js coinIconUrl).
export const COIN_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
export const COIN_CONVERSION = 100;
export const COIN_LABELS = {
  normal: 'Normal Rank Coin', iron: 'Iron Rank Coin', bronze: 'Bronze Rank Coin',
  silver: 'Silver Rank Coin', gold: 'Gold Rank Coin', diamond: 'Diamond Rank Coin',
};
export const COIN_COLORS = { normal: '#e53935', iron: '#9e9e9e', bronze: '#cd7f32', silver: '#cfd8dc', gold: '#ffd54f', diamond: '#4fd8f0' };
const COIN_ABBR = { normal: 'c', iron: 'i', bronze: 'b', silver: 's', gold: 'g', diamond: 'd' };

export function emptyCoinPurse() {
  return Object.fromEntries(COIN_RANKS.map(r => [r, 0]));
}
export function normalizeCoins(purse) {
  for (let i = 0; i < COIN_RANKS.length - 1; i++) {
    const r = COIN_RANKS[i], next = COIN_RANKS[i + 1];
    if (purse[r] >= COIN_CONVERSION) {
      const carry = Math.floor(purse[r] / COIN_CONVERSION);
      purse[r] -= carry * COIN_CONVERSION;
      purse[next] += carry;
    }
  }
  return purse;
}
export function grantCoins(purse, rank, amount) {
  purse[rank] = (purse[rank] || 0) + amount;
  normalizeCoins(purse);
  return purse;
}
// Total purse value, expressed in 'normal' coin units (100 of one rank =
// 1 of the next, cascaded all the way up) -- used for shop price checks/
// comparisons so every other system can keep treating "coins" as one number.
export function coinPurseValue(purse) {
  let total = 0, mult = 1;
  for (const r of COIN_RANKS) { total += purse[r] * mult; mult *= COIN_CONVERSION; }
  return total;
}
// Deducts `amount` (in normal-coin-equivalent units) from a purse, breaking
// higher denominations down as needed ("making change") -- returns false
// (purse untouched) if the purse doesn't hold enough total value.
export function spendCoins(purse, amount) {
  const total = coinPurseValue(purse);
  if (total < amount) return false;
  let remaining = total - amount;
  for (const r of COIN_RANKS) purse[r] = 0;
  let mult = Math.pow(COIN_CONVERSION, COIN_RANKS.length - 1);
  for (let i = COIN_RANKS.length - 1; i >= 0; i--) {
    const r = COIN_RANKS[i];
    purse[r] = Math.floor(remaining / mult);
    remaining -= purse[r] * mult;
    mult /= COIN_CONVERSION;
  }
  return true;
}
// Compact HUD/shop display -- highest-denomination-first, omitting zero
// ranks (e.g. "3g 42s 6c"), falling back to "0c" for an empty purse.
export function formatCoinPurse(purse) {
  const parts = [];
  for (let i = COIN_RANKS.length - 1; i >= 0; i--) {
    const r = COIN_RANKS[i];
    if (purse[r] > 0) parts.push(`${purse[r]}${COIN_ABBR[r]}`);
  }
  return parts.length ? parts.join(' ') : '0c';
}

// --- Awakening stones -- ROUND 9: the round-6 12-stone starter set grew
// into the FULL 180-stone catalog from the user's HWFWM_TTRPG.xlsx
// "Awakening Stones" sheet, now living in src/data/stoneCatalog.js (names
// + rarities verbatim, an authored description each, plus the family/
// color/phrase data that drives per-stone ability-generation bias in
// awakening.js). Re-exported here so every existing STONE_DEFS/STONE_IDS
// consumer keeps working unchanged. rollStoneDrop is the rarity-weighted
// loot roll (_killMonster uses it instead of a uniform pick).
export { STONE_DEFS, STONE_IDS, STONE_CATALOG, STONE_RARITY_WEIGHTS, rollStoneDrop } from './stoneCatalog.js';

// --- Consumables -- simple instant-use items, dropped by CONSUMABLE_ROLL_CHANCE. ---
//
// ROUND 125 -- AND PRISM'S COOKING, folded in here rather than kept beside it.
//
// Her five rungs are consumables in every sense that matters -- they stack in
// the same bag, sell through the same valuer, bind to the same D-pad slots and
// are eaten through the same `_useConsumable` -- so the only thing that would
// come of a separate FOOD_DEFS is five call sites that have to remember it
// exists. The rungs themselves live in prismChain.js with the rest of her
// chain, because what a dish DOES is a property of how far through her
// curriculum she is; this is only where they join the pile.
//
// The two that are NOT loot are marked: `prismRung` is on every dish, and
// `loot.js` refuses to drop anything carrying it. A Bewildering Stew found in
// a wolf is a joke at the expense of the only joke this ladder has.
// ROUND 281 -- the potion line (potions.js): eight kinds in seven sizes. The
// two draughts that stood here are its small red and small blue, under the
// ids they always had.
export const CONSUMABLE_DEFS = {
  ...POTION_DEFS,
  staminaRation: { id: 'staminaRation', name: 'Trail Ration', desc: 'Restores 25 stamina.', stamina: 25, food: true },
  ...PRISM_FOOD,
  ...OTHERWORLD_FOOD,   // ROUND 307 -- sold at the market, never dropped
  ...FRUIT_DRINKS,   // ROUND 371 -- Cadence's juice stall, likewise
  ...FISH_FOODS,   // ROUND 373 -- Cadence's fish market, likewise
  [TRIUNE_DEF.id]: TRIUNE_DEF,   // ROUND 323 -- the Soul-Imprinting Triune: his card, a rare late drop
};
export const CONSUMABLE_IDS = Object.keys(CONSUMABLE_DEFS);
/** What may be found in the world. Everything except a dish somebody cooked:
 *  a consumable and a piece of loot are two different lists and always were --
 *  this is the first time the difference has had a member.
 *
 *  `!= null` AND NOT A TRUTHINESS TEST. Rung 0 -- the joke rung, the one whose
 *  whole job is to do nothing -- carries `prismRung: 0`, so `!def.prismRung`
 *  would have let exactly the dish this list exists to keep out of the world
 *  fall out of a wolf. */
export const CONSUMABLE_LOOT_IDS = CONSUMABLE_IDS.filter(id => CONSUMABLE_DEFS[id].prismRung == null && !CONSUMABLE_DEFS[id].shopOnly && !CONSUMABLE_DEFS[id].relic);   // ROUND 323 -- a relic is found, not rolled

/** ROUND 281 -- one consumable for a drop, at the rank of what dropped it.
 *  Mostly a potion sized to that rank (potions.js); now and then a ration.
 *  Drawing uniformly from CONSUMABLE_LOOT_IDS, as the three drop sites did,
 *  would hand a normal-rank rat a Legendary one time in fifty-seven. */
export function rollConsumableDrop(rng = Math.random, rank = 'normal') {
  if (rng() < 0.15) return 'staminaRation';
  return rollPotion(rng, rank);
}

// --- Monster-part crafting materials -- one per monster FAMILY, updated
// to reference round-3's renamed families (Panterimp, Duskfang, etc. --
// the nice continuity opportunity flagged earlier this round: a part now
// actually matches the creature it's named after in the bestiary). No
// crafting system consumes these yet (out of scope this round) -- they're
// real bag items with real names/descriptions, same "real item, no consumer
// system built for it yet" spirit as the original's own part drops before
// crafting existed.
export const PART_DEFS = {
  slime: { id: 'ichorlingGel', name: 'Ichorling Gel', desc: 'A jar of cloudy, faintly luminous ooze.' },
  bat: { id: 'duskfangWing', name: 'Duskfang Wing', desc: 'A leathery wing membrane, still warm.' },
  wolf: { id: 'panterimpPelt', name: 'Panterimp Pelt', desc: 'Coarse, mottled fur -- good insulation, poor smell.' },
  hydra: { id: 'hydrixScale', name: 'Hydrix Scale', desc: 'An iridescent scale, faintly damp no matter how dry the air.' },
  raptor: { id: 'clawstriderTalon', name: 'Clawstrider Talon', desc: 'A curved talon, wickedly sharp.' },
  chimera: { id: 'triskelithFang', name: 'Triskelith Fang', desc: 'One of three mismatched fangs from the same jaw.' },
  hellhound: { id: 'cindermawEmber', name: 'Cindermaw Ember', desc: 'A coal that never quite cools.' },
  elemental: { id: 'elementumCore', name: 'Elementum Core', desc: 'A crystallized fragment of raw elemental essence.' },
  dragon: { id: 'wyrmscale', name: 'Wyrmscale', desc: 'A single scale, heavier than it looks.' },
  trex: { id: 'direjawTooth', name: 'Direjaw Tooth', desc: 'A serrated tooth the length of a hand.' },
  boar: { id: 'gemtuskIvory', name: 'Gemtusk Ivory', desc: 'A gleaming tusk fragment, faintly gem-flecked.' },
  skeleton: { id: 'boneguardShard', name: 'Boneguard Shard', desc: 'A fragment of ancient, unnaturally hard bone.' },
  spinosaurus: { id: 'hexfinSpine', name: 'Hexfin Spine', desc: 'A ridged dorsal spine, still faintly slick.' },
  spider: { id: 'webstalkerSilk', name: 'Webstalker Silk', desc: 'A skein of silk, stronger than steel wire.' },
  lizard: { id: 'quillrunnerQuill', name: 'Quillrunner Quill', desc: 'A barbed quill, surprisingly light.' },
  slimeGolem: { id: 'slimeGolemCore', name: 'Slime Golem Core', desc: 'A dense mineral core, once the golem\'s animating heart.' },
  saberCanis: { id: 'saberCanisFang', name: 'Saber Canis Fang', desc: 'A single curved fang, longer than a hand.' },
  // ROUND 64 -- shade and demon were the two families of eighteen with nothing
  // to drop, which was invisible while parts were only loot: they simply never
  // appeared. It stopped being invisible the moment quest boards started
  // posting "bring me N of a thing", because a gather notice naming either
  // family could not be generated at all -- and a board that silently declines
  // to post is exactly the kind of nothing this project keeps finding.
  shade: { id: 'shadeRemnant', name: 'Shade Remnant', desc: 'A cold smear of something that will not settle in the jar.' },
  demon: { id: 'demonSigil', name: 'Demon Sigil', desc: 'A brand cut into hide, still legible and still warm.' },
  // ROUND 191 -- THE SAME FAULT, TWENTY-ONE FAMILIES LATER. Every family added
  // since round 64 arrived without a part, so a gather notice that drew one of
  // them could not be written -- and Prism's Nek kitchen, which asks only for
  // ingredients, could not be offered at all ("Nothing to work with here").
  scorpion: { id: 'scorpionStinger', name: 'Scorpion Stinger', desc: 'The last joint of the tail, venom sac and all.' },
  direbuck: { id: 'direbuckAntler', name: 'Direbuck Antler', desc: 'A heavy tine, the velvet worn off in fights.' },
  hornram: { id: 'hornramHorn', name: 'Hornram Horn', desc: 'A curled horn, ridged like a cut shell.' },
  giantToad: { id: 'giantToadGland', name: 'Giant Toad Gland', desc: 'A milky gland that numbs the fingers that hold it.' },
  cobra: { id: 'cobraFang', name: 'Cobra Fang', desc: 'A hollow fang, still beaded with venom.' },
  mantis: { id: 'mantisBlade', name: 'Mantis Blade', desc: 'A serrated foreleg, sharper than it looks.' },
  crocodile: { id: 'crocodileHide', name: 'Crocodile Hide', desc: 'A plate of armoured back-hide.' },
  whitelion: { id: 'whitelionMane', name: 'White Lion Mane', desc: 'A hank of pale mane, coarse as rope.' },
  medusa: { id: 'medusaScale', name: 'Medusa Scale', desc: 'A grey-green scale with a faint stony sheen.' },
  yeti: { id: 'yetiPelt', name: 'Yeti Pelt', desc: 'A thick white pelt that never quite warms up.' },
  minotaur: { id: 'minotaurHorn', name: 'Minotaur Horn', desc: 'A blunt horn, scarred from a hundred charges.' },
  phoenix: { id: 'phoenixFeather', name: 'Phoenix Feather', desc: 'A feather that stays warm long after it falls.' },
  thunderbird: { id: 'thunderbirdQuill', name: 'Thunderbird Quill', desc: 'A long quill that crackles when stroked.' },
  quillFiend: { id: 'quillFiendSpine', name: 'Quill Fiend Spine', desc: 'A barbed spine, easier to pull in than out.' },
  gnoll: { id: 'gnollTooth', name: 'Gnoll Tooth', desc: 'A yellowed canine on a knotted cord.' },
  spiritSerpent: { id: 'spiritSerpentScale', name: 'Spirit Serpent Scale', desc: 'A translucent scale that glows faintly in the dark.' },
  steelRaptor: { id: 'steelRaptorPlate', name: 'Steel Raptor Plate', desc: 'A metal-hard scute from a raptor that should not exist.' },
  shellborn: { id: 'shellbornCarapace', name: 'Shellborn Carapace', desc: 'A curved piece of shell, heavier than stone.' },
  harbinger: { id: 'harbingerEye', name: 'Harbinger Eye', desc: 'A clouded eye that seems to follow you.' },
  sixArmApe: { id: 'sixArmApeKnuckle', name: 'Six-Arm Ape Knuckle', desc: 'A knuckle-bone the size of a fist.' },
  tidalTroll: { id: 'tidalTrollHide', name: 'Tidal Troll Hide', desc: 'Grey hide that stays wet however long it dries.' },
  // ROUND 200 -- one per new family, because `partForFamily` is total by
  // design: a family with no part is a family whose corpse has nothing on it
  // and whose gather contracts cannot be written (see test_round191, which
  // asserts both). Named for what the creature is made of rather than for the
  // creature, which is the rule the forty above already follow.
  glasscat: { id: 'shardfangSliver', name: 'Shardfang Sliver', desc: 'A blade of body-glass. Still faintly warm, and it will not stop cutting.' },
  sharkcrab: { id: 'reefjawClaw', name: 'Reefjaw Claw', desc: 'A claw with a shark\'s tooth set in the tip, which is not how either animal is built.' },
  flowerhydra: { id: 'blossomirePollen', name: 'Blossomire Pollen', desc: 'A twist of paper holding pollen from five separate heads. Do not open it indoors.' },
  // ROUND 285 -- the carnivorous plants.
  bloomimp: { id: 'bloomkinPetal', name: 'Bloomkin Petal', desc: 'A petal the size of a hand, still warm. Monster part; traders and crafters buy it.' },
  snapmaw: { id: 'twinmawTooth', name: 'Twinmaw Tooth', desc: 'A green thorn shaped like a tooth, from one of two mouths. Monster part; traders and crafters buy it.' },
  vinegrasp: { id: 'thornlashHook', name: 'Thornlash Hook', desc: 'A hooked barb cut from a grasping vine. Monster part; traders and crafters buy it.' },
  birdangel: { id: 'halowingFeather', name: 'Halowing Feather', desc: 'A pinion that keeps its own light for some hours after the bird has stopped.' },
  demonsloth: { id: 'dreadlothFur', name: 'Dreadloth Fur', desc: 'White fur in a hand-thick mat. Nothing has ever got through it quickly.' },
  // ROUND 328 -- one per new family, because `partForFamily` is total by design (see
  // round 200's note above). Named for what the creature is made of. The icons have not
  // been drawn yet: itemIconMixin returns null for an id with no manifest row, and the
  // plain part card is used until they are.
  gnawling: { id: 'gnawlingTail', name: 'Gnawling Tail', desc: 'A thin pink tail, still twitching. Monster part; traders and crafters buy it.' },
  grubwyrm: { id: 'grubwyrmSilk', name: 'Grubwyrm Silk', desc: 'A hank of sticky banded silk, bright as a warning. Monster part; traders and crafters buy it.' },
  duskmoth: { id: 'duskmothDust', name: 'Duskmoth Dust', desc: 'A pinch of glowing wing-dust in a twist of paper. Do not rub your eyes.' },
  gourdkin: { id: 'gourdkinRind', name: 'Gourdkin Rind', desc: 'A curve of carved orange rind, warm on the inside. Monster part; traders and crafters buy it.' },
  inkwell: { id: 'inkwellQuill', name: 'Inkwell Quill', desc: 'A spine from the ring around an ink pool, still wet at the tip. Monster part; traders and crafters buy it.' },
  cinderlamb: { id: 'cinderlambFleece', name: 'Cinderlamb Fleece', desc: 'A tuft of wool that smoulders when it is breathed on and never burns away.' },
  longshanks: { id: 'longshanksLeg', name: 'Longshanks Leg', desc: 'A long striped leg, jointed in too many places. Monster part; traders and crafters buy it.' },
  bellhive: { id: 'bellhiveCombs', name: 'Bellhive Combs', desc: 'A curl of papery comb, humming faintly. Monster part; traders and crafters buy it.' },
  clockcrawler: { id: 'clockcrawlerGear', name: 'Clockcrawler Gear', desc: 'A small brass gear, still warm, still wanting to turn.' },
  sporemother: { id: 'sporemotherGills', name: 'Sporemother Gills', desc: 'A fold of glowing purple gills. Handle with a cloth over the face.' },
  pitcherling: { id: 'pitcherlingLid', name: 'Pitcherling Lid', desc: 'A hinged green lid, faintly acid-etched. Monster part; traders and crafters buy it.' },
  bonepecker: { id: 'bonepeckerSkull', name: 'Bonepecker Skull', desc: 'A small bare bird skull with a green sheen on the bone. Monster part; traders and crafters buy it.' },
  driftreaver: { id: 'driftreaverTendril', name: 'Driftreaver Tendril', desc: 'A translucent tendril that crackles when it is touched. Keep it wet.' },
  urchinroll: { id: 'urchinrollSpine', name: 'Urchinroll Spine', desc: 'A long purple spine with an orange tip that still glows a little.' },
  gravesown: { id: 'gravesownBloom', name: 'Gravesown Bloom', desc: 'A magenta flower with a stem that goes down into something. Monster part; traders and crafters buy it.' },
  tunnelmaw: { id: 'tunnelmawClaw', name: 'Tunnelmaw Claw', desc: 'A broad shovel-shaped claw, packed with dark earth.' },
  stringless: { id: 'stringlessLimb', name: 'Stringless Limb', desc: 'A jointed wooden arm, red and gold, with a cord rising from it into nothing.' },
  rimehare: { id: 'rimehareAntler', name: 'Rimehare Antler', desc: 'A crown-point of ice that never melts in the hand. Monster part; traders and crafters buy it.' },
  shiverfox: { id: 'shiverfoxTail', name: 'Shiverfox Tail', desc: 'A fan of icicle-tipped fur that shifts colour in the light.' },
  tuskmaw: { id: 'tuskmawTusk', name: 'Tuskmaw Tusk', desc: 'A thick curved tusk, cold to the touch. Monster part; traders and crafters buy it.' },
  lurefin: { id: 'lurefinLure', name: 'Lurefin Lure', desc: 'A glowing cyan bulb on a thin stalk. It is still trying to get your attention.' },
  drownwight: { id: 'drownwightAnchor', name: 'Drownwight Anchor Link', desc: 'A rusted anchor-chain link, wet however long it dries.' },
  lanternwraith: { id: 'lanternwraithCage', name: 'Lanternwraith Cage', desc: 'A small iron birdcage with a turquoise flame in it that will not go out.' },
  rustmantle: { id: 'rustmantlePlume', name: 'Rustmantle Plume', desc: 'A dented helm-plume, orange with crab-shell dust. Monster part; traders and crafters buy it.' },
  smokecur: { id: 'smokecurCollar', name: 'Smokecur Collar', desc: 'A heavy bone collar studded with teeth. Faintly warm, faintly smoking.' },
  sporehorn: { id: 'sporehornCap', name: 'Sporehorn Antler Cap', desc: 'A glowing blue-and-orange mushroom cap from an antler tip.' },
  saltwife: { id: 'saltwifeCrystal', name: 'Saltwife Crystal', desc: 'A pink-white crystal that leaks brine when it is held.' },
  monocul: { id: 'monoculEye', name: 'Monocul Eye', desc: 'A huge blue eye, still wet. It is looking at something just behind you.' },
  mournhusk: { id: 'mournhuskWrapping', name: 'Mournhusk Wrapping', desc: 'A strip of pale cloth marked with orange runes. Monster part; traders and crafters buy it.' },
  kilnwarden: { id: 'kilnwardenTongs', name: 'Kilnwarden Tongs', desc: "A pair of smith's tongs, red-hot long after they should have cooled." },
  ossuaryKnight: { id: 'ossuaryKnightPlate', name: 'Ossuary Knight Plate', desc: 'A tarnished plate with a skull packed in the gap. Monster part; traders and crafters buy it.' },
  pallbearer: { id: 'pallbearerHandle', name: 'Pallbearer Handle', desc: 'A gilded coffin handle, purple-lacquered. Nobody has asked who it was for.' },
  geodeback: { id: 'geodebackGeode', name: 'Geodeback Geode', desc: 'A fist-sized split geode with violet crystals. Cut gems are worth more than the shell.' },
  hollowchoir: { id: 'hollowchoirMask', name: 'Hollowchoir Mask', desc: 'A small porcelain theatre mask. Which expression it wears depends on who is holding it.' },
  glasswader: { id: 'glasswaderBeak', name: 'Glasswader Beak', desc: 'A needle of black volcanic glass with a thread of orange in it.' },
  stormjar: { id: 'stormjarShard', name: 'Stormjar Shard', desc: 'A painted shard of cracked clay that gives a small shock.' },
  cairnbeast: { id: 'cairnbeastRune', name: 'Cairnbeast Rune Stone', desc: 'A flat blue rune stone, humming faintly. It was a heart.' },
  totemstalk: { id: 'totemstalkCarving', name: 'Totemstalk Carving', desc: 'A carved wolf, owl or bear head in red, teal and yellow. Monster part; traders and crafters buy it.' },
  scalecurl: { id: 'scalecurlScale', name: 'Scalecurl Scale', desc: 'A molten-gold scale as big as a palm, hard as anything.' },
  shardling: { id: 'shardlingShard', name: 'Shardling Shard', desc: 'A shard of living mirror that shows a slightly different room.' },
};
export function partForFamily(family) {
  return PART_DEFS[family] || null;
}

// ===== ROUND 368 -- A SECOND PART FOR EACH OF THE FORTY ROUND-328 FAMILIES.
//
// The user's icons (Desktop\new-assets\monster-parts, parts.json, status "new"): ids, names and descs exactly as
// written there. PART_DEFS stays one part per family -- `partForFamily` is the family's FIRST part and round 191's
// suite holds it total and unique -- so the second lives here, keyed the same way, and the doors that hand out or
// look up a part read both through the helpers below.
export const SECONDARY_PART_DEFS = {
  gnawling: { id: "gnawlingIncisor", name: "Gnawling Incisor", desc: "A long yellow rat incisor, chisel-sharp and chipped from gnawing cutlery. Monster part; traders and crafters buy it.", secondary: true },
  grubwyrm: { id: "grubwyrmToothRing", name: "Grubwyrm Tooth Ring", desc: "A ring of hooked teeth from a lamprey mouth, still on its gum. Monster part; traders and crafters buy it.", secondary: true },
  duskmoth: { id: "duskmothEyespot", name: "Duskmoth Eyespot", desc: "A torn piece of wing with an eye-spot that looks very much like a human eye.", secondary: true },
  gourdkin: { id: "gourdkinSeeds", name: "Gourdkin Seeds", desc: "A handful of pale seeds that glow orange at the core. Plant them somewhere you do not live.", secondary: true },
  inkwell: { id: "inkwellEye", name: "Inkwell Eye", desc: "A glowing gold eye in a bead of ink that does not run. Monster part; traders and crafters buy it.", secondary: true },
  cinderlamb: { id: "cinderlambMask", name: "Cinderlamb Mask Shard", desc: "A cracked piece of the white porcelain face, one empty eye-hole black with soot.", secondary: true },
  longshanks: { id: "longshanksEyes", name: "Longshanks Eye Cluster", desc: "A knot of small green eyes that still glow. They do not blink and it is better not to wait for them to.", secondary: true },
  bellhive: { id: "bellhiveStinger", name: "Bellhive Stinger", desc: "The clapper-stinger from a bell nest, long as a finger and still wet.", secondary: true },
  clockcrawler: { id: "clockcrawlerLens", name: "Clockcrawler Lens", desc: "A glowing red lens in a brass ring. It still tracks movement.", secondary: true },
  sporemother: { id: "sporemotherSporeSac", name: "Sporemother Spore Sac", desc: "A swollen sac of yellow spores. It puffs when squeezed, so don't.", secondary: true },
  pitcherling: { id: "pitcherlingLeaf", name: "Pitcherling Leaf", desc: "A broad leaf with a red-veined edge, slick with digestive dew. Monster part; traders and crafters buy it.", secondary: true },
  bonepecker: { id: "bonepeckerFeather", name: "Bonepecker Feather", desc: "An iridescent green and purple feather with a bone-white quill.", secondary: true },
  driftreaver: { id: "driftreaverBell", name: "Driftreaver Bell Jelly", desc: "A wobbling slab of glowing pink bell jelly with a skull-shaped mark inside it.", secondary: true },
  urchinroll: { id: "urchinrollEye", name: "Urchinroll Eye", desc: "One of the small eyes from the ring around an urchinroll. It is still watching the floor.", secondary: true },
  gravesown: { id: "gravesownSeeds", name: "Gravesown Seed Pod", desc: "A split seed pod full of magenta seeds, with grave soil still on it. Nobody plants these on purpose.", secondary: true },
  tunnelmaw: { id: "tunnelmawPelt", name: "Tunnelmaw Pelt", desc: "Velvety dark purple fur, soft as a mole's and twice as thick.", secondary: true },
  stringless: { id: "stringlessStrings", name: "Stringless Strings", desc: "A coil of glowing puppet string that keeps trying to pull tight. It isn't tied to anything.", secondary: true },
  rimehare: { id: "rimehareTeeth", name: "Rimehare Icicle Teeth", desc: "A row of icicle teeth from a mouth that opens the wrong way.", secondary: true },
  shiverfox: { id: "shiverfoxPetal", name: "Shiverfox Crystal Petal", desc: "A petal of ice from the crystal flower that grows where its face should be.", secondary: true },
  tuskmaw: { id: "tuskmawHide", name: "Tuskmaw Hide", desc: "Blue and violet spotted hide, thick and blubbery. Monster part; traders and crafters buy it.", secondary: true },
  lurefin: { id: "lurefinTeeth", name: "Lurefin Needle Teeth", desc: "A jaw-strip of needle teeth, long and glassy. Hold it by the gum.", secondary: true },
  drownwight: { id: "drownwightBarnacles", name: "Drownwight Barnacles", desc: "A cluster of barnacles from a drowned shoulder, still damp.", secondary: true },
  lanternwraith: { id: "lanternwraithShroud", name: "Lanternwraith Shroud", desc: "A tattered indigo rag, singed teal at the hem. It moves when the air doesn't.", secondary: true },
  rustmantle: { id: "rustmantleClaw", name: "Rustmantle Claw", desc: "A bright orange crab claw that grew in the gap of a knight's armour.", secondary: true },
  smokecur: { id: "smokecurEye", name: "Smokecur Eye", desc: "A glowing yellow eye with nothing behind it but a curl of purple smoke.", secondary: true },
  sporehorn: { id: "sporehornHide", name: "Sporehorn Hide", desc: "A patchy elk hide with blue fungus growing through the fur.", secondary: true },
  saltwife: { id: "saltwifeBrine", name: "Saltwife Brine", desc: "A stoppered vial of glowing aqua brine that never evaporates.", secondary: true },
  monocul: { id: "monoculBell", name: "Monocul Bell", desc: "A big brass shepherd's bell, dented. The flock it called is somewhere.", secondary: true },
  mournhusk: { id: "mournhuskScarab", name: "Mournhusk Scarab", desc: "A jewelled scarab amulet, gold and lapis, warm as if it were being worn.", secondary: true },
  kilnwarden: { id: "kilnwardenFirebrick", name: "Kilnwarden Firebrick", desc: "A brick from the kiln-body that glows orange through every crack.", secondary: true },
  ossuaryKnight: { id: "ossuaryKnightSkull", name: "Ossuary Skull", desc: "A yellowed skull from the armour's packing, with a cyan glow in the sockets.", secondary: true },
  pallbearer: { id: "pallbearerFingers", name: "Pallbearer Finger Bones", desc: "Long finger bones from one of four arms, still curled to grip a coffin.", secondary: true },
  geodeback: { id: "geodebackScute", name: "Geodeback Scute", desc: "A plate of stone shell with violet crystal pushing through the cracks. Monster part; traders and crafters buy it.", secondary: true },
  hollowchoir: { id: "hollowchoirCloth", name: "Hollowchoir Ghost-Cloth", desc: "A fold of shimmering violet and pink cloth that drifts upward when let go.", secondary: true },
  glasswader: { id: "glasswaderFeather", name: "Glasswader Glass Feather", desc: "A feather of black volcanic glass with a seam of orange heat running down it.", secondary: true },
  stormjar: { id: "stormjarHand", name: "Stormjar Clay Hand", desc: "A stubby clay hand with sparks leaking from the break.", secondary: true },
  cairnbeast: { id: "cairnbeastMoss", name: "Cairnbeast Moss", desc: "A clump of bright green moss with yellow wildflowers, peeled off a living boulder.", secondary: true },
  totemstalk: { id: "totemstalkTalon", name: "Totemstalk Talon", desc: "A clawed bird foot of carved, painted wood that still flexes.", secondary: true },
  scalecurl: { id: "scalecurlTailSpike", name: "Scalecurl Tail Spike", desc: "A golden spike from a mace tail, heavier than it looks.", secondary: true },
  shardling: { id: "shardlingCore", name: "Shardling Core", desc: "The bright magenta core that held the mirror shards together. It still pulls at glass.", secondary: true },
};
/** Every part a family's body can carry: the first, then the second where it has one. */
export function partsForFamily(family) {
  return [PART_DEFS[family], SECONDARY_PART_DEFS[family]].filter(Boolean);
}
/** Every part, by id (both tables). */
export const PART_BY_ID = Object.fromEntries([...Object.values(PART_DEFS), ...Object.values(SECONDARY_PART_DEFS)].map(p => [p.id, p]));
export function partById(id) { return PART_BY_ID[id] || null; }
/** The family a part comes off. */
export const PART_FAMILY = Object.fromEntries([...Object.entries(PART_DEFS), ...Object.entries(SECONDARY_PART_DEFS)].map(([f, p]) => [p.id, f]));
/** The part a kill drops: a family with two drops the second a third of the time. */
export const SECONDARY_PART_SHARE = 1 / 3;
export function rollPartForFamily(family, rng = Math.random) {
  const two = SECONDARY_PART_DEFS[family];
  if (two && rng() < SECONDARY_PART_SHARE) return two;
  return PART_DEFS[family] || null;
}
