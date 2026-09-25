# Round 203 — five things the game could describe and could not do

Round 201 wrote ten canon abilities out by hand to prove the card could print
them. That proof is worth exactly as much as the generator's ability to produce
one, and for four of the five shapes the answer was zero. This round closed
that gap and added the fifth thing you asked for, transcendent damage.

The organising idea of the whole round is one question, asked of every table:
**is every rule in it reachable?** It found four separate bugs, three of them
older than this round.

---

## Item 5 — transcendent damage

New module `src/data/transcendent.js`, a data module with no scene import, so
every rule in it is checkable without a browser.

### What it goes through

Your four properties are a statement about a CLASS of mechanic, and a class
enumerated in fourteen places is a class that will be missed in the fifteenth.
So it is **one list** — `BYPASSED`, thirteen entries — and every site consults
it:

> armour · resistance · wards, shields and bulwarks · blocks · flat damage
> reduction · the minion guard · a mount's share · immunity buffs · thorns ·
> spell and debuff reflect · an aura's bite · karma ledgers · **the rank gap**

And what it does **not** go through, written down as a decision rather than an
omission: **dodge** (a blow that misses was never mitigated), **amplifiers**
(curses and brands make the wound deeper — a type that ignored help as well as
hindrance would be strictly worse than an ordinary one), and the cut.

The price is `TRANSCENDENT_DAMAGE_CUT` — 45% — charged once, centrally, because
an ability that forgot to charge it would be strictly better than every other
ability in the game. Canon's own word for the trade is "slight".

### The rank gap, which round 201 had deliberately kept

Round 201 left that one line guarded, reasoning that armour is a *defence* an
ability can be written to beat while the rank gap is round 43's statement that a
Normal and a Gold are different categories of thing. That reasoning is sound and
it is not what the books say, and **the books win**.

What stops it being a hole in round 43 is the gate.

### The gate is the interesting half

> "At ranks below Silver … very rare and requires either narrow conditions or
> significant setup. Even at Silver and Gold … rare but won't have the tight
> restrictions."

Two sentences, two mechanisms:

- **Rarity** — how often a generated ability is transcendent at all.
- **The gate** — whether, on a given swing, the damage actually is.

An ability does not stop being transcendent when it ranks up; it stops being
**conditional**. Below silver its damage is transcendent only while its
condition holds and lands as its ordinary element otherwise (`fallbackElement`,
so it still looks and resists like the essence it came from); at silver the
condition lifts. You meet the ability at iron, learn what it wants, and are
rewarded at silver by no longer having to arrange it.

Six gates — three conditions, three setups, matching "narrow conditions **or**
significant setup":

| | |
|---|---|
| below a quarter health | under open sky, at night |
| three or more enemies in reach | against a target carrying three of your afflictions |
| after a full aura projection | when you paid health rather than mana |

An unknown gate name fails **shut**.

Measured at the generator door, 2,500 samples per rank:

| | iron | bronze | silver | gold |
|---|---|---|---|---|
| rate | 1 in 833 | 1 in 357 | 1 in 86 | 1 in 63 |
| gated | all | all | none | none |

It is bright blue-white (`0xcfe9ff`), and `nearestFxElement` was taught to
exclude it so no pale frost ability can fall through to reality-burning light.

### Three real faults found behind it

1. **Round 201's work was inert for every generated ability.** `_specElement`
   filtered elements through `ELEMENT_OPPOSITE`, which transcendent is not in,
   so it returned null and nine downstream call sites never saw it.
2. **`kitRank` was threaded through five of seven paths.** A census reporting
   *exactly one* gated ability per thousand at gold is the shape of an
   unthreaded path rather than of a random effect. Two more were found by this
   round's suite, not by reading: the essence innate and the socket signature
   seat. **Threading five of seven is the same bug as threading none, one
   twentieth as often** — which is why the guard is a census over finished kits
   rather than a list of call sites.
3. **The register.** Each site that actually skips a mitigation stamps
   `_tGuarded`, and the suite hands that set to `transcendentFaults`, which
   compares it to `BYPASSED` **in both directions**. A bypass named with no
   guard is a property the game describes and does not have; a guard nobody
   declared is a rule with no writer.

---

## Items 1–4 — the four shapes

All four are rolled at the same one door the element comes through, all four
are rare, and all four are only offered to a spec that can carry them.

| | rate in real kits |
|---|---|
| transformation | 1 in 174 |
| Varies cooldown | 1 in 257 |
| hours-scale cooldown | 1 in 92 |
| two-pool drain | 1 in 74 |
| allyNotSelf | 1 in 360 |

### 1 — the transformation

[Specious Sorcerer], [Counterfeit Combatant], [Instant Adept]. Which one a
socket produces is chosen by the essence's **bound attribute** where it has one,
so a Spirit essence hands you the sorcerer and a Power essence the combatant:
the swap the books make is the swap the kit makes. Cooldown is canon's six
hours at round 201's rate — sixty played minutes.

**It had no runtime branch at all.** The generator rolled it, the card printed
it, and pressing the button did nothing. It now grants all four halves of the
canon clause off one table read: the attribute, the proficiency, the larger
pool and the ongoing recovery, all returned when the clock runs out.

Two things came out of building it:

- **The figures were promising what the game cannot deliver.** The table ran
  3 / 5 / 8 / 12, and attributes in this game run 0–6 (your own "as high as 6").
  `computeAttrTotal` clamps, so **+8 and +12 measured identically to +6** — the
  card printed twelve and the player received six. It now ends *at* the hard
  cap: 2 / 3 / 4 / 6. The runtime raises the ceiling by exactly what it lends
  for exactly as long, so a character already at the soft cap of four still gets
  what they were promised rather than silently nothing.
- **`prof` meant two things.** Round 202 made `spec.prof` mean "this passive
  teaches a weapon proficiency, permanently"; a transformation lends one for
  thirty seconds. Same key, different fact — now `transformProf`. Round 202's
  own suite is what caught it.

### 2 — Varies, and hours

`Varies` is the canon shape on [Blessing of Readiness]: its cooldown is the time
it just removed from someone else's. **Three faults here, and the third is the
one worth reading.**

- **`removed` was read at the cast site and written nowhere.** Every reciprocal
  cooldown in the game came out at its floor. The two templates that actually
  hand time back now bank it.
- **The resolution happened before the effect.** `reciprocal` is measured in the
  time the *template* removes, and the template runs three hundred lines below
  the cooldown-burn line. It now writes the floor first — so every early return
  still leaves a real cooldown — and re-resolves at the end of the cast.
- **`reciprocal` could never be stamped at all.** The offer was gated on
  `spec.cooldownReduction > 0`, which is a *passive* field; no active carries
  it. Re-pointed at the abilities that actually give time back. And then the
  census still showed zero, because a round-109 guard — "a composed active
  always has a cooldown" — tested `typeof cooldown === 'number'` and replaced
  every Varies cooldown it had just been given. **The rule fired seventy-three
  times in two hundred kits and was overwritten seventy-three times.**

`mirrorRemaining`, a third rule written in round 201 against a copy-a-buff
template the game does not have, is deleted. A rule with no writer and no reader
is the file describing a mechanic the game does not have, and the description is
what a reader trusts.

#### The sentinel, and why it is gone

The first cut put the string `'varies'` into `spec.cooldown`. The regression
found what that costs within the hour: round 49's taunt band reads
`cooldown > 0` and rejected two well-formed abilities, round 27's armour band
did the same, and the HUD's cooldown ring divides by it.

**A sentinel in a field forty-nine call sites do arithmetic on is a promise that
every one of them will be checked.** So `cooldown` now holds the *floor* — a
true statement, the shortest this ability can ever cool — and `variesCooldown`
is the flag the card and the runtime read. Every numeric reader keeps working
and none of them is lied to.

### 3 — the two-pool drain

[Eternal Moment]: "Cost: Very high mana and stamina, per second." The entry
price is charged with every other cost; the per-second half is registered at
cast and run down each frame. **It ends the ability the moment either pool
cannot pay** — that is the mechanic and not a safety check, and the float says
which pool ran out, because "it stopped" with no reason is indistinguishable
from a bug.

### 4 — allyNotSelf

A scope with an exclusion, and a +35% magnitude for taking it: an ability you
cannot point at yourself is a worse ability at the same numbers.

---

## And the gate is now printed

`gateClause` existed since this morning and **nothing called it** — a rule the
game enforced on every swing and told nobody. An ability whose damage is only
transcendent "while three or more enemies are within reach of you" is unusable
knowledge if the player has to infer it from the colour of the numbers. It is
now a line on the card, under the figures, where the conditions are.

---

## Regression

`tools/tests/test_round203.cjs`: 76 checks, 0 failed.

The suite's own shape is the point. Section 4 is a census rather than a fixture,
because a shape only a fixture can reach is a shape the game does not have —
and that census is what found the unthreaded `kitRank` paths, the overwritten
Varies cooldown and the unreachable `reciprocal` rule. Section 3 drives a
piercing hit down both damage paths and hands the register to the data module,
so `transcendent.js` and the scene cannot drift.

Four other suites went red on the first full pass and every one of them found
something real:

- **round 51 (charters)** — `self_transformation` had no family, so a new
  category was silently exempt from the lever-charter system. It is filed under
  **both** `attribute` and `buff_self`: naming only the first would have been a
  door around every `allies` charter's refusal of selfish combat buffs, and
  naming only the second would have denied a staple to every support build.
- **round 49 (taunt)** and **round 27 (armour)** — the sentinel, above.
- **round 202 (proficiencies)** — the `prof` collision, above.

`test_round91` failed once and passed twice on re-run; `test_round132_world`
("closing it releases the world") is the standing failure carried from round
200.
