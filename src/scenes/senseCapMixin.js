// ============================================================================
// ROUND 388 -- ONE AURA (AND ONE PERCEPTION) A KIT, IN THE SCENE.
//
//   "Ended up with 2 auras again and no obvious reason why I would have 2
//    auras ... I think the issue in this case was I used 1 stone after the
//    other without exiting my inventory."
//
// The generator (awakening.js) now asks the WHOLE kit whether it holds an aura
// before a socket awakens one, so a stone can no longer make a second. What it
// cannot do is decide what a player SEES about a kit that already holds two from
// before this round. That is here:
//
//   THE RULE FOR AN OLD SAVE. Nothing is deleted. The aura that awakened first
//   stays on; the extra keeps its socket, its name and its card, and its passive
//   switch is held Off, with a message saying why, once. The player may pick:
//   switching the held-off one On switches the other Off instead (and that
//   choice is remembered). A right earned later (the soul scar's evolution, or a
//   Human's adapted gift) lifts the cap, and the next rebuild switches it back
//   on by itself.
//
//   WHY THIS RATHER THAN A RE-ROLL. Round 350 re-rolled the extra's socket. That
//   took an ability the player had earned, and sometimes the one they had held
//   longest (it kept the earlier SLOT, not the earlier awakening). Holding a
//   switch off loses nothing and is undone by the player in one press.
//
// Player fields (saved with the player, as every plain field is):
//   senseCapHeld  { key: name }  switched off BY THE CAP, not by the player
//   senseChoice   { key: name }  the player chose this held-off one over its rival
//   senseCapTold  { 'key|name': true }  the message has been shown
//
//   _senseAllowanceSlots()   the multiAura / multiPerception flags for rebuildKnownAbilities
//   _settleSenseCap(result)  after every rebuild: hold off / release, remember what was refused
//   _senseCapToggle(key, on) from _togglePassive: the player's choice between the two
//   _senseWant()             which of the soul scar's two evolutions the kit wants
//   _senseCapNote() / _senseCapRowNote(key) / _senseSocketLines(slotIdx)   what the sheet and the awakening say
//   _partySenseAllowance(def) / _partySenseOk(sp, passives, essId, allow)  a Human companion's adapted gift
// ============================================================================

import { resolveEvolutions } from '../data/natures.js';
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import {
  senseAllowanceOf, senseRuleLine, senseRefusedLine, senseAllowedLine, senseHeldOffLine,
} from '../data/senseAllowance.js';

const KINDS = ['aura', 'perception'];
const kindOf = (a) => (a && a.template === 'aura' ? 'aura' : (a && a.template === 'perception' ? 'perception' : null));

export const SenseCapMixin = {
  /** What the player's nature allows, and the name of what allows it. */
  _senseAllowance() {
    const fx = this._natureFx ? this._natureFx() : {};
    const allow = senseAllowanceOf(fx);
    const why = { aura: null, perception: null };
    try {
      const evos = resolveEvolutions(this._natureHave ? this._natureHave() : {}, ESSENCE_CATALOG, this.player && this.player.natureEvoRec);
      for (const e of evos) {
        if (e && e.fx && e.fx.multiAura && !why.aura) why.aura = e.name;
        if (e && e.fx && e.fx.multiPerception && !why.perception) why.perception = e.name;
      }
    } catch (e) { /* the names are for the sheet only */ }
    return { ...allow, why };
  },

  /** Spread into the slots handed to rebuildKnownAbilities. */
  _senseAllowanceSlots() {
    const a = this._senseAllowance();
    return { multiAura: !!a.aura, multiPerception: !!a.perception };
  },

  /** After every rebuild (from _rebuildAbilities, after _prunePassivesOff). */
  _settleSenseCap(result = null) {
    const p = this.player;
    if (!p) return;
    if (result) { this._senseCapInfo = result.senseCap || null; this._senseCapRefused = result.senseRefused || {}; }
    const known = p.knownAbilities || {};
    p.passivesOff = p.passivesOff || {};
    p.senseCapHeld = p.senseCapHeld || {};
    p.senseChoice = p.senseChoice || {};
    p.senseCapTold = p.senseCapTold || {};
    const hold = {};
    for (const [k, e] of Object.entries(known)) {
      if (!e || !e.overCap || !e.ability) continue;
      const rival = e.overCapRival && known[e.overCapRival] ? e.overCapRival : null;
      const chose = rival && p.senseChoice[k] === e.ability.name;
      if (chose) hold[rival] = { name: known[rival].ability.name, kind: e.overCap, other: e.ability.name };
      else hold[k] = { name: e.ability.name, kind: e.overCap, other: rival ? known[rival].ability.name : null };
    }
    // a choice whose held-off one is gone (or is no longer over the cap) is forgotten
    for (const [k, name] of Object.entries(p.senseChoice)) {
      if (!known[k] || !known[k].overCap || known[k].ability.name !== name) delete p.senseChoice[k];
    }
    // release what the cap no longer holds (the right was earned, or the ability is gone)
    for (const [k, name] of Object.entries(p.senseCapHeld)) {
      if (hold[k] && hold[k].name === name) continue;
      if (p.passivesOff[k] === name) delete p.passivesOff[k];
      delete p.senseCapHeld[k];
    }
    const notes = [];
    for (const [k, h] of Object.entries(hold)) {
      p.passivesOff[k] = h.name;
      p.senseCapHeld[k] = h.name;
      const told = `${k}|${h.name}`;
      if (!p.senseCapTold[told]) { p.senseCapTold[told] = true; notes.push(senseHeldOffLine(h.kind, h.name, h.other)); }
    }
    if (notes.length) {
      this._senseCapNotes = (this._senseCapNotes || []).concat(notes);
      // said a moment later, so a load or an open inventory is not interrupted mid-build
      if (this.time && this.time.delayedCall) this.time.delayedCall(900, () => this._flushSenseCapNotes());
    }
  },

  _flushSenseCapNotes() {
    const lines = this._senseCapNotes || [];
    this._senseCapNotes = [];
    if (!lines.length || !this._announce) return;
    try { this._announce([{ title: 'One aura, one perception', lines }]); } catch (e) { /* display only */ }
  },

  /**
   * From _togglePassive, before anything else. Handles a switch the CAP holds: turning it on is the player choosing
   * it over its rival, which is switched off instead. Returns the new state, or undefined to let the switch run as
   * it always has.
   */
  _senseCapToggle(key, want) {
    const p = this.player;
    const known = (p && p.knownAbilities) || {};
    const e = known[key];
    if (!e || !e.ability || !p.senseCapHeld || p.senseCapHeld[key] !== e.ability.name) return undefined;
    if (want === false) return false;   // it is already off
    p.senseChoice = p.senseChoice || {};
    if (e.overCap) p.senseChoice[key] = e.ability.name;   // the extra, chosen over the first
    else for (const [k, x] of Object.entries(known)) {     // the first, chosen back
      if (x && x.overCap && x.overCapRival === key) delete p.senseChoice[k];
    }
    this._settleSenseCap();
    this._passiveToggleVersion = (this._passiveToggleVersion || 0) + 1;
    this._stackAbilCache = null;
    if (this._reconcileConjuredItems) this._reconcileConjuredItems();
    if (this._rebuildDmgTransfer) this._rebuildDmgTransfer();
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    if (this._rebuildFamiliars) this._rebuildFamiliars();
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 46, `${e.ability.name}: on`, '#a5d6a7');
    return true;
  },

  /** Which of the soul scar's two evolutions this kit wants: a perception only when that is what is held off. */
  _senseWant() {
    const known = (this.player && this.player.knownAbilities) || {};
    const over = Object.values(known).filter(e => e && e.overCap).map(e => e.overCap);
    return over.includes('perception') && !over.includes('aura') ? 'perception' : 'aura';
  },

  /** How many of the kind the kit holds and has not had held off by the cap. */
  _senseHeldCount(kind) {
    const p = this.player;
    const held = (p && p.senseCapHeld) || {};
    return Object.entries((p && p.knownAbilities) || {})
      .filter(([k, e]) => e && kindOf(e.ability) === kind && !(held[k] && held[k] === e.ability.name)).length;
  },

  /** The sheet's two lines, under the passive heading. */
  _senseCapNote() {
    const info = this._senseCapInfo;
    if (!info) return '';
    const allow = this._senseAllowance();
    const rows = KINDS.map(kind => {
      const n = this._senseHeldCount(kind);
      return `<div>${senseRuleLine(kind, info[kind], n, allow.why[kind])}</div>`;
    }).join('');
    return `<div class="sense-cap-note" style="opacity:0.8;font-size:11px;margin:0 0 6px;color:#cfd8dc;">${rows}</div>`;
  },

  /** Under a passive the cap holds off: why, and what switching it on does. */
  _senseCapRowNote(key) {
    const p = this.player;
    const e = p && p.knownAbilities && p.knownAbilities[key];
    if (!e || !e.ability || !p.senseCapHeld || p.senseCapHeld[key] !== e.ability.name) return '';
    const known = p.knownAbilities;
    let other = null, kind = kindOf(e.ability) || 'aura';
    if (e.overCap) other = e.overCapRival && known[e.overCapRival] ? known[e.overCapRival].ability.name : null;
    else {
      const x = Object.values(known).find(v => v && v.overCap && v.overCapRival === key);
      other = x ? x.ability.name : null;
    }
    return `<div class="sense-cap-row" style="font-size:11px;color:#ffd48a;margin:2px 0;">${senseHeldOffLine(kind, e.ability.name, other)}</div>`;
  },

  /** Extra lines for the "Ability Awakened" page of the stone just socketed into `slotIdx`. */
  _senseSocketLines(slotIdx) {
    const p = this.player;
    const row = (p && p.slotStones && p.slotStones[slotIdx]) || [];
    if (!row.length) return [];
    const key = `${slotIdx}:s${row.length - 1}:${row[row.length - 1]}`;
    const known = p.knownAbilities || {};
    const refused = this._senseCapRefused && this._senseCapRefused[key];
    if (refused) {
      const holder = Object.values(known).find(e => e && kindOf(e.ability) === refused);
      return [senseRefusedLine(refused, holder ? holder.ability.name : null)];
    }
    const e = known[key];
    const kind = e && kindOf(e.ability);
    if (!kind) return [];
    const n = this._senseHeldCount(kind);
    if (n < 2) return [];
    const info = (this._senseCapInfo || {})[kind] || {};
    const why = info.savant ? 'Your savant passive' : (this._senseAllowance().why[kind] || 'A nature gift');
    return [senseAllowedLine(kind, n, why)];
  },

  // ---------------------------------------------------------------- companions
  /** A companion's adapted gift (a Human with Magic, or with a sight essence). */
  _partySenseAllowance(def) {
    try { return senseAllowanceOf(this._partyNatureFx ? this._partyNatureFx(def) : {}); } catch (e) { return { aura: false, perception: false }; }
  },

  /** May a companion's socket take this passive? One aura and one perception, or one on each essence with the gift. */
  _partySenseOk(sp, passives, essId, allow) {
    const kind = kindOf(sp);
    if (!kind) return true;
    const same = (passives || []).filter(x => kindOf(x) === kind);
    if (!same.length) return true;
    if (!(allow && allow[kind])) return false;
    return same.length < 4 && !same.some(x => x.essenceId === essId);
  },
};
