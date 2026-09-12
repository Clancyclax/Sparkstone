# Round 126 — the rank curve

> "Player moving straight from Iron to Gold when meditating. Experience should be
> harder each rank, and iron rank monsters should be worth almost nothing by
> silver rank."

Reproduced first. A fully-socketed character, one hoarded bank, one press of M:

```
start   0% into Iron 0     iron:0 iron:0 iron:0 iron:0
after   0% into Gold 9     gold:9 gold:9 gold:9 gold:9
```

Not Gold 0 — Gold **9**. Three separate faults stacked to produce that, and each
needed its own fix.

---

## 1. The curve was flat

`XP_PER_ESSENCE_LEVEL` was one number, 45, for every rank. A rank is ten levels,
so **every rank cost exactly 450 xp per essence** — Iron→Bronze and Silver→Gold
priced identically. Three ranks cost precisely three times one rank, which is not
a progression, it is a straight line with rank names written on it.

Now each rank's level costs `RANK_XP_STEP` times the one below:

| rank | xp per level | total from Iron 0 |
|---|---|---|
| Iron | 45 | 0 |
| Bronze | 135 | 450 |
| Silver | 405 | 1,800 |
| Gold | 1,215 | 5,850 |

**Iron is untouched**, so early pacing is the same game it was.

Measured in the running game, driving `_startMeditation` so the 20% bank and the
four-way split are both in the number — raw combat XP to cross each boundary:

```
iron -> bronze    9,000
bronze -> silver 18,000
silver -> gold   54,000
```

`RANK_XP_STEP = 3` is the **one tuning knob** — both tables are derived from it,
so retuning the whole game's pacing is a single number. Three rather than four
because of the bestiary: monster xp spans 8 (a slime) to 420 (a dragon), about
fifty times, and a curve that grew faster than the content it is paid out of
would leave a Silver player farming the only three things in the world worth
killing.

## 2. Nothing decayed

A monster's xp was its type's `xp` field, and nothing anywhere read the player's
rank. A Panterimp Grey was worth thirty at Iron and thirty at Gold — so the
fastest route to Gold was to never leave the first field.

A monster's **threat tier is its rank** (the project's own equivalence, already
what decides where it may stand and whether its stats are doubled), so the gap is
a subtraction and needed no second table:

| ranks above it | pays |
|---|---|
| same or below | 100% |
| 1 | 30% |
| 2 | 8% |
| 3+ | 2% |

Measured through `_killMonster` — not through the pure function, because a pure
function agreeing with itself proves nothing about whether the kill path calls
it. An iron-rank monster worth 14:

```
iron 14   bronze 4   silver 1   gold 1
```

**Never zero.** "Almost nothing" is the brief and it is the right brief: a hard
zero reads as a bug to everyone who has not read the code. The same decay applies
to cultists and bandit crews, which carry tiers of their own.

## 3. No boundary

`recomputeSlot` walked as many ranks as the xp would buy in **one call**, and the
top rank then absorbed every surplus level — which is why the measurement landed
on Gold 9 rather than Gold 0.

A sitting now crosses at most one rank, and landing on the next rank means
landing on its **level 0**: a rank-up is a thing you sit down and do. The xp is
not spent — the essence sits at the top of its rank with a full bar and the next
meditation carries it over. Measured:

```
sitting 1  100% into Bronze 0
sitting 2  100% into Silver 0
sitting 3  100% into Gold 0
sitting 4  100% into Gold 9     <- levels inside the ceiling still climb
```

**The cap is the meditation path's alone.** Save loads and rebuilds resolve the
whole curve, or a returning Gold character would be walked back one rank on every
load — the one way this fix could have cost somebody their rank, and it has its
own check.

---

## Bugs in my own fix, both caught by measurement

1. **The cap was recomputed on the second pass.** `_recomputeEssenceRanks` runs
   twice on purpose (the floor can rise between passes), and the first cut read
   the entry rank off `prog.rank` inside the loop — which pass one had just
   written. A "one rank per sitting" rule delivered two: `iron:0 -> silver:0`.
2. **Then it let surplus fill the new rank's levels.** With the cap fixed, a
   sitting crossed into Gold and kept climbing Gold levels off the same bank:
   `silver 0 -> "42% into Gold 3"`.

Both are the same fault: *a limit computed from the thing it is limiting is not a
limit*. The entry rank is a parameter now, and `recomputeSlot` owns the rule.

## Also

- **The player can see it happening.** "Experience should be harder each rank" is
  only a feature if the game says so. The essence card now prints the actual
  price of the next level beside the bar (`45 XP to Iron 3` at Iron, `405 XP` at
  Silver), and says `ready to rank up — meditate` when an essence has the xp and
  is waiting on a sitting — a bar pinned at 100% with no explanation is the shape
  of a bug.
- **Four places were hand-computing `level * XP_PER_ESSENCE_LEVEL`.** Correct only
  while the curve was flat. `xpForStanding` owns it now and every fixture resolves
  through it.
- **No price for a rank nobody can climb into.** The tables stop at
  `MAX_ESSENCE_RANK`; "no diamond-rank content anywhere" holds.
- **Round 44's suite had four checks red since round 124** — same as round 49's,
  fixed last round: they counted the roster against four and the fifth member
  arrives deliberately blank. They now measure the authored four and separately
  assert Prism starts empty.

---

## Lanes

- `tools/run_data.sh` — **403/403** (was 387; +16 for the curve and the decay)
- `tools/run_one.sh test_round126_progression` — **18/18** (new; reproduces the
  reported sequence and walks the fix)
- `test_round47` 39/39 · `test_round74` 73/74 (`javelin`, pre-existing) ·
  `test_round44` 75/75 · `test_round49_team` 26/26 · `test_round65` 40/40 ·
  `test_round73` 47/47 · `test_round88` 28/28 · `test_round94` 48/48 ·
  `test_round124_prism` 38/38 · `test_round125_chain` 32/32 ·
  `test_round125_prismkit` 10/10

Version stamp: **126**.
