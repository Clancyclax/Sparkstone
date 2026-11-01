# Round 408

**Standing rule (unchanged):** confluence essences ARE essences.

**First, your game reads "Playing version 401".** Your screenshots this afternoon show "Playing version 401" under the map. That means the build you are playing has none of the patches from round 402 onward, so the target frame, the stairs, the book sign and the rest are not in it. Run "Build Sparkstone-web.sh" over the overlays on your Desktop (r395 through r408) and the number under the map should read 408.

## Every monster has its own description

All 561 monster variants in the game now have a hand-written bestiary entry. Each one says:
- what makes this variant different from the others in its family;
- how it behaves and fights, matching its real speed, toughness, damage and element;
- one thing a hunter or a local would tell you.

Young creatures describe the juvenile: what it is like at that age, and what it means that one is near (a nest, a parent). The family blurb above the cards is unchanged. Each card still ends with what the creature is made of (Fauna, Undead and so on).

Examples:
- **Pallidjaw Hatchling:** "About as long as a forearm, pale as a peeled egg, and already convinced that everything it sees is food... hatchlings do not come on their own: find one in the reeds of the Nek and there is a nest nearby, and a mother who is not."
- **Abyssal Urchinroll:** "...It is slow to roll and easy to outpace, but when it bristles the spines go everywhere at once. A good rock to crouch behind is worth more than a good shield."

## Player transformations

**Where they come from.** Only the mythic-creature confluences and Avatar carry a transformation, and only one kit in four of those. The roll is fixed per character. When a kit gets one, it replaces that confluence's innate ability.

The mythic confluences are Garuda, Dragon, Hydra, Minotaur, Kraken, Behemoth, Thunderbird, Chimera, Manticore, Wendigo, Phoenix, Firebird, Roc, Anzu, Ziz, Harpy, Gorgon, Serpent, Leviathan and Troll.

**Forms that keep your kit (mantles).** For 40 to 45 seconds the creature's power is added on top of your abilities: mana, armour, speed, damage, regeneration or resistances.

| Mantle | What it adds |
|---|---|
| Phoenix | Mana, damage, regeneration and fire resistance |
| Firebird | Mana and mana regeneration |
| Roc | Armour, speed and health |
| Anzu | Speed and attack speed |
| Ziz | A deep pool of mana |
| Harpy | Speed, dodge and critical hits |
| Gorgon | Armour and poison resistance |
| Serpent | Speed, dodge, critical hits and damage |
| Leviathan | Armour, mana, and water and frost resistance |
| Troll | Armour, regeneration and health |
| Avatar Ascendant | A little of everything |

**Forms with their own abilities (shifts).** For 40 to 45 seconds you become the creature:
- **The hotbar:** its four abilities take your first four slots, and every ability from your three essences is put away.
- **Your confluence:** its abilities stay on the bar and hit 40% harder.
- **Ending:** when the form ends, your bar comes back exactly as it was.

The shift forms are Garuda, Dragon, Hydra, Minotaur, Kraken, Behemoth, Thunderbird, Chimera, Manticore and Wendigo. For example, Garuda Form gives you Sunwing Dive, Serpent-Bane Talons, Gale of Gold Feathers and Solar Crown, plus faster movement. Dragon Form's abilities include Wyrmfire, a true breath attack.

**The look:**
- **Monster sprite:** most temporary forms draw you as the creature, using that monster's own animated sheet. For example, Garuda Form is a gilded Halowing, Dragon a Wyrm and Gorgon a Gorgonet.
- **Recoloured body:** the rest (Kraken, Phoenix, Firebird, Roc, Anzu, Ziz, Leviathan and Avatar Ascendant) keep your body but recolour it hard, scale it up and make it glow.

**Permanent transformations.** You use one once to take it, and it asks you to confirm first. It cannot be undone, and only one kind can be taken. All your essence abilities remain.

| Form | Comes from | What it does |
|---|---|---|
| Embrace the Night (vampire) | Avatar | All resistances +50%. Every kill restores 20% of your maximum health over 5 seconds. 5% of the damage your blows deal returns as health. |
| The Phylactery Rite (lich) | Avatar | All resistances +50%. Below 1 health, blows drain your mana instead, and while you have mana you cannot be killed. |
| Avatar of the Edge | Avatar | Your spells become special attacks: casting one binds it to your weapon, and your next melee strike releases it on what you hit. Spell cooldowns are halved. All resistances +20%. |
| The Endless Hunger | Wendigo | Kills mend 20% of your health over 5 seconds. Below 1 health, blows drain your stamina instead. All resistances +25%. |
| Trollblood | Troll | Regenerate 1.5% of your health a second. Below 1 health, blows drain your stamina instead. All resistances +20%. |
| Phoenix-Souled | Phoenix | Below 1 health, blows burn your mana instead. All resistances +25%, and fire +50% more. |

**What "+50% resistances" means here:** each resistance rises by half again, and by at least 10 points.

**Where you see it.** The Character page shows the form you are wearing (with its time left) and any permanent form you have taken.

## Companions are attacked too

Monsters used to go only for you. Now:
- **Monsters** go for the nearest of you and your companions, and stick with that choice for a moment so they don't dither between two people a step apart.
- **Humanoid monsters** (gnolls, skeletons, Umbrathanes, demons, Gorgonets, Bullwardens and the like) weigh it like a person would. A healer, someone badly hurt, or someone standing apart is worth a few extra steps to them.
- **Contract bandits** do the same, and strike the companion they chose.
- **A companion** who walks up to a pack is noticed the way you would be.

## The buried house

The Nek slopes up toward its north-west corner, and the houses were placed before the slope was raised. Up to 160 pixels of house sat sunk into the hill. Every building and wall standing on raised or lowered ground is now lifted onto the ground it stands on: 220 of them, including the cabin at the top of the north road.

## Your name

I couldn't reproduce how the save came to read "Nate". "Nate" is the game's default name, and the only way I found for a name to fall back to it is clearing the creator's name box. So:
- **Rename button:** the Character page has a **Rename** button beside your name. Use it to put yours back.
- **The creator's name box:** clearing it no longer resets a name you already had.
- **Older saves:** a save from before the game tracked whether the name was your own still keeps its name.

**The save cards** now show essence names ("Spider · Lightning · Fire") instead of their internal ids.

## What was checked

**Here:**
- `test_round408` (18 checks) passes. It covers:
  - all 561 entries, with no generic text left, no repeated sentence, and 30+ words each;
  - the forms: only mythic and Avatar confluences, about one kit in four, all three kinds, the permanent perks, every temporary form's look, and the hooks in the game;
  - companions as targets, the house lift, the rename and the save cards.
- These also pass:
  - `test_round407`, `406` and `328` (`328` was updated: it looked for the old shade lines);
  - `test_syntax_all` (597 modules).

**In the game (headless browser):**
- **Garuda Form:**
  - its four abilities on the bar;
  - drawn as a gilded Halowing (picture checked);
  - two of its abilities cast;
  - at the end, the bar came back and the form abilities were gone.
- **Phoenix Mantle:** mana 30 → 39, the body tinted and enlarged.
- **The Phylactery Rite:**
  - taken after confirming;
  - fire resistance raised;
  - at 5 health, a 30-point blow left 1 health and took the rest from mana.
- **Monster targets:** a monster next to Zeke, with you far away, chose Zeke.
- **The cabin at the top of the Nek:** lifted 160 px, now standing on the hill (picture checked).

**Not checked:**
- A whole fight in each form.
- Avatar of the Edge's bound spells in a fight.
- A kit naturally rolling a form (forced in the probe).

Also, the form abilities show blank icons on the bar for now.
