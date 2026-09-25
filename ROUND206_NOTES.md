# Round 206 — the stone decides how, and the card says so

Three layers now, and one of them already existed:

| layer | decides | where |
|---|---|---|
| **Essence** | the **tokens** — what you deal in | `essenceTokens.js` |
| **Awakening stone** | the **verb** — how you deal in it | `kitSynergy.js` *(new)* |
| **Confluence** | the **shape** — dps / tank / healer | `buildClasses.js`, **since round 190** |

`buildClasses` has been doing the third correctly for sixteen rounds. It reads
the confluence name, and for *shape* that is right — the name is exactly what
should decide whether you're a tank. It was only ever wrong as a hook for
**synergy**, which is what 205b found on Arsenal.

---

## 206b — your three corrections

**1.1 "Abilities don't call out the other essences."** Right, and it deletes the
problem this whole round was built around. The clause is now exactly the
sentence any other applied condition gets:

```
Each hit has a 35% chance of [Bleeding] for 5s.
```

Indistinguishable from the ability's own debuff clause — **because it is the
ability's own**. The synergy isn't something the ability advertises, it's the
reason the ability came out that way. There is no synergy voice left to get
wrong, only `debuffClause`'s, which has been in service since round 57. The
guard now *refuses* the word "essence" — the exact reverse of the rule it
enforced this morning.

**1.2 The awakening stone.** Two faults in one note.

*The card never said.* It does now. The head line stays as canon writes it —
the essence in brackets, round 201's rule — and the stone gets its own line:

```
Ability: [Fury Slash] (Sword)
Special attack (recovery, damage-over-time).
Awakening stone: Cloth.
```

*And the seed ignored the stone entirely* — which that very card proves, since
a **Cloth** stone was granting `[Burning]`.

Vetoing anything the ability's element couldn't carry was my first fix, and it
was correct and nearly useless: coverage fell **35.7% → 16.3%** and the result
was **72% `[Bleeding]`**, because physical dominates both catalogues and
`[Burning]` needs a fire-element ability to land on.

Your own framing is what settles it — *"not to overwrite the awakening stones
combination with essences but to help provide guidance."* So the source essence
**guides** (its condition is taken where the ability can carry it) and the
ability's own element, which is the stone's doing, **decides** when it cannot.

| | before 206b | strict veto | shipped |
|---|---|---|---|
| kits with a clause | 35.7% | 16.3% | **35.7%** |
| element mismatches | many | 0 | **0** |
| condition spread | — | 72% bleed | bleed 56 · poison 17 · unholy 16 · freeze 5 · holy 3 · shocked 2 · burn 2 |

**2. The seven sins flexing by kit and stone** — noted for when `gate` lands.
Each sin is a rule, and what breaking it *costs* should come from the stone and
the rest of the kit, not be fixed per sin. That's the same essence-guides /
stone-decides split as above, which is a good sign it's the right seam.

One more thing the suite gained: it now rebuilds the **exact** expected clause
rather than matching its shape. Now that the synergy clause is deliberately
indistinguishable from the ability's own, a shape regex was grabbing whichever
came first and could have passed on a sentence this round never wrote.

---

## The flagship case

```
Ability: [Rippling Strike] (Sword)
Special attack (curse, damage-over-time).
Current rank: Silver 2 (30%).
Effect (iron): A strike with your weapon, force riding the edge … 26% of the
  damage it deals is returned to you as health. From your Fire essence: each
  hit has a 25% chance of [Burning] for 5s.
Numbers now: weapon strike · 11.76s cd · heals 26% of damage dealt ·
  25% chance of burning for 5s (setting the target alight) · 9 stamina
[Burning] (affliction, stacking, burning): Setting the target alight.
```

That is your own sentence — *"sword abilities that trigger bleed and fire"* —
produced by the generator rather than written by hand.

**The brackets are load-bearing.** `abilityCard`'s `conditionsOf` resolves every
`[Bracketed Label]` against the condition registry, so a clause naming
`[Burning]` explains itself one line down for free. A clause that said "sets
them alight" would not.

---

## One verb of six is wired, and the other four are named every run

`seed` rides `spec.debuff`, which the runtime has applied at nine call sites
since round 57 — no new damage plumbing at all.

- **`detonate`** needs a per-ability-against-this-target multiplier threaded
  through about twenty damage sites.
- **`alias`** is meaningless until `detonate` exists to read the tag. Shipping
  it first would be a field written by one side and read by none — the fault
  class this project has now paid for five times.

So `synergyPending()` returns them every run and the suite asserts its
**contents**. A verb in the table that nothing reads cannot be quietly
forgotten between rounds, and a new one cannot be quietly added either.

I split that out of `synergyFaults()` after the first cut, because a faults
list that always has one entry in it is a faults list nobody reads — which is
how the real fault gets lost.

---

## The wording, which you flagged as the risk

**The lead names the essence plainly, and the first cut did not.** It opened
with the essence's `phrase`, which is the house voice:

> *Venomous patience runs in it: each hit has a 30% chance of [Poisoned] for 6s.*

Beautiful for a Snake. Measured over 300 kits it also produced:

> *Sure-footed stubbornness runs in it: each hit has a 30% chance of [Bleeding]…*
> *Unbothered calm runs in it…*

— because every beast, smallbeast and flyer family carries `dot: Bleed` and
their phrases are about temperament rather than wounds. **A poetic lead that is
right four times in five is exactly the sentence this project has spent five
rounds deleting.** So: `From your Fire essence:`. Always true, never silly, and
it does one thing the phrase could not — a player reading it on a sword ability
can see the engine working without anyone explaining it.

**Three more guards, all structural rather than lexical:**

- `clauseFaults` runs over **every clause the generator can produce**, not a
  sample: names a condition the card can define, carries a figure, names its
  source, no vague words (`synergis*`, `enhanc*`, `boost*`, `stronger`…), and
  no comparative with nothing to compare to — round 204c's rule, *reused*
  rather than restated, so the two cannot drift.
- **The mechanic reaches the numbers line.** `debuffStatsFragment` folds the
  seeded condition in. Describing it in prose and leaving it off the figures is
  round 57's split facing the other way.
- **No card is buried.** `canSeed` refuses an ability already carrying three
  conditions, and the resolver takes the emptiest cards first. Refusing crowded
  ones outright was the first cut and cost coverage 38% → 23%; sorting instead
  keeps the coverage and still puts the clause where there's room.

---

## Measurements

| | |
|---|---|
| essence pairs connected by a token | **98.1%** *(31.0% share an element — the only link before)* |
| trios that close a loop | **99.976%** — 126 of 526,196 do not |
| trios carrying a passenger | 0.4% |
| kits carrying at least one clause | **35.7%** |
| clauses per kit | 0.44 |
| clause faults | **0** |

Coverage is thin, and that is one verb of six rather than a problem: a socket
lands on `seed` 21.9% of the time by design, because the stone choosing the
verb is the whole mechanism. It rises as the other four land.

**The 126 non-closing trios are all `fire + smallbeast + (guard | life)`** —
`guard` wants only support tokens and neither of the other two supplies one.
That's the family-collapse gap the authored pass exists to close. I did *not*
bend the lever table to fix it: changing a lever row to close 0.024% of trios
would quietly change how 148 essences compose, which is a worse trade than the
gap.

---

## A second alchemy correction

Yesterday's fix gave alchemy `['linger','turn','renew','mend','absolve']` — two
healing levers and no way to spend anything. So it still wanted only support
tokens, and **84 trios still could not close a loop, every one holding an
alchemy essence.**

`burst` in place of `mend`: *"spends everything at once and asks for the
cooldown afterwards"* is the Crucible and the Catalyst, two of that family's
four stones, and it wants `stack` and `mark` — which is exactly what the
precision families supply. `mend` was the weaker of the two healing levers and
said nothing `renew` does not. Non-closing alchemy trios: **0**.

---

## Regression

**`r206c` (206b): 201 suites, 182 ok, 1 fail, 4,994 checks.**

Only `test_round132_world`, standing since round 200. **Best result since
that suite started failing.**

`test_round23` passed this run, which confirms the earlier diagnosis: it is a
pre-existing flake, not a round-206 regression. Run three times at r205b it
gives 49/49, 49/49, 48/49, and its own comments name the cause — *"the guard
reached a DIFFERENT monster first"*, because the check parks a monster beside
a guard who may already be fighting someone else. Still worth fixing (target
the guard's actual target rather than `monsters.find(alive)`); I've left it
alone rather than touch it silently.

---

## Your answers, and one reframing

**1. The levers are fine.** Unblocks the authored pass.

**2. "I don't know what you're looking for with detonate."** That's on me — and
your Sin examples show the idea was too narrow anyway. See below.

**4. Sophie's costs:** low initial damage, no extra armour or passive defence,
no taunts, no terrain manipulation or control. Four axes, not two. She isn't
richer than the others; I'd mis-read her.

**3 — and this is the one that changes the design.**

> *"Sin is about transgression. Debuffs that punish for breaking set rules."*
> *Sloth's Inferno — Cursed lowers fire resistance by 5% for every 100 paces
> moved while active.*
> *Pride Reaper — enemies at full health take 50% more damage from critical
> hits with a scythe.*
> *Greed's Arsenal — special attacks with 2 weapons equipped cost 15% less and
> deal 15% more.*

All three are **a predicate on the moment, plus an effect**. And the game
already has that shape — `TRANSCENDENT_GATES` in `transcendent.js`:

```js
markedFirst: {
  label: 'against a target already carrying three of your afflictions',
  kind: 'setup',
  check: (c) => (c.targetAfflictions || 0) >= 3,
},
onTheBrink: {
  label: 'while you are below a quarter of your health',
  check: (c) => c.selfHpFrac != null && c.selfHpFrac <= 0.25,
},
```

`markedFirst` **is detonate** — "the target already carries a condition" is one
predicate among many. So the verb I was calling `detonate` is really **`gate`**:
*a bonus that applies only while something observable is true.* Detonate is one
gate family; your three sins are three more; `onTheBrink` and `outnumbered` are
already written.

That's better in three ways: it reuses a `{label, check}` table that exists and
is already tested, it carries its own prose (so the wording problem is a table
of labels rather than a generator), and it makes Sin expressible — which
`detonate` never could have.

**The 7 deadly sins as a rule set** is the part I'd not have got to on my own.
Each sin is a rule you are punished for breaking or rewarded for keeping:
Sloth = don't move. Pride = be untouched. Greed = carry more than you need.
That gives Sin seven authored gates and an identity no other essence has.

---

## Next, in order

1. **`gate`** — the reframed verb, built on `TRANSCENDENT_GATES`' shape. The
   gate table is the wording, which is the answer to the problem I flagged.
2. **The seven sins** as Sin's authored gates — the first row of the authored
   essence pass, and the one that proves the pass is worth doing.
3. `alias`, once `gate` exists to read the tag.
4. `test_round23`'s guard check — target the guard's target.
