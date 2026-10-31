# Round 399

## The martial masters, drawn

**The masters now have bodies of their own.** All eight characters from the brief are in, each in all 11 stances: Monk, Battlemage, Knight, Barbarian, Wildwoman, Witch, Samurai and Adventurer. Before, the masters borrowed ordinary adventurer sprites.

**What a master does:**

- **Standing:** a master stands in their settlement and faces you when you come close.
- **Kata:** now and then they drill one (the Attack animation).
- **Pacing:** sometimes they pace out a few steps and come back (the Running animation).
- **Talking and buying:** they stop to talk, and show you a kata when you buy their manual.

**Anchoring.** Every sheet keeps its own canvas and is placed by the index's `anchor_x` and `ground_y`, so long weapons don't shift the feet. The figures are the same size as your character.

**Death animations aren't used yet.** A master can't be fought, so the Death sheets aren't shipped. The packing tool can add them (`--death`) if masters ever fight.

**Flagged sets.** The glitches the brief lists ship as they are: the monk's missing robe from the south-east and south-west, the battlemage's baked-in shadow, the stray second blades and whips, the shields that vanish mid-attack, the samurai's scythe, and the barbarian's whip.

## Colours: a very large set of masters

**24 mixed palettes for every stance.** The gear is dyed with three colours: a shadow colour in the folds, a body colour over most of the cloth, and a highlight on the brightest edges. Examples are crimson with gold lights, navy with silver, ink-black with a crimson edge, and teal with bronze. Skin and hair keep their natural colours.

**Element masters wear their element's colours.** Each element has four palettes of its own:

| Element | Colours |
|---|---|
| Fire | reds and golds |
| Frost | ice blues |
| Lightning | violet and yellow |
| Nature | greens and bark |
| Shadow | black and violet |
| Radiant | gold and white |

**Hand flames.** The flames stance gets two flames on the hands for as long as it's shown, as the brief asked, because the sprite's own flames burn out after its attack. They take the element's colour, or white for a master with no element.

**How many looks.** Eight characters × 11 stances × 24 or more palettes is over 2,000 possible masters. In 40 test runs, 377 different ones appeared.

## Matching the master to the art

**The master holds what the art is about:**

| The art | The master's stance |
|---|---|
| Dagger | dagger |
| Sword, greatsword, bladed, one weapon or two | sword |
| Axe, greataxe, warhammer, maul, heavy | axe |
| Spear, glaive, javelin, polearm, two-handed | spear |
| Scythe | scythe |
| Whip | whip |
| Bow, crossbow, ranged | bow |
| Staff | staff |
| Shield | shield |
| An element (its spells, its weapon share, or its resistance) | flames, in that element's colours |
| Mostly about casting speed, mana or cooldowns | staff |
| Everything else | bare hands |

**Who teaches it.** Each stance has the characters that suit it best, and those come first: a knight or samurai for the sword, a monk or wildwoman bare-handed, a witch or battlemage with flames. The masters of one run are spread across all eight characters.

**There are now twelve masters a run** (up from ten). Their names fit their bodies.

## What was checked

**Here:**
- `test_round399` (20 checks) and `test_round398` (41) pass.
- `test_syntax_all` passes (564 modules).
- `GAME_VERSION` reads 399.

**In the game (screenshots):**
- Masters appear in their settlements in their dyed colours: a fire barbarian, a moss-and-gold battlemage with a staff, a teal-and-bronze adventurer with a bow, and a shadow wildwoman.
- The kata and run frames step through with the feet on the ground.
- The hand flames show in the master's element colour.

**Not checked:** your own build.

**The overlay comes in two zips this round:** `Sparkstone-overlay-r399-patch.zip` and `Sparkstone-overlay-r399-patch2.zip`. The 264 new sheets come to 26 MB, so they are split to keep each zip under 28 MB. Your build lays down both.
