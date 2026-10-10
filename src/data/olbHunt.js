// ============================================================================
// ROUND 315 -- OLB NIKOBE'S HUNT, THE APERTURE, AND WHAT IS BELOW IT.
//
// THE USER (the part this file builds, kept in ROUND315_NOTES.md):
//
//   "4.1.5) Finally it ends with simple monster hunt together where you stumble
//    across an aperature to an astrap space.
//    4.1.6) On entering the astral space the player and mentor explore, kill a
//    few monsters and they go deeper only to run into a meeting of a cult of
//    destruction and some shady researchers.
//    4.1.7) Watching from the cover of some boxes and supplies the player and
//    mentor realize something bad is going on.
//    4.1.8) The player is sensed and then attacked"
//
// THE SHAPE. A hunt is a ladder of STEPS, kept on `player.olb.hunt.step`:
//
//   nest      Olb at your shoulder; three packs east of the walls to clear.
//   aperture  the nest is down and a seam in the air stands where it was.
//   astral    through it, into a hand-built cavern: two caverns of monsters,
//             then a passage down to the hall.
//   watch     the meeting, heard from behind the supply stacks.
//   fight     they know you are there.
//   (round 316 takes it from here: the god, the aura, the portal, the end.)
//
// THE ROOM is a small hand-drawn place, not a generated realm: this is a
// story, and a story needs the rooms to be where the story says they are. It
// lives in the astral band beside the soul space, and is built the way the
// soul space is -- a grid, stamped on first entry, walked with ordinary
// movement and ordinary collision.
//
// WHO IS DOWN THERE. The cult is the Ashen Mouth's: the god of Destruction
// who, in darkGods.js, asks for things to be broken open. The researchers wear
// the grey coats of the Division of Essence Research, which the player met in
// the lab and which has never once been honest about what it is for.
// ============================================================================

// ---------------------------------------------------------------------------
// THE ROOM
// ---------------------------------------------------------------------------
export const OLB_ROOM_ID = 'olb_astral';
export const OLB_ROOM_W = 76;
export const OLB_ROOM_H = 60;

/** Where the room sits in the astral band: column 3 of the realms' layout
 *  (0-2 are the realms, and the soul space has the spare slot beside them). */
export const OLB_ROOM_COL = 3;

let _cache = null;

/**
 * The room: a grid of 0 (void) and 1 (floor), and the places the story needs.
 * Built from a few ellipses and thick paths so the walls read as cave rather
 * than as rectangles; the wobble is a fixed function, so it is the same room
 * on every machine.
 */
export function olbAstralMap() {
  if (_cache) return _cache;
  const W = OLB_ROOM_W, H = OLB_ROOM_H;
  const grid = new Uint8Array(W * H);
  const set = (x, y) => { if (x >= 1 && y >= 1 && x < W - 1 && y < H - 1) grid[y * W + x] = 1; };
  const ell = (cx, cy, rx, ry, seed) => {
    for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) {
      for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
        const a = Math.atan2(y - cy, x - cx);
        const wob = 1 + 0.10 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 5 + seed * 2.1);
        if (Math.hypot((x - cx) / (rx * wob), (y - cy) / (ry * wob)) <= 1) set(x, y);
      }
    }
  };
  const path = (pts, r) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        for (let yy = Math.floor(y - r); yy <= y + r; yy++) {
          for (let xx = Math.floor(x - r); xx <= x + r; xx++) {
            if (Math.hypot(xx - x, yy - y) <= r) set(xx, yy);
          }
        }
      }
    }
  };
  ell(11, 11, 8, 7, 0.5);                       // A: where you arrive
  path([[16, 12], [26, 10], [34, 12]], 3);
  ell(40, 14, 9, 7, 1.7);                       // B: the first cavern
  path([[46, 17], [56, 24], [60, 30]], 3);
  ell(60, 34, 9, 7, 2.9);                       // C: the second cavern
  path([[56, 39], [48, 44], [44, 46]], 3);
  ell(30, 49, 20, 8, 4.1);                      // H: the hall

  const floor = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y * W + x] === 1;
  // the nearest floor tile to a wish, so a typo in a coordinate is a nudge
  // and not a body in the rock
  const near = (x, y) => {
    if (floor(x, y)) return { x, y };
    for (let r = 1; r < 12; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && floor(x + dx, y + dy)) return { x: x + dx, y: y + dy };
      }
    }
    return { x, y };
  };
  const at = (list) => list.map(([x, y, ...rest]) => ({ ...near(x, y), rest }));

  const marks = {
    entry: near(11, 11),
    exit: near(7, 10),
    // first cavern, second cavern: [x, y, count]
    zone1: [[40, 13, 3], [44, 16, 2]].map(([x, y, n]) => ({ ...near(x, y), n })),
    zone2: [[58, 32, 3], [63, 37, 3]].map(([x, y, n]) => ({ ...near(x, y), n })),
    // the passage down: crossing it starts the meeting
    overlook: near(47, 44),
    hidePlayer: near(44, 48),
    hideOlb: near(45, 46),
    // supply stacks along the east end of the hall: [prop key, x, y]
    crates: [
      ['crateProduce', 43, 45], ['barrelStack', 45, 49], ['sacks', 42, 50],
      ['armourPile', 46, 47], ['handcart', 41, 47], ['crateProduce', 44, 51],
    ].map(([key, x, y]) => ({ key, ...near(x, y) })),
    // the Division's frame, west end of the hall
    aperture: near(12, 49),
    // the circle: the Mouth's people
    hierophant: near(27, 49),
    cult: at([[30, 46], [31, 52], [25, 46], [24, 52]]).map(c => ({ x: c.x, y: c.y })),
    // the Division
    senior: near(17, 49),
    junior: near(16, 52),
    // where, in round 316, the god stands
    godSpot: near(24, 49),
  };
  _cache = { w: W, h: H, grid, marks };
  return _cache;
}

// ---------------------------------------------------------------------------
// THE NEST
// ---------------------------------------------------------------------------
export const OLB_NEST = {
  // tiles east of the wall's east face, and how clear the ground must be
  minOut: 38, maxOut: 90, clearRadius: 7,
  // three packs standing round the site: [dx, dy, count] in tiles
  packs: [[-3, -2, 3], [4, 1, 3], [-1, 4, 2]],
  tier: 0,
  families: ['boar', 'wolf', 'spider', 'slime'],
};

/** Monsters in each cavern: families and tier. */
export const OLB_ASTRAL_MOBS = { tier: 0, families: ['spiritSerpent', 'spider', 'slime'] };

// ---------------------------------------------------------------------------
// THE COMPANION
// ---------------------------------------------------------------------------
export const OLB_BODY = {
  art: 'npc_grizzled_adventurer_v1',
  speed: 232,           // a hair above the player's, so he keeps up
  followDist: 54,
  catchUp: 520,         // farther than this and he is simply beside you
  engage: 250,          // how far from the player he will go for a monster
  reach: 46,
  dmg: 17,              // per swing; he is a Silver who is holding back
  gap: 0.95,            // seconds between swings
};

// ---------------------------------------------------------------------------
// THE CAST OF THE HALL
// ---------------------------------------------------------------------------
export const OLB_CULT = {
  slug: 'ash',                        // borrows the Cinder Choir's robes
  name: 'The Ashen Mouth',
  hierophant: 'Vharn, Voice of the Mouth',
  cry: 'Bring me the warm ones.',
  members: ['Mouth-sworn', 'Mouth-sworn', 'Ash-bearer', 'Ash-bearer'],
};
export const OLB_STAFF = {
  senior: { char: 'researcherSenior', name: 'Senior Researcher Ione Tarrow' },
  junior: { char: 'researcherF', name: 'Research Assistant' },
};

// ---------------------------------------------------------------------------
// WHAT IS SAID
// ---------------------------------------------------------------------------
/** The hunt is offered (he is asked, after the lessons). */
export const OLB_HUNT_OFFER = [
  `That is everything I can teach you in a hall. The rest is learned out there, with something trying to kill you, which is the only teacher that has never been wrong.`,
  `There is a nest east of the walls the Society wants thinned. Three packs, nothing a careful Iron cannot manage, and I will be at your shoulder. I do not step in unless you are about to be buried. I will tell you when you have been stupid, and I will tell you afterwards.`,
  `Bring what you can. Food, a draught or two. Are you ready?`,
];
export const OLB_HUNT_NOT_YET = `Then rest, and bank what you have. I will be here.`;
export const OLB_HUNT_GO = `Good. East gate, then keep the sun on your face. I will be a pace behind you.`;

/** A line each time he is spoken to while he walks with you. */
export const OLB_COMPANION_TALK = {
  nest: [
    `East of the walls, and the ground gets worse as you go. Packs first, then whatever is minding them.`,
    `Keep moving. And you took the left pack first, which was right, so do it again.`,
  ],
  aperture: [`That is not a den. Go and look at it, with me.`],
  astral: [`Quiet. Everything sounds like it is under water in here. Stay at my shoulder.`],
  fight: [`Not now!`],
};

export const OLB_APERTURE_PAGES = [
  `Stop. Do not go near it yet.`,
  `That is not a den. Do you feel the air? It has gone thin, the way it does at the top of a stair in a very old house. Put your hand out. That cold is not weather.`,
  `That is an aperture. A seam in the world, and on the far side of it is the astral: the place the mind goes when it meditates, the place your essences live when they are not being used. There are a few in every region. They are meant to be found by an Aura-Adept with a day to spare and a reason, not by a pair of fools following a wolf.`,
  `So. The Society wants every one of these looked at, and nobody ever has the time. We have the time. We will look, we will stay close, and we will leave if I say so, and when I say so you will not ask why.`,
];
export const OLB_APERTURE_ENTER = [
  `Quiet now. Nothing here is where it should be, and nothing makes the sound it should. Do not touch anything that glows, and do not eat anything that looks as if it would be nice.`,
];
export const OLB_BARKS = {
  start: `Stay at my shoulder.`,
  zone1: `Deeper. Slowly.`,
  zone2: `Hear that? Voices. Keep low.`,
  nestDown: `That is the last of them.`,
  lost: `You went down. Never mind. I have the apertures marked. Try again.`,
};

/** The meeting. Each page: who says it, what they say, and the beat it is. */
export const OLB_WATCH_PAGES = [
  { who: 'Olb Nikobe', text: `Down. Behind the crates. Do not stand up, and for the love of the Mother, do not speak.` },
  { who: null, text: `Past the stacks the passage opens into a hall. A ring of people in ash-coloured robes stands round a black iron frame twice the height of a man. The frame is open, and what is inside it is not a room.\n\nAt the frame, two others in grey coats with a Division stamp on the sleeve.` },
  { who: 'Vharn, Voice of the Mouth', text: `Four months, Researcher. Four months of pay, and the door is the width of a hand. My Master is patient. He is not infinitely patient.` },
  { who: 'Senior Researcher Ione Tarrow', text: `The astral is thin on this seam, not absent. Pull it wider and it will not open, it will tear. A tear does not make a doorway for your god. It makes a hole under the city above it, and the city goes in.` },
  { who: 'Vharn, Voice of the Mouth', text: `And what is a city to the Mouth? He asked for a breaking, and you promised me one.` },
  { who: 'Senior Researcher Ione Tarrow', text: `I promised the Division a controlled breach. Readings. What your master does with a door afterwards is not in my report, and the Director has been very clear that it will not be.` },
  { who: 'Olb Nikobe', text: `The Division. And the Ashen Mouth. Those two should never share a room, and here they are sharing a floor plan.\n\nThat seam opens above the nest. And above the nest, on the other side of the wall, is Cadence. All of it.` },
  { who: 'Olb Nikobe', text: `We go back. Quietly. We tell the Society, we tell the desk, we tell anybody who will listen. On three, and you walk, you do not run — ` },
  { who: 'Vharn, Voice of the Mouth', text: `...Stop. Be quiet, all of you.\n\nDo you smell that? Under the ash. Something warm.` },
  { who: 'Senior Researcher Ione Tarrow', text: `There is an aura at the stacks. Two. One of them is Society-trained — it is being held in like somebody who was taught to.` },
  { who: 'Vharn, Voice of the Mouth', text: `Bring me the warm ones.` },
  { who: 'Olb Nikobe', text: `Up! Up, weapons out! Take the left, I have the right, and do not let them split us!` },
];
export const OLB_FIGHT_LINES = {
  staff: `The Division pair back through the frame and are gone.`,
  held: `Hold them! We are not leaving!`,
  quiet: `They are not all dead. They are not all dead, and it is going quiet in a way I do not like.`,
};

// ---------------------------------------------------------------------------
// ROUND 316 -- THE GOD, THE DOOR, THE LAST WORDS, THE SCAR (4.1.9 - 4.1.12)
// ---------------------------------------------------------------------------
/** The fight turns when this many of the Mouth are down (the Voice counts). */
export const OLB_GOD_TRIGGER = 3;

/** How long each beat of the finale lasts, in seconds of game time. */
export const OLB_CUT_TIMES = {
  appear: 3.0, slam: 11, breakFx: 3.2, portal: 2.6, cross: 0.9, burnBuild: 3.2,
  runBeat: 1.6, blast: 2.4, black: 3.4, wake: 2.8,
};

/** 4.1.9 -- the god appears, and slams its aura down. Olb has been holding
 *  the whole hall off; he cannot hold a god off as well. */
export const OLB_GOD_PAGES = [
  { who: 'Olb Nikobe', text: `Back! All of you back! I have this line and I am not giving up one step of it!` },
  { who: null, text: `Over the black iron frame the air goes the colour of a coal that has just been blown on. Something steps through that is not tall and is not large and is, all the same, the only thing in the room.\n\nIt wears a man's shape because it was made to be looked at. The Ashen Mouth does not look at anyone.` },
  { who: 'Vharn, Voice of the Mouth', text: `He comes. He comes! Master, they are here, they are warm, they are yours to break!` },
  { who: 'Olb Nikobe', text: `...Ah. Oh, you stupid, stupid old man. Stay behind me. Whatever happens, stay behind me.` },
];

/** Barks while the aura is on you. */
export const OLB_SLAM_BARKS = {
  player: `I can't move. I can't...`,
  olb1: `Hold. Hold on to something. Anything.`,
  olb2: `Not... today. Not here.`,
  olb3: `Mine. This one is MINE.`,
};

/** 4.1.9 -- he breaks free and blasts his aura out. */
export const OLB_BREAK_PAGES = [
  { who: null, text: `The red comes in from the edges of the world, and then the black behind it. It takes the ceiling, the stacks, the sound. It takes your breath. It is like being unmade slowly, so that you can watch.\n\nThen a light the colour of a struck bell comes out of Olb Nikobe all at once, and the dark breaks like a plate.` },
  { who: null, text: `He is on his knees, and then he is not. The Mouth's hand is out, and everything in the hall is pressing on the one old man who is pressing back. Between his fingers a spirit coin burns down to nothing: diamond rank. He spent a fortune to hold a god off for the length of a breath, and he is only just holding.` },
  { who: 'Olb Nikobe', text: `Up. UP! I cannot hold it open for long, and I will not hold it open twice!` },
];

/** 4.1.9 -- he runs to you, opens a portal, and you both go through. */
export const OLB_PORTAL_BARKS = {
  open: `Through! Now!`,
};

/** 4.1.10 -- on the other side. The words are the user's. */
export const OLB_BURN_PAGES = [
  { who: null, text: `The portal shuts behind you with a sound like a door in a house a long way off. Olb Nikobe is on his feet. There is a light in him that is not his: it shows through his sleeves, through the seams of his coat, through the lines of his face. He is burning from the inside.` },
  { who: 'Olb Nikobe', text: `Don't go it alone, outworlder. Find yourself some friends you can trust.` },
  { who: null, text: `His eyes widen. For a moment the light in them is not fire and not fear, only a man hearing a clock he has been listening for all his life.` },
  { who: 'Olb Nikobe', text: `I can't hold it any longer. Destruction's curse is inevitable...\n\nRUN.` },
];
export const OLB_RUN_BARK = `RUN!`;

/** 4.1.11 -- waking up. */
export const OLB_WAKE_PAGES = [
  `There is a ceiling. There are voices at the edge of it, and none of them is his.\n\nThe Society's healers say you were found in the road outside the walls, a long way from where the explosion was, with the hair burned off one forearm and a stranger's blood on your coat. They say three days. They say there is no sign of the hunter who went out with you.`,
  `Then you look in the water jug, and the thing that was done to you is there.`,
];
export const OLB_FRIENDS_LINE = `Olb's last words: find some friends you can trust`;

// ---------------------------------------------------------------------------
// FAULTS: every page complete, the room connected, every mark on floor
// ---------------------------------------------------------------------------
export function olbHuntFaults() {
  const out = [];
  const m = olbAstralMap();
  const at = (p) => m.grid[p.y * m.w + p.x] === 1;
  for (const k of ['entry', 'exit', 'overlook', 'hidePlayer', 'hideOlb', 'aperture', 'hierophant', 'senior', 'junior', 'godSpot']) {
    if (!m.marks[k] || !at(m.marks[k])) out.push(`mark ${k} is not on floor`);
  }
  for (const z of [...m.marks.zone1, ...m.marks.zone2, ...m.marks.cult, ...m.marks.crates]) {
    if (!at(z)) out.push(`a mark at ${z.x},${z.y} is not on floor`);
  }
  // one connected piece: flood from the entry, reach every mark
  const seen = new Uint8Array(m.w * m.h);
  const q = [m.marks.entry.y * m.w + m.marks.entry.x];
  seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(); const x = i % m.w, y = (i / m.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * m.w + nx;
      if (nx >= 0 && ny >= 0 && nx < m.w && ny < m.h && m.grid[j] === 1 && !seen[j]) { seen[j] = 1; q.push(j); }
    }
  }
  const reach = (p) => seen[p.y * m.w + p.x] === 1;
  for (const k of ['exit', 'overlook', 'hidePlayer', 'hideOlb', 'aperture', 'hierophant', 'senior', 'godSpot']) {
    if (!reach(m.marks[k])) out.push(`mark ${k} cannot be reached from the entry`);
  }
  for (const z of [...m.marks.zone1, ...m.marks.zone2]) if (!reach(z)) out.push(`pack at ${z.x},${z.y} unreachable`);
  for (const p of OLB_WATCH_PAGES) {
    if (typeof p.text !== 'string' || p.text.length < 20) out.push('a watch page is too short');
  }
  if (m.marks.cult.length !== OLB_CULT.members.length) out.push('cult marks and members disagree');
  for (const [name, list] of [['god', OLB_GOD_PAGES], ['break', OLB_BREAK_PAGES], ['burn', OLB_BURN_PAGES]]) {
    for (const pg of list) if (typeof pg.text !== 'string' || pg.text.length < 20) out.push(`a ${name} page is too short`);
  }
  if (!(OLB_GOD_TRIGGER >= 1 && OLB_GOD_TRIGGER <= m.marks.cult.length + 1)) out.push('the god trigger is out of range');
  return out;
}
