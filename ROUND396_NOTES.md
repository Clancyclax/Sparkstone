# Round 396

## Combat

- **The swing follows the attack.** The slash is now drawn over the arc your attack actually covers, centred on where you aim. It sweeps open across the swing, so a 180° cut draws half a ring in front of you and a full sweep draws the whole ring. It no longer flips between a ring and a half-ring that pointed the wrong way.
- **Great weapons.** There are four new two-handed weapons: the Greatsword, Greataxe, Glaive and Maul. Each has 50% more damage and 50% more reach than its sword, axe, spear or hammer, at half the speed. They train under the same books as their one-handed versions. They are sold at weapon shops, at the Adventure Society and in the auction house.
- **Special attacks hit in multiples of your weapon.** A special attack's immediate damage is now a multiple of the blow your weapon just rolled, so a better weapon makes every special stronger. The multiple depends on the attack:
  - a long-cooldown focused blow is about 4× your weapon;
  - a poison blow is about 1.3×, since most of its damage comes from the poison;
  - an hour-long cooldown is about 25×.

  The ability card states the multiple ("2.7× your weapon's damage"). Canon abilities keep their own numbers.
- **Spells are unchanged.** They scale only with rank, never with the weapon.

## World

- **Town signs.** All 44 signs from `new-assets/town-signs` are in the game. Each city has a sign beside every major road in, just outside the wall. Each town, village and hamlet has one on its road in. Each bathhouse has one by its door, styled for its region. 53 signs are placed in all.
  - **Bandit cities** show the bandit sign while held, and the `_former` sign once liberated.
  - **Collision:** only the posts are solid. No sign stands on a road, in front of a door or in a gate path.
  - **Scale:** city and bandit signs are drawn at 1:1. Town, village and bath signs are drawn at 2× (whole-number, nearest-neighbour), because at 1:1 their lettering could not be read at the game's zoom.
- **NPCs in front of objects.** An NPC whose feet are in front of a prop or building is now drawn wholly in front of it.
- **Interior stairs** now sit flush against the north wall, with no gap.

## Free Runner's wind

The momentum lines are replaced by the new wind sheet from `new-assets/vfx-momentum`. Free Runner's mechanics are unchanged.

- **Placement:** the wind is centred on you, above your sprite, and turned or mirrored to your heading in all 8 directions.
- **Build-up:**
  - it fades in from about 25% to 90% opacity as momentum builds;
  - it plays faster as momentum builds, from 0.8× to 1.5×;
  - "full" is 4 seconds of running after Free Runner switches on, or a full stack of Avatar of Speed's Momentum if you have it.
- **Fade-out:** it fades over 0.2 s when you stop.
- **Tint:** it is tinted faintly only when the ability has an element.

## Controls

- **On-screen prompts follow your controller.** "Press E to…" changes to the button you are using:
  - **PlayStation:** "L2+Touchpad" to talk, "Touchpad" for everything else;
  - **Steam Deck:** "R4";
  - **Xbox:** "LT+View";
  - **any other pad:** "L2+Select".

  The game switches whenever you press a key or use a pad. Options → Controls has a "Button prompts" setting if your pad is not recognised.

## Sound

- **The opening screen** plays the sound of rain, with the menu music quiet under it. The bird and duck calls are gone from it.
- **Music changes faster.** The crossfade between tracks is 0.75 s, down from several seconds. The mixer checks four times a second instead of once. A track that finishes loading starts straight away, and going through a door or closing the Keeper's screen switches the track at once.

## Essences

- **Sickle + Venom + Swift now gives Harvest.** It gave Sky because Sky matched loose words such as "open", "wide" and "height". Sky now matches only sky, air, cloud, wing, feather, soar, horizon and aloft. This cut the number of three-essence combinations that land on Sky from 16,681 to 1,629.
- **Unity no longer matches "bond".** Many essence descriptions opened "Bonded,", and that one word caused about 89% of all Unity results.
- **Every essence description is rewritten by hand.** All 148 are now one authored statement each, with no shared sentence frames or openings. Before, 118 of them were one of 46 fill-in templates. Venom now reads: *"A cut is an event; venom is a verdict. It enters through a puncture smaller than a freckle and goes on working without you, blackening veins and curdling strength, until your enemy is losing a battle fought entirely inside their own skin."*
  - **Body clauses:** Venom's is now fangs and bitter glands, replacing "everything you open stays open longer". Twelve others that missed their essence were also rewritten.
  - **Your motifs:** the seven you wrote (Potent, Elemental, Vast, Serene, Harmonic, Gathering and Myriad) are unchanged. Their descriptions are written from them.
  - **Phrases:** unchanged, because the stones share them.
- **Confluences have descriptions.** All 101 now have one, where before they had none. For example, Harvest: *"The farmer sows in hope and reaps without sentiment. Everything that grows is eventually taken in, and the scythe cannot tell the wheat from the warriors standing in it."* Hover over an essence or the confluence on the essence page to read its line.
- **Effect on confluence names:** about 19% of the 529,396 possible three-essence combinations now name a different confluence. Every line was checked against the naming rules, and the shift is the stray-word matches going away:
  - **Fewer:** Ambush (from "behind"), Guardian (from "standing"), Time (from "before" and "after") and Gate (from "open" and "door").
  - **More,** from words that belong to the essence: Weave (Cloth, Hair, Thread), Predatory (Claw, Hunt, Venom's fangs), Kraken (Octopus, Deep), Verdant (Growth).
  - **Canon recipes:** the canon recipe table answers its own trios first, so those don't move.

## Build

- **Deploy script:** `deploy.sh` and `.sparkstone-deploy` are now in `Desktop\Sparkstone-web`, so the build publishes again.
- **README:** the README now states the current round and is updated every published round. It is kept in the repo zip, not the overlay.

## Questions for you

- **Hammer:** the hammer has been two-handed since round 75, so the Maul is a heavier two-handed hammer. Should the hammer become one-handed?
- **README:** should the README also go in the overlay? It is in the repo zip for now, because the overlay rules exclude it.

## Known gaps

- **Great weapon art:** the four great weapons use their base weapon's pose and swing art until they get their own.
- **Bandit cities:** the brief asks for the `_former` sign before a bandit city is taken. In the game, every bandit city starts held, so there is no "before" state to show it in.
- **Opening screen:** the very first screen stays silent until you press a key, because browsers block sound until then.

## What was checked

- **Here, in the running game (Playwright):**
  - the swing art at several arcs and aims;
  - the button prompts for each controller, and in automatic mode;
  - the stairs in two rooms;
  - the Society rack;
  - special-attack damage with a dagger and a greatsword;
  - every city's approach sign, Gallowsreach both held and liberated, three villages including an angled one, and the bath sign;
  - the wind at low and full momentum, all 8 headings, the ramp and the fade;
  - the opening screen's rain and music level.
- **Here, the tests:**
  - `test_round396` (45 checks) and `test_syntax_all` (all modules) pass;
  - `GAME_VERSION` reads 396;
  - a sweep of all 529,396 three-essence combinations measured the confluence-name shift above.
- **Older suites:** they are re-running one at a time here and are not finished. Of the 28 done so far:
  - none shows a regression from this round's code;
  - 28, 68 and 74 were updated for this round's intended changes;
  - several fail only on art or data files that exist in your repo but not in this workspace.
- **Not checked:**
  - an NPC standing in front of a prop has not been seen on screen yet;
  - your own build was not run from here.
