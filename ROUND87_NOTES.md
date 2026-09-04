# Round 87

Version stamp **87**.

Three chosen drafts built, the crafting spec answered, five HUD drafts drawn —
and a bug in the test runner that had been quietly mislabelling failures as
passes for several rounds.

---

## What this round was built to

| You said | Where it went |
|---|---|
| *"I've selected B2, C3, and D2 for the inventory style updates."* | Built, all three |
| Crafting: **nodes**, **the crafter rolls**, **no Legendary**, **50–60 confluence lines** | `CRAFTING_SPEC.md`, rewritten around the second answer |
| *"lets start work on 5 drafts for the Player HUD... Look to World of Warcraft"* | `round87_hud_drafts.html` |

---

## D2 — the full-bleed map, and the two green bands

The map tab now fills the tab: the canvas sizes itself to the stage, the zoom
controls float over its corners, and it draws 1180 × 684 instead of a few
hundred pixels square.

Which broke the fog, in a way worth writing down because **reading the code did
not find it and a screenshot did.**

`_drawFlatMap` computes `scale = Math.min(w, h) / span`. On a wide canvas that
is correct and deliberate — the view reaches `span × 1.725` across and `span`
down, so a wide window shows more world sideways. The terrain draw handles it
without being asked, because it stretches one cached image over the whole world
rectangle. The round-19 **unexplored veil** does not: it loops the fog grid
between `cx ± span/2` on *both* axes.

On a square canvas those two agree and the code is right. On this one they do
not, and **21% of the width at each edge was drawn as raw, unveiled terrain** —
two bright green bands either side of a correctly-fogged middle.

The reason it is worth a paragraph is what it looked like. It presented as a
terrain-cache coverage bug: bright at the edges, dark in the centre, exactly as
though the cached image had failed to reach the sides. The instinct was to go
and read `_buildMinimapTerrainCache`, which is innocent and which would have
been read for a while. The thing that settled it in one step was arithmetic on
the two numbers — `w / scale` is `span × 1.725` and the loop bound is
`span × 0.5` — and the fix is four lines: ask each axis its own question.

**The suite asks the player's question, not the code's.** No assertion about
`_explored`, about `EXPLORE_DIM`, or about the loop bounds would have caught
this, because every one of them was correct in isolation. So `test_round87`
samples the luminance of the drawn canvas at both edges and in the middle, on a
canvas deliberately wider than it is tall, and asserts that ground the player
has never walked is dark **at the edge of the screen as well as in the middle**.
Before the fix the edges measured as raw terrain; after it, 18.3 luma at the
left, 18.3 in the middle, 18.3 at the right.

### The other D2 bug, which cost the most time

`position: relative` was added to `#inventoryPanel` while building the map, and
collapsed the whole window from 1180px to **318px**. It overrode
`.overlay-panel`'s `position: fixed` and took the centring transform's
containing block with it. Every tab still rendered, every element still
existed, no console error, and no suite in the estate noticed — the symptom
presented three layers downstream as an undersized map canvas.

`test_round87`'s first check is now the panel's own width, because a container
that silently collapses makes every measurement inside it a lie.

---

## C3 — the living field, and a measurement that came back wrong

Four blobs in the player's own colours drift behind the inventory window over
forty seconds. The three bonded essences and the confluence they formed; an
empty slot contributes the brass the panel is already edged in.

**The draft promised a frame-cost measurement, so here is the measurement, and
it is not the one I expected.** Sampling rAF deltas with the field present and
again with it removed says the drift costs **66.7ms per frame**. Four
follow-ups say that number is not about this effect at all:

| | |
|---|---|
| blobs present but `animation:none` | baseline |
| blobs present, animating, no background painted | 66.7ms |
| animating with layers promoted, and without | 66.7ms both |
| the same drift stretched from 40s to 400s | 66.7ms |

Invariant to paint, to blur, to layer promotion and to speed. It is a flat toll
for *any* running CSS animation over the panel, paid by a software rasteriser
recompositing the page beside the Phaser canvas — **four blobs cost exactly
what one would.** So there is nothing here to optimise, and the first
"optimisation" (replacing `filter: blur(64px)` with wider gradient stops)
bought precisely nothing and was reverted. Worth knowing rather than worth
fixing: the toll is only paid while the inventory is open, and while it is open
the panel occludes the world entirely, so the dropped frames are frames of
something nobody is looking at.

### The bug the suite found, which is the real story of C3

The colour check failed: all four blobs were the fallback brass.

`_applyEssenceField` was called from `_openInventory`, which is correct for a
panel whose contents cannot change while it is up. **This one's can. Bonding an
essence happens on the Essences tab, inside this panel.** So the single moment
these colours mean the most — you seat the third stone, the confluence forms,
and the window should become yours — was the one moment they did not update,
and would not until the player closed the inventory and opened it again.

It is now called from `_renderInventory`. The element is still only *created*
once, so the drift never restarts.

What found it was the shape of the assertion. Four blobs were present and
animating the whole time; a check that counted them, or checked they were
behind the content, or checked they were animating, passed throughout. The only
check that failed was **"are these the player's colours"** — the actual
promise. Same lesson as round 86's reachability check, arriving from a
different direction.

---

## B2 — the essences banner and the stats in three columns

The Essences page carries the four-panel reliquary banner full width, with the
stat block in three columns beneath it: attributes and recovery, offence,
defence and elemental resistance. Character keeps what it owns — name, rank,
standing, currency, XP, kills, region — and a line pointing at where the
numbers went.

**This landed as a failure in two older suites, and that was correct of them.**
`test_round20` asserted `charHasAttrs && !essHasAttrs`; `test_round85` asserted
the stats sheet still says what a stats sheet says, on tab 0. Both flags invert
under B2.

ROUND86_NOTES flagged this collision in advance — *"A and B both want to own the
stat block"* — so it is a decision landing rather than a surprise, and both
suites were updated the way round 47 and round 81 updated these same lines: keep
the claim, move the location. **And assert it as a move rather than an absence**,
because round 86's own rule is that a removal which loses information is not a
tidy-up. Each suite gained a check for it: round 20 is 20/20, round 85 is 34/34.

---

## The crafting spec, answered

`CRAFTING_SPEC.md`. Three of the four answers confirmed what was specced. The
second one changed the design, and improved it.

> *"Effects should be more varied and more interesting, stacking debuffs,
> lowering resistances. If the essence is likely to roll a specific effect or
> something on abilities the quintessence should as well."*

That last sentence is a whole design, and it is round 86's lesson arriving
again: **do not write a second effect table.** `debuffs.js` already holds
nineteen debuffs tagged by element and lever, and `thematicDebuffsFor(element,
levers)` is already the function `awakening.js` calls to decide what an ability
may inflict. Crafting now calls the same function with the same arguments:

```
quintessence -> its essence -> that essence's element + levers
                            -> thematicDebuffsFor(element, levers)
                            -> the pool the crafter rolls from
```

Fire quintessence offers burn and sunder because fire abilities offer burn and
sunder. **The promise is structural rather than maintained** — add a debuff to
`debuffs.js` and every quintessence that should reach it reaches it that day.

Two consequences worth flagging:

- **The complexity grid grew from five columns to seven.** The old five were a
  ladder of *bigness* — each rung the previous one with a larger number. The
  new columns are **Stacking** (two stacks per hit, and +1 to that debuff's own
  cap) and **Exposing**, which are the two things the answer named. They sit on
  the same rung deliberately: they are opposite answers to the same problem, one
  wins by piling on and one by getting through, and putting them a tier apart
  would make the choice a ranking instead of a choice.
- **A twentieth debuff is specced, in `debuffs.js` rather than in a crafting
  file.** `expose` — resistance shred. There is `sunder`, which cuts armour, and
  armour explicitly does nothing against elemental damage, so a full elemental
  build currently has no answer to a resistant target at all. It goes in the
  shared table because the user's sentence runs both ways: if crafted gear can
  expose a target, so should the abilities of an essence that ought to be able
  to. Its magnitude is written by analogy with `sunder` and **analogy is not
  measurement** — it needs tuning against real monster resistances before it
  ships, the way `powerDown` was retuned in round 57.

The "crafter rolls" reversal is specced with a floor under it, so it is not a
slot machine: you chose the pool, the kinds are gated by the grid, the count is
fixed by your stock's rank, and resonance is shown before you commit.
Confluence lines are set at **56** — every confluence reachable before Gold rank
without hunting a specific legendary — with three generic fallbacks rather than
one, because one fallback across the other 45 is a line a player sees twice and
recognises as the seam.

---

## The five HUD drafts

`round87_hud_drafts.html`. Static, at the real canvas size — 960 × 600 — using
the build's own tokens, because a HUD draft at any other size is not a draft of
this HUD.

Before the drafts, a page on what WoW actually does, because "look to WoW" can
mean a look or it can mean a grammar and the grammar is the part worth having:
one frame shape for every living thing; your pet docked to you rather than filed
with the party; corners owning categories; time read as a shape rather than a
number. The part **not** worth taking is WoW's density — it assumes a 2560px
monitor and an addon manager, and this canvas is smaller than WoW's action bars
alone.

| | | |
|---|---|---|
| **E1 Retinue** | Everything that fights for you hangs off you, in one column | Left column reaches 349px, and ~540 at full roster |
| **E2 Warband** | Companions with you, summons docked to the hotbar that cast them | Splits the retinue across two corners |
| **E3 Focus** | Bars become arcs; the outer ring is your four essence colours | The most compact at 204px, and the worst at "am I at 30% or 20%" |
| **E4 Command** | Twelve actives in two rows, retinue flanking | The largest bottom block, 528 × 115 |
| **E5 Rail** | One right-hand column owns every "what is currently true" readout | 17% of the width, permanently, and the centre of play shifts left |

Every figure is **measured off the mocks**, not estimated — and three of the
five numbers I wrote from intuition were wrong before I measured them (E4's
block is 528 × 115, not the 404 × 122 I had guessed). Nothing overflows the
canvas in any of the five.

My pick is **E1 for the retinue, E4's hotbar regardless, and E3 as an option**.
E4's two-row hotbar is worth taking on its own and independent of the rest:
**twelve actives with only ten visible slots is a real bug in the current HUD,
not a style question** — two of the player's abilities are unbound by default
and most players will never find them.

The companions in the mocks are the real four from `party.js`. The first draft
invented names, which is the round-86 mistake in miniature and was caught before
it shipped.

---

## The test runner was calling failures passes

The most useful thing found this round, and it was found by accident.

`run_fast.sh` decides a suite failed by looking for lines beginning with `FAIL`.
Several suites in this estate never print such a line: they tally as they go and
end with a single summary, `PASS 58  FAIL 3`. That does not begin with `FAIL`,
so the failure list came back empty and the runner wrote:

```
ok  test_round41 :: PASS 58  FAIL 3
```

The failure count sitting in plain sight, inside a line labelled `ok`. Reading a
97-suite log by its leading keyword — which is the only way to read one — those
three suites were invisible.

**That is how a known-failure list drifts.** Rounds 83–86 carried "round 41 ×3,
round 43 ×4, round 45 ×1" in the notes by hand, correctly, while a dozen suites
that *did* print FAIL lines were absent from the same list. The log and the
notes had each been half right for several rounds, and neither was wrong in a
way the other would reveal.

The runner now takes the suite's own summary at its word. Round 41, 43 and 45
report as failures for the first time in the log rather than only in the notes.

---

## The regression, and what it actually says

**97 suites: 61 ok, 15 informational probes, 19 failing, 2 dead.**

Every one of the 19 and both dead suites was **re-run against the round-86
baseline individually**, rather than compared to a list in a notes file. That is
new this round and it is the only reason the paragraph below can be written
honestly.

- **No new failures.** Every failing suite fails identically at `babe2d1`.
- **Two suites were fixed** — round 20 and round 85, both B2 collisions, both
  now passing with an extra check each.
- **Three suites are flaky in both trees**, characterised by repeated sampling
  rather than assumed: `round22` (0, 2 and 5 failures across seven runs with
  round 87; 0, 0, 0, 5, 5, 0 across six at baseline — an NPC-proximity race, the
  talk prompt beating the doormat prompt while Bram wanders), `round49_taunt`
  (±1, a real-time soak), `round73` (44–45/46).
- **`round65` and `round22` appeared far worse in the first full sweep**, which
  ran at load average 4.5 on two cores. Both are clean re-run alone. The lane
  caveat from round 86 stands and now has a number on it.
- **`round15` fails 48/50 on the controller's L1/R1 hand binding**, identically
  at baseline. Newly *identified* rather than newly broken — it is one of the
  dozen the runner bug was hiding.

---

## Numbers

| | |
|---|---|
| Drafts built | 3 of 12 (B2, C3, D2) |
| New suite | `test_round87`, 13/13 |
| Suites updated for B2 | 2, each gaining a check |
| Estate | 97 suites · 61 ok · 19 failing · 2 dead · **no new failures** |
| Failing suites verified against the r86 baseline | 21 of 21 |
| Essence field cost | 66.7ms/frame, and invariant to everything about the effect |
| Map veil coverage | 58% of the width → 100% |
| HUD drafts | 5, all measured at 960 × 600 |
| Crafting complexity grid | 5 columns → 7 |
| Confluence lines specced | 56, plus 3 fallbacks |

## Carried forward

- **Crafting build.** Spec is answered and has a build order. Step 0 is `expose`
  in `debuffs.js`, on its own, because it touches a shipped system.
- **Pick a HUD draft**, and take E4's two-row hotbar regardless of the pick —
  twelve abilities and ten slots is a live bug.
- **`round15`: L1/R1 fire the wrong hands.** Pre-existing, now visible.
- The guild quest chain. Deferred six rounds.
- Place the ten cults.
- The bounty bonus grants nothing.
- Consumables and monster parts still drop as bare rarity discs.
- The minimap redraws every frame at 2.1ms.
- Act 3's portal specialist does not exist.
- `player.godStanding` is written and read by nothing.
