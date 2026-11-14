// ============================================================================
// ROUND 371 -- THE BUG REPORT.
//
//   "Lets add a bug report system into the game that saves state character information, location, essences, and a
//    screenshot when used."
//
// F8 (or "Report a bug" in Options, or on the Sound page of the player menu, which a controller reaches) takes a
// screenshot of the game as it is that moment, BEFORE the report window covers it, and opens the report. The report
// holds:
//   * what the player writes about it;
//   * the character: name, rank and standing, health, mana and stamina, attributes, outfit and hands, coins,
//     proficiencies, appearance;
//   * where: region, room, world position, the clock and day, the weather, the elevation, the world map;
//   * the essences and stones in every slot, the confluence, and every ability in the kit (with the fields a
//     duplicate-perception or a missing-proficiency report needs: template, kind, category, slot, socket, canon,
//     proficiency, the weapon it asks for);
//   * the game version, the browser, the screen, the controller;
//   * the last warnings and errors the page logged (collected from the moment the game starts);
//   * a FULL save of the run (the same capture the save menu writes), so the moment can be loaded and replayed.
//
// The reports are kept in the browser's IndexedDB -- NOT in localStorage, where the saves live: a few screenshots
// would fill the 5 MB the saves share and stop the game saving. Each one can be downloaded as one .json (everything,
// the screenshot inside it) and its screenshot as a .png. If IndexedDB is not available the report can still be
// downloaded from the window; it just is not kept.
// ============================================================================

import { GAME_VERSION } from '../data/version.js';
import { captureSave } from '../data/saves.js';
import { STONE_CATALOG } from '../data/stoneCatalog.js';
import { ESSENCES } from '../data/abilities.js';

const DB_NAME = 'sparkstone-bugreports';
const STORE = 'reports';
const LOG_MAX = 120;
/** The most reports kept: past this the oldest goes. */
export const BUG_REPORT_KEEP = 40;

// ---- the page's own log, from boot -------------------------------------------
/** Start collecting warnings, errors and uncaught faults into `window.__sparkstoneLog` (once per page). */
export function installBugLog() {
  if (typeof window === 'undefined' || window.__sparkstoneLog) return;
  const log = window.__sparkstoneLog = [];
  const push = (kind, args) => {
    try {
      const text = Array.from(args).map(a => {
        if (a instanceof Error) return `${a.message}\n${(a.stack || '').split('\n').slice(0, 4).join('\n')}`;
        if (typeof a === 'string') return a;
        try { return JSON.stringify(a).slice(0, 300); } catch (e) { return String(a); }
      }).join(' ').slice(0, 800);
      log.push({ t: Date.now(), kind, text });
      if (log.length > LOG_MAX) log.splice(0, log.length - LOG_MAX);
    } catch (e) { /* the log must never be the fault */ }
  };
  for (const kind of ['warn', 'error']) {
    const orig = console[kind];
    if (typeof orig !== 'function') continue;
    console[kind] = function (...args) { push(kind, args); return orig.apply(this, args); };
  }
  window.addEventListener('error', (ev) => push('pageerror', [ev.message + (ev.filename ? ` @ ${ev.filename.split('/').pop()}:${ev.lineno}` : '')]));
  window.addEventListener('unhandledrejection', (ev) => push('rejection', [ev.reason instanceof Error ? ev.reason : String(ev.reason)]));
}
installBugLog();

// ---- storage -------------------------------------------------------------------
function openDb() {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') { reject(new Error('no IndexedDB')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB would not open'));
    } catch (e) { reject(e); }
  });
}
function tx(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    let out;
    Promise.resolve(fn(st, (v) => { out = v; })).catch(reject);
    t.oncomplete = () => { db.close(); resolve(out); };
    t.onerror = () => { db.close(); reject(t.error); };
    t.onabort = () => { db.close(); reject(t.error || new Error('aborted')); };
  }));
}
export function storeBugReport(report) {
  return tx('readwrite', (st) => { st.put(report); }).then(() => pruneBugReports());
}
export function listBugReports() {
  return tx('readonly', (st, done) => {
    const req = st.getAll();
    req.onsuccess = () => done((req.result || []).sort((a, b) => b.createdAt - a.createdAt));
  });
}
export function getBugReport(id) {
  return tx('readonly', (st, done) => { const req = st.get(id); req.onsuccess = () => done(req.result || null); });
}
export function deleteBugReport(id) {
  return tx('readwrite', (st) => { st.delete(id); });
}
function pruneBugReports() {
  return listBugReports().then(list => {
    const old = list.slice(BUG_REPORT_KEEP);
    if (!old.length) return;
    return tx('readwrite', (st) => { for (const r of old) st.delete(r.id); });
  });
}

// ---- helpers -------------------------------------------------------------------
const safe = (fn, dflt = null) => { try { const v = fn(); return v === undefined ? dflt : v; } catch (e) { return dflt; } };
const plainCopy = (v) => safe(() => JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Set ? [...x] : x instanceof Map ? Object.fromEntries(x) : x))), null);
const round1 = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10) / 10 : n);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
function dataUrlToBlob(url) {
  const [head, b64] = String(url).split(',');
  const mime = (/data:([^;]+)/.exec(head) || [])[1] || 'image/png';
  const bin = atob(b64 || ''), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return new Blob([out], { type: mime });
}

export const BugReportMixin = {
  // ---- what the report holds -------------------------------------------------
  /** Everything but the screenshot and the note: a plain object, safe to JSON. Every field is read defensively; a
   *  report is written when something is already wrong. */
  _bugReportState() {
    const p = this.player || {};
    const ESS = ESSENCES || {};
    const save = safe(() => captureSave(this, 'bugreport', p.name || 'Bug report'));
    const essName = (id) => (id && ESS[id] && ESS[id].name) || id || null;
    const stoneName = (id) => (id && STONE_CATALOG[id] && (STONE_CATALOG[id].name || STONE_CATALOG[id].label)) || id || null;
    const known = p.knownAbilities || {};
    const abilities = Object.entries(known).map(([key, e]) => {
      const a = (e && e.ability) || {};
      return {
        key, name: a.name || null, kind: a.kind || null, template: a.template || null, category: a.category || null,
        element: a.element || null, slot: safe(() => parseInt(key, 10), null), stone: (e && e.stoneId) || null,
        essence: (e && e.essenceId) || null, canon: !!a.canon || undefined, catKey: a.catKey || undefined,
        sense: a.sense || a.mode || undefined, prof: a.prof || undefined, requiresWeapon: a.requiresWeapon || undefined,
        cost: a.cost == null ? undefined : a.cost, cooldown: a.cooldown == null ? undefined : a.cooldown,
        off: safe(() => (this._passiveOn ? !this._passiveOn(key) : undefined), undefined) || undefined,
      };
    });
    const slots = [0, 1, 2, 3].map(i => ({
      slot: i,
      essence: (p.slotEssence || [])[i] || null,
      essenceName: essName((p.slotEssence || [])[i]),
      stones: ((p.slotStones || [])[i] || []).map(id => ({ id, name: stoneName(id) })),
      progress: plainCopy((p.slotProgress || [])[i]),
      attribute: (p.slotAttr || [])[i] || null,
    }));
    const room = this._insideRoom || null;
    const spr = this.playerSprite || this.player && this.player.sprite || null;
    const g = this.game || {};
    const pad = safe(() => { const ps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; return ps.map(x => x.id); }, []);
    return {
      version: GAME_VERSION,
      createdAt: Date.now(),
      when: new Date().toString(),
      client: {
        userAgent: safe(() => navigator.userAgent),
        window: safe(() => `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio || 1}x`),
        canvas: safe(() => `${g.canvas.width}x${g.canvas.height}`),
        renderer: safe(() => (g.renderer && g.renderer.type === 2 ? 'webgl' : 'canvas')),
        fps: safe(() => round1(g.loop.actualFps)),
        gamepads: pad,
        usingPad: !!this.pad,
      },
      character: {
        name: p.name || null, rank: p.rank || null,
        standing: safe(() => save.summary.standing, undefined),
        hp: round1(p.hp), maxHp: round1(p.maxHp), mana: round1(p.mana), maxMana: round1(p.maxMana),
        stamina: round1(p.stamina), maxStamina: round1(p.maxStamina),
        xp: p.xp, pendingXp: p.pendingXp,
        attributes: plainCopy(p.attributes || p.attrs || null),
        coins: plainCopy(p.coins), kills: this.kills || 0,
        outfit: safe(() => this._outfitId && this._outfitId(), p.outfit || null),
        hands: plainCopy(p.hands), appearance: plainCopy(p.appearance),
        proficiencies: plainCopy(p.prof || null),
        buildClass: plainCopy(p.buildClass || null),
        nature: plainCopy(p.nature || null),
        party: safe(() => (this.party || []).map(m => ({ name: m.name, hp: round1(m.hp), maxHp: round1(m.maxHp) })), []),
      },
      location: {
        region: safe(() => this.currentRegion && { id: this.currentRegion.id, name: this.currentRegion.name }),
        room: room ? { id: room.id || null, name: room.name || room.title || null, astral: !!room.astral, mansionKey: room.mansionKey || undefined } : null,
        world: safe(() => ({ x: round1(this.world.x), y: round1(this.world.y) })),
        sprite: spr ? { x: round1(spr.x), y: round1(spr.y) } : null,
        elevation: safe(() => (this._elevAt && this.world ? round1(this._elevAt(this.world.x, this.world.y)) : undefined), undefined),
        facing: p.facing || null,
        clockT: round1(this._clockT || 0),
        day: safe(() => this._dayIndex && this._dayIndex(), undefined),
        hour: safe(() => round1(this._hourOfDay && this._hourOfDay()), undefined),
        weather: safe(() => { const w = this._weatherTarget && this._weatherTarget(); return w ? (w.id || w.name || String(w)) : null; }),
        weatherShown: safe(() => this._weatherShown && this._weatherShown(), undefined),
        worldMapOpen: !!this._overworldOpen, soulSpace: !!this._soulSpace, sewer: safe(() => !!(this.sewer && room && room === this.sewer.room), false),
      },
      essences: {
        slots,
        confluence: plainCopy(p.confluence || null),
        abilityCount: abilities.length,
        perceptions: abilities.filter(a => a.template === 'perception').map(a => a.name),
        auras: abilities.filter(a => a.template === 'aura').map(a => a.name),
        abilities,
      },
      log: safe(() => (window.__sparkstoneLog || []).slice(-60), []),
      save,
    };
  },

  /** A screenshot of the game canvas, as a data URL (JPEG unless the browser will not), within `ms`; null if none. */
  _bugScreenshot(ms = 1500) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (url) => { if (done) return; done = true; resolve(url || null); };
      const r = this.game && this.game.renderer;
      const fromCanvas = () => {
        try {
          const c = this.game.canvas;
          // a big canvas is halved: the report is for reading, and four of them should not cost 20 MB
          const sc = c.width > 1600 ? 0.5 : 1;
          const o = document.createElement('canvas');
          o.width = Math.round(c.width * sc); o.height = Math.round(c.height * sc);
          o.getContext('2d').drawImage(c, 0, 0, o.width, o.height);
          return o.toDataURL('image/jpeg', 0.85);
        } catch (e) { return null; }
      };
      try {
        if (r && typeof r.snapshot === 'function') {
          // the renderer reads the frame it has just drawn (in WebGL the buffer is gone by the time a timer runs)
          r.snapshot((img) => {
            try {
              if (!img) { finish(fromCanvas()); return; }
              const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
              const sc = w > 1600 ? 0.5 : 1;
              const o = document.createElement('canvas');
              o.width = Math.max(1, Math.round(w * sc)); o.height = Math.max(1, Math.round(h * sc));
              const draw = () => { try { o.getContext('2d').drawImage(img, 0, 0, o.width, o.height); finish(o.toDataURL('image/jpeg', 0.85)); } catch (e) { finish(fromCanvas()); } };
              if (img.complete === false) { img.onload = draw; img.onerror = () => finish(fromCanvas()); } else draw();
            } catch (e) { finish(fromCanvas()); }
          }, 'image/png');
        } else finish(fromCanvas());
      } catch (e) { finish(fromCanvas()); }
      setTimeout(() => finish(fromCanvas()), ms);
    });
  },

  // ---- the window ------------------------------------------------------------
  _bugReportPanel() {
    let el = document.getElementById('bugReportPanel');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'bugReportPanel';
    el.className = 'overlay-panel';
    el.style.cssText = 'display:none; z-index:440; width:min(720px,96vw); max-height:92vh; overflow-y:auto;';
    document.body.appendChild(el);
    if (!document.getElementById('bugReportStyle')) {
      const st = document.createElement('style');
      st.id = 'bugReportStyle';
      st.textContent = `
        #bugReportPanel .panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        #bugReportPanel .br-top { display:flex; gap:12px; flex-wrap:wrap; }
        #bugReportPanel .br-shot { flex:0 0 auto; max-width:300px; }
        #bugReportPanel .br-shot img { display:block; width:100%; max-width:300px; border:1px solid rgba(255,255,255,0.25); border-radius:4px; }
        #bugReportPanel .br-facts { flex:1 1 260px; font-size:12px; line-height:1.45; opacity:0.92; }
        #bugReportPanel .br-facts b { opacity:0.8; font-weight:600; }
        #bugReportPanel textarea { width:100%; box-sizing:border-box; min-height:84px; margin:8px 0; background:rgba(0,0,0,0.45);
          color:inherit; border:1px solid rgba(255,255,255,0.3); border-radius:4px; padding:6px; font:inherit; resize:vertical; }
        #bugReportPanel .br-row { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin:6px 0; }
        #bugReportPanel .br-list { margin-top:10px; border-top:1px solid rgba(255,255,255,0.15); padding-top:6px; font-size:12px; }
        #bugReportPanel .br-item { display:flex; gap:6px; align-items:center; padding:3px 0; flex-wrap:wrap; }
        #bugReportPanel .br-item span { flex:1 1 200px; }
        #bugReportPanel .br-status { font-size:12px; opacity:0.85; min-height:1.2em; }`;
      document.head.appendChild(st);
    }
    el.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-br]');
      if (!t) return;
      this._bugReportClick(t.dataset.br, t.dataset.id || '');
    });
    // typing in the note is typing, not playing: keys stop here
    el.addEventListener('keydown', (ev) => { if (ev.key !== 'Escape') ev.stopPropagation(); });
    return el;
  },

  /** F8 / the buttons: take the screenshot first, then open the window over it. */
  _openBugReport() {
    if (this._bugReportOpen || this._bugReportTaking) return;
    this._bugReportTaking = true;
    const shotP = this._bugScreenshot();
    let state = null;
    try { state = this._bugReportState(); } catch (e) { state = { version: GAME_VERSION, createdAt: Date.now(), stateError: String(e && e.message) }; }
    shotP.then((shot) => {
      this._bugReportTaking = false;
      this._bugDraft = { id: `bug-${state.createdAt}-${Math.floor(Math.random() * 1e6)}`, ...state, note: '', screenshot: shot };
      this._bugReportOpen = true;
      const el = this._bugReportPanel();
      el.style.display = 'block';
      this._renderBugReport();
      const ta = document.getElementById('bugNote');
      // focused a few times over the first second: the frame the window opens on can still hand focus back to the page
      if (ta && !this.pad) for (const ms of [60, 250, 700]) setTimeout(() => { try { if (this._bugReportOpen && document.activeElement !== ta && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('#bugReportPanel'))) ta.focus(); } catch (e) { /* cosmetic */ } }, ms);
    });
  },

  _closeBugReport() {
    const el = document.getElementById('bugReportPanel');
    if (el) el.style.display = 'none';
    if (document.activeElement && document.activeElement.id === 'bugNote') document.activeElement.blur();
    this._bugReportOpen = false;
  },

  _renderBugReport(status) {
    const el = this._bugReportPanel();
    const d = this._bugDraft || {};
    const c = d.character || {}, l = d.location || {}, e = d.essences || {};
    const ess = (e.slots || []).filter(s => s.essence).map(s => `${esc(s.essenceName)}${s.stones.length ? ' (' + s.stones.map(x => esc(x.name)).join(', ') + ')' : ''}`).join('<br>') || 'none';
    const where = [l.room && (l.room.name || l.room.id), l.region && l.region.name].filter(Boolean).map(esc).join(' · ') || 'unknown';
    const prev = (document.getElementById('bugNote') || {}).value;
    el.innerHTML = `
      <div class="panel-head"><span>Report a bug</span><button class="action-btn" data-br="close">Close (Esc)</button></div>
      <div class="br-top">
        <div class="br-shot">${d.screenshot ? `<img alt="Screenshot" src="${d.screenshot}">` : '<i>No screenshot could be taken.</i>'}</div>
        <div class="br-facts">
          <div><b>Version</b> ${esc(d.version)}</div>
          <div><b>Character</b> ${esc(c.name || '?')} · ${esc(c.rank || '')}${c.standing ? ' · ' + esc(c.standing) : ''}</div>
          <div><b>Where</b> ${where}${l.world ? ` (${l.world.x}, ${l.world.y})` : ''}</div>
          <div><b>Essences</b><br>${ess}</div>
          <div><b>Abilities</b> ${e.abilityCount || 0}${(e.perceptions || []).length > 1 ? ` · <b>perceptions</b> ${(e.perceptions || []).map(esc).join(', ')}` : ''}</div>
        </div>
      </div>
      <textarea id="bugNote" placeholder="What happened? What did you expect?">${esc(prev != null ? prev : d.note || '')}</textarea>
      <div class="br-row">
        <button class="action-btn" data-br="save">Save report</button>
        <button class="action-btn" data-br="download">Save and download</button>
        ${d.screenshot ? '<button class="action-btn" data-br="shot">Download screenshot</button>' : ''}
      </div>
      <div class="br-status" id="bugStatus">${esc(status || 'The report keeps your character, where you are, your essences and abilities, a full save of this moment and the screenshot above.')}</div>
      <div class="br-list" id="bugList">Saved reports…</div>`;
    this._renderBugList();
  },

  _renderBugList() {
    const box = document.getElementById('bugList');
    if (!box) return;
    listBugReports().then((list) => {
      if (!list.length) { box.innerHTML = '<i>No saved reports yet.</i>'; return; }
      box.innerHTML = `<div class="br-row"><b style="flex:1">Saved reports (${list.length})</b>
          <button class="action-btn" data-br="all">Download all</button></div>` + list.map(r => `
        <div class="br-item"><span>${esc(new Date(r.createdAt).toLocaleString())} · v${esc(r.version)} · ${esc((r.location && r.location.region && r.location.region.name) || '')}${r.note ? ' · ' + esc(r.note.slice(0, 60)) : ''}</span>
          <button class="action-btn" data-br="dl" data-id="${esc(r.id)}">Download</button>
          <button class="action-btn" data-br="del" data-id="${esc(r.id)}">Delete</button></div>`).join('');
    }).catch(() => { box.innerHTML = '<i>This browser will not keep reports (no IndexedDB): use “Save and download”.</i>'; });
  },

  _bugReportFile(r) {
    return { name: `sparkstone-bug-v${r.version}-${stamp(new Date(r.createdAt))}.json`, blob: new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }) };
  },

  _bugReportClick(kind, id) {
    const d = this._bugDraft;
    const say = (s) => { const st = document.getElementById('bugStatus'); if (st) st.textContent = s; };
    if (kind === 'close') { this._closeBugReport(); return; }
    if ((kind === 'save' || kind === 'download') && d) {
      d.note = ((document.getElementById('bugNote') || {}).value || '').slice(0, 4000);
      if (kind === 'download') { const f = this._bugReportFile(d); download(f.name, f.blob); }
      storeBugReport(d).then(() => {
        d.saved = true;
        say(kind === 'download' ? 'Saved, and downloaded.' : 'Saved. Download it from the list below to send it on.');
        this._renderBugList();
      }).catch(() => say(kind === 'download' ? 'Downloaded. (This browser would not keep a copy.)' : 'This browser would not keep the report: use “Save and download”.'));
      return;
    }
    if (kind === 'shot' && d && d.screenshot) { download(`sparkstone-bug-v${d.version}-${stamp(new Date(d.createdAt))}.jpg`, dataUrlToBlob(d.screenshot)); return; }
    if (kind === 'dl' && id) { getBugReport(id).then(r => { if (r) { const f = this._bugReportFile(r); download(f.name, f.blob); } }); return; }
    if (kind === 'del' && id) { deleteBugReport(id).then(() => this._renderBugList()); return; }
    if (kind === 'all') {
      listBugReports().then(list => {
        if (!list.length) return;
        download(`sparkstone-bugs-v${GAME_VERSION}-${stamp(new Date())}.json`, new Blob([JSON.stringify(list, null, 1)], { type: 'application/json' }));
      });
    }
  },
};
