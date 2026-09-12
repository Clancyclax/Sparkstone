# Round 89

Version stamp **89**.

Twelve bugs and a research question. Ten fixed, one is not what it looked like,
and one cannot be fixed here because the art is not in the project.

---

## The two that were worth the round on their own

### 10) Abilities were changing after they awakened

> *"abilities are actively changing as more are awakened. Abilities should be
> set when they awaken, they may unlock additional effect as you rank up, but
> they should never outright change into a different ability."*

**Measured, before the fix, over eight sockets on one character:**

```
stone 1   0:innate  Healing Elixir            ->  Transmute Blast
          1:innate  Cast of Perfected Draught ->  Perfected Draught Ascendant
          2:innate  Blessing of Relentlessness->  Practiced Mastery Reprieve
stone 5   1:s0      Quintessence Closing      ->  Phial Closing
          2:innate  Practiced Mastery Reprieve->  Passage of Practiced Mastery
stone 6   2:innate  Passage of Practiced Mastery -> Blessing of Relentlessness
```

Six identity changes, and slot 2's innate changed three separate times — once
all the way back to what it had originally been.

`rebuildKnownAbilities` rebuilds the **entire** kit from scratch on every call,
and it is called on every socket, every bond and every load. The selection is
deliberately synergy-aware: `synergyScore(c, knownList)`, a 200-point
kit-completion bonus, the aura/perception/buff/absorb counters, the `usedNames`
set. So the pool a socket draws from and the score every candidate gets both
depend on what else is in the kit **at that moment**. Socket a fifth stone and
the first stone's ability is re-scored against a kit that now has an aura in
it, and a different candidate wins.

That is good generation and a broken promise. The README says it plainly:
*"Neither bond can be undone. An essence slot and its stones are permanent,
which is what makes the choice a choice."* An ability that silently becomes a
different ability three sockets later breaks that in the one place the player
is least able to notice.

**The fix is a lock, not a rewrite of the generator.** `player.abilityLocked`
records what each socket key produced the first time it produced anything; a
later rebuild whose lock still matches the stone and essence actually in that
socket reuses the stored ability instead of re-rolling. Generation, ordering
and caps are untouched. It still ranks up — `rankAspectsAt` reads the rank at
display and apply time — which is the other half of your sentence.

**After: zero changes across the same eight sockets, 12 of 12 locked.**

### 6) The rivers had holes in them

The fourth frame of `water_deep.png` and `water_falls.png` contains **zero
opaque pixels out of 2048**. The renderer picked it one time in four, nothing
drew, and the camera background showed through — `OUTDOOR_BG` is `#3a5a3a`,
which is exactly the flat dark olive in your screenshot.

The history is the lesson:

- `WATER_DEEP_COUNT` and `WATER_FALLS_COUNT` used to be **3**. Round 78 raised
  both to 4 and left a comment celebrating that *"one frame of each has never
  been drawn in seventy-four rounds"*. It had never been drawn because it is
  empty. The 3 was not a bug being fixed — it was the bug being introduced, and
  the evidence for the change was the symptom of what made the change wrong.
- Round 83 then **found** the empty frame while palette-shifting the sewer,
  wrote it into `ROUND83_NOTES.md` — *"harmless in the river, where the plan
  never picks it"* — and fixed the sewer only. That sentence is false:
  `TILE_WATER_DEEP` has no plan at all, it is a bare `pickAllowed` over all
  four frames. The bug was seen, described, and reasoned past.

Fixed twice over. The two frames are eliminated, and `ELIMINATED` is now
**authoritative** — plans list global frame numbers directly and nothing
filtered them, so The Nek's shallows plan named the blank frame straight
through the list that exists to stop exactly that. `test_round89` opens the
PNGs and counts opaque pixels per frame, so the next art drop with a blank
frame fails a test instead of appearing in a river six rounds later.

---

## The rest

**1 & 2 & 2.1 — where you start and where you wake.** The descent moved in
front of Act 0, so the cold open is read from inside the circle of bones rather
than from the middle of a sunlit market square. Respawn was one line —
`this.world.x = this.townOrigin.x` — so every death anywhere put you in
Cadence; dying in the prologue teleported you out of a prologue you had not
finished, with `sewerDone` still false. Three anchors now, nearest-in-story
first: the circle you woke in, then the border tile you crossed into a region
on, then that region's capital once you have reached it.

**3 — name entry.** The creator opened with focus **nowhere**, so a player
typing their name was typing into the game. `_handleGlobalKeys` stands down
while an `<input>` has focus — but nothing had focus. And the letters that do
damage are exactly the ones names start with: **C toggles the character
creator**, so typing "Clayton" closed the creator on the C. That is literally
"cancelled out". I is the inventory, M meditates, E interacts, WASD walks. The
team-name prompt has focused its own input since round 48 and says why in a
comment; the same reasoning had never been carried across. The suite types
"Clayton Mire" without clicking first.

**4 — the farm pin was inverted.** The only gate was `m.recruited`, and
`_buildParty` creates every member un-recruited at world build — so the pin was
on the map from the first frame of a new game, and **disappeared the moment you
accepted the job**. Gated on `player.farmQuest` now, which is the state that
means Zeke has told you. `test_round79b` had pinned the old behaviour; its
claim is kept and its condition corrected.

**5 — the sewer's slimes.** 20%, applied to the spawned monster rather than to
the slime table, because the same species is fought all over The Nek at full
strength. Measured in the suite against the same slime spawned outside:
`slimeViolet: 5 outside, 4 in the sewer`.

**7 — the city props.** `CITY_PROP_ART.scale` was **0.78** while the stalls
were tripled to 2.55 in round 79 — a 3.3× disparity nobody revisited. A barrel
was ~40px against a 60–75px character: half a person high. Now 1.95, and
grouped: each anchor gets a pile of one to three fanned along a wall at
`radius + 26` instead of a single piece at `+34`. Median distance from a wall,
measured: **32 units**, about half a tile.

Two self-inflicted regressions caught by the estate on the way: scaling the
collision radii by the same 2.5 made **nine of eleven prop kinds unplaceable**
(a collision circle is a circle on the *ground*, and most of what a bigger
scale buys an isometric sprite is height — 1.6× is the footprint growth), and
tripling the prop count pushed the forest build from ~700ms to 856ms against
its 800ms budget, so the anchors are halved and the piles keep the total the
same. Grouped was the ask, not *more*.

**8 — the confluence verdict is gone, the shared levers stay.** The three
essences are permanent. A player reading *"the confluence is thinner for it"*
has been told they made a mistake they cannot undo, about a decision the game
gave them no way to evaluate in advance. That is not feedback, it is a verdict
delivered after the appeal window closed. The tier still drives what the
confluence generates; it just stops grading you on the page you cannot act
from.

**9 — "the guard is 10% stronger"** had an abstract subject, an abstract verb
and no quantity, and "the guard" is a phrase the player has seen nowhere else.
What potency actually does is scale every one of the ability's rolled fields,
so it says that: **"everything it does is 10% stronger."** A striking ability
still reads "it strikes 25% harder", and the per-rank labels keep their flavour
at the moment the rank is announced.

**11 — one popup per absorb.** `_announce` did `this._advanceQueue = list`,
which threw away whatever was still being read. Socket four stones in a row and
three announcements were destroyed before anyone saw them — the abilities
awakened, the player was simply never told about three of them. The queue is
appended to now, which also fixes the order.

---

## 12) The per-piece armour — the art is not in the project

You answered "already in the project — go and find it." **I looked, and it is
not there.** Saying so is more use to you than a plausible-looking half-fix.

What is in `public/assets/armored/` is **167 files, and all of them are the
same full plate suit**. The 45 states are weapon/shield loadouts — `sword_axe`,
`dagger_shield`, `hammer_hammer` — of one identical body. There is no
`helmet_*`, `gloves_*`, `boots_*` or `legs_*` anywhere under `public/assets/`,
and `resolveArmoredState(rightWid, leftWid, hasShield)` never sees an armour
slot at all. So "fully armoured or not at all" is not a bug in the renderer; it
is the only thing the shipped art can express.

**Where your memory is probably right.** `extract_round32_armored.py` says the
source zip carried **56 PixelLab states** and its table maps only indices
**13–55**. Index 0 is the bare body, index 12 is the full-metal chest, and
**states 1–11 and 20 were never extracted** — which is exactly where partial
armour poses sit in that kind of export. The raw folder (`assets_raw/round32/`)
is not in this container and is gitignored, so I cannot check or extract them.

**What I need from you:** the round-32 body-type-2 zip. With it I can extract
the eleven missing states and wire the per-piece resolver; the naming and cell
geometry conventions are already established by that extractor.

Two related things worth knowing while that is pending:

- `armorPaint.js` **already** recolours per slot — helmet, chest, gloves, belt,
  legs, boots each have their own Y band and take the equipped item's own
  colour. That machinery is finished and waiting.
- `_armoredActive()` gates on helmet + chest + gloves + boots and **ignores
  belt and legs**, so a character with empty leg and belt slots already renders
  as fully armoured. Left alone deliberately: tightening it would make full
  armour *harder* to reach, which is the opposite of the complaint.

---

## 13) Wind and water shaders — the readout you asked for

Short version: **water is easy and mostly does not need a shader; trees are
moderate; the real cost in both cases is this project's specific plumbing, not
the GLSL.**

### What the build gives you to work with

- `type: Phaser.AUTO` — WebGL when available, **Canvas when not**. Shaders do
  nothing in Canvas, so anything shipped needs a graceful fallback or the
  feature silently vanishes for some players.
- Everything is individual `add.image` sprites, viewport-pooled: trees come out
  of `forestTrees` into `_treePool`, ground tiles out of `_groundTiles`.
- The display list cap is 5,200 and round 43 asserts it.
- **There is no water animation at all today.** The four water frames are
  spatial *variants* picked by a position hash, not an animation.

### Water ripple

| | Effort | Risk |
|---|---|---|
| **Frame cycling, no shader** | ~half a round | very low |
| Real WebGL pipeline | ~1 round | medium |

The cheap route is most of the win: the sheets already carry three usable
frames per water type and nothing cycles them. Advancing the frame on a timer
gives you moving water in Canvas *and* WebGL, with no pipeline, no fallback
problem, and no interaction with the tint the sewer fog writes.

A real shader — UV scroll plus a sine distortion — looks better and costs more:
water tiles are separate Game Objects, so you would want one batched water
layer rather than a pipeline per tile, and that restructuring is the actual
work.

### Wind sway on trees

| | Effort | Risk |
|---|---|---|
| Fragment-shader UV warp | ~1–1.5 rounds | medium |
| Per-sprite transform wobble | ~half a round | low, and looks worse |

A Phaser sprite is a single quad, so vertex displacement is not available
without subdividing; the practical route is a fragment shader that offsets UV
as a function of height up the sprite, so the crown moves and the trunk does
not, phase-seeded per tree from its world position.

**The specific risks here are this project's, not the technique's:**

1. Trees are **pooled and re-parented constantly.** A pipeline assigned to a
   sprite must be re-applied on every pool reuse — and this is precisely the
   bug class round 88 spent a session on (`_qmarkPool` handing out destroyed
   sprites, three rounds of hunting).
2. The suites read tints — round 82's fog check asserts
   `img.tintTopLeft === 0xffffff`. A pipeline that intercepts tint breaks fog
   assertions that have nothing to do with wind.
3. The CI container renders in **software**. Round 88 measured any running CSS
   animation at 66ms/frame there. Shaders may not run at all, so no suite can
   depend on them and the visual verification would have to be by screenshot.

**My recommendation:** take the water frame animation first. It is half a round,
it works everywhere, and it is the change you would actually notice while
playing. Then decide on the tree shader with that in hand.

---

## Tests

**`test_round89` is 26/26**, and three of its checks read the artefact rather
than the code, because that is where the bugs were: it opens the water PNGs and
counts opaque pixels, it *types* a name whose every letter is a hotkey, and it
sockets eight stones comparing each ability to what it was.

**Regression: 99 suites — 69 ok, 15 probes, 13 failing, 2 dead. No new
failures**, down from 15 + 2.

Three regressions I caused and the estate caught, all fixed: the forced
prologue skip fired the Guildmaster's welcome in ~90 suites (a character who
*skips* the prologue is a returning player and has been welcomed already); the
over-scaled collision radii; and the forest build budget.

---

## Numbers

| | |
|---|---|
| Bugs fixed | 10 of 12 |
| Ability identity changes over 8 sockets | 6 → **0** |
| Blank water frames reachable | 2 → **0** |
| City prop scale | 0.78 → 1.95 (stalls 2.55) |
| Clutter distance to a wall, median | **32 units** |
| Sewer slime damage | 5 → 4 |
| Estate | 99 suites · 13 failing · 2 dead (was 15 · 2) |

## Carried forward

- **The round-32 armour zip**, for #12.
- Water frame animation, per the readout above.
- What lives in an astral realm — the cult camp, the packs, the nodes.
- Crafting: spec answered in round 87, build order starts with `expose`.
- The pre-existing failures: `round19` tile variety and town trees, `round23`
  prop atlas, `round24`, `round28`'s crowd, `round38`, `round41`, `round43`'s
  biome packs and build time, `round45`, `round47`, `round48_runtime`.
