# Round 127 — the cycle, and the soul garden

> "The player seems to only gain XP when meditating. They should be gaining XP
> with kills but abilities can't rank up and the player can't rank up without
> meditating. … the concept is that meditation is the key to consolidating your
> gains."

---

## Why it felt that way

One multiplier. `_startMeditation` read `pendingXp * 0.20` — **four fifths of
every kill in the game was deleted at that line**, silently, with no account of
it anywhere. So the only visible relationship between playing and progressing
was a number that appeared when you sat down, and it was a fifth of what you had
actually done.

Two more things compounded it:

- **Quests paid no experience at all.** A contract turn-in granted coins and
  nothing else, so half the loop the brief describes did not feed the other half
   — and the fastest route to Bronze was to ignore the board entirely.
- **Nothing showed the pool filling.** The essence bars drew committed progress
  only. There was no way to see that fighting had earned anything.

## The fix

**Meditation consolidates. It does not tax.** The whole pool converts now.
`MEDITATE_BANK_RATE` is a named constant living beside `XP_PER_ESSENCE_LEVEL` in
`essenceRank.js`, because the two only mean anything as a pair — and the pair is
why the game is *exactly as fast as it was*: the level cost went 45 → 225 in the
same commit, so round 126's measured pacing is untouched.

```
raw combat XP per essence level    900   (unchanged)
iron -> bronze                   9,000   (unchanged)
bronze -> silver                18,000   (unchanged)
silver -> gold                  54,000   (unchanged)
```

The data lane asserts the product, so neither half can be retuned alone.

**Quests feed the same pool.** A turn-in now pays experience alongside coin,
priced off the posting's own reward (already graded by rank and star) and going
into `pendingXp` — so meditation still owns the commit. A contract cannot rank
you up without sitting down.

**The bars show it filling.** A pale ghost segment runs ahead of the solid fill:
solid is what is committed, ghost is what fighting has earned and not yet
consolidated. The card also says `+N unbanked · 1 level waiting`, so the decision
the cycle turns on — *is it worth sitting down yet?* — can be read instead of
guessed. A sealed slot draws no ghost, because its share is held rather than
spent and a bar that promised otherwise would be lying about what a meditation
will do.

### The cycle, measured in the running game

```
start      iron 0   solid   0%   ghost   0%
10 kills   iron 0   solid   0%   ghost  32%   73 unbanked
38 kills   iron 0   solid   0%   ghost 100%   1 level waiting
meditate   iron 1   solid  22%   ghost   0%
```

Committed progress does not move until the sitting. The spillover is kept. A
2% sitting still banks its stored-up bit — no minimum, no penalty.

---

## The soul garden

> "we add a small window above the players head during meditation that shows this
> flower garden for their own essences and has a little particle effect that
> trickles slowly into them as their banked experience is used to water the three
> essences."

A window opens over the player's head while they sit, with a bed for each
essence in that essence's own colour, and motes trickling down into them while
the banked experience is spent. The trickle is **finite** — it pours what the
sitting actually consolidated and then stops, because it is the experience going
somewhere, not an idle animation over an empty bed.

**Four beds, not three.** The brief says "3 flower beds" and then names four
colours — blood red, black, orange-and-blue, severe white. Those are Jason's
three essences *plus Doom, the confluence they form*. This game's player has
exactly that shape, so drawing three would have left the confluence — the slot
the whole awakening-stone architecture builds toward — as the one part of the
soul with nothing growing in it.

### Growth

| standing | bed |
|---|---|
| Iron 0 | a bare planter |
| Iron 1 | one planter, one stalk |
| Iron 9 | a full row of 9 plants |
| Bronze 1 | a planted row in tilled soil |
| Bronze 9 | a field of 9 rows |
| Silver 1 → 9 | one set of 9 rows → nine sets |
| Gold | forest and flowers, with meandering paths |

The stages are a **table** (`src/data/soulGarden.js`), not a switch in a draw
call, because the growth is a promise about a character's whole progression and
a table can be checked. The data lane walks every rank and level through it and
asserts the garden never shrinks — within a rank or across a boundary.

**Drawn, not sprited.** Four beds of up to nine stalks, redrawn each frame at a
size that changes with rank, takes the player's own essence colours without a
single baked texture. The motes are drawn into the same Graphics rather than
emitted — a Phaser emitter would be a second object to own and would count
against the twelve-emitter cap shared with combat.

### Two things the screenshots caught

1. **Nine rows stacked into nine columns.** Every row put its stalks at the same
   x, so Bronze 9 came out a solid block and Gold a picket fence. Alternate rows
   are offset by half a column now — the same reason real planting is staggered
   — and stalk height divides down by the row count so nine rows fit in forty
   pixels.
2. **The caption sat over the world** and was unreadable against a stone floor.
   It is inside the window now, on its own dark ground.

**Round 128 takes over at Silver.** *"silver 1 being a transition to a soul space
where you now have a seperate map to explore"* is a map, not a panel, and the
summons wandering it with dialogue about the astral are a system of their own.
The stages carry Silver and Gold so the window never goes blank for a player who
reaches them first; the explorable soul space is its own round.

---

## Also

- **Four fixtures were pinning `into` as a raw XP count** (`34` of an iron
  level's 45). Multiplying the level cost by five made the same literal read as
  15% and failed three correct checks. They express a fraction now, which
  survives any retune.
- **`test_round44`'s boot wait passed its timeout as the wrong Playwright
  argument** — `waitForFunction(fn, arg, options)`, so `{timeout: 240000}` was
  being handed to the page function and the wait ran on the 30-second default.
  It has always been one loaded machine away from a spurious failure, and it
  failed that way during this round's sweep. It sets the page default now.

---

## Lanes

- `tools/run_data.sh` — **417/417** (was 403; +14 for the pair and the garden)
- `tools/run_one.sh test_round127_cycle` — **19/19** (new; plays the cycle and
  draws every stage the brief names)
- `test_round126_progression` 18/18 · `test_round47` 39/39 · `test_round74`
  73/74 (`javelin`, pre-existing) · `test_round44` 75/75 · `test_round49_team`
  26/26 · `test_round125_chain` 32/32 · `test_round88` 28/28 · `test_round73`
  47/47

Version stamp: **127**.
