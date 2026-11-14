// ============================================================================
// ROUND 428 -- THE DIVINE SECRETS.
//
// The user's rules for them:
//   "The main favor should be an option to accept a divine essence into your confluence slot. Minor favors can be
//    nature gift evolutions. The activity should be something like dying, where you have to do something specific and
//    do it to an extreme to get the attention of the god."
//   "These are meant to be secrets and require an unusual effort meaning if its something a player will be inclined to
//    do normally (such as kill monsters, heal allies, cleanse afflictions) it can't be the method."
//
// One entry per god. Each has a MINOR favour (a nature gift evolution, through natureMixin's quest-reward door) and a
// MAJOR favour (the god comes and offers its divine essence for the confluence slot). The Unburied's secret is the one
// round 427 built (the Church of Death's hundred deaths and the mark); it is listed here so the set is whole, and its
// favour stays in gameModeMixin.
//
// Three kinds of secret:
//   'never'   a thing the player must never do, held until a rank: the minor at Bronze, the major at Gold.
//   'count'   a thing done many times: the minor at `minor`, the major at `major`.
//   'deed'    a single deed: the minor for the lesser one, the major for the greater (the mixin sets the flags).
//
// THE RECORD STARTS WHEN THE CHARACTER DOES. A 'never' can only be kept by someone the game has watched the whole way,
// so a save from before this round starts its record at the rank it is already, and a favour needs a record that began
// below that favour's rank. (An old Silver character can still earn the Gold favours of the 'never' secrets; not the
// Bronze ones.)
//
// State: `player.secrets428`, plain fields, made on first touch.
// ============================================================================

export const SECRET_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
const rankIx = (r) => Math.max(0, SECRET_RANKS.indexOf(r || 'normal'));

export const DIVINE_SECRETS = {
  avarice: {
    god: 'avarice', who: 'Avarice', kind: 'never', minorRank: 'bronze', majorRank: 'gold',
    act: 'Never use or give an item on anyone else: no awakening stones, potions or essences for anybody but yourself.',
    breaks: 'You gave something away.',
    minorLine: 'A ledger opens somewhere and your name is written in it, in a hand that does not hurry. "Everything you have ever held, you kept. I have been watching the column add up."',
    majorLine: 'She is writing before you see her. "Not one coin of yourself spent on anybody else. Not a stone, not a draught, not a drop. Do you know how rare that is? I do. I keep the count." She turns the ledger round. "Sign. It is yours. Everything is."',
    hint: { city: 'bra_city', role: 'merchant', line: 'My grandmother swore the Ledger only opens for a hand that has never once given anything away. Not even a potion.' },
  },
  knowledge: {
    god: 'knowledge', who: 'the God of Knowledge', kind: 'count', minor: 1, major: 4, unit: 'cities heard out',
    act: 'In a city, speak to nearly every soul (95%) and hear them out until they have nothing left to tell you.',
    minorLine: 'For a moment every voice you have heard in that city speaks at once, and then they are pages, and the pages are turning. "You listened to all of them. Nobody listens to all of them."',
    majorLine: '"Four cities. Every voice in them asked, and every voice answered to its end. You have read a great deal of me without opening a book." The pages settle. "There is one more I would like you to carry."',
    hint: { city: 'ele_city', role: 'scholar', line: 'The God of Knowledge is said to notice anyone who hears out an entire city. Every person, every word. Nobody has the patience.' },
  },
  death: {
    god: 'death', who: 'the God of Death', kind: 'never', minorRank: 'bronze', majorRank: 'gold',
    act: 'Never loot a body. What the dead carried stays with them.',
    breaks: 'You took from the dead.',
    minorLine: 'The air goes still, the way it does in a room where someone has just stopped breathing. "Every body you made, you left as it fell. You have not touched one of mine."',
    majorLine: '"You have walked past a thousand dead and taken nothing from any of them. The dead are mine. You let them be mine." The door you cannot see is open. "Then be mine too."',
    hint: { city: 'ont_city', role: 'scholar', line: 'The old rite of the Last Door says Death favours whoever never takes so much as a coin from a corpse. Their own kill included.' },
  },
  healing: {
    god: 'healing', who: 'the God of Healing', kind: 'never', minorRank: 'bronze', majorRank: 'gold',
    act: 'Never land a killing blow yourself. Let others end what you fight.',
    breaks: 'Something died by your hand.',
    minorLine: 'A warmth like a hand on the back of the neck. "You fight, and you have never once been the one who ends it. That is a strange thing to be proud of. I am proud of it."',
    majorLine: '"All this way, and nothing has died by your hand. Not one. Others finished what you could not bring yourself to." The green light holds you up. "I can use hands like that."',
    hint: { city: 'nek_city', role: 'scholar', line: 'They say the God of Healing marks an adventurer whose own hand has never struck a killing blow. Only their friends ever finish a fight.' },
  },
  heros: {
    god: 'heros', who: 'the God of Heroes', kind: 'never', minorRank: 'bronze', majorRank: 'gold',
    act: 'Never recruit a companion. Walk every road alone.',
    breaks: 'You took a companion.',
    minorLine: 'A sound like a crowd that is not there. "No one at your back. No one to share the song with. They will sing it anyway."',
    majorLine: '"Every road, alone. Every fight, alone. Every gate you went through, you went through first because there was nobody else to go." The deed is remembered. "So will you be."',
    hint: { city: 'sir_town', role: 'adventurer', line: 'Old Harl said the God of Heroes only ever chose people who went the whole road alone. Never took one companion.' },
  },
  purity: {
    god: 'purity', who: 'the God of Purity', kind: 'never', minorRank: 'bronze', majorRank: 'gold',
    act: 'Never take a potion, food or drink.',
    breaks: 'Something passed your lips.',
    minorLine: 'White, and quiet, and clean. "Nothing in you that you did not bring. No draught has passed your lips, and no crumb."',
    majorLine: '"Not one potion. Not one meal. Not one cup. All of this, on what you are and nothing else." The light is unmarked. "Be unmarked with me."',
    hint: { city: 'ont_city', role: 'noble', line: 'The Unmarked are said to choose those who never drink a potion, nor eat, nor drink at all. Rank does the rest.' },
  },
  deception: {
    god: 'deception', who: 'the Veiled Hand', kind: 'count', minor: 10, major: 50, unit: 'crew jobs done unseen',
    act: 'Work the bandit crew board while an Adventure Society member in good standing, and never be found out.',
    breaks: 'You were found out.',
    minorLine: 'Someone is standing beside you, and then nobody is. "Ten jobs, and the Society still pins your badge on straight. I do like you."',
    majorLine: 'The Veiled Hand is in the room and does not seem to be in any one place. "Fifty. Fifty, and your name is clean in every ledger they keep. Nobody believes it was you. Nobody ever will." A hand you did not see is held out. "Take it."',
    hint: { city: 'cin_slag', role: 'labourer', line: 'The Veiled Hand loves a Society badge that works the crew board. Fifty jobs and never caught, so the story goes.' },
  },
  destruction: {
    god: 'destruction', who: 'Destruction', kind: 'deed',
    act: 'Raze a settlement to the ground. A hamlet or a village wins notice; a walled city wins Destruction himself.',
    minorLine: 'Ash, falling up. "That was small. It was still a breaking. I felt it."',
    majorLine: 'Destruction is smiling and there is a great deal of it. "Walls. Gates. Every roof. You broke a city open for me, and you did it yourself." He leans close. "Take a piece of me. You have earned the weight."',
    hint: { city: 'cin_slag', role: 'guard', line: 'If you ever see one man set a whole walled city burning, run. That is how Destruction picks his own.' },
  },
  liberty: {
    god: 'liberty', who: 'the God of Liberty', kind: 'deed',
    act: 'Break into the gaols and set the prisoners free. Empty every cell in a region; then empty every cell in the world at once.',
    minorLine: 'A door somewhere swings open on its own and stays open. "Every cell in that country, empty. For a little while nobody there is anybody\'s."',
    majorLine: '"Every cell. Every gaol in every country, empty at once. There is not one person in this world behind a door tonight." The open hand is open to you. "Then I am yours, if you want me."',
    hint: { city: 'sir_town', role: 'labourer', line: 'The God of Liberty is meant to come to whoever empties every gaol in the world at once. Every cell, every country.' },
  },
  dominion: {
    god: 'dominion', who: 'the God of Dominion', kind: 'deed',
    act: 'Become a king. Take a bandit city\'s throne for your own instead of clearing it; then be crowned in a fallen capital you resettled.',
    minorLine: 'The weight of a crown that is not there. "A bandit\'s chair, but a throne. You sat in it and they knelt."',
    majorLine: '"A capital that fell, and you raised it, and they crowned you in it." The seated crown regards you as an equal for the first time. "Sit with me."',
    hint: { city: 'bra_city', role: 'noble', line: 'Dominion favours only the crowned. They say a bandit king got a nod once. A true crown in a fallen capital gets the god.' },
  },
  war: {
    god: 'war', who: 'the God of War', kind: 'count', minor: 10, major: 40, unit: 'challenges answered',
    act: 'Answer every challenge put to you. Refuse one, or let one go unanswered, and it is over.',
    breaks: 'You let a challenge go unanswered.',
    minorLine: 'Steel rings somewhere close. "Ten called you out. Ten times you stepped up. Not once did you look away."',
    majorLine: '"Every challenge. Every one. Nobody who called you out was ever told no." The unbroken line opens a place in it. "Stand here."',
    hint: { city: 'ont_city', role: 'guard', line: 'My sergeant says the God of War marks those who never once refuse a challenge. Not one, ever.' },
  },
  unburied: {
    god: 'unburied', who: 'the Unburied', kind: 'built427',
    act: 'Die a hundred times and come back, until the Church of Death will not have you, and take the mark of the Unburied.',
    hint: { city: 'nek_city', role: 'labourer', line: 'The priests of Death hate anyone who keeps coming back. Die enough and the Unburied come for you instead.' },
  },
};

export const SECRET_IDS = Object.keys(DIVINE_SECRETS);

/** The record, made on first touch. `rank` is the rank the character holds when the record starts. */
export function secretState(p) {
  if (!p) return null;
  if (!p.secrets428 || typeof p.secrets428 !== 'object') {
    p.secrets428 = {
      v: 1, from: p.rank || 'normal', broken: {}, why: {}, counts: {}, deeds: {}, granted: {},
      knowledge: { heard: {}, cities: {} },
    };
  }
  const s = p.secrets428;
  for (const k of ['broken', 'why', 'counts', 'deeds', 'granted']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
  if (!s.knowledge || typeof s.knowledge !== 'object') s.knowledge = { heard: {}, cities: {} };
  if (!s.knowledge.heard) s.knowledge.heard = {};
  if (!s.knowledge.cities) s.knowledge.cities = {};
  return s;
}

/** Break a 'never' (or a count that can be lost). Once broken it stays broken. Returns true the first time. */
export function breakSecret(p, id, why = '') {
  const s = secretState(p);
  if (!s || !DIVINE_SECRETS[id] || s.broken[id]) return false;
  s.broken[id] = true;
  s.why[id] = why || DIVINE_SECRETS[id].breaks || '';
  return true;
}

/**
 * What each secret has earned, as { minor, major } booleans, from the record and the player's rank. Pure: the mixin
 * decides what to do with it, and the tests read it directly.
 */
export function secretEarned(p, id) {
  const def = DIVINE_SECRETS[id];
  const s = secretState(p);
  if (!def || !s) return { minor: false, major: false };
  if (s.broken[id]) return { minor: false, major: false };
  if (def.kind === 'never') {
    const now = rankIx(p.rank), from = rankIx(s.from);
    const mr = rankIx(def.minorRank), jr = rankIx(def.majorRank);
    return { minor: now >= mr && from < mr, major: now >= jr && from < jr };
  }
  if (def.kind === 'count') {
    const n = Number(s.counts[id]) || 0;
    return { minor: n >= def.minor, major: n >= def.major };
  }
  if (def.kind === 'deed') {
    const d = s.deeds[id] || {};
    return { minor: !!(d.minor || d.major), major: !!d.major };
  }
  return { minor: false, major: false };
}

/** A count, raised by one (or set). */
export function bumpSecret(p, id, by = 1) {
  const s = secretState(p);
  if (!s || s.broken[id]) return 0;
  s.counts[id] = (Number(s.counts[id]) || 0) + by;
  return s.counts[id];
}

/** A deed done: tier 'minor' or 'major'. */
export function markDeed(p, id, tier, detail = '') {
  const s = secretState(p);
  if (!s) return;
  const d = s.deeds[id] = s.deeds[id] || {};
  if (!d[tier]) d[tier] = detail || true;
}

// ----------------------------------------------------------------------------------------------- Knowledge
/** A city counts as heard out when this share of its people have been heard to the end. */
export const KNOWLEDGE_SHARE = 0.95;

/** The share of `people` (an array of stable keys) heard out in `heard` (a key->true map). */
export function heardShare(people, heard) {
  if (!people || !people.length) return 0;
  let n = 0;
  for (const k of people) if (heard[k]) n++;
  return n / people.length;
}

// ----------------------------------------------------------------------------------------------- hints
/** The hints, one per secret, as town-talk lines. */
export const SECRET_HINTS = SECRET_IDS.map(id => ({ secret: id, ...DIVINE_SECRETS[id].hint })).filter(h => h.line);

/** For a test: every secret has an act, a hint and (for all but the Unburied's) both favours' lines. */
export function secretFaults() {
  const out = [];
  for (const id of SECRET_IDS) {
    const d = DIVINE_SECRETS[id];
    if (!d.act) out.push(`${id}: no act`);
    if (!d.hint || !d.hint.line) out.push(`${id}: no hint`);
    if (d.hint && d.hint.line && (d.hint.line.length > 140 || /["“”]/.test(d.hint.line))) out.push(`${id}: hint breaks the town-talk rules`);
    if (d.kind !== 'built427' && (!d.minorLine || !d.majorLine)) out.push(`${id}: a favour has no words`);
  }
  return out;
}
