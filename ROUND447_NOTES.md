# Round 447: Aura marks come from the aura's own essence, and the first fixed innate abilities

## "Should the aura's own essence or stone win instead?" Yes.
**Before:** every aura took its signature (the mark it leaves, and the feature that goes with it) from the build's confluence. Across 200 random kits that was 198 of 198 auras. A Whale-stone aura on an Aspect slot left a Doppelganger mark, the same mismatch as Cattle's Mend.

**Now the aura's own essence signs it.** Across the same 200 kits, 198 of 198 auras are signed by the essence of the slot they sit in. For example:
- *Frog Mantle* (Aspect) carries *Gilded Summons*.
- *Aura of Abyssal Calm* (Void) carries *Hungry Hush*.
- *Refraction Aura* (Glass) carries *Brittle Onset*.

A confluence's own aura, if a kit has one, still carries the confluence's signature. None turned up in 200 kits, because confluence slots rarely roll an aura.

**Why the essence and not the stone:** each essence has its own pool of named marks and its own levers, written for it. A stone has neither, only one of the generic conditions (burning, poisoned and so on). The stone already shapes an aura through its own ability; the signature is the essence's half.

## Found on the way: a [Condition] bonus read higher than it pays
Round 446 lets the kit-wide bonus ("your attacks deal 6% more damage to [Bleeding] enemies") sit on the active ability of the stone that lays the condition. When that ability starts above Iron, as a confluence-slot ability can, the card's figures are scaled for its rank, and the bonus came out as "7% more damage". In play it is a flat 6% at every rank. The bonus sentence is now held out of the rank scaling, as rider sentences already were, so the card says 6%.

## "An ability is a static thing": the first fixed abilities (Wasp's innates)
As agreed (option B, each character gets its own pick, no two abilities share a name). This round starts step 1 with one essence, for you to judge before I write the other 147.

**The problem, measured:** across five Wasp kits, *One Clean Sting* came out as five different abilities: a fast bolt, a slow heavy bolt, a bolt that splits in three, and so on. The innate was assembled when the kit was built, and the name was handed out afterwards.

**Now Wasp's innate is one of twelve fixed records** (`tools/innates/out/essWasp.json`, assembled into `src/data/innatePools.js`). The kit chooses one by what the slot needs, then by the character's seed, and uses it exactly as written:
- The first essence's innate is always one of the four low-cost single-target attacks.
- A Life or Renewal essence's innate is about health, and an evasion or healer kit prefers its own shape, as before.
- Nothing afterwards changes the record. Weapon specials, synergy gates, essence-condition riders, bolt forms and renames are all undone for a fixed record at the end of the kit build. Only its cost, its stats line and its card text (the numbers at your rank) are worked out, as for every ability.

**Wasp's twelve:**

| Name | What it is |
|---|---|
| One Clean Sting | basic: fast stinger, 4 damage, [Poisoned] 1 a second for 4s |
| The Needle Finds You | resource: needle for 8, hold up to 4, kills give one back |
| Hornet's Kiss | basic: melee sting for 5, 8% easier to wound for 3s, 30% [Poisoned] |
| Venom Called Due | resource: 10 damage to an enemy carrying your affliction, using it up |
| The Nest Kicked Over | medium: 12 to everything within 3.5 tiles, spreads your afflictions 4 tiles |
| A Summer of Stings | long: 5 stingers in a fan, 26 each, every one a critical hit |
| Flight of the Stinger | dash 4 tiles, then 20% faster for 2s |
| Paper Fortress | shield: up to 18 damage from the next 4 hits within 8s |
| Late Summer Fury | +25% damage for 15s |
| The Colony Comes | swarm for 10s, stings for 3 every second |
| Stir the Nest | passive: below half health, +30% physical damage for 6s |
| Barbs That Build | passive: crits build 3 stacks, then a sting for 34% weapon damage per stack |

Across 80 characters with Wasp, all twelve turned up.

**Names:** each one is checked against every name in the game: all 112,780 hand-written fusions, the canon names, and every other innate. A name that a fixed record owns is never handed to anything else, including by round 446's name bank.

**The rules and the checker:** `tools/innates/validate.mjs` uses the fusion validator's own check on each record (fields the game reads, numbers stated in the text, no filler), plus the innate rules: twelve records, at least four openers, two other attacks, three non-attack actives, one passive, at least seven shapes, and names unique game-wide. The fusion authoring tools it relies on are now in the repo as well (`tools/fusions/`: AUTHORING.md, validate.mjs, vocab, briefs).

**Next, once you've judged Wasp's twelve:** the other 147 essences' innates (step 1), then renaming the duplicate names in the hand-written fusions (step 2).

## Tested here
- **This round's test:** test_round447 passes 15 of 15.
  - **Across 200 random kits:** every aura on an essence slot is signed by its own essence, and none leaves the confluence's named mark.
  - **Called directly:** the signature function still signs as the confluence when it's given one.
  - **Wasp:** the validator passes. Across 80 characters, every Wasp innate is one of the twelve and leaves the kit exactly as written, all twelve turn up, a first-slot Wasp always opens with a low-cost attack, and no other ability carries a fixed record's name.
- **Round 446's test** still passes 24 of 24. It caught the 6% bonus showing as 7%, which is fixed above.
- **The regression:** the 58 node tests, re-run on the final code, plus test_round446, 122_signature, 239, 269, 201, 408, 445, 71 and 298 in the browser, compared against an untouched round 446 copy on its own server. None is worse than round 446.
  - test_round71 failed one check in the first pass: the test casts the kit's first active, which happened to be a weapon special that grunts "heavy". It matches round 446 when re-run alone.
  - test_round201's and test_round298's remaining failures are the same ones round 446 has.
- **The version check** in 36 older tests now accepts 447.
- **Not run here:** the other browser tests, your build script and deploy.

