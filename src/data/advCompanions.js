// ============================================================================
// ROUND 374 -- THE OTHER ADVENTURERS, AS PEOPLE YOU CAN LEAD.
// ROUND 375 -- REWORKED: LOYALTY, EARNED AND RETURNED.
//
//   "Men are driven by two principal impulses, either by love or by fear."
//   "Love endures by a bond which men, being scoundrels, may break whenever it serves their advantage to do so; but fear
//    is supported by the dread of pain, which is ever present."  -- Machiavelli, The Prince, ch. XVII
//
//   The user, after round 374: "Within the context of the game this essentially is about earning and returning loyalty
//   to build a team and keep it working. Recruiting members isn't the end; to reach gold you have to help each other
//   understand how your essences shape you and how you shape your essences. It's not a simple love and fear bar filling
//   up ... The game will be about earning the loyalty of other adventurers. Finding a team of like minded people. Some
//   should be tactical, others risk takers, some violent, other passive, some looking for exploration and adventure,
//   others with specific goals to achieve ... If the player wants to explore every region on the map they better have a
//   party of people interested in that. If they want to discuss and plan prior to action they better have a party up
//   for that. However, within the restricted essence and illegal path Fear is an acceptable method of control. Killing
//   unruly companions to keep the others in line. Showing off power or soloing large threats will increase the fear of
//   your followers."
//
// WHAT EACH OF THEM VALUES. Ten things an adventurer can care about, each weighted -2..+2 per person (VALUES below):
//   plan     talking a job through before it        risk     taking fights above your rank
//   fight    killing, and plenty of it              mercy    sparing people, helping the helpless
//   explore  new regions, new places                duty     the board's work, finished
//   coin     money, and shares of it                glory    rank, and a name
//   faith    the temples and their holy days         lore     books, learning, the why of things
//
// LOYALTY IS EARNED BY WHAT YOU DO, IN FRONT OF THEM. Every deed (DEEDS below: a planning council, a fight above your
// rank, a kill, killing a person, a new region, a contract, a kindness, a holy day, a book, a rank) is scored against
// each witness's values. A planner warms to the council and cools when you charge in; a risk-taker the other way about.
// Before they have walked with you they go on what they have heard (your REPUTATION: every deed you have done, anywhere).
//
// LOYALTY IS RETURNED. What you give: their personal goal (the favour they ask), gear and stones put on them, a share of
// the purse, a kind word, a place in the line rather than a bench at the hall. And they can see whether the team you have
// built is one they fit (CHEMISTRY): like-minded companions warm to each other day by day, and clashing ones wear each
// other down.
//
// LOVE IS A RISK FOR BOTH SIDES. A follower held by loyalty alone leaves when it stops serving them -- and a deserter
// walks off in the gear you gave them.
//
// FEAR, ONLY ON THE RESTRICTED OR ILLEGAL PATH (a restricted essence held, or the outlaw road). There it is a method of
// control: soloing large threats and shows of power make your followers afraid; an unruly companion can be made an
// example of, killed, and the others fall in line. Fear holds people who would otherwise leave -- "the dread of pain,
// which is ever present" -- but Machiavelli's warning stands: be feared, never hated. Hatred outgrowing fear is a mutiny.
// Off that path none of it is available, and the lawful will not follow an outlaw at all, though most can be made to.
//
// TOWARD GOLD. Once they follow you, essence talks open: how each of their essences shaped them, and their question back
// about yours -- does it shape you, do you shape it? Four talks (three essences and the confluence), as trust and days
// together allow. A companion cannot rise to gold until all four are done, and every essence of yours you talk through
// gives that essence's abilities insight (half a level each at your rank).
//
// Data and pure rules only. The scene is scenes/advCompanionsMixin.js.
// ============================================================================

export const RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
export const rankIdx = (r) => Math.max(0, RANKS.indexOf(String(r || 'normal')));

/** "A player should never be able to recruit more than 3 companions at Iron rank, 5 at bronze, 7 at silver, and 12 at gold." */
export const COMPANION_CAP = { normal: 3, iron: 3, bronze: 5, silver: 7, gold: 12, diamond: 12 };
export function companionCap(rank) { return COMPANION_CAP[String(rank || 'normal')] || 3; }

/** "The party can only be 7 members at a time." Seven companions walking with you; the rest wait. */
export const ACTIVE_PARTY_MAX = 7;

/** "...the monster density should increase at 3 members, more at 5 members, and more at 7 members." */
export const PARTY_DENSITY = [[7, 2.1], [5, 1.7], [3, 1.35]];
export function partyDensity(activeCompanions) {
  const n = Math.max(0, Math.floor(activeCompanions || 0));
  for (const [at, k] of PARTY_DENSITY) if (n >= at) return k;
  return 1;
}

export const LEAD_NEED_BASE = 4;           // on top of each person's own number
export const LOYAL_DMG = 1.10;             // a companion whose loyalty runs deep fights a little harder
export const LOYAL_AT = 1.5;               // ...which is trust at 1.5 x their need
export const WAVER_AT = 0.5;               // under half their need: wavering
export const LEAVE_AT = 0.2;               // under a fifth: gone, unless fear holds them
export const TRIAL_CLOCK = 600;            // a trial runs one game day (600 clock units)
export const ESSENCE_TALKS = 4;            // three essences and the confluence
export const GOLD_IDX = 4;
export const HATE_MUTINY = 1.0;            // fear path: hatred above fear x this is a mutiny

export const DIMS = ['plan', 'risk', 'fight', 'mercy', 'explore', 'duty', 'coin', 'glory', 'faith', 'lore'];

/** What a deed says about you, per dimension. `scale` multiplies every witness's reaction. */
export const DEEDS = {
  council:   { label: 'you talk a job through first',        dims: { plan: 1.2, risk: -0.4 } },
  risky:     { label: 'you take fights above your rank',      dims: { risk: 1, fight: 0.4, glory: 0.4, plan: -0.3 } },
  bigkill:   { label: 'you bring down great threats',         dims: { risk: 1.2, glory: 1.2, fight: 0.8 } },
  kills:     { label: 'you kill a great deal',                dims: { fight: 1, mercy: -0.3 } },
  person:    { label: 'you kill people',                      dims: { fight: 1, mercy: -1.5, faith: -0.4 } },
  region:    { label: 'you go somewhere new',                 dims: { explore: 2 } },
  place:     { label: 'you look inside places',               dims: { explore: 0.4, lore: 0.2 } },
  contract:  { label: 'you finish the board\'s work',         dims: { duty: 1, coin: 0.6 } },
  help:      { label: 'you help people who ask',              dims: { duty: 0.8, mercy: 1.2 } },
  holy:      { label: 'you keep the gods\' days',             dims: { faith: 2, duty: 0.4 } },
  book:      { label: 'you read and learn',                   dims: { lore: 1.5 } },
  rank:      { label: 'you climb the ranks',                  dims: { glory: 2 } },
  down:      { label: 'your people get hurt',                 dims: { plan: -1, mercy: -0.4, risk: 0.4 } },
  share:     { label: 'you share the purse',                  dims: { coin: 2 } },
};
export const DEED_CAP = 3;                 // no one deed moves anyone more than this

/** Each adventurer's values, -2..+2. "Not every character should be the same." */
const V = (o) => o;
export const VALUES = {
  kesh:     V({ risk: 2, glory: 2, fight: 1, explore: 1, plan: -1 }),
  maribel:  V({ coin: 2, plan: 1, duty: 1, risk: -1, glory: -1 }),
  tobin:    V({ mercy: 1, duty: 1, plan: 1, risk: -1, fight: -1 }),
  ysolde:   V({ coin: 1, risk: 1, explore: 1, duty: -1, glory: -1 }),
  pell:     V({ explore: 2, risk: 1, mercy: 1, plan: -1 }),
  garrick:  V({ plan: 2, risk: -2, duty: 1, mercy: 1 }),
  aldric:   V({ plan: 2, duty: 2, mercy: 1, risk: -1, coin: -1 }),
  sera:     V({ mercy: 2, plan: 1, duty: 1, risk: -1 }),
  corin:    V({ risk: 1, glory: 1, explore: 1, fight: 1 }),
  ilyra:    V({ lore: 2, explore: 2, plan: 1 }),
  bram:     V({ fight: 1, duty: 1, plan: 1, glory: -1 }),
  dace:     V({ fight: 2, risk: 2, plan: -2, mercy: -1 }),
  nix:      V({ risk: 1, explore: 1, fight: 1, duty: -2, plan: -1 }),
  bran:     V({ fight: 2, risk: 1, glory: 1, explore: 1 }),
  juno:     V({ duty: 1, explore: 1, plan: 1, risk: 1 }),
  wim:      V({ plan: 2, lore: 2, risk: -2 }),
  lark:     V({ mercy: 2, fight: -2, risk: -1, lore: 1 }),
  hester:   V({ plan: 2, duty: 1, mercy: 1, glory: -1, risk: -1 }),
  orrin:    V({ lore: 2, plan: 1, explore: 1, risk: -1 }),
  tamsin:   V({ plan: 1, fight: 1, duty: 1, glory: -1 }),
  mattias:  V({ risk: 1, fight: 1, explore: 1, plan: -1 }),
  quill:    V({ lore: 1, mercy: 1, plan: 1, fight: -1 }),
  varga:    V({ coin: 2, duty: 1, plan: 1, mercy: -1 }),
  sable:    V({ plan: 2, coin: 1, fight: 1, mercy: -2, risk: -1 }),
  rook:     V({ lore: 2, coin: 1, plan: 1 }),
  ember:    V({ coin: 2, glory: 1, plan: 1, mercy: -1 }),
  aurelian: V({ mercy: 2, faith: 2, duty: 2, coin: -2, fight: -1 }),
  maelis:   V({ mercy: 2, faith: 1, duty: 1, fight: -1 }),
  cassian:  V({ glory: 2, faith: 1, duty: 1, risk: 1 }),
  fenna:    V({ mercy: 1, faith: 1, explore: 1, fight: -1 }),
  thessaly: V({ explore: 2, lore: 2, risk: 1, duty: -1 }),
  calder:   V({ plan: 2, explore: 1, lore: 1, risk: -1 }),
  isolde:   V({ plan: 1, fight: 1, risk: -1, glory: -1 }),
  ptolem:   V({ lore: 2, plan: 2, explore: 1, risk: -1 }),
  rhaza:    V({ mercy: 1, duty: 1, explore: 1, coin: 1, plan: 1 }),
  tarek:    V({ coin: 2, risk: -1, explore: -1 }),
  zahra:    V({ plan: 2, lore: 1, explore: 1, mercy: 1 }),
  mott:     V({ explore: 2, risk: -1, glory: -1, fight: 1 }),
};

/** How a temperament reads, in a few words. */
export const VALUE_WORDS = {
  plan: ['plans before acting', 'acts first and thinks after'],
  risk: ['takes big risks', 'careful with lives'],
  fight: ['likes a fight', 'would rather not kill'],
  mercy: ['soft-hearted', 'hard'],
  explore: ['wants to see the world', 'happy close to home'],
  duty: ['finishes the work', 'no love for the Society\'s chores'],
  coin: ['in it for the money', 'not in it for money'],
  glory: ['wants a name', 'wants no fame'],
  faith: ['devout', 'no use for temples'],
  lore: ['curious about everything', 'no patience for books'],
};
export function temperament(values) {
  return DIMS.filter(d => values[d]).sort((a, b) => Math.abs(values[b]) - Math.abs(values[a]))
    .map(d => VALUE_WORDS[d][values[d] > 0 ? 0 : 1]);
}

/** What they want to see more of, when they value it and you have not shown it (or shown the opposite). */
export const WANT_MORE = {
  plan: `I'd want to see you plan a job before I trusted you with one.`,
  risk: `You play it very safe. I want someone who'll take a real fight.`,
  fight: `I want to see you fight. Properly, and often.`,
  mercy: `I want to see you help someone who can't pay you.`,
  explore: `I want to go places. Show me you do.`,
  duty: `Take some work off the board. Show me you finish what you start.`,
  coin: `Show me there's money in it. I'm not proud.`,
  glory: `Make a name. Then ask me.`,
  faith: `I'd want to see you keep a holy day.`,
  lore: `Read something. Learn something. Then we'll talk.`,
};
/** What puts them off, when they set their face against it and you do it. */
export const DISLIKE = {
  plan: `You plan everything to death. Some of us like to move.`,
  risk: `You take fights you've no business taking. I've buried people for less.`,
  fight: `You kill too easily for me.`,
  mercy: `You're soft. It'll get somebody killed.`,
  explore: `You never stay anywhere long enough to finish anything.`,
  duty: `You do the Society's chores like a clerk.`,
  coin: `It's all coin with you.`,
  glory: `You want to be talked about. I don't.`,
  faith: `You spend a lot of time at temples.`,
  lore: `You'd rather read than do.`,
};

/** Their side of an essence talk: how a family of essence shapes the one who bonds it. Stones and essences share these. */
export const ESSENCE_SHAPES = {
  fire: `It doesn't make you angry. It makes you quick to be done with things, and slow to forgive what won't burn.`,
  water: `You learn to go round. Nothing stops water; it just takes longer than people like.`,
  air: `You stop holding on to things. Places, grudges. Sometimes people, and that's the part I watch.`,
  earth: `It made me patient. Heavy, too. I stand where I'm put and it's hard to move me, even when I should go.`,
  cold: `You feel less. Not nothing. Less, and later. It's useful in a fight and a problem afterwards.`,
  storm: `Everything's sooner with it. My temper, my laugh, my mistakes.`,
  light: `It shows you things. You can't stop looking once you've seen them, and you can't unsee them.`,
  dark: `It taught me what people do when they think nobody's watching. I'm not sure I wanted to know.`,
  life: `You start to care whether things live. All of them. It's exhausting, honestly.`,
  death: `It sits with you. You get used to endings. People don't like how used to them you get.`,
  blood: `You feel your own heart all the time. And everyone else's, when it's close and racing.`,
  mind: `You notice how you think, which means you never quite stop thinking. Sleep's harder.`,
  motion: `I can't sit still. I couldn't before, but now it's a kind of hunger.`,
  force: `You learn exactly how hard to push. Then you learn you like pushing.`,
  order: `It wants things in their place. I've got very good at lists. I'd rather I hadn't needed to.`,
  craft: `Your hands want to be making something. When they're not, I fidget.`,
  space: `Distances stop meaning what they used to. Home doesn't feel far. Neither does anywhere.`,
  identity: `It keeps asking who I am. Some days I've an answer.`,
  guard: `It wants to stand in front of something. If there's nothing to guard, I go looking.`,
  beast: `There's an animal in it, and it's in me now. It's honest, the animal. I like that about it.`,
  smallbeast: `Quick and clever and always watching the exits. I didn't used to be.`,
  flyer: `You look up a lot. You look down at the rest of it, sometimes, and you have to catch yourself.`,
  aquatic: `I'm calmer near water. Further from it I get short with people.`,
  serpent: `Patience, and then not. I wait better than I did. I strike faster too.`,
  blade: `It wants to be used. You have to decide every day what for.`,
  bludgeon: `It's very simple, what it wants. Some days that's a relief.`,
  polearm: `Reach. Keeping things at a distance. I do it with people now, too.`,
  ranged: `Distance. You see more from back there, and you're less in it.`,
  alchemy: `Everything's a mixture. You start to see what anything would become with a little heat.`,
};
export const ESSENCE_SHAPES_CONFLUENCE = `The confluence is the strange one. It's not one of them; it's what they made of each other in me. Like a team, if you like.`;

/** The question back, and what each answer says. */
export const STANCES = {
  shapes: { label: '"It shapes me."',              dims: { faith: 1, mercy: 1, lore: 1, glory: -0.5 } },
  shape:  { label: '"I shape it."',                dims: { plan: 0.5, glory: 1, fight: 1, risk: 0.5, faith: -0.5 } },
  both:   { label: '"We shape each other."',       dims: { duty: 1, explore: 1, mercy: 1 } },
};
export const STANCE_REPLY = {
  approve: `Yes. That's it exactly. I'm glad it's you I'm walking with.`,
  neutral: `Huh. I'd not thought of it like that. I'll chew on it.`,
  disapprove: `I don't see it that way. But I'd rather know how you see it than not.`,
};

/** A council, a share, said back by temperament. */
export const COUNCIL_REPLY = { yes: `Good. I've got thoughts.`, meh: `Fine by me.`, no: `Can we just go? ...Fine. Talk.` };
export const SHARE_REPLY = { yes: `Now that's a leader.`, meh: `Thanks. That's decent of you.`, no: `Keep it. ...All right. I'll keep it.` };
export const KIND_REPLY = [`That's kind. You didn't have to.`, `I'll remember that.`, `Thanks. Truly.`];

/** Fear-path lines. */
export const EXAMPLE_WITNESS = {
  hard: `...Right. Understood.`,
  soft: `You didn't have to do that. You didn't have to do that.`,
  even: `Nobody's going to forget that.`,
};
export const MUTINY_LINE = `We're not staying to be next.`;
export const OUTLAW_REFUSAL = `I know what you are now. I'll not follow an outlaw.`;
export const CAP_FULL = (cap, rank) => `You've already more people than you can keep. ${cap} is what a ${rank} can lead. Come back when you can lead more.`;

// Asks: what they want of you, their own goal. Kinds the scene checks without new hooks:
//   kills n | contracts n | coin n | rank r | race | wait n   (see the scene's _leadAskProgress)
const ask = (kind, n, label, text, done) => ({ kind, n, label, text, done });
// Fear-path reactions kept from round 374: [ -, fear, hate, line ] for a show of power ('might') and for the line itself
// ('prince': "Better to be feared than loved").
const P = (l, f, h, line) => [l, f, h, line];
const L = (id, need, o) => ({ id, need, values: VALUES[id], ...o });

export const ADV_LEAD = [
  // ---------------------------------------------------------------- the early six
  L('kesh', 6, {
    want: `Someone better than me. That's the whole list. If you're better than me I'll follow you anywhere, and if you're not I'll pass you on the road.`,
    doubt: `I'm going to be the best adventurer the Nek ever made. Hard to do that walking behind somebody.`,
    might: P(0, 3, 0, `Ha! Prove it. No, go on. Prove it.`),
    prince: P(1, 2, 0, `Feared? Me, feared of you? ...Huh. Maybe. Say that again after you've beaten me at something.`),
    ask: ask('race', 1, 'Race him', `Race me. First to eight kills. Beat me and I'll carry your bags and like it.`, `You beat me. You actually beat me. All right. All right! Where are we going?`),
    join: `You know what, I'd rather lose to you than win alone. Don't tell anyone I said that.`,
    joinFear: `You're faster than me. I hate it. I'm coming. Somebody has to keep up with you.`,
    notYet: `I like you. I don't follow people I like. Do something I can tell people about.`,
    hate: `No. I'll beat you on my own, and I'll enjoy it more.`,
    waver: `Not much glory in carrying the bags, is there. Just saying.`,
    leave: `I'm off. I'll make my own name. You'll hear it.`,
  }),
  L('maribel', 7, {
    want: `Someone who pays on time, works in order and comes home. I had a husband who didn't do the last one. I'm not looking for another.`,
    doubt: `There's still the farm. Eleven hundred owing at Fenn Cross. Every day I'm not on the board it's further off.`,
    might: P(0, 1, 2, `Strong's fine. Strong's what got Tam killed. I've had enough of strong.`),
    prince: P(0, 1, 3, `My husband thought like that. Feared by the bank, loved by nobody. We know how that went.`),
    ask: ask('coin', 500, 'Pay toward the farm (500)', `Put five iron toward the farm. Not a loan. Toward it. Then I'll know you mean shares when you say shares.`, `Five iron. You're a strange one. ...Thank you. The farm can wait for me a bit now.`),
    join: `Right. I'll get my bow. Cheapest contracts first, though, I'm not changing that.`,
    joinFear: `You're the safest bet on the board. That's not nothing. I'm in.`,
    notYet: `I don't know you well enough yet to trust you with my back.`,
    hate: `No. I've had a man who made me afraid. I'm not taking on another.`,
    waver: `You haven't said two words to me in days. I'm counting, you know. I count everything.`,
    leave: `I'm going back to the board. It pays on time and it doesn't forget I'm here.`,
  }),
  L('tobin', 5, {
    want: `Someone who doesn't laugh. When I'm scared, I mean. Everyone laughs. Pell doesn't. Pell's the only one.`,
    doubt: `I'm not very good. I'd only slow you down. And... I promised Pell we'd do it together. A team. Ours.`,
    might: P(0, 2, 1, `I... yes. You are. That's sort of the problem. You're quite scary.`),
    prince: P(0, 2, 2, `I don't want anyone scared of me. I don't think I want to be scared of you either.`),
    ask: ask('kills', 10, 'Fight beside him', `Could I... watch you fight? Properly. Ten of them. I want to see how you don't step back.`, `You never stepped back once. I want to do that. I want to learn that from you.`),
    join: `I'll be the one in front. That's what the shield's for. I'll try not to shake.`,
    joinFear: `I'd rather be with you than out there with whatever you're fighting. Yes. Yes please.`,
    notYet: `I'd like to. I just... I don't know if you'd want me yet. Could we talk more?`,
    hate: `I'd rather not. Sorry. I'm sorry. Please don't.`,
    waver: `Did I do something wrong? You've gone quiet. People go quiet before they leave me behind.`,
    leave: `I'm going to go back to Pell. She notices when I'm there.`,
  }),
  L('ysolde', 9, {
    want: `Trust. Not the speech. The real thing, where you turn your back on me and keep your purse where it is.`,
    doubt: `Every team that took me on watched me like a cat in the dairy. I'd rather work alone than be watched.`,
    might: P(0, 2, 2, `Oh, a big one. I've robbed big ones. They sleep like everyone else.`),
    prince: P(1, 3, 0, `Ha. An honest one, at last. Feared it is. At least I'll know where I stand.`),
    ask: ask('wait', 3, 'Give her time', `Go away. Come back in three days and ask me again. If you still want a thief after you've slept on it, I'll believe you.`, `Three days and you came back. Nobody comes back. ...Fine. Don't make me regret it.`),
    join: `Don't count the spoons. That's all I ask. I'll know if you do.`,
    joinFear: `You're the most dangerous thing I've met this year. Better to be on your side of the door.`,
    notYet: `Not yet. I don't trust you. I don't trust anybody, so don't take it personally.`,
    hate: `I've been held by people who frightened me. I got out. I'll get out of this too.`,
    waver: `You're watching my hands again. I said I'd know.`,
    leave: `Night work's mine. Day work's yours. We tried. It didn't fit.`,
  }),
  L('pell', 6, {
    want: `Somebody who'll jump in after you. The boat went down and nobody did. I want the one who would.`,
    doubt: `Tobin. He'd be on his own. He's braver than anyone and scared of everything, and somebody has to be there.`,
    might: P(0, 2, 1, `Ooh, listen to it. Bet you a fish I can still dunk you.`),
    prince: P(0, 1, 2, `That's the saddest thing I've heard all week, and I sell dried fish.`),
    ask: ask('coin', 150, 'Stand her a supper (150)', `Stand me a proper supper. Not fish. Somewhere with a table. Then we'll see.`, `Real chairs! A cloth! ...All right, you've bought me. Don't tell Tobin it was this easy.`),
    join: `Right then, captain! I'll bring the fish. You'll want the fish, trust me.`,
    joinFear: `Better in your boat than in the water with you. I'm in.`,
    notYet: `I like you! I do. I'm just not leaving my lot for somebody I've met twice.`,
    hate: `No. Not even for a fish.`,
    waver: `You know you can talk to me, right? I talk enough for both of us but it's nice the other way too.`,
    leave: `I'm going home to Tobin. Somebody should be there for him, and you've not been there for me.`,
  }),
  L('garrick', 9, {
    want: `Someone who keeps people alive. Not brave. Not clever. Alive. I've dug enough friends out of the ground.`,
    doubt: `Three teams. I said never again. Teams are a lovely way to get your friends killed.`,
    might: P(1, 2, 0, `Strong's a start. Strong keeps a roof up. For a while.`),
    prince: P(0, 2, 0, `Feared, loved. Don't care. Alive. Can you keep them alive?`),
    ask: ask('contracts', 2, 'Take the ugly contracts', `Take two contracts. The ugly ones I leave on the board. Come back with everybody you took.`, `Two ugly ones and you came back whole. ...Fine. Somebody has to hold the door for you.`),
    join: `I'll hold the door. Somebody has to. Might as well be for you.`,
    joinFear: `You're hard to kill. That's the only reason I'd ever stand behind anyone again.`,
    notYet: `I don't know you. I don't get to know people any more. It ends badly.`,
    hate: `Go away.`,
    waver: `This is how it starts. You stop talking, then you stop looking, then I'm digging.`,
    leave: `I said never again. I should have listened to me.`,
  }),

  // ---------------------------------------------------------------- the watch (disciplined)
  L('aldric', 10, {
    want: `Someone who won't look away. That's all I asked of the watch, and they couldn't manage it.`,
    doubt: `I brought these five out of the watch on my word. I don't leave them on anyone else's.`,
    might: P(0, 2, 2, `I've served under strong men. One of them is why I'm not in the watch.`),
    prince: P(0, 1, 4, `I have heard that from a captain, word for word. I'll not hear it twice.`),
    ask: ask('contracts', 3, 'Do three by the book', `Three contracts. Taken, done and turned in, by the book, nothing skimmed. I'll read the ledger.`, `Three, clean. The ledger balances. I've not said that about anyone in a long while.`),
    join: `My word goes with you, then. Don't make me take it back.`,
    joinFear: `You're the hardest thing on the board and you've not bent yet. I'll serve.`,
    notYet: `I don't know your ledger yet. Show me the work.`,
    hate: `No. I left the watch for less.`,
    waver: `You've gone quiet on me. In my experience that's when the ledger starts to lie.`,
    leave: `I'll not serve where I'm not trusted. My regards. I'm back to my own.`,
  }),
  L('sera', 9, {
    want: `Someone who comes back for the wounded. You'd be surprised how many leaders can't count the ones behind them.`,
    doubt: `Aldric. I followed him out of the watch. One doesn't wander off from one's cousins just because a nice face asks.`,
    might: P(0, 1, 2, `I've outlived a great many strong things. They're mostly in the ground.`),
    prince: P(0, 1, 3, `Feared. Ninety years and that's still the young ones' favourite line.`),
    ask: ask('contracts', 2, 'Bring everyone home twice', `Take two contracts and bring everyone home. Not most. Everyone. Then come and have tea with me.`, `Everyone home, both times. Sit down, the tea's still warm. ...Yes. Yes, I'll come.`),
    join: `Someone has to keep you in one piece. I suppose it's me now.`,
    joinFear: `You're not unkind, only frightening. I've worked for worse. I'll come.`,
    notYet: `I like you, dear. Liking isn't leaving. Give it time.`,
    hate: `No, I don't think so. I'm too old to be frightened of children.`,
    waver: `You never stop to let me look at you. I can't mend what I can't see, dear.`,
    leave: `I'm going back to Aldric's lot. They let me fuss.`,
  }),
  L('corin', 8, {
    want: `Someone who rides out in front. Not behind the line with a map. In front, where we can see them.`,
    doubt: `The watch lads. I'm their mood, Aldric says. Who'll be their mood if I go?`,
    might: P(1, 2, 0, `Ha! Well, show us, then. Out in front.`),
    prince: P(0, 2, 1, `Huh. Feared. My old captain said that. Horse threw him.`),
    ask: ask('race', 1, 'Race him', `Race me. Fair and fast. A rider respects the one who beats him to the gate.`, `Beat me to the gate! Fair and square. I'll ride with you, then.`),
    join: `Right, I'm with you! Out in front, mind. Both of us.`,
    joinFear: `You ride harder than me. Fine. I'll take your flank.`,
    notYet: `I'd like to. Can't leave the lads on a liking.`,
    hate: `Not a chance. Horses kick people like you.`,
    waver: `It's gone dull, this. Nobody's laughed in days. That's my job and I've stopped doing it.`,
    leave: `Back to the watch lads. They miss their mood.`,
  }),
  L('ilyra', 9, {
    want: `Someone going somewhere interesting. I didn't leave a comfortable chair to walk in circles round a city.`,
    doubt: `My notes are the team's notes. Aldric's lot are my sample. One can't change the sample halfway.`,
    might: P(1, 2, 0, `Strength is measurable. I'd like to measure yours.`),
    prince: P(1, 2, 0, `Machiavellian. A real position, at least. I can argue with a position.`),
    ask: ask('kills', 15, 'Give her data', `Fifteen kills, in front of me. I want to see what your essences do under load. For the notes.`, `Fifteen. Remarkable data. I'll need more of it. I'd better come along.`),
    join: `I'll bring the notes. You'll be in them. Mostly favourably.`,
    joinFear: `You are the most interesting variable on the board. I'll follow the data.`,
    notYet: `You're pleasant. Pleasant isn't a hypothesis.`,
    hate: `No. And I'll write down why.`,
    waver: `My notes say we've gone nowhere new in days. My notes are rarely wrong.`,
    leave: `The experiment's concluded. Thank you. I'll publish.`,
  }),
  L('bram', 8, {
    want: `Strong. Steady.`,
    doubt: `Aldric. Followed him. Not done.`,
    might: P(0, 3, 0, `Show me.`),
    prince: P(0, 2, 0, `True.`),
    ask: ask('rank', 'bronze', 'Stand at bronze', `Bronze. Then talk.`, `Bronze. Good. I'll shoe your horses.`),
    join: `Yes.`,
    joinFear: `Yes. Strong.`,
    notYet: `No. Not yet.`,
    hate: `No.`,
    waver: `Hm.`,
    leave: `Going. Aldric's.`,
  }),

  // ---------------------------------------------------------------- the blitz (chaotic)
  L('dace', 6, {
    want: `Someone who doesn't tell me to wait. And who's faster than me, so I don't have to.`,
    doubt: `Kesh found me on the docks. You don't walk out on the man who found you on the docks.`,
    might: P(0, 3, 0, `Ha! Yeah? Hit me. Go on.`),
    prince: P(0, 3, 0, `Feared. Yeah. That's it. That's the one.`),
    ask: ask('race', 1, 'Race him', `Race me. Don't make me wait for it.`, `You won! I didn't wait and you still won! I'm with you!`),
    join: `Right, let's go. Now. Why are we still standing here?`,
    joinFear: `You hit harder than lightning. I've been hit by lightning. Let's go.`,
    notYet: `Talk, talk. Hit something with me first.`,
    hate: `Get away from me before I do something.`,
    waver: `Bored. This is boring. When's it not boring?`,
    leave: `I'm going back to Kesh. Kesh never makes me wait.`,
  }),
  L('nix', 7, {
    want: `Somebody who isn't lying to me. And isn't boring. In that order, but only just.`,
    doubt: `Kesh's lot are the only people who never once asked me to be quiet. That's a lot to walk away from.`,
    might: P(0, 1, 2, `Ugh. My family talked like that. That's why I left them.`),
    prince: P(1, 1, 0, `Ha! An honest tyrant. That's at least new.`),
    ask: ask('kills', 12, 'Show her something interesting', `Do something interesting. Twelve kills, anywhere, I don't care, just make me want to watch.`, `All right. That wasn't boring. I'll grant you that. I'm in.`),
    join: `I'll start fires for you. Only the useful kind. Mostly.`,
    joinFear: `You're dangerous and you don't pretend you aren't. Fine. I'm in.`,
    notYet: `Maybe. I don't know you well enough to know when you're lying.`,
    hate: `You lied to me. Or you'd like to. Either way, no.`,
    waver: `You've gone all serious and quiet. That's what my father did before he decided things about me.`,
    leave: `Boring and lying. I said in that order. Bye.`,
  }),
  L('bran', 7, {
    want: `Where I'm from, the strongest leads and the rest are glad of it. I lost the challenge. I'm glad of it now. Mostly.`,
    doubt: `Kesh isn't the strongest. But Kesh asked first, and a leonid keeps a promise.`,
    might: P(0, 3, 0, `Now you're talking pride. Show me.`),
    prince: P(0, 3, 0, `Ha! A leonid's own words. Who taught you?`),
    ask: ask('kills', 20, 'Out-hunt him', `Hunt with me. Twenty kills. If you lead the hunt and not me, I'll know who leads.`, `You led the hunt. My grandmother would've liked you. I'm yours.`),
    join: `Ha! A soft one and a strong one. Where are we going? Is there ice? I'll go first.`,
    joinFear: `You won the hunt. I follow the one who wins. That's the old way, and it's a good way.`,
    notYet: `I like you! Liking isn't leading.`,
    hate: `No. And I don't lose my temper often, so mind.`,
    waver: `You haven't taken us hunting in days. A pride that doesn't hunt starts arguing.`,
    leave: `Off to find my own hunt. No hard feelings. Some feelings.`,
  }),
  L('juno', 6, {
    want: `Someone who's where they say they'll be. On time. Every time. I'll do the same.`,
    doubt: `Kesh's lot would be late to everything without me. Literally everything.`,
    might: P(0, 2, 1, `Strong doesn't get you there on time.`),
    prince: P(0, 1, 2, `Feared people are always late. Nobody dares tell them.`),
    ask: ask('contracts', 2, 'Deliver two on time', `Take two contracts and turn them in. Don't dawdle. I'll know.`, `Two, done and handed in! That's practically on time. I'm with you.`),
    join: `Right, I'll carry the messages. You'll never be late again.`,
    joinFear: `You're faster than the news. I'll fly with you.`,
    notYet: `Maybe! Ask me when you've turned something in.`,
    hate: `No. And I'm faster than you, so don't follow me.`,
    waver: `You've not said a word to me in days. I deliver letters. I know when nobody's writing.`,
    leave: `I'm off. There's a whole sky that's glad to see me.`,
  }),

  // ---------------------------------------------------------------- the sparks (new)
  L('wim', 6, {
    want: `A plan. A leader with an actual plan, written down, with contingencies. Even one contingency.`,
    doubt: `The others would forget the rope. Every time. I have a list for the rope.`,
    might: P(0, 2, 1, `Strength isn't a plan. The guide is very firm on that.`),
    prince: P(1, 2, 0, `Oh, I've read that one! The guide said not to quote it at people. ...It's quite convincing, isn't it.`),
    ask: ask('contracts', 3, 'Work three to a plan', `Three contracts. I'll write the plan, you follow it, we see if it works. For science.`, `Three! The plan worked! Twice! I'm adding you to the plan.`),
    join: `I'll bring the notes. And the rope. Somebody has to bring the rope.`,
    joinFear: `Statistically you're the safest person to stand behind. I checked.`,
    notYet: `I'd need more data on you. Sorry. It's a me thing.`,
    hate: `No. You're in my notes now, and not in a good column.`,
    waver: `I've updated my assessment. It's not gone up. Could we talk?`,
    leave: `The plan doesn't have me in it any more. I'll go.`,
  }),
  L('lark', 6, {
    want: `Someone gentle. Gentle doesn't mean soft. Gentle means you could hurt something and you don't.`,
    doubt: `Tobin and Pell asked my name. They were the only ones. I can't leave the only ones.`,
    might: P(0, 1, 3, `I don't like that. I don't like how it sounded.`),
    prince: P(0, 1, 4, `Feared? Why would you want anyone afraid of you? That's... awful.`),
    ask: ask('wait', 2, 'Come back to her', `Could you come back in two days? Things grow if you leave them a little. People too.`, `You came back. I knew you would. I'll come with you.`),
    join: `I'll mend whatever you bring back. Even you.`,
    joinFear: `I'd... rather be near you than in your way. That's a strange thing to feel. I'll come.`,
    notYet: `Not yet. I'm still learning what you're like.`,
    hate: `No. You frighten me. Please go.`,
    waver: `You've stopped noticing me. Plants do that too, when the light goes.`,
    leave: `I'm going back to the others. They remember my name.`,
  }),

  // ---------------------------------------------------------------- the old hands (disciplined)
  L('hester', 12, {
    want: `Somebody who's buried their own and kept walking. I won't follow anyone who hasn't. They don't know what it costs yet.`,
    doubt: `Thirty years I've led this lot. I turned down gold twice to stay with them. You're asking me to turn down more than gold.`,
    might: P(0, 2, 0, `Strong's what gets you to silver. It's not what gets you to sixty.`),
    prince: P(1, 3, 0, `Ha. That's not wrong, you know. It's not right either. It's just old.`),
    ask: ask('rank', 'silver', 'Stand at silver', `Come back silver. Then we'll talk like equals, and I'll buy the drinks for once.`, `Silver. Look at you. ...Sit down. I'm buying. And then, I suppose, I'm following.`),
    join: `Thirty years, and I'm following somebody. Don't make a fool of me.`,
    joinFear: `You're the real thing. I know the real thing. I'll walk with you.`,
    notYet: `Buy me a few more drinks first. I've not decided about you.`,
    hate: `No. And I've a long memory.`,
    waver: `You're forgetting to look back at your people. That's how I lost my first.`,
    leave: `I'm going back to mine. They need me, and you don't seem to.`,
  }),
  L('orrin', 13, {
    want: `Someone the stars approve of. I'm only half joking. They're good judges, the stars, and slow to change their minds.`,
    doubt: `I was in this team before Hester led it. I've never thought of leaving. Not once. You're asking me to think it.`,
    might: P(0, 1, 2, `The stars have seen strong. They've outlasted all of it.`),
    prince: P(0, 1, 3, `Feared. The stars are never feared. They're only there.`),
    ask: ask('contracts', 5, 'Take five, and come back', `Five contracts. Come back from all five. The stars will tell me whether you're worth it, and so will Hester.`, `Five, and back. The stars approve. Hester will be furious. I'll come.`),
    join: `I'll come. Tell Hester it was the stars. She won't believe it, but tell her.`,
    joinFear: `The stars say walk with you. I don't argue with the stars.`,
    notYet: `Not yet. The stars are quiet about you.`,
    hate: `No. The stars dislike you, and so, I'm afraid, do I.`,
    waver: `The stars have gone quiet about you lately. So have you.`,
    leave: `I'm going home. Hester's been waiting thirty years, she'll wait one more night.`,
  }),
  L('tamsin', 10, {
    want: `Someone who can hear the hard thing. I say it first. If you can't hear it, you'll get us killed.`,
    doubt: `Hester. I'm her second. You don't walk out on the one you're second to.`,
    might: P(0, 2, 0, `Maybe. I've been underground with strong things. They still need a light.`),
    prince: P(1, 3, 0, `There it is. The hard thing. At least you said it out loud.`),
    ask: ask('kills', 25, 'Hunt in the dark with her', `Twenty-five kills. I'll be listening. I'll hear if you flinch.`, `Twenty-five and you didn't flinch. I listened. I'll follow you.`),
    join: `Right. I'll say the hard things. You'll listen. That's the deal.`,
    joinFear: `You're hard. Harder than me. Good. Let's go.`,
    notYet: `I don't know you. I know your type, and that's not enough.`,
    hate: `No. Hard thing: I don't like you.`,
    waver: `Hard thing: you've stopped listening.`,
    leave: `Here's the hard thing. I'm going.`,
  }),
  L('mattias', 10, {
    want: `Someone who makes me laugh while something's trying to eat us. Nearly killed eleven times. The good ones were funny.`,
    doubt: `Twenty years I've been the wall for Hester's lot. A wall doesn't walk off. It's against the nature of walls.`,
    might: P(0, 2, 0, `Ha! I've been hit by stronger. I'm still here, and so are they. Well. Most of them.`),
    prince: P(1, 2, 0, `Ha! Oh, that's a good one. Keep that one.`),
    ask: ask('rank', 'silver', 'Stand at silver', `Silver. Get there and I'll lean on you instead of the other way round. Novel.`, `Silver! Ha! All right, I'll be your wall. Mind the tail.`),
    join: `I'll stand in front. Ha! I always stand in front.`,
    joinFear: `You're scarier than I am. That's rare. I'll come.`,
    notYet: `You're not funny enough yet. Work on it.`,
    hate: `No. And that's the first thing all year I haven't found funny.`,
    waver: `It's stopped being funny. That's usually a sign.`,
    leave: `I'm going back to Hester's. At least she laughs at my jokes. Sometimes.`,
  }),
  L('quill', 10, {
    want: `Somebody who doesn't need me to say it. They'll read it. The skin, I mean. Or just the face. Someone who looks.`,
    doubt: `I replaced someone in Hester's lot. I'm still not sure I've earned the place. Leaving it would feel like losing it.`,
    might: P(0, 1, 2, `The runes went red. I didn't like that.`),
    prince: P(0, 1, 3, `Red again. Sorry. I can't help what they do.`),
    ask: ask('wait', 3, 'Give him time', `Give me three days. Then ask me again, and look at my arms when you do. You'll have your answer.`, `Gold. All the way up. You see it? ...Yes. I'm coming.`),
    join: `You'll read them. I know you will. That's all I wanted.`,
    joinFear: `The runes say go with you. They're usually right about danger.`,
    notYet: `They're still grey. Grey means not yet.`,
    hate: `They're red. They've been red since you started talking.`,
    waver: `They've gone grey again. You haven't looked in days.`,
    leave: `Red. I'm going. Don't ask me to say it.`,
  }),

  // ---------------------------------------------------------------- the coin (disciplined, mercenary)
  L('varga', 11, {
    want: `Someone who pays, every time, in full, and makes everyone else pay too. I'll follow a collector. Never a debtor.`,
    doubt: `I've never broken a contract. My team is a contract. You'd need to buy it out.`,
    might: P(0, 2, 0, `Strength's collateral. I like collateral.`),
    prince: P(0, 3, 0, `Correct. Debtors love you until the bill comes. Feared, they pay.`),
    ask: ask('coin', 1500, 'Buy out her contract (1500)', `Fifteen iron. My team's share of the season, so they're square when I go. Pay it and we'll draw up terms.`, `Fifteen iron, paid in full and on the day. ...Terms accepted. I'm yours.`),
    join: `You pay well and you're pleasant. That's rarer than you'd think. Accepted.`,
    joinFear: `You collect. I can see it. I'll work for a collector.`,
    notYet: `You're agreeable. Agreeable doesn't clear a ledger.`,
    hate: `No. And I'll remember the slight. I remember all of them.`,
    waver: `I'm reviewing the terms. You'd do well not to give me reasons.`,
    leave: `Contract terminated. No refunds.`,
  }),
  L('sable', 11, {
    want: `Someone who understands patience. The fallen house I served did not. That is why it fell, and why I am polite to you now.`,
    doubt: `Varga gave me honest work when nobody would give a poisoner any. One is loyal to honest work.`,
    might: P(0, 2, 0, `Strength. Yes. Strength also has to eat and drink, which is where I come in.`),
    prince: P(1, 3, 0, `Ah. A reader. I served a house that should have read further than that chapter.`),
    ask: ask('kills', 30, 'Be patient with him', `Thirty. Without hurrying. I should like to watch how you are when you are not in a hurry.`, `Thirty, and never once in a hurry. Very good. I am at your service.`),
    join: `You've been very kind. I shall try to deserve it, which for me is a novel exercise.`,
    joinFear: `One serves the most dangerous person in the room. It is so much safer than the alternative.`,
    notYet: `We are not yet friends. I shall let you know when we are.`,
    hate: `No. Do be careful what you eat for a while. That is not a threat. It is advice.`,
    waver: `You have been neglecting me. At court that was always the first sign.`,
    leave: `I find I've another engagement. Good evening.`,
  }),
  L('rook', 10, {
    want: `Somebody with a design. A plan's fine. A design is a plan that's been tested and doesn't explode.`,
    doubt: `I built the team's kit. If I go, nobody knows how to fix any of it. I'd feel like I'd left a bridge half up.`,
    might: P(1, 2, 0, `Strength's a material property. What's your tolerance?`),
    prince: P(1, 2, 0, `Ha. Efficient. Brutal. I've built machines on less.`),
    ask: ask('coin', 1000, 'Fund the workshop (1000)', `Ten iron for parts. I'll build you something. If you pay without haggling, I'll know you understand what a design costs.`, `Ten iron, no haggling. You understand. I'll come and build things for you.`),
    join: `I'll redesign your kit. It's terrible. Lovingly terrible.`,
    joinFear: `You're the best-built thing on the road. I'll maintain you.`,
    notYet: `I don't trust a design I haven't tested. You included.`,
    hate: `No. You're a badly designed person and I don't work on those.`,
    waver: `The design's drifting. I'm not saying it's broken. Not yet.`,
    leave: `Decommissioning. It's not personal. It's specifications.`,
  }),
  L('ember', 10, {
    want: `Someone who can hold a room. I negotiate with fire in my hands. I'd like to follow someone who doesn't need it.`,
    doubt: `Varga's the only one who never flinched when my hands went up. One owes something to the people who don't flinch.`,
    might: P(0, 2, 0, `Mm. Prove it. I've melted bigger claims.`),
    prince: P(1, 3, 0, `Oh, I like that. I've said that to clients. Word for word.`),
    ask: ask('contracts', 4, 'Close four deals', `Four contracts, closed and paid. Let's see how you are at the table.`, `Four, closed. You hold a room, darling. I'll hold the fire.`),
    join: `Charming and competent. That's my type, as it happens. I'm in.`,
    joinFear: `You hold a room without lifting a hand. I'll walk behind that.`,
    notYet: `I'm fond of you. Fondness isn't a contract.`,
    hate: `No. And mind your sleeves around me for a while.`,
    waver: `Darling, you've stopped negotiating. That's usually when I start.`,
    leave: `I'm withdrawing my offer. Don't follow me, it's warm.`,
  }),

  // ---------------------------------------------------------------- the dawn (devout)
  L('aurelian', 11, {
    want: `Someone who goes where they're needed rather than where they're paid. The Healer sent me out for that. I'd follow someone who goes there too.`,
    doubt: `The temple gave me these four to look after. I prayed for them this morning, as every morning. I can't hand that to anyone lightly.`,
    might: P(0, 1, 2, `The strong are the ones who most need watching. I'd rather not have to watch you.`),
    prince: P(0, 0, 5, `No. I'll pray for you. That's all I'll do.`),
    ask: ask('contracts', 3, 'Go where you are needed', `Three contracts, for the people who post them. Not the bounties that pay best; the ones that matter. Then come and pray with me, if you like.`, `Three, and the right three. The Healer is pleased, and so am I. I'll walk with you.`),
    join: `I'll pray each morning for fewer of us to be needed. Today, for you.`,
    joinFear: `I'd rather be beside the storm than leave it unwatched. I'll come.`,
    notYet: `I don't know your heart yet. Give me time to.`,
    hate: `I'll pray for you. That's all I can do for you now.`,
    waver: `You haven't asked how I am in a long while. I'm praying about it.`,
    leave: `The Healer is needed elsewhere, and so am I. Go well.`,
  }),
  L('maelis', 9, {
    want: `Someone who can stand to be in a sick room. Most of the brave ones can't. They'd rather go out and hit something.`,
    doubt: `The temple hospital needs me between contracts. And Aurelian's lot need me during. I've no hours left over for you.`,
    might: P(0, 1, 2, `I've nursed strong men. They cry like anyone else.`),
    prince: P(0, 1, 3, `Feared. I heard that from a duke once. In a fever. He was very frightened.`),
    ask: ask('coin', 300, 'Give to the hospital (300)', `Three iron for the temple hospital. Bandages and broth. Then I'll know where your coin goes.`, `Three iron! That's a month of broth. Bless you. I'll come along and see you don't need it.`),
    join: `I'll come. Someone has to tell you to sit down when you're bleeding.`,
    joinFear: `You'll be bringing in a lot of hurt. Better I'm there when you do.`,
    notYet: `Not yet, love. I've seen a lot of nice faces in the hospital.`,
    hate: `No. I'll mend you if you come in hurt. That's all.`,
    waver: `You never let me look at you any more. I notice. Nurses notice.`,
    leave: `I'm needed at the hospital. People there say thank you.`,
  }),
  L('cassian', 9, {
    want: `A hero. A real one. I thought they were the ones in the songs, and I'm learning they're the ones who stay to dig the graves. I want to follow one of those.`,
    doubt: `I swore an oath to the temple. Aurelian holds it. I don't know if it moves with me.`,
    might: P(1, 2, 0, `Like the songs! ...Well. Not all the songs end well.`),
    prince: P(0, 2, 2, `That's not in any song I want to sing.`),
    ask: ask('kills', 20, 'Show him a hero', `Fight with me. Twenty of them. I want to see someone do it properly, so I know what properly looks like.`, `That was it. That was properly. I'll follow you.`),
    join: `I'll follow a hero. I'll learn to dig the graves.`,
    joinFear: `You're like the knights in the old songs. The stern ones. I'll serve.`,
    notYet: `I don't know yet if you're a hero. I'm trying to work out what one is.`,
    hate: `No. That's not what heroes do.`,
    waver: `This doesn't feel like the songs any more. I don't mean the sad ones.`,
    leave: `I'm going back to the temple. I need to remember what I believe.`,
  }),
  L('fenna', 8, {
    want: `The bees choose. They'll go quiet around the right one. They went quiet around Aurelian. They're... thinking about you.`,
    doubt: `My bees like the Dawn. Bees don't move hives lightly. Nor do I.`,
    might: P(0, 1, 2, `They've gone angry. Sorry. I can't stop them doing that.`),
    prince: P(0, 1, 3, `Feared? A hive that's afraid of its keeper swarms. Every time.`),
    ask: ask('wait', 2, 'Let the bees decide', `Come back in two days. The bees need to get used to you. If they're quiet, I'll come.`, `They're quiet! Look, they're on your sleeve. Right. We're coming.`),
    join: `We'll come! Mind the one on your collar, she's new.`,
    joinFear: `The bees say you're the biggest thing in the meadow. They're usually right.`,
    notYet: `They're not sure. Neither am I. Give us time.`,
    hate: `No. Back away slowly. They're angry.`,
    waver: `The bees have gone restless. They do that when nobody tends them.`,
    leave: `The hive's moving. I'm going with it.`,
  }),

  // ---------------------------------------------------------------- the seekers (chaotic, scholarly)
  L('thessaly', 10, {
    want: `Someone going through doors nobody's opened. I left a chair at the college for doors. I'll follow whoever finds the best ones.`,
    doubt: `My expedition. Calder, Isolde, Ptolem. I talked them into the Stepped City. I can't very well leave them in it.`,
    might: P(1, 2, 0, `Strength opens doors. Bluntly. Isolde would like you.`),
    prince: P(1, 2, 0, `An old argument. A good one. I'd lecture on it, if I still lectured.`),
    ask: ask('contracts', 3, 'Open three doors', `Three contracts, somewhere I haven't been. Bring me back something I didn't know.`, `Three, and I learned something from all of them. You're a better door than most. I'll come.`),
    join: `Lead on. Ask the doors nicely, please. Isolde will be along to break them anyway.`,
    joinFear: `You're the strongest key I've found. I'll come and see what you open.`,
    notYet: `I'm fond of you. Fond isn't fascinated.`,
    hate: `No. The door is closed. I'm not asking it nicely.`,
    waver: `We've opened nothing new in a while. I get restless. Dimensionally.`,
    leave: `I've a door to see about. A long way off.`,
  }),
  L('calder', 9, {
    want: `Someone who says who did the work. Forty digs. Not my name on one of them. I'd follow anyone who'd say my name out loud.`,
    doubt: `Thessaly's the first scholar who ever put me in the notes. You don't walk out on the first one.`,
    might: P(0, 1, 1, `Strong's fine. Check the ceiling, though.`),
    prince: P(0, 1, 2, `Feared. Like the college deans. They were feared. They never once checked a ceiling.`),
    ask: ask('kills', 20, 'Clear the dig with him', `Twenty. Clear the ground and I'll dig it, and you'll tell people who did which. That's all.`, `Twenty, cleared. I believe you'd say who dug it. That's more than forty digs ever gave me. I'll come.`),
    join: `I'll check the ceilings. You'll say who did. That's the deal.`,
    joinFear: `You're the safest ground I've stood on. I'll come.`,
    notYet: `I don't know if you'd say my name yet.`,
    hate: `No. You're like the deans.`,
    waver: `Nobody's said my name in days.`,
    leave: `I'm going back to Thessaly. She writes it down.`,
  }),
  L('isolde', 10, {
    want: `Composure. Someone who never loses their temper, because they never have to.`,
    doubt: `I came to protect Thessaly from Thessaly. Someone still has to.`,
    might: P(0, 3, 0, `Show me. Calmly.`),
    prince: P(0, 3, 0, `Correct. Now prove it without raising your voice.`),
    ask: ask('race', 1, 'Duel her (race)', `A contest. Eight kills, against me. Beat me without hurrying and I'll follow.`, `You beat me, and you never once hurried. I'll follow you.`),
    join: `Very well. I'll keep your door.`,
    joinFear: `You're more composed than I am. That has never happened. I'll follow.`,
    notYet: `You're agreeable. That isn't the same as composed.`,
    hate: `No.`,
    waver: `You're losing your composure with me. I notice.`,
    leave: `I've decided. Good day.`,
  }),
  L('ptolem', 10, {
    want: `Someone who reads before they act. The traps in the Stepped City are written down. Most people die not reading them.`,
    doubt: `Thessaly needs someone to read the doors. If I go, she'll ask them nicely and they'll answer in ways she doesn't like.`,
    might: P(0, 2, 0, `The strong ones read the least. That's what the traps are counting on.`),
    prince: P(1, 2, 0, `I know the original. Your version's shorter. It loses something.`),
    ask: ask('wait', 4, 'Let him read you', `Come back in four days. I'm reading you. Slowly. You're in a hard script.`, `I've finished reading you. It's a good text. I'll come.`),
    join: `I'll read the doors. You'll read my face. It's harder.`,
    joinFear: `You're written in a strong hand. I'll follow it.`,
    notYet: `I'm only halfway through you.`,
    hate: `No. I've read you, and I didn't like the ending.`,
    waver: `There are words on me I can't read, and lately they're about you.`,
    leave: `I'm going. It's written down somewhere why.`,
  }),

  // ---------------------------------------------------------------- the sands (new to cities)
  L('rhaza', 10, {
    want: `Someone who brings everyone across. The sand doesn't care who's tired. A leader carries the tired one.`,
    doubt: `I brought my people north. I'm their leader, here where none of us knows anything. I can't follow while they still need leading.`,
    might: P(0, 2, 0, `The sand's stronger. Always. Strength is how you get across, not why.`),
    prince: P(1, 2, 1, `In the desert we say the caravan follows the one who finds water. Not the one with the whip.`),
    ask: ask('coin', 500, 'Pay toward her people (500)', `Five iron, for my people's lodging this season. Then I'll know they're safe while I'm gone, and that you think of the tired ones.`, `Five iron. They'll sleep indoors. You think of the tired ones. I'll follow you across.`),
    join: `Lead, then. I'll carry the tired ones. That's what I do.`,
    joinFear: `You'd get a caravan across the Sirukh. I'll follow you.`,
    notYet: `My people come first. Show me you'd put them first too.`,
    hate: `No. You're a whip, not water.`,
    waver: `You're walking too fast for the tired ones. I'm the tired one.`,
    leave: `I'm going back to my people. They need someone who looks back.`,
  }),
  L('tarek', 7, {
    want: `Someone who pays sailor's wages and doesn't sail into the thing in the water. There's always a thing in the water.`,
    doubt: `Rhaza took me on when the ships stopped. You don't jump ship on the one who gave you a berth.`,
    might: P(0, 2, 0, `The water's always stronger. You just have to be stronger than the thing in it.`),
    prince: P(0, 2, 0, `Ha. Every captain I ever had said that. Most of them were right.`),
    ask: ask('coin', 300, 'Pay his wages up front (300)', `Three iron, up front, like a proper berth. Then we'll talk about where you're sailing.`, `Up front! A proper captain. Where are we going? Not near water, I hope.`),
    join: `Right, captain. I'll keep watch on the water.`,
    joinFear: `You're the biggest thing in the water. I'll be in your boat.`,
    notYet: `I don't know your ship yet.`,
    hate: `No. I'd rather swim.`,
    waver: `Wages are late, captain. Wages of the other kind.`,
    leave: `Jumping ship. No offence. Plenty of offence.`,
  }),
  L('zahra', 9, {
    want: `Someone who reads the signs before they walk. The stars, the wind, the hall's notices. All of them. Most people can't be bothered.`,
    doubt: `I'm the only one of us who reads. If I go, Rhaza has to speak at the Society desk herself, and the clerks will never recover.`,
    might: P(0, 1, 2, `Strength without a compass walks in circles. I've seen it in the dunes.`),
    prince: P(0, 1, 2, `That's a city saying. In the sand, the feared one gets left at the well.`),
    ask: ask('contracts', 2, 'Read the board with her', `Two contracts, read properly first. Every word on the notice. Then come and tell me what they said.`, `You read them properly. Every word. I'll come and read the rest for you.`),
    join: `I'll read the signs. You'll walk the road. Good.`,
    joinFear: `The wind turns where you turn. I'll follow the wind.`,
    notYet: `The signs are mixed on you. Give them time.`,
    hate: `No. The signs are very clear about you.`,
    waver: `I've been reading a sign lately. It says you've stopped looking.`,
    leave: `The wind's changed. I'm following it.`,
  }),
  L('mott', 9, {
    want: `Someone who can walk the Salt Gate road and not complain. I've walked it forty times. I'll walk behind anyone who can do it once.`,
    doubt: `Rhaza. I carried her on my back across the Sirukh when she was a girl. I'm not leaving her in a city with stairs.`,
    might: P(0, 3, 0, `Hm. Show me on the road. Talk is for cities.`),
    prince: P(0, 2, 0, `Old saying. True on the road. Less true in cities.`),
    ask: ask('wait', 3, 'Walk the road for three days', `Three days. Come back after them, and don't complain about them when you do.`, `Three days and not a word of complaint. I'll walk behind you. Slowly.`),
    join: `I'll come. Slowly. Don't wait for me, I'll get there.`,
    joinFear: `You've the road in your legs. I'll follow.`,
    notYet: `Hm. Not yet.`,
    hate: `No. And don't help me up.`,
    waver: `You're walking without looking where your feet go. That's how you fall on the road.`,
    leave: `Back to the road. It doesn't ask anything.`,
  }),
];
export const ADV_LEAD_BY_ID = Object.fromEntries(ADV_LEAD.map(l => [l.id, l]));

// ------------------------------------------------------------------ pure rules
const vOf = (lead) => (lead && lead.values) || {};

/** How a deed lands with someone who holds these values. */
export function deedScore(values, deedKey, mult = 1) {
  const d = DEEDS[deedKey];
  if (!d) return 0;
  let s = 0;
  for (const [k, w] of Object.entries(d.dims)) s += (values[k] || 0) * w;
  return Math.max(-DEED_CAP, Math.min(DEED_CAP, s * mult));
}

/** The same, split by dimension (for the ledger of what they think of how you work). */
export function deedByDim(values, deedKey, mult = 1) {
  const d = DEEDS[deedKey];
  const out = {};
  if (!d) return out;
  for (const [k, w] of Object.entries(d.dims)) if (values[k]) out[k] = (values[k] || 0) * w * mult;
  return out;
}

/** Reputation: what they have heard of you before you've walked together. `rep` is the per-dimension tally of every
 *  deed you have done. Saturates, so a legend is not infinitely more convincing than a known name. */
export function firstImpression(values, rep) {
  let s = 0;
  for (const d of DIMS) if (values[d] && rep && rep[d]) s += values[d] * Math.tanh(rep[d] / 12) * 1.5;
  return s;
}

/** What they need: their number, four, their rank, a team to leave (and lead), every rank they stand above you. */
export function leadNeed(lead, adv, opts = {}) {
  const base = (lead && lead.need) || 8;
  const theirs = rankIdx(adv && adv.rank);
  const yours = rankIdx(opts.playerRank);
  return base + LEAD_NEED_BASE + theirs * 2 + (opts.inTeam ? 3 : 0) + (opts.leadsTeam ? 3 : 0) + Math.max(0, theirs - yours) * 4;
}

/** Like-mindedness of two people: cosine of their values, -1..1. */
export function chemistry(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const d of DIMS) { const x = a[d] || 0, y = b[d] || 0; dot += x * y; na += x * x; nb += y * y; }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** After joining. Fear only counts on the restricted/illegal path. */
export function loyaltyOf({ trust, need, fear = 0, hate = 0, fearPath = false }) {
  if (fearPath && hate > 0 && hate > fear * HATE_MUTINY && hate >= 4) return 'mutiny';
  const hold = fearPath ? Math.max(trust, fear) : trust;
  if (hold < need * LEAVE_AT) return 'leaving';
  if (hold < need * WAVER_AT) return 'wavering';
  if (trust >= need * LOYAL_AT) return 'loyal';
  return 'steady';
}

/** Can they be made to follow (the fear path), or would they sooner die. */
export function unbreakable(lead) { const v = vOf(lead); return (v.mercy || 0) >= 2 || (v.faith || 0) >= 2 || (v.duty || 0) >= 2; }
/** Will they follow an outlaw for loyalty's sake. */
export function lawful(lead) { const v = vOf(lead); return (v.duty || 0) >= 1 || (v.faith || 0) >= 1 || (v.mercy || 0) >= 1; }

/** What an answer in an essence talk does with them: approve / neutral / disapprove. */
export function stanceVerdict(lead, stance) {
  const v = vOf(lead), st = STANCES[stance];
  if (!st) return 'neutral';
  let s = 0;
  for (const [k, w] of Object.entries(st.dims)) s += (v[k] || 0) * w;
  return s >= 1 ? 'approve' : s <= -1 ? 'disapprove' : 'neutral';
}

/** Their reply to a council or a share, by the dimension it speaks to. */
export function replyBy(lead, dim, table) {
  const x = vOf(lead)[dim] || 0;
  return x >= 1 ? table.yes : x <= -1 ? table.no : table.meh;
}

/** The hint when they will not join yet: the dimension doing the most harm in what they have seen of you, or the one
 *  they value most that they have not seen. `seen` is their ledger by dimension. */
export function notYetHint(lead, seen) {
  const v = vOf(lead);
  let worst = null, wv = -0.5;
  for (const d of DIMS) { const x = (seen && seen[d]) || 0; if (x < wv) { wv = x; worst = d; } }
  if (worst) return (v[worst] || 0) > 0 ? WANT_MORE[worst] : DISLIKE[worst];
  const want = DIMS.filter(d => (v[d] || 0) > 0).sort((a, b) => ((seen && seen[a]) || 0) - ((seen && seen[b]) || 0) || v[b] - v[a])[0];
  return want ? WANT_MORE[want] : null;
}

/** The two things they like most and the two they like least about how you work, from their ledger. */
export function ledgerLines(seen) {
  const rows = DIMS.map(d => [d, (seen && seen[d]) || 0]).filter(([, x]) => Math.abs(x) >= 0.5);
  const good = rows.filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d);
  const bad = rows.filter(([, x]) => x < 0).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([d]) => d);
  return { good, bad };
}
export const LEDGER_GOOD = {
  plan: 'how you plan', risk: 'your nerve', fight: 'how you fight', mercy: 'your kindness', explore: 'where you go',
  duty: 'that you finish the work', coin: 'the money', glory: 'the name you\'re making', faith: 'your faith', lore: 'what you learn',
};
export const LEDGER_BAD = {
  plan: 'how you rush in', risk: 'the risks you take', fight: 'the killing', mercy: 'how hard you are', explore: 'how little you go anywhere',
  duty: 'the work you leave', coin: 'the money, or the lack of it', glory: 'the attention', faith: 'your gods, or the lack of them', lore: 'what you don\'t bother to know',
};

/** Stones for a recruited adventurer: their essences are fixed, their stones are this run's. `perSlot` per essence slot,
 *  `confluence` in the fourth. Same-family stones first (stones and essences share the 28 families), common ones after. */
export function advStoneRows(adv, essences, stoneCatalog, rng, perSlot, confluence) {
  const ids = Object.keys(stoneCatalog).filter(id => !stoneCatalog[id].godOnly);
  const common = ids.filter(id => /^(Common|Uncommon)$/.test(stoneCatalog[id].rarity || ''));
  const used = new Set();
  const draw = (pool) => {
    const left = pool.filter(id => !used.has(id));
    if (!left.length) return null;
    const id = left[Math.floor(rng() * left.length)];
    used.add(id);
    return id;
  };
  const rows = [];
  const fams = (adv.essences || []).map(e => essences[e] && essences[e].family).filter(Boolean);
  for (let i = 0; i < 3; i++) {
    const fam = fams[i];
    const themed = fam ? ids.filter(id => stoneCatalog[id].family === fam) : [];
    const row = [];
    for (let k = 0; k < perSlot; k++) { const id = draw(themed) || draw(common) || draw(ids); if (id) row.push(id); }
    rows.push(row);
  }
  const conf = [];
  const mixed = ids.filter(id => fams.includes(stoneCatalog[id].family));
  for (let k = 0; k < confluence; k++) { const id = draw(mixed) || draw(common) || draw(ids); if (id) conf.push(id); }
  rows.push(conf);
  return rows;
}

/** A self-check for the tests: every adventurer has a full, voiced record and values. */
export function advLeadFaults(adventurers, essences = null) {
  const out = [];
  const need = ['want', 'doubt', 'might', 'prince', 'ask', 'join', 'joinFear', 'notYet', 'hate', 'waver', 'leave'];
  for (const a of adventurers) {
    const l = ADV_LEAD_BY_ID[a.id];
    if (!l) { out.push(`${a.id}: no leadership record`); continue; }
    for (const k of need) if (!l[k]) out.push(`${a.id}: missing ${k}`);
    const v = VALUES[a.id];
    if (!v || Object.keys(v).length < 3) out.push(`${a.id}: values`);
    else for (const [k, x] of Object.entries(v)) if (!DIMS.includes(k) || x < -2 || x > 2 || !Number.isInteger(x)) out.push(`${a.id}: value ${k}=${x}`);
    if (l.ask && !['kills', 'contracts', 'coin', 'rank', 'race', 'wait'].includes(l.ask.kind)) out.push(`${a.id}: ask kind ${l.ask.kind}`);
    if (essences) for (const e of a.essences) { const f = essences[e] && essences[e].family; if (!ESSENCE_SHAPES[f]) out.push(`${a.id}: no shaping line for ${e} (${f})`); }
  }
  for (const l of ADV_LEAD) if (!adventurers.some(a => a.id === l.id)) out.push(`${l.id}: not an adventurer`);
  return out;
}
