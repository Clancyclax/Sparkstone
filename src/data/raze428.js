// ROUND 428 -- the firebrand and the numbers for razing a settlement (scenes/razeMixin.js has the why).
export const FIREBRAND_ID = 'firebrand';
export const FIREBRAND_DEF = {
  id: FIREBRAND_ID, name: 'Firebrand', firebrand: true, shopOnly: true, value: 60,
  desc: 'Pitch and rag on a stick. Thrown at a building within 3 tiles, it sets it alight. Fire spreads.',
};
export const FIREBRAND_PRICE = 300;      // five, in normal-coin units
export const FIREBRAND_BUNDLE = 5;
export const RAZE = { throwTiles: 3, burnS: 40, catchAfterS: 12, catchTiles: 24, catchChance: 0.2, fallFrac: 0.6 };   // a hamlet's houses stand about 21 tiles apart
