# Round 302: 5,017 more hand-authored fusion pairs

A patch (`SparkstoneWeb-r302-patch.zip`) over round 301. Run `Rebuild Sparkstone-web.sh` as usual.

His words: "The 5,017 pairs and 20,068 fusions are now in two places the main chat can reach." (a bring-back archive and a CSV from the cloud authoring session on the credit).

## What changed

- Every fusion pair in the bring-back archive is now in the game: **5,017 pairs, 20,068 fusions, 88 essences**. All pass `validate.mjs`; `assemble.mjs` rejected 0 and found no duplicate names within an essence. Before this round the game shipped 2,929 pairs.
- All 210 chunks in the archive are marked reviewed, and every row of the CSV says `yes`.
- The archive was a superset of what this chat had written. 541 pairs existed in both with different text; every one of them sat in a chunk this chat had authored but not reviewed, so the reviewed copy from the cloud session replaced it. Pairs in chunks this chat had already reviewed were identical.
- Files load per essence on demand (`fusionRegistry.js`), so boot is unchanged; the source grows to 7.8 MB of `src/data/fusions/`.
- Old saves are not re-rolled: a kit keeps the fusions it was built with. New stones and new characters draw from the larger pool.
- `GAME_VERSION` 302.

## Totals now

5,017 of 28,195 pairs written and reviewed (17.8%), 975 of 1,185 chunks still to author. `tools/fusions/PROGRESS.md` is regenerated.

## Tests

`test_round298` (every shipped pair builds a card with no undefined or NaN), `test_round296` and `test_round297` pass.

## Open

Further authoring waits for the credit reset next week. Round 301 item 1 (the invisible object near a Cadence gate) still needs his location.
