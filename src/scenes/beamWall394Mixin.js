// ===========================================================================
// ROUND 394 -- THE R392 DROP'S BEAMS, WALLS AND PROJECTILES, PLAYED.
//
//   "Replace the stretched 222 px beam sheet with the 3-part system: draw _start, repeat _mid (seamless, looping) to the
//    beam's length, then draw _end. Play beam_flare at the caster, beam_splash on every tick."
//   "Tile walls/segments/* along the barrier line and raise them out of the ground over about 0.3 s, with the existing
//    puff along the base." "Energy walls: wall_plane tinted per use, with an overlay." "Burn lines laid flat."
//   "Add the stills as new flight sprites ... Draw each at its target_size with nearest-neighbour scaling ... Play each
//    burst on impact."
//
// src/data/beamWall394.js says what each ability draws; this is the half that draws it. Every door answers false when
// what it needs is not loaded yet (it asks for it, once), and its caller keeps the older art for that cast:
//
//   _beam394Draw(a, from, to, o)      a held beam (confluenceGapMixin `_beamDraw` / `_guardBeam`): start, mids, end
//   _wall394Build(w) / _wall394Tick(w, dt) / _wall394Free(w)    a barrier (wallFxMixin's three doors hand it here)
//   _flight394Init(sprite, flight)    a projectile still or looping flight: nearest-neighbour, the fan, the impact burst
//   _convertFlash394(m, cond)         a full-stack condition converting into another (convert_flash)
//   _bw394Prefetch(known)             fetch every sheet the kit's beams, walls and flights will draw
// ===========================================================================
import { isoProject, isoDepth } from '../data/iso.js';
import { damageFxFor, DAMAGE_FX_COLORS } from '../data/damageFx.js';
import { conditionDef } from '../data/debuffs.js';
import {
  beamMaterialFor, beamSheet, beamFxSheet, beamLayout, wallArtFor394, wallSheetsFor, wallSegKey, wallAnimSheet,
  flight394For, projAnimSheet, projStillKey, PORTCULLIS_KEY, PROJ_MOTION,
} from '../data/beamWall394.js';
import { BEAM394, BEAMFX394, WALL394, WALLANIM394, OVERLAY394, STRIP394, PROJANIM394, BRAID_PAIRS394 } from '../data/beamWall394Art.js';

const ADD = 'ADD';
const NEAREST = 1;                  // Phaser.Textures.FilterMode.NEAREST (no Phaser import: the suite loads this in node)
const BEAM_LIFT = 24;               // the beam leaves the hand, not the feet (the legend beam's lift)
const SLICE = 16;                   // a wall tile is laid in 16 px columns, each on its own point of the line
const RISE_S = 0.3;                 // "raise it out of the ground in code over about 0.3 s"
// the overlays drawn light (stars, sine waves, gold sigils) add; the hex grid and the code are dark lines laid over
const BRIGHT_OVERLAYS = new Set(['stars', 'sine', 'sigils']);
const ADD_MATERIALS = new Set(['ray', 'lightning', 'sound', 'glyph', 'tear', 'braid']);
const DARK_CUTS = new Set(['ink', 'bog', 'pitch', 'ash', 'stone', 'mud', 'dark', 'death', 'blood', 'earth', 'necrotic', 'curse', 'violet', 'shadow']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const hexOf = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

export const BeamWall394Mixin = {
  // ------------------------------------------------------------------------------------------------ loading --
  /** Is this sheet loaded? If not, ask for it (once) and say no. s: { key, url, cell?, cellH?, image? } */
  _bw394Want(s) {
    if (!s || !this.textures) return false;
    if (this.textures.exists(s.key)) return true;
    if (!this.load) return false;
    this._bw394Asked = this._bw394Asked || new Set();
    if (!this._bw394Asked.has(s.key)) {
      this._bw394Asked.add(s.key);
      if (s.image) this.load.image(s.key, s.url);
      else this.load.spritesheet(s.key, s.url, { frameWidth: s.cell, frameHeight: s.cellH || s.cell });
      if (!this.load.isLoading()) this.load.start();
    }
    return false;
  },
  _bw394WantAll(list) {
    let ok = true;
    for (const s of list) if (s && !this._bw394Want(s)) ok = false;
    return ok;
  },
  /** Every sheet one ability will draw with (its beam, its wall or its flight). */
  _bw394SheetsOf(a) {
    if (!a) return [];
    const out = [];
    if (a.template === 'beam') {
      const p = beamMaterialFor(a);
      out.push(beamSheet(p.m, p.cut), beamFxSheet('flare', p.cut), beamFxSheet(p.splash, p.cut));
      if (p.stream && p.stream !== 'tracer') out.push({ key: projStillKey(p.stream), url: `./public/assets/beamwall/proj/${p.stream}.png`, image: true });
    }
    if (a.template === 'barrierWall') {
      const w = wallArtFor394(a);
      if (w) out.push(...wallSheetsFor(w, damageFxFor(a)));
    }
    const fl = flight394For(a);
    if (fl) out.push(...fl.sheets);
    return out.filter(Boolean);
  },
  /** Fetch in the background what the kit's abilities will draw (WorldScene `_prefetchKitFx`, every few seconds). */
  _bw394Prefetch(known) {
    let n = 0;
    for (const k of Object.keys(known || {})) {
      const e = known[k], a = e && e.ability;
      for (const s of this._bw394SheetsOf(a)) if (!this.textures.exists(s.key)) { this._bw394Want(s); n++; }
    }
    return n;
  },
  /** A one-shot of a loaded sheet at a screen point (plays its frames once, then goes). */
  _bw394Once(key, frames, ms, x, y, o = {}) {
    if (!key || !this.textures || !this.textures.exists(key) || !this.add) return null;
    const spr = this.add.sprite(x, y, key, 0).setOrigin(o.ox != null ? o.ox : 0.5, o.oy != null ? o.oy : 0.5);
    spr.setScale(o.sx || 1, o.sy || o.sx || 1).setDepth(o.depth != null ? o.depth : 100000).setAlpha(o.alpha != null ? o.alpha : 1);
    if (o.add) spr.setBlendMode(ADD);
    if (o.rot) spr.setRotation(o.rot);
    if (o.tint != null) spr.setTint(o.tint);
    if (o.delay) spr.setVisible(false);
    const total = frames * ms;
    this.tweens.addCounter({
      from: 0, to: 1, duration: total, delay: o.delay || 0,
      onStart: () => { if (spr.active) spr.setVisible(true); },
      onUpdate: (tw) => { if (spr.active) spr.setFrame(Math.min(frames - 1, Math.floor(tw.getValue() * frames))); },
      onComplete: () => { if (spr.active) spr.destroy(); },
    });
    return spr;
  },

  // ---------------------------------------------------------------------------------------------- the beam --
  /**
   * A held beam as the three-part material: the start on the caster's hand, the mid repeated to the beam's length (the
   * last one cut to fit), the end on the far point, all re-aimed every step while it holds; the flare at the caster
   * and a splash on every tick (at the far point and on what the line crosses). from / to: {x, y} or functions (world).
   * o: { ms, width, ticks, every }. True when drawn; false (the old stretched sheet stands in) when not loaded yet.
   */
  _beam394Draw(a, from, to, o = {}) {
    if (!a || !this.add || !this.tweens) return false;
    const plan = beamMaterialFor(a);
    const sheet = beamSheet(plan.m, plan.cut);
    const flare = beamFxSheet('flare', plan.cut), splash = beamFxSheet(plan.splash, plan.cut);
    const need = [sheet, flare, splash];
    if (plan.stream && plan.stream !== 'tracer') need.push({ key: projStillKey(plan.stream), url: `./public/assets/beamwall/proj/${plan.stream}.png`, image: true });
    if (!this._bw394WantAll(need) && !this.textures.exists(sheet.key)) return false;
    const B = BEAM394[plan.m];
    const read = (v) => (typeof v === 'function' ? v() : v);
    const ms = o.ms || 900;
    const band = Math.max(8, B.parts.mid.y1 - B.parts.mid.y0);
    const thick = clamp(((o.width || 28) / band) * 1.15, 0.35, 1.9) * plan.thin;
    const bright = !DARK_CUTS.has(plan.cut) && plan.colour === 'white';
    // a two-strand braid keeps its dark strand dark (indigo, black): drawn, not added
    const add = bright && ADD_MATERIALS.has(plan.m) && !BRAID_PAIRS394.includes(plan.cut);
    const box = this.add.container(0, 0);
    const pieces = { start: null, mids: [], end: null };
    const mk = (part) => {
      const P = B.parts[part];
      const s = this.add.sprite(0, 0, sheet.key, P.f0).setOrigin(0, P.ay / B.cellH);
      if (add) s.setBlendMode(ADD);
      box.add(s);
      return s;
    };
    if (B.parts.start) pieces.start = mk('start');
    if (B.parts.end) pieces.end = mk('end');
    const st = { plan, box, pieces, t0: (this.time && this.time.now) || 0, alive: true };
    const frameOf = (P, el) => {
      const k = Math.floor(el / (P.ms || 83));
      const i = P.loop ? k % P.frames : Math.min(P.frames - 1, k);
      return P.f0 + (plan.rev ? P.frames - 1 - i : i);
    };
    const aim = (el) => {
      const f = read(from), t = read(to);
      if (!f || !t) return false;
      const p0 = isoProject(f.x, f.y), p1 = isoProject(t.x, t.y);
      const ax = p0.x, ay = p0.y - BEAM_LIFT, dx = p1.x - ax, dy = (p1.y - BEAM_LIFT + 6) - ay;
      const len = Math.max(24, Math.hypot(dx, dy));
      const lay = beamLayout(plan.m, len);
      while (pieces.mids.length < lay.n) {
        const s = this.add.sprite(0, 0, sheet.key, B.parts.mid.f0).setOrigin(0, B.parts.mid.ay / B.cellH);
        if (add) s.setBlendMode(ADD);
        box.addAt(s, 0);
        pieces.mids.push(s);
      }
      const fm = frameOf(B.parts.mid, el);
      pieces.mids.forEach((s, i) => {
        if (i >= lay.n) { s.setVisible(false); return; }
        s.setVisible(true).setPosition(lay.midX0 + i * B.parts.mid.w, 0).setFrame(fm);
        if (i === lay.n - 1 && lay.lastW < B.parts.mid.w) s.setCrop(0, 0, lay.lastW, B.cellH); else s.setCrop();
      });
      if (pieces.start) pieces.start.setPosition(lay.startX, 0).setFrame(frameOf(B.parts.start, el)).setCrop(0, 0, B.parts.start.w, B.cellH);
      if (pieces.end) pieces.end.setPosition(lay.endX, 0).setFrame(frameOf(B.parts.end, el)).setCrop(0, 0, B.parts.end.w, B.cellH);
      box.setPosition(ax, ay).setRotation(Math.atan2(dy, dx)).setScale(1, dx < 0 ? -thick : thick);
      box.setDepth(isoDepth(Math.max(f.x, t.x), Math.max(f.y, t.y)) + 100000);
      st.ax = ax; st.ay = ay; st.ex = ax + dx; st.ey = ay + dy; st.f = f; st.t = t;
      return true;
    };
    if (!aim(0)) { box.destroy(); return false; }
    const a0 = 0.95;
    box.setAlpha(a0);
    this.tweens.addCounter({
      from: 0, to: 1, duration: ms,
      onUpdate: (tw) => {
        if (!box.active) return;
        const v = tw.getValue();
        if (!aim(v * ms)) { box.destroy(); return; }
        // a quick grow-in (the first 120ms) and a fade over the last quarter
        const grow = Math.min(1, (v * ms) / 120);
        box.scaleY *= 0.35 + 0.65 * grow;
        if (v > 0.75) box.setAlpha(a0 * Math.max(0, (1 - v) / 0.25));
      },
      onComplete: () => { st.alive = false; if (box.active) box.destroy(); },
    });
    // the flare at the hand
    const F = BEAMFX394.flare;
    this._bw394Once(flare.key, F.frames, F.ms, st.ax, st.ay, { add: bright, alpha: 0.95, depth: box.depth + 1, sx: clamp(thick, 0.6, 1.4) });
    // a splash on every tick: where the beam lands, and on each body the line crosses
    const ticks = Math.max(1, o.ticks || 3), every = Math.max(60, o.every || 250);
    const SP = BEAMFX394[plan.splash] || BEAMFX394.splash;
    for (let i = 0; i < ticks; i++) {
      const fire = () => {
        if (!st.alive && i > 0) return;
        this._bw394Once(splash.key, SP.frames, SP.ms, st.ex, st.ey, { add: bright, alpha: 0.9, depth: box.depth + 1, sx: 0.9 });
        if (this._beamLineHits && st.f && st.t) {
          const ang = Math.atan2(st.t.y - st.f.y, st.t.x - st.f.x), len = Math.hypot(st.t.x - st.f.x, st.t.y - st.f.y);
          for (const m of this._beamLineHits(st.f.x, st.f.y, ang, len, o.width || 28).slice(0, 3)) {
            const q = isoProject(m.wx, m.wy);
            this._bw394Once(splash.key, SP.frames, SP.ms, q.x, q.y - 18, { add: bright, alpha: 0.85, depth: isoDepth(m.wx, m.wy) + 100001, sx: 0.75 });
          }
        }
      };
      if (i === 0) fire(); else if (this.time && this.time.delayedCall) this.time.delayedCall(i * every, fire);
    }
    if (plan.stream) this._beam394Stream(plan, st, ms);
    if (plan.swarm && this._fx393Layer && this.world && this.player) {
      const ctx = { spec: { dtype: damageFxFor(a) }, wx: read(from).x, wy: read(from).y, aim: this.player.aimAngle || 0, reach: o.len || 260, beamMs: ms };
      this._fx393Layer({ f: 'speckswarm', c: 'pitch', shape: 'along', n: 5, scale: 0.9, every: 80, laps: 2 }, ctx);
    }
    this._beam394Casts = (this._beam394Casts || 0) + 1;
    this._beam394Last = { m: plan.m, cut: plan.cut, why: plan.why, gap: plan.gap, mids: pieces.mids.length };
    return true;
  },
  /** "Tracer streams: the projectile stills repeated along the beam; the bullet tracer is a drawn streak." */
  _beam394Stream(plan, st, ms) {
    const key = plan.stream === 'tracer' ? null : projStillKey(plan.stream);
    const every = 70;
    for (let t = 0; t < ms - 120; t += every) {
      const go = () => {
        if (!st.alive || st.ax == null || !st.box.active) return;
        let spr;
        if (key && this.textures.exists(key)) {
          spr = this.add.image(st.ax, st.ay, key).setScale(0.5);
          if (spr.texture.setFilter) spr.texture.setFilter(NEAREST);
          const mo = PROJ_MOTION[plan.stream] || {};   // the way the still points
          spr.setRotation(Math.atan2(st.ey - st.ay, st.ex - st.ax) - (mo.base || 0) + (mo.spin ? t * 0.02 : 0));
        } else {
          const c = DAMAGE_FX_COLORS.fire;
          spr = this.add.rectangle(st.ax, st.ay, 14, 2, c).setRotation(Math.atan2(st.ey - st.ay, st.ex - st.ax)).setBlendMode(ADD);
        }
        spr.setDepth(st.box.depth + 2);
        this.tweens.add({ targets: spr, x: st.ex, y: st.ey, duration: 220, onComplete: () => spr.destroy() });
      };
      if (t === 0) go(); else if (this.time && this.time.delayedCall) this.time.delayedCall(t, go);
    }
  },
  /** The convert flash: a full-stack condition turning into another, over the body, in the new condition's colour. */
  _convertFlash394(m, cond) {
    if (!m || !this.add) return false;
    const def = cond ? conditionDef(cond) : null;
    const dtype = damageFxFor({ color: (def && def.color) || '#ffffff' });
    const sh = beamFxSheet('convert', dtype);
    if (!this._bw394Want(sh)) return false;
    const C = BEAMFX394.convert, q = isoProject(m.wx, m.wy);
    this._convertFlashes394 = (this._convertFlashes394 || 0) + 1;
    return !!this._bw394Once(sh.key, C.frames, C.ms, q.x, q.y - 20, { add: true, alpha: 0.95, depth: isoDepth(m.wx, m.wy) + 100002 });
  },

  // ---------------------------------------------------------------------------------------------- the walls --
  /** Lay a barrier's round-394 art. True when laid (the round-388 wall is then not built); false when the barrier
   *  has no row here or its sheets are still loading. */
  _wall394Build(w) {
    if (!w || w.fx || !this.add || !w.spec) return false;
    const plan = wallArtFor394(w.spec);
    if (!plan) return false;
    const dtype = damageFxFor(w.spec);
    if (!this._bw394WantAll(wallSheetsFor(plan, dtype))) return false;
    const fx = { r394: true, plan, dtype, born: (this.time && this.time.now) || 0, slices: [], flat: null, extra: [], puffed: false };
    const cut = (c) => (!c || c === 'type' ? dtype : c);
    if (w.kind === 'pull') this._wall394Ring(w, fx, plan, cut);
    else {
      if (plan.strip && !plan.plane) this._wall394Strip(w, fx, plan);
      if (plan.seg) this._wall394Line(w, fx, { kind: 'seg', key: wallSegKey(plan.seg), rec: WALL394[plan.seg], tint: plan.tint, low: plan.low });
      if (plan.anim) {
        const sh = wallAnimSheet(plan.anim, cut(plan.ac));
        this._wall394Line(w, fx, { kind: 'anim', key: sh.key, rec: WALLANIM394[plan.anim], low: plan.low, add: plan.anim === 'arc_fence' });
      }
      if (plan.plane) {
        this._wall394Line(w, fx, { kind: 'anim', key: wallAnimSheet('plane', 'native').key, rec: WALLANIM394.plane, tint: plan.pt,
          alpha: plan.alpha || 0.62, add: !!plan.add, low: plan.low });   // a sheet of coloured light reads on grass unblended; a glare adds
        if (plan.overlay) this._wall394Line(w, fx, { kind: 'seg', key: `bw394_ov_${plan.overlay}`, rec: OVERLAY394[plan.overlay], tint: plan.ot || plan.pt,
          alpha: plan.oa || 0.85, add: BRIGHT_OVERLAYS.has(plan.overlay), low: plan.low, layer: 1 });
        if (plan.edge) {
          const sh = wallAnimSheet('flame', plan.edge), rec = WALLANIM394.plane;
          this._wall394Line(w, fx, { kind: 'anim', key: sh.key, rec: WALLANIM394.flame, edge: (rec.foot - rec.top) * (plan.low || 1), sy: 0.35, add: true, layer: 2 });
        }
        if (plan.strip) this._wall394Strip(w, fx, plan);
      }
      if (plan.over) {
        const sh = wallAnimSheet(plan.over, cut(plan.oc));
        const hRec = plan.seg ? WALL394[plan.seg] : null;
        this._wall394Line(w, fx, { kind: 'anim', key: sh.key, rec: WALLANIM394[plan.over], alpha: plan.ol || 0.85, add: plan.over !== 'flame' || cut(plan.oc) !== 'pitch',
          sy: hRec ? clamp((hRec.foot - hRec.top) / 56, 0.45, 1) : 1, layer: 1 });
      }
    }
    // the puff along the base ("with the existing puff along the base")
    if (this._sheetBurst && w.kind !== 'pull' && !(plan.strip && !plan.plane && !plan.seg)) {
      const n = Math.max(2, Math.round(w.len / 40));
      for (let k = 0; k <= n; k++) {
        const u = k / n - 0.5;
        try {
          this._sheetBurst('puff', plan.seg ? 'brown' : 'white', w.x + Math.cos(w.a) * w.len * u, w.y + Math.sin(w.a) * w.len * u,
            { scale: 1.5, alpha: 0.7, delay: k * 30, fade: 0.4, dy: -4 });
        } catch (e) { /* the puff is seasoning */ }
      }
    }
    if (plan.burst) {
      const sh = projAnimSheet(plan.burst, 'native'), R = PROJANIM394[plan.burst], p = isoProject(w.x, w.y);
      this._bw394Once(sh.key, R.frames, R.ms, p.x, p.y, { depth: isoDepth(w.x, w.y) + 2, sx: clamp(w.len / 110, 0.8, 1.8), sy: clamp(w.len / 160, 0.6, 1.3) });
    }
    if (plan.drop && this.textures.exists(PORTCULLIS_KEY)) {
      const p = isoProject(w.x, w.y), tex = this.textures.get(PORTCULLIS_KEY);
      const n = Math.max(1, (tex.frameTotal || 2) - 1);
      this._bw394Once(PORTCULLIS_KEY, n, 100, p.x, p.y, { oy: 39 / 64, depth: isoDepth(w.x, w.y) + 6, sx: clamp(w.len / 96, 0.8, 2) });
    }
    w.fx = fx;
    w.fxLife = w.t;
    this._wall394Built = (this._wall394Built || 0) + 1;
    this._wall394Last = { why: plan.why, gap: plan.gap || null, seg: plan.seg || null, anim: plan.anim || null, plane: !!plan.plane, strip: plan.strip || null,
      slices: fx.slices.length };
    this._wall394Tick(w, 0);
    return true;
  },
  /** A tile laid along the barrier line in 16 px columns, each standing on its own point of the line (so a wall that
   *  runs across the iso view climbs with it rather than standing as one flat card). */
  _wall394Line(w, fx, o) {
    const rec = o.rec;
    if (!rec || !this.textures.exists(o.key)) return 0;
    const tex = this.textures.get(o.key);
    if (tex.setFilter) tex.setFilter(NEAREST);
    const cellW = rec.cell || rec.w, cellH = rec.cellH || rec.h, frames = rec.frames || 1;
    const half = w.len / 2;
    const ax = w.x - Math.cos(w.a) * half, ay = w.y - Math.sin(w.a) * half;
    const bx = w.x + Math.cos(w.a) * half, by = w.y + Math.sin(w.a) * half;
    const pa = isoProject(ax, ay), pb = isoProject(bx, by);
    const L2R = pa.x <= pb.x;
    const A = L2R ? { wx: ax, wy: ay, p: pa } : { wx: bx, wy: by, p: pb }, Bp = L2R ? { wx: bx, wy: by, p: pb } : { wx: ax, wy: ay, p: pa };
    const sdx = Math.abs(Bp.p.x - A.p.x), sdy = Math.abs(Bp.p.y - A.p.y);
    // the column width: 16 px on a wall across the screen, narrower as it slopes, so each column steps down at most a
    // couple of pixels from the last (a sloped wall reads as a slope, not a staircase)
    const slope = sdy / Math.max(1, sdx);
    const sw = slope > 0.25 ? 4 : slope > 0.12 ? 8 : SLICE;
    const cols = Math.max(1, Math.floor(cellW / sw));
    // the slice frames, made once per texture and width
    for (let f = 0; f < frames; f++) {
      for (let i = 0; i < cols; i++) {
        const name = `bw394s${sw}_${f}_${i}`;
        if (!tex.has(name)) tex.add(name, 0, f * cellW + i * sw, 0, sw, cellH);
      }
    }
    // one more column than the span needs, so neighbours overlap by a pixel or two rather than leaving a seam
    const n = Math.max(cols, Math.ceil(Math.max(sdx, sdy * 1.6) / sw) + 1);
    const foot = rec.foot || cellH;
    const sy = (o.low || 1) * (o.sy || 1);
    let made = 0;
    for (let j = 0; j < n; j++) {
      const u = n === 1 ? 0.5 : j / (n - 1);
      const wx = A.wx + (Bp.wx - A.wx) * u, wy = A.wy + (Bp.wy - A.wy) * u;
      const p = isoProject(wx, wy);
      const col = j % cols;
      const spr = this.add.sprite(p.x, p.y + 2, o.key, `bw394s${sw}_0_${col}`).setOrigin(0.5, foot / cellH);
      if (o.tint != null) spr.setTint(o.tint);
      if (o.add) spr.setBlendMode(ADD);
      spr.setDepth(isoDepth(wx, wy) + 3 + (o.layer || 0));
      fx.slices.push({ spr, col, sw, wx, wy, gy: p.y + 2, foot, cellH, frames, ms: rec.ms || 100, sy, edge: o.edge || 0,
        alpha: o.alpha != null ? o.alpha : 1, phase: (j % 7) * 0.6, f: -1 });
      made++;
    }
    return made;
  },
  /** A burn line laid flat along the barrier (red ink, salt, chalk glyphs, stakes, caltrops, frozen droplets): the strip
   *  tiled along the line in the world's own frame, then squashed onto the iso ground. */
  _wall394Strip(w, fx, plan) {
    const key = `bw394_strip_${plan.strip}`, rec = STRIP394[plan.strip];
    if (!rec || !this.textures.exists(key)) return 0;
    const tex = this.textures.get(key);
    if (tex.setFilter) tex.setFilter(NEAREST);
    const p = isoProject(w.x, w.y);
    const outer = this.add.container(p.x, p.y);
    const inner = this.add.container(0, 0);
    outer.add(inner);
    const k = clamp((w.thick || 30) * 1.5 / rec.h, 0.5, 2.2);        // world units per art px across the strip
    const step = rec.w * k;
    const n = Math.max(1, Math.ceil(w.len / step));
    const imgs = [];
    for (let i = 0; i < n; i++) {
      const img = this.add.image(-w.len / 2 + step * (i + 0.5), 0, key).setScale(k);
      if (plan.st != null) img.setTint(plan.st);
      img.setAlpha(0);
      inner.add(img);
      imgs.push(img);
    }
    // turned onto the line in world space, then the iso ground matrix (rotate 45 degrees, squash) -- isoProject's own
    inner.setRotation(w.a + Math.PI / 4);
    outer.setScale(Math.SQRT2, Math.SQRT2 / 2).setDepth(isoDepth(w.x, w.y) - 900);
    fx.flat = { outer, imgs };
    return n;
  },
  /** A pulling barrier: the wall's tiles stood round the reach of the pull (or the eclipse disc hanging at its eye). */
  _wall394Ring(w, fx, plan, cut) {
    const p = isoProject(w.x, w.y);
    if (plan.disc) {
      const sh = projAnimSheet('eclipse_disc', 'fire'), R = PROJANIM394.eclipse_disc;
      if (this.textures.exists(sh.key)) {
        const spr = this.add.sprite(p.x, p.y - 30, sh.key, 0).setScale(clamp(w.len / 40, 1.4, 3)).setDepth(isoDepth(w.x, w.y) + 4);
        fx.extra.push({ spr, frames: R.frames, ms: R.ms, spin: 0.4 });
      }
      return;
    }
    const key = plan.seg ? wallSegKey(plan.seg) : null;
    const rec = plan.seg ? WALL394[plan.seg] : null;
    if (!key || !rec || !this.textures.exists(key)) return;
    const K = Math.max(6, Math.round(w.len / 18));
    for (let i = 0; i < K; i++) {
      const ang = (i / K) * Math.PI * 2;
      const wx = w.x + Math.cos(ang) * w.len * 0.8, wy = w.y + Math.sin(ang) * w.len * 0.8;
      const q = isoProject(wx, wy);
      const spr = this.add.sprite(q.x, q.y + 2, key).setOrigin(0.5, rec.foot / rec.h).setScale(0.6).setDepth(isoDepth(wx, wy) + 3);
      if (plan.tint != null) spr.setTint(plan.tint);
      fx.slices.push({ spr, col: -1, wx, wy, gy: q.y + 2, foot: rec.foot, cellH: rec.h, frames: 1, ms: 100, sy: 0.6, sx: 0.6, alpha: 1, phase: 0, f: -1, whole: true });
    }
    if (this.textures.exists('fx_vortex_grey')) {
      const v = this.add.sprite(p.x, p.y, 'fx_vortex_grey', 0).setScale((2.83 * w.len) / 122, (1.415 * w.len) / 46).setAlpha(0.5).setDepth(isoDepth(w.x, w.y) - 2);
      fx.extra.push({ spr: v, frames: 8, ms: 70 });
    }
  },
  /** Animate a round-394 barrier: the rise out of the ground (cropped at the ground line), each moving wall's frames
   *  on its own phase, the burn line drawn in along its length, and the fade over its last second. */
  _wall394Tick(w, dt) {
    const fx = w && w.fx;
    if (!fx || !fx.r394) return;
    const now = (this.time && this.time.now) || 0;
    const age = (now - fx.born) / 1000;
    const rise = Math.min(1, age / RISE_S), r = 1 - (1 - rise) * (1 - rise);
    const fade = clamp(w.t / 1.0, 0, 1);
    for (const s of fx.slices) {
      if (!s.spr.active) continue;
      if (s.frames > 1) {
        const f = Math.floor(now / s.ms + s.phase) % s.frames;
        if (f !== s.f) { s.f = f; s.spr.setFrame(`bw394s${s.sw}_${f}_${s.col}`); }
      }
      const shown = Math.max(1, Math.round(s.foot * r));
      const sx = s.sx || 1;
      s.spr.setScale(sx, s.sy);
      // risen to `r`: the top `shown` rows of the art stand above the ground line, the rest still below it
      s.spr.setCrop(0, 0, s.whole ? s.spr.frame.realWidth : s.sw, shown + (s.cellH - s.foot) * (r >= 1 ? 1 : 0));
      s.spr.y = s.gy + (s.foot - shown) * s.sy - s.edge * (s.sy > 0 ? 1 : 0) * r;
      s.spr.setAlpha(s.alpha * fade);
    }
    for (const e of fx.extra) {
      if (!e.spr.active) continue;
      e.spr.setFrame(Math.floor(now / e.ms) % e.frames).setAlpha(Math.min(1, rise * 1.5) * fade * (e.spin ? 1 : 0.5));
    }
    if (fx.flat) {
      const n = fx.flat.imgs.length;
      fx.flat.imgs.forEach((img, i) => img.setAlpha(clamp(age / RISE_S * n - i, 0, 1) * 0.95 * fade));
    }
  },
  _wall394Free(w) {
    const fx = w && w.fx;
    if (!fx || !fx.r394) return;
    for (const s of fx.slices) if (s.spr && s.spr.destroy) s.spr.destroy();
    for (const e of fx.extra) if (e.spr && e.spr.destroy) e.spr.destroy();
    if (fx.flat && fx.flat.outer) fx.flat.outer.destroy();
    w.fx = null;
  },

  // -------------------------------------------------------------------------------------------- projectiles --
  /** A round-394 flight as it leaves the hand (after round 393's init has turned and spun it): nearest-neighbour
   *  pixels, the card fan at the caster as a volley leaves, and the impact burst when it ends on a body. */
  _flight394Init(sprite, flight) {
    if (!sprite || !flight || !flight.r394) return;
    if (sprite.texture && sprite.texture.setFilter && flight.frames === 1) sprite.texture.setFilter(NEAREST);
    const now = (this.time && this.time.now) || 0;
    if (flight.fan && this.textures.exists(flight.fan.key) && now - (this._bw394FanAt || -1e9) > 260) {
      this._bw394FanAt = now;
      const R = PROJANIM394[flight.fan.name];
      this._bw394Once(flight.fan.key, R.frames, R.ms, sprite.x, sprite.y - 6, { ox: R.ax, oy: R.ay, depth: sprite.depth + 1, rot: sprite.rotation || 0 });
    }
    if (flight.burst && this._bw394Want(flight.burst)) {
      const R = PROJANIM394[flight.burst.name];
      sprite.once('destroy', () => {
        // a flight that ends ON a body (a hit, not a miss running out of air) bursts there
        const x = sprite.x, y = sprite.y;
        const hit = (this.monsters || []).some(m => m && m.sprite && Math.hypot(m.sprite.x - x, (m.sprite.y - 16) - y) < 40);
        if (!hit || !this.textures || !this.textures.exists(flight.burst.key)) return;
        this._bw394Once(flight.burst.key, R.frames, R.ms, x, y, { ox: R.ax, oy: R.ay, depth: sprite.depth + 1,
          sx: clamp(36 / Math.max(R.cell, R.cellH), 0.6, 1.4) * (R.cell >= 96 ? 1.2 : 1) });
        this._bw394Bursts = (this._bw394Bursts || 0) + 1;
      });
    }
    this._flight394Count = (this._flight394Count || 0) + 1;
  },
};

export { hexOf as _bw394Hex };
