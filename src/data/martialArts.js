// ===========================================================================
// ROUND 310 (item 2.2.2) -- MARTIAL ARTS.
//
// The user:
//
//   "Martial Arts Proficiencies (Players should be able to pick out a martial
//    art skill book that slightly changes how they play) Examples: Way of the
//    patient hunter (reduces mana and stamina costs by 5% while holding
//    still); Way of the inevitable stinger (Increases movement speed and
//    dodge by .5% for each enemy with a DOT effect); Way of the meteor
//    (single target attacks with a cooldown are 3% stronger, and have their
//    cooldown reduced by 1%)"
//   "These should be generated with 100s of potential small effects like
//    above but a player can only pick to learn 1 martial art. The martial arts
//    effect improves at each rank as the players body and attributes improve."
//
// WHY A GENERATOR AND NOT A LIST. Every art is the same sentence with two
// things swapped: WHEN it works (a condition the player can arrange: standing
// still, being hurt, fighting alone, having bled the room) and WHAT it does
// (a channel: dodge, costs, tempo, mend). Writing four hundred of those by
// hand is how the table drifts from the runtime; a cross product of two small
// tables cannot. Three curated signatures (the user's own three) sit on top,
// worded exactly as he worded them.
//
// THE RUNTIME READS ONE THING: `effectsFor(art, ctx)`. `ctx` is the player's
// live state (see CONDITIONS) and the rank/attribute scale; the answer is a
// plain bag `{moveSpeed, dodge, damage, crit, guard, thrift, tempo, haste,
// mend, wind, focus, vigor}` of fractions. WorldScene applies that bag
// through the same doors every other buff uses; nothing here touches Phaser.
//
// MAGNITUDE. base (per channel) x condition weight x rank multiplier x
// attribute lift. Iron figures are the user's own order of size (0.5% to 5%);
// by gold they are about four times that, which is "improves at each rank as
// the player's body and attributes improve".
// ===========================================================================

/** Rank multipliers, iron..gold. Between ranks the standing's fraction
 *  interpolates, so a martial art grows continuously rather than in steps. */
export const MARTIAL_RANK_MULT = [1, 1.7, 2.6, 3.8];
/** Each point of the linked attribute lifts the art by this fraction. */
export const MARTIAL_ATTR_LIFT = 0.04;

export function martialScale(standing = 0, attrPoints = 0) {
  const s = Math.max(0, Number(standing) || 0);
  const i = Math.min(MARTIAL_RANK_MULT.length - 1, Math.floor(s));
  const f = Math.min(1, s - i);
  const hi = MARTIAL_RANK_MULT[Math.min(MARTIAL_RANK_MULT.length - 1, i + 1)];
  const rank = MARTIAL_RANK_MULT[i] + (hi - MARTIAL_RANK_MULT[i]) * f;
  return rank * (1 + MARTIAL_ATTR_LIFT * Math.max(0, attrPoints || 0));
}

// ---------------------------------------------------------------------------
// CONDITIONS -- WHEN. `key` is the field of the live context it reads;
// `per` marks a per-count condition (the figure is multiplied by the count,
// capped at `cap`). `w` is the weight: how big the base figure is when the
// condition is this easy or this hard to hold.
// ---------------------------------------------------------------------------
export const CONDITIONS = [
  { id: 'still',    key: 'still',     w: 1.6, text: 'while holding still',                   epithets: ['patient', 'rooted', 'unmoving', 'quiet', 'waiting'] },
  { id: 'moving',   key: 'moving',    w: 1.0, text: 'while on the move',                     epithets: ['restless', 'wandering', 'drifting', 'running', 'roving'] },
  { id: 'combat',   key: 'inCombat',  w: 0.9, text: 'while in a fight',                      epithets: ['grim', 'steady', 'battle-born', 'unrelenting', 'hardened'] },
  { id: 'calm',     key: 'calm',      w: 1.5, text: 'while no fight is on',                  epithets: ['easy', 'idle', 'peaceful', 'unhurried', 'traveling'] },
  { id: 'hurt',     key: 'hurt',      w: 1.5, text: 'while below half health',               epithets: ['wounded', 'bleeding', 'cornered', 'desperate', 'last'] },
  { id: 'hale',     key: 'hale',      w: 1.0, text: 'while above nine tenths health',        epithets: ['hale', 'unbroken', 'untouched', 'proud', 'whole'] },
  { id: 'manalow',  key: 'manaLow',   w: 1.4, text: 'while mana is under a third',           epithets: ['empty', 'dry', 'ebbing', 'spent', 'parched'] },
  { id: 'manafull', key: 'manaFull',  w: 1.0, text: 'while mana is nearly full',             epithets: ['brimming', 'overflowing', 'clear', 'bright', 'full'] },
  { id: 'stamlow',  key: 'stamLow',   w: 1.4, text: 'while stamina is under a third',        epithets: ['winded', 'weary', 'gasping', 'flagging', 'burning'] },
  { id: 'stamfull', key: 'stamFull',  w: 1.0, text: 'while stamina is nearly full',          epithets: ['fresh', 'tireless', 'eager', 'springing', 'rested'] },
  { id: 'night',    key: 'night',     w: 1.2, text: 'at night',                              epithets: ['midnight', 'moonlit', 'dark', 'nocturnal', 'lantern'] },
  { id: 'day',      key: 'day',       w: 1.0, text: 'in daylight',                           epithets: ['noon', 'sunlit', 'bright', 'morning', 'open'] },
  { id: 'afterkill', key: 'afterKill', w: 1.4, text: 'for six seconds after a kill',         epithets: ['victorious', 'hungry', 'following', 'reaping', 'flowing'] },
  { id: 'afterhit', key: 'afterHit',  w: 1.4, text: 'for four seconds after you are struck', epithets: ['answering', 'stubborn', 'scarred', 'spiteful', 'tempered'] },
  { id: 'afterstrike', key: 'afterStrike', w: 1.2, text: 'for two seconds after you land a hit', epithets: ['following', 'chained', 'rolling', 'unbroken', 'quick'] },
  { id: 'perdot',   key: 'dotFoes',   per: true, cap: 8, w: 0.30, text: 'for each enemy near you suffering a damage-over-time effect', epithets: ['inevitable', 'patient', 'creeping', 'festering', 'slow'] },
  { id: 'perfoe',   key: 'foes',      per: true, cap: 8, w: 0.25, text: 'for each enemy near you',                  epithets: ['surrounded', 'crowded', 'hunted', 'many-handed', 'outnumbered'] },
  { id: 'crowd',    key: 'crowd',     w: 1.1, text: 'while three or more enemies are near',  epithets: ['mobbed', 'pressed', 'swarmed', 'whirling', 'wide'] },
  { id: 'duel',     key: 'duel',      w: 1.3, text: 'while exactly one enemy is near',       epithets: ['single', 'lone', 'duelling', 'focused', 'narrow'] },
  { id: 'unarmed',  key: 'unarmed',   w: 1.2, text: 'while bare-handed',                     epithets: ['open-handed', 'bare', 'empty-handed', 'plain', 'naked'] },
  { id: 'armed',    key: 'armed',     w: 0.8, text: 'while holding a weapon',                epithets: ['sworn', 'armed', 'edged', 'drawn', 'ready'] },
  { id: 'wet',      key: 'wet',       w: 1.4, text: 'while standing in water',               epithets: ['drowned', 'river', 'tidal', 'dripping', 'rain-soaked'] },
  { id: 'high',     key: 'high',      w: 1.3, text: 'while standing on higher ground than Cadence', epithets: ['high', 'summit', 'cliff', 'eagle', 'peak'] },
  { id: 'low',      key: 'low',       w: 1.3, text: 'while standing on lower ground than Cadence', epithets: ['sunken', 'valley', 'deep', 'low', 'hollow'] },
  { id: 'buffed',   key: 'buffed',    w: 1.1, text: 'while one of your own buffs is running', epithets: ['blessed', 'kindled', 'fed', 'lit', 'primed'] },
  { id: 'always',   key: 'always',    w: 0.55, text: 'at all times',                         epithets: ['quiet', 'steady', 'abiding', 'plain', 'constant'] },
];

// ---------------------------------------------------------------------------
// CHANNELS -- WHAT. `base` is the iron figure at weight 1, as a fraction.
// `attr` is the attribute that lifts it (the four the game has).
// ---------------------------------------------------------------------------
export const CHANNELS = [
  { id: 'moveSpeed', base: 0.020, attr: 'speed',    noun: 'movement speed',        figures: ['Hare', 'Gale', 'Courier', 'Heron', 'Stag'] },
  { id: 'dodge',     base: 0.015, attr: 'speed',    noun: 'dodge chance',          figures: ['Willow', 'Reed', 'Eel', 'Moth', 'Weasel'] },
  { id: 'damage',    base: 0.020, attr: 'power',    noun: 'damage',                figures: ['Anvil', 'Boar', 'Avalanche', 'Mallet', 'Rhino'] },
  { id: 'crit',      base: 0.015, attr: 'power',    noun: 'critical chance',       figures: ['Falcon', 'Needle', 'Lightning', 'Viper', 'Arrow'] },
  { id: 'guard',     base: 0.015, attr: 'recovery', noun: 'damage reduction',      figures: ['Tortoise', 'Wall', 'Oak', 'Shell', 'Bulwark'] },
  { id: 'thrift',    base: 0.040, attr: 'spirit',   noun: 'mana and stamina costs (lower)', figures: ['Hunter', 'Miser', 'Spider', 'Cat', 'Monk'] },
  { id: 'tempo',     base: 0.020, attr: 'speed',    noun: 'cooldown recovery speed', figures: ['Tide', 'Clock', 'Drum', 'Cricket', 'Pendulum'] },
  { id: 'haste',     base: 0.030, attr: 'spirit',   noun: 'cast speed',            figures: ['Spark', 'Swift', 'Wren', 'Flicker', 'Hummingbird'] },
  { id: 'mend',      base: 0.050, attr: 'recovery', noun: 'healing received',      figures: ['Spring', 'Moss', 'Bloom', 'Hearth', 'Salve'] },
  { id: 'wind',      base: 0.060, attr: 'recovery', noun: 'stamina recovery',      figures: ['Ox', 'Marathon', 'Camel', 'Bellows', 'Wolf'] },
  { id: 'focus',     base: 0.060, attr: 'spirit',   noun: 'mana recovery',         figures: ['Lotus', 'Lantern', 'Owl', 'Well', 'Crane'] },
  { id: 'vigor',     base: 0.060, attr: 'recovery', noun: 'health recovery',       figures: ['Bear', 'Root', 'Phoenix', 'Briar', 'Kindling'] },
];
const CH = Object.fromEntries(CHANNELS.map(c => [c.id, c]));
const CO = Object.fromEntries(CONDITIONS.map(c => [c.id, c]));

/** Pairs: two channels that read as one idea, the way the user's stinger does
 *  (movement speed AND dodge). The second figure is the pair's own. */
export const TWIN_PAIRS = [
  ['moveSpeed', 'dodge'], ['damage', 'crit'], ['guard', 'vigor'], ['thrift', 'wind'],
  ['tempo', 'haste'], ['mend', 'vigor'], ['focus', 'haste'], ['wind', 'moveSpeed'],
];

const ESCAPE = { 'single': 'Lone', 'many-handed': 'Many-Handed' };
const cap = (s) => s.split(/(\s|-)/).map(p => (/^[a-z]/.test(p) ? p[0].toUpperCase() + p.slice(1) : p)).join('');

function pct(v) {
  const x = v * 100;
  return `${x >= 10 ? x.toFixed(0) : x.toFixed(1).replace(/\.0$/, '')}%`;
}

/** The three the user wrote, in his words. `cond` and `fx` are real: they are
 *  the same fields the generated arts use, so the runtime has one path. */
export const SIGNATURE_ARTS = [
  { id: 'ma_patient_hunter', name: 'Way of the Patient Hunter',
    cond: 'still', fx: { thrift: 0.05 },
    text: 'reduces mana and stamina costs by 5% while holding still' },
  { id: 'ma_inevitable_stinger', name: 'Way of the Inevitable Stinger',
    cond: 'perdot', fx: { moveSpeed: 0.005, dodge: 0.005 },
    text: 'increases movement speed and dodge by 0.5% for each enemy near you with a damage-over-time effect' },
  // "single target attacks with a cooldown are 3% stronger, and have their
  // cooldown reduced by 1%" -- the runtime cannot yet tell a single-target
  // ability from an area one at the damage door, so it is applied to the
  // player's damage and cooldown recovery as a whole. Said in the notes.
  { id: 'ma_meteor', name: 'Way of the Meteor',
    cond: 'always', fx: { damage: 0.03, tempo: 0.01 },
    text: 'your attacks are 3% stronger and your cooldowns recover 1% faster' },
];

function build() {
  const out = [];
  const used = new Set();
  const uniq = (name) => {
    let n = name, k = 2;
    while (used.has(n)) { n = `${name} ${['II', 'III', 'IV', 'V', 'VI'][k - 2] || k}`; k++; }
    used.add(n); return n;
  };
  for (const s of SIGNATURE_ARTS) {
    used.add(s.name);
    out.push({ ...s, signature: true });
  }
  // Single-channel arts: every condition x every channel.
  CONDITIONS.forEach((co, ci) => {
    CHANNELS.forEach((ch, hi) => {
      if (co.id === 'still' && ch.id === 'thrift') return;   // the Patient Hunter is this one
      const e = co.epithets[(ci + hi) % co.epithets.length];
      const f = ch.figures[(ci * 3 + hi) % ch.figures.length];
      const base = ch.base * co.w * (co.per ? 1 : 1);
      const name = uniq(`Way of the ${cap(ESCAPE[e] || e)} ${f}`);
      out.push({ id: `ma_${co.id}_${ch.id}`, name, cond: co.id, fx: { [ch.id]: base },
        text: '' });
    });
    // Twin arts: a handful of pairs per condition so the shelf is 400+ deep.
    TWIN_PAIRS.forEach(([a, b], pi) => {
      if ((ci + pi) % 2) return;
      const A = CH[a], B = CH[b];
      const e = co.epithets[(ci + pi + 2) % co.epithets.length];
      const f = A.figures[(ci + pi) % A.figures.length];
      const name = uniq(`Way of the ${cap(ESCAPE[e] || e)} ${f}`);
      const w = co.w * 0.7;
      out.push({ id: `ma_${co.id}_${a}_${b}`, name, cond: co.id,
        fx: { [a]: A.base * w, [b]: B.base * w }, text: '' });
    });
  });
  for (const art of out) {
    if (!art.text) art.text = describeEffects(art.fx, art.cond, 1);
  }
  return out;
}

/** "reduces mana and stamina costs by 5%" / "increases movement speed and
 *  dodge chance by 1.5%" -- the figures at the given scale. */
export function describeEffects(fx, condId, scale = 1) {
  const co = CO[condId];
  const parts = Object.entries(fx).map(([k, v]) => {
    const ch = CH[k];
    const word = k === 'thrift' ? 'reduces mana and stamina costs by' : 'increases';
    return { k, v: v * scale, ch, word };
  });
  const bits = parts.map(p => (p.k === 'thrift'
    ? `reduces mana and stamina costs by ${pct(p.v)}`
    : `${pct(p.v)} more ${p.ch.noun}`));
  const when = co.per ? co.text : co.text;
  return `${bits.join(' and ')} ${when}${co.per ? ' (each, up to ' + co.cap + ')' : ''}`;
}

export const MARTIAL_ARTS = build();
export const MARTIAL_BY_ID = Object.fromEntries(MARTIAL_ARTS.map(a => [a.id, a]));

export function martialArt(id) { return MARTIAL_BY_ID[id] || null; }

/**
 * What an art does RIGHT NOW. `ctx` carries the live readings named by the
 * condition keys (booleans, and counts for the per-count ones) plus `scale`
 * from martialScale and an optional `attr` bag {power, spirit, speed,
 * recovery} lifting each channel by its own attribute. Returns {} when the
 * condition is not met.
 */
export function effectsFor(art, ctx) {
  const a = typeof art === 'string' ? MARTIAL_BY_ID[art] : art;
  if (!a || !ctx) return {};
  const co = CO[a.cond];
  if (!co) return {};
  let n = 1;
  if (co.per) n = Math.min(co.cap || 8, Number(ctx[co.key]) || 0);
  else if (!ctx[co.key]) return {};
  if (!(n > 0)) return {};
  const out = {};
  const base = ctx.scale || 1;
  for (const [k, v] of Object.entries(a.fx)) {
    const ch = CH[k];
    // The attribute lift is per channel (a damage art answers to Power), on
    // top of the rank scale. `ctx.attr` is optional; martialScale's own
    // attribute argument is for callers with one number.
    const lift = 1 + MARTIAL_ATTR_LIFT * Math.max(0, (ctx.attr && ch && ctx.attr[ch.attr]) || 0);
    out[k] = v * n * base * lift;
  }
  return out;
}

/** The card for one art, at a given scale -- what the book shows, and what
 *  the player's own sheet shows once it is learned. */
export function artCard(art, scale = 1) {
  const a = typeof art === 'string' ? MARTIAL_BY_ID[art] : art;
  if (!a) return '';
  const co = CO[a.cond];
  if (a.signature) return `${a.name}: ${a.text}. It improves at every rank.`;
  return `${a.name}: ${describeEffects(a.fx, a.cond, scale)}. It improves at every rank.`;
}

/** A daily shelf: `n` arts the vendor offers today, drawn deterministically
 *  from the whole pool by a day number (round 311: all of them random). */
export function shelfFor(dayNumber, n = 14, cityKey = '') {
  let h = 2166136261;
  const seed = `${dayNumber}|${cityKey}`;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; };
  // ROUND 311 -- the shelf is a RANDOM assortment of the whole pool: the three
  // signature arts are no longer forced onto it (they come up like any other).
  const pool = MARTIAL_ARTS;
  const out = [];
  const seen = new Set();
  while (out.length < n && seen.size < pool.length) {
    const a = pool[Math.floor(rnd() * pool.length)];
    if (seen.has(a.id)) continue;
    seen.add(a.id); out.push(a);
  }
  return out;
}

export function martialFaults() {
  const out = [];
  if (MARTIAL_ARTS.length < 300) out.push(`only ${MARTIAL_ARTS.length} martial arts; the ruling says hundreds`);
  const ids = new Set(), names = new Set();
  for (const a of MARTIAL_ARTS) {
    if (ids.has(a.id)) out.push(`duplicate martial art id ${a.id}`);
    if (names.has(a.name)) out.push(`duplicate martial art name ${a.name}`);
    ids.add(a.id); names.add(a.name);
    if (!CO[a.cond]) out.push(`${a.id} has an unknown condition ${a.cond}`);
    for (const k of Object.keys(a.fx)) if (!CH[k]) out.push(`${a.id} has an unknown channel ${k}`);
    if (!/^Way of the /.test(a.name)) out.push(`${a.name} is not named "Way of the ..."`);
  }
  return out;
}
