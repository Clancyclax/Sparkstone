# Round 410

## Summons under the player frame

The "Summoned" list under your frame now shows lasting summons as well as timed ones, with health and time left:

| Summon | What the row shows |
|---|---|
| Bonded wild creature | Its name and health (for example "Pallidjaw 437/437") |
| Ritual being | Its health |
| Conjured escort | The seconds it has left, on its ring |
| Permanent familiar | "bonded" |

A flock or a swarm takes one row ("Gleaning Flock ×3"). The list holds six rows (it was three), then "and N more".

## Ability cards show only your current rank

Two cards still wrote later ranks into their text. Both are now written at the rank you are at:

- **Wild bonds** (Wrought Shoulders and the like): "at Bronze ...; at Silver ...; at Gold ..." is gone.
- **Ritual summons:**
  - **Forms:** only the forms you have, at today's figures.
  - **Subsumed powers:** only the powers you have, with no "rising to ... at Gold".

## Each bonded creature is its own

**Before you bond:** the card lists only the creatures your rank can bond ("At Iron you can bond a crocodile (Pallidjaw), lizard (Quillrunner) or quill fiend (Silverquill)"). It tells you each creature fights in its own way, and that you find out once it is bonded.

**Once bonded:** the card describes that creature at your current rank, and the creature really fights that way:

| What | How it is set |
|---|---|
| Rhythm and weight of blow | From its size against its speed. A big, slow body hits seldom and hard; a small, quick one often and light. |
| Damage over time | Set by how dangerous it was in the wild. |
| Critical hits | Its own chance, and more for a quick striker. |
| Health | The health it had in the wild, so a Quillrunner is frailer. |
| Hide | Turns aside part of every blow it takes. |
| Resistances | Its element, and water for river and sea creatures. |
| Reach | A creature that kept its distance in the wild strikes from further off. |

For example:
- **Pallidjaw:** a heavy, unhurried blow, water resistance and a thick hide.
- **Quillrunner:** quicker strikes and more critical hits, but less health.

**Rank bonuses:** these now come from the creature you bonded, not the ability's first-listed creature. The card shows only the ones your rank has reached ("Your bond has grown: ...").

## Summons move in their own ways

Bonded familiars no longer circle you nonstop. Each one stands in the world and keeps its own place:

| Behaviour | What it does |
|---|---|
| Vanguard | A few paces ahead, swaying across your path |
| Heel | A step behind, off one shoulder |
| Flank | Holds your left or right side |
| Patrol | Walks a beat across your path and back, pausing at each end |
| Dart | Waits at your side, darts out ahead, comes back |
| Wander | Potters about near you |
| Sentinel | For floating relics and conjured blades: hangs at one shoulder, bobbing |

**Who does what:** the creature decides. A charger darts, a kiter patrols, an ambusher flanks, a big creature leads, a small one heels, and a flier or a bird wanders. A summoner's familiars spread across the behaviours, so eight creatures do eight different things.

**In a fight:** each one lunges at what it strikes and plays its attack animation.

## Gleaning Flock (and over a thousand other summons) get bodies

Fusion abilities summon four kinds the game didn't recognise: bird (44 abilities), swarm (495), minion (303) and totem (283). All of them were drawn as a plain dot, and the dot stood where it was put. Now:

| Kind | Becomes |
|---|---|
| Bird | A flock of three birds of the ability's element. Wind gives Stormrocs, fire Emberwakes, light Halowings, water Glasswaders, anything else Bonepeckers. |
| Swarm | Three small creatures: bats for shadow, Webstalkers for poison, Bellhives for nature, Duskmoths for fire and wind, Gnawlings otherwise. |
| Minion | One small fighter: a Boneguard for death, a Bloomkin for nature, an Umbrathane for shadow, a Shardling for earth, a Stringless for mind, a Hexbound for fire, a Palefang otherwise. |
| Totem | Stands where it is planted, drawn and acting like a turret. |

**Movement:** birds, swarms and minions follow and fight beside you.

**Damage:** each ability keeps its own damage, and a flock's three bodies share the blow between them.

**Art:** the creature art is fetched when your kit is built. If a sheet is still loading at the moment of a cast, the creature replaces the dot as soon as the sheet arrives.

## Ritual summons

Your report: "No ritual magic summon abilities although I have the legion astral blessing, learned ritual magic, and a preponderance of awakening stones that should result in ritual magic familiars."

**What happened:** a permanent summon was a ritual or a wild bond on a coin flip, and nothing you did changed it. All three of your permanent summons came up wild, a 1-in-8 chance.

**Now:**
- **Odds:** with ritual magic learned, each permanent summon is a ritual summon 3 times in 4.
- **At least one:** a kit with ritual magic learned always has at least one ritual summon.
- **Bonded creatures stay:** a summon with a creature already bonded keeps its bond (your Wrought Shoulders keeps its Pallidjaw Yearling).
- **Timing:** learning ritual magic rebuilds the kit at once. An existing save picks this up when it loads.

**Your save:**
- Pangolin Deflect is now a ritual summon.
- Wrought Shoulders keeps your Pallidjaw.
- Following Cloud stayed wild on the 1-in-4.

## Curlshield

- **Armour, not a shield:** an "armour" conjuration no longer makes a shield because "shield" is in its name. Only an ability of the Shield essence, or one awakened by a Shield stone, conjures a shield. Curlshield (Pangolin × Fire) conjures body armour.
- **Your save:** the conjured shield is taken back, and a Blackened Iron Hauberk goes to your bag, since your chest slot is taken.
- **Two-handed weapons:** no conjured shield is put on beside a two-handed weapon. Any shield worn beside one goes back to your bag, where you can see it.
- **The exception:** a two-handed weapon your kit lets you hold in one hand (the one-handed-grip ability) still allows a shield, as before.

## The banner on the pole

In round 403 only the top 4 rows were pinned, so the cloth just under the rod still swung. Now the top third of every hanging banner holds completely still, and the movement builds up toward the bottom hem. The festival arch's ribbons keep their own rule.

## The smithy's hammer

The xylophone-like hammering is removed. It was a synthesised placeholder.

I couldn't download a real recording from here: this workspace can only reach package sites and GitHub. I found two free, public-domain (CC0) hammer-on-anvil recordings:

- [Anvil 1 (BigSoundBank)](https://bigsoundbank.com/anvil-1-s3589.html): 33 seconds of a blacksmith working.
- [Blacksmith's Hammer (OpenGameArt)](https://opengameart.org/node/129607): a short strike on a 45-pound anvil.

Download either one onto your Desktop and I'll wire it in as the smithy sound.

## Ability cards in the popups

The "Ability Awakened" and "Essence Absorbed" popups now show the ability's full card under the message, as the Abilities tab shows it. A nature gift evolution's popup shows the evolved gift as the Character page lists it.

## What was checked

**Here:**
- `test_round410` (24 checks) passes.
- These also pass:
  - `test_round409`, `408` and `407`;
  - `test_round390_ritualsummon` and `test_round390_wildbond`;
  - `test_round388_auracap`, `test_round403` and `test_round373` (all three updated, see below);
  - `test_round328` (3,933);
  - `test_syntax_all` (599 modules).
- **Old tests updated:**
  - `388_auracap` expected Olb's reward always to grant the fourfold aura; round 407 made that 1 in 100.
  - `403` looked for the old banner curve.
  - `373` listed the forge sound and its version check had been stale since round 400.
- `test_round85` fails here only because `favicon.png` is missing from my working copy. It's in your checkout.

**In the game (headless browser):**
- **Your save from the bug report:**
  - it loads;
  - Pangolin Deflect is ritual;
  - Curlshield's piece is a hauberk in the bag;
  - no shield is beside the scythe;
  - the Wrought Shoulders card describes your Pallidjaw Yearling;
  - "Pallidjaw Yearling 81/81" is listed under your frame.
- **Bonding a Pallidjaw:** the card before and after, the creature's figures, and its row under the frame.
- **Six familiars:** six different behaviours, and none circled you (each moved less than about 30° around you, where the old orbit swept about 250° in the same time).
- **Summon kinds:**
  - Gleaning Flock as three Stormrocs, with one row "×3";
  - a swarm, a minion (a Boneguard) and a totem (a turret).
- **The popups:** the Essence Absorbed and Ability Awakened popups with the card (picture checked).

**Not checked:**
- **The banner in motion:** I couldn't get a close enough picture of it moving. The top third is now part of the still image, so it can't move.
- **The late-load swap:** a slow-loading sheet replacing the dot, in a live cast.
- **A nature evolution popup:** not seen live.
- **A full fight:** the bonded creature's critical hits and resistances.
