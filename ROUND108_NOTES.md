# Round 108 — nineteen levers become twenty-one

---

## What was asked

Four items of "substantial unbuilt work", prioritised by the user:

1. The **composer** — `ability = type × effect count × effects × modifiers ×
   damage types`.
2. The **21 levers** — `bind` and `ward` each doing two unrelated jobs.
3. The **93 generated spaces** the editor cannot reach.
4. Ten **coverage partials** left over from round 105.

This round is item 2, complete. Item 1 is begun and described at the bottom.
Items 3 and 4 are open.

The user's choice on how to split 88 essences: **"I derive it, you
spot-check."**

---

## The split

`bind` was doing two unrelated jobs — holding something in place, and stopping
it acting — and `ward` likewise: turning harm aside, and lifting what has
already landed. One lever cannot mean two things and still be a gate.

| retired | becomes | |
|---|---|---|
| `bind` | `anchor` | takes the ground away |
| | `muzzle` | takes the tempo away |
| `ward` | `bulwark` | turns harm aside before it lands |
| | `absolve` | lifts what has already landed |

`src/data/leverSplit.js` carries the derivation: 58 `bind` rows and 51 `ward`
rows, each recording **the verbs and body that decided it**, so the split is
reviewable rather than assertable. Six bind essences and three ward essences
take **both** halves, which is a real answer and not a failure to choose.

Tally — bind: anchor 36 / muzzle 16 / both 6. Ward: bulwark 42 / absolve 6 /
both 3.

`RETIRED_LEVERS` records what each name used to mean and what it became, and
`leverPlanFaults` now asserts the retired names are **actually gone**.

---

## The four tables that were keyed on a name that moved underneath them

This is the round's fault class, and it turned up four times in one afternoon.

1. **`LEVER_THEME`** — 88 essences suddenly cast **no vote** on their own
   confluence theme, because the table was keyed on `bind` and `ward` and they
   no longer said either.

2. **`LEVER_CHARTERS`** — 51 essences' charter evaporated entirely. Measured
   consequence: *"18 of 148 essences deny `damage_direct`"* against an expected
   band of 45–80. The charter system was silently not applying to a third of
   the roster.

3. **`CONFLUENCE_AFFINITY`** — three confluences lost the lever names they
   scored on.

4. **Double voting.** An essence carrying *both* halves of a split cast two
   votes where it used to cast one, so the split quietly reweighted the theme
   election. Collapsing per *theme* fixed it and was too blunt — it moved a
   second confluence. Narrowed to collapse only split halves, via
   `SPLIT_PARENT` derived from `RETIRED_LEVERS`.

Neither `anchor` nor `muzzle` refuses `damage_direct`, which is round 51's
Might lesson held onto: a lever that describes *how* you act is not a licence to
forbid the most common thing anyone does.

---

## What moved, and what that is not

One confluence name changed: `trowel + sloth + death` reads **Guardian** where
it read **Boundary**. Accepted and re-pinned, with the reason recorded at the
pin — the namer matches lever names as **literal words**, Sloth stopped saying
`ward` and `bind` and started saying `bulwark`, `absolve`, `anchor` and
`muzzle`, Boundary's list contains `bind` and Guardian's contains `bulwark`.
That is the namer working correctly on new input, not a scorer regression, and
the distinction is the whole reason the pin carries a comment.

Kit shape improved measurably: off-shape kits (not 12 active / 8 passive) fell
from **1.50% to 0.33%**. `tools/tests/test_round17.cjs` had a single-kit
exact-12/8 assertion re-specified to "within one of 12/8" — the assertion was
describing a sample, not a rule.

`tools/kit_baseline.mjs` was written this round and two baselines pinned:
`kits-r107-before.json` and `kits-r108-levers.json`. It exists so that when the
composer lands, *"did the world get less varied"* has an answer that is not a
memory.

---

## The composer, begun

`src/data/composer.js` is written, self-checking and **not yet wired to
anything** — it ships inert in this build. It is data and arithmetic only: 18
effect atoms, 4 modifiers, 7 deliveries, per-rank effect-count bands, and the
lever gates that keep a composed ability a statement about the build that
produced it.

Two faults were found in it before it had produced a single ability, both by
writing the check first and watching it fail:

- **`dot` paired with `contagionable`**, which is not an atom. It was trying to
  say "contagion attaches to this" — something `MODIFIERS.contagion.appliesTo`
  already says and `pairs` has no way to mean. A bias that never fires reads in
  the table as a rule the composer has never once acted on.
- **Gold produced 2, 3 and 5 effects and never 4.** The spread was four
  hand-written slots — `[floor, typical, typical, ceiling]` — which is fine for
  a band of three values and wrong for a band of four. Inside the band at both
  edges, and a hole in the middle. No assertion about a band's edges can see
  that, so the probe now asks for *every* value.

The data lane grew from 277 to 285 checks, and the hand-written 18-atom list in
`tools/data_checks.mjs` was replaced with an import of `ATOM_KEYS` — a hand-copy
of a roster is this project's fault class two, and it has now bitten five
separate tables.
