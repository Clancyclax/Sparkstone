# Round 398

## The great weapons, drawn

**Your character now holds the greatsword, greataxe, glaive and maul with their own art.** This covers every outfit (Duelist, Pugilist, Battlemage, Leather and Fully Armoured) and both body types. Before, these weapons borrowed the warhammer and scythe pictures.

**Grips.** The pose is chosen from what you actually carry:

- **Two hands:** the normal grip.
- **One hand:** when an ability has freed that great weapon to one hand.
- **One hand with a shield:** freed, with a shield on the other arm.

A weapon in the left hand is mirrored. If your other hand holds a second weapon, the old drawing is used, because the new art has no pose for that.

**Animations.** The two-hand grip has its own attack swing and run cycle, eight directions each. The one-hand and shield grips use the matching two-hand swing and run, as the brief said.

- **Feet:** the new art is drawn at the same scale as your body, so it is not resized. Every frame stands on its set's foot point. In 516 of the 5,120 animation frames, PixelLab had taken a blade touching the ground for the foot; those were moved back onto the feet.
- **Flagged sets:** the six sets with a review flag ship as they are:
  - Duelist (body 2) greatsword, running: the blade's colour flickers.
  - Duelist (body 2) greataxe, running: a small white puff.
  - Pugilist (body 1) glaive, attack: a salmon streak for one frame, facing east.
  - Pugilist (body 2) greatsword, attack: the blade turns into a yellow orb for one frame, facing east.
  - Armoured (body 1) greatsword, running: a red cape the stance does not have.
  - Armoured (body 1) maul: debris shapes at the end of the swing, and the run starts with the maul overhead.

**Wardrobe and skin tone.** Both apply to the new stances, swings and runs in every outfit. The armoured knight is painted in your equipment's colours, the same way as his other weapons. Fully Armoured needs helmet, chest, gloves and boots; Leather needs all five leather pieces.

## Icons

**Each great weapon has its own icon bank:** 16 designs in the 10 usual variants (four plain steel, then fire, frost, lightning, nature, shadow and radiant). Greatswords and glaives lie diagonally; greataxes and mauls stand upright. Shops, the bag and loot use them.

## Skill books

**Each great weapon now has its own primer:** Greatsword, Greataxe, Glaive and Maul. Before, the greatsword was learned from the sword book, and so on.

**One-hand abilities include the great weapons again.** Round 396 had left them out; the art brief expects them to be freeable, so the abilities that free a two-handed weapon to one hand list them too.

## Martial arts

**About 1,400 arts are on offer now, built in five kinds:**

- **Weapon arts.** These work while you wield a particular weapon or kind of weapon: dagger, sword, warhammer, axe, spear, scythe, whip, each great weapon, javelin, staff, bow, crossbow, any great weapon, bladed, heavy, polearm, ranged, a shield, a weapon in each hand, any two-handed weapon, or one weapon with an empty hand. Each weapon uses the effects it's about: a dagger's dodge and crit, a maul's stamina and guard.
- **Element arts.** One element's spells hit harder, strike with your weapon's weight, or your resistance to that element turns into dodge, guard, damage or crit.
- **Situation arts.** Round 310's conditions (holding still, hurt, at night, after a kill, with one foe…), now with two or three effects at once.
- **Two-sided arts.** One thing while still and another while moving; the same for hurt and healthy, day and night, crowd and duel.
- **Bargains.** A big gift under a condition, paid for with a small loss at all times.

Names take Way, Style, School, Path, Form, Discipline, Stance or Method, with an epithet and a figure that suit the theme: Way of the Coiled Asp, School of the Sweeping Mountain, Stance of the Dawning Sun.

**New effects in the game:**

| Effect | Example |
|---|---|
| Weapon damage | your attacks hit 5% harder |
| Swing stamina | attacks cost 10% less stamina |
| Swing speed | attacks swing 3% faster |
| Leech | heal for part of the weapon damage you deal |
| Restore on a kill | health, stamina or mana |
| One element's spell damage | fire spells deal 5% more damage |
| Weapon share in spells | fire spells also strike for a share of your weapon's damage |
| Resistance-scaled | gain dodge, guard, damage or crit for every 20% of an element's resistance |

**Your three examples are in, in your words:**

- **Way of the Fanged Serpent:** 5% more damage with daggers and 2% dodge while wielding a dagger.
- **Style of the Striking Meteor:** with a great weapon, attacks cost 10% less stamina, hit 5% harder and swing 3% faster.
- **Way of the Shifting Flame:** dodge chance scales with fire resistance (1% dodge for every 20% fire resistance).
  - **How I read "x1.1":** each fire spell hit also adds 1.1 times your weapon's damage. Tell me if you meant something else.
  - **How it grows:** this weapon share grows more gently with rank than other effects (about 1.5 times by gold, not 3.8 times), so a high-rank caster's spells don't turn into weapon strikes.

**Each run offers a random 120.** They are spread across the kinds, with no more than four from any one theme, and they are drawn from the run's seed. Arts outside a run's 120 can't be found that run.

**Finding a particular art.** A run's arts reach you in four ways:

- **Shelves:** the Society bookseller and Cadence's market bookstall each put 15 of the run's arts on the shelf, a different 15 each day. Any one art is there about one day in eight.
- **The auction house:** it now consigns three martial manuals a day, alongside its usual primers.
- **Found books:** manuals found in ruins come from the run's arts.
- **Masters:** ten martial masters stand in ten random settlements, a different ten each run. Each teaches one art: you buy the manual from them at half again the bookseller's price (90 iron) and read it in the rite, as usual. Each master also tells you who another master is, what they teach and where to find them, so one leads to the next.

**Old saves.** Round 310's arts aren't sold any more, but if your character already follows one, it keeps working.

## What was checked

**Here:**
- `test_round398` (41 checks) passes.
- `test_syntax_all` passes (562 modules).
- `GAME_VERSION` reads 398.
- These suites pass in full: `test_round396` (45), `test_round335` (39), `test_round344_rites` (27), `test_round228` (48) and `test_round221` (32).
- `test_round310`:
  - **Passes:** every martial-art, shelf and auction check.
  - **Fails, not from this round:** the older ritual-book, familiar and book-reading checks. They predate the round 357 theories and the round 335 rites. Their ritual section also throws before the suite can finish, so it only ran with that crash patched out.
- `test_round77b`:
  - **Passes:** the one-hand check (it now frees the great weapons too).
  - **Fails, not from this round as far as I can tell:** three checks (an ability name, water footing, missing files in this workspace).
- `test_round75` timed out loading the game here, so it was not checked. Its one-hand list was checked on its own and reads glaive, greataxe, greatsword, hammer, maul, scythe.

**In the game (screenshots):**
- **Art:**
  - a Duelist greatsword, a Pugilist maul and a Battlemage glaive stand, run and swing with the new art;
  - a greataxe freed to one hand uses the two-hand swing and run;
  - a greatsword with a shield takes the shield stance;
  - the frames step through the swing with the feet planted;
  - Wardrobe colours and skin tone change all five outfits.
- **Martial arts:**
  - a master stands in a hamlet and talks;
  - buying from him puts the manual in your bag;
  - the masters move when the run's seed changes;
  - the Striking Meteor adds its stamina, damage and swing speed with a maul;
  - the Shifting Flame gives 2% dodge at 45% fire resistance, and a fire spell's hit grows by 1.1 times the weapon blow.

**Not checked:** your own build.
