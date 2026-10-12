# Round 316 — the god, the door, the last words and the scar (2026-10-09)

## His words (the part this round builds, verbatim)

4.1.9) Initially holding everyone off the Destruction (the god appears) and slams his aura down on the player. Slowly red and black consume the screen until the mentor breaks free and blasts his aura out. You can tell he consumed a diamond rank spirit coin as he barely manages to hold back the aura. He runs to you opening a portal and you both jump through.
4.1.10) On the other side the mentor burns up from the inside passing on his final words. "Don't go it alone outworlder, find yourself some friends you can trust" his eyes widen "I can't hold it any longer, destructions curse is inevatible.... RUN" He then explodes in amassive red and white blast and the player blacks out.
4.1.11) When the player wakes up they will have a procedurally generated scar on their body or face somewhere.
4.1.12) After this point the player should have 4 or 5 essence abilities unlocked. (His clarification: a rough timeline of events, not a grant of essences or stones.)

## Readings I took

- **When the god comes.** The fight is the fight of round 315 until three of the five Mouth are down (the Voice counts), then the scene takes over. If the player somehow kills all five in one blow it comes anyway. The number is `OLB_GOD_TRIGGER`.
- **"Initially holding everyone off".** The first page is Olb holding the line against the whole hall; the god then steps out of the iron frame. The player cannot move and cannot be hurt for the whole of the scene.
- **The aura slam.** A red and black wash closes in from the screen's edges over eleven seconds until it covers everything; the camera shakes harder as it goes; you are tinted dark red. Olb barks through it. Then a white flash breaks it like a plate, rings go out from him, and the god is held off, faded back, not killed. The Mouth who were left are thrown down.
- **The coin.** The pages say it outright: a diamond-rank spirit coin burning down to nothing in his fist, barely holding.
- **The far side.** The portal comes out where the nest was, outside the walls. He burns: orange and white seams of light on his body, embers rising, a deepening tint. His words are the user's, with spelling and punctuation corrected ("Don't go it alone, outworlder. Find yourself some friends you can trust." / "I can't hold it any longer. Destruction's curse is inevitable... RUN."), with the eyes-widen beat between. Then a red and then a white blast, and the screen goes black.
- **Waking.** You come to in whatever the game treats as home (the respawn anchor: the capital, if you have reached it), healed. The Society's healers say three days, and that there is no sign of the hunter who went with you. You get a Destruction soul scar (round 314's generator: face or body, random shape and name), shown on the portrait and the Character page.
- **4.1.12 is a timeline note, not a grant.** He clarified that this line was a rough timeline marker (by this point in the story a player should have 4 or 5 essence abilities unlocked through play), not an instruction to push essences or awakening stones on the player. Nothing is given. An earlier build of this round did grant an essence and four stones; that was removed, along with its wake text and tests.
- **Olb is dead.** The hall's Olb stays hidden for good (even if the hall is rebuilt), his hunt is over (phase idle), and the tracker keeps his last advice ("find some friends you can trust") until the player has recruited a companion.

## What I did

- `src/data/olbHunt.js`: the god pages, the break pages, the burn pages (his words), the wake pages, the beat lengths (`OLB_CUT_TIMES`), the trigger, and checks in `olbHuntFaults()`.
- `src/scenes/olbFinaleMixin.js` (new): one timeline (`_olbCut = {ph, t}`) driven by the frame's own dt: appear, slam, breakFx, pages, run, portal, cross, burnBuild, pages, runBeat, blast, black, wake. A DOM veil (`#olbVeil`) paints the wash, the flashes and the black. `_olbCutLock` holds the player (it is part of `_isAnyOverlayOpen`). A save made mid-scene resumes at the nearest safe beat (`_olbCutResume`).
- `src/scenes/olbHuntMixin.js`: the fight no longer ends in "going quiet": it calls the god. The interim ending is gone (`_olbHuntHome`, the `fightDone` step). `_olbPlayScene` takes a narrator and a last-button label.
- `src/scenes/olbMixin.js`: after his death the tracker shows his last advice until you have a friend.
- `src/scenes/WorldScene.js`: the new mixin, and the cutscene lock in `_isAnyOverlayOpen`.

## Tests

`tools/tests/test_round316.cjs` (40 checks): the script and his exact words, no code that grants essences or stones, two Mouth down is not enough and three brings the god, the aura wash grows and is red and black, the dark clears, the diamond coin, the run, the portal and the crossing, the burn, the pages in order, the blast and the body gone for good, the scar, nothing given, Olb dead and staying dead, the tracker's advice and its end, saving, and a reload mid-scene. `test_round315.cjs` now ends at "the god comes".
