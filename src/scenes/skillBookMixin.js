// ===========================================================================
// ROUND 310 (item 2) -- SKILL BOOKS: THE SCENE SIDE.
//
// What a book IS lives in src/data/skillBooks.js, and a martial art in
// src/data/martialArts.js. This is the part that needs a scene: carrying a
// book, reading it, and the martial art's live effect on the player.
//
// THE MARTIAL ART IS APPLIED THROUGH THE DOORS EVERY OTHER BUFF USES, rather
// than through a new one:
//   moveSpeed  -> the movement stack's `speedMult`
//   dodge      -> the dodge sum
//   tempo      -> the cooldown rate (`cdRate`)
//   haste      -> the cast-speed reading
//   mend       -> healing received
//   wind/focus/vigor -> `_regenScale`
//   thrift     -> the ability cost door and the weapon swing cost
//   damage/crit/guard -> `passiveMods` (dmgMult, critChance, damageReduction),
//     which the recompute REBUILDS from the kit, so the live delta is carried
//     in `player._martialApplied` and put back after a recompute.
//
// The condition readings are sampled five times a second into
// `this._martialLive`; every door reads that one bag, so nothing here costs a
// scan per swing.
// ===========================================================================

import { RITE_SECONDS, RITE_THEMES, bookThemeFor, riteDrainFor, riteChantLines, THEORY_THEME } from '../data/ritualStage.js';   // ROUND 358
import { isWaterTile } from '../data/town.js';
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { RITUAL_CIRCLES_HD } from '../data/cityProps.js';   // ROUND 388 -- the HD chalk circle under a book rite
import { RANK_ORDER, RANK_LABELS } from '../data/ranks.js';
import { THEORIES, theoryPerkLines, theoryDeepenLabel } from '../data/ritualTheory.js';   // ROUND 357
import {
  learnBook, bookById, skillBooksOf, hasCraft, martialArtOf, canUseSkillBooks, newSkillBooks,
  rollFoundBook, readRiteSeconds, deepenRiteSeconds, deepeningDue,
} from '../data/skillBooks.js';
import { MARTIAL_BY_ID, artCard, effectsFor, martialScale } from '../data/martialArts.js';
import { subtypeOf } from '../data/monsters.js';
import { stockId } from '../data/crafting.js';
import { dishForPart } from '../data/cooking.js';

const SAMPLE_S = 0.2;
const NEAR_FOE = 300;     // world px: "near" for the foe-counting conditions
const STILL_AFTER_S = 0.6;
const KILL_WINDOW_S = 6, HIT_WINDOW_S = 4, STRIKE_WINDOW_S = 2;

export const SkillBookMixin = {
  // ---- books -------------------------------------------------------------

  /** ROUND 311 -- a book FOUND rather than bought: in ancient ruins (a chest
   *  at a ruin site), or very rarely as a quest reward. The book goes straight
   *  into the bag (a found book is never left on the floor to be swept away),
   *  and is skipped if the player already carries it. `rnd` is for tests. */
  _findBook(source, x, y, rnd = Math.random) {
    const p = this.player;
    const row = rollFoundBook(p, source, rnd);
    if (!row) return null;
    const bag = (p.bookBag || (p.bookBag = []));
    if (bag.includes(row.id)) return null;
    bag.push(row.id);
    this._floatText(x === undefined ? this.world.x : x, (y === undefined ? this.world.y : y) - 62,
      `You find a skill book: ${row.name}`, '#ffd54f');
    return row;
  },

  /** Why this book cannot be bought or read right now, or null. */
  _bookRefusal(id) {
    const p = this.player;
    const row = bookById(id);
    if (!row) return 'That is not a skill book.';
    if (!canUseSkillBooks(p)) return 'You cannot use skill books.';
    const sb = skillBooksOf(p);
    if (row.kind === 'weapon' && sb.weapons[row.weapon]) return `You already know the ${row.weapon}.`;
    if (row.kind === 'craft' && sb[row.craft]) return 'You already know this.';
    if (row.kind === 'martial') {
      if (sb.martialArt === row.art) return 'You already follow this art.';
      if (sb.martialArt) {
        const cur = MARTIAL_BY_ID[sb.martialArt];
        return `You already follow ${cur ? cur.name : 'a martial art'}; a body learns only one.`;
      }
    }
    if (row.kind === 'theory' && sb.theory) {   // ROUND 357 -- one magical theory
      const cur = THEORIES[sb.theory];
      return sb.theory === row.theory ? 'You already study this.' : `You already study ${cur ? cur.name : 'a magical theory'}; a mind holds only one.`;
    }
    const carried = (p.bookBag || []).includes(id);
    if (carried) return 'You are already carrying this book.';
    return null;
  },

  /** ROUND 335 -- reading a book is a RITE: `_beginBookRite` starts the channel and the lesson lands when it completes.
   *  `{ instant: true }` is the lesson without the rite, for tests and for any caller that must not wait. */
  _readBook(id, opts = {}) {
    if (opts.instant) return this._learnBookNow(id);
    return this._beginBookRite('learn', id);
  },

  _learnBookNow(id) {
    const p = this.player;
    const bag = p.bookBag || (p.bookBag = []);
    const at = bag.indexOf(id);
    if (at < 0) return false;
    const res = learnBook(p, id, this._rankIdxNow());
    if (!res.ok) {
      this._floatText(this.world.x, this.world.y - 40, res.reason, '#ef9a9a');
      return false;
    }
    bag.splice(at, 1);
    this._recomputeDerivedStats && this._recomputeDerivedStats();
    this._floatText(this.world.x, this.world.y - 44, `You learn: ${res.row.name.replace(/^Manual: /, '')}`, '#ffd54f');
    this._martialLive = null;
    if (this._olbOn) this._olbOn('book', id);   // ROUND 314
    if (this._renderInventory) this._renderInventory();
    return true;
  },

  // ---- the rites (ROUND 335) ---------------------------------------------

  /** The rank index (RANK_ORDER) the player stands at. */
  _rankIdxNow() {
    try {
      const r = this._playerRankStanding ? this._playerRankStanding() : null;
      if (r && Number.isFinite(r.rankIdx)) return r.rankIdx;
    } catch (e) { /* fall through */ }
    return 1;
  },

  /** The martial art's attuned rank; a save from before the rites is grandfathered to the rank it is at now. */
  _artRankNow() {
    const p = this.player;
    const sb = p.skillBooks;
    if (!sb || !sb.martialArt) return null;
    if (!Number.isFinite(sb.artRank)) sb.artRank = this._rankIdxNow();
    return sb.artRank;
  },

  /** Is a Deepening Rite owed? (The art is attuned below the rank the player has reached.) */
  _deepeningDue() {
    this._artRankNow();
    return deepeningDue(this.player, this._rankIdxNow());
  },

  /** ROUND 335 -- "We have created ritual rooms already, the rituals need to be in a ritual room." The Society's ritual hall
   *  (interiors.js: `guild_ritual`, and the per-city `guild_ritual_<city>`). */
  _inRitualRoom() {
    const r = this._insideRoom;
    return !!(r && typeof r.id === 'string' && r.id.startsWith('guild_ritual'));
  },

  /** ROUND 344 -- "...unless the player has awakened a ritual ability from an essence allowing them to conduct rituals
   *  anywhere." Enact Ritual (the Rune essence's canon ability) is that ability: a player who holds it needs no ritual room. */
  _ritualAnywhere() {
    return !!(this._canonKeyFor && this._canonKeyFor('enactRitual'));
  },

  /** Why no rite can be begun this moment, or null. */
  _bookRiteRefusal(mode = null) {
    const p = this.player;
    // ROUND 373 -- "The library could be a quiet reading room for skill books": a book (mode 'learn') may be read at
    // Cadence's library as well as in a ritual room. The Deepening Rite and a theory's deepening still want the hall.
    const library = mode === 'learn' && this._clInLibrary && this._clInLibrary();
    if (!this._inRitualRoom() && !this._ritualAnywhere() && !library) {
      return mode === 'learn' ? 'A book is read in a ritual room (the Society ritual hall) or in the reading room of Cadence\'s library.'
        : 'A rite is performed in a ritual room: the Society ritual hall.';
    }
    if (this._bookRite) return 'You are already in a rite.';
    if (this._ritualCast) return 'You are already in a rite.';
    if (this._fightRecent && this._fightRecent(4)) return 'Not in the middle of a fight.';
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || m.lurk || m.person || m.dummy) continue;   // ROUND 373 -- a training dummy is not an enemy
      const d = Math.hypot(m.wx - this.world.x, m.wy - this.world.y);
      if (d < (m.state === 'chase' ? 520 : 260)) return 'A rite needs a quiet place: enemies are near.';
    }
    if (p.hp <= 0) return 'You cannot.';
    return null;
  },

  /** Seconds since the player last struck or was struck is under `s`? */
  _fightRecent(s) {
    const t = this._playerFightT;
    return t !== undefined && (this._combatClock || 0) - t < s;
  },

  /** Begin the reading rite ('learn', id) or the Deepening Rite ('deepen'). */
  _beginBookRite(mode, id) {
    const p = this.player;
    let total, name, color, row = null, theme = 'generic', drain = null, opener = null;
    if (mode === 'tdeepen') {
      // ROUND 358 -- the theory deepening is a rite now (it was instant on payment). `_theoryDeepen` has checked the rank
      // and the purse; the coin is taken when the rite lands, so a broken rite costs nothing but what it drew.
      const sb = skillBooksOf(p);
      if (!sb.theory) return false;
      total = RITE_SECONDS;
      name = `Deepening: ${(THEORIES[sb.theory] || {}).name || 'your theory'}`;
      theme = THEORY_THEME[sb.theory] || 'mystic';
      color = RITE_THEMES[theme].text;
      drain = riteDrainFor('theory', theme);
      opener = 'What I have learned, let it go deeper.';
    } else if (mode === 'learn') {
      if (!(p.bookBag || []).includes(id)) return false;
      row = bookById(id);
      const refuse = this._bookRefusal(id);
      if (refuse && !/carrying/.test(refuse)) { this._floatText(this.world.x, this.world.y - 40, refuse, '#ef9a9a'); return false; }
      total = readRiteSeconds(row);
      name = `Reading: ${row.name.replace(/^Manual: /, '')}`;
      // ROUND 358 -- the rite's theme: weapon and martial books are the martial rite (and draw mana as well as stamina,
      // item 1.3), a theory its own theme, the Ritual Magic book the generic rite, the other crafts the clockwork one.
      theme = bookThemeFor(row);
      color = RITE_THEMES[theme].text;
      drain = riteDrainFor('book', theme, { bookKind: row.kind });
      opener = `I open ${row.name.replace(/^Manual: /, '')}, and I listen.`;
    } else {
      if (!this._deepeningDue()) return false;
      total = deepenRiteSeconds(this._rankIdxNow());
      name = 'Deepening Rite';
      theme = 'martial';
      color = RITE_THEMES[theme].text;
      drain = riteDrainFor('deepen', theme);
      opener = 'The art I carry has fallen behind me. Let it catch up.';
    }
    const why = this._bookRiteRefusal(mode);
    if (why) { this._floatText(this.world.x, this.world.y - 40, why, '#ef9a9a'); return false; }
    if (this._closeInventory) this._closeInventory();
    this._bookRite = { mode, id, row, t: total, total, x: this.world.x, y: this.world.y, hp: p.hp, name, color, born: this.time.now, theme };
    this._floatText(this.world.x, this.world.y - 44,
      mode === 'learn' ? 'You open the book and begin the rite' : (mode === 'tdeepen' ? 'You begin to deepen your theory' : 'You begin the Deepening Rite'), color);
    if (this._stageBegin) {
      this._stageBegin({ theme, total, x: this.world.x, y: this.world.y, name, book: true,
        chant: riteChantLines(theme, [], opener), drain });
    }
    return true;
  },

  _cancelBookRite(why) {
    if (!this._bookRite) return;
    this._bookRite = null;
    if (this._castBar) this._castBar.setVisible(false);
    if (this._castBarText) this._castBarText.setVisible(false);
    this._clearBookRiteFx();
    if (this._stageEnd) this._stageEnd(false);   // ROUND 358
    this._floatText(this.world.x, this.world.y - 44, why, '#ef9a9a');
  },

  _finishBookRite(c) {
    const p = this.player;
    this._bookRite = null;
    if (this._castBar) this._castBar.setVisible(false);
    if (this._castBarText) this._castBarText.setVisible(false);
    this._clearBookRiteFx();
    if (this._stageEnd) this._stageEnd(true);   // ROUND 358
    this._bookRiteBurst(c.x, c.y, c.color);
    if (c.mode === 'learn') {
      this._learnBookNow(c.id);
    } else if (c.mode === 'tdeepen') {
      if (this._theoryDeepenComplete) this._theoryDeepenComplete();
    } else {
      const sb = p.skillBooks;
      if (sb) sb.artRank = this._rankIdxNow();
      this._martialLive = null;
      this._recomputeDerivedStats && this._recomputeDerivedStats();
      const a = sb && MARTIAL_BY_ID[sb.martialArt];
      this._floatText(this.world.x, this.world.y - 44,
        `${a ? a.name : 'Your art'} deepens to ${RANK_LABELS[RANK_ORDER[sb ? sb.artRank : 1]] || 'your rank'}`, '#b39ddb');
      if (this._renderInventory) this._renderInventory();
    }
  },

  /** Told once per rank climbed: the art is behind the reader. */
  _bookAttuneHint() {
    if (!this._deepeningDue()) return;
    const r = this._rankIdxNow();
    if (this._attuneHinted === r) return;
    this._attuneHinted = r;
    this._floatText(this.world.x, this.world.y - 70, 'Your martial art has fallen behind your rank. Perform the Deepening Rite (Inventory).', '#b39ddb');
  },

  _bookRiteTick(dt) {
    const c = this._bookRite;
    if (!c) return;
    const p = this.player;
    const moved = Math.hypot(this.world.x - c.x, this.world.y - c.y);
    if (moved > 10) { this._cancelBookRite('The rite is broken: you moved.'); return; }
    if (p.hp < c.hp - 0.01) { this._cancelBookRite('The rite is broken: you were hurt.'); return; }
    if (this._dialogueOpen || this._shopOpen || this._craftOpen) { this._cancelBookRite('The rite is broken.'); return; }
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || m.lurk || m.person) continue;
      if (m.state === 'chase' && Math.hypot(m.wx - c.x, m.wy - c.y) < 200) { this._cancelBookRite('The rite is broken: something is upon you.'); return; }
    }
    c.t -= dt;
    // ROUND 358 -- the rite's own draw on life is not a wound: the "hurt" mark is taken after it.
    if (this._stageTick) this._stageTick(dt, Math.max(0, c.t));
    c.hp = p.hp;
    if (this._drawCastBar) this._drawCastBar({ t: Math.max(0, c.t), total: c.total, name: c.name, color: c.color });
    this._drawBookRite(c);
    if (c.t <= 0) this._finishBookRite(c);
  },

  _clearBookRiteFx() {
    if (this._bookRiteG) { this._bookRiteG.destroy(); this._bookRiteG = null; }
    if (this._bookRiteTop) { this._bookRiteTop.destroy(); this._bookRiteTop = null; }
    if (this._bookRiteCircle) { this._bookRiteCircle.destroy(); this._bookRiteCircle = null; }   // ROUND 388
    if (this._bookRite393) { this._bookRite393.destroy(); this._bookRite393 = null; }   // ROUND 393 -- the rite book sprite
  },

  /** The rite's picture: a rune circle on the ground that fills as the rite runs, motes rising from it, and the book
   *  hanging open above the reader with its pages turning. Two graphics (ground and air), cleared and redrawn each frame. */
  _drawBookRite(c) {
    if (!this._bookRiteG) {
      this._bookRiteG = this.add.graphics().setDepth(2);
      this._bookRiteTop = this.add.graphics();
    }
    const g = this._bookRiteG, a = this._bookRiteTop;
    const col = parseInt((c.color || '#ffd54f').replace('#', ''), 16);
    const now = this.time.now / 1000;
    const done = Math.max(0, Math.min(1, 1 - c.t / c.total));
    const f = isoProject(c.x, c.y);
    g.clear(); a.clear();
    a.setDepth(isoDepth(c.x, c.y) + 5);
    // ---- the ground circle
    const R = 46, RY = 23;
    const pt = (rad, ang, k = 1) => ({ x: f.x + Math.cos(ang) * rad * k, y: f.y + Math.sin(ang) * rad * k * (RY / R) });
    // ROUND 388 -- "every rite's ground circle should use the HD ritual circle": the chalk circle from the 4x sheet
    // (cityProps.js RITUAL_CIRCLES_HD; 264px drawn across, feet at 0.656), tinted the book's colour, brightening as it
    // fills. The filled arc below still marks the progress; the drawn rings and star are the fallback.
    const hd = this.textures.exists(RITUAL_CIRCLES_HD.key);
    if (hd) {
      if (!this._bookRiteCircle || !this._bookRiteCircle.active) {
        this._bookRiteCircle = this.add.image(0, 0, RITUAL_CIRCLES_HD.key, RITUAL_CIRCLES_HD.frames.ritualCircleChalk).setOrigin(0.5, 0.656);
      }
      const sc = (R * 2) / 264;
      this._bookRiteCircle.setPosition(f.x, f.y).setScale(sc, sc * 0.6).setTint(col).setDepth(3).setAlpha(0.55 + 0.45 * done);
    } else {
      g.fillStyle(col, 0.07 + 0.08 * done); g.fillEllipse(f.x, f.y, R * 2, RY * 2);
      g.lineStyle(2, col, 0.35); g.strokeEllipse(f.x, f.y, R * 2, RY * 2);
      g.lineStyle(1, col, 0.35); g.strokeEllipse(f.x, f.y, R * 1.3, RY * 1.3);
    }
    // the filled arc, clockwise from the top
    g.lineStyle(3, col, 0.95);
    g.beginPath();
    const steps = Math.max(2, Math.round(64 * done));
    for (let i = 0; i <= steps; i++) {
      const ang = -Math.PI / 2 + (i / 64) * Math.PI * 2;
      const q = pt(R, ang);
      if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y);
    }
    g.strokePath();
    // the turning rune star (two triangles) and the outer ticks
    const spin = now * 0.6;
    g.lineStyle(1.5, col, 0.55);
    for (let tri = 0; tri < (hd ? 0 : 2); tri++) {
      g.beginPath();
      for (let i = 0; i <= 3; i++) {
        const q = pt(R * 0.86, spin + tri * Math.PI / 3 + i * (Math.PI * 2 / 3));
        if (i === 0) g.moveTo(q.x, q.y); else g.lineTo(q.x, q.y);
      }
      g.strokePath();
    }
    g.lineStyle(2, col, 0.5);
    for (let i = 0; i < (hd ? 0 : 16); i++) {
      const ang = -spin * 0.5 + i * (Math.PI / 8);
      const p0 = pt(R * 1.0, ang), p1 = pt(R * 1.1, ang);
      g.lineBetween(p0.x, p0.y, p1.x, p1.y);
    }
    // ---- motes rising from the circle
    for (let i = 0; i < 18; i++) {
      const ph = (now * 0.35 + i / 18) % 1;
      const ang = i * 2.399 + now * 0.4;
      const rad = R * (0.25 + 0.7 * ((i * 7) % 10) / 10) * (1 - ph * 0.4);
      const q = pt(rad, ang);
      a.fillStyle(col, (1 - ph) * (0.35 + 0.5 * done));
      a.fillCircle(q.x, q.y - ph * 70, 1.5 + (1 - ph));
    }
    // ---- the book, hanging open above the reader, pages turning
    const bx = f.x, by = f.y - 74 + Math.sin(now * 2.2) * 3;
    const glow = 0.12 + 0.25 * done + 0.05 * Math.sin(now * 5);
    a.fillStyle(col, glow); a.fillCircle(bx, by, 22 + 10 * done);
    // ROUND 393 -- the rite_book sheet (pages turning) over the glow; the drawn book below is the fallback.
    const book393 = !!(this._riteBook393 && this._riteBook393(bx, by, col, done));
    if (!book393) {
    a.fillStyle(0x5a3b24, 1); a.fillRect(bx - 15, by - 7, 30, 14);              // the cover
    a.fillStyle(0xf3e7c9, 1);
    a.fillTriangle(bx, by - 6, bx - 13, by - 5, bx - 13, by + 6);               // left page
    a.fillTriangle(bx, by - 6, bx + 13, by - 5, bx + 13, by + 6);               // right page
    a.fillTriangle(bx, by + 6, bx - 13, by + 6, bx, by - 6);
    a.fillTriangle(bx, by + 6, bx + 13, by + 6, bx, by - 6);
    a.lineStyle(1, 0x8a6a45, 1); a.lineBetween(bx, by - 6, bx, by + 6);
    const turn = (now * 1.4) % 1;                                              // a page turning over the spine
    const tw = Math.cos(turn * Math.PI) * 12;
    a.fillStyle(0xfff8e1, 0.95);
    a.fillTriangle(bx, by - 6, bx + tw, by - 4, bx, by + 6);
    }   // ROUND 393 -- end of the drawn-book fallback
    // text lines dancing off the page
    for (let i = 0; i < 4; i++) {
      const ph = (now * 0.8 + i * 0.25) % 1;
      a.fillStyle(col, (1 - ph) * 0.8);
      a.fillRect(bx - 8 + i * 5, by - 8 - ph * 28, 3, 1.5);
    }
  },

  /** The moment it lands: rings out across the ground, a column of light, sparks. */
  _bookRiteBurst(x, y, colorHex) {
    const col = parseInt((colorHex || '#ffd54f').replace('#', ''), 16);
    const f = isoProject(x, y);
    const depth = isoDepth(x, y) + 6;
    const kill = (o) => { if (o && o.destroy) o.destroy(); };
    for (let i = 0; i < 3; i++) {
      const ring = this.add.ellipse(f.x, f.y, 24, 12, col, 0.0).setStrokeStyle(3 - i * 0.6, col, 0.9).setDepth(2);
      this.tweens.add({ targets: ring, displayWidth: 190 + i * 40, displayHeight: 95 + i * 20, alpha: 0, delay: i * 110, duration: 720, ease: 'Cubic.easeOut', onComplete: () => kill(ring) });
    }
    const beam = this.add.rectangle(f.x, f.y - 60, 34, 140, col, 0.55).setDepth(depth);
    this.tweens.add({ targets: beam, scaleX: 0.15, alpha: 0, duration: 650, ease: 'Quad.easeIn', onComplete: () => kill(beam) });
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const sp = this.add.circle(f.x, f.y - 20, 2 + (i % 3), col, 0.95).setDepth(depth);
      this.tweens.add({
        targets: sp, x: f.x + Math.cos(ang) * (50 + (i % 5) * 12), y: f.y - 20 + Math.sin(ang) * 30 - 40 - (i % 4) * 14,
        alpha: 0, duration: 700 + (i % 4) * 90, ease: 'Cubic.easeOut', onComplete: () => kill(sp),
      });
    }
    if (this.cameras && this.cameras.main && this.cameras.main.flash) this.cameras.main.flash(180, 255, 244, 214, true);
  },

  /** Rows for the Inventory table: books carried (with a Read button) and the
   *  skills already learned. */
  _skillBookRows() {
    const p = this.player;
    const rows = [];
    const counts = {};
    for (const id of (p.bookBag || [])) counts[id] = (counts[id] || 0) + 1;
    for (const [id, qty] of Object.entries(counts)) {
      const b = bookById(id);
      if (!b) continue;
      const why = this._bookRefusal(id);
      // A carried book is "already carrying" by construction; the refusal that
      // matters for reading is whether the lesson would take -- and, since
      // round 335, whether the rite can be performed here (a ritual room).
      const blocked = (why && !/carrying/.test(why) ? why : '') || this._bookRiteRefusal('learn') || '';
      rows.push({
        name: b.name, desc: b.blurb, type: 'Skill Book', qty, color: '#ffcc80',
        action: blocked
          ? `<span style="opacity:0.7;font-size:11px;">${blocked}</span>`
          : `<button class="action-btn" data-act="readbook" data-bookid="${id}">Read</button>`,
      });
    }
    const sb = skillBooksOf(p);
    const known = [];
    for (const w of Object.keys(sb.weapons)) known.push(`${w}`);
    if (known.length) {
      rows.push({ name: 'Weapons you know', desc: known.join(', '), type: 'Learned', qty: '', color: '#a5d6a7' });
    }
    if (sb.martialArt && MARTIAL_BY_ID[sb.martialArt]) {
      const a = MARTIAL_BY_ID[sb.martialArt];
      const scale = this._martialScaleNow();
      // ROUND 335 -- attuned to a rank; behind the player's own, it offers the Deepening Rite.
      const attuned = this._artRankNow();
      const due = this._deepeningDue();
      const why = due ? this._bookRiteRefusal() : null;
      rows.push({
        name: a.name,
        desc: `${artCard(a, scale)} Attuned to ${RANK_LABELS[RANK_ORDER[attuned]] || 'your rank'}${due ? `; you have risen to ${RANK_LABELS[RANK_ORDER[this._rankIdxNow()]]}. The Deepening Rite raises it.` : '.'}`,
        type: 'Martial Art', qty: '', color: '#a5d6a7',
        action: due ? (why ? `<span style="opacity:0.7;font-size:11px;">${why}</span>`
          : `<button class="action-btn" data-act="deepenrite">Deepening Rite</button>`) : undefined,
      });
    }
    // ROUND 357 -- the magical theory studied, its rank and what it gives; it is deepened by the Society ritualist.
    if (sb.theory && THEORIES[sb.theory]) {
      const t = THEORIES[sb.theory], r = sb.theoryRank || 1;
      const due = this._rankIdxNow() > r;
      rows.push({
        name: t.name,
        desc: `${theoryPerkLines(sb.theory, r).join('. ')}. Attuned to ${RANK_LABELS[RANK_ORDER[r]]}${due ? `; you have risen past it -- the Society ritualist can deepen it (${theoryDeepenLabel(r + 1)}).` : '.'}`,
        type: 'Magical Theory', qty: '', color: t.color,
      });
    }
    for (const c of ['herbalism', 'mining', 'cooking', 'ritual']) {
      if (sb[c]) rows.push({ name: c === 'ritual' ? 'Ritual Magic' : c[0].toUpperCase() + c.slice(1),
        desc: 'Learned from a skill book.', type: 'Learned', qty: '', color: '#a5d6a7' });
    }
    return rows;
  },

  // ---- the martial art ---------------------------------------------------

  /** Rank and attribute scale of the art right now. */
  _martialScaleNow() {
    let standing = 0;
    try { standing = this._playerStanding ? this._playerStanding() : 0; } catch (e) { standing = 0; }
    // ROUND 335 -- the art is only as strong as the rank it was last attuned at; a Deepening Rite raises it.
    const art = this._artRankNow();
    if (art !== null) standing = Math.min(standing, art + 0.999);
    return martialScale(standing, 0);
  },

  /** Record an event the conditions care about ('kill' | 'strike'). */
  _martialNote(what) {
    const st = this._martialSt || (this._martialSt = {});
    if (what === 'kill') st.killT = 0;
    else if (what === 'strike') st.strikeT = 0;
  },

  /** One tick. Cheap when the player follows no art. */
  _martialTick(dt) {
    const p = this.player;
    if (!p) return;
    const art = martialArtOf(p);
    const st = this._martialSt || (this._martialSt = { stillT: 0, killT: 99, hitT: 99, strikeT: 99, acc: 0, x: 0, y: 0, hp: 0 });
    if (!art) {
      if (this._martialLive) this._martialLive = null;
      // A ritual zone still moves damage and crit, art or no art.
      if (this._ritualLive) this._martialApply(); else this._martialUnapply();
      return;
    }
    // Clocks every tick: motion, the hit clock off an hp drop, event windows.
    const dx = this.world.x - st.x, dy = this.world.y - st.y;
    if (dx * dx + dy * dy > 0.09) st.stillT = 0; else st.stillT += dt;
    st.x = this.world.x; st.y = this.world.y;
    if (p.hp < st.hp - 0.01) st.hitT = 0; else st.hitT += dt;
    st.hp = p.hp;
    st.killT += dt; st.strikeT += dt;
    st.acc += dt;
    if (st.acc < SAMPLE_S && this._martialLive) return;
    st.acc = 0;

    const mons = this.monsters || [];
    let foes = 0, dotFoes = 0;
    const wx = this.world.x, wy = this.world.y;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || !m.alive || m.ally || m.tamed || m.person || m.friendly) continue;
      if (Math.abs(m.wx - wx) > NEAR_FOE || Math.abs(m.wy - wy) > NEAR_FOE) continue;
      if (Math.hypot(m.wx - wx, m.wy - wy) > NEAR_FOE) continue;
      foes++;
      if (m.dot || (m.debuffs && Object.keys(m.debuffs).length) || (m.sunderT || 0) > 0) dotFoes++;
    }
    const hp = p.maxHp ? p.hp / p.maxHp : 1;
    const mana = p.maxMana ? p.mana / p.maxMana : 1;
    const stam = p.maxStamina ? p.stamina / p.maxStamina : 1;
    let hour = 12;
    try { hour = this._hourOfDay ? this._hourOfDay() : 12; } catch (e) { hour = 12; }
    const night = hour >= 20 || hour < 5;
    let h = 0;
    try { h = this._elev ? this._elev.height(wx, wy) : 0; } catch (e) { h = 0; }
    let wet = false;
    try { wet = isWaterTile(this._tileTypeAt(wx, wy)); } catch (e) { wet = false; }
    const inCombat = foes > 0 || st.hitT < HIT_WINDOW_S || st.strikeT < STRIKE_WINDOW_S;
    const unarmed = this._isUnarmed ? !!this._isUnarmed() : false;
    const buffed = !!(p.buffs && Object.keys(p.buffs).some(k => p.buffs[k] && (p.buffs[k].t > 0 || p.buffs[k].mult)))
      || !!(p.statBuffs && Object.keys(p.statBuffs).length);
    const ctx = {
      always: true,
      still: st.stillT >= STILL_AFTER_S,
      moving: st.stillT < 0.2,
      inCombat, calm: !inCombat,
      hurt: hp < 0.5, hale: hp >= 0.9,
      manaLow: mana < 1 / 3, manaFull: mana >= 0.9,
      stamLow: stam < 1 / 3, stamFull: stam >= 0.9,
      night, day: !night,
      afterKill: st.killT < KILL_WINDOW_S, afterHit: st.hitT < HIT_WINDOW_S, afterStrike: st.strikeT < STRIKE_WINDOW_S,
      dotFoes, foes, crowd: foes >= 3, duel: foes === 1,
      unarmed, armed: !unarmed,
      wet, high: h > 0.5, low: h < -0.5, buffed,
      scale: this._martialScaleNow(),
      attr: (p.passiveMods && p.passiveMods.attrBonus) || null,
    };
    this._martialLive = effectsFor(art, ctx);
    this._martialCtx = ctx;
    this._martialApply();
  },

  /** One channel of the live bag, 0 when none. */
  _martialFx(key) {
    const b = this._martialLive;
    return (b && b[key]) || 0;
  },

  /** Put the damage / crit deltas onto `passiveMods` (the martial art's, and
   *  the ritual zone's). GUARD IS NOT HERE: `passiveMods.damageReduction` is a
   *  FLAT subtraction, and these are percentages -- they are applied where
   *  the blow lands, in `_skillGuardPct`. */
  _martialApply() {
    const p = this.player, pm = p && p.passiveMods;
    if (!pm) return;
    const prev = p._martialApplied || { damage: 0, crit: 0 };
    const rz = (k) => (this._ritualFx ? this._ritualFx(k) : 0);
    const now = {
      damage: this._martialFx('damage') + rz('damage'),
      crit: this._martialFx('crit') + rz('crit'),
    };
    if (prev.damage) pm.dmgMult = (pm.dmgMult || 1) / (1 + prev.damage);
    pm.critChance = (pm.critChance || 0) - prev.crit;
    if (now.damage) pm.dmgMult = (pm.dmgMult || 1) * (1 + now.damage);
    pm.critChance += now.crit;
    p._martialApplied = now;
  },
  _martialUnapply() {
    const p = this.player, pm = p && p.passiveMods;
    if (!pm || !p._martialApplied) return;
    const prev = p._martialApplied;
    if (prev.damage) pm.dmgMult = (pm.dmgMult || 1) / (1 + prev.damage);
    pm.critChance = (pm.critChance || 0) - prev.crit;
    p._martialApplied = null;
  },

  /** The percentage of an incoming blow the martial art and any ritual zone
   *  turn aside, for a blow of this element. Capped at 60%. */
  _skillGuardPct(element) {
    const rz = this._ritualFx ? this._ritualFx('guard') : 0;
    const rr = this._ritualResist ? this._ritualResist(element) : 0;
    return Math.min(0.6, this._martialFx('guard') + rz + rr);
  },

  /** A cost (mana or stamina) after the martial art's thrift. */
  _martialThrift(amount) {
    const t = this._martialFx('thrift');
    return t > 0 ? Math.max(1, Math.round(amount * (1 - Math.min(0.6, t)))) : amount;
  },

  // ---- herbalism and mining (items 2.2.3, 2.2.4) --------------------------

  /** May the player see this node at all? Timber is common knowledge; plants
   *  want Herbalism and minerals want Mining. An unseen node is not drawn, not
   *  harvestable and not on the minimap -- it is undergrowth and bare rock. */
  _nodeSpotted(n) {
    if (!n) return false;
    if (n.family === 'fibre') return hasCraft(this.player, 'herbalism');
    if (n.family === 'metal') return hasCraft(this.player, 'mining');
    return true;
  },

  /** Once in a while, when you walk past a node you cannot read, say so. */
  _nodeHint(n) {
    const need = n.family === 'fibre' ? 'Herbalism' : 'Mining';
    const t = this._clockT || 0;
    if (this._nodeHintAt && t < this._nodeHintAt) return;
    this._nodeHintAt = t + 90;
    this._floatText(this.world.x, this.world.y - 50,
      `Something here might be worth gathering, but you cannot tell what. (${need} skill book)`, '#b0bec5');
  },

  /** Extra loot from the right kind of monster, for the right book. Called at
   *  the top of the kill's drop; adds drops, never takes any. */
  _craftBonusLoot(m) {
    if (!m || !m.type) return;
    const sub = subtypeOf(m);
    const earth = sub === 'elemental' && m.dmgElement === 'earth';
    const plant = sub === 'flora' && hasCraft(this.player, 'herbalism');
    const rock = (sub === 'mineral' || earth) && hasCraft(this.player, 'mining');
    if (!plant && !rock) return;
    const tier = Math.max(0, Math.min(4, this._monsterRankIndex ? this._monsterRankIndex(m) : 0));
    const id = stockId(plant ? 'fibre' : 'metal', tier);
    if (!id) return;
    const n = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) this._dropLoot(m.wx, m.wy, { kind: 'stock', id });
  },

  // ---- cooking (item 2.2.6) ----------------------------------------------

  /** Cook one monster part into a dish. Needs the Cooking book; a part that is
   *  not food says so. */
  _cookPart(partId) {
    const p = this.player;
    if (!hasCraft(p, 'cooking')) {
      this._floatText(this.world.x, this.world.y - 40, 'You do not know how to cook. (Cooking skill book)', '#ef9a9a');
      return false;
    }
    const at = (p.inventory.parts || []).indexOf(partId);
    if (at < 0) return false;
    const dish = dishForPart(partId);
    if (!dish) {
      this._floatText(this.world.x, this.world.y - 40, 'That is not food.', '#ef9a9a');
      return false;
    }
    p.inventory.parts.splice(at, 1);
    p.inventory.consumables.push(dish.id);
    this._floatText(this.world.x, this.world.y - 44, `Cooked: ${dish.name}`, '#ffcc80');
    if (this._renderInventory) this._renderInventory();
    return true;
  },
};
