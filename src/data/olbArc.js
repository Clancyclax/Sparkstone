// ============================================================================
// ROUND 314 -- OLB NIKOBE: THE FIRST STORY ARC.
//
// THE USER (the whole of it, kept in ROUND313_NOTES.md; the part this file
// builds is 4 through 4.1.4):
//
//   "4) Learn meditation and aura control through a trainer
//    4.1) Trainer needs to become a story character named Olb, Nikobe and after
//         joining the adventure society the first story arc is with Olb.
//    4.1.1) Trainer will help the player with their first quests and explaining
//           the world to the player
//    4.1.2) Initially teaching combat and looting. Guiding the player to having
//           a weapon crafted.
//    4.1.3) Then teaching about skill books and rituals
//    4.1.4) finally teaching meditation and aura control"
//
// (4.1.5 on -- the hunt, the astral aperture and the Destruction cult -- is the
// next round's file, `olbHunt.js`.)
//
// THE SHAPE. Olb is the Aura-Adept who has stood by the shrine in the Cadence
// hall since round 121, promoted to a person. The arc is a short ladder of
// LESSONS. Each lesson has three beats, and the player is only ever in one:
//
//   brief   -- Olb has the next lesson. Talk to him; he teaches, and sets a task.
//   doing   -- the task is live. The tracker beside the minimap says what it is.
//   report  -- the task is done. Go back; he answers it, pays it, and (in the
//              same conversation, so nobody walks the hall twice) begins the
//              next lesson.
//
// A TASK IS A REAL THING THE GAME ALREADY DOES, not a new minigame: take a
// notice from the board, kill and loot, have a weapon commissioned at a bench,
// read a book, sit and meditate, pull the aura in and let it out. Each is
// recognised by a hook in the scene at the place the game already knows it
// happened (see olbMixin.js), and the arc keeps only counters.
//
// WHY A MENTOR'S WORDS ARE LONG. The user asked that he explain the world, and a
// world explained in one line is not explained. But nothing here is a lecture
// the player has to pass: every page is skippable with one press, and the whole
// of the first conversation is five pages.
// ============================================================================

export const OLB_NAME = 'Olb Nikobe';
export const OLB_FLAG = 'olb';

/** The lessons, in order. `brief` pages are what he says when he gives the
 *  task; `done` pages are what he says when it is handed in. Tokens in {braces}
 *  are filled with the player's own control labels at the moment of reading. */
export const OLB_STAGES = [
  {
    id: 'meet', title: 'Meet Olb Nikobe', task: 'Talk to Olb Nikobe in the Society hall.',
    brief: [
      `So you are the one the desk flagged. An outworlder, aye? Do not look so surprised; you stand like somebody who learned on flat floors. Olb Nikobe. The Society pays me to keep new names alive long enough to become somebody else's problem.`,
      `Here is the world, quickly. It is wide, and most of it wants to eat you. The thing that eats is a monster, and a monster is a hunger that grew a body. Kill one and you get what it was built from, and a little of what it was. That little is quintessence, and nearly everything worth having is made out of it.`,
      `Almost everyone alive is Normal. Then an essence is set in a person, an awakening stone gives it a shape, and they begin to climb: Iron, Bronze, Silver, Gold, and Diamond for the few who live and are stubborn and lucky. Do not read a rank as a number. Read it as the size of the room you can stand in.`,
      `The Society is the paper the world runs on, for people like us. A contract on the board is somewhere to be hurt that pays. Stars are how it counts whether you can be trusted with the next one. And it pays in spirit coins, every rank worth a hundred of the one under it. Spend the small ones. Hoard nothing you cannot carry out.`,
      `So, lessons, in the order that keeps people alive. Fighting and looting. A weapon made for you. What a book can give you. Then the quiet things: meditation, and your aura. When you can do all of that I will take you on a hunt. Start with the board. Go and take a notice, any notice. I want to see you pick one and not stand there.`,
    ],
    done: [],
    reward: null,
  },
  {
    id: 'board', title: 'Take a notice', task: 'Take a notice from the quest board.',
    brief: [],
    done: [
      `Good. You picked, and it was not the one that would have killed you. Most people stand there until the ink dries. Keep that notice. We will make you able to finish it.`,
    ],
    reward: null,
  },
  {
    id: 'combat', title: 'Fight and loot', task: 'Kill three monsters outside the walls, and loot at least one.',
    brief: [
      `Fighting. The hand buttons swing what you are holding, and your abilities are on the number keys. Stamina pays for swings, mana pays for spells, health is the one you cannot spend twice. Keep moving. The ones who stand still are the ones I bury. And sprinting is a toggle: press {sprint} once to run and once to stop. It eats stamina, so it is for going somewhere, not for fighting.`,
      `And when it is dead, loot it. Stand over the body and press {interact}. A body gives you parts and coin and, now and then, something somebody else lost. Do it quickly. They go off, and not politely.`,
      `Go out past the walls and kill three things. Loot at least one. Then come back and tell me what it was like.`,
    ],
    done: [
      `You are not dead. That is the first lesson, and the one most people fail. Here is a little for the walk back; the Society does not pay for heroics, but I do not mind paying for competence.`,
    ],
    reward: { iron: 3 },
  },
  {
    id: 'weapon', title: 'A weapon made for you', task: 'Have a weapon commissioned at a smithy bench.',
    brief: [
      `What you carry was made by someone else for someone else. A smith can do better: stock, a core and some quintessence go in, and a weapon with your name on it comes out, with a little of what the quintessence was in it too.`,
      `I have put a kit in your pack: metal, a core, a quintessence, and the coin for the fee. Go to the smithy, open the bench, pick a frame, a stock, a core and a quintessence, and have a weapon made. Then come back and show me.`,
    ],
    done: [
      `Hm. Better than what you came in with, and made for your hand. Keep the kit's habits: parts and stock are not rubbish, they are a weapon you have not had made yet.`,
    ],
    reward: null,
  },
  {
    id: 'books', title: 'Read a book', task: 'Read the skill book Olb gave you.',
    brief: [
      `Books. They are not for decoration. A primer teaches a weapon you can already lift to be dangerous with it. A manual teaches a martial art, and a body follows one martial art, ever, so choose slowly. And there are the crafts: herbalism, mining, cooking, ritual. Read one and it is yours, and the book is spent.`,
      `Here is a primer for the weapon you just had made. Open your pack, find it under Inventory, and read it.`,
    ],
    done: [
      `There. That is how a thing goes from a thing you hold to a thing you know. Now the other half, because the Society keeps quiet about it and a good many fools have died of it: rituals.`,
      `A ritual is a long, uninterrupted casting. You do not move. Nobody hits you. When it is done it costs most of what you have, and in return it can do what no spell can: bring forth a familiar, set a feast, change the ground. Only a rare pairing of essence and stone offers one, and nothing works until you have read the Ritual Magic book. They keep one on the market shelf some days, at a hundred iron. Do not buy it until you have eaten well and have a day to spare.`,
    ],
    reward: null,
  },
  {
    id: 'meditate', title: 'Meditation', task: 'Sit and meditate for a few breaths.',
    brief: [
      `Now the quiet ones. This is the part nobody wants to learn and everybody who lives past Iron has. Fighting fills a pool of experience, but it sits there loose, and if you die, it is gone. Meditation is how you bank it: you sit, you let what you have done settle into the essences, and rank comes from the sitting, not the swinging.`,
      `The key is {meditate}. Not out in the open, where something can hear you breathe: in a town. Do it now, here, and sit until it settles. A few breaths will do.`,
    ],
    done: [
      `Feels like nothing, does it? That is how you know it is working. Do it every time you come back from the field. A fighter who never sits is a fighter who never climbs.`,
    ],
    reward: null,
  },
  {
    id: 'aura', title: 'Aura control', task: 'Pull your aura in with {aura}, and let it out again.',
    brief: [
      `Last of the quiet things. Your aura. Everybody has one, and you are leaking yours into this room like a cheese in a warm cellar. An aura is a field you wear: allies feel it, enemies feel it, anything with a nose for it feels it. Projecting it all day is sloppy and second rate. It announces you, it tires you, and it tells anyone worth fearing exactly where you are.`,
      `Pull it in with {aura}. Let it out the same way. Do it now, and again, until it is yours and not something that happens to you.`,
    ],
    done: [
      `Good. Hold it in when you walk through a town. Let it out when you fight. The adepts in the other halls will say the same to you, and I said it first.`,
    ],
    reward: null,
  },
  {
    id: 'hunt', title: 'The hunt', task: 'Tell Olb when you are ready for the hunt.',
    brief: [
      `That is everything I can teach you in a hall. The rest is learned out there, with something trying to kill you, which is the only teacher that has never been wrong.`,
      `There is a nest east of the walls the Society wants thinned. Simple work, you and me. Rest. Bank what you have. Come and find me when you are ready.`,
    ],
    done: [],
    reward: null,
    // the next round's door: the hunt itself
    open: true,
  },
];
export const OLB_STAGE_BY_ID = Object.fromEntries(OLB_STAGES.map(s => [s.id, s]));
export const OLB_STAGE_IDS = OLB_STAGES.map(s => s.id);

/** How many kills the combat lesson asks for. */
export const OLB_KILLS = 3;
/** Seconds of meditation the lesson asks for. */
export const OLB_MEDITATE_S = 6;
/** Presses of the aura toggle: in, then out. */
export const OLB_AURA_TOGGLES = 2;

/** The kit he hands over with the weapon lesson. Counted in the scene against
 *  whatever the bench actually charges for a normal-rank commission. */
export const OLB_KIT = { stock: 4, cores: 6, quints: 3, coins: 200 };

/** What he says to an unregistered applicant, and while a lesson is live. */
export const OLB_UNREGISTERED = [
  `Not on the books yet, are you? The desk is just there. Put your name down, and come and find me after. I do not teach strangers; the Society does not pay me for them.`,
];
export const OLB_BUSY = {
  board: `The board is on the wall. Take a notice. Any one will do.`,
  combat: `Three kills outside the walls, and loot at least one. Come back when that is done.`,
  weapon: `The smithy has the bench. The kit is in your pack. Stock, core, quintessence, and a frame.`,
  books: `The book is in your pack. Inventory. Read it.`,
  meditate: `Sit. {meditate}. In a town, not in a field.`,
  aura: `{aura}. In and then out. Until it is yours.`,
  hunt: `Rest, bank what you have, and come find me when you are ready.`,
};
/** After the arc: what he says when you just talk. */
export const OLB_IDLE = [
  `Still holding it in? Good. You would be surprised how many go back to leaking the moment nobody is watching.`,
  `Sit when you get back from the field. Every time. It is the only advice I have ever given that nobody has regretted taking.`,
  `If you see a nest, do not go into it alone. That is the second lesson, and I will teach it when we have the time.`,
];

export function newOlb() {
  return { stage: 'meet', phase: 'brief', kills: 0, looted: 0, medS: 0, auraToggles: 0, done: [], tookKit: false, gaveBook: null };
}

/** The stage record after `id`, or null at the end. */
export function olbNextStage(id) {
  const i = OLB_STAGE_IDS.indexOf(id);
  return i >= 0 && i + 1 < OLB_STAGES.length ? OLB_STAGES[i + 1] : null;
}

/** Faults: every stage reads from a complete record. */
export function olbFaults() {
  const out = [];
  OLB_STAGES.forEach((s, i) => {
    if (!s.id || !s.title || !s.task) out.push(`stage ${i}: id/title/task`);
    if (!Array.isArray(s.brief) || !Array.isArray(s.done)) out.push(`${s.id}: brief/done must be arrays`);
    for (const t of [...s.brief, ...s.done]) if (typeof t !== 'string' || t.length < 20) out.push(`${s.id}: a page is too short`);
    if (s.id !== 'hunt' && s.id !== 'meet' && s.id !== 'board' && !s.brief.length) out.push(`${s.id}: no brief`);
  });
  if (new Set(OLB_STAGE_IDS).size !== OLB_STAGE_IDS.length) out.push('duplicate stage id');
  return out;
}
