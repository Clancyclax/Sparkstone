// ============================================================================
// ROUND 323 -- [BLADE OF THE BLOOD QUEEN] AND [SOUL-IMPRINTING TRIUNE], IN PLAY.
//
// The text, the numbers and the pure rules are canonItems323.js; the bracelet
// as an item is authoredItems.js. This is where they run. Each reader is named
// after the line it answers.
//
//   The bracelet   _bloodQueenStrike (a conjured blade lands)  -> life force is
//                  stored on the bracelet itself -> minor thresholds bestow
//                  [Blood of the Immortal] (spent on damage) -> the major
//                  threshold lets the wearer drink it all for [Power of the
//                  Blood Queen] (K, or the button beside the hotbar).
//   The Triune     Use opens a choice of three soul-bound growth items; the
//                  set it records gives each piece its bonus while all three
//                  are on your person.
//
// Nothing here is persisted by a field of its own: `p.bq`, `p.triune` and the
// marks on the items are plain data on the player, which a save already keeps.
// ============================================================================
import { RANK_ORDER } from '../data/ranks.js';
import { ESSENCES } from '../data/abilities.js';
import { legendaryKeyOf } from '../data/legendaryItems.js';
import { LEGENDARY_TEXT } from '../data/legendaryText.js';
import { isBoundTo, bindOnEquip, PLAYER_ID } from '../data/soulbound.js';
import {
  BQ, BQ_KEY, TRIUNE_ID, isVampiric, isBladedBase, abilityRankOk, bqThresholds,
  drainAmount, storeForce, powerSeconds, queenAttr, uninjuredSeconds, wearerHasBlood,
  triuneClass, strongestFamily, triuneBonus, rollTriuneDrop,
} from '../data/canonItems323.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const BQ_COLOR = '#c62828';
const TRIUNE_COLOR = '#b388ff';

export const RelicItemMixin = {
  _relicRankIdx() { return Math.max(0, RANK_ORDER.indexOf((this.player && this.player.rank) || 'normal')); },

  // ==========================================================================
  // [BLADE OF THE BLOOD QUEEN]
  // ==========================================================================
  _bq() {
    const p = this.player;
    if (!p.bq) p.bq = { instances: 0, hot: null, power: null, lastHp: null };
    return p.bq;
  },
  /** The bracelet, if it is on. */
  _bqItem() {
    const gear = this.player && this.player.gear;
    if (!gear) return null;
    for (const it of Object.values(gear)) if (it && it.authored === BQ_KEY) return it;
    return null;
  },
  /** "no blood": a lich. */
  _bqBloodless() {
    const u = this._undeathState ? this._undeathState() : null;
    return !wearerHasBlood({ lich: !!(u && u.form === 'lich') });
  },
  _bqPowerOn() {
    const pw = this.player.bq && this.player.bq.power;
    return !!(pw && pw.t > 0);
  },
  /** "Bladed weapons conjured with iron-rank or lower abilities while wearing
   *  this bracelet": the bracelet is on, the weapon in hand was conjured, its
   *  base is a blade, and the ability that made it is iron or lower. */
  _bqBladeOk(weapon) {
    if (!weapon || !this._bqItem()) return false;
    const conj = this.player.conjuredWeapons;
    if (!conj || !conj.has(weapon.id)) return false;
    if (!isBladedBase(weapon.baseId || weapon.id)) return false;
    return abilityRankOk(this._abilityRankFor(conj.get(weapon.id)), RANK_ORDER);
  },

  /** A conjured blade lands on a monster. `dmg` is the blow. */
  _bloodQueenStrike(weapon, m, dmg) {
    if (!m || !m.alive || !(dmg > 0) || !this._bqBladeOk(weapon)) return;
    const fx = this.player.itemFx || {};
    const queen = this._bqPowerOn();
    let mult = isVampiric(m) ? BQ.vampiricMult : 1;
    if (queen) mult *= BQ.drainMult;
    const drain = Math.min(Math.max(0, m.hp), drainAmount(dmg, fx.bqDrain || BQ.drainShare, mult));
    if (!(drain > 0)) return;
    // "a health ... drain": the foe loses it. Taken straight off, not through
    // _damageMonster, which would run the blow's riders a second time.
    m.hp -= drain;
    this._floatText(m.wx, m.wy - 26, `-${drain}`, BQ_COLOR);
    // "...and stamina drain": a foe has no stamina, so its next attack is held back.
    const cap = ((m.type && m.type.atkCooldown) || 1.2) * 2;
    m.atkCd = Math.min(cap, (m.atkCd || 0) + BQ.staminaHold * (mult > 1 ? 1.5 : 1));
    this._bqTake(drain);
    this._bqDrained = (this._bqDrained || 0) + drain;
    if (m.hp <= 0 && m.alive) this._killMonster(m, true);
  },

  /** A swing at a realm cultist (a person): the Red Hour and the Long Vigil
   *  are exactly what the bracelet is for. Returns the extra damage to add. */
  _bloodQueenPerson(c) {
    const weapon = this._bqSwingWeapon;
    const base = this._bqSwingDmg || 0;
    if (!c || !c.alive || !(base > 0) || !this._bqBladeOk(weapon)) return 0;
    const fx = this.player.itemFx || {};
    let mult = isVampiric({ cultSlug: c.cult }) ? BQ.vampiricMult : 1;
    if (this._bqPowerOn()) mult *= BQ.drainMult;
    const drain = Math.min(Math.max(0, c.hp - 1), drainAmount(base, fx.bqDrain || BQ.drainShare, mult));
    if (!(drain > 0)) return 0;
    this._bqTake(drain);
    this._bqDrained = (this._bqDrained || 0) + drain;
    return drain;
  },

  /** Where the drained life force goes: into the bracelet; or, under the
   *  Queen's power, straight into the wearer. */
  _bqTake(drain) {
    const p = this.player;
    const st = this._bq();
    const th = bqThresholds(p.maxHp);
    if (this._bqPowerOn()) {
      // "directly drains life force to the bracelet's wearer instead of the
      // bracelet" -- health and stamina both.
      const uninjured = p.hp >= p.maxHp - 0.5;
      this._healPlayer(drain, { quiet: true });
      p.stamina = Math.min(p.maxStamina, p.stamina + p.maxStamina * BQ.staminaGain);
      // "Life force drained while the wearer is uninjured increases the
      // duration of this effect."
      if (uninjured) {
        st.power.t = Math.min(BQ.powerMaxSecs + BQ.uninjuredCapSecs, st.power.t + uninjuredSeconds(drain, p.maxHp));
      }
      return;
    }
    const it = this._bqItem();
    if (!it) return;
    const b = it.bq || (it.bq = { stored: 0 });
    const r = storeForce(b.stored, drain, th);
    b.stored = r.stored; b.cap = th.cap; b.major = th.major;
    // "Each time a minor threshold of health is cumulatively drained, an
    // instance of [Blood of the Immortal] is bestowed ... This does not consume
    // the bracelet's stored life force. ... does not occur if the wearer has no blood."
    if (r.crossed > 0 && !this._bqBloodless()) {
      st.instances = Math.min(BQ.instanceCap, (st.instances || 0) + r.crossed);
      this._floatText(this.world.x, this.world.y - 62, `Blood of the Immortal ×${st.instances}`, BQ_COLOR);
      this._bqInstancesGiven = (this._bqInstancesGiven || 0) + r.crossed;
    }
    if (r.ready && !b.readyShown) {
      b.readyShown = true;
      this._floatText(this.world.x, this.world.y - 76, 'Power of the Blood Queen is ready', BQ_COLOR);
    }
  },

  /** "the wearer may consume all life force in the bracelet at any stage to
   *  gain [Power of the Blood Queen]". Returns true if it was taken. */
  _bloodQueenActivate() {
    const p = this.player;
    const it = this._bqItem();
    if (!it || !it.bq) return false;
    if (this._bqBloodless()) {   // "This ability cannot be used if the wearer has no blood."
      this._floatText(this.world.x, this.world.y - 62, 'No blood to answer it', '#90a4ae');
      return false;
    }
    const th = bqThresholds(p.maxHp);
    if ((it.bq.stored || 0) < th.major) return false;   // the major threshold is not yet drained
    const st = this._bq();
    const secs = powerSeconds(it.bq.stored, th);
    st.power = { t: secs, total: secs };
    it.bq.stored = 0; it.bq.readyShown = false;         // "consume all life force"
    this._floatText(this.world.x, this.world.y - 66, `Power of the Blood Queen — ${secs}s`, BQ_COLOR);
    this._bqPowers = (this._bqPowers || 0) + 1;
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    return true;
  },

  /** "[Power], [Speed] and [Recovery] attributes are massively increased."
   *  Called from the stat recompute, beside the transform's. */
  _bqMods(mods) {
    if (!this._bqPowerOn()) return;
    const a = queenAttr(this._relicRankIdx());
    for (const k of ['power', 'speed', 'recovery']) {
      mods.attrBonus[k] = (mods.attrBonus[k] || 0) + a;
      mods.attrCapBonus[k] = (mods.attrCapBonus[k] || 0) + a;
    }
  },

  /** "Damage reduction and resistance to blood effects are enhanced." Read
   *  with the other worn-item readers on every blow. */
  _bqIncoming(m, dmg) {
    if (!this._bqPowerOn() || !(dmg > 0)) return dmg;
    dmg = Math.max(1, Math.round(dmg * (1 - BQ.damageReduction)));
    const el = m && (m.dmgElement || (m.type && m.type.element));
    if (el === 'blood') dmg = Math.max(1, Math.round(dmg * (1 - BQ.bloodResist)));
    return dmg;
  },
  /** ...and blood afflictions are turned away more often than not. */
  _bqRefuses(def) {
    if (!this._bqPowerOn() || !def || !(def.tags || []).includes('blood')) return false;
    return Math.random() < BQ.bloodResist;
  },

  _tickBloodQueen(dt) {
    const p = this.player;
    const st = p.bq;
    if (!st) return;
    // [Power of the Blood Queen] runs down.
    if (st.power) {
      st.power.t -= dt;
      if (st.power.t <= 0) {
        st.power = null;
        this._floatText(this.world.x, this.world.y - 46, 'Power of the Blood Queen fades', '#90a4ae');
        if (this._recomputeDerivedStats) this._recomputeDerivedStats();
      }
    }
    // [Blood of the Immortal]: "Upon suffering damage, an instance is consumed
    // to grant a powerful but short-lived heal-over-time effect." Damage is
    // read as health lost between ticks, so a blow, a burn and a fall all count.
    // "Additional instances can be accumulated but do not have a cumulative
    // effect": while one is mending, the others wait.
    if (st.lastHp == null) st.lastHp = p.hp;
    if (p.hp < st.lastHp - 0.01 && p.hp > 0 && (st.instances || 0) > 0 && !st.hot) {
      st.instances -= 1;
      const boost = 1 + ((p.itemFx && p.itemFx.hotBoost) || 0);   // the Dark Hydra Robe's "+heal-over-time"
      const secs = BQ.hotSecs * boost;
      st.hot = { left: secs, per: (p.maxHp * BQ.hotShare * boost) / secs };
      this._floatText(this.world.x, this.world.y - 62, `Blood of the Immortal (${st.instances} left)`, BQ_COLOR);
      this._bqHots = (this._bqHots || 0) + 1;
    }
    if (st.hot) {
      const step = Math.min(dt, st.hot.left);
      this._healPlayer(st.hot.per * step, { quiet: true });
      st.hot.left -= dt;
      if (st.hot.left <= 0) st.hot = null;
    }
    st.lastHp = p.hp;
    // Keep the card's figures honest as health changes.
    const it = this._bqItem();
    if (it && it.bq) { const th = bqThresholds(p.maxHp); it.bq.cap = th.cap; it.bq.major = th.major; }
  },

  /** The strip beside the hotbar: what the bracelet holds and the instances. Drinking it is the item
   *  slot's job now (ROUND 327), beside the potions. */
  _updateRelicHud() {
    const dock = typeof document !== 'undefined' && document.getElementById('actionDock');
    if (!dock) return;
    let el = document.getElementById('relicHud');
    const p = this.player;
    const it = this._bqItem();
    const st = p.bq;
    const power = this._bqPowerOn();
    if (!it && !power) { if (el) el.style.display = 'none'; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'relicHud';
      dock.insertBefore(el, dock.firstChild);
    }
    el.style.display = '';
    const th = bqThresholds(p.maxHp);
    const stored = (it && it.bq && it.bq.stored) || 0;
    const ready = stored >= th.major && !power && !this._bqBloodless();
    const parts = [];
    if (power) parts.push(`<span class="rh-item rh-live"><b>Power of the Blood Queen</b> ${Math.ceil(st.power.t)}s</span>`);
    if (it) {
      const pct = Math.min(100, Math.round((stored / th.major) * 100));
      parts.push(`<span class="rh-item"><b>Blood Queen</b> <span class="rh-bar"><span class="rh-fill" style="width:${pct}%"></span></span> ${Math.round(stored)}/${th.major}`
        + `${st && st.instances ? ` · ◆${st.instances}` : ''}${st && st.hot ? ' · mending' : ''}`
        + `${ready ? ' <b class="rh-ready">ready — on the item slot</b>' : ''}</span>`);
    }
    const sig = parts.join('');
    if (el._sig !== sig) { el._sig = sig; el.innerHTML = sig; }
  },

  // ==========================================================================
  // THE ITEM SLOT -- ROUND 327.
  //
  //   "Item effects should go onto the bar next to potions."
  //
  // An item whose effect is USED (the bracelet's Power, the Triune's imprinting) is bound to a slot
  // on the potion bar, the way a potion is. The slot has its own address in the hotkey table
  // (K, or L2 + D-pad right) and its own cell beside the potions. It is not a potion: no shared
  // cooldown, no count of drinks -- the effect's own condition decides whether it can be used.
  // The first time an effect becomes available it takes the empty slot; clear it and it stays
  // cleared. This replaces Round 323's K key + button in a strip, which he corrected.
  // ==========================================================================
  /** Every item effect there is, whether or not it can be used now. */
  _itemEffectViews() {
    const p = this.player;
    const out = {};
    const it = this._bqItem();
    if (it) {
      const th = bqThresholds(p.maxHp);
      const stored = (it.bq && it.bq.stored) || 0;
      const power = this._bqPowerOn();
      out.bloodQueen = {
        id: 'bloodQueen', name: 'Blade of the Blood Queen', glyph: '🩸', color: BQ_COLOR,
        ready: stored >= th.major && !power && !this._bqBloodless(),
        text: power ? `${Math.ceil(p.bq.power.t)}s` : `${Math.min(99, Math.round((stored / th.major) * 100))}%`,
        tip: power ? 'Power of the Blood Queen is running.'
          : (stored >= th.major ? 'Consume all the life force in the bracelet for [Power of the Blood Queen].'
            : `The bracelet holds ${Math.round(stored)} of the ${th.major} it needs.`),
        use: () => this._bloodQueenActivate(),
      };
    }
    const held = (p.inventory.consumables || []).filter(c => c === TRIUNE_ID).length;
    if (held) {
      out.triune = {
        id: 'triune', name: 'Soul-Imprinting Triune', glyph: '❖', color: TRIUNE_COLOR, ready: true, text: String(held),
        tip: 'Choose three soul-bound growth items to imprint as a set.',
        use: () => { this._openTriune(); return true; },
      };
    }
    return out;
  },
  _itemSlots() {
    const p = this.player;
    if (!Array.isArray(p.itemSlots)) p.itemSlots = [null];
    if (!p.itemSeen) p.itemSeen = {};
    return p.itemSlots;
  },
  /** What the slot may be bound to: what can be used now, and whatever it holds already. */
  _itemBindables(slotIdx) {
    const ids = Object.keys(this._itemEffectViews());
    const bound = this._itemSlots()[slotIdx];
    if (bound && !ids.includes(bound)) ids.push(bound);
    return ids;
  },
  _assignItemSlot(slotIdx, id) {
    const slots = this._itemSlots();
    if (slotIdx < 0 || slotIdx >= slots.length) return;
    slots[slotIdx] = id || null;
    if (this._renderInventory && this._inventoryOpen) this._renderInventory();
  },
  _cycleItemSlot(slotIdx, dir) {
    const list = [null, ...this._itemBindables(slotIdx)];
    const cur = list.indexOf(this._itemSlots()[slotIdx] || null);
    this._assignItemSlot(slotIdx, list[((cur < 0 ? 0 : cur) + dir + list.length * 2) % list.length]);
  },
  /** Use the effect bound to the slot. True when it was actually used. */
  _useItemSlot(slotIdx) {
    const p = this.player;
    if (!p || p.dead) return false;
    const id = this._itemSlots()[slotIdx];
    if (!id) return false;
    const v = this._itemEffectViews()[id];
    if (!v) { this._floatText(this.world.x, this.world.y - 30, 'Not on your person', '#90a4ae'); return false; }
    if (!v.ready) { this._floatText(this.world.x, this.world.y - 30, v.id === 'bloodQueen' ? 'Not yet drained enough' : 'Not ready', '#90a4ae'); return false; }
    return v.use() !== false;
  },
  /** The first time an effect can be used it takes an empty slot; after that the player decides. */
  _autoBindItemSlots() {
    const slots = this._itemSlots();
    const seen = this.player.itemSeen;
    for (const id of Object.keys(this._itemEffectViews())) {
      if (seen[id]) continue;
      seen[id] = true;
      const free = slots.indexOf(null);
      if (free >= 0) slots[free] = id;
    }
  },

  /** K, edge-triggered. Created on first use; capture off so it does not swallow the key from a
   *  text field. The key is in the hotkey table (`itemEffect`), beside the pad chord. */
  _relicKeys() {
    if (!this.input || !this.input.keyboard) return;
    if (!this._bqKey) this._bqKey = this.input.keyboard.addKey('K', false);
    const down = !!this._bqKey.isDown;
    const edge = down && !this._bqKeyWas;
    this._bqKeyWas = down;
    const el = typeof document !== 'undefined' ? document.activeElement : null;
    const typing = !!(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'));
    if (edge && !typing && !this._dialogueOpen && !this._inventoryOpen && !this._creatorOpen
        && !this._titleOpen && !this._preGameHold) this._useItemSlot(0);
  },

  // ==========================================================================
  // [SOUL-IMPRINTING TRIUNE]
  // ==========================================================================
  /** ROUND 327 -- "Epic items and above should be soulbound. Meaning once a character equips it no
   *  other character may do so." The equip doors (`_equipGear`, `_partyEquipGear`) bind at the moment
   *  of equipping; this is the net under them for what reached the paperdoll another way (a starting
   *  kit, a save from before the rule), and for the legendary weapons, which only the player wields.
   *  It replaces Round 323's reading of 300 seconds of wear. */
  _tickBonds() {
    const p = this.player;
    for (const it of Object.values(p.gear || {})) {
      if (it && bindOnEquip(it, PLAYER_ID)) {
        this._floatText(this.world.x, this.world.y - 56, `${it.name} binds to your soul`, TRIUNE_COLOR);
      }
    }
    if (!p.soulBoundW) p.soulBoundW = {};
    for (const h of ['left', 'right']) {
      const wid = p.hands && p.hands[h];
      const key = legendaryKeyOf(wid);
      if (!key || !LEGENDARY_TEXT[key] || p.soulBoundW[wid]) continue;
      p.soulBoundW[wid] = true;
      this._floatText(this.world.x, this.world.y - 56, `${LEGENDARY_TEXT[key].name} binds to your soul`, TRIUNE_COLOR);
    }
  },

  /** Every growth item the player has, with whether it is soul-bound to them. */
  _triuneCandidates() {
    const p = this.player;
    return this._growthItems().map(g => {
      const bound = g.kind === 'g' ? !!(g.item && isBoundTo(g.item, PLAYER_ID)) : !!(p.soulBoundW && p.soulBoundW[g.id]);
      return { kind: g.kind, id: g.id, name: g.name, rank: g.rank, item: g.item || null, bound,
        slot: g.kind === 'g' ? (g.item && g.item.slot) : 'weapon' };
    });
  },

  /** The set, if all three pieces are on your person; null otherwise. Each
   *  member says whether its bonus is running (worn or wielded). */
  _triuneMembers() {
    const p = this.player;
    const t = p.triune;
    if (!t || !Array.isArray(t.set) || t.set.length !== 3) return null;
    const out = [];
    for (const ref of t.set) {
      if (ref.kind === 'g') {
        const worn = Object.values(p.gear || {}).find(g => g && String(g.uid) === String(ref.id));
        const bag = ((p.inventory && p.inventory.gearItems) || []).find(g => g && String(g.uid) === String(ref.id));
        const item = worn || bag;
        if (!item) return null;   // not on your person
        out.push({ ref, item, active: !!worn, cls: triuneClass(item.slot) });
      } else {
        if (!(p.ownedWeapons && p.ownedWeapons.has(ref.id))) return null;
        const held = !!(p.hands && (p.hands.left === ref.id || p.hands.right === ref.id));
        out.push({ ref, item: null, active: held, cls: 'weapon' });
      }
    }
    return out;
  },

  /** Called from the stat recompute: lays the set's bonuses on the buff stack
   *  and the item-effect sum, and writes each member's line for its card. */
  _relicRecompute(itemBuffLists) {
    const p = this.player;
    // Clear every old imprint line, then stamp the live ones.
    for (const g of [...Object.values(p.gear || {}), ...((p.inventory && p.inventory.gearItems) || [])]) {
      if (g && g.triuneLine) delete g.triuneLine;
    }
    this._triuneWeaponLines = {};
    this._triuneSig = '';
    const members = this._triuneMembers();
    if (!members) return;
    const family = strongestFamily(p.slotEssence, ESSENCES);
    const ri = this._relicRankIdx();
    const sig = [];
    for (const m of members) {
      const b = triuneBonus(m.cls, family, ri);
      const line = m.active ? `${b.text} (${b.label})` : `${b.text} — while ${m.cls === 'weapon' ? 'wielded' : 'worn'} (${b.label})`;
      if (m.item) m.item.triuneLine = line; else this._triuneWeaponLines[m.ref.id] = line;
      sig.push(`${m.ref.id}:${m.active ? 1 : 0}`);
      if (!m.active) continue;
      if (b.buffs.length) itemBuffLists.push(b.buffs);
      const fx = p.itemFx || (p.itemFx = {});
      for (const [k, v] of Object.entries(b.fx)) {
        if (typeof v === 'number') fx[k] = (fx[k] || 0) + v;
        else { fx[k] = fx[k] || {}; for (const [kk, vv] of Object.entries(v)) fx[k][kk] = (fx[k][kk] || 0) + vv; }
      }
    }
    this._triuneSig = `${family}|${sig.join(',')}`;
  },
  /** A wielded set member's tooltip line (a weapon has no gear card). */
  _triuneWeaponTip(wid) {
    const line = this._triuneWeaponLines && this._triuneWeaponLines[wid];
    return line ? `<div class="tip-buff tip-fx">${esc(`Soul-Triune: ${line}`)}</div>` : '';
  },
  /** The set changes when a piece leaves your person, or is worn or taken off:
   *  checked once a second, and the stats recomputed when it has. */
  _tickTriune(dt) {
    this._triuneT = (this._triuneT || 0) - dt;
    if (this._triuneT > 0) return;
    this._triuneT = 1;
    const p = this.player;
    if (!p.triune && !this._triuneSig) return;
    const members = this._triuneMembers();
    let sig = '';
    if (members) sig = `${strongestFamily(p.slotEssence, ESSENCES)}|${members.map(m => `${m.ref.id}:${m.active ? 1 : 0}`).join(',')}`;
    if (sig !== (this._triuneSig || '') && this._recomputeDerivedStats) this._recomputeDerivedStats();
  },

  // --- using one --------------------------------------------------------------
  _openTriune() {
    if (this._inventoryOpen && this._closeInventory) this._closeInventory();
    const p = this.player;
    const cands = this._triuneCandidates();
    this._triuneList = cands;
    const keyOf = (c) => `${c.kind}:${c.id}`;
    const have = new Set(cands.filter(c => c.bound).map(keyOf));
    this._triunePick = (this._triunePick || []).filter(k => have.has(k));
    const picked = this._triunePick;
    const lines = ['Select three growth items that are soul-bound to you. They become a unified set.', ''];
    if (!cands.length) lines.push('You carry no growth items.');
    cands.forEach(c => {
      if (c.bound) lines.push(`${picked.includes(keyOf(c)) ? '✓' : '•'} [${c.name}] (${c.rank} rank) — soul-bound`);
      else lines.push(`✗ [${c.name}] (${c.rank} rank) — not soul-bound to you (it binds to the first to equip it)`);
    });
    if (have.size < 3) lines.push('', `You have ${have.size} soul-bound growth item${have.size === 1 ? '' : 's'}; the Triune needs three. It is not spent.`);
    if (p.triune && p.triune.set) lines.push('', `Imprinting again replaces your current set: ${p.triune.set.map(r => `[${r.name}]`).join(', ')}.`);
    const choices = [];
    cands.forEach((c, i) => {
      if (!c.bound) return;
      if (picked.length >= 3 && !picked.includes(keyOf(c))) return;
      choices.push({ act: `triune|t|${i}`, label: `${picked.includes(keyOf(c)) ? '✓ ' : ''}${esc(c.name)}` });
    });
    if (picked.length === 3) choices.push({ act: 'triune|go', label: 'Imprint these three' });
    if (picked.length) choices.push({ act: 'triune|clear', label: 'Clear the choice' });
    this._openDialogue('Soul-Imprinting Triune', lines.join('\n'), null, choices);
  },
  /** The dialogue's `triune|…` buttons. Each closes the box and reopens it
   *  (or speaks the result), so the shared close is not run after. */
  _triuneAct(act) {
    const [, op, arg] = String(act).split('|');
    const p = this.player;
    if (op === 'go') {
      const cands = this._triuneList || [];
      const keyOf = (c) => `${c.kind}:${c.id}`;
      const set = (this._triunePick || []).map(k => cands.find(c => keyOf(c) === k && c.bound)).filter(Boolean);
      const idx = (p.inventory.consumables || []).indexOf(TRIUNE_ID);
      this._closeDialogue();
      if (set.length !== 3 || idx < 0) { this.time.delayedCall(0, () => this._openTriune()); return; }
      p.inventory.consumables.splice(idx, 1);
      p.triune = { set: set.map(c => ({ kind: c.kind, id: String(c.id), name: c.name })), at: Math.round(this._clockT || 0) };
      this._triunePick = [];
      this._triunesMade = (this._triunesMade || 0) + 1;
      if (this._recomputeDerivedStats) this._recomputeDerivedStats();
      const fam = strongestFamily(p.slotEssence, ESSENCES);
      const ri = this._relicRankIdx();
      const body = ['The three answer to one another now.', '',
        ...set.map(c => `[${c.name}] — ${triuneBonus(triuneClass(c.slot), fam, ri).text}`), '',
        'The bonuses run while all three are on your person, each while it is worn or wielded.'];
      this._floatText(this.world.x, this.world.y - 60, 'Soul-Triune imprinted', TRIUNE_COLOR);
      this.time.delayedCall(0, () => this._openDialogue('Soul-Imprinting Triune', body.join('\n')));
      return;
    }
    if (op === 't') {
      const c = (this._triuneList || [])[Number(arg)];
      if (c && c.bound) {
        const k = `${c.kind}:${c.id}`;
        const at = this._triunePick.indexOf(k);
        if (at >= 0) this._triunePick.splice(at, 1);
        else if (this._triunePick.length < 3) this._triunePick.push(k);
      }
    } else if (op === 'clear') this._triunePick = [];
    this._closeDialogue();
    this.time.delayedCall(0, () => this._openTriune());
  },

  // ==========================================================================
  // DROPS AND THE CLOCK
  // ==========================================================================
  /** A kill: does the Triune fall? Rare, and late (silver rank and up). */
  _relicDropFor(m, x, y) {
    const rankIdx = m && this._monsterRankIndex ? this._monsterRankIndex(m) : 0;
    const id = rollTriuneDrop(Math.random, { rankIdx });
    if (!id) return null;
    this._dropLoot(x, y, { kind: 'consumable', id });
    this._triunesDropped = (this._triunesDropped || 0) + 1;
    return id;
  },

  _tickRelics(dt) {
    if (!this.player || !this.player.inventory) return;
    this._tickBloodQueen(dt);
    this._tickBonds(dt);
    this._autoBindItemSlots();
    this._tickTriune(dt);
    this._relicKeys();
    this._relicHudT = (this._relicHudT || 0) - dt;
    if (this._relicHudT <= 0) { this._relicHudT = 0.25; this._updateRelicHud(); }
  },
};
