// Shared isometric-projection math, ported 1:1 from sparkstone_prototype.html
// (see ISO_TW/ISO_TH/isoProject/isoUnproject/facingFromMove there). Keeping
// this identical is deliberate: every gameplay system stays in plain square
// "world" coordinates (movement, collision, distances, AI) and ONLY this
// module's isoProject() is used to figure out where something should be
// drawn. That's the exact split the original engine used, and it's why the
// migration doesn't have to re-derive any gameplay math -- only re-plumb it
// through Phaser GameObjects instead of raw canvas draws.
//
// IMPORTANT DIFFERENCE FROM THE ORIGINAL: in the original, isoProject()
// output went through a *manual* `camera.x/y` subtraction (worldToScreen)
// before hitting canvas draw calls. Here, isoProject() output is used
// directly as a Phaser GameObject's x/y -- i.e. "iso-space" IS this scene's
// coordinate space -- and Phaser's own Camera (scrollX/scrollY, startFollow)
// plays the role `camera.x/y` used to play. That's the one deliberate
// re-plumbing; the math itself is untouched.

export const TILE = 32; // world units per tile, matches the original
export const ISO_TW = 64, ISO_TH = 32; // on-screen diamond footprint of one TILE

export function isoProject(wx, wy) {
  const gx = wx / TILE, gy = wy / TILE;
  return { x: (gx - gy) * (ISO_TW / 2), y: (gx + gy) * (ISO_TH / 2) };
}

export function isoUnproject(ix, iy) {
  const gx = ix / ISO_TW + iy / ISO_TH;
  const gy = iy / ISO_TH - ix / ISO_TW;
  return { x: gx * TILE, y: gy * TILE };
}

// Painter's-algorithm depth key: anything "further along +X and +Y" (deeper
// into the screen under this projection) must draw on top. This is the same
// `d = o.x + o.y` sort key the original render() used across every obstacle/
// monster/NPC/pickup -- ported here as a depth value fed to setDepth().
export function isoDepth(wx, wy) {
  return wx + wy;
}

export const PLAYER_DIR_ORDER = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];

// Re-projects a world-space movement vector through the same iso weighting
// before snapping to one of 8 screen-facing octants. This is the pattern
// every directional sprite in the original used (facingFromMove) -- and the
// pattern the building-facing bug (Phase 3 fix) skipped.
export function facingFromMove(mx, my) {
  if (mx === 0 && my === 0) return null;
  const sdx = (mx - my) * (ISO_TW / 2), sdy = (mx + my) * (ISO_TH / 2);
  let idx = Math.round(Math.atan2(sdy, sdx) / (Math.PI / 4));
  idx = ((idx % 8) + 8) % 8;
  return PLAYER_DIR_ORDER[idx];
}

// ROUND 50 -- the inverse of facingFromMove: given one of the eight screen
// octants, the WORLD direction that projects onto it.
//
// Needed because a building knows which way it faces long before anything
// asks where its front door is. Deriving the doorstep from the road search
// instead was what put every door in Cadence on the wrong wall (see
// isCarriagewayTile in town.js) -- and even with that search fixed, a
// building whose facing was chosen by hand (the temples face northwest
// because the user said so, not because a road is there) should hang its
// door off the face it actually presents.
//
// Unit vector in world space, so callers scale it by their own setback.
export function moveFromFacing(facing) {
  const idx = PLAYER_DIR_ORDER.indexOf(facing);
  if (idx < 0) return null;
  const th = (idx * Math.PI) / 4;
  const sdx = Math.cos(th), sdy = Math.sin(th);
  // Undo isoProject: sdx = (mx - my) * ISO_TW/2, sdy = (mx + my) * ISO_TH/2.
  const a = sdx / (ISO_TW / 2), b = sdy / (ISO_TH / 2);
  const mx = (a + b) / 2, my = (b - a) / 2;
  const len = Math.hypot(mx, my) || 1;
  return { dx: mx / len, dy: my / len };
}

// Deterministic per-tile variant hash, ported byte-for-byte from
// tileVariantHash() in the original -- picks which of the 16 grass/path/
// street tile variants a given (tx,ty) grid cell uses, stable across frames
// and reloads (no per-tile storage needed, just re-derived from position).
export function tileVariantHash(tx, ty) {
  let h = (tx * 928371 + ty * 123457) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}
