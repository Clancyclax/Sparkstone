// ===========================================================================
// ROUND 396 (item 10, part B) -- FREE RUNNER'S WIND.
//
//   "Replace the placeholder momentum lines on the free runner ability with this sheet, centred on the player. It is
//    drawn for a character moving right, with the wind flowing right to left. Rotate or flip it to match the player's
//    heading each frame."
//   "Fade the effect in as momentum builds: alpha from about 0.25 at the first stack to about 0.9 at full momentum.
//    Speed up its playback with momentum, from about 0.8x to 1.5x. At zero momentum, or when the player stops, fade it
//    out over about 0.2 s. Don't cut it off." "Tint it faintly only if the ability has an element."
//   "This round is art only. Do not change any ability's mechanics."
//
// WHAT "MOMENTUM" IS HERE. Free Runner keeps no stack count of its own: it is ON once the run-up is made (2 s of
// moving, round 290) and stays on while the run lasts. So its momentum is the run itself -- the first "stack" is the
// moment it switches on, full is FULL_RUN_SECS of running after that. Where the player also holds Avatar of Speed, its
// [Momentum] stacks are the real thing and are read instead (stackCap 10 = full). Nothing here feeds back into any
// rule: the effect reads the run and the stacks, it never sets them.
// ===========================================================================

// The sheet as drawn is 96 x 64 a frame of one-pixel lines. Shipped MAGNIFIED 4x NEAREST (as the ritual circles and the
// signs are) and drawn at 1/4: at 1:1 the camera's zoom smoothed every line into a grey smear the eye could not find.
export const MOMENTUM_WIND_ART = {
  key: 'momentumWindR396', file: './public/assets/fx/momentum_wind.png',
  frameW: 384, frameH: 256, up: 4, frames: 8, frameMs: 83, anchorX: 48 / 96, anchorY: 32 / 64,
};
/** Seconds of running after the run-up at which the wind is at full. */
export const FULL_RUN_SECS = 4;
export const WIND_ALPHA = [0.25, 0.9];
export const WIND_SPEED = [0.8, 1.5];
export const WIND_FADE_OUT_SECS = 0.2;
/** How high on the body the wind is centred (world pixels above the feet). */
export const WIND_LIFT = 30;
/** "Tint it faintly": this share of the element colour over white. */
export const WIND_TINT_SHARE = 0.25;

/** Momentum 0..1. `stacks`/`stackCap` win where there are stacks; otherwise the run past its run-up. 0 = none. */
export function windMomentum({ on = false, runT = 0, runUp = 2, stacks = 0, stackCap = 10 } = {}) {
  if (stacks > 0) return Math.max(1 / stackCap, Math.min(1, stacks / stackCap));
  if (!on) return 0;
  const past = Math.max(0, runT - runUp);
  return Math.max(0.0001, Math.min(1, past / FULL_RUN_SECS));
}

/** Alpha and playback speed for a momentum (0 is handled by the fade-out). */
export function windLook(m) {
  const k = Math.max(0, Math.min(1, m));
  return { alpha: WIND_ALPHA[0] + (WIND_ALPHA[1] - WIND_ALPHA[0]) * k, speed: WIND_SPEED[0] + (WIND_SPEED[1] - WIND_SPEED[0]) * k };
}

/** The sheet is drawn heading screen-right. Heading `ang` (screen radians) -> rotation and a flip, so the gust is
 *  never drawn upside down: anything leftward is the art mirrored, then turned the small remaining way. */
export function windPose(ang) {
  let a = Math.atan2(Math.sin(ang), Math.cos(ang));
  if (Math.abs(a) <= Math.PI / 2) return { rotation: a, flipX: false };
  const r = a > 0 ? a - Math.PI : a + Math.PI;
  return { rotation: r, flipX: true };
}

/** A faint element tint: WIND_TINT_SHARE of `hex` over white; white with no element. */
export function windTint(hex) {
  if (hex == null) return 0xffffff;
  const c = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  const mix = (sh) => Math.round(255 + (((c >> sh) & 255) - 255) * WIND_TINT_SHARE);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

export function momentumWindFaults() {
  const out = [];
  const a0 = windLook(0), a1 = windLook(1);
  if (Math.abs(a0.alpha - 0.25) > 1e-9 || Math.abs(a1.alpha - 0.9) > 1e-9) out.push('alpha does not run 0.25 -> 0.9');
  if (Math.abs(a0.speed - 0.8) > 1e-9 || Math.abs(a1.speed - 1.5) > 1e-9) out.push('speed does not run 0.8 -> 1.5');
  if (windMomentum({ on: false }) !== 0) out.push('momentum without a run');
  if (!(windMomentum({ on: true, runT: 2, runUp: 2 }) > 0)) out.push('the first moment of the run is not a stack');
  if (windMomentum({ on: true, runT: 2 + FULL_RUN_SECS, runUp: 2 }) !== 1) out.push('a long run is not full');
  if (windMomentum({ stacks: 10 }) !== 1) out.push('a full stack count is not full');
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4, p = windPose(ang);
    const eff = p.flipX ? p.rotation + Math.PI : p.rotation;
    if (Math.abs(Math.cos(eff) - Math.cos(ang)) > 1e-6 || Math.abs(Math.sin(eff) - Math.sin(ang)) > 1e-6) out.push(`heading ${i * 45} is not followed`);
    if (Math.abs(p.rotation) > Math.PI / 2 + 1e-9) out.push(`heading ${i * 45} is drawn upside down`);
  }
  if (windTint(null) !== 0xffffff) out.push('no element is not white');
  return out;
}
