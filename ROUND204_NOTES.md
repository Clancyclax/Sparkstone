# Round 204 — the card stops lying, and the summons get bodies

Your review of five kits was mostly "this sentence is wrong". Three of those
sentences turned out to be the same bug, one of them was right about the
symptom and wrong about the cause, and two of the items were not about
sentences at all — they were about mechanics the game described and did not
have.

---

## Item 1 — a card reports what it does now

The `(next) Effect (silver): …` line is gone. It was added on the reasoning
that a reader wants to see what is coming; your ruling is that a card is a
statement of what the ability **does**, and a sentence about a rank you have
not reached was sitting in the same list as the true ones.

## Item 7 — and it reports it at your level

This is the bigger half of the same idea, and the card was worse than you
knew. `rankScaled(a, rank)` **took no level parameter at all**, so:

- a card headed *"Current rank: Iron 9"* printed the **Iron 0** damage —
  understating the real figure by about half, since `abilityScale` doubles
  magnitude across a rank
- the Cost and Cooldown lines read the raw spec, so neither showed the
  cooldown your level actually charges

The comment above `ABILITY_DAMAGE_MULT` has warned about exactly this since
round 116 — *"a multiplier applied to one and not the other is a card that
lies about the ability under it"* — and it was describing this. The card and
the runtime now call one function.

**Cost falls with the level too**, which it never did: `cost` is excluded from
`SCALED_FIELDS` by name and nothing else touched it, so nine levels of work
made an ability hit twice as hard for the same price. 1% a level, the same step
the cooldown takes, floored at 60% so a long climb cannot make anything free.

| at Iron 0 | at Iron 9 |
|---|---|
| 13 dmg · 20s cd · 30 mana | **26 dmg · 18.2s cd · 27 mana** |

---

## Item 5 — how much health do the summons have?

None. That was the answer, and it was worse than "none": exactly one role had
hit points — `guard` — and `guard` has `weight: 0`, meaning the generator never
rolls it. It is reachable only through the odd-summon table. **Every wolf,
turret, caster and tender in the game was unkillable** and expired on a timer
alone; a monster could stand inside one forever and nothing happened to either
of them.

Worse, the heal path could not see them at all. `_friendlyBodies` builds the
entire target universe for every heal in the game and enumerated the player,
the party and the guards. So three rank-up rungs were sentences with nothing
behind them:

- *"it mends your summons as well as your people"* (`healSummons`)
- *"what it stops, it stops for your summons too"* (`wardSummons`)
- *"it works on your summons as well as on you"* (`extendsToSummons`)

Round 76's own note two roles above the guardian is the argument for fixing it,
and it was already written: *"A taunt from something that cannot die is not a
tank, it is a permanent crowd-control field with no counterplay."* That is just
as true of an attacker that cannot die, and it is why minion builds have never
had a real cost.

Now: every creature summon has hit points, as a share of **your** maximum, by
what its job is.

| role | share of your health |
|---|---|
| guardian | 55% *(unchanged since round 76)* |
| attacker | 40% |
| standard-bearer | 30% |
| afflicter | 28% |
| tender | 25% |
| caster | 22% |

They can be killed, they can be healed — **by a heal that says it reaches
them**, which is what keeps that rung meaningful — and the card says how much
life a summon has before you send it into something.

And a role whose whole clause is "deals nothing" no longer prints a damage
figure. Round 76 fixed that for the guardian and left the other two; your
review found one: *"It never strikes."* over a stats line reading *"3 dmg every
1.16s"*. The escort refusal had the same one-role-of-three shape (2.10.2).

---

## Items 2.3.2 / 2.5.1 — the armour on a spear strike

**You were right about the effect and wrong about the mechanism, and the real
one is worse.** Names are chosen *after* the mechanic (round 48), so nothing
has ever read the word "armor" in a name. What actually happened:

```js
if (!mech) {            // "no clause was produced"
  ... grantResistance(spec, mat, amt)   // staples on an armour self-buff
}
```

The comment above it describes the intent as *"it only fires when every
authored lever has genuinely declined"* — which is `!lever`, not `!mech`. Those
are different, because **`raw`** — the commonest lever on a weapon build —
applies successfully and deliberately returns no clause. Its own note calls the
empty string *"a supported state, not an omission"*.

So **every raw-lever strike in the game pulled its lever and then took the
fallback as well.** That is Shield Breaker and Armor Pierce Curse both, and it
is why the clause appeared on two abilities in one kit.

Fixed in two places: the guard reads the right variable, and even when every
lever has declined, armour is only offered to something a defensive clause
belongs on. "Nothing" was already a supported outcome; contributing the wrong
thing is worse than contributing nothing.

*(This is the second round running where your read of a symptom was right and
the cause was somewhere else — round 202's filler was the same. It is worth
saying because both times the symptom is what found the bug.)*

## Item 2.2.3 — cast speed on a spear

The composed buff rider picked its stat from a flat list of seven with **no
gate at all**, while the authored cast-speed row two thousand lines above it
carries `leverGate: ['swift','shift']`. The rule existed; the composed path
never asked. Cast speed is now offered only to something that casts, crit
chance only to something that deals damage, and dodge not to a weapon swing.

---

## The sentences

| your note | what it was |
|---|---|
| 2.1.2 *"AI slop or English as a second language"* | one of three bolt openers that buried its number in a clause about snapping. All three now lead with what it does, and the variation is in the verb |
| 2.3.3 *"carries your momentum"* | a decorative prefix, and worse: the clause never said **what** rose. `scalableMagnitude` has always known which field the multiplier lands on, so the clause asks it — *"its damage rises +6% for every 100 paces"* |
| 2.6.1 *"20% of incoming nature"* | the element word is a bare adjective; every phrasing that left it dangling now names the noun |
| 2.7.2 *"Yours carries Unity Mark"* | `_sig.label` is the name of an internal **signature**, not of anything the player can see or cleanse. The sentence introduced a proper noun that appears nowhere else and then said something true about a different one. The blurb was always the whole content |
| 2.7.1 *"doesn't explain what Balancing Ledger does"* | the card only defined afflictions arriving through `a.debuff`/`a.dot`. It now reads its own text: anything it prints in brackets, it defines |
| 2.8.2 *"4 of its figures grow"* | round 202 replaced something worse. It now restates the changed clauses at their new values, capped at two — which is what you asked for in 2.3.4 |
| 2.10.1 *"a shape that should not hold together"* | a noun-phrase describing a failure to exist. The other six in that table name a thing; this one does now |
| 2.10.3 *"who cares what happens after that"* | two rungs about being downed, retired |

## 2.1.1 / 2.11.2 — [Mortar-Work] and [The Team]

**116 of the 1,088 afflictions were named `<noun>-Work`** by the generator that
built the CSV — Gut-Work, Shoulders-Work, Mortar-Work. That is a machine
suffix, not a name, and it is 11% of the library. Renamed by what the
affliction *does* to the body it is on, from a per-archetype bank: Mortar-Work
became **Mortar Weight**, Gut-Work became **Gut Seam**.

Only the `authored: no` rows were touched — every row you wrote by hand is
untouched — and the pools CSV was rewritten with them, since it references
afflictions by name and 866 entries would otherwise have pointed at names that
no longer existed.

**I did not touch "The Team".** The obvious fix — the same suffix treatment —
produced "The Team Dulling", which is worse. Eighty-eight rows are `The <noun>`
and most are good ("The Maw", "The Rime", "The Shroud"); a dozen are abstract
or agent nouns that are not afflictions at all. That is a naming-taste call on
your own bank rather than a mechanical artefact, so it is flagged rather than
guessed at.

---

## Items 3 and 4 — the mastery line

These are one ability, so they are one ability now.

**Item 3.** The proficiency grant was a single 80% roll taken once. One weapon
kit in five never learned its own weapon **at any rank** — the character was not
untrained yet, they were untrained forever. The roll now decides *when* rather
than *whether*: 80% at iron, and certain from bronze up. Measured: 59 of 59
weapon kits at bronze.

**Item 4.** The passive that carries the proficiency is now the mastery line,
with your own ordering:

| | |
|---|---|
| **iron** | the proficiency — you are trained, and swings cost half |
| **bronze** | you strike 15% harder with the weapons it covers |
| **silver** | you may call the weapon itself to your hand, wherever you are |
| **gold** | swings cost 25% less stamina and reach 25% further |

It is the only ladder in the file that is a **progression** rather than a pool
of three choices, because three Spear Masteries that each taught a different
third of the spear would be the thing nobody asked for. `rankLadderFaults`
knows the exemption by name.

Two things fell out of building it. The ladder was being chosen before `prof`
was stamped, so the mastery kept climbing the strike ladder — the proficiency
clause landed and the bronze rung was still *"15% of the damage carries to two
more foes nearby"*. And when the slot held no weapon passive the line came out
called **"Wellspring of Life"**, which is item 2's complaint again; it is
renamed to `<Weapon> Mastery` when the existing name has nothing to do with a
weapon.

## Item 6 — opacity

Every cast effect at **0.4** alpha, applied at the one place a cast sprite is
created, so impacts, columns, chains, streaks and the descending bolt all
answer to it. The ward bubble keeps its own round-118 value of 0.5 as a
separate number rather than being multiplied to 0.2 — multiplying two values
each chosen against a full-strength sprite is how a deliberate number becomes
an accident.

---

## Regression

`tools/tests/test_round204.cjs`: 34 checks, 0 failed.
**201 suites, 181 ok, 16.1 minutes.**

The suite is written as properties rather than as the absence of eleven
particular sentences, because a suite that asserts eleven strings are gone
passes on the day the generator invents a twelfth.

Four suites went red on the first full pass and three found something real:

- **test_round55** — *"no description prints undefined or NaN: 77 of 12,000"*.
  Mine, within the hour. Several templates (`summonWeapon`, `summonArmor`,
  `barrierWall`) never set `desc` in the template switch and have always
  relied on the lever pass to build it, so tightening the fallback gate left
  them with a description of `undefined`. That check has existed since round 55
  and caught it inside the round.
- **test_round76b** — asserted that an ordinary summon has no hit points and
  cannot be swung at. That was round 76's design and item 5 retires it; the
  check is rewritten to the part that survives, which is that the guardian is
  still the sturdiest of them.
- **test_round112_weapon** — matched the literal string `requires a `, which
  the grammar fix ("requires **an** Axe in hand") broke.
- **test_round202** — *"every archetype is reachable"*, which is written as a
  reachability check rather than a count **precisely so that it goes red on the
  round that adds one**. It did.

`test_round57` failed once on the runner and passed twice locally — it samples
60 random hits. `test_round132_world` is the standing failure carried from
round 200.

---

## One thing I did not fix

An ability called **"Call the Bee"** summons a stone-hided lizard. The creature
comes from the socket's **stone** and the name from its **essence**, and
nothing reconciles them. It is the same class as items 2.2.1 and 2.11.1 — a
name that promises something the mechanic does not deliver — but the fix is a
rule about which noun a summon's name may use, not a rejection pattern, so it
wants its own round rather than a guess at the end of this one.

---

# Round 204b — a buff is not a shield

You found this one after the round shipped:

> [Well-stocked Quiver] … *"Its a damage increase, but half of the ability is
> framed around being some sort of shield. Based on the description I don't
> know if the bronze or silver effects can even trigger."*

They could not. Two faults stacked, and the second is the one worth reading.

## The routing

`ladderKeyFor` ends in a fallback, and the fallback was a real archetype:

```js
  if (tags.defensive) return 'guard';
  if (… timeFreeze … confuseTurn … ) return 'hold';
  return 'guard';          // <- everything else
```

So **every ability that matched none of the nine tests was told it was a
shield.** A `selfPower` damage buff, a `selfCritBuff`, a `bloomField` healing
field, a `barrierWall` — all of them climbed the guard ladder and were handed
rungs about breaking and absorbing.

*"I don't know what this is"* and *"this is a shield"* have to be different
answers, or the next template nobody classifies becomes a shield too, silently,
for a round or ten. There is a **`boon`** ladder now — a timed effect you put
on yourself, which is the most that can honestly be said about a spec that
matched nothing else — and it is both a real archetype and the fallback.

## The rungs

Even correctly routed, the guard ladder was wrong for half of what reaches it.
`breakStagger`, `wardThorns`, `wardEatsConditions`, `wardRemainderHeals`,
`wardRefit` and `wardNullifiesBreaker` all presuppose a **pool** — something
that absorbs a quantity and can be broken. An **armour percentage** has no pool
and is legitimately on that ladder.

Round 202's own rule 2 — *"a rung may only claim a field the spec actually
has"* — existed and had never been applied here. It is now: those six require
`shieldAmount`/`absorb`/`shieldHp`/`barrierHp`.

That went red immediately, and correctly: *"200 differently-named guards
produced only 6 distinct ladders"* and *"one rung lands on 100% of guards"*.
Gating without replacing would have traded a nonsense rung for the
one-sentence-on-every-ability fault the pools exist to prevent, so six
pool-free guard rungs were added alongside.

## Every boon rung is read

The obvious way to write a new ladder is twelve interesting-sounding flags, and
this round was mostly spent deleting rules that were printed and read by
nobody. So the boon rungs are all *"longer, stronger, cheaper, sooner"* — your
own list from 2.3.4 — which lands on `buffDuration`, `cost` and `cooldown`:
three fields the scaled clone already owns, so **one place reads six of the
eight**. The other two read the moment instead, because they have to:
`boonDoublesWhenHurt` is resolved per cast (a memo would freeze whichever
health you were on the first time you pressed it) and `boonKillExtends` hangs
off the existing kill event.

The card now reads:

```
Ability: [Well-stocked Quiver] (Arsenal)
Cost: Low mana.
Cooldown: 32.3 seconds.
Current rank: Silver 4 (89%).
Effect (iron): Increases your physical damage by 27% for 12 seconds.
               It costs a quarter less to put up.
Effect (bronze): 4 seconds are added to however long it runs.
Effect (silver): Everything it grants is worth 25% more.
Numbers now: +27% damage for 23s · 32.26s cd · 8 mana
```

`test_round204.cjs`: 43 checks, 0 failed — nine of them new, including "no buff
is told a shield breaks", "an armour buff isn't either", "but a real shield
still gets them offered", and one that asserts the boon rungs actually move the
numbers on the scaled clone.

**Regression: 201 suites, 180 ok, 16.0 minutes.** `test_round132_world` is the
standing failure; `test_round82` and `test_round44` failed on the runner and
pass locally (50/50 and 79/0).

---

# Round 204c — a delta needs something to be a delta from

> *"a quarter less than what!? … At bronze that might make sense, it can be
> cheaper than it was at iron, but at iron the ability didn't exist before so
> that statement, just like the last 5 times I've noted similar statements, is
> just fluff that doesn't mean anything to the player."*
>
> *"Is this continued ability fault of stating nonsense an issue of
> understanding? or application."*

**Application.** The understanding was never the problem; the guard was, and
here is the shape of it.

`FILLER_PATTERNS` is a list of six **phrasings** — it knows "harder",
"further", "a quarter harder", "10% stronger". Every previous round I added the
phrasing you had just reported. So the guard has always caught the sentence in
the last report and never the one written next. "A quarter less" was not on the
list. Neither was "half again as long", which was two rungs away in the same
ladder I had just written. That is not six mistakes; it is one mistake made six
times, because a lexical guard cannot generalise and I kept feeding it words.

The rule underneath all six:

> **A delta needs a prior value. Iron is where an ability begins, so at iron
> there is no prior value and every delta is a comparison to nothing.**

That is checkable without knowing which words the next author reaches for, and
`rankLadderFaults` asserts it now: **no iron rung in any ladder may be a
relative magnitude.** It is deliberately scoped to iron rather than being a ban
on deltas, because you said the other half in the same message — at bronze
there *is* something to be cheaper than, and "it lasts half again as long" is
one of the clearest things a rank-up can say. Seven of them survive at bronze.

The boon ladder I wrote last round was the worst offender: **both** its iron
rungs were deltas. They are now absolute statements about what the ability
does, and the deltas moved up a rank:

| | before | after |
|---|---|---|
| iron | *it lasts half again as long* | it lifts one condition from you as it goes up |
| iron | *it costs a quarter less to put up* | it goes up instantly, and nothing can interrupt it |
| bronze | — | it lasts half again as long · it costs a quarter less to put up |

## And a census found one more, in the card rather than a ladder

Over 1,000 generated abilities, one iron line read:

```
Effect (iron): … Stronger: you pick things up from 80% further away.
```

Iron is diffed against the `normal` row — a rank below the one every character
starts at, which no player has ever seen. So at iron the split between "added"
and "stronger" is a distinction the reader cannot make. The clauses are real
information and are kept; they are listed under `Adds:` now, which is what they
are to somebody seeing them for the first time.

## The same split, made again, one round later

Writing 204b I put the boon steps into `_scaledAbility` and nowhere else — so
the runtime made a boon instant and the card went on printing its cast time.
That is round 204's own item 7, repeated by me a round after fixing it, which
is the clearest evidence for "application" I can offer. `applyBoonSteps` is one
function now, called by the card and the runtime, and the suite asserts they
agree field for field.

The card:

```
Effect (iron): Increases your physical damage by 27% for 12 seconds.
               It goes up instantly, and nothing can interrupt it.
Effect (bronze): It lasts half again as long.
Effect (silver): Everything it grants is worth 25% more.
Numbers now: +34% physical damage for 34.5s · 33.6s cd · 8 mana
```

No cast time, because it is instant. +34% rather than +27%, because silver is
worth 25% more. 34.5s rather than 12s, because bronze is half again and the
level scales it. Every number on the card is the number the runtime uses.

`test_round204.cjs`: 47 checks, 0 failed.
**Regression: 201 suites, 182 ok, 16.0 minutes** — the only failure is
`test_round132_world`, standing since round 200.
