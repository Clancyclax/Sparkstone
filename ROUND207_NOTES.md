# Round 207 — a gate, seven sins, the beast a name promises, and what a kit pays

Worked through the agreed order. **`r207a`: 201 suites, 181 ok, 4,993 checks.**
`test_round132_world` is the standing failure; `test_round91` is a drop-rate
sampling flake — "0 gear off 13 people" on the runner, 2+5 and 1+3 here across
two runs, and nothing this round touched reaches humanoid drop tables. Same
class as `test_round63`.

`test_round207.cjs` is new — 27 checks, 8 sections.

---

## 1. `detonate` became `gate`, and the rename is the design

Your three Sin abilities are all one shape: **something observable is true, so
something changes.** "The target already carries a condition" is *one predicate
of that kind*, not a category — so `detonate` was the wrong idea at the wrong
size, and your examples are what showed it.

The shape already existed. `TRANSCENDENT_GATES` is `{label, kind, check(ctx)}`,
evaluated once per cast. `synergyGates.js` is the same idea with a wider
vocabulary: **13 gates** across target, self, world and loadout, and **three
payloads** — deals more, costs less, comes back sooner.

**This is the answer to the wording problem rather than more of it.** A gate
carries its own label, authored beside the predicate it describes, so a clause
is two authored halves with nothing in between:

```
Pride -- against a target at full health, it deals 50% more.
Greed -- while you hold a weapon in each hand, it costs 15% less.
While you have stood still for two seconds, it comes back 25% sooner.
```

Twenty-odd labels is the whole prose surface. That's the thing I'd flagged as
maybe needing a heavier pass — it's a table now.

**One seam, not fifteen.** A per-target multiplier would thread through the
fifteen `_damageMonster` calls inside `_castKnownAbility`. Instead the gate
resolves once and is stamped on the cast's own clone, right where round 203
stamps the transcendent gate. The cost is real and I'd rather state it: in an
area attack the gate judges the **primary** target. That's already how the
transcendent gate behaves, so the two agree.

---

## 2. The seven deadly sins

| sin | the rule |
|---|---|
| Sloth | while you have stood still for two seconds |
| Wrath | while you are below half health |
| Pride | against a target at full health |
| Envy | against a target with more health left than you |
| Greed | while you hold a weapon in each hand |
| Gluttony | against a target already suffering one of your afflictions |
| Lust | while nothing else is within reach of them |

> *"the 7 sins should each be able to flex in a lot of ways depending on essence
> build and awakening stones."*

So the **rule is the identity and does not move**; which payload it uses and how
much are seeded off the socket. A Sloth ability off one stone is cheaper while
you stand still, off another it hits harder, and both are Sloth.

Measured over 120 Sin kits: **all seven sins appear, all three payloads appear,
and zero non-sin gates.** A Sin kit speaks only in sins.

```
[Insight Strike] (Fire stone)    Greed -- while you hold a weapon in each hand, it deals 25% more.
[Guilt Curse]    (Malign stone)  Envy -- against a target with more health left than you, it comes back 15% sooner.
[Gravity Well]   (War stone)     Wrath -- while you are below half health, it costs 20% less.
```

`_stillFor` and `_pacesSinceStill` are tracked at the one place that already
knows whether you moved this frame.

---

## 3. The beast a name promises — round 204's report, three rounds unfixed

**I re-measured before fixing, and my first census was wrong.** It compared the
name to the creature's *invented* name, so "Wolf Calls summons a Panterimp"
counted as a fault — but a Panterimp **is** the wolf-family creature. Against
the **family**, the honest figure was 16 of 788 (2.0%).

Two pieces:

- `CREATURE_NOUNS` — family → the words that may honestly name it, so a cobra
  may be called a snake and a hornram a ram.
- `LOOSE_BEASTS` — the animals **no** family answers to. Without it the rule was
  blind to the exact fault it was written for: `bee` is in no family's list, so
  a rule built only from `CREATURE_NOUNS` could not see the word at all.

**And it checks the raw name, not the identity-stripped one.** This is the one
rule in the table where the identity exemption must not apply — "Call the Bee"
on a Bee essence has "Bee" stripped as identity, so the rule saw nothing and
passed. Leaving it on the stripped name made the census *worse* (3.98%).

**2.0% → 0.27%.** The two left are "Serpent Answering" (elemental) and "Locust
Calls" (mantis), where no legal replacement name was available.

---

## 4. What a kit is good at, and what it pays

Delivered as the **measurement** half, and I want to be plain about why. Reading
a profile is safe and checkable. Moving what the generator hands out changes kit
**composition**, which two hundred rounds of balance sit on — doing that without
a measurement first is how this project has broken things before.

**No negative fields, and there won't be any.** Your framing: you don't take
anything away, you inevitably lose out somewhere.

`kitBudget.js` reads seven axes as **counts**, not a weighted score — a score
needs coefficients nobody has chosen; a count is verifiable by looking at the
kit.

```
Built around sustained damage and mitigation, and pays for it in burst damage and control.
Built around sustained damage, movement and summons, and pays for it in self recovery and control.
```

**And it corrects something I told you earlier in the session.** I said the
generator hands out everything. It doesn't — over 200 silver kits: 20 strong on
one axis, 69 on two, 85 on three, only 25 on four or more. Kits are already
specialists.

**The real fault is narrower and worse:**

| axis | absent from |
|---|---|
| sustained damage | **0%** of kits |
| movement | **0%** |
| mitigation | **2%** |

So *"he doesn't have extra armor"* and *"no extra armor or passive defence"* —
the thing Jason and Sophie are **defined** by — is not a build this generator
can make. **An axis no build can drop is not a cost.**

`kitBudgetFaults` asserts every axis is droppable by at least 5% of kits, and
the suite prints the three that aren't, by name. It is *expected* to keep
reporting them until the allocation half lands; what's asserted is that **no new
axis joins them**. A measured fault with no assertion behind it is one that gets
forgotten, and this project has lost four that way.

---

## Next

The **allocation half** — making those three axes droppable. That's the one
piece of the four I've deliberately left at the halfway line, because it moves
kit composition and I'd want to show you the intended redistribution before
running it.
