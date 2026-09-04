# Sparkstone — the world and the story

Recorded round 43, from the user's design. This document is the source of
truth for region layout and the main story arc; `src/data/regions.js` is the
machine-readable half of the same design and must not drift from it.

---

## The world

Four regions, each 1024×1024 tiles (32,768 world units, roughly 218 seconds
to cross at a run), laid out as a 2×2 grid in one tile array with a reserved
interior band below them. Travel between regions is never a walk across a
border — it is a gate, a ship or a portal, and every one of them is gated by
RANK.

| # | Region | Character | Arrival | Enemy bands | Way out |
|---|--------|-----------|---------|-------------|---------|
| 1 | **The Nek** | Grasslands and forests; two rivers meet at the city; three lakes west; one road running southwest | The city (the game begins here) | Super packs (10–30) of Normal, packs (2–8) of Normal, solo Iron, small packs (2–3) of Iron | Southwest gate, **two gate guards, Bronze rank** |
| 2 | **Ontaria** | Oceanside forests and plains; main city northwest, a smaller city farther west, coastal villages south, farms scattered | By road, north of the main city | Packs of Iron, solo Bronze | By **ship, Silver rank** — "next is a high magic area" |
| 3 | **Elehyd** | Desolate badlands, icy peaks, hard stone; rivers with only a few bridges; roads fade into dirt | By boat, into the southwest city | Super packs of Iron, packs of Bronze, solo Silver | A **portal specialist, Gold rank** — and he does not appear in the city at all until the player is at least silver 9 in multiple abilities |
| 4 | **Bratugal** | Jungle, rainforest and swamp; no roads outside the city; one large, advanced city in the far east | By portal, into the portal square | Super packs of Bronze, packs of Silver, solo Gold | — (story continues past this point) |

Danger rises with distance from the arrival point **inside** a region, but
the RANK BAND is the region's own property. The Nek is Normal/Iron wherever
you stand in it; Bratugal is Bronze/Silver/Gold wherever you stand in it.

**Packs and super packs** are groups of ONE species. The intent, in the
user's words: *"to allow players to feel how much stronger their abilities
are getting as they move from killing 1-2 of a creature to dozens, while also
demonstrating how much tougher enemies are getting at each rank."*

**Bratugal's monsters behave differently by design.** Gold-rank solos hold
large territories and path anywhere outside the city at random; Silver packs
keep to the west; Bronze super packs grow larger the farther west you go.

**No diamond.** No region is diamond rank and no monster is diamond rank.
The lore allows a character's abilities to reach diamond; the game will not
build diamond-rank content, because it is effectively unreachable in play.

**The tyranny of rank** is in force everywhere. A rank is a category, not a
difficulty slider: one rank up multiplies your damage ~2.6×, one rank down
cuts it to about a third, two ranks down is chip damage, three is nothing.
This is what makes the gates make sense — the guards are not being arbitrary,
they are telling you the next country would kill you.

---

## Story: the Division of Essence Research

### Act 0 — waking (The Nek)

The player wakes in a strange place with no idea how they got there; the last
thing they remember is going to bed at home. **Knowledge** — the goddess —
speaks into their mind: they have come to Pallimustus as an **outworlder**,
outworlders often have an outsized impact on the world, and Pallimustus is
dangerous. She gives a quick grounding in essences and awakening stones and
suggests that if they want to survive, they had better get stronger for what
is coming.

### Act 1 — the lab in town (The Nek)

Learning the town and region turns up rumours of the **Division of Essence
Research**, who keep a lab in the city. They are trying to learn how to
create essences and force awakening-stone manifestation, the way coin farms
are forced. People think they are a little strange, but everyone understands
the value of what they are chasing.

Slowly the player uncovers what it costs: the Division is **abducting people
and forcing them to absorb quintessence** through brutal skeletal-essence
ritual techniques. Most die. Some become **Essence Wraiths**, which kill and
then absorb the essence energy of the person they killed, gaining some of
their abilities.

The player uncovers the plot and confronts the **director** — just after he
completes a breakthrough. The Division flees. To follow, the player must
reach the next region.

### Act 2 — underground (Ontaria)

What was an official institution in The Nek is now outlawed and underground.
The player has to find the **secret aperture to their astral space** to reach
the next cell of scientists.

After defeating them the player meets **Rob Collins**, an energy vampire, who
says that stopping the Division means going on to Elehyd. Rob will help
occasionally but will not come into town — he and the guards are at odds,
on account of his killing and eating people's souls. The new essence wraiths
offend his sense of self. Some of the player's party do not trust him.

Rob is Gold rank and is not afraid of the player; he simply judges that their
dedication to rooting out the Division makes them worth working with for now.
He needs help investigating in town, and offers to send a **portal
specialist** once the player is strong enough to survive the next region.

### Act 3 — the badlands (Elehyd)

*(Investigation continues here; the portal specialist Rob sends is the way
out, and will not open the way below Gold rank.)*

### Act 4 — the king's city (Bratugal)

The city bustles, but odd disappearances have everyone on edge. Finding where
the Division hides in town, the player learns they are **in league with the
local king** and must break their hold on the city.

Earning reputation with the noble houses, the player discovers the king can
be **deposed by a council of noblemen and women**. Winning their favour gets
the king replaced by a more amenable one, who outlaws the Division — but they
fled before the deposition, and the player must hunt their backup base.

It is in the **far west**. Infiltrating it, the player meets essence wraiths
that broke loose in the rush. At the centre, one of the wraiths transforms
back into a person: **Rory Matheson**, chief engineer, the breakthrough that
fled from The Nek. They kept him caged and let him feed on person after
person. He carries dozens of essences now and is certain that at diamond rank
he will be able to **drain the gods themselves**.

Rory attacks, summoning monsters. Beaten, he explodes into a second phase: no
longer person-sized, a Cthulhian mass of tentacles and darkness.

Past him, in the back room, is a **child** — very sick, with an aura that
feels badly wrong. The player takes the child, meaning to find a healer.
**Rob** is waiting outside. He does not attack; he thanks them, and goes
inside to make sure everything is "cleaned up."

Suspicious but more worried about the child, the party heads back toward
town — and on the way **every god except Liberty** messages them, each asking
that the child be brought to their own temple, each offering something
incredible for the effort.

*(Story continues past this point.)*

---

## The player's team

The player does not travel alone for long. Four companions join over the
first two regions, each with their own essences, their own generated
abilities, and a rank that tracks the player's within about ten percent
either way. When the party is in a settlement and one of them has fallen
behind, they ask for a moment on the stones and rank up.

| Member | Role | Who they are | Met in |
|---|---|---|---|
| **Zeke Clark** | Healer | An older human man, farmed the Nek bottoms for thirty years. Bonded Life late, and badly, and lived. | The Nek |
| **Encykla Britanika** | Ranged DPS | Elf, the elder twin by eleven minutes, and has never once let it go unmentioned. | Ontaria |
| **Ædia Britanika** | Melee DPS | Elf, the younger twin, and the one who gets there first. | Ontaria |
| **Benjamin Iskarys** | Tank | Young for a Celestine, which still makes him older than everyone else here. | Ontaria |

ROUND 46 -- their real models landed, each with a movement and an attack
animation (for Zeke and Encykla the attack is the spell-casting animation).

## The cast, and who exists yet

Beyond the party, round 46 brought the faces the story needs:

| Who | Role | In the world? |
|---|---|---|
| **Rob Collins** | Sends the portal specialist to Elehyd | Yes, in Cadence |
| **The Pirate Queen** | Runs the Elehyd packet | Yes, at Ontaria's dock |
| **Dockhand Bray** | Harbour hand | Yes, at Ontaria's dock |
| **The two researchers** | Division of Essence Research | Art only -- await the questline |
| **Rory Matheson** | Two-phase boss | Art only -- awaits the questline |
| **The Essence Wraith** | What the Division makes | Art only -- awaits the questline |

The last three are extracted and loaded but deliberately unplaced: a boss
standing in a field with nothing to say is worse than no boss.

## Cadence

The capital is no longer generated. Round 46 transcribed the user's own city
map: two districts either side of a river with three bridges, forty houses on
their drawn lots, the blacksmith, auction house and adventurers' guild in a
civic row on the southwest bank, eight temples down a north-south avenue on the
east bank all facing west, and the Department of Essence Development alone in
the southeast corner. The spawn point and the quest board stand on the spiral
the map marks at its centre. All five cities and towns are walled.

## Implementation state (round 66)

**Act 0 is built.** Eight pages, Knowledge speaking, played once on a new run
and skippable. `player.act0Seen` keeps it from replaying.

**Act 1 is built.** Seven stages through the Department of Essence Development,
which -- see the round-66 plan entry -- did not exist in the world until this
round, because `_buildCadence` has been dead code since `CADENCE_OUTLINE`
became `true` in round 49. Director Hallam Vesk, Wren Ashcombe and Rory
Matheson are placed inside it and every stage changes what they say. The act
ends with four Essence Wraiths in the lab and the Division fleeing The Nek.

**Rory Matheson appears in Act 1 as a junior nobody looks at twice.** That is
deliberate and load-bearing for Act 4: his return only lands if the player met
him first.

**Still not built:** Acts 2, 3 and 4 -- the astral aperture, Rob Collins on the
map, the portal specialist, the noble houses and the deposition, the western
base, Rory's two-phase fight, the child, and the gods' offers. Ontaria, Elehyd
and Bratugal carry the plot in NPC dialogue (round 65) and nothing more. The
companions still have no story beats of their own beyond recruitment.

## Implementation state (round 46, kept for the record)

**Built:** the four-region world and its terrain (rivers, lakes, ocean,
peaks, bog, roads that fade to dirt), region-banded spawns with packs and
super packs, lazy monster activation, rank-gated exits with their keepers,
the tyranny of rank, The Nek's southwest road with its two hamlets and their
own bounty boards, and every interior moved into the reserved band.

New in round 44: **all six settlements outside the capital are actually
built** — Harrowmoor, Little Gale, Sailmend and Cobb Point in Ontaria, Karsk
Landing in Elehyd, Vashra in Bratugal — with houses, services, shopkeepers
and bounty boards. **Ontaria's packet dock** runs out over the water and the
boarding pad sits at the end of it. **Elehyd's portal square** is a paved
disc ringed by eight standing stones inside Karsk Landing. **The party**
exists as four recruitable companions who follow, fight, heal and meditate.
Large bosses telegraph area attacks two seconds ahead; spells home; the gate
keepers are real posted guards.

**Not built yet:** the Division of Essence Research as a questline (lab,
abductions, wraiths, the director), Rob Collins, the astral aperture, the
noble houses and the deposition, Rory Matheson's two-phase fight, the child
and the gods' offers. Regions 2–4 now have their settlements and landmarks
but not their bridges, interiors or quest content, and the companions have
no story beats of their own yet — only their recruitment.
