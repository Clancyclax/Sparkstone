# Round 128 — real flowers in the soul garden

> "Flowers attached single and fields. Recolor as needed to be interesting and
> thematic for each essence. The iron and bronze preview box should be 40% larger
> and be canceled when the meditation animation is canceled."

Three asks. All three done, plus the two things the screenshots caught.

---

## The art

17 single planters and 5 field tiles arrived. Four planters and one field tile
are in the build — chosen for **silhouette rather than detail**, because they are
drawn between twelve and twenty-four pixels across and what survives at that size
is the outline: a terracotta pot, a boot, a white ceramic pot, a metal can.

### Recolouring: the sprites are split, not tinted whole

The colours are the **player's**. A bed is one of their essences and takes that
essence's colour, and which essences they carry is not knowable when a build
script runs — Prism's problem again, one round later. So there is no set of
recoloured PNGs that could be baked in advance.

`tools/sheet_round128_garden.py` splits every flower into two rows of one sheet:

| row | what | drawn |
|---|---|---|
| 0 | **base** — pot, soil, stems, leaves | untinted |
| 1 | **bloom** — the petals alone, as a luminance ramp | tinted with the essence colour |

A whole-sprite tint would hand a Fire essence a fire-coloured terracotta pot.
Splitting the sheet is what keeps the pots pots.

Two details that had to be right:

- **Telling a petal from a pot.** The singles are white flowers, so a petal is a
  low-saturation, high-value pixel — and that alone is not enough, because
  several of the seventeen planters are white ceramic or pale concrete. The mask
  also has to sit above the pot line. Both halves were needed.
- **The bloom has to be a luminance ramp, not a hue.** Phaser's tint *multiplies*.
  The first cut only normalised each pixel's brightest channel, which leaves a red
  rose red — and a red ramp times a blue essence is very nearly black. Collapse to
  luminance first, then lift.

### What each rank draws

- **Iron** — one planter per level. Nine planters in a forty-pixel bed **overlap**,
  which is both the only way they read and what nine plants in one bed actually
  looks like.
- **Bronze and up** — the tilled-row tile, cropped to as many of its eight rows as
  the standing calls for. Bronze 1 is one row; Bronze 9 the full field. Past Bronze
  the tile layers, each layer smaller and higher, which is what "9 sets of 9 rows"
  looks like in a window.

## 40% larger

`GARDEN_GROWTH = 1.4`. Iron 122→171 wide, Bronze 146→204.

Applied to **all four** ranks, not just the two named — the sizes have to keep
climbing or the window would shrink at a rank-up, which `soulGardenFaults` refuses
and which would read as a demotion. It is also what makes the art legible: at the
old width a bed was thirty pixels across and a nine-plant row got three pixels
per planter.

## Cancelled on the keypress

`_requestMeditateExit` sets the phase, and the reverse animation then plays for up
to seventeen more frames. Gating on `_meditation` alone — which is not nulled until
that animation finishes — left the window hanging over the player's head for
about three seconds while they stood up and walked away. It now goes on `exiting`,
which is the keypress.

---

## Caught by looking

1. **The planters were sized off the row spacing.** A nine-plant row drew nine
   eleven-pixel smudges and left most of the window empty. A planter is a planter
   whether there is one or nine; what a fuller row means is that they crowd.
2. **One shared sprite pool, four beds.** Without a cursor through it, the fourth
   bed drew the third bed's planters.

---

## Lanes

- `tools/run_data.sh` — **426/426** (was 417; +9 for the art and the growth)
- `tools/run_one.sh test_round127_cycle` — **28/28** (was 19; +9 for the art,
  the tint split and the cancel)
- `test_round126_progression` 18/18 · `test_round47` 39/39 · `test_round44`
  75/75 · `test_round74` 73/74 (`javelin`, pre-existing)

**The Silver soul-space map moves to round 129** — it was pencilled for 128 and
this round went to the art instead.

Version stamp: **128**.
