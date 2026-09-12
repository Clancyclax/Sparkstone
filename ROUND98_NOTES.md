# Round 98 — A Town With People In It

> 1) Guns, technology, magitech and cyborg will have to wait. Backburner all of
> them until I ask again.
> 2) Lets make the cities feel a little more alive. NPCs walking through town,
> talking to each other. Entering homes. Doesn't need emergent behavior just a
> few loops. More color palette change ups for farmer and town NPCs.
> 2.1) Remember hair and skin color can be important visual differences.

Your four scope rulings: **everyone walks, named folk stay near their post**;
**all three loops plus a day/night rhythm**; **skin, hair and clothes all
recoloured**; **block essTechnology too**.

## The block

`essTechnology` joins `essGun` in `BLOCKED_ESSENCES`. This one **removes a
functioning essence** rather than holding back something incomplete, which is
written into the file plainly so nobody later reads it as a bug and quietly
unblocks it. It is also what Cyborg and Magitech are made of, so unblocking it
alone would re-open two confluences with nothing to render. It stays in
`ALL_ESSENCE_IDS`, so a save already carrying one still loads.

`test_round51_charters`' bolt share did not move (13.5%) — Technology is not a
bolt-heavy essence.

## The painter, and the three drafts that put a green face on somebody

Round 95 shipped a green face on the same model three tries running. This round
reproduced it three more times, each differently, and each was caught by
rendering a contact sheet and looking at it:

1. **By hue.** Skin is warm, so select warm pixels. Straw hats, tan tunics and
   brown leather are also warm — the mask marked the farmer's entire hat and the
   peasant's entire shirt as skin.
2. **By flood fill from the face.** Better, until the flood ran down the neck
   into the tunic on half the models (there is no dark outline between a chin
   and a collar on these sprites) and swallowed the garment again.
3. **By hue-clustering the face's own colours.** This is the one that produced
   green faces on five of six models, and the reason is the useful part: **a
   skin ramp crosses hue buckets.** A lit cheek is more yellow than a shadowed
   one, so clustering split every ramp in two and hue-rotated the half that fell
   in the neighbouring bucket as if it were clothing.

What works is boring and exact: **an authored face box per model**, read off the
sprite on a pixel grid, and the skin band is the set of colours that box
actually contains — as exact RGB values, never a range or a cluster. Nothing in
the skin or head band may be recoloured as clothing, even where the same value
also appears on a sleeve. That is bandits.js's own conclusion arrived at again:
author the per-model number, do not infer it.

Two more things the sheet caught after that:

- **A hat is not hair.** Same band, different pool — the farmer's straw brim and
  the posh girl's lace cap would otherwise come out chestnut or ash blonde.
- **A grey garment is still a garment.** Skipping every low-saturation ramp as
  line work left `npc_posh_noble_girl` in the same black-and-white dress in all
  eight variants. Outlines are grey, but so is half her wardrobe; they are told
  apart by **value**, since an outline is near-black.

Twelve models × eight variants = **96 faces**, baked at runtime. Value is
preserved exactly on every recolour, which is what keeps a repainted sprite
looking drawn rather than filled in.

## The loops

Four states and no more: **stand, walk, talk, inside**. The numbers live in
`townLife.js`; the wiring is in the scene.

**Three leashes, because your ruling has three consequences.** Named folk get 58
units — a quest marker hangs over their head and the point is not that the
marker breaks, it is that the player was told where somebody is and would then
have to chase them. Villagers get 104 around their board. The crowd gets 300.

**Conversations are pairs, not a bag of lines.** Two strangers trading
non-sequiturs is worse than silence, so the twelve exchanges are authored as
opener-and-answer, both halves of one are used together, and they turn to face
each other — which is the whole tell that it is a conversation rather than two
people who stopped in the same place. Nothing they say carries information: a
line that mattered would make eavesdropping compulsory.

**The day is a fraction, not a schedule.** A schedule would need every settlement
to say who lives where; a fraction needs one number per person — how much of a
morning person they are — derived from their name and therefore stable. **The
same people are the late ones every night**, which is the difference between a
rhythm and a flicker. Measured in the build: 14 out / 2 indoors at midday, 8 out
/ 8 indoors at one in the morning.

**The crowd is in neither `this.monsters` nor `this.npcs`.** Not in monsters for
round 90's reason (the AI reads `m.type` every pass). Not in npcs either, and
that part is new: `this.npcs` is what decides what "Press E" says, and forty
extra bodies with nothing to say would put the prompt on a stranger. The people
who *do* have something to say keep their place there and get a `life` attached
to what is already there.

## Four things only the screenshot could have found

Every one of these passed every assertion.

1. **A city crowd of ten, spread over a settlement two thousand units across, is
   one person per screen.** The midday shot of Cadence's plaza had a single
   townsperson in it while the census said 136. The spawn is `sqrt()`-weighted
   inward now and capped at `CROWD_SPREAD` — roughly one screen of the centre,
   because a plaza is where a town is a town.
2. **Then nobody went indoors at all**, because a plaza is a board and market
   stalls and the houses with real doors are further out than a strolling leash.
   The whole night half of the rhythm had quietly stopped, and the only thing
   that said so was a picture of a full square at one in the morning. A door trip
   is an exception to the leash now: going home is a longer journey than
   wandering about. They drift back on their own, since every ordinary waypoint
   is measured from home.
3. **A farmer standing inside the player's sprite.** Townsfolk were pathing on
   obstacles and water and nothing else, and the player is neither.
4. **A plaza half full of muscular swordsmen at one in the afternoon.** The
   models are shared with the rest of the game and half of them are adventurers.
   `CROWD_WEIGHT` makes a crowd mostly people who live there, with a few
   adventurers because a Society capital really does have some standing about.

And one the *build* found: with a single waypoint attempt, 130 of 136 townspeople
were standing still at any moment — a town square is mostly buildings, so most
random waypoints land in a wall and the walk was abandoned before it started. Six
tries now.

## A test that passed for the wrong reason, twice in one round

The first version of the palette check asked whether painted face-box pixels came
out warm. **It could not fail**: the LUT only ever maps a skin colour to a
`SKIN_TONES` entry and every one of those is warm by assertion. A tautology
dressed as a regression guard.

Replacing it, a `python`-side edit deleted the measuring loop entirely, so `seen`
was zero for every model and the check passed on an empty set — the check that
did fail (`every face box still holds a face`) is the only reason that was
noticed. Both are fixed: the assertion now measures **554,288 actual skin pixels
across 84 sheets**, and the failure it exists to catch — a box that misses the
face, so the face's colours fall into a cloth ramp and get hue-rotated — is
measured directly as how much of each box is governed by cloth. The worst is the
farmer at 15%, whose hat brim overhangs his face; a box excluding the brim was
tried and turned the whole underside of the brim flesh-coloured.

## Suites

- `tools/tests/test_round98.cjs` — **40/40** (new)
- `tools/data_checks.mjs` — **157/157** (was 135)
- Regressions green: 97 **34/34**, 96 **42/42**, 96 crafters **19/19**,
  95 **41/41**, 94 **48/48**, 90 **67/67**, 88 **28/28**, 80 saves **14/14**,
  79a **23/23**, 78c **14/14**, 73 **46/46**, 65 **40/40**, 64 **58/58**,
  41 **61/61**, rebuild **11/11**.

## Still open

- **The palette sheet is out for your correction** — twelve rows, eight columns,
  correctable by row name and column number.
- Guns, Technology, Magitech and Cyborg are backburnered at your word.
- The six political cases are still region-agnostic.
- A `case` abandoned rather than turned in leaves its witnesses standing; there
  is no abandon path in the game today.
- The second star's pay band is only 2x wide by your own table, so a two-star
  board reads tighter than a one- or three-star one.
- Townsfolk **stop** rather than steer when the player is in the way. Steering
  around somebody needs pathing, and you asked for loops.
