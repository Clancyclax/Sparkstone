# Round 446: Immunity pierces, ability names, and the poison on a cattle passive

## 1. "Ignoring all affliction immunities at Iron is way too strong"
**It was worse than the card.** Every immunity-piercing passive had no affliction attached to it. That's 716 fusion abilities, including your *Takes Hold Anyway*, plus every generated one.
- **In play:** they let **nothing** through.
- **On the card:** they claimed to let **everything** through ("Your afflictions take hold on enemies that are immune to them").

**Now each one names one affliction family.** It takes the family from its own element (poison, curse, fire and so on). Failing that, it uses what its own essence lays, then what the kit lays.
- *Takes Hold Anyway* reads "Your poisons take hold on enemies that are immune to them." As you put it: poison anything at Iron, nothing more.
- Across 300 random kits, 67 of these passives turned up: 24 bleeds and wounds, 18 curses, 17 poisons, 4 unholy, 2 burns and 2 holy.
- Bleeds and wounds count as one family. An immunity to bleeding covers both.

**The rare broad one** ("Nothing Is Proof Against You", "The Great Leveller" and the rest of that group) also opens just one family at Iron. It opens every family from Gold, and the card says so: "From Gold, all of your afflictions do."

**Found on the way, not changed:** damage-over-time ticks (bleed, burn, poison) never check immunity at all. A skeleton already bleeds from any bleed tick. Only afflictions (the conditions with a name) are refused. Say if you want ticks to respect immunity too. That would make these passives matter far more.

**Checked and left alone:** "Your fire damage cannot be resisted" (the element pierce) covers one element. That matches "poison anything at Iron is fine".

## 2. Ability names
**What I measured:** across 300 random kits, 3,384 of 4,646 different names were two words. Mostly an essence or stone word joined to a function word: "Cattle's Mend", "Hunger Step", "Plant Momentum", "Boneless Arms of Shovel". Some came from the Skills tab of your HWFWM spreadsheet: Wasp Step Buff, Sting Surge and Iron Smash are all on it.

**No joining rule can fix that, so names are now written by hand.** The new file `src/data/abilityNameBank.js` holds, for each essence and confluence, three names for each of 13 roles: strike, spread, motion, guard, mend, power, edge, reflex, sense, kin, aura, blight and control. Vehicle also has a "ride" role for the vehicle itself.

When a kit is built, a smashed name is swapped for one from its essence's bank. A name with something of its own to say is kept, such as *Oiled Wings*, *Takes Hold Anyway*, *Larvae Left Behind* or *Snagged and Held*. Your spreadsheet isn't touched; the game just stops using those names for banked essences.

**This round covers the essences of your two review kits:** Iron, Wasp, Duck, Cattle, Vehicle and Adept, plus the Forge and Master confluences (315 names). Your own examples are in the bank and come first: *Flight of the Stinger*, *Escape Waddle* and *Automatic Slaughterhouse*.

**Your review kits, renamed** (everything not listed keeps its name):

| Essence | Stone | Was | Now |
|---|---|---|---|
| Iron | innate | Iron Smash | Cold Iron |
| Iron | Fish | Fish Spikes | Wrought Skin |
| Wasp | innate | Sting Surge | One Clean Sting |
| Wasp | Earth | Wasp Step Buff | Flight of the Stinger |
| Duck | innate | Bill Step | Escape Waddle |
| Duck | Bone | Webbed Feet of Bone | Eye on the Sky |
| Duck | Defiance | Down of Defiance | The Pond Is Mine |
| Forge | innate | Forge Bulwark | Fire-Hardened |
| Forge | Mouse | Bellows Rhythm | Hammer Falls |
| Cattle | innate | Branding Strike | Horns Down |
| Cattle | Dark | Dark Yoke | Mad Bull |
| Cattle | Vast | Cattle's Mend | Chewing the Cud |
| Cattle | Might | Cattle Herd Sense | Herd Instinct |
| Vehicle | innate | Reinforced Tires | Your Ride Awaits |
| Vehicle | Reaper | Swath Run | Backfire |
| Vehicle | Monkey | Spare Rivets | Hood Ornament |
| Master | innate | Master Spear | The Last Lesson |
| Master | Healer | Shared Breath | Stillness Heals |

**Next:** once you've judged the style, I'll write the banks for the other 142 essences and 99 confluences. Say what to change about the style first, for example fewer idioms, more grim, or more literal.

## 3. "Why would vast and cattle result in a poison ability?"
**Where the rider came from:** the "+6% vs [Poisoned]" on Cattle's Mend is a kit-wide backup. When the kit's build plan leans on a condition (here [Poisoned], from a Snake stone elsewhere in the kit) and no attack can carry its payoff, the payoff was stapled onto the first spare passive, whatever it was. So a cattle kill-heal ended up carrying poison.

**Now the backup only goes onto an ability with a reason to carry it:**
1. the ability on the stone that lays the condition, active or passive. The Snake stone's own ability carries the poison.
2. failing that, a passive whose essence trades in the condition.

If nothing in the kit has a reason, the backup is left off. An unrelated ability carrying it is the fault you found.

**It's now said in the condition's own words, not as a bolted-on sentence.** Each condition has three lines and the kit picks one. For example:
- "The poison does half the work; you do the rest: your attacks deal 6% more damage to [Poisoned] enemies."
- "Rot has already done the hard part: your attacks deal 6% more damage to [Decaying] enemies."
- "Flesh the light has scorched will not hold you off: your attacks deal 6% more damage to [Seared] enemies."

In the rebuilt second kit, the poison backup sits on *Lineage of Masters* (the Snake stone's ability) and the cattle abilities carry none.

**Not done yet: whole-kit effect themes.** Your Slaughterhouse example ties an effect itself to cattle and Vast (kills looted, stacks of Mad Cow Containment). Hand-written effects like that, for every essence and stone pair, are a bigger job than the backup fix. The fusion abilities (one set for each essence and stone pair) are the natural place for them. Say if you want me to start on those after the names.

## Tested here
- **This round's test:** test_round446 passes 24 of 24.
  - **Across 300 random kits:** every immunity pierce names one family and its card says which, the [Poisoned]-style backup only sits on a related ability, no smashed name is left where the bank covers that role, and no kit has two abilities with the same name.
  - **In the browser:** the rank gating. At Iron a poison pierce lets poison through and nothing else. The broad one opens one family until Gold, then every family. A pierce with no family lets nothing through.
- **The tests this round touches most:** test_round382, 383, 384 and 164 pass, apart from one damage-type check in test_round383_damagetypes that also fails on round 445 (below). Round 384's check now also accepts the backup on the active ability of the stone that lays the condition.
- **The main regression:** 58 node tests and 105 browser tests. Each failure was re-run alone, against an untouched round 445 copy served on its own port.
  - **Two real faults, fixed:** the new name-bank file wasn't listed in `src/modules.json` (test_round298). A transformation form that replaces the confluence's innate didn't say which confluence it came from (test_round201, fixed in `src/scenes/transformMixin.js`; the transformation test, test_round408, still passes 18 of 18). That one is from round 408, and only shows when a kit happens to roll a form.
  - **Chance, not this round:** test_round49_taunt (a wandering monster drifted 47px against a 40px limit) and test_round58 both match round 445 exactly when re-run. The drifting monster was the only difference in the taunt test.
  - **Failing before this round**, identically on round 445: test_round24, 48_agentA, 48_runtime, 49_stats, 57, 59, 62, 63, 65, 76b, 76c, 77b, 78b, 79a, 93, 95, 113_runtime, 174_report, 190, 199, 272 and 298 (its other three checks). Most are portraits or a favicon this workspace doesn't have (404s), and a few are older test expectations.
  - **test_round82** fails one check more than round 445 did, and that check is a dice roll. The sewer cultist's essence has dropped at Uncommon or better since an earlier round lowered the floor in `sewer.js`, but the test still expects Rare or better. Round 445 rolled a Rare, this round rolled an Uncommon.
  - **test_round383_damagetypes** fails the same check on round 445 (401 of 403 cards here, 404 of 406 there).
  - **Four browser tests that crashed** when several browsers ran at once (test_round200, 205, 229 and 248) pass when run alone.
- **The version check** in 36 older tests now accepts 446.
- **Not run here:** your build script and deploy.

