# Round 135 — the Cities tab renders the real town

**A tool-only round. Nothing under `src/` changed and `GAME_VERSION` did not
move**, which is why these notes are written retroactively alongside round
136's: `tools/data_checks.mjs` asserts the stamp against the highest
`ROUND<N>_NOTES.md` and separately asserts the notes have no gaps, so shipping
136 without this file fails the lane. The check is right — the round happened.

## What it did

`tools/sparkstone_editor.html`'s Cities tab went from a flat top-down
schematic with tinted boxes on it to a full isometric render of a settlement:
real grass, street and plaza tiles, and real building sprites.

The method is the rule this project has followed since the Rooms tab —
**import the game's own functions, never re-derive them** — extended from leaf
data modules to a class. `WorldScene` extends `Phaser.Scene`, but its build
methods are ordinary prototype methods, so `this` is just an object as far as
JavaScript cares. `Object.create(WorldScene.prototype)` gives something whose
method lookups resolve exactly like a real instance's, while every Phaser call
the methods make along the way (`this.add.image`, `this.make.graphics`,
`this.textures.exists`) is answered by a small stub instead of a canvas.

No game code changed. The risk is contained entirely to the tool.

## Verified

A headless Chromium boot of the live game, running the same `CITY_BUILD_STEPS`
against a fake scene inside the *loaded real game's own module instances*, then
diffing against the real scene's own arrays: **99.99% of tiles matched
exactly**, buildings within ~3.5%.

## Known gaps at the end of this round

All closed or measured in round 136 — see `ROUND136_NOTES.md`.

- Water and per-region ground dressing were not reproduced; an honest flat
  tint stood in.
- Temples and Society Halls fell through to the amber "missing art" diamond.
- City props, trees and rocks did not render at all.
- Flora could not be hand-placed, because the game did not consume a placed
  flora entry.
