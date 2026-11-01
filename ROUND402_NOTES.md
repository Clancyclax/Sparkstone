# Round 402

This round reworks the martial masters' lessons: you asked to fix the sameness and to give three lessons at every rank.

## Three lessons at every rank

A master of another art now teaches three lessons at each rank, Normal to Gold, with that rank's gifts:
1. An Uncommon ring or amulet (your choice).
2. A Rare piece of armour.
3. An Epic weapon or armour piece (your choice).

**Gear rank:**
- Gifts are Iron gear at Normal and Iron, then Bronze, Silver and Gold at those ranks.
- The gear's effects grow with each rank. A fire art's armour, for example, goes from +8% fire damage at Iron to +12% at Gold.

**Ranking up mid-lesson.** If you rank up partway through a master's lessons, that master finishes the open lesson at the old rank first, then moves on to your new rank.

## No repeats

Each rank's three lessons are a practice, a journey and a trial. There are five kinds of each, and each master sets them in their own order, so **no master sets the same kind twice across the five ranks**. Places, champions and counts change too, and counts grow with rank.

**Practices.** Which ones an art gets depends on what the art is about. A master always sets their art's own practices before the general ones.

| Practice | Which arts |
|---|---|
| Defeats with the art's weapon in your hands (dagger, a weapon in each hand, a shield on your arm, a two-handed weapon...) | weapon arts |
| Land critical hits | dagger and crit arts |
| Dodge blows | footwork arts |
| Defeat monsters in a row without being hit (a hit resets the run) | footwork arts, and generally |
| Block blows | guard and shield arts |
| Defeat monsters without moving your feet | guard arts, and generally |
| Defeat monsters with fire (or the art's element) magic | element arts; "your spells" for caster arts |
| Defeat a family of monsters, defeat monsters at night, or plain defeats | any art |

**Journeys:**
- **Meditate** at a place: stand still there.
- **Gather** a material at a place. It's the art's own material, e.g. ember-glass for fire, iron-bark for guard, windfeathers for footwork, hawk feathers for crit.
- **Keep a vigil** at a place at dawn, at dusk or through the night. It only counts during those hours.
- **Carry a letter** to another master, wherever they are. Talk to them to hand it over, and they answer it.
- **A pilgrimage:** sit at two places in turn.

**Trials:**
- **A champion** to beat.
- **Two rivals** to beat.
- **Hold a place against waves:** two to four waves, each bigger than the last.
- **A proving** fought the art's way:
  - without letting it touch you (footwork);
  - without moving your feet (guard);
  - with the art's weapon in your hands;
  - with fire magic for the last blow (element).

  Do it any other way and the champion comes back for another try.
- **A night hunt:** the champion only comes out at night.

## Art-specific talk

Each lesson opens with what the master says, built from two parts:
- **The art's image:** its name's last word, e.g. the Adder, the Tortoise, the Meteor, the Cedar. For example: "Watch the adder. It does not think about what it does."
- **One of the art's tenets.** There are six each for every element, every weapon, footwork, guard, crit, casting, endurance, speed and the body. An art draws on all of its themes.

The voice changes as you rise, from teaching a beginner to talking to a near-equal at Gold. Across a master's fifteen lessons, no line repeats.

## Travel

| Rank | Where the lessons go |
|---|---|
| Normal, Iron | Stay in the master's own region (for a dojo master, their own square) |
| Bronze | About one lesson in three goes abroad: another region, or a square of the world map |
| Silver, Gold | Every lesson goes abroad. Even the practice only counts while you are in the named place, e.g. "Defeat 25 monsters without moving your feet in Black Wold (square 5,2 of the south)" |

Journeys only go where the world map shows them: the five northern regions, the southern regions and the world map's squares. Gold lessons go to the toughest squares.

## World map pins

Every place an open lesson sends you is pinned on the world map with a teal ringed pin. Each pin is labelled with the master and what waits there: materials, an event, a challenge, a letter, or practice.

**Your own art's training (round 400)** is pinned too, in violet: its journeys and champions.

**Region map:** places inside a region are still pinned on the region map as well.

## Gift fixes

**Weapons.** An Epic weapon gift now follows the art:
- **A shield art** gives a hammer, to carry beside the shield.
- **A guard or heavy art without a weapon** gives a maul. It used to give a staff.
- **Two-handed arts** give a maul, and great-weapon arts a greatsword.
- **Otherwise:** the art's own weapon. Failing that, a dagger for crit, a staff for element or casting, and a sword for anything else.

**Names.** Gift names follow the art's main theme. A fire art that also dodges gives "...of Embers", not "...of the Fox".

## What was checked

**Here:**
- `test_round402` (26 checks) passes. It covers:
  - no shape repeated across the five ranks, checked over 100 masters (four arts × 25 seeds) and all three lessons;
  - Normal and Iron never going abroad, Silver and Gold always going abroad, and Bronze going abroad sometimes;
  - the art-shaped practices (dagger, shield, fire);
  - fifteen different lines per master;
  - the gift fixes.
- `test_round401` (updated for the new lesson shapes), `400`, `399`, `398` and `328` pass.
- `test_syntax_all` passes (571 modules).
- `GAME_VERSION` reads 402.

**In the game:**
- **One master, four ranks:** I took lessons at Iron, Bronze, Silver and Gold.
  - Iron stayed in Ontaria.
  - At Bronze the trial went to Sirukh Sands.
  - Silver went to Black Wold and Grey Wold, and a letter to a dojo in Green Flats.
  - Gold went to squares in the south and the north.
- **Mechanics:**
  - Three crits finished a crit practice.
  - Meditation filled while I stood at the place.
  - A proving's champion appeared, and a kill without the sword was refused (the champion comes again).
  - A letter delivered: the other master answered it.
- **World map:** pins drawn at a dojo square in the far north and in The Nek (screenshot).
- **A Bronze lesson's talk:** the art's line and tenet, then "Block 28 blows" (screenshot).

**Not checked:** your own build. In the headless browser here, a master's sprite takes 10–15 seconds to load the first time. That's this machine's slow graphics, not the game.

## Next

- **Round 403:** the Magic Society's specialty chains and the Division arc, with the soul chain rewritten from HWFWM's soul lore.
- **After that:** companion martial arts.
