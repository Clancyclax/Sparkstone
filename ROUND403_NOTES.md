# Round 403

This round covers house rooms, the Magic Society halls, a batch of town fixes, and Olb (her lines, her walk and her last scene).

## A standing rule

**Confluence essences ARE essences.** Every system, table, line of dialogue or check that covers essences must cover the 102 confluence essences too. This round, Olb's per-essence lines cover all 148 essences and all 102 confluences, and the round-403 test fails if any one is missing.

## House rooms that look lived in

The house layouts are rewritten, using studio-apartment plans as the model:
- **Beds:** each stands against a wall with its nightstand at the head. Nightstands are no longer out on the floor, and no painting hangs behind a bed.
- **Heat:** one source per home, a hearth or a stove, never both.
- **Nothing from outdoors:** no garden planters and no braziers. The washbasin went too.
- **Clear lane:** the path in from the door is kept clear.

**Inside walls.** Six layouts now have one or two inside walls, built from the room's own kit wall thinned to about a tenth of its depth: the face is kept, with a thin cap and end. They block movement like walls, and fade while you stand behind one so you're never lost behind it.
- Ground floor: they split off the sleeping corner, the kitchen or the workshop.
- Upstairs: the two-bed room has a wall between the beds.

## Magic Society halls have interiors

Each of the six halls now has a door and a room inside: marble floor, a fireplace, scroll stands, display cases, a lectern, study tables and desks. The staff work inside, not out in the rain:
- the senior at the lectern;
- two at the desks;
- the rest on the floor between the tables.

## Town fixes

| What you asked | What changed |
|---|---|
| For Rent / For Sale signs too big | Half size. The inns' vacancy boards are unchanged. |
| Flag rods moving | A hanging banner's rod and the top hem stay still. Only the cloth below moves. |
| Paths stop short of the walls and stairs | The Society hall's walkway now runs to the wall under the infirmary door and up to the stairs. |
| Player in front of a door but drawn behind it | An inner door now draws by its own place in the room, so you are in front of it when your feet say so. |
| Low-quality hanging shop signs | Removed: the sun/coin, shield and potion signs, and the bathhouse's old signs. |
| Vehicles too small | 30% bigger in the stables, the wagon yards and on the roads. Yard spacing widened so they don't touch. |
| Festival arch in the street; green garland moving | The arch is now a park gateway: one per city at its biggest park, and one in Cadence by its biggest pond. Only the lower halves of the red ribbons move; the garland stays still. |
| Fountain looks still | Drops now run down the stream and rings spread in the basin. |
| Houses built into city walls | Any house within a wall's reach is taken down when the world is built. 18 were removed in my test world. |

## The soul bar

The soul bar is hidden until Olb's sacrifice. Your soul still grows underneath, so it shows its full size when the bar appears. The soul pressure during the god's aura still happens, but you won't see the bar drain then; it first appears when you wake in the infirmary.

## Olb

**Her essence lines** were rewritten from the new essence descriptions, one line per essence and one per confluence, so each one talks about its own essence. The spider line is about spiders now: "A spider never chases. Set the corner of the world so that running is the mistake, and let them find that out."

**Her walk.** Behind a slow walk she no longer stutters between a stride and a stop:
- She paces you, and closes a little faster when she has fallen behind.
- She only starts walking once her spot behind you has drifted, then keeps walking while you do.
- Her stride slows with her.

**The god is Destruction.** Nothing calls the god "the Mouth" any more.
- **The cult** is the Ashen Covenant.
- **Its members** are Ash-sworn.
- **Its leader** is Vharn, Voice of Destruction.
- **The hidden church's list** and the shrine's line name it Destruction.

**More context in her last scene:**
- **Before the portal** she explains that the frame only lets a sliver of Destruction through, that no Silver can fight even that, and that she is throwing the portal past the walls so that if it follows anything, it follows the two of you, not the city.
- **After the portal** she says you are out beyond the walls, east of the city in the barley, and that the Seam is shut. She asks you to tell the Society a Division researcher was building that door for a cult. Then she tells you that Destruction touched her when it struck her in the hall, and that what it touches breaks sooner or later.

Then come her own last words, unchanged.

**The blast.** When she explodes, you are thrown due south-west on the screen inside her shield, about nine tiles, with the camera trailing you. The white flash is lighter, so the throw shows as the screen fades to black.

## The soul chain, corrected (for the Society round)

- A **Magic Society official** wants the device. The player doesn't work for the Division.
- The waystation for souls belongs to an **undeath cult** that binds souls, not to the Order of the Reaper, which would never keep a soul from moving on.

## What was checked

**Here:**
- `test_round403` (33 checks) passes. It covers the layouts, inside walls, door layering, the walkway, the halls, signs, wind, shop signs, vehicles, park arches, the fountain, walls, the soul bar, every essence and every confluence having an Olb line, the spider line, Olb's pacing, the fling direction, "Destruction" not "the Mouth", and the new context lines.
- These also pass: `test_round402`, `401`, `400`, `359`, `344_misc`, `388_seam`, `355`, `356`, `267`, `393_wind` and `328`.
- `test_syntax_all` passes (574 modules).
- `GAME_VERSION` reads 403.

**In the game (headless browser here), with screenshots for the visual items:**
- **Houses:** forced layouts with their inside walls; the guild's inner door drawn behind the player; the gaps where houses were removed along the walls.
- **The Magic Society hall:** seven staff inside, none outside.
- **The town:** the fountain's water, the park arch, arch ribbons and banners in forced wind, and the bigger wagons.
- **The soul bar:** hidden before the sacrifice and shown after.
- **Olb's walk:** behind a walk at 60 and 110 px/s she changed between walking and standing once in five seconds.
- **The blast:** a staged blast threw the player about nine tiles down and to the left, in the shield, with the camera following (screenshots).

**Not checked:** your own build. I didn't play Olb's finale from start to end; the throw was checked by starting the blast phase directly.

## Next (round 404)

- Absorbing an essence or awakening stone takes you out of the inventory to watch a 3–5 second animation for that essence or stone.
- The third essence plays a 5-second sequence: your three essences swirl and plunge into you, the confluence appears over your head and is absorbed, then straight into the rank-up and the black goo.
