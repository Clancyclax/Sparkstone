// ============================================================================
// ROUND 369 -- WHAT THE OTHER ADVENTURERS SAY TO YOU, AND WHAT OTHERS SAY ABOUT THEM.
//
//   "7) Random adventurers should talk to you in first person, they don't
//    introduce their backstory. If you want to learn their backstory you would
//    need to talk to an NPC about them, probably at the adventures guild or
//    later on someone on their team.
//    7.1) You don't know to ask about people you haven't met before."
//
// Round 362 opened every talk with the narrator's summary of the person
// (`about`, third person) and then one of their `stories`, the first of which is
// usually their origin tale. Now:
//
//   TO YOUR FACE     a first-person hello in their own voice (ADV_HELLO) on the first
//                    meeting, their stance greeting after that. "How's the work?" is
//                    small talk: their stories that are NOT origin tales, and their
//                    team's. The origin tales (ADV_ORIGIN_STORIES) are held back until
//                    the player already knows the backstory, and even then only when
//                    the player asks for them.
//   AT THE DESK      a Society clerk tells you who someone is (`about`, third person,
//                    in the clerk's file voice) -- only for people you have met.
//   FROM A TEAMMATE  "Kesh? He's a Milrow farmer's son..." -- `about` turned into speech
//                    by `advTeammateTelling`, again only for teammates you have met.
//
// THE PLAYER'S RECORD. Two ordinary player fields, so saves.js carries them whole:
//   player.advMet   { id: dayFirstMet }   set the first time you talk to them
//   player.advKnown { id: true }          set when someone else has told you their story
//
// Pure: data and functions only. The scene is scenes/adventurersMixin.js.
// ============================================================================
import { ADVENTURERS, ADV_BY_ID, ADV_TEAM_BY_ID } from './adventurers.js';
import { RANK_LABELS } from './ranks.js';

/** Which of each person's `stories` are their own origin tale: not told to a stranger. */
export const ADV_ORIGIN_STORIES = {
  kesh: [0], maribel: [0], tobin: [1], ysolde: [0, 2], pell: [0], garrick: [0],
  aldric: [0, 2], sera: [0], corin: [0], ilyra: [0], bram: [0],
  dace: [0, 1], nix: [0, 1], bran: [0], juno: [0],
  wim: [0], lark: [0],
  hester: [0], orrin: [0, 1], tamsin: [0], mattias: [0], quill: [0, 2],
  varga: [0], sable: [0], rook: [1], ember: [0],
  aurelian: [], maelis: [0], cassian: [0], fenna: [0],
  thessaly: [0], calder: [0], isolde: [0], ptolem: [0],
  rhaza: [0], tarek: [0], zahra: [], mott: [],
};

/**
 * How each of them says hello the first time: first person, in their voice, and nothing of where they came from.
 * `{team}` is the team's generated name. The four who start alone and join a team later have a `solo` and a `team` line.
 */
export const ADV_HELLO = {
  kesh: { solo: `Kesh Varn. Remember it. You'll be hearing it a lot.`, team: `Kesh Varn, and this lot is {team}. My team. Remember the name, you'll be hearing it.` },
  maribel: { solo: `Maribel Oakes. I work the Fenn Cross board, mostly the small ones.`, team: `Maribel Oakes. I scout for {team}.` },
  tobin: { solo: `Oh! Hello. I'm Tobin. Tobin Rusk. Sorry, I'm -- hello.`, team: `Hi! I'm Tobin. We're {team}. Well. We're trying to be.` },
  ysolde: `Ysolde. Just Ysolde will do.`,
  pell: { solo: `Pell Ashgrove! Pleased to meet you. Properly pleased, not Society pleased.`, team: `Pell Ashgrove, {team}. Don't let Tobin tell you he's in charge.` },
  garrick: `Garrick. That's all you need.`,
  aldric: `Aldric Venn. I lead {team}.`,
  sera: `Sera Lantis. I keep {team} in one piece. Mostly.`,
  corin: `Corin Hale! Good to meet you. Truly.`,
  ilyra: `Ilyra Sunmantle, of {team}. A pleasure, I'm sure.`,
  bram: `Bram.`,
  dace: `Dace. You fight? Course you fight.`,
  nix: `Nix. Don't touch anything of mine and we'll get on.`,
  bran: `Brannoc Fell! Bran, to friends. You look like a friend.`,
  juno: `Juno! Hi! Can't stop -- can stop. I've stopped. Hi.`,
  wim: `Wim Haddock, {team}. Could I ask what rank you are? It's for the notes.`,
  lark: `Hello. I'm Lark. What's your name?`,
  hester: `Hester Graymane. I lead {team}.`,
  orrin: `Orrin Vale. Good evening. Or whatever it is.`,
  tamsin: `Tamsin Crowe. I heard you coming a while back.`,
  mattias: `Mattias Brand. Don't mind the smoke.`,
  quill: `Quill Ashenrune. And it's rude to read someone's skin, before you ask.`,
  varga: `Varga Holt, {team}. If this is about a contract, talk to me. If it isn't, be quick.`,
  sable: `Sable Drennick. Charmed.`,
  rook: `Rook Ansel. Mind the barrel, it's loaded.`,
  ember: `Ember Kaldis. I won't shake your hand. I run warm.`,
  aurelian: `Aurelian Sollis, of the Healer's temple. Peace on you.`,
  maelis: `Maelis Dawnwater. Are you hurt anywhere? No? Good.`,
  cassian: `Cassian Thale, sworn to the Healer! Well met!`,
  fenna: `Fenna. And these are the bees. Say hello to the bees.`,
  thessaly: `Thessaly Moonwhisper. Have you seen any doors on your way? Unusual ones?`,
  calder: `Calder Penhallow. Watch your head.`,
  isolde: `Isolde Verran. Don't stand too close to her, she'll have you carrying things.`,
  ptolem: `Ptolem Graves. Step where I step.`,
  rhaza: `Rhaza Sunmane. I lead {team}, and they are thirsty, and so am I.`,
  tarek: `Tarek Vell. Don't worry about the smile, I'm friendly.`,
  zahra: `Zahra Idris. I speak for us at the hall, so if there is a problem, it is my problem.`,
  mott: `Mott. Old Mott, they say. They are right.`,
};

const firstName = (a) => String((a && a.name) || '').split(' ')[0];
/** Old Mott is "Mott" to his friends. */
export function advCallName(a) { return a && ADV_CALL[a.id] ? ADV_CALL[a.id] : firstName(a); }
const ADV_CALL = { mott: 'Mott', bran: 'Bran' };

export function advPronouns(a) {
  return a && a.sex === 'f' ? { he: 'she', He: 'She', him: 'her', his: 'her', hes: "she's", Hes: "She's" }
    : { he: 'he', He: 'He', him: 'him', his: 'his', hes: "he's", Hes: "He's" };
}

// ---------------------------------------------------------------- the record
export function advMet(player, id) { return !!(player && player.advMet && player.advMet[id]); }
export function advKnown(player, id) { return !!(player && player.advKnown && player.advKnown[id]); }
/** First talk: returns true if this was the first time. */
export function advMarkMet(player, id, day = 1) {
  if (!player || !id) return false;
  player.advMet = player.advMet || {};
  if (player.advMet[id]) return false;
  player.advMet[id] = day || 1;
  return true;
}
export function advMarkKnown(player, id) {
  if (!player || !id) return;
  player.advKnown = player.advKnown || {};
  player.advKnown[id] = true;
}

/**
 * A save written before this round has `adv.rel` but no `advMet`: a lone adventurer you had talked to (`solo:<id>`
 * met) is someone you have met. A team unit cannot say which of them you spoke to, so nobody in it is assumed.
 */
export function advMigrateMet(player) {
  if (!player || player.advMet || !player.adv || !player.adv.rel) return;
  player.advMet = {};
  for (const [key, rel] of Object.entries(player.adv.rel)) {
    const [kind, id] = key.split(':');
    if (kind === 'solo' && rel && rel.met && ADV_BY_ID[id]) player.advMet[id] = rel.met;
  }
}

// ------------------------------------------------------------- to your face
/** What they say when you walk up. First person; never their `about`, never an origin tale. */
export function advGreeting({ a, team = null, teamName = '', stance = 'neutral', firstMeet = false } = {}) {
  if (!a) return '';
  const greet = (team && team.greet && team.greet[stance]) || (a.greet && a.greet[stance]) || '';
  if (!firstMeet) return greet || `Good hunting.`;
  const h = ADV_HELLO[a.id];
  let hello = typeof h === 'string' ? h : (h ? (team ? h.team : h.solo) : `${a.name}.`);
  if (!hello) hello = `${a.name}.`;
  hello = hello.split('{team}').join(teamName || 'the team');
  // the stance line after it, without a second "hello" on the front
  const rest = greet.replace(/^(Um, )?(Hello|Hi|Hiya|Afternoon|Mm)[.!,]\s*/i, '');
  return rest ? `${hello} ${rest}` : hello;
}

/** Small talk: their stories that are not origin tales, then their team's. */
export function advSmallTalk(a, team = null) {
  const skip = new Set(ADV_ORIGIN_STORIES[a && a.id] || []);
  return [...((a && a.stories) || []).filter((_, i) => !skip.has(i)), ...((team && team.stories) || [])];
}

/** Their own origin tales, told only once you know the story and ask. */
export function advOriginTales(a) {
  return (ADV_ORIGIN_STORIES[a && a.id] || []).map(i => a.stories[i]).filter(Boolean);
}

// ----------------------------------------------------------------- the desk
/** The people a clerk can tell you about: those you have met. Sorted by name. */
export function advAskList(player) {
  return ADVENTURERS.filter(a => advMet(player, a.id)).sort((x, y) => x.name.localeCompare(y.name)).map(a => a.id);
}

/**
 * The Society's file on someone, read out at the desk: third person, the clerk's voice.
 * `teamName` is the team's generated name if they are in one now (null for a lone adventurer, or a joiner whose
 * team has not formed yet); `dead` is truthy if they did not come home.
 */
export function advClerkTelling(a, { teamName = null, dead = false } = {}) {
  if (!a) return '';
  const pr = advPronouns(a);
  const tid = a.team || (a.early && a.early.joins);
  const team = teamName && tid ? ADV_TEAM_BY_ID[tid] : null;
  const rank = RANK_LABELS[a.rank] || 'Iron';
  const parts = [`${a.name}. Let me find the file.`];
  parts.push(`${rank} rank. ${team ? `${pr.He} ${dead ? 'was' : 'is'} with ${teamName}.` : (dead ? `${pr.He} worked alone.` : `${pr.He} works alone.`)}`);
  parts.push(advSpeakAbout(a, null));
  if (team && team.about) parts.push(`The team: ${team.about}`);
  if (dead) parts.push(`${pr.He} did not come back from the field. The file is closed. The Society keeps it anyway.`);
  return parts.join('\n\n');
}

// ------------------------------------------------------------ from a teammate
/** The teammates `speaker` can tell you about: on the same team, met by you, not the speaker. */
export function advTeammateOptions(player, speaker, team) {
  if (!speaker || !team) return [];
  return team.members.filter(id => id !== speaker.id && ADV_BY_ID[id] && advMet(player, id));
}

/**
 * `about` is the narrator's summary ("A Milrow farmer's son who..."). Spoken by a teammate it wants a subject on
 * the front ("He's a Milrow farmer's son who..."), and wherever it names the speaker, "me".
 */
export function advSpeakAbout(subject, speaker) {
  const pr = advPronouns(subject);
  let s = String((subject && subject.about) || '').trim();
  // the first sentence wants a subject
  if (/^(A|An) /.test(s)) s = `${pr.Hes} ${s[0].toLowerCase()}${s.slice(1)}`;
  else if (/^The [^.]*? for [a-z]+ years\./.test(s)) s = `${pr.Hes} been the ${s.slice(4)}`;
  else if (/^The /.test(s)) s = `${pr.Hes} the ${s.slice(4)}`;
  else if (/^[A-Z][a-z]+'s /.test(s)) s = `${pr.Hes} ${s}`;
  else if (/^(Was|Got|Grew|Ran|Left|Served|Led|Has|Had|Took|Bonded|Joined|Came|Turned)\b/.test(s)) s = `${pr.He} ${s[0].toLowerCase()}${s.slice(1)}`;
  if (speaker) {
    const F = firstName(speaker);
    const rules = [
      [new RegExp(`\\bThinks ${F} is the best person (she|he) has ever met and tells (him|her) so\\b`, 'g'), (m, p1) => `Thinks I'm the best person ${p1} has ever met, and tells me so`],
      [new RegExp(`\\bwhen ${F} was a young (man|woman) and followed (him|her) out of it\\b`, 'g'), (m, p1) => `when I was a young ${p1}, and followed me out of it`],
      [new RegExp(`\\bprotect ${F} from ${F}\\b`, 'g'), () => 'protect me from myself'],
      [new RegExp(`\\bbefore ${F} breaks them\\b`, 'g'), () => 'before I break them'],
      [new RegExp(`\\b${F} and ([A-Z][a-z]+)\\b`, 'g'), (m, x) => `${x} and me`],
      [new RegExp(`\\b([A-Z][a-z]+) and ${F}\\b`, 'g'), (m, x) => `${x} and me`],
      [new RegExp(`(^|[.!?] )${F}'s\\b`, 'g'), (m, p) => `${p}My`],
      [new RegExp(`\\b${F}'s\\b`, 'g'), () => 'my'],
      [new RegExp(`\\b(by|followed|asked|with|for) ${F}\\b`, 'g'), (m, w) => `${w} me`],
      [new RegExp(`\\b${F}\\b`, 'g'), () => 'me'],
    ];
    for (const [re, fn] of rules) s = s.replace(re, fn);
    for (const [re, to] of (PAIR_FIX[`${speaker.id}>${subject.id}`] || [])) s = s.replace(re, to);
  }
  return s;
}

/** The few places where the summary refers to the speaker by a pronoun rather than by name. */
const PAIR_FIX = {
  'hester>orrin': [[/before she led it/, 'before I led it']],
  'tobin>lark': [[/because they were/, 'because we were']],
  'pell>lark': [[/because they were/, 'because we were']],
};

const MATE_CLOSE = {
  disciplined: (pr) => `Good to have at your back.`,
  chaotic: (pr) => `Don't tell ${pr.him} I told you.`,
  new: (pr) => `We'd be lost without ${pr.him}. Well. More lost.`,
};

/** A teammate tells you about one of their own: first person from the speaker, the story from `about`. */
export function advTeammateTelling(subject, speaker, team, { dead = false } = {}) {
  if (!subject) return '';
  const pr = advPronouns(subject);
  const name = advCallName(subject);
  if (dead) return `${name}? ${subject.epitaph || `${name} was one of us.`}`;
  const close = (MATE_CLOSE[team && team.feel] || MATE_CLOSE.disciplined)(pr);
  return `${name}? ${advSpeakAbout(subject, speaker)} ${close}`;
}

