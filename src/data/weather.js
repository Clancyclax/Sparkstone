// ===========================================================================
// ROUND 357 -- WEATHER.
//
// The user, item 3: "Add weather into the game." Ten kinds, in his order:
//
//   3.1 Heavy Winds   3.2 Rain   3.3 Heavy Wind and Rain   3.4 Thunderstorm   3.5 Snow
//   3.6 Heavy wind and snow   3.7 Sunny   3.8 Ashfall   3.9 Heavy wind and ashfall   3.10 Volcanic Erruption
//
// THIS FILE is the data and the arithmetic: what each kind looks like (what falls, how thick, how hard the wind leans
// it, how grey the sky goes), what it does (small, legible effects -- nobody wants a weather system that is a tax),
// which regions get which (a CLIMATE per region, so the Cinderwaste ashes and Elehyd snows and the Nek mostly does
// not), and the schedule: a region's weather is a seeded function of the region and the in-game "weather slot" (a few
// in-game hours long), so it is the same on every load and every player in the same slot sees the same sky.
// The scene's half (particles, lightning, the eruption's falling rock, the sounds, the HUD chip) is weatherMixin.js.
//
// No weather indoors, in a ritual room, the soul space or an astral realm: the scene only asks while outside.
// ===========================================================================

/** The ten kinds. `fall` is what comes down (null for none); `count` how many particles at full strength; `wind` how
 *  hard they lean (0 straight down, 1 nearly sideways) and how fast loose things stream; `sky` the overcast tint over the
 *  whole view; `effects` the gameplay numbers (all multipliers; 1 = no change): `move` the player's walking speed,
 *  `fire`/`frost`/`lightning` the damage the player's attacks of that element deal, `ranged` how far the player's shots
 *  and bolts fly, `sight` how far monsters see (their aggro range); `lightning` strikes per minute; `debris` falling
 *  volcanic rock per minute. */
export const WEATHER = {
  sunny: {
    id: 'sunny', name: 'Sunny', icon: '☀', fall: null, count: 0, wind: 0.05,
    sky: { color: 0xfff2c8, alpha: 0.05 },
    effects: { move: 1, fire: 1.05, frost: 0.95, lightning: 1, ranged: 1, sight: 1.05 },
    blurb: 'Clear skies. Fire burns a little hotter, frost a little weaker, and monsters spot you from a little further off.',
  },
  heavyWind: {
    id: 'heavyWind', name: 'Heavy Winds', icon: '\u{1F32C}', fall: 'leaf', count: 70, wind: 0.85,
    sky: { color: 0xc9d2d6, alpha: 0.06 },
    effects: { move: 0.95, fire: 1, frost: 1, lightning: 1, ranged: 0.85, sight: 1 },
    blurb: 'A hard wind. Arrows and thrown things lose a little reach; walking into it is slower.',
  },
  rain: {
    id: 'rain', name: 'Rain', icon: '\u{1F327}', fall: 'rain', count: 260, wind: 0.15,
    sky: { color: 0x5a6a80, alpha: 0.16 },
    effects: { move: 1, fire: 0.85, frost: 1, lightning: 1.1, ranged: 1, sight: 0.9 },
    blurb: 'Steady rain. Fire is dampened, lightning finds its mark, and monsters notice you later.',
  },
  windRain: {
    id: 'windRain', name: 'Heavy Wind and Rain', icon: '\u{1F327}', fall: 'rain', count: 360, wind: 0.6,
    sky: { color: 0x4d5a6d, alpha: 0.22 },
    effects: { move: 0.93, fire: 0.8, frost: 1, lightning: 1.1, ranged: 0.85, sight: 0.85 },
    blurb: 'Driving rain on a hard wind: fire suffers, arrows drift, and every step is a lean.',
  },
  thunderstorm: {
    id: 'thunderstorm', name: 'Thunderstorm', icon: '⛈', fall: 'rain', count: 420, wind: 0.45,
    sky: { color: 0x2f3747, alpha: 0.30 },
    effects: { move: 0.95, fire: 0.8, frost: 1, lightning: 1.25, ranged: 0.9, sight: 0.8 },
    lightning: 5,
    blurb: 'A storm overhead. Lightning abilities strike far harder, and the sky itself sometimes strikes the ground.',
  },
  snow: {
    id: 'snow', name: 'Snow', icon: '❄', fall: 'snow', count: 220, wind: 0.1,
    sky: { color: 0xdfe8f2, alpha: 0.14 },
    effects: { move: 0.92, fire: 0.95, frost: 1.15, lightning: 1, ranged: 1, sight: 0.95 },
    blurb: 'Snow. Frost bites harder and the going is slower.',
  },
  windSnow: {
    id: 'windSnow', name: 'Heavy Wind and Snow', icon: '\u{1F328}', fall: 'snow', count: 380, wind: 0.75,
    sky: { color: 0xd2dce8, alpha: 0.26 },
    effects: { move: 0.85, fire: 0.9, frost: 1.25, lightning: 1, ranged: 0.85, sight: 0.75 },
    blurb: 'A blizzard. Frost is at its strongest, walking is hard, and nothing sees far -- monsters notice you much later.',
  },
  ashfall: {
    id: 'ashfall', name: 'Ashfall', icon: '\u{1F30B}', fall: 'ash', count: 200, wind: 0.12,
    sky: { color: 0x6b5f57, alpha: 0.20 },
    effects: { move: 1, fire: 1.15, frost: 0.9, lightning: 1, ranged: 1, sight: 0.85 },
    blurb: 'Grey ash drifting down. Fire burns hotter in the dry choke; frost is weaker; monsters notice you later.',
  },
  windAshfall: {
    id: 'windAshfall', name: 'Heavy Wind and Ashfall', icon: '\u{1F30B}', fall: 'ash', count: 340, wind: 0.7,
    sky: { color: 0x5a4d45, alpha: 0.28 },
    effects: { move: 0.93, fire: 1.2, frost: 0.85, lightning: 1, ranged: 0.85, sight: 0.75 },
    blurb: 'Ash on a hard wind: fire burns hotter, arrows drift, and monsters notice you later.',
  },
  eruption: {
    id: 'eruption', name: 'Volcanic Eruption', icon: '\u{1F30B}', fall: 'ember', count: 300, wind: 0.3,
    sky: { color: 0x7a2a12, alpha: 0.30 },
    effects: { move: 1, fire: 1.3, frost: 0.8, lightning: 1, ranged: 1, sight: 0.8 },
    debris: 14,
    blurb: 'The mountain is erupting. Burning rock falls where the ground glows -- get out from under it. Fire is at its fiercest.',
  },
  // ROUND 360 (3.1) -- "add a sandstorm effect for the deserts with sand and wind."
  sandstorm: {
    id: 'sandstorm', name: 'Sandstorm', icon: '\u{1F32A}', fall: 'sand', count: 420, wind: 0.95,
    sky: { color: 0xc8a066, alpha: 0.4 }, dust: 0.85,
    effects: { move: 0.88, fire: 1, frost: 0.95, lightning: 1, ranged: 0.8, sight: 0.72 },
    blurb: 'A wall of blown sand. Walking into it is slow, shots drift wide, and nothing -- you or the monsters -- sees far.',
  },
};
export const WEATHER_IDS = Object.keys(WEATHER);

/**
 * Which weather each region gets, as weights. The Nek and Ontaria are temperate (mostly clear, rain, the odd storm);
 * Elehyd is the cold mountains (snow and blizzards); Bratugal is the wet lowland (rain, storms); Sirukh is the sands
 * (clear and wind -- no rain to speak of); the Cinderwaste is the volcano (ash, and now and then the eruption itself);
 * Ixcuatl is the jungle (rain and storms). Every one of the ten kinds is reachable somewhere.
 */
// ROUND 360 (3) -- "the relevant weather should be tied to the region. With snow and ash in mountains and volcanic
// mountains respectively." Snow falls only in Elehyd's mountains now (the Nek and Ontaria lost their odd snowy slot, and
// Elehyd its rain), ash only over the Cinderwaste's volcano, and Sirukh's deserts get the sandstorm.
export const CLIMATE = {
  nek:      { sunny: 50, heavyWind: 11, rain: 20, windRain: 10, thunderstorm: 9 },
  ontaria:  { sunny: 46, heavyWind: 11, rain: 22, windRain: 11, thunderstorm: 10 },
  elehyd:   { sunny: 26, heavyWind: 12, snow: 38, windSnow: 24 },
  bratugal: { sunny: 22, heavyWind: 6, rain: 34, windRain: 16, thunderstorm: 22 },
  sirukh:   { sunny: 52, heavyWind: 26, sandstorm: 22 },
  cinder:   { sunny: 14, heavyWind: 10, ashfall: 40, windAshfall: 24, eruption: 12 },
  ixcuatl:  { sunny: 26, heavyWind: 4, rain: 36, windRain: 10, thunderstorm: 24 },
};

/** How long one weather lasts, in in-game hours, and how long it takes to blow in or clear (real seconds). */
export const WEATHER_SLOT_HOURS = 6;
export const WEATHER_FADE_S = 12;

/** A small deterministic hash, so a region's weather in a slot is the same on every load. */
function hash32(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

/** ROUND 369 -- "Weather should last roughly 10-20 minute of real world time before switching." A spell of weather now
 *  lasts 10 to 20 real minutes (the game's day is 10). The clock is cut into half-hour epochs, each split in two at a
 *  seeded point between its 10th and 20th minute, so both spells in it are 10-20 minutes long, the same on every load,
 *  and finding the spell for a moment is arithmetic rather than a walk from the start of time. `clockT` is the game
 *  clock in real seconds (WorldScene `_clockT`). Returns the spell's index, which is what `weatherFor` takes as `slot`. */
export const WEATHER_SPELL_MIN_S = 600, WEATHER_SPELL_MAX_S = 1200;
const WEATHER_EPOCH_S = WEATHER_SPELL_MIN_S + WEATHER_SPELL_MAX_S;
export function weatherSpellAt(clockT) {
  const t = Math.max(0, clockT || 0);
  const epoch = Math.floor(t / WEATHER_EPOCH_S);
  const split = WEATHER_SPELL_MIN_S + (hash32(`wx-epoch|${epoch}`) % (WEATHER_SPELL_MAX_S - WEATHER_SPELL_MIN_S + 1));
  const into = t - epoch * WEATHER_EPOCH_S;
  const first = into < split;
  return { slot: epoch * 2 + (first ? 0 : 1),
    start: epoch * WEATHER_EPOCH_S + (first ? 0 : split), end: epoch * WEATHER_EPOCH_S + (first ? split : WEATHER_EPOCH_S) };
}
export function weatherSlotAt(clockT) { return weatherSpellAt(clockT).slot; }
/** The schedule's version, stamped on a called weather so an override saved under the old six-hour slots is not read
 *  in spells (its `untilSlot` would be six times too far off). */
export const WEATHER_SLOT_VERSION = 369;

/** The weather slot an in-game moment falls in: the day number and the hour. (Before round 369; kept for old callers.) */
export function weatherSlot(day, hour) {
  return Math.max(0, Math.floor(day || 0)) * Math.ceil(24 / WEATHER_SLOT_HOURS)
    + Math.floor(((hour || 0) % 24) / WEATHER_SLOT_HOURS);
}

/** The weather a region has in a slot (seeded; the climate's weights). `override` (a weather-magic ritual's choice,
 *  {id, until}) wins while it lasts. */
export function weatherFor(regionId, slot, override = null) {
  if (override && override.id && WEATHER[override.id] && (override.untilSlot === undefined || slot <= override.untilSlot)) return override.id;
  const table = CLIMATE[regionId] || CLIMATE.nek;
  const entries = Object.entries(table);
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = (hash32(`${regionId}|${slot}`) % 100000) / 100000 * total;
  for (const [id, w] of entries) { r -= w; if (r < 0) return id; }
  return entries[entries.length - 1][0];
}

/** The effect multipliers for a weather at a strength 0..1 (it blows in and clears), with a weather-magic
 *  practitioner's reading of it folded in: `attune` (0..1) pulls every penalty toward 1 and adds that share of a bonus
 *  to whichever element the weather favours. */
export function weatherEffects(id, strength = 1, attune = 0) {
  const w = WEATHER[id] || WEATHER.sunny;
  const out = {};
  for (const [k, v] of Object.entries(w.effects)) {
    let m = 1 + (v - 1) * Math.max(0, Math.min(1, strength));
    if (attune > 0) {
      // For everything but `sight`, below 1 hurts the player; for `sight` (how far MONSTERS see) above 1 does.
      const hurts = k === 'sight' ? m > 1 : m < 1;
      if (hurts) m = m + (1 - m) * Math.min(1, attune);                // a penalty, softened toward 1
      else if (m !== 1) m = m + (m - 1) * Math.min(1, attune) * 0.5;    // a favour, sharpened
    }
    out[k] = Math.round(m * 1000) / 1000;
  }
  return out;
}

/** The element multiplier a weather gives an element, or 1. Elements outside the four the weather speaks to are 1. */
export function weatherElementMult(effects, element) {
  if (!effects || !element) return 1;
  const e = String(element).toLowerCase();
  if (e === 'fire' || e === 'flame' || e === 'magma' || e === 'heat') return effects.fire || 1;
  if (e === 'frost' || e === 'ice' || e === 'cold' || e === 'water') return effects.frost || 1;
  if (e === 'lightning' || e === 'storm' || e === 'thunder' || e === 'shock') return effects.lightning || 1;
  return 1;
}

/** Faults a suite can assert without booting. */
export function weatherFaults() {
  const out = [];
  const want = ['heavyWind', 'rain', 'windRain', 'thunderstorm', 'snow', 'windSnow', 'sunny', 'ashfall', 'windAshfall', 'eruption', 'sandstorm'];
  for (const id of want) if (!WEATHER[id]) out.push(`missing weather ${id}`);
  if (WEATHER_IDS.length !== 11) out.push(`there are ${WEATHER_IDS.length} weathers, not 11`);
  // ROUND 360 -- snow only in the mountains, ash only over the volcano, sand only in the desert
  for (const [r, t] of Object.entries(CLIMATE)) {
    if ((t.snow || t.windSnow) && r !== 'elehyd') out.push(`${r} snows`);
    if ((t.ashfall || t.windAshfall || t.eruption) && r !== 'cinder') out.push(`${r} has ash`);
    if (t.sandstorm && r !== 'sirukh') out.push(`${r} has sandstorms`);
  }
  const reachable = new Set();
  for (const [r, t] of Object.entries(CLIMATE)) {
    for (const [id, w] of Object.entries(t)) {
      if (!WEATHER[id]) out.push(`${r}: unknown weather ${id}`);
      if (!(w > 0)) out.push(`${r}: ${id} weight ${w}`);
      reachable.add(id);
    }
  }
  for (const id of want) if (!reachable.has(id)) out.push(`${id} is in no region's climate`);
  for (const w of Object.values(WEATHER)) {
    for (const v of Object.values(w.effects)) if (!(v >= 0.7 && v <= 1.35)) out.push(`${w.id}: effect ${v} out of the gentle band`);
    if (w.fall && !(w.count > 0)) out.push(`${w.id}: falls but has no count`);
  }
  return out;
}
