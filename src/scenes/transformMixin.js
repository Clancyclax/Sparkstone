// ===========================================================================
// ROUND 408 -- PLAYER TRANSFORMATIONS, IN THE SCENE (data: src/data/transformForms.js).
//
//   _formAttachToKit()     after every kit rebuild: a kit whose confluence carries a form (1 in FORM_ODDS, seeded on the
//                          character) has it in place of the confluence's innate ability
//   _formBegin(a, key)     the cast: a temporary form starts, or a permanent one is taken for good
//   _formTick(dt)          the clock, regeneration, and the end of a temporary form
//   _formLook(moving)      from `_updatePlayerSprite`: the creature drawn in the player's place, or the recoloured body
//   _formStats(ms)         from `_recomputeDerivedStats`: the form's and the permanent form's numbers
//   _formCastAbility(a, entry)   a shifted form's confluence abilities hit harder
//   _formOnKill / _formOnSwingHit / _formDeathless / _formSpellstrikeHold / _formCdMult   the permanent perks
//
// State on the player: `form` { id, kind, until, abilityKeys } (a temporary form running), `formHotbarSaved` (the bar
// a shift put away), `permForm` (the permanent form taken, for good).
// ===========================================================================
import { FORMS, formForKit, formAbility, FORM_CONFLUENCES } from '../data/transformForms.js';
import { buildSignatureAbility } from '../data/awakening.js';
import { MONSTER_TYPES } from '../data/monsters.js';
import { isoProject, isoDepth } from '../data/iso.js';

const SHIFT_SLOTS = 4;

export const TransformMixin = {
  _formClock() { return this._clockT || 0; },

  // ------------------------------------------------------------------ the kit
  _formAttachToKit() {
    const p = this.player;
    if (!p || !p.knownAbilities || !p.confluence) return null;
    const name = p.confluence.name;
    if (!FORM_CONFLUENCES.includes(name)) return null;
    const id = formForKit(name, p.charSeed || p.runSeed || p.name || 'seed');
    if (!id) return null;
    const entry = p.knownAbilities['3:innate'];
    if (!entry) return null;
    const a = formAbility(id, p.confluence.color || '#e1bee7');
    if (p.permForm === id) a.desc = `${a.desc} (Taken.)`;
    entry.ability = { ...a, innate: true, essenceId: 'confluence' };
    entry.form = id;
    if (p.form && p.form.kind === 'shift') this._formInjectAbilities(FORMS[p.form.id]);
    return id;
  },

  /** The form's own abilities, built as real abilities of this character's confluence. */
  _formShiftSpecs(f) {
    const p = this.player;
    const conf = p.confluence || {};
    const ess = { id: 'confluence', name: conf.name || f.conf, color: conf.color || '#e1bee7', element: conf.element || null, base: 8, cooldown: 1.5 };
    const rk = Math.max(1, ['normal', 'iron', 'bronze', 'silver', 'gold'].indexOf(p.rank || 'iron'));
    return f.abilities.map((fa, i) => {
      let spec = null;
      try { spec = buildSignatureAbility({ name: fa.name, catKey: fa.catKey, desc: fa.desc }, ess, `form_${f.conf}`, 7 + i, new Set()); } catch (e) { spec = null; }
      if (!spec) return null;
      const k = fa.mult * (1 + 0.6 * (rk - 1));   // a form keeps pace with the rank that wears it
      for (const fld of ['base', 'healAmount', 'shieldAmount', 'absorb']) if (typeof spec[fld] === 'number') spec[fld] = Math.round(spec[fld] * k);
      if (spec.dot && typeof spec.dot.dmgPerTick === 'number') spec.dot = { ...spec.dot, dmgPerTick: Math.round(spec.dot.dmgPerTick * k) };
      spec.name = fa.name; spec.desc = fa.desc; spec.formAbility = true; spec.cost = null; spec.color = conf.color || spec.color;
      spec.cooldown = Math.max(1, Math.round((spec.cooldown || 4) * 0.6 * 10) / 10);
      return spec;
    });
  },
  _formInjectAbilities(f) {
    const p = this.player;
    const specs = this._formShiftSpecs(f);
    const keys = [];
    specs.forEach((spec, i) => {
      if (!spec) return;
      const key = `form:${i}`;
      p.knownAbilities[key] = { ability: spec, slotIndex: 'form', essenceId: 'form', stoneId: null, formAbility: true };
      keys.push(key);
    });
    if (p.form) p.form.abilityKeys = keys;
    return keys;
  },

  // ------------------------------------------------------------------ the cast
  _formBegin(a, key) {
    const p = this.player;
    const f = FORMS[a.formId];
    if (!f) return false;
    if (f.kind === 'permanent') {
      if (p.permForm) {
        this._openDialogue(f.name, p.permForm === a.formId ? 'It is already done. It does not undo.' : `You are already ${FORMS[p.permForm].name}. One change of this kind is all a body takes.`, null);
        return false;
      }
      if (!this._formConfirmed || this._formConfirmed !== a.formId) {
        this._formConfirmed = a.formId;
        this._openDialogue(f.name, `${f.desc}\n\n${f.lines.map(l => `  · ${l}`).join('\n')}\n\nThis cannot be undone. Use it again to take it.`, null);
        if (p.abilityCdByKey) p.abilityCdByKey[key] = 0;
        return false;
      }
      p.permForm = a.formId;
      this._formConfirmed = null;
      this._floatText(this.world.x, this.world.y - 64, `${f.name}`, '#e1bee7');
      if (this._announce) try { this._announce([{ title: 'Transformation', lines: [f.desc, ...f.lines] }]); } catch (e) { /* display only */ }
      this._recomputeDerivedStats();
      return true;
    }
    if (p.form) this._formEnd(true);
    p.form = { id: a.formId, kind: f.kind, until: this._formClock() + f.duration };
    if (f.kind === 'shift') {
      const keys = this._formInjectAbilities(f);
      p.formHotbarSaved = (p.hotbar || []).slice();
      // the form's four in the first slots; the confluence's own abilities stay; your other essences' are put away
      const conf = (p.formHotbarSaved || []).filter(k => k && p.knownAbilities[k] && (p.knownAbilities[k].slotIndex === 3 || p.knownAbilities[k].essenceId === 'confluence'));
      const bar = keys.slice(0, SHIFT_SLOTS);
      while (bar.length < SHIFT_SLOTS) bar.push(null);
      p.hotbar = [...bar, ...conf].concat(new Array(Math.max(0, (p.formHotbarSaved.length || 16) - SHIFT_SLOTS - conf.length)).fill(null));
      this._hotbarDirty = true;
    }
    this._floatText(this.world.x, this.world.y - 64, f.name, '#e1bee7');
    this._recomputeDerivedStats();
    if (this._spawnRingFx) this._spawnRingFx(this.world.x, this.world.y, 70, (f.look && f.look.glow) ? `#${f.look.glow.toString(16).padStart(6, '0')}` : '#e1bee7');
    return true;
  },

  _formEnd(quiet = false) {
    const p = this.player;
    const f = p.form && FORMS[p.form.id];
    if (p.formHotbarSaved) { p.hotbar = p.formHotbarSaved; p.formHotbarSaved = null; this._hotbarDirty = true; }
    for (const k of Object.keys(p.knownAbilities || {})) if (/^form:/.test(k)) delete p.knownAbilities[k];
    p.form = null;
    if (this._formBody && this._formBody.sprite) { this._formBody.sprite.destroy(); }
    this._formBody = null;
    if (this.playerSprite) { this.playerSprite.setAlpha(1); this.playerSprite.setScale(this._formBaseScale || this.playerSprite.scaleX); this._formBaseScale = null; this._formGlowOff(); }
    if (!quiet && f) this._floatText(this.world.x, this.world.y - 60, `${f.name} fades`, '#b39ddb');
    this._recomputeDerivedStats();
  },

  _formTick(dt) {
    const p = this.player;
    if (!p) return;
    // a form running across a load has no clock to finish on: it ends, and the bar comes back
    if (!this._formLoadChecked) { this._formLoadChecked = true; if (p.form || p.formHotbarSaved) { if (!p.form) p.form = { id: null }; this._formEnd(true); } }
    if (p.form && this._formClock() >= p.form.until) this._formEnd();
    // regeneration: a form's, and Trollblood's
    const f = p.form && FORMS[p.form.id];
    const regen = ((f && ((f.bonus && f.bonus.regenPct) || f.regenPct)) || 0) + ((p.permForm && FORMS[p.permForm].perks.regenPct) || 0);
    if (regen > 0 && p.hp > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * regen * dt);
    // a kill's mend, over its seconds
    if (this._formMend && this._formMend.left > 0 && p.hp > 0) {
      const step = Math.min(this._formMend.left, this._formMend.rate * dt);
      p.hp = Math.min(p.maxHp, p.hp + step);
      this._formMend.left -= step;
    }
  },

  // ------------------------------------------------------------------ the look
  _formLook(moving) {
    const p = this.player;
    const f = p && p.form && FORMS[p.form.id];
    const look = f && f.look;
    if (!look) { if (this._formBody) this._formEnd(true); return; }
    if (this._formBaseScale == null) this._formBaseScale = this.playerSprite.scaleX;
    if (look.monster) {
      const key = Object.keys(MONSTER_TYPES).find(k => MONSTER_TYPES[k].family === look.monster && MONSTER_TYPES[k].shade === look.shade)
        || Object.keys(MONSTER_TYPES).find(k => MONSTER_TYPES[k].family === look.monster);
      if (!this._formBody && key) {
        const tex = this._monsterTexture(look.monster, 'idle');
        if (this._ensureFamilyArt) this._ensureFamilyArt(look.monster);
        const sp = this.add.sprite(0, 0, this.textures.exists(tex) ? tex : '__DEFAULT', 0);
        sp.setOrigin(0.5, 0.85);
        this._formBody = { key, type: MONSTER_TYPES[key], sprite: sp, wx: this.world.x, wy: this.world.y, facing: p.facing, scaleMult: look.scale || 1, debuffs: null };
      }
      const b = this._formBody;
      if (b) {
        b.wx = this.world.x; b.wy = this.world.y; b.facing = p.facing || b.facing; b.moving = !!moving;
        b.attackT = p.attacking ? 0.2 : 0;
        try { this._updateMonsterSprite(b); } catch (e) { /* a missing sheet draws nothing this frame */ }
        if (b.sprite && b.sprite.active) b.sprite.setDepth(this.playerSprite.depth + 0.01);
        this.playerSprite.setAlpha(b.sprite && b.sprite.visible ? 0 : 1);
      }
      return;
    }
    // the recoloured body: an intense tint, larger, and glowing
    this.playerSprite.setTint(look.tint);
    this.playerSprite.setScale(this._formBaseScale * (look.scale || 1));
    if (look.glow) this._formGlowOn(look.glow);
  },
  _formGlowOn(colour) {
    const sp = this.playerSprite;
    if (this._formGlow || !sp) return;
    try {
      const fx = sp.preFX || sp.postFX;
      if (fx && fx.addGlow) this._formGlow = fx.addGlow(colour, 4, 0, false, 0.1, 12);
    } catch (e) { this._formGlow = null; }
    if (!this._formGlow) {
      const p = isoProject(this.world.x, this.world.y);
      const halo = this.add.circle(p.x, p.y - 30, 30, colour, 0.22);
      halo.setDepth(sp.depth - 0.01);
      this._formGlow = { halo };
    }
  },
  _formGlowOff() {
    const g = this._formGlow;
    this._formGlow = null;
    if (!g) return;
    try {
      if (g.halo) g.halo.destroy();
      else { const fx = this.playerSprite.preFX || this.playerSprite.postFX; if (fx && fx.remove) fx.remove(g); }
    } catch (e) { /* gone already */ }
  },
  _formHaloFollow() {
    const g = this._formGlow;
    if (g && g.halo) { const p = isoProject(this.world.x, this.world.y); g.halo.setPosition(p.x, p.y - 30); g.halo.setDepth(this.playerSprite.depth - 0.01); }
  },

  // ------------------------------------------------------------------ numbers
  _formStats(ms) {
    const p = this.player;
    if (!p || !ms) return;
    const f = p.form && FORMS[p.form.id];
    const b = f ? (f.bonus || {
      moveSpeed: f.moveSpeed, armorPct: f.armorPct, hpPct: f.hpPct,
    }) : null;
    if (b) {
      if (b.manaPct) ms.maxMana = Math.round(ms.maxMana * (1 + b.manaPct));
      if (b.hpPct) ms.maxHp = Math.round(ms.maxHp * (1 + b.hpPct));
      if (b.armorPct) ms.armorPct = (ms.armorPct || 0) + b.armorPct;
      if (b.moveSpeed) ms.moveSpeed = (ms.moveSpeed || 0) + b.moveSpeed;
      if (b.attackSpeed) ms.attackSpeed = (ms.attackSpeed || 0) + b.attackSpeed;
      if (b.dodge) ms.dodgeChance = (ms.dodgeChance || 0) + b.dodge;
      if (b.critChance) ms.critChance = (ms.critChance || 0) + b.critChance;
      if (b.manaRegen) ms.manaRegen = (ms.manaRegen || 0) + b.manaRegen;
      for (const [k, v] of Object.entries(b.resist || {})) if (`resist_${k}` in ms) ms[`resist_${k}`] += v;
      if (b.dmg && p.passiveMods) p.passiveMods.dmgMult = (p.passiveMods.dmgMult || 1) * (1 + b.dmg);
    }
    const pf = p.permForm && FORMS[p.permForm];
    if (pf) {
      const all = pf.perks.resistAll || 0;
      if (all) for (const k of Object.keys(ms)) if (/^resist_/.test(k)) ms[k] = ms[k] + Math.max(0.1 * all / 0.5, (ms[k] || 0) * all);
      for (const [k, v] of Object.entries(pf.perks.resist || {})) if (`resist_${k}` in ms) ms[`resist_${k}`] += v;
    }
  },

  /** A shifted form's confluence abilities hit harder (`confBoost`). */
  _formCastAbility(a, entry) {
    const p = this.player;
    const f = p && p.form && FORMS[p.form.id];
    if (!f || f.kind !== 'shift' || !entry || !(entry.slotIndex === 3 || entry.essenceId === 'confluence') || entry.formAbility) return a;
    const out = { ...a };
    for (const fld of ['base', 'healAmount', 'shieldAmount']) if (typeof out[fld] === 'number') out[fld] = Math.round(out[fld] * (1 + f.confBoost));
    return out;
  },

  // ------------------------------------------------------------------ permanent perks
  _formPerks() { const pf = this.player && this.player.permForm && FORMS[this.player.permForm]; return pf ? pf.perks : null; },
  _formOnKill() {
    const k = this._formPerks();
    const p = this.player;
    if (!k || !k.killMend || !p) return;
    const amt = p.maxHp * k.killMend.frac;
    this._formMend = { left: ((this._formMend && this._formMend.left) || 0) + amt, rate: amt / k.killMend.secs };
  },
  _formOnSwingHit(m, dmg) {
    const p = this.player;
    const k = this._formPerks();
    const f = p.form && FORMS[p.form.id];
    const ls = ((k && k.lifeSteal) || 0) + ((f && f.lifeSteal) || 0);
    if (ls > 0 && dmg > 0 && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + dmg * ls);
    // Avatar of the Edge: the next blow releases the spell bound to the weapon, on what it struck
    if (k && k.spellstrike && this._spellstrikeHeld && this._spellstrikeHeld.length && m && m.alive !== false) {
      const key = this._spellstrikeHeld.shift();
      const ax = p.aimAngle;
      if (m.wx != null) p.aimAngle = Math.atan2(m.wy - this.world.y, m.wx - this.world.x);
      this._spellstrikeRelease = true;
      try { this._castKnownAbility(key, { finishing: true }); } finally { this._spellstrikeRelease = false; p.aimAngle = ax; }
      this._floatText(m.wx || this.world.x, (m.wy || this.world.y) - 40, 'Spellstrike!', '#ce93d8');
    }
  },
  /** Below 1 health, a blow drains mana or stamina instead, until that runs out. Returns what reaches health. */
  _formDeathless(taken) {
    const k = this._formPerks();
    const p = this.player;
    if (!k || !k.deathless || !(taken > 0)) return taken;
    const room = Math.max(0, p.hp - 1);
    if (taken <= room) return taken;
    const over = taken - room;
    const pool = k.deathless === 'mana' ? 'mana' : 'stamina';
    const soak = Math.min(over, p[pool] || 0);
    p[pool] = (p[pool] || 0) - soak;
    if (soak > 0 && this._floatText) this._floatText(this.world.x, this.world.y - 50, `-${Math.round(soak)} ${pool}`, pool === 'mana' ? '#64b5f6' : '#9ccc65');
    return room + (over - soak);
  },
  /** Avatar of the Edge: an offensive spell cast directly is bound to the weapon instead. True = held. */
  _formSpellstrikeHold(key, entry, opts = {}) {
    const k = this._formPerks();
    if (!k || !k.spellstrike || this._spellstrikeRelease || !entry || !this._isOffensiveSpell || !this._isOffensiveSpell(entry.ability)) return false;
    const p = this.player;
    if ((p.abilityCdByKey && p.abilityCdByKey[key] > 0)) return false;   // let the ordinary path say it is cooling
    this._spellstrikeHeld = (this._spellstrikeHeld || []).filter(x => x !== key);
    this._spellstrikeHeld.push(key);
    if (this._spellstrikeHeld.length > 3) this._spellstrikeHeld.shift();
    this._floatText(this.world.x, this.world.y - 46, `${entry.ability.name} bound to your weapon`, '#ce93d8');
    return true;
  },
  _formCdMult(a) {
    const k = this._formPerks();
    return (k && k.spellstrike && this._isOffensiveSpell && this._isOffensiveSpell(a)) ? 0.5 : 1;
  },

  /** The Character page's line. */
  _formSheetHtml() {
    const p = this.player;
    const out = [];
    if (p.permForm && FORMS[p.permForm]) out.push(`<div class="row"><div>Transformed</div><div><b>${FORMS[p.permForm].name}</b> -- ${FORMS[p.permForm].lines.join(' ')}</div></div>`);
    if (p.form && FORMS[p.form.id]) out.push(`<div class="row"><div>Form</div><div><b>${FORMS[p.form.id].name}</b>, ${Math.max(0, Math.ceil(p.form.until - this._formClock()))}s left</div></div>`);
    return out.join('');
  },
};
