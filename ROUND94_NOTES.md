# Round 94 — The Adventure Society Board

The user's items 1.1–1.5, plus 1.6 delivered as a review sheet rather than as code.
Scope was ruled by the user: **"The board and the 1★ tier, complete."** The 2★ and
3★ tiers list, gate and pay this round; their authored content is rounds 95 and 96.

## What shipped

**`src/data/contracts.js` (new).** The board's rules, separate from quests.js because
quests.js knows how to *post* a notice and has never had an opinion about who may
*take* one. Holds the 25-contract board size, the star mix (12/8/5), the tier→rank
ladder, the two gates, the bonus conditions and reward pools, the defence contract's
numbers, and 30-odd faults asserting each clause of the specification.

**1.1 — the rename.** The panel is *Adventure Society Board*; the lists are
*Contracts* and *Your Contracts*; the proximity prompt reads "Press E to read the
Adventure Society board". Element **ids** were deliberately left alone — six suites
and four render paths name them, and renaming an id is a rename of the wiring, not
of the words a player reads.

**1.2 — twenty-five, graded.** Every board in the world (13 of them) posts 25, and
every board posts the same spread of stars, because the *composition* is fixed and
only the *order* is seeded. Each row's headline carries star pips and the rank word
("★☆☆ Trouble At the Herd — Normal rank").

**A contract's rank is its tier's rank, and the star raises both together.** The
tempting version — roll a rank label for flavour, leave the quarry where the region
put it — is a lie the player catches in one fight. So the star raises the contract's
*tier*, before the quarry is drawn, and the label is read off the tier it got. A
3★ posting in a tier-1 region names a tier-3 creature, is graded at that creature's
rank, and stands in that creature's ring. **test_round41 caught the first draft of
this**, which raised the tier *after* the pool was picked: "bounty rank always
matches the quarry — 3 mismatched of 8 hunts."

**1.3 — the two gates.** Above your star: shown, refused, always. One rank above:
refused alone, accepted with a team (`_hasTeam`, round 44's — one recruited
companion). Two ranks above: refused either way. Both gates *show* the row, because
a contract you cannot take is the clearest statement the board can make about what
you are working toward. The accept **function** refuses as well as the button — the
round-76 lesson that a guard living only in the render is one refactor from gone.

**1.4.1 — the first tier, complete.**
- `plague` — a named quarry taking stock and people near a named town. Bonus
  ("Hazard pay"): something else attacks you while the quarry is still standing.
  Measured on the *player*, not the quarry: a second monster two screens behind the
  target is not something you faced.
- `defend` — a named client works three loads out of a real vein on the real map.
  She arrives when you do, stops if you walk off, waves arrive tagged to the
  contract, and anything that reaches her bites her. Bonus ("Not a scratch"): she
  finishes untouched. If she goes down the contract is void — a failure that still
  paid would make the client scenery.

  The attackers do **not** go through the monster AI. Teaching the general AI about
  a second target would have changed every fight in the game for one contract.

**1.5 — the bonus pays something.** `rollBountyBonus` has been called at every
turn-in since round 3 and its result has never been anything but a word in a float:
"bonus loot!" over an unchanged bag, 22% of the time, for ninety rounds. It is gone.
The bonus is now the contract's own stated condition paying the contract's own
stated reward, decided at posting time (so the board prints the whole deal before
you commit) and granted on the floor through the same path a kill uses.

Pools are decided by tier, per the user's ruling: 1★ discount/stone, 2★ stone/essence,
3★ gear/essence. The **Society discount** is new saved state (`player.societyCredit`,
a plain field, so saves.js carries it with no save code) — 25% off the next three
purchases, honoured at the guild counter and nowhere else.

## What the screenshot caught that no assertion did

Reading the rendered board found three faults the suites were happy with, all now
fixed and all now asserted:

1. **Three pairs of duplicate headlines on one board.** Each bank makes 64 headlines
   and a board posts 25 — a collision is *expected*, not unlikely. quests.js's own
   note has claimed since round 64 that a collision "would be noticed immediately";
   it was, four rounds later, by looking at the board. Now re-rolled with a salt.
2. **"A Ichorling has been taking stock…"** — the article was typed, not derived.
3. **"will work 3 Ore Vein near the Ore Vein"** — ungrammatical, and a lie about how
   many veins are involved (it is one vein, three loads).

## Suites

- `tools/tests/test_round94.cjs` — **48/48**. The panel, the twenty-five, both gates
  against the real accept, both first-tier contracts run end to end, the four
  rewards, the discount at the counter and not at the smith.
- `tools/data_checks.mjs` — **53/53**, with 14 new contract checks.
- Regressions re-run green: `test_round64` **58/58**, `test_round41` **61/61**,
  `test_round76d` **25/25**, `test_round48_agentA` PASS.

### Two pre-existing faults found while running them

- **`test_round64` has been dying before its own subject for several rounds.** It
  read `d.room.denSlot` over every doorway, and generic building doors carry no
  `room` — the evaluate threw on the first one, taking sections 4 and 5 (the boards
  and the quests, the two the suite is named for) with it. Verified pre-existing by
  running it on the pre-round-94 tree, where it fails identically.
- **HANDOFF item 3 was stale.** "Every quest board in the world is the capital's
  board" was fixed at `WorldScene.js:27558` some rounds ago and carried as live
  since. Struck through rather than deleted.

## Still open

- 2★ authored content (investigation, dens, escorted shipments; speed bonus) —
  round 95. The `speed` condition is declared and unhooked; an unmet bonus pays
  nothing and says nothing, which is honest.
- 3★ political content (statements and a verdict; judgement bonus) — round 96.
- The payout floor (`BOUNTY_MIN_COINS`, 5 iron) clamps almost every Normal- and
  Iron-rank contract to exactly 500 coins, so the low end of the board reads as one
  price. Pre-existing, not this round's, and worth a look.
