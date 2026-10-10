# Round 315 — Olb's hunt, the aperture, the cave and the meeting (2026-10-09)

## His words (the part this round builds, verbatim)

4.1.5) Finally it ends with simple monster hunt together where you stumble across an aperature to an astrap space.
4.1.6) On entering the astral space the player and mentor explore, kill a few monsters and they go deeper only to run into a meeting of a cult of destruction and some shady researchers.
4.1.7) Watching from the cover of some boxes and supplies the player and mentor realize something bad is going on.
4.1.8) The player is sensed and then attacked

(4.1.9 onward, the god, the aura, the portal, Olb's death and last words, the scar and the unlocked abilities, is round 316.)

## Readings I took

- "Shady researchers" are the **Division of Essence Research**, the game's own shady research house (the lab in Act 1). They wear grey coats with a Division stamp and are not named from the Act 1 cast, so nothing in Act 1 is contradicted.
- The cult of Destruction is **the Ashen Mouth**, after the god of Destruction already in `darkGods.js` ("The Ashen Mouth", who asks for things to be broken open). It borrows the Cinder Choir's robes.
- The "something bad" they overhear: the Division has been holding a seam open for the Ashen Mouth for four months; the cult wants it widened, the researcher says wider means a tear, and a tear opens under the city above it. The seam sits under the nest, and the city (Cadence) is on the other side of the wall. The Division's report deliberately does not say what the cult will do with the door.
- "Sensed": the Voice smells something warm; the researcher notices an aura at the stacks, "held in like somebody who was taught to" (the aura lesson paying off). Then "Bring me the warm ones."
- This round ends the arc *for now*: when the Mouth's people are down, Olb says it is going quiet in a way he does not like, you step back through the seam, and he takes it to the desk. Round 316 replaces that ending with the god.

## What I did

- **The hunt (4.1.5).** After the aura lesson, talk to Olb in the hall: he asks (two pages), then "I am ready" / "Not yet". Ready sends you east of Cadence's wall to a nest of three packs. Olb walks at your shoulder (his own body: the NPC sprite and walk cycle, a follow, a swing; he cannot be hurt and hits for 17) and is gone from the hall while he is out with you. Clear the three packs and a seam appears where the nest was, drawn as a pulsing purple ring; he stops you and explains what an aperture is. The tracker beside the minimap names the task with a distance and bearing.
- **The cave (4.1.6).** E at the seam takes you into **The Seam Below**, a hand-built cave (76 x 60 tiles) in the astral band beside the soul space: an arrival cavern, two caverns of creatures, a passage down and a hall. Stamped on first entry, like a realm. Clear the first and second caverns (Olb at your side; he barks "Deeper. Slowly." and "Hear that? Voices.").
- **The meeting (4.1.7).** At the passage down, with no creatures near, the scene starts: you and Olb are moved behind the supply stacks (barrels, crates, sacks, a handcart, an armour pile) and a 12-page overheard exchange plays (Olb whispering, the Voice of the Mouth, Senior Researcher Ione Tarrow). In the hall, four of the Mouth, their Voice, and two of the Division stand round a black iron frame holding the seam.
- **Sensed and attacked (4.1.8).** The last page ends with Olb ordering you up. The Division go back through their frame, the Mouth turn hostile and come for you, with the screen shaking. They are real targets (lockable, they drop what a person drops). Dying in the cave rewinds the hunt to the seam with Olb beside you again; a save made in the cave comes back at the seam.

## Tests

`tools/tests/test_round315.cjs` (44 checks): the room and script are complete and connected, the offer and both choices, the nest and its three packs, Olb fighting without the player swinging, the seam, the cave and both caverns, the meeting and the hiding place, the sensed beat, the attack, the way out, a death in the cave, and no page errors.
