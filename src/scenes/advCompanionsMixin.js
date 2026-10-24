// ============================================================================
// ROUND 374 -- THE OTHER ADVENTURERS AS COMPANIONS.
// ROUND 375 -- REWORKED: LOYALTY, EARNED AND RETURNED (see data/advCompanions.js for the why).
//
// The scene side:
//   * DEEDS. What you do is scored against what each witness values (`_leadDeed`): your companions and anyone on a
//     trial see it; everyone hears of it (`lead.rep`, your reputation). Fed from the kill hook (`_leadOnKill`) and from a
//     once-a-second watch (`_leadTick`): new regions and places, quests turned in (contract / help / holy), books, rank.
//   * THE TALK to an adventurer who does not follow you: what they look for (their temperament), what holds them back,
//     their favour, "Work a job with me" (a trial: they walk with you for a game day, watching), a drink, "Join us."
//     On the restricted or illegal path, "You'll come with me." -- coercion -- for those who can be made to.
//   * THE TALK to one who does: how they find you (loyalty, what they like and dislike in how you work, who in the team
//     they get on with), a kind word, a planning council, a share of the purse, essence talks, their favour, the hall,
//     parting. On the fear path, a show of power, the Machiavelli line, and making an example.
//   * THE DAY: time together, waiting at the hall, chemistry between like and unlike minds, wavering, leaving (taking
//     your gear), mutiny.
//   * Caps, the reserve, density, art and saves as round 374 built them.
// ============================================================================
import { TILE } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { ADVENTURERS, ADV_BY_ID, ADV_TEAMS, ADV_TEAM_BY_ID, advArtKey, advStandModels, advRng } from '../data/adventurers.js';
import { ADVENTURER_ART } from '../data/adventurerArtManifest.js';
import { advSmallTalk, advOriginTales } from '../data/advTalk.js';
import { CHAR_ART } from '../data/characterManifest.js';
import { PARTY_BY_ID } from '../data/party.js';
import { ESSENCES } from '../data/abilities.js';
import { STONE_CATALOG } from '../data/stoneCatalog.js';
import { spendCoins, emptyCoinPurse, grantCoins, formatCoinPurse } from '../data/inventory.js';
import { restrictedHeld } from '../data/restricted.js';
import { RANK_LEVEL_XP } from '../data/essenceRank.js';
import { distributeBank } from '../data/abilityLevels.js';
import {
  ADV_LEAD_BY_ID, VALUES, DEEDS, ACTIVE_PARTY_MAX, companionCap, partyDensity, leadNeed, deedScore, deedByDim,
  firstImpression, chemistry, loyaltyOf, unbreakable, lawful, stanceVerdict, replyBy, notYetHint, ledgerLines,
  LEDGER_GOOD, LEDGER_BAD, temperament, advStoneRows, rankIdx, TRIAL_CLOCK, ESSENCE_TALKS, GOLD_IDX, LOYAL_AT,
  ESSENCE_SHAPES, ESSENCE_SHAPES_CONFLUENCE, STANCES, STANCE_REPLY, COUNCIL_REPLY, SHARE_REPLY, KIND_REPLY,
  EXAMPLE_WITNESS, MUTINY_LINE, OUTLAW_REFUSAL, CAP_FULL,
} from '../data/advCompanions.js';

const DRINK_PRICE = 50;
const RANK_WORD = { normal: 'Normal', iron: 'Iron', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' };
const ROLE_FOR_PARTY = { tank: 'tank', healer: 'healer', melee: 'melee', ranged: 'ranged', caster: 'ranged', support: 'healer', scout: 'ranged' };
const ROLE_LABEL = { tank: 'Tank', healer: 'Healer', melee: 'Melee', ranged: 'Ranged', caster: 'Caster', support: 'Support', scout: 'Scout' };
const LOYALTY_WORD = { loyal: 'loyal', steady: 'steady', wavering: 'wavering', leaving: 'about to leave', mutiny: 'on the edge of mutiny' };
const HELP_KINDS = new Set(['case', 'escort', 'supply', 'plague', 'rescue', 'request', 'survey']);
const WITNESS_TILES = 14;
const first = (name) => String(name || '').split(' ')[0];
const coinWord = (n) => { const p = emptyCoinPurse(); grantCoins(p, 'normal', n); return formatCoinPurse(p) || `${n}c`; };
const r1 = (x) => Math.round(x * 10) / 10;
const list = (xs) => xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

export const AdvCompanionsMixin = {
  // ------------------------------------------------------------------ state
  _leadState() {
    const p = this.player;
    if (!p.lead || (p.lead.v !== 1 && p.lead.v !== 2)) p.lead = { v: 2, who: {}, day: null };
    const st = p.lead;
    if (st.v === 1) {   // round 374's love / fear / hate, read as trust
      for (const r of Object.values(st.who || {})) {
        if (r.trust == null) r.trust = (r.love || 0) + (r.fear || 0) * 0.5;
        if (r.joined && r.joined.by === 'love') r.joined.by = 'loyalty';
      }
      st.v = 2;
    }
    st.rep = st.rep || {};
    st.seen = st.seen || { regions: {}, places: {}, quests: {} };
    st.executed = st.executed || {};
    st.fearRep = st.fearRep || 0;
    return st;
  },
  _leadRec(id) {
    const st = this._leadState();
    const r = st.who[id] = st.who[id] || {};
    if (r.trust == null) r.trust = 0;
    r.fear = r.fear || 0; r.hate = r.hate || 0;
    r.seen = r.seen || {};
    r.understood = r.understood || [];
    return r;
  },
  _leadDay() { return (this._dayIndex ? this._dayIndex() : 0) || 0; },
  /** Out of their team: following you, on a trial with you, or dead at your hand. */
  _leadJoined(id) {
    const st = this.player && this.player.lead;
    const r = st && st.who && st.who[id];
    return !!((r && (r.joined || r.trial)) || (st && st.executed && st.executed[id]));
  },
  /** "Within the restricted essence and illegal path Fear is an acceptable method of control." */
  _leadFearPath() {
    const p = this.player;
    if (!p) return false;
    if (this._onOutlawRoute && this._onOutlawRoute()) return true;
    return restrictedHeld(p.slotEssence || []).length > 0;
  },
  _leadOutlaw() { return !!(this._onOutlawRoute && this._onOutlawRoute()); },
  /** Would this follower walk away from an outlaw (outlawPartyMixin `_regularsLeave`)? */
  _leadLawfulMember(m) { return !!(m && m.advId && lawful(ADV_LEAD_BY_ID[m.advId])); },

  _leadUnitKey(a) {
    const team = ADV_TEAMS.find(t => t.members.includes(a.id));
    const st = this._advState();
    if (a.early && (!a.early.joins || !st.formed)) return `solo:${a.id}`;
    return team ? `team:${team.id}` : `solo:${a.id}`;
  },

  /** Trust as it stands: what they have seen, what they have heard, and the standing you had with them (round 362). */
  _leadCalc(a) {
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const st = this._leadState();
    const p = this.player;
    const key = this._leadUnitKey(a);
    const rel = this._advRel(key);
    const heard = firstImpression(lead.values, st.rep);
    const bond = Math.min(4, Math.max(0, rel.bond || 0));
    const trust = rec.trust + heard + bond;
    const team = key.startsWith('team:') ? ADV_TEAM_BY_ID[key.slice(5)] : null;
    const alive = team ? team.members.filter(id => !this._advState().dead[id] && !this._leadJoined(id)) : [];
    const need = leadNeed(lead, a, { playerRank: p.rank, inTeam: !rec.joined && alive.length > 1, leadsTeam: !rec.joined && !!(team && team.lead === a.id) });
    return { trust, heard, need, fear: rec.fear, hate: rec.hate, lead, rec, key };
  },

  _leadFollowing() { return (this.party || []).filter(m => m && m.recruited && !m.temporary).length; },
  _leadCap() { return companionCap(this.player && this.player.rank); },
  _leadCapFull() { return this._leadFollowing() >= this._leadCap(); },
  _leadActiveCount() { return (this.party || []).filter(m => m && m.recruited && !m.dismissed).length; },
  _leadReserve() { return (this.party || []).filter(m => m && m.recruited && m.dismissed && m.reserve); },
  _leadMembers() { return (this.party || []).filter(m => m && m.advId && m.recruited); },
  _partyDensityMult() { return partyDensity(this._leadActiveCount()); },

  // ------------------------------------------------------------------ deeds
  /** Who sees what you do: adventurers walking with you (followers and trials), near enough to see it. */
  _leadWitnesses() {
    return this._leadMembers().filter(m => !m.dismissed && Math.hypot(m.x - this.world.x, m.y - this.world.y) < WITNESS_TILES * TILE * 3);
  },

  /** A deed. Everyone hears of it; witnesses judge it by what they value. `only` limits it to one companion. */
  _leadDeed(key, opts = {}) {
    const d = DEEDS[key];
    if (!d) return 0;
    const st = this._leadState();
    const mult = opts.mult || 1;
    if (!opts.only) for (const [k, w] of Object.entries(d.dims)) st.rep[k] = (st.rep[k] || 0) + w * mult;
    const who = opts.only ? [opts.only] : this._leadWitnesses();
    let n = 0;
    for (const m of who) {
      const lead = ADV_LEAD_BY_ID[m.advId];
      if (!lead) continue;
      const rec = this._leadRec(m.advId);
      const s = deedScore(lead.values, key, mult);
      rec.trust += s;
      for (const [k, x] of Object.entries(deedByDim(lead.values, key, mult))) rec.seen[k] = (rec.seen[k] || 0) + x;
      n++;
    }
    return n;
  },

  /** From `_killMonster`. A kill above your rank, a great threat, a person, or one more on the pile. */
  _leadOnKill(m, credit) {
    if (!credit || !m || m.dummy || !this.player) return;
    const st = this._leadState();
    if (m.person) { this._leadDeed('person'); return; }
    const gap = this._natureRankGap ? this._natureRankGap(m) : 0;
    const big = gap >= 2 || !!(m.boss || m.wellBoss || (m.type && m.type.boss));
    if (big) {
      this._leadDeed('bigkill');
      // "Showing off power or soloing large threats will increase the fear of your followers."
      if (this._leadFearPath()) {
        const near = this._leadWitnesses();
        const solo = !near.length;
        st.fearRep += solo ? 1.5 : 1;
        for (const f of this._leadMembers()) { const r = this._leadRec(f.advId); r.fear += solo ? 3 : (near.includes(f) ? 2 : 1); }
        if (solo && this._leadMembers().length) this._floatText(this.world.x, this.world.y - 90, 'Word of it reaches your followers', '#b0bec5');
      }
    } else if (gap >= 1) this._leadDeed('risky');
    st.killTally = (st.killTally || 0) + 1;
    if (st.killTally >= 10) { st.killTally = 0; this._leadDeed('kills'); }
  },

  /** The once-a-second watch: places, quests, books, rank, people getting hurt, gear given. */
  _leadWatch() {
    const st = this._leadState();
    const p = this.player;
    const seen = st.seen;
    const primed = !!st.primed;
    // new regions, new places
    const rid = this.currentRegion && this.currentRegion.id;
    if (rid && !seen.regions[rid]) { seen.regions[rid] = this._leadDay() || 1; if (primed) this._leadDeed('region'); }
    const room = this._insideRoom;
    if (room && room.id && !room.vehicle && !room.home && !seen.places[room.id]) { seen.places[room.id] = 1; if (primed) this._leadDeed('place'); }
    // quests turned in
    for (const q of (p.quests || [])) {
      if (!q || q.state !== 'turnedIn') continue;
      const qid = q.id || `${q.kind}|${q.title || q.name || ''}|${q.boardKey || ''}`;
      if (seen.quests[qid]) continue;
      seen.quests[qid] = 1;
      if (!primed) continue;
      if (q.holyGod) this._leadDeed('holy');
      else if (q.fromNpc || HELP_KINDS.has(q.kind)) this._leadDeed('help');
      else this._leadDeed('contract');
    }
    const sc = (this._societyState && this._societyState().done) || 0;
    if (primed && sc > (st.societyDone || 0)) for (let i = st.societyDone || 0; i < sc; i++) this._leadDeed('contract');
    st.societyDone = sc;
    // books
    const books = JSON.stringify(p.skillBooks || {}).length;
    if (primed && books > (st.books || 0) + 4) this._leadDeed('book');
    st.books = books;
    // rank
    const ri = rankIdx(p.rank);
    if (primed && ri > (st.rankIdx || 0)) this._leadDeed('rank');
    st.rankIdx = ri;
    st.primed = true;
    // companions hurt, and what you give them
    for (const m of this._leadMembers()) {
      if (m.downT > 0 && !m._leadDown) { m._leadDown = true; this._leadDeed('down'); }
      else if (!(m.downT > 0)) m._leadDown = false;
      const sig = Object.values(m.gear || {}).filter(Boolean).length * 10 + (m.slotStones || []).reduce((s, r) => s + (r || []).length, 0);
      const rec = this._leadRec(m.advId);
      if (rec.gearSig != null && sig > rec.gearSig) { rec.trust += 2 * (sig - rec.gearSig >= 10 ? 1 : 0.5); rec.given = (rec.given || 0) + 1; }
      rec.gearSig = sig;
    }
  },

  // ------------------------------------------------------------ the talk, before they follow you
  _leadChoiceFor(a) {
    if (!a || !ADV_LEAD_BY_ID[a.id] || this._leadJoined(a.id)) return null;
    return { act: `lead|open|${a.id}`, label: 'Talk about joining up' };
  },

  _leadAct(act) {
    const [, op, id, arg] = String(act).split('|');
    if (op === 'call') { this._leadCallReserve(id); return; }
    if (op && op.startsWith('c')) { this._leadCompanionAct(op, id, arg); return; }
    const a = ADV_BY_ID[id];
    if (!a || !ADV_LEAD_BY_ID[a.id]) { this._closeDialogue(); return; }
    const npc = this._lastTalkNpc;
    if (op === 'back') {
      const e = npc && npc.adventurer;
      if (e && !e.gone && this._advChoices) {
        const unit = e.unit;
        this._openDialogue(unit.team ? `${a.name} — ${unit.name}` : a.name, 'Anything else?', npc, this._advChoices(unit, this._advRel(unit.key), a));
      } else this._closeDialogue();
      return;
    }
    if (this._leadJoined(a.id)) { this._closeDialogue(); return; }
    const said = this._leadDo(a, op, arg);
    if (said && said.done) return;
    this._leadPage(a, npc, said && said.text);
  },

  _leadDo(a, op) {
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const day = this._leadDay();
    const p = this.player;
    if (op === 'open') return { text: null };
    if (op === 'want') {
      rec.want = true;
      return { text: lead.want };   // their temperament reads under it, in the meter
    }
    if (op === 'doubt') { rec.doubt = true; return { text: lead.doubt }; }
    if (op === 'ask') {
      if (!rec.ask) {
        rec.ask = { kind: lead.ask.kind, at: day, kills: this.kills || 0, contracts: this._leadContracts(), raceWon: false };
        return { text: `${lead.ask.text}${this._leadAskTerms(lead.ask)}` };
      }
      return { text: this._leadAskStatus(a, lead, rec) };
    }
    if (op === 'pay') {
      if (!rec.ask || rec.askDone || lead.ask.kind !== 'coin') return { text: null };
      if (!spendCoins(p.coins, lead.ask.n)) return { text: `You haven't got it. ${coinWord(lead.ask.n)}, I said.` };
      if (this._refreshCoinHud) this._refreshCoinHud();
      return { text: this._leadAskComplete(a, lead, rec) };
    }
    if (op === 'gift') {
      if (rec.giftDay === day) return { text: null };
      if (!spendCoins(p.coins, DRINK_PRICE)) return { text: `You pat your purse. Nothing in it but lint.` };
      if (this._refreshCoinHud) this._refreshCoinHud();
      rec.giftDay = day; rec.trust += 0.5;
      return { text: KIND_REPLY[day % KIND_REPLY.length] };
    }
    if (op === 'trial') return this._leadStartTrial(a);
    if (op === 'join') return this._leadTryJoin(a);
    if (op === 'coerce') return this._leadCoerce(a);
    return { text: null };
  },

  _leadContracts() {
    const p = this.player;
    return (p.quests || []).filter(q => q.state === 'turnedIn').length + ((this._societyState && this._societyState().done) || 0);
  },

  _leadAskTerms(ask) {
    if (ask.kind === 'kills') return `\n\n(Kill ${ask.n} monsters, then come back to them.)`;
    if (ask.kind === 'contracts') return `\n\n(Turn in ${ask.n} contract${ask.n === 1 ? '' : 's'}, then come back.)`;
    if (ask.kind === 'coin') return `\n\n(${coinWord(ask.n)}, paid to them.)`;
    if (ask.kind === 'rank') return `\n\n(Stand at ${RANK_WORD[ask.n] || ask.n} rank.)`;
    if (ask.kind === 'race') return `\n\n(Race them and win. "Race them" is on their own conversation.)`;
    if (ask.kind === 'wait') return `\n\n(Come back after ${ask.n} days.)`;
    return '';
  },

  _leadAskProgress(a, lead, rec) {
    const ask = lead.ask, r = rec.ask, day = this._leadDay();
    if (!r) return { done: false, line: '' };
    if (ask.kind === 'kills') { const n = (this.kills || 0) - r.kills; return { done: n >= ask.n, line: `${Math.min(n, ask.n)} of ${ask.n} kills` }; }
    if (ask.kind === 'contracts') { const n = this._leadContracts() - r.contracts; return { done: n >= ask.n, line: `${Math.min(n, ask.n)} of ${ask.n} contracts` }; }
    if (ask.kind === 'rank') return { done: rankIdx(this.player.rank) >= rankIdx(ask.n), line: `you are ${RANK_WORD[this.player.rank] || 'Normal'}; they asked for ${RANK_WORD[ask.n]}` };
    if (ask.kind === 'race') return { done: !!r.raceWon, line: r.raceWon ? 'you beat them' : 'not beaten yet' };
    if (ask.kind === 'wait') { const n = day - r.at; return { done: n >= ask.n, line: `${Math.max(0, Math.min(n, ask.n))} of ${ask.n} days` }; }
    if (ask.kind === 'coin') return { done: false, line: `${coinWord(ask.n)} to pay` };
    return { done: false, line: '' };
  },

  _leadAskStatus(a, lead, rec) {
    if (rec.askDone) return `You did what I asked. I haven't forgotten.`;
    const pr = this._leadAskProgress(a, lead, rec);
    if (pr.done) return this._leadAskComplete(a, lead, rec);
    return `${lead.ask.text}\n\n(So far: ${pr.line}.)`;
  },

  /** Their goal, met: the biggest single thing you can do for anyone. */
  _leadAskComplete(a, lead, rec) {
    rec.askDone = true;
    rec.trust += 6;
    return lead.ask.done;
  },

  /** "Join us." -- on loyalty alone. */
  _leadTryJoin(a) {
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const c = this._leadCalc(a);
    if (this._leadOutlaw() && lawful(lead)) return { text: OUTLAW_REFUSAL };
    if (rec.hate >= 6 && this._leadFearPath()) return { text: lead.hate };
    if (this._leadCapFull()) return { text: CAP_FULL(this._leadCap(), RANK_WORD[this.player.rank] || 'Normal') };
    if (c.trust < c.need) {
      const hint = notYetHint(lead, rec.seen) || '';
      const favour = (!rec.askDone && rec.ask) ? `\n\n(They asked something of you: ${this._leadAskProgress(a, lead, rec).line}.)` : '';
      return { text: `${lead.notYet}${hint ? `\n\n"${hint}"` : ''}${favour}` };
    }
    const m = this._leadRecruit(a, 'loyalty');
    if (!m) return { text: `...Not today. Something's not right.` };
    const wait = m.reserve ? `\n\n(Seven already walk with you. ${first(a.name)} will wait at the Society hall until you send for them.)` : '';
    this._openDialogue(m.name, `${lead.join}${wait}`, null, []);
    return { done: true };
  },

  /** The fear path: "You'll come with me." Your fear is your rank over theirs, your name, and what you have done. */
  _leadCoerce(a) {
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const st = this._leadState();
    if (!this._leadFearPath()) return { text: null };
    if (unbreakable(lead)) { rec.hate += 2; return { text: lead.hate }; }
    if (this._leadCapFull()) return { text: CAP_FULL(this._leadCap(), RANK_WORD[this.player.rank] || 'Normal') };
    const c = this._leadCalc(a);
    const fame = this._clFame ? this._clFame() : 0;
    const dread = Math.max(0, rankIdx(this.player.rank) - rankIdx(a.rank)) * 4 + fame + st.fearRep * 2 + rec.fear;
    if (dread < c.need) { rec.hate += 1; return { text: lead.might[3] }; }
    rec.fear = Math.max(rec.fear, dread);
    rec.hate += 2 + Math.max(0, (lead.values.mercy || 0));
    const m = this._leadRecruit(a, 'fear');
    if (!m) return { text: `...` };
    this._openDialogue(m.name, lead.joinFear, null, []);
    return { done: true };
  },

  // ------------------------------------------------------------ a trial
  /** "Work a job with me." They walk with you for a game day and watch how you work. */
  _leadStartTrial(a) {
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    if (this._leadOutlaw() && lawful(lead)) return { text: OUTLAW_REFUSAL };
    if (this._leadActiveCount() >= ACTIVE_PARTY_MAX) return { text: `You've seven with you already. There's no room for me to watch from.` };
    if (rec.trial) return { text: null };
    rec.trial = { until: (this._clockT || 0) + TRIAL_CLOCK, day: this._leadDay() };
    const m = this._leadMakeMember(a, rec, { x: this.world.x + TILE, y: this.world.y + TILE });
    if (!m) { rec.trial = null; return { text: `...Another time.` }; }
    m.temporary = true; m.trial = true;
    for (const e of (this._advEnts || [])) if (e.adv && e.adv.id === a.id) this._advDespawn(e);
    this._floatText(this.world.x, this.world.y - 54, `${a.name} works with you until this time tomorrow`, '#ffd54f');
    this._refreshTeamTabButton && this._refreshTeamTabButton();
    this._updateRetinue && this._updateRetinue();
    this._openDialogue(a.name, `Fine. One day. I'll watch how you work, and you'll know what I think at the end of it.`, null, []);
    return { done: true };
  },

  /** The day is up: they stay, or they go, and say why. */
  _leadEndTrial(m) {
    const a = ADV_BY_ID[m.advId];
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const c = this._leadCalc(a);
    rec.trial = null;
    if (c.trust >= c.need && !this._leadCapFull() && !(this._leadOutlaw() && lawful(lead))) {
      m.temporary = false; m.trial = false;
      this._leadJoinRecord(a, rec, 'loyalty');
      m.slotStones = rec.stones.map(r => r.slice());
      const def = PARTY_BY_ID[m.id]; if (def) def.build.slotStones = rec.stones.map(r => r.slice());
      m.kit = this._buildPartyKit(def || m, m); this._partyEssenceDefs(def || m, m); this._recomputePartyGear(m);
      this._floatText(this.world.x, this.world.y - 70, `${a.name}: "${lead.join}"`, '#a5d6a7');
      this._leadAfterJoin(m);
      return true;
    }
    const why = this._leadCapFull() ? `You've no room for me anyway.` : (notYetHint(lead, rec.seen) || lead.notYet);
    this._floatText(this.world.x, this.world.y - 70, `${a.name}: "${why}"`, '#ffb74d');
    this._leadReturnGear(m);
    this._unmakeCompanionMember(m);
    delete PARTY_BY_ID[m.id];
    rec.trialsDone = (rec.trialsDone || 0) + 1;
    this._refreshTeamTabButton && this._refreshTeamTabButton();
    this._updateRetinue && this._updateRetinue();
    return false;
  },

  /** The leadership page: what they have heard, what they have seen, and the buttons. */
  _leadPage(a, npc, said = null) {
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const day = this._leadDay();
    const id = a.id;
    if (!said && rec.ask && !rec.askDone && lead.ask.kind !== 'coin' && this._leadAskProgress(a, lead, rec).done) said = this._leadAskComplete(a, lead, rec);
    const left = rec.leftDay != null && day - rec.leftDay < (rec.leftBy === 'desert' || rec.leftBy === 'mutiny' ? 7 : 2);
    const c = this._leadCalc(a);
    const body = [];
    if (said) body.push(said);
    else if (left) body.push(rec.leftBy === 'release' ? `We only just went our ways. Give it a day or two.` : `Not after last time. Give it a week.`);
    else body.push(rec.want ? `${first(a.name)} waits to hear what you've got to say.` : `${first(a.name)} looks you over. "Join up with you? Tell me how you work, then. Better, show me."`);
    body.push(this._leadMeter(a, c));
    const ch = [];
    if (left) { ch.push({ act: `lead|back|${id}`, label: 'Back' }); return this._openDialogue(a.name, body.join('\n\n'), npc, ch); }
    ch.push({ act: `lead|want|${id}`, label: 'What do you look for in a team?' });
    if (rec.want) ch.push({ act: `lead|doubt|${id}`, label: 'What holds you back?' });
    if (rec.doubt && !rec.askDone) {
      if (lead.ask.kind === 'coin' && rec.ask) ch.push({ act: `lead|pay|${id}`, label: lead.ask.label.replace(/\(\d+\)/, `(${coinWord(lead.ask.n)})`) });
      else ch.push({ act: `lead|ask|${id}`, label: rec.ask ? 'About your favour...' : 'Can I do something for you?' });
    }
    if (rec.want && !rec.trial) ch.push({ act: `lead|trial|${id}`, label: 'Work a job with me' });
    if (rec.giftDay !== day) ch.push({ act: `lead|gift|${id}`, label: `A drink (${coinWord(DRINK_PRICE)})` });
    ch.push({ act: `lead|join|${id}`, label: 'Join us.' });
    if (this._leadFearPath() && !unbreakable(lead)) ch.push({ act: `lead|coerce|${id}`, label: '"You\'ll come with me."' });
    ch.push({ act: `lead|back|${id}`, label: 'Back' });
    this._openDialogue(a.name, body.join('\n\n'), npc, ch);
  },

  /** Their trust in you, and why. Not a bar to fill: what they think of how you work. */
  _leadMeter(a, c) {
    const rec = c.rec;
    const lg = ledgerLines(rec.seen);
    const rows = [`Trust ${r1(c.trust)} / ${c.need}  (heard of you: ${c.heard >= 0 ? '+' : ''}${r1(c.heard)})`];
    if (lg.good.length || lg.bad.length) rows.push(`${lg.good.length ? `Likes ${list(lg.good.map(d => LEDGER_GOOD[d]))}. ` : ''}${lg.bad.length ? `Dislikes ${list(lg.bad.map(d => LEDGER_BAD[d]))}.` : ''}`.trim());
    if (rec.want) rows.push(`${first(a.name)}: ${list(temperament(c.lead.values))}.`);
    if (this._leadFearPath() && (rec.fear || rec.hate)) rows.push(`Fear ${r1(rec.fear)} · hatred ${r1(rec.hate)}`);
    rows.push(`Companions: ${this._leadFollowing()} of ${this._leadCap()} (${RANK_WORD[this.player.rank] || 'Normal'})`);
    return rows.join('\n');
  },

  /** A race against one of them ended (adventurersMixin `_advRaceEnd`). */
  _leadOnRace(id, won) {
    if (!id || !ADV_LEAD_BY_ID[id]) return;
    const rec = this._leadRec(id);
    const v = ADV_LEAD_BY_ID[id].values;
    if (won) { rec.trust += 0.5 + Math.max(0, (v.risk || 0) + (v.glory || 0)) * 0.5; if (rec.ask && ADV_LEAD_BY_ID[id].ask.kind === 'race') rec.ask.raceWon = true; }
  },

  // ------------------------------------------------------------ joining
  /** Stones for this run, by where you are: "For adventurers in cadence they have open awakening stone slots to fill, but
   *  adventurers everywhere else they need complete kits. The specific awakening stones can change run to run but the
   *  essences should be static." */
  _leadStones(a, rec) {
    const region = (this.currentRegion && this.currentRegion.id) || 'nek';
    const open = region === 'nek';
    const rng = advRng(`${this.player.runSeed || this._runSeed || 'run'}|advstones|${a.id}`);
    rec.stones = advStoneRows(a, ESSENCES, STONE_CATALOG, rng, open ? 1 : 4, open ? 0 : 4);
    rec.open = open; rec.region = region;
    return rec.stones;
  },

  _leadJoinRecord(a, rec, by) {
    const day = this._leadDay();
    rec.joined = { day, by, region: rec.region || (this.currentRegion && this.currentRegion.id) || 'nek', open: !!rec.open };
    rec.lastKind = day; rec.lastWith = day;
  },

  _leadRecruit(a, by) {
    const rec = this._leadRec(a.id);
    this._leadStones(a, rec);
    this._leadJoinRecord(a, rec, by);
    const m = this._leadMakeMember(a, rec, { x: this.world.x + TILE, y: this.world.y + TILE });
    if (!m) { rec.joined = null; return null; }
    for (const e of (this._advEnts || [])) if (e.adv && e.adv.id === a.id) this._advDespawn(e);
    this._leadAfterJoin(m);
    return m;
  },

  _leadAfterJoin(m) {
    const rec = this._leadRec(m.advId);
    if (this._leadActiveCount() > ACTIVE_PARTY_MAX) {
      m.dismissed = true; m.reserve = true;
      if (m.sprite) m.sprite.setVisible(false);
      if (m._npcEntry) m._npcEntry.hidden = true;
    }
    const byFear = rec.joined && rec.joined.by === 'fear';
    this._floatText(this.world.x, this.world.y - 54, `${m.name} ${byFear ? 'follows you, afraid' : 'joins you'}`, byFear ? '#90a4ae' : '#a5d6a7');
    this._showLocationBanner && this._showLocationBanner(`${m.name} — ${m.roleLabel}`);
    this._rebuildFamiliars && this._rebuildFamiliars();
    this._maybeOpenTeamNamePrompt && this._maybeOpenTeamNamePrompt();
    this._refreshTeamTabButton && this._refreshTeamTabButton();
    this._updateRetinue && this._updateRetinue();
    if (this._inventoryOpen) this._renderInventory();
  },

  _leadDefFor(a, rec) {
    const art = this._leadArt(a);
    const lead = ADV_LEAD_BY_ID[a.id];
    return {
      id: `adv_${a.id}`, advId: a.id, nature: a.nature, name: a.name,
      role: ROLE_FOR_PARTY[a.role] || 'melee', roleLabel: ROLE_LABEL[a.role] || 'Adventurer',
      art: art || 'benjamin', region: (rec.joined && rec.joined.region) || rec.region || 'nek',
      build: { essences: a.essences.slice(), slotStones: (rec.stones || [[], [], [], []]).map(r => r.slice()) },
      rankFloor: rankIdx(a.rank),
      blurb: a.about, greet: (a.greet && a.greet.friend) || lead.join,
      meditate: `Give me a moment with the stones.`,
    };
  },

  _leadMakeMember(a, rec, at) {
    if (!rec.stones) this._leadStones(a, rec);
    const def = this._leadDefFor(a, rec);
    PARTY_BY_ID[def.id] = def;
    const stand = advStandModels(a).find(k => this.textures.exists(k));
    const advTex = this.textures.exists(`${advArtKey(a)}_idle`) ? `${advArtKey(a)}_idle` : null;
    const scale = (ADVENTURER_ART[advArtKey(a)] || {}).scale || 1;
    const m = this._makeCompanionMember(def, at, { texture: advTex || stand, scale });
    if (!m) return null;
    m.advId = a.id;
    this._syncPartyRank(m);
    m.hp = m.maxHp;
    return m;
  },

  // ------------------------------------------------------------ the talk, once they follow you
  _leadCompanionTalk(m, npc, said = null) {
    const a = ADV_BY_ID[m.advId];
    if (!a) return;
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const day = this._leadDay();
    const st = this._leadState();
    const c = this._leadCalc(a);
    const fp = this._leadFearPath();
    const loyal = m.trial ? 'trial' : loyaltyOf({ trust: c.trust, need: c.need, fear: rec.fear, hate: rec.hate, fearPath: fp });
    const moves = (m.kit || []).slice(0, 4).map(k => k.ability && k.ability.name).filter(Boolean).join(', ') || 'nothing yet';
    const open = said || ((loyal === 'wavering' || loyal === 'leaving' || loyal === 'mutiny') ? lead.waver : this._leadIdle(a, rec));
    const lg = ledgerLines(rec.seen);
    const mates = this._leadMembers().filter(x => x !== m && !x.dismissed);
    const friends = mates.filter(x => chemistry(lead.values, VALUES[x.advId] || {}) > 0.4).map(x => first(x.name));
    const rivals = mates.filter(x => chemistry(lead.values, VALUES[x.advId] || {}) < -0.3).map(x => first(x.name));
    const rows = [`${m.roleLabel} · ${RANK_WORD[m.rank] || 'Normal'}  (${Math.round(m.hp)}/${m.maxHp})  ·  ${moves}`];
    if (m.trial) rows.push(`On a trial: they decide at this time tomorrow.  Trust ${r1(c.trust)} / ${c.need}`);
    else rows.push(`${rec.joined && rec.joined.by === 'fear' ? 'Follows you out of fear' : 'Follows you'} · ${LOYALTY_WORD[loyal]}  ·  trust ${r1(c.trust)} / ${c.need}${fp ? `  ·  fear ${r1(rec.fear)} · hatred ${r1(rec.hate)}` : ''}`);
    if (lg.good.length || lg.bad.length) rows.push(`${lg.good.length ? `Likes ${list(lg.good.map(d => LEDGER_GOOD[d]))}. ` : ''}${lg.bad.length ? `Dislikes ${list(lg.bad.map(d => LEDGER_BAD[d]))}.` : ''}`.trim());
    if (friends.length || rivals.length) rows.push(`${friends.length ? `Gets on with ${list(friends)}. ` : ''}${rivals.length ? `Clashes with ${list(rivals)}.` : ''}`.trim());
    if (!m.trial) rows.push(`Essences talked through: ${rec.understood.length} of ${ESSENCE_TALKS}${rec.understood.length < ESSENCE_TALKS ? ' (gold needs all four)' : ''}`);
    const id = m.id;
    const ch = [{ act: `lead|ctell|${id}`, label: 'Tell me something' }];
    if (rec.kindDay !== day) ch.push({ act: `lead|ckind|${id}`, label: 'A kind word' });
    if (st.councilDay !== day && !m.dismissed) ch.push({ act: `lead|ccouncil|${id}`, label: "Let's plan the next job" });
    if (st.shareDay !== day && !m.dismissed) ch.push({ act: `lead|cshare|${id}`, label: `Share the purse (${coinWord(this._leadSharePrice())} each)` });
    if (!m.trial && this._leadEssenceReady(m, c)) ch.push({ act: `lead|cess|${id}`, label: 'Talk about essences' });
    if (!rec.askDone) ch.push({ act: `lead|cgoal|${id}`, label: rec.ask ? 'About your favour...' : 'What are you after?' });
    if (m.trial && c.trust >= c.need) ch.push({ act: `lead|cstay|${id}`, label: 'Stay on with us' });
    if (fp && !m.trial) {
      if (rec.powerDay !== day) ch.push({ act: `lead|cpower|${id}`, label: 'Show of power' });
      if (rec.princeDay !== day) ch.push({ act: `lead|cprince|${id}`, label: '"Better to be feared than loved."' });
      ch.push({ act: `lead|cexample|${id}`, label: 'Make an example of them' });
    }
    if (!m.dismissed && !m.trial) {
      ch.push({ act: `lead|creserve|${id}`, label: 'Wait at the Society hall' });
      const full = this._leadActiveCount() >= ACTIVE_PARTY_MAX;
      for (const r of this._leadReserve()) ch.push({ act: `lead|cswap|${id}|${r.id}`, label: full ? `Trade places with ${first(r.name)}` : `Send for ${first(r.name)}` });
    }
    if (!m.trial && this._companionHomeChoices) for (const x of this._companionHomeChoices(m)) ch.push(x);
    ch.push({ act: `lead|cpart|${id}`, label: m.trial ? 'Call off the trial' : 'Part ways' });
    ch.push({ act: 'lead|cbye|x', label: "That's all" });
    this._openDialogue(m.name, `${open}\n\n${rows.join('\n')}`, npc || this.nearNpc, ch);
  },

  _leadIdle(a, rec) {
    const pool = advSmallTalk(a, null);
    if (!pool.length) return `...`;
    rec.told = (rec.told || 0) + 1;
    return pool[rec.told % pool.length];
  },

  _leadSharePrice() { return 25 * (1 + rankIdx(this.player && this.player.rank)); },

  /** Essence talks open one at a time: trust past the need (a little more each time), a few days together, one a day. */
  _leadEssenceReady(m, c) {
    const rec = c.rec;
    const step = rec.understood.length;
    if (step >= ESSENCE_TALKS || rec.essDay === this._leadDay()) return false;
    const days = this._leadDay() - ((rec.joined && rec.joined.day) || 0);
    return c.trust >= c.need * (0.8 + 0.15 * step) && days >= step;
  },

  _leadCompanionAct(op, mid, arg) {
    if (op === 'cbye') { this._closeDialogue(); return; }
    const m = (this.party || []).find(x => x.id === mid);
    const a = m && ADV_BY_ID[m.advId];
    if (!m || !a) { this._closeDialogue(); return; }
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const st = this._leadState();
    const day = this._leadDay();
    const npc = this._lastTalkNpc;
    const fp = this._leadFearPath();
    let said = null;
    if (op === 'ctell') {
      const tales = advOriginTales(a);
      said = (rec.told || 0) % 3 === 2 && tales.length ? tales[(rec.told || 0) % tales.length] : this._leadIdle(a, rec);
      rec.told = (rec.told || 0) + 1;
    } else if (op === 'ckind') {
      if (rec.kindDay !== day) { rec.kindDay = day; rec.lastKind = day; rec.trust += 0.5; }
      said = KIND_REPLY[day % KIND_REPLY.length];
    } else if (op === 'ccouncil') {
      if (st.councilDay !== day) { st.councilDay = day; this._leadDeed('council'); }
      const voices = this._leadWitnesses().map(x => `${first(x.name)}: "${replyBy(ADV_LEAD_BY_ID[x.advId], 'plan', COUNCIL_REPLY)}"`);
      said = `You sit the party down and talk the next job through: who goes first, who watches the flank, where you fall back to.\n\n${voices.join('\n')}`;
    } else if (op === 'cshare') {
      if (st.shareDay !== day) {
        const each = this._leadSharePrice();
        const who = (this.party || []).filter(x => x.recruited && !x.dismissed);
        if (!spendCoins(this.player.coins, each * who.length)) said = `You haven't the coin to give everyone a share (${coinWord(each * who.length)}).`;
        else {
          st.shareDay = day;
          if (this._refreshCoinHud) this._refreshCoinHud();
          for (const x of who) if (x.advId) { this._leadDeed('share', { only: x }); this._leadRec(x.advId).trust += 0.5; }
          said = this._leadWitnesses().map(x => `${first(x.name)}: "${replyBy(ADV_LEAD_BY_ID[x.advId], 'coin', SHARE_REPLY)}"`).join('\n') || 'Shared.';
        }
      }
    } else if (op === 'cgoal') {
      if (!rec.ask) { rec.ask = { kind: lead.ask.kind, at: day, kills: this.kills || 0, contracts: this._leadContracts(), raceWon: false }; said = `${lead.ask.text}${this._leadAskTerms(lead.ask)}`; }
      else if (lead.ask.kind === 'coin' && !rec.askDone) {
        if (spendCoins(this.player.coins, lead.ask.n)) { if (this._refreshCoinHud) this._refreshCoinHud(); said = this._leadAskComplete(a, lead, rec); }
        else said = `${lead.ask.text}\n\n(${coinWord(lead.ask.n)}; you haven't got it.)`;
      } else said = this._leadAskStatus(a, lead, rec);
    } else if (op === 'cstay') {
      if (m.trial) { this._closeDialogue(); this._leadEndTrial(m); return; }
    } else if (op === 'cess') { this._leadEssencePage(m, npc); return; }
    else if (op === 'cesspick') { this._leadEssenceAsk(m, npc, Number(arg)); return; }
    else if (op === 'cstance') { said = this._leadEssenceAnswer(m, String(arg)); }
    else if (op === 'cpower' && fp) {
      if (rec.powerDay !== day) {
        rec.powerDay = day;
        for (const x of this._leadWitnesses()) { const r = this._leadRec(x.advId); const v = VALUES[x.advId] || {}; r.fear += 1.5; r.hate += Math.max(0, (v.mercy || 0)) * 0.5; }
      }
      said = `You let them see what you are, all of it, for a moment.\n\n${lead.might[3]}`;
    } else if (op === 'cprince' && fp) {
      if (rec.princeDay !== day) { rec.princeDay = day; rec.fear += Math.max(0, lead.prince[1]); rec.hate += Math.max(0, lead.prince[2]); }
      said = `"Better to be feared than loved, if I can't be both."\n\n${lead.prince[3]}`;
    } else if (op === 'cexample' && fp) {
      this._openDialogue(m.name, `${first(a.name)} sees it in your face before you move.`, npc, [
        { act: `lead|cexampleyes|${m.id}`, label: `Kill ${first(a.name)}, in front of the others` },
        { act: `lead|cback|${m.id}`, label: 'No.' },
      ]);
      return;
    } else if (op === 'cexampleyes' && fp) { this._closeDialogue(); this._leadMakeExample(m); return; }
    else if (op === 'creserve') {
      this._leadToReserve(m);
      this._openDialogue(m.name, `Right. I'll be at the hall. Send word when you want me.\n\n(Waiting at the Society hall.)`, npc, []);
      return;
    } else if (op === 'cswap') {
      const r = (this.party || []).find(x => x.id === arg && x.reserve && x.dismissed);
      if (!r) return this._leadCompanionTalk(m, npc);
      const full = this._leadActiveCount() >= ACTIVE_PARTY_MAX;
      if (full) this._leadToReserve(m);
      this._leadFromReserve(r);
      this._openDialogue(r.name, full ? `${first(m.name)} heads for the hall, and ${first(r.name)} catches you up within the hour.` : `${first(r.name)} catches you up within the hour.`, null, []);
      return;
    } else if (op === 'cpart') {
      this._openDialogue(m.name, m.trial ? `Calling it off? Fine.` : `You want me gone? Say it plainly.`, npc, [
        { act: `lead|cpartyes|${m.id}`, label: m.trial ? 'Call it off.' : 'We part ways here.' },
        { act: `lead|cback|${m.id}`, label: 'No. Stay.' },
      ]);
      return;
    } else if (op === 'cpartyes') {
      if (m.trial) { rec.trial = null; this._leadReturnGear(m); this._unmakeCompanionMember(m); delete PARTY_BY_ID[m.id]; this._updateRetinue && this._updateRetinue(); this._openDialogue(a.name, `Another time, maybe.`, null, []); return; }
      this._leadPartWays(m, 'release');
      this._openDialogue(a.name, `...All right. Good luck to you.`, null, []);
      return;
    }
    this._leadCompanionTalk(m, npc, said);
  },

  // ------------------------------------------------------------ essence talks (toward gold)
  /** Their side: how one of their essences (or the confluence) shaped them. */
  _leadEssencePage(m, npc) {
    const a = ADV_BY_ID[m.advId];
    const rec = this._leadRec(a.id);
    const step = rec.understood.length;
    const ess = step < 3 ? a.essences[step] : null;
    const def = ess ? ESSENCES[ess] : null;
    const theirs = def ? `${def.name}. ${ESSENCE_SHAPES[def.family] || 'It changed me more than I changed it.'}` : ESSENCE_SHAPES_CONFLUENCE;
    const p = this.player;
    const mine = (p.slotEssence || []).map((e, i) => [e, i]).filter(([e]) => e && ESSENCES[e]);
    const ch = mine.map(([e, i]) => ({ act: `lead|cesspick|${m.id}|${i}`, label: ESSENCES[e].name }));
    if (!ch.length) ch.push({ act: `lead|cesspick|${m.id}|-1`, label: "I haven't one yet." });
    this._openDialogue(m.name, `${theirs}\n\nAnd you? Pick one of yours. Does it shape you, or do you shape it?`, npc, ch);
  },

  _leadEssenceAsk(m, npc, slot) {
    const ch = Object.entries(STANCES).map(([k, s]) => ({ act: `lead|cstance|${m.id}|${slot}:${k}`, label: s.label }));
    const name = slot >= 0 && this.player.slotEssence && ESSENCES[this.player.slotEssence[slot]] ? ESSENCES[this.player.slotEssence[slot]].name : 'it';
    this._openDialogue(m.name, `${name}, then. Go on.`, npc, ch);
  },

  /** Your answer. Understanding moves on whatever you say; how it lands depends on who they are. Your essence gains insight. */
  _leadEssenceAnswer(m, arg) {
    const a = ADV_BY_ID[m.advId];
    const lead = ADV_LEAD_BY_ID[a.id];
    const rec = this._leadRec(a.id);
    const [slotS, stance] = arg.split(':');
    const slot = Number(slotS);
    if (rec.understood.length >= ESSENCE_TALKS || !STANCES[stance]) return null;
    const verdict = stanceVerdict(lead, stance);
    rec.understood.push({ day: this._leadDay(), slot, stance, verdict });
    rec.essDay = this._leadDay();
    rec.trust += verdict === 'approve' ? 1.5 : verdict === 'neutral' ? 0.8 : 0.3;
    const gained = slot >= 0 ? this._leadInsight(slot) : 0;
    this._syncPartyRank(m);
    const tail = rec.understood.length >= ESSENCE_TALKS ? `\n\n(${first(a.name)} and you have talked all four through. Nothing holds them back from gold now but the road.)` : '';
    return `${STANCE_REPLY[verdict]}${gained ? `\n\n(Insight: ${ESSENCES[this.player.slotEssence[slot]].name}, +${gained} experience across its abilities.)` : ''}${tail}`;
  },

  /** "...how you shape your essences": half a level's experience, at your rank, for each ability of that essence. */
  _leadInsight(slot) {
    const p = this.player;
    if (!p.knownAbilities || !p.abilityProgress || !this._abilityKeys) return 0;
    const keys = this._abilityKeys().filter(k => p.knownAbilities[k] && ((p.knownAbilities[k].slotIndex == null ? 3 : p.knownAbilities[k].slotIndex) === slot));
    if (!keys.length) return 0;
    const per = Math.round((RANK_LEVEL_XP[p.rank] || RANK_LEVEL_XP.iron || 100) * 0.5);
    const total = per * keys.length;
    distributeBank(p.abilityProgress, keys, total);
    if (this._syncAbilityLevels) this._syncAbilityLevels(true);
    return total;
  },

  /** Gold waits on the talks: a companion stops at silver until all four are done. */
  _leadRankCap(m) {
    if (!m || !m.advId) return Infinity;
    const r = this.player && this.player.lead && this.player.lead.who && this.player.lead.who[m.advId];
    return r && (r.understood || []).length >= ESSENCE_TALKS ? Infinity : GOLD_IDX - 1;
  },

  // ------------------------------------------------------------ fear: making an example
  _leadMakeExample(m) {
    const a = ADV_BY_ID[m.advId];
    const st = this._leadState();
    const rec = this._leadRec(a.id);
    st.executed[a.id] = { day: this._leadDay(), region: this.currentRegion && this.currentRegion.id };
    rec.joined = null; rec.trial = null;
    st.fearRep += 2;
    const x = m.x, y = m.y;
    this._leadReturnGear(m);
    this._unmakeCompanionMember(m);
    delete PARTY_BY_ID[m.id];
    this._floatText(x, y - 50, `${a.name} is dead`, '#ef5350');
    let k = 0;
    for (const f of this._leadMembers()) {
      const r = this._leadRec(f.advId);
      const mercy = (VALUES[f.advId] || {}).mercy || 0;
      r.fear += 4;
      r.hate += mercy > 0 ? 1 + mercy * 1.5 : mercy < 0 ? 0 : 1;
      if (!f.dismissed && k++ < 3) this._floatText(f.x, f.y - 60 - k * 12, `${first(f.name)}: "${mercy > 0 ? EXAMPLE_WITNESS.soft : mercy < 0 ? EXAMPLE_WITNESS.hard : EXAMPLE_WITNESS.even}"`, '#b0bec5');
    }
    this._rebuildFamiliars && this._rebuildFamiliars();
    this._refreshTeamTabButton && this._refreshTeamTabButton();
    this._updateRetinue && this._updateRetinue();
  },

  // ------------------------------------------------------------ the reserve
  _leadToReserve(m) {
    m.dismissed = true; m.reserve = true; m.homeKey = null;
    m.target = null; m.downT = 0; m.hp = m.maxHp;
    if (m.sprite) m.sprite.setVisible(false);
    if (m._npcEntry) m._npcEntry.hidden = true;
    this._updateRetinue && this._updateRetinue();
  },

  _leadFromReserve(m) {
    if (this._leadActiveCount() >= ACTIVE_PARTY_MAX) return false;
    m.dismissed = false; m.reserve = false;
    const ang = Math.random() * Math.PI * 2;
    m.x = this.world.x + Math.cos(ang) * TILE * 2; m.y = this.world.y + Math.sin(ang) * TILE * 2;
    m.homeX = m.x; m.homeY = m.y;
    if (m.sprite) m.sprite.setVisible(true);
    if (m._npcEntry) m._npcEntry.hidden = false;
    this._updateRetinue && this._updateRetinue();
    return true;
  },

  _leadCallReserve(mid) {
    const m = (this.party || []).find(x => x.id === mid && x.reserve && x.dismissed);
    if (!m) { this._closeDialogue(); return; }
    if (!this._leadFromReserve(m)) { this._openDialogue('Society clerk', `You've seven out with you already. Send one of them back first.`, null, []); return; }
    this._openDialogue('Society clerk', `${first(m.name)}? Just through there. ...Here they come.`, null, []);
  },

  _leadClerkChoices() {
    if (this._leadActiveCount() >= ACTIVE_PARTY_MAX) return [];
    return this._leadReserve().map(m => ({ act: `lead|call|${m.id}`, label: `Send for ${first(m.name)} (waiting here)` }));
  },

  // ------------------------------------------------------------ leaving
  /** What they wear comes back to your bag (a parting, an example, a trial that didn't take). */
  _leadReturnGear(m) {
    const bag = this.player && this.player.inventory && this.player.inventory.gearItems;
    if (!bag || !m.gear) return 0;
    let n = 0;
    for (const [slot, g] of Object.entries(m.gear)) if (g) { bag.push(g); m.gear[slot] = null; n++; }
    return n;
  },

  /** They go: 'release' (you let them, your gear back), 'desert' or 'mutiny' (they take what they wear -- "love is such a
   *  risk for both parties"), 'outlaw' (they will not follow an outlaw). Back to their team or road. */
  _leadPartWays(m, how) {
    const a = ADV_BY_ID[m.advId];
    const rec = a ? this._leadRec(a.id) : null;
    let took = 0;
    if (how === 'desert' || how === 'mutiny') took = Object.values(m.gear || {}).filter(Boolean).length;
    else this._leadReturnGear(m);
    if (rec) {
      rec.joined = null; rec.trial = null; rec.leftDay = this._leadDay(); rec.leftBy = how;
      if (how === 'release') rec.trust = Math.max(0, rec.trust - 2);
      if (how === 'desert' || how === 'mutiny') rec.trust = Math.min(rec.trust, 0);
    }
    if (m.x != null) this._floatText(m.x, m.y - 54, how === 'release' ? `${m.name} goes their own way`
      : `${m.name} has left you${took ? `, with what you gave them` : ''}`, '#ef9a9a');
    this._unmakeCompanionMember(m);
    delete PARTY_BY_ID[m.id];
    this._rebuildFamiliars && this._rebuildFamiliars();
    this._refreshTeamTabButton && this._refreshTeamTabButton();
    this._updateRetinue && this._updateRetinue();
    if (this._inventoryOpen) this._renderInventory();
  },

  // ------------------------------------------------------------ the clock
  _leadTick(dt) {
    this._leadT = (this._leadT || 0) + dt;
    if (this._leadT < 1) return;
    this._leadT = 0;
    const st = this._leadState();
    for (const m of (this.party || [])) {
      if (!m.advId || m._advArtSet || !m.sprite || !this._leadAliasArt(m.artKey)) continue;
      m._advArtSet = true; m._originY = null; m._drawnArtKey = null;
      m.sprite.setTexture(`char_${m.artKey}_idle`, dirRow(m.facing || 'south'));
    }
    try { this._leadWatch(); } catch (e) { if (!this._leadWatchErr) { this._leadWatchErr = true; console.warn('[lead] watch', e); } }
    // trials end at the hour they began, a day on
    for (const m of this._leadMembers().filter(x => x.trial)) {
      const rec = this._leadRec(m.advId);
      if (!rec.trial || (this._clockT || 0) >= rec.trial.until) { if (!this._dialogueOpen) this._leadEndTrial(m); }
    }
    // loyal companions fight a little harder
    for (const m of this._leadMembers()) {
      const c = this._leadCalc(ADV_BY_ID[m.advId]);
      const loyal = !m.trial && c.trust >= c.need * LOYAL_AT;
      if (!!m.loyal !== loyal) { m.loyal = loyal; this._syncPartyRank(m); }
    }
    const day = this._leadDay();
    if (st.day === null || st.day === undefined) { st.day = day; return; }
    if (day <= st.day || this._dialogueOpen) return;
    const days = Math.min(30, day - st.day);
    st.day = day;
    this._leadDayTurn(days);
  },

  /** A new day: time on the road, the hall, how the team gets on, and who stays. */
  _leadDayTurn(days) {
    const day = this._leadDay();
    const fp = this._leadFearPath();
    const members = this._leadMembers().filter(m => !m.trial);
    for (const m of members) {
      const rec = this._leadRec(m.advId);
      if (!m.dismissed) { rec.trust += 0.3 * days; rec.lastWith = day; }
      else if (day - (rec.lastWith || day) > 2) rec.trust -= 0.5 * days;   // "you leave me waiting"
    }
    // chemistry: like minds warm to each other, unlike ones wear each other down
    const active = members.filter(m => !m.dismissed);
    let barked = 0;
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const A = active[i], B = active[j];
      const c = chemistry(VALUES[A.advId] || {}, VALUES[B.advId] || {});
      const ra = this._leadRec(A.advId), rb = this._leadRec(B.advId);
      if (c > 0.4) { ra.trust += 0.4 * days; rb.trust += 0.4 * days; }
      else if (c < -0.3) {
        ra.trust -= 1 * days; rb.trust -= 1 * days;
        if (barked++ < 1) this._floatText(this.world.x, this.world.y - 100, `${first(A.name)} and ${first(B.name)} are at each other again`, '#ffb74d');
      }
    }
    // who stays
    for (const m of members) {
      const a = ADV_BY_ID[m.advId];
      const lead = ADV_LEAD_BY_ID[a.id];
      const rec = this._leadRec(a.id);
      const c = this._leadCalc(a);
      const loyal = loyaltyOf({ trust: c.trust, need: c.need, fear: rec.fear, hate: rec.hate, fearPath: fp });
      if (loyal === 'mutiny') {
        this._leadPartWays(m, 'mutiny');
        this._floatText(this.world.x, this.world.y - 80, `${first(a.name)}: "${MUTINY_LINE}"`, '#ef5350');
      } else if (loyal === 'leaving') {
        this._leadPartWays(m, 'desert');
        this._floatText(this.world.x, this.world.y - 80, `"${lead.leave}"`, '#ef9a9a');
      } else if (loyal === 'wavering' && rec.warned !== day) {
        rec.warned = day;
        this._floatText(this.world.x, this.world.y - 80, `${first(a.name)} is wavering`, '#ffb74d');
      }
    }
  },

  // ------------------------------------------------------------ art
  _leadArt(a) {
    const key = advArtKey(a);
    const def = ADVENTURER_ART[key];
    if (!def) return null;
    if (!CHAR_ART[key]) {
      const an = (k, s, n, ms) => ({ sheet: null, framesPerDir: n, frameMs: ms, cell: s.cell, footX: s.fx, foot: s.fy, source: 'adventurer', src: k });
      CHAR_ART[key] = {
        cell: def.idle.cell, footX: def.idle.fx, footY: def.idle.fy, synthetic: true, adventurer: a.id,
        animKeys: ['idle', 'walk', 'attack', 'death'],
        anims: {
          idle: an('idle', def.idle, 1, 0),
          walk: an('run', def.run, 8, 90),
          attack: an('attack', def.attack, 8, 80),
          death: an('death', def.death, 8, 85),
        },
      };
    }
    this._leadAliasArt(key);
    return key;
  },

  /** True once all four aliases exist. Asks for the sheets (round 365's loader) when they are not in. */
  _leadAliasArt(key) {
    const art = CHAR_ART[key];
    if (!art || !art.anims) return false;
    const want = Object.entries(art.anims);
    if (want.every(([k]) => this.textures.exists(`char_${key}_${k}`))) return true;
    if (!this._advEnsureArt(key)) return false;
    for (const [k, an] of want) {
      const alias = `char_${key}_${k}`;
      if (this.textures.exists(alias)) continue;
      const srcKey = `${key}_${an.src}`;
      if (!this.textures.exists(srcKey)) return false;
      try {
        this.textures.addSpriteSheet(alias, this.textures.get(srcKey).getSourceImage(), { frameWidth: an.cell, frameHeight: an.cell });
      } catch (e) { return false; }
    }
    return true;
  },

  // ------------------------------------------------------------ saves
  /** Rebuild the adventurers who follow you from the save's record (player.lead), before the party state is applied. */
  _leadRebuildCompanions() {
    for (const m of (this.party || []).filter(x => x.advId)) { this._unmakeCompanionMember(m); delete PARTY_BY_ID[m.id]; }
    const st = this.player && this.player.lead;
    if (!st || !st.who) return 0;
    this._leadState();   // round 374's records, read as round 375's
    let n = 0;
    for (const [id, rec] of Object.entries(st.who)) {
      const a = ADV_BY_ID[id];
      if (rec) rec.trial = null;   // a trial does not survive a load: they went home
      if (!a || !rec || !rec.joined) continue;
      const m = this._leadMakeMember(a, rec, { x: this.world.x + TILE, y: this.world.y + TILE });
      if (m) n++;
    }
    return n;
  },

  /**
   * Put the party back the way the save had it. `save.party` has been written since round 49 and never read: a load
   * left every companion where a new game puts them. Who is recruited, waiting, benched, their stones, essences and gear.
   */
  _restorePartyState(saved) {
    if (!Array.isArray(saved) || !saved.length) return 0;
    const byId = new Map(saved.filter(s => s && s.id).map(s => [s.id, s]));
    // the god's followers are made when their quest ends, not at boot
    for (const s of saved) {
      if (!s || !s.godFollower || (this.party || []).some(m => m.id === s.id) || !this._buildGodFollower) continue;
      try { this._buildGodFollower(s.godFollower, (s.slotEssence || []).filter(e => ESSENCES[e])); } catch (e) { /* that god's data moved on */ }
    }
    let n = 0;
    for (const m of (this.party || [])) {
      const s = byId.get(m.id);
      if (!s) continue;
      for (const k of ['recruited', 'gated', 'temporary', 'benched', 'dismissed', 'meditating', 'askedToMeditate',
        'natureEvo', 'natureEvoBanked', 'natureStoryHad', 'natureStressSince',
        'evoAdv', 'evoUses', 'evoFocus', 'evoTally', 'evoSeen', 'evoQuarry', 'evoStreak', 'evoOpener']) if (k in s) m[k] = s[k];   // ROUND 386 -- their nature gift evolutions (389: and the practice they carry)
      m.homeKey = s.homeKey || null;
      m.reserve = !!s.reserve;
      if (Array.isArray(s.slotStones) && s.slotStones.length === 4) m.slotStones = s.slotStones.map(r => (Array.isArray(r) ? r : []).filter(id => STONE_CATALOG[id]));
      if (Array.isArray(s.slotEssence)) m.slotEssence = s.slotEssence.map(e => (e && ESSENCES[e] ? e : null));
      if (s.gear && typeof s.gear === 'object') m.gear = { ...m.gear, ...s.gear };
      const def = PARTY_BY_ID[m.id] || m;
      try {
        m.kit = this._buildPartyKit(def, m);
        this._partyEssenceDefs(def, m);
        this._recomputePartyGear(m);
        this._syncPartyRank(m);
      } catch (e) { console.warn('[party] restoring', m.id, e); }
      m.hp = m.maxHp; m.downT = 0; m.target = null;
      if (m.recruited && !m.dismissed && !m.benched) {
        const ang = (n++) * 0.9;
        m.x = this.world.x + Math.cos(ang) * TILE * 1.5; m.y = this.world.y + Math.sin(ang) * TILE * 1.5;
        if (m.sprite) m.sprite.setVisible(true);
        if (m._npcEntry) m._npcEntry.hidden = false;
        if (m._interiorSolid && this.interiorSolids) { this.interiorSolids = this.interiorSolids.filter(x => x !== m._interiorSolid); m._interiorSolid = null; }
      } else if (m.recruited || m.benched) {
        if (m.sprite) m.sprite.setVisible(false);
        if (m.reserve && m._npcEntry) m._npcEntry.hidden = true;
      }
    }
    this._rebuildFamiliars && this._rebuildFamiliars();
    this._refreshTeamTabButton && this._refreshTeamTabButton();
    this._updateRetinue && this._updateRetinue();
    return n;
  },

  /** The census, for the tests. */
  _leadCensus() {
    const st = this._leadState();
    return {
      following: this._leadFollowing(), cap: this._leadCap(), active: this._leadActiveCount(), reserve: this._leadReserve().length,
      density: this._partyDensityMult(), fearPath: this._leadFearPath(),
      joined: Object.entries(st.who).filter(([, r]) => r.joined).map(([id, r]) => ({ id, by: r.joined.by, open: r.joined.open, trust: r1(r.trust), understood: (r.understood || []).length })),
      trials: Object.entries(st.who).filter(([, r]) => r.trial).map(([id]) => id),
      executed: Object.keys(st.executed),
      rep: Object.fromEntries(Object.entries(st.rep).map(([k, v]) => [k, r1(v)])),
      adventurers: ADVENTURERS.length,
    };
  },
};
