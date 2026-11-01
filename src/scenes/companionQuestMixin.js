// ============================================================================
// ROUND 389 -- THE COMPANIONS' STORY QUESTS: THE SCENE SIDE.
//
//   The user: "Story moments: ... Build these quests for all the potential companions."
//
// The quests are data (src/data/companionQuests.js). This is what makes them run, and it is built out of what the
// game already does rather than beside it:
//
//   THE ASK      a button on the companion's own talk (`_compQuestChoices`, from `_talkToCompanion`), once they are
//                with you and have told you enough of their history (or trust you enough), at the rank it needs.
//   THE LOG      each stage is ONE held quest in player.quests, id `comp|<quest>`, kind 'compq', rewritten as the
//                stage moves -- so the tracker beside the minimap, the Quests tab, the map pin and the board's
//                chain-quest guard all treat it the way they treat the Division's stages. The journal of finished
//                stages is a row on the Quests tab (`_compQuestRows`).
//   THE WORK     a place stood in, a named townsperson asked (a button on their own talk: `_compQuestAddendum`), packs
//                spawned through the ordinary spawn groups and polled for their clear stamp (the farm's and Olb's
//                way), waves one pack after another, a kill counted off `_questOnKill`.
//   THE MOMENT   the climax calls `_partyNatureStory(moment.id, { only: who, title })` exactly once: the companions
//                whose story it is wake a nature gift evolution, or bank one (round 386). Then loyalty: new idle
//                lines from them, trust for an adventurer, and a deed every adventurer walking with you witnesses.
//
// State: `player.compQuests[id]` = { stage, have, cleared[], wave, waveLive, items[], journal[], done, climaxed, started }.
// A plain player field, so saves carry it; the packs themselves are transient and rebuilt from it after a load.
// ============================================================================
import { TILE } from '../data/iso.js';
import { REGION_BY_ID, regionPoint } from '../data/regions.js';
import { MONSTER_TYPES } from '../data/monsters.js';
import { seededRng } from '../data/awakening.js';
import { ADV_BY_ID } from '../data/adventurers.js';
import { redemptionState } from '../data/outlawCompanions.js';
import {
  COMPQ_BY_ID, COMPANION_QUESTS, COMPQ_FLAG, ESCORT_TILES, compQuestId, compQuestOpen, compRosterOf, compNameOf,
  resolvePlace, stageNeed, stageMonsterKeys,
} from '../data/companionQuests.js';

const TICK_S = 0.25;
const GOLD = '#ffd54f';
const STORY = '#e1bee7';

export const CompanionQuestMixin = {
  // -------------------------------------------------------------------------------------------------------- state
  _compQuestState() {
    const p = this.player;
    if (!p[COMPQ_FLAG] || typeof p[COMPQ_FLAG] !== 'object') p[COMPQ_FLAG] = {};
    return p[COMPQ_FLAG];
  },
  _compQuestRec(qid) {
    const st = this._compQuestState();
    const r = st[qid] = st[qid] || { stage: -1, have: 0, cleared: [], wave: 0, waveLive: false, journal: [], done: false, climaxed: false };
    if (!Array.isArray(r.cleared)) r.cleared = [];
    if (!Array.isArray(r.journal)) r.journal = [];
    return r;
  },
  /** Running: started, not finished. */
  _compQuestActive() {
    const st = this._compQuestState();
    return COMPANION_QUESTS.filter(q => q.status === 'built' && st[q.id] && st[q.id].stage >= 0 && !st[q.id].done);
  },

  // ------------------------------------------------------------------------------------------------ who is with you
  /** The live party member for a roster id ('zeke', 'lucy', or an adventurer's 'kesh' -> adv_kesh). */
  _compQuestMember(id) {
    return (this.party || []).find(m => m && (m.id === id || m.advId === id)) || null;
  },
  /** Walking with you: recruited, not benched, not at the hall. */
  _compQuestWith(id) {
    const m = this._compQuestMember(id);
    return !!(m && m.recruited && !m.benched && !m.dismissed && !m.reserve);
  },
  _compQuestCompany(q) { return q.who.every(id => this._compQuestWith(id)); },
  _compQuestMissing(q) { return q.who.filter(id => !this._compQuestWith(id)).map(compNameOf); },

  /** What `compQuestOpen` reads, from the live game. */
  _compQuestCtx() {
    const p = this.player || {};
    const st = this._companionState ? this._companionState() : { told: p._compTold || {}, rank: p.rank || 'normal' };
    const recruited = (this.party || []).filter(m => m && m.recruited && !m.temporary && !m.benched && !m.dismissed && !m.reserve)
      .map(m => m.advId || m.id);
    const trust = {};
    for (const id of recruited) {
      if (compRosterOf(id) !== 'adv' || !this._leadCalc) continue;
      try { const c = this._leadCalc(ADV_BY_ID[id]); trust[id] = c.need > 0 ? c.trust / c.need : 0; } catch (e) { trust[id] = 0; }
    }
    return { recruited, told: st.told || {}, rank: st.rank, trust };
  },

  _compQuestAvailable(q) {
    const r = this._compQuestState()[q.id];
    if (r && (r.stage >= 0 || r.done)) return false;
    return compQuestOpen(q, this._compQuestCtx()).ok;
  },

  // ------------------------------------------------------------------------------------------------------- talk
  /** The buttons on a companion's own talk: the ask, or a confidence the current stage is waiting for. */
  _compQuestChoices(m) {
    if (!m || !this.player) return [];
    const id = m.advId || m.id;
    const out = [];
    for (const q of COMPANION_QUESTS) {
      if (q.status !== 'built' || !q.who.includes(id)) continue;
      const r = this._compQuestState()[q.id];
      if (this._compQuestAvailable(q)) out.push({ act: `compq|offer|${q.id}`, label: q.offerLabel || `Ask about ${q.title}` });
      else if (r && r.stage >= 0 && !r.done) {
        const stg = q.stages[r.stage];
        if (stg && stg.obj.kind === 'confide' && this._compQuestCompany(q)) out.push({ act: `compq|confide|${q.id}`, label: stg.obj.ask || 'Talk it through' });
      }
    }
    return out;
  },

  /** On a named townsperson's talk: the stage's question, when they are the one it is waiting on and the companions
   *  are there to hear it. Rides on `_openDialogue` and `_renderTalk` the way the Society's buttons do. */
  _compQuestAddendum(npc) {
    if (!npc || !npc.name || !this.player) return [];
    const out = [];
    for (const q of this._compQuestActive()) {
      const r = this._compQuestRec(q.id);
      const stg = q.stages[r.stage];
      const o = stg && stg.obj;
      if (!o || o.kind !== 'talk' || o.npc.name !== npc.name) continue;
      if (npc.settlement && npc.settlement !== o.npc.settlement) continue;
      if (!this._compQuestCompany(q)) continue;
      out.push({ act: `compq|talk|${q.id}`, label: o.ask || `Ask ${o.npc.name}` });
    }
    return out;
  },

  /** The dialogue buttons: 'compq|offer|<id>', 'compq|accept|<id>', 'compq|decline|<id>', 'compq|talk|<id>',
   *  'compq|confide|<id>', 'compq|page'. Each opens or closes the box itself. */
  _compQuestAct(act) {
    const [, what, qid] = String(act).split('|');
    const q = COMPQ_BY_ID[qid];
    if (what === 'page') { this._compQuestNextPage(); return; }
    if (!q || q.status !== 'built') { this._closeDialogue && this._closeDialogue(); return; }
    if (what === 'offer') {
      if (!this._compQuestAvailable(q)) { this._closeDialogue && this._closeDialogue(); return; }
      this._compQuestPages(q, q.offer, null, null, [
        { act: `compq|accept|${q.id}`, label: 'I will come with you' },
        { act: `compq|decline|${q.id}`, label: 'Not yet' },
      ]);
      return;
    }
    if (what === 'accept') { this._compQuestStart(q.id); return; }
    if (what === 'decline') { this._compQuestPages(q, [q.decline], null); return; }
    if (what === 'talk' || what === 'confide') {
      const r = this._compQuestRec(q.id);
      const stg = q.stages[r.stage];
      const want = what === 'talk' ? 'talk' : 'confide';
      if (!stg || stg.obj.kind !== want || !this._compQuestCompany(q)) { this._closeDialogue && this._closeDialogue(); return; }
      // DONE ON THE ASKING, not on the last page: a player who opens it and walks away has still asked. The pages
      // that follow are the talk, and then the stage's own `done` (or, on the last stage, the climax).
      this._compQuestCompleteStage(q.id, stg.talk || [], stg.obj.npc ? stg.obj.npc.name : null);
    }
  },

  // ------------------------------------------------------------------------------------------------------ pages
  _compQuestSpeaker(q, who, npcName) {
    if (who === 'npc') return npcName || '';
    if (who === 'narr') return q.title;
    const m = this._compQuestMember(who);
    return (m && m.name) || compNameOf(who);
  },
  /** Say a run of pages, one press at a time. `end` are the buttons on the last page (default: a close). */
  _compQuestPages(q, pages, npcName = null, onEnd = null, end = null) {
    const list = (pages || []).filter(Boolean);
    if (!list.length) { this._closeDialogue && this._closeDialogue(); if (onEnd) onEnd(); return; }
    this._compPager = { q, pages: list, i: 0, npcName, onEnd, end };
    this._compQuestShowPage();
  },
  _compQuestShowPage() {
    const pg = this._compPager;
    if (!pg) return;
    const [who, text] = pg.pages[pg.i];
    const last = pg.i >= pg.pages.length - 1;
    const choices = last ? (pg.end || [{ act: 'compq|page', label: 'Go on' }]) : [{ act: 'compq|page', label: 'Go on' }];
    this._openDialogue(this._compQuestSpeaker(pg.q, who, pg.npcName), text, null, choices);
  },
  _compQuestNextPage() {
    const pg = this._compPager;
    if (!pg) { this._closeDialogue && this._closeDialogue(); return; }
    if (pg.i < pg.pages.length - 1) { pg.i++; this._compQuestShowPage(); return; }
    this._compPager = null;
    this._closeDialogue && this._closeDialogue();
    if (pg.onEnd) pg.onEnd();
  },

  // --------------------------------------------------------------------------------------------------- the stages
  _compQuestStart(qid) {
    const q = COMPQ_BY_ID[qid];
    if (!q || q.status !== 'built' || !this._compQuestAvailable(q)) { this._closeDialogue && this._closeDialogue(); return false; }
    const r = this._compQuestRec(qid);
    r.stage = 0; r.started = (this._dayIndex ? this._dayIndex() : 0) || 0;
    this._compQuestPages(q, [q.accept], null);
    this._compQuestBeginStage(qid);
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 52, `New story: ${q.title}`, STORY);
    return true;
  },

  /** The stage just reached: its held quest written, its first line said. */
  _compQuestBeginStage(qid) {
    const q = COMPQ_BY_ID[qid];
    const r = this._compQuestRec(qid);
    const stg = q.stages[r.stage];
    if (!stg) return;
    r.have = 0; r.cleared = []; r.wave = 0; r.waveLive = false; r.startSaid = false;
    this._compQuestDropGroups(qid);
    this._compQuestSyncEntry(qid);
    if (this._renderQuestLog) this._renderQuestLog();
  },

  /** The held quest for the current stage, rewritten in place (one row per story, never seven dead ones). */
  _compQuestSyncEntry(qid) {
    const q = COMPQ_BY_ID[qid];
    const r = this._compQuestRec(qid);
    const p = this.player;
    p.quests = p.quests || [];
    const id = compQuestId(q);
    const stg = q.stages[r.stage];
    let e = p.quests.find(x => x.id === id);
    if (!stg || r.done) { p.quests = p.quests.filter(x => x.id !== id); return null; }
    const lead = compNameOf(q.who[0]);
    const pin = this._compQuestPinFor(stg);
    const fields = {
      id, kind: 'compq', compQuest: q.id, compName: q.who.map(compNameOf).join(' and '), compLead: lead,
      title: `${q.title}: ${stg.title}`, desc: stg.log, premise: stg.log,
      stageId: stg.id, region: (stg.obj.place && stg.obj.place.region) || stg.obj.region || null,
      have: r.have || 0, need: stageNeed(stg), state: 'active',
      pinX: pin ? pin.x : null, pinY: pin ? pin.y : null, pinLabel: pin ? pin.label : null,
    };
    if (!e) { e = { tracked: true }; if (this._autoTrackQuest) this._autoTrackQuest(e); p.quests.push(e); }
    Object.assign(e, fields);
    return e;
  },

  _compQuestPinFor(stg) {
    const o = stg.obj;
    if (o.place) { const xy = this._compQuestPlaceXY(o.place); return xy ? { x: xy.x, y: xy.y, label: xy.name } : null; }
    if (o.kind === 'talk') {
      const n = (this.npcs || []).find(x => x && x.name === o.npc.name && (!x.settlement || x.settlement === o.npc.settlement));
      if (n && Number.isFinite(n.x)) return { x: n.x, y: n.y, label: n.name };
    }
    return null;
  },

  /** World position of a place. */
  _compQuestPlaceXY(place) {
    const pl = resolvePlace(place);
    if (!pl) return null;
    const region = REGION_BY_ID[pl.region];
    const c = regionPoint(region, { tx: pl.tx, ty: pl.ty });
    return { x: c.x, y: c.y, r: pl.r * TILE, region: pl.region, name: pl.name };
  },

  /** The objective is met: journal it, say the stage's `done`, then the next stage or the climax. `lead` are pages
   *  said first (a talk stage's conversation), spoken by `npcName` where they say 'npc'. */
  _compQuestCompleteStage(qid, lead = [], npcName = null) {
    const q = COMPQ_BY_ID[qid];
    const r = this._compQuestRec(qid);
    const stg = q.stages[r.stage];
    if (!stg || r.done) return false;
    if (!r.journal.includes(stg.id)) r.journal.push(stg.id);
    this._compQuestDropGroups(qid);
    if (stg.obj.kind === 'retrieve' && !(r.items || []).includes(stg.obj.item)) {
      r.items = (r.items || []).concat([stg.obj.item]);
      if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 60, `Found: ${stg.obj.item}`, GOLD);
    }
    const last = r.stage >= q.stages.length - 1;
    if (last) { this._compQuestClimax(qid, lead, npcName); return true; }
    r.stage++;
    this._compQuestBeginStage(qid);
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 46, `${stg.title} -- done`, STORY);
    const say = (lead || []).concat(this._compQuestDonePages(q, stg));
    if (say.length) this._compQuestPages(q, say, npcName);
    return true;
  },

  /**
   * THE MOMENT. Said, and written into them. The hook fires before the pages, not after the last of them: a player
   * who closes the box halfway through the climax has still lived it, and the evolution must not depend on a click.
   */
  _compQuestClimax(qid, lead = [], npcName = null) {
    const q = COMPQ_BY_ID[qid];
    const r = this._compQuestRec(qid);
    if (r.climaxed) return null;
    r.climaxed = true;
    r.done = true;
    r.doneDay = (this._dayIndex ? this._dayIndex() : 0) || 0;
    const last = q.stages[q.stages.length - 1];
    let evos = [];
    if (this._partyNatureStory) evos = this._partyNatureStory(q.moment.id, { only: q.who.slice(), title: q.moment.title }) || [];
    // LOYALTY, RETURNED. An adventurer's trust is a number and it moves; the core companions' trust has always been
    // what they tell you, and from now on they tell you something different (`_compQuestIdle`).
    const rw = q.reward || {};
    for (const id of q.who) {
      if (compRosterOf(id) === 'adv' && this._leadRec && rw.trust) { try { this._leadRec(id).trust += rw.trust; } catch (e) { /* no lead state */ } }
    }
    if (rw.deed && this._leadDeed) { try { this._leadDeed(rw.deed); } catch (e) { /* no witnesses */ } }
    this._compQuestSyncEntry(qid);
    if (this._renderQuestLog) this._renderQuestLog();
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 46, `${q.title} -- ${q.moment.title}`, STORY);
    const say = (lead || []).concat(this._compQuestDonePages(q, last));
    if (say.length) this._compQuestPages(q, say, npcName);
    return evos;
  },

  /** ROUND 407 -- which way an outlaw in this story was turned (redemptionState of your answers): 'redeemed',
   *  'unsure', 'hardened'; null when nobody in it is an outlaw. */
  _compQuestEnding(q) {
    const w = q.who.find(id => compRosterOf(id) === 'outlaw');
    if (!w) return null;
    return redemptionState(((this.player && this.player.redemption) || {})[w]);
  },
  /** A stage's `done` pages, or its `doneBy[ending]` for an outlaw's story ('unsure' falls back to `done`, then to
   *  'redeemed'). */
  _compQuestDonePages(q, stg) {
    if (!stg) return [];
    const by = stg.doneBy;
    const end = by ? this._compQuestEnding(q) : null;
    if (by && end && by[end] && by[end].length) return by[end];
    if (stg.done && stg.done.length) return stg.done;
    return (by && (by.redeemed || by.hardened)) || [];
  },

  /** Their idle lines once their story is done -- the ordinary bank until then. */
  _compQuestIdle(m) {
    if (!m || !this.player) return null;
    const id = m.advId || m.id;
    const st = this._compQuestState();
    for (const q of COMPANION_QUESTS) {
      if (!q.who.includes(id) || !(st[q.id] && st[q.id].done)) continue;
      // ROUND 407 -- an outlaw's lines by the ending they came to
      const by = q.reward && q.reward.idleBy && q.reward.idleBy[id];
      if (by) { const e = this._compQuestEnding(q); const b = by[e] || by.redeemed || by.hardened; if (b && b.length) return b; }
      const bank = q.reward && q.reward.idle && q.reward.idle[id];
      if (bank && bank.length) return bank;
    }
    return null;
  },

  // ---------------------------------------------------------------------------------------------------- packs
  _compQuestGroupKey(qid, i) { return `${qid}|${this._compQuestRec(qid).stage}|${i}`; },

  /** Stand a pack at the place, through the ordinary spawn groups. Nudged off water, walls and lava toward the
   *  place's centre, because a pack that can never spawn is a stage that can never finish. */
  _compQuestMakeGroup(qid, xy, dx, dy, n, obj, label, salt) {
    const keys = stageMonsterKeys(obj);
    if (!keys.length) return null;
    const rng = seededRng(`compq|${salt}`);
    const key = keys[Math.floor(rng() * keys.length) % keys.length];
    let x = xy.x + dx * TILE, y = xy.y + dy * TILE;
    const bad = (px, py) => (this._isWaterAt && this._isWaterAt(px, py)) || (this._collidesObstacle && this._collidesObstacle(px, py, 24))
      || (this._isLavaAt && this._isLavaAt(px, py));
    for (let t = 0; t < 8 && bad(x, y); t++) { x += (xy.x - x) * 0.3; y += (xy.y - y) * 0.3; }
    // ...and if the centre itself is a barn wall (the farmyard's is), a ring round it.
    for (let t = 0; t < 16 && bad(x, y); t++) {
      const a = (t / 8) * Math.PI * 2, rr = (t < 8 ? 3 : 6) * TILE;
      x = xy.x + Math.cos(a) * rr; y = xy.y + Math.sin(a) * rr;
    }
    const g = {
      region: xy.region, key, x, y, homeX: x, homeY: y, count: n, tier: obj.tier | 0, label,
      roams: false, awake: false, cooldown: 0, members: [], compQuest: qid,
    };
    this.spawnGroups = this.spawnGroups || [];
    this.spawnGroups.push(g);
    return g;
  },

  /** The packs this stage is waiting on, rebuilt if a load or a spawn rebuild dropped them. */
  _compQuestEnsureGroups(qid) {
    const q = COMPQ_BY_ID[qid];
    const r = this._compQuestRec(qid);
    const stg = q.stages[r.stage];
    const o = stg.obj;
    const xy = this._compQuestPlaceXY(o.place);
    if (!xy) return [];
    this._compGroups = this._compGroups || {};
    const have = (this._compGroups[qid] || []).filter(g => (this.spawnGroups || []).includes(g));
    if (o.kind === 'waves') {
      if (!r.waveLive) return have;
      if (have.length) return have;
      const n = o.waves[r.wave] || 3;
      const g = this._compQuestMakeGroup(qid, xy, 0, 0, n, o, `${stg.title} (${r.wave + 1}/${o.waves.length})`, this._compQuestGroupKey(qid, `w${r.wave}`));
      this._compGroups[qid] = g ? [g] : [];
      return this._compGroups[qid];
    }
    const out = [];
    o.packs.forEach(([dx, dy, n], i) => {
      if (r.cleared[i]) return;
      let g = have.find(x => x._compIdx === i);
      if (!g) {
        g = this._compQuestMakeGroup(qid, xy, dx, dy, n, o, stg.title, this._compQuestGroupKey(qid, i));
        if (g) g._compIdx = i;
      }
      if (g) out.push(g);
    });
    this._compGroups[qid] = out;
    return out;
  },

  _compQuestDropGroups(qid) {
    const gs = (this._compGroups && this._compGroups[qid]) || [];
    if (!gs.length) return;
    for (const g of gs) if (g.awake && this._sleepSpawnGroup) { try { this._sleepSpawnGroup(g); } catch (e) { /* already asleep */ } }
    this.spawnGroups = (this.spawnGroups || []).filter(g => !gs.includes(g));
    this._compGroups[qid] = [];
  },

  /** Round 47's rule, read the way the farm reads it: a group whose last member fell carries a clear stamp. Sealed. */
  _compQuestGroupCleared(g) {
    if (g._compCleared) return true;
    if (g.clearedUntil !== undefined && (this._clockT || 0) < g.clearedUntil) {
      g._compCleared = true; g.clearedUntil = Infinity;
      return true;
    }
    return false;
  },

  // ----------------------------------------------------------------------------------------------------- the tick
  _compQuestTick(dt) {
    if (!this.player) return;
    this._compQuestT = (this._compQuestT || 0) + (dt || 0);
    if (this._compQuestT < TICK_S) return;
    this._compQuestT = 0;
    for (const q of this._compQuestActive()) this._compQuestStep(q.id);
  },

  /** One look at one quest's current stage. */
  _compQuestStep(qid) {
    const q = COMPQ_BY_ID[qid];
    const r = this._compQuestRec(qid);
    const stg = q.stages[r.stage];
    if (!stg) return;
    const o = stg.obj;
    if (!o.place) return;   // talk, confide, cull: moved by the dialogue and the kill hook
    const xy = this._compQuestPlaceXY(o.place);
    const here = xy && this.currentRegion && this.currentRegion.id === xy.region && !this._insideRoom;
    if (!here) return;
    const d = Math.hypot(this.world.x - xy.x, this.world.y - xy.y);
    const company = this._compQuestCompany(q);
    if (o.kind === 'goto' || o.kind === 'escort') {
      if (d > xy.r || !company) {
        if (d <= xy.r && !company) this._compQuestNag(q);
        return;
      }
      if (o.kind === 'escort') {
        const near = q.who.every(id => { const m = this._compQuestMember(id); return m && !(m.downT > 0) && Math.hypot(m.x - this.world.x, m.y - this.world.y) <= ESCORT_TILES * TILE; });
        if (!near) return;
      }
      r.have = 1;
      this._compQuestCompleteStage(qid);
      return;
    }
    if (o.kind === 'clear' || o.kind === 'retrieve') {
      const gs = this._compQuestEnsureGroups(qid);
      if (!r.startSaid && d <= xy.r * 2) { r.startSaid = true; this._compQuestSayStart(q, stg); }
      for (const g of gs) {
        if (r.cleared[g._compIdx] || !this._compQuestGroupCleared(g)) continue;
        r.cleared[g._compIdx] = true;
        r.have = r.cleared.filter(Boolean).length;
        if (this._floatText) this._floatText(this.world.x, this.world.y - 66, `${stg.title} (${r.have}/${o.packs.length})`, GOLD);
      }
      this._compQuestSyncEntry(qid);
      if (r.cleared.filter(Boolean).length >= o.packs.length && company) this._compQuestCompleteStage(qid);
      else if (r.cleared.filter(Boolean).length >= o.packs.length) this._compQuestNag(q);
      return;
    }
    if (o.kind === 'waves') {
      if (!r.waveLive) {
        // The first wave waits for you to arrive with them; the rest follow on while you are still standing there.
        if (d > xy.r || !company) { if (d <= xy.r) this._compQuestNag(q); return; }
        r.waveLive = true;
        if (r.wave === 0 && !r.startSaid) { r.startSaid = true; this._compQuestSayStart(q, stg); }
      }
      const gs = this._compQuestEnsureGroups(qid);
      if (gs.length && gs.every(g => this._compQuestGroupCleared(g))) {
        r.wave++; r.waveLive = false; r.have = r.wave;
        this._compQuestDropGroups(qid);
        this._compQuestSyncEntry(qid);
        if (r.wave >= o.waves.length) { this._compQuestCompleteStage(qid); return; }
        if (this._floatText) this._floatText(this.world.x, this.world.y - 66, `${stg.title}: wave ${r.wave + 1} of ${o.waves.length}`, GOLD);
      }
    }
  },

  _compQuestSayStart(q, stg) {
    if (!stg.start) return;
    const m = this._compQuestMember(stg.startBy || q.who[0]);   // ROUND 407 -- `startBy`: whose line it is
    if (m && this._sayOverhead) { try { this._sayOverhead(m, stg.start); return; } catch (e) { /* fall through */ } }
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 60, stg.start, STORY);
  },

  /** You are here and they are not. Said at most every few seconds. */
  _compQuestNag(q) {
    const now = this._clockT || 0;
    if (this._compNagT != null && now - this._compNagT < 6) return;
    this._compNagT = now;
    const miss = this._compQuestMissing(q);
    if (miss.length && this._floatText && this.world) this._floatText(this.world.x, this.world.y - 52, `Bring ${miss.join(' and ')} -- this is their story`, '#ffb347');
  },

  /** From `_questOnKill`: a cull counts the families it names, in its region, with them there. */
  _compQuestOn(kind, m) {
    if (kind !== 'kill' || !m || !this.player) return;
    const fam = MONSTER_TYPES[m.key] && MONSTER_TYPES[m.key].family;
    const region = this.currentRegion && this.currentRegion.id;
    for (const q of this._compQuestActive()) {
      const r = this._compQuestRec(q.id);
      const stg = q.stages[r.stage];
      const o = stg && stg.obj;
      if (!o || o.kind !== 'cull' || !(o.families || []).includes(fam) || o.region !== region) continue;
      if (!this._compQuestCompany(q)) { this._compQuestNag(q); continue; }
      r.have = (r.have || 0) + 1;
      this._compQuestSyncEntry(q.id);
      if (r.have >= (o.need || 1)) this._compQuestCompleteStage(q.id);
    }
  },

  // ------------------------------------------------------------------------------------------------ the quest log
  /** The tracker's and the Quests tab's progress line for a held stage. */
  _compQuestProgressText(e) {
    const q = COMPQ_BY_ID[e && e.compQuest];
    if (!q) return '';
    const r = this._compQuestRec(q.id);
    const stg = q.stages[r.stage];
    if (!stg) return r.done ? 'done' : '';
    const o = stg.obj;
    const miss = this._compQuestMissing(q);
    const bring = miss.length ? ` (bring ${miss.join(' and ')})` : '';
    const at = o.place ? (resolvePlace(o.place) || {}).name : null;
    switch (o.kind) {
      case 'talk': return `ask ${o.npc.name}${bring}`;
      case 'confide': return `talk to ${compNameOf(q.who[0])}${bring}`;
      case 'goto': return `go to ${at}${bring}`;
      case 'escort': return `take ${q.who.map(compNameOf).join(' and ')} to ${at}`;
      case 'cull': return `${Math.min(r.have || 0, o.need)} / ${o.need}${bring}`;
      case 'clear': case 'retrieve': return `${r.cleared.filter(Boolean).length} / ${o.packs.length} packs at ${at}${bring}`;
      case 'waves': return `${r.waveLive ? 'holding' : 'wave'} ${Math.min(r.wave + 1, o.waves.length)} of ${o.waves.length} at ${at}${bring}`;
      default: return '';
    }
  },

  /** The Quests tab's journal: each story, what has happened in it so far, and where it stands. */
  _compQuestRows() {
    const st = this._compQuestState();
    return COMPANION_QUESTS.filter(q => q.status === 'built' && st[q.id] && (st[q.id].stage >= 0 || st[q.id].done)).map(q => {
      const r = st[q.id];
      const lines = q.stages.filter(s => (r.journal || []).includes(s.id)).map(s => `&#10003; ${s.title}`);
      const now = r.done ? `${q.moment.title}` : (q.stages[r.stage] ? q.stages[r.stage].title : '');
      return `<div class="row"><div>${q.title} <span style="opacity:0.6;font-size:11px;">(${q.who.map(compNameOf).join(' and ')})</span>`
        + `<div style="opacity:0.6;font-size:11px;">${lines.join(' &middot; ') || 'just begun'}</div></div>`
        + `<div>${r.done ? 'done' : now}</div></div>`;
    }).join('');
  },
};
