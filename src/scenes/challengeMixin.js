// ============================================================================
// ROUND 428 -- CHALLENGES, for the God of War's secret ("answer every challenge").
//
// Nothing in the game called the player out, so this is new. From Iron rank, out of doors, every 12 to 20 minutes a
// challenger walks up: a fighter of your own rank who has heard of you. You can answer or refuse.
//   ANSWER    a duel. The challenger fights you at your rank until one of you is nearly down; neither dies. It counts
//             the moment you answer, however it goes.
//   REFUSE    or walk away from them before they reach you, or run from the duel: the challenge goes unanswered, and
//             the God of War's secret is broken for good. Nothing says so.
// The challenger is a person on `_banditFolk` (round 274's rule), moved by gameModeMixin's foe walker as `deathChurch:
// 'duel'`; `_hitOneBandit` hands a falling challenger to `_chYield` instead of killing them.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { RANK_ORDER } from '../data/ranks.js';

const FIRST_S = 420;
const GAP_S = [720, 1200];
const WALK_SPEED = 150;
const WALKED_AWAY_TILES = 22;
const YIELD_FRAC = 0.15;
const ARTS = ['npc_grizzled_adventurer', 'npc_muscular_adventurer', 'npc_shield_adventurer', 'npc_female_adventurer', 'npc_sporty_woman'];
const FIRST = ['Aldric', 'Iseult', 'Corvan', 'Hesk', 'Maela', 'Tobin', 'Ysolde', 'Garran', 'Edda', 'Ronan', 'Petra', 'Dace'];
const OF = ['of the Third Rope', 'Two-Scars', 'the Unbent', 'of Fenn Cross', 'Long-Reach', 'the Quiet', 'Ironjaw', 'of the Gravel Pits'];

export const CHALLENGE_LINES = {
  pitch: [
    (n, r) => `"You. I have heard your name in three taverns, and I am tired of hearing it. I am ${n}, ${r} rank, same as you. Face me."`,
    (n, r) => `"${n}. ${r} rank. They say you are good. I say prove it, here, now."`,
    (n, r) => `"I have walked a long way to find you. ${n} is my name. One fight, to the yield. Or tell me you are afraid."`,
  ],
  accept: '"Good. To the yield, then. Nobody dies today unless they are careless."',
  refuse: '"Then you are less than they said." They spit, and walk away.',
  walked: 'Behind you, someone calls your name, and then stops calling it.',
  fled: 'The challenger lowers their weapon and watches you run.',
  theyYield: '"Enough! Enough. You have it." They lower their weapon. "I will tell them it was fair."',
  youYield: '"Enough. You stood, and you did not run. That is all I came to see." They lower their weapon.',
};

export const ChallengeMixin = {
  _chTick(dt) {
    const p = this.player;
    if (!p) return;
    const C = this._chChallenger;
    if (C) { this._chMove(C, dt); return; }
    const duel = this._chDuel;
    if (duel) { this._chDuelTick(duel); return; }
    if (RANK_ORDER.indexOf(p.rank || 'normal') < 1) return;
    if (this._insideRoom || p.dead || this._dialogueOpen) return;
    if (this._isAnyOverlayOpen && this._isAnyOverlayOpen()) return;
    this._chT = (this._chT == null ? FIRST_S : this._chT) - dt;
    if (this._chT > 0) return;
    this._chT = GAP_S[0] + Math.random() * (GAP_S[1] - GAP_S[0]);
    this._chSpawn();
  },

  _chSpawn() {
    const key = ARTS.find(k => this.textures.exists(k)) || null;
    if (!key) return null;
    const seed = Math.floor(Math.random() * 1e6);
    const name = `${FIRST[seed % FIRST.length]} ${OF[Math.floor(seed / 7) % OF.length]}`;
    let x = this.world.x, y = this.world.y;
    for (let a = 0; a < 14; a++) {
      const th = Math.random() * Math.PI * 2;
      x = this.world.x + Math.cos(th) * 11 * TILE; y = this.world.y + Math.sin(th) * 11 * TILE;
      if (!(this._isWaterAt && this._isWaterAt(x, y)) && !(this._collidesObstacle && this._collidesObstacle(x, y, 14))) break;
    }
    const art = NPC_ART[key] || { footX: 32, footY: 63, scale: 1 };
    const pt = isoProject(x, y);
    const sprite = this.add.sprite(pt.x, pt.y, key, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale(art.scale || 1);
    sprite.setDepth(isoDepth(x, y));
    this._chChallenger = { name, sprite, artKey: key, which: 0, x, y, phase: 'come', t: 0, seed };
    this._floatText(this.world.x, this.world.y - 64, 'Someone is striding towards you with a weapon drawn', '#ffcc80');
    return this._chChallenger;
  },

  _chGone(C) {
    if (C.sprite) C.sprite.destroy();
    this._chChallenger = null;
  },

  _chMove(C, dt) {
    C.t += dt;
    const dx = this.world.x - C.x, dy = this.world.y - C.y, d = Math.hypot(dx, dy) || 1;
    if (C.phase === 'come' || C.phase === 'talk') {
      // walked away before they reached you, or went indoors: unanswered
      if (this._insideRoom || d > WALKED_AWAY_TILES * TILE) {
        this._chUnanswered(CHALLENGE_LINES.walked);
        this._chGone(C);
        return;
      }
    }
    if (C.phase === 'leave' && (C.t > 4 || d > 34 * TILE || this._insideRoom)) { this._chGone(C); return; }
    if (C.phase === 'come') {
      if (d > 48) {
        const step = Math.min(d - 40, WALK_SPEED * dt);
        C.x += (dx / d) * step; C.y += (dy / d) * step;
        if (this._npcWalkFrame) this._npcWalkFrame(C, C.artKey, facingFromMove(dx, dy) || 'south', true, dt);
      } else if (!this._dialogueOpen) {
        if (this._npcWalkFrame) this._npcWalkFrame(C, C.artKey, facingFromMove(dx, dy) || 'south', false, dt);
        C.phase = 'talk';
        this._chPitch(C);
      }
    } else if (C.phase === 'talk') {
      // the page shut without an answer (Escape, B): unanswered
      if (!this._dialogueOpen) { this._chUnanswered(CHALLENGE_LINES.refuse); C.phase = 'leave'; C.t = 0; }
    } else if (C.phase === 'leave') {
      const step = WALK_SPEED * dt;
      C.x -= (dx / d) * step; C.y -= (dy / d) * step;
      if (this._npcWalkFrame) this._npcWalkFrame(C, C.artKey, facingFromMove(-dx, -dy) || 'south', true, dt);
    }
    if (C.sprite && C.sprite.active) {
      const p = isoProject(C.x, C.y);
      C.sprite.setPosition(p.x, p.y);
      C.sprite.setDepth(isoDepth(C.x, C.y));
    }
  },

  _chRankWord() {
    const r = this.player.rank || 'iron';
    return r.charAt(0).toUpperCase() + r.slice(1);
  },

  _chPitch(C) {
    const f = CHALLENGE_LINES.pitch[C.seed % CHALLENGE_LINES.pitch.length];
    this._openDialogue(C.name, f(C.name, this._chRankWord()), null, [
      { label: 'Answer the challenge', act: 'ch|accept' },
      { label: 'Refuse', act: 'ch|refuse' },
    ]);
  },

  _chAct(act) {
    const what = String(act).split('|')[1];
    const C = this._chChallenger;
    if (!C) { this._closeDialogue(); return; }
    if (what === 'accept') {
      C.phase = 'duel';
      this._closeDialogue();
      if (this._dsCount) this._dsCount('war');
      const ri = Math.max(0, Math.min(4, RANK_ORDER.indexOf(this.player.rank || 'iron')));
      const foe = this._gmMakeFoe ? this._gmMakeFoe({ kind: 'duel', artKey: C.artKey, x: C.x, y: C.y, name: `${C.name} (challenger)`, rankIdx: ri, mult: 1 }) : null;
      if (C.sprite) C.sprite.destroy();
      this._chChallenger = null;
      if (!foe) return;
      foe.duel = true;
      this._chDuel = { foe, name: C.name };
      if (this._sayOverhead) this._sayOverhead(foe, CHALLENGE_LINES.accept.replace(/"/g, ''), '#ffcc80', 3);
    } else {
      this._closeDialogue();
      this._chUnanswered(CHALLENGE_LINES.refuse);
      C.phase = 'leave'; C.t = 0;
    }
  },

  _chUnanswered(line) {
    if (this._dsBreak) this._dsBreak('war', 'A challenge went unanswered.');
    if (line && this._floatText) this._floatText(this.world.x, this.world.y - 60, line.replace(/"/g, ''), '#bcaaa4');
  },

  /** The duel: ends when either is nearly down. Running from it (the walker drops a foe left far behind) is unanswered. */
  _chDuelTick(duel) {
    const c = duel.foe, p = this.player;
    if (!c || c.despawned) {
      if (!duel.over) this._chUnanswered(CHALLENGE_LINES.fled);
      this._chDuel = null;
      return;
    }
    if (p.dead || p.hp <= (p.maxHp || 1) * YIELD_FRAC) this._chEndDuel(duel, CHALLENGE_LINES.youYield);
  },

  /** From `_hitOneBandit`: a challenger who would fall yields instead. */
  _chYield(c) {
    const duel = this._chDuel;
    c.hp = Math.max(1, Math.round((c.maxHp || 10) * 0.05));
    if (duel && duel.foe === c) this._chEndDuel(duel, CHALLENGE_LINES.theyYield);
    else { c.alive = false; c.despawned = true; if (c.sprite) c.sprite.destroy(); }
  },

  _chEndDuel(duel, line) {
    duel.over = true;
    const c = duel.foe;
    if (c && this._sayOverhead) this._sayOverhead(c, line.replace(/"/g, ''), '#ffcc80', 3.5);
    if (c) {
      c.hostile = false; c.alive = false; c.despawned = true;
      const s = c.sprite;
      if (s && this.tweens) this.tweens.add({ targets: s, alpha: 0, duration: 2500, delay: 1500, onComplete: () => s.destroy() });
      else if (s) s.destroy();
    }
    this._chDuel = null;
  },
};
