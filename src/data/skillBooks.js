// ===========================================================================
// ROUND 310 (item 2) -- SKILL BOOKS.
//
// The user's ruling, in his own numbering:
//
//   2     "Weapon essences should no longer provide proficiency, instead
//          players language adaptation outworlder racial should be updated to
//          state 'can use skill books'"
//   2.1   "A skill book vendor should be available in the adventure society
//          and auction house."
//   2.2   "Skill books can teach players the following"
//   2.2.1 Weapon Proficiencies -- one book per weapon, 25 iron coins each;
//          staves and wands stay essence-only.
//   2.2.2 Martial Arts -- one only (see martialArts.js).
//   2.2.3 Herbalism.   2.2.4 Mining.   2.2.5 Ritual Magic.   2.2.6 Cooking.
//
// THIS FILE IS THE CATALOGUE and nothing else: what a book is, what it costs,
// and the three-line reading of a player's `skillBooks` bag. The behaviour
// each book unlocks lives where that behaviour already lived (proficiencies.js
// for swings, the harvest code for nodes, rituals.js for rituals); they all
// ask this file one question -- "has this player read that?" -- so that there
// is one answer.
//
// PRICES are in NORMAL-RANK coin units, the unit every shop in the game
// prices in (one iron coin is one hundred of them, COIN_CONVERSION). The user
// fixed the weapon books at 25 iron coins; the rest are mine, and the notes
// say so: martial art 60, herbalism / mining / cooking 30, ritual magic 100.
//
// THE PLAYER'S BAG:
//   player.skillBooks = {
//     weapons: { sword: true, ... },     // every weapon book read
//     martialArt: 'ma_still_thrift' | null,   // at most ONE
//     herbalism: bool, mining: bool, cooking: bool, ritual: bool,
//   }
// ===========================================================================

import { WEAPONS } from './weapons.js';
import { profForWeapon, PROFICIENCIES } from './proficiencies.js';
import { MARTIAL_ARTS, MARTIAL_BY_ID, artCard } from './martialArts.js';

/** One iron coin, in the unit every shop prices in. */
export const IRON_COIN = 100;
export const WEAPON_BOOK_PRICE = 25 * IRON_COIN;
export const MARTIAL_BOOK_PRICE = 60 * IRON_COIN;
export const CRAFT_BOOK_PRICE = 30 * IRON_COIN;
export const RITUAL_BOOK_PRICE = 100 * IRON_COIN;

/** Weapons with a book: every weapon whose proficiency is a DISCOUNT. The
 *  staff (and a future wand) answers to a gating proficiency, which the user
 *  ruled essence-only. */
export const BOOK_WEAPONS = Object.keys(WEAPONS).filter((id) => {
  if (id === 'unarmed') return false;
  const key = profForWeapon(id);
  return !!key && !PROFICIENCIES[key].gates;
});

export const CRAFT_BOOKS = {
  herbalism: {
    id: 'book_herbalism', name: 'Herbalism: A Field Reader', craft: 'herbalism', price: CRAFT_BOOK_PRICE,
    blurb: 'You learn to spot harvestable plants (without it they are just undergrowth) and to take extra from plant monsters.',
  },
  mining: {
    id: 'book_mining', name: 'Mining: Reading the Rock', craft: 'mining', price: CRAFT_BOOK_PRICE,
    blurb: 'You learn to spot harvestable mineral nodes (without it they are just stone) and to take extra from earth and rock elementals and stone-shelled monsters.',
  },
  cooking: {
    id: 'book_cooking', name: 'Cooking: The Monster Kitchen', craft: 'cooking', price: CRAFT_BOOK_PRICE,
    blurb: 'You learn to cook monster parts into food with small, temporary buffs.',
  },
  ritual: {
    id: 'book_ritual', name: 'Ritual Magic: First Principles', craft: 'ritual', price: RITUAL_BOOK_PRICE,
    blurb: 'You learn ritual magic: any essence can now bring forth ritual abilities, if you know the rite. Familiars, conjured food and potions, and the great combat rituals all require it.',
  },
};

/** Every book that exists, as a flat list of rows the shop and the inventory
 *  both read. `kind` is 'weapon' | 'martial' | 'craft'. */
export function weaponBook(wid) {
  const w = WEAPONS[wid];
  if (!w || !BOOK_WEAPONS.includes(wid)) return null;
  return {
    id: `book_weapon_${wid}`, kind: 'weapon', weapon: wid, price: WEAPON_BOOK_PRICE,
    name: `${w.name} Primer`,
    blurb: `You learn to use the ${w.name.toLowerCase()} properly: it costs half the stamina to swing.`,
  };
}
export function martialBook(artId) {
  const a = MARTIAL_BY_ID[artId];
  if (!a) return null;
  return {
    id: `book_${a.id}`, kind: 'martial', art: a.id, price: MARTIAL_BOOK_PRICE,
    name: `Manual: ${a.name}`,
    blurb: `${artCard(a)} You can learn only one martial art.`,
  };
}
export function craftBook(craft) {
  const b = CRAFT_BOOKS[craft];
  return b ? { ...b, kind: 'craft' } : null;
}

/** Resolve any book id back to its row. */
export function bookById(id) {
  if (!id || typeof id !== 'string') return null;
  if (id.startsWith('book_weapon_')) return weaponBook(id.slice('book_weapon_'.length));
  if (id.startsWith('book_ma_')) return martialBook(id.slice('book_'.length));
  for (const k of Object.keys(CRAFT_BOOKS)) if (CRAFT_BOOKS[k].id === id) return craftBook(k);
  return null;
}

// ---------------------------------------------------------------------------
// THE PLAYER'S BAG
// ---------------------------------------------------------------------------

export function newSkillBooks() {
  return { weapons: {}, martialArt: null, herbalism: false, mining: false, cooking: false, ritual: false };
}
/** Normalise whatever a save holds, so a save from before this round reads as
 *  "read nothing" rather than throwing. */
export function skillBooksOf(player) {
  const src = (player && player.skillBooks) || {};
  return {
    weapons: { ...(src.weapons || {}) },
    martialArt: MARTIAL_BY_ID[src.martialArt] ? src.martialArt : null,
    herbalism: !!src.herbalism, mining: !!src.mining, cooking: !!src.cooking, ritual: !!src.ritual,
  };
}
export function hasCraft(player, craft) { return !!skillBooksOf(player)[craft]; }
export function martialArtOf(player) { return skillBooksOf(player).martialArt; }
/** `weaponSkills` for passiveMods: weapon id -> true. */
export function weaponSkillsOf(player) {
  const out = {};
  for (const w of Object.keys(skillBooksOf(player).weapons)) if (BOOK_WEAPONS.includes(w)) out[w] = true;
  return out;
}

/** Every player is an outworlder, and the Language Adaptation racial says so
 *  on its card ("You can use skill books."). Kept as a function so a later
 *  race that cannot read the Nek's print has one place to say no. */
export function canUseSkillBooks(player) {
  return !(player && player.canUseSkillBooks === false);
}

/**
 * Read a book. Returns {ok, reason, row}. Does NOT touch inventory -- the
 * caller owns the book item; this owns the lesson, so a test can ask the
 * lesson without a scene.
 */
export function learnBook(player, id) {
  const row = bookById(id);
  if (!row) return { ok: false, reason: 'That is not a skill book.' };
  if (!canUseSkillBooks(player)) return { ok: false, reason: 'You cannot read this.' };
  if (!player.skillBooks) player.skillBooks = newSkillBooks();
  const sb = player.skillBooks;
  if (!sb.weapons) sb.weapons = {};
  if (row.kind === 'weapon') {
    if (sb.weapons[row.weapon]) return { ok: false, reason: `You already know the ${WEAPONS[row.weapon].name.toLowerCase()}.`, row };
    sb.weapons[row.weapon] = true;
    return { ok: true, row };
  }
  if (row.kind === 'martial') {
    if (sb.martialArt) {
      const cur = MARTIAL_BY_ID[sb.martialArt];
      return { ok: false, reason: `You already follow ${cur ? cur.name : 'a martial art'}; a body learns only one.`, row };
    }
    sb.martialArt = row.art;
    return { ok: true, row };
  }
  if (row.kind === 'craft') {
    if (sb[row.craft]) return { ok: false, reason: 'You already know this.', row };
    sb[row.craft] = true;
    return { ok: true, row };
  }
  return { ok: false, reason: 'That is not a skill book.' };
}

// ---------------------------------------------------------------------------
// THE SHELVES (ROUND 311)
//
// "The martial arts skillbooks should have a vendor in the adventure society
// trade hall with a random assortment of 20 skill books, 15 of which are
// random martial arts skillbooks and the other 5 are other types."
//
// So the Society's bookseller (Cadence: in the Society market upstairs) holds
// TWENTY books a day: fifteen martial manuals drawn from the whole pool, and
// five others drawn from the weapon primers and the crafts. The ritual book is
// rare ("ritual magic should be a fairly rare outcome"): it is one of the five
// on about one day in eight, and otherwise has to be found.
//
// The auction house's bookseller keeps the old, stable catalogue of weapon
// primers and the three everyday crafts: round 310's ruling that every weapon
// book is always on sale at 25 iron still holds somewhere. He sells no martial
// manuals and no ritual book.
// ---------------------------------------------------------------------------
export const SOCIETY_SHELF_TOTAL = 20;
export const SOCIETY_SHELF_MARTIAL = 15;
export const RITUAL_BOOK_SHELF_CHANCE = 0.125;

function seeded(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
}

/** The Society hall's shelf on a given day: 15 martial manuals + 5 others. */
export function vendorShelf(dayNumber, shelfFn, cityKey = '') {
  const rows = [];
  for (const a of shelfFn(dayNumber, SOCIETY_SHELF_MARTIAL, cityKey)) rows.push(martialBook(a.id));
  const rnd = seeded(`others|${dayNumber}|${cityKey}`);
  const others = [...BOOK_WEAPONS.map(weaponBook), ...['herbalism', 'mining', 'cooking'].map(craftBook)];
  const picked = [];
  if (rnd() < RITUAL_BOOK_SHELF_CHANCE) picked.push(craftBook('ritual'));
  while (picked.length < SOCIETY_SHELF_TOTAL - SOCIETY_SHELF_MARTIAL && others.length) {
    picked.push(others.splice(Math.floor(rnd() * others.length), 1)[0]);
  }
  return rows.concat(picked);
}

/** The auction house's shelf: every weapon primer and the three everyday
 *  crafts. Stable; no martial manuals, no ritual book. */
export function auctionBookShelf() {
  const rows = [];
  for (const w of BOOK_WEAPONS) rows.push(weaponBook(w));
  for (const c of ['herbalism', 'mining', 'cooking']) rows.push(craftBook(c));
  return rows;
}

// ---------------------------------------------------------------------------
// FOUND BOOKS (ROUND 311)
//
// "Skill books can be found in ancient ruins, or very rarely offered as a
// quest reward." One roll function for both; the caller says where the book
// came from and supplies the random number (so the caller's seeded stream, or
// Math.random, is its own business). Never a martial art the player cannot use
// is filtered here -- a found book is a found book, and reading it is the
// player's choice -- but a book the player has fully read is not offered again.
// ---------------------------------------------------------------------------
/** The chest sites that count as ancient ruins (sites.js keys). */
export const RUIN_SITE_KEYS = ['stoneCircle', 'shrine', 'barrow', 'crystalHollow', 'mineCave'];
export const RUIN_BOOK_CHANCE = 0.18;
export const QUEST_BOOK_CHANCE = 0.03;

/** Every book id that exists, for a found-book draw. Ritual magic is the
 *  rarest: it is drawn only on a one-in-five sub-roll. */
export function foundBookPool(player) {
  const sb = skillBooksOf(player);
  const out = [];
  for (const w of BOOK_WEAPONS) if (!sb.weapons[w]) out.push(weaponBook(w));
  for (const c of ['herbalism', 'mining', 'cooking']) if (!sb[c]) out.push(craftBook(c));
  if (!sb.martialArt) for (const a of MARTIAL_ARTS) out.push(martialBook(a.id));
  return out;
}

/** Roll a found book. `source` is 'ruin' or 'quest'. Returns a book row or null. */
export function rollFoundBook(player, source, rnd = Math.random) {
  const chance = source === 'quest' ? QUEST_BOOK_CHANCE : RUIN_BOOK_CHANCE;
  if (rnd() >= chance) return null;
  const sb = skillBooksOf(player);
  if (!sb.ritual && rnd() < 0.06) return craftBook('ritual');   // the rarest find
  const pool = foundBookPool(player);
  if (!pool.length) return null;
  // A martial manual is one row of hundreds; weight the pool so a found book
  // is not nearly always a martial art.
  const martial = pool.filter(b => b.kind === 'martial'), rest = pool.filter(b => b.kind !== 'martial');
  const pickFrom = (rest.length && (!martial.length || rnd() < 0.5)) ? rest : martial;
  return pickFrom[Math.floor(rnd() * pickFrom.length)] || null;
}

export function skillBookFaults() {
  const out = [];
  if (BOOK_WEAPONS.includes('staff')) out.push('the staff has a skill book; the ruling says essence-only');
  if (BOOK_WEAPONS.includes('wand')) out.push('the wand has a skill book; the ruling says essence-only');
  for (const w of ['sword', 'dagger', 'axe', 'spear', 'hammer', 'whip', 'scythe', 'javelin', 'bow', 'crossbow']) {
    if (!BOOK_WEAPONS.includes(w)) out.push(`no skill book for ${w}`);
    const b = weaponBook(w);
    if (b && b.price !== 2500) out.push(`${w} book costs ${b.price}, not 25 iron coins`);
  }
  for (const k of ['herbalism', 'mining', 'cooking', 'ritual']) if (!CRAFT_BOOKS[k]) out.push(`no ${k} book`);
  if (MARTIAL_ARTS.length < 300) out.push('too few martial arts');
  const ids = new Set();
  for (const w of BOOK_WEAPONS) { const b = weaponBook(w); if (ids.has(b.id)) out.push(`duplicate book ${b.id}`); ids.add(b.id); }
  // A player learns one martial art.
  const p = { skillBooks: newSkillBooks() };
  const first = learnBook(p, martialBook(MARTIAL_ARTS[0].id).id);
  const second = learnBook(p, martialBook(MARTIAL_ARTS[5].id).id);
  if (!first.ok) out.push('the first martial art would not learn');
  if (second.ok) out.push('a second martial art learned; the ruling says one');
  return out;
}
