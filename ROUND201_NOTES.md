# Round 201 — what the books can say, and something to say it at

Seven items. Items 1–3 close the gaps `docs/ABILITY_CANON_GAP.md` found by
reading ten canon transcriptions against our own cards; items 4–6 are the
targeting and controller work; item 7 is the review report
(`docs/ROUND201_BUILDS.md`).

The shape of the round: **three new data modules, and the scene reads them.**
`abilityCanon.js`, `targeting.js` and `hotkeys.js` are pure functions over plain
objects with no import of Phaser, the scene or the camera, so every rule in them
is checkable without a browser — the same reason `advancement.js` has been a
data module since round 85. That is also what let the round-201 suite put five
`*Faults()` calls in its first section and spend the rest of its checks on what
the player would actually see.

---

## 1. Canon hours, at six to one

> "1 hour cooldown should become 10 minutes IRL, 6 hour cooldown should become
> 60 minutes IRL. An 24 hour cooldown should become 4 hours. This lets the
> player still feel like they have to use a resource without slowing down the
> actual gameplay too much."

Three worked examples, and all three are the same ratio — 60/10, 360/60,
1440/240. So it is **one divisor** (`CANON_HOUR_DIVISOR = 6`) rather than a
lookup table, and the table would have been the worse answer: a fourth canon
figure with no row would have fallen through to "unchanged", which is the
silent-wrong-answer shape this project keeps finding.

**The canon figure is kept, not overwritten.** `canonCooldownHours` stays on the
spec beside the played `cooldown`, so a card or a lore screen can still quote
the book. A spec that stored only the divided number could never be checked
against its source again.

**Where the hours band starts was a real decision.** The user phrased their own
rule as "6 hour cooldown should become 60 minutes", so a band starting at 3600s
would print "1 hour" and quietly disagree with the sentence that specified it.
Hours begin at ninety minutes: 3600s reads "60 minutes", 14400s reads "4 hours",
and both match the words the rule was written in.

`cooldownPhrase` also answers the two cases that had no line at all — a real
zero prints `None.` (canon's word on `[Castigate]` and `[Karmic Warrior]`) and a
cooldown computed at use prints `Varies.` (`[Blessing of Readiness]`).

The dense `Numbers now:` line got the same three bands in its own abbreviated
voice (`4h cd`, `varies cd`, `no cd`). It is deliberately **not** delegated to
`cooldownPhrase`: that function writes sentences for the card and this one
writes tokens for a line the player scans, and one function serving both would
give the card abbreviations or the line sentences.

## 2. The card's six format deltas

| Was | Now |
|---|---|
| `Ability: [Leech Bite] (Bolt)` — the template category | `Ability: [Castigate] (Sin)` — the **essence**, from `_srcName` |
| `(0%)` | `(00%)` — zero-padded to two digits |
| `360 minutes.` | `60 minutes.` / `4 hours.` / `None.` / `Varies.` |
| Ten derivable tags | Seventeen — `dimension`, `illusion`, `shape-change`, `boon`, `holy`, `counter`, `counter-execute` joined them |
| `Cost: Moderate mana.` only | `...Very high mana and stamina, per second.` for a drain |
| — | Transformations diff rank-to-rank like perceptions and auras do |

The tag vocabulary moved out of `abilityCard.js` into `CANON_TAG_RULES`, and
every tag is a **rule over the spec** rather than a hand-written list — the
fault this project keeps relearning is a hand-maintained list beside a
generator. `abilityCanonFaults` asserts both directions: every tag in the print
order has a rule, and every rule appears in the print order.

**One delta the new transcription settled against itself.** The gap document
listed "type word on the same line as the name" as a difference, from
`[Specious Sorcerer] (Charlatan) Special ability.` The `[Castigate]`
transcription puts it on the next line, exactly as we already do. Canon does
both; ours is unchanged and the delta is withdrawn.

`statsLineFor` now **drops any segment containing `undefined` or `NaN`**. Found
by writing the ten transcriptions out as specs and reading their cards back — a
spec missing a field some fragment expected put "undefined dmg" and "NaN%
chance" straight onto the card. Reference rows are not the real risk; a
*generated* ability that misses a field does the same thing. Dropped rather than
zeroed, because "0 dmg" is a claim about the ability and is false.

## 3. The linked attribute follows the lowest

> "Linked attribute [Recovery] will advance in conjunction with lowest-rank
> adept essence ability."

`syncSlotsFromAbilities` used the mean. It uses `lowestStanding` now, and this
is not cosmetic: under the canon rule you cannot neglect an ability, so the kit
advances only as fast as its weakest member and the line the game has printed
since round 85 — *"Master all Blood essence abilities to increase your [Power]
attribute"* — becomes literally true. Under the mean, one starved ability was
diluted by four healthy ones and that printed promise was false.

Round 201 also starts printing the linked-attribute rule itself, and printing a
rule beside an implementation of a different rule is worse than printing
neither.

**What did NOT change**, and the distinction matters: the player's own standing
is still the mean of every ability (8.3, `averageStanding`). "How far along is
this character" and "what has this essence earned its attribute" are two
questions, and they now have two functions instead of one shared one.

Both halves of the slot record come from the **same ability**. A first draft
took the lowest standing and left the mean xp, which made the slot a record of
two different abilities at once — and `_migrateAbilityProgress` seeds a new
ability's xp off `sp.xp`, so the mismatch would have leaked into everything
awakened after it.

## 4. Transcendent damage, and the Sin conditions

`transcendent` is the twenty-fifth damage type and the only one that ignores
**both** mitigations. Round 105 explicitly refused to add a strict upgrade, so
the price is charged where canon puts it — in the word "slight",
`TRANSCENDENT_DAMAGE_CUT = 0.45`, applied in `_damageMonster` rather than left
to each ability to remember. An ability that forgot would be strictly better
than every other ability in the game.

It is expressed as a **guard on each mitigation line** rather than an early
return with its own copy of the tail: the rank gap, the curse amplifier, the
karma ledger, the floats and the kill all apply to a transcendent hit exactly as
they do to any other, and a second copy of that tail is a second place to forget
a rule.

**What it does not skip is the rank gap**, deliberately. Armour, resistance and
a ward are *defences* — things an ability can be written to beat. The rank gap
is the statement that a Normal hunter and a Gold beast are different categories
of thing (round 43), and an ability that walked around it would let a starting
character kill anything in the world given time.

`damageMitigationKind` returns a third value, `'none'`, and the armour branch in
the party-damage path became `else if (mitKind === 'armour' && st.armor)`. A
bare `else` would have quietly handed transcendent damage to armour — the exact
shape of the round-105 hole that line was written to close.

**The three Sin conditions** are transcribed from the user's own lines. `[Sin]`
needed nothing new (`ampTypes` has amplified a named damage type since round
105). `[Mark of Sin]` needed three things, and all three are one shape — a
condition whose removal or effect is conditional on another condition still
being present:

```
lockAura          while this is on you, you cannot pull your aura in
cleanseLockedBy   no cleanse may take this off while the carrier holds one of these
healLockedBy      the same list, for healing — "the brand cannot be healed"
```

The lock is checked against the **carrier's own** condition map, which is what
"so long as *the target* retains" says — two targets branded by one caster lock
and unlock independently. And it is **escapable**, which is the design rather
than a concession: strip the `[Sin]` stacks and the mark comes off. A lock with
no door is a condition the player can only wait out, and waiting is not play.

Aura retraction is locked **one way only**: the mark stops you pulling the aura
back, not pushing it out. Symmetric would have been the easier code and the
wrong mechanic — being unable to project is a nuisance, being unable to hide is
what gets you found.

`[Legacy of Sin]` is named in the canon line and not otherwise described, so it
is authored as the one thing the line requires — something that also holds the
mark shut. It carries no amplification of its own; inventing one would be
putting words in the book's mouth.

**`companionOf`.** Canon: "inflicting ... the `[Sin]` AND `[Mark of Sin]`
conditions" — one hit, both conditions. The mark declares `companionOf: 'sin'`
and `_applyDebuff` applies companions at the one door every debuff walks
through, for the same reason round 164 put the subtype check there. A
`_companionDepth` guard exists because a table where A companions B and B
companions A is one field away and would recurse with nothing naming the cause.

## 5. Targeting (item 4)

Before this round the game had **no notion of a current target** — not one
reference to `currentTarget`, `selectedTarget`, `lockOn` or a target ring
anywhere in the source. Every ability re-ran its own proximity query at the
moment it fired, which has a consequence worth stating because the player can
see it: **a single cast resolved its fx, its condition and its damage in three
separate queries**, so a bolt could burn one creature and curse another.

So a current target is not only a convenience. `_nearestMonsterInCone` and
`_nearestMonsterWithin` are the two chokepoints for about fifteen call sites,
and both now answer with the selection first.

**The cycle order is screen-space, left to right.** Ordering by world distance
reads as random the moment two creatures are a similar distance at different
bearings, because the order changes under your feet as you walk. Distance breaks
ties. The **first** press takes the nearest and every press after it walks —
getting that wrong is the difference between Tab feeling like a selector and
feeling like a lottery.

**Two target slots, not one.** An enemy target and an ally target are held
separately, because they answer different questions, and a heal that stole your
attack target would be worse than no targeting. The user's own split — up cycles
allies, down cycles enemies — says the same thing.

A target is dropped when it dies, leaves `TARGET_DROP_RANGE`, or goes unacted-on
for twelve seconds, and `targetInvalidReason` **names the reason**: a target that
vanishes with no reason is a bug report.

**The frame is where a perception finally has somewhere to put a sentence.**
Until now every sense had to express itself as a mark drawn over a creature —
a ring, an outline, a triangle, at most a floating word — because no panel
belonged to one creature. That constraint is why `SENSE_FIELDS_PENDING` has
sixteen entries: sixteen fields the sense tables set and *nothing reads*, this
project's oldest fault class. **Five of them are closed here** by giving them a
row. `leySight` — "magic is visible, and so is whoever is holding it" — is
item 4.4's "resistances on the target frame", and it had no consumer at all.

## 6. Controller and the bar (items 4.5–4.7, 5, 6)

**On item 5, because it changed what got built.** The user listed six chords and
`R2+R1` appears twice, so the list as written names *five* distinct ones. Read
as a typo for `R2+L1` it names six, which is the reading taken — it completes
the obvious pattern (each trigger crossed with each shoulder, plus the two
triple-modifier chords). **If it was not a typo, `PAD_CHORDS` is one row to
delete.**

Six new chords on top of twelve existing addresses is eighteen, and item 6 caps
the bar at sixteen. Rather than leave two chords dead, the two triple-modifier
ones drive the **hand binds** — the left- and right-hand ability overrides that
have existed since round 41 and never had a pad address at all. So all six
chords bind something, the bar is sixteen, and nothing in the scheme is
decoration.

**Slots 1–12 did not move.** Same face buttons, same modifiers, same number
keys. A player who has spent two hundred rounds learning that R2+X is slot 11
should not relearn it to gain four more slots, and `hotkeyFaults` asserts it
rather than trusting it.

Three things the chord dispatcher has to get right, each wrong in a first draft:

1. **One read per button per frame.** `_padButtonJustDown` mutates
   `_padPrevButtons` as a side effect, so asking twice in a frame returns false
   the second time. This is also why `DUP` and `DDOWN` are each read exactly
   once in `_handleGlobalKeys` and the modifier decides what the press meant —
   a first draft read them twice and made interact work while ally-cycling never
   fired.
2. **Exact modifier match.** With both triggers down, `L2+R1` must not fire —
   only `L2+R2+R1`. A subset test would fire three chords on one press.
3. **A bare shoulder is still a swing.** No chord claims L1 or R1 with nothing
   held, and that is a property `hotkeyFaults` checks rather than a convention.

An old twelve-slot save **grows** to sixteen. The previous code replaced any
wrong-length array with fresh nulls, which would have unbound everything the
player had placed.

The bar sizes off the **highest bound index**, not the count of bound abilities.
A player who has deliberately left slots 2 and 3 empty and bound slot 11 still
needs eleven cells, because slot 11 is where their ability is; counting would
renumber their bar every time they unbound something.

The **Controls tab is generated** from the binding table now. It had drifted —
it described interact as "Touchpad (or D-pad up)" when D-pad up is the ally
cycle, and listed twelve slots when there are sixteen. A reference that can
disagree with the thing it documents is worse than no reference, because the
player believes it.

## 7. The report

`docs/ROUND201_BUILDS.md` — three builds generated from the live build, one with
a weapon essence (Sword + Blood + Iron → Arsenal), one summoning (Wolf + Bone +
Rat → Unity), one on the canon shapes (Sin + Light + Balance → Glimeron). Every
card in it was rendered by `abilityCard.js` from an actually socketed kit.

The three draw **10, 13 and 12 bar cells**, which is item 6.1 working.

---

## Regression

Two runs. The first (`r201`) came back 198 suites, 16.05 min, 0 dead, 0 timeout,
168 ok, 18 probe, **12 fail** against a round-200 baseline of 3. All twelve were
triaged and ten of them were round 201's own doing:

| Suite | Why | Fix |
|---|---|---|
| `round15`, `22`, `23`, `28`, `88` | `hotbar === 12` | Asserted against `HOTBAR_MAX` and against the dynamic width — the property the literal was standing in for |
| `round27`, `121_auras`, `133_world` | D-pad bindings moved by the user's ruling | Rewritten to ask `hotkeys.js` instead of regexing the scene's source |
| `round146_canvas` | The bar is narrower and re-centred | x and width freed; replaced with "the bar is centred on the canvas, whatever width it is" |
| `round57` | The three Sin conditions had no icon, no carrier, no reach | Real work — see below |
| `round76c`, `round132_world` | Pre-existing, unchanged since round 199 | — |

**Round 57 was the one that found real gaps**, and it is the suite doing its job:

* `stackVoid` is not a frame in `status_icons.png`. The three conditions now use
  `stackSin` (frame 37, which already existed), `unholy` and `holy`.
* `brand` and `judge` are not levers `essenceLevers.js` has. A condition naming
  a lever that does not exist is a condition nothing can ever roll — they use
  `absolve`, `fate` and `raw`.
* Nothing carried them. A gilded demon — the one creature on the roster whose
  character is passing sentence — carries `sin`; a shade carries
  `legacyOfSin`.
* `markOfSin` was unreachable, and correctly so: it is a companion. Both the
  reachability check and the carried check now **derive** the exception from
  `companionOf` rather than growing a hand-written list beside the table.

Five of the ten were "a check that counts the roster rather than tests the
property" — the failure mode round 200's notes named. Each went red on the round
that *added* something, not the round that broke something, which is the
signature. All five were rewritten to test the property.

The second run (`r201b`) came back clean:

```
198 suites   15.95 min   0 dead   0 timeout
178 ok       18 probe    2 fail
4,837 checks passed, 2 failed
```

Both fails are the pre-existing `round76c` / `round132_world` pair, unchanged
since round 199 — one better than round 200's three, whose third was a rotating
twelve-worker flake. `tools/tests/test_round201.cjs`: 73 checks, 0 failed.

The data lane is unchanged; no round-201 file has a dead export.

## What is not here

**The generator cannot reach the new shapes yet.** The transformation template,
a `Varies` cooldown, a two-pool drain, an hours-scale cooldown, the
`allyNotSelf` exclusion, `transcendent` as an ability's element — all reachable
by a spec that declares them, all proved to render by the ten transcriptions in
`abilityCanon.js`, and **no socket rolls one**. The vocabulary exists and
nothing is using it, which makes teaching the generator to reach for it the
obvious next round.

Also still open from the gap document, each worth its own round: subjective time
dilation, racial powers as a power source, decoy entities as real objects, and
the abilities-that-modify-abilities class the lore reference has been asking for
since round 51.
