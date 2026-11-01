// ROUND 407 -- companion story quests, batch F: Fenna (the Dawn), the four Seekers, the four of the Sands.
// Each replaces its design stub in companionQuests.js (COMPANION_QUEST_DESIGNS) by id.

// ------------------------------------------------------------------------------------------------------- FENNA
// "The bees choose. They'll go quiet around the right one. They went quiet around Aurelian."
const FENNA = {
  id: 'fenna_hive', status: 'built', who: ['fenna'],
  title: 'The Swarm Goes Quiet',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_fenna', title: 'The Bees Chose' },
  offerLabel: 'Ask about the bees',
  offer: [
    ['fenna', `Can I tell you something about the bees? It isn't a nice thing. Well, it's a bit nice.\n\nThey followed me out `
      + `of the temple. Everyone says that like it means they chose me. But the day we left, Aurelian walked out first, and `
      + `they went quiet round him. Not me. I was carrying the hive, and they went quiet round him.`],
    ['fenna', `Bees go quiet around the one they've picked. Ten years I've kept them and they've never once gone quiet on my `
      + `sleeve. I tell myself they're just used to me.\n\nThis week a third of them flew east, towards Bratugal, and didn't `
      + `come back. Bees don't do that unless something's drawn them. Thornwick is at the edge of the green. Would you come `
      + `and help me find out what?`],
  ],
  accept: ['fenna', `Thank you. They'll be pleased. I'll be pleased. One of us will hum about it.`],
  decline: ['fenna', `That's all right. The ones who stayed are still here. I'll count them again.`],
  stages: [
    { id: 'thornwick', title: 'Go to Thornwick',
      log: 'A third of Fenna\'s bees flew east towards Bratugal and did not come back. Go to Thornwick, at the edge of '
        + 'the green, with her.',
      obj: { kind: 'goto', place: { region: 'bratugal', at: 'bra_hamlet_2', dx: 0, dy: 0, r: 10, name: 'Thornwick' } },
      done: [['fenna', `They came this way. There's clover on the wind and something under it that isn't clover.\n\nThe `
        + `man who cuts the paths will know where the wild hives are. Path-cutters always know. They get stung the most.`]] },
    { id: 'vell', title: 'Ask Thorn-cutter Vell',
      log: 'Thorn-cutter Vell cuts the paths into the green east of Thornwick. Ask him whether he has seen Fenna\'s bees, '
        + 'or wild hives, with her there.',
      obj: { kind: 'talk', npc: { settlement: 'bra_hamlet_2', name: 'Thorn-cutter Vell' }, ask: 'Ask about wild hives in the green' },
      talk: [
        ['npc', `The path closes behind you about as fast as you cut it. I tell everyone that. Bees, is it? You've one in your hair.`],
        ['fenna', `She's mine. Have you seen others? A lot of others, coming in from the west this week.`],
        ['npc', `Seen them? I've been cutting round them. There's a thing in a hollow two hours east, shaped like a bell, big `
          + `as a cart, and it rings. Since it started ringing, every bee in the green goes to it. Tame or wild.`],
        ['npc', `I'm guessing the tame ones don't come back.`],
        ['fenna', `No. They wouldn't. A Bellhive doesn't keep bees. It calls them in and keeps them. It's a very bad hive.`],
      ],
      done: [['fenna', `Two hours east. If it's still ringing, some of them are still alive. You don't ring for bees you've already got.`]] },
    { id: 'bell', title: 'Silence the ringing hollow',
      log: 'Something in a hollow east of Thornwick rings, and every bee in the green flies to it. Clear the Bellhive '
        + 'nest that called Fenna\'s swarm away.',
      obj: { kind: 'clear', place: { region: 'bratugal', at: 'bra_hamlet_2', dx: 34, dy: 10, r: 10, name: 'the ringing hollow' },
        tier: 3, families: ['bellhive'], packs: [[0, 0, 4], [5, -3, 3], [-4, 4, 3]] },
      start: 'Hear that? Don\'t listen to it. It isn\'t for you.',
      done: [
        ['fenna', `It's stopped. Listen. Only buzzing now. Proper buzzing.\n\nThey're all over the hollow, mine and wild ones `
          + `together, and they don't know where to go. A swarm with no hive is the most frightened thing in the world. `
          + `They'll make a new one, right here, if nothing comes at them while they do.`],
        ['fenna', `And something will come. The green heard the bell stop too. Will you stand with me while they build? It `
          + `takes as long as it takes. Bees don't hurry for anyone.`],
      ] },
    { id: 'comb', title: 'Guard the new comb',
      log: 'The swarm is building a new hive in the hollow, and the green has heard the bell stop. Hold the hollow with '
        + 'Fenna until the comb is made.',
      obj: { kind: 'waves', place: { region: 'bratugal', at: 'bra_hamlet_2', dx: 34, dy: 10, r: 11, name: 'the new comb' },
        tier: 3, families: ['vinegrasp', 'sixArmApe', 'bloomimp'], waves: [3, 4, 5] },
      start: 'Stand by the comb. Not on it. By it.',
      done: [
        ['narr', 'The last Thornlash drags itself back into the green. Behind Fenna the hollow is gold: new comb on the roots, '
          + 'thousands of bees on it, and the noise of them dropping, slowly, to almost nothing.'],
        ['fenna', `They've gone quiet. They've...\n\nThey're on my sleeve. Look. All down my arm, and not one of them moving.`],
        ['fenna', `Ten years I've told everyone they followed me because they're used to me. I didn't stand in front of that `
          + `comb because I'm used to them. I stood there because they're mine.\n\nThat's it, isn't it. You don't wait to be `
          + `chosen. You stand by the hive, and then you look down, and you have been.`],
        ['narr', 'A few of them lift off her arm, cross the air between you, settle on your sleeve, and go still.'],
        ['fenna', `Oh. Well. I did tell you they were thinking about you. Mind the one on your collar. She's new. They're all new, today.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { fenna: [
      'They\'re quiet. I keep checking, and they keep being quiet. It\'s lovely.',
      'Flowers, flowers, flowers, you. They\'ve added a word.',
      'I don\'t wait to be chosen any more. I stand by the hive. It works out.',
      'The wild ones from the hollow came with us. The abbess would be very upset. The honey\'s even better.',
    ] },
  },
};

// ---------------------------------------------------------------------------------------------------- THESSALY
// "Someone going through doors nobody's opened." Every door so far has been opened for her.
const THESSALY = {
  id: 'thessaly_door', status: 'built', who: ['thessaly'],
  title: 'The Door Nobody Opened',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_thessaly', title: 'Through' },
  offerLabel: 'Ask about the door at the top of the stairs',
  offer: [
    ['thessaly', `I resigned a chair to go through doors. I've been through hundreds. Ptolem read every one first. Calder dug `
      + `round half of them. Isolde broke the ones that wouldn't listen.\n\nIt occurs to me I have never once opened a door. `
      + `I've been shown through them. Very politely. It isn't the same thing.`],
    ['thessaly', `There's a door at the top of the Stepped City that nobody has opened. Not us, not the college, not whoever `
      + `built the stairs. It has a word on it Ptolem won't translate for me, which is the most interesting thing he's ever `
      + `done.\n\nI'd like to open it myself. With someone there who won't do it for me.`],
  ],
  accept: ['thessaly', `Splendid. Bring nothing you'd mind leaving on the other side. I'm joking. Mostly.`],
  decline: ['thessaly', `It's waited a few thousand years. It's very good at being closed.`],
  stages: [
    { id: 'foot', title: 'Stand at the foot of the stairs',
      log: 'Thessaly wants to open the door at the top of the Stepped City herself. Go to the foot of its stairs with '
        + 'her and look up.',
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_ruin', dx: 4, dy: 6, r: 10, name: 'the foot of the stairs' } },
      done: [['thessaly', `There. Right at the top, where the steps stop pretending to be steps. You can just see the lintel.\n\n`
        + `Something is standing on the stairs. Lots of somethings, very still. There's a man at Kepen Rest who says he's been `
        + `as far as the stairs. I want to know exactly what he means by "as far".`]] },
    { id: 'bern', title: 'Ask Bern Hathaway',
      log: 'Bern Hathaway at Kepen Rest says he has been as far as the stairs of the Stepped City. Ask him how far up, '
        + 'with Thessaly there.',
      obj: { kind: 'talk', npc: { settlement: 'ixc_post', name: 'Bern Hathaway' }, ask: 'Ask how far up the stairs he got' },
      talk: [
        ['npc', `Everyone comes asking about the gold. You're the first to ask about the stairs. I've been as far as the `
          + `stairs. That isn't a figure of speech.`],
        ['thessaly', `How far up them?`],
        ['npc', `Eleven steps. There are poles all the way up, carved and painted, taller than a man. On the twelfth step they `
          + `turn their heads. Poles don't have heads. These do, the moment you're on the twelfth.`],
        ['npc', `I came down backwards and I've not been back. There's a door at the top, I'll grant you, and I've wondered `
          + `every night for six years what's behind it. Wondering's cheaper than finding out.`],
        ['thessaly', `Totemstalks. Oh, that's lovely. Somebody put guards on a door and then went away. Nobody guards an empty `
          + `room, Mister Hathaway.`],
      ],
      done: [['thessaly', `Twelve steps. I'll want to count them myself. Habit.`]] },
    { id: 'stairs', title: 'Clear the stairs',
      log: 'Totemstalks stand on the stairs of the Stepped City and turn their heads on the twelfth step. Clear the '
        + 'stairs so Thessaly can climb to the door.',
      obj: { kind: 'clear', place: { region: 'ixcuatl', at: 'ixc_ruin', dx: 6, dy: -14, r: 10, name: 'the stairs' },
        tier: 4, families: ['totemstalk', 'shardling'], packs: [[0, 0, 4], [4, -4, 4], [-3, -8, 3]] },
      start: 'Twelve. And there they go. Isn\'t that interesting.',
      done: [['thessaly', `Clear to the top. A hundred and four steps. The college would want a paper on the steps alone.\n\n`
        + `I don't care about the steps. Look at the door.`]] },
    { id: 'door', title: 'Open the door',
      log: 'The stairs are clear. Climb to the door at the top of the Stepped City with Thessaly. She means to open it '
        + 'herself.',
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_ruin', dx: 8, dy: -30, r: 6, name: 'the door at the top' } },
      start: 'Don\'t touch it. Please. I mean that kindly.',
      done: [
        ['narr', 'The door is one slab of dark stone with no seam, no hinge and no handle. A single line of glyphs runs across '
          + 'it at the height of an elf\'s eyes.'],
        ['thessaly', `Ptolem wouldn't read me this one. I know why now; I can read enough of it myself. It says "ask". That's `
          + `all. Every other door in this city says "speak" or "open" or something with spikes in it, and this one says "ask".`],
        ['thessaly', `I've asked doors nicely for twenty years. The team made a joke of it. I think it was the one thing about `
          + `me this door would have liked.\n\nI'm not going to ask it. I've been shown through enough doors. This one I'm opening.`],
        ['narr', 'She puts her palm flat on the stone. The space around her hand folds, and folds again, and the door is simply '
          + 'not there any more. Cool air comes out of the dark, smelling of nothing anyone has breathed for a very long time. '
          + 'Thessaly goes through first. She does not look back to see whether you are following. She knows you are.'],
        ['thessaly', `Oh. It's another door. Of course it is. Come and look, it's wonderful. It's always doors.`],
      ] },
  ],
  reward: {
    deed: 'place', trust: 4,
    idle: { thessaly: [
      'I opened it. Me. I keep telling the astrolabe. It isn\'t impressed.',
      'There\'s a second door behind the first. I\'m saving it. You don\'t eat all the cake at once.',
      'Ptolem says I was right not to ask it. I\'ve written that down, with the date.',
      'The shape of what\'s about to go wrong. It\'s usually doors. I\'ve stopped minding.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ CALDER
// "Forty digs. Not my name on one of them. I'd follow anyone who'd say my name out loud."
const CALDER = {
  id: 'calder_name', status: 'built', who: ['calder'],
  title: 'Forty-One Digs',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_calder', title: 'Named' },
  offerLabel: 'Ask about the forty digs',
  offer: [
    ['calder', `Forty digs. You know the number, I say it enough. What I don't say is that I keep a list. Every one. Who dug, `
      + `who held the light, who checked the ceiling, and whose name went on the paper.\n\nForty lines. Forty college names. `
      + `Not mine on one of them, until Thessaly.`],
    ['calder', `The Cut goes down through nine layers of city. Nobody's reached the ninth. Kollo stopped at eight; something's `
      + `living at the bottom. Open it, and that's forty-one.\n\nI'd like forty-one to have my name on it. Said out loud, to `
      + `the Society, by somebody who saw me dig it. That's you, if you'll come. You'd only have to watch. And say who did.`],
  ],
  accept: ['calder', `Good. Bring a hat. The Cut drops things on people who don't.`],
  decline: ['calder', `Forty's a round number. Forty-one'll keep.`],
  stages: [
    { id: 'cut', title: 'Go to the Cut',
      log: 'Calder has dug forty sites and been credited on none. Go to the lip of the Cut with him, where nobody has '
        + 'reached the ninth layer.',
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_dig', dx: -4, dy: -6, r: 10, name: 'the lip of the Cut' } },
      done: [['calder', `Nine layers, same street plan in every one. Look down there, you can see the third from here, the `
        + `red brick. Pretty.\n\nKollo runs the trench. He'll tell me straight what's wrong with the ninth. Trenchmasters don't `
        + `take credit, they take blame. Different trade.`]] },
    { id: 'kollo', title: 'Ask Trenchmaster Kollo',
      log: 'Trenchmaster Kollo stopped the dig at the eighth layer of the Cut. Ask him why, with Calder there.',
      obj: { kind: 'talk', npc: { settlement: 'ixc_dig', name: 'Trenchmaster Kollo' }, ask: 'Ask about the ninth layer' },
      talk: [
        ['npc', `The Cut goes down through nine layers of city. You know that, you've got the hat. What you don't know is that `
          + `we stopped at eight.`],
        ['calder', `Why'd you stop?`],
        ['npc', `Ground moved. Not fell. Moved. The cairn-stones we set at the bottom of eight walked down into the ninth on `
          + `their own. Then something came up out of it built from the same stones and stood in my trench. I pulled everyone `
          + `out. The college sent a letter asking why I'd stopped.`],
        ['calder', `Course they did. Did they send anybody?`],
        ['npc', `They sent the letter. Clear the bottom of my trench, foreman, and I'll write it up, and Caro at Lastlight sends `
          + `everything on to the Society. Whose name goes on it is up to whoever stands in front of her.`],
      ],
      done: [['calder', `Six seasons I've known Kollo and never once asked how he writes his reports. Should have.`]] },
    { id: 'trench', title: 'Clear the bottom of the trench',
      log: 'Something built out of the Cut\'s own cairn-stones stands at the bottom of the trench, over the ninth layer. '
        + 'Clear it with Calder.',
      obj: { kind: 'clear', place: { region: 'ixcuatl', at: 'ixc_dig', dx: 10, dy: 18, r: 10, name: 'the bottom of the trench' },
        tier: 3, families: ['cairnbeast', 'geodeback'], packs: [[0, 0, 4], [4, 3, 3], [-4, -3, 3]] },
      start: 'Ceiling\'s sound. Walls are sound. That isn\'t. Go.',
      done: [['calder', `There. Ninth layer, under the rubble. Same street. Same corner. Somebody laid this plan out nine times `
        + `over and I've just put my spade through the first of them.\n\nSit with me a minute before we go up. I want to say `
        + `something and I don't want to shout it up a trench.`]] },
    { id: 'sit', title: 'Sit with Calder',
      log: 'The ninth layer of the Cut is open. Calder wants to say something before anyone reports it. Sit with him at '
        + 'the bottom of the trench.',
      obj: { kind: 'confide', ask: 'Sit with Calder at the bottom of the trench' },
      talk: [
        ['calder', `First dig I ever worked, I was fifteen. I found a cup. Clay. A thumbprint in the handle where whoever made it `
          + `held it wet. The professor put it in his paper as "a vessel, recovered". Recovered. Like it had been ill.`],
        ['calder', `I don't want my name on things for glory. I've no use for glory, it doesn't dig. I want it on them because `
          + `I was there. So that somebody reading it in a hundred years knows a man with a spade stood here and was careful.\n\n`
          + `That cup had a thumbprint. Somebody made it. Nobody wrote her down either.`],
        ['calder', `Thessaly puts my name first. She's the only one who ever has. Just once I'd like it said by somebody who `
          + `isn't being kind to me. Somebody who just says what happened.`],
      ],
      done: [['calder', `Right. Lastlight. Caro sends the reports on. You tell her. I'll stand there and try to look like I'm not listening.`]] },
    { id: 'report', title: 'Report the ninth layer',
      log: 'Expedition Lead Caro at Lastlight Camp sends every find on to the Society. Report the ninth layer of the Cut '
        + 'to her, out loud, under Calder Penhallow\'s name.',
      obj: { kind: 'talk', npc: { settlement: 'ixc_camp', name: 'Expedition Lead Caro' }, ask: 'Report the ninth layer, under Calder\'s name' },
      talk: [
        ['npc', `Lastlight. Last place with a name somebody alive gave it. You're from the Cut? Kollo's runner said there'd be a report.`],
        ['narr', 'You tell her. The ninth layer, opened. The same street plan as the eight above it. Who cleared the trench, who '
          + 'checked the ceiling, who put the spade through. You say his name.'],
        ['npc', `Calder Penhallow. Foreman. Spell it for me, properly. This goes to the Society hall in Cadence and to the college, `
          + `and the college copies it into everything it prints about the Cut for the next fifty years.`],
        ['calder', `P-E-N-H-A-L-L-O-W. Two Ls. Both of them.`],
      ],
      done: [
        ['narr', 'Caro blots the page and turns it round so he can see it. Ninth layer, The Cut. Excavated by C. Penhallow. It '
          + 'is the first line on the page. There is no other name above it.'],
        ['calder', `Forty-one.\n\nHuh. It's smaller than I thought. The writing. I always thought, when I finally saw it, it'd be bigger.`],
        ['calder', `I'm going to write to the college. Not to complain. To tell them there was a woman who made a cup with her `
          + `thumb in the handle, on my first dig, and they wrote her down as "recovered". She hasn't got a name. She ought to `
          + `have "made by" in front of her, at least. Somebody ought to say so.`],
        ['calder', `Thank you. You said it like it was just what happened. That's all I wanted.\n\nCome on. There's a ceiling `
          + `somewhere that needs checking.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { calder: [
      'Forty-one. I\'ve written it at the top of the list, in my own hand, which is terrible.',
      'Check the ceiling. Then say who checked it. That\'s the whole job.',
      'Kollo wrote. They\'re digging the ninth layer properly now. He spelt my name right.',
      'I don\'t need it said every time. Once was enough. Well. Twice wouldn\'t hurt.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ ISOLDE
// "Has never once lost her temper, which is somehow more frightening." Thessaly is not always walking with you, so the
// one who walks into the fight is the lost party's boy, doing exactly what Thessaly would do.
const ISOLDE = {
  id: 'isolde_temper', status: 'built', who: ['isolde'],
  title: 'Protecting Thessaly From Thessaly',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_isolde', title: 'Composure' },
  offerLabel: 'Ask about the party past the last name',
  offer: [
    ['isolde', `I have never lost my temper. People take that for a virtue. It is a habit. I keep it the way I keep the rapier: `
      + `oiled, and in its sheath.\n\nI do not know what is under it. I have never let it out to look.`],
    ['isolde', `Lastlight Camp lost a party this season. Six of them, past the last named place on Caro's map. Thessaly wants `
      + `to go and find them. Thessaly wants to go and find everything.\n\nI would rather go first. With you, and not with her. `
      + `If something is going to cost me my composure, I would like it to be somewhere she cannot watch.`],
  ],
  accept: ['isolde', `Good. Calmly, please. There is no hurry. That is the point.`],
  decline: ['isolde', `Very well. She will ask again tomorrow. I will say no again. I am good at that.`],
  stages: [
    { id: 'lastlight', title: 'Go to Lastlight Camp',
      log: 'A party went past the last name on Lastlight Camp\'s map and did not come back. Isolde wants to go before '
        + 'Thessaly does. Go to Lastlight Camp with her.',
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_camp', dx: 0, dy: 0, r: 10, name: 'Lastlight Camp' } },
      done: [['isolde', `The quartermaster is doing the evening count twice. Six short. He does it every evening, and the number `
        + `does not change.\n\nCaro sent them. She'll know where.`]] },
    { id: 'caro', title: 'Ask Expedition Lead Caro',
      log: 'Expedition Lead Caro sent the lost party out past the last name on her map. Ask her where they went, with '
        + 'Isolde there.',
      obj: { kind: 'talk', npc: { settlement: 'ixc_camp', name: 'Expedition Lead Caro' }, ask: 'Ask about the party that went past the last name' },
      talk: [
        ['npc', `Lastlight Camp is the last place with a name somebody alive gave it. Everything past this is named by the people `
          + `who left. Six of mine left. Nine days ago.`],
        ['isolde', `Where did they go?`],
        ['npc', `North-east, to the standing water past the ridge. There's glass in the reeds there, long pieces standing up like a `
          + `fence. They wanted to know who made it. Nobody made it. It walks.`],
        ['npc', `The last runner back said the glass came up out of the water and they scattered, and the youngest of them went `
          + `back in after the others. That's all he said. I have a list of their names I don't want to finish.`],
        ['isolde', `Thessaly would have gone in after him. I came so that she would not have to. Thank you, Lead Caro.`],
      ],
      done: [['isolde', `Glass that walks. She will be furious she missed it. Calmly furious. She learned that from me.`]] },
    { id: 'reeds', title: 'Clear the glass reeds',
      log: 'Glasswaders stand in the reeds by the water north-east of Lastlight Camp, where the lost party was last seen. '
        + 'Clear them with Isolde.',
      obj: { kind: 'clear', place: { region: 'ixcuatl', at: 'ixc_camp', dx: 28, dy: -22, r: 10, name: 'the glass reeds' },
        tier: 3, families: ['glasswader'], packs: [[0, 0, 4], [4, -3, 4], [-4, 3, 3]] },
      start: 'Slowly. Watch the water, not the glass.',
      done: [
        ['isolde', `Packs. Rope. A boot. A journal with its pages gone stiff. They were here.\n\nAnd tracks going out into the `
          + `water. Small ones, on top of the large ones. He went back in.`],
        ['isolde', `The water is moving. More of them. Stand with me. Do not hurry.`],
      ] },
    { id: 'hold', title: 'Hold the reeds',
      log: 'More Glasswaders are coming up out of the standing water. Hold the reeds with Isolde, and keep your composure.',
      obj: { kind: 'waves', place: { region: 'ixcuatl', at: 'ixc_camp', dx: 28, dy: -22, r: 11, name: 'the glass reeds' },
        tier: 4, families: ['glasswader', 'tidalTroll', 'shardling'], waves: [4, 5, 6] },
      start: 'Now. Calmly.',
      done: [
        ['narr', 'In the middle of the last wave a figure stumbles up out of the reeds, between you and the water: a young man in '
          + 'a Lastlight coat, nine days thin, dragging someone by the collar. He walks straight into the fight. He is not looking '
          + 'where he goes. He is looking for the others.'],
        ['narr', 'Isolde\'s sword arm goes white to the shoulder. For one heartbeat the air around her cracks with frost, the '
          + 'reeds freeze in a ring, and her face does something you have never seen it do.\n\nThen she breathes out. The frost '
          + 'stops at her feet. She steps in front of him, unhurried, and puts the last Glasswader down with one thrust, as if it '
          + 'were a lesson.'],
        ['isolde', `Behind me. Slowly. You have done enough walking in after people for one week. That is my work, and I am very `
          + `calm about it.`],
        ['isolde', `So that is what is under it. I wondered. It is not rage. It is fear, for whoever walks into the fight without `
          + `looking. I have been afraid for Thessaly every day since I joined her, and keeping it still.`],
        ['isolde', `I can keep it still. That is composure. I thought it was not having the thing. It is holding it.\n\nTake `
          + `them home. I'll walk behind.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { isolde: [
      'I nearly lost it, by the reeds. I didn\'t. I know what is there now. It is only fear. I can hold fear.',
      'The boy writes to Lastlight every week. Caro tells me he is learning to look where he walks.',
      'Thessaly asked what happened. I told her. She said, "Oh, you do love me." I froze her tea.',
      'Calmly. There is never any hurry. I am sure of it now, instead of hoping.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ PTOLEM
// "My own skin is written in one nobody's ever been able to read." The climax is one line read in time.
const PTOLEM = {
  id: 'ptolem_script', status: 'built', who: ['ptolem'],
  title: 'The Script on His Skin',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_ptolem', title: 'Read in Time' },
  offerLabel: 'Ask about the script on his skin',
  offer: [
    ['ptolem', `I've read forty-three dead languages. I've taught eleven of them to people who wanted them back. The one on my `
      + `own skin I can't read a word of. I've copied it out of a mirror so often my handwriting has started to look like it.`],
    ['ptolem', `Scholar Teyn at the Cut sent me a sketch last month, from the lintels in the Stepped City. One of the shapes is `
      + `mine. It's on the inside of my left wrist.\n\nI'd like to know what I say. Before I die, preferably. Will you come to `
      + `the Stepped City with me? I'd like to stand where it might have been written.`],
  ],
  accept: ['ptolem', `Thank you. Read the floor, not the sign. I'll remind you. Repeatedly.`],
  decline: ['ptolem', `Of course. It's waited fifty-five years. It's written in a very patient hand.`],
  stages: [
    { id: 'street', title: 'Walk the lower street',
      log: 'Ptolem\'s skin is written in a script nobody can read, and a glyph in the Stepped City matches it. Walk the '
        + 'lower street of the Stepped City with him.',
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_ruin', dx: -10, dy: 8, r: 10, name: 'the lower street' } },
      done: [['ptolem', `Here. And here. On the lintels, the same shapes as my wrist. Not the same words. The same hand. Somebody `
        + `who wrote like me wrote all over this street.\n\nTeyn has the plan of the layers at the Cut. I'd like to see it laid `
        + `next to my arm.`]] },
    { id: 'teyn', title: 'Ask Scholar Teyn',
      log: 'Scholar Teyn at the Cut has mapped the street plan that repeats through all nine layers. Ask him about it, '
        + 'with Ptolem there.',
      obj: { kind: 'talk', npc: { settlement: 'ixc_dig', name: 'Scholar Teyn' }, ask: 'Ask about the repeating plan' },
      talk: [
        ['npc', `Every layer has the same street plan. Nobody copies a plan for nine generations unless they were told to. Ptolem. `
          + `I hoped you'd come. Hold out your arm.`],
        ['ptolem', `I've been holding it out for fifty years. Go on.`],
        ['npc', `There. And there. Your script is the script of the plan's notes. Not the doors, the notes in the margin. `
          + `Somebody wrote instructions on the plan in your hand, and the plan was copied nine times with them on it.`],
        ['npc', `There's a tablet with a long run of it. The diggers saw it in a niche under the Stepped City's east wall. `
          + `Scalecurls have laired there since. Nobody's gone back for it.`],
        ['ptolem', `Instructions. Not a prayer, not a poem. Instructions. I'm a little disappointed and very excited.`],
      ],
      done: [['ptolem', `Mostly the second one. The east wall, then.`]] },
    { id: 'tablet', title: 'Recover the tablet',
      log: 'A tablet written in Ptolem\'s script lies in a niche under the Stepped City\'s east wall, in a Scalecurl lair. '
        + 'Clear the lair and bring it out.',
      obj: { kind: 'retrieve', place: { region: 'ixcuatl', at: 'ixc_ruin', dx: 30, dy: 2, r: 10, name: 'the niche under the east wall' },
        tier: 4, families: ['scalecurl'], packs: [[0, 0, 4], [4, 3, 3], [-4, -3, 4]], item: 'the tablet in his script' },
      start: 'Mind the floor. Mind it more than them.',
      done: [['ptolem', `Forty lines. Look at the hand. It isn't like mine. It is mine. The same slope, the same way of crossing a `
        + `stroke.\n\nSit with me. I need to lay this beside my arm before I lose my nerve.`]] },
    { id: 'read', title: 'Sit with Ptolem while he reads',
      log: 'Ptolem has the tablet. Sit with him while he lays it beside his arm and reads what is written on him.',
      obj: { kind: 'confide', ask: 'Sit with Ptolem while he reads' },
      talk: [
        ['ptolem', `Line one goes with my right forearm. Line two with the inside of the elbow. It's a key. I'm half a dictionary, `
          + `apparently, and this is the other half.`],
        ['ptolem', `It's a builder's script. Not for doors. For floors. Every line on me is a note about where not to step. `
          + `"Third stone loose." "The bell is not a bell." "Do not trust the glyph that says doorbell." I've said that one out `
          + `loud for years and never knew it was written on my back.`],
        ['ptolem', `Somebody wrote a trapmaker's notes on a runic child, and the child grew up to read floors for a living. I `
          + `don't know if that's fate or a joke. Thessaly will say fate. Calder will say plumbing.`],
        ['ptolem', `I can read about a third of it now. Slowly. Let's go back up through the street. I'd like to read it where it `
          + `was meant to be read.`],
      ],
      done: [['ptolem', `Up, then. Walk where I walk. I mean that literally, for once.`]] },
    { id: 'trap', title: 'Walk where he walks',
      log: 'Ptolem can read a third of the script on his skin now. Clear the street above the niche with him, and walk '
        + 'where he walks.',
      obj: { kind: 'clear', place: { region: 'ixcuatl', at: 'ixc_ruin', dx: -6, dy: -12, r: 10, name: 'the stair street' },
        tier: 4, families: ['totemstalk', 'shardling'], packs: [[0, 0, 4], [5, -2, 3], [-4, 4, 4]] },
      start: 'Left foot. No. Your other left.',
      done: [
        ['narr', 'The last Shardling breaks. As you step toward the stairs, Ptolem\'s hand closes on your collar hard enough to '
          + 'stop you dead.'],
        ['ptolem', `Don't. Don't move. Inside of my left wrist: "Where the street turns to stairs, the first step is the bell." `
          + `It was written for this street. I just read it.`],
        ['narr', 'He lowers his measuring rod onto the step in front of your foot. The stone sinks a finger\'s width. Blades come '
          + 'out of the walls on both sides at neck height, stop, and slide back.'],
        ['ptolem', `In time. I read it in time. Fifty-five years I've carried a warning around, and today it was for you.`],
        ['ptolem', `I don't know who wrote it on me, or why. I know what it's for now. That's more than most texts ever get. `
          + `Most of them never find their reader. I found mine. It was me.`],
      ] },
  ],
  reward: {
    deed: 'book', trust: 4,
    idle: { ptolem: [
      'A third of me, read. I\'m working on the rest. Between traps, as ever.',
      '"Do not trust the glyph that says doorbell." It\'s on my shoulder. I\'ve been right for fifty years.',
      'Walk where I walk. I mean it more than I used to.',
      'Teyn wants to publish me. I\'ve told him I\'m not finished.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- RHAZA
// "Someone who brings everyone across. The sand doesn't care who's tired. A leader carries the tired one."
const RHAZA = {
  id: 'rhaza_crossing', status: 'built', who: ['rhaza'],
  title: 'The Last Caravan',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_rhaza', title: 'Carried Across' },
  offerLabel: 'Ask about the last caravan',
  offer: [
    ['rhaza', `The caravans stopped. You know that. What I haven't told you is that one didn't.\n\nWhen I brought my people `
      + `north, Hadi's caravan was still out on the pan. Old salt, small beasts, eleven people. Too slow to come with us. `
      + `They said they'd follow. They've been following for a year.`],
    ['rhaza', `Word came through the Society desk. Zahra read it to me. They're stuck near Salt Gate. Barbtails on the pan, `
      + `the beasts spent, and some of them are children. I led caravans ten years and never lost one. I won't lose the last `
      + `one from a city with too many corners.\n\nCome across with me. You don't need to know the sand. You need to be `
      + `willing to walk slowly.`],
  ],
  accept: ['rhaza', `Good. Water first. Then talk. Fill your skin before we go.`],
  decline: ['rhaza', `I understand. I'll tell my people we're waiting. They're good at it. I'm not.`],
  stages: [
    { id: 'gate', title: 'Go to Salt Gate',
      log: 'One salt caravan is still out on the Sirukh pan, a year behind the rest of Rhaza\'s people. Go to Salt Gate '
        + 'with her.',
      obj: { kind: 'goto', place: { region: 'sirukh', at: 'sir_village', dx: 0, dy: 0, r: 10, name: 'Salt Gate' } },
      done: [['rhaza', `No caravan. Only the gate in the salt, with no wall either side. We used to camp under it.\n\nThe one who `
        + `rakes the pan will know where they are. Panwalkers see everything that's flat.`]] },
    { id: 'hess', title: 'Ask Panwalker Hess',
      log: 'Panwalker Hess rakes the pan at Salt Gate at dawn and dusk. Ask him where Rhaza\'s last caravan is, with her there.',
      obj: { kind: 'talk', npc: { settlement: 'sir_village', name: 'Panwalker Hess' }, ask: 'Ask about the caravan still out on the pan' },
      talk: [
        ['npc', `You rake the pan at dawn and at dusk. In between you stay off it. Your friends didn't, and I can't say I blame `
          + `them, with what's on it.`],
        ['rhaza', `Where are they?`],
        ['npc', `South, out by the old cairn line. Eleven of them and four beasts, one lame. They came in close a week back and `
          + `the Barbtails turned them. Thick on the pan this year. They burrow in the cool and come up in the heat, and your `
          + `people walk in the heat because they can't see at night.`],
        ['rhaza', `Hadi always hated walking at night. Stubborn old man.`],
        ['npc', `Thin the Barbtails out and they'll walk straight in. Then get them off the pan. Salt Gate's no place to rest. `
          + `Dunmouth has a well.`],
      ],
      done: [['rhaza', `Barbtails. In the sand you fight what comes. Good. That part I know how to do.`]] },
    { id: 'barbtails', title: 'Thin the Barbtails',
      log: 'Barbtails are thick on the Sirukh pan and have turned Rhaza\'s last caravan back. Kill ten of them anywhere '
        + 'in Sirukh Sands.',
      obj: { kind: 'cull', region: 'sirukh', families: ['scorpion'], need: 10 },
      start: 'They come up in the heat. So do I.',
      done: [
        ['narr', 'By the time the tenth Barbtail stops twitching there are figures on the white pan to the south: four beasts, '
          + 'one limping, and eleven people walking very slowly toward you.'],
        ['rhaza', `That's them. That's Hadi in front, he always walks in front. And that's fewer beasts than they left with.\n\n`
          + `Fill your water. We're taking them to Dunmouth.`],
      ] },
    { id: 'across', title: 'Bring them across',
      log: 'Rhaza\'s last caravan is in off the pan, tired and slow. Walk them to the well at Dunmouth, and keep Rhaza at '
        + 'your shoulder.',
      obj: { kind: 'escort', place: { region: 'sirukh', at: 'sir_hamlet', dx: 2, dy: 2, r: 12, name: 'the well at Dunmouth' } },
      start: 'Slowly. Slower than that. Watch the back, not the front.',
      done: [
        ['narr', 'Halfway to Dunmouth the youngest of them sits down in the sand and does not get up. He is perhaps seven. The '
          + 'beasts are carrying the salt and the old ones. There is nothing left to carry him.'],
        ['rhaza', `Of course. There's always one. That isn't a complaint. That's the whole of the job.`],
        ['narr', 'Rhaza hands you her spear without looking, kneels, and lifts the boy onto her back. She walks the rest of the '
          + 'way like that, at the back of the line, not the front. Nobody passes her and nobody falls behind her.'],
        ['rhaza', `Ten years and I never lost a caravan. I thought it was because I walked in front. It wasn't. You find the water `
          + `from the front. You get everyone across from the back.`],
        ['rhaza', `In the city I've been walking in front. Finding the hall, the signs, the right line to sign on. My people have `
          + `been at the back with nobody behind them.\n\nThat changes. Here's the well. Water first. You drink first. You `
          + `carried the spear.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { rhaza: [
      'Hadi\'s people have lodging now, beside the rest of mine. Everyone is across.',
      'I walk at the back now. I can see everyone from there.',
      'The boy wants a spear. I gave him a stick. He is very fierce with it.',
      'Water first. You first. I\'ll be at the back, carrying the tired one.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- TAREK
// "There's always a thing in the water." The thing has a name, and he sails anyway.
const TAREK = {
  id: 'tarek_water', status: 'built', who: ['tarek'],
  title: 'The Thing in the Water',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_tarek', title: 'Sailed Anyway' },
  offerLabel: 'Ask about the thing in the water',
  offer: [
    ['tarek', `You know how I say there's always a thing in the water? I say it like a joke. Everyone laughs.\n\nMy last ship `
      + `went down on the Quay reef with my cousin on it. I was on the dock, sick that morning. I never sailed again. I walked `
      + `across a desert instead. That's the joke, really.`],
    ['tarek', `My mother sent word. Reefpilot Oja is bringing a salt ship in through the reef, the first in a year, and he `
      + `wants a harpoon in the bow. He asked for me. By name.\n\nI'd like to say no. I'd like to say yes more. Come to the `
      + `Quay with me and stop me running? I'll pay you wages up front, for once.`],
  ],
  accept: ['tarek', `Right, captain. Bring something you don't mind getting wet. I mean you.`],
  decline: ['tarek', `Ha. No. Good. I'll tell Oja I'm busy. I'm very busy. Not sailing.`],
  stages: [
    { id: 'quay', title: 'Go to Tolbrand Quay',
      log: 'Reefpilot Oja wants Tarek\'s harpoon in the bow of the first salt ship through the reef in a year. Go to '
        + 'Tolbrand Quay with him.',
      obj: { kind: 'goto', place: { region: 'sirukh', at: 'sir_town', dx: 0, dy: 0, r: 10, name: 'Tolbrand Quay' } },
      done: [['tarek', `Smells the same. Tar and salt and fish, and my mother's cooking from three streets off. I'd know it blind.\n\n`
        + `Oja will be on the quay, standing where he can see the reef. He always is.`]] },
    { id: 'oja', title: 'Ask Reefpilot Oja',
      log: 'Reefpilot Oja pilots every ship through the reef off Tolbrand Quay. Ask him about bringing the salt ship in, '
        + 'with Tarek there.',
      obj: { kind: 'talk', npc: { settlement: 'sir_town', name: 'Reefpilot Oja' }, ask: 'Ask about bringing the ship in' },
      talk: [
        ['npc', `Nobody sails into Tolbrand Quay without a pilot. The reef's on every chart and the charts are all wrong by about `
          + `a boat's width. Tarek Vell. Your mother said you'd say no.`],
        ['tarek', `I haven't said anything yet.`],
        ['npc', `You're not saying it very loudly. Listen. The charts aren't wrong because the reef moved. Something lives on it `
          + `now that likes a hull to come in close. Saltwives. They sit on the rocks and sing a ship a boat's width off true.`],
        ['npc', `That's what took your cousin's ship. Not the sea. Them. I've a ship coming through full of salt and families, and `
          + `I want the reef quiet and a harpoon in the bow. Yours was the best on the Quay.`],
        ['tarek', `Was.`],
        ['npc', `Is. Your mother told me that too.`],
      ],
      done: [['tarek', `Saltwives. A thing in the water with a name. Huh. It's easier, somehow, when it's got a name.`]] },
    { id: 'reef', title: 'Clear the reef',
      log: 'Saltwives sit on the reef off Tolbrand Quay and sing ships a boat\'s width off true. One of them sang Tarek\'s '
        + 'cousin onto the rocks. Clear the reef.',
      obj: { kind: 'clear', place: { region: 'sirukh', at: 'sir_town', dx: -22, dy: 18, r: 10, name: 'the reef rocks' },
        tier: 2, families: ['saltwife'], packs: [[0, 0, 4], [4, -3, 3], [-4, 3, 3]] },
      start: 'Don\'t listen to them. Listen to me. I\'m much worse at singing.',
      done: [['tarek', `Rocks are quiet. I can hear the water again. Just water.\n\nThere's the ship, coming round the point. And `
        + `there's more of them, coming up off the deep side. Of course. Stand on the reef with me. I'm not getting in any boat `
        + `until that ship is through.`]] },
    { id: 'ship', title: 'Hold the reef',
      log: 'The salt ship is coming through the reef, and more Saltwives are coming up from the deep side. Hold the reef '
        + 'with Tarek until it is through.',
      obj: { kind: 'waves', place: { region: 'sirukh', at: 'sir_town', dx: -22, dy: 18, r: 11, name: 'the reef rocks' },
        tier: 2, families: ['saltwife', 'lurefin', 'drownwight'], waves: [3, 4, 5] },
      start: 'Here they come. Hold the reef. Hold the reef.',
      done: [
        ['narr', 'The last Saltwife slides off the rocks and does not come back up. Past the reef the salt ship comes through a '
          + 'boat\'s width wide of where the charts say, exactly where Oja put it.'],
        ['tarek', `Through. It's through. Nobody on it even knows there was a thing in the water.`],
        ['narr', 'A small boat pulls back across from the ship to the reef. Oja sits in the stern with a spare harpoon across his '
          + 'knees, holding it out.'],
        ['tarek', `I said I'd stand on the reef. I never said I'd get in the boat.`],
        ['tarek', `There's always a thing in the water. There is. I was right about that. I thought it meant you don't go out. It `
          + `doesn't. It means you go out with a harpoon, and somebody who can see the rocks.\n\nHold my wages, captain. I'm `
          + `sailing the last bit in. Wave at my mother if you see her. She'll be the one pretending not to watch.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { tarek: [
      'I sailed into the Quay. Bow, harpoon, the lot. My mother cried. She says it was the wind.',
      'There\'s always a thing in the water. Now I know its name. Still don\'t like it.',
      'Oja wants me back for the next ship. I said maybe. I meant yes.',
      'Water\'s better with a harpoon in your hand, captain. Most things are.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- ZAHRA
// "The only one of the four who reads." She reads for everyone; nobody reads for her.
const ZAHRA = {
  id: 'zahra_signs', status: 'built', who: ['zahra'],
  title: 'Reading the Signs',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_zahra', title: 'Read Aloud' },
  offerLabel: 'Ask about the marker in the sand',
  offer: [
    ['zahra', `I read for all four of us. The stars for the road, the notices for the hall, the contracts for Rhaza, who signs `
      + `every line. I've read aloud more this year than in the forty before it.\n\nNobody has ever read anything to me. That `
      + `isn't a complaint. It's an observation. I'm a navigator. I notice things.`],
    ['zahra', `Hafsa Quill at Dunmouth wrote to the hall. The dune moved again and uncovered a caravan marker. Carved. She says `
      + `it has a name on it, and she thinks it's mine.\n\nI'd like to see it. I'd like someone with me who will let me read it `
      + `myself, and not tell me what it says first.`],
  ],
  accept: ['zahra', `Good. Bring water. And patience, though I have enough for both of us.`],
  decline: ['zahra', `Then it stays in the sand. Sand is a very good keeper of things.`],
  stages: [
    { id: 'dunmouth', title: 'Go to Dunmouth',
      log: 'Hafsa Quill wrote that a moving dune at Dunmouth uncovered an old caravan marker with Zahra\'s name on it. Go '
        + 'to Dunmouth with Zahra.',
      obj: { kind: 'goto', place: { region: 'sirukh', at: 'sir_hamlet', dx: 0, dy: 0, r: 10, name: 'Dunmouth' } },
      done: [['zahra', `Rebuilt again, a little further back. Dunmouth moves away from the dunes like someone backing out of a `
        + `room.\n\nHafsa will be wherever the sand most recently gave something back.`]] },
    { id: 'hafsa', title: 'Ask Hafsa Quill',
      log: 'Hafsa Quill watches what surfaces when the sand shifts at Dunmouth. Ask her about the marker, with Zahra there.',
      obj: { kind: 'talk', npc: { settlement: 'sir_hamlet', name: 'Hafsa Quill' }, ask: 'Ask about the marker' },
      talk: [
        ['npc', `Things surface when the sand shifts. Old things, and once something that was not old at all. This is the old `
          + `kind. Mostly.`],
        ['zahra', `Mostly?`],
        ['npc', `The stone's old. The carving isn't. Fifteen years, perhaps. It's a waymarker, the kind the caravans put up, `
          + `with more writing on it than a waymarker needs. I can't read the dialect. I could read your name, because it's `
          + `spelt the way the Society spells it.`],
        ['npc', `It came up in the hollow south of the well, where the Driftreavers nest when the dune moves. They've built round `
          + `it. They like anything that stands still.`],
        ['zahra', `So do I. That's rather the trouble.`],
      ],
      done: [['zahra', `The caravan dialect. Only the guides use it, and the guides can't write. That's what it's for. Somebody `
        + `went to a great deal of trouble.`]] },
    { id: 'marker', title: 'Uncover the marker',
      log: 'An old caravan marker has surfaced in the hollow south of Dunmouth\'s well, and Driftreavers have nested round '
        + 'it. Clear the nest and uncover the marker.',
      obj: { kind: 'retrieve', place: { region: 'sirukh', at: 'sir_hamlet', dx: 8, dy: 26, r: 10, name: 'the hollow south of the well' },
        tier: 2, families: ['driftreaver'], packs: [[0, 0, 4], [5, 2, 3], [-4, -3, 3]], item: 'the caravan marker' },
      start: 'The falcon sees six. I see five. She\'s usually right.',
      done: [['zahra', `There it is. A waystone, the old shape, with a cup cut in the top for rainwater. Guides' marks along `
        + `the bottom. They couldn't write. Somebody held their hands.\n\nDon't read over my shoulder. Sit with me instead.`]] },
    { id: 'aloud', title: 'Sit with Zahra',
      log: 'Zahra has the marker. Sit with her while she reads it, and let her read it herself.',
      obj: { kind: 'confide', ask: 'Sit with Zahra while she reads the marker' },
      talk: [
        ['zahra', `Waymarkers say three things. Water, how far. Danger, what kind. And who to follow. They nearly always say `
          + `"follow the stars". It's tradition. Nobody checks.`],
        ['zahra', `This one says: water, half a day east. Danger, the pan in the heat. And where "follow the stars" ought to be...`],
        ['narr', 'She stops reading. For a while she only holds her hand flat over the carving, the way you would over a fire.'],
        ['zahra', `Give me a moment. I'm going to read it out loud. I've never had to work up to reading something out loud in my life.`],
      ],
      done: [
        ['zahra', `"Follow Zahra. She reads the stars so we don't have to. When she is old, somebody read this to her."`],
        ['zahra', `The guides couldn't write. So they paid a scribe a month of salt to carve it, every one of them, and set it `
          + `where the dune would keep it, and never told me. They knew it would surface one day. They knew I'd be the one who read it.`],
        ['zahra', `They were wrong about one thing. I'm not old. I'm fifty-eight. I'm a celestine. It's practically girlhood.\n\n`
          + `They were right about the rest. Somebody read it to me. It was me, aloud, with you listening. That counts. I've `
          + `decided it counts.`],
        ['narr', 'The falcon made mostly of light settles on the stone, and for once Zahra does not tell anybody what anything means.'],
      ] },
  ],
  reward: {
    deed: 'book', trust: 4,
    idle: { zahra: [
      'I read it aloud. It\'s still the best thing I\'ve ever read, and I read contracts.',
      'Rhaza asked what the stone said. I told her it said "welcome". She knew. She cried anyway.',
      'Follow the stars. Or me. I\'m told it comes to much the same.',
      'I\'ll read for all of you. Somebody read for me once. It holds.',
    ] },
  },
};

// -------------------------------------------------------------------------------------------------------- MOTT
// "Has walked the Salt Gate road forty times and never been in a building with a second floor."
const MOTT = {
  id: 'mott_road', status: 'built', who: ['mott'],
  title: 'The Forty-First Walk',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_mott', title: 'The Second Floor' },
  offerLabel: 'Ask about the second floor',
  offer: [
    ['mott', `Forty times across the Salt Gate road. Everybody knows that. I tell them.\n\nI don't tell them about the Tolbrand `
      + `warehouse. First time I came to the Quay I was a boy, carrying salt. The salt went upstairs. I didn't. I stood at the `
      + `bottom and let a younger man carry it up, and every time after that I found a reason.`],
    ['mott', `I climbed the Society's stairs. Holding the wall. You saw. That was a city building, full of clerks. It doesn't `
      + `count.\n\nI'd like to walk the road once more. The forty-first. With someone who won't hurry me and won't help me up. `
      + `And at the end of it I'd like to go up those stairs and see where the salt went.`],
  ],
  accept: ['mott', `Good. Slowly. Don't wait for me. I'll get there.`],
  decline: ['mott', `Hm. Not yet, then. The stairs aren't going anywhere. Neither am I, quickly.`],
  stages: [
    { id: 'walk', title: 'Walk the road to Salt Gate',
      log: 'Old Mott wants to walk the Salt Gate road for the forty-first time. Walk it with him to the gate in the salt, '
        + 'keep him at your shoulder, and do not hurry him.',
      obj: { kind: 'escort', place: { region: 'sirukh', at: 'sir_village', dx: 4, dy: 2, r: 10, name: 'the gate in the salt' } },
      start: 'Slowly. The road\'s not going anywhere.',
      done: [['mott', `There. Forty-one, as far as the gate. Feel the road under the sand? Harder there. Forty years of feet, `
        + `some of them mine.\n\nThe toll-taker will want paying. He'll want telling something, too. He always looks like a `
        + `man who wants telling something.`]] },
    { id: 'ansh', title: 'Pay Toll-taker Ansh',
      log: 'Toll-taker Ansh takes the toll at Salt Gate and has stopped asking about what crosses at night. Pay him and ask '
        + 'about the road to the Quay, with Mott there.',
      obj: { kind: 'talk', npc: { settlement: 'sir_village', name: 'Toll-taker Ansh' }, ask: 'Ask what crosses the road at night' },
      talk: [
        ['npc', `Everything crossing the pan pays here. Everything crossing at night doesn't, and I've stopped going out to ask `
          + `why. Mott. Forty times, and you still pay the toll.`],
        ['mott', `Forty-one. And I pay. It's the road's money. Not yours.`],
        ['npc', `Then I'll tell you what I tell nobody who pays. What crosses at night isn't smugglers. Rimehares, come down off `
          + `somewhere cold, and Barbtails following them for the meat. They've been on the road north since spring. Nobody's `
          + `walked it end to end since.`],
        ['mott', `Rimehares. In the Sirukh. Hm. The world's getting odd. Still a road.`],
      ],
      done: [['mott', `Two kinds of trouble on one road. Good. It's never been just the one.`]] },
    { id: 'road', title: 'Open the road',
      log: 'Rimehares, and the Barbtails that follow them, have shut the road north of Salt Gate since spring. Clear them '
        + 'off the road with Old Mott.',
      obj: { kind: 'clear', place: { region: 'sirukh', at: 'sir_village', dx: -34, dy: -30, r: 10, name: 'the road north of the gate' },
        tier: 2, families: ['rimehare', 'scorpion'], packs: [[0, 0, 4], [4, -3, 3], [-3, 4, 4]] },
      start: 'Head down. Walk through it.',
      done: [['mott', `Road's open. I'll count the rest of it as walked. My knees agree.\n\nThe Quay, then. The Tolbrand `
        + `warehouse, by the water. The one with the stairs.`]] },
    { id: 'stairs', title: 'Climb to the second floor',
      log: 'The road is walked. The Tolbrand warehouse at Tolbrand Quay has a second floor, where the salt went every time '
        + 'Mott carried it. Go there with him.',
      obj: { kind: 'goto', place: { region: 'sirukh', at: 'sir_town', dx: 6, dy: 4, r: 6, name: 'the Tolbrand warehouse' } },
      start: 'There. Same stairs. They\'ve painted them. Didn\'t help.',
      done: [
        ['narr', 'The stairs in the Tolbrand warehouse are steep and narrow, worn hollow in the middle by sixty years of salt '
          + 'sacks. Old Mott puts one hand on the wall and his stick on the first step, and does not look at you.'],
        ['mott', `Don't help me. I mean it. Stand there. Stand where I can see you not helping.`],
        ['narr', 'It takes a long time. He stops on the seventh step and breathes. He stops on the twelfth and says something in '
          + 'the caravan dialect that is probably not polite. He does not stop again until there is one step left. Then he stands '
          + 'on it, and holds his hand out to you without a word.'],
        ['mott', `Hm. Top step. A man can take a hand on the top step. That's not help. That's company.`],
        ['mott', `So this is where the salt went. A room. Boards. A window. You can see the whole road from here, all the way to `
          + `the pan.\n\nForty-one times I walked it and never once saw it from above. It's smaller than I thought. It's a good `
          + `road. I'm glad I walked it before I saw it. Wouldn't have been the same the other way round.`],
        ['mott', `Right. Down. Down's worse. Don't help me. Well. Stand close.`],
      ] },
  ],
  reward: {
    deed: 'place', trust: 4,
    idle: { mott: [
      'Second floor. I\'ve been. Not impressed. Good window.',
      'On the top step a man can take a hand. I\'ve decided that\'s the rule.',
      'Forty-one times. I could do forty-two. Don\'t hurry me.',
      'You can see the whole road from up there. I\'d still rather walk it.',
    ] },
  },
};

export const STORIES = [FENNA, THESSALY, CALDER, ISOLDE, PTOLEM, RHAZA, TAREK, ZAHRA, MOTT];
