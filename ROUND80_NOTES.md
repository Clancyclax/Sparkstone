# Round 80

Version stamp **80**. Seven items, one of which was a revert of my own round-79
work, and one of which was drafts only.

---

## 1) The walls in Cadence — reverted

> *"The walls in cadence have been messed up. They should not have been touched
> as now they are all rotated out of being continuous walls. Revert the walls."*

Withdrawn entirely, not softened. `wallFacingFor`, `WALL_END_ON_FACINGS` and
`WALL_FACING_BY_BORDER` are gone from `src/data/town.js`, and all three call
sites are back to what they were:

| call site | back to |
|---|---|
| `_buildOutlineWalls` | the literal `southeast / southeast / southwest / southwest` sides array |
| the ring loop in `_buildCityWalls` | `const facing = ringFacing;` — the tangent |
| `_buildPolygonWalls` | `facingFromMove(pts[0].dx, pts[0].dy)`, untouched |

`test_round49_outline`'s two assertions are restored word for word to the form
round 49 wrote them in — `facings.north === '[1]'`, `facings.west === '[3]'` —
and they pass. `test_round79c`'s two 6.3 checks are withdrawn and replaced by
the property the rule was actually breaking: **every side of the square is one
continuous angle of masonry**, which now reads `north:1 south:1 west:3 east:3`.

**Why the duplication was right and I was wrong.** Four sides, two facings looks
like a bug written down. It is not, because this is an isometric projection of
an *axis-aligned square*: the north and south borders are parallel lines on the
same screen axis, not opposite faces of a solid, so a course laid on one has to
be drawn at the same angle as a course laid on the other. Two screen axes, two
facings. What I read as "half the walls are drawn from behind" is the far side
of a city seen from outside, which is what the far side of a city looks like.

The one thing worth keeping from round 79 is the measurement, and it is now
recorded in town.js rather than acted on: a broadside course draws 276–310px
wide and an end-on one 118px. That is why a wall wants a *fixed* facing per run.

---

## 1.1) Every capital gets Cadence's square, each 20% larger

> *"To simplify the cities lets do the exterior wall border the way Cadence is
> supposed to be but make each city successively 20% wider and 20% longer."*

`_buildCitySquareWall` builds Cadence's geometry for the other three. Cadence's
own `_buildOutlineWalls` is **not** called by it and **not** changed — it is the
reference you are measuring the others against, and a shared helper is a shared
way to break it.

Sizes are generated from the sequence, not chosen, in region order:

| | half-width | measured off the built world |
|---|---|---|
| Cadence (region 1) | 50 tiles | 49.5 |
| Harrowmoor (region 2) | 60 | 59.5 (×1.202) |
| Karsk Landing (region 3) | 72 | 71.5 (×1.202) |
| Vashra (region 4) | 86 | 85.5 (×1.196) |

The hexagon and the octagon are gone. `_buildPolygonWalls` stays in the file and
is still what a `wall: { sides: n }` block selects, but nothing selects one now —
it is the road back if you ever want those shapes again.

**Two differences from Cadence, both necessary.** The gates are *found* rather
than declared: Cadence's three roads are written down, the other capitals' come
out of the region road network, so the wall asks the ground at every candidate
course and refuses to stand on a road, a river or a dock. And each unbroken run
is laid as its own arc with a stone at **both ends**, so every gate gets a jamb.
Without that second part the first pass measured Harrowmoor's widest gate at
**3.93 courses** against the 2.0 that one missing stone means — round 72's exact
symptom, from round 72's exact cause. It is 2.78 now.

`test_round72` (33/33) checks the shape by its own signature: nearest stone over
furthest is cos(45°) = 0.707 for a square, and a hexagon reads 0.866 and an
octagon 0.924, so it fails loudly if either comes back.

---

## 1.2 / 1.3) The city floors

> *"Ontaria should use the grey city tile for the city floor."*
> *"Bratugal should use the red brick tile for the full city floor."*

**Neither city had a floor to re-point.** Measured over each capital's own disc
before touching anything:

| | before |
|---|---|
| Harrowmoor | 5,992 path · 845 plaza · 376 street · **0 city** |
| Vashra | **11,720 grass** · 1,160 street · 793 plaza · 0 city |

Five sixths of Harrowmoor was gravel and six sevenths of Vashra was meadow with
houses standing on it. Cadence has 8,001 tiles of `TILE_CITY`, which is why the
capital reads as a city from above and those two read as a village green with a
grid drawn on it.

So the disc becomes city floor and the material comes from a single table
(`CITY_FLOOR_PLAN`), read by both paved branches of the ground renderer — which
had carried the same three-way `if` copied out twice. After:

| | after |
|---|---|
| Harrowmoor | 100% `cityTile` grey — frames 244 / 247 / 251 |
| Vashra | 100% `cityTile` red brick — frames 225–240 |
| Karsk Landing | unchanged; you did not mention it, so it keeps round 78's street tiles |
| Cadence | unchanged |

The streets and the plaza keep their **tile types** and draw the same material
through the same table, so the floor is one surface but the market placer still
finds a carriageway to stand a stall on and doors still find a road to face.

`bratugal_paving` (grey 244/247/251) survives as what it also always was —
the paving on Bratugal's *roads*, outside the city.

---

## 2) Saves

> *"Saves are not working. F9 does nothing, F5 just resets the game."*

**Three faults, one symptom each.**

**F5 reset the game because F5 is Chrome's reload key.** `addKeys(..., false)`
disables capture for the whole key list — correctly, and for a documented
reason: capture calls `preventDefault` on every code in it, which used to eat
characters out of the character-creator name field ("Testarossa" came back as
"Ttro"). But it applied to F5 too, so the keystroke went to the browser and the
page reloaded to the title screen. Capture is now re-enabled for **F5 and F9
alone**; neither is a character, so the reason the rest of the list stays
uncaptured is untouched.

**F9 did nothing because it was only polled while meditating.** The single call
to `_handleSaveInput()` was indented inside `if (this.player.meditating)` in
`_updatePlayer`, with a comment about a different feature. The save keys were
read on the frames the player was sitting cross-legged in a town and on no
others. The poll has moved to `_updateInner`, above the death early-return and
above the `uiOpen` gate round 73 froze the world behind — so you can now save
from behind an open inventory, which is exactly when people think of it.

**And the save list was a one-way door.** F9 shows the title screen over the
running game; Escape is handled below the `uiOpen` gate and never ran with it
up, and the only buttons were the slots and a Back that went to the *cold* title
menu. Now Escape closes it, Back returns to the game, and choosing a slot saves
and returns you to play instead of leaving you on a screen offering to start a
different run.

`test_round80_saves` (14/14) presses the actual keys rather than calling the
handlers — a suite that called `_handleSaveKeys()` directly would have passed
against the broken build on both counts. It writes a marker onto `window` before
pressing F5 and reads it back after, so a reload would fail the check.

---

## 3 / 3.1) The inventory on a controller

> *"L1 and R1 should navigate through the tabs left and right."*
> *"D pad should navigate Left, Right, Up and Down within the items in that menu."*

Shoulders for pages, D-pad for contents. Round 47 put the page turn on D-pad
left/right for a good reason at the time — you were having to walk down the
whole tab strip to reach the page — but it cost the D-pad its other half, so a
grid of stones could only be walked as a single line. L1/R1 are the two weapon
swings in play and both are gated behind `!uiOpen`, so there is no second
meaning to arbitrate.

**The D-pad is now spatial, not ordinal.** "Left, Right, Up and Down within the
items" is a claim about the screen, so `_stepMenuSpatial` asks the layout: every
control has a bounding rectangle, and the move goes to the nearest one that
actually lies in the direction pressed, scored by distance along the axis plus
offset across it (weighted ×2, so lining up beats being slightly nearer).
Stepping by DOM order would give you the reading order of the markup — on a
four-across socket grid, "down" would land on the socket to the *right*.

The fallback is ordinal on purpose: at the end of a row, or on a page that is a
single column, there is nothing in the direction asked for, so rather than a
dead button the press falls back to the step that direction implies.

The in-panel hint line and the Controls tab both say the new scheme.

`test_round80_pad` (14/14) installs a fake pad and calls the scene's own
`_handleMenuInput`, so every line under test is the shipped one. It asserts
about the **screen**: after D-pad right the newly selected control is to the
right of the old one and on the same line. It also builds the movement graph —
where each of four directions lands from every control — and checks that all
nine controls are reachable from the first, because the one way spatial
navigation can be worse than ordinal is by stranding something.

*Worth knowing:* on a fresh character the Essences page has **no focusable
controls at all** (0, 0, 3, 0, 9, 0, 0, 0, 0 across the eight tabs) — an Equip
or Socket button only exists for an essence or stone you are carrying. The suite
stocks the bag first.

---

## 4) Nine inventory drafts — `round80_inventory_drafts.html`

> *"Don't change the game, just generate some visuals for my own review."*

Nothing is wired in. One standalone page, four "cleaner interface" drafts and
five "flavour and aesthetics" drafts. I read **"3l5"** as 3–5 and did four.

Every draft renders the **same kit with the same real art**, harvested out of
the running game through its own `essenceIconUrl` / `stoneIconUrl` /
`confluenceIconUrl` — so what differs between the nine is only the design.

| # | | name | drawing on |
|---|---|---|---|
| 1 | clean | **Ledger** | Destiny inventory tables |
| 2 | clean | **Board** | Diablo III skill columns |
| 3 | clean | **Rail** | Destiny subclass detail pane |
| 4 | clean | **Lattice** | Diablo II's Horadric grid |
| 5 | flavour | **Grimoire** | Diablo II character screen |
| 6 | flavour | **Altar** | Diablo III cube / gem sockets |
| 7 | flavour | **Node Tree** | Destiny subclass trees |
| 8 | flavour | **Constellation** | Destiny sky maps |
| 9 | flavour | **Reliquary** | Diablo II stained glass |

**The problem all nine solve.** The shipped page is a vertical list of four
cards, each an eight-line stack of text rows: seeing the whole kit takes about
1,150px of scrolling, the three essences never share the screen with the
confluence, and a stone is a 22px icon on a text line — so "which stones do I
have" is a reading task rather than a looking one.

If you want a shortlist: **4 (Lattice)** is the strongest answer to "easier to
see as a whole" — sixteen sockets in one square, one column per essence, so the
shape of a build is a picture. **6 (Altar)** is the best-looking. **1 (Ledger)**
is the one that would still work with sixty stones in it.

---

## The regression

93 suites. Everything that failed and is not listed below is pre-existing and
recorded in round 79's notes (round19 ×2, round23, round24, round28, round38,
round45, round47's three real-time passive soaks, round48_runtime, round49_taunt,
round65, round48_agentA/B).

**Four suites this round's work made wrong, all now corrected:**

- **round47_ui** — `item9_dpad_leftright_pages` pinned the scheme item 3
  replaced. Inverted: the D-pad must *not* turn the page and the shoulders must.
  37/37.
- **round78a** — `7.12 Harrowmoor and Karsk use 217-219`. Harrowmoor left that
  plan on your instruction; the half that still stands is asserted and items 1.2
  and 1.3 are asserted in its place. 29/29.
- **round79b** — one Harrowmoor building reported as facing away from a street.
  Its exclusion tested `isCarriagewayTile` where it meant "standing on made
  ground"; `TILE_CITY` is made ground and deliberately not a carriageway.
  Widened to `isRoadTile`. 21/21, 0 away.
- **round50** — "wall collision chain is unbroken", worst overlap 56. `side` was
  a Cadence-only field until item 1.1 gave three more cities the same square, so
  the check was sorting four cities' west walls into one list by y and measuring
  the "gap" between the last node of one city and the first of the next. Filtered
  to `nek_city`. 44/44. **This project's fault class 2 again: a table keyed off a
  list that stopped covering its roster.**

**Two things left open, both yours to call:**

- **`test_round66`'s display-list cap is red at 4,075 against 4,000**, up from
  round 79's 4,014. The three bigger city walls are most of the increase. The
  options are the two from last round: raise the cap, or spend a round pooling
  the wall sprites the way the props and priests are pooled.
- **A rare `setTexture` on a destroyed sprite** still surfaces as "update fault
  (frame skipped)" in roughly one run in five. I added the `.scene` guard to
  three more places this round (the turret branch, the summon's position tail,
  and the gods' walk loop) on top of round 79's two, but I could not reproduce it
  in a 34-second soak with movement or across eight forced midnight rolls, so I
  cannot say it is fixed — only that three more of its possible sources are shut.

`tools/run_data.sh` 21/21.
