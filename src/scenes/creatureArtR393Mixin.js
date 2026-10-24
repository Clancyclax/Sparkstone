// ===========================================================================
// ROUND 393 -- THE NEW BODIES AND THE ANIMATED PROPS, IN THE WORLD (src/data/creatureArtR393.js is the data).
//
//   "Pack them the way the other monster atlases are packed, then swap them in for the stand-ins ... These go
//    everywhere the stand-ins were used: summons, ritual beings, wild bonds, greater shapes."
//   "Griffin flight: ... Use it whenever the griffin is airborne."
//   "Turrets (replace the generic turret) ... Ground-rising effects and summons ..."
//
// Art only: nothing here changes what an ability does. Every entry point answers "draw it like this" or null, and the
// caller keeps its old drawing for null, so a missing sheet is never a blank.
//
//   _r393Preload()                 the nine animated props as drawn (boot; their element tints load on first use)
//   _r393SummonRemap(a)            a called creature's body: the new family + shade for a stand-in (_spawnSummon)
//   _r393TurretSprite(a, p)        a turret that has its own animated prop (_spawnSummon's turret branch)
//   _r393FamiliarSprite(a)         a ritual being / bonded familiar's body (_familiarSprite)
//   _r393FamiliarPose(f, own, dt)  where an arm or a head that rose out of the ground stands, and a flyer's lift
//   _r393Airborne(s)               is this called creature in the air (the griffin's Flying loop)
//   _r393DeathRow(row, d, facing)  the corpse row of a four-diagonal death sheet
//   _r393CastArt(a)                tentacles, serpent heads, snake hair, grasping hands, the tail, the four riders,
//                                  the engine -- the bodies a cast raises out of the ground for a moment
//   _r393Tick(dt)                  rising / sinking props
//   _r393SpawnBody(family, shade, wx, wy)   the test harness's door: a wild monster wearing a new body
// ===========================================================================
import { isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { MONSTER_ART } from '../data/monsterArt.js';
import {
  r393SwapFor, r393ShadeFor, r393PropTint, r393TurretFor, r393CastArtFor, R393_PROPS, R393_PROP_FRAMES,
  R393_FAMILIAR_ART, r393BondSwap, R393_DISPLAY_NAME,
} from '../data/creatureArtR393.js';

const PROP_FRAME_RATE = 10;
const TURRET_SCALE = 1.0;
const ARM_SCALE = 0.85;
/** Four diagonals of a death sheet, by facing. */
const DEATH_DIAG = { east: 'southeast', southeast: 'southeast', south: 'southeast', southwest: 'southwest',
  west: 'southwest', northwest: 'northwest', north: 'northeast', northeast: 'northeast' };
/** The hydra's top-right head and neck in its south idle frame (cell 129): the second head. */
const SECOND_HEAD_CROP = { x: 72, y: 31, w: 31, h: 45, foot: 76, cx: 88 };
const FLYER_LIFT = 20;
const RIDERS = ['riderWar', 'riderFamine', 'riderPestilence', 'riderDeath'];
/** The conditions that make a statue of what they hold (confluenceIdentity.conditionKey + the Gorgon's signature). */
const STONE_CONDITIONS = ['cid_Transfiguration_turnedStatue', 'cid_Gorgon_statueStill', 'sig_gorgon_2', 'cid_Monolith_setInStone'];
const GRASP_CONDITION = 'cid_Undeath_graspedFromBelow';
/** The stone ramp (tools/pack_round393_creatures.py RAMPS.stone), dark to light. */
const STONE_RAMP = [[0x12, 0x11, 0x10], [0x45, 0x41, 0x3c], [0x7d, 0x77, 0x6f], [0xb6, 0xb0, 0xa6], [0xef, 0xeb, 0xe3]];
function stoneAt(t) {
  const x = t * (STONE_RAMP.length - 1);
  const i = Math.min(STONE_RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const a = STONE_RAMP[i], b = STONE_RAMP[i + 1];
  return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
}

export const CreatureArtR393Mixin = {
  // ---- props: textures and loops --------------------------------------------------------------------------------
  _r393Preload() {
    for (const [k, d] of Object.entries(R393_PROPS)) {
      this.load.spritesheet(`r393_${k}`, `./public/assets/r393props/${k}.png`, { frameWidth: d.w, frameHeight: d.h });
    }
  },

  /** The loaded key for `prop` in `tint` (null tint = as drawn); asks for it if it is not here, and answers the art
   *  as drawn meanwhile. Null only when not even that is loaded. */
  _r393PropKey(prop, tint) {
    const d = R393_PROPS[prop];
    if (!d) return null;
    const nat = `r393_${prop}`;
    const want = tint ? `${nat}_${tint}` : nat;
    if (this.textures.exists(want)) return want;
    this._r393Pending = this._r393Pending || new Set();
    if (!this._r393Pending.has(want)) {
      this._r393Pending.add(want);
      try {
        this.load.spritesheet(want, `./public/assets/r393props/${tint ? `${prop}_${tint}` : prop}.png`,
          { frameWidth: d.w, frameHeight: d.h });
        this.load.once(`filecomplete-spritesheet-${want}`, () => {
          this._r393Pending.delete(want);
          for (const sp of (this._r393Live || [])) {
            if (sp && sp.scene && sp._r393 && sp._r393.want === want) { sp.setTexture(want); this._r393Play(sp, want); }
          }
        });
        if (!this.load.isLoading()) this.load.start();
      } catch (e) { /* the art as drawn stands in */ }
    }
    return this.textures.exists(nat) ? nat : null;
  },

  _r393Play(sp, key) {
    const ak = `${key}_loop`;
    if (!this.anims.exists(ak)) {
      this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(key, { start: 0, end: R393_PROP_FRAMES - 1 }),
        frameRate: PROP_FRAME_RATE, repeat: -1 });
    }
    sp.play({ key: ak, startFrame: Math.floor(Math.random() * R393_PROP_FRAMES) });
  },

  /** A looping prop at a screen point, its foot on the point. Null when the art is not loaded. */
  _r393PropSprite(prop, tint, x, y, scale = 1) {
    const key = this._r393PropKey(prop, tint);
    if (!key) return null;
    const sp = this.add.sprite(x, y, key, 0);
    sp.setOrigin(0.5, 0.96);
    sp.setScale(scale);
    sp._r393 = { prop, tint, want: tint ? `r393_${prop}_${tint}` : `r393_${prop}` };
    this._r393Play(sp, key);
    this._r393Live = (this._r393Live || []).filter(s => s && s.scene);
    this._r393Live.push(sp);
    return sp;
  },

  /** Raise a prop out of the ground over `ms` (crop + origin: the position is never touched, so whoever owns the
   *  sprite's position keeps owning it); `sink` lowers it back. `then` runs when it finishes. */
  _r393Rise(sp, ms = 220, sink = false, then = null) {
    if (!sp) return;
    this._r393Rising = this._r393Rising || [];
    this._r393Rising.push({ sp, t: 0, dur: Math.max(1, ms) / 1000, sink, then });
    this._r393RiseAt(sp, sink ? 1 : 0.02);
  },
  _r393RiseAt(sp, k) {
    if (!sp || !sp.scene || !sp.frame) return;
    const w = sp.frame.width, h = sp.frame.height;
    const v = Math.max(0.02, Math.min(1, k));
    if (v >= 1) { sp.setCrop(); sp.setOrigin(0.5, 0.96); return; }
    // the top `v` of the frame shows, and that slice's bottom stands on the ground point
    sp.setCrop(0, 0, w, h * v * 0.96 + 1);
    sp.setOrigin(0.5, v * 0.96);
  },
  _r393Tick(dt) {
    const list = this._r393Rising;
    if (!list || !list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (!r.sp || !r.sp.scene) { list.splice(i, 1); continue; }
      r.t += dt;
      const u = Math.min(1, r.t / r.dur);
      const e = 1 - (1 - u) * (1 - u);
      this._r393RiseAt(r.sp, r.sink ? 1 - e : e);
      if (u >= 1) { list.splice(i, 1); if (r.then) { try { r.then(); } catch (err) { /* art only */ } } }
    }
  },

  /** A prop that rises, stays `holdMs` and sinks away. World point. */
  _r393Burst(prop, tint, wx, wy, { scale = 1, riseMs = 200, holdMs = 700, sinkMs = 220, delay = 0, flipX = false,
    dy = 0, depthAdd = 6 } = {}) {
    const go = () => {
      const p = isoProject(wx, wy);
      const sp = this._r393PropSprite(prop, tint, p.x, p.y + dy, scale);
      if (!sp) return;
      sp.setFlipX(flipX);
      sp.setDepth(isoDepth(wx, wy) + depthAdd);
      this._r393Rise(sp, riseMs, false, () => {
        this.time.delayedCall(holdMs, () => this._r393Rise(sp, sinkMs, true, () => sp.destroy()));
      });
    };
    if (delay > 0) this.time.delayedCall(delay, go); else go();
  },

  // ---- summons ---------------------------------------------------------------------------------------------------
  _r393SummonRemap(a) {
    if (!a || (a.summonKind && a.summonKind !== 'creature') || !a.summonFamily) return a;
    const sw = r393SwapFor(a.summonFamily, a.summonCreatureName || a.name);
    if (!sw) return a;
    const el = (this._specElement && this._specElement(a)) || a.element || null;
    return { ...a, summonFamily: sw.family, summonShade: r393ShadeFor(sw.family, a.summonShade || null, el),
      _r393Scale: sw.scale, _r393From: a.summonFamily };
  },

  _r393TurretSprite(a, p) {
    const prop = r393TurretFor(a);
    if (!prop) return null;
    const tint = r393PropTint(prop, (this._specElement && this._specElement(a)) || a.element || null);
    const sp = this._r393PropSprite(prop, tint, p.x, p.y, prop === 'tentacle' ? ARM_SCALE : TURRET_SCALE);
    if (!sp) return null;
    sp._r393.turret = true;
    this._r393Rise(sp, prop === 'tentacle' ? 320 : 420);
    return sp;
  },

  /** A called creature is in the air while it travels, and for the moment it arrives ("drops out of the sun"). */
  _r393Airborne(s) {
    if (!s || !s.art || !s.art.flyFrames) return false;
    if (s.swingT > 0) return false;
    return !!s.moving || ((s.maxT || 0) - (s.t || 0)) < 1.2;
  },
  /** The lift the sprite rides at, eased. */
  _r393Lift(s, dt, air) {
    const want = air ? FLYER_LIFT : 0;
    s._r393Lift = (s._r393Lift || 0) + (want - (s._r393Lift || 0)) * Math.min(1, dt * 6);
    return s._r393Lift;
  },

  // ---- familiars: ritual beings, their greater shapes, bonded arms and heads -------------------------------------
  _r393FamiliarSprite(a) {
    if (!a) return null;
    const special = R393_FAMILIAR_ART[a.familiarCreatureName];
    if (special && special.prop) {
      const tint = r393PropTint(special.prop, a.element || null);
      const sp = this._r393PropSprite(special.prop, tint, 0, 0, ARM_SCALE);
      if (!sp) return null;
      sp._r393.pose = 'arm';
      this._r393Rise(sp, 380);
      return { sprite: sp, spin: false, fowl: false };
    }
    if (special && special.crop === 'hydra' && a.familiarFamily === 'hydra' && this.textures.exists('mon_hydra_idle')) {
      const art = MONSTER_ART.hydra;
      const shade = this._summonShadeFor(a, art);
      const c = SECOND_HEAD_CROP;
      const sp = this.add.sprite(0, 0, 'mon_hydra_idle', shade * 8 + dirRow('south'));
      sp.setCrop(c.x, c.y, c.w, c.h);
      sp.setOrigin(c.cx / art.cell, c.foot / art.cell);
      sp.setScale(art.displayScale * 0.9);
      sp._r393 = { pose: 'head' };
      return { sprite: sp, spin: false, fowl: false };
    }
    const sw = r393SwapFor(a.familiarFamily, a.familiarCreatureName);
    if (!sw) return null;
    const fam = sw.family;
    const art = MONSTER_ART[fam];
    if (this._ensureFamilyArt) this._ensureFamilyArt(fam);
    const shadeName = r393ShadeFor(fam, a.summonShade || null, a.element || null);
    const shade = Math.max(0, art.shades.indexOf(shadeName));
    const idle = this._monsterTexture(fam, 'idle');
    const here = this.textures.exists(idle);
    const sp = this.add.sprite(0, 0, here ? idle : '__DEFAULT', here ? shade * 8 + 2 : 0);
    sp.setScale(art.displayScale * 0.55 * (sw.scale || 1));   // FAMILIAR_CREATURE_SCALE
    sp.setOrigin(0.5, art.originY || 0.85);
    if (!here) sp.setAlpha(0);
    sp._r393 = { pose: 'creature', family: fam, flyer: !!art.flyFrames };
    return { sprite: sp, spin: false, fowl: false, family: fam, art, shade };
  },

  _r393FamiliarPose(f, own, dt) {
    const r = f.sprite && f.sprite._r393;
    if (!r) return;
    if (r.pose === 'arm') {
      f.sprite.setPosition(own.x + 34, own.y + 8);
    } else if (r.pose === 'head') {
      f.sprite.setPosition(own.x - 32, own.y + 6);
    } else if (r.pose === 'creature') {
      if (f.sprite.alpha === 0 && this.textures.exists(this._monsterTexture(r.family, 'idle'))) f.sprite.setAlpha(1);
      if (r.flyer) f.sprite.y -= FLYER_LIFT + Math.sin((this.time.now / 300) + f.angle) * 3;
    }
  },

  // ---- corpses ---------------------------------------------------------------------------------------------------
  _r393DeathRow(row, d, facing) {
    const dirs = d && d.dirs;
    if (!Array.isArray(dirs) || !dirs.length) return row;
    const i = Math.max(0, dirs.indexOf(DEATH_DIAG[facing] || 'southeast'));
    return row * dirs.length + i;
  },

  // ---- cast art --------------------------------------------------------------------------------------------------
  _r393CastArt(a) {
    const kind = r393CastArtFor(a);
    if (!kind) return;
    try { this._r393CastArtKind(kind, a); } catch (e) { console.warn('[r393] cast art', kind, e && e.message); }
  },

  _r393CastArtKind(kind, a) {
    const el = (this._specElement && this._specElement(a)) || a.element || null;
    const px = this.world.x, py = this.world.y;
    const ang = this.player.aimAngle || 0;
    const range = Math.min(320, a.range || a.explodeRadius || 140);
    const tgt = (this._nearestMonsterInCone && this._nearestMonsterInCone(range, Math.PI / 2))
      || (this._nearestMonsterWithin && this._nearestMonsterWithin(range)) || null;
    const tx = tgt ? tgt.wx : px + Math.cos(ang) * range * 0.6;
    const ty = tgt ? tgt.wy : py + Math.sin(ang) * range * 0.6;
    const jitter = (i, r) => [Math.cos(i * 2.399) * r * (0.5 + (i % 3) * 0.25), Math.sin(i * 2.399) * r * (0.5 + (i % 3) * 0.25)];
    if (kind === 'tentacles') {
      const tint = r393PropTint('tentacle', el);
      const cone = a.template === 'breathCone' || a.template === 'cone' || a.coneAngle;
      const n = 4;
      for (let i = 0; i < n; i++) {
        let wx, wy;
        if (cone) {
          const sp = (a.coneAngle || 0.6) * ((i / (n - 1)) - 0.5) * 1.6;
          const d = range * (0.45 + 0.12 * (i % 2));
          wx = px + Math.cos(ang + sp) * d; wy = py + Math.sin(ang + sp) * d;
        } else {
          const [jx, jy] = jitter(i, 34); wx = tx + jx; wy = ty + jy;
        }
        this._r393Burst('tentacle', tint, wx, wy, { scale: 0.75 + 0.1 * (i % 2), delay: i * 70, holdMs: 620,
          flipX: i % 2 === 1 });
      }
    } else if (kind === 'tentacleWall' || kind === 'handsWall') {
      const prop = kind === 'tentacleWall' ? 'tentacle' : 'graspinghands';
      const tint = r393PropTint(prop, el);
      const cx = px + Math.cos(ang) * 70, cy = py + Math.sin(ang) * 70;
      const len = (a.wallLength || 160) * (this._reachMult ? this._reachMult() : 1);
      const n = Math.max(3, Math.round(len / 30));
      const hold = Math.max(600, (a.wallDuration || 6) * 1000 - 500);
      for (let i = 0; i < n; i++) {
        const u = (i / (n - 1) - 0.5) * len;
        const wx = cx + Math.cos(ang + Math.PI / 2) * u, wy = cy + Math.sin(ang + Math.PI / 2) * u;
        this._r393Burst(prop, tint, wx, wy, { scale: prop === 'tentacle' ? 0.7 : 0.9, delay: i * 40, holdMs: hold,
          flipX: i % 2 === 1 });
      }
    } else if (kind === 'heads') {
      const tint = r393PropTint('serpenthead', el);
      const many = /many|thrash/i.test(a.name || '');
      const targets = [];
      if (many && this.monsters) {
        const near = this.monsters.filter(m => m.alive && Math.hypot(m.wx - px, m.wy - py) <= range)
          .sort((m1, m2) => Math.hypot(m1.wx - px, m1.wy - py) - Math.hypot(m2.wx - px, m2.wy - py)).slice(0, 3);
        for (const m of near) targets.push([m.wx, m.wy]);
      }
      if (!targets.length) targets.push([tx, ty]);
      while (many && targets.length < 3) { const [jx, jy] = jitter(targets.length, 40); targets.push([tx + jx, ty + jy]); }
      targets.forEach(([wx, wy], i) => this._r393Strike(wx, wy, tint, i * 90));
    } else if (kind === 'snakehair') {
      const tint = r393PropTint('serpenthead', el);
      for (let i = 0; i < 5; i++) {
        const th = (i / 5) * Math.PI * 2;
        const wx = px + Math.cos(th) * 10, wy = py + Math.sin(th) * 10;
        this._r393Burst('serpenthead', tint, wx, wy, { scale: 0.3, delay: i * 50, riseMs: 140, holdMs: 520,
          sinkMs: 160, flipX: Math.cos(th) < 0, dy: -44 - Math.sin(th) * 5, depthAdd: 40 });
      }
    } else if (kind === 'hands') {
      const tint = r393PropTint('graspinghands', el);
      const dropped = a.trapDelivery === 'dropped';
      const hx = dropped ? px : tx, hy = dropped ? py : ty;
      this._r393Burst('graspinghands', tint, hx, hy, { scale: 1.1, riseMs: 260, holdMs: 900 });
      for (let i = 1; i < 3; i++) {
        const [jx, jy] = jitter(i, 38);
        this._r393Burst('graspinghands', tint, hx + jx, hy + jy, { scale: 0.8, delay: 90 * i, holdMs: 700 });
      }
    } else if (kind === 'tail') {
      // "Recoloured green, it also serves as the chimera's tail-strike-fx."
      this._r393Burst('tentacle', 'verdant', tx, ty, { scale: 0.7, riseMs: 120, holdMs: 340, sinkMs: 160,
        flipX: tx < px });
    } else if (kind === 'riders') {
      this._r393Riders(a, ang);
    } else if (kind === 'engine') {
      this._r393Engine(a);
    }
  },

  /** A serpent head rises beside the target and lunges at it. */
  _r393Strike(wx, wy, tint, delay = 0) {
    const go = () => {
      const fromLeft = wx >= this.world.x;
      const p = isoProject(wx, wy);
      const off = fromLeft ? -26 : 26;
      const sp = this._r393PropSprite('serpenthead', tint, p.x + off, p.y + 4, 0.8);
      if (!sp) return;
      sp.setFlipX(!fromLeft);
      sp.setDepth(isoDepth(wx, wy) + 8);
      this._r393Rise(sp, 150, false, () => {
        this.tweens.add({ targets: sp, x: sp.x - off * 0.55, duration: 130, yoyo: true, hold: 60, ease: 'Quad.easeOut',
          onComplete: () => this._r393Rise(sp, 180, true, () => sp.destroy()) });
      });
    };
    if (delay > 0) this.time.delayedCall(delay, go); else go();
  },

  /** "Four spectral riders break out of you in a wide spread": the four horsemen gallop out along the volley. */
  _r393Riders(a, ang) {
    const spread = a.volleySpread || 0.5;
    const n = Math.max(1, Math.min(4, a.volleyCount || 4));
    RIDERS.slice(0, n).forEach((fam, i) => {
      const art = MONSTER_ART[fam];
      if (!art) return;
      if (this._ensureFamilyArt) this._ensureFamilyArt(fam);
      const key = this._monsterTexture(fam, 'run');
      if (!this.textures.exists(key)) return;   // the first cast fetches them; the volley itself is unchanged
      const th = ang + (n > 1 ? (i / (n - 1) - 0.5) * spread * 2 : 0);
      const facing = facingFromMove(Math.cos(th), Math.sin(th)) || 'south';
      const row = dirRow(facing);
      const sx = this.world.x, sy = this.world.y;
      const dist = 240;
      const p0 = isoProject(sx, sy);
      const sp = this.add.sprite(p0.x, p0.y, key, row * 8);
      sp.setOrigin(0.5, art.originY || 0.85);
      sp.setScale(art.displayScale * 0.8);
      sp.setAlpha(0.92);
      const st = { t: 0 };
      this.tweens.add({ targets: st, t: 1, duration: 700, delay: i * 40,
        onUpdate: () => {
          if (!sp.scene) return;
          const wx = sx + Math.cos(th) * dist * st.t, wy = sy + Math.sin(th) * dist * st.t;
          const p = isoProject(wx, wy);
          sp.setPosition(p.x, p.y);
          sp.setDepth(isoDepth(wx, wy) + 6);
          sp.setFrame(row * 8 + (Math.floor(this.time.now / 70) % 8));
          sp.setAlpha(st.t > 0.7 ? 0.92 * (1 - (st.t - 0.7) / 0.3) : 0.92);
        },
        onComplete: () => sp.destroy() });
    });
  },

  /** vehicle-body: the juggernaut rolls out around you and swings its scythed hubs once. */
  _r393Engine(a) {
    const fam = 'juggernaut';
    const art = MONSTER_ART[fam];
    if (!art) return;
    if (this._ensureFamilyArt) this._ensureFamilyArt(fam);
    const key = this._monsterTexture(fam, 'attack');
    if (!this.textures.exists(key)) return;
    const el = (this._specElement && this._specElement(a)) || null;
    const shade = Math.max(0, art.shades.indexOf(r393ShadeFor(fam, null, el)));
    const row = dirRow(this.player.facing || 'south');
    const p = isoProject(this.world.x, this.world.y);
    const sp = this.add.sprite(p.x, p.y, key, shade * 64 + row * 8);
    sp.setOrigin(0.5, art.originY || 0.85);
    sp.setScale(art.displayScale * 0.75);
    sp.setDepth(isoDepth(this.world.x, this.world.y) + 3);
    const st = { t: 0 };
    this.tweens.add({ targets: st, t: 1, duration: 720,
      onUpdate: () => {
        if (!sp.scene) return;
        const q = isoProject(this.world.x, this.world.y);
        sp.setPosition(q.x, q.y);
        sp.setFrame(shade * 64 + row * 8 + Math.min(7, Math.floor(st.t * 8)));
        sp.setAlpha(st.t > 0.75 ? 1 - (st.t - 0.75) / 0.25 : 1);
      },
      onComplete: () => sp.destroy() });
  },

  // ---- conditions drawn on the body ------------------------------------------------------------------------------
  /**
   * "the petrified-enemy statue: any monster frame tinted to stone" -- while a monster is Turned to Statue /
   * Statue-Still / Petrified, it is drawn as the frame it was caught in, through the stone ramp (one small canvas per
   * caught frame, cached). And "Grasped from Below" raises the grasping hands under it once per hold.
   */
  _r393MonsterConditionArt(m) {
    const db = m.debuffs;
    const stone = STONE_CONDITIONS.some(k => db[k]);
    if (stone) {
      if (!m._r393Stone && m.sprite && m.sprite.frame) {
        m._r393Stone = this._r393StoneFrame(m.sprite.texture.key, m.sprite.frame.name);
      }
      if (m._r393Stone && this.textures.exists(m._r393Stone) && m.sprite.texture.key !== m._r393Stone) {
        m.sprite.setTexture(m._r393Stone);
      }
    } else if (m._r393Stone) {
      m._r393Stone = null;   // the next sprite pass puts the living frame back
    }
    const grasp = !!db[GRASP_CONDITION];
    if (grasp && !m._r393Grasp) {
      this._r393Burst('graspinghands', null, m.wx, m.wy + 2, { scale: 1.0, riseMs: 220, holdMs: 1400, depthAdd: 2 });
    }
    m._r393Grasp = grasp;
  },

  /** One frame of a texture through the stone ramp, as its own single-frame texture. Null if it cannot be read. */
  _r393StoneFrame(texKey, frameName) {
    const key = `r393stone_${texKey}_${frameName}`;
    if (this.textures.exists(key)) return key;
    try {
      const fr = this.textures.getFrame(texKey, frameName);
      if (!fr || !fr.source || !fr.source.image) return null;
      const w = fr.cutWidth, h = fr.cutHeight;
      const cnv = document.createElement('canvas');
      cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(fr.source.image, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      let lo = 255, hi = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        const L = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        if (L < lo) lo = L; if (L > hi) hi = L;
      }
      const span = Math.max(1, hi - lo);
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const t = Math.max(0, Math.min(1, ((d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) - lo) / span));
        const c = stoneAt(t);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
      }
      ctx.putImageData(img, 0, 0);
      this.textures.addCanvas(key, cnv);
      return key;
    } catch (e) {
      return null;
    }
  },

  // ---- wild bonds --------------------------------------------------------------------------------------------------
  /**
   * ROUND 393 -- the creature a confluence's wild bond calls, when the sheet's list names a stand-in ("the ritual
   * fighter and wild bonds use the same"): it walks up as the new body in the shade its own colour or the ability's
   * element picks. Only `type.family` / `type.shade` / `type.label` change (on a copy): its numbers are the wild
   * creature's. `_wildBondTake` records the family and shade it is wearing, so the companion keeps the body.
   */
  _r393WildBondBody(m, a) {
    const t = m && m.type;
    if (!t || !a) return false;
    const conf = this.player && this.player.confluence && this.player.confluence.name;
    const fam = r393BondSwap(conf, t.family, t.shade);
    if (!fam) return false;
    // a confluence bond (its theme is the sheet's list), not an essence's list that happens to hold the same animal
    if (Array.isArray(a.bondTheme) && !a.bondTheme.some(e => String(e).split(':')[0] === t.family)) return false;
    const el = (this._specElement && this._specElement(a)) || a.element || null;
    const shade = r393ShadeFor(fam, t.shade || null, el);
    m.type = { ...t, family: fam, shade, label: String(R393_DISPLAY_NAME[fam] || fam).toLowerCase() };
    m._r393From = t.family;
    this._r393WearBody(m, fam);
    return true;
  },

  /** The sprite side of a body change: `_spawnMonster` set the origin (the ground point) from the OLD family's art,
   *  and `_updateMonsterSprite` never sets it again -- so a swapped body would stand on the old creature's foot row. */
  _r393WearBody(m, fam) {
    const art = MONSTER_ART[fam];
    if (m.sprite && m.sprite.setOrigin && art) m.sprite.setOrigin(0.5, art.originY || 0.85);
    if (this._ensureFamilyArt) this._ensureFamilyArt(fam);
    if (this._ensureMonsterDeathArt) this._ensureMonsterDeathArt(fam);
  },

  // ---- the test harness's door -----------------------------------------------------------------------------------
  /** A wild monster wearing one of the new bodies (any roster type underneath; only its body changes). */
  _r393SpawnBody(family, shade, wx, wy, baseKey = 'wolfGrey') {
    const m = this._spawnMonster(baseKey, wx, wy, null);
    if (!m) return null;
    m.type = { ...m.type, family, shade: shade || (MONSTER_ART[family] && MONSTER_ART[family].shades[0]) };
    this._r393WearBody(m, family);
    return m;
  },
};
