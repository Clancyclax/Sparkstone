// ===========================================================================
// ROUND 403 -- INSIDE WALLS FOR HOUSES.
//
// The user: "Need to further work on setting up rooms for NPC houses that look like a real room ... Feel free to add a
// wall or 2 to better break up the space for interiors. Isometric interior walls can be the wall objects already made
// but sliced or squished to about 10% of their previous depth."
//
// A layout may declare `walls: [{ dir: 'north' | 'west', tx, ty, len }]`:
//   north  a run along the NORTH edge of tiles (tx .. tx+len-1, ty): it divides row ty-1 from row ty.
//   west   a run along the WEST edge of tiles (tx, ty .. ty+len-1): it divides column tx-1 from column tx.
// Each tile wears the room's own kit wall piece (`wallNorth` / `wallWest`), THINNED: the front face is kept, the top
// is cut to a two-pixel cap and the end face to a sliver -- the "10% of the depth" -- made once per kit material
// (`_thinKitTex`). Collision is two small discs a tile along the line, so the wall seals without stealing the floor
// tiles beside it. A wall stands in the room, so the player can walk behind one: it fades while they do.
// ===========================================================================
import { KIT_TEX, KIT_PIECE_BY_KEY, KIT_FOOT_X, KIT_FOOT_Y, KIT_SCALE, KIT_CELL_W, KIT_CELL_H, KIT_COLS, kitForRoom } from '../data/buildingKits.js';
import { roomTileCentre } from '../data/interiors.js';
import { TILE, isoProject, isoDepth } from '../data/iso.js';

/** The kit cell's geometry (measured on every material's wall piece): the front face of a north (x-run) wall spans
 *  columns 58..106 with its top edge at y = 38 + (x - 76) / 2; its end face runs 106..124. A west wall is the mirror
 *  (x -> 153 - x). */
const FACE_X0 = 58, FACE_X1 = 106, END_X1 = 109, MIRROR = 153;
const faceTop = (xm) => (xm <= FACE_X1 ? 38 + (xm - 76) * 0.5 : 52 - (xm - FACE_X1) * 0.5);
const THIN_PIECES = { 1: false, 2: true };   // idx -> is a west piece
export const PARTITION_DISC_R = 3;
/** ROUND 421 -- where the thin wall's face stands, in tiles in from its tile edge (measured: 18 kit px of 48). */
export const PARTITION_FACE_IN = 0.375;
/** ...and the crop (kit cell px) that ends a run at the outer wall's face: the first 18px past the corner vertex. */
export const PARTITION_CUT_WEST = 77 - 18, PARTITION_CUT_NORTH = 77 + 18;
const FADE_ALPHA = 0.32, FADE_REACH = TILE * 3.2;

/** Thin one kit cell's RGBA bytes in place: keep the front face, a 2px cap, a 3px end sliver. Pure, for the test. */
export function thinKitCell(data, w, h, west) {
  const out = new Uint8ClampedArray(data.length);
  const at = (x, y) => (y * w + x) * 4;
  for (let x = 0; x < w; x++) {
    const xm = west ? MIRROR - x : x;
    if (xm < FACE_X0 || xm > END_X1) continue;
    const yt = Math.round(faceTop(xm));
    for (let y = Math.max(0, yt); y < h; y++) {
      const i = at(x, y);
      if (data[i + 3] > 0) { out[i] = data[i]; out[i + 1] = data[i + 1]; out[i + 2] = data[i + 2]; out[i + 3] = data[i + 3]; }
    }
    if (xm <= FACE_X1 && yt >= 7 && yt + 1 < h && data[at(x, yt) + 3] > 0 && data[at(x, yt + 1) + 3] > 0) {
      let c = at(x, yt - 5);
      if (data[c + 3] === 0) c = at(x, yt);
      for (const y of [yt - 2, yt - 1]) { const i = at(x, y); out[i] = data[c]; out[i + 1] = data[c + 1]; out[i + 2] = data[c + 2]; out[i + 3] = data[c + 3]; }
    }
  }
  data.set(out);
  return data;
}

export const HouseInteriorMixin = {
  /** The thinned copy of a kit sheet (its two wall pieces; the other cells are left as they are). */
  _thinKitTex(texKey) {
    const key = `${texKey}_thin`;
    if (this.textures.exists(key)) return key;
    if (!this.textures.exists(texKey)) return null;
    try {
      const src = this.textures.get(texKey).getSourceImage();
      const cnv = document.createElement('canvas');
      cnv.width = src.width; cnv.height = src.height;
      const g = cnv.getContext('2d', { willReadFrequently: true });
      g.drawImage(src, 0, 0);
      for (const [idx, west] of Object.entries(THIN_PIECES)) {
        const i = +idx, x0 = (i % KIT_COLS) * KIT_CELL_W, y0 = Math.floor(i / KIT_COLS) * KIT_CELL_H;
        const img = g.getImageData(x0, y0, KIT_CELL_W, KIT_CELL_H);
        thinKitCell(img.data, KIT_CELL_W, KIT_CELL_H, west);
        g.putImageData(img, x0, y0);
      }
      this._registerRecoloredSpritesheet(key, cnv, KIT_CELL_W, KIT_CELL_H);
    } catch (e) {
      console.warn('[house] thin wall failed', e && e.message);
      return null;
    }
    return key;
  },

  /** Stand a room's inside walls (`room.partitions`). Called from `_buildRoomContents`. */
  _buildPartitions(room) {
    const runs = room.partitions;
    if (!runs || !runs.length) return;
    const base = KIT_TEX[kitForRoom(room)] || KIT_TEX.greybrick;
    const tex = this._thinKitTex(base) || base;
    const list = this._partitions || (this._partitions = []);
    for (const run of runs) {
      const west = run.dir === 'west';
      const def = KIT_PIECE_BY_KEY[west ? 'wallWest' : 'wallNorth'];
      const sprites = [];
      for (let k = 0; k < (run.len || 1); k++) {
        if ((run.gap || []).includes(k)) continue;   // a doorway in the run
        const tx = west ? run.tx : run.tx + k, ty = west ? run.ty + k : run.ty;
        const at = roomTileCentre(room, tx, ty);
        const ex = at.x - (west ? TILE / 2 : 0), ey = at.y - (west ? 0 : TILE / 2);
        // ROUND 421 -- "ensure that the walls are lined up with the exterior walls where they meet". The kit's wall is
        // a slab standing on the INSIDE strip of its tile edge, and the thin copy keeps that slab's front face -- which
        // is PARTITION_FACE_IN of a tile in from the edge. Measured off the sheet: the face's base runs 18px below the
        // edge, i.e. 0.375 of a tile. So a run's every piece is drawn that much back toward its own line: the thin face
        // then lies ON the line, a west run and a north run meet at the corner they share, and a run that starts on
        // the back wall is cut where it meets that wall's face (`PARTITION_FACE_IN` into the floor) instead of
        // standing through it.
        const sx = at.x - (west ? PARTITION_FACE_IN * TILE : 0), sy = at.y - (west ? 0 : PARTITION_FACE_IN * TILE);
        const p = isoProject(sx, sy);
        const s = this.add.image(p.x, p.y, tex, def.idx);
        s.setOrigin(KIT_FOOT_X, KIT_FOOT_Y);
        s.setScale(KIT_SCALE);
        if (k === 0 && west && run.ty === 0) s.setCrop(0, 0, PARTITION_CUT_WEST, KIT_CELL_H);
        if (k === 0 && !west && run.tx === 0) s.setCrop(PARTITION_CUT_NORTH, 0, KIT_CELL_W - PARTITION_CUT_NORTH, KIT_CELL_H);
        s.setDepth(isoDepth(ex, ey));
        this.interiorSprites.push(this._tagRoom(s, room));
        sprites.push(s);
        for (const f of [-0.25, 0.25]) {
          this.interiorSolids.push({ room: room.id, x: ex + (west ? 0 : f * TILE), y: ey + (west ? f * TILE : 0), radius: PARTITION_DISC_R });
        }
      }
      // the line, for the fade: a north run at y = line covering x in [a0, a1]; a west run at x = line, y in [a0, a1]
      const c0 = roomTileCentre(room, run.tx, run.ty);
      const line = west ? c0.x - TILE / 2 : c0.y - TILE / 2;
      const a0 = (west ? c0.y : c0.x) - TILE / 2, a1 = a0 + (run.len || 1) * TILE;
      list.push({ room: room.id, west, line, a0, a1, sprites });
    }
    this._partitionsBuilt = (this._partitionsBuilt || 0) + runs.length;
  },

  /** Every frame inside: a wall the player is standing behind fades, so they are never lost behind it. */
  _partitionFadeTick() {
    const list = this._partitions;
    if (!list || !list.length) return;
    const room = this._insideRoom;
    const px = this.world.x, py = this.world.y;
    let keep = false;
    for (const P of list) {
      if (!P.sprites.length || !P.sprites[0].scene) { P.dead = true; continue; }
      keep = true;
      let behind = false;
      if (room && room.id === P.room) {
        const along = P.west ? py : px, across = P.west ? px : py;
        // behind = on the far side of the line from the camera (smaller x for a west run, smaller y for a north run)
        behind = along > P.a0 - TILE && along < P.a1 + TILE && across < P.line && across > P.line - FADE_REACH;
      }
      const a = behind ? FADE_ALPHA : 1;
      for (const s of P.sprites) if (s.alpha !== a) s.setAlpha(a);
    }
    if (list.some(P => P.dead)) this._partitions = list.filter(P => !P.dead);
    void keep;
  },
};
