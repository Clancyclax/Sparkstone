# Round 421 — house interiors

This round works through the eight fixes in the report *Sparkstone house interiors: making a believable living space*, using the new interior art from `new-assets/interiors/`.

## The new art

- **16 props:**
  - futon, low table, paper screen, charcoal brazier, floor cushions
  - joiner's workbench, loom, nets and creels, corner anvil, writing desk, jar shelves
  - unmade bed, laid meal table, laundry line, cradle, dog bed

  They are appended to `interior_props.png` after the old 109 cells. Each object's `anchor_bottom_centre` is seated on the cell's foot point (40, 79), so they stand exactly like the old props. Each has a small footprint collision. The atlas now holds 135 cells (640×1360).
- **10 recolourings** for variety:
  - futon in indigo and rust
  - pale low table
  - dark paper screen
  - floor cushions in green and ochre
  - unmade bed in blue and green (the frame keeps its wood)
  - dyed washing on the laundry line
  - painted cradle
- **3 wall kits:** `kit_whitewash`, `kit_tiled` and `kit_darklog` were added to `buildingKits.js` as materials with no other change. The pack script asserts that their alpha matches `kit_greybrick` cell for cell.
  - Whitewash: Greek, Roman, Mediterranean, Moorish, Indian and Japanese houses.
  - Glazed tile: Moorish, Persian and Portuguese houses, and the bathhouse.
  - Dark log: Norse, Slavic and alpine houses.
- **Tatami:** `interior_floor_tatami.png`, with its two tiles alternated in a checkerboard. It is registered as a 128 px ground cell. Without that it drew as black triangles.
- `*_review.png` and `objects_review.png` are not shipped.

## The eight fixes

1. **Trade and class per household.** A house's first resident takes a local trade:
   - a fisher near water
   - a weaver, carpenter, smith, herbalist or apothecary by region

   The house's class (poor, modest or well off) sets the clutter and the table.
2. **Interior by culture.** Each house style maps to a culture, which sets the walls, floor, stove or hearth, bed and table.
   - Japanese houses and the Korean hanok get tatami, futons, a low table with cushions, a charcoal brazier, a scroll, and paper screens instead of masonry.
   - Norse houses get dark log. Moorish houses get glazed tile and marble. Greek, Roman and Indian houses get whitewash and marble.
   - Trade buildings get their trade piece: a loom, a workbench, nets and creels, an anvil, a writing desk or jar shelves.
3. **Room size from the house.** A small house drawn outside is 9×7 inside, a standard one 11×9, and a large one 13×11. The interior pool rooms are now laid out at the largest size, and each house stamps its own.
4. **A centre group.** Every room has a table group in the middle: a rug, a table and chairs, or a low table and cushions. A large room also gets a sitting corner on its far side (a rug, the rocking chair and a footstool).
5. **Clutter.** Three or four small things stand along the walls, chosen by class. A room never has more than one fine vase; earlier shots had rows of porcelain and glass that read as a shop.
6. **The clock.**
   - At meal hours the table is laid.
   - In the morning the beds are unmade.
   - Residents go to bed at night, to the table at meals, to the stove in the morning and evening, and to their work by day.
7. **Residents on the furniture.** Each dressed room records spots for bed, table, stove and work. A resident is placed on the spot the hour sends them to, facing the furniture.
8. **Windows and inner doors.** Inner walls have doorways. There is no window art yet; see *Art still wanted* below.

**Walled rooms.**
- On the ground floor, one corner (north-east or north-west) is walled off as a bedroom in a one-storey house, or as a work room or larder in a taller one.
- Upstairs there are two walled bedrooms. A three-storey house instead has one bedroom and a stair up to the attic.

**Inside walls meeting the outer walls.** This was the gap you saw in the bedroom walls. The kit's wall face stands 18 px of its 48 px tile edge inside the tile, about 0.375 of a tile. The thin partition pieces were drawn at the tile's edge, which put every bedroom wall slightly too far down and off the line of the outer wall. Each piece is now drawn back onto its own line, so:
- a side wall runs straight into the back wall's face;
- the front wall meets the side wall at the shared corner;
- the first piece of a run that starts on an outer wall is cut at that wall's face rather than standing through it.

**Outdoors.** About one house in seven (not dense blocks or slums) has a washing line beside it. The lines are never placed on the road, and their posts block movement.

## What was checked here

- A 20-room reshoot was taken across the regions at different hours, plus close-ups of the wall joins on the ground floor and upstairs.
  - The walls meet the outer walls and each other with no gap.
  - Tatami draws correctly.
  - Japanese rooms have screens and futons.
  - The Norse longhouse has dark log walls, and the Moorish house has tiled walls.
  - The page showed no errors.
- `test_round421` passes, and the earlier round tests' version checks accept 421.
- The pack script checks the kit alpha and the atlas layout.
- **Not checked:** your build was not run from here.

## Art still wanted

- **Windows:** wall pieces with a window, to match the kit (all 5 materials). This is fix 8 of the report.
- **Inner doors:** a door leaf for the partition doorways, open and shut.
- **Lighting and small clutter:**
  - candles and a candlestick
  - an oil lamp
  - cups and bowls on a table
  - a stack of books
  - baskets
  - a broom
  - a chamber pot or wash jug and basin
- **NPC poses:** sleeping (lying) and seated poses. Residents now stand at the bed or the table; a pose would put them in it.
- A round-room floor for the Celtic roundhouse.
- A Korean ondol floor and a bandaji chest, if the hanok should differ from the machiya.
