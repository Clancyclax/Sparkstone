// ===========================================================================
// ROUND 425 -- CRIME: THE WORLD SIDE. The rules are src/data/crime.js; this is where they meet doors, beds, guards and
// shops. Every hook into the rest of the scene is one guarded line at its site (`if (this._crimeX) ...`):
//
//   _useDoorway          -> _crimeDoorGate(d)      a house or an estate is locked 22:00-06:00: pick, force or leave
//   _updateNpcProximity  -> _updateStashProximity  a nightstand, a sideboard, a strongbox within reach: nearStash
//   E                    -> _openStash             the "owned object" question, then the theft
//   the update loop      -> _crimeTick(dt)         residents waking and shouting, the estate's guard, responders
//   _lawHuntsHere        -> _crimeWantedHere       wanted in this region: the watch comes for you
//   _guardHitsPlayer     -> _crimeArrestMode       ...and comes to ARREST you, unless you resist or it is an estate
//   _sellItem            -> _crimeSellGate         honest shops refuse stolen goods; a fence pays half
//   _renderInventory     -> _crimeStolenQty        stolen goods are listed in red
//   the gaoler           -> _crimeJailerTalk       pay the fine, serve the time, or (with picks) slip out
//
// WHAT IS SAVED is `player.crime` (crime.js crimeOf): what is stolen, notoriety by region, who wants you and for how
// much, which containers were searched and which doors forced (by day), the "don't ask again" box, the gaol term.
// ===========================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL, NPC_INTERACT_RADIUS } from '../data/npcs.js';
import { RANK_ORDER } from '../data/ranks.js';
import { REGIONS } from '../data/regions.js';
import { GUARDS } from '../data/guards.js';
import { hunterStats, hunterRankIdx, hunterName, HUNTER_MODELS } from '../data/hunters.js';
import { homeKey } from '../data/homes.js';
import { JAIL_ROOM } from '../data/interiors.js';
import { grantLootToPlayer } from '../data/loot.js';
import { grantCoins, spendCoins, coinPurseValue, CONSUMABLE_LOOT_IDS, PART_DEFS } from '../data/inventory.js';
import { STOCK_DEFS } from '../data/crafting.js';
import { rollGearItem, rollWeaponItem } from '../data/stats.js';
import { rollStoneDrop } from '../data/stoneCatalog.js';
import { rollEssenceDrop } from '../data/essenceCatalog.js';
import { hasCraft, bookById } from '../data/skillBooks.js';
import { fameTier } from '../data/cityLife.js';
import { FURN_BY_KEY } from '../data/furniture.js';
import { SMALL_PROPS, SMALL_PROP_CELL, SMALL_PROP_COLS } from '../data/interiors422.js';
import {
  crimeOf, isLockedHour, tooAfraidToReport, welcomeToTake, wakeChance, SEEN_WHILE_VEILED, pickChance, canForce,
  UPSET_GRACE_S, RESIDENT_LINES, fineFor, sentenceHours, NOTORIETY, RESPONDERS, RESPONDER_SEARCH_S, RESTOCK_DAYS,
  FENCE_SHOPS, FENCE_CUT, VENDOR_REFUSALS, STASH_PROPS, STRONGBOXES, STAND_LABEL, stashRoll,
  HOUSE_GOODS, COIN_PROPS, goodForProp, DRAWER_GOODS, CHEST_GOODS, WANTED_DAYS,
} from '../data/crime.js';

const CLOCK_PER_HOUR = 25;          // _clockT runs 600 a day
const pick = (a) => a[Math.floor(Math.random() * a.length) % a.length];
const fmtCoin = (v) => {
  const iron = Math.floor(v / 100), n = v % 100;
  return iron && n ? `${iron} iron, ${n} copper` : iron ? `${iron} iron` : `${n} copper`;
};

export const CrimeMixin = {
  _crime() { return crimeOf(this.player); },
  _crimeHour() { return this._clHour ? this._clHour() : (Number.isFinite(this._gameHours) ? this._gameHours : 12); },
  _crimeRegion() { return this.currentRegion ? this.currentRegion.id : (this._crimeLastRegion || 'nek'); },
  _crimeDay() { return this._dayIndex ? this._dayIndex() : 0; },

  /** The settlement a building stands in (its record), or the one the player is in. */
  _crimeSettlement(b) {
    const id = b && b.settlement;
    if (id) for (const r of REGIONS) for (const st of (r.settlements || [])) if (st.id === id) return st;
    // indoors, the town is the one outside the door you came in by
    const at = this._insideRoom ? (this._lastOutdoorPos || this.world) : this.world;
    try { return this._settlementAt ? this._settlementAt(at.x, at.y) : null; } catch (e) { return null; }
  },
  /** A place with a watch: a city or a town. A village calls its neighbours, not the guard. */
  _crimeHasWatch(st) { return !!(st && (st.kind === 'city' || st.kind === 'town')); },

  // ============================================================== doors
  /** True when the door may be used now. A residential house (or an estate) is locked through the night. */
  _crimeDoorGate(d) {
    if (!d || d.kind !== 'enter' || this._crimeBypass) return true;
    const b = d.building;
    const estate = !!d.mansion;
    const house = !!(d.generic && b && this._h421Wants && this._h421Wants(b));
    if (!estate && !house) return true;
    if (house && this._homeHeld && this._homeHeld(b)) return true;                     // your own house
    if (house && (this._homeSigns || []).some(s => s.b === b)) return true;            // empty, for sale or rent
    if (!isLockedHour(this._crimeHour())) { this._crimeEntry = null; return true; }
    const key = estate ? `estate:${d.mansion}` : homeKey(b);
    const C = this._crime();
    if (C.forced[key] === this._crimeDay()) { this._crimeEntry = { key, estate, how: 'again', b }; return true; }
    this._crimePendingDoor = d;
    const choices = [];
    if (hasCraft(this.player, 'lockpicking')) choices.push({ act: 'crime|pick', label: 'Pick the lock' });
    if (canForce(this.player.rank)) choices.push({ act: 'crime|force', label: 'Force the door' });
    choices.push({ act: 'crime|leave', label: 'Leave it' });
    const who = estate ? 'The estate' : 'The door';
    const text = estate
      ? 'The great doors are barred for the night. Somewhere inside, a dog barks once and goes quiet.'
      : 'The door is locked for the night. The house is dark; whoever lives here is asleep.';
    const extra = (!hasCraft(this.player, 'lockpicking') ? '\n\n(You do not know how to pick a lock.)' : '')
      + (!canForce(this.player.rank) ? '\n(It would take an iron-ranked body to force it.)' : '');
    this._openDialogue(who, text + extra, null, choices);
    return false;
  },

  /** The dialogue buttons of this mixin ('crime|...'). */
  _crimeAct(act) {
    const C = this._crime();
    const d = this._crimePendingDoor;
    if (act === 'crime|leave') { this._crimePendingDoor = null; return; }
    if (act === 'crime|pick' || act === 'crime|force') {
      if (!d) return;
      const estate = !!d.mansion;
      const key = estate ? `estate:${d.mansion}` : homeKey(d.building);
      if (act === 'crime|pick') {
        if (Math.random() > pickChance(this.player.rank)) {
          this._floatText(this.world.x, this.world.y - 50, 'The pick slips. Something inside shifts in its sleep.', '#ffcc80');
          this._crimeOutsideNoise('pickFail', d);
          return;
        }
        this._floatText(this.world.x, this.world.y - 50, '*click*', '#c5e1a5');
      } else {
        this._floatText(this.world.x, this.world.y - 50, 'The door gives with a crack.', '#ffab91');
        if (this._crimeOutsideNoise('force', d)) return;   // seen doing it: the watch is called, and you are not inside
      }
      C.forced[key] = this._crimeDay();
      this._crimeEntry = { key, estate, how: act === 'crime|pick' ? 'pick' : 'force', b: d.building };
      this._crimePendingDoor = null;
      this._crimeBypass = true;
      try { this._useDoorway(d); } finally { this._crimeBypass = false; }
      this._crimeOnEntered();
      return;
    }
    if (act === 'crime|payfine') return this._crimePayFine();
    if (act === 'crime|jail') return this._crimeJail();
    if (act === 'crime|resist') return this._crimeResist();
    if (act === 'crime|jailpay') return this._crimeJailPay();
    if (act === 'crime|serve') return this._crimeServe();
    if (act === 'crime|escape') return this._crimeEscape();
  },

  /** Forcing or fumbling at a door outside: who heard? Returns true when the watch was called on the spot. */
  _crimeOutsideNoise(act, d) {
    const reach = (act === 'force' ? 11 : 5) * TILE;
    const stealthed = this._isStealthed && this._isStealthed();
    const aggro = this._playerAggroMult ? this._playerAggroMult() : 1;
    // a guard posted within earshot hears it outright
    const guard = (this.guards || []).find(g => g.state !== 'downed' && Math.hypot(g.x - this.world.x, g.y - this.world.y) < reach * 1.3);
    if (guard && (!stealthed || Math.random() < SEEN_WHILE_VEILED)) {
      this._floatText(guard.x, guard.y - 48, 'Hey! What do you think you\'re doing?', '#90caf9');
      this._crimeCaught(d.mansion ? 'estate' : 'force', guard, { outside: true, b: d.building });
      return true;
    }
    // folk still about in the night
    const folk = (this.townFolk || []).find(f => f && f.sprite && f.sprite.visible !== false
      && Math.hypot(f.x - this.world.x, f.y - this.world.y) < reach);
    if (folk && Math.random() < wakeChance(act, stealthed, aggro) + 0.3) {
      this._crimeCaught(d.mansion ? 'estate' : 'force', folk, { outside: true, b: d.building });
      return true;
    }
    return false;
  },

  /** Just through a picked or forced door: the noise reaches the sleepers in this room. */
  _crimeOnEntered() {
    const room = this._insideRoom, E = this._crimeEntry;
    if (!room || !E) return;
    E.room = room.id;
    E.t = 0;
    const act = E.how === 'force' ? 'force' : 'pick';
    this._crimeNoise(room, act);
  },

  /** The residents of a room (posed or standing), awake or not. */
  _crimeResidents(room) {
    if (!room) return [];
    return (this.npcs || []).filter(n => n && !n.hidden && (n.interior === room.id || n.clCrew === room.id || n.mansionRoom === room.id)
      && (n.cityLife === 'resident' || n.resident) && !n.guard);
  },

  /** A noise in a room: each sleeper may wake. Returns the woken. */
  _crimeNoise(room, act) {
    const stealthed = this._isStealthed && this._isStealthed();
    const aggro = this._playerAggroMult ? this._playerAggroMult() : 1;
    const woke = [];
    for (const n of this._crimeResidents(room)) {
      if (!n.asleep) continue;
      if (Math.random() < wakeChance(act, stealthed, aggro)) {
        n.asleep = false; n.crimeWoke = true; woke.push(n);
        if (this._sayOverhead) this._sayOverhead(n, 'Hm? Who\'s there?', '#ffe0b2', 2.4);
      }
    }
    return woke;
  },

  // ============================================================== stashes
  /** The containers within reach in a house or an estate room: nearStash. */
  _updateStashProximity() {
    this.nearStash = null;
    const room = this._insideRoom;
    if (!room || !this._h422RoomSprites) return;
    const estate = String(room.id || '').startsWith('mansion_');
    const b = room._forBuilding;
    const house = !!(b && this._h421Wants && this._h421Wants(b));
    if (!estate && !house) return;
    if (house && this._homeHeld && this._homeHeld(b)) return;   // your own things
    if (house && room._clEmpty) return;
    const C = this._crime(), day = this._crimeDay();
    let best = null, bd = NPC_INTERACT_RADIUS + 8;
    for (const s of this._h422RoomSprites(room)) {
      const w = s._fogWorld;
      if (!w && !s._smallProp) continue;
      let label = null, strongbox = false, kind = null, good = null;
      if (s._smallProp) {
        // ROUND 425 -- the objects themselves: a book, a key ring, a pocket watch on the table
        good = goodForProp(s._smallProp);
        if (!good) continue;
        const pos = s._smallWorld;
        if (!pos) continue;
        const owner0 = estate ? `estate:${room.id}` : `${homeKey(b)}|${(room._h422Ctx && room._h422Ctx.level) || 0}`;
        const key0 = `${owner0}|o|${s._smallProp}|${Math.round(pos.x - room.x)}|${Math.round(pos.y - room.y)}`;
        const last0 = C.searched[key0];
        if (Number.isFinite(last0) && day - last0 < RESTOCK_DAYS) { if (s.visible) s.setVisible(false); continue; }
        if (!s.visible) continue;
        // a thing on a table is reached across the table (a little further), and wins over the furniture it stands on
        const d0 = Math.hypot(pos.x - this.world.x, pos.y - this.world.y) - 18;
        if (d0 > bd) continue;
        bd = d0;
        const nm = good === 'coin' ? 'coin' : HOUSE_GOODS[good].name.toLowerCase();
        best = { key: key0, label: good === 'coin' ? 'the coins' : `the ${nm}`, kind: 'object', prop: s._smallProp, good, object: true,
          strongbox: false, estate, b, room, x: pos.x, y: pos.y, sprite: s, klass: 'modest' };
        continue;
      }
      if (s._furn !== undefined && s._furn !== null) {
        const m = FURN_BY_KEY[s._furn];
        if (m && m.kind === 'stand') { label = STAND_LABEL; kind = 'stand'; }
      } else if (s._propKey && STASH_PROPS[s._propKey]) { label = STASH_PROPS[s._propKey]; kind = s._propKey; strongbox = STRONGBOXES.has(s._propKey); }
      if (!label) continue;
      const d = Math.hypot(w.x - this.world.x, w.y - this.world.y);
      if (d > bd) continue;
      const owner = estate ? `estate:${room.id}` : `${homeKey(b)}|${(room._h422Ctx && room._h422Ctx.level) || 0}`;
      const key = `${owner}|${Math.round(w.x - room.x)}|${Math.round(w.y - room.y)}`;
      const last = C.searched[key];
      if (Number.isFinite(last) && day - last < RESTOCK_DAYS) continue;
      bd = d;
      best = { key, label, kind, strongbox, estate, b, room, x: w.x, y: w.y, sprite: s,
        klass: !estate && this._h421Context ? (this._h421Context(b).klass || 'modest') : 'well' };
    }
    this.nearStash = best;
  },

  /** E at a container: the question first (unless the box was ticked). */
  _openStash(st) {
    if (!st) return;
    const C = this._crime();
    if (C.noAsk) { this._crimeSteal(st); return; }
    this._crimeAskFor = st;
    const el = document.getElementById('crimeAsk');
    if (!el) { this._crimeSteal(st); return; }
    const Label = `${st.label.charAt(0).toUpperCase()}${st.label.slice(1)}`;
    document.getElementById('crimeAskTitle').textContent = st.object ? 'This is an owned object.' : 'These are owned things.';
    document.getElementById('crimeAskText').textContent = (st.object ? `${Label} belong${st.good === 'coin' ? '' : 's'} to someone. Would you like to steal ${st.good === 'coin' ? 'them' : 'it'}?`
      : `${Label} holds someone's belongings. Would you like to steal what is inside?`)
      + (st.strongbox && !hasCraft(this.player, 'lockpicking') ? ' It is locked: you would have to prise it open, and that is not quiet.' : '');
    document.getElementById('crimeAskNoMore').checked = false;
    el.style.display = 'block';
    this._crimeAskOpen = true;
    // a pad walks it like any panel (WorldScene `_openOverlayEl` lists it first): Steal is focused, X takes it
    try { document.getElementById('crimeAskYes').focus(); } catch (e) { /* no focus in a headless page */ }
    if (!this._crimeAskWired) {
      this._crimeAskWired = true;
      const done = (yes) => {
        if (!this._crimeAskOpen) return;
        el.style.display = 'none';
        this._crimeAskOpen = false;
        if (document.getElementById('crimeAskNoMore').checked) this._crime().noAsk = true;
        const s = this._crimeAskFor; this._crimeAskFor = null;
        this._crimeAskCloseT = this.time ? this.time.now : 0;
        if (yes && s) this._crimeSteal(s);
      };
      document.getElementById('crimeAskYes').addEventListener('click', () => done(true));
      document.getElementById('crimeAskNo').addEventListener('click', () => done(false));
      window.addEventListener('keydown', (ev) => {
        if (!this._crimeAskOpen) return;
        if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); done(false); }
        else if (ev.key === 'e' || ev.key === 'E' || ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); done(true); }
      }, true);
      this._crimeAskDone = done;
    }
  },

  /** What a container gives, granted and (unless given freely) marked stolen. Then: was it seen? */
  _crimeSteal(st) {
    const p = this.player, C = this._crime(), room = st.room;
    const welcomed = !!(room && room._crimeWelcome);
    if (st.object) return this._crimeTakeObject(st, welcomed);
    const quiet = !st.strongbox || hasCraft(p, 'lockpicking');
    const ids = {
      consumables: CONSUMABLE_LOOT_IDS, stock: Object.keys(STOCK_DEFS || {}).filter(k => /_0$|_1$/.test(k)),
      parts: Object.values(PART_DEFS).map(d => d && d.id).filter(Boolean), stones: null, essences: null,
    };
    const got = stashRoll(st.estate ? 'estate' : 'house', st.klass, st.strongbox, Math.random, {
      ...ids, stones: { length: 1, 0: null }, essences: { length: 1, 0: null },
      goods: st.kind === 'stand' || st.kind === 'writingDesk' || st.strongbox ? DRAWER_GOODS : CHEST_GOODS,
    });
    const standing = this._dropStanding ? this._dropStanding(null) : { rank: 'iron', level: 0 };
    const names = [];
    let value = 0;
    const mark = (k) => { if (!welcomed) C.stolen[k] = (C.stolen[k] || 0) + 1; };
    for (const g of got) {
      if (g.kind === 'coin') { grantCoins(p.coins, 'normal', g.coin); value += g.coin; names.push(fmtCoin(g.coin)); continue; }
      if (g.kind === 'stone') { const id = rollStoneDrop(Math.random); if (id && grantLootToPlayer(p, { kind: 'stone', id })) { mark(`stone:${id}`); names.push('an awakening stone'); value += 1500; } continue; }
      if (g.kind === 'essence') { const id = rollEssenceDrop(Math.random); if (id && grantLootToPlayer(p, { kind: 'essence', id })) { mark(`essence:${id}`); names.push('an essence'); value += 3000; } continue; }
      if (g.kind === 'gear') {
        const slot = g.trinket ? (Math.random() < 0.5 ? 'ring' : 'amulet') : null;
        const item = rollGearItem(Math.random, slot, null, st.estate ? this._crimeUpRank(standing.rank) : standing.rank, standing.level);
        if (!item) continue;
        if (!welcomed) item.stolen = { day: this._crimeDay(), region: this._crimeRegion() };
        grantLootToPlayer(p, { kind: 'gear', item });
        names.push(item.name); value += 800;
        continue;
      }
      if (g.kind === 'weapon') {
        const rec = rollWeaponItem(Math.random, null, null, this._crimeUpRank(standing.rank), standing.level, { existing: p.craftedWeapons || null });
        if (!rec) continue;
        grantLootToPlayer(p, { kind: 'weapon', id: rec.wid, rec });
        mark(`weapon:${rec.wid}`); names.push(rec.name || 'a weapon'); value += 1200;
        continue;
      }
      if (g.kind === 'goods' && HOUSE_GOODS[g.id]) { this._crimeGoodsBag().push(g.id); mark(`goods:${g.id}`); names.push(HOUSE_GOODS[g.id].name); value += HOUSE_GOODS[g.id].value; continue; }
      if (g.id && grantLootToPlayer(p, { kind: g.kind, id: g.id })) { mark(`${g.kind}:${g.id}`); names.push(this._crimeItemName(g.kind, g.id)); value += 60; }
    }
    C.searched[st.key] = this._crimeDay();
    if (!welcomed) C.thefts += 1;
    this._floatText(st.x, st.y - 40, names.length ? `${welcomed ? 'Given' : 'Taken'}: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}` : 'Nothing worth taking.', welcomed ? '#c5e1a5' : '#ef9a9a');
    if (this._updateHud) this._updateHud();
    if (welcomed) return;
    // Who saw, who woke?
    this._crimeNoise(room, quiet ? 'steal' : 'strongbox');
    const stealthed = this._isStealthed && this._isStealthed();
    const seer = this._crimeResidents(room).find(n => !n.asleep && (!stealthed || Math.random() < SEEN_WHILE_VEILED));
    if (seer) this._crimeCaught(st.estate ? 'estate' : 'theft', seer, { value, b: st.b });
  },

  /** The graver of two charges (a theft is not downgraded to trespass by the shout that follows it). */
  _crimeWorse(a, b) {
    const order = ['trespass', 'breaking in', 'theft', 'resisting arrest', 'breaking out of the gaol', 'freeing prisoners', 'arson'];   // ROUND 428
    return order.indexOf(a) > order.indexOf(b) ? a : b;
  },
  /** The bag of carried goods (books, rings, keys, tools...): inventory.goods, made on first use. */
  _crimeGoodsBag() {
    const inv = this.player.inventory;
    if (!Array.isArray(inv.goods)) inv.goods = [];
    return inv.goods;
  },

  /** One object off a table: into the bag (or the purse), gone from the room until it is restocked. */
  _crimeTakeObject(st, welcomed) {
    const p = this.player, C = this._crime(), room = st.room;
    let value = 0, name;
    if (st.good === 'coin') {
      const [lo, hi] = COIN_PROPS[st.prop] || [20, 80];
      value = Math.round(lo + Math.random() * (hi - lo));
      grantCoins(p.coins, 'normal', value);
      name = fmtCoin(value);
    } else {
      const G = HOUSE_GOODS[st.good];
      this._crimeGoodsBag().push(st.good);
      if (!welcomed) C.stolen[`goods:${st.good}`] = (C.stolen[`goods:${st.good}`] || 0) + 1;
      value = G.value; name = G.name;
    }
    if (st.sprite && st.sprite.scene) st.sprite.setVisible(false);
    C.searched[st.key] = this._crimeDay();
    if (!welcomed) C.thefts += 1;
    this._floatText(st.x, st.y - 30, `${welcomed ? 'Given' : 'Taken'}: ${name}`, welcomed ? '#c5e1a5' : '#ef9a9a');
    if (this._updateHud) this._updateHud();
    if (welcomed) return;
    this._crimeNoise(room, 'steal');
    const stealthed = this._isStealthed && this._isStealthed();
    const seer = this._crimeResidents(room).find(n => !n.asleep && (!stealthed || Math.random() < SEEN_WHILE_VEILED));
    if (seer) this._crimeCaught(st.estate ? 'estate' : 'theft', seer, { value, b: st.b });
  },

  _crimeUpRank(rank) {
    const i = RANK_ORDER.indexOf(rank || 'iron');
    return RANK_ORDER[Math.min(RANK_ORDER.indexOf('gold'), Math.max(1, i + 1))];
  },
  _crimeItemName(kind, id) {
    if (kind === 'consumable') return 'a provision';
    if (kind === 'part') { const d = Object.values(PART_DEFS).find(x => x && x.id === id); return (d && d.name) || 'a curio'; }
    if (kind === 'stock') return (STOCK_DEFS && STOCK_DEFS[id] && STOCK_DEFS[id].name) || 'some stock';
    return id;
  },

  // ============================================================== being seen
  /**
   * Somebody saw. What happens is theirs to decide: an estate's people raise the house; a known hero is told to take
   * what they need; the frightened keep quiet; everyone else calls the watch.
   */
  _crimeCaught(kind, who, o = {}) {
    const C = this._crime(), rid = this._crimeRegion();
    const room = this._insideRoom;
    const say = (line, color) => { if (who && this._sayOverhead) this._sayOverhead(who, line, color, 4.5); else this._floatText(this.world.x, this.world.y - 60, line, color); };
    if (kind === 'estate') {
      say(pick(RESIDENT_LINES.estate), '#ef5350');
      C.notoriety[rid] = (C.notoriety[rid] || 0) + NOTORIETY.estate;
      const st = this._crimeSettlement(o.b);
      C.wanted[rid] = { settlement: st ? st.id : null, name: st ? st.name : null, fine: fineFor('estate', rid, o.value || 0),
        lethal: true, estate: true, day: this._crimeDay(), reason: 'robbing an estate' };
      if (room && String(room.id).startsWith('mansion_')) this._estateAlarm = { t: 2.2, hitT: 0, guard: null };
      else this._crimeEstateRetainers();
      this._floatText(this.world.x, this.world.y - 70, 'The household raises the alarm. Its guards do not take prisoners.', '#ef5350');
      return 'estate';
    }
    const fame = this._clFame ? this._clFame() : fameTier(this.player.rank, null);
    if (kind === 'theft' && welcomeToTake(fame, C.notoriety[rid] || 0)) {
      say(pick(RESIDENT_LINES.welcome), '#c5e1a5');
      if (room) room._crimeWelcome = true;
      // what was just taken is theirs to give: not stolen
      this._crimeForgiveLast();
      return 'welcome';
    }
    if (tooAfraidToReport(this.player, rid)) {
      say(pick(RESIDENT_LINES.afraid), '#ffe0b2');
      C.notoriety[rid] = (C.notoriety[rid] || 0) + NOTORIETY.feared;
      return 'afraid';
    }
    say(pick(RESIDENT_LINES.guards), '#ef9a9a');
    this._crimeReport(kind, o);
    return 'report';
  },

  /** A theft forgiven on the spot: the last container's take is clean (the gear's flag, the counts it added). */
  _crimeForgiveLast() {
    const C = this._crime();
    for (const g of (this.player.inventory.gearItems || [])) if (g.stolen && g.stolen.day === this._crimeDay()) delete g.stolen;
    C.thefts = Math.max(0, C.thefts - 1);
  },

  /** The watch is called: wanted in this region, the fine set, and (where there is a watch) guards on the way. */
  _crimeReport(kind, o = {}) {
    const C = this._crime(), rid = this._crimeRegion();
    C.notoriety[rid] = (C.notoriety[rid] || 0) + (NOTORIETY[kind] || 1);
    const st = this._crimeSettlement(o.b);
    if (!this._crimeHasWatch(st)) {
      this._floatText(this.world.x, this.world.y - 70, st ? `There is no watch in ${st.name}, but they will remember your face.` : 'Nobody comes. But they will remember your face.', '#ffcc80');
      return;
    }
    const prev = C.wanted[rid];
    const fine = (prev && !prev.estate ? prev.fine : 0) + fineFor(kind, rid, o.value || 0);
    C.wanted[rid] = { settlement: st.id, name: st.name, fine, lethal: !!(prev && prev.lethal), estate: !!(prev && prev.estate),
      day: this._crimeDay(), reason: this._crimeWorse(prev && prev.reason, kind === 'theft' ? 'theft' : kind === 'force' ? 'breaking in' : kind === 'arson' ? 'arson' : kind === 'breakout' ? 'freeing prisoners' : 'trespass'), resisting: false };
    this._floatText(this.world.x, this.world.y - 70, `The ${st.name} watch has been called. Fine: ${fmtCoin(fine)}.`, '#ef9a9a');
    if (this._insideRoom) this._crimeRespondOnExit = true; else this._crimeSpawnResponders();
  },

  // ============================================================== the tick
  _crimeTick(dt) {
    const room = this._insideRoom;
    // ROUND 425 -- an estate's rooms get the things a well-off house sets out (a watch on the nightstand, a goblet on
    // the sideboard): round 422's tabletop pass, run for the room the player is in, once per visit.
    if (room && room !== this._crimeTopsRoom && String(room.id).startsWith('mansion_') && this._h422Tabletops) {
      this._crimeTopsRoom = room;
      if (!this._h422RoomSprites(room).some(s => s._smallProp)) {
        room._h422Lights = room._h422Lights || [];
        try { this._h422Tabletops(room, { key: `${room.id}|${room._mansionKey || ''}`, klass: 'well', culture: 'town', hour: this._crimeHour() }); } catch (e) { /* dressing is a nicety */ }
      }
    }
    if (!room) this._crimeTopsRoom = null;
    // leaving: responders who were called while you were inside are waiting
    if (!room && this._crimeRespondOnExit) { this._crimeRespondOnExit = false; this._crimeSpawnResponders(); }
    if (!room && this._estateRetainersDue) { this._estateRetainersDue = false; this._crimeEstateRetainers(); }
    if (this.currentRegion) this._crimeLastRegion = this.currentRegion.id;
    // a resident awake in a house you came into at night: told to leave, then the watch
    const E = this._crimeEntry;
    if (room && E && E.room === room.id && isLockedHour(this._crimeHour())) {
      E.t = (E.t || 0) + dt;
      const awake = this._crimeResidents(room).filter(n => !n.asleep);
      const stealthed = this._isStealthed && this._isStealthed();
      if (awake.length && !stealthed) {
        if (!E.warned) {
          E.warned = E.t;
          const n = awake[0];
          if (E.estate) this._crimeCaught('estate', n, { b: E.b });
          else if (this._sayOverhead) this._sayOverhead(n, pick(RESIDENT_LINES.upset), '#ffcc80', 4);
        } else if (!E.reported && !E.estate && E.t - E.warned > UPSET_GRACE_S) {
          E.reported = true;
          this._crimeCaught('trespass', awake[0], { b: E.b });
        }
      }
    }
    if (room && E && E.room && E.room !== room.id && !String(room.id).startsWith('mansion_')) this._crimeEntry = null;
    this._crimeEstateTick(dt);
    this._crimeRespondersTick(dt);
    // a warrant lapses after WANTED_DAYS: the watch has other work
    const C = this._crime(), day = this._crimeDay();
    for (const [rid, w] of Object.entries(C.wanted)) if (w && Number.isFinite(w.day) && day - w.day >= WANTED_DAYS && !w.resisting) delete C.wanted[rid];
  },

  // ============================================================== the estate's guards
  _crimeEstateTick(dt) {
    // dead is paid in full: the house has its blood, and its retainers stand down
    if (this.player.dead) {
      const C = this._crime();
      for (const [rid, w] of Object.entries(C.wanted)) if (w && w.estate) delete C.wanted[rid];
      if (this._estateAlarm && this._estateAlarm.guard && this._estateAlarm.guard.sprite) this._estateAlarm.guard.sprite.destroy();
      this._estateAlarm = null; this._estateRetainersDue = false;
      return;
    }
    const A = this._estateAlarm;
    if (!A) return;
    const room = this._insideRoom;
    const inEstate = room && String(room.id).startsWith('mansion_');
    if (!inEstate) {
      if (A.guard) { if (A.guard.sprite) A.guard.sprite.destroy(); A.guard = null; }
      this._estateAlarm = null;
      this._estateRetainersDue = true;
      return;
    }
    if (!A.guard) {
      A.t -= dt;
      if (A.t > 0) return;
      // the household guard comes through the room's way in
      const at = { x: room.x + (room.w * TILE) / 2, y: room.y + (room.h - 1.2) * TILE };
      A.guard = this._crimeMakePerson('npc_city_guard', at.x, at.y, 'House Guard');
      if (A.guard) this._floatText(at.x, at.y - 50, 'Halt, thief!', '#ef5350');
      return;
    }
    const g = A.guard;
    const dx = this.world.x - g.x, dy = this.world.y - g.y, d = Math.hypot(dx, dy) || 1;
    const ri = Math.min(RANK_ORDER.indexOf('gold'), hunterRankIdx(this._crimeRegion()) + 1);
    const st = hunterStats(ri, true);
    if (d > 30) {
      const step = Math.min(d - 24, st.speed * 1.05 * dt);
      g.x += (dx / d) * step; g.y += (dy / d) * step;
      const p = isoProject(g.x, g.y);
      g.sprite.setPosition(p.x, p.y).setDepth(isoDepth(g.x, g.y));
      if (this._npcWalkFrame) this._npcWalkFrame(g, g.artKey, facingFromMove(dx, dy) || 'south', true, dt);
    } else {
      if (this._npcWalkFrame) this._npcWalkFrame(g, g.artKey, facingFromMove(dx, dy) || 'south', false, dt);
      A.hitT -= dt;
      if (A.hitT <= 0) {
        A.hitT = 1.1;
        this._monsterHitPlayer(this._personFace(g, 'guard'), Math.round(st.dmg * 1.5), false);
      }
    }
  },

  /** A plain person sprite for this mixin's own walkers (the house guard indoors). */
  _crimeMakePerson(key, x, y, name) {
    if (!this.textures.exists(key)) return null;
    const art = NPC_ART[key] || { footX: 32, footY: 63, scale: 1 };
    const p = isoProject(x, y);
    const sprite = this.add.sprite(p.x, p.y, key, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale(art.scale || 1);
    sprite.setDepth(isoDepth(x, y));
    return { name, sprite, artKey: key, texKey: key, which: 0, x, y, alive: true, hp: 999, maxHp: 999 };
  },

  /** "Estates send adventurers, possibly a rank above the region, instead of guards." Outdoors, after an estate job. */
  _crimeEstateRetainers() {
    const rid = this._crimeRegion();
    const ri = Math.min(RANK_ORDER.indexOf('gold'), hunterRankIdx(rid) + 1);
    const made = [];
    for (let i = 0; i < 3; i++) {
      const th = Math.random() * Math.PI * 2;
      const x = this.world.x + Math.cos(th) * 16 * TILE, y = this.world.y + Math.sin(th) * 16 * TILE;
      const key = HUNTER_MODELS[i % HUNTER_MODELS.length];
      const c0 = this._crimeMakePerson(key, x, y, '');
      if (!c0) continue;
      const st = hunterStats(ri, i === 0);
      const c = { ...c0, uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1, hunter: true, estateRetainer: true,
        party: `estate${this._crimeDay()}`, lead: i === 0, name: `${hunterName(this._crimeDay() * 5 + i * 11)}, house retainer (${RANK_ORDER[ri]})`,
        tier: ri, rank: RANK_ORDER[ri], rankLevel: 5, hp: st.hp, maxHp: st.hp, damage: st.dmg, speed: st.speed, hostile: true, swingT: 0.8 };
      (this._banditFolk = this._banditFolk || []).push(c);
      made.push(c);
    }
    if (made.length) this._floatText(this.world.x, this.world.y - 64, `The house has sent ${made.length} retainers after you: ${RANK_ORDER[ri]}-ranked, and paid to kill.`, '#ef5350');
    return made;
  },

  // ============================================================== the watch
  _crimeWantedHere() {
    const rid = this.currentRegion && this.currentRegion.id;
    if (!rid) return false;
    const w = this._crime().wanted[rid];
    return !!(w && !w.estate && !this._insideRoom);
  },
  /** The watch comes to arrest, not to kill -- unless you have resisted, or the law already hunts you anyway. */
  _crimeArrestMode() {
    if (!this._crimeWantedHere()) return false;
    const w = this._crime().wanted[this.currentRegion.id];
    if (!w || w.resisting) return false;
    if (this._societyHunting && this._societyHunting()) return false;
    if (this._outlawIn && this._outlawIn(this.currentRegion.id)) return false;
    return true;
  },

  /** Two of the watch where the player is (a city or a town), searching for a while before going back. */
  _crimeSpawnResponders() {
    if (!this._makeGuard || !this.guards) return;
    this._crimeClearResponders();
    const made = [];
    for (let i = 0; i < RESPONDERS; i++) {
      const def = GUARDS[(i + 1) % GUARDS.length];
      let x = this.world.x, y = this.world.y;
      for (let a = 0; a < 12; a++) {
        const th = Math.random() * Math.PI * 2, r = (9 + i * 2) * TILE;
        x = this.world.x + Math.cos(th) * r; y = this.world.y + Math.sin(th) * r;
        if (!this._collidesObstacle || !this._collidesObstacle(x, y, 14)) break;
      }
      const st = this._crimeSettlement(null);
      const g = this._makeGuard({ ...def, name: `${(st && st.name) || 'Town'} Watch`, dialogue: 'You\'re under arrest. Come quietly.' }, x, y,
        { post: { x, y }, aggroTiles: 40, responder: true });
      g.responderT = RESPONDER_SEARCH_S;
      this.guards.push(g);
      made.push(g);
    }
    this._crimeResponders = made;
    if (made.length) this._floatText(made[0].x, made[0].y - 48, 'There! Stop, thief!', '#90caf9');
  },
  _crimeRespondersTick(dt) {
    const R = this._crimeResponders;
    if (!R || !R.length) return;
    for (const g of R) g.responderT -= dt;
    if (R.every(g => g.responderT <= 0) || !this._crimeWantedHere()) {
      if (!this._crimeWantedHere() || R.every(g => Math.hypot(g.x - this.world.x, g.y - this.world.y) > 20 * TILE)) {
        if (this._crimeWantedHere()) this._floatText(this.world.x, this.world.y - 60, 'The watch has lost you, for now.', '#90caf9');
        this._crimeClearResponders();
      }
    }
  },
  _crimeClearResponders() {
    for (const g of (this._crimeResponders || [])) {
      if (g.sprite) g.sprite.destroy();
      this.guards = (this.guards || []).filter(x => x !== g);
      this.npcs = (this.npcs || []).filter(n => n.guard !== g);
    }
    this._crimeResponders = [];
  },

  /** A guard has reached the player: the arrest, as a choice. */
  _crimeArrest(g) {
    if (this._dialogueOpen) return;
    const now = this.time ? this.time.now : 0;
    if (this._crimeArrestCd && now < this._crimeArrestCd) return;
    this._crimeArrestCd = now + 4000;
    const w = this._crime().wanted[this.currentRegion.id];
    if (!w) return;
    const purse = coinPurseValue(this.player.coins);
    const choices = [];
    if (purse >= w.fine) choices.push({ act: 'crime|payfine', label: `Pay the fine (${fmtCoin(w.fine)})` });
    choices.push({ act: 'crime|jail', label: `Go to the cells (${sentenceHours(w.fine)} hours)` });
    choices.push({ act: 'crime|resist', label: 'Resist' });
    this._crimeArrestBy = g;
    this._openDialogue(g.name || 'The Watch', `"You're under arrest for ${w.reason || 'a crime'} in ${w.name || 'this town'}. The fine is ${fmtCoin(w.fine)}, and anything stolen comes back with us. Pay it here, or come along to the cells."`, null, choices);
  },

  _crimePayFine() {
    const rid = this.currentRegion && this.currentRegion.id;
    const w = rid && this._crime().wanted[rid];
    if (!w) return;
    if (!spendCoins(this.player.coins, w.fine)) { this._floatText(this.world.x, this.world.y - 60, 'You cannot pay it.', '#ef9a9a'); return; }
    const n = this._crimeConfiscate();
    this._crimeClear(rid);
    this._floatText(this.world.x, this.world.y - 60, `Fine paid${n ? `; ${n} stolen item${n > 1 ? 's' : ''} taken back` : ''}. Behave yourself.`, '#c5e1a5');
    if (this._updateHud) this._updateHud();
  },

  _crimeResist() {
    const rid = this.currentRegion && this.currentRegion.id;
    const C = this._crime(), w = rid && C.wanted[rid];
    if (!w) return;
    w.resisting = true;
    w.fine += fineFor('resist', rid);
    C.notoriety[rid] = (C.notoriety[rid] || 0) + NOTORIETY.resist;
    this._floatText(this.world.x, this.world.y - 60, 'Resisting arrest! The watch draws steel.', '#ef5350');
  },

  /** Wanted no more in this region (fine paid, time served). Notoriety halves: they remember, less. */
  _crimeClear(rid) {
    const C = this._crime();
    delete C.wanted[rid];
    C.notoriety[rid] = Math.floor((C.notoriety[rid] || 0) / 2);
    this._crimeClearResponders();
    for (const g of (this.guards || [])) { g.huntCried = false; if (g.target && g.target.isPlayer) g.target = null; }
  },

  /** Every stolen thing carried is taken back. Returns how many. */
  _crimeConfiscate() {
    const p = this.player, C = this._crime();
    let n = 0;
    const inv = p.inventory;
    const bags = { essence: inv.essences, stone: inv.stones, part: inv.parts, consumable: inv.consumables, stock: inv.stock, core: inv.cores, quintessence: inv.quintessence, goods: inv.goods || [] };
    for (const [k, cnt] of Object.entries(C.stolen)) {
      const [kind, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
      for (let i = 0; i < cnt; i++) {
        if (kind === 'weapon') {
          if (p.ownedWeapons && p.ownedWeapons.has(id) && this._loseWeapon && !(p.hands.left === id || p.hands.right === id)) { this._loseWeapon(id); n++; }
          continue;
        }
        const bag = bags[kind];
        const at = bag ? bag.indexOf(id) : -1;
        if (at >= 0) { bag.splice(at, 1); n++; }
      }
    }
    C.stolen = {};
    const before = inv.gearItems.length;
    inv.gearItems = inv.gearItems.filter(g => !g.stolen);
    n += before - inv.gearItems.length;
    return n;
  },

  // ============================================================== the gaol
  _crimeJail() {
    const rid = this.currentRegion && this.currentRegion.id;
    const C = this._crime(), w = rid && C.wanted[rid];
    if (!w) return;
    const n = this._crimeConfiscate();
    C.jail = { region: rid, city: w.name || 'the town', fine: w.fine, hours: sentenceHours(w.fine), out: { x: this.world.x, y: this.world.y } };
    C.jailed += 1;
    this._crimeClearResponders();
    const room = JAIL_ROOM;
    if (this._stampRealm) this._stampRealm(room);
    if (room.lazy && !room._crimeBuilt && this._buildRoomContents) { this._buildRoomContents(room); room._crimeBuilt = true; }
    for (const npc of (this.npcs || [])) if (npc.name === 'The Gaoler' && npc.interior === room.id) npc.jailer = true;
    const at = room.cellSpot();
    this._realmReturn = { x: C.jail.out.x, y: C.jail.out.y, room: null };
    this._insideRoom = room;
    this.world.x = at.x; this.world.y = at.y;
    if (this._restoreRoomView) this._restoreRoomView(room);
    if (this._showLocationBanner) this._showLocationBanner(`${C.jail.city} Gaol`);
    this._floatText(this.world.x, this.world.y - 60, `${n ? `${n} stolen item${n > 1 ? 's' : ''} taken. ` : ''}Talk to the gaoler: fine, or time.`, '#ffcc80');
  },

  _crimeJailerTalk(npc) {
    const J = this._crime().jail;
    if (!J) { this._openDialogue(npc.name, '"You\'re not one of mine. Go on, out you get."', npc, [{ act: 'crime|serve', label: 'Leave' }]); return; }
    const choices = [];
    if (coinPurseValue(this.player.coins) >= J.fine) choices.push({ act: 'crime|jailpay', label: `Pay the fine (${fmtCoin(J.fine)})` });
    choices.push({ act: 'crime|serve', label: `Serve your time (${J.hours} hours)` });
    if (hasCraft(this.player, 'lockpicking')) choices.push({ act: 'crime|escape', label: 'Wait until he dozes, and pick the lock' });
    this._openDialogue(npc.name, `"${J.city} keeps you until the fine's paid (${fmtCoin(J.fine)}) or you've sat out your ${J.hours} hours. Your choice."`, npc, choices);
  },
  _crimeJailPay() {
    const J = this._crime().jail;
    if (!J || !spendCoins(this.player.coins, J.fine)) return;
    this._crimeRelease('Fine paid. You are walked to the door.');
  },
  _crimeServe() {
    const J = this._crime().jail;
    if (J) {
      this._clockT = (this._clockT || 0) + J.hours * CLOCK_PER_HOUR;
      if (this._updateDayNight) this._updateDayNight(0.001);
    }
    this._crimeRelease(J ? `${J.hours} hours pass. The cell door opens.` : 'Out you go.');
  },
  _crimeEscape() {
    const C = this._crime(), J = C.jail;
    if (!J) return;
    if (Math.random() < pickChance(this.player.rank) * 0.8) {
      C.notoriety[J.region] = (C.notoriety[J.region] || 0) + NOTORIETY.resist;
      C.wanted[J.region] = { settlement: null, name: J.city, fine: J.fine + fineFor('resist', J.region), lethal: false, estate: false,
        day: this._crimeDay(), reason: 'breaking out of the gaol', resisting: true };
      C.jail = null;
      this._realmReturn = { x: J.out.x, y: J.out.y, room: null };
      if (this._leaveAstralRealm) this._leaveAstralRealm();
      this._floatText(this.world.x, this.world.y - 60, 'You\'re out, and every guard in the region is looking for you.', '#ef5350');
    } else {
      J.hours += 4;
      this._floatText(this.world.x, this.world.y - 60, 'Caught at it. Four more hours.', '#ef9a9a');
    }
  },
  _crimeRelease(msg) {
    const C = this._crime(), J = C.jail;
    if (J) this._crimeClear(J.region);
    C.jail = null;
    if (J) this._realmReturn = { x: J.out.x, y: J.out.y, room: null };
    if (this._leaveAstralRealm) this._leaveAstralRealm();
    this._floatText(this.world.x, this.world.y - 60, msg, '#c5e1a5');
  },

  // ============================================================== shops and the bag
  /** How many of an item (kind, id) are stolen, never more than are carried. Gear: its own flag. */
  _crimeStolenQty(kind, id, owned) {
    const C = this._crime();
    const n = C.stolen[`${kind}:${id}`] || 0;
    return Math.max(0, Math.min(n, owned));
  },
  /** Before a sale: 'ok' (sell as usual), 'fence' (sell at the fence's cut) or 'refuse'. */
  _crimeSellGate(kind, id) {
    const p = this.player, C = this._crime();
    if (!this._sellQuiet) this._crimeRefusedThisSale = false;
    let stolen = false;
    if (kind === 'gear') {
      const g = p.inventory.gearItems.find(x => String(x.uid) === String(id));
      stolen = !!(g && g.stolen);
    } else {
      const bag = { essence: p.inventory.essences, stone: p.inventory.stones, part: p.inventory.parts, consumable: p.inventory.consumables, stock: p.inventory.stock, goods: p.inventory.goods || [] }[kind];
      const owned = kind === 'weapon' ? ((p.weaponCounts && p.weaponCounts[id]) || 0) : (bag ? bag.filter(x => x === id).length : 0);
      const s = this._crimeStolenQty(kind, id, owned);
      stolen = s > 0 && s >= owned;   // a clean one sells first
    }
    if (!stolen) return 'ok';
    if (FENCE_SHOPS.has(this._shopId)) return 'fence';
    if (!this._sellQuiet || !this._crimeRefusedThisSale) {
      const line = pick(VENDOR_REFUSALS);
      this._floatText(this.world.x, this.world.y - 60, line, '#ef9a9a');
      if (this._panelNotice) this._panelNotice(line, '#ef9a9a');
      this._crimeRefusedThisSale = true;
    }
    return 'refuse';
  },
  /** After a fenced sale: the stolen count comes down, and the coin is the fence's cut. */
  _crimeFenced(kind, id, value) {
    const C = this._crime();
    const k = `${kind}:${id}`;
    if (C.stolen[k]) { C.stolen[k] -= 1; if (C.stolen[k] <= 0) delete C.stolen[k]; }
    return Math.max(1, Math.floor(value * FENCE_CUT));
  },

  /** Mark a bag or sell-list row that is (wholly or partly) stolen: red, with the count. `selling` adds what this
   *  counter will do with it. */
  _crimeStolenTag(r, selling) {
    if (!r || !r.kind) return;
    const p = this.player;
    let n = 0;
    if (r.kind === 'gear') {
      const g = p.inventory.gearItems.find(x => String(x.uid) === String(r.id));
      n = g && g.stolen ? 1 : 0;
    } else n = this._crimeStolenQty(r.kind, r.id, Number(r.qty) || 1);
    if (!n) return;
    r.color = '#ef5350';
    const whole = r.kind === 'gear' || n >= (Number(r.qty) || 1);
    const tag = whole ? 'stolen' : `${n} stolen`;
    const how = selling ? (FENCE_SHOPS.has(this._shopId) ? ' — fenced at half' : (whole ? ' — will not buy' : '')) : '';
    r.name = `${r.name}<span class="stolen-tag">(${tag}${how})</span>`;
    r.stolen = n;
  },

  /** The lockpicking treatise as a shop lot (the hooded trader and the fence carry it; no honest shelf does). */
  _crimeBookLot(push) {
    const b = bookById('book_lockpicking');
    if (!b || hasCraft(this.player, 'lockpicking') || (this.player.bookBag || []).includes(b.id)) return;
    push({ kind: 'skillbook', cat: 'bookcraft', id: b.id, name: b.name, rarity: null, price: Math.round(b.price * 1.2), blurb: b.blurb });
  },

  /** The bag rows for carried goods (the inventory's Items tab and the sell list read these). */
  _crimeGoodsRows(selling) {
    const bag = this.player.inventory.goods || [];
    const counts = {};
    for (const id of bag) counts[id] = (counts[id] || 0) + 1;
    return Object.entries(counts).filter(([id]) => HOUSE_GOODS[id]).map(([id, qty]) => {
      const G = HOUSE_GOODS[id];
      return selling
        ? { kind: 'goods', id, name: G.name, qty, sub: 'household goods', iconUrl: null, color: '#d7ccc8', value: this._sellValue('goods', id) }
        : { kind: 'goods', id, name: G.name, desc: 'Something somebody owned. Worth a little to the right buyer.', type: 'Goods', qty, color: '#d7ccc8', icon: this._crimeGoodIcon(G) };
    });
  },

  /** A good's picture: its own cell of the tabletop sheet (props_small.png, 32 px, 16 across), drawn at 24 px. */
  _crimeGoodIcon(G) {
    const d = G && G.prop ? SMALL_PROPS[G.prop] : null;
    if (!d) return '';
    const col = d.idx % SMALL_PROP_COLS, row = Math.floor(d.idx / SMALL_PROP_COLS), k = 0.75;
    return `<span class="item-icon" style="display:inline-block;width:${SMALL_PROP_CELL * k}px;height:${SMALL_PROP_CELL * k}px;vertical-align:middle;margin-right:4px;`
      + `background:url(./public/assets/props_small.png) -${col * SMALL_PROP_CELL * k}px -${row * SMALL_PROP_CELL * k}px / ${SMALL_PROP_COLS * SMALL_PROP_CELL * k}px auto no-repeat;image-rendering:pixelated;"></span>`;
  },
    _crimeGoodValue(id) { return HOUSE_GOODS[id] ? HOUSE_GOODS[id].value : 0; },

  /** For the suite and the notes. */
  _crimeStats() {
    const C = this._crime();
    return { stolen: Object.values(C.stolen).reduce((s, v) => s + v, 0), wanted: Object.keys(C.wanted), notoriety: { ...C.notoriety },
      thefts: C.thefts, jailed: C.jailed, jail: !!C.jail, responders: (this._crimeResponders || []).length };
  },
};
