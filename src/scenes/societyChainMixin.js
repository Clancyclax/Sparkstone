// ===========================================================================
// ROUND 405 -- THE MAGIC SOCIETY'S SPECIALTY CHAINS, IN THE SCENE (data: src/data/societyChains.js).
//
// The senior of any Magic Society hall (the Archmage or the Magister) gives the chain of the theory you study, one step a
// rank. Each step is two parts the martial lessons' engine already runs (martialMasterMixin `_lessonTick` / `_lessonEvent`,
// so stillness, vigils, champions, waves and the world-map pins all work the same): the STUDY at the site, then its
// TRIAL. They live in the same book as the lessons, under the key `soc:<theory>` (`skillBooks.masterQuests`), with the
// chain's own record (`skillBooks.societyChain[theory]` = { insights, ranks: { [rk]: { part, dest, claimed } } }).
//
// At the site one or two Society officials are camped (and, at Iron and Bronze, someone from the Division); they stand
// while you are in the site's square and talk about the site and the Division. Back at the hall, the senior gives the
// step's advanced insight (ritualTheory.js `theoryPerkOf` grows each perk by SOCIETY_INSIGHT_STEP) and the training's pay.
// ===========================================================================
import { SOCIETY_CHAINS, SOCIETY_RANK_NAMES, SOCIETY_CHAIN_PAY, DIVISION_BEATS, SOCIETY_INSIGHT_GROWS, SOCIETY_INSIGHT_STEP,
  SOCIETY_TRIAL_FAMILIES, societyChainPart } from '../data/societyChains.js';
import { THEORIES, ELEMENTAL_FAMILIES, SOUL_FAMILIES, BEAST_FAMILIES } from '../data/ritualTheory.js';
import { fieldOfficial } from '../data/societyArt.js';
import { MONSTER_TYPES, monsterKeysAtTier } from '../data/monsters.js';
import { grantCoins } from '../data/inventory.js';
import { stableHash } from '../data/awakening.js';
import { TILE } from '../data/iso.js';
import { monsterLabelFor } from '../data/quests.js';

const KEY = (theory) => `soc:${theory}`;
const FAMILY_SETS = { elemental: ELEMENTAL_FAMILIES, soul: SOUL_FAMILIES, beast: BEAST_FAMILIES };
const CHAMP_NAMES = ['of the Site', 'the Drawn', 'the Waking', 'the Watcher', 'the Unbidden', 'the Keeper'];
function mix(h) { h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0; }

export const SocietyChainMixin = {
  _socBook() {
    const sb = this.player.skillBooks || (this.player.skillBooks = {});
    return sb.societyChain || (sb.societyChain = {});
  },
  _socChain(theory) {
    const b = this._socBook();
    return b[theory] || (b[theory] = { insights: 0, ranks: {} });
  },
  /** The rank this theory's chain is at: the lowest unclaimed rank, if your own rank has reached it. */
  _socRankNext(theory) {
    const c = this._socChain(theory);
    const mine = Math.max(1, Math.min(4, this._playerRankIndex ? this._playerRankIndex() : 1));
    for (let rk = 1; rk <= 4; rk++) {
      const r = c.ranks[rk];
      if (r && r.claimed) continue;
      return rk <= mine ? rk : null;
    }
    return 0;   // all four done
  },

  /** A study site: a world-map square of the step's tier, chosen once per (theory, rank, run). */
  _socPickSite(theory, rk) {
    const squares = (this._dojoPlaces ? this._dojoPlaces() : []).map(d => ({ area: `q:${d.sheet}:${d.sx}:${d.sy}`,
      areaLabel: this._squareLabel ? this._squareLabel(d) : d.name, sheet: d.sheet, sx: d.sx, sy: d.sy, tier: d.tier, square: true }));
    if (!squares.length) return null;
    const fit = squares.filter(s => rk >= 4 ? s.tier >= 3 : Math.abs((s.tier || 1) - rk) <= 1);
    const pool = fit.length ? fit : squares;
    // not a square a master's dojo is in (a dojo is a quiet place), when there is a choice
    const h = mix(stableHash(`socsite|${this._masterSeed || 0}|${theory}|${rk}`));
    return pool[h % pool.length];
  },
  /** A champion for the trial: of the theory's own family where it has one, at the step's tier. */
  _socChamp(theory, rk, i) {
    const keys = monsterKeysAtTier(Math.max(1, Math.min(4, rk)));
    const set = FAMILY_SETS[SOCIETY_TRIAL_FAMILIES[theory]];
    const own = set ? keys.filter(k => MONSTER_TYPES[k] && set.has(MONSTER_TYPES[k].family)) : [];
    const pool = own.length ? own : keys;
    if (!pool.length) return null;
    const h = mix(stableHash(`socchamp|${this._masterSeed || 0}|${theory}|${rk}|${i}`));
    const key = pool[h % pool.length];
    const t = MONSTER_TYPES[key];
    const label = monsterLabelFor(key) || (t && (t.label || t.name)) || key;
    return { key, name: `${label} ${CHAMP_NAMES[(h >>> 7) % CHAMP_NAMES.length]}` };
  },

  /** The senior's part of a talk: the chain of the theory you study. Adds to `body` and `choices`. */
  _socSeniorTalk(e, body, choices) {
    const sb = this.player.skillBooks || {};
    const theory = sb.theory;
    if (!theory || !SOCIETY_CHAINS[theory]) {
      body.push('', '"Study one of the nine theories -- the archivist at the door keeps them -- and the Society will have work for you in it."');
      return;
    }
    const T = THEORIES[theory];
    const rk = this._socRankNext(theory);
    const c = this._socChain(theory);
    if (rk === 0) { body.push('', `"You have walked every road ${T.name} has. There is nothing the Society can teach you in it that you have not seen."`); return; }
    if (rk === null) { body.push('', '"There is more, but not for your rank. Rise, and come back."'); return; }
    const RN = SOCIETY_RANK_NAMES[rk];
    const S = SOCIETY_CHAINS[theory][rk];
    const rec = this._lessonRec(KEY(theory), rk);
    const r = c.ranks[rk] || (c.ranks[rk] = { part: 0, dest: null, claimed: false });
    const D = DIVISION_BEATS[rk];
    body.push('', `${T.name}, ${RN}:`);
    if (!rec.step && !r.done) {
      body.push(`"${S.brief}"`);
      if (rk <= 2) body.push('', `"${D.official.split('. ')[0]}."`);
      else if (rk === 4) body.push('', `"${D.official}"`);
      const d = r.dest || this._socPickSite(theory, rk);
      if (d) body.push('', `  · The site: ${S.site}, in ${d.areaLabel}. (Marked on your world map when you take it.)`);
      choices.push({ label: `Take the study (${RN})`, act: `soc|accept|${theory}|${rk}` });
      return;
    }
    if (!r.done) {
      const s = rec.step;
      body.push(`  ${r.part === 0 ? '·' : '✓'} ${S.study}`, `  ${r.part === 1 ? '·' : ' '} The trial: ${S.trial.foe}${r.part === 1 && s ? this._lessonProgress(s) : ''}`, '', '"The officials at the site will help you. Come back when it is done."');
      return;
    }
    body.push(`"${S.insight}"`, '', `(An advanced insight: your ${SOCIETY_INSIGHT_GROWS[theory]} grow by ${Math.round(SOCIETY_INSIGHT_STEP * 100)}%. The Society pays your training.)`);
    choices.push({ label: 'Take the insight', act: `soc|claim|${theory}|${rk}` });
  },

  _socAct(what, theory, rk) {
    rk = Number(rk);
    if (!SOCIETY_CHAINS[theory] || !(rk >= 1 && rk <= 4)) return false;
    const c = this._socChain(theory);
    const r = c.ranks[rk] || (c.ranks[rk] = { part: 0, dest: null, claimed: false });
    const rec = this._lessonRec(KEY(theory), rk);
    if (what === 'accept') {
      if (rec.step || r.done || r.claimed) return false;
      r.dest = r.dest || this._socPickSite(theory, rk);
      if (!r.dest) return false;
      r.part = 0;
      rec.step = societyChainPart(theory, rk, 0, r.dest, (i) => this._socChamp(theory, rk, i));
      this._floatText(this.world.x, this.world.y - 40, `${SOCIETY_RANK_NAMES[rk]} study: ${THEORIES[theory].name}`, '#b39ddb');
      return true;
    }
    if (what === 'claim') {
      if (!r.done || r.claimed) return false;
      r.claimed = true;
      c.insights = Math.min(4, (c.insights || 0) + 1);
      rec.stage = 3; rec.step = null;
      const coin = ['normal', 'iron', 'bronze', 'silver', 'gold'][rk];
      grantCoins(this.player.coins, coin, SOCIETY_CHAIN_PAY[rk]);
      this._floatText(this.world.x, this.world.y - 60, `Advanced insight: ${THEORIES[theory].name}`, '#ffd54f');
      if (this._renderInventory) this._renderInventory();
      return true;
    }
    return false;
  },

  /** Every frame: the study done becomes the trial; the trial done is the step done; the site's officials. */
  _socTick(dt) {
    const sb = this.player && this.player.skillBooks;
    const book = sb && sb.masterQuests;
    if (!book) { this._socSiteFolk(null); return; }
    let here = null;
    const area = this._areaKeyHere ? this._areaKeyHere() : null;
    for (const [key, q] of Object.entries(book)) {
      if (!key.startsWith('soc:') || !q || !q.ranks) continue;
      const theory = key.slice(4);
      for (const [rkS, rec] of Object.entries(q.ranks)) {
        const rk = +rkS, s = rec && rec.step;
        if (!s) continue;
        const c = this._socChain(theory), r = c.ranks[rk];
        if (!r) continue;
        if (!s.done && s.dest && s.dest.area === area) here = { theory, rk, r };
        if (!s.done || !this._lessonDone(s)) continue;
        if (r.part === 0) {
          r.part = 1;
          rec.step = societyChainPart(theory, rk, 1, r.dest, (i) => this._socChamp(theory, rk, i));
          this._floatText(this.world.x, this.world.y - 80, `Studied. Now the trial: ${SOCIETY_CHAINS[theory][rk].trial.foe}`, '#b39ddb');
          if (r.dest && r.dest.area === area) here = { theory, rk, r };
        } else if (!r.done) {
          r.done = true;
          rec.step.done = true;
          this._floatText(this.world.x, this.world.y - 80, `The ${SOCIETY_RANK_NAMES[rk]} study is done. Return to the Magic Society.`, '#b39ddb');
        }
      }
    }
    this._socSiteFolk(here && !this._insideRoom ? here : null);
  },

  /** The officials camped at the site you are in (one or two, and the Division's at Iron and Bronze). */
  _socSiteFolk(here) {
    const cur = this._socSite;
    const same = cur && here && cur.theory === here.theory && cur.rk === here.rk;
    if (same) return;
    if (cur) { for (const e of cur.folk) if (this._societyRemove) this._societyRemove(e); this._socSite = null; }
    if (!here || !this._societyMember) return;
    const folk = [];
    const h = mix(stableHash(`socfolk|${here.theory}|${here.rk}|${this._masterSeed || 0}`));
    const n = 1 + (h % 2);
    const spot = (k) => {
      for (let j = 0; j < 12; j++) {
        const th = (h % 360) * Math.PI / 180 + k * 1.3 + j * 0.5;
        const x = this.world.x + Math.cos(th) * TILE * (5 + k), y = this.world.y + Math.sin(th) * TILE * (5 + k);
        if (!this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 14)) return { x, y };
      }
      return { x: this.world.x + TILE * (5 + k), y: this.world.y };
    };
    for (let i = 0; i < n; i++) {
      const off = fieldOfficial(h >>> (i * 5));
      const at = spot(i);
      const e = this._societyMember(off.key, off.type, at.x, at.y, { field: true, socSite: here.theory, socRank: here.rk, post: 'field', wander: true, wanderR: TILE * 2 });
      e.name = `${off.title} ${e.name.split(' ').slice(-2).join(' ')}`;
      folk.push(e);
    }
    const D = DIVISION_BEATS[here.rk];
    if (D && D.who) {
      const off = fieldOfficial(h >>> 13);
      const at = spot(n);
      const e = this._societyMember(off.key, 'necrotic', at.x, at.y, { field: true, socSite: here.theory, socRank: here.rk, division: true, post: 'field' });
      e.name = `${D.who} ${e.name.split(' ').slice(-1)[0]}`;
      e.title = D.who;
      folk.push(e);
    }
    this._socSite = { theory: here.theory, rk: here.rk, folk };
  },

  /** A site official's talk (societyMixin `_societyTalk` sends it here). */
  _socSiteTalk(e) {
    const S = SOCIETY_CHAINS[e.socSite] && SOCIETY_CHAINS[e.socSite][e.socRank];
    const D = DIVISION_BEATS[e.socRank];
    if (!S) return false;
    const c = this._socChain(e.socSite), r = c.ranks[e.socRank] || {};
    let text;
    if (e.division) text = `${e.name} of the Division of Essence Research looks up from a measuring frame.\n\n"${D.division}"`;
    else {
      const what = r.done ? 'It is done. Go back to the hall and tell them.'
        : r.part === 0 ? `${S.study} -- stand at the heart of it, still, and let it read you back. We will keep the notes.`
          : `It is coming: ${S.trial.foe}. We cannot fight it. You can.`;
      text = `${e.name} of the Magic Society, camped at ${S.site}.\n\n"${what}"\n\n"${D.official}"`;
    }
    this._openDialogue(e.name, text, e);
    return true;
  },

  /** ROUND 405 -- "officials help find where to search at each rank": an official met in the wilds points you to your
   *  open study's site, if you have one. */
  _socFieldHint() {
    const sb = this.player && this.player.skillBooks;
    const book = sb && sb.societyChain;
    if (!book) return null;
    for (const [theory, c] of Object.entries(book)) for (const [rk, r] of Object.entries(c.ranks || {})) {
      if (!r || r.done || r.claimed || !r.dest) continue;
      const S = SOCIETY_CHAINS[theory] && SOCIETY_CHAINS[theory][rk];
      if (S) return `"You are the one the hall sent to ${S.site}? Our camp is in ${r.dest.areaLabel}. It is on your map -- go carefully."`;
    }
    return null;
  },

  /** The tracker row for every open chain step. */
  _socTrackerRow() {
    const sb = this.player && this.player.skillBooks;
    const book = sb && sb.societyChain;
    if (!book) return '';
    let out = '';
    for (const [theory, c] of Object.entries(book)) {
      for (const [rk, r] of Object.entries(c.ranks || {})) {
        if (!r || r.claimed) continue;
        const rec = sb.masterQuests && sb.masterQuests[KEY(theory)] && sb.masterQuests[KEY(theory)].ranks && sb.masterQuests[KEY(theory)].ranks[rk];
        if (!rec || (!rec.step && !r.done)) continue;
        const S = SOCIETY_CHAINS[theory][rk];
        const line = r.done ? 'return to the Magic Society' : `${r.part === 0 ? S.study : `the trial: ${S.trial.foe}`} -- ${r.dest ? r.dest.areaLabel : 'the site'}`;
        out += `<div class="qt-row${r.done ? ' qt-ready' : ''}"><div class="qt-name">Magic Society: ${THEORIES[theory].name.replace(' Magical Theory', '')} (${SOCIETY_RANK_NAMES[rk]})</div><div class="qt-prog">${line}</div></div>`;
      }
    }
    return out;
  },
};
