// ===========================================================================
// ROUND 389 -- PROPERTY SIGNS AND INNS: THE SCENE SIDE.
//
//   "Hook them to what they say ... Don't scatter them as decoration."
//   "Mark some buildings as inns where a player can spend a night for 35
//    normal rank coins, allowing them to sleep until 6:00AM the next morning."
//
// Two kinds of sign, one drawing path (`_psDraw`):
//
//   FOR RENT / FOR PURCHASE / FOR RENT OR PURCHASE -- the round-345 houses on
//     the market (homeMixin.js `_homeSignList`). Which one is homes.js's offer
//     read against what the player holds (propertySigns.js homeSignKind).
//   VACANCY / NO VACANCY -- every inn. AN INN IS A TAVERN: every building the
//     settlement planner stood up as the `tavern` service (a town's, a city's,
//     a bandit city's), Cadence's tavern, and each harbour's pirate tavern.
//     They already had an Innkeep at the door (`_addSettlementShopkeeper`) or a
//     barkeep at the counter (Cadence's Hob); what they let now is a room.
//
// Wooden or magical is propertySigns.js signStyleFor -- deterministic per
// building. Signs stand beside the door, clear of the doorstep and the walk to
// it (signClearsDoor), solid only at their posts (`_propertySignSolids`, read
// by `_rebuildStaticGrid`), and are drawn only near the player, like the
// round-345 notices before them.
//
// WHAT IS SAVED is `player.inns`: { [innId]: { night } } -- the room the player
// has paid for, and the inn's night it is for (propertySigns.js innNight). A
// booking for an earlier night is simply spent.
// ===========================================================================
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { NPC_INTERACT_RADIUS } from '../data/npcs.js';
import { REGIONS, regionPoint } from '../data/regions.js';
import { isCarriagewayTile } from '../data/town.js';
import { coinPurseValue, spendCoins } from '../data/inventory.js';
import { coinWords } from '../data/alleyEvents.js';
import { homeKey } from '../data/homes.js';
import {
  PROPERTY_SIGN_ART, PROPERTY_SIGNS, PROPERTY_SIGN_SPRITE_SCALE, propertySignScale, signKeyFor, signStyleFor, isMagicBuilding,
  MAGIC_REACH_T, signPosts, signClearsDoor, signSpotsBesideDoor,
  INN_ROOM_PRICE, INN_WAKE_HOUR, INN_LINES, innState, innNight, hourOfDay,
} from '../data/propertySigns.js';

const PS_SHOW = 1700;   // drawn within this many units of the player (as the round-345 notices)
const PS_HIDE = 2300;   // and put away beyond this
const PS_USE = NPC_INTERACT_RADIUS - 6;
const PS_CLICK_REACH = TILE * 4;   // a click on a sign further off than this is a swing, not a question

export const PropertySignsMixin = {
  // -------------------------------------------------------------------------
  // WHERE THINGS ARE
  // -------------------------------------------------------------------------
  /** The settlement a building belongs to: its own tag, else the city whose ground it stands on, else the nearest
   *  settlement within its reach. */
  _psSettlementOf(b) {
    const byId = (id) => { for (const r of REGIONS) for (const st of (r.settlements || [])) if (st.id === id) return st; return null; };
    if (b && b.settlement) { const st = byId(b.settlement); if (st) return st; }
    const x = b.anchorX ?? b.x, y = b.anchorY ?? b.y;
    if (this._lampCityFor) { const c = this._lampCityFor(x, y, 4); if (c && c.st) return c.st; }
    let best = null, bd = Infinity;
    for (const r of REGIONS) {
      for (const st of (r.settlements || [])) {
        const c = st._centre || regionPoint(r, st.at);
        if (!c) continue;
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < ((st.radius || 10) + 30) * TILE && d < bd) { bd = d; best = st; }
      }
    }
    return best;
  },

  /** Wooden or magical for a building (propertySigns.js signStyleFor). The magic buildings are indexed once. */
  _psStyleFor(b, st) {
    if (!this._psMagicIdx || this._psMagicIdx.src !== this.buildings || this._psMagicIdx.n !== (this.buildings || []).length) {
      this._psMagicIdx = { src: this.buildings, n: (this.buildings || []).length, list: (this.buildings || []).filter(isMagicBuilding) };
    }
    const x = b.anchorX ?? b.x, y = b.anchorY ?? b.y;
    const R = MAGIC_REACH_T * TILE;
    const magicNear = this._psMagicIdx.list.some(m => m !== b && Math.abs(m.x - x) < R && Math.abs(m.y - y) < R && Math.hypot(m.x - x, m.y - y) < R);
    return signStyleFor({ settlement: st ? st.id : null, bandit: !!(st && st.bandit), magicNear });
  },

  /** The door of a building and the way out through it: its hung doorway if it has one (a generic door, or the
   *  authored room a singleton opens on), else the doorstep `_buildInteriors` would have stepped to. */
  _psDoorOf(b) {
    // ROUND 400 -- a new building knows its door: the middle of its bottom-right face
    if (b && b.doorPoint) {
      const L = Math.hypot(b.doorPoint.x - b.x, b.doorPoint.y - b.y) || 1;
      return { door: { x: b.doorPoint.x, y: b.doorPoint.y }, dir: { dx: (b.doorPoint.x - b.x) / L, dy: (b.doorPoint.y - b.y) / L }, doorway: null };
    }
    const dir0 = this._doorDirectionWithFacing ? this._doorDirectionWithFacing(b) : { dx: 0, dy: 1 };
    const dir = { dx: dir0.dx, dy: dir0.dy };
    const step = dir0.step || ((b.radius || 52) + 44);
    const guess = { x: b.x + dir.dx * step, y: b.y + dir.dy * step };
    let door = null;
    for (const d of (this.doorways || [])) {
      if (!d || d.kind !== 'enter') continue;
      if (d.building === b || (b.singleton && d.room && (d.room.building === b.singleton))) { door = d; break; }
    }
    if (!door) {
      let bd = TILE * 3;
      for (const d of (this.doorways || [])) {
        if (!d || d.kind !== 'enter' || d.x === undefined) continue;
        const dd = Math.hypot(d.x - guess.x, d.y - guess.y);
        if (dd < bd) { bd = dd; door = d; }
      }
    }
    const at = door ? { x: door.x, y: door.y } : guess;
    // The way out is from the building's centre through the door actually hung.
    const L = Math.hypot(at.x - b.x, at.y - b.y);
    if (L > 1) { dir.dx = (at.x - b.x) / L; dir.dy = (at.y - b.y) / L; }
    return { door: at, dir, doorway: door };
  },

  /** A spot for a sign beside a door: clear of the doorstep and the walk to it, its posts on open, dry, standable
   *  ground off the carriageway, and not on another sign. Null when nowhere beside this door will take one. */
  _psSpotBesideDoor(key, door, dir, taken = []) {
    // Off the carriageway first; where a door gives straight onto paving all round (Little Gale's shops quarter), on
    // the pavement beside it -- the door and the walk to it are kept clear either way.
    for (const offRoad of [true, false]) {
      for (const s of signSpotsBesideDoor(door, dir)) {
        if (!signClearsDoor(key, s.x, s.y, door, dir)) continue;
        if (this._isWaterAt && this._isWaterAt(s.x, s.y)) continue;
        if (offRoad && this._tileTypeAt && isCarriagewayTile(this._tileTypeAt(Math.floor(s.x / TILE), Math.floor(s.y / TILE)))) continue;
        const posts = signPosts(key, s.x, s.y);
        if (posts.some(p => this._collidesObstacle(p.x, p.y, p.radius + 4))) continue;
        if (this._collidesObstacle(s.x, s.y, 10)) continue;   // the player has to stand in front of it to read it
        if (taken.some(t => Math.hypot(t.x - s.x, t.y - s.y) < TILE * 2)) continue;
        return s;
      }
    }
    return null;
  },

  // -------------------------------------------------------------------------
  // THE INNS
  // -------------------------------------------------------------------------
  /** Is this building an inn? Every tavern: the `tavern` service, Cadence's tavern, a harbour's pirate tavern. */
  _psIsInn(b) {
    if (!b || b.wall || b.fence || b.pond) return false;
    return b.service === 'tavern' || b.singleton === 'tavern' || b.structure === 'piratetavern' || !!b.innR400;   // ROUND 400 -- the roadside inns
  },

  /** Every inn, planned once per world build (deterministic: the buildings, never a roll). */
  _innList() {
    const bs = this.buildings || [];
    if (this._inns && this._innsSrc === bs && this._innsN === bs.length) return this._inns;
    for (const s of (this._inns || [])) if (s.sprite) s.sprite.destroy();
    const out = [];
    const taken = (this._homeSigns || []).map(s => ({ x: s.x, y: s.y }));
    this._inns = out;   // read by `_propertySignSolids` while the posts below are tested
    this._innsSrc = bs; this._innsN = bs.length;
    for (const b of bs) {
      if (!this._psIsInn(b)) continue;
      const st = this._psSettlementOf(b);
      const style = this._psStyleFor(b, st);
      const key0 = signKeyFor('vacancy', style);
      const { door, dir } = this._psDoorOf(b);
      const at = this._psSpotBesideDoor(key0, door, dir, taken);
      const id = `inn_${st ? st.id : 'road'}_${homeKey(b).replace(',', '_').replace(/-/g, 'm')}`;
      const name = b.innName ? b.innName : b.structure === 'piratetavern' ? `The harbour tavern${st ? ` at ${st.name}` : ''}`
        : (st && st.id === 'nek_city') ? 'The Tavern' : `The ${st ? st.name : 'roadside'} inn`;
      const inn = { id, b, settlement: st ? st.id : null, settlementName: st ? st.name : null, name, style,
        door: { x: door.x, y: door.y }, dir, x: at ? at.x : null, y: at ? at.y : null, placed: !!at,
        sprite: null, sign: null, inn: true };
      out.push(inn);
      if (at) taken.push(at);
    }
    // A sign planned after the static grid was built is solid from the next query on.
    if (out.some(s => s.placed)) this._staticGrid = null;
    return out;
  },

  _innById(id) { return (this._innList() || []).find(s => s.id === id) || null; },

  /** The inn's state tonight (propertySigns.js innState) for the player. */
  _innState(inn) {
    const p = this.player || {};
    const book = (p.inns && inn) ? p.inns[inn.id] : null;
    return innState(this._shopSeed ? this._shopSeed() : 0, inn ? inn.id : '', this._clockT || 0, book);
  },

  /** The inn an innkeeper keeps: the nearest inn of the keeper's settlement (a keeper stands at their tavern's door).
   *  Cadence's barkeep keeps Cadence's tavern. */
  _innForNpc(npc) {
    if (!npc) return null;
    const inns = this._innList();
    if (npc.cityLife === 'barkeep') return inns.find(s => s.settlement === 'nek_city' && s.b && s.b.singleton === 'tavern') || null;
    if (npc.shopId !== 'tavern') return null;
    let best = null, bd = TILE * 14;
    for (const s of inns) {
      if (npc.settlement && s.settlement && s.settlement !== npc.settlement) continue;
      const d = Math.hypot((s.b.anchorX ?? s.b.x) - npc.x, (s.b.anchorY ?? s.b.y) - npc.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  },

  /** The dialogue buttons an inn offers right now. */
  _innChoices(inn) {
    if (!inn) return [];
    const st = this._innState(inn);
    if (st.booked) return [{ act: `home|inn|sleep|${inn.id}`, label: INN_LINES.sleepBooked }];
    if (st.full) return [];
    return [{ act: `home|inn|take|${inn.id}`, label: INN_LINES.take }];
  },

  /** Cadence's barkeep and every Innkeep: the room, the shop, the door. Returns false when the keeper keeps no inn. */
  _innTalk(npc) {
    const inn = this._innForNpc(npc);
    if (!inn) return false;
    this._innTalkNpc = npc;
    const st = this._innState(inn);
    const body = st.booked ? INN_LINES.booked : st.full ? INN_LINES.full
      : `"A bed, a wash-stand and a lock on the door, ${INN_ROOM_PRICE} coins the night. I'll knock at six."\n\nYou carry ${coinWords(coinPurseValue(this.player.coins || {}))}.`;
    const choices = [...this._innChoices(inn)];
    if (npc.shopId) choices.push({ act: `home|inn|shop|${inn.id}`, label: 'See what\'s for sale' });
    choices.push({ act: 'home|no', label: 'Walk on' });
    this._openDialogue(npc.name || inn.name, body, npc, choices);
    return true;
  },

  /** E (or a click) on an inn's sign. */
  _innSignRead(inn, note) {
    const st = this._innState(inn);
    const head = st.vacancy ? 'VACANCY' : 'NO VACANCY';
    let body = `${head}\n\n${inn.name}. Rooms by the night, ${coinWords(INN_ROOM_PRICE)}; a knock at six.`;
    if (st.booked) body += `\n\n${INN_LINES.booked}`;
    else if (st.full) body += '\n\nEvery room is let tonight.';
    else body += `\n\nYou carry ${coinWords(coinPurseValue((this.player && this.player.coins) || {}))}.`;
    this._openDialogue(inn.name, (note ? `${note}\n\n` : '') + body, null, [...this._innChoices(inn), { act: 'home|no', label: 'Walk on' }]);
  },

  /** `home|inn|<way>|<id>` -- routed here from `_homeAct`. */
  _innAct(act) {
    const [, , way, id] = String(act).split('|');
    const inn = this._innById(id);
    if (!inn) { this._closeDialogue(); return; }
    if (way === 'shop') {
      const n = this._innTalkNpc;
      this._closeDialogue();
      if (n && n.shopId) this._openShop(n.shopId, n.name);
      return;
    }
    if (way === 'take') {
      const r = this._innTakeRoom(id, { sleep: false });
      if (!r.ok) { this._innSignRead(inn, r.why === 'purse' ? INN_LINES.noPurse : INN_LINES.full); return; }
      this._closeDialogue();
      this._openDialogue(inn.name, `${INN_LINES.booked}\n\n(-${coinWords(INN_ROOM_PRICE)})`, null, [
        { act: `home|inn|sleep|${inn.id}`, label: INN_LINES.sleepBooked },
        { act: 'home|no', label: 'Not yet' },
      ]);
      return;
    }
    if (way === 'sleep') {
      this._closeDialogue();
      this._innSleep(inn);
      return;
    }
    this._closeDialogue();
  },

  /**
   * TAKE A ROOM. Pays INN_ROOM_PRICE out of the purse (spendCoins makes change from any rank) and books tonight;
   * with `sleep`, goes straight to bed. Returns { ok, why, night, wokeAt } -- also the browser check's handle.
   * `instant` skips the fade (the check, and a stub scene with no camera).
   */
  _innTakeRoom(id, opts = {}) {
    const inn = this._innById(id);
    const p = this.player;
    if (!inn || !p) return { ok: false, why: 'no inn' };
    const st = this._innState(inn);
    if (st.booked) { if (opts.sleep) this._innSleep(inn, opts); return { ok: true, why: 'already booked', night: st.night }; }
    if (st.full) return { ok: false, why: 'full', night: st.night };
    p.coins = p.coins || {};
    if (!spendCoins(p.coins, INN_ROOM_PRICE)) return { ok: false, why: 'purse', night: st.night };
    if (!p.inns || typeof p.inns !== 'object') p.inns = {};
    for (const k of Object.keys(p.inns)) if (!p.inns[k] || p.inns[k].night < st.night) delete p.inns[k];   // spent nights
    p.inns[inn.id] = { night: st.night, paid: INN_ROOM_PRICE };
    this._psSignT = 9;   // the sign turns to No Vacancy now
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 54, `-${coinWords(INN_ROOM_PRICE)}`, '#ef9a9a');
    const out = { ok: true, why: 'booked', night: st.night };
    if (opts.sleep) out.wokeAt = this._innSleep(inn, opts);
    return out;
  },

  /** Sleep in the room: fade out, the night passes (homeMixin `_sleepUntil` -- the bed's own restore, market day and
   *  buff clock), fade in where the player stands, at the inn. Returns the hour woken at (06:00), or null if the fade
   *  is still running. */
  _innSleep(inn, opts = {}) {
    const cam = this.cameras && this.cameras.main;
    const wake = () => {
      this._sleepUntil(INN_WAKE_HOUR, INN_LINES.woke);
      this._psSignT = 9;
      return hourOfDay(this._clockT || 0);
    };
    if (!opts.instant && cam && cam.fadeOut && this.time && this.time.delayedCall) {
      cam.fadeOut(700, 0, 0, 0);
      this.time.delayedCall(760, wake);
      return null;
    }
    return wake();
  },

  // -------------------------------------------------------------------------
  // DRAWING, NEAR THE PLAYER
  // -------------------------------------------------------------------------
  /** Draw, re-face or put away one sign record. `key` is the sign art to show, or null for none. */
  _psDraw(s, key) {
    if (!key || s.x === null || !this.textures.exists(PROPERTY_SIGN_ART.key)) {
      if (s.sprite) { s.sprite.destroy(); s.sprite = null; }
      s.sign = key || null;
      return;
    }
    const def = PROPERTY_SIGNS[key];
    if (!s.sprite) {
      const p = isoProject(s.x, s.y);
      s.sprite = this.add.image(p.x, p.y, PROPERTY_SIGN_ART.key, def.idx);
      s.sprite.setScale(propertySignScale(key));   // ROUND 403 -- rent / sale signs at half size
      const bias = this._propFrontBias ? this._propFrontBias({ x: s.x, y: s.y }) : 0;
      s.sprite.setDepth(isoDepth(s.x, s.y) + bias);
    } else if (s.sign !== key) {
      s.sprite.setFrame(def.idx);
      s.sprite.setScale(propertySignScale(key));
    }
    s.sprite.setOrigin(def.foot[0], def.foot[1]);
    s.sign = key;
  },

  /** The inns' signs: Vacancy / No Vacancy for tonight, redrawn as the night or the booking changes. Called from
   *  homeMixin `_updateHomeSigns`, on its half-second beat. */
  _updateInnSigns() {
    for (const s of this._innList()) {
      if (!s.placed) continue;
      const d = Math.hypot(s.x - this.world.x, s.y - this.world.y);
      if (d > PS_HIDE) { if (s.sprite) { s.sprite.destroy(); s.sprite = null; s.sign = null; } continue; }
      if (d > PS_SHOW && !s.sprite) continue;
      this._psDraw(s, signKeyFor(this._innState(s).sign, s.style));
    }
  },

  /** Nearest inn sign in reach, for the prompt ladder (homeMixin `_updateHomeProximity`). */
  _innSignNear() {
    let best = null, bd = PS_USE;
    for (const s of (this._inns || [])) {
      if (!s.placed) continue;
      const d = Math.hypot(s.x - this.world.x, s.y - this.world.y);
      if (d <= bd) { bd = d; best = s; }
    }
    if (!best) return null;
    const st = this._innState(best);
    return { kind: 'inn', inn: best, label: st.booked ? 'go up to your room' : st.vacancy ? 'ask about a room' : 'read the sign' };
  },

  /** A click on the canvas that lands on a sign the player is near opens what E would. True when it did (the click is
   *  then not a swing). */
  _psClickAt(sx, sy) {
    const cam = this.cameras && this.cameras.main;
    if (!cam || this._insideRoom || !this.world) return false;
    const wp = cam.getWorldPoint(sx, sy);
    const all = [...(this._homeSigns || []), ...(this._inns || [])];
    for (const s of all) {
      if (!s.sprite || !s.sprite.visible) continue;
      if (Math.hypot(s.x - this.world.x, s.y - this.world.y) > PS_CLICK_REACH) continue;
      const bx = s.sprite.getBounds ? s.sprite.getBounds() : null;
      if (!bx || wp.x < bx.x || wp.x > bx.x + bx.width || wp.y < bx.y || wp.y > bx.y + bx.height) continue;
      if (s.inn) this._innSignRead(s);
      else this._homeUse({ kind: 'sign', sign: s });
      return true;
    }
    return false;
  },

  /** Every sign's posts, for `_rebuildStaticGrid`: "solid only at the post". */
  _propertySignSolids() {
    const out = [];
    for (const s of (this._homeSigns || [])) {
      if (s.x === null || s.x === undefined) continue;
      if (this._homeSignKind && !this._homeSignKind(s)) continue;   // bought or rented away: no sign, no posts
      for (const p of signPosts(s.style === 'magical' ? 'magicSignForRent' : 'signForRent', s.x, s.y)) out.push({ ...p, propertySign: true });
    }
    for (const s of (this._inns || [])) {
      if (!s.placed) continue;
      for (const p of signPosts(s.style === 'magical' ? 'magicSignVacancy' : 'signVacancy', s.x, s.y)) out.push({ ...p, propertySign: true });
    }
    return out;
  },

  // -------------------------------------------------------------------------
  // THE BROWSER CHECK'S HANDLES
  // -------------------------------------------------------------------------
  /** Every sign in the world: its building, kind, style, world position and state. */
  _signsDebug() {
    if (this._homeSignList) this._homeSignList();
    const out = [];
    for (const s of (this._homeSigns || [])) {
      const held = this._homeHeld ? this._homeHeld(s.b) : null;
      const kind = this._homeSignKind ? this._homeSignKind(s) : null;
      out.push({ type: 'property', id: s.key, building: { x: s.b.x, y: s.b.y, house: !!s.b.house }, settlement: s.settlement || null,
        kind, sign: kind ? signKeyFor(kind, s.style) : null, style: s.style, x: s.x, y: s.y, door: s.door ? { x: s.door.x, y: s.door.y } : null,
        offer: s.offer ? s.offer.kinds.slice() : [], held: held ? held.kind : null, drawn: !!s.sprite });
    }
    for (const s of this._innList()) {
      const st = this._innState(s);
      out.push({ type: 'inn', id: s.id, name: s.name, building: { x: s.b.x, y: s.b.y, service: s.b.service || s.b.singleton || s.b.structure },
        settlement: s.settlement, kind: st.sign, sign: s.placed ? signKeyFor(st.sign, s.style) : null, style: s.style,
        x: s.x, y: s.y, door: s.door, placed: s.placed, rooms: st.rooms, guests: st.guests, booked: st.booked, full: st.full,
        night: st.night, drawn: !!s.sprite });
    }
    return out;
  },

  /** Rent or buy a property by its key ('rent' | 'buy'), through the notice's own act. `fund` tops the purse up first. */
  _signsRentOrBuy(key, way, fund = false) {
    const s = this._homeSignByKey ? this._homeSignByKey(key) : null;
    if (!s) return { ok: false, why: 'no such property' };
    if (fund) { this.player.coins = this.player.coins || {}; this.player.coins.gold = (this.player.coins.gold || 0) + 1; }
    this._homeAct(`home|${way}|${key}`);
    if (this._closeDialogue) this._closeDialogue();
    const h = (this.player.homes || {})[key] || null;
    return { ok: !!h, held: h ? h.kind : null, sign: this._homeSignKind ? this._homeSignKind(s) : null };
  },

  /** The current inn night and hour, for the check. */
  _innClock() { return { night: innNight(this._clockT || 0), hour: hourOfDay(this._clockT || 0) }; },
};
