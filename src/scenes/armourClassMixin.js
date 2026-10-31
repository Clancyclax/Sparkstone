// ============================================================================
// ROUND 384 -- ARMOUR WEIGHT CLASSES AND A WEAPON'S TYPED DAMAGE, AT RUNTIME.
//
// The user: "Heavy armor is better against slashing and piercing, has
// additional armor but slows a player down by 35% and doubles stamina drain
// while sprinting. Medium armor is okay against slashing and piercing but slows
// a player down by 20%. Light armor provides minimal protection against
// slashing, piercing and blunt but doesn't slow the player down."
//
// The tables and the rules are gearDamageTypes.js. This mixin is the scene's
// side, read at four doors:
//   _armourClassVsPhysical(type)  the combat lane's player-hit mitigation, for
//                                 slashing / blunt / piercing blows
//   _armourClassMoveMult()        the movement stack in the player update
//   _armourClassSprintMult()      the sprint stamina drain beside it
//   _armourClassBuffs()           the stat recompute (heavy +30% / light -25%
//                                 on each piece's inherent armour)
// and the weapon's typed rider ("+3 Blood damage on hit", "25% of this
// weapon's damage is dealt as Necrotic damage") at the swing and the shot.
//
// Player only. Companions and NPCs have no `gear` and never call these.
// ============================================================================
import {
  wornArmourClass, armourClassVsPhysical, armourClassArmorBuff, ARMOUR_CLASS_FX, splitTypedBlow, RESIST_TYPE_LABEL,
} from '../data/gearDamageTypes.js';
import { DAMAGE_FX_COLORS } from '../data/damageFx.js';   // ROUND 385 -- the typed share's colour on a person

export const ArmourClassMixin = {
  /** The class the player is in ('heavy' | 'medium' | 'light' | null), memoised
   *  on the worn pieces so the per-frame movement read costs one string build. */
  _armourClassWorn() {
    const p = this.player;
    if (!p || !p.gear) return null;
    const sig = Object.keys(p.gear).map(k => { const it = p.gear[k]; return it ? `${k}:${it.uid || it.name}` : ''; }).join('|');
    if (this._acSig !== sig) { this._acSig = sig; this._acCls = wornArmourClass(p.gear).cls; }
    return this._acCls;
  },
  /** Damage multiplier for a physical subtype blow on the player. 1 for any
   *  other type, and 1 with no armour worn. */
  _armourClassVsPhysical(type) {
    return armourClassVsPhysical(this._armourClassWorn(), type);
  },
  /** Movement multiplier: heavy 0.65, medium 0.80, light / none 1. A mount
   *  carries the weight, so riding is not slowed. */
  _armourClassMoveMult() {
    if (this._mountActive && this._mountActive()) return 1;
    const fx = ARMOUR_CLASS_FX[this._armourClassWorn()];
    if (fx && this._armourBorne()) return 1;   // ROUND 388 -- an Armour passive carries the weight
    return fx ? fx.move : 1;
  },
  /** ROUND 388 -- "removes the downsides from wearing heavy armor": an Armour-essence passive (`heavyBearer`) that
   *  takes away the movement and sprint penalties of heavy and medium armour. Its protection is untouched. */
  _armourBorne() {
    const m = this.player && this.player.passiveMods;
    return !!(m && m.heavyBearer);
  },
  /** Sprint stamina drain multiplier: heavy 2, otherwise 1. */
  _armourClassSprintMult() {
    const fx = ARMOUR_CLASS_FX[this._armourClassWorn()];
    if (fx && this._armourBorne()) return 1;   // ROUND 388
    return fx ? fx.sprint : 1;
  },
  /** Each worn piece's class adjustment to its inherent armour, as buffs. */
  _armourClassBuffs() {
    const p = this.player, out = [];
    for (const k of Object.keys((p && p.gear) || {})) {
      const b = armourClassArmorBuff(p.gear[k]);
      if (b) out.push(b);
    }
    return out;
  },
  /** Split a weapon blow by the weapon's typed rider: { phys, typed, type }. */
  _gearTypedSplit(weapon, dmg) {
    return splitTypedBlow(dmg, weapon && weapon.gearTyped, this._unitK ? this._unitK() : 1);
  },
  /** ROUND 385 -- a swing's number over a person: white for the physical part and, while a typed rider is riding
   *  the swing (`_personTyped`), its share beside it in the type's colour ("+3 Blood"). */
  _personHitFloat(x, y, amount) {
    const t = this._personTyped;
    const total = Math.round(amount);
    if (!t || !(t.typed > 0) || !t.type) { this._floatText(x, y, String(total), '#ffffff'); return; }
    const typed = Math.min(total, Math.round(t.typed));
    const col = DAMAGE_FX_COLORS[t.type];
    if (total - typed > 0) this._floatText(x, y, String(total - typed), '#ffffff');
    this._floatText(x + 20, y - 12, `${typed} ${RESIST_TYPE_LABEL[t.type] || t.type}`,
      col != null ? `#${col.toString(16).padStart(6, '0')}` : '#ffd54f');
  },
  /** Land the typed half of a split blow, typed -- resistance answers it, not armour. */
  _gearTypedStrike(m, split) {
    if (!split || !(split.typed > 0) || !split.type || !m || !m.alive) return;
    this._damageMonster(m, split.typed, true, false, split.type);
  },
};
