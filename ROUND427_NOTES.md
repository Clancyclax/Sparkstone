# Round 427: Softcore and Permadeath

Every new character now chooses how they play. The rules live in `src/data/gameModes427.js`; the world side is `src/scenes/gameModeMixin.js`.

## 1. The choice
The character creator has a new row, **How You Play**, above the Astral Blessing:
- **Softcore** (the default): death sends you back to town.
- **Permadeath**: one life.

The choice is open only while you make a new character, and it locks once the run begins. Every save made before this round is softcore. The load list marks permadeath saves.

## 2. Softcore
- **Items and coins stay at the body.** As before, everything you carry and do not wear goes into the bag where you fell. Now your whole purse goes with it, every rank of coin. Walk back and take the bag to get it all back. A second death before you reach the bag still replaces it, purse and all.
- **Every death is counted.** The death screen shows the count ("death 7"), and the Church of Death keeps it too (section 5). A save from before this round starts at zero.

## 3. Permadeath
**The dying window.** When you die, you are dying for a time set by your rank:

| Rank | Window |
|---|---|
| Normal or Iron | 3 s |
| Bronze | 10 s |
| Silver | 20 s |
| Gold | 40 s |

**A healer can pull you back.** A healer companion who is up, in your party and within 25 tiles runs to your body. The world holds still while you are down, as it always has. If the healer reaches you within the window and holds you for a second, you get up where you fell with 35% of your health, keeping everything you carry. The screen dims rather than going grey, so you can watch them come.

**Otherwise it is over.**
- One of your three bonded essences, chosen at random, goes into the permadeath reliquary for whoever comes next.
- Every save of the character is erased, manual and auto. Saves of other characters are kept.
- The character's seed is buried, so a copy of its save restored from elsewhere will not load. The load list says the character is dead and removes the copy.
- The screen says what was kept ("The Reliquary of Moments keeps the Essence of Wind for whoever comes next"). **Begin again** reloads the page for a clean start. Loading another save from the title works too.

**What is in the draw.** Only the three bonded essences. The confluence is formed from them rather than bonded, so it is not drawn.

## 4. Companions in permadeath
**A companion who goes down is dying.** Their window is set by their own rank, from the same table. They do not heal while dying, and they cannot be sent to the wagon to be mended. Anything that gets them up in time saves them:
- **The Draught of the Second Breath** (new). Drink it within 6 tiles of a fallen companion: the nearest gets up at once with 35% of their health. With nobody down in reach it is not drunk. It is rare: about 1 in 160 consumable drops from anything above Normal rank. The Temple of Healing also sells one a day for 90 iron. It works in softcore too, getting a fallen companion straight up.
- **A heal you cast.** Any ability of yours that heals (a heal or a heal over time, or one that restores health as you use it) also saves every dying companion within 7 tiles.
- **A healer companion standing by.** A healer companion within 6 tiles of the dying companion for a second saves them.
- **Anything that already raised the fallen**, such as canon Immortality at Gold.

**If nobody does**, the companion is dead for good. They leave the party, the world and the recruit list, and the run remembers them.

## 5. The Church of Death (softcore)
Death's priests count every softcore death. That means the temple priest and the roadside priests of Death.

| Deaths | What they do |
|---|---|
| 1 to 5 | They warn you before anything else they say ("I will say this kindly, once: the dead should stay where they are put.") |
| 6 to 10 | They are rude ("I bury people for a living. You keep wasting my work.") |
| 11 to 20 | They will not speak to you. They call you an aberration, and mutter it as you pass. |
| 21 and up | **Warden Isolde Mourne**, a gold-rank priest of Death at 300% strength, waits in their temple and attacks when you come in. Killed, she is replaced three days later. |
| 50 and up | They also attack on sight. A priest of Death who sees you within 9 tiles, in the temple or on the road, comes at you at the region's rank. One who loses you goes back to their post; one who is killed is back the next day. |
| 100 and up | A **Priest of Undeath** comes walking up to you outdoors every 8 to 12 minutes. You can hear them out, refuse (they come back in about 15 minutes), or take the mark of the Unburied, which opens the Undeath path (section 7). |

The hostile priests are fought like the Society's hunters: they can be targeted and hit like any foe, and they leave a body with loot. When you wake after a death that moves you up a tier, a line tells you what changed. Permadeath characters are never counted.

## 6. One reliquary per mode
- **Softcore** keeps the reliquary you already have, under the same storage key, so nothing anyone stored moves.
- **Permadeath** has its own. It is filled only by the dead (section 3): a permadeath character can take from it but not store in it, and the panel says so.

The reliquary chest at your home and Drawn From Nowhere use the same rule.

## 7. The mark of the Unburied: the Undeath path
You asked that taking the mark unlock the Undeath path, with the choice of a blessing from the god of Undeath.
- **Taking the mark** brings the god himself: the Unburied, the dark god of the bandit cities' churches. He offers his blessing, and the offer spells out what it does before you choose:
  - your confluence becomes Undeath;
  - you become a lich or a vampire, decided by your essences as the Undeath confluence always has been;
  - the Society will hunt you, and companions who will not stand beside Undeath will leave;
  - it cannot be undone.
- **Accept the blessing of the Unburied.** Your confluence is Undeath from then on, whatever your three essences are. Every confluence ability awakens again for Undeath from the same awakening stones in the same sockets, each tied to your form. Your essences' own abilities do not change. The Society learns of it the way it learns of any Undeath and hunts you.
- **Not yet.** You keep the mark, and the priests come back in about 15 minutes to ask again. Once you accept, they stop coming.
- **With fewer than three essences**, the blessing waits: your confluence forms as Undeath when the third is bonded.
- **A character bonded to a god** is refused: "Another god holds the place where your confluence would be."

Tried on Clancy's save: his Storm confluence became Undeath, and he became a lich:

| Socket | Before | After |
|---|---|---|
| Innate | Storm Rupture | Undeath Barb |
| Monkey | Gust-Borne | Wraith-Drift |
| Crocodile | Monsoon Deluge | Drowned Wight |
| Focus | Static Skip | Rib Palisade |

His three essences' abilities stayed as they were, the Society turned to hunting him, and it all survived a save and load.

**One socket is kept.** A socket whose ritual being is out keeps its ability, as round 410 ruled for re-rolls, so the being is not lost. On Clancy that is the Crystal socket with his Static Geodeback; it still takes the lich's tie. Say if you want the blessing to re-roll that socket too, ending the being.

## Not done / known gaps
- **The funeral's priest of Death** (the eulogy at a cemetery) is left out of the Church's tiers. Only the temple priest and the roadside priests count.
- **Old saves.** An existing save starts at zero deaths, because nothing recorded earlier ones.
- **Icon.** The Draught of the Second Breath's icon was drawn this round, not taken from your icon pack.

## Pre-flight (checked before delivery)
- **Build scripts.** `Build Sparkstone-web.sh` and `deploy.sh` were re-read from the Desktop and are unchanged. The forbidden names are still assets_raw, pack_playable_bundle.py and MIGRATION_PLAN.md, and none of them is in this patch.
- **Patch.** It holds `src/`, one new icon under `public/`, and these notes, with the same repo-relative layout as round 426. GAME_VERSION is 427, read from the zipped `version.js`, and every line of `unzip -l` was read.
- **Code and modules.** Every changed script passes a syntax check. `src/modules.json` names `gameModes427.js` and `gameModeMixin.js`.
- **In-game runs:**
  - softcore: death puts 16 items and the whole purse in the bag, the count goes up, and taking the bag gives everything back;
  - the priests at 3, 8 and 15 deaths (warning, rude, "aberration");
  - the Warden at 25 deaths: gold, 300%, she can be targeted, and she stays gone the day she is killed;
  - on sight at 55 deaths: the temple priest turns;
  - the priest of Undeath at 101 deaths walks up and offers the mark; the Unburied's blessing on Clancy (section 7);
  - each mode's reliquary, with permadeath's refusing deposits;
  - the creator row on a real New Game;
  - permadeath companions: saved by the draught, by a heal cast and by a healer standing by, and dead for good when Encykla's 3 Iron seconds ran out;
  - the player pulled back by Zeke at 35%;
  - dying alone: one essence into the permadeath reliquary, this character's saves erased and another character's kept, a restored copy refused, no respawn;
  - loading another save out of the end screen.

  No page errors. The only 404s are art this local copy lacks (the potion icons and a priest's death sheet); the game asks for those the same way it did before this round.
- **Tests.** The round-427 test passes, 56 of 56. All 153 old test files were run on this round and on round 426. One differed: test_round425 pinned the end of the list of fields an old save does not inherit, and this round adds four after it. Its pattern now allows that, and it passes 46 of 46. No regressions.
- **Your build was not run from here.**
