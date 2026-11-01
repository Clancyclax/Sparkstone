// ROUND 407 -- companion story quests, batch A: the four outlaws (outlawCompanions.js).
// Each picks up after the outlaw's fifth arc beat, so after both redemption choices, and the climax reads
// redemptionState (doneBy / idleBy) for the ending. Every line before the climax holds for all three endings.

// ---------------------------------------------------------------------------------------------------------- LUCY
// "My old band's come down out of the green. The Thornbacks ... Ma's leading it." Whichever way Ashwell went, Ma has
// not gone home. She is counting Milrow now (Nan Pell: "Riders came through asking how many of us there are").
const LUCY = {
  id: 'lucy_thornbacks', status: 'built', who: ['lucy'],
  title: 'The Thornbacks Come Down',
  open: { told: 5, rank: 'bronze' },
  moment: { id: 'comp_lucy', title: 'Fed and Not Fed' },
  offerLabel: 'Ask about the Thornbacks',
  offer: [
    ['lucy', "Ma didn't go back up into the trees after Ashwell. I thought she would. She always used to, after a "
      + "big one. Sit fat for a season and let the roads forget us.\n\nShe's still down here. That means she's not done."],
    ['lucy', "Her runners use Gallowsreach to sell what the band takes. If they're in town, I'll know what she's after "
      + "next. I could go on my own.\n\nI'd rather you came. Ma's going to want to know who I've been walking with, and "
      + "I'd like her to see."],
  ],
  accept: ['lucy', "Good. Gallowsreach first. Let me do the talking. Ma's runners don't talk to strangers, they just sell them."],
  decline: ['lucy', "Fine. She's not going anywhere. That's the whole problem with her."],
  stages: [
    { id: 'runners', title: 'Find the Thornbacks\' runners',
      log: 'Lucy\'s mother has kept the Thornbacks out of the green since Ashwell. Her runners sell the band\'s take in '
        + 'Gallowsreach. Walk Lucy to the gallows yard, where they sleep.',
      obj: { kind: 'escort', place: { region: 'nek', at: 'bc_nek', dx: -8, dy: -6, r: 8, name: 'the gallows yard' } },
      start: "They'll be round the back. They always sleep near the goats, even when there aren't any.",
      done: [
        ['narr', 'Two of the runners are still asleep against the wall. The third is awake, and has gone very still, '
          + 'the way a person goes still near something large.'],
        ['lucy', "My cousin Tam. He says Ma's got the beasts out on the road above Milrow. Chained, for now. She sent "
          + "riders through the village to count heads.\n\nShe's not after the carts. She's after the whole place. Same as "
          + 'when I was nine, at the mill.'],
      ] },
    { id: 'nan', title: 'Ask Nan Pell in Milrow',
      log: 'The Thornbacks sent riders through Milrow to count the people in it. Nan Pell saw them. Ask her what they '
        + 'asked and where they went, with Lucy beside you.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_1', name: 'Nan Pell' }, ask: 'Ask about the riders who counted Milrow' },
      talk: [
        ['npc', "You'll be about the riders. I said it to the Society man and he wrote it down and went home. They "
          + "asked how many of us there are. Not who. How many.\n\nYou only count sheep that way."],
        ['lucy', "That's Ma. She counts what she's taking before she takes it, so she knows if anybody's run off in the night."],
        ['npc', "You know her, then. I thought you looked like something that came down out of the trees.\n\nThey went up "
          + "the north road, past the last stile. My grandson saw a fire up there, and things on chains the size of a cart."],
        ['lucy', "Tuskers. Ma keeps them to put in the road so nobody leaves. I fed them, when I was small."],
        ['npc', "Then you'll know how to get past them. I'd be grateful. I'm too old to be counted."],
      ],
      done: [['lucy', "North road. I know which fire. She always picks the one you can see from the village, so you know she's there."]] },
    { id: 'beasts', title: 'Clear the Thornbacks\' beasts',
      log: 'The Thornbacks have chained their beasts across the road above Milrow so nobody can leave before the band '
        + 'comes down. Clear them, so the village has a way out.',
      obj: { kind: 'clear', place: { region: 'nek', at: 'nek_hamlet_1', dx: 8, dy: -30, r: 10, name: 'the road above Milrow' },
        tier: 2, families: ['boar', 'wolf'], packs: [[0, 0, 4], [5, -3, 3], [-4, 3, 4]] },
      start: "That one's Grub. Bit me when I was six. He's going to remember me.",
      done: [
        ['lucy', "Road's open. Milrow can walk out of it now if it wants to.\n\nShe'll have heard. Ma hears a tusker go "
          + "down the way you'd hear a door. She'll send the rest of them at us, to see if I'm still standing after."],
        ['lucy', "That's how she asks a question. I'm going to stand in the road and answer it."],
      ] },
    { id: 'road', title: 'Hold the Milrow road',
      log: 'Lucy\'s mother is sending the rest of the band\'s beasts down the Milrow road to see if Lucy stays standing. '
        + 'Hold the road with her until the band comes to her.',
      obj: { kind: 'waves', place: { region: 'nek', at: 'nek_hamlet_1', dx: 4, dy: -20, r: 10, name: 'the Milrow road' },
        tier: 2, families: ['boar', 'wolf', 'hornram'], waves: [3, 4, 5] },
      start: "Here they come. Stay behind me. Not because you need it. Because she's watching.",
      doneBy: {
        redeemed: [
          ['narr', 'The last tusker goes down in the ditch. Up the road, a woman with grey in her braids and a hammer '
            + 'over her shoulder walks out of the trees and stops where the chains used to be. The band stops behind her.'],
          ['lucy', "Ma. I'm not coming. Milrow isn't either.\n\nYou taught me fed and not fed. I've been fed for a while "
            + "now. Turns out you can be fed and leave the village standing. Nobody ever showed me that, so I had to go "
            + 'and find it.'],
          ['narr', 'Her mother looks at Lucy for a long time, and then at you. Then she spits in the road, turns, and '
            + 'walks back into the trees. The band goes with her. Nobody runs.'],
          ['lucy', "She blinked. First time in my life.\n\nI still hit people for money. I just pick them now. The ones "
            + "who'd hit back. Ma says I've gone soft. Ma's never been this far from the trees."],
        ],
        unsure: [
          ['narr', 'The last tusker goes down in the ditch. Up the road, a woman with grey in her braids and a hammer '
            + 'over her shoulder walks out of the trees. The band stops behind her and waits.'],
          ['lucy', "Ma. Go home. Not because it's wrong. I don't know if it's wrong. Because I'm standing here, and you'd "
            + "have to come through me, and you're old."],
          ['narr', 'Her mother laughs, short, and says something to the band. They turn back into the green. She goes '
            + 'last, and looks back once.'],
          ['lucy', "I don't know if I turned her round or she just didn't fancy it today.\n\nSome days I let them walk "
            + "and some days I don't, and I don't know why it's one or the other. At least now I notice which."],
        ],
        hardened: [
          ['narr', 'The last tusker goes down in the ditch. Up the road, a woman with grey in her braids and a hammer '
            + 'over her shoulder walks out of the trees. Lucy walks up the road to meet her, and does not stop.'],
          ['narr', 'It is short. Her mother is good, and old, and Lucy is neither of those things. When it is done Ma is '
            + 'sitting in the road with her hammer out of reach, and the band looks at Lucy, and at you, and goes down on '
            + 'one knee, the way they used to for Ma.'],
          ['lucy', "The band's mine. They'll keep the road above Milrow, and Milrow will pay them to, and nobody gets "
            + "counted.\n\nI'm not staying with them. I'm with you. They know where to send my share."],
          ['lucy', "Don't look at me like that. She's alive. She took the band off her own ma the same way.\n\nIt's all still just fed and "
            + "not fed. I'm fed. You're fed. Everyone else can learn to run faster. Come on."],
        ],
      } },
  ],
  reward: {
    deed: 'risky',
    idleBy: { lucy: {
      redeemed: [
        "Ma's gone back up into the trees. I checked the fire. It's out.",
        'I pick them now. The ones who would hit back. It takes longer and I like it better.',
        "Milrow waved at us on the road. Nobody's ever waved at me on a road.",
        "Stand behind me. Not because you need it. Because I'm good at it.",
      ],
      unsure: [
        "I keep thinking about Ma looking back. I don't know what she saw.",
        'Some days I let them walk. I notice which days now. That is new.',
        "The road above Milrow's quiet. I don't know yet if I did that.",
        "Point me at it. I'll think about it after. Bit. Not much.",
      ],
      hardened: [
        "The band sent my share. Ma sent word with it. Says I hit like her. That's the nicest thing she's ever said.",
        "Milrow pays on time now. Funny how quick people learn to count back.",
        'Fed and not fed. I am fed. So are you. That is the whole of it.',
        "Point me at somebody. I'll do the rest and you can do the talking after.",
      ],
    } },
  },
};

// ---------------------------------------------------------------------------------------------------------- JOLE
// "I only mind that I was right and it didn't matter." The clinic was his; it stood at the fen's edge by Fenn Cross,
// and the fen has been taking people since it closed (Old Sarrow: "about every other year. It's taken three since
// midsummer"). The ledger is his proof, and its short column is what the money bought.
const JOLE = {
  id: 'jole_ledger', status: 'built', who: ['jole'],
  title: 'The Short Column',
  open: { told: 5, rank: 'bronze' },
  moment: { id: 'comp_jole', title: 'The Account Settled' },
  offerLabel: 'Ask about the clinic',
  offer: [
    ['jole', "Mother Hesk's letter said she was wrong about the clinic. Whatever I did with the letter afterwards, I "
      + "have not stopped reading that line.\n\nShe was wrong. I was right. I have never once been able to prove it, "
      + "because the clinic's ledger went into the fen with the clinic."],
    ['jole', "I would like to get it back. Not for her. For me. I would like to sit down with the whole account in front "
      + "of me and find out what it adds up to.\n\nNan Pell in Milrow walked her boy to us every winter. Start with her. "
      + 'She will remember the clinic more kindly than I can.'],
  ],
  accept: ['jole', "Thank you. I will keep you standing on the way. We can discuss my fee when we know what the ledger says."],
  decline: ['jole', "Of course. It has been under water for six years. A few more weeks will not make it any wetter."],
  stages: [
    { id: 'nan', title: 'Ask Nan Pell about the clinic',
      log: 'Brother Jole kept a clinic for the Green Mercy until they cast him out over its money. Nan Pell of Milrow '
        + 'took her grandson there every winter. Ask her what became of it.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_1', name: 'Nan Pell' }, ask: 'Ask about the Mercy\'s clinic at Fenn Cross' },
      talk: [
        ['npc', "Brother Jole. They said you'd gone to the bad. You look it, a bit. You've lost the green and found a lot of rings."],
        ['jole', "I have, Nan. How is the boy's chest?"],
        ['npc', "Grown, and wheezes when it's wet, and alive, which he wouldn't be without your beds. You remember that "
          + "winter. Eleven of them coughing in a row, and you sat up with every one.\n\nWhen they shut you out they shut "
          + 'the clinic too. Nobody would pay for the boat.'],
        ['jole', 'The boat.'],
        ['npc', "The one you kept at the fen's edge, for pulling people out. It rotted at the post. Then the water came up "
          + "and took the house. Old Sarrow counts who the fen takes now. He used to count who you brought back."],
      ],
      done: [['jole', "I bought that boat. It cost forty spirit coins. They asked me how much, and I told them, and that was the end of it."]] },
    { id: 'sarrow', title: 'Ask Old Sarrow about the fen',
      log: 'Old Sarrow of Fenn Cross counts the people the fen takes. Since the clinic closed it has been taking more. '
        + 'Ask him where the drowned clinic lies, with Jole there.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_2', name: 'Old Sarrow' }, ask: 'Ask who the fen has taken' },
      talk: [
        ['npc', "The fen takes a person about every other year. It's taken three since midsummer. I keep the count on the "
          + "lintel. You can see the marks from here, Brother. You used to rub them out."],
        ['jole', 'I used to have a boat.'],
        ['npc', "You did. Now there's things in the reeds where your boat was. Pale things that sit under the water and "
          + "wait, and toads big as a cow that sit on top of it. They don't take a person every other year. They take "
          + "whoever's slow."],
        ['jole', 'And the house?'],
        ['npc', "Past the reeds, where the old causeway goes under. The roof's still up. Your desk'll be in there, if "
          + "nobody's had it. Nobody goes out that far to have anything."],
      ],
      done: [['jole', 'Three since midsummer. I am going to want that lintel wiped clean before we are done.']] },
    { id: 'reeds', title: 'Clear the reeds',
      log: 'Drownwights and Gulletmaws have settled in the reeds where Jole\'s boat used to be, and they take whoever '
        + 'is slow. Clear them, so the way to the drowned clinic is open.',
      obj: { kind: 'clear', place: { region: 'nek', at: 'nek_hamlet_2', dx: -22, dy: 14, r: 10, name: 'the reeds below Fenn Cross' },
        tier: 2, families: ['drownwight', 'giantToad'], packs: [[0, 0, 4], [-5, 3, 3], [4, 4, 3]] },
      start: 'Stay out of the deep water. I can mend most things. Drowning is very hard to bill for.',
      done: [
        ['jole', "That is the reeds clear. I could feel every one of them as it went. The heal and the drain, both at "
          + "once, as usual.\n\nThe house is out past the causeway. I can see the roof. I painted that roof."],
      ] },
    { id: 'house', title: 'Recover the clinic\'s ledger',
      log: 'The Mercy\'s clinic lies drowned past the old causeway, and something has nested in it. Clear the house '
        + 'and find the clinic\'s ledger, the proof of where the money went.',
      obj: { kind: 'retrieve', place: { region: 'nek', at: 'nek_hamlet_2', dx: -32, dy: 22, r: 9, name: 'the drowned clinic' },
        tier: 2, families: ['drownwight', 'giantToad', 'lurefin'], packs: [[0, 0, 4], [4, -3, 3], [-3, 4, 3]],
        item: 'the clinic\'s ledger' },
      start: 'The beds are still in there. I can see the frames. Do try not to fight on them.',
      done: [
        ['jole', "Here. In the desk, in the oilcloth I wrapped it in, because I am a careful man and I always expected to "
          + "be thrown out.\n\nDry. Every page. Mother Hesk never once asked to see it."],
        ['jole', 'Sit with me a moment. I would like to read it properly, somewhere with walls. Then I will tell you what '
          + 'it says.'],
      ] },
    { id: 'column', title: 'Hear the column read',
      log: 'Jole has the clinic\'s ledger back, dry, after six years under the fen. Sit with him and hear him read it, '
        + 'and what he decides it adds up to.',
      obj: { kind: 'confide', ask: 'Ask what the ledger says' },
      talk: [
        ['jole', "The long column is the money. Several thousand spirit coins, the winter I took them. A boat, forty. "
          + "Eleven beds. A roof. A drain for the low room. Salt, bandages, a girl to sit up nights. Every coin goes "
          + "somewhere, and every somewhere is the clinic. I was right. Here it is, in my own hand."],
        ['jole', "And at the back, the short column. I had forgotten I kept it. The names of the ones the boat brought "
          + "back out of the fen, and the beds kept breathing. Nan's boy is on it. So are thirty others.\n\nThe Mercy "
          + "asked how much. Nobody ever asked how many."],
      ],
      doneBy: {
        redeemed: [
          ['jole', "I have Mother Hesk's letter in my coat. I am going to answer it. Not to go back. I will not kneel at "
            + "her altar, and Avarice would never forgive the waste. I am going to write the short column out for her, "
            + 'every name, and tell her the account is settled.'],
          ['jole', "And then I think I am going to buy a boat. Forty spirit coins. Avarice will want it written down, and "
            + "I will write it down.\n\nThe drain and the heal were the same feeling. The Mercy never told me, and she "
            + "did. What she did not say is that it matters which way it goes. The ledger says that."],
          ['narr', 'Jole tears a clean page from the back of the ledger and writes one line at the top of it, and turns it '
            + 'so you can read it. It is your name.'],
          ['jole', "I heal for free again, sometimes. Not often. Avarice lets it go on the understanding that I'm keeping "
            + "count, and I am. It's a very short column. I'm proud of it."],
        ],
        unsure: [
          ['jole', "I was right. I have it in my hand. I thought that would feel like something, and it feels like "
            + 'paper.\n\nI do not know who to send it to. The Mercy would not read it. Avarice already knows what it says.'],
          ['jole', "Thirty-one names in the short column. I keep counting them as if the number will change. The drain and "
            + "the heal are the same feeling. I have stopped being sure that means they are the same thing."],
          ['narr', 'He wraps the ledger in its oilcloth again, carefully, and puts it in his coat, next to whatever else he '
            + 'keeps there.'],
          ['jole', "Some days I heal the ones who can't pay. Some days I don't. The ledger doesn't care which. I'm beginning "
            + 'to think I do.'],
        ],
        hardened: [
          ['jole', "Several thousand spirit coins, and every one of them accounted for. They threw me out for money I spent "
            + "on them. That is not a sin, my friend. That is a debt, and it has been accruing for six years."],
          ['jole', "I am going to send this ledger to Mother Hesk. With a bill. Thirty-one lives at the going rate, and "
            + "six years' interest on the boat. Avarice is so pleased with me I can feel her, here, like a warm coin.\n\n"
            + 'The drain and the heal were the same feeling. She told me so on the first night. She was right about that too.'],
          ['narr', 'Jole wipes the three marks off Old Sarrow\'s lintel with his thumb on the way out, and leaves the old '
            + 'man a slip of paper with a sum on it.'],
          ['jole', "Everything is owed. We collected. I've never felt so close to a god, and she has never once pretended "
            + 'to be kind.'],
        ],
      } },
  ],
  reward: {
    deed: 'place',
    idleBy: { jole: {
      redeemed: [
        'The boat is ordered. Forty spirit coins. I have written it in the short column, which is now slightly less short.',
        'Mother Hesk wrote back. One line. I have not decided if it was an apology. I have decided to keep it.',
        "Hold still. That one's on the house. Don't tell her.",
        'The drain and the heal are the same feeling. Which way it goes is the part I get to choose.',
      ],
      unsure: [
        'Thirty-one names. I keep the ledger in my coat. It is heavier than it looks.',
        'I was right. I am still waiting for it to feel like anything.',
        'Hold still. We can discuss whether you owe me later. I genuinely have not decided.',
        "She says nothing is free. The short column says otherwise. I am letting them argue.",
      ],
      hardened: [
        'The Mercy has not paid. They will. Avarice is very patient with debtors, and so am I.',
        "Hold still. I'm adding it to your account. You have a lovely account.",
        'Thirty-one lives at the going rate. I worked it out on the road. It is a beautiful number.',
        'Everything is owed. I used to be embarrassed to say that. Now it feels like a hymn.',
      ],
    } },
  },
};

// -------------------------------------------------------------------------------------------------------- ARIANI
// "It's not a plan. It's more like following a smell. There's always one more door." Somebody she sold has come back
// with a crew and an offer: sell the player, and they are square. The quest is the door she does not open.
const ARIANI = {
  id: 'ariani_door', status: 'built', who: ['ariani'],
  title: 'One More Door',
  open: { told: 5, rank: 'silver' },
  moment: { id: 'comp_ariani', title: 'The Urge, Not Taken' },
  offerLabel: 'Ask about the message',
  offer: [
    ['ariani', "Somebody's been asking for me in Tollmarket. Not Oskar. Somebody who remembers me fondly, which is to "
      + "say somebody I sold.\n\nThey left word with the Toll that they have an offer, and that it's about you. Isn't "
      + 'that exciting.'],
    ['ariani', "I'd like to go and hear it. With you there, so you can watch my face while I do. You're always telling "
      + "me you can't read it. I'd like to know if that's still true.\n\nYou can say no. It'll only make me more curious."],
  ],
  accept: ['ariani', "Lovely. Tollmarket, then. Try to look like somebody worth a great deal of money. It won't be hard."],
  decline: ['ariani', "Suit yourself, darling. They'll still be there. People I've sold are very good at waiting."],
  stages: [
    { id: 'toll', title: 'Walk Ariani into Tollmarket',
      log: 'Somebody Ariani once sold has left word in Tollmarket that they have an offer for her, and that it is about '
        + 'you. Walk her into Tollmarket to find out who.',
      obj: { kind: 'escort', place: { region: 'ontaria', at: 'bc_ont', dx: -6, dy: 4, r: 9, name: 'the Toll\'s yard' } },
      start: "Sedge Crossing. It still smells the same under the money.",
      done: [
        ['ariani', "Mags Corl. The watch captain's crew, the ones I sold to their rivals afterwards. I thought the rivals "
          + "had finished all of them. Apparently they were careless with Mags.\n\nShe's been hiring through a water-man "
          + "in Harrowmoor. Cutter Bly. Everybody who wants muscle on the river and doesn't want the Toll to know uses him."],
        ['ariani', "She's done well for a dead woman. I'm almost proud. Shall we go and ask Cutter what she's bought?"],
      ] },
    { id: 'bly', title: 'Ask Cutter Bly in Harrowmoor',
      log: 'Mags Corl, who survived the crew Ariani sold, has been hiring river muscle through Cutter Bly in '
        + 'Harrowmoor. Ask him what she has bought and where it is waiting.',
      obj: { kind: 'talk', npc: { settlement: 'ont_city', name: 'Cutter Bly' }, ask: 'Ask who Mags Corl has been hiring' },
      talk: [
        ['npc', "Folk go down to the water at odd hours and come back with nothing wet on them. Your friend Mags is one of "
          + "them. She's bought a crew, and handlers, and beasts on leads for the river road. Paid in good silver."],
        ['ariani', "And what does she want for it?"],
        ['npc', "She says you'll know. She says she'll wait at the old toll bridge with her crew in the trees, and when you "
          + "tie a red ribbon on the rail, they take your friend here, and you and her are square. She says you always "
          + 'did like red.'],
        ['ariani', "I did. I do. Boots, mostly.\n\nHow kind of her, to make it so easy. One ribbon. I've sold people for "
          + 'more effort than that.'],
        ['npc', "She's put her beasts on the road first, to soften you up. Don't tell her it was me who said."],
      ],
      done: [['ariani', "Don't look at me like that. I haven't decided anything. I'm enjoying not having decided."]] },
    { id: 'ambush', title: 'Break the ambush on the river road',
      log: 'Mags Corl has put her handlers\' beasts on the river road west of Tollmarket, between you and the old toll '
        + 'bridge. Clear them.',
      obj: { kind: 'clear', place: { region: 'ontaria', at: 'bc_ont', dx: -30, dy: 12, r: 10, name: 'the river road' },
        tier: 2, families: ['gnoll', 'spider'], packs: [[0, 0, 4], [5, -3, 4], [-4, 4, 3]] },
      start: "Palefangs, on leads. She always did have a sense of occasion.",
      done: [
        ['ariani', "Mm. That was fun. She'll have heard it from the bridge. She'll be wondering if I'm still coming.\n\n"
          + "I am. I've got the ribbon. I bought it in Harrowmoor while you were talking. You didn't notice."],
      ] },
    { id: 'bridge', title: 'Hold the old toll bridge',
      log: 'Mags Corl is waiting at the old toll bridge with a crew in the trees, for Ariani to tie a red ribbon on '
        + 'the rail and give you to them. Hold the bridge against what she sends.',
      obj: { kind: 'waves', place: { region: 'ontaria', at: 'bc_ont', dx: -36, dy: 18, r: 10, name: 'the old toll bridge' },
        tier: 3, families: ['wolf', 'raptor', 'cobra'], waves: [4, 5, 6] },
      start: "Here we are, darling. Stay close. I'd hate to lose track of you.",
      doneBy: {
        redeemed: [
          ['narr', 'The last of the beasts goes into the river. Across the bridge Mags Corl steps out of the trees, a thin '
            + 'woman with one ear, and looks at the rail. There is nothing on it.'],
          ['ariani', "Hello, Mags. I'm not going to. I thought about it the whole way here. It was the most interesting "
            + "walk I've had in years.\n\nGo home. I sold you once. I don't want to do it again, and I don't want to "
            + 'find out what I would want instead.'],
          ['narr', 'Mags looks at Ariani for a long moment, and then at you, and something in her face changes. She goes '
            + 'back into the trees, and the crew goes with her.'],
          ['ariani', "Did you see that? Her face. I've watched faces change my whole life, and that's the first one that "
            + "changed because of something I didn't do. So that's what it looks like from the outside.\n\nI still don't "
            + "feel what you feel. But I've started doing what you'd do, and watching what happens. People look at me "
            + "differently now, and I find I don't mind it nearly as much as I expected."],
        ],
        unsure: [
          ['narr', 'The last of the beasts goes into the river. Across the bridge Mags Corl steps out of the trees, a thin '
            + 'woman with one ear, and looks at the rail. Ariani has the ribbon in her hand.'],
          ['ariani', "I could. You know I could. I've been holding this since Harrowmoor, and it's the closest I've come "
            + 'to feeling something in a month.'],
          ['narr', 'She lets it go. The wind takes the ribbon off the bridge and into the river. Mags watches it float away, '
            + 'and goes back into the trees.'],
          ['ariani', "There. Gone. I didn't do it.\n\nSome nights I think about selling you, just to feel something. Then I "
            + "don't. I can't tell yet if that's loyalty or just a longer game."],
        ],
        hardened: [
          ['narr', 'The last of the beasts goes into the river. Across the bridge Mags Corl steps out of the trees, a thin '
            + 'woman with one ear. Ariani walks to the rail, ties the red ribbon on it in a neat bow, and smiles at her.'],
          ['narr', 'The crew comes out of the trees for you. Ariani is already among them. It is over quickly, and Mags is '
            + 'the last, and Ariani takes her time.'],
          ['ariani', "Oh, don't sulk. I never said who the ribbon was for.\n\nSell you? Darling, you're the only one who's "
            + "ever been worse than me. I'm not selling that. I'm keeping it."],
          ['ariani', "Pleasure and pain, darling. We've had so much of both. When this is over, let's find somebody new to "
            + 'break together.'],
        ],
      } },
  ],
  reward: {
    deed: 'kills',
    idleBy: { ariani: {
      redeemed: [
        "I keep not doing it. I check, like a loose tooth. It's still there. I just keep not doing it.",
        "Mags's face, on the bridge. I think about it more than the boots.",
        'I tried doing what you would do again today. Somebody thanked me. It was very strange.',
        "Stay close, darling. Not so I can keep track of you. I just like it.",
      ],
      unsure: [
        "I still have a red ribbon. Not that one. Another one. I don't know why I bought it.",
        "I didn't sell you again today. I'm counting. It's a long count now.",
        "Don't trust me. I'd be disappointed in you if you did, and pleased, both at once.",
        'Try to be interesting today. It is the only thing that keeps me honest.',
      ],
      hardened: [
        'Mags lasted longer than I expected. I liked that about her.',
        "I'll never sell you, darling. You're the only thing I own that's worth more than I'd get for it.",
        "There's always one more door. I've stopped wanting to open them alone.",
        "You've been wicked today, haven't you. I can always tell.",
      ],
    } },
  },
};

// --------------------------------------------------------------------------------------------------------- SLICE
// "The house is failing. My brother's married badly." Ledgerman Voss's "cargo that's written down neither time" is the
// Venners' debt: the brother has pledged the house to a Harrowmoor lender off the books, and the deed sits in the
// lender's vault. The moment is the name Slice answers to at his mother's door.
const SLICE = {
  id: 'slice_vault', status: 'built', who: ['slice'],
  title: 'The Venner Vault',
  open: { told: 5, rank: 'silver' },
  moment: { id: 'comp_slice', title: 'Aldous' },
  offerLabel: 'Ask about the Venners',
  offer: [
    ['slice', "Mother's last letter. I opened it. It's short, for her. The house is going, and she doesn't say why, "
      + "which means it's my brother, which means it's money.\n\nWhatever I said to the Venners, and whatever I took from "
      + 'them, I would like to know who is about to own the house I grew up in.'],
    ['slice', "Harrowmoor writes everything down twice. There is a man at the harbour, Ledgerman Voss, who reads both "
      + "copies for a living. He'll know.\n\nI'd like you there. I have a habit of being recognised in Harrowmoor, and "
      + 'I would rather be recognised standing next to somebody.'],
  ],
  accept: ['slice', "Harrowmoor, then. I'll take the rooftops. You take the street. We'll meet at the harbour office."],
  decline: ['slice', "Of course. The house has been failing for ten years. It's very good at it."],
  stages: [
    { id: 'harrowmoor', title: 'Walk Slice into Harrowmoor',
      log: 'Slice\'s mother writes that the Venner house is going. Walk him into Harrowmoor, where he grew up and where '
        + 'he is still recognised, and keep him at your shoulder.',
      obj: { kind: 'escort', place: { region: 'ontaria', at: 'ont_city', dx: 0, dy: 0, r: 12, name: 'Harrowmoor' } },
      start: "Smaller than I remember. So am I. Keep walking.",
      done: [['slice', "Nobody's looked twice. Either I've changed a great deal or they've stopped expecting me. Both, I "
        + "expect.\n\nThe harbour office is down on the quay. Voss will be in it. He's always in it."]] },
    { id: 'voss', title: 'Ask Ledgerman Voss about the Venner debts',
      log: 'Ledgerman Voss reads both copies of everything that leaves Harrowmoor. Ask him who holds the Venner debts, '
        + 'with Slice there.',
      obj: { kind: 'talk', npc: { settlement: 'ont_city', name: 'Ledgerman Voss' }, ask: 'Ask who holds the Venner debts' },
      talk: [
        ['npc', "Everything that leaves this port is written down twice. What worries me is the cargo that's written down "
          + "neither time.\n\nYou'll be the second Venner boy. You have your mother's way of standing in a door."],
        ['slice', "I've been told. Who holds my brother, Voss?"],
        ['npc', "A man called Marrick, who lends at night and doesn't write it down. Your brother borrowed against the "
          + "house. The deed's been in Marrick's strongroom since spring, under the bonded warehouse on the east quay."],
        ['npc', "He keeps things down there to mind it, the way some men keep dogs. Lamps that walk, and worse. Nobody "
          + "official goes down. Nobody official knows it's there."],
        ['slice', "Thank you. I'll see that this conversation was written down neither time."],
      ],
      done: [['slice', "Marrick. I took a contract from him once. He paid on time. I'd like to return the courtesy."]] },
    { id: 'cellars', title: 'Clear the warehouse cellars',
      log: 'Marrick\'s strongroom lies under the bonded warehouse on the east quay, and the cellars above it are full of '
        + 'what he keeps to mind it. Clear them.',
      obj: { kind: 'clear', place: { region: 'ontaria', at: 'ont_city', dx: 20, dy: 10, r: 10, name: 'the bonded warehouse cellars' },
        tier: 2, families: ['inkwell', 'duskmoth', 'shade'], packs: [[0, 0, 4], [4, 3, 3], [-4, -3, 3]] },
      start: "Mind the ceiling. That's where I'd be, if I worked here.",
      done: [['slice', "Cellars clear. The strongroom's through there. He's put the better dogs at the door.\n\nThis is "
        + "the part of the job I'm best at, which isn't the same as liking it."]] },
    { id: 'strongroom', title: 'Take the Venner deed',
      log: 'The deed to the Venner house sits in Marrick\'s strongroom, pledged by Slice\'s brother. Clear what guards '
        + 'it and take the deed.',
      obj: { kind: 'retrieve', place: { region: 'ontaria', at: 'ont_city', dx: 24, dy: 15, r: 8, name: 'Marrick\'s strongroom' },
        tier: 3, families: ['lanternwraith', 'skeleton'], packs: [[0, 0, 4], [3, -3, 3], [-3, 3, 3]], item: 'the Venner house deed' },
      start: 'Lanternwraiths. Of course. He always did like to see what he was charging for.',
      done: [
        ['slice', "Here. The Venner crest at the top, my brother's signature at the bottom, and between them, the house. "
          + "He signed it badly. He always signed things badly.\n\nIt's a very small piece of paper for a house with that "
          + 'many rooms.'],
        ['slice', 'The house is up the hill. Come with me. I want to stand outside it for a while before I decide what I '
          + 'am going to say at the door.'],
      ] },
    { id: 'door', title: 'Stand outside the Venner house',
      log: 'Slice has the deed to the house he grew up in. Stand with him outside the Venner door, and hear what he '
        + 'decides to be when it opens.',
      obj: { kind: 'confide', ask: 'Ask what he will say at the door' },
      talk: [
        ['slice', "Too many rooms. Mother keeps them all lit, so nobody walking past can tell how few of us are left in "
          + "them.\n\nI could put this deed through the letterbox and go. I could sell it back to Marrick by morning. I "
          + 'could knock.'],
        ['narr', 'The door opens before he decides. A woman in an old good dress stands in it, the way Voss said, and '
          + 'looks at the man on her step for a long time. "Aldous," she says.'],
      ],
      doneBy: {
        redeemed: [
          ['slice', "Yes, Mother. It's Aldous.\n\nThis is the house. My brother pledged it to a man called Marrick. Marrick "
            + "no longer has it. Nobody has it but you. Don't let Edric near a pen."],
          ['narr', 'She does not ask how he came by it. She takes the deed in both hands, and then she takes his hand, the '
            + 'one with the burn scars from the lightning, and does not let go of it.'],
          ['slice', "She didn't ask what I do. I think that's still the kindest thing anyone's ever done for me. I told her "
            + "anyway. Some of it. She said I was always the one who read the contract first.\n\nI still take contracts. "
            + "I read them first now. Some of them I tear up. Mother would call that character. I call it being expensive."],
        ],
        unsure: [
          ['slice', "...Hello, Mother."],
          ['narr', 'He holds out the deed. She takes it. Neither of them says the name again, and she does not ask him in, '
            + 'and he does not ask to come.'],
          ['slice', "She called me Aldous. I didn't say no. I didn't say yes, either. I'm not sure there's a man left who "
            + "answers to it, and I would rather not lie to her on the step.\n\nSome jobs I take, some I don't. I've "
            + "started keeping the ones I turn down in a drawer. It's a thicker drawer than I expected."],
        ],
        hardened: [
          ['slice', "Slice, Mother. Aldous was the one who sat at your table and waited to be told what to be. I found "
            + 'out on my own.'],
          ['narr', 'He shows her the deed, and her face changes, and he puts it back in his coat. "The house is mine now. '
            + 'You may stay in it. Edric may not." He turns and walks down the hill, and does not look back at the lit windows.'],
          ['slice', "She'll keep every room lit. She'll have to, now. I find I don't mind.\n\nEvery name on the list, "
            + "crossed off. The Venners will read about me one day and be very, very quiet at dinner."],
        ],
      } },
  ],
  reward: {
    deed: 'place',
    idleBy: { slice: {
      redeemed: [
        'Mother writes every week now. I answer. Badly, but I answer.',
        "Aldous. I've started signing it on the contracts I take. The ones I tear up, I don't sign at all.",
        "Keep watch on the rooftops. That's where I'd be. That's where I am, as it happens.",
        'Edric has been forbidden pens. It is the best contract I ever drew up.',
      ],
      unsure: [
        "She called me Aldous on the step. I still haven't decided if I answered.",
        'The drawer of contracts I turned down is getting heavy. I keep meaning to count it.',
        'Name the target and the fee. Then give me a moment to read it.',
        'The lit windows. I keep seeing them when I close my eyes. I am not sure what that means.',
      ],
      hardened: [
        'I own a house with too many rooms. My mother lives in it, on my sufferance. It is a very odd feeling.',
        "Slice. Say it with me. Nobody's afraid of an Aldous.",
        "Marrick's out of business. I've taken his clients. They pay on time now.",
        'Another name to cross off. You have excellent taste in names.',
      ],
    } },
  },
};

export const STORIES = [LUCY, JOLE, ARIANI, SLICE];
