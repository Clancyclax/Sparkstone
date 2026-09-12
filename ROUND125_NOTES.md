# Round 125 — Prism's chain: seven jobs, seven kitchens, and the answer

> "Her quest chain will be about figuring out what she wants her life to be when
> she goes back to earth. Each region should have some quests around trying a new
> job and trying to figure out how to cook. Her silver to gold transition is
> embracing her confluence essence (whatever it is) and realizing that this new
> world is a better fit for her anyway."

Round 124 put her in the game. This gives her something to want.

---

## The shape

**Fourteen steps, two per region, all seven regions.** Each region gets a **job**
she tries and a **kitchen** she attempts. They are real objectives on
`player.quests`, built through `_makeOffer` exactly the way a god's chapter and a
Division field stage are — so they track, they show in the Quests tab, they pay
through the ordinary turn-in, and they consume a gather step's parts like any
other.

| region | job | what lands |
|---|---|---|
| The Nek | Farmhand | gather |
| Ontaria | Dock Hand | supply |
| Elehyd | Road Warden | escort |
| Bratugal | Letters Tutor | case |
| Sirukh Sands | Salt Cutter | supply |
| The Cinderwaste | Smith's Striker | gather |
| Ixcuatl | Survey | survey |

Every kitchen step is a `gather` and only a `gather`. The fallback ladder in
`_prismStepOffer` refuses to turn a kitchen into a fight — the first cut shared
the job ladder and Ixcuatl's *"bring me everything, I've got a list"* came out as
"kill six Clawstrider", which is round 76's bat all over again.

**Region-gated, not region-ordered.** A player who reaches Bratugal early gets
Bratugal's step; Ontaria's is still sitting there when they come back. The cursor
only advances past steps actually finished.

---

## What the chain accumulates

Not a rank. A **record**.

Every completed job files one **verdict** — a single clause about what she made
of it. Four she liked, three she didn't, and the point is what the four have in
common:

> Farmhand — liked it. You can SEE when you're done.
> Dock hand — hated it, and was good at it. Not the same thing.
> Road warden — the one that felt like the mat. Standing in the way.
> Tutor — turns out I never hated this. I hated the building.
> Salt cutter — hated it. Nobody could tell whether I was any good.
> Striker — she stopped having to point. Best feeling I've had at work.
> Survey — the only job I've had that nobody had before me.

Nothing else in this project stores a player-visible opinion. That is the
feature: "figuring out what she wants" is not a decision she announces, it is a
pattern the player has watched pile up for seven regions.

---

## The cooking

Five rungs, and **the ladder is gated on rank as well as on lessons** — because
her own round-124 arc line is load-bearing data:

> "Don't eat anything I make before silver. I'm serious."

| rung | needs | dish | does |
|---|---|---|---|
| 0 | — | Prism's Attempt | **nothing at all** |
| 1 | 2 lessons, iron | Bewildering Stew | +15 stamina |
| 2 | 4 lessons, bronze | Field Supper | +30 stam, +15 hp |
| 3 | 6 lessons, **silver** | Stubby's Proper Dinner | + power ×1.15, 90s |
| 4 | 7 lessons, gold | Dinner, For Everyone | + power ×1.25 and speed ×1.12, 180s |

Rung 0 doing nothing is not filler. A joke item with a small heal on it is not a
joke, it is a weak potion, and the silver rung has to land against something. The
data lane asserts rung 0 is inert, that **no** rung below silver carries a buff at
**any** lesson count (checked through `cookRungFor`, not by reading the table),
and that the top rung is reachable by doing all seven kitchens.

The pot: talk to her with three monster parts and she cooks. Any parts — a
per-dish ingredient list would be a crafting system wearing a companion's face,
and there is already a crafting system two files over.

The five dishes are ordinary consumables (they stack, sell, and bind to the
D-pad), but they are **not loot**: `CONSUMABLE_LOOT_IDS` keeps them out of the
world's drop roll. A Bewildering Stew falling out of a wolf spoils the only joke
the bottom of the ladder has.

---

## The silver→gold turn

> "embracing her confluence essence **(whatever it is)**"

Prism is the one companion whose essences the player chooses, so her confluence
is not knowable when the writing is written. The gold speech carries a
`{confluence}` token that the scene fills from `m.confluenceName` at the moment
it is read — so a player who built her out of Fire, Iron and Cat gets her
embracing the **Confluence of Arsenal** by name, and a player who built something
else gets theirs.

The speech assembles itself out of the verdicts she actually filed, then:

> "…it's not a list of jobs. Every single one I liked is one where somebody could
> tell whether I'd done it well. …
> So: what do I want to be when I go back to Earth. I don't. That's the answer."

Gated on gold, needs at least two verdicts to compare, and **opens once**.

---

## Bugs found and fixed on the way

1. **`_isChainQuest` did not know about her.** Round 76's defect and round 88's
   defect, for the third time: a chain step paid at a quest board is paid *and
   deleted* without the chain advancing — so the step comes back and can be paid
   again, without limit. Caught by the suite, not by inspection.
2. **The board's chain row said "Report to the Division"** for anything that
   wasn't a god's, which was true of the only two other chains and would have
   sent a player carrying her farm job across the map to a lab. It now names
   Prism, the Society, or the Division correctly.
3. **`prismRung: 0` is falsy.** The loot-exclusion filter was `!def.prismRung`,
   which would have let exactly the one dish the list exists to keep out of the
   world fall out of a wolf.
4. **Three checks in `test_round49_team` had been red since round 124** — "all
   four confluences are different", "two stones seeded in each", "everyone has a
   kit" — because they counted the roster and the roster is now five, with a
   fifth who arrives deliberately blank. A red that means "the feature shipped"
   is a check that has stopped saying anything. They now measure the authored
   four *and separately assert that Prism starts with nothing*, which is her
   whole point.
5. **The Bratugal job's writing did not earn its objective.** A "Letters Tutor"
   whose errand resolves as a legal `case` reads as a mismatch, so the offer now
   says what the job under the job actually is.

---

## Also

**Prism's full kit was measured, not asserted.** The question before this round
was how many abilities a fully-equipped Prism has. The caps say 12 + 8 = 20, but
caps are a ceiling — round 124's suite only ever socketed four stones into her. A
full rack, built in the running game through the same two doors the panel uses:

```
3 essences → confluence, 4 innates, 0 sockets spent = 4 abilities
+ 16 stones (4 per slot, confluence slot included)
= 12 active + 8 passive = 20, all twenty distinct names
```

Her bonded familiar is one of the eight passives, not a twenty-first thing beside
them. `test_round125_prismkit` owns that number now.

---

## Lanes

- `tools/run_data.sh` — **387/387** (was 372; +15 for the chain)
- `tools/run_one.sh test_round125_chain` — **32/32** (new; walks all fourteen
  steps across all seven regions end to end)
- `tools/run_one.sh test_round125_prismkit` — **10/10** (new)
- `test_round124_prism` 38/38 · `test_round49_team` 26/26 · `test_round49_party`
  37/37 · `test_round122_signature` 20/20 · `test_round115_runtime` 39/39 ·
  `test_round27` 59/59 · `test_round65` 40/40 · `test_round73` 47/47 ·
  `test_round88` 28/28 · `test_round94` 48/48 · `test_round95` 41/41 ·
  `test_round96` 43/43

Version stamp: **125**.
