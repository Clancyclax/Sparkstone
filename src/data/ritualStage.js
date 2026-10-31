// ===========================================================================
// ROUND 358 -- THE RITUAL AS A MOMENT.
//
// The user, item 1: ritual music that starts with the rite and plays until you
// leave the ritual chamber (or begin another rite), matched to the rite by
// name; every non-combat rite a fixed thirty seconds; spell and lighting
// effects drawn from the rite's essence and stone that grow more intense as it
// runs ("fire = orange and red lighting that grows brighter, with flames
// sprouting from the center and around the room; darkness = darkness slowly
// consuming everything until only the player is visible; light = golden
// glowing beams all around"); a chant spoken slowly across the thirty
// seconds; and (1.2, 1.3) the rite drawing on mana, stamina and/or life as it
// runs -- never to zero -- with weapon and martial rites drawing mana too.
//
// This file is the pure half: which THEME a rite belongs to, its track, its
// palette, its chant lines and what it drains. ritualStageMixin.js draws it.
// ===========================================================================

/** Every non-combat rite (conjuring, binding, every reading rite, the martial
 *  Deepening Rite, the theory deepening) takes exactly this long. */
export const RITE_SECONDS = 30;
/** Begun outdoors (a combat rite marks open ground), the rite's music plays on
 *  this long after it ends -- there is no chamber to walk out of. */
export const RITE_MUSIC_TAIL_S = 60;
/** "Never to 0": a non-combat rite leaves at least this share of each pool. A
 *  combat rite keeps its round-310 price (over 90%), which leaves one point. */
export const RITE_FLOOR_FRAC = 0.05;

// ---------------------------------------------------------------------------
// THE THEMES -- one per track the user sent, named for the track.
// ---------------------------------------------------------------------------
// veil: a colour laid over the screen (normal blend); glow: a light added on
// top (additive); accent: the colour of the rite's own marks on the ground.
export const RITE_THEMES = {
  fire: {
    track: 'music_ritual_fire', file: 'music_ritual_fire.mp3', trackName: 'Fire Ritual',
    veil: [0x3a0800, 0.22], glow: [0xff5a1a, 0.34], accent: 0xffa040, text: '#ffb74d',
    chant: ['Ember, wake.', 'From the cinder to the coal, from the coal to the flame.', 'Burn away all that is not needed here.', 'Rise, fire, and fill this place.'],
    climax: 'Burn!',
  },
  dark: {
    track: 'music_ritual_dark', file: 'music_ritual_dark.mp3', trackName: 'Dark Ritual',
    veil: [0x05030a, 0.25], glow: [0x4a2a6a, 0.10], accent: 0x8e6bbf, text: '#b39ddb',
    chant: ['Close, eyes of the world.', 'Let the lamps forget their light.', 'The dark is patient; the dark is near.', 'Take everything but me.'],
    climax: 'Nothing remains but the one who called.',
  },
  light: {
    track: 'music_ritual_light', file: 'music_ritual_light.mp3', trackName: 'Ritual of the Light, the Pure',
    veil: [0x2a2208, 0.06], glow: [0xffe08a, 0.30], accent: 0xffe082, text: '#fff3c4',
    chant: ['Let there be no shadow in this circle.', 'Gold upon gold, light upon light.', 'Pure, and purer still.', 'Descend, radiance; stand all around me.'],
    climax: 'Shine!',
  },
  sun: {
    track: 'music_ritual_sun', file: 'music_ritual_sun.mp3', trackName: 'Ritual of the Rising Sun',
    veil: [0x2a1004, 0.14], glow: [0xffa24a, 0.28], accent: 0xffc46b, text: '#ffd180',
    chant: ['The night is ending.', 'Over the rim of the world, the first light climbs.', 'Rise, and the long shadows shorten.', 'Rise, and stand at the height of the sky.'],
    climax: 'Dawn!',
  },
  moon: {
    track: 'music_ritual_moon', file: 'music_ritual_moon.mp3', trackName: 'Ritual of Moon, Stars and Eclipse',
    veil: [0x040a24, 0.42], glow: [0x8fb0ff, 0.12], accent: 0xb8c8ff, text: '#c5cae9',
    chant: ['Night, open your hand.', 'Stars, come out one by one and watch.', 'Moon, pale lantern, fill.', 'And now the shadow crosses the face of the moon.'],
    climax: 'Eclipse.',
  },
  frost: {
    track: 'music_ritual_frost', file: 'music_ritual_frost.mp3', trackName: 'Frozen Ritual',
    veil: [0x0a1a2c, 0.20], glow: [0x9fdcff, 0.22], accent: 0xc8f0ff, text: '#e1f5fe',
    chant: ['Still, breath. Still, blood.', 'Let the cold come in from the edges.', 'Rime upon stone; ice upon rime.', 'Hold, and be held, and do not thaw.'],
    climax: 'Freeze!',
  },
  verdant: {
    track: 'music_ritual_verdant', file: 'music_ritual_verdant.mp3', trackName: 'Verdant Ritual of Life',
    veil: [0x06200a, 0.12], glow: [0x9be86a, 0.20], accent: 0x9ccc65, text: '#c5e1a5',
    chant: ['Seed, hear me.', 'Root into the stone; reach for what is above.', 'Leaf and vine and blossom, come.', 'Let everything in this circle live.'],
    climax: 'Bloom!',
  },
  blood: {
    track: 'music_ritual_blood', file: 'music_ritual_blood.mp3', trackName: 'Blood Ritual',
    veil: [0x2a0004, 0.30], glow: [0xc8102e, 0.18], accent: 0xe53950, text: '#ef9a9a',
    chant: ['By the beat of my heart.', 'What runs in me, I give to the circle.', 'Red to red, and the debt is paid.', 'Drink, and answer.'],
    climax: 'It is paid in blood!',
  },
  doom: {
    track: 'music_ritual_doom', file: 'music_ritual_doom.mp3', trackName: 'Ritual of Doom',
    veil: [0x12041a, 0.38], glow: [0x7a1fa2, 0.14], accent: 0xaa66ff, text: '#d1a3ff',
    chant: ['Hear the end of things.', 'Every road runs to this ground.', 'What is written cannot be unwritten.', 'Come, inevitable, and stand in my circle.'],
    climax: 'So it ends.',
  },
  martial: {
    track: 'music_ritual_martial', file: 'music_ritual_martial.mp3', trackName: 'Ritual of the Martial, Mighty, Weapon Arsenal',
    veil: [0x10131a, 0.16], glow: [0xd8dde8, 0.16], accent: 0xcfd8dc, text: '#eceff1',
    chant: ['Steady the breath. Set the feet.', 'Every blade I have carried, come to my hand.', 'Edge and haft and string, be one with me.', 'Strike true, and strike again.'],
    climax: 'Arsenal!',
  },
  clockwork: {
    track: 'music_ritual_clockwork', file: 'music_ritual_clockwork.mp3', trackName: 'Clockwork Sacrament',
    veil: [0x1a1206, 0.16], glow: [0xe0a84a, 0.18], accent: 0xd4a24c, text: '#ffe0a0',
    chant: ['Tooth to tooth, wheel to wheel.', 'Every part in its place, every turn in its time.', 'Wind the spring; let it run.', 'The works are true. The sacrament is kept.'],
    climax: 'It turns!',
  },
  mystic: {
    track: 'music_ritual_mystic', file: 'music_ritual_mystic.mp3', trackName: 'Mystic Magic Ritual',
    veil: [0x0a0820, 0.24], glow: [0x6ec6ff, 0.18], accent: 0x80deea, text: '#b2ebf2',
    chant: ['Words beneath the words, rise.', 'Sign upon sign, the circle writes itself.', 'What is hidden turns to face me.', 'Open, and be known.'],
    climax: 'It is understood.',
  },
  // ROUND 360 (2) -- three more tracks: lightning, storms, water
  lightning: {
    track: 'music_ritual_lightning', file: 'music_ritual_lightning.mp3', trackName: 'Ritual of Lightning and Thunder',
    veil: [0x060a1e, 0.30], glow: [0x9fc4ff, 0.20], accent: 0xb3d4ff, text: '#d6e6ff',
    chant: ['Hear it before you see it.', 'The air goes tight; the hair on the arm stands up.', 'Thunder, roll; lightning, choose.', 'Strike, and strike, and strike again.'],
    climax: 'Thunder!',
  },
  storm: {
    track: 'music_ritual_storm', file: 'music_ritual_storm.mp3', trackName: 'Ritual of Storms',
    veil: [0x10161e, 0.30], glow: [0x8fb3c8, 0.14], accent: 0xa7c7d8, text: '#cfe3ee',
    chant: ['Wind, wake from the far hills.', 'Turn about me; gather what is loose.', 'Rain on the wind, cloud on the rain.', 'Let the storm stand where I stand.'],
    climax: 'The storm is here!',
  },
  water: {
    track: 'music_ritual_water', file: 'music_ritual_water.mp3', trackName: 'Ritual of Water',
    veil: [0x041a2a, 0.22], glow: [0x4fc3f7, 0.20], accent: 0x80d8ff, text: '#b3e5fc',
    chant: ['From the spring, from the rain, from the deep.', 'Rise, and fill what is empty.', 'Wave upon wave, and the circle is a sea.', 'Hold me up, and carry what I ask.'],
    climax: 'The tide comes in.',
  },
  generic: {
    track: 'music_ritual_generic', file: 'music_ritual_generic.mp3', trackName: 'Ritual',
    veil: [0x0c0618, 0.20], glow: [0xce93d8, 0.18], accent: 0xce93d8, text: '#e1bee7',
    chant: ['Circle, close.', 'I speak, and the world leans in to listen.', 'Gather, gather, gather here.', 'Let it be done as it is spoken.'],
    climax: 'It is done.',
  },
};
export const RITE_THEME_KEYS = Object.keys(RITE_THEMES);

// ---------------------------------------------------------------------------
// WHICH THEME. The name decides first ("matched to the rite by name"): an essence
// or stone whose id says Fire is a fire rite, whatever its family. Then the
// family. The essence is asked before the stone because the essence is the
// rite's first word ("By rending talons, I mark this ground").
// ---------------------------------------------------------------------------
const NAME_THEME = [
  [/^(fire|ember|flame|pyre|wrath)$/i, 'fire'],
  [/^(shadow|dark|lurker|void|smoke|sin|malign|discord)$/i, 'dark'],
  [/^(death|apocalypse|ruin|reaper|undeath|blight|corrupt|bone|inevitability|feeble|divinedeath|omens?)$/i, 'doom'],
  [/^(blood|flesh|feast|hunger)$/i, 'blood'],
  [/^(light|pure|shimmer|divinepurity|divineheros|absolution|purgation)$/i, 'light'],
  [/^(sun|zeal|justice|judgement|dominion|divinedominion|champion)$/i, 'sun'],
  [/^(moon|stars?|celestial|dimension|vast|myriad|gathering|moment|reach|elastic)$/i, 'moon'],
  [/^(lightning|surge|thunder)$/i, 'lightning'],          // ROUND 360
  [/^(wind|cloud|sky|storm)$/i, 'storm'],                 // ROUND 360
  [/^(water|rain|deep|coral|whale|shark|octopus|tentacle|manatee)$/i, 'water'],   // ROUND 360
  [/^(cold|ice)$/i, 'frost'],
  [/^(life|plant|tree|wood|growth|fungus|crops|rebirth|renewal|healer|heal|divinehealing|brush)$/i, 'verdant'],
  [/^(technology|wheel|vehicle|ship|chain|trap|thread|net|hand|paper|cloth|hair)$/i, 'clockwork'],
  [/^(rune|magic|magus|knowledge|eye|echo|vision|focus|preparation|adept|divineknowledge)$/i, 'mystic'],
  [/^(war|divinewar|might|potent|resolute|defiance|persistence|armour|shield|iron)$/i, 'martial'],
];
const FAMILY_THEME = {
  fire: 'fire', dark: 'dark', death: 'doom', blood: 'blood', light: 'light', order: 'sun',
  space: 'moon', cold: 'frost', water: 'water', life: 'verdant', beast: 'verdant', smallbeast: 'verdant',
  serpent: 'verdant', aquatic: 'water', flyer: 'verdant', craft: 'clockwork', mind: 'mystic',
  storm: 'lightning', air: 'storm',   // ROUND 360
  blade: 'martial', bludgeon: 'martial', polearm: 'martial', ranged: 'martial', force: 'martial', guard: 'martial',
  // earth, motion, identity, alchemy: no track of their own, so the generic rite.
};
function bareId(id) { return String(id || '').replace(/^(ess|stone)/, ''); }
function byName(id) {
  const b = bareId(id);
  for (const [re, th] of NAME_THEME) if (re.test(b)) return th;
  return null;
}

/** The theme for an (essence, stone) rite. Pure. */
export function riteThemeFor({ essenceId, stoneId, essenceFamily, stoneFamily } = {}) {
  return byName(essenceId) || byName(stoneId)
    || FAMILY_THEME[essenceFamily] || FAMILY_THEME[stoneFamily] || 'generic';
}

/** The theory books' themes (Elemental is fire's track, Divine the light's ...). */
export const THEORY_THEME = {
  astral: 'moon', natural: 'verdant', elemental: 'fire', divine: 'light', portal: 'mystic',
  soul: 'doom', fauna: 'verdant', weather: 'storm', interference: 'clockwork',   // ROUND 360 -- weather is the storm's rite
};
/** The theme for a reading rite: weapon and martial books are the martial
 *  rite; a theory is its own; the Ritual Magic book is the generic rite; the
 *  other craft books are the clockwork one (the craft of making things). */
export function bookThemeFor(row) {
  if (!row) return 'generic';
  if (row.kind === 'weapon' || row.kind === 'martial') return 'martial';
  if (row.kind === 'theory') return THEORY_THEME[row.theory] || 'mystic';
  if (row.kind === 'craft' && row.craft === 'ritual') return 'generic';
  if (row.kind === 'craft') return 'clockwork';
  return 'generic';
}

// ---------------------------------------------------------------------------
// WHAT IT TAKES (1.2, 1.3). Shares of the pool's maximum, drawn evenly across
// the rite. Weapon and martial rites take stamina AND mana (1.3); blood rites
// take life; doom rites some life; everything takes mana.
// ---------------------------------------------------------------------------
const THEME_LIFE = { blood: 0.25, doom: 0.15 };
/**
 * @param {'combat'|'conjure'|'familiar'|'book'|'deepen'|'theory'} kind
 * @param {string} theme
 * @param {object} [o]  { costFrac, bookKind }
 * @returns {{mana:number, stamina:number, hp:number}}
 */
export function riteDrainFor(kind, theme, o = {}) {
  const life = THEME_LIFE[theme] || 0;
  const c = Number.isFinite(o.costFrac) ? o.costFrac : 0.5;
  switch (kind) {
    case 'combat': return { mana: c, stamina: c, hp: c };   // paid to the round-310 price as the rite runs
    case 'conjure': return { mana: c, stamina: c, hp: life };
    case 'familiar': return { mana: c, stamina: 0.2, hp: life };
    case 'deepen': return { mana: 0.3, stamina: 0.5, hp: life };
    case 'theory': return { mana: 0.6, stamina: 0.1, hp: life };
    case 'book': {
      if (o.bookKind === 'weapon' || o.bookKind === 'martial') return { mana: 0.25, stamina: 0.4, hp: life };
      if (o.bookKind === 'theory') return { mana: 0.5, stamina: 0.1, hp: life };
      return { mana: 0.3, stamina: 0.1, hp: life };
    }
    default: return { mana: 0.3, stamina: 0, hp: 0 };
  }
}

/** One step of the drain: take `frac * max * dk` from `cur`, never below the
 *  floor (and never raise a pool that is already under it). */
export function drainStep(cur, max, frac, dk, floor) {
  if (!(max > 0) || !(frac > 0) || !(dk > 0)) return cur;
  const want = cur - frac * max * dk;
  if (cur <= floor) return cur;
  return Math.max(floor, want);
}
export function riteFloor(max, combat) {
  return combat ? 1 : Math.max(1, Math.ceil(max * RITE_FLOOR_FRAC));
}

// ---------------------------------------------------------------------------
// THE CHANT -- spoken slowly through the rite, a line at a time.
// The rite's own two sentences (round 311) open and carry it; the theme's lines
// build; the climax is the last word, said as the rite lands.
// ---------------------------------------------------------------------------
export function riteChantLines(theme, own = [], opener = null) {
  const T = RITE_THEMES[theme] || RITE_THEMES.generic;
  const mine = (own || []).filter(Boolean);
  const lines = [];
  if (opener) lines.push(opener);
  if (mine[0]) lines.push(mine[0]);
  lines.push(T.chant[0], T.chant[1]);
  if (mine[1]) lines.push(mine[1]);
  lines.push(T.chant[2], T.chant[3]);
  return lines;
}

/** Which line is being spoken at progress k (0..1), and how far through it. */
export function chantAt(lines, k) {
  const n = lines.length;
  if (!n) return { i: -1, f: 0 };
  // The last tenth is the climax, so the lines share the first nine.
  const span = 0.9 / n;
  const kk = Math.max(0, Math.min(0.8999, k));
  const i = Math.min(n - 1, Math.floor(kk / span));
  return { i, f: (kk - i * span) / span };
}

/** The words of a line said so far: the line is spoken over the first 70% of
 *  its turn, a word at a time. */
export function wordsSaid(line, f) {
  const words = String(line || '').split(/\s+/).filter(Boolean);
  const n = Math.max(1, Math.ceil(words.length * Math.min(1, f / 0.7)));
  return words.slice(0, n).join(' ');
}

/** Intensity: slow at first, gathering at the end. */
export function riteIntensity(k) {
  const x = Math.max(0, Math.min(1, k));
  return 0.12 + 0.88 * Math.pow(x, 1.6);
}

export function ritualStageFaults() {
  const out = [];
  for (const [k, T] of Object.entries(RITE_THEMES)) {
    if (!/^music_ritual_[a-z]+$/.test(T.track) || T.file !== `${T.track}.mp3`) out.push(`${k}: track ${T.track}/${T.file}`);
    if (!Array.isArray(T.chant) || T.chant.length !== 4 || T.chant.some(s => !s)) out.push(`${k}: chant`);
    if (!T.climax) out.push(`${k}: no climax`);
    for (const f of ['veil', 'glow']) if (!Array.isArray(T[f]) || T[f][1] < 0 || T[f][1] > 0.6) out.push(`${k}: ${f}`);
  }
  for (const th of Object.values(FAMILY_THEME)) if (!RITE_THEMES[th]) out.push(`family theme ${th}`);
  for (const [, th] of NAME_THEME) if (!RITE_THEMES[th]) out.push(`name theme ${th}`);
  for (const th of Object.values(THEORY_THEME)) if (!RITE_THEMES[th]) out.push(`theory theme ${th}`);
  return out;
}
