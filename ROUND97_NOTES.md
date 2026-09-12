# Round 97 — What a Contract Pays

The user's two clauses:

> 1) Payouts should be gated by rank and stars. I.e. 1 star iron rank contracts
> are going to pay 500 normal rank coins to 50 iron rank coins. 2 star iron rank
> is 50 iron rank coins to 100 iron rank coins. 3 star iron rank is 1 bronze rank
> coin to 10 bronze rank coins.
> 2) bonuses can be extra money alongside previously stated bonuses.

And, mid-round, a third that turned out to be the more interesting one:

> There should be very few normal rank contracts. Normal rank is basically the
> slimes in the initial sewers and a few just outside town. In the book you only
> see normal rank monsters in the first 30 pages and then never again through the
> next 13 books.

## What was wrong, in both directions

`questPayout` priced a notice off the **quarry's xp** and `applyBountyFloor`
clamped the result to five iron. Both halves failed the same way.

- **The floor swallowed the bottom.** The smallest number the formula could
  produce was 14 normal coins and the largest a Normal- or Iron-rank posting
  could reach was a few hundred, so the clamp fired on nearly all of them. Half
  a 25-row board advertised **the identical number**. Flagged in the round 94, 95
  and 96 notes and carried each time.
- **The ceiling never arrived.** Run the same formula at the top of the ladder —
  a gold-tier quarry at ~400xp, tier 4, the relic multiplier — and it pays about
  **69 iron**. A gold-rank contract paid two thirds of a bronze coin. Five ranks
  of progression the purse could not see.

Both are one mistake: the payout came from the monster instead of from the
**grade**. The Society is not buying a corpse, it is buying work it has graded.

## The band

The user's numbers are all iron-rank, so the table is written in the unit they
were stated in — coins **of the contract's own rank** — and the rank picks the
denomination. Their iron row reads back exactly:

| | 1 ★ | 2 ★ | 3 ★ |
|---|---|---|---|
| iron | 5–50 iron (5 iron **is** 500 normal) | 50–100 iron | 100–1000 iron (**is** 1–10 bronze) |

The bands are **contiguous**: a one-star tops out exactly where a two-star
starts, so a player reading down the board can see what a star is worth rather
than being told. Rounded to a whole coin of the contract's own rank, because a
silver contract paying 47 silver 32 bronze 6 iron 41 normal is arithmetically
fine and unreadable — and because that is what lands the floor on the user's own
figure, 500 normal, exactly.

The star pays twice, deliberately: `contractTierFor` already lifts a three-star
posting's tier, and therefore its rank, and therefore its denomination — and the
band lifts it again inside that rank. Five rows of twenty-five are three-star,
and they are the only work on the board that can be got wrong while being
finished.

The old effort formula is demoted to choosing **where inside the band** a
posting falls, which is what keeps a survey cheaper than a relic without letting
either escape its rank.

## Three drafts of the position weight, each caught by looking

This is the part that took the round. The rule is `CONTRACT_PAY_SHARES` — four
axes with stated shares that sum to one — and it arrived by being wrong twice.

1. **Absolute effort per kind.** The first star can only post `plague` (0.50) and
   `defend` (0.46), so every one-star row landed between 12 and 27 iron inside a
   band running 5 to 50. **Four fifths of the band unused** — the same
   reads-as-one-price fault, by a subtler route.
2. **Normalised within the star, at full range.** Fixed the span, broke the
   middle: `defend` pinned to 5–8 iron and `plague` to 32–50. A board with a hole
   in it and one kind that reads as worthless.
3. **Shares, with a degenerate axis pinned at its midpoint.** Better, and still
   wrong at the bottom. A real board:

   ```
   *  iron rank   9i  defend  Paid To Watch the Cutter
   *  iron rank  11i  defend  Let Them Finish: the Quarryman
   *  iron rank   9i  defend  Work Uninterrupted: the Digger
   ```

   A `defend` names no quarry (it is waves, not a species) and its count is fixed
   at `DEFEND_NODES`, so two of four axes sat at 0.5 and the third at 0 — leaving
   one fifteenth of the band to tell six rows apart. **Six postings, three
   prices.** The fault this round exists to fix, surviving inside the fix for it.

The rule that settled it: **an axis with nothing to say hands its share to the
roll** rather than contributing its midpoint. The shares still sum to one, so the
extremes of the user's band stay reachable.

All three were found by reading a rendered board, not by an assertion. That is
the third time in four rounds.

## Very few normal rank contracts

The user's lore note caught something the payout work only made visible: Milrow
was posting **7 normal-rank contracts of 25** and Fenn Cross **11**. A board is
graded off its region's threat bands, The Nek holds bands 0 and 1, and a fair
roll between them makes half of every starting board normal rank — a world where
normal-rank monsters are a standing profession rather than the first thirty
pages.

Two drafts, both wrong, both *silently*:

- **"8% of tier-0 rolls survive."** Tier 0 has to be rolled first and then
  survive, so two small odds multiplied into none: **325 rows, zero of them
  normal rank** — while the fault check, which asked the helper whether it kept
  8% of the rolls it was handed, passed. An assertion about a table is not an
  assertion about the build, again.
- **"Two planned rows may keep tier 0."** A permitted row still had to roll tier
  0 out of its region's bands, which in The Nek is a coin toss. Thirteen boards
  carried four between them.

And the board that produced could not be used: **a fresh Normal-rank adventurer
standing alone at Cadence's board could accept nothing on it.** The star gate is
absolute and the rank gate wants a team, so a board with no normal-rank work is a
wall for exactly the player the first star is for.

So it is a **plan, not a probability**, the way `CONTRACT_STAR_MIX` is: every
board standing in a region that actually holds tier-0 threats carries
`CONTRACT_NORMAL_ROWS` (2) of them, graded rather than permitted, and everything
else that rolls tier 0 is lifted to iron. Measured after: **6 of 325 rows (1.8%),
on 3 of 13 boards — Cadence, Milrow, Fenn Cross — and 2 of them takeable solo at
Cadence.** Harrowmoor's bands start at 2 and it posts none, which is right: the
slimes are outside Cadence, not outside Harrowmoor.

## Bonuses are money too

"Alongside" is a correction to a thing round 94 already half-did. It paid a coin
half on top of the substance and **never printed it**, so a reward the player
could not know about could not be worked toward — the exact fault the bonus
description exists to avoid, committed one line below the description. The row
states it now, and it is banded by star (0.5 / 0.6 / 0.75 of the contract)
rather than one flat half of everything, because a flat half would have made the
three-star judgement bonus worth twenty times the one-star hazard bonus by
accident. Nobody chose that ratio; these are chosen.

## One writer, and twelve dead lines removed

Every posting in the game — a board's twenty-five, a god's chapter, the Society
ladder's own, a villager's request — is built by `_makeOfferRaw`, whose twelve
branches each set their own `reward`. Those twelve lines are **gone** rather than
left computing a number nobody reads, and `_makeOffer` is now a wrapper that
prices once at the single exit.

A wrapper rather than twelve edits, and the reason is a scar: rounds 95 and 96
each shipped a bug caused by a one-line replace landing on the wrong one of
several near-identical occurrences. Twelve `reward:` lines in one function is
that hazard exactly.

`applyBountyFloor`, `BOUNTY_MIN_COINS`, `questPayout`, `CONTRACT_BONUS_PAY_MULT`
and `CASE_PAY_MULT` are no longer imported by `WorldScene.js`. `CASE_PAY_MULT`
stays declared in cases.js with its reasoning rewritten: round 96 expressed
"political work pays more than ordinary work" as a multiplier on one branch, and
with pricing out of the branches it had to be said in `CONTRACT_EFFORT` instead
or it was not said at all. `case` sits at the top of that table now, above
`relic`, and `contractFaults` asserts nothing is priced at or above it.

## The one consequence to know about

**The top of the ladder mints diamond coins.** A gold three-star pays 100–1000
gold, the purse cascades at 100:1, so 100 gold is 1 diamond. Put to the user and
ruled on: *let it mint diamond coins* — the denomination has existed in the purse
since round 11 and is lore-accurate, and no diamond-rank monster, contract, or
piece of gear is added. The standing no-diamond-content rule is intact.

## A suite moved, and it was mine

`test_round73` section 9 asserted the five-iron floor — the rule this round
deliberately replaces. Rewritten against the rule that replaced it:
`applyBountyFloor` and `BOUNTY_MIN_COINS` still exist in quests.js and still
behave exactly as round 73 built them, so the first two checks still check what
they always checked; what changed is that the game no longer routes a contract
through them. The legacy-save check now asserts a pre-94 notice is **graded**
rather than clamped — an errand for a villager is not worth five iron, which is
the whole of what this round changed.

## Suites

- `tools/tests/test_round97.cjs` — **34/34** (new)
- `tools/data_checks.mjs` — **135/135**
- Regressions green: 96 **40/40**, 96 crafters **19/19**, 95 **41/41**,
  94 **48/48**, 73 **46/46**, 65 **40/40**, 64 **58/58**, 55 **38/38**,
  51 charters **24/24**, 49 stats **34/34**, 41 **61/61**, 90 **67/67**,
  rebuild **11/11**.

One test failed for the wrong reason and was caught: the turn-in probe built a
`hunt` in state `active`, and `_questDone` requires `ready` for a hunt, so the
payout returned early and the purse gained nothing — which read as a payout bug
rather than a test bug.

## Still open

- **The Gun essence, and the Cyborg and Magitech confluences**, blocked until a
  spread of firearms exists — modern and science-fictional, with icons, hand
  poses and projectiles. This is the largest open item.
- The six cases are **region-agnostic**: the Almsgate is described as being on
  the Almsgate, not in whichever town the board stands in.
- A case **abandoned** rather than turned in leaves its witnesses standing. There
  is no abandon path in the game today, so nothing can reach it.
- The **second star's band is only 2x wide** (50–100 iron), by the user's own
  table, so a two-star board reads tighter than a one- or three-star one. Left as
  stated; worth widening to 40–120 if it reads flat in play.
