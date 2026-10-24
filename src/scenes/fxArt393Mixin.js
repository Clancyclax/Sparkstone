// ===========================================================================
// ROUND 393 -- THE ART DROP, PLAYED: EFFECTS, PROJECTILES AND PROPS.
//
//   "Wire each base to the gaps the brief lists, replacing the stand-ins named in the r391 CSV."
//   "Add the stills as new flightHint sprites, flying to the right, with the engine handling rotation and spin."
//   "beamlegend / beamtether: these replace the drawn-line beams (the legendary beam, the eclipse beam, the force tether,
//    the lightning-rod tether). Stretch them between the two points."
//   coins, paw prints, the rite book, the lightning rod, the pendulum: "where the r388 sheet said these go".
//
// src/data/fxArt393.js says what each gap draws (its layers); this is the half that draws them. Every door answers
// false/null when what it needs is not loaded, and its caller keeps the old shape -- nothing goes blank.
//
//   _fx393Play(fx, wx, wy, scale, opts)    a cast whose spec carries `r393` (WorldScene._playSpellFx hands it here)
//   _fx393Path(fx, x0, y0, x1, y1)         the same along a dash / blink path (the streak's site)
//   _fx393BeamExtra(st, ms) / _fx393BeamOverride(a)   a held beam's extras, and the stare beam's own sheet
//   _flight393Init(sprite, flight) / _flight393Tick(pr, dt)   a projectile still: tint, spin, trail
//   _fx393Prefetch(known)                  fetch the damage-type cuts a kit's covered abilities will cast
//   _coin393Sprite / _trail393Mark / _riteBook393 / _rod393 / _rod393Sweep / _pendulum393
//   _legendBeam393 / _eclipseBeam393       the r388 props and the two beam sheets
// ===========================================================================
import { isoProject, isoDepth } from '../data/iso.js';
import { fxFamilyInfo, nearestFxColor } from '../data/spellFx.js';
import { DAMAGE_FX_COLORS, damageFxFor } from '../data/damageFx.js';
import { fxArt393For, coinArtKey, FX393_TINTS } from '../data/fxArt393.js';
import { PROPS393 } from '../data/spellFx6.js';

// Phaser accepts a blend mode by name; the mixin takes no Phaser import so the suite can load it in node.
const ADD = 'ADD';
const CAST_ALPHA = 0.4;            // WorldScene CAST_FX_ALPHA -- round 204: "effects, not pictures"
const LINE_ALPHA = 0.62;           // thin line art (rings, cones, a clap) reads at the same weight a little brighter
const LINE_ART = new Set(['shockring', 'shockcone', 'thunderclap', 'sparkfan', 'groundquake']);
// families drawn as a top-down circle, squashed onto the iso ground (the quake and the pool are drawn on it already)
const FLATTEN = { shockring: 0.5, thunderclap: 0.5, runecircle: 0.5 };
const PHYSICAL_TYPES = new Set(['slashing', 'blunt', 'piercing', 'physical']);   // ROUND 393 -- see `phys` in _fx393Colour
const STONE_ALPHA = 0.88;        // the stone creep is a material, not a flash
const hexOf = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** The screen vector of a world direction (iso: east runs down-right). */
const scr = (ang) => ({ x: Math.cos(ang) - Math.sin(ang), y: (Math.cos(ang) + Math.sin(ang)) / 2 });

export const FxArt393Mixin = {
  // ------------------------------------------------------------------------------------------------- colour --
  /** The colour a layer asks its family for: a damage type / tint for the per-type banks (fx5, fx6), a colour name for
   *  the eleven-colour banks (fx2, fx3). */
  _fx393Colour(L, spec) {
    const info = fxFamilyInfo(L.f);
    const dtype = (spec && spec.dtype) || 'physical';
    if (L.cut) return L.cut;   // ROUND 394 -- a layer that names its cut outright (boltstrike's column is the `fire` cut)
    let c = L.c == null ? 'type' : L.c;
    // ROUND 393 -- `phys`: what a 'type' layer draws when the damage type is a bare physical one (grinding sparks are
    // hot metal whatever the blade; a slashing-grey spark fan read as pale specks). An elemental type keeps its colour.
    if (c === 'type' && L.phys && PHYSICAL_TYPES.has(dtype)) c = L.phys;
    if (info && info.fx5) {
      if (c === 'type') return dtype;
      if (typeof c === 'string' && (info.colors || []).includes(c)) return c;
      return info.native || 'native';
    }
    if (typeof c === 'number') return nearestFxColor(hexOf(c));
    const t = c === 'type' ? dtype : c;
    if (DAMAGE_FX_COLORS[t] != null) return nearestFxColor(hexOf(DAMAGE_FX_COLORS[t]));
    if (t === 'native' || FX393_TINTS.includes(t)) return t === 'native' ? 'white' : (t === 'ash' || t === 'stone' ? 'grey' : 'black');
    return t;
  },
  /** Light enough to ADD? A dark cut added on a dark floor is no effect at all. */
  _fx393Bright(L, spec, colour) {
    if (FX393_TINTS.includes(colour)) return false;
    const hex = DAMAGE_FX_COLORS[colour] != null ? DAMAGE_FX_COLORS[colour]
      : colour === 'native' ? 0xffffff : (spec && DAMAGE_FX_COLORS[spec.dtype]) || 0xffffff;
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.42;
  },

  // ------------------------------------------------------------------------------------------- one sprite --
  /**
   * One animated sheet at a SCREEN point. o: { ox, oy, sx, sy, rot, flipX, flipY, add, alpha, depth, delay, frameMs,
   * frames, laps, fade, to: {x, y} (moves there over the play), tint, hold (ms on the last frame) }.
   */
  _fx393Sprite(key, x, y, o = {}) {
    if (!key || !this.textures || !this.textures.exists(key)) return null;
    const spr = this.add.sprite(x, y, key, 0);
    spr.setOrigin(o.ox != null ? o.ox : 0.5, o.oy != null ? o.oy : 0.5);
    spr.setScale(o.sx != null ? o.sx : 1, o.sy != null ? o.sy : (o.sx != null ? o.sx : 1));
    if (o.rot) spr.setRotation(o.rot);
    if (o.flipX) spr.setFlipX(true);
    if (o.flipY) spr.setFlipY(true);
    if (o.add) spr.setBlendMode(ADD);
    if (o.tint != null) spr.setTint(o.tint);
    spr.setDepth(o.depth != null ? o.depth : 90000);
    const a0 = o.alpha != null ? o.alpha : 1;
    spr.setAlpha(a0);
    const frames = Math.max(1, o.frames || 1), laps = Math.max(1, o.laps || 1);
    const play = frames * laps * (o.frameMs || 60), hold = o.hold || 0, ms = play + hold;
    const fade = o.fade != null ? o.fade : 0.25;
    const x0 = x, y0 = y;
    if (o.delay) spr.setVisible(false);
    this._fx393Live = (this._fx393Live || 0) + 1;
    this.tweens.addCounter({
      from: 0, to: 1, duration: ms, delay: o.delay || 0,
      onStart: () => { if (spr.active) spr.setVisible(true); },
      onUpdate: (tw) => {
        if (!spr.active) return;
        const t = tw.getValue(), el = t * ms;
        const k = Math.min(frames * laps - 1, Math.floor(el / (o.frameMs || 60)));
        spr.setFrame(el >= play ? frames - 1 : k % frames);
        if (o.to) { const u = Math.min(1, el / play); spr.setPosition(x0 + (o.to.x - x0) * u, y0 + (o.to.y - y0) * u); }
        if (fade > 0 && t > 1 - fade) spr.setAlpha(a0 * Math.max(0, (1 - t) / fade));
      },
      onComplete: () => { this._fx393Live--; if (spr.active) spr.destroy(); },
    });
    return spr;
  },

  // ------------------------------------------------------------------------------------------------ a cast --
  /** Where a cast's cone points: the caller's aim, the player's when it is the player's cast, else the nearest body. */
  _fx393Aim(wx, wy, opts) {
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

  /** A cast whose spec carries an r393 plan. Returns the first sprite drawn (or true when only bodies were masked). */
  _fx393Play(fx, wx, wy, scale = 1, opts = {}) {
    const plan = fx && fx.r393;
    if (!plan || !plan.layers || !this.add) return null;
    const ctx = { spec: fx, wx, wy, aim: this._fx393Aim(wx, wy, opts), reach: Math.max(36, (scale || 1) * 60), opts };
    let first = null;
    for (const L of plan.layers) {
      const r = this._fx393Layer(L, ctx);
      if (!first && r) first = r;
    }
    if (fx.particles && this._playFxParticles) this._playFxParticles(fx.particles, wx, wy, scale);
    this._fx393Juice(plan, wx, wy);
    this._fx393Casts = (this._fx393Casts || 0) + 1;
    this._fx393Last = { gaps: plan.gaps, kind: plan.kind, drawn: !!first };
    return first;
  },
  /** A small camera shake for a quake, an eruption or a comet -- only when it is near the player. */
  _fx393Juice(plan, wx, wy) {
    const cam = this.cameras && this.cameras.main;
    if (!cam || !plan.shake || !this.world) return;
    if (Math.hypot(this.world.x - wx, this.world.y - wy) > 500) return;
    try { cam.shake(plan.shake, 0.0035); } catch (e) { /* a shake is seasoning */ }
  },

  /** The same along a dash or blink: `at` start / end layers sit at the ends, along / travel follow the path. */
  _fx393Path(fx, x0, y0, x1, y1) {
    const plan = fx && fx.r393;
    if (!plan || !this.add) return false;
    const aim = Math.atan2(y1 - y0, x1 - x0), d = Math.hypot(x1 - x0, y1 - y0);
    let drew = false;
    for (const L of plan.layers) {
      const end = L.at === 'end';
      const ctx = { spec: fx, wx: end ? x1 : x0, wy: end ? y1 : y0, aim, reach: Math.max(30, d), path: true };
      if (this._fx393Layer(L, ctx)) drew = true;
    }
    this._fx393Paths = (this._fx393Paths || 0) + 1;
    return drew;
  },

  /** One layer of a plan. ctx: { spec, wx, wy, aim, reach, beamMs? }. */
  _fx393Layer(L, ctx) {
    const shape = L.shape || 'centre';
    // ROUND 394 -- the shapes fxMap394's rows add (copies, washes, lines, props, coins, leaves...): fxMap394Mixin.js
    if (this._fxm394Owns && this._fxm394Owns(shape)) return this._fxm394Layer(L, ctx);
    if (shape === 'feathers') return this._fx393Feathers(L, ctx);
    if (shape === 'stream') return this._fx393Stream(L, ctx);
    if (shape === 'bodies') return this._fx393Bodies(L, ctx);
    if (shape === 'conjure') return this._fx393Conjure(L, ctx);
    const info = fxFamilyInfo(L.f);
    if (!info) return null;
    const colour = this._fx393Colour(L, ctx.spec);
    const key = this._sheetKey ? this._sheetKey(L.f, colour) : null;
    if (!key) return null;
    const line = LINE_ART.has(L.f);
    const add = L.add != null ? L.add : (line && this._fx393Bright(L, ctx.spec, colour));
    const alpha = (L.alpha != null ? L.alpha : 1) * (line ? LINE_ALPHA : CAST_ALPHA) * (L.boost || 1);
    const frameMs = (info.frameMs || 60) / (L.speed || 1);
    const laps = Math.max(1, L.laps || 1, ctx.beamMs && L.laps ? Math.round(ctx.beamMs / (info.frames * frameMs)) : 0);
    const base = { frames: info.frames || 1, frameMs, laps, add, alpha, delay: L.delay || 0, tint: L.tint };
    const R = ctx.reach * (L.scale || 1);
    const cellW = info.cell, cellH = info.cellH || info.cell;
    const artW = Math.max(8, (info.bx1 != null ? info.bx1 - info.bx0 : cellW * 0.8));
    const ax = info.ax != null ? info.ax : 0.5;
    const ay = info.ay != null ? info.ay : (info.anchor === 'ground' ? 0.94 : 0.5);
    const S = (wx, wy) => isoProject(wx, wy);
    const over = (wx, wy) => isoDepth(wx, wy) + 90000;
    const P0 = S(ctx.wx, ctx.wy);
    const sv = scr(ctx.aim), svLen = Math.hypot(sv.x, sv.y) || 1;
    const lift = L.lift || 0;
    const along = (u) => ({ x: ctx.wx + Math.cos(ctx.aim) * ctx.reach * u, y: ctx.wy + Math.sin(ctx.aim) * ctx.reach * u });
    // a "standing" piece's size: the art's own size, nudged by the reach (a big ring of geysers is not a wall of them)
    const stand = clamp(Math.sqrt(ctx.reach / 70), 0.7, 1.6) * (L.scale || 1);
    const at = (wx, wy, extra = {}) => {
      const p = S(wx, wy);
      if (shape === 'flat' || info.anchor === 'flat') {
        const k = clamp((R * Math.SQRT2) / (artW / 2), 0.3, 3.2) * (shape === 'scatter' || shape === 'along' ? 0.45 : 1);
        return this._fx393Sprite(key, p.x, p.y, { ...base, ox: ax, oy: ay, sx: k, sy: k * (FLATTEN[L.f] || 1), depth: 2, ...extra });
      }
      if (info.anchor === 'ground' || info.anchor === 'beam') {
        return this._fx393Sprite(key, p.x, p.y + 4, { ...base, ox: ax, oy: info.anchor === 'ground' && info.ay == null ? 0.94 : ay, sx: stand, depth: over(wx, wy), ...extra });
      }
      return this._fx393Sprite(key, p.x, p.y - 14, { ...base, ox: 0.5, oy: 0.5, sx: stand, depth: over(wx, wy), ...extra });
    };
    switch (shape) {
      case 'flat': case 'centre': case 'ground': {
        const pt = L.at === 'end' && !ctx.path ? along(1) : { x: ctx.wx, y: ctx.wy };
        return at(pt.x, pt.y);
      }
      case 'end': { const e = along(1); return at(e.x, e.y); }
      case 'scatter': {
        let first = null;
        const n = Math.max(1, L.n || 3);
        for (let i = 0; i < n; i++) {
          const ang = i * 2.399 + ctx.aim, rad = ctx.reach * (0.25 + 0.6 * ((i * 7 + 3) % 10) / 10);
          const s = at(ctx.wx + Math.cos(ang) * rad, ctx.wy + Math.sin(ang) * rad, { delay: (L.delay || 0) + i * (L.every || 70) });
          if (!first) first = s;
        }
        return first;
      }
      case 'along': {
        let first = null;
        const n = Math.max(1, L.n || 3);
        for (let i = 0; i < n; i++) {
          const u = (i + 1) / (n + 0.5), q = along(u);
          const extra = { delay: (L.delay || 0) + i * (L.every || 70) };
          if (info.anchor !== 'flat') extra.sx = stand * (0.7 + 0.5 * u);   // a cone of cloud widens as it goes
          const s = at(q.x, q.y, extra);
          if (!first) first = s;
        }
        return first;
      }
      case 'cone': {
        // origin on the caster (at the head with `lift`), turned to the aim, stretched to the reach
        const end = S(ctx.wx + Math.cos(ctx.aim) * ctx.reach, ctx.wy + Math.sin(ctx.aim) * ctx.reach);
        const len = Math.hypot(end.x - P0.x, end.y - P0.y);
        const artLen = Math.max(8, (info.bx1 != null ? info.bx1 : cellW) - ax * cellW);
        const k = clamp((len / artLen) * (L.scale || 1), 0.35, 3.2);
        const rot = Math.atan2(sv.y / svLen, sv.x / svLen);
        return this._fx393Sprite(key, P0.x, P0.y - lift, { ...base, ox: ax, oy: ay, sx: k, sy: (sv.x < 0 ? -1 : 1) * Math.min(k, 1.7),
          rot, depth: over(ctx.wx, ctx.wy) + 2 });
      }
      case 'sweep': {
        // a crescent round the caster, turned to the aim (the tail swings through what is in front)
        const k = clamp((ctx.reach * Math.SQRT2) / (cellW * 0.45), 0.5, 2.6) * (L.scale || 1);
        const rot = Math.atan2(sv.y, sv.x);
        return this._fx393Sprite(key, P0.x, P0.y - 12, { ...base, ox: 0.5, oy: 0.5, sx: k, sy: k * 0.6 * (L.flip ? -1 : 1), rot, depth: over(ctx.wx, ctx.wy) + 1 });
      }
      case 'travel': {
        // stands on the ground and moves out along the line while it plays (a breaking wave)
        const a0 = S(ctx.wx + Math.cos(ctx.aim) * 18, ctx.wy + Math.sin(ctx.aim) * 18), e = along(1), a1 = S(e.x, e.y);
        return this._fx393Sprite(key, a0.x, a0.y + 4, { ...base, ox: ax, oy: ay, sx: stand, flipX: sv.x < 0, to: { x: a1.x, y: a1.y + 4 }, depth: over(e.x, e.y) });
      }
      case 'fall': {
        // out of the sky onto the point, turned to fall (the comet's fireflight, drawn flying right)
        const from = { x: P0.x - 70, y: P0.y - 300 };
        const rot = Math.atan2(P0.y - from.y, P0.x - from.x);
        return this._fx393Sprite(key, from.x, from.y, { ...base, alpha: Math.min(1, alpha * 2), add: true, ox: 0.68, oy: 0.5, sx: stand, rot,
          laps: 1, frameMs: 330 / (info.frames || 4), to: { x: P0.x, y: P0.y - 10 }, fade: 0.05, depth: over(ctx.wx, ctx.wy) + 3 });
      }
      case 'pour': {
        // a column turned over, falling onto the point (boiling pitch from a murder-hole): its spray lands on the ground
        const pt = L.at === 'end' ? along(1) : along(0.5);
        const p = S(pt.x, pt.y);
        // turned half round about its top (origin at the art's top edge), so the spray end lands on the point
        return this._fx393Sprite(key, p.x, p.y + 4, { ...base, alpha: Math.min(1, alpha * 1.8), ox: ax, oy: 0.02, rot: Math.PI, sx: stand, depth: over(pt.x, pt.y) });
      }
      default: return at(ctx.wx, ctx.wy);
    }
  },

  /** Loose feathers flung out from the point (the shed pinions, the phoenix's quills). */
  _fx393Feathers(L, ctx) {
    const key = 'fx393_proj_feather';
    if (!this.textures.exists(key)) return null;
    const p = isoProject(ctx.wx, ctx.wy);
    const n = Math.max(1, L.n || 6);
    let first = null;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + (i % 2 ? 0.3 : -0.2);
      const r = 30 + (ctx.reach * 0.5) * (0.5 + ((i * 7) % 5) / 8);
      const spr = this.add.image(p.x, p.y - 18, key).setScale(0.45).setRotation(ang).setDepth(isoDepth(ctx.wx, ctx.wy) + 90001);
      if (typeof L.c === 'number') spr.setTint(L.c);
      if (L.add) spr.setBlendMode(ADD);
      spr.setAlpha(0.95);
      this.tweens.add({ targets: spr, x: p.x + Math.cos(ang) * r, y: p.y - 18 + Math.sin(ang) * r * 0.5 + 14, rotation: ang + (i % 2 ? 2.4 : -2.4),
        alpha: 0, duration: 650 + (i % 3) * 120, delay: (L.delay || 0) + i * 18, ease: 'Cubic.easeOut', onComplete: () => spr.destroy() });
      if (!first) first = spr;
    }
    return first;
  },

  /** A conjured weapon: the still drops into the caster's hand, turning twice, and fades as the weapon is taken up. */
  _fx393Conjure(L, ctx) {
    const key = `fx393_proj_${L.f}`;
    if (!this.textures.exists(key)) return null;
    const p = isoProject(ctx.wx, ctx.wy);
    const spr = this.add.image(p.x + 10, p.y - 96, key).setScale(0.9).setDepth(isoDepth(ctx.wx, ctx.wy) + 90002).setAlpha(0);
    this.tweens.add({ targets: spr, y: p.y - 36, alpha: 1, rotation: Math.PI * 4, duration: 420, ease: 'Cubic.easeOut',
      onComplete: () => this.tweens.add({ targets: spr, alpha: 0, scale: 0.7, duration: 380, delay: 260, onComplete: () => spr.destroy() }) });
    return spr;
  },

  /** Quills streaming down a held beam (Unbroken Quill-Stream), one every `every` ms for the beam's hold. */
  _fx393Stream(L, ctx) {
    const key = 'fx393_proj_quill';
    if (!this.textures.exists(key)) return null;
    const total = ctx.beamMs || 600, every = L.every || 70;
    let first = null;
    for (let t = 0; t < total; t += every) {
      const jit = ((t / every) % 3 - 1) * 0.05;
      const a = ctx.aim + jit;
      const p0 = isoProject(ctx.wx + Math.cos(a) * 14, ctx.wy + Math.sin(a) * 14);
      const p1 = isoProject(ctx.wx + Math.cos(a) * ctx.reach, ctx.wy + Math.sin(a) * ctx.reach);
      const rot = Math.atan2(p1.y - p0.y, p1.x - p0.x) + 0.56;   // the quill lies tip up-right (spellFx6 PROJ393.quill.base)
      const spr = this.add.image(p0.x, p0.y - 22, key).setScale(0.55).setRotation(rot).setDepth(isoDepth(ctx.wx, ctx.wy) + 100001).setVisible(false);
      this.tweens.add({ targets: spr, x: p1.x, y: p1.y - 18, duration: 240, delay: t, onStart: () => spr.setVisible(true), onComplete: () => spr.destroy() });
      if (!first) first = spr;
    }
    return first;
  },

  /** The stone creep over every struck body near the point: a mask on the body's own silhouette (its current frame),
   *  so the grey climbs the creature rather than a square over it. */
  _fx393Bodies(L, ctx) {
    const near = [];
    const r = ctx.beamMs ? 0 : Math.max(30, Math.min(160, ctx.reach * 0.9));
    if (ctx.beamMs && this._beamLineHits) near.push(...this._beamLineHits(ctx.wx, ctx.wy, ctx.aim, ctx.reach, 34));
    else {
      for (const m of (this.monsters || [])) {
        if (m && m.alive && m.sprite && Math.hypot(m.wx - ctx.wx, m.wy - ctx.wy) <= r + ((m.type && m.type.radius) || 12)) near.push(m);
      }
    }
    let n = 0;
    for (const m of near.slice(0, 6)) if (this._fx393StoneOver(m, L, ctx)) n++;
    return n ? true : null;
  },
  _fx393StoneOver(m, L, ctx) {
    const body = m && m.sprite;
    if (!body || !body.active || !body.frame || !this.textures) return false;
    const colour = this._fx393Colour({ f: 'stonecreep', c: L.c || 'stone' }, ctx.spec);
    const stoneKey = this._sheetKey ? this._sheetKey('stonecreep', colour) : null;
    const info = fxFamilyInfo('stonecreep');
    if (!stoneKey || !info) return false;
    const fr = body.frame, src = fr.source && fr.source.image;
    const stone = this.textures.get(stoneKey).getSourceImage();
    if (!src || !stone || !fr.cutWidth) return false;
    const key = `fx393_stone_${body.texture.key}_${fr.name}_${stoneKey}`;
    const n = info.frames, w = fr.cutWidth, h = fr.cutHeight;
    if (!this.textures.exists(key)) {
      const cv = document.createElement('canvas');
      cv.width = w * n; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      for (let i = 0; i < n; i++) {
        c.globalCompositeOperation = 'source-over';
        c.drawImage(src, fr.cutX, fr.cutY, w, h, i * w, 0, w, h);
        c.globalCompositeOperation = 'source-atop';
        c.drawImage(stone, i * info.cell, 0, info.cell, info.cellH || info.cell, i * w, 0, w, h);
      }
      const tex = this.textures.addCanvas(key, cv);
      if (!tex) return false;
      for (let i = 0; i < n; i++) tex.add(i, 0, i * w, 0, w, h);
    }
    const spr = this._fx393Sprite(key, body.x, body.y, { frames: n, frameMs: info.frameMs, ox: body.originX, oy: body.originY,
      sx: body.scaleX, sy: body.scaleY, flipX: body.flipX, alpha: STONE_ALPHA, depth: body.depth + 1, hold: 650, fade: 0.3, delay: L.delay || 0,
      tint: L.tint, add: !!L.add });   // ROUND 394 -- gilding is the same creep in gold, the prism in clear blue (fxMap394.js)
    if (!spr) return false;
    // it rides the body while it plays (a petrified thing that is still being knocked about)
    const follow = () => { if (spr.active && body.active) spr.setPosition(body.x, body.y).setDepth(body.depth + 1); };
    this.events && this.events.on('postupdate', follow);
    spr.once('destroy', () => this.events && this.events.off('postupdate', follow));
    this._fx393Stoned = (this._fx393Stoned || 0) + 1;
    return true;
  },

  // ----------------------------------------------------------------------------------------------- the beam --
  /** The sheet a held beam is drawn with, when its gap names one (the gorgon's stare: beamthin in grey). */
  _fx393BeamOverride(a) {
    const plan = fxArt393For(a);
    return plan && plan.override ? plan.override : null;
  },
  /** A held beam's own art laid on it: rings rolling down a roar, ink or steam billowing along a jet, sparks at the
   *  muzzle, quills streaming, stone creeping over what it touches. Called once, as the beam is drawn. */
  _fx393BeamExtra(st, ms) {
    if (!st || !st.a || !this.world || !this.player) return 0;
    const plan = fxArt393For(st.a);
    if (!plan || plan.kind !== 'beam') return 0;
    const spec = { dtype: damageFxFor(st.a), r393: plan };
    const ctx = { spec, wx: this.world.x, wy: this.world.y, aim: this.player.aimAngle || 0, reach: st.len || 260, beamMs: ms };
    let n = 0;
    for (const L of plan.layers) if (this._fx393Layer(L, ctx)) n++;
    this._fx393Beams = (this._fx393Beams || 0) + 1;
    return n;
  },

  // ------------------------------------------------------------------------------------------- projectiles --
  /** A projectile still as it leaves the hand: its tint, a starting turn for a spinning one, and its trail. */
  _flight393Init(sprite, flight) {
    if (!sprite || !flight || !flight.r393) return;
    if (flight.tint != null && sprite.setTint) sprite.setTint(flight.tint);
    if (flight.spin) sprite.setRotation(Math.random() * Math.PI * 2);
    const st = { t: 0, puffT: 0, trail: null };
    const tr = flight.trail;
    if (tr && tr.f && !tr.puff) {
      const key = this._sheetKey ? this._sheetKey(tr.f, tr.c) : null;
      if (key) {
        st.trail = this.add.sprite(sprite.x, sprite.y, key, 0).setOrigin(0.68, 0.5).setScale(tr.scale || 0.6)
          .setBlendMode(ADD).setAlpha(0.85).setDepth(sprite.depth - 1);
        st.trailInfo = fxFamilyInfo(tr.f);
      }
    }
    sprite._r393 = st;
    sprite.once('destroy', () => { if (st.trail && st.trail.active) st.trail.destroy(); });
    this._flight393Count = (this._flight393Count || 0) + 1;
    if (flight.r394 && this._flight394Init) this._flight394Init(sprite, flight);   // ROUND 394 -- nearest pixels, the fan, the impact burst
    if (flight.fxmap && this._fxm394FlightInit) this._fxm394FlightInit(sprite, flight);   // ROUND 394 -- a hue cycle, a swell, a flat ring
  },
  /** Every frame of its flight: spin, and the trail behind it (a flame that follows, or motes shed as it goes). */
  _flight393Tick(pr, dt) {
    const spr = pr && pr.sprite, fl = pr && pr.flight;
    if (!spr || !spr.active || !fl) return;
    if (!spr._r393) this._flight393Init(spr, fl);
    const st = spr._r393;
    st.t += dt * 1000;
    if (fl.spin) spr.rotation += fl.spin * dt;
    if (fl.fxmap && this._fxm394FlightTick) this._fxm394FlightTick(pr, dt, st);   // ROUND 394 -- fxMap394Mixin
    const sv = { x: pr.vx - pr.vy, y: (pr.vx + pr.vy) / 2 };
    const sl = Math.hypot(sv.x, sv.y) || 1;
    if (st.trail && st.trail.active) {
      const inf = st.trailInfo;
      st.trail.setPosition(spr.x - (sv.x / sl) * 6, spr.y - (sv.y / sl) * 6).setRotation(Math.atan2(sv.y, sv.x)).setDepth(spr.depth - 1);
      if (inf) st.trail.setFrame(Math.floor(st.t / (inf.frameMs || 70)) % (inf.frames || 1));
    }
    const tr = fl.trail;
    if (tr && tr.puff) {
      st.puffT -= dt * 1000;
      if (st.puffT <= 0) {
        st.puffT = 55;
        const key = this._sheetKey ? this._sheetKey(tr.f, tr.c) : null;
        const inf = fxFamilyInfo(tr.f);
        if (key && inf) {
          this._fx393Sprite(key, spr.x - (sv.x / sl) * 10, spr.y - (sv.y / sl) * 10, { frames: inf.frames, frameMs: 30, sx: (tr.scale || 0.8) * 0.8,
            add: true, alpha: 0.75, depth: spr.depth - 1, fade: 0.6 });
        }
      }
    }
  },

  /** Fetch, in the background, the damage-type cuts a kit's covered abilities will cast (as _prefetchKitFx does for fx5). */
  _fx393Prefetch(known) {
    let n = 0;
    for (const k of Object.keys(known || {})) {
      const e = known[k], a = e && e.ability;
      const plan = a && fxArt393For(a);
      if (!plan) continue;
      const spec = { dtype: damageFxFor(a) };
      for (const L of plan.layers) {
        const info = fxFamilyInfo(L.f);
        if (!info || !info.fx5) continue;
        const want = `fx_${L.f}_${this._fx393Colour(L, spec)}`;
        if (!this.textures.exists(want) && this._wantFx5) { this._wantFx5(want); n++; }
      }
    }
    return n;
  },

  // --------------------------------------------------------------------------------------------------- props --
  /** A coin on the ground: the rank's coin, turning (r388: "coins lying on the ground after a kill"). Null for a rank
   *  with no coin ("there is no diamond-rank coin"); the caller draws its disc. */
  _coin393Sprite(x, y, rank) {
    const key = coinArtKey(rank);
    if (!key || !this.textures || !this.textures.exists(key)) return null;
    const anim = `${key}_turn`;
    if (!this.anims.exists(anim)) {
      this.anims.create({ key: anim, frames: this.anims.generateFrameNumbers(key, { start: 0, end: PROPS393.coinSpin.frames - 1 }),
        frameRate: 1000 / (PROPS393.coinSpin.frameMs || 90), repeat: -1, repeatDelay: 900 });
    }
    const spr = this.add.sprite(x, y, key, 0).setScale(0.5);
    spr.play({ key: anim, delay: Math.floor(Math.random() * 900) });
    return spr;
  },

  /** A mark of a contract's quarry trail: a pair of paw prints (fore and hind) turned to the way the quarry went.
   *  Lies on the ground (a container turned in world space and squashed by the iso view). Null when not loaded. */
  _trail393Mark(q, i) {
    const key = 'fx393_pawprints';
    if (!q || !q.trail || !this.textures || !this.textures.exists(key)) return null;
    const p = q.trail[i], nx = q.trail[i + 1] || p, pv = q.trail[i - 1] || p;
    const dx = (nx.x - pv.x) || 1, dy = (nx.y - pv.y) || 0;
    const ang = Math.atan2(dy, dx);
    const pr = isoProject(p.x, p.y);
    const box = this.add.container(pr.x, pr.y);
    const side = i % 2 ? 1 : -1;
    // toes point UP the cell: turned onto the heading (+x) by +90 degrees, then the iso ground matrix (rotate 45, squash)
    const mk = (fr, ox, oy) => this.add.image(ox, oy, key, fr).setRotation(ang + Math.PI / 4 + Math.PI / 2).setScale(0.55);
    const ux = Math.cos(ang + Math.PI / 4), uy = Math.sin(ang + Math.PI / 4), vx = -uy, vy = ux;
    box.add(mk(i % 2 ? 1 : 0, ux * 7 + vx * 5 * side, uy * 7 + vy * 5 * side));      // a fore print
    box.add(mk(i % 2 ? 3 : 2, -ux * 7 - vx * 5 * side, -uy * 7 - vy * 5 * side));    // and a hind one behind it
    box.setScale(Math.SQRT2, Math.SQRT2 / 2);
    box.setDepth(isoDepth(p.x, p.y) - 1000);
    return box;
  },

  /** The rite book hanging open over the reader, its pages turning (r388: "the book that floats over the caster during
   *  a skill-book rite"). True when drawn; the caller then skips its drawn cover and pages. */
  _riteBook393(bx, by, col, done) {
    const key = 'fx393_rite_book';
    if (!this.textures || !this.textures.exists(key)) return false;
    let spr = this._bookRite393;
    if (!spr || !spr.active) {
      const anim = 'fx393_rite_book_turn';
      if (!this.anims.exists(anim)) {
        this.anims.create({ key: anim, frames: this.anims.generateFrameNumbers(key, { start: 0, end: PROPS393.rite_book.frames - 1 }),
          frameRate: 1000 / (PROPS393.rite_book.frameMs || 120), repeat: -1 });
      }
      spr = this._bookRite393 = this.add.sprite(bx, by, key, 0).setScale(0.62);
      spr.play(anim);
    }
    spr.setPosition(bx, by).setDepth(this._bookRiteTop ? this._bookRiteTop.depth + 1 : 90000).setAlpha(0.85 + 0.15 * done);
    return true;
  },

  /** The lightning rod and the force rod a canon ability plants, and their tethers to what they hold: the rod sheet
   *  standing on its foot, the tether sheet stretched rod-to-body. True when drawn (the caller skips its lines). */
  _rod393(kind, rod, bodies, now) {
    const rodKey = 'fx393_lightning_rod';
    if (!rod || !this.textures || !this.textures.exists(rodKey)) return false;
    const col = kind === 'force' ? 'blue' : 'yellow';
    const tKey = this._sheetKey ? this._sheetKey('beamtether', col) : null;
    const tInfo = fxFamilyInfo('beamtether');
    this._rods393 = this._rods393 || {};
    let R = this._rods393[kind];
    if (!R || !R.spr || !R.spr.active) {
      R = this._rods393[kind] = { spr: this.add.sprite(0, 0, rodKey, 0).setOrigin(0.5, 0.96), tethers: [] };
      if (kind === 'force') R.spr.setTint(0x9fe8f2);
    }
    R.seen = now;
    const o = isoProject(rod.x, rod.y);
    const P = PROPS393.lightning_rod;
    R.spr.setPosition(o.x, o.y).setDepth(isoDepth(rod.x, rod.y) + 5).setFrame(Math.floor(now / (P.frameMs || 80)) % P.frames).setVisible(true);
    // the tethers: one sheet per body, from the rod's tip (lightning hops body to body along the chain)
    const list = (bodies || []).filter(m => m && (m.alive !== false));
    const fr = tInfo ? Math.floor(now / (tInfo.frameMs || 80)) % tInfo.frames : 0;
    let px = o.x, py = o.y - 84;
    list.forEach((m, i) => {
      if (!tKey || !tInfo) return;
      let t = R.tethers[i];
      if (!t || !t.active) { t = R.tethers[i] = this.add.sprite(0, 0, tKey, 0).setOrigin(tInfo.bx0 / tInfo.cell, tInfo.oy).setBlendMode(ADD); }
      if (t.texture.key !== tKey) t.setTexture(tKey, 0);
      const q = isoProject(m.wx, m.wy);
      const ex = q.x, ey = q.y - 18;
      const dx = ex - px, dy = ey - py, len = Math.hypot(dx, dy) || 1;
      t.setPosition(px, py).setRotation(Math.atan2(dy, dx)).setScale(len / Math.max(1, tInfo.bx1 - tInfo.bx0), dx < 0 ? -0.9 : 0.9)
        .setFrame(fr).setVisible(true).setAlpha(kind === 'force' ? 0.75 : 0.95).setDepth(isoDepth(Math.max(rod.x, m.wx), Math.max(rod.y, m.wy)) + 30000);
      if (kind === 'lightning') { px = ex; py = ey; }
    });
    for (let i = list.length; i < R.tethers.length; i++) if (R.tethers[i] && R.tethers[i].active) R.tethers[i].setVisible(false);
    return true;
  },
  /** Drop a rod (and its tethers) that is no longer planted. Called at the top of every canon draw. */
  _rod393Sweep(s) {
    if (!this._rods393) return;
    for (const kind of ['lightning', 'force']) {
      const R = this._rods393[kind];
      if (!R) continue;
      const live = kind === 'lightning' ? s && s.lightningRod : s && s.forceRod;
      if (live) continue;
      if (R.spr && R.spr.active) R.spr.destroy();
      for (const t of R.tethers) if (t && t.active) t.destroy();
      delete this._rods393[kind];
    }
  },

  /** The clockwork rite's pendulum: the sheet's swing hanging from its top-centre, quicker as the rite builds.
   *  Through the rite's own sprite pool (_stageArt), so its fade and clear take it. True when drawn. */
  _pendulum393(s, i, px, py, I, now, k) {
    const key = 'fx393_pendulum';
    if (!this._stageArt || !this.textures || !this.textures.exists(key)) return false;
    const P = PROPS393.pendulum;
    const sh = { key, frames: P.frames, ms: (P.frameMs || 80) / (1 + 1.4 * k), cell: P.cell, cellH: P.cellH };
    this._stageArt(s, i, sh, px, py - 4, { ox: 0.5, oy: 0.04, sx: 0.62, depth: s.d0 != null ? s.d0 - 6 : 2, alpha: Math.min(1, 0.35 + I), t: now });
    return true;
  },

  /** The legendary beam (and every canon beam drawn through it) as the beamlegend sheet stretched between the hand and
   *  where it lands. A held beam keeps one sprite, re-aimed each frame and dropped when the frames stop coming; a tap
   *  flashes once. True when drawn. */
  _legendBeam393(t, color, angle, range, flash) {
    if (!this.world || !this.add) return false;
    const col = nearestFxColor(typeof color === 'number' ? hexOf(color) : (color || '#9575cd'));
    const key = this._sheetKey ? this._sheetKey('beamlegend', col) : null;
    const info = fxFamilyInfo('beamlegend');
    if (!key || !info) return false;
    const bx = t ? t.wx : this.world.x + Math.cos(angle) * range;
    const by = t ? t.wy : this.world.y + Math.sin(angle) * range;
    const a = isoProject(this.world.x, this.world.y), b = isoProject(bx, by);
    const ax = a.x, ay = a.y - 26, ex = b.x, ey = b.y - 20;
    const dx = ex - ax, dy = ey - ay, len = Math.hypot(dx, dy) || 1;
    const span = Math.max(1, info.bx1 - info.bx0);
    const depth = isoDepth(Math.max(this.world.x, bx), Math.max(this.world.y, by)) + 30000;
    if (flash) {
      const spr = this._fx393Sprite(key, ax, ay, { ox: info.bx0 / info.cell, oy: info.oy, sx: len / span, sy: dx < 0 ? -0.55 : 0.55,
        rot: Math.atan2(dy, dx), add: true, frames: info.frames, frameMs: 26, alpha: 0.95, fade: 0.5, depth });
      return !!spr;
    }
    let spr = this._legendSpr393;
    if (!spr || !spr.active) {
      spr = this._legendSpr393 = this.add.sprite(ax, ay, key, 0).setOrigin(info.bx0 / info.cell, info.oy).setBlendMode(ADD);
      this._legendWatch393();
    }
    if (spr.texture.key !== key) spr.setTexture(key, 0);
    const now = (this.time && this.time.now) || 0;
    spr.setPosition(ax, ay).setRotation(Math.atan2(dy, dx)).setScale(len / span, (dx < 0 ? -1 : 1) * (0.62 + 0.06 * Math.sin(now / 70)))
      .setFrame(Math.floor(now / (info.frameMs || 63)) % info.frames).setDepth(depth).setAlpha(0.95).setVisible(true);
    this._legendSeen393 = now;
    this._beamFrames = (this._beamFrames || 0) + 1;
    return true;
  },
  /** A held beam's sprite goes when its frames stop coming (the channel ended, the button came up). */
  _legendWatch393() {
    if (this._legendWatching393 || !this.events) return;
    this._legendWatching393 = true;
    this.events.on('postupdate', () => {
      const spr = this._legendSpr393;
      if (!spr || !spr.active) return;
      const now = (this.time && this.time.now) || 0;
      if (now - (this._legendSeen393 || 0) > 90) { spr.destroy(); this._legendSpr393 = null; }
    });
  },

  /** The Eclipse beam: the legend sheet twice -- a wide orange glow and a silver body with its white core -- in one
   *  container on the beam record (`b.g`), so the beam's own end fades and drops it. True when drawn. */
  _eclipseBeam393(b, ang, beamRange) {
    if (!b || !this.world || !this.add) return false;
    const kO = this._sheetKey ? this._sheetKey('beamlegend', 'orange') : null;
    const kS = this._sheetKey ? this._sheetKey('beamlegend', 'silver') : null;
    const info = fxFamilyInfo('beamlegend');
    if (!kO || !kS || !info) return false;
    if (b.g && !b.g.list) { b.g.destroy(); b.g = null; }   // the drawn graphics from before the sheet loaded
    if (!b.g || !b.g.active) {
      const c = this.add.container(0, 0);
      const mk = (k) => this.add.sprite(0, 0, k, 0).setOrigin(info.bx0 / info.cell, info.oy).setBlendMode(ADD);
      c.add([mk(kO), mk(kS)]);
      b.g = c;
    }
    const a0 = isoProject(this.world.x, this.world.y);
    const e0 = isoProject(this.world.x + Math.cos(ang) * beamRange, this.world.y + Math.sin(ang) * beamRange);
    const ax = a0.x, ay = a0.y - 26, dx = e0.x - ax, dy = (e0.y - 20) - ay, len = Math.hypot(dx, dy) || 1;
    const span = Math.max(1, info.bx1 - info.bx0), flip = dx < 0 ? -1 : 1;
    const now = (this.time && this.time.now) || 0, fr = Math.floor(now / (info.frameMs || 63)) % info.frames;
    const breathe = 0.85 + 0.15 * Math.sin(now / 60);
    b.g.setPosition(ax, ay).setRotation(Math.atan2(dy, dx));
    b.g.list[0].setScale(len / span, flip * 1.6 * breathe).setFrame(fr).setAlpha(0.6);
    b.g.list[1].setScale(len / span, flip * 0.85).setFrame((fr + 5) % info.frames).setAlpha(0.95);
    b.g.setDepth(isoDepth(Math.max(this.world.x, this.world.x + Math.cos(ang) * beamRange), Math.max(this.world.y, this.world.y + Math.sin(ang) * beamRange)) + 30000);
    return true;
  },
};
