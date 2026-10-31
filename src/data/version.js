// ROUND 42 -- the build stamp.
//
// The user asked for "a small unobtrusive 'Playing version Number X'" under
// the map, and the reason it earns its place is bigger than tidiness: three
// consecutive update packs sat unapplied on the Desktop without anyone being
// able to tell, because a running build says nothing about which round it
// is. Now it does -- one glance under the minimap answers "did the update
// land?" before any bug report is written.
//
// GAME_VERSION is the ROUND number, which is the unit this project has
// actually been developed and delivered in. Bump it in the same commit that
// ships a round; nothing else reads it.
// ROUND 104 -- BUMPED TO 104, AND ROUND 103's BUMP NEVER HAPPENED.
//
// The user, after the rebuild got past its earlier stop:
//
//   "STOPPED the version stamp reads '102' but round 103 was expected."
//
// The guard was right and the build was wrong. Round 103 shipped eleven part
// zips and a patch, and not one of them changed this line -- so the r103
// bundle genuinely contained a game that called itself 102, and the last line
// of defence was the only thing that noticed. Exactly what the comment three
// lines up asks for ("bump it in the same commit that ships a round"), and
// exactly what a comment cannot enforce.
//
// So there is now a check that can: tools/data_checks.mjs asserts this number
// against the highest ROUND<N>_NOTES.md in the repository. A round that writes
// its notes and forgets its stamp fails the three-second lane instead of
// reaching somebody's Desktop.
// ROUND 105 -- 105, bumped in the commit that ships it, which is what the
// comment above asks for and what round 104's check now enforces.
// ROUND 108 -- 108, and this bump carries THREE rounds.
//
// 106 (the map intake pipeline), 107 (hand-placed objects) and 108 (the lever
// split) were each committed and each left unshipped, so the build on the
// Desktop stayed at 105 through all three. That is precisely the situation the
// stamp was added for in round 42 -- "three consecutive update packs sat
// unapplied on the Desktop without anyone being able to tell" -- and it
// happened again, this time on the sending side rather than the receiving one.
//
// The round-104 check compares this number against the highest
// ROUND<N>_NOTES.md in the repository, and it could not catch this: the notes
// for 106, 107 and 108 did not exist either, so the check was comparing 105
// against 105 and agreeing. A stamp check is only as good as the thing it is
// checked against, and "the round wrote no notes" was the hole in it.
// ROUND 109 -- 109, bumped in the commit that ships it.
// ROUND 110 -- 110. Ships as a PATCH over the r109 parts already on the Desktop.
// ROUND 111 -- 111. The ability overhaul is complete: coverage 133/133/0.
// ROUND 112 -- 112. The user's six-point review of three generated kits.
// ROUND 113 -- 113. The user's affliction library: 1,088 named afflictions.
// ROUND 114 -- 114. The user's 23 senses, five ranks apiece, and flanking.
// ROUND 115 -- 115. The user's 44 auras, and the sewer's traps.
// ROUND 116 -- 116. Eleven bugs and four updates; the maps turn 45 degrees.
// ROUND 116.1 -- a correction shipped between rounds, on the user's two
// reports: the confluence table defers to the HWFWM TTRPG sheet where the
// sheet has already answered, and a region's map stops drawing its
// neighbours. Point release rather than 117 because neither is new work --
// both are round 116 not finishing something it started.
// ROUND 116.2 -- the user's canonical confluence list: eight authored trios,
// six Doom and two Dragon. Data only; 116.1 built the machinery for it.
// ROUND 116.3 -- the TTRPG sheet's whole Confluence Essences tab: 371
// canonical trios, 101 confluences, imported and cross-checked. Data only.
// ROUND 116.4 -- the raw sheet export is kept beside the derived table and
// the data lane now checks all 2,226 of its rows through confluenceDefFor,
// so the table can never drift from the source without saying so.
// ROUND 117 -- 117. The composed cast: pool draw, recombination, particles.
// Back to an integer, which also un-fails round 41's build-stamp check --
// `/^Playing version \d+$/` has been red since 116.1 because the stamp reads a
// point release. Nobody noticed for four of them: the check lives in an
// [isolated] suite that flaps under contention, so its red was indistinguishable
// from the noise around it.
// ROUND 118 -- 118. The cast palette follows the essence, the ward is halved,
// and every active template is proved to draw something.
// ROUND 119 -- 119. A safe way through the sewer, and a clause that stops
// claiming a cost the ability never charges.
// ROUND 120 -- 120. Weapon essences make weapon abilities, and Spike stops
// pretending to be a javelin.
// ROUND 121 -- 121. Special attacks swing the weapon, and auras stop ticking.
// ROUND 122 -- 122. Every ability knows which essence made it, auras reach the
// condition table, and every aura carries a signature that is its bearer's.
// ROUND 123 -- 123. The bearer's mark comes from their own affliction pool and
// the signature takes a second lever: [Bleeding] on 52% of auras becomes 92
// distinct marks, and 19 mechanical shapes become 97.
// ROUND 124 -- 124. Prism Stubby: the sewer escort, the Society a day later,
// and a companion with no essences the player fills from their own bag.
// ROUND 125 -- 125. Prism's chain: seven jobs, seven kitchens, and an answer
// assembled out of what she actually did -- naming whichever confluence the
// player built her.
// ROUND 126 -- 126. The user's bug report: a rank costs more than the one
// below it, one sitting crosses one rank, and a monster you have outgrown
// stops paying for itself.
// ROUND 127 -- 127. Meditation consolidates your gains instead of taxing
// them, quests feed the same pool, the bars show it filling while you fight,
// and the soul garden opens over your head when you sit down.
// ROUND 128 -- 128. The soul garden gets the user's real flower art, with
// each bed's blooms in its own essence's colour; the window is 40% larger;
// and cancelling the sitting closes it on the keypress.
// ROUND 129 -- 129. Two-tone blooms for the essences that are two things,
// a window twenty per cent wider again with the planters in a grid that
// cannot overlap, and the caption in the user's own words.
// ROUND 130 -- 130. The window grows half as much again and reads clearly;
// and at Silver the garden stops being a window at all -- you stand in your
// own soul, your followers walk it, and M snaps you straight back out.
// ROUND 131 -- 131. One plain grass tile under the whole soul space: the
// ground recedes and the planting is what you look at.
// ROUND 132 -- 132. Meditation works in any town and any building in one;
// the ranks get a damage ladder instead of a single step; monsters circle and
// break away instead of all walking the same straight line; the Society holds
// a chest that outlives the character; and the prologue stops dealing every
// player the same eight stones.
// ROUND 133 -- 133. Nine items: companion kits name their stones, the Society
// splits into a hall and a market with four brokers and two new tracks, the
// nonsense "more behind it" line is deleted, nine red suites go green, quests
// finally mark on the map and places finally have names on it, the sewer is
// twice as wide and Prism just follows, recruiting somebody is a conversation,
// and the aura moves to D-pad down.
// ROUND 134 -- 134. The user's fourteen-item bug report: kill quests stop
// hiding their quarry, the potion slots stop offering food nobody owns, the
// sewer ladder comes up on dry paving, the cultist walks, Prism's confluence
// refuses a stone until she has essences, the editor gains a Cities tab, body
// type 1 gets its dual spears, monsters that keep their distance get something
// to keep it with, dying costs your unbanked xp and leaves your bag where you
// fell, the composer stops front-loading actives and lets an animal stone buy
// its animal, meditation says "Consolidate your gains", the ability headings
// stop printing a quota, companion auras are drawn and follow your toggle, and
// the wilds get harder in four measured ways.
// ROUND 136 -- 136, bumped in the commit that ships it.
//
// Round 135 did real work (the Cities tab's real-art renderer) and did NOT
// bump, because it changed nothing under src/ -- it was a tool-only round, and
// the stamp describes the GAME. Its notes are written now alongside 136's,
// because tools/data_checks.mjs asserts this number against the highest
// ROUND<N>_NOTES.md AND that the notes have no gaps: shipping 136 without
// 135's notes fails the lane, which is the check doing exactly its job.
// ROUND 136.1 -- a point release, because this ships ART.
//
// rebuild_desktop.sh takes TARGET from the highest round on the Desktop, and
// reuses Sparkstone-web only when the folder already stamps TARGET. A patch
// named for the round that is already built would therefore never be applied.
// 136.1 is higher than the r136 part set, so the rebuild lays this over it --
// which is the whole delivery path new art has always taken.
//
// data_checks.mjs floors the stamp before comparing it to the newest notes
// file, so 136.1 still matches ROUND136_NOTES.md.
// ROUND 141 -- 141. The user's sixteen chests, and the rule that the PLACE
// picks the model: a cult's hideout wears its cult's, a landmark an element
// has taken wears that element's, and everywhere else wears the plain wooden
// one its region can afford -- which is how "the majority in the NEK should be
// the wooden chests" comes out at 85% without a die being weighted.
// ROUND 142 -- 142. The two contracts you stand and hold: a siege at a small
// town against waves of one strong species, and a bandit crew raiding a
// homestead for its stores. One wave engine, two stakes -- a life and a yard --
// because a life cannot be got back and property can be defended down to the
// last sack.
// ROUND 143 -- 143. Tree variety by quadrant, blended bilinearly at the
// borders, with groves of 20-30 of another tree; and the forest build cut from
// 3,430ms to ~1,200 by giving the hand-placed claims and the city props the
// same spatial index round 43 gave the rocks. The bar they were failing is
// re-specified per region, which is the number that will still mean something
// once the regions are doubled.
// ROUND 144 -- 144. The world doubles: every region 2048 tiles a side, every
// authored position scaled, every size left alone, and the user's 639
// hand-placed entries TRANSLATED by exactly how far their own settlement moved
// so the wall circuits keep their size and their city. Four times the ground
// for +8.6s of build and +63MB, and per tile the build is twice as fast as it
// was.
// ROUND 145 -- 145. The building review: 1,053 buildings became 586, the lone
// ones went from 61% of the world to 27%, and every house that still stands on
// its own has somebody living at it who ALWAYS has something to ask. Four
// steadings a region in place of 532 scattered shacks, and the review found
// four things round 144 had broken and nobody had looked at: Clark Bottom Farm
// was at the bottom of a lake.
// ROUND 146 -- 146. The backing store goes 960x600 -> 1920x1200 with the camera
// zoom doubling alongside, so the renderer produces 69% of the pixels on screen
// instead of 17% and the view is unchanged at 768x480 world units. No art
// touched, no UI element moved. Ships as 146 rather than the brief's "135"
// because rebuild_desktop.sh takes TARGET from the highest round on the Desktop
// and an r135 patch would never be applied.
// ROUND 147 -- 147. Five squares between market stalls, enforced as a live test
// at placement rather than as arithmetic that a fallback can defeat: 51 of 57
// stalls had a neighbour inside five tiles and now none of 66 does, with no
// market losing one. Plus the user's two tracks -- the Cinderwaste's theme,
// closing the hole the music table has documented since round 104, and a
// wilderness-house track at the 57 lone dwellings round 145 peopled.
// ROUND 148 -- 148. The test estate, not the game: the regression renders at
// half resolution with nearest sampling (?render=0.5&filter=nearest, a knob only
// the harness turns) and 28 suites wait for the world instead of guessing at it.
// 171 min -> 116 min. No gameplay changed; the camera zoom scales with the
// canvas so the visible world is 768 x 480 units either way.
// ROUND 149 -- 149. The user's animation drop: body type 1 goes from ONE run
// animation to 28 (it had been compositing weapon cutouts onto the chest run
// since round 33) and body type 2 from 28 to 44. Packed at the source's native
// 92, which is RUN_CELL, with no resampling. Mapping taken from the repo's own
// records and proven by silhouette rather than guessed.
// ROUND 150 -- 150. The eight folders round 149 refused to guess at, named by
// the user off labelled contact sheets. Seven are packed -- spear with shield,
// sword, scythe, axe, hammer, whip and dagger -- giving body type 1 its first
// spear art in any pairing: 38 idle sheets and 35 real runs. The eighth, two
// staves, is NOT packed: the staff is two-handed and ranged, so no loadout can
// hold one in each hand, and round 150's reachability check now proves that
// rather than assuming it. Four of the eight guesses would have been wrong.
// ROUND 151 -- 151. Not the game: the pipe that delivers it. The user ran the
// rebuild to 150 and the published site served 140, with the build verified,
// the push successful and nothing anywhere saying otherwise -- ten rounds
// delivered and never seen. Every stage proves its own output now: the deploy
// asks the live site what it is serving instead of trusting a push, the entry
// point is stamped with the round at build time, and the page itself says so
// when index.html and version.js disagree. tools/test_rebuild.sh, the one test
// of this path, could not run at all and does now.
// ROUND 152 -- 152. The user's partial-armour bug, both halves. The inventory
// paperdoll had never drawn partial armour at all -- `_portraitSource` had the
// full harness and the bare body and nothing between -- while the world sprite
// had drawn it since round 93. And round 93's "IDLE ONLY... the bare body
// returns the moment they move" is over: all seventeen mapped sets have a run
// now, out of the drop that has been sitting there since round 149.
// ROUND 153 -- 153. The townsfolk leash, which described nothing: 14 of 16
// people measured were outside theirs, the longest for 41.5 seconds at a
// stretch, mostly standing about and chatting. Going home is a STATE now, with
// the same time allowance the journey out has always had, and a walker with
// somewhere to be steps round a wall instead of giving up at it. Longest
// stretch outside a leash: 41.5s -> 4s, and nobody strolls off one at all.
// ROUND 154 -- 154. The ground under every settlement, and why five asks did
// not fix it: every one of them measured 100% PAVED, because TILE_PATH is
// paved in the data and dirt on the screen. Sixteen of twenty-three had never
// had one city tile. They all do now, the small ones are paved to twice their
// radius, and Milrow -- 253 tiles of grass under 62 painted patches -- has a
// floor for the first time, because settlements are stamped after the paint
// rather than before it.
// ROUND 186 -- 186. The street plan for the two promoted cities, and the
// instrument that had been reporting on them. Three hand-written tables keyed
// by settlement id -- the wall square, the city floor, and the road grid's
// block -- none of which round 179's promotions were added to. Slagward had no
// square, so `_cityFloorHalf` returned null, so test_round100's probe divided
// by it and reported 0% road and 0 buildings at ANY radius: both of round
// 184's findings about that city, and the radius revert it argued for, rest on
// a number the probe could not produce. All three tables are derived now.
// ROUND 187 -- 187. Cadence, traced from the user's street map at three times
// the old city's size, and then walled properly: the circuit is pulled out
// clear of every street, opens only where the Nek's three roads (rerouted
// onto the city's own streets) cross it, and stands a gate arch in each of
// those three openings. Houses put through the placement rules they were
// never checked against, temples spread across their district, one 5x7 pond
// of water per park, and the old city's leftovers moved out of the new one.
// ROUND 187.1 -- the user's markup of the top-down plan (brick over excess
// parkland, roads and ponds; straighter roads) and a bridge below the river's
// fork, reached round the outside of the wall. A point release, because r187
// already shipped and the rebuild script skips a round it has already built.
// ROUND 188 -- the other five walled cities rebuilt by Cadence's rules at
// three times the size: a street grid, four districts, all eight temples,
// generated walls with arched gates where the roads come in.
// ROUND 189 -- death animations and the bodies they leave (lootable, and
// usable by five new corpse abilities), the fallen cities' dead, Zeke at
// silver, and wall courses flush against the gate arches.
// ROUND 190 -- gate guards, the Society hall on the map, half-size solid
// fences, water sounds from live water, entrances at the drawn door; abilities
// that make sense (spammable attacks, streaks only on short cooldowns), hidden
// confluence build classes, abilities that level on their own, cube icons,
// the island city's music; rank-effect text that explains the move, buying
// as many weapons as you like, a controller dropdown.
// ROUND 191 -- the open items: named villagers walk on their walk sheets
// (Ovry Coombe), every monster family has a part (Prism's Nek kitchen can be
// offered again), a companion's familiar is one of her twenty, the draw budget
// re-measured for the grid cities, and the long-failing suites brought up.
// ROUND 192 -- walk cycles for the zombie, wight, goliath, mage, the three
// priests and the cultist woman, with every god-robe and cult-colour variant.
// ROUND 193 -- the townsman and the plate knight walk; the adventurous girl
// (now Aedia's model) and the legless noblewoman are out of the game.
// ROUND 194 -- the overworld: a 24 x 13 grid over the biome index, squares
// generated from the pixels in them, and the region border opening the map.
// ROUND 195 -- the southern continent: twelve regions measured off the biome
// index, built one at a time into the spare world slot, behind a gold-gated
// packet from the northern coast.
// ROUND 196 -- nine modes of transport, a yardmaster selling them in every
// city's Society market, a Society hall in the two cities that had none, and
// fifteen new people with their movement, death and attack animations.
// ROUND 197 -- riding what you bought: the overworld ambushes, wheels that
// cannot climb, an inside for all nine vehicles (three levels and a merchant
// hall for the dragon), and round 196's guard and hikers finally placed.
// ROUND 198 -- the regression moves onto the workstation: 195 suites in 18.6
// minutes at 12 workers against three-plus hours, the container-only paths
// that stopped 15 of them running anywhere else, the timing suites re-derived
// as multiples of a machine measured in the same page, and the waits that
// were really wall clock rewritten to wait for the thing they were about.
// ROUND 199 -- the map draws what you are travelling in, round 196's four
// attack sheets are read and painted per crew so a bandit keeps his patchwork
// mid-blow, a share of every overworld ambush is now people rather than
// animals, and a guard's health stopped being NaN the moment anything hit him.
// ROUND 200 -- five new monster families through the recolour pipeline; six
// building kits (walls, pillars, arches, stairs, floors in six materials) that
// give a cave's rock line a face; a fenced stable yard outside every walled
// settlement holding everything you own; the transport made the team's home,
// with companions dismissed to it, quarters that grow with the crew's rank and
// reflect who sleeps in them, and somewhere to rest; xp divided by everyone
// standing with you, story content exempt; thirteen mounts in sixty-five
// colourways as the bronze tier of a bonded familiar; and the vehicle essence
// given twelve boons, from quiet roads to putting out to sea at Gold.
// ROUND 201 -- the books' own voice: canon cooldowns in hours compressed to
// playable minutes, [Castigate] with [Sin] and [Mark of Sin], tab targeting
// with a ring at the feet and a target frame perception can fill in, six new
// controller chords, and sixteen ability slots on a bar that sizes itself.
// ROUND 202 -- five weapon proficiencies (magical tools the only hard gate,
// and a staff spends mana), a stamina curve that rises per tier and halves
// when you are trained, weapon essences that teach what they hand you; and
// every clause that compared an ability to an earlier rank of itself deleted,
// with nine rank ladders that name a mechanic instead of a percentage.
// ROUND 203 -- five shapes round 201 could describe and nothing could roll:
// the transformation template, cooldowns that read "Varies" and are decided
// at use, a per-second drain of two pools that ends when either runs dry,
// abilities that reach every ally but you, and TRANSCENDENT damage -- the
// blue-white light that ignores armour, wards, immunity, retribution and the
// rank gap alike, gated below Silver behind a condition you must arrange.
// ROUND 204 -- the card tells the truth: only the ranks you have reached, at
// the level you are, with the cost and cooldown your level actually charges.
// Summons given hit points and made healable; the armour clause stapled onto
// every raw-lever strike removed; a mastery line that teaches a weapon at
// iron, sharpens it at bronze and calls it to your hand at silver; scaling
// clauses that say what rises; 116 machine-named afflictions renamed; and
// every spell effect at 40% opacity.
// ROUND 204b -- a buff is not a shield. `ladderKeyFor` ended in `return
// 'guard'`, so every self-buff and every unclassified template in the game was
// handed the shield ladder by default and told that breaking it staggers
// whoever broke it. New `boon` ladder, which is also the fallback, and the
// guard rungs that talk about a pool now require one.
// ROUND 267 -- Sereth Vane cut to four swings of the sword you find; his drop
// floored at Uncommon and drawn ONCE from the eligible pool by weight rather
// than rejection-sampled with an unweighted fallback on its tail; tables a
// quarter smaller measured on screen width; the Adventure Society down to one
// table; furniture pushed out of the walls it was standing in (bed, nightstand,
// the bar's first counter, a den's ritual table) with a clamp behind the
// corrected layouts; temple pews scaled to the stone bench beside them
// (62/54, measured off both sheets); a finished quest's map pin moved from the
// dead monster to whoever is owed it; the estate railing taken off the stable
// yards; and the Yardmaster moved out of the Society market hall into every
// yard, with his shelf held to the first five transports until Act 2.5.
// ROUND 279 -- spelled Hemorrhage; every passive has an on/off switch on its
// roster row (the kit's effects read the running kit, `_liveKnown`); a canon
// passive innate is allowed and the stones make up the active it does not
// supply; Midnight Eyes built rung by rung and placed as Dark's innate.
// ROUND 280 -- every first ability a low-cost attack (a canon innate yields
// the first slot unless it is one); Midnight Eyes moved to Dark + the Eye
// stone (Vision as the similar), its card printing the Eye stone by approval;
// the HUD in the mockup's style: an action dock with the passive bar under the
// actives (click a passive to switch it), two potion slots bottom-left, and
// the essence colours on every ability cell and as rings on the portrait, the
// map and the potions.
// ROUND 281 -- the three pools emptied by the canon-name filter refilled by
// renaming the clashing rows; an untrained aura refuses to switch off ("You
// don't know how to control your aura yet."); a tighter player panel with the
// bars beside the portrait; the minimap 30% smaller and a fifth see-through;
// the potions in the dock's lower row beside the passives; the user's icon
// pack recoloured into eight potion kinds in seven sizes (56 real items,
// coloured ones pouring over 2-10 s, clear ones instant with sparkles), the
// food and 45 monster parts; drops sized to the rank that dropped them.
// ROUND 282 -- a kit holds a canon ability or its renamed twin, never both,
// and a canon ability once; more than one aura or perception only with a
// savant (Aura Savant/Weaver, Many-Phased/Prismatic/Compound Eyes, ~0.3%, one
// per essence up to four); items: effects on top of stat lines (Uncommon
// sometimes, Rare 1-2, Epic 2-4, Legendary 3-5), a maker's description and
// type tags, Epic+ sets of 2-3 with bonuses, Legendary at 0.001% carrying
// growth conditions, Divine never rolled.
// ROUND 321 -- trees apart, side-wall holes closed, wall abilities drawn and acting, second resources that change play.
// ROUND 322 -- the last 88 fusion chunks reviewed (data only).
// ROUND 328 -- forty new monster families (eight shades each, fetched when needed), the body type 1
// BattleMage outfit, and body type 2's BattleMage re-packed.
// ROUND 329 -- one stray comment in the round 325 edit of canonRuntime4Mixin.js swallowed a closing
// brace and the game stopped starting; fixed, and tools/tests/test_syntax_all.cjs now parses every module.
// ROUND 330 -- the market vendors stand behind their counters (drawn behind the stall, not cropped over it), and
// Prism's swing clock runs every frame of the escort so she cannot get stuck on the attack animation.
// ROUND 331 -- lamps with a wall or tree beside them stopped lighting: their baked shadow brush was never flushed
// (Phaser 4 buffers dynamic-texture draw/erase until render()), so it stayed blank and erased no night.
// ROUND 332 -- a bound item sold to a vendor is labelled and announced as broken down for materials (bindings are permanent).
// ROUND 333 -- a lurking monster that is struck stops lurking (it sat invisible, hurt and passive: "an enemy that is a round
// circle"), and a lurker a perception sense reveals is drawn as a silhouette.
// ROUND 333 (also) -- THE WARDROBE: per-piece colours for the knight and the BattleMage, replacing the item-icon shading.
// ROUND 334 -- bridges stand on every road and ford across generated squares (not only the starting map); a crafted weapon
// is an inventory item of its own (name, rarity, effects); six ability names that read as slurs were renamed;
// every hotbar key is bindable from the first ability, and the bar draws only what is bound.
// ROUND 335 -- skill books are read in a rite (a long channel with a ground circle, rising motes and the book turning its pages, ending in
// a burst) and a martial art needs a Deepening Rite after each rank-up; monsters within a screen of a fight swarm the player (ranged
// ones still kite and circle); "Nip", "Spook" and "Cracker" are gone from ability names.
// ROUND 336 -- a companion who carries an essence is Iron at least (Zeke showed as Normal beside a player at Iron 0).
// ROUND 337 -- Leather & Chainmail, both bodies: the sewer's default outfit, with Wardrobe colours.
// ROUND 338 -- the second spell-animation drop: 17 effects in eleven colours, and random rainbow-smoke bursts on looting.
// ROUND 339 -- walls, lines, rings and stars of flame: many copies of the fire-wall sheet, traced in order or lit all at once.
// ROUND 340 -- the third spell-animation drop: AOE liquid, ice patch, flamethrower, AOE electrical/magical, drain beam.
// ROUND 341 -- the leather outfit draws exactly what is worn (a weapon no longer implies a full set); vortex and tornado animations.
// ROUND 342 -- shop and auction stock is seeded off the playthrough's run seed, so every new game stocks differently.
// ROUND 343 -- the standard bolt flies head-first: a straightened `boltaim` sheet replaces the tumbling `boltfly`.
// ROUND 344 -- lamps in every city (double radius), starter quests near town, track-all quest tracker, ritual rooms, fence/bridge/camera/Olb fixes.
// ROUND 345 -- Cadence terraces with two-tile alleys (denser), back-alley events (thief, gang, injured guard), houses to buy or rent.
// ROUND 346 -- every lamp anchored by its foot at one visible height; bridge decks drawn as ground tiles that match the paved footprint;
// animal spirit heads and animations over creature-essence casts and creature monsters' attacks.
// ROUND 347 -- animal spirits also answer to the CONFLUENCE essences (Dragon, Manticore, Griffin, Gorgon, Phoenix, ...).
// ROUND 348 -- the sewer's weapon drops are swords only.
// ROUND 349 -- menus survive slow frames (key taps latched, per-frame occlusion pass culled, a faulting frame still runs Esc/I); the Wardrobe is controller-navigable.
// ROUND 350 -- torches and sight stop at walls; one more half-lit tile around vision, lamps and torches; city lamps light up (one lamp type per city, set back from the road);
// alley rewards and lane check; a single aura and single perception unless a savant power; wake in the Society hall after Olb; interact is L2 + touchpad; stairs never half on a road.
// ROUND 351 -- Prism recruitable (story pages no longer close themselves; arrow keys and E work in a conversation); roads run in straight square runs; tile-strip fix.
// ROUND 352 -- Leather & Chainmail verified end to end in the running game (both bodies, 45 weapon sets + 31 partial-gear looks, every slot equip/unequip); the partial-gear attack stand-ins are listed (LEATHER_ART_GAPS).
// ROUND 353 -- the new start-screen track (public/audio/music_start_screen.mp3, wired in audio.js), the README
// screenshots retaken from this build, and the README rewritten against the data tables.
// ROUND 354 -- the touchpad is split: bare = loot / use (never talks), L2 + touchpad = talk (round 350 had moved all of interact onto L2).
// ROUND 355 -- a lamp standing in front of a house now draws in front of it.
// ROUND 356 -- half the city lamps, lantern glow, lit city nights; the Society hall walkway and door; the Cadence plan.
// ROUND 357 -- weather (ten kinds); the nine magical theories, their perks and the arcane sites.
// ROUND 358 -- rituals as a moment: a track per theme (13), thirty-second non-combat rites, escalating per-essence effects, the
// chant, the drain on mana/stamina/life; the exit is a beam of light, not a doormat.
// ROUND 359 -- Olb's astral space: 3x route, starscape, rocks and odd grass, cult packs, the god in view and striking Olb, the
// soul bar and soul resource, steady speech in a shake, portal and explosion sheets, the infirmary, Olb's talks and shield.
// ROUND 360 -- grass 3x denser and bending in travelling gusts (trees too); lightning, storm and water rites; snow only in the
// mountains and ash only on the volcano; the desert sandstorm; snowstorm and sandstorm sounds.
// ROUND 361 -- astral blessings pull hard enough to shape a kit (Legion: ~4 summons in a run's first twelve, was 1; the
// Throne and the Book about double their kind); "racial" is "nature" everywhere; natures for the Outworlder, Human, Elf,
// Celestine and Draconian, six abilities each; the companions' natures; Nature Gift Evolutions, additive only, under
// stress or as a reward, with the astral blessing the first to evolve once every essence ability has awakened.
// ROUND 362 -- the other adventurers: 38 of them (six alone in the Nek and Ontaria, eight teams from story region 3), with
// stories, rivalry and races, board claims, losses and somber tellings, and the surge; nature gift evolutions from three
// achievements; Dragon Breath, Mana Integrity, Magic Affinity on afflictions, mind-control resistance and heals received
// built; human Essence Gifts transfigure like canon's.
// ROUND 363 -- the cast to canon: elves live human spans, nobody drops an essence, celestine hair and eyes are gemstones
// and metals; the model sheet; leonids and draconians on 80x80 and taller; the runic and leonid six built.
// ROUND 364 -- a celestine's eyes are the same gem or metal as their hair.
// ROUND 365 -- the 38 other adventurers in their own sprites (idle, run, attack, and a death played once and held, in 8
// directions, feet on the anchor; the leonids and draconians drawn a head taller); the user's catalogue of 3,984 nature
// gift evolutions, for the Astral Blessing first and the other five Outworlder abilities after it.
// ROUND 366 -- the nature gift evolution engine: every catalogue entry is a spec (trigger, effect, numbers) that the
// game runs, with the N key for the "you can ..." ones; a dimension damage type; the ten nature fixes; the four blocked
// catalysts left out and the flight / underwater / trinket lines rewritten.
// ROUND 367 -- the engine grows a memory per target (tallies, stacks, "after three hits"), a chosen ally, pulling and
// pushing, and placed walls, statues and pillars; ~690 specs rewritten to use them; nature gift evolutions now come from
// the story's character-defining moments; Olb's pronouns corrected in the code's own notes.
// ROUND 368 -- icons for the forty round-328 parts, and a second part for each of those families (drops, gather and
// supply contracts, the market's parts trade, the auction); an affinity that matches none of a character's essences turns
// to one of theirs at Silver; the sewer climb no longer counts as a story moment.
// ROUND 369 -- a save made indoors loads indoors; the game no longer freezes when a sheet still on screen is evicted;
// rank-up and character-creator music; outfit skin follows the chosen tone (the BattleMage, Duelist, Pugilist); weather
// is outdoors and in astral realms only (rain still heard indoors) and lasts 10-20 minutes; the Duelist and Pugilist
// outfits; lamps kept out of doorways and seated on raised ground; grass on raised ground; lamp shadows on the ground
// plane; no exit glow in rooms reached by stairs; adventurers speak for themselves and are asked about by others.
// ROUND 370 -- the fourth spell-animation drop (a lance, two throwing stars, a boulder, three beams, a breaking wave, a
// crescent and a rain of needles) cut once for each of the thirty damage types; what flies is chosen from the ability's
// words, then its damage type, then its seed, over eleven kinds and 25 library orbs instead of four sheets.
// ROUND 371 -- the Staff essence always teaches magical tools, any kit that asks for a staff teaches it, and a passive
// that teaches it opens the staff gate whatever kind of passive it is; Wardrobe colours for the Duelist and Pugilist;
// one perception (a canon one is counted first); bug reports (F8); every special attack swings, and a single-target shot
// homes on the selected target; auras on raised ground, in ~60 looks, and other adventurers'; Cadence's stalls off the
// road, a bookstall, a juice stall and a hooded trader; Zeke and Prism wait for the Olb chain.
// ROUND 372 -- every house 10% smaller, the Society hall and the auction house 10% smaller, the blacksmith 20% larger.
// ROUND 373 -- Cadence lived in: the market's hours, the tavern by night, the temples by their hours, running from the
// rain; lamplighters and a town crier; townsfolk who know you; barracks and training yard, cemetery, caravan yard, fish
// market, bathhouse, library, a household in every house; market day, eight holy days, the city's reactions; signs,
// laundry, flower boxes, banners, lit windows, smoke, stall lanterns, district sounds; more houses.
// ROUND 374 -- by love or by fear: all 38 adventurers can be led, through a leadership metric (love, fear, hatred
// against what each of them needs) and a full talk -- what they want, what holds them back, the favour they ask, four
// pitches, a drink, a test, a threat, an apology -- and kept, or lost; companions by rank (3 / 5 / 7 / 12), seven
// walking with you and the rest at the Society hall; packs grow at three, five and seven; the party comes back on a load.
// ROUND 375 -- loyalty, earned and returned: every adventurer values different things (planning, risk, fighting, mercy,
// exploring, duty, coin, glory, faith, learning) and judges what you do in front of them; trials ("work a job with me"),
// favours, gear, shares and councils; like and unlike minds in one team; essence talks before a companion reaches gold;
// fear -- shows of power, soloing great threats, making an example -- only on the restricted or illegal path.
// ROUND 376 -- kit archetypes (special attacker, spell caster, evasion tank, healer, affliction skirmisher, jack of all
// trades, area direct damage, affliction caster) from the Astral Blessing or the essences; affliction payoffs only in the
// affliction kits; afflictions themselves rolled at the archetype's rate; an opener that fits the archetype and hits
// for its full figure; a stone family's scaling condition fixed per family again.
// ROUND 377 -- a kit's second resource is chosen among the ones its archetype suits (Rage or Energy for a special
// attacker, Charge for a caster, Shards or Souls for an affliction kit); Arsenal and Onslaught only by their rules.
// ROUND 395 -- regression triage: a building moved off a street is never set down with its base in water, and no
// scattered rock or tree is left inside a building's fitted footprint; old test suites brought up to date.
// ROUND 396 -- the swoosh sweeps the swing's own arc on its aim; prompts name the button in your hands (keyboard,
// PlayStation, Steam Deck, Xbox); a person in front of a thing is drawn in front of it; interior stairs against their
// wall; Sky's stray words dropped (Sickle + Venom + Swift is Harvest); the great weapons (greatsword, greataxe, glaive,
// maul); the Society rack stocks every weapon; special attacks priced in blows of the weapon, spells by rank; the
// opening under rain with the music low; music that changes in under a second; 44 town, city and bathhouse signs on
// the roads in; Free Runner's wind.
// ROUND 397 -- interior doors 15% larger about their foot; confluence names no longer read essence descriptions;
// recorded voice lines merge at boot from public/audio/voice/recorded_index.json (tools/voice/import_recordings.mjs).
// ROUND 398 -- the two-handed weapon art (greatsword, greataxe, glaive, maul) in every outfit, body and grip, with
// Wardrobe dye and skin; their icon banks; a primer per great weapon; martial arts rebuilt from themed clauses (1,400+
// on offer), a random 120 per run, sold a few a day and taught by ten masters in random settlements.
// ROUND 399 -- the martial masters drawn: 8 characters x 11 stances (public/assets/masters), dyed per master in 24+ mixed
// palettes (an element's colours for an element's master), the stance matching the art's weapon, shield or element;
// twelve masters; a kata now and then, a few paces and back; element-coloured hand flames on the flames stance.
// ROUND 400 -- martial mastery (practice: Journeyman/Adept/Expert/Master per rank at 100/500/1000/2000 defeats; a master's
// training per rank -> "<Rank> Expert", x2); masters outside the cities -- hamlets, wilds, deep wilds and lone dojos in the
// overworld squares -- each in a dojo hall; a great master of your style, word of them from the Society; 25 roadside inns
// by setting (8 models), a Magic Society hall in each major city (3 models), the new art at the Society's and the
// houses' scales with footprint-rectangle collision.
// ROUND 405 -- the Magic Society's specialty chains. ROUND 406 -- companions' martial arts; one Division name.
// ROUND 407 -- the rest of the companions' stories (41 quests), the one-handed hammer, finer stairs, people against the
// walls, the gate guards on the road, guard contracts that talk, a true Dragon's Breath, Olb's gift on waking, soul scars
// that widen the aura, each ability's rank on the essence cards, Zeke's gifts on meeting him.
// ROUND 408 -- hand-written bestiary entries for all 561 monster variants; player transformations (mythic and Avatar
// confluences: mantles, shifts, permanent forms); companions are attacked too; houses stand on raised ground; rename.
// ROUND 409 -- the people standing on raised ground (roadside innkeeps, farm families) lifted onto it like the buildings;
// combat xp x1.5 once every ability is unlocked (all four slots' stones).
// ROUND 410 -- summons in the party frame (health and time); ability cards at the reader's rank only (wild bond,
// ritual summon); each bonded creature its own (bondProfile: rhythm, weight, crit, hide, resistances, its own rungs);
// familiars keep their own stations instead of circling; hanging banners hold their top third still; the awakening
// and absorbing popups carry the ability's card, a nature evolution its gift.
// ROUND 411 -- the user's anvil recording at the smithy (a one-shot every three minutes); a Legion summoner's kit
// (Legion + mostly animal stones: summons to 90%, 4+ rites and 1-2 wild with ritual magic), re-rolled once.
// ROUND 412 -- the user's character sprite clean-up (fixes_index.csv): duplicate weapons, a stray speck, floating debris and baked
// background boxes taken out of 1,032 packed frames in 78 sheets, each at the offset it was packed at.
// ROUND 413 -- the female city guard's idle and run rebuilt without the slung back-spear (run cell 92, idle foot 61);
// one stray pixel out of Duelist BT1 greataxe_1h north-east.
// ROUND 414 -- the cities, part one of three (the user's review of the six cities): a quarter of the lamps outside
// Cadence; the Karsk Landing portal's standing stones gone; the user's corner towers at every wall corner; walls and
// gates 15% smaller; half the parks; temples gathered near the plaza, at least ten tiles apart.
// ROUND 415 -- the cities, part two: the user's square corner tower at every corner (recoloured to the wall stone);
// closed street segments, dead-end lanes, dense alley quarters and festival squares in the five grid cities.
// ROUND 416 -- the cities, part three (the user's review, items 8.1, 8.2, 8.4, 8.5 and 9) in the five grid cities: a
// market square of stalls selling food, books, weapons, armour and more; props on the plaza, the kerbs, the gates, the
// civic fronts and the estates; slums with clutter and two dive taverns each (a fence in the back); walkers in every
// district; lone adventurers and teams on their way to the market or out to hunt; wagons on road-to-road loops through
// each city. And the corner towers layered per corner every frame (top behind both walls, right and left over the upper
// wall and under the lower one, bottom in front).
// ROUND 417 -- the user's 256x256 south-facing temples (one frame per god, src/data/templeArt.js) replace the old
// 150px eight-direction sheet in every city, drawn the same size as before; collision a rectangle fitted from the art's
// manifest, clear of the doorstep.
// ROUND 418 -- "Please add doors for all temples": every grid-city temple gets a door into its god's temple room (the
// room Cadence's temple of that god opens on), and the way out leads back to the door you came in by.
// ROUND 419 -- a review round (City-Review reshoot and the placeholder audit): no game change, no version.
// ROUND 420 -- the user's 92 new houses (src/data/houseArt420.js) join the house pool, each drawn so its door is the
// old pool's door height, in eight colourings, chosen per region and settlement size (src/data/houseStyles420.js), no
// two of a model side by side; cabins, stilts and tree houses kept out of towns.
// ROUND 421 -- house interiors by culture, trade, class and clock (src/data/homeDress421.js): sixteen new props and
// their recolourings, three new wall kits (whitewash, glazed tile, dark log), tatami, rooms sized from the house, walled
// rooms whose inside walls meet the outer walls, residents on the furniture, washing lines outside.
// ROUND 422 -- the user's interiors2 drop (src/data/homeDress422.js, src/scenes/homeDress422Mixin.js): windows in the
// back walls of every house (nine materials, three styles, about one per three or four wall pieces), 64 small things on
// tables, stands, sideboards and sills (candles and lamps lit after dark), residents seated on chairs, stools and
// cushions and asleep in their beds, and the Celtic roundhouse's round floor with its hearth.
// ROUND 423 -- lava and magma get the water treatment (src/data/water.js lava kinds, src/scenes/lavaMixin.js,
// public/assets/water/lava.png from tools/make_lava_r423.py): crust plates with glowing cracks, a creeping molten
// edge and scorched bank, drifting floes, bubbles and embers, and magma pools in the Cinderwaste vents. Also fixes
// round 422's cave entry error (every cave threw) and props drawn outside a cave's floor.
export const GAME_VERSION = 423;
