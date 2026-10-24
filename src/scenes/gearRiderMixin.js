// ===========================================================================
// ROUND 392 -- THE RIDERS, IN PLAY (src/data/gearRiders.js is the data, the card and the validator's check).
//
// "a conjured armour that burns attackers / lays a condition on whoever strikes you / grants a resistance; obsidian
//  weapons that ignore armour or lay a condition; unarmed strikes that lay a condition, stagger, or splash; weapon
//  affinity that adds a typed rider or a condition to that weapon's hits; gear that grants a triggered effect."
//
// The kit fold (`_recomputePassives`) hands every rider of a live unarmedFocus / weaponAffinity / worn summonArmor /
// worn summonGear to `_riderFold`, which lists them on `passiveMods.gearRiders` (and a conjured armour's typed thorns
// on `passiveMods.typedThorns`). The event doors then ask the list:
//
//   _riderOnStrike(m, ctx)     a weapon swing or a weapon shot landed on m        (hit, crit, nth)
//   _riderArmorIgnore(wid, c)  the share of armour that swing ignores, asked before the blow is dealt
//   _riderBlock(m, dmg, opts)  a blow is on its way in: may turn part of it aside  (block)
//   _riderOnStruck(m, t, o)    a blow landed on you: the attacker answers for it   (struck, typed thorns)
//   _riderOnDodge(m)           a blow went wide                                    (dodge)
//   _riderOnEvent(kind, ctx)   _onTriggerEvent's events (a kill)                   (kill)
//   _riderUpdate(dt)           the clock: interval riders, the trail, "after a dash"
//
// Scope is the template's: bare-handed (both hands empty), that weapon in hand, or the conjured piece worn (folded
// only while it is). The effects go through the doors everything else uses -- `_applyDebuff`, `_damageMonster`,
// `_applySunder`, `_healPlayer`, `player.shield`, `abilityCdByKey`, `_grantStatBuff` -- so immunities, resistances,
// hides and the rank gap apply to a rider exactly as to the blow it rides.
// ===========================================================================
import { RIDER_TEMPLATES, RIDER_FURY_SECONDS, RIDER_SUNDER_SECONDS, RIDER_BUFF_SECONDS, RIDER_TRAIL_LIFE,
  RIDER_FIGHT_GAP } from '../data/gearRiders.js';
import { DAMAGE_FX_COLORS, damageFxFor } from '../data/damageFx.js';
// ROUND 394 -- the rider moments now draw the r392 rider sheets (fxOneoff394Mixin._fx394RiderArt), each in the rider's
// element: its own `element`, else the damage type of the passive it rides on (`dtype`, folded below). Thorns on the
// attacker, a vial cloud where a timed trinket bursts, a parry spark when a blow is turned aside, a decal where the
// trail is laid. Art only: every effect still goes through the doors listed above. The old shapes stay as fallbacks.

const PHYS = new Set(['physical', 'slashing', 'blunt', 'piercing']);
const STRIKE_ON = new Set(['hit', 'crit', 'nth']);
const hexOf = (el) => '#' + ((DAMAGE_FX_COLORS[el] ?? 0xffffff) >>> 0).toString(16).padStart(6, '0');

export const GearRiderMixin = {
  /** The kit fold: one rider list per recompute. `a` is the live (scaled) passive, `key` its kit key. */
  _riderFold(key, a, mods) {
    if (!a || !RIDER_TEMPLATES.includes(a.template)) return;
    const worn = a.template === 'summonArmor' || a.template === 'summonGear';
    if (worn && !(this._conjuredItemEquipped && this._conjuredItemEquipped(key))) return;
    if (Array.isArray(a.effectRiders)) {
      const list = mods.gearRiders || (mods.gearRiders = []);
      a.effectRiders.forEach((r, i) => {
        if (r && r.on) list.push({ id: `${key}#${i}`, key, r, template: a.template, weaponId: a.weaponId || null,
          name: a.name, color: a.color || hexOf(r.element),
          dtype: r.element || a.thornsElement || damageFxFor(a) });   // ROUND 394 -- the element its art plays in
      });
    }
    // "molten armour that burns attackers": a conjured armour's thorns in its own type.
    if (a.template === 'summonArmor' && a.thornsElement && a.thornsFrac > 0) {
      (mods.typedThorns || (mods.typedThorns = [])).push({ frac: a.thornsFrac, element: a.thornsElement, name: a.name });
    }
  },

  /** A damage type's fx colour as '#rrggbb' (damageFx.js), for floats. */
  _riderTypeHex(el) { return hexOf(el); },

  _riders() { return (this.player && this.player.passiveMods && this.player.passiveMods.gearRiders) || []; },
  _riderSt(id) {
    const all = this._riderState || (this._riderState = {});
    return all[id] || (all[id] = { n: 0, cdUntil: 0, t: 0, kills: 0 });
  },
  _riderNow() { return (this.time && this.time.now) || Date.now(); },

  /** Is this rider's scope live right now? `wid` is the weapon of the blow, when there is one. */
  _riderLive(e, wid = undefined) {
    if (e.template === 'unarmedFocus') return !!(this._isUnarmed && this._isUnarmed());
    if (e.template === 'weaponAffinity') {
      if (!e.weaponId) return false;
      const ids = [];
      if (wid !== undefined) ids.push(wid);
      else {
        const h = (this.player && this.player.hands) || {};
        for (const k of ['left', 'right']) if (h[k]) { const d = this._weaponDef ? this._weaponDef(h[k]) : null; ids.push(h[k], d && d.id); }
      }
      const as = (this.player.passiveMods && this.player.passiveMods.weaponCountsAs) || {};
      return ids.some(id => id && (id === e.weaponId || (as[id] || []).includes(e.weaponId)));
    }
    return true;   // worn: folded only while worn
  },

  /** The gates every trigger shares: when, chance, cooldown. */
  _riderGate(e, m = null) {
    const r = e.r, p = this.player;
    const st = this._riderSt(e.id);
    const now = this._riderNow();
    if (st.cdUntil > now) return false;
    const below = r.below || 0.5;
    switch (r.when) {
      case 'still': if (!((p._stillFor || 0) >= 0.3)) return false; break;
      case 'moving': if ((p._stillFor || 0) > 0.05) return false; break;
      case 'afterMove': if (!(this._riderMovedAt && now - this._riderMovedAt < 1500 && !st.usedMove)) return false; break;
      case 'lowSelf': if (!(p.maxHp > 0 && p.hp / p.maxHp < below)) return false; break;
      case 'lowTarget': if (!(m && m.maxHp > 0 && m.hp / m.maxHp < below)) return false; break;
      case 'carrying': if (!(m && m.debuffs && r.carryingKey && m.debuffs[r.carryingKey])) return false; break;
      case 'behind': {
        if (!m) return false;
        const off0 = Math.abs(Math.atan2(m.wy - this.world.y, m.wx - this.world.x) - (p.aimAngle || 0)) % (Math.PI * 2);
        if ((off0 > Math.PI ? Math.PI * 2 - off0 : off0) < Math.PI * 2 / 3) return false;
        break;
      }
      case 'firstInFight': if (this._riderStruckAt && now - this._riderStruckAt < RIDER_FIGHT_GAP * 1000) return false; break;
      case 'first': {
        if (!m) return false;
        const seen = m._riderSeen || (m._riderSeen = new Set());
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        break;
      }
      default: break;
    }
    if (r.chance < 1 && Math.random() >= r.chance) return false;
    if (r.when === 'afterMove') st.usedMove = true;
    if (r.cd > 0) st.cdUntil = now + r.cd * 1000;
    return true;
  },

  /** A typed share, dealt: slashing / blunt / piercing meet the hide as a weapon's would, the rest the type's channel. */
  _riderDeal(t, amount, element) {
    if (!t || !t.alive || !(amount > 0)) return;
    const el = element || 'physical';
    if (PHYS.has(el)) {
      const was = this._hitPhysType;
      this._hitPhysType = el === 'physical' ? null : el;
      try { this._damageMonster(t, amount, true, true, null); } finally { this._hitPhysType = was; }
    } else this._damageMonster(t, amount, true, false, el);
  },

  _riderMonstersNear(x, y, radius) {
    return (this.monsters || []).filter(m => m && m.alive && !m.person && Math.hypot(m.wx - x, m.wy - y) <= radius + ((m.type && m.type.radius) || 0));
  },

  /** Do what the rider says. `m` is the enemy the moment is about (struck, attacker, victim), `base` the damage it
   *  is a share of, `side` strike / defend / other. */
  _riderApply(e, m, base, side) {
    const r = e.r, p = this.player;
    let targets = [];
    if (r.at === 'around') targets = this._riderMonstersNear(this.world.x, this.world.y, r.radius || 80);
    else if (r.at === 'nearest' || (side === 'other' && !(m && m.alive))) {
      const n = this._nearestMonsterWithin ? this._nearestMonsterWithin(r.radius || 260, m || null) : null;
      if (n) targets = [n];
    } else if (m && m.alive) {
      targets = r.radius > 0 ? this._riderMonstersNear(m.wx, m.wy, r.radius) : [m];
      if (r.radius > 0 && !targets.includes(m)) targets.unshift(m);
    }
    const hits = targets.length > 0;
    // ROUND 394 -- a timed trinket's burst is the vial cloud (r392 "vial-cloud ... stand-in hitflash ring")
    const vial394 = r.on === 'interval' && this._fx394RiderArt ? this._fx394RiderArt('interval', e, targets[0] || m) : false;
    if (!vial394 && r.radius > 0 && (r.at === 'around' || (!r.at && m)) && this._ringSheet) {
      try { const c = r.at === 'around' ? this.world : { x: m.wx, y: m.wy }; this._ringSheet(c.x, c.y, r.radius, e.color); } catch (x) { /* art is optional */ }
    }
    if (r.condKey) {
      for (const t of targets) {
        if (!t.alive) continue;
        this._applyDebuff(t, r.condKey, { duration: r.condDuration, stacks: 1, potency: 1, fromPlayer: true, source: p });
      }
    }
    if (r.dmgFrac > 0 && !(r.extraHits > 0)) {
      const amt = Math.max(1, Math.round((base || 1) * r.dmgFrac));
      for (const t of targets) this._riderDeal(t, amt, r.element);
    }
    if (r.extraHits > 0 && m && m.alive) {
      const amt = Math.max(1, Math.round((base || 1) * (r.dmgFrac || 0.5)));
      for (let i = 0; i < r.extraHits && m.alive; i++) this._riderDeal(m, amt, r.element || 'physical');
    }
    if (r.sunder > 0) for (const t of targets) if (t.alive) this._applySunder(t, { amount: r.sunder, duration: RIDER_SUNDER_SECONDS });
    if (r.knockback > 0) {
      for (const t of targets) {
        if (!t.alive) continue;
        const a = Math.atan2(t.wy - this.world.y, t.wx - this.world.x);
        const push = r.knockback * (1 - (this._momentumResist ? this._momentumResist(t) : 0));
        t.wx += Math.cos(a) * push; t.wy += Math.sin(a) * push;
      }
    }
    // What a rider does for YOU happens whether or not it found a target (a kill's stamina, a struck blow's ward) --
    // except a share of damage dealt, which needs a blow.
    if (r.healFrac > 0 && base > 0) this._healPlayer(Math.max(1, Math.round(base * r.healFrac)), { quiet: true });
    for (const res of ['stamina', 'mana']) {
      if (!(r[res] > 0)) continue;
      const maxKey = res === 'mana' ? 'maxMana' : 'maxStamina';
      p[res] = Math.min(p[maxKey] || p[res] + r[res], (p[res] || 0) + r[res]);
    }
    if (r.ward > 0) {
      const amount = Math.max(1, Math.round((p.maxHp || 1) * r.ward));
      const cur = p.shield;
      p.shield = { kind: 'timed', source: 'own', costPerPoint: 1, strikes: 0,
        amount: Math.max(amount, cur && cur.kind === 'timed' ? (cur.amount || 0) : 0),
        t: Math.max(6, cur && cur.kind === 'timed' ? (cur.t || 0) : 0) };
      this._floatText(this.world.x, this.world.y - 54, `${e.name} (+${amount} shield)`, '#80deea');
    }
    if (r.cdRefund > 0 && p.abilityCdByKey) {
      for (const k of Object.keys(p.abilityCdByKey)) p.abilityCdByKey[k] = Math.max(0, p.abilityCdByKey[k] - r.cdRefund);
    }
    if (r.fury > 0) {
      const cur = p.buffs.triggeredPhys;
      p.buffs.triggeredPhys = { mult: Math.max(1 + r.fury, cur ? cur.mult : 1), t: Math.max(RIDER_FURY_SECONDS, cur ? cur.t : 0) };
    }
    if (r.buff && r.buff.amount > 0 && this._grantStatBuff) this._grantStatBuff(r.buff.stat, r.buff.amount, r.buff.duration || RIDER_BUFF_SECONDS);
    return hits;
  },

  /** A weapon swing (or a weapon shot) landed on m. ctx: { weaponId, dmg, isCrit, shot } */
  _riderOnStrike(m, ctx = {}) {
    const list = this._riders();
    if (!list.length || !m) return;
    for (const e of list) {
      const r = e.r;
      if (!STRIKE_ON.has(r.on) || !this._riderLive(e, ctx.weaponId)) continue;
      if (r.on === 'crit' && !ctx.isCrit) continue;
      if (r.on === 'nth') {
        const st = this._riderSt(e.id);
        st.n += 1;
        if (st.n % Math.max(2, Math.round(r.every || 3)) !== 0) continue;
      }
      // armour ignored is spent on the blow itself (`_riderArmorIgnore`); a rider that does only that is done.
      if (!this._riderGate(e, m)) continue;
      if (m.alive || r.at === 'around' || r.at === 'nearest') this._riderApply(e, m, ctx.dmg || 0, 'strike');
    }
  },

  /** The share of armour the swing about to land ignores (the best hit / crit rider that is live and rolls). */
  _riderArmorIgnore(wid, isCrit = false) {
    let best = 0;
    for (const e of this._riders()) {
      const r = e.r;
      if (!(r.armorIgnore > 0) || !(r.on === 'hit' || (r.on === 'crit' && isCrit))) continue;
      if (!this._riderLive(e, wid)) continue;
      if (r.chance < 1 && Math.random() >= r.chance) continue;
      best = Math.max(best, r.armorIgnore);
    }
    return best;
  },

  _riderFromOk(r, opts) {
    const shot = !!(opts && opts.shot);
    return r.from === 'any' || (r.from === 'ranged' ? shot : !shot);
  },

  /** A blow is coming in: a block rider may turn part of it aside. Returns what is left of it. */
  _riderBlock(m, incoming, opts = {}) {
    if (!(incoming > 0)) return incoming;
    for (const e of this._riders()) {
      const r = e.r;
      if (r.on !== 'block' || !this._riderLive(e) || !this._riderFromOk(r, opts)) continue;
      // The block's own chance is the share of blows it turns; the gate rolls it.
      if (!this._riderGate(e, m)) continue;
      const left = Math.max(1, Math.ceil(incoming * (1 - Math.min(0.9, r.block || 0.5))));
      this._floatText(this.world.x, this.world.y - 38, 'Turned aside!', '#b0bec5');
      if (this._fx394RiderArt) this._fx394RiderArt('block', e, m);   // ROUND 394 -- the parry spark ("block riders show float text only")
      if (r.condKey || r.dmgFrac > 0 || r.knockback > 0 || r.stamina > 0 || r.healFrac > 0 || r.ward > 0) this._riderApply(e, m, incoming, 'defend');
      return left;
    }
    return incoming;
  },

  /** A blow landed on you (`taken` of it got through). */
  _riderOnStruck(m, taken, opts = {}) {
    if (!m || !(taken > 0)) return;
    const pm = (this.player && this.player.passiveMods) || {};
    for (const t of (pm.typedThorns || [])) {
      if (opts.shot || !m.alive) continue;
      const back = Math.max(1, Math.round(taken * t.frac * (1 + (this._taggedAmp ? this._taggedAmp(m, 'retribution') : 0))));
      this._riderDeal(m, back, t.element);
      this._floatText(m.wx, m.wy - 26, `Thorns ${back}`, hexOf(t.element));
      if (this._fx394RiderArt) this._fx394RiderArt('struck', null, m, t.element);   // ROUND 394 -- the thorns burst, in the armour's type
    }
    for (const e of this._riders()) {
      const r = e.r;
      if (r.on !== 'struck' || !this._riderLive(e) || !this._riderFromOk(r, opts)) continue;
      if (!this._riderGate(e, m)) continue;
      if (this._fx394RiderArt && m.alive) this._fx394RiderArt('struck', e, m);   // ROUND 394 -- the retaliation burst on the attacker
      this._riderApply(e, m, taken, 'defend');
    }
    this._riderStruckAt = this._riderNow();
  },

  /** A blow went wide. */
  _riderOnDodge(m) {
    if (!m) return;
    const base = Math.max(1, Math.round((m.dmg || (m.type && m.type.dmg) || 4)));
    for (const e of this._riders()) {
      if (e.r.on !== 'dodge' || !this._riderLive(e)) continue;
      if (!this._riderGate(e, m)) continue;
      this._riderApply(e, m, base, 'defend');
    }
  },

  /** `_onTriggerEvent`'s events: a kill. */
  _riderOnEvent(kind, ctx = {}) {
    if (kind !== 'kill') return;
    const list = this._riders();
    if (!list.length) return;
    const victim = ctx.victim || null;
    for (const e of list) {
      const r = e.r;
      if (r.on !== 'kill' || !this._riderLive(e)) continue;
      if (r.every > 1) {
        const st = this._riderSt(e.id);
        st.kills += 1;
        if (st.kills % Math.round(r.every) !== 0) continue;
      }
      if (!this._riderGate(e, victim)) continue;
      this._riderApply(e, victim, this._riderWeaponBase(), 'other');
    }
  },

  /** What a rider with no blow of its own is a share of: the weapon in hand's swing (a fist's when there is none). */
  _riderWeaponBase() {
    const h = (this.player && this.player.hands) || {};
    const held = h.right || h.left;
    const w = (held && this._weaponDef && this._weaponDef(held)) || null;
    const b = w ? (this._legendaryBaseDmg ? this._legendaryBaseDmg(w) : w.base) : 4;
    return Math.max(1, Math.round((b || 4) * ((this.player.passiveMods && this.player.passiveMods.dmgMult) || 1)));
  },

  /** The clock: "after a dash", interval riders and the trail. */
  _riderUpdate(dt) {
    const p = this.player;
    if (!p || !this.world) return;
    const now = this._riderNow();
    // A dash, a leap or a teleport: the body covered ground no walk covers in a frame.
    if (this._riderLastPos && dt > 0 && dt < 0.1 && !this._mounted) {
      const d = Math.hypot(this.world.x - this._riderLastPos.x, this.world.y - this._riderLastPos.y);
      if (d / dt > 360) {
        this._riderMovedAt = now;
        for (const e of this._riders()) if (e.r.when === 'afterMove') this._riderSt(e.id).usedMove = false;
      }
    }
    this._riderLastPos = { x: this.world.x, y: this.world.y };
    const list = this._riders();
    if (!list.length) return;
    let trailing = false;
    for (const e of list) {
      const r = e.r;
      if (r.on === 'interval') {
        if (!this._riderLive(e)) continue;
        const st = this._riderSt(e.id);
        st.t = Math.min(r.every, st.t + dt);
        if (st.t < r.every) continue;
        const near = r.at === 'nearest'
          ? (this._nearestMonsterWithin ? this._nearestMonsterWithin(r.radius || 80) : null)
          : this._riderMonstersNear(this.world.x, this.world.y, r.radius || 80)[0];
        if (!near) continue;   // ready, and waits for something to come close
        if (!this._riderGate(e, near)) { if (r.chance < 1) st.t = 0; continue; }
        st.t = 0;
        this._riderApply(e, near, this._riderWeaponBase(), 'other');
        this._floatText(this.world.x, this.world.y - 54, e.name, e.color || '#ffcc80');
      } else if (r.on === 'trail' && this._riderLive(e)) trailing = true;
    }
    if (!trailing) { this._riderTrail = null; return; }
    // THE TRAIL: a point every quarter second while you move; each lies RIDER_TRAIL_LIFE seconds.
    const tr = this._riderTrail || (this._riderTrail = { pts: [], dropT: 0, checkT: 0 });
    tr.pts = tr.pts.filter(pt => now - pt.at < RIDER_TRAIL_LIFE * 1000);
    tr.dropT -= dt;
    if ((p._stillFor || 0) <= 0.05 && tr.dropT <= 0) {
      tr.dropT = 0.25;
      tr.pts.push({ x: this.world.x, y: this.world.y, at: now });
      // ROUND 394 -- the trail decal in the trail rider's element (r392 "trail-decal ... stand-in fx2 puff")
      const trailEl394 = list.find(x => x.r.on === 'trail' && this._riderLive(x));
      const laid394 = this._fx394RiderArt && trailEl394 ? this._fx394RiderArt('trail', trailEl394, null) : false;
      if (!laid394 && this._sheetBurst) { try { this._sheetBurst('puff', 'brown', this.world.x, this.world.y, { scale: 0.7, alpha: 0.6, fade: 0.5 }); } catch (x) { /* art is optional */ } }
    }
    tr.checkT -= dt;
    if (tr.checkT > 0 || !tr.pts.length) return;
    tr.checkT = 0.3;
    for (const e of list) {
      const r = e.r;
      if (r.on !== 'trail' || !this._riderLive(e)) continue;
      const per = (r.cd > 0 ? r.cd : 2) * 1000;
      for (const m of (this.monsters || [])) {
        if (!m || !m.alive || m.person) continue;
        const hitAt = (m._riderTrailAt || (m._riderTrailAt = {}))[e.id] || 0;
        if (now - hitAt < per) continue;
        // Behind you: a point the player has already left.
        const onIt = tr.pts.some(pt => now - pt.at > 150 && Math.hypot(m.wx - pt.x, m.wy - pt.y) <= 26 + ((m.type && m.type.radius) || 0));
        if (!onIt) continue;
        if (r.chance < 1 && Math.random() >= r.chance) { m._riderTrailAt[e.id] = now; continue; }
        m._riderTrailAt[e.id] = now;
        this._riderApply({ ...e, r: { ...r, at: 'target', radius: 0 } }, m, this._riderWeaponBase(), 'other');
      }
    }
  },
};
