// ============================================================================
// ROUND 384 -- GEAR AGAINST EVERY DAMAGE TYPE, AND ARMOUR WEIGHT CLASSES.
//
// The user: "All 29 damage types should be in the game the same way with the
// exception of transcendent damage. For the other 28 types they should roll on
// armor, trinkets, weapons, monsters and players should have resistance...
// Slashing, blunt and piercing should be affected by a monster's hide, and a
// player's armor. Heavy armor is better against slashing and piercing, has
// additional armor but slows a player down by 35% and doubles stamina drain
// while sprinting. Medium armor is okay against slashing and piercing but slows
// a player down by 20%. Light armor provides minimal protection against
// slashing, piercing and blunt but doesn't slow the player down."
//
// This file is the GEAR half (the combat lane owns monster hides and the
// mitigation path, which reads `resist_<type>` and calls the scene's
// `_armourClassVsPhysical(type)`). It holds:
//   1. the 28 resistible types and how often each rolls (`pickResistType`);
//   2. a weapon's typed damage roll ("+3 Blood damage on hit" / "25% of this
//      weapon's damage is dealt as Necrotic damage") and the rolled-weapon
//      record that carries it;
//   3. the armour classes: what class a piece is, what class the wearer is in,
//      and the numbers each class applies.
//
// No import of stats.js: stats.js imports THIS file (the minor-stat registry
// needs the type list), and a cycle is one import away. The type list is
// written out and a test checks it against stats.js DAMAGE_TYPES.
// ============================================================================

/** The six that have always had a resistance stat. Still the common rolls. */
export const CLASSIC_RESIST_TYPES = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];
/** The other twenty-two: every DAMAGE_TYPES key except transcendent (which
 *  nothing reduces, by canon) and `physical` (untyped -- not one of the user's
 *  twenty-nine; armour answers it). */
export const FINER_RESIST_TYPES = [
  'water', 'ice', 'rock', 'earth', 'sand', 'wind', 'light', 'dark', 'plant', 'life', 'death',
  'blood', 'poison', 'necrotic', 'curse', 'arcane',
  'slashing', 'blunt', 'piercing',
  'resonating', 'disruptive', 'dimension',
];
export const GEAR_RESIST_TYPES = [...CLASSIC_RESIST_TYPES, ...FINER_RESIST_TYPES];
export const PHYSICAL_SUBTYPES = ['slashing', 'blunt', 'piercing'];

/** Labels, as stats.js DAMAGE_TYPES has them (test-checked). */
export const RESIST_TYPE_LABEL = {
  fire: 'Fire', frost: 'Frost', lightning: 'Lightning', nature: 'Nature', shadow: 'Shadow', radiant: 'Radiant',
  water: 'Water', ice: 'Ice', rock: 'Rock', earth: 'Earth', sand: 'Sand', wind: 'Wind', light: 'Light', dark: 'Dark',
  plant: 'Plant', life: 'Life', death: 'Death', blood: 'Blood', poison: 'Poison', necrotic: 'Necrotic', curse: 'Curse',
  arcane: 'Arcane', slashing: 'Slashing', blunt: 'Blunt', piercing: 'Piercing',
  resonating: 'Resonating Force', disruptive: 'Disruptive Force', dimension: 'Dimension',
};

/** The item-name suffix a finer resistance gives a piece, alongside the six
 *  classic "of Ember-Warding" ones in stats.js STAT_SUFFIX. */
export const FINER_RESIST_SUFFIX = {
  resist_water: 'of Tide-Warding', resist_ice: 'of Rime-Warding', resist_rock: 'of Stone-Warding',
  resist_earth: 'of Loam-Warding', resist_sand: 'of Dune-Warding', resist_wind: 'of Gale-Warding',
  resist_light: 'of Glare-Warding', resist_dark: 'of Gloom-Warding', resist_plant: 'of Bramble-Warding',
  resist_life: 'of Bloom-Warding', resist_death: 'of Grave-Warding', resist_blood: 'of Blood-Warding',
  resist_poison: 'of Venom-Warding', resist_necrotic: 'of Rot-Warding', resist_curse: 'of Hex-Warding',
  resist_arcane: 'of Spell-Warding', resist_slashing: 'of the Turned Edge', resist_blunt: 'of the Anvil',
  resist_piercing: 'of the Turned Point', resist_resonating: 'of Stillness', resist_disruptive: 'of the Anchor',
  resist_dimension: 'of the Fixed Star',
};

// ---------------------------------------------------------------------------
// 1. HOW OFTEN EACH TYPE ROLLS.
//
// Classic six at 10 each (60 of ~92: about two rolls in three), the sixteen
// elemental additions at 1.5, the three physical subtypes at 2 (armour already
// answers them, so a resistance to them is a second layer and should not be
// rare), and the two forces and dimension at 0.5. A THEME (the type the thing
// that dropped it deals) adds 15, so a necrotic monster's drops lean necrotic.
// ---------------------------------------------------------------------------
export const RESIST_ROLL_WEIGHT = Object.fromEntries(GEAR_RESIST_TYPES.map(t => [t,
  CLASSIC_RESIST_TYPES.includes(t) ? 10
    : PHYSICAL_SUBTYPES.includes(t) ? 2
      : ['resonating', 'disruptive', 'dimension'].includes(t) ? 0.5 : 1.5]));
export const THEME_WEIGHT_BONUS = 15;

/** One weighted pick among `types`, consuming exactly ONE draw of `rng`. */
export function pickResistType(rng, theme = null, types = GEAR_RESIST_TYPES) {
  let total = 0;
  const w = types.map(t => { const v = (RESIST_ROLL_WEIGHT[t] || 1) + (t === theme ? THEME_WEIGHT_BONUS : 0); total += v; return v; });
  let r = rng() * total;
  for (let i = 0; i < types.length; i++) { r -= w[i]; if (r < 0) return types[i]; }
  return types[types.length - 1];
}

/** Resistance a single rolled buff carries at green tier, before rarity
 *  concentration and rank. The physical three are lower: armour (and the
 *  armour class) already answers them. */
export function resistBuffBase(type) {
  return PHYSICAL_SUBTYPES.includes(type) ? 0.05 : 0.08;
}

/** How often a rolled resistance on GEAR is one of the finer 22 rather than a
 *  classic six. Stated as the weight table's own share so the two agree. */
export const FINER_SHARE = (() => {
  const tot = GEAR_RESIST_TYPES.reduce((s, t) => s + RESIST_ROLL_WEIGHT[t], 0);
  return FINER_RESIST_TYPES.reduce((s, t) => s + RESIST_ROLL_WEIGHT[t], 0) / tot;
})();

// ---------------------------------------------------------------------------
// 2. WEAPONS: TYPED DAMAGE.
//
// A rolled weapon (Uncommon and up) carries ONE typed rider, either
//   flat:    "+N <Type> damage on hit" -- an extra typed hit on every blow,
//            sized off the weapon's own base so a dagger's is small;
//   convert: "P% of this weapon's damage is dealt as <Type> damage" -- the
//            blow is split, that share answered by resistance instead of armour.
// Read on every weapon hit by the scene's `_gearTypedSplit` / `_gearTypedStrike`
// (armourClassMixin.js). Slashing, blunt, piercing and transcendent are never
// rolled as a rider.
// ---------------------------------------------------------------------------
const TYPED_FLAT_FRAC = { Uncommon: 0.2, Rare: 0.25, Epic: 0.3, Legendary: 0.4, Divine: 0.4 };
const TYPED_CONVERT = { Uncommon: 0.2, Rare: 0.25, Epic: 0.3, Legendary: 0.4, Divine: 0.4 };
const RANKS = ['iron', 'bronze', 'silver', 'gold'];

export function rollWeaponTyped(rng, { rarity, rank = 'iron', base = 8, ownType = null, theme = null } = {}) {
  if (!TYPED_FLAT_FRAC[rarity]) return null;
  // Not the physical three: a weapon already deals one of them, and armour answers them, so a rider of one is not typed damage.
  const pool = GEAR_RESIST_TYPES.filter(t => t !== ownType && !PHYSICAL_SUBTYPES.includes(t));
  const type = pickResistType(rng, theme, pool);
  const convert = rng() < 0.4;
  if (convert) return { type, convert: TYPED_CONVERT[rarity] };
  const rk = 1 + 0.25 * Math.max(0, RANKS.indexOf(rank));
  return { type, flat: Math.max(1, Math.round(base * TYPED_FLAT_FRAC[rarity] * rk)) };
}

/** The card line for a weapon's typed rider. */
export function weaponTypedLine(t) {
  if (!t || !RESIST_TYPE_LABEL[t.type]) return '';
  const L = RESIST_TYPE_LABEL[t.type];
  if (t.convert) return `${Math.round(t.convert * 100)}% of this weapon's damage is dealt as ${L} damage`;
  return `+${t.flat} ${L} damage on hit`;
}

/** Split one weapon blow by its typed rider: { phys, typed, type }. `phys`
 *  goes through armour as before; `typed` lands as `type`. Pure, so the
 *  scene and the test share it. */
export function splitTypedBlow(dmg, t, unitK = 1) {
  if (!t || !RESIST_TYPE_LABEL[t.type] || !(dmg > 0)) return { phys: dmg, typed: 0, type: null };
  if (t.convert) {
    const typed = Math.round(dmg * t.convert);
    return { phys: dmg - typed, typed, type: t.type };
  }
  return { phys: dmg, typed: Math.max(1, Math.round((t.flat || 0) * unitK)), type: t.type };
}

// ---------------------------------------------------------------------------
// 3. ARMOUR WEIGHT CLASSES.
//
// WHAT CLASS A PIECE IS (first rule that answers wins):
//   a. `item.armourClass` if the piece carries one;
//   b. the material in its type tags: plate -> heavy; scale or bone -> medium;
//      cloth or leather -> light;
//   c. a material word in its name: metal (iron, steel, copper, bronze,
//      silversteel, skyiron, plate, ...) -> heavy; scale, mail, bone, carapace,
//      wood -> medium; hide, leather, pelt, fur, silk, cloth, wool, flax,
//      feathers, robe -> light;
//   d. its noun: Cuirass, Breastplate, Helm, Gauntlets, Greaves -> heavy;
//      Hauberk, Casque, Girdle, Chausses -> medium; Circlet, Gloves, Grips,
//      Belt, Sash, Leggings, Trousers, Breeches, Boots, Treads -> light;
//   e. the slot: chest, legs, helmet -> medium; anything else -> light.
// Rings, amulets and shields have no class (a shield is held, not worn).
//
// WHAT CLASS THE WEARER IS IN: the class with the most COVERAGE among the
// armour worn, coverage being each slot's inherent-armour weight (chest 7,
// legs 5, helmet 4.5, boots 3, gloves 2.5, belt 2) -- so the body armour
// counts most and a full set decides it. A tie goes to the heavier class.
// Nothing worn: no class, and nothing below applies.
// ---------------------------------------------------------------------------
export const ARMOUR_CLASSES = ['heavy', 'medium', 'light'];
export const ARMOUR_CLASS_LABEL = { heavy: 'Heavy armour', medium: 'Medium armour', light: 'Light armour' };
/** The numbers. `armor` multiplies each piece's inherent armour; `vs` is the
 *  damage multiplier against that physical type when worn; `move` multiplies
 *  movement speed; `sprint` multiplies sprint stamina drain. */
// ROUND 388 -- HEAVY IS THE FULL VALUE. "Heavy armor blocking 35% makes sense with its downsides." A slot's armour
// (stats.js SLOT_ARMOR) is now what a HEAVY piece carries: a full heavy set of your own rank stops 35% of your own rank's
// blows. Medium carries 70% of it (about 27%), light 45% (about 19%). Before, heavy was x1.3 (41%), medium x1 (35%) and
// light x0.75 (29%).
export const ARMOUR_CLASS_FX = {
  heavy:  { armor: 1.0,  vs: { slashing: 0.75, piercing: 0.75, blunt: 1 },    move: 0.65, sprint: 2 },
  medium: { armor: 0.7,  vs: { slashing: 0.88, piercing: 0.88, blunt: 1 },    move: 0.80, sprint: 1 },
  light:  { armor: 0.45, vs: { slashing: 0.96, piercing: 0.96, blunt: 0.96 }, move: 1,    sprint: 1 },
};
export const CLASS_SLOT_COVER = { chest: 7, legs: 5, helmet: 4.5, boots: 3, gloves: 2.5, belt: 2 };

const TAG_CLASS = [[/\bplate\b/, 'heavy'], [/\b(scale|bone)\b/, 'medium'], [/\b(cloth|leather)\b/, 'light']];
const MATERIAL_WORDS = {
  heavy: ['iron', 'steel', 'copper', 'bronze', 'silversteel', 'skyiron', 'plate', 'blackened', 'river-silver', 'star-touched', 'godwrought', 'dragonbone'],
  medium: ['scale', 'scales', 'wyrmscale', 'mail', 'chainmail', 'chain', 'bone', 'boneguard', 'carapace', 'shellborn', 'ivory', 'horn', 'pine', 'ash', 'ironbark', 'duskwood', 'heartwood'],
  light: ['hide', 'leather', 'pelt', 'fur', 'mane', 'silk', 'cloth', 'wool', 'flax', 'spidersilk', 'cloudweave', 'feather', 'feathers', 'quill', 'quills', 'robe', 'robes', 'vestment', 'vestments'],
};
const NOUN_CLASS = {
  cuirass: 'heavy', breastplate: 'heavy', helm: 'heavy', gauntlets: 'heavy', greaves: 'heavy',
  hauberk: 'medium', casque: 'medium', girdle: 'medium', chausses: 'medium',
  circlet: 'light', gloves: 'light', grips: 'light', belt: 'light', sash: 'light', leggings: 'light',
  trousers: 'light', breeches: 'light', boots: 'light', treads: 'light', hood: 'light',
};
const SLOT_DEFAULT_CLASS = { chest: 'medium', legs: 'medium', helmet: 'medium', gloves: 'light', belt: 'light', boots: 'light' };

/** The class of one piece, or null for a non-armour item. */
export function armourClassOf(item) {
  if (!item || !CLASS_SLOT_COVER[item.slot]) return null;
  if (ARMOUR_CLASSES.includes(item.armourClass)) return item.armourClass;
  const tags = String(item.typeTags || '').toLowerCase();
  for (const [re, c] of TAG_CLASS) if (re.test(tags)) return c;
  const words = String(item.name || '').toLowerCase().split(/[^a-z-]+/).filter(Boolean);
  // Material first: a crocodile-hide cuirass is leather, whatever its noun.
  // The light and medium lists are checked before metal so "Ironbark" (a
  // wood) and "Dragonbone" stay what they are -- whole words only.
  for (const c of ['light', 'medium', 'heavy']) if (words.some(w => MATERIAL_WORDS[c].includes(w))) return c;
  for (const w of words.slice().reverse()) if (NOUN_CLASS[w]) return NOUN_CLASS[w];
  return SLOT_DEFAULT_CLASS[item.slot] || 'light';
}

/** The class the wearer is in, from everything worn: { cls, cover }. */
export function wornArmourClass(gear) {
  const cover = { heavy: 0, medium: 0, light: 0 };
  for (const it of Object.values(gear || {})) {
    const c = armourClassOf(it);
    if (c) cover[c] += CLASS_SLOT_COVER[it.slot] || 0;
  }
  let cls = null, best = 0;
  for (const c of ARMOUR_CLASSES) if (cover[c] > best) { best = cover[c]; cls = c; }   // heavy first: ties go heavier
  return { cls, cover };
}

/** Damage multiplier the wearer's class applies to a physical subtype. */
export function armourClassVsPhysical(cls, type) {
  const fx = ARMOUR_CLASS_FX[cls];
  if (!fx) return 1;
  return fx.vs[type] != null ? fx.vs[type] : 1;
}

/** The armour delta a piece's class adds to its inherent armour, as a buff
 *  (so the stat stack and the tooltip read it the same way), or null. */
export function armourClassArmorBuff(item) {
  const c = armourClassOf(item);
  if (!c || ARMOUR_CLASS_FX[c].armor === 1) return null;
  const inherent = ((item && item.buffs) || []).filter(b => b && b.stat === 'armor' && b.inherent)
    .reduce((s, b) => s + (b.amount || 0), 0);
  if (!(inherent > 0)) return null;
  // ROUND 387 -- points; a piece still holding a fraction (an unmigrated save) gets a fraction back, read as a percentage
  const d = inherent * (ARMOUR_CLASS_FX[c].armor - 1);
  return { stat: 'armor', amount: Math.abs(inherent) >= 1 ? Math.round(d) : Math.round(d * 1000) / 1000, armourClass: c };
}

/** The tooltip line a piece's class prints. */
export function armourClassLine(cls) {
  const fx = ARMOUR_CLASS_FX[cls];
  if (!fx) return '';
  const pct = (v) => `${Math.round((1 - v) * 100)}%`;
  // ROUND 389 -- "Armor doesn't need to say 55% less armor, it just has to say how much armor it provides." The card's
  // own "+N Armor" line already includes the class (`_gearStatTotals`), so the class line states only what the class
  // does besides: its damage cut and its penalties. Nothing measured against another class.
  if (cls === 'heavy') return `Heavy armour: ${pct(fx.vs.slashing)} less slashing and piercing damage; movement −${pct(fx.move)}, sprinting drains stamina twice as fast`;
  if (cls === 'medium') return `Medium armour: ${pct(fx.vs.slashing)} less slashing and piercing damage; movement −${pct(fx.move)}`;
  return `Light armour: ${pct(fx.vs.slashing)} less slashing, piercing and blunt damage`;
}
/** Class effects apply by the wearer's class (most coverage), so the card says so. */
export const ARMOUR_CLASS_RULE = 'Your armour class is the class covering most of your body.';

// ---------------------------------------------------------------------------
// A ROLLED WEAPON: the record shape crafting.js `craftedWeaponRecord` makes,
// so the scene's `_weaponDef` / `_wieldedCrafted` / tooltip / save path carry
// it unchanged. `rolled: true` marks it as found rather than made.
// ---------------------------------------------------------------------------
export const ROLLED_WID_PREFIX = 'crafted:';   // shares the crafted id space on purpose
let nextRolledWeapon = 500001;
/** ROUND 385 -- a rolled weapon bought off a shelf: the shelf's record under a fresh id from the player's own id
 *  space, so a lot rolled yesterday can never collide with a weapon they have since been given. */
export function claimRolledWeapon(rec, existing = null) {
  if (!rec) return null;
  for (const k of Object.keys(existing || {})) {
    const n = parseInt(String(k).slice(ROLLED_WID_PREFIX.length), 10);
    if (n >= nextRolledWeapon) nextRolledWeapon = n + 1;
  }
  return { ...rec, buffs: (rec.buffs || []).map(b => ({ ...b })), gearTyped: rec.gearTyped ? { ...rec.gearTyped } : null,
    wid: ROLLED_WID_PREFIX + (nextRolledWeapon++) };
}
export function rolledWeaponRecord({ baseId, baseName, base = 8, ownType = null, rarity, rank = 'iron', buffs = [], typed = null, existing = null }) {
  if (existing) {
    for (const k of Object.keys(existing)) {
      const n = parseInt(String(k).slice(ROLLED_WID_PREFIX.length), 10);
      if (n >= nextRolledWeapon) nextRolledWeapon = n + 1;
    }
  }
  const wid = ROLLED_WID_PREFIX + (nextRolledWeapon++);
  const lead = typed ? ({ resonating: 'Resonant', disruptive: 'Disruptive' }[typed.type] || RESIST_TYPE_LABEL[typed.type]) : null;
  return {
    wid, baseId, rarity, rank,
    name: lead ? `${lead}-${typed.convert ? 'Forged' : 'Touched'} ${baseName}` : baseName,
    buffs: buffs.map(b => ({ ...b })), craftEffects: [], gearTyped: typed ? { ...typed } : null,
    crafted: true, rolled: true,
  };
}
