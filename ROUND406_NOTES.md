# Round 406

**Standing rule (unchanged):** confluence essences ARE essences.

## The Division has one name

It is the **Division of Essence Research** everywhere: the Society chains, the site officials, and one old line of dialogue that said "Division of Essence Development". A check in this round's test fails if any other name appears.

## Every companion has a martial art

Every companion now has one: the five story companions, the adventurers you recruit and the outlaws.

**Their art and their master** are fixed for the run.
- The master is one of the run's martial masters, and the art is theirs.
- The art suits the companion's role, and is always one whose effects a companion can actually use:

  | Role | Art |
  |---|---|
  | Tank | A guard art |
  | Healer | A mending or casting art |
  | Ranged | A keen or quick art |
  | Melee | A weapon or footwork art |

**Recruit or journey:**
- **Some arrive knowing it.** They learned it from a master who is still out there teaching.
- **The rest have a journey.** They have heard of a master whose way suits them and want to learn.

**Finding the master is part of their story:**
- **Ask them:** a new **"Your martial art"** button in their talk has them tell you about it in their own words. The five story companions have their own lines. For example, Benjamin: "Everyone keeps telling me I swing like a man chopping wood ... I want to swing like something else."
- **The master's place** is marked on your map.
- **At the master:**
  - **Journey:** walk the companion there and the master offers to teach them: "Ask … to teach Benjamin". They learn the art and say so.
  - **Known:** the master trains them, once per rank, after they have 20 defeats at that rank.

**It grows two ways**, your own rule at a companion's pace:
- **Their kills** at each rank make them a Journeyman, Adept, Expert or Master of the art. The thresholds are a quarter of yours (25, 125, 250, 500), because a companion lands fewer killing blows. Reaching a new step shows over their head.
- **Training with their master** at a rank "doubles the bonus" there and makes them an Expert.
- The better of the two counts.

**What it does:**
- The art's own clauses, read off the companion's own situation: in a fight, hurt, outnumbered, just after a kill, at night and so on.
- Scaled by their rank and their mastery. The art's weapon conditions hold for them, because they practise the art with its weapon.
- **Their blows:** damage, weapon damage and crits.
- **The blows they take:** dodge and damage reduction. An art's cost, such as less guard, counts too.
- **Movement speed.**
- **Health back:** leech, health on a kill, and regeneration.
- Effects a companion has no use for, such as mana costs, aren't applied.

## What was checked

**Here:**
- `test_round406` (14 checks) passes. It covers:
  - every companion getting an art and a master that suit their role, fixed for the run, with both ways in;
  - mastery by kills and by training;
  - the art's effects on them, growing with rank and mastery, and only the channels they can use;
  - the five voices;
  - the combat, talk and master hooks;
  - one name for the Division.
- These also pass: `test_round405`, `404`, `402`, `401`, `400`, `389` and `328`, and `test_syntax_all` (581 modules).
- `test_round49_stats` fails one check, "no page errors", on `favicon.png`. The favicon is missing from my working copy (your build has it), so this isn't from this round.
- `GAME_VERSION` reads 406.

**In the game (headless browser):**
- Zeke recruited; every companion given an art and master.
- His "Your martial art" talk.
- Taking him to his master: the "teach Zeke" choice, and his line when he learns it.
- The "train Zeke" choice at 20+ defeats, and the training.

**Not checked:** a long fight to watch the effects land (they're conditional, and were checked by the test's numbers), and your own build.
