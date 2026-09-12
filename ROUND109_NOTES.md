# Round 109 — the composer lands

---

## What was asked

Round 108 left the composer written, self-checking and wired to nothing. This
round landed it, on three decisions the user made up front:

- **Everything, invent passive atoms now** — replace all 94 categories, not
  just the 59 active ones.
- **Build the monster buff store now** — so `dispel` stops being a recorded gap.
- **Land it clean** — no kill switch, no dual path.

Mid-round, tracing what the category table actually does turned up something
that changed the third answer. The user's revision:

> "1 but ensure that if the generator can't recreate the authored abilities
> it's adjusted so that it can."

---

## The table had two jobs, and only one was worth replacing

`ABILITY_CATEGORIES` is a **menu** — `buildCandidatePool` walks it to decide
what an essence may be offered — and it is a **descriptor registry**: 2,745
authored `catKey` references across `essenceSignatures.js`,
`confluenceSignatures.js` and `essenceAbilities.js` resolve against it, twelve
cap/seat/scoring systems key off it, and the FX seed reads it.

Deleting the whole thing would have stripped the mechanics off every named
ability in the game and silently switched off the aura, buff, absorb and
movement caps — the failure mode being an ability that says nothing and a kit
that quietly takes four auras.

**So the menu died and the registry lived.** A composed ability brings its own
descriptor row (`composedCategoryFor`), registered where everything downstream
already looks. Nothing downstream learned a new shape.

---

## Asking the authored abilities what the composer was missing

The user's condition became a table and a check rather than a promise, and the
check is what found the gaps — none of them were reachable by reasoning.

2,745 authored references resolve to **43 categories in 36 shapes**. Four had
no atom at all:

| missing atom | authored references |
|---|---|
| `move` | **296** — and a `KIT_CATEGORY_FLOOR`, so a composer without it could not have built a legal kit |
| `control` | 63 |
| `taunt` | 3 |
| `stealth` | 2 |

Widening the question to *every template the game runs* found three more:
`imbueStrike` (which is weapon-aligned), `townPortal`, `cooldownReset` — three
of the seven being round 105's own gap-closing work, which deleting the table
would have quietly undone.

18 → 25 active atoms. All 56 templates covered, asserted in the data lane
against the **live** authored rows rather than a copy of them.

---

## The passive vocabulary

Actives compose because an active is a *sentence* — effects in an order, each
doing something to somebody. A passive is a *standing fact*, and two standing
facts stapled together are not one passive, they are two.

So passives got their own vocabulary: **16 atoms covering all 20 passive
templates**, derived by classifying how each template *reaches* the player
rather than by renaming rows. Every atom names the template it emits onto — the
passive runtime is untouched; only the 35-row table that used to choose from it
is gone.

`composePassive` picks one atom, one slot, one magnitude.

The passive check fired on its first run: **`stacks` was supplied by no lever**,
so nothing in the game could ever have held it.

---

## The 80.8%

The first version of the composer emitted onto an existing template and
**dropped** whatever that template could not natively carry. It was safe, and
it was a lie. Measured before believing it:

> **8,016 of 9,922 composed effects discarded — 80.8%.**

Four out of every five effects, on a system whose entire premise is that a gold
ability does three to five things. Every card would have promised what the
runtime had already thrown away.

The templates are single-purpose because each was written for one of the 94
rows. They stay — they are the projectiles, the barriers, the FX — and they own
the **lead** effect. The rest rides: `_applyComposedRiders` walks them in order
through the same runtime paths `ATOM_RUNTIME` names, at a fraction of the
ability's own scale.

**Drop rate 80.8% → 0.0%.** `travel` is deliberately inert *as a rider* and says
why in the code: opening a waygate as the second effect of an attack spell is
not a thing anybody wants.

---

## Monsters can be buffed

`dispel` was round 108's one unbuildable atom, and the reason was an absence:
monsters carried `debuffs: {}` and no buff container. It could not be
implemented against monsters, so monsters had to gain something first.

- `m.buffs`, declared on the literal rather than grown
- `_grantMonsterBuff` (stronger and longer, never overwrite), `_monsterBuff`
  (one read door), `_dispelFrom` (strongest first, returns what it took)
- Two legible sources: a hurt monster **enrages** once per life; a **warder**
  family wards a *neighbour* by preference, so the buff worth stripping is not
  on the thing that cast it
- frenzy raises damage dealt (900 → 1350 measured), bulwark lowers damage
  taken, hasten feeds `_monsterSpeedMult`, regen ticks
- `_monsterBuffTint`, because a dispel that strips a hidden number is
  indistinguishable from one that does nothing

**The gate that almost shipped.** The enrage first read `m.type.tier >= 1`. No
monster type has a `tier` field — the probe confirms 0 of 95 — so it was
`undefined >= 1`: a system that runs every frame, costs frames, and fires never.
Regated on `maxHp`, which exists and spreads 11–705 across the roster.

---

## What the baseline caught before it shipped

Every one of these read as a mechanical regression. Three were my own bugs.

| measured | cause |
|---|---|
| healing 694 → 254, aura 600 → 118, weapon affinity 379 → 8 | composed abilities mapped into the wrong `category`. **Not a label**: `KIT_CATEGORY_FLOORS` counts defensive/buff/movement and `STONE_ATTACK_TARGET` counts attack, so a kit could have met its buff floor with a heal while healing emptied |
| composed rows drawing no names | `sheetTypes` asked for `'Ranged Attack'` and `'Passive'`. Neither is a sheet bucket; the ten real ones include a lowercase `'passive'`. A nameless candidate is a rejected one |
| weapon builds 90.7% → 83.5% | against round 103's *"not a single ability that makes using a weapon better"*. Added a weapon seat **with a fallback** — a guarantee falls back or it is not a guarantee |
| every buff became `statBuff` | eight templates express a buff |

---

## And four the suites caught

1. **Composed triggers printed `+NaN%`.** `triggeredPassive` reads a fire event
   *and* an effect off the row, each with its own parameters. Resolved against
   the real `TRIGGER_KINDS` / `TRIGGER_EFFECT_KINDS`, so a new trigger kind is
   composable the day it is added rather than the day someone remembers.

2. **`"removes undefined condition"` / `"+1 undefined"`.** `attr_boost` and the
   three capability rows are special-cased on the **authored key**, so a
   composed row fell past them. Those mechanics are fixed by design — awakening
   says `attr_boost` *"takes no lever twist"* — so those atoms return the
   authored row. The composer still decides *whether* an essence gets one; it
   stops pretending to parameterise a mechanic with no parameters.
   74 bad stats lines in 1,200 → **0 in 4,000**.

3. **An Axe pool held "Double Swing" twice.** The signature path guarded the
   pool against `entry.name` — the name in the *bank* — then pushed a spec whose
   name the resolver may have changed. Pre-existing; exposed the moment composed
   seats drew on the same sheet names. *A check that runs against something
   other than what it says it is checking.*

4. **Kits with zero authored signatures.** `owesSignature` silenced the seat
   pulls so a seat could not crowd out a signature — enough while the rest of
   the pool came off a table. Composed candidates out-synergise one on their
   own. Silencing the competition is not the same as backing what you want to
   win: a 250 signature pull. min 0 → **min 3** per kit.

---

## The one that only happens in game

The live kit was **14/6** while every sampled kit was 12/8, and the reproduction
is the whole finding.

Sockets are filled **one at a time** in game, and round 89 **locks** each
ability as it is first generated — so an early run of free choices is permanent.
Same essences, same stones: one-shot 12/8, socketed one at a time 14/6. Only the
second is what a player actually does.

The forced-kind rules only bit once a kind could no longer fit in the sockets
left, by which time ten actives were frozen. They now hold the ratio the whole
way down: **a socket already ahead of its share takes the other kind.** Both
paths 12/8, 0 off-shape in 200.

---

## The stone gets its say back

`test_round27` caught what the composer had dropped: *martial stones favour
sunder* and *defensive stones favour armour buffs* both went flat.

Round 48 split the system ESSENCE → the lever / STONE → the element, and the
composer took that literally. The cost is that all four stones in a slot then
produce the same shapes in different colours, and a bludgeon stone that cannot
favour a sunder is not a bludgeon stone.

Where several templates express one composition equally honestly, a template the
**stone** leans toward wins. The essence still decides what the ability can do;
the stone decides which honest shape it takes.

Sunder needed a second pass: offering it on every impact fixed the martial
stones and broke the test the other way — a `mind` stone sundered as often as a
blade one, and the shape stopped meaning anything.

---

## Where it landed

Against `baselines/kits-r108-levers.json`, 600 kits, same seed:

| | before | after |
|---|---|---|
| distinct **templates** / kit | 17.48 | 15.77 |
| distinct **shapes** / kit | — | **17.62** |
| distinct shapes in the world | — | 1,509 |
| multi-effect abilities | 0% | **20.9%** |
| commonest template | projectileBall 10.3% | projectileBall 10.4% |
| weapon builds served | 90.7% | **92.2%** |
| kits below any floor | 0 | 0 |

**On variety, honestly.** The template count is down 9.8%, and that measure is
kept rather than replaced: it was right while every ability was one template
doing one thing, and it is still allowed to say the world got narrower. It
cannot see what the composer adds — a kit can hold three projectile bolts that
are a bolt, a bolt-that-drains, and a bolt-that-explodes-and-slows, which it
reads as one. Measured on the shape rather than the template, variety is level
with where it started and a fifth of all abilities now do two to five things.

Data lane 292 checks. Verified in the running game, not in node: 20 abilities at
12/8, all 12 actives cast without throwing, the rider pass fires, authored
signatures survive, every `catKey` resolves, no page errors.
