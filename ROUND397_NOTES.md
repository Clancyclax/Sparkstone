# Round 397

## Doors

**Interior doors are 15% larger.** Every door leading from one room to another now draws 15% taller and wider. It grows from its foot, so the base stays exactly where it was on the wall line. Only the picture changed; where you stand to use a door is the same.

## Confluence names

**Confluence names no longer read essence descriptions.** A confluence is now named only from what its essences are: their names, families and phrases, their motif words, and the one-line body clause. Rewriting a description can never change a confluence name again.

- **Shift:** about 3.4% of three-essence combinations change name, almost all by losing a stray word such as "weight", "hands" or "behind".
- **Check:** a test now replaces every essence description with words like those, and no confluence name moves.
- **Unchanged:** Sickle + Venom + Swift is still Harvest.

## Voice

**Recording scripts for every major character and god.** They are in `Sparkstone-voice-scripts-r397.zip` on your Desktop: 3,000 lines across 133 characters, one script file per character.

- **Gods:** the eight gods, the four dark gods, Knowledge and the Keeper.
- **Companions:** the nine companions.
- **Story characters:** Olb, Rob Collins, Adjudicator Lane, the Pirate Queen, the Division leads and the other story characters.
- **Adventurers:** all 38, plus the shared adventurer lines.
- **Minor characters:** a folder of minor named characters (bandit captains, Society clerks, contract witnesses, god followers).

Every line comes word for word from the game's own text.

**Numbering.**
- Every line has its own five-digit number.
- Each character owns a block of 500 (Knowledge from 10001, Zeke from 16501, Olb from 21001…), so a number also tells you who is speaking.
- `RECORDING_GUIDE.md` in the zip explains it for whoever records.

**Saving takes.** A take is saved under its number, e.g. `16501.wav`; anything after the number is ignored. Use .wav, .mp3 or .ogg.

**Getting recordings into the game.** Send the folder to me, or run `node tools/voice/import_recordings.mjs <folder>` in the repo. Either way, the takes are filed under each character's voice folder and listed in a small index the game reads when it starts. Rebuild as usual and they play, with no new round needed.

- **Replacing computer voice:** 796 of the lines currently play as computer voice, and a real recording replaces it.
- **Matching:** recordings are matched to the line on screen, as before.

**A voiced page now plays every voiced paragraph on it, in order.** Before, only the first voiced paragraph played. This is why more lines could go into the scripts:
- a god's disciple greeting no longer silences the god's charge underneath it;
- each companion's last story page now plays both of its existing clips;
- an adventurer's loss telling plays all of its paragraphs.

**Lines left out.** 191 lines are listed in `not_playable_yet.csv` and should not be recorded yet:
- lines that only appear as floating text over a head, which isn't voiced;
- lines naming something unbounded, such as your own essence, a random stone or a generated team name;
- a few lines that no page shows any more.

Each row says why.

## Found while extracting

These are written two ways in the game:
- Zeke's late wife is "Martha" in his story but "Mary" in his talk before he joins.
- Knowledge is "she" everywhere except one line of the God of Purity's, which says "he".
- The twins' last quest-start line ("Go. All of you. I have timed it.") is given to Encykla but reads like Ædia.

Tell me which way each should go.

## Also in this round (repo zip)

- **`test_round74`** measures the starting region from where a new game starts, not from where the title screen parks the camera. The region now reads 100% walkable.
- **`test_round75`** and **`test_round305`** are updated for the great weapons and the recorded voice index.

## What was checked

**Here:**
- `test_round397` (11 checks) and `test_round396` (45) pass;
- `test_syntax_all` passes (560 modules);
- `GAME_VERSION` reads 397.

**Doors:** the door was screenshotted in the Society hall at its old and new size. Its foot is on the same spot.

**Voice:**
- `test_round305`'s playback checks pass with the new paragraph matching (the only failures are clip files that exist in your repo but not in this workspace);
- a stand-in recording imported for Zeke's greeting played in the game in place of the computer voice;
- all 796 lines that already have computer voice match their existing clips;
- all 3,000 numbers are unique.

**Not checked:** your own build, and the full regression (stopped, as asked).
