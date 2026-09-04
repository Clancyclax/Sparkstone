# Round 81

Version stamp **81**.

---

## 1) The Reliquary, built

Draft 9 of round 80 is now the Essences page. Four leaded panels in brass, side
by side, each an essence with its four awakening stones set as glass roundels
behind rarity-coloured came.

**What it fixes, measured on the page it replaced:** the old tab was four
stacked cards of eight text rows each, so seeing a whole kit took about 1,150px
of scrolling and the three essences never shared the screen with the confluence
they formed. All sixteen sockets and all four essences are now one view.

Every field the old page showed is still there and still comes from the same
place — the standing bar, the permanence line, the innate grant, the four
sockets with their granted abilities, the confluence's spine. What changed is
the shape.

Three things worth recording, all found by looking at the render rather than at
the markup:

- **Short names.** `STONE_DEFS[id].name` is *"Awakening Stone of Absolution"*,
  which is right on a shop line and wrong in a 90px roundel — it wrapped to
  three lines and pushed the panel out of alignment. `STONE_CATALOG` carries the
  bare name, so this is a field choice, not string surgery.
- **Equal heights.** Four panels of different heights leave their brass plaques
  at four different levels, which reads as four unrelated objects.
- **The A/P badge.** My first pass at making ability names wrap set
  `display:inline` on `.granted`, which collapsed the badge — it is a flex child
  with a fixed 13px box. The fix keeps the flex and lets it wrap instead.

## 1.1) One system for every window

> *"Align the overall inventory windows to match from a color/border/font
> standpoint."*

Measured before touching anything: **four** different border treatments
(translucent white at 0.14 and at 0.28, gold at 0.4, a flat `#ffd54f` on
buttons), **three** golds used interchangeably for the same job (`#ffd54f`,
`#ffca28`, `#ffe082`), and panel grounds ranging from `rgba(10,9,7,.97)` to
`rgba(14,16,20,.97)` to `rgba(255,255,255,.04)`.

Rather than repaint each panel — which is how it got that way — the palette is
declared once as tokens on `:root` and everything refers to it. A future round
changes the game's whole chrome by editing one block.

The palette is the Reliquary's: brass edges, a dark stained ground, and a serif
for anything that is a **name**. Sans stays for body text and numbers.

Verified on the rendered page rather than in the stylesheet, because a rule that
matches nothing still greps clean:

| | after |
|---|---|
| Panel border colour | one, `#6b5a35`, across all 7 panels |
| Corner radius | one, 6px |
| Headings | 17 of them, all Georgia, all one gold |
| Button borders | one, `#6b5a35` |

Two real bugs fell out of doing it:

- **The potion rack's Clear buttons were unreachable.** Four inflexible children
  in a 292px column add up to more than 292, so all three hung off the right
  edge of the panel. The select is the only child that can give, so it does.
- **Dropdowns were the browser default** — a white rectangle on every dark
  panel.

## 1.2) The attribute above the essence

Not just tidiness. The attribute is what the slot **is** — a permanent bond to
Power or Speed — and the essence is what was put in it. *"POWER / Blood"* reads
in the order the thing is actually built; the old title line, *"Slot 3 — Blood —
bound to Power"*, buried the durable half at the end of a sentence and led with
a slot number that means nothing to anyone.

Checked as geometry: the attribute's bottom edge is above the name's top edge in
all four panels.

---

## 2) Weapon icons only for weapon stones

> *"Only weapon awakening stones should use a weapon in a circle icon. All
> others should use a stone."*

The game's own taxonomy already had the answer: four weapon families — **blade,
polearm, bludgeon, ranged**. Twenty-seven stones were drawing from
`stone_weapon_round.png` and **eleven of them were not weapons**: Persistence,
War, Resolute, Zeal, Champion, Might and Wrath (all *force*), Chain and Net
(*craft*), Magic (*mind*), Lightning (*storm*). All eleven now draw gems.

Two more things were fixed while the map was open:

- **Shovel and Sword shared one cell**, so two stones were drawn identically.
  Shovel and Trowel now have their own hafts.
- **Fork** got the trident and **the Unbroken Line** got the glowing blade —
  both exact matches that were sitting unused.
- **Twelve stones were in no map at all** and fell back to a hash into the gem
  sheet, so their art was effectively random. All twelve are now declared.

**Gun and Hook stay on gems.** Both are weapon-family and there is no firearm and
no hook on the weapon sheet; a wrong weapon is worse than a right gem. Named
here rather than fudged.

### Your twenty-five new models

They arrived mid-round and they are in. Packed as `stone_pixel25.png` (48px
cells — deliberately not downscaled to match a neighbour, since the Reliquary
draws a roundel at 34px and a halo at 52px) and assigned **by what the art
depicts**, read off a 3× contact sheet rather than off the prompts — both
prompts are one line for a dozen cells and cannot tell a clock face from a black
hole.

Mystical/portal: Moment (clock), Wind (spiral), Rune, Deep (whirlpool), Void
(black hole), Shield, Moon, Dimension (starfield), Healer (green cross), Fire,
Malign (carved beast), Water, Growth.
Elemental: Sun, Cloud, Earth, Eye (reptile eye), Crucible (magma), Crops, Rain,
Dark, Lightning, Surge, Light (pearl), Iron.

**On your note that you were seeing fewer stones than you had uploaded:** the
drafts only ever showed 16 because a mockup renders one kit. But there was a
real shortage underneath it — before this round 192 stones drew from 155
distinct cells. It is **163** now, and 25 more stones have art of their own
instead of a recolour of someone else's.

---

## 3) The display cap, +30%

4000 → **5200**, and it now lives in `src/data/budgets.js` instead of being
typed into two suites that had to be found and changed together. Round 66 is
green for the first time since round 78: **4,070 of 5,200**.

Worth recording what the number is: it is not an engine limit, it is a
self-imposed budget standing in for frame cost on the weakest machine the game
is expected to run on, and nothing here measures that. If the game starts to
feel heavy, this is the first number to look at and the city walls are the first
thing to pool.

---

## 4) Story and quests — see `STATUS_QUESTS_AND_STORY.md`

That file is rewritten from a full audit. The previous version was written at
round 70 and several of its headline claims had gone stale — it still said the
main story could not be completed, which stopped being true in round 76.

The short version:

- **Act 0** — 8 pages, 462 words. Finished.
- **Main chain** — 11 authored stages. **Acts 1 and 2 walk end to end.** Acts 3
  and 4 do not exist; Act 3's square is built but its one character is a string.
- **God quests** — 8 gods × 2 tracks × 4 chapters × 2–5 steps = **224 steps**.
  64 authored chapter titles and premises; the steps are composed. Completable.
- **Companions** — 68 authored lines across four gated arcs. Finished.
- **Board quests** — six kinds, entirely generated from a per-week seed, on top
  of ~136 authored vocabulary entries and nine request openers.
- **Cults** — 10 fully authored cults with builds and 20 loaded spritesheets,
  **imported by nothing.** Nobody is ever spawned.
- **The guild chain does not exist**, and has slipped from round 78 → 79 → 80 →
  unscheduled. Round 80's notes do not mention it.

**My recommendation, in order:** the guild chain; then place the cults (the
content and the art are already in the build — it needs a placer, not a writer);
then Act 3; then the bounty bonus; then Death's undead roster, which placing the
cults would supply.

### Two defects found in the audit

- **Fixed — the deferred god follower.** Clicking "Not yet" on a follower reward
  nulled the offer and nothing re-offered it, so one click destroyed a
  chapter-3 reward permanently. The deferral is now written to the player, the
  temple priest re-offers it, and it survives a save.
- **Reported, not fixed — the bounty bonus.** A turn-in rolls a bonus, prints
  *"+ bonus loot!"* and grants nothing; about 22% of turn-ins do this. Left
  alone because deciding what the bonus *is* is a design question, and I would
  rather ask than invent a loot table.

---

## And the intermittent fault is solved

The *"update fault (frame skipped): Cannot read properties of undefined (reading
'sys')"* that has been surfacing in roughly one run in five since round 79 is
**found and fixed**. It was not a destroyed familiar, a dead monster, a god or a
turret — round 79 and round 80 guarded all of those and it kept coming back.

`_cityPropPool` and `_sceneryPool` hold off-screen sprites parked for reuse.
Every other pool in the scene is cleared where its content is rebuilt —
`_buildRocks` clears `_rockPool` on the line after it rebuilds `obstacles` —
and these two never were. So a world rebuild destroyed every sprite while the
two arrays went on holding references to them, and the next prop to cross the
viewport edge popped a destroyed Game Object and called `setTexture` on it.

Intermittent because it needs a rebuild **and** a prop crossing the viewport
edge afterwards, which is why it survived a 34-second soak, eight forced
midnight rolls and twenty-six kit rebuilds without once reproducing — none of
those rebuild the world. Round 74's suite does, which is why it showed there
every time.

`test_round74` is 74/74 with *"no runtime errors — []"*, and round 49's taunt
suite now passes *"the game still boots and plays"*.

---

## The regression

94 suites. `tools/run_data.sh` 21/21. `test_round81` 22/22.

**Four suites this round's work made wrong, all corrected:** `round20` and
`round74` counted the old essence markup by class, `round47_ui` looked for the
exact sentence the plaque replaced, and all three now check the same property
against the new page. `round66`'s cap literal moved into `budgets.js`.

Everything else that fails is pre-existing and recorded in round 79's and 80's
notes: round19 (2), round23, round24, round28, round38, round45, round47's three
real-time passive soaks, round48_runtime, round49_taunt's expiry soak, round65,
round48_agentA/B, round77a's leash. The two suites that showed the setTexture
fault no longer do.
