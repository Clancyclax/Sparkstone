# Round 400

## Martial mastery

**A skill book makes you an Initiate of its art.** The Deepening Rite still raises the art with your rank. On top of that, two roads now drive it deeper at each rank.

**Practice.** Every monster you defeat while following the art counts toward its current rank:

| Defeats at this rank | Title | Bonus to the art |
|---|---|---|
| 100 | Journeyman | +25% |
| 500 | Adept | +50% |
| 1,000 | Expert | +100% |
| 2,000 | Master | +200% |

Your title names the rank, e.g. "Iron Journeyman" or "Silver Master". A new rank starts a new count.

**Training with a master.** A master of your own art sets training for your current rank. Finish it and the art's bonus doubles at that rank, making you a "<Rank> Expert". The training gets harder each rank:

| Rank | What the master asks |
|---|---|
| Normal | Defeat 25 monsters while following the style |
| Iron | 60 defeats, and slay 12 of one kind of monster |
| Bronze | 150 defeats, 20 of one kind, and a journey to another region to meditate at a named place in its wilds |
| Silver | 250 defeats, 25 of one kind, journeys to two regions, and slay a named champion waiting in the wilds |
| Gold | 400 defeats, 30 of one kind, journeys to three regions, and two champions in the deep wilds |

- **Meditating:** stand still at the place for a few seconds.
- **Champions:** a champion appears when you come near its place.
- **Map:** the places and champions are marked on your map until you've done them.

**The two roads don't stack.** The bonus is the better of the two: a trained Iron Journeyman is an Iron Expert (+100%), and 2,000 defeats still takes you to Master (+200%). Your character sheet shows your title, your count toward the next step, and whether you've trained.

**No Diamond.** There is no Diamond rank in mastery; it's only a coin.

## Where the masters are

**Never in cities.** There are 16 masters a run (up from 12):
- four in hamlets and villages;
- four in the wilds of the seven regions;
- four in their deep wilds;
- four in lone dojos out in the world map's own squares, on both continents.

They are different each run.

**Masters in the world map's squares.** A dojo master appears when you enter their square: the hall stands well away from the square's towns and roads, with the master at its door. Known dojos show as diamonds on the world map (gold for your style's great master).

**Your style's great master.** Once you follow an art, a great master of it exists somewhere in the run.
- **Where:** they stand in iron country most often and gold country least often. A gold great master is always in the south.
- **Word of them:** now and then, on a quiet day, a Society runner finds you and tells you where they are, and the place goes on your map.

**Masters lead to each other.** Any master you talk to tells you of another master, and that master goes on your map too.

## New buildings

**All 15 drawings from `new-assets\structures` are in.** Nothing from `_scrap` is used.

**Scale, as you asked:**
- Inns and Magic Society halls are drawn at the Adventure Society hall's scale.
- Dojo halls are drawn at a house's scale.
- Each keeps its own drawn size; nothing is rescaled to a common size.
- Each stands on its file's `anchor_bottom_centre`.

**Collision.** Each building is solid over its footprint rectangle, measured from its drawing the same way as the town buildings, never a circle.

**Doors.** The door side (the bottom-right face) is kept clear: the keeper stands a tile and a half out from it, and trees and rocks are cleared from the footprint and the ground in front of it.

**Inns.** There are 25 inns along the roads of the seven regions, kept well away from the towns, the roads and each other. The model fits the setting:

| Inn | Where | Placed |
|---|---|---|
| Harbour | on the coast | 1 |
| Watermill | beside a river (not a lava one) | 1 |
| Crossroads | where two roads meet | 1 |
| Caravanserai | in desert | 5 |
| Mountain lodge | in mountains and snow | 5 |
| Swamp stilt | in the swamps | 1 |
| Treehouse | in forest | 3 |
| Hillside | in open grassland | 8 |

About half of the world map's squares also get one by their road, chosen by the square's own ground.

Each works exactly like the town inns: a VACANCY sign, a room for the night, an Innkeep at the door who also sells. Each has a name, e.g. "The Round Window (The Nek)" or "The Camel's Rest (Elehyd)".

**Magic Society halls.** A grand hall stands in each major city where one fits, never in a bandit-held city. Six were placed:

| City | Hall |
|---|---|
| Cadence | Rotunda |
| Harrowmoor | Spires |
| Karsk Landing | Observatory |
| Vashra | Rotunda |
| Tolbrand Quay | Spires |
| Slagward | Observatory |

The Society's archivist at the door explains what the Society is and offers the nine magical theories.

**Dojo halls.** Every master has a hall of their own, cycling the four hall drawings:
- **In the regions:** the hall stands off the roads near the master's place. Hamlet masters' halls are out past the houses.
- **In the world map's squares:** the hall is raised when you arrive.
- **The master:** stands at the hall's door.

## What was checked

**Here:**
- `test_round400` (31 checks), `test_round399` (20) and `test_round398` (41) pass.
- `test_syntax_all` passes (567 modules).
- `GAME_VERSION` reads 400.

**In the game:**
- **Mastery:** 100 defeats made an Iron Journeyman and the art 25% stronger. Finishing an Iron course made an Iron Expert.
- **Training:** the Silver course read as above, from a great master.
- **The Society runner:** brought word of the great master and marked it.
- **Dojo square:** entering a great master's square raised the hall with the master at its door.
- **World map:** showed the known dojos.
- **Buildings (screenshots):**
  - a hillside inn in The Nek, a caravanserai and a mountain lodge in Elehyd, and a watermill on a river in Ixcuatl, each with its sign and Innkeep;
  - the Magic Society rotunda in Cadence with its archivist;
  - a dojo hall in the forest with its master.
- **Collision:** at each one, the centre was solid and the door point was walkable.

**Not checked:** your own build.

## For you to look at

- **Behind-road overlap:** a tall building's roof can still overlap a road that runs well behind it (the mountain lodge in Elehyd). That's normal depth sorting, but the inns can be kept further back if you'd rather.
- **One master without a hall:** if a master's place has no clear ground for a hall nearby, they stand in the open. In the last check every master had a hall.
