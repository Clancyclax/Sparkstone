// ============================================================================
// ROUND 393 -- WHAT THE WIND MOVES, AND HOW.
//
//   "Heavy wind needs to blow the trees flags, banners, not just the grass."
//
// Round 360 gave the weather a wind field (weatherMixin.js `_tickWind` / `_gustAt` / `_windLean`) and bent two things
// in it: the grass (grassMixin.js) and the forest trees, which it ROTATED about their feet. A rigid rotation of a
// whole tree by the 1-3 degrees a steady heavy wind gave it reads as nothing at all on a pixel tree, and nothing
// else stood in the wind: not the city's flags and banners, not the laundry, not a planter's tree, not a bush.
//
// This table is the data half of round 393's answer (windSwayMixin.js is the scene half):
//
//   * PLANTS BEND. A tree, a bush, a reed bed is drawn while the wind is up as a Phaser Rope over the same frame: a
//     strip of quads down the sprite's middle whose spine is pushed sideways more the higher up it is, so the roots
//     stay where they are and the crown goes over. `give` is how far it goes (a tree 1), `rigid` the row of the
//     frame (px from its top) below which nothing moves -- a planter's box, a topiary's pot.
//   * CLOTH RIPPLES. A flag, a banner, a pennant, a line of laundry or bunting, a hanging sign: the cloth's own
//     rectangle of the frame (`rect`: x, y, w, h in frame px, measured off the sheets) is lifted out into its own
//     texture and drawn as a Rope with a wave running along it; the frame it was cut from is drawn without it
//     (and with the pole repainted where it ran behind the cloth: `pole` = [x0, x1, the row to copy it from]).
//       flag   pinned down its left edge to a pole, flying to the right: a wave runs out along it.
//       hang   pinned along its top (a banner on a crossbar, a pennant on an arm): it streams out to leeward,
//              the harder the gust the higher, with a ripple running down it.
//       line   pinned at both ends (laundry, bunting, a drape): it bellies and bounces between its posts.
//       swing  rigid, hung from its top (a sign board): it swings.
//
// The wind blows to the screen's right, the way round 360's gusts travel and the rain leans, so everything streams
// that way. Calm puts every sprite back exactly as it was drawn.
// ============================================================================

/** The cloth in each prop sheet, by frame. Sheets: `cityPropsR381` (city_props_r381.png, cityProps.js) and
 *  `cityLife` (citylife/citylife.png, cityLifeArt.js), both 80px cells. */
export const WIND_CLOTH = {
  cityPropsR381: {
    12: { kind: 'flag', rect: [39, 11, 18, 27], name: 'flagpoleCity' },
    13: { kind: 'hang', rect: [34, 10, 12, 32], name: 'flagpoleRed' },
    14: { kind: 'hang', rect: [30, 12, 21, 50], pole: [39, 41, 66], name: 'bannerPoleBlue' },
    15: { kind: 'hang', rect: [33, 16, 19, 48], name: 'bannerPoleGreen' },
    16: { kind: 'hang', rect: [28, 33, 24, 42], name: 'bannerWall' },
    17: { kind: 'line', rect: [16, 39, 46, 26], name: 'buntingPosts' },
    18: { kind: 'hang', rect: [26, 17, 29, 48], pole: [37, 43, 70], name: 'guildStandard' },
    19: { kind: 'line', rect: [25, 38, 30, 18], name: 'festivalArch' },
    23: { kind: 'swing', rect: [27, 43, 18, 23], name: 'shopSign' },
    40: { kind: 'line', rect: [17, 48, 46, 18], name: 'clothesline' },
  },
  cityLife: {
    11: { kind: 'line', rect: [13, 14, 55, 39], name: 'laundryX' },
    12: { kind: 'line', rect: [13, 14, 55, 35], name: 'laundryY' },
    37: { kind: 'line', rect: [17, 33, 47, 14], name: 'drape' },
  },
};
// The nine shop signs (sign_tankard .. sign_cart) share one frame layout, and so do the twelve household and temple
// banners (banner_ashford .. banner_war): measured once, laid on every frame.
for (let f = 16; f <= 24; f++) WIND_CLOTH.cityLife[f] = { kind: 'swing', rect: [33, 29, 22, 18], name: `sign${f}` };
for (let f = 25; f <= 36; f++) WIND_CLOTH.cityLife[f] = { kind: 'hang', rect: [30, 17, 21, 34], pole: [38, 42, 52], name: `banner${f}` };

/** Plants on the prop sheets that bend: frame -> { give, rigid }. */
export const WIND_PROP_PLANTS = {
  cityPropsR381: {
    10: { give: 0.85, rigid: 54, name: 'treePlanter' },
    9: { give: 0.35, rigid: 57, name: 'topiaryPot' },
    46: { give: 1.7, name: 'reedCluster' },
  },
};

/** Elehyd's flora (flora_desert.png): the soft ones bend -- brush, flowering shrubs, dry grass. A cactus does not. */
export const WIND_FLORA_SOFT = { 3: 0.35, 4: 1.0, 19: 0.8, 21: 1.0, 27: 1.15, 28: 0.9, 41: 1.0, 43: 0.55, 49: 1.25 };

/** A forest tree's `give`, and the slowest period it rocks with (seconds). */
export const WIND_TREE = { give: 1.0, period: 2.9 };
/** The most ropes drawn at once; past it the rest of the trees fall back to round 360's rotation. */
export const WIND_ROPE_CAP = 320;
/** How far outside the camera a thing still counts as "near" (world px). */
export const WIND_VIEW_MARGIN = 160;

/** The weather art (round 391's drop, particles/ and props/butterfly.png), copied to public/assets/weather/. */
export const WEATHER_ART = {
  rain: { key: 'wxa_rain', file: './public/assets/weather/weather_rain.png' },
  snow: { key: 'wxa_snow', file: './public/assets/weather/weather_snow.png' },
  ash: { key: 'wxa_ash', file: './public/assets/weather/weather_ash.png' },
  ember: { key: 'wxa_ember', file: './public/assets/weather/weather_ember.png' },
  leaf: { key: 'wxa_leaves', file: './public/assets/weather/weather_leaves.png', frame: 16, rows: 4, cols: 4 },
  butterfly: { key: 'wxa_butterfly', file: './public/assets/weather/butterfly.png', frame: 32, frames: 8 },
};

/** The lean a bent plant's spine has at height fraction `u` (0 at the rigid line, 1 at the top): most at the crown. */
export function bendProfile(u) {
  const c = Math.max(0, Math.min(1, u));
  return Math.pow(c, 1.7);
}

/** Self-check for the test: every rect inside its 80px cell, every kind known, every pole column inside its rect. */
export function validateWindSway() {
  const out = [];
  const kinds = new Set(['flag', 'hang', 'line', 'swing']);
  for (const [sheet, frames] of Object.entries(WIND_CLOTH)) {
    for (const [f, s] of Object.entries(frames)) {
      if (!kinds.has(s.kind)) out.push(`${sheet}:${f} unknown kind ${s.kind}`);
      const [x, y, w, h] = s.rect;
      if (!(x >= 0 && y >= 0 && w > 2 && h > 2 && x + w <= 80 && y + h <= 80)) out.push(`${sheet}:${f} rect outside the cell`);
      if (s.pole) {
        const [p0, p1, row] = s.pole;
        if (!(p0 >= x && p1 < x + w && p0 <= p1)) out.push(`${sheet}:${f} pole outside the cloth`);
        if (!(row >= y + h && row < 80)) out.push(`${sheet}:${f} pole sample row not below the cloth`);
      }
    }
  }
  return out;
}
