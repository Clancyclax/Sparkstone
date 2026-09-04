# Round 91

Version stamp **91**.

Four items, all of them corrections or completions of round 90: a person stops
dropping what only a creature can leave, the harvest nodes get the art you sent,
and the auction house starts trading in the materials the crafting machine
needs.

---

## What was asked

> 1. Cultists and all other humans don't drop monster cores or quintessence.
>    They drop gear, consumables, and coins at higher rates than monsters.
> 2. I've attached a zip for plant and mineral nodes to replace the self
>    generated placeholder images.
> 3. Jewelcrafter can stay in the auction house.
> 4. Monster cores and quintessence should share a tab at the Auction House with
>    6 randomized (cores or quintessence's) for sale resetting each day. They
>    should be relatively expensive but this allows players a chance to sell what
>    they have to purchase what they need. Available cores should be rank gated
>    by region. i.e. no bronze, silver, or gold cores in region 1s auction house.
> 4.1) There should also be a tab for gatherables and monster parts. 7 slots
>    randomized also resetting daily.

Four questions went back before any code was written, and all four came back on
the recommendation: the game's own tree art for timber, about double for human
drop rates, 4× the sell price at the auction, and the region gate applying to
all three of cores, quintessence and gatherables.

---

## 1) What a person leaves

Round 90 gave cultists a monster core and astral quintessence on the reasoning
that *"a cultist is a creature"*. That reasoning was wrong, and the ruling makes
plain why: a core is **the knot of power left where a creature stopped being
one**, and quintessence is **the raw stuff a thing was made of**. Neither
sentence is true of a person, who was made of the same thing you are. What a
person has is what they were carrying, and a cultist camp is thirteen people
with pockets.

`humanDrops` in `loot.js` is the one door, and it takes the **monster table's own
rates and doubles them** rather than owning a second set of numbers — so five
rounds of tuning still governs the shape and the multiplier only moves the size.

| | Monster | Human |
|---|---|---|
| Gear | 5.0% | **9.9%** |
| Consumable | 12.0% | **24.1%** |
| Essence or stone | 5.5% | **11.0%** |
| Coin | one drop | **one drop at 2× the amount** |
| Core | 1, guaranteed | **none** |
| Quintessence | on its own roll | **none** |
| Monster part | 18% | **none** — a cultist has no scales |

Measured over 40,000 rolls, and over a real thirteen-person camp: 5 gear,
4 consumables, 3 stones, 1 essence, 13 coin drops, and **zero** cores,
quintessence or parts. A hierophant takes a second roll of the same table and
2.5× the coin.

A cultist's stone comes from **their own cult's list**, so a camp's drops read
as that cult's rather than as a generic roll — which is the reason to fight a
camp rather than walk around it.

There are two human fights in the game today and there will be more, so this is
one function rather than a copy at each of them.

---

## 2) The node art

Twenty-five delivered objects: fifteen minerals and ten plants, 64px, single
direction, low top-down. `extract_round91_nodes.py` lays them in one strip and
`nodeArt.js` maps family and tier to cells.

**The ladder is read off the art rather than assigned arbitrarily.** Copper is
the oxidised and coppery rocks, iron is plain stone, steel is stone with bright
ore in it, silversteel is white and pale, skyiron is the gold and the crystal —
so a player who has seen a Skyiron vein once can tell one from a Copper vein
across a field. Fibre runs the same way, plain grasses at the bottom and the
fullest bushes at the top. Each tier names two or three cells and the choice
comes from the node's own position hash, so a vein looks the same on every visit
and its neighbour does not look like it.

Every one of the twenty-five is reachable — `nodeArtFaults` checks that, because
a cell nobody draws is art that was made for nothing.

### Timber, which the drop does not contain

Fifteen minerals and ten plants covers metal and fibre. Wood — Pine, Ash,
Ironbark, Duskwood, Heartwood — has no timber in the zip, and exactly one of the
ten plants reads as a tree.

Using the game's own tree art was the ruling and it is the right answer rather
than a compromise: a stand of timber genuinely should look like trees, and the
forest atlas already holds eleven species in three variants and eight rotations,
already loaded. The tier picks a species by what the wood is *called* — Pine is a
pine, Ironbark is the heaviest thing in the pack — falling back to the region's
own list where the hint is not one of its trees.

**Scale alone was not enough, and the screenshot is what said so.** A stand at
0.62× a forest tree, standing in a wood, read as one more tree. It carries a
**cut stump at its foot** now — the woodsman's own mark, and it needs no new art
because the stump is the strip's last cell, which the felled state already uses.

A spent vein or patch is **the same cell, dark and flat**: the thing is still
there and you have taken what was in it, which is what the respawn timer means.
A felled stand is a different object and gets the stump.

---

## 3) The jewelcrafter

Stays in the auction house. No work.

---

## 4) The auction house trades in materials

Three blocks now, and the middle sentence of the ask is the whole design:
*a chance to sell what they have to purchase what they need.* Round 90 built a
crafting machine with four ingredient types, three of which come from three
different activities — you mine stock, you fight for cores, you kill the right
element for quintessence. A player who has done one and not the others stalls,
and stalling is only interesting the first time.

| Tab | Slots | Holds |
|---|---|---|
| **Lots** | 26 | essences and stones, as since round 31 |
| **Cores & Quintessence** | **6** | the rank-setting ingredient and the effect-choosing one |
| **Gatherables & Parts** | **7** | stock out of the ground, and the 19 monster parts |

All three cut fresh at midnight, and the two new ones re-cut when you carry the
same day into another region, because the gate is a property of where the block
is standing.

### Priced off the shop's own ladder

Every lot is **four times what the auctioneer would pay you for the same item**
— `_sellValue × 4` — so there is no second price table to keep in step. That is
the same reasoning round 86 used when it deleted quintessence's private value
table. Steep on purpose: you sell four of a thing you have to buy one you need.

Cores and stock had never been priced at all — round 90 added them and gave them
no `_sellValue` case. They now ride the same octuple ladder keyed on **rank**, a
core at a fifth of a stone of the matching rung and stock at a fiftieth.

**The ladder stops at Epic, and that is not laziness.** `Legendary` is
deliberately off the octuple ladder in `market.js` — you priced it at 80 gold,
about a thousand times an Epic, *"the difference between an expensive purchase
and a thing that changes your life"*. A Skyiron bar is not that. Measured against
the Legendary rung it came out at **160 million each**, and four of them on the
block read **1.28 billion** next to a 280-coin monster part. Gold rank takes the
Epic rung with a multiplier instead.

### The region gate

`REGION_STOCK_TIERS` already says which tiers are in a region's ground; the
auction sells the same window, so a region cannot end up selling a core its own
monsters do not drop. One table, stated as a rule rather than a list.

| | Cores | Quintessence | Stock |
|---|---|---|---|
| The Nek | Dim, Iron | up to Uncommon | tiers 0–1 |
| Ontaria | Iron, Bronze | up to Rare | tiers 1–2 |
| Elehyd | Bronze, Silver | up to Epic | tiers 2–3 |
| Bratugal | Silver, Gold | up to Epic | tiers 3–4 |

Legendary and Divine quintessence is never on the block: a material that changes
your life is not something a market cuts six of every morning.

### A tab that sells both things it is named for

The first roll picked uniformly over the merged pool, which **looks** fair and is
not. The gather tab's pool is nineteen monster parts against six stock rows, so a
seven-lot block came out six parts and one bar; the Nek's material block came out
five quintessence and one core against a pool of thirty-five and two. The slots
now alternate between the kinds, and the fault checker asserts that every tab
sells everything in its own name.

### And it takes consignments

Round 47 hid the Sell toggle here — *"the auction house is a one-way block; you
bid on lots, you do not consign to it"* — which was true of a board that sold
only essences and stones and is the wrong shape for what this round added. Half
of *"sell what they have to purchase what they need"* needs a Sell tab. Cores and
stock join the sell list, which is the first time either has been sellable at
all.

---

## The estate

**Four suite failures, and every one of them a race in the test rather than a
fault in the game.** Chasing them was worth the time because two had been coin
flips for rounds and nobody had measured why.

### The key press that was never heard

`test_round22` and `test_round80_saves` both failed intermittently on pressing a
key. Round 79 had already diagnosed one of them as a focus problem and fixed the
focus; it stayed a coin flip.

Measured this round, the state on a passing run and a failing run was
**identical** — no overlay, canvas focused, `nearDoor: 'blacksmith'`, cooldown 0
— which ruled out everything the previous diagnosis had blamed. The actual cause:

> `keyboard.press` sends keydown and keyup a millisecond or two apart, and both
> `interact` and the save keys are polled with `JustDown(...)` from `update()`.
> A press that begins and ends between two frames is never seen. On a two-core
> container at a variable frame rate, that is sometimes.

Held across a couple of frames instead of tapped. Round 22 went from a coin flip
to three clean runs; round 80 from 3 failures to four clean runs, with one extra
fix — a clear frame between a key's release and the next press, because
`JustDown` compares against the previous frame and a keyup and keydown inside one
frame reads as "still down".

### Two latent crashes in round 22, one hiding the other

`s.doorways.find(d => ... d.room.id === roomId)` throws on a **generic** doorway,
whose `room` is filled in at entry rather than at build (round 66). A throw
inside `page.evaluate` kills the process and silently skips every assertion after
it. It surfaced now because round 90's hamlet fix built three more houses and
moved a generic door ahead of the smithy's in the array — the crash has been one
array order away since round 66.

Guarding it exposed a second of exactly the same shape: `sp.texture.key` over
`interiorSprites`, which holds two drawn **Polygons** (round 82's sewer ladder —
the lit pool and the shaft of light). A shape has no texture. Both guarded.

### One assertion that outlived its design

`test_round47_ui`'s `item1_auction_has_no_sell_tab` is now
`item1_auction_opens_on_buy_and_now_takes_consignments` — the auction takes
consignments at your request, and what round 47 was really protecting is that the
screen opens on Buy, which still holds.

`test_round90`'s two cultist-drop checks are inverted for the same reason: they
asserted round 90's own reasoning, which item 1 of this round overturned.

### Known flake, unchanged

`test_round49_taunt` fails under full-estate load and passes alone. It is one of
the three suites the runner already isolates because *"they measure the machine,
and the machine has two cores"* — measured this round at **7 frames in 2 seconds**
against a 21-frame clean-page baseline. That is the container, not the build.

---

## Files

| | |
|---|---|
| `src/data/nodeArt.js` | **new** — which cell a family and tier draw, and `nodeArtFaults` |
| `src/data/auction.js` | **new** — the two material blocks, the region gate, the markup, `auctionFaults` |
| `src/data/loot.js` | `humanDrops` — what a person leaves |
| `src/scenes/WorldScene.js` | the node art path, the tree stands, the human drop path, the auction's three tabs, cores and stock priced and sellable |
| `index.html` | the three auction tab buttons |
| `extract_round91_nodes.py` | **new** — 25 delivered objects plus a drawn stump |
| `public/assets/harvest_nodes.png` | **new** — 26 cells |
| `tools/tests/test_round91.cjs` | **new** — 36 checks |
| `test_round22`, `test_round47_ui`, `test_round80_saves`, `test_round90` | the races and the two superseded assertions |

---

## Left open

- **`test_round49_taunt` under load.** The machine, not the build, and the
  runner already isolates it. Worth a real fix if it ever fails alone.
- **The jewelcrafter's own shopfront**, still. He works out of the auction house
  and you have said that is fine.
- **The 56 authored confluence lines** for the crafters.
- **`expose`'s magnitude against real monster resistances** — still by analogy
  with `sunder` rather than measured.
- Carried: the round-32 armour zip, the ten cults placed in the overworld, the
  bounty bonus that grants nothing, the minimap redrawing every frame, Act 3's
  portal specialist, `player.godStanding`.
