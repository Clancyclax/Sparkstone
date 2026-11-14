// ============================================================================
// ROUND 428 -- THE GAOLS, for Liberty's secret.
//
// "Liberty is okay but perhaps freeing all peoples. Like ensuring that every jail cell no matter where the individuals
// inside are let out."
//
// Every city and town with a watch has a gaol: one of its houses near the centre, its door marked. People are held in
// it (two to five; a settlement's number is its own). The door is locked: break the lock and they walk free. Seen doing
// it, you are wanted for it. A gaol emptied fills again three days later (one to four new prisoners), so "every cell"
// means every cell AT ONCE.
//   MINOR    every gaol in one region empty at the same time.
//   MAJOR    every gaol in the world empty at the same time.
// A gaol in a settlement that has been razed, or a region the surge took, holds nobody and is not counted.
// State: `player.gaols428` { [settlementId]: { n, emptiedDay } }.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { REGIONS, regionPoint } from '../data/regions.js';
import { seededRng } from '../data/awakening.js';

export const GAOL = { refillDays: 3, startMin: 2, startMax: 5, refillMin: 1, refillMax: 4, doorTiles: 22 };
const PRISONER_ART = ['npc_peasant_man', 'npc_townsman', 'npc_patterned_man', 'npc_cheerful_peasant_girl', 'npc_farmer'];

export const GaolMixin = {
  /** The settlements that keep a gaol: a city or a town with a watch, not a bandit city. */
  _gaolSettlements() {
    if (this._gaolList) return this._gaolList;
    const out = [];
    for (const region of REGIONS) {
      for (const st of (region.settlements || [])) {
        if (!(st.kind === 'city' || st.kind === 'town') || st.bandit) continue;
        if (this._isBanditSettlement && this._isBanditSettlement(st.id)) continue;
        const c = st._centre || regionPoint(region, st.at);
        if (c) out.push({ st, region, at: { x: c.x, y: c.y } });
      }
    }
    this._gaolList = out;
    return out;
  },

  _gaolState() {
    const p = this.player;
    if (!p.gaols428 || typeof p.gaols428 !== 'object') p.gaols428 = {};
    for (const G of this._gaolSettlements()) {
      if (!p.gaols428[G.st.id]) {
        const rng = seededRng(`gaol|${G.st.id}`);
        p.gaols428[G.st.id] = { n: GAOL.startMin + Math.floor(rng() * (GAOL.startMax - GAOL.startMin + 1)), emptiedDay: null };
      }
    }
    return p.gaols428;
  },

  /** Is this gaol out of the count: its settlement razed, or its region lost to the surge? */
  _gaolGone(G) {
    const R = this.player.razed428;
    if (R && R.fallen && R.fallen[G.st.id]) return true;
    const fr = this._fallenRecord ? this._fallenRecord()[G.region.id] : null;
    return !!(fr && !fr.resettled);
  },

  /** Mark each gaol's door, once the doorways exist. */
  _gaolAssign() {
    if (!this.doorways || !this.doorways.length) return false;
    for (const G of this._gaolSettlements()) {
      const had = this.doorways.find(d => d.gaolOf === G.st.id);
      if (had && G.door === had && G.sign) continue;
      if (had) { had.gaolOf = null; }
      const cands = this.doorways.filter(d => d.kind === 'enter' && d.generic && !d.cave && d.building && !d.gaolOf
        && Math.hypot(d.x - G.at.x, d.y - G.at.y) <= GAOL.doorTiles * TILE)
        .sort((a, b) => Math.hypot(a.x - G.at.x, a.y - G.at.y) - Math.hypot(b.x - G.at.x, b.y - G.at.y));
      if (!cands.length) continue;
      const rng = seededRng(`gaoldoor|${G.st.id}`);
      const d = cands[Math.floor(rng() * Math.min(4, cands.length))];
      d.gaolOf = G.st.id;
      d.label = 'break into the gaol';
      G.door = d;
      if (this.add) {
        const pr = isoProject(d.x, d.y);
        const t = this.add.text(pr.x, pr.y - 70, 'GAOL', { fontFamily: 'serif', fontSize: '13px', color: '#d7ccc8', stroke: '#1b1210', strokeThickness: 3 });
        t.setOrigin(0.5, 1);
        t.setDepth(isoDepth(d.x, d.y) + 2000);
        G.sign = t;
      }
    }
    return true;
  },

  _gaolRestore() {
    for (const G of this._gaolSettlements()) { if (G.sign) G.sign.destroy(); G.sign = null; G.door = null; }
    this._gaolAssigned = false;
    if (this.player) this._gaolState();
  },

  _gaolTick(dt) {
    if (!this.player) return;
    if (!this._gaolAssigned) this._gaolAssigned = this._gaolAssign();
    this._gaolWalkers(dt);
    this._gaolLookT = (this._gaolLookT || 0) + dt;
    if (this._gaolLookT < 3) return;
    this._gaolLookT = 0;
    // a region's houses (and so its doors) are built when it is first near; mark the gaols as their doors appear
    if (this._gaolSettlements().some(G => !G.door)) this._gaolAssign();
    this._gaolRefill();
  },

  /** Three days after a gaol was emptied, it has new prisoners. */
  _gaolRefill() {
    const S = this._gaolState(), day = this._dayIndex ? this._dayIndex() : 0;
    for (const G of this._gaolSettlements()) {
      const r = S[G.st.id];
      if (!r || r.n > 0 || r.emptiedDay == null || this._gaolGone(G)) continue;
      if (day - r.emptiedDay < GAOL.refillDays) continue;
      const rng = seededRng(`gaolrefill|${G.st.id}|${day}`);
      r.n = GAOL.refillMin + Math.floor(rng() * (GAOL.refillMax - GAOL.refillMin + 1));
      r.emptiedDay = null;
    }
  },

  /** From `_useDoorway`: the gaol's door. */
  _gaolDoor(d) {
    const G = this._gaolSettlements().find(g => g.st.id === d.gaolOf);
    if (!G) return;
    this._gaolRefill();
    const r = this._gaolState()[G.st.id];
    if (!r.n) { this._openDialogue(`The gaol of ${G.st.name}`, 'Every cell stands open and empty.'); return; }
    this._openDialogue(`The gaol of ${G.st.name}`,
      `Through the grate in the door: ${r.n} ${r.n === 1 ? 'person' : 'people'} in the cells, and an iron lock older than any of them.`,
      null, [
        { label: 'Break the lock and set them free (a crime)', act: `gaol|free|${G.st.id}` },
        { label: 'Leave them', act: 'gaol|leave' },
      ]);
  },

  _gaolAct(act) {
    const [, what, id] = String(act).split('|');
    this._closeDialogue();
    if (what !== 'free') return;
    const G = this._gaolSettlements().find(g => g.st.id === id);
    if (!G) return;
    const r = this._gaolState()[id];
    const n = r.n;
    if (!n) return;
    r.n = 0;
    r.emptiedDay = this._dayIndex ? this._dayIndex() : 0;
    this._gaolSpawnFreed(G, n);
    const seen = this._banditJobWitnesses ? this._banditJobWitnesses(null) : [];
    if (seen.length && this._crimeReport) this._crimeReport('breakout', { b: { settlement: id } });
    else this._floatText(this.world.x, this.world.y - 60, 'Nobody saw', '#c5e1a5');
    this._gaolCheckLiberty(G);
  },

  /** Every cell in the region, then every cell in the world. */
  _gaolCheckLiberty(G) {
    const S = this._gaolState();
    const empty = (g) => this._gaolGone(g) || !(S[g.st.id] && S[g.st.id].n > 0);
    const all = this._gaolSettlements();
    if (all.filter(g => g.region.id === G.region.id).every(empty) && this._dsDeed) this._dsDeed('liberty', 'minor', G.region.id);
    if (all.every(empty) && this._dsDeed) this._dsDeed('liberty', 'major', 'world');
  },

  /** The freed walk out of the door and away. */
  _gaolSpawnFreed(G, n) {
    const d = G.door;
    if (!d || !this.add) return;
    this._gaolFreed = this._gaolFreed || [];
    for (let i = 0; i < n; i++) {
      const key = PRISONER_ART[(i + G.st.id.length) % PRISONER_ART.length];
      if (!this.textures.exists(key)) continue;
      const art = NPC_ART[key] || { footX: 32, footY: 63, scale: 1 };
      const x = d.x + (i - n / 2) * 18, y = d.y + 20;
      const pr = isoProject(x, y);
      const sprite = this.add.sprite(pr.x, pr.y, key, dirRow('south'));
      sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
      sprite.setScale(art.scale || 1);
      sprite.setDepth(isoDepth(x, y));
      const th = Math.random() * Math.PI * 2;
      this._gaolFreed.push({ sprite, artKey: key, which: 0, x, y, vx: Math.cos(th), vy: Math.sin(th), t: 0 });
    }
    if (this._gaolFreed.length && this._sayOverhead) this._sayOverhead(this._gaolFreed[this._gaolFreed.length - 1], 'Free! Run!', '#c5e1a5', 2.5);
  },

  /** Walk the freed away for a few seconds, then they are gone. */
  _gaolWalkers(dt) {
    const list = this._gaolFreed;
    if (!list || !list.length) return;
    for (const f of list) {
      f.t += dt;
      f.x += f.vx * 110 * dt; f.y += f.vy * 110 * dt;
      if (f.sprite && f.sprite.active) {
        const pr = isoProject(f.x, f.y);
        f.sprite.setPosition(pr.x, pr.y);
        f.sprite.setDepth(isoDepth(f.x, f.y));
        if (this._npcWalkFrame) this._npcWalkFrame(f, f.artKey, facingFromMove(f.vx, f.vy) || 'south', true, dt);
        if (f.t > 6) f.sprite.setAlpha(Math.max(0, 1 - (f.t - 6) / 3));
      }
    }
    for (const f of list.filter(x => x.t > 9)) if (f.sprite) f.sprite.destroy();
    this._gaolFreed = list.filter(x => x.t <= 9);
  },
};
