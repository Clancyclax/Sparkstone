# Round 317 — a Sound page in the player menu (2026-10-10)

## His words

"Need to add a sound settings tab to the player menu, and continue with the authoring work."

## Reading I took

The player menu is the inventory screen (I), whose tab strip runs Character, Essences, Abilities, Team, Inventory, Quests, Map, Bestiary, Controls. The mixer already existed, but only in the Options panel (O / title screen). A tenth tab, **Sound**, now sits at the end of the strip.

## What I did

- `index.html`: the Sound button (`data-tab="9"`), its page (`#invTab9`), a little CSS.
- `src/scenes/WorldScene.js`: `_soundRowsHtml` / `_wireSoundRows` build the five sliders (Overall sound, Music, Ambiance, Spells, Voices) in ONE place. The Options panel now uses them too, so the two screens cannot drift: same buses, labels and stored mix, and a readout changes on both when either moves. `_renderSoundTab` adds a note and a **Reset to defaults** button. Overall sound still gates the rest (zero is a real mute). The pad moves the sliders with left/right, and L1/R1 reach the page.
- `src/data/version.js` = 317.

## Tests

`tools/tests/test_round317.cjs` (12 checks): the button and page, one slider per bus, the stored value and readout, master gating, pad focus, reset, shoulder paging, and the Options panel sharing the mix. Round 19 (tab paging) passes its tab checks; its three other failures (road offset, guildmaster essence, a town tree) are in world generation and are old. Round 306 passes. `test_round67.cjs` cannot start (it requires a harness file that is not in the repo), which is old.

## Authoring

Credits are fine; six fusion waves were relaunched (129 chunks left at the time). Check-in in three hours.
