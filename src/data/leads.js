// ===========================================================================
// ROUND 190 (update 18) -- SIDE WORK THAT PULLS TOWARD THE MAIN STORY.
//
//   "About 30% of the quests on the adventurer society board should be
//    breadcrumbs for the main quest.
//    18.1 Individuals who are asking for help finding their missing family
//         members, where you find the body in the woods with mysterious
//         markings carved into their skin
//    18.2 Requests to kill a monster and you find a researcher's diary of the
//         experimentation they were performing
//    18.3 the Department actually has you come in and complete some tests
//         using your abilities to see if you would be a good research subject
//    18.4 the point is that the side content needs to more closely pull you
//         to the main quest."
//
// Three shapes, each riding an existing board kind so the board, the map pin,
// the tracker and the turn-in need nothing new: a MISSING person is a survey
// of a site (what is found there is the body), a DIARY is a hunt (what is
// found on the kill is the notebook), and the DEPARTMENT's tests are a visit
// that finishes when you have used three different abilities in front of
// them. Everything here is text and deterministic picks; WorldScene does the
// placing.
// ===========================================================================

export const LEAD_SHARE = 0.3;
export const LEAD_KINDS = ['missing', 'diary', 'department'];
/** Distinct abilities the Department wants to see, and how long you have. */
export const DEPARTMENT_TEST_ABILITIES = 3;
export const DEPARTMENT_TEST_SECONDS = 120;

const h32 = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const pick = (list, seed) => list[h32(seed) % list.length];

const ASKERS = ['Marta Venn', 'Oskar Hale', 'Ilse Farrow', 'Tomas Reed', 'Hanne Bly', 'Pell Orrin',
  'Greta Moss', 'Aldo Crane', 'Wenna Lusk', 'Corin Thale', 'Bettany Sloe', 'Rudd Maple'];
const RELATIONS = ['son', 'daughter', 'brother', 'sister', 'husband', 'wife', 'father', 'mother'];
const MISSING_NAMES = ['Jory', 'Ansel', 'Mira', 'Dace', 'Linnet', 'Fen', 'Orla', 'Pim', 'Sella', 'Wick'];

/** Is this board row a lead? Three in ten, by the row's own id. */
export function isLeadRow(uid) {
  return (h32(`lead|${uid}`) % 1000) / 1000 < LEAD_SHARE;
}
export function leadKindFor(uid) {
  return pick(LEAD_KINDS, `leadkind|${uid}`);
}

/** 18.1 -- the notice, and what is at the end of it. */
export function missingLead(uid, siteLabel, regionName) {
  const asker = pick(ASKERS, `asker|${uid}`);
  const rel = pick(RELATIONS, `rel|${uid}`);
  const who = pick(MISSING_NAMES, `who|${uid}`);
  const days = 2 + (h32(`days|${uid}`) % 6);
  return {
    lead: 'missing', leadAsker: asker, leadWho: who,
    title: `${asker}'s ${rel.charAt(0).toUpperCase() + rel.slice(1)} Has Not Come Home`,
    desc: `${asker} is asking anyone who will listen: their ${rel} ${who} went out toward ${siteLabel} in `
      + `${regionName} ${days} days ago and has not come back. Go and look.`,
    found: [
      `${who} is at ${siteLabel}. Face down in the bracken, a few days dead.`,
      'Something has been cut into the skin of both forearms -- neat, deliberate lines, a pattern like a',
      'diagram of channels. Not an animal. Not a robbery: the purse is still on the belt.',
      `Someone wanted ${who} for something, and wrote on them while they did it.`,
    ],
    clue: `${who}, missing from near ${siteLabel}, was found dead with channel-diagrams carved into the skin.`,
  };
}

/** 18.2 -- the kill, and the notebook on it. */
export function diaryLead(uid, monsterLabel, regionName) {
  const n = 4 + (h32(`entry|${uid}`) % 30);
  return {
    lead: 'diary',
    title: `The ${monsterLabel} That Came Out of the Old Camp`,
    desc: `Kill the named ${monsterLabel} in ${regionName}. Woodcutters say it came out of an abandoned camp, `
      + 'and that it is wrong somehow -- too fast, and marked. Taking the notice puts it on the map.',
    found: [
      'In what is left of its last meal: a waxed notebook, a researcher\'s field diary.',
      `Entry ${n}: "Subject accepted the second infusion. Channel pattern holding. Aggression up. `
        + 'The Department will want the figures before the next shipment."',
      'The last pages are torn out. The cover is stamped with a seal you have seen on a building in Cadence.',
    ],
    clue: `A researcher's diary on a ${monsterLabel} describes "infusions" into marked subjects, for the Department.`,
  };
}

/** 18.3 -- the Department's tests. */
export function departmentLead(uid) {
  return {
    lead: 'department',
    title: 'The Department Is Looking for Volunteers',
    desc: 'The Department of Essence Development is paying adventurers to demonstrate their abilities under '
      + `observation. Go to the Department in Cadence and use ${DEPARTMENT_TEST_ABILITIES} different abilities `
      + 'where their researchers can see.',
    brief: `A researcher with a slate: "Anything you like. ${DEPARTMENT_TEST_ABILITIES} different abilities, please, `
      + 'where I can see them. Take your time. We are very interested in how you are put together."',
    found: [
      'The researcher writes for a long time after you stop.',
      '"Excellent channel density. You would make a very good subject. We may be in touch."',
      'On the slate, upside down, a sketch of your forearm with lines drawn across it.',
    ],
    clue: 'The Department tested your abilities and called you "a very good subject". Their notes drew lines on your arm.',
  };
}
