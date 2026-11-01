// ============================================================================
// ROUND 428 -- THE DIVINE SECRETS, IN THE SCENE.
//
// data/divineSecrets428.js holds the secrets, their words and the record. This file:
//   THE WATCH     the hooks call `_dsBreak(id)` (a 'never' broken), `_dsCount(id)` (a count raised) or `_dsDeed(id,
//                 tier)` (a deed done). Breaking is silent: a secret is a secret.
//   THE FAVOURS   `_dsTick` looks every two seconds, with no panel open. A minor favour is a nature gift evolution
//                 (natureMixin's quest-reward door), after the god's words. A major favour is the god, offering its
//                 divine essence for the confluence slot: accept, not yet (it asks again in fifteen minutes), or
//                 refuse.
//   KNOWLEDGE     `_dsHeardOut(npc)` is told when a conversation's topics have all been asked; a city counts once 95%
//                 of its people are heard out.
// The other mechanics (razing, the gaols, the thrones, the challenges) live in razeMixin.js, gaolMixin.js and
// throneMixin.js, and call the three doors above.
// ============================================================================
import {
  DIVINE_SECRETS, SECRET_IDS, secretState, breakSecret, secretEarned, bumpSecret, markDeed, KNOWLEDGE_SHARE, heardShare,
} from '../data/divineSecrets428.js';
import { divineInfo, godLabel } from '../data/divine.js';

const LOOK_S = 2;
const NOT_YET_S = 900;

export const DivineSecretsMixin = {
  _dsState() {
    const p = this.player;
    const fresh = !!p && !p.secrets428;
    const s = secretState(p);
    // A record starting on a save that already walks with companions starts with Heroes' secret already broken.
    if (fresh && (this.party || []).some(m => m && m.recruited && !m.temporary)) breakSecret(p, 'heros', 'You took a companion.');
    return s;
  },

  /** A 'never' broken (or a count lost). Silent. */
  _dsBreak(id, why = '') {
    if (!this.player) return false;
    return breakSecret(this.player, id, why);
  },
  _dsCount(id, by = 1) {
    if (!this.player) return 0;
    return bumpSecret(this.player, id, by);
  },
  _dsDeed(id, tier, detail = '') {
    if (!this.player) return;
    markDeed(this.player, id, tier, detail);
  },
  _dsEarned(id) { return secretEarned(this.player, id); },

  _dsTick(dt) {
    const p = this.player;
    if (!p) return;
    if (!p.secrets428) this._dsState();   // the record starts as early as the character does
    if (p.dead || p.hp <= 0) return;
    this._dsLookT = (this._dsLookT || 0) + dt;
    if (this._dsLookT < LOOK_S) return;
    this._dsLookT = 0;
    if (this._isAnyOverlayOpen && this._isAnyOverlayOpen()) return;
    if (this._dialogueOpen) return;
    const s = this._dsState();
    const now = this._clockT || 0;
    for (const id of SECRET_IDS) {
      const def = DIVINE_SECRETS[id];
      if (def.kind === 'built427') continue;
      const e = secretEarned(p, id);
      const g = s.granted[id] = s.granted[id] || {};
      if (e.minor && !g.minor) { g.minor = this._dayIndex ? (this._dayIndex() || 1) : 1; this._dsMinor(id); return; }
      if (e.major && !g.major && !(g.askAt > now)) { this._dsMajor(id); return; }
    }
  },

  /** The minor favour: the god's words, then a nature gift evolution. */
  _dsMinor(id) {
    const def = DIVINE_SECRETS[id];
    const p = this.player;
    p.natureAchieved = p.natureAchieved || {};
    p.natureAchieved[`story|secret_${id}`] = (this._dayIndex ? this._dayIndex() : 0) || 1;
    // the god's words ride on the gift's own announcement (a second page would be drawn over by it)
    const why = `${this._dsName(id)}: ${def.minorLine}`;
    const e = this._natureNextEligible ? this._natureNextEligible() : null;
    let evo = null;
    if (e && this._natureEvolve) evo = this._natureEvolve(e, 'reward', why);
    else {
      p.natureBanked = (p.natureBanked || 0) + 1;
      this._openDialogue(this._dsName(id), `${def.minorLine}\n\n[ ${this._dsName(id)} has noticed you. A nature gift evolution waits for something in you to wake. ]`);
    }
    return evo;
  },

  /** The major favour: the god offers its divine essence. */
  _dsMajor(id) {
    const def = DIVINE_SECRETS[id];
    const p = this.player;
    const dv = divineInfo(def.god);
    const s = this._dsState();
    const g = s.granted[id] = s.granted[id] || {};
    if (!dv) { g.major = 'none'; return; }
    if (p.divineGod || (p.deathChurch && p.deathChurch.blessed)) {
      g.major = 'held';
      this._openDialogue(this._dsName(id), `${def.majorLine}\n\n"...But another god already holds the place where your confluence would be. I do not share it."`);
      return;
    }
    this._dsPending = id;
    this._openDialogue(this._dsName(id),
      `${def.majorLine}\n\n[ Offered: ${dv.name}. It bonds to your confluence slot and ties you to ${godLabel(def.god)} for good. ]`,
      null,
      [
        { label: `Accept ${dv.name}`, act: `ds|accept|${id}` },
        { label: 'Not yet', act: `ds|later|${id}` },
        { label: 'Refuse', act: `ds|refuse|${id}` },
      ]);
  },

  _dsName(id) {
    const def = DIVINE_SECRETS[id];
    const n = def.who || godLabel(def.god);
    return n.charAt(0).toUpperCase() + n.slice(1);
  },

  _dsAct(act) {
    const [, what, id] = String(act).split('|');
    const def = DIVINE_SECRETS[id];
    if (!def) return;
    const s = this._dsState();
    const g = s.granted[id] = s.granted[id] || {};
    this._closeDialogue();
    this._dsPending = null;
    if (what === 'accept') {
      g.major = this._dayIndex ? (this._dayIndex() || 1) : 1;
      const p = this.player;
      if (!p.godsGranted.includes(def.god)) p.godsGranted.push(def.god);
      p.inventory.essences.push(`divine_${def.god}`);
      const dv = divineInfo(def.god);
      this._floatText(this.world.x, this.world.y - 52, `Received ${dv.name}: bond it from your essences`, dv.color);
      if (this._renderInventory) this._renderInventory();
    } else if (what === 'later') {
      g.askAt = (this._clockT || 0) + NOT_YET_S;
    } else if (what === 'refuse') {
      g.major = 'refused';
    }
  },

  // ------------------------------------------------------------------------------------------- Knowledge
  /** Stable key for a person, for the Knowledge record. */
  _dsPersonKey(npc) {
    if (!npc) return null;
    if (npc._dsKey) return npc._dsKey;
    const k = npc.id || npc.key || (npc.name && `${npc.name}|${Math.round((npc.homeX || npc.x || 0) / 64)}|${Math.round((npc.homeY || npc.y || 0) / 64)}`);
    if (k) npc._dsKey = String(k);
    return npc._dsKey || null;
  },

  /** A conversation has been heard to its end. */
  _dsHeardOut(npc) {
    const key = this._dsPersonKey(npc);
    if (!key) return;
    const s = this._dsState();
    s.knowledge.heard[key] = 1;
    this._dsKnowledgeCheck();
  },

  /** Count the cities heard out. Each city is counted once and for good. */
  _dsKnowledgeCheck() {
    const s = this._dsState();
    const byCity = this._dsCityPeople ? this._dsCityPeople() : {};
    for (const [city, people] of Object.entries(byCity)) {
      if (s.knowledge.cities[city] || people.length < 5) continue;
      if (heardShare(people, s.knowledge.heard) >= KNOWLEDGE_SHARE) {
        s.knowledge.cities[city] = 1;
        s.counts.knowledge = Object.keys(s.knowledge.cities).length;
      }
    }
  },

  /** Who counts as one of a city's people: a named person standing in it who holds a conversation (not a shop's
   *  counter, a god, a priest, a guard, a companion or the crew). The six talking cities, placed as town talk places them. */
  _dsCountsAsPerson(n) {
    return !!(n && n.name && n.sprite && !n.interior && !n.shopId && !n.isGod && !n.isPriest && !n.priest
      && !n.guard && !n.gateGuard && !n.isGuard && !n.party && !n.banditFolk && !n.banditCity && !n.survivor && !n.jailer);
  },
  _dsCityPeople() {
    const out = {};
    if (!this._ttCityOf) return out;
    for (const n of (this.npcs || [])) {
      if (!this._dsCountsAsPerson(n)) continue;
      const city = this._ttCityOf(n);
      if (!city) continue;
      const k = this._dsPersonKey(n);
      if (k) (out[city] = out[city] || []).push(k);
    }
    return out;
  },

  /** From `_renderTalk`: the topics this page shows, remembered against the person. */
  _dsTalkShown(npc, options) {
    if (!this._dsCountsAsPerson(npc)) return;
    const key = this._dsPersonKey(npc);
    const s = this._dsState();
    if (!key || s.knowledge.heard[key]) return;
    const a = (s.knowledge.asked = s.knowledge.asked || {})[key] = s.knowledge.asked[key] || { shown: [], asked: [] };
    for (const o of (options || [])) if (o && o.id && !o.bye && !o.back && !a.shown.includes(o.id)) a.shown.push(o.id);
    this._dsTalkCheck(npc, key, a);
  },
  /** From `_chooseTopic`: a topic asked. */
  _dsTalkAsked(npc, id) {
    if (!this._dsCountsAsPerson(npc) || !id) return;
    const key = this._dsPersonKey(npc);
    const s = this._dsState();
    if (!key || s.knowledge.heard[key]) return;
    const a = (s.knowledge.asked = s.knowledge.asked || {})[key] = s.knowledge.asked[key] || { shown: [], asked: [] };
    if (!a.asked.includes(id)) a.asked.push(id);
  },
  /** Heard out: every topic they have ever offered has been asked (opening a topic offers what is under it). */
  _dsTalkCheck(npc, key, a) {
    if (!a.shown.length) return;
    if (a.shown.every(id => a.asked.includes(id))) {
      delete this._dsState().knowledge.asked[key];
      this._dsHeardOut(npc);
    }
  },

  /** For the notes and tests: each city's share heard out. */
  _dsKnowledgeReport() {
    const s = this._dsState();
    const out = {};
    const byCity = this._dsCityPeople ? this._dsCityPeople() : {};
    for (const [city, people] of Object.entries(byCity)) out[city] = { people: people.length, share: heardShare(people, s.knowledge.heard) };
    return out;
  },
};
