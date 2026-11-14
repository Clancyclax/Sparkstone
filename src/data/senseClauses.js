// ===========================================================================
// ROUND 216 -- MOVED OUT OF perception.js, WHICH IS GENERATED.
//
// This block was hand-written at the bottom of a file whose own first line
// says "GENERATED ... Do not edit by hand". It survived four rounds because
// nobody regenerated; the moment round 216 re-ran the generator to make
// echolocation a pulse, `senseEffectClauses` vanished and every importer
// failed to load the game at all.
//
// A generated file with hand additions is a trap that springs once, silently,
// on whoever next runs the generator. So the hand-written half lives here and
// perception.js goes back to being wholly generated.
// ===========================================================================


//   "Strong rolling weight Iron rank effect 'the dark that looks back, and from
//    where'. This isn't anything ... the entire point of the 'Iron Rank
//    Effect' section is to explain what a move actually does."
//
// The rank line used to print the sense's label and its `adds` column, which
// is flavour written to be read after the mechanics, not instead of them. The
// line is now built from the rank's `mods` -- the fields the runtime reads --
// so every clause is a thing the game does, with its number.
// ===========================================================================
/** ROUND 385 -- the card clauses for the three creature reads (combatReads.js), named once. */
export const READ_TEXT = {
  readHide: 'the target frame shows your target\'s hide and how it takes slashing, blunt and piercing',
  readResist: 'the target frame shows what your target resists',
  readWeak: 'the target frame shows what your target is weak to',
};
const tiles = (u) => `${Math.round((u / 32) * 10) / 10} tiles`;
const pctOf = (x) => `${Math.round(x * 100)}%`;
const SENSE_MOD_TEXT = {
  nightVision: (v) => `the dark is ${pctOf(Math.min(1, v))} lighter around you at night and underground`,
  pickupRadiusMult: (v) => (v > 1 ? `you pick things up from ${pctOf(v - 1)} further away` : ''),
  lurkReveal: (v) => `hidden and stealthed enemies show ${pctOf(Math.min(1, v))} more clearly`,
  mapSense: () => 'nearby creatures show on your minimap',
  siteSense: () => 'places still holding an essence or a stone are marked on your map',
  mapMemory: () => 'you uncover 3 more tiles of map around you as you walk',
  nodeSense: () => 'harvestable plants and ore show on your minimap',
  weakspotCrit: (v) => `+${pctOf(v)} critical chance against an enemy's elemental weak point, which is marked over its head`,
  unmask: (v) => `disguised, illusory and stealthed enemies within ${tiles(v * 160)} are outlined in pink`,
  healthbars: () => 'you see every enemy\'s health bar',
  flawSight: () => 'each enemy shows the element it is weakest to',
  bloodSense: (v) => `wounded enemies are outlined red, brighter the more hurt they are (x${Math.round(v * 10) / 10})`,
  deathWatch: () => 'enemies show their exact remaining health',
  bondSense: () => 'your companions\' health and position show even off-screen',
  dangerSense: () => 'an arrow flashes at the screen edge toward anything off-screen that starts hunting you',
  // ROUND 378 -- the Stillness sense's own idea ("the less you move, the further you reach"), now true at runtime.
  echoSense: (v) => `moving enemies within ${tiles(v)} are outlined through walls, and half again as far once you have stood still for a second`,
  // ROUND 216 -- the pulse, which reveals what is standing still as well.
  echoPulse: (v) => `a pulse sweeps out to ${tiles(v)} and outlines everything it touches, moving or not`,
  echoHold: (v) => `what the pulse found stays marked for ${Math.round(v * 10) / 10}s`,
  scentTrail: (v) => `creatures leave a visible trail of their last ${Math.round(v)}s of movement`,
  tremorSense: (v) => `enemies on the ground within ${tiles(v)} are outlined through walls (not fliers)`,
  heatSight: (v) => `living enemies within ${tiles(v)} are outlined through cover (not undead or constructs)`,
  leySight: () => 'casters, enchanted objects and warded ground are marked, and the target frame shows what your target resists',
  // ROUND 385 -- the three creature reads (combatReads.js); the frame rows they open.
  readHide: () => READ_TEXT.readHide,
  readResist: () => READ_TEXT.readResist,
  readWeak: () => READ_TEXT.readWeak,
  noFlank: () => 'enemies that attack you from behind get no rear-attack bonus',   // ROUND 388 -- was "(normally +25%)": abilities do not compare
  counterSense: (v) => `any enemy within ${tiles(v * 220)} that is watching or hunting you is outlined in violet`,
  rootSense: (v) => `anything standing in vegetation within ${tiles(v)} is outlined`,
  // ROUND 388 -- the canon rung fields (Midnight Eyes, Sight Beyond Sight), so their cards state them too.
  auraSenseBonus: (v) => `your aura sense (minimap marks, portals) reaches ${pctOf(v)} further`,
  darkSight: () => 'you see through darkness',
  manaReveal: (v) => `magic used to hide fails within ${tiles(v)} of you: stealthed casters and magical creatures are revealed`,
  dimLights: (v) => `light sources in view burn at ${pctOf(1 - Math.min(1, v))} of their reach`,
};
const TRIGGER_ON_TEXT = {
  kill: (t) => 'when you kill something',
  crit: (t) => 'when you land a critical hit',
  critDrought: (t) => `after ${t.seconds}s without a critical hit`,
  moveDistance: (t) => `every ${Math.round((t.distance || 0) / 32)} tiles you travel`,
  gainHealth: () => 'when you are healed',
  emptyMana: () => 'when your mana runs dry',
  hurtNonFire: () => 'when you are hit (by anything but fire)',
  inflictCondition: () => 'when you put a condition on an enemy',
  spendMana: (t) => `each time you spend ${t.amount} mana`,
  hpBelow: (t) => `when you drop below ${pctOf(t.frac)} health`,
  fullStamina: () => 'while your stamina is full',
  fullMana: () => 'while your mana is full',
};
const TRIGGER_EFFECT_TEXT = {
  critChance: (e) => `+${pctOf(e.amount)} critical chance for ${e.duration}s`,
  restoreResource: (e) => `restore ${pctOf(e.amount)} of your ${e.resource}`,
  physicalDamageMult: (e) => `+${pctOf(e.amount - 1)} physical damage for ${e.duration}s`,
  regenBurst: (e) => `restore ${pctOf(e.amount)} of your ${e.resource} at once`,
  nextSpellDamage: (e) => `your next spell deals +${pctOf(e.amount - 1)} damage`,
  restoreResourceOverTime: (e) => `restore ${pctOf(e.amount)} of your ${e.resource} over ${e.duration}s`,
  boltNearest: (e) => `a bolt hits the nearest enemy for ${pctOf(e.amount)} of your weapon damage`,
};

/** The rank's mechanics as plain clauses: one per field it sets, then its
 *  trigger, if it has one. Never the flavour line. */
/** ROUND 388 -- a canon perception's rung-by-rung sense (`rankSense`, round 279) as one mods object at `rank`: every
 *  reached rung's fields together, iron at the least. The same fold `_recomputeDerivedStats` applies. */
export const RANK_SENSE_ORDER = ['iron', 'bronze', 'silver', 'gold', 'diamond'];
export function rankSenseMods(rankSense, rank = 'iron') {
  const reach = Math.max(0, RANK_SENSE_ORDER.indexOf(rank));
  const m = {};
  for (let i = 0; i <= reach; i++) {
    for (const [f, v] of Object.entries((rankSense || {})[RANK_SENSE_ORDER[i]] || {})) {
      m[f] = (v === true || typeof m[f] !== 'number') ? v : Math.max(m[f], v);
    }
  }
  return m;
}
/** ROUND 388 -- a perception with neither a sense nor rungs (a save from before round 114, a hand-built spec) reads as
 *  this sense, so it is a perception power rather than the old "+50% pickup reach" and nothing else. */
export const FALLBACK_SENSE = 'truesight';

export function senseEffectClauses(row) {
  if (!row) return [];
  const out = [];
  for (const [k, v] of Object.entries(row.mods || {})) {
    if (k === 'perception' || v === false || v === 0) continue;
    const f = SENSE_MOD_TEXT[k];
    const s = f ? f(v) : '';
    if (s) out.push(s);
  }
  const t = row.trigger;
  if (t && t.effect && TRIGGER_EFFECT_TEXT[t.effect.kind]) {
    const on = TRIGGER_ON_TEXT[t.on] ? TRIGGER_ON_TEXT[t.on](t) : `on ${t.on}`;
    const cd = t.cooldown ? ` (at most once every ${t.cooldown}s)` : '';
    out.push(`${on}, ${TRIGGER_EFFECT_TEXT[t.effect.kind](t.effect)}${cd}`);
  }
  return out;
}

// ROUND 378 -- the senses that outline a body, and what that outline is worth in a fight. The user, on Levelled
// Mound ("Standing still, your senses reach past where you are. It raises your armour by 10%."): "Doesn't make sense
// and is painfully weak." A sense that marks an enemy now also makes it easier to hurt.
export const OUTLINE_SENSE_FIELDS = ['echoSense', 'echoPulse', 'heatSight', 'tremorSense', 'rootSense', 'unmask', 'counterSense', 'bloodSense'];
export const SENSE_STRIKE = 0.15;
export function senseOutlines(mods) {
  return !!mods && OUTLINE_SENSE_FIELDS.some(f => typeof mods[f] === 'number' && mods[f] > 0);
}
export const SENSE_STRIKE_TEXT = `Your blows land ${Math.round(SENSE_STRIKE * 100)}% harder on anything it is outlining.`;
