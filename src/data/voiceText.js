// ROUND 305 -- the text side of the voice lookup, kept apart from the index so the
// generator that WRITES the index can use it before the index exists. See voice.js.

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A line's text, reduced to what was SAID.
 *
 *   * the player's name goes: Knowledge's "waking" line says "I'm going to
 *     stay with you." where the text has ", {NAME}" (and by the time it is on
 *     screen, the player's own name)
 *   * double quotation marks go: they are not spoken
 *   * case and the run of whitespace go: "It IS the larger one" was read as
 *     "It is the larger one", and a paragraph break is a pause, not a word
 */
export function voiceNorm(text, name = '') {
  let s = String(text == null ? '' : text);
  s = s.replace(/,\s*\{NAME\}/g, '').replace(/\{NAME\}/g, '');
  if (name) s = s.replace(new RegExp(',\\s*' + escRe(String(name)) + '(?=[.!?,;:\\s]|$)', 'g'), '');
  return s.replace(/["“”]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** FNV-1a, 32 bits, base 36. The index holds hashes, not text: the text is in
 *  the manifests and stays out of the build. */
export function voiceHash(text, name = '') {
  const s = voiceNorm(text, name);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}
