// ROUND 383 -- BOLT FORMS AT RUNTIME. The user: "Some bolts move fast others move slow, some bolts split halfway to an
// enemy others boomerang back to the character." The generator gives a bolt `a.boltForm` (src/data/boltForms.js); fast
// and slow are pure data (speed, flight time, damage, width) that the cast already reads, pierce and ricochet ride the
// impact code's existing `pr.pierce` / `pr.bounce`. This mixin does the rest:
//   _boltFormCast(a, from, homeTarget)  -- dresses the projectiles the cast just pushed (index `from` onward)
//   _boltFormTick(pr, dt, i)            -- called first in _updateProjectiles; returns true when it handled/removed pr
import { isoProject, isoDepth } from '../data/iso.js';
import { CRIT_COLOR, rollCrit } from '../data/combat.js';
import { BOLT_SPLIT, BOLT_SEEK_TURN } from '../data/boltForms.js';

const SEEK_RANGE = 420;          // WorldScene's PROJECTILE_HOME_RANGE
const LOB_HEIGHT = 46;           // screen px at the top of the arc
const BOOMERANG_MAX_RETURN = 4;  // seconds: a boomerang that cannot get home is retired

/** Screen rotation for a world heading (iso: screen.dx = wx - wy, screen.dy = (wx + wy) / 2). */
function screenAngle(ang) {
  return Math.atan2((Math.cos(ang) + Math.sin(ang)) / 2, Math.cos(ang) - Math.sin(ang));
}

export const BoltFormMixin = {
  _boltFormCast(a, from, homeTarget) {
    const form = a && a.boltForm;
    if (!form || !this.projectiles) return;
    for (let i = from; i < this.projectiles.length; i++) {
      const pr = this.projectiles[i];
      pr.form = form;
      if (form === 'slow' && pr.sprite && pr.sprite.setScale) pr.sprite.setScale((pr.sprite.scaleX || 1) * 1.4);   // it is wider: draw it so
      if (form === 'seek') {
        pr.homing = pr.homing || homeTarget || (this._nearestMonsterWithin ? this._nearestMonsterWithin(SEEK_RANGE) : null) || null;
        pr.homeTurn = (pr.homeTurn || 3.2) * BOLT_SEEK_TURN;
      } else if (form === 'split') {
        pr.splitAt = pr.life * 0.5;   // remaining flight time at which it splits: half its reach
      } else if (form === 'boomerang') {
        pr.boomerang = true;
        pr.pierce = 999;               // "striking everything it passes both ways"
        pr.homing = null;              // a straight line out along the aim, and straight back
      } else if (form === 'ricochet') {
        pr.bounce = a.bounce || 2;
        pr.bounceRange = a.bounceRange || 128;
      } else if (form === 'lob') {
        // Lands where the target stands (or at full reach along the aim), over everything in between.
        const ang = Math.atan2(pr.vy, pr.vx);
        const reach = pr.speed * pr.life;
        let dist = reach;
        if (homeTarget && homeTarget.alive !== false) {
          dist = Math.min(reach, Math.hypot(homeTarget.wx - pr.wx, homeTarget.wy - pr.wy));
        }
        dist = Math.max(24, dist);
        pr.homing = null;
        pr.lob = { t: 0, T: dist / pr.speed, burst: a.lobBurst || 48 };
        pr.life = pr.lob.T + 1;   // the tick retires it on landing
        pr.vx = Math.cos(ang) * pr.speed; pr.vy = Math.sin(ang) * pr.speed;
      }
    }
  },

  _boltFormTick(pr, dt, i) {
    if (!pr.form) return false;
    if (pr.lob) return this._boltLobTick(pr, dt, i);
    if (pr.splitAt != null && pr.life <= pr.splitAt) { this._boltSplit(pr, i); return true; }
    if (pr.boomerang) {
      if (!pr.returning && pr.life <= dt) {
        pr.returning = true;
        pr.hitIds = new Set();        // everything it struck on the way out can be struck again coming back
        pr.life = BOOMERANG_MAX_RETURN;
      }
      if (pr.returning) {
        const dx = this.world.x - pr.wx, dy = this.world.y - pr.wy, d = Math.hypot(dx, dy);
        if (d <= Math.max(16, pr.speed * dt)) { this._boltRetire(pr, i); return true; }
        pr.vx = (dx / d) * pr.speed; pr.vy = (dy / d) * pr.speed;
        if (pr.sprite && pr.sprite.setRotation && pr.flight && pr.flight.heading !== 'none') {
          pr.sprite.setRotation(screenAngle(Math.atan2(dy, dx)) - (pr.flight.baseAngle || 0));
        }
      }
    }
    return false;
  },

  _boltRetire(pr, i) {
    if (pr.sprite && pr.sprite.destroy) pr.sprite.destroy();
    this.projectiles.splice(i, 1);
  },

  /** Halfway along its flight: the bolt becomes BOLT_SPLIT.count bolts fanning out, each at BOLT_SPLIT.frac damage. */
  _boltSplit(pr, i) {
    const n = BOLT_SPLIT.count, base = Math.atan2(pr.vy, pr.vx);
    const p = isoProject(pr.wx, pr.wy);
    for (let k = 0; k < n; k++) {
      const ang = base + (k - (n - 1) / 2) * BOLT_SPLIT.fan;
      let sprite;
      if (pr.flight && this.textures && this.textures.exists(pr.flight.key)) {
        sprite = this.add.sprite(p.x, p.y, pr.flight.key, pr.flight.frame0 || 0);
        if (pr.flight.heading !== 'none') sprite.setRotation(screenAngle(ang) - (pr.flight.baseAngle || 0));
        if (pr.sprite && pr.sprite.scaleX) sprite.setScale(pr.sprite.scaleX * 0.8);
        if (pr.sprite && pr.sprite.isTinted) { sprite.setTint(pr.sprite.tintTopLeft); sprite.setBlendMode(pr.sprite.blendMode); }
      } else {
        sprite = this.add.circle(p.x, p.y, Math.max(3, Math.round((pr.radius || 6) * 0.75)), pr.color);
      }
      if (sprite.setDepth) sprite.setDepth(isoDepth(pr.wx, pr.wy) + 100000);
      this.projectiles.push({ ...pr, sprite, form: 'splitChild', splitAt: null, homing: null, hitIds: undefined,
        vx: Math.cos(ang) * pr.speed, vy: Math.sin(ang) * pr.speed,
        dmg: Math.max(1, Math.round(pr.dmg * BOLT_SPLIT.frac)) });
    }
    this._boltRetire(pr, i);
  },

  /** A lobbed bolt flies over everything, drawn on an arc, and bursts where it lands. */
  _boltLobTick(pr, dt, i) {
    const L = pr.lob;
    L.t += dt;
    pr.wx += pr.vx * dt; pr.wy += pr.vy * dt;
    if (L.t >= L.T) {
      let caught = 0;
      // monsters and the people in play (Society hunters, bandits), as the flight's own collision reaches both
      const folks = (this._personHostiles ? this._personHostiles() : null) || [];
      for (const m of [...(this.monsters || []), ...folks]) {
        if (!m.alive) continue;
        if (Math.hypot(m.wx - pr.wx, m.wy - pr.wy) > L.burst + ((m.type && m.type.radius) || 12)) continue;
        const forceCrit = pr.executeThreshold > 0 && m.maxHp > 0 && (m.hp / m.maxHp) <= pr.executeThreshold;
        let { dmg, isCrit } = rollCrit(Math.random, pr.critChance, pr.dmg, pr.critMult, forceCrit);
        if (pr.spell && this._consumeImpetus) dmg = this._consumeImpetus(m, dmg);
        const ctxWas = this._rungHitCtx;
        if (pr.rung) this._rungHitCtx = pr.rung;
        try { this._damageMonster(m, dmg, true, pr.physical === true, pr.element || null); }
        finally { this._rungHitCtx = ctxWas; }
        if (pr.debuff && this._applyAbilityDebuff) this._applyAbilityDebuff({ debuff: pr.debuff }, m);
        if (pr.dot && this._applyDot) this._applyDot(m, pr.dot);
        if (pr.leech > 0 && this._healPlayer) this._healPlayer(Math.max(1, Math.round(dmg * pr.leech)), { quiet: true });
        if (isCrit && this._floatText) this._floatText(m.wx, m.wy - 30, 'Crit!', CRIT_COLOR);
        caught++;
      }
      if (this._spawnRingFx) this._spawnRingFx(pr.wx, pr.wy, L.burst, `#${(pr.color || 0xffffff).toString(16).padStart(6, '0')}`);
      const fx = pr.fx || (pr.flight && pr.flight.impact);
      if (fx && this._playSpellFx && !/leech|drainbeam/.test(fx.family || '')) this._playSpellFx(fx, pr.wx, pr.wy, L.burst / 40);
      pr.lobCaught = caught;
      this._boltRetire(pr, i);
      return true;
    }
    const p = isoProject(pr.wx, pr.wy);
    const lift = Math.sin(Math.PI * Math.min(1, L.t / L.T)) * LOB_HEIGHT;
    if (pr.sprite) {
      pr.sprite.setPosition(p.x, p.y - lift);
      if (pr.sprite.setDepth) pr.sprite.setDepth(isoDepth(pr.wx, pr.wy) + 100000);
    }
    return true;
  },
};
