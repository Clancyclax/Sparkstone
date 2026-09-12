# Round 129 — two-tone blooms, a wider window

Three asks, all three done.

---

## 1. Flowers are sometimes multicoloured

> "Flowers should sometimes be multicolored (example doom is orange and blue,
> lava might be red and black)"

**Sometimes** is what the table is built around. An accent on all 148 essences
and 101 confluences wouldn't read as "this one is special" — it would read as a
second colour channel every bed happens to have. So `src/data/gardenPalette.js`
is an authored list of the concepts that are genuinely two things: **39 of 249,
about 16%.** Everything absent from it blooms in one colour, exactly as before.

Both of your examples are in it by name:

| | primary | accent |
|---|---|---|
| **Doom** | orange `#ff8f3f` | blue `#2979ff` |
| **Volcano** | red `#e53935` | char `#33211c` |

There is no Lava confluence, but there is a **Volcano**, and that is the one you
were describing.

Two details that mattered:

- **An entry can override the primary, not just add an accent.** Doom's colour is
  derived from whichever trio formed it, so leaving the primary to the derivation
  would have given "orange and blue" about one time in ten.
- **The table is keyed two ways.** Slots 0–2 hold essences, which have stable ids.
  Slot 3 holds a confluence, and `confluenceDefFor` mints a synthetic def whose id
  is the literal string `'confluence'` for all 101 of them — so the name is the
  only thing that identifies it.

**How two colours land on one bloom:** a sprite can carry one tint, so the second
colour lives on the *next plant along*. Iron beds alternate pot by pot; Bronze and
up split the field's shown rows down the middle, one colour each side.

## 2. Another 20%, and nothing overlaps

`GARDEN_GROWTH` is now `1.4 × 1.2`. Iron 171→205 wide, Bronze 204→245.

The two halves of that ask are really one ask — nine planters that may not overlap
need somewhere to not overlap. But the extra width alone doesn't do it: nine pots
side by side across a fifty-pixel bed is five pixels each, and a window wide
enough for nine readable pots per bed, four beds over, would be most of the
screen.

So **the row became a grid**, filling front to back, up to three across. Nine
plants is three rows of three, every one separate. Back rows draw smaller and
dimmer — that's depth rather than crowding. Nothing is drawn larger than the cell
it owns, so non-overlapping is a property of the arithmetic rather than something
checked afterwards. The suite verifies it the hard way: it boxes all 36 pots of a
full Iron garden and counts intersecting pairs. **Zero.**

## 3. The wording

`"the beds drink"` → **"Meditate to consolidate your gains."**

Only that one line was named, so the rank-flavoured captions stay — they're what
the window says once the pour has finished and there's nothing left to
consolidate.

---

## Caught by looking

**The dark accents were too dark.** "Red and black" taken literally gave fire
`#2b1410` and Volcano `#1a1110`. At Bronze, where a bloom is three pixels across,
a near-black petal isn't a dark flower — it's a *hole* in the field, and the eye
reads it as missing rather than charred. Every dark accent is now the darkest tone
that still reads as a colour at that size: a deep ember rather than soot.

**Two checks of my own were wrong:**

- The palette's "are these two colours distinguishable" test subtracted the two
  packed 24-bit integers, which is not a colour distance in any sense — it flagged
  Phoenix (bright orange against pale gold) as nearly identical because they share
  a red channel and so land close on the number line. Per-channel now.
- The round-128 check that every bloom carries its bed's colour only accepted the
  primary list. Correct while every bed was one colour; wrong the moment accents
  landed, reading a correct accent as a stray tint.

**A field crop was mispositioned.** `setCrop` masks the texture but doesn't shrink
the quad, so a one-row Bronze bed drew its single row at an eighth of the bed's
width, hugging the left edge. The sprite is now scaled as if the full tile were
shown and placed so the cropped slice lands where the bed is.

---

## Lanes

- `tools/run_data.sh` — **438/438** (was 426; +12 for the palette and the growth)
- `tools/run_one.sh test_round127_cycle` — **34/34** (was 28)

Version stamp: **129**. The Silver soul-space map moves to round 130.
