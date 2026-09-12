# Round 106 — the intake pipeline for edited maps

---

## What was asked

> "I'm planning to update some of the rooms, and region maps in a new editing
> software. After I update them can you review and log them as the official
> versions moving forward."

Four questions were asked at the top of the session so the round could run
unattended. The answers that shaped it:

- **Scope**: all three — rooms, regions, and the objects in them.
- **The contract**: *layout only; preserve wiring.* An edited file may move a
  desk, a door, a prop or a settlement. It may not silently rewrite what a
  counter is attached to, what an NPC sells, or which quest a room belongs to.
- **Build the pipeline first**, then land the first real edit through it.

---

## Where it landed

Two tools, and the first real map edit landed through them.

### `tools/import_editor_edits.mjs`

Classifies **every** change in an incoming file as LAYOUT, WIRING or OTHER, and
does it by loading both versions **as modules** rather than by diffing text. A
textual diff of a data file cannot tell a moved desk from a rewired counter;
the two look identical on the line. Loading both and comparing the resolved
objects can.

- `--apply` lands the layout changes.
- `--with-wiring` is required, explicitly, to land anything classified WIRING.
- **Structural changes are refused regardless of either flag.** A file that
  adds or removes a room, or changes a room's identity, is not an edit — it is
  a different file, and it gets a human.

### `tools/validate_maps.mjs`

The check that runs on what comes in. Rooms: props inside bounds, doorways
clear, nothing solid stacked on something solid, NPCs standing somewhere real,
no counter orphaned more than two tiles from its owner. Regions: settlements,
lakes, roads and rivers inside bounds, bridge fractions sane, and no road
crossing a bridgeless river.

`KNOWN_MAP_FAULTS` carries the eleven faults the world already had, **with
staleness detection** — a known fault that stops being true is itself reported,
because an accepted-fault list nobody prunes becomes a list of things that
used to be wrong.

---

## The four faults the round found in its own tools

Recorded because each is a repeat of a class this project keeps meeting.

1. **The importer ran the validator with `cwd: dir`.** ES module specifiers
   resolve against the *importing file*, not the working directory, so the
   validator loaded **the repository's own maps** while printing a report
   headed with the incoming file's name. It passed. It was reading the wrong
   thing. Fixed with an explicit `--root`.

   *A check that runs against something other than what it says it is checking
   is worse than no check* — this round's most expensive lesson, and it turned
   up three separate times before the round was out.

2. **`same()` compared functions by identity.** Byte-identical subtrees were
   classified as changes because two separately-loaded modules produce two
   distinct function objects. Now compares `toString()`.

3. **The bridge check knew `bridgesAt` and not `bridgesEvery`.** Elehyd uses
   the second form, so every one of its crossings was reported as bridgeless.
   *A checker wrong in the direction of false alarms teaches you to stop
   reading it*, which is the failure mode that costs the most later.

4. **The overlap check reported roughly four thousand overlaps.** Dens, houses
   and astral spaces all sit at `(0,0)` and are slot-instanced at use. The
   check was asking a question the data does not answer.

---

## The first real edit

Bram's smithy, from the user's own edited file: the smith moved with his desk.
The importer **refused it** — correctly, because moving an NPC who is bound to
a counter reads as WIRING — and that refusal is what `--with-wiring` was added
for. The edit landed under the explicit flag, which is the pipeline working as
designed rather than the pipeline being worked around.

`tools/tests/test_round23.cjs` had its interior prop floor moved 19 → 18: the
user deliberately removed the smithy's chopping block, and a floor that
encodes a number the user has since changed is a test asserting the past.
