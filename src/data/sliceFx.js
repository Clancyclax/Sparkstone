// ROUND 303 -- THE SLICE: what a blade-tied "projectile" looks like in the air.
//
//   "Cutting wind is a great chance for a slicing wind animation. We've spoken
//    before about the overuse of bolt, but in cases like this, a projectile
//    tied to the horizontal swing of a weapon it's just replaceable with a
//    slice. I've added new slice animation that in it's base color can be used
//    as a water, or ice slice. Color adjustments for fire (orange/red), wind
//    (green), electric (yellow), holy (white/gold), unholy (black, and purple),
//    blood (crimson) and others should be used."
//
// One crescent, eight frames of 64px, recoloured per variant by
// tools/make_slice_sheets.py into public/assets/slice/slice_<variant>.png.
// `sliceVariantFor` answers which one an ability gets; `isBladeProjectile`
// answers whether it gets one at all (a bolt comes off a swing: a weapon special
// attack that rolled a projectile, or any projectile that needs a weapon in hand).
export const SLICE_VARIANTS = ['water', 'fire', 'wind', 'lightning', 'holy', 'unholy',
  'blood', 'nature', 'steel', 'earth', 'transcendent'];
export const SLICE_FRAMES = 8;
export const SLICE_CELL = 64;
/** Frame time while it flies: the artist's 170ms per frame is a loop on screen;
 *  in the air the whole crescent plays out in about a quarter of a second. */
export const SLICE_FRAME_MS = 34;

const BY_ELEMENT = {
  fire: 'fire',
  frost: 'water', ice: 'water', water: 'water',
  lightning: 'lightning', arcane: 'lightning',
  wind: 'wind',
  nature: 'nature', plant: 'nature', poison: 'nature',
  earth: 'earth', rock: 'earth', sand: 'earth',
  shadow: 'unholy', dark: 'unholy', death: 'unholy', necrotic: 'unholy', curse: 'unholy',
  radiant: 'holy', light: 'holy', life: 'holy',
  blood: 'blood',
  transcendent: 'transcendent',
};
const BY_COLOR = { bloodred: 'blood', blue: 'water', orange: 'fire', yellow: 'lightning', gold: 'holy',
  green: 'wind', brown: 'earth', black: 'unholy', white: 'holy', silver: 'steel', grey: 'steel' };

/** The recolour for an ability: its own words about blood or wind first (a
 *  "Cutting Wind" is a wind whatever its stone), then its damage element, then
 *  its colour name, else steel. */
export function sliceVariantFor(ability, elementOf) {
  const a = ability || {};
  const text = `${a.name || ''} ${a.desc || ''}`;
  if (/blood|crimson|gore|bleed/i.test(text)) return 'blood';
  const el = (typeof elementOf === 'function' ? elementOf(a) : a.element) || null;
  if (el && BY_ELEMENT[el]) return BY_ELEMENT[el];
  if (/\b(wind|gale|gust|zephyr|tempest)\b/i.test(text)) return 'wind';
  const c = typeof a.sliceColorName === 'string' ? a.sliceColorName : null;
  if (c && BY_COLOR[c]) return BY_COLOR[c];
  return 'steel';
}

/** A projectile that comes off a weapon's swing: a weapon special attack that rolled one, or any
 *  projectile ability that needs a weapon in hand. Pure spells keep their bolts. */
export function isBladeProjectile(ability) {
  const a = ability || {};
  if (a.boltOnConnect) return true;
  const proj = a.template === 'projectileBall' || a.template === 'volley';
  return !!(proj && a.requiresWeapon && a.requiresWeapon !== 'unarmed');
}
