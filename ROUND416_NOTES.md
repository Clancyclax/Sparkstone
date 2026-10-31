# Round 416

This round finishes your city review: items 8.1, 8.2, 8.4, 8.5 and 9, in the five grid cities (Harrowmoor, Karsk Landing, Vashra, Tolbrand Quay and Slagward). It also fixes the corner layering from your last look. Cadence only gets the corner fix.

## The corners

**Your rule, now applied:**
- **Top:** behind both walls.
- **Right and left:** in front of the upper wall section, behind the lower one.
- **Bottom:** in front of both, as before.

**Why one fixed setting didn't work.** The game re-sorts each wall section's draw order every frame, based on where you stand along it. A tower given one setting at build time would end up in front of or behind its walls depending on where you were.

**How it works now.** The towers near you are re-sorted every frame, right after the walls. Where the two walls' orders cross, the few wall stones next to the tower are lifted so the tower can sit between them.

## The market square (item 8.2)

Every grid city's market square is now a grid of stalls, six tiles apart with aisles between. The middle is left open for the crier's podium.

| City | Stalls |
|---|---|
| Harrowmoor | 23 |
| Karsk Landing | 24 |
| Vashra | 24 |
| Tolbrand Quay | 24 |
| Slagward | 19 |

**What the stalls sell, in every city:**
- **Food:** rations, the stranger's food, fruit drinks and fish.
- **Books:** skill books.
- **Weapons:** new. Rack weapons and found-quality weapons, priced like the smith's and scaled to your rank.
- **Armour:** new. Armour pieces from the smith's rarity range for your rank.
- **The rest:** potions and monster parts.

Each stall has its stallholder behind it. The old single row of stalls through each square is gone, so there aren't two markets.

## Props (item 8.1)

| Where | What |
|---|---|
| Plaza | The same set Cadence's square has: flagpoles, banner poles, the bell post, the weather vane, the notice board, the wanted pillar, the knight statue, the stocks, a guard post, six benches, two flower beds and chain bollards. |
| Market | The crier's podium, flower carts, bunting, sandwich boards, a notice board and a water trough. |
| Kerbs | Planters, benches, young trees in planters, rain barrels, topiaries, hitching rails, troughs and boards, at least five tiles apart. About 230–260 in each big city, 61 in Tolbrand Quay and 35 in Slagward. |
| Gates | A guard post, a flag, a signpost just inside and a milestone on the road outside. |
| Temples, Society halls and auction houses | A flag either side of the door. The Society hall also gets its standard. |
| Estates | Birdbaths, flower beds, rose trellises and topiaries. |

## Slums and dive taverns (item 8.5)

**Where:** every city has a slum of two blocks (the small cities) or three (the big ones). It starts at the dense quarter farthest from the plaza, back against the wall, and takes in the nearest housing blocks.

**What's there:** firewood, barrels, buckets and brooms, hay and clotheslines on every free patch. Laundry is strung between the houses and wanted posters hang on the walls.

**The dives:** two in every city, ten in all.

| City | Dives |
|---|---|
| Harrowmoor | The Crooked Lantern, The Drowned Rat |
| Karsk Landing | The Last Copper, The Gutter Crown |
| Vashra | The Rusty Hook, The Knife and Candle |
| Tolbrand Quay | The Black Tallow, The Bent Nail |
| Slagward | The Cutpurse Arms, The Sour Barrel |

**Inside a dive:**
- **Out front:** a menu board by the door and a dice table on the step.
- **The keeper:** sells drinks.
- **Sallow Pim, the fence:** in the corner. He sells stolen gear and a found weapon at 20% off.
- **Patrons:** bandits, cutthroats, a pirate, cultists and down-on-their-luck adventurers, each with a line of their own. A dive keeps the Tavern's hours but never has fewer than five people in it. At 21:00 one dive in each city held the keeper, the fence and 12 patrons.

## People (item 8.4)

**Walkers in every district.** Each walker has a home and wanders a few tiles around it:

| District | Who |
|---|---|
| Housing | Townsfolk and labourers |
| Market | Shoppers and porters, mostly in the square |
| Temple | Priests and pilgrims |
| Estates | Nobles and stewards |
| Slum | Cutpurses, beggars and hired knives |

They're out by day. Late at night, most go in; the slum folk stay out. Each district has its own lines when you talk to them.

| City | Walkers | Adventurers on the move |
|---|---|---|
| Harrowmoor | 300 | 16 (2 alone, 5 teams) |
| Karsk Landing | 333 | 14 (3 alone, 4 teams) |
| Vashra | 336 | 16 (2 alone, 5 teams) |
| Tolbrand Quay | 135 | 7 (2 alone, 2 teams) |
| Slagward | 82 | 7 (2 alone, 2 teams) |

**Adventurers, alone or in teams of 2–4:**
- **Gear-seekers** come in at one gate, walk the streets to the market, and stop in an aisle by the weapon and armour stalls. Then they go out another gate to the road beyond.
- **Hunters** cross the city by the plaza and wait out on the road past the far gate. Then they come back.
- They walk the ring road and the avenues and go round the plaza, never through the fountain.
- Teams walk in formation, and each adventurer has a rank, a name and a line about what they're after.

**Cost.** People are drawn only near you, so a city full of them costs only the screen you're on.

## Wagons (item 9)

Every grid city has wagons on a loop: in off the road, through one gate, along the streets through the city, out another gate and on along the next road, then back the same way. Three in each big city and two in each small one. They're the same rune-driven wagons as Cadence's road wagons, with no horses.

## Your city review sheets were missing their props

The script that took your City-Review screenshots (rounds 412 to 415) passed the wrong values to the step that draws the street props. As a result, no stall, bench, sign or other street prop appeared in any of those shots, Cadence's included. The game itself was fine; only the screenshots were wrong. The script is fixed (`tools/city_review/shoot_cities.cjs`), and the round 416 pictures show the props.

## What was checked

**Here:**
- `test_round416` passes.
- `test_round415`, `test_round414`, `test_round413` and `test_syntax_all` pass.
- The old suites' version checks now accept 416.

**In the game (headless browser):**
- The counts above, from the running game. The game loaded and every city's set of pictures was taken with no page errors.
- Close-ups of every corner in every grid city, of each city's market, slum, dive front and walkers, and of an adventurer party: `r416_check.jpg`.
- One dive in every city entered at 21:00: the keeper, the fence and 12 patrons in each. Slagward's small dive first came up with nobody but the keeper and the fence; that is fixed and was checked again.
- The weapon, armour and fence counters stock: six weapons; six armour pieces; three gear pieces and a weapon.
- The wagon routes, each from the road outside one gate, through the city and out along the next road (one way): Harrowmoor about 490 tiles, Karsk Landing 810, Vashra 1,370–1,550, Tolbrand Quay 650 and Slagward 600.

**Not checked:**
- A picture inside a dive. The headless view of an interior came out black, so only the head count was checked.
- A moving wagon in a picture. The wagon art loads the first time one is near you, and the pictures were taken before it finished.
- A full reshoot of the City-Review sheets.
- Your own build.
