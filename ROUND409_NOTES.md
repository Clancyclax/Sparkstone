# Round 409

**Your game still reads "Playing version 401".** Your screenshot shows "Playing version 401" under the map, so none of the patches from 402 on are in the build you are playing. Run "Build Sparkstone-web.sh" with every overlay on your Desktop (r395 through r409), and the number should read 409.

## The innkeeper in the ground

The people who stand in one place on raised ground were drawn at flat-ground height, so up to 160 pixels of them sank into the hill. That covered the roadside inns' keepers and the farmsteads' families (Ivo Dunmore, Maud Verrick and the rest). They were put in the world before the slope was raised, and nothing that only stands ever moved them again.

Now they are lifted onto the ground at their feet along with the buildings. Before the fix, 17 people stood too low (or too high, in a hollow); now none do. People who walk were already fine. Anyone already at the right height is left alone, so nobody is lifted twice.

## Combat XP once every ability is unlocked

Once all three essences and the confluence have all four of their stones slotted, every kill gives 50% more experience. That includes both the part that lands at once and the part banked for meditation.

## What was checked

**Here:**
- `test_round409` (7 checks) passes.
- `test_round408`, `407` and `328` and `test_syntax_all` also pass.

**In the game (headless browser):**
- Every person standing on raised or lowered ground is now at the ground's own height (before: 17 off by 40 to 160 px).
- The keeper of the hillside inn on the 4-level hill (the inn in your screenshot) now stands whole beside his VACANCY sign (picture checked).
- The XP multiplier reads 1 for a new character and 1.5 with every socket filled.

**Not checked:** a kill's XP in a real fight with a full kit.
