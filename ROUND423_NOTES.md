# Round 423 — lava and magma

You asked for the same kind of work on lava and magma that water got. Lava now uses the round-393 water system:
- the same shoreline field and baked edge cells;
- the same world-tiling surface sheet;
- the same pooled effects.

It has its own look and behaviour, described below.

Lava used to be the old animated tile with a red light on it. It is now:
- a crust of dark plates with glowing cracks between them;
- a molten edge that creeps in and out;
- a scorched bank around it;
- crust drifting downstream on the rivers;
- bubbles that pop and throw sparks;
- embers rising off the surface.

## 1. The surface

`public/assets/water/lava.png` is the molten sheet. It is 2048×1024 and uses the water sheets' layout: 8×8 tiles of world period and 16 frames of loop. It is made by `tools/make_lava_r423.py` (run `python3 tools/make_lava_r423.py .`).

- **Crust plates.** About 1.3 plates a tile. Each plate drifts on its own small loop, so neighbouring plates grind against each other and the cracks between them open and close.
- **Cracks.** Each crack has a white-yellow core, then orange, then a red-hot rim on the plate edge. Their width wanders and they breathe with each plate's phase.
- **Crust.** Dark basalt with a red undertone that varies by plate, plus a fixed speckle.
- **Warping.** The whole field is warped, so plate edges wander instead of running straight.
- **Seams.** Each cell carries a two-pixel gutter, so tiles join with no grid lines at any zoom.
- **No open pools.** There are no open molten plates in the crust. In an 8-tile sheet they repeated as a visible grid of bright patches. The melt shows in the cracks and at the edge instead.

The sheet steps every 300 ms, so the crust grinds slowly. Lava is never tinted by the sky and is not dimmed at night: it gives its own light.

## 2. Pools and flows

In the Cinderwaste, `water.js` now sorts the molten tiles into two kinds:
- **`lavaPool`** for the lakes;
- **`lavaRiver`** for the rivers, which carry their flow direction.

Both kinds have:
- **Bands.** A depth ramp from black crust at the edge to yellow-white at depth, shown under the crust near the shore.
- **Bank.** About 1.2 tiles of scorched ground: obsidian, then basalt, then ash. Small glowing embers are scattered in it.
- **A creeping edge ('creep').** The molten front pushes out and draws back slowly. Ground it has just left is orange and cools to dark as the front retreats. A bright lip runs along the front, and a thin seam glows just behind it.

Pools breathe on a 6.4 s cycle and flows on a 4.8 s cycle.

The crust reaches nearer the edge than water's ripples do, because the edge is the coldest, most crusted part.

## 3. Effects

These are pooled sprites, as for water, and are only placed on lava you can see.
- **Floes.** Crust plates ride the flows downstream at the river's speed, up to 48 at a time.
- **Bubbles.** They swell and pop on open lava, and each pop throws sparks. Up to 36 at a time.
- **Embers.** Sparks rise and fade off the surface. Up to 90 at a time.

The existing lava lights and lava burn are unchanged.

## 4. Magma in the vents

Magma caves (`magmaCave` in `dens.js`, now `magma: true`) get two or three magma pools in the floor, each 6–11 tiles. They use the same baked edge cells, crust sheet, bubbles and embers as outdoors, and each pool gives off a warm light. The pools follow these rules:
- They keep clear of the entrance and of the spot where the monsters stand.
- They never cut off any part of the floor.
- They are solid: you walk round them.

Vent walls now use the Lava Rock kit everywhere. A vent in Elehyd is no longer an ice cave.

## 5. Fixes

- **Every cave threw on entry (round 422 regression).** Round 422 passed `room.caveWalkable` without its room, so it failed with "Cannot read properties of undefined (reading 'caveFamily')" as soon as you entered any cave. It is now called on the room.
- **Den props outside the cave.** Props could be placed on tiles outside the cave's floor shape and were drawn in the void. They are now limited to walkable cave floor.

## What was checked here

- **In-game shots** (no page errors):
  - a Cinderwaste lake close up and wide;
  - two stretches of lava river;
  - two magma vents. One had 23 magma tiles with 8 lights; den_12 is smaller and got 6.
  - Seams were checked at 4× zoom with the static cells and the surface each hidden in turn.
- **Inside a vent:** a probe confirmed the update runs and spawns bubbles and embers in the room's own context.
- **Tests:** `test_round423` passes. The earlier round tests' version checks now accept 423.
- **Not checked:**
  - Your build was not run from here.
  - Night shots of the lava were not reliable in the headless probe (it renders an empty frame), so the night look was not seen.
  - The 8-tile repeat of the crack pattern can still be picked out on a very wide lake if you look for it, but it no longer forms a grid.

## Art that would still help

- A lava fall or cascade piece for where a flow drops a level.
- A cooled-crust "stepping stone" prop for vents, so a pool can be crossed in places.
