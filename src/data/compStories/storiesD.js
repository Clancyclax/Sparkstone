// ROUND 407 -- companion story quests, batch D (filled in by the round's writing pass).
// Juno, Wim, Lark, and the four old hands: Hester, Orrin, Tamsin, Mattias.

// ------------------------------------------------------------------------------------------------------- JUNO
// "Bonded Wing the day she was nearly fired for being late, and has never been late since." Her epitaph: "She always
// went up to look. She didn't see it coming from below." This is her arriving on time, on foot, looking down.
const JUNO = {
  id: 'juno_gorge', status: 'built', who: ['juno'],
  title: 'On Time',
  open: { trust: 1.5, rank: 'bronze' },
  moment: { id: 'comp_juno', title: 'Where She Said' },
  offerLabel: 'Ask about the post',
  offer: [
    ['juno', 'Post-rider Enna at Kiln Halt has done her knee. She asked if I would carry the Ashfall run for her. Once. '
      + 'I said yes before she finished the sentence, which is the problem.\n\nI always say yes fast. Then I always '
      + 'get there an hour early.'],
    ['juno', 'People think that is being good at it. It is not. It is being frightened of the day I nearly got sacked, '
      + 'with wings on.\n\nI want to do one run properly. Walk it, the way Enna does. Say a time and be there at the '
      + 'time. Not before. Will you walk it with me? You are slow. That is a compliment today.'],
  ],
  accept: ['juno', 'Kiln Halt, then. Enna first. She will want to tell me everything I am doing wrong, and I am going to let her.'],
  decline: ['juno', 'Fine. I will tell Enna next week. I will be early telling her.'],
  stages: [
    { id: 'enna', title: 'Ask Post-rider Enna',
      log: 'Enna rides the post from Kiln Halt to Ashfall Station and has hurt her knee. Juno has offered to carry '
        + 'the run. Ask Enna how it is done, with Juno there.',
      obj: { kind: 'talk', npc: { settlement: 'cin_relay', name: 'Post-rider Enna' }, ask: 'Ask how the Ashfall run is done' },
      talk: [
        ['npc', "Six hours, Kiln Halt to Ashfall. About four of them are deciding where to put your feet. The bag's the "
          + "easy part."],
        ['juno', 'I could do it in one. Less, with a tailwind.'],
        ['npc', "You could. And you'd get there with the letters and no idea what's on the road. That's half the job. "
          + "Gorr asks me every time what I saw, and I tell him, and that's how Ashfall knows when to shut its gate."],
        ['npc', "The Smokecur have been walking alongside me since the turn of the season. Not close. Just keeping pace. "
          + "And the ground near Ashfall has been giving a little where it never used to.\n\nNoon bell. I've been in "
          + "under the noon bell for nine years. Don't be early. Gorr hates early. He has to find somewhere to put you."],
        ['juno', 'Noon bell. On foot. Not early. I can do that. I think I can do that.'],
      ],
      done: [['juno', 'She gave me the bag. It is heavier than I thought. That is probably the letters. It is probably not the letters.']] },
    { id: 'road', title: 'Walk the post road',
      log: 'Juno is carrying the post to Ashfall Station on foot, the way Enna does. Walk the road with her to the last '
        + 'marker before Ashfall, and keep her beside you. She will want to go up. Do not let her.',
      obj: { kind: 'escort', place: { region: 'cinder', at: 'cin_camp', dx: 34, dy: 26, r: 10, name: 'the last marker on the post road' } },
      start: 'I am walking. Look at me walking. This is very slow.',
      done: [
        ['juno', 'The last marker. Enna has scratched a line on it for every run. There are a lot of lines.\n\nI '
          + 'noticed things on the way. A cracked crust by the second marker. A dead Smokecur that was not killed by '
          + 'anything I could see. I never notice things. I am usually above them.'],
        ['juno', 'And the Smokecur are still pacing us. Out there, on the left. Enna said they keep pace. I do not want '
          + 'anything keeping pace with me when I walk in under that bell.'],
      ] },
    { id: 'smokecur', title: 'Thin the Smokecur',
      log: 'Smokecur have been pacing the post road since the turn of the season. Kill ten of them in the Cinderwaste '
        + 'so Juno can bring the post in clean.',
      obj: { kind: 'cull', region: 'cinder', families: ['smokecur'], need: 10 },
      start: 'Out there. On the left. I see them. I am staying on the ground. Mostly.',
      done: [
        ['juno', 'Ten. That should keep the rest at home for a while.\n\nThey were not hunting us, you know. They were '
          + 'walking away from something and we happened to be going the same way. I only saw that because I was down '
          + 'here.'],
        ['juno', 'Ashfall. Noon bell. We have exactly long enough, if we walk. I am going to walk.'],
      ] },
    { id: 'bell', title: 'In under the noon bell',
      log: 'Walk into Ashfall Station with the post at the noon bell, the hour Juno promised. Something has been moving '
        + 'under the ground near the gate. Hold it with her.',
      obj: { kind: 'waves', place: { region: 'cinder', at: 'cin_camp', dx: 6, dy: 9, r: 10, name: 'the gate at Ashfall Station' },
        tier: 2, families: ['tunnelmaw', 'smokecur', 'grubwyrm'], waves: [3, 4, 5] },
      start: 'Wait. The ground. Look at the ground. Something is coming up.',
      done: [
        ['narr', 'The last Tunnelmaw goes back down into the crust it came out of and does not come up again. Behind the '
          + 'gate the noon bell is still ringing.'],
        ['juno', 'I saw it. I saw it come up. I was looking at the ground because I was not late for anything, so I had '
          + 'the time to look at the ground.\n\nIf I had flown in I would have landed right on top of it. An hour early, '
          + 'and very pleased with myself.'],
        ['juno', 'Stationmaster Gorr has signed for the bag. He asked me what I saw on the road. I told him. All of it. '
          + 'It took a while. He wrote it down.'],
        ['juno', 'I said noon, and I came at noon, and I was where I said. It is a very small thing. I have been trying '
          + 'to do it since I was fifteen.\n\nI am still going up to look. I like it up there. I am just going to look '
          + 'down first.'],
      ] },
  ],
  reward: {
    deed: 'contract',
    trust: 4,
    idle: { juno: [
      'I am on time. Not early. On time. It feels like standing still and it is not.',
      'Look down first, then up. Enna\'s rule. It is a good rule.',
      'Gorr wants me back on the run. I said I would think about it. I am thinking about it on the ground.',
      'From up high everything looks fixable. From down here you can see what needs fixing. I like both now.',
    ] },
  },
};

// -------------------------------------------------------------------------------------------------------- WIM
// "His notes have saved them four times and been wrong twice." He remembers only the two. Tessa Rooke's cave "the
// tide only opens twice a month" is a plan with a contingency in it, and the contingency is the climax.
const WIM = {
  id: 'wim_contingency', status: 'built', who: ['wim'],
  title: 'The Contingency',
  open: { trust: 1.5, rank: 'iron' },
  moment: { id: 'comp_wim', title: 'The Plan Held' },
  offerLabel: 'Ask about the cave plan',
  offer: [
    ['wim', 'My notes have saved the team four times. They have been wrong twice. I can tell you every word of the two. '
      + 'I would have to look up the four.\n\nThat is not healthy. Lark says so. I have it written down that Lark says so.'],
    ['wim', 'There is a cave down the coast from Cobb Point. The tide only opens it twice a month. Something in there has '
      + 'been fouling Sailmend\'s nets every spring tide, and the contract has been on Goodwife Prell\'s board since '
      + 'before we registered.\n\nI have a plan for it. Three pages. One contingency. I would like to see whether it is '
      + 'the kind of plan that works, with somebody who is not on my team watching. Fewer people to apologise to.'],
  ],
  accept: ['wim', 'Sailmend first. Prell has the tide book. I need the tide book. I have most of the tide book copied, but I need to check the copy.'],
  decline: ['wim', 'Of course. I will add it to the list. It is a long list. It is mostly things I have not done.'],
  stages: [
    { id: 'prell', title: 'Ask Goodwife Prell for the tide book',
      log: 'Wim\'s plan for the cave at Cobb Point hangs on the tides. Goodwife Prell keeps Sailmend\'s board and its '
        + 'tide book. Ask her about the contract, with Wim there.',
      obj: { kind: 'talk', npc: { settlement: 'ont_village_a', name: 'Goodwife Prell' }, ask: 'Ask about the Cobb Point contract' },
      talk: [
        ['npc', "The board's over there and the tea's over here. You want the board. That one at the bottom, curled up. "
          + "It's been there two years. Nobody wants a cave you have to leave on time."],
        ['wim', 'I have a plan. Low water in at the start of the slack, clear the inside, out before the flood. Forty '
          + 'minutes. I have allowed thirty-five.'],
        ['npc', "Tide book's under the till. Help yourself. But I'll tell you what Old Sten tells everybody who reads it: "
          + "that cave doesn't keep the book. Twice he's seen the water come back in early down there, and the second "
          + "time it brought something with it."],
        ['wim', 'Yes. That is my contingency. I have one. Everyone says it is page eleven. It is on page three.'],
        ['npc', "Then you're the first one who's written it down. Drink your tea first."],
      ],
      done: [['wim', 'The copy was right. I checked it twice. I am going to check it once more on the way, and then I am going to stop.']] },
    { id: 'mouth', title: 'Go to the cave mouth',
      log: 'Tessa Rooke\'s cave lies down the coast from Cobb Point and opens only at the low spring tide. Get to the '
        + 'mouth with Wim before the slack begins.',
      obj: { kind: 'goto', place: { region: 'ontaria', at: 'ont_village_b', dx: 30, dy: 14, r: 8, name: 'the cave mouth below Cobb Point' } },
      done: [
        ['wim', 'There. Open. Exactly when the book said. That is one thing right.\n\nI am not counting it. You do not '
          + 'count the parts that are just reading.'],
        ['wim', 'The plan. One: in. Two: clear whatever is on the nets. Three: out before the flood. Contingency: if the '
          + 'water turns early, we do not run for the mouth, because the mouth is where it comes in. We stand on the high '
          + 'shelf at the back and hold. I measured the shelf from a drawing. The drawing was quite old.'],
      ] },
    { id: 'inside', title: 'Clear the cave',
      log: 'Urchinroll are packed into the cave below Cobb Point, rolling out with the tide to foul the nets. Clear '
        + 'them out while the water is low.',
      obj: { kind: 'clear', place: { region: 'ontaria', at: 'ont_village_b', dx: 36, dy: 20, r: 9, name: 'the tide cave' },
        tier: 1, families: ['urchinroll'], packs: [[0, 0, 4], [4, -2, 3], [-3, 4, 3]] },
      start: 'Step two. Mind the spines. I have a page about the spines.',
      done: [
        ['wim', 'Done. Twenty-two minutes. I allowed twenty-five.\n\nThat is the plan, all of it, and it worked. I keep '
          + 'waiting to feel the way I feel about the two that did not. I think I just feel nothing. Is that what working '
          + 'feels like?'],
        ['narr', 'Somewhere toward the mouth, the sound of the sea changes.'],
        ['wim', 'Oh. That is early. That is fifteen minutes early. The shelf. Get on the shelf. This is page three.'],
      ] },
    { id: 'shelf', title: 'Hold the high shelf',
      log: 'The tide has turned early, the way Old Sten said it could, and brought things in with it. Wim planned for '
        + 'this. Hold the high shelf at the back of the cave until the water drops.',
      obj: { kind: 'waves', place: { region: 'ontaria', at: 'ont_village_b', dx: 39, dy: 24, r: 8, name: 'the high shelf' },
        tier: 1, families: ['driftreaver', 'urchinroll', 'crocodile'], waves: [3, 4, 4] },
      start: 'Contingency. This is the contingency. I wrote this down. Stand where I wrote you.',
      done: [
        ['narr', 'The water comes up to the lip of the shelf and stops there. The last Driftreaver goes out with it.'],
        ['wim', 'It held. The shelf held. The drawing was old and it was right. The plan was right.\n\nNot the part '
          + 'that was easy. The part where everything went wrong. That part was right.'],
        ['wim', 'Five times, then. Five times my notes have saved somebody. I am going to write that on the first page, '
          + 'above the two, so I see it first.'],
        ['wim', 'And I am putting you in. Not in the column for what could go wrong. In the plan. Here: "Step one, check '
          + 'the tide. Step two, bring them." That is the whole of page one now.'],
      ] },
  ],
  reward: {
    deed: 'council',
    trust: 4,
    idle: { wim: [
      'Five and two. I have written it at the top. Five first.',
      'You are on page one. I have not moved you. I check.',
      'The contingency is the plan too. I did not know that. I have written it down.',
      'Eleven pages of what could go wrong. We hit page three. It was fine. It was more than fine.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- LARK
// "Heals everything that will hold still, including monsters, which the team is still discussing." Her want: "Gentle
// doesn't mean soft. Gentle means you could hurt something and you don't." Little Gale is a company town (Bette
// Coldwater: "arithmetic that only works one way"). The company's fields are where she gets to be both.
const LARK = {
  id: 'lark_garden', status: 'built', who: ['lark'],
  title: 'What Grows Back',
  open: { trust: 1.5, rank: 'iron' },
  moment: { id: 'comp_lark', title: 'Gentle' },
  offerLabel: 'Ask about Little Gale',
  offer: [
    ['lark', 'There is a woman at Little Gale called Bette Coldwater. She stopped me in the street last time and asked '
      + 'if I was the elf who grows things. I said I was the elf who tries.\n\nThe company\'s fields have gone grey. '
      + 'The overseer says the workers have let them go. Bette says the ground is sick, and nobody will pay to find '
      + 'out why, because they are paid in scrip and the scrip comes from the fields.'],
    ['lark', 'I want to go and mend them. And I want you there, because whatever is making them sick is alive, and I '
      + 'know what I am like with things that are alive.\n\nThe team is still talking about that. I would like to '
      + 'find out what I think, instead of what they think.'],
  ],
  accept: ['lark', 'Thank you. I will bring seed. I always bring seed. Wim says it is not an emergency supply. It is.'],
  decline: ['lark', 'That is all right. They have been grey a while. A little longer will not hurt them. It will, a bit.'],
  stages: [
    { id: 'bette', title: 'Ask Bette Coldwater',
      log: 'The company fields at Little Gale have gone grey and the overseer blames the workers. Ask Bette Coldwater '
        + 'what is happening to them, with Lark there.',
      obj: { kind: 'talk', npc: { settlement: 'ont_west', name: 'Bette Coldwater' }, ask: 'Ask about the grey fields' },
      talk: [
        ['npc', "You came. I didn't think you would. People say they'll come and then they're paid in something better "
          + "than scrip."],
        ['lark', 'You said the ground was sick. How sick?'],
        ['npc', "Grey to the root. It started at the top field by the ditch and it's walked down a row a week. There's a "
          + "dust on it in the mornings like somebody's shaken out a sack. Overseer Halm docks us a day for every row "
          + "that fails, so that's arithmetic too."],
        ['npc', "And there's little things in the rows. Flowers that walk. The children feed them. I don't stop them. "
          + "They haven't got much else to feed."],
        ['lark', 'Bloomkin. They are not the sickness. They come where something is growing badly. They are a bit like me.'],
      ],
      done: [['lark', 'The top field, by the ditch. Dust in the mornings. I know what that is. I hoped it was not.']] },
    { id: 'fields', title: 'Walk the grey fields',
      log: 'Bette says the sickness started at the top field by the ditch and walks down a row a week. Go there with '
        + 'Lark and see what is seeding it.',
      obj: { kind: 'goto', place: { region: 'ontaria', at: 'ont_west', dx: -18, dy: 22, r: 9, name: 'the company\'s grey fields' } },
      done: [
        ['lark', 'Feel that. Under your feet. It is too soft, like bread left out.\n\nThat is spore. Something is '
          + 'shaking itself out over these rows every morning and the ground is taking it in.'],
        ['lark', 'Up by the ditch. There. That is a Sporemother, and she has been here a long time. I cannot mend '
          + 'anything while she is still seeding it. I know that. I am telling myself out loud so I will do it.'],
      ] },
    { id: 'sporemother', title: 'Clear the Sporemother',
      log: 'A Sporemother has been seeding the company fields from the ditch for a season. Clear her and whatever '
        + 'has gathered round her, so Lark can mend the ground.',
      obj: { kind: 'clear', place: { region: 'ontaria', at: 'ont_west', dx: -24, dy: 16, r: 9, name: 'the ditch above the top field' },
        tier: 1, families: ['sporemother', 'bloomimp'], packs: [[0, 0, 3], [4, 3, 4], [-4, 2, 3]] },
      start: 'I will keep you standing. Do what needs doing. I will not look away.',
      done: [
        ['lark', 'She is gone. The dust is settling and none of it is new.\n\nI did not look away. I want you to know '
          + 'that I did not.'],
        ['lark', 'Give me a moment in the rows. Stand where I can hear you. I am going to sing, and I would rather not '
          + 'be watched while I start.'],
      ] },
    { id: 'mend', title: 'Let Lark mend it',
      log: 'The Sporemother is gone and the fields can be mended. Lark is kneeling in the top row. Talk to her.',
      obj: { kind: 'confide', ask: 'Go to Lark in the rows' },
      talk: [
        ['narr', 'Lark is on her knees in the grey with her hands flat on it, singing very low. Green comes up under her '
          + 'fingers and walks out along the rows, slow, the way a tide comes in.'],
        ['lark', 'It is taking. It is taking all of it. I did not know a field could be this hungry.'],
        ['narr', 'At the end of the row a Bloomkin is dragging itself through the new green. One of the ones from the '
          + 'ditch. Its petals are torn half away, and it is still trying to get to the light.'],
        ['lark', 'Please. I know what it is. I know it was with her. I know Wim will have a page.\n\nI have hardly '
          + 'anything left. If I mend it, I will be sitting in the dirt for an hour and you will have to carry me. If it '
          + 'comes back here next year, that will be my fault too.\n\nPlease let it go.'],
      ],
      done: [
        ['narr', 'You let it be. Lark crawls to the end of the row and puts two fingers on the Bloomkin, and hums, and '
          + 'the torn petals close. It sits in the green for a moment. Then it walks off toward the ditch and does not '
          + 'look back.'],
        ['lark', 'It might come back. It might. I know.\n\nI could have hurt it. I could have let you. It was holding '
          + 'still and it was hurt and I had one thing left in me, and I chose.'],
        ['lark', 'That is what gentle is. I have been trying to say it to the others for a year. It is not that I '
          + 'cannot. It is that I could, and I do not.'],
        ['narr', 'Up the slope, Bette Coldwater is standing at the edge of the field with three children, looking at a '
          + 'colour the company has not seen on it in a season.'],
        ['lark', 'I am going to sit down now. I am going to sit down for a long time. Will you stay where I can see you?'],
      ] },
  ],
  reward: {
    deed: 'help',
    trust: 4,
    idle: { lark: [
      'Gentle is not soft. I can say it now without my ears going down.',
      'Bette wrote to me. The top field came in. She did not say anything about the Bloomkin. I hope that means something.',
      'I could, and I do not. That is the whole of it.',
      'Stand where I can see you. I have something left in me today. I always keep something now.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------- HESTER
// "Has led the same team for thirty years and buried six of its members. Turned down gold rank twice." Gravemarch's
// Cairnwarden Bes: "The number has been right for eleven years and I have not stopped counting." This month it is not.
const HESTER = {
  id: 'hester_seventh', status: 'built', who: ['hester'],
  title: 'The Seventh Grave',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_hester', title: 'Kept Walking' },
  offerLabel: 'Ask about Gravemarch',
  offer: [
    ['hester', 'My six are at Gravemarch, in Elehyd. Nothing rots in that ground, and I wanted them kept.\n\nThe '
      + 'cairnwarden there writes to me once a year. One line. "The number is right." I have had that line eleven years '
      + 'running.'],
    ['hester', 'This year she wrote two lines. The second one says the number is not right, and it is not short.\n\n'
      + 'I am not asking because I am frightened. I am fifty-eight. I am asking because I have walked up to that hill '
      + 'alone six times, and I would like, for once, to walk up it with somebody who is going to walk back down.'],
  ],
  accept: ['hester', 'Gravemarch, then. I will not talk on the way. Do not take it personally. I never do, going there.'],
  decline: ['hester', 'Fair. It has waited eleven years to be wrong. It can be wrong a little longer.'],
  stages: [
    { id: 'hill', title: 'Walk up to Gravemarch',
      log: 'Hester\'s six are buried at Gravemarch in Elehyd, and the cairnwarden has written that the count is wrong. '
        + 'Walk up to Gravemarch with her.',
      obj: { kind: 'escort', place: { region: 'elehyd', at: 'ele_hamlet_2', dx: 0, dy: 0, r: 10, name: 'Gravemarch' } },
      done: [
        ['hester', 'There they are. Up on the rise, the six with the iron bands. I can see them from here with the one '
          + 'eye. I have always been able to.\n\nBes will be at the markers. She is always at the markers.'] ] },
    { id: 'bes', title: 'Ask Cairnwarden Bes',
      log: 'Cairnwarden Bes has counted the cairns at Gravemarch every month for eleven years. Ask her what is wrong '
        + 'with the number, with Hester there.',
      obj: { kind: 'talk', npc: { settlement: 'ele_hamlet_2', name: 'Cairnwarden Bes' }, ask: 'Ask about the count' },
      talk: [
        ['npc', "Hester. You've come up with somebody. You've never once come up with somebody."],
        ['hester', 'The number, Bes.'],
        ['npc', "Eleven years right. This month it's one over. There's a new cairn on your rise, beside your six. Built "
          + "proper, river stones, laid the way we lay them. No name on it. No iron. Nobody's in it."],
        ['npc', "Wick's brother says the cairns move. I've told him to hush. But I'll say to you what I won't say to "
          + "him: I didn't build it, and nobody from Gravemarch did, and the Pallbearers have been walking the rise at "
          + "night carrying stones."],
        ['hester', 'Seven, then. Somebody has dug me a seventh and left it open.'],
        ['npc', "I'd not put it like that. I'd not put it any other way, either."],
      ],
      done: [['hester', 'Thirty years, and it is never the big ones. It is the one you did not think was dangerous. A pile of stones is not dangerous. Come on.']] },
    { id: 'cairns', title: 'Clear the rise',
      log: 'Pallbearers have been carrying stones up the rise at Gravemarch to build an empty seventh cairn beside '
        + 'Hester\'s six. Clear them and what walks with them.',
      obj: { kind: 'clear', place: { region: 'elehyd', at: 'ele_hamlet_2', dx: 12, dy: -14, r: 10, name: 'the rise with the six cairns' },
        tier: 3, families: ['pallbearer', 'ossuaryKnight'], packs: [[0, 0, 4], [5, -3, 3], [-4, 3, 4]] },
      start: 'Mind your feet. Those are my friends you are standing next to.',
      done: [
        ['hester', 'That is them. A Pallbearer carries the dead. When there are no dead about, it seems it builds '
          + 'somewhere to put them and waits.\n\nIt was waiting for one of mine. It does not get one.'],
        ['hester', 'There will be more. Things like that come to a grave the way flies come to a table. I am going to '
          + 'stand between them and my six, and you are going to stand with me. Everybody stands. Everybody walks home.'],
      ] },
    { id: 'stand', title: 'Hold the cairns',
      log: 'The dead are coming up the rise at Gravemarch to the empty seventh cairn. Hold the six cairns with Hester, '
        + 'and bring every one of your party back down the hill.',
      obj: { kind: 'waves', place: { region: 'elehyd', at: 'ele_hamlet_2', dx: 12, dy: -14, r: 10, name: 'the rise with the six cairns' },
        tier: 4, families: ['pallbearer', 'ossuaryKnight', 'skeleton', 'mournhusk'], waves: [4, 5, 6] },
      start: 'Here they come. Look at me, not at the stones. Look back at your people. Always look back.',
      done: [
        ['narr', 'The last Ossuary Knight comes apart on the rise. Hester stands in front of the seventh cairn with '
          + 'her sickle grounded, and counts your party with her one eye, slowly, twice.'],
        ['hester', 'All of you. Every one.\n\nI have stood on this rise six times and counted one short. I had got so '
          + 'used to counting short I forgot it could come out right.'],
        ['narr', 'She sets the sickle down and takes the seventh cairn apart with her hands, stone by stone, and puts '
          + 'the stones back in the river where they came from. It takes a long time. Nobody helps, because she does '
          + 'not ask.'],
        ['hester', 'The Society has offered me gold twice. I said no, because gold means leading people I do not know, '
          + 'and I did not want to bury strangers.\n\nWhen they ask a third time I am going to say yes. I have spent '
          + 'thirty years leading the dead up this hill. I think I can lead the living somewhere else.'],
        ['hester', 'Six. It stays six. Walk me down, and then you are buying the drinks. I have bought the last thirty years\' worth.'],
      ] },
  ],
  reward: {
    deed: 'help',
    trust: 4,
    idle: { hester: [
      'Six. It stays six. I count it every morning now, the way Bes does.',
      'Look back at your people. I do. I keep finding all of you there.',
      'When the Society asks again, I am saying yes. Remind me, if I say anything else.',
      'Bone is what holds you up. I said that for thirty years. I think I believe it now.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ ORRIN
// "Talks to the stars at night and says they talk back." His want: "Someone the stars approve of." His join: "Tell
// Hester it was the stars." This is the night they say nothing, and he says it himself.
const ORRIN = {
  id: 'orrin_stars', status: 'built', who: ['orrin'],
  title: 'What the Stars Said',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_orrin', title: 'Chose Us' },
  offerLabel: 'Ask about the stars',
  offer: [
    ['orrin', 'Forty years at Hester\'s side, and I never once thought of leaving. Then you, and I did more than think it.\n\n'
      + 'I told her the stars said to. She did not believe me. She was right not to. The stars said nothing in '
      + 'particular. I filled in the rest.'],
    ['orrin', 'I would like to ask them properly. There is a hamlet in Elehyd, Coldharrow, where the sky comes so close '
      + 'in the warm month you could reach up and turn it.\n\nI would like you there when I ask. Partly because it is '
      + 'about you. Partly because if they say no, I would rather not walk home alone.'],
  ],
  accept: ['orrin', 'Coldharrow. We will get there after dark. It is the only sensible time to arrive anywhere.'],
  decline: ['orrin', 'Then another night. They are very patient. I am learning to be.'],
  stages: [
    { id: 'coldharrow', title: 'Go to Coldharrow after dark',
      log: 'Orrin wants to ask the stars a question under the closest sky he knows. Take him to Coldharrow in Elehyd, '
        + 'and arrive after dark.',
      obj: { kind: 'escort', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: 0, dy: 0, r: 10, name: 'Coldharrow' } },
      done: [
        ['orrin', 'Look up. No, properly. Put your head back.\n\nThere. That is the sky I came for. It is hardly any '
          + 'distance at all.'],
        ['orrin', 'The woman who keeps the house by the well will know when the sky here is clearest. She has lived '
          + 'under it all her life. People who live under a sky always know it better than people who visit.'] ] },
    { id: 'hettie', title: 'Ask Hettie Varn',
      log: 'Hettie Varn has lived all her life under the Coldharrow sky. Ask her about the one warm month, with Orrin '
        + 'there.',
      obj: { kind: 'talk', npc: { settlement: 'ele_hamlet_1', name: 'Hettie Varn' }, ask: 'Ask about the warm month' },
      talk: [
        ['npc', "One warm month, and we spend it getting ready for the other eleven. You've come in it, so you've come "
          + "at the right time, or you've come lucky."],
        ['orrin', 'Lucky, I think. We do not often get to choose. Is the sky clear, this month?'],
        ['npc', "Clear as it gets. And there's a price on it. When the sky's this open the Duskmoths come up the valley "
          + "to the lamps, thick as snow, and a week behind them the Halowing come down off the peaks to the high field. "
          + "We put the lamps out and stay in."],
        ['npc', "My grandmother said the Halowing come down to listen. To what, she didn't say. I've never stood out "
          + "there long enough to find out."],
        ['orrin', 'To the sky, I expect. I have been doing it for forty years. They are welcome to stand next to me.'],
      ],
      done: [['orrin', 'Moths first, she says. Then the ones with wings like lamps. Everything up here is drawn to light. I have a great deal of sympathy.']] },
    { id: 'moths', title: 'Thin the Duskmoths',
      log: 'The Duskmoths are thick in Elehyd this month, coming to the lamps ahead of the Halowing. Kill eight of them '
        + 'so Coldharrow can light its lamps again.',
      obj: { kind: 'cull', region: 'elehyd', families: ['duskmoth'], need: 8 },
      start: 'Gently. They do not mean anything by it. Neither do I.',
      done: [
        ['orrin', 'Eight. Hettie can light her lamps tonight.\n\nI will not. I want the high field as dark as it will '
          + 'go. Hester would say that is how you get eaten. Hester would be right. Come anyway.'] ] },
    { id: 'field', title: 'Under the open sky',
      log: 'The Halowing are coming down off the peaks to the high field above Coldharrow. Stand there with Orrin under '
        + 'the open sky while he asks his question.',
      obj: { kind: 'waves', place: { region: 'elehyd', at: 'ele_hamlet_1', dx: -10, dy: -30, r: 11, name: 'the high field above Coldharrow' },
        tier: 3, families: ['birdangel'], waves: [3, 4, 5] },
      start: 'Here they come. Stand close. I am going to ask now. Do not wait for me to finish.',
      done: [
        ['narr', 'The last Halowing folds its lit wings and falls into the frost. The field goes dark again, and above '
          + 'it the sky is very close and very full, and completely silent.'],
        ['orrin', 'Nothing. Not a word. Not a falling star, not a shift in the light.\n\nI asked them whether I should '
          + 'walk with you, and they said nothing at all.'],
        ['orrin', 'I think that is the answer. I think it has always been the answer. Forty years I said the stars '
          + 'approved, and it was me. It was always me. They were only there.'],
        ['orrin', 'So I will say it myself, out loud, here, where they can hear if they want to.\n\nI choose you. All '
          + 'of you. Not because it was written up there. Because I looked, and you were here.'],
        ['orrin', 'You may tell Hester it was me. She will believe that. She always knew.'],
      ] },
  ],
  reward: {
    deed: 'help',
    trust: 4,
    idle: { orrin: [
      'The stars are quiet tonight. So am I. It is a comfortable quiet now.',
      'I chose. I keep saying it to see if it is still true. It is.',
      'They are only there. That is enough, it turns out. So are you.',
      'I told Hester. She said, "About time." She has been saying it for forty years.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------- TAMSIN
// "Grew up in the Cinderwaste mines ... the one who says the hard thing first." "I was a mine runner at seven. You
// learn which sounds mean 'run'." Rell Ashgood: "I've fished a man out of a channel." The man was her father.
const TAMSIN = {
  id: 'tamsin_mines', status: 'built', who: ['tamsin'],
  title: 'The Dark Under Slagward',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_tamsin', title: 'The Hard Thing' },
  offerLabel: 'Ask about the mines',
  offer: [
    ['tamsin', 'Hard thing: I say the hard thing first about everything. Not about one thing. You have noticed. You '
      + 'have been polite about it.\n\nSlagward. I ran the old workings under it from seven to twelve. They have '
      + 'opened them again. Somebody has to go down and tell them what is in there.'],
    ['tamsin', 'I could send them a letter. I am not going to send them a letter.\n\nCome down with me. I will hear '
      + 'everything before you see it. I need somebody to see what I cannot hear.'],
  ],
  accept: ['tamsin', 'Good. Slagward. Do not talk on the way down. I need my ears.'],
  decline: ['tamsin', 'Fine. They have been dark twenty-nine years. That is not a long time, for a mine.'],
  stages: [
    { id: 'slagward', title: 'Go to Slagward',
      log: 'Tamsin grew up running the old workings under Slagward, and they have been opened again. Go to Slagward '
        + 'in the Cinderwaste with her.',
      obj: { kind: 'escort', place: { region: 'cinder', at: 'cin_slag', dx: 0, dy: 0, r: 10, name: 'Slagward' } },
      done: [
        ['tamsin', 'Smells the same. Hot iron and wet ash. I did not know I remembered that.\n\nRell Ashgood still '
          + 'works the channels. He will know which workings they have opened. He will not want to tell me. Ask him '
          + 'anyway.'] ] },
    { id: 'rell', title: 'Ask Rell Ashgood',
      log: 'Rell Ashgood has worked the slag channels at Slagward longer than anyone. Ask him about the old workings, '
        + 'with Tamsin there.',
      obj: { kind: 'talk', npc: { settlement: 'cin_slag', name: 'Rell Ashgood' }, ask: 'Ask about the old workings' },
      talk: [
        ['npc', "Crowe's girl. I'd know you in the dark. Everybody'd know you in the dark; you were the one that heard "
          + "things."],
        ['tamsin', 'They have opened the deep workings, Rell. Who went down?'],
        ['npc', "Three crews. Two came up. The third came up short and said the rock was talking. Slagmaster Deyne sent "
          + "down a fourth and they came up and wouldn't say anything at all.\n\nSomething's eating the old galleries "
          + "from underneath. You can hear it in the channels at night if you know what you're listening for."],
        ['npc', "I'll say this once, the way I always say it. Don't test a crust because it looks cold. Your da did. I "
          + "fished him out of the channel at the bottom of the third gallery, and I'd sooner talk about almost anything "
          + "else."],
        ['tamsin', 'I know, Rell. I was there. You never asked me how I got out first.'],
        ['npc', "No. I never did."],
      ],
      done: [['tamsin', 'The third gallery. Of course it is the third gallery. Come on.']] },
    { id: 'workings', title: 'Clear the old workings',
      log: 'Tunnelmaw are eating the old galleries under Slagward from below, and Monocul hunt the dark they leave. '
        + 'Clear the old workings with Tamsin.',
      obj: { kind: 'clear', place: { region: 'cinder', at: 'cin_slag', dx: -26, dy: 18, r: 10, name: 'the old workings' },
        tier: 3, families: ['tunnelmaw', 'monocul'], packs: [[0, 0, 4], [5, 3, 3], [-4, -3, 4]] },
      start: 'Left. Low. Two of them. Now. I will call it before it lands.',
      done: [
        ['tamsin', 'Clear. That was the top of it.\n\nThere is more, further down. The third gallery. It is breathing. '
          + 'You cannot hear it. I can. It sounds exactly the same as it did.'],
        ['tamsin', 'We hold the bottom of the third gallery and they come to us. I will tell you where. Trust my ears '
          + 'over your eyes, down there. Your eyes are no use to you.'],
      ] },
    { id: 'third', title: 'The third gallery',
      log: 'Something is coming up through the third gallery under Slagward, where Tamsin\'s father died. Hold the '
        + 'bottom of it in the dark. She will hear them before you see them.',
      obj: { kind: 'waves', place: { region: 'cinder', at: 'cin_slag', dx: -32, dy: 26, r: 9, name: 'the third gallery' },
        tier: 3, families: ['tunnelmaw', 'monocul', 'geodeback', 'stringless'], waves: [4, 5, 5] },
      start: 'Quiet. Quiet. ...Behind you. Now.',
      done: [
        ['narr', 'The gallery goes still. Somewhere below, rock settles and stops. Tamsin lowers her bow and stands with '
          + 'her head on one side for a long time, listening to nothing.'],
        ['tamsin', 'That is all of it. I can hear the channel. Nothing else.\n\nHere is the hard thing. I have not said '
          + 'it to anybody. Not Hester. Not Rell.'],
        ['tamsin', 'I was seven. I was down here with my da, running water. I heard the crust go. Before anybody. A '
          + 'little tick, like a cooling pot.\n\nThey teach you, when you hear it, run. So I ran. I was halfway up the '
          + 'shaft before I thought to shout.'],
        ['tamsin', 'He did not hear me. He was testing the crust, because it looked cold. I heard it coming and I ran '
          + 'first and shouted second, and that is the order I did it in, and I have said every other hard thing first '
          + 'for thirty-four years so I would never have to say that one.'],
        ['tamsin', 'There. Said. You heard it.\n\nThat is all I wanted. Somebody to hear it. Do not say anything. Walk '
          + 'me up. I will tell you where to put your feet.'],
      ] },
  ],
  reward: {
    deed: 'help',
    trust: 4,
    idle: { tamsin: [
      'Hard thing: I am all right. Do not make a face. It is true.',
      'I shout first now. Then I run. You will have noticed the order.',
      'Rell wrote. He said thank you. He did not say what for. He did not need to.',
      'It is the one you did not hear. I hear them. That is why I am here.',
    ] },
  },
};

// ---------------------------------------------------------------------------------------------------- MATTIAS
// "Has been nearly killed eleven times and grew back from all of them." His want: "Someone who makes me laugh while
// something's trying to eat us." Cinder Ivet's line, "Watch the ground, not the horizon," is where number eleven was.
const MATTIAS = {
  id: 'mattias_twelfth', status: 'built', who: ['mattias'],
  title: 'The Twelfth Time',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_mattias', title: 'Grew Back' },
  offerLabel: 'Ask about number eleven',
  offer: [
    ['mattias', 'Eleven times. You have heard me say it. Hester says it now too, in a different voice. She has started '
      + 'counting for me, and she has stopped laughing when I do.\n\nThe team thinks the twelfth is the one. I think '
      + 'twelve is a number. Ha. They do not find that as funny as I do.'],
    ['mattias', 'Number eleven was on the road below Hush, in the Cinderwaste. An Emberwake. I lost the tail and most '
      + 'of the left side and a very good pipe.\n\nI would like to go back. Not for the Emberwake. For the pipe. And '
      + 'perhaps to show the team that a wall can go back to where it fell down, and stand there, and be a wall.'],
  ],
  accept: ['mattias', 'Ha! Good. Ashfall first. Ivet dragged me off that road last time. I owe her a drink and an apology, in that order.'],
  decline: ['mattias', 'Fair. The pipe is not going anywhere. Pipes are very patient. So are walls.'],
  stages: [
    { id: 'ivet', title: 'Ask Cinder Ivet',
      log: 'Cinder Ivet pulled Mattias off the road below Hush the eleventh time he nearly died. Ask her about the road, '
        + 'with Mattias there.',
      obj: { kind: 'talk', npc: { settlement: 'cin_camp', name: 'Cinder Ivet' }, ask: 'Ask about the road below Hush' },
      talk: [
        ['npc', "The lizard. You're walking. Last I saw you, you were mostly on a cart and the rest of you was on the "
          + "road."],
        ['mattias', 'Ha! I have come back for the rest. And to buy you a drink. Mostly the drink.'],
        ['npc', "Watch the ground, not the horizon. I told you that last time and you were looking at the horizon. The "
          + "flows crust over black below Hush and the crust holds for exactly as long as it holds. That Emberwake nests "
          + "in the soft places. It came up out of the road under you."],
        ['npc', "There's more of them now. It's had a year with nobody bothering it. I'd not go. You'll go. Go with "
          + "somebody who watches the ground."],
        ['mattias', 'That is why I brought one. Mind the tail, Ivet. It is new.'],
      ],
      done: [['mattias', 'She did not laugh. Nobody laughs about number eleven. I am going to fix that.']] },
    { id: 'road', title: 'Go to the road below Hush',
      log: 'The road below Hush is where an Emberwake came up out of the crust under Mattias the eleventh time. Walk '
        + 'there with him, and watch the ground.',
      obj: { kind: 'escort', place: { region: 'cinder', at: 'bc_cin', dx: 14, dy: -32, r: 10, name: 'the road below Hush' } },
      done: [
        ['mattias', 'Here. That black patch, the shiny one. That is where I lay for most of an afternoon, being told by '
          + 'Orrin that I was going to be fine, in poetry.\n\nThe pipe will be under the crust somewhere. The Emberwake '
          + 'will be under the crust somewhere else. Let us find the second one first.'] ] },
    { id: 'nest', title: 'Clear the Emberwake nest',
      log: 'The Emberwake that nearly killed Mattias has had a year undisturbed in the soft crust below Hush, and it has '
        + 'not been alone. Clear the nest.',
      obj: { kind: 'clear', place: { region: 'cinder', at: 'bc_cin', dx: 20, dy: -38, r: 10, name: 'the soft crust below Hush' },
        tier: 4, families: ['phoenix', 'kilnwarden'], packs: [[0, 0, 3], [5, 2, 3], [-4, 4, 4]] },
      start: 'Behind me. I always say that. This time I am watching the ground while I say it.',
      done: [
        ['mattias', 'Ha! Look. Under that one. The pipe. Melted into the crust and still the right shape, mostly. It '
          + 'has grown back better than I did.'],
        ['mattias', 'That was the nest. Not all of it. They will come up out of the soft places now they know we are '
          + 'here. I am going to stand on the black patch. Same spot. Do not make that face. It is a good spot. It held '
          + 'me up for an afternoon.'],
      ] },
    { id: 'twelfth', title: 'The twelfth time',
      log: 'The Emberwake are coming up out of the crust below Hush. Mattias is standing where he fell the eleventh '
        + 'time. Hold the road with him.',
      obj: { kind: 'waves', place: { region: 'cinder', at: 'bc_cin', dx: 14, dy: -32, r: 10, name: 'the road below Hush' },
        tier: 4, families: ['phoenix', 'hellhound', 'kilnwarden', 'smokecur'], waves: [4, 5, 6] },
      start: 'Here they come. Watch the ground. I will watch everything else. Ha!',
      done: [
        ['narr', 'The last Emberwake comes up out of the crust right under him, the way the first one did. It goes down. '
          + 'So does Mattias, all at once, like a wall coming down.\n\nFor a moment nobody breathes.'],
        ['narr', 'Then, from the ground, a sound. It takes a moment to place it. He is laughing.'],
        ['mattias', 'Twelve! Ha! Twelve. Give me a minute. The arm is coming back. I can feel it being annoyed with me.\n\n'
          + 'Look at your faces. No, do not stop. Look at them.'],
        ['mattias', 'You held your breath. Everybody always holds their breath. It is very kind and it is very boring.\n\n'
          + 'I have been nearly killed twelve times, and every time I grew back, and every time the people standing '
          + 'round me looked like that. I would like, once, for somebody to laugh.'],
        ['narr', 'Somebody does. Then everybody does, standing on a black patch of road below Hush with the smoke '
          + 'still coming off it, while a draconian grows his arm back and complains about the pipe.'],
        ['mattias', 'There. That is twelve done properly. Thirteen is just a number too. Help me up. Mind the tail.'],
      ] },
  ],
  reward: {
    deed: 'bigkill',
    trust: 4,
    idle: { mattias: [
      'Twelve. Ha! I say it and somebody laughs now. Progress.',
      'The pipe draws better than it did. Everything that comes back from that road comes back better.',
      'Watch the ground. I am. Somebody has to watch the horizon, and it is still not me.',
      'If I go down, laugh. I will be back up. I always am, and this lot knows it now.',
    ] },
  },
};

export const STORIES = [JUNO, WIM, LARK, HESTER, ORRIN, TAMSIN, MATTIAS];
