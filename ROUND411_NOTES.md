# Round 411

## The smithy's anvil

The synthesised xylophone hammering is gone. Your recording (BigSoundBank "Anvil 1", CC0) now plays near the smithy during working hours:
- **When:** once when you come within reach, then once every three minutes while you stay. It never loops.
- **Volume:** it follows your distance while it plays.
- **Inside the smithy:** you hear it at full strength.

The file is `public/audio/amb_smithy_anvil.mp3`: trimmed to 31 seconds, faded out, and levelled.

## A Legion summoner's kit

Your message: "A legion astral blessing with appropriate awakening stones should effectively use 90% of the slots that were previously for attack, defense and healing to replace with summon abilities", with "at least 4 ritual summons as well as 1-2 wild summons, and temporary summons".

**What makes a summoner's kit:** the Legion blessing, with at least half of your awakening stones animals.

**What changes in a summoner's kit:**
- **Summons first:** summons fill up to 90% of what the kit holds (the ordinary Legion pull stops at 40%). The attack, defence and heal floors that used to win those sockets keep the summon instead.
- **Permanent summons:** these (rites and wild bonds) are preferred until the kit holds six. They may now take an active socket as well as a passive one, and an animal stone offers one on any essence.
- **Rites and wild bonds:** with ritual magic learned, one or two of them are wild (two once the kit has six) and the rest are rites. A creature already bonded always stays wild.
- **What stays:** the four innate abilities, one per essence, plus the aura and perception the kit owes.

**Measured on 12 summoner kits from random animal stones:**

| | Before | After |
|---|---|---|
| Ritual summons | 1.6 | 4 |
| Wild bonds | 0.3 | 2 |
| Temporary summons | 4.3 | 4.6 |
| Other summoning abilities | 1.8 | 1.7 |
| Attacks | 6.7 | 4.3, nearly all of them innates |

Leaving the innates aside, summons now take over 90% of the attack, defence and healing sockets.

**Your character:** an existing kit that has become a summoner's is rolled again once. The innates stay, and so does any socket with a creature bonded to it or a ritual being out. Your save, loaded in the game, now holds:
- **7 ritual summons:** Pangolin Shoulder, Pangolin Curl, Pangolin Deflect, Warded Plates, Scythe Mastery, Kindred of the Watch and Wardens of the Oath.
- **2 wild bonds:** Wrought Shoulders (your Pallidjaw Yearling stays bonded) and Bear Rear.
- **Temporary summons:** Feral Bound, Keen Sentry and Warding Glyph.
- **Other summoning abilities:** Sickle Revenant (raises the dead) and Tree Paws (a summoned barrier).
- **The rest:** your four innates, Sickle's Precision (a healing field) and Oath Locket (a conjured trinket).

The ability names in the re-rolled sockets are new.

## Curlshield, after the re-roll

Your Curlshield socket is now a ritual summon (Pangolin Curl), so nothing conjured replaces the shield that round 410 took back from beside your scythe.

## What was checked

**Here:**
- `test_round410` passes (29 checks). Its new checks:
  - the anvil plays once every 3 minutes and does not loop;
  - Legion with mostly animal stones is a summoner's kit;
  - your stones build into 5 ritual summons, 2 wild bonds and 6 temporary summons, and every non-innate attack, defence or heal socket is a summon;
  - an existing summoner kit is re-rolled once.
- **Kit-generation tests** pass: `test_round361` (the Legion mix), `384_buildplan`, `390`, `390_ritualsummon`, `390_wildbond`, `383_condmusts`, `296` and `297`.
- So do `test_round409`, `408` and `test_syntax_all` (599 modules).
- **Two older failures:** `test_round308_kits` ("about one self heal", 0.72) and `test_round376` ("no affliction payoff", 2 of 52 kits) fail exactly the same way on the generator from before round 410, so these changes didn't cause them. I've left them for now.
- **Tests updated:** `test_round376`'s version check was stale and is fixed, and `test_round390_wildbond` now allows the new save field.

**In the game (headless browser):**
- **Your save from the bug report:**
  - it loads and is re-rolled once as a summoner's kit, with the result listed above;
  - your Pallidjaw Yearling stays bonded to Wrought Shoulders.
- **The anvil:** standing by the smithy at noon, it played once, then waited three minutes before the next.

**Not checked:** a fight with the new kit.
