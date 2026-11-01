// ============================================================================
// ROUND 389 -- THE COMPANIONS' STORY QUESTS.
//
//   The user: "Story moments: ... Build these quests for all the potential companions."
//   Round 386 built the companion nature evolutions that wake "near death in your party" and at "their story
//   moments" (natureMixin.js `_partyNatureStory`). Olb's sacrifice was the only story moment a companion could live
//   through that was ABOUT somebody. This file is the rest of them: one quest per companion, built around the thing
//   their backstory has been circling since the round it was written, ending on the moment that defines them.
//
//   The design pillar (round 375): "the game will be about earning the loyalty of other adventurers." A companion's
//   story quest is the far end of that -- they trust you enough to take you to the thing they cannot do alone, and
//   what they live through with you is written into their nature.
//
// THE SHAPE OF A QUEST. Data only; the scene is scenes/companionQuestMixin.js.
//
//   id        the quest's id; its held objective is `comp|<id>` in player.quests, its progress player.compQuests[id]
//   status    'built' (offered in play) or 'design' (written up in docs/COMPANION_STORY_QUESTS.md, NOT offered)
//   who       the companions whose story it is. Every one of them must be recruited and walking with you: a stage
//             does not advance while one of them is benched, and the climax wakes each of them.
//   open      when they will ask. `rank` (yours), `told` (how many of their arc beats they have told you -- for the
//             core companions and the outlaws that IS the trust; companionStory.js gates each beat on rank and
//             place), `trust` (an adventurer's trust as a multiple of their need, advCompanions.js).
//   moment    { id, title }: the story moment. The climax calls `_partyNatureStory(id, { only: who, title })` once.
//   offer     pages said when they ask; `accept` / `decline` their answer.
//   stages    3-5 of them, each { id, title, log, obj, talk?, done?, start? }:
//               log     the quest-log line while the stage runs (and the journal line once it is done)
//               obj     the objective, one of OBJ_KINDS below
//               talk    pages, for a `talk` stage (said when you ask the NPC) and for a `confide` stage
//               done    pages said when the objective is met (the climax stage's are the climax)
//               start   a line said over the companion's head as the stage begins
//             The last stage is the climax.
//   reward    what changes after: `idle` (their idle lines, per companion, from then on), `trust` (an adventurer's
//             trust gain), `deed` (a round-375 deed every adventurer walking with you witnesses).
//
// A PAGE is [speaker, text]: a companion id, 'npc' (the stage's NPC), or 'narr' (no speaker).
//
// THE OBJECTIVE KINDS. Every one is something the game already tracks -- a place stood in (the way a survey is), a
// pack spawned and cleared through the ordinary spawn-group system (the way Zeke's farm and Olb's nest are), a kill
// counted off the round-64 kill hook, a named townsperson spoken to (SETTLEMENT_FOLK). No fifth quest system.
//
//   goto      { place }                                   stand there with them
//   escort    { place }                                   ...and they must be at your shoulder when you arrive
//   talk      { npc: { settlement, name }, ask }          ask the named person, with them there
//   confide   { ask }                                     talk to the companion themselves
//   cull      { region, families, need }                  kill `need` of those families in that region
//   clear     { place, tier, families, packs }            packs stand at the place; clear them all
//   retrieve  { place, tier, families, packs, item }      ...and what they were standing on is found
//   waves     { place, tier, families, waves }            stand at the place; one pack after another
//
// A PLACE is { region, at, dx, dy, r, name }: `at` a settlement id in that region (or 'zeke_farm', Clark Bottom
// Farm), dx/dy tiles from its centre, r the radius in tiles that counts as there.
// ============================================================================
import { REGION_BY_ID } from './regions.js';
import { PARTY_BY_ID, ZEKE_FARM } from './party.js';
import { ADV_BY_ID } from './adventurers.js';
import { OUTLAW_BY_ID } from './outlawCompanions.js';
import { SETTLEMENT_FOLK, buildNpcList } from './npcs.js';
import { MONSTER_TYPES, monsterKeysAtTier } from './monsters.js';
import { denMonsterKeys } from './dens.js';
import { RANK_ORDER } from './ranks.js';
import { DEEDS } from './advCompanions.js';
// ROUND 407 -- the rest of the companions' stories, written out (src/data/compStories/*.js). Each replaces its design stub.
import { STORIES as STORIES_A } from './compStories/storiesA.js';
import { STORIES as STORIES_B } from './compStories/storiesB.js';
import { STORIES as STORIES_C } from './compStories/storiesC.js';
import { STORIES as STORIES_D } from './compStories/storiesD.js';
import { STORIES as STORIES_E } from './compStories/storiesE.js';
import { STORIES as STORIES_F } from './compStories/storiesF.js';

/** The player field the progress lives on. A plain object, so saves.js carries it with no save code. */
export const COMPQ_FLAG = 'compQuests';
/** The held objective's id prefix in player.quests (and the board's chain-quest predicate). */
export const COMPQ_PREFIX = 'comp|';
export const OBJ_KINDS = ['goto', 'escort', 'talk', 'confide', 'cull', 'clear', 'retrieve', 'waves'];
/** How close (tiles) a companion must be when an escort arrives. */
export const ESCORT_TILES = 8;
/** Places named by something other than a settlement. */
export const NAMED_PLACES = { zeke_farm: { region: ZEKE_FARM.region, at: ZEKE_FARM.at, name: ZEKE_FARM.name } };

export const compQuestId = (q) => `${COMPQ_PREFIX}${q.id}`;

// ---------------------------------------------------------------------------------------------------------- ZEKE
// "Zeke lost his wife to monsters about a year prior, he is haunted that he couldn't save her." His arc says the pack
// "came up out of the bottoms in the middle of the day, which they do not do". This is him finding out why.
const ZEKE = {
  id: 'zeke_bottoms', status: 'built', who: ['zeke'],
  title: 'What Came Up Out of the Bottoms',
  open: { told: 5, rank: 'bronze' },
  moment: { id: 'comp_zeke', title: 'The Yard, Held' },
  offerLabel: 'Ask about the day it happened',
  offer: [
    ['zeke', "I have told you most of it. There is a part I have not told anybody, because I could not make it sit "
      + "still long enough to say.\n\nPacks do not come up out of the bottoms at midday. Thirty years on that ground "
      + 'and I never once saw it. They came up that day like something was behind them.'],
    ['zeke', 'I would like to know what. Not to kill it. Well. Not only to kill it.\n\nBrant Ashcombe has the fields '
      + 'by Milrow. He was out that spring. I never asked him, because I did not want the answer from a man who still '
      + 'had his wife at home. I would like to ask him now, with you standing there.'],
  ],
  accept: ['zeke', 'Milrow, then. I will do the talking. You stand where I can see you, and if I stop halfway through, '
    + 'finish it for me.'],
  decline: ['zeke', 'It has kept a year. It will keep a week.'],
  stages: [
    { id: 'brant', title: 'Ask Brant Ashcombe',
      log: 'Zeke wants to know why the pack came up out of the bottoms at midday. Brant Ashcombe has farmed beside '
        + 'Milrow for thirty years. Ask him about last spring, with Zeke beside you.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_1', name: 'Brant Ashcombe' }, ask: 'Ask about the spring Zeke lost Martha' },
      talk: [
        ['npc', "Zeke Clark. I heard you'd gone to the Society. I didn't believe it, and here you are with a badge on, "
          + "so that's me told."],
        ['zeke', 'The day the pack came up, Brant. You were out.'],
        ['npc', "I was. Something walked the hedge beside me for half a mile that morning and I never saw it. I've said "
          + "that in the tavern so often it's turned into a story, and it isn't one.\n\nWhatever came up out of the "
          + "bottoms that day wasn't hunting, Zeke. It was running."],
        ['zeke', 'Running from what.'],
        ['npc', "Couldn't tell you. But the water in the cut below your south field went wrong the winter before. Black, "
          + "and warm, and the frogs stopped. I meant to tell you. Then there was the funeral, and you weren't hearing "
          + 'anybody about anything.'],
      ],
      done: [['zeke', 'The cut below the south field. I walked past it every day for a year and did not once look in it.']] },
    { id: 'yard', title: 'Stand in the yard',
      log: 'Brant says the water in the cut below Zeke\'s south field went wrong the winter before. Zeke wants to go '
        + 'by the farm first. Walk into the yard at Clark Bottom Farm with him.',
      obj: { kind: 'goto', place: { region: 'nek', at: 'zeke_farm', dx: 0, dy: 0, r: 6, name: 'the yard at Clark Bottom Farm' } },
      done: [
        ['zeke', 'This is where I stood. Right here, by the trough. I could show you the stone.\n\nI have been carrying '
          + 'this yard around with me for a year. It is smaller than I remembered.'],
        ['zeke', 'South field is through the gate. The cut is at the bottom of it. Come on, before I think of a reason not to.'],
      ] },
    { id: 'cut', title: 'Clear the drowned cut',
      log: 'Something has been living in the cut below the south field since the winter before Martha died. Clear '
        + 'out what is nesting in it.',
      obj: { kind: 'clear', place: { region: 'nek', at: 'zeke_farm', dx: -8, dy: 24, r: 10, name: 'the drowned cut' },
        tier: 1, families: ['tunnelmaw', 'grubwyrm'], packs: [[0, 0, 4], [5, -3, 3], [-4, 4, 3]] },
      start: 'There. The water is the wrong colour. Brant was right.',
      done: [
        ['zeke', 'Burrowers. A whole warren of them under the field, warming the water. A pack does not stay where the '
          + 'ground is moving under it.\n\nSo that is what came up that day. Not hunting. Running, the way Brant said, '
          + 'straight through my yard because it was in the way.'],
        ['zeke', 'It was nobody\'s fault. I have been waiting a year to be told that, and it took a warren of worms to '
          + 'tell me.\n\nThe packs will come back up. They will smell the cut open and come to see. I would like to be '
          + 'standing in the yard when they do.'],
      ] },
    { id: 'hold', title: 'Hold the yard',
      log: 'The packs are coming up out of the bottoms, the way they came the day Martha died. Hold the yard at '
        + 'Clark Bottom Farm. Zeke will keep you standing.',
      obj: { kind: 'waves', place: { region: 'nek', at: 'zeke_farm', dx: 0, dy: 0, r: 9, name: 'the yard at Clark Bottom Farm' },
        tier: 2, families: ['wolf'], waves: [3, 4, 5] },
      start: 'Here they come. Midday. Of course it is midday.',
      done: [
        ['zeke', 'That is the last of them.\n\nI stood in this yard once with nothing in me. I stood in it today and '
          + 'nobody fell down. Not one of you. I was watching.'],
        ['zeke', 'She would have said she told me so. She would have said it over supper and I would have let her.\n\n'
          + 'I am going to put a stone by the trough with her name on it, and nothing about turnips. Then I am coming '
          + 'with you, and not because she is not here. Because I am good at this.'],
      ] },
  ],
  reward: {
    deed: 'help',
    idle: { zeke: [
      'The yard is quiet now. I checked.',
      'Hands like a healer. She was right, and I can say it now without it taking my legs out from under me.',
      'Stand where I can reach you and nothing gets to keep you.',
      'There is a stone by the trough. You can see it from the road, if you are ever passing.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ BENJAMIN
// Two histories, and the quest is where they meet. Recruitment (party.js): Corran Vay "held the line at Ashfall for
// nine days and asked me on the eighth what I thought I was FOR ... He did not get a tenth day." The arc
// (companionStory.js): a house of solo hunters, a name TAKEN, nothing before seventeen. So Corran is the first thing
// Benjamin remembers choosing to remember -- and the town talk already says "There's a gold solo out past Ashfall."
const BENJAMIN = {
  id: 'benjamin_tenth_day', status: 'built', who: ['benjamin'],
  title: 'The Tenth Day',
  open: { told: 6, rank: 'silver' },
  moment: { id: 'comp_benjamin', title: 'The Tenth Day' },
  offerLabel: 'Ask about Corran Vay',
  offer: [
    ['benjamin', 'I told you about Corran Vay. Nine days at Ashfall, and on the eighth he asked me what I thought I '
      + 'was for, and I did not have an answer, and he did not get a tenth day.'],
    ['benjamin', 'He found me a month after the corridor. He is the first thing I remember that I chose to '
      + 'remember.\n\nI have an answer now, and I would like to say it where he asked. That is sentimental and I am '
      + 'aware of it. Ashfall Station, in the Cinderwaste. Would you walk me there? I can find it alone. I would rather not.'],
  ],
  accept: ['benjamin', 'Thank you. I will carry everything. That is not a joke; I have been told I am very good at it.'],
  decline: ['benjamin', 'Of course. It has waited a long time. It is very good at waiting. It is a line.'],
  stages: [
    { id: 'walk', title: 'Walk Benjamin to Ashfall',
      log: 'Benjamin wants to stand where Corran Vay asked him what he was for. Take him to Ashfall Station in the '
        + 'Cinderwaste, and keep him at your shoulder.',
      obj: { kind: 'escort', place: { region: 'cinder', at: 'cin_camp', dx: 0, dy: 0, r: 12, name: 'Ashfall Station' } },
      done: [['benjamin', 'Stationmaster Gorr will still be here. He was here then. He is the sort of man who is always '
        + 'here; I think the station would fall down without somebody standing in it.\n\nI would like you to ask him. I '
        + 'will stand behind you, which you will notice is a change.']] },
    { id: 'gorr', title: 'Ask Stationmaster Gorr',
      log: 'Stationmaster Gorr has kept Ashfall Station longer than anyone. Ask him about Corran Vay and the nine '
        + 'days, with Benjamin there.',
      obj: { kind: 'talk', npc: { settlement: 'cin_camp', name: 'Stationmaster Gorr' }, ask: 'Ask about Corran Vay\'s nine days' },
      talk: [
        ['npc', "The boy with the wings. You've grown. No -- your lot don't. You've got heavier, then. Around the eyes."],
        ['npc', 'Corran Vay held the old line east of here for nine days with eleven people and a Celestine who kept '
          + "walking into things that should have killed him. Eight of the eleven came home. Corran didn't. We never "
          + 'found his shield; the line moved after.'],
        ['benjamin', 'It will still be there.'],
        ['npc', "Something's denned on the line since. Cindermaws, the ones that drink the heat. And there's another "
          + "thing, and I'd sooner say it than not.\n\nA hunter came through last season. Alone. House colours I didn't "
          + "know, and a gold badge, and he asked whether a boy with wings had ever come through here. I said no. I'm "
          + 'not in the habit of telling solos anything.'],
        ['benjamin', 'Thank you, Stationmaster. I do not know who that is. I think that is rather the point of me.'],
      ],
      done: [['benjamin', 'East. The line is east.']] },
    { id: 'shield', title: 'Recover Corran Vay\'s shield',
      log: 'Corran Vay\'s shield was never found. Something that drinks heat has denned on the old line east of '
        + 'Ashfall. Clear it and find the shield.',
      obj: { kind: 'retrieve', place: { region: 'cinder', at: 'cin_camp', dx: 30, dy: -4, r: 10, name: 'the old line' },
        tier: 3, families: ['hellhound', 'kilnwarden'], packs: [[0, 0, 4], [4, 3, 3], [-4, -3, 3]], item: 'Corran Vay\'s shield' },
      start: 'Behind me. This is the part I am for.',
      done: [
        ['benjamin', 'Here. Under the ash, face down, the way he would have put it down if he had been given time to.\n\n'
          + 'It is dented in exactly the place he always told me to stop being hit.'],
        ['benjamin', 'They will come back. The heat in this ground draws them. Corran held this line for nine days. I am '
          + 'only asking for one more.'],
      ] },
    { id: 'tenth', title: 'The tenth day',
      log: 'The things that drink heat are coming back to the old line. Hold it with Benjamin, for the day Corran Vay '
        + 'never got.',
      obj: { kind: 'waves', place: { region: 'cinder', at: 'cin_camp', dx: 30, dy: -4, r: 10, name: 'the old line' },
        tier: 3, families: ['hellhound', 'smokecur', 'rustmantle'], waves: [4, 5, 6] },
      start: 'Behind me. I will tell you when it is over.',
      done: [
        ['benjamin', 'It is over. I am telling you.\n\nHe asked me what I thought I was for. It is still not '
          + 'complicated: I stand where the hitting happens, so the people behind me get to finish what they were '
          + 'doing. And then -- this is the part I did not have -- I turn round, and they are still there.'],
        ['narr', 'On the ridge to the north, a figure in house colours you do not know has watched the whole of the last '
          + 'wave. Alone. Benjamin looks at him for a long moment, and the hunter turns and goes back the way he came. Alone.'],
        ['benjamin', 'He came alone. He will go back alone. Nine generations of that.\n\nMy name is Benjamin Iskarys. I '
          + 'chose it in a corridor, and I am choosing it again, out loud, on Corran\'s line, with people behind me who '
          + 'would notice if I did not come back. I would not trade back.'],
      ] },
  ],
  reward: {
    deed: 'help',
    idle: { benjamin: [
      'Behind me. I will tell you when it is over, and then I will check you are all still there.',
      'Corran\'s shield is on the wall at the hall. It is not a shrine. It is a reminder to stop being hit there.',
      'Benjamin Iskarys. I keep saying it. It is starting to sound like somebody.',
      'Nothing has got past yet. I have been keeping count since Ashfall.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------- THE BRITANIKA TWINS
// "They want to reach gold rank in order to shut down the jungle slave market." Both arcs end at gold, in Bratugal,
// with Encykla asking for a week to write letters. One quest for the two of them, because the arc file split one
// history between two people on purpose: Encykla gets her table, Ædia gets her room.
const TWINS = {
  id: 'britanika_market', status: 'built', who: ['encykla', 'aedia'],
  title: 'The Market With a Name',
  open: { told: 6, rank: 'gold' },
  moment: { id: 'comp_britanika', title: 'The Doors Opened' },
  offerLabel: 'Ask about the jungle market',
  offer: [
    ['encykla', 'We are gold. I asked for a week to write to four people. I have written to them, and three have '
      + 'written back.\n\nThe market is in the green east of Thornwick. It has a name. People go there the way you would '
      + 'go to a horse fair. I would like it not to have a name by the end of the month.'],
    ['aedia', 'She means we are going. She has a plan with numbered pages. Page one is Thornwick. Page nine is me in a '
      + 'doorway.\n\nWill you come? I want somebody there who is not related to me.'],
  ],
  accept: ['encykla', 'Thornwick, then. There is a sister there who keeps a list. I would like to see it before I see anything else.'],
  decline: ['aedia', 'Fine. We have waited eleven years. She will want to renumber the pages anyway.'],
  stages: [
    { id: 'ipp', title: 'Ask Sister Ipp for her list',
      log: 'Encykla wants to begin with the people who went into the green and did not come out. Sister Ipp of '
        + 'Thornwick keeps their names. Ask her, with both sisters there.',
      obj: { kind: 'talk', npc: { settlement: 'bra_hamlet_2', name: 'Sister Ipp' }, ask: 'Ask for the names of the ones who went into the green' },
      talk: [
        ['npc', "People walk into the green and don't walk out. The city calls that the jungle. We've started calling it "
          + 'something else, and you two look like you already know what.'],
        ['encykla', 'We do. You keep their names?'],
        ['npc', "Every one I'm told. Forty-one this year. Families come to me because Vashra's clerks write 'lost to the "
          + "jungle' and close the page. I don't close pages."],
        ['encykla', 'Forty-one. May I copy it? I will be careful with it. I am careful with lists. It is most of what I am.'],
        ['aedia', "She'll copy it twice. Ask who knows the way in."],
        ['npc', "Harl Bittersedge. He hunted that stretch twenty years. He won't take money to go in now. He might take you."],
      ],
      done: [['encykla', 'Forty-one names. I have them twice.']] },
    { id: 'harl', title: 'Ask Harl Bittersedge the way in',
      log: 'Harl Bittersedge hunted the green east of Thornwick for twenty years and will not go in now. Ask him '
        + 'where the market road runs.',
      obj: { kind: 'talk', npc: { settlement: 'bra_hamlet_2', name: 'Harl Bittersedge' }, ask: 'Ask about the stretch east' },
      talk: [
        ['npc', "The stretch east. There's a road in there now that wasn't cut by anybody honest, and they keep things on "
          + "it. Big things on chains, that don't chase you. They stand in the road being large until you go home."],
        ['aedia', 'And past them?'],
        ['npc', 'Pens. A yard with a gate, and a long house with a ledger in it, and a bell for when buyers come. I saw it '
          + "once from up a tree, and came down and went home, and I haven't hunted east since."],
        ['encykla', 'A ledger. Of course there is a ledger. They are a business.'],
        ['npc', "Clear the road first. They'll hear you otherwise, and the first thing a business does when it hears "
          + 'trouble is move its stock.'],
      ],
      done: [['aedia', 'Road first. Then the room.']] },
    { id: 'road', title: 'Clear the market road',
      log: 'The market keeps beasts on the road through the green east of Thornwick. Clear them before the handlers '
        + 'can move anyone.',
      obj: { kind: 'clear', place: { region: 'bratugal', at: 'bra_hamlet_2', dx: 44, dy: 8, r: 11, name: 'the market road' },
        tier: 3, families: ['sixArmApe', 'vinegrasp'], packs: [[0, 0, 4], [5, 2, 4], [-3, 5, 3]] },
      start: 'There. On the road. Exactly as large as he said.',
      done: [['aedia', 'That is the road. Nothing on it now but us.\n\nI can see the gate from here. Do not stand behind '
        + 'me. I know. I know.']] },
    { id: 'ledger', title: 'Take the ledger',
      log: 'The market keeps a ledger in the long house by the pens. Encykla wants it more than anything else in the '
        + 'green. Clear the guards on the long house and take it.',
      obj: { kind: 'retrieve', place: { region: 'bratugal', at: 'bra_hamlet_2', dx: 58, dy: 14, r: 10, name: 'the long house' },
        tier: 3, families: ['sixArmApe', 'cobra'], packs: [[0, 0, 4], [4, -3, 3], [-4, 3, 3]], item: 'the market\'s ledger' },
      done: [
        ['encykla', 'Names, dates, prices, and the names of the buyers, in a good clear hand. Somebody took pride in '
          + 'this.\n\nThis is the table I wanted to sit at. Every person in this book who bought somebody is about to be '
          + 'very interested in negotiating with a gold-rank party.'],
        ['aedia', 'Good. You have your table. Now I want my room. The pens are through there, and when we open them the '
          + 'handlers will send everything they have left at the gate.'],
      ] },
    { id: 'pens', title: 'Open the pens',
      log: 'Open the pens and hold the gate while the people inside get out. Ædia has timed how long that takes.',
      obj: { kind: 'waves', place: { region: 'bratugal', at: 'bra_hamlet_2', dx: 56, dy: 20, r: 11, name: 'the pens' },
        tier: 4, families: ['sixArmApe', 'vinegrasp', 'demonsloth'], waves: [4, 5, 6] },
      start: 'Go. All of you. I have timed it. You have long enough.', startBy: 'aedia',   // ROUND 407 -- Ædia's line (the user)
      done: [
        ['narr', 'The last of the handlers\' beasts goes down in the gateway. Behind you the pens are empty, and the '
          + 'people who were in them are walking west on the road you cleared, toward Thornwick and a sister with a list.'],
        ['aedia', 'Four days I stood in a doorway learning how long it takes to cross a room.\n\nIt was long enough for '
          + 'everybody. I counted. Nobody in there was too slow.'],
        ['encykla', 'Forty-one names on Sister Ipp\'s list. Thirty-three walked out of that gate. I have written down the '
          + 'eight who did not, and I am going to find out where they were sold, and then I am going to sit at a table '
          + 'opposite whoever bought them.'],
        ['aedia', 'She means we are. Eleven minutes older and she still says "I" when she means both of us.'],
        ['encykla', 'We are. Yes. Walk.'],
      ] },
  ],
  reward: {
    deed: 'help',
    idle: {
      encykla: [
        'Eight names left. I have them in order.',
        'Stand where I can see past you. I have got used to there being something worth seeing.',
        'Several buyers have written to me. I am letting them wait.',
        'When we are gold -- we are gold. I keep forgetting to stop saying it.',
      ],
      aedia: [
        'I am not in a doorway any more. I keep checking.',
        'Point. I will already be moving. That was always true; it feels different now.',
        'Thirty-three. I counted them out.',
        'You are slow today. That is allowed now.',
      ],
    },
  },
};

// ------------------------------------------------------------------------------------------------ THE DESIGNS
// Every other potential companion: written up in docs/COMPANION_STORY_QUESTS.md, stubbed here so the roster is one
// list and the next round fills in `stages` and flips `status`. `status: 'design'` is never offered in play.
const D = (id, who, title, momentTitle, open) => ({
  id, status: 'design', who: [who], title, open, moment: { id: `comp_${who}`, title: momentTitle }, stages: [],
});
export const COMPANION_QUEST_DESIGNS = [
  // Prism already has a fourteen-step chain (round 125) ending on her gold beat; her nature (Outworlder) has no
  // companion evolution catalogue, so her moment is designed as the chain's answer page, not a new quest.
  // ROUND 407 -- status 'chain': her story is the round-125 chain; its answer page is the moment (WorldScene `_prismAnswerPage`).
  { ...D('prism_answer', 'prism', 'What She Wants It To Be', 'The Answer', { rank: 'gold' }), status: 'chain',
    reward: { idle: { prism: [
      'I said it out loud. It is still true. I keep checking, the way you check a tooth.',
      'Earth had a kitchen I was bad in. This one has a pot I am good at and people who eat from it. That is the answer.',
      'Do not tell anybody back home. Well. There is nobody to tell. That is also the answer.',
      'Sit down. Everyone sits down for this one. I mean it every time now.',
    ] } } },
  // the outlaws (outlawCompanions.js) -- their arcs carry the two redemption choices; the quest is the third
  D('lucy_thornbacks', 'lucy', 'The Thornbacks Come Down', 'Fed and Not Fed', { told: 5, rank: 'bronze' }),
  D('jole_ledger', 'jole', 'The Short Column', 'The Account Settled', { told: 5, rank: 'bronze' }),
  D('ariani_door', 'ariani', 'One More Door', 'The Urge, Not Taken', { told: 5, rank: 'silver' }),
  D('slice_vault', 'slice', 'The Venner Vault', 'Aldous', { told: 5, rank: 'silver' }),
  // the six who start alone (adventurers.js), then the eight teams
  D('kesh_barn', 'kesh', 'The Barn at Milrow', 'Somebody Better', { trust: 1.5, rank: 'iron' }),
  D('maribel_note', 'maribel', 'Paid in Full', 'Owing Nothing', { trust: 1.5, rank: 'iron' }),
  D('tobin_doorway', 'tobin', 'Barley\'s Doorway', 'Never Steps Back', { trust: 1.5, rank: 'iron' }),
  D('ysolde_strongbox', 'ysolde', 'The Strongbox', 'Back Turned', { trust: 1.5, rank: 'bronze' }),
  D('pell_boat', 'pell', 'The One Who Would', 'Jumped In', { trust: 1.5, rank: 'iron' }),
  D('garrick_cavein', 'garrick', 'Three Teams', 'Nobody Dug Out', { trust: 1.5, rank: 'bronze' }),
  D('aldric_lookaway', 'aldric', 'What the Watch Looked Away From', 'Did Not Look Away', { trust: 1.5, rank: 'bronze' }),
  D('sera_wounded', 'sera', 'Counting the Ones Behind', 'Everyone Home', { trust: 1.5, rank: 'bronze' }),
  D('corin_horse', 'corin', 'The Patrol Road', 'Out in Front', { trust: 1.5, rank: 'bronze' }),
  D('ilyra_theory', 'ilyra', 'The Noon Hypothesis', 'Proven', { trust: 1.5, rank: 'silver' }),
  D('bram_forge', 'bram', 'Ten Words', 'Steady', { trust: 1.5, rank: 'bronze' }),
  D('dace_third', 'dace', 'The Third Strike', 'Waited', { trust: 1.5, rank: 'bronze' }),
  D('nix_family', 'nix', 'The Serious Family', 'Not Lying', { trust: 1.5, rank: 'bronze' }),
  D('bran_pride', 'bran', 'The Challenge', 'Glad of It', { trust: 1.5, rank: 'silver' }),
  D('juno_gorge', 'juno', 'On Time', 'Where She Said', { trust: 1.5, rank: 'bronze' }),
  D('wim_contingency', 'wim', 'The Contingency', 'The Plan Held', { trust: 1.5, rank: 'iron' }),
  D('lark_garden', 'lark', 'What Grows Back', 'Gentle', { trust: 1.5, rank: 'iron' }),
  D('hester_seventh', 'hester', 'The Seventh Grave', 'Kept Walking', { trust: 1.5, rank: 'gold' }),
  D('orrin_stars', 'orrin', 'What the Stars Said', 'Chose Us', { trust: 1.5, rank: 'gold' }),
  D('tamsin_mines', 'tamsin', 'The Dark Under Slagward', 'The Hard Thing', { trust: 1.5, rank: 'silver' }),
  D('mattias_twelfth', 'mattias', 'The Twelfth Time', 'Grew Back', { trust: 1.5, rank: 'gold' }),
  D('quill_runes', 'quill', 'The Quiet Runes', 'Read', { trust: 1.5, rank: 'silver' }),
  D('varga_debt', 'varga', 'The Collector\'s Daughter', 'Paid', { trust: 1.5, rank: 'gold' }),
  D('sable_house', 'sable', 'The Fallen House', 'Patience', { trust: 1.5, rank: 'gold' }),
  D('rook_design', 'rook', 'A Better-Designed Monster', 'Tested', { trust: 1.5, rank: 'silver' }),
  D('ember_room', 'ember', 'Holding the Room', 'Hands Cool', { trust: 1.5, rank: 'gold' }),
  D('aurelian_needed', 'aurelian', 'Where He Is Needed', 'Needed Less', { trust: 1.5, rank: 'silver' }),
  D('maelis_plague', 'maelis', 'The Plague Year', 'The Sick Room', { trust: 1.5, rank: 'silver' }),
  D('cassian_graves', 'cassian', 'The Ones Who Stay', 'Properly', { trust: 1.5, rank: 'silver' }),
  D('fenna_hive', 'fenna', 'The Swarm Goes Quiet', 'The Bees Chose', { trust: 1.5, rank: 'silver' }),
  D('thessaly_door', 'thessaly', 'The Door Nobody Opened', 'Through', { trust: 1.5, rank: 'gold' }),
  D('calder_name', 'calder', 'Forty-One Digs', 'Named', { trust: 1.5, rank: 'gold' }),
  D('isolde_temper', 'isolde', 'Protecting Thessaly From Thessaly', 'Composure', { trust: 1.5, rank: 'gold' }),
  D('ptolem_script', 'ptolem', 'The Script on His Skin', 'Read in Time', { trust: 1.5, rank: 'gold' }),
  D('rhaza_crossing', 'rhaza', 'The Last Caravan', 'Carried Across', { trust: 1.5, rank: 'silver' }),
  D('tarek_water', 'tarek', 'The Thing in the Water', 'Sailed Anyway', { trust: 1.5, rank: 'bronze' }),
  D('zahra_signs', 'zahra', 'Reading the Signs', 'Read Aloud', { trust: 1.5, rank: 'silver' }),
  D('mott_road', 'mott', 'The Forty-First Walk', 'The Second Floor', { trust: 1.5, rank: 'silver' }),
];

/** ROUND 407 -- the written stories, by id; each takes its design stub's place in the one list. */
export const WRITTEN_STORIES = [...STORIES_A, ...STORIES_B, ...STORIES_C, ...STORIES_D, ...STORIES_E, ...STORIES_F];
const WRITTEN_BY_ID = Object.fromEntries(WRITTEN_STORIES.map(q => [q.id, q]));
export const COMPANION_QUESTS = [ZEKE, BENJAMIN, TWINS, ...COMPANION_QUEST_DESIGNS.map(d => WRITTEN_BY_ID[d.id] || d)];
export const COMPQ_BY_ID = Object.fromEntries(COMPANION_QUESTS.map(q => [q.id, q]));
export const BUILT_COMPANION_QUESTS = COMPANION_QUESTS.filter(q => q.status === 'built');

/** The quests a companion is part of (by roster id: 'zeke', 'lucy', 'kesh'). */
export function compQuestsFor(companionId) {
  return COMPANION_QUESTS.filter(q => q.who.includes(companionId));
}

/** Whose roster a companion id is on: 'party' (party.js), 'outlaw', 'adv' (adventurers.js), or null. */
export function compRosterOf(id) {
  // ROUND 407 -- an outlaw first: a recruited outlaw is also written into PARTY_BY_ID at runtime, and read as 'party'
  // their story's ending never looked at how you turned them
  if (OUTLAW_BY_ID[id]) return 'outlaw';
  if (PARTY_BY_ID[id] && !PARTY_BY_ID[id].advId) return 'party';
  if (ADV_BY_ID[id]) return 'adv';
  return null;
}

/** A companion's display name, off whichever roster holds them. */
export function compNameOf(id) {
  const d = (PARTY_BY_ID[id] && !PARTY_BY_ID[id].advId && PARTY_BY_ID[id]) || OUTLAW_BY_ID[id] || ADV_BY_ID[id];
  return (d && d.name) || id;
}

/** A place, resolved to a region and a tile: { region, tx, ty, r, name }, or null when it names nothing. */
export function resolvePlace(place) {
  if (!place) return null;
  const region = REGION_BY_ID[place.region];
  if (!region) return null;
  let at = null, name = null;
  const named = NAMED_PLACES[place.at];
  if (named) {
    if (named.region !== place.region) return null;
    at = named.at; name = named.name;
  } else {
    const st = (region.settlements || []).find(s => s.id === place.at);
    if (!st || !st.at) return null;
    at = st.at; name = st.name;
  }
  return { region: place.region, tx: at.tx + (place.dx || 0), ty: at.ty + (place.dy || 0), r: place.r || 8, name: place.name || name };
}

/** How many of a thing a stage's objective counts to (the `need` of its held quest). */
export function stageNeed(stage) {
  const o = (stage && stage.obj) || {};
  if (o.kind === 'cull') return o.need || 1;
  if (o.kind === 'clear' || o.kind === 'retrieve') return (o.packs || []).length || 1;
  if (o.kind === 'waves') return (o.waves || []).length || 1;
  return 1;
}

function rankAtLeast(have, need) {
  if (!need) return true;
  return RANK_ORDER.indexOf(have || 'normal') >= RANK_ORDER.indexOf(need);
}

/**
 * Will they ask? Pure, so the suite can walk it without a game.
 * `ctx` = { recruited: [ids walking with you], told: { id: arc beats told }, rank, trust: { id: trust / need } }.
 */
export function compQuestOpen(q, ctx = {}) {
  if (!q || q.status !== 'built') return { ok: false, why: 'not yet written' };
  const rec = new Set(ctx.recruited || []);
  const open = q.open || {};
  for (const id of q.who) {
    if (!rec.has(id)) return { ok: false, why: `${compNameOf(id)} is not with you` };
    if (open.told != null && compRosterOf(id) !== 'adv' && ((ctx.told || {})[id] || 0) < open.told) {
      return { ok: false, why: `${compNameOf(id)} has not told you enough yet` };
    }
    if (open.trust != null && compRosterOf(id) === 'adv' && ((ctx.trust || {})[id] || 0) < open.trust) {
      return { ok: false, why: `${compNameOf(id)} does not trust you enough yet` };
    }
  }
  if (!rankAtLeast(ctx.rank, open.rank)) return { ok: false, why: `not before ${open.rank}` };
  return { ok: true, why: '' };
}

/** The monster keys a pack of this objective draws from: the families at the tier, else the families at any tier. */
export function stageMonsterKeys(obj) {
  return denMonsterKeys(obj.families || [], obj.tier | 0, MONSTER_TYPES, monsterKeysAtTier)
    .filter(k => (obj.families || []).includes(MONSTER_TYPES[k] && MONSTER_TYPES[k].family));
}

/**
 * Everything wrong with this file, as a list. A stage that names a person, a place or a creature the game does not
 * have is a stage nobody can finish -- the defect class this project keeps finding -- so every reference is checked
 * against the table that would have to hold it.
 */
export function companionQuestFaults() {
  const out = [];
  const ids = new Set(), moments = new Set();
  const covered = new Set();
  const SPEAK = (q, st) => new Set([...q.who, 'narr', ...(st && st.obj && st.obj.npc ? ['npc'] : [])]);
  for (const q of COMPANION_QUESTS) {
    if (ids.has(q.id)) out.push(`${q.id}: duplicate id`);
    ids.add(q.id);
    if (!q.moment || !q.moment.id || !q.moment.title) out.push(`${q.id}: no story moment`);
    else if (moments.has(q.moment.id)) out.push(`${q.id}: moment ${q.moment.id} is used twice`);
    else moments.add(q.moment.id);
    if (!['built', 'design', 'chain'].includes(q.status)) out.push(`${q.id}: unknown status ${q.status}`);
    if (!q.who || !q.who.length) out.push(`${q.id}: nobody's story`);
    for (const w of q.who || []) {
      if (!compRosterOf(w)) out.push(`${q.id}: ${w} is on no roster`);
      covered.add(w);
    }
    if (q.open && q.open.rank && !RANK_ORDER.includes(q.open.rank)) out.push(`${q.id}: unknown rank ${q.open.rank}`);
    if (q.status !== 'built') continue;
    if (q.stages.length < 3 || q.stages.length > 5) out.push(`${q.id}: ${q.stages.length} stages (3-5 wanted)`);
    const page = (p, where, st) => {
      if (!Array.isArray(p) || p.length !== 2 || !p[1] || !String(p[1]).trim()) { out.push(`${q.id}: ${where} has a malformed page`); return; }
      if (!SPEAK(q, st).has(p[0])) out.push(`${q.id}: ${where} is spoken by ${p[0]}, who is not there`);
    };
    for (const p of q.offer || []) page(p, 'offer');
    if (!q.offer || !q.offer.length) out.push(`${q.id}: no offer`);
    page(q.accept, 'accept'); page(q.decline, 'decline');
    const sids = new Set();
    q.stages.forEach((st, i) => {
      const where = `${q.id}.${st.id || i}`;
      if (!st.id || sids.has(st.id)) out.push(`${where}: missing or duplicate stage id`);
      sids.add(st.id);
      if (!st.title) out.push(`${where}: no title`);
      if (!st.log || st.log.length < 30) out.push(`${where}: no quest-log line`);
      const o = st.obj || {};
      if (!OBJ_KINDS.includes(o.kind)) { out.push(`${where}: unknown objective ${o.kind}`); return; }
      if (['goto', 'escort', 'clear', 'retrieve', 'waves'].includes(o.kind)) {
        if (!resolvePlace(o.place)) out.push(`${where}: place ${JSON.stringify(o.place)} is nowhere`);
      }
      if (o.kind === 'talk') {
        // ROUND 407 -- Cadence's people come from buildNpcList, not SETTLEMENT_FOLK
        const folk = (o.npc && o.npc.settlement === 'nek_city') ? buildNpcList(0, 0) : (SETTLEMENT_FOLK[o.npc && o.npc.settlement] || []);
        if (!folk.some(f => f.name === (o.npc && o.npc.name))) out.push(`${where}: nobody called ${o.npc && o.npc.name} lives in ${o.npc && o.npc.settlement}`);
        if (!st.talk || !st.talk.length) out.push(`${where}: a talk with nothing said`);
        if (!o.ask) out.push(`${where}: no button to ask with`);
      }
      if (o.kind === 'confide' && (!st.talk || !st.talk.length)) out.push(`${where}: a confidence with nothing said`);
      if (o.kind === 'cull') {
        if (!REGION_BY_ID[o.region]) out.push(`${where}: cull in no region`);
        const tiers = new Set(((REGION_BY_ID[o.region] || {}).spawnGroups || []).map(g => g.tier | 0));
        for (const f of o.families || []) {
          if (![...tiers].some(t => monsterKeysAtTier(t).some(k => MONSTER_TYPES[k].family === f))) {
            out.push(`${where}: ${f} never walks ${o.region}, so the cull could never finish`);
          }
        }
      }
      if (['clear', 'retrieve', 'waves', 'cull'].includes(o.kind)) {
        if (!o.families || !o.families.length) out.push(`${where}: no families`);
        for (const f of o.families || []) {
          if (!Object.values(MONSTER_TYPES).some(t => t.family === f)) out.push(`${where}: no such family ${f}`);
        }
      }
      if (['clear', 'retrieve', 'waves'].includes(o.kind)) {
        if (!stageMonsterKeys(o).length) out.push(`${where}: no ${o.families} at tier ${o.tier}`);
        const list = o.kind === 'waves' ? o.waves : o.packs;
        if (!Array.isArray(list) || !list.length) out.push(`${where}: nothing to fight`);
      }
      if (o.kind === 'retrieve' && !o.item) out.push(`${where}: retrieves nothing`);
      for (const p of st.talk || []) page(p, `${where} talk`, st);
      for (const p of st.done || []) page(p, `${where} done`, st);
      // ROUND 407 -- an outlaw's ending by the answers you gave (redemptionState), and who says the start line
      for (const [k, ps] of Object.entries(st.doneBy || {})) {
        if (!['redeemed', 'unsure', 'hardened'].includes(k)) out.push(`${where}: doneBy ${k} is no ending`);
        for (const p of ps || []) page(p, `${where} doneBy.${k}`, st);
      }
      if (st.startBy && !q.who.includes(st.startBy)) out.push(`${where}: start said by ${st.startBy}, who is not in it`);
      if (st.start != null && !String(st.start).trim()) out.push(`${where}: an empty start line`);
    });
    // ROUND 407 -- the outlaws' climax reads which way you turned them; an adventurer's opens on trust
    const outlaws = q.who.filter(w => compRosterOf(w) === 'outlaw');
    const climax = q.stages[q.stages.length - 1];
    if (outlaws.length && climax) {
      for (const k of ['redeemed', 'hardened']) if (!(climax.doneBy && climax.doneBy[k] && climax.doneBy[k].length)) out.push(`${q.id}: the climax has no ${k} ending`);
      for (const w of outlaws) for (const k of ['redeemed', 'hardened']) {
        if (!(q.reward && q.reward.idleBy && q.reward.idleBy[w] && (q.reward.idleBy[w][k] || []).length)) out.push(`${q.id}: no ${k} idle lines for ${w}`);
      }
    }
    if (q.who.some(w => compRosterOf(w) === 'adv') && !(q.open && q.open.trust > 0)) out.push(`${q.id}: an adventurer's story with no trust gate`);
    if (q.reward && q.reward.deed && !DEEDS[q.reward.deed]) out.push(`${q.id}: no such deed ${q.reward.deed}`);
    if (!(q.reward && q.reward.idle && q.who.every(w => (q.reward.idle[w] || []).length >= 3) || outlaws.length)) out.push(`${q.id}: fewer than three idle lines for someone`);
    const last = q.stages[q.stages.length - 1];
    if (last && (!last.done || !last.done.length) && !(last.doneBy && Object.keys(last.doneBy).length)) out.push(`${q.id}: the climax says nothing`);
    for (const id of Object.keys((q.reward && q.reward.idle) || {})) {
      if (!q.who.includes(id)) out.push(`${q.id}: idle lines for ${id}, who is not in it`);
    }
  }
  return { faults: out, covered };
}
