// ============================================================================
// ROUND 388 -- HOW MANY AURAS (AND PERCEPTIONS) A KIT MAY HOLD, AND WHY.
//
//   "Ended up with 2 auras again and no obvious reason why I would have 2 auras.
//    However the soul scar would have been a good opportunity for a gift
//    evolution leading to the ability to awaken 1 aura for each essence. (The
//    canon way that it happens for aura and perception skills is either the
//    human gift adaptation for a relevant essence such as magic or eye (aura and
//    perception respectively) or a nature gift evolution improving a gift to
//    allow awakening multiples.)"
//
// One aura and one perception per kit (round 282). Three things lift a cap to
// "one on each essence, up to four" (SAVANT_CAP):
//   - the savant passive the kit itself rolled (senseSavants.js, round 282);
//   - a Human's Essence Gift adapted to a relevant essence: Magic for auras, a
//     sight essence (Eye, Omen, Lurker) for perceptions (natures.js);
//   - a nature gift evolution carrying `multiAura` / `multiPerception` -- the
//     player's is woken by the soul scar Destruction's aura leaves (natures.js,
//     SCAR_SENSE_EVOS).
// The nature ones arrive as fx flags (`natureFxOf` sums them); this file turns
// the flags and the kit's own record into the plain sentences the sheet and the
// awakening announcement print.
// ============================================================================

import { SAVANT_CAP } from './senseSavants.js';

/** The essences a Human's Essence Gift adapts to, for each kind. */
export const AURA_GIFT_ESSENCES = ['essMagic'];
export const PERCEPTION_GIFT_ESSENCES = ['essEye', 'essOmen', 'essLurker'];

/** What a nature's summed fx allows: { aura: bool, perception: bool }. */
export function senseAllowanceOf(fx) {
  return { aura: !!(fx && fx.multiAura), perception: !!(fx && fx.multiPerception) };
}

const WORD = { aura: 'aura', perception: 'perception' };

/**
 * The one-line rule for the sheet. `cap` is the generator's `senseCap[kind]`
 * ({ cap, perSlot, savant, granted }); `held` how many the kit runs; `source`
 * the name of what granted the right, when it was a nature gift.
 */
export function senseRuleLine(kind, cap, held, source = null) {
  const w = WORD[kind] || kind;
  const plural = `${w}${held === 1 ? '' : 's'}`;
  if (cap && cap.perSlot) {
    const why = cap.savant ? 'your kit\'s savant passive' : (source || 'a nature gift');
    return `${held} ${plural}. You can awaken one ${w} ability on each essence, up to ${cap.cap || SAVANT_CAP}: ${why} allows it.`;
  }
  return `${held} ${plural}. A kit holds one ${w} ability. A second needs a gift that allows one on each essence.`;
}

/** Said when a socket's pick was an aura the kit had no room for. */
export function senseRefusedLine(kind, holderName) {
  const w = WORD[kind] || kind;
  const art = w === 'aura' ? 'an' : 'a';
  return `Your kit already holds ${holderName ? `${art} ${w}, ${holderName}` : `${art} ${w}`}; this stone awakened something else. `
    + `A second ${w} needs a gift that allows one on each essence.`;
}

/** Said when a new aura beyond the first awakens, and what allowed it. */
const ORDINAL = ['first', 'second', 'third', 'fourth'];
export function senseAllowedLine(kind, n, why) {
  const w = WORD[kind] || kind;
  const ord = ORDINAL[n - 1] || `${n}th`;
  return `Your ${ord} ${w} awakened. ${why ? `${why} allows` : 'Your kit allows'} one ${w} ability on each essence.`;
}

/** Said once for a kept aura held over the cap (a save from before this round). */
export function senseHeldOffLine(kind, name, rivalName) {
  const w = WORD[kind] || kind;
  return `${name} is switched off: a kit holds one ${w} ability${rivalName ? `, and ${rivalName} is the one running` : ''}. `
    + `It is kept. Switch it on to switch ${rivalName || 'the other'} off instead.`;
}
