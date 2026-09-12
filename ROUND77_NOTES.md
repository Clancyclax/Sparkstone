# Sparkstone — Round 77

**Version stamp: 77** (under the minimap — if it still says 76, the update did not land).

---

## What you asked for, and what happened

### 1. The seven new tracks, wired by their names

| track | where it plays now |
|---|---|
| Region 2 city theme | Harrowmoor, inside the walls |
| Region 3 city theme | Karsk Landing, inside the walls |
| Zeke's Theme | while Zeke tells you the next step of his story |
| Britanica Sister's Theme | the same, for **both** twins |
| Benjamin: sad theme | his arc steps **1–5** |
| Benjamin Iskarys Theme | his arc steps **6–7** |
| Astral Space / Mine | **held**, per your answer — shipped, listed, not wired |

**Two cities, not four.** Round 73 removed music from cities on your instruction
and wrote down why. That was correct for the tracks that existed; now two of them
have themes and two do not, so two of them get one. Cadence and Vashra still get
the city bed alone. When their themes arrive it is two more rows in one list.

**Benjamin's split is his arc's own shape, not a midpoint.** Steps 1–5 are the
losing of it — the kit, the word for it, the house, the name taken, the childhood
that went with it. Step 6 is the sentence where he turns ("I have had five years
and I have thought it through"). So the music changes *at the turn*, and the
change of music is the turn.

**A theme holds for 80 seconds rather than for the dialogue box.** An arc step is
read in five to fifteen seconds and the crossfade is two at each end; scored to
the box, you would hear a fade-in, four seconds of an intro, and a fade-out. It
ends on its own rather than on a keypress.

The four character rules sit directly under the title screen and above every
room, cave and region rule — a companion's theme is deliberately triggered and
everything below it is ambient. The only thing that outranks it is the main menu.

Held tracks now have a **list** (`HELD_MUSIC`). Round 70 held the Astral Space
track by leaving it out of every table and writing a sentence in a comment, and
that sentence was the only record the file existed.

### 2. Monsters roam

`roams` has been written onto every spawn group in the game and **read by
nothing**. One band in `regions.js` has declared `roams: true` for several rounds
and never moved a step.

Now:

- **every region's solo band roams**, and every region's solo band is its top
  tier — tier 1 in The Nek, tier 4 in Bratugal. That is your "generally the
  stronger monsters for a region", checked as a property rather than as four
  remembered numbers.
- **35–50% of pack groups roam**, decided per group from its own position.
- **super packs never roam.** Thirty monsters have a place they are: a warren, a
  nest, a hive. Thirty of them walking is a migration, which is different content.

Measured over the built world: **1,271 of 2,532 groups roam.**

**The move is the anchor, not the monster.** A new AI state would have had to be
taught separately to the leash, the formation, the sleep radius, the respawn
point and the repopulation clock — five places to get right and one for the next
round to forget. Instead the group's anchor walks and every member's spawn point
walks with it, keeping the offset it was born with. A monster in a roaming pack
is doing exactly what it always did — wandering within five tiles of home — and
home is moving. The pack crosses the map in formation, breaks to chase, and
re-forms around wherever home has got to.

Roaming refuses water, refuses settlements, and is capped at 420 units from where
the group was seeded, so a gold-rank solo cannot stroll into the arrival zone.

> **It also found a bug that has been live since the leash was written.** The
> wander test only permitted a step that *ends* inside the leash — so a monster
> already outside it could take no step at all, and stood rotating on the spot
> forever. Nothing could put a monster outside its own leash before, because the
> spawn point never moved. Measured on the first test run: a scorpion 213 units
> from a 160-unit leash, frozen, while its group walked away. A step that
> shortens the distance home is now always allowed — which also unsticks any
> monster knocked back, taunted, or shoved out of a doorway.

### 3. All 288 tiles, numbered

One tall sheet plus eighteen per-set sheets. Each tile carries its **global
number** (bottom left) and its **in-sheet frame index** (bottom right, bracketed),
because the game's own tables are written in frame indices and a sheet that gave
only the global number could not be checked against them.

The numbering is by set, in a fixed order, and new packs append — so a number you
write down keeps meaning what it meant.

**And it found something.** Frames 101–105 are **desert sand and dunes that
nothing in the game has ever drawn.** Round 45 correctly kept them out of both
the ground and accent roles (mixing dunes into a snowfield by hash was what it
was fixing) and had nowhere else to put them, so they have been loaded and unused
for thirty-two rounds. See item 4.

### 4. Elehyd's desert flora — and Elehyd's desert

Fifty plants, packed into one atlas. **Not trees:** the metadata says
`"directions": 1` and every image is a single 40×40 "low top-down" drawing, so
these are scatter, and the module they belong beside is `rocks.js`.

**Three size classes, measured rather than chosen.** The art gives every plant the
same forty pixels whether it is a barrel cactus or a saguaro three times a man's
height, so drawn at one scale the desert would have no sense of scale in it —
round 76's tier-0 hatchling and tier-3 adult, again. The class comes from the
drawing's own aspect ratio, split at the 30th and 70th percentiles of this pack.
(The first pass used fixed thresholds and put 34 of the 50 in one class, which is
a classifier that has not classified anything.)

**Nothing is stored.** The first version built the whole of Elehyd once and kept
it: about 78,000 objects, rescanned every time the camera moved. The scatter is a
pure function of the grid cell, so the few hundred cells under the camera are
computed when the camera moves, and it is the same answer.

> **THE DESERT WAS NOT THERE.** You called it "region 3's mountainous desert" and
> sent cacti for it; Elehyd was grey rock and snow end to end. The first
> screenshots of this pack are **saguaros standing in snow**.
>
> So Elehyd now has a real desert band across its south — the same shape as
> Bratugal's swamp, with a 150-tile blend so it does not begin on a ruled line —
> drawn from the sand tiles item 3 found. You arrive in the desert at Karsk
> Landing and climb into the mountains, which is the right way round for
> "desolate badlands and icy peaks". The flora grows in the band and thins with
> it. **Pines are refused there**: the first wide shot of the finished desert had
> a full evergreen standing in open sand.

Flora has **no collision**, deliberately. A desert where fifty kinds of plant each
stop you dead is unplayable long before it is atmospheric. The tall cacti do join
the walk-behind fade, because the first screenshot had the player entirely hidden
behind a saguaro.

### 5. City screenshots

Four cities, zoomed out far enough to contain the city, plus a street-level frame
of each. The first pass took them at play zoom and produced four pictures of a
paved plaza with five people on it, from which you cannot tell one city from
another.

> **Worth your eye:** Harrowmoor and Karsk Landing are near-identical — same
> plaza rings, same white church, same gold-domed temple, same house set. Vashra
> is the only one that reads as a different place, and the only one with no wall.

### 6. The four abilities — all four generate

#### 6.1.1 — all ten of your named sources exist. Six are confluences.

Searching the 148 essences for Empower, Might, Juggernaut, Leviathan, Kraken,
Minotaur, Wrath, Hand, Potent and Avatar returns four hits, which reads as "six
of these do not exist" — and that is exactly what **round 76 concluded about
Charlatan**, offering to add it as a new essence. It was wrong. Charlatan is in
`CONFLUENCE_CONCEPTS`, and so are all six of these. You were right to send me
back to look.

Which makes it a better ability than ten flat sources would have. Four essences
put it within reach of anyone who finds one; six confluences make it something a
whole build arrives at.

#### 6.1 — a two-hander in one hand

**Round 74 already built the rule and nobody has ever read it.**
`canBeWieldedOneHanded` — "two-handed and not ranged" — was written against this
exact ask and you chose hammer and scythe. This is the ability that calls it. The
weapons it frees are *derived* from that function, so the three ranged
two-handers can never be freed however the ability is phrased.

The permission goes into `_isTwoHanded`, the one question every hand rule asks —
the free-hand test, the shield grant, the load-time reconciler, the paperdoll,
the tooltip — so all six follow without knowing it exists. A hunter with this
ability looking at a scythe is not looking at a two-handed weapon, and the tooltip
that stops saying so is telling the truth.

**84 of 400 kits (21%).**

#### 6.2 — +1, and additional effects with rank

Your parenthesis inverts what the game had. `attr_boost` has granted
`1 + rankStepsPastIron(rank)` since round 6 — one point at Iron and **four at
Gold**, which is precisely "additional attribute points as you move up through the
ranks", and precisely what you ruled out.

Now: **one point, forever.** What ranks up is the ability. Each rank from Bronze
adds a named rider drawn from what that attribute already feeds, so the growth
reads as the same power deepening:

> *Troll's Vigor* — +1 Recovery · raises your Recovery ceiling by 1 · bronze: +12%
> health recovery · silver: +12% stamina recovery · gold: +6% cooldown reduction

#### 6.2.1 — the cap: 4, and 6 with the right abilities

**The floor was already right and nothing enforced it.** A bound attribute at Gold
is `1 + 3 = 4` before any ability touches it — exactly your number. What was
missing is that the ability bonus had no ceiling: one `attr_boost` took a bound
attribute to **8**, and two took it to 12.

- `ATTR_SOFT_CAP = 4` — where a build with no attribute abilities stops.
- `ATTR_HARD_CAP = 6` — the ceiling nothing passes.
- Each attribute ability bound to an attribute raises **that attribute's** ceiling
  by one. So does each equipped **divine** piece that names it.

So the ability is not "+1 attribute" bolted onto a fixed ladder — it is permission
to go one point further than a build without it can, which is what makes taking a
second one, or one plus a divine relic, a real choice. Measured: plain build 4,
one ability 5, two 6, four abilities and four divine pieces still **6**.

#### 6.3 — water walking

**93 of 400 kits (23%).** Crossing water is a traversal power worth a great deal
in a world with three lakes, a river system, an ocean coast and a bog, and worth
nothing in a fight — so the rank bonuses only pay **while you are standing on the
thing the first half let you stand on**. A build that takes this to Gold is a
build that fights on the water on purpose.

> *Skim* — cross water on foot · bronze: +15% movement while on water or swamp ·
> silver: +35% mana recovery · gold: +12% dodge

"Water or swamp" is two different tiles: a bog is stamped as a **mix** of shallow
water and accent, so testing water alone would pay on a third of the bog and the
ability would flicker as you walked. Only the player crosses water — a wolf pack
following you onto a lake is a design decision nobody made.

Both powers are **one per kit** and both are gated to named lists rather than to a
charter, because you answered "is this the sort of essence that does X" by name.

---

## Two things I got wrong this round, and how they were caught

- **The one-handed passive reached 45% of every build in the game**, and every
  single instance came from the *confluence socket* via the kind-floor top-up, on
  essences with nothing to do with strength — a Blight stone was producing water
  walking. I had reserved a seat and forgotten the *door*: `tryCat` is also the
  funnel for the bias list, the rotation and the top-up, and `passive buff` is
  allowed almost everywhere. Round 76 wrote the absorb cap three lines away for
  exactly this reason.
- **The first names were "Other Other Body" and "Unfixed Other Body"** — 250
  generated names across the two abilities, not one of which said anything about
  holding a scythe or walking on water. The name carries the flavour; a generated
  name that names neither fails both halves. Both now use authored banks.

Also caught by looking rather than by reading: the pine in the dunes, the player
hidden behind a saguaro, and the four city screenshots that were four pictures of
an empty plaza.

---

## Regression

**85 suites. 76 clean; 9 fail, and every one of the nine is pre-existing.**

Three failures were investigated and fixed rather than excused:

- **`test_round73`** — mine, and the same stale-rule shape I had just corrected
  in the audio table itself. Round 73 asserted "a city returns null", which was
  right while no city theme existed. Restated as the rule it was written to
  protect — *the wilderness theme does not leak into the city* — plus its mirror,
  which round 73 could not have written: a city theme must not follow you out of
  the gate. **46/46.**
- **`test_round51_charters`** — mine, and a real hole. Every ability category has
  to be filed in `CATEGORY_FAMILIES`, the one table that decides what an essence
  is willing to do, and my two new ones were not. `charterAllows` returns *true*
  for an unfiled key, so nothing broke — which is exactly why the suite asserts
  the table is total. **24/24.**
- **`test_round76f`** — not a regression, a bad measurement. It waited 2,600 wall
  milliseconds on a 2,200-millisecond *scene-clock* delay. Headless Chromium runs
  this game at 6–8 fps here, so the two clocks do not keep step and the check
  reported "1 then 1", which reads exactly like a broken banter. Probed directly,
  the banter is fine: first line at once, second two to three seconds later, both
  up together for about 1.4 seconds. Polling from the test process made it worse
  — a round trip on a loaded container can be longer than the window. It now
  **drives the scene clock** 300ms at a time, which is deterministic at any frame
  rate and still fails honestly. It also now states its own precondition: it
  never recruited the pair whose banter it played, so which lines appeared was
  luck. **20/20.**

Two things measured rather than assumed:

- **Round 77 costs 0.1 fps.** Baseline 6.9, roaming tick disabled 7.0, flora also
  disabled 7.0. The 7 fps is headless software rendering on two cores, not this
  round.
- **`test_round43`'s build-time budget is the container, not the desert.** With
  the desert-tree block neutralised the forest build was 1,224ms; with it, 1,165ms
  — identical within noise.

The remaining nine (rounds 19, 22, 23, 24, 41, 43, 45, 48_agentA, 48_runtime,
49_taunt, 75b) fail on assertions with nothing to do with this round — a magic
shop, hamlet house counts, door-end totals, build-time budgets — and were on the
project's known-bad list before it started.

## One loose end from last round, closed

`tools/run_one.sh` — written unprompted in round 76, half-tested, and offered for
deletion. **Finished by deleting the half that was wrong.** Its dev-server
auto-start spawned a `nohup` background process the script did not own and could
not clean up; one of them was still running two hours into this round, holding a
browser open on a two-core container. It now says nothing is serving :8000 and
stops. What remains is the one thing worth a name: `node -r chromium_flags.cjs`,
so a hand-run suite gets round 72's offline flags.
