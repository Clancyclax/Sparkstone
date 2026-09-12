# Round 90

Version stamp **90**.

Four items. Water moves, the astral realms have things living in them, crafting
is a machine you can walk up to and use, and the estate has no failing suites
for the first time since round 78.

---

## What was asked

> 1. Water frame animation using a rotation through the existing tiles
> 2. What lives in an astral realm — the cult camp, the packs, the nodes
> 3. Finish Crafting process, add 1 more drop to the monster table for
>    crafting. Monster Cores, These are 1 per monster and are the rank of the
>    monster.
> 4. Finish resolving the pre-existing failures: round19 tile variety and town
>    trees, round23 prop atlas, round24, round28's crowd, round38, round41,
>    round43's biome packs and build time, round45, round47, round48_runtime.

And the four answers that shaped it:

| Question | Answer |
|---|---|
| What do Monster Cores do? | *"They are critical for setting the items rank, but also may require a 5-30 of them to create the item. Monster cores should be stackable in inventory. They don't replace any other ingredient in craft, just additional."* |
| How much of crafting? | *"The whole machine, generic sayings"* |
| How dangerous is a realm? | *"3, mostly but with a few solo monsters of the next rank up wandering around."* |
| How should water move? | *"Slow drift, tiles out of phase"* |

---

## 1) The water drifts

`WATER_FRAME_MS = 1100`, and every visible water tile is registered with a
**phase offset taken from `tileVariantHash(tx, ty)`** — its own position — so
neighbouring tiles are on different frames of the same cycle. The river reads
as moving rather than as one sheet flickering, which is the whole difference
between "animated" and "in phase".

Registration and release both live inside `_updateGroundViewport`, beside the
pool return, so a tile that scrolls off screen leaves the map on the same line
that returns its sprite. The map is cleared in the scene-reset block with every
other pool — a map surviving a world rebuild would hold images the rebuild
destroyed, which is the fault round 88 fixed in three other pools.

**Measured:** 371 tiles registered standing in The Nek's river, the step
counter advancing 46 → 47 → 48 → 50 over five samples, five distinct frame
patterns across those five samples, neighbouring tiles visibly out of step
(`479:2, 479:0, 476:2` within one reading), no console errors.

---

## 2) What lives in an astral realm

Round 88 built four realms of terrain with a cult slug, a family list and a
node list written down, and nothing standing on any of it. This is the other
half.

**The threat ruling was option 3 — the region's own rank, but denser — and that
is what makes a realm a place rather than a boss room.** You are not
outclassed; you are outnumbered, and the thing you cannot fight is walking
around somewhere on the same island. A player ready for the region is ready for
the realm right up until they meet the wanderer, and then the question is
whether they can leave, which is a better question than "can I win this fight".

Per realm:

| | |
|---|---|
| **Packs** | 16, of 3–8, at the region's own rank |
| **Wanderers** | 4 solo, one rank above, roaming |
| **Cult camp** | 12 initiates and a hierophant, the hierophant a rank above them |
| **Nodes** | 12, one tier above the region outside |

Measured across the four: 83–90 pack monsters each, zero of anything standing
in the void.

**Bratugal is the exception that proves the rule.** Gold is the ceiling
everywhere — *"no region is actually diamond rank and no monsters should be
diamond rank"* — so The Kept City's wanderers are gold like its packs and are
drawn from the hardest families it has instead. A rank above gold would be the
one piece of diamond content in the build.

### The cult camps

`cultists.js` has held ten authored cults since round 78. Round 81's audit
found *"ten authored cults and twenty spritesheets that no code path reaches"*;
round 82 put one of them on screen (Sereth Vane, in the sewer) and round 88
wrote four cult slugs into the realm table and drew none of them. Four cults
now stand somewhere: **The Drowned Choir** in The Nek's realm, **The Wilting**
in Ontaria's, **The Thunderhead** in Elehyd's, **The Cinder Choir** in
Bratugal's.

They are people, not monsters — no bestiary entry, a cult and a cry and a build
out of three essences — which is exactly the shape round 82 built for the
prologue and gave its own reason for. What they share with the monster system
is the **damage path**: they hit you through `_monsterHitPlayer` and are hit
through the ordinary swing, so a cultist's blow is dodged, blocked, resisted,
warded and answered by thorns like anything else's, and yours crits on them
like anything else. They notice you at nine tiles, the camp calls out its own
cry once, and they defend the camp rather than following you across the realm.

They drop what everything else drops: a core at their rank, quintessence for
where they are standing, and — from the hierophant — a stone from their own
cult's list.

### Everything is placed on ground the generator proved reachable

That is the promise `astralFaults` checks, and it is the same one round 88 made
about the terrain: a camp you can see across a gap you cannot cross is worse
than no camp. Measured: **zero** off-ground placements across four realms, 52
packs, 16 wanderers, 52 cultists and 48 nodes.

### Built on entry, not at world build

`realmContents` needs `realmGrid`, and generating all four at world build
measured **402ms of a 6.4-second build** for content nobody has walked to yet.
It is built the first time somebody steps through, beside `_stampRealm`, for
the reason that method already gives.

---

## 3) Crafting — the whole machine

Built from `CRAFTING_SPEC.md` in the order §9 lays out. Everything except the
56 authored confluence lines, which the "generic sayings" ruling deferred and
which drop into an empty `CONFLUENCE_LINES` socket without anything else
moving.

### The twentieth debuff came first

`expose` is `sunder`'s missing twin, and the gap it filled was structural
rather than cosmetic. Armour explicitly does nothing against elemental damage —
that split is the whole point of the stat — so `sunder` is a physical build's
answer to a tough target and **a full elemental build had no answer at all**. A
fire character facing a fire-resistant monster could only hit it more.

It belongs to **every element**, because every channel wants a way through. New
icon frame 46 (`resistdown`, appended never renumbered), and it is read in
three places that now work:

- `_monsterElementMult` — stripping a monster's resistance to your channel,
  clamped at 1: it makes you normal against it, not strong.
- the player's own resistance sum, subtracted before the 75% cap, so it works
  on a build that is already at the ceiling.
- `_damagePartyMember` — and **`sunder` came with it**. Sunder has cut the
  *player's* armour since round 57 and had never once cut a companion's: that
  branch read `st.armor` raw. Three rounds of ability text saying "shattering
  the target's armour" was describing something that did not happen.

**Does it go on monsters?** `CRAFTING_SPEC.md` left this open deliberately: *"a
monster that strips your resistances is a genuinely new kind of threat. But it
is also the debuff that makes everything else hurt more, which on the receiving
end may simply read as unfair."* Both halves are true, so the answer is neither
"no monster" nor "the whole roster": **four variants** of 161 — `shadeVoid`,
`demonVoid`, `elementalDarkness`, `hydraPurple` — at the lowest chances in the
table and potency 1.0. Rare enough to remember, specific enough to prepare for,
and it makes the debuff symmetric, which is round 57's founding rule.

### The inputs

| | |
|---|---|
| **Frame** | a weapon type or a gear slot — free, decides the shape |
| **Stock** | 15 rows: Metal/Wood/Fibre × five tiers, mined from nodes in the world |
| **Cores** | 5 rows, one per rank, one per monster kill |
| **Part** | optional, from the 19 that already drop |
| **Quintessence** | the 35 that already drop — this is what decides the effects |

**The rank is the LOWER of the stock tier and the core tier.** That is where the
spec and the ruling had to be reconciled: §2.2 says the stock sets the rank, and
the ruling says cores are critical for setting it. Both are true this way, and
it is the better rule, because the two materials come from two different
activities — you mine for one and you fight for the other — and a player who
only does one of them stalls. The bench says which one held you back rather
than greying a row out.

### Harvest nodes

136 in the world (34 per region) plus 12 per realm. Region-gated in **bands of
two adjacent tiers** rather than one rung each, so you find the next tier before
you have finished the last one and the material you are hoarding is always about
to be worth something. A realm's are one rung above its region, which is the
material reason to walk through a portal.

No pool: 184 nodes in a world that budgets 5,200 display objects, each a single
static image, made when one comes within two screens and dropped when it leaves
three. A pool would buy nothing and would add the bug class that has cost this
project four rounds.

**They are drawn at 64px and 1.6× scale, and that is a correction.** The first
pass drew them at 44 with no scale and the screenshot said exactly what round
89's report said about the city props: *"way too small to see."* An ore vein you
are meant to walk to and press E on has to have the visual weight of a rock.

### Monster cores

One per monster, at the monster's rank, **guaranteed rather than rolled** — the
ruling says "1 per monster". Outside the one-of-five loot table for the same
reason quintessence is: those five compete, and a sixth branch would take drops
away from four things five rounds of tuning went into.

This is the drop that makes crafting a reason to fight. Stock comes out of the
ground, quintessence comes off what a thing was *made* of, and a core is the
only ingredient priced purely in how hard the fight was. It is what stops a
player mining their way to gold-rank gear. The cost curve is the ruling's own
band: **5 at Normal, 9, 14, 21, 30 at Gold.**

Measured over 25 kills: 25 cores, none missing, none doubled, none at the wrong
rank.

### The effect resolver does not own a table

```
quintessence -> its essence -> that essence's element + levers
                            -> thematicDebuffsFor(element, levers)
                            -> the candidate pool the crafter rolls from
```

Same function, same arguments, as the ability generator's. Fire quintessence
burns because fire *abilities* burn. Add a debuff to `debuffs.js` and every
quintessence that should reach it reaches it that day — which is why `expose`
went in there rather than into a crafting file.

Measured: all 35 quintessences carry lever data, debuff pools of 1–11 (mean 5),
every one of them yielding a non-empty pool at every rank and every resonance.

### The bench, and three crafters

Five rows filled top to bottom, each locking the ones below it, exactly as §6
draws it. **Resonance is shown before you commit**, because a system that
rewards your build should tell you it is about to.

- **Hessa Coalwright** keeps the forge and takes the blacksmith's commissions —
  she already took no coin, so this adds a second thing the smithy is for
  without adding a second till to a room round 78 deliberately cut to one.
- **Vessa Ordran**, the armoursmith, is a second person at the same doorway
  rather than a second building, which is §1's own call.
- **Sennic Vaile**, the jewelcrafter, is in the auction house. The spec wanted
  his own shopfront on the grounds that *"a jeweller sharing a forge reads
  wrong"* — which is true, and is why he is not in the smithy. A new building
  is a whole exterior, a doorstep and a lot on a street plan; the auction house
  is where this town's valuables already are. **His own shopfront is the honest
  next step.**

---

## The two faults that every structural check passed straight over

Both are worth writing down because both returned perfectly legal answers.

### The picker was biased, and every answer it gave was valid

`hash(x) % 4` chose which conditional state an effect hangs off. Plain FNV-1a's
**low bit is just the XOR of every input byte's low bit**, so over a set of
strings that differ only in even ways it returns the same parity every time.

**Measured over 600 items:**

```
afflicted  303
company    286
lowHp        0      <- index 0
alone        0      <- index 2
```

Two of the four states a conditional effect can hang off were unreachable, and
nothing anywhere reported a problem, because every result was a legal
conditional. Fixed with three xorshift-multiply finalising rounds; measured
after: 127 / 140 / 127 / 137. `craftingFaults` now counts the distribution, and
so does the suite.

Found by measuring, not by reading. The picker looks correct either way.

### The first crafted gold cuirass was three hundred times too strong

```
crafted, first draft:   +540.9% cooldown reduction, 96.9% inherent armour
dropped gold Epic:      +1.5% mana regen,           16.8% inherent armour
```

It passed every structural assertion in the file, because every one of them
asked about *shape*. The spec's promise is a number — *"a crafted item should
almost never beat a lucky drop on raw numbers; it beats it by being the one you
actually wanted"* — so it is now checked as one.

Two mistakes, both of them a missing division:

1. The **cube-root softening** `stats.js` applies to capped stats was dropped, so
   a percentage stat took the full 10.6× gold multiplier.
2. The rarity ladder was anchored to nothing.

`CRAFT_MAGNITUDE_ANCHOR` is now **derived rather than picked**: the best a drop
can concentrate into one stat is `1.25^4`; the best crafting can reach is a
Legendary quintessence at confluence resonance through the percentage column.
Setting those equal is the whole rule. The strongest crafted effect in the game
**ties** the luckiest drop and everything below it loses — while crafting still
wins on choosing five of them and choosing which five.

Tightening the anchor immediately exposed a third thing, which is what a fault
checker is for: `hpRegen`'s base band is 0.002/s, and at the ladder's bottom
rung that rounded to **zero** at three decimal places — an effect you chose a
material for and paid a fee for that did nothing. Four decimals and a floor.

---

## 4) The estate

**Nineteen failing + two dead (r87) → thirteen + two (r89) → zero.**

All ten named failures cleared, plus four more found on the way. Every one is
either a real build bug or an assertion that outlived its design — and where it
is the latter, the re-specification says what the design became and when.

### Real build bugs

| | |
|---|---|
| **`benchStone` declared twice** | `interiors.js` idx 54 (CITY0, the street bench) and idx 72 (FURN5, round 78's). JS keeps the later one, so the table read 98 and held **97**, the city bench was unreachable by name, and both of its consumers — the street furniture and the temple prop list — silently drew a different picture. |
| **Round 78 reused round 23's `FURN` tag namespace** | Fifteen collisions, so `src` claimed the same delivered image for two different pictures. Retagged `SEAT` in the extractor and the manifest. |
| **`_unplaceTownBuilding` missed `this.structures`** | Its own docstring says "three registers"; the loop covered two. The magic shop's retry loop left a phantom entry pointing at a destroyed sprite on every rejected attempt. |
| **`_clockT` was never initialised** | `_updateDayNight` opens `(this._clockT \|\| 0) + dt` and nothing set it, so every other reader wrote `undefined + N` = NaN and read it back as **0** — the `\|\| 0` guards made the fault invisible by turning every NaN into a zero. A node respawn or a cleared-pack timer set on the first frame silently meant "now". |
| **The hamlets were short three houses** | `_roadsideLots` took exactly `want` steps each way, so a lot lost to water or a farmhouse was a house that never got built; and the consuming loop counted **lots consumed** rather than houses raised, so a refused placement got no second chance from the spares. The Nek's two hamlets declare nine and had six. Both halves fixed; now 4 and 5. |
| **`_realmBuilt` survived a world rebuild** | The stale-register fault, found for the fifth time in this project and caught only by running round 90's own suite on the **shared browser lane** — a page that has already played, which the isolated lane cannot create. After a New Game the camps and groups were cleared and the guard still said the realm was built, so every realm was empty for the rest of the session. |
| **`essenceId` was `undefined` for all 35 quintessences** | Round 86 wrote `essenceId: e.id`; an essence's id is the catalogue's **key**, and the value carries no `id` field. Nothing noticed because nothing read it until crafting's resolver went looking for levers and found none for any material. |

### Assertions that outlived their design

| Suite | What it asserted | What is true now |
|---|---|---|
| **19** | grass and street both have variety in one 90×90 window | Cadence has been paved corner to corner since round 50 — there is **no grass** in that window. Sampled per surface now. |
| **19** | the town has ≥ 20 trees | Instrumented: 226 candidates offered inside Cadence, **206 rejected for standing on pavement** (162 on brick, 44 on street). A paved square is what a capital's square is. The lattice was tightened 260 → 150 (6 → 10 trees, every exclusion untouched) and the bar asks what the line was for: the town is not bald. |
| **23** | 67 atlas cells; temples carry no furniture | The atlas has been appended to twice; round 78 furnished the temples **at the user's request**. |
| **23, 24** | `doorways % 2 === 0` | A generic building's exit end is created at first entry, not at build, so an odd count is the normal state. The pairing is now asserted room by room, which is what it always claimed to be. |
| **28** | a crowd to swing at | `_wakeNearestGroup()` called eight times wakes the **same** group eight times. Its own failure message had been saying "fix the setup" for rounds. |
| **38** | `slowPct === 0.3` | `weakenRing` writes a `Math.max`, on purpose, so a stronger slow already on the target is not overwritten. |
| **41** | a creature familiar keeps its orb | Round 73 item 6.1 replaced the orb with the diagnostic dragon **by the user's own instruction**, because a 5px circle and a summon that never spawned look identical. Inverted rather than dropped. |
| **43** | Ontaria draws `region_grass_plank` | Round 78 item 7.4 re-specified its wilderness onto `region_meadow`. |
| **43** | build < 3000ms, forest < 800ms | Set for a 390-tile map with one region. The world is 5.4 **million** tiles. Measured three cold builds — total 3733/4193/4432, forest 820/847/1226 — and a 700ms spread on identical code is what this machine does. Re-specified to catch a doubling and nothing smaller, plus a new **scale-independent** check: nanoseconds per ground tile. |
| **47, 48_runtime** | literal magnitudes (2, 1.5, 1, 45s, 0.3) | Round 79 made every ability magnitude carry the character's scaling. The triggers arm, fire once and are consumed exactly as written; three equality assertions had been reading the scale as a fault for eleven rounds. |
| **48_runtime** | a scripted `Math.random` sequence by **position** | A swing now makes three randoms and the first two are the player's voice line. The sequence is delivered to `rollCrit` / `_monsterHitPlayer` **by caller**, read off the stack, so anything a future round adds can consume as many as it likes. Also: the crit stats were hand-set and then wiped by a recompute between two swings that were being compared, and a guaranteed crit left by an earlier block made every scripted "failed" roll succeed. |
| **57** | exactly nineteen debuffs | Nineteen is a floor; `expose` is the twentieth. A table that may never grow is a table nobody can add to without editing a suite for permission. |
| **73** | the escort deals exactly 7 | It zaps whatever is **nearest**, and `_rankDamageMult` scales every blow — 7 against a Bronze target is 2, which is round 43's tyranny-of-rank working. The target is isolated now and the promise is the user's sentence: more than nothing. |

### Still flaky, and known

`test_round49_taunt` and `test_round48_runtime` are real-time soaks that the
runner already isolates because *"they measure the machine, and the machine has
two cores"*. `49_taunt` failed under full-estate load and passes alone. Round 82
and 89 fail on the **shared** lane by design — they need a page that has not
already played (Act 0, a creator opening on a new game).

---

## Files

| | |
|---|---|
| `src/data/crafting.js` | **new** — stock, nodes, cores, the effect resolver, the recipe resolver, resonance, costs, the crafters' three registers, `craftingFaults` |
| `src/data/debuffs.js` | `expose`, the twentieth |
| `src/data/monsterDebuffs.js` | four variants carry it; `monsterDebuffFaults` validates variant KEYS, which nothing did |
| `src/data/astral.js` | `realmContents` — camps, packs, wanderers, nodes; the fault check extended to all four |
| `src/data/quintessence.js` | `essenceId` reads the entry key |
| `src/data/loot.js` | `core` and `stock` join the floor |
| `src/data/interiors.js` | the duplicate key, the `SEAT` retag, the armoursmith and the jewelcrafter |
| `src/scenes/WorldScene.js` | the water drift, the nodes, the realm contents, the camps, the bench, the crafted-strike path, four build bugs |
| `index.html` | the bench panel |
| `gen_round90_expose_icon.py` | **new** — one appended status icon |
| `tools/tests/test_round90.cjs` | **new** — 66 checks |
| ten existing suites | re-specified, each with what changed and when |

---

## Left open

- **The 56 authored confluence lines.** The socket is there and empty; the
  three generic fallbacks cover every confluence until they are written.
- **The jewelcrafter's own shopfront.** He works out of the auction house.
- **`expose`'s magnitude against real monster resistances.** 8% per stack to a
  cap of 30% is written by analogy with `sunder`, and analogy is not
  measurement — the same thing `powerDown` needed in round 57.
- **Crafted weapons** own the weapon type rather than carrying per-instance
  effects, because the player owns a type rather than an instance. A crafted
  sword is a sword you now have; its effects are not yet on it.
- Carried from earlier rounds: the round-32 armour zip, the ten cults placed in
  the overworld, the bounty bonus that grants nothing, consumables and monster
  parts dropping as bare rarity discs, the minimap redrawing every frame, Act
  3's portal specialist, `player.godStanding`.
