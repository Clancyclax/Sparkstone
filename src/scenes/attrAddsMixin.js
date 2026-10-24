// ============================================================================
// ROUND 382 -- THE ATTRIBUTE SOCKET'S ADDITIONS, PAID.
//
// The user: "attribute +1 as a confluence socket is weak alone but with some
// essence related additions is okay." attrAdditions.js stamps two additions
// on every attrBoost (`a.attrAdds`); this is where each one happens.
//
//   _attrAddsFold(a, mods)   the passive fold (WorldScene attrBoost case)
//   _attrAddsTick(dt)        buff/shield clocks, haste stacks, low-health cleanse
//   _attrAddsOnKill()        cleanse-on-kill
//   _attrAddsOnCast(a)       dodge after a movement ability
//   _attrAddsHeal(t, amt)    heals restore more; healing an ally stacks haste
//   _attrAddsSummon()        summons' share of your buffs and their damage
//   _attrAddsCritMult()      critical hits deal more
//   _attrAddsMoveSpeed()     the haste stacks, read by the movement line
//
// Stat additions (armour, block, cast speed...) go through mods.rankRiders and
// need nothing here. Nothing in this file may break a frame: every reader
// tolerates a missing `passiveMods.attrAdd`.
// ============================================================================
import { TAG } from '../data/debuffs.js';

const aaOf = (scene) => (scene.player && scene.player.passiveMods && scene.player.passiveMods.attrAdd) || null;

export const AttrAddsMixin = {
  _attrAddsFold(a, mods) {
    const adds = a && a.attrAdds;
    if (!adds || !adds.length) return;
    const aa = mods.attrAdd || (mods.attrAdd = { critHitPct: 0, buffDurPct: 0, shieldDurPct: 0, summonShare: 0, summonDmgPct: 0,
      healPct: 0, allyHealHaste: 0, allyHealHasteDur: 0, lowHpCleanse: null, killCleanse: 0, dashDodge: null });
    for (const r of adds) {
      const v = r.amount || 0;
      switch (r.id) {
        case 'critHit': aa.critHitPct += v; break;
        case 'twoHand':
          mods.oneHandTwoHanders = true;
          if (mods.freedWeapons) for (const w of (r.frees || [])) mods.freedWeapons.add(w);
          break;
        case 'buffShieldDur': aa.buffDurPct += v; aa.shieldDurPct += v; break;
        case 'selfBuffDouble': case 'buffDur': aa.buffDurPct += v; break;
        case 'shieldDur': aa.shieldDurPct += v; break;
        case 'summonShare': aa.summonShare += v; break;
        case 'summonDmg': aa.summonDmgPct += v; break;
        case 'healPct': aa.healPct += v; break;
        case 'allyHealHaste': aa.allyHealHaste = Math.max(aa.allyHealHaste, v); aa.allyHealHasteDur = Math.max(aa.allyHealHasteDur, r.dur || 3); break;
        case 'lowHpCleanse': aa.lowHpCleanse = { frac: v || 0.3, icd: r.icd || 600 }; break;
        case 'killCleanse': aa.killCleanse += Math.max(1, Math.round(v)); break;
        case 'dashDodge': aa.dashDodge = { amount: Math.max(v, (aa.dashDodge && aa.dashDodge.amount) || 0), dur: r.dur || 2 }; break;
        case 'specialAtk': mods.specialAtkPct = (mods.specialAtkPct || 0) + v; break;
        case 'lifeOnKill': mods.lifeOnKill = (mods.lifeOnKill || 0) + v; break;
        case 'thorns': mods.thornsPassive = (mods.thornsPassive || 0) + v; break;
        default:
          if (r.stat) mods.rankRiders[r.stat] = (mods.rankRiders[r.stat] || 0) + v;
      }
    }
  },

  /** Called once a frame, BEFORE the player's timed buffs and shield tick.
   *  "Lasts X% longer" is a slower clock: each timed buff is credited back
   *  dt*(1 - 1/(1+X)), so it loses dt/(1+X) a frame -- twice as long at +100%,
   *  whichever template wrote it and whatever its own duration was. */
  _attrAddsTick(dt) {
    const p = this.player;
    const aa = aaOf(this);
    if (!p || !aa || !(dt > 0)) return;
    p._aaClock = (p._aaClock || 0) + dt;
    if (aa.buffDurPct > 0) {
      const credit = dt * (1 - 1 / (1 + aa.buffDurPct));
      for (const [k, b] of Object.entries(p.buffs || {})) {
        if (k === 'combination' || !b || typeof b !== 'object' || !(b.t > 0)) continue;
        b.t += credit;
      }
      for (const b of Object.values(p.statBuffs || {})) if (b && b.t > 0) b.t += credit;
    }
    if (aa.shieldDurPct > 0 && p.shield && p.shield.kind !== 'pool' && p.shield.t > 0) {
      p.shield.t += dt * (1 - 1 / (1 + aa.shieldDurPct));
    }
    if (p._aaHaste && p._aaHaste.length) p._aaHaste = p._aaHaste.filter(t => t > p._aaClock);
    const lc = aa.lowHpCleanse;
    if (lc && p.maxHp > 0) {
      const low = p.hp > 0 && p.hp < lc.frac * p.maxHp;
      // "whenever you fall below 30%": the crossing, not every frame spent there.
      if (low && !p._aaWasLow && p._aaClock >= (p._aaCleanseReady || 0)
        && p.debuffs && Object.keys(p.debuffs).length) {
        const gone = this._cleanseConditions ? this._cleanseConditions(p, { count: 99 }) : [];
        if (gone && gone.length) {
          p._aaCleanseReady = p._aaClock + lc.icd;
          if (this._recomputeDerivedStats) this._recomputeDerivedStats();
          if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 52, 'Cleansed', '#e1f5fe');
        }
      }
      p._aaWasLow = low;
    }
  },

  _attrAddsOnKill() {
    const p = this.player, aa = aaOf(this);
    if (!p || !aa || !(aa.killCleanse > 0) || !p.debuffs || !this._cleanseConditions) return 0;
    let n = 0;
    for (let i = 0; i < aa.killCleanse; i++) {
      const g = this._cleanseConditions(p, { tag: TAG.affliction, count: 1 });
      const g2 = (g && g.length) ? g : this._cleanseConditions(p, { tag: TAG.dot, count: 1 });
      if (!(g2 && g2.length)) break;
      n += g2.length;
    }
    return n;
  },

  _attrAddsOnCast(a) {
    const aa = aaOf(this);
    if (!aa || !aa.dashDodge || !a) return;
    const isMove = a.isMovement || a.category === 'movement' || /dash|blink|teleport|leap|charge/i.test(String(a.template || ''));
    if (isMove && this._grantStatBuff) this._grantStatBuff('dodgeChance', aa.dashDodge.amount, aa.dashDodge.dur);
  },

  _attrAddsHeal(t, amount) {
    const aa = aaOf(this);
    if (!aa || !(amount > 0)) return amount;
    let out = amount;
    if (aa.healPct > 0) out = Math.round(amount * (1 + aa.healPct));
    if (aa.allyHealHaste > 0 && t && t.kind !== 'player') {
      const p = this.player;
      (p._aaHaste = p._aaHaste || []).push((p._aaClock || 0) + aa.allyHealHasteDur);
    }
    return out;
  },

  _attrAddsMoveSpeed() {
    const p = this.player, aa = aaOf(this);
    if (!p || !aa || !(aa.allyHealHaste > 0) || !p._aaHaste) return 0;
    return p._aaHaste.filter(t => t > (p._aaClock || 0)).length * aa.allyHealHaste;
  },

  /** { dmg, dr }: the multiplier on a summon's blow and the share of your
   *  armour buff it takes. "Any buffs placed onto you": the damage buff and
   *  the armour buff are the two a summon has a stat for. */
  _attrAddsSummon() {
    const p = this.player, aa = aaOf(this);
    if (!p || !aa) return { dmg: 1, dr: 0 };
    let dmg = 1 + (aa.summonDmgPct || 0), dr = 0;
    if (aa.summonShare > 0) {
      const pm = p.buffs && p.buffs.power ? (p.buffs.power.mult || 1) : 1;
      dmg *= 1 + aa.summonShare * Math.max(0, pm - 1);
      const arm = p.buffs && p.buffs.armor ? (p.buffs.armor.amount || 0) : 0;
      dr = aa.summonShare * arm;
    }
    return { dmg, dr };
  },

  _attrAddsCritMult() {
    const aa = aaOf(this);
    return 1 + ((aa && aa.critHitPct) || 0);
  },
};
