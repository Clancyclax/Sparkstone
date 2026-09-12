# Round 103 — three regions, eight bugs, and one that had been under the whole map

> "Fix the map tiles to set up for 3 additional regions."
> "Bug fix round."

The world is **seven regions** now, and eight reported bugs are fixed. What
follows is what I found while fixing them, because most of this round's work
turned out to be older than this round.

---

## The one that matters most: the ground was drawn half a diamond too high

> "1) Water tiles are not colliding correctly."

Your screenshot did not survive the session, so I measured the same thing
instead: `tools/shot_water_collision.cjs` paints `_isWaterAt` — **the function
the movement code actually asks** — over a live frame, one call per screen
pixel, and puts the answer on the picture in red.

The red came back **one full tile inside the drawn waterline**, with the player
standing mid-river on ground the collision believed was grass.

The cause is one line, and it has been there since the ground renderer was
written. It projected each tile's **top-left corner** and drew the diamond with
origin `(0.5, 0.5)` — centred on the corner. A tile's world square is
`[tx*32, tx*32+32) × [ty*32, ty*32+32)`, whose centre projects **sixteen pixels
lower**. Sixteen is half of `ISO_TH`, and along a shore running at the isometric
45 degrees half a diamond of vertical shift is **one whole tile of horizontal
shift**, which is why it reads as a clean band rather than as blur.

**Nothing else was ever misaligned.** Buildings, trees, rocks, monsters and the
player are all placed at `isoProject(their own world x, y)`, and two other tile
draws in the same file already project `tx * TILE + TILE / 2`. The ground layer
was the only one using the corner — and because the ground is the thing
everything else stands *on*, the whole world looked consistent right up until
the player walked to the one ground type that pushes back.

`tools/shot_tile_grid.cjs` is the confirmation: it draws the four world-space
corners of named tiles over the live frame, and after the fix every outline sits
exactly on one drawn diamond.

**This is the fix I would ship on its own.** Every shoreline, every dock, every
lava bank and every road edge in the game was a tile out.

---

## The three regions

| | |
|---|---|
| **Sirukh Sands** | Act II. A hot island: dunes, salt pans, reef water on three sides. Tolbrand Quay, Salt Gate, Dunmouth. |
| **The Cinderwaste** | Act III. Ash plains and lava rivers below Elehyd. Ashfall Station, Slagward, Kiln Halt. |
| **Ixcuatl** | Act IV. A stepped city the jungle took back. Lastlight Camp, The Cut, Kepen Rest, and the ruin itself. |

The grid went 2×2 → **3×3**, and the trap `WORLD_SCALE.md` wrote down in advance
was real: `MAP_TILES_TOTAL` was computed from **rows only**, so a third column
would have been silently unwritable — `_setTile` bounds-checks and *drops*.
It covers the wider axis now, and `test_round43` asserts both extents.

### The tiles took three attempts and only the last one worked

The Screaming Brain sets are **variety packs, not biome packs**. "Dry" is sand
*and* cracked clay *and* olive scrub *and* grey gravel.

1. **Measured by saturation and luminance.** Sirukh came back checkerboarding:
   the spread is in **hue**, and a saturation threshold cannot tell pink clay
   from cream sand when both are pale and both are warm.
2. **Curated by eye** off labelled contact sheets (`tools/label_sbs_sheet.py`,
   written this round). Better, still checkering — because the pack draw picked
   `subset[hash % subset.length]` **per tile**, with nothing tying a tile to its
   neighbour.
3. **Grouped into tonal patches** through `patchPick`, the same trick round 101
   used on the grass. A 6×6 patch agrees with itself and the difference goes
   *between* patches. That is what finally reads as ground — and it promotes the
   strongest tiles from noise to terrain: the dune ripples now arrive in fields
   of them, which is what a dune is.

A group has to agree with itself. My first grouping put peach beside yellow
beside cream and checkered *inside* every patch.

### Four more faults the new regions turned up in old code

Each of these was a number that meant two things while there were four regions
and stopped meaning both at seven:

- **Den tiers were region INDEXES.** `min(3, regionIndex)` — Sirukh is index 4,
  clamped to 3, so every den on an Act II island held a **Silver** pack. A
  Bronze player opening that door met something they could not hurt, in a region
  the game had told them was safe.
- **Den FAMILIES, the same.** `magmaCave@4:hellhound` — gold-rank families on
  the same island.
- **Harvest node tiers fell through to `[0, 1]`** for any region not in
  `REGION_STOCK_TIERS`, so 102 nodes across the three new regions held
  normal-rank ore. A fallback that is a real band looks exactly like a correct
  answer.
- **The den room pool was a hard-coded 36**, sized against four regions. Seven
  regions want 47, so eleven landmarks had a door and no room behind it. It is
  per-region now.

### And one that was already broken and had nothing to do with regions

`resiteInteriorsIntoBand` packs every room in `INTERIOR_ROOMS` into the interior
band. The astral realms' own comment says they are laid out separately "so
`resiteInteriorsIntoBand` never sees them" — and forty lines later,
`INTERIOR_ROOMS.push(...ASTRAL_ROOMS)`. It has seen them since round 88.

Five 224×224 blocks cannot fit in a band 128 rows tall, so the cursor ran off
the end and **nine civic halls stood on `TILE_VOID`** — Ontaria's, Elehyd's and
Bratugal's guild, smithy and auction house. No error: the floor stamper simply
does not paint below the band. It reported as "60 of 74 rooms on real floor",
which is easy to read as "the astral realms are not stamped yet, as designed".

Fixed, and the resite now returns an overflow count so the next time the band
fills up it is a number rather than a shop in the void.

---

## The eight bugs

**1 · Water collision.** Above.

**2 · Dual wield strikes with both hands.** The input loop had a `break` on it —
"one swing per frame". A dual-wielder pressing both buttons got one swing and
the other a frame later; a controller player with one attack button got one
hand, ever. Both hands now swing together, each paying its own stamina and its
own cooldown, and the animation shows the hand you actually pressed.

**3 · The D-pad potion binding.** Both halves of your sentence were the same
three lines. `_assignPotionSlot` cleared the potion from any other slot that
held it — exclusivity, with a real reason: two buttons meant two cooldowns.
On a pad that rule is destructive, because `_nudgeSelect` walks a `<select>` one
option at a time and fires `change` on **every step**, so scrolling D-right's
list *past* a potion bound to D-left silently unbound it.

Fixed at the reason: **the cooldown belongs to the potion, not the button** —
set on and read across every slot holding that id. With that true, exclusivity
is unnecessary and nothing an assignment does can touch a slot you did not name.

And the dropdown that "doesn't open" never could — a native `<select>` opens
only on the user's own click. It is gone; the rack is two arrows and a name,
which is one control for the mouse and the pad both.

**4 · Selling cores.** A ternary chain ending `: p.inventory.consumables`, so
every kind it did not name fell through to the consumables bag, where
`indexOf('iron_core')` is −1 — and the function returned without a sound. Round
91 added core and stock rows to the sell *list* and not to the sell *action*.
It is a table now, so an unnamed kind reports itself.

**5 · Abilities ignored weapon alignment.**

> "A bow essence, two awakening stones of the bow. Not a single ability that
> makes using a bow better in any way."

Three separate omissions:

- `FAMILY_TRAITS` bias is baked into every **stone** and into no **essence**, so
  `essBow.family = 'ranged'` had never influenced anything.
- `weapon_affinity` appeared on **no bias list at all**, and the pool builder
  only ever calls a category that is on one. A door with no knock.
- The `weapon` charter family is opened by three levers out of nineteen, so an
  essence literally named *Bow* usually could not produce a bow affinity.

Measured before: **0.09 weapon affinities per kit**. All three are fixed, plus a
kit-completing pull, so a socket that names a weapon takes the ability that
serves it. **84% of kits with a weapon identity now get one**, and the reported
build gets `Bow: +19% strike range · shots split into 3`.

**6 · Kit composition floors.**

> "Lets reduce requirements: no kit shall have less than 2 attacks, no less than
> 1 defensive, 1 buff, 1 movement."

Attacks went **4 → 2**, and the three new floors are one each. Getting them to
hold took four measured corrections — the runway was counted in nominal sockets
that do not exist, the floor lifted a charter for a category nothing ever asked
about, and the attack count included summons and imbues that a player would
never call an attack.

Across **300 random kits**: attacks < 2 → **0**. defensive, buff, movement < 1 →
**0 each**. And the 12/8 active-passive split is untouched — an earlier cut of
this bought the floors by breaking it, which is not a fix.

**7 · "everything it does is 10% stronger."**

> "10% stronger than what?"

Gone. Round 89 wrote that sentence to replace a worse one and missed the real
problem: **the reader is already looking at the numbers.** The same line begins
with the ability's own stats, so a percentage beside them is redundant at best —
and it was worse than that, because the printed figure was the *unscaled* one.
The card now prints the stats **at the rank**, so growth shows up as a bigger
number where you were already reading. The cadence bit stays: a cooldown that
comes back sooner has a referent on the same line.

**8 · Descriptions reading as AI slop.**

> "Drawn String gets into the legs and stays there for a few seconds."
> "a warrior awakens the power of a bow in his soul and he gains... the ability
> to have a string in your legs."

That sentence is a **bulk-filled frame** carrying twenty-one different essences,
and the detector meant to catch exactly this only masked fills that come after
"of", "with", "through" or "into". This one puts the fill at the *start*, where
nothing masked it — twenty-one distinct strings, each with a count of one, each
looking hand-written.

The mask is built from the data now: every essence and stone name and phrase,
with and without its article, replaced wherever it appears. The old mask caught
**423** of the 1,367 signature descriptions (31%); this one catches **1,280
(94%)**. That number is not a bug in the detector — it is what the file is, and
it is why the signature path kept producing sentences with nothing to do with
the essence. Those all route to `mechanicalDesc`, which composes from the
essence's body clause and the stone's own material. The eighty-odd genuinely
hand-written lines still have counts under four and are left alone.

An affinity also says which weapon it is about now. "Perfected Elixir" told the
reader nothing; on a card of fifteen abilities the one that improves your bow
was the hardest to find.

---

## What the suites said, and what I did about it

Twenty-two suites failed on the first full pass. **Two were mine.** The rest
split into three kinds, and all three are worth naming because the estate will
keep producing them:

**A number that meant two things.** `=== 4` for the region count, `/ 4` for the
rock density, `regionIndex` for a tier. Each was correct and each was a
coincidence, and seven regions ended the coincidence. These read from the data
now, so the eighth region moves them instead of breaking them.

**An assertion measuring the wrong thing.** `pickFromPlan` has qualified the
tile key since round 78 (`cityStone~road`), so **four** suites comparing it with
`===` have been failing on a game drawing exactly the right thing for
twenty-five rounds — with the measurement printed in the failure message the
whole time. Same shape: a cave asserted to have furniture when a cave is dressed
with rocks; a frame-rate bar of 12 against a baseline recorded once on an idle
box, which fails on a busy one and says nothing about the code it names; a taunt
release measured over one second, which cannot tell a wander from a chase.

**A real fault the round happened to expose.** A hand-written field list in the
fallback innate that covered four of eight cast shapes, so an Earth, Order,
Craft, Life, Air, Motion or Space essence with no signature pool got an ability
reading *"absorbs undefined dmg, +0% armor for undefineds"*. Villager names
drawn from 288 combinations against a roster of seventy, where a collision is
arithmetic rather than bad luck. Nine civic halls on void. The legless
noblewoman model back on two house heads. The conjured-item system, which
`test_round31` had been testing through a kit that socketed the first sixteen
stones in declaration order — an alphabet, not a build, and one that cannot
reach the feature. Six trees standing in Ixcuatl's farm tracks, because the farm
pass runs after the forest.

**The estate is green except for two pre-existing items**, both named here so
they are not lost: `test_round17`'s 12/8 split lands at 13/7 (it was **14/6**
before this round — the rare-socket exemption is the residual), and
`test_round72` reports Harrowmoor 24/27 and Karsk 18/21 landmarks doored.

The display list went over budget when the nine civic halls came back to life —
**5,233 against a cap of 5,200**. The cap is not the thing to change, and
`budgets.js` says so in its own words. Those nine are the heaviest interiors in
the game and a player is inside one a few times an act, so they are `lazy` now
and dressed on the way in. **4,520.**

---

## Delivered

`Sparkstone-web` was **not on your Desktop**, and the only build there was
round 81's parts with no patches after it — a rebuild would have produced round
81. So this round ships as a **full eleven-part set**, `SparkstoneWeb-r103-part1
… part11.zip`, already on the Desktop. Reassembled here and checked against the
tested tree with `verify_deploy.sh` before sending: every file matches.

Double-click `Rebuild Sparkstone-web.sh`. It will take round 103 as the base and
there is nothing newer to lay over it.

---

## Open, and what I would want from you

1. **`kind: 'ruin'` is still a kind nothing knows.** Ixcuatl's stepped city is
   declared and unbuilt. The region no longer *depends* on it — there are three
   camps and a causeway now — so it can be built in its own round instead of
   being a hole in this one. It wants to be the act's dungeon.
2. **The companion documents are still drafts.** Zeke, Encykla, Ædia, Benjamin,
   the rank-up cutscene, the sixteen rank-up moments and the four Gold arcs are
   written and nothing is wired.
3. **Gold gated on the four companion arcs — yes or no?** Still the biggest
   open design question and everything works without it.
4. **Names.** Slagward, Kiln Halt, Dunmouth, Lastlight Camp, The Cut, Kepen
   Rest. Yours are always better than mine.
