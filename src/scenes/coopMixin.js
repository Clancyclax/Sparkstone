// ============================================================================
// ROUND 430 -- ONLINE CO-OP, IN THE SCENE (first part: connect, and see each other).
//
// The user: "Need a 2 player multiplayer option where instead of starting with Prism you start with another player."
// His choices: online between two computers, copy-paste codes to connect, both starting a new game together.
//
// THIS ROUND
//   THE PANEL     "Co-op" on the title screen (and in Options > Sound & more). Host or Join; the codes go back and
//                 forth by hand (src/net/coopLink.js).
//   THE HOST      plays their own new game as ever. Their world is the world.
//   THE GUEST     connects from the title screen, then makes their character in the creator. When it closes they
//                 skip the prologue and step into the host's world beside the host: the same run seed, the same hour.
//   SEEING EACH OTHER  each game sends where its player is and exactly what its player sprite is showing (sheet,
//                 frame, origin, flip, scale) fifteen times a second. A sheet the other game has never seen is asked
//                 for once and sent over as a picture, so any look (armour, a mount, a form) shows as it is.
//
// NOT YET (the next parts): the guest's world has no monsters of its own; the host's monsters, people, loot and
// fights are not yet shared, and the guest does not yet take Prism's place in the story.
// ============================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { CoopLink } from '../net/coopLink.js';
import { GAME_VERSION } from '../data/version.js';

const SEND_MS = 66;            // fifteen a second
const CLOCK_SYNC_S = 10;
const ARRIVE_OFFSET = 2 * TILE;
const MON_SEND_MS = 100;           // ROUND 431 -- the host's monsters, ten times a second
const MON_SEND_TILES = 36;         // ...those within this reach of the guest
const GUEST_AGGRO_REACH = 520;     // as far as a monster looks for a companion
const ASSIST_S = 20;               // ROUND 432 -- a blow this recent on a kill is an assist
const STATUS_KEYS = ['frozenT', 'slowT', 'confusedT', 'stunT', 'rootT', 'silenceT', 'sunderT'];

const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const CoopMixin = {
  // ------------------------------------------------------------------------------------------------ state
  _coop() { return this._coopState || (this._coopState = { role: null, link: null, status: 'off', remote: null, peer: null }); },
  _coopOn() { const c = this._coopState; return !!(c && c.link && c.link.open); },
  _coopIsGuest() { const c = this._coopState; return !!(c && c.role === 'guest'); },
  /** The guest's world is quiet: its own monsters do not wake (the host's will be shown in a later part). */
  /** ROUND 433 -- a guest's world is quiet only while the two of them stand in the same place (the same region, and
   *  the same room or both outdoors): the host's monsters are the ones there. Apart, or with the link down, the
   *  guest's own game runs its own monsters, so a guest alone in a dungeon or another region still has a fight. */
  _coopGuestQuiet() {
    if (!this._coopIsGuest()) return false;
    const c = this._coopState;
    if (!c.link || !c.link.open) return false;
    if (!this._coopArrived) return true;
    return this._coopTogether();
  },
  _coopTogether() {
    const r = this._coopState && this._coopState.remote;
    const m = r && r.last;
    if (!m) return false;
    return (this.currentRegion ? this.currentRegion.id : null) === m.rg && (this._insideRoom ? this._insideRoom.id : null) === m.rm;
  },
  /** Coming together: the guest's own monsters go back to sleep, the host's take their place. */
  _coopSleepOwn() {
    for (const g of (this.spawnGroups || [])) { if (g && g.awake && this._sleepSpawnGroup) { try { this._sleepSpawnGroup(g); } catch (e) { /* asleep */ } } }
  },
  /** What this player is doing, for the other's label and for who the monsters pick. */
  _coopBusy() {
    if (!this.player) return '';
    if (this.player.dead) return 'down';
    if (this._dialogueOpen) return 'talk';
    if (this._shopOpen) return 'shop';
    if (this._isAnyOverlayOpen && this._isAnyOverlayOpen()) return 'menu';
    return '';
  },
  /** ROUND 433 -- "In multiplayer menus dont pause the world at all": true while a co-op game is connected and in play. */
  _coopWorldLive() {
    const c = this._coopState;
    if (!c || !c.role || !c.link || !c.link.open) return false;
    if (this._titleOpen || this._keeperOpen || this._creatorOpen) return false;   // not in the world yet
    return c.role === 'host' || !!this._coopArrived;
  },
  /** The world's half of a frame, without the player's own controls: what runs behind a menu or the death screen. */
  _coopRunWorld(dt) {
    const k = this._worldTimeScale ? this._worldTimeScale() : 1;
    const step = (f) => { try { f(); } catch (e) { console.warn('[coop] world behind a menu', e && e.message); } };
    step(() => this._updateProjectiles(dt));
    step(() => this._updateMonsterShots(dt * k));
    step(() => this._updateSwingFx());
    step(() => this._updateTriggers(dt));
    step(() => this._updateMonsters(dt * k));
    step(() => this._updateParty(dt));
    step(() => this._updateGuards(dt));
    step(() => this._updateGods(dt));
    step(() => this._updateTownLife(dt));
    if (this._cityLifeTick) step(() => this._cityLifeTick(dt));
    if (this._crimeTick) step(() => this._crimeTick(dt));
    step(() => this._npcFrontPass());
    step(() => this._slabActorPass());
  },

  // ------------------------------------------------------------------------------------------------ the panel
  _coopPanel() {
    let el = document.getElementById('coopPanel');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'coopPanel';
    el.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:100001;width:min(620px,92vw);'
      + 'background:#16121c;border:2px solid #b08d3c;border-radius:10px;padding:18px 22px;color:#e8e2d0;'
      + 'font:14px/1.5 system-ui,Segoe UI,sans-serif;box-shadow:0 8px 40px #000c;display:none;';
    document.body.appendChild(el);
    return el;
  },

  _openCoop() {
    this._coopOpen = true;
    this._renderCoop();
    this._coopPanel().style.display = 'block';
  },
  _closeCoop() {
    this._coopOpen = false;
    const el = document.getElementById('coopPanel');
    if (el) el.style.display = 'none';
  },

  _renderCoop() {
    const c = this._coop();
    const el = this._coopPanel();
    const btn = (id, label, extra = '') => `<button class="action-btn" id="${id}" type="button" style="margin:4px 6px 4px 0;${extra}">${label}</button>`;
    const box = (id, ro, ph) => `<textarea id="${id}" ${ro ? 'readonly' : ''} placeholder="${ph || ''}" spellcheck="false" style="width:100%;height:84px;box-sizing:border-box;background:#0d0b11;color:#e8e2d0;border:1px solid #5d4a2a;border-radius:6px;font:12px monospace;padding:6px;"></textarea>`;
    let body = `<div style="font-weight:700;font-size:17px;color:#f0c75e;margin-bottom:6px;">Co-op</div>`;
    const st = c.status;
    if (!c.role) {
      body += `<div>Play together over the internet: one of you hosts, the other joins. You swap two codes by hand (paste them into a chat).</div>`
        + `<div style="margin-top:6px;opacity:.85;">${this._titleOpen ? 'From here, hosting starts a new game together. To carry on a co-op game, load it first (both of you), then open Co-op from Options.' : 'You are both carrying on from your own saves: the guest steps in beside the host.'}</div>`
        + `<div style="margin-top:10px;">${btn('coopHost', 'Host')}${btn('coopJoin', 'Join')}${btn('coopClose', 'Close')}</div>`;
    } else if (c.role === 'host') {
      if (st === 'open') body += `<div style="color:#a5d6a7;">Connected${c.peer ? ` to ${esc(c.peer.name)}` : ''}.</div>`;
      else {
        body += `<div><b>1.</b> Send this code to your friend.</div>${box('coopOut', true)}`
          + `<div>${btn('coopCopy', 'Copy code')}</div>`
          + `<div style="margin-top:8px;"><b>2.</b> Paste the code they send back.</div>${box('coopIn', false, 'BLBF1.…')}`
          + `<div>${btn('coopConnect', 'Connect')}</div>`;
      }
      body += `<div id="coopMsg" style="margin-top:8px;opacity:.85;">${esc(this._coopStatusLine())}</div><div style="margin-top:8px;">${btn('coopClose', 'Close')}${btn('coopEnd', 'End co-op', 'opacity:.8;')}</div>`;
    } else {
      if (st === 'open') body += `<div style="color:#a5d6a7;">Connected${c.peer ? ` to ${esc(c.peer.name)}` : ''}.</div>`
        + (this._coopArrived ? '' : `<div>Make your character, and you will step into their world beside them.</div>`);
      else if (c.answer) body += `<div><b>2.</b> Send this code back to the host, and wait.</div>${box('coopOut', true)}<div>${btn('coopCopy', 'Copy code')}</div>`;
      else body += `<div><b>1.</b> Paste the code the host sent you.</div>${box('coopIn', false, 'BLBF1.…')}<div>${btn('coopAnswer', 'Make my code')}</div>`;
      body += `<div id="coopMsg" style="margin-top:8px;opacity:.85;">${esc(this._coopStatusLine())}</div><div style="margin-top:8px;">${btn('coopClose', 'Close')}${btn('coopEnd', 'End co-op', 'opacity:.8;')}</div>`;
    }
    el.innerHTML = body;
    const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
    const out = document.getElementById('coopOut');
    if (out) out.value = (c.role === 'host' ? c.offer : c.answer) || '';
    on('coopClose', () => this._closeCoop());
    on('coopEnd', () => this._coopEnd());
    on('coopHost', () => this._coopStartHost());
    on('coopJoin', () => { c.role = 'guest'; this._renderCoop(); });
    on('coopCopy', () => { const t = document.getElementById('coopOut'); if (t) { t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand && document.execCommand('copy'); } this._coopSay('Copied.'); } });
    on('coopConnect', () => this._coopHostAccept(document.getElementById('coopIn').value));
    on('coopAnswer', () => this._coopGuestJoin(document.getElementById('coopIn').value));
  },

  _coopStatusLine() {
    const c = this._coop();
    if (c.rejoin && c.status !== 'open') return c.role === 'host'
      ? 'The connection dropped. Send this new code to your friend and paste the one they send back. Nothing in either game was lost.'
      : 'The connection dropped. Paste the new code the host sends you, and send yours back. Your character stays where you are.';
    return ({
      unstable: 'The connection is unsteady; waiting for it to come back…',
      off: '', gathering: 'Finding your network addresses…', waiting: c.role === 'host' ? 'Waiting for their code.' : 'Waiting for the host to paste your code.',
      connecting: 'Connecting…', open: 'Connected.', closed: 'The connection closed.',
      failed: 'The two computers could not reach each other. Some networks (work, school, mobile) block direct connections; try another network.',
    })[c.status] || c.status || '';
  },
  _coopSay(t) { const m = document.getElementById('coopMsg'); if (m) m.textContent = t; },

  _coopNewLink() {
    const c = this._coop();
    if (c.link) { const old = c.link; old.retired = true; old.close(); }
    const link = new CoopLink({
      onMessage: (m) => { if (!link.retired) this._coopRecv(m); },
      onState: (s, detail) => {
        // ROUND 432 -- a link that has been replaced (a re-pair) says nothing more, and a link is lost only once
        if (link.retired || link.lost) return;
        c.status = s;
        if (s === 'open') this._coopOpened();
        if (s === 'closed' || s === 'failed') { link.lost = true; this._coopLost(detail); }
        if (this._coopOpen) this._renderCoop();
      },
    });
    c.link = link;
    return link;
  },

  async _coopStartHost() {
    const c = this._coop();
    c.role = 'host';
    const link = this._coopNewLink();
    this._renderCoop();
    try { c.offer = await link.host(); } catch (e) { c.status = 'failed'; c.offer = ''; this._coopSay(`Could not make a code: ${e.message}`); return; }
    this._renderCoop();
  },
  async _coopHostAccept(code) {
    const c = this._coop();
    try { await c.link.acceptAnswer(code); } catch (e) { this._coopSay(e.message); }
  },
  async _coopGuestJoin(code) {
    const c = this._coop();
    const link = this._coopNewLink();
    try { c.answer = await link.join(code); } catch (e) { c.status = 'off'; this._coopSay(e.message); return; }
    this._renderCoop();
  },

  _coopEnd() {
    const c = this._coop();
    c.ending = true;
    if (c.link) c.link.close();
    this._coopDropRemote();
    this._coopState = null;
    this._renderCoop();
  },

  // ------------------------------------------------------------------------------------------------ the protocol
  _coopSend(m, fast = false) { const c = this._coopState; return !!(c && c.link && c.link.send(m, fast)); },

  _coopOpened() {
    const c = this._coop();
    c.everOpen = true;
    // ROUND 432 -- re-paired after a drop: back to the game at once (the panel holds the world still while it is up)
    if (c.rejoin) { if (c.role === 'host') c.rejoin = false; if (this._coopOpen) this._closeCoop(); }
    if (this.player) this.player.coopRun = true;   // ROUND 432 -- a co-op run: "Prism is absent in co-op"
    this._coopApplyNoPrism();
    if (c.role === 'host' && this._titleOpen && this._titleNewGame) {   // ROUND 432 -- hosted from the title: a new game together
      this._closeCoop();
      this._titleNewGame();
    }
    this._coopSend({ t: 'hello', v: GAME_VERSION, role: c.role, name: (this.player && this.player.name) || 'Adventurer' });
    if (c.role === 'host') this._coopSendWorld();
    if (c.role === 'guest' && !this._coopArrived) {
      this._closeCoop();
      // ROUND 431 -- a guest already playing (a co-op character loaded from its save) steps across once the host's
      // world arrives; one at the title goes into the creator, a fresh character for a shared start
      if (this._titleOpen && this._titleNewGame) this._titleNewGame();
      else if (c.hostWorld && c.hostWorld.ready) this._coopGuestStep(c.hostWorld);
      else c.arriveWhenWorld = true;
    }
    this._floatText(this.world.x, this.world.y - 70, 'Co-op: connected', '#a5d6a7');
  },

  _coopLost(detail) {
    const c = this._coopState;
    if (!c) return;
    this._coopDropRemote();
    // ROUND 432 -- the host's monsters and people leave the guest's world with the link
    for (const m of (c.puppets ? [...c.puppets.values()] : [])) this._coopDropPuppet(m);
    for (const p of (c.people ? [...c.people.values()] : [])) this._coopDropPerson(p);
    if (c.puppets) c.puppets.clear();
    if (c.people) c.people.clear();
    c.apart = true;   // ROUND 433 -- the guest's own world wakes while the link is down; together again, it sleeps
    if (this.world) this._floatText(this.world.x, this.world.y - 70, detail || 'Co-op: the connection dropped', '#ef9a9a');
    // ROUND 432 -- RECONNECTING. Nothing about either game is lost: the guest stays where they are, the host's world
    // goes on. Only the link is made again, and the panel opens on it: the host's new code is made at once, so it
    // is Copy, send, paste theirs; the guest pastes the host's new code and sends one back. No character is made
    // again, and the guest is put back beside the host if they have drifted apart.
    if (!c.everOpen || c.ending) return;
    c.offer = null; c.answer = null; c.rejoin = true;
    this._openCoop();
    if (c.role === 'host') this._coopStartHost();
  },

  _coopSendWorld() {
    const p = this.player;
    this._coopSend({
      t: 'world', runSeed: this._shopSeed ? this._shopSeed() : (p && p.runSeed), clockT: this._clockT || 0,
      x: this.world.x, y: this.world.y, region: this.currentRegion ? this.currentRegion.id : null,
      // indoors, the guest arrives at the door the host went in by
      ox: this._lastOutdoorPos ? this._lastOutdoorPos.x : null, oy: this._lastOutdoorPos ? this._lastOutdoorPos.y : null,
      room: this._insideRoom ? this._insideRoom.id : null,
      ready: !this._titleOpen && !this._creatorOpen && !this._keeperOpen,   // ROUND 432 -- the host is in the world
    });
  },

  _coopRecv(m) {
    if (!m || !m.t) return;
    const c = this._coop();
    if (m.t === 'hello') {
      c.peer = { name: m.name, v: m.v, role: m.role };
      if (m.v !== GAME_VERSION) this._floatText(this.world.x, this.world.y - 90, `Co-op: they are on version ${m.v}, you are on ${GAME_VERSION}`, '#ffcc80');
      if (this._coopOpen) this._renderCoop();
      return;
    }
    if (m.t === 'world' && c.role === 'guest') {
      c.hostWorld = m;
      if (this._coopArrived && c.rejoin && m.ready) {   // ROUND 432 -- back after a drop: beside the host again if apart
        c.rejoin = false;
        const sameRoom = (this._insideRoom ? this._insideRoom.id : null) === m.room;
        const far = !sameRoom || Math.hypot(this.world.x - m.x, this.world.y - m.y) > 40 * TILE;
        if (far && !m.room && this.teleportTo && !this._insideRoom) this.teleportTo(m.x + ARRIVE_OFFSET, m.y + ARRIVE_OFFSET);
      }
      if (this._coopArrived) this._coopAdoptClock(m.clockT);
      else if (c.arriveWhenWorld && m.ready) { c.arriveWhenWorld = false; this._coopGuestStep(m); }
      return;
    }
    if (m.t === 'clock' && c.role === 'guest') { this._coopAdoptClock(m.c); return; }
    if (m.t === 'arrived' && c.role === 'host') { this._coopSendWorld(); return; }
    if (m.t === 'p') { this._coopRemoteState(m); return; }
    if (m.t === 'texReq') { this._coopSendTexture(m.k); return; }
    if (m.t === 'tex') { this._coopTakeTexture(m); return; }
    if (m.t === 'name') { if (c.peer) c.peer.name = m.name; if (c.remote && c.remote.label) c.remote.label.setText(m.name); return; }
    // ROUND 431 -- the fight, shared
    if (m.t === 'mons' && c.role === 'guest') { this._coopApplyMons(m); return; }
    if (m.t === 'hit' && c.role === 'host') { this._coopGuestHit(m); return; }
    if (m.t === 'hurt' && c.role === 'guest') { this._coopHurt(m); return; }
    if (m.t === 'died' && c.role === 'guest') { this._coopPuppetDied(m); return; }
    // ROUND 432 -- afflictions, people, assists, a town turning
    if (m.t === 'deb' && c.role === 'host') { this._coopGuestDebuff(m); return; }
    if (m.t === 'dot' && c.role === 'host') { this._coopGuestDot(m); return; }
    if (m.t === 'st' && c.role === 'host') { this._coopGuestStatus(m); return; }
    if (m.t === 'folk' && c.role === 'guest') { this._coopApplyPeople(m); return; }
    if (m.t === 'phit' && c.role === 'host') { this._coopGuestPersonHit(m); return; }
    if (m.t === 'phurt' && c.role === 'guest') { this._coopPersonHurt(m); return; }
    if (m.t === 'pdied' && c.role === 'guest') { this._coopPersonDied(m); return; }
    if (m.t === 'provoke' && c.role === 'host') { this._coopProvoke(m); return; }
    if (m.t === 'coopRun') { if (this.player) this.player.coopRun = true; this._coopApplyNoPrism(); return; }
  },

  _coopAdoptClock(t) {
    if (!Number.isFinite(t)) return;
    if (Math.abs((this._clockT || 0) - t) > 5) this._clockT = t;
  },

  /** From `_closeCharacterCreator`: the guest's character is made. Into the host's world beside them, as soon as the
   *  host is in it (the host may still be making their own character). Returns true: the sewer start is ours. */
  _coopGuestArrive() {
    const c = this._coop();
    if (c.role !== 'guest' || this._coopArrived) return false;
    if (this.player) this.player.coopRun = true;   // ROUND 432 -- a co-op run: no Prism
    const w = c.hostWorld;
    if (!w || !w.ready) {
      c.arriveWhenWorld = true;
      this._floatText(this.world.x, this.world.y - 70, `Waiting for ${(c.peer && c.peer.name) || 'the host'} to step into the world…`, '#a5d6a7');
      return true;
    }
    this._coopGuestStep(w);
    return true;
  },

  /** The step across: the host's seed, the hour, and where they stand. In the prologue's sewer, the guest starts in
   *  the sewer with them ("Player 2 starts in the sewer with the host"); anywhere else, the prologue is skipped. */
  _coopGuestStep(w) {
    const c = this._coop();
    this._coopArrived = true;
    if (w.runSeed && this.player) {
      this.player.runSeed = w.runSeed; this._runSeed = w.runSeed;
      if (!this.player.sewerDone && this._reseedSewerStones) { try { this._reseedSewerStones(w.runSeed); } catch (e) { /* the stones stay as rolled */ } }
    }
    this._coopAdoptClock(w.clockT);
    const inSewer = !!(w.room && this.sewer && this.sewer.room && w.room === this.sewer.room.id && !this.player.sewerDone);
    if (inSewer && this._startInSewer && this._startInSewer()) {
      if (this.teleportTo) this.teleportTo(w.x + ARRIVE_OFFSET / 2, w.y + ARRIVE_OFFSET / 2);
    } else {
      if (this._skipPrologue) { try { this._skipPrologue(); } catch (e) { console.warn('[coop] prologue skip', e && e.message); } }
      const ax = w.room ? w.ox : w.x, ay = w.room ? w.oy : w.y;
      if (Number.isFinite(ax) && Number.isFinite(ay) && this.teleportTo) this.teleportTo(ax + ARRIVE_OFFSET, ay + ARRIVE_OFFSET);
    }
    this._coopApplyNoPrism();
    // the guest's own monsters go back to sleep: the host's are the ones in this world
    for (const g of (this.spawnGroups || [])) { if (g && g.awake && this._sleepSpawnGroup) { try { this._sleepSpawnGroup(g); } catch (e) { /* asleep */ } } }
    this._coopSend({ t: 'arrived', name: this.player.name });
    this._coopSend({ t: 'name', name: this.player.name });
    this._floatText(this.world.x, this.world.y - 70, inSewer ? 'You wake in the dark, and you are not alone' : `You step into ${(c.peer && c.peer.name) || 'the host'}'s world`, '#a5d6a7');
  },

  // ------------------------------------------------------------------------------------------------ the tick
  _coopTick(dt) {
    this._coopApplyNoPrism();   // ROUND 432 -- a co-op run, connected or not, has no Prism
    const c = this._coopState;
    if (!c || !c.link || !c.link.open) return;
    this._coopSendT = (this._coopSendT || 0) + dt * 1000;
    if (this._coopSendT >= SEND_MS) { this._coopSendT = 0; this._coopSendSelf(); }
    if (c.role === 'host') {
      this._coopClockT = (this._coopClockT || 0) + dt;
      if (this._coopClockT >= CLOCK_SYNC_S) { this._coopClockT = 0; this._coopSendWorld(); }   // ROUND 432 -- the hour, and whether the host is in yet
    }
    this._coopMoveRemote(dt);
    if (c.role === 'host') {
      this._coopMonT = (this._coopMonT || 0) + dt * 1000;
      if (this._coopMonT >= MON_SEND_MS) { this._coopMonT = 0; this._coopSendMons(); this._coopSendPeople(); }
    } else {
      this._coopPuppetTick(dt); this._coopPeopleTick(dt);
      // ROUND 433 -- coming together after being apart: the guest's own monsters make way for the host's
      const q = this._coopArrived && this._coopTogether();
      if (q && c.apart) this._coopSleepOwn();
      c.apart = this._coopArrived && !q;
    }
  },

  /** What my player sprite shows, as the other game needs it to show the same. */
  _coopSendSelf() {
    const sp = this.playerSprite;
    if (!sp || !sp.texture || !this.player) return;
    if (this._coopIsGuest() && !this._coopArrived) return;
    this._coopSend({
      t: 'p', x: Math.round(this.world.x), y: Math.round(this.world.y),
      rg: this.currentRegion ? this.currentRegion.id : null, rm: this._insideRoom ? this._insideRoom.id : null,
      k: this._coopTexKey(sp.texture), f: sp.frame ? sp.frame.name : 0,
      ox: +sp.originX.toFixed(3), oy: +sp.originY.toFixed(3), fx: sp.flipX ? 1 : 0,
      sx: +sp.scaleX.toFixed(3), sy: +sp.scaleY.toFixed(3), a: +(sp.alpha || 1).toFixed(2), v: sp.visible ? 1 : 0,
      hp: Math.round(this.player.hp || 0), mhp: Math.round(this.player.maxHp || 1),
      b: this._coopBusy(),   // ROUND 433 -- talking, trading, in a menu, down
    }, true);
  },

  /** A sheet's name for the wire: its key, and a version that changes when the texture under that key is remade. */
  _coopTexKey(tex) {
    this._coopTexVer = this._coopTexVer || new WeakMap();
    this._coopTexVerN = this._coopTexVerN || {};
    let v = this._coopTexVer.get(tex);
    if (v === undefined) { v = this._coopTexVerN[tex.key] = (this._coopTexVerN[tex.key] || 0) + 1; this._coopTexVer.set(tex, v); }
    return `${tex.key}@${v}`;
  },

  /** Send a sheet the other game asked for: the picture, and where its frames are. */
  _coopSendTexture(wireKey) {
    const key = String(wireKey || '').replace(/@\d+$/, '');
    if (!this.textures.exists(key)) return;
    const tex = this.textures.get(key);
    if (this._coopTexKey(tex) !== wireKey) return;   // remade since; they will ask for the new one
    try {
      const src = tex.getSourceImage();
      let url;
      if (src instanceof HTMLCanvasElement) url = src.toDataURL('image/png');
      else {
        const cv = document.createElement('canvas');
        cv.width = src.width; cv.height = src.height;
        cv.getContext('2d').drawImage(src, 0, 0);
        url = cv.toDataURL('image/png');
      }
      const frames = [];
      for (const name of tex.getFrameNames()) {
        const fr = tex.get(name);
        frames.push([name, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight]);
      }
      this._coopSend({ t: 'tex', k: wireKey, url, frames });
    } catch (e) { console.warn('[coop] could not send sheet', key, e && e.message); }
  },

  _coopTakeTexture(m) {
    const local = `coopR:${m.k}`;
    const r = this._coopRemoteRec();
    const img = new Image();
    img.onload = () => {
      if (!this.textures) return;
      if (this.textures.exists(local)) this.textures.remove(local);
      const tex = this.textures.addImage(local, img);
      for (const [name, x, y, w, h] of (m.frames || [])) { if (!tex.has(name)) tex.add(name, 0, x, y, w, h); }
      r.tex.set(m.k, local);
      const st = this._coopState;
      if (st && st.ptex) st.ptex.set(m.k, local);   // ROUND 432 -- a person's sheet
    };
    img.src = m.url;
  },

  // ------------------------------------------------------------------------------------------------ the other player
  _coopRemoteRec() {
    const c = this._coop();
    if (!c.remote) c.remote = { sprite: null, label: null, bar: null, tex: new Map(), x: 0, y: 0, tx: 0, ty: 0, seen: false, last: null };
    return c.remote;
  },

  _coopRemoteState(m) {
    const r = this._coopRemoteRec();
    r.last = m;
    r.tx = m.x; r.ty = m.y;
    if (!r.seen) { r.x = m.x; r.y = m.y; r.seen = true; }
    if (!r.tex.has(m.k)) {
      // ROUND 432 -- a sheet already taken (before a re-pair) is used again, not asked for and remade
      if (this.textures.exists(`coopR:${m.k}`)) r.tex.set(m.k, `coopR:${m.k}`);
      else { r.tex.set(m.k, 'pending'); this._coopSend({ t: 'texReq', k: m.k }); }
    }
  },

  _coopMoveRemote(dt) {
    const c = this._coopState;
    const r = c && c.remote;
    if (!r || !r.last) return;
    const m = r.last;
    const here = (this.currentRegion ? this.currentRegion.id : null) === m.rg && (this._insideRoom ? this._insideRoom.id : null) === m.rm;
    const local = r.tex.get(m.k);
    const ready = local && local !== 'pending' && this.textures.exists(local);
    if (!r.sprite) {
      if (!ready) return;
      const pt = isoProject(r.x, r.y);
      r.sprite = this.add.sprite(pt.x, pt.y, local, m.f);
      r.label = this.add.text(pt.x, pt.y - 96, (c.peer && c.peer.name) || 'Player 2', { fontFamily: 'system-ui, sans-serif', fontSize: '13px', color: '#a5d6a7', stroke: '#0b0d10', strokeThickness: 3 }).setOrigin(0.5, 1);
    }
    // ease toward where they are; snap if they jumped (a door, a teleport)
    const d = Math.hypot(r.tx - r.x, r.ty - r.y);
    if (d > 12 * TILE) { r.x = r.tx; r.y = r.ty; }
    else { const k = Math.min(1, dt * 12); r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; }
    const sp = r.sprite;
    const vis = here && !!m.v;
    sp.setVisible(vis);
    r.label.setVisible(vis);
    if (!vis) return;
    if (ready && (sp.texture.key !== local || sp.frame.name !== m.f)) {
      if (sp.texture.key !== local) sp.setTexture(local, m.f);
      else if (sp.texture.has(m.f)) sp.setFrame(m.f);
    }
    sp.setOrigin(m.ox, m.oy);
    sp.setFlipX(!!m.fx);
    sp.setScale(m.sx, m.sy);
    sp.setAlpha(m.a);
    const pt = isoProject(r.x, r.y);
    sp.setPosition(pt.x, pt.y);
    sp.setDepth(isoDepth(r.x, r.y) + 0.6);
    // ROUND 431 -- their health with their name, once it is not full
    const nm = (c.peer && c.peer.name) || 'Player 2';
    const doing = ({ talk: 'talking', shop: 'trading', menu: 'in a menu', down: 'down' })[m.b] || '';   // ROUND 433
    const want = (m.mhp && m.hp < m.mhp ? `${nm}  ${Math.max(0, m.hp)}/${m.mhp}` : nm) + (doing ? `  (${doing})` : '');
    if (r.label.text !== want) { r.label.setText(want); r.label.setColor(m.mhp && m.hp / m.mhp < 0.3 ? '#ef9a9a' : '#a5d6a7'); }
    r.label.setPosition(pt.x, pt.y - Math.max(70, sp.displayHeight * m.oy) - 6);
    r.label.setDepth(isoDepth(r.x, r.y) + 2000);
  },

  _coopDropRemote() {
    const c = this._coopState;
    const r = c && c.remote;
    if (!r) return;
    if (r.sprite) r.sprite.destroy();
    if (r.label) r.label.destroy();
    c.remote = null;
  },

  // ================================================================================================ ROUND 431
  // THE FIGHT, SHARED. The host's game runs every monster; the guest's game shows them as PUPPETS: real monster
  // objects (made by the guest's own `_spawnMonster`, so they draw, target, and take spells like any other) that
  // think nothing for themselves. Ten times a second the host sends each one near the guest: where it is, which way
  // it faces, whether it moves or swings, and its health.
  //   the guest hits one   the blow is sent to the host, who lands it on the real monster (credit off: the host
  //                        earns nothing from it), and the monster turns on the guest
  //   one hits the guest   the host's monster picks the guest as a victim like any companion; its blow is sent,
  //                        and the guest's game takes it as if its own monster had struck
  //   one dies             the guest is told. Killed by the guest, the guest's own `_killMonster` runs on the
  //                        puppet: the guest's XP, kill counts and loot, in the guest's world. Killed by anyone
  //                        else, the puppet falls and is gone.

  /** HOST: where the guest stands, for a monster choosing whom to hit (null when they are not here). */
  _coopGuestTarget() {
    const c = this._coopState;
    const r = c && c.role === 'host' && c.link && c.link.open ? c.remote : null;
    if (!r || !r.last || !r.seen) return null;
    const m = r.last;
    if ((this.currentRegion ? this.currentRegion.id : null) !== m.rg || (this._insideRoom ? this._insideRoom.id : null) !== m.rm) return null;
    if (!(m.hp > 0) || !m.v || m.b === 'down') return null;   // ROUND 433 -- a guest who is down is passed over (a menu is no shelter)
    return { x: r.x, y: r.y, hpFrac: m.mhp ? m.hp / m.mhp : 1 };
  },
  _coopGuestAggroReach() { return GUEST_AGGRO_REACH; },

  /** HOST: the monsters near the guest. */
  _coopSendMons() {
    const g = this._coopGuestTarget();
    const r = this._coopState && this._coopState.remote;
    if (!r || !r.last) return;
    const gx = r.x, gy = r.y;
    const out = [];
    const reach = MON_SEND_TILES * TILE;
    const here = (this.currentRegion ? this.currentRegion.id : null) === r.last.rg && (this._insideRoom ? this._insideRoom.id : null) === r.last.rm;
    if (here) {
      for (const m of (this.monsters || [])) {
        if (!m.alive || m.dummy || m._coopPuppet || !m.type) continue;
        if (Math.abs(m.wx - gx) > reach || Math.abs(m.wy - gy) > reach) continue;
        const sp = m.sprite;
        out.push([m.uid, m.key, Math.round(m.wx), Math.round(m.wy), m.facing || 'south', m.moving ? 1 : 0,
          +(m.attackT || 0).toFixed(2), Math.round(m.hp), Math.round(m.maxHp), m.rank || null,
          sp ? +Math.abs(sp.scaleX).toFixed(3) : 0, sp && sp.visible ? 1 : 0]);
      }
    }
    this._coopSend({ t: 'mons', l: out, g: !!g }, out.length < 120);
  },

  /** HOST: a blow the guest landed on one of our monsters. */
  _coopGuestHit(msg) {
    const m = (this.monsters || []).find(x => x.uid === msg.uid);
    if (!m || !m.alive) return;
    const was = this._dsByPet;
    this._dsByPet = true;            // not the host's hand (Healing's secret, the host's kill credit)
    this._coopGuestHitting = true;
    try { this._damageMonster(m, Math.max(0, +msg.dmg || 0), false, !!msg.phys, msg.el || null); }
    finally { this._dsByPet = was; this._coopGuestHitting = false; }
    if (m.alive) {
      const now = this._combatClock || (this.time ? this.time.now / 1000 : 0);
      m._victim = { isGuest: true, isPlayer: false, member: null, until: now + 3 };
      if (m.state === 'wander' || m.state === 'idle') m.state = 'chase';
    }
  },

  /** HOST, from `_killMonster`: tell the guest one has died, and whose blow it was. */
  _coopHostKilled(m) {
    const c = this._coopState;
    if (!c || c.role !== 'host' || !c.link || !c.link.open || !m || m._coopPuppet) return;
    // ROUND 432 -- whose blow was LAST (a blow, a burn), and the other's ASSIST if they struck within ASSIST_S
    const now = this._clockT || 0;
    const byGuest = m._coopLastHitBy === 'guest' || !!this._coopGuestHitting;
    const guestAssist = !byGuest && m._coopGuestHitAt != null && now - m._coopGuestHitAt <= ASSIST_S;
    if (byGuest && m._coopHostHitAt != null && now - m._coopHostHitAt <= ASSIST_S) this._coopAssist(m, false);
    this._coopSend({ t: 'died', uid: m.uid, byGuest, assist: guestAssist });
  },

  /** An assist: the kill's XP, banked. */
  _coopAssist(m, person) {
    const xp = Math.max(0, Math.round(this._coopKillXp ? this._coopKillXp(m, person) : 0));
    if (!xp || !this.player) return 0;
    this.player.pendingXp = (this.player.pendingXp || 0) + xp;
    this._floatText(m.wx != null ? m.wx : m.x, (m.wy != null ? m.wy : m.y) - 54, `+${xp} XP (assist)`, '#b39ddb');
    return xp;
  },

  /** HOST, from the monster blow: this monster is swinging at the guest. */
  _coopMonsterHitsGuest(m, dmg, isCrit) {
    this._coopSend({ t: 'hurt', uid: m.uid, dmg, crit: !!isCrit });
  },

  /** GUEST: the host's monsters near us, as puppets. */
  _coopApplyMons(msg) {
    const c = this._coop();
    if (!this._coopArrived) return;
    const P = c.puppets = c.puppets || new Map();
    const seen = new Set();
    for (const [uid, key, x, y, facing, moving, attackT, hp, maxHp, rank, scale, vis] of (msg.l || [])) {
      seen.add(uid);
      let m = P.get(uid);
      if (!m || !m.alive) {
        const was = this._coopSpawning;
        this._coopSpawning = true;
        try { m = this._spawnMonster(key, x, y, null, null); } catch (e) { m = null; } finally { this._coopSpawning = was; }
        if (!m) continue;
        m._coopPuppet = true; m._coopUid = uid; m.state = 'puppet'; m.lurk = false; m.disguised = false;
        P.set(uid, m);
      }
      m._tx = x; m._ty = y;
      m.facing = facing; m.moving = !!moving; m.attackT = attackT;
      m.hp = hp; m.maxHp = maxHp;
      if (rank) m.rank = rank;
      m._coopVis = !!vis;
      if (scale && m.sprite) m._coopScale = scale;
    }
    // gone from the host's list (out of reach, or despawned): gone here
    for (const [uid, m] of P) {
      if (seen.has(uid)) continue;
      this._coopDropPuppet(m);
      P.delete(uid);
    }
  },

  _coopDropPuppet(m) {
    m.alive = false;
    if (m.sprite && m.sprite.active) m.sprite.destroy();
    this.monsters = (this.monsters || []).filter(x => x !== m);
  },

  /** GUEST: puppets ease toward where the host says they are, and draw with our own monster drawing. */
  _coopPuppetTick(dt) {
    const P = this._coopState && this._coopState.puppets;
    if (!P) return;
    const k = Math.min(1, dt * 10);
    for (const m of P.values()) {
      if (!m.alive || m._tx == null) continue;
      if (Math.hypot(m._tx - m.wx, m._ty - m.wy) > 10 * TILE) { m.wx = m._tx; m.wy = m._ty; }
      else { m.wx += (m._tx - m.wx) * k; m.wy += (m._ty - m.wy) * k; }
      this._coopForwardStatus(m);   // ROUND 432
      if (m.sprite && m.sprite.active) {
        if (m._coopScale) m.sprite.setScale(m._coopScale);
        try { this._updateMonsterSprite(m); } catch (e) { /* drawn next frame */ }
        if (!m._coopVis) m.sprite.setVisible(false);
      }
    }
  },

  /** GUEST, from `_damageMonster`: a blow on a puppet goes to the host. Returns what was dealt. */
  _coopPuppetHit(m, dmg, physical, element) {
    const d = Math.max(0, Math.round(dmg || 0));
    if (!m.alive || d <= 0) return 0;
    this._coopSend({ t: 'hit', uid: m._coopUid, dmg: d, phys: !!physical, el: element || null });
    if (this._personHitFloat) this._personHitFloat(m.wx, m.wy - 30, d);
    else this._floatText(m.wx, m.wy - 30, String(d), '#ffffff');
    return d;
  },

  /** GUEST: a host monster's blow on us. */
  _coopHurt(msg) {
    const P = this._coopState && this._coopState.puppets;
    const m = P && P.get(msg.uid);
    if (!m || !this.player || this.player.dead) return;
    if (this.player.invuln > 0) return;
    try { this._monsterHitPlayer(m, Math.max(0, +msg.dmg || 0), !!msg.crit); } catch (e) { console.warn('[coop] hurt', e && e.message); }
  },

  /** GUEST: one of the host's monsters has died. */
  _coopPuppetDied(msg) {
    const P = this._coopState && this._coopState.puppets;
    const m = P && P.get(msg.uid);
    if (!m || !m.alive) return;
    P.delete(msg.uid);
    if (msg.byGuest) {
      m._coopPuppet = false;   // ours now, for its death: our XP, our kill counts, our loot
      m.hp = 0;
      try { this._killMonster(m, true); return; } catch (e) { console.warn('[coop] kill', e && e.message); }
    }
    if (msg.assist) this._coopAssist(m, false);   // ROUND 432 -- we helped: the kill's XP, banked
    this._coopDropPuppet(m);
  },

  // ================================================================================================ ROUND 432
  // AFFLICTIONS. A poison, a slow, a freeze or a burn the guest lays on a puppet goes to the host and is laid on the
  // real monster. `_applyDebuff` and `_applyDot` hand them over directly; the effects other code writes straight
  // onto a monster (frozenT, slowT and the like) are noticed on the puppet each frame and sent, then cleared there.
  _coopJsonSafe(o) {
    const out = {};
    for (const [k, v] of Object.entries(o || {})) {
      if (v == null || typeof v === 'function' || typeof v === 'object') continue;
      out[k] = v;
    }
    return out;
  },
  _coopPuppetDebuff(m, key, opts) {
    this._coopSend({ t: 'deb', uid: m._coopUid, key, opts: this._coopJsonSafe(opts) });
    return null;
  },
  _coopPuppetDot(m, spec) {
    this._coopSend({ t: 'dot', uid: m._coopUid, spec: this._coopJsonSafe(spec) });
    return null;
  },
  _coopGuestDebuff(msg) {
    const m = (this.monsters || []).find(x => x.uid === msg.uid && x.alive);
    if (!m) return;
    try { this._applyDebuff(m, msg.key, { ...(msg.opts || {}), fromPlayer: false, coopGuest: true }); } catch (e) { console.warn('[coop] debuff', e && e.message); }
    m._coopGuestHitAt = this._clockT || 0;
  },
  _coopGuestDot(msg) {
    const m = (this.monsters || []).find(x => x.uid === msg.uid && x.alive);
    if (!m || !msg.spec) return;
    try { this._applyDot(m, msg.spec, false); } catch (e) { console.warn('[coop] dot', e && e.message); return; }
    if (m.dot) m.dot.coopGuest = true;
    m._coopGuestHitAt = this._clockT || 0;
  },
  _coopGuestStatus(msg) {
    const m = (this.monsters || []).find(x => x.uid === msg.uid && x.alive);
    if (!m || !msg.s) return;
    for (const k of STATUS_KEYS) if (msg.s[k] > 0) m[k] = Math.max(m[k] || 0, msg.s[k]);
    if (msg.s.slowPct > 0) m.slowPct = Math.max(m.slowPct || 0, msg.s.slowPct);
    if (msg.s.confusePct > 0) m.confusePct = msg.s.confusePct;
  },
  /** GUEST: anything another system wrote straight onto a puppet goes to the host. */
  _coopForwardStatus(m) {
    let sent = null;
    for (const k of STATUS_KEYS) if (m[k] > 0) { (sent = sent || {})[k] = m[k]; m[k] = 0; }
    if (sent) {
      if (m.slowPct > 0) { sent.slowPct = m.slowPct; m.slowPct = 0; }
      if (m.confusePct > 0) sent.confusePct = m.confusePct;
      this._coopSend({ t: 'st', uid: m._coopUid, s: sent });
    }
  },

  // ------------------------------------------------------------------------------------------------ people
  // Hostile people on the host's `_banditFolk` (a bandit town's crew, a road crew, hunters, a camp) come to the guest
  // the same way monsters do: as puppets on the guest's own `_banditFolk`, which the guest's swings, spells and
  // targeting already know. A bandit town's crew and a road crew go for whichever of you is nearer.
  _coopFoeAim(c) {
    const g = this._coopGuestTarget ? this._coopGuestTarget() : null;
    const dp = Math.hypot(this.world.x - c.x, this.world.y - c.y);
    if (g && Math.hypot(g.x - c.x, g.y - c.y) < dp) return { x: g.x, y: g.y, guest: true };
    return { x: this.world.x, y: this.world.y, guest: false };
  },
  _coopPersonHitsGuest(c, dmg) { this._coopSend({ t: 'phurt', uid: c.uid, dmg: Math.round(dmg || 0) }); },

  _coopSendPeople() {
    const r = this._coopState && this._coopState.remote;
    if (!r || !r.last) return;
    const here = (this.currentRegion ? this.currentRegion.id : null) === r.last.rg && (this._insideRoom ? this._insideRoom.id : null) === r.last.rm;
    const reach = MON_SEND_TILES * TILE;
    const out = [];
    if (here) {
      for (const c of (this._banditFolk || [])) {
        if (!c.alive || c.despawned || c._coopPuppet || !c.sprite || c.uid == null) continue;
        if (Math.abs(c.x - r.x) > reach || Math.abs(c.y - r.y) > reach) continue;
        const sp = c.sprite;
        out.push([c.uid, c.name || '', this._coopTexKey(sp.texture), sp.frame ? sp.frame.name : 0, Math.round(c.x), Math.round(c.y),
          +sp.originX.toFixed(3), +sp.originY.toFixed(3), sp.flipX ? 1 : 0, +sp.scaleX.toFixed(3), +sp.scaleY.toFixed(3),
          Math.round(c.hp || 0), Math.round(c.maxHp || 1), c.tier || 0, sp.visible ? 1 : 0]);
      }
    }
    this._coopSend({ t: 'folk', l: out }, out.length < 80);
  },

  _coopGuestPersonHit(msg) {
    const c = (this._banditFolk || []).find(x => x.uid === msg.uid && x.alive);
    if (!c) return;
    const was = this._dsByPet;
    this._dsByPet = true; this._coopGuestHitting = true;
    try { this._hitOneBandit(c, Math.max(0, +msg.dmg || 0)); } finally { this._dsByPet = was; this._coopGuestHitting = false; }
    if (c.alive) c.hostile = true;
  },

  _coopHostPersonKilled(c) {
    const st = this._coopState;
    if (!st || st.role !== 'host' || !st.link || !st.link.open || !c || c._coopPuppet) return;
    const now = this._clockT || 0;
    const byGuest = c._coopLastHitBy === 'guest';
    const assist = !byGuest && c._coopGuestHitAt != null && now - c._coopGuestHitAt <= ASSIST_S;
    if (byGuest && c._coopHostHitAt != null && now - c._coopHostHitAt <= ASSIST_S) this._coopAssist(c, true);
    this._coopSend({ t: 'pdied', uid: c.uid, byGuest, assist });
  },

  _coopProvoke(msg) {
    const town = this._banditTowns && this._banditTowns[msg.town];
    if (town && !town.hostile && this._banditTurnHostile) this._banditTurnHostile(town);
  },

  /** GUEST: the host's people near us. */
  _coopApplyPeople(msg) {
    const st = this._coop();
    if (!this._coopArrived) return;
    const P = st.people = st.people || new Map();
    const seen = new Set();
    for (const [uid, name, wire, frame, x, y, ox, oy, fx, sx, sy, hp, maxHp, tier, vis] of (msg.l || [])) {
      seen.add(uid);
      const tex = this._coopPersonTex(wire);
      let c = P.get(uid);
      if (!c || !c.alive) {
        if (!tex) continue;   // its sheet is on its way
        const pt = isoProject(x, y);
        const sprite = this.add.sprite(pt.x, pt.y, tex, frame);
        c = { uid: `coop:${uid}`, _coopPuppet: true, _coopUid: uid, name, sprite, artKey: tex, texKey: tex, x, y, hp, maxHp, tier,
          alive: true, hostile: true, person: true, damage: 0, speed: 0 };
        (this._banditFolk = this._banditFolk || []).push(c);
        P.set(uid, c);
      }
      c._tx = x; c._ty = y; c.hp = hp; c.maxHp = maxHp; c._vis = !!vis;
      const sp = c.sprite;
      if (sp && sp.active) {
        if (sp.texture.key !== tex && this.textures.exists(tex)) sp.setTexture(tex, frame);
        else if (sp.texture.has(frame)) sp.setFrame(frame);
        sp.setOrigin(ox, oy); sp.setFlipX(!!fx); sp.setScale(sx, sy);
      }
    }
    for (const [uid, c] of P) {
      if (seen.has(uid)) continue;
      this._coopDropPerson(c);
      P.delete(uid);
    }
  },
  /** A person's sheet: the guest's own when it has made the same one, else the host's, asked for once. */
  _coopPersonTex(wire) {
    const st = this._coop();
    const own = String(wire || '').replace(/@\d+$/, '');
    if (this.textures.exists(own)) return own;
    st.ptex = st.ptex || new Map();
    const got = st.ptex.get(wire);
    if (got && got !== 'pending' && this.textures.exists(got)) return got;
    if (this.textures.exists(`coopR:${wire}`)) { st.ptex.set(wire, `coopR:${wire}`); return `coopR:${wire}`; }
    if (!got) { st.ptex.set(wire, 'pending'); this._coopSend({ t: 'texReq', k: wire }); }
    return null;
  },
  _coopDropPerson(c) {
    c.alive = false; c.despawned = true;
    if (c.sprite && c.sprite.active) c.sprite.destroy();
    this._banditFolk = (this._banditFolk || []).filter(x => x !== c);
  },
  _coopPeopleTick(dt) {
    const P = this._coopState && this._coopState.people;
    if (!P) return;
    const k = Math.min(1, dt * 10);
    for (const c of P.values()) {
      if (!c.alive || c._tx == null) continue;
      if (Math.hypot(c._tx - c.x, c._ty - c.y) > 10 * TILE) { c.x = c._tx; c.y = c._ty; }
      else { c.x += (c._tx - c.x) * k; c.y += (c._ty - c.y) * k; }
      if (c.sprite && c.sprite.active) {
        const pt = isoProject(c.x, c.y);
        c.sprite.setPosition(pt.x, pt.y);
        c.sprite.setDepth(isoDepth(c.x, c.y) + 0.5);
        c.sprite.setVisible(c._vis);
      }
    }
  },
  /** GUEST, from `_hitOneBandit`: a blow on the host's person goes to the host. */
  _coopPersonPuppetHit(c, amount) {
    const d = Math.max(0, Math.round(amount || 0));
    if (!c.alive || d <= 0) return false;
    this._coopSend({ t: 'phit', uid: c._coopUid, dmg: d });
    if (this._personHitFloat) this._personHitFloat(c.x, c.y - 30, d);
    return true;
  },
  _coopPersonHurt(msg) {
    const P = this._coopState && this._coopState.people;
    const c = P && P.get(msg.uid);
    if (!c || !this.player || this.player.dead || this.player.invuln > 0) return;
    try { this._monsterHitPlayer(this._personFace(c, 'bandit'), Math.max(0, +msg.dmg || 0), false); } catch (e) { console.warn('[coop] person hurt', e && e.message); }
  },
  _coopPersonDied(msg) {
    const P = this._coopState && this._coopState.people;
    const c = P && P.get(msg.uid);
    if (!c || !c.alive) return;
    P.delete(msg.uid);
    if (msg.byGuest) {
      c._coopPuppet = false;   // ours for its death: the body, the loot, the XP
      c.hp = 1;
      try { this._hitOneBandit(c, 999999); } catch (e) { console.warn('[coop] person kill', e && e.message); }
      this._banditFolk = (this._banditFolk || []).filter(x => x !== c || x.alive);
      return;
    }
    if (msg.assist) this._coopAssist(c, true);
    this._coopDropPerson(c);
  },

  // ------------------------------------------------------------------------------------------------ Prism
  /** "Prism is absent in co-op." A co-op run (`player.coopRun`) never meets her: she is not in the sewer, not in
   *  the hall, offers no chain and sends no nemesis. One already walking with you before the run turned co-op stays. */
  _coopApplyNoPrism() {
    const p = this.player;
    if (!p || !p.coopRun) return;
    for (const m of (this.party || [])) {
      if (!m || m.id !== 'prism' || m.recruited) continue;
      if (!m.coopAbsent) { m.coopAbsent = true; m.benched = true; }
      if (m.sprite && m.sprite.visible) m.sprite.setVisible(false);
      if (m._npcEntry && !m._npcEntry.hidden) m._npcEntry.hidden = true;
    }
  },

  /** For the tests and the notes: what the link and the other player look like right now. */
  _coopCensus() {
    const c = this._coopState;
    if (!c) return { role: null };
    const r = c.remote;
    return {
      role: c.role, status: c.status, open: this._coopOn(), peer: c.peer ? c.peer.name : null, arrived: !!this._coopArrived,
      remote: r ? { seen: r.seen, drawn: !!(r.sprite && r.sprite.visible), x: Math.round(r.x), y: Math.round(r.y), sheets: r.tex.size, tex: r.sprite ? r.sprite.texture.key : null } : null,
    };
  },
};
