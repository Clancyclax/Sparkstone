# Round 420: the 92 new houses

The brief: put the user's south-west-facing houses (`new-assets\houses\houses.zip`) into the house pool. Size every one so that its door matches the existing houses' doors. Make 8 colour variations of each. Choose styles by region. Keep cabins, tree houses and stilt houses out of cities. Collision is a rectangle that keeps the door side clear. Then update the houses in every region.

The zip holds **92** houses, not 90. Two of them are the manifest's "bonus variant" entries, `gr_cube_b` and `rom_extra`. `houses_review*.png` is not shipped.

## What changed

**Art.** There are three sheets, `public/assets/houses420_0/1/2.png`. Each row is one house and the 8 columns are its colourings. Column 0 is the art as drawn. The sheets are 1024 × 3968 or smaller, so they stay under the 4096 texture limit that some GPUs have.

- **How the colourings are chosen.** The packer finds the roof by flooding out from the top of the drawing through the roof's own colour. Then it recolours it with a palette that suits the surface:
  - tile and slate roofs get the pool's established palettes (slate blue, forest green, sandstone, wine red, mossy teal, charcoal, ochre, terracotta, plum), dropping whichever one is closest to the roof as drawn;
  - thatch stays straw-coloured;
  - turf stays green or brown;
  - brick and painted walls get muted brick and paint colours;
  - whitewash gets pale pastels.
- **The stilt fisher's nets** had a transparency checkerboard baked into them. It is cleared.
- **Mirrored copies.** A mirrored copy of each sheet is built in memory at load, with each cell flipped in place. The user's art was itself mirrored from a south-east render, so neither side is lit wrong. This lets a door that was drawn on one face serve a road on the other side.

**Door-matched size.** Every door is now 58.5 screen px tall, the same as the old pool's.

- I measured the old pool's doors on 6× contact sheets. Rows 0, 6, 17, 22, 27 and 32 come to 20–28 px, with a median of 23 px. At the pool house scale (3.14 × 0.9 × 0.9) that is 58.5 screen px.
- I read each new house's door base and height by hand off the same kind of sheet. They are in `tools/houses_r420/doors.json`.
- Each house draws at 58.5 ÷ its own door height, which comes to 1.89–3.66 per art px.
- Most new houses come out at the old houses' size or a little larger (230–340 px wide). The tall town houses come out tallest, because their doors are drawn smallest.

**Placement: one hook.** Every generated dwelling goes through `_placeTownBuilding`, which now asks `_h420Swap` (in `src/scenes/houses420Mixin.js`) what to build. The placers covered are:
- Cadence's outline houses, infill and terraces;
- settlement lots and town lots;
- the grid cities' blocks, dense terraces and festival rings;
- the city-life infill.

Because the swap happens at placement, every later rule sees the new drawing: the road snap, the site checks, the wall sweep, the footprint fit and the doors. The rules themselves are in `src/data/houseStyles420.js`.

- **Settlement size tiers:**
  - **city**: walled cities of radius 40 or more (Cadence, Harrowmoor, Karsk Landing, Vashra);
  - **town**: other cities and towns, the bandit cities included;
  - **village**: villages and hamlets;
  - **rural**: houses that belong to no settlement.
- **Styles by region and tier:**

| Region | Cities | Villages and country |
|---|---|---|
| The Nek | victorian, georgian, tudor, medieval, gothic, regency, baroque | medieval, tudor, crofter, celtic, dutch, a little halfling and elven |
| Ontaria | victorian, dutch, georgian, gothic | norse fishers, dutch, medieval, crofters, lake houses |
| Elehyd | alpine, dwarven, gothic, slavic | alpine, norse, Russian izba |
| Bratugal | indian, chinese, japanese, moorish, persian, byzantine | swamp shacks, stilt houses, lake houses, tree houses |
| Sirukh Sands (the warm south) | greek, roman, moorish, egyptian, riad | greek, desert adobe and dome, egyptian |
| Cinderwaste | dwarven, gothic, medieval, watchman | (same) |
| Ixcuatl | spanish, hacienda, portuguese, italian | (same) |

- **Lightly magical houses** have a small weight in each region, and each settlement (or each region's countryside) gets at most one in 14 of its new houses.
- **No two identical houses side by side.** A model never stands within 20 tiles of another of the same model. An old pool row never stands within 9 tiles of the same row.
- **Never in a city or town:** cabins and log huts (alpine hut, Russian izba, Norse stave), tree houses, stilt and lake houses, swamp shacks, and the round, turf and mound houses. These are rural or village only. The tall town houses are city-only.
- **The widest houses stay out of the packed streets.** A city or town lot takes a house up to 340 px wide, and a dense terrace or infill lot up to 285 px. The old pool's houses are 230–300 px, and every lot was laid out for them.
- **Which way a house faces.** A house asked to face south-west, south-east or south gets a new drawing on the matching side.
  - A house asked to face up-screen (north-east, north-west) keeps the old pool's 8-direction art, because these drawings have no back door.
  - It is re-picked from a pool family that suits the region (roman and greek in the south, stone in the north) and that its neighbour isn't using.
- **Shop fronts are untouched.** The `sign_*` rows are where the bookshops are chosen from.

**Cabins out of cities.**
- A city or town lot no longer takes the structure pack's cabin, only the brick house.
- The Elehyd snowy cabins scattered along the roads had landed inside Karsk Landing at each road's end. They now skip a city or town.
- City-life outbuildings are farmhouses only, not shacks.
- The bandit cities' dark-church shack (round 300, the user's own ask) stays.

**Villages.** A village used to be built entirely of the structure pack's cabin and brick house. Now 70% of its lots go to the house pool, where the region's new houses are chosen, and 30% keep the cabin or brick house.

**Doors and collision.**
- `ART_DOORS` has an entry for each sheet and each mirrored sheet: one door pixel per row, plus the face it is on. A new helper, `artDoorFacing`, makes the doorstep step out from the face the door is drawn on.
- Collision is the existing per-art rectangle fit (`_artFootprint`, read off the real pixels, so the mirrored copies are measured as drawn). Every doorstep is kept clear by the existing clearance passes, so there are no circles.
- Interiors get a floor count per house (1–3, read off the drawing), so a three-storey townhouse has its stairs.

**What the new houses don't get:** the old pool's chimney smoke (rows 32–36) and lit-window night sheet. Both are keyed to `townPool` rows.

## In-game census (headless, this build)

These counts are dwellings only; the 882 shop fronts are not in them.

| Region | New houses | Old pool houses | Leading styles |
|---|---|---|---|
| Bratugal | 561 | 187 | indian 179, chinese 105, moorish 63, japanese 58, persian 51 |
| Cinderwaste | 17 | 16 | watchman, dwarf, medieval, roman, gothic |
| Elehyd | 312 | 150 | medieval 73, dwarf 58, alpine 57, gothic 48, watchman 31 |
| Ixcuatl | 12 | 11 | spanish, hacienda, portuguese, stilt, swamp, italian |
| The Nek | 253 | 188 | medieval 107, tudor 58, celtic 24, victorian 14 |
| Ontaria | 198 | 165 | victorian 52, dutch 48, tudor 26, gothic 19, georgian 18 |
| Sirukh Sands | 38 | 30 | greek 10, roman 9, spanish, riad, egypt |

- **1,391 new houses** use 75 of the 92 models. 747 old pool houses remain: the up-screen ones and the share each region keeps. 47 houses (3.4%) are lightly magical.
- **No two of a model within 8 tiles.** The rule is 20 tiles. A few pairs at 15–19 tiles come from houses nudged after placement.
- **None of the never-in-a-city models stand in a city or town.**
- **1,390 of the 1,391 new houses have a door.**
- **17 models were never placed.** They are the widest houses, kept out of cities, and the rural-only ones that the regions' few villages didn't draw.

## Checked here

- Every one of the 92 doors was drawn on its art and checked (base dot and height bar).
- Shots of Cadence, Vashra (dense blocks), Karsk Landing, Tolbrand Quay, Sailmend, a Bratugal hamlet and the Nek countryside, with collision rectangles and doorsteps overlaid.
- An old house next to a new one shows doors of the same size.
- Tests:
  - test_round420 (34);
  - test_round413–418;
  - test_round407 and test_round373;
  - test_round328 (3,933);
  - test_syntax_all (605 modules).

## Not checked

The user's own build was not run.
