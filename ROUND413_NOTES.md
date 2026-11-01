# Round 413

This round follows up the character fixes, using the character-fixes.zip you re-sent.

## The female city guard (guardF)

Her idle and run sheets are replaced with the ones you built from the latest PixelLab version, with the slung back-spear removed:
- `public/assets/guardF_run.png` is now `guard/game_sheets/guardF_run.png`.
- `public/assets/guardF_idle.png` is now `guard/game_sheets/guardF_idle.png`.

Both keep the existing layout, in the player's direction order:
- **Run:** each row is a direction, with 8 frames across.
- **Idle:** one row of the 8 directions.

`GUARD_ART.guardF` in `src/data/guardManifest.js` now reads:

| State | Cell | Frames per direction | Foot |
|---|---|---|---|
| Run | 92 (was 88) | 8 | 78 |
| Idle | 64 | 1 | 61 (was 62) |
| Attack | 88 | 17 | 76 (unchanged) |

Both feet match the lowest opaque row of the new sheets.

The raw `guard/city_guard_female` frames from the earlier zip aren't used; the game sheets supersede them. This also replaces round 412's touch-up of her idle sheet.

**The attack sheet is unchanged, as you asked.** It still shows the back-spear while she swings.

## Duelist BT1 greataxe_1h, north-east

`stances/BT1_duelist_bt1_greataxe_1h_v2/rotations/north-east.png` went into the game's own sheet, `twohand/duelist_bt1_greataxe_1h_idle.png`. It went in at the offset the cell was packed at (0, 0), and the match score was 1.00.

Exactly one pixel changed: the stray pixel at (853, 28). Nothing else in the sheet moved.

## Left as they are

- **Duelist BT1 spear north-west and Duelist BT2 glaive_1h west and south-west:** the game's own frames are already clean, as you said. Round 412 left them unchanged, and they still are.
- **The other directions of Duelist BT1 greataxe_1h:** the game uses the v2 state, which is already clean.
- **The re-sent spear run frames:** the Duelist BT1 spear, Duelist BT2F spear and Leather BT2F spear run frames differ from the first zip only in how the PNGs were saved; every pixel is the same. Round 412's runs therefore stand, and nothing was redone.

## Known, not in this set

Leather BT1 greataxe_shield east.

## What was checked

**Here:**
- `test_round413` (11 checks) passes.
- `test_round412` passes.
- `test_round197` stops before its guard check, at an older interior-stair step (`toRoom`), so the guard part of it was not reached.
- The old suites' version checks now accept 413.

**In the game (headless browser):**
- The new sheets load at their new sizes: run 736x736 in 92 cells, idle 512x64.
- For every direction and every run frame, I measured how far below her anchor her feet land:
  - **Idle:** 0 to 1 px in every direction except north, where her feet stand 2 px above it.
  - **Run:** within 1 px of that, except mid-stride: the east and west frames lift by up to 3 px and north by up to 2.
- Pictures of her standing and running facing south, east and north, on open ground, show her feet on the same line with no hop, and no back-spear in either state.

**Not checked:** your own build.
