// ===========================================================================
// ROUND 405 -- THE MAGIC SOCIETY'S SPECIALTY CHAINS, AND THE DIVISION.
//
// The user (asked at round 400/402, approved with corrections at 403):
//   "Magic Society: quests and training per specialty (the nine theories), pushes cooperation with the Division of
//    Essence Research, later its fiercest opponent; specialist training grows your specialty; per-specialty quest
//    chains at study sites outside the main regions (storms, volcanos, natural arrays, astral pockets, unique spawns,
//    ancient ritual sites) with advanced insights; officials help find where to search at each rank; 1-2 officials at
//    each site."
//   The soul chain, corrected: "the player won't be working for the division so replace with magic society official"
//   (the official wants the device), and "the order of the reaper definitely wouldn't have a soul-waystation as it's
//   antithetical to their beliefs to have the soul hang around. Maybe a cult of some sort, or related to undeath."
//
// ONE CHAIN PER THEORY, ONE STEP PER RANK (Iron, Bronze, Silver, Gold). A step is given by the hall's senior (the
// Archmage or the Magister), sends you to a study site out in the world map's squares (outside the main regions), where
// one or two Society officials are already camped; you STUDY the site (stand at it and read it), then its TRIAL comes
// (a creature drawn to the site, a surge in waves, or a vigil at the hour it wakes). Back at the hall the senior gives
// the step's ADVANCED INSIGHT: the theory's perks grow (SOCIETY_INSIGHT_STEP a step, see ritualTheory.js theoryPerkOf),
// and the Society's specialist training pays out.
//
// THE DIVISION runs under all nine, one beat a rank (DIVISION_BEATS): at Iron the Society insists on cooperation and a
// Division researcher works the site beside its officials; at Bronze the Division takes the readings and asks the wrong
// questions; at Silver the site shows the Division was there first and did harm; at Gold the Society opposes the Division
// openly, and what is loose at the site is the Division's own work.
// ===========================================================================

export const SOCIETY_CHAIN_RANKS = [1, 2, 3, 4];
export const SOCIETY_RANK_NAMES = { 1: 'Iron', 2: 'Bronze', 3: 'Silver', 4: 'Gold' };
/** How much one advanced insight adds to a theory's numeric perks (four ranks: +60%). */
export const SOCIETY_INSIGHT_STEP = 0.15;
/** The specialist training's purse: this many of the rank's own coin (iron at Iron, bronze at Bronze ...). */
export const SOCIETY_CHAIN_PAY = { 1: 25, 2: 20, 3: 15, 4: 10 };
/** Seconds of study at the site. */
export const SOCIETY_STUDY_S = { 1: 8, 2: 10, 3: 12, 4: 14 };

/** The Division, a beat a rank -- the same in every chain, said by the officials at the site and the senior at home. */
export const DIVISION_BEATS = {
  1: {
    who: 'Division Surveyor',
    official: 'The Division of Essence Research has a surveyor on this site with us. The Archmage wants the two halls working together -- share what you read.',
    division: 'Welcome. We pool our readings with the Society now; the Archmage and our Director agreed it. Two halls see further than one.',
  },
  2: {
    who: 'Division Researcher',
    official: 'The Division researcher asked for the raw readings again. All of them, before we have written them up. I gave them. I was told to give them.',
    division: 'Your readings are good. Where else have you seen this? Who else knows you came here? Purely for the record.',
  },
  3: {
    who: null,
    official: 'There was a Division camp here before ours. Look at the cuts in the ground, the requisition seals on the crates. They took something from this site, and they did it badly.',
    division: null,
  },
  4: {
    who: null,
    official: 'The Society has broken with the Division. The Archmage said it in the open hall: whatever they are making, we will stand against it. What is loose here is theirs.',
    division: null,
  },
};

/** What the site's trial makes of the Division at Gold: the champion is "Division-bred". */
export const DIVISION_BRED = 'Division-bred';

// Each rank: site (what it is, appended to the square's name), brief (the senior's words), study (what reading it is),
// trial { kind: 'champion' | 'rivals' | 'waves' | 'vigil', win?: 'dawn' | 'dusk' | 'night', foe: what comes }, insight
// (what the senior says you learned), lesson (the perk it grows, in a line).
export const SOCIETY_CHAINS = {
  astral: {
    1: { site: 'a thin place where an astral aperture opened last spring',
      brief: 'An aperture opened out there and closed again on its own. Apertures do not do that. Go and read the scar, and tell me what came through.',
      study: 'Read the aperture scar', trial: { kind: 'champion', foe: 'something the scar let through' },
      insight: 'A closing aperture pulls on whatever came through it. Your summons are held to you the same way: you can hold them harder.' },
    2: { site: 'an astral pocket that has opened over a hillside',
      brief: 'A pocket of astral space has opened and stayed open. Things are coming out of it in tides. The officials there need someone who can stand in front of a tide.',
      study: 'Map the pocket\'s edge', trial: { kind: 'waves', foe: 'the pocket\'s tide' },
      insight: 'A pocket breathes. Monsters in astral space carry more of it than they should, and you know now where to cut to find it.' },
    3: { site: 'the ruin of a summoning circle, its outworlder long gone',
      brief: 'Someone summoned an outworlder here and lost it. The Society wants to know who, and the circle wants to finish what it started.',
      study: 'Read the broken circle', trial: { kind: 'vigil', win: 'night', foe: 'what the circle calls at night' },
      insight: 'An outworlder is held by the shape of the call. You can shape yours tighter: your summons stand longer and hit harder.' },
    4: { site: 'an astral rift the Division has been feeding',
      brief: 'The rift is the Division\'s work. They have been feeding it to see what it gives back. Close it, and bring me what it was giving them.',
      study: 'Unpick the rift\'s anchors', trial: { kind: 'champion', foe: 'what the Division drew through the rift' },
      insight: 'You know how an aperture is held open now, and how it is let go. Few in the Society know as much.' },
  },
  natural: {
    1: { site: 'a natural array of standing stones and a spring',
      brief: 'There is an array out there no one laid: stones, roots and a spring in a pattern too good for chance. Stand in it. Tell me what it pulls on.',
      study: 'Stand in the array and read its pull', trial: { kind: 'vigil', win: 'dawn', foe: 'the array\'s waking at dawn' },
      insight: 'An array pulls on what is out of place in it. You can stand in one without being pulled -- and feel where the stones are gathering.' },
    2: { site: 'a valley where awakening stones and essences gather',
      brief: 'Stones and essences drift to some places and not others. We think arrays decide where. The valley is one. Monsters gather where they gather.',
      study: 'Trace the valley\'s lines', trial: { kind: 'waves', foe: 'the monsters the stones draw in' },
      insight: 'The lines that carry stones are the lines of the land itself. You can read them further now.' },
    3: { site: 'a river array, the water laid out in rings',
      brief: 'A river has turned itself into an array. Rings, eddies, the banks cut too clean. The Division had a camp on it. It does not now.',
      study: 'Read the rings of the water', trial: { kind: 'rivals', foe: 'two the river array has bent' },
      insight: 'An array can be bent by whoever stands in it long enough. You can stand in one longer than most.' },
    4: { site: 'a mountain array the Division has cut into',
      brief: 'The Division has been cutting channels into a mountain array to drain it. Arrays do not drain. They break, and what they hold comes out.',
      study: 'Seal the Division\'s channels', trial: { kind: 'champion', foe: 'what the broken array let out' },
      insight: 'You can feel the world\'s own rituals across a whole region now, and they no longer pull on you.' },
  },
  elemental: {
    1: { site: 'an elemental confluence, hot on one side and frozen on the other',
      brief: 'Fire and frost are meeting in the open out there and neither is winning. Read it. Something will come to see who is reading.',
      study: 'Read where the elements meet', trial: { kind: 'champion', foe: 'an elemental drawn to the confluence' },
      insight: 'Where two elements meet, each gives way a little. You can give way the same way: the elements bite you less.' },
    2: { site: 'the mouth of a volcano, its vents still breathing',
      brief: 'The volcano is breathing out elementals. The officials are counting them. Somebody needs to thin them out while they count.',
      study: 'Read the vents', trial: { kind: 'waves', foe: 'the volcano\'s elementals' },
      insight: 'An elemental is a knot of its element. You know where the knot ties now, and what comes loose when you cut it.' },
    3: { site: 'a storm front that has stopped moving over a moor',
      brief: 'A storm has stood still over the moor for nine days. Lightning walks in it. The Division sent a team in before us; we found their camp, not them.',
      study: 'Read the storm\'s still eye', trial: { kind: 'vigil', win: 'night', foe: 'what the storm brings down at night' },
      insight: 'A storm that stands still is held. You know the holding now: fire, frost, lightning, earth, water and air all bite you less.' },
    4: { site: 'a forge-pit where the Division was making elementals',
      brief: 'The Division was building elementals out of living rock and fire. They left the pit lit when they ran. Put it out.',
      study: 'Break the forge\'s binding', trial: { kind: 'champion', foe: 'the Division\'s forged elemental' },
      insight: 'You have seen an elemental made, and unmade one. Elemental monsters give you more of themselves now.' },
  },
  divine: {
    1: { site: 'a forgotten shrine to a god no one names',
      brief: 'There is a shrine out there to a god with no name left. Something still listens there. Read the shrine -- carefully.',
      study: 'Read the shrine\'s offerings', trial: { kind: 'vigil', win: 'dusk', foe: 'what keeps the shrine at dusk' },
      insight: 'A god\'s attention is a weight. You can carry a little of it now without bending: divine pressure lessens on you.' },
    2: { site: 'a temple ground where two gods\' domains meet',
      brief: 'Two gods\' domains overlap out there and the ground cannot decide whose it is. The followers of one have already come to blows with the other.',
      study: 'Read the line between the domains', trial: { kind: 'waves', foe: 'the creatures the quarrel draws' },
      insight: 'A domain has an edge, and a god\'s gifts are stronger near the heart of it. Priests will pay you better now.' },
    3: { site: 'a desecrated altar, its god\'s mark cut out',
      brief: 'Someone cut a god\'s mark out of an altar with Division tools. The god noticed. The ground there is not safe to be a stranger on.',
      study: 'Read what was cut away', trial: { kind: 'champion', foe: 'the altar\'s wrathful keeper' },
      insight: 'You know how a god\'s favour is held, and how it is taken. Gods and their priests reward you more.' },
    4: { site: 'a false temple the Division raised',
      brief: 'The Division built a temple to nothing and filled it with followers to see whether a god would come. Something came. Close it.',
      study: 'Read the empty altar', trial: { kind: 'rivals', foe: 'two of the false temple\'s keepers' },
      insight: 'You have stood where a god was invented. Divine pressure has little left to press you with.' },
  },
  portal: {
    1: { site: 'a broken waygate, two standing stones and a memory of a door',
      brief: 'A waygate out there opened by itself for a moment last month. Waygates do not do that unless something on the other side knocks.',
      study: 'Read the waygate\'s stones', trial: { kind: 'champion', foe: 'what knocked from the other side' },
      insight: 'A door has two sides and both must agree. Your own doors open further now.' },
    2: { site: 'a chain of portals that open and close in turn',
      brief: 'Three portals out there open one after another, like breathing. Things come through on each breath. Hold the place while the officials time them.',
      study: 'Time the portals\' breathing', trial: { kind: 'waves', foe: 'what comes through on each breath' },
      insight: 'A portal can be shut from this side, if you hold the thing trying to step through. You can stop a foe\'s blink more often.' },
    3: { site: 'a waygate the Division broke on purpose',
      brief: 'The Division broke a waygate and left the halves open. Things slip between the halves. The officials need you there at night, when it is worst.',
      study: 'Read the broken halves', trial: { kind: 'vigil', win: 'night', foe: 'what slips between the halves at night' },
      insight: 'A broken door still remembers being a door. Your teleports go through blocks more often now.' },
    4: { site: 'a portal anchor the Division set in the wild',
      brief: 'The Division set an anchor out there to open portals from anywhere to anywhere. If they finish it, no hall is safe. Pull it out.',
      study: 'Pull the anchor\'s threads', trial: { kind: 'champion', foe: 'the anchor\'s Division-made guardian' },
      insight: 'You know how a door is nailed to the world, and how it is pulled out. Few portals will hold against you.' },
  },
  soul: {
    // The user's corrected soul chain: an aura contest; essence adoption at a surge; a cult's soul trap (undeath, NOT the
    // Order of the Reaper); thin astral space and a great astral being's attention.
    1: { site: 'an old aura-contest circle, worn into the ground',
      brief: 'Adventurers used to settle quarrels out there by aura alone -- whoever gave ground lost. One of our officials will press you. Hold.',
      study: 'Hold your aura against the official\'s', trial: { kind: 'champion', foe: 'what the contest wakes in the ground' },
      insight: 'Your soul holds when it is pressed. It will hold better now: soul damage finds less of you.' },
    2: { site: 'a monster-surge ground where essences and stones gather',
      brief: 'There is a surge ground out there where monsters and essences gather at once. We want to watch an essence adopt a soul -- a monster\'s, ideally, not yours.',
      study: 'Watch an essence take to a soul', trial: { kind: 'waves', foe: 'the surge' },
      insight: 'An essence does not join a soul; it is adopted, and the soul changes to hold it. You can press on a soul in conversation now.' },
    3: { site: 'a barrow where an undeath cult keeps a soul trap',
      brief: 'A cult of undeath has built a trap out there that keeps souls from moving on. The Order of the Reaper would burn it. I want it -- the device, whole, for the Society. Break the cult\'s hold on it and bring me the device.',
      study: 'Unbind the trapped souls from the device', trial: { kind: 'rivals', foe: 'two of the cult\'s risen wardens' },
      insight: 'You have felt a soul that cannot move on. Creatures of the soul take more harm from you now -- and the Society has the device.' },
    4: { site: 'a place where astral space presses thin',
      brief: 'Astral space is thin out there. Something very large is on the other side of it, paying attention. Stand under that attention and learn what a spirit domain is.',
      study: 'Endure the great astral being\'s attention', trial: { kind: 'vigil', win: 'night', foe: 'what rides the attention down at night' },
      insight: 'A spirit domain is a soul made into a place. You have stood at the edge of one. Your soul is harder to press than most Gold.' },
  },
  fauna: {
    1: { site: 'a marked lair, the claw-marks in a pattern',
      brief: 'Something out there marks its lair in patterns. Animals do not write. Read the marks and meet whatever made them.',
      study: 'Read the claw-marks', trial: { kind: 'champion', foe: 'the lair\'s maker' },
      insight: 'A magical beast is still a beast: it reads you before it hunts. You can be read less clearly now.' },
    2: { site: 'a migration ground where magical beasts cross',
      brief: 'Once a year the magical beasts cross that ground in their hundreds. This year something is driving them. Hold the officials\' camp while they watch.',
      study: 'Count the crossing', trial: { kind: 'waves', foe: 'the driven herd' },
      insight: 'A beast carries its magic where its body works hardest. You know where to look: beasts give you more.' },
    3: { site: 'a breeding ground the Division has been culling',
      brief: 'The Division has been taking young beasts from a breeding ground. The parents are still there, and they do not tell one human from another.',
      study: 'Read what was taken', trial: { kind: 'rivals', foe: 'two parents who lost their young' },
      insight: 'You know what a beast will do for its young. Beasts notice you later now, and give you more.' },
    4: { site: 'a pen where the Division bred a beast into a monster',
      brief: 'The Division took a magical beast and bred it until it was a monster. It is out. Put it down.',
      study: 'Read the pen\'s records', trial: { kind: 'champion', foe: 'the Division-bred beast' },
      insight: 'You have seen where a beast ends and a monster begins. Beasts hardly see you coming.' },
  },
  weather: {
    1: { site: 'a storm altar on high ground, scorched in rings',
      brief: 'Someone called lightning to that altar on purpose. Read the rings and see whether the sky still answers.',
      study: 'Read the scorched rings', trial: { kind: 'vigil', win: 'dusk', foe: 'what the sky sends at dusk' },
      insight: 'The weather is listening. You can listen back: its penalties soften on you and its favours sharpen.' },
    2: { site: 'a valley where it has not stopped raining for a month',
      brief: 'It has rained in that valley for a month. Not on the hills around it -- only the valley. Things have come to live in the rain.',
      study: 'Read where the rain begins', trial: { kind: 'waves', foe: 'what lives in the rain' },
      insight: 'Weather is a ritual that forgot it was one. You are more in tune with it now.' },
    3: { site: 'the eye of a storm that has stood still for nine days',
      brief: 'There is a storm out there that will not move. The Division tried to call it. I want to know whether it can be called by anyone.',
      study: 'Stand in the eye and listen', trial: { kind: 'champion', foe: 'the storm\'s heart' },
      insight: 'The weather of a region can be called, if you know how it listens. You know now.' },
    4: { site: 'a weather engine the Division built on a peak',
      brief: 'The Division has built an engine to call the weather over a whole region. Crops are failing. Break it.',
      study: 'Unbind the engine\'s calls', trial: { kind: 'rivals', foe: 'two Division-called storm-things' },
      insight: 'You have broken a thing that called the weather. The weather leans your way now more than anyone\'s.' },
  },
  interference: {
    1: { site: 'three ritual circles cut over one another',
      brief: 'Three circles were cut over each other out there, each spoiling the last. Read them -- in order. The order is the lesson.',
      study: 'Read the circles in order', trial: { kind: 'champion', foe: 'what the spoiled rite let out' },
      insight: 'A ritual can be spoiled by another laid over it. Yours come round faster now.' },
    2: { site: 'a ritual ground where a rite went wrong mid-casting',
      brief: 'A rite went wrong out there halfway through. It is still running, badly. The officials want it read before it finishes.',
      study: 'Read the half-cast rite', trial: { kind: 'waves', foe: 'what the half-cast rite keeps summoning' },
      insight: 'A rite can be held open to be reinforced. You can make yours last twice as long now.' },
    3: { site: 'an ancient ritual site the Division tampered with',
      brief: 'There is a ritual site out there older than the Society. The Division laid their own rite over it. The two are fighting.',
      study: 'Unpick the Division\'s layer', trial: { kind: 'vigil', win: 'night', foe: 'what the fighting rites call at night' },
      insight: 'Two rites can stand at once if they are laid so they do not touch. You can lay two now.' },
    4: { site: 'the Division\'s great working, half-laid in the wild',
      brief: 'The Division is laying a ritual across a whole square of the wild. I do not know what it does. I know I do not want it finished. Spoil it.',
      study: 'Lay a spoiling rite across theirs', trial: { kind: 'champion', foe: 'the working\'s Division-made warden' },
      insight: 'You have spoiled the greatest rite the Division ever laid. Your own rites are stronger for it.' },
  },
};

/** The perk lines an insight grows, by theory (said on the reward). */
export const SOCIETY_INSIGHT_GROWS = {
  astral: 'summon power and astral loot', natural: 'array resistance', elemental: 'elemental resistance and loot',
  divine: 'divine rewards and resistance', portal: 'teleports and teleport blocking', soul: 'soul resistance and soul damage',
  fauna: 'beast loot and stealth among beasts', weather: 'weather attunement', interference: 'ritual cooldowns and strength',
};

/** The two parts of a rank's step, as step objects the lesson engine runs (martialMasterMixin `_lessonTick`/`_lessonEvent`):
 *  part 0 the study (kind 'visit', shape 'study': stand at the site), part 1 the trial. `d` is the site's destination
 *  ({ area, areaLabel, place, sheet, sx, sy, square }); `champ(i)` picks a champion { key, name }. Pure. */
export function societyChainPart(theory, rk, part, d, champ) {
  const S = SOCIETY_CHAINS[theory] && SOCIETY_CHAINS[theory][rk];
  if (!S || !d) return null;
  const place = `${S.site}, in ${d.areaLabel}`;
  const dest = { ...d, place };
  if (part === 0) return { kind: 'visit', shape: 'study', need: SOCIETY_STUDY_S[rk], have: 0, dest, place, soc: true, label: `${S.study} at ${place}` };
  const T = S.trial;
  if (T.kind === 'vigil') {
    const when = T.win === 'dawn' ? 'at dawn' : T.win === 'dusk' ? 'at dusk' : 'through the night';
    return { kind: 'visit', shape: 'vigil', need: 12, have: 0, win: T.win || 'night', dest, place, soc: true, label: `Keep watch at the site ${when} (${T.foe})` };
  }
  const c1 = champ(0), c2 = champ(1);
  const bred = rk >= 4 ? `${DIVISION_BRED} ` : '';
  if (!c1) return { kind: 'count', ev: 'kill', shape: 'kill', need: 6 + rk * 2, have: 0, area: d.area, areaLabel: d.areaLabel, dest, soc: true, label: `Defeat ${6 + rk * 2} monsters at the site` };
  if (T.kind === 'waves') {
    const waves = 2 + Math.min(2, Math.floor(rk / 2));
    return { kind: 'waves', shape: 'waves', need: waves, have: 0, dest, place, waveKey: c1.key, uids: [], soc: true, label: `Hold the site against ${T.foe} (${waves} waves)` };
  }
  const champs = [{ key: c1.key, name: `${bred}${c1.name}`, uid: null, done: false }];
  if (T.kind === 'rivals' && c2) champs.push({ key: c2.key, name: `${bred}${c2.name === c1.name ? `${c2.name} the Elder` : c2.name}`, uid: null, done: false });
  return { kind: 'champion', shape: T.kind === 'rivals' ? 'rivals' : 'champion', need: champs.length, have: 0, dest, place, champs, soc: true,
    label: champs.length > 1 ? `Defeat ${T.foe}: ${champs[0].name} and ${champs[1].name}` : `Defeat ${T.foe}: ${champs[0].name}` };
}

/** Which monster families a theory's trials draw from (empty: any at the tier). */
export const SOCIETY_TRIAL_FAMILIES = {
  elemental: 'elemental', soul: 'soul', fauna: 'beast',
};

export function societyChainFaults() {
  const out = [];
  const keys = ['astral', 'natural', 'elemental', 'divine', 'portal', 'soul', 'fauna', 'weather', 'interference'];
  for (const k of keys) {
    const C = SOCIETY_CHAINS[k];
    if (!C) { out.push(`no chain for ${k}`); continue; }
    for (const rk of SOCIETY_CHAIN_RANKS) {
      const S = C[rk];
      if (!S) { out.push(`${k} has no ${SOCIETY_RANK_NAMES[rk]} step`); continue; }
      for (const f of ['site', 'brief', 'study', 'insight']) if (!S[f] || S[f].length < 12) out.push(`${k} ${rk}: ${f} missing`);
      if (!S.trial || !['champion', 'rivals', 'waves', 'vigil'].includes(S.trial.kind) || !S.trial.foe) out.push(`${k} ${rk}: trial`);
    }
    // no two ranks of one chain set the same trial shape twice in a row
    for (let rk = 2; rk <= 4; rk++) if (C[rk] && C[rk - 1] && C[rk].trial.kind === C[rk - 1].trial.kind) out.push(`${k}: ${rk - 1} and ${rk} share a trial shape`);
  }
  // the soul chain is the user's: no Order of the Reaper waystation, a Society official wants the device, an undeath cult
  const soul = JSON.stringify(SOCIETY_CHAINS.soul || {});
  if (!/undeath/i.test(soul) || !/I want it -- the device/.test(soul) || /waystation/i.test(soul) || /soul ?well/i.test(soul)) out.push('the soul chain is not the corrected one');
  for (const rk of SOCIETY_CHAIN_RANKS) if (!DIVISION_BEATS[rk] || !DIVISION_BEATS[rk].official) out.push(`no Division beat at ${rk}`);
  return out;
}
