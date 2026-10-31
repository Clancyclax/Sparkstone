// ============================================================================
// ROUND 382 -- NAMES THAT READ LIKE ABILITY NAMES.
//
// The user: "Buzzing Narrow Waist doesnt really sound like an ability name. It
// sounds like someone shook up a hat full of words that people associate with
// wasp and just put them in a row. AI slop name."
//
// The composed namer stood an adjective in front of a motif part ("Buzzing
// Narrow Waist", "Quick Soft Pads"), or a noun in front of an adjective ("Haft
// Enduring", "Cloth Static"), or two nouns side by side ("Hair Whetstone").
// None of those says what the ability does. A name here is the ability's
// FUNCTION word (what it does: Dart, Rush, Rhythm, Shell, Mend, Bolt...) plus
// ONE word of the essence or stone (an essence verb as an action -- "Stinging"
// -- or a possessive -- "Wasp's", "Sickle's" -- or the stone's word).
// ============================================================================
import { THEME_SHAPE_BY_ID } from './themePassives.js';

/** What an ability does, as nouns a name can end on. Keyed by template; `null` = no opinion. */
const BY_TEMPLATE = {
  projectileBall: ['Bolt', 'Shot', 'Dart'], volley: ['Volley', 'Barrage'], breathCone: ['Breath', 'Gout'], beam: ['Beam', 'Ray'],   // ROUND 392
  aoeRing: ['Burst', 'Nova', 'Ring'], chainStrike: ['Lash', 'Chain'], rangeStrike: ['Strike', 'Thrust'],
  sunderStrike: ['Sunder', 'Rend'], stackStrike: ['Flurry', 'Strikes'], imbueStrike: ['Edge', 'Brand'],
  corpseBlast: ['Burst', 'Rupture'], selfHeal: ['Mend', 'Balm'], selfHot: ['Renewal', 'Mending'],
  aoeHealPulse: ['Wellspring', 'Mend'], absorbShield: ['Ward', 'Shell'], barrierWall: ['Wall', 'Bulwark'],
  movementHaste: ['Rush', 'Sprint'], blink: ['Step', 'Flicker'], dash: ['Dash', 'Lunge'],
  passiveMove: ['Stride', 'Step'], cooldownPassive: ['Rhythm', 'Tempo'], selfCritBuff: ['Focus', 'Eye'],
  thornsBuff: ['Barbs', 'Spines'], reflectWard: ['Riposte', 'Reversal'], weakenRing: ['Hex', 'Blight'],
  summonBonded: ['Brood', 'Kin'], cleanse: ['Purge', 'Cleansing'], resourceRestore: ['Second Wind', 'Breath'],
  timeFreeze: ['Stillness', 'Hold'], stacking: ['Momentum', 'Build'], triggeredPassive: ['Instinct', 'Reflex'],
};
const ACTION_WORDS = new Set(['Bolt', 'Shot', 'Dart', 'Volley', 'Barrage', 'Breath', 'Gout', 'Burst', 'Nova', 'Lash', 'Chain',
  'Strike', 'Thrust', 'Sunder', 'Rend', 'Flurry', 'Strikes', 'Rupture', 'Rush', 'Sprint', 'Step', 'Flicker', 'Dash', 'Lunge',
  'Stride', 'Chase', 'Pursuit', 'Flight', 'Escape', 'Sidestep', 'Surge', 'Riposte', 'Counter', 'Edge', 'Brand']);
const BY_BUFF = { dmg: ['Fury', 'Edge'], crit: ['Eye', 'Mark'], armor: ['Shell', 'Hide'], maxHp: ['Vigour', 'Heart'] };

/** Function words for a spec, or [] when it has none worth saying. */
export function functionWords(spec) {
  if (!spec) return [];
  if (spec.themeShape && THEME_SHAPE_BY_ID[spec.themeShape.id]) return THEME_SHAPE_BY_ID[spec.themeShape.id].words;
  if (spec.template === 'passiveBuff') return BY_BUFF[spec.buffKind] || BY_BUFF.maxHp;
  return BY_TEMPLATE[spec.template] || [];
}

/** "sting" -> "Stinging", "reap" -> "Reaping", "dart" -> "Darting", "hop" -> "Hopping", "weave" -> "Weaving". */
export function gerund(verb) {
  let v = String(verb || '').trim().toLowerCase();
  if (!v || /\s/.test(v)) return null;
  if (v.endsWith('ie')) v = `${v.slice(0, -2)}y`;
  else if (/[^aeiou]e$/.test(v) && !/ee$/.test(v)) v = v.slice(0, -1);
  else if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v)) v = v + v.slice(-1);   // one syllable, CVC: hop -> hopp
  const g = `${v}ing`;
  return g[0].toUpperCase() + g.slice(1);
}

// An adjective-shaped essence or stone cannot take a possessive: "Resolute's Instinct", "Vast's Mend".
const ADJ_ESS = /^(swift|feeble|cold|dark|resolute|calm|keen|wild|bright|quick|still|deep|mighty|sharp|dire|vast|grim|bold|hollow|silent|true|pure|malign|potent|adept|myriad|elastic|harmonic|karmic|elemental|zeal|wise|free|lost|rare|young|old|first|last)$|(ful|ous|ive|ic|ed|less|ish|ile|able|ible|ant|ent|ary|ory|al)$/i;
const possessive = (w) => /s$/i.test(w) ? `${w}'` : `${w}'s`;
const title = (w) => String(w || '').split(/\s+/).filter(Boolean).map(x => x[0].toUpperCase() + x.slice(1)).join(' ');

/**
 * Candidate names, best first: "Stinging Rush", "Wasp's Rush", "Eye Rush"... one modifier + one function word.
 * `motif` is the essence motif ({verbs}); `stoneWord` the socketed stone's word (may be null).
 */
export function functionalNames(spec, essName, stoneWord, motif, seed = 0) {
  const fw = functionWords(spec);
  if (!fw.length) return [];
  const verbs = ((motif && motif.verbs) || []).filter(v => !/\s/.test(v));
  const mods = [];
  const rot = (arr, k) => arr.length ? arr.slice(k % arr.length).concat(arr.slice(0, k % arr.length)) : arr;
  for (const v of rot(verbs, seed)) { const g = gerund(v); if (g) mods.push(g); }
  const S = stoneWord && !/^the\b/i.test(stoneWord) && String(stoneWord).split(/\s+/).length === 1 ? title(stoneWord) : null;
  const out = [];
  const fws = rot(fw, seed >> 3);
  for (const f of fws) {
    // An essence's verb reads as an action only in front of an action ("Stinging Rush", "Reaping Lash"); in
    // front of a thing it is a pile again ("Piercing Renewal"), so a thing takes a possessive ("Wasp's Shell").
    const act = ACTION_WORDS.has(f) ? mods.filter(m => !m.toLowerCase().startsWith(f.toLowerCase().slice(0, 4))) : [];
    if (act[0]) out.push(`${act[0]} ${f}`);
    if (essName && !ADJ_ESS.test(String(essName).split(/\s+/).pop())) out.push(`${possessive(title(essName))} ${f}`);
    if (S && !ADJ_ESS.test(S)) out.push(`${possessive(S)} ${f}`);
    for (const m of act.slice(1)) out.push(`${m} ${f}`);
  }
  // A function word that is itself the essence/stone word ("Eye's Eye") is a pile.
  return out.filter(n => { const w = n.toLowerCase().replace(/'s?\b/g, '').split(/\s+/); return new Set(w).size === w.length; });
}

/** ROUND 382 -- the "hat full of words" shapes, for the measure and for the composed namer's veto:
 *  an adjective before a multi-word motif part, a noun followed by an adjective, two motif nouns in a row. */
const ADJ_TAIL = /^(swift|feeble|cold|dark|resolute|calm|keen|wild|bright|quick|still|deep|mighty|sharp|dire|vast|grim|bold|hollow|silent|true|static|enduring|ascendant|unspent)$|(ful|ous|ive|ic|less|ish|ile|able|ible|ant|ent|ary|ory)$/i;
export function isWordPileName(name, parts = []) {
  const n = String(name || '').toLowerCase().trim();
  const words = n.split(/\s+/);
  if (/\b(of|the|and|that|at|in)\b/.test(n) || /'s?\b/.test(n)) return false;
  const P = parts.map(x => String(x).toLowerCase());
  if (P.some(x => x.split(/\s+/).length >= 2 && n.endsWith(x) && n.length > x.length + 1)) return true;
  if (words.length === 2 && ADJ_TAIL.test(words[1])) return true;
  if (words.length === 2 && P.includes(words[0]) && P.includes(words[1])) return true;
  return false;
}
