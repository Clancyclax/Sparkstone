// ===========================================================================
// ROUND 81 ITEM 3 -- THE PERFORMANCE BUDGETS, IN ONE PLACE.
//
//   "Increase the display cap by 30%"
//
// The display-list cap has existed since round 43 as a number typed into two
// different suites, and nothing in the game itself declared it. That is how a
// budget drifts: round 43 wrote `r.children < 4000`, round 66 wrote
// `ins.displayAfter < 4000`, and raising it meant finding both and hoping
// there was not a third. It is one export now, and both suites import it.
//
// WHAT THE CAP IS. Phaser's display list is every Game Object the scene is
// drawing -- sprites, images, text, graphics. It is not a hard engine limit;
// it is a self-imposed budget, because this scene is a whole open world and
// the cost of drawing scales with the count. Round 43 introduced it after the
// forest build went quadratic, and the discipline it enforces is that new
// content arrives POOLED BY VIEWPORT (draw what is near, not what exists) --
// which is how the rocks, the trees, the flora, the city props and the road
// priests are all built.
//
// ROUND 81 -- 4000 -> 5200, at the user's instruction and by their arithmetic.
//
// It had been red since round 79 and was at 4,075 after round 80's larger city
// walls. The honest options were "raise it" or "spend a round pooling the wall
// sprites", and the user chose the first. Worth recording what that buys:
// 1,125 objects of headroom on a measured 4,075, which is about where the
// figure sat before round 78's new content arrived. The reason it is a real
// choice rather than a rubber stamp is that the number is a proxy for frame
// cost on the weakest machine the game is expected to run on, and nothing here
// measures that -- so if the game starts to feel heavy, this is the first
// number to look at and the walls are the first thing to pool.
export const DISPLAY_LIST_CAP = 5200;

/** What the cap was before, kept so a suite can say how much room was added
 *  rather than just asserting the new number. */
export const DISPLAY_LIST_CAP_PREVIOUS = 4000;
