// ===========================================================================
// ROUND 316 -- THE END OF OLB NIKOBE'S HUNT: A GOD, A DOOR, A MAN BURNING.
//
// The words and the numbers are in src/data/olbHunt.js. This is the scene:
// one timeline (`this._olbCut = { ph, t }`) driven by the frame's own dt, so a
// slow machine plays the same story, only longer. Dialogue pages interrupt
// the timeline wherever a beat needs words; the timeline keeps running under
// them (a god fading in while someone speaks about it is the point).
//
//   fight -> appear -> slam -> breakFx -> (pages) -> run -> portal -> cross
//         -> burnBuild -> (pages) -> runBeat -> blast -> black -> wake
//
// `h.step` is 'god' while the beats are in the cave and 'farside' once you are
// through the door. A save made mid-scene resumes at the nearest safe beat
// (`_olbCutResume`).
// ===========================================================================

import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { CHAR_ART } from '../data/characterManifest.js';
import { scarLine } from '../data/soulScars.js';
import { OLB_ROOM_ID, olbAstralMap } from '../data/olbHunt.js';
import { OLB_ASTRAL_ROOM } from '../data/interiors.js';
import {
  OLB_GOD_TRIGGER, OLB_CUT_TIMES as T, OLB_GOD_PAGES, OLB_SLAM_BARKS, OLB_BREAK_PAGES,
  OLB_PORTAL_BARKS, OLB_BURN_PAGES, OLB_RUN_BARK, OLB_WAKE_PAGES,
  OLB_FRIENDS_LINE,
} from '../data/olbHunt.js';
import { OLB_NAME } from '../data/olbArc.js';

const GOD_ART = 'god_destruction';
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));

export const OlbFinaleMixin = {

  // -------------------------------------------------------------------------
  // THE VEIL: a full-screen wash over the game, under the dialogue
  // -------------------------------------------------------------------------
  _olbVeil() {
    if (this._olbVeilEl && this._olbVeilEl.isConnected) return this._olbVeilEl;
    const el = document.createElement('div');
    el.id = 'olbVeil';
    Object.assign(el.style, {
      position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '15', opacity: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8d8d8d', font: 'italic 22px Georgia, serif', textAlign: 'center', padding: '0 12%',
    });
    document.body.appendChild(el);
    this._olbVeilEl = el;
    return el;
  },

  /** `bg` is any CSS background; `opacity` 0..1; `text` optional. */
  _olbVeilPaint(bg, opacity, text) {
    const el = this._olbVeil();
    el.style.background = bg;
    el.style.opacity = String(clamp01(opacity));
    if (text !== undefined && el.textContent !== text) el.textContent = text;
  },

  _olbVeilClear() {
    if (this._olbVeilEl) {
      this._olbVeilEl.style.opacity = '0';
      this._olbVeilEl.textContent = '';
    }
  },

  _olbVeilRemove() {
    if (this._olbVeilEl && this._olbVeilEl.remove) this._olbVeilEl.remove();
    this._olbVeilEl = null;
  },

  /** red and black closing in from the edges; k 0..1 (1 = the whole screen). */
  _olbAuraWash(k) {
    const clear = Math.max(0, 70 - k * 78);      // % of the radius still clear
    const red = Math.max(clear + 6, 100 - (1 - k) * 46);
    const bg = `radial-gradient(ellipse at center, rgba(0,0,0,0) ${clear}%, `
      + `rgba(140,10,10,${0.55 + 0.4 * k}) ${red}%, rgba(8,0,0,${0.9 + 0.1 * k}) 100%)`;
    this._olbVeilPaint(bg, Math.min(1, 0.25 + k * 1.2));
  },

  // -------------------------------------------------------------------------
  // BEGIN: the fight turns
  // -------------------------------------------------------------------------
  _olbMouthDown() {
    const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
    if (!camp) return 0;
    return camp.people.filter(c => !c.alive).length;
  },

  _olbGodBegin(h) {
    const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
    if (!camp || this._olbCut) return;
    h.step = 'god'; h.frozen = true;
    camp.engaged = false;                              // the hall holds still
    for (const c of camp.people) c.hostile = false;
    this._olbCutLock = true;
    this._olbCut = { ph: 'appear', t: 0, rings: [] };
    const c = this._olbCut;
    // the god, at the frame, unseen at first
    const room = OLB_ASTRAL_ROOM, m = olbAstralMap();
    const at = room.at(m.marks.godSpot.x, m.marks.godSpot.y);
    c.gx = at.x; c.gy = at.y;
    const art = CHAR_ART[GOD_ART];
    const tex = `char_${GOD_ART}_idle`;
    if (art && this.textures.exists(tex)) {
      const p = isoProject(at.x, at.y);
      const s = this.add.sprite(p.x, p.y, tex, dirRow('east'));
      s.setOrigin(art.footX / art.cell, art.anims.idle.foot / art.cell);
      s.setScale(1.6);
      s.setAlpha(0);
      s.setDepth(isoDepth(at.x, at.y) + 3);
      this.interiorSprites.push(this._tagRoom(s, room));
      c.god = s;
    }
    c.fx = this.add.graphics();
    c.fx.setDepth(isoDepth(at.x, at.y) + 40);
    this.interiorSprites.push(this._tagRoom(c.fx, room));
    // Olb stands between you and it
    const b = this._olbBody;
    if (b) {
      const dx = at.x - this.world.x, dy = at.y - this.world.y, d = Math.hypot(dx, dy) || 1;
      const stand = Math.min(TILE * 1.4, d * 0.5);
      b.x = this.world.x + (dx / d) * stand; b.y = this.world.y + (dy / d) * stand;
      b.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
      b.moving = false;
      this._olbDraw(b, 0);
    }
    this.player.facing = c.gx > this.world.x ? 'east' : 'west';
    this.cameras.main.shake(500, 0.004);
    this._olbPlayScene(OLB_GOD_PAGES, () => { c.ph = 'slam'; c.t = 0; });
  },

  // -------------------------------------------------------------------------
  // THE TIMELINE
  // -------------------------------------------------------------------------
  _olbCutTick(dt) {
    const c = this._olbCut;
    if (!c) return;
    const h = this._olbHunt();
    if (!h) { this._olbCutEnd(); return; }
    c.t += dt;
    // nothing in the scene may kill you
    if (this.player) { this.player.invuln = Math.max(this.player.invuln || 0, 2); this.player.dead = false; }
    const b = this._olbBody;
    switch (c.ph) {
      case 'appear': {
        if (c.god) c.god.setAlpha(clamp01(c.t / T.appear));
        c.fx.clear();
        this._olbGodGlow(c, clamp01(c.t / T.appear));
        break;
      }
      case 'slam': {
        const k = clamp01(c.t / T.slam);
        if (c.god) c.god.setAlpha(1);
        this._olbAuraWash(k * k * (3 - 2 * k));
        if (!c.shook || c.t - c.shook > 0.7) { c.shook = c.t; this.cameras.main.shake(700, 0.002 + 0.008 * k); }
        if (this.playerSprite) this.playerSprite.setTint(k > 0.5 ? 0x7a1a1a : 0xcc8888);
        if (!c.b0 && k > 0.06) { c.b0 = true; this._sayOverhead({ x: this.world.x, y: this.world.y }, OLB_SLAM_BARKS.player, '#ef9a9a', 3.2); }
        if (!c.b1 && k > 0.30 && b) { c.b1 = true; this._sayOverhead(b, OLB_SLAM_BARKS.olb1, '#ffe082', 3.2); }
        if (!c.b2 && k > 0.62 && b) { c.b2 = true; this._sayOverhead(b, OLB_SLAM_BARKS.olb2, '#ffe082', 3.2); }
        if (!c.b3 && k > 0.88 && b) { c.b3 = true; this._sayOverhead(b, OLB_SLAM_BARKS.olb3, '#fff59d', 2.4); }
        c.fx.clear();
        this._olbGodGlow(c, 1);
        if (c.t >= T.slam) { c.ph = 'breakFx'; c.t = 0; this._olbBreakBegin(c); }
        break;
      }
      case 'breakFx': {
        const k = clamp01(c.t / T.breakFx);
        // the dark breaks like a plate: white, then clear
        const wash = Math.max(0, 1 - k * 2.6);
        if (wash > 0.01) this._olbVeilPaint(`rgba(255,246,225,${wash})`, wash);
        else this._olbVeilClear();
        if (this.playerSprite) this.playerSprite.clearTint();
        c.fx.clear();
        this._olbRings(c, dt, 0xfff3c4);
        this._olbGodGlow(c, 1 - k * 0.7);
        if (c.god) c.god.setAlpha(lerp(1, 0.38, k));
        if (c.t >= T.breakFx) {
          c.ph = 'pages'; c.t = 0;
          this._olbPlayScene(OLB_BREAK_PAGES, () => { c.ph = 'run'; c.t = 0; }, 'The hall');
        }
        break;
      }
      case 'run': {
        if (!b) { c.ph = 'portal'; c.t = 0; break; }
        const dx = this.world.x - b.x, dy = this.world.y - b.y, d = Math.hypot(dx, dy);
        c.fx.clear();
        this._olbGodGlow(c, 0.3);
        if (d > 44) {
          const step = Math.min(d, 330 * dt);
          b.x += (dx / d) * step; b.y += (dy / d) * step;
          b.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north');
          b.moving = true;
          this._olbDraw(b, dt);
        } else {
          b.moving = false; this._olbDraw(b, 0);
          c.ph = 'portal'; c.t = 0; c.px = this.world.x; c.py = this.world.y;
          this._sayOverhead(b, OLB_PORTAL_BARKS.open, '#fff59d', 2.4);
        }
        if (c.t > 7) { c.ph = 'portal'; c.t = 0; c.px = this.world.x; c.py = this.world.y; }   // a wall in the way
        break;
      }
      case 'portal': {
        const k = clamp01(c.t / T.portal);
        if (c.px === undefined) { c.px = this.world.x; c.py = this.world.y; }
        c.fx.clear();
        this._olbDrawPortal(c, k);
        // you both go in
        if (k > 0.55) {
          const a = 1 - clamp01((k - 0.55) / 0.35);
          if (this.playerSprite) this.playerSprite.setAlpha(a);
          if (b && b.sprite) b.sprite.setAlpha(a);
        }
        if (c.t >= T.portal) { c.ph = 'cross'; c.t = 0; }
        break;
      }
      case 'cross': {
        const k = clamp01(c.t / T.cross);
        this._olbVeilPaint('#fffaf0', k);
        if (k >= 1 && !c.crossed) {
          c.crossed = true;
          this._olbCross(h, c);
          c.ph = 'burnBuild'; c.t = 0;
        }
        break;
      }
      case 'burnBuild': {
        const k = clamp01(c.t / T.burnBuild);
        const veil = 1 - clamp01(c.t / 0.9);
        if (veil > 0.01) this._olbVeilPaint('#fffaf0', veil); else this._olbVeilClear();
        this._olbBurnFx(c, dt, k);
        if (c.t >= T.burnBuild) {
          c.ph = 'pages'; c.t = 0;
          this._olbPlayScene(OLB_BURN_PAGES, () => { c.ph = 'runBeat'; c.t = 0; c.said = false; }, 'Beyond the walls');
        }
        break;
      }
      case 'runBeat': {
        this._olbBurnFx(c, dt, 1.0 + clamp01(c.t / T.runBeat) * 0.6);
        if (!c.said && b) {
          c.said = true;
          this._floatText(b.x, b.y - 120, OLB_RUN_BARK, '#ff1744');
          this.cameras.main.shake(900, 0.012);
        }
        if (c.t >= T.runBeat) { c.ph = 'blast'; c.t = 0; c.blasted = false; }
        break;
      }
      case 'blast': {
        const k = clamp01(c.t / T.blast);
        if (!c.blasted) {
          c.blasted = true;
          c.rings = [{ r: 0, a: 1 }, { r: -30, a: 1 }];
          c.bx = b ? b.x : this.world.x; c.by = b ? b.y : this.world.y;
          this.cameras.main.shake(1400, 0.03);
          this._olbDropBody();                            // 4.1.10: he is gone
          c.gone = true;
        }
        c.fx.clear();
        this._olbBlastFx(c, dt, k);
        // red, then white, then the player is gone from the world
        if (k < 0.35) this._olbVeilPaint(`rgba(255,40,20,${0.15 + k * 2})`, 0.15 + k * 2);
        else if (k < 0.7) this._olbVeilPaint('#ffffff', 0.6 + (k - 0.35) * 1.1);
        else this._olbVeilPaint('#000', clamp01((k - 0.7) / 0.3));
        if (c.t >= T.blast) { c.ph = 'black'; c.t = 0; c.fx.clear(); }
        break;
      }
      case 'black': {
        this._olbVeilPaint('#000', 1, c.t > 1.2 ? 'Nothing. Nothing. Nothing, and then a long way off, a bell.' : '');
        if (c.t >= T.black) { c.ph = 'wake'; c.t = 0; c.woke = false; }
        break;
      }
      case 'wake': {
        if (!c.woke) { c.woke = true; this._olbWake(h, c); }
        const k = clamp01(c.t / T.wake);
        this._olbVeilPaint('#000', 1 - k, k > 0.2 ? '' : undefined);
        if (c.t >= T.wake) this._olbWakeDialogue(h, c);
        break;
      }
      default: break;
    }
  },

  _olbCutEnd() {
    const c = this._olbCut;
    if (c) {
      for (const k of ['god', 'fx']) if (c[k] && c[k].destroy) c[k].destroy();
    }
    this._olbCut = null;
    this._olbScene = null;
    this._olbCutLock = false;
    if (this.playerSprite) { this.playerSprite.clearTint(); this.playerSprite.setAlpha(1); }
    this._olbVeilClear();
  },

  // ---- drawings ------------------------------------------------------------
  _olbGodGlow(c, k) {
    if (!c.fx || k <= 0) return;
    const p = isoProject(c.gx, c.gy), g = c.fx;
    const pulse = 0.5 + 0.5 * Math.sin((c.t || 0) * 5);
    g.fillStyle(0x1a0000, 0.35 * k);
    g.fillEllipse(p.x, p.y - 70, 260 * k, 300 * k);
    g.fillStyle(0xff3d00, (0.12 + 0.12 * pulse) * k);
    g.fillEllipse(p.x, p.y - 70, 180 * k, 230 * k);
    g.fillStyle(0xff8a50, 0.18 * k);
    g.fillEllipse(p.x, p.y + 4, 200 * k, 52 * k);
  },

  _olbBreakBegin(c) {
    const b = this._olbBody;
    c.rings = [{ r: 0, a: 1 }, { r: -24, a: 1 }, { r: -48, a: 1 }];
    c.rx = b ? b.x : this.world.x; c.ry = b ? b.y : this.world.y;
    this.cameras.main.shake(900, 0.02);
    // the Mouth that are left are thrown down
    const camp = (this._realmCamps || []).find(x => x.realm === OLB_ROOM_ID);
    if (camp) for (const m of camp.people) if (m.alive && m.sprite) m.sprite.setAlpha(0.35);
  },

  _olbRings(c, dt, color) {
    if (!c.rings) return;
    const g = c.fx;
    for (const r of c.rings) {
      r.r += dt * 420; r.a = Math.max(0, 1 - r.r / 560);
      if (r.r <= 0 || r.a <= 0) continue;
      const p = isoProject(c.rx, c.ry);
      g.lineStyle(6, color, r.a);
      g.strokeEllipse(p.x, p.y - 20, r.r * 2, r.r);
    }
  },

  _olbDrawPortal(c, k) {
    const g = c.fx, p = isoProject(c.px, c.py);
    const open = clamp01(k / 0.4), pulse = 0.5 + 0.5 * Math.sin(c.t * 9);
    g.fillStyle(0x0a0614, 0.85);
    g.fillEllipse(p.x, p.y - 48, 110 * open, 190 * open);
    for (let i = 0; i < 5; i++) {
      const q = i / 4;
      g.lineStyle(4, i % 2 ? 0x7e57c2 : 0xe1bee7, 0.95 - q * 0.45);
      g.strokeEllipse(p.x, p.y - 48, (110 - q * 66) * open + pulse * 4, (190 - q * 112) * open + pulse * 8);
    }
    g.fillStyle(0xf3e5f5, (0.4 + 0.4 * pulse) * open);
    g.fillEllipse(p.x, p.y - 48, 20 * open, 54 * open);
  },

  /** Olb burns from the inside: seams of light, embers going up, a tint. */
  _olbBurnFx(c, dt, k) {
    const b = this._olbBody;
    if (!b || !b.sprite || !b.sprite.active) return;
    if (!c.fx) c.fx = this.add.graphics();
    const g = c.fx;
    g.clear();
    g.setDepth(isoDepth(b.x, b.y) + 30);
    const p = isoProject(b.x, b.y);
    const kk = Math.min(1.6, k), pulse = 0.5 + 0.5 * Math.sin((c.t || 0) * 7);
    const tint = kk < 0.5 ? 0xffd9a0 : (kk < 1 ? 0xff9a50 : 0xff5a2a);
    b.sprite.setTint(tint);
    g.fillStyle(0xff3d00, Math.min(0.4, (0.1 + 0.16 * pulse) * kk));
    g.fillEllipse(p.x, p.y - 42, 130 + kk * 70, 170 + kk * 80);
    g.fillStyle(0xff6e40, Math.min(0.6, (0.22 + 0.26 * pulse) * kk));
    g.fillEllipse(p.x, p.y - 40, 76 + kk * 44, 106 + kk * 54);
    g.fillStyle(0xfff3c4, Math.min(0.6, 0.15 * kk + 0.12 * pulse));
    g.fillEllipse(p.x, p.y - 44, 26 + kk * 18, 70 + kk * 24);
    // seams of light
    g.lineStyle(2, 0xffe082, Math.min(1, 0.4 + kk * 0.5));
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * 7, top = p.y - 74 + (i % 2) * 6, bot = p.y - 14 - (i % 3) * 5;
      g.beginPath(); g.moveTo(p.x + ox, top);
      g.lineTo(p.x + ox + 4, (top + bot) / 2); g.lineTo(p.x + ox - 3, bot); g.strokePath();
    }
    // embers
    c.em = c.em || [];
    if (c.em.length < 26 && Math.random() < 0.7 * kk) c.em.push({ x: p.x + (Math.random() - 0.5) * 36, y: p.y - 30 - Math.random() * 30, v: 28 + Math.random() * 40, a: 1 });
    for (const e of c.em) { e.y -= e.v * dt; e.a -= dt * 0.7; }
    c.em = c.em.filter(e => e.a > 0);
    for (const e of c.em) { g.fillStyle(0xffab40, e.a); g.fillCircle(e.x, e.y, 2.2); }
    // he stands facing you
    b.facing = this.world.x < b.x ? 'west' : 'east';
    b.moving = false;
    this._olbDraw(b, 0);
  },

  _olbBlastFx(c, dt, k) {
    const g = c.fx, p = isoProject(c.bx, c.by);
    for (const r of c.rings || []) {
      r.r += dt * 900; r.a = Math.max(0, 1 - r.r / 1100);
      if (r.r <= 0 || r.a <= 0) continue;
      g.fillStyle(r === c.rings[0] ? 0xff3d00 : 0xffffff, r.a * 0.35);
      g.fillEllipse(p.x, p.y - 30, r.r * 2, r.r * 1.1);
      g.lineStyle(10, 0xffffff, r.a);
      g.strokeEllipse(p.x, p.y - 30, r.r * 2, r.r * 1.1);
    }
    g.fillStyle(0xffffff, Math.max(0, 1 - k * 1.5));
    g.fillCircle(p.x, p.y - 40, 40 + k * 160);
  },

  // -------------------------------------------------------------------------
  // THE FAR SIDE
  // -------------------------------------------------------------------------
  /** You and he come out of the seam where the nest was. */
  _olbCross(h, c) {
    h.step = 'farside';
    for (const k of ['god', 'fx']) if (c[k] && c[k].destroy) { c[k].destroy(); c[k] = null; }
    this.player.facing = 'east';
    if (this.playerSprite) { this.playerSprite.clearTint(); this.playerSprite.setAlpha(1); }
    const b = this._olbBody;
    if (b && b.sprite) b.sprite.setAlpha(1);
    this._olbLeaveAstral();
    this._olbApertureHide();
    h.frozen = true;
    this._olbCutLock = true;
    c.fx = this.add.graphics();
    if (b) {
      b.facing = 'west';
      // two tiles off, where the ground is clear
      for (const [dx, dy] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.2, 1.2]]) {
        const x = this.world.x + dx * TILE, y = this.world.y + dy * TILE;
        if (!this._collidesObstacle(x, y, 14) && !this._isWaterAt(x, y)) { b.x = x; b.y = y; break; }
      }
      this._olbDraw(b, 0);
    }
    const pt = isoProject(this.world.x, this.world.y);
    this.cameras.main.centerOn(pt.x, pt.y);
    this._updateGroundViewport(true);
    this._updateForestViewport(true);
    this._updateRockViewport(true);
    if (this._updateStaticViewport) this._updateStaticViewport(true);
  },

  // -------------------------------------------------------------------------
  // WAKING (4.1.11, 4.1.12)
  // -------------------------------------------------------------------------
  _olbWake(h, c) {
    const st = this.player.olb;
    for (const k of ['fx']) if (c[k] && c[k].destroy) { c[k].destroy(); c[k] = null; }
    this._olbDropBody();
    this._olbApertureHide();
    // carried to where the game would put you
    let at = null;
    try { at = this._respawnAnchor(); } catch (e) { at = null; }
    if (at && !at.inSewer) { this.world.x = at.x; this.world.y = at.y; }
    const pt = isoProject(this.world.x, this.world.y);
    if (this.playerSprite) { this.playerSprite.setPosition(pt.x, pt.y); this.playerSprite.setAlpha(1); this.playerSprite.clearTint(); }
    this.cameras.main.centerOn(pt.x, pt.y);
    this._updateGroundViewport(true);
    this._updateForestViewport(true);
    this._updateRockViewport(true);
    if (this._updateStaticViewport) this._updateStaticViewport(true);
    // healed, rested
    this.player.hp = this.player.maxHp; this.player.mana = this.player.maxMana; this.player.stamina = this.player.maxStamina;
    // 4.1.11 -- the scar. (4.1.12 is his timeline note, not a grant: nothing is given.)
    c.scar = this._addSoulScar('destruction', { quiet: true });
    // the story is over for him
    if (st) {
      st.dead = true; st.diedAt = this._clockT || 0;
      if (st.hunt) { st.hunt.step = 'wake'; st.hunt.frozen = false; }
    }
    this._olbHideHallNpc();
  },

  _olbWakeDialogue(h, c) {
    if (c.pagesShown) return;
    c.pagesShown = true;
    const scar = c.scar;
    const pages = [...OLB_WAKE_PAGES];
    const scarText = scar ? `A new scar: ${scarLine(scar)}.` : '';
    this._olbVeilClear();
    this._olbCutEnd();
    const sc = this.player.olb;
    if (sc) { sc.phase = 'idle'; sc.stage = 'hunt'; if (sc.hunt) sc.hunt.step = 'done'; }
    this._olbPlayScene([
      { who: null, text: pages[0] },
      { who: null, text: pages[1] + (scarText ? `\n\n${scarText}` : '') },
    ], null, 'The infirmary', 'Get up');
  },

  // -------------------------------------------------------------------------
  // A SAVE MID-SCENE
  // -------------------------------------------------------------------------
  /** `h.step` says 'god' or 'farside' but there is no timeline (a reload). */
  _olbCutResume(h) {
    if (this._olbCut) return;
    if (h.step === 'god') {
      // back to the fight; the scene starts again when the count is met
      h.step = 'fight'; h.frozen = false;
      const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
      if (camp) { camp.engaged = true; for (const m of camp.people) if (m.alive) m.hostile = true; }
      return;
    }
    if (h.step === 'farside') {
      this._olbEnsureBody(true);
      this._olbCut = { ph: 'burnBuild', t: 0, rings: [], fx: this.add.graphics() };
      this._olbCutLock = true; h.frozen = true;
    }
  },

  // -------------------------------------------------------------------------
  // AFTER
  // -------------------------------------------------------------------------
  /** Olb is dead. True once the finale has run. */
  _olbIsDead() {
    const st = this.player.olb;
    return !!(st && st.dead);
  },

  _olbNeedsFriends() {
    if (!this._olbIsDead()) return false;
    return !(this.party || []).some(m => m && m.recruited);
  },

  _olbFriendsObjective() {
    return this._olbNeedsFriends() ? { title: 'Olb Nikobe', line: OLB_FRIENDS_LINE, ready: false } : null;
  },

  _olbName() { return OLB_NAME; },
};
