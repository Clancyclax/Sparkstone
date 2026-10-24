// ===========================================================================
// ROUND 394 -- THE r392 ONE-OFF EFFECTS, FIELD DECALS AND RIDER SHEETS, PLAYED.
//
//   "Load them and wire each file to the rows in its `gaps` field, so the abilities that need those gaps draw it."
//   "Some pieces are played reversed (portal close, wings unfold)."  "Multi-piece rows (force-field: bubble, shatter,
//    stasis dome, ground ring) play their pieces where each belongs."
//   "effects/fields/: one ground decal per field row ... drawn under the field abilities that name those gaps."
//   "thorns-burst, trail-decal, vial-cloud, parry-spark and shatter-burst ... Each plays in the ELEMENT of the rider
//    (its `element`, else the sheet's damage type). spark = twotone-spark: two element sparks played together, one
//    mirrored, on a two-type hit."
//
// src/data/fxArt394.js says what each row draws (its layers); this is the half that draws them. ART ONLY: nothing here
// changes a number. Every door answers false/null when what it needs is not loaded yet (asking for it on the way), and
// its caller then keeps the old stand-in -- nothing goes blank.
//
//   _fx394Play(fx, wx, wy, scale, opts)   a cast whose spec carries `r394` (WorldScene._playSpellFx; the stand-in plays
//                                         only when this drew nothing)
//   _fx394Cast(a)                         at the cast: the pieces on the caster, a bolt's muzzle, a shield's bubble and
//                                         a beam's pieces (those casts never reach _playSpellFx)
//   _fx394Path(fx, x0, y0, x1, y1)        along a dash / blink: both portal ends, the charge trail, the pounce arc
//   _flight394(a)                         a bolt's own flight loop (WorldScene._flightSpec, wrapped)
//   _fx394Prefetch(known)                 fetch the cuts a kit will cast; learn which conditions carry a mark
//   _fx394CondTick()                      the marks over every body carrying a marked condition (postupdate)
//   _fx394Rider(kind, el, wx, wy, o)      a rider sheet: thorns, trail, vial, parry, shatter, spark
//   _fx394TwoTone(m, parts)               the two-tone spark of a two-type hit
//   _fx394TriggerBolt(a, el, from, t)     a trigger bolt that is a kiss or a lobbed glob of molten rock
//   _fx394Leap(from, to, el)              a condition leaping body to body on a death (leap-arc)
//   _fx394Payoff(m, p)                    a payoff burst: the payoff ability's own row art, else the shatter
// ===========================================================================
import { isoProject, isoDepth } from '../data/iso.js';
import { damageFxFor, DAMAGE_FX_COLORS } from '../data/damageFx.js';
import {
  fxArt394For, flight394For, fx394Key, fx394SheetFor, sheetInfo, riderKey, FX394_RIDERS, FX394_TYPES, SHARED_ROWS,
} from '../data/fxArt394.js';

const ADD = 'ADD';
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** The screen vector of a world direction (iso: east runs down-right). */
const scr = (ang) => ({ x: Math.cos(ang) - Math.sin(ang), y: (Math.cos(ang) + Math.sin(ang)) / 2 });
const ALPHA = { natural: 1, colour: 0.92 };
// a white cut at these weights: a ground ring or a cone is an effect laid over the world (a little see-through), a dome,
// a portal or a brand is a thing in it (round 204 "effects, not pictures" -- but these are the pictures the rows asked for)
const WHITE_ALPHA = { ground: 0.82, ring: 0.85, field: 0.85, burst: 0.92, cone: 0.9, path: 0.9, travel: 0.92, fly: 1,
  stand: 1, self: 0.95, head: 1, body: 0.92 };
const FLAT = new Set(['ground', 'ring', 'field']);

export const FxOneoff394Mixin = {
  // ------------------------------------------------------------------------------------------------ loading --
  /** Is this fx394 sheet loaded? If not, ask for it (once) and say no. */
  _fx394Want(key) {
    if (!key || !this.textures) return false;
    if (this.textures.exists(key)) return true;
    const sh = fx394SheetFor(key);
    if (!sh || !this.load) return false;
    this._fx394Asked = this._fx394Asked || new Set();
    if (!this._fx394Asked.has(key)) {
      this._fx394Asked.add(key);
      this.load.spritesheet(sh.key, sh.url, { frameWidth: sh.cell, frameHeight: sh.cellH || sh.cell });
      if (!this.load.isLoading()) this.load.start();
    }
    return false;
  },
  /** The key a layer draws with: the ability's damage-type cut, else the white as drawn while that loads. */
  _fx394KeyFor(stem, dtype) {
    const want = fx394Key(stem, dtype);
    if (this._fx394Want(want)) return want;
    const s = sheetInfo(stem);
    if (s && s.cuts === 'type') { const nat = `fx394_${stem}_native`; if (this._fx394Want(nat)) return nat; }
    return null;
  },

  // ------------------------------------------------------------------------------------------- one sprite --
  /**
   * One sheet at a SCREEN point. o: { ox, oy, sx, sy, rot, flipX, add, alpha, depth, delay, frames, frameMs, laps,
   * hold (ms on the last frame), rev (frames backwards), fade, to: {x, y}, follow: () => {x, y, depth} | null,
   * until: () => bool (loops while true, then ends), then: () => void }.
   */
  _fx394Sprite(key, x, y, o = {}) {
    if (!key || !this.textures || !this.textures.exists(key) || !this.add) return null;
    const frames = Math.max(1, o.frames || 1);
    const spr = this.add.sprite(x, y, key, o.rev ? frames - 1 : 0);
    spr.setOrigin(o.ox != null ? o.ox : 0.5, o.oy != null ? o.oy : 0.5);
    spr.setScale(o.sx != null ? o.sx : 1, o.sy != null ? o.sy : (o.sx != null ? o.sx : 1));
    if (o.rot) spr.setRotation(o.rot);
    if (o.flipX) spr.setFlipX(true);
    if (o.add) spr.setBlendMode(ADD);
    spr.setDepth(o.depth != null ? o.depth : 90000);
    const a0 = o.alpha != null ? o.alpha : 1;
    spr.setAlpha(a0);
    const fms = o.frameMs || 80, laps = Math.max(1, o.laps || 1);
    const play = frames * laps * fms, hold = o.hold || 0;
    const fade = o.fade != null ? o.fade : 0.2;
    const x0 = x, y0 = y;
    if (o.delay) spr.setVisible(false);
    this._fx394Live = (this._fx394Live || 0) + 1;
    let t0 = null, ended = false, endAt = 0;
    const done = () => {
      if (ended) return; ended = true;
      this._fx394Live--;
      if (spr.active) spr.destroy();
      if (o.then) { try { o.then(); } catch (e) { /* art is seasoning */ } }
    };
    const tick = () => {
      if (!spr.active) { if (!ended) { ended = true; this._fx394Live--; } return false; }
      const now = this._fx394Now();
      if (t0 == null) { t0 = now; spr.setVisible(true); }
      const el = now - t0;
      const f = o.follow && o.follow();
      if (o.follow && !f) { done(); return false; }
      if (f) { spr.setPosition(f.x, f.y); if (f.depth != null) spr.setDepth(f.depth); }
      if (o.until) {
        // loops while the thing it stands for holds (a shield), then ends -- and plays what follows (its break)
        if (!endAt && !o.until()) endAt = el;
        const k = Math.floor(el / fms) % frames;
        spr.setFrame(o.rev ? frames - 1 - k : k);
        if (endAt || el > (o.maxMs || 30000)) { done(); return false; }
        return true;
      }
      if (o.to) { const u = Math.min(1, el / play); spr.setPosition(x0 + (o.to.x - x0) * u, y0 + (o.to.y - y0) * u); }
      const k = el >= play ? frames - 1 : Math.floor(el / fms) % frames;
      spr.setFrame(o.rev ? frames - 1 - k : k);
      const ms = play + hold;
      if (fade > 0 && el > ms * (1 - fade)) spr.setAlpha(a0 * Math.max(0, (ms - el) / (ms * fade)));
      if (el >= ms) { done(); return false; }
      return true;
    };
    this._fx394Run(tick, o.delay || 0);
    return spr;
  },
  _fx394Now() { return (this.time && this.time.now) || Date.now(); },
  /** One clock for every live fx394 sprite (the scene's postupdate), so a sprite can ride a body and a loop can wait
   *  on a shield. A delayed one joins when its delay is up. */
  _fx394Run(tick, delay) {
    const list = this._fx394Ticks || (this._fx394Ticks = []);
    if (delay > 0 && this.time && this.time.delayedCall) this.time.delayedCall(delay, () => { list.push(tick); tick(); });
    else { list.push(tick); tick(); }
    this._fx394Hook();
  },
  _fx394Hook() {
    if (this._fx394Hooked || !this.events) return;
    this._fx394Hooked = true;
    this.events.on('postupdate', () => {
      const list = this._fx394Ticks;
      if (list && list.length) this._fx394Ticks = list.filter(t => { try { return t(); } catch (e) { return false; } });
      try { this._fx394CondTick(); } catch (e) { /* marks are seasoning */ }
    });
  },

  // --------------------------------------------------------------------------------------------- placement --
  /** Where a cast points: the caller's aim, the player's own when it is the player's cast, else the nearest body. */
  _fx394Aim(wx, wy, opts) {
    if (opts && typeof opts.aim === 'number') return opts.aim;
    const w = this.world, p = this.player;
    if (w && p && Math.hypot(w.x - wx, w.y - wy) < 6) return p.aimAngle || 0;
    let best = null, bd = 420;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive) continue;
      const d = Math.hypot(m.wx - wx, m.wy - wy);
      if (d > 4 && d < bd) { bd = d; best = m; }
    }
    return best ? Math.atan2(best.wy - wy, best.wx - wx) : (p ? p.aimAngle || 0 : 0);
  },
  /** Living enemies near a point (the struck), nearest first. */
  _fx394Bodies(wx, wy, r, max = 6) {
    const out = [];
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || !m.sprite || !m.sprite.active) continue;
      const d = Math.hypot(m.wx - wx, m.wy - wy);
      if (d <= r + ((m.type && m.type.radius) || 12)) out.push([d, m]);
    }
    return out.sort((a, b) => a[0] - b[0]).slice(0, max).map(x => x[1]);
  },
  /** Where a body's head is on screen, and its height. */
  _fx394BodyBox(m) {
    const s = m && m.sprite;
    if (!s || !s.active) return null;
    const h = Math.max(20, Math.min(160, s.displayHeight || 48));
    const foot = s.y + h * (1 - (s.originY != null ? s.originY : 0.5));
    return { x: s.x, foot, top: foot - h, mid: foot - h * 0.5, h, depth: s.depth };
  },

  /** One layer, played. ctx: { plan, dtype, wx, wy, aim, reach, x0?, y0?, x1?, y1? (a path) }. Returns the first sprite. */
  _fx394Layer(L, ctx) {
    if (L.r393) {
      if (!this._fx393Layer) return null;
      const spec = { dtype: ctx.dtype };
      return this._fx393Layer({ ...L.r393, delay: (L.r393.delay || 0) + (L.delay || 0) }, { spec, wx: ctx.wx, wy: ctx.wy, aim: ctx.aim, reach: ctx.reach });
    }
    const s = sheetInfo(L.s);
    if (!s) return null;
    const key = this._fx394KeyFor(L.s, ctx.dtype);
    if (!key) return null;
    const role = L.role;
    const alpha = (L.alpha != null ? L.alpha : 1) * (s.colour === 'white' ? (WHITE_ALPHA[role] || 0.85) : (ALPHA[s.colour] || 1));
    const base = { frames: s.frames, frameMs: s.ms / (L.speed || 1), laps: L.laps || 1, hold: L.hold || 0, rev: !!L.rev,
      alpha, delay: L.delay || 0, ox: s.ax, oy: s.ay };
    if (L.then) {
      const nxt = L.then;
      base.then = () => { this._fx394Layer({ ...L, s: nxt, then: null, until: null, laps: 1, hold: 0, delay: 0, rev: false }, ctx); };
    }
    const artW = Math.max(8, s.bx1 - s.bx0), artH = Math.max(8, s.by1 - s.by0);
    const R = ctx.reach * (L.scale || 1);
    const sc = L.scale || 1;
    const P = (wx, wy) => isoProject(wx, wy);
    const over = (wx, wy) => isoDepth(wx, wy) + 90000;
    const n = Math.max(1, L.n || 1);
    const one = (wx, wy, extra = {}) => {
      const p = P(wx, wy);
      switch (role) {
        case 'ground': case 'field': case 'ring': {
          const k = clamp((R * 2) / artW, 0.4, 3.4) * (n > 1 ? 0.45 : 1);
          return this._fx394Sprite(key, p.x, p.y, { ...base, sx: k, sy: k * (role === 'ring' ? 0.55 : 1), depth: this._fx394FlatDepth(wx, wy, R), ...extra });
        }
        case 'stand': {
          const k = (s.w >= 128 ? clamp(R * 2 / artW, 0.8, 1.6) : 1.2) * sc * (n > 1 ? 0.8 : 1);
          return this._fx394Sprite(key, p.x, p.y + 2, { ...base, sx: k, depth: over(wx, wy) + 1, ...extra });
        }
        default: {   // burst (and a fly / head piece played where the cast lands)
          const k = (artW >= 80 ? clamp((R * 2) / artW * 0.8, 0.6, 2.2) : (artW <= 24 ? 1.6 : 1.2)) * sc * (n > 1 ? 0.7 : 1);
          const add = s.colour === 'white' && this._fx394Bright(ctx.dtype);
          return this._fx394Sprite(key, p.x, p.y - 14, { ...base, ox: 0.5, oy: 0.5, sx: k, add, depth: over(wx, wy) + 2, ...extra });
        }
      }
    };
    const fromScr = (x0, y0) => { const p = P(x0, y0); return { x: p.x, y: p.y - 18 }; };
    switch (L.at) {
      case 'point': case 'end': case 'start': {
        let wx = ctx.wx, wy = ctx.wy;
        if (L.at === 'start' && ctx.x0 != null) { wx = ctx.x0; wy = ctx.y0; }
        else if (L.at === 'end' && ctx.x1 != null) { wx = ctx.x1; wy = ctx.y1; }
        else if (L.at === 'end') { wx += Math.cos(ctx.aim) * ctx.reach; wy += Math.sin(ctx.aim) * ctx.reach; }
        if (role === 'cone') return this._fx394Cone(key, s, base, L, ctx, wx, wy);
        if (n === 1) return one(wx, wy);
        let first = null;
        for (let i = 0; i < n; i++) {
          const ang = i * 2.399 + ctx.aim, rad = ctx.reach * (0.3 + 0.55 * ((i * 7 + 3) % 10) / 10);
          const spr = one(wx + Math.cos(ang) * rad, wy + Math.sin(ang) * rad, { delay: base.delay + i * (L.every || 60) });
          if (!first) first = spr;
        }
        return first;
      }
      case 'aim': {
        if (role === 'cone') return this._fx394Cone(key, s, base, L, ctx, ctx.wx, ctx.wy);
        if (role === 'travel') {
          const sv = scr(ctx.aim);
          const a0 = P(ctx.wx, ctx.wy), e = P(ctx.wx + Math.cos(ctx.aim) * ctx.reach, ctx.wy + Math.sin(ctx.aim) * ctx.reach);
          return this._fx394Sprite(key, a0.x, a0.y + 2, { ...base, sx: sc, flipX: sv.x < 0, to: { x: e.x, y: e.y + 2 }, depth: over(ctx.wx, ctx.wy) + 2 });
        }
        // a row of copies out along the aim (the horn row "repeat per tile, staggered")
        let first = null;
        for (let i = 0; i < n; i++) {
          const u = (i + 1) / (n + 0.5);
          const spr = one(ctx.wx + Math.cos(ctx.aim) * ctx.reach * u, ctx.wy + Math.sin(ctx.aim) * ctx.reach * u, { delay: base.delay + i * (L.every || 70) });
          if (!first) first = spr;
        }
        return first;
      }
      case 'path': case 'line': {
        let x0 = ctx.x0, y0 = ctx.y0, x1 = ctx.x1, y1 = ctx.y1;
        if (x0 == null) {
          x0 = ctx.cx != null ? ctx.cx : (this.world ? this.world.x : ctx.wx); y0 = ctx.cy != null ? ctx.cy : (this.world ? this.world.y : ctx.wy);
          x1 = ctx.wx; y1 = ctx.wy;
          if (Math.hypot(x1 - x0, y1 - y0) < 12) { x1 = x0 + Math.cos(ctx.aim) * ctx.reach; y1 = y0 + Math.sin(ctx.aim) * ctx.reach; }
        }
        const a = fromScr(x0, y0), b = fromScr(x1, y1);
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
        if (role === 'fly' || role === 'burst' || role === 'stand') {
          // a thing that flies (a mask, a scroll) goes from the caster to the point
          return this._fx394Sprite(key, a.x, a.y, { ...base, ox: 0.5, oy: 0.5, sx: 1.2 * sc, flipX: dx < 0, to: { x: b.x, y: b.y },
            laps: Math.max(base.laps, 2), frameMs: Math.min(base.frameMs, 60), depth: over(Math.max(x0, x1), Math.max(y0, y1)) + 3 });
        }
        return this._fx394Sprite(key, a.x, a.y + 10, { ...base, ox: s.bx0 / s.w, oy: s.oy, sx: len / artW, sy: (dx < 0 ? -1 : 1) * Math.min(1.4, Math.max(0.7, len / artW)) * sc,
          rot: Math.atan2(dy, dx), depth: over(Math.max(x0, x1), Math.max(y0, y1)) + 1 });
      }
      case 'caster': {
        if (role === 'cone') {
          const cx = this.world ? this.world.x : ctx.wx, cy = this.world ? this.world.y : ctx.wy;
          return this._fx394Cone(key, s, base, L, { ...ctx, reach: 46 }, cx, cy);
        }
        return this._fx394OnBody(key, s, base, L, null);
      }
      case 'bodies': {
        const r = ctx.bodyR != null ? ctx.bodyR : Math.max(30, Math.min(170, ctx.reach * 0.9));
        const list = ctx.targets || this._fx394Bodies(ctx.wx, ctx.wy, r, L.max || 5);
        if (!list.length) return null;
        let first = null;
        list.forEach((m, i) => {
          const spr = this._fx394OnBody(key, s, { ...base, delay: base.delay + i * 50 }, L, m);
          if (!first) first = spr;
        });
        return first;
      }
      case 'cond': {
        // learned at prefetch: the ability's condition shows this mark while it holds (see _fx394CondTick)
        return null;
      }
      case 'field': return this._fx394Field(key, s, base, L, ctx);
      default: return one(ctx.wx, ctx.wy);
    }
  },

  /** The depth a thing lying on the ground is drawn at: over level ground and the decals already on it (round 335's
   *  GROUND_DECAL_DEPTH is 1), and on a raised plaza, a ledge or a terrace -- whose tiles are drawn at their own iso
   *  depth (elevationMixin) -- over the raised tiles it covers (round 371's aura rule, `_auraDecalDepth`'s near half),
   *  or a field laid in the town square goes under the paving. */
  _fx394FlatDepth(wx, wy, r = 0) {
    const d = this._auraDecalDepth ? this._auraDecalDepth(wx, wy, r) : null;
    if (d && d.near !== d.far) return d.near + 0.02;
    return 1.02;
  },
  /** A cone: origin on the caster (its art's anchor), turned to the aim, stretched to the reach. */
  _fx394Cone(key, s, base, L, ctx, wx, wy) {
    const P0 = isoProject(wx, wy);
    const end = isoProject(wx + Math.cos(ctx.aim) * ctx.reach, wy + Math.sin(ctx.aim) * ctx.reach);
    const len = Math.hypot(end.x - P0.x, end.y - P0.y);
    const artLen = Math.max(8, s.bx1 - s.ax * s.w);
    const k = clamp((len / artLen) * (L.scale || 1), 0.35, 3.2);
    const sv = scr(ctx.aim), svl = Math.hypot(sv.x, sv.y) || 1;
    const add = s.colour === 'white' && this._fx394Bright(ctx.dtype);
    return this._fx394Sprite(key, P0.x, P0.y - (L.lift != null ? L.lift : 20), { ...base, sx: k, sy: (sv.x < 0 ? -1 : 1) * Math.min(k, 1.6),
      rot: Math.atan2(sv.y / svl, sv.x / svl), add, depth: isoDepth(wx, wy) + 90003 });
  },
  /** Light enough to ADD? A dark cut added on a dark floor is no effect at all. */
  _fx394Bright(dtype) {
    const hex = DAMAGE_FX_COLORS[dtype];
    if (hex == null) return true;
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
  },

  /** A piece riding a body (`m`, or the player when null): on its head, at its feet, or over it. */
  _fx394OnBody(key, s, base, L, m) {
    const role = L.role;
    const box = () => {
      if (m) return this._fx394BodyBox(m.alive === false && !L.dead ? null : m);
      const ps = this.playerSprite;
      if (!ps || !ps.active) return null;
      const h = Math.max(30, Math.min(120, ps.displayHeight || 56));
      const foot = ps.y + h * (1 - (ps.originY != null ? ps.originY : 0.5));
      return { x: ps.x, foot, top: foot - h, mid: foot - h * 0.5, h, depth: ps.depth };
    };
    const b0 = box();
    if (!b0) return null;
    const behind = L.s === 'corona' || L.s === 'manifest_rise' || L.s === 'mane_loop';
    const feet = s.ay >= 0.8;
    const place = (b) => {
      if (role === 'head') return { x: b.x, y: b.top - 4, depth: b.depth + 2 };
      if (feet) return { x: b.x, y: b.foot + 2, depth: b.depth + (behind ? -1 : 1) };
      return { x: b.x, y: b.mid, depth: b.depth + (behind ? -1 : 1) };
    };
    // sized to the body: a head mark at its own pixel size, a web or a bubble to cover the one it is on
    const k = role === 'head' ? (s.w <= 16 ? 1.5 : 1.15) * (L.scale || 1)
      : feet && role === 'body' ? clamp((b0.h * 1.7) / Math.max(16, s.by1 - s.by0), 0.9, 2.4) * (L.scale || 1)   // bars, a jar, strings
        : clamp((b0.h * (role === 'self' && s.h >= 96 ? 1.5 : 1.15)) / Math.max(16, s.by1 - s.by0), 0.6, 2.4) * (L.scale || 1);
    const p0 = place(b0);
    const o = { ...base, sx: k, depth: p0.depth, follow: () => { const b = box(); return b ? place(b) : null; } };
    if (role === 'head') { o.ox = 0.5; o.oy = 1; }
    if (L.until === 'shield') {
      o.until = () => { const sh = this.player && this.player.shield; return !!(sh && (sh.amount == null || sh.amount > 0)); };
      o.maxMs = 20000;
    }
    return this._fx394Sprite(key, p0.x, p0.y, o);
  },

  /** A field decal under the field for its life: grown in once (a one-shot sheet holds its last frame), then left
   *  lying -- a looping one loops -- until the field ends, then faded. */
  _fx394Field(key, s, base, L, ctx) {
    const p = isoProject(ctx.wx, ctx.wy);
    const R = ctx.fieldR || ctx.reach;
    const k = clamp((R * 2) / Math.max(8, s.bx1 - s.bx0), 0.5, 3.6) * (L.scale || 1);
    const dur = (ctx.plan && ctx.plan.dur) || 3000;
    const fields = () => (this._bloomFields || []).some(f => Math.hypot(f.x - ctx.wx, f.y - ctx.wy) < 6);
    const tracked = ctx.plan && ctx.plan.kind === 'field';
    const laps = s.loop ? Math.max(1, Math.round(dur / (s.frames * s.ms))) : 1;
    const hold = s.loop ? 0 : Math.max(0, dur - s.frames * s.ms);
    const spr = this._fx394Sprite(key, p.x, p.y, { ...base, laps, hold, sx: k, depth: this._fx394FlatDepth(ctx.wx, ctx.wy, R), fade: 0.12 });
    if (spr && tracked) {
      // a field that ends early (or late) takes its decal with it
      const born = this._fx394Now();
      this._fx394Run(() => {
        if (!spr.active) return false;
        if (this._fx394Now() - born > 400 && !fields()) { spr.destroy(); return false; }
        return true;
      }, 0);
    }
    if (spr) this._fx394Fields = (this._fx394Fields || 0) + 1;
    return spr;
  },

  // ------------------------------------------------------------------------------------------------ a cast --
  /** A cast whose spec carries an r394 plan, where it lands. Returns the first sprite drawn (null: the stand-in plays). */
  _fx394Play(fx, wx, wy, scale = 1, opts = {}) {
    const plan = fx && fx.r394;
    if (!plan || !plan.layers || !this.add) return null;
    if (plan.kind === 'shield' || plan.kind === 'beam') return this._fx394CastDrawn || null;   // drawn at the cast
    const ctx = { plan, dtype: plan.dtype || fx.dtype, wx, wy, aim: this._fx394Aim(wx, wy, opts), reach: Math.max(36, (scale || 1) * 60),
      fieldR: plan.fieldR };
    const atCast = plan.kind === 'bolt' ? new Set(['caster', 'aim', 'flight', 'cond']) : new Set(['caster', 'flight', 'cond']);
    let first = null;
    for (const L of plan.layers) {
      if (atCast.has(L.at)) continue;
      if (plan.kind === 'bolt' && (L.at === 'point' || L.at === 'bodies')) {
        // an impact: the struck body itself, not every body round it
        const r = this._fx394Layer(L, { ...ctx, reach: Math.max(30, ctx.reach * 0.6), bodyR: 18 });
        if (!first && r) first = r;
        continue;
      }
      const r = this._fx394Layer(L, ctx);
      if (!first && r) first = r;
    }
    // a cast whose art is all on the caster (an oracle's trance, a vessel filling) drew it at the cast: the stand-in
    // the same cast hands here is not drawn as well
    const mark = this._fx394CastMark;
    if (!first && mark && mark.rows === plan.rows.join() && this._fx394Now() - mark.at < 300) first = mark.spr;
    this._fx394Casts = (this._fx394Casts || 0) + 1;
    this._fx394Last = { rows: plan.rows, kind: plan.kind, drawn: !!first, where: 'play' };
    return first;
  },

  /** At the cast itself: what stands on the caster, a bolt's muzzle and cone, and the whole of a shield or a beam. */
  _fx394Cast(a) {
    if (!a || !this.world || !this.player) return 0;
    const dtype = damageFxFor(a);
    const plan = fxArt394For(a, dtype);
    this._fx394CastDrawn = null;
    if (!plan) return 0;
    this._fx394LearnMarks(a, plan, dtype);
    const reach = Math.max(36, a.range || a.explodeRadius || 70);
    const ctx = { plan, dtype, wx: this.world.x, wy: this.world.y, aim: this.player.aimAngle || 0, reach };
    const all = plan.kind === 'shield' || plan.kind === 'beam';
    let n = 0, first = null;
    for (const L of plan.layers) {
      if (L.at === 'flight' || L.at === 'cond') continue;
      const mine = L.at === 'caster' || (plan.kind === 'bolt' && L.at === 'aim') || (plan.kind === 'move' && L.at === 'aim');
      if (!mine && !all) continue;
      let c = ctx;
      if (plan.kind === 'beam' && (L.at === 'point' || L.at === 'bodies')) {
        c = { ...ctx, wx: ctx.wx + Math.cos(ctx.aim) * reach, wy: ctx.wy + Math.sin(ctx.aim) * reach, reach: Math.min(reach, 90) };
      }
      if (plan.kind === 'beam' && L.at === 'path') c = { ...ctx, x0: ctx.wx, y0: ctx.wy, x1: ctx.wx + Math.cos(ctx.aim) * reach, y1: ctx.wy + Math.sin(ctx.aim) * reach };
      const r = this._fx394Layer(L, c);
      if (r) { n++; if (!first) first = r; }
    }
    if (all) this._fx394CastDrawn = first;
    this._fx394CastMark = first ? { rows: plan.rows.join(), at: this._fx394Now(), spr: first } : null;
    if (n) this._fx394CastN = (this._fx394CastN || 0) + 1;
    return n;
  },

  /** Along a dash or a blink: `start` at where it began, `point` / `end` where it ended, `path` stretched between. */
  _fx394Path(fx, x0, y0, x1, y1) {
    const plan = fx && fx.r394;
    if (!plan || !this.add) return false;
    const aim = Math.atan2(y1 - y0, x1 - x0), d = Math.hypot(x1 - x0, y1 - y0);
    const ctx = { plan, dtype: plan.dtype || fx.dtype, wx: x1, wy: y1, aim, reach: Math.max(40, d), x0, y0, x1, y1 };
    let drew = false;
    for (const L of plan.layers) {
      if (L.at === 'caster' || L.at === 'flight' || L.at === 'cond' || L.at === 'aim') continue;
      if (this._fx394Layer(L, L.at === 'bodies' ? { ...ctx, reach: 60 } : ctx)) drew = true;
    }
    this._fx394Paths = (this._fx394Paths || 0) + 1;
    return drew;
  },

  /** A bolt's own flight loop, in its damage type, or null (the old flight flies while it loads). */
  _flight394(a) {
    let f = null;
    try { f = flight394For(a, damageFxFor(a)); } catch (e) { f = null; }
    if (!f) return null;
    if (this._fx394Want(f.key)) return f;
    const s = sheetInfo(f.stem);
    if (s && s.cuts === 'type' && this._fx394Want(`fx394_${f.stem}_native`)) return { ...f, key: `fx394_${f.stem}_native` };
    return null;
  },

  // ------------------------------------------------------------------------------------- the kit, prefetched --
  /** Fetch, in the background, every sheet a kit's covered abilities, its riders, its splits and its payoffs will
   *  draw, and learn which of its conditions carry a mark. Run from _prefetchKitFx. */
  _fx394Prefetch(known) {
    let n = 0;
    const want = (k) => { if (k && !this.textures.exists(k)) { this._fx394Want(k); n++; } };
    const auras = [];
    for (const k of Object.keys(known || {})) {
      const e = known[k], a = e && e.ability;
      if (!a) continue;
      const dtype = damageFxFor(a);
      const plan = fxArt394For(a, dtype);
      // a passive aura's own art (the eclipse corona) stands round you for as long as you know it
      if (plan && a.template === 'aura') {
        const L = plan.layers.find(x => x.at === 'caster' && x.loop);
        if (L) auras.push({ stem: L.s, dtype });
      }
      if (plan) {
        this._fx394LearnMarks(a, plan, dtype);
        for (const L of plan.layers) { if (L.s) want(fx394Key(L.s, dtype)); if (L.then) want(fx394Key(L.then, dtype)); }
      }
      if (Array.isArray(a.damageSplit)) for (const sp of a.damageSplit) want(riderKey('spark', sp && sp.type));
      if (a.essCond && a.essCond.shape === 'shatter') want(riderKey('shatter', a.damageType || a.element || 'physical'));
    }
    const pm = (this.player && this.player.passiveMods) || {};
    for (const e of (pm.gearRiders || [])) {
      const el = this._fx394RiderEl(e);
      const kind = { struck: 'thorns', trail: 'trail', interval: 'vial', block: 'parry' }[e.r && e.r.on];
      if (kind) want(riderKey(kind, el));
    }
    for (const t of (pm.typedThorns || [])) want(riderKey('thorns', t.element));
    for (const p of (pm.condPayoffs || [])) if (p.do === 'burst') want(riderKey('shatter', p.type || 'physical'));
    this._fx394Auras = auras;
    if (n) this._fx394Prefetched = (this._fx394Prefetched || 0) + n;
    this._fx394Hook();
    return n;
  },
  /** A kit ability that lays a marked condition: the mark shows over every body carrying it. */
  _fx394LearnMarks(a, plan, dtype) {
    const key = a && a.debuff && a.debuff.key;
    if (!key || !plan) return;
    const L = plan.layers.find(x => x.at === 'cond');
    if (!L) return;
    const marks = this._fx394Marks || (this._fx394Marks = {});
    marks[key] = { stem: L.s, dtype };
  },
  /** Every frame: a known passive aura's art behind you (dropped when the passive goes). */
  _fx394AuraTick() {
    const want = this._fx394Auras || [];
    const live = this._fx394AuraSprites || (this._fx394AuraSprites = {});
    const ps = this.playerSprite;
    const now = this._fx394Now();
    const keep = new Set();
    for (const au of want) {
      const s = sheetInfo(au.stem), key = this._fx394KeyFor(au.stem, au.dtype);
      if (!s || !key || !ps || !ps.active) continue;
      keep.add(au.stem);
      let spr = live[au.stem];
      if (!spr || !spr.active) spr = live[au.stem] = this.add.sprite(ps.x, ps.y, key, 0).setOrigin(0.5, 0.5).setAlpha(0.55);
      if (spr.texture.key !== key) spr.setTexture(key, 0);
      const h = Math.max(30, Math.min(120, ps.displayHeight || 56));
      const foot = ps.y + h * (1 - (ps.originY != null ? ps.originY : 0.5));
      spr.setPosition(ps.x, foot - h * 0.55).setScale(clamp((h * 1.6) / Math.max(16, s.by1 - s.by0), 0.6, 2)).setDepth(ps.depth - 1)
        .setFrame(Math.floor(now / s.ms) % s.frames).setVisible(ps.visible !== false);
    }
    for (const k of Object.keys(live)) if (!keep.has(k)) { if (live[k] && live[k].active) live[k].destroy(); delete live[k]; }
  },
  /** Every frame: a mark over each body carrying a marked condition, dropped when the condition goes. */
  _fx394CondTick() {
    if (this._fx394Auras && (this._fx394Auras.length || this._fx394AuraSprites)) this._fx394AuraTick();
    const marks = this._fx394Marks;
    if (!marks || !this.monsters) return;
    const keys = Object.keys(marks);
    if (!keys.length) return;
    const live = this._fx394MarkSprites || (this._fx394MarkSprites = new Map());
    const now = this._fx394Now();
    const seen = new Set();
    for (const m of this.monsters) {
      if (!m || !m.alive || !m.debuffs || !m.sprite || !m.sprite.active) continue;
      let i = 0;
      for (const k of keys) {
        if (!m.debuffs[k]) continue;
        const id = `${m.id != null ? m.id : ''}|${k}`;
        const tag = m._fx394Tag || (m._fx394Tag = Math.random().toString(36).slice(2));
        const mid = `${tag}|${k}`;
        seen.add(mid);
        let spr = live.get(mid);
        const mk = marks[k], s = sheetInfo(mk.stem);
        const key = this._fx394KeyFor(mk.stem, mk.dtype);
        if (!key || !s) continue;
        if (!spr || !spr.active) {
          spr = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 1).setScale(s.w <= 16 ? 1.5 : 1.1).setAlpha(0.95);
          live.set(mid, spr);
          this._fx394MarkCount = (this._fx394MarkCount || 0) + 1;
        }
        const b = this._fx394BodyBox(m);
        if (!b) continue;
        const head = sheetInfo(mk.stem) && (mk.stem !== 'web_overlay' && mk.stem !== 'sunk_waist');
        if (head) spr.setPosition(b.x + i * 14 - (keys.length > 1 ? 7 : 0), b.top - 4).setOrigin(0.5, 1);
        else spr.setPosition(b.x, b.mid).setOrigin(0.5, 0.5).setScale(clamp(b.h / Math.max(16, s.by1 - s.by0), 0.6, 2));
        spr.setDepth(b.depth + 2).setFrame(Math.floor(now / s.ms) % s.frames);
        void id; i++;
      }
    }
    for (const [mid, spr] of live) {
      if (seen.has(mid)) continue;
      if (spr && spr.active) spr.destroy();
      live.delete(mid);
    }
  },

  // ----------------------------------------------------------------------------------------------- riders --
  /** The element a rider plays in: its own `element`, else the damage type of the sheet (the passive) it rides on. */
  _fx394RiderEl(e) {
    const el = (e && e.r && e.r.element) || (e && e.dtype) || 'physical';
    return el;
  },
  /** A rider sheet at a world point. o: { lift, scale, flipX, alpha, delay, follow (a body), add }. */
  _fx394Rider(kind, element, wx, wy, o = {}) {
    const R = FX394_RIDERS[kind];
    if (!R || !this.add) return null;
    const key = riderKey(kind, element);
    if (!this._fx394Want(key)) return null;
    const el = key.slice(`fx394_${kind}_`.length);
    const info = R.els[el] || {};
    const p = isoProject(wx, wy);
    const flat = kind === 'trail';
    const base = { frames: R.frames, frameMs: o.frameMs || info.ms || R.ms, ox: R.ax, oy: info.ay != null ? info.ay : 0.5, sx: o.scale || 1,
      flipX: !!o.flipX, alpha: o.alpha != null ? o.alpha : 0.95, delay: o.delay || 0, fade: flat ? 0.5 : 0.2, rot: o.rot || 0,
      depth: flat ? this._fx394FlatDepth(wx, wy, 16) + 0.01 : isoDepth(wx, wy) + 90004, add: !!o.add };
    if (o.follow) {
      const m = o.follow;
      base.follow = () => { const b = m === this.player ? null : this._fx394BodyBox(m); if (m === this.player) { const ps = this.playerSprite; return ps && ps.active ? { x: ps.x, y: ps.y - (o.lift || 0) } : null; } return b ? { x: b.x, y: b.mid - (o.lift || 0) + 10, depth: b.depth + 3 } : null; };
    }
    const spr = this._fx394Sprite(key, p.x + (o.dx || 0), p.y - (o.lift != null ? o.lift : 18), base);
    if (spr) { this._fx394Riders = this._fx394Riders || {}; this._fx394Riders[kind] = (this._fx394Riders[kind] || 0) + 1; this._fx394RiderLast = { kind, key }; }
    return spr;
  },
  /** The rider moment's art. `moment`: 'struck' (thorns on the attacker), 'interval' (a vial cloud where it bursts),
   *  'block' (a parry spark on you), 'trail' (a decal where you stepped). True when drawn. */
  _fx394RiderArt(moment, e, m, element = null) {
    const el = element || this._fx394RiderEl(e);
    try {
      if (moment === 'struck' && m) return !!this._fx394Rider('thorns', el, m.wx, m.wy, { lift: 20, follow: m });
      if (moment === 'interval') {
        const c = m && m.alive ? { x: m.wx, y: m.wy } : this.world;
        const R = (e && e.r && e.r.radius) || 80;
        return !!this._fx394Rider('vial', el, c.x, c.y, { lift: 8, scale: clamp(R / 48, 0.8, 2.2) });
      }
      if (moment === 'block') {
        const ang = m ? Math.atan2(m.wy - this.world.y, m.wx - this.world.x) : (this.player.aimAngle || 0);
        return !!this._fx394Rider('parry', el, this.world.x + Math.cos(ang) * 10, this.world.y + Math.sin(ang) * 10, { lift: 26, scale: 1.1, add: this._fx394Bright(el) });
      }
      if (moment === 'trail') {
        const ang = (this.player && this.player.aimAngle) || 0, sv = scr(ang);
        // it fades over the trail point's own life (gearRiders RIDER_TRAIL_LIFE, 2.4 s), so what you see is what bites
        return !!this._fx394Rider('trail', el, this.world.x, this.world.y, { lift: 0, scale: 1.6, rot: Math.atan2(sv.y, sv.x), alpha: 0.9, frameMs: 300 });
      }
    } catch (x) { /* art is optional */ }
    return false;
  },
  /** A hold condition broken for a payoff: the shatter, in the payoff's type. */
  _fx394Shatter(m, element) {
    if (!m) return false;
    return !!this._fx394Rider('shatter', element || 'physical', m.wx, m.wy, { lift: 16, scale: 1 });
  },
  /** A payoff burst: the payoff ability's own row art when its entry has some (a cocoon bursting, a jar cracking, the
   *  mark glyph), else the shatter in the burst's type. True when drawn. */
  _fx394Payoff(m, p) {
    if (!m || !p) return false;
    const e = p.key && this.player && this.player.knownAbilities && this.player.knownAbilities[p.key];
    const a = e && e.ability;
    if (a) {
      const dtype = p.type || damageFxFor(a);
      const plan = fxArt394For(a, dtype);
      if (plan) {
        const ctx = { plan, dtype, wx: m.wx, wy: m.wy, aim: this._fx394Aim(m.wx, m.wy), reach: 60, targets: [m] };
        let drew = false;
        for (const L of plan.layers) if (L.at !== 'cond' && L.at !== 'flight' && L.at !== 'caster' && this._fx394Layer(L, ctx)) drew = true;
        if (drew) return true;
      }
    }
    return this._fx394Shatter(m, p.type);
  },
  /** A two-type hit: both types' sparks on the body at once, the second mirrored ("one mirrored"). True when drawn. */
  _fx394TwoTone(m, parts) {
    if (!m || !parts || parts.length < 2) return false;
    const a = this._fx394Rider('spark', parts[0].type, m.wx, m.wy, { lift: 24, dx: -4 });
    const b = this._fx394Rider('spark', parts[1].type, m.wx, m.wy, { lift: 24, dx: 4, flipX: true });
    if (a || b) this._fx394TwoTones = (this._fx394TwoTones || 0) + 1;
    return !!(a || b);
  },

  // -------------------------------------------------------------------------------------- shared moments --
  /** A trigger bolt (a kill bolt, a spend bolt) whose ability's row flies something (a kiss), or a glob of molten
   *  rock ("lobbed-glob: a lobbed glob projectile ('a glob of molten rock' bolts)"): it arcs from `from` to the target,
   *  and the row's burst (or the glob's splash) plays where it lands. True when drawn (the caller skips its zap). */
  _fx394TriggerBolt(a, el, from, t) {
    if (!t || !from || !this.add) return false;
    const dtype = el || damageFxFor(a || {});
    const plan = a ? fxArt394For({ ...a, template: 'projectileBall' }, dtype) : null;
    let stem = plan && (plan.layers.find(L => L.at === 'flight') || {}).s;
    const text = `${(a && a.name) || ''} ${(a && a.desc) || ''}`;
    if (!stem && /\bglob|\bgob\b|molten|magma|lava|spit/i.test(text)) stem = SHARED_ROWS['lobbed-glob@shared'];
    if (!stem) return false;
    const key = this._fx394KeyFor(stem, dtype);
    const s = sheetInfo(stem);
    if (!key || !s) return false;
    const a0 = isoProject(from.x, from.y), b0 = isoProject(t.wx, t.wy);
    const spr = this._fx394Sprite(key, a0.x, a0.y - 20, { frames: s.frames, frameMs: s.ms, laps: 4, ox: 0.5, oy: 0.5, sx: s.w <= 16 ? 1.5 : 1,
      alpha: 1, depth: isoDepth(t.wx, t.wy) + 100001, fade: 0.05 });
    if (!spr) return false;
    // an arc, not a line: the glob is lobbed
    const ms = 320, t0 = this._fx394Now();
    this._fx394Run(() => {
      if (!spr.active) return false;
      const u = Math.min(1, (this._fx394Now() - t0) / ms);
      spr.setPosition(a0.x + (b0.x - a0.x) * u, (a0.y - 20) + (b0.y - 18 - (a0.y - 20)) * u - Math.sin(u * Math.PI) * 46);
      if (u >= 1) {
        spr.destroy();
        const hit = plan && plan.layers.find(L => L.at === 'point');
        if (hit) this._fx394Layer({ ...hit, delay: 0 }, { plan, dtype, wx: t.wx, wy: t.wy, aim: 0, reach: 40, targets: [t] });
        else if (this._fx394Want(fx394Key('spit_splash', dtype))) {
          const ss = sheetInfo('spit_splash'), q = isoProject(t.wx, t.wy);
          this._fx394Sprite(fx394Key('spit_splash', dtype), q.x, q.y - 14, { frames: ss.frames, frameMs: ss.ms, alpha: 0.95, depth: isoDepth(t.wx, t.wy) + 90002 });
        }
        return false;
      }
      return true;
    }, 0);
    this._fx394TriggerBolts = (this._fx394TriggerBolts || 0) + 1;
    return true;
  },
  /** A condition leaping from a dead carrier to the next (leap-arc): the arc stretched body to body. True when drawn. */
  _fx394Leap(from, to, element) {
    if (!from || !to) return false;
    const stem = SHARED_ROWS['leap-arc@shared'], s = sheetInfo(stem);
    const key = this._fx394KeyFor(stem, element);
    if (!key || !s) return false;
    const a = isoProject(from.x, from.y), b = isoProject(to.x, to.y);
    const dx = b.x - a.x, dy = (b.y - 16) - (a.y - 16), len = Math.hypot(dx, dy) || 1;
    const spr = this._fx394Sprite(key, a.x, a.y - 16, { frames: s.frames, frameMs: Math.max(30, 300 / s.frames), ox: s.bx0 / s.w, oy: s.ay,
      sx: len / Math.max(8, s.bx1 - s.bx0), sy: dx < 0 ? -1 : 1, rot: Math.atan2(dy, dx), alpha: 0.95,
      depth: isoDepth(Math.max(from.x, to.x), Math.max(from.y, to.y)) + 90005 });
    if (spr) this._fx394Leaps = (this._fx394Leaps || 0) + 1;
    return !!spr;
  },
};

/** For the suite: the types the cuts exist in. */
export const FX394_CUT_TYPES = FX394_TYPES;
