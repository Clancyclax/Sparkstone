// ===========================================================================
// ROUND 359 (item 6.1) -- THE SOUL, AS A RESOURCE.
//
//   "a visible white soul resource. It goes down when resisting soul effects or suppressing another's soul. Each soul
//    scar or soul event strengthens the player's soul."
//
// A white bar under health, mana and stamina. It is spent in the aura contest (round 269):
//   - while an enemy aura is pressing on you, holding against it costs soul, and while you have soul to spend the
//     press on you is halved;
//   - while your aura is pressing on someone else's, that costs soul too, and with none left your press is halved.
// It comes back on its own when nothing is pressing. Its size grows with every soul scar (soulScars.js) and every
// soul EVENT (holding against a press until your soul runs out, pressing someone in conversation with Soul theory,
// the god's aura in the Seam). The scars stay cosmetic: the strength lives here, not on the scar record.
// ===========================================================================

export const SOUL_BASE = 100;
export const SOUL_PER_SCAR = 10;
export const SOUL_PER_EVENT = 3;
export const SOUL_EVENT_CAP = 20;          // events beyond this still count, but stop adding size
export const SOUL_REGEN_PER_S = 2.5;       // when nothing presses
export const SOUL_RESIST_PER_S = 3.0;      // holding against an enemy aura
export const SOUL_SUPPRESS_PER_S = 1.2;    // pressing on another's
export const SOUL_RESIST_SOFTEN = 0.5;     // the press on you while your soul holds
export const SOUL_SPENT_WEAKEN = 0.5;      // your press on others with no soul left
export const SOUL_EVENT_COOLDOWN_S = 120;  // a soul running dry counts once per two minutes
export const SOUL_PRESS_COST = 15;         // a soul attack in conversation (Soul theory)

/** How large this player's soul is. */
export function maxSoulOf(player) {
  const scars = Array.isArray(player && player.soulScars) ? player.soulScars.length : 0;
  const events = Math.min(SOUL_EVENT_CAP, Math.max(0, (player && player.soulEvents) | 0));
  return SOUL_BASE + SOUL_PER_SCAR * scars + SOUL_PER_EVENT * events;
}

/** One step of the soul: `pressed` (an enemy aura is winning) and `pressing` (yours is). Returns the new value. */
export function soulStep(cur, max, dt, pressed, pressing) {
  let v = Number.isFinite(cur) ? cur : max;
  if (pressed) v -= SOUL_RESIST_PER_S * dt;
  if (pressing) v -= SOUL_SUPPRESS_PER_S * dt;
  if (!pressed && !pressing) v += SOUL_REGEN_PER_S * dt;
  return Math.max(0, Math.min(max, v));
}

/** A suppression record softened by a soul that still holds (or passed through untouched). */
export function softenedBySoul(supp, soul) {
  if (!supp || !(soul > 0)) return supp;
  return { ...supp, dmg: (supp.dmg || 0) * SOUL_RESIST_SOFTEN, move: (supp.move || 0) * SOUL_RESIST_SOFTEN, softened: true };
}
export function weakenedBySpentSoul(supp, soul) {
  if (!supp || soul > 0) return supp;
  return { ...supp, dmg: (supp.dmg || 0) * SOUL_SPENT_WEAKEN, move: (supp.move || 0) * SOUL_SPENT_WEAKEN, weakened: true };
}

export function soulFaults() {
  const out = [];
  if (maxSoulOf({}) !== 100) out.push('a fresh soul is not 100');
  if (maxSoulOf({ soulScars: [{}, {}] }) !== 120) out.push('scars do not grow the soul');
  if (soulStep(50, 100, 1, false, false) <= 50) out.push('the soul does not recover');
  if (soulStep(1, 100, 10, true, false) !== 0) out.push('the soul does not empty');
  return out;
}
