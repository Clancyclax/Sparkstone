// ============================================================================
// ROUND 430 -- ONLINE CO-OP: THE LINK.
//
// The user's choices: "Online, two computers" and "Copy-paste codes" -- no server. The two games talk directly over a
// WebRTC data channel. Finding each other is done by hand:
//   1. the host makes an OFFER code and sends it to the friend (Discord, a text: anything);
//   2. the friend pastes it and gets an ANSWER code, and sends that back;
//   3. the host pastes the answer, and the two are connected.
// A code is the connection description (SDP, with every network address the browser could find already in it),
// deflated and base64url'd, behind a "BLBF1." prefix so a wrong paste is caught at once.
//
// Addresses are found with public STUN servers. Two players behind strict networks (some corporate or mobile ones)
// may not be able to reach each other at all without a relay (TURN), which this does not have; the panel says so if
// the link never opens.
//
// This file knows nothing about the game. It moves JSON messages, splitting anything long into parts.
// ============================================================================

export const COOP_CODE_PREFIX = 'BLBF1.';
export const COOP_ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
export const COOP_PART_BYTES = 16000;      // a data-channel message is kept well under every browser's limit
export const COOP_GATHER_MS = 5000;        // how long to wait for the browser to find its addresses
export const COOP_GRACE_MS = 20000;        // ROUND 432 -- how long a dropped link may take to come back on its own

// ---------------------------------------------------------------------------------------------------- codes
function b64urlFromBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromB64url(str) {
  const b = str.replace(/-/g, '+').replace(/_/g, '/');
  const s = atob(b + '==='.slice((b.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
async function pipeThrough(bytes, stream) {
  const res = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

/** A connection description as a code you can paste. */
export async function encodeCoopCode(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  const packed = typeof CompressionStream === 'function' ? await pipeThrough(raw, new CompressionStream('deflate-raw')) : raw;
  return COOP_CODE_PREFIX + (typeof CompressionStream === 'function' ? 'z' : 'r') + b64urlFromBytes(packed);
}

/** And back. Throws with a plain message on anything that is not one of ours. */
export async function decodeCoopCode(code) {
  const s = String(code || '').replace(/\s+/g, '');
  if (!s.startsWith(COOP_CODE_PREFIX)) throw new Error('That is not a co-op code. It should start with ' + COOP_CODE_PREFIX);
  const kind = s.charAt(COOP_CODE_PREFIX.length);
  const bytes = bytesFromB64url(s.slice(COOP_CODE_PREFIX.length + 1));
  const raw = kind === 'z' ? await pipeThrough(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(raw));
}

// ---------------------------------------------------------------------------------------------------- the link
export class CoopLink {
  /**
   * @param {object} o
   * @param {(msg: object) => void} o.onMessage  every whole message, parsed
   * @param {(state: string, detail?: string) => void} o.onState  'gathering' | 'waiting' | 'connecting' | 'open' | 'unstable' | 'closed' | 'failed'
   */
  constructor({ onMessage, onState, iceServers = COOP_ICE } = {}) {
    this.onMessage = onMessage || (() => {});
    this.onState = onState || (() => {});
    this.iceServers = iceServers;
    this.pc = null;
    this.ch = null;       // reliable, ordered: everything that must arrive
    this.fast = null;     // unordered, no retries: positions, where a late one is worse than a lost one
    this.parts = new Map();
    this.seq = 0;
    this.state = 'idle';
    this.role = null;
  }

  _set(state, detail) { this.state = state; try { this.onState(state, detail); } catch (e) { console.warn('[coop] state handler', e); } }

  _makePc() {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connecting') this._set('connecting');
      else if (s === 'connected') { clearTimeout(this._graceT); if (this.open) this._set('open'); }
      else if (s === 'failed') this._set(this.state === 'open' || this.state === 'unstable' ? 'closed' : 'failed', 'The two computers could not reach each other.');
      else if (s === 'disconnected') {
        // ROUND 432 -- a blip (Wi-Fi hiccup, a busy network) usually heals itself in a few seconds; give it
        // COOP_GRACE_MS before calling the connection lost.
        if (this.state === 'open') this._set('unstable');
        clearTimeout(this._graceT);
        this._graceT = setTimeout(() => { if (pc.connectionState !== 'connected') this._set('closed'); }, COOP_GRACE_MS);
      } else if (s === 'closed') this._set('closed');
    };
    this.pc = pc;
    return pc;
  }

  _wire(ch, fast) {
    ch.binaryType = 'arraybuffer';
    ch.onmessage = (e) => this._recv(e.data);
    ch.onopen = () => { if (this.ch && this.ch.readyState === 'open') this._set('open'); };
    ch.onclose = () => { clearTimeout(this._graceT); this._set('closed'); };
    if (fast) {
      fast.onmessage = (e) => this._recv(e.data);
      this.fast = fast;
    }
    this.ch = ch;
  }

  /** Wait until the browser has found its addresses (or the time is up), so the code carries them all. */
  _gathered(pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const t = setTimeout(resolve, COOP_GATHER_MS);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); }
      });
    });
  }

  /** HOST, step 1: the offer code to send to the friend. */
  async host() {
    this.role = 'host';
    const pc = this._makePc();
    const ch = pc.createDataChannel('coop', { ordered: true });
    const fast = pc.createDataChannel('coopFast', { ordered: false, maxRetransmits: 0 });
    this._wire(ch, fast);
    this._set('gathering');
    await pc.setLocalDescription(await pc.createOffer());
    await this._gathered(pc);
    this._set('waiting');
    return encodeCoopCode({ v: 1, role: 'host', sdp: pc.localDescription.sdp });
  }

  /** HOST, step 3: the friend's answer code. */
  async acceptAnswer(code) {
    const d = await decodeCoopCode(code);
    if (!d || d.role !== 'guest' || !d.sdp) throw new Error('That is an offer code. The host needs the code the friend sends back.');
    this._set('connecting');
    await this.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
  }

  /** GUEST, step 2: paste the host's offer code; returns the answer code to send back. */
  async join(code) {
    const d = await decodeCoopCode(code);
    if (!d || d.role !== 'host' || !d.sdp) throw new Error('That is an answer code. Paste the code the host sent you.');
    this.role = 'guest';
    const pc = this._makePc();
    pc.ondatachannel = (e) => {
      if (e.channel.label === 'coopFast') {
        this.fast = e.channel;
        e.channel.onmessage = (ev) => this._recv(ev.data);
      } else this._wire(e.channel, null);
    };
    this._set('gathering');
    await pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await this._gathered(pc);
    this._set('waiting');
    return encodeCoopCode({ v: 1, role: 'guest', sdp: pc.localDescription.sdp });
  }

  get open() { return !!(this.ch && this.ch.readyState === 'open'); }

  /** Send a message. `fast` sends it on the lossy channel when it fits in one part (positions). */
  send(msg, fast = false) {
    const text = JSON.stringify(msg);
    if (fast && this.fast && this.fast.readyState === 'open' && text.length < COOP_PART_BYTES) {
      try { this.fast.send(text); return true; } catch (e) { /* fall through to the reliable channel */ }
    }
    if (!this.open) return false;
    if (text.length < COOP_PART_BYTES) { this.ch.send(text); return true; }
    const id = ++this.seq;
    const n = Math.ceil(text.length / COOP_PART_BYTES);
    for (let i = 0; i < n; i++) {
      this.ch.send(JSON.stringify({ t: '~part', id, i, n, d: text.slice(i * COOP_PART_BYTES, (i + 1) * COOP_PART_BYTES) }));
    }
    return true;
  }

  /** How much is still queued to go out (for spacing big sends). */
  get buffered() { return this.ch ? this.ch.bufferedAmount : 0; }

  _recv(data) {
    let m;
    try { m = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch (e) { return; }
    if (m && m.t === '~part') {
      let p = this.parts.get(m.id);
      if (!p) { p = { n: m.n, got: 0, bits: new Array(m.n) }; this.parts.set(m.id, p); }
      if (p.bits[m.i] === undefined) { p.bits[m.i] = m.d; p.got++; }
      if (p.got < p.n) return;
      this.parts.delete(m.id);
      try { m = JSON.parse(p.bits.join('')); } catch (e) { return; }
    }
    try { this.onMessage(m); } catch (e) { console.warn('[coop] message handler', e); }
  }

  close() {
    try { if (this.ch) this.ch.close(); } catch (e) { /* already */ }
    try { if (this.pc) this.pc.close(); } catch (e) { /* already */ }
    this._set('closed');
  }
}
