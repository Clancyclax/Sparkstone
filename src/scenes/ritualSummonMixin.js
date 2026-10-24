// ===========================================================================
// ROUND 390 -- RITUAL SUMMONS: THE WORLD SIDE.
//
// The user: "ritual summons can be subsumed into the caster ... ritual summons may change forms, gain additional forms,
// and get stronger and often grant the player additional powers when subsumed, the powers granted growing stronger as
// they rank up."
//
// What a ritual summon IS lives in src/data/ritualSummons.js (`spec.ritual`: the being, its forms by rank, its subsume
// powers, its rite). This is the part that needs a world:
//
//   THE RITE. Begun from the ability's card. It is the essence rites' cast (ritualMixin.js `_ritualCast` /
//   `_ritualTick`: thirty seconds, broken by moving or being hurt, the cast bar) on the ritual stage
//   (ritualStageMixin.js: the theme's picture, music and chant, drawing mana and stamina as it runs), under the
//   ritual-room rule (skillBookMixin.js `_inRitualRoom` / `_ritualAnywhere`). `_finishRitual` hands the landed rite
//   to `_ritualSummonLanded`.
//
//   PRESENT. The being fights beside the player through the familiar runtime (`mods.familiars`, `_rebuildFamiliars`),
//   in the form the player chose on the card. It takes a share of each blow that lands on the player
//   (`_ritualSummonTakes`, from `_monsterHitPlayer`); when its health runs out it FALLS and the rite can call it again
//   after the reform wait. A dismissed being can be called again at once.
//
//   SUBSUMED. The canon Astral Lantern's out / in-the-eyes pattern (canonRuntime4Mixin `canonLantern`): one switch on
//   the card. Subsumed, it is not in the world (no familiar) and its powers fold into `passiveMods`; released, it walks
//   out in the form it last held.
//
//   `_ritualSummonMods(a, key, mods)` is the ONE door into the stat pass -- the other engineer's `case 'summonBonded'`
//   calls it for a ritual summon and nothing else.
//
// STATE: `player.ritualSummons[abilityKey] = { name, summoned, subsumed, form, hpFrac, hurtT, cd, fallen }` -- plain
// data, saved with the player; a save from before this round has none, which reads as "not yet summoned". Keyed like
// `passivesOff` (round 279): the key is positional, so the ability's NAME is kept and a state whose name no longer
// matches is dropped rather than handed to whatever ability now sits in that socket.
// ===========================================================================

import {
  ritualFormsAt, ritualFormPick, ritualFormStats, subsumePowersAt, applySubsumePowers, subsumePowerLine,
  SUBSUMED_HEAL_PER_S, PRESENT_HEAL_PER_S, PRESENT_HEAL_DELAY_S, RITUAL_ROLES,
} from '../data/ritualSummons.js';
import { riteChantLines } from '../data/ritualStage.js';

const isRitualSummon = (a) => !!(a && a.template === 'summonBonded' && a.bondKind === 'ritual' && a.ritual);

export const RitualSummonMixin = {
  /** Every ritual summon in the kit: [{ key, a }]. `live` skips a passive the player switched off. */
  _rsEntries(live = false) {
    const p = this.player;
    const known = live && this._liveKnown ? this._liveKnown() : ((p && p.knownAbilities) || {});
    const out = [];
    for (const [key, e] of Object.entries(known)) if (e && isRitualSummon(e.ability)) out.push({ key, a: e.ability });
    return out;
  },

  /** The state for this ability, made if `make`; a state left by a different ability in this socket is dropped. */
  _rsState(key, a, make = true) {
    const p = this.player;
    if (!p) return null;
    const all = p.ritualSummons || (make ? (p.ritualSummons = {}) : null);
    if (!all) return null;
    let st = all[key];
    if (st && a && st.name !== a.name) { delete all[key]; st = null; }
    if (!st && make && a) st = all[key] = { name: a.name, summoned: false, subsumed: false, form: null, hpFrac: 1, hurtT: 0, cd: 0, fallen: false };
    return st || null;
  },

  _rsRank(key) {
    const r = this._abilityRankFor ? this._abilityRankFor(key) : 'iron';
    return r === 'normal' ? 'iron' : (r || 'iron');
  },

  /** The form out now (or that would walk out) and its numbers. */
  _rsForm(key, a, st) {
    const rank = this._rsRank(key);
    const form = ritualFormPick(a.ritual, rank, st && st.form);
    if (!form) return null;
    const live = (this._scaledAbility && this.player && this.player.slotProgress && this._scaledAbility(key)) || a;
    const stats = ritualFormStats(form, rank, live.familiarDmg || a.familiarDmg, this._unitK ? this._unitK() : 1);
    return { form, stats, rank };
  },

  _rsRefresh() {
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    if (this._rebuildFamiliars) this._rebuildFamiliars();
    if (this._inventoryOpen && this._renderInventory) this._renderInventory();
  },

  _rsSay(text, color = '#ce93d8') {
    if (this._floatText && this.world) this._floatText(this.world.x, this.world.y - 50, text, color);
  },

  // ---- the stat pass -------------------------------------------------------------------------------------------
  /**
   * ROUND 390 -- the contract's door. Present: its familiar entry for its current form (and the guardian's armour or
   * the scout's eyes). Subsumed: its powers. Not summoned: nothing.
   */
  _ritualSummonMods(a, key, mods) {
    if (!isRitualSummon(a) || !mods) return;
    const st = this._rsState(key, a, false);
    if (!st || !st.summoned) return;
    const rank = this._rsRank(key);
    if (st.subsumed) {
      applySubsumePowers(mods, subsumePowersAt(a.ritual, rank), { key, name: a.name });
      return;
    }
    const form = ritualFormPick(a.ritual, rank, st.form);
    if (!form) return;
    const s = ritualFormStats(form, rank, a.familiarDmg, this._unitK ? this._unitK() : 1);
    (mods.familiars || (mods.familiars = [])).push({
      name: form.shownName, key: `${key}|ritual`, abilityKey: key, template: 'summonBonded', kind: 'passive',
      bondKind: 'ritual', ritualSummon: true, role: form.role, color: a.color || '#ce93d8', element: a.element || null,
      // `essenceId` is left off on purpose: `_familiarSprite` turns a Chicken or Duck essence's familiar into the bird,
      // and this being has its own body (`familiarFamily`).
      essenceId: null, ritualEssenceId: a.essenceId || null,
      familiarFamily: form.shownFamily, familiarCreatureName: form.shownName,
      ...(form.shownShade ? { summonShade: form.shownShade } : {}),   // ROUND 391 -- a sheet being's shade
      familiarDmg: s.familiarDmg, familiarInterval: s.familiarInterval, familiarRange: s.familiarRange,
    });
    if (s.armorBonus) mods.armorBonus = (mods.armorBonus || 0) + s.armorBonus;
    if (s.lurkReveal) mods.lurkReveal = Math.max(mods.lurkReveal || 0, s.lurkReveal);
  },

  // ---- the rite ------------------------------------------------------------------------------------------------
  _ritualSummonRefusal(key) {
    const p = this.player;
    const e = p && p.knownAbilities && p.knownAbilities[key];
    const a = e && e.ability;
    if (!isRitualSummon(a)) return 'There is no such rite.';
    const st = this._rsState(key, a);
    if (st.summoned) return 'It is already summoned.';
    if (this._passiveOn && !this._passiveOn(key)) return 'The ability is switched off.';
    if (this._ritualCast || this._bookRite) return 'You are already in a rite.';
    if (st.cd > 0) return `It fell. The rite can call it again in ${Math.ceil(st.cd / 60)} minute${Math.ceil(st.cd / 60) === 1 ? '' : 's'}.`;
    // ROUND 344's rule, as every non-combat rite has it.
    if (!(this._inRitualRoom && this._inRitualRoom()) && !(this._ritualAnywhere && this._ritualAnywhere())) {
      return 'A rite is performed in a ritual room: the Society ritual hall.';
    }
    const need = a.ritual.rite.costFrac || 0.5;
    if (p.maxMana > 0 && p.mana / p.maxMana < need) return `Needs at least ${Math.round(need * 100)}% of your mana.`;
    return null;
  },

  /** Begin the summoning rite for the ability at `key`. */
  _beginRitualSummon(key) {
    const why = this._ritualSummonRefusal(key);
    if (why) { this._rsSay(why, '#ef9a9a'); return false; }
    const p = this.player;
    const a = p.knownAbilities[key].ability;
    const rite = a.ritual.rite;
    if (this._closeInventory) this._closeInventory();
    const r = { kind: 'ritualSummon', key, abilityName: a.name, name: `Summoning: ${a.name}`, castS: rite.castS, theme: rite.theme };
    this._ritualCast = { r, t: rite.castS, total: rite.castS, x: this.world.x, y: this.world.y, hp: p.hp,
      start: { mana: p.mana, stamina: p.stamina, hp: p.hp } };
    this._rsSay(`You begin: ${r.name}`);
    if (this._stageBegin) {
      this._stageBegin({ theme: rite.theme, total: rite.castS, x: this.world.x, y: this.world.y, name: r.name,
        chant: riteChantLines(rite.theme, rite.chant), drain: rite.drain, combat: false });
    }
    return true;
  },

  /** `_finishRitual` landed a summoning rite. */
  _ritualSummonLanded(r) {
    const p = this.player;
    const e = p && p.knownAbilities && p.knownAbilities[r.key];
    const a = e && e.ability;
    if (!isRitualSummon(a) || a.name !== r.abilityName) return false;
    const st = this._rsState(r.key, a);
    const forms = ritualFormsAt(a.ritual, this._rsRank(r.key));
    st.summoned = true; st.subsumed = false; st.fallen = false; st.cd = 0; st.hpFrac = 1; st.hurtT = 0;
    if (!forms.some(f => f.id === st.form)) st.form = forms[0] ? forms[0].id : null;
    this._rsRefresh();
    const f = forms.find(x => x.id === st.form);
    this._rsSay(`${f ? f.shownName : a.name} comes through`);
    return true;
  },

  // ---- the card's controls ---------------------------------------------------------------------------------------
  _ritualSummonSwitch(key, formId) {
    const a = this._rsAbility(key);
    const st = a && this._rsState(key, a, false);
    if (!st || !st.summoned) return false;
    const f = ritualFormsAt(a.ritual, this._rsRank(key)).find(x => x.id === formId);
    if (!f) return false;
    st.form = f.id;
    this._rsRefresh();
    if (!st.subsumed) this._rsSay(`${f.shownName}`, '#b39ddb');
    return true;
  },

  _ritualSummonSubsume(key, want) {
    const a = this._rsAbility(key);
    const st = a && this._rsState(key, a, false);
    if (!st || !st.summoned) return false;
    st.subsumed = typeof want === 'boolean' ? want : !st.subsumed;
    this._rsRefresh();
    const f = ritualFormPick(a.ritual, this._rsRank(key), st.form);
    this._rsSay(st.subsumed ? `${f ? f.shownName : a.name} rests in you` : `${f ? f.shownName : a.name} steps out`, '#b39ddb');
    return st.subsumed;
  },

  _ritualSummonDismiss(key) {
    const a = this._rsAbility(key);
    const st = a && this._rsState(key, a, false);
    if (!st || !st.summoned) return false;
    st.summoned = false; st.subsumed = false; st.hpFrac = 1; st.fallen = false;
    this._rsRefresh();
    this._rsSay(`${a.name}: dismissed`, '#b0bec5');
    return true;
  },

  _rsAbility(key) {
    const e = this.player && this.player.knownAbilities && this.player.knownAbilities[key];
    return e && isRitualSummon(e.ability) ? e.ability : null;
  },

  // ---- the fight -----------------------------------------------------------------------------------------------
  /** A monster's blow on its way to the player: each present being takes its share. Returns what is left. */
  _ritualSummonTakes(m, dmg) {
    if (!(dmg > 0) || this._familiarsSubsumed) return dmg;
    const p = this.player;
    if (!p || !p.ritualSummons) return dmg;
    let left = dmg;
    for (const { key, a } of this._rsEntries(true)) {
      const st = this._rsState(key, a, false);
      if (!st || !st.summoned || st.subsumed) continue;
      const fs = this._rsForm(key, a, st);
      if (!fs) continue;
      const taken = left * fs.stats.share;
      if (!(taken > 0)) continue;
      left -= taken;
      st.hurtT = 0;
      st.hpFrac = (st.hpFrac == null ? 1 : st.hpFrac) - taken / fs.stats.maxHp;
      if (st.hpFrac <= 0) this._ritualSummonFall(key, a, st, fs.form);
    }
    return left;
  },

  _ritualSummonFall(key, a, st, form) {
    st.summoned = false; st.subsumed = false; st.hpFrac = 0; st.fallen = true;
    st.cd = (a.ritual.rite && a.ritual.rite.reformS) || 300;
    this._rsRefresh();
    this._rsSay(`${form ? form.shownName : a.name} falls`, '#ef9a9a');
  },

  // ---- the clock -----------------------------------------------------------------------------------------------
  _ritualSummonTick(dt) {
    const p = this.player;
    const all = p && p.ritualSummons;
    if (!all) return;
    // Forget states whose ability has left the socket (once a second; the kit must exist to judge).
    this._rsPruneT = (this._rsPruneT || 0) - dt;
    if (this._rsPruneT <= 0 && p.knownAbilities && Object.keys(p.knownAbilities).length) {
      this._rsPruneT = 1;
      let changed = false;
      for (const [k, st] of Object.entries(all)) {
        const e = p.knownAbilities[k];
        if (!e || !isRitualSummon(e.ability) || e.ability.name !== st.name) { if (st.summoned) changed = true; delete all[k]; }
      }
      if (changed) this._rsRefresh();
    }
    for (const st of Object.values(all)) {
      if (st.cd > 0) st.cd = Math.max(0, st.cd - dt);
      if (!st.summoned) continue;
      if (st.hpFrac == null) st.hpFrac = 1;
      if (st.subsumed) st.hpFrac = Math.min(1, st.hpFrac + SUBSUMED_HEAL_PER_S * dt);
      else {
        st.hurtT = (st.hurtT || 0) + dt;
        if (st.hurtT >= PRESENT_HEAL_DELAY_S) st.hpFrac = Math.min(1, st.hpFrac + PRESENT_HEAL_PER_S * dt);
      }
    }
  },

  // ---- the card ------------------------------------------------------------------------------------------------
  /** The status and buttons under a ritual summon's row in the ability roster. */
  _ritualSummonRowHtml(key) {
    const a = this._rsAbility(key);
    if (!a) return '';
    const st = this._rsState(key, a);
    const btn = (op, label, extra = '', dis = '') => `<button class="action-btn" data-act="rsummon" data-op="${op}" data-abilitykey="${key}"${extra}${dis}>${label}</button>`;
    const rank = this._rsRank(key);
    let status, buttons = '';
    if (!st.summoned) {
      const why = this._ritualSummonRefusal(key);
      status = st.fallen && st.cd > 0 ? `Fallen. The rite can call it again in ${Math.ceil(st.cd / 60)} min.` : 'Not summoned.';
      buttons = why ? `${btn('rite', 'Perform the rite', '', ' disabled')} <span style="opacity:0.7;font-size:11px;">${why}</span>`
        : btn('rite', 'Perform the rite');
    } else {
      const fs = this._rsForm(key, a, st);
      const hp = Math.round(Math.max(0, Math.min(1, st.hpFrac == null ? 1 : st.hpFrac)) * 100);
      if (st.subsumed) {
        const lines = subsumePowersAt(a.ritual, rank).map(p => subsumePowerLine(p, p.value));
        status = `Subsumed: ${fs ? fs.form.shownName : a.name} rests in you (health ${hp}%). ${lines.length ? `You have: ${lines.join('; ')}.` : ''}`;
      } else {
        status = fs ? `Out: ${fs.form.shownName}, ${RITUAL_ROLES[fs.form.role].label}, striking for ${fs.stats.familiarDmg} every ${fs.stats.familiarInterval}s (health ${hp}%).` : 'Out.';
      }
      const forms = ritualFormsAt(a.ritual, rank);
      if (forms.length > 1) {
        buttons += forms.map(f => btn('form', f.shownName, ` data-form="${f.id}"`, fs && fs.form.id === f.id ? ' disabled' : '')).join(' ') + ' ';
      }
      buttons += btn('subsume', st.subsumed ? 'Release' : 'Subsume') + ' ' + btn('dismiss', 'Dismiss');
    }
    return `<div class="ritual-summon-row" style="font-size:11px;color:#e1bee7;margin:2px 0;">${status}</div>
      <div class="ability-slot-pick"><span class="ability-slot-label">Ritual</span>${buttons}</div>`;
  },

  /** A card button (data-act="rsummon"). */
  _ritualSummonAct(btn) {
    const d = (btn && btn.dataset) || {};
    const key = d.abilitykey;
    switch (d.op) {
      case 'rite': return this._beginRitualSummon(key);
      case 'form': return this._ritualSummonSwitch(key, d.form);
      case 'subsume': return this._ritualSummonSubsume(key);
      case 'dismiss': return this._ritualSummonDismiss(key);
      default: return false;
    }
  },
};
