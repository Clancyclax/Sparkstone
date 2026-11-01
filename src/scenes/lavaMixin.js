// ===========================================================================
// ROUND 423 -- LAVA AND MAGMA, the moving parts.
//
//   "We made a massive upgrade to water, I would like similar work for magma and lava."
//
// The Cinderwaste's flows and pools now go through round 393's water system as two molten kinds (water.js
// `lavaPool` / `lavaRiver`): baked cells with the depth colour run the other way (black crust at the edge, orange,
// then yellow in the middle), the edge rounded off the tile staircase, a scorched bank of obsidian and basalt with
// embers caught in it, a creeping edge that pushes onto the rock and cools behind itself, and the molten surface
// sheet of drifting crust plates (tools/make_lava_r423.py). This file adds what moves on top:
//
//   floes     crust plates carried downstream on the rivers at the flow's speed
//   bubbles   domes that swell and burst on open lava, throwing a few sparks
//   embers    sparks drifting up off the surface and winking out
//   vents     the magma caves ("The Burning Throat") get pools of the same magma in their floors: baked from the same
//             palette and the same cells, ringed with colliders, glowing, bubbling (`_l423ChoosePools`, `_l423Room`)
//
// Everything is pooled; nothing is drawn per pixel per frame.
// ===========================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { roomTileCentre } from '../data/interiors.js';
import {
  W393_SHEETS, w393SheetCell, w393Palette, w393Measure, w393Corner, w393Quant, W393_Q, w393TouchesShore,
  w393ShorePhase, w393QuadAlpha,
} from '../data/water.js';

const MAX_FLOES = 48, MAX_BUBBLES = 36, MAX_EMBERS = 90;
const D_SURF = 0.02, D_SHORE = 0.03, D_FX = 0.05;
/** The light a pool of magma gives off in a cave. */
export const MAGMA_LIGHT = { kind: 'ember', color: 0xff7a2a, radius: 150, power: 0.8, glow: 0.42 };
/** How many pools a vent gets, and how big (tiles). */
export const MAGMA_POOLS = { min: 2, max: 3, size: [6, 11] };

export const LavaMixin = {
  // ------------------------------------------------------------------------------------------- the fx sheet
  _l423FxTextures() {
    // The molten sheet stays LINEAR like the water sheets and the static cells under it: its gutter ring (tools/
    // make_lava_r423.py) keeps the diamond edges from blending toward clear. Sampled nearest, its edges landed up to
    // half a texel off the linear static cell beneath, and that cell's bright rim showed as a staircase at every seam.
    if (this.textures.exists('l423Fx')) return;
    const tex = this.textures.createCanvas('l423Fx', 160, 16);
    const g = tex.context;
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    // floes: four crust plates, flattened to the iso floor, dark with a hot rim
    const floes = [
      ['.xxxx...', 'xxxxxxx.', 'xxxxxxxx', '.xxxxxx.', '..xxx...'],
      ['..xxx...', '.xxxxxx.', 'xxxxxxxx', 'xxxxxx..', '.xx.....'],
      ['.xxxxx..', 'xxxxxxxx', '.xxxxxxx', '...xxx..'],
      ['xxx.....', 'xxxxx...', '.xxxxxx.', '..xxxxxx', '....xx..'],
    ];
    floes.forEach((rows, k) => {
      const x0 = k * 12, y0 = 3;
      const at = (r, c) => rows[r] && rows[r][c] === 'x';
      rows.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch !== 'x') return;
        const edge = !at(r - 1, c) || !at(r + 1, c) || !at(r, c - 1) || !at(r, c + 1);
        px(x0 + 2 + c, y0 + r, edge ? (r > rows.length / 2 ? '#ff9a2e' : '#d24a16') : ((r * 7 + c * 3) % 5 === 0 ? '#5a2a1e' : '#2e1c1c'));
      }));
      tex.add(`f${k}`, 0, x0, 0, 12, 12);
    });
    // bubbles: a dome swelling, bursting, and the spatter ring
    const B = [
      [[3, 3, '#ffb040']],
      [[3, 3, '#ffd070'], [2, 3, '#e06018'], [4, 3, '#e06018'], [3, 2, '#ff9a30']],
      [[3, 3, '#fff0a8'], [2, 3, '#ffb040'], [4, 3, '#ffb040'], [3, 2, '#ffd070'], [2, 2, '#c04012'], [4, 2, '#c04012'], [1, 3, '#a03010'], [5, 3, '#a03010']],
      [[1, 2, '#ffd070'], [5, 2, '#ffd070'], [3, 1, '#fff0a8'], [0, 3, '#ff9a30'], [6, 3, '#ff9a30'], [3, 4, '#e06018']],
      [[0, 1, '#ff9a30'], [6, 1, '#ff9a30'], [3, 0, '#ffd070'], [1, 4, '#c04012'], [5, 4, '#c04012']],
    ];
    B.forEach((pts, k) => {
      const x0 = 48 + k * 8;
      for (const [x, y, c] of pts) px(x0 + x, 4 + y, c);
      tex.add(`b${k}`, 0, x0, 4, 7, 7);
    });
    // embers: a white-hot point, an orange spark, a dull red one
    px(90, 2, '#fff4c0'); tex.add('e0', 0, 89, 1, 3, 3);
    px(94, 2, '#ffb848'); px(95, 2, '#ff8a28'); tex.add('e1', 0, 93, 1, 4, 3);
    px(99, 2, '#d24a16'); tex.add('e2', 0, 98, 1, 3, 3);
    tex.refresh();
    tex.setFilter(1);
  },

  _l423State() {
    if (!this._l423) {
      this._l423FxTextures();
      this._l423 = { floes: [], bubbles: [], embers: [], ctx: null, stepAt: -1, shoreAt: -1 };
    }
    return this._l423;
  },

  _l423Kill(L) {
    for (const arr of [L.floes, L.bubbles, L.embers]) for (const p of arr) if (p.on) { p.on = false; if (p.s && p.s.active) p.s.setVisible(false); }
  },

  /** Hide the outdoor fx (going indoors); a vent's are its own. */
  _l423Hide() {
    const L = this._l423;
    if (L && L.ctx === 'world') { this._l423Kill(L); L.ctx = null; }
  },

  _l423Sprite(arr, max, frame, blend) {
    let p = arr.find(q => !q.on);
    if (!p) {
      if (arr.length >= max) return null;
      p = { s: null };
      arr.push(p);
    }
    if (!p.s || !p.s.active) { p.s = this.add.image(0, 0, 'l423Fx', frame).setOrigin(0.5, 0.5); }
    p.s.setFrame(frame).setBlendMode(blend || 0).setVisible(true).setAlpha(0);
    p.on = true; p.age = 0;
    return p;
  },

  /** A point inside a lava tile's diamond, in screen space, kept clear of its rim. */
  _l423PointIn(rec) {
    const s = 0.2 + Math.random() * 0.6, t = 0.2 + Math.random() * 0.6;
    return { x: rec.img.x + (s - t) * 32, y: rec.img.y + (s + t - 1) * 16, s, t };
  },

  // ------------------------------------------------------------------------------------------- the clock
  _l423Update(dt) {
    const L = this._l423State();
    const room = this._insideRoom;
    let open, river, ctx;
    if (room) {
      const V = room._l423;
      if (!V || !V.tiles.length) { if (L.ctx) { this._l423Kill(L); L.ctx = null; } return; }
      ctx = room.id; open = V.open; river = [];
      this._l423AnimateVent(V);
    } else {
      const st = this._w393;
      if (!st) return;
      ctx = 'world'; open = st.lavaOpen || []; river = st.lavaRiver || [];
    }
    if (L.ctx !== ctx) { this._l423Kill(L); L.ctx = ctx; }
    this._l423Floes(L, dt, river);
    this._l423Bubbles(L, dt, open);
    this._l423Embers(L, dt, open);
  },

  /** Crust plates riding the rivers downstream. */
  _l423Floes(L, dt, river) {
    const want = Math.min(MAX_FLOES, Math.round(river.length * 0.12));
    let live = 0;
    for (const p of L.floes) {
      if (!p.on) continue;
      p.age += dt;
      p.wx += p.vx * dt; p.wy += p.vy * dt;
      if (p.age >= p.life) { p.on = false; p.s.setVisible(false); continue; }
      const u = p.age / p.life;
      p.s.setAlpha(Math.min(1, u * 4, (1 - u) * 4) * 0.95);
      const q = isoProject(p.wx, p.wy);
      p.s.setPosition(Math.round(q.x), Math.round(q.y));
      p.s.setDepth(p.depth);
      live++;
    }
    for (let n = 0; live < want && n < 3 && river.length; n++) {
      const rec = river[(Math.random() * river.length) | 0];
      const p = this._l423Sprite(L.floes, MAX_FLOES, `f${(Math.random() * 4) | 0}`);
      if (!p) break;
      const sp = (rec.pal.flowSpeed || 12) * (0.7 + Math.random() * 0.6);
      p.wx = (rec.tx + 0.3 + Math.random() * 0.4) * TILE; p.wy = (rec.ty + 0.3 + Math.random() * 0.4) * TILE;
      p.vx = rec.fx * sp; p.vy = rec.fy * sp;
      // a short life, so a plate never rides out over the bank: it sinks back into the melt
      p.life = 2.2 + Math.random() * 2.2;
      p.depth = rec.img.depth + D_FX;
      p.s.setFlipX(Math.random() < 0.5);
      live++;
    }
  },

  /** Domes that swell and burst, throwing sparks. */
  _l423Bubbles(L, dt, open) {
    const want = Math.min(MAX_BUBBLES, Math.round(open.length * 0.05) + (open.length ? 1 : 0));
    let live = 0;
    for (const p of L.bubbles) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; p.s.setVisible(false); continue; }
      const u = p.age / p.life;
      const fr = Math.min(4, Math.floor(u * 5));
      if (fr !== p.fr) {
        p.fr = fr; p.s.setFrame(`b${fr}`);
        if (fr === 3) for (let k = 0; k < 2 + ((Math.random() * 3) | 0); k++) this._l423Spark(L, p.s.x, p.s.y - 2, p.s.depth + 0.01, true);
      }
      p.s.setAlpha(fr >= 4 ? 0.6 : 1);
      live++;
    }
    for (let n = 0; live < want && n < 2 && open.length; n++) {
      if (Math.random() > 0.35) break;   // bursts come one at a time, not in a grid
      const rec = open[(Math.random() * open.length) | 0];
      const p = this._l423Sprite(L.bubbles, MAX_BUBBLES, 'b0');
      if (!p) break;
      const at = this._l423PointIn(rec);
      p.s.setPosition(Math.round(at.x), Math.round(at.y)).setDepth(rec.img.depth + D_FX);
      p.life = 0.7 + Math.random() * 0.8; p.fr = -1;
      live++;
    }
  },

  _l423Spark(L, x, y, depth, burst) {
    const hot = Math.random();
    const p = this._l423Sprite(L.embers, MAX_EMBERS, hot > 0.7 ? 'e0' : hot > 0.25 ? 'e1' : 'e2', 1);
    if (!p) return;
    p.x = x; p.y = y; p.depth = depth;
    p.vx = (Math.random() - 0.5) * (burst ? 26 : 8);
    p.vy = -(burst ? 22 + Math.random() * 26 : 10 + Math.random() * 16);
    p.life = burst ? 0.5 + Math.random() * 0.5 : 1.2 + Math.random() * 1.4;
    p.w = Math.random() * 6.28;
    p.s.setPosition(Math.round(x), Math.round(y)).setDepth(depth + 3000);
  },

  /** Sparks lifting off the melt. */
  _l423Embers(L, dt, open) {
    for (const p of L.embers) {
      if (!p.on) continue;
      p.age += dt;
      if (p.age >= p.life) { p.on = false; p.s.setVisible(false); continue; }
      const u = p.age / p.life;
      p.vy += 4 * dt;                       // the heat lifts them, the air slows them
      p.x += (p.vx + Math.sin(p.w + p.age * 5) * 6) * dt; p.y += p.vy * dt;
      p.s.setPosition(Math.round(p.x), Math.round(p.y));
      p.s.setAlpha(Math.min(1, u * 6, (1 - u) * 2.5));
    }
    const rate = Math.min(14, open.length * 0.06);   // sparks a second over what is on screen
    let n = rate * dt;
    while (open.length && (n >= 1 || Math.random() < n)) {
      n -= 1;
      const rec = open[(Math.random() * open.length) | 0];
      const at = this._l423PointIn(rec);
      this._l423Spark(L, at.x, at.y, rec.img.depth + D_FX, false);
    }
  },

  // ------------------------------------------------------------------------------------------- the vents
  /**
   * Choose a vent's magma pools (from `_dressDenRoom`, before anything else is placed). A pool stands in the open
   * floor -- every tile of it with open floor all round -- away from the way in and from the back of the cave where
   * the den's pack waits, and never so that the floor beyond it is cut off from the door.
   */
  _l423ChoosePools(room, rng, entry, taken) {
    room._magma = null;
    if (!room.caveWalkable || !room.caveFloor) return;
    if (!room._caveFloorOrig) room._caveFloorOrig = room.caveFloor;
    room.caveFloor = room._caveFloorOrig;
    const floor = room.caveFloor() || [];
    if (floor.length < 30) return;
    const K = (x, y) => `${x},${y}`;
    const walk = new Set(floor.map(t => K(t.tx, t.ty)));
    const W = (x, y) => walk.has(K(x, y));
    let far = null, fd = -1;
    for (const t of floor) {
      const c = roomTileCentre(room, t.tx, t.ty);
      const d = Math.hypot(c.x - entry.x, c.y - entry.y);
      if (d > fd) { fd = d; far = t; }
    }
    const roomy = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!W(x + dx, y + dy)) return false;
      return true;
    };
    const entryT = { tx: Math.floor((entry.x - room.x) / TILE), ty: Math.floor((entry.y - room.y) / TILE) };
    const pool = new Set();
    const reachAll = () => {
      // every floor tile still reachable from the door, walking round the pools
      let start = null;
      for (const t of floor) if (!pool.has(K(t.tx, t.ty)) && (!start || Math.hypot(t.tx - entryT.tx, t.ty - entryT.ty) < Math.hypot(start.tx - entryT.tx, start.ty - entryT.ty))) start = t;
      if (!start) return false;
      const seen = new Set([K(start.tx, start.ty)]), q = [start];
      while (q.length) {
        const t = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = K(t.tx + dx, t.ty + dy);
          if (!walk.has(k) || pool.has(k) || seen.has(k)) continue;
          seen.add(k); q.push({ tx: t.tx + dx, ty: t.ty + dy });
        }
      }
      return seen.size === floor.length - pool.size;
    };
    const want = MAGMA_POOLS.min + Math.floor(rng() * (MAGMA_POOLS.max - MAGMA_POOLS.min + 1));
    const cands = floor.filter(t => roomy(t.tx, t.ty)
      && Math.hypot(t.tx - entryT.tx, t.ty - entryT.ty) > 4.5 && Math.hypot(t.tx - far.tx, t.ty - far.ty) > 3.5);
    let made = 0;
    for (let a = 0; a < 40 && made < want && cands.length; a++) {
      const seed = cands[Math.floor(rng() * cands.length)];
      if ([...pool].some(k => { const [x, y] = k.split(',').map(Number); return Math.hypot(x - seed.tx, y - seed.ty) < 4; })) continue;
      const size = MAGMA_POOLS.size[0] + Math.floor(rng() * (MAGMA_POOLS.size[1] - MAGMA_POOLS.size[0] + 1));
      const mine = [seed];
      const front = [seed];
      while (mine.length < size && front.length) {
        const t = front.splice(Math.floor(rng() * front.length), 1)[0];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = { tx: t.tx + dx, ty: t.ty + dy };
          if (mine.length >= size) break;
          // a grown tile needs open floor on its four sides (the seed needed all eight)
          const open4 = W(n.tx, n.ty) && W(n.tx + 1, n.ty) && W(n.tx - 1, n.ty) && W(n.tx, n.ty + 1) && W(n.tx, n.ty - 1);
          if (!open4 || mine.some(m => m.tx === n.tx && m.ty === n.ty)) continue;
          if (Math.hypot(n.tx - entryT.tx, n.ty - entryT.ty) <= 4 || Math.hypot(n.tx - far.tx, n.ty - far.ty) <= 3) continue;
          mine.push(n); front.push(n);
        }
      }
      for (const m of mine) pool.add(K(m.tx, m.ty));
      if (!reachAll()) { for (const m of mine) pool.delete(K(m.tx, m.ty)); continue; }
      made++;
    }
    if (!pool.size) return;
    room._magma = [...pool].map(k => { const [tx, ty] = k.split(',').map(Number); return { tx, ty }; });
    // nothing else is put in (or on the bank right beside) a pool
    for (const m of room._magma) taken.push(roomTileCentre(room, m.tx, m.ty));
    const orig = room._caveFloorOrig;
    room.caveFloor = function () { const f = orig.call(this); return f ? f.filter(t => !pool.has(K(t.tx, t.ty))) : f; };
  },

  /** Draw a vent's pools: the same molten cells as the Cinderwaste's, a collider on every tile, light and fire. */
  _l423Room(room) {
    room._l423 = null;
    if (!room._magma || !room._magma.length) return;
    const st = this._w393State ? this._w393State() : null;
    if (!st) return;
    const pal = w393Palette('lavaPool');
    const set = new Set(room._magma.map(m => `${m.tx},${m.ty}`));
    const isWet = (x, y) => set.has(`${x},${y}`);
    const info = new Map();
    const I = (x, y) => {
      const k = `${x},${y}`;
      let v = info.get(k);
      if (!v) { const m = w393Measure(isWet, x, y, 4, 3); v = { F: m.F, wet: isWet(x, y), hard: false }; info.set(k, v); }
      return v;
    };
    const corner = (cx, cy) => w393Quant(w393Corner(I(cx - 1, cy - 1), I(cx, cy - 1), I(cx - 1, cy), I(cx, cy))) / W393_Q;
    const V = { tiles: [], open: [], surf: [], shore: [] };
    const tiles = new Set();
    for (const m of room._magma) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = m.tx + dx, y = m.ty + dy;
      if (room.caveWalkable(x, y)) tiles.add(`${x},${y}`);
    }
    const sheet = W393_SHEETS[pal.ripple];
    room._h422Lights = room._h422Lights || [];
    for (const k of tiles) {
      const [tx, ty] = k.split(',').map(Number);
      const wet = isWet(tx, ty);
      const corners = [corner(tx, ty), corner(tx + 1, ty), corner(tx, ty + 1), corner(tx + 1, ty + 1)];
      if (!wet && Math.max(...corners) <= -pal.bank.width) continue;
      const c = roomTileCentre(room, tx, ty);
      const p = isoProject(c.x, c.y);
      const depth = isoDepth(c.x, c.y) - 1000000 + 0.5;   // over the cave's own floor tile, under everything standing
      const cell = this._w393StaticCell(wet ? 'water' : 'land', 'lavaPool', pal, corners);
      if (!cell) continue;
      const img = this.add.image(p.x, p.y, cell.tex, cell.name).setOrigin(0.5, 0.5).setDepth(depth);
      this._tagRoom(img, room); this.interiorSprites.push(img);
      const rec = { img, tx, ty, corners, pal, kind: 'lavaPool' };
      if (wet) {
        const s = this.add.image(p.x, p.y, sheet.key, w393SheetCell(sheet, 0, tx, ty)).setOrigin(0.5, 0.5).setDepth(depth + D_SURF);
        const a = corners.map(v => Math.max(0, Math.min(1, (v - 0.05) / 0.35)));
        const [tl, tr, bl, br] = w393QuadAlpha(a[0], a[1], a[2], a[3]);
        s.setAlpha(tl, tr, bl, br);
        this._tagRoom(s, room); this.interiorSprites.push(s);
        V.surf.push({ s, tx, ty });
        (this.interiorSolids = this.interiorSolids || []).push({ room: room.id, x: c.x, y: c.y, radius: TILE * 0.55 });
        if (Math.min(...corners) > 0.12) V.open.push(rec);
        V.tiles.push(rec);
      }
      if (w393TouchesShore(pal, corners)) {
        const sc = this._w393ShoreCell('lavaPool', pal, corners);
        if (sc) {
          const s = this.add.image(p.x, p.y, sc.tex, sc.names[0]).setOrigin(0.5, 0.5).setDepth(depth + D_SHORE);
          this._tagRoom(s, room); this.interiorSprites.push(s);
          V.shore.push({ s, names: sc.names, phase: Math.floor(w393ShorePhase(tx, ty) * pal.frames), at: -1 });
        }
      }
    }
    // the pages the cells were baked into
    for (const page of st.dirty) page.tex.refresh();
    st.dirty.clear();
    // a light over each pool
    const groups = new Map();
    for (const m of room._magma) {
      const g = `${Math.floor(m.tx / 4)},${Math.floor(m.ty / 4)}`;
      if (groups.has(g)) continue;
      groups.set(g, m);
      const c = roomTileCentre(room, m.tx, m.ty);
      const q = isoProject(c.x, c.y);
      room._h422Lights.push({ x: c.x, y: c.y, sx: q.x, sy: q.y - 6, spec: MAGMA_LIGHT, key: 'magma' });
    }
    if (!V.tiles.length) return;
    room._l423 = V;
    room._l423Census = { pools: room._magma.length, tiles: V.tiles.length, shore: V.shore.length, lights: groups.size };
  },

  /** A vent's surface and creeping edge, on the same clock as the outdoor lava. */
  _l423AnimateVent(V) {
    const now = this.time ? this.time.now : 0;
    const sheet = W393_SHEETS.lava;
    const step = Math.floor(now / 300) % sheet.F;
    if (step !== V.step) {
      V.step = step;
      for (const r of V.surf) r.s.setFrame(w393SheetCell(sheet, step, r.tx, r.ty));
    }
    const pal = w393Palette('lavaPool');
    const n = pal.frames;
    for (const r of V.shore) {
      const fr = (Math.floor(now / (pal.cycleMs / n)) + r.phase) % n;
      if (fr === r.at) continue;
      r.at = fr; r.s.setFrame(r.names[fr]);
    }
  },

  /** For probes and the suite. */
  _l423Stats() {
    const L = this._l423, st = this._w393;
    const on = (a) => (a || []).filter(p => p.on).length;
    return { floes: on(L && L.floes), bubbles: on(L && L.bubbles), embers: on(L && L.embers), ctx: L && L.ctx,
      lavaRiver: st ? (st.lavaRiver || []).length : 0, lavaOpen: st ? (st.lavaOpen || []).length : 0 };
  },
};
