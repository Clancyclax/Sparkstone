# Round 101 — The Ground

> "Karsk should have actual tiles, where is the plain green coming from in
> these screenshots? NOTHING should be using a plan untextured green tile?"

Both halves of that were the same bug, and it was mine from round 78.

## What was wrong

Round 78 item **7.1** said *"Tiles 1 through 16 should be eliminated"* and item
**7.7** said the same of 201-216. I took both literally and correctly. What the
numbers actually point at is this:

| sheet | frames | what they are |
|---|---|---|
| `grassTileAtlas` | 0-15 | tufted grass, flowers, dirt edges, **75-88% opaque** — fills the diamond *and* overhangs it |
| | 16-24 | the diamond clipped to its own outline, **exactly 50%**, 6-14 colours, no flowers, no edge |
| | 25-27 | empty |
| `street_tile` | 0-15 | warm cobblestone laid stone by stone, **86%** |
| | 16-21 | grey flagstone and red brick clipped flat |
| | 22-23 | empty |

**Both eliminations removed the textured half and left the clipped half.** The
numbers were right; nobody had looked at what they pointed at.

The cost was not small. Measured across the whole map before the fix:
`grassTile` was **8,534 of 24,336 sampled tiles — 35% of all ground in the
game.** The Nek, the region the game opens in, has `ground: null` and therefore
draws grass and nothing else, so **Act 1's entire countryside** was the clipped
half. Karsk Landing's city floor was three clipped street frames, which is why
it read as a city-sized field of one grey.

## Both reversed, and written down where the reversal is

`ELIMINATED` now carries `// ...range(1, 16)` and `// ...range(201, 216)`
commented out with the reasoning above beside them. A standing instruction being
undone should be visible to whoever reads that list next, not quietly absent.

And the other half goes in their place — `17-28` and `223-224` are eliminated —
which turns *"NOTHING should be using a plan untextured green tile"* into
something a suite checks rather than something someone has to remember.

## Two guesses about which frames to hold back, both wrong

**The first:** I dropped the whole fourth column (3, 7, 11, 15) as "the water
column". Measuring blue pixels: frame 3 is 4.2% blue, frame 7 is 7.4%, and 11
and 15 are 0.0% and 0.1%. Only two of the four. I had been about to throw away
two thirteenths of the world's open ground on a guess about a column.

**The second, and this one only a picture could find:** with the textured
frames in, the first play-zoom shot of Nek country came back with **diagonal
corduroy streaks** running across the field. Tiling each of the sixteen frames
alone in a 10×10 block and putting the swatches side by side showed it at once:
frames **2, 6, 10 and 14** carry dark tufts at the same place in the diamond, so
tiled they line up into continuous rows. A ploughed field, not a meadow. The
streaky column was the *third* one, not the fourth.

`GRASS_TILE_GROUPS` is `[[0,1],[4,5],[8,9,11],[12,13,15]]`. A tile sheet's
columns mean whatever the artist meant by them, and the only way to know is to
tile each frame by itself and look, which takes about a minute.

## 7.2's riverbank, re-pointed

7.2 asked for *"tiles 23, 24, and 25 mixed along rivers and small lakes"* — and
those three land inside the clipped half, so what the rivers actually got was a
band of flat green. The bank is **4, 8 and 12** now: the two frames that carry
blue dashes and a bare dirt crossing, plus a dry one so it still reads as a mix
of three. Asserted positionally — 2,745 bank tiles in the world, **none of them
away from water**.

## The rule I tried to write and could not

The first draft of the suite asserted that no ground tile anywhere may be a
50%-opaque diamond. Run against the world it failed on 60,000 tiles: `cityTile`,
every water sheet, `region_mountain`, `region_swamp`, `region_slate_dark` and
`region_meadow` are **all** exactly 50%. Clipping to the diamond is how most of
this game's tile art is cut. Colour count does not separate them either —
`region_meadow`'s sunflower tile is 12 colours and is obviously drawn art — and
neither does luminance spread, which overlaps.

So there is no measurement that means "flat" in general, and a universal rule
here would have condemned four region packs you picked by hand. That is round
78's mistake pointing the other way: a rule stated over numbers, applied to art
nobody looked at. **What the suite asserts is the specific thing that was wrong,
by number; everything else it prints for a human to disagree with.**

## The check that would have caught this

`GRASS_TILE_GROUPS` is a constant in the **scene**, so `tilePlanFaults` cannot
see it. It named the eliminated half of a sheet for twenty-three rounds with the
data lane green every time. `test_round101` asks the **world** what it draws —
73,984 ground tiles sampled, 203 distinct frames, opacity and colour count read
off the loaded textures, 415,744 texture pixels — so it does not matter whether
the answer came from a table or a constant or somewhere nobody has thought of.

It prints the pixel count, per round 98's lesson.

## Two suites moved, both mine

`test_round78a` asserted 7.2's three bank numbers and 7.12's three Karsk floor
numbers **literally**. Both are rewritten against what those items *asked for* —
a bank tile distinct from the field behind it, in three regions and not the
fourth; a Karsk floor drawn from its own sheet out of more than three frames —
and both now read the numbers off the plan rather than repeating them. This is
round 97's treatment of `test_round73`'s five-iron floor, for the same reason: a
test that only knows the numbers will defend the defect.

## Suites

- `tools/tests/test_round101.cjs` — **23/23** (new)
- `tools/tests/test_round78a.cjs` — **30/30** (was 27/29 against this round)
- `tools/data_checks.mjs` — **173/173**
- Regressions green: 100 **30/30**, 99 **44/44**, 98 **41/41**, 97 **34/34**,
  90 **68/68**, 78b **24/24**, 78c **14/14**, 73 **46/46**, 65 **40/40**,
  64 **58/58**, 41 **61/61**.
- `test_round72` is **32/33**, unchanged — verified pre-existing by stashing this
  round and re-running. Harrowmoor has 24 of 27 landmarks doored and Karsk 18 of
  21; that came in with round 100's landmarks and is still open.

## Pictures

`shots/r101_*` are taken at **zoom 1.0-1.25** rather than the 0.22-0.33 the city
shots use. That gap is worth naming: at a fifth scale every tile is four pixels
and all texture averages out, so **the screenshots I have been taking for
twenty-three rounds could not have shown this either way.** The city shots are
the right picture of what got built and the wrong picture of what it looks like.

## Still open

- **Cadence's floor is 16 frames of `cityTile` and still reads as fairly uniform
  terracotta** at wide zoom. It is real drawn art, not a clipped fill, so it is
  not the defect this round fixed — but if you want it warmer or more varied,
  say so and it is a plan layer.
- **Harrowmoor paves from three frames only** (7.9 left 244, 247 and 251 of
  sixteen). Same story: your own instruction, and reversible in one line if the
  reason it was cut was the same reason as these two.
- **Acts 3 and 4 have no story.** `DIVISION_STAGES` is eleven: seven in The Nek,
  four in Ontaria, none in Elehyd or Bratugal. Still the largest open item.
- Coldharrow, Gravemarch, Stiltrow and Thornwick have no authored folk.
- `village` is missing from round 98's `CROWD` table, so Sailmend and Cobb Point
  get a hamlet's 4 rather than a town's 8. One line.
- Little Gale has no Society hall; one entry in `CIVIC_CITIES`.
- Guns, Technology, Magitech and Cyborg remain backburnered at your word.

## One more thing, and it is the most important thing in this round

**The published site has been dead since round 100, and this round's delivery
check is what found it.**

Comparing every file in `Sparkstone-web` against source turned up
`src/data/interiors.js` at **78,908 bytes published against 97,157 in source** —
round 99's civic halls never reached the folder. `WorldScene.js` imports four
bindings from that file (`CIVIC_CITIES`, `CIVIC_ROOMS`, `civicFaults`,
`civicCensus`) and **an ES module that cannot resolve an import fails at link
time**: the page loads, nothing runs, and there is no error anywhere a player
would see it.

It is fixed — interiors.js is delivered — but the interesting part is that this
is round 72's failure repeated exactly, one file over. Rounds 99 and 100 each
delivered "the files this round changed", each was right about its own round,
and interiors.js fell through the gap between them. **"Which files did this
round change" is a guess; "which files differ" is a measurement.** `src` is now
107 of 107 and `public` 1,140 of 1,140.
