// ============================================================================
// ROUND 388 -- MASKED EFFECTS: no rider that the ability's own effect makes pointless.
//
// The user, on Snowdrift Camouflage ("Holds every creature within 8 tiles in place for 5 seconds. Whatever it hits is
// slowed by 27% for 3s."): "for 3 of those seconds it's slowed. Which is irrelevant because it can't move. An ability
// that makes you invincible and grants you 100% dodge chance would be equally stupid, lets not stack effects where 1
// effect doesn't have any effect due to the other effect."
//
// THE RULE (one rule, applied everywhere): a rider whose whole effect falls inside something the SAME ability already
// does to the SAME targets is DROPPED -- its field and its sentence. Not reworded, not delayed.
//   * a slow on the targets (`bindOnHit`) that ends before the ability's own hold on them does (a time-freeze, a sure
//     [Frozen] / [Stunned] / [Pinned]) -- they cannot move, so the slow does nothing;
//   * a defence on you (`dodgeBonus`, `armorBonus`, `resist`, `damageReduction`) on an immunity: while nothing reaches
//     you, a dodge chance or a thicker guard does nothing (the dodge window is 3s, the immunity at least 5s).
//
// Called twice: by the lever twist (awakening.js applyEssenceFlavour), where these riders are born, so the twist never
// writes one; and over the finished kit (applyMaskedEffects), so a rider from any other route is caught too.
// Pure data + text; no imports.
// ============================================================================

export const HOLD_DEBUFF_KEYS = new Set(['freeze', 'stun', 'pinned']);
const DODGE_WINDOW = 3;   // attackRoleMixin _applyLeverCastRiders: a dodge window with no duration of its own

/** Seconds this ability is sure to hold everything it touches unable to move (0 = it does not). */
export function holdSecondsOf(a) {
  if (!a) return 0;
  if (a.template === 'timeFreeze') return a.freezeDuration || 5;
  for (const d of [a.debuff, ...(Array.isArray(a.debuffs) ? a.debuffs : [])]) {
    if (d && HOLD_DEBUFF_KEYS.has(d.key) && (d.chance == null || d.chance >= 1) && d.duration > 0) return d.duration;
  }
  return 0;
}

/** Seconds this ability makes you immune to every blow (0 = it does not). */
export function immuneSecondsOf(a) {
  return a && a.template === 'immunityBuff' ? (a.immunityDuration || 0) : 0;
}

const sentences = (t) => String(t || '').split(/(?<=\.)\s+/).filter(Boolean);
const dropSentences = (t, re) => sentences(t).filter(s => !re.test(s)).join(' ');

// The sentences each rider is written in (awakening.js: the anchor bank, the shift lever, grantResistance's banks).
const SLOW_RE = /\b(?:is slowed by \d+%|moves? \d+% slower|\d+% slower for)/i;
const DODGE_RE = /\bdodge chance\b/i;
const ARMOUR_RE = /\barmou?r\b|\bguard by \d+%/i;
const RESIST_RE = /\bresistance\b|\byou take \d+% less\b|\bshrug off \d+%/i;
const DR_RE = /\bdamage reduction\b|\btake \d+% less damage\b/i;
const DEFENCE_STAT = /dodge|evas|armou?r|block|resist|damageReduction/i;
const RIDER_BUFF_RE = /\bYour [a-z ]*(?:dodge|evasion|armou?r|block|resist)[a-z ]* rises \d+%/i;
// ...and the fragment each prints on the stats line (statsLineFor), dropped from the line the ability already has: a
// few earlier passes hand-edit `stats`, so the line is trimmed rather than rebuilt.
const STATS_FRAG = {
  bindOnHit: /enemy speed for|\bslower\b/i, dodgeBonus: /\bdodge\b/i, armorBonus: /\barmou?r\b/i,
  resist: /\bresist/i, damageReduction: /damage reduction|less damage/i, riderBuff: /\b(?:dodge|evasion|armou?r|block)\b/i,
};

/**
 * Which riders on `a` are masked by its own effect. Returns [{ field, re }].
 */
export function maskedRiders(a) {
  const out = [];
  if (!a || a.canonKey) return out;
  const hold = holdSecondsOf(a);
  if (hold > 0 && a.bindOnHit && !((a.bindOnHit.duration || 0) > hold)) out.push({ field: 'bindOnHit', re: SLOW_RE });
  const immune = immuneSecondsOf(a);
  if (immune > 0) {
    const win = a.duration > 0 ? a.duration : a.buffDuration > 0 ? a.buffDuration : DODGE_WINDOW;
    if (a.dodgeBonus > 0 && win <= immune) out.push({ field: 'dodgeBonus', re: DODGE_RE, dodge: true });
    if (a.armorBonus > 0) out.push({ field: 'armorBonus', re: ARMOUR_RE });
    if (a.resist) out.push({ field: 'resist', re: RESIST_RE });
    if (a.damageReduction > 0) out.push({ field: 'damageReduction', re: DR_RE });
    // the composed `buff` rider ("Your dodge chance rises 8% for 12 seconds") when its stat is a defence
    const rb = a.riderBuff;
    if (rb && DEFENCE_STAT.test(String(rb.stat || '')) && !((rb.duration || 0) > immune)) out.push({ field: 'riderBuff', re: RIDER_BUFF_RE, composed: 'buff' });
  }
  return out;
}

/**
 * Drop the masked riders from `a` (mutated) and from `text` (its card, or the lever's rider sentence).
 * Returns { dropped: [field], text }.
 */
export function dropMaskedRiders(a, text) {
  const found = maskedRiders(a);
  for (const m of found) {
    delete a[m.field];
    if (m.composed && Array.isArray(a.composedRiders)) a.composedRiders = a.composedRiders.filter(x => x !== m.composed);
  }
  return { dropped: found.map(m => m.field), found, text: stripRiderText(text, found) };
}

/** The sentences of the riders in `found` (from maskedRiders), taken out of `text`. */
export function stripRiderText(text, found) {
  let t = String(text || '');
  for (const m of (found || [])) {
    // "You finish it 2 tiles from where you stood, with +4% dodge chance for it." keeps its step.
    if (m.dodge) t = t.replace(/, with \+\d+% dodge chance[^.]*\./g, '.');
    t = dropSentences(t, m.re);
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

/** The kit pass: every finished, non-canon ability loses the riders its own effect masks. */
export function applyMaskedEffects(known, knownList, { statsLineFor = null } = {}) {
  let n = 0;
  for (const k of Object.keys(known || {})) {
    const en = known[k];
    const a0 = en && en.ability;
    if (!a0 || a0.canonKey || !maskedRiders(a0).length) continue;
    const a = { ...a0 };
    const r = dropMaskedRiders(a, a0.desc);
    a.desc = r.text;
    if (typeof a._leverRider === 'string') a._leverRider = dropMaskedRiders({ ...a0 }, a0._leverRider).text;
    if (a0.stats) {
      a.stats = String(a0.stats).split(' · ').filter(p => !r.dropped.some(f => STATS_FRAG[f] && STATS_FRAG[f].test(p))).join(' · ');
    } else if (statsLineFor) { try { a.stats = statsLineFor(a); } catch (e) { /* no line */ } }
    const at = knownList ? knownList.indexOf(a0) : -1;
    en.ability = a;
    if (at >= 0) knownList[at] = a;
    n++;
  }
  return n;
}
