# Round 107 — putting a specific thing on a specific tile

---

## What was asked

> "My editor won't allow me to modify the objects in the cities due to the
> following, if anything needs changed on the game side let me know."

The claim came with an assessment from another session, and it was verified
before anything was built, because it was a large claim to take on trust. It
was correct:

- `_buildSites` draws all fourteen of a region's sites from `seededRng`.
- `_buildCityProps` takes the landmark's angle from `stableHash(seed)` and the
  market row from the settlement's own hash and radius.
- Trees, rocks and flora are densities and radii, not positions.
- The only positional arrays in `regions.js` were `arrival`, `exit`,
  `settlements`, `roads`, `rivers` and `lakes`.

There was no override anywhere, and several comments record the project
deliberately moving *away* from hand-placement over the rounds. That was the
right instinct for scenery — nobody wants to place seven thousand rocks — and
the wrong one for the four fountains in the world.

Three questions were answered up front: **all four vocabularies**, the
generator must **keep clear** of a placement (not replace it, not overlap it),
and a placement may go **anywhere in a region**.

---

## Where it landed

`src/data/placed.js` — a thin, explicit layer **in front of** the generators
rather than a replacement for them:

1. Whatever a region lists in `placed` is laid down first, exactly where it
   says.
2. Every generator is then told to keep clear of it.

A town still fills itself in around what you put there.

### One array, four kinds

| kind | what it is | berth (tiles) |
|---|---|---|
| `cityProp` | fountains, statues, stalls, braziers, crates | 2 |
| `scenery` | one tree, one rock, one clump of flora | 1 |
| `structure` | a building, with a door and a doorstep | 4 |
| `site` | one of the fourteen per-region sites, pinned instead of rolled | 6 |

The berths are not uniform because the things are not: a fountain is a landmark
you walk around, a tuft of flora is something you walk over.

Four arrays would have been four things for the editor to learn, four
validators and four keep-clear registries, to express one idea. And the shape
is deliberately the shape the editor already writes — `roads`, `rivers` and
`lakes` are arrays of objects carrying coordinates, and the editor rewrites
such an array whole, so wiring it to `placed` is a UI job rather than a new
save path.

A pinned site **counts against its region's fourteen** rather than adding a
fifteenth.

---

## What the probe caught

`tools/probe_round107_placed.cjs` asks four questions of the *running game*,
not of the tables: does every placed entry report itself drawn, are the city
props at their tiles, does anything generated stand inside a berth, and does a
pinned site still count against the fourteen.

**The first version of the probe passed with all five keep-clear hooks
disabled.** The demo placements happened to sit on quiet ground, so nothing
generated was ever near enough to intrude and the probe certified a predicate
it had never once exercised. Fixed by moving the placements onto real generated
positions read out of the running game.

*A pool seat is not a guarantee*, and a probe that passes against a feature
that is switched off is the same fault in a new costume.

Separately: `placedBy` was being dropped by `this.obstacles = placed.map(...)`,
which meant the keep-clear pass could not tell a hand-placed rock from a rolled
one — a field whose lifetime outlived the thing that wrote it.
