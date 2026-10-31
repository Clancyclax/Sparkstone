// ROUND 407 -- companion story quests, batch E: Quill (the old hands), the Coin (Varga, Sable, Rook, Ember) and
// three of the Dawn (Aurelian, Maelis, Cassian). Each replaces its design stub in companionQuests.js.
// Designs: docs/COMPANION_STORY_QUESTS.md section 3.

// ------------------------------------------------------------------------------------------------------- QUILL
// "His runes change when he is upset, so the team reads his skin to know how bad things are. Never says it out loud."
// His want: "Somebody who doesn't need me to say it. They'll read it." The Cut's nine identical layers, and a tablet
// written in the same hand as runic skin.
const QUILL = {
  id: 'quill_runes', status: 'built', who: ['quill'],
  title: 'The Quiet Runes',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_quill', title: 'Read' },
  offerLabel: 'Ask about the runes on his arms',
  offer: [
    ['quill', `There is a dig in Ixcuatl called The Cut. Nine cities, one on top of the other, all with the same streets. `
      + `A scholar there sent a rubbing to a bookshop in Cadence, asking if anybody could read it.\n\nNobody could. `
      + `The bookseller showed it to me because it looked like my arms.`],
    ['quill', `It does look like my arms. It is not quite the same hand. I would like to see the thing it was rubbed from.\n\n`
      + `You will notice I am saying this very calmly. You might also notice my wrists. I am not going to tell you what they are doing.`],
  ],
  accept: ['quill', `The Cut, then. I will bring Edwin's book. He never got this far, but he left a lot of margin.`],
  decline: ['quill', `Grey. That is fine. Grey means not yet, not no.`],
  stages: [
    { id: 'cut', title: 'Go to The Cut',
      log: `Quill wants to see the dig in Ixcuatl where a scholar found writing that looks like runic skin. Stand at the `
        + `top of the trench at The Cut with him.`,
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_dig', dx: 6, dy: -4, r: 8, name: 'the top of the trench' } },
      done: [
        ['quill', `Nine layers. You can count them in the wall like the rings of a tree. Every one of them has a street `
          + `running exactly there, under that one.\n\nThe scholar is called Teyn. I would like to hear it from him before `
          + `I decide what I think.`],
      ] },
    { id: 'teyn', title: 'Ask Scholar Teyn',
      log: `Scholar Teyn sent the rubbing that brought Quill here. Ask him where it came from and what he makes of it, `
        + `with Quill there.`,
      obj: { kind: 'talk', npc: { settlement: 'ixc_dig', name: 'Scholar Teyn' }, ask: 'Ask about the rubbing he sent to Cadence' },
      talk: [
        ['npc', `Every layer has the same street plan. Nobody copies a plan for nine generations unless they were told to. `
          + `I have been saying that for six years. You are the first people to come and ask who did the telling.`],
        ['quill', `The rubbing. Where is the stone?`],
        ['npc', `The bottom layer. A tablet set into the wall of what I think was a hall, at the end of the main street, `
          + `where you would put a thing you wanted every person in the city to walk past.\n\nI took the rubbing and came `
          + `straight back up. Something sings down there now. Hollowchoirs, the diggers say. They nest in the old halls `
          + `because the stone carries their noise.`],
        ['npc', `Forgive me. Your arms. The writing on them has been moving since I started talking.`],
        ['quill', `Yes. It does that. Thank you for not pretending it doesn't.`],
      ],
      done: [['quill', `The bottom layer. Of course it is the bottom layer.`]] },
    { id: 'tablet', title: 'Bring up the tablet',
      log: `A tablet in the lowest layer of The Cut carries the writing Quill came to see. Hollowchoirs nest in the old `
        + `hall around it. Clear them and bring the tablet up.`,
      obj: { kind: 'retrieve', place: { region: 'ixcuatl', at: 'ixc_dig', dx: -22, dy: 18, r: 10, name: 'the ninth layer' },
        tier: 3, families: ['hollowchoir', 'lanternwraith'], packs: [[0, 0, 4], [5, -2, 3], [-4, 4, 3]], item: 'the runic tablet' },
      start: 'Listen to them. The stone is singing back.',
      done: [
        ['quill', `It is the same grammar. Not the same words. Runic skin writes itself in a hand nobody has ever `
          + `read cleanly, and this is that hand, cut into stone by somebody with a chisel and a great deal of time.`],
        ['quill', `Edwin has a page on this. Three lines in his margin: "the shape that means again", "the shape that `
          + `means the same", "the shape that means as you were told".\n\nThe tablet says to build it again the same way. `
          + `That is all it says. Somebody wrote a city. Somebody wrote that it must be written again.`],
        ['narr', `Quill wraps the tablet in his coat and does not say anything else on the climb. He keeps his sleeves pulled down.`],
      ] },
    { id: 'read', title: 'Read him',
      log: `Quill has not said a word since the ninth layer, and his sleeves are down. He has never once asked anyone `
        + `to read him. Go and talk to him.`,
      obj: { kind: 'confide', ask: 'Look at his arms, and tell him what they say' },
      talk: [
        ['narr', `You do not ask him how he is. You take his wrist, turn it over, and push the sleeve back, and you read `
          + `it to him out loud the way the team taught you: grey at the wrist, a long red line from the elbow to the `
          + `collar that has been there since the tablet, and under it, very small, something gold that is trying.`],
        ['quill', `...Yes. That is right. That is exactly right.`],
        ['quill', `It is the third side that frightens me. I have always said nobody wrote us, that it is just what the `
          + `world does when it is bored. And then a stone at the bottom of nine cities says somebody wrote a whole city `
          + `and told it what to be.`],
        ['quill', `I do not know who wrote me. I may never know. But I have spent my whole life hoping somebody would `
          + `look, instead of waiting for me to say it.`],
      ],
      done: [
        ['quill', `You did not wait for me to say it.\n\nThe red is going. Look. You can watch it go, from the collar down. `
          + `I have never seen it do that from the outside.`],
        ['quill', `The tablet goes to Teyn, and the rubbing goes in Edwin's book with my notes beside his. Whoever comes `
          + `after me can argue with both of us.\n\nWhoever wrote me did not tell me what to be. I checked. Nowhere on `
          + `me does it say "as you were told". I would have noticed. Somebody would have read it to me.`],
        ['quill', `What colour is it now? No. Don't tell me. I know. I just like that you can see it.`],
      ] },
  ],
  reward: {
    deed: 'book', trust: 4,
    idle: { quill: [
      'Go on. Read it. You are getting faster than Hester.',
      'Gold at the shoulders today. I did not have to say anything. I find that I like not having to.',
      'Teyn wrote. He thinks the eighth layer has a second tablet. My wrists have opinions about that.',
      'Nobody wrote "as you were told" on me. I looked. You looked. That makes it a finding.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- VARGA
// "My father collected debts in Vashra. He taught me two things: always read the whole contract, and nobody respects
// a creditor who doesn't collect." She has never forgiven a debt. Her father's last book of debts is the quest.
const VARGA = {
  id: 'varga_debt', status: 'built', who: ['varga'],
  title: `The Collector's Daughter`,
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_varga', title: 'Paid' },
  offerLabel: `Ask about her father's book`,
  offer: [
    ['varga', `My father died owing House Pellerin a sum I will not say out loud in the street. They took his last book `
      + `of debts as surety. I have paid them every season for twenty-two years, in full and on the day.\n\nThe last `
      + `payment falls due this month.`],
    ['varga', `When it is paid, the book is mine. Every debt in it is mine to collect. I would like to collect it in `
      + `person, with a gold-rank witness, because Pellerin have a habit of losing paperwork when the person asking for `
      + `it is alone.\n\nYou would be paid. Obviously.`],
  ],
  accept: ['varga', `Terms accepted. Vashra first. Gilt Marren will know where Pellerin keep their books now. Gilt knows where everybody keeps everything.`],
  decline: ['varga', `Noted. The payment is due this month either way. I will not be late with it.`],
  stages: [
    { id: 'row', title: 'Go to Vashra with Varga',
      log: `Varga's father died owing House Pellerin, and they took his last book of debts. The last payment falls due. `
        + `Walk with her to the street in Vashra where he kept his office.`,
      obj: { kind: 'goto', place: { region: 'bratugal', at: 'bra_city', dx: -10, dy: 6, r: 8, name: `her father's old street` } },
      done: [
        ['varga', `That door. Third along, with the brass plate taken off. He sat behind it for thirty years and never `
          + `once let a debtor see him stand up.\n\nI was nine when my mother went out of it and did not come back. He `
          + `wrote that down too. He wrote everything down.`],
      ] },
    { id: 'gilt', title: 'Ask Gilt Marren',
      log: `Gilt Marren watches everyone in Vashra who is not at court. Ask where House Pellerin keep their books now, `
        + `with Varga there.`,
      obj: { kind: 'talk', npc: { settlement: 'bra_city', name: 'Gilt Marren' }, ask: 'Ask where House Pellerin keep their books' },
      talk: [
        ['npc', `Everyone worth knowing is at court. Everyone worth watching is not. Varga Holt. I have watched you `
          + `walk past Pellerin's door every season for twenty years, and not once go in angry.`],
        ['varga', `Anger is not in the contract. Where is the book?`],
        ['npc', `Not in the city. Pellerin moved their counting house out past the east wall when the council started `
          + `asking questions. They keep Hexarms in the yard instead of guards. Cheaper, and they cannot be bribed.\n\n`
          + `They will take your money at the door, I expect. Whether they hand over the book is another matter.`],
        ['varga', `Then I will read the receipt very carefully.`],
      ],
      done: [['varga', `Hexarms. Six arms, one head, and none of it where it does any good. Rook will be insulted on their behalf.`]] },
    { id: 'yard', title: 'Clear the Pellerin yard',
      log: `House Pellerin keep Hexarms in the yard of their counting house east of Vashra. Clear them so Varga can make `
        + `her last payment at the door.`,
      obj: { kind: 'clear', place: { region: 'bratugal', at: 'bra_city', dx: 30, dy: -14, r: 10, name: `the Pellerin yard` },
        tier: 4, families: ['sixArmApe'], packs: [[0, 0, 4], [5, 3, 3], [-4, -3, 4]] },
      start: 'Clear all hostile creatures. I wrote that clause myself.',
      done: [
        ['varga', `The yard is clear. Nobody at the windows. They have seen us.\n\nThe payment is in my coat. I am going `
          + `to put it on their desk, and then I am going to take what is mine. If anything in there disagrees with the `
          + `terms, it will be shown the terms.`],
      ] },
    { id: 'book', title: `Take her father's book`,
      log: `Varga's last payment is made. House Pellerin have set what they had left on the counting house rather than `
        + `hand the book over. Clear the counting house and take her father's book.`,
      obj: { kind: 'retrieve', place: { region: 'bratugal', at: 'bra_city', dx: 34, dy: -22, r: 9, name: 'the counting house' },
        tier: 4, families: ['sixArmApe', 'demonsloth'], packs: [[0, 0, 4], [4, -3, 3], [-4, 3, 3]], item: `her father's last book of debts` },
      start: 'Paid in full. They will be issuing a receipt now, one way or another.',
      done: [
        ['varga', `His hand. Small, upright, never a blot. Every debt in Vashra that he held, and every one of them is `
          + `mine now.\n\nThe Pellerin account, at the back, in their clerk's hand: settled. Today's date. I have waited `
          + `twenty-two years to read one word.`],
        ['narr', `She turns back one page more. There is a single entry there in her father's writing, older than the `
          + `rest, never crossed out: "Ilse Holt. Forty silver, and the house. Owed."`],
        ['varga', `My mother. She took the savings when she went. He wrote it down that night and never collected, and `
          + `never forgave it either. It sat here for thirty years being owed.\n\nI know where she lives. I have always `
          + `known. She is in Stiltrow and her house stands on legs and she is old.`],
        ['narr', `Varga uncaps her fountain pen, and under the entry, in a hand as small and upright as his, she writes: `
          + `"Forgiven in full. V. Holt." Then she dates it.`],
        ['varga', `It goes in the same column as paid. Did you know that? A forgiven debt is entered as settled by the `
          + `creditor. Nobody ever told me. He certainly never did.\n\nThe arithmetic still balances. I checked it twice. `
          + `I am going to check it again tonight, and it will still balance, and I am going to sleep.`],
      ] },
  ],
  reward: {
    deed: 'contract', trust: 4,
    idle: { varga: [
      'Every account in the book is current. One of them is current because I closed it.',
      'You witnessed. That is worth a great deal more than you were paid. Do not tell anyone I said so.',
      'Forgiven in full. It is still in the right column. I keep looking.',
      'Read the whole contract. Then read the back page. My father only taught me the first half.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- SABLE
// "I served an elven house for twenty years ... The house fell." His want: "Someone who understands patience. The
// fallen house I served did not." The house's last order is still sitting in its cellar.
const SABLE = {
  id: 'sable_house', status: 'built', who: ['sable'],
  title: 'The Fallen House',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_sable', title: 'Patience' },
  offerLabel: 'Ask about House Ithrel',
  offer: [
    ['sable', `The house I served was called Ithrel. It fell because it could not wait for anything, least of all the `
      + `throne. Its last order to me was a draught for the council's table, to be served "when it is ready".\n\nIt was `
      + `not ready when the house fell. I sealed it in the cellar and walked away, and I have been very polite ever since.`],
    ['sable', `Twenty years in a cellar changes a poison. I have had a letter from somebody who used to set Ithrel's `
      + `table, and he says the birds are dying on the hill above it.\n\nI should like to finish this properly. I should `
      + `like you there, so that somebody sees how it is finished.`],
  ],
  accept: ['sable', `How kind. Vashra, then. Chamberlain Ossa wrote the letter. He was always the one who noticed the birds.`],
  decline: ['sable', `Of course. It has waited twenty years. It is, at least, very good at that.`],
  stages: [
    { id: 'gate', title: 'Go to the Ithrel gate',
      log: `Sable's old house, Ithrel, fell twenty years ago and left a poison sealed under its ground. Go with him to `
        + `what is left of the Ithrel gate in Vashra.`,
      obj: { kind: 'goto', place: { region: 'bratugal', at: 'bra_city', dx: 16, dy: 10, r: 8, name: 'the old Ithrel gate' } },
      done: [
        ['sable', `The gate is a wine merchant's now. They kept the carving, which is more than the house deserved.\n\n`
          + `I used to come in by the kitchens. One does not come in by the front when one is the reason guests leave early.`],
      ] },
    { id: 'ossa', title: 'Ask Chamberlain Ossa',
      log: `Chamberlain Ossa set House Ithrel's table when Sable served it, and wrote to him about the birds. Ask him what `
        + `has happened on the hill, with Sable there.`,
      obj: { kind: 'talk', npc: { settlement: 'bra_city', name: 'Chamberlain Ossa' }, ask: 'Ask about the birds on the Ithrel hill' },
      talk: [
        ['npc', `Vashra is the finest city in the world and I am required to say so. I was also required, once, to say `
          + `that Ithrel's wine was excellent, and that was very nearly the last thing several people heard.`],
        ['sable', `Ossa. You look well. You always did, beside the guests.`],
        ['npc', `The birds, Drennick. Rooks first, then pigeons, then the cats that ate them. They built a cistern on the `
          + `hill eight years ago and the water came out sweet. I do not like sweet water from a hill I used to dine on.`],
        ['sable', `No. Nor do I. It has turned. Ithrel's draught was always going to turn, if nobody served it.\n\nIt can `
          + `be made inert. Hoodspine venom, fresh, and a great deal of it. The draught was built to fight a Hoodspine's `
          + `antidote. Give it the venom itself, and it has nothing to do.`],
        ['npc', `You built a poison that could only be stopped by a worse one.`],
        ['sable', `I built a poison for a house that would never have let me stop it. That is not quite the same. It is close.`],
      ],
      done: [['sable', `Ten Hoodspines. Out in the green, where they are plentiful. I shall want them milked, not hurried.`]] },
    { id: 'venom', title: 'Take the venom',
      log: `Sable needs fresh Hoodspine venom to make the Ithrel draught inert. Kill ten Hoodspines in Bratugal, without `
        + `hurrying, and let him take what he needs.`,
      obj: { kind: 'cull', region: 'bratugal', families: ['cobra'], need: 10 },
      start: 'Slowly. A Hoodspine that dies in a panic spends its venom on the ground.',
      done: [
        ['sable', `Ten. The vials are full and warm. You did not hurry once; I watched for it.\n\nThe cellar is under the `
          + `cistern now. They built on top of it without asking what was underneath, which is the most Vashra thing I `
          + `have ever heard. Something will have moved in. Things always do, where it is quiet and the air is bad.`],
      ] },
    { id: 'cellar', title: 'Open the sealed cellar',
      log: `The Ithrel cellar lies under the new cistern on the hill. Something has moved into the dark around it. Clear `
        + `it and bring up the house's last poison.`,
      obj: { kind: 'retrieve', place: { region: 'bratugal', at: 'bra_city', dx: 22, dy: 26, r: 9, name: 'the Ithrel cellar' },
        tier: 4, families: ['pallbearer', 'lanternwraith'], packs: [[0, 0, 4], [4, 3, 3], [-4, -2, 3]], item: `House Ithrel's last poison` },
      start: 'My seal is still on the door. I do good work. It is the only thing about this I am proud of.',
      done: [
        ['narr', `The bottle is small, no longer than a finger, and the wax on it still carries the Ithrel crest. Sable `
          + `holds it up to the light for a long time. Then he sits down on the cellar step and sets out a shallow dish.`],
        ['sable', `"When it is ready." That was the order. They wanted it served at the next council, and the next, and `
          + `the one after, and it was never ready, and every time they asked me I told them so, very politely.\n\nThey `
          + `could not stand to wait. They tried a knife instead. You can read the rest in any history.`],
        ['narr', `He fills the dish with Hoodspine venom. Then he breaks the seal and pours, and he pours so slowly that `
          + `for a long moment it seems nothing is happening at all. A thread. A drop. A drop. The surface of the dish does `
          + `not even cloud.`],
        ['sable', `It is ready now. Twenty years, and it is finally exactly what they asked for.\n\nI am declining the `
          + `order. One is allowed, I find, when the house has fallen. It only took me twenty years to read that clause.`],
        ['sable', `Thank you for watching. Most people would have looked away at the slow part. The slow part is all of it.`],
      ] },
  ],
  reward: {
    deed: 'council', trust: 4,
    idle: { sable: [
      'The birds are back on the hill. I asked Ossa. He wrote back four pages, which for Ossa is a song.',
      'Slowly. It is nearly always the right speed.',
      'I have no orders outstanding. It is a remarkably restful condition. I recommend it.',
      'You waited at the slow part. I shall remember that, in the good way. I do have a good way.',
    ] },
  },
};

// -------------------------------------------------------------------------------------------------------- ROOK
// "Most monsters are badly designed." His want: "A design is a plan that's been tested and doesn't explode." Everything
// he builds works, and every one of them was for a fight. Slagward's lifts are failing.
const ROOK = {
  id: 'rook_design', status: 'built', who: ['rook'],
  title: 'A Better-Designed Monster',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_rook', title: 'Tested' },
  offerLabel: 'Ask about the drawings in his coat',
  offer: [
    ['rook', `You've seen me drawing. It's a gate. Counterweighted, ratchet-locked, and it closes on its own if the `
      + `chain goes. Slagward's lifts have been failing all season. Something is eating the gearing.\n\nI've built a `
      + `gun, a turret, a wheel of bombs and the whole team's kit. Every one of them works. Every one of them was for hitting something.`],
    ['rook', `This one isn't. I'd like to fit it and test it. In the field, with you there, because a design isn't a `
      + `design until somebody who isn't me has watched it hold.`],
  ],
  accept: ['rook', `Slagward. Bring something you don't mind getting oil on. That's everything, at Slagward.`],
  decline: ['rook', `Fine. I'll keep drawing. It's not finished. Nothing's finished until it's been tested.`],
  stages: [
    { id: 'works', title: 'Go to the Slagward works',
      log: `Rook has designed a safety gate for Slagward's failing lifts, the first thing he has built that is not for `
        + `fighting. Go with him to the works gate at Slagward.`,
      obj: { kind: 'goto', place: { region: 'cinder', at: 'cin_slag', dx: 10, dy: -6, r: 8, name: 'the works gate' } },
      done: [
        ['rook', `Look at the headframes. Every lift is standing idle. That's a city that runs on lifting things, and `
          + `nothing's lifting.\n\nSlagmaster Deyne runs this. If I tell her I'm fixing her lifts, she'll ask what I'm `
          + `charging. You ask her. You've got a face people answer.`],
      ] },
    { id: 'deyne', title: 'Ask Slagmaster Deyne',
      log: `Slagmaster Deyne runs the works at Slagward. Ask her what is wrong with the lifts, with Rook there to listen.`,
      obj: { kind: 'talk', npc: { settlement: 'cin_slag', name: 'Slagmaster Deyne' }, ask: 'Ask about the failing lifts' },
      talk: [
        ['npc', `We pour off what the rock doesn't want and sell the rest. Lately we're not pouring anything, because `
          + `the lifts won't hold and I won't send anyone down on them.`],
        ['npc', `Rustmantles. They came up the old shafts and they eat iron the way you'd eat bread. Teeth go first, then `
          + `the pawls, then the chain. Odd Farrow was on number four platform when the chain went. Rell fished him out `
          + `of the channel. Rell won't talk about it, and I don't blame Rell.`],
        ['rook', `Did he live?`],
        ['npc', `He lived. He won't go near a lift again. Can't say I blame him either.`],
        ['rook', `A gate at every platform. If the chain goes, the weight drops and the gate shuts under the cage before `
          + `it falls a foot. No chain, no fall. I'll need the shafts clear to fit it.`],
      ],
      done: [['rook', `Rustmantles. Terrible design. All appetite and no structure. I'm going to enjoy this.`]] },
    { id: 'shafts', title: 'Clear the lift shafts',
      log: `Rustmantles have come up the old shafts at Slagward and are eating the lift gearing. Clear them so Rook can `
        + `fit his gate.`,
      obj: { kind: 'clear', place: { region: 'cinder', at: 'cin_slag', dx: 24, dy: 12, r: 10, name: 'the lift shafts' },
        tier: 3, families: ['rustmantle', 'clockcrawler'], packs: [[0, 0, 4], [5, -3, 3], [-4, 4, 3]] },
      start: 'There. Chewing on number four. Shoot the jaw, the rest of it is decoration.',
      done: [
        ['rook', `Shafts are clear. Gate's going in.\n\nThis'll take a while. Talk to me, or don't. I talk to the `
          + `ratchet either way. It's never once told me it was fine when it wasn't.`],
        ['narr', `It takes most of the day. At the end of it there is a heavy iron gate on the number four platform, a `
          + `counterweight hanging in the shaft, and Rook with oil to the elbows, looking at it.`],
        ['rook', `They'll come back. The shafts smell of iron, and now there's more of it. Good. A design isn't a design `
          + `until it's been tested, and I'd rather it was tested by them than by somebody on the platform.`],
      ] },
    { id: 'test', title: 'Hold the works while the gate is tested',
      log: `The Rustmantles are coming back up the shafts for the new iron. Hold the works at Slagward while Rook runs `
        + `the gate under load.`,
      obj: { kind: 'waves', place: { region: 'cinder', at: 'cin_slag', dx: 18, dy: 8, r: 10, name: 'the number four platform' },
        tier: 3, families: ['rustmantle', 'smokecur', 'kilnwarden'], waves: [3, 4, 5] },
      start: 'Here they come. Let them chew. That is the test.',
      done: [
        ['narr', `In the last wave a Rustmantle gets its teeth into the lift chain and bites clean through. The cage `
          + `drops. The counterweight falls past it, the ratchet clacks once, loud, and the gate slams shut under the `
          + `cage with a foot of air to spare. It holds.`],
        ['rook', `It held. It didn't explode. I'd like that written down somewhere, I've got a reputation.\n\nOne foot. `
          + `I drew it for one foot. It came down in one foot.`],
        ['rook', `It's for Odd Farrow. I never met him. I drew it for him anyway, so he'd go back on a platform one day, `
          + `and for Rell, so Rell doesn't have to fish anybody else out.\n\nThat's the first thing I've ever built for `
          + `somebody's name. Everything else I built for a target. Turns out the numbers are the same. Who'd have thought.`],
        ['rook', `Deyne's going to want eleven more. I'm not charging her for the drawings. Don't tell Varga.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { rook: [
      'Twelve gates at Slagward now. None of them has had to close. That is how you know they work.',
      'Deyne says Odd Farrow went down on number four last week. Came back up on it, too.',
      'Your kit is still terrible. I am going to redesign it anyway, for you, specifically. That is different, apparently.',
      'Tested. It is my favourite word. It used to mean it did not explode. Now it means somebody walks off the platform.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- EMBER
// "Clients find it difficult to argue with a woman whose hands are on fire." Her want: "Someone who can hold a room.
// I negotiate with fire in my hands. I'd like to follow someone who doesn't need it." Her family made the cathedral
// windows. The negotiation that goes wrong, and what she does after.
const EMBER = {
  id: 'ember_room', status: 'built', who: ['ember'],
  title: 'Holding the Room',
  open: { trust: 1.5, rank: 'gold' },
  moment: { id: 'comp_ember', title: 'Hands Cool' },
  offerLabel: 'Ask about the contract in Vashra',
  offer: [
    ['ember', `House Steward Bellic has written. He wants our standing contract on his house's estate renegotiated, `
      + `and he has asked, in writing, that "the lady with the gloves" not attend.\n\nI have been asked to leave rooms `
      + `before, darling. Never in advance.`],
    ['ember', `I am going anyway, and I would like you with me. Not to light anything. I would like somebody there `
      + `who holds a room without lifting a hand, so I can watch how it is done.\n\nThat is a compliment. Do try to look less surprised.`],
  ],
  accept: ['ember', `Vashra. We'll start at the cathedral. My family's windows are there, and I like to remind myself what slow looks like before I go and be quick.`],
  decline: ['ember', `Fine. He can wait. It will do him good. It will do me no harm at all.`],
  stages: [
    { id: 'windows', title: 'Stand under the cathedral windows',
      log: `Ember is going to a negotiation she has been asked not to attend. She wants to start under the windows her `
        + `family made, at the cathedral in Vashra. Go there with her.`,
      obj: { kind: 'goto', place: { region: 'bratugal', at: 'bra_city', dx: 4, dy: -8, r: 8, name: 'under the cathedral windows' } },
      done: [
        ['ember', `Four generations of Kaldis to make those. Every pane blown, cut, leaded, set. The light comes through `
          + `at noon and lies on the floor in exactly the shape my great-grandmother drew.\n\nI couldn't have done it. `
          + `I liked the furnace. The rest of them liked what came out.`],
        ['ember', `Bellic is in the city today. Let's ask him what he wants, before he asks me not to be there.`],
      ] },
    { id: 'bellic', title: 'Ask House Steward Bellic',
      log: `House Steward Bellic wants the Coin's contract on his house's estate renegotiated, without Ember. Ask him `
        + `what he wants, with Ember standing right there.`,
      obj: { kind: 'talk', npc: { settlement: 'bra_city', name: 'House Steward Bellic' }, ask: 'Ask about the estate contract' },
      talk: [
        ['npc', `Nine noble houses sit the council, and mine pays your team to keep its estate road clear. At a rate `
          + `that was agreed, I am told, while somebody's gloves were smoking.`],
        ['ember', `They do that. You were saying.`],
        ['npc', `Half. The house will pay half. And I will hear it agreed without heat in the room. The house is full of `
          + `glass, madam. Some of it is yours. I will not have it cracked to win an argument.`],
        ['ember', `Then we'll meet at the estate, and I shall bring nothing warmer than my opinion. Tomorrow.`],
        ['npc', `...Tomorrow. Very well. You will find the road clear. We have had no trouble on it this season at all.`],
      ],
      done: [['ember', `"No trouble at all." He said it the way people say their dog doesn't bite. Something's in that estate, darling, and he wants it handled at half price.`]] },
    { id: 'estate', title: 'Hold the estate',
      log: `The negotiation at Bellic's estate has gone wrong: the house has been keeping Dreadloths penned on its land `
        + `to save on a contract, and they are out. Hold the estate.`,
      obj: { kind: 'waves', place: { region: 'bratugal', at: 'bra_city', dx: 32, dy: 20, r: 11, name: `the house's estate` },
        tier: 4, families: ['demonsloth', 'vinegrasp'], waves: [4, 5, 6] },
      start: 'Penned. On the estate. To save on a contract. Stay behind me, Bellic. Yes, the gloves are going up.',
      done: [
        ['ember', `That's the last of them. The road is clear. It is, now.\n\nI lit every one of those. I wasn't going to. `
          + `I promised him nothing warmer than my opinion, and then there were Dreadloths in the orchard, and my hands `
          + `went up before I'd decided anything.`],
        ['narr', `Bellic is in the doorway of the house behind you, very pale, with the contract in his hand. Ember does `
          + `not go in. She walks to the end of the orchard instead and stands there with her back to everyone, smoke still `
          + `coming off her gloves.`],
      ] },
    { id: 'gloves', title: 'Talk to Ember',
      log: `Ember is standing alone at the end of Bellic's orchard with her gloves still smoking, and the contract is `
        + `still waiting inside. Go and talk to her.`,
      obj: { kind: 'confide', ask: 'Go and stand with her' },
      talk: [
        ['ember', `Don't. I know. I'm aware it's on fire.`],
        ['ember', `Do you know why I do it? Not to frighten them. Well. Not only. It's so nobody interrupts me. Nobody talks `
          + `over a woman whose hands are burning. I learned that at twelve, at a family table full of people who were `
          + `very good at glass and very good at talking over the girl who liked the furnace.`],
        ['ember', `Seventy-seven years and I have never once walked into a room cold and found out whether anybody would `
          + `listen anyway.\n\nGo in with me. Stand there. Don't say anything. I'd like to find out.`],
      ],
      done: [
        ['narr', `She peels off the gloves and puts them in her pocket. Her hands are bronze and ordinary and a little `
          + `unsteady. She goes into the house, and you go in with her, and you do not say anything.`],
        ['ember', `Full rate, Steward. Plus the Dreadloths, which were not on the road and so were never in the contract. `
          + `Plus an apology to your gardener, who was.\n\nNo, don't look at my hands. Look at the paper. That's where the numbers are.`],
        ['narr', `Bellic signs. He signs while she is still talking, and he does not interrupt her once.`],
        ['ember', `Well. They listened. I hadn't lit a thing.\n\nI'm going to sit down for a moment, darling, and you're going `
          + `to tell me I did that, because I'm not sure I'll believe it from the inside.`],
      ] },
  ],
  reward: {
    deed: 'council', trust: 4,
    idle: { ember: [
      'Gloves in the pocket today. I may take them out later. I may not. Isn\'t that interesting.',
      'Bellic paid on the day. Varga nearly smiled. I saw it.',
      'Sand that has been through something. It turns out it does not have to be on fire the whole time.',
      'You held the room by standing in it. I watched. I am going to steal it, darling, and I will make it look better.',
    ] },
  },
};

// ----------------------------------------------------------------------------------------------------- AURELIAN
// "Every contract, I pray to be needed less." His team's own story: "We stay after the fighting. The burials." Tolm
// Greave: "Karsk Landing buries with iron. We do too."
const AURELIAN = {
  id: 'aurelian_needed', status: 'built', who: ['aurelian'],
  title: 'Where He Is Needed',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_aurelian', title: 'Needed Less' },
  offerLabel: 'Ask what he prayed for this morning',
  offer: [
    ['aurelian', `I prayed this morning to be needed less. I pray it every morning. I have been praying it for sixty `
      + `years, and I would like, once, to see what it looks like when the prayer is answered.\n\nThere is a hamlet in `
      + `Elehyd called Gravemarch. They have written to the temple twice this season and the temple has sent nobody.`],
    ['aurelian', `I am somebody. So are you. I would like to go and be needed, properly, all the way to the end, and `
      + `then I would like to see whether they need me the morning after. Will you come?`],
  ],
  accept: ['aurelian', `Thank you. Gravemarch is a long walk from anywhere. We'll sing on the road, if you don't mind. You don't have to join in.`],
  decline: ['aurelian', `Of course. I'll pray for them, and for you. That's not a reproach. It's simply what I do with the mornings.`],
  stages: [
    { id: 'cairns', title: 'Go to Gravemarch',
      log: `Gravemarch, a hamlet in Elehyd, has written to the Healer's temple twice and been sent nobody. Walk to the `
        + `cairn field at Gravemarch with Aurelian.`,
      obj: { kind: 'goto', place: { region: 'elehyd', at: 'ele_hamlet_2', dx: -6, dy: 10, r: 8, name: 'the cairn field' } },
      done: [
        ['aurelian', `Look at the markers. Every one has a stone on top that's been set there this month. They count `
          + `them here. They count them and they keep counting.\n\nTolm Greave wrote the letters. Let's ask him what the `
          + `temple did not come for.`],
      ] },
    { id: 'tolm', title: 'Ask Tolm Greave',
      log: `Tolm Greave wrote to the temple for help. Ask him what has happened at Gravemarch, with Aurelian there.`,
      obj: { kind: 'talk', npc: { settlement: 'ele_hamlet_2', name: 'Tolm Greave' }, ask: 'Ask about the letters he sent' },
      talk: [
        ['npc', `Karsk Landing buries with iron. We do too. You'll notice nobody down there calls it superstition.`],
        ['npc', `The old burying ground, east of the cairns. We stopped using it when my grandfather was a boy. It's `
          + `started coming up. Not the dead. Things that grow out of where the dead were. Gravesown, Bes calls them.\n\n`
          + `And Wick's mother. She died at midwinter and we laid her in the old ground because the new is frozen, and `
          + `now we can't get near her.`],
        ['aurelian', `Then we'll clear the ground, and bring her out, and the others with her. Where would you bury them, if the ground were yours to choose?`],
        ['npc', `Karsk Landing. Iron in the box and iron in the cairn. It's four days and we've no one to walk them.`],
        ['aurelian', `You have two people to walk them. It's what we are for.`],
      ],
      done: [['aurelian', `Wick's mother. The boy who says the cairns move. He wasn't wrong, only early.`]] },
    { id: 'ground', title: 'Clear the old burying ground',
      log: `Gravesown are rising out of the old burying ground east of Gravemarch, where Wick's mother was laid at `
        + `midwinter. Clear the ground so the dead can be brought out.`,
      obj: { kind: 'clear', place: { region: 'elehyd', at: 'ele_hamlet_2', dx: 18, dy: 22, r: 10, name: 'the old burying ground' },
        tier: 2, families: ['gravesown', 'skeleton'], packs: [[0, 0, 4], [5, 3, 3], [-4, -3, 3]] },
      start: 'Gently. They grew out of somebody. Gently, and quickly.',
      done: [
        ['aurelian', `It's clear. I've said the words over every grave, old and new. Some of the old ones had no names on them. I said the words anyway.`],
        ['narr', `Seven boxes come up out of the old ground before dark, Wick's mother's among them. The hamlet loads them `
          + `onto two carts in silence. Nobody asks Aurelian to walk with them. He is already standing at the front.`],
      ] },
    { id: 'iron', title: 'Walk the dead to Karsk Landing',
      log: `Gravemarch buries with iron, and the iron ground is at Karsk Landing. Walk the carts with Aurelian to the `
        + `iron ground there, and keep him at your side.`,
      obj: { kind: 'escort', place: { region: 'elehyd', at: 'ele_city', dx: 8, dy: -12, r: 10, name: 'the iron ground at Karsk Landing' } },
      start: 'Four days. I know a great many hymns. I promise not to sing all of them.',
      done: [
        ['narr', `At the iron ground the diggers of Karsk Landing take the boxes without being asked, and the people of `
          + `Gravemarch lay iron in each one with their own hands. Aurelian sings for the seven of them, and then for the `
          + `ones with no names, and then he is quiet.`],
        ['narr', `In the morning he wakes early, as he always does, and goes out to see who needs him.\n\nTolm Greave is `
          + `already harnessing the carts. Cairnwarden Bes is counting the new markers with a stub of pencil. Wick is `
          + `asleep on a sack with his mother's iron ring around his neck. Nobody looks up.`],
        ['aurelian', `They don't need me.\n\nI've prayed it every morning for sixty years, and here it is, and I don't know what to do with my hands.`],
        ['aurelian', `Tolm said "thank you, Brother" last night, and "we'll manage from here", and then he went to bed. `
          + `That was all. That was the whole of it. They will manage from here.\n\nThe Healer has a sense of humour. I've `
          + `always said so. I think this morning he's simply being kind.`],
        ['aurelian', `Come on. There will be somewhere else that does need us. There always is. But not here. Not this morning.`],
      ] },
  ],
  reward: {
    deed: 'holy', trust: 4,
    idle: { aurelian: [
      'I still pray to be needed less. I know what it looks like now. It looks like a man harnessing a cart.',
      'Bes wrote. The number is right, and the old ground is quiet. She has not stopped counting. Nor should she.',
      'The fight is the short part. I used to say that like a complaint.',
      'One morning, nobody looked up. I think about it on the bad mornings. It helps.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------- MAELIS
// "I was a nurse in the Elehyd plague year. Life essence came to me on the night I couldn't save anyone. I've been
// making up for that night ever since." Her want: "Someone who can stand to be in a sick room."
const MAELIS = {
  id: 'maelis_plague', status: 'built', who: ['maelis'],
  title: 'The Plague Year',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_maelis', title: 'The Sick Room' },
  offerLabel: 'Ask about the letter from Stiltrow',
  offer: [
    ['maelis', `A letter came to the hospital from Stiltrow, in the swamp south of Vashra. Fever in the long house, `
      + `five down with it and the water gone strange. The hospital can spare broth and bandages. It can't spare a nurse.\n\n`
      + `It can spare me, if I go on my own time. I don't have any own time. So I'm asking you to lend me some.`],
    ['maelis', `You can stand to be in a sick room, love. I've watched. Most of the brave ones can't. I'd like somebody `
      + `brave there who doesn't need telling to sit down.`],
  ],
  accept: ['maelis', `Good. Stiltrow. Wear boots you don't love. And drink from my flask, not from anything in the swamp.`],
  decline: ['maelis', `All right. I'll send what broth I can. It's not the same, but broth is never nothing.`],
  stages: [
    { id: 'stilts', title: 'Go to Stiltrow',
      log: `Stiltrow has fever in its long house and its water has gone strange. Go to the long house at Stiltrow with `
        + `Maelis, who has come on her own time.`,
      obj: { kind: 'goto', place: { region: 'bratugal', at: 'bra_hamlet_1', dx: 2, dy: 4, r: 8, name: 'the long house on its stilts' } },
      done: [
        ['maelis', `Five in there, and one of them is a child. Sweats, and a cough that sounds wet, and they all drank from `
          + `the same channel. I've done what I can with my hands. It'll hold for a day.\n\nThe old man on the steps keeps `
          + `looking at the road to the city. Let's ask him why.`],
      ] },
    { id: 'duhn', title: 'Ask Old Duhn',
      log: `Old Duhn sits on the long house steps watching the road to Vashra. Ask him about the sick, and the road, with `
        + `Maelis there.`,
      obj: { kind: 'talk', npc: { settlement: 'bra_hamlet_1', name: 'Old Duhn' }, ask: 'Ask why he watches the road' },
      talk: [
        ['npc', `Two of ours went to the city for work this season. My grandson and his wife. We've had no letter. Nobody in `
          + `a swamp expects a letter, but you'd like one.`],
        ['npc', `They went because the water went bad. Something up the channel, where the reeds have gone grey. Stops your `
          + `crop and then it stops your breath. They said they'd send coin for a healer. No coin came. You came.`],
        ['maelis', `I'm not what they were sending for, love. I'm what was going spare. But I'm here, and I'm good.`],
        ['npc', `The reeds. Up the channel, where it goes grey. If you'd go and look at it, I'd sit with them while you do. I can sit. I'm good at sitting.`],
      ],
      done: [['maelis', `He's better at it than I am. I've never sat with anybody in my life. I've always been the one who gets up.`]] },
    { id: 'channel', title: 'Clear the grey channel',
      log: `Sporehorns are fouling Stiltrow's water up the channel where the reeds have gone grey. Clear them so the `
        + `water runs clean to the long house.`,
      obj: { kind: 'clear', place: { region: 'bratugal', at: 'bra_hamlet_1', dx: -20, dy: -16, r: 10, name: 'the grey channel' },
        tier: 3, families: ['sporehorn', 'sporemother'], packs: [[0, 0, 4], [5, -2, 3], [-4, 4, 4]] },
      start: 'Don\'t breathe near them. I mean it. I\'ll not have you in a cot next to the child.',
      done: [
        ['maelis', `That's the channel clean. It'll run clear by tomorrow and they'll mend by the end of the week. I know `
          + `what that cough does when the water's right. It goes.\n\nGood. Back to the long house. There'll be broth to `
          + `make and bandages to boil and a floor to scrub, and I can do all of it at once if nobody stops me.`],
      ] },
    { id: 'sit', title: 'Sit with her in the sick room',
      log: `The water is clean and the sick will mend, and Maelis has not stopped moving since she arrived. Find her in `
        + `the long house and talk to her.`,
      obj: { kind: 'confide', ask: 'Ask her to sit down' },
      talk: [
        ['narr', `She is scrubbing a floor that is already clean. Old Duhn is asleep in a chair with the child's hand in his. `
          + `When you ask her to sit down she laughs, and keeps scrubbing.`],
        ['maelis', `I don't sit in sick rooms, love. I've not sat in one in forty years. If I sit down, I'm back there.`],
        ['maelis', `The plague year. Karsk Landing, a hall with a hundred cots and four of us. On the last night I went cot to `
          + `cot and I couldn't keep one of them. Not one. And then something came into my hands at dawn, warm, too late, `
          + `and the essence said Life, and I've been running to make up for that night ever since.\n\nIf I stop, I'll `
          + `remember it. So I don't stop.`],
        ['maelis', `...You're going to sit there, aren't you. Just sit there, looking at me, until I do.`],
      ],
      done: [
        ['narr', `She puts the brush down. She sits on the edge of the child's cot, and then, slowly, all the way down, `
          + `with her back to the wall and her hands in her lap.`],
        ['maelis', `There. I'm back there. A hundred cots, and the smell, and the morning coming up grey through the window.\n\n`
          + `And I'm also here. Five cots. They're all breathing. I can hear every one of them, and I'm not doing anything, and they're breathing anyway.`],
        ['maelis', `I couldn't save any of them that night. I've known it for forty years. I've never once sat still long `
          + `enough to know the rest of it, which is that it wasn't the night I failed. It was the night I started.`],
        ['narr', `She stays. For an hour she does not get up, and she does not work, and once she cries, briefly and `
          + `practically, and wipes her face on her sleeve. Then she sleeps sitting up, the way nurses learn to.`],
        ['maelis', `Don't tell Cassian I cried. He'll want to hold the bandage steady for me. Bless him. He would, too.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { maelis: [
      'Sit down. I mean it. I can say it with a straight face now; I\'ve done it myself.',
      'Old Duhn had a letter. The grandson is well and sends coin. I asked to be told.',
      'Courage is holding the bandage steady when you\'re afraid. Sitting still is a bandage too. I didn\'t know.',
      'I still remember that night. I can stand in it now. It\'s just a room I was in.',
    ] },
  },
};

// ------------------------------------------------------------------------------------------------------ CASSIAN
// "I joined the temple to be a knight. Brother Aurelian made me dig graves for a month first. I was angry. I
// understand now. I think. Mostly." His want: "heroes ... are the ones who stay to dig the graves." Sister Anneth:
// "I've buried two in a year and turned away nine."
const CASSIAN = {
  id: 'cassian_graves', status: 'built', who: ['cassian'],
  title: 'The Ones Who Stay',
  open: { trust: 1.5, rank: 'silver' },
  moment: { id: 'comp_cassian', title: 'Properly' },
  offerLabel: 'Ask about Kepen Rest',
  offer: [
    ['cassian', `There's a post in Ixcuatl called Kepen Rest. Four days from anywhere. A sister of the Healer lives there `
      + `alone and buries whoever comes back from the Stepped City wrong, or doesn't come back.\n\nThere's something on `
      + `the road past it now. People have stopped coming back at all. It's a proper fight. A real one, like the songs.`],
    ['cassian', `I'd like to go and do it properly. With you, because you've seen what I look like when I'm doing it `
      + `badly, and you'll tell me. Aurelian says that's the most useful thing a friend can do.`],
  ],
  accept: ['cassian', `Kepen Rest! Good. I'll carry the shovel. Aurelian said to bring one. He didn't say why. He never says why.`],
  decline: ['cassian', `That's fine. I'll train. It's a long way, and I'd want to arrive ready.`],
  stages: [
    { id: 'post', title: 'Go to Kepen Rest',
      log: `Cassian wants to clear the road past Kepen Rest, a lonely post in Ixcuatl where a sister of the Healer buries `
        + `the dead. Go there with him.`,
      obj: { kind: 'goto', place: { region: 'ixcuatl', at: 'ixc_post', dx: 0, dy: 3, r: 8, name: 'the fire at Kepen Rest' } },
      done: [
        ['cassian', `A roof and a fire. That's all it is. And a little field behind it with markers in rows, more rows than `
          + `there are people who've ever lived here.\n\nThe sister will be Anneth. I'll let you ask. I'll only say something heroic.`],
      ] },
    { id: 'anneth', title: 'Ask Sister Anneth',
      log: `Sister Anneth buries whoever needs it at Kepen Rest. Ask her what is on the road past the post, with Cassian there.`,
      obj: { kind: 'talk', npc: { settlement: 'ixc_post', name: 'Sister Anneth' }, ask: 'Ask about the road past the post' },
      talk: [
        ['npc', `I came to bury whoever needed it. I've buried two in a year and turned away nine who wanted to go further `
          + `in. The nine are the ones I think about.`],
        ['npc', `Three of the nine didn't listen. They're on the road past the post, a morning's walk. Mournhusks took them. `
          + `They go over a body and leave it hollow and then they sit by it, the way mourners do, and wait for the next one.`],
        ['cassian', `We'll clear the road. And bring them back. Properly.`],
        ['npc', `Clear it, then. I'll go out after and see to them myself. I always do. You'll want to be moving on, I expect. Your sort generally are.`],
        ['cassian', `My sort?`],
        ['npc', `Heroes, lad. They come for the fight. They've always gone by the time the shovel comes out. It's no shame. It's just how it goes.`],
      ],
      done: [['cassian', `"They've always gone by the time the shovel comes out." She didn't say it unkindly. That's worse, somehow.`]] },
    { id: 'road', title: 'Clear the road past the post',
      log: `Mournhusks sit on the road a morning's walk past Kepen Rest, beside the three who would not turn back. Clear `
        + `them so Sister Anneth can bring the dead home.`,
      obj: { kind: 'clear', place: { region: 'ixcuatl', at: 'ixc_post', dx: 30, dy: -18, r: 10, name: 'the road past the post' },
        tier: 3, families: ['mournhusk', 'pallbearer'], packs: [[0, 0, 4], [5, 3, 3], [-4, -3, 3]] },
      start: 'For the Healer! ...Sorry. I always shout the first bit. Here they come.',
      done: [
        ['cassian', `It's done. That was a proper fight. You saw it. I held the line and nobody got past me and I didn't `
          + `shout the litany until the end, which Aurelian says is progress.\n\nIt would make a good song.`],
        ['narr', `Beside the road lie the three Sister Anneth turned away. Cassian looks at them for a long time and does `
          + `not say anything about songs. Then the two of you carry them back to the post, and he goes quiet, and stays quiet.`],
      ] },
    { id: 'dig', title: 'Find Cassian',
      log: `The road is clear and the three are back at Kepen Rest. Cassian has not said a word since, and nobody saw `
        + `where he went. Find him and talk to him.`,
      obj: { kind: 'confide', ask: 'Find Cassian' },
      talk: [
        ['narr', `You find him in the field behind the post, in his shirt, with his mail folded on a marker and the shovel `
          + `Aurelian told him to bring. He has dug one grave already. He is halfway down the second. He did not tell anyone `
          + `he was doing it. He did not ask Anneth where.`],
        ['cassian', `Oh. I didn't think anyone would come out. That's... that was rather the idea.`],
        ['cassian', `She said heroes have gone by the time the shovel comes out. And I thought, she's right, they have, every `
          + `one in every song. And I thought, then who does this. And it's her. It's always been her. On her own, four days `
          + `from anywhere.`],
        ['cassian', `Aurelian made me dig for a month and I was angry the whole month. I thought it was a punishment. It wasn't. `
          + `He was showing me the end of the song. The bit nobody sings.`],
      ],
      done: [
        ['narr', `He goes back to digging. He does not ask you to help, and he does not stop when you do. Neither of you `
          + `says anything for a long time. The third grave is finished as the light goes.`],
        ['narr', `Sister Anneth comes out with a lamp to start the work herself, as she always does, and finds three graves `
          + `dug, straight and deep, and a young man in a dirty shirt putting his mail back on.`],
        ['cassian', `They're ready, Sister. I didn't know the words, so I didn't say any. I thought you'd want to.`],
        ['narr', `She looks at the graves, and at him, for a while. Then she says the words, and he stands at the end of the row with his hands folded until she is done.`],
        ['cassian', `That was it, wasn't it. That was properly.\n\nDon't tell the others. I mean it. It's not the kind of thing you tell. I think that's how you know.`],
      ] },
  ],
  reward: {
    deed: 'help', trust: 4,
    idle: { cassian: [
      'I keep the shovel on my pack now. Aurelian saw it and said nothing, which from him is a whole sermon.',
      'My hands still shake. I hold it anyway. I hold the shovel too.',
      'Sister Anneth writes to the temple now. She asks after me by name. I have never been in a song I liked better.',
      'A hero is the one who is still there when the light goes. I think. Mostly. I am getting surer.',
    ] },
  },
};

export const STORIES = [QUILL, VARGA, SABLE, ROOK, EMBER, AURELIAN, MAELIS, CASSIAN];
