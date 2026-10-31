// ===========================================================================
// ROUND 382 -- THE ATTRIBUTE SOCKET'S TWO ESSENCE ADDITIONS.
//
// The user: "attribute +1 as a confluence socket is weak alone but with some
// essence related additions is okay." Four worked examples:
//
//   Might       +1 power, wield 2-handed weapons in 1 hand, 30% more damage on crit
//   Prosperity  +1 recovery, buffs and shields last 50% longer, granting an ally
//               health grants stacking 2% movement speed for 3 seconds
//   Avatar      +1 speed, self buffs last twice as long, your summons gain 15%
//               of any buffs placed onto you
//   Pure        +1 spirit, below 30% health cleanse all negative effects (not
//               more than once every 10 minutes), a kill cleanses 1 negative
//               damaging effect from yourself
//
// So every attrBoost (essence socket, confluence socket, innate) carries
// `attrAdds`: TWO entries from ADDITIONS below. The four examples are exact
// (EXACT_ADDS). Every other essence / confluence is scored from its identity:
// its motif levers (essenceMotifs.js), its family, and the attribute itself.
// An addition that needs something the kit does not have (summons, heals of
// others, a movement ability, a buff) is passed over for the next best, so a
// card never promises a payoff the kit cannot trigger.
//
// Runtime: WorldScene `_recomputeDerivedStats` attrBoost case calls
// `_attrAddsFold` (attrAddsMixin.js), which sums every addition into
// `mods.attrAdd` (flags/percentages) or `mods.rankRiders` (plain minor stats).
// Every `kind` below has a reader; see attrAddsMixin.js for each seam.
// ===========================================================================
import { MELEE_ORDER, GREAT_ORDER, canBeWieldedOneHanded } from './weapons.js';

const P = (n) => Math.round(n * 100);

/** The library. `fits` = attributes it reads naturally on; `levers`/`families`
 *  = which identities pull it; `needs` = kit requirement; `text` = the plain
 *  card clause; `tag` = the stats-line fragment. `stat` = a minor stat the
 *  fold pushes through rankRiders (then it also must not duplicate a rider). */
export const ADDITIONS = {
  critHit: { amount: 0.30, fits: ['power', 'spirit'], levers: ['raw', 'burst', 'stalk', 'fate'], families: ['force', 'blade', 'bludgeon', 'beast', 'fire', 'storm'],
    text: (v) => `your critical hits deal ${P(v)}% more damage`, tag: (v) => `crits +${P(v)}% damage` },
  twoHand: { amount: 1, fits: ['power'], levers: ['raw', 'reach', 'anchor'], families: ['force', 'bludgeon', 'polearm', 'earth', 'craft'],
    text: () => 'you can wield two-handed weapons in one hand', tag: () => 'two-handers in one hand' },
  buffShieldDur: { amount: 0.50, fits: ['recovery', 'spirit'], levers: ['allies', 'linger', 'renew'], families: ['life', 'order', 'light'],
    text: (v) => `buffs and shields on you last ${P(v)}% longer`, tag: (v) => `buffs/shields +${P(v)}% duration` },
  selfBuffDouble: { amount: 1.0, fits: ['speed', 'spirit', 'power'], needs: 'buff', levers: ['linger', 'burst'], families: ['identity', 'mind'],
    text: () => 'buffs you place on yourself last twice as long', tag: () => 'self-buffs x2 duration' },
  buffDur: { amount: 0.40, fits: ['spirit', 'speed', 'recovery'], needs: 'buff', levers: ['linger', 'fate', 'turn'], families: ['mind', 'space', 'alchemy', 'light'],
    text: (v) => `buffs on you last ${P(v)}% longer`, tag: (v) => `buffs +${P(v)}% duration` },
  shieldDur: { amount: 0.60, fits: ['recovery', 'spirit', 'power'], needs: 'shield', levers: ['bulwark', 'ward', 'anchor'], families: ['guard', 'earth', 'order', 'cold'],
    text: (v) => `shields on you last ${P(v)}% longer`, tag: (v) => `shields +${P(v)}% duration` },
  summonShare: { amount: 0.15, fits: ['speed', 'spirit'], needs: 'summon', levers: ['call', 'allies'], families: ['identity', 'death', 'beast'],
    text: (v) => `your summons gain ${P(v)}% of any buffs placed onto you`, tag: (v) => `summons share ${P(v)}% of your buffs` },
  summonDmg: { amount: 0.20, fits: ['spirit', 'power', 'speed'], needs: 'summon', levers: ['call'], families: ['death', 'beast', 'smallbeast', 'craft'],
    text: (v) => `your summons deal ${P(v)}% more damage`, tag: (v) => `summons +${P(v)}% damage` },
  allyHealHaste: { amount: 0.02, dur: 3, fits: ['recovery', 'speed'], needs: 'allyHeal', levers: ['allies', 'mend', 'renew'], families: ['life'],
    text: (v, d) => `each time you heal an ally you gain ${P(v)}% movement speed for ${d.dur} seconds, stacking`, tag: (v) => `ally heal: +${P(v)}% move (stacks)` },
  healPct: { amount: 0.15, fits: ['recovery', 'spirit'], needs: 'heal', levers: ['mend', 'renew', 'allies'], families: ['life', 'light', 'water'],
    text: (v) => `your heals restore ${P(v)}% more health`, tag: (v) => `heals +${P(v)}%` },
  lowHpCleanse: { amount: 0.30, icd: 600, fits: ['spirit', 'recovery'], levers: ['absolve', 'mend', 'fate'], families: ['light', 'life', 'order'],
    text: (v, d) => `when you fall below ${P(v)}% of your maximum health, every negative effect on you is cleansed (at most once every ${Math.round(d.icd / 60)} minutes)`,
    tag: (v) => `below ${P(v)}% health: cleanse all` },
  killCleanse: { amount: 1, fits: ['spirit', 'recovery', 'power'], levers: ['absolve', 'siphon'], families: ['light', 'blood', 'fire'],
    text: () => 'each kill cleanses one negative damaging effect from you', tag: () => 'kill: cleanse 1 damaging effect' },
  dashDodge: { amount: 0.25, dur: 2, fits: ['speed'], needs: 'movement', levers: ['shift', 'swift', 'stealth'], families: ['motion', 'flyer', 'air', 'smallbeast', 'space'],
    text: (v, d) => `after you use a movement ability your dodge chance rises by ${P(v)}% for ${d.dur} seconds`, tag: (v, d) => `after a dash: +${P(v)}% dodge ${d.dur}s` },
  specialAtk: { amount: 0.15, fits: ['power', 'speed'], needs: 'special', levers: ['raw', 'reach', 'chain'], families: ['blade', 'polearm', 'bludgeon', 'ranged'],
    text: (v) => `your special attacks deal ${P(v)}% more damage`, tag: (v) => `special attacks +${P(v)}%` },
  lifeOnKill: { amount: 6, fits: ['power', 'recovery'], levers: ['siphon', 'stalk'], families: ['blood', 'beast', 'death', 'serpent'],
    text: (v) => `each kill restores ${v} health`, tag: (v) => `+${v} HP per kill` },
  thorns: { amount: 0.15, fits: ['power', 'recovery'], levers: ['turn', 'taunt', 'bulwark'], families: ['guard', 'earth', 'serpent'],
    text: (v) => `enemies that strike you take ${P(v)}% of the damage back`, tag: (v) => `thorns ${P(v)}%` },
  // Plain minor stats, pushed through rankRiders (the paperdoll shows them).
  armor: { stat: 'armorPct', amount: 0.15,   // ROUND 387 -- "your armour rises by N%": a multiplier on the points
    fits: ['recovery', 'speed', 'spirit'], levers: ['bulwark', 'anchor', 'taunt'], families: ['guard', 'earth', 'aquatic'],
    text: (v) => `your armour rises by ${P(v)}%`, tag: (v) => `+${P(v)}% armour` },
  block: { stat: 'blockChance', amount: 0.10, fits: ['recovery', 'speed'], levers: ['bulwark', 'anchor'], families: ['guard', 'order'],
    text: (v) => `your block chance rises by ${P(v)}%`, tag: (v) => `+${P(v)}% block` },
  dodge: { stat: 'dodgeChance', amount: 0.08, fits: ['power', 'spirit', 'recovery'], levers: ['shift', 'stealth', 'swift'], families: ['dark', 'flyer', 'smallbeast', 'air'],
    text: (v) => `your dodge chance rises by ${P(v)}%`, tag: (v) => `+${P(v)}% dodge` },
  critChance: { stat: 'critChance', amount: 0.06, fits: ['power', 'speed', 'recovery'], levers: ['stalk', 'fate', 'chain'], families: ['blade', 'dark', 'serpent', 'mind'],
    text: (v) => `your critical strike chance rises by ${P(v)}%`, tag: (v) => `+${P(v)}% crit chance` },
  moveSpeed: { stat: 'moveSpeed', amount: 0.10, fits: ['power', 'spirit', 'recovery'], levers: ['swift', 'shift'], families: ['motion', 'beast', 'air', 'water'],
    text: (v) => `you move ${P(v)}% faster`, tag: (v) => `+${P(v)}% movement` },
  attackSpeed: { stat: 'attackSpeed', amount: 0.10, fits: ['power', 'spirit', 'recovery'], levers: ['swift', 'chain', 'burst'], families: ['blade', 'storm', 'beast'],
    text: (v) => `you attack ${P(v)}% faster`, tag: (v) => `+${P(v)}% attack speed` },
  castSpeed: { stat: 'castSpeed', amount: 0.12, fits: ['power', 'speed', 'recovery'], levers: ['chain', 'burst', 'muzzle'], families: ['mind', 'storm', 'space', 'alchemy'],
    text: (v) => `you cast ${P(v)}% faster`, tag: (v) => `+${P(v)}% cast speed` },
  cooldowns: { stat: 'cooldownReduction', amount: 0.10, fits: ['spirit', 'speed', 'power'], levers: ['muzzle', 'fate', 'linger'], families: ['order', 'space', 'craft', 'mind'],
    text: (v) => `your cooldowns are ${P(v)}% shorter`, tag: (v) => `-${P(v)}% cooldowns` },
  manaRegen: { stat: 'manaRegen', amount: 0.25, fits: ['power', 'speed', 'recovery'], levers: ['siphon', 'renew'], families: ['water', 'aquatic', 'alchemy', 'mind'],
    text: (v) => `your mana recovers ${P(v)}% faster`, tag: (v) => `+${P(v)}% mana recovery` },
};
export const ADDITION_IDS = Object.keys(ADDITIONS);

/** Same-job groups: a card never carries two of one group. */
const GROUP = { buffShieldDur: 'dur', selfBuffDouble: 'dur', buffDur: 'dur', shieldDur: 'dur', summonShare: 'summon', summonDmg: 'summon',
  lowHpCleanse: 'cleanse', killCleanse: 'kill', lifeOnKill: 'kill', dashDodge: 'dodge', dodge: 'dodge', allyHealHaste: 'heal', healPct: 'heal' };

/** The user's four, exact. Key: essence id, or `conf:<Confluence name>`. */
export const EXACT_ADDS = {
  might: { attr: 'power', adds: [{ id: 'twoHand' }, { id: 'critHit', amount: 0.30 }] },
  'conf:Prosperity': { attr: 'recovery', adds: [{ id: 'buffShieldDur', amount: 0.50 }, { id: 'allyHealHaste', amount: 0.02, dur: 3 }] },
  'conf:Avatar': { attr: 'speed', adds: [{ id: 'selfBuffDouble', amount: 1.0 }, { id: 'summonShare', amount: 0.15 }] },
  essPure: { attr: 'spirit', adds: [{ id: 'lowHpCleanse', amount: 0.30, icd: 600 }, { id: 'killCleanse', amount: 1 }] },
};

// The attribute's own rank riders (awakening.js ATTR_RANK_RIDERS) -- an
// addition that is the same minor stat as one of them is redundant beside the
// ladder, so it is not offered for that attribute.
const RIDER_STATS = {
  power: ['armor', 'blockChance', 'critDamage'], speed: ['moveSpeed', 'dodgeChance', 'attackSpeed'],
  spirit: ['manaRegen', 'castSpeed', 'critChance'], recovery: ['hpRegen', 'staminaRegen', 'cooldownReduction'],
};

/** A confluence has a family but no motif levers; an essence with no motif
 *  falls back the same way. Two levers per family, in the levers' own words. */
export const FAMILY_LEVERS = {
  motion: ['swift', 'shift'], craft: ['reach', 'linger'], dark: ['stealth', 'stalk'], identity: ['linger', 'call'],
  storm: ['chain', 'burst'], force: ['raw', 'burst'], earth: ['anchor', 'bulwark'], space: ['shift', 'fate'],
  life: ['renew', 'allies'], mind: ['fate', 'muzzle'], beast: ['raw', 'siphon'], light: ['absolve', 'mend'],
  death: ['siphon', 'call'], fire: ['burst', 'raw'], guard: ['bulwark', 'taunt'], flyer: ['swift', 'shift'],
  serpent: ['stalk', 'siphon'], order: ['muzzle', 'bulwark'], aquatic: ['renew', 'turn'], water: ['renew', 'swift'],
  blood: ['siphon', 'raw'], air: ['swift', 'shift'], smallbeast: ['swift', 'stealth'], cold: ['anchor', 'bulwark'],
  alchemy: ['linger', 'chain'], bludgeon: ['raw', 'anchor'], polearm: ['reach', 'raw'], blade: ['stalk', 'chain'],
  ranged: ['reach', 'stalk'],
};

function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** What the finished kit can trigger. */
export function kitFeatures(abilities) {
  const f = { summon: false, allyHeal: false, heal: false, movement: false, buff: false, shield: false, special: false };
  for (const a of abilities) {
    if (!a) continue;
    const t = String(a.template || '');
    if (/summon/i.test(t) || a.summonKind || a.escort) f.summon = true;
    if (/heal|hot/i.test(t) || a.category === 'healing' || a.healAmount > 0 || a.hotPerSec > 0) f.heal = true;
    if (/aoeHealPulse|healPulse|allyHeal|groupHeal/i.test(t) || a.healAllies || a.allyHeal || (a.category === 'healing' && a.radius > 0)) f.allyHeal = true;
    if (a.isMovement || a.category === 'movement' || /dash|blink|teleport|leap|charge/i.test(t)) f.movement = true;
    if (a.kind === 'active' && (a.buffDuration > 0 || /^self|Buff$|movementHaste|selfHot/.test(t))) f.buff = true;
    if (/absorbShield|shield/i.test(t) || a.shieldAmount > 0) f.shield = true;
    if (a.kind === 'active' && (a.role === 'special' || a.weaponStrike || /martial|strike|cleave|lunge/i.test(t))) f.special = true;
  }
  // A heal that reaches anyone but you implies a party heal; a solo heal kit
  // with companions still heals them through _healFriendly when it is an AoE.
  return f;
}

/** Score-and-pick two additions for an identity. Deterministic. */
export function pickAdditions({ key, attr, levers = [], family = null, features = null }) {
  const exact = EXACT_ADDS[key];
  // The user's four are the ESSENCE's additions, so they hold whichever attribute the socket bound.
  if (exact) return exact.adds.map(x => ({ ...x, exact: true }));
  const riderStats = RIDER_STATS[attr] || [];
  const scored = [];
  for (const id of ADDITION_IDS) {
    const d = ADDITIONS[id];
    if (!d.fits.includes(attr)) continue;
    if (d.stat && riderStats.includes(d.stat)) continue;
    if (d.needs && features && !features[d.needs]) continue;
    let s = 0;
    levers.forEach((lv, i) => { if (d.levers.includes(lv)) s += 6 - i; });
    if (family && d.families.includes(family)) s += 4;
    if (!d.stat) s += 2.5;   // a mechanic over a plain stat: the user's examples are all mechanics
    s += (hash(`${key}|${attr}|${id}`) % 100) / 100;
    scored.push({ id, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const out = [];
  const used = new Set();
  for (const { id } of scored) {
    const g = GROUP[id] || id;
    if (used.has(g)) continue;
    used.add(g); out.push({ id });
    if (out.length === 2) break;
  }
  return out;
}

/** Fill in the numbers (amount/dur/icd/frees) from the library. */
export function resolveAdd(x) {
  const d = ADDITIONS[x.id];
  if (!d) return null;
  const r = { id: x.id, amount: x.amount != null ? x.amount : d.amount };
  if (d.dur || x.dur) r.dur = x.dur || d.dur;
  if (d.icd || x.icd) r.icd = x.icd || d.icd;
  if (d.stat) r.stat = d.stat;
  if (x.exact) r.exact = true;
  if (x.id === 'twoHand') r.frees = [...MELEE_ORDER, ...GREAT_ORDER].filter(w => canBeWieldedOneHanded(w));   // ROUND 398 -- the great weapons too
  return r;
}

export function addClause(r) { const d = ADDITIONS[r.id]; return d ? d.text(r.amount, r) : ''; }
export function addTag(r) { const d = ADDITIONS[r.id]; return d ? d.tag(r.amount, r) : ''; }

const LABEL = { power: 'Power', spirit: 'Spirit', speed: 'Speed', recovery: 'Recovery' };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The card: "Raises your Power by 1 (and its ceiling by 1). <A>, and <B>." */
export function attrAddsDesc(attr, adds) {
  const lead = `Raises your ${LABEL[attr] || attr} by 1 (and its ceiling by 1).`;
  const cl = adds.map(addClause).filter(Boolean);
  if (!cl.length) return lead;
  return `${lead} ${cap(cl.length === 1 ? cl[0] : `${cl[0]}, and ${cl[1]}`)}.`;
}

const OLD_LEAD = /Raises your (Power|Spirit|Speed|Recovery|attribute) by 1, and your \1 ceiling by 1\./;

/**
 * The kit pass. Called once at the end of rebuildKnownAbilities, after the
 * canon re-copy, so it sees every attrBoost however it arrived (essence
 * socket, confluence socket, innate signature). Canon and transforms are left
 * exactly as they are.
 */
export function applyAttrAdditions(known, ctx) {
  const { essences, confDef, motifFor, conceptFor, statsLineFor } = ctx;
  const all = Object.values(known).map(e => e && e.ability).filter(Boolean);
  const features = kitFeatures(all);
  let n = 0;
  for (const k of Object.keys(known)) {
    const en = known[k];
    const a = en && en.ability;
    if (!a || a.template !== 'attrBoost' || a.canonKey || a.transform || !a.attr) continue;
    const isConf = a.essenceId === 'confluence';
    const essDef = isConf ? confDef : essences[a.essenceId];
    if (!essDef) continue;
    const key = isConf ? `conf:${essDef.name}` : a.essenceId;
    let levers = [], family = essDef.family || null;
    if (isConf) {
      const c = conceptFor ? conceptFor(essDef.name) : null;
      if (c && c.family) family = c.family;
      levers = (c && c.levers) || [];
    } else {
      const m = motifFor ? motifFor(a.essenceId) : null;
      levers = (m && m.levers) || [];
    }
    if (!levers.length && family) levers = FAMILY_LEVERS[family] || [];
    // The user's four name their attribute too ("the pure essence granting +1 spirit"). A socket the player bound
    // to an attribute keeps it; an unbound one (rolled at random) takes the user's.
    let b0 = a;
    const ex = EXACT_ADDS[key];
    const slotIdx = +String(k).split(':')[0];
    if (ex && ex.attr !== a.attr && !((ctx.slotAttrs || [])[slotIdx])) {
      b0 = { ...a, attr: ex.attr, riders: (ctx.riders && ctx.riders[ex.attr]) || a.riders };
      const bank = (ctx.nameBanks && ctx.nameBanks[a.attr]) || [];
      const nb = (ctx.nameBanks && ctx.nameBanks[ex.attr]) || [];
      if (bank.includes(a.name) && nb.length) {
        const taken = new Set(Object.values(known).map(e => e && e.ability && e.ability.name));
        const i0 = hash(`${key}|${k}`) % nb.length;
        for (let i = 0; i < nb.length; i++) { const c = nb[(i0 + i) % nb.length]; if (!taken.has(c)) { b0.name = c; break; } }
      }
      const re = new RegExp(`\\b${LABEL[a.attr]}\\b`, 'g');
      b0.desc = String(a.desc || '').replace(re, LABEL[ex.attr]);
    }
    const picks = pickAdditions({ key, attr: b0.attr, levers, family, features }).map(resolveAdd).filter(Boolean);
    if (!picks.length) continue;
    const b = { ...b0, attrAdds: picks };
    const d0 = String(b0.desc || '');
    const lead = attrAddsDesc(b.attr, picks);
    // The two old sentences around it are kept (a health rider, say); the
    // stock lead is replaced so the card states the three effects together.
    b.desc = OLD_LEAD.test(d0) ? d0.replace(OLD_LEAD, lead).replace(/^.*?(?=Raises your )/, (pre) => (/rank/.test(pre) ? '' : pre)) : `${lead}${d0 ? ` ${d0}` : ''}`;
    // ROUND 391 -- a confluence sheet's attribute passive opens with its own sentence; the plain lead (and its two
    // additions) still goes first, the sheet's sentence after it.
    if (b.desc.includes(lead) && !b.desc.startsWith(lead)) b.desc = `${lead} ${b.desc.replace(lead, '').replace(/\s{2,}/g, ' ').trim()}`;
    const s0 = statsLineFor ? statsLineFor(b) : (a.stats || '');
    b.stats = [s0, ...picks.map(addTag)].filter(Boolean).join(' · ');
    en.ability = b;
    n++;
  }
  return n;
}
