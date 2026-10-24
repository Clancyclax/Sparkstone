// ===========================================================================
// ROUND 393 -- THE WATER SYSTEM (the scene half; src/data/water.js is the data
// half and explains the field every layer here is drawn from).
//
//   "I want water to improve the tiles feel lackluster and I'd really like a
//    water system that feels high quality. Related on lake or ocean shores I
//    want water to have beaches with minor waves coming up and receding."
//
// Water is still ground tiles: the same tile types, the same `_isWaterAt`, the
// same collision. What changed is how a water tile, and the land beside it, is
// DRESSED when the ground streamer puts it on screen (`_w393Dress`, called from
// `_updateGroundViewport` for every tile it instantiates):
//
//   ground image   a water tile's own image is re-textured to a baked cell:
//                  depth colour from the field (shallow at the shore, darker
//                  out), the waterline rounded into a curve, bank or sand in
//                  the rounded corners. Static -- baked once per shape.
//   land overlay   a land tile near a lake or the sea gets a sand strip
//                  (wet / damp / dry, dissolving into the grass); near a river,
//                  pond or marsh a thin mud bank. Static, baked.
//   surface        a world-periodic animated ripple sheet over the water
//                  (public/assets/water/*.png, tools/make_water_r393.py): one
//                  sprite per water tile, its corner alphas fading it out
//                  toward the shore. Calm for lakes, a swell for the sea.
//   shore          an animated baked layer on every tile the waterline
//                  crosses: on a beach the swash runs up the sand with a foam
//                  lip, drains back, and leaves wet sand that dries; the phase
//                  drifts along the coast so the set rolls in rather than
//                  blinking in unison. On a bank it is a lapping line.
//   current        rivers carry pixel streaks that travel downstream at the
//                  river's speed (faster and whiter in rapids).
//   glints         a pool of twinkles on open water, coloured by the hour: white
//                  sun, gold at the ends of the day, a cold moon at night.
//
// COST. Nothing here is per-pixel per frame. A baked cell is a table lookup per
// pixel, done once when a new shoreline shape first scrolls into view, into a
// shared canvas page. Per frame: a frame index for each visible water sprite
// when its step changes (every ~0.2 s), and position updates for a few dozen
// pooled streaks and glints. Everything is pooled and released with the tile.
//
// UNTOUCHED: sewer water, every interior, lava (the Cinderwaste keeps its
// molten art), bridge decks and jetties. Those tiles never reach `_w393Dress`'s
// drawing, and the round-90 frame drift still runs for them.
// ===========================================================================
import { TILE, isoProject } from '../data/iso.js';
import { regionAtTile, REGION_TILES, INTERIOR_BAND_Y0, MAP_TILES_TOTAL } from '../data/regions.js';
import { isWaterTile } from '../data/town.js';
import {
  W393_WATER_TYPES, W393_NATURAL_LAND, W393_DOCK_TYPE, W393_SHEETS, W393_CW, W393_CH, w393SheetCell,
  w393Classify, w393Palette, w393Measure, w393Corner, w393Quant, W393_Q, w393BakeStatic, w393ShoreLut,
  w393BakeShore, w393TouchesShore, W393_SHORE_Q, w393ShorePhase, w393QuadAlpha, w393SkyRgb, w393RgbInt,
  w393GlintDensity, W393_FIELD_N, W393_MODE, w393FieldByte, w393ShoreFrag,
} from '../data/water.js';

const MAP_TILES = MAP_TILES_TOTAL;
const PAGE_W = 1024, PAGE_H = 1024;
const PAGE_COLS = PAGE_W / W393_CW, PAGE_ROWS = PAGE_H / W393_CH, PAGE_CELLS = PAGE_COLS * PAGE_ROWS;
/** Baked-cell pages before the cache is flushed and the screen re-baked (4 MB each). */
const MAX_PAGES = 8;
const SHEET_FRAME_MS = { lake: 190, ocean: 240 };
const MAX_STREAKS = 90, MAX_GLINTS = 44;
/** Small depth steps above the tile's own ground image: land overlay, surface, shore, fx. */
const D_LAND = 0.01, D_SURF = 0.02, D_SHORE = 0.03, D_FX = 0.04;
/** The widest bank of any palette plus the corner reach: a land tile further than this from water is never dressed. */
const LAND_REACH = 3.0;
/** The continuous shore shader sits above every flat ground tile (isoDepth - 1e6 <= -568k) and below
 *  bridge planks (-500k), ground decals (1) and everything standing on the ground. */
const D_SHORE_SHADER = -540000;
const W393_SHORE_SHADER = false;   // ROUND 393 -- see _w393ShaderInit
/** Re-centre the shore field when the camera is this many tiles from its centre. */
const FIELD_RECENTRE = 9;   // the sea's beach is 2.2 wide; land is measured out to 3

export function w393Preload(scene) {
  for (const sh of Object.values(W393_SHEETS)) {
    scene.load.spritesheet(sh.key, `./${sh.file}`, { frameWidth: W393_CW, frameHeight: W393_CH });
  }
}

export const WaterMixin = {
  /** ROUND 393 -- the surface sheets, from preload(). */
  _w393Preload() { w393Preload(this); },

  /** ROUND 393 -- forget everything; the pooled sprites belonged to a world that is gone. */
  _w393Reset() { if (this._w393) this._w393ReleaseAll(); this._w393 = null; },

  _w393State() {
    let st = this._w393;
    if (st && st.tt === this.tileType) return st;
    if (st) this._w393ReleaseAll();
    if (!this.tileType || !this.textures) return null;
    st = this._w393 = {
      tt: this.tileType,
      info: new Map(),          // tkey -> { F, wet, hard, h, kind, fx, fy, pal, corners? }
      recs: new Map(),          // tkey -> dressed tile record
      cells: new Map(),         // cell key -> { tex, name } | { tex, names[] } | { empty: true }
      pages: [], gen: (this._w393Gen = (this._w393Gen || 0) + 1),
      dirty: new Set(), luts: {},
      pools: { surf: [], shore: [], land: [], fx: [] },
      steps: { lake: -1, ocean: -1 }, shoreStep: -1,
      streaks: [], glints: [], skyAt: -1, sky: 0xffffff, nightK: 0,
      riverRecs: [], openRecs: [], listsDirty: true, reconcileT: 0,
      scratch: null,
      stats: { baked: 0, bakeMs: 0, flushes: 0, fields: 0 },
      field: null,              // { ox, oy } of the shore field texture, or null until built
    };
    this._w393FxTextures();
    st.shader = this._w393ShaderInit();   // null on Canvas or if the shader will not build: the baked shore stays
    return st;
  },

  /** Is a tile water for the field: any water type, a jetty, or a bridge deck laid over water. */
  _w393IsWet(x, y) {
    if (x < 0 || y < 0 || x >= MAP_TILES || y >= MAP_TILES) return false;
    const k = y * MAP_TILES + x;
    const t = this.tileType[k];
    if (isWaterTile(t) || t === W393_DOCK_TYPE) return true;
    return !!(this._bridgeDeck && this._bridgeDeck.has(k));
  },

  _w393Height(x, y) {
    return this._elev && this._elev.tileHeight ? (this._elev.tileHeight(x, y) || 0) : 0;
  },

  /** The field and kind at one tile, cached for the life of the world. */
  _w393Info(tx, ty) {
    const st = this._w393;
    const k = ty * MAP_TILES + tx;
    let inf = st.info.get(k);
    if (inf) return inf;
    if (st.info.size > 250000) st.info.clear();
    const isWet = (x, y) => this._w393IsWet(x, y);
    const m = w393Measure(isWet, tx, ty);
    const wet = isWet(tx, ty);
    const t = (tx >= 0 && ty >= 0 && tx < MAP_TILES && ty < MAP_TILES) ? this.tileType[k] : 255;
    inf = { F: m.F, wet, hard: false, h: this._w393Height(tx, ty), kind: null, fx: 0, fy: 0, pal: null };
    // The kind of the water this tile IS, or for land, of the water it faces.
    const wx = m.wx, wy = m.wy;
    if (wx >= 0) {
      const kinf = wet ? null : this._w393Info(wx, wy);
      if (kinf) { inf.kind = kinf.kind; inf.fx = kinf.fx; inf.fy = kinf.fy; inf.pal = kinf.pal; inf.wh = kinf.h; }
      else {
        const reg = regionAtTile(tx, ty);
        const c = reg ? w393Classify(reg, tx - reg.col * REGION_TILES, ty - reg.row * REGION_TILES, t) : { kind: 'pond', fx: 0, fy: 0 };
        if (c.kind === 'rapids' && !c.fx && !c.fy) {
          const d = this._w393FlowFromGround(tx, ty);
          c.fx = d.fx; c.fy = d.fy;
        }
        inf.kind = c.kind; inf.fx = c.fx; inf.fy = c.fy; inf.pal = w393Palette(c.kind); inf.wh = inf.h;
      }
    }
    // HARD ground: paving, walls, docks' planks, and land standing at another
    // height from the water it faces (a cliff). The waterline stays straight
    // against it and no sand is laid on it.
    if (!wet) {
      inf.hard = !W393_NATURAL_LAND.has(t) || (inf.wh !== undefined && Math.abs(inf.h - inf.wh) > 0.3);
    }
    st.info.set(k, inf);
    return inf;
  },

  /** Which way a stream with no authored polyline runs: along its own channel, downhill. */
  _w393FlowFromGround(tx, ty) {
    let sxx = 0, syy = 0, sxy = 0, n = 0;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (!this._w393IsWet(tx + dx, ty + dy)) continue;
      sxx += dx * dx; syy += dy * dy; sxy += dx * dy; n++;
    }
    if (n < 3) return { fx: 0, fy: 1 };
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    let fx = Math.cos(ang), fy = Math.sin(ang);
    const ahead = this._w393Height(Math.round(tx + fx * 3), Math.round(ty + fy * 3));
    const behind = this._w393Height(Math.round(tx - fx * 3), Math.round(ty - fy * 3));
    if (ahead > behind || (ahead === behind && fx + fy < 0)) { fx = -fx; fy = -fy; }
    return { fx, fy };
  },

  /** A tile's four corners [NW top, NE right, SW left, SE bottom], quantised. */
  _w393Corners(tx, ty) {
    const I = (x, y) => this._w393Info(x, y);
    const c = (cx, cy) => {
      const a = I(cx - 1, cy - 1), b = I(cx, cy - 1), d = I(cx - 1, cy), e = I(cx, cy);
      // A corner where water meets ground at another height is a cliff edge.
      let v = w393Corner(a, b, d, e);
      if (this._elev) {
        let wmin = Infinity, dmax = -Infinity;
        for (const q of [a, b, d, e]) { if (q.wet) wmin = Math.min(wmin, q.h); else dmax = Math.max(dmax, q.h); }
        if (wmin < Infinity && dmax > -Infinity && Math.abs(dmax - wmin) > 0.3) v = 0;
      }
      return w393Quant(v) / W393_Q;
    };
    return [c(tx, ty), c(tx + 1, ty), c(tx, ty + 1), c(tx + 1, ty + 1)];
  },

  // -------------------------------------------------------------------------
  // THE CELL CACHE. One shared set of canvas pages; a cell is baked the first
  // time its key is asked for and reused for every tile with the same shape.
  // -------------------------------------------------------------------------
  _w393Alloc(count) {
    const st = this._w393;
    let page = st.pages[st.pages.length - 1];
    if (!page || page.next + count > PAGE_CELLS) {
      if (st.pages.length >= MAX_PAGES) { st.needFlush = true; return null; }
      const key = `w393Page_${st.gen}_${st.pages.length}`;
      if (this.textures.exists(key)) this.textures.remove(key);
      const tex = this.textures.createCanvas(key, PAGE_W, PAGE_H);
      page = { key, tex, ctx: tex.context, next: 0 };
      st.pages.push(page);
    }
    const first = page.next;
    page.next += count;
    return { page, first };
  },

  _w393Put(page, slot, data) {
    const st = this._w393;
    if (!st.scratch) st.scratch = page.ctx.createImageData(W393_CW, W393_CH);
    st.scratch.data.set(data);
    const x = (slot % PAGE_COLS) * W393_CW, y = Math.floor(slot / PAGE_COLS) * W393_CH;
    page.ctx.putImageData(st.scratch, x, y);
    const name = `c${slot}`;
    page.tex.add(name, 0, x, y, W393_CW, W393_CH);
    st.dirty.add(page);
    return name;
  },

  /** A static cell ('water' or 'land'); null when it would draw nothing. */
  _w393StaticCell(layer, kind, pal, corners) {
    const st = this._w393;
    const key = `${layer}|${kind}|${corners.join(',')}`;
    let c = st.cells.get(key);
    if (c) return c.empty ? null : c;
    const t0 = performance.now();
    const buf = new Uint8ClampedArray(W393_CW * W393_CH * 4);
    const drawn = w393BakeStatic(buf, 0, W393_CW * 4, pal, corners, layer);
    if (!drawn) { st.cells.set(key, { empty: true }); return null; }
    const a = this._w393Alloc(1);
    if (!a) return null;
    c = { tex: a.page.key, name: this._w393Put(a.page, a.first, buf) };
    st.cells.set(key, c);
    st.stats.baked++; st.stats.bakeMs += performance.now() - t0;
    return c;
  },

  /** All the frames of one animated shore cell; null when it would draw nothing. */
  _w393ShoreCell(kind, pal, corners) {
    const st = this._w393;
    const cq = corners.map(v => Math.round(v * W393_SHORE_Q) / W393_SHORE_Q);
    const key = `shore|${kind}|${cq.join(',')}`;
    let c = st.cells.get(key);
    if (c) return c.empty ? null : c;
    const t0 = performance.now();
    const n = pal.frames;
    const lut = st.luts[kind] || (st.luts[kind] = w393ShoreLut(pal, n));
    const bufs = [];
    let any = 0;
    for (let f = 0; f < n; f++) {
      const buf = new Uint8ClampedArray(W393_CW * W393_CH * 4);
      any += w393BakeShore(buf, 0, W393_CW * 4, lut, f, cq, pal.jitter);
      bufs.push(buf);
    }
    if (!any) { st.cells.set(key, { empty: true }); return null; }
    const a = this._w393Alloc(n);
    if (!a) return null;
    c = { tex: a.page.key, names: bufs.map((b, i) => this._w393Put(a.page, a.first + i, b)) };
    st.cells.set(key, c);
    st.stats.baked += n; st.stats.bakeMs += performance.now() - t0;
    return c;
  },

  _w393Sprite(pool, tex, frame) {
    let s = pool.pop();
    while (s && !s.active) s = pool.pop();   // destroyed with an old world
    if (!s) { s = this.add.image(0, 0, tex, frame); s.setOrigin(0.5, 0.5); }
    else { s.setTexture(tex, frame); s.setVisible(true); }
    return s;
  },

  // -------------------------------------------------------------------------
  // DRESSING A TILE -- called by `_updateGroundViewport` for each tile it puts
  // on screen, after the ground image has its own texture, depth and tint.
  // -------------------------------------------------------------------------
  _w393Dress(tkey, tx, ty, img) {
    const st = this._w393State();
    if (!st) return;
    const old = st.recs.get(tkey);
    if (old) this._w393Release(old);
    if (this._insideRoom || ty >= INTERIOR_BAND_Y0 || !img) return;
    const t = this.tileType[tkey];
    if (this._bridgeDeck && this._bridgeDeck.has(tkey)) return;
    if (this._elev && this._elev.isBridge && this._elev.isBridge(tx, ty)) return;
    const water = W393_WATER_TYPES.has(t);
    if (!water && !W393_NATURAL_LAND.has(t)) return;
    const inf = this._w393Info(tx, ty);
    if (!inf.pal) return;                              // lava, or nothing near
    if (!water && (inf.hard || inf.F < -LAND_REACH)) return;
    const pal = inf.pal, kind = inf.kind;
    const corners = this._w393Corners(tx, ty);
    const rec = { tkey, tx, ty, img, kind, pal, water, corners, surf: null, shore: null, land: null, shoreNames: null, phase: 0 };
    const depth = img.depth;
    if (water) {
      const base = this._w393StaticCell('water', kind, pal, corners);
      if (!base) return;
      img.setTexture(base.tex, base.name);
      img.setScale(1, 1);
      const sheet = W393_SHEETS[pal.ripple];
      const s = this._w393Sprite(st.pools.surf, sheet.key, w393SheetCell(sheet, 0, tx, ty));
      s.setPosition(img.x, img.y); s.setDepth(depth + D_SURF);
      s.setBlendMode(0);
      rec.surf = s; rec.sheet = pal.ripple;
      rec.surfA = corners.map(v => Math.max(0, Math.min(1, (v - 0.12) / 0.6)) * pal.rippleAlpha);
      this._w393ApplySurfAlpha(rec);
      s.setTint(st.sky);
    } else {
      if (Math.max(...corners) <= -pal.bank.width) return;
      const land = this._w393StaticCell('land', kind, pal, corners);
      if (land) {
        const s = this._w393Sprite(st.pools.land, land.tex, land.name);
        s.setPosition(img.x, img.y); s.setDepth(depth + D_LAND); s.setAlpha(1); s.clearTint();
        rec.land = s;
      }
    }
    // ROUND 393 -- with the shore shader up, the band is drawn continuously
    // over the whole screen; the baked per-tile swash is only for what the
    // shader leaves out (raised water).
    if (w393TouchesShore(pal, corners) && !(st.shader && this._w393ShaderMode(tx, ty))) {
      const sc = this._w393ShoreCell(kind, pal, corners);
      if (sc) {
        const s = this._w393Sprite(st.pools.shore, sc.tex, sc.names[0]);
        s.setPosition(img.x, img.y); s.setDepth(depth + D_SHORE); s.setAlpha(1); s.clearTint();
        rec.shore = s; rec.shoreNames = sc.names;
        rec.phase = Math.floor(w393ShorePhase(tx, ty) * pal.frames);
        rec.shoreAt = -1;
      }
    }
    if (!rec.surf && !rec.shore && !rec.land) return;
    st.recs.set(tkey, rec);
    st.listsDirty = true;
    st.steps.lake = st.steps.ocean = -1; st.shoreStep = -1;   // frame the new sprites on the next tick
  },

  _w393ApplySurfAlpha(rec) {
    const st = this._w393;
    const k = 1 - 0.3 * (st ? st.nightK : 0);
    const [tl, tr, bl, br] = w393QuadAlpha(rec.surfA[0] * k, rec.surfA[1] * k, rec.surfA[2] * k, rec.surfA[3] * k);
    rec.surf.setAlpha(tl, tr, bl, br);
  },

  _w393Release(rec) {
    const st = this._w393;
    if (rec.surf) { rec.surf.setVisible(false); st.pools.surf.push(rec.surf); }
    if (rec.shore) { rec.shore.setVisible(false); st.pools.shore.push(rec.shore); }
    if (rec.land) { rec.land.setVisible(false); st.pools.land.push(rec.land); }
    rec.surf = rec.shore = rec.land = null;
    if (st.recs.get(rec.tkey) === rec) st.recs.delete(rec.tkey);
    st.listsDirty = true;
  },

  _w393ReleaseAll() {
    const st = this._w393;
    if (!st) return;
    for (const rec of [...st.recs.values()]) this._w393Release(rec);
    for (const p of [...st.streaks, ...st.glints]) { p.on = false; if (p.s && p.s.active) p.s.setVisible(false); }
    if (st.shader && st.shader.active) st.shader.setVisible(false);
    st.field = null;
  },

  /** After a viewport pass: let go of tiles the streamer let go of, upload new cells. */
  _w393AfterViewport() {
    const st = this._w393;
    if (!st) return;
    for (const rec of [...st.recs.values()]) {
      const img = this._groundTiles && this._groundTiles.get(rec.tkey);
      if (img !== rec.img || !img.active) this._w393Release(rec);
    }
    if (st.needFlush) this._w393Flush();
    for (const page of st.dirty) page.tex.refresh();
    st.dirty.clear();
  },

  /** The page budget ran out: drop every baked cell and bake again what is on screen. */
  _w393Flush() {
    const st = this._w393;
    st.needFlush = false;
    st.stats.flushes++;
    const live = [...st.recs.values()].map(r => [r.tkey, r.tx, r.ty, r.img]);
    for (const rec of [...st.recs.values()]) this._w393Release(rec);
    for (const p of st.pages) if (this.textures.exists(p.key)) this.textures.remove(p.key);
    st.pages = []; st.cells.clear(); st.dirty.clear();
    st.gen = this._w393Gen = (this._w393Gen || 0) + 1;
    for (const [k, tx, ty, img] of live) {
      if (this._groundTiles.get(k) !== img) continue;
      // The ground image still shows a cell from a page that is gone: give it
      // its own art back first, then dress it again.
      const v = this._groundTileVisual(tx, ty);
      img.setTexture(v.key, v.frame);
      this._w393Dress(k, tx, ty, img);
    }
  },

  // -------------------------------------------------------------------------
  // THE CLOCK. Called once a frame from update().
  // -------------------------------------------------------------------------
  _w393Update(dt) {
    const st = this._w393;
    if (!st || !this.time) return;
    const now = this.time.now;
    // Pick up anything another system released between viewport passes
    // (a garden bed dug, a bridge laid).
    st.reconcileT += dt;
    if (st.reconcileT > 0.5) { st.reconcileT = 0; this._w393AfterViewport(); }
    if (this._insideRoom) { this._w393HideFx(); return; }

    // Light: re-tint the surface when the hour has moved on.
    const hours = this._gameHours ?? 12;
    const dark = this._darkness || 0;
    const hk = Math.floor(hours * 12);
    if (hk !== st.skyAt) {
      st.skyAt = hk;
      st.sky = w393RgbInt(w393SkyRgb(hours));
      st.nightK = dark;
      for (const rec of st.recs.values()) if (rec.surf) { rec.surf.setTint(st.sky); this._w393ApplySurfAlpha(rec); }
    }
    if (st.listsDirty) this._w393Lists();

    // The surface sheets.
    for (const name of ['lake', 'ocean']) {
      const step = Math.floor(now / SHEET_FRAME_MS[name]) % W393_SHEETS[name].F;
      if (step === st.steps[name]) continue;
      st.steps[name] = step;
      const sheet = W393_SHEETS[name];
      for (const rec of st.recs.values()) {
        if (rec.surf && rec.sheet === name) rec.surf.setFrame(w393SheetCell(sheet, step, rec.tx, rec.ty));
      }
    }
    // The shore: each tile at its own point in the loop.
    const shoreStep = Math.floor(now / 110);
    if (shoreStep !== st.shoreStep) {
      st.shoreStep = shoreStep;
      for (const rec of st.recs.values()) {
        if (!rec.shore) continue;
        const n = rec.pal.frames;
        const fr = (Math.floor(now / (rec.pal.cycleMs / n)) + rec.phase) % n;
        if (fr === rec.shoreAt) continue;
        rec.shoreAt = fr;
        rec.shore.setFrame(rec.shoreNames[fr]);
      }
    }
    this._w393UpdateStreaks(dt);
    this._w393UpdateGlints(dt, hours, dark);
    if (st.shader) this._w393UpdateShader(now);
  },

  /** The visible running water and open water, for the streaks and the glints. */
  _w393Lists() {
    const st = this._w393;
    st.listsDirty = false;
    st.riverRecs = []; st.openRecs = [];
    for (const rec of st.recs.values()) {
      if (!rec.water) continue;
      if ((rec.kind === 'river' || rec.kind === 'rapids') && (rec.pal.flowSpeed || 0) > 0) st.riverRecs.push(rec);
      if (Math.min(...rec.corners) > 0.55 && rec.kind !== 'swamp') st.openRecs.push(rec);
    }
  },

  _w393HideFx() {
    const st = this._w393;
    if (st.shader && st.shader.active) st.shader.setVisible(false);
    for (const p of st.streaks) if (p.on) { p.on = false; p.s.setVisible(false); }
    for (const p of st.glints) if (p.on) { p.on = false; p.s.setVisible(false); }
  },

  /** A world point inside a dressed water tile: its field value, and the record. */
  _w393At(wx, wy) {
    const st = this._w393;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    const rec = st.recs.get(ty * MAP_TILES + tx);
    if (!rec || !rec.water) return null;
    const s = wx / TILE - tx, t = wy / TILE - ty, c = rec.corners;
    return { rec, f: c[0] * (1 - s) * (1 - t) + c[1] * s * (1 - t) + c[2] * (1 - s) * t + c[3] * s * t };
  },

  _w393UpdateStreaks(dt) {
    const st = this._w393;
    const want = Math.min(MAX_STREAKS, Math.round(st.riverRecs.length * 0.16));
    let live = 0;
    for (const p of st.streaks) {
      if (!p.on) continue;
      p.age += dt;
      p.wx += p.vx * dt; p.wy += p.vy * dt;
      const at = p.age < p.life ? this._w393At(p.wx, p.wy) : null;
      if (!at || at.f < 0.2 || (at.rec.kind !== 'river' && at.rec.kind !== 'rapids')) { p.on = false; p.s.setVisible(false); continue; }
      const u = p.age / p.life;
      p.s.setAlpha(p.a * Math.min(1, u * 5, (1 - u) * 4));
      const q = isoProject(p.wx, p.wy);
      p.s.setPosition(Math.round(q.x), Math.round(q.y));
      p.s.setDepth(at.rec.img.depth + D_FX);
      live++;
    }
    // Spawn toward the target, a few a frame so a new river fills in smoothly.
    for (let n = 0; live < want && n < 4 && st.riverRecs.length; n++) {
      const rec = st.riverRecs[(Math.random() * st.riverRecs.length) | 0];
      const s = Math.random(), t = Math.random();
      const wx = (rec.tx + s) * TILE, wy = (rec.ty + t) * TILE;
      const at = this._w393At(wx, wy);
      if (!at || at.f < 0.45) continue;
      let p = st.streaks.find(q => !q.on);
      if (!p) {
        if (st.streaks.length >= MAX_STREAKS) break;
        p = { s: this.add.image(0, 0, 'w393Fx', 'st0').setOrigin(0.5, 0.5) };
        st.streaks.push(p);
      }
      if (!p.s.active) { p.s = this.add.image(0, 0, 'w393Fx', 'st0').setOrigin(0.5, 0.5); }
      const fast = rec.kind === 'rapids';
      const sp = (rec.pal.flowSpeed || 30) * (0.75 + Math.random() * 0.5);
      p.on = true; p.age = 0; p.life = (fast ? 0.8 : 1.6) + Math.random() * (fast ? 0.7 : 1.4);
      p.wx = wx; p.wy = wy; p.vx = rec.fx * sp; p.vy = rec.fy * sp;
      p.a = fast ? 0.95 : 0.7;
      p.s.setFrame(this._w393StreakFrame(rec.fx, rec.fy, fast || Math.random() < 0.35));
      p.s.setTint(fast ? 0xffffff : st.sky);
      p.s.setVisible(true).setAlpha(0);
      live++;
    }
  },

  /** The streak drawn along the screen direction a world flow (fx, fy) projects to. */
  _w393StreakFrame(fx, fy, long) {
    const sx = (fx - fy), sy = (fx + fy) * 0.5;
    let a = Math.atan2(sy, sx) * 180 / Math.PI;
    a = ((a % 180) + 180) % 180;   // a dash has no head: 0..180
    const dirs = [0, 26.6, 90, 153.4];
    let best = 0, bd = 999;
    for (let i = 0; i < dirs.length; i++) {
      const d = Math.min(Math.abs(a - dirs[i]), 180 - Math.abs(a - dirs[i]));
      if (d < bd) { bd = d; best = i; }
    }
    return `st${best}${long ? 'L' : ''}`;
  },

  _w393UpdateGlints(dt, hours, dark) {
    const st = this._w393;
    const dens = w393GlintDensity(hours, dark);
    const want = Math.min(MAX_GLINTS, Math.round(st.openRecs.length * 0.06 * dens));
    const night = dark > 0.5;
    let live = 0;
    for (const p of st.glints) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life || !p.rec.surf || st.recs.get(p.rec.tkey) !== p.rec) { p.on = false; p.s.setVisible(false); continue; }
      const u = p.age / p.life;
      const k = Math.sin(Math.PI * u);
      p.s.setFrame(k > 0.8 ? 'g2' : k > 0.4 ? 'g1' : 'g0');
      p.s.setAlpha(Math.min(1, k * 1.4) * p.a);
      live++;
    }
    for (let n = 0; live < want && n < 3 && st.openRecs.length; n++) {
      const rec = st.openRecs[(Math.random() * st.openRecs.length) | 0];
      let p = st.glints.find(q => !q.on);
      if (!p) {
        if (st.glints.length >= MAX_GLINTS) break;
        p = { s: this.add.image(0, 0, 'w393Fx', 'g0').setOrigin(0.5, 0.5).setBlendMode(1) };
        st.glints.push(p);
      }
      if (!p.s.active) p.s = this.add.image(0, 0, 'w393Fx', 'g0').setOrigin(0.5, 0.5).setBlendMode(1);
      const s = 0.15 + Math.random() * 0.7, t = 0.15 + Math.random() * 0.7;
      // Inside the diamond: (s, t) in tile space -> screen offset from the tile's centre.
      const ox = (s - t) * 32, oy = (s + t - 1) * 16;
      p.on = true; p.age = 0; p.life = 0.45 + Math.random() * 0.6; p.rec = rec;
      p.a = night ? 0.55 : 0.9;
      p.s.setPosition(Math.round(rec.img.x + ox), Math.round(rec.img.y + oy));
      p.s.setDepth(rec.img.depth + D_FX);
      p.s.setTint(night ? 0xc8d8ff : st.sky);
      p.s.setVisible(true).setAlpha(0);
      live++;
    }
  },

  /** The streak and glint frames: pixel dashes along the four screen
   *  directions a world flow can project to, and a three-step twinkle. */
  _w393FxTextures() {
    if (this.textures.exists('w393Fx')) return;
    const W = 128, H = 16;
    const tex = this.textures.createCanvas('w393Fx', W, H);
    const ctx = tex.context;
    const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    const LIGHT = 'rgba(236,250,255,1)', MID = 'rgba(190,232,246,0.85)', DARK = 'rgba(20,56,90,0.45)';
    // Dashes: [dx, dy] per step for 0 deg (horizontal), 26.6 (2:1), 90 (vertical), 153.4 (2:1 the other way).
    const shapes = [[1, 0], [2, 1], [0, 1], [-2, 1]];
    let x0 = 0;
    for (let i = 0; i < 4; i++) {
      for (const long of [false, true]) {
        const len = long ? 7 : 4;
        const cx = x0 + 6, cy = 6;
        const [dx, dy] = shapes[i];
        const pts = [];
        for (let k = -Math.floor(len / 2); k < Math.ceil(len / 2); k++) {
          if (dx === 0) pts.push([cx, cy + k]);
          else if (Math.abs(dx) === 2) pts.push([cx + Math.sign(dx) * k, cy + Math.floor(k / 2)]);
          else pts.push([cx + k, cy]);
        }
        pts.forEach(([x, y], j) => {
          if (dx !== 0) px(x, y + 1, DARK);     // the trough under the streak
          px(x, y, j === 0 || j === pts.length - 1 ? MID : LIGHT);
        });
        tex.add(`st${i}${long ? 'L' : ''}`, 0, x0, 0, 12, 12);
        x0 += 12;
      }
    }
    // Glints: a dot, a small plus, a star, to the right of the dashes.
    const glint = (name, x, arms) => {
      const cx = x + 3, cy = 3;
      px(cx, cy, 'rgba(255,255,255,1)');
      for (let r = 1; r <= arms; r++) {
        const a = r === 1 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)';
        px(cx - r, cy, a); px(cx + r, cy, a); px(cx, cy - r, a); px(cx, cy + r, a);
      }
      tex.add(name, 0, x, 0, 7, 7);
    };
    glint('g0', 96, 0); glint('g1', 104, 1); glint('g2', 112, 2);
    tex.refresh();
  },

  // -------------------------------------------------------------------------
  // THE CONTINUOUS SHORE (WebGL). See w393ShoreFrag in src/data/water.js.
  // -------------------------------------------------------------------------
  /** The shader object, made once per scene; null where it cannot run. */
  _w393ShaderInit() {
    if (this._w393Shader !== undefined) {
      if (this._w393Shader && this._w393Shader.active) return this._w393Shader;
      if (this._w393Shader === null) return null;
    }
    this._w393Shader = null;
    // ROUND 393 -- HELD BACK. The continuous-shore shader drew its beach a few tiles off the real waterline (a second,
    // ghost shoreline across the grass on the Ontaria coast, or out in the sea): its quad-to-world mapping does not
    // match the drawn quad. The baked per-tile shore is the look the user approved ("Water looks good"), so the
    // shader stays off until that mapping is fixed and checked on screen.
    if (!W393_SHORE_SHADER) return null;
    try {
      const r = this.sys && this.sys.renderer;
      if (!r || !r.gl || typeof this.add.shader !== 'function') return null;
      if (!this.textures.exists('w393Field')) this.textures.createCanvas('w393Field', W393_FIELD_N, W393_FIELD_N);
      const u = { quad: [0, 0, 1, 1], fo: [0, 0, W393_FIELD_N], time: 0, sky: [1, 1, 1] };
      const sh = this.add.shader({
        name: 'w393Shore',
        fragmentSource: w393ShoreFrag(),
        initialUniforms: { uField: 0 },
        setupUniforms(set) {
          set('uQuad', u.quad); set('uFieldO', u.fo); set('uTime', u.time); set('uSky', u.sky);
        },
      }, 0, 0, 16, 16, ['w393Field']);
      sh.w393u = u;
      sh.setDepth(D_SHORE_SHADER);
      sh.setVisible(false);
      this._w393Shader = sh;
      return sh;
    } catch (e) {
      console.warn('[sparkstone] water: shore shader unavailable, using the baked shore', e && e.message);
      this._w393Shader = null;
      return null;
    }
  },

  /** How the shader draws the shore at one tile (W393_MODE), 0 where it leaves it to the baked cells. */
  _w393ShaderMode(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_TILES || ty >= MAP_TILES || ty >= INTERIOR_BAND_Y0) return 0;
    const k = ty * MAP_TILES + tx;
    const t = this.tileType[k];
    if (t === W393_DOCK_TYPE || (this._bridgeDeck && this._bridgeDeck.has(k))) return 0;
    if (this._elev && this._elev.isBridge && this._elev.isBridge(tx, ty)) return 0;
    const water = W393_WATER_TYPES.has(t);
    if (!water && !W393_NATURAL_LAND.has(t)) return 0;
    const inf = this._w393Info(tx, ty);
    if (!inf.pal) return 0;
    // Raised water is drawn in its own place by the tile streamer; the
    // shader is flat, so it leaves raised ground to the baked shore.
    if (Math.abs(inf.h || 0) > 0.01 || Math.abs(inf.wh || 0) > 0.01) return 0;
    if (!water && inf.hard) return 0;
    let style = inf.pal.shore;
    if (water && style === 'beach') {
      // Against a quay or a cliff the water laps; it does not run up a beach that is not there.
      for (let dy = -1; dy <= 1 && style === 'beach'; dy++) for (let dx = -1; dx <= 1; dx++) {
        const n = this._w393Info(tx + dx, ty + dy);
        if (!n.wet && n.hard) { style = 'lap'; break; }
      }
    }
    if (style === 'beach') return inf.kind === 'ocean' ? W393_MODE.ocean : W393_MODE.lake;
    return style === 'scum' ? W393_MODE.scum : W393_MODE.lap;
  },

  /** Rebuild the field texture around tile (cx, cy): the field and the mode per tile. Not per frame. */
  _w393FieldBuild(cx, cy) {
    const st = this._w393;
    const N = W393_FIELD_N;
    const ox = Math.round(cx) - N / 2, oy = Math.round(cy) - N / 2;
    const tex = this.textures.get('w393Field');
    const ctx = tex && tex.context;
    if (!ctx) return;
    const id = ctx.createImageData(N, N);
    const d = id.data;
    let any = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const tx = ox + i, ty = oy + j, o = (j * N + i) * 4;
      let F = -3, mode = 0;
      if (tx >= 0 && ty >= 0 && tx < MAP_TILES && ty < MAP_TILES && ty < INTERIOR_BAND_Y0) {
        const inf = this._w393Info(tx, ty);
        F = inf.F;
        if (inf.pal && inf.F > -LAND_REACH) mode = this._w393ShaderMode(tx, ty);
      }
      d[o] = w393FieldByte(F); d[o + 1] = mode; d[o + 2] = 0; d[o + 3] = 255;
      if (mode) any++;
    }
    ctx.putImageData(id, 0, 0);
    tex.refresh();
    st.field = { ox, oy, any };
    st.stats.fields++;
  },

  _w393UpdateShader(now) {
    const st = this._w393, sh = st.shader;
    if (!sh.active) { st.shader = null; return; }
    const cam = this.cameras && this.cameras.main;
    if (!cam) return;
    const wv = cam.worldView;
    const cx = wv.centerX, cy = wv.centerY;
    const gx = cx / 64 + cy / 32, gy = cy / 32 - cx / 64;
    const N = W393_FIELD_N;
    if (!st.field || Math.abs(gx - (st.field.ox + N / 2)) > FIELD_RECENTRE || Math.abs(gy - (st.field.oy + N / 2)) > FIELD_RECENTRE) {
      this._w393FieldBuild(gx, gy);
    }
    if (!st.field || !st.field.any) { sh.setVisible(false); return; }
    const m = 8;
    const w = Math.ceil(wv.width) + 2 * m, h = Math.ceil(wv.height) + 2 * m;
    if (sh.width !== w || sh.height !== h) sh.setSize(w, h);
    sh.setPosition(cx, cy);
    const u = sh.w393u;
    u.quad[0] = cx - w / 2; u.quad[1] = cy - h / 2; u.quad[2] = w; u.quad[3] = h;
    u.fo[0] = st.field.ox; u.fo[1] = st.field.oy;
    u.time = (now / 1000) % 3600;
    const c = st.sky;
    u.sky[0] = ((c >> 16) & 255) / 255; u.sky[1] = ((c >> 8) & 255) / 255; u.sky[2] = (c & 255) / 255;
    sh.setVisible(true);
  },

  /**
   * ROUND 393 -- is this world point sand? Asked by the grass so a lawn does
   * not grow on the beach (grassMixin.js). Only lake and sea shores have sand.
   */
  _w393Sandy(wx, wy) {
    const st = this._w393;
    if (!st || st.tt !== this.tileType) return false;
    const tx = Math.floor(wx / TILE), ty = Math.floor(wy / TILE);
    if (ty >= INTERIOR_BAND_Y0) return false;
    const inf = this._w393Info(tx, ty);
    if (!inf.pal || inf.wet || inf.hard || inf.F < -LAND_REACH) return false;
    const c = this._w393Corners(tx, ty);
    const s = wx / TILE - tx, t = wy / TILE - ty;
    const f = c[0] * (1 - s) * (1 - t) + c[1] * s * (1 - t) + c[2] * (1 - s) * t + c[3] * s * t;
    const bk = inf.pal.bank;
    // Beaches are sand to the dissolve's midpoint; a river bank only a strip.
    return f > -bk.width + bk.fade * 0.5;
  },

  /** For probes and the suite. */
  _w393Stats() {
    const st = this._w393;
    if (!st) return null;
    const kinds = {};
    let surf = 0, shore = 0, land = 0;
    for (const r of st.recs.values()) {
      kinds[r.kind] = (kinds[r.kind] || 0) + 1;
      if (r.surf) surf++; if (r.shore) shore++; if (r.land) land++;
    }
    return {
      recs: st.recs.size, surf, shore, land, kinds, cells: st.cells.size, pages: st.pages.length,
      baked: st.stats.baked, bakeMs: Math.round(st.stats.bakeMs), flushes: st.stats.flushes,
      streaks: st.streaks.filter(p => p.on).length, glints: st.glints.filter(p => p.on).length,
      info: st.info.size,
    };
  },
};
