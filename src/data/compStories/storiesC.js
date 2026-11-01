// ROUND 407 -- companion story quests, batch C: the watch's four (Sera, Corin, Ilyra, Bram) and three of Kesh's
// lot (Dace, Nix, Brannoc). Each replaces its design stub in companionQuests.js (COMPANION_QUEST_DESIGNS).

// ------------------------------------------------------------------------------------------------------------ SERA
// "Someone who comes back for the wounded. You'd be surprised how many leaders can't count the ones behind them."
// Thirty years of healing; the only patients she lost were the ones nobody came back for.
const SERA = {
  id: 'sera_wounded', status: 'built', who: ['sera'],
  title: 'Counting the Ones Behind',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_sera', title: 'Everyone Home' },
  offerLabel: 'Ask about the ones nobody came back for',
  offer: [
    ['sera', 'Thirty years on the watch, dear, and I can tell you the number of patients I lost. It is not a large '
      + 'number. I am rather proud of it.\n\nEvery one of them was somebody who fell where nobody went back. I never '
      + 'lost one I could reach. I lost the ones nobody brought me.'],
    ['sera', 'Digger Naess at Karsk Landing sent a crew into the hills to cut stone for the cairns. They were due back '
      + 'four days ago. The Landing has written them down as late, which is what a town writes before it writes '
      + 'something worse.\n\nI would like to go and get them. I would like to go with somebody who counts.'],
  ],
  accept: ['sera', 'Thank you. Karsk Landing, then. Bring the good bandages, the ones you think I do not know you keep.'],
  decline: ['sera', 'Of course. I will sit with the list a while longer. I am very good at sitting with lists.'],
  stages: [
    { id: 'naess', title: 'Ask Digger Naess about his crew',
      log: 'A stone crew from Karsk Landing went into the hills and is four days late. Sera wants to know who went '
        + 'and where. Ask Digger Naess, with her beside you.',
      obj: { kind: 'talk', npc: { settlement: 'ele_city', name: 'Digger Naess' }, ask: 'Ask about the crew in the hills' },
      talk: [
        ['npc', "Six of them. Four of mine and two lads from Coldharrow that Uld lent me. They went up to the old quarry "
          + "for cairn stone. We bury with iron here, and we cap with good stone, and good stone is up there."],
        ['sera', 'Six. Do you have their names?'],
        ['npc', "I do. I've been saying them to myself at night, which is a bad habit for a man in my trade.\n\nThe "
          + "track goes north out of the Landing and bends up into the rock. There's a tally post where they mark the "
          + "loads. If they've been working, it'll be marked."],
        ['sera', 'And if they have not?'],
        ['npc', "Then they've been doing something else for four days, and I'd rather you found out what than me."],
      ],
      done: [['sera', 'Six. I have written them on the back of my hand, which my mother told me never to do.']] },
    { id: 'tally', title: 'Find the tally post',
      log: 'The crew marks every load on a tally post where the quarry track bends up into the rock. Go up the track '
        + 'with Sera and see what it says.',
      obj: { kind: 'goto', place: { region: 'elehyd', at: 'ele_city', dx: 28, dy: -30, r: 8, name: 'the tally post on the quarry track' } },
      start: 'Slowly, dear. If anyone is lying hurt on this track I would like to see them before I step on them.',
      done: [
        ['sera', 'Eleven loads marked, and then nothing. They stopped working on the second day.\n\nAnd look. Somebody '
          + 'has scratched a line under the last mark, and six small strokes beside it. That is a count. Somebody up '
          + 'there was counting heads.'],
        ['sera', 'Six strokes, all six. Whoever cut that wanted the next person up the track to know they were all '
          + 'still alive when it was cut. Clever boy. Or girl. I shall find out which and tell them so.'],
      ] },
    { id: 'quarry', title: 'Clear the hill quarry',
      log: 'Something has the stone crew pinned at the old quarry above Karsk Landing. Clear it, and Sera will see '
        + 'to whoever is left.',
      obj: { kind: 'clear', place: { region: 'elehyd', at: 'ele_city', dx: 36, dy: -38, r: 10, name: 'the hill quarry' },
        tier: 2, families: ['shiverfox', 'rimehare'], packs: [[0, 0, 4], [5, -3, 3], [-4, 4, 4]] },
      start: 'Shiverfox, and Rimehare in the rocks. They have been circling the cut. Get them off it. I will do the rest.',
      done: [
        ['narr', 'The crew are in a shallow cut at the back of the quarry, behind a wall of stacked stone they built '
          + 'themselves. Two of them can walk. Three can be helped. One has not opened his eyes since yesterday.'],
        ['sera', 'Hello, dears. No, do not get up. I can see you perfectly well from here, and I would rather you did '
          + 'not fall over in front of me.\n\nOne, two, three, four, five. And you, sleeping. Six. Somebody cut those '
          + 'strokes on the post. Was it you? It was very sensible of you.'],
        ['sera', 'He will wake. His note is wrong, but it is only wrong, not gone.\n\nColdharrow has the nearer beds '
          + 'from here, and two of them are Coldharrow lads who would like to see their mothers. We will walk them in. '
          + 'All of them. Stay at my shoulder; I want to count as we go.'],
      ] },
    { id: 'home', title: 'Bring them home to Coldharrow',
      log: 'Walk the stone crew down out of the hills to Coldharrow with Sera at your shoulder. Six went up. Sera '
        + 'means to count six in at the gate.',
      obj: { kind: 'escort', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: -6, dy: 2, r: 8, name: "Coldharrow's gate" } },
      start: 'One, two, three, four, five, six. I will say it every hundred paces. You may tell me to stop. I will not.',
      done: [
        ['narr', 'Coldharrow\'s gate is two posts and a beam, and Hettie Varn is standing in it with a lamp. Sera stops '
          + 'just inside and turns round to face the road.'],
        ['sera', 'One. Two. Three. Four. Five.\n\nSix.'],
        ['narr', 'The last of them comes through on a borrowed shoulder, awake now, complaining about the cold. Sera '
          + 'puts out a hand as if to see to him, and then does not.'],
        ['sera', 'He does not need me. Look at that. Nobody here needs me.\n\nThirty years I have stood at the end of '
          + 'roads waiting to be told how many. I have never once been able to count in the right number and then just '
          + 'stand there, with nothing to mend.'],
        ['sera', 'You came back for them. You did not stop to ask whether it was worth it, and you counted. That is all '
          + 'I ever wanted from a leader, dear, and it turns out it is rarer than gold rank.\n\nNow. Somebody find me a '
          + 'chair and a cup of something. I have earned the sit.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { sera: [
      'One, two, three, four. Everyone. Good.',
      'Six strokes on a post. I think about that boy more than is sensible.',
      'You let me look at you now. I had noticed, dear. Thank you.',
      'I have outlived two teams. I am not counting this one down. I am counting it in.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------------- CORIN
// "Someone who rides out in front. Not behind the line with a map." His horse Biscuit died under him on a watch
// patrol he was ordered to lead from the back; he has run in front ever since so nobody else has to.
const CORIN = {
  id: 'corin_horse', status: 'built', who: ['corin'],
  title: 'The Patrol Road',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_corin', title: 'Out in Front' },
  offerLabel: 'Ask about Biscuit',
  offer: [
    ['corin', 'I talk about Biscuit a lot. Big grey, stupid as a fence. I tell it like a funny story, mostly, because '
      + 'the other way of telling it is not funny at all.\n\nThe captain we had then liked his riders at the back of '
      + 'the patrol, where he could see them. So I was at the back. And the Clawstriders came in at the front.'],
    ['corin', 'Biscuit carried me through the whole column to get there. He got there. He did not get back.\n\nIt was '
      + 'the north road out of Fenn Cross. I have not been back up it. I would like to, and I would like to not be '
      + 'the only one on it, which is a strange thing for me to say. Will you come?'],
  ],
  accept: ['corin', 'Ha! Right. Out in front, then. Both of us. Mind the potholes, they have had a few years to get worse.'],
  decline: ['corin', 'No, fair. It is a sad road. It will be just as sad next week. That is the one good thing about roads.'],
  stages: [
    { id: 'bend', title: 'Ride the north road out of Fenn Cross',
      log: 'Corin\'s horse Biscuit died on the north road out of Fenn Cross, on a patrol Corin was ordered to ride '
        + 'at the back of. Walk to the bend in the road with him.',
      obj: { kind: 'goto', place: { region: 'nek', at: 'nek_hamlet_2', dx: 28, dy: -22, r: 8, name: 'the bend in the north road' } },
      start: 'I will walk in front. You know that. I am telling you anyway.',
      done: [
        ['corin', 'Here. There was a fence along that side, and the long grass, and they came out of the grass at the '
          + 'head of the column. I heard it before I saw it. Biscuit heard it before I did.'],
        ['corin', 'Somebody at Fenn Cross watched us come back that day. I never knew who. I was walking, carrying a '
          + 'saddle, and not looking at anybody.\n\nI would like to know who it was. Is that daft?'],
      ] },
    { id: 'maren', title: 'Ask Maren Ost what she saw',
      log: 'Maren Ost watches everyone who comes through Fenn Cross. Ask her about the watch patrol that came back '
        + 'short, with Corin there.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_2', name: 'Maren Ost' }, ask: 'Ask about the watch patrol that came back short' },
      talk: [
        ['npc', "I remember. Six riders went up that road in the morning. Six came back down in the afternoon, on five "
          + "horses. The one walking was carrying a saddle."],
        ['corin', 'That was me.'],
        ['npc', "I know it was. You stopped at the trough and asked me if the water was good. I told you once, the ones "
          + "who come back ask about the water. You were the first one I ever said it to.\n\nYou didn't look like a man "
          + "who was coming back. You asked anyway."],
        ['corin', 'I do not remember that at all.'],
        ['npc', "The Clawstriders are still up there. Same grass. They come down onto the road when the traffic's thin. "
          + "The Crossward's lost two carts this year and he says it's bad axles."],
      ],
      done: [['corin', 'I asked about the water. Well. Apparently I was always going to come back. Nobody told me.']] },
    { id: 'grass', title: 'Hunt the Clawstriders in the long grass',
      log: 'The pack that ran down Corin\'s patrol still hunts the long grass of the Nek. Kill eight Clawstriders '
        + 'anywhere in the Nek with Corin.',
      obj: { kind: 'cull', region: 'nek', families: ['raptor'], need: 8 },
      start: 'Clawstriders. Eight. I am not counting them for Biscuit. Well. A bit for Biscuit.',
      done: [
        ['corin', 'That will thin them. They will come back down to the road to see where their friends went. They '
          + 'always do; they are curious, like horses, except about eating you.'],
        ['corin', 'Back to the bend. This time I would like to be standing on it when they come, not riding up the '
          + 'column to get there late.'],
      ] },
    { id: 'road', title: 'Hold the bend',
      log: 'The Clawstriders are coming down onto the north road out of Fenn Cross. Hold the bend with Corin out in '
        + 'front, where the patrol could not see him.',
      obj: { kind: 'waves', place: { region: 'nek', at: 'nek_hamlet_2', dx: 28, dy: -22, r: 10, name: 'the bend in the north road' },
        tier: 2, families: ['raptor', 'wolf'], waves: [3, 4, 4, 5] },
      start: 'Out of the grass, same as before. Behind me, all of you. Where I can see you.',
      done: [
        ['narr', 'For three waves Corin stays at the head of the bend with the spear, and the pennant is the first thing '
          + 'anything coming out of the grass sees. When the last pack breaks cover he looks back at you, and steps '
          + 'aside, and lets you take the front.'],
        ['corin', 'There. That is the bit I never did. I have spent years being in front so nobody else had to be, and '
          + 'it turns out the point was never who is in front.\n\nThe point is whether the one at the back can see '
          + 'them. I could see you the whole way. I was not worried once. Well. Once.'],
        ['corin', 'Biscuit got to the front of that column because somebody had to and I was on him. He would have '
          + 'liked you. He liked anybody who went first and did not make a fuss about it.'],
        ['corin', 'Right. Water. I am going to go and ask Maren Ost if the water is good. Out of politeness. And '
          + 'because I am coming back.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { corin: [
      'Out in front. Both of us. Sometimes you. That is allowed now.',
      'I saluted a grey horse in the street yesterday. It looked at me like Biscuit used to. Like I was an idiot.',
      'Is the water good here? I always ask now. Maren Ost says it is a good sign.',
      'Excuse me! That was to the monster. Ilyra will tell you it counts as an apology. It does not.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------------- ILYRA
// "I didn't leave a comfortable chair to walk in circles round a city." The theory that matters most to her has never
// been tested against anything with teeth. Pella Dunn's peak road "nobody uses" is where it can be.
const ILYRA = {
  id: 'ilyra_theory', status: 'built', who: ['ilyra'],
  title: 'The Noon Hypothesis',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_ilyra', title: 'Proven' },
  offerLabel: 'Ask about the theory she has not tested',
  offer: [
    ['ilyra', 'I have a hypothesis I have not shown you. I have not shown anybody. The temple would call it heresy and '
      + 'my mother would call it rude, which in our house is worse.\n\nIt is this. At true noon there is no difference '
      + 'between my light and the sun\'s. If I am right, I cannot run dry at noon, because I am not the one paying for it.'],
    ['ilyra', 'Testing it needs things that come out at noon, and a great many of them, and somebody standing beside me '
      + 'who will notice if I am wrong before I fall over.\n\nThere is a road in the peaks above Coldharrow that nobody '
      + 'uses. A woman there called Pella Dunn would like to know why. So would I, now. Will you come and be my control?'],
  ],
  accept: ['ilyra', 'Splendid. I will bring the notes. You will be in them. Favourably, I expect, if the theory holds.'],
  decline: ['ilyra', 'Noted. A hypothesis keeps. That is rather the advantage of them over sandwiches.'],
  stages: [
    { id: 'pella', title: 'Ask Pella Dunn about the peak road',
      log: 'Pella Dunn in Coldharrow wants to know why nobody uses the good road to the peaks. Ilyra suspects she '
        + 'knows. Ask Pella, with Ilyra there.',
      obj: { kind: 'talk', npc: { settlement: 'ele_hamlet_1', name: 'Pella Dunn' }, ask: 'Ask about the road to the peaks' },
      talk: [
        ['npc', "It's a good road. Somebody cut it properly, steps where it's steep, a wall where it's sheer. And "
          + "nobody uses it. I asked my uncle and he said 'not in the middle of the day' and went inside."],
        ['ilyra', 'Not in the middle of the day. Did he say what happens in the middle of the day?'],
        ['npc', "Lights. On the switchbacks, walking. In full sun, which is the wrong time for lights. Everybody here "
          + "goes up at dawn or not at all, and nobody goes up at all, so."],
        ['ilyra', 'Lanternwraiths that walk at noon. Miss Dunn, you have just made my month. I am sorry. That was not the '
          + 'appropriate thing to say about your road.'],
        ['npc', "No, it's all right. Somebody being pleased about it is new."],
      ],
      done: [['ilyra', 'Lanternwraith at noon, when every book I have read says dusk. Either the books are wrong or the '
        + 'road is. I hope it is the books. It usually is.']] },
    { id: 'foot', title: 'Walk to the foot of the peak road',
      log: 'Walk to where the good road leaves Coldharrow and starts to climb. Ilyra wants to look at it before '
        + 'anything on it looks at her.',
      obj: { kind: 'goto', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 12, dy: -32, r: 8, name: 'the foot of the peak road' } },
      done: [
        ['ilyra', 'Look at the wall. Scorch marks, every one facing up the road, none facing down. Something up there '
          + 'burns things that come towards it.\n\nLight that faces outward. That is a ward, not a hunter. Somebody built '
          + 'this road to keep something in, and the things on it are doing the job.'],
        ['ilyra', 'It changes nothing. Coldharrow needs its road, and I need my data. But I will write it down. We are '
          + 'not the first people to come up here with a theory.'],
      ] },
    { id: 'switchbacks', title: 'Clear the switchbacks',
      log: 'Lanternwraiths walk the peak road above Coldharrow in full sun. Clear them off the switchbacks so Ilyra '
        + 'can get to the high shelf.',
      obj: { kind: 'clear', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 20, dy: -36, r: 10, name: 'the switchbacks' },
        tier: 3, families: ['lanternwraith'], packs: [[0, 0, 4], [4, -3, 3], [-4, 3, 3]] },
      start: 'There. Lights, walking, in the middle of the day. Begin, please. I will take notes between bolts.',
      done: [
        ['ilyra', 'They were drawing on the sun. All of them. I could see it in the light they threw: it was the same '
          + 'colour as mine at the zenith, and they did not tire, and that is the hypothesis, walking about on legs.'],
        ['ilyra', 'The shelf above is open to the sky. What lives up there is larger than these and brighter, and it '
          + 'will come when it sees what happened to its lanterns. It will be very nearly noon.\n\nI should like to '
          + 'be standing in the middle of the shelf when it does. Please do not argue. It is the experiment.'],
      ] },
    { id: 'noon', title: 'Stand on the high shelf at noon',
      log: 'Halowing come down onto the high shelf at noon. Hold it with Ilyra while her hypothesis holds or does '
        + 'not. She has asked you to watch her, not the sky.',
      obj: { kind: 'waves', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 28, dy: -38, r: 10, name: 'the high shelf' },
        tier: 3, families: ['birdangel', 'lanternwraith'], waves: [4, 5, 6] },
      start: 'Noon. The sun is directly overhead. Watch me, please, and tell me afterwards if I faltered.',
      done: [
        ['narr', 'Three waves of Halowing come down out of a white sky, and through all of them the light from Ilyra\'s '
          + 'staff does not dim. When the last of them falls she is standing exactly where she started, and her '
          + 'gloves are still clean.'],
        ['ilyra', 'Did I falter? You were watching. Tell me honestly; I will know if you are being kind.'],
        ['ilyra', 'No. I did not think so. I could feel it. Every time I reached, the sun reached with me, and I never '
          + 'once came to the bottom.\n\nNine generations of my family have served the Sun from a temple floor. I am the '
          + 'first to find out that it stands beside you if you ask it outdoors.'],
        ['narr', 'She takes out her notebook, writes one word under a page of figures, and turns it round to show you.'],
        ['ilyra', '"Confirmed." I have never written that about anything important before. I wanted somebody to see it '
          + 'the moment it was true. Thank you for being the somebody.\n\nMy mother is still not going to forgive me. '
          + 'I shall send her a copy anyway.'],
      ] },
  ],
  reward: {
    deed: 'book', trust: 4,
    idle: { ilyra: [
      'Confirmed. I keep turning back to the page to check it has not changed its mind.',
      'If it is near noon, stand behind me. If it is not, the hypothesis is silent on where you should stand.',
      'Coldharrow uses the peak road now. Pella Dunn wrote to tell me. I have put the letter in the notes.',
      'Mister Hale says I am smug. That is a matter of opinion. My opinion is that I have earned it.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------------ BRAM
// "Followed Aldric because he could not imagine shoeing the horses for whoever came next. Says perhaps ten words a
// day and makes them count." Kiln Halt's kilns never go out. One has.
const BRAM = {
  id: 'bram_forge', status: 'built', who: ['bram'],
  title: 'Ten Words',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_bram', title: 'Steady' },
  offerLabel: 'Ask what is on his mind',
  offer: [
    ['narr', 'Bram has been turning a folded letter over in his hands for most of a morning. When you look at him he '
      + 'holds it out. It is from Kiln Halt, in the Cinderwaste, and it says that one of the kilns has gone cold.'],
    ['bram', 'Kilns never go out. One has. Smith\'s job.'],
    ['bram', 'Come?'],
  ],
  accept: ['bram', 'Good.'],
  decline: ['bram', 'Hm. Later.'],
  stages: [
    { id: 'sooth', title: 'Ask Kilnwarden Sooth about the cold kiln',
      log: 'One of the kilns at Kiln Halt has gone out, and relighting a kiln costs a week. Ask Kilnwarden Sooth '
        + 'what happened, with Bram there to listen.',
      obj: { kind: 'talk', npc: { settlement: 'cin_relay', name: 'Kilnwarden Sooth' }, ask: 'Ask about the kiln that went out' },
      talk: [
        ['npc', "The kilns never go out. I've said that to every traveller for twenty years and I'll need a new thing "
          + "to say now.\n\nThe third one went cold four days ago. The coal carts stopped coming up the south road, "
          + "and the kiln ate what it had, and then it ate nothing."],
        ['bram', 'Week to relight?'],
        ['npc', "A week, the way we do it. Slow heat, a little at a time, or the lining cracks and you've a heap of "
          + "brick instead of a kiln. We've never once had a week."],
        ['bram', 'Day. With a smith.'],
        ['npc', "...You'd need coal for a day. And a day where nothing comes up the road to see what's warm. Vart "
          + "says the road's the trouble. Ask Vart."],
      ],
      done: [['bram', 'Vart.']] },
    { id: 'vart', title: 'Ask Vart about the south road',
      log: 'Vart says something has been taking the heat out of the flows south of Kiln Halt, where the coal road '
        + 'runs. Ask him what is on it.',
      obj: { kind: 'talk', npc: { settlement: 'cin_relay', name: 'Vart' }, ask: 'Ask about the coal road' },
      talk: [
        ['npc', "Something's taking heat out of the flows south of here. Rock that ran last year sits cold. And where "
          + "the heat goes, Smokecur go, and Rustmantle come after to pick over whatever they leave."],
        ['npc', "The coal road runs right through it. The carters turned back at the first bend and I don't blame them. "
          + "You don't argue with a Smokecur over a cart of coal."],
        ['bram', 'I do.'],
        ['npc', "...Aye. You look like you would."],
      ],
      done: [['narr', 'Bram hums something on the way out of the hall. It is a farrier\'s tune, the kind you keep time '
        + 'to on an anvil.']] },
    { id: 'coal', title: 'Clear the coal road',
      log: 'Smokecur and Rustmantle have the coal road south of Kiln Halt. Clear them so the carts can bring up '
        + 'enough coal for Bram to relight the kiln in a day.',
      obj: { kind: 'clear', place: { region: 'cinder', at: 'cin_relay', dx: 14, dy: 30, r: 10, name: 'the coal road' },
        tier: 2, families: ['smokecur', 'rustmantle'], packs: [[0, 0, 4], [5, 3, 3], [-4, -3, 4]] },
      start: 'Road.',
      done: [
        ['narr', 'The carters come up behind you within the hour, and the coal goes into the yard by the cold kiln in '
          + 'a black heap. Bram strips off his pauldrons, rolls his sleeves and lays his hand flat on the kiln\'s side '
          + 'for a long time.'],
        ['bram', 'Slow heat. All day. Keep them off me.'],
      ] },
    { id: 'kiln', title: 'Keep them off the kiln',
      log: 'Bram is relighting the cold kiln at Kiln Halt in a day instead of a week, and the heat will draw '
        + 'everything on the flows. Hold the yard until the kiln is lit.',
      obj: { kind: 'waves', place: { region: 'cinder', at: 'cin_relay', dx: -6, dy: -8, r: 9, name: 'the yard by the cold kiln' },
        tier: 2, families: ['smokecur', 'rustmantle', 'cinderlamb'], waves: [3, 4, 4, 5] },
      start: 'Steady.',
      done: [
        ['narr', 'The whole fight, Bram never once turns round. He feeds the kiln a shovel at a time, listening to the '
          + 'brick, and hums the same tune over and over, and the heat comes up in it the way a horse comes up to '
          + 'the bit. When the last thing on the flows goes down, the third kiln is glowing at the vents.'],
        ['bram', 'Lit.'],
        ['narr', 'Kilnwarden Sooth\'s post-horses are tethered at the yard wall. Bram goes over and runs a hand down '
          + 'the near one\'s foreleg, and picks up the hoof, and looks at the shoe, and puts it down.'],
        ['bram', 'Knew every horse\'s name, so couldn\'t shoe them for anyone else.'],
        ['narr', 'That is eleven words, one more than anybody has heard him say at once. Nobody points it out. '
          + 'Everybody noticed.'],
        ['bram', 'Good shoe. Steady horse. Let\'s go.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { bram: [
      'Kiln\'s lit.',
      'Steady.',
      'Same arm. Same rhythm. Good.',
      'Hm. Horse needs a shoe. Later.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------------ DACE
// "Got struck by lightning twice before he bonded the essence and took it as a sign. Nobody has ever successfully
// told Dace to wait." The storm season is coming in over Karsk Landing.
const DACE = {
  id: 'dace_third', status: 'built', who: ['dace'],
  title: 'The Third Strike',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_dace', title: 'Waited' },
  offerLabel: 'Ask about the third time',
  offer: [
    ['dace', 'Twice before I was twelve. Third time I caught it, that\'s what I tell people. That\'s not true. I '
      + 'bonded it. It\'s different.\n\nThe third time hasn\'t happened yet. I can feel it. Like being stood under a '
      + 'roof that\'s about to go.'],
    ['dace', 'Storm season\'s coming into Karsk Landing. The big ones come in off the sea there. I want to be standing '
      + 'in it when it does. Don\'t tell me to wait. Everybody tells me to wait.\n\nCome now. Or now-ish. Now.'],
  ],
  accept: ['dace', 'Yes! Docks. Go. Why are you still standing there?'],
  decline: ['dace', 'Ugh. Fine. The storm doesn\'t wait either, you know. I\'m just saying.'],
  stages: [
    { id: 'docks', title: 'Go down to the Karsk Landing docks',
      log: 'Dace wants to be standing under the storm when it comes in over Karsk Landing. Start where Kesh found '
        + 'him: on the docks.',
      obj: { kind: 'goto', place: { region: 'elehyd', at: 'ele_city', dx: -24, dy: 14, r: 8, name: 'the Karsk Landing docks' } },
      start: 'Faster. The sky\'s already doing the thing.',
      done: [
        ['dace', 'There. That stack of crates. That\'s where I was fighting three dock hands for the last fish pie, '
          + 'and Kesh walked up and joined in. We lost. Best day of my life.'],
        ['dace', 'Krevic\'ll know when the storm comes in. Portmaster. Reads the sky for the boats. He hates me. Ask '
          + 'him anyway. I\'ll stand behind you and not say anything. Probably.'],
      ] },
    { id: 'krevic', title: 'Ask Portmaster Krevic about the storm',
      log: 'Portmaster Krevic reads the sky for every boat into Karsk Landing. Ask him when the storm season comes '
        + 'in, with Dace there.',
      obj: { kind: 'talk', npc: { settlement: 'ele_city', name: 'Portmaster Krevic' }, ask: 'Ask when the storm comes in' },
      talk: [
        ['npc', "Morrow. I'd know the hair anywhere. You owe the fish stall a pie."],
        ['dace', 'Kesh paid it.'],
        ['npc', "Kesh paid half of it. The storm's two days out, not that you'll wait two days for anything. When it "
          + "comes it'll come off the sea and hit the long pier first. Everything that drinks lightning comes in "
          + "ahead of it."],
        ['dace', 'Drinks lightning.'],
        ['npc', "Stormjars. They're up on the slopes all season, and they come down to the water before a big one like "
          + "gulls before a catch. Thin them out and the pier might still be there after. That'd be a nice change."],
      ],
      done: [['dace', 'Stormjars. Things that drink lightning. I\'m offended on a personal level.']] },
    { id: 'stormjars', title: 'Thin out the Stormjars',
      log: 'Stormjars come down out of the hills of Elehyd ahead of the big storms. Kill eight of them before the '
        + 'storm reaches Karsk Landing.',
      obj: { kind: 'cull', region: 'elehyd', families: ['stormjar'], need: 8 },
      start: 'Eight. Fast. Before the sky gets here.',
      done: [
        ['dace', 'Eight. Didn\'t wait for any of them. Felt great.\n\nThe sky\'s black over the water. It\'s here. '
          + 'Pier. Now. I mean it.'],
      ] },
    { id: 'pier', title: 'Stand on the long pier under the storm',
      log: 'The storm is coming in off the sea, and what is left of the things ahead of it is coming with it. Hold '
        + 'the end of the long pier at Karsk Landing with Dace.',
      obj: { kind: 'waves', place: { region: 'elehyd', at: 'ele_city', dx: -34, dy: 22, r: 10, name: 'the end of the long pier' },
        tier: 2, families: ['steelRaptor', 'wolf'], waves: [3, 4, 5] },
      start: 'Here it comes. Here it comes. HERE IT COMES.',
      done: [
        ['narr', 'The last wave is Ironclaw, all metal hide, and the storm is right on top of the pier. Dace is already '
          + 'moving. Then, for the first time anyone has seen, he stops.'],
        ['narr', 'One beat. The Ironclaw in front of him takes the step he would have taken, and the third strike comes '
          + 'down out of the sky onto its back instead of his.'],
        ['dace', '...'],
        ['dace', 'I waited. Did you see that? I WAITED. One beat. It was the longest thing I\'ve ever done.\n\nIt was '
          + 'going to hit me. Third time. I always thought that\'d be the sign, it hitting me. It wasn\'t. The sign was '
          + 'me not being there.'],
        ['dace', 'Don\'t tell Kesh. No, tell Kesh. Tell everyone. Dace Morrow waited once and it was brilliant.\n\nRight. '
          + 'That\'s done. Let\'s go. Now. I\'ve used up all the waiting.'],
      ] },
  ],
  reward: {
    deed: 'council', trust: 4,
    idle: { dace: [
      'One beat. I can do one beat. Don\'t push it.',
      'Third time it missed me. I\'m changing the story. The story\'s better now.',
      'Wolves wait. I never knew that. Turns out half of hunting is waiting.',
      'Why are we still standing here? ...No, it\'s fine. I\'m waiting. Look at me waiting.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------------- NIX
// "Ran away from a serious elven family at nineteen because she was bored." That is the lie she tells best. Sella
// Marsh's research house on the hill above Harrowmoor, "gone in a night", was her family's money.
const NIX = {
  id: 'nix_family', status: 'built', who: ['nix'],
  title: 'The Serious Family',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_nix', title: 'Not Lying' },
  offerLabel: 'Ask why she really left',
  offer: [
    ['nix', 'You want somebody who isn\'t lying to you. I said that first, so it\'s mine, but you\'ve been doing it back '
      + 'and it\'s annoying.\n\nFine. I didn\'t leave home because I was bored. I say that because it\'s a better '
      + 'story and nobody asks a second question.'],
    ['nix', 'There\'s a house on the hill above Harrowmoor. Was. A research house, chartered and very respectable, and '
      + 'my family paid for every brick. It went in a night. I want to go and see what\'s left.\n\nDon\'t be serious '
      + 'about it. If you\'re serious about it I\'ll set fire to something.'],
  ],
  accept: ['nix', 'Good. Harrowmoor. I\'ll pick the locks, you hit whatever\'s behind them. Like always.'],
  decline: ['nix', 'Fine. It\'s been gone three years. I\'m very good at it being gone.'],
  stages: [
    { id: 'sella', title: 'Ask Sella Marsh about the research house',
      log: 'Sella Marsh in Harrowmoor talks about the research house on the hill that was "gone in a night". Nix\'s '
        + 'family paid for it. Ask Sella what happened, with Nix there.',
      obj: { kind: 'talk', npc: { settlement: 'ont_city', name: 'Sella Marsh' }, ask: 'Ask about the research house on the hill' },
      talk: [
        ['npc', "Chartered, respectable, gone in a night. Lights on at dusk, nobody there at dawn, and a cart of crates "
          + "going down to the harbour that the harbourmaster swears he never saw."],
        ['nix', 'Who paid for it?'],
        ['npc', "An elven house. Old money, serious people. They sent a letter up the hill the week before it went. "
          + "I know because the boy who ran it up was my nephew, and he said it had a seal on it the size of a plate."],
        ['nix', 'Calloway. A tree in a ring. It\'s not the size of a plate, he\'s being dramatic. It\'s the size of a saucer.'],
        ['npc', "...Right. Well. Whatever they left behind is still up there. So is something else. Nobody goes into "
          + "the cellar. You can hear it ticking from the road."],
      ],
      done: [['nix', 'A letter. My mother doesn\'t write letters. She has people who write letters. That means she wrote it herself.']] },
    { id: 'house', title: 'Climb to the research house',
      log: 'The research house stands empty on the hill above Harrowmoor. Walk up to it with Nix and see what was '
        + 'left behind.',
      obj: { kind: 'goto', place: { region: 'ontaria', at: 'ont_city', dx: 22, dy: -30, r: 8, name: 'the research house on the hill' } },
      start: 'Hear that? Ticking. I hate it already.',
      done: [
        ['nix', 'They cleared it out properly. Desks, shelves, the lot. Whoever did it knew what they were doing and '
          + 'didn\'t want anybody else to.\n\nThey didn\'t clear the cellar. Nobody clears the cellar when the cellar '
          + 'ticks.'],
        ['nix', 'The strongroom\'s down there. Every house like this has one. If the letter survived, it\'s in it.'],
      ] },
    { id: 'cellar', title: 'Clear the cellar',
      log: 'Something ticks in the cellar of the research house, between Nix and the strongroom. Clear the '
        + 'Clockcrawlers out of it.',
      obj: { kind: 'clear', place: { region: 'ontaria', at: 'ont_city', dx: 24, dy: -32, r: 9, name: 'the cellar' },
        tier: 2, families: ['clockcrawler', 'stringless'], packs: [[0, 0, 4], [4, 3, 3], [-4, -2, 3]] },
      start: 'Clockcrawlers. Someone was building these, or feeding them. I\'m going to be sick or start a fire.',
      done: [
        ['nix', 'These weren\'t wild. Look at the brass on that one, that\'s been filed. Somebody here was keeping them.\n\n'
          + 'I knew that. I knew it three years ago. That\'s the part I don\'t say.'],
        ['nix', 'Strongroom door\'s at the back. It\'s a harbour-house lock, which is rude of them. I learned on those.'],
      ] },
    { id: 'strongroom', title: 'Open the strongroom',
      log: 'The strongroom at the back of the cellar holds whatever the research house did not take with it. Clear '
        + 'what guards it and find the letter Nix\'s mother sent up the hill.',
      obj: { kind: 'retrieve', place: { region: 'ontaria', at: 'ont_city', dx: 26, dy: -36, r: 8, name: 'the strongroom' },
        tier: 2, families: ['clockcrawler'], packs: [[0, 0, 4], [3, -3, 3]], item: 'the Calloway letter' },
      done: [
        ['narr', 'The letter is in a drawer by itself, unopened, the seal still whole. A tree in a ring, about the size '
          + 'of a saucer. Nix turns it over twice.'],
        ['nix', 'Nobody read it. They cleared out in a night and nobody even read it.\n\nI\'m going to read it out. All '
          + 'of it. Don\'t interrupt. If I stop, it\'s not for effect.'],
        ['nix', '"To the Director. The Calloway house withdraws its support, effective on receipt. We will not be '
          + 'asked to pay for what is in your cellar any longer.\n\nMy daughter asked me, three years ago, what our '
          + 'money was buying on that hill. I told her it was not her concern. She left the next morning, and I have '
          + 'had three years to find out what I would not tell her."'],
        ['nix', '"She was right, and I was a coward, and it is too late for me to tell her so. If she ever comes here, '
          + 'which she will, because she has never once left a locked door alone, tell her I stopped. Tell her I '
          + 'stopped because she asked."'],
        ['nix', 'I didn\'t leave because I was bored. I left because I asked her a question and she lied to me, and I '
          + 'was frightened of what the answer was, and I ran instead of finding out.\n\nThat\'s the true part. That\'s '
          + 'all of it. I\'m not lying to you. I never am, actually. Only about this.'],
        ['nix', 'Right. I\'m keeping the letter. I might even write back. Don\'t look at me like that, I said I might.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { nix: [
      'I wrote back. Two lines. The second one was rude. Baby steps.',
      'I wasn\'t bored. I\'m telling people now. They look disappointed. It\'s great.',
      'Somebody who isn\'t lying to me. You. And now me. That\'s two.',
      'Every locked door is a question. I still can\'t leave them alone. Mother was right about that too.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------------ BRAN
// "Where I'm from, the strongest leads and the rest are glad of it. I lost the challenge. I'm glad of it now. Mostly."
// His old pride is camped past the gate in the salt with no wall, and his cousin who beat him leads it.
const BRAN = {
  id: 'bran_pride', status: 'built', who: ['bran'],
  title: 'The Challenge',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_bran', title: 'Glad of It' },
  offerLabel: 'Ask about his pride',
  offer: [
    ['bran', 'Ha! You will laugh. My pride is here. Not on the southern plains where I left them. Here, on the salt, '
      + 'past the gate at Salt Gate with no wall on it. The hunting was bad at home, and Tarrow brought them over the '
      + 'water.\n\nTarrow is my cousin. Tarrow is the one who beat me.'],
    ['bran', 'I have said I am glad of it. I have said it so often I nearly believe it. Mostly.\n\nI would like to go '
      + 'and see them. I would like to go with you, because I would like Tarrow to see who I follow now. That is pride. '
      + 'I know. I am a lion, it is allowed.'],
  ],
  accept: ['bran', 'Ha! Good. Salt Gate. There will be no ice. I checked. I want that on record.'],
  decline: ['bran', 'No? No. Fine. Tarrow will still be there. Tarrow is always still there. It is very annoying.'],
  stages: [
    { id: 'yura', title: 'Ask Yura Sabel about the gate in the salt',
      log: 'Brannoc\'s old pride is camped past the gate in the salt at Salt Gate. Yura Sabel knows the gate better '
        + 'than anyone. Ask her about what is past it, with Brannoc there.',
      obj: { kind: 'talk', npc: { settlement: 'sir_village', name: 'Yura Sabel' }, ask: 'Ask about the gate in the salt' },
      talk: [
        ['npc', "A gate with no wall on either side. It was here before the village. Children walk round it to show "
          + "they're not frightened, and old people walk through it to show they're not either."],
        ['bran', 'And past it? There are lions past it. Big ones, with a lot of opinions.'],
        ['npc', "Lions, yes. Your sort, I mean. Came over a season ago, polite as anything, paid the toll in salt. "
          + "Their leader asked if anyone had seen a big one with copper in his mane. We said no. We hadn't, then."],
        ['bran', 'Ha. He asked. Of course he asked. He was always the one who asked.'],
        ['npc', "The Snowmane on the dunes don't like them much. They've been circling the camp. Your people won't hunt "
          + "them; they say it's not their ground to hunt."],
      ],
      done: [['bran', 'Snowmane circling the camp, and Tarrow being polite about whose ground it is. That is very him.']] },
    { id: 'gate', title: 'Walk through the gate in the salt',
      log: 'Walk through the gate with no wall at Salt Gate, with Brannoc beside you. His pride\'s camp is on the '
        + 'dunes beyond.',
      obj: { kind: 'goto', place: { region: 'sirukh', at: 'sir_village', dx: 28, dy: 8, r: 8, name: 'the gate in the salt' } },
      start: 'Through it, not round it. I am not frightened. I am a little frightened.',
      done: [
        ['bran', 'There. The smoke on the dune. That is the camp. And there, the ones on the ridge. Snowmane. A lot of '
          + 'them.\n\nThe old way says I do not hunt another pride\'s ground. The old way did not say anything about '
          + 'my leader hunting it. You hunt. I follow. That is allowed.'],
      ] },
    { id: 'dunes', title: 'Clear the Snowmane off the dunes',
      log: 'Snowmane are circling Brannoc\'s old pride on the dunes past the gate in the salt. His people will not '
        + 'hunt them. Brannoc will follow you if you do.',
      obj: { kind: 'clear', place: { region: 'sirukh', at: 'sir_village', dx: 34, dy: 16, r: 10, name: 'the dunes past the gate' },
        tier: 3, families: ['whitelion'], packs: [[0, 0, 4], [5, -2, 3], [-4, 4, 4]] },
      start: 'Lead the hunt. I will be exactly behind you, roaring.',
      done: [
        ['narr', 'The pride has watched the whole hunt from the camp. When it is over a leonid comes down off the dune, '
          + 'bigger than Brannoc and leaner, with no copper in his mane. He looks at you first. Then at Brannoc.'],
        ['bran', 'Tarrow. You look well. You look like you have been eating, which is more than the Snowmane will be.\n\n'
          + 'This is who I follow. They led that. I followed it. It was a good hunt.'],
      ] },
    { id: 'challenge', title: 'Talk to Brannoc',
      log: 'Tarrow has gone back up to the camp and left Brannoc standing on the dune. Talk to Brannoc before the '
        + 'pride decides what to do about you.',
      obj: { kind: 'confide', ask: 'Ask what Tarrow said' },
      talk: [
        ['bran', 'He offered me the challenge again. Tonight, if I like. He says I have grown, and it would be a fair '
          + 'fight now, and the pride would be glad of a real one.'],
        ['bran', 'The thing is, he is right. I think I would win. I have been hunting with you. I have got very good at '
          + 'it.\n\nAnd I stood on that dune and thought, if I win, I stay. I lead them. I stop following you.'],
        ['bran', 'There is something coming, anyway. The Snowmane have gone to fetch their friends. The pride will '
          + 'stand with us if we stand first. Let me roar. Then I will tell him.'],
      ],
      done: [['bran', 'Ha. That was the hard part. The fighting is the easy part.']] },
    { id: 'stand', title: 'Stand before the pride',
      log: 'The Snowmane are coming back for the camp, and the pride is watching to see who stands first. Hold the '
        + 'dune with Brannoc while Tarrow watches.',
      obj: { kind: 'waves', place: { region: 'sirukh', at: 'sir_village', dx: 38, dy: 22, r: 10, name: 'the dune below the pride\'s camp' },
        tier: 3, families: ['whitelion', 'hornram', 'cobra'], waves: [4, 5, 6] },
      start: 'I am here, and I am staying. Hear that, Tarrow? That is a promise.',
      done: [
        ['narr', 'The last of them break and run back across the dunes. The pride\'s hunters have come down to stand at '
          + 'your flank for the last wave, and Tarrow among them, and now they are all looking at Brannoc.'],
        ['bran', 'Tarrow. You asked me if I want the challenge.\n\nNo. I lost. I am glad of it now.'],
        ['bran', 'Not mostly. All of it. If I had won I would be on this dune with you, leading a pride that does not '
          + 'need me, and I would never have found out what I am for.\n\nI am for this. Standing in front, roaring, '
          + 'behind somebody who leads the hunt better than either of us.'],
        ['narr', 'Tarrow laughs, a short one, and touches his forehead to Brannoc\'s, and goes back up the dune to his people.'],
        ['bran', 'He says Grandmother would have liked you. He is right. She would have tried to fight you first. Then '
          + 'she would have liked you.\n\nCome on. There is a whole world with no ice in it to go and be right about.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { bran: [
      'I lost. I am glad of it. Not mostly. I keep checking, and it is still not mostly.',
      'I am here, and I am staying. That is the roar. You have heard it enough now to know.',
      'Tarrow writes. Badly. Leonids are not built for pens.',
      'The ice was going to hold. I still say so. But I would follow you onto it either way.',
    ] },
  },
};

export const STORIES = [SERA, CORIN, ILYRA, BRAM, DACE, NIX, BRAN];
