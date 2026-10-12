# Round 313 — sprint toggle, speeds, grass (2026-10-09)

## His words (the whole list, verbatim)

1) Toggle for sprint on left click instead of hold
2) Add grass and animate it moving as players, npcs or monsters nove through it.
3) Come up with a way to add soul scars
4) Learn meditation and aura control through a trainer
4.1) Trainer needs to become a story character named Olb, Nikobe and after joining the adventure society the first story arc is with Olb.
4.1.1) Trainer will help the player with their first quests and explaining the world to the player
4.1.2) Initially teaching combat and looting. Guiding the player to having a weapon crafted.
4.1.3) Then teaching about skill books and rituals
4.1.4) finally teaching meditation and aura control
4.1.5) Finally it ends with simple monster hunt together where you stumble across an aperature to an astrap space.
4.1.6) On entering the astral space the player and mentor explore,  kill a few monsters and they go deeper only to run into a meeting of a cult of destruction and some shady researchers.
4.1.7) Watching from the cover of some boxes and supplies the player and mentor realize something bad is going on.
4.1.8) The player is sensed and then attacked
4.1.9) Initially holding everyone off the Destruction (the god appears) and slams his aura down on the player. Slowly red and black consume the screen until the mentor breaks free and blasts his aura out. You can tell he consumed a diamond rank spirit coin as he barely manages to hold back the aura. He runs to you opening a portal and you both jump through.
4.1.10) On the other side the mentor burns up from the inside passing on his final words.
"Don't go it alone outworlder, find yourself some friends you can trust" his eyes widen "I can't hold it any longer, destructions curse is inevatible.... RUN" He then explodes in amassive red and white blast and the player blacks out.
4.1.11) When the player wakes up they will have a procedurally generated scar on their body or face somewhere.
4.1.12) After this point the player should have 4 or 5 essence abilities unlocked.
5) Starting movement speed for iron rank needs increased by about 25%. 5.1)Companions and summons should have their speeds increased by about 35% to better keep up with the player.

Plus, mid-turn: a zip of 25 pixellab grass objects — "Grass objects to be placed on grass tiles".

## Plan

His list is a story arc and three systems, so it goes in rounds. This round is the three quick ones (1, 2, 5/5.1). The rest is queued in `OPEN_TASKS.md` in his order: (3) soul scars, (4) the trainer who teaches meditation and aura control, (4.1.x) Olb Nikobe's arc — combat and looting, the first weapon, skill books and rituals, meditation and aura, the monster hunt, the astral aperture, the Destruction cult meeting, the death, the scar, and 4–5 essence abilities unlocked afterwards.

## What I did

- **Item 1, sprint toggle.** One press of Shift (keyboard) or L3 (left stick click) turns sprint on; another turns it off. It also drops by itself when stamina runs out and when the player stops moving, so it never carries over into the next walk. I read "left click" as the left stick click the sprint was already bound to, and applied the same toggle to Shift. The controls page now says "press to toggle". Shift+Tab (target cycling backwards) does not toggle it.
- **Item 5, speeds.** `MOVE_SPEED` 150 → 188 (+25%). Every speed in the stack multiplies it, so sprint, mounts and passives rise with it. `PARTY_SPEED` 168 → 227 (+35%). Summons: `SUMMON_SPEED_MULT = 1.35` applied where a summon is created (the authored `summonSpeed` is unchanged in data).
- **Item 2, grass.** New `src/scenes/grassMixin.js`. His 25 sprites are packed into `public/assets/grass_tufts.png` (5x5, 32px). Tufts stand on plain grass tiles only (not road, plaza, path, water, or anything in `_solidTiles`; nothing indoors), placed by a hash of the tile so the field is the same every build and nothing is saved. Only the camera's view has sprites (pooled). By region: straw-yellow in Elehyd, Sirukh Sands and the Cinderwaste, dark green in Bratugal, a green meadow mix everywhere else. Each tuft sways on its own phase; anything within about half a tile — the player, party, NPCs, monsters, summons — bends it away sideways, harder the faster it moves, and it swings back past upright before settling (a damped spring). Costs only the pushers in view times a few tufts each.

## Tests

`tools/tests/test_round313.cjs`.
