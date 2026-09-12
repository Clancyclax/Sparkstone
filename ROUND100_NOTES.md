# Round 100 — The Cities

> "extend city tiles to the wall borders, add a tile of a different color as
> roads 2 tiles wide. Ensure that the roads don't run through houses or
> buildings."
> "Do a unique palette swap for the adventure society building, and outside of
> cadence use the small black metal fence to mark out a small entry area"

Your four picks: **pale grey flagstone** roads, **Karsk gets a city floor**,
**gilt** for the Society, **a forecourt at the door**.

## The numbers, before and after

Measured on the running build, over each capital's ground out to its wall:

| | grass inside the wall | road share | buildings on a road |
|---|---|---|---|
| Cadence | bare corners | 15.1% | 1 |
| Harrowmoor | a 12-tile ring | 1.7% | 0 |
| Karsk Landing | bare to the wall | 1.7% | 0 |
| Vashra | a 20-tile ring | 6.4% | 0 |
| **after** | **0 everywhere** | **5.7 – 15.1%** | **0** |

## The floor reaches the wall

A capital's wall is a **square** of half-width `CITY_SQUARE_HALF` and its floor
was a **disc** of `st.radius`, and those two numbers were never the same number.
The floor is stamped as the square inside the wall now, and `_cityFloorHalf` is
the one place that number comes from — the stamper reads it, the street grid
reads it, the suite reads it. Two functions each holding their own idea of where
a city ends is how the ring got there.

Karsk Landing joins `CITY_FULL_FLOOR` at your word. It was the only capital with
no floor of any kind.

## A road you can see

The **width was never the problem** — `STREET_TILES` has been 2 since round 19
and `band()` measures it in whole tiles. Nobody could *see* it: `_tileArtFor`
consulted the region's floor plan before it looked at the tile type, so
`TILE_CITY` and `TILE_STREET` came back as the same material in two patterns.
Vashra's screenshot was one continuous brick apron with no street anywhere in
frame.

A street now answers **before** the floor plan does, from its own sheet — the
herringbone pack palette-shifted through the same `rampLut`/`lumaRange` route the
temple floors use. One material worldwide, because a road that is a different
colour in every city is four road materials and no road identity.

Two ramps were thrown away by looking at them: a full-range ramp topping near
white read as **snow**, and a dimmer full-range ramp read as **dark smudges**,
because a ramp spanning the whole scale gives a road as many dark pixels as
light and the eye averages it below the floor it crosses. **A road is not a
full-range material.** The ramp lives in the top half of the scale.

## Nothing stands in the road

`_placeOffStreet` and `_blocksStreet` already existed and already worked — they
were leaving four buildings on roads because a placer that exhausts its retries
places anyway, which was right while roads were invisible and is not right now.
`_clearRoadsOfBuildings` sweeps once after every placer has finished and nudges
rather than unplaces. **16 moved, 0 stuck.**

Its scope took two wrong turns worth recording. Sweeping everything got stuck on
`divisionCell` — Act 2's research house, which a story stage sends the player to
*by position*. Scoping to `b.settlement` then stopped sweeping Cadence entirely,
because the capital's buildings carry no settlement tag. The rule that works is
narrow: temples and the two Division buildings are sited by hand and exempt;
everything else is fair game. The suite names the exemptions rather than
filtering them silently.

## What a street grid cost, and what it cost to fix

Harrowmoor and Karsk were being tiled by `_smallSettlementTile` — a village's
road plan (one street each way) under a city with twenty-five buildings. Giving
them the real grid took three attempts, each caught by a suite:

1. **Default block, alleys on.** A two-tile road every eleven tiles is 33% of
   the city under road. Measured 30.8% and 31.4%, and the lot placers — which
   keep off streets by reading tiles — had nowhere left. **Karsk went from 26
   buildings to eight.**
2. **Doubled block.** Road share sane, but the grid ran a street through the
   temple row and the shop row: round 72 caught **Harrowmoor losing two temples
   and its tavern**.
3. **Two-and-a-half blocks.** Eight temples, the tavern back, 5.7–6.5% road.

And the walls disappeared entirely for a while. `isRoadTile` — the "paved at
all" predicate — **includes `TILE_CITY`**, so paving to the wall made every tile
under every wall a road and the builder refused all of it: three capitals with
zero wall stones, caught by round 72's own suite as `0 / 0 tiles = NaN`. The
wall wants `isCarriagewayTile`, whose note in town.js already said so: *"A
courtyard is not a street."* A wall may stand on paving; it may not stand across
a road, because that is where a gate goes.

The gate count then bracketed twice: streets running to the square's diagonal
gave **twelve** gates per city (round 72 wants two to eight — it is right, a wall
crossed twelve times is a colonnade), and pulling ten tiles inside gave **zero**,
a walled city with no way through. A circle of the wall's own half-width, plus
three tiles because `classifyTile` tests `dist <`, is what lands in between.

## The Society hall

Gilt, and **not** through `_paletteSheet`. That route remaps *named materials*,
and gilt's stone ramp is a dark olive-to-warm-grey against masonry that is
already grey: the texture baked, the building drew from it, and the hall came
out the same colour it started. A recolour that runs and changes nothing is
worse than one that fails — the probe said `townPool~pal_gilt` was in use and the
screenshot said the hall was still a house. `rampLut` remaps by **luminance**,
which cannot miss.

The hall also **stands behind the shop row rather than at the end of it**. Round
99 appended it to the service list and let the row re-solve its spacing for four
buildings, which moved every shop — and moving them cost Harrowmoor its tavern
and two temples when the lattice re-packed. A row that re-spaces itself when
something joins it rearranges the city.

## The forecourt

A single straight run of the wrought-iron fence across the hall's frontage with
a gap at the door. It began as a U, which is three runs in three directions
against a sheet that has one frame per direction — a close-up showed two clusters
of crossed railings beside the hall rather than an entrance.

The depth is chosen rather than fixed: a fixed two tiles put the railing on the
carriageway the hall fronts onto, so the posts were refused and two of three
forecourts came back with a single panel. It tries 2, 3, 1, 4 and takes the first
line that can hold most of itself.

Cadence is excluded at your word — its guild already has a reserved lot with a
lawn, and railing that would be a fence around a fence.

`fence` had been **loaded and used by nothing since round 23**. This is its first
job.

## Suites

- `tools/tests/test_round100.cjs` — **30/30** (new)
- `tools/data_checks.mjs` — **173/173**
- Regressions green: 99 **44/44**, 98 **41/41**, 72 **32/33** (the one failure is
  pre-existing — three undoored landmarks, failing identically before this
  round), 65 **40/40**, 64 **58/58**, 41 **61/61**, rebuild **18/18**.

## Still open

- **Karsk Landing lost its red.** It has a proper city floor now, at your word,
  and the badlands character with it — it reads much like Harrowmoor from above.
  Worth a look; a warmer floor material for Elehyd would give it back cheaply.
- The two Division buildings' barriers clip a street corner. Both are sited by
  the story and are deliberately exempt from the sweep.
- Acts 3 and 4 still have no story.
