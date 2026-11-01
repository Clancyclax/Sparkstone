# Round 415

This round covers your city review items 4 (corners, follow-up), 6, 6.1 and 8.3. Items 8.1, 8.2, 8.4, 8.5 and 9 come in round 416. Cadence only gets the corner change.

## The corners

Your square tower now stands at every corner of every city, the same piece at all four.

- **Colour:** recoloured to the wall stone's own colour, so it no longer looks darker or pinker than the wall. Your original file is kept in `tools/city_review/corner_src`.
- **Placement:** it stands on the corner itself, straddling the two walls, which stop just short of it. It is drawn over the walls next to it, so the walls no longer hide it.
- **Size:** 35% larger than a wall section, so it reads as a tower.
- **What it replaces:** the eight-angle corner pieces from round 414, including the flipped bottom one from earlier today.

## Streets with character (items 6, 6.1)

The cities are still mostly a grid, with these changes:

| City | Street segments closed | Dead-end lanes |
|---|---|---|
| Harrowmoor | 8 | 11 |
| Karsk Landing | 12 | 23 |
| Vashra | 16 | 29 |
| Tolbrand Quay | 0 | 2 |
| Slagward | 0 | 2 |

- **Closed segments:** the stretch of street between two blocks goes back to city ground. The two blocks become one larger block, and the cross street gets two T-junctions instead of a crossroads.
- **Dead-end lanes:** a short street runs half to two-thirds of the way into a wider block and stops.
- **Tried and taken out:** a street cut diagonally across the grid. In this view the grid's own streets already run diagonally on screen, and the cut came out as a jagged up-and-down line.

## Districts (item 8.3)

**Dense quarters.** About 30% of each city's housing blocks:
- Houses stand about 2 tiles apart, with no streets inside the block.
- The ground between the houses is paved as narrow alleys. Karsk Landing uses its street paving there, because its dirt path draws as red sand.
- Neighbouring houses' drawings overlap far less than Cadence's terraced rows allow, so the block doesn't read as a heap of roofs.

**Festival squares.** A ring of houses round a paved central square, every door facing the square.

**Counts in the running game:**

| City | Houses in dense quarters | Festival squares | Houses round them |
|---|---|---|---|
| Harrowmoor | 109 | 1 | 8 |
| Karsk Landing | 130 | 2 | 8 each |
| Vashra | 202 | 3 | 8 each |
| Tolbrand Quay | 13 | 1 | 16 |
| Slagward | 8 | 0 | 0 |

Slagward's blocks are too small for a ring of houses round a square, so it has the dense quarter only.

## What was checked

**Here:**
- `test_round415` passes.
- `test_round414` and `test_syntax_all` pass.
- The old suites' version checks now accept 415.

**In the game (headless browser):**
- The counts above, and that all eight temples and all four corners stand in every city.
- No page errors.
- Close-up pictures of every corner and gate, and of a closed segment, a lane, a dense quarter and a festival square in each city, all looked over: `r415_corners.jpg` and `r415_districts.jpg`.

**Not checked:**
- A full reshoot of the City-Review sheets. It comes after round 416, when the cities are filled.
- Your own build.
