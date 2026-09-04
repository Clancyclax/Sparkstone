# Sparkstone — Round 78

**Version stamp: 78** (under the minimap — if it still says 77, the update did not land).

Round 78 is the **assets, tiles and bugs** half, on your answer. The guild quest
chain (items 2, 2.1, 3, 3.1–3.3) is round 79, and it will be cast from the
cultists, priests and undead this round put in the game.

---

## Bugs

### 1. The smith is in the shop

He was in the square **and** he was a second weapon vendor: Emberhold Smithy has
had a working counter inside it since round 22, so the square held a duplicate
of a shop twenty paces away, in the open, with no dialogue and no building
behind him. A player who found Bram first never had a reason to open the smithy
door at all.

Bram moved to the smith's desk on the east wall and the counter came with him.
Hessa keeps the forge and gives up the till — two vendors of the same goods in
one room is a choice the player cannot make.

### 2. Avatar, and the one you did not name

**Two** essences were also confluences: Avatar and **Alchemy**. Nothing would
ever have found them, because both lists are individually correct — only the
comparison fails, and nobody was making it.

Round 77 walked straight into the consequence. It read your ten named sources
for the two-handed passive against both catalogues, found Avatar in each, and
filed it as an *essence* route when you meant the confluence.

- The **essences** are renamed: Avatar → **Aspect**, Alchemy → **Reagent**. The
  ids are untouched, so `STARTER_ESSENCES`, the hotbar order, the motifs, the
  signatures and the slime summon all still resolve — nothing was deleted and no
  content was lost.
- **Stones keep their names**, on your correction. Seven share one with a
  confluence (Avatar, Alchemy, Karmic, Sky, Undeath, Vision, Wrath) and a Stone
  of Wrath is not the Wrath confluence.
- Round 77's Avatar route **moved** rather than disappearing: out of the essence
  list, into the confluence list. All ten of your named sources still reach it.
- `validateEssenceNames` now runs at boot, so this cannot come back silently.

---

## Item 7 — the tiles

All fourteen sub-items, and **the numbers you sorted are unchanged**. On your
answer, "eliminated" means *not placed*: the frame stays in its sheet, keeps its
number, and the generator stops selecting it. Re-including one is a single
entry in one list.

**72 tiles eliminated. Nought of them appear anywhere in the world** — verified
by walking 12,996 real tiles through the real renderer across all four regions,
not by reading the table back to itself.

| | |
|---|---|
| 7.1 | 1–16 gone (they were already unreachable; now they are so in the data too) |
| 7.2 | 23–25 mixed along rivers and lakes in regions 1, 2 and 4 — **and not Elehyd**, whose rivers now run through round 77's desert |
| 7.3 | 30, 38, 39, 42, 44 gone |
| 7.4 | Ontaria's wilderness rebuilt to your mix |
| 7.5 | 109–124 are the floor of every Elehyd cave |
| 7.6 | Bratugal's water is 125–140 less 131 and 139, with 140 rare |
| 7.7 | 201–216 gone |
| 7.8 | thirteen city-paving frames gone |
| 7.9 | 244/247/251 pave Vashra and Bratugal's roads |
| 7.10 | 274, 277, 281, 282 gone |
| 7.11 | 283/287/288 filtered per god |
| 7.12 | Karsk Landing and Harrowmoor use 217–219 |
| 7.13 | Elehyd's roads are 220–222 |
| 7.14 | twelve path frames gone |
| 7.15 | 157–160 gone, 169–172 are the shallows |

**7.4 needed a vocabulary, not a list.** You wrote four different distributions
in one sentence — a majority, two kinds of patch, a *large* patch, and a rare
scatter — and only the last is a per-tile roll. So a plan is layers, each with
its frames, its weight and the **size of blob** it comes in. Measured over
25,600 tiles of Ontaria: 34/29/36 are 54% between them, 43 comes in large
patches at 16%, 31+37 and 40+41 mix at 17% and 11%, and 32 and 33 are 1% each.

> The first screenshot of it had a **ruled diagonal seam** running the width of
> the frame, because a patch edge on an exact tile boundary is a straight line
> in isometric. Jittering the blob coordinate by up to a tile before dividing
> costs nothing and makes every edge ragged. Round 4's patching got away without
> it because its three groups differed in tone only.

**Three things this turned up that nobody asked about:**

- **`street_tile.png` has been loaded since round 30 and drawn by nothing.**
  24 frames of your art, in memory, on screen never. 7.7, 7.12 and 7.13 are the
  first instructions to reach for it.
- **The desert sand in `region_mountain` (101–105) had never been drawn either**
  — that was round 77's find, and 7.5's ice pack is the same story: eight region
  packs shipped "in preparation for" regions that never named them.
- **My tile sheet was missing two atlases.** `city_stone` and `dock_wood` are
  loaded and drawn by the running game and were left out of round 77's list of
  288, because I built that list by hand instead of from what the scene loads.
  They are **appended** as 289–304 and 305–320, so every number you sorted still
  means what it meant.

Also fixed while in there: `WATER_DEEP_COUNT` and `WATER_FALLS_COUNT` have both
said 3 since round 4 and both sheets hold **four** frames — one frame of each
had never been drawn in seventy-four rounds.

---

## Items 4, 4.1, 5 and 10 — the new cast

**Eleven models, 79 sheets.**

### The recolour needed two techniques, not one

Round 3 recoloured NPCs with a small HSV jitter, which is right for three
farmers who should not be the same farmer. It cannot do what you asked for here,
because **both cultists and all three priests wear white robes**, and white has
no hue to rotate — 71% of the cultist woman's pixels sit below 0.12 saturation.

So there are two:

- **`vest`** tints only the *low-saturation* pixels toward a target hue. A white
  robe becomes a red robe; the wearer's face, hair and the wood of their staff do
  not. This is what makes a per-cult cultist and a per-god priest possible from
  one sheet.
- **`wardrobe`** rotates everything *except* skin, held out by hue window.

> The first contact sheet had **a townsman with a green face, a plate knight with
> a blue one, and a mage whose skin went teal.** For an undead that is variety;
> for "additional characters in the town" it is a rendering bug wearing a hat.
> The zombie and the goliath still take the whole-sprite jitter, because a
> drowned-blue corpse and a grey-green one *are* two different undead.
>
> The **wight** needed the robe treatment too — a hue rotation over a translucent
> burial shroud moved nothing, and the first five wights were the same wight with
> a differently coloured face.

### 4.1 — the colour *is* the build

Ten cults, and each robe colour is tied to the essence its wearer is actually
running, so the player can read the room before the fight starts. **Every cult
generates a full 20-ability kit and forms its own confluence:**

| cult | | essences | confluence |
|---|---|---|---|
| The Pale Order | bone | Bone + Dust + Resolute | Guardian |
| **The Red Hour** | blood | **Blood** + Knife + Zeal | Arsenal |
| The Long Vigil | undeath | **Death** + Bone + Malign | Doom |
| The Cinder Choir | ash | Fire + Smoke + Discord | Eclipse |
| The Unmade | void | Void + Dimension + Echo | Desolate |
| The Glad Confession | sin | Sin + Mirror + Hunger | Succubus |
| The Wilting | blight | Blight + Fungus + Venom | Eclipse |
| The Thunderhead | storm | Lightning + Cloud + Wind | Storm |
| The Drowned Choir | deep | Deep + Water + Tentacle | Ocean |
| The Gilded Mouth | gold | Sun + Feast + Visage | Ministration |

### 10 — the priests

Three models across the eight gods, each in their god's own colour, taken from
the same ramp as their temple floor — so a priest and the ground they stand on
match. **Death's are black**, on your correction: `vest` could add hue but never
take value away, so the first pass came out lavender.

> **And the third model is your other correction.** "Male Priest old warrior.zip"
> carries a state named *"Female priest, white"*, so I filed him as the priestess
> on the strength of the metadata. He is an old bald man. He is `priest_old` now,
> and the real female priest you sent is `priest_f`. Earlier in the same script I
> had to read a folder name **out** of the metadata because the filename lied;
> here the filename was right and the metadata lied. The only thing that settles
> what a model is, is looking at it.

**The public rite moved to the priest**, exactly as asked: the god keeps the
private charge and the disciple offering, and still *points at* the priest so a
player is never left with nothing. Both read the same chain state, so a chapter
taken from the priest and reported to the priest moves what the god used to move.

**10.1** — when the god is present the priest crosses to stand beside them and
turns to face them; when the god leaves, the priest goes back to the altar.

---

## Item 9 — the markers

Yellow **!** for something to give, yellow **?** to hand in, silver **?** for a
job you are carrying.

What makes this cheap is that the game already knew all three answers and had
never said them out loud: `_npcRequestFor` knows whether a person has a job,
`_boardTaken` whether it was accepted, `player.quests` whether it is finished.
The marker is a **read** of those with no new state at all — so it cannot drift
out of step with the dialogue, which is the failure mode of every quest indicator
that keeps its own flags. Handing a job in clears the mark; a shopkeeper never
gets one.

---

## Items 6.2 and 8 — houses and furniture

**Cadence has six more houses.** Not in `cadence.js`, which carries a "GENERATED
— do not hand-edit" banner and is re-exported from Tiled: rows added there would
be correct until the next import silently deleted them. The six lots were chosen
by **search** — every one is at least seven tiles from every existing house,
civic building and temple, with no road or water within two tiles of its
footprint.

**The prop atlas went from 67 to 98.** Fifteen pieces of furniture and sixteen
sets of remains, appended, so all of it works with the placement, palette and
collision code that already places a barrel. None of the remains are solid — a
skeleton you cannot walk over is a wall with a joke on it.

**The temples have furniture for the first time.** Round 36's instruction was
"no furniture" and stood for forty-two rounds; 8.1.3 supersedes it. A carved
pulpit and two shrine niches at the altar end, and **96 pews** — two banks of
three rows either side of a central aisle, facing the altar rather than the exit,
in all eight temples.

---

## Regression — and an honest account of it

**The three round-78 suites are clean: 26 + 24 + 14 = 64 new checks**, plus the
21-check data lane. Eleven existing suites were re-run against this round's tree:

| clean | with pre-existing failures |
|---|---|
| round16 31/31 · round17 34/34 · round46 31/31 · round50 44/44 · round51_charters 24/24 · round56 47/47 · round65 40/40 · round66 46/46 | round24 30/31 (guard count) · round45 36/37 (a magic shop in each high-magic city) |

Both of those two were verified pre-existing in round 77 and fail on assertions
with nothing to do with this round.

**One real failure, and it was mine.** `test_round17` pinned the five starter
essences by NAME, and bug 2 renamed one of them. The assertion's own title says
it checks *ids* — so it now checks ids, which is what `STARTER_ESSENCES`, the
hotbar and every save file are written in, plus a new check that no legacy name
collides with a confluence. That is the property bug 2 actually cares about.

**What I could not run: the full 88-suite sweep.** It wedged twice — thirteen
idle Chromium processes at a load average of 0.15, two parts in thirteen
minutes. The cause turned out to be in my own tooling rather than in the game:
`tools/run_one.sh` copies the shared harness to /tmp but **not
`harness_server.cjs`, which the harness spawns**, so every harness-based suite
run through it burned its whole timeout attaching, killing and retrying, and
died inside `boot()` — which reads exactly like the game hanging. Fixed in the
script; `test_round73` and `test_round74` remain unverified this round and are
the first thing to run next round.

I would rather say that plainly than report a sweep I did not complete.

## What did NOT land, and why

Said plainly rather than left for you to notice:

- **6.1 — the market stalls and city props are packed but not placed.** Both
  sheets are built (`city_stalls.png`, 16 stalls; `city_cityprops.png`, 11
  objects — a fountain, a well, a statue, crates, barrels, an anvil) and they are
  good. Scattering them through twenty-five settlements needs placement rules of
  its own, and I would rather do that properly than sprinkle them.
- **6.3 and 6.4 — the wall facings and the end caps.** The castle-wall pack
  contains the wall **and** the 8-direction end cap, unpacked and waiting. Your
  rotation rule (north border faces northeast, northwest faces north, west faces
  northwest…) is precise enough to implement directly, and it wants doing against
  every wall in every city with screenshots at each step.
- **10.3 — priests around towns and on the roads.** They are in their temples;
  putting them on the road is the wandering-NPC system.

These four are the top of round 79, before the guild chain.
