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
// ROUND 359 -- "Make the astral space bigger ... the route about 3x longer and a little wider, with rocks and oddly
// coloured grass patches." The room grows from 76x60 to 150x120; the route runs through four caverns and three cult
// clearings instead of two caverns, and every passage is a tile wider (radius 4, was 3).
export const OLB_ROOM_W = 150;
export const OLB_ROOM_H = 120;

/** Where the room sits in the astral band: column 3 of the realms' layout
 *  (0-2 are the realms, and the soul space has the spare slot beside them). */
export const OLB_ROOM_COL = 3;

let _cache = null;

/** A small fixed-seed generator, so the dressing is the same room on every machine. */
function _rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** The odd colours the astral grass grows in. */
export const OLB_GRASS_TINTS = [0xd05cff, 0x3ff0d8, 0xff5fa8, 0x8aff5c, 0x5c8cff, 0xffb84d];

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
  // The route, in order. Every cavern and clearing is where something happens.
  ell(12, 12, 9, 8, 0.5);                          // A: where you arrive
  path([[18, 13], [32, 10], [46, 14]], 4);
  ell(56, 16, 11, 8, 1.7);                         // B: the first cavern (monsters)
  path([[64, 20], [72, 30], [76, 40]], 4);
  ell(78, 45, 8, 6, 2.3);                          // P1: the first of the Mouth
  path([[84, 46], [96, 46], [106, 40]], 4);
  ell(116, 38, 11, 8, 2.9);                        // C: the second cavern (monsters)
  path([[122, 46], [128, 58], [126, 68]], 4);
  ell(124, 75, 9, 7, 3.4);                         // P2: the second of the Mouth
  path([[116, 80], [104, 86], [94, 88]], 4);
  ell(86, 88, 11, 8, 3.8);                         // D: the third cavern (monsters)
  path([[76, 92], [66, 96], [60, 98]], 4);
  ell(58, 99, 7, 6, 4.4);                          // P3: the Voice's hand
  path([[52, 101], [46, 103]], 3);                 // the passage down
  ell(28, 104, 18, 9, 4.1);                        // H: the hall

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
    entry: near(12, 12),
    exit: near(7, 10),
    // the caverns' packs: [x, y, count]
    zone1: [[54, 15, 3], [60, 18, 3]].map(([x, y, n]) => ({ ...near(x, y), n })),
    zone2: [[114, 36, 3], [120, 41, 3]].map(([x, y, n]) => ({ ...near(x, y), n })),
    zone3: [[84, 86, 3], [90, 91, 2]].map(([x, y, n]) => ({ ...near(x, y), n })),
    // ROUND 359 (3.2) -- the three cult packs along the way: a speaker and the ones with them
    packs: [
      { leader: near(80, 45), members: at([[76, 43], [77, 48]]).map(c => ({ x: c.x, y: c.y })) },
      { leader: near(125, 74), members: at([[121, 72], [127, 78], [122, 77]]).map(c => ({ x: c.x, y: c.y })) },
      { leader: near(59, 99), members: at([[56, 97], [60, 102]]).map(c => ({ x: c.x, y: c.y })) },
    ],
    // the passage down: crossing it starts the meeting
    overlook: near(47, 103),
    hidePlayer: near(40, 105),
    hideOlb: near(40, 102),
    // supply stacks between the hiding place and the circle: [prop key, x, y]
    crates: [
      ['crateProduce', 37, 102], ['barrelStack', 37, 105], ['sacks', 36, 107],
      ['armourPile', 38, 100], ['handcart', 39, 108], ['crateProduce', 41, 99],
    ].map(([key, x, y]) => ({ key, ...near(x, y) })),
    // the Division's frame, west end of the hall
    aperture: near(19, 104),
    // the circle: the Mouth's people
    hierophant: near(28, 104),
    cult: at([[30, 101], [30, 107], [26, 101], [26, 107]]).map(c => ({ x: c.x, y: c.y })),
    // the Division
    senior: near(22, 101),
    junior: near(22, 107),
    // ROUND 359 (3.3) -- where the god stands: at the frame, in plain view of the stacks
    godSpot: near(23, 104),
  };
  // ---- the dressing (3.1): rocks against the walls, odd grass in the open --------------------------------------
  const keep = [marks.entry, marks.exit, marks.overlook, marks.hidePlayer, marks.hideOlb, marks.aperture, marks.hierophant,
    marks.senior, marks.junior, marks.godSpot, ...marks.cult, ...marks.crates, ...marks.zone1, ...marks.zone2, ...marks.zone3,
    ...marks.packs.flatMap(p => [p.leader, ...p.members])];
  const clearOf = (x, y, r) => keep.every(k => Math.hypot(k.x - x, k.y - y) > r);
  const edge = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !floor(x + dx, y + dy));
  const rnd = _rng(359);
  const rocks = [], grass = [];
  for (let y = 2; y < H - 2; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (!floor(x, y)) continue;
      const r = rnd();
      // a rock stands a tile in from the wall, so the passage keeps its width
      const nearWall = !edge(x, y) && [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => !floor(x + dx, y + dy));
      if (nearWall && r < 0.17 && clearOf(x, y, 3.5) && x > 2 && !(x < 47 && y > 94)) rocks.push({ x, y, big: rnd() < 0.3 });
      else if (r > 0.955 && clearOf(x, y, 1.5)) grass.push({ x, y, tint: Math.floor(rnd() * OLB_GRASS_TINTS.length), n: 3 + Math.floor(rnd() * 5) });
    }
  }
  _cache = { w: W, h: H, grid, marks, rocks, grass };
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
  art: 'npc_olb_nikobe',
  speed: 232,           // a hair above the player's, so she keeps up
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
/** The hunt is offered (she is asked, after the lessons). */
export const OLB_HUNT_OFFER = [
  `That is everything I can teach you in a hall. The rest is learned out there, with something trying to kill you, which is the only teacher that has never been wrong.`,
  `There is a nest east of the walls the Society wants thinned. Three packs, nothing a careful Iron cannot manage, and I will be at your shoulder. I do not step in unless you are about to be buried. I will tell you when you have been stupid, and I will tell you afterwards.`,
  `Bring what you can. Food, a draught or two. Are you ready?`,
];
export const OLB_HUNT_NOT_YET = `Then rest, and bank what you have. I will be here.`;

// ROUND 389 -- "Olb shouldn't offer the last stage of the quest until you have all 4 of your essences absorbed." The
// four are the game's own count: the three essence slots (`player.slotEssence`) and the confluence the three make
// (`player.confluence`). Until all four are in, she does not offer the hunt, and says plainly what is missing; the
// quest log says the same. A hunt already under way is not touched (the gate stands only in front of the offer).
export const OLB_HUNT_ESSENCES_NEEDED = 4;
const NUM_WORD = ['no', 'one', 'two', 'three', 'four'];
/** How far the player is: { held (0-4), essences (0-3), confluence, ready }. */
export function olbHuntEssenceGap(slotEssence, confluence) {
  const essences = Math.min(3, (slotEssence || []).filter(Boolean).length);
  const conf = !!confluence;
  const held = essences + (conf ? 1 : 0);
  return { held, essences, confluence: conf, ready: held >= OLB_HUNT_ESSENCES_NEEDED };
}
/** What she says when you ask for the hunt before all four are in, in her voice. */
export function olbHuntNeedLine(gap) {
  const g = gap || olbHuntEssenceGap([], null);
  const lead = `Not yet. Come back when you have taken all your essences. You will need every one of them out there, and I will not walk you east of the walls with half a soul's worth of tools.`;
  let what;
  if (g.essences === 0) what = `You have not taken an essence at all. Three essences, and the confluence the three of them make: that is four, and I want all four in you.`;
  else if (g.essences < 3) {
    const left = 3 - g.essences;
    what = `You have taken ${NUM_WORD[g.essences]} of your three essences. ${left === 1 ? 'One more' : `${NUM_WORD[left].charAt(0).toUpperCase()}${NUM_WORD[left].slice(1)} more`}, and then the confluence the three of them make.`;
  } else what = `Your three essences are in you, but they have not made their confluence yet. That is the fourth, and I want it.`;
  return `${lead}\n\n${what}`;
}
/** The quest log's line while she waits on them. */
export function olbHuntNeedLog(gap) {
  const g = gap || olbHuntEssenceGap([], null);
  return `Absorb all four essences before the hunt: ${g.held} of 4 (three essences and their confluence)`;
}
export const OLB_HUNT_GO = `Good. East gate, then keep the sun on your face. I will be a pace behind you.`;

/** A line each time she is spoken to while she walks with you. */
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
  // ROUND 388 -- "The description of the astral space is very wrong." Canon: an astral space is a pocket dimension out in
  // the astral -- the gap between worlds and beyond them, where astral beings live -- formed on its own or built by
  // something powerful, joined to the world by an aperture, and usually dangerous. Nothing to do with essences or meditation.
  `That is an aperture. A door, and on the other side is an astral space: a pocket of somewhere else, hanging out in the astral, the nothing between worlds. Some of them form on their own. Some were built, by things strong enough to make a room outside the world and keep it, and those are the bad ones. Whatever is on the far side, it was not made for people like us. Places like that are for a Gold team with a ritualist and a plan, not for a pair of fools following a wolf.`,
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
  // ROUND 359 (3.3) -- "put Destruction and the cultists in view while the player and Olb hide behind the boxes."
  { who: null, text: `And beside the frame, something that is not a person stands very still and lets them talk.\n\nIt wears a man's shape because it was made to be looked at. The air around it is the colour of a coal that has just been blown on. Nobody in the ring looks straight at it, and nobody turns their back on it either.` },
  { who: 'Olb Nikobe', text: `...Mother of mercy. That is not a priest in a mask. That is the Mouth itself, or as much of it as that frame lets through.\n\nDo not look at it. Look at the floor. A god notices being looked at.` },
  { who: 'Vharn, Voice of the Mouth', text: `Four months, Researcher. Four months of pay, and the door is the width of a hand. My Master is patient. He is not infinitely patient.` },
  { who: 'Senior Researcher Ione Tarrow', text: `This space is barely holding its shape as it is. Force the aperture wider and it will not open, it will tear. A tear does not make a doorway for your god. It makes a hole under the city above it, and the city goes in.` },
  { who: 'Vharn, Voice of the Mouth', text: `And what is a city to the Mouth? He asked for a breaking, and you promised me one.` },
  { who: 'Senior Researcher Ione Tarrow', text: `I promised the Division a controlled breach. Readings. What your master does with a door afterwards is not in my report, and the Director has been very clear that it will not be.` },
  { who: 'Olb Nikobe', text: `The Division. And the Ashen Mouth. Those two should never share a room, and here they are sharing a floor plan.\n\nThat seam opens above the nest. And above the nest, on the other side of the wall, is Cadence. All of it.` },
  { who: 'Olb Nikobe', text: `I said we would see it with our own eyes and then decide. I have seen it. This is not a thing two people fix.\n\nWe go back. Quietly. We tell the Society, we tell the desk, we tell anybody who will listen. On three, and you walk, you do not run — ` },
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
  // ROUND 359 -- the slam is longer (the god walks up to Olb and strikes her while you stand petrified, 3.4) and the blast
  // is longer, so the explosion sheets (item 5) are seen before the white and the black take the screen.
  appear: 3.0, slam: 14, breakFx: 3.2, portal: 2.6, cross: 0.9, burnBuild: 3.2,
  runBeat: 1.6, blast: 3.8, black: 3.4, wake: 2.8,
};

/** 4.1.9 -- the god appears, and slams its aura down. Olb has been holding
 *  the whole hall off; she cannot hold a god off as well. */
export const OLB_GOD_PAGES = [
  { who: 'Olb Nikobe', text: `Back! All of you back! I have this line and I am not giving up one step of it!` },
  { who: null, text: `Beside the black iron frame, the thing that has stood still all this while turns its head.\n\nIt is not tall and it is not large and it is, all the same, the only thing in the room. The air around it goes the colour of a coal that has just been blown on, and it takes one step, and then another, toward the two of you.` },
  { who: 'Vharn, Voice of the Mouth', text: `He comes. He comes! Master, they are here, they are warm, they are yours to break!` },
  { who: 'Olb Nikobe', text: `...Ah. Oh, you stupid, stupid old woman. Stay behind me. Whatever happens, stay behind me.` },
];

/** Barks while the aura is on you. */
export const OLB_SLAM_BARKS = {
  player: `I can't move. I can't...`,
  // ROUND 359 (3.4) -- the god goes for her while you stand there petrified
  hit1: `Is that all? I have been hit harder by a door!`,
  hit2: `Stay... behind... me...`,
  hit3: `The shield's going. Hold on, outworlder. Hold on.`,
  olb1: `Hold. Hold on to something. Anything.`,
  olb2: `Not... today. Not here.`,
  olb3: `Mine. This one is MINE.`,
};

/** 4.1.9 -- she breaks free and blasts her aura out. */
export const OLB_BREAK_PAGES = [
  { who: null, text: `The red comes in from the edges of the world, and then the black behind it. It takes the ceiling, the stacks, the sound. It takes your breath. It is like being unmade slowly, so that you can watch.\n\nThen a light the colour of a struck bell comes out of Olb Nikobe all at once, and the dark breaks like a plate.` },
  { who: null, text: `She is on her knees, and then she is not. The Mouth's hand is out, and everything in the hall is pressing on the one old woman who is pressing back. Between her fingers a spirit coin burns down to nothing: diamond rank. She spent a fortune to hold a god off for the length of a breath, and she is only just holding.` },
  { who: 'Olb Nikobe', text: `Up. UP! I cannot hold it open for long, and I will not hold it open twice!` },
];

/** 4.1.9 -- she runs to you, opens a portal, and you both go through. */
export const OLB_PORTAL_BARKS = {
  open: `Through! Now!`,
};

/** 4.1.10 -- on the other side. The words are the user's. */
export const OLB_BURN_PAGES = [
  { who: null, text: `The portal shuts behind you with a sound like a door in a house a long way off. Olb Nikobe is on her feet. There is a light in her that is not hers: it shows through her sleeves, through the seams of her coat, through the lines of her face. She is burning from the inside.` },
  { who: 'Olb Nikobe', text: `Don't go it alone, outworlder. Find yourself some friends you can trust.` },
  { who: null, text: `Her eyes widen. For a moment the light in them is not fire and not fear, only a woman hearing a clock she has been listening for all her life.` },
  // ROUND 359 (7.1) -- "Just before he blows up he summons the shield around the player." (Olb is a woman, round 344.)
  { who: 'Olb Nikobe', text: `Hold still. One more shield. It is a good shield, I told you that. It lasts as long as my mana does...\n\nand I am giving it all of my mana.` },
  { who: 'Olb Nikobe', text: `I can't hold it any longer. Destruction's curse is inevitable...\n\nRUN.` },
];
export const OLB_RUN_BARK = `RUN!`;

/** 4.1.11 -- waking up. */
// ROUND 359 (6) -- you wake in the Society's infirmary, and the Healer's priest tells you how you got there.
export const OLB_WAKE_PAGES = [
  `There is a ceiling, whitewashed, and a smell of boiled linen and something green. A row of beds, evenly spaced, and you are in one of them. There are voices at the edge of the room, and none of them is hers.`,
  `Then you look in the water jug, and the thing that was done to you is there.`,
];
export const INFIRMARY_PRIEST = 'Brother Halden Vey';
export const INFIRMARY_PRIEST_TITLE = 'Brother Halden Vey, Priest of the Healer';
/** What the priest says when you wake. `{scar}` is the new scar's own sentence. */
export const INFIRMARY_WAKE_PAGES = [
  { who: null, text: OLB_WAKE_PAGES[0] },
  { who: INFIRMARY_PRIEST_TITLE, text: `Easy. Do not sit up yet. You are in the Society's infirmary, and you have been asleep for three days. Brother Halden; I serve the Healer, and the Society lets me keep these beds.` },
  { who: INFIRMARY_PRIEST_TITLE, text: `A farmer brought you in. Zeke Clark, who works the holdings past the east road. He found you in his barley, a long way from where the explosion was, with your hair singed and a stranger's blood on your coat, and he carried you to the gate himself. He would not take a coin for it. Remember the name.` },
  { who: INFIRMARY_PRIEST_TITLE, text: `There was no one with you. The Society has sent people to the place he found you. I am sorry. I know who went out with you, and I knew her a long time.` },
  { who: INFIRMARY_PRIEST_TITLE, text: `Now, the part you will not like. What happened to you down there did not only happen to your body. Something laid itself on your soul and pressed. You held, which almost nobody does. But a soul that has been pressed that hard does not come back the same shape.\n\nWe call it soul trauma. The cold in your hands, the feeling that the room is a little too large, the way sounds arrive late: that is the trauma, and it fades.` },
  { who: INFIRMARY_PRIEST_TITLE, text: `What does not fade is the scar. When something reaches the soul and fails to end it, it leaves a mark, and the mark comes through to the skin. Look in the water jug.\n\n{scar}` },
  { who: INFIRMARY_PRIEST_TITLE, text: `Here is the strange mercy of it. A soul that has been scarred is a soul that has been tested, and it comes back harder. You will feel it, if you look for it: a white light under the others, under your health and your mana. That is your soul's own strength.\n\nIt wears thin when you resist something that reaches for it, or when you press on someone else's. It comes back with rest. And every scar, every time it holds against something that should have broken it, it grows.` },
  { who: INFIRMARY_PRIEST_TITLE, text: `Rest a day. Eat something. Go and thank the farmer. And whatever you saw down there, take it to the desk. Some things should not be carried alone.` },
];
/** What he says after, when you talk to him. `{soul}` is the player's soul, `{scars}` the count. */
export const INFIRMARY_PRIEST_IDLE = [
  `Your soul is at {soul}. Rest brings it back; pressing on someone else's aura, or holding against something that reaches for yours, spends it. {scars}`,
  `The beds are for anyone the Society brings in. Nobody pays for a bed in here; the Healer does not keep accounts.`,
  `Soul trauma fades. Scars do not. Neither of them is a weakness, whatever the young ones in the hall tell each other.`,
];
export const INFIRMARY_PRIEST_DEFAULT = `The Healer's beds, and the Healer's priest. If you are hurt, sit down. If you are not, do not take a bed from somebody who is.`;
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


// ===========================================================================
// ROUND 359 -- THE LONGER ROAD THROUGH THE SEAM.
//
//   3.2 "a few cultist packs that explain the plan in parts and say why the player and Olb must die. Olb explains that
//        adventurers intervene regardless of risk."
//   7   "Olb shares insights about the player's essences and builds the relationship through dialogue on the journey and
//        in the astral space."
//   7.1 "Olb shields the player a few times, noting it's a good shield but only lasts as long as his mana."
// ===========================================================================
/** The three packs of the Mouth on the way down. Each speaks once, then fights. */
export const OLB_PACKS = [
  {
    speaker: 'Ash-bearer Kesse', members: ['Mouth-sworn', 'Mouth-sworn'], tier: 0, leaderTier: 1,
    pages: [
      { who: null, text: `Three figures in ash-coloured robes are crouched over a basin of something that smokes. One of them looks up, and does not seem surprised.` },
      { who: 'Ash-bearer Kesse', text: `Warm ones. In the Seam. The Voice said the nest would draw somebody eventually. He did not say it would be a Society pup and an old woman with a sword.` },
      { who: 'Ash-bearer Kesse', text: `You want to know what this place is? It is a door, being taught to open. Very slowly, so nobody up there notices the draught. You noticed. That is the problem.` },
      { who: 'Ash-bearer Kesse', text: `Nobody who has seen the Seam goes back up to talk about it. Not until the door is wide enough that talking does not matter. Nothing personal. It is only arithmetic.` },
      { who: 'Olb Nikobe', text: `Arithmetic. I have heard that word from a great many people who were about to be wrong about it. Behind me, outworlder.` },
    ],
    after: [
      { who: 'Olb Nikobe', text: `A door being taught to open. I do not like a single word of that sentence.` },
      { who: 'Olb Nikobe', text: `And I noticed you did not freeze. When she stood up you had your weapon out before I did. Keep that. Some people spend their whole lives learning to move first.` },
    ],
  },
  {
    speaker: 'Mouth-sworn Dovran', members: ['Mouth-sworn', 'Ash-bearer', 'Mouth-sworn'], tier: 0, leaderTier: 1,
    pages: [
      { who: null, text: `Further in, the walls are scratched with the same mark, over and over: a mouth, open. A man is sitting on a crate under it as if he were waiting for a coach.` },
      { who: 'Mouth-sworn Dovran', text: `You killed Kesse's circle. Good. That is three more poured into the frame. Did you think the dead just lie here? Everything that dies in the Seam is ash for the Mouth, and ash is what the frame drinks.` },
      { who: 'Mouth-sworn Dovran', text: `The grey coats measure it. We pour it. Every death down here widens the door a finger's breadth. You two are worth more than a season of beasts. A Society adept? The Voice will sing about you.` },
      { who: 'Mouth-sworn Dovran', text: `So you see, we do not even need to win. We only need you to die somewhere in here. And you will, because you came in through the only way out.` },
      { who: 'Olb Nikobe', text: `Then we had better not die. That is my whole plan, outworlder, and it has worked for forty years.` },
    ],
    // 3.2 -- why they go on
    after: [
      { who: 'You', text: `Olb. Should we not turn back and bring the Society? This is bigger than a nest.` },
      { who: 'Olb Nikobe', text: `It is. And if we go back now, what do we bring them? "Cultists in a hole." The desk files that under next month, and by next month the hole has a city in it.` },
      { who: 'Olb Nikobe', text: `That is what an adventurer is, outworlder. Not the sword and not the rank. It is the one who is standing there when something is wrong, and steps in whatever it costs, because nobody else is standing there. The Society exists so that there is always somebody. Today it is us.` },
      { who: 'Olb Nikobe', text: `We go on far enough to know what this is. We see it with our own eyes. Then we decide. And if I say we run, we run, and you do not argue with me about it.` },
    ],
  },
  {
    speaker: "Ilsa, the Voice's Hand", members: ['Ash-bearer', 'Mouth-sworn'], tier: 0, leaderTier: 2,
    pages: [
      { who: null, text: `A woman in better robes than the others waits beside a brazier of black flame, as if the two of you had an appointment.` },
      { who: "Ilsa, the Voice's Hand", text: `The Voice's hand, at your service, briefly. You have come a long way down to die, and you have earned the courtesy of knowing why.` },
      { who: "Ilsa, the Voice's Hand", text: `When the frame is wide enough, the Mouth steps through. Not into the Seam: through it, into the world above. The seam opens under your nest, and your nest is an hour's walk from Cadence's east wall. A city breaking all at once. That is the offering. That is what he asked for.` },
      { who: "Ilsa, the Voice's Hand", text: `And you two are the only people alive who know where the door is. So you understand: you cannot leave. Not because we hate you. Because you are the only thing standing between us and a god's promise.` },
      { who: 'Olb Nikobe', text: `She has said it plainly, and that is a kindness. Now we know what we are standing between. Stay close.` },
    ],
    after: [
      { who: 'Olb Nikobe', text: `Hear that? Below us. Voices, a lot of them. That is the rest of it.` },
      { who: 'Olb Nikobe', text: `Keep low and keep quiet. We look. We do not touch.` },
    ],
  },
];

/** 7 -- the talks on the road. Each is a short scene; `{e1}` and so on are the player's essences, `{insight1}` ... are
 *  Olb's reading of them (see `olbEssenceInsight`). */
export const OLB_TALKS = {
  road1: [
    { who: 'Olb Nikobe', text: `Walk with me a moment. I have been watching you fight, and I want to tell you what I see, because nobody told me and it cost me ten years.` },
    { who: 'Olb Nikobe', text: `{insight1}` },
    { who: 'Olb Nikobe', text: `Do not take that as a rule. An essence is not a cage. It is a way of being strong, and you find out which way by being in trouble.` },
  ],
  road2: [
    { who: 'You', text: `How long have you been teaching?` },
    { who: 'Olb Nikobe', text: `Too long to say out loud. I ran with a company once. Five of us; we called ourselves the Lantern, because we went where nobody had lit one. I am the last of the five. After the fourth funeral I stopped taking contracts and started taking students. It turned out I was better at keeping other people alive than at keeping my friends alive.` },
    { who: 'Olb Nikobe', text: `{insight2}` },
  ],
  astral1: [
    // ROUND 388 -- the old line said the astral is "where your essences live"; it is not (see OLB_APERTURE_PAGES).
    { who: 'Olb Nikobe', text: `You are breathing too fast. Everyone does, the first time. Nothing out here was made with people in mind, and your body noticed before you did. Talk to me. It slows the breathing down.` },
    { who: 'Olb Nikobe', text: `{insight3}` },
    { who: 'Olb Nikobe', text: `And put three of them together and you have a confluence, which is your essences arguing with each other until they agree. {confluence}` },
  ],
  astral2: [
    { who: 'You', text: `That shield you put on me. What is it?` },
    { who: 'Olb Nikobe', text: `An old Silver's trick. It is a good shield, outworlder. It will take a blow that would have opened you up. But it lasts as long as my mana does and not a breath longer, so the less you need it, the longer it lasts.` },
    { who: 'Olb Nikobe', text: `I am glad you are here, for the record. I did not expect to be. Most of my students I like by the end. You I liked by the second lesson, and I am not sure yet whether that is a good sign.` },
  ],
};

/** What Olb says to each family of essence (7). One or two sentences, in her voice. */
export const OLB_ESSENCE_FAMILY_LINES = {
  fire: `{name}. People think fire is about burning things. It is about tempo. A fire user who waits loses; one who keeps the pressure on never lets the other side breathe.`,
  cold: `{name}. Cold is patience made into a weapon. You do not need to hit hardest, you need to make everything around you slower than you.`,
  storm: `{name}. Lightning does not care what is in the way. That is a gift and a warning: it will go through your friends as cheerfully as your enemies if you let it.`,
  air: `{name}. Wind essences live and die by space. Keep room around you. A wind user in a corridor is a fish on a stair.`,
  water: `{name}. Water wins by never stopping. It goes around, and under, and through, and it is still there when the rock is gone.`,
  earth: `{name}. Earth is the essence of standing your ground. Everyone else is trying to get out of the way; you are the way.`,
  life: `{name}. Life essences are the ones teams fight over. Learn to keep yourself alive first; a healer on the floor heals nobody.`,
  light: `{name}. Light is honest, which makes it dangerous in a world that is not. Monsters that live in the dark will know you from a mile off.`,
  dark: `{name}. Dark is not evil, whatever the temples say. It is the essence of not being where they think you are.`,
  death: `{name}. You carry something from the end of things. Respect it. Death essences are strong because they are certain.`,
  blood: `{name}. Blood remembers. What you spill, and what you spend of yourself, both come back to you, one way or the other.`,
  blade: `{name}. A blade essence wants you close. Learn your footwork before your tricks; the trick is worthless if you cannot reach.`,
  bludgeon: `{name}. Heavy, and honest about it. You do not finesse a door down. Make every swing count, because the next one comes slowly.`,
  polearm: `{name}. Reach is life. Whoever controls the distance controls the fight, and you were born holding the long end.`,
  ranged: `{name}. You fight with a gap between you and the danger. Guard that gap like gold; the moment it closes, you are the weak one.`,
  force: `{name}. Raw might. Do not let anyone tell you it is simple. Knowing when to hold back a strong arm is the hardest lesson there is.`,
  guard: `{name}. A guard essence. You are the wall, and walls do not win fights, they make sure the fight is still going when the help arrives.`,
  beast: `{name}. There is an animal in you now, and it has instincts. Listen to them. They are older than you.`,
  smallbeast: `{name}. Small creatures survive by being clever, quick and never where the boot comes down. So will you.`,
  flyer: `{name}. A winged essence. Height is an advantage in every sense, outworlder: see the field before the field sees you.`,
  aquatic: `{name}. Something from the deep. It is patient and it is strange, and so, I suspect, are you.`,
  serpent: `{name}. Serpents wait, and then they do not. Your whole art is choosing the moment.`,
  mind: `{name}. A mind essence. Your sharpest weapon is the one inside your head. Use it before you use the other ones.`,
  space: `{name}. Space essences bend the room. Where you are, where they are, how far apart: none of it is fixed for you the way it is for everyone else.`,
  order: `{name}. Order. You make the world behave. Monsters hate it, and so do a surprising number of people.`,
  identity: `{name}. An essence of self. Most people spend their lives working out who they are. You were handed it in a stone.`,
  craft: `{name}. A maker's essence. The best fighters I knew could also mend their own boots. Nothing you make is ever wasted.`,
  motion: `{name}. You are fast, or you will be. Speed is the one armour no blade can cut.`,
  alchemy: `{name}. Alchemy. You will spend your life turning one thing into another, and the most useful thing you will ever turn is a bad fight into a short one.`,
};
export const OLB_ESSENCE_NONE = `You have not bound an essence yet, so there is nothing to read. That is not a lack. It is a page nobody has written on.`;
export const OLB_CONFLUENCE_NONE = `You have not got there yet. When you do, listen to what they agree on.`;

/** 7.1 -- what she says when she puts her shield on you. */
export const OLB_SHIELD_BARKS = [
  `Shield's on you! It is a good one, but it only lasts as long as my mana does!`,
  `Again? Shield. It lasts as long as my mana lasts, so stop needing it!`,
  `Last one I can spare. Make it count.`,
];
export const OLB_SHIELD = {
  uses: 3,                // a few times
  hpBelow: 0.45,          // he raises it when you are hurt
  absorbFrac: 0.6,        // of your max health
  lastS: 10,              // how long it holds
  coolS: 30,              // before he can raise another
  final: 4.0,             // the last one, around you through the blast: how many of your max health it soaks
};

/** The soul bar (3.5): what share of the player's soul is left at each beat of the god's aura. */
export const OLB_SOUL_DRAIN = { slamEnd: 0.42, breakEnd: 0.36, crossEnd: 0.01 };

/** Olb's reading of the player's `i`th essence (7). `ids` are the socketed essence ids, `catalog` ESSENCE_CATALOG. */
export function olbEssenceInsight(ids, i, catalog) {
  const list = (ids || []).filter(id => id && catalog && catalog[id]);
  if (!list.length) return OLB_ESSENCE_NONE;
  const id = list[i % list.length];
  const E = catalog[id];
  const tmpl = OLB_ESSENCE_FAMILY_LINES[E.family]
    || `{name}. I have not met many who carry that one. Whatever it is, it chose you, and it will show you what it wants if you let it.`;
  const lead = list.length > 1 && i % list.length === 0 ? 'Your ' : (i % list.length === 1 ? 'And your ' : 'Your ');
  return lead + tmpl.replace('{name}', `${E.name} essence`).replace(/^(\S+ essence)\./, '$1.');
}

/** What he says about the confluence: the three essences together, or that there is none yet. */
export function olbConfluenceLine(ids, catalog) {
  const list = (ids || []).filter(id => id && catalog && catalog[id]);
  if (list.length < 3) return OLB_CONFLUENCE_NONE;
  const names = list.slice(0, 3).map(id => catalog[id].name);
  return `${names[0]}, ${names[1]} and ${names[2]}: that is a strange table to sit at, and a strong one, if they ever stop shouting.`;
}

/** Faults for the round-359 additions. */
export function olbRoad359Faults() {
  const out = [];
  const m = olbAstralMap();
  const at = (p) => p && m.grid[p.y * m.w + p.x] === 1;
  if (m.marks.packs.length !== OLB_PACKS.length) out.push('pack marks and packs disagree');
  m.marks.packs.forEach((pk, i) => {
    if (!at(pk.leader)) out.push(`pack ${i} leader not on floor`);
    for (const c of pk.members) if (!at(c)) out.push(`pack ${i} member not on floor`);
    if (pk.members.length !== OLB_PACKS[i].members.length) out.push(`pack ${i} member count`);
  });
  for (const z of m.marks.zone3) if (!at(z)) out.push('zone3 not on floor');
  for (const r of m.rocks) if (!at(r)) out.push('a rock off the floor');
  for (const pk of OLB_PACKS) for (const pg of [...pk.pages, ...pk.after]) if (!pg.text || pg.text.length < 20) out.push(`${pk.speaker}: short page`);
  for (const [k, list] of Object.entries(OLB_TALKS)) for (const pg of list) if (!pg.text || pg.text.length < 8) out.push(`talk ${k}: short page`);
  if (!(m.w * m.h >= 76 * 60 * 3)) out.push('the room did not grow');
  return out;
}
