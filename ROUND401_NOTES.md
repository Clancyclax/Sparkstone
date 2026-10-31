# Round 401

This round covers part of your request:
- the 200 masters, with your own art always among them;
- the other masters' three lessons, with art-themed gear;
- the Magic Society's twelve people, recoloured, staffing the halls;
- Society officials met in the wilds.

Two parts are left for round 402:
- companions' martial arts;
- the Society's specialty quests, study sites and the Division arc.

The study sites are also where the "1–2 officials at each site" go, so that part waits for them.

## 200 masters a run

**How many squares.** The world map has 686 squares (312 north, 374 south). Of those, 320 are land outside the story regions and can be explored: 188 in the north and 132 in the south.

**Where the masters stand:**
- 60% of the explorable squares hold a dojo with a master: 192 squares.
- 8 more masters stand in the story regions' hamlets, wilds and deep wilds.
- That makes 200 masters.
- A dojo square needs less land than before, so small islands and coastal squares can hold a dojo too.

**What they teach:**
- Every art of the run's 120 has at least one master before any art gets a second.
- Every master has a different name.
- The eight characters and their palettes are spread across all 200.

**Your own art.**
- If you learn an art from a skill book, a great master of it always exists.
- Where the great master stands is random each run: iron country most often, gold country only in the south.
- If your art is also in the run's 120, ordinary masters of it exist as well.
- In the last check a run had 201 masters: the 200 plus the great master.

## A master's three lessons

**Who teaches.** Only a master of your own art trains you further in it (round 400). Every other master now teaches three lessons about their way.

**How a lesson goes:**
- Each lesson opens with a line of the master's philosophy, written in their art's terms (fire, the dagger, the step aside, standing your ground, the still mind).
- Each lesson's task is scaled to your rank:
  1. **Their way.** Defeat monsters the way they fight: with their weapon in your hands if their art is a weapon's (a dagger, a weapon in each hand, a shield on your arm, a two-handed weapon); otherwise any defeats. Iron rank asks 25.
  2. **Where they learned it.** Go to a named place in the wilds and meditate there: stand still for a few seconds.
  3. **The last teacher.** Face a named champion of your rank at a place in the wilds, and win.
- The places and champions are marked on your map in teal until they're done.

**The gifts.** Gear is rolled at your rank:

| Lesson | Gift |
|---|---|
| 1 | Uncommon trinket: you choose ring or amulet |
| 2 | Rare piece of armour |
| 3 | Epic gear: you choose weapon or armour |

**The gear fits the art:**

| Art | Gear |
|---|---|
| Element (e.g. fire) | Warding against the element, and "+N% fire damage" (5% / 8% / 12%). A gift weapon deals 30% of its damage as the element. |
| Dagger / crit | Crit chance and crit damage; a gift weapon is a dagger |
| Heavy weapon / guard / shield | Armour and block; the armour is heavy class (more armour) |
| Dodge / footwork | Dodge chance, light armour, and an effect when you dodge (see below) |
| Others | The art's own stats: stamina and its regen for a swing-thrift art, mana for a focus art, and so on |

**When you dodge.** A dodging art's gifts trigger on a dodge:
- the trinket restores 4% of your stamina;
- the armour and weapon strike back for 64% / 96% of your weapon's damage ("Riposte!").

**Names.** A gift is named for the master, e.g. "Yara's Ember River-silver Gauntlets of the Fox".

## The Magic Society's people

**All 12 from `new-assets\magic-society` are in.**
- Idle in 8 directions, running in 8 directions, and the south-only Death, which plays whatever way they face.
- Each sheet is anchored by its own `anchor_x` / `ground_y`.

**Recolours (clothing only):**
- Every damage type has a robe colour: 29 in all, the 28 types plus transcendent.
- A member's colour is the type they study.
- Skin, hair, belts, boots and staff wood keep their drawn colours.
- The grey and white hair and beards (the Archmage, the Elder Researcher, the Magister) are the same colours as the white robes. They are marked when packed so the dye leaves them alone.

**Each of the six halls:**
- The senior: the Archmage (ms_m70) and the Magister (ms_m60) take the halls in turn.
- A bureaucrat at the door: the Archivist, who offers the nine theories as before.
- A bureaucrat at the desk beside the door.
- Three or four researchers walking the ground in front.
- No two members of one hall wear the same colour.

**Talk.** Each one talks according to their post and their field:
- the Archmage on why adventurers must share what they learn;
- the Magister on registering with the Society;
- the desk on registrations;
- the researchers on their element.

**Officials in the wilds:**
- Out in the wilds, with nothing hunting you, a Society official is sometimes ahead of you on the road.
- **Most are fine:** they're out surveying, and they tell you where a martial master you haven't met stands (marked on your map).
- **About a third are under attack:** two to four monsters of the area's rank are on them, and "Someone is calling for help!" appears.
  - Kill the monsters while the official lives, and they pay you coin and also tell you of a master.
  - If the monsters stay on them for about 45 seconds, they die.
- Walk well away and the encounter ends.

## Role counts

The brief says six researchers and six bureaucrats. `society_index.json` lists seven researchers and five bureaucrats; the game follows the index.

## What was checked

**Here:**
- `test_round401` (29 checks) passes.
- `test_round400` (31), `test_round399` (20) and `test_round398` (41) pass, updated for 200 masters.
- `test_round328` passes.
- `test_syntax_all` passes (571 modules).
- `GAME_VERSION` reads 401.

**In the game:**
- **Masters:** 201 masters (193 in dojos, 8 in the story regions, the great master among the dojos), teaching 121 arts.
- **Cadence hall (screenshots):** the Archmage, the Archivist at the door, the Undersecretary at the desk and three researchers walking, each in a different colour. The Archivist offered the nine theories.
- **Officials:**
  - An Assessor under attack was surrounded by four monsters.
  - When the monsters stayed on him he fell, playing the Death.
  - A saved official paid coin and marked a master.
- **Lessons:**
  - A dagger master's three lessons ran end to end.
  - They gave an Uncommon amulet, a Rare armour piece and an Epic dagger "of the Fox" that strikes back on a dodge.

**Not checked:** your own build.
