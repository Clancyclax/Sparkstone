// ============================================================================
// ROUND 305 -- THE VOICE PLAYER.
//
// data/voice.js decides WHICH clip goes with a line of text; this plays it.
//
//   * ONE clip at a time. Starting a clip stops whatever was playing, so two
//     voices never overlap.
//   * A DIALOGUE page takes over: it cuts any clip, speaks its own (or, if it
//     has none, leaves the room silent), and is stopped when the player
//     continues to the next page, closes the box, or another voiced line starts.
//   * AMBIENT lines (banter, Prism's barks, a companion's word over their head)
//     never talk over anyone: they play only when nothing is playing and no
//     conversation is open, and otherwise stay text.
//   * LAZY. A clip is fetched the first time its line is wanted, not at boot --
//     816 clips are 95 MB. (The Keeper's, 85 KB, is eager: the new-game screen
//     cannot wait for a fetch.)
//   * BOUNDED. A clip is decoded to play and dropped from the cache afterwards,
//     keeping only the last few. 100 minutes of stereo decoded is gigabytes.
//   * A line with no clip, a clip that fails to load, or a voice slider at zero
//     is silence, never an error.
// ============================================================================
import { voiceClipsFor, voiceClipById, VOICE_DIR, VOICE_KEEP } from '../data/voice.js';

export const VoiceMixin = {
  /** Is a voice clip playing, or on its way? */
  _voiceBusy() {
    return !!((this._voice && this._voice.sound && this._voice.sound.isPlaying) || this._voiceWant);
  },

  /**
   * A line of text has just been put on screen. Play its clip if it has one.
   * kind 'page' = a dialogue page (takes over); 'ambient' = a bubble or bark.
   * Returns the clip when one is playing or on its way, so the caller can hold
   * its bubble up for as long as the voice runs.
   */
  _voiceForText(text, kind = 'page') {
    const [clip, ...rest] = voiceClipsFor(text, (this.player && this.player.name) || '');
    if (!clip) {
      if (kind === 'page') this._voiceStop();
      return null;
    }
    // A page that carries several voiced lines is read through, one after another.
    return this._voicePlay(clip, kind, rest) ? clip : null;
  },

  /** A line by its id, for the places that have no text to look up. */
  _voicePlayId(id, kind = 'page') {
    const clip = voiceClipById(id);
    return clip && this._voicePlay(clip, kind) ? clip : null;
  },

  _voicePlay(clip, kind = 'page', queue = []) {
    if (!clip) return false;
    if (kind === 'ambient' && (this._voiceBusy() || this._dialogueOpen)) return false;
    // The same page asked for again while it is still being read is the same
    // page: do not start it over.
    if (this._voice && this._voice.key === clip.key && this._voice.sound && this._voice.sound.isPlaying) return true;
    this._voiceStop();
    if (this._busVolume('voice') <= 0) return false;
    this._voiceFailed = this._voiceFailed || new Set();
    if (this._voiceFailed.has(clip.key)) return false;
    this._voiceWant = { key: clip.key, clip, kind, queue };
    if (this.cache.audio.exists(clip.key)) { this._voiceStart(); return true; }
    this._voiceFetch(clip);
    return true;
  },

  _voiceFetch(clip) {
    this._voiceLoading = this._voiceLoading || new Set();
    if (!this._voiceErrWired) {
      this._voiceErrWired = true;
      this.load.on('loaderror', (file) => {
        if (!file || !String(file.key).startsWith('vo_')) return;
        this._voiceLoading && this._voiceLoading.delete(file.key);
        (this._voiceFailed = this._voiceFailed || new Set()).add(file.key);
        if (this._voiceWant && this._voiceWant.key === file.key) this._voiceWant = null;
      });
    }
    if (this._voiceLoading.has(clip.key)) return;
    this._voiceLoading.add(clip.key);
    this.load.audio(clip.key, `${VOICE_DIR}${clip.file}`);
    this.load.once(`filecomplete-audio-${clip.key}`, () => {
      this._voiceLoading.delete(clip.key);
      // Only if it is still the line wanted: the player may have moved on while
      // the file was coming, and a late clip must not read out a page that is gone.
      if (this._voiceWant && this._voiceWant.key === clip.key) this._voiceStart();
      else this._voiceRemember(clip.key);   // arrived late: cached, never played, still counted
    });
    if (!this.load.isLoading()) this.load.start();
  },

  _voiceStart() {
    const want = this._voiceWant;
    this._voiceWant = null;
    if (!want || !this.cache.audio.exists(want.key)) return;
    try {
      const snd = this.sound.add(want.key, { volume: this._busVolume('voice') });
      const rec = { sound: snd, key: want.key, id: want.clip.id, kind: want.kind, queue: want.queue || [] };
      this._voice = rec;
      const finish = () => {
        const wasCurrent = this._voice === rec;
        if (wasCurrent) this._voice = null;
        this._voiceRetire(rec);
        // ...and on to the next line of the same page, if it was read to the end.
        if (wasCurrent && rec.queue.length) { const [next, ...rest] = rec.queue; this._voicePlay(next, rec.kind, rest); }
      };
      snd.once('complete', finish);
      snd.play();
      this._voicePlayed = (this._voicePlayed || 0) + 1;
      this._voiceLast = want.clip.id;
    } catch (e) { this._voice = null; }
  },

  /** Stop whatever is speaking, and whatever was about to. */
  _voiceStop() {
    this._voiceWant = null;
    const rec = this._voice;
    if (!rec) return;
    this._voice = null;
    try { rec.sound.stop(); } catch (e) { /* already done */ }
    this._voiceRetire(rec);
  },

  /** A clip has finished or been cut: free its sound, and keep only the last
   *  few decoded. */
  _voiceRetire(rec) {
    try { rec.sound.destroy(); } catch (e) { /* gone */ }
    this._voiceRemember(rec.key);
  },

  _voiceRemember(key) {
    const lru = (this._voiceLru = this._voiceLru || []);
    const at = lru.indexOf(key);
    if (at >= 0) lru.splice(at, 1);
    lru.push(key);
    while (lru.length > VOICE_KEEP) {
      const old = lru.shift();
      if (this._voice && this._voice.key === old) continue;
      try { if (old !== 'vo_keeper_who' && this.cache.audio.exists(old)) this.cache.audio.remove(old); } catch (e) { /* ignore */ }
    }
  },

  /** The slider moved: apply it to the line already speaking. */
  _voiceApplyVolume() {
    if (this._voice && this._voice.sound) {
      try { this._voice.sound.setVolume(this._busVolume('voice')); } catch (e) { /* ignore */ }
    }
  },
};
