// ===========================================================================
// ROUND 394 -- THE GAP ROWS DRAWN FROM ART ALREADY IN THE GAME, PLAYED.
//
//   r392 brief, section 2: "Player copies: draw the current player (or target) sheet tinted, translucent and with an
//   outline jitter." "Lighting and screen effects." "Lines drawn in code (1-6 px core plus a soft glow, with a
//   travelling bead or knot)." "redaction: black bars."  Section 1: the props, coins, leaves, stills and decals the
//   rows are mapped onto ("beehive box -> skep turret; scarecrow -> scarecrow pole; alembic rig -> still turret; guard-post
//   spear rack -> pike rank; chalk / golden / silver ritual circles -> seal-circle, mandala, stance ring, candle-ring").
//
// src/data/fxMap394.js says what each gap draws; round 393's player (fxArt393Mixin `_fx393Layer`) hands every shape in
// FXMAP_SHAPES here. Like round 393's, every door answers null / false when what it needs is not loaded, and nothing
// here changes what an ability does -- only what it looks like.
//
//   _fxm394Layer(L, ctx)              one layer (ctx: { spec, wx, wy, aim, reach, beamMs?, path? })
//   _fxm394SummonSprite(a, p, kind)   a turret's / a called creature's body (WorldScene._spawnSummon)
//   _fxm394SummonRemap(a)             a called creature's family and shade (the spring walker, the fire whirl)
//   _fxm394Cast(a, fx)                a cast the template plays no fx for (a shield: Body Double's copy of you)
//   _fxm394FlightInit / _fxm394FlightTick   a flight's hue cycle, swell and flattened ring (fxArt393Mixin's flight)
// ===========================================================================
import { isoProject, isoDepth } from '../data/iso.js';
import { fxFamilyInfo } from '../data/spellFx.js';
import { DAMAGE_FX_COLORS, damageFxFor } from '../data/damageFx.js';
import { FXMAP_SHAPES, LINE_STYLES, STREAK_KEY, STREAK_SIZE, fxMapTurretFor, fxMapSummonFor } from '../data/fxMap394.js';
import { CITY_PROP_ART_R381, CITY_PROPS_R381, RITUAL_CIRCLES_HD } from '../data/cityProps.js';
import { MONSTER_ART } from '../data/monsterArt.js';
import { fx394SheetFor } from '../data/fxArt394.js';            // the one-off agent's sheets (claw rake, mirror shard...)
import { projStillKey, projAnimSheet } from '../data/beamWall394.js';   // the projectile agent's stills and bursts

const ADD = 'ADD';
const TOP = 1e7;                          // screen washes sit over the world (the DOM UI is above the canvas anyway)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
/** The screen vector of a world direction (iso: east runs down-right). */
const scr = (ang) => ({ x: Math.cos(ang) - Math.sin(ang), y: (Math.cos(ang) + Math.sin(ang)) / 2 });
/** A hue (0..1) as 0xrrggbb, full saturation. */
function hue(h) {
  const k = (n) => (n + h * 6) % 6;
  const f = (n) => Math.round(255 * (1 - Math.max(0, Math.min(k(n), 4 - k(n), 1))));
  return (f(5) << 16) | (f(3) << 8) | f(1);
}
const mixRGB = (a, b, t) => {
  const r = lerp((a >> 16) & 255, (b >> 16) & 255, t), g = lerp((a >> 8) & 255, (b >> 8) & 255, t), bl = lerp(a & 255, b & 255, t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};
/** Shapes that run their own `delay` (the rest are started late by _fxm394Layer). */
const SELF_DELAY = new Set(['ext', 'ringof', 'onbodies', 'runner', 'travelflat']);

/** The bodies a player copy can be: how it is tinted and how it moves. */
const COPY_LOOK = {
  decoy:    { tint: 0xc8a8ff, alpha: 0.6, edge: 0x9a5aff, flicker: true },
  double:   { tint: 0xfff0e0, alpha: 0.6, shimmer: true },
  likeness: { tint: 0xe8ecf4, alpha: 0.7, jitter: 2, edge: 0xffffff },
  shadow:   { tint: 0x000000, alpha: 0.85, edge: 0x9a5aff, rim: true },
  replica:  { tint: 0xf2eee4, alpha: 0.95, frozen: true, stiff: 0.9 },
};

export const FxMap394Mixin = {
  _fxm394Owns(shape) { return FXMAP_SHAPES.has(shape); },

  /** One layer of a plan whose shape is this round's. Returns something truthy when it drew (or will, after a delay). */
  _fxm394Layer(L, ctx) {
    const fn = this[`_fxm394_${L.shape}`];
    if (typeof fn !== 'function' || !this.add) return null;
    this._fxm394Drawn = (this._fxm394Drawn || 0) + 1;
    this._fxm394Shapes = this._fxm394Shapes || {};
    this._fxm394Shapes[L.shape] = (this._fxm394Shapes[L.shape] || 0) + 1;
    if (L.delay && !SELF_DELAY.has(L.shape) && this.time && this.time.delayedCall) {
      this.time.delayedCall(L.delay, () => { try { fn.call(this, L, ctx); } catch (e) { console.warn('[fxm394]', L.shape, e && e.message); } });
      return true;
    }
    try { return fn.call(this, L, ctx) || null; } catch (e) { console.warn('[fxm394]', L.shape, e && e.message); return null; }
  },

  // ---------------------------------------------------------------------------------------------- helpers --
  /** Run `step(u, ms)` every frame for `ms` (u 0..1), then `done`. */
  _fxm394Run(ms, step, done) {
    if (!this.tweens) return null;
    return this.tweens.addCounter({ from: 0, to: 1, duration: Math.max(16, ms),
      onUpdate: (tw) => { try { step(tw.getValue(), ms); } catch (e) { /* art only */ } },
      onComplete: () => { try { if (done) done(); } catch (e) { /* art only */ } } });
  },
  _fxm394Hand() {
    const p = isoProject(this.world.x, this.world.y);
    return { x: p.x, y: p.y - 26 };
  },
  _fxm394Along(ctx, u) { return { x: ctx.wx + Math.cos(ctx.aim) * ctx.reach * u, y: ctx.wy + Math.sin(ctx.aim) * ctx.reach * u }; },
  /** Living bodies the layer touches: those on the beam's line, else the nearest within the reach of the point. */
  _fxm394Bodies(ctx, n = 6, mult = 1.2) {
    if (ctx.beamMs && this._beamLineHits && this.world) {
      return this._beamLineHits(this.world.x, this.world.y, this.player ? this.player.aimAngle || 0 : ctx.aim, ctx.reach, 40).slice(0, n);
    }
    const r = Math.max(60, ctx.reach * mult);
    return (this.monsters || []).filter(m => m && m.alive && m.sprite && Math.hypot(m.wx - ctx.wx, m.wy - ctx.wy) <= r)
      .sort((a, b) => Math.hypot(a.wx - ctx.wx, a.wy - ctx.wy) - Math.hypot(b.wx - ctx.wx, b.wy - ctx.wy)).slice(0, n);
  },
  _fxm394Tint(L, ctx) {
    if (typeof L.tint === 'number') return L.tint;
    const t = (ctx && ctx.spec && ctx.spec.dtype) || null;
    return t && DAMAGE_FX_COLORS[t] != null ? DAMAGE_FX_COLORS[t] : 0xffffff;
  },
  /** A loaded sheet key among candidates, else null; asks the loader for the first it can describe. */
  _fxm394Ext(L, ctx) {
    const dtype = (ctx && ctx.spec && ctx.spec.dtype) || 'native';
    const want = [];
    if (L.stem) want.push(`fx394_${L.stem}_${dtype}`, `fx394_${L.stem}_native`, `fx394_${L.stem}`);
    if (L.proj) want.push(projStillKey(L.proj));
    if (L.projAnim) { const s = projAnimSheet(L.projAnim, dtype); if (s) want.push(s.key); }
    for (const k of (L.keys || [])) want.push(k);
    for (const k of want) if (this.textures.exists(k)) return k;
    // not here yet: fetch the first we know how to (this cast draws its fallback; the next one the art)
    for (const k of want) {
      let s = null;
      try { s = fx394SheetFor(k); } catch (e) { s = null; }
      if (!s && L.projAnim) { const a = projAnimSheet(L.projAnim, dtype); if (a && a.key === k) s = a; }
      if (!s && L.proj && k === projStillKey(L.proj)) s = { key: k, url: `./public/assets/beamwall/proj/${L.proj}.png`, image: true };
      if (!s) continue;
      this._fxm394Pending = this._fxm394Pending || new Set();
      if (this._fxm394Pending.has(k)) break;
      this._fxm394Pending.add(k);
      try {
        if (s.image) this.load.image(k, s.url);
        else this.load.spritesheet(k, s.url, { frameWidth: s.cell, frameHeight: s.cellH || s.cell });
        if (!this.load.isLoading()) this.load.start();
      } catch (e) { /* the fallback stands in */ }
      break;
    }
    return null;
  },
  _fxm394Frames(key) {
    const t = this.textures.get(key);
    const n = t && t.frameTotal ? t.frameTotal - 1 : 1;   // __BASE is counted
    return Math.max(1, n);
  },

  // ------------------------------------------------------------------------------------- sheets in new places --
  /** A flat sheet (a shockring) moving out along the aim while it plays: "shockring moved along the line". */
  _fxm394_travelflat(L, ctx) {
    const info = fxFamilyInfo(L.f);
    const key = info && this._sheetKey ? this._sheetKey(L.f, this._fx393Colour(L, ctx.spec)) : null;
    if (!key) return null;
    const a = isoProject(ctx.wx + Math.cos(ctx.aim) * 16, ctx.wy + Math.sin(ctx.aim) * 16);
    const e = this._fxm394Along(ctx, 1), b = isoProject(e.x, e.y);
    const k = clamp(ctx.reach / 140, 0.35, 1.6) * (L.scale || 1);
    return this._fx393Sprite(key, a.x, a.y, { frames: info.frames, frameMs: (info.frameMs || 60) / (L.speed || 1), laps: 2, sx: k, sy: k * 0.5,
      to: { x: b.x, y: b.y }, add: true, alpha: 0.7 * (L.alpha || 1), delay: L.delay || 0, depth: isoDepth(e.x, e.y) + 2 });
  },
  /** The same family laid at `n` points on a ring round the point (the candles of a candle ring, mirror glints). */
  _fxm394_ringof(L, ctx) {
    let first = null;
    const n = Math.max(1, L.n || 6), r = Math.max(30, ctx.reach * (L.radius || 0.8));
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const s = this._fx393Layer({ ...L, shape: (fxFamilyInfo(L.f) || {}).anchor === 'ground' ? 'ground' : 'centre', delay: (L.delay || 0) + i * 30 },
        { ...ctx, wx: ctx.wx + Math.cos(ang) * r, wy: ctx.wy + Math.sin(ang) * r });
      if (!first) first = s;
    }
    return first;
  },
  /** The family over every body the layer touches (a little whirl round each one held in the gyre). */
  _fxm394_onbodies(L, ctx) {
    let first = null;
    for (const m of this._fxm394Bodies(ctx, 5)) {
      const s = this._fx393Layer({ ...L, shape: 'ground', laps: L.laps || (ctx.beamMs ? Math.max(1, Math.round(ctx.beamMs / 900)) : 1) }, { ...ctx, wx: m.wx, wy: m.wy, reach: 40 });
      if (!first) first = s;
    }
    return first;
  },
  /** A sheet that runs from the hand to the beam's end while it holds (the spark racing down a fuse). */
  _fxm394_runner(L, ctx) {
    const info = fxFamilyInfo(L.f);
    const key = info && this._sheetKey ? this._sheetKey(L.f, this._fx393Colour(L, ctx.spec)) : null;
    if (!key) return null;
    const ms = ctx.beamMs || 900;
    const a = isoProject(ctx.wx, ctx.wy), e = this._fxm394Along(ctx, 1), b = isoProject(e.x, e.y);
    const sv = scr(ctx.aim);
    const spr = this._fx393Sprite(key, a.x, a.y, { frames: info.frames, frameMs: info.frameMs || 60, laps: Math.max(1, Math.round(ms / ((info.frames || 8) * (info.frameMs || 60)))),
      sx: L.scale || 0.6, rot: Math.atan2(sv.y, sv.x) + Math.PI, ox: info.ax != null ? info.ax : 0.5, oy: info.ay != null ? info.ay : 0.5,
      to: { x: b.x, y: b.y }, add: true, alpha: 0.9, delay: L.delay || 0, fade: 0.1, depth: isoDepth(e.x, e.y) + 30001 });
    return spr;
  },
  /** Another agent's sheet (a one-off, a projectile burst) or a still, at the point / on the bodies / on a ring;
   *  its `fb` layer when that art is not loaded yet. */
  _fxm394_ext(L, ctx) {
    const key = this._fxm394Ext(L, ctx);
    if (!key) return L.fb ? this._fx393Layer(L.fb, ctx) : null;
    const frames = this._fxm394Frames(key);
    const pts = [];
    if (L.onBodies) for (const m of this._fxm394Bodies(ctx, 5)) pts.push([m.wx, m.wy]);
    else if (L.ringOf) for (let i = 0; i < L.ringOf; i++) { const a = (i / L.ringOf) * Math.PI * 2; pts.push([ctx.wx + Math.cos(a) * 36, ctx.wy + Math.sin(a) * 36]); }
    if (!pts.length) pts.push([ctx.wx, ctx.wy]);
    let first = null;
    pts.forEach(([wx, wy], i) => {
      const p = isoProject(wx, wy);
      const ground = L.anchor === 'ground';
      const spr = this._fx393Sprite(key, p.x, ground ? p.y + 2 : p.y - 16, { frames, frameMs: L.frameMs || 80, laps: L.laps || 1, hold: L.hold || 0,
        sx: L.scale || 1, ox: 0.5, oy: ground ? 0.94 : 0.5, add: !!L.add, alpha: L.alpha || 0.95, delay: (L.delay || 0) + i * 40, depth: isoDepth(wx, wy) + 90000 });
      if (spr && spr.texture && spr.texture.setFilter) spr.texture.setFilter(1);   // NEAREST: pixel art
      if (!first) first = spr;
    });
    return first;
  },

  // ------------------------------------------------------------------------------------------------ props --
  /** An r391 animated prop rising out of the ground (or dropping in from above), held, and gone: the grasping hands,
   *  the temple bell, the tentacle laid down a beam. Through round 393's prop players (creatureArtR393Mixin). */
  _fxm394Prop(prop, tint, wx, wy, o = {}) {
    if (!this._r393PropSprite) return null;
    const p = isoProject(wx, wy);
    const sp = this._r393PropSprite(prop, tint || null, p.x, p.y - (o.lift || 0), o.scale || 1);
    if (!sp) return null;
    sp.setDepth(isoDepth(wx, wy) + (o.lift ? 90005 : 6));
    if (o.alpha != null) sp.setAlpha(o.alpha);
    if (o.flipX) sp.setFlipX(true);
    const hold = o.hold != null ? o.hold : 600;
    if (o.drop) {
      // the temple bell drops over the caster and rings: in from above, a judder, then fades
      const y1 = sp.y;
      sp.y = y1 - 150;
      this.tweens.add({ targets: sp, y: y1, duration: 260, ease: 'Quad.easeIn', onComplete: () => {
        this.tweens.add({ targets: sp, x: sp.x + 2, duration: 40, yoyo: true, repeat: 3 });
        this.tweens.add({ targets: sp, alpha: 0, duration: 380, delay: hold, onComplete: () => sp.destroy() });
      } });
      return sp;
    }
    if (o.lift) {   // a bell hung over the head: in, held, out
      sp.setAlpha(0);
      this.tweens.add({ targets: sp, alpha: o.alpha != null ? o.alpha : 1, duration: 120, yoyo: true, hold, onComplete: () => sp.destroy() });
      return sp;
    }
    if (this._r393Rise) {
      this._r393Rise(sp, o.rise || 200, false, () => {
        this.time.delayedCall(hold, () => this._r393Rise(sp, 220, true, () => sp.destroy()));
      });
    } else this.time.delayedCall(hold + 300, () => sp.destroy());
    return sp;
  },
  _fxm394_prop(L, ctx) {
    const n = Math.max(1, L.n || 1);
    let first = null;
    for (let i = 0; i < n; i++) {
      let wx = ctx.wx, wy = ctx.wy;
      if (L.along) { const q = this._fxm394Along(ctx, (i + 1) / (n + 0.5)); wx = q.x; wy = q.y; }
      else if (n > 1) { const a = i * 2.399 + ctx.aim, r = ctx.reach * (L.spread || 0.6) * (0.35 + 0.65 * ((i * 7 + 3) % 10) / 10); wx += Math.cos(a) * r; wy += Math.sin(a) * r; }
      const go = () => this._fxm394Prop(L.prop, L.tint || null, wx, wy, { scale: L.scale, alpha: L.alpha, hold: L.hold, drop: L.drop, lift: L.lift, flipX: i % 2 === 1 });
      if (i === 0) first = go(); else this.time.delayedCall(i * 70, go);
    }
    return first || (n > 1 ? true : null);
  },
  /** Props risen in a row down a beam and held while it holds (the kraken's arm laid along the ground). */
  _fxm394_propalong(L, ctx) {
    const n = Math.max(2, L.n || 4), ms = ctx.beamMs || 900;
    let any = null;
    for (let i = 0; i < n; i++) {
      const q = this._fxm394Along(ctx, (i + 0.8) / n);
      const delay = i * (L.every || 80);
      const go = () => this._fxm394Prop(L.prop, L.tint || null, q.x, q.y, { scale: L.scale || 0.6, hold: Math.max(200, ms - delay - 300), flipX: i % 2 === 1, rise: 160 });
      if (!delay) any = go(); else { this.time.delayedCall(delay, go); any = any || true; }
    }
    return any;
  },
  /** A floor decal from the ritual circles (chalk / gold / silver), squashed onto the iso floor, tinted, held. */
  _fxm394_decal(L, ctx) {
    const H = RITUAL_CIRCLES_HD;
    const f = H.frames[L.circle];
    const def = CITY_PROPS_R381[L.circle];
    if (f == null || !def || !this.textures.exists(H.key)) return null;
    const p = isoProject(ctx.wx, ctx.wy);
    const k = (def.scale / H.up) * (L.scale || 1) * clamp(ctx.reach / 70, 0.6, 1.8);
    const box = this.add.container(p.x, p.y).setScale(1, def.squash || 0.6).setDepth(isoDepth(ctx.wx, ctx.wy) - 900);
    const img = this.add.image(0, 0, H.key, f).setScale(L.grow ? k * 0.3 : k).setAlpha(0);
    if (L.tint != null) img.setTint(L.tint);
    box.add(img);
    const hold = L.hold || 1000;
    this.tweens.add({ targets: img, alpha: 0.9, duration: 160 });
    if (L.grow) this.tweens.add({ targets: img, scale: k, duration: 420, ease: 'Cubic.easeOut' });
    if (L.spin) this.tweens.add({ targets: img, rotation: L.spin * Math.PI, duration: hold + 400 });
    if (L.pulse) this.tweens.add({ targets: img, scale: k * 1.06, duration: 260, yoyo: true, repeat: Math.max(1, Math.floor(hold / 520)) });
    this.tweens.add({ targets: img, alpha: 0, duration: 400, delay: hold, onComplete: () => box.destroy() });
    return box;
  },

  // ------------------------------------------------------------------------------------- coins, pendulum --
  _fxm394CoinAnim(key) {
    const ak = `${key}_fxm394`;
    if (!this.anims.exists(ak)) this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }), frameRate: 16, repeat: -1 });
    return ak;
  },
  /** Coins flung up and out, pattering down round the point (a burst purse, a jackpot, Windfall's cone). */
  _fxm394_coins(L, ctx) {
    const key = `fx393_coinspin_${L.rank || 'gold'}`;
    if (!this.textures.exists(key)) return null;
    const ak = this._fxm394CoinAnim(key);
    const n = Math.max(1, L.n || 8);
    const p = isoProject(ctx.wx, ctx.wy);
    let first = null;
    for (let i = 0; i < n; i++) {
      const ang = L.cone ? ctx.aim + ((i / Math.max(1, n - 1)) - 0.5) * 1.1 : (i / n) * Math.PI * 2 + i * 0.37;
      const d = (L.cone ? ctx.reach * (0.4 + 0.6 * ((i * 5) % 7) / 7) : 22 + ctx.reach * 0.45 * (((i * 7) % 5) / 5));
      const e = isoProject(ctx.wx + Math.cos(ang) * d, ctx.wy + Math.sin(ang) * d);
      const sp = this.add.sprite(p.x, p.y - 16, key, 0).setScale(0.5).setDepth(isoDepth(ctx.wx, ctx.wy) + 90002);
      sp.play({ key: ak, startFrame: i % 6 });
      const up = (L.fountain ? 70 : 34) + (i % 3) * 12, ms = 520 + (i % 4) * 70;
      this._fxm394Run(ms, (u) => {
        if (!sp.active) return;
        sp.setPosition(lerp(p.x, e.x, u), lerp(p.y - 16, e.y - 4, u) - Math.sin(u * Math.PI) * up);
      }, () => {
        if (!sp.active) return;
        sp.stop(); sp.setFrame(0);
        this.tweens.add({ targets: sp, alpha: 0, duration: 500, delay: 260 + (i % 3) * 80, onComplete: () => sp.destroy() });
      });
      if (!first) first = sp;
    }
    return first;
  },
  /** One coin flipped over the caster's head, landing face up (Heads You Heal, Tails They Heal). */
  _fxm394_coinflip(L, ctx) {
    const key = `fx393_coinspin_${L.rank || 'gold'}`;
    if (!this.textures.exists(key)) return null;
    const p = isoProject(this.world.x, this.world.y);
    const sp = this.add.sprite(p.x, p.y - 40, key, 0).setScale(0.65).setDepth(isoDepth(this.world.x, this.world.y) + 90003);
    sp.play({ key: this._fxm394CoinAnim(key) });
    this._fxm394Run(560, (u) => { if (sp.active) sp.setY(p.y - 40 - Math.sin(u * Math.PI) * 46); }, () => {
      if (!sp.active) return;
      sp.stop(); sp.setFrame(0);
      if (this._sheetKey) { const g = this._sheetKey('mote', 'gold'); if (g) this._fx393Sprite(g, sp.x, sp.y, { frames: 16, frameMs: 30, add: true, alpha: 0.8, depth: sp.depth + 1 }); }
      this.tweens.add({ targets: sp, alpha: 0, duration: 400, delay: 420, onComplete: () => sp.destroy() });
    });
    return sp;
  },
  /** The r388 pendulum swinging through its arc where the blow lands (or in front of the caster for the cone). */
  _fxm394_pendulum(L, ctx) {
    const key = 'fx393_pendulum';
    if (!this.textures.exists(key)) return null;
    const q = L.ahead ? this._fxm394Along(ctx, L.ahead) : { x: ctx.wx, y: ctx.wy };
    const p = isoProject(q.x, q.y);
    const k = (L.scale || 1) * 1.1;
    return this._fx393Sprite(key, p.x, p.y - 96 * k + 8, { frames: 12, frameMs: 55, ox: 0.5, oy: 0.04, sx: k, alpha: 0.95, fade: 0.2, hold: 120,
      depth: isoDepth(q.x, q.y) + 90001 });
  },

  // ---------------------------------------------------------------------------- particles and falling stills --
  /** The r388 weather particles flung out in a gust (leaves, snow), tumbling and settling. */
  _fxm394_particles(L, ctx) {
    const leaf = L.kind === 'leaf';
    const key = leaf ? 'wxa_leaves' : L.kind === 'snow' ? 'wxa_snow' : 'wxa_ash';
    if (!this.textures.exists(key)) return null;
    const n = Math.max(1, L.n || 12);
    const o = isoProject(ctx.wx, ctx.wy);
    let first = null;
    for (let i = 0; i < n; i++) {
      const ang = L.cone ? ctx.aim + (((i * 7) % n) / n - 0.5) * 1.2 : (i / n) * Math.PI * 2 + (i % 3) * 0.2;
      const d = ctx.reach * (0.35 + 0.65 * (((i * 11) % 9) / 9));
      const e = isoProject(ctx.wx + Math.cos(ang) * d, ctx.wy + Math.sin(ang) * d);
      const fr = leaf ? ((i % 4) * 4) : 0;
      const sp = this.add.sprite(o.x, o.y - 20, key, fr).setScale(leaf ? 1.2 : 1.4).setDepth(isoDepth(ctx.wx, ctx.wy) + 90002 + i);
      if (L.tint != null) sp.setTint(L.tint);
      const ms = 650 + (i % 5) * 90, spin = (i % 2 ? 1 : -1) * (4 + (i % 3));
      this._fxm394Run(ms, (u) => {
        if (!sp.active) return;
        sp.setPosition(lerp(o.x, e.x, u) + Math.sin(u * 9 + i) * 4, lerp(o.y - 20, e.y - 6, u) - Math.sin(u * Math.PI) * 18);
        sp.setRotation(u * spin);
        if (leaf) sp.setFrame(fr + (Math.floor(u * 12) % 4));
        if (u > 0.7) sp.setAlpha((1 - u) / 0.3);
      }, () => sp.destroy());
      if (!first) first = sp;
    }
    return first;
  },
  _fxm394StillKey(L, ctx) {
    if (L.keys || L.proj) { const k = this._fxm394Ext(L, ctx); if (k) return { key: k, ext: true }; }
    return L.art && this.textures.exists(L.art) ? { key: L.art, ext: false } : null;
  },
  /** Stills raining down out of the sky onto the area (the arrowstorm, the raining pinfeathers). */
  _fxm394_stillrain(L, ctx) {
    const st = this._fxm394StillKey(L, ctx);
    if (!st) return null;
    const n = Math.max(1, L.n || 10);
    let first = null;
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = ctx.reach * (0.15 + 0.85 * ((i * 7 + 3) % 10) / 10);
      const wx = ctx.wx + Math.cos(a) * r, wy = ctx.wy + Math.sin(a) * r;
      const e = isoProject(wx, wy), s = { x: e.x - 90, y: e.y - 260 };
      const rot = Math.atan2(e.y - s.y, e.x - s.x) - (L.base || 0);
      const sp = this.add.image(s.x, s.y, st.key).setRotation(rot).setScale(L.scale || 0.6).setDepth(isoDepth(wx, wy) + 90001).setVisible(false);
      if (L.tint != null) sp.setTint(L.tint); else if (L.dark) sp.setTint(0x5a4a3a);
      this.tweens.add({ targets: sp, x: e.x, y: e.y - 4, duration: 300, delay: i * 30, ease: 'Quad.easeIn', onStart: () => sp.setVisible(true),
        onComplete: () => this.tweens.add({ targets: sp, alpha: 0, duration: 350, delay: 250, onComplete: () => sp.destroy() }) });
      if (!first) first = sp;
    }
    return first;
  },
  /** One still dropping out of the sky onto the point, its shadow growing under it (the boulder, the roc's egg). */
  _fxm394_stilldrop(L, ctx) {
    const st = this._fxm394StillKey(L, ctx);
    if (!st) return null;
    const p = isoProject(ctx.wx, ctx.wy);
    const k = (L.scale || 1) * (st.ext ? 1.4 : 1);
    const sh = this.add.ellipse(p.x, p.y, 34 * k, 14 * k, 0x000000, 0.0).setDepth(isoDepth(ctx.wx, ctx.wy) + 3);
    const sp = this.add.image(p.x - 30, p.y - 320, st.key).setScale(k).setDepth(isoDepth(ctx.wx, ctx.wy) + 90002);
    if (!st.ext && L.tintFb != null) sp.setTint(L.tintFb);
    if (sp.texture && sp.texture.setFilter) sp.texture.setFilter(1);
    this._fxm394Run(420, (u) => {
      if (!sp.active) return;
      const e = u * u;
      sp.setPosition(lerp(p.x - 30, p.x, e), lerp(p.y - 320, p.y - 12 * k, e)).setRotation(u * (L.spin || 0));
      sh.setFillStyle(0x000000, 0.45 * u).setScale(0.4 + 0.6 * u);
    }, () => {
      sh.destroy();
      if (sp.active) this.tweens.add({ targets: sp, alpha: 0, scale: k * 1.15, duration: 220, onComplete: () => sp.destroy() });
    });
    return sp;
  },
  /** Stills streaming down a held beam, one every `every` ms, re-aimed as the beam turns (the roc's quill torrent). */
  _fxm394_stream394(L, ctx) {
    const st = this._fxm394StillKey(L, ctx);
    if (!st && L.streak == null) return null;
    const total = ctx.beamMs || 600, every = L.every || 60;
    let n = 0;
    for (let t = 0; t < total; t += every) {
      const go = () => {
        if (!this.world || !this.player) return;
        const aim = (this.player.aimAngle || 0) + (((t / every) % 3) - 1) * 0.04;
        const side = L.side ? 34 * (((t / every) % 2) ? 1 : -1) : 0;
        const ox = this.world.x + Math.cos(aim + Math.PI / 2) * side, oy = this.world.y + Math.sin(aim + Math.PI / 2) * side;
        const p0 = isoProject(ox + Math.cos(aim) * 14, oy + Math.sin(aim) * 14);
        const p1 = isoProject(this.world.x + Math.cos(aim) * ctx.reach, this.world.y + Math.sin(aim) * ctx.reach);
        const rot = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        let spr;
        if (st) {
          spr = this.add.image(p0.x, p0.y - 22, st.key).setScale(L.scale || 0.55).setRotation(rot - (L.base || 0));
          if (L.tint != null) spr.setTint(L.tint); else if (L.dark) spr.setTint(0x5a4a3a);
        } else {
          spr = this.add.rectangle(p0.x, p0.y - 22, 14, 2, L.streak).setRotation(rot).setBlendMode(ADD);
        }
        spr.setDepth(isoDepth(this.world.x, this.world.y) + 100001);
        this.tweens.add({ targets: spr, x: p1.x, y: p1.y - 18, duration: 230, onComplete: () => spr.destroy() });
      };
      if (t === 0) go(); else this.time.delayedCall(t, go);
      n++;
    }
    return n ? true : null;
  },

  // ----------------------------------------------------------------------------------------- player copies --
  /** A copy of a body's CURRENT frame (the player's own sheet, gear and all, or a monster's), tinted and translucent. */
  _fxm394Copy(src, o = {}) {
    if (!src || !src.active || !src.texture || !src.frame) return null;
    const sp = this.add.sprite(o.x != null ? o.x : src.x, o.y != null ? o.y : src.y, src.texture.key, src.frame.name);
    sp.setOrigin(src.originX, src.originY).setScale(src.scaleX * (o.scale || 1), src.scaleY * (o.scale || 1)).setFlipX(!!src.flipX);
    if (o.tint != null) sp.setTint(o.tint);
    if (o.add) sp.setBlendMode(ADD);
    sp.setAlpha(o.alpha != null ? o.alpha : 0.55);
    sp.setDepth(o.depth != null ? o.depth : src.depth - 1);
    return sp;
  },
  /** A copy and, round it, its fringe (two-tone, offset) or its jittering outline. Returns [main, ...extras]. */
  _fxm394CopySet(src, L, at = {}) {
    const main = this._fxm394Copy(src, { ...at, tint: L.tint, alpha: L.alpha, scale: L.scale });
    if (!main) return [];
    const out = [main];
    if (L.fringe) {
      out.push(this._fxm394Copy(src, { ...at, x: main.x - 2, tint: 0x40e8ff, alpha: (L.alpha || 0.5) * 0.6, add: true, depth: main.depth - 1 }));
      out.push(this._fxm394Copy(src, { ...at, x: main.x + 2, tint: 0xff50d0, alpha: (L.alpha || 0.5) * 0.6, add: true, depth: main.depth - 1 }));
    }
    if (L.jitter || L.edge != null) {
      out.push(this._fxm394Copy(src, { ...at, tint: L.edge != null ? L.edge : 0xffffff, alpha: 0.35, add: true, scale: (L.scale || 1) * 1.04, depth: main.depth - 1 }));
    }
    return out.filter(Boolean);
  },
  /** Move a copy set to (x, y) (screen), keeping the fringe / outline offsets; `jit` px of outline jitter. */
  _fxm394PlaceSet(set, x, y, jit = 0) {
    set.forEach((s, i) => {
      if (!s || !s.active) return;
      const off = i === 0 ? 0 : (set.length === 3 && i > 0 ? (i === 1 ? -2 : 2) : 0);
      const j = jit && i > 0 ? (Math.random() * 2 - 1) * jit : 0;
      s.setPosition(x + off + j, y + (jit && i > 0 ? (Math.random() * 2 - 1) * jit : 0));
    });
  },
  _fxm394FadeSet(set, ms, then) {
    let left = set.length;
    set.forEach(s => this.tweens.add({ targets: s, alpha: 0, duration: ms, onComplete: () => { s.destroy(); if (--left === 0 && then) then(); } }));
  },
  /**
   * "Afterimage, decoy, double, phantom, copies, foresight ghost, reflection, rewind, return": the copies, by mode --
   *   trail (along the path just run), here (where you stand, held), wall (a row of you), ring (stepping out all round),
   *   lunge (out toward the blow and gone), side (stepping in from the far side), back (sliding backward: a rewind),
   *   peel (sliding out sideways, snapping upright), beamrow (down the beam), ahead (each enemy's ghost a step ahead).
   */
  _fxm394_ghost(L, ctx) {
    const ps = this.playerSprite;
    const P = (wx, wy) => { const p = isoProject(wx, wy); return { x: p.x, y: p.y + (ps ? ps.y - isoProject(this.world.x, this.world.y).y : 0) }; };
    const mode = L.mode || 'here';
    if (mode === 'ahead') {
      let n = 0;
      for (const m of this._fxm394Bodies(ctx, 4)) {
        const set = this._fxm394CopySet(m.sprite, L);
        if (!set.length) continue;
        const ang = Math.atan2(this.world.y - m.wy, this.world.x - m.wx);   // where it is going: at you
        const q = isoProject(m.wx + Math.cos(ang) * 34, m.wy + Math.sin(ang) * 34);
        const dy = m.sprite.y - isoProject(m.wx, m.wy).y;
        this._fxm394Run(500, (u) => this._fxm394PlaceSet(set, lerp(m.sprite.x, q.x, u), lerp(m.sprite.y, q.y + dy, u)), () => this._fxm394FadeSet(set, 260));
        n++;
      }
      return n ? true : null;
    }
    if (!ps || !this.world) return null;
    const me = { x: this.world.x, y: this.world.y };
    const hold = L.hold || 0;
    if (mode === 'trail') {
      // from where the dash began (a path) or from you toward the blow (a lunge that lands at a target)
      const a = ctx.path ? { x: ctx.wx, y: ctx.wy } : me;
      const b = ctx.path ? this._fxm394Along(ctx, 1) : { x: ctx.wx, y: ctx.wy };
      const n = Math.max(1, L.n || 3);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / (n + 0.5), q = P(lerp(a.x, b.x, u), lerp(a.y, b.y, u));
        const set = this._fxm394CopySet(ps, { ...L, alpha: (L.alpha || 0.5) * (0.5 + 0.5 * u) }, { x: q.x, y: q.y });
        this._fxm394PlaceSet(set, q.x, q.y);
        this.time.delayedCall(60 * i, () => this._fxm394FadeSet(set, 380));
      }
      return true;
    }
    if (mode === 'here' || mode === 'wall' || mode === 'beamrow') {
      const pts = [];
      // a copy where you stand stands a step aside and behind (on you it would be hidden under you)
      if (mode === 'here') { const o = L.at === 'start' && ctx.path ? { x: ctx.wx, y: ctx.wy } : me; pts.push({ x: o.x + Math.cos(ctx.aim + 2.2) * 30, y: o.y + Math.sin(ctx.aim + 2.2) * 30 }); }
      else {
        const n = Math.max(2, L.n || 4);
        for (let i = 0; i < n; i++) {
          if (mode === 'wall') {
            const c = { x: me.x + Math.cos(ctx.aim) * 70, y: me.y + Math.sin(ctx.aim) * 70 }, u = (i / (n - 1) - 0.5) * 150;
            pts.push({ x: c.x + Math.cos(ctx.aim + Math.PI / 2) * u, y: c.y + Math.sin(ctx.aim + Math.PI / 2) * u });
          } else pts.push({ x: me.x + Math.cos(ctx.aim) * ctx.reach * (i + 1) / (n + 0.5), y: me.y + Math.sin(ctx.aim) * ctx.reach * (i + 1) / (n + 0.5) });
        }
      }
      pts.forEach((w, i) => {
        const q = P(w.x, w.y);
        const set = this._fxm394CopySet(ps, L, { x: q.x, y: q.y, depth: isoDepth(w.x, w.y) + 3 });
        set.forEach(s => s.setDepth(isoDepth(w.x, w.y) + 3));
        const flick = L.edge != null || L.jitter;
        const stay = Math.max(300, hold || (ctx.beamMs || 700));
        this._fxm394Run(stay, () => this._fxm394PlaceSet(set, q.x, q.y, flick ? (L.jitter || 1.5) : 0), () => this._fxm394FadeSet(set, 320));
        if (mode !== 'here' && set[0]) { set.forEach(s => s.setAlpha(0)); this.tweens.add({ targets: set, alpha: L.alpha || 0.55, duration: 150, delay: i * 60 }); }
      });
      return true;
    }
    if (mode === 'ring') {
      const n = Math.max(3, L.n || 6), r = L.near ? 26 : 52;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const to = { x: me.x + Math.cos(ang) * r, y: me.y + Math.sin(ang) * r };
        const q0 = P(me.x, me.y), q1 = P(to.x, to.y);
        const set = this._fxm394CopySet(ps, L, { x: q0.x, y: q0.y });
        this._fxm394Run(260, (u) => this._fxm394PlaceSet(set, lerp(q0.x, q1.x, u), lerp(q0.y, q1.y, u)), () => {
          if (L.slash) this._fx393Layer({ f: 'slasha', c: 'white', shape: 'centre', scale: 0.45, add: true }, { ...ctx, wx: to.x, wy: to.y, reach: 40 });
          this.time.delayedCall(hold || 160, () => this._fxm394FadeSet(set, 300));
        });
      }
      return true;
    }
    if (mode === 'lunge' || mode === 'side' || mode === 'back' || mode === 'peel') {
      const t = ctx.path ? null : (Math.hypot(ctx.wx - me.x, ctx.wy - me.y) > 8 ? { x: ctx.wx, y: ctx.wy } : null);
      const aim = t ? Math.atan2(t.y - me.y, t.x - me.x) : ctx.aim;
      let from = me, to;
      if (mode === 'lunge') to = t || { x: me.x + Math.cos(aim) * 60, y: me.y + Math.sin(aim) * 60 };
      else if (mode === 'side') { const c = t || { x: me.x + Math.cos(aim) * 50, y: me.y + Math.sin(aim) * 50 }; from = { x: c.x + Math.cos(aim) * 40, y: c.y + Math.sin(aim) * 40 }; to = c; }
      else if (mode === 'back') to = { x: me.x - Math.cos(aim) * 56, y: me.y - Math.sin(aim) * 56 };
      else to = { x: me.x + Math.cos(aim + Math.PI / 2) * 30, y: me.y + Math.sin(aim + Math.PI / 2) * 30 };
      const srcs = (mode === 'back' && L.onBodies) ? this._fxm394Bodies(ctx, 4).map(m => m.sprite) : [ps];
      srcs.forEach((src) => {
        const q0 = mode === 'back' && src !== ps ? { x: src.x, y: src.y } : P(from.x, from.y);
        const d = mode === 'back' && src !== ps ? scr(aim) : null;
        const q1 = d ? { x: src.x - d.x * 40, y: src.y - d.y * 40 } : P(to.x, to.y);
        const set = this._fxm394CopySet(src, L, { x: q0.x, y: q0.y });
        if (mode === 'peel') set.forEach(s => s.setScale(s.scaleX * 0.15, s.scaleY));
        const sx0 = set.map(s => s.scaleX);
        this._fxm394Run(mode === 'back' ? 520 : 300, (u) => {
          this._fxm394PlaceSet(set, lerp(q0.x, q1.x, u), lerp(q0.y, q1.y, u));
          if (mode === 'peel') set.forEach((s, i) => s.active && s.setScale(sx0[i] / 0.15 * Math.min(1, 0.15 + u * 1.2) * (u > 0.85 ? 1 : 1), s.scaleY));
        }, () => this._fxm394FadeSet(set, mode === 'back' ? 200 : 280));
      });
      return true;
    }
    return null;
  },

  // ------------------------------------------------------------------------------------ screen and lighting --
  _fxm394Wash(color, alpha0, depth = TOP) {
    const cam = this.cameras && this.cameras.main;
    if (!cam) return null;
    const w = cam.width * 4, h = cam.height * 4;
    const r = this.add.rectangle(cam.width / 2, cam.height / 2, w, h, color, 1).setScrollFactor(0).setDepth(depth).setAlpha(alpha0);
    return r;
  },
  /** totality-dim, slowmo, darkened-sky, dawn and dusk: a wash over the whole view, in and held and out. */
  _fxm394_screen(L, ctx) {
    const ms = L.ms || 1600, mode = L.mode;
    this._fxm394Screens = (this._fxm394Screens || 0) + 1;
    if (mode === 'dim' || mode === 'darken') {
      const peak = mode === 'dim' ? 0.82 : (L.amount || 0.4);
      const r = this._fxm394Wash(0x000000, 0);
      if (!r) return null;
      let rim = null;
      if (L.rim && this.playerSprite) {
        // "the caster's own outline left rimmed in white fire": copies over the dark, a white ring round the body
        const ps = this.playerSprite;
        rim = [-2, 2].flatMap(dx => [-2, 2].map(dy => ({ dx, dy }))).map(o => ({ o, s: this._fxm394Copy(ps, { tint: 0xfff4d8, alpha: 0.9, add: true, depth: TOP + 1 }) }));
        rim.push({ o: { dx: 0, dy: 0 }, s: this._fxm394Copy(ps, { alpha: 1, depth: TOP + 2 }) });
      }
      const cam = this.cameras.main;
      this._fxm394Run(ms + 800, (u, total) => {
        const t = u * total;
        r.setAlpha(peak * (t < 300 ? t / 300 : t > total - 500 ? Math.max(0, (total - t) / 500) : 1));
        if (rim) for (const { o, s } of rim) if (s && s.active && this.playerSprite) {
          // a scroll-factor-1 copy over a scroll-factor-0 wash: positions are world screen-space, the camera does the rest
          s.setTexture(this.playerSprite.texture.key, this.playerSprite.frame.name).setFlipX(this.playerSprite.flipX)
            .setPosition(this.playerSprite.x + o.dx, this.playerSprite.y + o.dy).setAlpha(r.alpha / peak * (o.dx || o.dy ? 0.9 : 1));
        }
      }, () => { r.destroy(); if (rim) rim.forEach(x => x.s && x.s.destroy()); });
      void cam;
      return r;
    }
    if (mode === 'desat') {
      // Bullet Time: the colour drains out of the view while the freeze holds (a camera colour matrix where the renderer
      // has filters; a grey wash otherwise)
      const cam = this.cameras && this.cameras.main;
      let cm = null;
      try {
        if (cam && cam.filters && cam.filters.internal && cam.filters.internal.addColorMatrix) {
          cm = cam.filters.internal.addColorMatrix();
          if (cm && cm.colorMatrix && cm.colorMatrix.grayscale) cm.colorMatrix.grayscale(0.85);
          else if (cm && cm.colorMatrix && cm.colorMatrix.saturate) cm.colorMatrix.saturate(-0.85);
        }
      } catch (e) { cm = null; }
      const r = cm ? null : this._fxm394Wash(0x8a8f99, 0);
      const ripple = this._fxm394Wash(0xc8dcff, 0);
      if (r) r.setBlendMode('MULTIPLY');
      this._fxm394Run(ms, (u) => {
        const k = u < 0.12 ? u / 0.12 : u > 0.85 ? (1 - u) / 0.15 : 1;
        if (r) r.setAlpha(0.45 * k);
        if (ripple) ripple.setAlpha(0.06 * k * (0.5 + 0.5 * Math.sin(u * 40)));
      }, () => {
        if (r) r.destroy();
        if (ripple) ripple.destroy();
        try { if (cm && cam.filters.internal.remove) cam.filters.internal.remove(cm); else if (cm && cm.destroy) cm.destroy(); } catch (e) { /* art only */ }
      });
      this._fxm394Desat = cm ? 'filter' : 'wash';
      return true;
    }
    if (mode === 'dawn' || mode === 'dusk') {
      // "a soft gold edge passing into deep blue (reversed for dusk)": two washes crossing over the view
      const gold = this._fxm394Wash(0xffc860, 0), blue = this._fxm394Wash(0x1a2a6a, 0);
      if (!gold || !blue) return null;
      gold.setBlendMode(ADD);
      const dawn = mode === 'dawn';
      this._fxm394Run(ms, (u) => {
        const a = dawn ? u : 1 - u;                   // 0 = night, 1 = day
        const env = Math.sin(u * Math.PI);
        blue.setAlpha(0.45 * env * (1 - a));
        gold.setAlpha(0.32 * env * a);
      }, () => { gold.destroy(); blue.destroy(); });
      return gold;
    }
    return null;
  },
  /** "Great, immense, long and roc shadow: the creature sheet drawn as a soft black silhouette", sweeping across. */
  _fxm394_shadowpass(L, ctx) {
    let key = null, frame = 0;
    for (const fam of (L.families || [])) {
      const art = MONSTER_ART[fam];
      if (!art) continue;
      if (this._ensureFamilyArt) this._ensureFamilyArt(fam);
      const fly = L.fly && art.flyFrames ? this._monsterTexture(fam, 'fly') : null;
      const k = fly && this.textures.exists(fly) ? fly : this._monsterTexture(fam, 'idle');
      if (k && this.textures.exists(k)) { key = k; frame = fly && k === fly ? dirFrame(art, 'flyFrames') : 2; break; }
    }
    const p = isoProject(ctx.wx, ctx.wy);
    const ms = L.ms || 1200;
    const ang = L.alongAim ? Math.atan2(scr(ctx.aim).y, scr(ctx.aim).x) : -0.35;
    const span = 520;
    const from = { x: p.x - Math.cos(ang) * span, y: p.y - Math.sin(ang) * span * 0.6 }, to = { x: p.x + Math.cos(ang) * span, y: p.y + Math.sin(ang) * span * 0.6 };
    const parts = [];
    if (key) {
      // three copies, the outer two bigger and fainter: a soft edge without a blur pass
      [[1.12, 0.12], [1.05, 0.18], [1, 0.34]].forEach(([k, a]) => {
        const s = this.add.sprite(from.x, from.y, key, frame).setTint(0x000000).setAlpha(a).setScale((L.scale || 5) * k, (L.scale || 5) * k * 0.5)
          .setDepth(isoDepth(ctx.wx, ctx.wy) - 500);
        parts.push(s);
      });
    } else {
      parts.push(this.add.ellipse(from.x, from.y, 300, 90, 0x000000, 0.3).setDepth(isoDepth(ctx.wx, ctx.wy) - 500));
    }
    this._fxm394Run(ms, (u) => parts.forEach(s => s.active && s.setPosition(lerp(from.x, to.x, u), lerp(from.y, to.y, u))), () => parts.forEach(s => s.destroy()));
    this._fxm394Shadow = key || 'ellipse';
    return parts[0];
  },
  /** Heat-haze / shimmer / mirage: wavering pale bands rising over an area, and a shimmering ghost over a body. */
  _fxm394_haze(L, ctx) {
    const ms = L.ms || 1200;
    const targets = L.on === 'caster' ? [this.playerSprite] : L.on === 'bodies' ? this._fxm394Bodies(ctx, 4).map(m => m.sprite) : [];
    let drew = null;
    for (const src of targets) {
      const c = this._fxm394Copy(src, { tint: 0xfff2d8, alpha: 0.32, add: true, depth: src.depth + 1 });
      if (!c) continue;
      this._fxm394Run(ms, (u) => {
        if (!c.active || !src.active) return;
        c.setTexture(src.texture.key, src.frame.name).setFlipX(src.flipX);
        c.setPosition(src.x + Math.sin(u * 50) * 2.2, src.y).setScale(src.scaleX * (1 + 0.04 * Math.sin(u * 37)), src.scaleY);
      }, () => c.destroy());
      drew = c;
    }
    if (L.on === 'area' || !targets.length) {
      const g = this.add.graphics().setDepth(isoDepth(ctx.wx, ctx.wy) + 90000).setBlendMode(ADD);
      const p = isoProject(ctx.wx, ctx.wy), R = Math.max(40, ctx.reach);
      this._fxm394Run(ms, (u) => {
        g.clear();
        const env = Math.sin(u * Math.PI);
        for (let i = 0; i < 6; i++) {
          const y = p.y - ((u * 60 + i * 14) % 80);
          g.lineStyle(2, 0xfff4e0, 0.18 * env);
          g.beginPath();
          for (let x = -R; x <= R; x += 6) {
            const yy = y + Math.sin(x / 9 + u * 18 + i) * 2.5;
            const w = Math.sqrt(Math.max(0, 1 - (x / R) * (x / R)));
            if (x === -R) g.moveTo(p.x + x, yy); else g.lineTo(p.x + x * w + x * (1 - w) * 0.3, yy);
          }
          g.strokePath();
        }
      }, () => g.destroy());
      drew = drew || g;
    }
    return drew;
  },
  /** glitch / emp: the body doubled in violet and cyan, jittering; with `scan`, interference lines across it. */
  _fxm394_glitch(L, ctx) {
    const ms = L.ms || 900;
    const srcs = L.on === 'caster' ? [this.playerSprite] : this._fxm394Bodies(ctx, 5).map(m => m.sprite);
    let n = 0;
    for (const src of srcs) {
      if (!src) continue;
      const a = this._fxm394Copy(src, { tint: 0xb040ff, alpha: 0.6, add: true, depth: src.depth + 1 });
      const b = this._fxm394Copy(src, { tint: 0x40f0ff, alpha: 0.6, add: true, depth: src.depth + 1 });
      if (!a || !b) continue;
      const g = L.scan ? this.add.graphics().setDepth(src.depth + 2) : null;
      this._fxm394Run(ms, () => {
        if (!src.active) return;
        const on = Math.random() < 0.7;
        for (const [c, s] of [[a, -1], [b, 1]]) {
          c.setTexture(src.texture.key, src.frame.name).setFlipX(src.flipX).setVisible(on)
            .setPosition(src.x + s * (1 + Math.random() * 3), src.y + (Math.random() - 0.5) * 2);
        }
        if (g) {
          g.clear();
          const h = src.displayHeight || 48, w = src.displayWidth || 32, top = src.y - h * (src.originY || 0.85);
          for (let i = 0; i < 4; i++) { const y = top + Math.random() * h; g.fillStyle(0x9fe4ff, 0.5).fillRect(src.x - w / 2, y, w, 1.5); }
        }
      }, () => { a.destroy(); b.destroy(); if (g) g.destroy(); });
      n++;
    }
    return n ? true : null;
  },
  /** red-mist and empower-glow: a tint pulse over the caster (an added copy of your own frame, so the game's own tint
   *  on the body is never touched); `mist` adds the red haze round you, `rise` lifts the glow up the body, `scale` grows it. */
  _fxm394_pulse(L, ctx) {
    const ps = this.playerSprite;
    if (!ps) return null;
    const c = this._fxm394Copy(ps, { tint: L.tint, alpha: 0, add: true, depth: ps.depth + 1 });
    if (!c) return null;
    const ms = L.ms || 800, n = L.n || 2;
    const haze = L.mist ? this.add.ellipse(ps.x, ps.y - 24, 70, 54, L.tint, 0).setDepth(ps.depth + 2).setBlendMode(ADD) : null;
    this._fxm394Run(ms, (u) => {
      if (!c.active || !ps.active) return;
      const k = Math.abs(Math.sin(u * Math.PI * n));
      c.setTexture(ps.texture.key, ps.frame.name).setFlipX(ps.flipX).setPosition(ps.x, ps.y - (L.rise ? 8 * u : 0))
        .setScale(ps.scaleX * (L.scale ? lerp(1, L.scale, Math.min(1, u * 3)) : 1 + 0.05 * k), ps.scaleY * (L.scale ? lerp(1, L.scale, Math.min(1, u * 3)) : 1 + 0.05 * k)).setAlpha(0.7 * k);
      if (haze) haze.setPosition(ps.x, ps.y - 24).setFillStyle(L.tint, 0.22 * k);
    }, () => { c.destroy(); if (haze) haze.destroy(); });
    return c;
  },
  /** season-cycle: the runecircle turning through four colours in one beat (green, gold, russet, frost). */
  _fxm394_huering(L, ctx) {
    const key = this._sheetKey ? this._sheetKey(L.f || 'runecircle', 'white') : null;
    const info = fxFamilyInfo(L.f || 'runecircle');
    if (!key || !info) return null;
    const p = isoProject(ctx.wx, ctx.wy);
    const k = clamp((ctx.reach * 1.4) / 60, 0.4, 2.4) * (L.scale || 1);
    const spr = this.add.sprite(p.x, p.y, key, 0).setScale(k, k * 0.5).setDepth(2).setBlendMode(ADD).setAlpha(0.8);
    const hues = L.hues || [0xffffff];
    const ms = L.ms || 1200;
    this._fxm394Run(ms, (u) => {
      if (!spr.active) return;
      const x = u * hues.length, i = Math.min(hues.length - 1, Math.floor(x));
      spr.setTint(mixRGB(hues[i], hues[Math.min(hues.length - 1, i + 1)], Math.min(1, (x - i) * 2)));
      spr.setFrame(Math.floor(u * 24) % (info.frames || 1));
      if (u > 0.85) spr.setAlpha(0.8 * (1 - u) / 0.15);
    }, () => spr.destroy());
    return spr;
  },
  /** redaction: black bars slamming across what it hits, sized to the body, held, gone. */
  _fxm394_redact(L, ctx) {
    const ms = L.ms || 1000;
    let n = 0;
    for (const m of this._fxm394Bodies(ctx, 6)) {
      const s = m.sprite;
      const h = (s.displayHeight || 48), w = Math.max(26, (s.displayWidth || 32) * 0.9);
      const top = s.y - h * (s.originY != null ? s.originY : 0.85);
      [0.28, 0.5, 0.72].forEach((f, i) => {
        const bar = this.add.rectangle(s.x, top + h * f, w, Math.max(5, h * 0.12), 0x050505, 1).setDepth(s.depth + 3).setScale(0, 1);
        this.tweens.add({ targets: bar, scaleX: 1, duration: 80, delay: i * 40, ease: 'Quad.easeOut' });
        this._fxm394Run(ms, () => { if (s.active) bar.setPosition(s.x, (s.y - h * (s.originY != null ? s.originY : 0.85)) + h * f); },
          () => this.tweens.add({ targets: bar, alpha: 0, duration: 160, onComplete: () => bar.destroy() }));
      });
      n++;
    }
    return n ? true : null;
  },
  /** A material creeping over YOUR body (the greening overlay closing a heal): round 393's stone creep on the player. */
  _fxm394_selfmask(L, ctx) {
    if (!this._fx393StoneOver || !this.playerSprite) return null;
    return this._fx393StoneOver({ sprite: this.playerSprite }, { ...L, f: 'stonecreep' }, ctx) || null;
  },
  /** Bullet Time's rounds, drawn hanging in the air round you, shimmering, for the hold. */
  _fxm394_streaks(L, ctx) {
    this._fxm394Textures();
    if (!this.textures.exists(STREAK_KEY)) return null;
    const n = Math.max(1, L.n || 6), ms = L.ms || 1600;
    const sprs = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2.399, r = 40 + (i % 3) * 30;
      const q = isoProject(this.world.x + Math.cos(a) * r, this.world.y + Math.sin(a) * r);
      const s = this.add.image(q.x, q.y - 26 - (i % 2) * 10, STREAK_KEY).setRotation(-0.3 + (i % 4) * 0.25).setTint(L.tint || 0xffd890)
        .setBlendMode(ADD).setDepth(isoDepth(this.world.x, this.world.y) + 100000);
      sprs.push(s);
    }
    this._fxm394Run(ms, (u) => sprs.forEach((s, i) => s.setAlpha((u > 0.85 ? (1 - u) / 0.15 : 1) * (0.6 + 0.4 * Math.sin(u * 30 + i)))), () => sprs.forEach(s => s.destroy()));
    return sprs[0];
  },
  _fxm394_weaponspin() { return null; },   // animated-weapon: a weapon affinity, never cast -- see the round notes

  // ----------------------------------------------------------------------------------------- drawn lines --
  /**
   * "Lines drawn in code (1-6 px core plus a soft glow, with a travelling bead or knot)". Held on a beam it IS the beam
   * (the beam drew no sheet), from your hand along where you aim, re-aimed every frame; cast as a ring / cone / pull, one
   * line from your hand to each body it holds (`toBodies`), or a ring drawn round you (`circle`).
   */
  _fxm394_line(L, ctx) {
    const S = LINE_STYLES[L.style];
    if (!S || !this.world) return null;
    const ms = ctx.beamMs || L.ms || 900;
    const g = this.add.graphics();
    const glow = S.dark || S.flat || ['rope', 'fuse', 'shadowband'].includes(L.style) ? null : this.add.graphics().setBlendMode(ADD);
    const bodies = L.toBodies ? this._fxm394Bodies(ctx, L.toBodies, 1.4) : [];
    if (L.toAllies) for (const s of (this._summons || []).slice(0, 3)) if (s && s.sprite) bodies.push({ ally: true, get wx() { return s.wx; }, get wy() { return s.wy; }, alive: true, sprite: s.sprite });
    const t0 = (this.time && this.time.now) || 0;
    this._fxm394Lines = (this._fxm394Lines || 0) + 1;
    this._fxm394LineLast = L.style;
    this._fxm394Run(ms, (u) => {
      g.clear(); if (glow) glow.clear();
      const now = ((this.time && this.time.now) || 0) - t0;
      const fade = u > 0.88 ? (1 - u) / 0.12 : 1;
      const draw = S.draw ? Math.min(1, now / 300) : 1;
      const hand = this._fxm394Hand();
      const segs = [];
      if (L.circle) {
        const R = Math.max(40, ctx.reach * 0.8), pts = [];
        for (let i = 0; i <= 48 * draw; i++) { const a = (i / 48) * Math.PI * 2; const q = isoProject(this.world.x + Math.cos(a) * R, this.world.y + Math.sin(a) * R); pts.push({ x: q.x, y: q.y }); }
        segs.push({ pts, ground: true });
      } else if (bodies.length) {
        for (const m of bodies) {
          if (!m.alive && !m.ally) continue;
          const q = isoProject(m.wx, m.wy);
          let ex = q.x, ey = q.y - 22;
          if (L.haul) { const k = 0.5 + 0.5 * Math.cos(u * Math.PI * 2); ex = lerp(hand.x, ex, 0.6 + 0.4 * k); ey = lerp(hand.y, ey, 0.6 + 0.4 * k); }
          segs.push({ pts: [hand, { x: lerp(hand.x, ex, draw), y: lerp(hand.y, ey, draw) }] });
        }
      }
      if (!segs.length && !L.circle) {
        const aim = ctx.beamMs && this.player ? this.player.aimAngle || 0 : ctx.aim;
        const len = ctx.beamMs ? ctx.reach : ctx.reach * 0.8;
        const e = isoProject(this.world.x + Math.cos(aim) * len * draw, this.world.y + Math.sin(aim) * len * draw);
        const base = isoProject(this.world.x, this.world.y);
        const flat = S.flat || L.style === 'fuse';
        segs.push({ pts: [flat ? { x: base.x, y: base.y } : hand, flat ? { x: e.x, y: e.y } : { x: e.x, y: e.y - 20 }], ground: flat });
      }
      const depthAt = isoDepth(this.world.x, this.world.y) + (segs[0] && segs[0].ground ? -400 : 30000);
      g.setDepth(depthAt + 1); if (glow) glow.setDepth(depthAt);
      for (const sg of segs) this._fxm394DrawLine(g, glow, S, sg, now, fade, L);
    }, () => { g.destroy(); if (glow) glow.destroy(); });
    return g;
  },
  /** One polyline in a style: the glow, the core (waved, braided, sagging, in strands), and what travels along it. */
  _fxm394DrawLine(g, glow, S, sg, now, fade, L) {
    const a = sg.pts[0], b = sg.pts[sg.pts.length - 1];
    if (S.spot) return this._fxm394Spot(g, glow, a, b, now, fade);
    const pts = sg.pts.length > 2 ? sg.pts : (() => {
      const out = [], n = 24;
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        let off = 0;
        if (S.wave) off += Math.sin(u * Math.PI * (S.waveFast ? 9 : 4) + now / (S.waveFast ? 40 : 90)) * S.wave * Math.sin(u * Math.PI);
        if (S.sway) off += Math.sin(now / 260) * S.sway * u;
        if (S.sag) off += Math.sin(u * Math.PI) * S.sag;
        out.push({ x: a.x + dx * u + nx * off, y: a.y + dy * u + ny * off + (S.sag ? Math.sin(u * Math.PI) * S.sag * 0.5 : 0) });
      }
      return out;
    })();
    const alpha = (S.alpha || 1) * fade;
    const stroke = (gg, w, col, al, offN = 0, phase = 0) => {
      if (!gg) return;
      gg.lineStyle(w, col, al);
      gg.beginPath();
      pts.forEach((p, i) => {
        let ox = 0, oy = 0;
        if (offN || phase) {
          const q = pts[Math.min(pts.length - 1, i + 1)], r = pts[Math.max(0, i - 1)];
          const dx = q.x - r.x, dy = q.y - r.y, l = Math.hypot(dx, dy) || 1;
          const k = offN + (phase ? Math.sin(i * 0.9 + phase) * 2.2 : 0);
          ox = (-dy / l) * k; oy = (dx / l) * k;
        }
        if (i === 0) gg.moveTo(p.x + ox, p.y + oy); else gg.lineTo(p.x + ox, p.y + oy);
      });
      gg.strokePath();
    };
    stroke(glow || g, S.w * (S.glowW || 3), S.glow, (glow ? 0.35 : 0.5) * alpha);
    if (S.strands) for (let i = 0; i < S.strands; i++) stroke(g, S.w, S.core, 0.9 * alpha, (i - (S.strands - 1) / 2) * (S.gap || 6));
    else if (S.braid) for (let i = 0; i < S.braid; i++) stroke(g, S.w, i % 2 ? S.glow : S.core, 0.9 * alpha, 0, now / 120 + (i * Math.PI * 2) / S.braid);
    else stroke(g, S.w, S.core, 0.95 * alpha);
    if (S.twist) for (let i = 1; i < pts.length - 1; i += 2) { const p = pts[i]; g.lineStyle(1, 0x4a3420, 0.8 * alpha).lineBetween(p.x - 2, p.y - 2, p.x + 2, p.y + 2); }
    // what travels: beads / knots / glints / faces / frost / marks / sparks / drops
    const total = pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0) || 1;
    const at = (d) => {
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        if (acc + l >= d) { const t = (d - acc) / (l || 1); return { x: lerp(pts[i - 1].x, pts[i].x, t), y: lerp(pts[i - 1].y, pts[i].y, t) }; }
        acc += l;
      }
      return pts[pts.length - 1];
    };
    if (S.bead && S.bead !== 'none') {
      const every = S.beadEvery || 80, shift = ((now / 1000) * (S.speed || 0)) % every;
      for (let d = (shift + every) % every; d < total; d += every) {
        const p = at(d), gg = glow || g;
        switch (S.bead) {
          case 'glint': gg.fillStyle(0xffffff, 0.9 * alpha).fillCircle(p.x, p.y, 2); gg.fillStyle(S.glow, 0.4 * alpha).fillCircle(p.x, p.y, 4); break;
          case 'pulse': gg.fillStyle(S.core, 0.8 * alpha).fillCircle(p.x, p.y, 3); gg.fillStyle(S.glow, 0.3 * alpha).fillCircle(p.x, p.y, 6); break;
          case 'knot': g.fillStyle(S.glow, 0.95 * alpha).fillCircle(p.x, p.y, Math.max(2.5, S.w * 0.9)); break;
          case 'bead': g.fillStyle(0xff4a5a, 0.95 * alpha).fillCircle(p.x, p.y, 2.5); break;
          case 'face': g.fillStyle(0xf0f4ff, 0.6 * alpha).fillCircle(p.x, p.y - 2, 3.5); g.fillStyle(0x303848, 0.7 * alpha).fillRect(p.x - 2, p.y - 3, 1, 1).fillRect(p.x + 1, p.y - 3, 1, 1); break;
          case 'frost': g.fillStyle(0xd8f4ff, 0.9 * alpha).fillTriangle(p.x, p.y - 4, p.x + 3, p.y, p.x - 3, p.y).fillTriangle(p.x, p.y + 4, p.x + 3, p.y, p.x - 3, p.y); break;
          case 'mark': g.lineStyle(2, S.markColour || 0xb070ff, alpha).lineBetween(p.x, p.y - 4, p.x, p.y + 4); break;
          case 'spark': gg.lineStyle(1.5, 0xfff7a0, alpha).lineBetween(p.x - 4, p.y, p.x + 4, p.y).lineBetween(p.x, p.y - 4, p.x, p.y + 4); break;
          case 'drop': g.fillStyle(0xffffff, 0.8 * alpha).fillCircle(p.x, p.y + 1, 1.5); break;
          default: break;
        }
      }
    }
    if (S.posts) {
      for (let d = 0; d <= total; d += S.posts) { const p = at(d); g.lineStyle(3, 0x6a4a2a, alpha).lineBetween(p.x, p.y - 4, p.x, p.y + 22); }
    }
    if (S.crossbar && !sg.ground) { g.lineStyle(2, 0x8a6040, alpha).lineBetween(a.x - 8, a.y - 6, a.x + 8, a.y - 6); }
    if (S.weight) { g.fillStyle(0x8a8f99, alpha).fillCircle(b.x, b.y, 3); }
  },
  /** The follow spot: a hard-edged cone of stage light from your hand to a bright pool where it lands, motes in it. */
  _fxm394Spot(g, glow, a, b, now, fade) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const w0 = 6, w1 = 22;
    const gg = glow || g;
    gg.fillStyle(0xfff8e0, 0.16 * fade);
    gg.fillPoints([{ x: a.x + nx * w0, y: a.y + ny * w0 }, { x: b.x + nx * w1, y: b.y + ny * w1 + 18 }, { x: b.x - nx * w1, y: b.y - ny * w1 + 18 }, { x: a.x - nx * w0, y: a.y - ny * w0 }], true);
    gg.fillStyle(0xffffff, 0.28 * fade).fillEllipse(b.x, b.y + 20, w1 * 2.6, w1 * 1.1);
    g.lineStyle(1, 0xffffff, 0.35 * fade).lineBetween(a.x + nx * w0, a.y + ny * w0, b.x + nx * w1, b.y + ny * w1 + 18).lineBetween(a.x - nx * w0, a.y - ny * w0, b.x - nx * w1, b.y - ny * w1 + 18);
    for (let i = 0; i < 8; i++) {
      const u = ((now / 2200) + i / 8) % 1, s = Math.sin(i * 12.9) * 0.8;
      gg.fillStyle(0xffffff, 0.6 * fade).fillCircle(lerp(a.x, b.x, u) + nx * s * lerp(w0, w1, u), lerp(a.y, b.y + 18, u) + ny * s * lerp(w0, w1, u), 1.2);
    }
  },

  // ---------------------------------------------------------------------------------------- bodies of things --
  _fxm394Textures() {
    if (!this.textures || this.textures.exists(STREAK_KEY)) return;
    try {
      const cv = document.createElement('canvas');
      cv.width = STREAK_SIZE.w; cv.height = STREAK_SIZE.h;
      const c = cv.getContext('2d');
      const grd = c.createLinearGradient(0, 0, STREAK_SIZE.w, 0);
      grd.addColorStop(0, 'rgba(255,170,60,0)'); grd.addColorStop(0.6, 'rgba(255,200,110,0.7)'); grd.addColorStop(1, 'rgba(255,255,240,1)');
      c.fillStyle = grd; c.fillRect(0, 1, STREAK_SIZE.w, STREAK_SIZE.h - 2);
      c.fillStyle = 'rgba(255,255,255,1)'; c.fillRect(STREAK_SIZE.w - 8, 2, 8, STREAK_SIZE.h - 4);
      this.textures.addCanvas(STREAK_KEY, cv);
    } catch (e) { /* the bolt's dot stands in */ }
  },
  _fxm394Cast(a, fx) {
    this._fxm394Textures();
    // a shield plays no cast art of its own (WorldScene: "the bubble that follows the body IS the shield"): Body Double's
    // copy of you, Undone Before It Lands' rewind are this plan, played where you stand
    if (a && a.template === 'absorbShield' && fx && fx.r393 && this._fx393Play) this._fx393Play(fx, this.world.x, this.world.y, 1);
    // the spring walker's reeds and lily at its feet ("the water-elemental shade, reeds")
    const sm = a && fxMapSummonFor(a);
    if (sm && sm.spec.reeds && this.time) {
      const name = a.summonCreatureName || a.name;
      this.time.delayedCall(0, () => {
        const s = (this._summons || []).slice().reverse().find(x => x && x.name === a.name && x.sprite && x.sprite.active);
        if (s) this._fxm394Reeds(s);
        void name;
      });
    }
  },
  _fxm394Reeds(s) {
    const K = CITY_PROP_ART_R381, d = CITY_PROPS_R381.reedCluster;
    if (!this.textures.exists(K.key) || !d) return null;
    const img = this.add.image(0, 0, K.key, d.idx).setOrigin(K.footX, K.footY).setScale(0.55);
    const follow = () => {
      if (!s.sprite || !s.sprite.active) { img.destroy(); this.events.off('postupdate', follow); return; }
      img.setPosition(s.sprite.x + 6, s.sprite.y + 12).setDepth(s.sprite.depth + 1).setAlpha(s.sprite.alpha);
    };
    this.events.on('postupdate', follow);
    return img;
  },
  /** A called creature's family and shade from the table (it is already the stand-in the brief names; pinned here). */
  _fxm394SummonRemap(a) {
    if (!a || (a.summonKind && a.summonKind !== 'creature')) return a;
    const sm = fxMapSummonFor(a);
    if (!sm || !sm.spec.family || !MONSTER_ART[sm.spec.family]) return a;
    return { ...a, summonFamily: sm.spec.family, summonShade: sm.spec.shade || a.summonShade };
  },
  /**
   * A turret's or a called creature's body drawn from what the game has: a world prop on its foot (the skep, the still,
   * the pike rack), the r391 bell tower with a crack, the r388 pendulum, a soul-wisp still bobbing, a tornado loop, the
   * old master's grey shade, or a copy of YOU (decoy, double, likeness, shadow, replica). Null when the table has
   * nothing for it (the ordinary body is drawn). The body carries `_r393` so _tickSummons only moves it.
   */
  _fxm394SummonSprite(a, p, kind) {
    if (!a || !this.add) return null;
    const rec = kind === 'turret' ? fxMapTurretFor(a) : kind === 'creature' ? fxMapSummonFor(a) : null;
    if (!rec) return null;
    const S = rec.spec;
    let body = null;
    if (S.copy) body = this._fxm394CopyBody(S.copy, p);
    else if (S.npc) body = this._fxm394NpcBody(S, p);
    else if (S.city) body = this._fxm394CityBody(S, p);
    else if (S.prop) body = this._fxm394BellBody(S, p, a);
    else if (S.pendulum) body = this._fxm394PendulumBody(S, p);
    else if (S.still) body = this._fxm394StillBody(S, p);
    else if (S.sheet) body = this._fxm394SheetBody(S, p, a);
    if (!body) return null;
    body._r393 = Object.assign(body._r393 || {}, { fxm394: rec.gap });
    this._fxm394Bodies394 = (this._fxm394Bodies394 || 0) + 1;
    this._fxm394LastBody = { gap: rec.gap, kind, what: S.copy || S.npc || S.city || S.prop || (S.pendulum && 'pendulum') || S.still || S.sheet };
    return body;
  },
  /** A copy of you that stays: mirrors your current frame every step (so it reads as you, in your gear). */
  _fxm394CopyBody(kind, p) {
    const ps = this.playerSprite;
    const look = COPY_LOOK[kind];
    if (!ps || !look) return null;
    const box = this.add.container(p.x, p.y);
    const mk = (tint, alpha, add, scale = 1) => {
      const s = this.add.sprite(0, 0, ps.texture.key, ps.frame.name).setOrigin(ps.originX, ps.originY).setScale(ps.scaleX * scale * (look.stiff || 1), ps.scaleY * scale);
      if (tint != null) s.setTint(tint);
      if (add) s.setBlendMode(ADD);
      return s.setAlpha(alpha);
    };
    const edge = look.edge != null ? mk(look.edge, look.rim ? 0.5 : 0.35, true, 1.05) : null;
    const main = mk(look.tint, look.alpha, false);
    if (edge) box.add(edge);
    box.add(main);
    const t0 = this.time.now;
    const step = () => {
      if (!box.active || !main.active) { this.events.off('postupdate', step); return; }
      if (!look.frozen && this.playerSprite && this.playerSprite.frame) {
        for (const s of [main, edge]) if (s) s.setTexture(this.playerSprite.texture.key, this.playerSprite.frame.name).setFlipX(this.playerSprite.flipX);
      }
      const t = (this.time.now - t0) / 1000;
      if (edge) {
        const j = look.jitter || (look.flicker ? 1.5 : 0);
        edge.setPosition(j ? (Math.random() * 2 - 1) * j : 0, j ? (Math.random() * 2 - 1) * j : 0);
        if (look.flicker) edge.setVisible(Math.floor(t * 8) % 2 === 0);
      }
      if (look.shimmer) main.setX(Math.sin(t * 22) * 1.2);
    };
    this.events.on('postupdate', step);
    return box;
  },
  _fxm394NpcBody(S, p) {
    const key = S.npc;
    if (!this.textures.exists(key)) {
      try { this.load.spritesheet(key, `./public/assets/${key}.png`, { frameWidth: 64, frameHeight: 64 }); if (!this.load.isLoading()) this.load.start(); } catch (e) { /* next cast */ }
      return null;
    }
    const box = this.add.container(p.x, p.y);
    const s = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 0.9).setScale(1.05).setTint(S.tint || 0xc8ccd2).setAlpha(S.alpha || 0.62);
    const glow = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 0.9).setScale(1.1).setTint(0xe8ecf4).setAlpha(0.18).setBlendMode(ADD);
    box.add([glow, s]);
    this.tweens.add({ targets: s, scaleY: 1.08, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, scaleY: 1.13, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return box;
  },
  _fxm394CityBody(S, p) {
    const K = CITY_PROP_ART_R381, d = CITY_PROPS_R381[S.city];
    if (!d || !this.textures.exists(K.key)) return null;
    const box = this.add.container(p.x, p.y);
    const k = S.scale || d.scale;
    const img = this.add.image(0, 10, K.key, d.idx).setOrigin(K.footX, K.footY).setScale(k);
    if (S.crop) {
      // one piece of the prop (the guard post's spear rack): cropped, and the piece's own foot set on the point
      const [cx, cy, cw, ch] = S.crop;
      img.setCrop(cx, cy, cw, ch).setOrigin(0, 0).setPosition(-(cx + cw / 2) * k, 10 - (cy + ch) * k);
    }
    box.add(img);
    if (S.over && this._sheetKey) {
      const key = this._sheetKey(S.over.f, 'native');
      const info = fxFamilyInfo(S.over.f);
      if (key && info) {
        const ak = `${key}_fxm394loop`;
        if (!this.anims.exists(ak)) this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: (info.frames || 1) - 1 }), frameRate: 1000 / (info.frameMs || 80), repeat: -1 });
        const o = this.add.sprite(0, 10 - (S.over.lift || 20), key, 0).setScale(S.over.scale || 0.5).setAlpha(0.85);
        if (S.over.tint != null) o.setTint(S.over.tint);
        o.play(ak);
        box.add(o);
      }
    }
    return box;
  },
  _fxm394BellBody(S, p, a) {
    if (!this._r393PropSprite) return null;
    const box = this.add.container(p.x, p.y);
    const sp = this._r393PropSprite(S.prop, null, 0, 10, S.scale || 0.9);
    if (!sp) { box.destroy(); return null; }
    box.add(sp);
    if (S.crack) {
      // "a visible crack": a dark jagged line down the bell's face, lit at its edge
      const g = this.add.graphics();
      const h = (sp.displayHeight || 86), top = 10 - h * 0.96;
      const pts = [[2, 0.34], [-2, 0.42], [3, 0.5], [-1, 0.58], [2, 0.64]].map(([x, f]) => ({ x, y: top + h * f }));
      g.lineStyle(2, 0x1a120a, 0.9).strokePoints(pts);
      g.lineStyle(1, 0xffd890, 0.6).strokePoints(pts.map(q => ({ x: q.x + 1, y: q.y })));
      box.add(g);
    }
    if (this._r393Rise) this._r393Rise(sp, 380);
    void a;
    return box;
  },
  _fxm394PendulumBody(S, p) {
    const key = 'fx393_pendulum';
    if (!this.textures.exists(key)) return null;
    const ak = 'fx393_pendulum_fxm394';
    if (!this.anims.exists(ak)) this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: 11 }), frameRate: 12, repeat: -1 });
    const box = this.add.container(p.x, p.y);
    const s = this.add.sprite(0, 10, key, 0).setOrigin(0.5, 0.98).setScale(S.scale || 0.62);
    s.play(ak);
    box.add(s);
    return box;
  },
  _fxm394StillBody(S, p) {
    if (!this.textures.exists(S.still)) return null;
    const box = this.add.container(p.x, p.y);
    const s = this.add.image(0, -18, S.still).setScale(S.scale || 0.9);
    if (S.tint != null) s.setTint(S.tint);
    if (S.add) s.setBlendMode(ADD);
    box.add(s);
    if (S.bob) this.tweens.add({ targets: s, y: -26, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return box;
  },
  _fxm394SheetBody(S, p, a) {
    const info = fxFamilyInfo(S.sheet);
    const el = (this._specElement && this._specElement(a)) || a.element || null;
    const colour = S.colour || (el && DAMAGE_FX_COLORS[el] != null ? '#' + DAMAGE_FX_COLORS[el].toString(16).padStart(6, '0') : 'white');
    const key = info && this._sheetKey ? this._sheetKey(S.sheet, colour) : null;
    if (!key) return null;
    const ak = `${key}_fxm394loop`;
    if (!this.anims.exists(ak)) this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: (info.frames || 1) - 1 }), frameRate: 1000 / (info.frameMs || 60), repeat: -1 });
    const box = this.add.container(p.x, p.y);
    const s = this.add.sprite(0, 12, key, 0).setOrigin(0.5, 0.94).setScale(S.scale || 0.8).setAlpha(0.85);
    if (S.tint != null) s.setTint(S.tint);
    s.play(ak);
    box.add(s);
    void damageFxFor;
    return box;
  },

  // ---------------------------------------------------------------------------------------------- flights --
  _fxm394FlightInit(sprite, flight) {
    const X = flight && flight.fxmap;
    if (!X || !sprite) return;
    if (X.sy) sprite.setScale(sprite.scaleX, sprite.scaleX * X.sy);
    if (flight.art === 'streak') this._fxm394Textures();
    sprite._fxm394 = { base: sprite.scaleX, baseY: sprite.scaleY };
    if (flight.tint != null && flight.art === 'shockring') sprite.setBlendMode(ADD);
  },
  _fxm394FlightTick(pr, dt, st) {
    const spr = pr && pr.sprite, X = pr && pr.flight && pr.flight.fxmap;
    if (!spr || !spr.active || !X) return;
    const m = spr._fxm394 || (spr._fxm394 = { base: spr.scaleX, baseY: spr.scaleY });
    const t = st ? st.t : 0;
    if (X.hue) {
      // "cycles colour every 2 frames (red, blue, yellow, violet, white)"
      const cyc = [0xff4040, 0x4a7aff, 0xffe040, 0xb050ff, 0xffffff];
      spr.setTint(cyc[Math.floor(t / 70) % cyc.length]);
      if (st && st.trail && st.trail.active) st.trail.setTint(hue((t / 600) % 1));
    }
    if (X.swell) {
      const u = clamp(t / 900, 0, 1);
      const k = lerp(X.swell[0], X.swell[1], u);
      spr.setScale(m.base * k, m.baseY * k);
    }
  },
};

/** The frame of a monster fly sheet facing east-ish (its rows run per direction). */
function dirFrame(art, field) {
  const per = art[field] || 8;
  return per * 2;
}
