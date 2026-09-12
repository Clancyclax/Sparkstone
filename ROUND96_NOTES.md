# Round 96 — The Third Star

Clause 1.4.3, on the user's three rulings: the bonus is judged on **the evidence
you actually collected**, the statements come from **named witnesses placed for
the case**, and a wrong verdict **changes the world, quietly**. All six kinds
authored. This finishes the board.

## Why a case is not a quest with a quiz at the end

The tempting build is three markers, three flags, one radio button. That fails
the user's own word for this tier — *judgement* — because nothing about it is a
judgement. What makes it one is that **the statements disagree**. Every case has
witnesses whose accounts cannot all be true, and the work is figuring out which
account the others corroborate.

So each case carries a `truth` (authored, never rolled), the `supports` that
point at it, and the `red` that point elsewhere and are *not lies* — a witness
who is mistaken, frightened, or protecting the wrong person is the whole
substance of a political contract.

**The bonus rule, stated once:** the contract pays for a verdict; the bonus pays
only when the verdict is right **and** every supporting statement was actually
collected. A player who guesses correctly is paid for the work and not for the
judgement. Asserted in `caseFaults` and again in the build, because it is the one
rule the tier rests on.

`MIN_STATEMENTS` is 2 of 4 — deliberately fewer than are available. You may
report on partial evidence, and that is where a wrong verdict comes from. A case
that demanded everything would be a corridor with one exit.

## One kind, six cases

All six things the user listed are the same *verb* — go and talk to people who
disagree, then say what you think happened. The six differences are content, not
mechanism. So `case` is the kind and `cases.js` holds the six, which is also what
lets a seventh be added without a line changing in `contracts.js`.

The tier's distinction in one sentence: **the first star is a place, the second
star is a journey, the third star is a decision.** Nothing else on the board can
be got wrong while being finished.

## What a wrong verdict costs

Two things, both small:

1. **Somebody is standing in the capital because of what you decided.** Named,
   drawn, permanent, placed again on every load off the saved record. The
   gravedigger's neighbour who still walks up to the Almsgate most days. The
   assayer who is not the assayer any more.
2. **The Society stops extending credit.** The member's discount is withheld —
   not spent, not destroyed — until you get a case right. The counter says so out
   loud, because a discount that silently stopped applying is a bug report rather
   than a consequence.

What it deliberately does **not** cost is a star. The re-grade is the Society's
measure of your *rank*; spending it on one judgement call would cost a whole
rank's worth of contracts, which reads as unfair rather than consequential and
pushes players toward reloading.

**And the Society never tells you.** Every outcome line accepts the answer —
asserted, because it is a rule about tone and tone is what drifts. Finding out
you were wrong is noticing the person in the square.

## What the suite caught

- **One witness in six was silently not placed.** `npc_shopkeeper_v1` does not
  exist — the round-3 palette variants are the only NPC art without the `npc_`
  prefix. `NPC_ART[key]` came back undefined and the placement loop returned
  without a word, so a case turned up with three witnesses and nobody at the
  board. Found as "3 of 4" and "site,town".
- **The case's progress branch went into the wrong function.** A one-line match
  on `if (q.kind === 'supply')` hit the occurrence in `_questHave` instead of
  `_questProgressText`, so a numeric helper returned a sentence and the tracker
  read `NaN / 1`. **This is the second time in two rounds** that a replace
  anchored on too little context landed in the wrong place — round 95 put
  `_clearTrail` inside `_updateDefendContract` the same way. Anchor on enough
  surrounding text to be unique.
- **A test that passed for the wrong reason.** "A true verdict leaves nobody
  behind" counted `npcs.length` before and after — but giving a verdict also
  clears the case's witnesses, so the delta is negative either way. Counted on
  the fallout list now.

## Also this round

Three things that came in alongside, each shipped and stamped separately:

- **95.1 — confluence naming.** The keyword matcher was anchored only at the
  start of a word, so `sea` matched *seamless* and `war` matched *ward*.
  Measured over 4000 trios, Battlefield was the fifth commonest confluence in the
  game. Plus the user's rule: three animal essences now always make a mythical
  beast (53 of 53 measured), and three animals from three families prefer Chimera.
- **95.2 — the crafters.** Round 90 left `CONFLUENCE_LINES` empty as a socket,
  keyed on the confluence alone so all three benches would have said one
  sentence. `crafterTalk.js` is keyed on the pair: 24 confluence families × 3
  benches = 72 authored problems, plus the user's own six verbatim as the
  armoursmith's.
- **A beast gate that can pick a humanoid is not a beast gate.** Bear + Shark +
  Bat resolved to Succubus. The three mythics that are not animals are held in
  their own list so the omission is readable rather than a gap.

## Suites

- `tools/tests/test_round96.cjs` — **40/40**
- `tools/tests/test_round96_crafters.cjs` — **19/19**
- `tools/data_checks.mjs` — **122/122**
- Regressions green: round 95 **41/41**, round 94 **48/48**, round 64 **58/58**.

`_contentFaults()` is new on the scene: `societyFaults`, `contractFaults` and
`banditFaults` had all been imported into `WorldScene.js` and called by nothing
since round 88 — the "written and read by nothing" fault this codebase keeps
turning up, in its own tooling. One reader now, so a browser suite can ask the
*running build* whether its tables are sound.

## The three corrections, and the block

Reviewing ten combinations, the user kept seven and called out three.

- **#2 Fox + Spider + Bird → Garuda.** Three animals of three different families
  are a *chimera* — that is a definition, not a preference — and the bonus was
  only worth one essence's breadth, so a single beast matching one of the three
  beat it. `CHIMERA_BONUS` is 20 now, two essences' worth. It also fixed Wolf +
  Bird + Snake (was Serpent on the strength of the one snake). A beast that
  genuinely matches all three still wins: Crocodile + Rat + Wasp is still a
  Manticore, because tail, sting and barb really are one.
- **#10 Moon + Dance + Shimmer → Ambush.** The strike pool's best genuinely
  scored 22 — above the silence threshold added earlier this round — while
  Glimeron, whose whole vocabulary is shimmer and gleam and prism, scored 35
  outside it. A trio can be mechanically `strike` and be *about* light. So the
  pool is now overruled when the catalogue beats it by `CONFLUENCE_WIDEN_MARGIN`
  as well as when it is silent. **The margin is 13 because that is the largest
  gap that leaves all five names the user has already kept standing, and all of
  round 49/51's anchors** — 10 and 12 both cost Stellar and Boundary. Tuned by
  measurement through the real resolver, after a reimplementation of the scorer
  in a probe disagreed with the game and had to be thrown away.
- **#7 Gun + Technology + Rune → Fortress** is answered by the block rather than
  by a scoring change: the Gun essence cannot be bonded, so that trio is not one
  the game can form.

**The block.** The user: *"in order for the gun, cyborg and magitech essences to
work I need to add a variety of guns both modern and scifi. For now lets block
those essences until everything for them to work is available."*

Cyborg and Magitech are **confluence names**, not essences — there is no
`essCyborg` and no `essMagitech` — so they are blocked in `awakening.js` and the
Gun essence in `essenceCatalog.js`. The split that matters:

- `ESSENCE_IDS` — what the game may **give out**. Blocked ids are absent, so
  every drop, shelf and roll loses them by one edit.
- `ALL_ESSENCE_IDS` — what **exists**. Integrity and save-loading read this, so a
  save already carrying a blocked essence still resolves. Blocking is not
  deletion; a player mid-run should not lose a slot to a content decision.

Two shop sites were walking `Object.keys(ESSENCE_CATALOG)` directly and are on
`ESSENCE_IDS` now — a blocked essence must not be on a shelf any more than it may
drop. To unblock: add the firearms, remove the id. Nothing else to undo.

**One suite moved, and it was mine.** `test_round51_charters` asserts the bolt
share is under 13.5%; it measured 13.3% before the block and 13.5% after, because
removing a *ranged* essence lifts the remaining ranged essences' share of every
kit. A content decision tripped a distributional assertion with 0.2 points of
headroom. Raised to 14.5% with the reasoning written in — it still fails loudly
on drift back toward the 16.3% the line exists to catch, and unblocking the Gun
essence should return it to ~13.3%.

## Still open

- The payout floor still clamps most Normal- and Iron-rank contracts to exactly
  500 coins. Carried from round 94 and now three rounds old.
- A case's witnesses are placed on accept and cleared on turn-in, but a case
  *abandoned* (never turned in, quest dropped) leaves them standing. There is no
  abandon path in the game today, so nothing can reach it.
- **The Gun essence, and the Cyborg and Magitech confluences, are blocked** until
  a spread of firearms exists — modern and science-fictional, with icons, hand
  poses and projectiles. `BLOCKED_REASON` says so in the file.
- The six cases are region-agnostic: the Almsgate is described as being on the
  Almsgate, not in whichever town the board stands in. Worth localising if the
  tier is played heavily.
