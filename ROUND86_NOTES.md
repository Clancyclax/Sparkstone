# Round 86

Version stamp **86**.

Three things built, twelve drafts drawn, and a crafting system specced.

---

## The three answers this round was built to

| | |
|---|---|
| Scope | Build 1, 2 and 3 this round; twelve drafts for review; crafting is round 87 |
| Crafting | **Spec first, then build** |
| Quintessence | A curated set, plus rare bonus drops |

---

## 3) Quintessence, renamed — and what round 85 got wrong

> *"there is no ember or bloom essence, but there is a fire essence and a plant
> essence"*

Round 85 invented a vocabulary — Ember, Rime, Bloom, Dawn — and a rank ladder
of its own, Dim through Perfect. **Both were parallel systems.** The game
already has 148 essences with names and rarities, and a "Bright Bloom Mote"
told the player nothing about anything else in it. Nothing in a build should
have a private taxonomy for a thing the build already names.

A quintessence *is* an essence's raw material, so it now takes the essence's
name, the essence's rarity and the essence's colour, and its price comes off
the same ladder every stone and essence is priced from. Fire Quintessence is
Common because Fire is a common essence; Dimension Quintessence is Legendary
because Dimension is.

**Where the rank went.** Round 85 put the monster's rank in the id, which is
what produced 35 rows of `Dim Ember Mote`. Rank now drives **quantity** and the
**odds of the rare drop** instead — which is the user's own example arriving
literally: twenty Plant over a session, and occasionally a Growth. A dragon is
still worth more than a rat, without a second axis in the name.

**The second table is the interesting half.** Every element has one obvious
primary and a short list of rarer, related bonuses, each rolled on its own so
two can land at once. And *where* you fight adds to *what* you fight: the four
regions carry the plain materials an element has no claim on, concentrated
magic gives up Magic and rarely Rune, and the Undercity — the one place in the
build that has actually touched the astral — leaks Dimension at 1%.

### Two faults the checker caught before the screenshots did

- **Frost's bonus was worth less than its ordinary drop.** The first draft made
  Ice the primary and put Water in the rare list; Water is Common and Ice is
  Uncommon, so the "rare" drop was the cheaper one. The rule that a bonus is
  never commoner than the primary caught it, and every element's primary is now
  the plainest thing it could be made of.
- **Thirteen materials could never drop.** The curated set had rows no table
  reached — a line in the bag nobody would ever see and a recipe ingredient
  nobody could get, which is only ever found by a player following a recipe to
  a dead end. `quintessenceFaults` now asserts reachability, and the region
  tables exist partly to satisfy it.

---

## 1.1) The stats sheet is a stats sheet

> *"It doesn't need to list quintessence, or weapons owned, or weapons equipped
> or left/right hand, or consumables, unabsorbed essences or awakening stones."*

Eight rows and three backpack sections came off the Character tab. Every one is
somewhere better: hands and the owned list are on Inventory beside the weapons
you would swap them for; parts and quintessence are on Inventory beside the
rest of what you carry; essences and stones are on the Essences page beside the
sockets they go into.

**One of the removals needed a move first.** Quintessence was on Character and
nowhere else, so deleting the section would have deleted the only place to see
it. It is a row in the carried-items table now, beside the monster parts it
will be crafted with — which is what makes the removal honest rather than
lossy, and the suite checks for it on the destination as well as its absence
from the source.

What stays is what a stats sheet is: what you have earned, what you are made
of, and what that adds up to. Rank moved to the top, because it is the number
the rest of the page explains.

---

## 2) The map opens where you are

> *"starting all the way zoomed out leaves the map as too far away in the early
> game"*

A region is 1024 tiles across and the canvas is a few hundred pixels, so fitted
it drew a whole country at about a third of a pixel per tile — technically the
map, practically a smudge, and useless to a player whose whole world is one
town.

It opens at **5×, which shows about 21% of the region** centred on the player —
the user's "about 20%" expressed as the thing that produces it rather than as a
magic number. The zoom ceiling went from 6 to 18 at the same time: the old
maximum was barely past this new default, which would have left the zoom-in
button almost nothing to do.

---

## The twelve drafts

`round86_drafts.html` — static, using the build's own tokens and panel chrome,
nothing wired in. The character shown carries Fire, Water and Plant with a
Balance confluence, and the four colours repeated through the glow drafts are
that character's.

| | |
|---|---|
| **1.2.1** paper doll + stats | **A1 Armoury** (doll centred, stats flanking) · **A2 Ledger** (doll left, stat cards right) · **A3 Ring** (slots around the figure, stat band beneath) |
| **1.2.2** stats + Reliquary | **B1 Split** · **B2 Banner** (essences full width, stats in three columns) · **B3 Focus** (one essence enlarged, showing what it contributes) |
| **1.3** essence glow | **C1 Corner wash** · **C2 Confluence seam** (the frame takes your colours) · **C3 Living field** (a 40-second drift) |
| **2.1** map tab | **D1 Centred frame** · **D2 Full bleed** · **D3 Atlas** (matted, compass, coordinate bar) |

Each carries its trade-off in a line underneath, because a draft without its
cost is a sales pitch. My pick where I have one: **B2**, the only layout where
nothing gets narrower than it is today.

**One conflict worth knowing before you choose:** A and B both want to own the
stat block. Picking one of each means the stats appear on two tabs. The
cleanest answer is to put them on whichever page you open more and let the
other show only what it owns.

---

## The crafting spec

`CRAFTING_SPEC.md`. A design to react to, not a build — the answer to question
two was spec first.

The shape: you bring a **frame** (what it is), **stock** (what it is made of,
15 rows across metal/wood/fibre, and the tier *is* the item's rank) and
**quintessence** (what it can do). Quintessence rarity sets **power**, the
item's rank sets **how many** effects, and the two together set **what kind** —
a grid, so "why can't I do that yet" is always answerable by pointing at a cell.

The mechanic that makes it the user's ask rather than a generic bench is
**resonance**: quintessence matching one of your bonded essences is worth
1.35×, and matching your **confluence** is worth 1.75× and a complexity tier.
The confluence is the thing a character cannot pick directly — it forms from
the three — so rewarding it rewards the combination, and it is why the crafters
in item 5 care about it most.

Nine decisions are flagged **▸ decision** for you to overrule, and four open
questions are listed at the end. The one I would most like an answer to:
**harvest nodes or monster drops for stock?** I specced nodes; drops are less
work and a worse economy.

---

## Tests

**`test_round85` is 33/33**, up from 25 — it covers both rounds now. The new
checks: every quintessence is named for a real essence and inherits its rarity;
round 85's invented vocabulary is gone (asserted as an absence, by pattern);
the stats sheet no longer repeats the inventory; what it kept is still a stats
sheet; the moved lists arrived on Inventory; and the map opens at 21% of the
region while still zooming to the full country and back in to 18×.

**Regression 96/96 recorded, no new failures** — `round41` ×3, `round43` ×4
under load, `round45` ×1, and `round48_agentA` and `round5_essence` dead, all
exactly as they have been since round 83.

---

## Numbers

| | |
|---|---|
| Quintessence rows | 35, every one named for a real essence |
| Reachable | all 35, asserted |
| Rows removed from the stats sheet | 8, plus 3 backpack sections |
| Map default | 5× ≈ 21% of the region (was fitted, 100%) |
| Map zoom range | 1× – 18× (was 1× – 6×) |
| Drafts | 12 |

## Carried forward

- **Crafting** — spec written, build it in round 87.
- **The guild quest chain.** Deferred five rounds now.
- **Place the ten cults.**
- The bounty bonus grants nothing.
- Consumables and monster parts still drop as bare rarity discs.
- The minimap redraws every frame at 2.1ms.
- Act 3's portal specialist does not exist.
