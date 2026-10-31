// ===========================================================================
// ROUND 310 (item 2.3) -- RITUAL MAGIC: THE SCENE SIDE.
//
// What a ritual IS lives in src/data/rituals.js (generation, numbers, card).
// This is the part that needs a world: beginning a rite (which closes the
// inventory it was chosen from), the long uninterrupted cast, paying the cost,
// the zone on the ground, and what the zone does to the people and monsters
// standing in it.
//
// WHERE THEY ARE CHOSEN. Rituals are listed in the Inventory table beside the
// skill books (they are the thing the Ritual Magic book unlocks), each with a
// Begin button, or the reason it cannot be begun. There is no hotkey: a rite
// that takes thirty seconds and ninety per cent of everything you have is not
// something to press by accident.
//
// WHAT INTERRUPTS A CAST (the ruling says "uninterrupted" and nothing about
// what interrupts, so this is mine): moving, or losing any health. An
// interrupted cast costs nothing and starts no cooldown -- the price is the
// time. The COST of a combat ritual (over 90% of mana, stamina and health) is
// paid when the rite completes, and the health part cannot kill: it leaves
// one point at least.
//
// THE ZONE is stored on the player (`ritualZones`, plain data) so it survives
// a save, and its picture is rebuilt on demand. Effects read through the same
// doors the martial arts use; see skillBookMixin.js.
// ===========================================================================

import {
  ritualsFromSlots, ritualCard, FAMILIAR_CAP, COMBAT_EFFECTS, ELEMENT_LABELS,
  RITUAL_CAP, CANON_RITUAL_KEYS,
} from '../data/rituals.js';
import { hasCraft } from '../data/skillBooks.js';
import { isoProject, TILE } from '../data/iso.js';
import { rollPotion } from '../data/potions.js';
import { riteChantLines, riteDrainFor } from '../data/ritualStage.js';   // ROUND 358

const TICK_S = 3;

export const RitualMixin = {
  /** ROUND 311 -- how many canon ritual summons (Sanguine Horror, Avatar of
   *  Doom, Spartoi, Shadow of the Reaper) this kit holds. Each is one of the
   *  player's four rituals. */
  _canonRitualsHeld() {
    let n = 0;
    for (const ck of CANON_RITUAL_KEYS) { try { if (this._canonKeyFor && this._canonKeyFor(ck)) n++; } catch (e) { /* none */ } }
    return n;
  },

  /** The rituals this socketed kit offers (memoised by the sockets). Rare by
   *  construction (a pairing offers one about one time in seven), and never
   *  more than four in all, canon ritual summons included. */
  _rituals() {
    const p = this.player;
    const held = this._canonRitualsHeld();
    const sig = JSON.stringify([p.slotEssence, p.slotStones, held]);
    if (this._ritualMemo && this._ritualMemo.sig === sig) return this._ritualMemo.list;
    const list = ritualsFromSlots(p.slotEssence, p.slotStones, Math.max(0, RITUAL_CAP - held));
    this._ritualMemo = { sig, list };
    return list;
  },

  _ritualBase() {
    // The reference "aura": the widest aura the player carries, or a plain
    // 120 when they carry none, so a kit without one still has a zone.
    let best = 0;
    try { for (const a of (this._auras ? this._auras() : [])) best = Math.max(best, this._auraRadius(a)); } catch (e) { best = 0; }
    return best || 120;
  },

  _ritualRefusal(r) {
    const p = this.player;
    if (!hasCraft(p, 'ritual')) return 'You do not know ritual magic.';
    if (this._ritualCast) return 'You are already in a rite.';
    if (this._bookRite) return 'You are already in a rite.';   // ROUND 358
    const cd = (p.ritualCd && p.ritualCd[r.key]) || 0;
    if (cd > 0) return `Not for ${Math.ceil(cd / 60)} more minutes.`;
    // ROUND 344 -- "rituals need to be in a ritual room (unless the player has awakened a ritual ability ... allowing them to
    // conduct rituals anywhere)". A COMBAT rite marks ground that has to be out in the field, so it keeps needing open ground;
    // a familiar or conjured food/potion rite is performed in the Society's ritual hall, or anywhere with Enact Ritual.
    if (r.kind === 'combat') {
      if (this._insideRoom) return 'A combat rite marks the ground: it needs open ground.';
    } else if (!this._inRitualRoom() && !(this._ritualAnywhere && this._ritualAnywhere())) {
      return 'A rite is performed in a ritual room: the Society ritual hall.';
    }
    const frac = (v, max) => (max ? v / max : 1);
    if (r.kind === 'combat') {
      const need = r.costFrac;
      if (frac(p.mana, p.maxMana) < need || frac(p.stamina, p.maxStamina) < need || frac(p.hp, p.maxHp) < need) {
        return `Needs at least ${Math.round(need * 100)}% of your mana, stamina and health.`;
      }
    } else if (r.kind === 'conjure') {
      if (frac(p.mana, p.maxMana) < r.costFrac || frac(p.stamina, p.maxStamina) < r.costFrac) {
        return `Needs at least ${Math.round(r.costFrac * 100)}% of your mana and stamina.`;
      }
    } else if (r.kind === 'familiar') {
      const bound = p.ritualFamiliars || [];
      if (bound.some(f => f.key === r.key)) return 'That familiar is already bound to you.';
      if (bound.length >= FAMILIAR_CAP) return `You can keep only ${FAMILIAR_CAP} bound familiars.`;
      if (frac(p.mana, p.maxMana) < r.costFrac) return `Needs at least ${Math.round(r.costFrac * 100)}% of your mana.`;
    }
    return null;
  },

  /** Rows for the Inventory table. */
  _ritualRows() {
    const p = this.player;
    const rows = [];
    if (!hasCraft(p, 'ritual')) {
      if (p.slotEssence && p.slotEssence.some(Boolean)) {
        rows.push({ name: 'Ritual Magic', type: 'Locked', qty: '', color: '#9e9e9e',
          desc: 'You do not know ritual magic. A skill book teaches it, and after that any essence you carry can offer rites. Rites are performed in a ritual room (the Society ritual hall), unless you have an awakened ritual ability such as Enact Ritual.' });
      }
      return rows;
    }
    if (!this._rituals().length) {
      rows.push({ name: 'Ritual Magic', type: 'Known', qty: '', color: '#ce93d8',
        desc: 'You know ritual magic, but none of the essences and stones you carry offer a rite. Few pairings do; try another.' });
    }
    for (const r of this._rituals()) {
      const why = this._ritualRefusal(r);
      rows.push({
        name: r.name, desc: ritualCard(r), type: 'Ritual', qty: '', color: '#ce93d8',
        action: why ? `<span style="opacity:0.7;font-size:11px;">${why}</span>`
          : `<button class="action-btn" data-act="ritualbegin" data-ritual="${r.key}">Begin</button>`,
      });
    }
    for (const z of (p.ritualZones || [])) {
      rows.push({ name: `${z.name} (marked ground)`, type: 'Active', qty: '', color: '#b39ddb',
        desc: `${Math.ceil(z.t / 60)} minutes left. ${this._zoneLine(z)}` });
    }
    for (const f of (p.ritualFamiliars || [])) {
      rows.push({ name: f.creatureName || f.name, type: 'Bound familiar', qty: '', color: '#b39ddb',
        desc: `Bound by ${f.name}. Strikes for ${f.familiarDmg} every ${f.familiarInterval}s.` });
    }
    return rows;
  },

  _zoneLine(z) {
    const def = COMBAT_EFFECTS[z.effect];
    return def ? def.text(z.value, { elementLabel: ELEMENT_LABELS[z.element] || z.element }) : '';
  },

  _beginRitual(key) {
    const r = this._rituals().find(x => x.key === key);
    if (!r) return false;
    const why = this._ritualRefusal(r);
    if (why) { this._floatText(this.world.x, this.world.y - 40, why, '#ef9a9a'); return false; }
    if (this._closeInventory) this._closeInventory();
    const p = this.player;
    this._ritualCast = { r, t: r.castS, total: r.castS, x: this.world.x, y: this.world.y, hp: p.hp,
      start: { mana: p.mana, stamina: p.stamina, hp: p.hp } };
    this._floatText(this.world.x, this.world.y - 44, `You begin: ${r.name}`, '#ce93d8');
    // ROUND 358 -- the stage: the rite's music, its picture growing over the casting, the chant spoken a line at a time
    // (round 311's two sentences carried through the theme's own), and the draw on mana, stamina and life as it runs.
    if (this._stageBegin) {
      this._stageBegin({
        theme: r.theme, total: r.castS, x: this.world.x, y: this.world.y, name: r.name,
        chant: riteChantLines(r.theme, r.chant), drain: r.drain || riteDrainFor(r.kind, r.theme, { costFrac: r.costFrac }),
        combat: r.kind === 'combat',
      });
    }
    return true;
  },

  _cancelRitual(why) {
    if (!this._ritualCast) return;
    this._ritualCast = null;
    if (this._castBar) this._castBar.setVisible(false);
    if (this._castBarText) this._castBarText.setVisible(false);
    if (this._stageEnd) this._stageEnd(false);   // ROUND 358 -- what it drew is spent; the music plays on
    this._floatText(this.world.x, this.world.y - 44, why, '#ef9a9a');
  },

  _finishRitual(c) {
    const p = this.player, r = c.r;
    this._ritualCast = null;
    if (this._castBar) this._castBar.setVisible(false);
    if (this._castBarText) this._castBarText.setVisible(false);
    if (this._stageEnd) this._stageEnd(true);   // ROUND 358
    if (!p.ritualCd) p.ritualCd = {};
    if (r.kind === 'combat') {
      // ROUND 358 -- the price was drawn as the rite ran; this settles it at the round-310 figure (regeneration during
      // the casting does not shave it), never above where the drain left it, and never below one point of health.
      const st = c.start || { hp: p.hp };
      p.mana = Math.min(p.mana, Math.max(0, p.maxMana * (1 - r.costFrac)));
      p.stamina = Math.min(p.stamina, Math.max(0, p.maxStamina * (1 - r.costFrac)));
      p.hp = Math.max(1, Math.min(p.hp, Math.round(st.hp - p.maxHp * r.costFrac)));
      p.ritualCd[r.key] = this._theoryRiteCooldown ? this._theoryRiteCooldown(r.cooldownS) : r.cooldownS;   // ROUND 357
      const radius = Math.round(this._ritualBase() * r.zoneAuraMult);
      (p.ritualZones || (p.ritualZones = [])).push({
        id: `${r.key}@${Math.round(this._clockT || 0)}`, key: r.key, name: r.name,
        x: this.world.x, y: this.world.y, r: radius, effect: r.effect, element: r.element,
        value: this._theoryRiteValue ? this._theoryRiteValue(r.value) : r.value,   // ROUND 357 -- interference theory
        t: this._theoryRiteLife ? this._theoryRiteLife(r.zoneLifeS) : r.zoneLifeS, tick: TICK_S,
      });
      this._floatText(this.world.x, this.world.y - 50, `${r.name} marks the ground`, '#ce93d8');
    } else if (r.kind === 'conjure') {
      // ROUND 358 -- paid as it ran (the stage's drain), not here.
      p.ritualCd[r.key] = this._theoryRiteCooldown ? this._theoryRiteCooldown(r.cooldownS) : r.cooldownS;   // ROUND 357
      let rank = 'normal';
      try { rank = (this._playerRankStanding().rank) || 'normal'; } catch (e) { rank = 'normal'; }
      for (let i = 0; i < r.count; i++) {
        if (r.conjure === 'potion') p.inventory.consumables.push(rollPotion(Math.random, rank));
        else p.inventory.consumables.push('staminaRation');
      }
      this._floatText(this.world.x, this.world.y - 50, r.conjure === 'potion' ? 'Potions take shape' : 'A meal appears', '#ce93d8');
    } else if (r.kind === 'familiar') {
      // ROUND 358 -- paid as it ran.
      (p.ritualFamiliars || (p.ritualFamiliars = [])).push({
        key: r.key, name: r.name, creatureName: r.creatureName, familiarFamily: r.familiarFamily,
        essenceId: r.essenceId, stoneId: r.stoneId, color: '#b39ddb',
        familiarDmg: r.familiarDmg, familiarInterval: r.familiarInterval, familiarRange: r.familiarRange,
      });
      this._recomputeDerivedStats && this._recomputeDerivedStats();
      this._rebuildFamiliars && this._rebuildFamiliars();
      this._floatText(this.world.x, this.world.y - 50, `${r.creatureName} is bound to you`, '#ce93d8');
    } else if (r.kind === 'ritualSummon' && this._ritualSummonLanded) {
      // ROUND 390 -- a ritual summon's rite (ritualSummonMixin.js): paid as it ran; the being comes through.
      this._ritualSummonLanded(r);
    }
  },

  // ---- the tick ----------------------------------------------------------

  _ritualTick(dt) {
    const p = this.player;
    if (!p) return;
    if (p.ritualCd) for (const k of Object.keys(p.ritualCd)) { p.ritualCd[k] -= dt; if (p.ritualCd[k] <= 0) delete p.ritualCd[k]; }
    const c = this._ritualCast;
    if (c) {
      const moved = Math.hypot(this.world.x - c.x, this.world.y - c.y);
      if (moved > 10) this._cancelRitual('The rite is broken: you moved.');
      else if (p.hp < c.hp - 0.01) this._cancelRitual('The rite is broken: you were hurt.');
      else {
        c.t -= dt;
        // ROUND 358 -- the rite draws on the caster as it runs. Its own draw is not a wound, so the "were you hurt"
        // mark is taken AFTER it (and after any regeneration), and only a blow from outside breaks the rite.
        if (this._stageTick) this._stageTick(dt, Math.max(0, c.t));
        c.hp = p.hp;
        if (this._drawCastBar) this._drawCastBar({ t: Math.max(0, c.t), total: c.total, name: c.r.name, color: '#ce93d8' });
        if (c.t <= 0) this._finishRitual(c);
      }
    }
    const zones = p.ritualZones;
    if (!zones || !zones.length) { if (this._ritualLive) { this._ritualLive = null; this._ritualZoneRings(); } return; }
    const live = { damage: 0, crit: 0, guard: 0, dodge: 0, aura: 0, resist: {} };
    const layer = !!(this._theoryRiteLayer && this._theoryRiteLayer());
    const std = this._playerStanding ? this._playerStanding() : 0;
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      z.t -= dt;
      if (z.t <= 0) { zones.splice(i, 1); continue; }
      const inside = Math.hypot(this.world.x - z.x, this.world.y - z.y) <= z.r;
      const v = z.value / 100;
      if (inside) {
        // ROUND 357 -- "layer rituals": a Ritual Interference theorist from silver ADDS overlapping zones of one kind
        // (each still capped where it lands); everyone else takes the strongest.
        const comb = layer ? (a0, b0) => Math.min(0.9, a0 + b0) : Math.max;
        switch (z.effect) {
          case 'guard': live.guard = comb(live.guard, v); break;
          case 'damage': live.damage = comb(live.damage, v); break;
          case 'crit': live.crit = comb(live.crit, v); break;
          case 'dodge': live.dodge = comb(live.dodge, v); break;
          case 'aura': live.aura = comb(live.aura, v); break;
          case 'resist': live.resist[z.element] = comb(live.resist[z.element] || 0, v); break;
          default: break;
        }
      }
      z.tick -= dt;
      if (z.tick <= 0) {
        z.tick = TICK_S;
        this._zoneBeat(z, inside, std);
      }
    }
    this._ritualLive = live;
    this._ritualZoneRings();
  },

  _zoneBeat(z, inside, std) {
    const p = this.player;
    if (z.effect === 'pulse') {
      const frac = z.value / 100;
      if (inside) this._healPlayer(p.maxHp * frac, { quiet: true });
      for (const m of (this.party || [])) {
        if (!m.recruited || m.benched || !m.maxHp) continue;
        if (m.wx !== undefined && Math.hypot(m.wx - z.x, m.wy - z.y) > z.r) continue;
        m.hp = Math.min(m.maxHp, (m.hp || 0) + m.maxHp * frac);
      }
      return;
    }
    if (z.effect !== 'strike' && z.effect !== 'drain') return;
    const foes = (this.monsters || []).filter(m => m && m.alive && !m.ally && !m.tamed && !m.person && !m.friendly
      && Math.hypot(m.wx - z.x, m.wy - z.y) <= z.r);
    if (!foes.length) return;
    const m = foes[Math.floor(Math.random() * foes.length)];
    const dmg = Math.max(1, Math.round((z.effect === 'strike' ? 16 : 9) * (1 + 0.8 * std)));
    this._damageMonster(m, dmg, true, false, z.element);
    if (z.effect === 'drain') this._healPlayer(dmg, { quiet: true });
    this._floatText(m.wx, m.wy - 30, z.effect === 'strike' ? `⚡${dmg}` : `-${dmg}`, '#ce93d8');
  },

  /** One channel of the live zone bag. */
  _ritualFx(key) {
    const b = this._ritualLive;
    return (b && b[key]) || 0;
  },
  _ritualResist(el) {
    const b = this._ritualLive;
    return (b && b.resist && b.resist[el]) || 0;
  },
  /** The slow a ritual zone puts on a monster standing at (x, y), as a fraction. */
  _ritualSlowAt(x, y) {
    const zones = this.player && this.player.ritualZones;
    if (!zones) return 0;
    let best = 0;
    for (const z of zones) {
      if (z.effect !== 'slow') continue;
      if (Math.hypot(x - z.x, y - z.y) <= z.r) best = Math.max(best, z.value / 100);
    }
    return best;
  },

  /** Keep one ellipse per zone on the ground; destroy it with the zone. */
  _ritualZoneRings() {
    const zones = (this.player && this.player.ritualZones) || [];
    const rings = this._zoneRings || (this._zoneRings = {});
    const live = new Set(zones.map(z => z.id));
    for (const id of Object.keys(rings)) {
      if (!live.has(id)) { rings[id].destroy(); delete rings[id]; }
    }
    for (const z of zones) {
      let ring = rings[z.id];
      if (!ring) {
        const c = isoProject(z.x, z.y);
        const a = (z.r / TILE) * 32 * Math.SQRT2, b = (z.r / TILE) * 16 * Math.SQRT2;
        ring = this.add.ellipse(c.x, c.y, a * 2, b * 2, 0xce93d8, 0.10);
        ring.setStrokeStyle(2, 0xce93d8, 0.55);
        ring.setDepth(1);
        rings[z.id] = ring;
      }
      ring.setVisible(!this._insideRoom);
      ring.setAlpha(0.8 + 0.2 * Math.sin((this._clockT || 0) * 2));
    }
  },
};
