// ===========================================================================
// ROUND 394 -- THE r392 TURRET / TRAP BODIES AND THE BODIES CASTS SHOW, IN THE WORLD (src/data/creatureArtR394.js is
// the data; the forty new monster bodies need no code here: round 393's remap reads the new rows).
//
//   "Replace the generic turret/trap body for every row in `serves`, extending round 393's turret path ... Merged
//    bodies are tinted per confluence ... Give them element tints too" -- "gun_drone: orbits the player" --
//   "force_fist: the force construct. Its knot is the one-off agent's key fx394_force_knot" -- "straw_man: scarecrows,
//    the straw double and the base of the wicker man".
//
// Art only, like round 393's mixin: every entry point answers "draw it like this" or null, and the caller keeps its
// old drawing for null. The props reuse round 393's rise / sink (`_r393Rise`) and carry the `_r393` marker, so
// `_tickSummons` leaves their frames to their own loop.
//
//   _r394Preload()                    the 51 props as drawn (small; their tints load on first use)
//   _r394PropSummonSprite(a, p, kind) a turret or trap that has its own body (_spawnSummon)
//   _r394SummonPropSprite(a, p)       a called creature drawn as a prop / one-off sheet (Kinetic Wisp's knot, ...)
//   _r394CastArt(a)                   lanterns, snares, banners, nests set down by a cast; the owl's and lark's
//                                     stoops, the koi, the heron, the toad, the straw double, the wicker man
//   _r394Tick(dt)                     companions (brush, crown, coins), worn bodies (the gun drone's orbit, the shrine
//                                     lantern, the raised banner, the gremlin mob), toads
//   _r394BodySprite(...)              the harness's door: one of the new bodies at a screen point, any state / facing
// ===========================================================================
import { isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { MONSTER_ART } from '../data/monsterArt.js';
import { r393ShadeFor } from '../data/creatureArtR393.js';
import {
  R394_PROPS, R394_PROP_FRAMES, R394_PROP_FRAME_MS, r394PropUseFor, r394PropTint, r394PropScale, r394SummonPropFor,
  r394CastBodyFor, R394_WORN, R394_PROP_USES, R394_CAST_BODIES,
} from '../data/creatureArtR394.js';
import { fx394Key, fx394SheetFor } from '../data/fxArt394.js';

const DIR = './public/assets/creatures/props';
const WORN_CHECK_S = 0.5;
const DRONE_ORBIT = 36;
const DRONE_LIFT = 34;
const COIN_EVERY_MS = 150;

export const CreatureArtR394Mixin = {
  // ---- props ---------------------------------------------------------------------------------------------------
  _r394Preload() {
    for (const [k, d] of Object.entries(R394_PROPS)) {
      this.load.spritesheet(`r394_${k}`, `${DIR}/${k}.png`, { frameWidth: d.w, frameHeight: d.h });
    }
  },

  /** The loaded key for `prop` in `tint` (null = as drawn); fetches a tint it lacks and answers the art as drawn
   *  meanwhile (the sprite is re-skinned when it lands). Null only when not even that is loaded. */
  _r394PropKey(prop, tint) {
    const d = R394_PROPS[prop];
    if (!d) return null;
    const nat = `r394_${prop}`;
    const want = tint ? `${nat}_${tint}` : nat;
    if (this.textures.exists(want)) return want;
    this._r394Pending = this._r394Pending || new Set();
    if (!this._r394Pending.has(want)) {
      this._r394Pending.add(want);
      try {
        this.load.spritesheet(want, `${DIR}/${tint ? `${prop}_${tint}` : prop}.png`, { frameWidth: d.w, frameHeight: d.h });
        this.load.once(`filecomplete-spritesheet-${want}`, () => {
          this._r394Pending.delete(want);
          for (const sp of (this._r394Live || [])) {
            if (sp && sp.scene && sp._r393 && sp._r393.want === want) { sp.setTexture(want); this._r394Play(sp, want); }
          }
        });
        if (!this.load.isLoading()) this.load.start();
      } catch (e) { /* the art as drawn stands in */ }
    }
    return this.textures.exists(nat) ? nat : null;
  },

  _r394Play(sp, key) {
    const ak = `${key}_loop`;
    if (!this.anims.exists(ak)) {
      this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: R394_PROP_FRAMES - 1 }),
        frameRate: 1000 / R394_PROP_FRAME_MS, repeat: -1 });
    }
    sp.play({ key: ak, startFrame: Math.floor(Math.random() * R394_PROP_FRAMES) });
  },

  /** A looping prop, its foot on (x, y). Null when the art is not loaded. */
  _r394PropSprite(prop, tint, x, y, scale = 1) {
    const key = this._r394PropKey(prop, tint);
    if (!key) return null;
    const sp = this.add.sprite(x, y, key, 0);
    sp.setOrigin(0.5, 0.96);
    sp.setScale(scale);
    sp._r393 = { prop, tint, want: tint ? `r394_${prop}_${tint}` : `r394_${prop}`, r394: true };
    this._r394Play(sp, key);
    this._r394Live = (this._r394Live || []).filter(s => s && s.scene);
    this._r394Live.push(sp);
    return sp;
  },

  /** Something drawn with a parent: it follows the parent's position, depth, alpha and life. */
  _r394Companion(parent, child, { dx = 0, dy = 0, depth = 1, coins = false } = {}) {
    this._r394Comp = (this._r394Comp || []).filter(c => c.parent && c.parent.scene);
    this._r394Comp.push({ parent, child, dx, dy, depth, coins, coinT: 0 });
    if (parent.once) parent.once('destroy', () => { if (child && child.scene) child.destroy(); });
  },

  _r394Element(a) {
    return (this._specElement && this._specElement(a)) || (a && a.element) || null;
  },

  /** A turret or trap whose sheet entry has its own body. `kind` is the summon's kind. */
  _r394PropSummonSprite(a, p, kind) {
    const use = r394PropUseFor(a);
    if (!use || (use.as && use.as !== kind)) return null;
    const tint = r394PropTint(use, this._r394Element(a));
    const scale = r394PropScale(use.prop, kind);
    const sp = this._r394PropSprite(use.prop, tint, p.x, p.y, scale);
    if (!sp) return null;
    sp._r393.turret = kind === 'turret';
    this._r393Rise(sp, kind === 'trap' ? 180 : 420);
    const d = R394_PROPS[use.prop];
    if (use.brush) {
      // "the hidden one (draw brush in front)": a briar bush low across the ballista's front
      const b = this._r394PropSprite('briar_bush', 'verdant', p.x, p.y, scale * 1.35);
      if (b) { b.setOrigin(0.5, 0.75); this._r394Companion(sp, b, { dx: 6, dy: 4, depth: 2 }); }
      const b2 = this._r394PropSprite('briar_bush', null, p.x, p.y, scale * 1.15);
      if (b2) { b2.setOrigin(0.5, 0.75); b2.setFlipX(true); this._r394Companion(sp, b2, { dx: -12, dy: 6, depth: 3 }); }
    }
    if (use.crown) {
      // "meteor beacon = engine brazier flame on top": the brazier stands on the spire's tip
      const c = this._r394PropSprite(use.crown, r394PropTint({ prop: use.crown }, this._r394Element(a)), p.x, p.y, scale * 0.55);
      if (c) this._r394Companion(sp, c, { dy: -(d.h * scale * 0.92), depth: 1 });
    }
    if (use.coins) this._r394Companion(sp, null, { coins: true });
    if (use.crownBody) {
      // the Guard Tower's household knight keeps watch on the tower's top (fetched on the first cast)
      const fam = use.crownBody;
      const k = this._r394BodySprite(fam, r393ShadeFor(fam, null, this._r394Element(a)), p.x, p.y, 'idle', 'south', 0, 0.55);
      if (k) this._r394Companion(sp, k, { dy: -(d.h * scale * 0.78), depth: 1 });
    }
    return sp;
  },

  /** A called creature that is a prop or a one-off sheet, not a monster atlas. The summon keeps `art` null. */
  _r394SummonPropSprite(a, p) {
    const s = r394SummonPropFor(a);
    if (!s) return null;
    if (s.fx) {
      const key = fx394Key(s.fx, this._r394Element(a) || 'native');
      if (!key) return null;
      if (!this.textures.exists(key)) { this._r394LoadFx(key); return null; }   // the first cast is the stand-in
      const info = fx394SheetFor(key) || { frames: 4, ms: 100 };
      const sp = this.add.sprite(p.x, p.y, key, 0);
      sp.setOrigin(0.5, 1.6);   // a hovering knot: well off the ground
      sp.setScale(s.scale || 2);
      const ak = `${key}_r394loop`;
      if (!this.anims.exists(ak)) {
        this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: (info.frames || 4) - 1 }),
          frameRate: 1000 / (info.ms || 100), repeat: -1 });
      }
      sp.play(ak);
      sp._r393 = { fx: key, r394: true };
      return sp;
    }
    const sp = this._r394PropSprite(s.prop, null, p.x, p.y, r394PropScale(s.prop, 'turret'));
    if (!sp) return null;
    this._r393Rise(sp, 360);
    return sp;
  },

  _r394LoadFx(key) {
    const info = fx394SheetFor(key);
    if (!info || this.textures.exists(key)) return;
    this._r394Pending = this._r394Pending || new Set();
    if (this._r394Pending.has(key)) return;
    this._r394Pending.add(key);
    try {
      this.load.spritesheet(key, info.url, { frameWidth: info.cell, frameHeight: info.cellH || info.cell });
      if (!this.load.isLoading()) this.load.start();
    } catch (e) { /* stand-in */ }
  },

  /** A prop that rises where it is set down, stays `holdMs` and sinks (round 393's burst, from this folder). */
  _r394Burst(prop, tint, wx, wy, { scale = 1, riseMs = 260, holdMs = 2000, sinkMs = 260, delay = 0, flipX = false } = {}) {
    const go = () => {
      const p = isoProject(wx, wy);
      const sp = this._r394PropSprite(prop, tint, p.x, p.y, scale);
      if (!sp) return;
      sp.setFlipX(flipX);
      sp.setDepth(isoDepth(wx, wy) + 4);
      this._r393Rise(sp, riseMs, false, () => {
        this.time.delayedCall(holdMs, () => this._r393Rise(sp, sinkMs, true, () => sp.destroy()));
      });
    };
    if (delay > 0) this.time.delayedCall(delay, go); else go();
  },

  // ---- cast art --------------------------------------------------------------------------------------------------
  _r394CastArt(a) {
    if (!a) return;
    try {
      const use = r394PropUseFor(a);
      if (use && use.as === 'cast') this._r394CastProps(a, use);
      const body = r394CastBodyFor(a);
      if (body && body.kind !== 'drone' && body.kind !== 'mob') this._r394CastBody(a, body);
    } catch (e) { console.warn('[r394] cast art', a && a.name, e && e.message); }
  },

  _r394Aim(a, range = 220) {
    const px = this.world.x, py = this.world.y;
    const ang = (this.player && this.player.aimAngle) || 0;
    const r = Math.min(360, a.range || range);
    const tgt = (this._nearestMonsterInCone && this._nearestMonsterInCone(r, Math.PI / 2))
      || (this._nearestMonsterWithin && this._nearestMonsterWithin(r)) || null;
    return { px, py, ang, r, tgt, tx: tgt ? tgt.wx : px + Math.cos(ang) * r * 0.6, ty: tgt ? tgt.wy : py + Math.sin(ang) * r * 0.6 };
  },

  _r394CastProps(a, use) {
    const tint = r394PropTint(use, this._r394Element(a));
    const scale = r394PropScale(use.prop, 'turret');
    const hold = Math.max(800, ((a.fieldDuration || a.wallDuration || a.duration || 0) * 1000) || use.ms || 3000) - 300;
    const { px, py, ang, tx, ty } = this._r394Aim(a, 140);
    if (use.layout === 'self') {
      this._r394Burst(use.prop, tint, px + 18, py - 10, { scale, holdMs: hold });
    } else if (use.layout === 'one') {
      this._r394Burst(use.prop, tint, tx, ty, { scale, holdMs: hold });
    } else if (use.layout === 'ring') {
      const rad = a.radius || a.explodeRadius || 90;
      for (let i = 0; i < 6; i++) {
        const th = (i / 6) * Math.PI * 2;
        this._r394Burst(use.prop, tint, px + Math.cos(th) * rad, py + Math.sin(th) * rad, { scale: scale * 0.85, delay: i * 50, holdMs: hold });
      }
    } else if (use.layout === 'line') {
      const len = a.wallLength || 180;
      const n = Math.max(3, Math.round(len / 45));
      for (let i = 0; i < n; i++) {
        const d = 40 + (i / Math.max(1, n - 1)) * len;
        this._r394Burst(use.prop, tint, px + Math.cos(ang) * d, py + Math.sin(ang) * d, { scale: scale * 0.85, delay: i * 60, holdMs: hold,
          flipX: i % 2 === 1 });
      }
    }
  },

  /** One of the new bodies at a screen point: the frame of `state` ('idle' | 'run' | 'attack'), `facing`, `step`.
   *  Null (and the family is fetched) when its sheets are not here yet. */
  _r394BodySprite(family, shadeName, x, y, state = 'idle', facing = 'south', step = 0, scale = 1) {
    const art = MONSTER_ART[family];
    if (!art) return null;
    if (this._ensureFamilyArt) this._ensureFamilyArt(family);
    const key = this._monsterTexture(family, state);
    if (!this.textures.exists(key)) return null;
    const shade = Math.max(0, art.shades.indexOf(shadeName));
    const per = state === 'idle' ? 1 : (state === 'attack' ? art.attackFrames : art.runFrames);
    const sp = this.add.sprite(x, y, key, shade * 8 * per + dirRow(facing) * per + (step % per));
    sp.setOrigin(0.5, art.originY || 0.85);
    sp.setScale(art.displayScale * 0.8 * scale);
    sp._r394Body = { family, shade, per, state };
    return sp;
  },
  _r394SetBodyFrame(sp, state, facing, step) {
    const b = sp && sp._r394Body;
    if (!b || !sp.scene) return;
    const art = MONSTER_ART[b.family];
    const per = state === 'idle' ? 1 : (state === 'attack' ? art.attackFrames : art.runFrames);
    const key = this._monsterTexture(b.family, state);
    if (!this.textures.exists(key)) return;
    if (sp.texture.key !== key) sp.setTexture(key);
    sp.setFrame(b.shade * 8 * per + dirRow(facing) * per + (Math.floor(step) % per));
  },

  _r394CastBody(a, body) {
    const fam = body.family;
    const art = MONSTER_ART[fam];
    if (!art) return;
    const ready = this._familyArtReady ? this._familyArtReady(fam) : this.textures.exists(this._monsterTexture(fam, 'run'));
    if (!ready) {   // the first cast fetches the body; the ability itself is unchanged
      if (this._whenFamilyArt) this._whenFamilyArt(fam).then((ok) => { if (ok && this.scene && this.world) this._r394CastBodyNow(a, body); });
      return;
    }
    this._r394CastBodyNow(a, body);
  },

  _r394CastBodyNow(a, body) {
    const fam = body.family;
    const shade = r393ShadeFor(fam, null, this._r394Element(a));
    const aim = this._r394Aim(a, 240);
    const n = body.count || 1;
    const run = (fn) => { try { fn(); } catch (e) { /* art only */ } };
    if (body.kind === 'stoop' || body.kind === 'swim') {
      for (let i = 0; i < n; i++) {
        this.time.delayedCall(i * 110, () => run(() => this._r394Flyby(fam, shade, aim, body.kind === 'stoop', i)));
      }
    } else if (body.kind === 'glide') {
      this._r394Glide(fam, shade, aim);
    } else if (body.kind === 'stab') {
      this._r394Stab(fam, shade, aim);
    } else if (body.kind === 'toad') {
      this._r394Toad(fam, shade, aim, body.ms || 3000);
    } else if (body.kind === 'double' || body.kind === 'wicker') {
      this._r394Stand(fam, body.kind === 'wicker' ? 'ember' : shade, body);
    }
  },

  /** The owl / lark stoops out of the air onto the target; the koi swims out along the aim. */
  _r394Flyby(fam, shade, aim, stoop, i) {
    const jit = (i - 0.5) * 26;
    const sx = aim.px - Math.cos(aim.ang) * 20, sy = aim.py - Math.sin(aim.ang) * 20;
    const ex = aim.tx + Math.sin(aim.ang) * jit, ey = aim.ty - Math.cos(aim.ang) * jit;
    const facing = facingFromMove(ex - sx, ey - sy) || 'south';
    const p0 = isoProject(sx, sy);
    const sp = this._r394BodySprite(fam, shade, p0.x, p0.y, 'run', facing, 0);
    if (!sp) return;
    sp.setAlpha(stoop ? 0.95 : 0.85);
    const st = { t: 0 };
    const lift0 = stoop ? 70 : 18, lift1 = stoop ? 8 : 14;
    this.tweens.add({ targets: st, t: 1, duration: stoop ? 380 : 460, ease: stoop ? 'Quad.easeIn' : 'Linear',
      onUpdate: () => {
        if (!sp.scene) return;
        const wx = sx + (ex - sx) * st.t, wy = sy + (ey - sy) * st.t;
        const p = isoProject(wx, wy);
        sp.setPosition(p.x, p.y - (lift0 + (lift1 - lift0) * st.t));
        sp.setDepth(isoDepth(wx, wy) + 30);
        this._r394SetBodyFrame(sp, 'run', facing, this.time.now / 60);
      },
      onComplete: () => {
        if (!sp.scene) return;
        // the strike, then away
        const at = { t: 0 };
        this.tweens.add({ targets: at, t: 1, duration: 300,
          onUpdate: () => this._r394SetBodyFrame(sp, 'attack', facing, at.t * 7.99),
          onComplete: () => this.tweens.add({ targets: sp, alpha: 0, y: sp.y - (stoop ? 30 : 0), duration: 220, onComplete: () => sp.destroy() }) });
      } });
  },

  /** A dash: the bird flies beside you for its length. */
  _r394Glide(fam, shade, aim) {
    const facing = facingFromMove(Math.cos(aim.ang), Math.sin(aim.ang)) || 'south';
    const sp = this._r394BodySprite(fam, shade, 0, 0, 'run', facing, 0);
    if (!sp) return;
    const st = { t: 0 };
    this.tweens.add({ targets: st, t: 1, duration: 520,
      onUpdate: () => {
        if (!sp.scene) return;
        const p = isoProject(this.world.x, this.world.y);
        sp.setPosition(p.x + Math.sin(aim.ang) * 18, p.y - 46);
        sp.setDepth(isoDepth(this.world.x, this.world.y) + 30);
        sp.setAlpha(st.t > 0.7 ? (1 - st.t) / 0.3 : 1);
        this._r394SetBodyFrame(sp, 'run', facing, this.time.now / 60);
      },
      onComplete: () => sp.destroy() });
  },

  /** "Heron Waits": the heron stands beside the target and stabs. */
  _r394Stab(fam, shade, aim) {
    const dx = aim.px - aim.tx, dy = aim.py - aim.ty, d = Math.max(1, Math.hypot(dx, dy));
    const wx = aim.tx + (dx / d) * 26, wy = aim.ty + (dy / d) * 26;
    const facing = facingFromMove(aim.tx - wx, aim.ty - wy) || 'south';
    const p = isoProject(wx, wy);
    const sp = this._r394BodySprite(fam, shade, p.x, p.y, 'attack', facing, 0);
    if (!sp) return;
    sp.setDepth(isoDepth(wx, wy) + 6);
    sp.setAlpha(0);
    const st = { t: 0 };
    this.tweens.add({ targets: st, t: 1, duration: 620,
      onUpdate: () => {
        if (!sp.scene) return;
        sp.setAlpha(st.t < 0.15 ? st.t / 0.15 : st.t > 0.8 ? (1 - st.t) / 0.2 : 1);
        this._r394SetBodyFrame(sp, 'attack', facing, Math.min(7.99, st.t * 9));
      },
      onComplete: () => sp.destroy() });
  },

  /** The polymorph critter: a toad over the target (its own body hidden) for a while. */
  _r394Toad(fam, shade, aim, ms) {
    const m = aim.tgt;
    if (!m || !m.alive) return;
    const p = isoProject(m.wx, m.wy);
    const sp = this._r394BodySprite(fam, shade, p.x, p.y, 'idle', m.facing || 'south', 0, 1.1);
    if (!sp) return;
    this._r394Toads = (this._r394Toads || []).filter(t => t.sp && t.sp.scene);
    this._r394Toads.push({ m, sp, until: this.time.now + ms, hop: 0 });
  },

  /** The straw double where you stand; the wicker man's straw base, great and burning, at your feet. */
  _r394Stand(fam, shade, body) {
    const wx = this.world.x, wy = this.world.y;
    const p = isoProject(wx, wy);
    const facing = (this.player && this.player.facing) || 'south';
    const sp = this._r394BodySprite(fam, shade, p.x, p.y, 'idle', facing, 0, body.scale || 1);
    if (!sp) return;
    sp.setDepth(isoDepth(wx, wy) + (body.kind === 'wicker' ? -2 : 3));
    sp.setAlpha(0);
    const ms = body.ms || 3000;
    this.tweens.add({ targets: sp, alpha: body.kind === 'wicker' ? 0.95 : 1, duration: 180 });
    this.time.delayedCall(Math.max(300, ms - 400), () => {
      if (!sp.scene) return;
      sp.setTint(0xffa860);   // it burns away
      this.tweens.add({ targets: sp, alpha: 0, duration: 400, onComplete: () => sp.destroy() });
    });
  },

  // ---- the tick ----------------------------------------------------------------------------------------------------
  _r394Tick(dt) {
    const now = this.time ? this.time.now : Date.now();
    // companions
    const comp = this._r394Comp;
    if (comp && comp.length) {
      for (let i = comp.length - 1; i >= 0; i--) {
        const c = comp[i];
        const par = c.parent;
        if (!par || !par.scene) { if (c.child && c.child.scene) c.child.destroy(); comp.splice(i, 1); continue; }
        if (c.child && c.child.scene) {
          c.child.setPosition(par.x + c.dx, par.y + c.dy);
          c.child.setDepth(par.depth + c.depth);
          c.child.setAlpha(par.alpha);
        }
        if (c.coins && now - c.coinT > COIN_EVERY_MS) { c.coinT = now; this._r394Coin(par); }
      }
    }
    // toads
    if (this._r394Toads && this._r394Toads.length) {
      for (let i = this._r394Toads.length - 1; i >= 0; i--) {
        const t = this._r394Toads[i];
        const over = now > t.until || !t.m || !t.m.alive || !t.sp.scene;
        if (over) {
          if (t.m && t.m.sprite && t.m.sprite.scene) t.m.sprite.setVisible(true);
          if (t.sp && t.sp.scene) t.sp.destroy();
          this._r394Toads.splice(i, 1);
          continue;
        }
        const p = isoProject(t.m.wx, t.m.wy);
        t.sp.setPosition(p.x, p.y - Math.abs(Math.sin(now / 160)) * 4);
        t.sp.setDepth(isoDepth(t.m.wx, t.m.wy) + 5);
        this._r394SetBodyFrame(t.sp, t.m.moving ? 'run' : 'idle', t.m.facing || 'south', now / 90);
        if (t.m.sprite && t.m.sprite.scene) t.m.sprite.setVisible(false);
      }
    }
    // worn bodies: what the running kit holds, checked twice a second
    this._r394WornT = (this._r394WornT || 0) - dt;
    if (this._r394WornT <= 0) { this._r394WornT = WORN_CHECK_S; this._r394WornScan(); }
    if (this._r394Worn) for (const w of Object.values(this._r394Worn)) this._r394WornDraw(w, dt, now);
  },

  _r394Coin(par) {
    if (!this.textures.exists('r394_coin')) {
      try {
        const c = document.createElement('canvas');
        c.width = 6; c.height = 6;
        const g = c.getContext('2d');
        g.fillStyle = '#8a5a10'; g.beginPath(); g.ellipse(3, 3, 3, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffd24a'; g.beginPath(); g.ellipse(3, 3, 2.2, 2.2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff6c0'; g.fillRect(2, 2, 1, 1);
        this.textures.addCanvas('r394_coin', c);
      } catch (e) { return; }
    }
    const x0 = par.x, y0 = par.y - par.displayHeight * 0.55;
    const coin = this.add.image(x0, y0, 'r394_coin');
    coin.setDepth(par.depth + 2);
    coin.setScale(1.2);
    const vx = (Math.random() - 0.5) * 50, up = 26 + Math.random() * 18;
    const st = { t: 0 };
    this.tweens.add({ targets: st, t: 1, duration: 620,
      onUpdate: () => {
        if (!coin.scene) return;
        coin.setPosition(x0 + vx * st.t, y0 - up * 4 * st.t * (1 - st.t) + 14 * st.t);
        coin.setScale(1.2 * (0.35 + 0.65 * Math.abs(Math.cos(st.t * 12))), 1.2);   // spinning
        coin.setAlpha(st.t > 0.75 ? (1 - st.t) / 0.25 : 1);
      },
      onComplete: () => coin.destroy() });
  },

  /** Which worn bodies the running kit holds now (drone, shrine lantern, banners, gremlin mob). */
  _r394WornScan() {
    const p = this.player;
    if (!p || !p.knownAbilities || !this.world) return;
    const live = this._liveKnown ? this._liveKnown() : p.knownAbilities;
    const want = {};
    for (const [key, e] of Object.entries(live)) {
      const a = e && e.ability;
      if (!a || !a.confSheet || !a.confEntry) continue;
      const id = `${a.confSheet}/${a.confEntry}`;
      if (!R394_WORN.has(id)) continue;
      if ((a.template === 'summonGear' || a.template === 'summonArmor') && this._conjuredItemEquipped && !this._conjuredItemEquipped(key)) continue;
      want[id] = { key, a };
    }
    this._r394Worn = this._r394Worn || {};
    for (const id of Object.keys(this._r394Worn)) {
      if (!want[id]) { for (const s of this._r394Worn[id].sprites) if (s && s.scene) s.destroy(); delete this._r394Worn[id]; }
    }
    for (const [id, { key, a }] of Object.entries(want)) {
      if (this._r394Worn[id] && this._r394Worn[id].sprites.every(s => s && s.scene)) continue;
      if (this._r394Worn[id]) for (const s of this._r394Worn[id].sprites) if (s && s.scene) s.destroy();
      const w = this._r394MakeWorn(id, key, a);
      if (w) this._r394Worn[id] = w; else delete this._r394Worn[id];
    }
  },

  _r394MakeWorn(id, key, a) {
    const body = R394_CAST_BODIES[id];
    const use = R394_PROP_USES[id];
    const el = this._r394Element(a);
    if (body && (body.kind === 'drone' || body.kind === 'mob')) {
      const fam = body.family;
      if (this._ensureFamilyArt && !this._ensureFamilyArt(fam)) return null;   // next scan, once it is here
      const shade = r393ShadeFor(fam, null, el);
      const n = body.count || 1;
      const sprites = [];
      for (let i = 0; i < n; i++) {
        const sp = this._r394BodySprite(fam, shade, 0, 0, 'run', 'south', i * 3, body.scale || (body.kind === 'mob' ? 0.6 : 1));
        if (sp) sprites.push(sp);
      }
      if (!sprites.length) return null;
      return { id, key, kind: body.kind, sprites, phase: Math.random() * 6, fireT: 0, riderT: null, lift: body.lift || DRONE_LIFT };
    }
    if (use) {
      const sp = this._r394PropSprite(use.prop, r394PropTint(use, el), 0, 0, r394PropScale(use.prop, 'turret') * (use.as === 'gear' ? 0.8 : 1));
      if (!sp) return null;
      return { id, key, kind: use.as === 'gear' ? 'lantern' : 'banner', sprites: [sp], phase: 0 };
    }
    return null;
  },

  _r394WornDraw(w, dt, now) {
    const p = isoProject(this.world.x, this.world.y);
    const d0 = isoDepth(this.world.x, this.world.y);
    if (w.kind === 'drone') {
      const sp = w.sprites[0];
      if (!sp || !sp.scene) return;
      w.phase += dt * 1.6;
      const ox = Math.cos(w.phase) * DRONE_ORBIT, oy = Math.sin(w.phase) * DRONE_ORBIT * 0.5;
      sp.setPosition(p.x + ox, p.y + oy - (w.lift || DRONE_LIFT));
      sp.setDepth(d0 + (oy > 0 ? 8 : -8));
      // the rider's interval resetting is a shot: the muzzle flash is the attack loop
      const rider = (this._riders ? this._riders() : []).find(e => e.key === w.key);
      const st = rider && this._riderState ? this._riderState[rider.id] : null;
      if (st && w.riderT !== null && st.t < w.riderT - 0.5) w.fireT = 0.3;
      w.riderT = st ? st.t : null;
      const facing = facingFromMove(-Math.sin(w.phase), Math.cos(w.phase)) || 'south';
      if (w.fireT > 0) { w.fireT -= dt; this._r394SetBodyFrame(sp, 'attack', facing, (0.3 - w.fireT) / 0.3 * 7.99); }
      else this._r394SetBodyFrame(sp, 'run', facing, now / 70);
    } else if (w.kind === 'mob') {
      w.phase += dt * 1.1;
      w.sprites.forEach((sp, i) => {
        if (!sp || !sp.scene) return;
        const th = w.phase + (i / w.sprites.length) * Math.PI * 2;
        const ox = Math.cos(th) * 44, oy = Math.sin(th) * 22;
        sp.setPosition(p.x + ox, p.y + oy);
        sp.setDepth(d0 + (oy > 0 ? 6 : -6));
        this._r394SetBodyFrame(sp, 'run', facingFromMove(-Math.sin(th), Math.cos(th)) || 'south', now / 80 + i * 3);
      });
    } else if (w.kind === 'lantern') {
      const sp = w.sprites[0];
      if (!sp || !sp.scene) return;
      sp.setPosition(p.x + 26, p.y - 30 + Math.sin(now / 400) * 3);
      sp.setDepth(d0 + 6);
    } else if (w.kind === 'banner') {
      const sp = w.sprites[0];
      if (!sp || !sp.scene) return;
      sp.setPosition(p.x - 22, p.y - 2);
      sp.setDepth(d0 - 1);
    }
  },
};
