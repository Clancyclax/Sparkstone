# Round 93

Version stamp **93**.

Two items, 7,433 files, and the most important thing in the round is a
verification that found nothing wrong.

---

## What was asked

> 1. Added Body type 1 and 2 additional sprites for various states of equipment
>    as well as finally giving separate sprites for body type 1 fully armored
>    and with various equipment combinations. Some updated existing animations
>    as well. Do a full review and update for all the animations.
> 2. Running animation once fully geared should be the fully armored animation
>    for each body type now.

Four questions went back first. Three came back on the recommendation; one
corrected me:

> "Body type 1's weapon poses are specifically only fully armored. The partial
> armor states for both body types are idle only currently."

I had read the male weapon states as unarmoured, because the metadata's
`prompt` field is the *base character's* prompt ("wearing simple white
briefs") rather than the state's. It is the folder name that carries the
state. A contact sheet settled it in one look: full plate throughout.

---

## The review, measured rather than eyeballed

### The 45 existing combos are pixel-identical — and that mattered most

Round 32 mapped weapon combos to art by **folder index**. The manifest records
the resulting folder *name*, but a re-export that renumbered would have
silently drawn a sword-holder holding a scythe, and nothing anywhere would have
errored — no missing file, no exception, just the wrong knight.

So every one of the 42 `*full_metal_a*` states and the three ranged poses was
compared against the shipped atlas, all eight directions each:

| | |
|---|---|
| identical (mean abs diff < 1) | **45 of 45** |
| changed | 0 |

Mean absolute difference **0.000** across the board. The re-export is a clean
superset and the mapping held. This is the check that justified doing
correctness first.

### The male's south-facing run has been eight identical frames

Measured as mean absolute difference between consecutive frames — how much the
pose actually moves:

| direction | shipped | new |
|---|---|---|
| east | 9.27 | 9.27 |
| southeast | 9.55 | 9.55 |
| **south** | **0.00** | **7.29** |
| southwest | 11.02 | 11.02 |
| west | 8.91 | 8.92 |
| northwest | 7.77 | 7.77 |
| north | 4.22 | 4.22 |
| northeast | 7.75 | 7.75 |

Zero. The original export supplied **one** south frame, and `pack_run` repeats
the last frame to fill a row, so a body-type-1 character running toward the
camera — the commonest direction in an isometric game — has been sliding across
the ground without moving their legs since the day it shipped. Every other
direction is byte-identical, so the repack is surgical: one direction changed,
seven untouched.

Nothing else in the drop is an update to body type 2. `sword_axe`'s run is now
four frames where the shipped one is eight, which is a **downgrade**, so it is
not taken.

---

## 1) Body type 1 finally has its own armour

The game has had exactly one armoured knight since round 32 and it is body type
2's. A body-type-1 character who put on a full harness has been drawn as a
woman ever since. That is what item 1 is really about, and it is fixed:

- **its own full plate**, 8 directions, plus **its own 8-direction armoured run**
- **29 weapon poses**, resolved through the same combo vocabulary body type 2
  uses, so no second resolver exists to drift
- **body type 2's swing**, per the ruling — the export has no attack frames for
  body type 1, and in full plate the silhouette is armour rather than body

Body type 1's idle is never mirrored. The resolver's flip exists to reuse body
type 2's sheets for a reversed hand pair; body type 1 has its own poses in
their own hand order, so flipping one would swap the hands for no reason. The
attack, which *is* body type 2's sheet, keeps the flip. That is `idleFlip`.

### The suite found art that could never be reached — and there were two

`hammer_whip` is a pose body type 1 has and `resolveArmoredState` can never
return — round 33 recorded hammer+whip as one of only two art-less loadouts for
body type 2, "falls back to the hammer". The round 93 suite caught it as
`every_bt1_combo_is_reachable :: orphans: hammer_whip`.

The user's correction pass then turned up **the other one**: sheet 23 is a
shield ALONE, which is round 33's second art-less loadout ("shield alone falls
back to the dual-shield state"). So a body-type-1 player carrying nothing but a
shield now gets a knight carrying nothing but a shield, rather than one holding
two. Both gaps round 33 recorded are closed for body type 1.

`_bt1ComboFor` is the answer: one extra lookup on the player's actual hand
items — a pair in either order, or a single item — which only ever returns a
key body type 1 has art for.
It can add a pose and never take one away, and it is deliberately **not** in
`armoredPlayer.js` — widening that resolver's vocabulary would make every body
type 2 character start requesting sheets that do not exist.

### The classification was a visual read; the user corrected three of thirty

Round 33's note on the equivalent table is the warning:

> "the user reviewed a numbered contact sheet of all 42 combat states and
> corrected TWELVE of the round-32 visual reads."

Twelve of forty-two. So two automated matchers were tried before trusting my
own eyes, and both were too weak to ship on:

- **Silhouette IoU** against the confirmed body-type-2 states is dominated by
  the body, which is identical in every state. Margins came out under 0.02 and
  it called `Holding_a_sword` a dagger.
- **Subtracting the armour** to leave only weapon pixels is much better — it
  gets whip, scythe, bow, crossbow, dual-shield, dual-whip, dual-scythe and
  staff right with real margins — but the two bodies hold their weapons in
  different poses, so overall IoU tops out at 0.44 and it still calls a sword a
  staff.

`BT1_WEAPONS` was therefore the folder **names** (informative for this body:
`holding_a_whip_and_d` is whip and dagger) cross-checked against both the pixel
matcher and a contact sheet — and then put in front of the user on a numbered
sheet, exactly as round 32 was.

**Three of thirty came back corrected**, against round 32's twelve of
forty-two:

| sheet | folder | I read | it is |
|---|---|---|---|
| 20 | `holding_a_whip_and_s` | sword + whip | **scythe + whip** |
| 23 | `holding_a_shield_and_2` | dagger + shield | **shield alone** |
| 28 | `holding_a_sword_and_4` | sword + axe | **sword + warhammer** |

All three are the same failure: a truncated folder name read as the likelier
word — `_s` as *sword* or *shield* rather than *scythe* — or a second item
misjudged against a body that poses differently from body type 2's.

Correcting 20 **added** a pose rather than moving one: `sword_whip` had been
losing to it as a duplicate, so sheet 26 is now shipped and the count went from
28 to 29. `sword_axe` and `dagger_shield` are correspondingly *not* in body type
1's set and fall back through the shared resolver, which is what fallback is
for.

`tools/sheet_round93_bt1.py` regenerates the sheet if it is ever needed again.

---

## 2) Fully geared, the run is the armoured run

For body type 1 this is exact: it has one armoured run and every combo uses it.

For body type 2 it was already true by a longer road — its own run where the
combo has one, otherwise a single-weapon donor run, otherwise the bare harness
— and every one of those three is an armoured state. The suite checks all five
loadouts against both bodies rather than asserting the mechanism.

Round 32's own suite had two assertions about the donor run that were passing
by accident of the default body type. They are scoped to body type 2 now, where
that mechanism lives; body type 1's side is covered by the round 93 suite.

---

## Partial armour, and three honest limits

Both bodies now have real sprites for a single piece worn alone, and round 32's
colour pass still runs on top so a red helmet still reads as red — the ruling
was "use the new sprites, keep paint for colour".

### The first version of this table was wrong, and it shipped

It assumed one sprite showed one piece, read the slot off the folder name, and
dropped everything that collided. The user's review of the numbered sheet
corrected **nine of nineteen**, and the shape of the error was worse than a
mislabel: most of these sprites show **two or three pieces at once**, which a
one-slot table cannot say at all.

| sheet | folder | shipped as | actually |
|---|---|---|---|
| 4 | `Wearing_metal_greave` | body type 1's **boots** | chest + legs |
| 5 | `wearing_metal_gloves` | dropped as a duplicate | gloves + legs |
| 6 | `wearing_a_metal_helm_2` | unclassified | helmet + legs |
| 7 | `wearing_metal_greave` | dropped as a duplicate | chest + gloves + legs |
| 12 | `wearing_chest_armor` | dropped as a duplicate | chest + legs |
| 13 | `wearing_gauntlets_an` | unclassified | gloves + legs |
| 14 | `wearing_gauntlets_an_2` | unclassified | gloves + helmet |
| 15 | `wearing_leg_armor_an` | dropped as a duplicate | helmet + legs |
| 18 | `wearing_metal_chest_3` | dropped as a duplicate | everything but the helmet |

So six folders were discarded as "duplicates" when they were nothing of the
kind, and **sheet 4 shipped as body type 1's boots while showing a breastplate
and leg armour** — a player wearing only boots was drawn in plate. A greave
sounds like a shin; it is not what the sprite shows.

Each entry is a **set of slots** now, and the resolver picks the largest set
that is a *subset* of what the player is wearing. That degrades honestly:
wearing more than a sprite shows is fine, wearing less than it shows is not, so
the player is never drawn in armour they do not have. 8 sets for body type 1, 9
for body type 2, up from 5 and 4 single slots.

**Measurement did not settle this either.** Diffing each sprite against the
bare body and testing which single-piece masks are contained in the result
agrees with the user on 6 of the 9 corrections and over-detects on the other 3
— the poses differ slightly between sprites, so the masks overlap. Two folders
the user did not rule on (`wearing_a_metal_helm_2` and `wearing_metal_chest_2`,
both body type 2) are therefore **left out rather than guessed**, and recorded
in `PIECES_UNRULED`.

### Three limits that remain

1. **Idle only.** There are no run or attack frames for a partly-armoured body,
   so the armour appears when the player stands still and the bare body returns
   the moment they move. That is a visible seam and it is the art that exists.
2. **Fixed sets, not layers.** The sprites do not stack, so a loadout with no
   matching set draws the bare body — boots alone on body type 1, for instance,
   because neither body has boots-only art.
3. **No skin recolour.** The base body is recoloured per skin tone through
   `_appearanceCache`; these sheets are raw art, so a dark-skinned character in
   a breastplate reverts to the art's own tone while standing.

---

## The estate

**16 new checks, all passing.** `test_round32` needed the two donor-run
assertions scoped to body type 2 (above); rounds 71, 73, 74, 75, 82 and 92 are
untouched and green.

Carried, unchanged from round 92: `test_round49_taunt` and `test_round77a` 2.9
both measure the machine rather than the build, and the two dead suites.

---

## Files

| | |
|---|---|
| `extract_round93_bodies.py` | **new** — the repack, the verification it records, and `BT1_WEAPONS` |
| `tools/sheet_round93_bt1.py` | **new** — the numbered sheet for correcting the classification |
| `src/data/bodyArt.js` | **new**, generated — body type 1's armour, both bodies' pieces, the base-run provenance |
| `public/assets/armored_bt1/` | **new** — 30 sheets: the harness, its run, 29 weapon poses |
| `public/assets/armor_pieces/` | **new** — 17 partial-armour idles, keyed by slot set |
| `tools/sheet_round93_pieces.py` | **new** — the numbered sheet that caught the nine |
| `public/assets/player_run.png` | the frozen south direction, fixed |
| `public/assets/player_f_run.png` | repacked from the same export |
| `src/scenes/WorldScene.js` | the body-type branch, `_bt1ComboFor`, `idleFlip`, the partial-armour idle |
| `tools/tests/test_round93.cjs` | **new** — 21 checks |
| `docs/screenshot_r93_corrections.png` | the three corrected poses, plus the one the fix freed |
| `tools/tests/test_round32.cjs` | the two donor-run assertions scoped to body type 2 |

---

## Left open

- **Partial armour is idle only**, and the seam when the player moves is real.
- **Two partial-armour folders are unruled** and not shipped: body type 2's
  `wearing_a_metal_helm_2` and `wearing_metal_chest_2` (sheet 16 and 17).
- **Neither body has boots-only art**, so boots alone draws the bare body.
- **Body type 2 has no unarmoured weapon poses** — body type 1's 30 are all
  fully armoured, so neither body shows a weapon while unarmoured.
- **Body type 1 has no armoured attack frames** and borrows body type 2's.
- The female export's unclassified combination-armour folders.
- Carried: `test_round77a` 2.9's two caps genuinely disagree (200 vs 420); the
  jewelcrafter's shopfront; the 56 confluence lines; `expose`'s magnitude; the
  round-32 armour zip; the ten cults in the overworld; the bounty bonus; the
  minimap redraw; Act 3's portal specialist; `player.godStanding`.
