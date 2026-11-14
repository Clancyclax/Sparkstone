// ===========================================================================
// ROUND 358 -- THE RITUAL STAGE: what a rite looks, sounds and feels like.
//
// One stage for every rite: the essence rituals (ritualMixin.js), the reading
// rites and the Deepening Rite (skillBookMixin.js) and the theory deepening
// (ritualTheoryMixin.js). Each calls `_stageBegin` when it starts,
// `_stageTick(dt, tLeft)` every frame it runs and `_stageEnd(done)` when it
// lands or breaks. The stage owns:
//
//   - the THEME (ritualStage.js), chosen from the essence and stone by name;
//   - the MUSIC, held by `_riteMusic` until the player leaves the room the
//     rite began in, or begins another (outdoors: a minute after it ends);
//   - the PICTURE, which grows with the rite: a colour over the screen, a
//     light added on top, and the theme's own marks on the ground and in the
//     air (flames, beams, gears, vines, blades ...), plus, for darkness, a dark
//     that closes in until only the player is left;
//   - the CHANT, a line at a time, a word at a time, across the thirty seconds;
//   - the DRAIN (1.2, 1.3): mana, stamina and/or life drawn evenly as the rite
//     runs, never to zero.
// ===========================================================================

import Phaser from '../../public/vendor/phaser.esm.min.js';
import {
  RITE_THEMES, RITE_MUSIC_TAIL_S, riteFloor, drainStep, chantAt, wordsSaid, riteIntensity,
} from '../data/ritualStage.js';
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { roomTileCentre } from '../data/interiors.js';
import { fxFamilyInfo } from '../data/spellFx.js';   // ROUND 387 -- the fx3 fire sheets' timing
import { RITUAL_CIRCLES_HD } from '../data/cityProps.js';   // ROUND 388 -- the sharp ritual circle art
import { CELESTIAL_SHEETS } from '../data/celestialFx.js';   // ROUND 388 -- the sun and moon sheets

const D_VEIL = 900010, D_GLOW = 900011, D_VIGN = 900012, D_DARK = 900013, D_SKY = 900014, D_TEXT = 1_999_000;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0; return (s >>> 8) / 16777216; };
}
const lerp = (a, b, t) => a + (b - a) * t;
// ROUND 388 -- the HD circle under each theme (chalk tinted to the accent; the sun's gold; the moon's silver), and its
// drawn extent in the 320px cell (cityProps.js: chalk 264 wide, gold 240, silver 200; feet at oy).
const RITE_HD_FRAME = { sun: 'ritualCircleGold', light: 'ritualCircleGold', clockwork: 'ritualCircleGold',
  moon: 'ritualCircleSilver', frost: 'ritualCircleSilver', lightning: 'ritualCircleSilver', mystic: 'ritualCircleSilver' };
const RITE_HD_SPAN = { ritualCircleChalk: { w: 264, oy: 0.656 }, ritualCircleGold: { w: 240, oy: 0.7 }, ritualCircleSilver: { w: 200, oy: 0.6625 } };
const clamp01 = (x) => Math.max(0, Math.min(1, x));

export const RitualStageMixin = {
  // ---- textures ----------------------------------------------------------------------------------------------------
  _ensureRiteTextures() {
    if (this.textures.exists('riteGlow')) return;
    const mk = (key, w, h, paint) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      paint(c.getContext('2d'), w, h); this.textures.addCanvas(key, c);
    };
    mk('riteGlow', 256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    mk('riteVignette', 512, 512, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w * 0.72);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    mk('riteHole', 512, 512, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    mk('riteHorizon', 32, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  },

  // ---- begin / tick / end ------------------------------------------------------------------------------------------
  /**
   * spec: { theme, total, x, y, name, chant: [lines], drain: {mana, stamina, hp}, combat, book }
   */
  _stageBegin(spec) {
    this._stageClear(true);
    this._ensureRiteTextures();
    const theme = RITE_THEMES[spec.theme] ? spec.theme : 'generic';
    const room = this._insideRoom;
    const s = this._stage = {
      ...spec, theme, T: RITE_THEMES[theme], k: 0, kDrained: 0, seed: (Math.random() * 1e9) | 0,
      roomId: room ? room.id : null, shakeAt: 0,
    };
    s.spots = this._stageSpots(s);
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    s.veil = this.add.rectangle(0, 0, W, H, s.T.veil[0], 1).setOrigin(0, 0).setScrollFactor(0).setDepth(D_VEIL).setAlpha(0);
    s.glow = this.add.rectangle(0, 0, W, H, s.T.glow[0], 1).setOrigin(0, 0).setScrollFactor(0).setDepth(D_GLOW).setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    s.vign = this.add.image(W / 2, H / 2, 'riteVignette').setScrollFactor(0).setDepth(D_VIGN).setAlpha(0).setTint(s.T.veil[0]);
    s.back = this.add.graphics();
    s.front = this.add.graphics();
    s.addBack = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    s.addFront = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    s.ground = this.add.graphics();
    s.sky = this.add.graphics().setScrollFactor(0).setDepth(D_SKY);
    s.light = this.add.image(0, 0, 'riteGlow').setBlendMode(Phaser.BlendModes.ADD).setTint(s.T.glow[0]).setAlpha(0);
    s.horizon = theme === 'sun'
      ? this.add.image(0, H, 'riteHorizon').setOrigin(0, 1).setScrollFactor(0).setDepth(D_GLOW).setDisplaySize(W, H * 0.7)
        .setBlendMode(Phaser.BlendModes.ADD).setTint(0xff8a3a).setAlpha(0)
      : null;
    s.text = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '26px', fontStyle: 'italic', color: s.T.text, stroke: '#000', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(D_TEXT).setAlpha(0);
    s.textPrev = this.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'italic', color: s.T.text, stroke: '#000', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(D_TEXT).setAlpha(0);
    // The music. A new rite replaces whatever rite music was playing.
    this._riteMusic = { theme, roomId: s.roomId, until: Infinity };
    try { if (this._updateAudio) this._updateAudio(0); } catch (e) { /* the mixer will catch up within a second */ }
    return s;
  },

  /** Places around the rite where the theme's marks stand: a ring about the circle, and inside a room, its edges. */
  _stageSpots(s) {
    const out = [];
    const r = rng(s.seed);
    const ring = 8;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + 0.2;
      out.push({ x: s.x + Math.cos(a) * 82, y: s.y + Math.sin(a) * 82, ring: true, a, at: 0.04 + i * 0.035, j: r() });
    }
    const room = this._insideRoom;
    if (room && room.w && room.h) {
      const edge = [];
      for (let tx = 1; tx < room.w - 1; tx += 2) { edge.push([tx, 1]); edge.push([tx, room.h - 2]); }
      for (let ty = 3; ty < room.h - 2; ty += 2) { edge.push([1, ty]); edge.push([room.w - 2, ty]); }
      let n = 0;
      for (const [tx, ty] of edge) {
        const c = roomTileCentre(room, tx, ty);
        if (Math.hypot(c.x - s.x, c.y - s.y) < 110) continue;
        if (this._collidesObstacle && this._collidesObstacle(c.x, c.y)) continue;
        // not on the furniture: a braziers' or a statue's footprint is no place for a flame
        if ((this.interiorSolids || []).some(o => o.room === room.id && Math.hypot(o.x - c.x, o.y - c.y) < (o.radius || 16) + 18)) continue;
        out.push({ x: c.x, y: c.y, ring: false, at: 0.3 + (n++ % 24) * 0.02, j: r() });
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + r() * 0.4;
        const d = 170 + r() * 90;
        out.push({ x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, ring: false, at: 0.3 + i * 0.03, j: r() });
      }
    }
    return out;
  },

  /** Every frame the rite runs. `tLeft` is the seconds still to go. */
  _stageTick(dt, tLeft) {
    const s = this._stage;
    if (!s) return;
    const k = clamp01(1 - tLeft / Math.max(0.001, s.total));
    s.k = k;
    this._stageDrain(s, k);
    this._stageDraw(s, k);
  },

  _stageDrain(s, k) {
    const p = this.player;
    const dk = k - s.kDrained;
    if (!p || !s.drain || dk <= 0) return;
    s.kDrained = k;
    const d = s.drain;
    if (d.mana && p.maxMana > 0) p.mana = drainStep(p.mana, p.maxMana, d.mana, dk, riteFloor(p.maxMana, s.combat));
    if (d.stamina && p.maxStamina > 0) p.stamina = drainStep(p.stamina, p.maxStamina, d.stamina, dk, riteFloor(p.maxStamina, s.combat));
    if (d.hp && p.maxHp > 0) p.hp = drainStep(p.hp, p.maxHp, d.hp, dk, riteFloor(p.maxHp, s.combat));
  },

  /** The rite is over: `done` it landed, otherwise it broke. The picture fades; the music stays. */
  _stageEnd(done) {
    const s = this._stage;
    if (!s) return;
    this._stage = null;
    if (this._riteMusic && !this._riteMusic.roomId) this._riteMusic.until = this.time.now + RITE_MUSIC_TAIL_S * 1000;
    if (done) {
      const c = Phaser.Display.Color.IntegerToColor(s.T.glow[0]);
      try { this.cameras.main.flash(420, c.red, c.green, c.blue, true); } catch (e) { /* none */ }
      try { this.cameras.main.shake(260, 0.004, true); } catch (e) { /* none */ }
      if (!s.book && this._bookRiteBurst) this._bookRiteBurst(s.x, s.y, '#' + s.T.accent.toString(16).padStart(6, '0'));
      this._stageClimax(s);
    }
    this._stageFade(s, done ? 1600 : 700);
  },

  _stageClimax(s) {
    const cam = this.cameras.main;
    const z = cam.zoom || 1;
    const t = this.add.text(0, 0, s.T.climax, {
      fontFamily: 'Georgia, serif', fontSize: '42px', fontStyle: 'bold italic', color: s.T.text, stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(D_TEXT + 1);
    const sx = cam.width / 2, sy = cam.height * 0.26;
    t.setPosition((sx - cam.width / 2) / z + cam.width / 2, (sy - cam.height / 2) / z + cam.height / 2).setScale(0.8 / z);
    this.tweens.add({ targets: t, scale: 1.15 / z, alpha: 0, delay: 900, duration: 1300, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
  },

  _stageFade(s, ms) {
    const objs = ['veil', 'glow', 'vign', 'back', 'front', 'addBack', 'addFront', 'ground', 'sky', 'light', 'horizon', 'text', 'textPrev', 'darkRT', 'circleImg']
      .map(k => s[k]).concat(s.fires || []).filter(Boolean);   // ROUND 387 -- and the flames (388: every theme's sprites, the HD circle)
    this.tweens.add({ targets: objs, alpha: 0, duration: ms, ease: 'Quad.easeIn', onComplete: () => objs.forEach(o => { try { o.destroy(); } catch (e) { /* gone */ } }) });
  },

  /** Drop the stage at once (a new rite, a scene change). */
  _stageClear(keepMusic) {
    const s = this._stage;
    if (s) {
      for (const k of ['veil', 'glow', 'vign', 'back', 'front', 'addBack', 'addFront', 'ground', 'sky', 'light', 'horizon', 'text', 'textPrev', 'darkRT', 'circleImg']) {
        if (s[k]) { try { s[k].destroy(); } catch (e) { /* gone */ } }
      }
      for (const o of (s.fires || [])) { try { if (o) o.destroy(); } catch (e) { /* gone */ } }   // ROUND 387 (388: all themes' sprites)
      this._stage = null;
    }
    if (!keepMusic) this._riteMusic = null;
  },

  /** The ritual track that should be playing, or null (read by `_audioContext`). */
  _ritualMusicNow() {
    const m = this._riteMusic;
    if (!m) return null;
    const room = this._insideRoom;
    if (m.roomId) {
      if (!room || room.id !== m.roomId) { this._riteMusic = null; return null; }
      return m.theme;
    }
    if (room || this.time.now > m.until) { this._riteMusic = null; return null; }
    return m.theme;
  },

  // ---- the picture -----------------------------------------------------------------------------------------------
  _stageDraw(s, k) {
    const I = riteIntensity(k);
    const now = this.time.now / 1000;
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height;
    const f = isoProject(s.x, s.y);
    const d0 = isoDepth(s.x, s.y);
    const room = this._insideRoom;
    s.back.clear(); s.front.clear(); s.addBack.clear(); s.addFront.clear(); s.ground.clear(); s.sky.clear();
    s.back.setDepth(d0 - 6); s.addBack.setDepth(d0 - 5);
    s.front.setDepth(d0 + 6); s.addFront.setDepth(d0 + 7);
    s.ground.setDepth(room ? isoDepth(room.x, room.y) - 49000 : 2);
    s.d0 = d0;   // ROUND 388 -- the themes' sprites sort against the circle like the graphics do
    // the screen
    const flick = s.theme === 'fire' ? 0.85 + 0.15 * Math.sin(now * 11) * Math.sin(now * 7.3) : 1;
    for (const o of [s.veil, s.glow]) o.setSize(W, H);
    s.veil.setAlpha(s.T.veil[1] * I);
    s.glow.setAlpha(s.T.glow[1] * I * flick);
    s.vign.setPosition(W / 2, H / 2).setDisplaySize(W * 1.05, H * 1.05).setAlpha(Math.min(0.85, 0.25 + 0.6 * I) * (s.theme === 'light' || s.theme === 'sun' ? 0.25 : 1));
    // the rite's own light at the circle
    // behind the caster: it lights the floor and the room around them, it does not white them out
    s.light.setPosition(f.x, f.y - 10).setDepth(d0 - 7).setScale((200 + 560 * I) / 256).setAlpha((0.2 + 0.45 * I) * flick);
    // the circle on the ground (a book rite draws its own)
    if (!s.book) this._stageCircle(s, f, k, now);
    const draw = this[`_stage_${s.theme}`] || this._stage_generic;
    draw.call(this, s, k, I, now, f, W, H);
    this._stageChant(s, k);
  },

  _stageCircle(s, f, k, now) {
    const g = s.ground, col = s.T.accent;
    const R = 58, RY = 29;
    // ROUND 388 -- "every rite's ground circle should use the HD ritual circle": the 4x circle art (cityProps.js
    // RITUAL_CIRCLES_HD) at the drawn circle's size, brightening as the rite fills; only the progress arc is still
    // drawn over it, because that is the rite's clock. The drawn rings are the fallback when the sheet is not loaded.
    if (this.textures.exists(RITUAL_CIRCLES_HD.key)) {
      const fr = RITE_HD_FRAME[s.theme] || 'ritualCircleChalk', span = RITE_HD_SPAN[fr];
      if (!s.circleImg || !s.circleImg.active) {
        s.circleImg = this.add.image(0, 0, RITUAL_CIRCLES_HD.key, RITUAL_CIRCLES_HD.frames[fr]).setOrigin(0.5, span.oy);
        if (fr === 'ritualCircleChalk') s.circleImg.setTint(col);
      }
      const sc = (R * 2) / span.w;
      s.circleImg.setPosition(f.x, f.y).setScale(sc, sc * 0.6).setDepth(g.depth + 1).setAlpha(0.55 + 0.45 * k)
        .setRotation(0);
      g.lineStyle(3, col, 0.95); g.beginPath();
      const st = Math.max(2, Math.round(72 * k));
      for (let i = 0; i <= st; i++) {
        const a = -Math.PI / 2 + (i / 72) * Math.PI * 2;
        const x = f.x + Math.cos(a) * R * 1.06, y = f.y + Math.sin(a) * RY * 1.06;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
      return;
    }
    g.fillStyle(col, 0.06 + 0.12 * k); g.fillEllipse(f.x, f.y, R * 2, RY * 2);
    g.lineStyle(2, col, 0.45 + 0.4 * k); g.strokeEllipse(f.x, f.y, R * 2, RY * 2);
    g.lineStyle(1, col, 0.4); g.strokeEllipse(f.x, f.y, R * 1.35, RY * 1.35);
    g.lineStyle(3, col, 0.95); g.beginPath();
    const steps = Math.max(2, Math.round(72 * k));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / 72) * Math.PI * 2;
      const x = f.x + Math.cos(a) * R, y = f.y + Math.sin(a) * RY;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    const spin = now * 0.5;
    g.lineStyle(1.5, col, 0.6);
    for (let tri = 0; tri < 2; tri++) {
      g.beginPath();
      for (let i = 0; i <= 3; i++) {
        const a = spin + tri * Math.PI / 3 + i * (Math.PI * 2 / 3);
        const x = f.x + Math.cos(a) * R * 0.86, y = f.y + Math.sin(a) * RY * 0.86;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
  },

  _stageChant(s, k) {
    const lines = s.chant || [];
    const cam = this.cameras.main;
    const z = cam.zoom || 1;
    const at = (sx, sy) => ({ x: (sx - cam.width / 2) / z + cam.width / 2, y: (sy - cam.height / 2) / z + cam.height / 2 });
    if (!lines.length || k >= 0.9) {
      s.text.setAlpha(Math.max(0, s.text.alpha - 0.05)); s.textPrev.setAlpha(Math.max(0, s.textPrev.alpha - 0.05));
      return;
    }
    const { i, f } = chantAt(lines, k);
    const said = wordsSaid(lines[i], f);
    if (s.text.text !== said) s.text.setText(said);
    const big = 1 + 0.35 * k;
    const p = at(cam.width / 2, cam.height * 0.2);
    s.text.setPosition(p.x, p.y).setScale(big / z).setAlpha(Math.min(1, 0.35 + f * 3) * (0.75 + 0.25 * k));
    const prev = i > 0 ? lines[i - 1] : '';
    if (s.textPrev.text !== prev) s.textPrev.setText(prev);
    const q = at(cam.width / 2, cam.height * 0.2 - 36 * big);
    s.textPrev.setPosition(q.x, q.y).setScale(1 / z).setAlpha(prev ? Math.max(0, 0.45 - f * 0.45) : 0);
  },

  // ---- ROUND 358 (item 8): the way out of a room is a beam of light, not a wooden mat ------------------------------
  _ensureExitTextures() {
    if (this.textures.exists('exitPool')) return;
    const mk = (key, w, h, paint) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      paint(c.getContext('2d'), w, h); this.textures.addCanvas(key, c);
    };
    mk('exitPool', 128, 64, (g, w, h) => {
      g.save(); g.scale(1, h / w);
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w); g.restore();
    });
    mk('exitBeam', 32, 128, (g, w, h) => {
      for (let y = 0; y < h; y++) {
        const v = Math.pow(y / h, 0.75);           // nothing at the top, full at the floor
        const gr = g.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${v.toFixed(3)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, y, w, 1);
      }
    });
  },

  _drawExitGlow(room, x, y) {
    this._ensureExitTextures();
    const p = isoProject(x, y);
    const d = isoDepth(x, y);
    const pool = this.add.image(p.x, p.y, 'exitPool').setDisplaySize(TILE * 2.6, TILE * 1.3)
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe9a8).setAlpha(0.7).setDepth(d - 50000);
    const beam = this.add.image(p.x, p.y + 4, 'exitBeam').setOrigin(0.5, 1).setDisplaySize(36, 130)
      .setBlendMode(Phaser.BlendModes.ADD).setTint(0xffe9a8).setAlpha(0.6).setDepth(d - 1);
    const motes = [];
    for (let i = 0; i < 5; i++) {
      motes.push(this.add.circle(p.x, p.y, 1.3, 0xfff8e1, 0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(d - 1));
    }
    for (const o of [pool, beam, ...motes]) this.interiorSprites.push(this._tagRoom(o, room));
    (this._exitGlows = this._exitGlows || []).push({ pool, beam, motes, x: p.x, y: p.y, seed: Math.random() * 10 });
  },

  _tickExitGlows() {
    const list = this._exitGlows;
    if (!list || !list.length) return;
    const now = this.time.now / 1000;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.beam.active || !e.beam.scene) { list.splice(i, 1); continue; }
      if (!e.beam.visible) continue;
      const b = 0.5 + 0.5 * Math.sin(now * 1.6 + e.seed);
      e.pool.setAlpha(0.6 + 0.25 * b);
      e.beam.setAlpha(0.5 + 0.3 * b);
      e.motes.forEach((m, j) => {
        const ph = (now * 0.35 + j / e.motes.length + e.seed) % 1;
        m.setPosition(e.x + Math.sin(now * 1.3 + j * 2.1) * 8, e.y - 4 - ph * 110);
        m.setAlpha((1 - ph) * 0.85);
      });
    }
  },

  // ---- the themes --------------------------------------------------------------------------------------------------
  // Each draws into s.back / s.front (normal, behind and in front of the player), s.addBack / s.addFront (additive light),
  // s.ground (flat on the floor) and s.sky (fixed to the screen). (dx, dy) world offsets go through isoProject.

  _stage_fire(s, k, I, now, f) {
    // ROUND 387 -- "use the many many animations of fire that we already have in game rather than shaking triangles":
    // each flame is the fx3 fire art (a `firewall` pillar round the room, a low `firepath` lick on the ring), looping,
    // growing with the rite. The floor glow under each stays, because that is light, not flame.
    let nf = 0;
    for (const sp of s.spots) {
      if (k < sp.at) continue;
      const grow = clamp01((k - sp.at) * 6);
      const p = isoProject(sp.x, sp.y);
      const fam = sp.ring ? 'firepath' : 'firewall';
      const sc = sp.ring ? (0.45 + 0.3 * I) * (0.35 + 0.65 * grow) : (0.45 + 0.5 * I) * (0.3 + 0.7 * grow);
      this._stageFlame(s, nf++, fam, 'orange', sp.x, sp.y, sc, isoDepth(sp.x, sp.y) + 2, now + sp.j * 3, Math.min(1, grow * 1.5));
      const w = (sp.ring ? 6 : 8) * (0.6 + 0.6 * grow);
      s.ground.fillStyle(0xff6a00, 0.18 * grow); s.ground.fillEllipse(p.x, p.y, w * 7, w * 3.5);
    }
    // the centre: a pillar of fire rising behind the caster
    if (k > 0.55) {
      const g = clamp01((k - 0.55) * 3);
      this._stageFlame(s, nf++, 'firewall', 'orange', s.x - 6, s.y - 6, 0.7 + 1.1 * g * I, isoDepth(s.x, s.y) - 6, now, Math.min(1, g * 2));
    }
    this._stageFlamesHide(s, nf);
    // embers
    const n = Math.round(14 + 50 * I);
    for (let i = 0; i < n; i++) {
      const ph = (now * (0.35 + (i % 5) * 0.06) + i / n) % 1;
      const a = i * 2.399;
      const rad = 30 + ((i * 53) % 160);
      const x = f.x + Math.cos(a) * rad + Math.sin(now * 2 + i) * 8, y = f.y + Math.sin(a) * rad * 0.5 - ph * (90 + 120 * I);
      s.addFront.fillStyle(i % 3 ? 0xffa040 : 0xffe080, (1 - ph) * 0.9); s.addFront.fillCircle(x, y, 1.2 + (i % 3) * 0.6);
    }
  },

  /** ROUND 387 -- flame `i` of the rite: an fx3 sheet's sprite, made once and reused every frame, its frame stepped by
   *  the sheet's own timing. Falls back to nothing (the glow still burns) if the sheet has not loaded. */
  _stageFlame(s, i, family, color, wx, wy, scale, depth, t, alpha) {
    s.fires = s.fires || [];
    const key = `fx_${family}_${color}`;
    if (!this.textures.exists(key)) return null;
    const info = fxFamilyInfo(family);
    let spr = s.fires[i];
    if (!spr || !spr.active) {
      spr = this.add.sprite(0, 0, key, 0).setOrigin(0.5, 0.94);
      s.fires[i] = spr;
    } else if (spr.texture.key !== key) spr.setTexture(key, 0);
    const p = isoProject(wx, wy);
    const frames = (info && info.frames) || 14, ms = (info && info.frameMs) || 60;
    spr.setPosition(p.x, p.y).setScale(scale * ((info && info.scale) || 1)).setDepth(depth).setAlpha(alpha).setVisible(true);
    spr.setFrame(Math.floor((t * 1000) / ms) % frames);
    return spr;
  },
  _stageFlamesHide(s, from) {
    for (let i = from; i < (s.fires || []).length; i++) if (s.fires[i]) s.fires[i].setVisible(false);
  },

  /** ROUND 388 -- the loaded key for an fx sheet in a colour (falling back to the family's own colour), with its
   *  timing, or null when it is not loaded (the theme then draws its old shapes). `celestial_<name>` for the sky. */
  _stageSheet(family, color) {
    const cel = /^celestial_(\w+)$/.exec(family);
    if (cel) {
      const c = CELESTIAL_SHEETS[cel[1]], key = `fx_${family}`;
      return c && this.textures.exists(key) ? { key, frames: c.frames, ms: 110, cell: c.cell, cellH: c.cell } : null;
    }
    const info = fxFamilyInfo(family);
    if (!info) return null;
    let key = `fx_${family}_${color}`;
    if (!this.textures.exists(key)) key = `fx_${family}_${info.native}`;
    if (!this.textures.exists(key)) return null;
    return { key, frames: info.frames || 1, ms: info.frameMs || 60, cell: info.cell, cellH: info.cellH || info.cell,
      anchor: info.anchor, oy: info.oy, scale: info.scale || 1, bx0: info.bx0, bx1: info.bx1 };
  },

  /** ROUND 388 -- sprite `i` of the rite's art (the same pool as the flames, s.fires, so _stageFade and _stageClear
   *  already take it), made once and reused every frame, at a SCREEN point. o: { sx, sy, ox, oy, rot, add, depth,
   *  alpha, t (seconds on its clock), frame (a fixed frame), once (hold the last frame instead of looping) }. */
  _stageArt(s, i, sh, x, y, o) {
    s.fires = s.fires || [];
    let spr = s.fires[i];
    if (!spr || !spr.active) { spr = this.add.sprite(0, 0, sh.key, 0); s.fires[i] = spr; }
    else if (spr.texture.key !== sh.key) spr.setTexture(sh.key, 0);
    const oy = o.oy != null ? o.oy : (sh.anchor === 'ground' ? 0.94 : (sh.anchor === 'flat' && sh.oy != null ? sh.oy : 0.5));
    spr.setOrigin(o.ox != null ? o.ox : 0.5, oy).setPosition(x, y)
      .setScale(o.sx != null ? o.sx : 1, o.sy != null ? o.sy : (o.sx != null ? o.sx : 1))
      .setRotation(o.rot || 0).setDepth(o.depth).setAlpha(o.alpha != null ? Math.max(0, Math.min(1, o.alpha)) : 1).setVisible(true);
    const blend = o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL;
    if (spr.blendMode !== blend) spr.setBlendMode(blend);
    let fr = o.frame;
    if (fr == null) { const n = Math.floor(((o.t || 0) * 1000) / sh.ms); fr = o.once ? Math.min(sh.frames - 1, n) : n % sh.frames; }
    spr.setFrame(Math.max(0, fr));
    return spr;
  },

  _stage_dark(s, k, I, now, f, W, H) {
    const cam = this.cameras.main;
    if (!s.darkRT) {
      s.darkRT = this.add.renderTexture(0, 0, W, H).setOrigin(0, 0).setScrollFactor(0).setDepth(D_DARK);
      s.darkBrush = this.make.image({ key: 'riteHole', add: false }).setOrigin(0.5, 0.5);
    }
    const rt = s.darkRT;
    if (rt.width !== W || rt.height !== H) rt.setSize(W, H);
    rt.clear();
    // The dark gathers from the edges inward until only the player stands in it.
    const e = k * k * (3 - 2 * k);
    const reach = Math.hypot(W, H) * 0.75;
    const r = lerp(reach, 46, e);
    const a = Math.min(0.97, 0.15 + 1.1 * k);
    rt.fill(0x000000, a);
    s.darkBrush.setPosition(f.x - cam.scrollX, f.y - 26 - cam.scrollY).setScale((r * 2) / 512).setAlpha(1);
    rt.erase(s.darkBrush);
    if (rt.render) rt.render();
    s.vign.setTint(0x000000);
    // wisps creeping in towards the circle
    const n = Math.round(10 + 36 * I);
    for (let i = 0; i < n; i++) {
      const ph = (now * 0.18 + i / n) % 1;
      const ang = i * 2.399 + now * 0.1;
      const rad = lerp(320, 50, ph);
      const x = f.x + Math.cos(ang) * rad, y = f.y + Math.sin(ang) * rad * 0.5 - 10;
      const g = Math.sin(ang) < 0 ? s.back : s.front;
      g.fillStyle(0x12061e, 0.55 * ph); g.fillCircle(x, y, 6 + 10 * ph);
      g.fillStyle(0x6a3d9a, 0.25 * ph); g.fillCircle(x, y - 2, 2 + 3 * ph);
    }
    s.light.setTint(0x6a3d9a).setAlpha(0.25 * (1 - k));
  },

  _stage_light(s, k, I, now, f) {
    // ROUND 388 -- the columns of light are the fx3 `healpillar` (gold; the great one at the end white), additive,
    // stretched to the old columns' height; the drawn bars are the fallback when the sheet is not loaded.
    const pil = this._stageSheet('healpillar', 'gold'), big = this._stageSheet('healpillar', 'white');
    let ni = 0;
    const n = 2 + Math.floor(12 * I);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + now * 0.18;
      const rad = 92 + 40 * Math.sin(i * 1.7);
      const x = f.x + Math.cos(a) * rad, y = f.y + Math.sin(a) * rad * 0.5;
      const g = Math.sin(a) < 0 ? s.addBack : s.addFront;
      const pulse = 0.75 + 0.25 * Math.sin(now * 3 + i * 1.3);
      if (pil) {
        const sx = 0.55 + 0.3 * I;
        this._stageArt(s, ni++, pil, x, y + 3, { sx, sy: sx * (1.6 + 2.6 * I), add: true, depth: s.d0 + (Math.sin(a) < 0 ? -5 : 7),
          alpha: pulse * (0.45 + 0.55 * I), t: now + i * 0.37 });
        continue;
      }
      const top = y - 460;
      for (const [w, al] of [[26, 0.10], [14, 0.22], [5, 0.55]]) {
        g.fillStyle(0xffe082, al * pulse * (0.4 + 0.6 * I)); g.fillRect(x - w / 2, top, w, y - top);
      }
      s.ground.fillStyle(0xfff3c4, 0.25 * pulse); s.ground.fillEllipse(x, y, 40, 18);
    }
    // the great column on the caster at the end
    if (k > 0.7) {
      const g = clamp01((k - 0.7) * 3.3);
      if (big) this._stageArt(s, ni++, big, f.x, f.y + 4, { sx: 1 + 0.9 * g, sy: (1 + 0.9 * g) * 3.2, add: true, depth: s.d0 + 7, alpha: g, t: now });
      else for (const [w, al] of [[90, 0.08], [50, 0.16], [18, 0.4]]) { s.addFront.fillStyle(0xfff3c4, al * g); s.addFront.fillRect(f.x - w / 2, f.y - 520, w, 520); }
    }
    this._stageFlamesHide(s, ni);
    for (let i = 0; i < 40; i++) {
      const ph = (now * 0.25 + i / 40) % 1;
      const a = i * 2.399, rad = 20 + (i * 37) % 150;
      s.addFront.fillStyle(0xfff8e1, (1 - ph) * 0.8 * I); s.addFront.fillCircle(f.x + Math.cos(a) * rad, f.y + Math.sin(a) * rad * 0.5 - ph * 140, 1.6);
    }
  },

  _stage_sun(s, k, I, now, f, W, H) {
    s.horizon.setDisplaySize(W, H * 0.75).setPosition(0, H).setAlpha(0.15 + 0.5 * I);
    const cy = f.y - 60 - 190 * k, cx = f.x;
    const R = 16 + 26 * I;
    // ROUND 388 -- the sun is the celestial `sun` sheet with the fx2 `pulse` (gold, additive) for its corona, and the
    // warm light on the stones is the fx3 `circle1` in gold, flat; the drawn disc, rays and pools are the fallback.
    const sun = this._stageSheet('celestial_sun'), halo = this._stageSheet('pulse', 'gold'), pool = this._stageSheet('circle1', 'gold');
    if (sun) {
      let ni = 0;
      if (halo) this._stageArt(s, ni++, halo, cx, cy, { sx: (R * 4.2) / 100, add: true, depth: s.d0 - 7, alpha: 0.35 + 0.45 * I, t: now, rot: now * 0.25 });
      this._stageArt(s, ni++, sun, cx, cy, { sx: (R * 2.4) / 56, depth: s.d0 - 6, t: now });
      for (const sp of s.spots) {
        if (k < sp.at) continue;
        const p = isoProject(sp.x, sp.y);
        if (pool) this._stageArt(s, ni++, pool, p.x, p.y, { sx: 46 / 138, add: true, depth: s.ground.depth + 2, alpha: 0.5 * clamp01((k - sp.at) * 4), t: now + sp.j * 2 });
        else { s.ground.fillStyle(0xffb74d, 0.18 * clamp01((k - sp.at) * 4)); s.ground.fillEllipse(p.x, p.y, 46, 22); }
      }
      this._stageFlamesHide(s, ni);
      return;
    }
    const rays = 18;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2 + now * 0.25;
      const L = R + 50 + 160 * I * (0.7 + 0.3 * Math.sin(now * 2 + i));
      const w = 0.06;
      s.addBack.fillStyle(0xffc46b, 0.22 + 0.25 * I);
      s.addBack.fillTriangle(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R, cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
    }
    s.addBack.fillStyle(0xff8a3a, 0.5); s.addBack.fillCircle(cx, cy, R * 1.6);
    s.addBack.fillStyle(0xffd27a, 0.9); s.addBack.fillCircle(cx, cy, R);
    s.addBack.fillStyle(0xfff3d0, 1); s.addBack.fillCircle(cx, cy, R * 0.6);
    // long dawn shadows give way: warm light washing the ground
    for (const sp of s.spots) {
      if (k < sp.at) continue;
      const p = isoProject(sp.x, sp.y);
      s.ground.fillStyle(0xffb74d, 0.18 * clamp01((k - sp.at) * 4)); s.ground.fillEllipse(p.x, p.y, 46, 22);
    }
  },

  _stage_moon(s, k, I, now, f, W, H) {
    // the stars come out across the whole sky
    const r = rng(s.seed + 7);
    const n = 110;
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, b = r(), ap = (i / n) * 0.75;
      if (k < ap) continue;
      const tw = 0.55 + 0.45 * Math.sin(now * (1.5 + b * 3) + i);
      const a = clamp01((k - ap) * 5) * tw;
      s.sky.fillStyle(b > 0.85 ? 0xc5cae9 : 0xffffff, a * 0.9); s.sky.fillCircle(x, y, b > 0.9 ? 2 : 1.1);
      if (b > 0.93) { s.sky.lineStyle(1, 0xffffff, a * 0.5); s.sky.lineBetween(x - 4, y, x + 4, y); s.sky.lineBetween(x, y - 4, x, y + 4); }
    }
    // the moon fills above the caster; at the end the shadow crosses it
    const mx = f.x + 10, my = f.y - 170, R = 18 + 18 * I;
    // ROUND 388 -- the celestial `moon` sheet (its phases: waxing to full with the rite, then the shadow crossing it
    // from frame 7 to the new moon at 14), an additive silver `pulse` for its light, and the pool on the circle the fx3
    // `circle2` in silver; the drawn discs are the fallback when the sheet is not loaded.
    const moon = this._stageSheet('celestial_moon'), glow = this._stageSheet('pulse', 'silver'), pool = this._stageSheet('circle2', 'silver');
    if (moon) {
      let ni = 0;
      const e = k > 0.62 ? clamp01((k - 0.62) / 0.3) : 0;
      const frame = e > 0 ? Math.min(14, 7 + Math.round(7 * e)) : Math.round(lerp(2, 7, I));
      if (pool) this._stageArt(s, ni++, pool, f.x, f.y, { sx: 220 / 146, add: true, depth: s.ground.depth + 2, alpha: 0.25 + 0.3 * I, t: now });
      if (glow) this._stageArt(s, ni++, glow, mx, my, { sx: (R * 4.4) / 100, add: true, depth: s.d0 - 7, alpha: (0.3 + 0.4 * I) * (1 - 0.6 * e) + (e > 0.85 ? (e - 0.85) * 4 : 0), t: now });
      this._stageArt(s, ni++, moon, mx, my, { sx: (R * 2) / 47, depth: s.d0 - 6, frame });
      this._stageFlamesHide(s, ni);
      return;
    }
    s.addBack.fillStyle(0x8fb0ff, 0.25 * I); s.addBack.fillCircle(mx, my, R * 2.2);
    s.addBack.fillStyle(0xe8ecff, 0.4 + 0.6 * I); s.addBack.fillCircle(mx, my, R);
    if (k > 0.62) {
      const e = clamp01((k - 0.62) / 0.3);
      const ox = lerp(R * 2.2, 0, e);
      s.back.fillStyle(0x05060f, 1); s.back.fillCircle(mx + ox, my - ox * 0.2, R * 1.02);
      if (e > 0.85) { s.addBack.lineStyle(3, 0xffffff, (e - 0.85) * 6); s.addBack.strokeCircle(mx, my, R * 1.08); s.addBack.lineStyle(8, 0x8fb0ff, (e - 0.85) * 3); s.addBack.strokeCircle(mx, my, R * 1.25); }
    }
    // moonlight pooled on the circle
    s.ground.fillStyle(0xb8c8ff, 0.12 + 0.12 * I); s.ground.fillEllipse(f.x, f.y, 220, 110);
  },

  _stage_frost(s, k, I, now, f, W, H) {
    s.vign.setTint(0xcfefff).setAlpha(Math.min(0.75, 0.15 + 0.6 * I));
    const shard = (g, x, y, h, w, tilt) => {
      g.fillStyle(0xbfe9ff, 0.85); g.fillTriangle(x - w, y, x + w, y, x + tilt, y - h);
      g.fillStyle(0xffffff, 0.7); g.fillTriangle(x - w * 0.2, y, x + w * 0.5, y, x + tilt, y - h);
      g.lineStyle(1, 0x5fa8d3, 0.8); g.strokeTriangle(x - w, y, x + w, y, x + tilt, y - h);
    };
    // ROUND 388 -- the ice is the fx3 `icestorm` (hail standing over each outer stone) and `icepatch` (rime on the ring
    // and spreading from the circle), both blue; the drawn shards and ellipses are the fallback.
    const storm = this._stageSheet('icestorm', 'blue'), patch = this._stageSheet('icepatch', 'blue');
    let ni = 0;
    for (const sp of s.spots) {
      if (k < sp.at) continue;
      const grow = clamp01((k - sp.at) * 4);
      const p = isoProject(sp.x, sp.y);
      const behind = (sp.x + sp.y) < (s.x + s.y);
      if (storm && patch) {
        if (sp.ring) this._stageArt(s, ni++, patch, p.x, p.y, { sx: 0.4 + 0.2 * I, depth: s.ground.depth + 2, alpha: 0.9, frame: Math.min(patch.frames - 1, Math.floor(grow * patch.frames)) });
        else this._stageArt(s, ni++, storm, p.x, p.y + 2, { oy: 0.97, sx: (0.3 + 0.35 * I) * (0.4 + 0.6 * grow), depth: isoDepth(sp.x, sp.y) + 2, alpha: Math.min(1, grow * 1.5), t: now + sp.j * 3 });
        continue;
      }
      const g = behind ? s.back : s.front;
      const h = (sp.ring ? 22 : 30) * grow * (0.6 + I);
      shard(g, p.x, p.y, h, 5, (sp.j - 0.5) * 8);
      shard(g, p.x + 7, p.y + 2, h * 0.6, 4, 4);
      shard(g, p.x - 6, p.y + 1, h * 0.5, 3, -4);
      s.ground.fillStyle(0xe1f5fe, 0.35 * grow); s.ground.fillEllipse(p.x, p.y, 36, 16);
    }
    // rime spreading over the ground from the circle
    if (storm && patch) {
      const sx = (140 + 300 * I) / 123;
      this._stageArt(s, ni++, patch, f.x, f.y, { sx, sy: sx * 1.4, depth: s.ground.depth, alpha: 0.35 + 0.35 * I, frame: Math.min(patch.frames - 1, 8 + Math.floor(11 * I)) });
    } else { s.ground.fillStyle(0xe1f5fe, 0.18 * I); s.ground.fillEllipse(f.x, f.y, 140 + 300 * I, 70 + 150 * I); }
    this._stageFlamesHide(s, ni);
    // snow
    const r = rng(s.seed + 3);
    const n = Math.round(30 + 90 * I);
    for (let i = 0; i < n; i++) {
      const x0 = r() * W, sp = 20 + r() * 40, ph = r();
      const y = ((now * sp + ph * H) % (H + 20)) - 10;
      const x = x0 + Math.sin(now * 0.8 + i) * 14;
      s.sky.fillStyle(0xffffff, 0.75); s.sky.fillCircle(x, y, 1 + (i % 3) * 0.6);
    }
  },

  _stage_verdant(s, k, I, now, f) {
    // ROUND 388 -- the growth is the fx2 `thornshield` (green, lying flat and spreading from the circle) and a green fx3
    // `healpillar` springing at each stone; the drawn vines and sprouts are the fallback when they are not loaded.
    const thorn = this._stageSheet('thornshield', 'green'), sprout = this._stageSheet('healpillar', 'green');
    if (thorn && sprout) {
      let ni = 0;
      const sx = (70 + 480 * I) / 118;
      this._stageArt(s, ni++, thorn, f.x, f.y, { sx, sy: sx * 0.5, depth: s.ground.depth + 2, alpha: 0.55 + 0.4 * I, t: now });
      for (const sp of s.spots) {
        if (k < sp.at) continue;
        const grow = clamp01((k - sp.at) * 3);
        const p = isoProject(sp.x, sp.y);
        const sc = (0.3 + 0.35 * I) * (0.3 + 0.7 * grow);
        this._stageArt(s, ni++, sprout, p.x, p.y + 3, { sx: sc, sy: sc * 1.3, add: true, depth: isoDepth(sp.x, sp.y) + 2, alpha: Math.min(1, grow * 1.5), t: now + sp.j * 3 });
      }
      this._stageFlamesHide(s, ni);
    } else this._stageVerdantDrawn(s, k, I, now, f);
    // pollen
    for (let i = 0; i < 46; i++) {
      const ph = (now * 0.15 + i / 46) % 1;
      const a = i * 2.399 + now * 0.2, rad = 30 + (i * 41) % 200;
      s.addFront.fillStyle(0xd4ff8a, (1 - Math.abs(ph - 0.5) * 2) * 0.7 * I);
      s.addFront.fillCircle(f.x + Math.cos(a) * rad, f.y + Math.sin(a) * rad * 0.5 - ph * 110, 1.5);
    }
  },

  /** The round-358 vines and sprouts, drawn: the fallback for the verdant rite when its sheets are not loaded. */
  _stageVerdantDrawn(s, k, I, now, f) {
    const vines = 12;
    for (let v = 0; v < vines; v++) {
      const a0 = (v / vines) * Math.PI * 2 + 0.15;
      const len = (40 + 210 * I) * (0.75 + 0.25 * Math.sin(v * 3.1));
      const segs = 14;
      let px = f.x, py = f.y;
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const rad = 30 + len * t;
        const a = a0 + Math.sin(t * 5 + v + now * 0.6) * 0.25;
        const x = f.x + Math.cos(a) * rad, y = f.y + Math.sin(a) * rad * 0.5;
        s.ground.lineStyle(3 - 2 * t, 0x4c8c2b, 0.9); s.ground.lineBetween(px, py, x, y);
        if (i % 3 === 0) { s.ground.fillStyle(0x7cb342, 0.95); s.ground.fillEllipse(x + 4, y - 2, 7, 4); s.ground.fillEllipse(x - 4, y + 1, 6, 3); }
        px = x; py = y;
      }
      if (k > 0.5) {
        const b = clamp01((k - 0.5) * 3);
        s.ground.fillStyle(v % 2 ? 0xf48fb1 : 0xfff176, 0.95); s.ground.fillCircle(px, py, 2 + 4 * b);
        s.ground.fillStyle(0xffffff, 0.9); s.ground.fillCircle(px, py, 1 + 1.4 * b);
      }
    }
    // sprouts at the room's edges, growing tall
    for (const sp of s.spots) {
      if (k < sp.at) continue;
      const grow = clamp01((k - sp.at) * 3);
      const p = isoProject(sp.x, sp.y);
      const g = (sp.x + sp.y) < (s.x + s.y) ? s.back : s.front;
      for (let b = -2; b <= 2; b++) {
        const h = (10 + 16 * grow * I) * (1 - Math.abs(b) * 0.18);
        g.fillStyle(b % 2 ? 0x558b2f : 0x8bc34a, 0.95);
        g.fillTriangle(p.x + b * 3 - 2, p.y, p.x + b * 3 + 2, p.y, p.x + b * 4 + Math.sin(now * 2 + b) * 2, p.y - h);
      }
      if (grow > 0.8 && sp.j > 0.4) { g.fillStyle(sp.j > 0.7 ? 0xf48fb1 : 0xfff176, 1); g.fillCircle(p.x, p.y - 16 - 10 * I, 3); }
    }
  },

  _stage_blood(s, k, I, now, f) {
    const rate = lerp(0.9, 2.2, k);
    s.beatPh = (s.beatPh || 0) + (this.game.loop.delta / 1000) * rate;
    const beat = Math.pow(Math.max(0, Math.sin(s.beatPh * Math.PI * 2)), 8);
    s.vign.setTint(0x8a0010).setAlpha(Math.min(0.9, (0.25 + 0.45 * beat) * (0.4 + I)));
    s.veil.setAlpha(s.T.veil[1] * I * (0.85 + 0.3 * beat));
    // ROUND 388 -- the pool is the fx3 `aoeliquid` in bloodred and the heart over the circle the fx2 `sigil` (bloodred)
    // inside a beating additive `pulse`; the drawn ellipses and discs are the fallback when they are not loaded.
    const liquid = this._stageSheet('aoeliquid', 'bloodred'), heart = this._stageSheet('sigil', 'bloodred'), beatS = this._stageSheet('pulse', 'bloodred');
    const art = !!(liquid && heart);
    let ni = 0;
    // the pool spreading under the circle
    if (art) {
      const sx = (80 + 220 * I) / 111;
      this._stageArt(s, ni++, liquid, f.x, f.y, { sx, depth: s.ground.depth, alpha: 0.55 + 0.4 * I, frame: 16 + (Math.floor(now * 4) % 3) });
    } else {
      s.ground.fillStyle(0x5a0010, 0.55 * I); s.ground.fillEllipse(f.x, f.y, 80 + 220 * I, 40 + 110 * I);
      s.ground.fillStyle(0x8a0010, 0.35 * I); s.ground.fillEllipse(f.x, f.y, 50 + 120 * I, 25 + 60 * I);
    }
    // droplets rising and spiralling into the orb
    const ox = f.x, oy = f.y - 96, R = 4 + 15 * I * (1 + 0.15 * beat);
    const n = Math.round(10 + 40 * I);
    for (let i = 0; i < n; i++) {
      const ph = (now * 0.3 + i / n) % 1;
      const a = i * 2.399 + ph * 4;
      const rad = lerp(150, 6, ph);
      const x = ox + Math.cos(a) * rad, y = lerp(f.y + Math.sin(a) * rad * 0.5, oy, ph * ph);
      const g = Math.sin(a) < 0 ? s.back : s.front;
      g.fillStyle(0xb0001c, 0.9); g.fillCircle(x, y, 1.6 + (1 - ph) * 1.4);
    }
    if (art) {
      if (beatS) this._stageArt(s, ni++, beatS, ox, oy, { sx: (R * 4.4) / 100, add: true, depth: s.d0 + 7, alpha: 0.35 + 0.45 * beat, t: now });
      this._stageArt(s, ni++, heart, ox, oy, { sx: (R * 2.3) / 100, depth: s.d0 + 6, alpha: 0.95, t: now, rot: now * 0.4 });
      this._stageFlamesHide(s, ni);
      return;
    }
    s.front.fillStyle(0x6a000e, 0.95); s.front.fillCircle(ox, oy, R);
    s.front.fillStyle(0xd81b3c, 0.9); s.front.fillCircle(ox - R * 0.15, oy - R * 0.15, R * 0.7);
    s.front.fillStyle(0xff8a9a, 0.8); s.front.fillCircle(ox - R * 0.35, oy - R * 0.4, R * 0.22);
    s.addFront.fillStyle(0xc8102e, 0.25 + 0.25 * beat); s.addFront.fillCircle(ox, oy, R * 2.2);
  },

  _stage_doom(s, k, I, now, f) {
    // ROUND 388 -- the ruin is the fx3 `aoearcane` (black, opening on the ground), the great ring the fx2 `runecircle`
    // in bloodred, and the pillars of dark light black fx3 `portal`s at the ring stones; the drawn cracks, ring, runes
    // and bars are the fallback when they are not loaded.
    const rift = this._stageSheet('aoearcane', 'black'), seal = this._stageSheet('runecircle', 'bloodred'), gate = this._stageSheet('portal', 'black');
    if (rift && seal && gate) {
      let ni = 0;
      const sx = (120 + 520 * I) / 114;
      this._stageArt(s, ni++, rift, f.x, f.y, { sx, depth: s.ground.depth, alpha: 0.55 + 0.4 * I, t: now * 0.5 });
      const R = 120 + 40 * I;
      this._stageArt(s, ni++, seal, f.x, f.y, { sx: (R * 2) / 110, sy: R / 110, depth: s.ground.depth + 2, alpha: 0.35 + 0.45 * I, t: now * 0.5 });
      for (const sp of s.spots) {
        if (!sp.ring || k < sp.at) continue;
        const g = clamp01((k - sp.at) * 3);
        const p = isoProject(sp.x, sp.y);
        this._stageArt(s, ni++, gate, p.x, p.y + 3, { sx: 0.45 * g, sy: 0.45 * g * (1 + 0.8 * I), depth: isoDepth(sp.x, sp.y) + 2, alpha: g, t: now + sp.j * 2 });
      }
      this._stageFlamesHide(s, ni);
    } else this._stageDoomDrawn(s, k, I, now, f);
    // the ground shudders, more as the end comes
    if (k > 0.55 && now > s.shakeAt) {
      s.shakeAt = now + lerp(3.2, 1.2, (k - 0.55) / 0.45);
      try { this.cameras.main.shake(220, 0.0015 + 0.003 * k, false); } catch (e) { /* none */ }
    }
  },

  /** The round-358 cracks, ring, runes and pillars, drawn: the doom rite's fallback when its sheets are not loaded. */
  _stageDoomDrawn(s, k, I, now, f) {
    const cracks = 9;
    for (let c = 0; c < cracks; c++) {
      const r = rng(s.seed + c * 31);
      let a = (c / cracks) * Math.PI * 2 + r();
      let x = f.x, y = f.y;
      const L = (60 + 260 * I) * (0.6 + 0.4 * r());
      const steps = 9;
      for (let i = 1; i <= steps; i++) {
        a += (r() - 0.5) * 0.8;
        const rad = (L / steps) * i;
        const nx = f.x + Math.cos(a) * rad, ny = f.y + Math.sin(a) * rad * 0.5;
        s.ground.lineStyle(4, 0x7a1fa2, 0.35 * I); s.ground.lineBetween(x, y, nx, ny);
        s.ground.lineStyle(1.6, 0x0a0010, 0.95); s.ground.lineBetween(x, y, nx, ny);
        x = nx; y = ny;
      }
    }
    // the great ring and its slow runes
    const R = 120 + 40 * I;
    s.ground.lineStyle(2, 0xaa66ff, 0.35 + 0.4 * I); s.ground.strokeEllipse(f.x, f.y, R * 2, R);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - now * 0.12;
      const x = f.x + Math.cos(a) * R, y = f.y + Math.sin(a) * R * 0.5;
      s.ground.lineStyle(2, 0xd1a3ff, 0.6 * I);
      s.ground.lineBetween(x - 5, y - 3, x + 5, y + 3); s.ground.lineBetween(x - 5, y + 3, x, y - 4); s.ground.lineBetween(x, y - 4, x + 5, y + 3);
    }
    // pillars of dark light
    for (const sp of s.spots) {
      if (!sp.ring || k < sp.at) continue;
      const g = clamp01((k - sp.at) * 3);
      const p = isoProject(sp.x, sp.y);
      const gr = (sp.x + sp.y) < (s.x + s.y) ? s.addBack : s.addFront;
      gr.fillStyle(0x7a1fa2, 0.18 * g); gr.fillRect(p.x - 8, p.y - 300 * g, 16, 300 * g);
      gr.fillStyle(0xd1a3ff, 0.35 * g); gr.fillRect(p.x - 2, p.y - 300 * g, 4, 300 * g);
    }
  },

  _stage_martial(s, k, I, now, f) {
    // ROUND 388 -- the circling blades are the fx3 `slasha`/`slashb` (silver), each cutting on its own clock as it goes
    // round, and the shockwave the fx3 `hitflash` ring (white) opening across the floor; the drawn weapons and ellipses
    // are the fallback when those sheets are not loaded.
    const sa = this._stageSheet('slasha', 'silver'), sb = this._stageSheet('slashb', 'silver'), wave = this._stageSheet('hitflash', 'white');
    const art = !!(sa && sb && wave);
    let ni = 0;
    const n = 2 + Math.floor(8 * I);
    const spin = now * (0.6 + 2.2 * I);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + spin;
      const rad = 84 + 10 * Math.sin(now * 2 + i);
      const x = f.x + Math.cos(a) * rad, y = f.y + Math.sin(a) * rad * 0.5 - 44 + Math.sin(now * 3 + i) * 4;
      if (art) {
        const sc = 0.45 + 0.25 * I;
        this._stageArt(s, ni++, i % 2 ? sb : sa, x, y, { sx: sc, sy: sc * (i % 2 ? -1 : 1), rot: a + Math.PI / 2, depth: s.d0 + (Math.sin(a) < 0 ? -6 : 6),
          alpha: 0.9, t: now * (0.5 + 0.5 * I) + i * 0.13 });
        continue;
      }
      const g = Math.sin(a) < 0 ? s.back : s.front;
      const ga = Math.sin(a) < 0 ? s.addBack : s.addFront;
      const tilt = a + Math.PI / 2;
      const Q = 1.6;   // the weapons read at a glance
      const ux = Math.cos(tilt) * Q, uy = Math.sin(tilt) * 0.5 * Q;
      const type = i % 3;
      ga.fillStyle(0xd8dde8, 0.12); ga.fillCircle(x, y, 11);
      g.lineStyle(1.5, 0x90a4ae, 0.95);
      if (type === 0) {          // a sword
        g.fillStyle(0xeceff1, 0.92);
        g.fillTriangle(x - ux * 22, y - uy * 22 - 2, x + ux * 2 - uy * 3, y + uy * 2 + ux * 1.5, x + ux * 2 + uy * 3, y + uy * 2 - ux * 1.5);
        g.lineBetween(x + ux * 2 - uy * 7, y + uy * 2 + ux * 3, x + ux * 2 + uy * 7, y + uy * 2 - ux * 3);
        g.lineStyle(3, 0x6d4c41, 1); g.lineBetween(x + ux * 2, y + uy * 2, x + ux * 9, y + uy * 9);
      } else if (type === 1) {   // a spear
        g.lineStyle(2, 0x8d6e63, 1); g.lineBetween(x - ux * 26, y - uy * 26, x + ux * 14, y + uy * 14);
        g.fillStyle(0xeceff1, 0.95); g.fillTriangle(x - ux * 34, y - uy * 34, x - ux * 24 - uy * 4, y - uy * 24 + ux * 2, x - ux * 24 + uy * 4, y - uy * 24 - ux * 2);
      } else {                   // an axe
        g.lineStyle(2, 0x8d6e63, 1); g.lineBetween(x - ux * 16, y - uy * 16, x + ux * 14, y + uy * 14);
        g.fillStyle(0xcfd8dc, 0.95); g.fillEllipse(x - ux * 12 + uy * 6, y - uy * 12 - ux * 3, 12, 8);
      }
    }
    // a shockwave every few seconds, faster as it builds
    const period = lerp(3.2, 1.3, k);
    const ph = (now % period) / period;
    if (art) {
      this._stageArt(s, ni++, wave, f.x, f.y, { sx: 420 / 116, add: true, depth: s.ground.depth + 2, alpha: (1 - ph) * 0.9 * I, frame: Math.min(21, Math.floor(ph * 22)) });
      this._stageFlamesHide(s, ni);
      return;
    }
    s.ground.lineStyle(3 * (1 - ph), 0xeceff1, (1 - ph) * 0.7 * I); s.ground.strokeEllipse(f.x, f.y, 60 + 360 * ph, 30 + 180 * ph);
    for (const sp of s.spots) {
      if (sp.ring || k < sp.at) continue;
      const p = isoProject(sp.x, sp.y);
      s.ground.fillStyle(0xb0bec5, 0.12 * clamp01((k - sp.at) * 3)); s.ground.fillEllipse(p.x, p.y, 34, 14);
    }
  },

  _stage_clockwork(s, k, I, now, f) {
    const gear = (g, x, y, R, teeth, ang, col, flat) => {
      const fy = flat ? 0.5 : 1;
      g.fillStyle(col, 0.95);
      g.beginPath();
      for (let i = 0; i <= teeth * 2; i++) {
        const a = ang + (i / (teeth * 2)) * Math.PI * 2;
        const rr = i % 2 ? R : R * 1.18;
        const a2 = a + (Math.PI / teeth) * 0.5;
        const p1 = { x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * fy };
        const p2 = { x: x + Math.cos(a2) * rr, y: y + Math.sin(a2) * rr * fy };
        if (i === 0) g.moveTo(p1.x, p1.y); else g.lineTo(p1.x, p1.y);
        g.lineTo(p2.x, p2.y);
      }
      g.closePath(); g.fillPath();
      g.fillStyle(0x3e2a10, 0.95); g.fillEllipse(x, y, R * 0.7, R * 0.7 * fy);
      g.lineStyle(2, col, 0.95); for (let i = 0; i < 4; i++) { const a = ang + i * Math.PI / 2; g.lineBetween(x, y, x + Math.cos(a) * R * 0.35, y + Math.sin(a) * R * 0.35 * fy); }
    };
    // ROUND 388 -- the great wheel on the floor is the fx3 `circle4` (brown, flat), and the gears turning in the air
    // fx2 `sigil`s (gold), spun at the old gears' rates; the drawn gears are the fallback when they are not loaded.
    const wheel = this._stageSheet('circle4', 'brown'), cog = this._stageSheet('sigil', 'gold');
    const art = !!(wheel && cog);
    let ni = 0;
    if (art) {
      const sx = (2.36 * (44 + 14 * I)) / 140;
      this._stageArt(s, ni++, wheel, f.x, f.y, { sx, depth: s.ground.depth + 2, alpha: 0.95, t: now });
    } else gear(s.ground, f.x, f.y, 44 + 14 * I, 16, now * 0.3, 0x8d6e2a, true);
    const n = 1 + Math.floor(7 * I);
    for (let i = 0; i < n; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const x = f.x + Math.cos(a) * 92, y = f.y + Math.sin(a) * 46 - 46 - (i % 2) * 14;
      const g = Math.sin(a) < 0 ? s.back : s.front;
      const R = i % 2 ? 11 : 15;
      if (art) {
        this._stageArt(s, ni++, cog, x, y, { sx: (R * 2.4) / 100, rot: (i % 2 ? -1 : 1) * now * (0.8 + 1.4 * I) * (15 / R),
          depth: s.d0 + (Math.sin(a) < 0 ? -6 : 6), alpha: 0.95, frame: i % cog.frames });
        continue;
      }
      gear(g, x, y, R, i % 2 ? 8 : 10, (i % 2 ? -1 : 1) * now * (0.8 + 1.4 * I) * (15 / R), i % 3 ? 0xd4a24c : 0xb08030, false);
    }
    this._stageFlamesHide(s, ni);
    // the escapement ticking: a pendulum over the caster, faster as the rite builds
    const sw = Math.sin(now * Math.PI * lerp(1, 2.4, k)) * 0.5;
    const px = f.x, py = f.y - 120;
    // ROUND 393 -- the pendulum sheet's swing, from its top-centre (fxArt393Mixin.js); the drawn rod and bob are the fallback
    if (!(this._pendulum393 && this._pendulum393(s, ni, px, py, I, now, k))) {
      s.back.lineStyle(2, 0xd4a24c, 0.9 * I); s.back.lineBetween(px, py, px + Math.sin(sw) * 34, py + Math.cos(sw) * 34);
      s.back.fillStyle(0xffe0a0, 0.95 * I); s.back.fillCircle(px + Math.sin(sw) * 34, py + Math.cos(sw) * 34, 5);
    }
    // sparks
    for (let i = 0; i < 18; i++) {
      const ph = (now * 1.3 + i / 18) % 1;
      const a = i * 2.1 + Math.floor(now * 1.3 + i / 18);
      s.addFront.fillStyle(0xffe0a0, (1 - ph) * I); s.addFront.fillCircle(f.x + Math.cos(a) * (60 + 60 * ph), f.y + Math.sin(a) * 30 - 30 - 30 * ph, 1.4);
    }
  },

  _stage_mystic(s, k, I, now, f) {
    // ROUND 388 -- the three turning rings of glyphs are fx2 `runecircle`s (blue, flat, additive) and the runes rising
    // in the air small blue fx2 `sigil`s; the drawn ellipses, glyphs and strokes are the fallback.
    const rc = this._stageSheet('runecircle', 'blue'), rune = this._stageSheet('sigil', 'blue');
    const art = !!(rc && rune);
    let ni = 0;
    for (let ring = 0; ring < 3; ring++) {
      const R = 70 + ring * 46 * (0.6 + I);
      if (k < ring * 0.25) continue;
      const dir = ring % 2 ? -1 : 1;
      if (art) {
        this._stageArt(s, ni++, rc, f.x, f.y, { sx: (R * 2) / 110, sy: R / 110, add: true, depth: s.ground.depth + 2 + ring,
          alpha: 0.45 + 0.35 * I, t: now * (0.6 + ring * 0.2) + ring });
        continue;
      }
      s.ground.lineStyle(1.5, 0x80deea, 0.5 + 0.3 * I); s.ground.strokeEllipse(f.x, f.y, R * 2, R);
      const glyphs = 10 + ring * 6;
      for (let i = 0; i < glyphs; i++) {
        const a = (i / glyphs) * Math.PI * 2 + dir * now * (0.15 + ring * 0.05);
        const x = f.x + Math.cos(a) * R, y = f.y + Math.sin(a) * R * 0.5;
        s.ground.lineStyle(1.5, 0xb2ebf2, 0.8);
        const t = (i + ring) % 4;
        if (t === 0) s.ground.strokeCircle(x, y, 3);
        else if (t === 1) { s.ground.lineBetween(x - 4, y, x + 4, y); s.ground.lineBetween(x, y - 3, x, y + 3); }
        else if (t === 2) s.ground.strokeTriangle(x - 3, y + 2, x + 3, y + 2, x, y - 3);
        else { s.ground.lineBetween(x - 3, y - 2, x + 3, y + 2); s.ground.lineBetween(x - 3, y + 2, x + 3, y - 2); }
      }
    }
    // runes rising and turning in the air
    const n = Math.round(8 + 26 * I);
    for (let i = 0; i < n; i++) {
      const ph = (now * 0.2 + i / n) % 1;
      const a = i * 2.399 + now * 0.3;
      const rad = 40 + (i * 29) % 130;
      const x = f.x + Math.cos(a) * rad, y = f.y + Math.sin(a) * rad * 0.5 - 20 - ph * 130;
      if (art) {
        this._stageArt(s, ni++, rune, x, y, { sx: (12 + 4 * (i % 3)) / 100, rot: now * 2 + i, add: true,
          depth: s.d0 + (Math.sin(a) < 0 ? -5 : 7), alpha: (1 - ph) * 0.95, frame: i % rune.frames });
        continue;
      }
      const g = Math.sin(a) < 0 ? s.addBack : s.addFront;
      g.lineStyle(2, 0x80deea, (1 - ph) * 0.95);
      const r = 4 + (i % 3);
      const t = now * 2 + i;
      g.lineBetween(x + Math.cos(t) * r, y + Math.sin(t) * r, x - Math.cos(t) * r, y - Math.sin(t) * r);
      g.lineBetween(x + Math.cos(t + 2) * r, y + Math.sin(t + 2) * r, x, y);
    }
    this._stageFlamesHide(s, ni);
  },

  // ROUND 360 -- LIGHTNING: the air tightens; arcs crawl between the ring stones; bolts fall, more and faster, and the
  // whole view flashes with each.
  _stage_lightning(s, k, I, now, f, W, H) {
    // ROUND 388 -- the bolts are the fx3 `skystrike` (white), each played once where it falls; the arcs between the
    // ring stones the fx5 thin beam in its lightning cut (the art as drawn while that is fetched); the charge on the
    // caster an additive white fx2 `pulse`. The drawn polylines are the fallback when the sheets are not loaded.
    const strike = this._stageSheet('skystrike', 'white'), charge = this._stageSheet('pulse', 'white');
    if (this._wantFx5) this._wantFx5('fx_beamthin_lightning');
    const arcS = this._stageSheet('beamthin', 'lightning');
    const art = !!(strike && arcS && charge);
    let ni = 0;
    s.ltn = s.ltn || { next: 1.2, bolts: [], flash: 0 };
    const L = s.ltn;
    const dt = Math.min(0.1, (this.game.loop.delta || 16) / 1000);
    L.next -= dt;
    if (L.next <= 0) {
      L.next = Math.max(0.25, 2.2 - 1.9 * I) * (0.6 + Math.random() * 0.8);
      const spots = s.spots.filter(sp => k >= sp.at);
      const sp = spots.length && Math.random() < 0.75 ? spots[Math.floor(Math.random() * spots.length)] : { x: s.x + (Math.random() - 0.5) * 160, y: s.y + (Math.random() - 0.5) * 160 };
      L.bolts.push({ x: sp.x, y: sp.y, t: art ? 0.6 : 0.3, t0: art ? 0.6 : 0.3, seed: Math.random() * 1000 });
      L.flash = 0.35 + 0.4 * I;
      if (I > 0.6) try { this.cameras.main.shake(120, 0.002); } catch (e) { /* none */ }
    }
    L.flash = Math.max(0, L.flash - dt * 2.5);
    s.glow.setAlpha(Math.min(0.75, s.T.glow[1] * I + L.flash));
    for (const b of L.bolts) {
      b.t -= dt;
      const p = isoProject(b.x, b.y);
      if (art) {
        const age = (b.t0 || 0.3) - b.t;
        this._stageArt(s, ni++, strike, p.x, p.y + 2, { sx: 3.2, add: true, depth: s.d0 + 7, frame: Math.min(12, Math.floor((age * 1000) / strike.ms)), alpha: Math.min(1, b.t / 0.15) });
        continue;
      }
      let x = p.x + Math.sin(b.seed) * 30, y = p.y - 460;
      const pts = [[x, y]];
      for (let i = 1; i <= 10; i++) { x = p.x + Math.sin(b.seed + i * 1.7) * (34 - i * 3); y = p.y - 460 + i * 46; pts.push([x, y]); }
      for (const [w, col, al] of [[9, 0x9fc4ff, 0.3], [3, 0xffffff, 1]]) {
        s.addFront.lineStyle(w, col, al * Math.max(0, b.t / 0.3));
        s.addFront.beginPath(); s.addFront.moveTo(pts[0][0], pts[0][1]); for (const q of pts) s.addFront.lineTo(q[0], q[1]); s.addFront.strokePath();
      }
      s.ground.fillStyle(0xd6e6ff, 0.5 * Math.max(0, b.t / 0.3)); s.ground.fillEllipse(p.x, p.y, 70, 32);
    }
    L.bolts = L.bolts.filter(b => b.t > 0);
    // arcs crawling between the ring
    const ring = s.spots.filter(sp => sp.ring && k >= sp.at);
    for (let i = 0; i < ring.length; i++) {
      if (Math.sin(now * 9 + i * 2.3) < 0.2) continue;
      const a = isoProject(ring[i].x, ring[i].y), b = isoProject(ring[(i + 1) % ring.length].x, ring[(i + 1) % ring.length].y);
      if (art) {
        const dx = b.x - a.x, dy = b.y - a.y;
        this._stageArt(s, ni++, arcS, a.x, a.y - 6, { ox: arcS.bx0 / arcS.cell, oy: 0.5, sx: Math.max(0.05, Math.hypot(dx, dy) / (arcS.bx1 - arcS.bx0)),
          sy: dx < 0 ? -0.3 : 0.3, rot: Math.atan2(dy, dx), add: true, depth: s.d0 - 5, alpha: 0.85 * I, t: now + i * 0.3 });
        continue;
      }
      s.addBack.lineStyle(1.5, 0xb3d4ff, 0.8 * I);
      s.addBack.beginPath(); s.addBack.moveTo(a.x, a.y - 6);
      for (let j = 1; j < 6; j++) { const t = j / 6; s.addBack.lineTo(a.x + (b.x - a.x) * t + Math.sin(now * 30 + j * 7 + i) * 6, a.y + (b.y - a.y) * t - 6 + Math.cos(now * 27 + j * 5) * 5); }
      s.addBack.lineTo(b.x, b.y - 6); s.addBack.strokePath();
    }
    // a charge gathering on the caster
    if (art) {
      this._stageArt(s, ni++, charge, f.x, f.y - 40, { sx: (12 + 44 * I) / 100, add: true, depth: s.d0 + 7, alpha: 0.4 + 0.5 * I, t: now * 2 });
      this._stageFlamesHide(s, ni);
      return;
    }
    s.addFront.lineStyle(1.5, 0xe3eeff, 0.6 * I);
    for (let i = 0; i < 5; i++) { const an = now * 7 + i * 1.26; s.addFront.lineBetween(f.x, f.y - 40, f.x + Math.cos(an) * 22 * I, f.y - 40 + Math.sin(an) * 30 * I); }
  },

  // ROUND 360 -- STORMS: a wind that turns about the circle and gathers whatever is loose, rain driving through it, and a
  // dark wheel of cloud closing overhead.
  _stage_storm(s, k, I, now, f, W, H) {
    // ROUND 388 -- the wind is the fx3 `vortex` (grey, flat, turning under the circle) and fx3 `tornado`s (silver)
    // circling the caster on the ring stones, more and faster as it builds; the drawn spiral streaks are the fallback.
    // (The debris, the rain and the wheel of cloud stay as they were: there is no sheet for those.)
    const swirl = this._stageSheet('vortex', 'grey'), twister = this._stageSheet('tornado', 'silver');
    let ni = 0;
    if (swirl && twister) {
      const sx = (200 + 520 * I) / 122;
      this._stageArt(s, ni++, swirl, f.x, f.y, { sx, sy: sx * 1.3, depth: s.ground.depth + 2, alpha: 0.5 + 0.4 * I, t: now * (0.8 + 1.2 * I) });
      for (const sp of s.spots) {
        if (!sp.ring || k < sp.at) continue;
        const g = clamp01((k - sp.at) * 3);
        const a = sp.a + now * (0.6 + 1.4 * I), r = 82 + 50 * I;
        const wx = s.x + Math.cos(a) * r, wy = s.y + Math.sin(a) * r;
        const p = isoProject(wx, wy);
        const sc = (0.3 + 0.35 * I) * (0.4 + 0.6 * g);
        this._stageArt(s, ni++, twister, p.x, p.y + 3, { oy: 0.95, sx: sc, depth: isoDepth(wx, wy) + 2, alpha: Math.min(1, g * 1.5), t: now + sp.j * 3 });
      }
    }
    this._stageFlamesHide(s, ni);
    const arms = swirl && twister ? 0 : 5 + Math.floor(9 * I);
    for (let i = 0; i < arms; i++) {
      const base = (i / arms) * Math.PI * 2 + now * (1.2 + 2.6 * I);
      const R0 = 40 + (i % 3) * 30, R1 = R0 + 60 + 120 * I;
      const g = Math.sin(base) < 0 ? s.back : s.front;
      g.lineStyle(2, 0xcfe3ee, 0.35 + 0.35 * I);
      g.beginPath();
      for (let j = 0; j <= 8; j++) {
        const t = j / 8, a = base + t * 1.4, r = R0 + (R1 - R0) * t;
        const x = f.x + Math.cos(a) * r, y = f.y - 20 - t * 30 + Math.sin(a) * r * 0.45;
        if (j === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.strokePath();
    }
    // what the wind has picked up
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399 + now * (2 + 2 * I) * (i % 2 ? 1 : 0.8), r = 50 + (i * 23) % (60 + 150 * I);
      const x = f.x + Math.cos(a) * r, y = f.y - 30 - (i % 5) * 12 + Math.sin(a) * r * 0.45;
      const g = Math.sin(a) < 0 ? s.back : s.front;
      g.fillStyle(i % 3 ? 0x6f8f3a : 0x8d6e63, 0.9); g.fillRect(x, y, 4, 2);
    }
    // driving rain across the whole view
    const r = (s.seed % 997) + 1;
    const n = Math.round(30 + 120 * I);
    for (let i = 0; i < n; i++) {
      const x0 = ((i * 137 + r * 13) % W), sp = 700 + (i % 7) * 60;
      const y = ((now * sp + i * 97) % (H + 60)) - 30, x = (x0 + now * 380 * I) % W;
      s.sky.lineStyle(1.5, 0xdbe9f5, 0.45); s.sky.lineBetween(x, y, x - 8 - 10 * I, y - 26);
    }
    // the wheel of cloud overhead
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 - now * 0.5;
      s.back.fillStyle(0x1a222c, 0.25 + 0.35 * I);
      s.back.fillEllipse(f.x + Math.cos(a) * 90, f.y - 190 + Math.sin(a) * 30, 110, 46);
    }
  },

  // ROUND 360 -- WATER: a pool rising out of the stone, rings spreading across it, springs leaping at the ring stones,
  // and light moving on everything as if under water.
  _stage_water(s, k, I, now, f, W, H) {
    // ROUND 388 -- the pool is the fx3 `aoeliquid` (blue), its spreading rings the fx3 `hitflash` ring (blue, additive)
    // and the springs at the stones blue fx3 `healpillar`s leaping as it builds; the drawn ellipses are the fallback.
    const liquid = this._stageSheet('aoeliquid', 'blue'), ripple = this._stageSheet('hitflash', 'blue'), spring = this._stageSheet('healpillar', 'blue');
    const art = !!(liquid && ripple && spring);
    let ni = 0;
    if (art) {
      this._stageArt(s, ni++, liquid, f.x, f.y, { sx: (90 + 360 * I) / 111, depth: s.ground.depth, alpha: 0.5 + 0.4 * I, frame: 16 + (Math.floor(now * 4) % 3) });
      for (let i = 0; i < 4; i++) {
        const ph = (now * 0.45 + i / 4) % 1;
        this._stageArt(s, ni++, ripple, f.x, f.y, { sx: (40 + 380 * I) / 116, add: true, depth: s.ground.depth + 2, alpha: (1 - ph) * 0.8 * I, frame: Math.min(21, Math.floor(ph * 22)) });
      }
    } else {
      s.ground.fillStyle(0x0d47a1, 0.30 * I); s.ground.fillEllipse(f.x, f.y, 90 + 360 * I, 45 + 180 * I);
      s.ground.fillStyle(0x4fc3f7, 0.22 * I); s.ground.fillEllipse(f.x, f.y, 60 + 260 * I, 30 + 130 * I);
      for (let i = 0; i < 4; i++) {
        const ph = (now * 0.45 + i / 4) % 1;
        s.ground.lineStyle(2, 0xb3e5fc, (1 - ph) * 0.7 * I);
        s.ground.strokeEllipse(f.x, f.y, (40 + 380 * I) * ph, (20 + 190 * I) * ph);
      }
    }
    // springs at the stones, leaping higher as it builds
    for (const sp of s.spots) {
      if (k < sp.at) continue;
      const g = Math.min(1, (k - sp.at) * 4);
      const p = isoProject(sp.x, sp.y);
      const hgt = (18 + 46 * I) * g * (0.75 + 0.25 * Math.sin(now * 6 + sp.j * 9));
      if (art) {
        this._stageArt(s, ni++, spring, p.x, p.y + 3, { sx: 0.32, sy: Math.max(0.05, hgt / 80), add: true, depth: isoDepth(sp.x, sp.y) + 2, alpha: 0.85, t: now + sp.j * 3 });
        continue;
      }
      const gr = (sp.x + sp.y) < (s.x + s.y) ? s.addBack : s.addFront;
      gr.fillStyle(0x4fc3f7, 0.45); gr.fillEllipse(p.x, p.y - hgt / 2, 10, hgt);
      gr.fillStyle(0xe1f5fe, 0.7); gr.fillEllipse(p.x, p.y - hgt / 2, 4, hgt * 0.8);
      for (let d = 0; d < 3; d++) { const ph = (now * 1.6 + d / 3 + sp.j) % 1; gr.fillStyle(0xb3e5fc, 1 - ph); gr.fillCircle(p.x + (d - 1) * 8 * ph, p.y - hgt + ph * hgt * 0.8, 1.6); }
    }
    this._stageFlamesHide(s, ni);
    // bubbles rising round the caster
    for (let i = 0; i < 30; i++) {
      const ph = (now * 0.4 + i / 30) % 1, a = i * 2.399, r = 20 + (i * 17) % 120;
      s.addFront.lineStyle(1, 0xe1f5fe, (1 - ph) * 0.8 * I);
      s.addFront.strokeCircle(f.x + Math.cos(a) * r + Math.sin(now * 2 + i) * 4, f.y + Math.sin(a) * r * 0.5 - ph * 150, 2 + (i % 3));
    }
    // light under water, moving on the whole view
    const t = now * 0.8;
    for (let i = 0; i < 14; i++) {
      const x = ((i * 211 + t * 40) % (W + 200)) - 100, y = ((i * 149) % H) + Math.sin(t + i) * 20;
      s.sky.fillStyle(0x80d8ff, 0.05 * I); s.sky.fillEllipse(x, y, 180, 50);
    }
  },

  _stage_generic(s, k, I, now, f) {
    // ROUND 388 -- the two turning rings are fx2 `runecircle`s (white, flat, additive) and the column at the end a
    // white fx3 `healpillar`; the drawn ellipses, dots and bars are the fallback when they are not loaded.
    const rc = this._stageSheet('runecircle', 'white'), col = this._stageSheet('healpillar', 'white');
    const art = !!(rc && col);
    let ni = 0;
    for (let ring = 0; ring < 2; ring++) {
      const R = 90 + ring * 60 * (0.5 + I);
      if (art) {
        this._stageArt(s, ni++, rc, f.x, f.y, { sx: (R * 2) / 110, sy: R / 110, add: true, depth: s.ground.depth + 2 + ring, alpha: 0.3 + 0.45 * I, t: now * 0.5 + ring });
        continue;
      }
      s.ground.lineStyle(2, 0xce93d8, 0.3 + 0.4 * I); s.ground.strokeEllipse(f.x, f.y, R * 2, R);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + (ring ? -1 : 1) * now * 0.25;
        s.ground.fillStyle(0xe1bee7, 0.7 * I);
        s.ground.fillCircle(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R * 0.5, 2);
      }
    }
    const n = Math.round(12 + 40 * I);
    for (let i = 0; i < n; i++) {
      const ph = (now * 0.3 + i / n) % 1;
      const a = i * 2.399 + now * 0.4, rad = 20 + (i * 31) % 150;
      s.addFront.fillStyle(0xe1bee7, (1 - ph) * 0.8 * I); s.addFront.fillCircle(f.x + Math.cos(a) * rad, f.y + Math.sin(a) * rad * 0.5 - ph * 120, 1.6);
    }
    if (k > 0.7) {
      const g = clamp01((k - 0.7) * 3.3);
      if (art) this._stageArt(s, ni++, col, f.x, f.y + 4, { sx: 0.8 + 0.6 * g, sy: (0.8 + 0.6 * g) * 3.2, add: true, depth: s.d0 + 7, alpha: g, t: now });
      else for (const [w, al] of [[60, 0.1], [24, 0.3]]) { s.addFront.fillStyle(0xce93d8, al * g); s.addFront.fillRect(f.x - w / 2, f.y - 420, w, 420); }
    }
    this._stageFlamesHide(s, ni);
  },
};
