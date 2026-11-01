// ===========================================================================
// ROUND 324 -- THE HEALTH SCALE.
//
//   "I think health and health recovery needs to be changed, and ability damage
//    and healing need to be rescaled to match. So health being baseline
//      Iron 100 -> 200 / Bronze 220 -> 400 / Silver 440 -> 800 / Gold 1000 -> 2000"
//   "Bronze should be 2-3.9%, Silver 4-8.9%, and Gold 9-12%"
//   "Tied to both recovery and power attribute progress. The range is also to
//    denote variation between characters due to essences"
//   "Everything including potions, regen, lifesteal and item effects"
//
// ONE FILE holds every number of the rescale so that a retune is one edit and the
// suite reads THIS rather than trusting two copies to agree. Pure: no Phaser, no
// scene, no save state -- the callers hand it a rank index and a progress figure.
//
// THE RANGE. Each rank has a [low, high] band for maximum health and one for health
// recovery. Where a character sits in the band is their IN-RANK PROGRESS, which is
// the "tenths" of the attribute (1.0 .. 1.9 for a bound attribute) -- the figure the
// linked essence slot's level already produces (inventory.js attrRankProgress).
// Health uses the mean of Power's and Recovery's progress ("tied to both");
// recovery uses Recovery's alone. Two characters at the same rank therefore differ
// by which essences they carry, which is the variation the ask names.
//
// THE UNIT, `unitK`. Every other number in the game was written against the old
// health scale (40 + 60 per Power point, so ~127 at Iron and 280 at Gold). If health
// alone moved, a Gold hunter would have 7x the health and the same 40-point sword.
// `unitK(rank)` is the ratio of the new band's midpoint to what the OLD formula gave
// a typical character of that rank, and it is the one factor by which damage, healing,
// shields and flat health in gear are rescaled to match -- so that a typical fight
// lasts as long as it did and the rank gaps are the ones the new bands imply.
// Normal rank keeps the legacy formulas and K = 1 (the prologue is untouched).
// Diamond reuses Gold: the soft attribute cap of 4 means nothing differs there.
// ===========================================================================
import { RANK_ORDER } from './ranks.js';

/** Master switch -- false restores every legacy number (K = 1, old health). */
export const HEALTH_SCALE_ON = true;

/** Max health bands, by rank key. */
export const HEALTH_RANGE = {
  iron:   [100, 200],
  bronze: [220, 400],
  silver: [440, 800],
  gold:   [1000, 2000],
};

/** Health recovery as a fraction of maximum health PER SECOND.
 *  Iron was not given: 1 - 1.9% is the old rate at that rank (1 point of Recovery
 *  at 1%/pt) kept as it was, and the one assumption to confirm. */
export const REGEN_RANGE = {
  iron:   [0.010, 0.019],
  bronze: [0.020, 0.039],
  silver: [0.040, 0.089],
  gold:   [0.090, 0.120],
};

/** What a progress figure may reach. 1 is "a full tenths bar"; abilities that grant
 *  attribute points push it past 1, and these ceilings stop that running away. */
export const HP_PROGRESS_MAX = 3;
export const REGEN_PROGRESS_MAX = 1.5;

/** A bound attribute's tenths run 0.0 .. 0.9 (slot level 0..9). */
export const TENTHS_SPAN = 0.9;

const OLD_BASE = 40, OLD_PER_POWER = 60, OLD_SOFT_CAP = 4;

/** Rank index -> the band it lives in (diamond reads as gold, normal as none). */
export function bandKey(rankIdx) {
  const i = Math.max(0, Math.min(rankIdx | 0, RANK_ORDER.indexOf('gold')));
  return i === 0 ? null : RANK_ORDER[i];
}

/** Does the new scale apply at this rank at all? */
export function scaleApplies(rankIdx) {
  return HEALTH_SCALE_ON && bandKey(rankIdx) !== null;
}

const mid = (r) => (r[0] + r[1]) / 2;

/** What the OLD formula gave a typical (mid-progress) character of this rank. */
export function oldTypicalHp(rankIdx) {
  const steps = Math.max(0, Math.min(rankIdx | 0, RANK_ORDER.indexOf('gold')) - 1);
  return OLD_BASE + OLD_PER_POWER * Math.min(OLD_SOFT_CAP, steps + 1.45);
}

/** The rescale factor for this rank. 1 for Normal or with the switch off. */
export function unitK(rankIdx) {
  if (!scaleApplies(rankIdx)) return 1;
  return mid(HEALTH_RANGE[bandKey(rankIdx)]) / oldTypicalHp(rankIdx);
}

/** K for a person/monster whose `tier` is a rank index (0 = normal). */
export const tierK = unitK;

/** A damage or heal figure, rescaled for the rank. */
export function scaleUnit(value, rankIdx) {
  const k = unitK(rankIdx);
  return k === 1 ? value : value * k;
}

/** The inverse, for numbers that are NOT health (mana / stamina restores riding
 *  on a field the scaler also reaches). */
export function unscaleUnit(value, rankIdx) {
  const k = unitK(rankIdx);
  return k === 1 ? value : value / k;
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (r, t) => r[0] + (r[1] - r[0]) * t;

/** In-rank progress of an attribute from its raw parts (see inventory.js). */
export function progressFromTenths(tenths, bonusPoints = 0) {
  return Math.max(0, (tenths || 0) + (bonusPoints || 0)) / TENTHS_SPAN;
}

/** Maximum health for a character at `rankIdx`, or null if the legacy formula
 *  applies. `power` and `recovery` are progress figures (0 .. ~1). */
export function maxHpFor(rankIdx, power, recovery) {
  if (!scaleApplies(rankIdx)) return null;
  const t = clamp(((power || 0) + (recovery || 0)) / 2, 0, HP_PROGRESS_MAX);
  return Math.round(lerp(HEALTH_RANGE[bandKey(rankIdx)], t));
}

/** Health recovery (fraction of max per second), or null for the legacy rate. */
export function hpRegenFor(rankIdx, recovery) {
  if (!scaleApplies(rankIdx)) return null;
  return lerp(REGEN_RANGE[bandKey(rankIdx)], clamp(recovery || 0, 0, REGEN_PROGRESS_MAX));
}

/** Everything the card/sheet needs in one object. */
export function healthSummary(rankIdx, power, recovery) {
  const key = bandKey(rankIdx);
  return {
    band: key, k: unitK(rankIdx),
    hp: maxHpFor(rankIdx, power, recovery), hpRange: key ? HEALTH_RANGE[key] : null,
    regen: hpRegenFor(rankIdx, recovery), regenRange: key ? REGEN_RANGE[key] : null,
  };
}

// ---------------------------------------------------------------------------
// THE FIELDS THE ABILITY SCALER REACHES.
//
// `base` is overloaded in the ability table (damage, heal, and in some templates a
// mana/stamina restore), so it is scaled for everything EXCEPT the templates and
// riders listed in RESOURCE_BASE, which keep their number and are corrected at the
// point of use. These lists are the single source for both the card and runtime.
// ---------------------------------------------------------------------------
export const K_FIELDS = ['base', 'healAmount', 'hotPerSec', 'shieldAmount', 'absorb',
  // Figures the generator derives FROM `base` at creation (so the rank scaler never
  // reaches them): a summon's / familiar's blow, a field's heal-per-second, a
  // mend's heal-on-use.
  'summonDmg', 'familiarDmg', 'healPerSec', 'healOnUse'];
export const K_NESTED = [['dot', 'dmgPerTick'], ['hot', 'perSec'], ['effect', 'damage']];

/** Templates whose `base` is a MANA or STAMINA figure, not health or damage. */
export const RESOURCE_BASE_TEMPLATES = ['resourceRestore', 'manaRestore', 'staminaRestore'];

// The same rounding convention the rank scaler uses: whole numbers from 2 up,
// fractions left alone so a 0.5/s trickle does not collapse to 1.
const rounded = (v) => (v >= 2 ? Math.round(v) : Math.round(v * 100) / 100);

/** Scale an ability spec (a plain object) in place-safe fashion: returns a shallow
 *  copy with the health-shaped fields multiplied by K and `_unitK` recorded. */
export function scaleAbilitySpec(spec, rankIdx) {
  const k = unitK(rankIdx);
  if (!spec || k === 1) return spec;
  const out = { ...spec, _unitK: k };
  const resource = RESOURCE_BASE_TEMPLATES.includes(spec.template);
  for (const f of K_FIELDS) {
    if (typeof out[f] !== 'number') continue;
    if (f === 'base' && resource) continue;
    out[f] = rounded(out[f] * k);
  }
  for (const [a, b] of K_NESTED) {
    if (out[a] && typeof out[a][b] === 'number') {
      out[a] = { ...out[a], [b]: rounded(out[a][b] * k) };
    }
  }
  return out;
}
