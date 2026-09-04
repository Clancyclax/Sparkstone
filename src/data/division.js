// ============================================================================
// ROUND 66 -- ACT 0, AND THE DIVISION OF ESSENCE RESEARCH.
//
// DESIGN_STORY.md has carried this arc since round 43 and the game has never
// contained a line of it. Round 65's review put the honest number on that: the
// build had the STAGE for every act and the SCRIPT for none, and the four
// story characters -- the two researchers, the Essence Wraith and Rory
// Matheson -- were extracted, animated, loaded, and deliberately left standing
// backstage since round 46 on the principle that "a boss standing in a field
// with nothing to say is worse than no boss".
//
// This file is what gives them something to say.
//
// -------------------------------------------------------------------------
// WHY THE SCRIPT IS DATA AND THE MACHINERY IS NOT
// -------------------------------------------------------------------------
// Round 64 built six objective kinds -- hunt, cull, survey, delve, gather,
// relic -- with target selection, progress hooks, a done test and a turn-in
// path, all asserted. Round 65 proved they carry authored content by running
// 224 god-quest steps through them without a second quest system.
//
// A story stage is the same trick again, with two kinds added that a bounty
// board never needed:
//
//   talk    -- stand in front of a named person and hear them out
//   search  -- find the thing in the room that is not furniture
//
// Both complete on an EVENT rather than on a counter, which is the only real
// difference between a plot and an errand.
//
// -------------------------------------------------------------------------
// WHAT MAKES IT A STORY RATHER THAN SEVEN ERRANDS
// -------------------------------------------------------------------------
// Each stage rewrites what the LAB says. The Department is a chartered
// research house on stage 1 and a crime scene on stage 7, and the way the
// player learns that is by walking back in and finding the same two people
// saying something worse. Nothing is gated on a cutscene; the dialogue is the
// state machine's read-out.
// ============================================================================

// knowledge.js is pure data and imports nothing, so this cannot form a cycle.
import { KNOWLEDGE_BY_ID } from './knowledge.js';

/**
 * ACT 0 -- the waking.
 *
 * DESIGN_STORY.md: "The player wakes in a strange place with no idea how they
 * got there; the last thing they remember is going to bed at home. Knowledge
 * -- the goddess -- speaks into their mind: they have come to Pallimustus as
 * an outworlder, outworlders often have an outsized impact on the world, and
 * Pallimustus is dangerous. She gives a quick grounding in essences and
 * awakening stones and suggests that if they want to survive, they had better
 * get stronger for what is coming."
 *
 * Written as pages rather than a cutscene for two reasons: it reuses the
 * dialogue UI, which is tested, and it is skippable at any page, because the
 * fifteenth time you roll a character you do not want the sermon.
 *
 * `{NAME}` is substituted with the player's name. `{E1} {E2} {E3}` are
 * supported by _act0Text and DELIBERATELY UNUSED -- see the note on the
 * essence page for why naming the player's build back to them was wrong here.
 * The substitution stays because Act 1's dialogue will want it; if it is still
 * unused two rounds from now, delete it rather than leaving a fifth thing in
 * this codebase that is written and read by nothing.
 */
// ===========================================================================
// ROUND 82 -- ACT 0 IS TWO PAGES NOW, AND THEY ARE THE TWO IT ALWAYS WANTED.
//
//   "Instead of knowledge explaining everything to them right away the player
//    is forced to explore."
//
// The eight pages that stood here explained essences, awakening stones,
// confluences and the rank ladder to somebody who could not move yet and would
// not see any of it for an hour. Six of those pages MOVED rather than going:
// they became the sewer's tidbits, fired where the thing they explain was
// about to matter.
//
// ROUND 92 -- and they have moved once more, off the floor tiles and onto the
// events themselves (src/data/knowledge.js). A tile was still a guess about
// what the player had done; picking a thing up is not a guess.
//
// What is left is the two pages that were never exposition: waking up, and the
// hook. The player reads them and then wakes on wet brick in the middle of
// somebody's ritual circle, which does more of Knowledge's old job than
// Knowledge did.
export const ACT0_PAGES = [
  {
    speaker: 'Somewhere behind your eyes',
    text: 'You went to bed.\n\nYou are fairly sure of that much. Your own bed, your own ceiling, '
      + 'the ordinary noise of an ordinary night. You remember deciding to deal with something in the morning.\n\n'
      + 'This is not the morning, and this is not your ceiling.',
  },
  // ROUND 92 -- HER PAGE IS HER FIRST LINE, and there is one copy of it.
  //
  //   "The text of knowledge's introduction needs heavy improvement. It
  //    currently is very overtly AI written and doesn't feel accurate to the
  //    world."
  //
  // What stood here was a narrator describing a voice ("It is the tone of
  // somebody who has read the end of the book") and then quoting two sentences
  // of it. That framing is the problem: it tells the player how to hear her
  // instead of letting her speak, and the simile is exactly the kind of
  // writerly flourish the note is about.
  //
  // She is `waking` in knowledge.js now -- the first entry in the same table
  // that holds every other thing she says -- so her introduction is written in
  // the same voice as her twelfth line rather than in a different one, and
  // there is no second copy of it to drift. `_act0Text` does the `{NAME}`
  // substitution here exactly as it did before.
  {
    speaker: 'Knowledge',
    text: KNOWLEDGE_BY_ID.waking.text,
  },
];

/** The state a run keeps for Act 0. Ordinary player fields, so saves carry
 *  them with no work (see saves.js: the loop copies every player field). */
export const ACT0_FLAG = 'act0Seen';

// ---------------------------------------------------------------------------
// ACT 1 -- THE DIVISION
// ---------------------------------------------------------------------------

/**
 * The lab's staff. `char` is a key in characterManifest.js -- art that has
 * been loaded and unplaced since round 46.
 *
 * `dir` is the director. DESIGN_STORY.md names the breakthrough that flees The
 * Nek as Rory Matheson and has him turn up again in Bratugal as the Act 4
 * boss, so the person the player confronts HERE is his superior, not him:
 * `researcherSenior`, the one who signs the requisitions. Rory is on the
 * premises for exactly one stage, as a junior nobody looks at twice, which is
 * what makes his return four regions later land.
 */
export const DIVISION_STAFF = {
  senior: {
    char: 'researcherSenior', name: 'Director Hallam Vesk',
    role: 'Director, Division of Essence Research',
  },
  junior: {
    char: 'researcherF', name: 'Wren Ashcombe',
    role: 'Research Assistant',
  },
  rory: {
    char: 'rory', name: 'Rory Matheson',
    role: 'Chief Engineer',
  },
  // ROUND 76 (item 8) -- ROB COLLINS, PLACED AT LAST.
  //
  // His art has been loaded and unplaced since round 50 on the same principle
  // the other three were held to: a character with nothing to say does not
  // stand in the world. Act 2 is what he has to say.
  //
  // He is not Division staff. He is filed here because this table is what the
  // chain's `who` resolves against and a second table would be a second thing
  // to keep in step -- and because, from the outside, a man living in a
  // Division building IS one of them, which is the whole question Act 2 asks.
  rob: {
    char: 'robcollins', name: 'Rob Collins',
    role: 'unaccounted for',
  },
};

/**
 * Seven stages. Each is one of:
 *
 *   talk   { who }            -- speak to that staff key, or 'street' for the
 *                               townsfolk rumour round (3 distinct folk)
 *   search { room }           -- find the hidden thing in a room
 *   field  { kind, families } -- an ordinary generated objective, themed
 *   boss   { who }            -- the confrontation
 *
 * `lab` is what the Department says while this stage is current -- the two
 * researchers' lines, keyed by staff. That is the whole state machine the
 * player can see: walk back in, and the room has changed its story.
 */
export const DIVISION_STAGES = [
  {
    id: 'div_rumour',
    title: 'Ask Around',
    kind: 'talk', who: 'street', count: 3,
    brief: 'Cadence keeps talking about the research house on the hill. Find out what it is actually saying.',
    open: 'People keep half-finishing the same sentence about the Department. Finish it for them.',
    done: 'Three versions of one story, and all three end with somebody who stopped coming to work.',
    lab: {
      senior: '"Visitors. Wonderful." Director Vesk does not look up from the ledger. '
        + '"We are a chartered research house, we are entirely above board, and we are extremely busy. '
        + 'Was there something?"',
      junior: '"Oh — hello." She has the look of someone who has been told to be welcoming and is bad at it. '
        + '"We work on essence formation. Where essences come from. Whether they can be made.\n\n'
        + 'It is very exciting. It is."',
    },
  },
  {
    id: 'div_visit',
    title: 'The Department of Essence Development',
    kind: 'talk', who: 'junior',
    brief: 'The Department stands alone in the southeast corner of the city. Go in and ask.',
    open: 'Ask the assistant what the Division actually does.',
    done: 'She answered three questions and flinched at the fourth.',
    lab: {
      senior: '"Back again." The ledger closes. "We force manifestation. That is the work. '
        + 'A coin farm is forced, and nobody writes pamphlets about coin farms.\n\n'
        + 'Ask Ashcombe your questions. She enjoys them."',
      junior: '"Quintessence is the raw material — the thing an essence is made OF. '
        + 'We are trying to persuade it to take a shape.\n\n'
        + 'It works. Sometimes it works." She stops. "You should ask the Director about the intake numbers. '
        + 'I would like to hear him say them out loud."',
    },
  },
  {
    id: 'div_ledger',
    title: 'The Intake Ledger',
    kind: 'search', room: 'division_lab',
    brief: 'Vesk keeps a ledger and does not like it read. Find it.',
    open: 'Search the lab for whatever the Director keeps closing.',
    done: 'Forty-one names went in this season. Nine came out. The other thirty-two have a column of their own.',
    lab: {
      senior: '"You are in here a great deal." No pretence of the ledger now; it is simply gone from the desk. '
        + '"I would remind you that this is a chartered facility and you are a guest in it."',
      junior: 'She will not meet your eye. "I only write down what he gives me.\n\n'
        + 'I want that on the record somewhere. I only ever wrote down what he gave me."',
    },
  },
  {
    id: 'div_missing',
    title: 'The Thirty-Two',
    kind: 'field', kinds: ['survey', 'gather'], families: ['shade'],
    brief: 'Thirty-two people did not come out. Find where the Division puts what is left.',
    open: 'Work the ground outside the city for what the Division leaves behind.',
    done: 'Not graves. The Division does not bury anything, because not all of it stops moving.',
    lab: {
      senior: '"Whatever you think you have found, you have found it on public land, '
        + 'and public land is not my jurisdiction." A pause. "Nor is it your business."',
      junior: '"They come back." She says it flatly, the way you say a thing you have rehearsed. '
        + '"Not as themselves. As the part that was doing the absorbing when it went wrong."',
    },
  },
  {
    id: 'div_wraith',
    title: 'What The Division Makes',
    kind: 'field', kinds: ['cull', 'hunt'], families: ['shade'],
    brief: 'They are called Essence Wraiths. They kill, they absorb what the dead were carrying, '
      + 'and they keep some of it. Put an end to enough of them to be believed.',
    open: 'Put down the wraiths working the ground outside Cadence.',
    done: 'Each one fought like something that had been several people. That is because it had.',
    lab: {
      senior: '"You have been killing my failures." Vesk sounds, for the first time, genuinely interested. '
        + '"Do you know how few people could? That is data. Thank you."',
      junior: '"He wrote your name down." She is packing, badly, into a bag too small. '
        + '"Not as a problem. As a CANDIDATE. Please leave this city."',
    },
  },
  {
    id: 'div_engineer',
    title: 'The Chief Engineer',
    kind: 'talk', who: 'rory',
    brief: 'There is a third person in that building and nobody has introduced him.',
    open: 'Find the engineer nobody mentions.',
    done: 'Rory Matheson. Pleasant, distracted, and the only one in the building who is proud of the work.',
    lab: {
      senior: '"Matheson is an engineer, not an exhibit."',
      junior: '"Do not let him show you the array. He will want to. He has no idea what it is for."',
    },
  },
  {
    id: 'div_confront',
    title: 'The Breakthrough',
    kind: 'boss', who: 'senior',
    brief: 'Vesk has stopped pretending, which means he has stopped needing to. Go and be there when he finishes.',
    open: 'Confront Director Vesk in the Department.',
    done: 'The Division is gone from The Nek — the building emptied overnight, the array taken apart '
      + 'and carried out in pieces. They went west, and west of here is another country.',
    lab: {
      senior: '"You are late, and I am finished." He is not at the ledger. He is at the array. '
        + '"Forty-one names, and one of them worked.\n\n'
        + 'Not you. Do not flatter yourself. Now stand still — I would like to see what you are made of, '
        + 'and I have four of my failures in the next room who will find out for me."',
      junior: 'Ashcombe is not here. Her desk has been cleared to the wood.',
    },
  },

  // ==========================================================================
  // ACT 2 -- ONTARIA. The aperture, the second cell, and Rob Collins.
  // ==========================================================================
  //
  // "Act 2 -- underground (Ontaria) -- NOT BUILT. Needs: the secret aperture to
  // the astral space, the second Division cell, and Rob Collins."
  //
  // WHY IT IS THE SAME CHAIN AND NOT A NEW ONE. Act 1 ends with the Department
  // emptied overnight and carried west, and west of The Nek is Ontaria. That
  // is not a new story, it is the same one arriving somewhere else -- so it is
  // four more stages on `DIVISION_STAGES`, walked by the same state machine,
  // with the same four kinds. A parallel Act-2 chain would have meant a second
  // copy of _divisionStage, _divisionStageDone and _divisionAdvance, and the
  // second copy is where the drift starts.
  //
  // `region` IS THE ONE NEW FIELD, and it exists because Act 1 has a defect
  // this must not inherit: `_divisionRumourFor` has no region gate, so The
  // Nek's "ask around" stage can be completed from townsfolk in Bratugal
  // (STATUS_QUESTS_AND_STORY.md, defect 16). A stage that names a region can
  // only be advanced in it, and Act 1's stages are tagged 'nek' for the same
  // reason -- which closes defect 16 as a side effect of building Act 2 rather
  // than as a separate patch.
  {
    id: 'div2_trail',
    title: 'West of Here Is Another Country',
    kind: 'talk', who: 'street', count: 3, region: 'ontaria',
    brief: 'The Department went west with its array in pieces. Ontaria is west. Ask Harrowmoor what came through.',
    open: 'Ask around Harrowmoor about the carts that came from The Nek.',
    done: 'Three people, three carts, one road -- and it does not go to the port. It goes up the hill.',
    lab: {
      senior: 'The Director is four hundred miles away and does not know you have followed him.',
      junior: 'Wren Ashcombe did not go with them. Whatever is in Ontaria, she is not in it.',
      rob: '"You are a long way from the capital." He says it kindly, and he does not ask why. '
        + '"There is nothing up that hill but a house nobody lives in. I would leave it at that."',
    },
  },
  {
    id: 'div2_house',
    title: 'A Research House on the Hill',
    kind: 'talk', who: 'rob', region: 'ontaria',
    brief: 'There is a man living in a building that is not his, and he is the only one who will say so.',
    open: 'Find whoever is in the house on the hill.',
    done: 'Rob Collins. He was on the intake list. He is the one it worked on.',
    lab: {
      senior: 'The Director is four hundred miles away and still writing to somebody here.',
      junior: 'Ashcombe\'s note said "do not look for me". It did not say do not look for THEM.',
      rob: '"Collins. Rob Collins." He puts down what he is holding. "You have the list, then. '
        + 'Forty-one names.\n\nMine is the one with the tick beside it. They did not tell me what that meant '
        + 'either, and I have had a year to work it out."',
    },
  },
  {
    id: 'div2_aperture',
    title: 'The Tear Behind the House',
    kind: 'search', room: 'division_cell', region: 'ontaria',
    brief: 'Collins will not say what is behind the house. He will not stop you looking, either.',
    open: 'Search the cell for whatever the Division left running.',
    done: 'It is not a door and it is not a spell. It is a hole, and it has been open for a year.',
    lab: {
      senior: 'Vesk built this and then left it open behind him.',
      junior: 'This is what the array was FOR. Not making essences. Making a way through.',
      rob: '"Now you have seen it." He does not look at it. "It does not go anywhere you would want to be. '
        + 'I know because I have been, and I came back, and I am the only one who did."',
    },
  },
  {
    id: 'div2_close',
    title: 'What Came Back Through',
    kind: 'field', kinds: ['cull'], families: ['shade', 'demon', 'skeleton'], region: 'ontaria',
    brief: 'Things have been coming out of it for a year, a few at a time, and Collins has been meeting them alone.',
    open: 'Clear what the aperture has been letting through.',
    done: 'The hill is quiet. The tear is not closed -- nothing here knows how to close it -- but the '
      + 'ground around it is clear for the first time since the carts came, and Collins is not doing it alone.',
    lab: {
      senior: 'Somewhere west of west, the Director is being told the hill went quiet.',
      junior: 'Wren Ashcombe would want to know this. Wherever she is.',
      rob: '"A year." He is sitting down, which you have not seen him do. "A year, and the first time '
        + 'anybody helped was a stranger from The Nek who wanted to look at a hole.\n\n'
        + 'I am coming with you. Do not argue -- you have seen what I am, and you came anyway."',
    },
  },
];

/**
 * ROUND 76 (item 8) -- WHICH REGION A STAGE BELONGS TO.
 *
 * Act 1 is The Nek and Act 2 is Ontaria. Stages carry `region` from Act 2
 * onward and Act 1's are answered here rather than by editing seven objects,
 * because Act 1's region was never in question -- what was missing is a place
 * to ASK, which is defect 16 ("`_divisionRumourFor` has no region gate: you
 * can complete The Nek's ask-around stage from townsfolk in Bratugal").
 */
export function stageRegion(stage) {
  return (stage && stage.region) || 'nek';
}

/** Is the player standing where this stage can be advanced? */
export function stageInRegion(stage, regionId) {
  return !stage || !regionId || stageRegion(stage) === regionId;
}

/** Where Act 2 begins, so a suite can pin the seam without counting stages. */
export const ACT2_FIRST = 'div2_trail';

/** After the confrontation. The Department stands empty and says so. */
export const DIVISION_EMPTY = {
  senior: 'The Director\'s desk is bare. Someone burned the ledger in the grate and did not stay to watch it.',
  junior: 'A note, in a hurried hand: "I am not going with them. Do not look for me. — W.A."',
};

export const DIVISION_FLAG = 'divisionStage';
export const DIVISION_DONE = DIVISION_STAGES.length;

/** How many wraiths the boss stage puts in the room. */
export const CONFRONT_WRAITHS = 4;

/** The rumour lines, one per townsperson, for stage 1. Three DISTINCT people
 *  have to be heard, so there are more lines than are needed in one run. */
/**
 * ROUND 76 (item 8) -- ONTARIA'S rumours, for Act 2's ask-around stage.
 *
 * Kept apart from The Nek's rather than pooled: the two stages ask different
 * questions in different places, and a Harrowmoor fisherman repeating "my
 * cousin took their intake test" would be the region gate working and the
 * WRITING not.
 */
export const DIVISION_RUMOURS_ONTARIA = [
  'Three carts up the coast road in one week, all of them heavy, none of them stopping at the port.',
  'They bought the old house on the hill outright. Paid in Nek bronze and never moved anyone in.',
  'There is a light up there some nights. Not a lamp. Lamps do not do that.',
  'A man walks down for supplies and walks back up. Never says which of them he works for.',
  'My boy went up to see. He came back the same evening and he has not been up since.',
  'Whatever they carried in, they carried it in pieces. Whatever it is now, it is not in pieces.',
];

export const DIVISION_RUMOURS = [
  'The research house pays in bronze and asks no questions about where you slept last week. Draw your own conclusion.',
  'My cousin took their intake test. Passed it, she said. That was in spring.',
  'They advertise for volunteers. Volunteers. For what, exactly? Nobody ever says.',
  'A cart goes up there at night and comes back lighter. I have stopped counting.',
  'Chartered by the city, mind. Whatever they are doing, someone signed for it.',
  'I used to drink with a man who swept their floors. He does not drink anywhere now.',
];

/** The stage the player is on, clamped. */
export function divisionStage(player) {
  const n = (player && player[DIVISION_FLAG]) || 0;
  return Math.max(0, Math.min(DIVISION_DONE, n));
}

export function divisionCurrent(player) {
  const n = divisionStage(player);
  return n < DIVISION_DONE ? DIVISION_STAGES[n] : null;
}

/** What a member of staff says right now. Falls back to the empty building. */
export function labLine(player, staffKey) {
  const st = divisionCurrent(player);
  if (!st) return DIVISION_EMPTY[staffKey] || DIVISION_EMPTY.senior;
  return (st.lab && st.lab[staffKey]) || '';
}

/**
 * Faults a suite can assert on, in the shape round 64 and 65 used: every check
 * that can be made without booting the game, made here once.
 */
export function divisionFaults() {
  const out = [];
  const seen = new Set();
  for (const s of DIVISION_STAGES) {
    if (seen.has(s.id)) out.push(`duplicate stage id ${s.id}`);
    seen.add(s.id);
    for (const f of ['title', 'brief', 'open', 'done']) {
      if (!s[f]) out.push(`${s.id} missing ${f}`);
    }
    if (!['talk', 'search', 'field', 'boss'].includes(s.kind)) {
      out.push(`${s.id} unknown kind ${s.kind}`);
    }
    if (s.kind === 'talk' && !s.who) out.push(`${s.id} talk with no who`);
    if (s.kind === 'boss' && !s.who) out.push(`${s.id} boss with no who`);
    if (s.kind === 'search' && !s.room) out.push(`${s.id} search with no room`);
    if (s.kind === 'field' && !(s.kinds || []).length) out.push(`${s.id} field with no kinds`);
    // Every stage must give BOTH researchers something to say, or walking back
    // into the lab mid-chain produces an empty dialogue box.
    for (const k of ['senior', 'junior']) {
      if (!s.lab || !s.lab[k]) out.push(`${s.id} lab line missing for ${k}`);
    }
    // ROUND 76 -- and ROB has to have something to say in every Act 2 stage,
    // for exactly the reason the two researchers do: he is the person standing
    // in the room those stages happen in, and a player who walks back into the
    // cell mid-chain would otherwise open an empty dialogue box.
    if (stageRegion(s) === 'ontaria' && (!s.lab || !s.lab.rob)) {
      out.push(`${s.id} is an Ontaria stage with no line for rob`);
    }
    if (s.region && !['nek', 'ontaria', 'elehyd', 'bratugal'].includes(s.region)) {
      out.push(`${s.id} names unknown region ${s.region}`);
    }
    if (s.who && s.who !== 'street' && !DIVISION_STAFF[s.who]) {
      out.push(`${s.id} names unknown staff ${s.who}`);
    }
  }
  // ROUND 76 -- the acts must not interleave. A chain that ran nek, ontaria,
  // nek would send the player back and forth across the world between two
  // consecutive stages, and the region gate would read as a bug.
  const regions = DIVISION_STAGES.map(stageRegion);
  for (let i = 1; i < regions.length; i++) {
    if (regions[i] === regions[i - 1]) continue;
    if (regions.slice(0, i).includes(regions[i])) out.push(`chain returns to ${regions[i]} at stage ${i}`);
  }
  if (DIVISION_RUMOURS_ONTARIA.length < 3) out.push('not enough Ontaria rumours to hear three');
  // ROUND 88 -- THIS RULE HAS BEEN REPORTING A FAULT SINCE ROUND 82, AND THE
  // FAULT WAS THIS RULE.
  //
  // Act 0 was eight pages when the rule was written. In round 82 the user
  // asked for it to be trimmed to a cold open -- "Trim to a cold open" -- and
  // it became the two pages above, deliberately: you wake, Knowledge tells you
  // to follow the water, and the prologue starts. Nothing updated the
  // validator, so `divisionFaults()` has returned `['act 0 is too short to be
  // an act']` on every run for six rounds, and three suites have been failing
  // on it (round 66 twice, round 76e, and round 82's own page check).
  //
  // A validator that reports a fault nobody intends to fix is worse than no
  // validator: the estate learns to read `divisionFaults()` as "one known
  // moan", and the next real fault it catches arrives in a list people have
  // stopped believing. The floor is TWO now, which is the shape the cold open
  // actually has, and the check keeps its point -- an Act 0 of one page is a
  // line, not an opening, and an empty one would sail past a `.length` test
  // that only looked for a lower bound of zero.
  if (ACT0_PAGES.length < 2) out.push('act 0 is too short to be a cold open');
  // ...and an upper bound, which is the half the original rule was missing.
  // "Trim to a cold open" is a promise about brevity, and a promise about
  // brevity is exactly the kind that erodes one well-meant page at a time.
  if (ACT0_PAGES.length > 3) out.push('act 0 has grown back out of a cold open');
  for (const p of ACT0_PAGES) {
    if (!p.speaker || !p.text) out.push('act 0 page missing speaker or text');
  }
  if (DIVISION_RUMOURS.length < 3) out.push('not enough rumours to hear three');
  return out;
}
