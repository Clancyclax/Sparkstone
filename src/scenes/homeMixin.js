// ===========================================================================
// ROUND 345 (item 3) -- HOUSES YOU CAN BUY OR RENT: THE SCENE SIDE.
//
// What a house costs, which ones carry a sign and how a rental runs is
// data/homes.js. This is the part that needs a world: the signs out front, the
// notice you read, the deed or agreement, and what a house you hold has inside
// it that other houses do not:
//
//   * the BED you can sleep in (until morning, health, mana and stamina back);
//   * a CHEST -- the very reliquary the Society hall has, on the very same
//     account-wide record (vault.js), so what is put in it is there for every
//     playthrough;
//   * a place for recruited companions to WAIT for you while you go out alone.
//
// THE HOUSES ARE THE GAME'S POOLED ROOMS. A house interior is one of four rooms
// dressed afresh for whichever building the player walks into, so "your home" is
// a dressing, not a room: `_enterGenericBuilding` calls `_homeDressRoom`, which
// adds the chest and the bed's marker when this building is held, and
// `_homePlaceWaiting` stands the companions up. Nothing about a house is built
// ahead of time, and nothing leaks from one house to the next.
//
// THE SIGNS are drawn only near the player (a pool), never all at once: there
// are some three hundred in the world and the display list has a budget.
//
// WHAT IS SAVED is `player.homes`, plain data keyed by the house's tile: kind
// (own or rent), name, and for a rental the day it is paid through. A waiting
// companion carries `homeKey` beside the `dismissed` flag they already save.
// ===========================================================================
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_INTERACT_RADIUS } from '../data/npcs.js';
import { coinPurseValue, spendCoins } from '../data/inventory.js';
import { roomEntryPoint, roomTileCentre } from '../data/interiors.js';
import { coinWords } from '../data/alleyEvents.js';
import {
  homeKey, homeTier, homeOffer, rentStatus, rentPaidThrough, canRenew, homeFreeSpot,
  HOME_LINES, RENT_TERM_DAYS, RENT_MAX_TERMS_AHEAD,
} from '../data/homes.js';
// ROUND 389 -- the painted signs (propertySigns.js), the night's clock, and the inns (propertySignsMixin.js).
import { homeSignKind, signKeyFor, sleepClockT, hourOfDay } from '../data/propertySigns.js';

const SIGN_SHOW = 1700;      // a sign is drawn within this many units of the player
const SIGN_HIDE = 2300;      // and put away beyond this
const SIGN_USE = NPC_INTERACT_RADIUS - 6;
// ROUND 389 -- SIGN_SIDE (2.2 tiles flat to the side) and the canvas-drawn SALE / LET / S/L / HOME boards are gone:
// "Don't just place these new signs, replace the placeholders." Where a sign stands is propertySigns.js
// signSpotsBesideDoor / signClearsDoor (clear of the doorstep and the walk to it), and what it shows is the art.

export const HomeMixin = {
  // -------------------------------------------------------------------------
  // WHAT THE PLAYER HOLDS
  // -------------------------------------------------------------------------
  _homes() {
    const p = this.player;
    if (!p.homes || typeof p.homes !== 'object') p.homes = {};
    return p.homes;
  },

  /** The held record for a building, or null if it is not held (or a rental has run out). */
  _homeHeld(b) {
    const h = b ? this._homes()[homeKey(b)] : null;
    return h && rentStatus(h, this._dayIndex()).held ? h : null;
  },

  /** Every house the player holds right now: `[{ key, name, kind }]`. */
  _activeHomes() {
    const day = this._dayIndex();
    return Object.entries(this._homes())
      .filter(([, h]) => rentStatus(h, day).held)
      .map(([key, h]) => ({ key, name: h.name, kind: h.kind }));
  },

  /** A name for a house at the moment it is taken: where it is, and which. */
  _homeName() {
    let st = null;
    try { st = this._settlementAt(this.world.x, this.world.y); } catch (e) { st = null; }
    const where = (st && st.name) || (this.currentRegion && this.currentRegion.name) || 'town';
    const n = Object.keys(this._homes()).length + 1;
    return n === 1 ? `Your house in ${where}` : `Your house in ${where} (${n})`;
  },

  // -------------------------------------------------------------------------
  // THE SIGNS
  // -------------------------------------------------------------------------
  /** Every house with a sign, planned once per playthrough off the run seed. */
  _homeSignList() {
    const seed = this._shopSeed();
    if (this._homeSigns && this._homeSignsSeed === seed) return this._homeSigns;
    for (const s of (this._homeSigns || [])) if (s.sprite) s.sprite.destroy();
    if (this._homeSigns && this._homeSigns.length) this._staticGrid = null;   // ROUND 389 -- the old posts go with them
    this._homeSignsSeed = seed;
    const out = [];
    this._homeSigns = out;   // ROUND 389 -- read by `_propertySignSolids` while the posts below are tested
    const taken = [];
    for (const d of (this.doorways || [])) {
      if (d.kind !== 'enter' || !d.generic || !d.building || d.cave) continue;
      const b = d.building;
      if (!b.house || !b.sprite) continue;
      const key = homeKey(b);
      const box = this._artBox ? this._artBox(b.sprite) : { w: 0 };
      const tier = homeTier(box.w, this._houseStoreys ? this._houseStoreys(b) : 1);
      const offer = homeOffer(seed, key, tier);
      if (!offer) continue;
      // ROUND 389 -- beside the door, facing the street, clear of the doorstep and the walk to it; wooden or magical
      // by where the house stands. Placed for the sign the house starts with (its offer): the posts of every sign of
      // one style stand in the same place, so a sign that later turns to another option stands where it stood.
      const dir0 = this._doorDirectionWithFacing ? this._doorDirectionWithFacing(b) : { dx: 0, dy: 1 };
      const L = Math.hypot(d.x - b.x, d.y - b.y);
      const dir = L > 1 ? { dx: (d.x - b.x) / L, dy: (d.y - b.y) / L } : { dx: dir0.dx, dy: dir0.dy };
      const st = this._psSettlementOf ? this._psSettlementOf(b) : null;
      const style = this._psStyleFor ? this._psStyleFor(b, st) : 'wooden';
      const at = this._psSpotBesideDoor ? this._psSpotBesideDoor(signKeyFor(homeSignKind(offer.kinds, null), style), d, dir, taken) : null;
      if (!at) continue;
      taken.push(at);
      out.push({ key, b, door: d, dir, x: at.x, y: at.y, offer, style, settlement: st ? st.id : null, sprite: null, sign: null });
    }
    if (out.length) this._staticGrid = null;   // ROUND 389 -- "solid only at the post": the posts join the grid
    return out;
  },

  /** ROUND 389 -- what the sign says now (propertySigns.js homeSignKind): the offer, the option left once the house is
   *  rented, or nothing once it is the player's. */
  _homeSignKind(s) {
    return homeSignKind(s.offer.kinds, this._homeHeld(s.b));
  },

  _updateHomeSigns(dt) {
    if (!this.player || this._insideRoom) return;
    this._homeSignT = (this._homeSignT || 0) + dt + (this._psSignT || 0);
    this._psSignT = 0;
    if (this._homeSignT < 0.5) return;
    this._homeSignT = 0;
    for (const s of this._homeSignList()) {
      // ROUND 389 -- the painted sign for what is still on offer, or none. A sign that goes (bought, rented) takes its
      // posts out of the collision grid with it, and one that comes back (a lapsed rental) brings them back.
      const kind = this._homeSignKind(s);
      if (s.standing !== !!kind) { if (s.standing !== undefined) this._staticGrid = null; s.standing = !!kind; }
      const d = Math.hypot(s.x - this.world.x, s.y - this.world.y);
      if (d > SIGN_HIDE) { if (s.sprite) { s.sprite.destroy(); s.sprite = null; s.sign = null; } continue; }
      if (d > SIGN_SHOW && !s.sprite) continue;
      this._psDraw(s, kind ? signKeyFor(kind, s.style) : null);
    }
    if (this._updateInnSigns) this._updateInnSigns();   // ROUND 389 -- Vacancy / No Vacancy
  },

  // -------------------------------------------------------------------------
  // WHAT E DOES NEAR ONE
  // -------------------------------------------------------------------------
  _updateHomeProximity() {
    this.nearHomeThing = null;
    if (!this.player) return;
    const room = this._insideRoom;
    if (room) {
      if (room.home && room.homeBed) {
        const at = roomTileCentre(room, room.homeBed.tx, room.homeBed.ty);
        if (Math.hypot(this.world.x - at.x, this.world.y - at.y) <= TILE * 1.7) {
          this.nearHomeThing = { kind: 'bed', label: 'sleep in your bed' };
        }
      }
      return;
    }
    let best = null, bd = SIGN_USE;
    for (const s of (this._homeSigns || [])) {
      // ROUND 389 -- an owned house has no sign left to read; a rented one keeps its agreement at the gate (renew, or
      // buy when it is also for purchase).
      const held = this._homeHeld(s.b);
      if (held && held.kind === 'own') continue;
      const d = Math.hypot(s.x - this.world.x, s.y - this.world.y);
      if (d <= bd) { bd = d; best = s; }
    }
    if (best) {
      this.nearHomeThing = { kind: 'sign', sign: best, label: this._homeHeld(best.b) ? 'check your rental agreement' : 'read the notice' };
    }
    // ROUND 389 -- an inn's Vacancy / No Vacancy sign, if it is nearer
    const inn = this._innSignNear ? this._innSignNear() : null;
    if (inn && (!best || Math.hypot(inn.inn.x - this.world.x, inn.inn.y - this.world.y) < bd)) this.nearHomeThing = inn;
  },

  _homeUse(t) {
    if (!t) return;
    if (t.kind === 'sign') this._homeSignRead(t.sign);
    else if (t.kind === 'bed') this._homeSleepAsk();
    else if (t.kind === 'inn' && this._innSignRead) this._innSignRead(t.inn);   // ROUND 389
  },

  // -------------------------------------------------------------------------
  // READING A NOTICE
  // -------------------------------------------------------------------------
  _homeSignRead(s, note) {
    const key = s.key;
    const p = this.player;
    const day = this._dayIndex();
    const h = this._homes()[key];
    const st = rentStatus(h, day);
    const choices = [];
    const o = s.offer;
    const size = ['a small', 'a snug', 'a fine', 'a tall, broad'][o.tier - 1] || 'a';
    let body;
    if (h && h.kind === 'own') {
      body = `A brass plate under the notice reads: ${h.name}.\n\n${HOME_LINES.held}`;
    } else if (h && st.held) {
      body = `A rental agreement, in your name. Paid through day ${h.paidThrough} (${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left).`;
      if (canRenew(h, day)) {
        choices.push({ act: `home|renew|${key}`, label: `Pay another week (${coinWords(o.rent)})` });
      } else {
        body += `\n\n${HOME_LINES.tooFar}`;
      }
      // ROUND 389 -- the sign out front says FOR PURCHASE while you rent a house that is also for sale: it can be.
      if (o.kinds.includes('buy')) {
        body += `\n\nThe deed is still for sale: ${coinWords(o.buy)}.`;
        choices.push({ act: `home|buy|${key}`, label: `Buy it (${coinWords(o.buy)})` });
      }
    } else {
      const head = o.kinds.length === 2 ? HOME_LINES.both : o.kinds[0] === 'buy' ? HOME_LINES.buyHead : HOME_LINES.rentHead;
      body = `${head}\n\n${size[0].toUpperCase()}${size.slice(1)} house, furnished, with its own bed and room to keep a chest.`;
      if (o.kinds.includes('buy')) body += `\nTo buy: ${coinWords(o.buy)}.`;
      if (o.kinds.includes('rent')) body += `\nTo let: ${coinWords(o.rent)} a week, paid ahead, up to ${RENT_MAX_TERMS_AHEAD} weeks in hand.`;
      body += `\n\nYou carry ${coinWords(coinPurseValue(p.coins))}.`;
      if (h && st.lapsed) body += `\n\n${HOME_LINES.lapsed}`;
      if (o.kinds.includes('buy')) choices.push({ act: `home|buy|${key}`, label: `Buy it (${coinWords(o.buy)})` });
      if (o.kinds.includes('rent')) choices.push({ act: `home|rent|${key}`, label: `Rent it (${coinWords(o.rent)} a week)` });
    }
    choices.push({ act: 'home|no', label: 'Walk on' });
    this._openDialogue('Notice', (note ? `${note}\n\n` : '') + body, null, choices);
  },

  _homeSignByKey(key) {
    return (this._homeSigns || []).find(s => s.key === key) || null;
  },

  /** The dialogue's `home|...` acts: the deed, the agreement, the bed. */
  _homeAct(act) {
    const [, way, key] = String(act).split('|');
    if (way === 'no') { this._closeDialogue(); return; }
    if (way === 'inn' && this._innAct) { this._innAct(act); return; }   // ROUND 389 -- `home|inn|take|<id>` and the rest
    if (way === 'sleep') { this._closeDialogue(); this._homeSleep(); return; }
    const s = this._homeSignByKey(key);
    if (!s) { this._closeDialogue(); return; }
    const p = this.player;
    const day = this._dayIndex();
    const homes = this._homes();
    const o = s.offer;
    if (way === 'buy' && o.kinds.includes('buy')) {
      if (!spendCoins(p.coins, o.buy)) { this._homeSignRead(s, HOME_LINES.noPurse); return; }
      homes[key] = { kind: 'own', name: this._homeName(), price: o.buy, tier: o.tier };
      this._homeSignT = 9;   // redraw the sign now
      this._closeDialogue();
      this._floatText(this.world.x, this.world.y - 54, `-${coinWords(o.buy)}`, '#ef9a9a');
      this._openDialogue('Notice', HOME_LINES.bought, null, []);
      return;
    }
    if ((way === 'rent' || way === 'renew') && o.kinds.includes('rent')) {
      const h = homes[key];
      if (way === 'renew' && !canRenew(h, day)) { this._homeSignRead(s, HOME_LINES.tooFar); return; }
      if (!spendCoins(p.coins, o.rent)) { this._homeSignRead(s, HOME_LINES.noPurse); return; }
      const keep = h && h.kind === 'rent' ? h : null;
      homes[key] = { kind: 'rent', name: keep ? keep.name : this._homeName(), rent: o.rent, tier: o.tier,
        paidThrough: rentPaidThrough(keep, day) };
      this._homeSignT = 9;
      this._closeDialogue();
      this._floatText(this.world.x, this.world.y - 54, `-${coinWords(o.rent)}`, '#ef9a9a');
      this._openDialogue('Notice', way === 'renew' ? HOME_LINES.renewed : HOME_LINES.rented, null, []);
      return;
    }
    this._closeDialogue();
  },

  // -------------------------------------------------------------------------
  // INSIDE A HOUSE YOU HOLD
  // -------------------------------------------------------------------------
  /** Called while a pool room is being dressed for `b`: the chest and the bed. */
  _homeDressRoom(room, b) {
    room.vault = null; room.home = null; room.homeBed = null;
    const h = this._homeHeld(b);
    if (!h) return;
    const key = homeKey(b);
    room.home = { key, name: h.name, kind: h.kind };
    room.name = h.name;
    const chest = homeFreeSpot(room.props, room.w, room.h);
    if (chest) {
      room.props.push({ key: 'jewelCase', tx: chest.tx, ty: chest.ty });
      room.vault = { tx: chest.tx, ty: chest.ty, prop: 'jewelCase', label: 'open your strongbox' };
    }
    let bed = room.props.find(p => p.key === 'bedFluffy');
    if (!bed) {
      const at = homeFreeSpot(room.props, room.w, room.h, chest ? [chest] : [], 2);
      if (at) { bed = { key: 'bedFluffy', tx: at.tx, ty: at.ty, face: 'southwest' }; room.props.push(bed); }
    }
    if (bed) room.homeBed = { tx: bed.tx, ty: bed.ty };
  },

  /** Stand the companions who were asked to wait here in the room. */
  _homePlaceWaiting(room) {
    if (!room || !room.home) return 0;
    const avoid = [];
    if (room.vault) avoid.push({ tx: room.vault.tx, ty: room.vault.ty });
    if (room.homeBed) avoid.push({ tx: room.homeBed.tx, ty: room.homeBed.ty });
    let n = 0;
    for (const m of (this.party || [])) {
      if (!m || !m.recruited || !m.dismissed || m.homeKey !== room.home.key) continue;
      const spot = homeFreeSpot(room.props, room.w, room.h, avoid, 1.3);
      if (!spot) break;
      avoid.push(spot);
      const at = roomTileCentre(room, spot.tx, spot.ty);
      const art = m.art;
      if (!art || !this.textures.exists(`${m.artKey}_idle`)) continue;
      const p = isoProject(at.x, at.y);
      const s = this.add.image(p.x, p.y, `${m.artKey}_idle`, dirRow('southwest'));
      s.setOrigin(art.footX / art.cell, art.footY / art.cell);
      s.setScale(1.0);
      s.setDepth(isoDepth(at.x, at.y));
      this.interiorSprites.push(this._tagRoom(s, room));
      this.npcs.push({
        name: m.name, x: at.x, y: at.y, facing: 'southwest', sprite: s,
        party: m, homeCrew: room.id, dialogue: null,
      });
      n++;
    }
    return n;
  },

  // -------------------------------------------------------------------------
  // COMPANIONS WAITING AT HOME
  // -------------------------------------------------------------------------
  /** Send somebody to wait at a house you hold. */
  _homeRest(id, key) {
    const m = (this.party || []).find(x => x.id === id);
    const h = this._homes()[key];
    if (!m || !m.recruited || m.dismissed || !h || !rentStatus(h, this._dayIndex()).held) return false;
    m.dismissed = true;
    m.homeKey = key;
    if (m.sprite) m.sprite.setVisible(false);
    m.downT = 0;
    m.hp = m.maxHp;
    this._openDialogue(m.name, `${this._crewRestLine(m)}\n\n(Waiting at ${h.name}.)`, this.nearNpc, []);
    this._updateRetinue && this._updateRetinue();
    return true;
  },

  /** Take somebody back -- only from inside the house they are waiting in. */
  _homeJoin(id) {
    const room = this._insideRoom;
    const m = (this.party || []).find(x => x.id === id);
    if (!m || !m.recruited || !m.dismissed || !m.homeKey) return false;
    if (!(room && room.home && room.home.key === m.homeKey)) return false;
    // ROUND 374 -- "The party can only be 7 members at a time."
    if ((this.party || []).filter(x => x && x.recruited && !x.dismissed).length >= 7) {
      this._openDialogue(m.name, `There's seven out with you already. I'll stay put.`, this.nearNpc, []);
      return false;
    }
    m.dismissed = false;
    m.homeKey = null;
    if (m.sprite) m.sprite.setVisible(true);
    const at = roomEntryPoint(room);
    m.x = at.x; m.y = at.y; m.homeX = at.x; m.homeY = at.y;
    // Their picture in the room goes with them.
    const mine = (this.npcs || []).filter(n => n && n.party === m && n.homeCrew === room.id);
    for (const n of mine) if (n.sprite && n.sprite.destroy) n.sprite.destroy();
    this.npcs = (this.npcs || []).filter(n => !mine.includes(n));
    this._openDialogue(m.name, `${this._crewJoinLine(m)}\n\n(Back in the party.)`, this.nearNpc, []);
    this._updateRetinue && this._updateRetinue();
    return true;
  },

  /** The talk-menu buttons for a companion: transport, and each house held. */
  _homeCompanionChoices(m) {
    if (!m || !m.recruited || m.godFollower) return [];
    if (m.dismissed) {
      const room = this._insideRoom;
      if (m.homeKey && room && room.home && room.home.key === m.homeKey) {
        return [{ act: `homeJoin|${m.id}`, label: 'Ask them to come along' }];
      }
      return [];
    }
    return this._activeHomes().slice(0, 4)
      .map(h => ({ act: `homeRest|${m.id}|${h.key}`, label: `Ask them to wait at ${h.name}` }));
  },

  // -------------------------------------------------------------------------
  // RENT RUNS OUT
  // -------------------------------------------------------------------------
  _updateHomes(dt) {
    if (!this.player) return;
    this._homeTickT = (this._homeTickT || 0) + dt;
    if (this._homeTickT < 2) return;
    this._homeTickT = 0;
    const homes = this.player.homes;
    if (!homes) return;
    const day = this._dayIndex();
    for (const [key, h] of Object.entries(homes)) {
      const st = rentStatus(h, day);
      if (h.kind !== 'rent') continue;
      if (st.held) { h.lapseNoted = false; continue; }
      if (h.lapseNoted) continue;
      h.lapseNoted = true;
      this._floatText(this.world.x, this.world.y - 66, `Rent lapsed: ${h.name}`, '#ffcc80');
      for (const m of (this.party || [])) {
        if (!m || !m.dismissed || m.homeKey !== key) continue;
        m.dismissed = false;
        m.homeKey = null;
        if (m.sprite) m.sprite.setVisible(true);
        if (!this._insideRoom) { m.x = this.world.x; m.y = this.world.y; m.homeX = m.x; m.homeY = m.y; }
      }
      this._updateRetinue && this._updateRetinue();
    }
  },

  // -------------------------------------------------------------------------
  // THE BED
  // -------------------------------------------------------------------------
  _homeSleepAsk() {
    const p = this.player;
    const hour = (8 + (this._clockT || 0) * 24 / 600) % 24;
    const skip = this._homeSleepHours(hour);
    this._openDialogue('Your bed',
      `Sleep until morning? It is ${this._homeClock(hour)}; you would wake at 07:00, rested, with health, mana and stamina restored.`,
      null, [
        { act: 'home|sleep', label: `Sleep (${Math.round(skip)} hours)` },
        { act: 'home|no', label: 'Not yet' },
      ]);
    void p;
  },

  /** Hours of the clock from `hour` to the next 07:00 (or `wake`). */
  _homeSleepHours(hour, wake = 7) {
    const h = ((hour % 24) + 24) % 24;
    const skip = (wake - h + 24) % 24;
    return skip < 0.05 ? 24 : skip;
  },

  _homeClock(hour) {
    const h = ((hour % 24) + 24) % 24;
    return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  },

  _homeSleep() {
    return this._sleepUntil(7, 'You wake rested');
  },

  /**
   * ROUND 389 -- ONE NIGHT'S SLEEP, for the bed at home (07:00) and the inn's room (06:00): the clock lands exactly on
   * the next `wakeHour` (propertySigns.js sleepClockT -- the same morning when it is still before it), and everything
   * a night does happens here once: health, mana and stamina back, the party mended, the day's rollover (market day,
   * the dawn re-forging), timed buffs run down by the hours slept, an autosave.
   */
  _sleepUntil(wakeHour, line) {
    const p = this.player;
    const before = this._clockT || 0;
    const { clockT } = sleepClockT(before, wakeHour);
    this._clockT = clockT;
    this._gameHours = hourOfDay(clockT);
    // A buff with a clock runs down by the night (clock seconds); one that has run out is left at zero for its own
    // tick to expire next frame, the one place that expires it.
    const slept = clockT - before;
    for (const b of Object.values((p && p.buffs) || {})) {
      if (b && typeof b === 'object' && typeof b.t === 'number') b.t = b.t > slept ? b.t - slept : 0;
    }
    p.hp = p.maxHp; p.mana = p.maxMana; p.stamina = p.maxStamina;
    for (const m of (this.party || [])) if (m && m.recruited && m.maxHp) { m.hp = m.maxHp; m.downT = 0; }
    if (this._checkMarketDay) { try { this._checkMarketDay(); } catch (e) { /* never block a night's sleep */ } }
    if (this.cameras && this.cameras.main && this.cameras.main.fadeIn) this.cameras.main.fadeIn(1100, 0, 0, 0);
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 54, line || 'You wake rested', '#aed581');
    if (this._autosave) { try { this._autosave('sleep'); } catch (e) { /* the sleep still happened */ } }
    return this._gameHours;
  },
};
