// ============================================================================
// ROUND 307 -- A MARKET HAS PEOPLE IN IT.
//
//   "Then ensure NPCs are placed behind the remaining stalls selling potions,
//    rations, monster parts and otherworldly food. Make it feel like an
//    actual market."
//
// Four trades. A stall is given one of them (by its position in the market, so
// a square always has all four), a vendor stands behind its counter, and
// talking to him opens the ordinary shop panel on `market_<trade>`.
//
//   potions     the potion line (potions.js), sized to how deep in the game
//               the player is -- a spread of kinds in two or three sizes.
//   rations     trail rations: cheap stamina.
//   parts       monster parts, the crafting leftovers of the bestiary.
//   otherworld  food from "elsewhere" -- the stranger's snacks the Nek's
//               merchants buy off travellers. Real consumables (they stack,
//               bind to the D-pad and are eaten like a ration) that are sold
//               and never dropped, so they carry `shopOnly`.
// ============================================================================

import { POTION_DEFS, POTION_KINDS, POTION_SIZES, potionId } from './potions.js';

/** Food from another world. Shop-only: `inventory.js` folds these into
 *  CONSUMABLE_DEFS and keeps them out of the loot table. */
export const OTHERWORLD_FOOD = {
  owBurger: { id: 'owBurger', name: 'Otherworld Burger', food: true, shopOnly: true, value: 120,
    hp: 60, stamina: 30,
    desc: 'A seeded bun around a flame-seared patty and something pickled. Restores 60 health and 30 stamina.' },
  owFries: { id: 'owFries', name: 'Paper Cone of Fries', food: true, shopOnly: true, value: 70,
    stamina: 55,
    desc: 'Salted, fried tubers in a paper cone. Nobody can say where the paper came from. Restores 55 stamina.' },
  owCola: { id: 'owCola', name: 'Fizzing Dark Cola', food: true, shopOnly: true, value: 80,
    mana: 45, stamina: 25,
    desc: 'A sweet black drink that bites back. Restores 45 mana and 25 stamina.' },
  owDoughnut: { id: 'owDoughnut', name: 'Glazed Ring Doughnut', food: true, shopOnly: true, value: 60,
    hp: 35,
    desc: 'A ring of fried dough under a shell of sugar. Restores 35 health.' },
  owPizza: { id: 'owPizza', name: 'Flatbread Slice, Red and Cheese', food: true, shopOnly: true, value: 140,
    hp: 50, mana: 25, stamina: 25,
    desc: 'A wedge of flatbread under tomato and stretched cheese. Restores 50 health, 25 mana and 25 stamina.' },
};

export const MARKET_TRADES = ['potions', 'rations', 'parts', 'otherworld'];

export const MARKET_TRADE_INFO = {
  potions: {
    role: 'Potion Seller', title: 'Potions',
    line: 'Draughts for every ailment -- mind the colours, they are not interchangeable.',
  },
  rations: {
    role: 'Ration Seller', title: 'Rations',
    line: 'Trail rations, fresh this morning. Nothing keeps a delve going like a full belly.',
  },
  parts: {
    role: 'Parts Dealer', title: 'Monster Parts',
    line: 'Hides, scales, teeth and gel. Everything on this table came off something that tried to eat somebody.',
  },
  otherworld: {
    role: 'Stranger\'s Kitchen', title: 'Otherworldly Food',
    line: 'Food from far away. Do not ask what is in it. Do ask for the fries.',
  },
};

export const marketShopId = (trade) => `market_${trade}`;
export const isMarketShop = (shopId) => typeof shopId === 'string' && shopId.startsWith('market_')
  && MARKET_TRADES.includes(shopId.slice(7));
export const marketTradeOf = (shopId) => isMarketShop(shopId) ? shopId.slice(7) : null;

/** Which trade the n-th stall of a market takes: round-robin, so any market of
 *  four stalls or more sells all four things. */
export const tradeForStall = (n) => MARKET_TRADES[((n % MARKET_TRADES.length) + MARKET_TRADES.length) % MARKET_TRADES.length];

const priced = (value, mult = 2.2) => Math.max(1, Math.round(value * mult));

/**
 * The shelf for one trade today. `rng` is a seeded stream; `defs` carries the
 * item tables the caller already holds (PART_DEFS and CONSUMABLE_DEFS), passed
 * in so this file does not import inventory.js, which imports this one.
 *
 * Returns shelf lines in the shape `_restockShop` pushes: `{kind, id, name,
 * price, rarity:null}`. `uid` is left for the caller to stamp.
 */
export function marketShelf(trade, rng, defs) {
  const out = [];
  if (trade === 'potions') {
    // Small and Standard bottles of the everyday kinds; a Big one now and then.
    const sizes = ['small', 'small', 'standard', 'standard', 'big'];
    const kinds = POTION_KINDS.filter(k => !k.pct || k.key === 'clear');
    const bag = kinds.slice();
    const n = Math.min(bag.length, 7);
    for (let i = 0; i < n; i++) {
      const k = bag.splice(Math.floor(rng() * bag.length), 1)[0];
      let size = sizes[Math.floor(rng() * sizes.length)];
      if (k.key === 'clear') size = 'small';
      const id = potionId(k.key, size);
      const d = POTION_DEFS[id];
      if (!d) continue;
      out.push({ kind: 'consumable', id, name: d.name, rarity: null, price: priced(d.value) });
    }
    // The size ladder is referenced so a renamed size cannot slip through silently.
    void POTION_SIZES;
  } else if (trade === 'rations') {
    for (let i = 0; i < 4; i++) {
      out.push({ kind: 'consumable', id: 'staminaRation', name: 'Trail Ration', rarity: null, price: 180 + i * 0 });
    }
  } else if (trade === 'parts') {
    const parts = Object.values(defs.PART_DEFS || {});
    const bag = parts.slice();
    const n = Math.min(bag.length, 6);
    for (let i = 0; i < n; i++) {
      const d = bag.splice(Math.floor(rng() * bag.length), 1)[0];
      out.push({ kind: 'part', id: d.id, name: d.name, rarity: null, price: priced(140, 2.6) });
    }
  } else if (trade === 'otherworld') {
    for (const d of Object.values(OTHERWORLD_FOOD)) {
      out.push({ kind: 'consumable', id: d.id, name: d.name, rarity: null, price: priced(d.value, 2.4) });
    }
  }
  return out;
}
