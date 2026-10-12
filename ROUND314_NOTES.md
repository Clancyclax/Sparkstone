# Round 314 — soul scars, and Olb Nikobe's lessons (2026-10-09)

## His words (the part this round builds, verbatim)

3) Come up with a way to add soul scars
4) Learn meditation and aura control through a trainer
4.1) Trainer needs to become a story character named Olb, Nikobe and after joining the adventure society the first story arc is with Olb.
4.1.1) Trainer will help the player with their first quests and explaining the world to the player
4.1.2) Initially teaching combat and looting. Guiding the player to having a weapon crafted.
4.1.3) Then teaching about skill books and rituals
4.1.4) finally teaching meditation and aura control

(4.1.5 on, the hunt, the astral aperture, the Destruction cult, the god's aura, Olb's death, the scar on waking and the unlocked essence abilities, is rounds 315 and 316. 4.1.11 uses this round's scar door.)

## Readings I took

- "Olb, Nikobe" is one person: **Olb Nikobe**.
- The Cadence hall's Aura-Adept (Serevin Kade) becomes Olb. The other halls keep their Aura-Adepts, so the trainer still works everywhere; only the Cadence hall has the story.
- He only teaches once you have joined the Society; before that he sends you to the desk.
- The weapon lesson hands you a kit (4 stock, 6 cores, 3 quintessence, 200 normal coins) sized to cover a normal-rank commission, plus a weapon primer for the weapon you had made. The ritual book is rare by design, so he explains rituals and points at the market shelf instead of giving it away.
- "Aura control" lesson teaches the existing aura toggle and sets `auraTrained`, same as the old trainer.

## What I did

**Soul scars (item 3).** `src/data/soulScars.js` + `src/scenes/soulScarMixin.js`. A scar is a seeded roll: `rollScar(source, seed)`, stored as a few numbers (source, seed, place, name, time), redrawn identically every time. Five sources so far (Destruction's mark, a curse, a god's gaze, a rite that turned, too long in the astral), each with its own colours, shapes, names and wording. The one door is `this._addSoulScar(source, opts)`; a later round adds a source row and calls it. Scars draw as strokes on the HUD portrait (face) and are listed on the Character page with what caused them. A second scar never lands on the first. They are cosmetic and a record, and they save with the player.

**Olb's lessons (items 4, 4.1.1–4.1.4).** `src/data/olbArc.js` (the lessons and his words), `src/scenes/olbMixin.js` (the state machine). Each lesson is brief → doing → report; on handing in he pays it and begins the next in the same conversation. Order: meet him (five pages explaining monsters, quintessence, ranks, the Society, spirit coins) → take a notice from the board → kill three outside the walls and loot one (3 iron) → kit and commission a weapon → read the primer, then rituals explained → meditate for a few seconds in town → pull the aura in and out → "tell me when you are ready for the hunt". Each task is recognised by a hook where the game already knows it happened. The tracker beside the minimap shows the current task with your own key labels. After the arc he just talks.

## Tests

`tools/tests/test_round314.cjs` (42 checks, all pass).
