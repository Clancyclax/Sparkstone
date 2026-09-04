# Sparkstone — the story and the quests, as they stand

**Rewritten in round 81** from a full audit of the source. The previous version
of this file was written at round 70 with a round-76 patch on top, and several
of its headline claims had gone stale — it still said the main story could not
be completed, which stopped being true in round 76.

Everything below is a count taken from the source or a measurement from the
running game. Where something is a judgement, it says so.

---

## The short answer

| System | Authored content | Generated | State |
|---|---|---|---|
| **Act 0** — the opening | 8 pages, 462 words | — | **Finished** |
| **Main chain** — Acts 1 and 2 | 11 stages, 44 prose fields, 26 in-lab lines, 12 rumours | field objectives | **Walkable end to end.** Acts 3 and 4 do not exist |
| **God quests** | 64 chapter title + premise pairs, 8 divine stones, 8 followers, 8 armour sets | 224 steps | **Complete and completable** |
| **Companions** | 68 lines — 28 arc, 24 banter, 16 idle | — | **Finished**, gated to gold rank |
| **Board quests** | 9 request openers, ~136 vocabulary entries | every posting | **Working** |
| **Cults** | 10 cults, full 16-socket builds, 20 loaded spritesheets | — | **Orphaned — imported by nothing** |
| **Guild chain** | — | — | **Does not exist** |

**Named characters: 42.** Thirteen in Cadence, twenty-five across six outer
settlements, four Division staff. Plus 4 companions, 8 gods, 8 god-quest
followers.

---

## 1. Act 0 — the opening

`src/data/division.js` · `WorldScene.js:_maybePlayAct0`

Eight authored pages, 462 words, two speakers: *Somewhere behind your eyes*
and *Knowledge*. It fires once on a genuinely new run, is skippable at every
page, and ends by setting the Division flag to 0 — which is what opens Act 1,
so the hook it closes on is immediately takeable:

> *"Get stronger. Something is being built in this city that should not be, and
> when it is finished I would rather you were the one standing in front of it."*

This is the most finished piece of story content in the game.

---

## 2. The main story — the Division chain

`src/data/division.js:DIVISION_STAGES`

**Eleven stages, all authored, and the fault checker is clean.** Seven in The
Nek (Act 1), four in Ontaria (Act 2).

Act 1 runs: rumours in the street → the Division's front office → **search** the
lab for the ledger → a field survey → cull the wraiths → the chief engineer →
**boss: Director Hallam Vesk**. Act 2 runs: the trail in Harrowmoor → Rob
Collins' house → **search** the cell above the city → close the aperture.

**Four named story NPCs:** Director Hallam Vesk (the Act 1 boss), Wren Ashcombe
(the assistant who defects), Rory Matheson (chief engineer, and the design's
intended Act 4 boss), Rob Collins.

What makes it read as a story rather than as errands is the **26 lab lines** —
each of Vesk, Ashcombe and Collins has a different thing to say at each stage,
so walking back into the lab mid-chain gets you the room's current state as
dialogue.

**Both acts are walkable end to end.** The three blockers the old status doc
led with are all fixed.

**Acts 3 and 4 do not exist.** Act 3's portal square at Karsk Landing is built
and its gate is authored (`hidden: { silverAbilities: 3 }`), but *the portal
specialist* is a string with no character behind it. Act 4 — Bratugal, the
noble houses, the deposition, Rory's return — has nothing at all.

**No HWFWM canon characters appear.** Jason, Farrah, Sophie and Humphrey occur
only in design-rationale comments citing the books' scaling and loot rules. The
named cast is entirely original.

---

## 3. The god quests

`src/data/godQuests.js`

- **8 gods** — war, knowledge, purity, healing, death, heroes, liberty, dominion
- **2 tracks each** — public, and a disciple track gated on bonding that god's
  divine essence
- **4 chapters per track**, one per region, rank-gated normal → bronze → silver → gold
- **2 / 3 / 4 / 5 steps per chapter** = 28 steps per god, **224 in total**
- Fault checker returns clean

**The split between authored and generated is clean and deliberate.** The
**64 chapter titles and premise lines** are hand-written in each god's own
voice, as are 8 divine awakening stones, 8 named followers, 8 armour sets and
8 weapon adjectives. The 224 individual steps are composed from the six
generated quest kinds — *a step is one of those six with the god's own words on
the front of it*.

**Fixed this round:** choosing "Not yet" when a god offered you a follower used
to null the pending offer with nothing to re-offer it, so one click destroyed a
chapter-3 reward permanently. The deferral is now written to the player, the
temple priest re-offers it, and it survives a save.

**Still open:** `player.godStanding` is written, saved, and read by nothing.

---

## 4. Companions

`src/data/companionStory.js`

Four companions — Zeke Clark, Encykla and Ædia Britanika, Benjamin Iskarys.
**Seven arc steps each (28 lines), 12 banter exchanges (24 lines), 16 idle
lines. 68 authored lines, none generated.** Fault checker clean.

Progression is genuinely gated: each step carries a rank, region, told-flag or
quest-flag requirement. Zeke's arc runs to silver; both twins' arcs run to gold
and require standing in Bratugal. Banter has its own gates so nobody jokes
about a place you have not been told about.

Separately, **Clark Bottom Farm** is the one companion *quest* — three
structures, three monster packs, complete end to end since round 48.

---

## 5. The board quests

`src/data/quests.js`

**Six quest kinds** — hunt (26), cull (22), survey (16), delve (14), gather
(12), relic (10), weighted as shown. Three of them (survey, gather, cull) also
serve as NPC requests.

**Almost entirely generated, and deliberately so.** A board is a seed, not a
list: every posting derives from `boardKey|weekIndex`, so a board shows the same
notices all week across saves and reloads while storing nothing but which have
been taken.

What is authored is **vocabulary, not quests**: 80 title-bank entries producing
320 board titles, 24 + 14 + 14 bounty-name parts, 288 villager names, and **nine
first-person request openers** — the only hand-written prose in the whole board
system.

**Open defect:** a turn-in rolls `rollBountyBonus()`, prints *"+ bonus loot!"*,
and grants nothing. About 22% of turn-ins make a promise the game does not keep.
Left alone this round because fixing it means deciding what the bonus *is*,
which is a design question rather than a repair.

---

## 6. The guild — this is the gap

**There is no guild quest chain and no rank-advancement chain.**

What exists is a service hub: Guildmaster Yorin with one line and a one-time
grant of a starter essence and armour set; a guild hall interior with a clerk
running a shop; the quest board on the guild lot; and Zeke, recruited from
inside the hall.

**Rank advancement is not quest-driven at all** — rank comes from level floors
and per-essence ranks. There is no assessment, no trial, no promotion.

The chain has been deferred four times: round 78's notes say it is round 79's,
round 79's say *"the guild chain is round 80"*, and round 80's notes do not
mention it. It is currently unscheduled.

---

## 7. The cults — written, and connected to nothing

`src/data/cultists.js` holds **10 fully authored cults** — name, rank, a
three-essence build, three stones, a blurb and a battle cry each — plus a
builder that produces a complete 16-socket kit, and a clean fault checker.
**Nothing imports it.** No cultist is ever placed or spawned, and 20 cultist
spritesheets are loaded every session to draw nobody.

This is the project's own named fault class 1 — *written and read by nothing* —
at about 190 lines and 20 loaded sheets. It is also the cheapest large win
available: the content exists and needs a placer.

---

## What I would do next, in order

1. **The guild chain.** It is the biggest hole, it is the thing a player will
   look for first in this setting, and it has slipped four rounds.
2. **Place the cults.** Ten authored antagonist groups and their art are
   already in the build. This is a placer, not a writing job.
3. **Act 3.** The square is built and the gate is authored; it needs the portal
   specialist to exist as a character.
4. **The bounty bonus.** Small, but the game currently promises loot it does
   not give.
5. **Death's undead roster.** His chain is among the best-written content here
   and it fights two families with no humanoid cultist — which item 2 above
   would supply.
