# Round 312 — Shadow of the Reaper (2026-10-08)

## His words

The canon text for [Shadow of the Reaper] (Dark essence + Awakening Stone of the Reaper; Familiar (ritual); Extreme mana; no cooldown; the Shade and its shadow bodies — 3 at iron, 7 bronze, 31 silver, 211 gold; the chant; the five summoning materials), sent after I told him in round 311 that it was not in the game.

## What I did

- **Stored the text** in `data/canon/batch05.txt` and `src/data/canonText.js` (`shadowOfTheReaper`), exactly as he re-sent it (the first paste was lost to a context reset; I had rebuilt it from notes, then replaced that with his own words). The chant line comes from his first message and is placed after the type line, as in the Avatar's paste. The header's stone ("- Awakening Stone of the Reaper") is kept as `headerLine`; the Shade section sits under the iron rung and the summoning materials in the preamble.
- **Placed it** on Dark x the Reaper stone, the same pairing as Hand of the Reaper: a Dark kit holding the stone twice carries both (first occurrence is Hand, second is Shadow).
- **Ritual**: it was already in `CANON_RITUAL_KEYS` (round 311), so it needs ritual magic and counts as one of the four.
- **Materials**: 343 Dark quintessence gems and 2401 iron-rank spirit coins are charged once; the bond holds after (like the Avatar). 500 g Midnight Onyx Powder, 1 Midnight Jade and 24 small square Night Stone plates are not things the game has, so they are listed as pending and not charged.
- **The Shade** (familiar, `canonRuntime2Mixin.js`): shadow bodies 3 / 7 / 31 / 211 by rank; its touch drains the foe's mana and hands it to you; recast puts it in your shadow, where each body removes one of your heat, scent or sound (up to three) and the aura is harder to read.
- **Written down, not built** (`pending` on the entry): bodies hiding in others' shadows, having no shadow when none are attached, seeing and hearing through the other bodies, the teleport between Shade bodies (one rank below Path of Shadows), non-combat abilities carried by bodies, and the three missing materials.

## Tests

`tools/tests/test_round312.cjs` — 19 checks: text and chant, the pairing order, ritual gate, materials and payment, body counts by rank, mana drain and pass-through, hiding by subsumption, the card.
