# Round 205 — a rank line nobody printed, a name nobody checked, and an arsenal

Four items, and three of the four turned out to be the same shape underneath:
a rule that was written correctly and then enforced at one door out of two.

**Regression `r205b`: 201 suites, 181 ok, 2 fail, 4,992 checks passed, 16.1 min.**
(`r205a`, before the Desolate change, was the same 201/181.)

- `test_round132_world` — standing since round 200, unchanged.
- `test_round49_stealth` — *"a damage aura bites while you are unveiled"*.
  Passes here 45/45. It was one of r204's four flakes too, and `test_round41`
  (r205a's other fail, also clean locally at r204 and r205) passed this run —
  which is the flake diagnosis confirming itself. The runner's own log reports
  it falling back to Playwright's Chromium rather than the pinned build.

`test_round205.cjs` is new — **42 checks, 10 sections**, all passing.

---

## 1.1 — "Ability is silver rank but doesn't have a bronze or silver effect"

> **Ability: [Hammer Mastery] (Axe)** … Current rank: Silver 6 (34%).
> Effect (iron): … *and it goes on deepening in other ways as you rank.*

Two separate faults, stacked, plus a third in the name.

**(a) The ladder was deleted.** `rankAspectsFor` opens with

```js
if (a.riders && a.riders.length) return [];
```

written in round 77 for a good reason — an attribute passive has a *hand-written*
rank table and a generic potency step on top of it would be a second, vaguer
answer to a question that already has a good one. But round 204 made the
proficiency sweep stamp `prof` onto **whichever passive the slot already holds**,
and when that passive happened to be an `attrBoost`, the mastery line — the one
place a weapon essence's three promises live — was silently thrown away.

Measured: **11 of 347 masteries had no rank ladder at all.** Now `!a.prof` is on
that condition, and the two tables don't collide: the riders grant attribute
stats, the mastery rungs grant `masteryDmgPct` / `masteryConjures` /
`masteryCheaper`.

**(b) The riders were never printed either — on any card, since round 190.**
This one is wider than the mastery. `ATTR_RANK_RIDERS` has held bronze/silver/gold
for every attribute since round 77 ("the small hurts close on their own",
"+12% health recovery"). `rankEffectLine` reads them. Round 190 rebuilt the card
out of `rankAspects` alone and nothing has called `rankEffectLine` for a card
since. **Every attrBoost and every waterWalk in the game has shown one iron line
at every rank for fifteen rounds**, under a description that says in so many
words that it goes on deepening.

That is this project's fault class 2 — written by one side, read by none.
`rankAdds` now renders them, sentence and figure both.

**(c) "Hammer Mastery" on an Axe essence.** The rename read
`PROFICIENCIES[key].grants[0]` — the proficiency's *first* weapon, which for
`power` is the hammer whether the socket held a hammer or an axe. A proficiency
covers two weapons on purpose; the essence covers one, and the essence is what
the card prints in brackets two words away. New `ESSENCE_WEAPON` +
`masteryWeaponFor`, asserted in `proficiencyFaults` so the table can't drift
from the grants it has to agree with.

| essence | now |
|---|---|
| essSword | Sword Mastery |
| essKnife | Dagger Mastery |
| essAxe | **Axe Mastery** |
| essHammer | Hammer Mastery |
| essSickle | **Scythe Mastery** |
| essSpear | Spear Mastery |
| essBow | Bow Mastery |
| essWhip | Whip Mastery |

**And, mid-round:** *"Note Sickle = Scythe."* `essSickle` was mapped to `blade`
on the reading that a sickle is a short curved blade — so a Sickle essence
taught you swords and daggers, and the one weapon it is actually about answered
to a different proficiency entirely. It's `polearm` now. One line, and it fixes
the grant, the blurb and the name together.

---

## 2.1 — "What about this has anything to do with healing?"

> **Ability: [Healing Spike] (Spear)** — Holds every creature within 8 tiles in
> place for 5 seconds … *They cannot be healed while it holds.*

`NAME_REQUIRES` has gated `heal|healing|mend|restor*|…` on the `heals` tag since
round 49, and it works. The question was why it didn't fire. Three answers, and
the third is the one that matters.

**(a) The signature door never asked.** `buildSignatureAbility` adopts
`entry.name` wholesale and has never called `nameContradictsSpec` once.
"Healing Spike" is authored in `essenceSignatures.js` against
`catKey: 'self_active_timefreeze'` — **the contradiction is in the table**, so
no amount of work on the naming rules could have caught it.

**(b) The socket door asked too early.** `pickAbilityName` runs partway through
`generateCategoryAbility`, before the lever twist, the mech pin, the debuff and
the cost pass — any of which can move the template family out from under it.

Both now re-ask at the bottom, against the finished spec. And
`generateCategoryAbility` is a **wrapper** around its old body, because the
first cut put the check next to `spec.stats = …` and measured 31 → 4 with
"Restorative Hibernation" still in the list: the body has a dozen early returns,
one per template family that builds its own spec whole, and the bottom of the
body is not the bottom of the function. Fault class 3 in its purest form.

**(c) The actual cause, underneath both.** The identity-word exemption — a word
that *is* the essence's or the stone's own name is identity, not a mechanical
claim — was a **bare substring replace**:

```js
n = n.replace(new RegExp(escape(w), 'ig'), ' ');
```

An Awakening Stone of the **Rat** strips `rat`. `"Resto`**`rat`**`ive"` contains
it. The name reached the rules as `"Resto ive Hibernation"` and no rule below
could see a promise of healing in it. It shipped on a `selfCritBuff`.

It is not one stone: `Ice` is inside `Justice`, `Sin` inside `Single`, `Bow`
inside `Elbow`. Every one of those silently switched off a naming rule for any
name containing its letters — and the failure is invisible, because the function
returns *"this name is fine."* `\b` on both sides now.

**31 heal-named non-healers per 500 kits → 0.** The re-check refuses ~1,030
names per 150 kits, so it is doing real work rather than passing everything.

---

## 3 — the curse

> 3.1 "Curse reads as a spell, but its a special attack."
> 3.2 "I also struggle to see the connection to a awakening stone of the monkey.
> Maybe a scorpion, spider, or snake…"

Two claims in one word, so two rules over one vocabulary
(`curse|cursed|hex|jinx|malediction|malefic*|anathema`), named once rather than
written twice:

- **`casts`** (round 204's tag) — a curse that wants an axe in your hands and
  spends stamina is a swing, whatever it's called.
- **`curses`** (new) — the word is a claim about *where the ability comes from*.

For 3.2 the test is the **family** both catalogues already carry, not a list of
stones: `serpent` (Snake, Spider, Lizard, Venom — your own three), plus `dark`,
`death` and `blood`. Everything else may hit you very hard and may not curse
you. Either the stone or the essence can justify it, so a Venom essence through
an Iron stone is still a poisoner.

**19 curse-named swings → 0**, and 13 legal curses per 150 kits, so the
vocabulary is gated rather than banned. Monkey no longer curses; Snake and
Spider do.

---

## 4 — the Arsenal confluence

> "Lets says 2+ weapon essences always result in the arsenal confluence."

**Done, and it costs one trio — which then gets the ability anyway.** 4,088
two-weapon trios, **4,087 now Arsenal**. The exception is
`Cold + Hammer + Sickle → Desolate`, the TTRPG sheet's own ruling; round 117's
rule is that where the source material has ruled, the ruling stands, so the
forcing sits *under* the canon rather than over it.

> *"the specific cold, hammer, sickle version of the desolate confluence should
> have a similar guaranteed ability to have sickle and hammer essence abilities
> benefit one another."*

**205b: the gate is the essences, not the name.** The sweep first tested
`confDef.name === 'Arsenal'`, and that was the wrong hook. The cross-application
is a fact about a player carrying two weapon essences; Cold + Hammer + Sickle is
exactly that player wearing a name the sheet gave them. Tying a mechanic to a
*name* also means any future canon row holding two weapons quietly loses it —
fault class 3 dressed as a confluence. It's the weapon-essence **count** now.

That settles the other edge without a second rule: `Myriad + Shield + Sword`
reaches Arsenal by the canon row with **one** weapon essence, and one essence
has nothing to cross-apply to. It keeps the name and skips the passive rather
than carrying a sentence about sharing between a sword and the sword.

```
Ability: [Desolate Arsenal] (Desolate)
Passive ability (shadow).
Current rank: Silver 2 (40%).
Effect (iron): Each time you land a weapon strike, 5 stamina a second comes
  back for 5 seconds. This can happen once every 4 seconds. It also grants 7%
  shadow resistance at all times. Every weapon your essences reach — axe,
  hammer, javelin, scythe and spear — counts as every other: a bonus you own
  with one of them, you own with all of them.
Effect (bronze): Your special attacks stop asking which of them is in your hands.
Effect (silver): Any of them answers when you call, wherever you left it.
```

Named for the confluence it belongs to: the card prints `(Desolate)` on the line
above, and a name arguing with it is the mismatch item 1.1 was about. Arsenal
keeps the plain form, because "Arsenal Arsenal" is not a name.

Verified: **25 of 25** Cold+Hammer+Sickle kits carry it, with the hammer's
weapons *and* the sickle's both in the shared set; **0 of 15** Myriad+Shield+Sword
kits do.

Last round's measurement said 71.4% already resolved here and that Arsenal is
the only name in the 99-name catalogue whose vocabulary is weapons. This makes
the concentration a decision instead of an artefact — and gives it something to
deserve.

### The passive — 4.1, 4.1.1, 4.1.3

A **post-build sweep**, the same shape as round 202's proficiency sweep and for
the same two reasons: it costs the kit none of its 12 actives / 8 passives, and
it needs the *finished* kit — the weapons to share across come from the
masteries, and the masteries are stamped by the sweep directly above it.

"Always", which is why it's a sweep and not a signature: a signature pool offers
five and the socket picks one, and an identity that arrives four times in five
isn't an identity. **80 of 80 two-weapon kits carry it**, whatever the confluence is called.

The weapon set is the **proficiencies' grants**, not the essences' own weapons,
because that's what your example says — "Hammer Mastery and Spears fury apply
their effects to both Axes and Spears": a Hammer essence's mastery covers the
axe too, and the axe is in the set.

```
Ability: [Arsenal Implants] (Arsenal)
Passive ability.
Current rank: Silver 3 (50%).
Effect (iron): A permanent increase to one of your core statistics. It also
  reduces the cooldown of every other ability you have by 11%. Every weapon
  your essences reach — bow, crossbow, dagger, sword and whip — counts as
  every other: a bonus you own with one of them, you own with all of them.
Effect (bronze): Your special attacks stop asking which of them is in your hands.
Effect (silver): Any of them answers when you call, wherever you left it.
```

The **iron rung is deliberately empty**, exactly as `mastery`'s is: the sharing
*is* the passive, and the description can name the weapons, which a static label
can't. The first cut had a rung as well and the card printed both one sentence
apart — fault class 4, one ability offered twice.

### The ladder

| rank | |
|---|---|
| iron | the sharing itself (the passive, stated in its description) |
| bronze | **4.1.2** — special attacks stop asking which of them is in your hands |
| silver | any of them answers when you call |
| gold | the sharing stops being about your essences: anything you can hold is one of yours |

4.1.2 is implemented through `weaponCountsAs`, the map `_wielding` has read
since round 112 — so a bow in hand satisfies a special attack that wants a
spear, and **nothing in the cast path changed**. The HUD's "Needs a Spear" line
reads the same function, so it agrees for free.

Runtime, verified live: two gold masteries (polearm + dexterity) and the
arsenal passive → `masteryDmg.bow === masteryDmg.spear === 0.9`, 11 weapons in
the set at gold, `weaponCountsAs.bow` includes `spear`, `_wielding('spear')`
true with a bow held.

**4.1.4** — "Some limitations may need to be placed onto Staffs and Bows. Will
playtest and find out" — is deliberately *not* anticipated. A limit invented
before the playtest is a limit nobody measured.

---

## Still open

**"Call the Bee" summons a lizard** (flagged in round 204, not fixed). The
creature comes from the stone and the name from the essence. Same class as 2.1
— and now that the name re-check runs against the finished spec, the machinery
to fix it is in place: it needs a `summonCreature` tag the name can be judged
against. Next round unless you'd rather have something else.
