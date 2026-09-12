# Round 102 — Acts 3 and 4

> "Lets implement the act 3 and 4 story content."

Your four rulings, all taken: **a quintessence harvest in the badlands**; **both
acts complete**; **a real house-favour track with a losable council vote**;
**Rory's second phase built from Hydrix, scaled and palette-swapped**.

The chain was eleven stages over two acts. It is **twenty-four over four**, and
it walks end to end in the build.

---

## First, the thing I found before writing a line

**Act 2 has been unfinishable since it shipped in round 76.**

`div2_close` is a field objective in Ontaria. Who hands out and receives field
work was hardwired in the scene to `key === 'senior'` — Director Vesk, who is
*hidden* at the end of Act 1 and stands in Cadence, in The Nek, behind that
stage's own region gate. There was no one to take it from.

Twenty-six rounds, every table check green the whole time, because **no table
held the fact.** The stage exists, its region is right, its objective builds,
its dialogue is written. What was wrong was *who could be asked*, which is a
fact about placed sprites in a running world.

I found it by asking the build, for every stage, which placed NPC would offer a
choice — the same shape of question as round 101's "ask the world what it
draws". A stage names its own `giver` now; Act 1's leave it blank and default to
Vesk, so nothing about Act 1 moved.

**And then I immediately reproduced it, ten times over.** Rob Collins is the
giver for ten of the new stages and was placed once, in round 76, in a room on a
hill in Ontaria. Every Act 3 and Act 4 stage would have been as dead as
`div2_close`, in the round that diagnosed it. The census column that caught it
exists *because* of Act 2's bug. He travels now, which is what Act 2's last line
already said he would: *"I am coming with you."*

---

## Act 3 — the reduction site

Elehyd's crime is **scale**, and that is the whole act. Vesk kept forty-one
names in a ledger he closed when you walked in, in a building with a front of
house for visitors. Out past Karsk Landing, forty miles along a convoy road,
nobody is hiding anything — because there is nobody to hide it from.

What the player finds is not a ledger. It is a **rota**, in a clerk's hand, with
shifts and reliefs and a column headed *wastage* carried forward from the sheet
before. Eight braziers instead of four, in two rings: somebody took a research
apparatus and asked how many of it they could afford.

Overseer Dreft does not fight. She is *annoyed* — she has a schedule — and she
rings a bell and leaves east, toward the king's city, and she is not running.
She is reporting in.

The crossing is gated at **Gold**, and it is a person refusing rather than a
wall: the Pirate Queen, who has run the Elehyd packet from Ontaria's dock since
round 46 and has never had anything to say about it. She is the portal
specialist. Inventing a second woman whose job is getting people to Elehyd would
have been two people doing one thing.

---

## Act 4 — the king, the council, and the back room

Built to your outline: the disappearances, the Division found in town, the
noble houses, the deposition, the western base, Rory, the child, the gods.

**The Division is not hiding in Vashra.** It has a brass plate, a waiting area
and a landscape on the wall — the nicest room in the whole chain. A royal
warrant of retainer, countersigned, drawn against the harbour levy. The king is
not protecting them. The king is a customer.

### The four houses are four different problems

A single reputation bar with a threshold is an errand count wearing a crown.
Each house's ask runs through **a different piece of machinery the game already
has**, so satisfying Vantell teaches you nothing about satisfying Oromir:

| House | Head | Wants | Shape |
|---|---|---|---|
| **Vantell** | Lady Sereth Vantell | four years of a fund with no name reconciled | a `search`, in her own vault |
| **Oromir** | Ser Kadran Oromir | proof the wraiths are inside his wall | a `cull` |
| **Ilmarch** | Dame Ossa Ilmarch | where eleven of her people went | a `survey` |
| **Serrel** | Hierarch Bel Serrel | what was taken out of a temple, back | a `relic` |

Four asks, four objective kinds, **no fifth quest system** — the discipline round
65 held the god quests to and round 66 held the Division chain to.

### The vote can be lost

The council can be **called at any time, including immediately**, because a
failure state you cannot walk into is not a failure state. The crown holds a
seat and votes for itself, so you need three of four.

Call it short and the motion fails — and what it costs is not a reload. **A
failed motion makes the next one harder**: the threshold rises to all four, and
the chamber will not sit again that day. It rises *once* and then stops, which
is the difference between a hard round and an unwinnable save. All 256
combinations of four houses × four favour levels are walked in the data lane,
before and after a loss, and full favour always carries.

### Rory, in two phases and one body

Phase 1 is **the man from Act 1**, in his own art — the pleasant, distracted
junior nobody introduced, which is exactly why round 66 put him in that lab.
Every monster in the game draws from `mon_<family>_<state>`; his sheets are the
character layout, so there is now an escape hatch (`m.charArt`) for a
person-shaped boss, and only that.

Beating him **turns** him rather than killing him. Same monster, same uid, same
position: the family swaps to hydra, the art swaps to the darkened sheets, the
scale trebles. A second spawn would have been two things you killed rather than
one thing that changed.

The child is in the back room, Rob is at the door thanking you and going in to
"clean up", and on the road home **seven gods make you an offer**. Liberty says
nothing at all, and nobody explains why, and the act ends there.

---

## Six defects this round found in its own work

Every one of them passed something first.

1. **Every new story search showed Cadence's intake-ledger text.** The round-66
   branch was `if (first && cell) … else if (first) …` — with two rooms that was
   exactly right, and with eight it catches a first search in *any* room. So
   searching the Elehyd works printed *"Behind a stack of requisition forms, a
   clothbound intake ledger"*, four hundred miles from that sideboard, and then
   advanced the stage. Every assertion passed: the stage *did* advance. What was
   wrong was only what the player read.
2. **The back room had no way in.** `west_back` named a building that was never
   placed, so the last stage of the whole story was a search in a room with no
   exterior, no door and no doorstep. The table was right; the world was missing
   something. Third time in two rounds that has been the shape.
3. **Rory's phase 2 was invisible, and the reason was not what I thought.** I
   assumed the darkness ramp had gone too far and **rewrote it twice**. What was
   actually happening: he is spawned from the shade family, shades have a 0.45
   chance of spawning *in ambush*, and an ambushing monster draws at alpha 0.16.
   A coin flip. A two-line probe that printed `alpha` answered in one run what
   two rewrites did not. A boss who is talking to you does not lie in wait.
4. **Then he was still invisible, because the frame grid was invented.** I
   remembered to redeclare the baked sheet's frames — and declared `8 ×
   framesPerDir` columns, reasoning from the logical layout. `mon_hydra_idle.png`
   is **seven** columns by six. Every eighth cell fell off the right edge of the
   image, so the frames the draw asked for were transparent: sprite present,
   visible, alpha 1, at the camera's exact centre, and **empty**.
   `_templeFloorSheet` twelve lines away already derives the grid from the image;
   I copied its shape and substituted arithmetic I had done in my head.
5. **Phase 2 drew at the hydra's own scale.** The turn set the sprite scale and
   the draw loop reset it from the manifest sixty times a second.
6. **Three of my Vashra buildings stood in round 100's roads** and the sweep got
   stuck trying to move them. They are hand-sited — a moved chamber is a vote the
   player walks to the wrong place for — so they are exempt, by a flag rather
   than by a fifth `singleton ===` clause.

---

## The display-list budget, which I did not raise

Six authored rooms cost **334 display-list objects** at rest — about 56 a room,
most of it wall ring. That took the count from 4,738 to 5,072 and past the 5,200
cap once a dozen house interiors had been dressed.

`budgets.js` says plainly what that number is: *"a proxy for frame cost on the
weakest machine the game is expected to run on… if the game starts to feel
heavy, this is the first number to look at."* Raising a performance budget to fit
new content is what makes the budget stop meaning anything, and round 81 raised
it once already at your explicit instruction.

So the six rooms **build when somebody opens the door**, which is what round 64
already does for the dens and for a reason that was always about rooms rather
than dens: *"the rooms are in a band no camera ever reaches until the player
steps through a door, so building them up front buys nothing at all."*

---

## Three suites moved, all of them mine

- **`test_round66`** walked the whole chain and stuck at `div4_houses`. It is
  Act 1's suite; it stops at Act 3's seam now, read by name from division.js. It
  was also recording Act 3's eight wraiths as Act 1's four.
- **`test_round76e`** counted Act 2 as "every stage in Ontaria" — which is five
  now, because Act 3 opens at that region's dock. Counted between the named
  seams instead.
- **`test_round100`** gained `story102` in its hand-sited exemption list, named
  rather than filtered silently so it stays arguable.

---

## Suites

- `tools/tests/test_round102.cjs` — **68/68** (new)
- `tools/data_checks.mjs` — **225/225** (was 173)
- `tools/shot_round102.cjs` — the five interiors, the four heads, both phases
- Regressions green: 101 **23/23**, 100 **30/30**, 99 **44/44**, 98 **41/41**,
  97 **34/34**, 96 **43/43**, 95 **41/41**, 94 **48/48**, 90 **68/68**,
  88 **28/28**, 82 **50/50**, 80 saves **14/14**, 79a **23/23**, 78a **30/30**,
  78b **24/24**, 78c **14/14**, 76e **23/23**, 73 **46/46**, 66 **46/46**,
  65 **40/40**, 64 **58/58**, 51 charters **24/24**, 41 **61/61**.

---

## Still open

- **The companions have no story beats of their own.** Four named people with
  faces, kits and arcs, and the four-act story does not know they exist. Now
  that the story is finished, this is the largest gap in it.
- **Rob's line in Act 4 says he will not come in past the gate**, and the runtime
  places him outside the wall — but nothing stops the player fighting alongside
  him inside one. It reads correctly and is not enforced.
- **The gods' offers are the end of what is written.** DESIGN_STORY says "story
  continues past this point" and does not say where. Seven offers stand
  unanswered; choosing between them is a round of its own and probably wants
  your ruling first.
- **A boss chases out of its room.** Rory will walk off the interior floor into
  the void if the player leads him there. True of Act 1's wraiths since round 66,
  so not new — but it is more visible with a boss.
- Coldharrow, Gravemarch, Stiltrow and Thornwick still have no authored folk.
- `village` is missing from round 98's `CROWD` table (Sailmend, Cobb Point). One
  line.
- Guns, Technology, Magitech and Cyborg remain backburnered at your word.
