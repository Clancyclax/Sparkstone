// ===========================================================================
// ROUND 346 (item 4, 4.1) -- ANIMAL SPIRITS OVER THE CAST. The scene half;
// the tables and the numbers are in data/spirits.js.
//
// WHAT IS DRAWN. When an ability whose essence has a creature, or a monster of
// such a creature's family, makes an attack, the creature's head shows over
// whoever made it:
//   * the STATIC head, shrunk, 70% transparent and recoloured to the attack's
//     element, floats up over the attacker's head and fades;
//   * for the seven creatures that have one, the ANIMATION plays on the
//     attacker at 50% transparency in its own colours.
// An attacker does not summon its spirit more than once per cooldown, so a
// stream of fast attacks is one spirit and not a stack of them.
// ===========================================================================
import { isoProject, isoDepth } from '../data/iso.js';
import { castTintFor, FX_ELEMENT_COLORS } from '../data/spellFx.js';
import {
  SPIRIT_NAMES, SPIRIT_ANIMS, SPIRIT_CELL, SPIRIT_ANIM_MS, SPIRIT_HEAD_ALPHA, SPIRIT_ANIM_ALPHA,
  SPIRIT_HEAD_SCALE, SPIRIT_ANIM_SCALE, SPIRIT_HEAD_MS, SPIRIT_COOLDOWN_MS,
  spiritForAbility, spiritForMonster, spiritHeadKey, spiritAnimKey, spiritHeadFile, spiritAnimFile, tintPixel,
} from '../data/spirits.js';

export const SpiritMixin = {
  /** Queue every head and animation sheet. Called from preload(). */
  _preloadSpirits() {
    for (const n of SPIRIT_NAMES) this.load.image(spiritHeadKey(n), spiritHeadFile(n));
    for (const n of Object.keys(SPIRIT_ANIMS)) {
      this.load.spritesheet(spiritAnimKey(n), spiritAnimFile(n), { frameWidth: SPIRIT_CELL, frameHeight: SPIRIT_CELL });
    }
  },

  /** The head recoloured to `tint` (0xRRGGBB), cached per creature and colour. */
  _spiritTintedKey(name, tint) {
    const base = spiritHeadKey(name);
    if (!this.textures.exists(base)) return null;
    const key = `${base}_${(tint >>> 0).toString(16)}`;
    if (this.textures.exists(key)) return key;
    try {
      const src = this.textures.get(base).getSourceImage();
      const w = src.width, h = src.height;
      const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
      const g = cnv.getContext('2d');
      g.drawImage(src, 0, 0);
      const img = g.getImageData(0, 0, w, h), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const [r, gg, b] = tintPixel(d[i], d[i + 1], d[i + 2], tint);
        d[i] = r; d[i + 1] = gg; d[i + 2] = b;
      }
      g.putImageData(img, 0, 0);
      this.textures.addCanvas(key, cnv);
      return key;
    } catch (e) {
      return null;
    }
  },

  /**
   * Show a creature's spirit over a body at world (wx, wy). `tint` colours the
   * static head; `lift` is how high the head floats above the body in px.
   * `who` is any object, used only to rate-limit that body's spirit.
   */
  _spiritCue(name, wx, wy, tint, opts = {}) {
    if (!name || this._spiritsOff) return null;
    const who = opts.who || null;
    const now = this.time ? this.time.now : 0;
    if (who) {
      if (who._spiritAt != null && now - who._spiritAt < SPIRIT_COOLDOWN_MS) return null;
      who._spiritAt = now;
    }
    const p = isoProject(wx, wy);
    const depth = isoDepth(wx, wy) + 90001;
    const lift = opts.lift != null ? opts.lift : 74;
    const out = {};
    const tc = (tint == null ? 0xffffff : tint) >>> 0;
    const key = this._spiritTintedKey(name, tc);
    if (key) {
      const head = this.add.image(p.x, p.y - lift, key);
      head.setScale(SPIRIT_HEAD_SCALE * 0.8).setAlpha(0).setDepth(depth);
      this.tweens.add({ targets: head, alpha: SPIRIT_HEAD_ALPHA, scale: SPIRIT_HEAD_SCALE, duration: 160, ease: 'Sine.easeOut' });
      this.tweens.add({
        targets: head, y: head.y - 14, duration: SPIRIT_HEAD_MS, ease: 'Sine.easeOut',
      });
      this.tweens.add({
        targets: head, alpha: 0, delay: SPIRIT_HEAD_MS * 0.6, duration: SPIRIT_HEAD_MS * 0.4,
        onComplete: () => head.destroy(),
      });
      out.head = head;
    }
    const animKey = spiritAnimKey(name);
    if (SPIRIT_ANIMS[name] && this.textures.exists(animKey)) {
      const spec = SPIRIT_ANIMS[name];
      const anim = `spirit_anim_${name}`;
      if (!this.anims.exists(anim)) {
        this.anims.create({
          key: anim,
          frames: this.anims.generateFrameNumbers(animKey, { start: 0, end: spec.frames - 1 }),
          frameRate: Math.round(1000 / SPIRIT_ANIM_MS), repeat: 0,
        });
      }
      const spr = this.add.sprite(p.x, p.y - (opts.animLift != null ? opts.animLift : 34), animKey, 0);
      spr.setScale(SPIRIT_ANIM_SCALE).setAlpha(SPIRIT_ANIM_ALPHA).setDepth(depth - 1);
      spr.once('animationcomplete', () => spr.destroy());
      spr.play(anim);
      out.anim = spr;
    }
    return out;
  },

  /** The player or a companion/guard casting `ability` from (wx, wy). */
  _spiritForCast(ability, wx, wy, who) {
    const name = spiritForAbility(ability);
    if (!name) return null;
    let tint = null;
    try { tint = castTintFor(ability); } catch (e) { tint = null; }
    return this._spiritCue(name, wx, wy, tint, { who });
  },

  /** A monster of a creature's family landing an attack. */
  _spiritForMonster(m) {
    if (!m || !m.type) return null;
    const name = spiritForMonster(m.type.family);
    if (!name) return null;
    const el = m.dmgElement;
    const tint = el && FX_ELEMENT_COLORS[el] != null ? FX_ELEMENT_COLORS[el] : 0xe8e0d0;
    const r = (m.type.radius || 14);
    return this._spiritCue(name, m.wx, m.wy, tint, { who: m, lift: 40 + r * 2.2, animLift: 18 + r });
  },
};
