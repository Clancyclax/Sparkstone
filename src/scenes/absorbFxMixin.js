// ===========================================================================
// ROUND 404 -- ABSORBING AN ESSENCE OR AN AWAKENING STONE IS A MOMENT.
//
//   "Absorbing an awakening stone or essence should be a bigger deal. Create a minor, 3-5 second animation for each
//    essence or awakening stone and when absorbing the game should take you out of inventory to watch the absorption
//    process."
//   "Absorbing your 3rd essence should start a 5 second animation of your 3 essences swirling around and plunging into
//    your body before your confluence appears above your head for a moment before being absorbed. Then it will go
//    straight into the rank up and black goo animation."
//
// Pressing Absorb (an essence) or Socket (a stone) closes the inventory and plays the absorption over the player, who
// is held still and unharmed while it runs; the bond itself is made when the animation ends, so the pages that say
// what was gained come after it. Each essence and stone draws its own: its icon, in its own colour, with a motif set
// by its family (a burst for fire and light, rain and rings for water and cold, shards for earth, stone and craft,
// streaks for blades and motion, petals for life and alchemy, an inward dark swirl for death, dark, blood and mind,
// spiralling motes for the beasts and fliers). The third essence instead plays the confluence sequence and goes
// straight into the rank-up aura and the goo; its pages wait until the goo is done.
// ===========================================================================
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import { STONE_CATALOG } from '../data/stoneCatalog.js';
import { ESSENCES } from '../data/abilities.js';
import { confluenceDefFor } from '../data/awakening.js';
import { essenceIconUrl, stoneIconUrl, confluenceIconUrl } from '../data/itemArt.js';
import { isoProject, isoDepth } from '../data/iso.js';

/** How long each kind runs (seconds). */
export const ABSORB_ESSENCE_S = 3.6, ABSORB_STONE_S = 3.0, ABSORB_CONFLUENCE_S = 5.0;
/** The motif each family draws. */
export const ABSORB_MOTIF = {
  fire: 'burst', light: 'burst', storm: 'burst', air: 'streaks', force: 'burst',
  water: 'rings', aquatic: 'rings', cold: 'rings',
  earth: 'shards', guard: 'shards', bludgeon: 'shards', craft: 'shards', order: 'shards',
  blade: 'streaks', polearm: 'streaks', ranged: 'streaks', motion: 'streaks',
  life: 'bloom', alchemy: 'bloom',
  death: 'void', dark: 'void', blood: 'void', mind: 'void', space: 'void', identity: 'void',
  beast: 'spiral', smallbeast: 'spiral', flyer: 'spiral', serpent: 'spiral',
};
export const ABSORB_MOTIFS = ['burst', 'rings', 'shards', 'streaks', 'bloom', 'void', 'spiral'];
/** The look of one absorption: the item's colour, its family's motif, and a seed so no two of a motif move alike. */
export function absorbLook(kind, id) {
  const rec = kind === 'stone' ? STONE_CATALOG[id] : ESSENCE_CATALOG[id];
  const color = rec && rec.color ? parseInt(rec.color.replace('#', ''), 16) : 0xffffff;
  const motif = (rec && ABSORB_MOTIF[rec.family]) || 'spiral';
  let seed = 0; for (const ch of String(id)) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return { color, motif, seed, name: rec ? rec.name : String(id), family: rec ? rec.family : null };
}
const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lighten = (c, k) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  return (Math.min(255, Math.round(r + (255 - r) * k)) << 16) | (Math.min(255, Math.round(g + (255 - g) * k)) << 8) | Math.min(255, Math.round(b + (255 - b) * k));
};

export const AbsorbFxMixin = {
  /** An icon (a data URL) as a texture, once; `cb(key)` when it is ready (now, if it already is). */
  _absorbIconTex(url, cb) {
    if (!url) { cb(null); return; }
    let h = 0; for (let i = 0; i < url.length; i += 7) h = (h * 33 + url.charCodeAt(i)) >>> 0;
    const key = `absorbIcon_${h}_${url.length}`;
    if (this.textures.exists(key)) { cb(key); return; }
    const img = new Image();
    img.onload = () => { try { if (!this.textures.exists(key)) this.textures.addImage(key, img); cb(key); } catch (e) { cb(null); } };
    img.onerror = () => cb(null);
    img.src = url;
  },

  /** The inventory's Absorb / Socket buttons come here: out of the inventory, the animation, then the bond. */
  _absorbBegin(kind, bagIdx, slot = null) {
    const p = this.player;
    if (!p || this._absorbFx) return false;
    const id = kind === 'stone' ? p.inventory.stones[bagIdx] : p.inventory.essences[bagIdx];
    if (!id) return false;
    // the cases the bond itself refuses (a full slot, no essence to socket into) are left to it, at once and unseen
    if (kind === 'essence') {
      const free = p.slotEssence.findIndex(s => s === null);
      if (free < 0 && !/^div/.test(id)) { this._equipEssence(bagIdx, slot); return false; }
    }
    if (kind === 'stone') {
      const sl = (slot === 'auto' || slot === undefined || slot === null || Number.isNaN(slot)) ? this._autoSocketSlot(id) : slot;
      const holds = sl === 3 ? !!p.confluence : (sl >= 0 && !!p.slotEssence[sl]);
      if (sl < 0 || !holds || (p.slotStones[sl] || []).length >= 4) return false;   // the socket refuses it; it says why itself
      slot = sl;
    }
    const third = kind === 'essence' && !p.confluence && !p.divineGod && p.slotEssence.filter(Boolean).length === 2 && !!ESSENCES[id];
    if (this._inventoryOpen) this._closeInventory();
    const g = this.add.graphics().setBlendMode(1);   // ADD
    const fx = this._absorbFx = { kind, id, bagIdx, slot, t: 0, g, icons: [], third, done: false };
    if (third) {
      const ids = [...p.slotEssence.filter(Boolean), id];
      fx.dur = ABSORB_CONFLUENCE_S;
      fx.trio = ids.map((eid, i) => ({ id: eid, look: absorbLook('essence', eid), a0: (i / 3) * Math.PI * 2, spr: null }));
      let conf = null;
      try { conf = confluenceDefFor(ids.map(e => ESSENCES[e])); } catch (e) { conf = null; }
      fx.conf = conf ? { name: conf.name, color: conf.color ? parseInt(String(conf.color).replace('#', ''), 16) : 0xffe082 } : null;
      for (const tr of fx.trio) this._absorbIconTex(essenceIconUrl(tr.id), (key) => { if (key && this._absorbFx === fx) { tr.spr = this.add.image(0, 0, key).setScale(1.1); fx.icons.push(tr.spr); } });
      if (fx.conf) this._absorbIconTex(confluenceIconUrl(fx.conf.name), (key) => { if (key && this._absorbFx === fx) { fx.confSpr = this.add.image(0, 0, key).setScale(1.4).setAlpha(0); fx.icons.push(fx.confSpr); } });
    } else {
      fx.dur = kind === 'stone' ? ABSORB_STONE_S : ABSORB_ESSENCE_S;
      fx.look = absorbLook(kind, id);
      fx.motes = [];
      const n = 14 + (fx.look.seed % 8);
      for (let i = 0; i < n; i++) fx.motes.push({ a: ((fx.look.seed >> (i % 16)) % 360) * Math.PI / 180 + i * 2.39996, r: 0.6 + ((fx.look.seed * (i + 3)) % 100) / 220, s: 0.7 + (i % 5) * 0.12 });
      const url = kind === 'stone' ? stoneIconUrl(id) : essenceIconUrl(id);
      this._absorbIconTex(url, (key) => { if (key && this._absorbFx === fx) { fx.spr = this.add.image(0, 0, key).setScale(1.2).setAlpha(0); fx.icons.push(fx.spr); } });
    }
    if (this._playSfxKey) this._playSfxKey('sfx_rankup');
    return true;
  },

  /** Every frame while one runs. */
  _absorbFxTick(dt) {
    const fx = this._absorbFx;
    if (!fx) { this._absorbFlushHeld(); return; }
    // clock time, not summed frame steps: a slow frame does not stretch the moment
    const now = this.time ? this.time.now : 0;
    if (fx.start == null) fx.start = now;
    fx.t = this._absorbFxFreeze != null ? this._absorbFxFreeze : (now - fx.start) / 1000;   // (a probe may hold a moment still)
    void dt;
    const p = this.player;
    if (p) p.invuln = Math.max(p.invuln || 0, 0.5);
    const base = isoProject(this.world.x, this.world.y);
    const chest = { x: base.x, y: base.y - 30 }, head = { x: base.x, y: base.y - 92 };
    const depth = isoDepth(this.world.x, this.world.y) + 6;
    const g = fx.g;
    g.clear(); g.setDepth(depth);
    for (const s of fx.icons) s.setDepth(depth + 1);
    if (fx.third) this._absorbDrawConfluence(fx, g, chest, head);
    else this._absorbDrawOne(fx, g, chest, head);
    if (fx.t >= fx.dur) this._absorbFinish(fx);
  },

  /** One essence or stone: up over the head, its motif around it, down into the chest, a flash. */
  _absorbDrawOne(fx, g, chest, head) {
    const L = fx.look, u = fx.t / fx.dur, c = L.color, hi = lighten(c, 0.55);
    const rise = ease(clamp01(u / 0.18)), sink = ease(clamp01((u - 0.72) / 0.2));
    const ix = head.x, iy = head.y + (1 - rise) * 40 + sink * (chest.y - head.y);
    const sc = 1.2 * (0.6 + 0.4 * rise) * (1 - 0.75 * sink);
    if (fx.spr) fx.spr.setPosition(ix, iy - Math.sin(fx.t * 3) * 3 * (1 - sink)).setScale(sc).setAlpha(clamp01(u / 0.12) * (1 - clamp01((u - 0.9) / 0.06)));
    // the glow behind the icon
    g.fillStyle(c, 0.18 + 0.12 * Math.sin(fx.t * 6)); g.fillCircle(ix, iy, 26 * sc + 6);
    g.fillStyle(hi, 0.22); g.fillCircle(ix, iy, 14 * sc + 3);
    const live = clamp01(u / 0.15) * (1 - clamp01((u - 0.86) / 0.1));
    // a column of its light from the icon down to the player
    g.fillStyle(c, 0.16 * live); g.fillRect(ix - 9, iy, 18, Math.max(0, chest.y + 26 - iy));
    g.fillStyle(hi, 0.12 * live); g.fillRect(ix - 3, iy, 6, Math.max(0, chest.y + 26 - iy));
    g.lineStyle(2, c, 0.5 * live); g.strokeEllipse(chest.x, chest.y + 26, 46 + 6 * Math.sin(fx.t * 4), 18);
    const conv = clamp01((u - 0.62) / 0.28);   // the motes come in as it sinks
    const t = fx.t;
    switch (L.motif) {
      case 'burst': {
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2 + t * 0.6, r0 = 18, r1 = 46 + 10 * Math.sin(t * 5 + i);
          const k = 1 - conv;
          g.lineStyle(3, i % 2 ? c : hi, 0.8 * live);
          g.lineBetween(ix + Math.cos(a) * r0 * k, iy + Math.sin(a) * r0 * k * 0.8, ix + Math.cos(a) * r1 * k, iy + Math.sin(a) * r1 * k * 0.8);
        }
        break;
      }
      case 'rings': {
        for (let i = 0; i < 3; i++) {
          const v = ((t * 0.9 + i / 3) % 1);
          g.lineStyle(2, i % 2 ? hi : c, 0.65 * (1 - v) * live);
          g.strokeEllipse(ix, iy + 22, (20 + 70 * v) * (1 - conv), (8 + 28 * v) * (1 - conv));
        }
        for (const m of fx.motes) {   // droplets falling past it
          const v = ((t * m.s + m.a) % 1);
          const x = ix + Math.cos(m.a * 7) * 40 * m.r * (1 - conv), y = iy - 50 + v * 90 * (1 - conv);
          g.fillStyle(hi, 0.8 * live); g.fillRect(x, y, 2, 4);
        }
        break;
      }
      case 'shards': {
        for (const m of fx.motes) {
          const a = m.a + t * 0.4 * m.s, r = 52 * m.r * (1 - conv) + 6;
          const x = ix + Math.cos(a) * r, y = iy + Math.sin(a) * r * 0.7;
          g.fillStyle(m.s > 1 ? hi : c, 0.85 * live);
          g.fillTriangle(x, y - 7, x - 4, y + 4, x + 4, y + 4);
        }
        break;
      }
      case 'streaks': {
        for (const m of fx.motes) {
          const v = ((t * 1.4 * m.s + m.a) % 1);
          const a = m.a, r = (70 * (1 - v)) * (1 - conv) + 4;
          const x = ix + Math.cos(a) * r, y = iy + Math.sin(a) * r * 0.7;
          g.lineStyle(3, m.s > 1 ? hi : c, 0.9 * live * v);
          g.lineBetween(x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 10);
        }
        break;
      }
      case 'bloom': {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2 + t * 0.5, r = (28 + 6 * Math.sin(t * 3 + i)) * (1 - conv);
          g.fillStyle(i % 2 ? c : hi, 0.55 * live);
          g.fillEllipse(ix + Math.cos(a) * r, iy + Math.sin(a) * r * 0.75, 20, 11);
        }
        break;
      }
      case 'void': {
        g.fillStyle(0x000000, 0.0);
        for (const m of fx.motes) {
          const v = ((t * 0.7 * m.s + m.a) % 1);
          const a = m.a + v * 4, r = 64 * (1 - v) * m.r * (1 - conv) + 3;
          g.fillStyle(m.s > 1 ? hi : c, 0.85 * live * (0.3 + v));
          g.fillCircle(ix + Math.cos(a) * r, iy + Math.sin(a) * r * 0.7, 2.5 + v * 2.5);
        }
        break;
      }
      default: {   // spiral
        for (const m of fx.motes) {
          const a = m.a + t * 2.2 * m.s, r = (24 + 30 * m.r) * (1 - conv);
          const x = ix + Math.cos(a) * r, y = iy + Math.sin(a) * r * 0.6 + Math.sin(t * 2 + m.a) * 6;
          g.fillStyle(m.s > 1 ? hi : c, 0.95 * live); g.fillCircle(x, y, 3.5);
        }
      }
    }
    // the flash as it goes in
    const fl = clamp01((u - 0.9) / 0.1);
    if (fl > 0) {
      g.fillStyle(hi, 0.6 * (1 - fl)); g.fillCircle(chest.x, chest.y, 10 + 30 * fl);
      g.lineStyle(3, c, 0.8 * (1 - fl)); g.strokeEllipse(chest.x, chest.y + 26, 30 + 70 * fl, 12 + 26 * fl);
    }
    if (this.playerSprite) this.playerSprite.setTint(fl > 0 ? lighten(c, 0.6) : 0xffffff);
  },

  /** The third essence: the three swirl in, plunge into the body, the confluence shows over the head, then goes in. */
  _absorbDrawConfluence(fx, g, chest, head) {
    const t = fx.t;
    const swirlEnd = 2.6, plungeEnd = 3.2, showEnd = 4.3, inEnd = 4.9;
    if (t < plungeEnd) {
      const up = ease(clamp01(t / 0.5));
      const spin = t * (1.4 + t * 1.2);   // faster and faster
      const r = t < swirlEnd ? 58 - 20 * clamp01(t / swirlEnd) : 38 * (1 - ease(clamp01((t - swirlEnd) / (plungeEnd - swirlEnd))));
      const yMid = head.y + 30 + (t < swirlEnd ? 0 : (chest.y - head.y - 30) * ease(clamp01((t - swirlEnd) / (plungeEnd - swirlEnd))));
      for (const tr of fx.trio) {
        const a = tr.a0 + spin;
        const x = chest.x + Math.cos(a) * r, y = yMid + Math.sin(a) * r * 0.5 + (1 - up) * 40;
        const c = tr.look.color;
        // the trail
        for (let k = 1; k <= 6; k++) {
          const a2 = a - k * 0.12;
          g.fillStyle(c, 0.35 * (1 - k / 7) * up); g.fillCircle(chest.x + Math.cos(a2) * r, yMid + Math.sin(a2) * r * 0.5 + (1 - up) * 40, 6 - k * 0.7);
        }
        g.fillStyle(c, 0.3 * up); g.fillCircle(x, y, 18);
        if (tr.spr) tr.spr.setPosition(x, y).setAlpha(up).setScale(1.1 * (t < swirlEnd ? 1 : 1 - 0.7 * clamp01((t - swirlEnd) / (plungeEnd - swirlEnd))));
      }
    } else {
      for (const tr of fx.trio) if (tr.spr) tr.spr.setAlpha(0);
    }
    // the plunge's flash
    const fl = clamp01((t - plungeEnd) / 0.45);
    if (t >= plungeEnd && fl < 1) {
      for (const [i, tr] of fx.trio.entries()) {
        g.lineStyle(3, tr.look.color, 0.8 * (1 - fl)); g.strokeEllipse(chest.x, chest.y + 26, 30 + (60 + i * 18) * fl, 12 + (22 + i * 6) * fl);
      }
      g.fillStyle(0xffffff, 0.55 * (1 - fl)); g.fillCircle(chest.x, chest.y, 12 + 28 * fl);
    }
    // the confluence over the head, then in
    if (t >= plungeEnd + 0.15) {
      const cc = fx.conf ? fx.conf.color : 0xffe082;
      const show = ease(clamp01((t - plungeEnd - 0.15) / 0.4));
      const down = ease(clamp01((t - showEnd) / (inEnd - showEnd)));
      const cx = head.x, cy = head.y - 6 + (chest.y - head.y + 6) * down;
      const sc = 1.4 * show * (1 - 0.8 * down);
      g.fillStyle(cc, 0.25 * show * (1 - down) + 0.08 * Math.sin(t * 7)); g.fillCircle(cx, cy, 34 * sc + 6);
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2 - t * 1.5;
        g.lineStyle(2, lighten(cc, 0.4), 0.6 * show * (1 - down));
        g.lineBetween(cx + Math.cos(a) * 30 * sc, cy + Math.sin(a) * 22 * sc, cx + Math.cos(a) * 44 * sc, cy + Math.sin(a) * 32 * sc);
      }
      if (fx.confSpr) fx.confSpr.setPosition(cx, cy).setScale(Math.max(0.01, sc)).setAlpha(show * (1 - clamp01((t - inEnd + 0.1) / 0.1)));
      if (!fx.named && show > 0.5 && fx.conf) { fx.named = true; this._floatText(this.world.x, this.world.y - 120, fx.conf.name, '#' + cc.toString(16).padStart(6, '0')); }
      const fl2 = clamp01((t - inEnd) / (fx.dur - inEnd));
      if (fl2 > 0) { g.fillStyle(lighten(cc, 0.5), 0.6 * (1 - fl2)); g.fillCircle(chest.x, chest.y, 12 + 34 * fl2); }
      if (this.playerSprite) this.playerSprite.setTint(down > 0.6 ? lighten(cc, 0.6) : 0xffffff);
    }
  },

  /** The bond, made as the animation ends; the third essence goes straight into the rank-up and the goo. */
  _absorbFinish(fx) {
    if (fx.done) return;
    fx.done = true;
    fx.g.destroy();
    for (const s of fx.icons) s.destroy();
    if (this.playerSprite) this.playerSprite.clearTint();
    this._absorbFx = null;
    const p = this.player;
    // the bag may have shifted (nothing should change it while held, but find the item by id to be sure)
    const list = fx.kind === 'stone' ? p.inventory.stones : p.inventory.essences;
    let idx = list[fx.bagIdx] === fx.id ? fx.bagIdx : list.indexOf(fx.id);
    if (idx < 0) return;
    if (fx.third) this._absorbHold = [];   // its pages wait for the goo
    if (fx.kind === 'stone') this._socketStone(idx, fx.slot);
    else this._equipEssence(idx, fx.slot);
    // the rank-up the bond queued for the inventory's closing plays now, straight away
    if (this._pendingRankUpFx) {
      const rank = this._pendingRankUpFx;
      this._pendingRankUpFx = null;
      this._triggerRankUp(rank, () => this._triggerOoze());
    }
    if (fx.third) { this._absorbHoldUntil = (this.time ? this.time.now : 0) + 30000; this._absorbSawGoo = false; }
  },

  /** Pages held through the confluence's rank-up and goo, shown once both are done. */
  _absorbFlushHeld() {
    if (!this._absorbHold) return;
    if (this._oozeSeq) this._absorbSawGoo = true;
    // until the goo has come and gone (or, should it never come, half a minute)
    const late = this.time && this._absorbHoldUntil && this.time.now >= this._absorbHoldUntil;
    if (!late && (this._rankupFx || this._oozeSeq || !this._absorbSawGoo)) return;
    const pages = this._absorbHold;
    this._absorbHold = null;
    if (pages.length) this._announce(pages);
  },
};
