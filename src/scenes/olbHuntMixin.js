// ===========================================================================
// ROUND 315 -- OLB NIKOBE'S HUNT: THE SCENE SIDE.
//
// The words, the room and the numbers are in src/data/olbHunt.js. This file is
// what needs a world: Olb walking at your shoulder and fighting, a nest with
// three packs in it, a seam in the air, the cave below it, and the hall at the
// end of the cave where something bad is being planned.
//
// Kept on `player.olb.hunt` (a plain field, so it saves): `{ step, nest, ... }`.
// `player.olb.phase` is 'hunt' for as long as it runs.
//
// HOW OLB IS BUILT. He is not a party member: a party member needs three
// animated sheets, a kit and a slot, and she needs to walk, stop and hit for
// the length of one story. She is a body of her own -- an NPC sprite, the NPC
// walk cycle, a follow, and a swing -- ticked from `_olbHuntTick`. He cannot be
// hurt: the monsters go for you, and this is a lesson, not an escort.
// ===========================================================================

import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { CHAR_ART } from '../data/characterManifest.js';
import { cultistArtKey, CULT_BY_SLUG } from '../data/cultists.js';
import { denMonsterKeys } from '../data/dens.js';
import { MONSTER_TYPES, monsterKeysAtTier } from '../data/monsters.js';
import { seededRng } from '../data/awakening.js';
import { INTERIOR_PROPS, INTERIOR_PROP_ART, OLB_ASTRAL_ROOM } from '../data/interiors.js';
import {
  OLB_ROOM_ID, olbAstralMap, OLB_NEST, OLB_ASTRAL_MOBS, OLB_BODY, OLB_CULT, OLB_STAFF,
  olbShouldWalk, olbFollowSpeed, olbWalkAnimRate, OLB_WALK_HOLD_S,
  OLB_HUNT_OFFER, OLB_HUNT_NOT_YET, OLB_HUNT_GO, OLB_COMPANION_TALK, OLB_APERTURE_PAGES,
  OLB_APERTURE_ENTER, OLB_BARKS, OLB_WATCH_PAGES, OLB_FIGHT_LINES, OLB_GOD_TRIGGER,
} from '../data/olbHunt.js';
import { OLB_NAME } from '../data/olbArc.js';

const STEPS_IN_ROOM = ['astral', 'watch', 'fight', 'god'];

export const OlbHuntMixin = {

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  _olbHunt() {
    const st = this.player && this.player.olb;
    return st && st.phase === 'hunt' ? st.hunt : null;
  },

  _olbInRoom() { return !!(this._insideRoom && this._insideRoom.id === OLB_ROOM_ID); },

  // -------------------------------------------------------------------------
  // THE ASK, AND THE START
  // -------------------------------------------------------------------------
  /** Talked to at the hall once the lessons are done and the aura is learned. */
  _olbHuntOffer(npc) {
    this._olbSay(OLB_HUNT_OFFER.slice(0, -1), () => {
      this._openDialogue(OLB_NAME, OLB_HUNT_OFFER[OLB_HUNT_OFFER.length - 1], npc,
        [{ act: 'olbh|go', label: 'I am ready' }, { act: 'olbh|no', label: 'Not yet' }]);
    }, 'Go on');
  },

  /** The dialogue buttons of the hunt: 'olbh|go', 'olbh|no', 'olbh|p|<n>'
   *  (scene pages) and 'olbh|end' (a scene is over). */
  _olbHuntAct(act) {
    const parts = String(act).split('|');
    const what = parts[1];
    // ROUND 389 -- the same door at the button: not until all four essences are in (an essence taken out mid-offer)
    if (what === 'go' && this._olbHuntReady && !this._olbHuntReady()) { this._olbHuntRefuse(this._lastTalkNpc); return; }
    if (what === 'go') { this._closeDialogue(); this._olbHuntStart(); return; }
    if (what === 'no') { this._openDialogue(OLB_NAME, OLB_HUNT_NOT_YET, this._lastTalkNpc); return; }
    if (what === 'p') { this._olbScenePage(Number(parts[2]) || 0); return; }
    if (what === 'end') {
      const sc = this._olbScene;
      this._olbScene = null;
      this._closeDialogue();
      if (sc && sc.onEnd) sc.onEnd();
    }
  },

  _olbHuntStart() {
    const st = this._olbState();
    if (!st || st.phase === 'hunt') return;
    st.phase = 'hunt';
    st.hunt = { step: 'nest', nest: null, said: {}, kills: 0 };
    const nest = this._olbFindNest();
    st.hunt.nest = nest ? { x: nest.x, y: nest.y } : null;
    this._olbBuildNest();
    this._olbEnsureBody(true);
    this._openDialogue(OLB_NAME, OLB_HUNT_GO, this._lastTalkNpc);
    this._floatText(this.world.x, this.world.y - 46, 'The hunt: clear the nest east of the walls', '#ffd54f');
  },

  // -------------------------------------------------------------------------
  // THE NEST: a clear patch of ground east of Cadence's wall
  // -------------------------------------------------------------------------
  _olbFindNest() {
    const r = this._cadenceWallRect;
    let ox = 0, oy = 0;
    try { const o = this._outlineOriginTile(); ox = o.tx; oy = o.ty; } catch (e) { /* tests with no city */ }
    const eastX = r ? ox + r.x1 : Math.floor(this.world.x / TILE);
    const midY = r ? oy + Math.round((r.y0 + r.y1) / 2) : Math.floor(this.world.y / TILE);
    const clear = (wx, wy) => {
      const R = OLB_NEST.clearRadius * TILE;
      const pts = [[0, 0]];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        pts.push([Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5], [Math.cos(a) * R, Math.sin(a) * R]);
      }
      return pts.every(([dx, dy]) => !this._isWaterAt(wx + dx, wy + dy) && !this._collidesObstacle(wx + dx, wy + dy, 56));
    };
    const offs = [0, 8, -8, 16, -16, 24, -24, 36, -36, 50, -50, 70, -70];
    for (let out = OLB_NEST.minOut; out <= OLB_NEST.maxOut; out += 4) {
      for (const dy of offs) {
        const wx = (eastX + out + 0.5) * TILE, wy = (midY + dy + 0.5) * TILE;
        if (clear(wx, wy)) return { x: wx, y: wy };
      }
    }
    return { x: (eastX + OLB_NEST.minOut + 0.5) * TILE, y: (midY + 0.5) * TILE };
  },

  _olbBuildNest() {
    const h = this._olbHunt();
    if (!h || !h.nest || h.nestBuilt) return;
    h.nestBuilt = true;
    this.spawnGroups = this.spawnGroups || [];
    const keys = denMonsterKeys(OLB_NEST.families, OLB_NEST.tier, MONSTER_TYPES, monsterKeysAtTier);
    const rng = seededRng(`olbNest|${Math.round(h.nest.x)}|${Math.round(h.nest.y)}`);
    this._olbNestGroups = [];
    for (const [dx, dy, n] of OLB_NEST.packs) {
      let x = h.nest.x + dx * TILE, y = h.nest.y + dy * TILE;
      const key = keys[Math.floor(rng() * keys.length)];
      const g = {
        region: 'nek', key, x, y, homeX: x, homeY: y, count: n, tier: OLB_NEST.tier,
        label: 'The nest', roams: false, awake: false, cooldown: 0, members: [], olbHunt: 'nest',
      };
      this.spawnGroups.push(g);
      this._olbNestGroups.push(g);
    }
  },

  /** Poll a set of groups the way the farm job does: a group whose last member
   *  fell carries a `clearedUntil` stamp. Sealed (Infinity) so it stays down. */
  _olbGroupsCleared(groups) {
    let n = 0;
    for (const g of groups || []) {
      if (g.olbCleared) { n++; continue; }
      if (g.clearedUntil !== undefined && (this._clockT || 0) < g.clearedUntil) {
        g.olbCleared = true; g.clearedUntil = Infinity; n++;
      }
    }
    return n;
  },

  // -------------------------------------------------------------------------
  // OLB'S BODY: follow, fight, bark
  // -------------------------------------------------------------------------
  _olbEnsureBody(place) {
    if (this._olbBody && this._olbBody.sprite && this._olbBody.sprite.active) {
      if (place) this._olbPlaceBeside();
      return this._olbBody;
    }
    const art = NPC_ART[OLB_BODY.art];
    if (!art || !this.textures.exists(OLB_BODY.art)) return null;
    const p = isoProject(this.world.x, this.world.y);
    const sprite = this.add.sprite(p.x, p.y, OLB_BODY.art, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale(art.scale);
    const b = {
      x: this.world.x, y: this.world.y, facing: 'south', sprite, atkT: 0, swingT: 0, moving: false,
      name: OLB_NAME, alive: true,
    };
    this._olbBody = b;
    // the woman in the hall is the same woman: she is out with you now
    this._olbHideHallNpc();
    // so she can be spoken to
    b.entry = {
      name: OLB_NAME, artKey: null, sprite, x: b.x, y: b.y, shopId: null, olbBody: true,
      dialogue: OLB_COMPANION_TALK.nest[0],
    };
    this.npcs.push(b.entry);
    this._olbPlaceBeside();
    return b;
  },

  _olbPlaceBeside() {
    const b = this._olbBody;
    if (!b) return;
    const base = (this.player.aimAngle || 0) + Math.PI * 0.75;
    let px = this.world.x, py = this.world.y;
    outer:
    for (const r of [OLB_BODY.followDist, OLB_BODY.followDist * 0.6]) {
      for (let i = 0; i < 8; i++) {
        const a = base + (i / 8) * Math.PI * 2;
        const x = this.world.x + Math.cos(a) * r, y = this.world.y + Math.sin(a) * r;
        if (this._collidesObstacle(x, y, 14) || this._isWaterAt(x, y)) continue;
        px = x; py = y; break outer;
      }
    }
    b.x = px; b.y = py;
    this._olbDraw(b, 0);
  },

  _olbHideHallNpc() {
    for (const n of this.npcs || []) {
      if (n.trainKey === 'olb') {
        n.hidden = true;
        if (n.sprite && n.sprite.setVisible) n.sprite.setVisible(false);
      }
    }
  },

  _olbShowHallNpc() {
    if (this._olbIsDead && this._olbIsDead()) { this._olbHideHallNpc(); return; }   // ROUND 316 -- she is not coming back
    for (const n of this.npcs || []) {
      if (n.trainKey === 'olb') {
        n.hidden = false;
        if (n.sprite && n.sprite.setVisible) n.sprite.setVisible(true);
      }
    }
  },

  /** Take her out of the world (the hunt is over for her). */
  _olbDropBody() {
    const b = this._olbBody;
    if (!b) return;
    if (b.entry) this.npcs = this.npcs.filter(n => n !== b.entry);
    if (b.sprite && b.sprite.destroy) b.sprite.destroy();
    this._olbBody = null;
  },

  _olbDraw(b, dt) {
    const p = isoProject(b.x, b.y);
    b.sprite.setPosition(p.x, p.y);
    b.sprite.setDepth(isoDepth(b.x, b.y));
    // ROUND 403 -- the walk cycle runs at the pace she is actually going (OLB_BODY.speed is the sheet's full pace), so
    // a slow walk is a slow stride, not a full-speed stride that keeps stopping
    const pace = b.moving ? olbWalkAnimRate(b.pace != null ? b.pace : OLB_BODY.speed) : 1;
    this._npcWalkFrame(b, OLB_BODY.art, b.facing, b.moving, dt * pace);
    if (b.entry) { b.entry.x = b.x; b.entry.y = b.y; }
  },

  _olbPickTarget() {
    const b = this._olbBody;
    const px = this.world.x, py = this.world.y;
    let best = null, bestD = Infinity;
    const consider = (kind, ref, x, y) => {
      const dp = Math.hypot(x - px, y - py);
      if (dp > OLB_BODY.engage) return;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < bestD) { bestD = d; best = { kind, ref, x, y }; }
    };
    for (const m of this.monsters || []) if (m.alive) consider('monster', m, m.wx, m.wy);
    if (this._olbInRoom()) {
      const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
      // ROUND 359 -- the packs on the way fight once they have spoken; the hall only once it has sensed you
      if (camp) for (const c of camp.people || []) if (c.alive && (c.pack ? c.packAwake : camp.engaged)) consider('person', c, c.x, c.y);
    }
    return best;
  },

  _olbCompanionTick(dt) {
    const b = this._olbBody;
    if (!b || !b.sprite || !b.sprite.active) return;
    const h = this._olbHunt();
    const frozen = h && h.frozen;            // a cutscene holds her where it put her
    let goal = null;
    b.swingT = Math.max(0, b.swingT - dt);
    let t0 = null;
    if (!frozen) {
      const t = this._olbPickTarget();
      t0 = t;
      if (t) {
        const d = Math.hypot(t.x - b.x, t.y - b.y);
        b.facing = facingFromMove(t.x - b.x, t.y - b.y) || b.facing;
        if (d > OLB_BODY.reach + (t.ref.type ? t.ref.type.radius || 0 : 0)) goal = { x: t.x, y: t.y };
        else if (b.swingT <= 0) {
          b.swingT = OLB_BODY.gap;
          if (t.kind === 'monster') this._damageMonster(t.ref, OLB_BODY.dmg, false, true);
          else this._hitOneRealmCultist(t.ref, OLB_BODY.dmg * 1.4);
          this._floatText(t.x, t.y - 30, String(OLB_BODY.dmg), '#ffe082');
        }
      } else {
        const a = (this.player.aimAngle || 0) + Math.PI;
        goal = { x: this.world.x + Math.cos(a) * OLB_BODY.followDist, y: this.world.y + Math.sin(a) * OLB_BODY.followDist };
        // ROUND 388 -- the Seam's sky is solid now, and the spot behind you may be out over it: then she closes on you
        // instead, and stands where she is once she is a pace or so off.
        if (this._collidesObstacle(goal.x, goal.y, 14)) {
          goal = Math.hypot(this.world.x - b.x, this.world.y - b.y) > OLB_BODY.followDist * 1.4 ? { x: this.world.x, y: this.world.y } : null;
        }
      }
    }
    // ROUND 403 -- "Olbs movement animation freaks out if the player walks to slow." She used to step the moment her
    // spot behind you was 8px off and stop the moment it was not, at her own full speed: behind a slow walk that was a
    // stride, a stop, a stride, every few frames. Now she paces the player (their measured speed, a little more when she
    // has fallen behind), starts only once the spot has drifted a real distance and stops only once she is on it, and
    // holds the walk through a frame or two without a step.
    const pv = this._olbPlayerPace(dt);
    const wasMoving = b.moving;
    b.moving = false;
    let stepped = 0;
    if (goal) {
      const dist = Math.hypot(goal.x - b.x, goal.y - b.y);
      if (Math.hypot(this.world.x - b.x, this.world.y - b.y) > OLB_BODY.catchUp) { this._olbPlaceBeside(); return; }
      const go = olbShouldWalk(dist, wasMoving || (b.walkHold || 0) > 0, t0 ? 0 : pv);
      if (go) {
        // ROUND 388 -- in the Seam she goes round its bends by the path grid (the sky is blocked there) rather than
        // straight into the edge of the ground
        let aim = goal;
        if (this._olbInRoom && this._olbInRoom() && this._navAim) aim = this._navAim(b, b.x, b.y, goal.x, goal.y, {}) || goal;
        const ad = Math.hypot(aim.x - b.x, aim.y - b.y) || 1;
        const step = Math.min(dist, ad, olbFollowSpeed(dist, pv, !!(this._olbPickTarget && t0)) * dt);
        const ux = (aim.x - b.x) / ad, uy = (aim.y - b.y) / ad;
        const ok = (x, y) => !this._collidesObstacle(x, y, 14) && !this._isWaterAt(x, y);
        let nx = b.x + ux * step, ny = b.y + uy * step;
        if (ok(nx, ny)) { b.x = nx; b.y = ny; b.moving = true; }
        else if (ok(b.x + ux * step, b.y)) { b.x += ux * step; b.moving = true; }
        else if (ok(b.x, b.y + uy * step)) { b.y += uy * step; b.moving = true; }
        else { b.stuckT = (b.stuckT || 0) + dt; if (b.stuckT > 1.2) { b.stuckT = 0; this._olbPlaceBeside(); } }
        if (b.moving) { b.facing = facingFromMove(ux, uy) || b.facing; stepped = step; }
      }
    }
    // the pace she actually went, smoothed, for the stride
    const v = dt > 0 ? stepped / dt : 0;
    if (stepped > 0) { b.walkHold = OLB_WALK_HOLD_S; b.pace = b.pace == null ? v : b.pace + (v - b.pace) * Math.min(1, dt * 10); }
    else if ((b.walkHold || 0) > 0 && goal) { b.walkHold -= dt; b.moving = true; }
    else b.walkHold = 0;
    this._olbDraw(b, dt);
  },

  /** ROUND 403 -- the player's speed (world px/s), smoothed over a few frames. */
  _olbPlayerPace(dt) {
    const x = this.world.x, y = this.world.y;
    const last = this._olbPaceAt;
    this._olbPaceAt = { x, y };
    if (!last || !(dt > 0)) return this._olbPace || 0;
    const v = Math.min(600, Math.hypot(x - last.x, y - last.y) / dt);
    this._olbPace = (this._olbPace || 0) + (v - (this._olbPace || 0)) * Math.min(1, dt * 8);
    return this._olbPace;
  },

  _olbBark(text) {
    const b = this._olbBody;
    if (b && text) this._sayOverhead(b, text, '#ffe082', 3.2);
  },

  _olbTalkBody(npc) {
    const h = this._olbHunt();
    const lines = (h && OLB_COMPANION_TALK[h.step]) || OLB_COMPANION_TALK.nest;
    this._openDialogue(OLB_NAME, lines[Math.abs((this.player.xp | 0)) % lines.length], npc);
  },

  // -------------------------------------------------------------------------
  // THE TICK
  // -------------------------------------------------------------------------
  _olbHuntTick(dt) {
    // ROUND 316 -- Esc closes a dialogue, and a scene waits on its last page:
    // an open scene whose box has gone comes back on the page it was on.
    if (this._olbScene && !this._dialogueOpen) {
      this._olbSceneGap = (this._olbSceneGap || 0) + dt;
      if (this._olbSceneGap > 0.6) { this._olbSceneGap = 0; this._olbScenePage(this._olbScene.i || 0); }
    } else this._olbSceneGap = 0;
    const h = this._olbHunt();
    if (!h) {
      if (this._olbSky && this._olbStarscape) this._olbStarscape(false);   // ROUND 359
      // ROUND 316 -- Olb is dead: the man in the hall stays gone, however the hall is rebuilt
      this._olbDeadT = (this._olbDeadT || 0) + dt;
      if (this._olbDeadT > 1) { this._olbDeadT = 0; if (this._olbIsDead && this._olbIsDead()) this._olbHideHallNpc(); }
      return;
    }
    const goneBody = (this._olbCut && this._olbCut.gone) || h.step === 'wake';   // ROUND 316 -- she is not coming back
    if (!goneBody) this._olbEnsureBody(false);
    if (this._olbBody) {
      // the hall's Olb stays gone while this one is out with you
      this._olbHideHallNpc();
      this._olbCompanionTick(dt);
    }
    if (this._olbCut) this._olbCutTick(dt);            // ROUND 316 -- the finale
    if (this._olbAstralTick) this._olbAstralTick(dt);   // ROUND 359 -- the sky, the portals, the shield
    if (this._olbRoadTalkTick) this._olbRoadTalkTick(h, dt);   // ROUND 359 (7) -- talking on the road
    this._olbHuntT = (this._olbHuntT || 0) + dt;
    this._olbApertureDraw(dt);
    if (this._olbHuntT < 0.25) return;
    this._olbHuntT = 0;
    this._olbHuntSanity(h);
    switch (h.step) {
      case 'nest': this._olbStepNest(h); break;
      case 'astral': this._olbStepAstral(h); break;
      case 'fight': this._olbStepFight(h); break;
      default: break;
    }
  },

  /** A save can be made anywhere and a death sends you home: a step that
   *  belongs in the cave but finds the player outside it is put back at the
   *  seam. */
  _olbHuntSanity(h) {
    if ((h.step === 'god' || h.step === 'farside') && !this._olbCut) { this._olbCutResume(h); return; }   // ROUND 316
    if (this._olbCut) return;
    if (STEPS_IN_ROOM.includes(h.step) && !this._olbInRoom() && !this._olbLeaving) {
      h.step = h.nest ? 'aperture' : 'nest';
      h.watched = false; h.frozen = false;
      if (h.nest && h.step === 'aperture') this._olbApertureShow();
      this._olbResetCamp();
      this._olbPlaceBeside();
      this._olbBark(OLB_BARKS.lost);
    }
  },

  /** A death sends you out of the cave to wherever the game puts you; the
   *  hunt rewinds to the seam and she is beside you again. */
  _olbOnRespawn() {
    const h = this._olbHunt();
    if (!h) return;
    h.frozen = false;
    this._olbScene = null;
    this._olbHuntSanity(h);
    if (this._olbBody) this._olbPlaceBeside();
  },

  _olbStepNest(h) {
    if (!this._olbNestGroups) this._olbBuildNest();
    const groups = this._olbNestGroups || [];
    const n = this._olbGroupsCleared(groups);
    h.cleared = n;
    if (groups.length && n >= groups.length) {
      h.step = 'aperture';
      this._olbApertureShow();
      this._olbBark(OLB_BARKS.nestDown);
      this._floatText(this.world.x, this.world.y - 52, 'Something is standing where the nest was', '#ce93d8');
      this.time.delayedCall(1200, () => this._olbApertureTalk());
    }
  },

  // -------------------------------------------------------------------------
  // THE APERTURE: a seam in the air where the nest was
  // -------------------------------------------------------------------------
  _olbApertureShow() {
    const h = this._olbHunt();
    if (!h || !h.nest || this._olbAperture) return;
    this._olbAperture = { x: h.nest.x, y: h.nest.y, g: this.add.graphics(), t: 0 };
    this._olbAperture.g.setDepth(isoDepth(h.nest.x, h.nest.y) + 5);
    // ROUND 359 (4) -- "Use the new portal animation for the astral-space portal entrance": the fx3 portal, looped,
    // stands in the seam; the drawing below keeps only the glow on the ground around it.
    const pr = this._olbPortalSprite ? this._olbPortalSprite(h.nest.x, h.nest.y, 'blue', 1.3) : null;
    if (pr) this._olbAperture.portal = pr;
  },

  _olbApertureHide() {
    if (this._olbAperture) {
      this._olbAperture.g.destroy();
      if (this._olbAperture.portal && this._olbAperture.portal.spr) this._olbAperture.portal.spr.destroy();
      this._olbAperture = null;
    }
  },

  _olbApertureDraw(dt) {
    const a = this._olbAperture;
    if (!a) return;
    if (a.portal) {
      // ROUND 359 -- the sheet carries the seam; only its light on the ground is drawn
      a.t += dt;
      const g = a.g, p = isoProject(a.x, a.y), pulse = 0.5 + 0.5 * Math.sin(a.t * 2.2);
      g.clear();
      g.fillStyle(0x64b5f6, 0.10 + 0.08 * pulse); g.fillEllipse(p.x, p.y + 4, 150, 40);
      g.fillStyle(0x0d47a1, 0.25); g.fillEllipse(p.x, p.y + 2, 60, 16);
      return;
    }
    a.t += dt;
    if (a.skip) { a.skip = false; return; }
    a.skip = true;                                   // every other frame is plenty
    const g = a.g, p = isoProject(a.x, a.y);
    g.clear();
    const pulse = 0.5 + 0.5 * Math.sin(a.t * 2.2);
    g.fillStyle(0x0a0614, 0.7);
    g.fillEllipse(p.x, p.y - 38, 60, 100);
    g.fillStyle(0x9575cd, 0.10 + 0.08 * pulse);
    g.fillEllipse(p.x, p.y - 38, 120, 150);
    g.fillStyle(0xb39ddb, 0.08 + 0.06 * pulse);
    g.fillEllipse(p.x, p.y + 4, 150, 40);
    for (let i = 0; i < 4; i++) {
      const k = i / 3, w = 60 - k * 34 + pulse * 3, hgt = 100 - k * 60 + pulse * 5;
      g.lineStyle(3, i % 2 ? 0x7e57c2 : 0xe1bee7, 0.95 - k * 0.4);
      g.strokeEllipse(p.x, p.y - 38, w, hgt);
    }
    g.fillStyle(0xf3e5f5, 0.35 + 0.3 * pulse);
    g.fillEllipse(p.x, p.y - 38, 12, 30);
    g.fillStyle(0x4a148c, 0.35);
    g.fillEllipse(p.x, p.y + 2, 52, 14);
  },

  _olbApertureTalk() {
    const h = this._olbHunt();
    if (!h || h.said.aperture) return;
    h.said.aperture = true;
    this._olbSay(OLB_APERTURE_PAGES, null, 'Right');
  },

  /** Is the player at the aperture, outdoors, with it standing? */
  _nearOlbAperture() {
    const h = this._olbHunt();
    const a = this._olbAperture;
    if (!h || !a || this._insideRoom || h.step === 'nest') return null;
    return Math.hypot(a.x - this.world.x, a.y - this.world.y) < TILE * 1.9 ? a : null;
  },

  _olbNearExit() {
    const h = this._olbHunt();
    if (!h || !this._olbInRoom()) return false;
    if (h.step === 'watch' || h.step === 'fight' || h.step === 'god') return false;
    const e = olbAstralMap().marks.exit;
    const at = OLB_ASTRAL_ROOM.at(e.x, e.y);
    return Math.hypot(at.x - this.world.x, at.y - this.world.y) < TILE * 2.4;
  },

  // -------------------------------------------------------------------------
  // THROUGH, AND BACK
  // -------------------------------------------------------------------------
  _olbEnterAstral() {
    const h = this._olbHunt();
    const room = OLB_ASTRAL_ROOM;
    if (!h) return;
    if (!this._olbStamped) {
      room._realmStamped = false;
      this._stampRealm(room);
      this._olbStamped = true;
    }
    this._olbBuildAstral();
    this._olbReturn = { x: this.world.x, y: this.world.y, room: this._insideRoom || null };
    const m = olbAstralMap();
    const at = room.at(m.marks.entry.x, m.marks.entry.y);
    this._insideRoom = room;
    this.world.x = at.x; this.world.y = at.y;
    const pt = isoProject(this.world.x, this.world.y);
    if (this.playerSprite) {
      this.playerSprite.setPosition(pt.x, pt.y);
      this.playerSprite.setDepth(isoDepth(this.world.x, this.world.y));
    }
    this._restoreRoomView(room);
    h.step = 'astral';
    this._olbPlaceBeside();
    this._showLocationBanner(room.name, 'a cut in the world');
    if (!h.said.enter) {
      h.said.enter = true;
      this.time.delayedCall(700, () => this._olbSay(OLB_APERTURE_ENTER, null, 'Right'));
    }
  },

  _olbLeaveAstral() {
    const back = this._olbReturn;
    if (!back) return;
    this._olbLeaving = true;
    this._realmReturn = back;
    this._olbReturn = null;
    this._leaveAstralRealm();
    this._realmReturn = null;
    this._olbLeaving = false;
    const h = this._olbHunt();
    if (h && h.step !== 'farside') h.step = 'aperture';
    this._olbPlaceBeside();
  },

  // -------------------------------------------------------------------------
  // THE CAVE: stacks, packs, and the hall's people
  // -------------------------------------------------------------------------
  _olbBuildAstral() {
    if (this._olbBuilt) return;
    this._olbBuilt = true;
    const room = OLB_ASTRAL_ROOM;
    const m = olbAstralMap();
    // the supply stacks along the east end of the hall
    if (this.textures.exists(INTERIOR_PROP_ART.key)) {
      for (const c of m.marks.crates) {
        const def = INTERIOR_PROPS[c.key];
        if (!def) continue;
        const w = room.at(c.x, c.y), q = isoProject(w.x, w.y);
        const s = this.add.image(q.x, q.y, INTERIOR_PROP_ART.key, def.idx);
        s.setOrigin(0.5, 1);
        s.setDepth(isoDepth(w.x, w.y));
        this.interiorSprites.push(this._tagRoom(s, room));
        this.interiorSolids.push({ room: room.id, x: w.x, y: w.y, radius: (def.tiles * TILE) / 2 });
      }
    }
    // the creatures: two caverns
    this.spawnGroups = this.spawnGroups || [];
    const keys = denMonsterKeys(OLB_ASTRAL_MOBS.families, OLB_ASTRAL_MOBS.tier, MONSTER_TYPES, monsterKeysAtTier);
    this._olbZone = { zone1: [], zone2: [], zone3: [] };
    for (const zone of ['zone1', 'zone2', 'zone3']) {
      const rng = seededRng(`olbAstral|${zone}`);
      for (const z of m.marks[zone]) {
        const w = room.at(z.x, z.y);
        const g = {
          region: 'nek', realm: room.id, key: keys[Math.floor(rng() * keys.length)],
          x: w.x, y: w.y, homeX: w.x, homeY: w.y, count: z.n, tier: OLB_ASTRAL_MOBS.tier,
          label: room.name, roams: false, awake: false, cooldown: 0, members: [],
          spread: TILE * 2.6, olbHunt: zone,
        };
        this.spawnGroups.push(g);
        this._olbZone[zone].push(g);
      }
    }
    this._olbBuildCamp();
    // ROUND 359 -- the rocks and the strange grass (3.1), and the way out drawn as the portal it is (4)
    if (this._olbDecorate) this._olbDecorate();
    if (this._olbPortalSprite) { const e = room.at(m.marks.exit.x, m.marks.exit.y); this._olbPortalSprite(e.x, e.y, 'blue', 1.2, room); }
  },

  _olbBuildCamp() {
    const room = OLB_ASTRAL_ROOM;
    const m = olbAstralMap();
    this._realmCamps = this._realmCamps || [];
    this._realmCamps = this._realmCamps.filter(c => c.realm !== room.id);
    const cult = CULT_BY_SLUG[OLB_CULT.slug];
    const camp = {
      realm: room.id, cult: OLB_CULT.slug, name: OLB_CULT.name, cry: OLB_CULT.cry,
      blurb: cult ? cult.blurb : '', reveal: null, spoken: false, revealed: false,
      scripted: true, engaged: false, people: [], staff: [],
      x: 0, y: 0, members: [], leader: null, tier: 0, leaderTier: 1,
    };
    this._realmCamps.push(camp);
    const tiers = [0, 0, 0, 0];
    const make = (at, name, tier, isLeader, idx) => {
      const w = room.at(at.x, at.y);
      const hp = [34, 70, 140, 260, 460][tier];
      const dmg = [4, 7, 12, 20, 32][tier];
      const c = {
        cult: OLB_CULT.slug, realm: room.id, name,
        x: w.x, y: w.y, homeX: w.x, homeY: w.y,
        artKey: cultistArtKey(OLB_CULT.slug, idx % 2),
        hp: isLeader ? Math.round(hp * 2.4) : hp, maxHp: isLeader ? Math.round(hp * 2.4) : hp,
        damage: isLeader ? Math.round(dmg * 1.5) : dmg,
        tier, leader: !!isLeader, speed: 52 + tier * 6,
        alive: true, hostile: false, swingT: 0, sprite: null, facing: 'east',
      };
      const p = isoProject(c.x, c.y);
      const key = this.textures.exists(c.artKey) ? c.artKey : null;
      c.sprite = key ? this.add.sprite(p.x, p.y, key, dirRow('west'))
                     : this.add.ellipse(p.x, p.y, 26, 40, 0x6a1b9a);
      const art = NPC_ART[key];
      if (key && art && c.sprite.setOrigin) {
        c.sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
        c.sprite.setScale(art.scale * (isLeader ? 1.18 : 1));
      }
      c.sprite.setDepth(isoDepth(c.x, c.y));
      this.interiorSprites.push(this._tagRoom(c.sprite, room));
      camp.people.push(c);
      return c;
    };
    camp.leader = room.at(m.marks.hierophant.x, m.marks.hierophant.y);
    make(m.marks.hierophant, OLB_CULT.hierophant, 1, true, 0);
    m.marks.cult.forEach((c, i) => make(c, OLB_CULT.members[i] || 'Ash-sworn', tiers[i] || 0, false, i + 1));
    // ROUND 359 (3.2) -- the three packs on the way down, in the same camp so every blow and every body works the same
    if (this._olbBuildPacks) this._olbBuildPacks(camp, make);
    // the Division pair: not fighters. They stand at the frame, facing Destruction.
    for (const [who, mark] of [['senior', m.marks.senior], ['junior', m.marks.junior]]) {
      const spec = OLB_STAFF[who], art = CHAR_ART[spec.char];
      const w = room.at(mark.x, mark.y);
      const idle = art && art.anims && art.anims.idle;
      const tex = `char_${spec.char}_idle`;
      if (!art || !this.textures.exists(tex)) continue;
      const p = isoProject(w.x, w.y);
      const sprite = this.add.sprite(p.x, p.y, tex, dirRow('east') * (idle.framesPerDir || 1));
      sprite.setOrigin(art.footX / art.cell, ((idle.foot != null ? idle.foot : art.footY)) / art.cell);
      sprite.setDepth(isoDepth(w.x, w.y));
      this.interiorSprites.push(this._tagRoom(sprite, room));
      camp.staff.push({ x: w.x, y: w.y, sprite, name: spec.name, who });
    }
    // the frame itself is a drawing
    const ap = room.at(m.marks.aperture.x, m.marks.aperture.y);
    const g = this.add.graphics();
    g.setDepth(isoDepth(ap.x, ap.y) + 5);
    this.interiorSprites.push(this._tagRoom(g, room));
    camp.frame = { x: ap.x, y: ap.y, g, t: 0 };
    // ROUND 359 (4) -- the Division's door is the same portal sheet, in Destruction's red, inside the iron
    if (this._olbPortalSprite) {
      const pr = this._olbPortalSprite(ap.x, ap.y, 'bloodred', 1.15, room);
      if (pr) { camp.frame.portal = pr; pr.spr.setDepth(isoDepth(ap.x, ap.y) + 6); }
    }
    // ROUND 359 (3.3) -- and the god stands beside it, in plain view, all through the meeting
    if (this._olbPlaceGod) this._olbPlaceGod(camp);
    this._olbDrawFrame(camp, 0);
  },

  _olbDrawFrame(camp, dt) {
    const f = camp && camp.frame;
    if (!f) return;
    f.t += dt;
    const g = f.g, p = isoProject(f.x, f.y);
    g.clear();
    const pulse = 0.5 + 0.5 * Math.sin(f.t * 1.6);
    if (f.portal) {
      // ROUND 359 -- the sheet is the door; only the iron and its red light on the floor are drawn
      g.fillStyle(0xff3d00, 0.10 + 0.08 * pulse); g.fillEllipse(p.x, p.y + 4, 150, 40);
      g.lineStyle(7, 0x212121, 1); g.strokeEllipse(p.x, p.y - 60, 104, 150);
      return;
    }
    g.fillStyle(0x12060a, 0.8);
    g.fillEllipse(p.x, p.y - 56, 70, 132);
    for (let i = 0; i < 5; i++) {
      const k = i / 4;
      g.lineStyle(3, i % 2 ? 0xb71c1c : 0xff6e40, 0.9 - k * 0.5);
      g.strokeEllipse(p.x, p.y - 56, 70 - k * 44 + pulse * 3, 132 - k * 84 + pulse * 6);
    }
    g.fillStyle(0xff3d00, 0.18 + 0.2 * pulse);
    g.fillEllipse(p.x, p.y - 56, 24, 62);
    // the iron
    g.lineStyle(7, 0x212121, 1);
    g.strokeEllipse(p.x, p.y - 56, 76, 140);
  },

  _olbResetCamp() {
    const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
    if (!camp) return;
    for (const c of camp.people || []) if (c.sprite && c.sprite.destroy) c.sprite.destroy();
    for (const s of camp.staff || []) if (s.sprite && s.sprite.destroy) s.sprite.destroy();
    if (camp.frame && camp.frame.g) camp.frame.g.destroy();
    if (camp.frame && camp.frame.portal && camp.frame.portal.spr) camp.frame.portal.spr.destroy();
    if (camp.god && camp.god.sprite && camp.god.sprite.destroy) camp.god.sprite.destroy();
    this._olbBuildCamp();
  },

  // -------------------------------------------------------------------------
  // IN THE CAVE
  // -------------------------------------------------------------------------
  _olbStepAstral(h) {
    if (!this._olbInRoom() || !this._olbZone) return;
    if (!h.z1 && this._olbGroupsCleared(this._olbZone.zone1) >= this._olbZone.zone1.length) {
      h.z1 = true; this._olbBark(OLB_BARKS.zone1);
    }
    if (!h.z2 && this._olbGroupsCleared(this._olbZone.zone2) >= this._olbZone.zone2.length) {
      h.z2 = true; this._olbBark(OLB_BARKS.zone1);
    }
    // ROUND 359 -- a third cavern, three packs of the Covenant, and talk between them
    if (!h.z3 && this._olbZone.zone3 && this._olbGroupsCleared(this._olbZone.zone3) >= this._olbZone.zone3.length) {
      h.z3 = true; this._olbBark(OLB_BARKS.zone1);
    }
    if (this._olbStepPacks) this._olbStepPacks(h);
    if (h.z1 && this._olbTalk) this._olbTalk(h, 'astral1');
    const allClear = h.z2 && (h.z3 || !this._olbZone.zone3 || !this._olbZone.zone3.length)
      && (!this._olbPacksDone || this._olbPacksDone(h));
    if (!h.watched && allClear) {
      const o = olbAstralMap().marks.overlook;
      const at = OLB_ASTRAL_ROOM.at(o.x, o.y);
      if (Math.hypot(at.x - this.world.x, at.y - this.world.y) < TILE * 3.5 && !this._dialogueOpen
          && !this._olbMonsterNear(TILE * 11)) this._olbWatch(h);
    }
  },

  _olbMonsterNear(r) {
    for (const m of this.monsters || []) {
      if (m.alive && Math.hypot(m.wx - this.world.x, m.wy - this.world.y) < r) return true;
    }
    return false;
  },

  // -------------------------------------------------------------------------
  // THE MEETING (4.1.7) AND BEING SENSED (4.1.8)
  // -------------------------------------------------------------------------
  _olbWatch(h) {
    h.step = 'watch'; h.watched = true; h.frozen = true;
    const room = OLB_ASTRAL_ROOM, m = olbAstralMap();
    // behind the stacks
    const hp = room.at(m.marks.hidePlayer.x, m.marks.hidePlayer.y);
    const ho = room.at(m.marks.hideOlb.x, m.marks.hideOlb.y);
    this.world.x = hp.x; this.world.y = hp.y;
    const b = this._olbBody;
    if (b) { b.x = ho.x; b.y = ho.y; b.facing = 'west'; b.moving = false; this._olbDraw(b, 0); }
    this.player.facing = 'west';
    const pt = isoProject(this.world.x, this.world.y);
    if (this.playerSprite) this.playerSprite.setPosition(pt.x, pt.y);
    this.cameras.main.centerOn(pt.x, pt.y);
    this._updateGroundViewport(true);
    this._updateForestViewport(true);
    this._updateRockViewport(true);
    if (this._updateStaticViewport) this._updateStaticViewport(true);
    // ROUND 359 (3.3) -- the stacks, the circle and the god in one view
    if (this._olbFrameHall) this._olbFrameHall(true);
    this._showLocationBanner('The Hall', 'behind the stacks');
    this._olbPlayScene(OLB_WATCH_PAGES, () => this._olbSensed(h));
  },

  /** A scene of pages: speaker and text, one press each, then `onEnd`. */
  _olbPlayScene(pages, onEnd, narrator, endLabel) {
    this._olbScene = { pages, onEnd, narrator: narrator || 'The hall', endLabel: endLabel || 'Move' };
    this._olbScenePage(0);
  },

  _olbScenePage(i) {
    const sc = this._olbScene;
    if (!sc) return;
    sc.i = i;
    const pg = sc.pages[i];
    const last = i >= sc.pages.length - 1;
    this._openDialogue(pg.who || sc.narrator, this._olbFill(pg.text), null,
      [{ act: last ? 'olbh|end' : `olbh|p|${i + 1}`, label: last ? sc.endLabel : 'Go on' }]);
  },

  _olbSensed(h) {
    h.step = 'fight'; h.frozen = false; h.fightT = 0;
    const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
    if (!camp) return;
    camp.engaged = true;
    for (const c of camp.people) { if (!c.pack) c.hostile = true; }
    // the Division go back through their frame
    for (const s of camp.staff) {
      if (s.sprite && s.sprite.destroy) s.sprite.destroy();
    }
    camp.staff = [];
    if (this._olbFrameHall) this._olbFrameHall(false);   // ROUND 359 -- the camera is yours again for the fight
    this.cameras.main.shake(320, 0.006);
    this._floatText(this.world.x, this.world.y - 60, 'You have been sensed!', '#ef5350');
    this._olbBark(OLB_FIGHT_LINES.held);
  },

  _olbStepFight(h) {
    const camp = (this._realmCamps || []).find(c => c.realm === OLB_ROOM_ID);
    if (!camp) return;
    h.fightT = (h.fightT || 0) + 0.25;
    if (!h.staffBark && h.fightT > 1) { h.staffBark = true; this._floatText(this.world.x, this.world.y - 80, OLB_FIGHT_LINES.staff, '#b0bec5'); }
    // ROUND 316 (4.1.9) -- the fight does not end: the god comes
    if (this._olbMouthDown() >= OLB_GOD_TRIGGER || camp.people.filter(c => !c.pack).every(c => !c.alive)) this._olbGodBegin(h);
  },

  // -------------------------------------------------------------------------
  // THE TRACKER
  // -------------------------------------------------------------------------
  _olbHuntObjective() {
    const h = this._olbHunt();
    if (!h) return null;
    const title = "Olb's hunt";
    switch (h.step) {
      case 'nest': {
        const n = (this._olbNestGroups || []).length;
        const done = h.cleared || 0;
        let dir = '';
        if (h.nest) {
          const dx = h.nest.x - this.world.x, dy = h.nest.y - this.world.y;
          dir = ` (${Math.round(Math.hypot(dx, dy) / TILE)} tiles ${Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north')})`;
        }
        return { title, line: `Clear the nest east of the walls with Olb: ${done}/${n || OLB_NEST.packs.length} packs${dir}`, ready: false };
      }
      case 'aperture': return { title, line: 'Look into the aperture with Olb (E)', ready: true };
      case 'astral':
        return { title, line: (h.z2 && h.z3 && (!this._olbPacksDone || this._olbPacksDone(h))) ? 'Go deeper, quietly' : (h.z1 ? 'Keep going down the Seam. Stay with Olb' : 'Explore the astral space with Olb; clear what is in the way'), ready: false };
      case 'watch': return { title, line: 'Stay down', ready: false };
      case 'fight': return { title, line: 'Fight!', ready: false };
      case 'god': return { title, line: 'Hold on', ready: false };
      case 'farside': return { title, line: 'RUN', ready: false };
      default: return null;
    }
  },
};
