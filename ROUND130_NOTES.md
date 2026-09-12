# Round 130 — the soul space

> "Lets make the window another 50% larger again, make visibility better.
>
> Then start on Silver and Gold which are full screen. The player should be able
> to interact in this screen with their followers but no companions should be
> visible. Clicking to meditate again should snap you back to the player and
> stop the meditation animation."

---

## The window

`GARDEN_GROWTH` is now `1.4 × 1.2 × 1.5` — the three rises are cumulative, each
asked for against the size the one before it shipped at. Iron 205→307 wide,
Bronze 245→368. A bed is eighty pixels across and a nine-planter grid gives each
pot twenty-five, which is enough for a pot to be a shape rather than a smudge.

**Visibility** is four changes, all about separating the garden from whatever
the player happens to be standing in front of — at 0.82 alpha a stone wall was
showing straight through the beds:

- a near-opaque ground (0.96)
- a drop shadow, which is what makes it read as *in front of* the world rather
  than painted onto it
- a brighter, thicker frame
- a lighter band behind the beds, so a dark bloom has something to be dark
  against — the other half of last round's dark-accent fix
- the caption bigger, brighter, and stroked

This is the **last** rise the window takes, because past Silver there is no
window.

---

## Silver and Gold are full screen

At Silver the garden stops being something you look at and becomes somewhere you
are.

**Built on the astral realm machinery, not beside it.** A realm is a room in its
own tile band, stamped on entry, that the player is teleported into and walks
with ordinary movement and ordinary collision — which is the whole of what this
needed. `SOUL_ROOM` is registered in `interiors.js` next to the realms, and it
takes the **free slot** in their three-across layout: five realms fill (0,0)
(1,0) (2,0) (0,1) (1,1) and leave (2,1) empty, so this costs no band height and
no change to `MAP_TILES_TOTAL` — which would have moved every saved coordinate
in the game.

**The space:** 44 tiles a side. Four plots — three essences and the confluence —
laid around a central path, with the confluence at the head where the path ends,
because it is what the other three add up to. Each plot is sown on a grid from
the same two flower sheets the window uses, at a density that comes from the same
stage table, so a Silver 9 field is visibly nine times a Silver 1 one.

**Your followers walk it.** `this._familiars` holds both yours and every
companion's, told apart by `f.owner` — null is yours. Only yours appear. Out in
the world a familiar has no world position at all (it orbits its owner in screen
space), so each gets one here and ambles between points inside the soul. Walk up
and press E and it talks about being in there:

> "This is the inside of you. I am told most people never come and look."
>
> "Out there I last as long as the spell. In here I am standing in the thing that
> casts it."

**No companions.** Both halves were needed: hiding the sprite *and* hiding the
npc entry, because an un-hidden entry leaves an invisible person in your soul
with a "Press E to talk" prompt. And `_updateParty` is dropped from the loop
entirely — `_drawPartyMember` rewrites position, depth and alpha every frame and
would have walked a hidden companion straight back into view.

**M snaps you back.** No reverse ramp — the meditation is nulled outright. Which
means the exit also has to do the two things the end of that animation would have
done: the rank-up (or a sitting in the soul space would consolidate nothing), and
clearing the cached texture state (or the player walks around in the seated
pose).

**Three meditation guards had to be relaxed**, each correct before this round:
`_updatePlayer` returns early while meditating, `_updatePlayerSprite` forces the
seated texture, and `canOpen` refuses every E press. All three assumed meditating
means sitting still.

---

## The art (second message this round)

> "Within the silver and gold soul space use the single plants placed in rows and
> fields. Use various grass and earth tiles for the ground. Added trees for gold
> soul space here. Adjust the color palettes as needed."

**Single plants in rows.** The first cut sowed each plot with crops of the
tilled-row *tile* — right art for a window eighty pixels wide, wrong art for a
field you are standing in, where it reads as wallpaper. A plot is planted with
the same potted plants the Iron window uses, one to a spot on the grid. A field
up close is individual plants in rows, and now it is.

**Grass and earth.** Two new interior floors — `soulGrass` under the plots,
`soulEarth` on the path — each with sixteen variants, so the ground renderer
hashes a different tile for every square exactly as it does outdoors. "Various"
costs nothing and is not a second scatter to maintain. They reuse region packs
rather than shipping new art, which is the trade the ice caves already made.

Which two packs took a screenshot to settle: the first cut took the **jungle
soil** for the earth on the strength of its name, and it is not earth at all but
dense dark foliage — so the path, the one part of a garden that should be trodden
bare, came out the most overgrown thing in the soul. The pairing that reads is
the other way about: bright flowery turf for the plots, and the meadow pack for
the path, whose variants are a mixture of grass, tilled earth and stubble.

**Trees at Gold.** The four blossom trees are split trunk-from-bloom like every
other flower, so a Gold soul's blossom takes its own essences' colours — which is
"adjust the palettes" answered by the mechanism already there rather than by four
more sets of recoloured PNGs. Every third planting in a Gold plot is a tree and
the rest stay flowers, so it reads as *forests and flowers* rather than an orchard
with the undergrowth mown.

---

## Caught by looking

1. **The transition froze halfway.** The arrival page opens a dialogue, and
   `_updatePlayer` — which is what normally walks the sprite to the world
   position — runs behind `!uiOpen`. So the player was at soul coordinates with
   the camera still framing the town they'd left. The sprite and camera move on
   entry now, before the page opens.
2. **The room came out black.** My first stamp wrote `tileType` directly and
   painted only floor tiles. `_stampRealm` is the method that does it correctly,
   and the void tiles have to be written too or the walls are holes.
3. **The space was a car park.** At 64 tiles you arrived twenty-four tiles from
   the nearest plot and walked across an acre of empty marble. 44 puts the first
   field four tiles from where you land.
4. **The planting read as weeds.** Sixteen clumps at random positions per plot. A
   field is a field because it is *planted* — the eye reads regularity as
   cultivation. It's a grid now.

## Two suites were measuring the wrong thing

- `test_round126_progression` **hung outright**: its loop meditates at Gold
  twenty thousand times, and each one now opened a full-screen room and built
  seventy-eight sprites.
- Worse, once fixed it reported "Gold 9" where it should read "Gold 0" — because
  it called `_maybeMeditationRankUp()` *and* left the soul space, and leaving
  **is** the consolidation. Two passes for one sitting. That one was my API
  inviting the mistake, so the note now says so at the call site.

---

## Lanes

- `tools/run_data.sh` — **454/454** (was 438; +16 for the soul space, its ground and its trees)
- `tools/run_one.sh test_round127_cycle` — **44/44** (was 34)
- `test_round126_progression` 18/18 · `test_round47` 39/39 · `test_round44`
  75/75 · `test_round49_team` 26/26 · `test_round125_chain` 32/32 ·
  `test_round124_prism` 38/38

Version stamp: **130**.
