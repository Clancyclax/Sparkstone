# Round 412

## Character sprite clean-up

Your corrected frames from `character-fixes.zip` are in, with `fixes_index.csv` as the guide:
- the duplicated weapons and the stray speck are gone from the stances;
- the duplicate spear is gone from the runs;
- floating debris is gone from 94 attack and run clips;
- the baked-in background boxes are gone from the 5 BattleMage BT2 clips;
- the female city guard's slung spear is gone from her stance.

**In total:** 1,032 packed frames in 78 sheets were replaced. Every other direction and frame in those sheets is unchanged, byte for byte.

### How they were placed (no shifting)

Your frames are raw PixelLab canvases; the game's sheets hold normalised cells (each set its own square cell and foot). The normalise step itself isn't in the repo, so each frame's placement was read off the game's own frame:
- **Finding the placement:** each fixed frame was laid over the cell it replaces at every offset, and the offset where the two drawings agree was taken. They are the same drawing apart from what you removed.
- **Replacing the cell:** the cell was cleared and the fixed frame drawn in at that offset. No scaling, and no new anchor: each sheet keeps the cell and foot it already had in its manifest, and no fixed pixel fell outside its cell.
- **BattleMage sheets:** these are 256-colour palette images (round 303), so the replaced cells are mapped onto each sheet's existing palette and nothing else in the sheet changes.

**Weapon pieces restored:** in some clips the old normalise step had also thrown away pieces of weapon that float free of the body; one example is the whips in the Pugilist BT2 whip_whip south attack. Your fixed frames keep those pieces, so they are back.

### Replaced (state, animation, directions)

| State | Animation | Directions |
|---|---|---|
| Armored BT1 maul | attack | east, west |
| Armored BT2 glaive | attack | east, west |
| Battlemage BT1 axe_axe | attack | south |
| Battlemage BT1 dagger_hammer | attack | south |
| Battlemage BT1 dagger_scythe | attack | north |
| Battlemage BT1 greataxe | attack | south-east, south-west |
| Battlemage BT1 scythe_scythe | attack | north-east, north-west, south |
| Battlemage BT1 scythe_spear | attack | south |
| Battlemage BT1 scythe_whip | attack | south |
| Battlemage BT1 sword_spear | attack | east, west, north-east, north-west |
| Battlemage BT1 sword_sword | attack | north |
| Battlemage BT1 whip_whip | attack | north |
| Battlemage axe_axe | attack | south-west |
| Battlemage axe_spear | attack | north-east |
| Battlemage hammer_hammer | run | east |
| Battlemage hammer_scythe | attack | south |
| Battlemage hammer_spear | attack | west |
| Battlemage scythe_shield | run | south-east |
| Battlemage spear_whip | attack | west |
| Battlemage sword_axe | attack | south-west |
| Battlemage sword_dagger | attack | west |
| Battlemage sword_scythe | attack | west |
| Battlemage sword_spear | attack | south-east |
| Battlemage whip_shield | attack | west |
| Duelist BT1 axe_spear | attack | south |
| Duelist BT1 hammer_scythe | attack | south-east, south-west |
| Duelist BT1 spear | run | north-east, north-west |
| Duelist BT1 spear | stance | north-east |
| Duelist BT1 spear_spear | attack | south |
| Duelist BT1 spear_whip | attack | south |
| Duelist BT1 sword_hammer | attack | south |
| Duelist BT2 glaive_1h v2 | stance | east, south-east |
| Duelist BT2F scythe_scythe | attack | north-east, north-west |
| Duelist BT2F spear | run | north-east, north-west |
| Duelist BT2F spear | stance | north-east, north-west (mirrored from the fixed north-east) |
| Duelist BT2F sword_scythe | attack | east, west |
| Duelist BT2F whip_whip | attack | south |
| Duelist BT2F whip_whip | run | south |
| Leather BT1 dagger_scythe | attack | south, south-east, south-west |
| Leather BT1 hammer_spear | attack | south |
| Leather BT1 scythe_whip | attack | east, west |
| Leather BT1 shield_shield | attack | north-east, north-west, north |
| Leather BT1 spear_spear | attack | east, west |
| Leather BT1 sword_whip | attack | east, west, north |
| Leather BT2 axe_axe | attack | east, west |
| Leather BT2 axe_dagger | attack | north-east, north-west |
| Leather BT2 dagger_hammer | attack | north-east, north-west |
| Leather BT2 dagger_whip | attack | north-east, north-west |
| Leather BT2 greataxe | attack | north-east, north-west |
| Leather BT2 hammer_spear | attack | east, west |
| Leather BT2 shield_shield | attack | south-east, south-west |
| Leather BT2 sword_scythe | attack | south-east, south-west |
| Leather BT2 sword_spear | attack | south |
| Leather BT2 sword_sword | attack | south |
| Leather BT2 sword_whip | attack | east, west |
| Pugilist BT1 axe_scythe | attack | east, west |
| Pugilist BT1 axe_whip | attack | south |
| Pugilist BT1 dagger_dagger | attack | north |
| Pugilist BT1 dagger_scythe | attack | south-east, south-west |
| Pugilist BT1 dagger_whip | attack | south-east, south-west |
| Pugilist BT1 shield_shield | attack | south |
| Pugilist BT1 spear_whip | attack | north |
| Pugilist BT1 sword_scythe | attack | south |
| Pugilist BT1 sword_spear | attack | north-east, north-west |
| Pugilist BT2 greataxe | attack | north-east, north-west |
| Pugilist BT2F axe_axe | attack | north-east, north-west, south |
| Pugilist BT2F axe_scythe | attack | east, west |
| Pugilist BT2F axe_spear | attack | north |
| Pugilist BT2F hammer_scythe | attack | south, north-east, north-west |
| Pugilist BT2F hammer_spear | attack | east, west, south-east, south-west |
| Pugilist BT2F scythe_whip | attack | north-east, north-west |
| Pugilist BT2F shield_shield | attack | north, north-east, north-west |
| Pugilist BT2F spear_whip | attack | south, south-east, south-west |
| Pugilist BT2F staff | attack | south |
| Pugilist BT2F sword_scythe | attack | south-east, south-west |
| Pugilist BT2F sword_whip | attack | east, west |
| Pugilist BT2F whip_whip | attack | south-east, south-west, north-east, north-west, south |
| city guard (female) | stance | north-east, north, north-west (mirrored from the fixed north-east) |

**Two north-west stances were rebuilt from the fixed north-east frame, mirrored:**
- **Duelist BT2F spear:** the game's own north-west drawing also had the duplicate spear. It was mirrored about the sheet's own east/west axis; the feet sit on exactly the same pixels as before.
- **Female city guard:** her north-west is a separate drawing in the game, and also had the slung spear. It was mirrored about her measured axis; she stands on the same ground line, centred where her body was.

### Not replaced, and why

**CSV rows the game doesn't use (skipped):**
- **wearing gauntlets (BT1 stance, south):** not in any sheet the game draws. I searched every character sheet.
- **Holding a white bato (BT2, custom "shifts their weight", east and west):** not used. The outfit sheets carry only stance, attack and run.
- **Wearing full metal a (BT2, custom "knight shifts its stance", east and west):** not used, for the same reason.
- **Leather BT2 part helmet+chest+gloves+boots sword (attack, south-east and south-west):** partial-gear looks have no attack sheet in the game; they carry only stance and run, with no weapon.
- **Leather BT2 part legs sword (stance, north-east and north-west):** the game's "legs" partial look holds no weapon, and is a different drawing.
- **Leather BT2F (spear stance and run, 11 attack clips):** the game's Leather body-type-2 sheets are a different generation; this female set's frames match nothing in them.
- **Female city guard running (north-east, north, north-west):** the game's guard runs with a different animation (spear held upright, plus the slung one) from the fixed clip, so it couldn't be swapped. **Her run in the game still shows the slung spear in those directions.** It needs her run animation regenerated from the one the game uses, or the fixed clip re-exported for it.

**Directions left as the game has them:** in these, the game's frame is its own drawing, and it doesn't have the duplicate:
- Duelist BT1 spear, stance north-west;
- Duelist BT1 greataxe_1h, stance north-east, north-west, south-east and south-west (the two-hand set composes the weapon differently);
- Duelist BT2 glaive_1h, stance west and south-west.

**Known, not included (as you said):** Leather BT1 greataxe_shield east stance still shows two crossed greataxes and needs regenerating.

## What was checked

- **Every replaced frame** was matched to its old cell first. Where the drawings agree, colours agree (97%+, or within the palette error on BattleMage), and the two share most of their pixels. Anything that didn't pass is in the "not replaced" lists above.
- **The rest of each sheet:** every cell that wasn't replaced is identical to before in all 78 sheets.
- **By eye:** before/after pictures of the Duelist spear stance and run, the BT2F spear north-east and north-west, three BattleMage clips, the Pugilist whip clip, a Leather clip, and all three guard stances. The feet of the mirrored frames sit where they did.
- **Not checked:** the frames in your running game.
