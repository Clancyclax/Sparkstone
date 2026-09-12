# Round 84

Version stamp **84**.

> *1) Minimap should show the sewer. Visibility in the sewer should be only 8×8
> squares*
> *2) only 3 skeletons should be in the room where the player spawns in*
> *3) The player should encounter the cultist in the last room of the sewer.*

Three asks, and the third turned out to be a bug in the trigger rather than in
the layout.

---

## 1) The dark

The sewer has three visibility states now, and the middle one is the point:

| | |
|---|---|
| **lit** | within four tiles of the player — eight tiles of ground across the window, plus the square they stand on. Drawn normally. |
| **remembered** | lit at some point in the past. Drawn at half brightness — you remember the shape of the corridor, not what is in it now. |
| **unseen** | never lit. Not drawn at all; the camera's black shows through. |

**Memory is what makes it navigable rather than merely dark.** A hard window
with nothing behind it is more claustrophobic and much worse to play: you
cannot tell a corridor you have exhausted from one you have not, so a wrong
turn costs you the whole map. Remembering the walls and forgetting the contents
is the split that keeps the maze a maze while still letting you back out of a
dead end.

**Monsters and loot are lit-only.** A slime you saw thirty seconds ago is not
where you left it, and drawing the memory of one is a lie the player would act
on. Bones, props and the ladder are furniture and dim with the ground they
stand on.

A square window rather than a circle, because the maze is drawn on squares — a
circular falloff makes a straight corridor appear to bulge in the middle.
Chebyshev distance is the same shape as the thing being lit.

**Why this is the design and not an effect.** A maze you can see all of is a
picture of a maze. "Follow the water and you are going the right direction" only
means something while the alternative is not knowing, and until this round the
player could stand in a chamber, see all four exits and pick the one with loot
in it by looking.

Two things cost a pass each:

- **`0x5a` was nearly black.** The floor is already a dark olive, so a third of
  it is a third of something dark and "remembered" was indistinguishable from
  "never seen". Half (`0x7e`) reads as a corridor you have been down without
  ever being mistaken for one you are standing in.
- **The loot discs stayed lit.** Each drop is three objects — the icon, the
  shadow disc under it, and the name — and the first cut hid only the icon. Grey
  ellipses hovering in the dark exactly where the loot was is a worse tell than
  drawing the loot would have been.

Recomputed on a **step, not a frame**: nothing changes until the player crosses
a tile boundary, and the repaint walks every ground tile in the viewport. It
runs perhaps twice a second while walking and not at all while standing still.

One pooling trap, worth recording because it is invisible until it is not:
ground tiles are recycled, so a tile dimmed in the sewer and reused for a street
carries the sewer's tint into daylight. `clearTint()` on recycle plus a re-dim
from `_applySewerFog` is the only version that is right in both directions —
and the suite now checks it on the surface, which is where it would be wrong.

### The minimap

Every other interior in the game is one room you can see all of, so the minimap
showing **the street outside** was the right answer — it tells you where you
will be when you walk out. The sewer is fifty tiles of maze you cannot see
across, which is the one case where the map of the place you are standing in is
the map you want. Until now it showed Cadence: a town the player has never been
to, while they were lost under it.

It **fills in as you explore**, sharing `sewer.seen` with the fog. One set, so
the map cannot claim to show you something you were never shown, and the two
cannot drift apart. The channel keeps its colour on it, because the map is the
second place the signpost has to work. The ladder appears once it has been
found; before that the player has no business knowing where it is.

It is not `_drawFlatMap`. That draws the outdoor world from a cached terrain
canvas and knows nothing about fog, and teaching it about a one-room exception
would put a sewer branch in the middle of the code that draws four continents.

---

## 2) Three skeletons

The map placed three and the room showed four, because **a bone prop is not a
bone person**: `bonePair` is two skeletons in one sprite and `boneRubble` is two
more under a cairn. The round-82 code cycled through all sixteen bone poses in
placement order and handed the pair to the second of the three marks.

Counting props is not counting bodies, and the user counts bodies. The spawn
chamber now takes three named single-figure poses — one seated, one fallen back,
one curled: three people who died where they were kneeling. The rest of the map
keeps the cycle, where a pair or a cairn is a fine thing to come across.

Four other bone marks came out of the ASCII at the same time, so the map places
nine now rather than thirteen.

---

## 3) The last room

He was always in the last chamber — the same room as the ladder, the far end of
the spanning tree, the deepest room in the maze by construction.

**What was wrong is that the trigger was a seven-tile radius, and a radius does
not know about walls.** Measured: 37 walkable tiles in *neighbouring* chambers
sat inside it. He would begin his three-line reveal through solid stone while
the player was still a room away and had never seen him — the confession that
the world was nearly ended landed on an empty corridor.

The gate is the chamber now, which is what "the last room" means. Two integer
divides, and geometry cannot fool it. The suite walks every one of those 37
tiles and asserts he stays silent on all of them, then steps into his room and
asserts he speaks.

---

## Tests

**`test_round82` is 47/47**, up from 36. The seven new checks:

- only the 9×9 window is lit, and nothing outside it is
- the rest of the maze is not drawn at all
- ground you have walked is remembered, not forgotten
- the seen map only ever grows
- the minimap shows the sewer, with the channel still marked on it
- three skeletons in the spawn room, none of them a pair
- the cultist never speaks from another room, and does the moment you are in
  his
- and the dark does not follow you up the ladder

One suite flake fixed while I was in there: the round-83 block clicked through
Act 0 a fixed number of times with a fixed wait, which is a race, and it lost
once — the second page came up slower, Act 0 had not opened when the clicks went
out, and every check below dereferenced a null room. It polls until the sewer is
underfoot now. Same gesture, cannot be outrun.

**Regression 95/95, no new failures** — the same five as the last two rounds
(`round41` ×3, `round43` ×3, `round45` ×1, `round48_agentA`, `round5_essence`).

---

## Numbers

| | |
|---|---|
| Sight | 4 tiles in every direction (9×9 lit) |
| Lit ground tiles | 81 |
| Hidden ground tiles | 1,621 |
| Bone piles | 9, of which 3 in the spawn chamber |
| Props | 93 |
| Display list in the sewer | 4,026 of 5,200 |

## Carried forward

- **The guild quest chain.** Deferred three rounds now.
- **Place the ten cults.**
- The bounty bonus grants nothing (~22% of turn-ins promise "+ bonus loot!").
- Consumables and monster parts have no icon art.
- Act 3's portal specialist does not exist.
- `player.godStanding` is written and read by nothing.
