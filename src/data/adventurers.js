// ============================================================================
// ROUND 362 -- THE OTHER ADVENTURERS.
//
//   "Create 2-3 other adventurers in the first 2 regions that clear missions in
//    small towns and the adventure society board. They go out and kill monsters
//    and when crossing paths with the player tell stories. Potential for rivalry
//    or even competition depending on player choices."
//   "By region 3 the player should be seeing teams of 3-6 adventurers making
//    their way into the city, clearing contracts and by all appearances doing
//    their own thing. Some (not all) of the characters met in regions 1 and 2
//    should have formed into teams of their own."
//   "These teams are also going to be helping during the monster surge event."
//   "Create a cast of 38 adventurers (human, elf, runic, draconic, celestine,
//    leonid) mostly human elf and celestine. give them names essence abilities
//    and descriptions and i'll get them models."
//   "These wont be companions but should have somewhat interesting stories to
//    tell and each team should have a feel to it. Disciplined and organized,
//    chaotic and eager, new and figuring it out."
//   "These other teams should randomly lose members, adventuring is dangerous
//    work. If you run into them afterward they will be more somber and may tell
//    you what went wrong."
//   "Team names should be auto generated for them ... generally be related to
//    the teams plans essences or origin ... Typically 2 words."
//
// THE SHAPE.
//   SIX who start alone: three in the Nek, three in Ontaria (story regions 1 and
//   2). Four of them form or join teams by region 3 (story act 3, Elehyd), two
//   stay alone. Plus EIGHT teams, 36 people between them, out in the act-3
//   regions and onward, and in every surge region while the surge is on.
//   38 in all: 17 human, 8 elf, 6 celestine, 3 draconian, 2 runic, 2 leonid.
//
// What is here is data and pure rules (names, risk, the loss story, stance).
// The scene is scenes/adventurersMixin.js.
//
// `look` is the brief for the model, in the order a model sheet wants it.
// `art` is the texture key the real model will load under; until it exists the
// scene uses `stand`, one of the shared NPC models, so each person is at least
// always the same person.
// ============================================================================

/** A small seeded generator (mulberry32 over a string hash): names and draws are stable per run. */
export function advRng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------------
// ABILITIES. Each person carries three or four, named in the game's own style.
// `kind` is what the fight does with it (adventurersMixin `_advCast`):
//   strike  a heavy blow on the target          bolt   a ranged blast on the target
//   nova    everything around the target        heal   the most hurt of their team (or them)
//   ward    the team takes half damage a while
// ---------------------------------------------------------------------------
const A = (name, kind, element, color, line) => ({ name, kind, element, color, line });

// ---------------------------------------------------------------------------
// THE TEAMS. `feel` is one of the user's three; `flavour` says how this one
// wears it. `origin` is a settlement or region id, for the name. `plan` is a
// word the name can lean on. `regions` is where they work (story act 3 on).
// ---------------------------------------------------------------------------
export const ADV_TEAMS = [
  {
    id: 't_watch', feel: 'disciplined', flavour: 'ex-city-watch, drilled, a captain who writes everything down',
    origin: 'nek_city', plan: 'guard', regions: ['elehyd', 'bratugal'],
    lead: 'aldric', members: ['aldric', 'sera', 'corin', 'ilyra', 'bram', 'maribel'],
    about: `Six of them, in step. Most of them wore Cadence's colours on the wall before they wore the Society's badge, and they still walk a perimeter when they make camp.`,
    motto: `Count the exits. Count the people. Count them again on the way out.`,
    stories: [
      `We took a nest contract outside Karsk Landing that three teams had walked away from. Took us four days, because we spent three of them watching what the nest did at night. Day four took an hour. Nobody bled. That is the whole trick and nobody likes hearing it.`,
      `The captain keeps a ledger of every contract we've ever taken. Who went in, who came out, what we'd do different. He reads it to us the night before anything big. It's not inspiring. It is why we're all still here.`,
      `There was a village in Elehyd where the headman tried to pay us in a daughter. Aldric wrote that down too, and then he wrote a letter to the Society, and then the Society wrote a letter to someone who could do something about it. Paper is a weapon if you know who to aim it at.`,
    ],
    greet: {
      friend: `Good to see you on your feet. You're welcome at our fire, any night.`,
      neutral: `Society business? Then good hunting. Mind the eastern road, there's a nest.`,
      rival: `You again. Do your contracts, we'll do ours, and nobody gets in anybody's way.`,
    },
  },
  {
    id: 't_blitz', feel: 'chaotic', flavour: 'loud, fast, takes the contract nobody else wants for the story',
    origin: 'nek', plan: 'blitz', regions: ['elehyd', 'cinder'],
    lead: 'kesh', founders: ['kesh'], members: ['kesh', 'dace', 'nix', 'bran', 'juno'],
    about: `Five people who have never once waited for the plan to finish. They are good, which is the problem: they keep getting away with it.`,
    motto: `If it's still standing, we weren't done.`,
    stories: [
      `We fought a bronze-rank wyrmling on a frozen lake. On purpose. Bran said the ice would hold. The ice did not hold. We won anyway, mostly because the wyrmling was more surprised than we were.`,
      `Nix set fire to a contract. The paper, I mean. Said the client was lying about what was in the cave and she'd rather find out herself. She was right. There were three of them, not one, and the client was the one who'd been feeding them.`,
      `Juno flew us over a gorge on the end of a rope because the bridge was "too slow". Dace still won't talk about it. I think it's the best thing we've ever done.`,
    ],
    greet: {
      friend: `There they are! Come find us later, we've got a stupid plan and it needs one more.`,
      neutral: `Out of the way or keep up, either works for us!`,
      rival: `Oh good, it's you. We already cleared the one you were looking at. You're welcome.`,
    },
  },
  {
    id: 't_sparks', feel: 'new', flavour: 'green, earnest, three guidebooks and no idea what is in a cave',
    origin: 'ontaria', plan: 'spark', regions: ['elehyd'],
    lead: 'tobin', founders: ['tobin', 'pell'], members: ['tobin', 'pell', 'wim', 'lark'],
    about: `Four people who registered within a month of each other and decided the safest thing to do was to be bad at this together. They ask every other team for advice, and they write the answers down.`,
    motto: `We'll figure it out. We have, so far.`,
    stories: [
      `Our first team contract was clearing rats from a granary. There were not rats. There was one rat. It was the size of a cart. Wim had a page about it in his book and it said "avoid". We did not avoid. We did, eventually, win.`,
      `We got lost for two days because Pell said she could read the stars and it turns out Elehyd has different stars. Or the same stars somewhere else. Lark explained it. I nodded a lot.`,
      `A silver-ranker bought us dinner once just because we reminded her of her first team. She didn't say what happened to them. She just told us to keep each other close, and paid, and left.`,
    ],
    greet: {
      friend: `Oh, thank goodness, someone who knows what they're doing. Hi!`,
      neutral: `Hello! Sorry. Is this your contract? We can go. We can definitely go.`,
      rival: `We're getting better, you know. You'll see.`,
    },
  },
  {
    id: 't_old', feel: 'disciplined', flavour: 'old hands, tired, very hard to kill',
    origin: 'bratugal', plan: 'scar', regions: ['bratugal', 'cinder', 'ixcuatl'],
    lead: 'hester', members: ['hester', 'orrin', 'tamsin', 'mattias', 'quill'],
    about: `A silver-rank team whose youngest member has been doing this for fifteen years. They do not hurry, they do not shout, and they do not lose.`,
    motto: `Everybody walks home.`,
    stories: [
      `Thirty years ago there were nine of us. You learn things from the six you bury. You learn them whether you want to or not.`,
      `People ask why we don't go for gold. Gold rank is where the monsters start being clever. I've met clever. I'd rather stay where they're only big.`,
      `The last surge, we held a bridge in Bratugal for a day and a night. I don't remember the night. Orrin says I sang. I don't sing.`,
    ],
    greet: {
      friend: `Sit down a moment. You look like you've been running since dawn.`,
      neutral: `Mm. Society? Watch your footing down south. The ground lies there.`,
      rival: `We were doing this before you were born. We'll be doing it after. Go on.`,
    },
  },
  {
    id: 't_coin', feel: 'disciplined', flavour: 'professionals, cold, in it for the purse and very good at earning it',
    origin: 'sirukh', plan: 'contract', regions: ['cinder', 'bratugal'],
    lead: 'varga', members: ['varga', 'sable', 'rook', 'ember'],
    about: `Four people who read the whole contract, negotiate the fee, and are back before dark. They are not friendly. They are, everyone agrees, extremely reliable.`,
    motto: `Paid in full.`,
    stories: [
      `A noble in Vashra hired us to kill a monster that turned out to be his brother, cursed. We renegotiated. He paid us to lift the curse instead. Double. The brother paid us not to tell him what the noble had planned. Triple.`,
      `Never take a flat fee for a cave. You don't know how deep a cave is until you're in it. Per day, plus parts.`,
      `People think we're cold because we don't do it for glory. We do it so the people paying never have to. Someone should be good at that. It might as well be us.`,
    ],
    greet: {
      friend: `You do clean work. If you ever want to split a contract, come and find us.`,
      neutral: `If you're after the Kiln Halt contract, it's ours. Signed this morning.`,
      rival: `Competition's good for business. Mostly ours.`,
    },
  },
  {
    id: 't_dawn', feel: 'disciplined', flavour: 'devout, temple-backed, they pray before every contract and they mean it',
    origin: 'elehyd', plan: 'dawn', regions: ['elehyd', 'bratugal'],
    lead: 'aurelian', members: ['aurelian', 'maelis', 'cassian', 'fenna'],
    about: `Sworn to the Healer's temple, paid by it, answerable to it. They take the contracts that come with people who need help afterwards, and they stay for the afterwards.`,
    motto: `The fight is the short part.`,
    stories: [
      `We cleared an undead barrow for a village and stayed a week after, burying the ones the barrow had taken. Nobody paid for that week. Nobody had to.`,
      `Brother Aurelian prays before every contract. I asked him once what he prays for. He said, "That I'm needed less." I don't think it's working. I don't think he does either.`,
      `A cultist tried to talk Maelis into her god once, mid-fight. Maelis listened, healed her, and then hit her very hard. She says listening is a courtesy and the rest was also a courtesy.`,
    ],
    greet: {
      friend: `The Healer keep you. Truly. Is there anything you need?`,
      neutral: `Peace on your road. If anyone back there is hurt, we're the ones to tell.`,
      rival: `We're not competing with you. We're not competing with anyone. That's rather the point.`,
    },
  },
  {
    id: 't_seek', feel: 'chaotic', flavour: 'scholars and diggers, more interested in the ruin than the monster in it',
    origin: 'ixcuatl', plan: 'seek', regions: ['ixcuatl', 'elehyd'],
    lead: 'thessaly', members: ['thessaly', 'calder', 'isolde', 'ptolem'],
    about: `Funded by a college, staffed by people who will absolutely touch the glowing thing. They are not reckless, exactly. They just do not believe in closed doors.`,
    motto: `What's behind it?`,
    stories: [
      `We found a door in the Stepped City with no seams. Ptolem read the glyphs. Calder dug around it. Thessaly asked it nicely. Isolde froze the hinges we couldn't see and broke it. That's the whole team, really.`,
      `The college wants maps. We send them maps. We do not send them the bits of the maps where the walls moved. They wouldn't believe us, and we want to go back.`,
      `There's a thing under the Cut that sings when it rains. Calder thinks it's a pipe. Thessaly thinks it's a god. I think we should stop going down there at night.`,
    ],
    greet: {
      friend: `You! Come and look at this. No, really, come and look.`,
      neutral: `Hm? Oh, adventurer. Yes. Hello. Mind the pegs, they're for the survey.`,
      rival: `If you've come for the ruin, it's spoken for. We have a letter.`,
    },
  },
  {
    id: 't_sands', feel: 'new', flavour: 'caravan guards from the desert, new to cities and to the Society both',
    origin: 'sirukh', plan: 'sand', regions: ['elehyd', 'cinder'],
    lead: 'rhaza', members: ['rhaza', 'tarek', 'zahra', 'mott'],
    about: `They guarded salt caravans across the Sirukh sands for years and came north when the caravans stopped. They know monsters. They do not know paperwork, cities, or why anyone would build a wall around a market.`,
    motto: `Water first. Then talk.`,
    stories: [
      `In the sand you fight what comes. Here you have to sign for it first. Rhaza signed her name across three lines because nobody told her which one. The clerk was very patient.`,
      `Old Mott has walked the Salt Gate road forty times. He has never once been in a building with a second floor. He went up the Society's stairs this morning, very slowly, holding the wall.`,
      `The first city contract we took was to find a lost cat. We thought it was a code. It was a cat. We found it. It bit Tarek. We were paid in silver. Cities are strange.`,
    ],
    greet: {
      friend: `Friend! Sit, drink. You never refuse water from someone who walked the sands.`,
      neutral: `Society? Good. Tell us — the board, is it every day, or only sometimes?`,
      rival: `In the sand, a rival shares your water and then tries to beat you. We will share. Then we will win.`,
    },
  },
];

export const ADV_TEAM_BY_ID = Object.fromEntries(ADV_TEAMS.map(t => [t.id, t]));

// ---------------------------------------------------------------------------
// THE PEOPLE. 38. `early` marks the six who start alone in story regions 1-2:
// `home` is their region, `haunts` the settlements whose boards they work, and
// `joins` the team they form or join by region 3 (null: they stay alone).
// `role`: tank, healer, melee, ranged, caster, support, scout.
// `epitaph` is what a teammate says of them if they do not come home.
// ---------------------------------------------------------------------------
const P = (o) => o;

export const ADVENTURERS = [
  // ===================================================== THE SIX WHO START ALONE
  P({
    id: 'kesh', name: 'Kesh Varn', nature: 'human', sex: 'm', age: 23, rank: 'iron', role: 'melee',
    weapons: `A long knife and a short knife`,
    early: { home: 'nek', haunts: ['nek_hamlet_1', 'nek_hamlet_2', 'nek_city'], joins: 't_blitz' },
    essences: ['fire', 'essSwift', 'essFox'],
    abilities: [
      A('Cinder Dash', 'strike', 'fire', '#ff7043', 'A burning lunge that leaves a line of embers behind it.'),
      A('Ember Fang', 'bolt', 'fire', '#ffab40', 'A thrown knife of fire that bursts on contact.'),
      A('Trickster\'s Step', 'ward', 'physical', '#ffd180', 'He is suddenly a step to the left of where the blow lands.'),
      A('Wildfire Run', 'nova', 'fire', '#ff5722', 'He runs a ring around the fight and the ring catches.'),
    ],
    look: `Human man, early twenties, wiry and quick. Sunburnt farm skin, copper-red hair cut short and badly by himself, a fox-tooth earring. Patched red-brown leathers over a farm shirt, scorch marks on both sleeves, a long knife and a short knife. Always grinning, always moving.`,
    about: `A Milrow farmer's son who bonded Fire by burning down his father's barn, and has been running ever since. Wants to be the best adventurer the Nek has ever made, and wants everyone to know it.`,
    stories: [
      `First essence I ever used, I set my dad's barn on fire. Not on purpose. Well. A bit on purpose. There was a rat. It was a big rat. My dad still hasn't said the word "barn" to me.`,
      `Fenn Cross board had a stalker contract up for a week and nobody'd touch it. I took it at breakfast and had it back by lunch. The clerk said nobody does that. I said somebody just did.`,
      `I'm going to have a team. A real one. Fast, loud, the kind of people the Society sends when it's gone wrong. You'll see us coming because everything around us will be on fire.`,
    ],
    later: `Told you I'd have a team. Look at them! Terrible. Brilliant. Mostly terrible. We've cleared more nests this month than anyone in Elehyd.`,
    greet: {
      friend: `Hey! Racing anyone today? No? Just me then. Good to see you.`,
      neutral: `Oh, you're on the board too? Better be quick.`,
      rival: `Took the Milrow contract before you were out of bed. Again.`,
    },
    raceTaunt: `First to the count wins the purse. Try to keep up.`,
    epitaph: `He'd have hated a quiet funeral. We didn't give him one.`,
  }),
  P({
    id: 'maribel', name: 'Maribel Oakes', nature: 'human', sex: 'f', age: 31, rank: 'iron', role: 'ranged',
    weapons: `A plain yew longbow taller than she is; a quiver worn low`,
    early: { home: 'nek', haunts: ['nek_hamlet_2', 'nek_city'], joins: 't_watch' },
    essences: ['essBow', 'essHunt', 'essWind'],
    abilities: [
      A('Long Count', 'bolt', 'physical', '#c5e1a5', 'One arrow, aimed for a long breath, through the weak place.'),
      A('Marked Quarry', 'bolt', 'wind', '#aed581', 'An arrow that finds what it was told to find, around a corner if it has to.'),
      A('Crosswind Volley', 'nova', 'wind', '#dcedc8', 'A spread of arrows carried wide on a sudden gust.'),
      A('Still Air', 'ward', 'wind', '#f1f8e9', 'The wind drops around her team and turns what is thrown at them.'),
    ],
    look: `Human woman, early thirties, lean and weathered, tall. Dark brown skin, black hair in a tight working braid, a pale scar through one eyebrow. Grey-green hunting coat with many pockets, leather bracer, a plain yew longbow taller than she is, a quiver worn low. Unhurried, watchful.`,
    about: `A widow from Fenn Cross clearing bounties to pay off the farm her husband left her owing on. Methodical, quiet, faintly amused by Kesh. Does every contract on the board in order, cheapest first, because somebody has to.`,
    stories: [
      `Thomas used to say I could hit a crow at a hundred paces. I could, but I never wanted to. Now I hit worse things than crows, and the bank in Cadence gets the crows' share.`,
      `Kesh Varn took a stalker contract off the board before I'd finished breakfast. He brought it back half done and called it done. I went out and finished it. He still thinks he did it.`,
      `People take the big contracts. Nobody takes the small ones, the rats in the grain, the dog that went wild. Those are the people who can't pay much. So I do those first.`,
    ],
    later: `The captain asked me to scout for them. Steady work, steady people. Steady is what I wanted. The farm's paid off. I stayed anyway.`,
    greet: {
      friend: `There you are. Kept the Fenn Cross rats warm for you.`,
      neutral: `Afternoon. Board's thin today. Take what you need, I'll take the rest.`,
      rival: `You can have the big ones. I'll have the ones that pay the rent.`,
    },
    raceTaunt: `Fine. Count them honestly, though.`,
    epitaph: `She'd already paid off everything she owed. She stayed for us. That's who she was.`,
  }),
  P({
    id: 'tobin', name: 'Tobin Rusk', nature: 'human', sex: 'm', age: 19, rank: 'normal', role: 'tank',
    weapons: `A big round wooden shield painted with a yellow sun; a short sword`,
    early: { home: 'nek', haunts: ['nek_hamlet_1', 'nek_city'], joins: 't_sparks' },
    essences: ['essShield', 'essDog', 'essLight'],
    abilities: [
      A('Hold Fast', 'ward', 'radiant', '#fff59d', 'He plants the shield and the light in it spreads to everyone behind.'),
      A('Loyal Bite', 'strike', 'physical', '#bcaaa4', 'A shield-rush that knocks whatever it hits off its feet.'),
      A('Lantern Shield', 'nova', 'radiant', '#fff9c4', 'The shield flares and everything close is blinded for a breath.'),
      A('Good Boy', 'heal', 'radiant', '#ffe082', 'A warm glow that steadies whoever he is standing in front of.'),
    ],
    look: `Human man, nineteen, broad but still growing into it, soft round face. Pale freckled skin, mousy brown hair that sticks up at the back. Oversized secondhand chainmail, a big round wooden shield painted with a yellow sun, a short sword he has never quite learned to use. Nervous, kind, stands in front of people without thinking.`,
    about: `A Milrow boy who bonded a Dog essence because the family's old dog died guarding the house and he felt he owed it. Terrified most of the time. Never steps back anyway.`,
    stories: [
      `I've been registered six weeks. I've done four contracts. I've run away from two of them. I came back to both, though. That counts. The clerk said it counts.`,
      `My dog Barley died standing in the doorway when wolves came. Wouldn't move. When the essence came up at the market, it felt like he'd sent it. I know that's stupid.`,
      `Kesh says I should be faster. Maribel says I should be braver. I think I should stand still and hold a shield, because that's the one thing I'm good at.`,
    ],
    later: `We've got a team! Pell and me, and Wim and Lark. We're not good yet. We're less bad every week, though, and nobody's died, and that's the main thing.`,
    greet: {
      friend: `Oh! Hi! I did a bronze contract last week. Well. Helped with one.`,
      neutral: `Um, hello. Is it all right if I stand here? I'm waiting for the board.`,
      rival: `I'm not scared of you. Much.`,
    },
    raceTaunt: `Okay. Okay! I can do this. Probably.`,
    epitaph: `He stood in front of us. He always did. That's how he went, too.`,
  }),
  P({
    id: 'ysolde', name: 'Ysolde Feyrin', nature: 'elf', sex: 'f', age: 27, rank: 'iron', role: 'melee',
    weapons: `A pair of curved knives, worn crossed at the small of her back`,
    early: { home: 'ontaria', haunts: ['ont_city', 'ont_west', 'ont_village_b'], joins: null },
    essences: ['essMoon', 'essKnife', 'shadow'],
    abilities: [
      A('Crescent Cut', 'strike', 'shadow', '#b39ddb', 'A curved silver slash that seems to come from behind.'),
      A('Moonless', 'ward', 'shadow', '#7e57c2', 'She is simply harder to see, and so is anyone beside her.'),
      A('Waning Knives', 'bolt', 'radiant', '#e1bee7', 'Three thrown blades of cold moonlight.'),
      A('Eclipse Step', 'nova', 'shadow', '#4527a0', 'Darkness falls on a circle around her, and she is everywhere in it.'),
    ],
    look: `Elf woman, late twenties, tall and slender, moves very quietly. Grey-silver skin with a faint blue cast, long white hair usually tied back under a dark hood, pale violet eyes, a thin scar across the back of one hand. Fitted dark indigo leathers, a moon-silver circlet, a pair of curved knives worn crossed at the small of her back. Dry, unhurried, faintly smiling.`,
    about: `Grew up in a Harrowmoor orphan house and stole her way through her teens. Her three essences came out of a strongbox in the cellar of a merchant who should never have had them, and she used them the same night, so there was nothing to give back. The Society fined her, then registered her, because she is very good. No team will take her. She has decided she prefers it.`,
    stories: [
      `The essences were in a strongbox in a merchant's cellar in Harrowmoor. Smuggled, unregistered, the kind of thing that gets a man hanged. I took them and used them the same night, so there was nothing to give back. The Society fined me. Then it gave me a badge.`,
      `Harrowmoor's board has a contract for a "shadow in the orchard" every spring. It's me. I sleep there. The farmer pays the Society, the Society pays me, I move to the next tree. Everybody is happy.`,
      `You want to know why I work alone? Ask any team on the Harrowmoor board. They all know what I used to be. A thief with three essences is still a thief to them. So I take the night contracts nobody wants, and I'm better at them than any team.`,
    ],
    later: `Teams everywhere, now. Good for them. I still get the night work, and still nobody's asked me to join anything. I've stopped minding. Mostly.`,
    greet: {
      friend: `You again. You're one of the few who doesn't check their purse when I walk up.`,
      neutral: `Mm. Night work's mine, day work's yours. Fair?`,
      rival: `Oh, I'm your rival? How flattering. I'll try to remember your name.`,
    },
    raceTaunt: `A race. Fine. I'll try to be quiet about winning.`,
    epitaph: ``,
  }),
  P({
    id: 'pell', name: 'Pell Ashgrove', nature: 'human', sex: 'f', age: 22, rank: 'normal', role: 'caster',
    weapons: `A short boat hook, used as a staff`,
    early: { home: 'ontaria', haunts: ['ont_village_a', 'ont_city'], joins: 't_sparks' },
    essences: ['essWater', 'essNet', 'essFish'],
    abilities: [
      A('Tidecast', 'bolt', 'frost', '#4fc3f7', 'A fist of seawater thrown hard enough to knock a man over.'),
      A('Snag Net', 'nova', 'physical', '#80deea', 'A net of knotted water that drags everything in it to the ground.'),
      A('Gill Breath', 'heal', 'frost', '#b2ebf2', 'Cool water over the wounds, and breathing goes easy again.'),
      A('Undertow', 'nova', 'frost', '#0288d1', 'The ground goes soft as a beach under the tide, and pulls.'),
    ],
    look: `Human woman, early twenties, short and sturdy. Tanned olive skin, salt-bleached sandy hair in a messy bun stuck through with a fishing needle, freckles. A fisher's oilcloth jacket in faded blue over a striped jumper, rope-soled boots, a cork float on a cord round her neck instead of a charm, a short boat hook she uses as a staff. Loud, cheerful, laughs at her own jokes.`,
    about: `A Sailmend fisherman's daughter who bonded Water because the boat sank with her on it and she decided she was not going to drown. Loud, funny, and braver than she has any right to be. Thinks Tobin is the best person she has ever met and tells him so.`,
    stories: [
      `My dad's boat went down off Cobb Point in a squall. Everyone else swam. I sank. Something down there pressed an essence into my hand and I breathed water for an hour. The Society says that's not how it works. It's how it worked.`,
      `My first contract was a crab. Big crab. I netted it, it cut the net, it cut my boot, I sat on it. That's in my report. The clerk underlined "sat on it" twice.`,
      `I met a boy from the Nek on the Harrowmoor road, carrying a shield bigger than himself and apologising to a goat. I'm going to make him start a team with me. He doesn't know yet.`,
    ],
    later: `I told you I'd make him start a team! Tobin pretends he decided. Let him. I'm in charge of the boat, if we ever get one.`,
    greet: {
      friend: `Ha! Look who it is! Want some dried fish? Everyone wants dried fish.`,
      neutral: `Hiya. You off out? Watch the low road, it floods.`,
      rival: `Bet you I clear more than you today. Bet you a fish.`,
    },
    raceTaunt: `Loser buys supper. And it's not fish, I'm sick of fish.`,
    epitaph: `She'd want us to laugh. We're trying. It's going to take a while.`,
  }),
  P({
    id: 'garrick', name: 'Garrick Thorne', nature: 'draconian', sex: 'm', age: 38, rank: 'iron', role: 'tank',
    weapons: `A two-handed woodsman's axe, swung one-handed`,
    early: { home: 'ontaria', haunts: ['ont_west', 'ont_city', 'ont_village_a'], joins: null },
    essences: ['essAxe', 'essIron', 'essEarth'],
    abilities: [
      A('Quarry Split', 'strike', 'physical', '#a1887f', 'One overhead axe blow that splits stone as easily as bone.'),
      A('Iron Hide', 'ward', 'physical', '#90a4ae', 'His scales go grey as iron and he shrugs.'),
      A('Rockfall', 'nova', 'nature', '#8d6e63', 'He stamps and the ground around him breaks upward.'),
      A('Dragon\'s Grudge', 'strike', 'fire', '#ff8a65', 'A low breath of heat behind the axe, for the thing that hurt him last.'),
    ],
    look: `Draconian man, late thirties, a head taller than a big human and heavy-shouldered. Dark bronze scales along the jaw, neck and forearms, small swept-back horns, amber slit-pupil eyes, close-cropped black hair. Battered iron half-plate over a sleeveless quarryman's tunic, a two-handed woodsman's axe he swings in one hand. Scowls, says little, never in a hurry.`,
    about: `A former quarryman who was in three teams and lost all three: one to a cave-in, one to a cult, and one to a wedding. Works alone now and tells anyone who asks that teams are a lovely way to get your friends killed. He is not as gruff as he sounds.`,
    stories: [
      `Three teams. First one, the mine came down on them and I dug for two days. Second one, a cult. Third one got married and moved to the coast. I'm not sure which of those I'm angriest about.`,
      `People ask why I carry a two-hander in one hand. Because the other hand is for holding the door so the idiots behind me can get out.`,
      `Little Gale has a kid who leaves me bread on the board every morning I'm in town. I don't know whose kid it is. I take the bread. I take the worst contract on the board, too. Seems fair.`,
    ],
    later: `Everyone's in a team now. Good for them. I'll be here. Somebody has to take the contracts nobody wants.`,
    greet: {
      friend: `Hm. You're still alive. Good. Sit if you want, I'm not talking much.`,
      neutral: `Board's yours. Leave me the ugly ones.`,
      rival: `Go on, then. Show me something.`,
    },
    raceTaunt: `Count fast. I don't.`,
    epitaph: ``,
  }),

  // ===================================================== THE WATCH (disciplined)
  P({
    id: 'aldric', name: 'Aldric Venn', nature: 'human', sex: 'm', age: 46, rank: 'bronze', role: 'tank', team: 't_watch',
    weapons: `An arming sword and a kite shield (old Cadence crest painted out)`,
    essences: ['essShield', 'essIron', 'essSword'],
    abilities: [
      A('Shield Wall', 'ward', 'physical', '#90caf9', 'He calls the line and the line holds: everyone takes half.'),
      A('Sergeant\'s Cut', 'strike', 'physical', '#bbdefb', 'A short, economical sword stroke aimed where the armour is not.'),
      A('Iron Order', 'nova', 'physical', '#64b5f6', 'He bellows and slams the shield down; everything near him staggers.'),
      A('Steady On', 'heal', 'radiant', '#e3f2fd', 'A hand on a shoulder. Somehow that is enough to keep going.'),
    ],
    look: `Human man, mid-forties, solid and square. Weathered light-brown skin, iron-grey hair cut regulation short, a thick grey moustache, a broken nose set slightly crooked. Polished but battered steel breastplate over Cadence watch blue, a kite shield with the old city crest painted out, an arming sword, a leather ledger book on his belt. Calm, deliberate, everything in its place.`,
    about: `Twenty years a sergeant of the Cadence watch, until the watch asked him to look away from something and he would not. Took his pension, his ledger and five people he trusted, and went to the Society instead.`,
    stories: [
      `Twenty years on the Cadence wall. In all that time the worst thing that ever came over it wasn't a monster. It was an order. I keep the old crest painted out so I remember why.`,
      `Every contract goes in the ledger. Who went in, who came out, what we'd do different. Reading it back is the only way I know to be less stupid next time.`,
      `Corin asked me once if I miss the watch. I miss the people. I don't miss pretending the walls were for everyone.`,
    ],
    epitaph: `He'd want it written down properly. So I wrote it down properly.`,
  }),
  P({
    id: 'sera', name: 'Sera Lantis', nature: 'celestine', sex: 'f', age: 88, rank: 'bronze', role: 'healer', team: 't_watch',
    weapons: `A lantern hung from a staff`,
    essences: ['essLight', 'heal', 'essHarmonic'],
    abilities: [
      A('Lantern of Mending', 'heal', 'radiant', '#fff176', 'A slow golden light that closes what is open.'),
      A('Chord of Renewal', 'heal', 'radiant', '#f0f4c3', 'A single clear note, and everyone near her breathes easier.'),
      A('Sanctuary Glow', 'ward', 'radiant', '#ffffff', 'The air around the team goes bright and blows go soft in it.'),
      A('Searing Halo', 'nova', 'radiant', '#ffee58', 'The light turns hard for a breath and burns what it touches.'),
    ],
    look: `Celestine woman, looks about thirty-five, has been doing this for decades. Tall and graceful, fair skin, shoulder-length hair of real silver — fine metal strands that move like hair and shine like a polished cup — and eyes of the same polished silver. White and pale-gold healer's robes over light mail, a tuning-fork charm, a lantern on a staff. Warm, patient, quietly stubborn.`,
    about: `Served thirty years as the watch's healer when Aldric was a young man and followed him out of it. Celestine-young, which is to say older than the rest of the team put together. Treats them all like cousins she is fond of and slightly worried about.`,
    stories: [
      `I patched Aldric up the first week he joined the watch. He was nineteen, he'd fallen off the wall, and he apologised to the wall. I knew then I'd follow him somewhere eventually.`,
      `The harmonic essence is about listening. Every body has a note. When it's hurt, the note goes wrong. I don't heal so much as tune.`,
      `I've outlived two teams. I don't intend to outlive this one. That's not a hope. That's a policy.`,
    ],
    epitaph: `She healed everyone but herself. We should have watched her more closely.`,
  }),
  P({
    id: 'corin', name: 'Corin Hale', nature: 'human', sex: 'm', age: 29, rank: 'bronze', role: 'melee', team: 't_watch',
    weapons: `A long boar spear with a blue pennant`,
    essences: ['essSpear', 'essResolute', 'essHorse'],
    abilities: [
      A('Lancer\'s Charge', 'strike', 'physical', '#ffcc80', 'A running thrust with the whole weight of a horse behind it, and no horse.'),
      A('Unbowed', 'ward', 'physical', '#ffe0b2', 'Whatever comes, he does not move, and neither does anyone he is in front of.'),
      A('Sweeping Haft', 'nova', 'physical', '#ffb74d', 'The spear turns in a wide circle at knee height.'),
    ],
    look: `Human man, late twenties, tall and rangy, long-legged. Brown skin, black curly hair tied back, a neat beard, a cheerful gap-toothed grin. Blue-and-steel scale coat, riding boots he still wears though he has no horse, a long boar spear with a bright blue pennant. Restless, friendly, talks to everyone.`,
    about: `Was the watch's best rider until his horse died under him on a patrol; bonded the Horse essence from the patrol's spoils a week later. Still salutes horses in the street. The team's mood, most days.`,
    stories: [
      `My horse was called Biscuit. Big grey, stupid as a fence, braver than anyone on that wall. When the Horse essence turned up I didn't even hesitate. Now I'm the one carrying everyone.`,
      `The captain makes us count exits in every room we walk into. I counted the exits in a bakery last week. Three. I felt very safe buying bread.`,
      `Ilyra says I'm the only man alive who runs at a monster and apologises to it on the way. I don't apologise. I say "excuse me". That's different.`,
    ],
    epitaph: `He ran at it first so we wouldn't have to. Of course he did.`,
  }),
  P({
    id: 'ilyra', name: 'Ilyra Sunmantle', nature: 'celestine', sex: 'f', age: 61, rank: 'bronze', role: 'caster', team: 't_watch',
    weapons: `A gilded quarterstaff topped with a sunburst`,
    essences: ['essSun', 'essStaff', 'essPure'],
    abilities: [
      A('Noonfire', 'bolt', 'radiant', '#ffd54f', 'A beam of white-gold sunlight from the head of her staff.'),
      A('Zenith Flare', 'nova', 'radiant', '#ffca28', 'The sun is suddenly directly overhead, and very close.'),
      A('Pure Ward', 'ward', 'radiant', '#fffde7', 'A clean light that nothing foul will cross.'),
      A('Corona', 'nova', 'fire', '#ffa000', 'A ring of solar fire that rolls outward from her feet.'),
    ],
    look: `Celestine woman, looks late twenties. Medium height, upright, warm brown skin, a crown of tight curls of true gold — metal that moves like hair — and eyes of the same true gold. Cream and saffron mage's coat with a high collar, a gilded quarterstaff topped with a sunburst, white gloves. Precise, formal, dry sense of humour.`,
    about: `A temple scholar from Cadence's upper city who left a comfortable chair to see whether her theories about solar magic held up against things with teeth. They mostly have. She keeps notes.`,
    stories: [
      `My family has served the temple of the Sun for nine generations. I am the first to point the sun at something and see what happens. My mother has not forgiven me. The something did not survive.`,
      `Corin says I'm too formal. I said that's a matter of opinion. He said it's a matter of me calling him "Mister Hale" in the middle of a fight. That is fair.`,
      `There's a theory that pure light can't harm the innocent. I've tested it. It's not true. It's just very, very good at finding the guilty.`,
    ],
    epitaph: `She'd have said something precise and a little cold. I can't. I'm sorry.`,
  }),
  P({
    id: 'bram', name: 'Bram Odell', nature: 'human', sex: 'm', age: 34, rank: 'bronze', role: 'tank', team: 't_watch',
    weapons: `A blacksmith's sledgehammer; a green round shield like a shell on his back`,
    essences: ['essHammer', 'might', 'essTurtle'],
    abilities: [
      A('Anvil Drop', 'strike', 'physical', '#bcaaa4', 'The hammer comes down like the sky falling.'),
      A('Shellback', 'ward', 'physical', '#a5d6a7', 'He hunches and becomes, briefly, a wall with legs.'),
      A('Quake Swing', 'nova', 'nature', '#8d6e63', 'A sweeping hammer blow along the ground that knocks everything flat.'),
    ],
    look: `Human man, mid-thirties, enormous, barrel-chested, slow-moving. Ruddy pale skin, shaved head, a bushy ginger beard braided in two. Thick plate pauldrons over chain, a green-painted round shield like a shell on his back, a blacksmith's sledgehammer. Gentle, very quiet, hums to himself.`,
    about: `Was the watch's farrier and blacksmith, followed Aldric because he could not imagine shoeing the horses for whoever came next. Says perhaps ten words a day and makes them count.`,
    stories: [
      `Was a smith. Now I hit things that aren't iron. Same arm. Same rhythm.`,
      `Turtle essence. People laugh. Then something hits me.`,
      `Corin talks. Ilyra thinks. Sera mends. Captain decides. I stand at the front. Everyone has a job.`,
    ],
    epitaph: `He never said much. Nobody's going to fill the quiet he left.`,
  }),

  // ===================================================== THE BLITZ (chaotic) -- with Kesh
  P({
    id: 'dace', name: 'Dace Morrow', nature: 'human', sex: 'm', age: 26, rank: 'iron', role: 'melee', team: 't_blitz',
    weapons: `Steel claws on both gauntlets`,
    essences: ['essLightning', 'essWolf', 'essZeal'],
    abilities: [
      A('Stormfang', 'strike', 'lightning', '#4dd0e1', 'A biting lunge that arcs to whatever is standing next to the target.'),
      A('Pack Howl', 'nova', 'lightning', '#80deea', 'A howl that crackles: everything near him flinches.'),
      A('Zealot\'s Spark', 'ward', 'lightning', '#e0f7fa', 'He gets very excited and the team catches it.'),
      A('Thunderrun', 'strike', 'lightning', '#00bcd4', 'He is across the field before the thunder arrives.'),
    ],
    look: `Human man, mid-twenties, lean and twitchy, never still. Pale skin with faint lightning-scar ferns down one arm, wild spiky black hair with a white streak, wolf-yellow eyes. Sleeveless black and teal leathers, wolf-fur collar, steel claws on both gauntlets. Grins too wide, laughs too loud.`,
    about: `Got struck by lightning twice before he bonded the essence and took it as a sign. Kesh's first recruit, found brawling on the Karsk Landing docks. Nobody has ever successfully told Dace to wait.`,
    stories: [
      `Got hit by lightning twice before I was twelve. Third time I caught it. That's the story and I'm sticking to it, whatever the Society's essence man says.`,
      `Kesh found me fighting three dock hands for the last fish pie. He didn't stop it. He joined in. On my side. We lost. Best day of my life.`,
      `Wolves hunt as a pack. Lightning goes where it wants. I'm trying to be both. Some days it's going great.`,
    ],
    epitaph: `He went first. He always went first. This time there was nothing behind him.`,
  }),
  P({
    id: 'nix', name: 'Nix Calloway', nature: 'elf', sex: 'f', age: 22, rank: 'iron', role: 'caster', team: 't_blitz',
    weapons: `A leather sling and a pocketful of things to throw`,
    essences: ['essDiscord', 'essSmoke', 'essMonkey'],
    abilities: [
      A('Bad Idea', 'nova', 'shadow', '#ce93d8', 'A burst of discord: monsters turn on each other for a moment.'),
      A('Smokescreen', 'ward', 'shadow', '#9e9e9e', 'A rolling wall of smoke the team vanishes into.'),
      A('Clever Fingers', 'bolt', 'physical', '#ffcc80', 'Something thrown, from a pocket, that should not have been in a pocket.'),
      A('Riot', 'nova', 'shadow', '#ab47bc', 'Everything nearby starts fighting everything else, very loudly.'),
    ],
    look: `Elf woman, early twenties, small and wiry, olive skin, short choppy purple-dyed hair, pointed ears full of mismatched rings, mischievous green eyes. Patched grey coat with far too many pockets, striped stockings, soot on her face, a leather sling and a pocketful of things to throw. Quick, mouthy, always fiddling with something.`,
    about: `Ran away from a serious elven family at nineteen because she was bored. Picks locks, starts fires, starts arguments. Burned a contract once because the client was lying, and was right.`,
    stories: [
      `Kesh caught me picking his pocket on the Karsk Landing docks. He didn't call the watch. He asked if I wanted a job. I said what kind. He said the fun kind. I've been in trouble ever since.`,
      `My mother wanted me to study Harmony. I bonded Discord instead. Out of spite. Then it turned out I'm really, really good at it.`,
      `A merchant tried to pay us in fake silver. I put a monkey in his strongbox. A real monkey. Don't ask me where I got it.`,
    ],
    epitaph: `She'd have hated everyone being sad. So she'd have started a fight. I nearly did.`,
  }),
  P({
    id: 'bran', name: 'Brannoc Fell', nature: 'leonid', sex: 'm', age: 30, rank: 'iron', role: 'tank', team: 't_blitz',
    weapons: `His own steel-capped claws`,
    essences: ['essClaw', 'essBear', 'essBlood'],
    abilities: [
      A('Maul', 'strike', 'physical', '#ef9a9a', 'Both claws at once, low and then high.'),
      A('Pride Roar', 'ward', 'physical', '#ffab91', 'A roar so loud the team forgets to be afraid.'),
      A('Bloodrush', 'heal', 'shadow', '#e57373', 'He tears into something and comes away healthier for it.'),
      A('Ursine Crash', 'nova', 'physical', '#a1887f', 'He simply falls on everything, enormously.'),
    ],
    look: `Leonid man, thirty, a head and more taller than a human, huge and heavy, lion-headed with a great shaggy tawny mane braided with copper rings, golden eyes, tufted ears. Thick fur on arms, a scarred muzzle. Studded brown leather harness, bearskin cloak, bare-pawed, claws capped with steel. Laughs like a landslide.`,
    about: `Left his pride on the southern plains after losing a challenge for its leadership, and decided to be cheerful about it. Thinks the ice will always hold. Is usually right about everything except ice.`,
    stories: [
      `I lost a fight for my pride. My cousin won it. He's a good leader. I'm a better adventurer. Everyone wins. Mostly him.`,
      `Humans think a roar is just loud. A good roar is a promise. It says, "I am here, and I am staying." The team hears it and stops being scared. That's the trick.`,
      `The ice was going to hold. I want that on record. The ice was being unreasonable.`,
    ],
    epitaph: `He promised he'd be there. He was, right to the end. That's the trouble with lions.`,
  }),
  P({
    id: 'juno', name: 'Juno Sparrow', nature: 'human', sex: 'f', age: 21, rank: 'iron', role: 'scout', team: 't_blitz',
    weapons: `A pair of short hooked blades; a glider harness`,
    essences: ['essWing', 'essBird', 'essCloud'],
    abilities: [
      A('Diving Strike', 'strike', 'wind', '#b3e5fc', 'She drops out of the sky feet first.'),
      A('Feather Storm', 'nova', 'wind', '#e1f5fe', 'A whirl of razor feathers around her.'),
      A('Cloudcover', 'ward', 'wind', '#eceff1', 'A low cloud rolls in and everyone in it is hard to hit.'),
      A('Skylark Shot', 'bolt', 'wind', '#81d4fa', 'A whistling gust thrown like a stone.'),
    ],
    look: `Human woman, early twenties, small and light-boned. Brown skin, cloud of dark curly hair tied up with blue ribbon, a sprinkle of freckles, sharp brown eyes. Fitted sky-blue jacket with feathered shoulders, aviator goggles pushed up, a glider harness, a pair of short hooked blades. Restless, cheeky, can never stay on the ground.`,
    about: `A Harrowmoor messenger who bonded Wing the day she was nearly fired for being late, and has never been late since. Flew the team across a gorge on a rope because the bridge was too slow. Would do it again.`,
    stories: [
      `I used to run messages for the Harrowmoor post. I was always late. Then I bonded Wing. Now I'm early to everything. People find it unsettling.`,
      `The bridge was four miles away. The gorge was right there. I had rope. I fail to see the problem.`,
      `From up high, everything looks fixable. That's the lie the sky tells you. I like it anyway.`,
    ],
    epitaph: `She always went up to look. She didn't see it coming from below.`,
  }),

  // ===================================================== THE SPARKS (new) -- with Tobin and Pell
  P({
    id: 'wim', name: 'Wim Haddock', nature: 'human', sex: 'm', age: 20, rank: 'normal', role: 'support', team: 't_sparks',
    weapons: `A short staff (mostly for pointing at maps)`,
    essences: ['essPaper', 'essKnowledge', 'essMouse'],
    abilities: [
      A('Field Notes', 'ward', 'radiant', '#fff8e1', 'He reads the monster out loud from his book; everyone dodges what he warns them about.'),
      A('Paper Cut', 'bolt', 'physical', '#f5f5f5', 'A storm of folded pages, very sharp at the edges.'),
      A('Small and Quiet', 'ward', 'shadow', '#d7ccc8', 'He is not worth hitting. Neither, for a moment, is anyone near him.'),
      A('Footnote', 'heal', 'radiant', '#ffecb3', 'A page pressed to a wound holds it shut.'),
    ],
    look: `Human man, twenty, thin and stooped, too tall for his coat. Pale skin, round wire spectacles, straight mousy hair falling in his eyes, ink on his fingers. Brown scholar's coat with a satchel stuffed with books and loose pages, a reading lamp clipped to the strap, a short staff he uses mainly for pointing at maps. Earnest, anxious, talks in lists.`,
    about: `A clerk's son from Harrowmoor who read every Society guide in the library before registering, and was horrified to find the monsters had not. The team's planner. His notes have saved them four times and been wrong twice.`,
    stories: [
      `I read all forty-one Society field guides before registering. Thirty-eight of them were written by people who had clearly never met the monster. The other three are mine now. Annotated.`,
      `Mouse essence. Everyone laughs. Then they need someone to fit through the gap in the wall to open the gate from the other side.`,
      `Lark says I worry too much. I keep a list of everything that could go wrong. It's eleven pages. We've only ever hit page two.`,
    ],
    epitaph: `He wrote down everything. We found the last page. He'd been right.`,
  }),
  P({
    id: 'lark', name: 'Lark Quillon', nature: 'elf', sex: 'f', age: 19, rank: 'normal', role: 'healer', team: 't_sparks',
    weapons: `No weapon: a little wooden flute on a cord`,
    essences: ['essPlant', 'essSong', 'essRabbit'],
    abilities: [
      A('Greenmend', 'heal', 'nature', '#a5d6a7', 'Moss and leaves knit over a wound and hold it.'),
      A('Hedge Song', 'ward', 'nature', '#c8e6c9', 'She sings, and a hedge of thorns grows up around the team.'),
      A('Briar Burst', 'nova', 'nature', '#66bb6a', 'Brambles erupt from the ground under everything nearby.'),
      A('Quick Feet', 'heal', 'nature', '#e8f5e9', 'A skipping tune that puts the bounce back in tired legs.'),
    ],
    look: `Elf woman, nineteen, small and slight, warm brown skin, long braided green-black hair woven with wildflowers, long ears that twitch when she is nervous, big hazel eyes. Moss-green tunic, patched rabbit-fur cloak, bare feet more often than not, a little wooden flute on a cord. Gentle, shy until she sings.`,
    about: `A gardener's apprentice from an elven estate in Ontaria who joined Tobin and Pell because they were the only people at the Society who asked her name. Heals everything that will hold still, including monsters, which the team is still discussing.`,
    stories: [
      `I was a gardener's apprentice for six years. My teacher said, "You're ready when you can grow something in a stone." I grew a rose in a rock troll. It was an accident. I left before anyone could ask me to do it again.`,
      `I healed a wolf once, by mistake, in the middle of a contract. It followed us home. It's the team's wolf now. Wim has written a whole page on why that shouldn't work.`,
      `Pell sings shanties. Tobin hums. Wim doesn't sing at all. I sing for all of us. It helps the plants. It helps the people too, I think.`,
    ],
    epitaph: `She'd have planted something over it. So we did. It's growing.`,
  }),

  // ===================================================== THE OLD HANDS (disciplined, weary)
  P({
    id: 'hester', name: 'Hester Graymane', nature: 'human', sex: 'f', age: 58, rank: 'silver', role: 'melee', team: 't_old',
    weapons: `A long-handled war sickle`,
    essences: ['essBone', 'essSickle', 'essResolute'],
    abilities: [
      A('Reaping Arc', 'nova', 'shadow', '#e0e0e0', 'One long sickle sweep that takes the legs out from everything in front of her.'),
      A('Marrow Spike', 'strike', 'shadow', '#eeeeee', 'A spur of bone from the ground, exactly where it needs to be.'),
      A('Old Bones', 'ward', 'physical', '#bdbdbd', 'She has survived worse than this, and she makes sure everyone else does too.'),
      A('Last Harvest', 'strike', 'shadow', '#9e9e9e', 'The killing stroke, slow and certain, once something is already failing.'),
    ],
    look: `Human woman, late fifties, wiry and hard as old rope. Weathered tan skin, long iron-grey hair in a single braid, deep crow's feet, one milky blind eye with a scar through it. Dark grey layered leathers and an old bone-plated coat, a long-handled war sickle, a pipe she never lights. Calm, dry, misses nothing with the eye she has.`,
    about: `Has led the same team for thirty years and buried six of its members. Turned down gold rank twice. Teaches younger teams for free if they buy the drinks, and they should.`,
    stories: [
      `I lost the eye to a silver-rank wyvern in my second year. I lost the next six friends to things far smaller. It's never the big ones. It's the one you didn't think was dangerous.`,
      `The Society offered me gold rank twice. I said no. At gold, I'd have to stop leading this team and start leading armies. I'd rather lead five people I know than five hundred I don't.`,
      `Bone essence gets a bad name. Death cults, necromancers. But bone is what holds you up. That's all I've ever tried to do.`,
    ],
    epitaph: `Thirty years she brought us all home. We couldn't do it once for her.`,
  }),
  P({
    id: 'orrin', name: 'Orrin Vale', nature: 'elf', sex: 'm', age: 61, rank: 'silver', role: 'caster', team: 't_old',
    weapons: `A staff of black wood with a floating mote of light`,
    essences: ['essStar', 'essVast', 'essEcho'],
    abilities: [
      A('Falling Star', 'bolt', 'radiant', '#e1f5fe', 'A point of starlight drops out of a clear sky.'),
      A('Vastness', 'ward', 'radiant', '#b3e5fc', 'The space around the team grows very large, and blows take a long time to arrive.'),
      A('Echoing Night', 'nova', 'shadow', '#90caf9', 'The last spell he cast happens again, everywhere at once.'),
      A('Constellation', 'nova', 'radiant', '#ffffff', 'Stars light up over every enemy nearby, then fall together.'),
    ],
    look: `Elf man, early sixties, weathered. Very tall and thin, deep brown skin, long white locs tied back with silver thread, pale blue eyes that seem to look a little past you. Dark midnight-blue robes stitched with constellations, a star-iron circlet, a staff of black wood with a floating mote of light. Quiet, melancholy, very kind.`,
    about: `Hester's oldest friend and the team's memory. Was in this team before she led it, has buried six of it, and has never once thought of leaving. Talks to the stars at night and says they talk back, and nobody on the team argues.`,
    stories: [
      `I met Hester when she was nineteen and had both eyes and no sense at all. She's kept the eye and lost the rest. I think it's an improvement.`,
      `I've buried six of this team. People think it gets easier. It doesn't. What gets easier is knowing what to say to the ones who are left.`,
      `The stars over the Cinderwaste are different. Brighter, closer. Something is watching from up there. It's not unfriendly. It's just very, very interested.`,
    ],
    epitaph: `Forty years at Hester's side, and he chose us every one of them. I don't know how to finish that sentence.`,
  }),
  P({
    id: 'tamsin', name: 'Tamsin Crowe', nature: 'human', sex: 'f', age: 41, rank: 'silver', role: 'ranged', team: 't_old',
    weapons: `A recurve bow of black horn; colour-fletched arrows`,
    essences: ['essBow', 'essEye', 'essBat'],
    abilities: [
      A('Night Shot', 'bolt', 'shadow', '#b0bec5', 'An arrow loosed by sound alone, in the dark, perfectly.'),
      A('Hawk\'s Eye', 'bolt', 'physical', '#cfd8dc', 'She sees the one weak scale and hits it.'),
      A('Echolocation', 'ward', 'shadow', '#90a4ae', 'She hears everything that is coming, and calls it out before it lands.'),
      A('Bat Swarm Volley', 'nova', 'shadow', '#607d8b', 'A screeching cloud of arrows that turn in the air.'),
    ],
    look: `Human woman, early forties, small and compact. Deep olive skin, black hair cropped very short, sharp angular face, dark eyes that never stop scanning, a bat tattoo on her neck. Black and charcoal hunting leathers, a hooded half-cape, a recurve bow of black horn, a dozen arrow types colour-coded by fletching. Terse, wry, bad at sitting still.`,
    about: `Grew up in the Cinderwaste mines and still hears better in the dark than most people see in daylight. Hester's second, the one who says the hard thing first.`,
    stories: [
      `I was a mine runner at seven. You learn to hear a tunnel breathe. You learn which sounds mean "run". Most monsters make the same sounds the mountain does, just smaller.`,
      `Hester tells everyone it's never the big ones. She's right. It's the one you didn't hear. That's why I listen.`,
      `Nineteen years in this team. I have never once seen Orrin hurry. Not once. I have seen him get there first.`,
    ],
    epitaph: `She'd have heard it coming. That's what I can't stop thinking. She'd have heard it.`,
  }),
  P({
    id: 'mattias', name: 'Mattias Brand', nature: 'draconian', sex: 'm', age: 52, rank: 'silver', role: 'tank', team: 't_old',
    weapons: `A tower shield and a short heavy mace`,
    essences: ['essArmour', 'essLizard', 'essSmoke'],
    abilities: [
      A('Scale and Plate', 'ward', 'physical', '#a1887f', 'Scales under steel under scales. The team stands behind him.'),
      A('Lizard\'s Patience', 'heal', 'nature', '#aed581', 'He simply grows back what he lost, slowly and without fuss.'),
      A('Smoke Breath', 'nova', 'fire', '#9e9e9e', 'A rolling cough of hot smoke over everything in front of him.'),
      A('Tail Sweep', 'nova', 'physical', '#8d6e63', 'He turns, and his armoured tail clears the ground around him.'),
    ],
    look: `Draconian man, early fifties, a head taller than a human, heavy and broad, slow-moving like a big lizard in the sun. Dull green-grey scales over most of his face and neck, a heavy brow ridge, short blunt horns, gold eyes, a thick armoured tail. Full blackened plate patched many times, a tower shield, a short heavy mace, a pipe that actually smokes. Unflappable, slow-spoken, wise.`,
    about: `The team's wall for twenty years. Has been nearly killed eleven times and grew back from all of them. Finds most things amusing and very little alarming.`,
    stories: [
      `I've been nearly killed eleven times. Lizard essence. I grow back. The tail took six months the last time. Orrin read me poetry. I'd rather have stayed dead.`,
      `Young draconians want to be fierce. Fire, claws, roaring. I wanted to be the one who's still standing at the end. Less glamorous. Better odds.`,
      `Smoke essence. People think it's for hiding. It's for breathing in front of something and watching it decide not to bother.`,
    ],
    epitaph: `He always grew back. We sat with him three days waiting. He didn't.`,
  }),
  P({
    id: 'quill', name: 'Quill Ashenrune', nature: 'runic', sex: 'm', age: 37, rank: 'silver', role: 'support', team: 't_old',
    weapons: `A short rod with a crystal head`,
    essences: ['essRune', 'essCrystal', 'essMagic'],
    abilities: [
      A('Glyph of Warding', 'ward', 'radiant', '#80cbc4', 'A rune burns into the air in front of the team and takes the blow.'),
      A('Crystal Lance', 'bolt', 'physical', '#b2dfdb', 'A spear of pale crystal grown in an instant and fired.'),
      A('Runecraft Mend', 'heal', 'radiant', '#e0f2f1', 'He writes "whole" on a wound and it listens.'),
      A('Script of Ruin', 'nova', 'shadow', '#4db6ac', 'Runes flare on every enemy nearby, and then they detonate.'),
    ],
    look: `Runic man, late thirties, slim and neat. Smooth dark slate skin covered in glowing teal runes that shift slowly like writing being written, bald head with runes across the scalp, pale teal eyes. Fitted grey robes with crystal buttons, fingerless gloves, a leather case of styluses and chalk, a crystal-headed short rod. Precise, wry, endlessly curious.`,
    about: `The youngest of the old hands, recruited when the team's last runecaster died. His runes change when he is upset, so the team reads his skin to know how bad things are. Never says it out loud.`,
    stories: [
      `My runes rewrite themselves when I feel strongly. When I joined, the team learned to read them faster than I learned to hide them. Hester says it's the only honest face she's ever trusted.`,
      `Runic children are born written. Nobody knows who wrote us. Some think it was a god, some think a wizard, some think it's just what the world does when it's bored. I'm on the third side.`,
      `The man I replaced was called Edwin. He left a book of glyphs for whoever came next. I've never met him. I talk to his margins.`,
    ],
    epitaph: `His runes went quiet at the end. That's how we knew. They're never quiet.`,
  }),

  // ===================================================== THE PROFESSIONALS (disciplined, cold)
  P({
    id: 'varga', name: 'Varga Holt', nature: 'human', sex: 'f', age: 39, rank: 'silver', role: 'melee', team: 't_coin',
    weapons: `A coiled steel chain-whip`,
    essences: ['essWhip', 'essChain', 'essHunger'],
    abilities: [
      A('Collection Notice', 'strike', 'physical', '#ffab91', 'A chain-whip that wraps the target and drags it to her.'),
      A('Binding Terms', 'nova', 'physical', '#bcaaa4', 'Chains lash out across the ground and hold everything near her.'),
      A('Hungry Lash', 'heal', 'shadow', '#d84315', 'Every strike feeds her a little of what it takes.'),
      A('Final Payment', 'strike', 'shadow', '#bf360c', 'One last crack of the whip, aimed at whatever is weakest.'),
    ],
    look: `Human woman, late thirties, tall and athletic, sharp features. Pale skin, sleek black hair in a severe bob, cold grey eyes, thin red lips, a gold tooth. Tailored black leather coat with silver buttons, a waistcoat with a pocket watch, a coiled steel chain-whip at her hip, ledger and fountain pen. Composed, businesslike, smiles only at good terms.`,
    about: `Grew up the daughter of a Vashra debt collector and runs her team the same way: reliable, precise and paid. Has never broken a contract. Has made several clients wish they had read theirs more carefully.`,
    stories: [
      `My father collected debts in Vashra. He taught me two things: always read the whole contract, and nobody respects a creditor who doesn't collect. Both hold for monsters.`,
      `People call us mercenaries like it's an insult. Every adventurer is paid. We're just the only ones who admit we like it.`,
      `A nest contract in the Cinderwaste said "clear all hostile creatures". The client's prize hound was hostile. We cleared it. He paid. He read the next contract very carefully.`,
    ],
    epitaph: `She'd want her share sent home. It went out this morning, in full. That's all I'll say.`,
  }),
  P({
    id: 'sable', name: 'Sable Drennick', nature: 'elf', sex: 'm', age: 44, rank: 'silver', role: 'melee', team: 't_coin',
    weapons: `A slim rapier; a bandolier of needles and vials`,
    essences: ['essNeedle', 'essVenom', 'essSpider'],
    abilities: [
      A('Precise Incision', 'strike', 'nature', '#c5e1a5', 'A needle-thin blade, exactly into the gap.'),
      A('Spider\'s Patience', 'ward', 'shadow', '#9ccc65', 'Webs across the ground in front of the team: whatever comes, comes slowly.'),
      A('Venom Kiss', 'bolt', 'nature', '#7cb342', 'A thrown needle that keeps working after it lands.'),
      A('Widow\'s Web', 'nova', 'nature', '#558b2f', 'A web blooms over everything nearby and every strand is poisoned.'),
    ],
    look: `Elf man, mid-forties, sharp and narrow. Ashen pale skin, slicked-back black hair, thin moustache, dark heavy-lidded eyes, long ears with a single silver stud. Fitted charcoal doublet, black gloves, a slim rapier and a bandolier of needles and vials. Soft-spoken, elegant, mildly unsettling.`,
    about: `A former court poisoner from an elven house that fell, who found the Society more honest work. Varga's oldest partner. Very polite. Very patient. Very good with poisons.`,
    stories: [
      `I served an elven house for twenty years. Mostly I made sure certain guests did not enjoy dinner. The house fell. I found monsters far more honest company.`,
      `Venom is patience you can carry in a bottle. Most people want to win in one blow. I'm content to win in thirty heartbeats, quietly, from across the room.`,
      `Varga thinks I'm cold. I think I'm considerate. A monster that dies slowly is a monster that can't hurt anyone while it does it.`,
    ],
    epitaph: `He'd want it noted it was nothing he'd ever have poisoned. Somehow that matters to me too.`,
  }),
  P({
    id: 'rook', name: 'Rook Ansel', nature: 'human', sex: 'm', age: 33, rank: 'silver', role: 'ranged', team: 't_coin',
    weapons: `A long brass-fitted rifle; a clockwork rig on his back`,
    essences: ['essGun', 'essTechnology', 'essWheel'],
    abilities: [
      A('Precision Round', 'bolt', 'physical', '#b0bec5', 'One loud, clean shot through whatever it is aimed at.'),
      A('Gear Turret', 'nova', 'physical', '#78909c', 'A little clockwork turret clacks open beside him and sprays the area.'),
      A('Ratchet Plate', 'ward', 'physical', '#cfd8dc', 'Folding steel plates snap up in front of the team.'),
      A('Rolling Barrage', 'nova', 'fire', '#ff8a65', 'He rolls a wheel of bombs into the fight and steps back.'),
    ],
    look: `Human man, early thirties, stocky and practical. Dark brown skin, shaved sides with a short twisted top, goggles with many lenses, a neat goatee, burn-scarred hands. Grease-stained canvas work coat over a leather vest bristling with tools, a long brass-fitted rifle, a clockwork rig on his back. Calm, methodical, talks to his machines.`,
    about: `A Vashra engineer who built his own weapon from a dwarven design and the Technology essence, and now builds the team's kit too. Thinks most monsters are badly designed. Usually right.`,
    stories: [
      `Most monsters are badly designed. Too many legs, not enough armour where it counts. I just point at the design flaws.`,
      `The Gun essence is rare up here. I had to build the gun myself to make it worth anything. Took three years. Exploded twice. Third time it worked, and so did I.`,
      `Varga pays on time. Sable never raises his voice. Ember keeps the coffee hot. Best workshop I've ever had, and it moves.`,
    ],
    epitaph: `He built this for me. I'll keep it running. That's all I know how to do now.`,
  }),
  P({
    id: 'ember', name: 'Ember Kaldis', nature: 'celestine', sex: 'f', age: 77, rank: 'silver', role: 'caster', team: 't_coin',
    weapons: `No weapon: a glass-bead rosary as a focus`,
    essences: ['fire', 'essPotent', 'essGlass'],
    abilities: [
      A('Glassfire', 'bolt', 'fire', '#ff7043', 'Fire so hot it leaves a trail of molten glass in the air.'),
      A('Prism Flare', 'nova', 'radiant', '#ffcc80', 'A burst of light split through glass into every colour of burning.'),
      A('Potent Blaze', 'strike', 'fire', '#f4511e', 'One fireball, poured into, made worse on purpose.'),
      A('Mirrorpane', 'ward', 'radiant', '#ffe0b2', 'Panes of hot glass hang in the air and take the blows.'),
    ],
    look: `Celestine woman, looks about forty, statuesque. Light bronze skin, hair of bright polished copper cut in a sharp asymmetric bob, and eyes of the same bright copper, small glass beads at her temples. Elegant red-and-gold coat with glass cufflinks, heat-darkened gloves, a glass-bead rosary she uses as a focus. Cool, witty, very hard to impress.`,
    about: `A glassblower's heir who found she preferred melting things to shaping them. The team's negotiator: clients find it difficult to argue with a woman whose hands are on fire.`,
    stories: [
      `My family made the windows of the Vashra cathedral. Very beautiful. Very slow. I found I preferred the bit with the fire.`,
      `Clients always try to haggle with Varga. Then I walk in. Something about the smoke coming off my gloves. Negotiations go very quickly after that.`,
      `Glass is just sand that's been through something. I find that comforting. So am I.`,
    ],
    epitaph: `She always said glass was sand that had been through something. She went through it. We didn't.`,
  }),

  // ===================================================== THE DAWN (disciplined, devout)
  P({
    id: 'aurelian', name: 'Aurelian Sollis', nature: 'celestine', sex: 'm', age: 104, rank: 'bronze', role: 'support', team: 't_dawn',
    weapons: `A golden sceptre with a sunburst head`,
    essences: ['essSun', 'essSceptre', 'essSong'],
    abilities: [
      A('Hymn of Morning', 'ward', 'radiant', '#fff59d', 'A hymn that settles over the team like the first warm light.'),
      A('Sceptre of Judgement', 'strike', 'radiant', '#ffee58', 'The sceptre comes down with a sound like a bell.'),
      A('Dawnchant', 'heal', 'radiant', '#fffde7', 'A low chant, and the hurt fades with the dark.'),
      A('Sunrise', 'nova', 'radiant', '#ffd54f', 'The light rises from the ground under every enemy at once.'),
    ],
    look: `Celestine man, looks about forty, serene and upright. Pale skin, close-cut hair of diamond — clear and glittering, throwing tiny rainbows as he moves — and eyes of the same clear diamond, a clean-shaven gentle face. White and gold temple vestments over light scale, a golden sceptre with a sunburst head, a hymnal on a chain. Calm, kind, a voice made for singing.`,
    about: `A priest of the Healer who asked to be sent out of the temple and into the places it was needed. Prays before every contract that he will be needed less.`,
    stories: [
      `Every contract, I pray to be needed less. Every contract, I am needed more. I think the Healer has a sense of humour. I hope so. It would help.`,
      `A child once asked me why the Healer lets monsters exist. I said I don't know. She said, "Then why do you work for him?" I said, "Because he's the one cleaning up after." She thought about it and agreed.`,
      `We stay after the fighting. The burials, the broken roofs. Most teams leave once they're paid. The fight is the short part.`,
    ],
    epitaph: `He'd want us to stay for the afterwards. So we're staying. That's what he'd do.`,
  }),
  P({
    id: 'maelis', name: 'Maelis Dawnwater', nature: 'celestine', sex: 'f', age: 69, rank: 'bronze', role: 'healer', team: 't_dawn',
    weapons: `A solid ash staff capped with a silver shell`,
    essences: ['heal', 'essWater', 'essLife'],
    abilities: [
      A('Wellspring', 'heal', 'radiant', '#80deea', 'A spring of clear water rises under the most hurt and washes the wound clean.'),
      A('Living Current', 'heal', 'nature', '#a5d6a7', 'Warmth flows from her hands into everyone nearby.'),
      A('Rebuke', 'strike', 'physical', '#e0f7fa', 'She hits it very hard with the flat of her staff. It is a courtesy.'),
      A('Baptism', 'nova', 'radiant', '#4dd0e1', 'A wave of holy water that heals friends and scalds the unclean.'),
    ],
    look: `Celestine woman, looks about thirty-five, tall and strong-shouldered. Light-brown skin, long wavy hair of black onyx, glossy as polished stone yet moving like hair, under a white veil, and eyes of the same glossy black onyx, a strong jaw. Blue-and-white healer's habit with rolled sleeves, a silver water-flask, a solid ash staff capped with a silver shell. Brisk, warm, absolutely unshakeable.`,
    about: `A temple hospital nurse who bonded Life in a plague year and has never stopped working since. Listened politely to a cultist's sermon mid-fight, healed her, and then hit her very hard.`,
    stories: [
      `I was a nurse in the Elehyd plague year. Life essence came to me on the night I couldn't save anyone. I've been making up for that night ever since.`,
      `The cultist talked for a long while about her god. I listened. Listening is a courtesy. Then I healed her, because that's my job. Then I hit her, because that's also my job.`,
      `Cassian thinks courage is not being afraid. Courage is being afraid and holding the bandage steady anyway.`,
    ],
    epitaph: `She kept everyone alive for twenty years. For one morning we couldn't keep her.`,
  }),
  P({
    id: 'cassian', name: 'Cassian Thale', nature: 'human', sex: 'm', age: 27, rank: 'bronze', role: 'tank', team: 't_dawn',
    weapons: `A longsword and a heater shield`,
    essences: ['essSword', 'essZeal', 'essBalance'],
    abilities: [
      A('Oathblade', 'strike', 'radiant', '#e1bee7', 'A clean, bright cut in the Healer\'s name.'),
      A('Zealous Charge', 'strike', 'physical', '#f3e5f5', 'He runs in shouting the litany and does not stop until he arrives.'),
      A('Even Scales', 'ward', 'radiant', '#ce93d8', 'What the team takes is spread across all of them, lightly.'),
      A('Penitent Sweep', 'nova', 'radiant', '#ba68c8', 'A wide sword arc trailing violet light.'),
    ],
    look: `Human man, late twenties, tall, athletic, square-jawed. Fair skin, short blond hair, earnest blue eyes, a fresh scar on one cheek. Polished silver mail with a white tabard bearing the Healer's open hand, a longsword and a heater shield. Earnest, eager, a little too sure he is right.`,
    about: `A temple squire who wants very badly to be a hero and is slowly learning that heroes are mostly people who stay to dig graves. The team's sword and its youngest believer.`,
    stories: [
      `I joined the temple to be a knight. Brother Aurelian made me dig graves for a month first. I was angry. I understand now. I think. Mostly.`,
      `Balance essence. Everyone expects calm. I'm not calm. I'm trying to learn to be. The essence keeps telling me how far I have to go.`,
      `Maelis says courage is holding the bandage steady when you're afraid. I'm working on it. My hands still shake. I hold it anyway.`,
    ],
    epitaph: `He wanted so badly to be a hero. He was. He'd hate me saying it.`,
  }),
  P({
    id: 'fenna', name: 'Fenna Brightwell', nature: 'elf', sex: 'f', age: 26, rank: 'bronze', role: 'ranged', team: 't_dawn',
    weapons: `A short bow of pale wood`,
    essences: ['essLight', 'essBee', 'essGrowth'],
    abilities: [
      A('Honeylight Arrow', 'bolt', 'radiant', '#ffe082', 'A golden arrow that stings what it hits and leaves the air sweet behind it.'),
      A('Swarm Hymn', 'nova', 'nature', '#ffd54f', 'A humming cloud of golden bees over the enemy.'),
      A('Bloom', 'heal', 'nature', '#c5e1a5', 'Flowers spring up where the team stands and the air smells like summer.'),
      A('Hive Shield', 'ward', 'nature', '#fff176', 'A dome of humming bees around the team, very protective.'),
    ],
    look: `Elf woman, mid-twenties, small and round-cheeked. Warm golden-tan skin dusted with freckles, honey-blonde hair in two thick plaits, amber eyes, long ears with tiny bee earrings. Yellow and white beekeeper-inspired robes with a netted hood thrown back, a short bow of pale wood, a little hive lantern that hums. Sunny, chatty, gentle.`,
    about: `A temple beekeeper whose bees followed her the day she left. Talks to them constantly. They seem to listen.`,
    stories: [
      `I kept the temple's bees for ten years. When I left with the team, they came too. All of them. The abbess was very upset. The honey was very good.`,
      `Bees are a team. Everyone has a job, everyone works for everyone else, and they'll die for the hive without a second thought. I try to be more like a bee. Less of the dying part.`,
      `Cassian asked me what the bees say. They say, "flowers, flowers, flowers, danger, flowers." It's very restful.`,
    ],
    epitaph: `The bees went quiet the night she died. They still won't settle. Neither will we.`,
  }),

  // ===================================================== THE SEEKERS (chaotic, curious)
  P({
    id: 'thessaly', name: 'Thessaly Moonwhisper', nature: 'elf', sex: 'f', age: 52, rank: 'silver', role: 'caster', team: 't_seek',
    weapons: `No weapon: a glass astrolabe as a focus`,
    essences: ['essDimension', 'essOmen', 'essGlass'],
    abilities: [
      A('Fold in Space', 'ward', 'radiant', '#b39ddb', 'The space around the team folds and the blow lands somewhere else.'),
      A('Ill Omen', 'nova', 'shadow', '#7e57c2', 'A sign appears over every enemy, and none of them like it.'),
      A('Glass Gate', 'bolt', 'radiant', '#d1c4e9', 'A shard of folded space fired through the air.'),
      A('Elsewhere', 'nova', 'radiant', '#5e35b1', 'For a heartbeat everything near her is somewhere else, and comes back hurt.'),
    ],
    look: `Elf woman, early fifties, elegant and distracted. Pale lavender-tinged skin, long straight black hair with silver streaks pinned with glass pins, violet eyes behind small round spectacles. Deep purple scholar's robes with many pockets full of notes, a glass astrolabe at her belt, ink-stained fingers. Absent-minded, brilliant, always asking what's behind the door.`,
    about: `A college scholar of dimensional theory who got bored of lecturing and went to see the dimensions for herself. Asks doors nicely before Isolde breaks them.`,
    stories: [
      `I lectured on dimensional theory for twenty years. Then a student asked if I'd ever been to another dimension. I hadn't. I resigned the next morning.`,
      `Every door in the Stepped City has a word for opening it. Ptolem reads them. I say them. Isolde breaks the ones that don't listen. It works surprisingly well.`,
      `People think omen essence is about seeing the future. It's about seeing the shape of what's about to go wrong. It's usually doors. It's always doors.`,
    ],
    epitaph: `She wanted to know what was behind every door. I hope she's found out.`,
  }),
  P({
    id: 'calder', name: 'Calder Penhallow', nature: 'human', sex: 'm', age: 44, rank: 'silver', role: 'tank', team: 't_seek',
    weapons: `A steel-edged spade`,
    essences: ['essEarth', 'essShovel', 'essDust'],
    abilities: [
      A('Dig In', 'ward', 'nature', '#bcaaa4', 'He is suddenly in a trench, and so is everyone near him.'),
      A('Spade Strike', 'strike', 'physical', '#a1887f', 'A practised swing of an archaeologist\'s shovel, edge first.'),
      A('Dust Devil', 'nova', 'nature', '#d7ccc8', 'A whirlwind of grit that blinds and scours everything near him.'),
      A('Landslide', 'nova', 'nature', '#795548', 'He shovels the hill onto them.'),
    ],
    look: `Human man, mid-forties, burly and sunburnt, cheerful. Ruddy tanned skin, sandy hair going thin under a wide-brimmed hat, bushy sideburns, laugh lines. Dusty khaki field coat with rolled sleeves, a canvas map case, knee pads, a steel-edged spade he fights with. Hearty, practical, loves a hole in the ground.`,
    about: `A dig foreman who has excavated more ruins than any scholar alive and been credited for none of them. The only one on the team who checks the ceiling before going in.`,
    stories: [
      `Twenty years digging up ruins for college men who took the credit. Then Thessaly came along and put my name first on the paper. I'd follow her into anything after that. I have.`,
      `Always check the ceiling. Always. A ruin is just a building that's had time to think about falling down.`,
      `There's a pipe under the Cut that sings when it rains. It's a pipe. Thessaly says it's a god. I'm telling you, it's plumbing. Very old, very angry plumbing.`,
    ],
    epitaph: `He checked the ceiling. He always checked the ceiling. It wasn't the ceiling.`,
  }),
  P({
    id: 'isolde', name: 'Isolde Verran', nature: 'elf', sex: 'f', age: 33, rank: 'silver', role: 'melee', team: 't_seek',
    weapons: `A fine ice-blue rapier`,
    essences: ['essIce', 'essSerene', 'essDeer'],
    abilities: [
      A('Frost Hinge', 'strike', 'frost', '#b3e5fc', 'A rapier thrust that freezes whatever it touches, joints first.'),
      A('Still Water', 'ward', 'frost', '#e1f5fe', 'A calm descends on the team. The panic leaves. So do half the blows.'),
      A('Antler Ice', 'nova', 'frost', '#81d4fa', 'Spikes of ice branch out from the ground like antlers.'),
      A('Hoarfrost Bound', 'strike', 'frost', '#4fc3f7', 'She bounds in, strikes, and is gone, leaving frost behind.'),
    ],
    look: `Elf woman, early thirties, long-limbed and graceful as a deer. Pale icy-white skin, short white-blonde hair, pale blue eyes, long ears with tiny antler-shaped cuffs. Fitted pale grey and frost-blue fencing coat, a fine ice-blue rapier, light boots. Serene, quiet, devastatingly direct.`,
    about: `A fencing master who joined the expedition to protect Thessaly from Thessaly. Breaks the doors that don't listen. Has never once lost her temper, which is somehow more frightening.`,
    stories: [
      `I joined to keep Thessaly alive. She walked into a collapsing ruin to finish reading a wall. I froze the ceiling. She finished the wall. That's every day.`,
      `Serene essence. People think it means peaceful. It means unshaken. There's a difference. Ask the door I froze off its hinges.`,
      `Deer are prey animals. They know how to run. People forget they also know how to fight when the running stops.`,
    ],
    epitaph: `She was the calm in all of us. I keep reaching for it and she isn't there.`,
  }),
  P({
    id: 'ptolem', name: 'Ptolem Graves', nature: 'runic', sex: 'm', age: 55, rank: 'silver', role: 'support', team: 't_seek',
    weapons: `A measuring rod`,
    essences: ['essTrap', 'essMirror', 'essThread'],
    abilities: [
      A('Reading the Floor', 'ward', 'radiant', '#b2ebf2', 'He spots every trap before anyone steps on it, and sets a few of his own.'),
      A('Mirror Snare', 'nova', 'physical', '#e0f7fa', 'A ring of mirrored threads that catches everything stepping into it.'),
      A('Reflected Rune', 'bolt', 'radiant', '#80deea', 'The last spell aimed at the team, turned around.'),
      A('Thread of Fate', 'heal', 'radiant', '#4dd0e1', 'A thread that sews a wound shut, and a little of the luck that caused it.'),
    ],
    look: `Runic man, mid-fifties, thin, stooped and bespectacled. Pale grey skin covered in fine silver runes like lines of text, a neat white beard, half-moon glasses, long fingers. Faded green scholar's coat with thread spools and tiny mirrors sewn in, a satchel of tools, a measuring rod. Fussy, kindly, mutters glyphs under his breath.`,
    about: `A translator of dead languages whose own skin is written in one nobody can read. Reads the doors in the Stepped City. Reads the traps faster.`,
    stories: [
      `I translate dead languages. My own skin is written in one nobody's ever been able to read. I'm working on it. In my spare time. Between traps.`,
      `Every trap in the Stepped City has a glyph that says what it does. Every builder lies. The glyph says "doorbell". The trap says "spikes". Read the floor, not the sign.`,
      `Thessaly asks the doors nicely. I tell her what they said back. Sometimes I soften it.`,
    ],
    epitaph: `He read every warning. He couldn't read the last one in time.`,
  }),

  // ===================================================== THE SANDS (new to cities)
  P({
    id: 'rhaza', name: 'Rhaza Sunmane', nature: 'leonid', sex: 'f', age: 34, rank: 'bronze', role: 'melee', team: 't_sands',
    weapons: `A long tasselled desert spear`,
    essences: ['essSand', 'essCat', 'essSpear'],
    abilities: [
      A('Dune Lunge', 'strike', 'nature', '#ffe082', 'A spear thrust that comes out of a spray of sand.'),
      A('Sandstorm Veil', 'ward', 'nature', '#ffecb3', 'Sand rises around the team and nothing sees them clearly.'),
      A('Lioness Pounce', 'strike', 'physical', '#ffca28', 'She drops on her prey from much further away than looks possible.'),
      A('Scouring Wind', 'nova', 'nature', '#ffb300', 'A ring of whipping sand that strips everything nearby.'),
    ],
    look: `Leonid woman, mid-thirties, a head taller than a human, powerful and lithe. Lioness-headed, sleek sandy-gold fur, no mane, amber eyes lined dark, tufted ears pierced with brass rings. Layered sand-coloured desert wraps and a scarf, light brass-studded leather, a long desert spear with tassels, a water skin always at her hip. Proud, watchful, warm once she decides you're worth it.`,
    about: `Led salt caravans across the Sirukh sands for ten years until the caravans stopped. Brought her people north to find work and is baffled by everything about cities.`,
    stories: [
      `I led caravans across the Sirukh for ten years. Never lost one. Here, I lost my way to the Society hall three times on the first day. Cities have too many corners.`,
      `In the sand, water is honour. You share it before you speak. Here, people buy water from a man with a barrel. Mott nearly started a fight about it.`,
      `They told me to sign the contract. I asked, "Where?" They said, "On the line." I signed every line. The clerk was very kind about it.`,
    ],
    epitaph: `She brought us all across the sand. She'd want us to keep walking. We are.`,
  }),
  P({
    id: 'tarek', name: 'Tarek Vell', nature: 'human', sex: 'm', age: 25, rank: 'iron', role: 'ranged', team: 't_sands',
    weapons: `A harpoon on a coiled line and a short curved knife`,
    essences: ['essShip', 'essCrocodile', 'essNet'],
    abilities: [
      A('Harpoon Cast', 'bolt', 'physical', '#80cbc4', 'A barbed harpoon on a line, thrown and reeled back.'),
      A('Death Roll', 'strike', 'physical', '#4db6ac', 'He grabs it, and spins, and something breaks.'),
      A('Dragnet', 'nova', 'physical', '#b2dfdb', 'A weighted net cast wide over everything in front of him.'),
      A('Hull Plate', 'ward', 'physical', '#e0f2f1', 'Like being behind the planks of a good ship.'),
    ],
    look: `Human man, mid-twenties, lean and broad-shouldered. Deep brown skin, long black hair in many thin braids tied with blue cord, a short beard, a broad smile with a chipped tooth. Sun-faded blue sailor's tunic, desert wrap, rope belt, a harpoon with a coiled line and a short curved knife. Easy-going, joking, good with rope.`,
    about: `A Tolbrand Quay sailor who signed on with the salt caravans when the sea ships stopped. Has never seen a lake that didn't have something in it trying to eat him.`,
    stories: [
      `I was a sailor in Tolbrand Quay. Then the sea got too dangerous for ships. So I walked across a desert instead. My mother says I have no sense. She's right. She also gave me the harpoon.`,
      `Crocodile essence. Very good in water. Very good on sand. Very bad in cities, people keep asking me to stop smiling.`,
      `A cat bit me. In the city. It was a contract. We found the cat. The cat did not want to be found. I respect the cat.`,
    ],
    epitaph: `He'd laugh at all of us for crying. So we laughed. Then we cried anyway.`,
  }),
  P({
    id: 'zahra', name: 'Zahra Idris', nature: 'celestine', sex: 'f', age: 58, rank: 'bronze', role: 'healer', team: 't_sands',
    weapons: `No weapon: a falconer's glove for a falcon made mostly of light`,
    essences: ['essShimmer', 'essWind', 'essBird'],
    abilities: [
      A('Mirage Mend', 'heal', 'radiant', '#e1f5fe', 'A shimmer passes over the wounded and the wound was never quite there.'),
      A('Heat Shimmer', 'ward', 'radiant', '#fff8e1', 'The air wavers around the team and nothing aims true.'),
      A('Falcon\'s Call', 'bolt', 'wind', '#b3e5fc', 'A screaming dive of wind shaped like a hunting bird.'),
      A('Desert Wind', 'nova', 'wind', '#ffecb3', 'Hot wind rolls out from her, carrying the sand with it.'),
    ],
    look: `Celestine woman, looks about thirty, elegant and composed. Deep brown skin, hair of amethyst, violet and crystalline, mostly under a shimmering pale-blue headscarf, and kohl-lined eyes of the same violet amethyst, a gold nose ring. Flowing layered robes in sand and sky blue, gold bangles, a falconer's glove with a small hooded falcon that is mostly light. Serene, wry, the team's diplomat.`,
    about: `The caravans' healer and navigator, and the only one of the four who reads. Speaks for the team at the Society hall, very patiently, several times a day.`,
    stories: [
      `I read the stars for the caravans and the paperwork for the team. The stars are easier. They don't change the forms every week.`,
      `The falcon is mostly light. She hunts mostly wind. I'm mostly patient. Between the three of us we are almost one competent person.`,
      `Rhaza asks me what every sign in the city says. Most of them say "no". I tell her they say "welcome". It keeps her calmer.`,
    ],
    epitaph: `She read us the city when we couldn't. I don't know how to read it without her.`,
  }),
  P({
    id: 'mott', name: 'Old Mott', nature: 'draconian', sex: 'm', age: 71, rank: 'bronze', role: 'tank', team: 't_sands',
    weapons: `A walking stick`,
    essences: ['essTurtle', 'essDust', 'essGoat'],
    abilities: [
      A('Old Shell', 'ward', 'physical', '#a5d6a7', 'He hunches, and he has been hunched under worse storms than this.'),
      A('Head Down', 'strike', 'physical', '#bcaaa4', 'He lowers his horns and walks through it.'),
      A('Dust Cough', 'nova', 'nature', '#d7ccc8', 'An old man\'s cough, and a cloud of choking dust with it.'),
      A('Stubborn', 'heal', 'nature', '#c8e6c9', 'He refuses to fall over. He has been refusing for seventy years.'),
    ],
    look: `Draconian man, seventies, stooped and immensely solid, and even stooped still taller than a human. Faded sand-grey scales, curling goat-like horns worn smooth, white whiskery eyebrows, kindly gold eyes. Patched desert robes over a scaled leather jerkin, a walking stick he fights with, a tin cup on a string. Slow, mild, utterly immovable.`,
    about: `Has walked the Salt Gate road forty times and never been in a building with a second floor. Climbs the Society's stairs very slowly, holding the wall, and refuses all help.`,
    stories: [
      `Forty times across the Salt Gate road. Sandstorm, wyrm, thirst, bandits. Never once a staircase. I have now climbed one. I am not impressed.`,
      `Young ones run. I walk. I have walked past more running young ones than I can count. Most of them were running away from the thing I was walking towards.`,
      `They sell water in barrels here. Water! To strangers! I told the man what we do to such men in the sand. He gave me the barrel. I gave it to the children. Everyone is happy except him.`,
    ],
    epitaph: `Seventy years he wouldn't fall over. I didn't think anything could make him.`,
  }),
];

export const ADV_BY_ID = Object.fromEntries(ADVENTURERS.map(a => [a.id, a]));
export const EARLY_ADVENTURERS = ADVENTURERS.filter(a => a.early);

// ---------------------------------------------------------------------------
// MODELS. `art` is the key a real model will load under (the user is making
// them); `stand` is the shared NPC model used until then, chosen by sex and
// role so a person always wears the same one.
// ---------------------------------------------------------------------------
const STAND_POOLS = {
  f: {
    caster: ['npc_mage_v2', 'npc_sleek_woman', 'npc_confident_woman'],
    healer: ['npc_priest_f_healing', 'npc_priest_f', 'npc_confident_woman'],
    support: ['npc_sleek_woman', 'npc_hiker_f', 'npc_priest_f'],
    default: ['npc_female_adventurer', 'npc_female_adventurer_v1', 'npc_female_adventurer_v2', 'npc_sporty_woman', 'npc_hiker_f'],
  },
  m: {
    caster: ['npc_mage', 'npc_mage_v1', 'npc_mage_v3', 'npc_mage_v4'],
    healer: ['npc_priest_m_healing', 'npc_priest_m', 'npc_priest_old_healing'],
    support: ['npc_patterned_man', 'npc_hiker_m', 'npc_mage_v1'],
    tank: ['npc_shield_adventurer', 'npc_plate', 'npc_plate_v1', 'npc_plate_v2', 'npc_muscular_adventurer'],
    default: ['npc_grizzled_adventurer', 'npc_bearded_adventurer', 'npc_muscular_adventurer_v1', 'npc_grizzled_adventurer_v1', 'npc_muscular_adventurer_v2', 'npc_grizzled_adventurer_v2', 'npc_hiker_m'],
  },
};
export function advArtKey(a) { return `adv_${a.id}`; }
// ROUND 363 -- "Leonid and Draconians should be taller than their human counterparts and modeled on 80 x 80 pixel as
// opposed to the 64x64 of normal human sprites."
export const ADV_TALL_NATURES = ['leonid', 'draconian'];
export function advSpriteSize(a) { return ADV_TALL_NATURES.includes(a && a.nature) ? 80 : 64; }
/** How a real `adv_<id>` sheet is cut: its cell and the foot point (bottom centre). */
export function advArtFrame(a) {
  const c = advSpriteSize(a);
  return { cell: c, footX: c / 2, footY: c - 1, scale: 1 };
}
export function advStandModels(a) {
  const pools = STAND_POOLS[a.sex === 'f' ? 'f' : 'm'];
  const pool = pools[a.role] || pools.default;
  let h = 0;
  for (const ch of a.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const first = pool[h % pool.length];
  return [first, ...pool.filter(k => k !== first), ...pools.default.filter(k => !pool.includes(k))];
}

// ---------------------------------------------------------------------------
// WHO WORKS WHERE. Story regions: 1 = the Nek, 2 = Ontaria, 3 = Elehyd.
// ---------------------------------------------------------------------------
/** The act at which the early six who form teams have formed them. */
export const ADV_FORM_ACT = 3;
/** Teams are out in the regions of this act and later, and in every surge region while the surge runs. */
export const ADV_TEAM_ACT = 3;

/** The team a person is in, or null. */
export function advTeamOf(id) {
  return ADV_TEAMS.find(t => t.members.includes(id)) || null;
}

// ---------------------------------------------------------------------------
// TEAM NAMES. "related to the teams plans essences or origin ... Typically 2
// words": STORMSCAR, STORMSHREDDER, FIREBLITZ, EAGLECRY, CADENCE GUARD, NEK
// LEGION, OCEAN BURST. Three shapes, drawn per run (the run seed), never
// repeated across the eight:
//   origin + noun      Cadence Guard, Nek Legion
//   essence + noun     Ocean Burst, Dawn Company
//   essence+suffix     Stormscar, Fireblitz, Eaglecry   (one word, compounded)
// ---------------------------------------------------------------------------
export const FAMILY_WORDS = {
  fire: ['Fire', 'Ember', 'Blaze', 'Cinder'], storm: ['Storm', 'Thunder', 'Spark'], air: ['Gale', 'Sky', 'Storm'],
  water: ['Ocean', 'Tide', 'Wave'], aquatic: ['Ocean', 'Tide', 'Reef'], cold: ['Frost', 'Rime', 'Winter'],
  earth: ['Stone', 'Dust', 'Iron'], light: ['Dawn', 'Sun', 'Bright'], dark: ['Dusk', 'Shade', 'Night'],
  blade: ['Blade', 'Edge', 'Steel'], flyer: ['Eagle', 'Hawk', 'Wing'], beast: ['Wolf', 'Bear', 'Fang'],
  smallbeast: ['Fox', 'Hare'], guard: ['Iron', 'Shield', 'Bulwark'], life: ['Thorn', 'Green', 'Bloom'],
  space: ['Star', 'Void', 'Far'], mind: ['Rune', 'Omen', 'Sage'], death: ['Bone', 'Grave'], blood: ['Blood', 'Red'],
  ranged: ['Arrow', 'Shot'], polearm: ['Spear', 'Lance'], bludgeon: ['Hammer', 'Maul'], force: ['Iron', 'Oath', 'Might'],
  order: ['Hymn', 'Choir'], motion: ['Swift', 'Wild'], serpent: ['Viper', 'Fang'], craft: ['Gear', 'Thread'],
  identity: ['Mirror'], alchemy: ['Quicksilver'],
};
const FEEL_NOUNS = {
  disciplined: ['Guard', 'Legion', 'Watch', 'Company', 'Vanguard', 'Wardens', 'Line', 'Oath'],
  chaotic: ['Burst', 'Riot', 'Rush', 'Breakers', 'Howl', 'Racket', 'Blitz'],
  new: ['Hopefuls', 'Lanterns', 'Sparks', 'Fledglings', 'Company', 'Kindling'],
};
const FEEL_SUFFIX = {
  disciplined: ['guard', 'scar', 'ward', 'hold'],
  chaotic: ['blitz', 'shredder', 'burst', 'cry', 'break', 'fang'],
  new: [],   // a new team names itself plainly: two words
};
/** A team's own plan word, offered alongside the feel's nouns (a scholar team is Seekers before it is a Guard). */
const PLAN_NOUNS = { guard: ['Guard', 'Watch'], blitz: ['Blitz', 'Burst'], spark: ['Sparks', 'Hopefuls'], scar: ['Scar', 'Oath'],
  contract: ['Company', 'Contract'], dawn: ['Dawn', 'Choir'], seek: ['Seekers', 'Survey'], sand: ['Caravan', 'Wind'] };

/** The essence family words a team's members carry, most common first. */
export function teamFamilyWords(team, catalog) {
  const n = {};
  for (const id of team.members) {
    const a = ADV_BY_ID[id];
    for (const e of (a ? a.essences : [])) {
      const f = catalog && catalog[e] && catalog[e].family;
      if (f && FAMILY_WORDS[f]) n[f] = (n[f] || 0) + 1;
    }
  }
  return Object.keys(n).sort((x, y) => n[y] - n[x]).flatMap(f => FAMILY_WORDS[f]);
}

/** Origin words: the settlement or region name, its first word. */
export function originWord(team, regions) {
  for (const r of (regions || [])) {
    if (r.id === team.origin) return r.name.replace(/^The /, '').split(/\s+/)[0];
    const s = (r.settlements || []).find(x => x.id === team.origin);
    if (s) return s.name.split(/\s+/)[0];
  }
  return null;
}

/** One team's name. `taken` (a Set) keeps the eight apart. */
export function teamNameFor(team, seed, catalog, regions, taken = new Set()) {
  const rng = advRng(`${seed}|team|${team.id}`);
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const fam = teamFamilyWords(team, catalog);
  const origin = originWord(team, regions);
  const nouns = [...(PLAN_NOUNS[team.plan] || []), ...FEEL_NOUNS[team.feel]];
  const sufx = FEEL_SUFFIX[team.feel];
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  for (let tries = 0; tries < 40; tries++) {
    const r = rng();
    let name;
    if (origin && r < (team.feel === 'disciplined' ? 0.45 : 0.25)) name = `${origin} ${pick(nouns)}`;
    else if (fam.length && r < 0.7) name = `${pick(fam.slice(0, 4))} ${pick(nouns)}`;
    else if (fam.length && sufx.length) name = cap(`${pick(fam.slice(0, 4))}${pick(sufx)}`);
    else if (fam.length) name = `${pick(fam.slice(0, 4))} ${pick(nouns)}`;
    else name = `${origin || 'Free'} ${pick(nouns)}`;
    if (!taken.has(name)) { taken.add(name); return name; }
  }
  const fallback = `${team.id.replace(/^t_/, '').replace(/^./, c => c.toUpperCase())} Company`;
  taken.add(fallback);
  return fallback;
}

// ---------------------------------------------------------------------------
// STANCE. A unit (a lone adventurer, or a team) keeps `bond` and `rivalry`
// with the player. Each is raised by what the player does:
//   bond     a friendly word; saving one of them in a fight; winning a race graciously
//   rivalry  needling them; stealing a kill they were winning; beating them in a race
// ---------------------------------------------------------------------------
export const ADV_REL_STEP = 1;
export const ADV_STANCE_AT = 3;
export function stanceOf(rel) {
  const b = (rel && rel.bond) || 0, r = (rel && rel.rivalry) || 0;
  if (r >= ADV_STANCE_AT && r > b) return 'rival';
  if (b >= ADV_STANCE_AT && b >= r) return 'friend';
  return 'neutral';
}

/** How many of a board's contracts a unit has claimed by the given day of the week (a rival claims more). */
export function boardClaims(stance, dayOfWeek) {
  const base = stance === 'rival' ? 2 : 1;
  return Math.min(6, base * (dayOfWeek + 1));
}

// ---------------------------------------------------------------------------
// THE RACE. A rival will race the player: first to `need` kills, before the
// time runs out, for a purse. Their pace is simulated (they are off killing
// things of their own); the player's is counted.
// ---------------------------------------------------------------------------
export const ADV_RACE = { need: 8, seconds: 300, perMinute: [1.1, 1.9], purseByRank: { normal: 40, iron: 120, bronze: 300, silver: 600, gold: 1000 } };

// ---------------------------------------------------------------------------
// LOSS. "These other teams should randomly lose members ... If you run into
// them afterward they will be more somber and may tell you what went wrong."
// The chance is per team per game day (a day is ten minutes). Chaotic teams
// lose people about three times as often as disciplined ones; the surge
// triples everyone's. A team is never taken below two.
// ---------------------------------------------------------------------------
export const ADV_LOSS = {
  perDay: { disciplined: 0.010, chaotic: 0.030, new: 0.024 },
  surgeMult: 3,
  minTeam: 2,
  mournDays: 5,
};
export function lossChance(feel, surging) {
  return (ADV_LOSS.perDay[feel] || 0.02) * (surging ? ADV_LOSS.surgeMult : 1);
}

/** What happened, by where: three per act region, and the surge. `{who}` is the one they lost. */
export const LOSS_CAUSES = {
  elehyd: [
    `We were crossing the high pass above Coldharrow when the snow went out from under {who}. There'd been a wyrm sleeping under the drift. We dug for an hour.`,
    `A nest contract near Gravemarch. Bigger than the posting said, older too. {who} held the tunnel so the rest of us could get out. The tunnel held. That's something.`,
    `Ice trolls in the Karsk foothills. We'd fought them before. We'd never fought them in fog. {who} was right beside me and then {who} wasn't.`,
  ],
  cinder: [
    `The ground in the Cinderwaste is a crust over fire in places. {who} found one. It was very quick. I keep telling myself it was very quick.`,
    `A salamander pack at Kiln Halt, three times the size of the posting. {who} drew them off us. We went back the next day. There wasn't much to bring home.`,
    `Ash came down so thick we lost the road. Something was waiting in it that had learned we'd lose the road. {who} was walking point.`,
  ],
  bratugal: [
    `The marsh in Bratugal moves. The path we'd walked in on wasn't there coming out. {who} found the deep water first.`,
    `A cult in the old Stiltrow church. We were told it was a few frightened people. It was not a few. It was not frightened. {who} went in first.`,
    `Something in the reeds took {who} off the boardwalk without a sound. We never saw it. We heard it, after, for a long time.`,
  ],
  ixcuatl: [
    `The Stepped City has a floor that wasn't a floor. {who} read the glyph. The glyph was a lie. The builders lied about everything.`,
    `Something in the Cut that hunts by sound. {who} called out a warning. That was what it heard.`,
    `We were three days in the ruin when the doors closed behind us. We got out. Not all of us.`,
  ],
  surge: [
    `The surge came over the wall at the north gate all at once. {who} was on the wall. We held the gate. The wall didn't hold {who}.`,
    `We were evacuating a hamlet when the second wave hit. {who} stayed at the back with the last of the carts. All the carts got in.`,
    `Three days without sleep on the barricade. {who} fell asleep standing up, just for a moment. A moment was enough.`,
  ],
  any: [
    `A contract we'd done ten times before. That's the whole story. We'd done it ten times and the eleventh time {who} didn't come back.`,
    `Bandits, not monsters. People. {who} talked to them first, the way {who} always did. They didn't want to talk.`,
  ],
};

/** What they think went wrong, by the team's feel. */
export const LOSS_MISTAKE = {
  disciplined: [
    `We did everything right. That's what I can't forgive. We did everything right and it wasn't enough.`,
    `The plan was sound. I've read it back a dozen times. The plan was sound and the world didn't care.`,
    `We held the line a breath too long. Discipline is holding the line. Wisdom is knowing when to stop. We'll learn it. We've paid for it.`,
  ],
  chaotic: [
    `We didn't scout. We never scout. We'll scout now.`,
    `We went in loud, like always. Like always it worked, right up until it didn't.`,
    `Somebody said "it'll be fine". It's always somebody. It's always been fine. Until now.`,
  ],
  new: [
    `We didn't know what we were looking at. We know now. I wish we didn't.`,
    `The book said it would be smaller. Everything we thought we knew was out of a book.`,
    `We should have asked someone. Everyone always tells us to ask someone. We didn't want to look stupid.`,
  ],
};

const LOSS_OPEN = {
  disciplined: `I'll tell you, because you'd hear it from the Society anyway, and I'd rather it was said properly.`,
  chaotic: `You'll notice we're quieter. Yeah. Here's why.`,
  new: `Sorry. Sorry, it's — we lost someone. We lost someone and we don't really know how to say it yet.`,
};
const LOSS_CLOSE = {
  disciplined: `We go on. That's the job. Mind yourself out there.`,
  chaotic: `Anyway. Be careful. Be more careful than us.`,
  new: `Please be careful. Please. That's all. Sorry.`,
};

/** The somber telling: pages of text. Picks the cause by the region it happened in. */
export function lossTelling(team, dead, speaker, regionId, surging, seed) {
  const rng = advRng(`${seed}|loss|${team.id}|${dead.id}`);
  const pool = surging ? LOSS_CAUSES.surge : (LOSS_CAUSES[regionId] || LOSS_CAUSES.any);
  const cause = pool[Math.floor(rng() * pool.length)].split('{who}').join(dead.name.split(' ')[0]);
  const mistake = LOSS_MISTAKE[team.feel][Math.floor(rng() * LOSS_MISTAKE[team.feel].length)];
  return {
    cause,
    pages: [LOSS_OPEN[team.feel], cause, mistake, dead.epitaph || `${dead.name.split(' ')[0]} was one of us.`, LOSS_CLOSE[team.feel]].filter(Boolean),
    speaker: speaker ? speaker.name : team.id,
  };
}

/** Somber barks while a team mourns. */
export const MOURNING_BARKS = [
  `...`, `Not today. Sorry.`, `We're heading in. Long day.`, `Keep safe out there.`, `We're fine. We're fine.`,
];

// ---------------------------------------------------------------------------
// BARKS. What they call out in passing (the full stories are on E).
// ---------------------------------------------------------------------------
export const FIGHT_BARKS = {
  disciplined: ['On me!', 'Hold the line!', 'Left flank!', 'Steady!', 'Call it out!'],
  chaotic: ['Ha! Get it!', 'Mine!', 'Watch this!', 'Bigger! Send a bigger one!', 'Who\'s counting?'],
  new: ['Is that one dangerous?', 'Okay okay okay!', 'I think it\'s working!', 'Wim, what page?!', 'Together, together!'],
  solo: ['Come on, then.', 'Mine.', 'Out of the way.'],
};
export const SURGE_BARKS = ['They\'re coming over the north road!', 'Get the carts in!', 'Hold here! Hold!', 'Society! To the wall!', 'Another wave!'];
export const STEAL_BARKS = ['Oi! That one was mine!', 'I had that!', 'Really? Really.', 'Fine. Have it.'];
export const SAVED_BARKS = ['Thanks. I owe you.', 'That was close. Thank you.', 'You didn\'t have to do that.', 'Good timing!'];

// ---------------------------------------------------------------------------
// SELF-CHECK.
// ---------------------------------------------------------------------------
export function adventurerFaults(catalog = null, regions = null) {
  const f = [];
  if (ADVENTURERS.length !== 38) f.push(`${ADVENTURERS.length} adventurers, not 38`);
  const ids = new Set();
  for (const a of ADVENTURERS) {
    if (ids.has(a.id)) f.push(`${a.id} twice`);
    ids.add(a.id);
    if (!['human', 'elf', 'runic', 'draconian', 'celestine', 'leonid'].includes(a.nature)) f.push(`${a.id}: nature ${a.nature}`);
    if (!a.look || !a.about || (a.stories || []).length < 3) f.push(`${a.id}: look, about or three stories missing`);
    if ((a.essences || []).length !== 3) f.push(`${a.id}: ${a.essences.length} essences`);
    if (catalog) for (const e of a.essences) if (!catalog[e]) f.push(`${a.id}: no essence ${e}`);
    if ((a.abilities || []).length < 3) f.push(`${a.id}: fewer than three abilities`);
    for (const ab of a.abilities) if (!['strike', 'bolt', 'nova', 'heal', 'ward'].includes(ab.kind)) f.push(`${a.id}: ${ab.name} is ${ab.kind}`);
    const team = advTeamOf(a.id);
    if (!team && !(a.early && a.early.joins === null)) f.push(`${a.id} has no team and is not one of the lone two`);
    if (team && !a.epitaph) f.push(`${a.id} has no epitaph`);
    if (a.early && a.early.joins && (!team || team.id !== a.early.joins)) f.push(`${a.id} joins ${a.early.joins} but is in ${team && team.id}`);
  }
  const inTeams = ADV_TEAMS.flatMap(t => t.members);
  if (new Set(inTeams).size !== inTeams.length) f.push('someone is in two teams');
  for (const t of ADV_TEAMS) {
    if (t.members.length < 3 || t.members.length > 6) f.push(`${t.id} has ${t.members.length}`);
    if (!['disciplined', 'chaotic', 'new'].includes(t.feel)) f.push(`${t.id} feel ${t.feel}`);
    if (!t.members.includes(t.lead)) f.push(`${t.id}'s lead is not in it`);
    if ((t.stories || []).length < 3 || !t.greet) f.push(`${t.id}: stories or greetings missing`);
  }
  const early = EARLY_ADVENTURERS;
  if (early.length !== 6 || early.filter(a => a.early.home === 'nek').length !== 3) f.push('the early six are not three and three');
  if (early.filter(a => a.early.joins).length < 2 || early.filter(a => !a.early.joins).length < 1) f.push('"some (not all)" of the early ones form teams');
  if (regions) {
    const sett = new Set(regions.flatMap(r => (r.settlements || []).map(s => s.id)));
    for (const a of early) for (const h of a.early.haunts) if (!sett.has(h)) f.push(`${a.id} haunts ${h}, which is not a settlement`);
  }
  const nat = {};
  for (const a of ADVENTURERS) nat[a.nature] = (nat[a.nature] || 0) + 1;
  if ((nat.human || 0) + (nat.elf || 0) + (nat.celestine || 0) < 30) f.push('not mostly human, elf and celestine');
  return f;
}
