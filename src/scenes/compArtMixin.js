// ===========================================================================
// ROUND 406 -- COMPANIONS' MARTIAL ARTS, IN THE SCENE (data: src/data/compArts.js).
//
// State: player.compArts[memberId] = { art, master, how: 'known' | 'journey', learned, ranks: { [rankIdx]: { kills, trained } } },
// fixed the first time it is asked for (from the run's assigned masters). Read by:
//   `_partyDamage` / `_partyHaste` (WorldScene)   -- the art's damage, crits and speed on the companion
//   `_damagePartyMember`                           -- its dodge and damage reduction on the blows they take
//   the companion's swing                          -- a kill counted toward their mastery, health back on a kill or a hit
//   `_talkToCompanion`                             -- "Your martial art": what it is, how far they are in it, where the master is
//   `_talkToMaster`                                -- bring them to their master: a journey companion learns, a companion
//                                                     who knows it is trained (once a rank)
// ===========================================================================
import { compArtPlan, compMastery, compArtFx, compArtLine, COMP_TRAIN_KILLS, COMP_MASTER_NEAR } from '../data/compArts.js';
import { MARTIAL_BY_ID, artCard } from '../data/martialArts.js';
import { RANK_ORDER, RANK_LABELS } from '../data/ranks.js';
import { TILE } from '../data/iso.js';

const LIVE_S = 0.4;   // how often a companion's live context is re-read

export const CompArtMixin = {
  _compArtBook() { return this.player.compArts || (this.player.compArts = {}); },
  _compRankIdx(m) { return Math.max(1, Math.min(4, RANK_ORDER.indexOf(m.rank || 'iron'))); },

  /** The companion's art record, fixed on first ask (null until the run's masters stand). */
  _compArt(m) {
    if (!m || !m.id) return null;
    const book = this._compArtBook();
    if (book[m.id]) return book[m.id];
    const masters = (this.martialMasters || []).filter(o => o.assigned && o.art).map(o => ({ key: o.key, art: o.art }));
    const plan = compArtPlan(m.id, m.role, masters, this._masterSeed || 0);
    if (!plan) return null;
    book[m.id] = { ...plan, learned: plan.how === 'known', ranks: {} };
    return book[m.id];
  },
  _compArtRank(m, rec) {
    const k = String(this._compRankIdx(m));
    return rec.ranks[k] || (rec.ranks[k] = { kills: 0, trained: false });
  },
  _compMaster(rec) { return rec && this._masterByKey ? this._masterByKey(rec.master) : null; },

  /** The live effects (cached a moment): only once they have learned it. */
  _compArtLive(m) {
    const rec = this._compArt(m);
    if (!rec || !rec.learned) return null;
    const now = this.time ? this.time.now / 1000 : 0;
    if (m._artLive && now - m._artLiveAt < LIVE_S) return m._artLive;
    let foes = 0;
    for (const o of (this.monsters || [])) if (o && o.alive && Math.abs((o.wx ?? o.x) - m.x) < TILE * 8 && Math.abs((o.wy ?? o.y) - m.y) < TILE * 8) foes++;
    const hp = m.maxHp > 0 ? m.hp / m.maxHp : 1;
    const h = this._hourOfDay ? this._hourOfDay() : 12;
    const night = !(h >= 6 && h < 20);
    const ctx = { always: true, inCombat: foes > 0, calm: foes === 0, foes, crowd: foes >= 3, duel: foes === 1, hurt: hp < 0.5, hale: hp > 0.9,
      night, day: !night, armed: true, moving: !!m.moving, still: !m.moving, afterKill: (m._artKillAt || -99) > now - 6,
      afterHit: (m._artHitAt || -99) > now - 4, afterStrike: (m._artStrikeAt || -99) > now - 2, stamFull: (m.stamina || 0) >= (m.maxStamina || 1) * 0.9,
      buffed: !!(m.auraGrant && (m.auraGrant.expires || 0) >= (this.time ? this.time.now : 0)) };
    const r = this._compArtRank(m, rec);
    m._artLive = compArtFx(rec.art, ctx, this._compRankIdx(m), compMastery(r).bonus);
    m._artLiveAt = now;
    return m._artLive;
  },
  /** On the companion's blows: damage, weapon damage and crit (as its expected weight). */
  _compArtDmgMult(m) {
    const fx = this._compArtLive(m);
    if (!fx) return 1;
    return Math.max(0.5, 1 + (fx.damage || 0) + (fx.weaponDamage || 0) + (fx.crit || 0) * 0.5);
  },
  _compArtHaste(m) { const fx = this._compArtLive(m); return fx ? (fx.moveSpeed || 0) : 0; },
  /** On the blows they take: dodge, then damage reduction. Returns what is left. */
  _compArtTaken(m, dmg) {
    const fx = this._compArtLive(m);
    m._artHitAt = this.time ? this.time.now / 1000 : 0;
    if (!fx) return dmg;
    if (fx.dodge > 0 && Math.random() < Math.min(0.35, fx.dodge)) { this._floatText(m.x, m.y - 24, 'Dodge!', '#aed581'); return 0; }
    if (fx.guard) dmg = Math.max(1, Math.round(dmg * (1 - Math.max(-0.4, Math.min(0.4, fx.guard)))));   // an art's cost (less guard) counts too
    return dmg;
  },
  /** After a companion's blow: leech, and on a kill the count toward their mastery and any health back. */
  _compArtSwing(m, target, dealt) {
    const rec = this._compArt(m);
    if (!rec || !rec.learned) return;
    const fx = this._compArtLive(m) || {};
    const now = this.time ? this.time.now / 1000 : 0;
    m._artStrikeAt = now;
    let heal = (fx.leech || 0) * (dealt || 0);
    if (target && !target.alive) {
      const r = this._compArtRank(m, rec);
      const before = compMastery(r).step.id;
      r.kills = (r.kills || 0) + 1;
      m._artKillAt = now;
      heal += (fx.killMend || 0) * (m.maxHp || 0);
      const st = compMastery(r);
      if (st.step.id !== before) this._floatText(m.x, m.y - 56, `${m.name}: ${RANK_LABELS[m.rank] || ''} ${st.step.label} of ${MARTIAL_BY_ID[rec.art].name}`, '#b39ddb');
    }
    if (heal > 0 && m.hp > 0) m.hp = Math.min(m.maxHp, m.hp + heal);
  },
  /** Regeneration from the art, every frame (called from the party tick). */
  _compArtRegen(m, dt) {
    const fx = this._compArtLive(m);
    if (!fx || !(fx.vigor > 0) || !(m.hp > 0) || m.hp >= m.maxHp) return;
    m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.004 * fx.vigor * 10 * dt);
  },

  // ---------------------------------------------------------------- talk
  _compArtVars(m, rec) {
    const a = MARTIAL_BY_ID[rec.art];
    const e = this._compMaster(rec);
    return { name: m.name, art: a ? a.name : 'an art', master: e ? e.name : 'their old master', place: e ? e.place : 'a dojo far from here' };
  },
  /** The companion talk's button. */
  _compArtChoices(m) {
    const rec = this._compArt(m);
    return rec ? [{ label: 'Your martial art', act: `cart|about|${m.id}` }] : [];
  },
  _compArtAbout(m) {
    const rec = this._compArt(m);
    if (!rec) return;
    const a = MARTIAL_BY_ID[rec.art];
    const v = this._compArtVars(m, rec);
    const e = this._compMaster(rec);
    if (e && this._masterKnow) this._masterKnow(e);   // the master on your map
    const body = [];
    if (!rec.learned) body.push(`"${compArtLine(m.id, 'journey', v)}"`, '', `(${v.master} is marked on your map. Bring ${m.name} to them.)`, '', artCard(a));
    else {
      const r = this._compArtRank(m, rec);
      const st = compMastery(r);
      body.push(`"${compArtLine(m.id, rec.how === 'known' && !rec.wasJourney ? 'known' : 'learned', v)}"`, '', artCard(a, 1 + st.bonus),
        '', `${m.name} is a ${RANK_LABELS[m.rank] || ''} ${st.title} of ${a.name} (+${Math.round(st.bonus * 100)}%).`
          + (st.next ? ` ${st.kills}/${st.next.kills} defeats toward ${st.next.label}.` : ''),
        r.trained ? `Trained by ${v.master} at this rank.` : `${v.master}, at ${v.place}, can train them at this rank once they have ${COMP_TRAIN_KILLS} defeats here (marked on your map).`);
    }
    this._openDialogue(m.name, body.join('\n'), null);
  },

  /** Added to a master's talk: a companion of yours whose master this is. */
  _compArtMasterAdd(e, body, choices) {
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      const rec = this._compArt(m);
      if (!rec || rec.master !== e.key) continue;
      const a = MARTIAL_BY_ID[rec.art];
      const near = Math.hypot((m.x || 0) - e.x, (m.y || 0) - e.y) < COMP_MASTER_NEAR;
      if (!rec.learned) {
        body.push('', `${e.name} looks past you to ${m.name}. "You are the one who has been asking after ${a.name}."`);
        if (near) choices.push({ label: `Ask ${e.name} to teach ${m.name}`, act: `cart|learn|${m.id}` });
        else body.push(`(Bring ${m.name} closer.)`);
        continue;
      }
      const r = this._compArtRank(m, rec);
      if (r.trained) { body.push('', `"${m.name} has had all I can give at ${RANK_LABELS[m.rank]}."`); continue; }
      if ((r.kills || 0) < COMP_TRAIN_KILLS) { body.push('', `"${m.name}. Good. Come back when your hands have done more with it: ${r.kills || 0} of ${COMP_TRAIN_KILLS} at ${RANK_LABELS[m.rank]}."`); continue; }
      body.push('', `"${m.name}. You have kept it up. I can take you further at ${RANK_LABELS[m.rank]}."`);
      if (near) choices.push({ label: `Train ${m.name} (${RANK_LABELS[m.rank]})`, act: `cart|train|${m.id}` });
    }
  },

  _compArtAct(what, id) {
    const m = (this.party || []).find(x => x.id === id);
    if (!m) return false;
    if (what === 'about') { this._compArtAbout(m); return true; }
    const rec = this._compArt(m);
    const e = this._compMaster(rec);
    if (!rec || !e) return false;
    const a = MARTIAL_BY_ID[rec.art];
    if (what === 'learn' && !rec.learned) {
      rec.learned = true; rec.wasJourney = true;
      if (e.act) { e.act.mode = 'kata'; e.act.f = 0; e.act.ft = 0; }
      this._floatText(m.x, m.y - 50, `${m.name} learns ${a.name}`, '#b39ddb');
      this._openDialogue(m.name, `"${compArtLine(m.id, 'learned', this._compArtVars(m, rec))}"`, null);
      return true;
    }
    if (what === 'train' && rec.learned) {
      const r = this._compArtRank(m, rec);
      if (r.trained || (r.kills || 0) < COMP_TRAIN_KILLS) return false;
      r.trained = true; m._artLive = null;
      if (e.act) { e.act.mode = 'kata'; e.act.f = 0; e.act.ft = 0; }
      this._floatText(m.x, m.y - 50, `${m.name}: ${RANK_LABELS[m.rank]} Expert of ${a.name}`, '#b39ddb');
      return true;
    }
    return false;
  },
};
