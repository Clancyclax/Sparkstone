// ROUND 38 -- the bespoke spell-animation system, revived.
//
// The original prototype picked a spell's visual from the TEXT of the
// ability itself, and its effect atlases (CRACKS / EXPLOSION / RAIN, eleven
// colour variants each) have been sitting unused in assets_raw since the
// port began. This brings both back: the sheets ship again under
// public/assets/fx/, and pickSpellFx() reads an ability's own name and
// description to choose what its cast looks like -- so "Shatterstrike of
// Ember" ruptures the ground while "Ember Detonation" explodes, even though
// both are attacks, and each in the colour nearest the ability's own.
//
// Because every generated name is built from the stone's theme words, the
// text IS the theme: this one lookup is what makes ten thousand generated
// abilities cast differently without a single hand-authored assignment.

export const FX_FAMILIES = {
  cracks: { cell: 64, cols: 6, frames: 17, frameMs: 55 },
  explosion: { cell: 32, cols: 5, frames: 15, frameMs: 50 },
  rain: { cell: 64, cols: 9, frames: 9, frameMs: 80 },
};

export const FX_COLORS = {
  black: 0x22242a, bloodred: 0xb71c1c, blue: 0x2f6fd0, brown: 0x8d6e63,
  gold: 0xd4af37, green: 0x43a047, grey: 0x9e9e9e, orange: 0xef6c00,
  silver: 0xcfd8dc, white: 0xf5f5f5, yellow: 0xfdd835,
};

// ROUND 48 -- a second, SMALLER palette, for FX families cut in the game's
// six damage CHANNELS instead of the eleven generic colour names (see
// ELEMENT_TYPES in stats.js; the descending bolt is the first such family).
// These are not guesses off a hue wheel: each is the MEASURED mean lit
// colour of that element's actual sheet, printed by extract_round48_bolt.py,
// so "the colour nearest this ability's own" is answered against what the
// art really looks like on screen.
export const FX_ELEMENT_COLORS = {
  fire: 0xff8347, frost: 0x72ffd3, lightning: 0xfefa9d,
  nature: 0x97f963, shadow: 0x9e4e8c, radiant: 0xffe79d,
};

import { FX2_FAMILIES } from './spellFx2.js';
// ROUND 60 -- the measured 1,050-effect library and where its frames live.
import { FX_POOLS, pickFxEffectSized, fxInfo } from './fxLibrary.js';
import { fxAtlasFor } from './fxAtlas.js';

// What the words claim. Order matters: the FIRST matching family wins, so
// the most specific vocabulary sits first. ROUND 39 -- the commissioned
// families join the vocabulary: heals bloom, storms strike, curses sigil,
// voids swallow, portals ring in gold.
const FAMILY_TOKENS = [
  // ROUND 48 -- the commissioned bolt. It sits ABOVE the round-39 lightning
  // sheet because the two say different things: round 39's 32px crackle is
  // ambient electricity (a shock, a spark, a static field), while this one
  // "Strikes down from above the enemy" -- so it claims only the vocabulary
  // that names a DESCENT out of the sky, and everything else still crackles.
  // ROUND 48 -- `\bbolt\b` was too greedy. It claimed any ability with "bolt"
  // in its name, including leech and venom projectiles that have their own
  // families and their own impact art, turning a siphon spell into a bolt
  // falling out of the sky. This art is specifically a strike from ABOVE, so
  // the token only claims vocabulary that actually means descent.
  ['boltstrike', /thunderbolt|lightning strike|lightning bolt|thunderclap|smite|skyfall|from (?:the |on )?high|call(?:s|ed)? down|heaven|judgement|judgment/i],
  ['lightning', /lightning|thunder|storm|shock|volt|spark/i],
  // \brain: "Soul Drain" must reach the leech below, not the weather.
  ['rain', /\brain|hail|deluge|monsoon|downpour|torrent|volley/i],
  // ROUND 40 -- the second commissioned drop joins the vocabulary. The
  // chain answers exactly the essences the user named for it ("vine, chain,
  // and whip essence abilities, perhaps a frogs tongue"); (?<!back)lash
  // keeps a Backlash curse from reading as a whip.
  ['chainext', /chain|vine|whip|(?<!back)lash|tether|tendril|grapple|tongue|hook/i],
  ['leechspiral', /leech|siphon|drain|\bsap\b|lifesteal|life.?steal|exsanguin|devour/i],
  ['thornshield', /thorn|briar|bramble|barb/i],
  ['bubble', /bubble|barrier|aegis|cocoon|\bward\b/i],
  ['bloom', /heal|mend|restor|renew|balm|rebirth|regenerat|recovery|grace|blessing|vigor|second wind/i],
  ['voidburst', /void|shadow|umbra|dusk|eclipse|abyss|stasis|frozen|standstill|time lock/i],
  ['sigil', /hex|curse|malediction|enfeebl|wither|decay|erosion|unravel|corrod|blight|miasma|contagion/i],
  // Generic wave words sit BELOW the specific vocabularies above, so a
  // "Mending Ripple" still blooms and only unclaimed pulses ring outward.
  ['pulse', /pulse|ripple|resonan|reverber|echo/i],
  ['goldring', /portal|gateway|doorway|homestep|recall|sanctum/i],
  ['summonring', /summon|conjure|bonded|relic of/i],
  ['cracks', /sunder|shatter|rend|breach|quake|crack|rupture|split|fissure|cleave|break/i],
  ['explosion', /explo|detonat|blast|burst|nova|eruption|bomb|shockwave|cataclysm/i],
];

// Templates that always deserve SOME visual even when the text names none.
const TEMPLATE_DEFAULT = {
  aoeRing: 'explosion',
  weakenRing: 'sigil',
  sunderStrike: 'cracks',
  stackStrike: 'explosion',
  rangeStrike: 'cracks',
  aoeHealPulse: 'bloom',
  selfHeal: 'bloom',
  selfHot: 'bloom',
  timeFreeze: 'voidburst',
  // ROUND 39 -- every buff cast reads as a rune circle flaring underfoot.
  selfPower: 'runecircle',
  selfCritBuff: 'runecircle',
  armorBuff: 'runecircle',
  immunityBuff: 'runecircle',
  imbueStrike: 'runecircle',
  // ROUND 40 -- the commissioned art takes over three defaults: retaliation
  // wears its spiked disc, the absorb ward blows its rainbow bubble, and
  // movement leaves the streak (the runtime stretches it along the path).
  thornsBuff: 'thornshield',
  absorbShield: 'bubble',
  townPortal: 'goldring',
  dash: 'dashstreak',
  teleport: 'dashstreak',
  movementHaste: 'puff',
};

/** Nearest entry in a {name: 0xRRGGBB} palette, by squared RGB distance. */
function _nearestIn(palette, hex, fallback) {
  let color = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : (hex || 0xffffff);
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  let best = fallback, bestD = Infinity;
  for (const [name, c] of Object.entries(palette)) {
    const dr = r - ((c >> 16) & 255), dg = g - ((c >> 8) & 255), db = b - (c & 255);
    const d = dr * dr + dg * dg + db * db;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

export function nearestFxColor(hex) { return _nearestIn(FX_COLORS, hex, 'white'); }

/** ROUND 48 -- the same question against the six damage channels, for the
 *  families cut elementally rather than by colour name. Note this answers
 *  from the ability's LOOK, not from its damage type: an ability that has no
 *  element at all still has a colour, and the bolt it calls down should
 *  match it. */
export function nearestFxElement(hex) { return _nearestIn(FX_ELEMENT_COLORS, hex, 'lightning'); }

/** Grid/timing for a family, from either bank. */
export function fxFamilyInfo(family) {
  if (FX_FAMILIES[family]) return FX_FAMILIES[family];
  const f2 = FX2_FAMILIES[family];
  // ROUND 40 -- cellH: the drop introduced non-square cells (the 32x128
  // glow/streak wisps, the 64x245/256 leech columns).
  // ROUND 48 -- channel: 'element' marks a family whose variants are the six
  // damage channels, so callers resolve them through nearestFxElement.
  if (f2) return { cell: f2.cell, cellH: f2.cellH || f2.cell, cols: f2.frames, frames: f2.frames, frameMs: f2.frameMs, loop: f2.loop, colors: f2.colors, native: f2.native, ...(f2.channel ? { channel: f2.channel } : {}) };
  return null;
}

/** ROUND 48 -- one spec, built directly rather than through pickSpellFx's
 *  text match, for the callers that KNOW they want the descending bolt (the
 *  aura tick in WorldScene). Colour resolves against the elemental palette;
 *  anything unrecognised falls back to the family's native pale yellow. */
export function boltStrikeFx(colorHex) {
  const info = fxFamilyInfo('boltstrike');
  if (!info) return null;
  let color = nearestFxElement(colorHex);
  if (info.colors && !info.colors.includes(color)) color = info.native;
  return { family: 'boltstrike', color, key: `fx_boltstrike_${color}`, ...info };
}

/**
 * ROUND 60 -- which of the 1,050 library effects this ability casts.
 *
 * The family vocabulary above is untouched: it still reads the ability's own
 * text and answers "ward", "hex", "whip". What changes is that the answer now
 * names a POOL rather than one sheet, and the pick is seeded off the ability's
 * own identity, so a given ability always casts the same way while two wards in
 * one kit look different.
 *
 * The fallback matters as much as the pick. Measured over 36,000 generated
 * abilities, 23.7% matched no token and no template default, so pickSpellFx
 * returned null and NOTHING PLAYED -- almost a quarter of every kit cast in
 * silence. `impact` is the honest home for those: a mass that flares where the
 * blow landed. It is a real family with 239 measured effects behind it, not a
 * placeholder.
 */
export function pickLibraryFx(ability) {
  const text = `${ability.name || ''} ${ability.desc || ''}`;
  let family = null;
  for (const [fam, re] of FAMILY_TOKENS) {
    if (re.test(text)) { family = fam; break; }
  }
  if (!family) family = TEMPLATE_DEFAULT[ability.template] || null;
  // Whether the ability's own words or template chose this, or whether it fell
  // through to the catch-all -- see `generic` on the return.
  const matched = !!family;
  if (!family) family = 'impact';
  if (!FX_POOLS[family]) family = 'impact';
  // Size the effect to the ability: the pool is filtered by measured radius, so
  // an ultimate gets a big shape and a jab a small one.
  const size = ability.fxSize
    || (ability.radius >= 90 || ability.aoe ? 'large'
      : (ability.base || ability.mag || 0) >= 24 ? 'mid' : 'small');
  const seed = `${ability.name || ''}|${ability.catKey || ability.template || ''}`;
  const id = pickFxEffectSized(family, seed, size);
  const at = id == null ? null : fxAtlasFor(id);
  if (!at) return null;
  return {
    family, id, lib: true,
    // ROUND 64 -- `generic` says this pick came from the LIBRARY rather than
    // from the ability's own words. Round 40 gives a leeching projectile the
    // two-part siphon at impact, but only "if nothing else claimed it" -- and
    // round 60 made this function answer everything, so nothing was ever
    // unclaimed again and that override became dead code. Caught by round 40's
    // own suite, which had been failing since. A caller that wants to override
    // a fallback can now tell a fallback from a real match.
    generic: !matched,
    key: at.key, start: at.start, end: at.end, frames: at.frames,
    color: ability.color || null,
    element: ability.element || nearestFxElement(ability.color),
    ...(fxInfo(id) || {}),
  };
}

/** The fx spec for one ability: { family, color, key, ...grid } or null. */
export function pickSpellFx(ability) {
  const text = `${ability.name || ''} ${ability.desc || ''}`;
  let family = null;
  for (const [fam, re] of FAMILY_TOKENS) {
    if (re.test(text)) { family = fam; break; }
  }
  if (!family) family = TEMPLATE_DEFAULT[ability.template] || null;
  // ROUND 60 -- an ability that names no family used to end here with no
  // visual at all. The library answers every one of them now.
  if (!family) return pickLibraryFx(ability);
  const info = fxFamilyInfo(family);
  if (!info) return pickLibraryFx(ability);
  // ROUND 39 -- a family may exist in limited colours (the ceremonial gold
  // rings); fall back to its native colour when the ability's own is not cut.
  // ROUND 48 -- an elementally-cut family asks the elemental palette instead;
  // running it through nearestFxColor would return "yellow", find no such
  // sheet, and quietly send every bolt out native.
  let color = info.channel === 'element' ? nearestFxElement(ability.color) : nearestFxColor(ability.color);
  if (info.colors && !info.colors.includes(color)) color = info.native;
  return { family, color, key: `fx_${family}_${color}`, ...info };
}

/** In-flight art for a projectile of this colour: fiery hues ride a comet,
 *  the rest ride a bolt. baseAngle is which way the ART points, so the
 *  runtime can rotate it onto the aim. ROUND 40 -- an ability whose own
 *  words say comet/meteor overrides the colour rule and rides the dash
 *  streak instead ("probably also functional as a comet animation if it
 *  moves across the screen"), bursting on impact. The streak's bright head
 *  sits at the BOTTOM of the art, so its baseAngle is screen-down. */
export function pickFlightFx(colorHex, text) {
  const color = nearestFxColor(colorHex);
  if (text && /comet|meteor|falling star|starfall|shooting star/i.test(text)) {
    const info = fxFamilyInfo('dashstreak');
    return {
      family: 'dashstreak', color, key: `fx_dashstreak_${color}`, ...info,
      baseAngle: Math.PI / 2,
      impact: { family: 'fireburst', color, key: `fx_fireburst_${color}`, ...fxFamilyInfo('fireburst') },
    };
  }
  const fiery = ['orange', 'bloodred', 'gold', 'yellow', 'brown'].includes(color);
  const family = fiery ? 'fireflight' : 'boltfly';
  const info = fxFamilyInfo(family);
  return {
    family, color, key: `fx_${family}_${color}`, ...info,
    baseAngle: fiery ? Math.PI : (3 * Math.PI) / 4,
    impact: fiery ? { family: 'fireburst', color, key: `fx_fireburst_${color}`, ...fxFamilyInfo('fireburst') } : null,
  };
}

/** Every sheet key/url pair, for the loader -- both banks. */
export function allFxSheets() {
  const out = [];
  for (const family of Object.keys(FX_FAMILIES)) {
    for (const color of Object.keys(FX_COLORS)) {
      out.push({
        key: `fx_${family}_${color}`,
        url: `./public/assets/fx/${family}_${color}.png`,
        cell: FX_FAMILIES[family].cell,
      });
    }
  }
  for (const [family, f2] of Object.entries(FX2_FAMILIES)) {
    for (const color of f2.colors) {
      out.push({ key: `fx_${family}_${color}`, url: `./public/assets/fx2/${family}_${color}.png`, cell: f2.cell, cellH: f2.cellH || f2.cell });
    }
  }
  return out;
}
