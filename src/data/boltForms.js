// ROUND 383 -- BOLT FORMS. The user: "Duplicate active abilities within a kit are still common, mostly bolts... I want
// more variety in general. Some bolts move fast others move slow, some bolts split halfway to an enemy others boomerang
// back to the character."
//
// A bolt (template projectileBall / volley) is given ONE flight form, seeded per ability and weighted by its essence,
// and no two bolts in a kit share a form (so three plain bolts become, say, a splitting one, a boomerang and a seeker).
// Every form is something the runtime does (boltFormMixin.js reads `a.boltForm` and the fields set here):
//   fast      speed x1.8, damage x0.8, same reach            (data only: a.speed / a.projectileLife / a.base)
//   slow      speed x0.55, damage x1.4, 1.5x wider, same reach (data only)
//   split     at half its flight, becomes 3 bolts fanning out at 50% damage each
//   boomerang flies to the end of its reach, then returns to you; passes through everything both ways
//   pierce    passes through enemies, up to N hits            (a.pierce, already spent by the impact code)
//   seek      every bolt homes, turning 2.5x as sharply, and picks the nearest enemy
//   lob       arcs over enemies and walls to land at the target point, hitting every enemy in a burst there
//   ricochet  after a hit, hops to the nearest other enemy, up to N times (a.bounce, already spent by the impact code)
// Card text keeps the existing "N damage" phrasing so the damage-type pass can insert its word.

export const BOLT_FORMS = ['fast', 'slow', 'split', 'boomerang', 'pierce', 'seek', 'lob', 'ricochet'];
export const BOLT_BASE_SPEED = 260;     // WorldScene's `a.speed || 260`
export const BOLT_BASE_LIFE = 1.1;      // WorldScene's `a.projectileLife ?? 1.1`
export const BOLT_SPLIT = { count: 3, frac: 0.5, fan: 0.35 };
export const BOLT_SEEK_TURN = 2.5;      // x PROJECTILE_HOME_TURN
export const BOLT_LOB_BURST = 48;       // world units, 1.5 tiles
const FAST = { speed: 1.8, dmg: 0.8 }, SLOW = { speed: 0.55, dmg: 1.4, radius: 1.5 };

// Essence identity -> forms it leans toward (+4 weight). Matched on the essence id and name.
const LEANS = [
  [/hawk|eagle|bird|wing|feather|owl|raven|crow|falcon|wind|air|sky|bat|swift|haste/i, ['seek', 'fast']],
  [/blade|sword|axe|hook|whip|sickle|scythe|claw|moon|crescent|glaive|dance|cycle|return/i, ['boomerang']],
  [/storm|lightning|thunder|crystal|glass|swarm|insect|bee|wasp|spider|shard|mirror|split|hydra|legion/i, ['split']],
  [/earth|rock|stone|mountain|iron|metal|force|bear|giant|ox|bull|magma|lava|might|titan|gravity/i, ['slow']],
  [/spear|bow|needle|arrow|lance|thorn|quill|bone|fang|tusk|horn|spike|pierc/i, ['pierce']],
  [/alchem|explos|bomb|volcan|potion|acid|plague|mud|slime|fire|ember|ash|blast/i, ['lob']],
  [/light|spark|sound|echo|coin|ball|chain|bounce|trick|monkey|rabbit|cat/i, ['ricochet']],
  [/hunt|wolf|hound|seek|eye|sight|ghost|spirit|shadow/i, ['seek']],
];

const isBolt = (a) => !!a && a.kind === 'active' && (a.template === 'projectileBall' || a.template === 'volley');

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** The bolt's reach in world units: speed x flight time. */
export function boltReach(a) {
  return (a.speed || BOLT_BASE_SPEED) * (a.projectileLife ?? BOLT_BASE_LIFE);
}

/** Forms this bolt can take at all (a form must change what the bolt does, and must not contradict what it already does). */
function formsAllowed(a) {
  const ok = new Set(BOLT_FORMS);
  if (a.template === 'volley') ok.delete('split');          // a spread that splits again is a cloud, not a form
  if (a.chain || a.bounce) ok.delete('ricochet');            // it already leaps
  if ((a.pierce || 1) > 1) { ok.delete('lob'); ok.delete('ricochet'); }
  if (a.explodeRadius > 0) { ok.delete('pierce'); ok.delete('boomerang'); }   // a bolt that bursts on contact stops
  if (a.leechBeam || a.payload) ok.delete('split');
  // ROUND 388 -- "Drifting ash says it releases a slow cinder, then tells you it's a fast bolt." The fusion (Drifting
  // Ash, fusions/fire.js) was authored slow -- speed 200 and "Releases a slow cinder" -- and this pass multiplied it by
  // 1.8 and called it fast. A bolt whose own words or authored speed already say how it flies keeps that pace: no
  // `fast` on a slow one, no `slow` on a fast one.
  const pace = boltPaceOf(a);
  if (pace === 'slow') ok.delete('fast');
  if (pace === 'fast') ok.delete('slow');
  return ok;
}

// ROUND 388 -- the words that already promise a pace (in the card or the name), and the authored speed bands.
export const SLOW_WORDS = /\b(?:slow(?:ly|-moving|-drifting)?|drift(?:s|ing)?|lazy|lazily|lumbering|ponderous|creeping|crawling|sluggish|unhurried|languid|leisurely)\b/i;
export const FAST_WORDS = /\b(?:fast|swift(?:ly)?|quick(?:ly)?|rapid(?:ly)?|darting|racing|streaking|speeding|hurtling|blurring|lightning-fast)\b/i;
/** 'slow' / 'fast' / null: what the bolt already says about its own pace, before any form. Only the opening of the
 *  card counts (its first sentence and the name): a later rider like "slows the target" is not about the bolt. */
export function boltPaceOf(a) {
  if (!a) return null;
  const first = String(a.desc || '').split(/(?<=\.)\s/)[0] || '';
  const words = `${a.name || ''} ${first}`.replace(/\bslow(?:s|ed|ing)? (?:the|its|their|them|it|enemies|everything|anything|whatever|a |an )/gi, '');
  const slow = SLOW_WORDS.test(words) || (a.speed > 0 && a.speed <= BOLT_BASE_SPEED * 0.85);
  const fast = FAST_WORDS.test(words) || (a.speed > 0 && a.speed >= BOLT_BASE_SPEED * 1.25);
  if (slow && !fast) return 'slow';
  if (fast && !slow) return 'fast';
  return null;
}

/** Seeded, essence-weighted pick of a form not in `used`. Returns null for "stay plain". */
export function pickBoltForm(a, essDef, used, salt = '') {
  const ok = formsAllowed(a);
  const words = `${a.essenceId || ''} ${(essDef && essDef.name) || ''} ${(essDef && essDef.family) || ''}`;
  const w = {};
  for (const f of ok) if (!used.has(f)) w[f] = 1;
  for (const [re, forms] of LEANS) if (re.test(words)) for (const f of forms) if (w[f]) w[f] += 4;
  // A plain bolt is one option among the forms, once per kit.
  if (!used.has('plain')) w.plain = 1.5;
  const total = Object.values(w).reduce((s, x) => s + x, 0);
  if (!total) return null;
  let r = hash(`${salt}|${a.name}|${a.essenceId}|boltform`) * total;
  for (const [f, x] of Object.entries(w)) { r -= x; if (r < 0) return f === 'plain' ? null : f; }
  return null;
}

/** Rewrite the card's damage figure (first "N damage", with or without a damage-type word between). */
function swapDamage(desc, oldN, newN) {
  const re = new RegExp(`\\b${oldN}((?: [a-z]+)? damage)\\b`);
  return re.test(desc) ? desc.replace(re, `${newN}$1`) : null;
}

/** The plain sentence a form adds to the card, and its stats fragment. `tiles` is fmtTiles. */
export function boltFormText(a, tiles) {
  const tps = (u) => `${Math.round((u / 32) * 2) / 2} tiles a second`;
  const reach = tiles(boltReach(a));
  // ROUND 388 -- "It doesn't need to tell you how much faster it is than other moves, it can just say a fast bolt. IT
  // DOESN'T NEED TO SAY IT'S WEAKER THAN OTHER BOLT MOVES ... Abilities don't compare." The sentence states the pace
  // and nothing else: no "(1.4x a standard bolt's speed)", no "deals 20% less damage for it". The damage figure on the
  // card is already the real (scaled) number.
  switch (a.boltForm) {
    case 'fast': return { sentence: `A fast bolt: it flies at ${tps(a.speed)}.`,
      stats: `fast (${tps(a.speed)})` };
    case 'slow': return { sentence: `A slow, heavy bolt: it flies at ${tps(a.speed)} and is wider.`,
      stats: `slow (${tps(a.speed)}), wide` };
    case 'split': return { sentence: `Halfway along its ${reach.replace(/ tiles?$/, '-tile')} flight it splits into ${BOLT_SPLIT.count} bolts that fan out, each dealing ${Math.round(BOLT_SPLIT.frac * 100)}% of its damage.`,
      stats: `splits into ${BOLT_SPLIT.count} at half range (${Math.round(BOLT_SPLIT.frac * 100)}% each)` };
    case 'boomerang': return { sentence: `It flies out ${reach} and returns to you, striking everything it passes both ways.`,
      stats: `returns, hits all in its path both ways` };
    case 'pierce': return { sentence: `It passes through enemies, hitting up to ${a.pierce} before it stops.`,
      stats: `pierces, up to ${a.pierce} hits` };
    case 'seek': return { sentence: `${a.template === 'volley' ? 'Every bolt seeks' : 'It seeks'} the nearest enemy, turning sharply to follow it, and finds a new one if that enemy dies.`,
      stats: 'seeking' };
    case 'lob': return { sentence: `It is lobbed over enemies and walls and lands where your target stands, hitting every enemy within ${tiles(a.lobBurst)} of the landing.`,
      stats: `lobbed, ${tiles(a.lobBurst)} burst` };
    case 'ricochet': return { sentence: `After it hits, it bounces to the nearest other enemy within ${tiles(a.bounceRange)}, up to ${a.bounce} times.`,
      stats: `bounces ${a.bounce}× within ${tiles(a.bounceRange)}` };
    default: return null;
  }
}

// Opening phrases that promise "the first enemy" -- false for a bolt that passes through, returns or is lobbed.
const FIRST_ENEMY = [
  [/into the first enemy it meets/, 'into the enemies ahead'],
  [/the first enemy in its path takes/, 'each enemy it strikes takes'],
  [/to the first (?:thing|enemy) it hits/, 'to each enemy it strikes'],
  [/to whatever it strikes first/, 'to each enemy it strikes'],
  [/at the first enemy in front of you/, 'at the enemies in front of you'],
  [/at the first enemy in its path/, 'at the enemies in its path'],
  [/Hits the first thing in its path for/, 'Hits each enemy in its path for'],
];

// A lobbed bolt meets nobody on the way: it comes down on the target.
const LOB_TARGET = [
  [/into the first enemy it meets/, 'onto your target'],
  [/ahead of you; the first enemy in its path takes/, 'at your target; each enemy where it lands takes'],
  [/to the first (?:thing|enemy) it hits/, 'to each enemy where it lands'],
  [/to whatever it strikes first/, 'to each enemy where it lands'],
  [/at the first enemy in front of you/, 'at your target'],
  [/at the first enemy in its path/, 'at your target'],
  [/Hits the first thing in its path for/, 'Hits each enemy where it lands for'],
];

/** Set a bolt's form fields and card text. Returns a new ability object, or null if the form could not be written. */
export function applyBoltForm(a, form, { tiles, statsLineFor }) {
  const b = { ...a, boltForm: form };
  let desc = String(a.desc || '');
  const base = a.base || 5;
  if (form === 'fast' || form === 'slow') {
    const k = form === 'fast' ? FAST : SLOW;
    const life = a.projectileLife ?? BOLT_BASE_LIFE;
    b.speed = Math.round((a.speed || BOLT_BASE_SPEED) * k.speed);
    b.projectileLife = Math.round((life / k.speed) * 100) / 100;   // the same reach
    b.base = Math.max(1, Math.round(base * k.dmg));
    if (k.radius) b.radius = Math.round((a.radius || 6) * k.radius);
    if (b.base !== base) {
      const d = swapDamage(desc, base, b.base);
      if (d == null) return null;   // the card's figure could not be found: do not let card and runtime disagree
      desc = d;
    }
  }
  if (form === 'pierce') b.pierce = Math.max(a.pierce || 1, 3);
  if (form === 'ricochet') { b.bounce = 2; b.bounceRange = 128; }
  if (form === 'lob') b.lobBurst = Math.max(BOLT_LOB_BURST, a.explodeRadius || 0);
  if (form === 'pierce' || form === 'boomerang') for (const [re, to] of FIRST_ENEMY) desc = desc.replace(re, to);
  if (form === 'lob') for (const [re, to] of LOB_TARGET) desc = desc.replace(re, to);
  const t = boltFormText(b, tiles);
  if (!t) return null;
  // After the sentence that states its damage (else the first), so the card reads: what it hits, how it flies, its riders.
  // ROUND 391 -- a decimal later in that sentence ("within 2.5 tiles") is not its end.
  const dm = desc.match(/\d+(?: [a-z]+)? damage(?:[^.]|\.(?=\d))*\./);
  const cut = dm ? dm.index + dm[0].length - 1 : desc.search(/\.(\s|$)/);
  b.desc = cut >= 0 ? `${desc.slice(0, cut + 1)} ${t.sentence}${desc.slice(cut + 1)}` : `${desc} ${t.sentence}`.trim();
  b.boltFormStats = t.stats;
  if (statsLineFor) b.stats = statsLineFor(b);
  return b;
}

/** The kit post-pass: every bolt that is not a canon ability or a special attack gets a form, no two alike. */
export function applyBoltForms(known, knownList, ESSENCES, { tiles, statsLineFor, isSpecial, salt = '' }) {
  const used = new Set();
  const keys = Object.keys(known).sort();
  const todo = [];
  for (const k of keys) {
    const a = known[k] && known[k].ability;
    if (!isBolt(a) || a.canonKey || (isSpecial && isSpecial(a))) continue;
    if (a.boltForm) {   // a locked ability keeps the form it was given
      used.add(a.boltForm);
      // ROUND 388 -- ...but not the comparison its card was written with before this round.
      const d = restateBoltFormText(a.desc, a.boltForm);
      if (d !== a.desc) { const b = { ...a, desc: d }; const at = knownList.indexOf(a); known[k].ability = b; if (at >= 0) knownList[at] = b; }
      continue;
    }
    todo.push(k);
  }
  for (const k of todo) {
    const a = known[k].ability;
    const essDef = ESSENCES && ESSENCES[a.essenceId];
    let tries = 0, done = false;
    const blocked = new Set(used);
    while (!done && tries++ < 4) {
      const f = pickBoltForm(a, essDef, blocked, `${salt}|${tries}`);
      if (!f) { used.add('plain'); done = true; break; }
      const b = applyBoltForm(a, f, { tiles, statsLineFor });
      if (!b) { blocked.add(f); continue; }
      used.add(f);
      const at = knownList.indexOf(a);
      known[k].ability = b;
      if (at >= 0) knownList[at] = b;
      done = true;
    }
  }
}

/** ROUND 388 -- a card written before this round (a locked ability, a save) loses its comparison clauses. */
export function restateBoltFormText(desc, form = null) {
  let t = String(desc || '');
  // A form given before its opening was read ("Releases a slow cinder ... A fast bolt"): the opening loses the pace
  // word that contradicts the form the runtime flies.
  const cut = t.search(/ A (?:fast|slow, heavy) bolt: /);
  if (cut > 0 && (form === 'fast' || form === 'slow')) {
    const head = t.slice(0, cut), rest = t.slice(cut);
    const re = form === 'fast' ? /\b(?:slow(?:ly|-moving|-drifting)?|lazy|lazily|lumbering|ponderous|sluggish|unhurried|languid|leisurely),? /gi
      : /\b(?:fast|swift(?:ly)?|quick(?:ly)?|rapid(?:ly)?|speeding|hurtling|streaking),? /gi;
    t = head.replace(re, '') + rest;
  }
  return t
    .replace(/ \((?:about half|[\d.]+×) a standard bolt's speed\)/g, '')
    .replace(/(A fast bolt: it flies at [\d.]+ tiles a second), and deals 20% less damage for it\./g, '$1.')
    .replace(/(A slow, heavy bolt: it flies at [\d.]+ tiles a second), is wider, and deals 40% more damage for it\./g, '$1 and is wider.');
}

export const BOLT_FORM_FRAGMENT = (a) => (a && a.boltFormStats ? ` · ${a.boltFormStats}` : '');

// ROUND 383 -- "Duplicate active abilities within a kit are still common." Bolts are told apart by their form (above);
// every OTHER active shape gets a pull away from a second copy of itself in the socket scorer: an active whose
// template and role (and special-attack-ness) the kit already holds scores -60 per copy held (max -120). That is under
// the +200 kit-completing marker and the archetype musts (which narrow the candidates before scoring), so a repeat
// is still taken when it is what the kit needs or when nothing else is on offer.
export const REPEAT_ACTIVE_PULL = 60;
export function activeRepeatPull(c, knownList, isSpecial) {
  if (!c || c.kind !== 'active' || isBolt(c) || !knownList || !knownList.length) return 0;
  const sp = !!(isSpecial && isSpecial(c));
  let n = 0;
  for (const a of knownList) {
    if (a && a.kind === 'active' && a.template === c.template && (a.role || '') === (c.role || '')
      && !!(isSpecial && isSpecial(a)) === sp) n++;
  }
  return -Math.min(2, n) * REPEAT_ACTIVE_PULL;
}
