// ============================================================================
// ROUND 305 -- VOICE. Which spoken clip, if any, goes with a line of text.
//
//   "Add a voice bus with its own volume slider next to master, music,
//    ambiance and spells. When a voiced line is shown, play its clip."
//
// Only Knowledge, the Keeper of Moments and the nine companions are voiced
// (816 clips). Everything else is silent, and a line with no clip stays silent.
//
// HOW A LINE FINDS ITS CLIP. By what it says, not by where it was raised. The
// game draws speech in four places -- a dialogue page, a conversation answer,
// a bubble over a head, and Prism's barks -- and the lines reach them from
// thirteen data files and two inline tables. Hooking each source would mean
// forty edits that go stale one dialogue pass later; hooking the four places
// that draw, and looking the words up, covers every source at once and keeps
// working when a line moves. The lookup is the hash of the line's normalised
// text (below) against src/data/voiceIndex.js, which is generated from the
// manifests the clips came with.
//
// A line whose text has been edited since it was voiced simply stops matching,
// so it goes silent rather than reading out the old words; the check in
// tools/voice/voice_check.mjs reports every such line by name.
// ============================================================================
import { VOICE_CLIPS, VOICE_BY_TEXT } from './voiceIndex.js';
import { voiceNorm, voiceHash } from './voiceText.js';
export { voiceNorm, voiceHash };


/** Where the clips live, relative to the page. */
export const VOICE_DIR = './public/audio/voice/';

/** Clips kept decoded at once. A voiced game is 100 minutes of stereo audio;
 *  decoded that is gigabytes, so a clip is dropped from the cache once it has
 *  played, except for the last few (a player replaying a page hears no gap). */
export const VOICE_KEEP = 6;

/** A clip by its line id (e.g. 'knowledge_first_kill', 'zeke_greet', 'keeper_who'). */
export function voiceClipById(id) {
  const c = VOICE_CLIPS[id];
  return c ? { id, file: c[0], secs: c[1], key: `vo_${id}` } : null;
}

/**
 * The clips for whatever is on screen, in the order they are read; usually one.
 *
 * Tries the whole text first, then the leading paragraphs, longest first. Some
 * pages show a voiced line followed by something that is not voiced -- a
 * companion's greeting and then their blurb, a stat sheet under an arc beat,
 * "(Waiting in the transport.)" under a rest line -- and only the voiced
 * paragraphs are in the index.
 *
 * Failing that, a page that builds itself line by line: a god's rite offer is
 * "[Rite] The Survey -- step 1 of 2", the god's line in quotation marks, then
 * the task and its pay; Prism reading her job verdicts back is a list of them.
 * Every voiced line on such a page is returned, in page order, so the page is
 * read out rather than only its first sentence.
 */
export function voiceClipsFor(text, name = '') {
  if (!text) return [];
  const paras = String(text).split(/\n\s*\n/);
  // ROUND 397 -- EVERY VOICED STRETCH OF THE PAGE, IN ORDER. Until now a match on the leading paragraphs ended the
  // search, so a voiced greeting silenced the god's charge under it, a voiced loss opener silenced the four paragraphs
  // after it, and a voiced opening silenced Prism's verdict lines. Now the longest voiced run from the top plays, then
  // the same question is asked of what is left: its longest voiced leading run, else line by line.
  const out = [];
  const push = (id) => { if (id && !out.some(c => c.id === id)) out.push(voiceClipById(id)); };
  let at = 0;
  while (at < paras.length) {
    let took = 0;
    for (let n = paras.length - at; n >= 1; n--) {
      const part = (at === 0 && n === paras.length) ? String(text) : paras.slice(at, at + n).join('\n\n');
      const id = VOICE_BY_TEXT[voiceHash(part, name)];
      if (id) { push(id); took = n; break; }
    }
    if (took) { at += took; continue; }
    for (const ln of paras[at].split('\n')) {
      if (!ln.trim()) continue;
      push(VOICE_BY_TEXT[voiceHash(ln.replace(/^\s*[\u00b7\u2022*-]\s*/, ''), name)]);
    }
    at += 1;
  }
  return out;
}

/** The first of them, or null. */
export function voiceClipFor(text, name = '') {
  return voiceClipsFor(text, name)[0] || null;
}

/** Every line id, for suites and for the check. */
export function voiceIds() { return Object.keys(VOICE_CLIPS); }

// ===========================================================================
// ROUND 397 -- RECORDED LINES, MERGED AT BOOT.
//
//   "Give me scripts for every major character and god so that I can have voice lines recorded. Number each
//    statement so that when recorded they just have to save the statements under the number to make upload easy."
//
// Recordings are imported by tools/voice/import_recordings.mjs into public/audio/voice/<speaker>/ and listed in
// public/audio/voice/recorded_index.json: { clips: { id: [file, secs] }, byText: { hash: id } }. That file lives in
// the REPO's public folder -- which the build copies whole -- so a batch of new recordings needs no code round and no
// overlay: import, rebuild, and they play. A recorded clip REPLACES the text-to-speech clip with the same line id.
// ===========================================================================
export const RECORDED_INDEX_URL = `${VOICE_DIR}recorded_index.json`;

/** Merge a recorded index into the live one. Returns how many clips it added or replaced. */
export function mergeRecordedVoice(data) {
  if (!data || typeof data !== 'object') return 0;
  let n = 0;
  for (const [id, c] of Object.entries(data.clips || {})) {
    if (!Array.isArray(c) || typeof c[0] !== 'string') continue;
    VOICE_CLIPS[id] = [c[0], Number(c[1]) || 0]; n++;
  }
  for (const [h, id] of Object.entries(data.byText || {})) {
    if (VOICE_CLIPS[id]) VOICE_BY_TEXT[h] = id;
  }
  return n;
}
