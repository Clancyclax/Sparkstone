// ===========================================================================
// ROUND 388 -- ART, NOT SHAPES.
//
//   "Please replace these: the melee swing trail; the expanding ring on about 45 abilities; the chain lightning and
//    drain lines; the 15 other ritual themes; the barrier walls; storm lightning."
//
// The sheets for all of these were already loaded at boot (spellFx.js allFxSheets: fx2, fx3 and the fx5 cuts as
// drawn); the code that wanted them drew a ribbon, a circle or a line instead. These are the general-purpose players
// the call sites use. Every one of them answers null/false when the texture is not there, and the caller keeps its
// old drawn shape for that case, so nothing ever goes blank.
//
//   _sheetKey(family, color)            the loaded key for a family in a colour (a name or a hex), else null
//   _sheetBurst(family, color, wx, wy, o)  one play of a sheet at a world point, then destroyed
//   _sheetBeam(family, color, from, to, o) one play of a beam sheet stretched between two (live) world points
//   _swooshSheet / _ringSheet / _zapSheet  the three WorldScene sites (melee swing, expanding ring, zap lines)
// ===========================================================================
import Phaser from '../../public/vendor/phaser.esm.min.js';
import { isoProject, isoDepth } from '../data/iso.js';
import { fxFamilyInfo, nearestFxColor } from '../data/spellFx.js';
import { damageFxFor } from '../data/damageFx.js';

// The drawn geometry of the sheets these sites use, measured off the art (alpha bboxes, every frame):
const SLASH_ARC = { ox: 50.5 / 96, oy: 42.5 / 96, r: 43, outer: 48 };   // slasha/slashb: a half-moon of radius ~43 round (50.5, 42.5)
// ROUND 389 -- the swoosh is see-through, like the red field under it.
const SWOOSH_ALPHA = 0.55;
const SLASH_THRUST = { len: 34 };                            // slashc: a sliver standing 34px up from the cell's foot
const RING_HALF_W = 58;                                      // hitflash: a flat ring opening to 116x58 (iso 2:1)
const RING_LAST = 21;                                        // ... whose last drawn frame is 21 (22, 23 are empty)

/** A colour name the eleven-colour families are cut in, from a name or a '#rrggbb' / 0xrrggbb. */
export function fxColorName(c) {
  if (typeof c === 'string' && !c.startsWith('#') && !/^[0-9a-f]{6}$/i.test(c)) return c;
  return nearestFxColor(typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : (c || '#ffffff'));
}

export const SheetFxMixin = {
  /** ROUND 388 -- the texture key for `family` in `color`, falling back to the family's own colour when that cut does
   *  not exist; for an fx5 family `color` is a damage type, fetched lazily (the art as drawn stands in meanwhile).
   *  Null when nothing for the family is loaded -- the caller then draws its old shape. */
  _sheetKey(family, color) {
    const info = fxFamilyInfo(family);
    if (!info || !this.textures) return null;
    if (info.fx5) {
      const want = `fx_${family}_${color || 'native'}`;
      if (info.colors.includes(color) && this._wantFx5 && this._wantFx5(want)) return want;
      const nat = `fx_${family}_native`;
      return this.textures.exists(nat) ? nat : null;
    }
    let col = fxColorName(color);
    if (info.colors && !info.colors.includes(col)) col = info.native;
    const key = `fx_${family}_${col}`;
    if (this.textures.exists(key)) return key;
    const nat = `fx_${family}_${info.native}`;
    return this.textures.exists(nat) ? nat : null;
  },

  /**
   * ROUND 388 -- one play of a sheet at a world point. Like olbAstralMixin's _olbFxBurst, with what the replaced
   * shapes needed on top: separate x/y scale (a ground ring is flattened by the iso view), an explicit origin and
   * duration, a grow-in, a fade-out and a last frame (some sheets end on empty cells).
   * o: { key, sx, sy, scale, ox, oy, dx, dy, rot, add, alpha, depth, ms (whole play), delay, fade (0..1 of the play
   *      spent fading), grow (start scale fraction), last (last frame to show) }
   */
  _sheetBurst(family, color, wx, wy, o = {}) {
    const info = fxFamilyInfo(family);
    const key = o.key || this._sheetKey(family, color);
    if (!info || !key) return null;
    const p = isoProject(wx, wy);
    const spr = this.add.sprite(p.x + (o.dx || 0), p.y + (o.dy || 0), key, 0);
    const sx = o.sx != null ? o.sx : (o.scale || 1), sy = o.sy != null ? o.sy : sx;
    if (o.ox != null || o.oy != null) spr.setOrigin(o.ox != null ? o.ox : 0.5, o.oy != null ? o.oy : 0.5);
    else if (info.anchor === 'ground') spr.setOrigin(0.5, 0.94);
    else if (info.anchor === 'flat' && info.oy != null) spr.setOrigin(0.5, info.oy);
    spr.setScale(sx * (o.grow != null ? o.grow : 1), sy * (o.grow != null ? o.grow : 1));
    spr.setDepth(o.depth != null ? o.depth : isoDepth(wx, wy) + 90000);
    if (o.add) spr.setBlendMode(Phaser.BlendModes.ADD);
    if (o.rot) spr.setRotation(o.rot);
    const a0 = o.alpha != null ? o.alpha : 1;
    spr.setAlpha(a0);
    const last = Math.max(0, Math.min((info.frames || 1) - 1, o.last != null ? o.last : (info.frames || 1) - 1));
    const ms = o.ms || (last + 1) * (info.frameMs || 50);
    const fade = o.fade || 0, g0 = o.grow;
    if (o.delay) spr.setVisible(false);
    this.tweens.addCounter({
      from: 0, to: 1, duration: ms, delay: o.delay || 0,
      onStart: () => { if (spr.active) spr.setVisible(true); },
      onUpdate: (tw) => {
        if (!spr.active) return;
        const t = tw.getValue();
        spr.setFrame(Math.min(last, Math.floor(t * (last + 1))));
        if (g0 != null) { const k = g0 + (1 - g0) * (1 - (1 - t) * (1 - t)); spr.setScale(sx * k, sy * k); }
        if (fade > 0 && t > 1 - fade) spr.setAlpha(a0 * Math.max(0, (1 - t) / fade));
      },
      onComplete: () => { if (spr.active) spr.destroy(); },
    });
    return spr;
  },

  /**
   * ROUND 388 -- one play of a BEAM sheet (fx5 beamthin/beammid, fx3 drainbeam/flamethrower: drawn lying along +x
   * from bx0 to bx1) stretched between two world points, re-aimed every step while it plays. `from`/`to` are
   * {x, y} or functions returning one (a live body), same as _aimBeamFx. o: { fromLift, toLift, thick, add, alpha, ms }
   */
  _sheetBeam(family, color, from, to, o = {}) {
    const info = fxFamilyInfo(family);
    const key = o.key || this._sheetKey(family, color);
    if (!info || !key || info.bx1 == null) return null;
    const read = (v) => (typeof v === 'function' ? v() : v);
    const spr = this.add.sprite(0, 0, key, 0).setOrigin(info.bx0 / info.cell, info.oy != null ? info.oy : 0.5);
    if (o.add) spr.setBlendMode(Phaser.BlendModes.ADD);
    const span = Math.max(1, info.bx1 - info.bx0), thick = o.thick || 0.5;
    const a0 = o.alpha != null ? o.alpha : 1;
    const aim = () => {
      const f = read(from), t = read(to);
      if (!f || !t) return false;
      const a = o.fromPx || isoProject(f.x, f.y), c = isoProject(t.x, t.y);   // fromPx: a start already on screen
      const ax = a.x, ay = a.y - (o.fromPx ? 0 : (o.fromLift != null ? o.fromLift : 12));
      const dx = c.x - ax, dy = (c.y - (o.toLift != null ? o.toLift : 12)) - ay;
      spr.setPosition(ax, ay).setRotation(Math.atan2(dy, dx));
      spr.setScale(Math.max(0.05, Math.hypot(dx, dy) / span), dx < 0 ? -thick : thick);   // upright when it points left
      spr.setDepth(isoDepth(Math.max(f.x, t.x), Math.max(f.y, t.y)) + 100000);
      return true;
    };
    if (!aim()) { spr.destroy(); return null; }
    spr.setAlpha(a0);
    const frames = info.frames || 1;
    this.tweens.addCounter({
      from: 0, to: 1, duration: o.ms || frames * (info.frameMs || 50),
      onUpdate: (tw) => {
        if (!spr.active) return;
        const t = tw.getValue();
        if (!aim()) { spr.destroy(); return; }
        spr.setFrame(Math.min(frames - 1, Math.floor(t * frames)));
        if (t > 0.6) spr.setAlpha(a0 * Math.max(0, (1 - t) / 0.4));
      },
      onComplete: () => { if (spr.active) spr.destroy(); },
    });
    return spr;
  },

  /**
   * ROUND 388 -- the melee swing trail as the fx3 slash art. An arc weapon sweeps the half-moon (slasha, then slashb
   * on the next swing, mirrored, so two swings read as a back-and-forth); a thrust (dagger, spear, whip) is the
   * slashc sliver straight out along the aim. Placed and turned in SCREEN space from the projected reach point, so
   * the iso view's foreshortening is in it: the moon's radius, or the sliver's length, is the screen distance from
   * the hand to where the blade reaches. Coloured by the weapon's own colour. False (draw the ribbon) when unloaded.
   */
  _swooshSheet(realWeapon, zone, range, angle, spec) {
    const thrust = spec && spec.kind === 'thrust';
    const n = this._swooshes || 0;
    const family = thrust ? 'slashc' : (n % 2 ? 'slashb' : 'slasha');
    let col = fxColorName((realWeapon && realWeapon.color) || '#cfd8dc');
    if (col === 'black') col = 'grey';   // a black trail on a dark floor is no trail
    const key = this._sheetKey(family, col);
    if (!key) return false;
    const w = this.world;
    const reach = range * ((spec && spec.reach) || 1);
    const p0 = isoProject(w.x, w.y), p1 = isoProject(w.x + Math.cos(angle) * reach, w.y + Math.sin(angle) * reach);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.max(8, Math.hypot(dx, dy)), rot = Math.atan2(dy, dx);
    const life = Math.max(200, Math.round(((spec && spec.life) || 0.22) * 1000 * 1.4));
    const depth = isoDepth(w.x, w.y) + 90001;
    if (thrust) {
      const s = Math.max(0.6, Math.min(5, d / SLASH_THRUST.len));
      return !!this._sheetBurst(family, col, w.x, w.y, { key, ox: 0.5, oy: 1, dy: -18, sx: 2.2, sy: s,
        rot: rot + Math.PI / 2, depth, ms: life, fade: 0.3, alpha: 0.95 });
    }
    // ROUND 389 -- "not lined up with the weapon swing... facing south and attacking with a sword but getting a full
    // 360 swing. The animation should line up with the red arc on the ground. The swoosh should be semi transparent
    // and larger to match the edge of the red arc." The slash art is a ~300-degree crescent, so drawn upright it read
    // as a whole circle round the body. It now LIES ON THE GROUND like the red field: the crescent is cut to the
    // swing's own arc (a canvas copy per sheet and arc, `_slashSectorKey`), turned to the aim in world space and then
    // flattened by the iso projection (a container: rotate by aim + 45 degrees, scale sqrt2 x sqrt2/2, which is
    // exactly isoProject's matrix), with the crescent's outer edge on the red field's edge (the weapon's range).
    const arcDeg = Math.max(20, Math.min(360, (zone && zone.arc) || 90));
    const cut = this._slashSectorKey(key, arcDeg);
    if (!cut) return false;
    const p = isoProject(w.x, w.y);
    const k = range / SLASH_ARC.outer;                       // art px -> world units, outer edge on the range
    const box = this.add.container(p.x, p.y);
    const spr = this.add.sprite(0, 0, cut, 0).setOrigin(SLASH_ARC.ox, SLASH_ARC.oy);
    spr.setRotation(angle + Math.PI / 4);
    if (n % 2) spr.setFlipY(true);                           // every other swing sweeps the other way
    box.add(spr);
    box.setScale(k * Math.SQRT2, k * Math.SQRT2 / 2);
    box.setDepth(depth);
    const a0 = SWOOSH_ALPHA;
    box.setAlpha(a0);
    const info = fxFamilyInfo(family);
    const last = Math.max(0, (info && info.frames ? info.frames : 9) - 2);   // the last cell is empty
    this.tweens.addCounter({
      from: 0, to: 1, duration: life,
      onUpdate: (tw) => {
        if (!spr.active) return;
        const t = tw.getValue();
        spr.setFrame(Math.min(last, Math.floor(t * (last + 1))));
        if (t > 0.7) box.setAlpha(a0 * Math.max(0, (1 - t) / 0.3));
      },
      onComplete: () => { if (box.active) box.destroy(); },
    });
    return true;
  },

  /** ROUND 389 -- a copy of a slash sheet with every cell cut to a sector of `arcDeg` degrees round the crescent's
   *  centre, pointing along +x (the aim, before the container turns it). Made once per sheet and arc (rounded to 10
   *  degrees) on a canvas; null if the source cannot be read. 360 is the sheet itself. */
  _slashSectorKey(srcKey, arcDeg) {
    const arc = Math.round(arcDeg / 10) * 10;
    if (arc >= 360) return srcKey;
    const key = `${srcKey}_arc${arc}`;
    if (this.textures.exists(key)) return key;
    const src = this.textures.get(srcKey);
    const img = src && src.getSourceImage && src.getSourceImage();
    if (!img || !img.width) return null;
    const cell = 96, n = Math.floor(img.width / cell);
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    const half = ((arc + 8) * Math.PI) / 360;                 // a few degrees past the field, so the edge is not clipped
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const cx = i * cell + SLASH_ARC.ox * cell, cy = SLASH_ARC.oy * cell;
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, cell * 1.5, -half, half);
      ctx.closePath();
    }
    ctx.fill();
    const tex = this.textures.addCanvas(key, cv);
    if (!tex) return null;
    for (let i = 0; i < n; i++) tex.add(i, 0, i * cell, 0, cell, cell);
    return key;
  },

  /**
   * ROUND 388 -- the expanding ring as the fx3 `hitflash` sheet, which IS a ring opening flat on the ground (drawn
   * 2:1, the iso ground's own squash). Sized to the true footprint of a world circle of radius `range`: on the iso
   * screen that is an ellipse range*sqrt(2) to each side and half that up and down, so the ring's edge lands where
   * the ability actually reaches. One play, then destroyed. False (draw the circle) when unloaded.
   */
  _ringSheet(wx, wy, range, colorHex) {
    const col = fxColorName(colorHex || '#ffffff');
    const key = this._sheetKey('hitflash', col);
    if (!key) return false;
    const s = Math.max(0.3, (Math.max(8, range || 0) * Math.SQRT2) / RING_HALF_W);
    return !!this._sheetBurst('hitflash', col, wx, wy, { key, ox: 0.5, oy: 0.5, scale: s, add: col !== 'black',
      depth: isoDepth(wx, wy) + 100000, ms: 420, last: RING_LAST, fade: 0.35 });
  },

  /**
   * ROUND 388 -- a zap (a chain's leap, a turret's or familiar's shot, a drain, a taunt's pull) as a beam sheet
   * between two bodies. kind 'bolt': the fx5 thin beam in the damage type's own cut (lightning when the hop names
   * none -- it is fetched lazily and the art as drawn stands in); kind 'drain': the fx3 drain beam in the colour.
   * from/to: { x, y } world (or functions). o: { fromLift, toLift, ms, type }. False (draw the line) when unloaded.
   */
  _zapSheet(kind, colorHex, from, to, o = {}) {
    if (kind === 'drain') {
      return !!this._sheetBeam('drainbeam', fxColorName(colorHex || '#c62828'), from, to,
        { fromLift: o.fromLift, toLift: o.toLift, thick: o.thick || 0.6, ms: o.ms || 450, alpha: 0.95 });
    }
    let type = o.type;
    if (!type) type = colorHex ? damageFxFor({ color: colorHex }) : 'lightning';
    return !!this._sheetBeam('beamthin', type, from, to,
      { fromLift: o.fromLift, toLift: o.toLift, fromPx: o.fromPx, thick: o.thick || 0.35, ms: o.ms || 260, add: true });
  },
};
