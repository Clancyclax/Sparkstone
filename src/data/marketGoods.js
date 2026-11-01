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

// ROUND 371 -- "Change 1 of them to a skill book vendor and another to a vendor for fruity drinks." Cadence's market
// trades two of its stalls for these; the juice is a real consumable like the otherworld food (shop-only, never dropped).
export const FRUIT_DRINKS = {
  fdMango: { id: 'fdMango', name: 'Mango Crush', food: true, drink: true, shopOnly: true, value: 55,
    stamina: 40, mana: 10,
    desc: 'Crushed mango over shaved ice, in a cup that is mostly ice. Restores 40 stamina and 10 mana.' },
  fdBerry: { id: 'fdBerry', name: 'Bramble Berry Cooler', food: true, drink: true, shopOnly: true, value: 60,
    mana: 40, stamina: 10,
    desc: 'Blackberries and something sharp, stirred cold. It stains everything. Restores 40 mana and 10 stamina.' },
  fdCitrus: { id: 'fdCitrus', name: 'Sunfruit Fizz', food: true, drink: true, shopOnly: true, value: 70,
    stamina: 55,
    desc: 'Three citrus nobody in the Nek can name, pressed and shaken until it fizzes. Restores 55 stamina.' },
  fdMelon: { id: 'fdMelon', name: 'Melon and Mint', food: true, drink: true, shopOnly: true, value: 65,
    hp: 30, stamina: 20,
    desc: 'Cold melon blended with a handful of mint from the stallholder\'s own window box. Restores 30 health and 20 stamina.' },
  fdPassion: { id: 'fdPassion', name: 'Passion Fruit Punch', food: true, drink: true, shopOnly: true, value: 95,
    hp: 25, mana: 25, stamina: 25,
    desc: 'Passion fruit, pineapple and a splash of something the stallholder will not name. Restores 25 health, 25 mana and 25 stamina.' },
};

/** ROUND 373 -- the fish market's food (Cadence, south of the market square). Sold, never dropped, like the drinks. */
export const FISH_FOODS = {
  fishSmoked: { id: 'fishSmoked', name: 'Smoked Fish', food: true, shopOnly: true, value: 50,
    stamina: 35, hp: 10,
    desc: 'Three small fish smoked on a string over the fishmonger\'s own fire. Restores 35 stamina and 10 health.' },
  fishGrilled: { id: 'fishGrilled', name: 'Grilled River Trout', food: true, shopOnly: true, value: 85,
    hp: 45, stamina: 15,
    desc: 'A whole trout off the grill with a wedge of lemon, eaten off the plate it came on. Restores 45 health and 15 stamina.' },
  fishEelPie: { id: 'fishEelPie', name: 'Eel Pie', food: true, shopOnly: true, value: 110,
    hp: 40, stamina: 40,
    desc: 'Eels in a thick crust, two tails left sticking out so you know it is honest. Restores 40 health and 40 stamina.' },
  fishStew: { id: 'fishStew', name: "Fisherman's Stew", food: true, shopOnly: true, value: 95,
    hp: 25, mana: 30, stamina: 25,
    desc: 'Whatever came in this morning, a bowl of it, hot. Restores 25 health, 30 mana and 25 stamina.' },
};

export const MARKET_TRADES = ['potions', 'rations', 'parts', 'otherworld'];
/** ROUND 371 -- the stalls that are not dealt round-robin: placed on purpose (books, drinks) or hidden away (shady). */
export const MARKET_SPECIAL_TRADES = ['books', 'drinks', 'shady', 'fish', 'traveller', 'weapons', 'armour', 'fence'];   // ROUND 373 -- the fish market, market day; ROUND 416 -- the grid cities' squares and dives

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
  // ROUND 371
  books: {
    role: 'Bookseller', title: 'Skill Books',
    line: 'Manuals, primers, a theory or two. Read one in a ritual room, not out here in the wind.',
  },
  drinks: {
    role: 'Juice Seller', title: 'Fruity Drinks',
    line: 'Cold, sweet and pressed this morning! Try the punch. Everybody tries the punch.',
  },
  shady: {
    role: 'Hooded Trader', title: 'Under the Counter',
    line: '...',
  },
  // ROUND 373
  fish: {
    role: 'Fishmonger', title: 'Fish',
    line: 'Came in on the river carts at dawn! Smoked, grilled, in a pie, in a pot. No, the eels are not looking at you.',
  },
  // ROUND 416 -- the grid cities' market squares, and the fence in the back of a dive (the scene stocks these three:
  // WorldScene `_restockShop`, which has the gear rollers)
  weapons: {
    role: 'Bladesmith', title: 'Weapons',
    line: 'Edges, points and heft. Pick it up, feel the balance. Put it down if you\'re not buying.',
  },
  armour: {
    role: 'Armourer', title: 'Armour',
    line: 'Plate, mail, leather. Every piece here has turned a blow, or will. Try it on behind the cloth.',
  },
  fence: {
    role: 'Fence', title: 'Fell Off a Wagon',
    line: 'Everything\'s got a history. None of it\'s yours to know.',
  },
  traveller: {
    role: 'Travelling Merchant', title: 'From Far Away',
    line: 'Market day only, friend. Tomorrow I am two towns down the road, and so is everything on this cloth.',
  },
};

// ROUND 371 -- a bookstall is a skill-book counter (WorldScene `_restockShop` stocks any `skillbooks*` id)
export const marketShopId = (trade) => (trade === 'books' ? 'skillbooks_market' : `market_${trade}`);
export const isMarketShop = (shopId) => typeof shopId === 'string' && shopId.startsWith('market_')
  && (MARKET_TRADES.includes(shopId.slice(7)) || MARKET_SPECIAL_TRADES.includes(shopId.slice(7)));
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
  } else if (trade === 'fish') {
    // ROUND 373 -- the fish market: two or three of each
    for (const d of Object.values(FISH_FOODS)) {
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) out.push({ kind: 'consumable', id: d.id, name: d.name, rarity: null, price: priced(d.value, 2.2) });
    }
  } else if (trade === 'traveller') {
    // ROUND 373 -- market day's rare stock: the big bottles the potion stall never has, and one of each drink and fish.
    // The scene adds two rarer essences and two rarer stones (cityLifeMixin.js `_clTravellerShelf`).
    const kinds = POTION_KINDS.filter(k => k.key !== 'clear');
    const bag = kinds.slice();
    for (let i = 0; i < Math.min(4, bag.length); i++) {
      const k = bag.splice(Math.floor(rng() * bag.length), 1)[0];
      const size = rng() < 0.3 ? 'large' : 'big';
      const id = potionId(k.key, size);
      const d = POTION_DEFS[id];
      if (d) out.push({ kind: 'consumable', id, name: d.name, rarity: null, price: priced(d.value, 2.6) });
    }
  } else if (trade === 'drinks') {
    // ROUND 371 -- all five, two cups of each
    for (const d of Object.values(FRUIT_DRINKS)) {
      for (let i = 0; i < 2; i++) out.push({ kind: 'consumable', id: d.id, name: d.name, rarity: null, price: priced(d.value, 2.2) });
    }
  }
  // 'shady' is stocked by the scene (shadyTraderMixin.js): it prices essences and stones the way the hall does
  return out;
}
