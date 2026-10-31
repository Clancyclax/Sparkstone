// ============================================================================
// ROUND 382 -- THEMED PASSIVES: a generic stat passive takes its effect from
// its essence x awakening-stone pairing.
//
// The user: "Is Eye Haft just a worse worded and strictly worse version of
// Buzzing Narrow Waist?" ... "Eye Haft and Buzzing Narrow Waist both becoming
// equally bad is not an acceptable solution. They should be unique and have
// relevant and thematic effects from the essence/awakening stone pairing."
// And: "Ability reuse seems really high for same essence and awakening stone
// combinations."
//
// `cooldownPassive` ("your abilities' cooldowns are N% shorter"), `passiveMove`
// ("+N% movement speed") and `passiveBuff` (dmg / crit / armour / max health)
// were the same sentence whatever essence and stone made them. Each now picks
// a SHAPE from the library below: the same kind of reward (a movement passive
// still moves you, a cooldown passive still gives time back) earned by a
// trigger that comes from the pairing -- the essence's levers and family, the
// stone's family. Wasp (linger/swift) + Rake: "After you hit an enemy suffering
// an affliction, you move 20% faster for 3s." Sickle + Eye (mind): "A critical
// hit takes 1s off your abilities' cooldowns."
//
// Each shape is one sentence the runtime does (themePassiveMixin.js), and no
// two passives in one kit take the same shape, or the same trigger-and-reward.
// ============================================================================

/** slot = which generic passive it can replace; keys = levers / families / motif words that make it fit.
 *  on: hit | crit | kill | hurt | dodge | cast | afflict | move.  eff: speed | cdCut | cdRate | dmgNow |
 *  dmgFor | nextCrit | armor | heal | lifedrain.  aff: only in a kit that inflicts afflictions. */
export const THEME_SHAPES = [
  // ---- movement ----
  { id: 'moveAfflictedHit', slot: 'move', aff: true, keys: ['linger', 'serpent', 'alchemy', 'venom', 'poison', 'sting', 'rot'],
    on: 'hit', cond: 'afflicted', eff: 'speed', amt: 0.2, dur: 3, icd: 0,
    text: (s) => `After you hit an enemy suffering an affliction, you move ${p(s.amt)}% faster for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% movement speed for ${s.dur}s after hitting an afflicted enemy`, words: ['Rush', 'Stride'] },
  { id: 'moveKill', slot: 'move', keys: ['stalk', 'reach', 'death', 'beast', 'polearm', 'blade', 'hunt', 'reap'],
    on: 'kill', eff: 'speed', amt: 0.25, dur: 4,
    text: (s) => `Each kill makes you move ${p(s.amt)}% faster for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% movement speed for ${s.dur}s after a kill`, words: ['Chase', 'Pursuit'] },
  { id: 'moveHurt', slot: 'move', keys: ['shift', 'stealth', 'smallbeast', 'aquatic', 'flee', 'scurry', 'dart'],
    on: 'hurt', eff: 'speed', amt: 0.3, dur: 2, icd: 5,
    text: (s) => `When you take damage, you move ${p(s.amt)}% faster for ${s.dur}s (at most once every ${s.icd}s).`,
    stat: (s) => `+${p(s.amt)}% movement speed for ${s.dur}s when hurt · ${s.icd}s cd`, words: ['Flight', 'Escape'] },
  { id: 'moveDodge', slot: 'move', keys: ['swift', 'air', 'flyer', 'motion', 'dance', 'wing'],
    on: 'dodge', eff: 'speed', amt: 0.3, dur: 3,
    text: (s) => `When you dodge an attack, you move ${p(s.amt)}% faster for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% movement speed for ${s.dur}s after a dodge`, words: ['Dart', 'Sidestep'] },
  { id: 'moveCast', slot: 'move', keys: ['burst', 'storm', 'force', 'space', 'call', 'fire'],
    on: 'cast', eff: 'speed', amt: 0.15, dur: 3,
    text: (s) => `After you use an ability, you move ${p(s.amt)}% faster for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% movement speed for ${s.dur}s after using an ability`, words: ['Surge', 'Step'] },
  { id: 'moveCrit', slot: 'move', keys: ['mind', 'ranged', 'fate', 'light', 'eye'],
    on: 'crit', eff: 'speed', amt: 0.2, dur: 3,
    text: (s) => `A critical hit makes you move ${p(s.amt)}% faster for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% movement speed for ${s.dur}s after a critical hit`, words: ['Stride', 'Dash'] },
  // ---- cooldowns ----
  { id: 'cdCrit', slot: 'cd', keys: ['mind', 'stalk', 'fate', 'ranged', 'eye', 'pierce', 'blade'],
    on: 'crit', eff: 'cdCut', amt: 1, icd: 1,
    text: (s) => `A critical hit takes ${s.amt}s off your abilities' cooldowns (at most once a second).`,
    stat: (s) => `-${s.amt}s ability cooldowns per critical hit`, words: ['Eye', 'Tempo'] },
  { id: 'cdKill', slot: 'cd', keys: ['reach', 'chain', 'siphon', 'death', 'polearm', 'blade', 'reap', 'harvest'],
    on: 'kill', eff: 'cdCut', amt: 2,
    text: (s) => `Each kill takes ${s.amt}s off your abilities' cooldowns.`,
    stat: (s) => `-${s.amt}s ability cooldowns per kill`, words: ['Harvest', 'Second Wind'] },
  { id: 'cdAfflict', slot: 'cd', aff: true, keys: ['linger', 'alchemy', 'serpent', 'dark', 'venom', 'poison'],
    on: 'afflict', eff: 'cdCut', amt: 0.5, icd: 1,
    text: (s) => `Inflicting an affliction takes ${s.amt}s off your abilities' cooldowns (at most once a second).`,
    stat: (s) => `-${s.amt}s ability cooldowns per affliction inflicted`, words: ['Rhythm', 'Tempo'] },
  { id: 'cdHurt', slot: 'cd', keys: ['turn', 'bulwark', 'taunt', 'guard', 'earth'],
    on: 'hurt', eff: 'cdRate', amt: 0.25, dur: 4, icd: 8,
    text: (s) => `When you take damage, abilities you use in the next ${s.dur}s get ${p(s.amt)}% shorter cooldowns (at most once every ${s.icd}s).`,
    stat: (s) => `-${p(s.amt)}% cooldowns for ${s.dur}s when hurt · ${s.icd}s cd`, words: ['Retort', 'Reprisal'] },
  { id: 'cdDodge', slot: 'cd', keys: ['swift', 'shift', 'fate', 'air', 'flyer', 'light'],
    on: 'dodge', eff: 'cdCut', amt: 1.5,
    text: (s) => `When you dodge an attack, ${s.amt}s comes off your abilities' cooldowns.`,
    stat: (s) => `-${s.amt}s ability cooldowns per dodge`, words: ['Second Wind', 'Reprieve'] },
  { id: 'cdHits', slot: 'cd', keys: ['raw', 'bludgeon', 'force', 'craft', 'beast', 'order'],
    on: 'hit', every: 5, eff: 'cdCut', amt: 1,
    text: (s) => `Every ${ord(s.every)} hit you land takes ${s.amt}s off your abilities' cooldowns.`,
    stat: (s) => `-${s.amt}s ability cooldowns every ${s.every} hits`, words: ['Rhythm', 'Cadence'] },
  { id: 'cdMove', slot: 'cd', keys: ['motion', 'allies', 'aquatic', 'dance', 'swift', 'space'],
    on: 'move', eff: 'cdCut', amt: 0.5,
    text: (s) => `Every 6 tiles you travel takes ${s.amt}s off your abilities' cooldowns.`,
    stat: (s) => `-${s.amt}s ability cooldowns per 6 tiles travelled`, words: ['Tempo', 'Stride'] },
  // ---- damage ----
  { id: 'dmgLowHp', slot: 'dmg', keys: ['reach', 'stalk', 'death', 'polearm', 'blade', 'reap'],
    on: 'hit', cond: 'lowHp', eff: 'dmgNow', amt: 0.25,
    text: (s) => `You deal ${p(s.amt)}% more damage to enemies below half health.`,
    stat: (s) => `+${p(s.amt)}% damage to enemies below half health`, words: ['Finish', 'Culling'] },
  { id: 'dmgFullHp', slot: 'dmg', keys: ['stealth', 'stalk', 'ranged', 'mind', 'light', 'eye'],
    on: 'hit', cond: 'fullHp', eff: 'dmgNow', amt: 0.3,
    text: (s) => `You deal ${p(s.amt)}% more damage to enemies at full health.`,
    stat: (s) => `+${p(s.amt)}% damage to enemies at full health`, words: ['Opening', 'First Blood'] },
  { id: 'dmgAfflicted', slot: 'dmg', aff: true, keys: ['linger', 'alchemy', 'serpent', 'dark', 'venom', 'poison'],
    on: 'hit', cond: 'afflicted', eff: 'dmgNow', amt: 0.15,
    text: (s) => `You deal ${p(s.amt)}% more damage to enemies suffering an affliction.`,
    stat: (s) => `+${p(s.amt)}% damage to afflicted enemies`, words: ['Spite', 'Malice'] },
  { id: 'dmgKill', slot: 'dmg', keys: ['raw', 'beast', 'blood', 'burst', 'fire'],
    on: 'kill', eff: 'dmgFor', amt: 0.2, dur: 5,
    text: (s) => `Each kill makes you deal ${p(s.amt)}% more damage for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% damage for ${s.dur}s after a kill`, words: ['Frenzy', 'Fury'] },
  { id: 'dmgHurt', slot: 'dmg', keys: ['turn', 'taunt', 'blood', 'bulwark', 'storm'],
    on: 'hurt', eff: 'dmgFor', amt: 0.15, dur: 3,
    text: (s) => `After you take damage, you deal ${p(s.amt)}% more damage for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% damage for ${s.dur}s when hurt`, words: ['Rage', 'Spite'] },
  // ---- critical hits ----
  { id: 'critKill', slot: 'crit', keys: ['stalk', 'mind', 'fate', 'death', 'blade', 'eye'],
    on: 'kill', eff: 'nextCrit',
    text: () => 'After a kill, your next hit is a critical hit.',
    stat: () => 'next hit crits after a kill', words: ['Mark', 'Eye'] },
  { id: 'critDodge', slot: 'crit', keys: ['swift', 'shift', 'flyer', 'air', 'fate'],
    on: 'dodge', eff: 'nextCrit',
    text: () => 'After you dodge an attack, your next hit is a critical hit.',
    stat: () => 'next hit crits after a dodge', words: ['Riposte', 'Counter'] },
  { id: 'critHits', slot: 'crit', keys: ['raw', 'craft', 'order', 'bludgeon', 'reach', 'polearm'],
    on: 'hit', every: 6, eff: 'nextCrit',
    text: (s) => `Every ${ord(s.every)} hit you land is a critical hit.`,
    stat: (s) => `every ${ord(s.every)} hit crits`, words: ['Measure', 'Mark'] },
  // ---- armour ----
  { id: 'armorHurt', slot: 'armor', keys: ['bulwark', 'guard', 'aquatic', 'earth', 'anchor', 'shell'],
    on: 'hurt', eff: 'armor', amt: 0.2, dur: 4, icd: 8,
    text: (s) => `When you take damage, your armour rises by ${p(s.amt)}% for ${s.dur}s (at most once every ${s.icd}s).`,
    stat: (s) => `+${p(s.amt)}% armour for ${s.dur}s when hurt · ${s.icd}s cd`, words: ['Shell', 'Hide'] },
  { id: 'armorKill', slot: 'armor', keys: ['beast', 'raw', 'death', 'blood'],
    on: 'kill', eff: 'armor', amt: 0.15, dur: 6,
    text: (s) => `Each kill raises your armour by ${p(s.amt)}% for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% armour for ${s.dur}s after a kill`, words: ['Hide', 'Trophy'] },
  { id: 'armorCast', slot: 'armor', keys: ['anchor', 'order', 'craft', 'light', 'absolve', 'fire'],
    on: 'cast', eff: 'armor', amt: 0.1, dur: 3,
    text: (s) => `After you use an ability, your armour rises by ${p(s.amt)}% for ${s.dur}s.`,
    stat: (s) => `+${p(s.amt)}% armour for ${s.dur}s after using an ability`, words: ['Guard', 'Bulwark'] },
  // ---- health ----
  { id: 'hpKill', slot: 'hp', keys: ['siphon', 'blood', 'life', 'renew', 'mend', 'beast'],
    on: 'kill', eff: 'heal', amt: 0.04,
    text: (s) => `Each kill heals you for ${p(s.amt)}% of your maximum health.`,
    stat: (s) => `heal ${p(s.amt)}% max health per kill`, words: ['Feast', 'Mend'] },
  { id: 'hpHurtLeech', slot: 'hp', keys: ['siphon', 'blood', 'dark', 'turn'],
    on: 'hurt', eff: 'lifedrain', amt: 0.15, dur: 4, icd: 8,
    text: (s) => `When you take damage, your hits heal you for ${p(s.amt)}% of the damage they deal for ${s.dur}s (at most once every ${s.icd}s).`,
    stat: (s) => `${p(s.amt)}% lifedrain for ${s.dur}s when hurt · ${s.icd}s cd`, words: ['Thirst', 'Mend'] },
  { id: 'hpCrit', slot: 'hp', keys: ['life', 'mend', 'renew', 'light', 'mind'],
    on: 'crit', eff: 'heal', amt: 0.02,
    text: (s) => `A critical hit heals you for ${p(s.amt)}% of your maximum health.`,
    stat: (s) => `heal ${p(s.amt)}% max health per critical hit`, words: ['Renewal', 'Mend'] },
];
export const THEME_SHAPE_BY_ID = Object.fromEntries(THEME_SHAPES.map(s => [s.id, s]));

function p(x) { return Math.round(x * 100); }
function ord(n) { return n === 2 ? 'second' : n === 3 ? 'third' : `${n}th`; }

/** Which generic slot an ability fills, or null when it is not a generic stat passive. */
export function themeSlotOf(a) {
  if (!a || a.kind !== 'passive' || a.canonKey) return null;
  if (a.template === 'passiveMove') return 'move';
  if (a.template === 'cooldownPassive') return 'cd';
  if (a.template === 'passiveBuff') {
    if (a.buffKind === 'dmg') return 'dmg';
    if (a.buffKind === 'crit') return 'crit';
    if (a.buffKind === 'armor') return 'armor';
    if (a.buffKind === 'maxHp' || !a.buffKind) return 'hp';
  }
  return null;
}

function stableHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Score every shape for one slot against the pairing, best first. `words` is { ess: [...], stone: [...] }
 *  (most characteristic first) or a plain list (all essence). A shape both halves of the pairing point at
 *  beats one only the essence points at: Sickle (reaping) + Eye (weak points) is a critical hit giving time
 *  back, not the kill refund every Sickle would get. */
export function rankThemeShapes(slot, words, seed, { afflictions = false, used = new Set() } = {}) {
  const ess = (Array.isArray(words) ? words : (words.ess || [])).map(x => String(x || '').toLowerCase());
  const stone = (Array.isArray(words) ? [] : (words.stone || [])).map(x => String(x || '').toLowerCase());
  const hits = (s, x) => !!x && s.keys.some(k => x === k || x.includes(k));
  const scored = [];
  for (const s of THEME_SHAPES) {
    if (s.slot !== slot) continue;
    if (s.aff && !afflictions) continue;   // "Affliction payoffs only in affliction kits"
    let e = 0, t = 0;
    ess.forEach((x, i) => { if (hits(s, x)) e += i === 0 ? 3 : i === 1 ? 2 : 1; });
    stone.forEach((x, i) => { if (hits(s, x)) t += i === 0 ? 3 : 2; });
    const clash = used.has(s.id) || used.has(`${s.on}|${s.eff}`);
    scored.push({ s, score: e + t + (e > 0 && t > 0 ? 3 : 0) - (clash ? 100 : 0), tie: stableHash(`${seed}|${s.id}`) });
  }
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);
  return scored.map(x => x.s);
}

/** The card sentence and stats fragment of a shape instance. */
export function themeText(shape) { const s = THEME_SHAPE_BY_ID[shape.id]; return s ? s.text(shape) : ''; }
export function themeStat(shape) { const s = THEME_SHAPE_BY_ID[shape.id]; return s ? s.stat(shape) : ''; }

// The generic sentences (and stats fragments) a themed passive no longer carries.
const GENERIC_SENTENCES = [
  /Your movement speed is permanently increased by \d+%\.\s*/,
  /Your (?:other )?abilities' cooldowns are \d+% shorter\.\s*/,
  /Everything you do deals \d+% more damage\.\s*/,
  /Your critical strike chance rises by \d+%\.\s*/,
  /Your armour rises by \d+%\.\s*/,
  /Your maximum health rises by \d+\.\s*/,
];
const GENERIC_STATS = /^(?:\+\d+% movement speed|-\d+% ability cooldowns|\+\d+% all damage|\+\d+% crit chance|\+\d+% armor|\+\d+ max HP)$/;

// Standing rungs whose runtime reads the flat figure a themed passive no longer has.
const FLAT_ONLY_RUNG = (x) => !!(x && (x.outlastsDeath || x.extendsToParty || x.extendsToSummons || x.extendsToMount || x.stacksWithItself));

/**
 * Turn one generic passive into its themed version. Returns the new spec (the input is not mutated).
 * `words` is the pairing ({ ess, stone }, see rankThemeShapes).
 */
export function themePassive(a, words, seed, ctx = {}) {
  const slot = themeSlotOf(a);
  if (!slot) return null;
  const ranked = rankThemeShapes(slot, words, seed, ctx);
  const s = ranked[0];
  if (!s) return null;
  const shape = { id: s.id, slot, on: s.on, eff: s.eff };
  for (const f of ['cond', 'amt', 'dur', 'icd', 'every']) if (s[f] !== undefined) shape[f] = s[f];
  const out = { ...a, themeShape: shape };
  // The flat figure is what the shape replaces; the swift lever's "other abilities' cooldowns are N% shorter"
  // rider is the exact overlap the user reported (Eye Haft vs Buzzing Narrow Waist), so it goes with it.
  if (slot === 'move') out.moveSpeedPct = 0;
  if (slot === 'cd' || out.cooldownReduction) out.cooldownReduction = 0;
  if (a.template === 'passiveBuff') out.amount = 0;
  let desc = String(a.desc || '');
  for (const re of GENERIC_SENTENCES) desc = desc.replace(re, '');
  out.desc = `${s.text(shape)}${desc.trim() ? ` ${desc.trim()}` : ''}`;
  const rest = String(a.stats || '').split(' · ').filter(x => x && !GENERIC_STATS.test(x.trim()));
  out.stats = [s.stat(shape), ...rest].join(' · ');
  if (Array.isArray(a.rankAspects)) {
    const labels = new Set(a.rankAspects.map(x => x.label));
    out.rankAspects = a.rankAspects.map(x => {
      if (!FLAT_ONLY_RUNG(x)) return x;
      const pot = 'what it gives you counts for 25% more';
      if (!labels.has(pot)) { labels.add(pot); return { rank: x.rank, kind: 'standing', label: pot, ladder: 'standing', potency: 0.25 }; }
      const uns = 'it cannot be suppressed or dispelled';
      if (!labels.has(uns)) { labels.add(uns); return { rank: x.rank, kind: 'standing', label: uns, ladder: 'standing', unsuppressable: true }; }
      return { rank: x.rank, kind: 'standing', label: 'what it gives you counts for 15% more', ladder: 'standing', potency: 0.15 };
    });
  }
  return out;
}
