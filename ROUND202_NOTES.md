# Round 202 — who may hold what, and a rank-up that says something

Two items, and they turned out to be the same kind of work: a rule the game
half-had, written down once in a data module, and every surface made to read it.

Two new modules — `src/data/proficiencies.js` and `src/data/rankLadders.js` —
both pure functions over plain objects with no import of Phaser or the scene,
for the reason `advancement.js` has been one since round 85: the rules are
checkable without a browser, and the suite's first section is five `*Faults()`
calls.

---

## Item 1 — you were right about the hotkeys

`R2+R1` appearing twice in round 201's item 5 was a typo for `R2+L1`. The six
chords stand as built, and the two triple-modifier ones still drive the hand
binds.

---

## Item 2 — five weapon proficiencies

| Proficiency | Covers | Gate? |
|---|---|---|
| Magical Tools | staff *(wand recorded as pending)* | **yes** |
| Blade | sword, dagger | no |
| Power | hammer, axe | no |
| Polearm | spear, scythe, javelin | no |
| Dexterity | bow, crossbow, whip | no |

Javelin, crossbow and the rest are placed rather than left out: a weapon that
answers to no proficiency would be a weapon that is free forever, and the fault
function asserts that every entry in `WEAPONS` has a home.

### Magical tools is the only hard gate, and that asymmetry is the design

2.1 says you *cannot* wield a staff untrained. 2.7 says everything else is
merely expensive. Those two readings only coexist because of 2.1.1: a staff's
attack spends **mana**, so "burns lots of stamina" has nothing to bite on. An
untrained staff could not be made costly — it would have been a strictly *free*
weapon. So it is refused, and everything else is priced.

The refusal is at the **equip door**, not the swing. A player who can pick a
staff up and then cannot use it has been handed a puzzle instead of a rule, and
the float text names the proficiency, because "you can't do that" with no reason
is how a player concludes the game is broken. The tooltip says it before they
try at all.

A **god's gift is the one exception**: a divine staff handed to someone with no
proficiency teaches it rather than being refused. Refusing a deity, or handing
over a staff its recipient cannot hold, are both worse answers.

### The tier curve

A weapon's tier is read off `base` damage, which has always been the roster's
own ordering — 4 (unarmed) through 18 (scythe, crossbow) — cut into five bands.
Trained costs half the neutral price (2.2); untrained costs twice it, so the
gap is **4×**:

| | trained | untrained |
|---|---|---|
| dagger (t1) | 1 | 2 |
| sword (t2) | 2 | 7 |
| hammer (t3) | 4 | 14 |
| axe (t4) | 6 | 23 |
| scythe (t5) | 8 | 32 |

**The untrained multiplier is 2, and it started at 3.** At 3 an untrained scythe
cost 58 stamina a swing against a starting tank of 50 — so it was not expensive,
it was *unusable*: a second hard gate smuggled in as a number, which is exactly
what 2.7 is not. At 2 it costs 39 of 50 — one swing, then you are winded and you
have learned why the proficiency exists. `proficiencyFaults` now asserts that
against the base tank in both directions (it must burn, and it must not forbid),
so nobody can turn a cost back into a gate by nudging a constant.

The trained bottom-tier price is unchanged from round 38's "three tenths of the
weapon's base", so nobody's early game got quietly more expensive.

### 2.8 — the essences

A post-build sweep rather than a new socket category, for the same reason round
200's mount cap is one: a new category would move the kit's 12 active / 8
passive shape that two hundred rounds of balance sit on. The proficiency is
**stamped onto a passive the slot already holds**, preferring the weapon
passives (which already name a weapon and read as knowing it), so it costs the
kit nothing. Seeded off the essence trio, so a Sword adept who reloads does not
discover they have forgotten how to hold a sword.

Measured: **86%** of weapon-essence proficiencies land across 59 kits, and 59 of
59 descriptions state the mechanic.

---

## Item 3 — the filler

### Your theory was right about the mechanism and wrong about the trigger

Nothing compares a roll to a statistical baseline. What the generator compared
an ability to was **an earlier rank of itself**, and the result reads
identically. But the code that would have matched your description literally
*did* exist — `magnitudePhrase`, which turned a lever's roll multiplier into
"It hits 24% harder". Round 133 deleted its call site and left the function
sitting there for sixty-nine rounds. You were remembering something real; it
has been deleted rather than orphaned again.

### What the measurement found

Over 189 kits / 3,780 abilities, before:

- `it comes back 10% sooner` was the **single most-printed sentence in the
  game**, on 14.1% of all abilities — and **53.5% of those were passives with
  no cooldown at all.** The comment that justified keeping it said it was fine
  because "a cooldown that comes back sooner has a referent the reader can see".
  On more than half of them there was no referent.
- **27.6%** of abilities carrying a potency label printed *identical numbers at
  iron and gold*, because the field the label claimed to scale (`familiarDmg`,
  `armorBonus`, `regenPerSec`…) is not in `SCALED_FIELDS`. The label was
  attached to nothing whatsoever.

### And the project had already decided this once

Round 103, quoting you: *"10% stronger has no context, 10% stronger than what?"*
That round removed the potency bit from the merged card line and kept the
per-rank labels, on the stated grounds that they only ever showed "at the moment
a rank is announced… This is the card, which is a reference." **Round 190 then
rebuilt the card out of the per-rank labels and put every one of them back on
it.** The rule was right; the regression was putting the announcement's voice on
the reference.

### The rule now, in three parts

1. **A rung names a mechanic, not a magnitude.** "It also lifts one condition"
   is a rank-up; "it mends a fifth further" is a percentage of a number printed
   four lines above.
2. **A rung may only claim a field the spec actually has** — so a passive with
   no cooldown can no longer be told its cooldown improved.
3. **A rank with nothing to add adds nothing.** The card already skips an empty
   rank line, and `Numbers now:` carries the magnitude, which is where the
   reader was already looking.

Magnitude growth did not go away and was never the problem: `SCALED_FIELDS`
still scale every rank and the card prints the scaled figures. What went away is
the sentence announcing that they did.

### Nine ladders, and each rank is a pool

The first draft gave each archetype exactly four rungs — and a census
immediately found the old fault in new words: every passive in the game was told
the same four sentences, and "it keeps working while you are downed" landed on
21.1% of all abilities. That is round 134's "one ability offered twice", between
abilities rather than between ranks.

So each rank offers three rungs and the ability picks one, seeded by its own
name: 81 ladders per archetype instead of one, stable across saves, and never
offering a rung the ability cannot carry.

| | before | after |
|---|---|---|
| filler clauses per 2,400 abilities | 83 | **0** |
| most-repeated sentence | 33.8% | **19.3%** (and it is a count, not a claim) |
| ranks printing nothing | — | 2.4% |

`Stronger:` used to restate the entire clause list with the numbers nudged, so a
gold aura's card carried the same seven clauses four times over (9.1% of cards).
It is a **count** now — "3 of its figures grow" — because the figures themselves
are already on the card, at the player's own rank.

### The guard is the durable half

Deleting the strings is not the fix; the class of fault is "a comparative with
no referent" and the next round can reinvent it in different words.
`FILLER_PATTERNS` + `fillerReason` name the class, the generator uses it to
reject a signature that trips it, and the round-202 suite runs **every clause of
every card in 40 generated kits** through it. New filler now fails a suite on
the round it is written.

Tuning it took two passes, both recorded in the file:
- `it strikes a quarter harder` slipped through the first pattern set, so a
  fraction-as-adverb rule was added.
- `\d+% more` caught 83 **real** clauses ("It sets 10% more armour between you
  and the next hit"), so `more` was dropped from that alternation — "harder",
  "better" and "stronger" have no noun after them by construction, and "more"
  almost always does.

37 authored filler strings in the data files were rewritten too, and
`gen_round17_signatures.mjs` was fixed alongside its generated output so the
next regeneration does not bring them back. `isFilledTemplateDesc` now also
counts the **confluence** bank, which fed the same `spec.desc` path and had
never been checked.

Three of the remaining hits are deliberate and untouched: NPC dialogue, item
flavour and monster descriptions. "Its far side is farther away than it should
be" is a good sentence about a magic stone. The scope here is ability mechanic
text, which is what you asked for.

---

## Regression

`tools/tests/test_round202.cjs`: 37 checks, 0 failed.

Three of those checks went red first and each found something real:

- **The archetype count.** `all seven archetypes exist` failed on the round that
  added two — the "count the roster" fault, caught by its own signature.
  Rewritten as "every archetype is reachable".
- **`summonWeapon` climbed the strike ladder**, so `conjured` was a ladder
  nothing could ever select. A conjured sword *is* a sword and has counted as
  one since round 51; what the ABILITY does is make a weapon.
- **`tags.strikes` was computed in awakening.js and handed over**, so a probe
  building tags with `specTags` alone selected the wrong ladder. The rule now
  lives with the table that uses it and the caller's flag is only an override —
  a field one caller remembers to set and another does not is the hand-off this
  project keeps being bitten by.
