# Round 105 — close every identified gap

Commissioned as one instruction with four riders, after the round-104 coverage
audit reported 99 covered / 20 partial / 14 missing across the 133-line ability
taxonomy.

---

## What was asked

> "Please work to close all identified gaps."

with four riders:

1. Review the HWFWM lore for **resonating** and **disruptive** force.
2. The listed actions are **base versions**. They combine — a spell that
   impacts then explodes; a shield that absorbs and debuffs; a strike that
   impacts then inflicts a DOT. The formula is roughly
   `type (special attack | spell) × effect count × effects × modifiers × damage types`.
3. The listed debuffs "should all be added but these are also meant to be a
   **sample** that can be used to generate custom debuffs. Debuffs can be
   multiple types and have varied effects" — with Leech Bite's four conditions
   and Blade of Doom's Vulnerable-plus-three-Ruinations as the worked examples.
4. Ten clarifying questions were asked at the top of the session and all ten
   answered, so the round ran unattended on those choices. The two that shaped
   it most: **"the levers system needs to survive and be rebuilt with a lot of
   nuance"** and **"tags replace `kind` entirely"**.

Two follow-up messages revised the design mid-round: a six-point spec review,
and a correction to the rank model and the shield.

---

## Where it landed

**133 lines: 123 covered, 10 partial, 0 missing.** 242 evidence claims verified
against live data on the run that generated the report.

The audit is a tool, not a document, and as of this round so is its published
page — `node tools/audit_round104_coverage.mjs html` emits it. The round-104
artifact was hand-built from one run and was describing a different game three
commits later, which is the exact fault the tool exists to prevent, one layer up.

---

## 1. Damage types — 28 of them, and two lists answering two questions

`ELEMENT_TYPES` (6) is what you can **gear** against. `DAMAGE_TYPES` (28) is
what an ability can **be**. Conflating those was why `water` read as frost and
why `slashing`, `blunt` and `piercing` did not exist at all.

`st['resist_' + type]` defaults to 0 for a type nothing resists, so a new type
is a table row rather than a migration.

**Resonating and disruptive force**, per the user's rider and their lore:
×2 against the protection they are meant to beat and ×0.5 against the other.
Cutting both ways is what makes carrying one a choice — halving armour does
nothing to a target with no armour, so a one-way version would have been
strictly better against everything and merely unexciting against some of it.

`damageMitigationKind` keys off the type's own nature. The first cut wrote
`else if (st.armor)`, which quietly broke round 27's rule and let plate reduce
a fireball.

## 2. Tags replace `kind`

A condition is a name, a **tag set**, and the mechanic its tags imply — the
books' own convention:

    [Bleeding]                  (affliction, wounding, blood)
    [Ruination of the Spirit]   (damage-over-time, curse, stacking)

`kind` could say what the runtime should DO and nothing about what a condition
IS, so "is this poison" was unaskable — which is why the game had never had a
cleanse. Behavioural tags dispatch; cleansing tags carry no behaviour and exist
so something can be named as the thing that removes them.

`composeCondition` mints new ones from the same parts, so [Leech Toxin] and the
three Ruinations are generated rather than being three more hand-written rows
and then three more next round. Its id is a hash of its own content, so the
same recipe always produces the same id and a save's stored key still resolves
after a restart. Hashed over the **whole body** after the passthrough list grew
from nine fields to twenty-three: every field left out of the hash is a pair of
genuinely different conditions that collide on one id and silently become each
other.

## 3. Cleanse, and the twenty conditions that could not be removed

Four taxonomy lines, one template, two parameters — which tag, and how many.
The tag a cleanse names comes from the **stone's** element, which is the
round-48 split doing its job: the lever says "this removes something", the
stone says what.

## 4. The rank model, corrected twice

The draft priced effects against magnitude. The user corrected it, then
corrected the correction:

> "The power of an effect still increases as it ranks up regardless. Even
> adding multiple new effects doesn't change that the base damage and effect
> needs to increase in power, however an ability that doesn't have any added
> effects will probably scale higher."

So **magnitude is not something a rank-up can decline to buy**. What varies is
the slope. A Silver plague hits harder than a Bronze plague *and* carries more
conditions; it does not trade one for the other.

And a rank buys more than damage — cooldown (10s → 5s), cost (30 → 15 stamina),
and **condition**: the execute window, which is built and widens on a ladder
(iron 10%, bronze 18%, silver 24%, gold 30%). The gate sits after the cooldown
check and **before the cost**, because a finisher that spends your mana and
then tells you the target was too healthy is a finisher nobody uses twice.

## 5. What a shield is made of

The user's answer, and it is a **kind** crossed with a **source**:

| kind | what exhausts it |
|---|---|
| `timed` | the clock |
| `strikes` | whole blows, however large |
| `pool` | the absorbed total, with no clock at all |

The pool shield changed the code's shape: the tick decrements the timer for the
other two kinds only. A pool shield never hit is still up an hour later, which
is exactly what "has its own health" means. Source `mana` or `stamina` spends
the caster's pool as it absorbs, so defence competes with casting.

Which pair an ability rolls is read off the essence's levers.

## 6. Nine conditions and seven buff stats

Two of the nine were **blocked**, not merely unbuilt. [Shocked] is one
condition carrying both `affliction` and `rate`; [Soaked] needs a per-type
amplifier that can answer *negative* — raising frost and lightning while
lowering fire and earth off one stack — and needs earth to be a damage type.
Also [Suppressed] (a new `suppress` tag: the auras go out and nothing casts),
[Karma], [Marked], [Leaden], [Stalled], [Enervated], [Damped]. [Blighted] gains
`dotAmp` and amplifies every other affliction and pointedly not itself, which
makes it an opener — applying it after your DOTs is applying it too late.

Seven buff rows share one `statBuff` template and differ only in a string. The
game had six near-identical ways of doing "add a number to a stat for a while";
this is one bag, one tick loop, one reader, and the eighth is a string in
`awakening.js` and no code anywhere.

## 7. Contagion, and the bands

**Contagion** is rolled on the **tick**, not at impact — a chain jumps when it
lands, a contagion propagates afterwards. It rides on the **ability**, not the
condition: the same [Poisoned] is catching from a plague essence and ordinary
from a spider. The spread budget lives on the instance and is inherited by the
copies, so a contagion of 2 spreads twice in total rather than twice from every
carrier, and it never returns to something already carrying it.

**The range and area bands** are real now. Nothing had ever reached the distant
band because a bolt's reach is `speed × life` and `life` was the constant 1.1
in WorldScene for *every bolt ever generated* — unreachable by construction,
not untuned. `projectileLife` makes flight time a spec field, defaulting to 1.1
so every existing bolt flies exactly as far as it did.

Classifying against the area bands found a real fault: **the field carrying an
area is not `radius`.** On a projectile `radius` is the collision size — how
fat the bolt is — and the area is `explodeRadius`, twenty times larger. A
self-centred ring has no radius field at all and its `range` IS its radius. The
first cut called every exploding bolt in the game a *small* area on the
strength of how fat the projectile was.

---

## Three ways a finished feature reaches nobody

All three were found by **measurement**, all three in work already committed as
built this round, and each is now a data check that fails when its fault is put
back. This is the round's most useful output.

**A family that does not exist is a permanent refusal.** Eight categories were
filed under `mend`, which is a *lever* and not an effect family. `charterAllows`
ends `fams.some(f => allow.has(f))`, so an unknown family is denied by every
charter — strictly worse than filing nothing, which takes the "uncategorised:
no opinion, let it through" fallback. `cleanse_one` reached **0 of 400 random
kits**, and a deliberately-built healer trio with mending stones did not have it
either.

**A gate is not an offer.** `tryCat` is only ever *called* for categories on a
lever's bias list. Round 49 wrote that sentence down about the stealth grant;
round 55 wrote it again about the breath and the volley. This was the third
time, and it is checked now rather than remembered.

**`rareOnly` meant "never" for anything but stacking.** The flag refuses a
category on every ordinary socket, and the only seat that lifts the refusal
filtered on `template === 'stacking'` — exact in round 75, silently wrong the
moment a second family wore the flag. And `candidates.find(c => c._rareSeat)`
took the first mark, which was always the stacking one, so even a general seat
would not have been reached.

Measured across 400 random kits with mulberry32, before and after:

| | before | after |
|---|---|---|
| `cleanse_one` | 0.0% | 4.3% |
| `cleanse_mass` | 0.0% | 2.5% |
| `cooldown_reset` | 0.0% | 4.5% |
| any of the 23 round-105 categories | — | **67.3% of kits** |

---

## The 12/8 split got tighter

A rare socket is exempt from the forced kind, deliberately. The exemption
stays — a rare socket that cannot take the rare thing is not a rare socket —
but it is a *preference* now rather than a blindness: when several rare
candidates are on offer and one is the kind the split wants, that is the one
taken.

Measured over 1,200 random kits on one seed: **18 off-shape before, 4 after.**

`test_round17` asserted 12/8 on a single live kit, and that kit crossed the
line while the property got four and a half times tighter. Re-specified to
"within one of 12/8" with the measurement written into the file, exactly as
round 43 re-specified the world-build budget — the sampled 300-kit check in the
same suite holds the exact split, and asserting it on one draw tests the draw.

---

## Two things found by checks written for other reasons

**The four cursed conditions were drawing a flame.** They shipped earlier this
round with `icon: 'curse'`; the sheet's frame is `cursed`. An unknown icon key
draws frame 0, which is burning. Found by a new check that every debuff icon
has a frame — written for the nine new conditions, and it caught four old ones.

**`monsterDebuffFaults` has existed since round 90 and nothing has ever called
it.** Its own comment describes the fault it was written to catch. Thirteen
conditions were carried by no monster at all, which breaks round 57's founding
rule that a debuff means the same thing whichever side of the fight holds it.
Now wired into the data lane — and its `carried` set was passing `null` for the
element, so it reported `burn` and `disease` as orphans. A checker wrong in the
direction of false alarms is only slightly better than one wrong the other way:
both teach you to stop reading it.

Also: `weightOf` and `isControl` in `assignAbilityDebuff` still read the `kind`
this round deprecated, so every condition added since scored the default —
[Suppressed] takes a target's whole kit away and was being weighted and rolled
like a slow.

---

## Test state

- **273 data checks pass** (was 258 at the start of the round).
- `probe_round105_conditions.cjs` — 8 sections, pass.
- `probe_round105_buffs.cjs` — 8 sections, pass. Its first version reported
  `pass` with four whole sections skipped, because it looked for a live monster
  at the spawn point and found none. It now fabricates its targets and counts
  the sections that ran, and a skipped section fails the probe.
- `probe_round105_reach.mjs` — all 23 watched categories reach kits.
- `test_round57` 61/61, `test_round51_charters` 24/24, `test_round17` 34/34,
  `test_round27` 58/58, `test_round75` clean.

## Still open

- The composer itself — `ACTIVE = type × count × effects × modifiers × types`
  and `PASSIVE = shape × (effects | resistances | triggers) × types` — is
  designed as `LEVER_PLAN` data and not yet built. That is the next round.
- 21 levers exist as a reviewed plan; the essences still carry the round-48
  nineteen. `renew` sits on three essences of 148, which is why several new
  gates name a second lever.
- 10 partials remain, listed on the coverage page. The two largest are
  weapon-delivered explode, and `split`/`pierce` as attachable modifiers rather
  than as things two specific templates happen to do.
- Carried from round 103: `kind: 'ruin'` unbuilt; companion documents unwired;
  **open question — is Gold gated on the four companion arcs?**; Zeke's Silver
  model awaits art; the Cinderwaste has no music track; 88 confluence concepts
  still at four parts.
- Pre-existing: `test_round72`'s "every new landmark is enterable" — Harrowmoor
  24/27 doored, Karsk 18/21.
