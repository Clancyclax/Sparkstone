# Round 104 — three tracks, unarmed combat, and the ability-coverage audit

Commissioned in one message, plus a taxonomy in the next and two delivery
faults reported while the round was running.

---

## What was asked

1. Three new music tracks.
2. Unarmed combat — "much like the weapons the hand and feet stones and
   essences should provide significant boosts to striking with the paired
   weapon (in this case no weapon)", plus:
   - 2.1 a significant passive for the stats lost by not wielding one
   - 2.2 an unarmed build weighted heavily against weapon summons
   - 2.3 weapon and armour summons among the *last* abilities a kit gains
3. A ~130-line ability taxonomy to check coverage against.

Four questions were asked at the top of the session and all four answered
"recommended", so the round ran unattended on those choices.

---

## 1. Music

`music_sewer`, `music_sirukh`, `music_ixcuatl`. The sewer's rule sits **above**
the cave rule — `inCave` is true down there, and first-match-wins means the
more specific claim has to be tested first.

**Named keys, not `music_region5` / `music_region7`.** Sirukh is the fifth
region and `REGIONS` index 4; Ixcuatl is the seventh and index 6. Round 103
lost most of a day to `regionIndex` meaning both a position and a tier, and
there was no reason to mint two more numbers that mean two things.

**The Cinderwaste has no theme.** Three tracks arrived and it was not one of
them. That is now a *named* hole (`REGIONS_WITHOUT_THEME`) rather than a check
quietly softened, and two assertions stop the exemption list itself rotting:
every id in it must be a real region, and none of them may have acquired a
theme.

### The four-region list in a seven-region world

`audio.js` held its own hand-written `REGIONS = ['nek','ontaria','elehyd','bratugal']`,
written in round 68 and never updated for round 103's three. Everything that
walked it — *every region has a theme*, the wilderness-leak test, the
unknown-region test — had been certifying four of seven and reporting nothing,
because a check that walks a short list finds no faults in what the list omits.

Derived from `REGIONS` now. The probe list is derived too. And the leak test
stopped asking the *key* what it is (`/^music_region\d$/` — a naming convention
doing the work of a fact) and compares the two answers instead: if standing
inside the walls and outside them return the same track, the wilderness theme
followed the player in. That holds for any naming scheme, including ones nobody
has invented yet.

---

## 2. Unarmed

**A row in `WEAPONS`, not a parallel system.** 26 reach (shortest), 0.22
cooldown (fastest), 4 base — 18.2 dps, just under the dagger and the bottom of
the melee band, on purpose. A player with empty hands and no unarmed identity
should be *worse* off than one holding a sword, or the weapon shelf stops
meaning anything.

`_doPlayerAttack` began with a bare `if (!wid) return;` — empty hands could not
attack at all. Not weakly: the function returned before the swing existed, so
the button did nothing and said nothing about why. An empty hand is now a fist,
and everything downstream — stamina, sound, grunt, cooldown with its affinity
and hinder, reach, the damage stack, the hit test, the crit roll, every rider —
is the code that was already there.

`_handFree` and not `!p.hands[hand]`: a hand holding a shield is occupied, and
a two-handed weapon in the other hand leaves this slot null while very much
occupying the arm. Punching with the "free" hand while wielding a staff in both
is the bug that reading the raw slot would have shipped.

**Hand and Foot join `WEAPON_BY_IDENTITY`** — the first weapon identities whose
catalogue *family* is not a weapon family (`craft` and `motion`). Deliberately:
identity and family answer different questions, and moving Foot into a new
family to tidy a comment would strip it of the travel identity that is most of
what it is, on every character who already has one bonded.

### 2.1 — the empty-hand passive

+40% (the user's own figure) to damage **and** abilities while both hands are
free, folded into `dmgMult` — which the weapon swing and every ability template
already read — rather than added at twenty call sites. That is how a bonus ends
up applying to four of them.

The condition is asked inside `_recomputeDerivedStats`, so **equipping now
recomputes**. It did not before; without that call a +40% would run while
holding a sword until something unrelated happened to recompute.

**Getting it to actually reach a Hand/Foot build took four fixes, each one a
lesson already written down in this file's own comments:**

| what stopped it | the fix |
|---|---|
| the charter refused it (a `buff` on an essence whose charter denies buffs) | its own door, beside the weapon door |
| the bias list never offered it, and `tryCat` is only called for listed categories | fronted when the socket carries the unarmed identity — a door with no knock |
| `BUFF_CAP` is 2 for the whole kit and both seats were full | its own category, `unarmed`, exactly as `weapon_affinity` has one |
| it sat eleventh of thirteen candidates and the scorer picked on synergy | a pull of 200, the kit-completing rate |

Measured across 400 kits: **4 of 69** Hand/Foot kits had it; **37** now (42
before the charter families landed and started refusing some, which is correct
behaviour rather than a regression).

### 2.2 / 2.3 — the summon rules

A kit with any unarmed identity **refuses** weapon summons (a refusal, not a
weighting — a weighting loses sometimes, and "sometimes you get the thing you
asked me to prevent" is not a rule). Armour and gear summons are untouched: a
bare-knuckle fighter in conjured plate is a build, and only the weapon
contradicts the hands.

Gear summons cannot land in a slot's first two sockets.

**Both had to be added on the signature path as well.** Authored signatures are
pushed straight into the pool and bypass `tryCat` — the same hole round 76
found for the barrier cap, in the same function. Measured with the doors in
`tryCat` alone: 46 early gear summons across 400 kits, **every one a
signature**. 46 → 7.

Waived while a kit still owes its round-16 socket-granted signature. Buying one
guarantee by breaking another is not a fix.

---

## 3. The coverage audit

`tools/audit_round104_coverage.mjs` answers the ~130-line taxonomy line by
line. **A tool and not a document**, because a hand-written coverage table is
true on the day it is written and lies quietly afterwards — which is the fault
found in `audio.js` earlier this same round.

Every "we have this" claim names the category key, template, debuff id, element
or trigger it rests on, and the tool checks the named thing still exists. 158
claims, all verified, none merely asserted. A claim whose evidence is renamed
fails the audit instead of ageing into a false statement.

    node tools/audit_round104_coverage.mjs          # the table
    node tools/audit_round104_coverage.mjs gaps     # only partial and missing
    node tools/audit_round104_coverage.mjs md       # markdown

**Opening: 57 covered, 25 partial, 51 missing. Closing: 64 / 28 / 41.**

### What was built from it

**Nothing in the game restored mana or stamina** — the only whole row of the
list with nothing in it. Four categories on one template (`resourceRestore`,
carrying `resource` and `overTime`), so instant and over-time differ by a field
rather than a second code path. Category `restore` and not `healing`: a healer
floor satisfied by a mana battery is a floor that has stopped meaning what it
says.

**A restore does not cost its own resource.** The first generated one read
"restores 11 mana · 8 mana". The pool ceiling means an ability paying in what it
hands back can never be worth more than the difference, whatever the numbers
are. Mana draughts cost stamina and second winds cost mana — which makes both a
real trade between the two bars, and is what the `innervate`/`recover` lines
are actually asking for.

**Two triggers: `strike` and `spendMana`.** On-strike was the highest-leverage
hole in the list — five special-attack rows reduce to "something happens when
you hit". It fires **once per swing that connects, not once per target**, the
same rule the imbue charge and the chain already follow; verified in the
running game with two monsters in one cone. `spendMana` fires where the mana
leaves the pool, so a cast that cannot afford itself pays out nothing, and the
blood-surrogate path does not fire it because that cast paid in health.

The other four triggers on the list are deliberately **not** in `TRIGGER_KINDS`.
An entry nothing fires is worse than an absence: the suite would then certify a
trigger no ability can reach.

---

## Faults found on the way

**`probe_kits.mjs`'s random kits were not random.** Its LCG returned the
remainder of the low bits — an LCG's worst — reaching 47 of 148 essences in
4,000 draws. Round 103's "300 random kits" therefore sampled about a third of
the roster, repeatedly, and every distribution it reported was over that third.
mulberry32 now: 148 of 148.

**Seven new categories had no charter family.** Caught by
`test_round51_charters`, exactly as that suite's round-75 note predicted:
`charterAllows` has an "uncategorised: no opinion, let it through" fallback, so
a category with no family is silently exempt from the charter system entirely.

---

## The delivery path (reported mid-round)

### `.nojekyll`, and then `deploy.sh`

The Desktop rebuild stopped with *"the build is missing '.nojekyll'. Delete
Desktop\Sparkstone-web and run this again"* — and deleting it did not help,
which is the tell. `.nojekyll` is a **zero-byte marker** for GitHub Pages that
`pack_playable_bundle.py` wrote only under `if HOSTED`, so a Desktop bundle
never contained one and no amount of re-extracting could conjure it.

The user's real build held `index.html`, `src/` and `public/` **and nothing
else** — `deploy.sh` was missing for the same reason — so fixing only the
marker would have moved the full stop down one line.

Verify is now split by what a failure *means*:

- **game files** (`index.html`, phaser, `main.js`, `WorldScene.js`) — real
  contents that can only come out of a zip. Still a full stop.
- **`.nojekyll`** — created, reported, carry on.
- **`deploy.sh`** — a warning naming the one thing that becomes unavailable.
  The build stands, because the game runs without it.

The last line had to agree with step 4: the first cut warned about a missing
`deploy.sh` and then `exec bash ./deploy.sh` anyway, announcing a good build and
exiting 127. `test_rebuild.sh` case 8 caught that.

`pack_playable_bundle.py` ships both in every bundle now. They cost 2KB and a
zero-byte file against 165MB, they are inert where they are not needed, and the
folder a player rebuilds is then also one they can publish.

**The test fixture was more correct than reality.** `mk_base` had always written
a `.nojekyll`, so six cases certified the script against a Desktop tidier than
the user's. Cases 7 and 8 pack a base without each file, plus the mirror (a
missing *game* file is still a full stop, so splitting the list did not quietly
turn the real guard off). Case 7 fails 3 of 3 against the old script and
reproduces the stop exactly. **25 of 25, from 18.**

### The stamp that was never bumped

Then: *"the version stamp reads '102' but round 103 was expected."*

The guard was right and the build was wrong. **Round 103 shipped eleven part
zips and a patch and never changed `GAME_VERSION`** — so the r103 bundle
genuinely contained a game that called itself 102, and the last line of defence
on the user's own machine was the only thing that ever noticed.

`version.js` has asked for the bump in a comment since round 42. A comment is
not an assertion. `tools/data_checks.mjs` now checks the stamp against the
highest `ROUND<N>_NOTES.md` in the repository — that file *is* how this project
records that a round happened — so a round that writes its notes and forgets its
stamp fails the three-second lane instead of reaching a Desktop.

---

## The world-build budget, re-specified a fourth time

`test_round43`'s "the world builds in about five seconds" was failing at
7.1–7.5s against a 6500ms bar. **The seven new ability categories are not the
cause, and that was measured rather than assumed** — the suspicion was
reasonable, since the generator walks every category per socket. Splicing all
seven out and rebuilding gave **7353ms against 7104ms with them**: no
difference beyond this machine's noise. Kit generation across guards, party and
region exits is 337–395ms of the total, under 5%.

The world grew into the bar, a fourth time, exactly as that suite's own note
describes happening in rounds 43, 72 and 88. Round 90 set 6500 against a
**four**-region world; round 103 made it seven.

    measured cold, two-core container
      total   7345 / 7491 ms      (round 90: 3733 / 4193 / 4432)
      ground  2590 / 2650         forest 1655 / 1715   city walls 1029 / 1087

Ground is 2.5× round 90's and forest 1.6×; city walls did not appear in round
90's list at all. Three more regions of each. The bar keeps round 90's ratio to
the measured mean (6500/4119 = 1.58) at **11500**, so it still catches a
doubling or a quadratic coming back and still will not fail on this machine's
700ms spread.

---

## Regression

113 of 113 suites. Clean except one pre-existing failure:

- `test_round72` — *every new landmark is enterable*, Harrowmoor 24/27 doored,
  Karsk 18/21. Carried from round 103's close, untouched this round.

Four suites flagged during the sliced run and passed in isolation
(`test_round60`, `test_round64`, `test_round74`, `test_round77a`) — the
container runs two cores and a sliced estate is a loaded box. `test_round43`
and `test_round51_charters` were real and are fixed above.

---

## Tools added

- `tools/audit_round104_coverage.mjs` — the coverage table, self-verifying.
- `tools/probe_round104_unarmed.cjs` — punch lands, `dmgMult` 1.4 empty-handed
  and 1.0 with a sword equipped through the real path.
- `tools/probe_round104_coverage.cjs` — four runtime claims the data lane
  cannot see: the restore clamps at the ceiling, the over-time ticks and
  expires, the strike trigger fires once per swing with two targets in the
  cone, and `spendMana` fires on a paid cast and not on an unaffordable one.

---

## Open

Carried from round 103, untouched:

- `kind: 'ruin'` is still a kind nothing knows — Ixcuatl's stepped city is
  declared and unbuilt; it wants to be the act's dungeon.
- The companion documents are drafts, nothing wired: rank-up cutscene, 16
  rank-up moments, 4 Gold arcs.
- **Open design question: Gold gated on the four companion arcs — yes or no?**
- Zeke's Silver model awaits art.
- The Cinderwaste has no music track.
- 88 confluence concepts still carry four parts (the vocabulary loop was
  stopped mid-batch at the user's request; 13 were widened first).

New, from the audit — the largest commissionable blocks, in order of size:

- **Damage types.** Six elements exist against the taxonomy's 24. `rock`,
  `earth`, `sand`, `wind`, `arcane`, `blood`, the three physical types
  (slashing/blunt/piercing) and the two anti-armour types do not exist at all,
  and `water` currently reads as frost. This is a whole round: resistances, the
  SFX element floor, the FX library and the resist tables all key off
  `ELEMENT_TYPES`. Several special debuffs (`wet`, `shocked`) are blocked
  behind it.
- **Cleanse and dispel.** Four missing lines and nothing in the game removes a
  debuff that has already landed. Self-contained.
- **The remaining triggers** — moving a distance, spending stamina, gaining or
  filling a resource, a buff expiring — plus the four `cursed X` special
  debuffs, which are all "take damage when you do X" and become cheap once
  those events exist.
- **Modifiers as modifiers.** `split`, `pierce` and `contagion` exist only as
  weapon-affinity riders or not at all; the taxonomy wants them attachable to
  an arbitrary ability.
- **The AOE size bands.** The shapes exist; small/medium/large/huge do not
  exist as a concept anywhere.
