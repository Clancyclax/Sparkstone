# Round 426: the summon overhaul

As you chose:
- colours by palette;
- subsuming takes all the riders at once;
- each creature can come from many stones.

Beings you have already bonded keep their body.

The roster's rules live in `src/data/summonRoster426.js`, and the world side is `src/scenes/summon426Mixin.js`.

## 1. Doom and the Four Riders
Call the Pale Rider, and any summon of the Rider of Death, now brings more riders as the ability ranks:

| Rank | Riders |
|---|---|
| Iron | Death |
| Bronze | Death, Famine |
| Silver | Death, Famine, Pestilence |
| Gold | Death, Famine, Pestilence, War |

They grow a little with each rank. Most of their power is in their number: once two or more ride, each strikes for 60% of the single rider's blow.

Each rider keeps its own drawn colour (pale, sable, blighted, crimson) and has its own blow:
- **Death, Reaping.** Double damage to a foe under a quarter of its health, and the foe cannot heal (Necrotoxin).
- **Famine, Want.** Slows the foe's attacks and weakens it (Weakness of the Flesh). The rider heals by a quarter of what it deals.
- **Pestilence, Plague.** Leaves Disease, which also spreads to foes within about two tiles.
- **War, Slaughter.** Sunders armour and cleaves half the blow into foes beside the target. While War rides, the other riders strike 20% harder.

**The ritual Doom being (Heralds of the End).** In its rider form, every rider out at your rank walks beside you.

**Subsuming is all or nothing.** The riders go into you together, and each lends its own power:

| Rider | Power | Iron | Bronze | Silver | Gold |
|---|---|---|---|---|---|
| Death | Death's Hand: damage | +6% | +7% | +8% | +10% |
| Famine | Famine's Hunger: health per kill | - | +4 | +5 | +6 |
| Pestilence | Plague Touch: a festering strike | - | - | 3 per tick | 4 per tick |
| War | War's Fury: attack speed | - | - | - | +12% |

The card names the riders out at your rank and which one comes next.

## 2. New summons
The homunculus, lark, owl, toad and garrison knight are now summons, and each has a colour for every element:
- **Homunculus:** the Alchemy stone's own creature, and also called by the Flesh, Magus, Antidote, Catalyst and Crucible stones.
- **Lark:** the Song stone's creature, and also from Bird, Wing, Sky and Echo.
- **Owl:** from Bird, Bat, Moon, Knowledge, Omens, Vision, Staff and Preparation.
- **Toad:** the Frog stone's creature, and also from Life and Antidote.
- **Garrison knight:** from the Sword, Axe, Spear, Shield, Armour, Champion, Justice and other martial stones.

## 3. Ants and termites
Bee, Wasp, Locust, Earth, Gathering and Myriad call the ant line, and Wood calls the termite line:

| Rank | Body |
|---|---|
| Iron | Grub |
| Bronze | Worker |
| Silver | Soldier |
| Gold | Queen |

**The queen's brood.** In a fight the queen lays a grub every 7 seconds and keeps up to three. A grub grows into a worker after 12 seconds and into a soldier 14 seconds after that, hitting harder at each stage. The brood lasts 45 seconds, and it dies with the queen.

## 4. How a summon ranks up
There are three styles.

**It only gets larger.** This is every body that begins no line: +10% size at Bronze, +20% at Silver, +32% at Gold. Bonded and ritual beings grow the same way.

**It transforms.** For some lines the shape stays the same while it grows:

| Line | Iron | Bronze | Silver | Gold |
|---|---|---|---|---|
| Frog | frog | monstrous toad | hydra | greater hydra |
| Lizard | lizard | crocodile | hexfin | direjaw |
| Salamander | salamander | larger | lava elemental | larger |
| Firebird | firebird | larger | phoenix | larger |
| Lark | lark | larger | roc | larger |
| Serpent | cobra | larger | great serpent | leviathan |
| Ooze | ichorling | larger | slime golem | larger |
| Bones | boneguard | larger | ossuary knight | larger |
| Knight | garrison knight | larger | household knight | sworn knight |
| Homunculus | homunculus | larger | larger | cambion |
| Ants and termites | as in section 3 | | | |

**It grows slightly and brings more bodies:**

| Line | Iron | Bronze | Silver | Gold |
|---|---|---|---|---|
| Doom | the Four Riders, as in section 1 | | | |
| Gnawlings | 1 | 2 | 3 | 4 |
| Duskfangs | 1 | 2 | 3 | 4 |
| Webstalkers | 1 | 2 | 3 | 3 |
| Bellhive | 1 | 2 | 2 | the swarm golem |

The extra bodies share the blow.

The card says which road an ability is on and what it calls now. For example: "It ranks up as a frog at Iron, a monstrous toad at Bronze, a hydra at Silver, a greater hydra at Gold; now it calls Gulletmaw."

## 5. The full pass: every body, every element, every stone
**Every body has a colour for every element.**
- The 13 elements are fire, frost, storm, water, earth, poison, shadow, necrotic, radiant, arcane, nature, blood and wind.
- When a body already has a drawn row that fits the element, that row is used (the roc's storm, the lark's frost, the hydra's blue).
- Otherwise the element's palette is laid over the body by brightness, the way the iron duck's material is. The body's own shading survives.
- The image sent this round shows eight bodies in all thirteen.
- A shade the game already pins is kept, such as the Sandy Hound's sunlit row and the Scalecurl's bronze.

**Every one of the 152 bodies is tagged** with what it is (bird, lizard, amphibian, canine, knight, undead and so on) and what it is made of.

**Every one of the 191 stones has a pool:** every body that makes sense for it, read off those tags, plus the creature the stone names. Pools average about five bodies. Your examples:
- **Bird:** roc, Stormroc (the thunderbird), anzu, Suparna (the garuda), firebird, Emberwake (the phoenix), griffin, harpy, heron, lark, owl, Halowing (the bird angel), Bonepecker, Glasswader.
- **Frog:** the frog, which ranks into the toad and the hydra (section 4), and the salamander.
- **Lizard:** lizard, crocodile, Hexfin, Direjaw, Clawstrider, Ironclaw, behemoth, salamander.
- **Crocodile:** crocodile, lizard, Hexfin, Direjaw, salamander.
- **Hexfin:** it now comes from Lizard, Crocodile, Claw and Foot, no longer from Tentacle.

**The essence's element steers the pick.**
- When part of the pool is made of the element, the pick is among those bodies and the stone's own creature. A Bird stone with Fire calls the firebird, the phoenix or the roc. A Wolf stone with Fire calls a hell hound, a forge hound or the wolf.
- Otherwise the stone's own creature is the most likely pick.
- The pick is fixed per socket, so an ability keeps its creature.

**Sword and other martial stones** call knights and warriors, and the Knowledge stone calls a living sutra, an inkwell or an owl. Before this round, about 60 stones called nothing.

**An essence with no stone** uses its twin stone's pool, so an essence of Bird can call any bird.

**The 57 bodies that are never wild** (all the round 393 and 394 art) now summon with stats taken from a wild cousin. The roc is a larger Stormroc, the lark a small Bonepecker, the toad three quarters of a Gulletmaw.

**A ritual being's first form** takes the creature its stone names. A Frog-stone rite comes through as the frog.

## 6. Fixes found on the way
- **Palette over the round 394 bodies.** Those sheets are packed as a square grid, so laying a palette over one pointed most of its frames past the sheet's edge. The baked sheet now copies the frames of the sheet it came from.
- **Art unloaded too early.** A summon still waiting for its art could have that art unloaded before it arrived. It now counts as in use.
- **Bonded beings stuck as orbs.** A bonded being built before its art arrived stayed an orb until the next kit change. It now takes its body within a second of the art arriving.

## Not done / known gaps
- **Riders on the card.** The active Pale Rider card gets the riders' paragraph from the card renderer. The ability's own stored description, written when it was generated, is unchanged.
- **Ritual beings switching body.** These follow a rank line only when their form has no greater shape of its own; the rite's own road wins. The Pale Rider form is the exception, since it becomes the riders.
- **Wild bonds** are unchanged: they bond the creatures of the wild.
- **Next.** The two game modes: permadeath, and softcore with the death priests.

## Pre-flight (checked before delivery)
- **Build scripts.** `Build Sparkstone-web.sh` and `deploy.sh` were re-read from the Desktop and are unchanged. The forbidden names are still assets_raw, pack_playable_bundle.py and MIGRATION_PLAN.md, and none of them is in this patch.
- **Patch.** It holds `src/` plus these notes, with the same repo-relative layout as round 425. GAME_VERSION is 426, read from the zipped `version.js`, and every line of `unzip -l` was read.
- **Code and modules.** Every changed script passes a syntax check. `src/modules.json` names `summonRoster426.js` and `summon426Mixin.js`.
- **Art.** No new art files. The element palettes are baked in the game from the existing sheets, and every body's sheets exist. The one missing sheet, `mon_dragon_attack.png`, was already missing.
- **In-game runs, with no page errors (the only 404 is the favicon):**
  - the frog line at all four ranks (toad, Gulletmaw, hydra, larger hydra);
  - the Pale Rider at all four ranks (1, 2, 3, then 4 riders, each in its own colour);
  - an owl of fire, a lark of frost, a homunculus at Gold (cambion) and a garrison knight at Silver (household knight);
  - the ant line at Gold: the queen laid grubs, which grew into workers and a soldier;
  - Reaping (double under a quarter health) and Plague's disease;
  - the element colour grid of eight bodies in thirteen elements, drawn from the game's own textures;
  - Clancy's save: Scalecurl (bronze), Sandy Hound (sunlit) and Static Geodeback (storm palette) take their bodies once their art arrives.
- **Tests.** The round-426 test passes, 55 of 55. All 152 old test files were run on this round and on round 425. One differed: test_round389_compquests. Round 425's copy could not reach `docs/`, and with `docs/` linked in it fails in the same two places (Old Rurik's home). No regressions.
- **Your build was not run from here.**
