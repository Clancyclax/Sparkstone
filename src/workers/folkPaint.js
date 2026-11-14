// ROUND 429 -- PERFORMANCE: a townsperson's walk sheet is recoloured here, off the main thread.
//
// Painting one on the main thread (read the sheet's pixels, run the colour table over every one, write them back)
// cost 16 ms here and up to 50 ms on a busy frame: a visible hitch each time a new walker set off. WorldScene
// `_folkWalkTexture` sends the sheet as an ImageBitmap and the table as pairs; this sends the painted pixels back,
// and the scene only uploads them.
import { applyFolkLut } from '../data/townFolk.js';

self.onmessage = (e) => {
  const { id, bitmap, lut } = e.data || {};
  try {
    const c = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    if (bitmap.close) bitmap.close();
    const img = ctx.getImageData(0, 0, c.width, c.height);
    applyFolkLut(img.data, new Map(lut));
    self.postMessage({ id, w: c.width, h: c.height, buf: img.data.buffer }, [img.data.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err && err.message || err) });
  }
};
