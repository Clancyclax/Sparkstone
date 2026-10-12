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
  for (let n = paras.length; n >= 1; n--) {
    const part = n === paras.length ? String(text) : paras.slice(0, n).join('\n\n');
    const id = VOICE_BY_TEXT[voiceHash(part, name)];
    if (id) return [voiceClipById(id)];
  }
  const out = [];
  for (const ln of String(text).split('\n')) {
    if (!ln.trim()) continue;
    const id = VOICE_BY_TEXT[voiceHash(ln.replace(/^\s*[\u00b7\u2022*-]\s*/, ''), name)];
    if (id && !out.some(c => c.id === id)) out.push(voiceClipById(id));
  }
  return out;
}

/** The first of them, or null. */
export function voiceClipFor(text, name = '') {
  return voiceClipsFor(text, name)[0] || null;
}

/** Every line id, for suites and for the check. */
export function voiceIds() { return Object.keys(VOICE_CLIPS); }
