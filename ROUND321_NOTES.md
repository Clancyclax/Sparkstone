# Round 321

User list (six items, with screenshots) and what changed.

1. **Trees too close** — `generateForest` re-rolls a tree's position up to six times if it lands within `TREE_MIN_GAP` (170 px) of another (spatial hash); a tree that finds no room is dropped. `generateTownTrees` skips a candidate that is too near. A crown is ~290 px wide, so 170 lets them overlap a little but never stack.
2. **"Nobody bothers the collector not triggering to start"** — **root cause NOT confirmed.** Defensive change only: the contract's start radius is wider (`DEFEND_START_RADIUS` 380) and the start now floats a line of text so it is visible when it fires. Untested against what he saw; I need to know where he was standing and what the collector did.
3. **Side wall "green smear"** — found and fixed. The smear was the camera's clear colour (`#3a5a3a`) showing where nothing was drawn: level-0 ground tiles next to a *lower* neighbour (the Nek slope has levels below its arrival) got no cliff face, because faces were only built for tiles whose own height was non-zero. They are now built when either south-east neighbour is lower. Thin ramp faces (3–5 px) no longer get a full-height shadow band/fringe (`_cliffTex`).
4. **Wall abilities (Strand Line etc.)** — new `src/scenes/wallFxMixin.js`: each wall is drawn as a line of animated element pieces (fire, frost, lightning, nature, shadow, radiant, transcendent, physical), spaced 22 units, grow in 0.25 s, fade in the last second; a pull wall is a vortex. 4.1: they had little or no effect: a **pull** wall now drags enemies inward (90+ px/s) and hits what reaches the eye; a **burn** wall hits every 0.7 s per enemy; every landing applies the card's debuff and DoT (`_wallHit`). A rider's `summon_terrain` wall got a position and facing too.
5. **Resource generators interact with the kit** — measured: of 99 kits with a second resource 53 had nothing that spent it, and the duplicate (Wind Reserve + Storm Reserve) came from progressive build order. Now: lock-aware `heldAltKind()` (a stored passive counts), a kit holding a resource turns its next plain attack into a paid one, its cooldown/major attacks take a price when it is still short, the finisher spends everything, and when the passive lands late the attacks already held are retrofitted (clones, written back to the lock; never for a passive that came from a lock, so stored kits are not rewritten). Census over 100 grown kits: 0 duplicates, 94 with two or more spenders.
6. **Resources that change play** (6.1 WoW review, 6.2 casters): the old round-306 "surge" (random bonus damage) is gone. Each resource now does something while held:
   - **Rage** (melee, tanks) — built by hitting and being hit; at 50+ you are Enraged: +15% damage dealt, 10% less taken.
   - **Souls** (death, dark) — built by kills; each soul +4% damage.
   - **Shards** (earth, cold, craft, order, light, identity) — built by hitting afflicted enemies; each shard +6% damage against an enemy carrying your affliction.
   - **Energy** (motion, ranged, flyer, alchemy) — refills 10/s; above half, all your cooldowns run 20% quicker.
   - **Charge** (new; storm, air, fire, mind, space, life, water) — Arcane-Charge/Maelstrom style: each damaging cast builds one (max 4, one fades per 5 s idle); each charge is +10% damage **and** +20% mana cost on damaging spells.
   Casters no longer land on Energy (it was the only resource that needed nothing dead or afflicted, so every caster family voted for it). Old saves keep the resource they have; their card text is refreshed to say what the game now does (`altDescRefreshed`).

Tests: `tools/tests/test_round321.cjs` (19 checks); `test_round306_world.cjs` lost its surge checks.

Not done / open: see OPEN_TASKS (item 2 root cause; sample authored abilities against alternates; Round 301 item 1; r305 voice parts).

Known, not mine: suite 308_kits (weapon-less kits roll "any weapon" specials: 0) fails at HEAD too.
