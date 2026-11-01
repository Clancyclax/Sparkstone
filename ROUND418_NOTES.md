# Round 418

Every temple now has a door. Cadence's eight already did. This round adds one to each of the 40 temples in the five grid cities: Harrowmoor, Karsk Landing, Vashra, Tolbrand Quay and Slagward.

## How the doors work

- **Where the door is.** It sits where the art draws the entrance, on the south face. The doorstep is the first clear ground in front of it.
- **What's inside.** A door opens on its god's temple room, the same room Cadence's temple of that god opens on. The god, the priests, the pews, the worshippers by the hour and the holy days are all there. There are still eight temple rooms, one per god, rather than 48 copies.
- **The way out.** You come out where you went in. Leave the War temple you entered in Harrowmoor and you step out in front of Harrowmoor's War temple. Enter by Cadence's door and you leave by Cadence's, as before.
- **Saving inside.** Loading a save made inside a temple room also sends you back out by the door you used.

## What was checked

**Here:**
- `test_round418` passes.
- `test_round417`, `test_round416` and `test_syntax_all` pass.
- The old suites' version checks now accept 418.

**In the game (headless browser):**
- 40 new temple doors, 8 in each grid city.
- Every doorstep is 47–60 units in front of its temple, on open ground, with none inside anything solid.
- I went into Harrowmoor's War temple and came out 96 units in front of Harrowmoor's door, on clear ground.
- I then went through Cadence's War temple and came back out at Cadence's door.
- A picture of Harrowmoor's and Slagward's temples with each doorstep marked: `r418_temple_doors.jpg`.
- No page errors.

**Not checked:**
- Loading a save made inside a temple. That code path was added, but I didn't run it.
- Your own build.
