# Round 136 — the editor sees the world, and hand-placed flora finally draws

Two commissions: "I need the map editor completed", which turned out to mean
rebuilding work that no longer existed; and "I want to be able to place walls,
buildings, barns, gates, and everything else", which uncovered two bugs that
had been shipping for rounds.

**This round DID change the game**, unlike round 135: three files under
`src/`, plus the data lane.

---

## 1. The round-135 work was gone, and the archive was older than the Desktop

Round 135's handoff said its finished editor lived in a sandbox path.
Sandboxes do not persist. What survived: the Desktop copy (210,499 bytes, real
iso ground + buildings) and the r134 archive (186,855 bytes, flat schematic —
not even round 135's first commission). The rebuild was done on the **Desktop**
copy, not the archive, which would have thrown away the first commission too.

**The lesson:** the archive a round is handed may be OLDER than the working
copy. Check byte counts and grep for feature markers before choosing a base.

---

## 2. `castle_wall` was gating 1,992 of the world's 2,611 buildings

The editor's building count came back 619 against round 135's 2,611. Found by
flipping each missing texture key true one at a time:

```
baseline buildings: 619
keys that CHANGE the count when present:
  castle_wall           +1992
```

619 + 1,992 = 2,611 exactly. `castle_wall` and its two variants are preloaded
in a **loop** over `CASTLE_WALL.variants`, so a regex matching string literals
never saw them — and `_buildCityWalls`, `_buildOutlineWalls` and
`_buildCitySquareWall` **all** early-return on
`textures.exists(CASTLE_WALL.variants[0])`.

Only **226** of the 1,992 are visible stonework. The rest are
`{ sprite: null, wallCollider: true }` bodies closing the gaps between stones,
which the game draws nothing for. **An amber "missing art" marker is the right
default for a sheet that failed to load and the wrong one for a record that was
never meant to have a sheet.**

## 2b. And the editor was reading the wrong list entirely

Reported: "walls still are not visible around most of the settlements. Weirdly
little gale seems to actually display the walls." The exception named the
cause. There are two wall builders:

- `_buildCityWalls` (the polygon ring, which a **town** like Little Gale gets)
  pushes each stone to **both** `this.buildings` and `this._cityWalls`.
- `_buildCitySquareWall` and `_buildOutlineWalls` (which the **cities** get —
  Cadence, Harrowmoor, Karsk Landing, Vashra) push to `_occludables` and
  `_cityWalls` **only**, putting nothing but invisible collider bodies into
  `buildings`. Their own comment says why: *"radius 0: this entry is the ART
  and the fade target, and it no longer carries the barrier."*

So an editor reading `buildings` sees a town's walls and none of a city's.
Measured: 226 stones that way against **1,505** in `_cityWalls`. Now read from
`_cityWalls`, which all five push sites write to: Cadence 74, Harrowmoor 341,
Karsk Landing 401, Vashra 463, Little Gale 114, Tolbrand Quay 112.

---

## 3. `structures_xl.png` — a filename bug that had been shipping

The editor probed **`structuresXl.png`**; the file is **`structures_xl.png`**.
So `textures.exists('structuresXl')` was false and **all 29 XL models drew as
amber diamonds** — `gate`, `cabin`, `brickhouse`, `blacksmith`, `armorsmith`,
`aperture` and variants. Nearly half the placeable roster, including the gate.
Fixed by reading the key→file table out of WorldScene's own `load.spritesheet`
calls rather than typing it.

---

## 4. GAME: hand-placed flora is consumed (`_buildFlora`)

`PLACED_KINDS.scenery.families` has listed `'flora'` since round 107 and
`placedFaults` validates it, but `_placedOfKind('scenery')` had exactly two
consumers — `'tree'` in `_buildForest` and `'rock'` in `_buildObstacles`.
**A hand-placed clump validated, saved, reloaded, and was silently ignored.**

**It cannot join a generated list, because there isn't one.** `generateFlora`
is a pure function of the grid cell, computed for the camera box and never
stored, so Elehyd's ~78,000 plants cost nothing. `this._placedFlora` is the
only flora state the scene holds, and `_updateFloraViewport` unions it in.

Placed clumps are **not** passed through `_floraBlocked`, which refuses
non-desert regions outright and thins against the desert band's hash — every
one of which would reject the tile somebody chose.

A confirmation of the gap: `regions.js` has shipped one `scenery` tree and one
`scenery` rock since round 107 "so the feature arrives with something a person
can look at" — and **no flora**, because nothing consumed it.

---

## 5. GAME: a wall segment can be placed by hand (`_placeWallSegment`)

- `structureManifest.js` gains **`STRUCT_WALL_ROW`** (`wall`, `wall_v1`,
  `wall_v2`), indexing `CASTLE_WALL.variants` — each variant is its own
  8-column sheet, not a row in a shared atlas.
- `_placeWallSegment()` builds the record `_buildCityWalls` builds, field for
  field. Deliberately **not** a call into `_buildCityWalls`, which lays a whole
  ring and refuses a stone sitting on one already laid — rules for deciding
  where a *generated* segment goes.
- **The variant comes from the key, not a roll.** Somebody placing ramparts one
  at a time is building a specific line; a rolled variant would shimmer on
  reload.
- **No door**, which is why it cannot share `_placeStructure`.
- `tools/data_checks.mjs` unions `STRUCT_WALL_ROW` into `STRUCTURES`.

---

## 6. The editor can now see, move and delete what the generator made

`pickPlaced` hit-tested the overlay only, so every stall, fountain and building
the town laid out itself was scenery you could look at and not touch. Round 134
knew why: *"a procedurally generated building has no identity."* Still true —
but the Cities tab now reconstructs the world with the game's own methods, so
an object has no name yet does have a position, an atlas and a frame.

- **Del** writes a `blank` over it, sized off `PLACED_KINDS[...].clear` (a wall
  gets 1, because a four-tile hole takes its neighbours).
- **Drag** writes a `blank` where it was plus a real entry where it went —
  round 134's own definition of a move.

`generatedModelKey()` reverses a frame (`row * cols + facingCol`) back to a
model name and a facing. For `townPool`, `townSingletons` and `temples` — drawn
off tables outside the `structure` namespace — it returns null and the tool
says the object can be removed but not put back, rather than writing a key the
lane would reject.

**Hit-testing had to go to the pixel.** A redwood's box is 354 screen pixels of
mostly empty canopy air, so clicking a barn in front of one selected the tree.
And where a sheet is missing the draw falls back to a one-tile marker, so the
hit box has to be the marker too.

**Three ordering bugs worth recording**, all found from one report of "can
select but not move or delete":

1. The generated-drag commit sat at the BOTTOM of the `mouseup` handler, below
   `if (S.cdrag){ S.cdrag = null; }` — which nulled the drag before the commit
   ever saw it. Selecting worked, the ghost drew, releasing threw it away.
2. Deleting wrote the blank correctly but the building stayed on screen,
   because this view does not re-run the world build. It looked exactly like
   Del doing nothing. Blanked objects are now skipped by the draw and the
   picker, which is what the game will do anyway.
3. `generatedTile` assumed the object was in `S.curReg` and clamped into that
   region's box, so an object a tile over a border was written to the wrong
   region at tx 0. It now finds the containing region by arithmetic.

---

## 7. The freeze: one redraw per art file

`loadTreeArt()` is called from inside `drawTreeSprite()` — during a draw — and
each sheet's arrival called `draw()` again. A settlement asks for ~30 species
and the real folder has 39, so selecting a settlement fired thirty-odd full
synchronous redraws back to back.

Fixes: arrivals coalesce onto one animation frame; the ground loop runs over
the unprojected camera box rather than the full radius (Cadence is 317×317 =
100,489 tiles, every one projected and discarded); `_groundTileVisual` is
memoised per tile; scenery is culled to the viewport, which was passing 1,193
trees per draw. **Draw at Cadence: 1,284ms → ~230ms**, round 135's baseline.

---

## 8. The recurring theme

Three separate bugs were hidden by the same thing: **a sparse asset folder made
broken code look fine.** `castle_wall` absent made a wall-gating bug look like
a placement bug; tree sheets absent made the redraw storm invisible and the
marker hit box look correct. Verification against a partial asset set can only
ever be provisional.

---

## Verified

- `test_round134_editor` — **21/21**. `test_round136_scenery` — **36/36**, new.
- Buildings **2,611** and city props **215**, matching round 135's live figures
  exactly; trees 33,599, rocks 13,815.
- Wall stones **1,505**, present for every walled settlement.
- `_placedFlora` confirmed live: frame 20, scale 1.7, and
  `FLORA_CLASS[20] === 'mid'` whose scale is 1.7.
- A placed `wall_v1` accepted by `placedFaults` with no faults.

## Not verified

`node tools/data_checks.mjs` was **not run** — it checks asset files and the
round's sandbox had 18 of them. Run it against the real folder: expect 531/531
plus the widened `STRUCTURES` union and these two notes files satisfying the
stamp check. The r136 build has also not been booted with real art.
