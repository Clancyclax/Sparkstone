# Round 320

User list (composed across messages) and what changed.

1. **Sewer darkness / torches** — the blue night sheet no longer lies over a room (see 6), which is what was putting the torches out; the player's sight in the sewer is cut by two squares (`SEWER_SIGHT_TILES` now 4, radius 4 → 2).
2. **Prism on the dark** — four `deepDark` lines (`dark`, `dark2`, `dark3`, `dark4`) when she is more than seven tiles from every sewer torch, and a relief line (`dark5`) when she walks back into a torch's circle. Once each, on the existing bark gap.
3. **Potion slots** — Round 309 drew a dropdown but its two `[data-act]` elements are `div`s and the delegated click only matched `button[data-act]`: nothing could open it, by mouse or pad. The handler now matches both; pad A clicks the focused row, D-pad/stick walks the options, B folds the list.
4. **Market stalls** — vendors are seated in the band between the awning's lower edge and the counter's top (`STALL_BAND_ROWS`, rows read per frame): head just under the awning, everything below the counter cropped. Positioned from the stall's own screen point so he is centred in it.
5. **Rank-up** — the Iron *rank* still arrives with the first essence; the aura and the goo purge play once (`ironFxDone`) when the set is complete (confluence forms).
6. **Interiors** — the night sheet, lamp carve-out and ground shadows are driven by `shown = insideRoom ? 0 : dark`; `_darkness` stays the world's.
7. **Lamps not all lighting** — dim lamps lifted to power .90 (bat skull .65, signpost .70, frost tree .70 were reading as unlit next to a brass lamp), and the cull margin grew with the radii.
8. **Lamp radius doubled** — every `LAMP_LIGHTS` radius ×2.
9. **Tile tearing / faint lines** — the first sixteen frames of `grassTileAtlas`, `path_tile` and `street_tile` are *blocks*: a diamond top plus the dark side walls the 64x32 cell crops into two wedges. Laid flat, the wedges are covered by the neighbours only when everything rounds the right way; at fractional zoom they show as dark ragged bands and thin horizontal lines at every tile row. `tools/fix_round320_tile_sides.py` clears the wall pixels (originals in `assets_raw/round320_tiles/`).
10. **Shields** — an `absorbShield` cast no longer drops its ground shape; the bubble that follows the player is the shield.
11. **Linked attribute** — with any stone socket open the essence reads Iron 0 and contributes no tenths: Recovery stays 1.0, not 1.2, until all four sockets are filled (`computeAttrTotal`, `_slotStanding`, `_essenceAbilityStanding`).

Tests: `tools/tests/test_round320.cjs`.

Also: sewer torches light the ground within three tiles of them (and show themselves) whether or not the player's own, smaller sight window has reached them (`TORCH_SIGHT_TILES`, `_sewerSight`).

Known, not mine: suites 246 (display-list budget), 249/250 (clock), 157 (sewer chest), 82 and 240 (start-state harness), 79a (familiar models) fail as before.
