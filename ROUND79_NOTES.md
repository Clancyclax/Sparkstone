# Sparkstone — Round 79

**Version stamp: 79** (under the minimap — if it still says 78, the update did not land).

All sixteen bugs, on your answer. The guild chain is round 80.

Four of your answers shaped the work and are quoted where they land: AOE is
**softer per target plus a longer cooldown**; a card shows **flavour, the
current rank's effects, nothing else**; kit synergy is **a soft touch — ban
what the kit cannot feed, keep the variety**; and all sixteen bugs before the
chain.

---

## The generator

### 11 — "Summon Gauntlets of Blades"

> *"The name is nonsensical, it's a sword, not gauntlets."*

It is, and the cause was one word in a test. Three separate gates were meant to
stop this — the category's `sheetFilter`, the runtime's `nameContradictsSpec`,
and the signature generator's own `NAME_GATE` — and **all three asked whether
the right word was ANYWHERE in the name.** "Summon Gauntlets of Blades" holds
"Blades", so it sailed through the weapon filter while promising armour. The
same hole let "Sigil Dagger" onto a trinket and "Summon Gauntlets of the Wolf"
onto a summoned creature.

English settles it: in *X of Y* the head is X. So the item a name promises is
the **first** item noun in it, and that is the one the mechanic has to deliver.

- **Measured before: 2,188 of 13,001 relic abilities that named an item named
  the wrong kind — 17%. After: 0 of 404,040 abilities contradict their
  mechanic.**
- `summonWeapon` now knows *which* weapon it conjures, asked of the same
  `weaponForAffinity` the affinity category uses. Your example now reads
  **"Summon Runesword — Conjures a sword of shadow"**, and a name promising a
  different weapon is refused.
- The affinity got the same rule for free: 44 of 9,472 said "Carving Knife" over
  "long practice with the sword".
- **Nine shipped signature names were renamed by hand** (Clawblade, Fleeting
  Charm, Fleetfoot Talisman, The Standing Guardian, Graven Signet, Summon the
  Drawn Blade, Threaded Charm, Call the Pack, Charm of Fury) rather than
  regenerating the file — regenerating reshuffles 1,278 names to fix nine.
- `validateSignatureNames` runs at boot, so a regenerated file cannot bring it
  back silently.

### 10, 10.3, 2.3 — the card, and rank-ups that are real

Two things were wrong and neither was visible.

**The display half.** An attribute ability printed its whole rider table —
*"bronze: +10% mana recovery · silver: +6% cast speed · gold: +4% crit chance"*
— on an Iron character who had reached none of them. Round 77 wrote the filter
and used it in the runtime; **the card never called it.**

**The thematic half was worse.** `RANK_ASPECTS` held **four aspects for the
whole game** — every one of 404,040 abilities promised *"strikes apply a light
bleed"* at Iron, the self-heals included — and `_scaledAbility` hung them on a
field **nothing read**. So the rank-ups were neither thematic nor, in any sense
a player could observe, present.

Now: four aspects **per ability**, built from that ability's own element and
what it does, and every one expressed in a field the runtime was already
applying.

| | a striking ability | everything else |
|---|---|---|
| Iron | every hit leaves *its own* affliction (Burn, Decay, Frostbite…) | +10% to its own effect |
| Bronze | 15% of the damage carries to two more foes nearby | +20% |
| Silver | +10% critical chance with this ability | it comes back 10% sooner |
| Gold | it strikes 25% harder | +25% again |

An ability that already carries an **authored** rider table (the attribute
passives, the water walk) keeps it and takes no generic ladder — those were
written by hand and named after what they do.

The card is one line, headed with the rank it is true at, and the aspects are
**merged by kind** rather than listed: three potency steps read as *"the mending
is 55% stronger"*, not as a changelog.

```
Summon Runesword
Conjures a sword of shadow that increases your weapon damage by 19%.
Iron Rank Effect: +19% weapon damage · +8% Radiant Resistance · every hit leaves Decay behind
```

The `Epic:` label is gone with it (2.3) — a conjured relic's buffs are live the
moment it is worn, and grouping them behind a quality word read as a second rank
gate sitting inside the rank heading.

### 8 — kits that depend on what they cannot do

> *"A shadow pierce with no shadow damage in the kit."*

**Measured: 47 orphaned dependencies across 600 kits — 7.3% of kits had at least
one.** Two conditions, and each got its element from a different wrong place:
`elementPierce` took the **socket's** material, so a Shadow stone in a Fire
essence made a shadow pierce over a kit that deals fire; `passiveConditional`'s
vsElement rolled one of six **at random with no reference to the build at all**.

On your soft touch: nothing is removed and no pool is narrowed. The two
conditions are **retargeted** to an element the kit actually deals, after the
kit exists — because what a kit deals is not knowable until it does, and
constraining every socket to the elements chosen so far would let the first
socket decide the whole build's palette.

**Now 0 orphans, with all 40 pierces and 29 conditionals still there.**

### 5 — what it costs to hit everything

> *"AOE abilities need to cost more, have a longer cooldown, or hit softer."*

You chose two of the three. Cost is untouched.

**Measured before:** the single-target bolt averaged **7.8 damage on a 1.03s
cooldown**; the blast bolt averaged **8.0 on 1.06s** — more damage, same
recharge, *and* it splashed 60% to everything else. It was not a trade-off, it
was the same ability with a free area attached.

| | before | after |
|---|---|---|
| bolt | 7.8 dmg @ 1.03s | unchanged |
| blast bolt | 8.0 @ 1.06s | **4.2 @ 1.57s** (54%, 152%) |
| ring | 7.1 @ 6.2s | **4.2 @ 6.2s** |
| lingering ring | 4.0 @ 6.2s | **3.4** + its DoT |
| breath cone | — | **4.6 @ 4.2s** (55%, the top of the band: it has to be aimed) |

The blast now hits **everything in it for that same figure** rather than the
target for full and the neighbours for 60% of full — one number on the card
instead of two you have to multiply.

> **And it moved something it had no business moving.** Cast time is derived
> from ability strength, and strength reads per-target damage — so halving every
> AOE quietly pulled the top off your own 1–5 second band: the longest cast in
> the game fell from 4.8s to 2.6s and the four- and five-second casts vanished.
> Nothing had become gentler; only the number being read had moved. An AOE's
> impact is now read back at full strength, and the band is 1.1s–5.0s with 54
> abilities above four seconds where there were four.

### 9, 9.1 — the placeholder

> *"The summon for a water × cat essence gave the placeholder model."*

Not a missing creature: a **Cat essence has summoned a whitelion since round
75**. The creature table was only ever asked by **one** of the three things this
game calls a summon. The bonded familiar never asked it, and neither did the
escort the `call` lever attaches to ordinary abilities — both went to a method
that knew about chickens, ducks and floating weapons and sent everything else to
round 73's diagnostic dragon.

**Measured over 300 kits: 80 bonded familiars and 488 escorts against 390
creature summons. Two thirds of every summoned thing in the game was reaching
the stand-in.**

- The same question now gets the same answer wherever it is asked. Your Water ×
  Cat familiar draws `mon_whitelion_idle` and walks its orbit on the monster
  sheet's own frame arithmetic.
- A **weapon essence's** familiar is the weapon — the sprite has existed since
  round 50 and was reachable only when the rolled *name* happened to contain a
  weapon word, so a Spear essence's "Long Reach" got a dragon.
- Three empty families filled: `guard` → the Gemtusk, `motion` → the raptor,
  `air` → the thunderbird.
- **Fowl essences are held out on purpose** so the data says what the screen
  shows: a Chicken essence's familiar carried `familiarFamily: 'thunderbird'`
  (its family is `flyer`) and rendered as a chicken.

**Still on the dragon, and this is the stand-in doing its job:** 24 essences
have neither a creature nor a weapon — Adept, Balance, Chain, Cloth, Dimension,
Echo, Eye, Gathering, Hair, Hand, Harmonic, Knowledge, Magic, Myriad, Net, Omen,
Paper, Rune, Serene, Song, Technology, Thread, Trap, Vast. Tell me which of
those want a body and I will bind them.

---

## The world

### 1 — entrances behind the building

**Measured: 96 of 371 doorsteps — 32% — pointed more than 90° away from the
nearest carriageway, 12 sat somewhere the player cannot stand, and 74 buildings
had no road within twenty tiles at all, where the code fell to a hardcoded
"south" whatever was standing there.**

Round 50 fixed this once, for the civic buildings, by letting an authored facing
beat the road search. What it left in place was the search itself, and
`findRoadDirection` asks a question too narrow to answer this one: it casts
**four rays** and takes the first carriageway each meets. A house whose street
runs diagonally past its corner is missed by all four.

> **And the first cut of the fix changed nothing measurable,** because almost no
> building's facing is authored: `facing` is assigned at spawn from the *same
> four-ray search*, defaulting to 'southeast'. Deferring to it was deferring to
> the broken answer under a different name. A singleton or a temple is genuinely
> hand-placed and still wins; everyone else is scored.

A door now needs three things in this order: somewhere the player can **stand**,
the side the **street** is on, and open ground to arrive across.

| | before | after |
|---|---|---|
| blocked / in water / inside another building | 12 | **0** |
| facing away from the street | 96 | **54** |
| …of which the street side is physically blocked | — | **53** |

The one remaining door with a clear street side and its back to it is a
15-tile-distant road just outside the search ring. The other 53 have a fence or
a neighbour on their front and are doing the right thing with a bad hand — a
**gate through the garden fence** is the fix for those, and it is a round of its
own.

### 3 — the packs at Cadence's gate

Both halves, one cause. The generator kept groups out of a settlement by **one
margin — 260 units, about eight tiles** — added to that settlement's radius, and
used the same number for a five-house hamlet and for the capital. Cadence's
radius is 61 tiles, so **the first legal pack anchor sat eight tiles outside the
wall.**

"Too thick" is the same fact: every surviving cell was filled at full size, and
because the exclusion is a hard circle that density began abruptly at a fixed
radius — which is what makes it read as a wall of monsters rather than as
country getting wilder.

| distance from the wall | before | after |
|---|---|---|
| 0–400u | 2 groups, **33 monsters** (avg pack 16.5) | 0 |
| 400–800u | 5 groups, **102 monsters** (avg pack 20.4) | 0 |
| 800–1200u | 5 groups, 30 monsters | 1 group, **2 monsters** |

A city gets a 760-unit approach (24 tiles of open road); a hamlet keeps its 260.
Past it the frontier is **graded** over 900 units — a group near the edge is less
likely to exist at all and smaller when it does — so the wilderness thickens
instead of starting. Roaming packs read the same rule, from the same function.

### 4 — the bridges

> *"Remove the bridge models and replace them with a 3 tile span."*

Done, everywhere — the three Cadence fords, the named river crossings, and the
waterside scatter that could drop a bridge sprite on a lakeshore. A bridge model
is a building drawn from one angle and these rivers run in every direction, so on
most crossings it lay across the water sideways.

The deck is what a crossing actually is in this game, and it was **far too wide**:
the walk emits two steps per tile and a named crossing is ten-plus tiles long, so
each of ten to twenty consecutive steps paved a square as wide as the river —
a fifteen-tile hole that read as the river simply stopping. Now one span per
crossing: **three tiles along the river, the river's full breadth plus two tiles
of bank across it.** Measured: every wet river's crossings are 3–5 tiles.

> The first cut stepped in **whole tiles** and produced dotted lines on the
> diagonal rivers — a bridge with holes in it. Quarter-tile steps cannot skip a
> tile at any angle.

**A finding while in there: Bratugal's two rivers had no crossings at all.**
Neither carried `bridgesAt` nor `bridgesEvery`, so nothing ever paved a step
across a ten-tile channel and an eight-tile one, cutting the rainforest into
three pieces since the region was written. Three crossings added.

### 6 — the trees east of the map: **I could not reproduce it**

Said plainly rather than guessed at. I checked, in this order:

- **no obstacle of any kind is outside the map or on a void tile** (0 of 7,352);
- **the eastern edge band of every region is 0–1% obstructed**, the same as the
  middle;
- no tree stands on a doorstep, a road tile, a river bed or a bridge deck — the
  forest predicate has refused all four since round 19.

So whatever you saw is real and my reading of "east of the map" is wrong. **A
screenshot, or the coordinates off the map screen, and this is a ten-minute
fix** — the scatter has a single veto predicate and adding a rule to it is one
line.

---

## The panels

### 7 — the shields, and one line that was the whole bug

A gear uid is a **number**. It reaches the equip method through
`btn.dataset.uid`, which is always a **string**, so every caller has to convert
— and **only one of the three did.** `gearequip` wrapped it in `Number()`;
`gearequipL` and `gearequipR`, added in round 46 to give shields the same
two-hand choice weapons have, passed the raw string. `g.uid === "17"` is false
for `17`, so the lookup returned nothing and the method returned having done
nothing and **said nothing**.

Every shield in the game uses exactly those two buttons. Fixed at the door every
equip route goes through, not at the two call sites, so the next route added
cannot get it wrong.

### 14, 15 — Zeke's stones and Zeke's gear

Both, and **one line caused both.** Round 49 put the Team tab's three actions
into the inventory's delegated click handler on purpose, and said so in a
comment: *"routed through the same delegated handler every other inventory
button uses, so the Team tab does not grow a second event system."* The intent
was right. **The attachment was not:** the listener hangs off the *Inventory*
tab, and the buttons are rendered into the *Team* tab. A click never reached an
ancestor carrying it, so nothing happened — silently, because a delegated
handler that never fires raises nothing.

Verified by calling the two methods directly: both work, and always have. It was
only ever the wiring. The listener now hangs off the panel, which contains every
tab.

### 16 — the inventory

726px by 70vh was sized against the 960×600 canvas, but the panel is
`position:fixed` and lives in the **browser's** viewport — so it had been
leaving most of a modern screen empty while the twenty-ability roster scrolled
inside a box two thirds of a canvas wide. Now `min(1180px, 96vw)` by
`min(900px, 92vh)`: **1,222px measured**, and it still fits a laptop and a phone.

### 12, 13 — Zeke

**12.** Every pin the map drew came from `player.quests`, which is the **bounty**
list — a board contract with a monster uid and a spawn point. A recruit quest is
not one of those, and nothing on the map had ever been told it exists. Clark
Bottom Farm now shows as a violet diamond, labelled, **not gated on
exploration** (an objective you have been given is a thing you have been *told*),
and it clears itself the moment he is recruited because it is a read of his
`recruited` flag rather than a marker with its own state.

**13.** Already true, and now verified: Zeke's Chicken essence hand-authors
*Clutch* on the bonded-familiar category, and it draws as a chicken that walks
station beside him. The round-79 change here was to stop the *data* saying
otherwise.

---

## Regression — and what it turned up

**62 suites clean, 16 informational probes, 12 with failures**, plus the 21-check
data lane and **44 new checks** across `test_round79a` (23) and `test_round79b`
(21). Round 78 left `test_round73` and `test_round74` unverified; **both are
verified this round and both are green** (74/74).

**Seven suites were repaired, and five of them had been failing or dying for
rounds without anyone seeing why:**

| suite | what was actually wrong |
|---|---|
| round22 16→**57/57** | It clicked `#titleNew` a second time *mid-test*, with the game running — which **started a new one** and respawned the player twenty tiles from the doorstep it had just placed them on. And with an overlay still up, the round-73 clock pause means `update()` never runs, and the E key is polled from `update()`. It read as "the door is broken"; driving the doorways in code enters all twelve authored rooms. |
| round36 **DEAD**→26/0 | Predates the round-60 title screen; called `_closeCharacterCreator()` on a scene that had never started a game, threw before its first assertion, and had been reported DEAD for as many rounds as the title screen has existed. Its "temples have NO furniture" check is superseded by round 78's item 8.1.3 and now checks that they *are* furnished. |
| round38 **DEAD**→runs | Same cause. Now visible: two genuine failures about the weaken ring's slow (below). |
| round57 59→**61/61** | My own AOE change, caught and fixed — see the note under item 5. |
| round74 73→**74/74** | Its "each named crossing has a bridge model" is superseded by your item 4; rewritten to check the crossing exists on the ground. **And it caught a real fault I introduced:** a destroyed familiar sprite being drawn on for one frame after a kit rebuild. Guarded in both the familiar and summon loops. |
| round75b 1→**54/0** | Pinned `GAME_VERSION === 75`, so it had failed on every round since. Now checks the stamp exists and has not gone backwards, which is the property that matters. |
| round77b 25→**26/26** | Counted where the ten heavy-hand sources were *filed* rather than whether they arrive, and round 78 moved Avatar between the two lists. |
| round30 20→**22/0** | Round 30's alternating red/grey plaza rings were replaced by round 78's tile plan (the plaza is `street_tile` 16–18, a per-tile scatter). Rewritten to the property that survived: a plaza is paved from one declared set, in several frames. |

**Still failing, all pre-existing, none touched this round.** Three of them are
only visible now because the suites that report them stopped dying first:

- **round19** (2) — city-paving variety and town trees, both round 78's tile work.
- **round23** (5) — the prop atlas is 98 cells, not round 22's 67. Worth a look:
  it reports **fifteen source images each serving two props** (`FURN0` is both
  `rostrum` and `benchRed`), which if real means half of round 78's new
  furniture is drawn from round 22's art.
- **round24** (1) — the guard count; verified pre-existing in round 77.
- **round28** (2) — the whip's single target and the sweeping arc.
- **round38** (2) — the weaken ring's slow does not reduce speed.
- **round47** (3) / **round48_runtime** (5) / **round49_taunt** (2) — triggered
  passives, the reach buff, the ally aura, the fate reroll and the taunt expiry.
  All real-time soaks on a two-core box; the taunt one in particular.
- **round48_agentA / agentB** (1 each) — a bounty-name wording check, and Zeke's
  job offer answering with the sleep dialogue.

I would rather list these than fold them into a headline number.

### One tool change

`run_fast.sh` takes **slices** now: `bash tools/run_fast.sh log 15 15`. Ninety
suites is longer than a single foreground command may run, and backgrounding it
is what cost round 78 two hours of believing a finished run was still going.
Results accumulate across calls; nothing runs unwatched.

---

## What did NOT land

- **Item 6 (trees).** Not reproduced — see above. It needs a screenshot.
- **6.4, the wall end caps.** There is no end cap. See the addendum.
- **The guild quest chain**, on your answer — round 80.

---

# Addendum — the carry-overs, cleared

Everything round 78 left open is done, except the one item whose art does not
exist. Three of the four turned up something the original note had wrong.

## 6.1 — the market and the street

Round 78 packed `city_stalls.png` (16) and `city_cityprops.png` (11) and placed
neither, saying placement "needs rules of its own". Here they are, and the
first of them is why the sheets sat unused for a round:

> **What each cell IS was settled by looking at it.** All sixteen stalls are
> prompted "Market Stalls" and ten of the eleven city objects are prompted
> "medieval city objects" — the metadata cannot tell a fountain from an anvil.
> Round 78 learned the same lesson when a pack called an old bald man a female
> priest.

**123 props across 13 settlements**, and the rules are the design:

- **A market is a ROW.** Stalls lay along one street line through the square,
  alternating sides. Three stalls dotted round a plaza read as three abandoned
  stalls; three in a line read as a market.
- **A stall stands on paving.** Capping the row at a fraction of the
  settlement's radius was the first attempt and it does not work for the
  capital — Cadence's radius is 61 tiles and its *built* ground is nothing like
  that wide, so a row walking 33 tiles from the square came out among the
  trees. That is what the first screenshot showed. Asking the ground instead
  needs no tuning: the market is as long as there is street to lay it on.
- **One landmark per settlement**, chosen by size rather than rolled — a
  fountain is civic engineering and a hamlet has not got the money, so a hamlet
  gets the well. You should be able to say "meet me at the fountain".
- **Clutter goes against a wall.** Barrels in the middle of a square are a
  delivery; barrels against a wall are a town.

Four bugs found by measuring rather than by looking, and one of them is a trap
worth naming:

> **A hash that steps with its index keeps its parity.** The goods are placed
> only when `(h + i)` is even, so indexing the two-entry bank by `(h + i)` chose
> element 0 every time: 19 sacks of spice and not one crate of produce.
> Re-salting as `seed|goods|i` did **not** fix it — `stableHash` is
> `h * 31 + charCode`, so two keys differing only in their last character
> differ by exactly that, and stepping `i` by two steps the hash by two. The
> fix is a counter that only advances on a **successful** placement, which
> cannot correlate with failure at all.

Also fixed: a keep-out rule that cancelled another rule (the frontage guard
rejected 35 of 40 barrels and every anvil, because clutter is *meant* to be
against a wall); props stacking on each other because the collision grid is not
rebuilt until after the placement pass; and trees growing through the
walkable props, which are deliberately not in the collision grid so a player
can walk up to a counter.

The prop scale went 0.62 → 0.85 after looking at Cadence's square: at 0.62 a
market stall stood shorter than the character walking past it — and then
0.85 → **2.55** on your review ("about 200% larger", which names the increase
rather than the result, so three times). The stall's collision radius went 17 →
44 with it, and the goods are anchored to that footprint rather than to a
fraction of the row offset: at the old anchor every sack of spice in the world
fell inside the enlarged stall and was silently refused.

## 6.3 — which way a wall faces

Your rule, given by example — *"north border faces northeast, northwest faces
north, west faces northwest"* — reads as **one step clockwise of the border**,
and all three examples agree. It is generated from the rule rather than
transcribed, so the fourth entry cannot drift from the three you gave.

It matters more than it sounds. **Cadence's square used two facings for four
sides** — southeast on both the north and south, southwest on both the east and
west — so two of the four walls were drawn from behind: merlons on one side of
the city and blank inner masonry on the other. The ring walls took the tangent,
which is right for spacing the courses and wrong for which way the battlements
point.

### The verification shots turned up a third one

Framing each circuit to its own extent — which is the only way five walls of
five different shapes come back comparable — showed **Karsk Landing's octagon
as a picket of isolated towers on four of its eight arcs** while the other four
read as continuous masonry. Round 49 saw this, and round 72 saw it again; this
is the third time, and it is not a spacing bug either time. Measured off the
art at the game's own scale, a broadside course is **276–310px wide and an
end-on one is 118px** — the courses touch, but eight slivers in a row look like
a fence. An octagon puts two of its arcs on east and two on west, which are
exactly the two end-on frames.

So `wallFacingFor` takes a second step where the first lands on east or west.
The battlements still point outward and still sit within one step of where your
rule put them; what changes is that no run is ever drawn edge on. Karsk is
continuous all the way round now — the fourth image.

## 6.4 — the end caps: **there are none**

Round 78 said the castle-wall pack "contains the wall AND the 8-direction end
cap, unpacked and waiting". It does not. The pack holds **two objects, both the
same wall segment, each with the same eight rotations** — rendered side by side
to check, because that is the only thing that settles what a model is. There is
nothing to cap a run with. **Send an end-cap piece and it is an afternoon.**

## 10.3 — the priests, out among people

Round 78 said this half was "the wandering-NPC system" and therefore a later
round's job. That was half right and it cost the item a round: **this game has
no wandering NPCs at all.** Every villager, guard and shopkeeper is placed once
and stands still. There was no system to wait for.

**29 priests: 13 on settlement ground and 16 travelling the roads**, in all
eight gods' colours, each with a line. A town priest stands where people
gather; a road priest is found between places, two tiles off the carriageway,
because standing in the middle of the road is what a cart hits. The god comes
from a hash of the *place*, so the pilgrim at Milrow is the same god's every
time — a priest who changed denomination on reload is a bug that only ever
shows up as a feeling.

## And the 53 doors: **the premise was wrong twice over**

The notes above guessed the blocker was the garden fence. It is not. Measured,
it is a **neighbouring building** in 47 of the 53 — and then, measuring
properly, the doors are not misfacing at all:

- **55** of the 371 buildings stand **on a plaza or street tile**, where the
  nearest carriageway is the tile they are already on. `atan2(0, 0)` is zero, so
  every one of those doors read as "should face east". They are the civic
  buildings on the square.
- **73** have no street within 22 tiles — rural houses and farms, with nothing
  to face.
- Of the remaining 243: **243 face the street, 0 face away.**

Two real fixes came out of the dig anyway. The doorstep now tries **five
distances** rather than one, so a neighbour clipping the outer part of a
frontage no longer pushes the door round the back; and the street search no
longer stops at the first Chebyshev ring that holds paving — square shells are
not circles, and ring 9's corners reach further than ring 12's axes, so it
could return a street *farther* away than one two rings out. **Median angle
error 27° → 8°.**

## Regression, and one check I have left red

**63 clean, 16 probes, 12 with failures** across 91 suites, plus 62 checks in
the three round-79 suites (`79a` 23, `79b` 21, `79c` 18) and the 21-check data
lane. `test_round49_outline` (its two assertions pinned the superseded
two-facing wall scheme) is green again at 51/51.

**`test_round66`'s display-list cap is red at 4,014 against 4,000, and I am
leaving it red on purpose.** Measured with this round's scenery disabled, the
baseline is **3,994 — six objects of headroom.** The cap was already exhausted
before any of this landed, and the growth since round 43 is the interior
room-pool residue (about 235 objects after a twelve-room tour), not anything
drawn per frame.

What I did do is make the new scenery cost nothing when it is not on screen:
the market props and the road priests are both **viewport-pooled**, the way the
rock scatter has been since round 43, so 116 props and 21 priests contribute
about 20 objects while visible and none while indoors. What I did **not** do is
raise the number, because raising a performance cap to fit new content, without
a framerate measurement worth trusting, is how a budget stops being one. This
sandbox has two cores and renders at 12fps headless; that number tells you
nothing about your machine.

**Your call:** raise the cap, or spend the next round on the interior pool.

The other eleven are the pre-existing failures listed above, unchanged.

## And one thing I noticed but did not act on

Your named trio — **Sword × Water × Dog, confluence Leviathan** — generates the
kit you described: Water Surge, Tsunami Surge, Healing Rain, Cold Current and
Leviathan Thrust; Hunting Cry and Dogs Together for the pack; Mighty Cleave,
Snapping Maul, Essence Edge and Titan's Hand for the blows.

But the **elements are the socketed stones', not the essences'**. "Tsunami
Surge" deals *physical* damage because the stone in that socket is a physical
one; "Aura of Steel Resolve" is *shadow*. The kit reads water and does not deal
it. That is item 8 one level up, and it is a real design decision rather than a
bug — the stone is what you chose for the socket — so I have left it alone and
am raising it: **should an ability's damage element come from the essence rather
than the stone, or from whichever of the two is more elemental?**
