// ===========================================================================
// ROUND 385 -- READING A CREATURE: ITS HIDE, ITS RESISTANCES, ITS WEAKNESSES.
//
//   "Target tooltip should be something gained by perception abilities or
//    nature gift evolutions. And not all at once different perception
//    abilities might tell you hide, others tell you resistances, others tell
//    you weaknesses. Something like a perception ability from the hunter
//    essence might grant multiple in a single rank or all of the above by
//    silver as its relevant to the essence."
//
// THREE READS, each a passive-mod field the target frame (targeting.js
// `targetFrameRows`) and the bestiary page are gated on:
//   readHide     the hide, and how it takes slashing, blunt and piercing
//   readResist   what the creature resists
//   readWeak     what the creature is weak to
//
// WHERE THEY COME FROM
//   1. A perception passive's SENSE, at the ability's rank (SENSE_READS).
//      Not every sense reads anything: a sense about the map, the dark or
//      your companions has nothing to say about a body.
//   2. ...widened by the ESSENCE the perception came from (ESSENCE_READS),
//      for the essences whose whole idea is knowing the thing in front of
//      you. Hunt reads hide and weaknesses at iron and everything by silver.
//   3. Ley-Sight's old row: a sense holding `leySight` has always shown
//      resistances on the frame (round 62), so it still does.
//   4. NATURE GIFT EVOLUTIONS whose own words promise it: the catalogue
//      entries in CATALOGUE_READS, and two human family gifts (natures.js,
//      `readHide` in their fx). A "study" entry reads a family only once you
//      have killed STUDY_KILLS of it.
// ===========================================================================
import { SENSES, senseAt } from './perception.js';
import { FAMILY_COMBAT, HIDE_CLASSES, TYPE_WEAKNESS, PHYS_SUBTYPES } from './combatTypes.js';
import { DAMAGE_TYPES } from './stats.js';

export const READ_FIELDS = ['readHide', 'readResist', 'readWeak'];
const RANK_LADDER = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];

/** Sense -> the rank each read starts at. Cumulative: a read held at bronze is held at silver. */
export const SENSE_READS = {
  // The hunter's sense (Hunt, Eye, Wolf, Fox, Spider, Cat): what the quarry is wearing and where it gives.
  truesight:       { iron: ['readHide', 'readWeak'], silver: ['readResist'] },
  // "The Flaw": the weak point first, then the hide it sits in.
  weakspots:       { iron: ['readWeak'], silver: ['readHide'] },
  // The Butcher's Eye: where the hide parts.
  healthbars:      { iron: ['readHide'] },
  // A sound comes back off a hide differently from off a shell.
  echolocation:    { iron: ['readHide'] },
  // The Measured Line: where the plates are, then what gets through them.
  rangefinder:     { iron: ['readHide'], silver: ['readWeak'] },
  // Heat runs where the body is thin, and shows what it fears.
  heatSight:       { bronze: ['readWeak'] },
  // Weight through the ground says what a thing is made of.
  tremorSense:     { bronze: ['readHide'] },
  bloodInTheWater: { bronze: ['readHide'] },
  compoundEyes:    { bronze: ['readHide'] },
  // Ley-Sight already shows resistances (via `leySight`, below); by silver it sees what breaks the ward.
  leySight:        { silver: ['readWeak'] },
  // Deathwatch: what will finish it.
  deathwatch:      { silver: ['readWeak'] },
};

/** Essence -> extra reads on ANY perception it surfaces, the essences that are about knowing your quarry. */
export const ESSENCE_READS = {
  essHunt:      { iron: ['readHide', 'readWeak'], silver: ['readResist'] },
  essEye:       { iron: ['readWeak'], bronze: ['readResist'], silver: ['readHide'] },
  essKnowledge: { iron: ['readResist'], bronze: ['readWeak'], silver: ['readHide'] },
  essNeedle:    { iron: ['readHide'], silver: ['readWeak'] },
};

function readsUpTo(table, rank) {
  const out = new Set();
  if (!table) return out;
  const reach = Math.max(RANK_LADDER.indexOf(rank || 'iron'), RANK_LADDER.indexOf('iron'));
  for (const [r, list] of Object.entries(table)) {
    if (RANK_LADDER.indexOf(r) <= reach) for (const f of list) out.add(f);
  }
  return out;
}

/** The reads a perception of `senseKey` grants at `rank`, from `essenceId`. In READ_FIELDS order. */
export function senseReadsAt(senseKey, rank = 'iron', essenceId = null) {
  const s = readsUpTo(SENSE_READS[senseKey], rank);
  for (const f of readsUpTo(ESSENCE_READS[essenceId], rank)) s.add(f);
  return READ_FIELDS.filter(f => s.has(f));
}

/** `senseAt`, with this sense's reads joined into the row's mods so the card, the progress table and the runtime
 *  all see one row. The rank's flavour is untouched. */
export function senseAtRead(senseKey, rank = 'iron', essenceId = null) {
  const row = senseAt(senseKey, rank);
  if (!row) return row;
  const reads = senseReadsAt(senseKey, rank, essenceId);
  if (!reads.length) return row;
  const mods = { ...(row.mods || {}) };
  for (const f of reads) mods[f] = true;
  return { ...row, mods };
}

/** The ranks at which a perception first gains each read: [{ rank, reads }], for tests and notes. */
export function senseReadLadder(senseKey, essenceId = null) {
  const out = [];
  let had = new Set();
  for (const r of ['iron', 'bronze', 'silver', 'gold']) {
    const now = new Set(senseReadsAt(senseKey, r, essenceId));
    const fresh = [...now].filter(f => !had.has(f));
    if (fresh.length) out.push({ rank: r, reads: fresh });
    had = now;
  }
  return out;
}

// ---------------------------------------------------------------------------
// NATURE GIFT EVOLUTIONS. Keyed as natures.js `specKeyOf` keys a catalogue
// entry: `<ability ref>|<catalyst, lower case>`. Only entries whose own lines
// say they reveal a creature's hide, resistances or weaknesses.
// `study: n` -- the line says the knowledge is learned from kills, so it reads
// a family only after n of them.
// ---------------------------------------------------------------------------
export const STUDY_KILLS = 3;
export const CATALOGUE_READS = {
  // "Identifying an enemy's worn armour shows its weakest plate."
  'outworlder.identify|armour': { readHide: true },
  // "Identification reveals the flaw in any object, structure or worn armour, including on enemies."
  'outworlder.identify|cataclysm': { readHide: true },
  // "Identifying a piece of armour reveals its seams."
  'outworlder.identify|needle': { readHide: true },
  // "...shows which enemy types it would serve best against."
  'outworlder.identify|arsenal': { readWeak: true },
  // "Looking at any creature shows ... the location where it is most vulnerable."
  'outworlder.language|flesh': { readHide: true },
  // "You can read the weak point of anything with a written or engraved surface, including armour inscriptions."
  'outworlder.language|needle': { readHide: true },
  // "Once enough pages are written, the species' weaknesses, resistances and habits are revealed whenever you look at one."
  'outworlder.loot|knowledge': { readHide: true, readResist: true, readWeak: true, study: STUDY_KILLS },
  // "Hovering over an enemy's marker shows its health, resistances and weaknesses."
  'outworlder.minimap|arsenal': { readResist: true, readWeak: true },
  // "Armoured enemies, shelled monsters and constructs are marked ... with the side where their protection is thinnest."
  'outworlder.minimap|claw': { readHide: true },
  // "...along with the one damage type that halts their regeneration."
  'outworlder.minimap|troll': { readWeak: true },
  // "Every enemy beneath it ... has its weaknesses shown on the map."
  'outworlder.blessing@eye|eye': { readWeak: true },
  // "Each enemy struck by your area-of-effect abilities is studied. When it dies, you learn its resistances and
  // weaknesses for every enemy of its kind." ROUND 386 -- as written: `study: 'aoe'` (STUDY_AOE below).
  'outworlder.blessing@eye|knowledge': { readResist: true, readWeak: true, study: 'aoe' },
  // "Identifying an enemy's armour or shield reveals its weakest seam."
  'outworlder.blessing@builder|needle': { readHide: true },
  // "Enemies carrying your afflictions have a weak point marked on them."
  'outworlder.blessing@reaper|needle': { readHide: true },
  // "...every ally in your party learns the target's weaknesses and remaining health instantly."
  'outworlder.blessing@throne|network': { readWeak: true },
};

/** ROUND 386 -- Burning Library, built as its words say. A creature struck by one of your area abilities is marked
 *  studied (`_aoeStruck`); when a marked creature dies, by any hand, its family is learned (player.studiedFamilies).
 *  Its second line, "Area effects deal increased damage to every kind of enemy you have studied, and you can see their
 *  health from across the map": area abilities deal STUDY_AOE_DMG more to a studied kind, and studied kinds show a
 *  health bar over them and a health-coloured mark on the map at any range. */
export const STUDY_AOE_DMG = 0.15;
/** What one evolution reads: { readHide?, readResist?, readWeak?, study? }. From the catalogue table by the
 *  evolution's spec key, and from its own fx (the family gifts carry `readHide` there). */
export function evolutionReads(evo) {
  const out = {};
  if (!evo) return out;
  const cat = evo.specKey && CATALOGUE_READS[String(evo.specKey).toLowerCase()];
  for (const f of READ_FIELDS) if ((cat && cat[f]) || (evo.fx && evo.fx[f] === true)) out[f] = true;
  if (cat && cat.study) out.study = cat.study;
  return out;
}

/** Fold a list of evolutions: `always` holds the reads that need nothing more; `study[f]` is the fewest kills of a
 *  family after which a study-gated read reveals it (absent when no evolution grants it that way). */
export function natureReadsOf(evos = []) {
  const always = {}, study = {}, aoe = {};
  for (const e of evos || []) {
    const r = evolutionReads(e);
    for (const f of READ_FIELDS) {
      if (!r[f]) continue;
      if (r.study === 'aoe') aoe[f] = true;
      else if (r.study) study[f] = Math.min(study[f] == null ? Infinity : study[f], r.study);
      else always[f] = true;
    }
  }
  for (const f of Object.keys(study)) if (always[f]) delete study[f];
  for (const f of Object.keys(aoe)) if (always[f]) delete aoe[f];
  return { always, study, aoe: Object.keys(aoe).length ? aoe : null };
}

/** Which reads apply to a target of `family`, given the player's passive mods, their kills of that family, and whether
 *  they have studied it with an area ability (Burning Library). */
export function readsForTarget(mods = {}, familyKills = 0, studied = false) {
  const out = {};
  const study = mods.readStudy || {};
  const aoe = (studied && mods.readStudyAoe) || {};
  for (const f of READ_FIELDS) {
    out[f] = !!mods[f] || (study[f] != null && familyKills >= study[f]) || !!aoe[f];
  }
  if (mods.leySight) out.readResist = true;   // round 62's row, kept
  return out;
}

// ---------------------------------------------------------------------------
// WHAT THE READ SAYS. Pure, so the frame, the bestiary and the suite share it.
// ---------------------------------------------------------------------------
const label = (t) => (DAMAGE_TYPES[t] && DAMAGE_TYPES[t].label) || (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
const pct = (k) => `${k > 1 ? '+' : '-'}${Math.round(Math.abs(k - 1) * 100)}%`;
const uniq = (a) => [...new Set(a.filter(Boolean))];

/**
 * { hide, resists, weak } for a creature: `family` (combatTypes FAMILY_COMBAT), `own` the element it is made of
 * (the monster's dmgElement, which it turns aside and whose opposites bite it), `stats` its type's stat block
 * (resist_<type> entries). `hide` is a sentence or null; `resists` and `weak` are label lists, maybe empty.
 */
export function monsterReadout({ family = null, own = null, stats = null } = {}) {
  const row = family ? FAMILY_COMBAT[family] : null;
  const hideDef = row && row.hide ? HIDE_CLASSES[row.hide] : null;
  let hide = null;
  if (hideDef) {
    const bits = PHYS_SUBTYPES.filter(t => typeof hideDef[t] === 'number' && hideDef[t] !== 1)
      .map(t => `${t} ${pct(hideDef[t])}`);
    hide = bits.length ? `${hideDef.label}: ${bits.join(', ')}` : hideDef.label;
  } else if (row) hide = 'No hide to speak of';
  const ownT = own && own !== 'physical' && own !== 'transcendent' ? own : null;
  const statRes = Object.entries(stats || {})
    .filter(([k, v]) => /^resist_/.test(k) && v > 0.05).map(([k]) => k.slice(7));
  const hideOther = hideDef ? Object.entries(hideDef).filter(([k, v]) => typeof v === 'number' && !PHYS_SUBTYPES.includes(k) && k !== 'physical') : [];
  const resists = uniq([...((row && row.resist) || []), ownT, ...statRes, ...hideOther.filter(([, v]) => v < 1).map(([k]) => k)]);
  const weak = uniq([...((row && row.weak) || []), ...((ownT && TYPE_WEAKNESS[ownT]) || []), ...hideOther.filter(([, v]) => v > 1).map(([k]) => k)])
    .filter(t => !resists.includes(t) && !PHYS_SUBTYPES.includes(t));
  return { hide, resists: resists.map(label), weak: weak.map(label) };
}

/** Every sense key in SENSE_READS is a real sense; every essence in ESSENCE_READS is a real id shape. For the suite. */
export function combatReadFaults() {
  const out = [];
  for (const k of Object.keys(SENSE_READS)) if (!SENSES[k]) out.push(`SENSE_READS names unknown sense ${k}`);
  for (const [k, t] of [...Object.entries(SENSE_READS), ...Object.entries(ESSENCE_READS)]) {
    for (const [r, list] of Object.entries(t)) {
      if (!RANK_LADDER.includes(r)) out.push(`${k}: bad rank ${r}`);
      for (const f of list) if (!READ_FIELDS.includes(f)) out.push(`${k}: bad read ${f}`);
    }
  }
  return out;
}
