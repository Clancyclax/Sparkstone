// ===========================================================================
// ROUND 359 -- THE SEAM BELOW, MADE LARGER AND LOUDER; OLB AT YOUR SHOULDER.
//
// The user's items this file carries (the words are in src/data/olbHunt.js):
//
//   3     the astral space bigger, a starscape in the black, "it can be weird"
//   3.1   the route ~3x longer and a little wider, with rocks and oddly coloured grass
//   3.2   cult packs on the way that explain the plan in parts; Olb on why adventurers step in
//   3.3   Destruction and the cultists in view while you hide behind the stacks
//   3.4   Destruction visibly attacking Olb while you stand petrified
//   3.6   speech held steady while the screen shakes
//   4     the new portal animation for the way in and the way out
//   5     the explosion sheets over the drawn blast
//   6     waking in the Society infirmary, the Healer's priest, Zeke
//   7     Olb on your essences, and the two of you, on the road and in the Seam
//   7.1   Olb's shield, a few times, and around you at the very end
//
// Everything here is called from olbHuntMixin.js / olbFinaleMixin.js at the
// beat it belongs to; nothing ticks on its own except `_olbAstralTick`, which
// the hunt tick calls every frame.
// ===========================================================================

import Phaser from '../../public/vendor/phaser.esm.min.js';
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { CHAR_ART } from '../data/characterManifest.js';
import { fxFamilyInfo } from '../data/spellFx.js';
import { ROCK_COUNT, ROCK_RADIUS } from '../data/rockManifest.js';
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import { ESSENCES } from '../data/abilities.js';   // ROUND 403 -- the confluence, for Olb's line
import { confluenceDefFor } from '../data/awakening.js';
import { scarLine } from '../data/soulScars.js';
import { OLB_ASTRAL_ROOM, roomTileCentre, INFIRMARY_WAKE_BED, interiorRoomById, VOID_MARGIN_TILES } from '../data/interiors.js';   // ROUND 388 -- the margin
import {
  OLB_ROOM_ID, olbAstralMap, OLB_PACKS, OLB_TALKS, OLB_GRASS_TINTS, olbEssenceInsight, olbConfluenceLine,
  OLB_SHIELD, OLB_SHIELD_BARKS, OLB_SLAM_BARKS, INFIRMARY_WAKE_PAGES, INFIRMARY_PRIEST_IDLE, INFIRMARY_PRIEST_DEFAULT,
  INFIRMARY_PRIEST_TITLE,
} from '../data/olbHunt.js';

const STAR_DEPTH = -2_000_000_000;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const GOD_ART = 'god_destruction';
/** ROUND 388 -- where you stand up, in tiles from the wake bed's centre: its foot in the aisle (the bed is in the south
 *  row, so the aisle is north of it), then its west and east sides. Each is 1.5 tiles (48) out: clear of the bed's
 *  28.8 collider plus a 12 body, and of the next bed along the row (three tiles away). */
export const INFIRMARY_WAKE_STEPS = [[0, -1.5], [-1.5, 0], [1.5, 0], [-1.5, -1.5], [1.5, -1.5]];
/** The player's body, as `_tryMove` tests it. */
const WAKE_BODY = 12;

export const OlbAstralMixin = {

  // -------------------------------------------------------------------------
  // THE FRAME TICK
  // -------------------------------------------------------------------------
  _olbAstralTick(dt) {
    const inSeam = !!(this._olbInRoom && this._olbInRoom());
    this._olbStarscape(inSeam);
    // ROUND 388 -- the sky is solid now, so a body put out on it (a blink, a shove, a cutscene's placement) would be
    // refused every step back. Put it back on the ground: the player by the nearest free spot, Olb beside the player.
    if (inSeam && this.world && this._olbVoidHit(this.world.x, this.world.y, 12) && this._unstickPlayer) this._unstickPlayer('seam sky');
    const ob = this._olbBody;
    if (inSeam && ob && !this._olbCut && this._olbVoidHit(ob.x, ob.y, 14) && this._olbPlaceBeside) this._olbPlaceBeside();
    this._olbTickPortals(dt);
    this._olbShieldTick(dt);
    if (this._soulHold != null && this._soulTick) this._soulTick(0);   // the held soul bar moves through a cutscene
    if ((this._olbCutLock || this._dialogueOpen) && this._tickOverhead) this._tickOverhead();   // speech follows (and holds steady) through a cutscene
  },

  // -------------------------------------------------------------------------
  // 3 -- THE STARSCAPE: two layers of sky behind the floor, drifting at different speeds, and the void tiles of the
  // room drawn clear so the sky shows through them. It can be weird: a ringed world, a red one, a nebula like an eye,
  // and pale shards of something that broke a long time ago, turning slowly.
  // -------------------------------------------------------------------------
  _olbSkyTextures() {
    if (this.textures.exists('olbSkyFar')) return;
    const mk = (key, w, paint) => { const c = document.createElement('canvas'); c.width = c.height = w; paint(c.getContext('2d'), w); this.textures.addCanvas(key, c); };
    let seed = 359;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const wrap = (W, fn) => { for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) fn(ox, oy); };
    mk('olbSkyFar', 1024, (g, W) => {
      const bg = g.createLinearGradient(0, 0, W, W);
      bg.addColorStop(0, '#06030f'); bg.addColorStop(0.5, '#0a0618'); bg.addColorStop(1, '#03070f');
      g.fillStyle = bg; g.fillRect(0, 0, W, W);
      // nebulae, wrapped so the tile has no seam
      const neb = [['rgba(170,40,200,', 260], ['rgba(30,190,200,', 220], ['rgba(220,60,120,', 180], ['rgba(70,90,255,', 300], ['rgba(120,255,140,', 140]];
      for (let i = 0; i < 9; i++) {
        const [col, R] = neb[i % neb.length];
        const x = rnd() * W, y = rnd() * W, r = R * (0.6 + rnd() * 0.8), a = 0.10 + rnd() * 0.12;
        wrap(W, (ox, oy) => {
          const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
          gr.addColorStop(0, col + a + ')'); gr.addColorStop(0.6, col + (a * 0.4) + ')'); gr.addColorStop(1, col + '0)');
          g.fillStyle = gr; g.beginPath(); g.ellipse(x + ox, y + oy, r, r * (0.45 + rnd() * 0.3), rnd() * 3, 0, Math.PI * 2); g.fill();
        });
      }
      // the eye: a long nebula with a dark pupil
      { const x = 700, y = 300; const gr = g.createRadialGradient(x, y, 0, x, y, 120);
        gr.addColorStop(0, 'rgba(255,190,90,0.35)'); gr.addColorStop(0.35, 'rgba(255,120,60,0.18)'); gr.addColorStop(1, 'rgba(120,20,80,0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, 150, 46, -0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(5,2,10,0.85)'; g.beginPath(); g.ellipse(x, y, 16, 30, -0.2, 0, Math.PI * 2); g.fill(); }
      // stars
      for (let i = 0; i < 1600; i++) {
        const x = rnd() * W, y = rnd() * W, b = rnd();
        const c = b > 0.97 ? '#ffd8a8' : b > 0.94 ? '#a8d8ff' : b > 0.91 ? '#ffb0e8' : '#ffffff';
        g.globalAlpha = 0.25 + rnd() * 0.75; g.fillStyle = c;
        g.fillRect(x, y, b > 0.985 ? 2 : 1, b > 0.985 ? 2 : 1);
      }
      g.globalAlpha = 1;
      // a ringed world and a red one
      const planet = (x, y, r, c0, c1, ring) => {
        const gr = g.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
        gr.addColorStop(0, c0); gr.addColorStop(1, c1);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        if (ring) { g.strokeStyle = 'rgba(220,200,255,0.55)'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, r * 2.1, r * 0.5, -0.35, 0, Math.PI * 2); g.stroke(); }
      };
      planet(220, 760, 46, '#d6b3ff', '#3a1d6e', true);
      planet(860, 820, 22, '#ff8a65', '#5a1206', false);
      planet(420, 180, 9, '#b2fff0', '#0e4a44', false);
    });
    mk('olbSkyNear', 512, (g, W) => {
      g.clearRect(0, 0, W, W);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, y = rnd() * W, r = 1 + rnd() * 1.8;
        wrap(W, (ox, oy) => {
          const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r * 4);
          gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.3, 'rgba(200,220,255,0.35)'); gr.addColorStop(1, 'rgba(200,220,255,0)');
          g.fillStyle = gr; g.fillRect(x + ox - r * 4, y + oy - r * 4, r * 8, r * 8);
        });
      }
      // pale shards, drifting
      g.strokeStyle = 'rgba(190,170,255,0.28)'; g.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const x = rnd() * W, y = rnd() * W, s = 14 + rnd() * 26, a = rnd() * 6;
        g.beginPath(); g.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
        g.lineTo(x + Math.cos(a + 2.3) * s * 0.6, y + Math.sin(a + 2.3) * s * 0.6);
        g.lineTo(x + Math.cos(a + 4.1) * s * 0.8, y + Math.sin(a + 4.1) * s * 0.8); g.closePath(); g.stroke();
      }
    });
    if (!this.textures.exists('astralVoidClear')) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 32;
      this.textures.addSpriteSheet('astralVoidClear', c, { frameWidth: 64, frameHeight: 32 });
    }
  },

  _olbStarscape(on) {
    if (!on) {
      if (this._olbSky) { for (const o of this._olbSky) o.destroy(); this._olbSky = null; }
      return;
    }
    const cam = this.cameras.main;
    if (!this._olbSky) {
      this._olbSkyTextures();
      const far = this.add.tileSprite(0, 0, cam.width, cam.height, 'olbSkyFar').setOrigin(0, 0).setScrollFactor(0).setDepth(STAR_DEPTH);
      const near = this.add.tileSprite(0, 0, cam.width, cam.height, 'olbSkyNear').setOrigin(0, 0).setScrollFactor(0).setDepth(STAR_DEPTH + 1)
        .setBlendMode(Phaser.BlendModes.ADD);
      this._olbSky = [far, near];
    }
    const [far, near] = this._olbSky;
    const z = cam.zoom || 1;
    const t = this.time.now / 1000;
    for (const o of this._olbSky) { if (o.width !== cam.width || o.height !== cam.height) o.setSize(cam.width, cam.height); }
    far.setTileScale(1 / z, 1 / z);
    near.setTileScale(1 / z, 1 / z);
    // parallax: the far sky barely moves, the near shards drift on their own as well
    far.tilePositionX = cam.scrollX * 0.06 * z + t * 2;
    far.tilePositionY = cam.scrollY * 0.06 * z;
    near.tilePositionX = cam.scrollX * 0.18 * z - t * 6;
    near.tilePositionY = cam.scrollY * 0.18 * z + t * 3;
    near.setAlpha(0.75 + 0.25 * Math.sin(t * 0.7));
  },

  // -------------------------------------------------------------------------
  // ROUND 388 -- THE SKY IS NOT GROUND.
  //
  //   "The background of the astral space is walkable, funny but goes against the point of having obvious ground."
  //
  // The Seam is an astral room, and an astral room is skipped by the wall builder (a realm's edge is the void), so
  // inside its district `_collidesObstacle` had nothing to test but the rocks and the crates: the starfield was floor.
  // Now every tile that draws as sky -- anything in the Seam's district that is not a floor tile of `olbAstralMap()` --
  // is solid, circle against the tile square the way `_solidTiles` is. `_collidesObstacle` and `_obstacleDepth` ask
  // here, so the player, Olb, the cult and every monster stop at the edge (and one that is somehow out on it is pushed
  // back toward the ground); the path grid already treats a TILE_VOID tile as blocked.
  // -------------------------------------------------------------------------
  /** The Seam's district in world units, or null outside it. */
  _olbVoidBox(x, y) {
    const r = OLB_ASTRAL_ROOM, M = VOID_MARGIN_TILES * TILE;
    if (x < r.x - M || y < r.y - M || x > r.x + r.w * TILE + M || y > r.y + r.h * TILE + M) return null;
    return r;
  },

  /** Is any of a body of `radius` at (x, y) over the Seam's sky? False outside the Seam's district. */
  _olbVoidHit(x, y, radius) {
    const room = this._olbVoidBox(x, y);
    if (!room) return false;
    const m = olbAstralMap();
    const rr = Math.max(0, radius || 0);
    const lx = x - room.x, ly = y - room.y;
    const t0x = Math.floor((lx - rr) / TILE), t1x = Math.floor((lx + rr) / TILE);
    const t0y = Math.floor((ly - rr) / TILE), t1y = Math.floor((ly + rr) / TILE);
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        if (tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && m.grid[ty * m.w + tx] === 1) continue;
        const cx = Math.min(Math.max(lx, tx * TILE), tx * TILE + TILE);
        const cy = Math.min(Math.max(ly, ty * TILE), ty * TILE + TILE);
        const d2 = (lx - cx) * (lx - cx) + (ly - cy) * (ly - cy);
        if (d2 === 0 || d2 < rr * rr) return true;
      }
    }
    return false;
  },

  /** How far into the sky a body is (0 when clear): a gradient back to the ground for `_monsterStep`'s escape. */
  _olbVoidDepth(x, y, radius) {
    const room = this._olbVoidBox(x, y);
    if (!room || !this._olbVoidHit(x, y, radius)) return 0;
    const m = olbAstralMap();
    const lx = x - room.x, ly = y - room.y;
    const floor = (tx, ty) => tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && m.grid[ty * m.w + tx] === 1;
    const sq = (tx, ty) => {
      const cx = Math.min(Math.max(lx, tx * TILE), tx * TILE + TILE), cy = Math.min(Math.max(ly, ty * TILE), ty * TILE + TILE);
      return Math.hypot(lx - cx, ly - cy);
    };
    const ctx = Math.floor(lx / TILE), cty = Math.floor(ly / TILE);
    if (floor(ctx, cty)) {
      // the centre is on the ground and the edge of the body is over the sky: how far over
      let near = Infinity;
      const R = Math.ceil((radius || 0) / TILE) + 1;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (!floor(ctx + dx, cty + dy)) near = Math.min(near, sq(ctx + dx, cty + dy));
      return Math.max(0.01, (radius || 0) - near);
    }
    // the centre is out on the sky: the body's radius plus the way back to the nearest ground
    let back = Infinity;
    for (let R = 1; R <= 8 && back === Infinity; R++) {
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === R && floor(ctx + dx, cty + dy)) back = Math.min(back, sq(ctx + dx, cty + dy));
      }
    }
    return (radius || 0) + (back === Infinity ? TILE * 9 : back);
  },

  /** `_groundTileVisual` asks: is this void tile inside the Seam (draw it clear, so the sky shows)? */
  _olbVoidClear(tx, ty) {
    const r = OLB_ASTRAL_ROOM;
    const x0 = r.x / TILE, y0 = r.y / TILE;
    return tx >= x0 - 2 && ty >= y0 - 2 && tx < x0 + r.w + 2 && ty < y0 + r.h + 2 && this.textures.exists('astralVoidClear');
  },

  // -------------------------------------------------------------------------
  // 3.1 -- ROCKS AND STRANGE GRASS
  // -------------------------------------------------------------------------
  _olbDecorate() {
    if (this._olbDecorated) return;
    this._olbDecorated = true;
    const room = OLB_ASTRAL_ROOM, m = olbAstralMap();
    this._olbSkyTextures();
    // rocks: real obstacles, drawn by the ordinary rock renderer
    if (this.obstacles) {
      let i = 0;
      for (const r of m.rocks) {
        const w = room.at(r.x, r.y);
        this.obstacles.push({
          id: this.obstacles.length, x: w.x + ((i * 7) % 9 - 4), y: w.y + ((i * 5) % 9 - 4), radius: ROCK_RADIUS,
          frame: (i * 5 + (r.big ? 3 : 0)) % ROCK_COUNT, flip: i % 2 === 0, sprite: null, den: room.id, palette: null,
        });
        i++;
      }
      if (this._rebuildStaticGrid) this._rebuildStaticGrid();
    }
    // grass: tufts in colours no meadow has, swaying a little
    this._olbGrassTextures();
    this._olbGrass = [];
    let j = 0;
    for (const gp of m.grass) {
      const w = room.at(gp.x, gp.y);
      for (let k = 0; k < Math.min(3, Math.ceil(gp.n / 2)); k++) {
        const ox = ((j * 13 + k * 11) % 21) - 10, oy = ((j * 7 + k * 17) % 15) - 7;
        const p = isoProject(w.x + ox, w.y + oy);
        const img = this.add.image(p.x, p.y, `olbGrass${(j + k) % 4}`).setOrigin(0.5, 0.92)
          .setTint(OLB_GRASS_TINTS[gp.tint]).setDepth(isoDepth(w.x + ox, w.y + oy) - 2);
        img.setScale(0.8 + ((j + k) % 5) * 0.12);
        this.interiorSprites.push(this._tagRoom(img, room));
        this._olbGrass.push({ img, ph: (j * 0.37 + k) % 6.28 });
      }
      j++;
    }
  },

  _olbGrassTextures() {
    if (this.textures.exists('olbGrass0')) return;
    for (let v = 0; v < 4; v++) {
      const c = document.createElement('canvas'); c.width = 40; c.height = 30;
      const g = c.getContext('2d');
      let s = 17 + v * 31;
      const rnd = () => { s = (s * 48271) % 2147483647; return s / 2147483647; };
      const blades = 9 + v * 2;
      for (let i = 0; i < blades; i++) {
        const x = 8 + rnd() * 24, h = 10 + rnd() * 18, lean = (rnd() - 0.5) * 10;
        const gr = g.createLinearGradient(0, 30, 0, 30 - h);
        gr.addColorStop(0, 'rgba(120,120,130,1)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - 1.6, 30); g.quadraticCurveTo(x + lean * 0.3, 30 - h * 0.6, x + lean, 30 - h); g.lineTo(x + 1.6, 30); g.closePath(); g.fill();
        if (v === 3 && i % 4 === 0) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + lean, 30 - h, 1.8, 0, Math.PI * 2); g.fill(); }
      }
      this.textures.addCanvas(`olbGrass${v}`, c);
    }
  },

  // -------------------------------------------------------------------------
  // 4 -- THE PORTAL ANIMATION (fx3 `portal`), looped for as long as a door stands
  // -------------------------------------------------------------------------
  _olbPortalSprite(wx, wy, color, scale = 1.25, room = null) {
    const key = `fx_portal_${color}`;
    if (!this.textures.exists(key)) return null;
    const info = fxFamilyInfo('portal');
    const p = isoProject(wx, wy);
    const spr = this.add.sprite(p.x, p.y + 6, key, 0).setOrigin(0.5, 0.94).setScale(scale).setDepth(isoDepth(wx, wy) + 4);
    if (room) { this.interiorSprites.push(this._tagRoom(spr, room)); }
    const rec = { spr, t: Math.random() * 1000, frames: info ? info.frames : 20, ms: info ? info.frameMs : 83 };
    (this._olbPortals = this._olbPortals || []).push(rec);
    return rec;
  },

  _olbTickPortals(dt) {
    const list = this._olbPortals;
    if (!list || !list.length) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i];
      if (!r.spr || !r.spr.active) { list.splice(i, 1); continue; }
      r.t += dt * 1000;
      r.spr.setFrame(Math.floor(r.t / r.ms) % r.frames);
    }
  },

  // -------------------------------------------------------------------------
  // 5 -- ONE BURST OF AN FX SHEET, played once at a world point
  // -------------------------------------------------------------------------
  _olbFxBurst(family, color, wx, wy, scale = 1, opts = {}) {
    const info = fxFamilyInfo(family);
    let col = color;
    if (info && info.colors && !info.colors.includes(col)) col = info.native;
    const key = `fx_${family}_${col}`;
    if (!info || !this.textures.exists(key)) return null;
    const p = isoProject(wx, wy);
    const spr = this.add.sprite(p.x + (opts.dx || 0), p.y + (opts.dy || 0), key, 0).setScale(scale);
    if (info.anchor === 'ground') spr.setOrigin(0.5, 0.94);
    spr.setDepth(opts.depth != null ? opts.depth : isoDepth(wx, wy) + 90000);
    if (opts.add) spr.setBlendMode(Phaser.BlendModes.ADD);
    if (opts.rot) spr.setRotation(opts.rot);
    const frames = info.frames || 20, ms = (info.frameMs || 50) * (opts.slow || 1);
    this.tweens.addCounter({
      from: 0, to: frames - 1, duration: frames * ms, delay: opts.delay || 0,
      onUpdate: (tw) => { if (spr.active) spr.setFrame(Math.min(frames - 1, Math.floor(tw.getValue()))); },
      onComplete: () => { if (spr.active) spr.destroy(); },
    });
    if (opts.delay) spr.setVisible(false);
    if (opts.delay) this.time.delayedCall(opts.delay, () => { if (spr.active) spr.setVisible(true); });
    return spr;
  },

  /** 5 -- the explosion sheets over the drawn blast after Olb's sacrifice. */
  _olbExplosions(cx, cy) {
    const cols = ['orange', 'bloodred', 'gold', 'yellow', 'orange', 'white'];
    let n = 0;
    for (let i = 0; i < 16; i++) {
      const a = i * 2.399, r = i === 0 ? 0 : 30 + (i * 37) % 170;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const fam = i % 3 === 0 ? 'blastlg' : (i % 3 === 1 ? 'blastsm' : 'blastlg');
      if (this._olbFxBurst(fam, cols[i % cols.length], x, y, 2.2 + (i % 4) * 0.7, { delay: i * 85, add: i % 2 === 0, dy: -30 })) n++;
    }
    for (let i = 0; i < 4; i++) this._olbFxBurst('hitflash', i % 2 ? 'white' : 'orange', cx, cy, 3.5 + i, { delay: 300 + i * 260, add: true, dy: -40 });
    return n;
  },

  // -------------------------------------------------------------------------
  // 3.2 -- THE PACKS OF THE COVENANT
  // -------------------------------------------------------------------------
  /** Called from `_olbBuildCamp`: the three packs join the camp, asleep until they have spoken. */
  _olbBuildPacks(camp, make) {
    const m = olbAstralMap();
    m.marks.packs.forEach((pk, i) => {
      const spec = OLB_PACKS[i];
      if (!spec) return;
      const lead = make(pk.leader, spec.speaker, spec.leaderTier, true, i * 3);
      lead.pack = i + 1; lead.packLeader = true; lead.leader = false;
      pk.members.forEach((c, k) => {
        const p = make(c, spec.members[k] || 'Ash-sworn', spec.tier, false, i * 3 + k + 1);
        p.pack = i + 1;
      });
    });
    for (const c of camp.people) if (!c.pack) c.hall = true;
  },

  _olbPackPeople(n) {
    const camp = this._olbCamp();
    return camp ? camp.people.filter(c => c.pack === n) : [];
  },

  _olbCamp() { return (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID) || null; },

  _olbWakePack(n) {
    for (const c of this._olbPackPeople(n)) { c.packAwake = true; c.hostile = true; }
  },

  /** Every quarter second in the Seam. */
  _olbStepPacks(h) {
    const camp = this._olbCamp();
    if (!camp) return;
    h.packs = h.packs || {};
    for (let n = 1; n <= OLB_PACKS.length; n++) {
      const people = this._olbPackPeople(n);
      if (!people.length) continue;
      const st = h.packs[n] || (h.packs[n] = { said: false, down: false, after: false });
      const alive = people.filter(c => c.alive);
      if (!alive.length) {
        if (!st.down) { st.down = true; }
        if (!st.after && !this._dialogueOpen && !this._olbScene && !this._olbMonsterNear(TILE * 8)) {
          st.after = true;
          this._olbPlayScene(OLB_PACKS[n - 1].after, null, 'The Seam', 'Go on');
        }
        continue;
      }
      // struck first: no speech, they fight
      if (!st.said && alive.some(c => c.hostile)) { st.said = true; this._olbWakePack(n); this._olbBark(`Here they come!`); continue; }
      if (st.said) { if (!alive[0].packAwake) this._olbWakePack(n); continue; }
      const lead = people.find(c => c.packLeader) || alive[0];
      const d = Math.hypot(lead.x - this.world.x, lead.y - this.world.y);
      if (d < TILE * 9 && !this._dialogueOpen && !this._olbScene && !this._olbMonsterNear(TILE * 7)) {
        st.said = true;
        // they turn to face you while they talk
        for (const c of alive) this._npcWalkFrame && this._npcWalkFrame(c, c.artKey, facingFromMove(this.world.x - c.x, this.world.y - c.y) || 'south', false, 0);
        this._olbPlayScene(OLB_PACKS[n - 1].pages, () => this._olbWakePack(n), 'The Seam', 'Fight');
      }
    }
  },

  /** Every pack is down. */
  _olbPacksDone(h) {
    const camp = this._olbCamp();
    if (!camp) return true;
    return camp.people.filter(c => c.pack).every(c => !c.alive);
  },

  // -------------------------------------------------------------------------
  // 7 -- TALKING ON THE WAY
  // -------------------------------------------------------------------------
  /** ROUND 403 -- the confluence the player's three essences form (or a god's divine essence, which outranks it). */
  _olbConfluenceName(ids) {
    try {
      const p = this.player;
      if (p && p.divineGod) return null;
      const defs = (ids || []).slice(0, 3).map(id => ESSENCES[id]);
      if (defs.length < 3 || defs.some(d => !d)) return null;
      const c = confluenceDefFor(defs);
      return c ? c.name : null;
    } catch (e) { return null; }
  },

  _olbFillTalk(text) {
    const ids = (this.player && this.player.slotEssence) || [];
    return String(text)
      .replace('{insight1}', olbEssenceInsight(ids, 0, ESSENCE_CATALOG))
      .replace('{insight2}', olbEssenceInsight(ids, 1, ESSENCE_CATALOG))
      .replace('{insight3}', olbEssenceInsight(ids, 2, ESSENCE_CATALOG))
      .replace('{confluence}', olbConfluenceLine(ids, ESSENCE_CATALOG, this._olbConfluenceName ? this._olbConfluenceName(ids) : null));
  },

  /** Play one of the talks, once. True if it began. */
  _olbTalk(h, key) {
    h.said = h.said || {};
    if (h.said[`talk_${key}`] || !OLB_TALKS[key]) return false;
    if (this._dialogueOpen || this._olbScene || this._olbMonsterNear(TILE * 9)) return false;
    h.said[`talk_${key}`] = true;
    this._olbPlayScene(OLB_TALKS[key].map(p => ({ who: p.who, text: this._olbFillTalk(p.text) })), null, 'Olb Nikobe', 'Walk on');
    return true;
  },

  /** On the road to the nest and back: two talks, as the walking gives room for them. */
  _olbRoadTalkTick(h, dt) {
    if (!h || this._insideRoom) return;
    if (h.step !== 'nest' && h.step !== 'aperture') return;
    const moved = this._olbLastPos ? Math.hypot(this.world.x - this._olbLastPos.x, this.world.y - this._olbLastPos.y) : 0;
    this._olbLastPos = { x: this.world.x, y: this.world.y };
    if (moved > 1) h.walkT = (h.walkT || 0) + dt;
    if ((h.walkT || 0) > 22) this._olbTalk(h, 'road1');
    if ((h.walkT || 0) > 70) this._olbTalk(h, 'road2');
  },

  // -------------------------------------------------------------------------
  // 7.1 -- OLB'S SHIELD
  // -------------------------------------------------------------------------
  _olbShieldTick(dt) {
    const h = this._olbHunt && this._olbHunt();
    const s = this._olbShield;
    if (s) {
      s.t -= dt;
      if (!s.final && (s.t <= 0 || s.hp <= 0)) {
        this._olbShield = null;
        if (s.hp <= 0 && this._floatText) this._floatText(this.world.x, this.world.y - 50, 'The shield breaks', '#fff59d');
      }
    }
    this._olbShieldDraw(dt);
    if (!h || !this._olbBody || this._olbCut) return;
    if (!['nest', 'aperture', 'astral', 'fight'].includes(h.step)) return;
    h.shieldUses = h.shieldUses || 0;
    h.shieldCool = Math.max(0, (h.shieldCool || 0) - dt);
    const p = this.player;
    if (!this._olbShield && h.shieldUses < OLB_SHIELD.uses && h.shieldCool <= 0 && p && p.hp > 0
        && p.hp < p.maxHp * OLB_SHIELD.hpBelow && this._fightRecent && this._fightRecent(3)) {
      this._olbShieldCast(false);
      this._olbBark(OLB_SHIELD_BARKS[Math.min(h.shieldUses, OLB_SHIELD_BARKS.length - 1)]);
      h.shieldUses++;
      h.shieldCool = OLB_SHIELD.coolS;
      // the second time she has done it, she explains it when the fight is over
      if (h.shieldUses >= 1) h.shieldExplain = true;
    }
    if (h.shieldExplain && h.step === 'astral' && !this._fightRecent(5)) {
      if (this._olbTalk(h, 'astral2')) h.shieldExplain = false;
    }
  },

  _olbShieldCast(final) {
    const p = this.player;
    this._olbShield = {
      hp: Math.round((p.maxHp || 100) * (final ? OLB_SHIELD.final : OLB_SHIELD.absorbFrac)),
      max: Math.round((p.maxHp || 100) * (final ? OLB_SHIELD.final : OLB_SHIELD.absorbFrac)),
      t: final ? 999 : OLB_SHIELD.lastS, final: !!final, born: this.time.now, flare: 1,
    };
    const b = this._olbBody;
    if (b) this._olbFxBurst('healpillar', 'gold', this.world.x, this.world.y, 1.4, { add: true });
  },

  /** `_monsterHitPlayerCore` asks first: the shield takes what it can. */
  _olbShieldAbsorb(dmg) {
    const s = this._olbShield;
    if (!s || !(dmg > 0)) return dmg;
    const took = Math.min(s.hp, dmg);
    s.hp -= took; s.flare = 1;
    if (took > 0 && this._floatText) this._floatText(this.world.x + 18, this.world.y - 36, `(${Math.round(took)})`, '#fff59d');
    return dmg - took;
  },

  _olbShieldDraw(dt) {
    const s = this._olbShield;
    if (!s) { if (this._olbShieldG) this._olbShieldG.setVisible(false); return; }
    if (!this._olbShieldG) this._olbShieldG = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const g = this._olbShieldG;
    g.setVisible(true); g.clear();
    s.flare = Math.max(0, (s.flare || 0) - dt * 2.5);
    const f = isoProject(this.world.x, this.world.y);
    g.setDepth(isoDepth(this.world.x, this.world.y) + 8);
    const t = this.time.now / 1000;
    const k = s.final ? 1 : Math.max(0.25, s.hp / s.max);
    const R = s.final ? 46 : 34;
    g.fillStyle(0xfff3c4, (0.08 + 0.1 * s.flare) * (0.5 + k));
    g.fillEllipse(f.x, f.y - 30, R * 2, R * 2.3);
    g.lineStyle(2 + s.flare * 2, 0xffe082, (0.45 + 0.4 * s.flare) * (0.5 + k * 0.5));
    g.strokeEllipse(f.x, f.y - 30, R * 2, R * 2.3);
    // the hexes of a Silver's ward, turning
    g.lineStyle(1, 0xfff8e1, 0.35 * (0.5 + k));
    for (let i = 0; i < 6; i++) {
      const a = t * 0.8 + i * Math.PI / 3;
      g.lineBetween(f.x + Math.cos(a) * R * 0.95, f.y - 30 + Math.sin(a) * R * 1.1, f.x + Math.cos(a + Math.PI / 3) * R * 0.95, f.y - 30 + Math.sin(a + Math.PI / 3) * R * 1.1);
    }
  },

  // -------------------------------------------------------------------------
  // 3.3 -- THE HALL IN VIEW: the camera stops following and frames the stacks, the circle and the god together
  // -------------------------------------------------------------------------
  _olbFrameHall(on, focus) {
    const cam = this.cameras.main;
    if (!on) {
      if (this._olbFramed) { this._olbFramed = false; this._restoreRoomView(OLB_ASTRAL_ROOM); }
      return;
    }
    const room = OLB_ASTRAL_ROOM, m = olbAstralMap();
    const a = focus || room.at(m.marks.godSpot.x, m.marks.godSpot.y);
    const pa = isoProject(this.world.x, this.world.y), pb = isoProject(a.x, a.y);
    if (!this._olbFramed) { this._olbFramed = true; this._olbFrameZoom = cam.zoom; }
    cam.stopFollow();
    cam.setZoom((this._olbFrameZoom || cam.zoom) * 0.66);
    // weighted toward the god, and nudged down-left, so the HUD in the top-left corner does not sit over the frame
    cam.centerOn(pa.x * 0.42 + pb.x * 0.58 - 120, pa.y * 0.42 + pb.y * 0.58 - 50);
    this._updateGroundViewport(true);
    this._updateForestViewport(true);
    this._updateRockViewport(true);
    if (this._updateStaticViewport) this._updateStaticViewport(true);
  },

  /** The god, standing at the frame from the start: in view through the whole meeting (3.3). */
  _olbPlaceGod(camp) {
    const room = OLB_ASTRAL_ROOM, m = olbAstralMap();
    const art = CHAR_ART[GOD_ART];
    const tex = `char_${GOD_ART}_idle`;
    if (!art || !this.textures.exists(tex)) return null;
    const at = room.at(m.marks.godSpot.x, m.marks.godSpot.y);
    const p = isoProject(at.x, at.y);
    const s = this.add.sprite(p.x, p.y, tex, dirRow('east'));
    s.setOrigin(art.footX / art.cell, art.anims.idle.foot / art.cell);
    s.setScale(1.6);
    s.setDepth(isoDepth(at.x, at.y) + 3);
    this.interiorSprites.push(this._tagRoom(s, room));
    camp.god = { sprite: s, x: at.x, y: at.y };
    return camp.god;
  },

  // -------------------------------------------------------------------------
  // 3.4 -- WHILE YOU STAND PETRIFIED, THE GOD GOES FOR OLB
  // -------------------------------------------------------------------------
  _olbGodAttackTick(c, dt, k) {
    const b = this._olbBody;
    const god = c.god;
    if (!b || !god) return;
    c.atk = c.atk || { n: 0, cd: 1.2, step: 0 };
    const dx = b.x - c.gx, dy = b.y - c.gy, d = Math.hypot(dx, dy) || 1;
    const dir = facingFromMove(dx, dy) || 'east';
    const walkTex = `char_${GOD_ART}_walk`, idleTex = `char_${GOD_ART}_idle`;
    const art = CHAR_ART[GOD_ART];
    if (d > TILE * 1.3) {
      const step = Math.min(d - TILE * 1.3, 70 * dt);
      c.gx += (dx / d) * step; c.gy += (dy / d) * step;
      c.atk.step += dt;
      if (this.textures.exists(walkTex)) {
        if (god.texture.key !== walkTex) { god.setTexture(walkTex); if (art) god.setOrigin(art.footX / art.cell, art.anims.walk.foot / art.cell); }
        god.setFrame(dirRow(dir) * 8 + (Math.floor(c.atk.step / 0.09) % 8));
      }
    } else {
      if (god.texture.key !== idleTex && this.textures.exists(idleTex)) { god.setTexture(idleTex); if (art) god.setOrigin(art.footX / art.cell, art.anims.idle.foot / art.cell); }
      god.setFrame(dirRow(dir));
      c.atk.cd -= dt;
      if (c.atk.cd <= 0) {
        c.atk.cd = 0.85 + (c.atk.n % 3) * 0.2;
        c.atk.n++;
        // the blow: a lunge, a flash at Olb, her own ward flaring and cracking, the floor jumping
        c.atk.lunge = 1;
        this._olbFxBurst('hitflash', c.atk.n % 2 ? 'bloodred' : 'black', b.x, b.y, 1.8, { add: c.atk.n % 2 === 1, dy: -34 });
        if (c.atk.n % 3 === 0) this._olbFxBurst('blastsm', 'bloodred', b.x, b.y, 1.6, { dy: -30 });
        c.olbWard = Math.max(0, (c.olbWard == null ? 1 : c.olbWard) - 0.12);
        if (b.sprite) { b.sprite.setTint(0xff6e6e); this.time.delayedCall(140, () => { if (b.sprite && b.sprite.active) b.sprite.clearTint(); }); }
        b.knock = 6;
        this.cameras.main.shake(180, 0.004);
        if (c.atk.n === 2) this._sayOverhead(b, OLB_SLAM_BARKS.hit1, '#ffe082', 2.6);
        if (c.atk.n === 6) this._sayOverhead(b, OLB_SLAM_BARKS.hit2, '#ffe082', 2.6);
        if (c.atk.n === 10) this._sayOverhead(b, OLB_SLAM_BARKS.hit3, '#ffe082', 2.6);
      }
    }
    c.atk.lunge = Math.max(0, (c.atk.lunge || 0) - dt * 5);
    const lx = (dx / d) * 10 * c.atk.lunge, ly = (dy / d) * 10 * c.atk.lunge;
    const gp = isoProject(c.gx + lx, c.gy + ly);
    god.setPosition(gp.x, gp.y);
    god.setDepth(isoDepth(c.gx, c.gy) + 3);
    // Olb, rocked back by each blow, her ward drawn round her
    b.knock = Math.max(0, (b.knock || 0) - dt * 30);
    const bp = isoProject(b.x + (dx / d) * b.knock, b.y + (dy / d) * b.knock);
    if (b.sprite) b.sprite.setPosition(bp.x, bp.y);
    const ward = c.olbWard == null ? 1 : c.olbWard;
    if (c.fx && ward > 0) {
      c.fx.lineStyle(2, 0xffe082, 0.25 + 0.5 * ward);
      c.fx.strokeEllipse(bp.x, bp.y - 32, 64, 76);
      if (ward < 0.6) {   // the cracks
        c.fx.lineStyle(1.5, 0xfff8e1, 0.8 * (1 - ward));
        for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; c.fx.lineBetween(bp.x + Math.cos(a) * 32, bp.y - 32 + Math.sin(a) * 38, bp.x + Math.cos(a) * 14, bp.y - 32 + Math.sin(a) * 16); }
      }
    }
    c.gxDrawn = c.gx; c.gyDrawn = c.gy;
  },

  // -------------------------------------------------------------------------
  // 3.6 -- SPEECH THAT HOLDS STILL WHILE THE WORLD SHAKES
  // -------------------------------------------------------------------------
  /** How far the camera's shake has thrown the world this frame (world units). */
  _shakeOffset() {
    const cam = this.cameras && this.cameras.main;
    const s = cam && cam.shakeEffect;
    if (!s || !s.isRunning) return { x: 0, y: 0 };
    return { x: s._offsetX || 0, y: s._offsetY || 0 };
  },

  // -------------------------------------------------------------------------
  // 6 -- WAKING IN THE INFIRMARY
  // -------------------------------------------------------------------------
  /** From the hall the player has been carried into, through to its infirmary, onto the bed beside the priest. */
  _olbWakeInInfirmary() {
    const hall = this._insideRoom;
    if (!hall) return false;
    const doors = hall.inners || (hall.inner ? [hall.inner] : []);
    const dr = doors.find(d => /^guild_infirmary/.test(d.toRoom));
    if (!dr) return false;
    const room = interiorRoomById(dr.toRoom);
    if (!room) return false;
    const c = roomTileCentre(hall, dr.tx, dr.ty);
    this._useInnerDoor({ from: hall, to: room, ...dr, x: c.x, y: c.y });
    if (!room || !/^guild_infirmary/.test(room.id)) return false;
    const bed = roomTileCentre(room, INFIRMARY_WAKE_BED.tx, INFIRMARY_WAKE_BED.ty);
    // ROUND 388 -- "Stuck in the bed on wakeup after Olb's sacrifice." The bed is a solid prop (bedIron, 1.8 tiles: a
    // 28.8 collider) and the player was put 0.9 of a tile (28.8) from its centre with a body of 12, so they woke inside
    // it and every step was refused. Now: beside the bed, clear of it -- in the aisle at its foot first, then either
    // side -- on whichever spot is actually free; and `_restoreRoomView` nudges out of anything still in the way.
    let at = null;
    for (const [dx, dy] of INFIRMARY_WAKE_STEPS) {
      const x = bed.x + dx * TILE, y = bed.y + dy * TILE;
      if (!this._collidesObstacle || !this._collidesObstacle(x, y, WAKE_BODY)) { at = { x, y }; break; }
    }
    if (!at) at = { x: bed.x + INFIRMARY_WAKE_STEPS[0][0] * TILE, y: bed.y + INFIRMARY_WAKE_STEPS[0][1] * TILE };
    this.world.x = at.x; this.world.y = at.y;
    this.player.facing = 'south';
    this._restoreRoomView(room);
    return true;
  },

  /** The wake scene: the narrator, then the Healer's priest. */
  _infirmaryWakeScene(scar) {
    const scarText = scar ? `A new scar: ${scarLine(scar)}.` : '';
    const pages = INFIRMARY_WAKE_PAGES.map(p => ({ who: p.who, text: p.text.replace('{scar}', scarText || 'There. You see it.') }));
    this._olbPlayScene(pages, null, 'The infirmary', 'Get up');
  },

  /** Talking to the priest afterwards. */
  _infirmaryTalk(npc) {
    const p = this.player;
    const woke = !!(p && p.olb && p.olb.dead);
    if (!woke) { this._openDialogue(INFIRMARY_PRIEST_TITLE, INFIRMARY_PRIEST_DEFAULT, npc); return; }
    this._infirmaryTalkN = ((this._infirmaryTalkN || 0) + 1) % INFIRMARY_PRIEST_IDLE.length;
    const n = Array.isArray(p.soulScars) ? p.soulScars.length : 0;
    const soul = `${Math.round(this._soulNow ? this._soulNow() : 0)} of ${Math.round(this._soulMax ? this._soulMax() : 100)}`;
    const scars = n ? `You carry ${n} soul scar${n === 1 ? '' : 's'}; each one made your soul a little larger, and your aura reaches further for it.` : '';   // ROUND 407 -- +15% aura a scar
    const line = INFIRMARY_PRIEST_IDLE[this._infirmaryTalkN].replace('{soul}', soul).replace('{scars}', scars);
    this._openDialogue(INFIRMARY_PRIEST_TITLE, line, npc);
  },
};

