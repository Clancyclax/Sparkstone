// ============================================================================
// ROUND 371 -- CADENCE'S MARKET, AND WHAT IS SOLD BEHIND IT.
//
//   3)   "Move any market stalls that are on the roads added to Cadence to space away from the road."
//   3.1) "Change 1 of them to a skill book vendor and another to a vendor for fruity drinks"
//   3.2) "Find a somewhat sketchy location in the city where a market stall sells essences and awakening stones
//         that are associated with somewhat scary things"
//        Essences: Blood, Dark, Sin, Skunk, Bat, Spider, Crocodile, and very rarely Death
//        Awakening stones: Blood, Dark, Sin, Skunk, Bat, Spider, Crocodile
//        "The vendor should be circumspect and will not sell until he's asked you who you're working for."
//        "If you see a Death Essence in his inventory you can tell any adventurer society official and get a quest to
//         arrest the vendor for selling restricted essences."
//
// THE STALLS. A hand-placed awning stands where it was typed unless a road runs under it, beside it, or under the
// stallholder a tile behind it; then it moves to the nearest paved tile clear of the road (`_stallOffRoad`). Of
// Cadence's market stalls, the first whose trade another stall already sells becomes the bookstall (the skill-book
// counter's own shelf, `skillbooks_market`) and the next the juice stall (marketGoods.js FRUIT_DRINKS).
//
// THE HOODED TRADER. One stall in the alley behind the tavern -- the market's back side, off the street,
// in the tavern's shadow -- tried from a short list of spots (SHADY_SPOTS, tiles from the city's origin) until one
// takes a stall clear of every road. He sells three to five of the seven essences and three to four of the seven
// stones each day, at a fifth over the hall's prices; one day in twelve a Death essence is among them. He asks who
// you work for before he shows you anything, once a day:
//   "Myself." / "None of your business."  -> he sells, for the rest of the day
//   "The Adventure Society."                -> he does not, today
// Opening his shelf on a day it holds a Death essence is having SEEN one. Any Society official (the desk, the
// Guildmaster: WorldScene `_societyRole`) then has a "Report" button; reporting it is the mission "Restricted Goods":
// go back and arrest him. He gives himself up (he was always going to be caught by one of you), the stall stands
// empty from then on, and the official who sent you pays for it.
// ============================================================================
import { TILE } from '../data/iso.js';
import { isCarriagewayTile } from '../data/town.js';
import { TILE_CITY } from '../data/town.js';
import { grantCoins } from '../data/inventory.js';

export const SHADY_ESSENCES = ['essBlood', 'shadow', 'essSin', 'essSkunk', 'essBat', 'essSpider', 'essCrocodile'];
export const SHADY_STONES = ['stoneBlood', 'stoneDark', 'stoneSin', 'stoneSkunk', 'stoneBat', 'stoneSpider', 'stoneCrocodile'];
/** Sin is legendary: its essence and its stone are on the table one day in five, not most days. */
export const SHADY_SIN_CHANCE = 0.2;
export const SHADY_DEATH = 'essDeath';
export const SHADY_DEATH_CHANCE = 1 / 12;
export const SHADY_MARKUP = 1.2;
export const SHADY_SHOP = 'market_shady';
export const SHADY_REWARD = { rank: 'iron', amount: 6 };
/** Tiles from Cadence's origin: behind the tavern (-120, 20) first, then the lanes off the market's back. */
export const SHADY_SPOTS = [[-127, 24], [-125, 30], [-131, 21], [-118, 28], [-137, 26], [-160, 4], [-162, 44]];
const MARKET_MIN_GAP_TILES = 5;

const SHADY_ASK = "He doesn't look up from the cloth he's folding.\n\n\"Who are you working for?\"";

export const ShadyTraderMixin = {
  // ------------------------------------------------------------------ stalls
  /** Is a road under (tx, ty) or within `r` tiles of it? */
  _roadNear(tx, ty, r = 1) {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (isCarriagewayTile(this._tileTypeAt(tx + i, ty + j))) return true;
    return false;
  },

  /** Where a stall at `rec` should stand instead, or null if it may stay. Clear of the road (a tile around the stall
   *  and the stallholder), on paving, out of the water, out of anything solid, five tiles from every other stall. */
  _stallOffRoad(rec, laid = [], opts = {}) {
    const vendorTile = (x, y) => [Math.floor((x - 16 - TILE) / TILE), Math.floor((y - 16 - TILE) / TILE)];
    const tx0 = Math.floor(rec.x / TILE), ty0 = Math.floor(rec.y / TILE);
    const clear = (tx, ty) => {
      if (this._roadNear(tx, ty, 1)) return false;
      const [vx, vy] = vendorTile(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
      return !this._roadNear(vx, vy, 0);
    };
    if (!opts.force && clear(tx0, ty0)) return null;
    const ok = (tx, ty) => {
      if (!clear(tx, ty)) return false;
      if (this._tileTypeAt(tx, ty) !== TILE_CITY) return false;
      const wx = tx * TILE + TILE / 2, wy = ty * TILE + TILE / 2;
      if (this._isWaterAt(wx, wy) || this._collidesObstacle(wx, wy, 30)) return false;
      for (const o of laid) if (o !== rec && Math.hypot(o.x - wx, o.y - wy) < MARKET_MIN_GAP_TILES * TILE) return false;
      for (const o of (this.cityProps || [])) if (o !== rec && Math.hypot(o.x - wx, o.y - wy) < (o.radius || 10) + 18) return false;
      return true;
    };
    for (let r = 1; r <= (opts.maxR || 10); r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (ok(tx0 + dx, ty0 + dy)) return { x: (tx0 + dx) * TILE + TILE / 2, y: (ty0 + dy) * TILE + TILE / 2 };
      }
    }
    return null;
  },

  /** A stall changes what it sells: its trade, its art, and the stallholder behind it. */
  _retradeStall(rec, trade, n = 0) {
    rec.trade = trade;
    // a generated stall takes the new trade's art; a hand-placed awning is drawn off the city-prop sheet and keeps its own
    if (this._stallFrameFor && !rec.placed) rec.frame = this._stallFrameFor(trade, n);
    const v = rec.vendor;
    const info = this._marketTradeInfo ? this._marketTradeInfo(trade) : null;
    if (v && info) {
      v.name = info.role; v.dialogue = info.line; v.stallTrade = trade;
      v.shopId = this._marketShopId(trade);
      if (trade === 'shady') v.shady = true;
    }
  },

  _isCadenceStall(rec) {
    if (rec.settlement === 'nek_city') return true;
    const st = this._settlementAt ? this._settlementAt(rec.x, rec.y) : null;
    return !!(st && st.id === 'nek_city');
  },

  /** Called at the end of `_buildCityProps`, with its `put` and the stalls laid. */
  _marketSpecials(put, laid) {
    if (!laid || !laid.length) return;
    // 3.1 -- the bookstall and the juice stall, out of trades the market already has twice
    const cad = laid.filter(r => this._isCadenceStall(r));
    const count = {};
    for (const r of cad) count[r.trade] = (count[r.trade] || 0) + 1;
    const want = ['books', 'drinks'];
    for (const r of cad) {
      if (!want.length) break;
      if ((count[r.trade] || 0) < 2) continue;
      count[r.trade]--;
      this._retradeStall(r, want.shift(), cad.indexOf(r));
    }
    this._cadenceSpecialStalls = cad.filter(r => r.trade === 'books' || r.trade === 'drinks').length;
    // 3.2 -- the hooded trader
    this._placeShadyStall(put, laid);
  },

  _placeShadyStall(put, laid) {
    this._shadyStall = null;
    let o;
    try { o = this._outlineOriginTile(); } catch (e) { return; }
    if (!o) return;
    for (const [rx, ry] of SHADY_SPOTS) {
      const seed = { x: (o.tx + rx) * TILE + TILE / 2, y: (o.ty + ry) * TILE + TILE / 2 };
      const spot = this._stallOffRoad(seed, laid, { force: true, maxR: 4 }) || null;
      const at = spot || (this._roadNear(o.tx + rx, o.ty + ry, 1) ? null : seed);
      if (!at) continue;
      const art = this._cityStallArt ? this._cityStallArt() : null;
      if (!art) return;
      const rec = put(art.key, art.art, this._stallFrameFor('shady', 0), at.x, at.y, art.def,
        { prop: 'stall', stall: 900, trade: 'shady', settlement: 'nek_city', shady: true });
      if (!rec) continue;
      laid.push(rec);
      this._stageStallVendor(rec, 'shady');
      if (rec.vendor) { rec.vendor.shady = true; rec.vendor.name = 'Hooded Trader'; }
      this._shadyStall = rec;
      return;
    }
  },

  // ------------------------------------------------------------------ state
  _shadyState() {
    const p = this.player;
    if (!p.shady || typeof p.shady !== 'object') p.shady = { vouchedDay: null, refusedDay: null, sawDeath: false, deathDay: null, quest: null };
    return p.shady;
  },

  _shadyGone() {
    const q = this._shadyState().quest;
    return q === 'arrested' || q === 'done';
  },

  /** Once a frame: an arrested trader is not at his stall. */
  _shadyTick() {
    const rec = this._shadyStall;
    if (!rec || !rec.vendor || !this.player) return;
    if (!this._shadyGone()) return;
    const v = rec.vendor;
    v.hidden = true;
    if (v.sprite && v.sprite.visible) v.sprite.setVisible(false);
  },

  // ------------------------------------------------------------------ talk
  _shadyTalk(npc) {
    const st = this._shadyState();
    const day = this._dayIndex ? this._dayIndex() : 0;
    if (this._shadyGone()) return;
    if (st.quest === 'arrest') {
      this._openDialogue(npc.name || 'Hooded Trader',
        "He sees the Society in how you're standing before you've said a word. His hands go flat on the cloth.\n\n"
        + "\"Ah. That's how it is.\"", npc,
        [{ act: 'shady|arrest', label: "By order of the Adventure Society, you're under arrest." },
          { act: 'shady|bye', label: 'Not yet.' }]);
      return;
    }
    if (st.vouchedDay === day) { this._openShop(SHADY_SHOP, npc.name || 'Hooded Trader'); return; }
    if (st.refusedDay === day) {
      this._openDialogue(npc.name || 'Hooded Trader', "\"I told you. Nothing here for the Society. Come back when you've had a think about who you are.\"", npc);
      return;
    }
    this._shadyNpc = npc;
    this._openDialogue(npc.name || 'Hooded Trader', SHADY_ASK, npc, [
      { act: 'shady|self', label: 'Myself.' },
      { act: 'shady|none', label: 'None of your business.' },
      { act: 'shady|society', label: 'The Adventure Society.' },
    ]);
  },

  _shadyAct(act) {
    const st = this._shadyState();
    const day = this._dayIndex ? this._dayIndex() : 0;
    const npc = this._shadyNpc || (this._shadyStall && this._shadyStall.vendor) || null;
    const name = (npc && npc.name) || 'Hooded Trader';
    const later = (fn) => this.time.delayedCall(0, fn);
    if (act === 'shady|self' || act === 'shady|none') {
      st.vouchedDay = day;
      const line = act === 'shady|self'
        ? "\"Mm. Freelance. Good.\"\n\nHe lifts a corner of the cloth. Underneath, the cubes don't catch the light the way the ones in the hall do."
        : "\"That's the right answer.\"\n\nThe cloth comes off a tray of essences and a row of stones that look like they were dug up rather than found.";
      later(() => this._openDialogue(name, line, null, [{ act: 'shady|shop', label: 'Show me.' }]));
    } else if (act === 'shady|society') {
      st.refusedDay = day;
      later(() => this._openDialogue(name, "\"Then you're lost. The hall's back that way, past the tavern.\"\n\nHe goes back to folding the cloth, and doesn't look up again.", null));
    } else if (act === 'shady|shop') {
      later(() => this._openShop(SHADY_SHOP, name));
    } else if (act === 'shady|arrest') {
      if (st.quest !== 'arrest') return;
      st.quest = 'arrested';
      st.arrestedDay = day;
      this._shadyTick();
      later(() => this._openDialogue(name,
        "He doesn't run. He looks at the alley, and the tavern's back door, and you, and does the arithmetic.\n\n"
        + "\"It was only ever going to be one of you,\" he says, and holds out his wrists. \"Tell them the Death one "
        + "came from a man who said he found it. They always say they found it.\"\n\n"
        + "A pair of Society wardens take him from you at the mouth of the alley. The stall stays where it is, empty.", null));
      if (this._floatText) this._floatText(this.world.x, this.world.y - 62, 'The hooded trader is in custody', '#ffd54f');
    } else if (act === 'shady|report') {
      if (st.quest) return;
      st.quest = 'arrest';
      later(() => this._openDialogue('The Adventure Society',
        "The clerk stops writing.\n\n\"A Death essence. On a table. In Cadence.\" She puts the pen down very carefully. "
        + "\"That's restricted, and not the way a permit is restricted — the way a plague is. Behind the tavern, you said?\"\n\n"
        + "\"Bring him in. Don't buy it, don't touch it, and don't let him talk you into either. The Society will "
        + "see you're paid.\"", null));
      if (this._floatText) this._floatText(this.world.x, this.world.y - 62, 'New mission: Restricted Goods', '#ffd54f');
    } else if (act === 'shady|reward') {
      if (st.quest !== 'arrested') return;
      st.quest = 'done';
      grantCoins(this.player.coins, SHADY_REWARD.rank, SHADY_REWARD.amount);
      later(() => this._openDialogue('The Adventure Society',
        `"Signed for, and in a cell. The essence is in the vault where it can't hurt anybody." She counts out ${SHADY_REWARD.amount} iron.\n\n`
        + "\"For the record: you did that well. Most people buy it first and report it second.\"", null));
    }
    if (this._inventoryOpen && this._renderInventory) this._renderInventory();
  },

  // ------------------------------------------------------------------ the shelf
  /** His day's shelf, through the pricers `_restockShop` holds: three to five essences, three to four stones, at a
   *  fifth over the hall; a Death essence one day in twelve. */
  _shadyShelf(rng, pricedEssence, pricedStone, rarityOf) {
    const draw = (pool, n) => { const bag = pool.slice(), out = []; while (out.length < n && bag.length) out.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]); return out; };
    const ne = 3 + Math.floor(rng() * 3), ns = 3 + Math.floor(rng() * 2);
    const sin = rng() < SHADY_SIN_CHANCE;
    const notSin = (id) => !/Sin$/.test(id);
    for (const id of draw(SHADY_ESSENCES.filter(notSin), ne)) pricedEssence(id, rarityOf('essence', id), SHADY_MARKUP);
    if (sin) pricedEssence('essSin', rarityOf('essence', 'essSin'), SHADY_MARKUP);
    if (rng() < SHADY_DEATH_CHANCE) pricedEssence(SHADY_DEATH, rarityOf('essence', SHADY_DEATH), SHADY_MARKUP * 1.5);
    for (const id of draw(SHADY_STONES.filter(notSin), ns)) pricedStone(id, rarityOf('stone', id), SHADY_MARKUP);
    if (sin && rng() < 0.5) pricedStone('stoneSin', rarityOf('stone', 'stoneSin'), SHADY_MARKUP);
  },

  /** The shelf has been opened: a Death essence on it is a Death essence seen. */
  _shadyShelfSeen(items) {
    if (!items || !items.some(i => i.kind === 'essence' && i.id === SHADY_DEATH)) return;
    const st = this._shadyState();
    if (!st.sawDeath) {
      st.sawDeath = true;
      st.deathDay = this._dayIndex ? this._dayIndex() : 0;
      if (this._floatText) this._floatText(this.world.x, this.world.y - 70, 'A Death essence. That is restricted.', '#ef9a9a');
    }
  },

  // ------------------------------------------------------------------ the Society
  /** A Society official's lines about it (WorldScene `_societyAddendum`). */
  _shadyAddendum(npc) {
    const body = [], choices = [];
    if (!npc || !this._societyRole || !this._societyRole(npc)) return { body, choices };
    const st = this._shadyState();
    if (st.sawDeath && !st.quest) choices.push({ label: 'Report a trader selling a Death essence', act: 'shady|report' });
    else if (st.quest === 'arrest') body.push('Restricted Goods: the hooded trader in the alley behind the tavern is still at his stall.');
    else if (st.quest === 'arrested') choices.push({ label: 'The hooded trader is in custody', act: 'shady|reward' });
    return { body, choices };
  },

  /** Its row on the Quests page. */
  _shadyQuestRow() {
    const q = this._shadyState().quest;
    if (q !== 'arrest' && q !== 'arrested') return '';
    return `<div class="row"><div>Restricted Goods — arrest the hooded trader behind the tavern in Cadence
      <div style="opacity:0.6;font-size:11px;">He sold a Death essence. Any Society official will take the report and pay for the arrest.</div></div>
      <div>${q === 'arrested' ? 'report back to the Society' : 'find him'}</div></div>`;
  },
};
