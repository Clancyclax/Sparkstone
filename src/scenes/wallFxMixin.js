// ============================================================================
// ROUND 321 -- STANDING WALLS LOOK LIKE WHAT THEY ARE.
//
//   "Abilities like Strand Line don't have an effective animation, just
//    flashing rings. Use some elemental icons or something more fitting to what's
//    described. Resolve this and similar wall abilities."
//
// A `barrierWall` ability (a wall nothing crosses, a line that burns, a point
// that drags everything inward) used to draw a ring on its own spot every half
// second and nothing else. The ring is a good way to say "something happened
// here" and a poor way to say "there is a wall here for six seconds".
//
// This is the wall: a row of upright, animated pieces of the ability's own
// element along the exact segment the damage test uses (so the shape tested is
// the shape seen), and for the drag kind a spinning vortex whose edge is the
// reach of the pull. Everything is drawn here, procedurally, per element --
// there is no sheet to ship and nothing to preload; a texture is made the first
// time an element needs it.
//
//   _wallFxBuild(w)      called when a barrier is laid; attaches w.fx
//   _wallFxTick(w, dt)   animates it; frees it when the barrier is gone
//   _wallFxFree(w)       destroys it (also called on expiry)
// ============================================================================
import { isoProject, isoDepth } from '../data/iso.js';
import { FX_ELEMENT_COLORS, nearestFxElement, fxFamilyInfo } from '../data/spellFx.js';

const CELL_W = 40, CELL_H = 64;
const FRAMES = 6;
const VORTEX_FRAMES = 8;
const VORTEX_W = 160, VORTEX_H = 80;
const FRAME_RATE = 9;            // animation frames a second
const PIECE_SPACING = 22;        // world units between upright pieces

// [shadow, body, light, core]
const PALETTES = {
  fire:         ['#7a1a0a', '#e2531a', '#ffa43a', '#fff0a0'],
  frost:        ['#3c6f8c', '#7fd0e6', '#cdf5ff', '#ffffff'],
  lightning:    ['#2a3f8a', '#6f8bff', '#fefa9d', '#ffffff'],
  nature:       ['#274d1f', '#4f9a35', '#97f963', '#e6ffb8'],
  shadow:       ['#1c0f26', '#5a2a6e', '#9e4e8c', '#d9a8f0'],
  radiant:      ['#b88a2a', '#ffd66b', '#ffe79d', '#ffffff'],
  transcendent: ['#6f9ccf', '#a9d3ff', '#cfe9ff', '#ffffff'],
  physical:     ['#4a4036', '#7d6f5f', '#a89a86', '#d6cbb8'],
};
const FALLBACK_ELEMENT = 'physical';

/** Which of the palettes an ability's wall is drawn in. */
export function wallElementFor(element, color) {
  if (element && PALETTES[element]) return element;
  if (element === 'earth' || element === 'stone') return 'physical';
  if (element === 'ice') return 'frost';
  if (element === 'storm' || element === 'wind') return 'lightning';
  if (element === 'poison' || element === 'vine') return 'nature';
  if (element === 'holy' || element === 'light') return 'radiant';
  if (color) {
    const hex = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    const near = nearestFxElement(hex);
    if (near && PALETTES[near]) return near;
  }
  return FALLBACK_ELEMENT;
}

// ROUND 388 -- "replace the barrier walls": each wall element is played from a loaded fx sheet, looping, one sprite
// per piece along the same segment (and the fx3 `vortex` for the drag kind). `h` is the height in screen px the piece
// stands (the drawn pieces stood ~70), `oy` where its feet are in the cell. The procedural pieces below are kept only
// for when the sheet is not loaded.
export const WALL_ART = {
  fire:         { family: 'firewall',    color: 'orange', h: 72, oy: 0.97 },
  frost:        { family: 'icestorm',    color: 'blue',   h: 70, oy: 0.97 },
  lightning:    { family: 'skystrike',   color: 'yellow', h: 78, oy: 0.97, add: true },
  wind:         { family: 'tornado',     color: 'silver', h: 80, oy: 0.95 },
  nature:       { family: 'thornshield', color: 'green',  h: 50, oy: 0.95 },
  shadow:       { family: 'portal',      color: 'black',  h: 74, oy: 0.96 },
  radiant:      { family: 'healpillar',  color: 'gold',   h: 72, oy: 0.97, add: true },
  transcendent: { family: 'healpillar',  color: 'white',  h: 72, oy: 0.97, add: true },
  physical:     { family: 'firewall',    color: 'brown',  h: 66, oy: 0.97 },   // a column of grit and dust
};
const VORTEX_ART = { family: 'vortex', visW: 122, visH: 46 };   // the swirl's drawn extent in its 220x140 cell
/** ROUND 388 -- which WALL_ART entry a barrier plays: its palette element, except that a storm or wind wall (drawn in
 *  the lightning palette) is a row of whirlwinds. */
export function wallArtFor(el, drawEl) {
  if (drawEl === 'wind' || drawEl === 'storm' || drawEl === 'air') return WALL_ART.wind;
  return WALL_ART[el] || WALL_ART[FALLBACK_ELEMENT];
}

function rngFor(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function seedOf(str, n) {
  let h = n * 97 + 13;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  return h;
}

// ---- the per-element drawers: (g, frame, pal, rnd) on a CELL_W x CELL_H canvas
const px = (g, c, x, y, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

const DRAW = {
  // Three flame tongues that lean and lick.
  fire(g, f, pal, rnd) {
    for (const [cx, base] of [[9, 40], [20, 50], [31, 42]]) {
      const H = base + Math.floor(rnd() * 8);
      for (let y = 0; y < H; y++) {
        const t = y / H;
        const half = Math.pow(1 - t, 0.75) * 7.5;
        const sway = Math.sin(f * 1.05 + cx * 0.4 + y * 0.16) * 3.2 * t;
        for (let x = -Math.floor(half); x <= Math.floor(half); x++) {
          const edge = Math.abs(x) / (half || 1);
          let c = pal[1];
          if (edge > 0.72 || t > 0.85) c = pal[0];
          else if (edge < 0.45 && t < 0.62) c = pal[2];
          if (edge < 0.22 && t < 0.38) c = pal[3];
          px(g, c, cx + x + sway, CELL_H - 2 - y);
        }
      }
    }
  },
  // A hedge of ice shards; a few sparkle each frame.
  frost(g, f, pal, rnd, seed) {
    const shape = rngFor(seed);
    for (const cx of [6, 13, 20, 27, 34]) {
      const H = 20 + Math.floor(shape() * 32), half = 4 + Math.floor(shape() * 3);
      for (let y = 0; y < H; y++) {
        const w = Math.max(0, Math.round(half * (1 - y / H)));
        for (let x = -w; x <= w; x++) {
          let c = x < 0 ? pal[2] : pal[1];
          if (x === 0 && y > 2) c = pal[3];
          if (Math.abs(x) === w && w > 1) c = pal[0];
          px(g, c, cx + x, CELL_H - 2 - y);
        }
      }
    }
    for (let i = 0; i < 5; i++) px(g, pal[3], 3 + rnd() * 34, 8 + rnd() * 50, 1, 1);
  },
  // A crooked bolt from top to bottom that is a different bolt every frame.
  lightning(g, f, pal, rnd) {
    const bolt = (x0, y0, y1, dx, core) => {
      let x = x0;
      for (let y = y0; y < y1; y += 3) {
        const nx = Math.max(3, Math.min(CELL_W - 4, x + (rnd() - 0.5) * dx));
        const steps = Math.max(1, Math.abs(Math.round(nx - x)));
        for (let s = 0; s <= Math.max(3, steps); s++) {
          const xx = x + (nx - x) * (s / Math.max(3, steps));
          const yy = y + (s / Math.max(3, steps)) * 3;
          px(g, pal[0], xx - 1, yy, 3, 1);
          px(g, core ? pal[3] : pal[2], xx, yy, 1, 1);
        }
        x = nx;
      }
      return x;
    };
    const mid = bolt(20, 0, CELL_H - 2, 12, true);
    if (rnd() < 0.9) bolt(mid, 30, 56, 14, false);
    if (rnd() < 0.7) bolt(14, 14, 40, 12, false);
    // the glow on the ground it strikes
    for (let x = 6; x < 34; x++) px(g, pal[1], x, CELL_H - 3 + (rnd() < 0.3 ? -1 : 0), 1, 2);
    for (let i = 0; i < 6; i++) px(g, pal[3], 4 + rnd() * 32, 6 + rnd() * 52, 1, 1);
  },
  // Thorned vines that sway.
  nature(g, f, pal, rnd, seed) {
    const shape = rngFor(seed);
    for (const cx of [8, 17, 25, 33]) {
      const H = 34 + Math.floor(shape() * 22);
      for (let y = 0; y < H; y++) {
        const sway = Math.sin(f * 0.9 + cx + y * 0.19) * 2.4 * (y / H);
        const x = cx + sway;
        px(g, pal[0], x - 1, CELL_H - 2 - y, 3, 1);
        px(g, pal[1], x, CELL_H - 2 - y, 1, 1);
        if (y % 9 === 4) {   // a thorn, then a leaf
          const dir = (y / 9) % 2 < 1 ? 1 : -1;
          px(g, pal[3], x + dir * 2, CELL_H - 3 - y, 2, 1);
          px(g, pal[2], x + dir * 3, CELL_H - 4 - y, 2, 2);
        }
      }
      px(g, pal[2], cx + Math.sin(f * 0.9 + cx + H * 0.19) * 2.4, CELL_H - 3 - H, 3, 3);
    }
  },
  // Rising smoke with a few bright wisps.
  shadow(g, f, pal, rnd, seed) {
    const shape = rngFor(seed);
    for (let i = 0; i < 9; i++) {
      const cx = 5 + shape() * 30;
      const life = ((f * 9 + i * 17) % 60) / 60;
      const y = CELL_H - 4 - life * 56;
      const r = 3 + life * 6;
      g.globalAlpha = 0.75 * (1 - life * 0.8);
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
        if (xx * xx + yy * yy > r * r) continue;
        px(g, (xx + yy) % 3 === 0 ? pal[1] : pal[0], cx + xx + Math.sin(life * 6 + i) * 2, y + yy);
      }
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 4; i++) px(g, pal[3], 6 + rnd() * 28, 10 + rnd() * 48, 1, 2);
  },
  // A pillar of light with motes climbing it.
  radiant(g, f, pal, rnd, seed) {
    for (let x = -8; x <= 8; x++) {
      const a = Math.max(0, 1 - Math.abs(x) / 8);
      g.globalAlpha = 0.25 + 0.6 * a;
      px(g, Math.abs(x) < 2 ? pal[3] : Math.abs(x) < 5 ? pal[2] : pal[1], 20 + x, 2, 1, CELL_H - 4);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const y = CELL_H - 4 - (((f * 8 + i * 13) % 58));
      px(g, pal[3], 12 + ((i * 7) % 17), y, 1, 2);
    }
    for (let x = 6; x < 34; x++) px(g, pal[2], x, CELL_H - 3, 1, 1);
  },
  // A rough palisade of rock that kicks up dust.
  physical(g, f, pal, rnd, seed) {
    const shape = rngFor(seed);
    for (const [cx, w] of [[6, 6], [14, 7], [23, 7], [31, 6]]) {
      const H = 26 + Math.floor(shape() * 22);
      for (let y = 0; y < H; y++) {
        const half = Math.round(w * (0.6 + 0.4 * (1 - y / H)));
        for (let x = -half; x <= half; x++) {
          let c = x < -half / 3 ? pal[2] : x > half / 3 ? pal[0] : pal[1];
          if (y > H - 3) c = pal[3];
          if ((x + y * 3) % 7 === 0) c = pal[0];
          px(g, c, cx + x, CELL_H - 2 - y);
        }
      }
    }
    for (let i = 0; i < 6; i++) px(g, pal[3], 4 + rnd() * 32, CELL_H - 6 - rnd() * 12, 1, 1);
  },
  // A shimmering curtain.
  transcendent(g, f, pal, rnd) {
    for (let x = 4; x < CELL_W - 4; x++) {
      const wave = Math.sin(f * 0.8 + x * 0.35);
      const top = 6 + Math.round(wave * 4), bot = CELL_H - 3;
      for (let y = top; y < bot; y++) {
        const k = (y - top) / (bot - top);
        g.globalAlpha = 0.18 + 0.55 * (1 - Math.abs(k - 0.5) * 1.4);
        px(g, (x + y + f) % 7 === 0 ? pal[3] : (x % 5 === 0 ? pal[2] : pal[1]), x, y);
      }
    }
    g.globalAlpha = 1;
  },
};

function drawVortex(g, f, pal) {
  const cx = VORTEX_W / 2, cy = VORTEX_H / 2;
  g.clearRect(0, 0, VORTEX_W, VORTEX_H);
  // the floor of it: a dim disc the whole reach wide
  g.globalAlpha = 0.28;
  for (let y = -cy; y < cy; y++) for (let x = -cx; x < cx; x++) {
    const d = (x * x) / (cx * cx) + (y * y) / (cy * cy);
    if (d <= 1) px(g, d > 0.8 ? pal[1] : pal[0], cx + x, cy + y);
  }
  // the rim: the reach of the pull
  g.globalAlpha = 0.85;
  for (let a = 0; a < 360; a += 2) {
    const r = a * Math.PI / 180;
    px(g, a % 20 < 10 ? pal[2] : pal[1], cx + Math.cos(r) * (cx - 3), cy + Math.sin(r) * (cy - 2), 3, 2);
  }
  // four spiral arms, turning one step each frame
  for (let arm = 0; arm < 4; arm++) {
    for (let i = 0; i < 60; i++) {
      const k = i / 60;
      const ang = arm * (Math.PI / 2) + k * 4.6 + f * (Math.PI * 2 / VORTEX_FRAMES / 2);
      const rr = (1 - k * 0.95);
      const x = cx + Math.cos(ang) * (cx - 8) * rr;
      const y = cy + Math.sin(ang) * (cy - 4) * rr;
      g.globalAlpha = 0.55 + 0.45 * k;
      px(g, k > 0.85 ? pal[3] : k > 0.5 ? pal[2] : pal[1], x, y, k > 0.6 ? 4 : 3, k > 0.6 ? 3 : 2);
    }
  }
  // the dark eye
  g.globalAlpha = 0.95;
  for (let y = -5; y <= 5; y++) for (let x = -11; x <= 11; x++) {
    if ((x * x) / 121 + (y * y) / 25 <= 1) px(g, pal[0], cx + x, cy + y);
  }
  g.globalAlpha = 1;
}

export const WallFxMixin = {
  /** The texture key for one frame of an element's upright wall piece. */
  _wallTexKey(el, f) {
    const key = `wallfx_${el}_${f}`;
    if (this.textures.exists(key)) return key;
    const cnv = document.createElement('canvas');
    cnv.width = CELL_W; cnv.height = CELL_H;
    const g = cnv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const pal = PALETTES[el] || PALETTES[FALLBACK_ELEMENT];
    const draw = DRAW[el] || DRAW[FALLBACK_ELEMENT];
    draw(g, f, pal, rngFor(seedOf(el, f)), seedOf(el, 0));
    this.textures.addCanvas(key, cnv);
    return key;
  },

  _wallVortexKey(el, f) {
    const key = `wallvortex_${el}_${f}`;
    if (this.textures.exists(key)) return key;
    const cnv = document.createElement('canvas');
    cnv.width = VORTEX_W; cnv.height = VORTEX_H;
    const g = cnv.getContext('2d');
    g.imageSmoothingEnabled = false;
    drawVortex(g, f, PALETTES[el] || PALETTES[FALLBACK_ELEMENT]);
    this.textures.addCanvas(key, cnv);
    return key;
  },

  /** ROUND 388 -- the loaded sheet a barrier plays, or null (draw the procedural pieces). */
  _wallSheet(el, drawEl) {
    const art = wallArtFor(el, drawEl);
    const info = fxFamilyInfo(art.family);
    if (!info || !this.textures) return null;
    let key = `fx_${art.family}_${art.color}`;
    if (!this.textures.exists(key)) key = `fx_${art.family}_${info.native}`;
    if (!this.textures.exists(key)) return null;
    const cellH = info.cellH || info.cell;
    return { ...art, key, frames: info.frames || 1, ms: info.frameMs || 60, scale: art.h / (cellH * 0.92) };
  },

  /** ROUND 388 -- one standing piece of a sheet wall (a sprite, its frame stepped by _wallFxTick). */
  _wallSheetPiece(sh, wx, wy, scale, phase) {
    const p = isoProject(wx, wy);
    const img = this.add.sprite(p.x, p.y + 2, sh.key, 0).setOrigin(0.5, sh.oy).setScale(scale);
    if (sh.add) img.setBlendMode('ADD');
    img.setDepth(isoDepth(wx, wy) + 3);
    return { img, phase, f: -1, wx, wy, scale, sheet: sh };
  },

  /** Lay the visual for a barrier. `w` is the record _tickBarriers walks. */
  _wallFxBuild(w) {
    if (!w || w.fx || !this.add) return;
    // ROUND 394 -- a barrier whose row the r392 drop draws (segments, moving walls, planes, burn lines): beamWall394Mixin.js
    if (this._wall394Build && this._wall394Build(w)) return;
    const el = wallElementFor(w.drawEl || w.element, w.color);
    const fx = { el, pieces: [], vortex: null, ground: [], born: this.time ? this.time.now : 0 };
    // ROUND 388 -- the sheet art when it is loaded (the drawn pieces below are the fallback)
    const sh = this._wallSheet(el, w.drawEl);
    const vkey = sh && `fx_${VORTEX_ART.family}_${sh.color}`;
    if (sh && w.kind === 'pull' && this.textures.exists(vkey)) {
      const vi = fxFamilyInfo(VORTEX_ART.family);
      const p = isoProject(w.x, w.y);
      // A world disc of radius R is an ellipse 2.83R wide (and half that tall) on the iso screen.
      const sx = (2.83 * w.len) / VORTEX_ART.visW, sy = (1.415 * w.len) / VORTEX_ART.visH;
      const img = this.add.sprite(p.x, p.y, vkey, 0).setOrigin(0.5, vi.oy != null ? vi.oy : 0.5).setScale(sx, sy);
      img.setDepth(isoDepth(w.x, w.y) - 2).setAlpha(0.9);
      fx.vortex = img; fx.vortexF = -1; fx.vortexSheet = { frames: vi.frames, ms: vi.frameMs };
      fx.pieces.push(this._wallSheetPiece(sh, w.x, w.y, sh.scale * 1.5, 0));
      w.fx = fx; w.fxLife = w.t;
      return;
    }
    if (sh && w.kind !== 'pull') {
      const n = Math.max(3, Math.round(w.len / PIECE_SPACING));
      const ca = Math.cos(w.a), sa = Math.sin(w.a);
      for (let k = 0; k <= n; k++) {
        const u = k / n - 0.5;
        const wx = w.x + ca * w.len * u, wy = w.y + sa * w.len * u;
        if (this.textures.exists('shadowBlob')) {   // the glow on the floor under each piece stays: it is light
          const p = isoProject(wx, wy);
          const gl = this.add.image(p.x, p.y, 'shadowBlob');
          gl.setTint(parseInt((PALETTES[el] || PALETTES.physical)[1].slice(1), 16));
          gl.setAlpha(0.35); gl.setDisplaySize(PIECE_SPACING * 3.4, PIECE_SPACING * 1.5);
          gl.setDepth(isoDepth(wx, wy) - 1);
          fx.ground.push(gl);
        }
        // every piece on its own point of the loop, so the wall ripples instead of pulsing as one
        fx.pieces.push(this._wallSheetPiece(sh, wx, wy, sh.scale * (0.95 + (k % 3) * 0.07), k * 3.7));
      }
      w.fx = fx; w.fxLife = w.t;
      return;
    }
    if (w.kind === 'pull') {
      const img = this.add.image(0, 0, this._wallVortexKey(el, 0));
      const p = isoProject(w.x, w.y);
      img.setPosition(p.x, p.y);
      // A world disc of radius R is an ellipse 2.83R wide on the iso screen.
      const wide = 2.83 * w.len;
      img.setDisplaySize(wide, wide * (VORTEX_H / VORTEX_W));
      img.setDepth(isoDepth(w.x, w.y) - 2);
      img.setAlpha(0.9);
      fx.vortex = img; fx.vortexF = -1;
      // and one standing column of the element in the eye of it
      const col = this.add.image(p.x, p.y + 4, this._wallTexKey(el, 0));
      col.setOrigin(0.5, 0.92); col.setScale(1.5);
      col.setDepth(isoDepth(w.x, w.y) + 3);
      fx.pieces.push({ img: col, phase: 0, f: -1, wx: w.x, wy: w.y, scale: 1.5 });
    } else {
      const n = Math.max(3, Math.round(w.len / PIECE_SPACING));
      const ca = Math.cos(w.a), sa = Math.sin(w.a);
      for (let k = 0; k <= n; k++) {
        const u = k / n - 0.5;
        const wx = w.x + ca * w.len * u, wy = w.y + sa * w.len * u;
        const p = isoProject(wx, wy);
        if (this.textures.exists('shadowBlob')) {
          const gl = this.add.image(p.x, p.y, 'shadowBlob');
          gl.setTint(parseInt((PALETTES[el] || PALETTES.physical)[1].slice(1), 16));
          gl.setAlpha(0.35); gl.setDisplaySize(PIECE_SPACING * 3.4, PIECE_SPACING * 1.5);
          gl.setDepth(isoDepth(wx, wy) - 1);
          fx.ground.push(gl);
        }
        const img = this.add.image(p.x, p.y + 2, this._wallTexKey(el, 0));
        img.setOrigin(0.5, 0.92);
        const scale = 1.05 + (k % 3) * 0.08;
        img.setScale(scale);
        img.setDepth(isoDepth(wx, wy) + 3);
        fx.pieces.push({ img, phase: k * 1.7, f: -1, wx, wy, scale });
      }
    }
    w.fx = fx;
    w.fxLife = w.t;
  },

  _wallFxTick(w, dt) {
    const fx = w && w.fx;
    if (!fx) return;
    if (fx.r394) { if (this._wall394Tick) this._wall394Tick(w, dt); return; }   // ROUND 394
    const now = this.time ? this.time.now : 0;
    const age = (now - fx.born) / 1000;
    // grows in over a quarter second, fades over the last second
    const grow = Math.min(1, age / 0.25);
    const fade = Math.max(0, Math.min(1, w.t / 1.0));
    const tick = now / 1000 * FRAME_RATE;
    for (const pc of fx.pieces) {
      if (pc.sheet) {   // ROUND 388 -- a sheet piece steps its own frames, on its own clock
        const f = Math.floor(now / pc.sheet.ms + pc.phase) % pc.sheet.frames;
        if (f !== pc.f) { pc.f = f; pc.img.setFrame(f); }
        pc.img.setAlpha(fade);
        pc.img.setScale(pc.scale, pc.scale * (0.2 + 0.8 * grow));
        continue;
      }
      const f = Math.floor(tick + pc.phase) % FRAMES;
      if (f !== pc.f) { pc.f = f; pc.img.setTexture(this._wallTexKey(fx.el, f)); }
      pc.img.setAlpha(fade);
      pc.img.setScale(pc.scale, pc.scale * (0.2 + 0.8 * grow));
    }
    for (const gl of fx.ground) gl.setAlpha(0.35 * fade * grow);
    if (fx.vortex && fx.vortexSheet) {   // ROUND 388 -- the fx3 vortex
      const f = Math.floor(now / fx.vortexSheet.ms) % fx.vortexSheet.frames;
      if (f !== fx.vortexF) { fx.vortexF = f; fx.vortex.setFrame(f); }
      fx.vortex.setAlpha(0.9 * fade * grow);
    } else if (fx.vortex) {
      const f = Math.floor(tick * 0.9) % VORTEX_FRAMES;
      if (f !== fx.vortexF) { fx.vortexF = f; fx.vortex.setTexture(this._wallVortexKey(fx.el, f)); }
      fx.vortex.setAlpha(0.9 * fade * grow);
    }
  },

  _wallFxFree(w) {
    const fx = w && w.fx;
    if (!fx) return;
    if (fx.r394) { if (this._wall394Free) this._wall394Free(w); w.fx = null; return; }   // ROUND 394
    for (const pc of fx.pieces) if (pc.img && pc.img.destroy) pc.img.destroy();
    for (const gl of fx.ground) if (gl && gl.destroy) gl.destroy();
    if (fx.vortex && fx.vortex.destroy) fx.vortex.destroy();
    w.fx = null;
  },
};
