# Round 417

Your new temples are in, replacing the old art in every city: Cadence and the five grid cities, 48 temples in all.

## The art

- **One drawing per god, facing south only.** Each temple uses `temple_<god>_256.png` from your `temples-256` folder, with nothing recoloured.
  - All eight are packed into one strip, `public/assets/temples_256.png`, in the game's god order: Death, Dominion, Healing, the Hero, Knowledge, Liberty, Purity, War.
  - The old eight-direction sheet (`temples.png`) is no longer loaded. I left the file in place.
- **Placement foot.** Each temple stands on its own `anchor_bottom_centre` from your `temples_256.json`.
- **Size.** As you chose, the temples stand the size they did before, about 7 tiles wide. The new art has about twice the pixels, so it is drawn at 136/256 of the old scale and shows the finer detail.
- **Facing.** Every temple now faces south. Cadence's temples used to face west and north-west onto their avenue, from round 48's arrows. With south-only art they face south like the rest, and each doorstep sits at the foot of its entrance.
- **Unchanged:** names, gods, priests, temple rooms and holy days are all as they were.
- **Not shipped:** `temples_review.png`. Your eight PNGs and the JSON are kept in the repo (`tools/temples_r417/src`) with the script that packs them.

## Collision

**What went wrong with the automatic fit.** The game normally fits a building's collision from the bottom row of its drawing. The new temples face square to the screen, and some have vines or a bell tower trailing lower on one side, so that reader misjudged them. Healing came back as a 36×142 sliver.

**What each temple has now.**
- One rectangle, never a circle, worked out from your manifest.
- On screen it shows as a diamond as wide as the drawing, centred under it.
- Its front corner sits just behind the entrance, so the doorstep in front stays clear.

**Sizes,** in half-widths of world units (a tile is 32):

| God | Half-width |
|---|---|
| Death | 82 |
| Dominion | 81 |
| Healing | 89 |
| The Hero | 97 |
| Knowledge | 84 |
| Liberty | 86 |
| Purity | 62 (the narrowest drawing) |
| War | 89 |

## Neighbours and roads

All 48 temples were checked in the running game. None of their collision rectangles overlaps another building's or covers a road tile, so no temple needed to be moved.

**Doors:**
- Cadence's eight temple doors are 47–60 units from their temples, on open ground.
- The grid-city temples have no door. They have never been enterable, and this round doesn't change that. I can give them doors and temple rooms in a later round if you want.

## What was checked

**Here:**
- `test_round417` passes. Among other things, it checks that the strip matches your eight PNGs pixel for pixel.
- `test_round416`, `test_round415`, `test_round414`, `test_round407` and `test_syntax_all` pass.
- The old suites' version checks now accept 417.

**In the game (headless browser):**
- Every temple's god and art, its facing, its collision size, overlaps and road tiles, and the door distances above.
- Pictures of each city's temples, with and without the collision outlines drawn: `r417_temples.jpg`.
- No page errors.

**Not checked:** your own build.
