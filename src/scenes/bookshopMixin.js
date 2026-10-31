// ===========================================================================
// ROUND 404 -- BOOKSHOPS, BOOKSHELVES AND SIGNPOSTS (the user's library / town props).
//
//   "Also no more libraries, those become bookshops."
//   1. Bookshelves (80x80), facing south-west or south-east (a south-west design is mirrored for south-east): in the
//      bookshops and the Magic Society halls, the facing matching the wall the shelf stands against. Collision: a
//      rectangle covering the shelf's footprint.
//   2. Bookshop signs (96x64), the shop's name lettered on: one per bookshop beside its door. The hanging ones
//      (bracket / beam) sit against the shop wall; the post ones stand freely.
//   3. Direction signposts at town crossroads and junctions: for each destination in that town, the file whose arrow
//      is the nearest of the six screen directions to the bearing from the sign to that destination. One design per
//      town: oak in villages and rough towns, painted (iron post) in cities. Small rectangle collision on the post.
//
// Everything is placed by its FOOT (library_props.json). Cadence's library is a bookshop now; every other city (and
// Little Gale) gets one in a shop-fronted house near its middle.
// ===========================================================================
import { LIB_DIR, LIB_SHELVES, LIB_BOOKSHOP_SIGNS, LIB_ARROWS, LIB_ARROW_BLANKS, LIB_POSTS } from '../data/libraryProps.js';
import { REGIONS } from '../data/regions.js';
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { isCarriagewayTile, isWaterTile } from '../data/town.js';
import { stableHash } from '../data/awakening.js';

const texKey = (file) => `lib_${file.replace(/\.png$/, '').replace(/[\/]/g, '_')}`;
/** The scale every prop here is drawn at (their art is already at the world's pixel size). */
export const SHELF_SCALE = 1.0, SIGN_SCALE = 1.0;
/** A shelf's footprint against its wall, in tiles: along the wall, and out from it. */
export const SHELF_ALONG = 1.45, SHELF_DEEP = 0.62;
/** The shelf designs, and which way each faces as drawn. */
export const SHELF_IDS = Object.keys(LIB_SHELVES);
/** Hanging signs (bracket / beam / chain / plaque) go on the shop's wall; the rest stand on their own post. */
export const BOOKSHOP_SIGN_HANGS = { cracked_binding: true, dog_eared_page: true, folio_fable: true, gilded_spine: true, marginalia: true, vellum_vine: true,
  bookworms_nook: false, inkwell_quill: false, last_chapter: false, turning_leaf: false };
/** A hung sign's foot is lifted up the wall by this (screen px), so its bracket is above a head. */
export const SIGN_HANG_LIFT = 34;
/** The six arrow directions as SCREEN angles (y down; diagonals on the 2:1 slant). */
export const ARROW_DIRS = {
  east: 0, southeast: Math.atan2(1, 2), southwest: Math.PI - Math.atan2(1, 2),
  west: Math.PI, northwest: -Math.PI + Math.atan2(1, 2), northeast: -Math.atan2(1, 2),
};
/** The nearest of the six to a screen-space bearing (dx, dy). Pure, for the test. */
export function arrowDirFor(dx, dy) {
  const a = Math.atan2(dy, dx);
  let best = 'east', bd = Infinity;
  for (const [k, v] of Object.entries(ARROW_DIRS)) {
    let d = Math.abs(a - v); if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
/** The arrow file for a design, direction and destination. */
export function arrowKeyFor(design, dir, dest) { return `${design}_${dir}_${dest}`; }
/** Destinations a sign can name. "library" is not used: there are no libraries any more (the user, round 404). */
export const SIGN_DESTS = ['adventurer_society', 'auction_house', 'magic_society', 'inn', 'stable', 'temple_district'];
/** A post's collision rectangle (world px). */
export const POST_W = 8, POST_H = 8;

export const BookshopMixin = {
  _preloadLibraryProps() {
    const files = [
      ...Object.values(LIB_SHELVES), ...Object.values(LIB_BOOKSHOP_SIGNS), ...Object.values(LIB_ARROWS),
      ...Object.values(LIB_ARROW_BLANKS), ...Object.values(LIB_POSTS),
    ].map(v => v.file);
    for (const f of files) this.load.image(texKey(f), `${LIB_DIR}${f}`);
  },

  // ------------------------------------------------------------------ shelves
  /** Stand `room.shelves` ({ wall: 'north'|'west', at, design }) against the room's walls. */
  _buildShelves(room) {
    for (const s of room.shelves || []) {
      const def = LIB_SHELVES[s.design] || LIB_SHELVES[SHELF_IDS[0]];
      const key = texKey(def.file);
      if (!this.textures.exists(key)) continue;
      const want = s.wall === 'west' ? 'southeast' : 'southwest';
      const flip = def.facing !== want;
      // the foot stands one shelf-depth's half out from the wall's inner face (tile 1 is the first row off the wall)
      const along = s.at, off = 0.5 + SHELF_DEEP / 2;
      const tx = s.wall === 'west' ? off : along, ty = s.wall === 'west' ? along : off;
      const wx = room.x + tx * TILE, wy = room.y + ty * TILE;
      const p = isoProject(wx, wy);
      const fx = flip ? def.w - def.foot[0] : def.foot[0];
      const sp = this.add.image(p.x, p.y, key).setOrigin(fx / def.w, def.foot[1] / def.h).setScale(SHELF_SCALE).setFlipX(flip)
        .setDepth(isoDepth(wx, wy));
      if (this._tagRoom) this._tagRoom(sp, room);
      (this.interiorSprites = this.interiorSprites || []).push(sp);
      const hw = (s.wall === 'west' ? SHELF_DEEP : SHELF_ALONG) * TILE / 2, hh = (s.wall === 'west' ? SHELF_ALONG : SHELF_DEEP) * TILE / 2;
      (this.interiorSolids = this.interiorSolids || []).push({ room: room.id, x: wx, y: wy, hw, hh, shelf: true });
    }
  },

  // ------------------------------------------------------------------ bookshops
  /** The bookshops: Cadence's old library, and a shop-fronted house near the middle of every other city and town. */
  _placeBookshops() {
    const names = Object.keys(LIB_BOOKSHOP_SIGNS);
    const used = new Set();
    const pickName = (seed) => {
      let i = stableHash(`bookshop|${seed}`) % names.length;
      for (let k = 0; k < names.length && used.has(names[i]); k++) i = (i + 1) % names.length;
      used.add(names[i]);
      return names[i];
    };
    const shops = (this._bookshops = []);
    const doorOf = (b) => (this.doorways || []).find(d => d.kind === 'enter' && d.building === b);
    // Cadence: the library, renamed
    const lib = this._clSites && this._clSites.library;
    if (lib) {
      const id = pickName('nek_city');
      lib.bookshop = { id, name: LIB_BOOKSHOP_SIGNS[id].name, settlement: 'nek_city' };
      const d = doorOf(lib);
      if (d) d.label = `enter ${LIB_BOOKSHOP_SIGNS[id].name}`;
      shops.push(lib);
    }
    for (const region of REGIONS) {
      for (const st of region.settlements || []) {
        if (st.bandit || st.id === 'nek_city' || !(st.kind === 'city' || st.kind === 'town')) continue;
        const c = st._centre; if (!c) continue;
        const rad = this._settlementExtentTiles(st) * TILE;
        let best = null, bd = Infinity;
        for (const b of this.buildings || []) {
          if (!b || !b.house || !b.sprite || b.singleton || b.bookshop || b.clSite || b.r400 || b.estate) continue;
          if ((this._homeSigns || []).some(h => h.b === b)) continue;     // for sale or to let: not a shop
          const dd = Math.hypot(b.x - c.x, b.y - c.y);
          if (dd > rad) continue;
          const row = b.sprite.texture && b.sprite.texture.key === 'townPool' ? Math.floor(Number(b.sprite.frame.name) / 8) : -1;
          const shopFront = row >= 12 && row <= 16;
          const d = doorOf(b);
          if (!d) continue;
          const score = dd * (shopFront ? 0.6 : 1);
          if (score < bd) { bd = score; best = b; }
        }
        if (!best) continue;
        const id = pickName(st.id);
        best.bookshop = { id, name: LIB_BOOKSHOP_SIGNS[id].name, settlement: st.id };
        const d = doorOf(best);
        if (d) d.enterLabel = d.label = `enter ${LIB_BOOKSHOP_SIGNS[id].name}`;
        shops.push(best);
      }
    }
    for (const b of shops) this._hangBookshopSign(b, doorOf(b));
    return shops.length;
  },

  /** Its sign beside its door: a hanging one against the wall, a post one standing free a step out. */
  _hangBookshopSign(b, d) {
    if (!b || !b.bookshop || !d) return null;
    const id = b.bookshop.id, def = LIB_BOOKSHOP_SIGNS[id];
    const hangs = !!BOOKSHOP_SIGN_HANGS[id];
    const ux = d.x - b.x, uy = d.y - b.y, ul = Math.hypot(ux, uy) || 1;
    const px = -uy / ul, py = ux / ul;
    // the wall: walk in from the doorstep toward the building until its footprint is met
    let wallIn = 0;
    for (let t = 0; t <= 160; t += 4) {
      if (this._collidesObstacle(d.x - ux / ul * t, d.y - uy / ul * t, 2)) { wallIn = t; break; }
    }
    const out = hangs ? -(wallIn - 3) : 22;   // a hung sign sits on the wall; a post stands a step out in front of the door
    for (const side of [1, -1]) {
      for (const along of [52, 70, 40]) {
        const x = d.x + px * along * side + ux / ul * out, y = d.y + py * along * side + uy / ul * out;
        const t = this._tileTypeAt(Math.floor(x / TILE), Math.floor(y / TILE));
        if (isWaterTile(t) || (!hangs && isCarriagewayTile(t))) continue;
        if ((this.cityProps || []).some(o => Math.abs(o.x - x) < 22 && Math.abs(o.y - y) < 22)) continue;
        if (!hangs && this._collidesObstacle(x, y, 6)) continue;
        if (!hangs && (this.doorways || []).some(q => q.kind === 'enter' && Math.hypot(q.x - x, q.y - y) < 44)) continue;   // never on a doorstep
        const rec = {
          x, y, sprite: null, sheet: texKey(def.file), frame: undefined,
          art: { footX: def.foot[0] / def.w, footY: def.foot[1] / def.h, scale: SIGN_SCALE },
          radius: 0, solid: !hangs, cityProp: true, bookshopSign: id, lift: hangs ? SIGN_HANG_LIFT : 0,
        };
        if (!hangs) { rec.postW = POST_W; rec.postH = POST_H; rec.radius = 4; }
        if (this._clFrontBias) rec.depthBias = this._clFrontBias(b, x, y);
        this.cityProps.push(rec);
        b.bookshop.sign = rec;
        return rec;
      }
    }
    return null;
  },

  // ------------------------------------------------------------------ signposts
  /** Where each destination of a town is, by the sign's names for them. */
  _townDestinations(st, inTown) {
    const out = {};
    const centroid = (list) => list.length ? { x: list.reduce((a, o) => a + o.x, 0) / list.length, y: list.reduce((a, o) => a + o.y, 0) / list.length } : null;
    const blds = (this.buildings || []).filter(b => b && b.sprite && inTown(b));
    const sing = (re) => blds.find(b => b.singleton && re.test(b.singleton));
    const doorAt = (b) => { if (!b) return null; const d = (this.doorways || []).find(q => q.kind === 'enter' && q.building === b); return d ? { x: d.x, y: d.y } : { x: b.x, y: b.y }; };
    // Cadence's civic rooms are entered through doors that name the room, not a building
    const roomDoor = (bid) => { const d = (this.doorways || []).find(q => q.kind === 'enter' && q.room && q.room.building === bid && inTown(q)); return d ? { x: d.x, y: d.y } : null; };
    out.adventurer_society = doorAt(sing(/^guild/)) || roomDoor('guild');
    out.auction_house = doorAt(sing(/^auction/)) || roomDoor('auction');
    const mh = (this._r400Magic || []).find(m => inTown(m));
    if (mh) out.magic_society = mh.doorPoint || { x: mh.x, y: mh.y };
    const tav = sing(/^tavern/) || blds.find(b => b.r400Inn || b.inn);
    out.inn = doorAt(tav) || roomDoor('tavern');
    const yard = (this._stables || []).find(y => y.settlement === st.id);
    if (yard) out.stable = { x: (yard.tx0 + yard.w / 2) * TILE, y: (yard.ty0 + yard.h / 2) * TILE };
    out.temple_district = centroid(blds.filter(b => b.temple || (b.singleton && /temple/.test(b.singleton))));
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  },

  /** A town's crossroads: carriageway points where the road runs on in at least three of the four directions. */
  _townJunctions(c, rad) {
    const T = TILE, road = (x, y) => isCarriagewayTile(this._tileTypeAt(Math.floor(x / T), Math.floor(y / T)));
    const runs = (x, y, dx, dy) => { for (let k = 3; k <= 6; k++) if (!road(x + dx * k * T, y + dy * k * T)) return false; return true; };
    const out = [];
    const step = 3 * T;
    for (let y = c.y - rad; y <= c.y + rad; y += step) {
      for (let x = c.x - rad; x <= c.x + rad; x += step) {
        if (Math.hypot(x - c.x, y - c.y) > rad) continue;
        if (!road(x, y)) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => runs(x, y, dx, dy)).length;
        if (n >= 3) out.push({ x, y, n });
      }
    }
    // one per crossroads: the most central sample of each cluster
    const kept = [];
    out.sort((a, b) => b.n - a.n || Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    for (const j of out) if (!kept.some(k => Math.hypot(k.x - j.x, k.y - j.y) < 16 * T)) kept.push(j);
    return kept;
  },

  /** The kerb beside a crossroads: the nearest ground off the road, on one of its four corners. */
  _junctionKerb(j, salt, skip = []) {
    const T = TILE;
    // the corner nearest the camera first (world +x+y is straight down the screen), so no house stands in front of it
    const corners = stableHash(`kerb|${salt}`) % 2 ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    for (let i = 0; i < 4; i++) {
      const [dx, dy] = corners[i];
      if (skip.some(([sx, sy]) => sx === dx && sy === dy)) continue;
      for (let k = 1; k <= 8; k++) {
        const x = j.x + dx * k * T * 0.75, y = j.y + dy * k * T * 0.75;
        const t = this._tileTypeAt(Math.floor(x / T), Math.floor(y / T));
        if (isCarriagewayTile(t) || isWaterTile(t)) continue;
        // just off the paving: a step back toward the road from the first dry tile
        const kx = x - dx * T * 0.25, ky = y - dy * T * 0.25;
        if (this._collidesObstacle(kx, ky, 40)) break;   // not up against a house
        if ((this.cityProps || []).some(o => Math.hypot(o.x - kx, o.y - ky) < 26)) break;
        if ((this.doorways || []).some(q => q.kind === 'enter' && Math.hypot(q.x - kx, q.y - ky) < 60)) break;   // never on a doorstep
        return { x: kx, y: ky, dx, dy };
      }
    }
    return null;
  },

  /** Signposts at each town's crossroads: up to three destinations a corner, the nearest first, one design a town. */
  _placeSignposts() {
    const made = (this._signposts = []);
    const census = (this._signpostCensus = {});
    for (const region of REGIONS) {
      for (const st of region.settlements || []) {
        if (!(st.kind === 'city' || st.kind === 'town' || st.kind === 'village')) continue;
        const c = st._centre; if (!c) continue;
        const cadence = st.id === 'nek_city';
        const rad = cadence && this._clInCadenceXY ? 200 * TILE : this._settlementExtentTiles(st) * TILE;
        const inTown = cadence && this._clInCadenceXY ? (o) => this._clInCadenceXY(o.x, o.y) : (o) => Math.hypot(o.x - c.x, o.y - c.y) < rad + 6 * TILE;
        const dests = this._townDestinations(st, inTown);
        const names = Object.keys(dests);
        if (!names.length) continue;
        const design = (st.kind === 'city' && !st.bandit) ? 'arrow_painted' : 'arrow_oak';
        const juncs = this._townJunctions(cadence ? c : c, Math.min(rad, 220 * TILE));
        const maxJ = st.kind === 'city' && !st.bandit ? 8 : 3;
        let n = 0;
        for (const j of juncs.slice(0, maxJ)) {
          // the destinations worth signing here: not the one standing on top of this corner
          const near = names.map(k => ({ k, d: Math.hypot(dests[k].x - j.x, dests[k].y - j.y) }))
            .filter(e => e.d > 10 * TILE).sort((a, b) => a.d - b.d).slice(0, 3);
          if (!near.length) continue;
          // one post a corner, so no two boards cross: the corners nearest the camera first
          const taken = [];
          near.forEach((e) => {
            const kerb = this._junctionKerb(j, `${st.id}|${Math.round(j.x)}|${Math.round(j.y)}`, taken);
            if (!kerb) return;
            taken.push([kerb.dx, kerb.dy]);
            const sx = kerb.x, sy = kerb.y;
            const t = this._tileTypeAt(Math.floor(sx / TILE), Math.floor(sy / TILE));
            if (isCarriagewayTile(t) || isWaterTile(t) || this._collidesObstacle(sx, sy, 8)) return;
            const a = isoProject(sx, sy), bpt = isoProject(dests[e.k].x, dests[e.k].y);
            const dir = arrowDirFor(bpt.x - a.x, bpt.y - a.y);
            const def = LIB_ARROWS[arrowKeyFor(design, dir, e.k)];
            if (!def) return;
            const rec = {
              x: sx, y: sy, sprite: null, sheet: texKey(def.file), frame: undefined,
              art: { footX: def.foot[0] / def.w, footY: def.foot[1] / def.h, scale: SIGN_SCALE },
              radius: 4, solid: true, postW: POST_W, postH: POST_H, cityProp: true,
              signpost: { dest: e.k, dir, design, town: st.id, to: { x: dests[e.k].x, y: dests[e.k].y } },
            };
            this.cityProps.push(rec);
            made.push(rec);
            census[st.id] = (census[st.id] || 0) + 1;
            n++;
          });
        }
        void n;
      }
    }
    this._staticGrid = null;   // the posts are solid
    return made.length;
  },

  _placeBookshopsAndSigns() {
    const shops = this._placeBookshops();
    const posts = this._placeSignposts();
    return { shops, posts };
  },
};
