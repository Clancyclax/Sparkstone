// ===========================================================================
// ROUND 357 -- THE NINE MAGICAL THEORIES (ritual magic, specialised).
//
// The user, item 2:
//
//   2    "Ritual magic should be in a few skill books. These should be relatively cheap at iron rank but ranking them up
//         quickly becomes expensive."
//   2.1-2.9  Astral, Natural Array, Elemental, Divine, Portal, Soul, Fauna, Weather and Ritual Interference Magical
//         Theory -- each "should give a bonus to investigation and puzzles involving" its own domain.
//   2.10 "A player can only pick [one] magical specialty and picking any of the above would grant access to ritual magic"
//   2.11 "This of course means quests, activities, and exploration need added throughout the game that these choices can
//         affect." -- and 2.11.1-2.11.9, what each one involves and what it grants (below, verbatim in `grants`).
//
// THIS FILE is the catalogue and the arithmetic, the same split skillBooks.js makes: the nine theories, their books, what
// a book costs, what the Deepening of a theory costs at each rank, what each perk is worth at each rank, and the arcane
// sites (the investigations and puzzles the theories are FOR) -- their kinds, their difficulty, and the rule that turns a
// theory and a rank into help with a puzzle. The scene's half (the perks wired into the systems they touch, the sites in
// the world, the puzzle, the Deepening, the soul attack in conversation, calling the weather) is ritualTheoryMixin.js.
//
// THE PLAYER'S BAG grows three fields beside round 310's `ritual: bool`:
//   player.skillBooks.theory      'astral' | 'natural' | ... | null   -- at most ONE (2.10)
//   player.skillBooks.theoryRank  RANK_ORDER index it is attuned to (iron = 1); the Deepening raises it
//   player.skillBooks.ritual      true once any theory is read (2.10: "would grant access to ritual magic")
//
// PRICES are in normal-coin units like every shop (one iron coin = 100). Reading a theory at iron: 40 iron coins -- cheaper
// than round 310's single Ritual Magic book (100). Deepening it to each higher rank costs that rank's OWN coin, and more
// of them every rank: 60 bronze, 90 silver, 140 gold, 220 diamond. Each coin is 100x the last, so each step is ~150x the
// one before: cheap to start, quickly expensive -- the user's sentence, as a number.
// ===========================================================================
import { RANK_ORDER, RANK_LABELS } from './ranks.js';

export const THEORY_BOOK_PRICE = 40 * 100;                 // 40 iron coins
export const THEORY_DEEPEN_COINS = { 2: 60, 3: 90, 4: 140, 5: 220 };   // in the target rank's own coin
/** Normal-coin cost of deepening a theory TO rank index `r` (bronze = 2 .. diamond = 5); 0 for iron. */
export function theoryDeepenCost(r) {
  const n = THEORY_DEEPEN_COINS[r];
  return n ? n * Math.pow(100, r) : 0;
}
/** "60 bronze coins". */
export function theoryDeepenLabel(r) {
  const n = THEORY_DEEPEN_COINS[r];
  return n ? `${n} ${(RANK_LABELS[RANK_ORDER[r]] || '').toLowerCase()} coins` : 'nothing';
}

/** The nine. `domain` is what the user said it "involves"; `grants` what he said it grants, in his words; `site` the
 *  arcane site kind it reads best; `color` its ink. */
export const THEORIES = {
  astral: {
    key: 'astral', name: 'Astral Magical Theory', color: '#b39ddb', site: 'aperture',
    domain: 'summons, outworlders, monsters and astral apertures',
    grants: 'Bonuses to your summons, and more loot from monsters in astral spaces.',
  },
  natural: {
    key: 'natural', name: 'Natural Array Magical Theory', color: '#9ccc65', site: 'array',
    domain: 'large-scale magic that uses the world itself to build a ritual',
    grants: 'Resistance to the effects of natural arrays, and the places on your map where awakening stones and essences are likely to gather.',
  },
  elemental: {
    key: 'elemental', name: 'Elemental Magical Theory', color: '#ff8a65', site: 'confluence',
    domain: 'the elements and elemental monsters',
    grants: 'Elemental resistances, and more loot from elemental monsters.',
  },
  divine: {
    key: 'divine', name: 'Divine Magical Theory', color: '#ffe082', site: 'shrine',
    domain: 'gods, their followers, domains of influence and temples',
    grants: 'Better rewards from gods and priests, and resistance to divine pressure.',
  },
  portal: {
    key: 'portal', name: 'Portal Magical Theory', color: '#80deea', site: 'waygate',
    domain: 'teleports and portals',
    grants: 'Stronger teleports, a chance to block an enemy\'s teleport while you suppress its aura, and resistance to having your own teleports blocked.',
  },
  soul: {
    key: 'soul', name: 'Soul Magical Theory', color: '#ce93d8', site: 'soulwell',
    domain: 'the soul, the adoption of essences, soul strength and soul attacks',
    grants: 'Soul defences, more damage against creatures of the soul, and from bronze rank the ability to make a soul attack in conversation.',
  },
  fauna: {
    key: 'fauna', name: 'Fauna Magical Theory', color: '#a1887f', site: 'lair',
    domain: 'magical beasts that are not monsters, and the species abilities of sentient creatures',
    grants: 'More loot from magical beasts, and they notice you from less far away.',
  },
  weather: {
    key: 'weather', name: 'Weather Magical Theory', color: '#90caf9', site: 'stormAltar',
    domain: 'how weather and magic interact',
    grants: 'Bonuses in every weather (its penalties soften, its favours sharpen), and from silver rank the power to call a region\'s weather.',
  },
  interference: {
    key: 'interference', name: 'Ritual Interference Magical Theory', color: '#f48fb1', site: 'circles',
    domain: 'how layered rituals interact, reinforce or interfere with each other',
    grants: 'Shorter ritual cooldowns and stronger ritual zones; the power to shut down or reinforce a ritual, and from silver rank to layer two of your own at once.',
  },
};
export const THEORY_KEYS = Object.keys(THEORIES);

/** The book row for a theory, in skillBooks.js's shape (kind 'theory'). */
export function theoryBook(key) {
  const t = THEORIES[key];
  if (!t) return null;
  return {
    id: `book_theory_${key}`, kind: 'theory', theory: key, price: THEORY_BOOK_PRICE, name: t.name,
    blurb: `The study of ${t.domain}. ${t.grants} Investigations and puzzles involving it come easier to you, more so at each rank. `
      + 'Reading any magical theory grants ritual magic. You can study only ONE magical theory. '
      + 'Cheap to read at iron; deepening it at each later rank costs that rank\'s coin, and more of it every time.',
  };
}
export function theoryBookById(id) {
  return (typeof id === 'string' && id.startsWith('book_theory_')) ? theoryBook(id.slice('book_theory_'.length)) : null;
}

// ---------------------------------------------------------------------------
// PERKS -- what each theory is worth at each attuned rank (iron = 1 .. diamond = 5). Numbers, not adjectives: every one
// is read by exactly one place in the scene (see ritualTheoryMixin.js), and the card prints them.
// ---------------------------------------------------------------------------
const lin = (a, b) => (r) => Math.round((a + b * (Math.max(1, Math.min(5, r)) - 1)) * 1000) / 1000;
const atLeast = (n) => (r) => (r >= n ? 1 : 0);
export const THEORY_PERKS = {
  astral:       { summonPower: lin(0.08, 0.06), astralLoot: lin(0.15, 0.12) },
  natural:      { arrayResist: lin(0.25, 0.15), siteSense: atLeast(1), siteSenseFar: atLeast(3) },
  elemental:    { elemResist: lin(0.06, 0.04), elemLoot: lin(0.15, 0.12) },
  divine:       { divineReward: lin(0.12, 0.08), divineResist: lin(0.08, 0.05) },
  portal:       { teleportBoost: lin(0.15, 0.1), foeTeleportBlock: lin(0.25, 0.15), teleportBlockResist: lin(0.25, 0.15) },
  soul:         { soulResist: lin(0.08, 0.05), soulDamage: lin(0.12, 0.08), soulConverse: atLeast(2) },
  fauna:        { beastLoot: lin(0.15, 0.12), beastAggro: lin(0.15, 0.07) },
  weather:      { attune: lin(0.3, 0.17), weatherCall: atLeast(3) },
  interference: { riteCooldown: lin(0.1, 0.06), riteEffect: lin(0.08, 0.05), riteReinforce: atLeast(2), riteLayer: atLeast(3) },
};
/** A perk's value for this player: 0 unless the player studies that theory. */
export function theoryPerkOf(sb, key, perk) {
  if (!sb || sb.theory !== key) return 0;
  const f = THEORY_PERKS[key] && THEORY_PERKS[key][perk];
  return f ? f(Number.isFinite(sb.theoryRank) ? sb.theoryRank : 1) : 0;
}
/** The card line: every perk at this rank, in words. */
export function theoryPerkLines(key, r) {
  const P = (v) => `${Math.round(v * 100)}%`;
  const at = (perk) => THEORY_PERKS[key][perk](r);
  switch (key) {
    case 'astral': return [`Your summons strike ${P(at('summonPower'))} harder and are ${P(at('summonPower'))} hardier`, `+${P(at('astralLoot'))} loot from monsters in astral spaces`];
    case 'natural': return [`${P(at('arrayResist'))} resistance to natural arrays`, at('siteSenseFar') ? 'Your map shows where stones and essences are gathering, across the whole region' : 'Your map shows where stones and essences are gathering, where you have explored'];
    case 'elemental': return [`+${P(at('elemResist'))} resistance to fire, frost, lightning, earth, water and air`, `+${P(at('elemLoot'))} loot from elemental monsters`];
    case 'divine': return [`+${P(at('divineReward'))} rewards from gods and priests`, `${P(at('divineResist'))} resistance to divine pressure (radiant and holy damage)`];
    case 'portal': return [`Teleports reach +${P(at('teleportBoost'))} further`, `${P(at('foeTeleportBlock'))} chance to stop a foe whose aura you suppress from teleporting`, `${P(at('teleportBlockResist'))} chance to teleport through a block`];
    case 'soul': return [`${P(at('soulResist'))} resistance to soul damage (shadow, necrotic, soul)`, `+${P(at('soulDamage'))} damage to creatures of the soul`, at('soulConverse') ? 'You can make a soul attack in conversation' : 'From bronze: a soul attack in conversation'];
    case 'fauna': return [`+${P(at('beastLoot'))} loot from magical beasts`, `Magical beasts notice you ${P(at('beastAggro'))} less far away`];
    case 'weather': return [`Weather attunement ${P(at('attune'))}: penalties soften, favours sharpen`, at('weatherCall') ? 'You can call the weather of a region (a rite)' : 'From silver: call the weather of a region'];
    case 'interference': return [`Ritual cooldowns ${P(at('riteCooldown'))} shorter`, `Ritual zones ${P(at('riteEffect'))} stronger`, at('riteReinforce') ? 'You can reinforce a ritual zone (it lasts twice as long)' : 'From bronze: reinforce a ritual zone', at('riteLayer') ? 'Two of your ritual zones can stand at once' : 'From silver: layer two ritual zones'];
    default: return [];
  }
}

// ---------------------------------------------------------------------------
// WHICH MONSTERS each theory's damage and loot perks count, by family (monsters.js). Declared, not inferred: a family a
// later round adds is in none of these until somebody decides it belongs.
// ---------------------------------------------------------------------------
export const ELEMENTAL_FAMILIES = new Set(['elemental', 'slimeGolem', 'stormjar', 'kilnwarden', 'geodeback', 'shardling', 'cinderlamb',
  'rimehare', 'shiverfox', 'urchinroll', 'saltwife', 'glasswader', 'rustmantle', 'smokecur', 'phoenix', 'thunderbird']);
export const SOUL_FAMILIES = new Set(['shade', 'harbinger', 'lanternwraith', 'drownwight', 'mournhusk', 'hollowchoir', 'pallbearer',
  'ossuaryKnight', 'skeleton', 'spiritSerpent', 'gravesown', 'stringless']);
/** "Magical beasts that are not monsters": the animals a monster family is built on, as opposed to its abominations. */
export const BEAST_FAMILIES = new Set(['wolf', 'boar', 'raptor', 'bat', 'spider', 'lizard', 'cobra', 'hornram', 'direbuck', 'whitelion',
  'crocodile', 'giantToad', 'tuskmaw', 'rimehare', 'shiverfox', 'gnawling', 'duskmoth', 'bonepecker', 'lurefin', 'scalecurl', 'sharkcrab',
  'glasscat', 'hellhound', 'steelRaptor', 'trex', 'spinosaurus']);
/** The families that can BLINK (teleport a few tiles toward their quarry): the ethereal ones. Portal theory blocks it. */
export const BLINK_FAMILIES = new Set(['shade', 'lanternwraith', 'harbinger', 'drownwight', 'hollowchoir', 'spiritSerpent']);
export const BLINK_RANGE_TILES = 4;
export const BLINK_COOLDOWN_S = [6, 10];

// ---------------------------------------------------------------------------
// THE ARCANE SITES -- 2.11's "quests, activities, and exploration ... that these choices can affect", and the
// investigation round 310's rituals.js left a hook for (`ritualInvestigationReady`). Nine kinds, one per theory; each
// region holds a few, placed in the open. Studying one is an INVESTIGATION (a short rite at the site) and then a PUZZLE:
// three readings, each a choice of three glyphs, one of them right. What a theory gives is HELP WITH THE PUZZLE:
//   the matching theory -- you see which glyph is right (your training reads it), at every rank;
//   any other theory    -- the general grounding of ritual magic rules one wrong glyph out on the harder readings;
//   no theory at all    -- nothing; you guess.
// Three right is a full success, two a partial one. The matching theory also unlocks the site's OWN outcome (a waygate
// you can travel through, the weather you can call, an array you can tap ...), and the reward rises with its rank.
// ---------------------------------------------------------------------------
export const ARCANE_SITES = {
  aperture:   { theory: 'astral',       name: 'Astral Aperture Scar',  blurb: 'A seam in the air where something once came through. It has not quite closed.', color: 0xb39ddb },
  array:      { theory: 'natural',      name: 'Natural Array Node',    blurb: 'Stones, roots and water laid out by no one, in a pattern too regular to be chance. It pulls at you.', color: 0x9ccc65 },
  confluence: { theory: 'elemental',    name: 'Elemental Confluence',  blurb: 'The ground here is hot on one side and rimed with frost on the other.', color: 0xff8a65 },
  shrine:     { theory: 'divine',       name: 'Forgotten Shrine',      blurb: 'A god was worshipped here once. Something is still listening.', color: 0xffe082 },
  waygate:    { theory: 'portal',       name: 'Broken Waygate',        blurb: 'Two standing stones and the memory of a door between them.', color: 0x80deea },
  soulwell:   { theory: 'soul',         name: 'Soul Well',             blurb: 'A shallow pit where the dead were laid. The air remembers them.', color: 0xce93d8 },
  lair:       { theory: 'fauna',        name: 'Marked Lair',           blurb: 'Claw-marks in a pattern, and a smell no ordinary animal makes.', color: 0xa1887f },
  stormAltar: { theory: 'weather',      name: 'Storm Altar',           blurb: 'A flat stone on high ground, scorched in rings by lightning that came on purpose.', color: 0x90caf9 },
  circles:    { theory: 'interference', name: 'Layered Circles',       blurb: 'Three ritual circles cut over one another, each spoiling the last.', color: 0xf48fb1 },
};
export const ARCANE_KINDS = Object.keys(ARCANE_SITES);
/** Sites per region: two of each kind the region's climate and lore can hold, nine kinds, so about a dozen a region. */
export const ARCANE_PER_REGION = 12;
/** Which kinds each region leans to (two of these, one of the rest). */
export const ARCANE_REGION_LEAN = {
  nek: ['array', 'shrine', 'lair', 'waygate'],
  ontaria: ['array', 'lair', 'soulwell', 'circles'],
  elehyd: ['stormAltar', 'confluence', 'waygate', 'aperture'],
  bratugal: ['soulwell', 'lair', 'circles', 'stormAltar'],
  sirukh: ['shrine', 'waygate', 'stormAltar', 'aperture'],
  cinder: ['confluence', 'aperture', 'circles', 'shrine'],
  ixcuatl: ['lair', 'array', 'stormAltar', 'soulwell'],
};
export const ARCANE_STUDY_S = 6;          // the investigation rite at the site
export const ARCANE_COOLDOWN_DAYS = 1;     // a studied site rests a day before it can be read again
export const ARCANE_RADIUS = 1.8;         // tiles: how close to stand to study
export const ARRAY_PULL_RADIUS = 5;       // tiles: a natural array's pull (slows the unresisting)
export const ARRAY_PULL_SLOW = 0.3;       // how much it slows at the centre, before resistance
export const GLYPHS = ['ᚠ', 'ᚱ', 'ᛇ', 'ᛒ', 'ᛟ', 'ᚨ', 'ᛉ', 'ᚾ', 'ᛖ'];

/** The three readings of a site: for each, three glyph choices and the right one. Seeded by the site and the day, so a
 *  rested site asks fresh questions and the same day's answer is the same answer. */
export function arcanePuzzle(siteId, day) {
  let h = 2166136261 >>> 0;
  const s = `${siteId}|${day}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  const steps = [];
  for (let k = 0; k < 3; k++) {
    const pool = GLYPHS.slice();
    const opts = [];
    for (let j = 0; j < 3; j++) opts.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    steps.push({ options: opts, answer: Math.floor(rnd() * 3) });
  }
  return steps;
}

/** What help a reader gets on reading `step` (0..2) of a site of `kind`: 'answer' (the right glyph shown), 'narrow'
 *  (one wrong glyph struck out), or 'none'. */
export function arcaneHelp(sb, kind, step) {
  const site = ARCANE_SITES[kind];
  if (!site || !sb) return 'none';
  if (sb.theory && sb.theory === site.theory) return 'answer';
  if (sb.theory && step >= 1) return 'narrow';   // any theory's grounding helps on the harder readings
  return 'none';
}

/** The reward for a study: coins (normal units) scale with the region's tier and, for the matching theory, its rank. */
export function arcaneReward(regionIdx, rightCount, matching, theoryRank) {
  if (rightCount < 2) return { coins: 0, full: false };
  const base = 600 * Math.pow(3, Math.max(0, Math.min(6, regionIdx || 0)));
  const rank = matching ? 1 + 0.5 * (Math.max(1, theoryRank || 1) - 1) : 1;
  const full = rightCount >= 3;
  return { coins: Math.round(base * rank * (full ? 1 : 0.4) * (matching ? 1.5 : 1)), full };
}

export function ritualTheoryFaults() {
  const out = [];
  const want = ['astral', 'natural', 'elemental', 'divine', 'portal', 'soul', 'fauna', 'weather', 'interference'];
  for (const k of want) {
    if (!THEORIES[k]) out.push(`no ${k} theory`);
    if (!THEORY_PERKS[k]) out.push(`${k} has no perks`);
    const b = theoryBook(k);
    if (!b || b.price !== THEORY_BOOK_PRICE) out.push(`${k} book missing or mispriced`);
    if (!ARCANE_KINDS.some(s => ARCANE_SITES[s].theory === k)) out.push(`${k} has no arcane site`);
    if (theoryPerkLines(k, 1).length < 2) out.push(`${k} card is thin`);
  }
  if (THEORY_KEYS.length !== 9) out.push(`there are ${THEORY_KEYS.length} theories, not 9`);
  for (let r = 3; r <= 5; r++) if (!(theoryDeepenCost(r) > theoryDeepenCost(r - 1) * 50)) out.push(`deepening to rank ${r} is not steeply dearer`);
  if (!(theoryDeepenCost(2) > THEORY_BOOK_PRICE * 50)) out.push('bronze deepening is not steeply dearer than the book');
  for (const [r, list] of Object.entries(ARCANE_REGION_LEAN)) for (const k of list) if (!ARCANE_SITES[k]) out.push(`${r}: unknown site ${k}`);
  const p = arcanePuzzle('x', 1);
  if (p.length !== 3 || p.some(s => s.options.length !== 3 || !(s.answer >= 0 && s.answer < 3))) out.push('the puzzle is malformed');
  return out;
}
