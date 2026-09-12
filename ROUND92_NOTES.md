# Round 92

Version stamp **92**.

Four bugs and two improvements. The largest of them is not on the list: item 6
turned into a second astral realm and the other half of the prologue's story.

---

## What was asked

> **Bugs**
> 1. On start, during name entry, the character is still in Cadence. The
>    character need to start in the sewers
> 2. The text of knowledge's introduction needs heavy improvement. It currently
>    is very overtly AI written and doesn't feel accurate to the world.
> 2.1) The pacing of knowledges advice doesn't make sense. After improving the
>    text itself the triggers need to be relevant to the information.
>    Picking up a weapon / quintessence / an essence / an awakening stone /
>    killing a monster / firsts in general, waking up, escaping the sewer,
>    encountering the cultist.
> 3. Sewer slimes need another 30% health reduction
> 4. Game now says "E to climb out" after you leave the sewers and it teleports
>    you back to the center of town.
>
> **Improvements**
> 5. How do we make the game larger on the screen, currently it only takes up
>    about 25% of the screen size.
> 6. a small sewer lid should be placed in the center of the city. Going back
>    into the sewers should be something the player can do.

Four questions went back before any code was written. Three came back on the
recommendation; two came back with corrections that changed the work:

- **Knowledge is a "she"** — "slightly humorous, but patient and helpful".
- **"you totally do get quintessence in the sewer, the slimes drop it"** —
  correct, and it settles how far past the prologue she keeps speaking.
- And item 6 grew a second half: the sewer leads to **an astral space where the
  cult that summoned you is hiding**, and the player learns there what the
  ritual actually was.

---

## 1) You wake up down there before you are asked your name

Round 89 moved the descent in front of Act 0's pages and stopped one step
short. `_maybePlayAct0` runs when the character creator **closes**, so the
creator itself — the name field, the body type, the skin tone, which is the
first minute of a new player's attention — still played over a sunlit market
square, and the ground swapped underneath them afterwards.

The descent is in `_titleNewGame` now, before the panel opens. It costs
nothing: round 60 built the world before the title screen, so this is a
teleport. Guarded on `sewerDone` so a returning character rolling a new face is
not dropped down a hole.

---

## 2) Knowledge, in her own voice

**She is a she.** `DESIGN_STORY.md` has said so since the beginning —
"Knowledge — the goddess — speaks into their mind" — and round 82's sewer file
wrote her character note as *"He is a god explaining something obvious to
someone who has just died"*, which is wrong twice over.

### What was actually wrong with the text

Naming it precisely, because "sounds AI-written" is a symptom:

- **Every beat ended on an aphorism.** *"That is the whole system. Everything
  else is arithmetic."* / *"People die holding full flasks. Do not be one."*
  Six lines, six punchlines — the rhythm of a pull quote, and six in a row is a
  machine that has learned the shape of an ending.
- **It was clipped to the point of coldness.** *"Armour is armour. Put it on."*
  was written to sound laconic and lands as bored.
- **It was funny at the player's expense**, before they had done anything.
- **It explained systems rather than things.** *"Sixteen sockets. Twenty
  abilities, once the innate ones are counted."* A goddess does not have a
  feature list.

She is warm now, unhurried, and her humour is aimed at the situation rather
than at the player. *"People die with full flasks on their belts more often
than you would credit. I would rather you did not; the conversation afterwards
is always so awkward."*

**Her introduction is her first line.** Act 0's second page used to be a
narrator describing a voice — *"It is the tone of somebody who has read the end
of the book"* — which tells the player how to hear her instead of letting her
speak. `division.js` reads `KNOWLEDGE_BY_ID.waking.text` now, so there is one
copy of her, written in the same voice as her twelfth line.

### The aphorism check has teeth, and is measured

`knowledgeFaults()` refuses the habit rather than asserting it is absent. The
first version of the check also demanded the closing paragraph be a single
sentence, which sounded right and **caught one of round 82's six** — because
the two purest examples are two sentences each. An assertion that does not fire
on the thing it was written about is decoration.

What separates them is length. Round 82's closing paragraphs measured **28, 43,
46, 50, 56** and 267 characters; the twelve below measure **63 to 160**. Sixty
splits those cleanly, and it is not a number chosen to make this pass — it
catches five of round 82's six.

---

## 2.1) She fires on firsts, not on floor tiles

Six tidbits used to fire by walking onto six numbered tiles. That was a real
improvement on Act 0's eight pages of exposition, and it was still a **guess**
about what the player had done — wrong in both directions:

- the essence lecture fired whether or not the player had ever seen an essence,
  and they had not: the sewer's `e` marks are **stones**, and the first essence
  in the game is the cultist's drop two chambers later;
- a player who found a sword in a dead end got the attack lecture only when
  they wandered back onto the path.

Twelve firsts now, each hung off the thing itself, each fired once ever and
saved (`player.knowledgeSaid` is an ordinary player field, so `saves.js`
carries it with no work):

| | fires on |
|---|---|
| waking | the ritual circle, as Act 0's second page |
| weapon · gear · consumable · stone · essence · quintessence · core | `_takeLoot`, the one door every pickup in the game goes through |
| kill | the first monster you get credit for |
| cultist | walking into the last chamber |
| surface | climbing out |
| confluence | the fourth essence forming |

Hooking the **door** rather than each caller is what makes "the first essence
you ever see" true rather than "the first essence a monster dropped".

**She waits for a lull.** Her first-kill line is raised *by* a kill, which is
the one moment the player is most likely still swinging — and a dialogue box
freezes the world behind it (round 73's `uiOpen` gate), so opening one mid-fight
stops the fight dead. `test_round28` caught it as *"a monster sprite follows the
monster :: {dialogue: true, who: 'Knowledge'}"* — the sprite was not following
because nothing was moving at all. A quiet timer, reset wherever damage is dealt
in either direction and on any kill, holds her until nobody has hit anybody for
a second and a half. Which is also how a patient person waits for a pause.

The numbered marks have come out of the map with the lines. Nothing in
`sewer.js` knows about Knowledge any more, which is the right amount for a file
about a maze.

---

## 3) The slimes carry a third less

Round 89 read *"slightly too dangerous"* as **damage** and only ever touched
damage, so a prologue slime has been carrying its full roster health for three
rounds. That is the number that decides how **long** the first fight in the
game lasts, and length is what makes a fight with no abilities in it a chore.

`SEWER_HP_MULT = 0.7`, applied to the spawned monster rather than to the slime
table — the same species is fought all over The Nek at full strength. Measured
in the running game at **0.70 of the roster value**, and the check fails rather
than skips if the roster entry cannot be found (the first version asked for
`MONSTERS`, got `undefined`, and quietly did not run — which reports as a pass).

---

## 4) The ladder prompt followed you into town

> "Game now says 'E to climb out' after you leave the sewers and it teleports
> you back to the center of town."

`nearSewerLadder` is written at the bottom of `_updateSewer`, and the **call
site** is guarded: `if (inside the sewer) _updateSewer(dt)`. So the moment the
player left, the field kept the value it last had — the ladder object, forever.
The prompt reads it without asking where the player is standing.

The fault is the shape rather than the prompt. A proximity field only ever
written while you are near the thing has no way to say "you are not near it any
more"; whoever stops calling the writer owes it a clear. Every other `near*`
field in the scene is written every frame by a loop that runs regardless of
where the player is, which is why this was the only one that could do it.

---

## 5) The game fills the window

960×600 is a quarter of a 1440p desktop and about a seventh of a 4K one. The
box **stays** 960×600 — round 38 put every piece of play UI inside it in those
coordinates and forty panels tuned against it would all need re-laying-out —
and the whole thing is CSS-transformed instead, so canvas and UI scale together
and their relationship is untouched by construction rather than by re-checking
each panel.

Not Phaser's `Scale.FIT`: it scales the canvas and knows nothing about the DOM
overlay on top, so every panel would drift off its anchor — the exact failure
round 38 fixed. Not integer-only either: 1920×1080 fits 2.0× across and 1.8×
down, so integer-only snaps to 1× and the game stays the size being complained
about on one of the two commonest desktop sizes.

**The dangerous half is pointers.** Phaser computes them from the canvas's
bounding rect against the game size, so a transform it has not been told about
offsets every click *silently* — the cursor still moves, and the thing under
your finger is not the thing you hit. `scale.refresh()` re-reads the rect;
without that line the whole feature is a bug.

Measured at four window sizes, with the centre of the canvas required to read
as (480, 300):

| window | scale | box | fill | centre reads |
|---|---|---|---|---|
| 1920×1080 | 1.80 | 1728×1080 | 90% | (480,300) |
| 2560×1440 | 2.40 | 2304×1440 | 90% | (480,300) |
| 1366×768 | 1.28 | 1229×768 | 90% | (480,300) |
| 900×560 | 1.00 | 960×600 | — | (480,300) |

The probe that produced that table was wrong twice first, and both are worth
recording because both read as "the feature is broken" when it was not:
`document.querySelector('canvas')` returns the **HUD portrait**, not the game
canvas, and the title screen is a full-window div in front of the canvas, so
every pointer event lands on it and Phaser's pointer never leaves (0,0).

---

## 6) The lid, and what is under the city

### The lid

Exactly where the player came up. `_climbOutOfSewer` puts them on
`townOrigin`, so the grate they pushed open is the middle of the plaza by
construction — anywhere else and the city has two holes in it, one of which the
player has used and cannot find again. Three tiles off the spawn so it is
beside them rather than under them.

**The first version read as a stain**, which the screenshot pass caught — the
exact failure the comment above it claimed to be avoiding. Three pieces now,
each doing one job: a dark socket wider than the lid so it sits in a hole
rather than on the pavement, the plate in iron with a hard dark edge, and a
small raised boss at the centre. The stroke does most of the work; an untraced
polygon on stone is a smudge.

**What is down there** is the maze as they left it — cultist dead, floor loot
taken, fog lifted — and the slimes come back on the ordinary respawn cadence,
because they are ordinary spawn groups and always were. Nothing had to arrange
that; it is what not writing a special case buys.

### The rift, and the other half of the story

> "at a different portion of the maze lead to an astral space. During the
> prologue the player has no way to sense it but if they go back later they
> will find a full iron/bronze rank astral space where the cult that summon you
> is hiding out."

A mark on the prologue's own map, in a dead-end chamber one turn off the way
out — a place that was there the first time and could not be reached, rather
than a place added afterwards. `sewerFaults` checks that it is **off the water
route**, because a rift in a route chamber is one the player walks past on the
way out and the whole idea is that they cannot.

`sewerDone` is the gate, and it is the right one: it is exactly "have you
finished down here and come back", it is already saved, and a rank gate would
have been worse — a player can reach iron rank without returning and would then
find the rift on a **first** run through the prologue, which is the one thing
this must not do. The art is hidden by the same test, so a first-run player
cannot tell that chamber from any other dead end.

#### It fits the existing band, at no cost to the world

A fifth realm laid out two-by-two needs a third **row** — 694 rows against the
480 the astral band reserves — which means growing `MAP_TILES_TOTAL`, moving the
minimap cache and the world map, and a migration for every save. Laid **three
across**, the fifth is row one's first slot: 462 rows needed, 480 available, and
the band spans the whole 2656-tile map so width is free. It holds nine realms
before height is a question again. Nothing outside `interiors.js` changed.

#### The estate caught the bug that would have ruined it

`_buildAstralPortals` iterates `REALM_LIST`, and `portalTileFor` is keyed by
**region** — and the undercity's region is genuinely `nek`. So the fifth realm
was given an overworld portal standing on the *same tile* as The Drowned
Shore's: two portals in one patch of grass, and the entire "you cannot sense it
during the prologue" design reachable by walking past a field at iron rank.
`test_round88` counted five portals where it wanted four.

#### What the cult was doing

Sereth Vane's account in the sewer is what a man at the bottom of a hole
believes: they had hold of something that eats worlds, it took everyone but
him, and the player was left in the circle. He is not lying and he is not
right — he was the far end of the rope.

Hierophant Iselde Marrow is the near end, and her three pages are the answer:
**an outworlder is not a thing you can summon.** What The Unmade did was open a
door and pull; while thirteen people were holding it open in one direction,
something used it in the other, came down their own rope, took every hand off
it but Sereth's, and put the player in the circle where the thing they wanted
should have been standing. Which is worse for the cult than being wrong would
have been, and is why this camp is still working.

She speaks before the camp turns, only once, and only if the player has not
already opened with violence.

---

## The estate

**102 suites. Everything passes except four, and none of the four is round 92.**

Three regressions were introduced during the round and all three were found by
the estate rather than by looking:

1. **The duplicate astral portal** above (`test_round88`).
2. **`_skipPrologue` left Knowledge talking.** It climbs the ladder, which now
   schedules her "surface" line — and this method's contract is *"the state a
   returning player is in"*. Left alone it opens a dialogue box in every suite
   that skips the prologue, which is most of the estate, and the interact
   chain's first branch is `if (this._dialogueOpen) this._closeDialogue()`, so
   the next E press **anywhere** is eaten closing it. `test_round22` caught it
   as *"E on the doorstep puts the player in the smithy :: null"* with
   `nearDoor: 'blacksmith'` and nothing else wrong — the same diagnostic round
   79 and round 91 both chased, and this time a genuine consequence. Exactly the
   reasoning round 89 used for `guildWelcomed`, and it broke the same way.
3. **Her page froze a pack-clear.** Covered under item 2.1.

### The keypress race, fixed properly this time

Round 91 found the real cause of a coin flip round 79 had misdiagnosed as
focus: `keyboard.press` sends keydown and keyup a millisecond apart, and keys
polled with `JustDown` from `update()` never see a press that begins and ends
between two frames. It fixed that by holding the key for 120ms — which is a bet
on the frame rate, and this container loses it.

Measured while the estate was busy: **17 fps**, so a frame is 59ms and 120ms is
two frames; the probe caught the key observed down for a single 8ms tick, with
`nearDoor: 'blacksmith'`, no overlay and the canvas focused. Exactly the state
round 91 recorded and could not explain.

`holdKey` waits on the **game's own frame counter** instead of on wall clock,
so it is right whatever the machine is doing. Round 22 and round 80's saves
both use it.

### Two crashes that were hiding their own failures

`test_round22` dereferenced `inside.roomBox.minX` on the path where the door
was **not** taken — with a `|| {…}` fallback three lines above it that was
written for exactly that case and then not used. A throw in the Node process
kills the run and silently skips every assertion below, the same shape round 67
fixed inside `page.evaluate` and round 91 fixed twice more. A failed door should
report a failed door.

### The four that fail, and why none is this round's

| | |
|---|---|
| `test_round49_taunt` | The known flake. Fails under full-estate load, **22/22 alone**. The runner already isolates it. |
| `test_round77a` 2.9 | *"the pack keeps formation"*. Newly characterised: it flips on the **pre-round-92 tree too — 3 failures in 5 runs** — with the same values, no monster chasing and no dialogue open. The measurement swings 9 → 130 → 222 against a cap of 200 while check 2.8 permits the anchor 420, so the two caps disagree. Worth a real fix; it is not a regression. |
| `test_round48_agentA` | Carried dead suite. |
| `test_round5_essence` | Carried dead suite. |

---

## Files

| | |
|---|---|
| `src/data/knowledge.js` | **new** — the twelve firsts, her voice, and `knowledgeFaults` |
| `src/data/sewer.js` | the tidbits and their tiles removed; the rift mark, and the check that it is off the route |
| `src/data/astral.js` | the fifth realm, `hidden`, `HIDDEN_REALM_FROM_SEWER`, the hierophant's reveal |
| `src/data/interiors.js` | three realms across instead of two |
| `src/data/division.js` | Act 0's Knowledge page is her `waking` line |
| `src/scenes/WorldScene.js` | the firsts queue and its lull, the descent before the creator, the ladder clear, the slime health, the lid, the rift, the camp reveal, the hidden-realm portal skip |
| `index.html` | the box scales to the window |
| `tools/tests/test_round92.cjs` | **new** — 31 checks |
| `tools/shot_round92.cjs`, `tools/probe_round92_scale.cjs` | **new** |
| `test_round22`, `28`, `48_agentB`, `80_saves`, `82` | the frame-based hold, the two latent crashes, and the superseded tidbit assertions |

---

## Left open

- **`test_round77a` 2.9 and `test_round49_taunt`** — both measure the machine.
  77a's two caps (200 and 420) genuinely disagree and one of them is wrong.
- **The jewelcrafter's own shopfront**, still.
- **The 56 authored confluence lines** for the crafters.
- **`expose`'s magnitude** against real monster resistances.
- Carried: the round-32 armour zip, the ten cults placed in the overworld, the
  bounty bonus that grants nothing, the minimap redrawing every frame, Act 3's
  portal specialist, `player.godStanding`.
