# Round 95 — The Second Star

The user's clause 1.4.2, and their three rulings on how: **tracks on the ground**
for the investigation, **a new bandit roster in patchwork** reusing the cultist and
adventurer art, and **two in-game days** for the speed bonus. Scope: all three
shapes, complete.

## The three shapes

None of them is finished by standing in one place. That is the whole difference
from the first star, whose two contracts both happen at a point on the map — "the
Society stops telling you how" ought to mean a journey.

- **`den`** — the posting names where something was *killed*, never where it lives.
  A trail of eight marks is laid on accept and the den does not go on the map until
  you reach the end of it. Only the *next* mark counts, so the trail cannot be
  shortcut, and clearing the den before following it is refused outright — a player
  who already knew the cave would otherwise be paid for finding it.
- **`supply`** — two different parts from two different creatures, for a named
  person. Half an order is not an order; the whole order leaves the bag on turn-in.
- **`escort`** — a cart that travels between two named towns, with a *named crew*
  coming for it. The cart waits until you are with it and pulls up if you walk off.
  Cargo can be lost, and a stripped cart voids the contract.

**Speed bonus**: `takenDay` is stamped at accept and turned in within two in-game
days pays. Days rather than real minutes because `_clockT` is saved and wall time
is not — a real-time deadline would punish closing the tab and be unrestorable.

## The bandits

`src/data/bandits.js` — six crews, normal to silver, five bodies each (two cultist,
three adventurer), thirty baked sheets, lazy on first use.

**Monochrome means you belong to something; patchwork means you do not.**
cultists.js ties one saturated colour to one build so the player can read the room
before the fight. A crew issues nothing — what a bandit wears came off somebody
else — so the patchwork is the same information channel saying the opposite thing.
Each band carries **two** colours in three-pixel scraps, because one colour per band
reads as "a person in different clothes" rather than as sewn-together loot.

Four passes, each judged by looking at the rendered figures:

1. One colour per band → reads as different clothes. Rejected.
2. Two-colour scraps, muted bank → reads on the pale cultists, vanishes on the
   adventurers, whose art is already muted brown and green. Bank got louder.
3. A head band → dyes *hair*, and on the pale-haired models it crept onto the face.
   Cut entirely: a bandit wears looted gear, not dyed hair.
4. A shared chest-band top of 14 → the cultist woman's face is drawn at y14–22,
   exactly where every other model's collar is. She came out green-faced three tries
   running. `chestTop` is per-model now, and her 23 is the one number in the file
   arrived at by zooming in on a sprite.

Skin is **not** detected by hue and cannot be — the base sheets are desaturated and
the cult variants are monochrome, so a face is red on one and grey on another. What
protects skin is the band table.

## What the suite caught that the design did not

- **The cart never arrived.** Traced twice. Greedy steering wedged it in a pocket —
  obstacles across 250° of the compass and clear ground sixty units past a wall its
  37-unit step could not cross — where it stood for three hundred ticks. Adding
  hysteresis stopped the freezing and started *circling*, which looks like it is
  trying and is worse. Both fail for the same reason: local avoidance cannot leave a
  concave shape, and once the cart has wandered off the straight line it is somewhere
  nobody checked. **The fix is that the validated line IS the road**: `_routeIsDry`
  samples it at posting time (water absolute, obstacles to a 6% tolerance, the town
  ends skipped), and the cart advances along that line's own parameter with a lateral
  offset that decays. It cannot fail to arrive because the road was checked before it
  was posted.
- **A `plague` was filling second-star slots** and advertising the first tier's hazard
  bonus on a second-star row. The roll's fallback is star-aware now.
- **The crew could never catch the cart** — 58 units/s against a cart making 105, so a
  shipment left completely undefended still came in with full cargo. A robbery nobody
  can commit is not a stake. 128 now.
- **A trail mark inside a boulder.** Ten small random nudges cannot leave a wide rock,
  because each step is as likely to go back in. A ring search outward replaces it.
- **The cleanup was in the wrong function.** `_clearTrail`/`_clearEscort` landed in
  `_updateDefendContract` because a one-line match hit the wrong occurrence; the suite
  found it as "the trail is taken up behind it" failing on a paid contract.
- **The marks were invisible.** A flat dark brown at 16px disappeared into every
  ground palette. Pale scuff, dark rim, 24px — it carries both ends of the contrast.

## Suites

- `tools/tests/test_round95.cjs` — **41/41**
- `tools/data_checks.mjs` — **76/76** (23 new)
- Regressions green: round 94 **48/48**, round 64 **58/58**, round 41 **61/61**,
  round 48A PASS.

`test_round64`'s kind count is held to `LEGACY_KINDS + AUTHORED_KINDS` now rather
than to a literal, so the next round that authors a kind updates one table.

## Still open

- 3★ political tier with statements-and-verdict — round 96. Its `judgement`
  condition is declared and unhooked; an unmet bonus pays nothing and says nothing.
- Bandits keep no bestiary entry and no codex line, which is right (they are people)
  but means the only place their names appear is a board row and a battle cry.
- The payout floor still clamps most Normal- and Iron-rank contracts to exactly 500
  coins. Carried from round 94.
