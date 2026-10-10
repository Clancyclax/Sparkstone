// ============================================================================
// ROUND 304 -- THE SUN, THE MOON AND THE ECLIPSE.
//
//   "Added new animations for the Sun, Moon, and Eclipse. For the Eclipse and
//    Moon these animations don't need to play at full speed and can instead
//    signify a cycle or charge."
//
// The sheets are packed by tools/pack_celestial.py (celestialFx.js lists them):
//   sun      8 frames, a pulsing disc -- loops at its own pace.
//   moon    15 frames, ONE FULL LUNAR CYCLE: 0 is a new moon, 7 a full moon, 14
//           new again. It is not played; the game holds the frame the sky is on.
//   eclipse 10 frames, the moon crossing the sun. Not played either: the frame
//           IS how far the orb has formed.
//
// THE MOON'S PHASE IS THE GAME DAY. A day is ten minutes of play (see
// WorldScene._dayIndex), so a lunar cycle of fourteen days is two hours and
// twenty minutes: long enough to be a thing the world does, short enough to see
// both ends of it in a session. [Pale Eye of the Moon] reads it: "Damage dealt is
// decreased by 0-20% with its zenith at a full moon, and its minimum at a new
// moon."
// ============================================================================
export const MOON_CYCLE_DAYS = 14;
export const MOON_FRAMES = 15;

/** The moon on a given game day: its frame in the sheet (0 new, 7 full) and its
 *  illumination from 0 (new) to 1 (full). */
export function moonPhaseOfDay(day) {
  const d = ((Math.floor(day || 0) % MOON_CYCLE_DAYS) + MOON_CYCLE_DAYS) % MOON_CYCLE_DAYS;
  return { day: d, frame: d, illum: 1 - Math.abs(d - 7) / 7 };
}

// ROUND 304 (second pass) -- THE MOON'S OWN CLOCK.
//   "Moon Debuff should transition through the animation slowly maybe 1 frame
//    every 3 seconds, holding at a full moon for 10 seconds then continuing
//    through the cycle."
// So the mark does not follow the game day: it walks the sheet on a clock of its
// own, 3 seconds a frame, 10 seconds on the full moon (frame 7). One cycle is
// fifteen frames, fourteen at 3s and the full moon at 10s, is 52s. Every marked creature shows the same phase, and the damage cut reads
// the same phase, so what is on screen is what the cut is.
export const MOON_STEP_SECS = 3;
export const MOON_HOLD_SECS = 10;
export const MOON_FULL_FRAME = 7;
export const MOON_CLOCK_CYCLE = (MOON_FRAMES - 1) * MOON_STEP_SECS + MOON_HOLD_SECS;
export function moonPhaseAtClock(t) {
  let u = (((t || 0) % MOON_CLOCK_CYCLE) + MOON_CLOCK_CYCLE) % MOON_CLOCK_CYCLE;
  let frame = 0;
  for (; frame < MOON_FRAMES; frame++) {
    const len = frame === MOON_FULL_FRAME ? MOON_HOLD_SECS : MOON_STEP_SECS;
    if (u < len) break;
    u -= len;
  }
  frame = Math.min(frame, MOON_FRAMES - 1);
  return { frame, illum: 1 - Math.abs(frame - MOON_FULL_FRAME) / MOON_FULL_FRAME };
}

/** [Pale Eye of the Moon]'s cut to the damage its carrier deals. */
export function moonDealtCut(day, max = 0.2) {
  return max * moonPhaseOfDay(day).illum;
}
export const MOON_PHASE_NAMES = ['New moon', 'Waxing crescent', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
  'Waxing gibbous', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Waning gibbous', 'Waning gibbous', 'Last quarter',
  'Waning crescent', 'Waning crescent'];

/** The light a marked creature sheds: "shedding orange light in a range around
 *  them" (the sun) and "shedding silver light" (the moon). */
export const EYE_MARKS = {
  burningEyeOfTheSun: { sheet: 'sun', color: 0xff9800, css: '#ff9800', radius: 96, alpha: 0.22 },
  paleEyeOfTheMoon: { sheet: 'moon', color: 0xcfd8dc, css: '#cfd8dc', radius: 96, alpha: 0.2 },
};
export const EYE_KEYS = Object.keys(EYE_MARKS);
