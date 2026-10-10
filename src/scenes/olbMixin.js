// ===========================================================================
// ROUND 314 -- OLB NIKOBE'S LESSONS: THE SCENE SIDE.
//
// What the arc IS (the lessons, his words, the tasks) lives in
// src/data/olbArc.js. This is the part that needs a world: finding Olb, running
// the conversation a page at a time, handing over a kit and a book, and
// recognising the moment a task has been done.
//
// A TASK IS RECOGNISED WHERE THE GAME ALREADY KNOWS IT HAPPENED, not by a scan.
// Six one-line calls into `_olbOn(kind)` sit at the doors those things already
// go through:
//
//   kill      `_questOnKill`        every monster that dies
//   loot      `_takeLoot` and `_lootCorpsesAround`   floor loot and corpses
//   craft     `_commissionCraft`    a bench commission that handed over an item
//   book      `_readBook`           a skill book read
//   aura      `_toggleAuraProjection`   the aura pulled in or let out
//   (and two things polled once a second from `_olbTick`: a notice taken, and
//    seconds spent meditating)
//
// Everything is kept on `player.olb`, a plain field, so it saves and loads with
// the rest of the character.
// ===========================================================================

import {
  OLB_NAME, OLB_FLAG, OLB_STAGES, OLB_STAGE_BY_ID, OLB_KILLS, OLB_MEDITATE_S, OLB_AURA_TOGGLES,
  OLB_KIT, OLB_UNREGISTERED, OLB_BUSY, OLB_IDLE, newOlb, olbNextStage,
} from '../data/olbArc.js';
import { controlHint } from '../data/hotkeys.js';
import * as Craft from '../data/crafting.js';
import * as Quint from '../data/quintessence.js';
import { grantCoins } from '../data/inventory.js';
import { weaponBook, BOOK_WEAPONS, skillBooksOf } from '../data/skillBooks.js';

export const OlbMixin = {

  /** The arc's state, or null when the player has not joined the Society (the
   *  arc begins at the desk). Created the first time it is asked for, so a save
   *  from before this round that is already registered starts at the beginning. */
  _olbState() {
    const p = this.player;
    if (!p) return null;
    const joined = this._societyState && this._societyState().joined;
    if (!joined) return null;
    if (!p[OLB_FLAG]) p[OLB_FLAG] = newOlb();
    return p[OLB_FLAG];
  },

  /** A line of his, with the player's own control labels in it. */
  _olbFill(text) {
    const aura = controlHint('auraToggle') || 'R';
    const interact = controlHint('interact') || 'E';
    return String(text)
      .replace(/\{sprint\}/g, 'Shift (L3 on a pad)')
      .replace(/\{interact\}/g, interact)
      .replace(/\{meditate\}/g, 'M (R3 on a pad)')
      .replace(/\{aura\}/g, aura);
  },

  // -------------------------------------------------------------------------
  // THE CONVERSATION: pages, one press each.
  // -------------------------------------------------------------------------
  _olbSay(pages, onEnd, endLabel) {
    const list = (pages || []).map(t => this._olbFill(t));
    if (!list.length) { if (onEnd) onEnd(); return; }
    this._olbConv = { pages: list, onEnd: onEnd || null, endLabel: endLabel || 'Right.' };
    this._olbPage(0);
  },

  _olbPage(i) {
    const c = this._olbConv;
    if (!c) return;
    const last = i >= c.pages.length - 1;
    const npc = this._lastTalkNpc || this.nearNpc || null;
    this._openDialogue(OLB_NAME, c.pages[i], npc,
      [{ act: last ? 'olb|end' : `olb|p|${i + 1}`, label: last ? c.endLabel : 'Go on' }]);
  },

  /** The dialogue buttons: 'olb|p|<n>' next page, 'olb|end' done. */
  _olbAct(act) {
    const parts = String(act).split('|');
    if (parts[1] === 'p') { this._olbPage(Number(parts[2]) || 0); return; }
    const c = this._olbConv;
    this._olbConv = null;
    this._closeDialogue();
    // synchronous: a task's side effects (a kit, a book) never open a dialogue
    if (c && c.onEnd) c.onEnd();
  },

  // -------------------------------------------------------------------------
  // TALKING TO HIM
  // -------------------------------------------------------------------------
  _talkToOlb(npc) {
    this._lastTalkNpc = npc || this._lastTalkNpc;
    const st = this._olbState();
    if (!st) {
      // not on the books: the old aura trainer's refusal still makes sense
      this._openDialogue(OLB_NAME, OLB_UNREGISTERED[0], npc);
      return;
    }
    const stage = OLB_STAGE_BY_ID[st.stage];
    if (!stage) { this._trainAuraControl(npc); return; }
    if (st.phase === 'brief') { this._olbBrief(stage); return; }
    if (st.phase === 'report') { this._olbReport(stage); return; }
    if (st.phase === 'hunt') { this._olbTalkBody(npc); return; }   // ROUND 315 -- out with you
    if (st.phase === 'waiting' && st.stage === 'hunt' && this.player.auraTrained) { this._olbHuntOffer(npc); return; }   // ROUND 315
    if (st.phase === 'waiting' || st.phase === 'idle') {
      // the lessons are done; he is the aura trainer still, and says so
      if (!this.player.auraTrained) { this._trainAuraControl(npc); return; }
      const line = st.phase === 'waiting' && OLB_BUSY[stage.id]
        ? OLB_BUSY[stage.id]
        : OLB_IDLE[Math.abs((this.player.xp | 0) + (st.kills | 0)) % OLB_IDLE.length];
      this._openDialogue(OLB_NAME, this._olbFill(line), npc);
      return;
    }
    // 'doing': remind them, and re-offer the kit if they have lost the means
    const base = OLB_BUSY[stage.id] || 'Go on. I will be here.';
    this._olbRestock(stage);
    this._openDialogue(OLB_NAME, this._olbFill(base) + this._olbProgressTail(stage, st), npc);
  },

  _olbBrief(stage) {
    this._olbSay(stage.brief, () => this._olbBegin(stage));
  },

  /** The lesson is handed in: his answer, the reward, and (in the same
   *  conversation) the next lesson's brief. */
  _olbReport(stage) {
    const st = this._olbState();
    const next = olbNextStage(stage.id);
    this._olbPay(stage);
    st.done = st.done || [];
    if (!st.done.includes(stage.id)) st.done.push(stage.id);
    if (!next) { st.phase = 'idle'; this._olbSay(stage.done); return; }
    this._olbAdvance(next);
    this._olbSay([...stage.done, ...next.brief], () => this._olbBegin(next));
  },

  _olbAdvance(next) {
    const st = this._olbState();
    st.stage = next.id;
    st.phase = 'brief';
    st.kills = 0; st.looted = 0; st.medS = 0; st.auraToggles = 0;
  },

  /** The task begins. Side effects of a lesson (a kit, a book, a skill) are
   *  paid here, once. */
  _olbBegin(stage) {
    const st = this._olbState();
    if (!st) return;
    const p = this.player;
    if (stage.id === 'meet') {
      // the introduction is its own lesson: when it is heard, the board is next
      st.done = st.done || [];
      if (!st.done.includes('meet')) st.done.push('meet');
      st.stage = 'board'; st.phase = 'doing';
      this._floatText(this.world.x, this.world.y - 46, 'Lesson: take a notice from the board', '#ffd54f');
      return;
    }
    if (stage.id === 'weapon') this._olbGiveKit();
    if (stage.id === 'books') this._olbGiveBook();
    if (stage.id === 'aura') {
      p.auraTrained = true;
      if (p.auraProjected === undefined) p.auraProjected = true;
      this._auraTrainedAt = this._clockT || 0;
    }
    if (stage.id === 'hunt') {
      st.phase = 'waiting';
      return;
    }
    st.phase = 'doing';
    this._floatText(this.world.x, this.world.y - 46, `Lesson: ${stage.title}`, '#ffd54f');
    this._olbCheck();
  },

  // -------------------------------------------------------------------------
  // WHAT HE HANDS OVER
  // -------------------------------------------------------------------------
  _olbPay(stage) {
    if (!stage.reward) return;
    const purse = this.player.coins;
    for (const [rank, n] of Object.entries(stage.reward)) {
      grantCoins(purse, rank, n);
      this._floatText(this.world.x, this.world.y - 40, `+${n} ${rank} coin${n === 1 ? '' : 's'}`, '#ffd54f');
    }
  },

  /** Metal, a core, a quintessence and a fee: enough for the cheapest bench
   *  commission. Topped up (not duplicated) if the player already holds some. */
  _olbGiveKit() {
    const inv = this.player.inventory;
    const need = (arr, id, n) => { let have = arr.filter(x => x === id).length; while (have < n) { arr.push(id); have++; } };
    inv.stock = inv.stock || []; inv.cores = inv.cores || []; inv.quintessence = inv.quintessence || [];
    need(inv.stock, Craft.stockId('metal', 0), OLB_KIT.stock);
    need(inv.cores, Craft.coreId(0), OLB_KIT.cores);
    const q = this._olbQuintId();
    if (q) need(inv.quintessence, q, OLB_KIT.quints);
    const fee = (this.player.coins && this.player.coins.normal) || 0;
    if (fee < OLB_KIT.coins) grantCoins(this.player.coins, 'normal', OLB_KIT.coins - fee);
    this.player.olb.tookKit = true;
    this._floatText(this.world.x, this.world.y - 52, 'A smith\'s kit', '#aed581');
    if (this._renderInventory) this._renderInventory();
  },

  _olbQuintId() {
    const ids = Object.keys(Quint.QUINTESSENCE_DEFS || {});
    const base = ids.find(id => Quint.quintRankOf(id).rank === 'iron') || ids[0];
    return base || null;
  },

  /** If the task is the weapon and the kit has gone, hand it over again. */
  _olbRestock(stage) {
    if (stage.id !== 'weapon') return;
    const inv = this.player.inventory || {};
    const have = (inv.stock || []).length && (inv.cores || []).length && (inv.quintessence || []).length;
    if (!have) this._olbGiveKit();
  },

  /** A weapon primer for what they just made (or the first they do not know). */
  _olbGiveBook() {
    const p = this.player;
    const known = (skillBooksOf(p).weapons) || {};
    const made = p.olb && p.olb.craftedWeapon;
    let wid = made && BOOK_WEAPONS.includes(made) && !known[made] ? made : null;
    if (!wid) wid = BOOK_WEAPONS.find(w => !known[w]) || BOOK_WEAPONS[0];
    const row = wid ? weaponBook(wid) : null;
    if (!row) return;
    p.bookBag = p.bookBag || [];
    if (!p.bookBag.includes(row.id)) p.bookBag.push(row.id);
    p.olb.gaveBook = row.id;
    this._floatText(this.world.x, this.world.y - 52, row.name, '#ffcc80');
    if (this._renderInventory) this._renderInventory();
  },

  // -------------------------------------------------------------------------
  // RECOGNISING A TASK
  // -------------------------------------------------------------------------
  _olbOn(kind, data) {
    const st = this.player && this.player[OLB_FLAG];
    if (!st || st.phase !== 'doing') return;
    if (kind === 'kill' && st.stage === 'combat') st.kills = (st.kills || 0) + 1;
    else if (kind === 'loot' && st.stage === 'combat') st.looted = (st.looted || 0) + 1;
    else if (kind === 'craft' && st.stage === 'weapon' && data && data.kind === 'weapon') { st.craftedWeapon = data.id || null; st.crafted = true; }
    else if (kind === 'book' && st.stage === 'books') st.read = true;
    else if (kind === 'aura' && st.stage === 'aura') st.auraToggles = (st.auraToggles || 0) + 1;
    else return;
    this._olbCheck();
  },

  /** Per-frame: the two things nothing else announces. */
  _olbTick(dt) {
    const st = this.player && this.player[OLB_FLAG];
    if (!st || st.phase !== 'doing') return;
    if (st.stage === 'meditate' && this.player.meditating) {
      st.medS = (st.medS || 0) + dt;
      this._olbCheck();
      return;
    }
    if (st.stage === 'board') {
      this._olbPollT = (this._olbPollT || 0) + dt;
      if (this._olbPollT < 1) return;
      this._olbPollT = 0;
      this._olbCheck();
    }
  },

  /** Is the live task done? If so it is time to go back. */
  _olbCheck() {
    const st = this.player && this.player[OLB_FLAG];
    if (!st || st.phase !== 'doing') return false;
    let done = false;
    switch (st.stage) {
      case 'board': done = (this.player.quests || []).some(q => q && q.state !== 'turnedIn'); break;
      case 'combat': done = (st.kills || 0) >= OLB_KILLS && (st.looted || 0) >= 1; break;
      case 'weapon': done = !!st.crafted; break;
      case 'books': done = !!st.read; break;
      case 'meditate': done = (st.medS || 0) >= OLB_MEDITATE_S; break;
      case 'aura': done = (st.auraToggles || 0) >= OLB_AURA_TOGGLES; break;
      default: done = false;
    }
    if (!done) return false;
    st.phase = 'report';
    this._floatText(this.world.x, this.world.y - 46, 'Lesson done: return to Olb', '#8bc34a');
    return true;
  },

  _olbProgressTail(stage, st) {
    if (stage.id === 'combat') return `\n\n(Kills ${Math.min(st.kills || 0, OLB_KILLS)} of ${OLB_KILLS}; looted ${st.looted ? 'yes' : 'not yet'}.)`;
    if (stage.id === 'aura') return `\n\n(${Math.min(st.auraToggles || 0, OLB_AURA_TOGGLES)} of ${OLB_AURA_TOGGLES}.)`;
    return '';
  },

  // -------------------------------------------------------------------------
  // THE TRACKER ROW, beside the minimap, and the line on the Quests page
  // -------------------------------------------------------------------------
  _olbObjective() {
    const st = this.player && this.player[OLB_FLAG];
    if (!st) return null;
    const stage = OLB_STAGE_BY_ID[st.stage];
    if (!stage) return null;
    if (st.phase === 'brief') return { title: `Olb's lessons: ${stage.title}`, line: 'Talk to Olb Nikobe', ready: true };
    if (st.phase === 'report') return { title: `Olb's lessons: ${stage.title}`, line: 'Done. Return to Olb', ready: true };
    if (st.phase === 'waiting') return { title: "Olb's lessons", line: 'Rest, then find Olb for the hunt', ready: false };
    if (st.phase === 'idle') return this._olbFriendsObjective ? this._olbFriendsObjective() : null;   // ROUND 316
    if (st.phase === 'hunt') return this._olbHuntObjective();   // ROUND 315
    let line = this._olbFill(stage.task);
    if (stage.id === 'combat') line += ` (${Math.min(st.kills || 0, OLB_KILLS)}/${OLB_KILLS} killed, ${st.looted ? 'looted' : 'not yet looted'})`;
    if (stage.id === 'aura') line += ` (${Math.min(st.auraToggles || 0, OLB_AURA_TOGGLES)}/${OLB_AURA_TOGGLES})`;
    if (stage.id === 'meditate') line += ` (${Math.min(Math.floor(st.medS || 0), OLB_MEDITATE_S)}/${OLB_MEDITATE_S}s)`;
    return { title: `Olb's lessons: ${stage.title}`, line, ready: false };
  },

  _olbTrackerRow() {
    const o = this._olbObjective();
    if (!o) return '';
    return `<div class="qt-row${o.ready ? ' qt-ready' : ''}">`
      + `<div class="qt-name">${o.title}</div><div class="qt-prog">${o.line}</div></div>`;
  },

  _olbQuestRow() {
    const o = this._olbObjective();
    if (!o) return '';
    return `<div class="row"><div>${o.title}</div><div>${o.line}</div></div>`;
  },
};
