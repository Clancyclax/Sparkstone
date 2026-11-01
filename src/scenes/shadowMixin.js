// ===========================================================================
// ROUND 424 -- SHADOWS THE SHAPE OF WHAT CASTS THEM.
//
//   "Clothesline shadow is a generic circle, it should look like the top of the clothes line. Lets do a full pass
//    on object shadows, they should be roughly the size and shape of the objects casting them and move as the sun
//    moves or if the wind moves the object in question (i.e a flag or clothing)."
//
// Round 250/251's ground shadow is one soft ellipse, stretched along the sun: right under a person's feet, wrong
// under a clothesline, a lamp post, a flag or a tree. An OBJECT's shadow is now its own picture: the frame it is
// drawn with, blacked out and sheared onto the ground along the sun -- every pixel `h` above the object's foot
// lands `h x the sun's length` away from the foot in the sun's direction, so a pole throws a line, a clothesline
// throws its posts, its rope and its washing, and a tree throws its trunk and its crown. As the sun moves the
// shear moves (the shape is re-cut whenever the sun has turned or dropped by a step), and a cloth that the wind is
// moving throws the shadow of the cloth as it is this frame (windSwayMixin.js keeps the warped cloth).
//
// People, monsters and summons keep the ellipse: under a moving figure the soft spot at the feet reads better than
// a silhouette that would mime every frame of the walk.
//
// CACHED per (texture, frame, mirror, sun step): there are tens of distinct frames on a screen and the sun moves a
// step every few real seconds at most, so a shape is cut once and reused by every copy of that object.
// ===========================================================================
import { isoProjectFlat } from '../data/iso.js';

/** Sun steps: the shear's bearing in 48ths of a turn and its length in eighths. */
const ANG_STEPS = 48, LEN_STEPS = 10;
/** The most cut shapes kept; past it the oldest are dropped. */
const SIL_CACHE_MAX = 360;
/** Shadow length per pixel of height at the sun's longest and shortest (screen px per px). */
const SIL_LEN_MIN = 0.42, SIL_LEN_MAX = 1.25;

export const ShadowMixin = {
  /** The shear for this sun: screen px of ground per px of height, x and y. */
  _silShear(sun, minLen, maxLen) {
    const v = isoProjectFlat(sun.dx, sun.dy);
    const n = Math.hypot(v.x, v.y) || 1;
    const t = Math.max(0, Math.min(1, (sun.len - minLen) / Math.max(1e-6, maxLen - minLen)));
    const L = SIL_LEN_MIN + (SIL_LEN_MAX - SIL_LEN_MIN) * t;
    let ang = Math.atan2(v.y / n, v.x / n);
    // quantised, so the shape is re-cut a step at a time rather than every frame
    const ai = Math.round(((ang + Math.PI) / (Math.PI * 2)) * ANG_STEPS) % ANG_STEPS;
    const li = Math.round(((L - SIL_LEN_MIN) / (SIL_LEN_MAX - SIL_LEN_MIN)) * LEN_STEPS);
    ang = (ai / ANG_STEPS) * Math.PI * 2 - Math.PI;
    const Lq = SIL_LEN_MIN + (li / LEN_STEPS) * (SIL_LEN_MAX - SIL_LEN_MIN);
    // the bearing is already the projected one (isoProjectFlat flattens the ground 2:1), so it is not halved again
    return { sx: Math.cos(ang) * Lq, sy: Math.sin(ang) * Lq, step: `${ai}.${li}` };
  },

  /** Cut a sheared black silhouette of `src` (image or canvas region) into `ctxCanvas`. Returns the foot's place. */
  _silCut(draws, w, h, fx, fy, sh) {
    // the four corners, sheared: x' = x + sx (fy - y), y' = fy + sy (fy - y)
    const xs = [], ys = [];
    for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) { xs.push(x + sh.sx * (fy - y)); ys.push(fy + sh.sy * (fy - y)); }
    const minX = Math.floor(Math.min(...xs)) - 1, maxX = Math.ceil(Math.max(...xs)) + 1;
    const minY = Math.floor(Math.min(...ys)) - 1, maxY = Math.ceil(Math.max(...ys)) + 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, maxX - minX); c.height = Math.max(1, maxY - minY);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.setTransform(1, 0, -sh.sx, -sh.sy, sh.sx * fy - minX, fy * (1 + sh.sy) - minY);
    for (const d of draws) d(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    return { canvas: c, ox: (fx - minX) / c.width, oy: (fy - minY) / c.height };
  },

  /** A sprite's silhouette shadow texture for this sun, cut once per step. Null when it cannot be cut. */
  _silFor(spr, sh) {
    const fr = spr.frame;
    if (!fr || !spr.texture || spr.texture.key === '__DEFAULT' || spr.texture.key === '__MISSING') return null;
    const flip = !!spr.flipX;
    const key = `sil|${spr.texture.key}|${fr.name}|${flip ? 1 : 0}|${sh.step}`;
    const cache = (this._silCache = this._silCache || new Map());
    let rec = cache.get(key);
    if (rec) { cache.delete(key); cache.set(key, rec); return rec; }   // most recently used last
    const src = fr.source && fr.source.image;
    if (!src) return null;
    const w = fr.cutWidth, h = fr.cutHeight;
    const fx = spr.displayOriginX, fy = spr.displayOriginY;
    const cut = this._silCut([(g) => {
      if (flip) { g.save(); g.translate(w, 0); g.scale(-1, 1); }
      g.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
      if (flip) g.restore();
    }], w, h, fx, fy, sh);
    const texKey = `silT${(this._silSeq = (this._silSeq || 0) + 1)}`;
    this.textures.addCanvas(texKey, cut.canvas);
    rec = { texKey, ox: cut.ox, oy: cut.oy };
    cache.set(key, rec);
    if (cache.size > SIL_CACHE_MAX) {
      const [oldKey, old] = cache.entries().next().value;
      cache.delete(oldKey);
      if (this.textures.exists(old.texKey)) this.textures.remove(old.texKey);
    }
    return rec;
  },

  /** A cloth in the wind: its frame (the cloth cut out) plus the cloth as warped this frame, cut every frame into
   *  the cloth's own shadow texture. */
  _silForCloth(e, spr, sh) {
    const W = e.warp;
    if (!W || !W.ct) return null;
    const fr = spr.frame;
    const src = fr && fr.source && fr.source.image;
    if (!src) return null;
    const w = fr.cutWidth, h = fr.cutHeight;
    const fx = spr.displayOriginX, fy = spr.displayOriginY;
    const [rx, ry0] = e.spec.rect;
    const ry = ry0 + (e.spec.kind === 'hang' ? Math.max(4, Math.round(e.spec.rect[3] * 0.34)) : (e.spec.pin || 0));
    const warpCanvas = W.ct.getSourceImage();
    // one canvas per cloth, big enough for any sun, redrawn each frame (never re-created)
    const offX = Math.ceil(SIL_LEN_MAX * h) + 2, offY = Math.ceil(0.6 * h) + 2;
    if (!W.silTex) {
      const key = `silC${(this._silSeq = (this._silSeq || 0) + 1)}`;
      W.silTex = this.textures.createCanvas(key, w + 2 * offX, h + 2 * offY);
      W.silKey = key;
    }
    const ct = W.silTex;
    if (!ct) return null;
    const g = ct.getContext();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, ct.width, ct.height);
    g.imageSmoothingEnabled = false;
    const ex = offX, ey = offY;   // where the frame's (0,0) would sit unsheared
    g.setTransform(1, 0, -sh.sx, -sh.sy, ex + sh.sx * fy, ey + fy * (1 + sh.sy));
    g.drawImage(src, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
    g.drawImage(warpCanvas, rx - 1, ry - 1 - W.PAD_T);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000';
    g.fillRect(0, 0, ct.width, ct.height);
    g.globalCompositeOperation = 'source-over';
    ct.refresh();
    return { texKey: W.silKey, ox: (ex + fx) / ct.width, oy: (ey + fy) / ct.height };
  },
};
