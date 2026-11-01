// ===========================================================================
// ROUND 396 (items 8 and 9) -- A SPECIAL ATTACK IS PRICED IN BLOWS OF THE WEAPON IN YOUR HAND.
//
//   8) "Special attacks immediate damage should scale with weapon damage. i.e. if a dagger does 2 damage per strike
//       and a greatsword does 16 damage per strike then a special ability should take that into account for it's
//       initial strike. Special Attacks should scale off of weapon damage differently. A physical focused blow with a
//       long cooldown might deal 4x weapon damage, whereas a poison blow might deal only 1.3x weapon damage as most of
//       it's damage comes from the debuff. This keeps weapons relevant as skills improve"
//   9) "Spell attacks don't scale off of weapons only rank. The advantage means a spell attacker is less gear
//       dependent for damage but instead focuses on mana regeneration or gear effects that boost particular types of
//       damage."
//
// BEFORE: a special attack's swing dealt the weapon's blow and then the ability's own flat `base` on top -- the same
// flat number whether a dagger or a greatsword delivered it, so past the first few levels the weapon stopped mattering.
//
// NOW: the strike lands `weaponMult` blows of the weapon that swung it (crits, gear and the weapon's own damage stack
// all included, because it is computed off the blow actually rolled). The ability's level still grows it -- the
// multiplier is scaled by the same `_scale` every other magnitude uses -- so a skill improving and a weapon improving
// both show up in the number. Spells are untouched by this file: they keep their rank-grown `base` and never read a
// weapon (item 9).
//
// THE MULTIPLIER, from the ability's own shape:
//
//   1. The cooldown sets how big a blow the ability is ALLOWED to be. A special that can be pressed every two
//      seconds is barely more than a swing; one held for half a minute is a finisher. 1 + 0.6*sqrt(cd), capped at
//      40 s (about 4.8 blows) -- the user's "long cooldown focused blow ~4x" lands at about 25 s.
//      The design rule from round 380 is honoured at the far end: an hour-class cooldown is worth about 25 blows.
//   2. What else the ability carries takes its share OUT of the immediate strike, because "most of its damage comes
//      from the debuff". A damage-over-time payload keeps a quarter of the cooldown's allowance (a 6 s poison blow:
//      about 1.3x, the user's own number); a sunder, a slow, a stun or a confusion keeps 60%; a bolt thrown off the
//      strike keeps 60% (the bolt is the rest of it). A blow that carries nothing else keeps it all.
//   3. Never below 1.1: a special attack always hits harder than the swing it rides on.
// ===========================================================================

export const SPECIAL_MULT_FLOOR = 1.1;
export const SPECIAL_CD_COEF = 0.6;
export const SPECIAL_CD_CAP_SEC = 40;
export const SPECIAL_HOUR_CLASS_SEC = 900;      // at or past this, the round-380 rule: about 25 blows
export const SPECIAL_HOUR_CLASS_MULT = 25;
export const SPECIAL_SHARE = { dot: 0.25, control: 0.6, bolt: 0.6, plain: 1 };

/** How many blows of the weapon the cooldown allows, before the payload takes its share. */
export function specialCooldownBlows(cdSec) {
  const cd = Math.max(0, Number(cdSec) || 0);
  if (cd >= SPECIAL_HOUR_CLASS_SEC) return SPECIAL_HOUR_CLASS_MULT;
  const capped = 1 + SPECIAL_CD_COEF * Math.sqrt(Math.min(cd, SPECIAL_CD_CAP_SEC));
  if (cd <= SPECIAL_CD_CAP_SEC) return capped;
  // between the cap and the hour class, climb on a log scale so a 5-minute finisher sits between the two
  const t = Math.log(cd / SPECIAL_CD_CAP_SEC) / Math.log(SPECIAL_HOUR_CLASS_SEC / SPECIAL_CD_CAP_SEC);
  return capped + (SPECIAL_HOUR_CLASS_MULT - capped) * t;
}

/** Which share of that allowance the strike itself keeps, read off what the ability carries. */
export function specialPayloadKind(a) {
  if (!a) return 'plain';
  if (a.dot || (a.debuff && /poison|bleed|burn|rot|venom|toxin|dot/i.test(String(a.debuff.kind || a.debuff.type || '')))) return 'dot';
  if (a.boltOnConnect) return 'bolt';
  if (a.sunder || a.slowPct > 0 || a.stun || a.stunDuration || a.confuseDuration || a.confuseChance || a.tauntDuration
    || a.debuff) return 'control';
  return 'plain';
}

/** The multiplier on the weapon's blow, at level 0 (the caller multiplies by the ability's `_scale`). */
export function specialWeaponMult(a) {
  if (!a) return SPECIAL_MULT_FLOOR;
  const blows = specialCooldownBlows(a.cooldown);
  if ((Number(a.cooldown) || 0) >= SPECIAL_HOUR_CLASS_SEC) return blows;   // the round-380 rule holds whatever it carries
  const share = SPECIAL_SHARE[specialPayloadKind(a)] ?? 1;
  return Math.max(SPECIAL_MULT_FLOOR, 1 + (blows - 1) * share);
}

/** The whole multiplier a cast uses: the level-0 multiplier grown by the ability's level scale. */
export function specialStrikeMult(a) {
  return specialWeaponMult(a) * ((a && a._scale) || 1);
}

/** The card's sentence for it -- the mechanic, stated once, in blows of the weapon. */
export function specialMultLine(a) {
  const m = specialStrikeMult(a);
  return `Strikes for ${m.toFixed(1)}× your weapon's damage`;
}

export function specialScalingFaults() {
  const out = [];
  const poison = specialWeaponMult({ cooldown: 6, dot: { dmgPerTick: 3, ticks: 4 } });
  if (Math.abs(poison - 1.3) > 0.15) out.push(`a 6 s poison blow is ${poison.toFixed(2)}x, the user's example is ~1.3x`);
  const focused = specialWeaponMult({ cooldown: 25 });
  if (Math.abs(focused - 4) > 0.3) out.push(`a 25 s focused blow is ${focused.toFixed(2)}x, the user's example is ~4x`);
  if (specialWeaponMult({ cooldown: 0.5 }) < SPECIAL_MULT_FLOOR) out.push('a special can fall below the floor');
  if (Math.round(specialWeaponMult({ cooldown: 3600 })) !== SPECIAL_HOUR_CLASS_MULT) out.push('an hour-class blow is not ~25x');
  let prev = 0;
  for (const cd of [1, 3, 6, 12, 25, 40, 120, 600, 900, 3600]) {
    const m = specialCooldownBlows(cd);
    if (m < prev) out.push(`the cooldown curve falls at ${cd}s`);
    prev = m;
  }
  return out;
}
