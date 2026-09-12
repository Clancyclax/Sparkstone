# Round 133 — nine items

Nine asks in one round, taken in full at your word ("all nine, however long it
takes"). Two decisions you made up front shaped the work: recruitment is
dialogue beats rather than a quest apiece, and the third potion slot is dropped
rather than rebound.

---

## 1. Companion kits are fully visible

`_buildPartyKit` pushed `{ability, cd}` and threw away `essDef` and `stoneId` —
both in scope on that exact line. The player's side never had the problem: their
abilities are keyed `<slot>:s<idx>:<stoneId>`, so their sheet reads the pairing
back out of the key. A companion's kit is a flat array with no key to read, so
the provenance now travels **on** the ability, and the team card prints it.

It mattered most for the one companion the feature is about. Round 124 built
Prism to arrive empty and be filled from your bag, and you could not see which
of your stones bought which ability — most of the point of handing them over.

Measured on a full roster: **20/20 abilities name their essence** for every
companion, and all 16 socket abilities name their stone (the other four are the
essence innates, which no stone made and which now say so).

## 2. The Society is two rooms and four brokers

The building splits. The **hall** keeps Zeke, Prism, the clerk, the aura trainer
and the reliquary, and plays *Adventure Society*. A door on the east wall leads
through to the **market**, which plays *Item Shop* and holds four counters:

| broker | stocks |
|---|---|
| Ilsa Ternmoor | essences + awakening stones, mixed rarity, rolled daily |
| Hadwin Coss | the same, rolled **separately** — two shelves to compare |
| Mev Sallowbrand | armour only, via `rollGearItem`'s `forcedSlot` |
| Dace Rill | weapons, a seven-strong daily cut of the rack |

Petra Wynn's counter is retired — she was the one vendor the ask replaced. She
keeps registration, appeals and death benefits, and now tells you where the
trade went.

**A door between two interiors is new.** `this.doorways` has exactly two kinds
and `_updateDoorProximity` only ever offers an `enter` door to a player standing
*outdoors*; `_useDoorway` also hardcodes `_insideRoom = null` on exit and stamps
`_lastOutdoorPos` from wherever you are standing. That last one would have been
a silent disaster: round 132's meditation gate reads that field to decide
whether a building is in a town, so walking hall → market would have made the
market a place you cannot meditate, and nobody would have connected the two. So
the door uses the `secret` prop's shape instead — a tile, a proximity, a prompt,
an E — which round 76 already argues is the right vocabulary for it.

Round 102 wanted this same thing and gave up: the western base's back room "is
reached from inside the western base and has no exterior at all", and shipped
with a second exterior building anyway.

The nine civic Society Halls clone the split, each with **its own** market —
nine halls opening into one room would be nine doors to the same four people.
Cadence's brokers are named; the branch offices post the role.

Both tracks key on a **prefix**, so the per-city clones get them too. That is
deliberately more than `music_auction` manages — it keys on `roomId ===
'auction'` and has therefore missed all nine Auction Houses since round 103.

## 3. The "more behind it" line is deleted

Not reworded — deleted. Round 79 rewrote a sentence that should have been
removed: your original complaint was that it is "a throwaway sentence and is
meaningless to the ability", and rewording a meaningless sentence leaves a
meaningless sentence, on `raw`, the most widely applicable lever in the game.

What made it indefensible was measurable: `mat.noun` is the material's own word,
and **eleven of twenty-nine families carry a count noun** — forge, edge, point,
claw, fang, talon, bulwark, shot, rift, self, reagent. *"There is more forge
behind it than the shape needs"* is not a sentence. The lever is untouched; the
+18–28% still applies and still costs a cooldown ability its 1.1×.

## 4. Nine red suites, all green

Every one was run against the **round-132 tree** first. Four turned out to be
the test measuring something next to the thing it claimed to measure:

| suite | what was actually wrong |
|---|---|
| `test_round58` | The speed run measured in the middle of Cadence. `_tryMove` refuses steps into two hundred buildings, so the *faster* run lost more distance — 1.43× against 1.60×, entirely architecture. Now it finds open ground and **proves** it is open by comparing against the longest run any candidate manages. |
| `test_round74` | Read `WEAPON_BY_IDENTITY` only, and went red when round 120 removed `Spike: 'javelin'` at your word. The game was right the whole time: `_weaponAffinity` falls back to `weaponBaseType`, and a javelin carries `subtypeOf: 'spear'` — round 74's own ruling, quoted in that function. |
| `test_round81` | Demanded weapon art for every weapon-*family* stone, including the Spike you had ruled must use a plain gem. Art follows **identity**, not family. |
| `test_round76c` | Counted devices granted by any of three routes and measured them against the essence route's share. Now attributed by route, which is the question it was always asking. |

Three were roster growth nobody updated — `test_round23` (the soul space is
furnished at runtime), `test_round43` (Bratugal moved off `jungle_soil` in round
131, and the line named packs for three regions when there are seven),
`test_round46` (eleven characters became thirteen, and Prism genuinely has no
attack animation — now named so it stays named). `test_round62` needed the
cooldown sentence broken into a bank; at 5.08% it was the last of the big
repeaters. `test_round68` and `test_round122_signature` went green on their own
once item 3 landed.

**And the flaky one.** `test_round49_stealth` was failing about half of all runs
on **four** separate coins, found one at a time:

1. the lurk roll — 400 unseeded trials at p=0.18 against a band 1.6σ away;
   now seeded, with the band derived from the binomial spread;
2. `m.type.ambush` — not the roster's field since round 49 replaced the boolean
   with `ambushChance`; it matched whatever still carried the old flag;
3. whether *any* woken monster had rolled a lurk — three wolves at 0.18 lurk
   none of the time in better than half of runs, and every check inside the
   block then read `undefined`: seventeen failures from one coin;
4. the aura probe **dying** mid-measurement to the player's own `retaliate: 9`.

That last one took two wrong guesses about tick timing before I instrumented
the failing run and read `alive: false, hp: 0, stacks: 0`. Seven consecutive
clean runs since.

## 5. Quests mark on the map

"Nobody bothers the quarryman" is a procedurally composed `defend` contract, and
a defend contract carries `nodeIdx` — an index into `harvestNodes` — and nothing
else positional. The map read `q.spawnX`, which only `hunt` and `plague` ever
set, so it plotted `NaN`. `ctx.arc(NaN, …)` throws nothing and draws nothing,
which is why this was silent rather than loud.

Counted: of twelve contract kinds, **two** set spawn coordinates and **six more
knew exactly where they were and were never asked**. There is one resolver now,
`_questMapTargets`, and the bounty loop that used to sit in the drawing function
is gone — it was also the only marker block in `_drawFlatMap` with no `onLayer`
guard, so a contract taken in Ontaria could plot onto The Nek.

## 6. Places have names

Round 116 gave the map settlement names and stopped. Now **124 named places**:
every settlement, every authored site, every region exit (the gate, the packet,
the portal — the one name a lost player is looking for, and never drawn at all
before), and every astral portal you have found.

Labels are placed heaviest-first and anything that would overlap a name already
placed is dropped — so a city keeps its name at every zoom and the hamlet beside
it loses one until you zoom in. That beats a zoom threshold because it needs no
magic number and adapts to whatever the canvas actually is.

## 7. The sewer is twice as wide, and Prism just follows

Re-laid by generator rather than by hand, because the channel is only an honest
signpost if it runs along the spanning tree's unique start→exit path — a
property of the whole layout, not of any row.

| | before | after |
|---|---|---|
| corridors | 3 tiles | **6 tiles** |
| chambers | 7×7 cell | 11×11 |
| grid | 7×5 = 35 rooms | 5×4 = 20 |
| map | 50×36 | 56×45 |

Round 82's script predates four things added by hand since — the sword, its
halved guard, the astral rift and the traps — so re-running it unchanged would
have opened the prologue with no sword in it. All four are placed by the rules
the hand placement followed. Three separate constraints pull against each other
on the hazards (two within a chamber of the start, none within six tiles of the
spawn, none in a doorway mouth, no two within six of each other), which is why
that pass is a bounded scan rather than a list of offsets.

**Prism's fleeing is gone entirely** — the threat scan, nineteen flee bearings,
a separate flee speed, and their three constants. Round 124's own comments admit
what all of it was fighting: "the prologue is a MAZE, and straight away from the
thing in front of you is a wall about half the time." A follower only has to
solve one problem, and you are already solving the maze. She still *notices*
things out loud; being frightened of a slime is her character and none of her
pathfinding. Measured: 372 units → 28, and zero ground given to a monster
standing on her.

## 8. Recruiting is a conversation

Three lines of code joined a companion, and one did it without you pressing
anything — walking within `PARTY_RECRUIT_RANGE`. The talk-to branch called
`_recruitPartyMember` *before* opening the dialogue, so the greeting a companion
gave you was said by somebody already on your team.

Now: the exclamation mark (which no companion ever wore, because there was
nothing to signpost), then four pages of their story, then the ask. The middle
pages carry **one** button — a "go on" beside a "join the team" invites you to
skip to the end, and then the story was decoration. Declining leaves them where
they were and asking again starts from the beginning.

Zeke is deliberately without a story: he already has the longest recruitment in
the game, and three pages of backstory in front of "I can't clear it alone"
would be telling you twice.

## 9. The D-pad

Aura moves to **down**, interact returns to **up**, potions drop to two slots on
left and right. This undoes half of round 121, which put the aura on up and
pushed interact onto SELECT — the honest choice at the time, and also the button
nobody looks for. Round 121's SELECT binding stays as a second fallback rather
than being deleted.

---

## Checks

- **Data lane: 519** (was 482)
- **`test_round133_world`: 41 checks**, played in the running game
- **Full regression: 137/137 suites recorded, zero red** — 120 asserting suites
  green, 17 informational probes, nothing dead.
- The ten previously-red suites, each confirmed against the r132 tree before
  being touched, now: r23 44/44 · r43 60/0 · r46 32/0 · r49_stealth 45/0 (seven
  runs) · r58 29/29 · r62 25/25 · r68 50/50 · r74 75/75 · r76c 20/0 · r81 22/22 ·
  r122_signature 20/0

`test_round44` carried two of this round's supersededs and one measurement that
had quietly stopped being about its subject:

- *"walking up to one recruits them"* is **inverted**, not deleted — standing
  next to an ungated companion must now leave them unrecruited and wearing the
  mark, which is a stronger claim than the one it replaces. The join it still
  needs goes the way a player's does: `_talkToRecruit`, the pages one "Go on."
  at a time, then the ask. The page loop reads the rendered button rather than
  counting, so it follows whatever story the data carries.
- *"the gate guard engages and closes"* measured the **gap** between guard and
  monster. Round 132 gave monsters gaits and two in five kite, so a guard that
  marched the whole way can post a gap that barely moved — it failed once at
  `closed: 25, hurt: true`, having walked the distance and drawn blood. It now
  measures how far the guard itself travelled off its post, which is a fact
  about the guard alone. The gap is still reported, just not asserted.

Two of this round's own checks were caught being decoration and fixed before
they shipped: the D-pad check read two methods that do not exist and got `''`
from both — reporting the bindings missing when they were fine — and the sewer's
corridor-width check measures the map rather than trusting the generator's
banner.
