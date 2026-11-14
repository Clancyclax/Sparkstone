// ============================================================================
// ROUND 373 -- CADENCE, LIVED IN.
//
//   "People and routine. Daily schedules: stalls open at dawn and pack up at dusk. The tavern fills at night, the
//    temples fill on their god's hours, and the streets empty in heavy rain as people run for doorways.
//    A lamplighter walking the streets at dusk lighting each lamp, and a town crier in the plaza reading out real
//    events... Townsfolk who know you...
//    Places: guard barracks with a training yard... a cemetery behind the temples... a stable and caravan yard...
//    a fish market... a bathhouse and a library... more enterable homes, each with someone living in it.
//    Events: a weekly market day... holy days for each of the eight gods... city reactions to the world...
//    Dressing: signs and banners... night details... sound by district... More houses and structures."
//   "No horses or draft animals" / "just using the existing low rank vehicles powered by magic."
//
// This file is the rules: the clock, the calendar, who is where and what they say. It imports nothing from the
// scene, so the suite reads it directly (tools/tests/test_round373.cjs). cityLifeMixin.js is what puts it in the world.
// ============================================================================
import { ADV_BY_ID, ADV_TEAM_BY_ID } from './adventurers.js';

export const GODS8 = ['death', 'dominion', 'healing', 'heros', 'knowledge', 'liberty', 'purity', 'war'];
export const GOD_NAME = {
  death: 'Death', dominion: 'Dominion', healing: 'Healing', heros: 'the Hero', knowledge: 'Knowledge',
  liberty: 'Liberty', purity: 'Purity', war: 'War',
};

// ---------------------------------------------------------------------------------------------------- the clock
// The world's darkness ramps 21:30-22:30 and lifts 04:30-05:30 (WorldScene `_updateDayNight`), so "dawn" and "dusk"
// are those, not 6 and 18: a stall packed up at 18:00 would close in broad daylight.
export const DAWN = 5.5, DUSK = 21;

/** The market's hours: the stallholders are at their stalls from dawn until the end of dusk (22:30), the last hour of
 *  it by lantern-light. */
export const STALL_HOURS = { open: DAWN, close: 22.5 };
export function stallsOpen(hour) { return hour >= STALL_HOURS.open && hour < STALL_HOURS.close; }

/** Each god's own hours, when its temple fills. Spread round the clock so some temple is busy most of the day. */
export const TEMPLE_HOURS = {
  healing: [5.5, 7.5], war: [7.5, 9.5], heros: [9.5, 11.5], dominion: [11.5, 13.5],
  knowledge: [13.5, 15.5], liberty: [15.5, 17.5], purity: [17.5, 19.5], death: [21, 23],
};
export function inTempleHours(god, hour) {
  const h = TEMPLE_HOURS[god];
  return !!h && hour >= h[0] && hour < h[1];
}
/** How many people are in a temple: a full nave in its hours, a few faithful otherwise by day, nobody at night. */
export function worshippersAt(god, hour) {
  if (inTempleHours(god, hour)) return 10;
  if (hour >= 23 || hour < 5) return 0;
  return 2;
}

/** The tavern's crowd by the hour: nobody before ten, a lunch trade, and full from evening until past midnight. */
export function tavernCrowdAt(hour) {
  if (hour >= 2 && hour < 10) return 0;
  if (hour >= 10 && hour < 17) return hour >= 12 && hour < 14 ? 4 : 2;
  if (hour >= 17 && hour < 19) return 6;
  if (hour >= 19 || hour < 1) return 12;
  return 5;   // 01:00-02:00, the last of them
}
export const TAVERN_MAX = 12;

/** Weather that sends people running for a doorway, and weather that sends only the less hardy in. */
export const HEAVY_RAIN = ['windRain', 'thunderstorm'];
export const LIGHT_RAIN = ['rain'];
/** Does this person get out of the weather? Everyone in heavy rain; in plain rain, the half with less sociability. */
export function sheltersFrom(weatherId, sociability) {
  if (HEAVY_RAIN.includes(weatherId)) return true;
  if (LIGHT_RAIN.includes(weatherId)) return sociability > 0.5;
  return false;
}
/** How much faster somebody walks when they are running from the rain. */
export const RAIN_HURRY = 1.9;

// --------------------------------------------------------------------------------------------------- the lamps
/** The lamplighters set out at dusk and have every lamp lit within two hours; the lamps go out at dawn. */
export const LAMPLIGHT = { start: 21, span: 2, out: DAWN, speed: 118, pause: 0.9 };
/** Is a lamp lit at this hour, given the hour its lighter reaches it? */
export function lampLitAt(hour, lightAt) {
  if (hour >= LAMPLIGHT.out && hour < LAMPLIGHT.start) return true;   // by day it hardly matters, and it is not dark
  if (hour >= LAMPLIGHT.start) return hour >= lightAt;
  return true;                                                         // after midnight: all lit, until dawn
}

// ------------------------------------------------------------------------------------------------ the calendar
/** Market day: once a week. The week is seven game days (a game day is ten minutes of play). */
export const MARKET_WEEK = 7, MARKET_DAY = 5;
export function isMarketDay(day) { return ((day % MARKET_WEEK) + MARKET_WEEK) % MARKET_WEEK === MARKET_DAY; }
/** Holy days: each of the eight gods has one day in a 28-day year, three days apart. */
export const HOLY_YEAR = 28;
export const HOLY_OFFSET = { healing: 1, war: 4, heros: 7, dominion: 10, knowledge: 13, liberty: 16, purity: 19, death: 22 };
export function holyDayGod(day) {
  const d = ((day % HOLY_YEAR) + HOLY_YEAR) % HOLY_YEAR;
  return GODS8.find(g => HOLY_OFFSET[g] === d) || null;
}
/** The next holy day from `day` (inclusive): { god, day, inDays }. */
export function nextHolyDay(day) {
  for (let k = 0; k < HOLY_YEAR; k++) { const g = holyDayGod(day + k); if (g) return { god: g, day: day + k, inDays: k }; }
  return null;
}
/** The procession leaves its temple mid-morning and is back by noon. */
export const PROCESSION_HOURS = [9.5, 12];
export const PROCESSION_SIZE = 6;

/** What each god's priest gives on its day: a small blessing (WorldScene's own buff slots), and a gift. */
export const HOLY_BLESSING = {
  war: { label: '+6% damage', buff: 'power', mult: 1.06 },
  heros: { label: '+5% critical chance', buff: 'critChance', bonus: 0.05 },
  dominion: { label: '+5% damage', buff: 'power', mult: 1.05 },
  knowledge: { label: '+4% critical chance', buff: 'critChance', bonus: 0.04 },
  liberty: { label: '+8% movement speed', buff: 'speed', mult: 1.08 },
  healing: { label: 'a slow heal', buff: 'hot', pct: 0.006 },
  purity: { label: 'a slow heal', buff: 'hot', pct: 0.005 },
  death: { label: '+4% critical chance', buff: 'critChance', bonus: 0.04 },
};
/** Real seconds a blessing lasts: two game hours and a bit. */
export const BLESSING_SECONDS = 60;
/** The gift, an item the game already has (inventory.js CONSUMABLE_DEFS). Falls back to coin if it is missing. */
export const HOLY_GIFT = {
  healing: 'potion_red_standard', war: 'potion_red_standard', heros: 'minorHealPotion', dominion: 'potion_blue_standard',
  knowledge: 'manaTonic', liberty: 'fdPassion', purity: 'fdCitrus', death: 'potion_green_small',
};
/** What the god's quest is: a cull for its day, taken from its priest and reported back to them. */
export const HOLY_QUEST_KIND = { war: 'cull', heros: 'hunt', dominion: 'cull', death: 'cull', healing: 'gather', knowledge: 'survey', liberty: 'survey', purity: 'cull' };
export const HOLY_LINES = {
  death: "Today we remember the ones the road kept. Walk with us to the gate and back, and say a name if you have one.",
  dominion: "The Seated Crown's day. Order is a gift, and today the temple gives it back: a blessing for anyone who keeps the peace.",
  healing: "The Green Mercy's day. Nobody is turned away from this door, and today nobody leaves it without something.",
  heros: "The Hero's day. Every deed in the hall was somebody's ordinary afternoon. Go and have one.",
  knowledge: "Ten Thousand Pages, and today we read one aloud in the street. Ask a question; it's the only rite.",
  liberty: "The Open Hand's day. The doors are propped and the cages are empty. Take what's offered, and pass it on.",
  purity: "The Unmarked's day. We wash the steps at dawn and the street by noon. Come and be clean of something.",
  war: "The Unbroken Line's day. Shields on the walls, blades on the altar. We march to the plaza and back before noon.",
};

// ------------------------------------------------------------------------------------------------ the crier
/** How the crier reads the world: every headline is something that has happened in this save. Pure. `w` is a plain
 *  snapshot the mixin builds (see `_clWorldSnapshot`). Newest and most important first. */
export function crierHeadlines(w) {
  const out = [];
  const day = w.day || 0;
  if (w.surging) out.push({ k: 'surge', pri: 10, text: `Surge on the border! The Society calls every adventurer of iron and above to the hall. Gates are doubled; keep the children in.` });
  if (w.shady === 'arrest') out.push({ k: 'wanted', pri: 9, text: `Wanted, by order of the Adventure Society: the hooded trader behind the tavern, for selling a restricted essence. Report him at the hall.` });
  if (w.shady === 'arrested' || (w.shady === 'done' && day - (w.shadyDay || 0) <= 3)) out.push({ k: 'caught', pri: 8, text: `The hooded trader is in a Society cell! Arrested ${w.shadyBy ? 'by ' + w.shadyBy : 'by one of our own adventurers'}. Mind what you buy in alleys.` });
  for (const d of (w.deaths || [])) {
    if (day - d.day > 6) continue;
    const a = ADV_BY_ID[d.who], t = ADV_TEAM_BY_ID[d.team];
    if (!a) continue;
    const team = (w.teamNames && w.teamNames[d.team]) || (t && t.name) || 'their team';
    out.push({ k: 'death', pri: 7, text: `Sad news from ${regionWord(d.region)}: ${team} have lost ${a.name}. ${d.funeralDay === day ? 'The funeral is at the cemetery this morning, behind the temples.' : 'There is a stone for them behind the temples.'}` });
  }
  // ROUND 388 -- "the town crier isn't going to be shouting news about some nobody making iron rank." Iron is where
  // every adventurer in the Nek starts; the crier reads a rank-up from Bronze, and a Society grading only for a
  // Bronze or better (w.rank, from _clWorldSnapshot), and says nothing at all about an Iron.
  if (w.rankUp && day - w.rankUp.day <= 2 && crierWorthy(w.rankUp.rank)) out.push({ k: 'rank', pri: 6, text: `Hear ye! ${w.name || 'One of the Society\'s own'} has risen to ${cap(w.rankUp.rank)} rank. ${w.rankUp.rank === 'bronze' ? 'The hall has a new name on its wall.' : 'The city is in good hands.'}` });
  if (w.stars && w.starsDay != null && day - w.starsDay <= 2 && crierWorthy(w.rank)) out.push({ k: 'stars', pri: 5, text: `The Society grades ${w.name || 'a new adventurer'} at ${w.stars} ${w.stars === 1 ? 'star' : 'stars'}. Contracts are on the board for those who want them.` });
  if (w.holyToday) out.push({ k: 'holy', pri: 5, text: `Today is ${GOD_NAME[w.holyToday]}'s holy day! The procession leaves the temple at half past nine. Blessings and gifts at the temple door.` });
  if (w.marketToday) out.push({ k: 'market', pri: 4, text: `Market day! Extra stalls in the market square, travelling traders from out of the city, and rare stock till dusk.` });
  if (!w.holyToday && w.holyNext && w.holyNext.inDays === 1) out.push({ k: 'holyNext', pri: 3, text: `Tomorrow is ${GOD_NAME[w.holyNext.god]}'s holy day. The temple asks for clean streets and quiet tempers.` });
  if (!w.marketToday && w.marketNextIn === 1) out.push({ k: 'marketNext', pri: 3, text: `Market day tomorrow! Traders welcome at the square from dawn.` });
  if (w.heavyRain) out.push({ k: 'rain', pri: 2, text: `Foul weather on the way in. The bathhouse is open late, and dry.` });
  if (!out.length) out.push({ k: 'quiet', pri: 0, text: pickBy(day, QUIET_NEWS) });
  out.sort((a, b) => b.pri - a.pri);
  return out;
}
const QUIET_NEWS = [
  'Hear ye! The Society\'s board has fresh contracts this morning. Honest work, honest pay.',
  'Hear ye! The north road is clear to Milrow; the yardmaster has wagons for hire outside the walls.',
  'Hear ye! Lost: one grey cat, answers to nothing. Last seen judging the fishmongers.',
  'Hear ye! The library\'s reading room is open to all from dawn. Quiet in the stacks, by order of the librarian.',
  'Hear ye! The barracks yard is open to any adventurer who wants to try their hand on the dummies.',
];
/** ROUND 388 -- is this rank news to a crier? Bronze and up. Iron is a nobody making iron. */
export function crierWorthy(rank) { return ['bronze', 'silver', 'gold', 'diamond'].includes(String(rank || '')); }
const REGION_WORD = { nek: 'the Nek', elehyd: 'Elehyd', bratugal: 'Bratugal', ixcuatl: 'Ixcuatl', sirukh: 'Sirukh', cinder: 'the Cinderwaste', ontaria: 'Ontaria' };
export function regionWord(id) { return REGION_WORD[id] || 'the frontier'; }
const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
function pickBy(seed, list) { return list[((seed % list.length) + list.length) % list.length]; }

// ---------------------------------------------------------------------------------------------- being known
/** How well the city knows you: 0 nobody, 1 a new Society face, 2 an iron with stars, 3 bronze, 4 silver and up. */
export function fameTier(rank, society) {
  const r = String(rank || 'normal');
  if (r === 'silver' || r === 'gold' || r === 'diamond') return 4;
  if (r === 'bronze') return 3;
  const joined = !!(society && society.joined);
  if (r === 'iron') return (society && society.stars >= 2) ? 2 : 1;
  return joined ? 1 : 0;
}
export const FAME_GREETINGS = [
  ['Morning.', 'Mind the cart.', 'Lovely day for it.', 'Excuse me.'],
  // ROUND 388 -- the two "iron" lines ("Iron yet? You will be." / "Safe roads, iron.") were what every passer-by said.
  // Tiers 1 and 2 are a nobody to a city, so nothing here names the rank, and _clKnownLine says these rarely.
  ["You're the new one at the Society, aren't you?", 'Good luck with the board!', 'Another one for the hall. Stay safe.'],
  ['Morning.', "Heard you've been busy.", "A second star, the hall says. My cousin's still on one."],
  ['Bronze! Look at that.', 'Thank you for what you do out there.', 'My lad wants to be you when he grows up.', "It's an honour, it really is."],
  ['*bows*', 'Silver rank, walking our street. Well.', "Everyone's talking about you.", 'The city sleeps easier with you in it.'],
];
/** What a townsperson has heard about you: one line about a deed, by what you have done. `deeds` is a plain object. */
export function deedRumour(deeds, seed = 0) {
  const lines = [];
  if (deeds.shadyCaught) lines.push("You're the one who caught the hooded trader! My sister nearly bought a cube off him.");
  if (deeds.olb) lines.push('They say you came back from somewhere nobody comes back from. Zeke carried you in, I heard.');
  if (deeds.holyQuests > 0) lines.push(`The temples speak well of you. ${deeds.holyQuests > 2 ? 'More than one of them, which is rare.' : 'Kept the holy day, they said.'}`);
  if (deeds.contracts >= 10) lines.push(`Ten contracts and more, they say. The board empties faster when you're in town.`);
  else if (deeds.contracts >= 3) lines.push('You took the stalker contract nobody wanted, didn\'t you? Or was that someone else?');
  // ROUND 388 -- only a rank the crier actually read out (crierWorthy): nobody hears about an Iron.
  if (deeds.rankUp && crierWorthy(deeds.rankUp)) lines.push(`${cap(deeds.rankUp)} now! The crier was shouting it all morning.`);
  if (deeds.funerals > 0) lines.push('I saw you at the funeral. Kind of you. Not everyone comes.');
  if (!lines.length) return null;
  return lines[((seed % lines.length) + lines.length) % lines.length];
}

// --------------------------------------------------------------------------------------------- the cemetery
/** The old stones, there before you: names, and what was cut under them. */
export const OLD_GRAVES = [
  ['Aldous Fenwick', 'Iron rank. Held the Milrow road, 3 days.'], ['Maren Holt', 'She went first, so we could follow.'],
  ['Tobias Crane', 'Bronze. Beloved of the Society.'], ['Ysolde Marr', 'The wolves of Fenn Cross remember her.'],
  ['Unknown adventurer', 'Found at the north gate. Known to the gods.'], ['Corin Ashe', 'Fire essence. Gone out.'],
  ['Hessaly Dunn', 'Healer. Never lost a patient but herself.'], ['Brannoc the Tall', 'Too brave by half. The other half was luck.'],
  ['Wenna Thorpe', 'Iron. Fell in the first surge.'], ['Old Garrick', 'Gatekeeper forty years. Gate still stands.'],
  ['Lysa and Pell Varrow', 'Together on the road; together here.'], ['Edric Moss', 'Silver rank. The Nek owed him and knew it.'],
  ['Pim', 'The yardmaster\'s dog. A good dog.'], ['Sabine Kell', 'Knowledge essence. Asked one question too many.'],
  ['Hollin Reave', 'Lost in the Bratugal marsh. Brought home.'], ['Ottilie Brand', 'Bronze. Taught half the hall to fight.'],
];
/** A stone for an adventurer who died off-screen. */
export function epitaphFor(who, d, teamNames) {
  const a = ADV_BY_ID[who];
  if (!a) return null;
  const t = ADV_TEAM_BY_ID[d.team];
  const team = (teamNames && teamNames[d.team]) || (t && t.name) || null;
  const rank = cap(a.rank || 'iron');
  const where = d.surge ? 'in the surge' : `in ${regionWord(d.region)}`;
  return { name: a.name, line: `${rank} rank${team ? ', of ' + team : ''}. Fell ${where}, day ${d.day + 1}.`, words: a.epitaph || `${a.name.split(' ')[0]} was one of us.` };
}
/** The funeral is the morning after a death, from nine until noon. */
export const FUNERAL_HOURS = [9, 12];
export function funeralFor(dead, day, hour) {
  for (const [who, d] of Object.entries(dead || {})) {
    if (d.day + 1 === day && hour >= FUNERAL_HOURS[0] && hour < FUNERAL_HOURS[1]) return { who, ...d };
  }
  return null;
}

// --------------------------------------------------------------------------------------------------- the homes
/** Who lives in a house: a household seeded from the house itself. 1-4 people; more of them home at night. */
const FIRST_M = ['Aldo', 'Bram', 'Cass', 'Dorran', 'Emmet', 'Fen', 'Garth', 'Hob', 'Ivo', 'Jory', 'Kit', 'Lorn', 'Milo', 'Ned', 'Orrin', 'Pell'];
const FIRST_F = ['Ada', 'Bree', 'Calla', 'Dena', 'Elsa', 'Fern', 'Greta', 'Hilde', 'Ina', 'Jessa', 'Kara', 'Lena', 'Mira', 'Nell', 'Opal', 'Petra'];
const SURNAMES = ['Ashby', 'Brook', 'Cotter', 'Dale', 'Ember', 'Fisk', 'Gale', 'Hale', 'Ivey', 'Joss', 'Kemp', 'Lark', 'Marsh', 'Nash', 'Oakes', 'Pryor', 'Quill', 'Rook', 'Sedge', 'Thorne'];
const TRADES = ['a cooper', 'a baker', 'a carter', 'a seamstress', 'a lamplighter\'s mate', 'a clerk at the hall', 'a fishmonger', 'a mason', 'a dyer', 'a chandler', 'retired', 'a laundress', 'a scribe', 'a tanner',
  // ROUND 421 -- trades whose work comes home with them (a loom, a joiner's bench, a smith's corner, shelves of jars)
  'a weaver', 'a carpenter', 'a smith', 'a herbalist', 'an apothecary', 'a fisher'];
const HOME_LINES = [
  "Wipe your feet. We've only just done the floor.",
  "If you're from the Society about the roof, it's still leaking.",
  'We heard the crier this morning. Is it true?',
  "Kettle's on, if you're staying. You're not staying.",
  'Mind the step, it bites.',
  'The neighbours have a cat that thinks it lives here.',
  "Don't mind the mess. Or do. It's still ours.",
  'You can see the temple roofs from upstairs, on a clear day.',
];
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function householdFor(key) {
  let h = hashStr(`household|${key}`);
  const r = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return (h % 100000) / 100000; };
  const surname = SURNAMES[Math.floor(r() * SURNAMES.length)];
  const n = 1 + Math.floor(r() * 4);
  const people = [];
  for (let i = 0; i < n; i++) {
    const f = r() < 0.5;
    const first = (f ? FIRST_F : FIRST_M)[Math.floor(r() * 16)];
    people.push({ name: `${first} ${surname}`, female: f, trade: TRADES[Math.floor(r() * TRADES.length)],
      line: HOME_LINES[Math.floor(r() * HOME_LINES.length)], dayHome: r() < 0.4 || i === 0 });
  }
  return { surname, people };
}
/** Who is home now: by day those who work at home (the first of the house always), at night everyone. */
export function homeAt(household, hour) {
  const night = hour >= 20 || hour < 7;
  return household.people.filter(p => night || p.dayHome);
}

// ------------------------------------------------------------------------------------------------------ sound
/** The district beds: where each is heard from, how far, and when. `hours` scales the volume by the hour. */
export const DISTRICT_SOUNDS = [
  { key: 'amb_district_market', file: 'amb_district_market.mp3', name: 'Market chatter', site: 'market', reach: 34, vol: 0.5,
    hours: (h) => (stallsOpen(h) ? 1 : 0.06) },
  // ROUND 410 -- "Hammering sound in the blacksmith doesn't sound anything like hammering at all. It's like somebody
  // playing with a xylophone ... Remove it." The synthesised hammer is gone until a real recording replaces it (a
  // hammer-on-anvil recording, wired back in under a new key so the old synthesised file can never come back).
  // ROUND 410 -- the user's recording (BigSoundBank "Anvil 1", CC0): "not to be played on repeat but perhaps once every
  // three minutes". `every` makes a district sound a one-shot: heard once when you come near, then once every
  // `every` seconds while you are in reach and the smithy is working.
  { key: 'amb_smithy_anvil', file: 'amb_smithy_anvil.mp3', name: "The smithy's anvil", site: 'blacksmith', reach: 24, vol: 0.6,
    every: 180, firstAfter: 8, hours: (h) => (h >= 6 && h < 20 ? 1 : 0) },
  { key: 'amb_district_tavern', file: 'amb_district_tavern.mp3', name: 'Tavern noise', site: 'tavern', reach: 20, vol: 0.5,
    hours: (h) => tavernCrowdAt(h) / TAVERN_MAX },
];
export const TEMPLE_BELL = { key: 'sfx_temple_bell', file: 'sfx_temple_bell.mp3', reach: 140, vol: 0.55 };

// ------------------------------------------------------------------------------------------------------ checks
export function cityLifeFaults() {
  const out = [];
  for (const g of GODS8) {
    if (!TEMPLE_HOURS[g]) out.push(`${g} has no hours`);
    if (!HOLY_BLESSING[g] || !HOLY_GIFT[g] || !HOLY_LINES[g] || !HOLY_QUEST_KIND[g]) out.push(`${g} has no holy day`);
    if (HOLY_OFFSET[g] === undefined) out.push(`${g} has no day in the year`);
  }
  const days = new Set(Object.values(HOLY_OFFSET));
  if (days.size !== 8) out.push('two gods share a holy day');
  for (let h = 0; h < 24; h += 0.5) if (tavernCrowdAt(h) > TAVERN_MAX) out.push('tavern over capacity');
  if (stallsOpen(23) || !stallsOpen(12) || stallsOpen(4)) out.push('stall hours wrong');
  return out;
}
