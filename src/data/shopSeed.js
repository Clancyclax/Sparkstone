// ROUND 342 -- THE SHOPS' AND AUCTIONEERS' STOCK IS SEEDED PER PLAYTHROUGH.
//
//   "The essences sold by the shops and auctioneers should be seeded and change every playthrough. With the rarities
//    and general types still staying the same."
//
// Before this, the guild clerk and the four Society brokers were seeded on (shop, day) alone -- so every playthrough saw
// the SAME shelf on day 1, day 2, ... -- and everything else (the smith, the general store, the gear auctioneer, the
// auction house's lots and its Cores & Quintessence block) rolled bare Math.random, so the stock was different every time
// the game was loaded and was not a function of anything the player could keep.
//
// The seed is the character's `runSeed`, minted once per new game and saved with it. A shelf is a pure function of
// (run seed, counter, day): stable all day however many times the panel is opened or the game is reloaded, turning over
// at midnight, and different in the next playthrough. ONLY the random source changes -- which rarities a counter sells,
// how many of each, which kinds (the guild's mostly-Common mix, the smith's themed stock, the brokers' counts) are all
// still decided by the same code that decided them before.
import { seededRng } from './awakening.js';

/** A seeded random stream for one counter on one day of one playthrough. `parts` are anything that names the draw. */
export function shopRng(runSeed, ...parts) {
  return seededRng(['stock', runSeed == null ? 0 : runSeed, ...parts].join('|'));
}
