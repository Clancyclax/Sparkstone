// ===========================================================================
// ROUND 388 -- NEVER PUT DOWN INSIDE SOMETHING.
//
//   "Stuck in the bed on wakeup after Olb's sacrifice."
//
// A scripted placement -- a wake, a teleport, an arrival in a room -- writes `world.x/y` directly, and nothing asked
// whether the spot was free. `_tryMove` refuses every step that ends inside a collider, so a body put down INSIDE one
// cannot leave it: every direction is "blocked". The bed was one case; this is the net under all of them.
//
// `_unstickPlayer` is called by `teleportTo` and `_restoreRoomView` (the two doors every scripted move goes through)
// and does nothing unless the player is actually standing in collision. Then it moves them to the nearest free spot:
// rings outward a few pixels at a time, never onto water, and -- inside a room -- never out past the room's own floor
// or onto a void tile, so the nearest "free" spot is never the empty district on the far side of a wall.
// ===========================================================================

import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { TILE_VOID } from '../data/interiors.js';

/** The radius the player's own step (`_tryMove`) tests with. */
export const SAFE_PLAYER_RADIUS = 12;
/** How far the search goes before giving up, in tiles. */
export const SAFE_SEARCH_TILES = 8;
/** The step between rings, in world units. */
export const SAFE_RING_STEP = 6;

export const SafePlaceMixin = {
  /** Could a body of radius `r` stand at (x, y)? Collision, water, and inside a room its floor. */
  _spotFree(x, y, r = SAFE_PLAYER_RADIUS, room = null) {
    if (this._collidesObstacle && this._collidesObstacle(x, y, r)) return false;
    if (this._isWaterAt && this._isWaterAt(x, y)) return false;
    if (room && room.w > 0 && room.h > 0 && room.x != null && room.y != null) {
      if (x < room.x || y < room.y || x > room.x + room.w * TILE || y > room.y + room.h * TILE) return false;
      if (this._getTile && this.tileType && this._getTile(Math.floor(x / TILE), Math.floor(y / TILE)) === TILE_VOID) return false;
    }
    return true;
  },

  /** The nearest free spot to (x, y): `{x, y, moved}`, or null when nothing within reach is free. */
  _freeSpotNear(x, y, r = SAFE_PLAYER_RADIUS, room = null, maxTiles = SAFE_SEARCH_TILES) {
    if (this._spotFree(x, y, r, room)) return { x, y, moved: false };
    for (let d = SAFE_RING_STEP; d <= maxTiles * TILE; d += SAFE_RING_STEP) {
      const n = Math.max(8, Math.round((Math.PI * 2 * d) / 10));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
        if (this._spotFree(nx, ny, r, room)) return { x: nx, y: ny, moved: true };
      }
    }
    return null;
  },

  /** If the player is standing inside collision, put them on the nearest free spot. True when they were moved. */
  _unstickPlayer(why = '') {
    const w = this.world;
    if (!w || !Number.isFinite(w.x) || !Number.isFinite(w.y)) return false;
    // nothing to do unless they are actually inside something
    if (this._collidesObstacle && !this._collidesObstacle(w.x, w.y, SAFE_PLAYER_RADIUS)) return false;
    const room = this._insideRoom || null;
    const f = this._freeSpotNear(w.x, w.y, SAFE_PLAYER_RADIUS, room) || (room ? this._freeSpotNear(w.x, w.y, SAFE_PLAYER_RADIUS, null) : null);
    if (!f || !f.moved) return false;
    (this._unstuck = this._unstuck || []).push({ why, from: { x: w.x, y: w.y }, to: { x: f.x, y: f.y } });
    if (this._unstuck.length > 20) this._unstuck.shift();
    w.x = f.x; w.y = f.y;
    if (this.playerSprite && this.playerSprite.setPosition) {
      const p = isoProject(w.x, w.y);
      this.playerSprite.setPosition(p.x, p.y);
      if (this.playerSprite.setDepth) this.playerSprite.setDepth(isoDepth(w.x, w.y));
    }
    return true;
  },
};
