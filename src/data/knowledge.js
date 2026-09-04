// ===========================================================================
// ROUND 92 -- KNOWLEDGE, IN HER OWN VOICE, ON HER OWN TRIGGERS.
//
//   "The text of knowledge's introduction needs heavy improvement. It
//    currently is very overtly AI written and doesn't feel accurate to the
//    world."
//
//   "The pacing of knowledges advice doesn't make sense. After improving the
//    text itself the triggers need to be relevant to the information."
//
//   "Review how knowledge is written within the books. Generally as a 'she',
//    slightly humorous, but patient and helpful."
//
// ---------------------------------------------------------------------------
// SHE, FIRST OF ALL
// ---------------------------------------------------------------------------
//
// DESIGN_STORY.md has had it right since the beginning -- "Knowledge -- the
// goddess -- speaks into their mind" -- and round 82's sewer file wrote the
// character note as "He is a god explaining something obvious to someone who
// has just died", which is wrong twice over. She is not explaining something
// obvious and she is not contemptuous about it. Every reference in the code is
// hers now.
//
// ---------------------------------------------------------------------------
// WHAT WAS ACTUALLY WRONG WITH THE OLD TEXT
// ---------------------------------------------------------------------------
//
// Naming it precisely, because "sounds AI-written" is a symptom and the cause
// is a set of habits that can be avoided deliberately:
//
//   * IT ENDED EVERY BEAT ON AN APHORISM. "That is the whole system.
//     Everything else is arithmetic." / "People die holding full flasks. Do
//     not be one." Six lines, six punchlines. Nobody talks like that; it is
//     the rhythm of a pull quote, and six in a row reads as a machine that has
//     learned the shape of an ending.
//   * IT WAS CLIPPED TO THE POINT OF COLDNESS. "Armour is armour. Put it on."
//     was written to sound laconic and lands as bored. The brief is patient.
//   * IT WAS FUNNY AT THE PLAYER'S EXPENSE. "it is holding a weapon because
//     you had the sense to pick one up, or it is not because you did not" is a
//     joke about the player being stupid, delivered before they have done
//     anything.
//   * IT EXPLAINED SYSTEMS RATHER THAN THINGS. "Sixteen sockets. Twenty
//     abilities, once the innate ones are counted." A goddess does not have a
//     feature list.
//
// So: she is warm, she is unhurried, her humour is dry and aimed at the
// situation rather than at the player, and she describes what is true about
// the world rather than what is true about the interface. She likes this
// person. She is not worried, which is itself reassuring.
//
// ---------------------------------------------------------------------------
// AND THE TRIGGERS ARE EVENTS, NOT FLOOR TILES
// ---------------------------------------------------------------------------
//
// Round 82 fired six tidbits by walking onto six marked tiles, and it was a
// real improvement on Act 0's eight pages of exposition -- the potion line was
// beside a potion. But a tile is a guess about what the player has done, and
// the guesses were wrong in both directions: the essence lecture fired on a
// tile whether or not the player had ever seen an essence (they had not -- the
// sewer's 'e' marks are STONES, and the first essence in the game is the
// cultist's drop, two chambers later), and a player who picked up a sword in
// a dead end got the attack lecture whenever they wandered back onto the path.
//
// The ask replaces the guess with the thing itself:
//
//     "2.1.1) Picking up a weapon      2.1.4) Picking up an awakening stone
//      2.1.2) Picking up quintessence  2.1.5) Killing a monster
//      2.1.3) Picking up an essence    2.1.6) firsts in general, waking up,
//                                             escaping the sewer, encountering
//                                             the cultist."
//
// Every line below hangs off something the player DID, and fires the first
// time they ever do it. That makes the pacing correct by construction rather
// than by placement: the essence line cannot fire before there is an essence,
// because an essence being picked up is what fires it.
//
// FOR THE WHOLE GAME, not just the prologue -- which the ask settles by
// including quintessence. Quintessence comes off a kill (`_dropLootFromKill`
// rolls it on every monster in the game, sewer slimes included) and cores come
// off every monster guaranteed, so both CAN land down there; but a player who
// misses them in the sewer should still be told what they are the first time
// they see one, whether that is on hour one or hour six.
//
// ONE LINE EACH, ONCE EVER. `player.knowledgeSaid` is an array of ids and an
// ordinary player field, so saves.js carries it with no work at all (its loop
// copies every player field, and an array survives `plain()`). A god who
// repeats herself is a tutorial pop-up.
// ===========================================================================

/** The player field. An array rather than a Set so a save round-trips it. */
export const KNOWLEDGE_FLAG = 'knowledgeSaid';

/**
 * Every first she speaks on.
 *
 * `id`      the flag stored in `player.knowledgeSaid`
 * `when`    a human sentence naming the moment -- printed by the suite, so a
 *           line whose trigger nobody can describe is visible as one
 * `text`    what she says
 * `sewer`   true if this one can only happen underground (used only to order
 *           the table readably; nothing gates on it)
 *
 * ORDER IS THE ORDER SHE EXPECTS THEM IN, not the order they must happen in.
 * A player can pick up a stone before a weapon and the table does not care.
 */
export const KNOWLEDGE_FIRSTS = [
  {
    id: 'waking', sewer: true,
    when: 'the player wakes in the ritual circle',
    text: 'You are awake. Good — and you are welcome, though I would have '
      + 'preferred to greet you somewhere with a floor.\n\n'
      + 'You are whole, which is more than anyone else in this room managed, '
      + 'and considerably more than I expected when I felt you arrive. Take a '
      + 'moment. Nothing down here is in a hurry except the water.\n\n'
      + 'When you are ready to stand, I will explain as we go, {NAME}. It is '
      + 'easier when there is something in front of us to point at.',
  },
  {
    id: 'weapon', sewer: false,
    when: 'the first weapon is picked up',
    text: 'Yes, take that. You will want it.\n\n'
      + 'One hand each, and each hand swings on its own, so you may hold two '
      + 'and use both. There is nothing subtle in it yet — you put the sharp '
      + 'part into the thing until the thing stops arguing.\n\n'
      + 'The subtlety comes later, and I think you are going to enjoy it a '
      + 'great deal more than this.',
  },
  {
    id: 'kill', sewer: false,
    when: 'the first monster the player kills',
    text: 'There. Not so complicated.\n\n'
      + 'Everything alive here is held together by magic, and that one is not '
      + 'holding together any more, so what it was made of has nowhere to be. '
      + 'A little of it settles into things solid enough to pick up. The rest '
      + 'goes wherever it goes; I have never found that question interesting.\n\n'
      + 'Do look at what it left. Down here, what a thing leaves is most of '
      + 'the reason to have fought it.',
  },
  {
    id: 'gear', sewer: false,
    when: 'the first piece of armour is picked up',
    text: 'Put that on, and be glad it was down here.\n\n'
      + 'It will turn a blade. It will not turn fire, and a great many '
      + 'confident people have discovered the second half of that sentence '
      + 'some time after it would have been useful. Armour is a wager about '
      + 'what is coming for you.\n\n'
      + 'It also changes how you look, which I mention because you will '
      + 'shortly walk into a city that decides a great deal about a person on '
      + 'exactly that basis.',
  },
  {
    id: 'consumable', sewer: false,
    when: 'the first potion or other consumable is picked up',
    text: 'Take it — and then do not drink it.\n\n'
      + 'Not out of thrift. Because the moment you want it most is never this '
      + 'one. It sits in a slot and comes out on a key, and afterwards there '
      + 'is a wait before you may have another. The wait is the number worth '
      + 'knowing. The healing is only healing.\n\n'
      + 'People die with full flasks on their belts more often than you would '
      + 'credit. I would rather you did not; the conversation afterwards is '
      + 'always so awkward.',
  },
  {
    id: 'stone', sewer: false,
    when: 'the first awakening stone is picked up',
    text: 'An awakening stone — and you have found one before you have '
      + 'anywhere to put it, which is very much the order things happen in.\n\n'
      + 'Keep it. Once an essence is bonded to you, a stone goes into it and '
      + 'something wakes: one ability, decided by the pair of them together. '
      + 'The same stone in another person would wake something else entirely, '
      + 'because half of the answer is always the person.\n\n'
      + 'Four will fit in each essence. You will run short of stones long '
      + 'before you run short of places to put them; everyone does.',
  },
  {
    id: 'essence', sewer: false,
    when: 'the first essence is picked up',
    text: 'Now that is an essence, and very nearly everything in this world is '
      + 'built out of those.\n\n'
      + 'You absorb it and it does not come back out, so do think before you '
      + 'do. Three will bond to you, and when the third settles a fourth forms '
      + 'on its own out of whatever the three of them make between them. That '
      + 'one is called a confluence, and nobody chooses it. Not you, and — '
      + 'before you ask — not me either.\n\n'
      + 'Choose your three with care. You are choosing the fourth at the same '
      + 'time, whether or not you mean to.',
  },
  {
    id: 'quintessence', sewer: false,
    when: 'the first quintessence is picked up',
    text: 'Quintessence. That is what the creature was made of, before '
      + 'anything made it into a creature.\n\n'
      + 'It is not a power and it will do nothing in your pocket. It is '
      + 'material: someone who knows the work can put it into a piece of gear '
      + 'and decide what that gear does, and the essence it came from is what '
      + 'makes the decision. Fire quintessence argues for fire.\n\n'
      + 'There are people in the city who do that work and will be pleased to '
      + 'see you carrying it.',
  },
  {
    id: 'core', sewer: false,
    when: 'the first monster core is picked up',
    text: 'A core. That is the knot the creature was tied in, and it stayed '
      + 'knotted after the rest of it came undone.\n\n'
      + 'Every monster leaves one, and its rank is the monster\'s rank. When '
      + 'something is made, the core is what sets how fine a thing it is '
      + 'allowed to be — which is why a crafter will ask what you have been '
      + 'killing before asking what you would like.\n\n'
      + 'Better cores come from worse neighbourhoods. I am sure you will '
      + 'manage.',
  },
  {
    id: 'cultist', sewer: true,
    when: 'the player first sees the cultist in the last chamber',
    text: 'Gently, now.\n\n'
      + 'That one is breathing, and he was down here a good while before you '
      + 'were. Whatever was done in the circle you woke in, he had hold of the '
      + 'other end of it.\n\n'
      + 'He is in a poor way. That is in your favour, and I would not lean on '
      + 'it any harder than you must.',
  },
  {
    id: 'surface', sewer: false,
    when: 'the player climbs out of the sewer for the first time',
    text: 'Out. Well done — I did wonder, once or twice.\n\n'
      + 'This is Cadence, which is a city in the Nek, which is a country on a '
      + 'world called Pallimustus. You have not been to any of those before, '
      + 'and everyone you meet is going to work that out inside four words. '
      + 'There is no hiding it, so do not tire yourself trying.\n\n'
      + 'There is a guild here that pays people to go out and kill monsters. '
      + 'Given how you have spent your morning, I expect you will find the '
      + 'interview straightforward.',
  },
  {
    id: 'confluence', sewer: false,
    when: 'the confluence forms for the first time',
    text: 'There it is. Your fourth.\n\n'
      + 'I did say nobody chooses it. What I did not say is that it is usually '
      + 'the one a person ends up known for — it is the only part of you that '
      + 'came from all three of the others agreeing about something.\n\n'
      + 'Go and see what it has given you. I would like to know as well.',
  },
];

/** By id, for the one lookup the scene does. */
export const KNOWLEDGE_BY_ID = Object.fromEntries(KNOWLEDGE_FIRSTS.map(k => [k.id, k]));

/** Has she said this one to this character yet? */
export function knowledgeSaid(player, id) {
  return !!(player && Array.isArray(player[KNOWLEDGE_FLAG]) && player[KNOWLEDGE_FLAG].includes(id));
}

/** Mark it said. Returns false if it already was, so the caller can use this
 *  as the "should I open a dialogue" test and the record in one step. */
export function markKnowledgeSaid(player, id) {
  if (!player) return false;
  if (!Array.isArray(player[KNOWLEDGE_FLAG])) player[KNOWLEDGE_FLAG] = [];
  if (player[KNOWLEDGE_FLAG].includes(id)) return false;
  player[KNOWLEDGE_FLAG].push(id);
  return true;
}

/**
 * The table checked against itself.
 *
 * WHAT THIS IS FOR. The failure mode of a table of prose is not that it throws
 * -- it is that a line is unreachable, or duplicated, or quietly still carries
 * the habits the round was written to remove. The first two are mechanical and
 * are checked here. The third is checked as far as it can be: the aphorism
 * habit had a measurable signature (six beats, six one-sentence closing
 * paragraphs), so that shape is refused outright. It would have failed every
 * one of round 82's six lines.
 */
export function knowledgeFaults() {
  const out = [];
  const seen = new Set();
  for (const k of KNOWLEDGE_FIRSTS) {
    if (!k.id) { out.push('a first with no id'); continue; }
    if (seen.has(k.id)) out.push(`two firsts share the id '${k.id}'`);
    seen.add(k.id);
    if (!k.when || k.when.length < 12) out.push(`'${k.id}' does not say when it fires`);
    if (!k.text || k.text.length < 120) out.push(`'${k.id}' is too short to be a scene`);
    if (k.text && k.text.length > 900) out.push(`'${k.id}' is longer than anyone will read`);
    // She speaks in paragraphs, not in headlines.
    const paras = (k.text || '').split('\n\n').filter(Boolean);
    if (paras.length < 2) out.push(`'${k.id}' is a single paragraph`);
    // THE APHORISM CHECK, and it is MEASURED rather than asserted.
    //
    // The first version of this also demanded the closing paragraph be a
    // single sentence, which sounded right and caught exactly one of round
    // 82's six lines -- because "You have none yet. You will." and "People die
    // holding full flasks. Do not be one." are two sentences each and are the
    // purest examples of the habit in the file. An assertion that does not
    // fire on the thing it was written about is decoration.
    //
    // What actually separates them is LENGTH. Round 82's closing paragraphs
    // measured 28, 43, 46, 50, 56 and 267 characters; the twelve below measure
    // 63 to 160. Sixty splits those two populations cleanly and is not a
    // number chosen to make this pass -- it catches five of round 82's six.
    const punchy = KNOWLEDGE_FIRSTS.filter((x) => {
      const ps = (x.text || '').split('\n\n').filter(Boolean);
      return (ps[ps.length - 1] || '').length < 60;
    });
    if (punchy.length > 2) {
      out.push(`${punchy.length} lines end on a flourish shorter than a breath `
        + `(${punchy.map(x => x.id).join(', ')}) -- that is the habit, not a choice`);
      break;
    }
  }
  // Every trigger the scene knows how to fire must have a line, and every line
  // must have a trigger something actually raises. The list is duplicated here
  // deliberately: if WorldScene stops raising one, this says so.
  const RAISED = ['waking', 'weapon', 'kill', 'gear', 'consumable', 'stone', 'essence',
                  'quintessence', 'core', 'cultist', 'surface', 'confluence'];
  for (const id of RAISED) if (!seen.has(id)) out.push(`nothing to say on '${id}'`);
  for (const id of seen) if (!RAISED.includes(id)) out.push(`'${id}' is never fired`);
  return out;
}
