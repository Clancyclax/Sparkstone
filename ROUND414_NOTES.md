# Round 414

This round covers your city review, items 2, 3, 4, 4.1, 5 and 7. Items 6 and 8.3 (streets, alleys and districts) come in round 415. Items 8.1, 8.2, 8.4, 8.5 and 9 (props, the market, wandering people, slums and wagons) come in round 416.

## Lamps (item 2): 75% fewer, outside Cadence

The city lamps stand on a lattice. Round 356 kept half of it, as a checkerboard. Cadence keeps that. The other five cities now keep a quarter of the checkerboard, every other point on every other row and column, so the lamps that are left are still spread evenly.

Lamps placed, measured in the running game:

| City | Round 412 | Now |
|---|---|---|
| Harrowmoor | 673 | 176 |
| Karsk Landing | 918 | 255 |
| Vashra | 1,272 | 318 |
| Tolbrand Quay | 171 | 49 |
| Slagward | 109 | 35 |
| Cadence | 588 | 588 (unchanged) |

## Karsk Landing portal (item 3)

The ring of eight giant stones around the portal is gone. The paved square under the portal stays.

## Wall corners (item 4)

Every city's wall now has your corner tower at each of its four corners, Cadence included. The walls running into a corner now stop 2.5 tiles short of it, so they meet the tower instead of crossing in front of each other.

**Which rotation goes where.** I used the eight-frame GIF you sent after the first file, which had been missing the north-west angle. I tried all eight rotations at every corner in the running game and kept the one that lines up with the two walls there:

| Corner | Where it is on screen | Rotation (GIF frame) |
|---|---|---|
| North-west | Top | 2 |
| North-east | Right | 6 |
| South-east | Bottom | 7 |
| South-west | Left | 8 |

**How each tower is placed.** It stands where the near faces of its two walls meet, which is the same spot at all four corners.

**Things you may notice:**
- The towers are your art's own colour, which is a little warmer than the wall stone.
- The north-west tower stands at the back of the city, so it sits mostly behind its two walls.

## Walls and gates 15% smaller (item 4.1)

Everything about the wall and gate size comes from one factor, which goes from 0.80 to 0.80 × 0.85. That covers the stone scale, the gate arch scale, the gap the gate leaves, the jamb spacing and each stone's ground footprint. The gate arches still fit their openings.

## Parks halved (item 5)

| City | Parks before | Parks now |
|---|---|---|
| Harrowmoor | 7 | 4 |
| Karsk Landing | 10 | 5 |
| Vashra | 13 | 7 |
| Tolbrand Quay | 2 | 1 |
| Slagward | 2 | 1 |

The two small cities used to be guaranteed one park in each of two districts, so they could not go below two. Now the guarantee is one park per city.

## Temples grouped (item 7)

The eight temples used to be spread as far apart as their district allowed. Now they gather near the district corner closest to the plaza. Each one goes on the nearest free spot that leaves at least 10 clear tiles between it and every other temple.

- **Spacing.** In the game, the closest two temples in every city are 12 clear tiles apart.
- **Where they are.** The spread from one temple to the farthest other is now:

  | City | Before | Now |
  |---|---|---|
  | Harrowmoor | 133 | 65 |
  | Karsk Landing | 132 | 64 |
  | Vashra | 133 | 89 |
  | Tolbrand Quay | 100 | 59 |

  In Slagward, one temple doesn't fit in its small district at that spacing, so it stands in the nearest housing block. Its spread went from 66 to 73.
- **Freed blocks.** The district blocks the temples no longer need are houses now, kept at least 6 tiles clear of any temple.

All eight temples stand in every city.

## What was checked

**Here:**
- `test_round414` passes.
- `test_round413` and `test_syntax_all` pass.
- The old suites' version checks now accept 414.

**In the game (headless browser):**
- Lamp, park and temple counts, temple gaps, and four corners in every city.
- No page errors.
- Close-up pictures of all 24 wall corners and one gate in each city: `r414_corners_and_gates.jpg`.
- The Karsk Landing portal, and the gathered temples in Harrowmoor, Karsk Landing and Slagward: `r414_portal_and_temples.jpg`.
- A full reshoot of every city (the City-Review sheets) was started and stopped partway. It takes over an hour, so it will be redone after round 415.

**Not checked:** your own build.
