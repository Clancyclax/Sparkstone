// ===========================================================================
// A MASTER'S LESSONS, FOR THOSE WHO DO NOT FOLLOW THEIR ART (round 401; reworked round 402).
//
// Round 401 (the user): "completing quests for the other masters awards you rank appropriate gear related to that
// masters art ... a 3 part quest chain which grant Quest 1) an uncommon trinket (Player chooses Ring or Amulet)
// Quest 2) a rare piece of armor Quest 3) an epic piece of gear (Player chooses weapon or armor)."
// Round 402 (the user): "Lets fix the sameyness, and for the martial arts remember it's 3 quests available for each
// rank so it can't just be the same 3 quests again at silver that it was at iron and bronze. Further into
// (art-specific philosophy and task shapes, and fixing the gift choices). Martial arts quests bronze and up should
// occasionally require journey outside the region where they start. Silver and up always require travel outside the
// region. Mark the location on the world map of the location needed to travel to for materials, challenges or events."
//
// SO: three lessons AT EVERY RANK (Normal .. Gold; there is no Diamond rank), each rank with its own gifts at that
// rank's gear. The three are a PRACTICE (counted: defeats with the master's weapon, crits, dodges, blocks, kills
// standing your ground, unbroken runs, spell kills, a family, night hunting), a JOURNEY (meditate, gather a material,
// keep a vigil at dawn / dusk / night, carry a letter to another master, a two-stop pilgrimage) and a TRIAL (a
// champion, two rivals, holding a place against waves, a proving fought on the art's own terms, a night hunt). Which
// shape a rank gets is a per-master permutation, so no master sets the same shape twice across the five ranks, and an
// art's theme decides which practices it has at all. WHERE: Normal and Iron stay home; Bronze sometimes goes abroad
// (another region, or a square of the world map); Silver and Gold always do -- even the practice is counted abroad.
// THE TALK is the art's own: its image (the Adder, the Tortoise, the Meteor, from the art's name) and its theme's
// tenets, with a voice that changes as the student rises.
// ===========================================================================
import { rollGearItem, rollWeaponItem, BUFF_BASE, ARMOR_SLOTS } from './stats.js';

const ELS = ['fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant'];
export const LESSON_RANK_NAMES = ['Normal', 'Iron', 'Bronze', 'Silver', 'Gold'];
export const lessonRankOf = (playerRankIdx) => Math.max(0, Math.min(4, playerRankIdx | 0));

// channel -> the gear stats that speak for it
const CHANNEL_STATS = {
  dodge: ['dodgeChance'], crit: ['critChance', 'critDamage'], guard: ['armor', 'blockChance'], damage: ['critDamage'],
  weaponDamage: ['attackSpeed', 'critDamage'], swingSpeed: ['attackSpeed'], swingThrift: ['staminaRegen', 'maxStamina'],
  moveSpeed: ['dodgeChance', 'attackSpeed'], haste: ['castSpeed'], tempo: ['cooldownReduction'], focus: ['manaRegen', 'maxMana'],
  killFocus: ['manaRegen'], wind: ['staminaRegen'], killWind: ['maxStamina', 'staminaRegen'], vigor: ['hpRegen', 'maxHp'],
  mend: ['hpRegen', 'maxHp'], killMend: ['maxHp'], leech: ['hpRegen', 'critChance'], thrift: ['manaRegen', 'staminaRegen'],
};
const WEAPON_WORD = { great: 'great weapon', twohand: 'two-handed weapon', single: 'single one-handed weapon', dual: 'weapon in each hand', shield: 'shield', blade: 'blade', heavy: 'heavy weapon', polearm: 'polearm', ranged: 'bow' };
const WITH = { dual: 'with a weapon in each hand', shield: 'with a shield on your arm', single: 'with one weapon in one hand, and nothing in the other' };
export const weaponWord = (w) => WEAPON_WORD[w] || w;
const withWeapon = (w) => WITH[w] || `with ${/^[aeiou]/.test(weaponWord(w)) ? 'an' : 'a'} ${weaponWord(w)} in your hands`;
// The weapon a gift weapon is, for an art's weapon condition. A shield art's partner is a one-hander that sits beside
// a shield (the hammer); a two-handed or heavy art's is a maul.
const GIFT_WEAPON = {
  dagger: 'dagger', sword: 'sword', axe: 'axe', hammer: 'hammer', spear: 'spear', scythe: 'scythe', whip: 'whip',
  greatsword: 'greatsword', greataxe: 'greataxe', glaive: 'glaive', maul: 'maul', javelin: 'javelin', staff: 'staff',
  bow: 'bow', crossbow: 'crossbow', great: 'greatsword', blade: 'sword', heavy: 'maul', polearm: 'spear', ranged: 'bow',
  shield: 'hammer', twohand: 'maul', single: 'sword',
};

/** What an art is about: { element, weapon, stats, dodge, heavy, crit, caster, vigor, speed, image, imageFull, label, primary }. */
export function artTheme(art) {
  const out = { element: null, weapon: null, stats: [], dodge: false, heavy: false, crit: false, caster: false, vigor: false, speed: false,
    image: 'body', imageFull: 'body', label: 'the body', primary: 'body' };
  if (!art) return out;
  const keys = [];
  for (const cl of (art.clauses || [{ cond: art.cond, fx: art.fx || {} }])) {
    const w = /^w_(\w+)$/.exec(cl.cond || '');
    if (w && !out.weapon) out.weapon = w[1];
    const r = /^res_(\w+)$/.exec(cl.cond || '');
    if (r && !out.element && ELS.includes(r[1])) out.element = r[1];
    for (const k of Object.keys(cl.fx || {})) {
      if ((cl.fx[k] || 0) <= 0) continue;
      const e = /^(?:spell|wscale|\w+Per)_(\w+)$/.exec(k);
      if (e && ELS.includes(e[1])) { if (!out.element) out.element = e[1]; const per = /^(\w+)Per_/.exec(k); if (per) keys.push(per[1]); continue; }
      keys.push(k);
    }
  }
  const th = /^w_(\w+)$/.exec(art.theme || ''); if (th && !out.weapon) out.weapon = th[1];
  const el = /^el_(\w+)$/.exec(art.theme || ''); if (el && !out.element) out.element = el[1];
  for (const k of keys) for (const s of (CHANNEL_STATS[k] || [])) if (!out.stats.includes(s)) out.stats.push(s);
  out.dodge = keys.includes('dodge') || keys.includes('moveSpeed');
  out.heavy = keys.includes('guard') || ['shield', 'hammer', 'maul', 'heavy', 'twohand', 'greatsword', 'greataxe', 'great'].includes(out.weapon);
  out.crit = keys.includes('crit') || out.weapon === 'dagger';
  out.caster = keys.some(k => ['haste', 'focus', 'killFocus', 'tempo'].includes(k)) || out.weapon === 'staff';
  out.vigor = keys.some(k => ['vigor', 'mend', 'killMend', 'leech'].includes(k));
  out.speed = keys.some(k => ['swingSpeed', 'moveSpeed', 'haste', 'tempo'].includes(k));
  if (out.element) out.stats.unshift(`resist_${out.element}`);
  if (out.crit && !out.stats.includes('critChance')) out.stats.unshift('critChance');
  if (out.dodge && !out.stats.includes('dodgeChance')) out.stats.unshift('dodgeChance');
  if (out.heavy && !out.stats.includes('armor')) out.stats.unshift('armor');
  if (!out.stats.length) out.stats.push('maxHp');
  // the art's image, from its name: "Path of the Fanged Adder" -> adder / fanged adder
  const m = / of the (.+)$/i.exec(art.name || '');
  if (m) { out.imageFull = m[1].toLowerCase(); out.image = out.imageFull.split(' ').pop(); }
  // the primary theme: what the art is most about, for the gift's name and the talk
  out.primary = out.element ? out.element : out.crit ? 'crit' : out.heavy ? 'heavy' : out.dodge ? 'dodge' : out.caster ? 'caster'
    : out.weapon ? 'weapon' : out.vigor ? 'vigor' : out.speed ? 'speed' : 'body';
  out.label = out.element ? `${out.element}` : out.weapon ? `the ${weaponWord(out.weapon)}`
    : out.dodge ? 'the step aside' : out.heavy ? 'the wall' : out.caster ? 'the still mind' : 'the body';
  return out;
}

function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function rng(seed) { let h = hash(seed); return () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296; }; }
function perm(list, seed) { const a = list.slice(), r = rng(seed); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

// ---------------------------------------------------------------------------
// THE GIFTS
// ---------------------------------------------------------------------------
const GEAR_RANK = (rankIdx) => ['iron', 'iron', 'bronze', 'silver', 'gold'][lessonRankOf(rankIdx)];
const SUFFIX = {
  maxHp: 'of Vigor', maxStamina: 'of Endurance', maxMana: 'of the Wellspring', critChance: 'of the Hawk', critDamage: 'of Ruin',
  blockChance: 'of the Wall', armor: 'of the Bulwark', dodgeChance: 'of the Fox', hpRegen: 'of Mending', staminaRegen: 'of the Marathon',
  manaRegen: 'of Clarity', attackSpeed: 'of the Zephyr', castSpeed: 'of Quicksilver', cooldownReduction: 'of Readiness',
};
const PRIMARY_SUFFIX = {
  fire: 'of Embers', frost: 'of the Rime', lightning: 'of the Storm', nature: 'of the Thorn', shadow: 'of Dusk', radiant: 'of Dawn',
  crit: 'of the Hawk', heavy: 'of the Bulwark', dodge: 'of the Fox', caster: 'of Clarity', vigor: 'of Mending', speed: 'of the Zephyr',
};

/** The gift for lesson `stage` at `rankIdx`. stage 1: 'ring'|'amulet' (Uncommon); 2: armour (Rare); 3: 'weapon'|'armor' (Epic).
 *  Returns a loot drop { kind: 'gear', item } or { kind: 'weapon', id, rec }. */
export function masterGift(stage, choice, art, rankIdx, seed, masterName = 'A master') {
  const T = artTheme(art);
  const r = rng(`gift|${seed}|${rankIdx}|${stage}|${choice}`);
  const rarity = stage === 1 ? 'Uncommon' : stage === 2 ? 'Rare' : 'Epic';
  const rank = GEAR_RANK(rankIdx);
  const level = 5;
  const short = String(masterName).replace(/^(Master|Mistress|Old|Sister|Brother|Mother|Father|Grandmother|Grandmaster) /, '').split(' ')[0];
  if (stage === 3 && choice === 'weapon') {
    // the art's own weapon; else what the theme fights with: heavy -> maul, crit -> dagger, element / caster -> staff
    const base = GIFT_WEAPON[T.weapon] || (T.heavy ? 'maul' : T.crit ? 'dagger' : (T.caster || T.element) ? 'staff' : 'sword');
    const rec = rollWeaponItem(r, base, 'Epic', rank, level, { theme: T.element || null });
    if (!rec) return null;
    themeBuffs(rec.buffs || (rec.buffs = []), T);
    if (T.element) rec.gearTyped = { type: T.element, convert: 0.3 };   // an element art's weapon deals its element
    rec.masterFx = themeEffects(T, stage, rankIdx);   // read while wielded (WorldScene's gearFx call)
    rec.name = giftName(short, rec.name, T, rec.buffs);
    rec.giftOf = masterName;
    return { kind: 'weapon', id: rec.wid, rec };
  }
  let slot;
  if (stage === 1) slot = choice === 'amulet' ? 'amulet' : 'ring';
  else {
    const pool = T.heavy ? ['chest', 'legs', 'helmet'] : T.dodge ? ['boots', 'legs', 'gloves'] : T.crit ? ['gloves', 'helmet', 'boots'] : ARMOR_SLOTS;
    slot = pool[Math.floor(r() * pool.length)];
  }
  const item = rollGearItem(r, slot, rarity, rank, level, { theme: T.element || null });
  themeBuffs(item.buffs, T);
  // heavy armour for a guard / heavy-weapon art, light for a dodging one (gearDamageTypes.js armourClassOf reads it)
  if (ARMOR_SLOTS.includes(slot)) { if (T.heavy) item.armourClass = 'heavy'; else if (T.dodge) item.armourClass = 'light'; }
  item.effects = [...(item.effects || []), ...themeEffects(T, stage, rankIdx)];
  item.name = giftName(short, item.name, T, item.buffs);
  item.giftOf = masterName;
  return { kind: 'gear', item };
}

/** "Kesh's River-silver Gauntlets of Embers": the roller's prefix and noun, the suffix of the art's PRIMARY theme (so a
 *  fire art that also dodges is "of Embers", not "of the Fox"). */
function giftName(short, rolled, T, buffs) {
  const core = String(rolled).replace(/\s+of\s+.*$/, '').replace(/\b[\w]+-(Touched|Forged|Kissed|Bound)\s+/g, '').trim();
  let suf = PRIMARY_SUFFIX[T.primary];
  if (!suf) { const first = (buffs || []).find(b => !b.inherent && SUFFIX[b.stat]); suf = first ? SUFFIX[first.stat] : ''; }
  return `${short}'s ${core}${suf ? ' ' + suf : ''}`.replace(/\s+/g, ' ');
}

/** Turn a piece's rolled stat lines to the theme's stats, line for line, keeping each line's size. At least two. */
function themeBuffs(buffs, T) {
  const rolled = buffs.filter(b => !b.inherent);
  const want = T.stats.slice(0, Math.max(2, rolled.length));
  const ratio0 = rolled.length ? (rolled[0].amount / (BUFF_BASE[rolled[0].stat] || rolled[0].amount || 1)) : 1;
  want.forEach((stat, i) => {
    const base = BUFF_BASE[stat];
    if (!base) return;
    const b = rolled[i];
    const ratio = b ? (b.amount / (BUFF_BASE[b.stat] || b.amount || 1)) : ratio0;
    const amount = (stat === 'maxHp' || stat === 'maxStamina' || stat === 'maxMana' || stat === 'armor') ? Math.round(base * ratio) : Math.round(base * ratio * 1000) / 1000;
    if (b) { b.stat = stat; b.amount = amount; } else buffs.push({ stat, amount });
  });
}

/** The theme's effects (itemEffects.js shape: { text, fx }), a little stronger each rank. */
function themeEffects(T, stage, rankIdx = 1) {
  const out = [];
  const k = ([0, 1, 1.6, 2.4][stage] || 1) * (1 + 0.15 * Math.max(0, lessonRankOf(rankIdx) - 1));
  if (T.element) {
    const v = Math.round(0.05 * k * 100) / 100;
    out.push({ text: `${cap(T.element)} damage +${Math.round(v * 100)}%`, fx: { elementDmg: { [T.element]: v } }, master: true });
  }
  if (T.dodge && stage >= 2) {
    const v = Math.round(0.4 * k * 100) / 100;
    out.push({ text: `When you dodge, strike back for ${Math.round(v * 100)}% of your weapon's damage`, fx: { onDodgeRiposte: v }, master: true });
  } else if (T.dodge) {
    const v = Math.round(0.04 * k * 100) / 100;
    out.push({ text: `When you dodge, recover ${Math.round(v * 100)}% of your stamina`, fx: { onDodgeWind: v }, master: true });
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE LESSONS
// ---------------------------------------------------------------------------
const NEED = {
  kill: [20, 30, 45, 65, 90], crit: [15, 25, 40, 60, 80], dodge: [10, 18, 28, 40, 55], block: [10, 18, 28, 40, 55],
  noHit: [5, 8, 12, 16, 20], stillKill: [8, 12, 18, 25, 35], spellKill: [15, 25, 40, 60, 80], familyKill: [10, 15, 20, 25, 30],
  nightKill: [10, 15, 25, 35, 50],
};
const MATERIAL = {
  fire: 'ember-glass from the cooled vents', frost: 'rime-salt from under the ice', lightning: 'fulgurite where the lightning struck',
  nature: 'heartwood resin', shadow: 'duskcap mushrooms that only open in shade', radiant: 'dawnstone dust',
  crit: 'hawk feathers shed in the hunt', heavy: 'iron-bark from the old trees', dodge: 'windfeathers caught in the grass',
  caster: 'still water from a spring nobody has drunk from', vigor: 'bloodroot', speed: 'swift-reed', weapon: 'a whetstone of the river\'s own stone',
  body: 'river stones worn smooth',
};
const VIGILS = [
  { win: 'dawn', from: 5, to: 7.5, text: 'at dawn' }, { win: 'dusk', from: 18, to: 20.5, text: 'at dusk' },
  { win: 'night', from: 21, to: 28, text: 'through the night' },   // 21:00 .. 04:00
];
/** Is `hour` (0..24) inside a vigil's window ('dawn' | 'dusk' | 'night')? */
export function inWindow(hour, win) {
  const v = VIGILS.find(x => x.win === win);
  if (!v) return true;
  const h = hour < v.from - 12 ? hour + 24 : hour;
  return h >= v.from && h < v.to;
}
const CHAMP_TITLES = ['the Old', 'the Unbroken', 'Ashjaw', 'the Pale', 'the Long-Toothed', 'Stormback', 'Gravehide', 'the Hungry', 'the Patient', 'Ironmaw', 'the Last', 'Nightcoat'];

/** The practices an art has: theme-specific first, then the general ones, at least five distinct. */
export function practiceKinds(T) {
  const out = [];
  if (T.weapon) out.push('weaponKill');
  if (T.crit) out.push('crit');
  if (T.dodge) out.push('dodge', 'noHit');
  if (T.heavy) out.push('block', 'stillKill');
  if (T.element || T.caster) out.push('spellKill');
  for (const g of ['familyKill', 'nightKill', 'noHit', 'stillKill', 'kill']) if (!out.includes(g)) out.push(g);
  return out;
}
const GENERAL_PRACTICE = ['familyKill', 'nightKill', 'noHit', 'stillKill', 'kill'];
export const JOURNEY_KINDS = ['meditate', 'gather', 'vigil', 'deliver', 'pilgrimage'];
export const TRIAL_KINDS = ['champion', 'rivals', 'waves', 'proving', 'nightHunt'];

/** Does lesson `stage` at `rankIdx` go abroad? Normal/Iron never; Bronze sometimes (about one lesson in three); Silver
 *  and Gold always. */
export function lessonAbroad(rankIdx, stage, seed) {
  const r = lessonRankOf(rankIdx);
  if (r <= 1) return false;
  if (r >= 3) return true;
  return (hash(`abroad|${seed}|${stage}`) % 1000) / 1000 < 0.34;
}

/**
 * Lesson `stage` (1..3) at `rankIdx` for a master of `art`. `ctx`:
 *   home:    { area, label, square?, sheet?, sx?, sy? }                 the master's own region or world-map square
 *   local:   [{ x, y, place, tier, area, areaLabel }]                   places in the home region (may be empty: a dojo square)
 *   abroad:  [{ x?, y?, place, tier, area, areaLabel, sheet?, sx?, sy?, south? }]   places elsewhere (region spots, map squares)
 *   champions(tier) -> [{ key, label }], families(tier) -> [{ family, label }]
 *   masters: [{ key, name, place, area, local, dest }]                  others a letter can go to
 * The kind is a per-master permutation over the ranks, so a master never sets the same shape at two ranks.
 */
export function masterLesson(stage, art, rankIdx, seed, ctx = {}) {
  const T = artTheme(art);
  const rk = lessonRankOf(rankIdx);
  const r = rng(`lesson|${seed}|${rk}|${stage}`);
  const pick = (a) => (a && a.length ? a[Math.floor(r() * a.length)] : null);
  const tier = Math.max(1, Math.min(4, rk || 1));
  const abroad = lessonAbroad(rk, stage, seed);
  const home = ctx.home || { area: null, label: 'here' };
  // a destination for this lesson: abroad (rank-fitting first) or at home
  const dest = (avoid = null) => {
    if (abroad) {
      const pool = (ctx.abroad || []).filter(s => s.area !== home.area && (!avoid || s.area !== avoid));
      const fit = pool.filter(s => rk >= 4 ? (s.tier >= 3) : Math.abs((s.tier || 1) - tier) <= 1);
      return pick(fit.length ? fit : pool) || pick(ctx.local) || null;
    }
    const loc = (ctx.local || []).filter(s => !avoid || s.area !== avoid || true).filter(s => !avoid || s.place !== avoid);
    if (loc.length) return pick(loc);
    return home.area ? { area: home.area, areaLabel: home.label, place: home.label, sheet: home.sheet, sx: home.sx, sy: home.sy, tier } : null;
  };
  const champ = () => {
    const c = pick((ctx.champions && ctx.champions(tier)) || []);
    return c ? { key: c.key, name: `${c.label} ${CHAMP_TITLES[Math.floor(r() * CHAMP_TITLES.length)]}` } : null;
  };
  const destOf = (d) => d ? { area: d.area, areaLabel: d.areaLabel, place: d.place, x: d.x ?? null, y: d.y ?? null, sheet: d.sheet, sx: d.sx, sy: d.sy, square: d.x == null } : null;

  if (stage === 1) {
    // the art's own practices first (in a per-master order), then the general ones: every theme practice an art has is
    // set at some rank before a general one is
    const kinds = practiceKinds(T);
    const themed = new Set([T.weapon && 'weaponKill', T.crit && 'crit', T.dodge && 'dodge', T.dodge && 'noHit', T.heavy && 'block', T.heavy && 'stillKill', (T.element || T.caster) && 'spellKill'].filter(Boolean));
    const own = kinds.filter(k => themed.has(k)), gen = kinds.filter(k => !themed.has(k));
    const order = [...perm(own, `practice|${seed}`), ...perm(gen, `practiceg|${seed}`)];
    const kind = order[rk % order.length];
    const ev = kind === 'weaponKill' ? 'kill' : kind;
    const need = (NEED[ev] || NEED.kill)[rk];
    const s = { kind: 'count', ev, need, have: 0 };
    let what;
    if (kind === 'weaponKill') { s.weapon = T.weapon; what = `Defeat ${need} monsters ${withWeapon(T.weapon)}`; }
    else if (kind === 'crit') what = `Land ${need} critical hits`;
    else if (kind === 'dodge') what = `Dodge ${need} blows`;
    else if (kind === 'block') what = `Block ${need} blows`;
    else if (kind === 'noHit') what = `Defeat ${need} monsters in a row without being hit`;
    else if (kind === 'stillKill') what = `Defeat ${need} monsters without moving your feet`;
    else if (kind === 'spellKill') { s.el = T.element || null; what = `Defeat ${need} monsters with ${T.element ? `${T.element} magic` : 'your spells'}`; }
    else if (kind === 'familyKill') {
      const f = pick((ctx.families && ctx.families(tier)) || []);
      if (f) { s.family = f.family; what = `Defeat ${need} ${f.label}`; } else { s.ev = 'kill'; what = `Defeat ${need} monsters`; }
    } else if (kind === 'nightKill') { s.win = 'night'; what = `Defeat ${need} monsters at night`; }
    else what = `Defeat ${need} monsters`;
    s.shape = kind;
    if (abroad) { const d = dest(); if (d) { s.area = d.area; s.areaLabel = d.areaLabel; s.place = d.areaLabel; s.dest = destOf(d); what += ` in ${d.areaLabel}`; } }
    s.label = what;
    return s;
  }

  if (stage === 2) {
    const kind = perm(JOURNEY_KINDS, `journey|${seed}`)[rk % JOURNEY_KINDS.length];
    if (kind === 'deliver') {
      const ms = (ctx.masters || []).filter(m => abroad ? m.area !== home.area : m.local);
      const to = pick(ms.length ? ms : (ctx.masters || []));
      if (to) return { kind: 'deliver', shape: 'deliver', to: to.key, toName: to.name, place: to.place, need: 1, have: 0, dest: to.dest || null,
        label: `Carry a letter to ${to.name}, at ${to.place}` };
    }
    if (kind === 'pilgrimage') {
      const a = dest(), b = dest(a && (abroad ? a.area : a.place));
      if (a && b && a.place !== b.place) return { kind: 'visit', shape: 'pilgrimage', need: 6, have: 0, stops: [destOf(a), destOf(b)], at: 0,
        place: a.place, dest: destOf(a), label: `Walk the way I walked: sit at ${a.place}, then at ${b.place}` };
    }
    const d = dest();
    if (!d) return { kind: 'count', ev: 'kill', shape: 'kill', need: NEED.kill[rk], have: 0, label: `Defeat ${NEED.kill[rk]} monsters` };
    if (kind === 'gather') {
      const mat = MATERIAL[T.primary] || MATERIAL.body;
      return { kind: 'visit', shape: 'gather', need: 6, have: 0, dest: destOf(d), place: d.place, material: mat,
        label: `Gather ${mat} at ${d.place}, and bring it back` };
    }
    if (kind === 'vigil') {
      const v = VIGILS[Math.floor(r() * VIGILS.length)];
      return { kind: 'visit', shape: 'vigil', need: 10, have: 0, win: v.win, dest: destOf(d), place: d.place,
        label: `Keep a vigil at ${d.place} ${v.text}` };
    }
    return { kind: 'visit', shape: 'meditate', need: 8, have: 0, dest: destOf(d), place: d.place,
      label: `Go to ${d.place} and meditate there` };
  }

  // stage 3 -- the trial
  const kind = perm(TRIAL_KINDS, `trial|${seed}`)[rk % TRIAL_KINDS.length];
  const d = dest();
  const c = champ();
  if (!d || !c) return { kind: 'count', ev: 'kill', shape: 'kill', need: NEED.kill[rk] * 2, have: 0, label: `Defeat ${NEED.kill[rk] * 2} monsters` };
  const base = { kind: 'champion', need: 1, have: 0, dest: destOf(d), place: d.place, champs: [{ key: c.key, name: c.name, uid: null, done: false }] };
  if (kind === 'rivals') {
    const c2 = champ() || c;
    base.champs.push({ key: c2.key, name: c2.name === c.name ? `${c2.name} the Younger` : c2.name, uid: null, done: false });
    base.need = 2;
    return { ...base, shape: 'rivals', label: `Two who would end you wait at ${d.place}: ${c.name} and ${base.champs[1].name}. Win` };
  }
  if (kind === 'waves') {
    const waves = 2 + Math.min(2, Math.floor(rk / 2));
    return { kind: 'waves', shape: 'waves', need: waves, have: 0, dest: destOf(d), place: d.place, waveKey: c.key, uids: [],
      label: `Hold ${d.place} against ${waves} waves` };
  }
  if (kind === 'proving') {
    const cond = T.dodge ? 'noHit' : T.heavy ? 'still' : T.weapon ? 'weapon' : (T.element || T.caster) ? 'spell' : 'noHit';
    const how = cond === 'noHit' ? 'without letting it touch you' : cond === 'still' ? 'without giving ground -- your feet do not move'
      : cond === 'weapon' ? withWeapon(T.weapon) : `with ${T.element ? `${T.element} magic` : 'your spells'} for the last blow`;
    return { ...base, shape: 'proving', cond, weapon: T.weapon || null, el: T.element || null, label: `Face ${c.name} at ${d.place} ${how}, and win` };
  }
  if (kind === 'nightHunt') return { ...base, shape: 'nightHunt', win: 'night', label: `Hunt ${c.name} at ${d.place}. It only comes out at night` };
  return { ...base, shape: 'champion', label: `Face ${c.name} at ${d.place}, and win` };
}

// ---------------------------------------------------------------------------
// THE TALK -- the art's own image and its theme's tenets, in a voice that changes as the student rises
// ---------------------------------------------------------------------------
const TENETS = {
  fire: ['Fire is not anger. Anger burns out; fire only stops when there is nothing left to feed it.', 'Feed it a little, all the time. A fire you starve and then flood is a fire that kills its keeper.', 'Heat goes where it is let. Learn to be the opening, not the wall.', 'Everything that burns was something first. Respect what you spend.', 'The coals do more work than the flame. Nobody watches the coals.', 'Smoke is the part of a fire that has given up. Do not fight like smoke.'],
  frost: ['Cold does not hurry. It arrives, and then it has always been there.', 'Ice is water that decided to stay. Decide.', 'The deepest cold is quiet. If you can hear it, it is not done yet.', 'Slow them first. Everything after is easy.', 'A frozen lake looks like a floor until it is not. So should you.', 'Patience is not waiting. Patience is cold, working.'],
  lightning: ['Lightning does not aim. It finds the shortest road and takes it.', 'Be the strike that has already happened by the time they hear it.', 'Charge builds where it is held. Hold it longer than they think you can.', 'Storms are mostly waiting. The bolt is the least of it.', 'The air remembers a strike for a moment after. Fight in that moment.', 'Never stand on the high ground in someone else\'s storm.'],
  nature: ['The forest does not fight. It outlasts.', 'A root splits stone by never stopping.', 'Everything here eats and is eaten. The art is knowing which you are today.', 'Grow toward the light, but keep your roots in the dark.', 'The thorn is not cruelty. It is a boundary, kept.', 'What bends in the wind is still there in the morning.'],
  shadow: ['Shadow is not the absence of light. It is the shape light leaves behind.', 'Be where they are not looking, and then be gone before they look.', 'The dark is patient with those who are patient with it.', 'A shadow moves with its maker. Know whose shadow you are.', 'Silence is a weapon. Most people waste it.', 'Those who fear the dark are already halfway yours.'],
  radiant: ['Light reveals. Make sure you are ready to see what it shows.', 'The dawn does not argue with the night. It simply arrives.', 'Shine on those you guard, not in the eyes of those you fight. The difference matters.', 'Radiance is generosity. It costs you, every time.', 'A lamp held too close blinds the one holding it.', 'Even the sun casts shadows. Know where yours fall.'],
  dagger: ['The dagger is honest. It asks you to come close, and it does not pretend otherwise.', 'Short steel, long patience.', 'Find the gap. There is always a gap. Then be in it.', 'A dagger in the open is a promise. In the dark it is a fact.', 'The first cut is the one that matters. The rest are bookkeeping.', 'Do not trade blows. Trade nothing. Take.'],
  sword: ['The sword is a conversation. Most people only know how to shout.', 'The edge does the work. Your job is to put it in the right place.', 'Balance first. A sword in an unbalanced hand is a gift to the enemy.', 'Cut, recover, cut. Never cut twice when you have not recovered once.', 'A good guard is an invitation the enemy cannot refuse.', 'The blade remembers every lazy line you have ever drawn with it.'],
  axe: ['The axe does not ask. It arrives.', 'Wood splits along its grain. So do people. Find the grain.', 'Commit, or put it down. A half-swung axe is a broken wrist.', 'The weight carries the swing. Let it.', 'There is no subtle axe. There is only the right moment.', 'Chop the tree you are standing in front of.'],
  hammer: ['The hammer does not cut. It insists.', 'Every blow is a nail. Drive it home or do not swing.', 'Armour is a promise. The hammer breaks promises.', 'Weight is patience you can hold in one hand.', 'Ring the bell. Let them hear it coming. It changes nothing.', 'A smith never hits the same spot twice by accident.'],
  spear: ['The spear is distance made into a weapon. Keep it.', 'Point first, always. Everything else follows the point.', 'They must come to you, and the spear is already there.', 'A spear wall is many people agreeing. A spear alone is one person refusing.', 'Long reach, short temper is how spearmen die. Keep the reach.', 'Thrust and return. The return is half the lesson.'],
  scythe: ['The scythe is for harvest. Everything ripens.', 'Wide strokes, low and even. The field does not get a vote.', 'It looks slow. It is not slow. It is only certain.', 'Reap what is in front of you. Do not reach for the next row.', 'Death carries one for a reason. Think about it.', 'The handle is long so that you remember how far away the blade is.'],
  whip: ['The whip is a promise kept at a distance.', 'The crack is the tip moving faster than sound. Everything else is just rope.', 'Control the line and you control the space.', 'A whip hurts its master first. Learn that early.', 'It is not strength. It is timing, all the way down.', 'Coil, wait, uncoil. Most of the art is the waiting.'],
  great: ['A great weapon is a commitment. You cannot take it back halfway.', 'Let the weight do the talking. Your arms are only there to steer.', 'One blow that lands is worth a dozen that are clever.', 'Wide is not the same as wild.', 'Plant your feet. The ground is part of the swing.', 'Big weapons forgive nothing. Neither should you.'],
  staff: ['The staff is a long breath. Both ends matter.', 'A staff is a walking stick until it is not. Let them forget which.', 'Strike, turn, strike. The staff has no back edge to waste.', 'The wood remembers every hand that held it.', 'A mage leans on a staff; a fighter leans into it.', 'It is a weapon that does not look like one. That is half its use.'],
  ranged: ['The arrow is gone the moment it leaves. Aim with everything before that.', 'Distance is a gift. Spend it slowly.', 'Breathe out, then loose. Never the other way.', 'The target moves. Shoot where it is going to be.', 'A quiver is a budget. Count it.', 'The best shot is the one they never knew was coming.'],
  shield: ['The shield is not for hiding. It is for deciding where the blow lands.', 'A wall that moves is a wall they cannot go around.', 'Block, then answer. A shield that only blocks is a door with no house.', 'Every dent is a lesson someone else paid for.', 'Your shield is for the person behind you, too.', 'Lean into the blow. Never away.'],
  dual: ['Two hands, two thoughts, one fight.', 'One blade asks; the other answers.', 'The off hand is not a spare. It is a second opinion.', 'Never let both blades be busy at once.', 'Rhythm. Two blades without rhythm are just noise.', 'Cross, part, cross. Like breathing.'],
  dodge: ['The best block is not being there.', 'Move less. The less you move, the less they can read.', 'A blow that misses is a blow they have to recover from. You do not.', 'Watch their shoulders, not their weapon.', 'Lightness is not weakness. Ask a leaf in a storm.', 'You are not running away. You are choosing where to stand.'],
  heavy: ['Plant yourself. Let the fight come to you.', 'The mountain does not dodge.', 'Every step back is ground you will have to take again.', 'Weight is a decision. Make it once.', 'Endure first. Win second.', 'They tire. You do not. That is the whole secret.'],
  crit: ['There is a weak point. There is always a weak point. Patience finds it.', 'One true strike is worth a hundred honest ones.', 'Look for the gap between their breaths.', 'Precision is mercy. It ends things.', 'The hawk does not chase. It waits, and then it does not miss.', 'Find the seam, and pull.'],
  caster: ['The still mind casts truest.', 'Magic is breath. Do not hold it, do not gasp it.', 'Every spell is a question asked of the world. Ask clearly.', 'Haste is not speed. A clear mind is speed.', 'Between one spell and the next is where the battle is decided.', 'Empty the mind, and the mana follows.'],
  vigor: ['The body keeps a ledger. Pay what you owe.', 'A wound is a teacher. Listen, then close it.', 'Outlast. Most fights are lost by the one who stops first.', 'Blood given, blood taken. The scales should tip your way.', 'Rest is a weapon. Most people never draw it.', 'Strength that will not be there tomorrow is not strength.'],
  speed: ['Fast is smooth. Smooth is fast.', 'Be done before they begin.', 'Speed is not hurry. Hurry makes mistakes.', 'Step inside their timing and stay there.', 'The quick are not those who move most, but those who waste least.', 'There is always time for one more strike. Find it.'],
  body: ['The body knows things the mind is too proud to learn.', 'Breathe. Everything else follows the breath.', 'Practice is a promise to your future self.', 'Do the simple thing until it is no longer simple.', 'Form first. Power comes uninvited, later.', 'The art is not in the fist. It is in the person behind it.'],
};
const TENET_KEY = { greatsword: 'great', greataxe: 'great', maul: 'great', glaive: 'spear', javelin: 'ranged', bow: 'ranged', crossbow: 'ranged',
  blade: 'sword', heavy: 'hammer', polearm: 'spear', twohand: 'great', single: 'sword', great: 'great' };
/** The tenet lists an art draws on: its element, its weapon, its flags, then the body. */
export function tenetKeys(T) {
  const out = [];
  if (T.element) out.push(T.element);
  if (T.weapon) out.push(TENET_KEY[T.weapon] || T.weapon);
  if (T.crit) out.push('crit');
  if (T.dodge) out.push('dodge');
  if (T.heavy) out.push('heavy');
  if (T.caster) out.push('caster');
  if (T.vigor) out.push('vigor');
  if (T.speed) out.push('speed');
  out.push('body');
  return out.filter((k, i) => TENETS[k] && out.indexOf(k) === i);
}
// Openers by stage, with the art's image. The voice: 0-1 a beginner, 2 a journeyman, 3 an adept, 4 a peer.
const OPEN = {
  1: [
    ['Watch the {image}. It does not think about what it does. Neither should your hands -- not yet.', 'Before anything else, the {image} learns its own body. So will you.', 'They call it {art}. The name is the last thing you need. The practice is the first.'],
    ['You have the shape of it. Now the {image} wants your habits.', 'Again, and properly this time. The {image} does nothing by halves.', 'Your hands remember the first lessons. Make them forget your bad ones.'],
    ['You think like a {image} now, sometimes. I want always.', 'At your rank the body is not the problem. The lazy hour is.', 'Most stop practising here. That is why most stop here.'],
    ['You are past drills. So we drill harder.', 'There is a {imageFull} in you now. Feed it, or it goes hungry and wanders off.', 'A silver hand that stops practising is iron again inside a year.'],
    ['We are nearly equals. That means I will be harder on you, not softer.', 'I still practise every day. So will you.', 'The {image} at the end of the road is the same {image} at the start. Only you are different.'],
  ],
  2: [
    ['There is a place where I first understood the {image}. Go.', 'The art did not begin in a hall. Go and see where it did.', 'Some things cannot be taught indoors.'],
    ['You know the moves. You do not yet know why. The why is out there.', 'I learned more on the road than in any dojo. You will too.', 'Go somewhere that does not care who you are.'],
    ['Go further this time. The {image} does not stay near home.', 'A journey is a lesson that takes its time.', 'Somewhere out there, someone fought like this before either of us. Find where.'],
    ['Leave the region. The art is bigger than one map.', 'You need to stand where nobody knows your name and see if the art still holds.', 'The {image} has crossed further than you have. Catch up.'],
    ['The last journeys are always the longest.', 'You go now as someone the art belongs to. Carry it well.', 'There is nothing left near home that can teach you.'],
  ],
  3: [
    ['Now we see if any of it stayed.', 'A lesson you have not been tested on is only a rumour.', 'The {image} gets one chance, usually. So do you.'],
    ['Something out there will tell you the truth about your art. Listen.', 'This is not a drill. Nobody will stop the fight for you.', 'Win, and come back. Those are the only two instructions.'],
    ['Your enemy will not care what rank you are. Good.', 'The {imageFull} faces what it fears. Face it.', 'You will want to fight the way you always fight. Fight the way of the {image}.'],
    ['I could tell you what waits there. I would rather you found out.', 'You are strong. That is not the question. The question is whether you are true to it.', 'At this rank, the art is either yours or it is not. Go and see.'],
    ['This is the last trial I have. After it, you will only have your own.', 'Whatever waits there, I faced something like it. You will face it better.', 'Go. Come back, and I will have nothing left to teach you at this rank -- only something to give.'],
  ],
};

/** What the master says before a lesson: an opener in the art's image and one of the art's tenets. */
export function masterPhilosophy(stage, art, seed, rankIdx = 1) {
  const T = artTheme(art);
  const rk = lessonRankOf(rankIdx);
  const r = rng(`phil|${seed}|${rk}|${stage}`);
  const opens = (OPEN[stage] || OPEN[1])[rk];
  const open = opens[Math.floor(r() * opens.length)].replace(/\{imageFull\}/g, T.imageFull).replace(/\{image\}/g, T.image).replace(/\{art\}/g, art ? art.name : 'the art');
  // a tenet the master has not used at another lesson: the art's lists, cycled by rank and stage
  const pool = [];
  for (const k of tenetKeys(T)) for (const t of TENETS[k]) pool.push(t);
  const order = perm(pool, `tenets|${seed}`);
  const tenet = order[(rk * 3 + (stage - 1)) % order.length];
  return `"${open} ${tenet}"`;
}

/** Faults for the tests: tenet lists are full; every art has at least five distinct practices. */
export function lessonFaults(arts) {
  const out = [];
  for (const [k, l] of Object.entries(TENETS)) if (l.length < 6) out.push(`tenets ${k} has ${l.length}`);
  for (const a of arts || []) { const p = practiceKinds(artTheme(a)); if (new Set(p).size < 5) { out.push(`${a.id} has ${p.length} practices`); break; } }
  return out;
}
