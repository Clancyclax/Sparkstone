# Round 134 — fourteen items

Five bugs, nine improvements. Four decisions you made up front shaped the work:
the editor gets both city layouts and region terrain, a death drops a bag you
can walk back to, the dual-spear model is for dual-wielding specifically, and
the difficulty bump is "firm" rather than "hard".

---

## 1. Kill quests were never broken. You could not see the quarry.

"Nobody walks the water" is a `plague` contract for a **Pallidjaw Hatchling**;
"A Name Worth Having" is the Hero's first chapter, a hunt for a **Pallidjaw
Yearling**. Both crocodiles — and the crocodile carries `ambushChance: 0.45`.

A lurking monster is drawn at **alpha 0.16** and does not move, chase or exist
as far as the player is concerned until you step inside **120 units**. Three
tiles. So you take the contract, walk to the pin the contract put on your map,
stand in an empty field, and report that the quest did not trigger.

Measured end to end before touching anything: the accept spawned it, the tag
was on it, and killing it set `ready` and `_questDone`. The machinery ran
exactly as designed, and its design made the quarry invisible at the one place
the game had promised it would be.

A bounty target is the one monster you have been *told* about — "it has been
sighted in the wilds; taking the notice puts it on the map". An ambush is a
surprise, and being sent to a surprise is a contradiction. **A named quarry no
longer rolls `lurk`.** Every crocodile the world spawns on its own still does;
only the one with a poster does not.

## 2. The potion slots were showing you the menu, not the bag

`_cyclePotionSlot` walked `CONSUMABLE_IDS` — the whole catalogue, three
draughts and Prism's five cooking rungs, whether or not you had ever seen one.
Round 125 folded her dishes in there deliberately and that was right; what was
wrong is that the **cycler read the catalogue rather than the bag**, so two
D-pad buttons walked a list of eight where six were things you could not
obtain yet.

It reads the bag now, in catalogue order. A bound potion keeps its place at
zero held — drinking your last draught must not unbind the button that drinks
it. An empty rack says "none carried" rather than offering arrows that do
nothing.

## 3. The sewer ladder

Round 92 arrived at a **hardcoded offset**: two tiles north-west of the ladder.
That was dry paving on round 82's hand-laid map. Round 133 re-laid the maze by
generator, and the same offset now lands one tile from the channel.

A constant offset is an assertion about a map, and this project regenerates the
map. So the arrival is **searched for** — floor, not the ladder tile, and as
far from the channel as the exit chamber allows. The generator picks the
ladder's own tile the same way instead of `grid[ey + 3][ex]`, and
`sewerFaults()` now refuses a map whose ladder is within two tiles of the
water, so this cannot come back quietly.

| | before | after |
|---|---|---|
| ladder to channel | 3 tiles (luck) | **5** (searched, and checked) |
| where you land | 1 tile from the water | **4** |

## 4. The cultist walks

The delivery's static pose is **pixel-identical** to `npc_cultist_man.png`,
which is how we know it is the same model rather than a new one. Packed into
the grid every character sheet uses, plus **ten recolours derived from the
existing cult variants** rather than authored: those variants are exact
one-to-one colour maps of the base (55 colours, zero ambiguity, measured), so
the map is read off the pair of idle sheets and replayed onto the walk. 96.6%
of pixels map exactly; the remaining 3.4% take the nearest palette colour.

Until this round **no NPC in the game had more than one frame per direction** —
every `npc_*.png` is 8×64. The party and the named cast have walked since round
46, but they live in `CHAR_ART`; nothing on this side of the fence had a second
state to be in. `NPC_ART` entries now carry an optional `walk`, and one
function knows how to read it.

Audited: all thirteen `CHAR_ART` characters have walk art and every one that
**moves** already uses it — the party through `_drawPartyMember`, Rory through
`_updateCharArtMonsterSprite`. The rest do not move: the two pirates, Rob
Collins and the two researchers stand and talk. The Essence Wraith is loaded
and unplaced, and has been since round 46.

The cultist **woman** has no running frames in the drop, so she keeps her single
pose. Named in the data rather than left implicit.

## 5. Prism's confluence

Two faults, one report.

`_partySocketStone`'s guard read `slotIdx < 3`, so the **confluence slot was
never checked at all**. Harmless on the four companions who walk in with three
essences; on Prism — who is the entire point of the feature — it accepted
stones from the moment she joined, consuming them out of your bag to generate
against a confluence that did not exist.

And `_partyEssencesFor` ends in `.filter(Boolean)`, which is right for counting
and wrong for every **indexed** read. Fill her middle slot first and the
compacted list makes that essence slot 0 — so the guard refused the slot that
had an essence and admitted the one that did not.

## 6. The editor: a Cities tab

Everything the Regions tab does is a **surgical byte edit** into `regions.js` —
it knows the exact span of a coordinate and replaces those bytes. That works
because every array it touches already exists at a known offset.

The two arrays this needed do not. Six of the seven regions have neither, so
writing one means inserting a property into a region object: finding the right
brace, matching the indentation, hoping the next edit finds the same place.
That is how an 1,100-line authored file becomes an unparseable one.

So the tab owns **`src/data/regionEdits.js`** and rewrites it whole, every
time. `regions.js` folds it into `REGIONS` as it builds them, so nothing
downstream needs a second lookup.

**Three tools.** Building puts a structure on a tile — round 107's mechanism
unchanged. **Clear ground** puts a `blank` down, which is new: a procedurally
placed building has no identity to delete (it is whatever landed on lot eleven
this run), but every generator already keeps clear of a placed entry, so
"remove" is expressible as "claim this ground and put nothing on it". Move is
the two together, and that is not a workaround — it is what moving a nameless
thing *is*. **Paint terrain** lays a rectangle of one of five surfaces, applied
after every generator has had its say.

One pass had never asked the keep-clear question: the **town generator**. Round
107 only needed scenery and props to route around a fountain. `_claimPlaced`
also moved up above `_buildSettlements`, which round 107's own argument already
implied and this round made true.

`test_round134_editor` drives the real tool against the real project — place,
clear, paint, drag, delete — then parses the file it would write and runs the
**game's own validators** over it. 21 checks. An editor that writes a file the
game refuses is worse than no editor.

## 7. Dual spears

`isTwoHanded('spear')` is false, so two spears in two hands is a loadout the
game has always permitted and never had a picture of. `resolveArmoredState`
answers `spear_spear` for it — body type 2 has had that pose since round 32 —
and body type 1 fell back to the bare-handed chest set. A knight holding two
spears, drawn holding nothing.

The drop is that pose at body type 1's own grid, so it needed packing and
nothing else. The packer **checks** it matched an existing member of the set
rather than assuming: a sheet at the wrong cell loads without error and gives
you eight frames of a third of a knight.

## 8. Something to back away with

Round 132 gave thirty-eight species a reason to retreat and nothing to do from
back there, so the fight became walking after something that would not stand
still. Your words: "Currently many enemies trying to keep their distance just
run away."

Kiters only — a circler orbits at contact range and is already fighting. No new
roster field: `monsterGait` already answers it. The bolt travels at **150 u/s**,
about a third of a walk, so it is visibly in the air and sidestepping works;
the cadence is the species' own cooldown lengthened 1.6×; it hits for 0.7 of a
bite, because a shot taken from safety is priced below the blow you have to
walk into contact to land. It shares `atkCd` with the bite — a monster has one
attack rhythm.

Its own list, not `this.projectiles`: that array's loop walks every monster for
every bolt, and teaching it a direction would mean a branch in the hottest loop
in the file.

## 9. What dying costs

Unconsolidated experience is `pendingXp` exactly — round 127 made meditation
the act of consolidating and that field the bank, so the phrase needed no
interpretation. It is lost.

Everything not equipped drops as a **bag where you fell**, recoverable. A
second death replaces it. The paperdoll, both hands, your socketed essences and
stones and the Society vault all survive. **The purse survives too**: the ask
says "items", coins are not in `inventory`, and emptying your pockets is a much
harsher rule than the one written.

Spare weapons go in the bag and the one in your hand does not — through
`_loseWeapon`, because a save written before round 115 has an `ownedWeapons`
entry with no count beside it and only `_weaponCount` knows how to read that.

The death screen says what it cost. A penalty you have to discover by opening
your bag is a penalty you will report as an inventory bug.

## 10. The composer

Three faults, all measured over a hundred random kits before and after.

**The split was front-loaded.** Round 109's pacing rule never fired for anybody
who had not filled all sixteen sockets — `socketOrdinal` is *padded*, jumping by
four at the end of every unfilled slot, so a kit with two stones a slot reported
16 while it had filled 8. And the end-game rules computed `needA` against a
target of eight actives an eight-socket kit can never reach, so
`needA >= remaining` came true in the last slot and forced **active** on every
socket left. The kit was told to sprint for a target it was never going to hit.

| stones per slot | before | after | (target) |
|---|---|---|---|
| two | 9.2 / 2.8 | **8 / 4** | 8 / 4 |
| three | 11.0 / 5.0 | **10 / 6** | 10 / 6 |
| four | 12.0 / 8.0 | **12 / 8** | 12 / 8 |

Your 14 active / 6 passive sits exactly on the old curve. Summons and auras are
passives, which is why those are the two things you noticed missing — kits with
a summon went from 56% to **89%** at two stones a slot, 74% to **98%** at three.

**The stone decided what an ability was made of.** `materialFor` gave the stone
first refusal and fell back to the essence, which is precisely backwards from
"the essence is the #1 influence in an ability". A Lizard stone (family
`serpent`, element `nature`) in a Volcano confluence produced *nature*
abilities in venom's vocabulary, in a build about magma. Swapped. The stone
keeps everything it actually shapes — the category bias, the categories it now
refuses, the lever door, the name, the creature a summon is.

**The animal stone was wasted.** Every piece existed and none were connected:
`summonCreatureForSocket('stoneLizard')` has returned the lizard profile since
round 121, and the lizard's family carries `summon_bonded` in its bias — but the
summon was only ever a *candidate* among twelve. It is a seat now, subject to
the same discipline as the four floors: it narrows candidates already in the
pool, runs after the active/passive filter, and if it and the split disagree the
split wins. Two creature summons per kit, and only an animal stone may buy the
second — because on your own example an earlier Fire socket had already taken
one and the Lizard found the seat spent.

Kits naming their animal: **19% → 51%**. And the text says it:
*"Calls a burning lizard for 1 minute."*

**Turtle and Resolute.** `bias` was always a preference and a preference cannot
stop anything — the turtle's four defensive categories still lost to a 35%
movement-speed passive because nothing said they should. `FAMILY_AVOID` is the
other half, and it is deliberately three families long: `guard`, `earth` and
`cold` refuse haste, which is the handful of cases where a player seeing the
result would call it a bug. Measured on a Resolute/Shield/Iron kit with four
Turtle stones: **zero** movement-speed abilities, where there was one.

**Two abilities that read alike.** `usedNames` has stopped a repeated *name*
since round 16 and neither it nor the template check catches two different rows
producing the same sentence. The shape is the **first two sentences with the
numbers taken out**, and that took two wrong answers: the whole description
caught only exactly-identical pairs and let your own example through (it
differs in one clause near the end); the first sentence alone over-reached,
because a large family of attacks opens on the same stock bolt line and then
does completely different things. Identical openings: **15 per 100 kits → 2**.

## 11. "Consolidate your gains."

Round 129 took your wording and applied it to half the window's life — while
the pour ran. The moment it finished it fell back to a rank-flavoured line from
round 127, and the pour is seconds while the sitting is not, so that is what you
actually read. All three are deleted; "Meditate to" goes with them, because you
are already meditating by the time you can see it.

## 12. X/12 and X/8

`X/12` is the notation for a *capacity*. Twelve is not that — it is the shape
the composer aims for, which round 56 let a limit-breaker miss on purpose and
which item 10 makes it miss more often by design. Round 56 answered "(13/12)
reads as a bug" with a paragraph printed above the list; the honest fix is to
stop making the claim. The heading prints the count. Twelve is still the number
of hotbar slots and is still stated where it bites.

## 13. Companion auras

`m.passives` has held a companion's passive abilities since round 116 and
nothing had ever read them — round 50's note says so plainly ("everything else
a passive does has no companion-side runtime to land in"). So a companion
generated a field and wore it invisibly.

Each one is drawn now, in its own colour, resolved at the **companion's** rank.
One ring builder takes an owner; two copies would have been two places for "what
does an effect aura look like" to drift. "In alignment with the player" is read
as the button: one press pulls the whole team's fields in. A party walking into
town with the leader's aura retracted and four companions still blazing is
exactly the sloppiness round 121's training exists to teach out of you.

Their fields are **visible and synchronised, not yet ticking** — the effect loop
is deeply player-centric (44 auras, player stealth, player position) and making
it generic is a different job. Said here rather than left to be discovered.

## 14. The wilds

Two constants, not a change to round 116's doubling, for the reason round 132
gave when it added the ladder: each is a separate statement on a separate day,
and one combined figure loses which is which the first time one is wrong.

| | before | after |
|---|---|---|
| iron+ health | 2.0× sheet | **3.0×** |
| iron damage | 2.30× | **2.76×** |
| The Nek's bronze | none at all | **133 groups**, mean danger 0.90 |
| The Nek's groups | ~600 | **937** |
| pack median | — | **4**, floor raised by one |

**The Nek had no bronze to increase.** Its ladder stopped at tier 1, so the
hardest thing in the region was a lone iron wanderer — and the southwest gate
will not pass you under Bronze. A player at Bronze with two companions who
cannot leave yet had literally nothing left that could threaten them.

Density is **added**, not tightened: shrinking `SPAWN_GROUP_SPACING` would move
every group in the world, because the grid is what the seeded placement is drawn
against. A cell past 0.55 of the way out gets a second roll at 50%, from its own
seeded stream — this file warns three times that an extra draw against the build
sequence regenerates the placement of everything after it.

Super packs are excluded from the size multiplier: a `[10,30]` band's ceiling is
decided by the frame rate, and multiplying it is a performance change wearing a
balance change's clothes.

**The prologue is exempt from all of it.** The ask names its own scope — "once
players have recruited 2 companions" — and the sewer is the one stretch with no
companions at all, already carrying two explicit rulings that it is too
dangerous rather than too easy.

---

## Checks

- **Data lane: 531** (was 520)
- **`test_round134_world`: 53 checks**, played in the running game (three
  consecutive clean runs)
- **`test_round134_editor`: 21 checks**, driving the real desktop tool against
  the real project
- **Full regression: 139/139 recorded, zero red** — 122 asserting suites green,
  17 informational probes, nothing dead

Seven suites went red on this round's own changes. Every one was a **superseded
claim**, not a regression, and each was widened rather than deleted:

| suite | what the round changed under it |
|---|---|
| `test_round41` | "the starting region holds only Normal and Iron" → *nothing above Iron stands near the starting town*, and the bronze is a long walk out. Round 41's sentence was protecting a new character; that is where it still bites. |
| `test_round43` | The Nek's declared bands. The line under it — *every region matches its declared bands* — is why this is a moved claim and not a loosened one. |
| `test_round77a` | Read `label === 'solo'`, which is the six bands that happened to be called that. Asked by **size** now: the top tier roams and comes alone or in twos. All seven regions pass, including the six the old spelling covered. |
| `test_round116` | Round 116's doubling now carries two more riders. Reads them off the shipped constants rather than re-typing 3.0, so what it asserts is that four rulings all compound. |
| `test_round132_world` | Same, for the ladder. An iron monster at 2.76× proves three rules; 2.30× would mean the new rider never landed and 2.40× that the ladder had been thrown away. |
| `test_round127_cycle` | The caption no longer changes when the pour ends, so `captionAfter !== caption` can never be true. The claim in its own name — *the garden stays* — is untouched and is what it asserts. |
| `test_round48_wire` | A Bear essence's ward is physical now, and `grantResistance` answers physical with **armour**. Both halves are asserted: a physical essence hardens you, an elemental one resists its own element. Stronger than the check it replaces. |

And one red that was **already failing on the r133 tree** — confirmed by running
it there in a worktree before touching anything. `test_round49_taunt`'s expiry
bar asked that a released monster has one non-closing second in three, which is
true of a wander leg shorter than three seconds and false of a longer one; a
roam leg pointing at the player closes steadily for the whole window. Measured
r134 at 74 px/s held against 26, 26, 26 released, and r133 at 114 against 31,
30, 20 — both a monster in `wander` closing at a quarter of its taunted rate,
both reported as "still coming". The bar is the **rate** now.

Three of this round's own checks were caught being wrong before they shipped:
the world suite picked a contract the player's rank could not take and blamed
the quarry for not spawning; it used `'water'` and `'earth'` as essence ids,
which are not essences, and blamed the confluence for refusing them; and its
kiter probe **died to the bolts it was measuring**, so everything after the
first death read zero — found by instrumenting a run that reported no bolts
while a direct call fired one.
