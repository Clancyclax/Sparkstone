// ============================================================================
// ROUND 304 -- REALM OF THE INFINITE ECLIPSE, AND THE EYES THAT FEED IT.
//
//   "Added new animations for the Sun, Moon, and Eclipse."
//   "[Burning Eye of the Sun] will inflict a sun marked debuff (shedding orange
//    light in a range around them)"; the moon's is silver.
//
// Same shape as canonRuntime5Mixin.js: a precheck, `_canon_<key>`, a tick.
//
//   IRON    a zone of darkness where the cast happened. Light sources inside it
//           go out (the player's own are the essence abilities' -- the ones this
//           game draws from `_lightSources` are the world's, so all of those
//           go). Enemies inside are limned in moonlight ([moonlitLimn], +20% from
//           every source) and allies in sunlight ([sunlitLimn], heat on the
//           player's physical and projectile attacks). Both are refreshed twice a
//           second and lapse a moment after the carrier leaves.
//   BRONZE  every [Burning Eye of the Sun] and [Pale Eye of the Moon] on an enemy
//           in the zone when it opens is consumed, one instance at a time, over a
//           15-second ramp into the eclipse; each makes the orb 1% larger. When
//           the last is in it goes dark, then the eclipse blazes in orange and
//           silver, and the beam fires by itself: transcendent, for every
//           affliction consumed, for a few seconds -- the player held where they
//           stand, turning with their move input, until they sprint -- and it
//           ends the realm.
//   SILVER  an enemy that was inside cannot leave, however it tries (a push, a
//           dash, a teleport: it is set back on the edge every frame).
//
// WHAT IS A STAND-IN. "Light sources other than those from the user's essence
// abilities" -- the game's lights are lamps, torches and lava; none is an
// essence ability's, so all of them are suppressed inside the zone. Companions
// are limned in sunlight but only the player's own blows carry the heat (the
// guards' and companions' damage does not come through the player's blow door).
// ============================================================================
import { conditionDef, hasTag, TAG } from '../data/debuffs.js';
import { CANON_RT, reached, rankAt } from '../data/canonRuntime.js';
import { CANON_CAST_KEYS } from './canonRuntimeMixin.js';
import { isoProject, isoDepth, moveFromFacing, facingFromMove } from '../data/iso.js';
import { EYE_MARKS, EYE_KEYS, moonPhaseAtClock } from '../data/celestial.js';

export const CANON6_CAST_KEYS = ['realmOfTheInfiniteEclipse'];
for (const k of CANON6_CAST_KEYS) CANON_CAST_KEYS.add(k);

const SEGS = 28;
const EYES = ['burningEyeOfTheSun', 'paleEyeOfTheMoon'];

export const CanonRuntime6Mixin = {
  // ==========================================================================
  // BEFORE THE COST
  // ==========================================================================
  _canonFreeRecast6(ck) {
    const r = this.player && this.player.canonRealm;
    void ck; void r;   // the beam fires by itself now: there is no recast to make free
    return false;
  },

  _canonPrecheck6(ck, a, rank, rt, mode, spec, key) {
    if (ck === 'realmOfTheInfiniteEclipse') {
      const r = this.player.canonRealm, p0 = this.player;
      if (r) { this._canonSay(`${a.name} — the realm already stands`); return null; }
      if (p0 && p0.eclipseBeam) return null;
    }
    return spec;
  },

  // ==========================================================================
  // THE CAST
  // ==========================================================================
  _canon_realmOfTheInfiniteEclipse(a, key, rank, ctx) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    const p = this.player;
    if (p.canonRealm) this._realmEnd(true);
    p.canonRealm = {
      x: this.world.x, y: this.world.y, r: rt.radius, t: rt.secs, age: 0, rank, key, a,
      absorbed: 0, queue: [], total: 0, slot: 0, rampT: 0, phase: 'none', phaseT: 0, orbReady: false, tickT: 0, id: (this._realmSeq = (this._realmSeq || 0) + 1),
    };
    this._realmBuild(p.canonRealm);
    if (reached(rank, 'bronze')) this._realmQueue(p.canonRealm);
    this._canonSay('The sun and the moon answer.', '#ffe082');
    if (this._spawnRingFx) this._spawnRingFx(this.world.x, this.world.y, rt.radius, '#ffe082');
  },

  // ==========================================================================
  // THE ZONE'S PICTURE
  // ==========================================================================
  _realmPoly(r, k = 1) {
    const rr = r.r * k, pts = [];
    for (let i = 0; i < SEGS; i++) {
      const th = (i / SEGS) * Math.PI * 2;
      const q = isoProject(r.x + Math.cos(th) * rr, r.y + Math.sin(th) * rr);
      pts.push({ x: q.x, y: q.y });
    }
    return pts;
  },

  _realmBuild(r) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    const g = this.add.graphics();
    g.setDepth(899990);
    // Soft edge: four nested discs, the middle darkest.
    const steps = [1, 0.9, 0.8, 0.7];
    for (const k of steps) {
      g.fillStyle(0x05020f, rt.darkAlpha / steps.length);
      g.fillPoints(this._realmPoly(r, k), true);
    }
    g.lineStyle(3, 0xffe082, 0.5);
    g.strokePoints(this._realmPoly(r, 1), true);
    g.lineStyle(2, 0xcfd8dc, 0.4);
    g.strokePoints(this._realmPoly(r, 0.97), true);
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 600 });
    r.g = g;
  },

  _realmEnd(silent, keepOrb) {
    const p = this.player, r = p.canonRealm;
    if (!r) return;
    if (r.g) { const g = r.g; this.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() }); }
    if (r.orb && !keepOrb) { const o = r.orb; this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() }); }
    for (const k of (keepOrb ? ['dark'] : ['orbGlow', 'orbGlow2', 'dark'])) {
      if (r[k]) { const o = r[k]; this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() }); }
    }
    for (const m of (this.monsters || [])) if (m._realmId === r.id) { m._realmId = null; }
    p.canonRealm = null;
    if (!silent) this._canonSay('The realm closes.', '#b0bec5');
  },

  /** The orb: the Eclipse sheet, on the frame the ramp has reached, 1% larger for
   *  every affliction consumed. The ramp is 15 seconds; then it goes dark, then it
   *  blazes -- orange and silver -- and waits for the beam. */
  _realmOrb(r) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    if (!this.textures.exists('fx_celestial_eclipse') || r.phase === 'none') return;
    const q = isoProject(r.x, r.y);
    if (!r.orb) {
      r.orb = this.add.sprite(q.x, q.y - rt.orbRise, 'fx_celestial_eclipse', 0).setDepth(899995);
      r.orbGlow = this.add.circle(q.x, q.y - rt.orbRise, 50, 0xff9800, 0).setDepth(899994).setBlendMode('ADD');
      r.orbGlow2 = this.add.circle(q.x, q.y - rt.orbRise, 50, 0xcfd8dc, 0).setDepth(899994).setBlendMode('ADD');
    }
    const grow = 1 + rt.orbGrowPer * r.absorbed;
    const now = (this.time.now || 0) / 1000;
    let frame = 5, orbA = 1, a1 = 0, a2 = 0, rad = 50;
    if (r.phase === 'ramp') {
      const prog = Math.min(1, r.rampT / rt.rampSecs);
      frame = Math.min(5, Math.floor(prog * 5.999));
      a1 = a2 = 0.08 + 0.12 * prog; rad = 40 + 20 * prog;
    } else if (r.phase === 'dark') {
      orbA = 0.25 + 0.15 * Math.sin(now * 5); a1 = a2 = 0; rad = 60;
    } else {   // blaze: orange and silver, out of step
      a1 = 0.55 + 0.25 * Math.sin(now * 7); a2 = 0.55 + 0.25 * Math.sin(now * 7 + Math.PI); rad = 96;
    }
    r.orb.setFrame(frame).setScale(2.2 * grow).setAlpha(orbA);
    r.orbGlow.setAlpha(a1).setRadius(rad * grow);
    r.orbGlow2.setAlpha(a2).setRadius(rad * grow * 0.8);
  },

  /** Bronze: the eyes standing on enemies in the zone when it opens, one entry per
   *  instance, to be consumed one by one over the ramp. */
  _realmQueue(r) {
    for (const m of (this.monsters || [])) {
      if (!m.alive || m.person || !m.debuffs) continue;
      if (Math.hypot(m.wx - r.x, m.wy - r.y) > r.r) continue;
      for (const k of EYES) {
        const d = m.debuffs[k];
        if (d) for (let i = 0; i < (d.stacks || 1); i++) r.queue.push({ m, k });
      }
    }
    r.total = r.queue.length;
    r.phase = r.total ? 'ramp' : 'none';
  },

  /** One instance of an eye goes into the orb: a spark of its colour travels from
   *  the enemy to the sky. */
  _realmConsumeOne(r) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    let e = null;
    while (r.queue.length) {
      const c = r.queue.shift();
      if (c.m.alive && c.m.debuffs && c.m.debuffs[c.k]) { e = c; break; }
    }
    if (!e) return false;
    const d = e.m.debuffs[e.k];
    if ((d.stacks || 1) > 1) d.stacks--; else delete e.m.debuffs[e.k];
    r.absorbed++;
    this._floatText(e.m.wx, e.m.wy - 34, '+1 to the eclipse', e.k === 'burningEyeOfTheSun' ? '#ffb74d' : '#cfd8dc');
    if (this.add && this.tweens) {
      const from = isoProject(e.m.wx, e.m.wy), to = isoProject(r.x, r.y);
      const col = e.k === 'burningEyeOfTheSun' ? 0xff9800 : 0xcfd8dc;
      const spark = this.add.circle(from.x, from.y - 30, 7, col, 0.95).setBlendMode('ADD').setDepth(899996);
      this.tweens.add({ targets: spark, x: to.x, y: to.y - rt.orbRise, scale: 0.4, alpha: 0.2, duration: 700, onComplete: () => spark.destroy() });
    }
    return true;
  },

  /** The ramp has finished: the zone goes dark. */
  _realmDark(r) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    r.phase = 'dark'; r.phaseT = 0;
    const g = this.add.graphics().setDepth(899993);
    g.fillStyle(0x000000, 0.7);
    g.fillPoints(this._realmPoly(r, 1.15), true);
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 900 });
    r.dark = g;
    this._canonSay('The light goes out.', '#90a4ae');
  },

  /** ...and the eclipse blazes. */
  _realmBlaze(r) {
    r.phase = 'blaze'; r.phaseT = 0; r.orbReady = true;
    if (r.dark) { const g = r.dark; r.dark = null; this.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() }); }
    try { this.cameras.main.flash(420, 255, 190, 110); } catch (e) { /* no camera in a headless probe */ }
    this._canonSay('The eclipse blazes.', '#fff59d');
  },

  // ==========================================================================
  // THE BEAM
  // ==========================================================================
  /** The beam fires by itself when the eclipse has blazed. It is a CHANNEL: the
   *  player is held where they stand, turns with their move input, and the beam
   *  follows -- orange, white and silver -- for beamSecs. Sprinting breaks out of
   *  it. "Using the beam ends the duration of this ability immediately": the zone,
   *  the limns and the lock end the moment it fires; the orb stays up for the
   *  beam's length. */
  _realmBeam(a, key, rank) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    const p = this.player, r = p.canonRealm;
    if (!r) return;
    // Aim at the nearest enemy in the zone; with none, the way the player faces.
    let ang = p.aimAngle;
    let best = null, bd = Infinity;
    for (const m of (this.monsters || [])) {
      if (!m.alive || m.person) continue;
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d < bd && d <= rt.beamRange) { bd = d; best = m; }
    }
    if (best) ang = Math.atan2(best.wy - this.world.y, best.wx - this.world.x);
    else if (typeof ang !== 'number' || Number.isNaN(ang)) { const f = moveFromFacing(p.facing || 'south') || { dx: 0, dy: 1 }; ang = Math.atan2(f.dy, f.dx); }
    p.aimAngle = ang;
    const f2 = facingFromMove(Math.cos(ang), Math.sin(ang)); if (f2) p.facing = f2;
    p.eclipseBeam = {
      t: rt.beamSecs, tickT: 0, absorbed: r.absorbed, rank, a, key,
      perTick: rt.beamPer * (this._canonPow ? this._canonPow(a, rank) : 1) * Math.max(1, r.absorbed) * rt.beamTick,
      orb: r.orb, orbGlow: r.orbGlow, orbGlow2: r.orbGlow2, g: null, ticks: 0,
    };
    r.orb = r.orbGlow = r.orbGlow2 = null;
    try { this.cameras.main.flash(260, 255, 245, 200); } catch (e) { /* headless */ }
    this._eclipseBeams = (this._eclipseBeams || 0) + 1;
    this._eclipseLastBeam = { absorbed: r.absorbed, perTick: Math.round(p.eclipseBeam.perTick), hits: 0, secs: rt.beamSecs };
    this._floatText(this.world.x, this.world.y - 56, `Eclipse ×${r.absorbed}`, '#fff59d');
    this._realmEnd(true, true);
  },

  /** While the beam is out: hold the player in place; their move input turns
   *  them (and the beam with them); sprint breaks the hold. Called from the
   *  player update with that frame's move vector; true means "movement handled". */
  _realmBeamHold(mx, my, dt) {
    const b = this.player && this.player.eclipseBeam;
    if (!b) return false;
    const moving = mx !== 0 || my !== 0;
    const sprint = !!((this.keys && this.keys.sprint && this.keys.sprint.isDown)
      || (this._padButtonDown && this.constructor.PAD && this._padButtonDown(this.constructor.PAD.L3)));
    if (moving && sprint) { this._eclipseBeamEnd('sprint'); return false; }
    this.player.sprinting = false;
    if (moving) {
      this.player.aimAngle = Math.atan2(my, mx);
      const f = facingFromMove(mx, my); if (f) this.player.facing = f;
    }
    return true;
  },

  _eclipseBeamEnd(why) {
    const p = this.player, b = p && p.eclipseBeam;
    if (!b) return;
    for (const k of ['g', 'orb', 'orbGlow', 'orbGlow2']) {
      const o = b[k]; if (!o) continue;
      if (this.tweens) this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() }); else o.destroy();
    }
    p.eclipseBeam = null;
    this._eclipseBeamEndedBy = why;
    if (why === 'sprint') this._canonSay('You tear free of the beam.', '#b0bec5');
  },

  /** Orange, white and silver: a wide orange glow, a silver body, a white-hot
   *  core, and pulses of the two colours running out from the player. */
  _drawEclipseBeam(b, ang) {
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    if (!this.add || !this.add.graphics) return;
    const g = b.g || (b.g = this.add.graphics());
    g.clear();
    const a0 = isoProject(this.world.x, this.world.y);
    const e0 = isoProject(this.world.x + Math.cos(ang) * rt.beamRange, this.world.y + Math.sin(ang) * rt.beamRange);
    const ax = a0.x, ay = a0.y - 26, ex = e0.x, ey = e0.y - 20;
    const now = (this.time && this.time.now) || 0;
    const breathe = 0.8 + 0.2 * Math.sin(now / 60);
    const line = (w, col, al) => { g.lineStyle(w, col, al); g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.strokePath(); };
    line(40 * breathe, 0xff9800, 0.28);
    line(22 * breathe, 0xcfd8dc, 0.55);
    line(9, 0xffffff, 0.95);
    for (let i = 0; i < 8; i++) {
      const u = ((now / 380) + i / 8) % 1;
      const x = ax + (ex - ax) * u, y = ay + (ey - ay) * u;
      g.fillStyle(i % 2 ? 0xff9800 : 0xcfd8dc, 0.8); g.fillCircle(x, y, 6);
      g.fillStyle(0xffffff, 0.9); g.fillCircle(x, y, 2.4);
    }
    g.fillStyle(0xff9800, 0.35); g.fillCircle(ax, ay, 11 * breathe);
    g.fillStyle(0xffffff, 0.6); g.fillCircle(ax, ay, 5);
    g.setDepth(isoDepth(Math.max(this.world.x, this.world.x + Math.cos(ang) * rt.beamRange), Math.max(this.world.y, this.world.y + Math.sin(ang) * rt.beamRange)) + 30000);
  },

  _tickEclipseBeam(dt) {
    const p = this.player, b = p && p.eclipseBeam;
    if (!b) return;
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    if (p.dead) { this._eclipseBeamEnd('death'); return; }
    b.t -= dt;
    const ang = typeof p.aimAngle === 'number' ? p.aimAngle : 0;
    this._drawEclipseBeam(b, ang);
    // the orb breathes while it fires
    const now = (this.time && this.time.now) || 0;
    if (b.orbGlow) b.orbGlow.setAlpha(0.55 + 0.25 * Math.sin(now / 110));
    if (b.orbGlow2) b.orbGlow2.setAlpha(0.55 + 0.25 * Math.sin(now / 110 + Math.PI));
    b.tickT -= dt;
    if (b.tickT <= 0) {
      b.tickT += rt.beamTick;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      let hits = 0;
      for (const m of (this.monsters || [])) {
        if (!m.alive || m.person) continue;
        const rx = m.wx - this.world.x, ry = m.wy - this.world.y;
        const along = rx * ux + ry * uy;
        if (along < 0 || along > rt.beamRange) continue;
        const across = Math.abs(rx * -uy + ry * ux);
        if (across > rt.beamWidth / 2 + ((m.type && m.type.radius) || 12)) continue;
        this._canonHurt(m, b.perTick, 'transcendent');
        hits++;
      }
      b.ticks++;
      if (this._eclipseLastBeam) this._eclipseLastBeam.hits += hits;
    }
    if (b.t <= 0) this._eclipseBeamEnd('done');
  },

  // ==========================================================================
  // EVERY FRAME
  // ==========================================================================
  _tickCanon6(rdt) {
    const dt = rdt;
    this._tickEclipseBeam(dt);
    this._moonClock = (this._moonClock || 0) + dt;   // the Pale Eye's own cycle (celestial.js)
    this._updateEyeMarks(dt);
    const p = this.player, r = p && p.canonRealm;
    if (!r) return;
    const rt = CANON_RT.realmOfTheInfiniteEclipse;
    const rank = r.rank;
    r.age += dt;
    r.t -= dt;
    if (r.t <= 0) { this._realmEnd(false); return; }
    const inZone = (x, y, pad = 0) => Math.hypot(x - r.x, y - r.y) <= r.r + pad;

    // SILVER: nothing that was inside gets out, by any means.
    if (reached(rank, 'silver')) {
      for (const m of (this.monsters || [])) {
        if (!m.alive || m._realmId !== r.id) continue;
        const d = Math.hypot(m.wx - r.x, m.wy - r.y);
        if (d > r.r) {
          const k = (r.r - 2) / d;
          m.wx = r.x + (m.wx - r.x) * k; m.wy = r.y + (m.wy - r.y) * k;
          if (m.sprite && m.sprite.active) { const q = isoProject(m.wx, m.wy); m.sprite.setPosition(q.x, q.y); }
          this._realmHeld = (this._realmHeld || 0) + 1;
        }
      }
    }

    // BRONZE: the 15-second ramp, one instance at a time, then dark, then the blaze.
    if (r.phase === 'ramp') {
      r.rampT += dt;
      // the eyes waiting to be consumed do not run out first
      for (const c of r.queue) { const d = c.m.alive && c.m.debuffs && c.m.debuffs[c.k]; if (d && d.t < 2) d.t = 2; }
      const due = Math.min(r.total, Math.floor(Math.min(1, r.rampT / rt.rampSecs) * r.total));
      while (r.slot < due) { r.slot++; this._realmConsumeOne(r); }
      if (r.rampT >= rt.rampSecs) { while (r.slot < r.total) { r.slot++; this._realmConsumeOne(r); } this._realmDark(r); }
    } else if (r.phase === 'dark') {
      r.phaseT += dt;
      if (r.phaseT >= rt.darkSecs) this._realmBlaze(r);
    } else if (r.phase === 'blaze') {
      r.phaseT += dt;
      if (r.phaseT >= rt.blazeSecs) { this._realmBeam(r.a, r.key, r.rank); return; }
    }
    this._realmOrb(r);

    r.tickT -= dt;
    if (r.tickT > 0) return;
    r.tickT = rt.tick;

    // The limns, and who counts as inside.
    for (const m of (this.monsters || [])) {
      if (!m.alive || m.person) continue;
      if (inZone(m.wx, m.wy)) {
        m._realmId = r.id;
        this._canonInflict(m, 'moonlitLimn');
      }
    }
    if (inZone(this.world.x, this.world.y)) this._applyDebuff(this.player, 'sunlitLimn', { fromPlayer: true, source: this.player });
    for (const mem of (this._activeParty ? this._activeParty() : [])) {
      if (!mem || mem.downT > 0 || mem.benched || !inZone(mem.x, mem.y)) continue;
      try { this._applyDebuff(mem, 'sunlitLimn', { fromPlayer: true, source: this.player, _companion: true }); } catch (e) { /* a member without a map */ }
    }
  },

  // ==========================================================================
  // WHAT THE EYES DO TO THEIR CARRIER
  // ==========================================================================
  /** [Pale Eye of the Moon]: "Damage dealt is decreased by 0-20%", zenith at the
   *  full moon. At the one door every monster blow walks through. */
  _moonDealtCut(m) {
    const map = m && m.debuffs;
    if (!map) return 0;
    let cut = 0;
    for (const k of Object.keys(map)) {
      const def = conditionDef(k);
      if (def && def.moonDown) cut = Math.max(cut, def.moonDown * moonPhaseAtClock(this._moonClock || 0).illum);
    }
    return cut;
  },

  /** [Burning Eye of the Sun]: "cannot be hidden from sight". */
  _eyeReveals(m) {
    const map = m && m.debuffs;
    if (!map) return false;
    return Object.keys(map).some(k => { const d = conditionDef(k); return d && d.revealed; });
  },

  /** The heat the Realm's sunlight adds to the player's own physical and
   *  projectile blows: a share of the blow, as fire. 0 when not limned. */
  _sunHeat() {
    const map = this.player && this.player.debuffs;
    const d = map && map.sunlitLimn;
    if (!d) return 0;
    const def = conditionDef('sunlitLimn');
    return def ? def.sunHeat || 0 : 0;
  },

  /** The realm's lights: a lamp, a torch or a lava glow inside the zone is out. */
  _realmFilterLights(lights) {
    const r = this.player && this.player.canonRealm;
    if (!r || !lights || !lights.length) return lights;
    const c = isoProject(r.x, r.y);
    const a = isoProject(r.x + r.r, r.y), b = isoProject(r.x, r.y + r.r);
    const rx = Math.max(Math.abs(a.x - c.x), Math.abs(b.x - c.x)), ry = Math.max(Math.abs(a.y - c.y), Math.abs(b.y - c.y));
    return lights.filter(L => {
      const nx = (L.sx - c.x) / Math.max(1, rx), ny = (L.sy - c.y) / Math.max(1, ry);
      return nx * nx + ny * ny > 1;
    });
  },

  // ==========================================================================
  // THE MARKS: orange for the sun, silver for the moon
  // ==========================================================================
  /** A glow in the colour of the eye's light over every carrier, and the Sun or
   *  the Moon over its head -- the moon on the frame the sky is on. */
  _updateEyeMarks(dt) {
    const st = (this._eyeMarks = this._eyeMarks || new Map());
    const want = new Set();
    const phase = moonPhaseAtClock(this._moonClock || 0);
    this._eyeSunT = (this._eyeSunT || 0) + dt;
    const sunFrame = Math.floor(this._eyeSunT / 0.17) % 8;
    for (const m of (this.monsters || [])) {
      if (!m.alive || !m.debuffs) continue;
      let kind = null;
      for (const k of EYE_KEYS) if (m.debuffs[k]) kind = kind || k;
      const lim = m.debuffs.moonlitLimn ? 'moonlitLimn' : null;
      if (!kind && !lim) continue;
      want.add(m);
      let mk = st.get(m);
      const spec = kind ? EYE_MARKS[kind] : { sheet: null, color: 0xb0bec5, radius: 52, alpha: 0.1 };
      if (!mk) {
        const q = isoProject(m.wx, m.wy);
        mk = { glow: this.add.circle(q.x, q.y, spec.radius, spec.color, spec.alpha).setBlendMode('ADD'), icon: null, kind };
        st.set(m, mk);
      }
      if (mk.kind !== kind) { mk.kind = kind; mk.glow.setFillStyle(spec.color, spec.alpha); mk.glow.setRadius(spec.radius); }
      const q = isoProject(m.wx, m.wy);
      mk.glow.setPosition(q.x, q.y - 14);
      mk.glow.setDepth(isoDepth(m.wx, m.wy) - 1);
      mk.glow.setScale(1 + 0.06 * Math.sin((this.time.now || 0) / 260));
      if (kind) {
        const sheet = `fx_celestial_${spec.sheet}`;
        if (!mk.icon && this.textures.exists(sheet)) {
          mk.icon = this.add.sprite(q.x, q.y - 54, sheet, 0).setScale(0.55);
        }
        if (mk.icon) {
          if (mk.iconSheet !== sheet) { mk.icon.setTexture(sheet); mk.iconSheet = sheet; }
          mk.icon.setFrame(spec.sheet === 'moon' ? phase.frame : sunFrame);
          mk.icon.setPosition(q.x, q.y - 54 - ((m.type && m.type.radius) || 0) * 0.4);
          mk.icon.setDepth(isoDepth(m.wx, m.wy) + 5);
        }
      } else if (mk.icon) { mk.icon.destroy(); mk.icon = null; }
    }
    for (const [m, mk] of st) {
      if (want.has(m)) continue;
      mk.glow.destroy(); if (mk.icon) mk.icon.destroy();
      st.delete(m);
    }
  },
};
