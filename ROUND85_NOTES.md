# Round 85

Version stamp **85**.

Quintessence in the loot table, three advancement announcements, and the four
iron-rank benefits made real so the third of those announcements is true.

---

## The three questions, and the answers I built to

| | |
|---|---|
| What Quintessence does | A material you collect and sell |
| The four iron-rank benefits | **Make all four real** |
| How the messages appear | A dialogue box you dismiss |

---

## 1) Quintessence

> *"Add a new item type to the loot table. 'Quintessence' related to the
> elements of the creatures being fought."*

Every monster in this game has carried a `dmgElement` since round 56 — one of
six magical channels, or nothing at all for the ones that simply bite you. It
has driven resistances, debuffs and spell reflect, and it has never been
visible to the player as a *thing*. Quintessence is that field made into an
object: kill a cindermaw and you are holding the fire it was made of.

**Seven flavours by five ranks**, and both halves are load-bearing:

- **The element** comes off the monster rather than off a roll, so the mix in
  your bag is a record of what you have been fighting. Clear a hellhound den
  and you come home with fire.
- **The rank** is what makes it worth carrying. A rat's quintessence and a
  dragon's cannot be the same line in a shop, and without the rank in the id
  there is nowhere to put the difference — the bag is a list of ids and the
  shop counts them.

`formless` is the seventh flavour and is not an element: it is what the two
thirds of the bestiary that hit you with teeth leave behind. Without it most
of the game would drop nothing.

**No diamond**, per the standing rule — the ladder stops at gold like every
other one in the build.

Three decisions worth recording:

- **Its own roll, not a fifth branch of the existing one.** The four drop
  chances in `monsters.js` are branches of a single roll and they *compete*: a
  fifth branch would take drops from the other four and quietly undo five
  rounds of tuning. Quintessence gets its own coin at 34%, because what a thing
  was made of is a fact about the fight rather than a prize for winning it.
- **Its own bag container.** It sells like a monster part, but a bag that mixes
  a wyrmscale with the fire the wyrm was made of cannot show either as a
  category, and the shop lists by container.
- **A drawn icon, not a bare disc.** There is no quintessence in the art packs,
  and the fallback would have been the bare rarity disc that parts and
  consumables still drop as — the one thing in the round-82 notes that reads as
  unfinished. A mote is also the one item where drawing it is arguably *right*:
  it is a floating point of elemental light, which is a radial gradient and a
  bright core, and no pixel art would say it better. Cached per colour, so
  seven small canvases serve a whole session.

One thing this round had to fix that had nothing to do with the ask: **a save
written before today has no `quintessence` array**, and the first kill after
loading would have pushed to `undefined`. The load path now fills in every
declared container by name — written for the container after next, not for this
one.

---

## 2) The advancement announcements

The user supplied the templates; the job was to make every number in them true.

**A queue of pages, not one long box.** Bonding the fourth essence fires 2.1
*and* 2.2 in the same instant — twelve lines — and a box that long is a wall
the player dismisses without reading. Paged, the moment has a shape: here is
what you absorbed, then here is what it made you.

**The text is built by a pure function from a state snapshot** (`advancement.js`),
so a suite can hand it a made-up character and check every line without a
browser, a world or a fight. `advancementFaults()` asserts each template still
contains the phrases the user wrote — as *phrases*, so a comma can be fixed
without failing the build and a missing clause cannot slip through. The 2.3
check reproduces their worked example exactly, lower-case essence name and all.

Two ordering rules, both of which are the difference between a true message and
a plausible one:

- **Announce after the rebuild, never before.** Every number is a claim about
  the character *as they now are*, and `_rebuildAbilities` is what makes those
  true — it forms the confluence, sets the rank, and generates the innate the
  message is about to name.
- **2.2 fires on the transition, not on the state.** A player who loads a save
  with a confluence already formed has not just reached iron rank and must not
  be told they have.

`_slotAwakened` counts off `knownAbilities` rather than off the stones in the
slot, because those two can disagree — a stone whose pairing generated nothing
is socketed and grants nothing — and the number in the message has to be the
number of abilities the player actually has. A socket that produced no ability
says nothing at all: claiming one the player did not get is worse than silence.

---

## 2.2) Four benefits, made real

> *"You have gained damage reduction against normal-rank damage sources… "*

A message that announces a mechanic the game does not have is worse than no
message: the player is told they are tougher, plays as though they are, and
dies. So the four are real, and `rankBenefitLines()` generates the announcement
**from the same numbers the runtime reads** — the percentages in the text are
measured, not written down twice.

**One of the four was already true**, and that is worth writing down rather
than papering over. `RANK_GAP_MULT.down1 = 0.34` has been in the damage path
since round 43: a monster one rank below you does 34% of its damage. The moment
the player reaches iron, every normal-rank monster starts hitting them for a
third. That announcement did not need a new mechanism — it needed to stop being
vague. `rankDamageReduction` *reads* that table rather than adding a second one
beside it, and the message quotes the real number. Adding a second flat
reduction would have double-counted a rule the game already had.

The other three are new:

- **Resistance to lower-rank effects.** Debuff potency has scaled *up* with the
  monster's rank since round 57 and never *down* with the player's — so a
  normal-rank spider's venom was exactly as bad on a gold hunter as on their
  first day. This is the missing half of a rule the game already half-had.
  Applied through potency alone, because `_applyDebuff` does `dur *= potency`,
  so one multiplier both shortens and weakens. (A separate `durationMult` was
  in the first version and nothing read it. An option passed and ignored is a
  lie in the source rather than on screen, and harder to catch.)
- **Aura sense.** Live monsters within the radius, plotted as pips on both maps
  — and on the sewer minimap, which is where it matters most, since down there
  the player cannot see past four tiles. Drawn from `this.monsters` rather than
  from anything remembered, so it is a *sense* and not a map: a pip is where
  something **is**, it vanishes when the thing dies, and it ignores walls and
  fog. Under the player marker on purpose.
- **Sustaining on concentrated magic.** In the books this is what stops an
  iron-ranker needing to eat. A hunger clock is not a thing this game has and is
  not worth adding for one line, so the mechanic is the same idea from the other
  end: an iron-ranker *recovers* from ambient magic — a little everywhere, six
  times as much near a temple or the Department. Added to the three existing
  regens rather than folded into them: those are earned through Recovery, gear
  and footing, this is a property of rank, and mixing them would make a stat
  screen that cannot explain its own numbers. "Concentrated magic" is a read of
  buildings that already carry `temple` or `singleton: 'research'`, cached for
  half a second because it runs inside a per-frame tick.

---

## Tests

**`test_round85` is 25/25, and the four benefits are measured rather than
asserted.** It would be trivial and worthless to check the message contains the
words. Instead the suite hits the player with the same monster at two ranks and
compares the wound (177 damage at normal, 98 at iron); reads the effect
resistance the runtime calls; counts red pixels on the actual minimap canvas
(0 pips at normal, 13 at iron); and drives ten seconds of `_updatePlayer` with
every other regen zeroed to watch mana rise (0 at normal, 3 at iron).

That last one found its own bug: the first version drove `_updateInner`, **which
does not exist**. It reported zero at both ranks and looked exactly like a real
failure of the feature.

### The regression, and an honest note about the lane

93 of 96 recorded, and **four suites came back DEAD that pass perfectly well on
their own**: `round41` (58/3), `round43` (54/3), `round45` (36/1), `round46`
(31/0), `round48_agentB` (all checks passed) — every one at its established
baseline. `round48_agentA` and `round5_essence` are dead at baseline too, as
they have been for three rounds.

The cause is the lane, not the code. `run_fast.sh` runs a failing suite twice —
once shimmed, then isolated — while the shared harness browser stays resident,
so three Chromiums contend for two cores and the suites' own Playwright waits
time out. I measured the round's additions before blaming the environment: the
minimap costs 2.1ms a frame at normal rank and 2.4ms at iron, so aura sense adds
0.3ms; `_nearConcentratedMagic` costs 0.087ms uncached and runs twice a second.
Neither is capable of a 49-second timeout. **The minimap redrawing every single
frame at 2.1ms is a real pre-existing cost** — 12% of a 60fps budget — and is
worth a future round.

---

## Numbers

| | |
|---|---|
| Quintessence rows | **35** (7 flavours × 5 ranks) |
| Drop rate | 34%, on its own roll |
| Loot kinds | 6 → **7** |
| Value range | 9 coin (dim) to 990 (perfect) |
| Damage from a normal-rank source at iron | **34%** |
| Normal-rank affliction strength at iron | **50%** |
| Aura sense at iron | 10 tiles |

## Carried forward

- **The guild quest chain.** Deferred four rounds now, and still the biggest
  hole.
- **Place the ten cults.**
- The bounty bonus grants nothing (~22% of turn-ins promise "+ bonus loot!").
- Consumables and monster parts still drop as bare rarity discs — quintessence
  now shows what the fix looks like.
- The minimap redraws every frame at 2.1ms.
- Act 3's portal specialist does not exist.
- `player.godStanding` is written and read by nothing.
