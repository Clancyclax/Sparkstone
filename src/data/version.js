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
export const GAME_VERSION = 136.1;
