// ============================================================================
// ROUND 323 -- TWO MORE ITEMS OF HIS, AS ITEMS.
//
//   "More cannon items to add and inform item development in game."
//
//   [Blade of the Blood Queen]  (iron rank [growth], legendary) -- a bracelet.
//   [Soul-Imprinting Triune]    (unranked, legendary) -- a consumable core.
//
// The words are his, copied as he typed them. This file is the data and the
// pure rules (thresholds, drain, who counts as vampiric, which bonus a Triune
// gives); relicItemMixin.js is where they run.
//
// His rulings (asked, round 323):
//   Scope        both work in play, like the Round 284 five; every line of the
//                card has an effect behind it.
//   Acquisition  rare themed drops. The bracelet from things that drink or
//                hoard life (bats, shades, demons, the Red Hour, the Long
//                Vigil); the Triune a rare late drop (silver rank and up).
//   Triune       "slot types plus your essences": each member gains a bonus
//                from what KIND of object it is, and a flavour from the family
//                of the strongest essence you carry. No fixed pairing table.
//
// The analogues, said once:
//   "health and stamina drain" -- a foe has health and no stamina, so the
//     stamina half WEARS THE FOE DOWN: its next attack is held back, and it is
//     slowed a little. Under [Power of the Blood Queen] that stamina is yours.
//   "minor / major threshold" -- fractions of YOUR maximum health, so the
//     bracelet asks the same of a rank-iron wearer and a rank-gold one.
//   "no blood" -- a lich (Undeath, lich form). Nothing else in the game is
//     bloodless yet; `wearerHasBlood` is the one place to add a second kind.
//   "soul-bound" -- ROUND 327 (his correction of the 300-second reading): an item of
//     Epic rarity or above binds to the first character who equips it, and only that
//     character may equip it afterwards (soulbound.js). A growth item "soul-bound to
//     you" is one that has bound to the player.
//   "dimensional space" -- the game has no gear storage beyond the bag, so
//     "on your person" is: worn, wielded, or in the bag. A piece sold, dropped
//     or given away leaves the set dark until it comes back.
// ============================================================================

export const BQ_KEY = 'bloodQueenBracelet';
export const TRIUNE_ID = 'soulTriune';

/** Verbatim. */
export const CANON_323_TEXT = {
  bloodQueenBracelet: {
    key: 'bloodQueenBracelet',
    name: 'Blade of the Blood Queen',
    rank: 'iron',
    rarity: 'legendary',
    growth: true,
    desc: 'A bracelet bestowing a fragment of the power belonging to the Queen of Blood',
    typeTags: 'jewellery, bracelet',
    effects: [
      "Bladed weapons conjured with iron-rank or lower abilities while wearing this bracelet inflict a health and stamina drain when making attacks. The drain effect is enhanced on vampiric enemies and other enemies that hoard stolen life force. Rather than heal the wearer, the drained life force is stored within the bracelet.",
      "Each time a minor threshold of health is cumulatively drained, an instance of [Blood of the Immortal] is bestowed on the wearer. This does not consume the bracelet's stored life force. This effect does not occur if the wearer has no blood.",
      "Once the major threshold of health is cumulatively drained, the wearer may consume all life force in the bracelet at any stage to gain [Power of the Blood Queen]. This ability cannot be used if the wearer has no blood.",
    ],
    conditions: {
      'Blood of the Immortal': {
        label: 'Blood of the Immortal',
        tags: 'boon, healing, unholy, stacking',
        text: 'Upon suffering damage, an instance is consumed to grant a powerful but short-lived heal-over-time effect. Additional instances can be accumulated but do not have a cumulative effect.',
      },
      'Power of the Blood Queen': {
        label: 'Power of the Blood Queen',
        tags: 'boon, unholy',
        text: "[Power], [Speed] and [Recovery] attributes are massively increased. Damage reduction and resistance to blood effects are enhanced. While this ability is in effect, the drain effect applied to bladed weapons is enhanced and directly drains life force to the bracelet's wearer instead of the bracelet. Life force drained while the wearer is uninjured increases the duration of this effect.",
      },
    },
  },
  soulTriune: {
    key: 'soulTriune',
    name: 'Soul-Imprinting Triune',
    rank: 'unranked',
    rarity: 'legendary',
    desc: 'An object with the power to allow imprinting of the soul on three soul-bonded objects.',
    typeTags: 'consumable, magic core',
    effects: [
      'Select three growth items that are soul-bound to you. These items will become a unified set. When all three objects are on your person (not contained within a dimensional space), each will gain an additional effect. The specific effects are determined by the types of objects included in the set and the nature of your soul.',
    ],
    conditions: {},
  },
};

/** His card, as lines (the same shape authoredCardLines gives). */
export function canonCardLines(key) {
  const T = CANON_323_TEXT[key];
  if (!T) return [];
  const rank = T.rank === 'unranked' ? 'unranked' : `${T.rank} rank${T.growth ? ' [growth]' : ''}`;
  const out = [`Item: [${T.name}] (${rank}, ${T.rarity}) ${T.desc} (${T.typeTags}).`];
  for (const e of T.effects) out.push(`Effect: ${e}`);
  for (const c of Object.values(T.conditions || {})) out.push(`[${c.label}] (${c.tags}): ${c.text}`);
  return out;
}

// ---------------------------------------------------------------------------
// [Blade of the Blood Queen]
// ---------------------------------------------------------------------------
export const BQ = {
  /** Which conjured weapons count as BLADED. */
  bladed: ['dagger', 'sword', 'axe', 'scythe'],
  /** "iron-rank or lower abilities" */
  maxAbilityRank: 'iron',
  /** The drain, as a share of the blow that carries it (grows with the
   *  bracelet's rank: it is the `bqDrain` fx on the item). */
  drainShare: 0.25,
  /** "enhanced on vampiric enemies and other enemies that hoard..." */
  vampiricMult: 2,
  /** The stamina half: a drained foe's next attack is held back this long
   *  (seconds), and it is slowed for as long. */
  staminaHold: 0.35,
  /** Under the Queen's power the stamina drained is the wearer's: this share
   *  of maximum stamina per blow. */
  staminaGain: 0.015,
  /** Thresholds, as a share of the WEARER's maximum health. */
  minorShare: 0.35,
  majorShare: 3,
  /** The bracelet holds at most this many majors of life force. */
  storeCapMajors: 3,
  /** "Additional instances can be accumulated" -- up to. */
  instanceCap: 5,
  // [Blood of the Immortal]: "a powerful but short-lived heal-over-time".
  hotShare: 0.3,      // of max health, in all
  hotSecs: 5,
  // [Power of the Blood Queen]
  powerBaseSecs: 30,          // for the first major; more life force, longer
  powerMaxSecs: 150,
  attrBase: 6,                // Power, Speed, Recovery: +6 and +2 a rank
  attrPerRank: 2,
  damageReduction: 0.25,
  bloodResist: 0.5,           // damage of the blood element, and blood afflictions
  drainMult: 2,               // "the drain effect ... is enhanced"
  uninjuredSecsPerMaxHp: 25,  // drained while uninjured: seconds per max-HP of it
  uninjuredCapSecs: 120,
};

const VAMPIRIC_FAMILIES = new Set(['bat']);
/** "other enemies that hoard stolen life force": the soul-takers and the dead. */
const HOARDER_FAMILIES = new Set(['shade', 'skeleton', 'demon', 'harbinger']);
const VAMPIRIC_CULTS = new Set(['blood', 'undeath', 'bone']);

/** m: { family, cultSlug, vampiric, hoards } -- a monster or a cultist. */
export function isVampiric(m) {
  if (!m) return false;
  if (m.vampiric || m.hoards) return true;
  const fam = m.family || (m.type && m.type.family);
  if (fam && (VAMPIRIC_FAMILIES.has(fam) || HOARDER_FAMILIES.has(fam))) return true;
  const cult = m.cultSlug || m.cult;
  return !!(cult && VAMPIRIC_CULTS.has(cult));
}

/** A weapon base that is a blade. */
export function isBladedBase(baseId) { return BQ.bladed.includes(baseId); }

/** "conjured with iron-rank or lower abilities" -- ranks are RANK_ORDER words. */
export function abilityRankOk(rank, order) {
  const i = order.indexOf(rank || 'iron');
  return i >= 0 && i <= order.indexOf(BQ.maxAbilityRank);
}

export function bqThresholds(maxHp) {
  const hp = Math.max(1, maxHp || 1);
  const minor = Math.max(1, Math.round(hp * BQ.minorShare));
  const major = Math.max(minor + 1, Math.round(hp * BQ.majorShare));
  return { minor, major, cap: major * BQ.storeCapMajors };
}

/** The health drained by one blow. `dmg` is the blow; `share` the bracelet's
 *  (grown) drain share; `mult` is 1, the vampiric multiplier, or the Queen's. */
export function drainAmount(dmg, share, mult = 1) {
  if (!(dmg > 0)) return 0;
  return Math.max(1, Math.round(dmg * share * mult));
}

/** Store drained life force. Returns the new total and how many minor
 *  thresholds that crossed. Beyond the cap nothing more is held (and nothing
 *  more is crossed). */
export function storeForce(stored, add, th) {
  const before = Math.max(0, stored || 0);
  const after = Math.min(th.cap, before + Math.max(0, add));
  const crossed = Math.floor(after / th.minor) - Math.floor(before / th.minor);
  return { stored: after, crossed: Math.max(0, crossed), ready: after >= th.major };
}

/** "consume all life force ... at any stage": the longer, the more it held. */
export function powerSeconds(stored, th) {
  const k = Math.max(1, (stored || 0) / th.major);
  return Math.min(BQ.powerMaxSecs, Math.round(BQ.powerBaseSecs * k));
}

/** Power, Speed and Recovery, by the wearer's rank index. */
export function queenAttr(rankIdx) { return BQ.attrBase + BQ.attrPerRank * Math.max(0, rankIdx || 0); }

/** Seconds a drained amount adds while the wearer is uninjured. */
export function uninjuredSeconds(drained, maxHp) {
  return Math.max(0, (drained || 0) / Math.max(1, maxHp || 1)) * BQ.uninjuredSecsPerMaxHp;
}

/** "no blood". */
export function wearerHasBlood(state) { return !(state && state.lich); }

// ---------------------------------------------------------------------------
// [Soul-Imprinting Triune]
// ---------------------------------------------------------------------------
/** What KIND of object a thing is, for the set. */
export function triuneClass(slot) {
  if (slot === 'weapon') return 'weapon';
  if (slot === 'ring' || slot === 'amulet') return 'jewellery';
  if (slot === 'belt') return 'belt';
  return 'armour';   // helmet, chest, gloves, legs, boots, shield
}

/** The bonus each KIND gives. `buffs` are minor stats; flat ones are flat. */
export const TRIUNE_CLASS_BONUS = {
  weapon:    { label: 'a weapon: quicker, and apt to crit',            buffs: [{ stat: 'attackSpeed', amount: 0.04 }, { stat: 'critChance', amount: 0.03 }] },
  armour:    { label: 'armour: harder to hurt',                        buffs: [{ stat: 'armorPct', amount: 0.05 }, { stat: 'maxHp', amount: 10 }] },
  jewellery: { label: 'jewellery: spells and skills come back sooner', buffs: [{ stat: 'cooldownReduction', amount: 0.03 }, { stat: 'manaRegen', amount: 0.08 }] },
  belt:      { label: 'a belt: wind and endurance',                    buffs: [{ stat: 'maxStamina', amount: 12 }, { stat: 'staminaRegen', amount: 0.08 }] },
};

/** The flavour of a soul, by the family of its strongest essence. */
export const TRIUNE_FLAVOUR = {
  blade:     { label: 'a blade-soul',      buffs: [{ stat: 'critChance', amount: 0.03 }] },
  polearm:   { label: 'a reaching soul',   buffs: [{ stat: 'attackSpeed', amount: 0.03 }] },
  bludgeon:  { label: 'a heavy soul',      buffs: [{ stat: 'critDamage', amount: 0.08 }] },
  ranged:    { label: 'a far-seeing soul', buffs: [{ stat: 'critChance', amount: 0.03 }] },
  force:     { label: 'a driving soul',    buffs: [{ stat: 'attackSpeed', amount: 0.03 }] },
  guard:     { label: 'a sheltering soul', buffs: [{ stat: 'blockChance', amount: 0.04 }] },
  earth:     { label: 'a stone soul',      buffs: [{ stat: 'armorPct', amount: 0.04 }] },
  cold:      { label: 'a winter soul',     buffs: [{ stat: 'resist_frost', amount: 0.06 }], fx: { elementDmg: { frost: 0.05 } } },
  fire:      { label: 'a burning soul',    buffs: [{ stat: 'resist_fire', amount: 0.06 }], fx: { elementDmg: { fire: 0.05 } } },
  storm:     { label: 'a storm soul',      buffs: [{ stat: 'resist_lightning', amount: 0.06 }], fx: { elementDmg: { lightning: 0.05 } } },
  light:     { label: 'a bright soul',     buffs: [{ stat: 'resist_radiant', amount: 0.06 }], fx: { elementDmg: { radiant: 0.05 } } },
  dark:      { label: 'a dim soul',        buffs: [{ stat: 'resist_shadow', amount: 0.06 }], fx: { elementDmg: { shadow: 0.05 } } },
  death:     { label: 'a grave soul',      buffs: [{ stat: 'critDamage', amount: 0.08 }] },
  life:      { label: 'a living soul',     buffs: [{ stat: 'hpRegen', amount: 0.1 }] },
  blood:     { label: 'a red soul',        buffs: [{ stat: 'maxHp', amount: 15 }, { stat: 'hpRegen', amount: 0.05 }] },
  alchemy:   { label: 'a brewing soul',    fx: { hotBoost: 0.1 } },
  mind:      { label: 'a quiet soul',      buffs: [{ stat: 'manaRegen', amount: 0.1 }] },
  craft:     { label: 'a making soul',     buffs: [{ stat: 'maxMana', amount: 12 }] },
  space:     { label: 'a wandering soul',  buffs: [{ stat: 'moveSpeed', amount: 0.04 }] },
  air:       { label: 'an airy soul',      buffs: [{ stat: 'moveSpeed', amount: 0.04 }] },
  flyer:     { label: 'a winged soul',     buffs: [{ stat: 'dodgeChance', amount: 0.03 }] },
  smallbeast:{ label: 'a quick soul',      buffs: [{ stat: 'dodgeChance', amount: 0.03 }] },
  beast:     { label: 'a hardy soul',      buffs: [{ stat: 'maxHp', amount: 15 }] },
  identity:  { label: 'a shifting soul',   buffs: [{ stat: 'castSpeed', amount: 0.03 }] },
  order:     { label: 'an ordered soul',   buffs: [{ stat: 'cooldownReduction', amount: 0.03 }] },
  motion:    { label: 'a restless soul',   buffs: [{ stat: 'staminaRegen', amount: 0.1 }] },
  aquatic:   { label: 'a tidal soul',      buffs: [{ stat: 'staminaRegen', amount: 0.08 }] },
  water:     { label: 'a flowing soul',    buffs: [{ stat: 'manaRegen', amount: 0.08 }] },
  serpent:   { label: 'a coiled soul',     fx: { tagResist: { poison: 0.1 } } },
};
const FLAVOUR_DEFAULT = { label: 'a plain soul', buffs: [{ stat: 'armorPct', amount: 0.03 }] };

const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, divine: 5 };

/** The family of the strongest essence in `ids` (rarest wins; a tie goes to
 *  the earlier slot). `catalog` is the ESSENCES table. null with none. */
export function strongestFamily(ids, catalog) {
  let best = null, bestR = -1;
  for (const id of (ids || [])) {
    const e = id && catalog && catalog[id];
    if (!e) continue;
    const r = RARITY_RANK[String(e.rarity || '').toLowerCase()] ?? 0;
    if (r > bestR) { bestR = r; best = e.family || null; }
  }
  return best;
}

/** What a rank scales a Triune bonus by (flat ones are rounded). */
export function triuneScale(rankIdx) { return 1 + 0.25 * Math.max(0, rankIdx || 0); }

const STAT_WORD = {
  attackSpeed: 'weapon attack speed', critChance: 'crit chance', critDamage: 'crit damage', armor: 'armour',
  maxHp: 'max health', cooldownReduction: 'cooldown reduction', manaRegen: 'mana recovery', maxStamina: 'max stamina',
  staminaRegen: 'stamina recovery', hpRegen: 'health recovery', blockChance: 'block chance', dodgeChance: 'dodge chance',
  moveSpeed: 'movement speed', castSpeed: 'spell cast speed', maxMana: 'max mana', auraRange: 'aura range',
};
const isFlat = (stat) => stat === 'maxHp' || stat === 'maxStamina' || stat === 'maxMana';
function describeBuff(b) {
  const word = STAT_WORD[b.stat]
    || (String(b.stat).startsWith('resist_') ? `${String(b.stat).slice(7)} resistance` : String(b.stat));
  return isFlat(b.stat) ? `+${b.amount} ${word}` : `+${Math.round(b.amount * 1000) / 10}% ${word}`;
}

/**
 * The additional effect for one member of a set.
 *   cls     triuneClass(...)
 *   family  strongestFamily(...)  (null -> a plain soul)
 * Returns { buffs, fx, text, label } with the numbers already scaled.
 */
export function triuneBonus(cls, family, rankIdx = 0) {
  const k = triuneScale(rankIdx);
  const r3 = (v) => Math.round(v * k * 1000) / 1000;
  const scaleBuff = (b) => ({ stat: b.stat, triune: true, amount: isFlat(b.stat) ? Math.round(b.amount * k) : r3(b.amount) });
  const cb = TRIUNE_CLASS_BONUS[cls] || TRIUNE_CLASS_BONUS.armour;
  const fl = (family && TRIUNE_FLAVOUR[family]) || FLAVOUR_DEFAULT;
  const buffs = [...(cb.buffs || []), ...(fl.buffs || [])].map(scaleBuff);
  const fx = {};
  for (const [key, v] of Object.entries(fl.fx || {})) {
    if (typeof v === 'number') fx[key] = r3(v);
    else fx[key] = Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, r3(vv)]));
  }
  const parts = buffs.map(describeBuff);
  for (const [key, v] of Object.entries(fx)) {
    if (typeof v === 'number') parts.push(`+${Math.round(v * 100)}% ${key === 'hotBoost' ? 'heal-over-time strength' : key}`);
    else for (const [kk, vv] of Object.entries(v)) parts.push(`+${Math.round(vv * 100)}% ${kk === 'poison' ? 'poison resistance' : `${kk} damage`}`);
  }
  return { buffs, fx, label: `${cb.label}; ${fl.label}`, text: parts.join(', ') };
}

/** The consumable def for the Triune. */
export const TRIUNE_DEF = {
  id: TRIUNE_ID,
  name: CANON_323_TEXT.soulTriune.name,
  relic: true,                 // never in the ordinary consumable pool or a potion slot
  triune: true,                // Use opens the three-item choice rather than drinking it
  value: 20000,
  desc: `${CANON_323_TEXT.soulTriune.desc} ${CANON_323_TEXT.soulTriune.effects[0]}`,
  cardLines: canonCardLines('soulTriune'),
};

/** Where the Triune falls: silver rank and up, rarely. */
export const TRIUNE_DROP = { minRank: 3, chance: 1 / 900 };

/** The Triune's drop roll. m: { rankIdx } */
export function rollTriuneDrop(rng, m) {
  return (m && (m.rankIdx || 0) >= TRIUNE_DROP.minRank && rng() < TRIUNE_DROP.chance) ? TRIUNE_ID : null;
}
