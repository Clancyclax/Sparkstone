// ============================================================================
// ROUND 427 -- THE TWO WAYS TO PLAY: SOFTCORE AND PERMADEATH.
//
// The user:
//   Permadeath: the reliquary passes one random bonded essence to the next run.
//   Companions die too unless saved within iron 3 s / bronze 10 s / silver 20 s
//   / gold 40 s by a rare potion or ability, and a companion with strong heals
//   can save the player in the same window.
//   Softcore: items and coins dropped at the body.
//   Each mode has its own reliquary.
//   The softcore death count drives the Church of Death: 1-5 warn, 6-10 rude,
//   11-20 hostile "aberration", 21-50 a gold priest of death at 300% in the
//   temple, 50+ attack on sight, 100+ priests of Undeath recruit.
//
// Pure: no Phaser, no DOM. The scene half is scenes/gameModeMixin.js.
// ============================================================================

export const GAME_MODES = ['softcore', 'permadeath'];
export const MODE_LABEL = { softcore: 'Softcore', permadeath: 'Permadeath' };
export const MODE_BLURB = {
  softcore: 'Death sends you back to town. Everything you carry and every coin you hold stays with your body until you walk back for it.',
  permadeath: 'One life. When you die the character is gone and its saves are erased; the reliquary keeps one of its bonded essences for whoever comes next. A companion who falls must be saved in time or is lost for good.',
};

/** A player's mode. Anything that is not permadeath (an old save has no field) is softcore. */
export function modeOf(p) {
  return p && p.gameMode === 'permadeath' ? 'permadeath' : 'softcore';
}

// ---------------------------------------------------------------------------
// THE DYING WINDOW. The user's four numbers, read off the rank of whoever is
// dying: a companion's own rank, the player's rank when it is the player. A
// Normal-rank body has the Iron window -- the shortest there is.
// ---------------------------------------------------------------------------
export const RESCUE_WINDOW_S = { normal: 3, iron: 3, bronze: 10, silver: 20, gold: 40, diamond: 40 };
export function rescueWindow(rank) {
  return RESCUE_WINDOW_S[rank] || RESCUE_WINDOW_S.iron;
}
/** How long a healer must hold someone together, once beside them, to bring them back. */
export const RESCUE_CHANNEL_S = 1;
/** A healer companion this close to a dying companion saves them (a healer is not steered for this). */
export const HEALER_SAVE_TILES = 6;
/** How far a healer companion may be from the player and still run to them. */
export const HEALER_REACH_TILES = 25;
/** The health a rescue brings someone back with. */
export const RESCUE_HP_FRAC = 0.35;
/** A heal cast by the player reaches a dying companion this close. */
export const HEAL_SAVE_TILES = 7;
/** A Second Breath is drunk beside the fallen: this close. */
export const POTION_SAVE_TILES = 6;

// ---------------------------------------------------------------------------
// THE TWO RELIQUARIES. Softcore keeps the key every chest has always had, so
// nothing anyone has stored moves. Permadeath has its own, and it is filled by
// one thing only: the essence a dead character leaves.
// ---------------------------------------------------------------------------
export const VAULT_KEY_SOFTCORE = 'sparkstone.vault.v1';
export const VAULT_KEY_PERMADEATH = 'sparkstone.vault.pd.v1';
export function vaultKeyFor(mode) {
  return mode === 'permadeath' ? VAULT_KEY_PERMADEATH : VAULT_KEY_SOFTCORE;
}
/** Can a character of this mode put things into its reliquary by hand? */
export function vaultTakesDeposits(mode) {
  return mode !== 'permadeath';
}

/** One of the bonded essences, at random. `ids` is `slotEssence`; empty sockets are skipped. */
export function inheritedEssence(ids, rng = Math.random) {
  const pool = (ids || []).filter(Boolean);
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

// ---------------------------------------------------------------------------
// THE GRAVES. A permadeath character's saves are erased when it dies; a save
// copied somewhere before that (another tab, an export) is refused on load by
// its seed. Its own localStorage key, beside the reliquary's.
// ---------------------------------------------------------------------------
export const GRAVES_KEY = 'sparkstone.pd.graves.v1';
export const GRAVES_CAP = 200;
export function normaliseGraves(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.filter(g => g && typeof g.seed === 'string' && g.seed).slice(-GRAVES_CAP);
}
export function isBuried(graves, seed) {
  return !!seed && (graves || []).some(g => g.seed === seed);
}

// ---------------------------------------------------------------------------
// THE RARE POTION.
// ---------------------------------------------------------------------------
export const SECOND_BREATH_ID = 'secondBreathDraught';
export const SECOND_BREATH_DEF = {
  id: SECOND_BREATH_ID,
  name: 'Draught of the Second Breath',
  desc: `Drink it within ${POTION_SAVE_TILES} tiles of a companion who is down: the nearest gets up at once with ${Math.round(RESCUE_HP_FRAC * 100)}% of their health. In permadeath this is what stops a dying companion from dying.`,
  secondBreath: true,
  value: 5000,
};
/** Sold at the Temple of Healing: its price, in normal-coin units, and how many a day. */
export const SECOND_BREATH_PRICE = 9000;
export const SECOND_BREATH_PER_DAY = 1;
/** Of every consumable drop from something above Normal rank, this share is a Second Breath. */
export const SECOND_BREATH_DROP = 0.006;

// ---------------------------------------------------------------------------
// THE CHURCH OF DEATH. Tiers by softcore deaths.
// ---------------------------------------------------------------------------
export const CHURCH_TIERS = [
  { tier: 0, from: 0, key: 'none' },
  { tier: 1, from: 1, key: 'warn' },
  { tier: 2, from: 6, key: 'rude' },
  { tier: 3, from: 11, key: 'hostile' },
  { tier: 4, from: 21, key: 'warden' },
  { tier: 5, from: 50, key: 'onSight' },
  { tier: 6, from: 100, key: 'undeath' },
];
export function churchTier(deaths) {
  const n = Math.max(0, Math.floor(Number(deaths) || 0));
  let t = 0;
  for (const row of CHURCH_TIERS) if (n >= row.from) t = row.tier;
  return t;
}
export const CHURCH_TIER_NOTICE = {
  1: 'The priests of Death have noticed you come back.',
  2: 'The priests of Death have stopped being polite about it.',
  3: 'The priests of Death call you an aberration now, and will not speak to you.',
  4: 'The Church of Death has set a gold-rank Warden in its temple, waiting for you.',
  5: 'The priests of Death will attack you on sight.',
  6: 'Somebody else has noticed. The priests of Undeath want a word.',
};

export const CHURCH_LINES = {
  warn: [
    'You have come back again. The god notices every return. Do not make a habit of it.',
    'Death is a door that opens one way. You keep walking back through it. Doors are not meant to work like that.',
    'Every soul that returns is one the god has to count twice. Be careful how often you make it count.',
    'I will say this kindly, once: the dead should stay where they are put.',
    'You were dead, and now you are not. I would not lean on that.',
  ],
  rude: [
    'You again. I can smell the grave on you from here.',
    'How many times is it now? The god stopped finding it funny. So did I.',
    'Wipe your feet. You track the other side in with you.',
    'I bury people for a living. You keep wasting my work.',
    'Speak quickly. I do not enjoy talking to something that will not stay dead.',
  ],
  hostile: [
    'Aberration. Get out of the god\'s house.',
    'We do not speak to aberrations. Leave.',
    'You are a wrong thing walking, an aberration. The god sees it. We all see it.',
    'Every time you come back the veil tears a little more. Aberration. Go.',
  ],
  bark: [
    'Aberration.',
    'There goes the aberration.',
    'The god keeps a list. You are on it.',
    'Do not let it touch you.',
  ],
  warden: [
    'The god has sent me to correct a mistake. You are the mistake.',
    'You have cheated the door too many times. It ends in this room.',
    'Lie down, aberration. I will see that you stay there.',
  ],
  onSight: [
    'Aberration! In the god\'s name, lie down and stay down!',
    'There it is. Finish what the grave started.',
    'Kill it. Kill it properly this time.',
  ],
};
/** The Warden in the temple. */
export const WARDEN = {
  name: 'Warden Isolde Mourne, Priest of Death (Gold)',
  rankIdx: 4,
  mult: 3,
  returnDays: 3,
};
/** Death's priests who turn on sight come back to their posts this many days after. */
export const ON_SIGHT_RETURN_DAYS = 1;
/** How near is "on sight", in tiles. */
export const ON_SIGHT_TILES = 9;
/** A priest who has lost you gives up at this distance, in tiles. */
export const FOE_GIVE_UP_TILES = 32;

// ---------------------------------------------------------------------------
// THE PRIESTS OF UNDEATH, past a hundred deaths.
// ---------------------------------------------------------------------------
export const UNDEATH_RECRUIT = {
  name: 'A Priest of Undeath',
  firstAfterS: 90,
  gapS: [480, 720],
  afterRefuseS: 900,
  pitch: (n) => `"${n} deaths, and still you walk. The Church of Death calls you an aberration. We call you a promise. The Unburied keep a place for one who will not stay down."`,
  more: '"Death\'s priests want the dead to lie still. We think the dead have been patient long enough. You already know the way back. All we ask is that you stop being ashamed of it."',
  accept: '"Then you are ours, and we are yours. Wear the mark, and listen. He is already here."',
  // ROUND 427 (2) -- "Taking the mark of the unburied should unlock the undeath path ... it should grant a choice to
  // accept a blessing from the god of undeath changing the player's confluence to Undeath and all of their confluence
  // skills are rerolled for undeath with the same awakening stones they originally used."
  god: 'The Unburied',
  blessingOffer: (formWord) => `The cold comes first, and then the voice, from everywhere you have ever been buried.\n\n`
    + `"${'Nothing that has been is ever finished. It is only waiting to be asked back.'} I am asking."\n\n`
    + `[ The Unburied's blessing: your confluence becomes Undeath${formWord ? `, and you become ${formWord}` : ''}. Every confluence ability `
    + `awakens again, for Undeath, from the same awakening stones. The Adventure Society hunts anyone who carries Undeath, `
    + `and companions who will not stand beside it leave. It cannot be undone. ]`,
  blessingNoTrio: '[ The Unburied\'s blessing: when your third essence is bonded, your confluence will form as Undeath. '
    + 'The Adventure Society hunts anyone who carries Undeath. It cannot be undone. ]',
  blessingDivine: '"Another god holds the place where your confluence would be. I do not take from gods. Not yet."',
  blessed: (formWord) => `"Get up."\n\n[ Your confluence is Undeath${formWord ? `: you are ${formWord}` : ''}. Its abilities have awakened again from the same stones. ]`,
  blessedLater: '"When the third comes, it will come to me."\n\n[ The Unburied\'s blessing is on you. Your confluence will form as Undeath. ]',
  notYet: '"The mark stays. So do we. We will come and ask again."',
  refuse: '"Refuse all you like. You will die again, and we will ask again. We are very patient. Patience is the one thing we have plenty of."',
};

// ---------------------------------------------------------------------------
// THE SCREENS.
// ---------------------------------------------------------------------------
export function dyingLine(healerName, secs) {
  return healerName
    ? `Dying. ${healerName} is coming for you: ${secs}s`
    : 'Dying. There is no one close enough to reach you.';
}
export function finalLine(essName) {
  return essName
    ? `There is no coming back from this one. The Reliquary of Moments keeps the Essence of ${essName} for whoever comes next.`
    : 'There is no coming back from this one. There was no bonded essence for the reliquary to keep.';
}

/** Faults, for the data lane. */
export function gameModeFaults() {
  const f = [];
  if (modeOf({}) !== 'softcore' || modeOf(null) !== 'softcore') f.push('an old save is not softcore');
  if (modeOf({ gameMode: 'permadeath' }) !== 'permadeath') f.push('permadeath not read');
  const want = { iron: 3, bronze: 10, silver: 20, gold: 40 };
  for (const [r, s] of Object.entries(want)) if (rescueWindow(r) !== s) f.push(`${r} window is not ${s}s`);
  if (rescueWindow('normal') !== 3) f.push('normal window is not the iron window');
  if (vaultKeyFor('softcore') === vaultKeyFor('permadeath')) f.push('the two modes share a reliquary');
  if (vaultKeyFor('softcore') !== 'sparkstone.vault.v1') f.push('softcore moved the old reliquary');
  if (vaultTakesDeposits('permadeath')) f.push('the permadeath reliquary takes deposits');
  if (inheritedEssence([null, null, null]) !== null) f.push('inherited from empty sockets');
  if (inheritedEssence(['a', null, 'b'], () => 0.99) !== 'b') f.push('inheritance does not skip empty sockets');
  const table = [[0, 0], [1, 1], [5, 1], [6, 2], [10, 2], [11, 3], [20, 3], [21, 4], [49, 4], [50, 5], [99, 5], [100, 6], [400, 6]];
  for (const [n, t] of table) if (churchTier(n) !== t) f.push(`${n} deaths is tier ${churchTier(n)}, not ${t}`);
  if (!CHURCH_LINES.hostile.some(l => /aberration/i.test(l))) f.push('the hostile priests never say aberration');
  if (WARDEN.mult !== 3 || WARDEN.rankIdx !== 4) f.push('the Warden is not gold at 300%');
  if (!isBuried([{ seed: 'x' }], 'x') || isBuried([{ seed: 'x' }], 'y') || isBuried([], '')) f.push('graves misread');
  return f;
}
