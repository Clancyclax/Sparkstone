// ROUND 407 -- companion story quests, batch B: Kesh, Maribel, Tobin, Ysolde, Pell, Garrick, Aldric.
// Each object replaces its design stub in companionQuests.js (same id, who, title, open, moment).

// ------------------------------------------------------------------------------------------------------- KESH
// "My dad still hasn't said the word 'barn' to me." He wants "someone better than me", and to be the best the Nek
// ever made. The quest ends with him second on purpose, in front of his father's door.
const KESH = {
  id: 'kesh_barn', status: 'built', who: ['kesh'],
  title: 'The Barn at Milrow',
  open: { trust: 1.5, rank: 'iron' },
  moment: { id: 'comp_kesh', title: 'Somebody Better' },
  offerLabel: 'Ask about the barn',
  offer: [
    ['kesh', "There's a contract on the Milrow board. Something nesting in a burnt barn on the Varn place. There is "
      + "one burnt barn in Milrow, and I'm the one who burnt it.\n\nMy dad posted it through the Society, so he wouldn't "
      + 'have to ask me. That is very him.'],
    ['kesh', "I want to take it. I want you there, because if you're there I can't turn round halfway home and pretend "
      + "I was going somewhere else. I'd look stupid. I hate looking stupid in front of you. You'll have noticed."],
  ],
  accept: ['kesh', 'Milrow, then. Race you there. No, I mean it. Actually, no. Walk with me. Just this once.'],
  decline: ['kesh', "Fine. It's been burnt for years. It's not going to get more burnt."],
  stages: [
    { id: 'milrow', title: 'Walk into Milrow with Kesh',
      log: 'Kesh has not been home since he burnt down his father\'s barn bonding Fire. Walk into Milrow with him, '
        + 'before he thinks better of it.',
      obj: { kind: 'escort', place: { region: 'nek', at: 'nek_hamlet_1', dx: 0, dy: 0, r: 10, name: 'Milrow' } },
      start: 'Same road. Same fence. Same everything. That is the problem with Milrow.',
      done: [['kesh', "Aldis Roke is still standing where he always stands, telling people Cadence doesn't care about "
        + "them. You ask him. If I ask him he'll tell me I've grown, and I'll have to hit something."]] },
    { id: 'aldis', title: 'Ask Aldis Roke about the Varn place',
      log: 'Aldis Roke knows everybody in Milrow and everything they will not say. Ask him about the Varn farm and '
        + 'the contract on the barn, with Kesh beside you.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_1', name: 'Aldis Roke' }, ask: 'Ask about the Varn barn' },
      talk: [
        ['npc', "Cadence sends us tax collectors and weather warnings. Now it sends us Kesh Varn with a badge on. I "
          + "suppose that's the weather warning."],
        ['kesh', 'The barn, Aldis.'],
        ['npc', "Something's moved into it. Your dad posted the contract, then stood at the board for an hour reading "
          + "it back, like he'd made a spelling mistake. He hasn't. He wrote it very carefully.\n\nHe won't come to the "
          + "door for you, lad. Not for a Society badge. He'll be at the window, though. He's at the window every evening. "
          + 'Says he is checking the weather.'],
        ['kesh', 'He was always rubbish at weather.'],
        ['npc', "There's more than the nest. Palefang have been coming up to the yard "
          + "after dark. Nobody's lost stock yet. Your mother says yet a lot lately."],
      ],
      done: [['kesh', "The barn first. Then the yard. In that order, and fast, and he can watch from the window if he "
        + 'likes.']] },
    { id: 'barn', title: 'Clear the burnt barn',
      log: 'Quillrunner and Duskfang have nested in the shell of the Varn barn, the one Kesh burnt. Clear them out '
        + 'of it.',
      obj: { kind: 'clear', place: { region: 'nek', at: 'nek_hamlet_1', dx: 22, dy: -12, r: 8, name: 'the burnt barn' },
        tier: 0, families: ['lizard', 'bat'], packs: [[0, 0, 4], [4, -2, 3], [-3, 3, 3]] },
      start: 'Still black on the north side. I did that. There was a rat.',
      done: [
        ['kesh', "Done. Faster than you, too, if anyone's counting. I'm counting.\n\nLook at the beams. He never pulled "
          + "them down. All this time and he never pulled them down, and he never put a new one up. He just left it."],
        ['kesh', "Here they come up the yard. Palefang, like Aldis said. Right. First to the count, same as always. "
          + 'Keep up.'],
      ] },
    { id: 'yard', title: 'Hold the Varn yard',
      log: 'Palefang are coming up into the Varn yard after dark. Kesh wants to race you through them. Hold the yard '
        + 'in front of the farmhouse door.',
      obj: { kind: 'waves', place: { region: 'nek', at: 'nek_hamlet_1', dx: 16, dy: -6, r: 9, name: 'the Varn yard' },
        tier: 1, families: ['gnoll', 'quillFiend'], waves: [3, 4, 5] },
      start: 'Eight and climbing. You are behind. Do not look at the window.',
      done: [
        ['narr', 'On the last wave Kesh stops running. He goes back across the yard, and stands with his knives out in '
          + 'front of the farmhouse door, and lets the fight come to him. He does not take a single kill he has to chase.'],
        ['kesh', "You won. Don't say anything. I know you won, I was there, I let you.\n\nNo. That's a lie. I didn't "
          + "let you. I just stopped counting. I've never stopped counting in my life."],
        ['narr', 'Behind him the door opens a hand\'s width. A man looks out at the yard, then at the black beams, then '
          + 'at his son.'],
        ['kesh', "He said it. Did you hear? He said 'We'll want a new barn.' We. Barn. Both words, in the same go.\n\n"
          + "I said I wanted somebody better than me. I didn't know it meant I'd have to stand still and be second. "
          + "It's not so bad. It's quite good, actually. Don't tell anybody I said that either."],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { kesh: [
      'There is a new barn in Milrow. I helped. I set nothing on fire. Well. One thing, small, on purpose.',
      'Race you. No. Go on, you first. I will be right behind you, which is a new place for me.',
      'Dad says "barn" now like it is any other word. I listen for it.',
      'Best the Nek ever made. Second best. Second best is fine if you choose who comes first.',
    ] },
  },
};

// ---------------------------------------------------------------------------------------------------- MARIBEL
// "Eleven hundred owing at Fenn Cross." The bank gets the crows' share, and under the bank there is a note Thomas
// signed with somebody who isn't one.
const MARIBEL = {
  id: 'maribel_note', status: 'built', who: ['maribel'],
  title: 'Paid in Full',
  open: { trust: 1.5, rank: 'iron' },
  moment: { id: 'comp_maribel', title: 'Owing Nothing' },
  offerLabel: 'Ask about the farm',
  offer: [
    ['maribel', "The bank's nearly done with me. I can see the end of it, which I couldn't a year ago, and some of "
      + "that is you.\n\nThere's another paper, though. Thomas signed a note at Fenn Cross with somebody who isn't a "
      + "bank. I didn't know about it until the man started sending things at my stock to remind me."],
    ['maribel', "I'd like it settled. Not paid. Settled. I'll do it the way I do everything, in order, smallest first. "
      + "Crossward Tibb will know who holds it. He hears everything twice."],
  ],
  accept: ['maribel', "Fenn Cross, then. Tibb first. Then the road. I've written it down; you can see if you like."],
  decline: ['maribel', "That's all right. It's been owing for three years. A week more won't change the sum."],
  stages: [
    { id: 'tibb', title: 'Ask Crossward Tibb who holds the note',
      log: 'Somebody who is not a bank holds a note Maribel\'s husband signed. Crossward Tibb hears everything that '
        + 'comes through Fenn Cross. Ask him who it is, with Maribel there.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_2', name: 'Crossward Tibb' }, ask: 'Ask who holds Thomas Oakes\'s note' },
      talk: [
        ['npc', "Four roads meet here, so I hear everything twice. This one I've heard four times, which means it's "
          + 'probably true.'],
        ['maribel', 'The note, Tibb. Who has it.'],
        ['npc', "A man who lends to people the bank won't. Camps off the west road, past your farm, moves when he's "
          + "asked to. Your Thomas went to him the winter the roof came in.\n\nHe's been feeding Palefang at the edge of "
          + "your fields. Leaves offal out on the road. Doesn't take much to teach a pack where dinner is."],
        ['maribel', 'He taught them to come to my fence.'],
        ['npc', "He taught them to come to your fence. I'm sorry, Maribel. I'd have said sooner, but you never ask "
          + 'anybody for anything.'],
      ],
      done: [['maribel', "Fair. I don't. I'm asking now. The farm road, then. I want to see what he's left out for them."]] },
    { id: 'road', title: 'Walk the farm road',
      log: 'Tibb says the note-holder leaves offal on the road by the Oakes farm to bring the Palefang in. Walk the '
        + 'farm road with Maribel and see.',
      obj: { kind: 'goto', place: { region: 'nek', at: 'nek_hamlet_2', dx: -24, dy: 14, r: 8, name: 'the Oakes farm road' } },
      done: [
        ['maribel', "There. And there. He's been at it a while. You can see where the pack's worn a track to my "
          + 'fence and stopped, because the fence held. Thomas built that fence. He was good at fences.'],
        ['maribel', "Ten of them, I'd say, working this stretch. I'll count them as we go. I count everything."],
      ] },
    { id: 'pack', title: 'Cull the Palefang',
      log: 'The note-holder has taught the Palefang of the Nek where Maribel\'s stock is. Cull ten of them, with her '
        + 'counting.',
      obj: { kind: 'cull', region: 'nek', families: ['gnoll'], need: 10 },
      start: 'One at a time. Aim for a long breath. They are not going anywhere.',
      done: [['maribel', "Ten. I counted twice. That's the last of what he sent, or near enough.\n\nHis camp's further "
        + "out on the west road. Webstalker have it, Tibb said, or he lets them. A man like that doesn't keep guards he "
        + 'has to pay.']] },
    { id: 'camp', title: 'Take the note from the camp',
      log: 'The note-holder\'s camp is on the west road past the Oakes farm, and Webstalker stand over it. Clear '
        + 'them and find Thomas Oakes\'s note.',
      obj: { kind: 'retrieve', place: { region: 'nek', at: 'nek_hamlet_2', dx: -38, dy: 22, r: 9, name: 'the camp on the west road' },
        tier: 1, families: ['spider', 'gnoll'], packs: [[0, 0, 4], [4, 3, 3], [-4, -2, 3]], item: 'Thomas Oakes\'s note' },
      start: 'Nobody home but the spiders. Typical. He sends something else to do the work.',
      done: [
        ['narr', 'The camp is a lean-to, a cold fire and a tin box. In the box, folded small, is a note with Thomas '
          + 'Oakes\'s name at the bottom in a careful farmer\'s hand.'],
        ['maribel', "That's his writing. He always pressed too hard on the T.\n\nI could read it. I could find out "
          + 'what he wanted it for, and how much, and whether he meant to tell me.'],
        ['narr', 'She does not open it. She crouches by the cold fire, gets it going again with a flint from one of her '
          + 'many pockets, and holds the paper over it until the corner takes.'],
        ['maribel', "Thomas signed it. I don't have to know what for.\n\nThat's the last of it. The bank I can see the "
          + "end of, and this is gone, and there's nobody left I owe that I didn't choose to."],
        ['maribel', "I don't know what I do with my hands now. ...That's a joke. I know exactly. Cheapest contract on "
          + "the board, first thing tomorrow. Somebody has to, and I'd like it to be me, because I want to."],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { maribel: [
      'Owing nothing. I keep saying it under my breath, like a sum that came out right.',
      'Thomas pressed too hard on the T. I find I can think about that now and smile.',
      'Cheapest first. Not because I have to. Because the people who post them need somebody.',
      'You can have the big ones. I will cover your back while you take them. That is a choice, too.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ TOBIN
// "My dog Barley died standing in the doorway when wolves came. Wouldn't move." He never saw what it was.
const TOBIN = {
  id: 'tobin_doorway', status: 'built', who: ['tobin'],
  title: 'Barley\'s Doorway',
  open: { trust: 1.5, rank: 'iron' },
  moment: { id: 'comp_tobin', title: 'Never Steps Back' },
  offerLabel: 'Ask about Barley',
  offer: [
    ['tobin', "Can I tell you something stupid? I never saw them. The night Barley died. Mum put me in the back room "
      + "and held the door, and Barley held the front one, and in the morning there was just Barley.\n\nEveryone says "
      + "wolves. I don't know if it was wolves. I've been fighting things for months, and I don't know what killed my dog."],
    ['tobin', "Mum wrote that they've been back. Sniffing at doors. I want to go home and stand where he stood. Not "
      + "instead of him. Just... so somebody does. Would you come? I'll be the one in front. I'll try not to shake."],
  ],
  accept: ['tobin', 'Thank you. Thank you. I mean it twice. Milrow. The house with the yellow door, Mum painted it '
    + 'to match my shield. Or I painted my shield to match it. Nobody remembers.'],
  decline: ['tobin', "That's all right. I'm sorry. It's a lot to ask. I'll ask again when I'm braver. Or not, and ask anyway."],
  stages: [
    { id: 'house', title: 'Go to the Rusk house',
      log: 'Tobin wants to go home to Milrow and see the doorway where his dog Barley died. Walk to the Rusk house '
        + 'with him.',
      obj: { kind: 'escort', place: { region: 'nek', at: 'nek_hamlet_1', dx: -14, dy: 8, r: 7, name: 'the Rusk house' } },
      done: [
        ['tobin', "That's it. That's the doorway. You can still see the marks on the frame, low down. Mum won't paint "
          + "over them.\n\nHe was too old for it. He was so old. He could barely get up for his supper and he got up for that."],
        ['tobin', "Nan Pell lives across the lane. She was up that night, she's always up. If anybody saw anything, "
          + 'it was Nan.'],
      ] },
    { id: 'nan', title: 'Ask Nan Pell what came that night',
      log: 'Nan Pell watches the lane in Milrow at all hours. Ask her what came to the Rusk door the night Barley '
        + 'died, with Tobin beside you.',
      obj: { kind: 'talk', npc: { settlement: 'nek_hamlet_1', name: 'Nan Pell' }, ask: 'Ask about the night Barley died' },
      talk: [
        ['npc', "Riders came through last month asking how many of us there are. Not who. How many. I've been counting "
          + "us myself since, to be sure the answer's still the same. Tobin Rusk. That's one more."],
        ['tobin', 'Nan. The night Barley... You were up. What was it?'],
        ['npc', "Not wolves, love. Everybody says wolves because wolves is a word people know. They were spotted, and "
          + "they laughed. Palefang. Six of them, out of the bottoms south of the lane.\n\nThat old dog didn't bark once. "
          + 'He just stood there with his feet set. They went round him twice, and then they went home.'],
        ['tobin', 'They went home.'],
        ['npc', "They went home. He'd won, love. He just didn't get up after. And they've a den down there still, and "
          + "they've been coming up the lane again. I've heard them at your mother's door."],
      ],
      done: [['tobin', "Palefang. Not wolves. I don't know why that matters so much. It does, though.\n\nHe won. Nobody "
        + 'told me he won.']] },
    { id: 'den', title: 'Clear the den in the bottoms',
      log: 'The Palefang that came to the Rusk door still den in the bottoms south of Milrow. Clear the den, with '
        + 'Tobin in front.',
      obj: { kind: 'clear', place: { region: 'nek', at: 'nek_hamlet_1', dx: -10, dy: 32, r: 10, name: 'the den in the bottoms' },
        tier: 1, families: ['gnoll'], packs: [[0, 0, 4], [5, -2, 3], [-4, 3, 3]] },
      start: 'I can hear them laughing. Nan was right. I am in front. I am. Look.',
      done: [
        ['tobin', "I shook the whole time. I didn't move, though. Did you see? I didn't move.\n\nThat isn't all of them. "
          + "There's tracks going up the lane. Toward the house."],
        ['tobin', "They're going to the door. Of course they are. It's the door they know. I'm going to be in it before "
          + 'they are.'],
      ] },
    { id: 'doorway', title: 'Hold Barley\'s doorway',
      log: 'The rest of the pack is coming up the lane to the Rusk door, the way it came the night Barley died. Hold '
        + 'the doorway with Tobin\'s shield in it.',
      obj: { kind: 'waves', place: { region: 'nek', at: 'nek_hamlet_1', dx: -14, dy: 8, r: 8, name: 'the Rusk doorway' },
        tier: 1, families: ['gnoll', 'longshanks'], waves: [3, 4, 5] },
      start: 'Feet set. Feet set. That is all he did. I can do that.',
      done: [
        ['narr', 'The last of them breaks on the yellow shield and goes back down the lane, and does not come again. '
          + 'Tobin stays in the doorway a long while with his feet set, breathing.'],
        ['tobin', "Is it over? Tell me if it's over. I can't tell. I'm not going to move until somebody tells me."],
        ['tobin', "...All right.\n\nHe never got to do this bit. The bit after, where you're allowed."],
        ['narr', 'Tobin takes one step back out of the doorway, into the house. Then he sits down on the floor, with '
          + 'his shield across his knees, and laughs, and cries a bit, and does not apologise for either.'],
        ['tobin', "I've never stepped back. Everyone says that about me like it's the good part. It isn't. This is. "
          + "I stood there till it was finished, and then I stepped back because I could.\n\nGood boy. I'm going to "
          + 'say that to the door every time I come home.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { tobin: [
      'Palefang. Six of them. He won. I tell myself that most nights, and it is true every time.',
      'I am in front. I shake less. Not none. Less.',
      'When it is over, somebody tell me. Then I will step back. That is allowed. Barley taught me.',
      'Mum painted over the marks on the frame. She asked me first. I said yes.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------- YSOLDE
// "Trust. Not the speech. The real thing, where you turn your back on me and keep your purse where it is." The
// merchant whose strongbox her essences came out of is still trading. No clerk will take evidence from a thief.
const YSOLDE = {
  id: 'ysolde_strongbox', status: 'built', who: ['ysolde'],
  title: 'The Strongbox',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_ysolde', title: 'Back Turned' },
  offerLabel: 'Ask about the strongbox',
  offer: [
    ['ysolde', "I saw a mark on a crate on the Harrowmoor quay last week. A little sun with a key through it. The same "
      + "mark was on the strongbox my essences came out of.\n\nThe man who should never have had them is still trading. "
      + 'Somebody hanged for less than he does, and it was not him.'],
    ['ysolde', "I can find his books. I am very good at finding things. But a Society clerk will not take evidence from "
      + "a thief, so I would need somebody to carry it in who is not one.\n\nThat would mean my handing it to you. "
      + 'Think about whether you want that before you say yes.'],
  ],
  accept: ['ysolde', "Mm. All right. Harrowmoor, then. Down by the water. Keep your purse wherever you like. That is a joke. Mostly."],
  decline: ['ysolde', "Sensible. He has kept this long. So have I."],
  stages: [
    { id: 'quay', title: 'Go down to the Harrowmoor water',
      log: 'Ysolde has seen the mark of the merchant whose strongbox she robbed on a crate on the Harrowmoor quay. '
        + 'Go down to the water with her.',
      obj: { kind: 'escort', place: { region: 'ontaria', at: 'ont_city', dx: 14, dy: 16, r: 8, name: 'the Harrowmoor quay' } },
      done: [['ysolde', "Gone. Of course. Crates do not wait about.\n\nCutter Bly works this end of the quay. He watches "
        + "who goes down to the water and comes back dry. He will not talk to me. He might talk to you."]] },
    { id: 'bly', title: 'Ask Cutter Bly about the dry ones',
      log: 'Cutter Bly watches the Harrowmoor quay at odd hours. Ask him where the merchant with the sun-and-key mark '
        + 'takes his cargo, with Ysolde there.',
      obj: { kind: 'talk', npc: { settlement: 'ont_city', name: 'Cutter Bly' }, ask: 'Ask about the sun-and-key crates' },
      talk: [
        ['npc', "Folk go down to the water at odd hours and come back with nothing wet on them. I said I'd drawn my own "
          + "conclusions. You want them? They're not cheap and they're not safe."],
        ['ysolde', "He will tell you. He is looking at me to see whether I will take his purse while he does."],
        ['npc', "...Sun and a key. Pask's mark. Respectable man. Goes to temple. Gets his cargo landed off the coast where "
          + "the Lurefin work, because nobody honest goes swimming there, and carts it up to a cellar on the Sailmend road."],
        ['npc', "Clear the water and he's got no way in that doesn't come past the Harbourmaster. That'll make him "
          + 'nervous. Nervous men move their books.'],
        ['ysolde', "And then I know where they are. Thank you, Cutter. I have not touched your purse. You may check."],
      ],
      done: [['ysolde', "Pask. I never knew his name. I knew his cellar very well. It is odd, being told."]] },
    { id: 'water', title: 'Clear the smugglers\' water',
      log: 'Pask lands his cargo where the Lurefin work the Ontaria coast, so nobody honest goes near. Cull eight of '
        + 'them and close his water.',
      obj: { kind: 'cull', region: 'ontaria', families: ['lurefin'], need: 8 },
      start: 'Lights in the water. Do not follow the lights. I learned that one young.',
      done: [['ysolde', "That is his water closed. He will hear by tonight.\n\nHe will go to the cellar for his books. I "
        + 'would. The Sailmend road, Cutter said. I know which cellar. I have been in it.']] },
    { id: 'cellar', title: 'Take Pask\'s ledger from the cellar',
      log: 'Pask keeps his true books in a cellar on the Sailmend road, and Webstalker are nesting over it. Clear '
        + 'them and find the ledger.',
      obj: { kind: 'retrieve', place: { region: 'ontaria', at: 'ont_village_a', dx: -30, dy: -26, r: 9, name: 'the cellar on the Sailmend road' },
        tier: 2, families: ['spider', 'shade'], packs: [[0, 0, 4], [4, -3, 3], [-4, 3, 3]], item: 'Pask\'s ledger' },
      start: 'Third step down creaks. It creaked then, too.',
      done: [
        ['narr', 'Under the webs, against the back wall, there is an iron strongbox with a sun and a key on the lid. The '
          + 'lock has been mended once, badly. Inside is a ledger in a neat temple-going hand.'],
        ['ysolde', "Every unregistered essence he has moved in ten years. Who sold, who bought, who carried. Mine are "
          + "in here. Three lines, nine years ago, marked 'lost'.\n\nI was eighteen. I was the loss."],
        ['narr', 'She holds the ledger out to you. When you take it she lets go at once, and turns round, and stands '
          + 'with her back to you and her hands open at her sides, where you can see them.'],
        ['ysolde', "There. That is the whole of it. You have the only thing in this cellar worth stealing, and I am "
          + "looking at a wall.\n\nI asked everybody for this and nobody gave it. I thought I should find out whether I "
          + 'could give it first.'],
        ['ysolde', "Take it to the Society. Say you found it. You did, more or less. ...No, say I found it. Say a thief "
          + 'found it, and handed it to you, and turned her back. I would like that written down somewhere.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { ysolde: [
      'Pask is in a cell in Harrowmoor. The clerk wrote my name in the report. Spelled wrong. I did not mind.',
      'Go on, turn your back. I will be here when you turn round. That is new for both of us.',
      'Night work is still mine. I find I like company for it.',
      'Three lines marked lost. I am not lost. I checked.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- PELL
// "Somebody who'll jump in after you. The boat went down and nobody did. I want the one who would." The boat went
// down off Cobb Point; Old Sten saw "a boat with nobody rowing it".
const PELL = {
  id: 'pell_boat', status: 'built', who: ['pell'],
  title: 'The One Who Would',
  open: { trust: 1.5, rank: 'iron' },
  moment: { id: 'comp_pell', title: 'Jumped In' },
  offerLabel: 'Ask about the boat',
  offer: [
    ['pell', "Old Sten in Sailmend says the only thing that ever frightened him on the water was a boat with nobody "
      + "rowing it. He says it to everybody. He said it to me once, and then went white and said sorry, and walked off.\n\n"
      + 'I think he saw Dad\'s boat. After.'],
    ['pell', "I'm not sad about it! Well. I'm a bit sad. Mostly I want the name-board back. The Patience. Dad carved "
      + "it himself and spelled it wrong and fixed it with a nail.\n\nCome with me? You can hold my boots. Somebody has to."],
  ],
  accept: ['pell', "Brilliant! Sailmend. Sten first. I'll bring fish. You'll want the fish."],
  decline: ['pell', "Fine, fine. It's been on the bottom this long. It's not going to get any wetter."],
  stages: [
    { id: 'sten', title: 'Ask Old Sten about the empty boat',
      log: 'Old Sten of Sailmend once saw a boat with nobody rowing it. Pell thinks it was her father\'s. Ask him, '
        + 'with her there.',
      obj: { kind: 'talk', npc: { settlement: 'ont_village_a', name: 'Old Sten' }, ask: 'Ask about the boat with nobody rowing it' },
      talk: [
        ['npc', "Forty years on that water. The only thing that ever frightened me was a boat with nobody rowing it. "
          + "...Ah. You're Ashgrove's girl. You've come about that."],
        ['pell', "I have! I'm not cross. I just want to know."],
        ['npc', "Week after the squall. Come up off Cobb Point bottom-up and righted itself, the way they don't, and drifted "
          + "in on the tide with nobody in it, and went down again off the rocks east of the jetty. Things nest in it now. "
          + "Fishermen won't set a net within a rope of it."],
        ['npc', "I never told your dad. He'd stopped going down to the water. I'm sorry, girl. I should have rowed out. "
          + "When it went down with you in it. I was close enough. I should have."],
        ['pell', "Everyone was close enough. That's all right, Sten. It's not your fault you're not the one who would."],
      ],
      done: [['pell', "Off Cobb Point, east of the jetty. That's a long way for a boat to go home by itself. Good boat."]] },
    { id: 'shore', title: 'Go to the shore off Cobb Point',
      log: 'The Patience went down a second time off the rocks east of the Cobb Point jetty. Walk down to that shore '
        + 'with Pell.',
      obj: { kind: 'goto', place: { region: 'ontaria', at: 'ont_village_b', dx: 22, dy: 16, r: 8, name: 'the shore off Cobb Point' } },
      start: 'I have not been on this bit of beach since. Huh. It is just a beach.',
      done: [['pell', "There. See the ribs, out past the rocks, when the water goes down? That's her. And that's "
        + "something living in her. Lots of somethings. Rude."]] },
    { id: 'wreck', title: 'Clear the wreck',
      log: 'Driftreaver and Urchinroll have taken the wreck of the Patience for a nest. Clear them out of it so Pell '
        + 'can get to the name-board.',
      obj: { kind: 'clear', place: { region: 'ontaria', at: 'ont_village_b', dx: 28, dy: 22, r: 9, name: 'the wreck of the Patience' },
        tier: 1, families: ['driftreaver', 'urchinroll'], packs: [[0, 0, 4], [4, 2, 3], [-3, -3, 3]] },
      start: 'Out of my dad\'s boat. Out. Go on.',
      done: [
        ['pell', "Ha! Evicted. The name-board's on the bow, and the bow's under. I'm going down for it. I breathe water. "
          + "It's my one trick. Well, one of three."],
        ['pell', "Thing is, the tide's bringing more of them in, and I'll be down there a while. Stand on the jetty and "
          + "keep them off the water? I'll be quick. I won't be quick. I'll be as quick as I am."],
      ] },
    { id: 'jetty', title: 'Hold the jetty while Pell dives',
      log: 'Pell is diving for the Patience\'s name-board and the tide is bringing more in. Hold the Cobb Point jetty '
        + 'until she comes up.',
      obj: { kind: 'waves', place: { region: 'ontaria', at: 'ont_village_b', dx: 12, dy: 18, r: 9, name: 'the Cobb Point jetty' },
        tier: 1, families: ['driftreaver', 'urchinroll', 'crocodile'], waves: [3, 4, 5] },
      start: 'Hold my boots. I mean it. Those are good boots.',
      done: [
        ['narr', 'Pell comes up with a plank under her arm, grinning, just as the last wave hits the jetty. A Cobb Point '
          + 'fishing boat coming in on the tide takes it broadside and goes over, and a man goes into the water and does '
          + 'not come up.'],
        ['narr', 'Pell drops the name-board on the boards and goes in after him. She does not look round to see if '
          + 'anybody will follow. Then she is under, and so, a heartbeat later, are you.'],
        ['pell', "...Got him. Got him! You got the other arm. You came in. You came in, you idiot, you can't even "
          + "breathe water!"],
        ['pell', "I've spent years wanting the one who would. I was so busy watching for them I forgot to go first.\n\n"
          + "I didn't look back. I didn't need to. You were already wet."],
        ['pell', "Right. Name-board. 'The Pacience.' With a nail through the C. I'm putting it on the hall wall, next to "
          + 'Tobin\'s shield, and I am going to tell everyone this story wrong, so I sound braver. You can correct me.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { pell: [
      'You came in. Can not breathe water and came in anyway. I am going to bring that up at every supper.',
      'The Pacience. With a nail through the C. It is on the wall. Look at it, it is a good board.',
      'I go first now. Into the water, I mean. Not the fish. You can have the first fish.',
      'Sten rowed out last week to help a lad with a snagged net. He told me about it twice. I let him.',
    ] },
  },
};

// ---------------------------------------------------------------------------------------------------- GARRICK
// "Three teams. First one, the mine came down on them and I dug for two days." He wants "someone who keeps people
// alive", and has never once come out of a hole in the ground with everybody.
const GARRICK = {
  id: 'garrick_cavein', status: 'built', who: ['garrick'],
  title: 'Three Teams',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_garrick', title: 'Nobody Dug Out' },
  offerLabel: 'Ask about the first team',
  offer: [
    ['garrick', "The first team. I said the mine came down. It was a quarry gallery above Coldharrow. Four of them in "
      + "it and me outside it, because I'd gone for water.\n\nI dug two days. I got to Hobb. Not to the others. Then the "
      + 'Society called it closed and nobody cut that face again.'],
    ['garrick', "Something's denned in the fall now. Uld wrote to me. The village wants it cleared, and nobody wants "
      + "to go into that hole, and I don't blame them.\n\nI'll go. I'd like you behind me. Not because you're brave. "
      + "Because you keep them alive."],
  ],
  accept: ['garrick', 'Coldharrow. Bring something warm. It is not a warm place, and it is a cold hole.'],
  decline: ['garrick', "Hm. Fair. It's kept. It's good at keeping."],
  stages: [
    { id: 'uld', title: 'Ask Stonecutter Uld about the old gallery',
      log: 'Garrick\'s first team died in a quarry gallery above Coldharrow. Stonecutter Uld wrote to him that '
        + 'something has denned in the fall. Ask Uld about it, with Garrick there.',
      obj: { kind: 'talk', npc: { settlement: 'ele_hamlet_1', name: 'Stonecutter Uld' }, ask: 'Ask about the old gallery' },
      talk: [
        ['npc', "Everything here is built out of what's already here. There's no forest to argue with. That gallery "
          + "is in half the walls in this village. We stopped cutting it after."],
        ['garrick', 'Uld.'],
        ['npc', "Garrick. You look the same. Bigger, maybe. Something's dug into the fall from the far side. Tunnelmaw, "
          + "and those one-eyed things, Monocul. We hear them in the stone at night. My grandson says it sounds like "
          + "somebody digging."],
        ['garrick', "It does not. I know what digging sounds like."],
        ['npc', "I know you do. I brought you water, the second day. You didn't drink it. ...They've opened the gallery "
          + "behind the fall, Garrick. If anything's still in there, it's reachable now."],
      ],
      done: [['garrick', "Reachable. Hm.\n\nThe face is up the north track. You'll see it. It's the bit of hill nobody "
        + 'built anything out of.']] },
    { id: 'face', title: 'Climb to the quarry face',
      log: 'The old gallery is up the north track above Coldharrow, in the one bit of hill the village never cut '
        + 'again. Go up to the face with Garrick.',
      obj: { kind: 'escort', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 6, dy: -28, r: 9, name: 'the quarry face' } },
      start: 'Up. Keep left on the track. The right side was never safe.',
      done: [['garrick', "There's my spoil heap. Still there. Two days of it.\n\nI can hear them. Under the fall. Going "
        + 'back and forth. Right. In we go. I hold the roof, you hold the rest.']] },
    { id: 'fall', title: 'Clear the den in the fall',
      log: 'Tunnelmaw and Monocul have denned in the cave-in that killed Garrick\'s first team. Clear them out of '
        + 'the fall.',
      obj: { kind: 'clear', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 10, dy: -36, r: 9, name: 'the fall' },
        tier: 2, families: ['tunnelmaw', 'monocul'], packs: [[0, 0, 4], [4, -2, 3], [-4, 2, 3]] },
      start: 'Stay off the loose stuff. Walk where I walk.',
      done: [
        ['garrick', "Clear. Look at that. They've cut straight through to the gallery. Good tunnellers. Better than me."],
        ['narr', 'Beyond the fall the old gallery is dry and still. Three picks lean against the wall where three people '
          + 'set them down to rest and did not pick them up again. There are names scratched in the rock at shoulder '
          + 'height, the way quarrymen mark a face.'],
        ['garrick', "Sanna. Old Pieter. Mags. Hobb's is there too; he cut it the first week.\n\nI want them out. The "
          + "picks, and what's left. It'll take me the rest of the day. The rest of the nest will come back to it while "
          + 'I do. Hold the face for me. Keep everybody out of the hole that is not me.'],
      ] },
    { id: 'dig', title: 'Hold the face while Garrick digs',
      log: 'Garrick is bringing his first team out of the old gallery. The rest of the nest is coming back to the '
        + 'face. Hold it until he is done, and keep everyone alive.',
      obj: { kind: 'waves', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 6, dy: -30, r: 10, name: 'the quarry face' },
        tier: 2, families: ['tunnelmaw', 'grubwyrm', 'monocul'], waves: [3, 4, 5, 4] },
      start: 'I am digging. Do not tell me how it is going. Tell me if somebody falls.',
      done: [
        ['narr', 'Garrick comes out of the hole at dusk, grey with dust to the horns, carrying three picks and a bundle '
          + 'wrapped in his own cloak. He sets them down on the spoil heap. Then he counts you. He counts you twice.'],
        ['garrick', "...Everybody.\n\nI've come out of a hole in the ground eleven times in my life. Every time, I've "
          + "counted. Every time it was short."],
        ['garrick', "Nobody dug out. Nobody to dig out. I keep saying it and it keeps being true.\n\nThree teams. I said "
          + "never again. A cave-in, a cult and a wedding. I have been angry at all three, and it turns out what I was "
          + "angry at was the counting."],
        ['garrick', "Uld will want to put the names on the new wall. Sanna, Pieter, Mags, Hobb. I'll cut them myself. "
          + "Then I'll come down off this hill and hold the door for you.\n\nNot never again. Again. With you."],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { garrick: [
      'Four names on the Coldharrow wall. Cut them myself. Straight lines. Sanna would have checked.',
      'Everybody. I counted. I still count. It comes out right now.',
      'I hold the door. You keep them alive. It works. Do not make me say that again.',
      'Teams are a lovely way to get your friends killed. I used to say that. Now I say it and laugh.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------- ALDRIC
// "The worst thing that ever came over it wasn't a monster. It was an order." He has never said what. "I don't
// miss pretending the walls were for everyone." Old Rurik reads every posting on the Cadence board.
const ALDRIC = {
  id: 'aldric_lookaway', status: 'built', who: ['aldric'],
  title: 'What the Watch Looked Away From',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_aldric', title: 'Did Not Look Away' },
  offerLabel: 'Ask about the order',
  offer: [
    ['aldric', "You've never asked what the watch wanted me to look away from. I've noticed. It's one of the reasons "
      + "I'm still walking with you.\n\nThere's one entry in my ledger I never wrote. Twenty years, and one blank line. "
      + 'I would like to fill it in.'],
    ['aldric', "I can't write it from what I was told. I need what happened. Old Rurik in Cadence reads every posting "
      + "that goes up on that board and remembers the ones that come down. One came down that night. I'd like you to "
      + 'ask him, and I would like you to hear the answer, because I chose you to.'],
  ],
  accept: ['aldric', "Cadence, then. By the book. We ask, we go, we look, I write it. In that order."],
  decline: ['aldric', "Understood. It's been blank a long while. It will keep until you are ready to read it."],
  stages: [
    { id: 'rurik', title: 'Ask Old Rurik about the posting that came down',
      log: 'Aldric left the Cadence watch rather than look away from something. Old Rurik reads every posting on the '
        + 'Cadence board. Ask him about the one that came down the night Aldric was given the order.',
      obj: { kind: 'talk', npc: { settlement: 'nek_city', name: 'Old Rurik' }, ask: 'Ask about the posting that came down' },
      talk: [
        ['npc', "Retired from hunting years back. Still can't walk past that board without reading every posting on it. "
          + "Sergeant Venn. I wondered when you'd come in."],
        ['aldric', "The Fenn Cross road. The spring the walls shut early. There was a posting."],
        ['npc', "There was. 'Farm families on the Fenn Cross road, forty or so, sheltering at the stone bridge. Escort "
          + "wanted to Cadence gate.' It went up at noon. It came down an hour after, and nobody took it. Nobody was let "
          + "to take it."],
        ['npc', "The watch sent a patrol. Yours, I think. It went out as far as the bridge and turned round and came "
          + "back, and the gate book for that night says 'road quiet'.\n\nI went out myself, a week on. There's an old "
          + "barrow off the road past the bridge. The ground was turned over fresh. And somebody'd left a lantern on it, "
          + 'which is not what you do if you are hiding a thing. It is what you do if you are sorry.'],
        ['aldric', "The patrol was mine. The order to turn back was the captain's. The order to write 'road quiet' was "
          + "his too. I would not write it. He tore the page out and wrote it himself."],
      ],
      done: [['aldric', "Forty or so. He told me it was a rumour. I want the number.\n\nThe bridge, then. Walk it with me."]] },
    { id: 'bridge', title: 'Walk to the stone bridge',
      log: 'The patrol Aldric led was turned back at the stone bridge on the Fenn Cross road. Walk to the bridge '
        + 'with him.',
      obj: { kind: 'escort', place: { region: 'nek', at: 'nek_hamlet_2', dx: 32, dy: -24, r: 8, name: 'the stone bridge' } },
      start: 'Left at the milestone. I have walked this in my sleep for a long time.',
      done: [
        ['aldric', "Here. This is where I turned them round. I had a lad called Pym crying, and I told him an order is "
          + "an order, and he stopped. I have thought about that more than about anything else."],
        ['aldric', "The barrow is past the bridge. Something has been walking on it. You can see the path."],
      ] },
    { id: 'barrow', title: 'Open the barrow',
      log: 'Somebody buried the farm families in an old barrow past the stone bridge. Boneguard walk it now. Clear '
        + 'them and find what was buried with the dead.',
      obj: { kind: 'retrieve', place: { region: 'nek', at: 'nek_hamlet_2', dx: 38, dy: -32, r: 9, name: 'the old barrow' },
        tier: 2, families: ['skeleton', 'gravesown'], packs: [[0, 0, 4], [4, 3, 3], [-4, -2, 3]], item: 'the gate book\'s missing page' },
      start: 'Shield wall. Nobody steps off the path.',
      done: [
        ['narr', 'In the turned earth at the barrow\'s mouth, under a rusted lantern, is a small watch strongbox. Inside, '
          + 'folded once, is a page torn from a gate book, and a list in a clerk\'s hand: forty-four names, and the '
          + 'words "gate kept shut on orders".'],
        ['aldric', "This is Hollin's hand. The gate clerk. He wrote it out true and buried it with them, and went back "
          + "and said nothing for the rest of his life. I knew him twenty years.\n\nForty-four. Not forty or so. Forty-four."],
      ] },
    { id: 'entry', title: 'Let Aldric write the entry',
      log: 'Aldric has the true page and forty-four names. He has kept one line in his ledger blank for years. Talk '
        + 'to him, and let him write it.',
      obj: { kind: 'confide', ask: 'Tell Aldric to write it down' },
      talk: [
        ['aldric', "Every contract goes in the ledger. Who went in, who came out, what we would do different. I have "
          + "never once left a line blank, except this one."],
        ['aldric', "I want you to watch me write it. Not because I need a witness. Because I chose you, and this is "
          + 'what I chose you for.'],
      ],
      done: [
        ['narr', 'Aldric sits on the barrow\'s edge with the ledger on his knee and writes for a long time, in a square '
          + 'careful hand, without stopping.'],
        ['aldric', "'Fenn Cross road, the spring the walls shut early. Forty-four souls sheltering at the stone bridge. "
          + "Patrol under Sgt. A. Venn ordered back at the bridge. Patrol complied. Gate kept shut on orders. None came "
          + "in.'\n\n'What we would do different: go on.'"],
        ['aldric', "Signed. A. Venn, formerly of the Cadence watch.\n\nThe watch asked me to look away. I did not, and "
          + "I still turned the patrol round. Both are true. The ledger is only any good if both go in."],
        ['aldric', "I'll copy Hollin's list to the Society and to the council, and I'll put my name under his.\n\nYou "
          + "did not look away either, just now. You read every word. I watched you do it. My word goes with you, and "
          + 'I will not be taking it back.'],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { aldric: [
      'The ledger has no blank lines in it now. It is heavier. It reads better.',
      'Forty-four. Hollin wrote them out true. I read them over, now and then, so somebody does.',
      'I used to say I would not serve where I was not trusted. I have stopped saying it. There is no need.',
      'Go on, when they say turn back. I wrote that down. I mean to keep to it.',
    ] },
  },
};

export const STORIES = [KESH, MARIBEL, TOBIN, YSOLDE, PELL, GARRICK, ALDRIC];
