# Round 83

Version stamp **83**.

> *"Okay, now for the sewer tiles. Lets palette shift the grey city tile more of
> a brown/green and the water palette shift towards a green. This should make
> for an acceptable sewer backdrop. Then populate."*

Two recoloured tiles and ninety-two pieces of furniture. The prologue stops
looking like a room the game had spare.

---

## 1) The backdrop

Round 82's sewer was borrowing. Its floor was the forge's soot flagstone and
its channel was `region_slate_dark`, both chosen because they were the nearest
thing already loaded — and worse than that, `floorForge` is `false` in the
interior art manifest, so what the player actually walked on was a **generated
placeholder**: a flat brown diamond with five fleck pixels on it.

What was wrong with the grey city paving was only ever the colour. The shape is
right — big worn slabs with cracks running through them, which is what a sewer
floor is. So `extract_round83_sewer_tiles.py` recolours it.

**It shifts the PALETTE, not the pixels.** Both sources are 8-bit paletted PNGs,
so a sheet's entire appearance is 256 RGB triples; rewriting those and leaving
every pixel index alone cannot soften an edge, move a pixel or invent a colour.
A per-pixel filter on an RGBA copy can do all three, and pixel art notices.

### Two ways to do this that do not work

Both were tried, at length, and both are in the script's header so the next
person does not spend the afternoon I did:

- **Rotating the hue does nothing to the floor.** The floor is grey and grey has
  no hue to rotate. This is the classic way a recolour script silently returns
  its own input, and it is invisible unless you diff the output.
- **Tinting in HLS goes lime.** Keep the lightness, impose a hue, scale the
  saturation — four parameter sweeps of it, and every setting that made the
  midtones brown enough made the lit faces fluorescent, while every setting that
  tamed the lit faces left the midtones grey. HLS saturation and lightness are
  not perceptual and the tile fights you.

A third attempt compressed the lightness into a dim band first, which fixed the
colour and flattened the cracks out of existence — the detail in pixel art *is*
the luminance range.

### What does work: a gradient map

Each palette entry's luminance is looked up in a short ramp of hand-picked
stops, so the colours are **written down** rather than hoped for as the output
of a colour-space conversion:

| | floor | |
|---|---|---|
| crack shadow | `#0c0f0a` | near black, faintly green |
| dark moss | `#212618` | |
| olive | `#383a25` | the bulk of the tile |
| wet clay | `#4e462f` | the lit faces |
| worn edge | `#665c43` | |

Green in the cracks where water stands, brown on the faces where it does not.
That is "brown/green" as two ends of one ramp rather than as the mud colour
halfway between them. The structure survives because luminance is what carries
structure, and luminance is the input.

The water is the same machine pointed at `water_deep` — the darkest water sheet,
and the one whose ripples read at a single tile's width, which matters because
the channel is never more than three tiles across.

### The floor is dimmer than it first was

The first ramp was a stop brighter at every point and looked right on a contact
sheet. In the room it was wrong: the floor and the channel came out nearly the
same value, and **the channel is not decoration, it is the only direction the
player is ever given**. Two greens of equal weight are not a signpost. The floor
dropped back 26% and lets the water be the brightest thing on the ground.

### One bug the frame count caught

`water_deep.png` declares four frames and the fourth is entirely transparent.
Harmless in the river, where the plan never picks it — and a hole in the floor
here, where the channel picks its variant by hashing the tile position and would
land on the empty one time in four. The extractor drops blank frames by counting
them rather than by knowing today's number, and `_floorFrames` now measures the
channel's sheet too. It was falling through to its declared `variants`, which is
exactly the guess that loop exists to stop trusting.

---

## 2) Populated

`SEWER_PROPS` is computed from the same ASCII the walls come from, in the
ordinary `{ key, tx, ty }` shape every other room's furniture uses. Every room
in `interiors.js` lists its props by hand, which is right for a smithy with nine
objects and impossible for thirty-five chambers.

**What each chamber gets, and why it differs:**

- **The start** is the ritual. The cult set up here and the player wakes in what
  is left of it: the idol, the podium, the shrine niche, amphorae, and three lit
  braziers ringing the skeletons.
- **A route chamber** gets almost nothing — 9% of eligible tiles. The route has
  to stay readable; a player following the water is looking for the next
  doorway, and the path is the one place clutter costs something.
- **A dead end** gets the clutter instead: barrels, sacks, a handcart, a wash
  tub, jugs. A dead end is where the loot is, and turning off the route should
  look like somewhere worth having turned off for. Same deal the maze makes,
  dressed.
- **The last chamber** is the ritual again, with the cultist standing in it.

### The check that earns its keep

Props are solid. A hundred and forty of them placed by a hash is a hundred and
forty chances to wall off a chamber, and the failure is silent: the maze still
looks finished, the player just cannot reach the loot in one dead end and has no
way of knowing why.

`sewerFaults()` re-runs the reachability proof **with the props treated as
walls**, pessimistically — blocking each prop's four neighbours too, since a
prop's collision radius is `tiles * TILE / 2` and the big pieces are wider than
the tile they stand on. It caught five walled-off placements on its first run.

Density does not fix that. Turning the dice down makes a sealed chamber rarer
without making it impossible, and "rare" is the worst kind of bug to own — it
survives the round it was introduced in and surfaces three rounds later as a
player wondering why a corridor goes nowhere. So **placement is a filter**: each
candidate is accepted only if, with every prop accepted before it in the way,
everything the player must reach is still reachable. One prop is currently
refused. The chamber gets one fewer crate, which nobody can see, instead of a
wall nobody can pass.

### Three things found by looking rather than by testing

- **The furniture was drawn by nobody.** `SEWER_ROOM.props` was set and correct
  and 143 long, and the room stayed empty — because round 82 skips the sewer
  whole in `_buildInteriors` (so the maze does not get a wall ring it does not
  want) and the prop pass lives inside the block it skips. Caught by counting
  sprites: an undressed room looks exactly like a room whose dressing has not
  been written yet. `_dressSewer` does it, in the same three lines minus the
  doormat and the palette sheet a sewer has no use for.
- **The doorway guard was arithmetic, and wrong.** A chamber's interior is
  offsets 1..6 with the wall line at 0, so the only tiles that touch a wall are
  1 and 6 — which makes "stay two tiles off the wall line" and "stand against a
  wall" contradictory. Six props in the entire sewer. It asks the real question
  now: is any tile touching this one an open tile ON a wall line? That reads as
  the thing being avoided and survives the maze being regenerated.
- **The furniture was lit for a market square.** Ninety pieces of town furniture
  in a dim olive tunnel read as a warehouse with the lights off, every object
  shouting a colour the room does not have — and `crateProduce` is a crate of
  bright fruit, which lit the tunnels up like a greengrocer's. That one is out
  of the table; the rest go through `_sewerPropSheet`, which pulls every pixel
  42% toward the floor's own olive and darkens it 22%, baked once into a canvas
  texture. Gentler than the tile ramp on purpose: furniture that lost all its
  own colour would stop being readable as a barrel. `_paletteSheet` was the
  obvious thing to reuse and is the wrong tool — it remaps *named materials*, so
  it recolours a wooden bench and leaves a clay amphora as bright as it was.

---

## Numbers

| | |
|---|---|
| Props placed | **92** (1 refused for blocking) |
| Chambers dressed | 33 of 35 |
| Interior sprites | 813, up from 719 |
| Display list in the sewer | **4,029** of 5,200 |
| Sewer faults | none |

## Tests

**`test_round82` is 36/36**, up from 28 — eight new checks covering this round,
run on a fresh page because everything before them has killed the cultist and
climbed out. They assert the texture keys the ground renderer actually resolves
(not the table that names them), that both sheets have three real frames, that
every placed prop was drawn, that the tinted sheet exists, and that the display
list still fits its budget.

**The regression is 95/95 with no new failures.** The five that fail — `round41`
×3, `round43` ×4 under load and ×3 alone, `round45` ×1, `round48_agentA` and
`round5_essence` dead — failed identically before this round.

---

## Carried into the next round

Unchanged from round 82, and still in this order:

- **The guild quest chain.** Deferred twice now, and still the biggest hole.
- **Place the ten cults.** Sereth Vane of The Unmade is the only one the player
  ever meets.
- The bounty bonus grants nothing (~22% of turn-ins promise "+ bonus loot!").
- Consumables and monster parts have no icon art.
- Act 3's portal specialist does not exist.
- `player.godStanding` is written and read by nothing.
