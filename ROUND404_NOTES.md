# Round 404

**Standing rule (unchanged):** confluence essences ARE essences. Anything that covers essences covers the 102 confluence essences too.

## Absorbing an essence or a stone

Pressing **Absorb** on an essence or **Socket** on an awakening stone now closes the inventory and plays the absorption over your character. You're held still and can't be hurt while it runs, and the inventory won't reopen until it's done. The bond is made when the animation ends, so the pages saying what you gained come after it.

**One essence or stone (3.6 s for an essence, 3 s for a stone):**
1. Its icon rises over your head in its own colour, with a column of its light down to you and a ring at your feet.
2. A motif set by its family plays around it:

   | Family | Motif |
   |---|---|
   | Fire, light, storm, force | A burst of rays |
   | Water, aquatic, cold | Spreading rings and falling drops |
   | Earth, guard, craft, order, bludgeon | Circling shards |
   | Blades, polearms, ranged, motion, air | Streaks flying in |
   | Life, alchemy | Petals |
   | Death, dark, blood, mind, space, identity | An inward dark swirl |
   | Beasts, small beasts, fliers, serpents | Spiralling motes |

   The colour and the pattern vary across all 148 essences and every stone, so no two look quite alike.
3. It sinks into your chest with a flash and a ring.

**The third essence (5 s):**
1. Your three essences circle you, faster and faster, then plunge into your body with a flash in their three colours.
2. Your confluence's icon appears above your head with its name for a moment, then goes in.
3. It goes straight into the rank-up aura and the black goo.

The "Essence Absorbed" and "Iron Rank" pages, and Knowledge's remark, wait until the goo is done.

## No more libraries: bookshops

**Cadence's library is now a bookshop.** Each other city, plus Little Gale, has one too, in a shop-fronted house near its middle. There are seven in all, each with its own name and lettered sign:

| Town | Bookshop |
|---|---|
| Cadence | Inkwell & Quill |
| Harrowmoor | Folio & Fable |
| Little Gale | The Cracked Binding |
| Karsk Landing | The Turning Leaf |
| Vashra | Vellum & Vine |
| Tolbrand Quay | The Last Chapter |
| Slagward | Bookworm's Nook |

The door reads "enter <name>".

**The sign:**
- Hanging signs (bracket, beam or chain) go on the shop's wall beside the door.
- Post signs stand on their own a step out from it.
- Every sign is placed by its foot.

**Inside:**
- Five bookshelves along the back wall and two down the side wall, each facing out from the wall it stands against. South-west designs are mirrored for the side wall.
- A counter, with the bookseller behind it selling the skill books the library sold.
- A reading desk, a lectern, a rug and a chair.

Books can still be read here, in the bookshop's reading corner, as they could in the library.

**The Magic Society halls** have six bookshelves each, where the four scroll stands were and down the west wall.

Each shelf blocks a rectangle covering its footprint. Interior collision can now take a rectangle as well as a disc.

## Signposts

The arrow signposts stand at crossroads in every city and town that has somewhere to point to: 120 in my test world.

**Placement:**
- At each crossroads, up to three signs point to the three nearest destinations. Destinations standing right at the crossroads aren't signed.
- One post goes on each corner, so the boards never cross. The corners nearest the camera come first, so a house doesn't hide them.
- They stand just off the paving and never on a doorstep.

**What they point to:** the Adventurer Society, the auction house, the Magic Society, the inn, the stable and the temple district, whichever exist in that town. **There are no "Library" signs**, because there are no libraries now.

**Which arrow:** each sign uses whichever of its six arrows (east, west, NE, NW, SE, SW) is nearest the bearing on screen from the sign to its destination.

**Design:** painted boards on iron posts in the cities; oak boards on wooden posts in Little Gale and the bandit towns.

**Collision:** a small rectangle on the post only.

The blank boards and the bare posts are shipped too, for any later sign.

## Walls

**Seams.** The wall pieces now stand one run-face apart, edge to edge, so the seam between two pieces only just shows instead of overlapping. Each run is laid from its start at exactly that step, with the last piece at the run's end, so only that last piece overlaps.

**Ground at the walls.** The city's brick now runs in under the base of its walls and stops there:
- **Before:** there was a strip of brick outside the wall on the south and east sides, and a strip of grass inside it on the north and west.
- **Now:** inside the walls is brick right up to the base; outside is the surrounding country.
- **Where the base is:** read off each side's own stones.
- **Left as they were:** gates, roads and parks.

## Road ramps

Where a road crosses one of the Nek's steps, its ramp is now exactly the road: from the road's first tile to its last, no wider, no narrower. Before, a ramp could be shifted two tiles to one side when something stood beside the road, which left half of it on the grass.

One interpretation to flag: the steps up a ramp are drawn per tile, so each tread is a tile deep. I read "smaller sections" as each flight cut to the road's own width. If you meant finer steps within a flight, say so.

## Smaller fixes

- **Night sky:** at night (22:00–05:00) fair weather reads "✦ Clear skies" instead of "☀ Sunny".
- **Shop tooltips:** hovering a piece of gear in a shop shows the same card the inventory does: its stats, effects and rank, and how it compares with what you're wearing. A weapon on the rack shows its weapon card.

## What was checked

**Here:**
- `test_round404` (26 checks) passes. It covers:
  - the night label and the shop tips;
  - the absorption lengths and that every family has a motif;
  - that the confluence sequence leads into the rank-up and the goo, with the pages held;
  - every prop file being shipped and placed by its foot;
  - the arrow directions, with no Library signs;
  - shelf facing and collision, and post collision;
  - the wall step and the brick-to-base pass;
  - road ramps.
- `test_round403`, `402`, `401`, `359`, `355`, `356`, `344_misc`, `267`, `393_wind`, `328` and `137_walls` pass.
- `test_round254` has three failures: the guild's footprint corner and width, and doorsteps sealed (28 against a bar of 22). I haven't confirmed whether they were already failing before this round. Keeping the new signs off doorsteps didn't change the count.
- `test_syntax_all` passes (577 modules).
- `GAME_VERSION` reads 404.

**In the game (headless browser here, screenshots):**
- **Absorption:**
  - an essence, a stone and the confluence sequence, captured frame by frame;
  - the bond made after the animation;
  - the rank-up and the goo after the confluence, with the pages held until the goo.
- **Bookshops:** seven placed, each with its sign. Inside Cadence's: seven shelves, the bookseller and a browser.
- **Magic Society hall:** its shelves.
- **Signposts:** one per corner.
- **Walls:** the brick and grass across all four sides of Harrowmoor's wall, by tile dump.
- **Road ramps:** aligned to the road (in this world 9 were misaligned before, 4 after, and the 4 left are road corners).

**Not checked:** your own build.

## Next

- The Magic Society specialty chains for the nine theories and the Division arc, with the corrected soul chain: a Society official wants the device, and the soul trap belongs to an undeath cult, not the Order of the Reaper.
- Companion martial arts.
