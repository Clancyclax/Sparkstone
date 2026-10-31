// ============================================================================
// ROUND 393 -- THE WIND ON EVERYTHING THAT SHOULD MOVE (the scene's half; the table is src/data/windSway.js).
//
//   "Heavy wind needs to blow the trees flags, banners, not just the grass."
//
//   _windArtPreload()        boot: the weather particle art and the butterfly sheet (public/assets/weather/).
//   _windSwayTick(dt)        every frame, from weatherMixin.js `_tickWind`: while the wind is up, every tree, soft
//                            plant, flag, banner, pennant, laundry line and hanging sign near the camera is drawn as a
//                            Rope that bends / ripples with the gusts; when it falls calm (or under a roof, round 369)
//                            each is put back exactly as it was and the ropes go back to the pool.
//   _windGroundLeaves(dt)    leaves skittering across open ground near trees on a hard wind.
//   _windButterflyArt(...)   the butterfly sheet for a [Harbinger of Doom] butterfly (WorldScene `_spawnButterfly`).
//
// HOW A THING IS SWAPPED, so it can always be put back:
//   * a plant (tree, bush, reed, planter): its sprite is taken OFF the display list (not hidden, not faded -- every
//     other system that reads or writes it, the walk-behind fade, the pool, a tint, still sees the same sprite) and
//     a Rope with the sprite's own texture and frame is drawn in its place, copying its position, scale, depth, alpha
//     and tint every frame. Released: the rope is pooled, the sprite goes back on the display list.
//   * a cloth prop: its sprite stays, drawn from a copy of its frame with the cloth cut out (and the pole repainted
//     where it ran behind the cloth); the cloth is a Rope on top. Released: the sprite gets its own frame back.
// Any sprite the viewport pools or reuses underneath us is noticed on the next frame (it is no longer the one we
// swapped) and its rope let go.
// ============================================================================
import { isoUnproject, isoDepth } from '../data/iso.js';
import { WEATHER } from '../data/weather.js';
import {
  WIND_CLOTH, WIND_PROP_PLANTS, WIND_FLORA_SOFT, WIND_TREE, WIND_ROPE_CAP, WIND_VIEW_MARGIN, WEATHER_ART, bendProfile,
} from '../data/windSway.js';

const TAU = Math.PI * 2;
const GROUND_LEAF_MAX = 34;
const BEND_POINTS = 7;
/** The wind (`this._wind.k`, 0..1) at which things start to move, and the one at which they are put back. */
export const WIND_ON = 0.13, WIND_OFF = 0.09;
/** Spare ropes kept for reuse; past this a released rope is destroyed. */
const WIND_POOL_MAX = 96;

/** ROUND 403 -- the rows at the top of a hanging cloth that do not move (the hem the rod runs through). */
// ROUND 410 -- "the top of the flag should hold still, only the bottom portion should move in the wind." Four rows
// (round 403) was the hem alone; the cloth under it still swung from the rod. A hanging cloth now holds its top third.
export const HANG_PIN_FRAC = 0.34;
export function clothPin(spec) {
  if (spec.pin != null) return spec.pin;
  return spec.kind === 'hang' ? Math.max(4, Math.round(((spec.rect && spec.rect[3]) || 12) * HANG_PIN_FRAC)) : 0;
}
function frac(x) { return x - Math.floor(x); }
/** A stable 0..1 per object, so neighbouring trees do not rock in step. */
function phaseOf(x, y) { return frac(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453); }
function grey(c) { const v = Math.max(0, Math.min(255, Math.round(c * 255))); return (v << 16) | (v << 8) | v; }

export const WindSwayMixin = {
  _windArtPreload() {
    for (const a of Object.values(WEATHER_ART)) {
      if (a.frame) this.load.spritesheet(a.key, a.file, { frameWidth: a.frame, frameHeight: a.frame });
      else this.load.image(a.key, a.file);
    }
  },

  _windState() {
    if (!this._wsw) {
      this._wsw = { plants: new Map(), cloth: new Map(), pool: [], propRef: null, propN: -1, propList: [], leaves: [], leafAcc: 0, fallbackRot: new Set() };
    }
    return this._wsw;
  },

  // ------------------------------------------------------------------------------------------------ the frame's work
  _windSwayTick(dt) {
    const S = this._windState();
    const W = this._wind;
    const k = W ? W.k : 0;
    // Only when the wind is UP: a sunny day's breath of air (k about 0.06) moves the grass and nothing else, and
    // nothing is touched. In above WIND_ON, out below WIND_OFF, so a wind hovering at the line does not flicker.
    const on = !!W && k >= (S.on ? WIND_OFF : WIND_ON) && (!this._weatherShown || this._weatherShown()) && !!this.add.rope;
    S.on = on;
    dt = Math.min(0.05, Math.max(0, dt || 0));
    if (!on) {
      if (S.plants.size || S.cloth.size || S.fallbackRot.size) this._windReleaseAll();
      this._windGroundLeaves(dt, 0);
      return;
    }
    const cam = this.cameras.main;
    const v = cam.worldView, M = WIND_VIEW_MARGIN;
    const x0 = v.x - M, x1 = v.x + v.width + M, y0 = v.y - M, y1 = v.y + v.height + M * 2.5;   // a tall tree's crown hangs above its foot
    const near = (sp) => sp && sp.scene && sp.visible && sp.x >= x0 && sp.x <= x1 && sp.y >= y0 && sp.y <= y1;

    // What should be moving now.
    const wantPlants = new Map();   // sprite -> spec
    let treesInView = 0;
    if (this._treeTiles) {
      for (const sp of this._treeTiles.values()) if (near(sp)) { wantPlants.set(sp, WIND_TREE); treesInView++; }
    }
    for (const n of (this.harvestNodes || [])) {
      const sp = n && n.sprite;
      if (sp && near(sp) && sp.texture && String(sp.texture.key).startsWith('tree_')) wantPlants.set(sp, { give: 0.9, period: 2.6 });
    }
    if (this._floraSprites) {
      for (const sp of this._floraSprites.values()) {
        if (!near(sp)) continue;
        const g = WIND_FLORA_SOFT[sp.frame && sp.frame.name];
        if (g) wantPlants.set(sp, { give: g, period: 1.6 });
      }
    }
    const wantCloth = new Map();   // rec -> spec
    for (const rec of this._windPropList()) {
      const sp = rec.sprite;
      if (!near(sp) || rec.flipX) continue;
      const cloth = WIND_CLOTH[rec.sheet] && WIND_CLOTH[rec.sheet][rec.frame];
      if (cloth) { wantCloth.set(rec, cloth); continue; }
      const plant = WIND_PROP_PLANTS[rec.sheet] && WIND_PROP_PLANTS[rec.sheet][rec.frame];
      if (plant) wantPlants.set(sp, { give: plant.give, rigid: plant.rigid, period: 1.9 });
    }
    S.treesInView = treesInView;

    // Let go of what no longer should.
    for (const [sp, e] of S.plants) {
      if (!wantPlants.has(sp) || !sp.scene) this._windReleasePlant(sp, e);
    }
    for (const [rec, e] of S.cloth) {
      if (!wantCloth.has(rec) || rec.sprite !== e.sp || !e.sp.scene || e.sp.texture.key !== e.baseKey) this._windReleaseCloth(rec, e);
    }
    // Take on what should, up to the cap; the overflow rocks the old way (round 360's rotation).
    const t = W.t;
    let n = S.plants.size + S.cloth.size;
    for (const [rec, spec] of wantCloth) {
      if (S.cloth.has(rec) || n >= WIND_ROPE_CAP) continue;
      if (this._windTakeCloth(rec, spec)) n++;
    }
    for (const [sp, spec] of wantPlants) {
      if (S.plants.has(sp)) continue;
      if (n < WIND_ROPE_CAP && this._windTakePlant(sp, spec)) { n++; S.fallbackRot.delete(sp); continue; }
      S.fallbackRot.add(sp);
    }
    for (const sp of S.fallbackRot) {
      if (!wantPlants.has(sp) || !sp.scene) { if (sp.scene && sp.rotation) sp.setRotation(0); S.fallbackRot.delete(sp); continue; }
      sp.setRotation(this._windLean(sp.x, sp.y, 2.2, phaseOf(sp.x, sp.y) * TAU));
    }

    for (const [sp, e] of S.plants) this._windDrawPlant(sp, e, k, t, dt);
    for (const [rec, e] of S.cloth) this._windDrawCloth(rec, e, k, t, dt);
    this._windGroundLeaves(dt, k);
  },

  /** The city props worth looking at (cloth and plants), filtered once per build of `this.cityProps`. */
  _windPropList() {
    const S = this._windState();
    const props = this.cityProps || [];
    if (S.propRef !== props || S.propN !== props.length) {
      S.propRef = props; S.propN = props.length;
      S.propList = props.filter(c => c && ((WIND_CLOTH[c.sheet] && WIND_CLOTH[c.sheet][c.frame])
        || (WIND_PROP_PLANTS[c.sheet] && WIND_PROP_PLANTS[c.sheet][c.frame])));
    }
    return S.propList;
  },

  _windRope(horizontal, n, key, frame) {
    const S = this._windState();
    let r = null;
    for (let i = S.pool.length - 1; i >= 0; i--) {
      const c = S.pool[i];
      if (!c.scene) { S.pool.splice(i, 1); continue; }
      if (c.horizontal === horizontal && c.points.length === n) { r = c; S.pool.splice(i, 1); break; }
    }
    const pts = [];
    for (let i = 0; i < n; i++) pts.push({ x: 0, y: 0 });
    if (!r) {
      r = this.add.rope(0, 0, key, frame, n, horizontal);
    } else {
      r.setTexture(key, frame);
      r.setVisible(true);
    }
    r.setPoints(pts);
    r.setColors(0xffffff);
    r.setAlpha(1);
    return r;
  },

  _windPoolRope(r) {
    if (!r || !r.scene) return;
    const pool = this._windState().pool;
    if (pool.length >= WIND_POOL_MAX) { r.destroy(); return; }   // a city's worth of cloth seen at once is not kept for ever
    r.setVisible(false);
    pool.push(r);
  },

  // ------------------------------------------------------------------------------------------------ plants
  _windTakePlant(sp, spec) {
    if (!sp.frame || !sp.texture) return false;
    const rope = this._windRope(false, BEND_POINTS, sp.texture.key, sp.frame.name);
    if (sp.rotation) sp.setRotation(0);   // it may have been rocking the old way (over the cap) a moment ago
    if (sp.displayList) sp.removeFromDisplayList();
    const ph = phaseOf(sp.x, sp.y);
    const e = { rope, spec, th: 0, vel: 0, ph: ph * TAU, w: TAU / ((spec.period || 2.5) * (0.85 + 0.3 * ph)), key: null, frame: null, tint: -1 };
    this._windState().plants.set(sp, e);
    return true;
  },

  _windReleasePlant(sp, e) {
    this._windPoolRope(e.rope);
    if (sp && sp.scene && !sp.displayList) sp.addToDisplayList();
    this._windState().plants.delete(sp);
  },

  _windDrawPlant(sp, e, k, t, dt) {
    const r = e.rope;
    if (!r || !r.scene) return;
    if (e.key !== sp.texture.key || e.frame !== sp.frame.name) {
      r.setTexture(sp.texture.key, sp.frame.name);
      const pts = []; for (let i = 0; i < BEND_POINTS; i++) pts.push({ x: 0, y: 0 });
      r.setPoints(pts);
      e.key = sp.texture.key; e.frame = sp.frame.name;
    }
    // The lean: a steady push, the gust passing over this spot, and the plant's own rocking -- through a spring, so
    // a tree that a gust has bent swings back past upright when it has gone by, and each tree at its own pace.
    const g = this._gustAt ? this._gustAt(sp.x, sp.y) : 0;
    const give = e.spec.give || 1;
    const target = k * give * (0.065 + 0.18 * g + 0.03 * Math.sin(t * e.w * 1.9 + e.ph) + 0.014 * Math.sin(t * e.w * 4.3 + e.ph * 1.7));
    const w = e.w * (1 + 0.6 * k);
    e.vel += (-(w * w) * (e.th - target) - 2 * 0.22 * w * e.vel) * dt;
    e.th += e.vel * dt;
    const fw = sp.frame.width, fh = sp.frame.height;
    const ox = sp.displayOriginX, oy = sp.displayOriginY;
    const top = -oy, bottom = fh - oy;
    const rigid = (e.spec.rigid != null ? e.spec.rigid : oy) - oy;   // the row nothing below moves, relative to the foot
    const H = Math.max(4, rigid - top);
    const spineX = fw / 2 - ox;
    const dir = sp.scaleX < 0 ? -1 : 1;   // a mirrored plant is drawn mirrored: push it the other way in its own frame
    const pts = r.points;
    for (let i = 0; i < BEND_POINTS; i++) {
      const y = top + (bottom - top) * (i / (BEND_POINTS - 1));
      const u = (rigid - y) / H;
      const dx = e.th * H * bendProfile(u);
      pts[i].x = spineX + dx * dir;
      pts[i].y = y + (dx * dx) / (2 * Math.max(10, H * Math.max(0.2, u)));   // bending over, the crown drops a little
    }
    r.updateVertices();
    r.setPosition(sp.x, sp.y);
    r.setScale(sp.scaleX, sp.scaleY);
    r.setRotation(sp.rotation || 0);
    r.setDepth(sp.depth);
    r.setAlpha(sp.alpha);
    const tint = sp.isTinted ? (sp.tintTopLeft != null ? sp.tintTopLeft : 0xffffff) : 0xffffff;
    if (tint !== e.tint) { r.setColors(tint); e.tint = tint; }
  },

  // ------------------------------------------------------------------------------------------------ cloth
  /** The frame without its cloth (the pole repainted where it ran behind), and the cloth on its own with a clear
   *  pixel round it so the rope's edge does not smear into its neighbours. Made once per frame, kept. */
  _windClothTextures(sheet, frame, spec) {
    const baseKey = `wnd_b_${sheet}_${frame}`, clothKey = `wnd_c_${sheet}_${frame}`;
    if (this.textures.exists(baseKey) && this.textures.exists(clothKey)) return { baseKey, clothKey };
    const tex = this.textures.get(sheet);
    if (!tex || !tex.has(frame)) return null;
    const fr = tex.get(frame);
    const src = tex.getSourceImage();
    if (!src) return null;
    const fw = fr.cutWidth, fh = fr.cutHeight;
    // ROUND 403 -- "the wooden rod the flag is hanging from (and the top of the flag where the rod runs through)
    // shouldn't be moving at all." A hanging cloth's top `pin` rows (the hem the rod runs through) stay in the base
    // frame, still; only the cloth below them is cut out and moves.
    const [x, y0, w, h0] = spec.rect;
    const pin = clothPin(spec);
    const y = y0 + pin, h = h0 - pin;
    if (!this.textures.exists(clothKey)) {
      const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2;
      c.getContext('2d').drawImage(src, fr.cutX + x, fr.cutY + y, w, h, 1, 1, w, h);
      this.textures.addCanvas(clothKey, c);
    }
    if (!this.textures.exists(baseKey)) {
      const c = document.createElement('canvas'); c.width = fw; c.height = fh;
      const g = c.getContext('2d');
      g.drawImage(src, fr.cutX, fr.cutY, fw, fh, 0, 0, fw, fh);
      g.clearRect(x, y, w, h);
      if (spec.pole) {
        const [p0, p1, row] = spec.pole;
        for (let yy = y; yy < y + h; yy++) g.drawImage(src, fr.cutX + p0, fr.cutY + row, p1 - p0 + 1, 1, p0, yy, p1 - p0 + 1, 1);
      }
      this.textures.addCanvas(baseKey, c);
    }
    return { baseKey, clothKey };
  },

  _windTakeCloth(rec, spec) {
    const sp = rec.sprite;
    const keys = this._windClothTextures(rec.sheet, rec.frame, spec);
    if (!keys) return false;
    const horizontal = spec.kind === 'flag' || spec.kind === 'line';
    const n = spec.kind === 'swing' ? 3 : spec.kind === 'line' ? 11 : 9;
    const rope = this._windRope(horizontal, n, keys.clothKey, undefined);
    sp.setTexture(keys.baseKey);
    const ph = phaseOf(rec.x, rec.y);
    this._windState().cloth.set(rec, { sp, rope, spec, baseKey: keys.baseKey, th: 0, vel: 0, ph: ph * TAU, rate: 0.85 + 0.3 * ph });
    return true;
  },

  _windReleaseCloth(rec, e) {
    this._windPoolRope(e.rope);
    // Only put the frame back on a sprite that is still ours: one the viewport has pooled or handed to another prop
    // already had its own texture set by the viewport.
    if (e.sp && e.sp.scene && rec.sprite === e.sp && e.sp.texture.key === e.baseKey) e.sp.setTexture(rec.sheet, rec.frame);
    this._windState().cloth.delete(rec);
  },

  _windDrawCloth(rec, e, k, t, dt) {
    const sp = e.sp, r = e.rope, s = e.spec;
    if (!r || !r.scene) return;
    const g = this._gustAt ? this._gustAt(sp.x, sp.y) : 0;
    const fw = sp.frame.width, fh = sp.frame.height;
    const ox = sp.displayOriginX, oy = sp.displayOriginY;
    const [rx, ry0, rw, rh0] = s.rect;
    const pinR = clothPin(s), ry = ry0 + pinR, rh = rh0 - pinR;   // ROUND 403 -- the pinned hem stays in the base
    const pts = r.points, n = pts.length;
    // The flutter: a wave running away from where the cloth is held, quicker and bigger the harder it blows.
    const phase = t * (5 + 8 * k) * e.rate + e.ph;
    const kap = 1.9;
    const colors = [];
    if (s.kind === 'flag') {
      const A = k * (1.0 + 2.4 * g) + 0.5 * k;
      const cy = ry - 1 + (rh + 2) / 2 - oy;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const wv = Math.sin(phase - kap * i);
        pts[i].x = rx - 1 + (rw + 2) * u * (1 - 0.06 * k * u * (1 - Math.cos(phase - kap * i))) - ox;
        pts[i].y = cy + A * u * wv;
        colors.push(grey(1 - 0.24 * Math.min(1, k * 1.3) * u * (0.5 + 0.5 * Math.cos(phase - kap * i))));
      }
    } else if (s.kind === 'line') {
      const A = k * (1.2 + 2.6 * g);
      const cy = ry - 1 + (rh + 2) / 2 - oy;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const env = Math.sin(Math.PI * u);
        const wv = Math.sin(phase * 0.8 - kap * 0.8 * i);
        pts[i].x = rx - 1 + (rw + 2) * u - ox;
        pts[i].y = cy + env * (A * wv - k * (0.6 + 1.6 * g));   // and lifted a little by the wind
        colors.push(grey(1 - 0.2 * Math.min(1, k * 1.3) * env * (0.5 + 0.5 * Math.cos(phase * 0.8 - kap * 0.8 * i))));
      }
    } else {
      // hang / swing: pinned at the top. The angle it streams out at goes through a spring, so a gust lifts it and
      // it drops back as the gust passes.
      const swing = s.kind === 'swing';
      const target = swing
        ? k * (0.10 + 0.26 * g) + k * 0.05 * Math.sin(t * 2.9 * e.rate + e.ph)
        : k * (0.22 + 0.62 * g) + k * 0.07 * Math.sin(t * 1.7 * e.rate + e.ph);
      const w = swing ? 5.5 : 3.6;
      e.vel += (-(w * w) * (e.th - target) - 2 * 0.3 * w * e.vel) * dt;
      e.th += e.vel * dt;
      const L = rh + 2, seg = L / (n - 1);
      const A = swing ? 0 : k * (0.8 + 1.8 * g);
      let x = rx - 1 + (rw + 2) / 2 - ox, y = ry - 1 - oy;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const wv = Math.sin(phase - kap * i);
        // ROUND 410 -- the movement grows toward the free hem: next to the still top it barely stirs.
        const env = swing ? u : Math.pow(u, 1.6);
        pts[i].x = x + A * env * wv;
        pts[i].y = y;
        // the next segment: hanging straight down at the top, out at the stream angle towards the free end
        // ROUND 403 -- the first segment hangs straight down from the rod, so the cloth's top edge stays level
        const a = swing ? e.th : e.th * env;
        x += Math.sin(a) * seg; y += Math.cos(a) * seg;
        colors.push(grey(swing ? 1 : 1 - 0.22 * Math.min(1, k * 1.3) * u * (0.5 + 0.5 * Math.cos(phase - kap * i))));
      }
    }
    r.updateVertices();
    r.setColors(colors);
    r.setPosition(sp.x, sp.y);
    r.setScale(sp.scaleX, sp.scaleY);
    r.setDepth(sp.depth + 0.01);
    r.setAlpha(sp.alpha);
    r.setVisible(sp.visible);
    void fw; void fh;
  },

  _windReleaseAll() {
    const S = this._windState();
    for (const [sp, e] of [...S.plants]) this._windReleasePlant(sp, e);
    for (const [rec, e] of [...S.cloth]) this._windReleaseCloth(rec, e);
    for (const sp of S.fallbackRot) if (sp && sp.scene && sp.rotation) sp.setRotation(0);
    S.fallbackRot.clear();
  },

  // ------------------------------------------------------------------------------------------------ ground leaves
  /** Leaves skittering over the ground on a hard wind where there are trees to have shed them (or the weather is
   *  itself a leaf-blowing one): hopping along with the gusts, tumbling through the sheet's four frames. */
  _windGroundLeaves(dt, k) {
    const S = this._windState();
    const L = S.leaves;
    const art = WEATHER_ART.leaf;
    const wx = this._wx;
    if (L.length && !L[0].img.scene) L.length = 0;   // the scene was rebuilt under us
    const def = wx && wx.id ? WEATHER[wx.id] : null;
    const fall = def ? def.fall : null;
    const leafy = (S.treesInView || 0) >= 3 || fall === 'leaf';
    const want = (k >= 0.3 && leafy && fall !== 'snow' && fall !== 'ash' && fall !== 'ember' && fall !== 'sand'
      && this.textures.exists(art.key)) ? Math.round(GROUND_LEAF_MAX * Math.min(1, (k - 0.25) * 1.6)) : 0;
    const cam = this.cameras.main, v = cam.worldView;
    let live = 0;
    for (const p of L) if (p.life > 0) live++;
    if (want > live) {
      S.leafAcc += dt * want * 0.9;
      while (S.leafAcc >= 1 && live < want) {
        S.leafAcc -= 1;
        let p = L.find(q => q.life <= 0);
        if (!p) {
          if (L.length >= GROUND_LEAF_MAX) break;
          p = { img: this.add.image(0, 0, art.key, 0).setOrigin(0.5, 0.9) };
          L.push(p);
        }
        // Mostly blown in from the upwind (left) side, some lifted off the ground in view.
        const fromEdge = Math.random() < 0.6;
        p.x = fromEdge ? v.x - 30 - Math.random() * 60 : v.x + Math.random() * v.width * 0.85;
        p.y = v.y + v.height * (0.1 + Math.random() * 0.88);
        p.row = Math.floor(Math.random() * art.rows);
        p.f = Math.random() * 4; p.hop = Math.random() * TAU;
        p.v = 0.7 + Math.random() * 0.6; p.life = 4 + Math.random() * 5; p.age = 0;
        p.sc = 1.0 + Math.random() * 0.6;
        p.img.setVisible(true).setScale(p.sc).setFrame(p.row * art.cols);
        live++;
      }
    } else S.leafAcc = 0;
    for (const p of L) {
      if (p.life <= 0) { if (p.img.visible) p.img.setVisible(false); continue; }
      p.life -= dt; p.age += dt;
      const g = this._gustAt ? this._gustAt(p.x, p.y) : 0;
      const sp = (90 + 420 * g) * Math.max(k, 0.15) * p.v;
      p.x += sp * dt;
      p.y += Math.sin(p.hop * 0.37) * 14 * dt;
      p.hop += dt * (4 + 9 * g) * p.v;
      p.f += dt * (6 + sp / 28);
      const lift = Math.abs(Math.sin(p.hop)) * (4 + 26 * g) * p.v;
      const img = p.img;
      img.setPosition(p.x, p.y - lift);
      img.setFrame(p.row * art.cols + (Math.floor(p.f) % art.cols));
      img.setRotation(Math.sin(p.hop * 0.5) * 0.6);
      const w = isoUnproject(p.x, p.y);
      img.setDepth(isoDepth(w.x, w.y) + 2);
      const fade = Math.min(1, p.age * 2, p.life * 1.5);
      img.setAlpha(Math.max(0, fade) * 0.95);
      if (p.x > v.x + v.width + 80 || (k < 0.05 && p.life > 1.2)) p.life = Math.min(p.life, 0.6);
    }
  },

  // ------------------------------------------------------------------------------------------------ butterflies
  /** ROUND 393 -- a [Harbinger of Doom] butterfly drawn from the round-391 sheet (8-frame wing beat, pale, tinted
   *  the ability's colour) instead of a dot. Returns { sprite, flight } for `_spawnButterfly`, or null (no sheet:
   *  the dot it has always been). The projectile loop plays `flight` frame by frame. */
  _windButterflyArt(x, y, tint, radius = 6) {
    const a = WEATHER_ART.butterfly;
    if (!this.textures || !this.textures.exists(a.key)) return null;
    const sprite = this.add.sprite(x, y, a.key, 0).setOrigin(0.5, 0.6).setTint(tint).setScale(Math.max(1, radius / 6) * 1.25);
    return { sprite, flight: { key: a.key, frames: a.frames, frameMs: 45, heading: 'none', faceX: true, frame0: 0, baseAngle: 0 } };   // faceX: flipped to face the way it flies (WorldScene projectile loop)
  },
};
