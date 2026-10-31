// ============================================================================
// ROUND 422 -- WINDOWS, TABLETOPS, SITTING AND SLEEPING RESIDENTS, THE ROUNDHOUSE: THE SCENE SIDE.
// The rules are src/data/homeDress422.js; the art tables src/data/interiors422.js (tools/interiors_r422).
//
// Wired in at:
//   preload                         -> _h422Preload        the window sheets, the small props, the poses, the round floors
//   _buildRoomContents (wall loop)  -> room._kitWallSprites each back-wall piece drawn, so a window can take its place
//   _buildRoomContents (props)      -> sprite._propKey      which prop a sprite is, for the tabletop pass
//   _buildRoomContents (the end)    -> _h422Dress          windows, sills, tabletops, lights, the round floor
//   _clFillHome                     -> _h422FillRoom       who is home, sitting, sleeping or about their day
//   _clRoomTick (room changed)      -> _h422FillRoom       the people of a floor you climb to, or come back down to
//   _lightSources                   -> room._h422Lights    the candles and lamps that are lit, and the hearth
// ============================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { roomTileCentre } from '../data/interiors.js';
import { KIT_FOOT_X, KIT_FOOT_Y, KIT_SCALE, KIT_CELL_W, KIT_CELL_H, KIT_WINDOW_TEX, kitForRoom } from '../data/buildingKits.js';
import { FURN_BY_KEY } from '../data/furniture.js';
import { homeAt } from '../data/cityLife.js';
import { SMALL_PROPS, SMALL_PROP_CELL, WINDOW_MATERIALS, WINDOW_SILLS, POSED } from '../data/interiors422.js';
import {
  rngFrom, isSleepHour, isNightHour, windowStyleFor, windowPicks, WINDOW_CELLS, TALL_AT_WALL, tabletopFor, sillFor,
  smallLight, SMALL_LIGHTS, SMALL_PROP_SCALE, residentLook, seatedKey, lyingKey, bedCell, ROUND_FLOORS,
} from '../data/homeDress422.js';

const CREW = 'clCrew';   // cityLifeMixin's tag for a room's people: cleared with the room
export const SMALL_PROP_TEX = 'propsSmall';
const MEAL = (h) => (h >= 7 && h < 8.5) || (h >= 12 && h < 13.5) || (h >= 18 && h < 19.5);
/** Props a person can sit on, and floor cushions (sat beside, at the low table). */
const SEAT_PROPS = new Set(['stoolWood', 'stoolRound', 'stoolSquare', 'benchLow', 'benchWood', 'chairPadded', 'chairPlain',
  'chairWhite', 'rockingChair', 'floorCushions', 'floorCushionsGreen', 'floorCushionsOchre']);
const TABLE_PROPS = new Set(['lowTable', 'lowTablePale', 'mealTable', 'tableRed', 'tableSmall', 'tableRound', 'tableLong',
  'tableDark', 'tableRoundBig']);
const BED_PROPS = /^(unmadeBed|futon)/;

export const HomeDress422Mixin = {
  // ------------------------------------------------------------------------------------------------ art
  _h422Preload() {
    for (const m of WINDOW_MATERIALS) {
      this.load.spritesheet(`kit_${m}_windows`, `./public/assets/kit_${m}_windows.png`, { frameWidth: KIT_CELL_W, frameHeight: KIT_CELL_H });
    }
    this.load.spritesheet(SMALL_PROP_TEX, './public/assets/props_small.png', { frameWidth: SMALL_PROP_CELL, frameHeight: SMALL_PROP_CELL });
    for (const [key, p] of Object.entries(POSED)) {
      this.load.spritesheet(seatedKey(key), `./public/assets/poses/${key}_seated.png`, { frameWidth: 64, frameHeight: 64 });
      if (p.lying) this.load.spritesheet(lyingKey(key), `./public/assets/poses/${key}_lying.png`, { frameWidth: 96, frameHeight: 64 });
    }
    for (const f of Object.values(ROUND_FLOORS)) this.load.image(f, `./public/assets/${f}.png`);
  },

  /** A clear 64x32 ground tile: the round floor's tiles draw nothing (the picture is laid over them). */
  _h422ClearTile() {
    if (!this.textures.exists('floorClear422')) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 32;
      this.textures.addSpriteSheet('floorClear422', c, { frameWidth: 64, frameHeight: 32 });
    }
    return 'floorClear422';
  },

  /** The opaque box of a sprite's frame, in its frame's pixels (measured once per texture+frame). */
  _h422Ink(s) {
    const fr = s && s.frame;
    if (!fr) return null;
    const key = `${s.texture.key}|${fr.name}`;
    this._h422InkCache = this._h422InkCache || new Map();
    if (this._h422InkCache.has(key)) return this._h422InkCache.get(key);
    let box = null;
    try {
      const src = s.texture.getSourceImage();
      const c = document.createElement('canvas');
      c.width = fr.cutWidth; c.height = fr.cutHeight;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, 0, 0, fr.cutWidth, fr.cutHeight);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 >= 0) box = { x0, y0, x1, y1, w: fr.cutWidth, h: fr.cutHeight };
    } catch (e) { box = null; }
    this._h422InkCache.set(key, box);
    return box;
  },

  /** A sprite's opaque box on screen. */
  _h422Screen(s) {
    const b = this._h422Ink(s);
    if (!b) return null;
    const sx = s.scaleX, sy = s.scaleY, fl = s.flipX ? -1 : 1;
    const ox = s.originX * b.w, oy = s.originY * b.h;
    const xa = s.x + (b.x0 - ox) * sx * fl, xb = s.x + (b.x1 + 1 - ox) * sx * fl;
    return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: s.y + (b.y0 - oy) * sy, y1: s.y + (b.y1 + 1 - oy) * sy };
  },

  _h422RoomSprites(room) {
    return (this.interiorSprites || []).filter(s => s && s.scene && s._room === room.id);
  },

  /** One small thing, its bottom-centre on screen point (x, y). */
  _h422Small(room, key, x, y, depth, worldAt) {
    const d = SMALL_PROPS[key];
    if (!d || !this.textures.exists(SMALL_PROP_TEX)) return null;
    const s = this.add.image(x, y, SMALL_PROP_TEX, d.idx);
    s.setOrigin(d.ax / SMALL_PROP_CELL, (d.ay + 1) / SMALL_PROP_CELL).setScale(SMALL_PROP_SCALE).setDepth(depth);
    s._smallProp = key;
    this._tagRoom(s, room);
    this.interiorSprites.push(s);
    const hour = this._clHour ? this._clHour() : 12;
    const lit = smallLight(key, hour);
    if (lit && worldAt) {
      room._h422Lights.push({ x: worldAt.x, y: worldAt.y, sx: x, sy: y - 6, spec: lit, key });
    }
    return s;
  },

  // ------------------------------------------------------------------------------------------------ the pass
  _h422Dress(room) {
    room._h422Lights = [];
    room._h422Census = null;
    const ctx = room._h422Ctx;
    if (!ctx) return;
    const hour = this._clHour ? this._clHour() : 12;
    const c = { ...ctx, hour };
    const census = { windows: 0, sills: 0, tabletop: 0, lights: 0, round: 0 };
    if (room.roundFloor) census.round = this._h422Round(room, c);
    else census.windows = this._h422Windows(room, c, census);
    census.tabletop = this._h422Tabletops(room, c);
    census.lights = room._h422Lights.length;
    room._h422Census = census;
  },

  /** Back-wall pieces turned into windows. Returns how many. */
  _h422Windows(room, ctx, census) {
    const recs = room._kitWallSprites || [];
    if (!recs.length) return 0;
    const mat = kitForRoom(room);
    const tex = KIT_WINDOW_TEX[mat] || null;
    if (!tex || !this.textures.exists(tex)) return 0;
    const style = windowStyleFor(ctx.culture, ctx.key);
    const [cellN, cellW] = WINDOW_CELLS[style];
    const x0 = room.x, y0 = room.y;
    const runs = { north: [], west: [] };
    for (const r of recs) {
      if (!r.s || !r.s.scene || r.trimmed) continue;
      const lx = Math.floor((r.tx - x0) / TILE), ly = Math.floor((r.ty - y0) / TILE);
      if (r.dir === 'north' && ly === 0) runs.north[lx] = r;
      if (r.dir === 'west' && lx === 0) runs.west[ly] = r;
    }
    const banN = new Set([0]), banW = new Set([0]);
    for (const p of room.partitions || []) {
      if (p.dir === 'west' && p.ty === 0) { banN.add(p.tx - 1); banN.add(p.tx); }
      if (p.dir === 'north' && p.tx === 0) { banW.add(p.ty - 1); banW.add(p.ty); }
    }
    for (const p of room.props || []) {
      const tall = TALL_AT_WALL.has(p.key);
      if (p.key === 'stairFull') {
        if (p.face === 'north') for (let k = -1; k <= 1; k++) banN.add(Math.round(p.tx) + k);
        else for (let k = -1; k <= 1; k++) banW.add(Math.round(p.ty) + k);
        continue;
      }
      if (!tall) continue;
      if (p.ty < 1.7) { banN.add(Math.floor(p.tx)); banN.add(Math.round(p.tx)); }
      if (p.tx < 1.7) { banW.add(Math.floor(p.ty)); banW.add(Math.round(p.ty)); }
    }
    let n = 0, si = 0;
    const place = (r, cell, dirKey) => {
      r.s.setTexture(tex, cell);
      r.s._window = style;
      n++;
      // the sill: just under the glass, on the wall's face
      const sill = WINDOW_SILLS[cell];
      const what = sill ? sillFor(ctx, si++) : null;
      if (what) {
        const sx = r.s.x + (sill.x - KIT_FOOT_X * KIT_CELL_W) * KIT_SCALE, sy = r.s.y + (sill.y - KIT_FOOT_Y * KIT_CELL_H) * KIT_SCALE;
        if (this._h422Small(room, what, sx, sy, r.s.depth + 0.5, { x: r.tx, y: r.ty })) census.sills++;
      }
      return dirKey;
    };
    for (const i of windowPicks(runs.north.length, banN)) if (runs.north[i]) place(runs.north[i], cellN, 'north');
    for (const i of windowPicks(runs.west.length, banW)) if (runs.west[i]) place(runs.west[i], cellW, 'west');
    return n;
  },

  /** Small things on the tables, stands, sideboards and low tables. Returns how many. */
  _h422Tabletops(room, ctx) {
    let n = 0;
    let salt = 0;
    for (const s of this._h422RoomSprites(room)) {
      let kind = null;
      if (s._furn) {
        const m = FURN_BY_KEY[s._furn];
        if (m && m.kind === 'table') kind = 'table';
        else if (m && m.kind === 'stand') kind = 'stand';
      } else if (s._propKey) {
        if (s._propKey === 'sideboard') kind = 'sideboard';
        else if (/^lowTable/.test(s._propKey)) kind = 'low';
        else if (s._propKey === 'mealTable') kind = 'meal';
      }
      if (!kind) continue;
      const box = this._h422Screen(s);
      if (!box) continue;
      const W = box.x1 - box.x0;
      // the top's middle: a quarter of the drawn width below the topmost pixel (an iso top is half as tall as wide);
      // a sideboard stands against the wall with a back rail, and its top is lower in the drawing
      const cx = (box.x0 + box.x1) / 2;
      const cy = box.y0 + W * (kind === 'sideboard' ? 0.36 : kind === 'meal' ? 0.2 : 0.25);
      const keys = tabletopFor(kind, ctx, `${salt++}`);
      const spread = keys.length <= 1 ? [[0, 0]] : keys.length === 2 ? [[-0.17, -0.02], [0.17, 0.03]] : [[-0.22, -0.03], [0.02, 0.02], [0.22, -0.01]];
      const world = s._fogWorld || null;
      keys.forEach((k, i) => {
        const [fx, fy] = spread[i] || [0, 0];
        if (this._h422Small(room, k, cx + fx * W, cy + fy * W, s.depth + 0.3 + i * 0.01, world)) n++;
      });
    }
    return n;
  },

  // ------------------------------------------------------------------------------------------------ the roundhouse
  /** The round floor drawn whole, centred on the room, the hearth's light, smoke and its stones in the way. */
  _h422Round(room, ctx) {
    const d = room.roundFloor;
    const key = ROUND_FLOORS[d];
    if (!key || !this.textures.exists(key)) return 0;
    const cx = room.x + (d * TILE) / 2, cy = room.y + (d * TILE) / 2;
    const p = isoProject(cx, cy);
    const img = this.add.image(p.x, p.y, key).setOrigin(0.5, 0.5);
    img.setDepth(isoDepth(room.x, room.y) - 99999);
    this._tagRoom(img, room);
    this.interiorSprites.push(img);
    (this.interiorSolids = this.interiorSolids || []).push({ room: room.id, x: cx, y: cy, radius: TILE * 0.6 });
    room._h422Lights.push({ x: cx, y: cy, sx: p.x, sy: p.y - 8, spec: SMALL_LIGHTS.hearth, key: 'hearth' });
    room._h422Hearth = { sx: p.x, sy: p.y - 4, depth: isoDepth(cx, cy) + 1 };
    return d;
  },

  /** Smoke off the roundhouse hearth while you stand in it (called from the city-life room tick). */
  _h422Tick(dt0) {
    const room = this._insideRoom;
    const parts = (this._h422Smoke = this._h422Smoke || []);
    const dt = Math.min(0.1, dt0 || 0.016);
    const H = room && room._h422Hearth;
    if (H && this.textures.exists('clSmoke')) {
      this._h422SmokeT = (this._h422SmokeT || 0) - dt;
      if (this._h422SmokeT <= 0) {
        this._h422SmokeT = 0.32 + Math.random() * 0.2;
        let q = parts.find(z => !z.on);
        if (!q && parts.length < 16) { q = { img: this.add.image(0, 0, 'clSmoke'), on: false }; parts.push(q); }
        if (q) {
          q.on = true; q.t = 0; q.life = 2.6 + Math.random(); q.x = H.sx + (Math.random() - 0.5) * 10; q.y = H.sy;
          q.img.setVisible(true).setPosition(q.x, q.y).setScale(0.3).setAlpha(0.3).setDepth(H.depth + 500).setTint(0xb8b8bc);
        }
      }
    }
    for (const q of parts) {
      if (!q.on) continue;
      q.t += dt;
      if (!H || q.t >= q.life) { q.on = false; q.img.setVisible(false); continue; }
      const f = q.t / q.life;
      q.img.setPosition(q.x + Math.sin(q.t * 1.7) * 3, q.y - f * 70).setScale(0.3 + f * 0.6).setAlpha(0.3 * (1 - f));
    }
  },

  // ------------------------------------------------------------------------------------------------ the people
  /** Seats and beds in a room, read off what was drawn. */
  _h422Furniture(room) {
    const seats = [], beds = [], tables = [];
    for (const s of this._h422RoomSprites(room)) {
      const w = s._fogWorld;
      if (!w) continue;
      const m = s._furn ? FURN_BY_KEY[s._furn] : null;
      if (m && m.kind === 'chair') seats.push({ s, x: w.x, y: w.y, face: s._furnFace, kind: 'chair' });
      else if (m && m.kind === 'bed') beds.push({ s, x: w.x, y: w.y, cell: bedCell(s._furnFace, false) });
      else if (m && m.kind === 'table') tables.push(w);
      else if (s._propKey && SEAT_PROPS.has(s._propKey)) seats.push({ s, x: w.x, y: w.y, face: null, kind: /Cushion/.test(s._propKey) ? 'cushion' : 'stool' });
      else if (s._propKey && BED_PROPS.test(s._propKey)) beds.push({ s, x: w.x, y: w.y, cell: bedCell(null, !!s.flipX) });
      else if (s._propKey && TABLE_PROPS.has(s._propKey)) tables.push(w);
    }
    if (room._h422Hearth) tables.push({ x: room.x + (room.roundFloor * TILE) / 2, y: room.y + (room.roundFloor * TILE) / 2 });
    const face = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'southeast' : 'northwest') : (dy > 0 ? 'southwest' : 'northeast'));
    for (const st of seats) {
      if (st.face) continue;
      let best = null, bd = 1e9;
      for (const t of tables) { const dd = Math.hypot(t.x - st.x, t.y - st.y); if (dd < bd) { bd = dd; best = t; } }
      if (st.kind === 'cushion' && best) {
        // the cushions lie round the low table: sit on its south side, facing it
        st.x = best.x; st.y = best.y + TILE * 0.95; st.face = 'northeast'; st.depthBelow = false;
      } else st.face = best && bd < TILE * 3 ? face(best.x - st.x, best.y - st.y) : 'southwest';
    }
    return { seats, beds };
  },

  /** A posed resident: seated on a seat, or lying on a bed. Returns the npc. */
  _h422Pose(room, look, pose, at, def) {
    const tex = pose === 'seated' ? seatedKey(look) : lyingKey(look);
    if (!tex || !this.textures.exists(tex)) return null;
    let sp;
    if (pose === 'seated') {
      const p = isoProject(at.x, at.y);
      sp = this.add.sprite(p.x, p.y, tex, dirRow(at.face));
      const art = NPC_ART[look] || { footX: 32, footY: 63 };
      sp.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL)).setScale(art.scale || 1);
      // a chair's back is behind someone facing away from the camera's side (south-east / south-west), and in front of
      // someone facing into the room (north-east / north-west), who sits with their back to us
      const back = at.face === 'northeast' || at.face === 'northwest';
      const base = at.s && at.kind !== 'cushion' ? at.s.depth : isoDepth(at.x, at.y);
      sp.setDepth(back && at.kind === 'chair' ? base - 0.5 : base + 0.5);
    } else {
      const box = this._h422Screen(at.s);
      if (!box) return null;
      const W = box.x1 - box.x0, Hh = box.y1 - box.y0;
      // the mattress's middle: a little below the box's centre (the headboard stands up at the back)
      // the mattress's middle: the drawn bed's middle, nudged toward the foot (its headboard stands up behind)
      const mx = (box.x0 + box.x1) / 2 + (at.cell === 0 ? -0.03 : 0.03) * W, my = box.y0 + Hh * 0.6;
      sp = this.add.sprite(mx, my, tex, at.cell).setOrigin(0.5, 0.5);
      sp.setDepth(at.s.depth + 0.6);
    }
    this._tagRoom(sp, room);
    (this.interiorSprites = this.interiorSprites || []).push(sp);
    const n = { x: at.x, y: at.y + (pose === 'lying' ? TILE * 0.5 : 0), facing: at.face || 'south', sprite: sp, interior: room.id,
      [CREW]: room.id, noDot: true, posed: pose, ...def };
    this.npcs.push(n);
    return n;
  },

  /** Who of a household is on which floor at this hour. */
  _h422Who(room, hh, hour) {
    const ctx = room._h422Ctx;
    const home = homeAt(hh, hour);
    const level = ctx.level || 0, multi = (ctx.storeys || 1) > 1;
    if (!isSleepHour(hour) || !multi) return level === 0 ? home : [];
    // a taller house sleeps upstairs; one of them is still up, downstairs, late in the evening; the attic has the last
    const late = hour >= 22 && home.length ? home[0] : null;
    const attic = (ctx.storeys || 1) >= 3 && home.length >= 3 ? home[home.length - 1] : null;
    if (level === 0) return late ? [late] : [];
    if (level === 2) return attic ? [attic] : [];
    return home.filter(p => p !== late && p !== attic);
  },

  /** Put a house floor's people where they would be: sleeping, at the table, at their work. */
  _h422FillRoom(room) {
    const b = room._forBuilding;
    const ctx = room._h422Ctx;
    if (!b || !ctx || ctx.held || !this._h421Household) return null;
    if ((this._homeSigns || []).some(s => s.b === b)) { room._clEmpty = true; return null; }
    if (this._clClearCrew) this._clClearCrew(room);
    const hh = this._h421Household(b);
    const hour = this._clHour ? this._clHour() : 12;
    const people = this._h422Who(room, hh, hour);
    const { seats, beds } = this._h422Furniture(room);
    const rng = rngFrom(`fill|${ctx.key}|${ctx.level || 0}|${Math.floor(hour)}`);
    const sleep = isSleepHour(hour), meal = MEAL(hour);
    const H = room._homeSpots || [];
    const order = sleep ? ['bed', 'table', 'cook', 'work'] : meal ? ['table', 'cook', 'work', 'bed']
      : (hour < 9 || hour >= 17) ? ['cook', 'table', 'work', 'bed'] : ['work', 'table', 'cook', 'bed'];
    const stand = [];
    for (const z of order) for (const sp of H) if (sp.zone === z) stand.push([sp.tx, sp.ty, sp.facing]);
    stand.push(...stand.map(([x, y, f]) => [x + 1, y, f]), [Math.floor(room.w / 2), room.h - 3, 'north']);
    const seatFree = seats.slice(), bedFree = beds.filter(bd => bd.cell >= 0);
    const tally = { lying: 0, seated: 0, standing: 0 };
    let si = 0;
    for (const p of people) {
      const look = residentLook(p, ctx.klass, ctx.key);
      const def = { name: p.name, cityLife: 'resident', resident: p, household: hh.surname, look };
      let n = null;
      if (sleep && bedFree.length && lyingKey(look)) {
        const bd = bedFree.shift();
        n = this._h422Pose(room, look, 'lying', bd, { ...def, asleep: true });
        if (n) tally.lying++;
      }
      const wantSeat = !n && seatFree.length && (meal || (sleep && !bedFree.length) || rng() < 0.45);
      if (!n && wantSeat) {
        const st = seatFree.shift();
        n = this._h422Pose(room, look, 'seated', st, def);
        if (n) tally.seated++;
      }
      while (!n && si < stand.length) {
        const [tx, ty, f] = stand[si++];
        n = this._clRoomPerson(room, tx, ty, look, 0, f || 'south', def);
        if (n) tally.standing++;
      }
    }
    room._clHousehold = { surname: hh.surname, home: people.length, of: hh.people.length };
    this._clHomeCensus = room._clHousehold;
    room._h422People = tally;
    return tally;
  },
};
