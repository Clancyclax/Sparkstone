// ===========================================================================
// ROUND 391 -- CONFLUENCE IDENTITY SHEETS.
//
// The user: confluence essences "should have some of the highest flavor in the game", and a Volcano kit was handing
// out "Building Pressure of Ape" (a heal), "Cattle Flow" and "Ash Column of Blight" -- the generic generator with the
// confluence's words pasted on, and the socket stone's name leaking into the confluence's own abilities. Their
// direction: "The Volcano confluence should summon obsidian from the ground, shoot beams of lava, summon lava
// elementals or Salamanders, create molten armor and obsidian weapons, fire and earth, steamvents and eruptions."
// And: "I want no less than 40 unique thematically relevant attacks (between special attacks and spells) for each
// confluence. This creates a range of options for awakening stones to fit against. As well at least 10 items for each
// of all the other categories."
//
// A SHEET is authored data (tools/conf_source/<Name>.json), validated and compiled by
// tools/build_confluence_identity.mjs into confluenceIdentityData.js, and is the PRIMARY source for every socket of the
// confluence slot: the generator still decides WHICH category a socket takes (its floors, caps, kit class, archetype
// and the stone's bias all stand), and the sheet decides WHAT that ability is -- the entry in that category that best
// fits the socket's awakening stone. See docs/CONFLUENCE_IDENTITY.md for the schema and the authoring rules.
//
// This module is pure data + selection and imports nothing from awakening.js (awakening imports it). The builder that
// turns an entry into an ability is `buildConfluenceSheetAbility` in awakening.js, because it rides the generator's own
// signature path (numbers, levers, costs, cast times, range bands, rank ladders).
// ===========================================================================
import { CONFLUENCE_IDENTITY } from './confluenceIdentityData.js';
import { AFFLICTIONS, AFFLICTION_BY_LABEL, AFFLICTION_POOL_BY_SOURCE } from './afflictions.js';
import { composeCondition } from './debuffs.js';
import { STONE_CATALOG } from './stoneCatalog.js';

/** The generator's category names (ABILITY_CATEGORIES `category`), in the order a sheet lists them. */
export const SHEET_CATEGORIES = ['attack', 'defensive', 'passive buff', 'buff', 'healing', 'triggered', 'movement',
  'aura', 'weapon affinity', 'perception', 'summon', 'affliction', 'stacking', 'restore', 'unarmed', 'weapon summon',
  'armor summon', 'gear summon'];
/** "no less than 40 unique thematically relevant attacks ... at least 10 items for each of all the other categories". */
export const SHEET_MIN = { attack: 40, liveAttack: 40, other: 10, liveOther: 1, conditions: 10 };
/** The four templates the runtime swings as a weapon strike (WorldScene.STRIKE_TEMPLATES): a sheet attack on one of
 *  them is a SPECIAL ATTACK, everything else is a SPELL (a special attack on any other template would be cast as a
 *  plain swing and lose its shape -- WorldScene `_specialStrike`). */
export const STRIKE_TEMPLATES = new Set(['sunderStrike', 'rangeStrike', 'stackStrike', 'imbueStrike']);
export const styleOfTemplate = (t) => (STRIKE_TEMPLATES.has(t) ? 'special' : 'spell');
/** Templates a kit counts or caps by template: a sheet entry may only stand in for a generated ability of the SAME
 *  template here, and never for any other, so every cap and floor the generator kept is kept. */
export const CAPPED_TEMPLATES = new Set(['aura', 'perception', 'absorbShield', 'twoHandWield', 'waterWalk',
  'unarmedFocus', 'tauntPull', 'stealthVeil', 'weaponMight', 'weaponAffinity', 'summonBonded', 'activeSummon',
  'altResource', 'townPortal', 'attrBoost', 'raiseDead', 'stacking', 'transform']);
/** Capped templates whose cap is only a CEILING (nothing in the kit is owed one): when a sheet has no entry of that
 *  template, the socket may take an uncapped entry of the same category and kind instead of keeping the generic one. */
export const SOFT_CAPPED = new Set(['twoHandWield', 'waterWalk', 'unarmedFocus', 'tauntPull', 'stealthVeil',
  'weaponMight', 'townPortal', 'transform', 'absorbShield']);

// ---------------------------------------------------------------------------
// STONE FIT. "This creates a range of options for awakening stones to fit against." A stone's tags come from its
// family (stoneCatalog.js `family`, the same 29 families FAMILY_TRAITS biases on); an entry's tags are its authored
// `fit` plus what its template and payload say about it. The vocabulary is closed: the validator refuses a tag that
// is not here.
// ---------------------------------------------------------------------------
export const STONE_FIT_TAGS = ['ranged', 'melee', 'area', 'single', 'burst', 'dot', 'control', 'defensive', 'armour',
  'sunder', 'mobility', 'stealth', 'perception', 'precision', 'summon', 'beast', 'heal', 'support', 'weapon', 'power',
  'reach', 'chain', 'transform', 'gear', 'resource', 'corpse',
  // the element families, as the stone catalogue spells them
  'fire', 'earth', 'cold', 'water', 'air', 'storm', 'light', 'dark', 'death', 'blood', 'life', 'poison', 'mind',
  'space', 'order', 'force', 'craft', 'flyer'];
export const STONE_FIT_BY_FAMILY = {
  blade: ['melee', 'weapon', 'precision', 'single', 'burst'],
  bludgeon: ['melee', 'weapon', 'sunder', 'burst', 'force'],
  polearm: ['melee', 'weapon', 'reach', 'mobility'],
  ranged: ['ranged', 'single', 'precision', 'reach'],
  guard: ['defensive', 'armour', 'control'],
  beast: ['summon', 'beast', 'melee', 'power'],
  smallbeast: ['mobility', 'stealth', 'perception', 'beast'],
  flyer: ['mobility', 'ranged', 'area', 'flyer', 'beast'],
  aquatic: ['heal', 'water', 'summon', 'beast'],
  serpent: ['dot', 'poison', 'single', 'precision'],
  fire: ['fire', 'burst', 'area', 'dot'],
  water: ['water', 'heal', 'support', 'control'],
  air: ['air', 'mobility', 'ranged'],
  earth: ['earth', 'defensive', 'armour', 'area'],
  cold: ['cold', 'control', 'defensive'],
  storm: ['storm', 'ranged', 'burst', 'chain'],
  light: ['light', 'heal', 'support'],
  dark: ['dark', 'stealth', 'dot', 'precision'],
  life: ['life', 'heal', 'summon', 'support'],
  death: ['death', 'dot', 'corpse', 'control'],
  blood: ['blood', 'dot', 'heal', 'power'],
  alchemy: ['poison', 'dot', 'heal', 'support', 'resource'],
  mind: ['mind', 'perception', 'precision', 'control'],
  motion: ['mobility', 'reach', 'resource'],
  force: ['force', 'power', 'melee', 'burst', 'area'],
  order: ['order', 'defensive', 'support', 'control'],
  craft: ['craft', 'gear', 'weapon', 'armour', 'summon'],
  space: ['space', 'mobility', 'control', 'area', 'reach'],
  identity: ['transform', 'power', 'defensive', 'perception'],
};
/** What a template says about itself, so an author does not have to tag the shape (only the intent). */
export const TEMPLATE_FIT = {
  projectileBall: ['ranged', 'single'], breathCone: ['area', 'melee', 'burst'], volley: ['ranged', 'area'],
  aoeRing: ['area', 'melee', 'burst'], weakenRing: ['area', 'control', 'sunder'], barrierWall: ['control', 'area'],
  sunderStrike: ['melee', 'weapon', 'sunder'], rangeStrike: ['weapon', 'reach', 'ranged'],
  stackStrike: ['melee', 'weapon', 'dot'], imbueStrike: ['weapon', 'melee', 'dot'], confuseTurn: ['control', 'mind', 'area'],
  abilityLock: ['control', 'single'], corpseBlast: ['corpse', 'area', 'death'], corpseMine: ['corpse', 'control', 'death'],
  corpseMiasma: ['corpse', 'dot', 'death'], corpseDrain: ['corpse', 'heal', 'death'], raiseDead: ['corpse', 'summon', 'death'],
  reflectWard: ['defensive'], absorbShield: ['defensive', 'armour'], armorBuff: ['defensive', 'armour'],
  thornsBuff: ['defensive', 'melee'], tauntPull: ['defensive', 'control'], stealthVeil: ['stealth', 'mobility'],
  cooldownPassive: ['resource'], elementPierce: ['precision'], fateReroll: ['precision', 'mind'],
  passiveConditional: ['precision'], passiveBuff: ['power'], attrBoost: ['power'], twoHandWield: ['weapon', 'power'],
  weaponMight: ['weapon', 'power'], selfPower: ['power', 'burst'], selfCritBuff: ['precision', 'burst'],
  immunityBuff: ['defensive'], timeFreeze: ['control', 'space'], partyBuff: ['support'], rangeBuff: ['reach'],
  transform: ['transform'], statBuff: ['power'], cooldownReset: ['resource'], selfHeal: ['heal'],
  bloomField: ['heal', 'area', 'support'], selfHot: ['heal'], aoeHealPulse: ['heal', 'support', 'area'],
  triggeredPassive: ['resource'], dash: ['mobility'], teleport: ['mobility', 'space'], movementHaste: ['mobility'],
  passiveMove: ['mobility'], waterWalk: ['mobility', 'water'], townPortal: ['mobility', 'space'], aura: ['area'],
  weaponAffinity: ['weapon', 'melee'], perception: ['perception'], summonBonded: ['summon', 'beast'],
  activeSummon: ['summon'], virulence: ['dot'], stacking: ['burst'], cleanse: ['support', 'heal'],
  resourceRestore: ['resource'], unarmedFocus: ['melee', 'power'], summonWeapon: ['weapon', 'gear'],
  summonArmor: ['armour', 'defensive', 'gear'], summonGear: ['gear', 'precision'],
};
/** A damage type's fit tag (the stone family that speaks for it). */
const TYPE_FIT = {
  fire: 'fire', earth: 'earth', rock: 'earth', sand: 'earth', frost: 'cold', ice: 'cold', water: 'water', wind: 'air',
  lightning: 'storm', light: 'light', radiant: 'light', dark: 'dark', shadow: 'dark', death: 'death', necrotic: 'death',
  blood: 'blood', life: 'life', plant: 'life', nature: 'life', poison: 'poison', arcane: 'mind', curse: 'dark',
  resonating: 'mind', disruptive: 'mind', dimension: 'space', slashing: 'weapon', blunt: 'force', piercing: 'precision',
};

/** The tags an awakening stone brings: its family's, and `beast` for an animal stone of any family. */
export function stoneFitTags(stoneId) {
  const s = stoneId && STONE_CATALOG[stoneId];
  if (!s) return new Set();
  return new Set(STONE_FIT_BY_FAMILY[s.family] || []);
}

/** An entry's tags: { authored, auto } (auto = template + damage + condition + payload). */
export function entryFitTags(entry) {
  const authored = new Set(entry.fit || []);
  const auto = new Set(TEMPLATE_FIT[entry.template] || []);
  for (const t of (entry.damage || [])) if (TYPE_FIT[t]) auto.add(TYPE_FIT[t]);
  const m = entry.mech || {};
  if (m.explodeRadius || m.volleyCount > 2) auto.add('area');
  if (m.leech) { auto.add('heal'); auto.add('blood'); }
  // ROUND 392 -- what a rider (gearRiders.js) says about the stones it answers: a splash is area, a blow taken is
  // defensive, a knockback is force, an armour strip is sunder, a crit is precision, a trail is mobility ...
  for (const r of (Array.isArray(m.effectRiders) ? m.effectRiders : [])) {
    if (!r || typeof r !== 'object') continue;
    if (r.radius > 0 || r.at === 'around') auto.add('area');
    if (r.healFrac > 0 || r.ward > 0) auto.add('heal');
    if (r.stamina > 0 || r.mana > 0 || r.cdRefund > 0) auto.add('resource');
    if (r.on === 'struck' || r.on === 'block') auto.add('defensive');
    if (r.knockback > 0) auto.add('force');
    if (r.sunder > 0 || r.armorIgnore > 0) auto.add('sunder');
    if (r.on === 'crit') auto.add('precision');
    if (r.on === 'trail' || r.when === 'moving' || r.when === 'afterMove') auto.add('mobility');
    if (r.dmgFrac > 0 && r.element && TYPE_FIT[r.element]) auto.add(TYPE_FIT[r.element]);
  }
  if (m.thornsElement && TYPE_FIT[m.thornsElement]) auto.add(TYPE_FIT[m.thornsElement]);
  if (entry.dot) auto.add('dot');
  if (entry.cond && entry._condArch) {
    if (['holdStill', 'stagger', 'slowStep', 'slowHand', 'silence'].includes(entry._condArch)) auto.add('control');
    if (['quickBurn', 'gnawingDot', 'slowRot', 'proportionalBurn', 'openWound', 'starvedWound', 'rigor', 'wastingBody'].includes(entry._condArch)) auto.add('dot');
    if (['strippedGuard', 'brokenWard', 'elementBared', 'markedPrey', 'executioner'].includes(entry._condArch)) auto.add('sunder');
  }
  return { authored, auto };
}

/** How well an entry suits a stone: an authored tag the stone shares is worth three, an implied one one. */
export function stoneFitScore(entry, stoneId) {
  const st = stoneFitTags(stoneId);
  if (!st.size) return 0;
  const { authored, auto } = entryFitTags(entry);
  let n = 0;
  for (const t of authored) if (st.has(t)) n += 3;
  for (const t of auto) if (st.has(t) && !authored.has(t)) n += 1;
  return n;
}

// ---------------------------------------------------------------------------
// THE SHEETS.
// ---------------------------------------------------------------------------
const SHEETS = CONFLUENCE_IDENTITY || {};
export function sheetFor(name) { return (name && SHEETS[name]) || null; }
export function hasSheet(name) { return !!sheetFor(name); }
export function sheetNames() { return Object.keys(SHEETS); }
/** Every entry of a sheet, attacks first, each carrying its `category` (stamped by the build). */
export function sheetEntries(sheet) {
  if (!sheet) return [];
  const out = [...(sheet.attacks || [])];
  for (const c of SHEET_CATEGORIES) if (c !== 'attack') out.push(...((sheet.categories || {})[c] || []));
  return out;
}
/** The entries the generator may hand out (an entry with `live: false` is a design waiting on a gap). */
export function liveEntries(sheet) { return sheetEntries(sheet).filter(e => e.live !== false); }

/** The registry key of a sheet condition: `cid_Volcano_scorched`. Stable -- a save carries it. */
export const conditionKey = (confName, condId) => `cid_${confName}_${condId}`;
export function sheetCondition(sheet, condId) {
  return (sheet && (sheet.identity.conditions || []).find(c => c.id === condId)) || null;
}

/** The marquee signatures a sheet carries (confluenceSignatures.js's five, folded in), in the signature shape. */
export function sheetSignatureEntries(name) {
  const s = sheetFor(name);
  return s ? liveEntries(s).filter(e => e.signature) : [];
}

// ---------------------------------------------------------------------------
// THE CONDITIONS join the affliction library: same shape as afflictions.js (the archetype's mechanic fields, the
// label/tags/icon/colour/blurb the card and status bar read), registered through `composeCondition` under their own
// keys, findable by label, and the confluence's named pool becomes the sheet's own -- so a Volcano bolt that rolls an
// affliction rolls [Scorched] or [Encased in Obsidian], never the fire family's [Wing of the Unquenched].
// ---------------------------------------------------------------------------
let _registered = false;
export function registerSheetConditions() {
  if (_registered) return;
  _registered = true;
  for (const [name, sheet] of Object.entries(SHEETS)) {
    const labels = [];
    for (const c of (sheet.identity.conditions || [])) {
      const key = conditionKey(name, c.id);
      const { id, ...row } = c;
      const full = { origin: name, scope: 'confluence', family: sheet.identity.family, licence: 'elemental',
        stones: [], ...row };
      AFFLICTIONS[key] = full;
      if (!AFFLICTION_BY_LABEL.has(full.label)) AFFLICTION_BY_LABEL.set(full.label, { ...full, key });
      composeCondition({ ...full, key });
      labels.push(full.label);
    }
    const pool = AFFLICTION_POOL_BY_SOURCE.get(name);
    if (pool && labels.length) pool.afflictions = labels;
  }
}
registerSheetConditions();

// ---------------------------------------------------------------------------
// SELECTION.
// ---------------------------------------------------------------------------
function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * The sheet's entries for the socket, best first. `want` is the ability the generator chose for this socket (its
 * category, kind, template and whether it deals damage are what the kit needed); `stoneId` is the socket's stone.
 *   - same category and kind as the generator's pick;
 *   - a capped template (aura, perception, barrier, summon ...) only stands in for itself, and no other pick may
 *     become one;
 *   - a corpse entry only where the generator's pick was a corpse ability (the kit can raise bodies);
 *   - never an entry the kit already holds (`usedIds`) or a name it already uses;
 *   - then by stone fit, the generator's own template and key as tie-breaks, and a per-socket seed.
 */
export function rankSheetEntries(sheet, want, { stoneId = null, seed = '', usedIds = new Set(), usedNames = new Set(),
  shapeCount = null, shapeCap = Infinity, crossTemplates = null, bonus = null } = {}) {
  if (!sheet || !want) return [];
  const capped = CAPPED_TEMPLATES.has(want.template);
  const o = { stoneId, seed, usedIds, usedNames, shapeCount, shapeCap, crossTemplates, bonus };
  const out = rankPass(sheet, want, capped, o);
  if (!out.length && capped && SOFT_CAPPED.has(want.template)) return rankPass(sheet, want, false, o);
  return out;
}
/** ROUND 392 -- a condition payoff is the same passive whichever of its two buckets it is filed in (affliction or
 *  triggered), so a socket asking for either may take one from the other (`crossTemplates`). */
export const PAYOFF_CATEGORIES = new Set(['affliction', 'triggered']);
/** ROUND 391 -- the last resort for a composed row (a `summon_terrain` raising a bloom field or a wall, a weapon-might
 *  passive filed as weapon affinity) whose category has no sheet entry of its shape: any live entry of the same template
 *  and kind, from whichever category holds one, so the confluence slot still speaks for the confluence. */
export function rankSheetByTemplate(sheet, want, { stoneId = null, seed = '', usedIds = new Set(), usedNames = new Set() } = {}) {
  if (!sheet || !want) return [];
  const out = [];
  for (const e of liveEntries(sheet)) {
    if (e.template !== want.template || e.kind !== want.kind) continue;
    if (usedIds.has(e.id) || usedNames.has(e.name) || !!e.corpse !== !!want.corpse) continue;
    out.push({ e, s: stoneFitScore(e, stoneId) * 10 + (hash32(`${seed}|${e.id}`) % 9) });
  }
  return out.sort((a, b) => b.s - a.s).map(x => x.e);
}
function rankPass(sheet, want, capped, { stoneId, seed, usedIds, usedNames, shapeCount, shapeCap, crossTemplates = null, bonus = null }) {
  const out = [];
  for (const e of liveEntries(sheet)) {
    // ROUND 392 -- `crossTemplates`: an entry of one of these templates stands in from a sibling category.
    const cross = !!(crossTemplates && crossTemplates.has(e.template) && PAYOFF_CATEGORIES.has(e.category) && PAYOFF_CATEGORIES.has(want.category));
    if ((e.category !== want.category && !cross) || e.kind !== want.kind) continue;
    if (usedIds.has(e.id) || usedNames.has(e.name)) continue;
    if (capped ? e.template !== want.template : CAPPED_TEMPLATES.has(e.template)) continue;
    if (!!e.corpse !== !!want.corpse) continue;
    let s = stoneFitScore(e, stoneId) * 10;
    if (e.template === want.template) s += 4;
    if (e.catKey === want.catKey) s += 2;
    if (shapeCount && want.category === 'attack' && shapeCount(e.template) >= shapeCap && e.template !== want.template) s -= 25;
    if (bonus) s += bonus(e) || 0;   // ROUND 392 -- the kit's own synergy (a payoff on a condition it lays)
    s += hash32(`${seed}|${e.id}`) % 9;
    out.push({ e, s });
  }
  return out.sort((a, b) => b.s - a.s).map(x => x.e);
}

// ---------------------------------------------------------------------------
// THE CARD'S TOKENS. An entry's `desc` may name the built ability's own figures: `{base}`, `{dot.dmgPerTick}`,
// `{sunder.amount%}` (a fraction as a percent), `{range:tiles}` (world units as tiles), `{summonDuration:dur}` (seconds
// as "Ns" or "N minutes"), and the aliases below. Filled from the FINISHED spec, so the figure is the one that happens.
// ---------------------------------------------------------------------------
const ALIASES = {
  dmg: (a) => a.base,
  // ROUND 392 -- never below the close figure ("24 damage up close, rising to 23"); awakening.js
  // `restateRangeStrikeFar` keeps it in step when a role pass moves the base after the card is filled.
  maxDmg: (a) => (a.base && a.maxMult ? Math.max(a.base, Math.round(a.base * a.maxMult)) : undefined),
  count: (a) => a.volleyCount,
  radius: (a) => a.explodeRadius ?? a.auraRadius ?? a.freezeRadius ?? a.fieldRadius ?? a.range,
  powerPct: (a) => (a.powerMult ? Math.round((a.powerMult - 1) * 100) : undefined),
};
export const TOKEN_RE = /\{([A-Za-z][A-Za-z0-9_.]*)(%|:tiles|:dur|:s)?\}/g;
function roundNice(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return v;
  return Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
}
/** The raw value a token names on a spec, or undefined. */
export function tokenValue(spec, path) {
  if (ALIASES[path]) return ALIASES[path](spec || {});
  let v = spec;
  for (const p of String(path).split('.')) { if (v == null) return undefined; v = v[p]; }
  return v;
}
/** Fill an entry's text from a built spec. `tiles` is awakening's fmtTiles. Unresolvable tokens are left as written
 *  (the validator refuses them, so none ships). */
export function fillSheetText(text, spec, { tiles = (u) => `${Math.round((u / 32) * 2) / 2} tiles`, cond = null } = {}) {
  return String(text || '').replace(TOKEN_RE, (m, path, fmt) => {
    if (path === 'cond') return cond && cond.label ? `[${cond.label}]` : m;
    const v = tokenValue(spec, path);
    if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) return m;
    if (typeof v !== 'number') return String(v);
    if (fmt === '%') return `${Math.round(v * 100)}%`;
    if (fmt === ':tiles') return tiles(v);
    if (fmt === ':dur' || fmt === ':s') {
      if (fmt === ':dur' && v >= 90) return `${Math.round((v / 60) * 10) / 10} minutes`;
      return `${roundNice(v)}s`;
    }
    return String(roundNice(v));
  });
}

// ---------------------------------------------------------------------------
// RITUAL SUMMONS AND WILD BONDS. A confluence with a sheet calls its OWN beings (ritualSummons.js asks here before it
// asks the parents), and bonds its own list of wild creatures (bondThemes.js asks here first).
// ---------------------------------------------------------------------------
/** The sheet's ritual kind in RITUAL_KINDS shape, one form chosen per role by `pick(salt, n)`, or null. */
export function sheetRitualKind(name, pick = null) {
  const s = sheetFor(name);
  const r = s && s.ritual;
  if (!r) return null;
  const forms = {};
  for (const role of ['fighter', 'guardian', 'scout']) {
    const list = [].concat(r.forms[role] || []);
    if (!list.length) return null;
    forms[role] = { ...list[pick ? Math.abs(pick(`sheet|${role}`, list.length)) % list.length : 0] };
  }
  return { key: r.baseKind || 'ember', label: r.label, element: r.element, resist: r.resist, forms,
    powers: r.powers.map(p => ({ ...p, values: p.values.slice() })), sheet: name };
}
export function sheetWildBond(name) {
  const s = sheetFor(name);
  return (s && Array.isArray(s.wildBond) && s.wildBond.length) ? s.wildBond.slice() : null;
}

// ---------------------------------------------------------------------------
// THE WORDING RULE, shared by the validator and the suite: "abilities never compare to other abilities, a
// 'standard' version, or themselves" (test_round388_cardtext's class, with a few authoring slips added).
// ---------------------------------------------------------------------------
export const SHEET_COMPARE_RES = [
  /\bstandard\b/i, /\bnormal(?:ly)?\b/i, /\busual(?:ly)?\b/i, /\bordinar(?:y|ily)\b/i, /\bregular\b/i,
  /\bthan (?:a|an|other|most|usual|normal|the usual|before|its own|it|they)\b/i,
  /\b(?:longer|shorter|faster|slower|stronger|weaker|wider|narrower|bigger|smaller|larger|heavier|lighter|further|farther|harder|quicker|better|worse) than\b/i,
  /\bcompared (?:to|with)\b/i, /\brelative to\b/i, /\bunlike\b/i, /\bother (?:abilities|bolts|spells|attacks|moves)\b/i,
  /\b\d+(?:\.\d+)?\s*[×x]\s+(?:a|an|the)\s/i, /\bas (?:much|far|long|fast|hard) as\b/i, /\bbase version\b/i,
  /\bplain (?:bolt|version)\b/i, /\bthe same as\b/i,
];
export function comparisonIn(text) {
  const t = String(text || '').replace(/\[[^\]]*\]/g, '[C]');
  const re = SHEET_COMPARE_RES.find(x => x.test(t));
  return re ? (t.match(re) || [''])[0] : null;
}
