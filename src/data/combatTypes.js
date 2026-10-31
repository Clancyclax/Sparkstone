// ===========================================================================
// ROUND 384 -- TWENTY-EIGHT DAMAGE TYPES, DEALT AND RESISTED THE SAME WAY.
//
// The user: "All 29 damage types should be in the game the same way with the
// exception of transcendent damage. For the other 28 types they should roll on
// armor, trinkets, weapons, monsters and players should have resistance,
// attacks and spells should deal those types of damage depending on the
// abilities, and monsters. Slashing, blunt and piercing should be affected by a
// monster's hide, and a player's armor."
//
// This is the COMBAT half (gear affixes are the gear lane's). One file, four
// tables, read by the generator (what an ability deals), the damage text
// (what the card says it deals) and WorldScene (what a monster takes / deals):
//
//   ABILITY_TYPE_BY_ESSENCE / _BY_FAMILY  which of the 28 an essence's damage is
//   TYPE_WEAKNESS                        what a thing MADE of a type is weak to
//   HIDE_CLASSES                         what a hide does to slashing / blunt / piercing
//   FAMILY_COMBAT                        each monster family's blow, hide, resists, weaknesses
//
// THE STAT KEY for a resistance is `resist_<type>` for every key of
// stats.js DAMAGE_TYPES except transcendent -- resist_water, resist_necrotic,
// resist_slashing. The player's hit path reads minorStats[`resist_<type>`] and,
// when that key is not on the sheet, passiveMods.resistBonus[<type>].
// ===========================================================================
import { DAMAGE_TYPES } from './stats.js';
import { VARIANT_ELEMENT } from './monsterDebuffs.js';
import { FAMILY_ELEMENT } from './stats.js';

/** The 28: every damage type but transcendent and the untyped `physical` (gearDamageTypes.js GEAR_RESIST_TYPES is the same set). */
export const COMBAT_TYPES = Object.keys(DAMAGE_TYPES).filter(k => !DAMAGE_TYPES[k].pierces && k !== 'physical');
/** The three a hide or an armour weight answers. `physical` is the untyped fourth (hide-neutral). */
export const PHYS_SUBTYPES = ['slashing', 'blunt', 'piercing'];
export const isPhysSubtype = (t) => PHYS_SUBTYPES.includes(t);

// ---------------------------------------------------------------------------
// 1. WHAT AN ABILITY DEALS. Family default, essence override. Keyed by the
//    essence id with its `ess` prefix stripped and lower-cased (essWater ->
//    'water', essshadow -> 'shadow'). The six geared types stay where they are
//    the natural fit (fire is fire, Lightning is lightning, Cold is frost).
//    `null` keeps the ability's own channel.
// ---------------------------------------------------------------------------
export const ABILITY_TYPE_BY_FAMILY = {
  fire: 'fire', cold: 'frost', storm: 'lightning', air: 'wind', water: 'water', aquatic: 'water',
  earth: 'earth', serpent: 'poison', blood: 'blood', death: 'death', dark: 'dark', light: 'light',
  life: 'life', mind: 'arcane', space: 'dimension', order: 'radiant', identity: null, motion: 'blunt',
  force: 'blunt', beast: 'slashing', smallbeast: 'piercing', flyer: 'slashing', guard: 'blunt',
  craft: 'blunt', blade: 'slashing', polearm: 'piercing', bludgeon: 'blunt', ranged: 'piercing',
  alchemy: 'poison',
};
export const ABILITY_TYPE_BY_ESSENCE = {
  // cold: the frozen solid is ice, the chill is frost
  ice: 'ice', cold: 'frost',
  // earth: crystal is rock, dust and sand are sand, glass cuts
  crystal: 'rock', dust: 'sand', sand: 'sand', glass: 'slashing', earth: 'earth',
  // aquatic: reef is rock, the biters bite
  coral: 'rock',
  // death: rot is necrotic, the grave is death
  blight: 'necrotic', feeble: 'necrotic', bone: 'death',
  // dark: the sins and the malign curse, dissonance disrupts, the void is between places
  shadow: 'shadow', smoke: 'shadow', sin: 'curse', malign: 'curse', discord: 'disruptive', void: 'dimension',
  lurker: 'dark',
  // light: the sun, the stars and purity are radiant; moonlight and shimmer are light
  sun: 'radiant', star: 'radiant', pure: 'radiant', light: 'light', moon: 'light', shimmer: 'light',
  // life: the green things are plant, the oldest growth is nature, life is life
  plant: 'plant', brush: 'plant', wood: 'plant', fungus: 'plant', tree: 'nature', growth: 'nature',
  life: 'life', heal: 'life',
  // mind: sound returns as resonance, the omen is a curse
  echo: 'resonating', omen: 'curse',
  // order: song and harmony resonate, still water is water
  harmonic: 'resonating', song: 'resonating', serene: 'water', balance: 'radiant',
  // identity: what each face is
  avatar: 'arcane', mirror: 'light', visage: 'shadow', elemental: null,
  // force: concentrated power disrupts, conviction burns bright, the planted foot is blunt
  potent: 'disruptive', zeal: 'radiant', might: 'blunt', resolute: 'blunt',
  // motion: blades of motion slash
  dance: 'slashing', swift: 'slashing',
  // beasts by what they hit with
  ape: 'blunt', bear: 'slashing', cattle: 'blunt', dog: 'piercing', goat: 'blunt', heidel: 'blunt',
  sloth: 'slashing', wolf: 'piercing',
  cat: 'slashing', deer: 'piercing', flea: 'piercing', fox: 'piercing', monkey: 'blunt', mouse: 'piercing',
  rabbit: 'blunt', rat: 'piercing', skunk: 'poison',
  bat: 'piercing', bee: 'poison', wasp: 'poison', bird: 'slashing', chicken: 'piercing', duck: 'blunt',
  locust: 'slashing', wing: 'wind',
  // blades and polearms by their edge or point
  needle: 'piercing', spike: 'piercing', claw: 'slashing', knife: 'slashing', sickle: 'slashing',
  sword: 'slashing', whip: 'slashing',
  rake: 'slashing', sceptre: 'blunt', shovel: 'blunt', staff: 'blunt', trowel: 'slashing',
  fork: 'piercing', hook: 'piercing', spear: 'piercing',
  axe: 'slashing', hammer: 'blunt', bow: 'piercing', gun: 'piercing',
  pangolin: 'slashing',
  // craft: threads and paper cut, the trap bites, technology sparks
  hair: 'slashing', paper: 'slashing', thread: 'slashing', trap: 'piercing', technology: 'lightning',
};

const essKey = (id) => String(id || '').replace(/^ess/, '').toLowerCase();

/**
 * The damage type an ability built from this essence deals. `channel` is the
 * ability's own element (one of the six, 'physical', or transcendent). A
 * transcendent ability is never re-typed; an essence the tables do not name
 * keeps its channel.
 */
export function abilityDamageType(essenceId, family, channel) {
  if (channel === 'transcendent') return null;
  const k = essKey(essenceId);
  let t = Object.prototype.hasOwnProperty.call(ABILITY_TYPE_BY_ESSENCE, k) ? ABILITY_TYPE_BY_ESSENCE[k]
    : (Object.prototype.hasOwnProperty.call(ABILITY_TYPE_BY_FAMILY, family || '') ? ABILITY_TYPE_BY_FAMILY[family] : undefined);
  if (t === undefined || t === null) return null;
  return COMBAT_TYPES.includes(t) ? t : null;
}

/** The nearest of the six geared channels, for systems that only know six (the proc dot's label). */
export const TYPE_CHANNEL = {
  water: 'frost', ice: 'frost', rock: 'nature', earth: 'nature', sand: 'nature', wind: 'lightning',
  light: 'radiant', dark: 'shadow', plant: 'nature', life: 'radiant', death: 'shadow', blood: 'physical',
  poison: 'nature', necrotic: 'shadow', curse: 'shadow', arcane: 'lightning', resonating: 'lightning',
  disruptive: 'shadow', dimension: 'shadow', slashing: 'physical', blunt: 'physical', piercing: 'physical',
};
export const channelOf = (t) => (TYPE_CHANNEL[t] || t || 'physical');

// ---------------------------------------------------------------------------
// 2. OPPOSITES. A creature MADE of the key type is weak to every listed type.
//    The six's old pairs (fire<->frost, lightning<->nature, shadow<->radiant)
//    are kept and extended: fire<->ice/water, life<->death/necrotic,
//    light<->dark, earth<->wind.
// ---------------------------------------------------------------------------
export const TYPE_WEAKNESS = {
  fire: ['frost', 'ice', 'water'], frost: ['fire'], ice: ['fire', 'blunt'], water: ['lightning', 'plant'],
  lightning: ['nature', 'earth'], nature: ['lightning', 'fire'], earth: ['wind', 'water'], rock: ['water', 'resonating'],
  sand: ['water', 'wind'], wind: ['earth', 'rock'], shadow: ['radiant', 'light'], radiant: ['shadow', 'dark'],
  light: ['dark', 'shadow'], dark: ['light', 'radiant'], plant: ['fire', 'death'], life: ['death', 'necrotic'],
  death: ['life', 'radiant'], necrotic: ['life', 'light'], blood: ['poison', 'fire'], poison: ['life', 'fire'],
  curse: ['radiant', 'arcane'], arcane: ['disruptive'], resonating: ['disruptive'], disruptive: ['resonating'],
  dimension: ['arcane', 'disruptive'],
};
export function typeWeakTo(own, type) {
  return !!(own && type && (TYPE_WEAKNESS[own] || []).includes(type));
}

// ---------------------------------------------------------------------------
// 3. HIDES. A damage multiplier per type; absent = 1. The user's own examples:
//    scaled resists slashing and is weak to blunt; carapace resists piercing
//    and slashing, weak to blunt; fur/soft is weak to slashing; rock resists
//    slashing and piercing, weak to blunt; ethereal resists all physical and
//    is weak to arcane and light.
// ---------------------------------------------------------------------------
export const HIDE_CLASSES = {
  soft:     { label: 'Soft hide',  slashing: 1.25, piercing: 1.15 },
  fur:      { label: 'Fur',        slashing: 1.2, piercing: 1.1, blunt: 0.9 },
  thick:    { label: 'Thick hide', slashing: 0.9, piercing: 0.9, blunt: 1.1 },
  scaled:   { label: 'Scales',     slashing: 0.7, blunt: 1.25 },
  carapace: { label: 'Carapace',   slashing: 0.7, piercing: 0.7, blunt: 1.3 },
  plated:   { label: 'Plating',    slashing: 0.65, piercing: 0.85, blunt: 1.2 },
  rock:     { label: 'Rock body',  slashing: 0.6, piercing: 0.65, blunt: 1.35, resonating: 1.2 },
  crystal:  { label: 'Crystal body', slashing: 0.75, piercing: 0.8, blunt: 1.35, resonating: 1.35 },
  bone:     { label: 'Bare bone',  slashing: 0.8, piercing: 0.7, blunt: 1.35 },
  bark:     { label: 'Bark',       slashing: 1.15, piercing: 0.85, blunt: 0.9, fire: 1.15 },
  gel:      { label: 'Gel body',   slashing: 0.9, piercing: 0.8, blunt: 0.6 },
  ethereal: { label: 'Ethereal',   slashing: 0.5, piercing: 0.5, blunt: 0.5, physical: 0.5, arcane: 1.3, light: 1.3, radiant: 1.25 },
};
/** How much a hide resists (a family's typed table) and how much a weakness adds. */
export const FAMILY_RESIST = 0.35;
export const FAMILY_WEAK = 0.35;

// ---------------------------------------------------------------------------
// 4. MONSTER FAMILIES: [physical blow, hide, typed blow or null, resists, weaknesses]
//    `typed` is given only to things whose blow is magic or made of a substance
//    (a wraith, a blood demon, a living rock); a beast that lives in the cold
//    still bites, so armour answers it and it RESISTS the cold instead.
//    `typed` replaces the family's old FAMILY_ELEMENT default (a variant suffix
//    that names an element -- Ember, Glacial, Void -- still wins). `phys` is
//    what the bite / claw / club is, read by the player's armour.
// ---------------------------------------------------------------------------
const F = (phys, hide, typed, resist, weak) => ({ phys, hide, typed, resist: resist ? resist.split(' ') : [], weak: weak ? weak.split(' ') : [] });
export const FAMILY_COMBAT = {
  slime: F('blunt', 'gel', null, 'poison water', 'fire lightning'),
  lizard: F('piercing', 'scaled', 'poison', 'poison sand', 'ice frost'),
  bat: F('piercing', 'fur', 'blood', 'dark wind', 'light radiant'),
  spider: F('piercing', 'carapace', 'poison', 'poison dark', 'fire'),
  shade: F('slashing', 'ethereal', 'curse', 'dark curse', 'light radiant'),
  raptor: F('slashing', 'scaled', null, 'earth', 'ice blood'),
  wolf: F('piercing', 'fur', null, 'frost ice', 'fire'),
  boar: F('piercing', 'crystal', null, 'earth rock', 'resonating'),
  demon: F('slashing', 'thick', 'blood', 'fire curse dark', 'radiant light'),
  slimeGolem: F('blunt', 'gel', 'poison', 'poison earth', 'lightning'),
  elemental: F('blunt', 'rock', 'lightning', 'arcane', 'disruptive'),
  hydra: F('piercing', 'scaled', 'poison', 'poison water', 'fire'),
  chimera: F('slashing', 'thick', 'fire', 'fire', 'ice'),
  skeleton: F('slashing', 'bone', 'necrotic', 'necrotic death', 'light life'),
  hellhound: F('piercing', 'fur', 'fire', 'fire', 'water ice'),
  spinosaurus: F('slashing', 'scaled', null, 'water', 'lightning'),
  trex: F('piercing', 'thick', null, 'earth', 'ice blood'),
  dragon: F('slashing', 'scaled', 'fire', 'fire earth', 'ice arcane'),
  scorpion: F('piercing', 'carapace', 'poison', 'sand poison', 'water ice'),
  direbuck: F('piercing', 'fur', null, 'nature plant', 'poison'),
  hornram: F('blunt', 'fur', null, 'frost ice', 'necrotic'),
  giantToad: F('blunt', 'soft', null, 'water poison', 'sand fire'),
  cobra: F('piercing', 'scaled', 'poison', 'poison', 'frost ice'),
  mantis: F('slashing', 'carapace', null, 'plant', 'fire'),
  crocodile: F('piercing', 'scaled', null, 'water', 'poison'),
  whitelion: F('slashing', 'fur', null, 'frost ice', 'poison'),
  medusa: F('piercing', 'scaled', 'rock', 'rock poison', 'light'),
  yeti: F('blunt', 'fur', null, 'ice frost', 'fire'),
  minotaur: F('blunt', 'thick', null, 'earth', 'arcane'),
  phoenix: F('slashing', 'soft', 'fire', 'fire light', 'water ice'),
  thunderbird: F('slashing', 'soft', 'lightning', 'lightning wind', 'rock earth'),
  quillFiend: F('piercing', 'thick', null, 'plant', 'blood'),
  gnoll: F('slashing', 'fur', null, 'death', 'radiant'),
  spiritSerpent: F('piercing', 'ethereal', 'arcane', 'arcane dimension', 'disruptive light'),
  steelRaptor: F('slashing', 'plated', null, 'poison blood', 'lightning water'),
  shellborn: F('blunt', 'carapace', 'water', 'water rock', 'resonating lightning'),
  harbinger: F('slashing', 'ethereal', 'death', 'death dark', 'light life'),
  sixArmApe: F('blunt', 'fur', null, 'earth', 'poison'),
  tidalTroll: F('blunt', 'thick', null, 'water ice', 'lightning fire'),
  glasscat: F('slashing', 'crystal', null, 'light radiant', 'resonating'),
  sharkcrab: F('slashing', 'carapace', null, 'water', 'lightning'),
  flowerhydra: F('piercing', 'bark', 'plant', 'plant water', 'fire death'),
  birdangel: F('slashing', 'soft', 'light', 'light radiant', 'dark curse'),
  demonsloth: F('slashing', 'thick', 'curse', 'dark curse', 'radiant'),
  bloomimp: F('piercing', 'bark', 'plant', 'plant life', 'fire'),
  vinegrasp: F('blunt', 'bark', 'plant', 'plant earth', 'fire wind'),
  snapmaw: F('piercing', 'bark', 'plant', 'plant water', 'fire'),
  gnawling: F('piercing', 'fur', null, 'death', 'necrotic'),
  grubwyrm: F('blunt', 'soft', null, 'earth sand', 'ice frost'),
  duskmoth: F('slashing', 'soft', 'dark', 'dark wind', 'fire light'),
  gourdkin: F('blunt', 'bark', 'plant', 'plant water', 'fire'),
  inkwell: F('blunt', 'gel', 'dark', 'dark water', 'light'),
  cinderlamb: F('blunt', 'fur', 'fire', 'fire', 'water'),
  longshanks: F('piercing', 'soft', null, 'wind', 'rock'),
  bellhive: F('piercing', 'carapace', 'poison', 'poison resonating', 'fire wind'),
  clockcrawler: F('piercing', 'plated', null, 'poison blood', 'lightning water'),
  sporemother: F('blunt', 'soft', 'poison', 'poison plant', 'fire'),
  pitcherling: F('blunt', 'bark', 'poison', 'poison water', 'fire'),
  bonepecker: F('piercing', 'bone', null, 'death necrotic', 'life'),
  driftreaver: F('slashing', 'scaled', 'water', 'water wind', 'lightning'),
  urchinroll: F('piercing', 'carapace', null, 'water', 'lightning'),
  gravesown: F('blunt', 'bone', 'necrotic', 'necrotic death plant', 'light life'),
  tunnelmaw: F('piercing', 'thick', null, 'earth rock sand', 'water wind'),
  stringless: F('slashing', 'bark', 'curse', 'poison blood', 'fire'),
  rimehare: F('piercing', 'fur', null, 'ice frost', 'fire'),
  shiverfox: F('piercing', 'fur', null, 'frost ice', 'poison'),
  tuskmaw: F('piercing', 'thick', null, 'ice frost', 'necrotic'),
  lurefin: F('piercing', 'scaled', null, 'water', 'lightning'),
  drownwight: F('blunt', 'soft', 'water', 'water necrotic', 'lightning light'),
  lanternwraith: F('slashing', 'ethereal', 'necrotic', 'dark death', 'light wind'),
  rustmantle: F('slashing', 'plated', null, 'rock', 'water lightning'),
  smokecur: F('piercing', 'ethereal', 'fire', 'fire wind', 'water'),
  sporehorn: F('piercing', 'bark', 'poison', 'poison plant', 'fire'),
  saltwife: F('blunt', 'crystal', 'water', 'water sand', 'resonating'),
  monocul: F('blunt', 'thick', 'arcane', 'arcane', 'light'),
  mournhusk: F('blunt', 'bark', 'death', 'death necrotic', 'fire light'),
  kilnwarden: F('blunt', 'rock', 'fire', 'fire rock', 'water ice'),
  ossuaryKnight: F('slashing', 'plated', 'necrotic', 'necrotic death', 'light'),
  pallbearer: F('blunt', 'bone', 'death', 'death curse', 'life light'),
  geodeback: F('blunt', 'rock', 'rock', 'rock earth', 'resonating plant'),
  hollowchoir: F('blunt', 'ethereal', 'resonating', 'resonating dark', 'disruptive light'),
  glasswader: F('piercing', 'crystal', 'light', 'light', 'resonating'),
  stormjar: F('blunt', 'crystal', 'lightning', 'lightning wind', 'earth rock'),
  cairnbeast: F('blunt', 'rock', 'earth', 'earth rock', 'plant resonating'),
  totemstalk: F('piercing', 'bark', 'curse', 'curse plant', 'fire'),
  scalecurl: F('slashing', 'scaled', null, 'sand', 'frost'),
  shardling: F('piercing', 'crystal', 'arcane', 'arcane light', 'resonating'),
};

/** A family's combat row, or a neutral one. */
export function familyCombat(family) {
  return FAMILY_COMBAT[family] || { phys: 'physical', hide: null, typed: null, resist: [], weak: [] };
}

/**
 * What a spawned monster of this type deals: { dmgElement, physType }.
 * dmgElement keeps its round-10 meaning (null = physical, answered by armour);
 * a variant suffix that names an element wins, then the family's typed blow,
 * then the old FAMILY_ELEMENT default.
 */
export function monsterDamageProfile(typeKey, family) {
  const row = familyCombat(family);
  const suffix = String(typeKey || '').slice(String(family || '').length);
  let el;
  if (Object.prototype.hasOwnProperty.call(VARIANT_ELEMENT, suffix)) el = VARIANT_ELEMENT[suffix];
  else el = row.typed !== null && row.typed !== undefined ? row.typed : (FAMILY_ELEMENT[family] || null);
  return { dmgElement: el || null, physType: row.phys || 'physical' };
}

/**
 * The family table's multiplier on a blow of `type`: the hide's figure for the
 * type, times 1 - FAMILY_RESIST for a listed resistance (less `shred`, the
 * [Exposed] stacks), times 1 + FAMILY_WEAK for a listed weakness. Floored at
 * 0.3 so no stacking of hide and resistance makes a thing immune.
 */
export function familyTypeMult(family, type, shred = 0, opts = {}) {
  if (!type) return 1;
  const row = familyCombat(family);
  let k = 1;
  const hide = row.hide && HIDE_CLASSES[row.hide];
  if (hide && typeof hide[type] === 'number') k *= (hide[type] < 1 ? Math.min(1, hide[type] + shred) : hide[type]);
  if (!opts.ignoreResist && row.resist.includes(type)) k *= 1 - Math.max(0, FAMILY_RESIST - shred);
  if (row.weak.includes(type)) k *= 1 + FAMILY_WEAK;
  return Math.max(0.3, k);
}

/** One line for a tooltip / bestiary page: "Scales -- resists fire, earth; weak to ice, arcane". */
/** ROUND 385 -- `reveal` ({ readHide, readResist, readWeak }) limits the line to what the player can read; without it
 *  the whole line (the suite's view). What a family DEALS is always shown: it is what you feel when it hits you. */
export function familyCombatLine(family, reveal = null) {
  const row = FAMILY_COMBAT[family];
  if (!row) return '';
  const lab = (t) => String((DAMAGE_TYPES[t] && DAMAGE_TYPES[t].label) || t).toLowerCase();
  const hide = row.hide && HIDE_CLASSES[row.hide];
  const hideBits = hide ? PHYS_SUBTYPES.filter(t => hide[t] && hide[t] !== 1)
    .map(t => `${t} ${hide[t] > 1 ? '+' : '-'}${Math.round(Math.abs(hide[t] - 1) * 100)}%`) : [];
  const parts = [`Deals ${row.typed ? `${lab(row.typed)} and ` : ''}${row.phys || 'physical'} damage`];
  const r = reveal || { readHide: true, readResist: true, readWeak: true };
  if (hide && r.readHide) parts.push(hideBits.length ? `${hide.label} (${hideBits.join(', ')})` : hide.label);
  if (row.resist.length && r.readResist) parts.push(`resists ${row.resist.map(lab).join(', ')}`);
  if (row.weak.length && r.readWeak) parts.push(`weak to ${row.weak.map(lab).join(', ')}`);
  if (reveal && !(r.readHide && r.readResist && r.readWeak)) parts.push('a perception sense reads the rest');
  return parts.join(' -- ');
}

// ---------------------------------------------------------------------------
// 5. THE KIT PASS. Run on a built kit before the round-383 type callouts, so
//    the card names the type this stamps. `damageType` rides beside `element`:
//    `element` stays the ability's channel (its colour, sound, proc label and
//    every six-channel system that reads it), `damageType` is what the hit IS
//    and what WorldScene `_specElement` hands the damage path.
//    A special attack that needs a sword, hammer or spear swings that weapon:
//    a physical-kind blow takes the weapon's slashing / blunt / piercing.
// ---------------------------------------------------------------------------
import { weaponDamageType } from './weapons.js';
const PHYS_KIND = new Set(['physical', 'slashing', 'blunt', 'piercing']);
export function stampAbilityDamageType(a, ESSENCES) {
  if (!a || a.canonKey || a.template === 'imbueStrike') return a;
  if (a.element === 'transcendent' || a.fallbackElement) return a;
  const channel = a.element || 'physical';
  const ess = ESSENCES && a.essenceId ? ESSENCES[a.essenceId] : null;
  let t = abilityDamageType(a.essenceId, ess && ess.family, channel);
  const w = a.requiresWeapon;
  if (w && w !== 'any' && w !== 'unarmed') {
    const wt = weaponDamageType(w);
    if (isPhysSubtype(wt) && (PHYS_KIND.has(channel) || !t || PHYS_KIND.has(t))) t = wt;
  }
  // A channel-typed ability (fire, lightning ...) is never turned into a bare physical subtype by its essence
  // family alone unless the essence names one (Glass cuts): the family default only re-types physical channels.
  if (t && isPhysSubtype(t) && !PHYS_KIND.has(channel) && !(w && w !== 'any' && w !== 'unarmed')
    && !Object.prototype.hasOwnProperty.call(ABILITY_TYPE_BY_ESSENCE, essKey(a.essenceId))) t = null;
  if (!t || t === channel) return a;
  const out = { ...a, damageType: t };
  // "a bolt of shadow that deals 18 arcane damage": the bolt is made of what it deals. The generator's
  // ELEMENT_PHRASE word for the channel, after a projectile / area noun, becomes the type's own substance.
  const was = CHANNEL_PHRASE[channel], now = TYPE_SUBSTANCE[t];
  if (was && now && typeof out.desc === 'string') {
    out.desc = out.desc.replace(new RegExp(`\\b(bolts?|shots?|bursts?|waves?|cones?|lances?|rays?|sprays?|blasts?|novas?|pulses?|torrents?|volleys?|beams?|spears?|ring|field|storm) of ${was}\\b`, 'g'), `$1 of ${now}`);
  }
  return out;
}
// WorldScene / awakening ELEMENT_PHRASE (the channel as a substance word) and each finer type's substance.
const CHANNEL_PHRASE = { fire: 'fire', frost: 'frost', lightning: 'lightning', nature: 'nature', shadow: 'shadow', radiant: 'light' };
const TYPE_SUBSTANCE = {
  water: 'water', ice: 'ice', rock: 'stone', earth: 'earth', sand: 'sand', wind: 'wind', light: 'light', dark: 'darkness',
  plant: 'thorns', life: 'life', death: 'death', blood: 'blood', poison: 'venom', necrotic: 'rot', curse: 'malice',
  arcane: 'arcane force', resonating: 'sound', disruptive: 'dissonance', dimension: 'folded space',
  fire: 'fire', frost: 'frost', lightning: 'lightning', nature: 'nature', shadow: 'shadow', radiant: 'light',
};
export function stampKitDamageTypes(known, ESSENCES) {
  for (const en of Object.values(known || {})) {
    const a = en && en.ability;
    const b = stampAbilityDamageType(a, ESSENCES);
    if (b !== a) en.ability = b;
  }
  return known;
}
