// ===========================================================================
// ROUND 390 -- THE WILD BOND: CALLED, BONDED, FOUGHT BESIDE, AND LOST.
//
// The user: "(1.1) summons that you have to find in the wild that align with the summon criteria ... (2) Bonded
// companions can't be subsumed into the character ... (3) Bonded companions generally get stronger and gain
// themselves additional abilities as you rank up ... (4) This is balanced in that a bonded companion is generally
// stronger but can die and a new bonded companion will need to be located and bonded using the essence ability."
//
// And how a bond is made: "When no companion is bonded and in the wilds the ability works to attract a monster local
// to the region that fits the requirements. When it appears using the ability again will either cause the monster to
// attack, or bond it. It's about 66% chance to attack and 33% chance to bond."
//
// A wild bond is a `summonBonded` with `bondKind: 'wild'` (awakening.js `stampBondKind`; its list of creatures is
// bondThemes.js). Its states:
//
//   CALLING   no creature bonded. The ability is usable (hotbar / its key, like an active): in the wilds it calls one
//             of its creatures that lives in this region at or below the player's rank; the creature walks up and
//             waits, non-hostile. Used again while it is near: one time in three it bonds, otherwise it turns and
//             attacks (a normal fight) and the wilds are quiet for WILD_BOND_RECALL_CD seconds.
//   BONDED    `player.wildBonds[key]` holds the creature (saved). It is pushed as a familiar only while bonded
//             (WorldScene `_recomputeDerivedStats`, case 'summonBonded'), drawn in its own monster art and shade,
//             strikes beside you, grows with the ability's rank (health and the Bronze/Silver/Gold rungs on its
//             card), takes blows from what you are fighting, and can die. It is never subsumed.
//   DEAD      the record is cleared, the ability is back to CALLING, and the player is told.
//
// Old saves: "Keep it until it dies" -- a save from before this round has its existing summonBonded familiars made
// wild bonds, each with the familiar it already had recorded as the bonded creature (`_wildBondSync`).
//
// Hooks in WorldScene (each one line): `_wildBondSync` (kit rebuild), `_wildBondUse` (cast), `_wildBondCallTick`
// (monster loop), `_wildBondTick` (passive effects), `_wildBondStrike` (familiar strike), `_wildBondFamiliar`
// (recompute), `_wildBondSprite` (familiar sprite), `_wildBondOnBar` / `_wildBondHotbar` (hotbar).
// ===========================================================================

import { MONSTER_TYPES, MONSTER_ART, FAMILY_DISPLAY_NAME, monsterThreatTier } from '../data/monsters.js';
import { REGIONS, regionAt } from '../data/regions.js';
import {
  bondThemeFor, bondCandidates, regionsWithBond, WILD_BOND_CHANCE, WILD_BOND_RECALL_CD, WILD_BOND_CALL_DIST,
  WILD_BOND_NEAR, WILD_BOND_HP_BY_RANK, entryMonsterKeys,
} from '../data/bondThemes.js';
import { stampBondKind } from '../data/awakening.js';
import { facingFromMove } from '../data/iso.js';

/** The save marker: a player without it was saved before wild bonds existed. */
export const WILD_BOND_SAVE_V = 390;
/** Same scale WorldScene draws a creature familiar at (FAMILIAR_CREATURE_SCALE). */
const WILD_BOND_SPRITE_SCALE = 0.55;
/** A called creature that has not been bonded wanders off after this long, or once you are this far away. */
const CALL_TIMEOUT = 90;
const CALL_LEASH = 1100;
/** How close an enemy must be to the player (beyond its own radius) to trade blows with the bonded creature. */
const BOND_MELEE = 46;
/** The share of nearby enemies' swings that land on the bonded creature. */
const BOND_HIT_SHARE = 0.35;
/** Out of a fight, the share of its health it recovers each second. */
const BOND_REGEN = 0.02;
const RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
const rankAtLeast = (r, want) => RANKS.indexOf(r) >= RANKS.indexOf(want);

export const WildBondMixin = {
  _isWildBond(a) { return !!a && a.template === 'summonBonded' && a.bondKind === 'wild' && !a.canonKey; },

  _wildBondEntry(key) {
    const e = this.player && this.player.knownAbilities && this.player.knownAbilities[key];
    return e && e.ability && this._isWildBond(e.ability) ? e : null;
  },

  /** The creature bonded to this ability, or null. A record left by a different ability in the same socket is not it. */
  _wildBondOf(key) {
    const e = this._wildBondEntry(key);
    const b = e && this.player.wildBonds && this.player.wildBonds[key];
    return b && b.name === e.ability.name ? b : null;
  },

  _wbRand() { return (this._wbRng || Math.random)(); },

  _wbSay(text, color = '#c5e1a5') {
    if (this._showLocationBanner) this._showLocationBanner(text);
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 52, text, color);
    this._wildBondLog = (this._wildBondLog || []).concat([text]).slice(-20);
  },

  // --- the kit rebuild ---------------------------------------------------------------------
  /** After every kit rebuild: migrate an old save once, honour the migration's pins, drop records whose ability left. */
  _wildBondSync(result = null) {
    const p = this.player;
    if (!p || !p.knownAbilities) return;
    p.wildBonds = p.wildBonds || {};
    const known = p.knownAbilities;
    const confDef = (result && result.confluence) || p.confluence || null;
    // "Keep it until it dies." A save from before this round: every permanent summon it already had is a wild bond,
    // and the familiar it showed is the creature bonded to it.
    if (p.wildBondV !== WILD_BOND_SAVE_V) {
      p.wildBondPins = p.wildBondPins || {};
      for (const [key, e] of Object.entries(known)) {
        const a = e && e.ability;
        if (!a || a.template !== 'summonBonded' || a.canonKey || a.vehicleId) continue;
        p.wildBondPins[key] = a.name;
        if (!p.wildBonds[key]) {
          const rec = this._wildBondFromFamiliar(a);
          if (rec) p.wildBonds[key] = rec;
        }
      }
      p.wildBondV = WILD_BOND_SAVE_V;
    }
    for (const [key, name] of Object.entries(p.wildBondPins || {})) {
      const e = known[key];
      if (!e || !e.ability || e.ability.name !== name) { delete p.wildBondPins[key]; continue; }
      if (e.ability.bondKind === 'wild') continue;
      known[key] = { ...e, ability: stampBondKind(e.ability, { essenceId: e.essenceId || e.ability.essenceId || null,
        stoneId: e.stoneId || null, confDef, forceKind: 'wild' }) };
    }
    for (const key of Object.keys(p.wildBonds)) {
      const e = known[key];
      if (!e || !e.ability || !this._isWildBond(e.ability) || e.ability.name !== p.wildBonds[key].name) delete p.wildBonds[key];
    }
    if (this._wildCall && !this._wildBondEntry(this._wildCall.key)) this._wildBondEndCall(true);
  },

  /** An old save's familiar, recorded as the bonded creature it already was. */
  _wildBondFromFamiliar(a) {
    let family = a.familiarFamily && MONSTER_ART[a.familiarFamily] ? a.familiarFamily : null;
    if (!family) {
      const theme = a.bondTheme || bondThemeFor({ essenceId: a.essenceId || null });
      for (const e of theme) { const ks = entryMonsterKeys(e); if (ks.length) { family = MONSTER_TYPES[ks[0]].family; break; } }
    }
    if (!family) return null;
    const art = MONSTER_ART[family];
    const shade = this._summonShadeFor ? this._summonShadeFor(a, art) : 0;
    const shadeName = (art.shades || [])[shade];
    const keys = Object.keys(MONSTER_TYPES).filter(k => MONSTER_TYPES[k].family === family && !MONSTER_TYPES[k].young);
    const typeKey = keys.find(k => MONSTER_TYPES[k].shade === shadeName) || keys[0] || null;
    const t = typeKey ? MONSTER_TYPES[typeKey] : null;
    const baseHp = t ? t.hp * (monsterThreatTier(typeKey) >= 1 ? 3 : 1) : 40;
    return { name: a.name, typeKey, family, shade, label: (t && t.label) || FAMILY_DISPLAY_NAME[family] || family,
      baseHp, hp: baseHp, migrated: true };
  },

  // --- using it ----------------------------------------------------------------------------
  /** The cast hook. True when the key is a wild bond (handled here, whatever happened); false for anything else. */
  _wildBondUse(key) {
    const e = this._wildBondEntry(key);
    if (!e) return false;
    const a = e.ability;
    const bond = this._wildBondOf(key);
    if (bond) { this._wbSay(`Your ${bond.label} is already bonded to you.`, '#b0bec5'); return true; }
    const call = this._wildCall;
    if (call && call.key === key && call.m && call.m.alive) {
      const m = call.m;
      if (Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > WILD_BOND_NEAR + 70) {
        this._wbSay(`The ${this._wbLabel(m)} is still coming. Use it again when it is near.`, '#b0bec5');
        return true;
      }
      if (this._wbRand() < WILD_BOND_CHANCE) this._wildBondTake(key, m);
      else this._wildBondTurn(m, 'refused');
      return true;
    }
    if (call && call.key !== key && call.m && call.m.alive) {
      this._wbSay('Something is already answering a call.', '#b0bec5');
      return true;
    }
    const cd = (this._wildBondCd && this._wildBondCd[key]) || 0;
    if (cd > 0) { this._wbSay(`The wilds are quiet. Call again in ${Math.ceil(cd)}s.`, '#b0bec5'); return true; }
    this._wildBondCall(key, a);
    return true;
  },

  /** Out in the wild: not indoors, not in a town, not in your soul, and in a region. */
  _wildBondInWilds() {
    if (this._insideRoom || this._soulSpace) return false;
    const x = this.world.x, y = this.world.y;
    if (this._inAnySettlement && this._inAnySettlement(x, y)) return false;
    return !!(this.currentRegion || regionAt(x, y));
  },

  _wildBondTheme(a) {
    if (Array.isArray(a.bondTheme) && a.bondTheme.length) return a.bondTheme;
    return bondThemeFor({ essenceId: a.essenceId || null });
  },

  _wildBondCall(key, a) {
    if (!this._wildBondInWilds()) {
      this._wbSay('A wild creature answers only in the wilds, outside towns and buildings.', '#ffcc80');
      return null;
    }
    const region = this.currentRegion || regionAt(this.world.x, this.world.y);
    const rank = (this.player && this.player.rank) || 'iron';
    const theme = this._wildBondTheme(a);
    const keys = bondCandidates(theme, region, rank);
    if (!keys.length) {
      const elsewhere = regionsWithBond(theme, rank, REGIONS).filter(r => r.id !== region.id);
      this._wbSay(elsewhere.length
        ? `No creature ${a.name} can bond lives in ${region.name} at your rank. One does in ${elsewhere[0].name}.`
        : `No creature ${a.name} can bond lives anywhere at your rank yet.`, '#ffcc80');
      return null;
    }
    const typeKey = keys[Math.floor(this._wbRand() * keys.length)];
    let x = this.world.x, y = this.world.y;
    const a0 = this._wbRand() * Math.PI * 2;
    for (let i = 0; i < 8; i++) {
      const ang = a0 + i * Math.PI / 4;
      const tx = this.world.x + Math.cos(ang) * WILD_BOND_CALL_DIST, ty = this.world.y + Math.sin(ang) * WILD_BOND_CALL_DIST;
      if (!this._isWaterAt || !this._isWaterAt(tx, ty)) { x = tx; y = ty; break; }
    }
    const m = this._spawnMonster ? this._spawnMonster(typeKey, x, y, null, null) : null;
    if (!m) { this._wbSay('Nothing answers the call.', '#b0bec5'); return null; }
    m._wildCall = { key };
    if (this._r393WildBondBody) this._r393WildBondBody(m, a);   // ROUND 393 -- a stand-in answers as its new body (art only)
    m.lurk = false; m.disguised = false; m.ambushReady = false;
    m.state = 'wander';
    this._wildCall = { key, m, t: 0 };
    this._wbSay(`A ${this._wbLabel(m)} answers the call. Use ${a.name} again when it is near.`);
    return m;
  },

  _wbLabel(m) {
    const t = m && (m.type || MONSTER_TYPES[m.key]);
    return (t && (t.label || FAMILY_DISPLAY_NAME[t.family])) || 'creature';
  },

  /** One in three: it is yours. */
  _wildBondTake(key, m) {
    const e = this._wildBondEntry(key);
    if (!e || !m) return null;
    const t = m.type || MONSTER_TYPES[m.key];
    const art = MONSTER_ART[t.family] || { shades: [] };
    const shade = Math.max(0, (art.shades || []).indexOf(t.shade));
    const rank = this._abilityRankFor ? this._abilityRankFor(key) : 'iron';
    const mult = WILD_BOND_HP_BY_RANK[rank] || 1;
    const rec = { name: e.ability.name, typeKey: m.key, family: t.family, shade, label: this._wbLabel(m),
      baseHp: m.maxHp, hp: Math.round(m.maxHp * mult) };
    this.player.wildBonds = this.player.wildBonds || {};
    this.player.wildBonds[key] = rec;
    // Leaves the world as a monster: no kill, no loot, no xp.
    m.alive = false; m.despawned = true; m._wildCall = null;
    if (m.sprite && m.sprite.destroy) m.sprite.destroy();
    this.monsters = (this.monsters || []).filter(x => x !== m);
    this._wildCall = null;
    this._wbSay(`The ${rec.label} bonds to you.`, '#a5d6a7');
    this._wildBondRefresh();
    return rec;
  },

  /** Two in three: it attacks -- an ordinary fight -- and the wilds are quiet for a while. Also when struck. */
  _wildBondTurn(m, why = 'refused') {
    if (!m) return;
    const key = m._wildCall && m._wildCall.key;
    m._wildCall = null;
    m.state = 'chase';
    if (this._wildCall && this._wildCall.m === m) this._wildCall = null;
    if (key) { this._wildBondCd = this._wildBondCd || {}; this._wildBondCd[key] = WILD_BOND_RECALL_CD; }
    this._wbSay(why === 'struck' ? `Struck, the ${this._wbLabel(m)} turns on you!` : `The ${this._wbLabel(m)} turns on you and attacks!`, '#ef9a9a');
  },

  /** A call that ends without a bond or a fight (it wandered off, or its ability left the kit). */
  _wildBondEndCall(quiet = false) {
    const c = this._wildCall;
    this._wildCall = null;
    if (!c || !c.m) return;
    const m = c.m;
    m._wildCall = null;
    if (m.alive) {
      m.alive = false; m.despawned = true;
      if (m.sprite && m.sprite.destroy) m.sprite.destroy();
      this.monsters = (this.monsters || []).filter(x => x !== m);
    }
    if (!quiet) this._wbSay(`The ${this._wbLabel(m)} loses interest and slips away.`, '#b0bec5');
  },

  /** The monster loop's hook: a called creature walks up and waits, and nothing else happens to it. True = handled. */
  _wildBondCallTick(m, dt) {
    if (!m || !m._wildCall) return false;
    const c = this._wildCall;
    if (!c || c.m !== m) { m._wildCall = null; return false; }
    if (m.hp < m.maxHp) { this._wildBondTurn(m, 'struck'); return false; }
    const dx = this.world.x - m.wx, dy = this.world.y - m.wy;
    const d = Math.hypot(dx, dy);
    if (d > WILD_BOND_NEAR) {
      const step = Math.min(d - WILD_BOND_NEAR, ((m.type && m.type.speed) || 80) * 0.6 * dt);
      m.wx += (dx / d) * step; m.wy += (dy / d) * step;
      m.moving = true;
      m.facing = facingFromMove(dx, dy) || m.facing;
    } else {
      m.moving = false;
      m.facing = facingFromMove(dx, dy) || m.facing;
    }
    if (this._updateMonsterSprite) this._updateMonsterSprite(m);
    return true;
  },

  // --- the bonded creature in the field -------------------------------------------------------
  /** The familiar `_recomputeDerivedStats` pushes for a wild bond: only while bonded, as the creature it is. */
  _wildBondFamiliar(a, key) {
    const bond = this._wildBondOf(key);
    if (!bond) return null;
    return { ...a, key: a.key || key, wildBond: key, familiarFamily: bond.family, familiarShadeIdx: bond.shade,
      mountFamily: bond.family, familiarWeaponId: undefined };
  },

  /** `_familiarSprite`'s hook: the bonded creature in its own monster art and shade. */
  _wildBondSprite(a) {
    const fam = a && a.familiarFamily;
    const art = fam && MONSTER_ART[fam];
    if (!art || !this.add) return null;
    if (this._ensureFamilyArt) this._ensureFamilyArt(fam);
    const shade = Number.isInteger(a.familiarShadeIdx) ? a.familiarShadeIdx : 0;
    const texKey = this._monsterTexture ? this._monsterTexture(fam, 'idle') : `mon_${fam}_idle`;
    const here = this.textures && this.textures.exists(texKey);
    // Its sheet may still be on its way (a lazy family): the familiar loop swaps to the run sheet the moment it lands.
    const sp = this.add.sprite(0, 0, here ? texKey : (this.textures && this.textures.exists('dragonIdle') ? 'dragonIdle' : '__DEFAULT'), here ? shade * 8 + 2 : 0);
    sp.setScale((art.displayScale || 1) * WILD_BOND_SPRITE_SCALE);
    sp.setOrigin(0.5, art.originY || 0.85);
    return { sprite: sp, spin: false, fowl: false, family: fam, art, shade };
  },

  /** The bonded creature's health, at the ability's rank. */
  _wildBondMaxHp(key) {
    const bond = this._wildBondOf(key);
    if (!bond) return 0;
    const rank = this._abilityRankFor ? this._abilityRankFor(key) : 'iron';
    return Math.max(1, Math.round((bond.baseHp || 40) * (WILD_BOND_HP_BY_RANK[rank] || 1)));
  },

  /** The rung this ability's rank has reached, or null. */
  _wildBondRung(key, rung) {
    const e = this._wildBondEntry(key);
    const ladder = e && e.ability.wildBondRanks;
    if (!ladder || !ladder[rung]) return null;
    const rank = this._abilityRankFor ? this._abilityRankFor(key) : 'iron';
    return rankAtLeast(rank, rung) ? ladder[rung] : null;
  },

  /** The familiar strike's hook: what the rungs add to a blow that has just landed. */
  _wildBondStrike(f, m) {
    const key = f && f.a && f.a.wildBond;
    if (!key || !m) return;
    const dmg = f.a.familiarDmg || 0;
    for (const rung of ['bronze', 'silver', 'gold']) {
      const s = this._wildBondRung(key, rung);
      if (!s) continue;
      if (s.kind === 'afflict' && m.alive && this._applyDebuff && this._wbRand() < s.chance) {
        this._applyDebuff(m, s.debuff, { potency: s.potency || 1, fromPlayer: true });
      } else if (s.kind === 'ambush' && m.alive && !m._wbStruck) {
        this._damageMonster(m, Math.round(dmg * (s.mult - 1)));
      } else if (s.kind === 'cleave') {
        for (const o of (this.monsters || [])) {
          if (o === m || !o.alive || o._wildCall) continue;
          if (Math.hypot(o.wx - m.wx, o.wy - m.wy) <= s.radius + ((o.type && o.type.radius) || 0)) {
            this._damageMonster(o, Math.max(1, Math.round(dmg * s.frac)));
          }
        }
      }
    }
    m._wbStruck = true;
    if (!m.alive) {
      const mend = this._wildBondRung(key, 'silver');
      const bond = this._wildBondOf(key);
      if (mend && mend.kind === 'mend' && bond) bond.hp = Math.min(this._wildBondMaxHp(key), bond.hp + Math.round(this._wildBondMaxHp(key) * mend.pct));
    }
  },

  /** A blow on the bonded creature. Returns what it took. */
  _wildBondHurt(key, amount) {
    const bond = this._wildBondOf(key);
    if (!bond || !(amount > 0)) return 0;
    const hide = this._wildBondRung(key, 'silver');
    const took = Math.max(1, Math.round(amount * (hide && hide.kind === 'hide' ? 1 - hide.reduce : 1)));
    bond.hp = Math.max(0, (bond.hp == null ? this._wildBondMaxHp(key) : bond.hp) - took);
    if (this._floatText && this.world) this._floatText(this.world.x + 24, this.world.y - 30, `-${took}`, '#ef9a9a');
    if (bond.hp <= 0) this._wildBondDie(key);
    return took;
  },

  /** "...can die and a new bonded companion will need to be located and bonded using the essence ability." */
  _wildBondDie(key) {
    const bond = this.player.wildBonds && this.player.wildBonds[key];
    if (!bond) return;
    delete this.player.wildBonds[key];
    const e = this._wildBondEntry(key);
    this._wbSay(`Your bonded ${bond.label} has died. Use ${e ? e.ability.name : 'its ability'} in the wilds to call another.`, '#ef9a9a');
    this._wildBondRefresh();
  },

  _wildBondRefresh() {
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    if (this._rebuildFamiliars) this._rebuildFamiliars();
    if (this._wildBondHotbar) this._wildBondHotbar();
    this._hotbarDirty = true;
  },

  /** Every frame: the recall timers, a call that has gone stale, and the bonded creatures trading blows. */
  _wildBondTick(dt) {
    const p = this.player;
    if (!p) return;
    if (this._wildBondCd) for (const k of Object.keys(this._wildBondCd)) {
      this._wildBondCd[k] -= dt;
      if (this._wildBondCd[k] <= 0) delete this._wildBondCd[k];
    }
    const c = this._wildCall;
    if (c) {
      c.t += dt;
      const m = c.m;
      if (!m || !m.alive) this._wildCall = null;
      else if (c.t > CALL_TIMEOUT || Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > CALL_LEASH) this._wildBondEndCall(false);
    }
    const bonds = p.wildBonds || {};
    const keys = Object.keys(bonds).filter(k => this._wildBondOf(k));
    if (!keys.length) return;
    if (this._soulSpace || this._insideRoom) return;
    let fighting = false;
    for (const m of (this.monsters || [])) {
      if (!m.alive || m._wildCall || m.ally || m.tamed || m.friendly || m.summoned || m.person || m.dummy) continue;
      if (m.state !== 'chase') continue;
      const reach = ((m.type && m.type.radius) || 12) + BOND_MELEE;
      if (Math.hypot(m.wx - this.world.x, m.wy - this.world.y) > reach) continue;
      fighting = true;
      m._wbSwingT = (m._wbSwingT == null ? 1.2 : m._wbSwingT) - dt;
      if (m._wbSwingT > 0) continue;
      m._wbSwingT = 1.2;
      if (this._wbRand() >= BOND_HIT_SHARE) continue;
      const key = keys[Math.floor(this._wbRand() * keys.length)];
      const dmg = this._monsterDamage ? this._monsterDamage(m) : (m.dmg || 1);
      this._wildBondHurt(key, dmg);
      if (!this._wildBondOf(key)) { keys.splice(keys.indexOf(key), 1); if (!keys.length) return; }
    }
    if (!fighting) {
      for (const k of keys) {
        const b = bonds[k], max = this._wildBondMaxHp(k);
        if (b.hp == null || b.hp > max) b.hp = max;
        else if (b.hp < max) b.hp = Math.min(max, b.hp + max * BOND_REGEN * dt);
      }
    }
  },

  // --- the hotbar --------------------------------------------------------------------------
  /** A wild bond may sit on the hotbar like an active: it is used, not switched. */
  _wildBondOnBar(key) { return !!this._wildBondEntry(key); },

  /** Put each wild bond with nothing bonded on a free hotbar slot, so calling one is a key press away. */
  _wildBondHotbar() {
    const p = this.player;
    if (!p || !Array.isArray(p.hotbar)) return;
    const bound = new Set(p.hotbar.filter(Boolean));
    for (const h of ['left', 'right']) if (p.handBinds && p.handBinds[h]) bound.add(p.handBinds[h]);
    for (const key of Object.keys(p.knownAbilities || {})) {
      if (!this._wildBondEntry(key) || this._wildBondOf(key) || bound.has(key)) continue;
      const free = p.hotbar.indexOf(null);
      if (free < 0) break;
      p.hotbar[free] = key;
      bound.add(key);
    }
  },
};
