# Round 405

**Standing rule (unchanged):** confluence essences ARE essences.

## The Magic Society's specialty chains

Each of the nine magical theories now has a chain with one step at each rank: Iron, Bronze, Silver and Gold. The **senior** of any Magic Society hall gives the chain for the theory you study:
- The **Archmage** or **Magister** sets the step, names the site and marks it on your world map.
- If you haven't studied a theory, they send you to the archivist at the door.
- A step opens once your own rank reaches it.

**One step:**
1. **The study site** is a world-map square of that rank's danger, outside the main regions: a storm that won't move, a volcano's mouth, a natural array, an astral pocket, a migration ground, an ancient ritual site and so on. One or two Society officials are already camped there, and they talk you through the site.
2. **The study:** stand at the site, still, and read it.
3. **The trial** comes as soon as the study is done:
   - **a creature** drawn to the site;
   - **two rivals**;
   - **a surge in waves**; or
   - **a vigil** at dawn, dusk or through the night.

   Each chain varies its trials.
4. **Back at the hall,** the senior gives the step's **advanced insight**. Each one grows your theory's numbers by 15%, so all four add 60%: resistances, loot bonuses, summon power, teleport range and so on. Yes/no perks are unchanged. The Society also pays your **specialist training**: 25 iron at Iron, 20 bronze, 15 silver, 10 gold.

**How you find the site:**
- The senior names it and pins it on the world map in violet ("Magic Society: study site" or "trial").
- The quest tracker shows the open study.
- A Society official met in the wilds points you to your camp.

All 36 steps are written for their theory, with no repeated text. For example:

| Theory | Step |
|---|---|
| Astral | An aperture that closed by itself; a pocket breathing out tides; a broken summoning circle; a rift the Division has been feeding |
| Elemental | A fire-and-frost confluence; a volcano's mouth; a storm stalled over a moor; the Division's elemental forge |
| Weather | A storm altar; a valley where it hasn't stopped raining; a storm's still eye; the Division's weather engine |

## The soul chain, as you corrected it

| Rank | Site | What you do |
|---|---|---|
| Iron | An old aura-contest circle | Hold your aura while an official presses yours |
| Bronze | A monster-surge ground where essences gather | Watch an essence take to a soul |
| Silver | A barrow where an undeath cult keeps a soul trap | Unbind the trapped souls and beat the cult's two risen wardens. **The Society official wants the device** ("The Order of the Reaper would burn it. I want it") |
| Gold | A place where astral space presses thin | Endure a great astral being's attention and learn what a spirit domain is |

You never work for the Division, and no Reaper waystation appears.

**The soul arcane site is renamed:** "Soul Well" is now the **Lingering Barrow**: "A barrow where the dead were laid and never properly sent on."

## The Division, rank by rank

The same story runs under all nine chains:

| Rank | The Division |
|---|---|
| Iron | The Society insists on cooperation. A **Division Surveyor** works the site beside the officials: "We pool our readings with the Society now." |
| Bronze | A **Division Researcher** takes the raw readings and asks the wrong questions: "Who else knows you came here? Purely for the record." |
| Silver | The site shows the Division was there first and did harm: cuts in the ground, requisition seals, a camp found empty. |
| Gold | The Society has broken with the Division in the open hall. What you fight at the site is the Division's own work: every Gold trial's quarry is "Division-bred". |

**The Division's name:** the game already calls it the **Division of Essence Research** (Act 0 onwards), so I used that. Say if you want it to be "the Division of Essence Advancement" everywhere instead.

## What was checked

**Here:**
- `test_round405` (17 checks) passes. It covers:
  - all nine chains and all 36 steps, with no repeated text and varied trials;
  - the corrected soul chain and no "Soul Well";
  - the Division beats;
  - the parts as steps the lesson engine runs;
  - the 15% insight, with yes/no perks unchanged;
  - the senior, the site officials, the field hint, the world-map pin and the tracker.
- These also pass: `test_round404`, `403`, `402`, `401`, `357`, `358`, `359`, `328` and `test_syntax_all` (579 modules).
- `test_round369` was failing only on a version check that stopped at 399. It now accepts 400 and up.
- `GAME_VERSION` reads 405.

**In the game (headless browser):** with Soul theory at Iron, I walked one step through:
- the Archmage's talk, with the step and the site in Elder Stand (square 17,5);
- Take the study, the violet world-map pin and the tracker row;
- at the site, two Society officials and a Division Surveyor, each with their lines;
- the study done, the trial (a soul-family champion), the trial done;
- the officials gone once I left the square;
- the Archmage's insight and the claim: soul resistance went from 8% to 9.2%.

**Not checked:** walking into the overworld square on foot (I put the player "at" the site for the test), and your own build.

## Next

Companion martial arts: every companion gets an art, by recruiting or a journey, and grows by kills or by training with their master; finding each companion's master is part of their story.
