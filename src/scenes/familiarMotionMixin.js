// ============================================================================
// ROUND 410 -- SUMMONS MOVE IN THEIR OWN WAYS.
//
// The user: "Summons should not just circle around the player nonstop. Each monster should have it's own behaviors.
// Trying to stay in front of the player, following the player, patrolling near the player, darting forward then back,
// and all sorts of movements. Otherwise a summoner will have 8 creatures circling them nonstop which will be very
// irritating."
//
// A bonded familiar used to be a screen point on an ellipse round its owner, turned at a fixed 2.2 rad/s forever. Now
// it stands somewhere in the world (f.wx, f.wy) and walks to a STATION its behaviour sets, relative to where its owner
// is and which way they face:
//
//   vanguard   keeps a few paces ahead of you, swaying across your path
//   heel       follows a step behind, off one shoulder
//   flank      holds your left or right side
//   patrol     walks a beat across your path and back, pausing at each end
//   dart       waits at your side, then darts out ahead and comes back
//   wander     potters about near you, choosing a new spot every few seconds
//   sentinel   (a floating relic, a conjured blade, an orb) hangs at one shoulder and bobs
//
// THE CHOICE is the creature's: a charger darts, a kiter patrols, an ambusher flanks, a big heavy thing leads, a small
// one heels, a flier or a bird wanders, a relic stands sentinel -- and then SPREAD across the owner's familiars, so a
// summoner with eight creatures has eight different things going on, not one behaviour eight times. Each familiar
// keeps its behaviour and side for as long as it exists (stable per ability and slot).
//
// It strikes as before (nearest enemy within its reach of the OWNER), and a creature lunges a short way at what it
// strikes, playing its attack sheet where it has one.
// ============================================================================
import { isoProject, isoDepth, facingFromMove, moveFromFacing } from '../data/iso.js';
import { MONSTER_TYPES, AIRBORNE_FAMILIES } from '../data/monsters.js';
import { stableHash } from '../data/awakening.js';

export const FAMILIAR_BEHAVIOURS = ['vanguard', 'heel', 'flank', 'patrol', 'dart', 'wander'];
const SPEED = 230;            // world px/s at the most, faster than a walking owner so it keeps its station
const CATCH_UP = 420;         // further than this from its owner and it reappears beside them
const LUNGE_S = 0.32;

/** What a creature of this family tends to do. */
export function familiarBehaviourFor(family) {
  if (!family) return 'sentinel';
  if (AIRBORNE_FAMILIES && AIRBORNE_FAMILIES.has && AIRBORNE_FAMILIES.has(family)) return 'wander';
  const t = Object.values(MONSTER_TYPES).find(x => x.family === family && !x.young) || null;
  if (!t) return 'heel';
  if (t.gait === 'kite') return 'patrol';
  if (t.gait === 'charge') return 'dart';
  if (t.ambush) return 'flank';
  if ((t.radius || 12) >= 17) return 'vanguard';
  if ((t.radius || 12) <= 11) return 'heel';
  return 'wander';
}

export const FamiliarMotionMixin = {
  /** Behaviour and side for every familiar, spread across each owner's set (call after the list is rebuilt). */
  _famAssignBehaviours() {
    const byOwner = new Map();
    for (const f of (this._familiars || [])) {
      const k = f.owner || 'player';
      if (!byOwner.has(k)) byOwner.set(k, []);
      byOwner.get(k).push(f);
    }
    for (const list of byOwner.values()) {
      const used = new Map();
      list.forEach((f, i) => {
        const relic = !f.family && !f.fowl && !f.dragon;
        let want = f.fowl ? 'wander' : f.dragon ? 'vanguard' : relic ? 'sentinel' : familiarBehaviourFor(f.family);
        if (f.a && f.a.familiarBehaviour) want = f.a.familiarBehaviour;
        // Spread: a behaviour already taken by one of this owner's familiars passes to the next one free, starting
        // from a place fixed by the ability, so the same kit always arranges itself the same way.
        if (want !== 'sentinel' && (used.get(want) || 0) >= 1) {
          const h = stableHash(`fam|${(f.a && (f.a.key || f.a.name)) || ''}|${i}`);
          for (let j = 0; j < FAMILIAR_BEHAVIOURS.length; j++) {
            const b = FAMILIAR_BEHAVIOURS[(h + j) % FAMILIAR_BEHAVIOURS.length];
            if (!(used.get(b) >= 1)) { want = b; break; }
          }
        }
        used.set(want, (used.get(want) || 0) + 1);
        f.behaviour = want;
        // Sides alternate, so two flankers take both flanks and two sentinels both shoulders.
        const sameBefore = list.slice(0, i).filter(g => g.behaviour === want).length;
        f.side = sameBefore % 2 === 0 ? 1 : -1;
        if (f.behaviour === 'sentinel' || f.behaviour === 'flank') f.side = ((used.get(want) || 1) % 2) ? 1 : -1;
        f.bt = (stableHash(`famt|${i}|${(f.a && f.a.name) || ''}`) % 1000) / 100;
      });
    }
  },

  /** Where this familiar is going right now (world px), from its behaviour. */
  _famStation(f, ox, oy, facing, dt) {
    const v = moveFromFacing(facing || 'south') || { dx: 0, dy: 1 };
    const vl = Math.hypot(v.dx, v.dy) || 1;
    const fx = v.dx / vl, fy = v.dy / vl;
    const rx = -fy, ry = fx;
    const s = f.side || 1, t = f.bt;
    const at = (fw, rt) => ({ x: ox + fx * fw + rx * rt * s, y: oy + fy * fw + ry * rt * s });
    switch (f.behaviour) {
      case 'vanguard': return at(60, Math.sin(t * 0.7) * 22);
      case 'heel': return at(-46, 20);
      case 'flank': return at(4 + Math.sin(t * 0.5) * 8, 54);
      case 'patrol': {
        // A beat across the path: walk, pause, walk back, pause (a 9 s round).
        const ph = t % 9;
        const u = ph < 3.5 ? -1 + (ph / 3.5) * 2 : ph < 4.5 ? 1 : ph < 8 ? 1 - ((ph - 4.5) / 3.5) * 2 : -1;
        return at(26, u * 62 * s);
      }
      case 'dart': {
        // Waits at the side, darts out ahead and holds a moment, comes back (a 5 s round).
        const ph = t % 5;
        if (ph < 3) return at(-6, 38);
        if (ph < 3.5) return at(-6 + (ph - 3) / 0.5 * 116, 38 - (ph - 3) / 0.5 * 20);
        if (ph < 4) return at(110, 18);
        return at(110 - (ph - 4) * 116, 18 + (ph - 4) * 20);
      }
      case 'wander': {
        f.wanderT = (f.wanderT == null ? 0 : f.wanderT) - dt;
        const far = f.wanderAt && Math.hypot(f.wanderAt.x - ox, f.wanderAt.y - oy) > 95;
        if (!f.wanderAt || f.wanderT <= 0 || far) {
          const h = stableHash(`wander|${Math.floor(t * 10)}|${f.side}`);
          const ang = (h % 628) / 100, rad = 34 + (h >> 10) % 46;
          f.wanderAt = { x: ox + Math.cos(ang) * rad, y: oy + Math.sin(ang) * rad };
          f.wanderT = 2.5 + ((h >> 4) % 20) / 10;
        }
        return f.wanderAt;
      }
      case 'sentinel':
      default: return at(-8, 24);
    }
  },

  /**
   * One frame of a familiar: walk toward its station, lunge at what it just struck, face where it goes. Returns the
   * screen point it stands at (the strike's origin), with `moving` and `facing` on `f`.
   */
  _famMove(f, owner, ox, oy, dt) {
    f.bt = (f.bt || 0) + dt;
    const facing = owner ? (owner.facing || 'south') : ((this.player && this.player.facing) || 'south');
    if (!Number.isFinite(f.wx) || Math.hypot(f.wx - ox, f.wy - oy) > CATCH_UP) {
      const st = this._famStation(f, ox, oy, facing, 0);
      f.wx = st.x; f.wy = st.y;
    }
    const st = this._famStation(f, ox, oy, facing, dt);
    let dx = st.x - f.wx, dy = st.y - f.wy;
    const d = Math.hypot(dx, dy);
    // Fast when far behind, gentle when nearly there, so a station that sways is followed smoothly.
    const sp = Math.min(SPEED, 40 + d * 3.2);
    const step = Math.min(d, sp * dt);
    if (d > 0.01) { f.wx += (dx / d) * step; f.wy += (dy / d) * step; }
    f.moving = step > 0.35 && d > 3;
    if (f.moving) f.facing = facingFromMove(dx, dy) || f.facing;
    else if (!f.lungeT) f.facing = f.behaviour === 'heel' || f.behaviour === 'sentinel' ? facing : (f.facing || facing);
    // The lunge: a short reach toward what it struck, and back.
    let lx = 0, ly = 0;
    if (f.lungeT > 0 && f.lungeAt) {
      f.lungeT -= dt;
      const k = Math.sin(Math.max(0, f.lungeT) / LUNGE_S * Math.PI);
      const ldx = f.lungeAt.x - f.wx, ldy = f.lungeAt.y - f.wy, ld = Math.hypot(ldx, ldy) || 1;
      const reach = Math.min(30, ld * 0.5) * k;
      lx = (ldx / ld) * reach; ly = (ldy / ld) * reach;
      f.facing = facingFromMove(ldx, ldy) || f.facing;
      if (f.lungeT <= 0) f.lungeT = 0;
    }
    const p = isoProject(f.wx + lx, f.wy + ly);
    const grounded = f.fowl || f.dragon || !!f.family;
    const bob = grounded ? 0 : -22 + Math.sin(f.bt * 2.4) * 3;
    f.sprite.setPosition(p.x, p.y + bob);
    f.sprite.setDepth(isoDepth(f.wx, f.wy) + 2);
    return { x: p.x, y: p.y + bob };
  },

  /** A familiar has just struck `m`: it lunges at it, and plays its swing if its sheet has one. */
  _famStruck(f, m) {
    if (!f || !m) return;
    f.lungeAt = { x: m.wx, y: m.wy };
    f.lungeT = LUNGE_S;
    f.atkT = 0.45;
  },
};
