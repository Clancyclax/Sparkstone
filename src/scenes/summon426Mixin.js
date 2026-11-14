// ============================================================================
// ROUND 426 -- THE SUMMONS: RANK, NUMBERS, COLOUR, THE FOUR RIDERS, THE QUEEN.
//
// The world side of src/data/summonRoster426.js.
//
//   _s426Remap(a)      a called creature as it should come at the ability's rank: the line's body (a toad at Iron, the
//                      hydra at Silver), its size, and its element's colour (the body's own row for that element, or the
//                      element's palette laid over it). `_spawnSummon` calls it after the body pass.
//   _s426SpawnHost(a)  a line that brings several bodies (the Four Riders, a pack of rats): each body called, each with
//                      its share of the blow. True when it has spawned them.
//   _s426After(rec, a) the record as it is made: the rider it is, the queen it is, the colour it keeps.
//   _s426RiderDmg / _s426RiderAfter   each rider's own blow (Reaping, Want, Plague, Slaughter).
//   _s426Tick(dt)      the queen lays grubs in a fight; a grub grows to a worker, then a soldier.
//   _s426Familiar(a)   a bonded or ritual being as it is at its rank (a Frog familiar becomes the toad, then the hydra).
//   _s426RitualRiders  the ritual Doom being: every rider out at this rank walks beside you; subsumed, all of them go in
//                      together and each lends its own power.
// ============================================================================
import {
  bodiesAtRank, elementOfWords, shadeForElement, elementMaterialKey, RIDERS, ridersAt, riderSubsumePowers,
  RIDER_NAME_RE, BROOD, lineOf, rankIdx, riderCardText, RANK_LINES, LINE_STARTS, bodyName,
} from '../data/summonRoster426.js';
import { MONSTER_ART } from '../data/monsters.js';

const isRiderFam = (f) => !!(f && RIDERS[f]);

export const Summon426Mixin = {
  /** The cast: the ability as called, with the rank it has reached. */
  _s426Tag(a, key) {
    if (!a || a._s426Rank) return a;
    let rank = 'iron';
    try { rank = (this._abilityRankFor && this._abilityRankFor(key)) || 'iron'; } catch (e) { /* iron */ }
    return { ...a, _s426Rank: rank === 'normal' ? 'iron' : rank, _s426Key: key };
  },

  /** ROUND 426 -- the card's line for how this summon ranks: the riders, a line's road, or that it grows. */
  _s426CardLine(a, rank) {
    if (!a) return '';
    if (a.ritual) {
      const f = (a.ritual.forms || []).find(x => RIDER_NAME_RE.test(`${x.name || ''} ${x.greaterName || ''}`));
      return f ? riderCardText(rank, { subsume: true }) : '';
    }
    if (a.template !== 'activeSummon' || a.oddSummon || (a.summonKind && a.summonKind !== 'creature')) return '';
    if (this._s426IsRider(a)) return riderCardText(rank);
    const fam = a.summonFamily;
    if (!fam || !MONSTER_ART[fam]) return '';
    const id = LINE_STARTS.has(fam) ? lineOf(fam) : null;
    const L = id ? RANK_LINES[id] : null;
    const now = bodiesAtRank(fam, rank);
    const what = now.bodies.length > 1 ? `${now.bodies.length} ${bodyName(now.bodies[0].family)}s` : bodyName(now.bodies[0].family);
    return L ? `It ranks up as ${L.say}; now it calls ${what}.` : `It grows larger with each rank.`;
  },

  /** Is this call Doom's rider? Its body, or the name it goes by. */
  _s426IsRider(a) {
    return !!a && (isRiderFam(a.summonFamily) || RIDER_NAME_RE.test(`${a.summonCreatureName || ''} ${a.name || ''}`));
  },

  /** The element a called thing is drawn in, or null. */
  _s426Element(a) {
    const el = (this._specElement ? this._specElement(a) : null) || a.element || '';
    return elementOfWords(el, a.drawEl || '');
  },

  /** Colour a body: keep a pinned row the body has; else its row for the element; else the element's palette. */
  _s426Colour(a, family) {
    const art = MONSTER_ART[family];
    if (!art || a.summonMaterial || a.oddSummon) return a;
    if (a.summonShade && (art.shades || []).includes(a.summonShade)) return a;
    const el = this._s426Element(a);
    if (!el) return a;
    const row = shadeForElement(family, el);
    if (row) return { ...a, summonShade: row };
    const mat = elementMaterialKey(el);
    return mat ? { ...a, summonMaterial: mat, _s426Mat: mat } : a;
  },

  _s426Remap(a) {
    if (!a || a._s426Done || a._s426Member) return a;
    if ((a.summonKind || 'creature') !== 'creature' || a.oddSummon || a.summonSheet) return a;
    const fam = a.summonFamily;
    if (!fam || !MONSTER_ART[fam]) return a;
    const rider = this._s426IsRider(a);
    const rank = a._s426Rank || null;
    let out = { ...a, _s426Done: true };
    if (rank || rider) {
      const B = bodiesAtRank(rider ? 'riderDeath' : fam, rank || 'iron', rider ? { line: 'riders' } : {});
      if (B.bodies.length > 1) return { ...out, _s426Host: B };
      const b = B.bodies[0];
      out.summonFamily = b.family;
      out._r393Scale = (a._r393Scale || 1) * (b.scale || 1);
      if (B.queen) out._s426Queen = B.queen;
      if (rider) out._s426Rider = b.family;
      if (B.line) out._s426Line = B.line;
    }
    if (out._s426Rider) { out.summonShade = (MONSTER_ART[out.summonFamily].shades || [])[0] || null; return out; }
    return this._s426Colour(out, out.summonFamily);
  },

  _s426SpawnHost(a) {
    const B = a && a._s426Host;
    if (!B || a._s426Member) return false;
    const n = B.bodies.length;
    B.bodies.forEach((b, i) => {
      let m = { ...a, _s426Host: null, _s426Member: i + 1, _flockMember: i + 1, _flockN: n, summonFamily: b.family,
        _r393Scale: (a._r393Scale || 1) * (b.scale || 1), _s426Each: B.dmgEach };
      // a rider keeps its own drawn colour (the pale, the sable, the blighted, the crimson): the four are told apart by it
      if (isRiderFam(b.family)) { m._s426Rider = b.family; m.summonShade = (MONSTER_ART[b.family].shades || [])[0] || null; m.summonMaterial = null; m.name = RIDERS[b.family].name; }
      else m = this._s426Colour(m, b.family);
      this._spawnSummon(m);
    });
    return true;
  },

  /** The record as it is made. */
  _s426After(rec, a) {
    if (!rec || !a) return;
    if (a._s426Rider) rec.s426Rider = a._s426Rider;
    if (a._s426Queen) {
      rec.s426Queen = a._s426Queen; rec.s426LayT = 2;
      // her brood's three bodies are fetched as she arrives, so the first grub is not a dot
      for (const f of (BROOD[a._s426Queen] || [])) if (this._ensureFamilyArt) { try { this._ensureFamilyArt(f); } catch (e) { /* art only */ } }
    }
    if (a._s426Brood) rec.s426Brood = a._s426Brood;
    if (a._s426Mat) { rec.material = a._s426Mat; rec.s426Mat = a._s426Mat; if (rec.art) rec.shade = 0; }
    if (a._s426Each > 0 && a._s426Each < 1) rec.dmg = Math.max(1, Math.round(rec.dmg * a._s426Each));
  },

  // ---- the riders' blows ------------------------------------------------------------------------------------------
  _s426WarRides() {
    return (this._summons || []).some(s => s.s426Rider === 'riderWar' && s.hp > 0)
      || (this._familiars || []).some(f => f.a && f.a.s426Rider === 'riderWar');
  },
  /** The blow before it lands. */
  _s426RiderDmg(rider, m, dmg) {
    const R = RIDERS[rider];
    if (!R || !m) return dmg;
    let d = dmg;
    if (R.reapBelow && m.maxHp > 0 && m.hp / m.maxHp < R.reapBelow) d = Math.round(d * R.reapMult);
    if (rider !== 'riderWar' && this._s426WarRides()) d = Math.round(d * (1 + RIDERS.riderWar.rally));
    return d;
  },
  _s426Debuff(m, spec) {
    if (!spec || !m || !m.alive || !this._applyDebuff) return;
    try { this._applyDebuff(m, spec.key, { duration: spec.duration, potency: 1, stacks: 1, fromPlayer: true, source: this.player }); } catch (e) { /* the blow stands */ }
  },
  /** What the blow leaves. `body` is the summon record or the familiar (for Famine's feeding). */
  _s426RiderAfter(rider, m, dealt, body) {
    const R = RIDERS[rider];
    if (!R || !m) return;
    this._s426Debuff(m, R.debuff);
    if (R.debuff2) this._s426Debuff(m, R.debuff2);
    if (R.feed && body && body.maxHp > 0) body.hp = Math.min(body.maxHp, (body.hp || 0) + Math.max(1, Math.round(dealt * R.feed)));
    if (R.spread || R.cleave) {
      for (const o of (this.monsters || [])) {
        if (!o.alive || o === m) continue;
        const d = Math.hypot(o.wx - m.wx, o.wy - m.wy);
        if (R.spread && d <= R.spread) this._s426Debuff(o, R.debuff);
        if (R.cleave && d <= R.cleaveR && this._damageMonster) this._damageMonster(o, Math.max(1, Math.round(dealt * R.cleave)), true, false, null);
      }
    }
  },

  // ---- the queen and her brood ------------------------------------------------------------------------------------
  _s426Tick(dt) {
    // A familiar built before its body's sheet arrived is an orb; once the sheet is here, rebuild (once a second at most).
    this._s426FamT = (this._s426FamT || 0) - dt;
    if (this._s426FamT <= 0) {
      this._s426FamT = 1;
      const waiting = (this._familiars || []).some(f => !f.family && f.a && f.a.familiarFamily && MONSTER_ART[f.a.familiarFamily]
        && MONSTER_ART[f.a.familiarFamily].lazy && this._familyArtReady && this._familyArtReady(f.a.familiarFamily));
      if (waiting && this._rebuildFamiliars) { try { this._rebuildFamiliars(); } catch (e) { /* next second */ } }
    }
    const all = this._summons || [];
    if (!all.length) return;
    for (const q of all.slice()) {
      if (q.s426Queen && q.hp > 0) {
        const fight = (this.monsters || []).some(m => m.alive && Math.hypot(m.wx - q.wx, m.wy - q.wy) < 320);
        q.s426LayT = (q.s426LayT || 0) - dt;
        const brood = all.filter(s => s.s426Brood && s.s426Brood.queen === q && s.hp > 0).length;
        if (fight && q.s426LayT <= 0 && brood < BROOD.maxBrood) {
          q.s426LayT = BROOD.layEveryS;
          this._s426Lay(q);
        }
      }
      const b = q.s426Brood;
      if (b && q.hp > 0) {
        if (!all.includes(b.queen) || !(b.queen.hp > 0)) { q.t = Math.min(q.t, 0.01); continue; }   // her brood goes with her
        b.t += dt;
        const forms = BROOD[b.kind];
        if (b.stage < forms.length - 1 && b.t >= BROOD.growS[b.stage]) {
          b.t = 0; b.stage++;
          const fam = forms[b.stage];
          if (MONSTER_ART[fam]) {
            if (this._ensureFamilyArt) { try { this._ensureFamilyArt(fam); } catch (e) { /* art only */ } }
            const art = MONSTER_ART[fam];
            if (this.textures.exists(this._monsterTexture(fam, 'idle'))) {
              q.family = fam; q.art = art;
              q.shade = q.material ? 0 : Math.min(q.shade || 0, (art.shades || [1]).length - 1);
              if (q.sprite && q.sprite.setScale) q.sprite.setScale(art.displayScale * 0.8 * (b.scale || 1));
            } else { q.wantFamily = fam; q.wantScale = b.scale || 1; }
            q.dmg = Math.max(1, Math.round(b.queenDmg * BROOD.dmgShare[b.stage]));
            q.maxHp = Math.max(q.maxHp, Math.round(b.queenHp * (0.3 + 0.2 * b.stage))); q.hp = Math.min(q.maxHp, q.hp + q.maxHp * 0.3);
            if (this._floatText) this._floatText(q.wx, q.wy - 30, b.stage === 1 ? 'grows into a worker' : 'becomes a soldier', '#ffcc80');
          }
        }
      }
    }
  },
  _s426Lay(q) {
    const kind = q.s426Queen;
    const forms = BROOD[kind];
    if (!forms) return;
    const base = {
      name: kind === 'ant' ? 'Ant Grub' : 'Termite Grub', template: 'activeSummon', summonKind: 'creature', summonFamily: forms[0],
      summonDmg: Math.max(1, Math.round(q.dmg * BROOD.dmgShare[0])), summonDuration: BROOD.lifeS, summonTemporary: true,
      summonMoves: true, color: q.color, summonRange: 46, summonInterval: 1.1, _s426Done: true, _s426Member: 1,
      _s426Brood: { kind, stage: 0, t: 0, queen: q, queenDmg: q.dmg, queenHp: q.maxHp || 30, scale: 0.9 },
      _r393Scale: 0.9, _at: { x: q.wx + (Math.random() - 0.5) * 30, y: q.wy + (Math.random() - 0.5) * 30 },
      summonMaterial: q.material || null, _s426Mat: q.s426Mat || null,
    };
    const rec = this._spawnSummon(base);
    if (rec) { rec.maxHp = Math.max(1, Math.round((q.maxHp || 30) * 0.3)); rec.hp = rec.maxHp; }
  },

  // ---- bonded and ritual beings -----------------------------------------------------------------------------------
  /** A familiar entry at its ability's rank: its line's body and size, its element's colour. */
  _s426Familiar(a) {
    if (!a || !a.familiarFamily || !MONSTER_ART[a.familiarFamily] || a._s426Done || a.wildBond) return a;
    const key = a.abilityKey || a.key;
    const known = this.player && this.player.knownAbilities;
    let out = { ...a, _s426Done: true };
    if (key && known && known[key] && !a.s426Rider) {
      let rank = 'iron';
      try { rank = this._abilityRankFor(key) || 'iron'; } catch (e) { /* iron */ }
      // a ritual form that already has its own greater shape keeps the rite's own road
      const line = lineOf(a.familiarFamily);
      if (line && !(a.ritualSummon && a._greaterOwn)) {
        const B = bodiesAtRank(a.familiarFamily, rank);
        if (B.bodies.length === 1 && B.bodies[0].family !== a.familiarFamily) out.familiarFamily = B.bodies[0].family;
        out.s426Scale = B.bodies[0].scale || 1;
      } else {
        out.s426Scale = [1, 1.1, 1.2, 1.32][rankIdx(rank)];
      }
    }
    const art = MONSTER_ART[out.familiarFamily];
    if (art && !(out.summonShade && (art.shades || []).includes(out.summonShade))) {
      const el = elementOfWords(out.element || '');
      const row = el ? shadeForElement(out.familiarFamily, el) : null;
      if (row) out.summonShade = row;
      else if (el && elementMaterialKey(el)) out.summonMaterial = elementMaterialKey(el);
    }
    return out;
  },

  /** The ritual Doom being, present: every rider out at this rank, each a familiar beside you. True when it handled it. */
  _s426RitualRiders(a, key, mods, form, stats, rank) {
    if (!form || !RIDER_NAME_RE.test(`${form.name || ''} ${form.shownName || ''}`)) return false;
    const riders = ridersAt(rank);
    const each = riders.length > 1 ? 0.6 : 1;
    const fam = mods.familiars || (mods.familiars = []);
    riders.forEach((r, i) => {
      fam.push({
        name: RIDERS[r].name, key: `${key}|ritual|${r}`, abilityKey: key, template: 'summonBonded', kind: 'passive',
        bondKind: 'ritual', ritualSummon: true, role: form.role, color: RIDERS[r].color, element: a.element || null,
        essenceId: null, ritualEssenceId: a.essenceId || null, familiarFamily: r, familiarCreatureName: RIDERS[r].name,
        familiarDmg: Math.max(1, Math.round(stats.familiarDmg * each)), familiarInterval: stats.familiarInterval,
        familiarRange: stats.familiarRange, s426Rider: r, _s426Done: true, s426Scale: [1, 1.04, 1.08, 1.12][rankIdx(rank)],
        _riderIdx: i,
      });
    });
    return true;
  },
  /** Subsumed: all the riders go in together, each lending its own power. */
  _s426RiderPowers(form, rank) {
    if (!form || !RIDER_NAME_RE.test(`${form.name || ''} ${form.shownName || ''}`)) return [];
    return riderSubsumePowers(rank);
  },
};
