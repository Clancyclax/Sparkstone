// ROUND 343 -- the standard bolt, straightened.
//
// The old `boltfly` sheet tumbled: its arrow head pointed down-right in most frames and down-left in others, so no single
// base angle could aim it and it flew sideways. tools/make_bolt_aim.py rotates every frame so the head points along +x
// (public/assets/fx4/boltaim_<color>.png, 16 frames of 48x32); the base angle is therefore 0, like the fireball.
export const BOLT_AIM_COLORS = ['bloodred', 'orange', 'gold', 'yellow', 'green', 'blue', 'brown', 'black', 'grey', 'silver', 'white'];
export const BOLT_AIM = { frames: 16, cell: 48, cellH: 32, frameMs: 60, loop: true, colors: BOLT_AIM_COLORS, native: 'blue' };
