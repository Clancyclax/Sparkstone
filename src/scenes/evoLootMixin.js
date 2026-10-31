// ============================================================================
// ROUND 388 -- FOUR NATURE GIFT EVOLUTIONS THAT ONLY WIDENED THE PICK-UP REACH, BUILT AS WRITTEN.
//
//   "Increased pick up range is a throwaway ability. It can be tagged on for flavor but should never be the full
//    scope of an ability."
//
// Eight-Fold Grasp, Borderless Spoils, Drawn From Nowhere and Shroud-Weaving each carried `pickupRadius: 0.08` and a
// `gap` saying the rest was not built. Their specs now carry the engine passives below (evoEngine.js PASSIVE_KEYS),
// read here at their own doors:
//
//   tentacleLoot   Eight-Fold Grasp    _evoTentacleTick: shadow tentacles empty every body within TENTACLE_REACH into
//                                      your bag, a pull every TENTACLE_EVERY seconds, in a fight or out of one
//   regionLoot     Borderless Spoils   _evoRegionBodies / _evoSpoilsPanel / _evoSpoilMapDots / _evoMapClick: every
//                                      unlooted kill in the region you stand in (or the dungeon you are in) is a gold
//                                      ring on the map -- click it, or Loot in the list beside the map -- and
//                                      _evoBankRoomSpoils: what is left in a dungeon or an astral realm when you walk
//                                      out of it is kept for you, to take from the same list later
//   callStone      Drawn From Nowhere  _evoCallableStones / _evoCallStone / _evoCallPanel: once in every 24 game hours,
//                                      one awakening stone from the reliquary, from a stack you sold to a shop (that
//                                      vendor is owed the stone's price and collects it the next time you open his
//                                      shop: _evoOnShopOpen) or from the pack you died with, straight into your bag
//   shroud         Shroud-Weaving      _evoShroudOnBody: a kill carrying a condition you laid is wrapped in a shroud
//                                      (pale-tinted, named "Shrouded ..."), refused to enemy use (_corpseUsableByEnemy,
//                                      corpseMixin._corpsesNear's `enemy` option), and lootable with E from
//                                      SHROUD_REACH (_evoCorpseReach, read by corpseMixin._updateCorpseProximity)
//
// Player state (saved with the rest of `player`, cleared for a save that does not carry it in WorldScene._doLoad):
//   evoSpoils      [{ place, bodies, loot: [...] }]   what a dungeon or astral realm still held when you left it
//   evoSoldStones  [{ id, shop, vendor, price }]      stones sold to shops, newest first (recorded with or without the gift)
//   evoShopDebts   { shopId: { vendor, owed } }        the price of a stone called off a shop's shelf
//   evoStoneCall   { at }                              the game clock when a stone was last called
// ============================================================================
import { TILE } from '../data/iso.js';
import { regionAt } from '../data/regions.js';
import { conditionDef, hasTag, TAG } from '../data/debuffs.js';
import { loadVault, saveVault, vaultList, vaultWithdraw } from '../data/vault.js';
import { basePriceFor } from '../data/market.js';
import { spendCoins, coinPurseValue } from '../data/inventory.js';

/** Eight-Fold Grasp: "bodies within a short range" -- five tiles. */
export const TENTACLE_REACH = 5 * TILE;
/** Seconds between pulls, and the most bodies one pull empties (eight arms). */
export const TENTACLE_EVERY = 0.8;
export const TENTACLE_MAX = 8;
/** Shroud-Weaving: "You can loot a shrouded corpse from a distance" -- ten tiles, with E. */
export const SHROUD_REACH = 10 * TILE;
/** Drawn From Nowhere: "This effect recovers over 24 hours" -- the game clock runs 600 seconds to a day. */
export const STONE_CALL_PERIOD = 600;
/** How many departures' spoils and how many sold stones are remembered. */
export const SPOILS_CAP = 20;
export const SOLD_CAP = 30;
const SHROUD_TINT = 0xe6dccb;
/** The specs these passives replaced a stand-in in: a character who woke one before this round carries the old spec on
 *  its record (natureMixin._natureEvolve copies it), so the record is refreshed from the specs file when it lands. */
export const ROUND388_SPEC_KEYS = ['outworlder.loot|octopus', 'outworlder.loot|vast', 'outworlder.blessing@nameless|gathering', 'outworlder.blessing@reaper|cloth'];

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export const EvoLootMixin = {
  // ------------------------------------------------------------------ the tick (from evoMixin._evoTick)
  _evoLootTick(dt) {
    const p = this.player;
    if (!p) return;
    this._evoRefreshHeldSpecs();
    this._evoWireLootClicks();
    // a dungeon or an astral realm left behind: what it still held comes with you (Borderless Spoils)
    const room = this._insideRoom || null;
    if (this._evoRoomSeen === undefined) this._evoRoomSeen = room;
    if (room !== this._evoRoomSeen) {
      const left = this._evoRoomSeen;
      this._evoRoomSeen = room;
      if (left && this._evoPassive('regionLoot')) this._evoBankRoomSpoils(left);
    }
    if (this._evoPassive('tentacleLoot')) this._evoTentacleTick(dt);
  },

  /** A record woken before this round still holds the stand-in spec; give it the one the specs file has now. Once. */
  _evoRefreshHeldSpecs() {
    if (this._evoSpecsRefreshed || !this._natureSpecs) return;
    this._evoSpecsRefreshed = true;
    let changed = false;
    for (const rec of Object.values((this.player && this.player.natureEvoRec) || {})) {
      if (!rec || !rec.specKey || !ROUND388_SPEC_KEYS.includes(rec.specKey)) continue;
      const now = this._natureSpecs[rec.specKey];
      if (now && JSON.stringify(now) !== JSON.stringify(rec.spec)) { rec.spec = JSON.parse(JSON.stringify(now)); changed = true; }
    }
    if (changed) { this._evoCache = null; this.player.natureStamp = (this.player.natureStamp || 0) + 1; }
  },

  // ------------------------------------------------------------------ looting from range (the one remote door)
  /** Empty one body into the bag from wherever you stand, as E would: the loot event, Olb's note, and a body emptied
   *  goes up in smoke. `colour` draws the reach (a tentacle, a thread) from the body to you when it is on screen. */
  _evoLootRemote(c, colour = null, offset = 0) {
    if (!c || c.looted || c.consumed || !this._lootCorpse) return 0;
    if (colour && this._drainLineFx && Math.hypot(c.x - this.world.x, c.y - this.world.y) < 900) {
      try { this._drainLineFx(c, colour); } catch (e) { /* the reach is drawn or not; the loot comes either way */ }
    }
    const got = this._lootCorpse(c, offset);
    if (got > 0 && this._evoOn) this._evoOn('loot', { corpse: c });
    if (got > 0 && this._olbOn) this._olbOn('loot', null);
    if (c.looted && !c.fallen) {
      if (this._rainbowSmoke) this._rainbowSmoke(c.x, c.y);
      if (this._removeCorpse) this._removeCorpse(c);
    }
    return got;
  },

  /** A body worth reaching for: something in it, not scenery, not primed or rotting, nothing refused by a full bag. */
  _evoLootableBody(c) {
    return !!(c && !c.looted && !c.consumed && !c.fallen && !c.refused && !c.mine && !c.miasma && c.loot && c.loot.length);
  },

  // ------------------------------------------------------------------ Eight-Fold Grasp
  /** "Shadowy tentacles reach out to bodies within a short range and draw their loot back to you, even while you are
   *  fighting." Every TENTACLE_EVERY seconds, up to TENTACLE_MAX bodies within TENTACLE_REACH, nearest first. */
  _evoTentacleTick(dt) {
    this._evoTentacleT = (this._evoTentacleT || 0) + (dt || 0);
    if (this._evoTentacleT < TENTACLE_EVERY) return 0;
    this._evoTentacleT = 0;
    const x = this.world.x, y = this.world.y;
    const bodies = (this.corpses || []).filter(c => this._evoLootableBody(c) && Math.hypot(c.x - x, c.y - y) <= TENTACLE_REACH)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y)).slice(0, TENTACLE_MAX);
    let n = 0;
    for (const c of bodies) n += this._evoLootRemote(c, '#5e35b1', n);
    return n;
  },

  // ------------------------------------------------------------------ Shroud-Weaving
  /** Called as a monster's body is made (corpseMixin._corpseFromMonster): wrapped if it died carrying your conditions. */
  _evoShroudOnBody(c, m) {
    if (!c || !m || !this._evoPassive('shroud')) return false;
    // an affliction you laid: something that works on the body (burn, poison, bleed, a curse, a drain) -- a bare stun
    // or slow binds nothing
    const AFFLICT = [TAG.affliction, TAG.dot, TAG.wounding, TAG.drain, TAG.amplify, TAG.attribute];
    const mine = Object.entries(m.debuffs || {}).some(([k, d]) => {
      if (!d || d.fromPlayer === false) return false;
      const def = conditionDef(k);
      return !!def && AFFLICT.some(t => hasTag(def, t));
    });
    if (!mine) return false;
    c.shroud = true;
    c.tint = SHROUD_TINT;
    c.name = `Shrouded ${c.name || 'body'}`;
    if (c.sprite && c.sprite.setTint) c.sprite.setTint(SHROUD_TINT);
    if (this._floatText) this._floatText(c.x, c.y - 40, 'Shrouded', '#efebe9');
    return true;
  },

  /** "A shrouded corpse cannot be raised, consumed or used by enemy abilities." The door an enemy's use of a body asks. */
  _corpseUsableByEnemy(c) { return !!(c && !c.consumed && !c.shroud); },

  /** How far E reaches for this body: a shrouded one from SHROUD_REACH, and the tentacles' reach with Eight-Fold Grasp. */
  _evoCorpseReach(c, base) {
    let r = base;
    if (c && c.shroud) r = Math.max(r, SHROUD_REACH);
    if (this._evoPassive('tentacleLoot')) r = Math.max(r, TENTACLE_REACH);
    return r;
  },

  // ------------------------------------------------------------------ Borderless Spoils
  /** Every unlooted kill in the region you stand in -- or, indoors, in the room you are in. */
  _evoRegionBodies() {
    const room = this._insideRoom || null;
    const reg = this.currentRegion || null;
    return (this.corpses || []).filter(c => {
      if (!this._evoLootableBody(c)) return false;
      if (room) return c.room === room;
      if (c.room) return false;
      if (!reg) return true;
      const at = regionAt(c.x, c.y);
      return !!at && at.id === reg.id;
    });
  },

  /** Walking out of a dungeon or an astral realm: whatever its dead still hold is kept for you (and the bodies go). */
  _evoBankRoomSpoils(room) {
    const p = this.player;
    const bodies = (this.corpses || []).filter(c => c && c.room === room && this._evoLootableBody({ ...c, refused: false }));
    if (!bodies.length) return 0;
    const loot = [];
    for (const c of bodies) {
      for (const it of c.loot) loot.push(it);
      c.loot = []; c.looted = true;
      if (this._removeCorpse) this._removeCorpse(c);
    }
    const place = room.name || (room.astral ? 'an astral realm' : 'a dungeon');
    p.evoSpoils = Array.isArray(p.evoSpoils) ? p.evoSpoils : [];
    p.evoSpoils.unshift({ place, bodies: bodies.length, loot: loot.slice(0, 200) });
    if (p.evoSpoils.length > SPOILS_CAP) p.evoSpoils.length = SPOILS_CAP;
    if (this._floatText) this._floatText(this.world.x, this.world.y - 60, `Borderless Spoils: ${bodies.length} bod${bodies.length === 1 ? 'y' : 'ies'} in ${place} kept for you (map)`, '#ffe082');
    return bodies.length;
  },

  /** Take one departure's spoils (from the map's list). What the bag refuses stays in the entry. */
  _evoTakeSpoils(i) {
    const list = (this.player && this.player.evoSpoils) || [];
    const e = list[Number(i)];
    if (!e || !this._lootCorpse) return 0;
    const holder = { loot: e.loot || [], looted: false, x: this.world.x, y: this.world.y };
    const got = this._lootCorpse(holder);
    if (holder.loot.length) e.loot = holder.loot; else list.splice(Number(i), 1);
    return got;
  },

  /** Gold rings on the map for the region's unlooted kills; the world map's are remembered for a click. */
  _evoSpoilMapDots(ctx, toM, onLayer, onMap) {
    if (!this._evoPassive('regionLoot') || !ctx) return;
    const isWorld = !!(ctx.canvas && ctx.canvas.id === 'worldMapCanvas');
    if (isWorld) this._evoSpoilDots = [];
    for (const c of this._evoRegionBodies()) {
      if (onLayer && !onLayer(c.x, c.y)) continue;
      const q = toM(c.x, c.y);
      if (onMap && !onMap(q)) continue;
      ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI * 2); ctx.stroke();
      if (isWorld) this._evoSpoilDots.push({ x: q.x, y: q.y, c });
    }
  },

  /** A click on the world map: the nearest gold ring within a few pixels is looted where it lies. */
  _evoMapClick(mx, my) {
    const hit = (this._evoSpoilDots || []).map(d => ({ d, k: Math.hypot(d.x - mx, d.y - my) })).filter(o => o.k <= 8).sort((a, b) => a.k - b.k)[0];
    if (!hit) return 0;
    const got = this._evoLootRemote(hit.d.c, null);
    if (this._drawWorldMap) { try { this._drawWorldMap(); } catch (e) { /* the list is redrawn with it */ } }
    return got;
  },

  /** The list beside the map: this region's kills and what was kept from places left behind. */
  _evoSpoilsPanel() {
    if (typeof document === 'undefined') return;
    const stage = document.getElementById('mapStage');
    if (!stage) return;
    let el = document.getElementById('evoSpoils');
    if (!this._evoPassive('regionLoot')) { if (el) el.style.display = 'none'; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'evoSpoils';
      el.style.cssText = 'position:absolute;left:8px;bottom:34px;max-width:300px;max-height:45%;overflow:auto;padding:6px 8px;border-radius:6px;'
        + 'background:rgba(14,12,20,.86);border:1px solid #ffd54f;color:#fff3c4;font:12px system-ui,sans-serif;line-height:1.35;z-index:3;';
      stage.appendChild(el);
    }
    const bodies = this._evoRegionBodies();
    const here = this._insideRoom ? (this._insideRoom.name || 'here') : ((this.currentRegion && this.currentRegion.name) || 'this region');
    const kept = (this.player.evoSpoils || []);
    const rows = bodies.slice(0, 8).map(c => {
      const d = Math.round(Math.hypot(c.x - this.world.x, c.y - this.world.y) / TILE);
      return `<div>${esc(c.name)} <span style="opacity:.6">(${c.loot.length}, ${d} tiles)</span> <button class="action-btn" data-evospoil="body" data-evoi="${this.corpses.indexOf(c)}">Loot</button></div>`;
    }).join('');
    const keptRows = kept.map((e, i) => `<div>${esc(e.place)} <span style="opacity:.6">(${e.bodies} bod${e.bodies === 1 ? 'y' : 'ies'}, ${e.loot.length} things)</span> <button class="action-btn" data-evospoil="kept" data-evoi="${i}">Take</button></div>`).join('');
    el.innerHTML = `<b>Borderless Spoils</b><div style="opacity:.75">Click a gold ring on the map to loot that kill.</div>`
      + `<div style="margin-top:4px">${bodies.length} unlooted in ${esc(here)}${bodies.length > 1 ? ' <button class="action-btn" data-evospoil="all">Loot all</button>' : ''}</div>${rows}`
      + (kept.length ? `<div style="margin-top:4px"><b>Left behind</b></div>${keptRows}` : '');
    el.style.display = 'block';
  },

  // ------------------------------------------------------------------ Drawn From Nowhere
  _evoVaultLoad() { return loadVault(); },
  _evoVaultSave(v) { return saveVault(v); },
  _evoClockNow() { return this._clockT || 0; },

  /** { ready, hours } -- whether a stone can be called, and the game hours until it can. */
  _evoStoneCallState() {
    const at = this.player && this.player.evoStoneCall && this.player.evoStoneCall.at;
    const now = this._evoClockNow();
    if (!Number.isFinite(at) || now < at) return { ready: true, hours: 0 };
    const left = STONE_CALL_PERIOD - (now - at);
    return left <= 0 ? { ready: true, hours: 0 } : { ready: false, hours: Math.ceil(left * 24 / STONE_CALL_PERIOD) };
  },

  _evoStoneName(id) {
    try { if (this._vaultNameOf) return this._vaultNameOf('stones', id).text; } catch (e) { /* the id, then */ }
    return String(id);
  },

  /** Every stone you own that is not in your bag: [{ src: 'vault'|'shop'|'bag', key, id, where }]. */
  _evoCallableStones() {
    const p = this.player, out = [];
    for (const { id, n } of vaultList(this._evoVaultLoad(), 'stones')) out.push({ src: 'vault', key: id, id, n, where: 'the reliquary' });
    (p.evoSoldStones || []).forEach((r, i) => { if (r && r.id) out.push({ src: 'shop', key: i, id: r.id, n: 1, where: `sold to ${r.vendor || 'a shop'}`, price: r.price }); });
    const bag = p.deathBag && p.deathBag.inv && p.deathBag.inv.stones;
    if (Array.isArray(bag)) {
      const counts = {};
      for (const id of bag) counts[id] = (counts[id] || 0) + 1;
      for (const [id, n] of Object.entries(counts)) out.push({ src: 'bag', key: id, id, n, where: 'the pack you died with' });
    }
    return out;
  },

  /** Call one stone to your hand. Returns the id called, or null (and says why). */
  _evoCallStone(src, key) {
    const p = this.player;
    const say = (t, col = '#ef9a9a') => { if (this._floatText) this._floatText(this.world.x, this.world.y - 54, t, col); };
    if (!this._evoPassive('callStone')) return null;
    const st = this._evoStoneCallState();
    if (!st.ready) { say(`Drawn From Nowhere recovers in ${st.hours}h`); return null; }
    let id = null;
    if (src === 'vault') {
      const v = this._evoVaultLoad();
      if (vaultWithdraw(v, 'stones', key, 1) !== 1) return null;
      if (!this._evoVaultSave(v)) { say('The reliquary did not answer the call'); return null; }   // never a stone in two places
      if (this._vault) this._vault = v;
      id = key;
    } else if (src === 'shop') {
      const list = p.evoSoldStones || [];
      const r = list[Number(key)];
      if (!r || !r.id) return null;
      list.splice(Number(key), 1);
      id = r.id;
      // "A stone called from a shop leaves its price owed, and the vendor remembers."
      p.evoShopDebts = (p.evoShopDebts && typeof p.evoShopDebts === 'object') ? p.evoShopDebts : {};
      const d = p.evoShopDebts[r.shop] || { vendor: r.vendor || 'the vendor', owed: 0 };
      d.owed += Math.max(1, Math.round(r.price || 1));
      p.evoShopDebts[r.shop] = d;
      say(`${d.vendor} will remember this (${this._coinWord ? this._coinWord(d.owed) : d.owed} owed)`, '#ffcc80');
    } else if (src === 'bag') {
      const b = p.deathBag, arr = b && b.inv && b.inv.stones;
      const at = Array.isArray(arr) ? arr.indexOf(key) : -1;
      if (at < 0) return null;
      arr.splice(at, 1);
      if (!arr.length) delete b.inv.stones;
      b.count = Math.max(0, (b.count || 1) - 1);
      if (b.count <= 0) { p.deathBag = null; if (this._clearDeathBagSprite) this._clearDeathBagSprite(); }
      id = key;
    } else return null;
    p.inventory = p.inventory || {};
    (p.inventory.stones = p.inventory.stones || []).push(id);
    p.evoStoneCall = { at: this._evoClockNow() };
    say(`+${this._evoStoneName(id)} (called)`, '#b388ff');
    if (this._evoFx) this._evoFx('summon', 'dimension', this.world.x, this.world.y, 0.8);
    if (this._inventoryOpen && this._renderInventory) this._renderInventory();
    if (this._vaultOpen && this._renderVault) this._renderVault();
    return id;
  },

  /** _sellItem, for a stone: which shop has it now, and what it will cost to call it back. */
  _evoNoteSoldStone(id, paid) {
    const p = this.player;
    if (!p || !id) return;
    let price = paid || 1;
    try { if (this._sellRarity) price = Math.max(price, basePriceFor('stone', this._sellRarity('stone', id))); } catch (e) { /* what was paid */ }
    p.evoSoldStones = Array.isArray(p.evoSoldStones) ? p.evoSoldStones : [];
    p.evoSoldStones.unshift({ id, shop: this._shopId || 'shop', vendor: this._evoShopVendor || 'the vendor', price: Math.round(price) });
    if (p.evoSoldStones.length > SOLD_CAP) p.evoSoldStones.length = SOLD_CAP;
  },

  /** _openShop (through evoMixin's `shop` event): the vendor you owe for a called stone collects, as far as your purse goes. */
  _evoOnShopOpen(shopId, npcName) {
    this._evoShopVendor = npcName || null;
    const p = this.player;
    const d = p && p.evoShopDebts && p.evoShopDebts[shopId];
    if (!d || !(d.owed > 0) || !p.coins) return 0;
    const pay = Math.min(d.owed, Math.floor(coinPurseValue(p.coins)));
    if (pay > 0 && spendCoins(p.coins, pay)) d.owed -= pay;
    const word = (n) => (this._coinWord ? this._coinWord(n) : `${n}`);
    const who = d.vendor || npcName || 'The vendor';
    if (d.owed <= 0) {
      delete p.evoShopDebts[shopId];
      if (this._floatText) this._floatText(this.world.x, this.world.y - 60, `${who}: "The stone that walked off my shelf. ${word(pay)}." Paid.`, '#ffcc80');
    } else if (this._floatText) {
      this._floatText(this.world.x, this.world.y - 60, `${who} remembers: ${word(d.owed)} still owed for that stone`, '#ef9a9a');
    }
    if (this._updateHud) { try { this._updateHud(); } catch (e) { /* the purse shows next frame */ } }
    return pay;
  },

  /** The picker: every stone you can call, by where it is. */
  _evoCallPanel(open = true) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('evoCallPanel');
    if (!open) { if (el) el.style.display = 'none'; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'evoCallPanel';
      el.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:60;min-width:300px;max-width:420px;max-height:60%;overflow:auto;'
        + 'padding:10px 12px;border-radius:8px;background:rgba(14,12,20,.95);border:1px solid #b388ff;color:#ede7f6;font:13px system-ui,sans-serif;line-height:1.4;';
      document.body.appendChild(el);
    }
    const st = this._evoStoneCallState();
    const rows = this._evoCallableStones().map(s => `<div>${esc(this._evoStoneName(s.id))}${s.n > 1 ? ` ×${s.n}` : ''} <span style="opacity:.65">— ${esc(s.where)}${s.src === 'shop' ? `, ${esc(this._coinWord ? this._coinWord(s.price) : s.price)} owed if called` : ''}</span> `
      + `<button class="action-btn" data-evocallsrc="${s.src}" data-evocallkey="${esc(s.key)}" ${st.ready ? '' : 'disabled'}>Call</button></div>`).join('');
    el.innerHTML = `<b>Drawn From Nowhere</b> <button class="action-btn" data-evocallclose="1" style="float:right">Close</button>`
      + `<div style="opacity:.75;margin:4px 0">${st.ready ? 'One stone to your hand, from any distance. Then 24 hours to recover.' : `Recovers in ${st.hours} hours.`}</div>`
      + (rows || '<div style="opacity:.6">Every stone you own is already in your bag.</div>');
    el.style.display = 'block';
  },

  // ------------------------------------------------------------------ the card (natureMixin._natureListHtml)
  /** What the Character page adds under one of these evolutions: its numbers, and the button for the one you use. */
  _evoCardExtra(evo) {
    const ps = (evo && evo.spec && evo.spec.passive) || {};
    const bits = [];
    if (ps.tentacleLoot) bits.push(`Tentacles empty bodies within ${Math.round(TENTACLE_REACH / TILE)} tiles of you, eight at a time.`);
    if (ps.regionLoot) {
      const n = this.player ? this._evoRegionBodies().length : 0, k = ((this.player && this.player.evoSpoils) || []).length;
      bits.push(`On the map: ${n} unlooted kill${n === 1 ? '' : 's'} here${k ? `, ${k} place${k === 1 ? '' : 's'} left behind` : ''}.`);
    }
    if (ps.shroud) bits.push(`A shrouded body can be looted with E from ${Math.round(SHROUD_REACH / TILE)} tiles.`);
    if (ps.callStone) {
      const st = this._evoStoneCallState();
      bits.push(`<button type="button" class="action-btn" data-evocall="1">Call a stone</button> ${st.ready ? 'ready' : `recovers in ${st.hours}h`}`);
    }
    return bits.length ? `<br><span class="nature-key" style="opacity:.85;">${bits.join(' ')}</span>` : '';
  },

  // ------------------------------------------------------------------ the clicks (wired once)
  _evoWireLootClicks() {
    if (this._evoLootWired || typeof document === 'undefined' || !document.addEventListener) return;
    this._evoLootWired = true;
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      if (!t || !t.closest) return;
      if (t.id === 'worldMapCanvas' && this._evoSpoilDots && this._evoSpoilDots.length) {
        const r = t.getBoundingClientRect();
        this._evoMapClick((ev.clientX - r.left) * (t.width / (r.width || 1)), (ev.clientY - r.top) * (t.height / (r.height || 1)));
        if (this._evoSpoilsPanel) this._evoSpoilsPanel();
        return;
      }
      const sp = t.closest('[data-evospoil]');
      if (sp) {
        const what = sp.dataset.evospoil;
        if (what === 'body') { const c = (this.corpses || [])[Number(sp.dataset.evoi)]; if (c) this._evoLootRemote(c, null); }
        else if (what === 'all') { let n = 0; for (const c of this._evoRegionBodies()) n += this._evoLootRemote(c, null, n); }
        else if (what === 'kept') this._evoTakeSpoils(sp.dataset.evoi);
        if (this._drawWorldMap) { try { this._drawWorldMap(); } catch (e) { /* the list below still redraws */ } }
        this._evoSpoilsPanel();
        return;
      }
      if (t.closest('[data-evocall]')) { this._evoCallPanel(true); return; }
      if (t.closest('[data-evocallclose]')) { this._evoCallPanel(false); return; }
      const cb = t.closest('[data-evocallsrc]');
      if (cb) { this._evoCallStone(cb.dataset.evocallsrc, cb.dataset.evocallkey); this._evoCallPanel(true); }
    });
  },
};
