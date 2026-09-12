# Round 99 — The Society, the Crafters and the Auction House in Every City

> "Get adventure society and crafting buildings in the cities."
> …and, on what each city gets: **"Society Hall, Crafting Hall, Auction House."**

Taken on my recommendations for the rest, so you weren't held up: the **three
outer cities** (Harrowmoor, Karsk Landing, Vashra), **one ladder reportable at
any hall**, and **new named crafters sharing the trade voices**.

## What was wrong, measured

There was exactly **one Adventure Society guild hall in the world** and it was
in Cadence. Three systems were stranded behind that one door:

- **The rank ladder** — five ranks, fifteen contracts, forty-eight steps — is
  reported to the Guildmaster and the guild clerk. A player in Acts 2, 3 or 4
  had to walk back to The Nek to advance a star.
- **The member's discount**, which is the reward a first-star contract offers
  most often, is honoured at `SOCIETY_SHOP_ID` and nowhere else. Outside The Nek
  it was a bonus you could earn and never spend.
- **Round 96's withheld credit** — the Society declining to extend credit to an
  adventurer whose judgement it does not trust — was observable only in Act 1.

The crafters were the same story: all three benches, and the 72 authored
confluence lines round 95.2 wrote for them, were in two Cadence interiors.

## Nine clones, not nine new rooms

The three interiors this needed already existed and were already the right
shape — the smithy holds the blacksmith and armoursmith benches and a weapon
counter; the auction house holds the auctioneer, a ledger clerk and the
jewelcrafter; the guild hall holds the Society clerk and a ranking adventurer.
That is exactly the Society Hall / Crafting Hall / Auction House you named.

So the geometry, floors, 26 props and door spans are **cloned from Cadence's**
and only the address and the staff change. Nine hand-laid rooms would be nine
chances to put a prop inside a wall, and these layouts are the ones round 50's
doorstep fixes were measured against.

Staff positions are read off the **template's own NPC list by role** rather than
re-typed: Hessa stands at the anvil and Bram behind the east-wall desk because
those tiles were chosen against those props. A new set of coordinates would be a
new set of chances to stand somebody inside a forge.

**Twenty-seven new named people**, each with their own line — Harrowmoor runs on
tides and ledgers, Karsk Landing is the last place with walls, Vashra is a
court. What is *not* duplicated is the confluence insight: `crafterTalk.js` is
keyed on the **trade**, so a Karsk armoursmith gives the armoursmith's reading of
your confluence on the day she opens, with no new authoring at all. That is the
whole reason round 95.2 keyed it that way, collected two rounds later.

## The hall master, which is the difference between a branch and a desk

`_societyLines` refuses a contract whose `giver` is not the person you are
talking to, and **everything above the first star is Yorin's** — who stands in
Cadence. Cloning the clerk alone would have given three cities a hall you could
register at and nothing else: the stranding moved rather than ended.

So each hall has a **hall master** — Tidewarden Osk, Ashwalker Genn, Goldwarden
Iselle — who answers for the same tier Yorin does. `who` is a **role, not a
person**, and reading it off the NPC rather than off his name is the whole
change. The deflection lines now name whoever is actually in the room, since
"Petra handles the first star" is unhelpful three regions from Petra.

## The bug that only a per-city check would have caught

**Two functions build settlements.** `_buildOutlineStyleSettlement` handles the
two that carry `plan: 'outline'` (Harrowmoor, Karsk Landing) and
`_buildSettlement` handles everybody else — **which includes Vashra**. The first
draft taught only the first about civic halls, and the probe came back with six
of nine halls standing and three with **no building and no door: Bratugal's
entire set, silently**, with every table check passing.

So every assertion in the suite is made **per city**, never in total — a total
is satisfied by three halls in one town, which is the exact shape the bug had.

## What is on the ground

One new building per city. The crafting hall and the auction house were already
standing — they are the `blacksmith` and `auction` services the settlement
builders have always placed — they simply had no interior, and their staff stood
in the street. Those keepers have moved indoors, which is what Cadence does and
what round 78's rule requires: two vendors of the same goods in one place is a
choice the player cannot make.

The Society hall uses the columned `greek_native` building from the pool, which
is the same art Cadence's `_buildGuildHall` reaches for and for the same reason —
`TOWN_SINGLETON_ROWS` has no guild row. Measured after: **no two civic buildings
in any city overlap.**

*A note on the exterior screenshots:* the ground reads black around the halls.
That is my probe, not the world — it teleports the player rather than walking
them, which skips whatever refreshes the drawn ground. Checked directly: tile
data is present at all three city centres (49 of 49 tiles, all paving). The
interior shots are of a player who actually walked through the door.

## A suite moved, and it was mine

`test_round90` asserted there were exactly **three** crafters, which was true for
nine rounds because all three stood in Cadence. There are twelve at nine benches
now. Rewritten against what it was actually claiming — that every trade it built
is staffed — so it no longer fails the moment a city is added.

## Suites

- `tools/tests/test_round99.cjs` — **44/44** (new)
- `tools/data_checks.mjs` — **173/173** (was 157)
- Regressions green: 98 **41/41**, 97 **34/34**, 96 **43/43**, 96 crafters
  **19/19**, 90 **68/68**, 88 **28/28**, 78c **14/14**, 73 **46/46**,
  65 **40/40**, 64 **58/58**, 41 **61/61**, rebuild **18/18**.

## Still open

- **Acts 3 and 4 have no story.** `DIVISION_STAGES` is eleven: seven in The Nek,
  four in Ontaria, none in Elehyd or Bratugal. This round fixed the *services*
  gap in those acts; the *narrative* gap is untouched and is now the largest
  open item in the game.
- **Coldharrow, Gravemarch, Stiltrow and Thornwick have no authored folk.**
  Ontaria's two villages each got three named people; the four hamlets in Acts 3
  and 4 are entirely generic.
- `village` is missing from round 98's `CROWD` table, so Sailmend and Cobb Point
  get the hamlet count of 4 rather than a town's 8. One line.
- Little Gale (the one town) has a blacksmith and a tavern and no hall. If you
  want the ladder reachable there too, it is one entry in `CIVIC_CITIES`.
- Guns, Technology, Magitech and Cyborg remain backburnered at your word.
