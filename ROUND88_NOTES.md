# Round 88

Version stamp **88**.

Four asks: the E1 HUD, a round of bug fixes, shaped caves with astral portals,
and the Adventure Society chain that had been deferred six rounds.

---

## First, a correction I owe you from round 87

I told you the hotbar had *"twelve actives with only ten visible slots — a real
bug, two of your abilities are unbound by default and most players will never
find them."*

**That was wrong, and I got it from my own mock rather than from the build.**
`HOTBAR_KEY_LABELS` has been twelve entries since round 15 and
`_abilitySourceIconUrl` has resolved the awakening stone's own gem or the
essence's cube for every bound ability since round 16. I drew ten colour blobs
in a draft, then read my drawing back as evidence about the game. A draft is
not a measurement.

The same round I reported *"round15: L1/R1 fire the wrong hands. Pre-existing,
now visible."* **That was also wrong** — see the bug section below. Two claims,
both confident, both from reading something other than the thing itself.

What *was* actually wrong with the hotbar is smaller and real: the swatch was
44×26 while every source sprite is square, so `center/contain` letterboxed a
40–48px cube into a 26px stripe. It is a 34px square now.

---

## 1) E1 — the retinue

> *"Lets do E1 for the screen"* · *"12 slots, 1 row, don't shrink and use the
> essence or awakening stone as the icon"* · *"Collapse summons past 3"*

Everything that fights for you hangs off your own frame, in one column, in the
same frame shape you have. Companions first with head-and-shoulders portraits;
then the essence rule in your four colours; then summons, each with a
**depleting ring** where the portrait would be, because the useful question
about a summon is not what it looks like but how long it has.

Past three summons they fold into one `and N more summoned` row. Measured with
a full roster — four companions, six summons — the column is **316px on a 600px
screen** and its bottom edge is at 589. Unbounded was E1's own stated cost in
the draft; this is the answer to it.

### Two bugs found by building it

**The companion portraits were 1×1 transparent pixels.** The obvious source is
`m.artKey`, and it is wrong: that is the roster's art *name* (`'zeke'`), not the
loaded texture key. `textures.get('zeke')` does not fail — Phaser hands back
`__blankFx` — so the code produced a perfectly valid data URL of nothing and
every frame drew empty. Reading the member's own sprite instead makes the
question impossible to ask wrongly.

**Eight of the twelve hotbar slots were invisible.** The empty path calls
`_fillHotbarSlot` with `owned=false`, so every unfilled slot took `.locked` as
well as `.slot-empty` — and `.hotbar-slot.locked{opacity:0.35}` is declared
later at equal specificity, so it won. At 0.35 over a 0.78-alpha panel, on
Cadence's paving, an unfilled slot is nothing at all: the bar looked like a
four-slot bar. Raising the empty opacity did nothing until the cascade was
fixed, which is the tell. Round 15's own comment promises "the layout stays
stable while a kit grows"; it had been quietly false for seventy rounds.

---

## 2) The bug round

**Nine suites cleared.** The estate went from 19 failing + 2 dead to **15
failing + 2 dead**, with no new failures.

### The one that had been hunted for three rounds

`update fault (frame skipped): Cannot read properties of undefined (reading
'sys')` has been in this estate since round 79. Rounds 79, 81 and 84 each
guessed at a source, guarded it, and it came back.

It came back because **the log threw the stack away**: `console.error` with an
Error *object* gives a console listener only the message, so every hunt started
from a string naming a Phaser internal and no line of this file. The guard logs
`err.stack` now.

The fault is `_qmarkPool` — the parked quest-marker sprites, and `_qmarks`
beside it. Both are `this._x = this._x || ...` at their point of use, so they
**survive a world rebuild holding sprites the rebuild destroyed**, and
`_updateQuestMarkers` then pops one and calls `setTexture` on it. This is
exactly the fault round 81 found in `_cityPropPool` and `_sceneryPool`, wrote a
long note about, and fixed in two of the three pools. It reproduces reliably in
the shared-browser lane, which restarts the scene between suites — which is why
it has shown up in the estate for rounds and never in a soak.

### The one that was eating the Adventure Society introduction

`_guildmasterWelcome` set `player.guildWelcomed = true` on its first line, then
opened a dialogue. Cadence's grate is in the middle of a working town, so if
anything else was talking at that moment the welcome lost the race — and the
flag was already spent. **The player lost the Adventure Society introduction
and the only essence they are given, permanently, with no way to get either
back.** The estate had been reporting it for rounds as
`the Guildmaster is waiting on the grate :: Sereth Vane`.

Same shape as round 84's cultist-over-Knowledge bug and the same answer: wait
for the stage to be clear, and do not mark it done until it has been done.

### A validator that had been lying since round 82

`divisionFaults()` asserted `ACT0_PAGES.length >= 4`. In round 82 you asked for
Act 0 to be trimmed to a cold open and it became two pages, deliberately.
Nothing updated the validator, so it has returned `['act 0 is too short to be
an act']` on **every run for six rounds**, and three suites were failing on it.

A validator that reports a fault nobody intends to fix is worse than no
validator: the estate learns to read it as "one known moan", and the next real
fault arrives in a list people have stopped believing. It has a floor of two
and now also an **upper** bound — brevity is a promise, and a cold open grows
back one well-meant page at a time.

### The controller bug that never existed

`round15` reported `L1 fires the LEFT hand only :: l1Left=false`. I passed that
to you last round as a real controller bug.

`_isAnyOverlayOpen()` gates `_readHandAttackJustPressed`, deliberately — round
19 gave the shoulder buttons to the UI so a player paging through inventory
tabs does not also swing a sword. **The suite's own setup bonds three essences,
which forms the confluence, which announces itself in a modal dialogue.** So it
was asking "does L1 attack while a conversation is on screen", where the right
answer is no. The binding was working, tested in the one state where it is
supposed to refuse. 50/50 now.

### Three races of the same species

`round82`'s second page, `round15`'s creator, and `round28`'s title screen were
all *"do the thing once, at a fixed delay, and hope"*. Round 82's own comment
already articulates the fix — *"a fixed number of clicks with a fixed wait
between them is a race, and it lost once"* — and had applied it to the clicks
but not to the step before them. All three poll now. `round82` also closes its
first page before booting its second, which was most of the flakiness: a full
Sparkstone competing with a boot for two cores.

### And one suite that was reporting a deliberate optimisation as a bug

`round65` counted 20 "invisible NPCs". All twenty are the road priests, which
round 79 made viewport-pooled — `sprite: null` until one is on screen, because
twenty-one static people across four regions took the display list from 3,996
to 4,134 against round 43's four-thousand cap. The check predates that. It
excludes pooled entries now and keeps the round-44 shopkeeper claim intact.

### What is still failing, and why I stopped

`round28`'s whip/scythe geometry needs three monsters standing in a line and the
roster in that context holds two. I could not make a crowd without rewriting
more of that suite's setup than the round had room for. Its failure message now
says **`NO CROWD TO SWING AT: monster roster is 2. This is not a targeting
failure — the geometry was never exercised. Fix the setup, not
_weaponHitTargets.`** Three rounds of notes have carried it as a targeting bug;
the next person starts from the right place.

The rest — `round19`'s tile variety and town trees, `round23`'s prop atlas,
`round24`, `round38`, `round41`, `round43`'s biome packs and build time,
`round45`'s magic shop, `round47`'s three triggers, `round48_runtime` — are
untouched and pre-existing. `round22`, `round48_agentB`, `round49_taunt`,
`round73` and `round80_saves` are **flaky in both trees**, characterised by
repeated sampling rather than assumed.

---

## 3) Caves that are shaped like caves

> *"Like the sewers in Cadence the caves throughout the regions should have
> interesting and varied room shapes."*

Every cave in the game — 36 pooled rooms, mine workings, magma vents, barrows,
cult chambers — was **the same 13×11 rectangle**. There was no cave generator.
The only thing that varied between a mine and a barrow was how many boulders
were scattered into it.

`caveShapes.js` adds five families that are genuinely different shapes rather
than one shape with different numbers:

| | | mean floor |
|---|---|---|
| **cavern** | one irregular room, smoothed | 130 |
| **chambers** | two to four rooms on narrow necks | 92 |
| **gallery** | a winding passage with alcoves | 106 |
| **ring** | a loop around a central mass | 83 |
| **fissure** | branching cracks with widenings | 163 |

The sewer is the model and the reason is cost: every rock tile is `TILE_VOID`,
which the ground renderer already draws as unlit nothing, pooled by viewport,
for **zero sprites**. So a 21×17 shaped cave is *cheaper* than the 13×11
rectangle with a wall ring it replaces.

**Barns and shrines keep their rectangles.** The den pool is shared by
everything a landmark leads into and two of those are buildings; the first
build rendered The Long Barn as a jagged hole in the dark with no walls, which
is what the first screenshot showed. The ask was that *caves* vary.

### Four bugs worth recording

- **`smooth()` ate the fissures whole.** The smoothing rule turns floor with
  five rock neighbours into rock — which is exactly what a one-tile crack has.
  The first pass reduced every branch to a five-tile stub. A narrow thing
  cannot survive a filter whose job is removing narrow things.
- **The door carve broke its own connector.** Carving inward to `CAVE_H-4` meant
  the corridor walk started on floor it had just written and broke immediately,
  so `chambers` layouts came out as a 28-tile hallway to nothing.
- **The pack spawned inside the rock.** `_buildDenPacks` used a fixed tile —
  middle of the room, three rows down. In a rectangle that is "at the back". In
  a ring it is the central pillar. The den's whole fight would have been
  unreachable in a room the quest system will ask you to clear.
- **And the shape never reached the ground.** `_stampInteriorBand` runs at world
  build; `_claimDenRooms` runs after it. So when the stamp asked `tileAt` the
  room had no family yet, `tileAt` correctly answered "nothing special", and
  every cave was stamped as a full rectangle of floor — **357 tiles against 89
  in the grid**. The generator was right, the hook was right, and the feature
  silently did not happen. Nothing but comparing the ground to the grid finds
  that, which is what `test_round88` does.

---

## 3b) The astral portals

> *"Astral portals should be placed hidden in each region which take the player
> to a very different environment"*

**How you find one is the whole feature.** Round 85 built `auraSenseTiles` — at
Iron you feel living things ten tiles out through walls and dark, further at
every rank above. It has been a combat convenience since. A portal that is
invisible until your aura sense reaches it turns that number into a reason to
rank up: the world does not get easier as you climb, it gets **larger**, and a
Gold-rank character walking ground they cleared at Iron finds something that was
there the whole time.

`AURA_SENSE_TILES[0]` is 0, so a Normal-rank character **cannot find a portal at
all, standing directly on it** — the gate falls out of the rank table rather
than being a second rule. That is asserted at runtime, not just in arithmetic.

Four realms, one per region, each a different environment: **The Drowned
Shore**, **The Wrong Orchard**, **The Standing Storm**, **The Kept City**. They
are islands on void with causeways between, 30–51% empty, every ground tile
reachable from where you land (asserted — a generator gets that wrong
invisibly).

**On size, honestly:** you said *"maybe 1/3 the size of a region map"*, which is
341 tiles a side. They are **224** — 22% a side, 50,176 tiles, twenty-eight
times the sewer. Two things bound it: the interior band had 44 spare rows so any
realm needed the world grown, and four realms stamped at world build would add
over a million tile writes to a build round 43 already says is too slow. They
are **stamped on entry** instead, so the cost is paid by the player who walks
through and nobody else. Going to 341 is a further step, not a different design.

### What the world-size change broke, and how it was caught

Growing the map from 2176 to 2656 tiles a side had four consequences, all found
by the regression:

- **The world map would have shrunk by 30%.** `_drawFlatMap` drew the terrain
  across `MAP_TILES` — the whole array including the bands — so the map has
  always been ~6% wider than the world. The new band would have made that 30%.
  It frames `WORLD_TILES` now, which is what a world map is a map of.
- **The display list went to 5,841 against a 5,200 cap.** The realms are
  registered as interiors so the stamper can find them, and `_buildInteriors`
  then wrapped each 224×224 room in a wall ring: ~900 colliders and ~450 wall
  sprites, four times. A realm has no walls; its edge is void.
- **`round43` asserted the old world shape** in two places, both now read from
  `regions.js` rather than retyped.
- **`round82` decoded `_groundTiles` keys with a literal `2176`.** Every key
  resolved to the wrong tile and the sewer's fog check reported "81 tiles lit,
  81 of them outside the window" — which reads as the eight-tile sight radius
  being completely broken, and was arithmetic with last round's world. Line 361
  of that same file already wrote `(s.mapW || 2176)`, so the author knew the
  number was a hostage; this one was missed.

**Not yet built:** the cult camp, the rare packs and the harvest nodes inside a
realm. The portals, the realms and the way in and out are real and walkable;
what is in them is next round's work and I would rather say so than imply it.

---

## 4) The Adventure Society

> *"1 plus pull the inspiration and actions from the notes for the guild chain.
> Stars are about being an effective adventurer for 2 stars and a politically
> savvy adventurer at 3 stars. Going up a rank drops you down a star, higher
> rank = higher expectations."*

The gap README has called "the biggest known gap" since round 81, deferred from
round 78 → 79 → 80 → unscheduled → six more rounds.

**The star mechanic is the good part.** Every other progression in this game
only goes up — rank, essence standing, god standing. The star is the first
number in Sparkstone that can go **down**, and it goes down for succeeding:
reach Iron and your three stars as a Normal-rank adventurer become two as an
Iron one, because you are now measured against Iron. A Society that re-grades
you the day you get stronger is a Society with standards rather than a shop
that sells ranks — and the ladder cannot be outgrown, because outgrowing it is
what resets it.

The three stars are three different jobs, not one job three times:

| | | |
|---|---|---|
| **1 · Registered** | competence, demonstrated | the clerk at the desk |
| **2 · Contracted** | *"an effective adventurer"* — unsupervised | the Guildmaster |
| **3 · Confidential** | *"politically savvy"* — the quarry is a means | the Guildmaster, off the record |

Fifteen authored contracts across five ranks, generated objectives underneath
on the `godQuests.js` shape. **Five of them are about cults** — `cultists.js`
has held ten authored cults since round 78 and been imported by *nothing*: 20
spritesheets loading every session to draw nobody. A cult is exactly the kind of
problem that is political rather than martial, which is what makes the third
star a different job and not a bigger one.

The re-grade is **announced**, not applied quietly. It is the only place a
player's progress goes backwards, and round 85's lesson — that an advancement
the player is not told about did not happen for them — holds twice as hard for
one that costs them something.

State is a plain field on `player`, so saves carry it with no save code, the
same way `godChains` needed none. `_isChainQuest` includes it, or the quest
board's Turn In button would pay for a contract and delete it **without
advancing the ladder** — the round-76 defect, guarded.

---

## Tests

**`test_round88` is 28/28.** Written against the promises rather than the parts,
because round 87 taught the same lesson twice in one round: four blobs that
exist, animate and sit behind the content pass three checks and can still be the
wrong colour.

So it asserts that the retinue is **bounded** with a full roster; that a cave's
shape **reached the ground**, tile for tile; that a Normal-rank character
standing *on* a portal finds **nothing**; and that ranking up **costs a star**.

**Regression: 98 suites — 66 ok, 15 informational probes, 15 failing, 2 dead.
No new failures.** Every failing suite was checked against its round-87 result
individually rather than against a list.

---

## Numbers

| | |
|---|---|
| Suites cleared | 9 |
| Estate | 98 suites · 15 failing · 2 dead (was 19 · 2) |
| New suite | `test_round88`, 28/28 |
| Cave families | 5, mean floor 83–163 tiles |
| Caves shaped / left rectangular | 14 / 11 |
| Astral realms | 4, 224 tiles a side, 30–51% void |
| Society contracts | 15 across 5 ranks · 5 cults used of 10 |
| Retinue column, full roster | 316px of 600 |
| World | 2176 → 2656 tiles a side |

## Carried forward

- **What lives in an astral realm** — the cult camp, the rare packs, the nodes.
- **Crafting.** Spec answered in round 87 with a build order; step 0 is `expose`
  in `debuffs.js`.
- **`round28`'s crowd**, and the pre-existing failures listed above.
- Place the ten cults in the world (five are now *named* by Society contracts,
  which is not the same as standing somewhere).
- The bounty bonus grants nothing.
- Consumables and monster parts still drop as bare rarity discs.
- The minimap redraws every frame at 2.1ms.
- Act 3's portal specialist does not exist.
- `player.godStanding` is written and read by nothing.
