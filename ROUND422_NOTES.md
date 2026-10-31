# Round 422 — windows, tabletop things, seated and sleeping residents, the roundhouse

This round brings in the art from `new-assets/interiors2/` (interiors2.zip, listed in interiors2.json). `review/` was used for reference only and is not shipped.

## 1. Windows

`kit_<material>_windows.png` comes in nine materials: greybrick, greenbrick, darkstone, ice, lava, log, whitewash, tiled and darklog. The files are copied unchanged.

The pack script checks each cell's silhouette against the wall piece it replaces in that material's kit sheet: piece 1 for a north wall, piece 2 for a west wall.

`buildingKits.js` lists the six window pieces in `KIT_WINDOW_PIECES`:
- square, arched and shuttered;
- each in a north and a west version.

Each piece has the same solid flag and radius as the wall it replaces, and `buildingKitFaults` checks this.

**In houses.** Every dressed house turns some of its back-wall pieces into windows: about one window per 3.5 pieces, evenly spaced, never two side by side. A window never goes:
- on the room's back corner;
- where an inside wall meets the back wall;
- behind a stair;
- behind a stove, fireplace, shelf, loom or screen standing against that wall.

There is no doorway on a house's back runs. The front runs (south and east) have no wall art at all, so a window never lands on the doorway run.

**Style by culture.** One style per house:
- arched for Mediterranean, Moorish and dwarf houses;
- shuttered for rustic, Norse and Celtic houses;
- mostly square for town houses.

About four sills in ten have something on them: a potted herb, dried flowers, or a candle (lit after dark).

## 2. Small props

The 64 tabletop items are packed into one atlas, `props_small.png` (32 px cells). Each is placed by its bottom-centre anchor, has no collision, and is drawn at half size so a cup is about hand-sized beside a person.

**Where they go.** On:
- tables;
- nightstands;
- sideboards;
- low tables;
- the laid meal table, which gets a light and a drink at night.

Each is placed on the furniture's top surface, measured from the drawn art.

**What goes there depends on:**
- the hour: a light after dark;
- how well off the household is: a candelabra, goblet or pocket watch, or a candle stub, dice cup or wooden cup;
- the culture: a teapot and tea cups at a low table;
- the trade: mortar and potions for a herbalist, quill and sealed map for a scribe, tool box for a carpenter or smith, yarn for a weaver;
- the household: a toy horse in a family house.

**Light.** Lit candles and lamps give a small warm light, and so does the roundhouse hearth. Interiors are never darkened, so this shows as a soft warm glow around the flame rather than a pool of light in the dark.

## 3 and 4. Seated and sleeping residents

The poses for the ten resident looks are in `public/assets/poses/`. Each look has its `_v1` and `_v2` recolours (townsman also `_v3`/`_v4`, priest_f the god robes), made with the same colour map as their walk cycles: read off the idle pair, then replayed onto the pose.

As a check, that map replayed onto the base walk reproduces the shipped `_v1` walk at 94–100% of pixels for every look.

**Residents in dressed houses now wear these ten looks.** This replaced the five other town looks they used before, which have no poses. One result: there are fewer looks for women (the peasant girl and the adventurer, plus the noblewoman in well-off houses), so a household of women can look alike.

**Seated.** A resident given a chair, stool, bench or floor cushion is placed on it, facing the table. Chair backs layer correctly:
- behind someone facing away from the camera's side;
- in front of someone sitting with their back to the camera.

People sit:
- at meals;
- often by day (about half the time when a seat is free);
- at night if there are more people than beds.

**Sleeping (22:00–06:00).** Residents lie on beds whose headboard is on the far side, using the cell for the bed's direction. This covers made beds, the unmade bed and futons. posh_noble_girl has no lying pose, so she stands by the bed or sits.

**Multi-storey houses at night.** The household sleeps upstairs. One person is still up downstairs late in the evening. In a three-storey house with three or more people, the last one sleeps in the attic.

Each floor's people are placed when you step onto it, by the stair or coming back down. A sleeping resident only says they are asleep.

## 5. The roundhouse

Celtic roundhouse interiors are one round room, 7 tiles across (5 for a small house), using `interior_floor_roundhouse_448` or `_320`. Under it the floor tiles are drawn as nothing, so no square tiles show. The circle is walkable and ringed with colliders. There are no straight walls and no windows.

**Layout:**
- the hearth in the middle, as drawn in the floor art, with a warm light, rising smoke and a collider;
- beds at the back;
- two stools by the fire;
- the trade piece and stores round the east side;
- a cradle in a family house;
- the doorway side kept clear.

## What was checked here

- **In-game shots** (no page errors):
  - A 20-room sample across regions and hours (morning, midday, afternoon, evening, night).
  - Close-ups of residents seated at tables, lying in beds and lying upstairs at night.
  - The roundhouse by day and by night.
  - A lit night close-up showing the candle glow.
  - Windows appear in every dressed rectangular room (5–7 per room), in the room's material and the house's style.
- **Tests:** `test_round422` passes. The earlier round tests' version checks now accept 422.
- **Packer checks:** window silhouettes, atlas and pose sheet sizes, and the walk replay.
- **Not checked:**
  - Your build was not run from here.
  - korean_hanok still has no placed house in this world, so its interior was not seen.
  - The lying poses for grizzled_adventurer and muscular_adventurer were delivered "as generated" (not along the iso axis). They are used as they are and read flatter than the others.

## Art that would still help

- More women's looks with seated and lying poses, so a household is not three of the same person.
- A seated pose for a floor cushion (legs crossed). The chair pose works at a low table but reads as perched.
- Inner door leaves for the partition doorways.
- A round wall or eaves ring for the roundhouse (it currently ends at the floor's stone kerb).
