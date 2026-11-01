# Round 424 — hives, skin tones, shadows and fixes

## 1. Character creator wording
- **Astral Blessing intro** now reads: "As you travel through the astral, many beings see an opportunity to influence their agenda. Which Great Astral Being has marked you?"
- **Outworlder natures** have the new names and your descriptions. Their ids are unchanged, so saves keep them.
  - Mini Map is now **Adrift yet Discovered**.
  - Language Adaptation is now **Omniglot**.
  - **Inventory** keeps its name.
  - **Paradox of Generosity** keeps its name.
  - Item Identification is now **HUD**.

## 2. Ants and termites
These are your 8 hive monsters from `hive_monsters.zip`: a grub, worker, soldier and queen for each of the two lines.

**Colours.** The silver-white base is recoloured into each hive's affinities with a stretched gradient map, so the pieces read as coloured rather than pastel.
- Ant colourings: russet, sable, ember, glacial, storm, verdant, venom, umbral, gilded.
- Termite colourings: ochre, pale, and the same seven.

**Roles.**
- Grubs swarm.
- Workers are the common foe.
- Soldiers are tough melee.
- The queen stays within 6 tiles of her nest. Every 7 s she lays brood (70% grubs, the rest workers), up to 6 alive at once, with a "The queen lays" line.
- Grubs and the termite queen crawl.
- Monster sound cooldowns match the other families.

Hive monsters spawn only from hives. They are kept out of the general region spawn tables.

**One colony per map, each with 1–2 affinities:**

| Map | Line | Colourings | Cave theme |
|---|---|---|---|
| Nek | ants | russet / verdant | earth |
| Ontaria | termites | pale / glacial | earth |
| Elehyd | ants | glacial / storm | frost |
| Sirukh | termites | ochre / gilded | sand |
| Cinderwaste | termites | ember / umbral | ash |
| Ixcuatl | ants | gilded / sable | ruin |
| Bratugal | **both** | ants umbral / venom, termites verdant / ochre | loam |

**On the surface**, each colony has:
- a main mound with its entrance;
- 4 minor mounds;
- monster packs around them.

**Bratugal** has the ants at one end and the termites at the other. Four skirmish spots in the middle respawn their fighters every 150 s, and the two lines fight each other there when you are not in the way.

**Underground**, each hive is a large themed warren of 10 chambers: entry, queen, nursery, fungus garden, barracks, stores, graveyard and more. Chambers are joined by tunnels and the whole warren is checked for reachability. Bratugal's warren is twice the size: the two colonies' tunnels meet and their war chambers fight.

**Nest art** comes from `hive_nests.zip`:
- 128px mounds (solid, vents only);
- 80px entrances at each mound's front/bottom-right;
- tunnel holes as the exits;
- one sealed entrance per side, ready for a quest door;
- collapsed entrances;
- interior decoration, with tunnel_arch, tunnel_pillar, dirt_rubble and resin_column solid.

Ant mounds give ants and termite mounds give termites. No existing structure, prop sheet or monster data was changed beyond adding these.

**Other additions:**
- A written bestiary entry for each of the 72 variants (`monsterLore/lore9.js`).
- Parts and secondary drops for all 8 families.
- Bestiary entries for all 8 families.
- Essence links and bond nouns for all 8 families.

## 3. Skin tones (and the upscale)
**The problem.** The body art shades skin from orange through crimson into **magenta** in the deep shadows. The old recolour only touched pixels near the mid-tone, so on tones 5–7 the shadows stayed pink and purple.

**The fix.** Every warm or magenta skin pixel is now mapped by its brightness onto a ramp built from the chosen tone:
- the mid-tone lands on the swatch;
- shadows go darker and warmer (red-brown, never magenta), with a floor so the shading still reads on tone 7;
- lights go towards gold.

The outline, the white briefs and violet cloth are left alone. The ooze transformation keeps the old mask, because its maroon slime shares the skin's shadow hues.

**Upscale: not done.** PixelLab is still refusing the connection, so no new art could be drawn. An edge-smoothing pass (Scale2x/EPX) only rounds the stair-steps; it adds no detail and blurs the female face. A real higher-resolution body would also mean redrawing every weapon and armour overlay that lines up with the 64px cell. I've sent you the comparison so you can decide.

## 4. Signs, depth, shadows and cloth
- **Bath signs.** Seven bath signs are re-lettered: letter shadows removed and larger condensed type. Bath signs are now drawn at 1.5× instead of 2×. Salt Baths was left as it was.
- **Figures in front of objects.** A figure whose feet are visible below an object's lowest drawn pixel in that column is drawn in front of it.
- **Object shadows.** Each object now casts its own silhouette, sheared along the sun: a clothesline throws its posts, rope and washing; a pole throws a line; a tree throws its trunk and crown. The shape is re-cut as the sun moves. Cloth moved by the wind casts its shadow as it is that frame. Trees bent by the wind keep their shadow. People and monsters keep the soft spot at the feet.
- **Flags and hanging cloth.** These now warp vertically. The top edge and the pole edge never move, and the hem carries the wave.
- **Clotheslines.** They ripple vertically, most in the middle and almost none at the ends.

## 5. Fixes
- **Reliquary of Moments.** The jewellery display case now has this name.
- **Ability cards.** Wind Blade and the nine other canon abilities with no damage line now show their damage. Summons show "each hits for X dmg".
- **Wall corners.** The corner's base sits on the foot line of the wall objects. Wall runs now stop half a course from the corner, so their edges meet on the centre line.
- **Turn-in text behind menus.** Text that pops near you while a menu is open is now also shown above the menu. The dialogue box is also raised above it.

## 6. Bug report: "No Aura ability and No Perception ability. Run is effectively dead."
Clancy's kit (Cloud, Wind, Fire, Storm; Legion blessing) had all 20 sockets locked with no aura and no perception. Seven of them held bonded creatures, one more than the summoner cap of six.

**Why it happened.** The Legion summoner rule (round 410) narrowed each socket to summons *before* the step that gives a kit its aura and perception. It also ignored whether the socket was meant to be active or passive, so bonded (passive) creatures took sockets the budget had marked active. That spent the passive budget on creatures, every later socket was forced active, and the senses never got a seat. A kit grown one stone at a time could also lose the senses without Legion: early sockets took the passives, and the last stones went into early or already-locked sockets.

I reproduced it by growing this kit in random socketing orders. Before the fix, 3 of 30 orders ended with no sense, including your exact shape (7 bonded creatures, 0 senses).

**The fix** (`awakening.js`):
- The summoner narrowing keeps to the socket's kind (active or passive).
- While the kit still owes a sense, summons offered are the active ones only, so the passive seats are kept for the aura and the perception.
- A summoner kit, or a DPS kit grown a stone at a time, makes the sense it owes in its next socket that isn't an early one, even over the passive budget.

After the fix, 240 grown kits (Legion and otherwise) all ended with both senses. Kits built in one go are unchanged, and the kit tests match their round-423 results.

**Your save.** Kits already locked without a sense are mended once, on load:
- For each missing sense, one socket is re-awakened.
- Chosen first: a bonded creature that is not out, then another passive.
- Never touched: an essence's own ability, an early socket, or a creature that is out or wild-bonded.

On Clancy's save, Wind Gust became **Aura of Whirling Winds** (aura) and Fire Scorch became **Flare** (perception). Fire Kindle, Fire Flare and Kin of the Front, which were out with you, are kept. A line on screen says what changed.

## Pre-flight
See the end of this file.

## Queued for later rounds
- the crime system;
- permadeath and softcore modes, with the death priests;
- familiar variety (scalecurl for Pangolin, Sandy Hound for Fox) and the summon review.

## Known gaps
- Hive monster part icons are crops of the monster art.
- Barbtail colours don't match their names: Umbral is drawn orange-brown, Sanguine purple and Gilded crimson. This is from the earlier list.
- No hive is placed in the astral spaces yet.
- Ember ants, and storm and venom termites, have art and bestiary entries, but no hive uses them.
- The night look of lava (round 423) is still unseen.

## Pre-flight results (this round)
- **Build scripts re-read from your Desktop.** `Build Sparkstone-web.sh` and `Sparkstone-web/deploy.sh` are unchanged since round 423 (same checksums). The forbidden names are still assets_raw, pack_playable_bundle.py and MIGRATION_PLAN.md.
- **These zips.** The round is in three zips, because the monster sheets push one zip over the 30 MB a file can be copied to your Desktop:
  - `Sparkstone-overlay-r424-patch.zip`: code, `index.html`, these notes, and every other new asset (173 files);
  - `-patch2.zip`: the ant sheets (16 files);
  - `-patch3.zip`: the termite sheets (16 files).

  Your build lays down every `-r424-` zip that isn't a `-part` zip, as it did for r399's patch2. All three use repo-relative paths, and no file is in more than one. I read every listing in full: no forbidden or repo-only files. `version.js` (in `-patch.zip`) says `GAME_VERSION = 424`.
- **Other overlay zips on your Desktop.** None is newer than r423, and r394 to r423 were all scanned clean before.
- **Syntax and asset paths.** All 616 modules pass the syntax check. Every asset path written in the code for the new hives, monsters, parts, floors and nests exists. The item-icon manifest still names 155 files from earlier rounds that don't exist; that is unchanged by this round.
- **Game load check.** I visited all 8 hive entrances (Bratugal from both ends) and went into each hive. There were no page errors. The only failed requests were for files that exist in your checkout but not in my working copy (old death sheets, title plates, favicon).
  - In Ontaria, 3 monsters still had no texture 6 seconds after entering. I couldn't confirm the cause: my second look crashed the test browser.
- **Tests.** `test_round424` passes (114 checks). Every older test that fails here also fails on round 423, except where this round changed things on purpose. Those tests were updated:
  - 328 and 368: the new hive lines are excluded from their counts;
  - 414: wall corner stop;
  - 369: rain heard inside a hive;
  - 393_wind: cloth warp;
  - 410: the new save field.
- **Not checked:** your build was not run from here.
