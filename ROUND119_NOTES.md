# Round 119 — a way through, and a sentence that told the truth

Two reports, both correct, both with a cause one level below what was
reported. Version stamps `119`.

---

## 1) "Traps are placed without a safe path for the player in the sewers"

There was no safe path. Not "a tight one" — **none**.

The traps are hand-placed `^` marks in `SEWER_MAP`, and a trap's danger is a
**radius in world units, not a tile**: `steam` reaches 44 and `grate` 38
against a 32-unit tile. So a single mark can close a three-tile corridor while
the ASCII still looks wide open — which is exactly why reading the map has
never caught this, and why every existing sewer check passed. None of them
asked where a player can *walk*.

`tools/check_sewer_path.mjs` walks it instead — breadth-first from `S` to `X`
with every tile whose centre falls inside a radius treated as wall:

```
route ignoring traps : 73 tiles
route avoiding traps : NONE -- no route

the traps that close the route:
  removing Split steam pipe at (12,4) OPENS a route
```

One trap. It sat in the one-tile gap between the two water runs on the opening
row, so the only way east out of the start ran straight through it.

**Two moves, chosen by search rather than by eye** — each trap kept as close to
where it was placed as possible while leaving a route, refusing any spot that
crowds another trap or sits on the doorstep:

| trap | was | now |
|---|---|---|
| Split steam pipe | (12,4) — in the gap | **(12,8)** |
| Rusted jaw trap | (6,6) — 4 tiles from another jaw | **(4,9)** |

```
route ignoring traps : 73 tiles
route avoiding traps : 75 tiles
closest pair 6 tiles (was 4) · nearest to spawn 6 tiles
```

The safe route costs **two extra tiles**, which is the point: the hazards are
still on your way, still worth respecting, and now avoidable.

Three new data-lane checks hold it: a route exists, no two hazards sit within
six tiles, none is within six of the spawn. Falsified by putting the steam pipe
back — `FAIL … NO SAFE ROUTE`, and `closest pair 2 tiles`.

## 2) "no way to spend life on the ability"

> *"+8% per tenth of your own blood spent (max +56%)"*

The mechanic was right and the sentence was wrong. `selfDepletion` reads
**missing** health — `floor((1 - hp/maxHp) * 10)` — so it pays out for damage
already taken. Nothing spends life to cast it, and the card's own cost line
said `8 mana`. "Spent" names an action a player will go looking for and never
find.

This is the project's naming rule with its halves swapped: *the name carries
the flavour, the description states the mechanic*. Blood is fine as flavour.
Blood you **spend** is a mechanic that does not exist.

```
was : +8% per tenth of your own blood spent (max +56%)
now : +8% per tenth of your own blood already lost (max +56%)
```

The other two clauses for the same variant were already honest ("already gone",
"you are missing") — only the middle one implied a price.

**Generalised rather than patched.** Every variant in `SCALE_MODES` is a
*condition*, not a price: what the target carries, how hurt you are, how far
you have run, who stands with you. So the check greps every clause in the table
for the language of expenditure — `spent|spend|pay|paid|costs|sacrifice|expend`
— and fails on any of them. One grep instead of one fixed string, so it catches
the next one somebody writes.

### The check that could not fail, caught before it shipped

The first version of that check read `SCL.ABILITY_SCALING` — **a name that does
not exist**. `table` was `{}`, it iterated zero clauses, and it passed. It
survived a deliberate re-break of the exact wording it exists to catch, which
is how I found it. The export is `SCALE_MODES`; there is now a companion check
that the table is non-empty (`5+ variants, 12+ clauses`), so an export rename
fails the lane instead of quietly emptying it.

Re-falsified after the fix:
`FAIL no scaling clause claims a cost the ability does not charge — selfDepletion: +8% per tenth of your own blood spent (max +56%)`

## Testing

| lane | result |
|---|---|
| data lane | **331/331** (was 326; 5 new checks, all falsified) |
| `test_round115_runtime` (the sewer) | 39/39 |
| `test_round118_palette` | 11/11 |
