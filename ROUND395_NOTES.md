# Round 395

This round is regression triage. Two placement bugs are fixed in the game. The rest of the work brings old test suites up to date, so your runner reports real problems again instead of out-of-date checks.

## Fixed in the game

- **No building set down in a lake.** When a building is moved off a street, the move now checks where the building's base sits, not only its anchor point. Before, a roadside snowy cabin in Elehyd had its base in the mere beside it. It now lands on dry ground; no building was removed.
- **No rock or tree inside a building.** Rounds 254/256 re-fit every building to its art, and some grew over a boulder or a tree that was already there. A final pass now clears scattered rocks and trees from inside each fitted footprint. Hand-placed rocks and trees, and a site's or den's own stones, stay where they are.

## Tests

Most of the old failures were checks written before later rounds changed the game on purpose. Each was updated to check the current design, with the round that changed it noted in the test. Some examples:

- **Audio:** five volume sliders (round 305 added voice).
- **Kits:** archetype-based kits (round 376).
- **Potions:** a potion heals over time (round 281).
- **Lighting:** a city's night is a tint with no carved lamp light (round 356).
- **Signatures:** confluence signatures read from the identity sheets (round 391).

Other changes to the test files:

- **Timing:** several suites now close dialogues the game opens on its own mid-test.
- **Portability:** about 20 suites now find the repo from your runner's `.work` folder, and one no longer needs Python's PIL.

On your runner, the full round 394 regression turned 190 suites that failed in the r392 baseline into passes. The follow-up run on the round 395 changes turned another 33 to passing.

## Not done

- **Still failing:** about 45 suites, not yet triaged. A few may be real bugs:
  - an occasional "reading 'sys'" update error (rounds 69/71);
  - the vampire's leech when cast for real (272);
  - room chest timing (141);
  - four monsters with no death animation (189);
  - guards walking round a building (292).
- **Unverified fixes:** the potion test fixes (73, 74) and the lamp test fix (309) were only run here, not on your runner yet.

## What was checked

- **Here:** `test_syntax_all` (554 modules) and the round 394 art suites pass, and GAME_VERSION reads 395.
- **On your runner:** the `r395tri1` run.
- **Not run:** your own build.
