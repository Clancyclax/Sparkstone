// ===========================================================================
// ROUND 314 (item 3) -- SOUL SCARS: THE SCENE SIDE.
//
// What a scar IS (its sources, shapes, palette, names and the seeded roll) lives
// in src/data/soulScars.js. This file is the door a story beat walks through
// (`_addSoulScar`), and the two places a scar is seen: the HUD portrait, for
// scars on the face, and the Character page, which lists every scar with what
// did it.
//
//   this._addSoulScar('destruction')            the next round's finale
//   this._addSoulScar('ritual', { zone: 'body' })
//
// That is the whole API. A new cause is a row in SCAR_SOURCES and a call here.
// ===========================================================================

import {
  addScar, drawScarOnPortrait, scarLine, scarCause, SCAR_FLAG, SCAR_SOURCES, SCAR_PORTRAIT_MAX,
} from '../data/soulScars.js';

export const SoulScarMixin = {

  /** Give the player a scar. Returns it. `opts` is passed to the roll
   *  (`zone`, `place`, `seed`). Says so, redraws the portrait, and refreshes the
   *  Character page. */
  _addSoulScar(source, opts = {}) {
    const p = this.player;
    if (!p || !SCAR_SOURCES[source]) return null;
    const scar = addScar(p, source, { ...opts, clock: this._clockT || 0 });
    const src = SCAR_SOURCES[source];
    if (!opts.quiet) {
      this._floatText(this.world.x, this.world.y - 52, src.gain, '#ef9a9a');
      this._floatText(this.world.x, this.world.y - 36, scarLine(scar), '#ffcdd2');
    }
    this._soulScarsAdded = (this._soulScarsAdded || 0) + 1;
    if (this._drawCharPortrait) this._drawCharPortrait();
    if (this._renderInventory) this._renderInventory();
    return scar;
  },

  _soulScars() {
    return (this.player && this.player[SCAR_FLAG]) || [];
  },

  /** Painted over the portrait by `_drawCharPortrait`: the most recent face
   *  scars, oldest first so a newer one lies on top. */
  _drawScarsOnPortrait(ctx, w, h) {
    const faces = this._soulScars().filter(s => s.zone === 'face').slice(-SCAR_PORTRAIT_MAX);
    for (const scar of faces) drawScarOnPortrait(ctx, scar, w, h);
  },

  /** The Character page's block. Empty when there is nothing to say. */
  _soulScarsHtml() {
    const list = this._soulScars();
    if (!list.length) return '';
    const rows = list.map(s => {
      const src = SCAR_SOURCES[s.source] || {};
      const colour = (src.palette && src.palette[2]) || '#ef9a9a';
      return `<div class="row soul-scar"><div><span style="color:${colour};">&#9679;</span> ${scarLine(s)}</div>`
        + `<div style="opacity:0.75;font-size:12px;">${src.label || s.source}. ${scarCause(s)}</div></div>`;
    }).join('');
    return `<h3 class="inv-section-h">Soul Scars</h3>${rows}`;
  },
};
