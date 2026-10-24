// ============================================================================
// ROUND 361 (item 6) -- NATURES AND NATURE GIFT EVOLUTIONS, in the scene.
// The rules and the tables are in src/data/natures.js; this is where they meet play.
//
//   _natureApplyMods(mods)       a nature's standing effects, into passiveMods (resist, attributes, speed, weapon damage)
//   _natureEffect(a, essenceId)  { k, cd }: an ability's effect multiplier and cooldown cut (read by _scaledAbility)
//   _natureIncoming(dmg)         a blow, after the nature's guard
//   _natureLootAmount / _natureExtraLoot   Celestial Bounty, for whoever in the party has it
//   _natureTick(dt)              stress: near death in a fight, or the soul running dry; a banked reward waiting
//   _natureStress(kind)          one roll for an evolution
//   _natureQuestReward(source)   "or as a quest reward for massive achievements": evolve now, or bank it
//   _natureEvolve(evo, how)      record it, rebuild the stats, and say so (once, quietly: they are secretive)
//   _natureListHtml()            the Character page's six, with what each has become
//   companions: _partyNatureOf, _partyNatureFx, _partyNatureScale, _partyNaturePick, _partyNatureStats, _partyNatureHtml
//   ROUND 386 -- companions evolve: _partyEvoCatalogue, _partyNatureStress(m) (from _damagePartyMember),
//   _partyNatureStory(id) (from _natureAchieve), _partyEvolve(m, how). Companion state, saved with the party:
//   `natureEvo` { ref: { entry, catalystId, how } }, `natureEvoBanked`, `natureStoryHad` { momentId: true }.
//
// Player state: `natureEvolutions` { '<nature>.<ability>': [evolution ids] }, `natureStress` (survived, total),
// `natureStressSince` (since the last evolution), `natureBanked` (rewards waiting for an eligible evolution).
// ============================================================================
import {
  NATURES, PLAYER_NATURE, natureFxOf, resolveEvolutions, natureTagsOf, natureAbilityMult, RESIST_FOLD, RESIST_STATS,
  rollStressEvolution, eligibleEvolutions, natureAbility, essenceGiftEvolution, NATURE_STRESS,
  PARTY_CATALOGUE_URL, PARTY_EVO_NATURES, PARTY_STRESS, partyEvoCandidates, pickPartyEvo, partyEvolution,   // ROUND 386
} from '../data/natures.js';
import { abilityRoles } from '../data/buildClasses.js';
import { PARTY_BY_ID } from '../data/party.js';   // ROUND 386
import { COMBAT_TYPES } from '../data/combatTypes.js';   // ROUND 384
import { natureReadsOf, READ_FIELDS } from '../data/combatReads.js';   // ROUND 385
import { attackKindOf, blessingFavours } from '../data/outworlder.js';
import { abilityDeals } from '../data/awakening.js';
import { ESSENCE_CATALOG } from '../data/essenceCatalog.js';
import { SCALED_FIELDS, SCALED_NESTED } from '../data/essenceRank.js';
import { RANK_ORDER } from '../data/ranks.js';
import { pickSpellFx } from '../data/spellFx.js';
import { setAffinityCatalog, natureAbilitiesFor, affinityShift, NATURE_ACHIEVEMENTS, NATURE_STORY_MOMENTS, NATURE_STORY_STAGES, breathElementFor, breathPlan, CATALOGUE_URL, CATALOGUE_SPECS_URL, specKeyOf, catalogueCandidates, catalogueEntryFor, catalogueEvolution } from '../data/natures.js';

/** The companion's roster definition, or the live member when it has none (an adventurer). */
const PARTY_BY_ID_SAFE = (scene, m) => (m && PARTY_BY_ID[m.id]) || m;
const essOf = (id) => (id && ESSENCE_CATALOG[id]) ? { id, ...ESSENCE_CATALOG[id] } : (id ? { id } : null);

/** ROUND 366 -- what Unstoppable refuses: the conditions that impair movement. */
const UNIMPEDED_KEYS = new Set(['slowMove', 'pinned', 'root', 'rooted', 'snare', 'snared', 'entangle', 'webbed', 'grabbed', 'knockdown']);

setAffinityCatalog(ESSENCE_CATALOG);   // ROUND 368 -- the Silver affinity shift reads essence families

export const NatureMixin = {
  // ---------------------------------------------------------------- the player
  _natureId() { return PLAYER_NATURE; },

  _natureHave() {
    const p = this.player;
    if (!p.natureEvolutions || typeof p.natureEvolutions !== 'object') p.natureEvolutions = {};
    return p.natureEvolutions;
  },

  /** Every essence ability has awakened: all four essences, every stone set, every ability locked. */
  _natureKitComplete() {
    const p = this.player;
    if (!p || !this._allStonesIn || !this._allStonesIn()) return false;
    const keys = Object.keys(p.knownAbilities || {});
    return keys.length > 0 && keys.every(k => p.abilityLocked && p.abilityLocked[k]);
  },

  _natureState() {
    const p = this.player;
    const self = this;
    const essences = (p.slotEssence || []).filter(Boolean);
    return {
      natureId: this._natureId(),
      blessing: p.astralBlessing || null,
      kitComplete: this._natureKitComplete(),
      essences,
      families: essences.map(id => (ESSENCE_CATALOG[id] || {}).family).filter(Boolean),
      have: this._natureHave(),
      // ROUND 365 -- the catalogue's catalysts (the essences by name, and the confluence) and what it can wake
      essenceNames: Object.fromEntries(essences.map(id => [id, (ESSENCE_CATALOG[id] || {}).name || id])),
      confluence: (p.confluence && p.confluence.name) || null,
      // ROUND 388 -- the soul scars carried (the Olb sacrifice's `destruction` wakes SCAR_SENSE_EVOS), and which of
      // the two it would be: a perception only when the kit's held-off extra is a perception and no aura is held off
      scars: (p.soulScars || []).map(s => s && s.source).filter(Boolean),
      senseWant: this._senseWant ? this._senseWant() : 'aura',
      get extra() { return self._natureCatalogueCandidates(this); },
    };
  },

  /** The catalogue (public/data/nature_evolutions.json), fetched once in the background; null until it lands. */
  _natureCatalogue() {
    if (this._natureCat !== undefined) return this._natureCat;
    this._natureCat = null;
    if (typeof fetch === 'function') {
      // ROUND 366 -- and the specs: what each entry DOES (evoMixin runs them)
      fetch(CATALOGUE_SPECS_URL).then(r => (r.ok ? r.json() : null)).then(j => { this._natureSpecs = (j && j.specs) || null; })
        .catch(() => { console.warn('[natures] the evolution specs did not load; evolutions use their tag bonuses'); });
      fetch(CATALOGUE_URL).then(r => (r.ok ? r.json() : null)).then(j => { this._natureCat = j || null; })
        .catch(() => { console.warn('[natures] the evolution catalogue did not load; evolutions use round 361\'s names'); });
    }
    return this._natureCat;
  },
  _natureCatalogueCandidates(st) {
    const cat = this._natureCatalogue();
    return cat ? catalogueCandidates(st, cat, this._shopSeed ? this._shopSeed() : 0, this._natureSpecs || null) : [];
  },

  /** Child of the Celestial Wind: "Your celestine nature powers have increased effect." */
  _natureAmp() {
    const known = (this._liveKnown ? this._liveKnown() : this.player.knownAbilities) || {};
    return Object.values(known).some(e => e && e.ability && e.ability.natureAmp) ? 1.25 : 1;
  },

  _natureFx() {
    const p = this.player;
    const stamp = `${p.natureStamp || 0}|${p.astralBlessing || ''}`;
    if (this._natureFxCache && this._natureFxCache.stamp === stamp) return this._natureFxCache.fx;
    const fx = natureFxOf(this._natureId(), resolveEvolutions(this._natureHave(), ESSENCE_CATALOG, this.player.natureEvoRec), this._natureAmp());
    this._natureFxCache = { stamp, fx };
    return fx;
  },

  _natureApplyMods(mods) {
    if (!mods) return;
    this._natureFxCache = null;   // the kit may have gained or lost the amplifier
    const fx = this._natureFx();
    for (const [el, v] of Object.entries(fx.resist || {})) {
      const k = RESIST_FOLD[el] || el;
      if (v > 0) mods.resistBonus[k] = (mods.resistBonus[k] || 0) + v;
      // ROUND 384 -- every one of the 28 is resisted by its own stat now, so "ice resistance" also answers ice itself
      // (the fold into frost is kept: what the nature granted before, it still grants).
      if (v > 0 && k !== el && COMBAT_TYPES.includes(el)) mods.resistBonus[el] = (mods.resistBonus[el] || 0) + v;
    }
    for (const [a, v] of Object.entries(fx.attr || {})) {
      if (mods.attrBonus[a] !== undefined && v) { mods.attrBonus[a] += v; mods.attrCapBonus[a] = (mods.attrCapBonus[a] || 0) + v; }
    }
    if (fx.move) mods.moveSpeedPct += fx.move;
    if (fx.oneHandTwoHanders) mods.oneHandTwoHanders = true;
    if (fx.meleePerEssence) mods.weaponDmgPct += fx.meleePerEssence * (this.player.slotEssence || []).filter(Boolean).length;
    // ROUND 365 -- a catalogue evolution's "tracking" or "perception": the aura sense and pickup reach, the way round
    // 282's perceptionBoost widens them (that block has already run by the time natures are applied)
    if (fx.perception > 0) {
      const k = 1 + fx.perception;
      mods.auraSenseBonus = ((mods.auraSenseBonus || 0) + 1) * k - 1;
      mods.pickupRadiusMult = (mods.pickupRadiusMult || 1) * k;
    }
    // ROUND 385 -- a nature gift evolution that reads a creature (its hide, resistances or weaknesses), as its own
    // words promise: the family gifts carry the read in their fx, the catalogue entries are listed in combatReads.js.
    // A "study" entry reads a family only after enough kills of it (`readStudy`, consulted by the target frame).
    {
      const nr = natureReadsOf(resolveEvolutions(this._natureHave(), ESSENCE_CATALOG, this.player.natureEvoRec));
      for (const f of READ_FIELDS) if (fx[f] || nr.always[f]) mods[f] = true;
      mods.readStudy = nr.study;
      mods.readStudyAoe = nr.aoe;   // ROUND 386 -- Burning Library: what a studied family reveals (null without it)
    }
    mods.natureGuard = fx.guard || 0;
    mods.natureFind = fx.findMult || 0;
    mods.natureLoot = fx.loot || 0;
    // ===== ROUND 366 -- the ten nature fixes, at their doors.
    // Mystic Bloodline: mana returns faster (a factor on the regen stat). Grace: harder to hit (the dodge stat).
    mods.minorMult = mods.minorMult || {};
    mods.minorBonus = mods.minorBonus || {};
    if (fx.manaRegen) mods.minorMult.manaRegen = (mods.minorMult.manaRegen || 0) + fx.manaRegen;
    if (fx.dodge) mods.minorBonus.dodgeChance = (mods.minorBonus.dodgeChance || 0) + fx.dodge;
    // Gourmet & Gourmand / Iron Stomach: the potion wait, under the same cap every other source shares
    if (fx.potionCdCut) mods.potionCdPct = Math.min(0.6, (mods.potionCdPct || 0) + fx.potionCdCut);
    mods.natureFood = fx.extraFood || 0;
    // Wing Raider: a heavy conjured weapon costs what a light one does
    mods.conjuredLight = !!fx.conjuredLight;
    // Unstoppable: slows, roots and pins do not take hold (read at _natureAfflict)
    mods.moveUnimpeded = !!fx.moveUnimpeded;
    // Face in the Crowd / Many Faces: noticed from closer (read at _playerAggroMult)
    mods.natureHidden = Math.min(0.5, fx.auraHidden || 0);
    // Dragon Blood: the attributes stand only while the mana to feed them does
    if (fx.manaUpkeep && this._dragonStarved) {
      for (const a of ['power', 'spirit']) {
        const v = (fx.attr || {})[a] || 0;
        if (v && mods.attrBonus[a] !== undefined) { mods.attrBonus[a] -= v; mods.attrCapBonus[a] = (mods.attrCapBonus[a] || 0) - v; }
      }
    }
    // ROUND 366 -- an evolution spec's pickup reach (ROUND 388 -- a flavour extra only: no spec is this alone)
    const reach = this._evoPassive ? (this._evoPassive('pickupRadius') || 0) : 0;
    if (reach > 0) mods.pickupRadiusMult = (mods.pickupRadiusMult || 1) * (1 + Math.min(1, reach));
  },

  // ===================================================================== ROUND 366 -- the ten nature fixes' doors
  /** Gourmet & Gourmand: one more magical food effect held -- a dish's buffs are a quarter stronger and half again as long. */
  _natureFoodK() {
    const n = ((this.player && this.player.passiveMods) || {}).natureFood || 0;
    return { amt: 1 + 0.25 * n, t: 1 + 0.5 * n };
  },
  /** Magic Affinity: the chance a dispel removes one more effect. `e` the caster (the player when omitted). */
  _natureDispelExtra(e = null) {
    const fx = e ? this._natureFxFor(e) : this._natureFx();
    return Math.min(0.6, (fx && fx.dispelExtra) || 0);
  },
  /** The Price of Power: a blow from someone carrying it may lay the curse (12 seconds) on what it struck. */
  _naturePriceMark(src, m) {
    if (!m || !m.alive || m.person) return false;
    const fx = this._natureFxFor(src === this.player ? this.player : src);
    if (!fx || !fx.priceOfPower) return false;
    if (Math.random() >= 0.3) return false;
    const fresh = !(m._priced && m._priced.until > this.time.now);
    m._priced = { until: this.time.now + 12000, byPlayer: src === this.player, rank: src === this.player ? (this._evoMyRank ? this._evoMyRank() : 1) : Math.max(0, RANK_ORDER.indexOf((src && src.rank) || 'iron')) };
    if (fresh && this._floatText) this._floatText(m.wx, m.wy - 44, 'The Price of Power', '#ce93d8');
    return true;
  },
  /** ...and the curse's toll, each time the cursed one attacks: disruptive force, a share of its own health. */
  _naturePriceToll(m) {
    const pr = m && m._priced;
    if (!pr || !(pr.until > this.time.now) || !m.alive) return 0;
    const mr = this._monsterRankIndex ? this._monsterRankIndex(m) : 1;
    const frac = Math.max(0.01, Math.min(0.12, 0.04 * Math.pow(1.6, (pr.rank || 1) - mr)));
    const dmg = Math.max(1, Math.round((m.maxHp || 20) * frac));
    this._damageMonster(m, dmg, !!pr.byPlayer, false, 'disruptive');
    return dmg;
  },
  /** Dragon Blood: a moderate cost in mana every second. Starved at an empty pool, fed again at a tenth. */
  _natureDragonUpkeep(dt) {
    const p = this.player;
    const fx = this._natureFx();
    if (!fx.manaUpkeep || !(dt > 0) || !(p.maxMana > 0)) { if (this._dragonStarved) { this._dragonStarved = false; this._natureStatsDirty(); } return; }
    p.mana = Math.max(0, (p.mana || 0) - p.maxMana * 0.004 * fx.manaUpkeep * dt);
    if (!this._dragonStarved && p.mana < 1) { this._dragonStarved = true; this._natureStatsDirty(); if (this._floatText) this._floatText(this.world.x, this.world.y - 60, 'Dragon Blood starves', '#ef9a9a'); }
    else if (this._dragonStarved && p.mana > p.maxMana * 0.1) { this._dragonStarved = false; this._natureStatsDirty(); }
  },
  _natureStatsDirty() { if (this._recomputeDerivedStats) { try { this._recomputeDerivedStats(); } catch (e) { /* the next rebuild has it */ } } },

  /** The effect multiplier and cooldown cut for one of the player's abilities. */
  _natureEffect(a, essenceId) {
    if (!a) return { k: 1, cd: 0 };
    const fx = this._natureFx();
    if (!fx.effect && !fx.dmg && !fx.cdCut) return { k: 1, cd: 0 };
    const p = this.player;
    const roles = abilityRoles(a, abilityDeals);
    const fav = !!p.astralBlessing && blessingFavours(p.astralBlessing, a, abilityDeals);
    const tags = natureTagsOf(a, roles, essOf(essenceId), attackKindOf(a, abilityDeals), fav);
    return natureAbilityMult(fx, tags);
  },

  _natureIncoming(dmg) {
    const g = ((this.player.passiveMods || {}).natureGuard) || 0;
    return g > 0 && dmg > 0 ? Math.max(1, Math.round(dmg * (1 - Math.min(0.3, g)))) : dmg;
  },

  /** Celestial Bounty, for the player or anyone walking with them who has it. */
  _natureLootFrac() {
    let f = ((this.player.passiveMods || {}).natureLoot) || 0;
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      if (!m || m.benched) continue;
      f += this._partyNatureFx(m).loot || 0;
    }
    return f;
  },
  _natureLootAmount(amount) {
    const f = this._natureLootFrac();
    if (!(f > 0) || !(amount > 0)) return amount;
    const x = amount * (1 + f);
    return Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
  },
  _natureExtraLoot() {
    const f = this._natureLootFrac();
    return f > 0 && Math.random() < f;
  },

  // ---------------------------------------------------------------- evolution
  _natureTick(dt) {
    const p = this.player;
    if (!p || !(dt > 0)) return;
    if (this._natureCat === undefined) this._natureCatalogue();   // ROUND 365 -- fetch the catalogue in the background
    this._natureStressCd = Math.max(0, (this._natureStressCd || 0) - dt);
    // a banked reward wakes the moment something can evolve
    this._natureBankT = (this._natureBankT || 0) + dt;
    if (p.natureBanked > 0 && this._natureBankT > 5) {
      this._natureBankT = 0;
      const e = eligibleEvolutions(this._natureState())[0];
      if (e) { p.natureBanked--; this._natureEvolve(e, 'reward'); }
    }
    this._natureBrinkTick(dt);   // ROUND 362 -- survived at one health against something stronger
    this._natureDragonUpkeep(dt);   // ROUND 366 -- Dragon Blood's mana every second
    if (this._natureStressCd > 0) return;
    const hpLow = p.maxHp > 0 && p.hp > 0 && p.hp / p.maxHp < NATURE_STRESS.hpBelow && this._fightingNow && this._fightingNow();
    const max = this._soulMax ? this._soulMax() : 0;
    const soulLow = this._soulHold == null && max > 0 && Number.isFinite(p.soul) && p.soul / max < NATURE_STRESS.soulBelow;
    if (hpLow || soulLow) this._natureStress(hpLow ? 'near death' : 'soul run dry');
  },

  _natureStress(kind, rng = Math.random) {
    const p = this.player;
    this._natureStressCd = NATURE_STRESS.gapS;
    p.natureStress = (p.natureStress || 0) + 1;
    p.natureStressSince = (p.natureStressSince || 0) + 1;
    const e = rollStressEvolution(this._natureState(), rng, p.natureStressSince);
    if (e) this._natureEvolve(e, kind);
    return e || null;
  },

  /** A quest reward for a massive achievement. Evolves the next eligible ability, or waits until one is. */
  _natureQuestReward(source = 'reward') {
    const p = this.player;
    const e = eligibleEvolutions(this._natureState())[0];
    if (e) { this._natureEvolve(e, source); return e; }
    p.natureBanked = (p.natureBanked || 0) + 1;
    return null;
  },

  _natureEvolve(evo, how = 'stress', why = '') {   // ROUND 389 -- `why`: the reward text's reason (Olb's gift)
    const p = this.player;
    const have = this._natureHave();
    // ROUND 365 -- the catalogue dresses the blessing's first evolution (its name and words, catalyst-shaped), and a
    // catalogue evolution is recorded on the character so it resolves without the catalogue
    const cat = this._natureCatalogue();
    if (cat && evo.of === 'outworlder.blessing' && evo.tier === 1 && !evo.catalogue && evo.when && evo.when.blessing) {
      const hit = catalogueEntryFor(cat, `outworlder.blessing@${evo.when.blessing}`, this._natureState(), this._shopSeed ? this._shopSeed() : 0);
      if (hit) {
        const bref = `outworlder.blessing@${evo.when.blessing}`;
        const spec = this._natureSpecs ? this._natureSpecs[specKeyOf(bref, hit.entry.catalyst)] || null : null;
        const dressed = catalogueEvolution(bref, hit.entry, hit.catalystId, 1, evo.fx, spec);
        evo = { ...dressed, id: evo.id, of: evo.of };
      }
    }
    if (evo.catalogue) { p.natureEvoRec = p.natureEvoRec || {}; p.natureEvoRec[evo.id] = { ...evo }; }
    (have[evo.of] = have[evo.of] || []).push(evo.id);
    p.natureStressSince = 0;
    p.natureStamp = (p.natureStamp || 0) + 1;
    this._natureFxCache = null;
    this._scaledAbilityCache = null;
    // ROUND 388 -- an evolution that lifts the aura or perception cap rebuilds the kit at once, so an aura held off
    // over the old cap is switched back on (senseCapMixin) and the next stone may awaken one on another essence
    if (evo.fx && (evo.fx.multiAura || evo.fx.multiPerception) && this._rebuildAbilities) {
      try { this._rebuildAbilities(); } catch (e) { console.warn('[natures] kit rebuild after', evo.id, e && e.message); }
    }
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    const base = natureAbility(evo.of);
    const lead = how === 'near death' ? 'At the edge of it, something in you answers.'
      : how === 'soul run dry' ? 'With nothing left to hold, something in you holds anyway.'
        : 'What you did is written into you now.';
    if (this._announce) {
      this._announce([{
        title: evo.tier >= 2 ? 'Nature Gift Evolution — Again' : 'Nature Gift Evolution',
        lines: [lead, `${base ? base.name : 'Your nature'} has become ${evo.name}.`, evo.line, ...(why ? [why] : [])],
      }]);
    }
    return evo;
  },

  _natureListHtml() {
    const N = NATURES[this._natureId()];
    const have = this._natureHave();
    const evos = resolveEvolutions(have, ESSENCE_CATALOG, this.player.natureEvoRec);
    return N.abilities.map(a => {
      const mine = evos.filter(e => e.of === `${N.id}.${a.id}`).sort((x, y) => x.tier - y.tier);
      const top = mine[mine.length - 1];
      // ROUND 388 -- a side track on this ability (the soul scar's, `outworlder.blessing@scar`), shown under it
      const side = evos.filter(e => String(e.of).startsWith(`${N.id}.${a.id}@`) && !e.catalogue && e.lines)
        .map(e => `<br><b class="nature-evo">${e.name}</b> — <i style="opacity:.75;">${e.transfigured || ''}</i><br>${e.lines.join('<br>')}`).join('');
      if (!top) return `<li><b>${a.name}</b> — ${a.line}${side}</li>`;
      // ROUND 365 -- a catalogue evolution shows the whole ability block, as the user wrote it
      const body = top.lines ? `<i style="opacity:.75;">${top.transfigured || ''}</i><br>${top.lines.join('<br>')}` : top.line;
      // ROUND 366 -- an evolution with something to use goes on the N key; the button says which is on it
      const usable = top.spec && (top.spec.rules || []).some(r => r.on === 'use');
      const act = usable && this._evoActive ? this._evoActive() : null;
      const btn = usable ? (act && act.id === top.id ? ' <span class="nature-key">[on N]</span>'
        : ` <button type="button" class="action-btn" data-evoactive="${top.id}">Set on N</button>`) : '';
      // ROUND 388 -- the loot and stone evolutions say their reach, what waits on the map, and carry their Call button
      const extra = this._evoCardExtra ? this._evoCardExtra(top) : '';
      return `<li><b>${a.name}</b> → <b class="nature-evo">${top.name}</b>${btn} — ${body}${extra}${side}</li>`;
    }).join('') + '<li style="opacity:.7;">Prism has the same gifts: she is an Outworlder too.</li>';
  },

  // ---------------------------------------------------------------- companions
  _partyNatureOf(def) {
    if (def && NATURES[def.nature]) return def.nature;
    const d = def && PARTY_BY_ID[def.id];   // ROUND 386 -- a live member may not carry the roster's `nature`
    return d && NATURES[d.nature] ? d.nature : null;
  },

  /** A companion's evolutions: the human Essence Gifts take the essences already bound (6.11). */
  _partyNatureEvos(def) {
    const nid = this._partyNatureOf(def);
    // ROUND 386 -- the five companion natures: whatever this companion has woken, stored whole so it needs no catalogue
    if (PARTY_EVO_NATURES.includes(nid)) {
      // ROUND 389 -- with its spec, when the companion spec file has landed (partyEvoMixin)
      return Object.entries((def && def.natureEvo) || {}).map(([ref, st]) => partyEvolution(ref, st, this._pevoSpecFor ? this._pevoSpecFor(ref, st) : null)).filter(Boolean);
    }
    if (nid !== 'human') return [];
    // the three essences and the confluence they form: four bound essences, four gifts
    let defs = [];
    try { defs = this._partyEssenceDefs ? this._partyEssenceDefs(def, null) : []; } catch (e) { defs = []; }
    if (!defs.length) defs = ((def.build && def.build.essences) || []).filter(Boolean).map(essOf);
    return defs.slice(0, 4).filter(d => d && d.id).map((d, i) => essenceGiftEvolution(i, { id: d.id, name: d.name || d.id, family: d.family || (ESSENCE_CATALOG[d.id] || {}).family })).filter(Boolean);
  },

  _partyNatureFx(def) {
    this._partyNatureFxCache = this._partyNatureFxCache || {};
    const who = this._partyNatureWho(def);
    const k = def && def.id ? `${def.id}|${who.rank}|${who.essences.join(',')}|e${Object.keys(def.natureEvo || {}).length}` : null;   // ROUND 386 -- an evolution changes it
    if (k && this._partyNatureFxCache[k]) return this._partyNatureFxCache[k];
    const nid = this._partyNatureOf(def);
    if (PARTY_EVO_NATURES.includes(nid)) this._partyEvoCatalogue();   // ROUND 386 -- fetched once, the first time such a companion is read
    const fx = natureFxOf(nid, this._partyNatureEvos(def), 1, who);
    if (k) this._partyNatureFxCache[k] = fx;
    // ROUND 368 -- the Silver affinity shift, said once when it first takes
    const sh = affinityShift(nid, who);
    if (sh && def && !(def.affinityTurned && def.affinityTurned.from === sh.from && def.affinityTurned.to === sh.to)) {
      const was = (NATURES[nid].abilities.find(a => a.id === sh.from) || {}).name;
      const now = natureAbilitiesFor(nid, who).find(a => a.id === sh.from);
      def.affinityTurned = { from: sh.from, to: sh.to };
      const at = def.x != null ? def : this.world;
      if (this._floatText && at && now) this._floatText(at.x, at.y - 60, `${def.name || 'Your companion'}: ${was} becomes ${now.name}`, '#e1bee7');
    }
    return fx;
  },
  // ===================================================================== ROUND 386
  // "Start on creating evolutions" for the companion natures. See natures.js (PARTY_*): a full catalyst catalogue, woken
  // by a companion nearly dying in a fight in your party, or by a character-defining story moment.
  /** The companion catalogue, fetched once in the background; null until it lands. */
  _partyEvoCatalogue() {
    if (this._partyEvoCat !== undefined) return this._partyEvoCat;
    this._partyEvoCat = null;
    if (typeof fetch === 'function') {
      fetch(PARTY_CATALOGUE_URL).then(r => (r.ok ? r.json() : null)).then(j => { this._partyEvoCat = j || null; if (j) this._partyEvoSpendBanked(); })
        .catch(() => { console.warn('[natures] the companion evolution catalogue did not load'); });
    }
    return this._partyEvoCat;
  },

  /** What this companion could wake now. */
  _partyEvoState(m) {
    const nid = this._partyNatureOf(m);
    const who = this._partyNatureWho(m);
    const essences = who.essences.filter(id => ESSENCE_CATALOG[id]);
    if (this._partyEssenceDefs) { try { this._partyEssenceDefs(PARTY_BY_ID_SAFE(this, m), m); } catch (e) { /* the confluence name is optional */ } }
    return {
      natureId: nid, essences,
      essenceNames: Object.fromEntries(essences.map(id => [id, (ESSENCE_CATALOG[id] || {}).name || id])),
      confluence: m.confluenceName || null,
      have: Object.fromEntries(Object.keys(m.natureEvo || {}).map(r => [r, true])),
    };
  },

  /** Wake one evolution on companion `m`, if one can wake. `how` is 'near death' or a story moment's title. */
  _partyEvolve(m, how = 'near death') {
    if (!m || !PARTY_EVO_NATURES.includes(this._partyNatureOf(m))) return null;
    const cat = this._partyEvoCatalogue();
    if (!cat) return null;
    const st = this._partyEvoState(m);
    const seed = this._shopSeed ? this._shopSeed() : 0;
    const pick = pickPartyEvo(partyEvoCandidates(cat, st, seed), `${seed}|${m.id}|${Object.keys(m.natureEvo || {}).length}`);
    if (!pick) return null;
    m.natureEvo = m.natureEvo || {};
    m.natureEvo[pick.ref] = { entry: pick.entry, catalystId: pick.catalystId || null, how };
    m.natureStressSince = 0;
    this._partyNatureFxCache = null;
    // the nature scales the kit and the stat block, so both are rebuilt the way a load rebuilds them
    try {
      const def = PARTY_BY_ID_SAFE(this, m);
      if (this._buildPartyKit) m.kit = this._buildPartyKit(def, m);
      if (this._recomputePartyGear) this._recomputePartyGear(m);
    } catch (e) { console.warn('[natures] rebuilding', m.id, e); }
    const evo = partyEvolution(pick.ref, m.natureEvo[pick.ref]);
    const base = natureAbility(pick.ref);
    const nm = m.name || 'Your companion';
    // said over them and announced; a display failure must never undo the evolution or break the blow that woke it
    try { if (this._floatText && m.x != null) this._floatText(m.x, m.y - 60, `${nm}: ${base ? base.name : 'their nature'} becomes ${evo.name}`, '#e1bee7'); } catch (e) { /* display only */ }
    if (this._announce) try {
      this._announce([{
        title: 'Nature Gift Evolution',
        lines: [how === 'near death' ? `At the edge of it, something in ${nm} answers.` : `What ${nm} lived through is written into them now.`,
          `${nm}'s ${base ? base.name : 'nature'} has become ${evo.name}.`, ...(evo.lines || [evo.line])],
      }]);
    } catch (e) { /* display only */ }
    return evo;
  },

  /** From _damagePartyMember: a companion under PARTY_STRESS.hpBelow in a fight rolls, at most once per gap. */
  _partyNatureStress(m) {
    if (!m || !m.recruited || !(m.maxHp > 0) || m.hp <= 0 || m.hp >= m.maxHp * PARTY_STRESS.hpBelow) return null;
    if (!PARTY_EVO_NATURES.includes(this._partyNatureOf(m))) return null;
    const now = this._clockT || 0;
    if (m._natureStressT != null && now - m._natureStressT < PARTY_STRESS.gapS) return null;
    m._natureStressT = now;
    m.natureStressSince = (m.natureStressSince || 0) + 1;
    if (!this._partyEvoCatalogue()) return null;
    if (Math.random() >= PARTY_STRESS.chance) return null;
    return this._partyEvolve(m, 'near death');
  },

  /** A character-defining story moment (NATURE_STORY_MOMENTS, Olb's sacrifice): every companion who lived it with you,
   *  in the party and not benched, evolves outright, or banks it until the catalogue lands or something can wake. */
  // ROUND 389 -- `opts.only` (roster ids) and `opts.title`: a companion's own story quest (companionQuestMixin.js) is
  // THEIR moment, so only the companions whose story it is wake from it, under the quest's own title.
  _partyNatureStory(momentId, opts = null) {
    const out = [];
    const only = opts && Array.isArray(opts.only) ? opts.only : null;
    for (const m of (this.party || [])) {
      if (!m || !m.recruited || m.benched || m.dismissed || m.reserve) continue;
      if (only && !only.includes(m.id) && !only.includes(m.advId)) continue;   // ROUND 389
      if (!PARTY_EVO_NATURES.includes(this._partyNatureOf(m))) continue;
      m.natureStoryHad = m.natureStoryHad || {};
      if (m.natureStoryHad[momentId]) continue;
      m.natureStoryHad[momentId] = true;
      const title = (opts && opts.title) || (NATURE_STORY_MOMENTS[momentId] || {}).title || 'story';
      const evo = this._partyEvolve(m, title);
      if (evo) out.push(evo);
      else m.natureEvoBanked = (m.natureEvoBanked || 0) + 1;
    }
    return out;
  },

  /** A banked story reward, spent as soon as something can wake. */
  _partyEvoSpendBanked() {
    for (const m of (this.party || [])) {
      while (m && m.natureEvoBanked > 0) {
        if (!this._partyEvolve(m, 'story')) break;
        m.natureEvoBanked--;
      }
    }
  },

  /** ROUND 368 -- whose essences and rank the Silver affinity shift reads, for a companion. */
  _partyNatureWho(def) {
    let essences = [];
    try { essences = this._partyEssencesFor ? this._partyEssencesFor(def, null) : []; } catch (e) { essences = []; }
    if (!essences.length) essences = ((def && def.build && def.build.essences) || []).filter(Boolean);
    return { essences: essences.slice(), rank: (def && def.rank) || 'normal' };
  },

  /** Scale a companion's freshly built ability by their nature, the way _scaledAbility scales the player's. */
  _partyNatureScale(sp, def) {
    if (!sp || !def) return sp;
    const fx = this._partyNatureFx(def);
    if (!fx.effect && !fx.dmg) return sp;
    const roles = abilityRoles(sp, abilityDeals);
    const { k } = natureAbilityMult(fx, natureTagsOf(sp, roles, essOf(sp.essenceId), attackKindOf(sp, abilityDeals)));
    if (!(k > 1)) return sp;
    for (const f of SCALED_FIELDS) if (typeof sp[f] === 'number') sp[f] = sp[f] >= 2 ? Math.round(sp[f] * k) : sp[f] * k;
    for (const [nest, fields] of Object.entries(SCALED_NESTED)) {
      if (!sp[nest] || typeof sp[nest] !== 'object') continue;
      sp[nest] = { ...sp[nest] };
      for (const f of fields) if (typeof sp[nest][f] === 'number') sp[nest][f] = sp[nest][f] >= 2 ? Math.round(sp[nest][f] * k) : sp[nest][f] * k;
    }
    sp.natureK = k;
    return sp;
  },

  /** Spell / Special Attack Aptitude: "more likely to awaken" that kind. Half the sockets prefer it when one is on offer. */
  _partyNaturePick(def, cands, haveTemplates, salt) {
    const fx = this._partyNatureFx(def);
    const want = fx.awaken ? Object.keys(fx.awaken).filter(k => fx.awaken[k] > 0) : [];
    if (!want.length || !cands || !cands.length) return null;
    let h = 0;
    for (const ch of `${def.id}|${salt}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    if (h % 100 >= 50) return null;
    return cands.find(sp => !haveTemplates.has(sp.template) && want.includes(attackKindOf(sp, abilityDeals))) || null;
  },

  /** A companion's nature into their stat block: resistances. */
  _partyNatureStats(def, st) {
    const fx = this._partyNatureFx(def);
    for (const [el, v] of Object.entries(fx.resist || {})) {
      const key = `resist_${RESIST_FOLD[el] || el}`;
      if (RESIST_STATS.includes(RESIST_FOLD[el] || el) && key in st && v > 0) st[key] += v;
      else if (v > 0 && !RESIST_STATS.includes(RESIST_FOLD[el] || el)) st[key] = (st[key] || 0) + v;   // ROUND 366 -- dimension: no gear stat, read by name at _damagePartyMember
    }
    if (fx.dodge && 'dodgeChance' in st) st.dodgeChance += fx.dodge;   // ROUND 366 -- Grace
  },

  _partyNatureHtml(def) {
    const nid = this._partyNatureOf(def);
    const N = NATURES[nid];
    if (!N) return '';
    const evos = this._partyNatureEvos(def);
    const items = natureAbilitiesFor(nid, this._partyNatureWho(def)).map(a => {
      if (a.turnedAtSilver) return `<li><b>${a.name}</b> — ${a.line} <i style="opacity:.7;">(was ${a.was}; turned to their essence at Silver)</i></li>`;
      const e = evos.find(x => x.of === `${nid}.${a.id}`);
      // ROUND 386 -- a catalogue evolution shows the whole block, as the Character page does for the player's
      const body = e && e.lines ? `<i style="opacity:.75;">${e.transfigured || ''}</i><br>${e.lines.join('<br>')}` : (e && e.line);
      return e ? `<li><b>${a.name}</b> → <b class="nature-evo">${e.name}</b> — ${body}</li>`
        : `<li><b>${a.name}</b> — ${a.line}${a.placeholder ? ' <i style="opacity:.6;">(provisional)</i>' : ''}</li>`;
    }).join('');
    const practice = this._pevoPracticeLine ? this._pevoPracticeLine(def) : '';   // ROUND 389 -- what their evolutions have practised
    return `<div class="nature-head">${N.name}</div><ul class="nature-list">${items}</ul>${practice ? `<div style="opacity:.75;font-size:11px;">${practice}</div>` : ''}`;
  },

  // ===================================================================== ROUND 362
  // "Tell me which achievements should give [a nature] gift evolution":
  //   - Finishing Olb's quest chain.
  //   - Killing a monster 1 rank higher than you solo, or 2 ranks higher as a team.
  //   - Surviving a monster of higher rank than you after being reduced to 1 health but not killed.
  // Each is a quest reward (`_natureQuestReward`): it evolves something now, or waits until something can.
  // Each counts once per rank (once at all for Olb), so a long fight cannot bank a dozen.
  _natureAchieve(kind, detail = '') {
    const p = this.player;
    if (!p) return null;
    p.natureAchieved = p.natureAchieved || {};
    const k = `${kind}|${detail}`;
    if (p.natureAchieved[k]) return null;
    p.natureAchieved[k] = (this._dayIndex ? this._dayIndex() : 0) || 1;
    const a = NATURE_ACHIEVEMENTS[kind];
    const toast = kind === 'story' ? (NATURE_STORY_MOMENTS[detail] || {}).toast : (a && a.toast);
    if (toast && this._floatText) this._floatText(this.world.x, this.world.y - 78, toast, '#e1bee7');
    // ROUND 386 -- the companions who lived a character-defining moment with you (a story moment, or Olb's sacrifice)
    if ((kind === 'story' || kind === 'olb') && this._partyNatureStory) this._partyNatureStory(kind === 'olb' ? 'olb' : detail);
    // ROUND 389 -- "It shouldn't always be the same -- it should pull from all of the available options and try to look
    // for something that synergizes with the character's kit." Olb's sacrifice picks from the whole pool (olbGiftMixin.js)
    if (kind === 'olb' && this._olbGiftReward) return this._olbGiftReward();
    return this._natureQuestReward(a ? a.source : kind);
  },

  /** ROUND 367 -- a character-defining story moment (NATURE_STORY_MOMENTS). Once each. */
  _natureStory(id) {
    if (!NATURE_STORY_MOMENTS[id]) return null;
    return this._natureAchieve('story', id);
  },
  /** ...and the Division spine's: called as a stage completes, with the stage just finished. */
  _natureStoryStage(stageId) {
    return NATURE_STORY_STAGES.includes(stageId) ? this._natureStory(stageId) : null;
  },

  _natureRankGap(m) {
    const pr = Math.max(0, RANK_ORDER.indexOf(this.player.rank || 'normal'));
    const mr = this._monsterRankIndex ? this._monsterRankIndex(m) : 0;
    return mr - pr;
  },

  /** From _killMonster: a kill above your rank. */
  _natureOnKill(m, credit) {
    if (!credit || !m || m.person || !this.player) return;
    const gap = this._natureRankGap(m);
    const team = this._activeParty ? this._activeParty().filter(x => !x.benched && !x.dismissed).length > 0 : false;
    if ((!team && gap >= NATURE_ACHIEVEMENTS.killAbove.solo) || (team && gap >= NATURE_ACHIEVEMENTS.killAbove.team)) {
      this._natureAchieve('killAbove', `${RANK_ORDER[(this._monsterRankIndex ? this._monsterRankIndex(m) : 0)]}|${team ? 'team' : 'solo'}`);
    }
  },

  /** From _monsterHitPlayerCore: who last struck the player, and whether they outrank the player. */
  _natureNoteHit(m) {
    if (!m || m.person || !this.player) return;
    if (this._natureRankGap(m) >= 1) this._natureHigherHitAt = this.time ? this.time.now : 0;
    this._natureHigherHitM = m;
  },

  /** Brought to one health by something stronger, and still alive when the fight ends. */
  _natureBrinkTick(dt) {
    const p = this.player;
    const now = this.time ? this.time.now : 0;
    const one = Math.max(1, p.maxHp * NATURE_ACHIEVEMENTS.brink.hpFrac);
    if (p.hp > 0 && p.hp <= one && this._natureHigherHitAt && now - this._natureHigherHitAt < 2500 && !this._natureBrink) {
      this._natureBrink = { at: now, m: this._natureHigherHitM };
    }
    const b = this._natureBrink;
    if (!b) return;
    if (!(p.hp > 0)) { this._natureBrink = null; return; }
    const fighting = this._fightingNow && this._fightingNow();
    if (!fighting) b.quiet = (b.quiet || 0) + dt; else b.quiet = 0;
    if (b.quiet > NATURE_ACHIEVEMENTS.brink.quietS) {   // "the fight is over"
      this._natureBrink = null;
      const mr = b.m && this._monsterRankIndex ? this._monsterRankIndex(b.m) : 0;
      this._natureAchieve('brink', RANK_ORDER[mr] || 'any');
    }
  },

  // ------------------------------------------------------- the five, built
  /** The nature effect a body carries: the player, a companion (their `nature`), an adventurer. */
  _natureFxFor(e) {
    if (!e) return null;
    if (e === this.player || e.kind === 'player') return this._natureFx();
    const body = e.ref || e;
    if (body.adv && body.adv.nature) return natureFxOf(body.adv.nature, [], 1, { essences: body.adv.essences || [], rank: body.rank || body.adv.rank || 'normal' });   // ROUND 368
    if (body.nature && NATURES[body.nature]) return this._partyNatureFx(body);
    return null;
  },

  /** Magic Affinity's affliction effects and mind-control resistance, at _applyDebuff's door.
   *  Returns null to refuse the affliction, or the potency to apply it at. */
  _natureAfflict(e, def, potency) {
    const fx = this._natureFxFor(e);
    if (!fx || !def) return potency;
    const tags = def.tags || [];
    // ROUND 366 -- Unstoppable: "your movement abilities cannot be negated or impaired" -- slows, roots and pins do not take hold
    if (fx.moveUnimpeded && (UNIMPEDED_KEYS.has(def.key || '') || (def.stopsMove && !def.stopsAct))) { this._natureShrug(e, def.label || def.key, 'cannot hold you'); return null; }
    // "With afflictions it increases resistance to them"
    if (fx.afflictResist && Math.random() < fx.afflictResist) { this._natureShrug(e, def.label, 'resisted'); return null; }
    // Mind control: the game has no charm or domination effect yet, so this answers what takes the mind -- a
    // suppression of the kit, a muddled cast, a stun -- and the aura pressure of a stronger soul (_natureMindCut).
    if (fx.mindResist && (tags.includes('suppress') || def.key === 'slowCast' || def.key === 'stun') && Math.random() < fx.mindResist) {
      this._natureShrug(e, def.label, 'shrugged off'); return null;
    }
    // "...as well as reducing the strength and duration of the effect"
    return fx.afflictCut ? potency * (1 - Math.min(0.6, fx.afflictCut)) : potency;
  },
  _natureShrug(e, label, verb) {
    const at = (e === this.player) ? this.world : (e.ref || e);
    if (at && this._floatText) this._floatText(at.x, at.y - 52, `${label} ${verb}`, '#ce93d8');
  },

  /** The aura pressure of a stronger soul on a mind that resists it. */
  _natureMindCut() {
    const fx = this._natureFx();
    return Math.min(0.6, fx.mindResist || 0);
  },

  /** "Effects used or received with a positive effect on life have greater effect": heals received. */
  _natureHealTaken(t, amount) {
    const fx = this._natureFxFor(t);
    const k = fx && fx.healTaken;
    return k ? Math.round(amount * (1 + k)) : amount;
  },

  /** Mana Integrity: "Ongoing mana costs for maintained abilities are reduced." */
  _natureUpkeep(amount) {
    const fx = this._natureFx();
    return fx.manaUpkeepCut ? amount * (1 - Math.min(0.6, fx.manaUpkeepCut)) : amount;
  },
  /** Mana Integrity: "Resistance to mana drain effects is increased." */
  _natureManaDrain(amount) {
    const fx = this._natureFx();
    // with the canon passives' own (lordOfMagic wrote passiveMods.manaDrainResist; nothing read it until now)
    const r = (fx.manaDrainResist || 0) + (((this.player && this.player.passiveMods) || {}).manaDrainResist || 0);
    return r > 0 ? Math.max(0, Math.round(amount * (1 - Math.min(0.8, r)))) : amount;
  },

  /** Dragon Breath: "a conic breath attack whose damage is determined by the absorbed essences".
   *  `src` {x,y}, aimed at (tx,ty); `essences` the ids absorbed; `rankIdx` the breather's rank.
   *  The element is the first essence's family's; each essence absorbed adds to the damage. Monsters are hit
   *  by a share of their health, so a breath reads the same at any rank. `credit` true for the player's own. */
  _natureDragonBreath(src, tx, ty, essences, rankIdx = 1, credit = false) {
    if (!src) return 0;
    const plan = breathPlan(essences, ESSENCE_CATALOG);
    const ang = Math.atan2(ty - src.y, tx - src.x);
    let hit = 0;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || m.person) continue;
      const dx = m.wx - src.x, dy = m.wy - src.y, d = Math.hypot(dx, dy);
      if (d > plan.range || d < 1) continue;
      let da = Math.abs(Math.atan2(dy, dx) - ang);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da > plan.halfArc) continue;
      const mr = this._monsterRankIndex ? this._monsterRankIndex(m) : 1;
      const frac = Math.max(0.03, Math.min(0.4, plan.frac * Math.pow(1.6, rankIdx - mr)));
      this._damageMonster(m, Math.max(1, Math.round((m.maxHp || 20) * frac)), credit, false, plan.element);
      hit++;
    }
    let fx = null;
    try { fx = pickSpellFx({ name: 'Dragon Breath', element: plan.element, color: plan.color, template: 'cone' }); } catch (e) { fx = null; }
    if (fx && this._playSpellFx) {
      for (let i = 1; i <= 3; i++) this._playSpellFx(fx, src.x + Math.cos(ang) * plan.range * i / 3.4, src.y + Math.sin(ang) * plan.range * i / 3.4, 0.7 + i * 0.25);
    }
    if (this._floatText) this._floatText(src.x, src.y - 66, 'Dragon Breath', plan.color);
    return hit;
  },

  // ===================================================================== ROUND 363
  // The runic and leonid six, at their doors. Each reads `_natureFx()` (the player) or the companion's own.
  /** Wellspring and Tireless: maximum mana +50%, maximum stamina +50%. Called on the stat block after it is built. */
  _natureMaxPools(ms) {
    const fx = this._natureFx();
    if (!ms) return;
    if (fx.maxManaPct && ms.maxMana) ms.maxMana = Math.round(ms.maxMana * (1 + fx.maxManaPct));
    if (fx.maxStaminaPct && ms.maxStamina) ms.maxStamina = Math.round(ms.maxStamina * (1 + fx.maxStaminaPct));
  },
  _partyNaturePools(m) {
    const fx = this._partyNatureFx(m);
    if (fx.maxManaPct) m.maxMana = Math.round(m.maxMana * (1 + fx.maxManaPct));
    if (fx.maxStaminaPct) m.maxStamina = Math.round(m.maxStamina * (1 + fx.maxStaminaPct));
  },
  /** Mana Beacon: "Effects that restore or regenerate mana are 25% stronger." A factor on the mana refill rate. */
  _natureManaRestore() {
    const fx = this._natureFx();
    return 1 + (fx.manaRestore || 0);
  },
  /** Sprint: "15% faster and consumes 25% less stamina." */
  _natureSprint() {
    const fx = this._natureFx();
    return { speed: 1 + (fx.sprintSpeed || 0), cost: 1 - Math.min(0.9, fx.sprintCostCut || 0) };
  },
  /** A blow that has landed, before it leaves health: Adaptive Resistance, then Spellborn. Spell damage is typed. */
  _natureSpellTaken(taken, element) {
    if (!(taken > 0) || !element || element === 'physical') return taken;
    const fx = this._natureFx();
    const now = this.time ? this.time.now : 0;
    this._natureSpellSeen = this._natureSpellSeen || {};
    // "Take 10% less damage from any spell damage taken in the past 10 seconds."
    if (fx.adaptiveResist && this._natureSpellSeen[element] && now - this._natureSpellSeen[element] <= 10000) {
      taken = Math.max(1, Math.round(taken * (1 - fx.adaptiveResist)));
    }
    this._natureSpellSeen[element] = now;
    // "Absorb 10% of magical damage taken directly into mana."
    if (fx.spellToMana) {
      const p = this.player;
      p.mana = Math.min(p.maxMana, (p.mana || 0) + taken * fx.spellToMana);
    }
    return taken;
  },
  /** Boon Aptitude's second half: a buff landing on this creature is 25% more effective. */
  _natureBuffTaken(amount) {
    const fx = this._natureFx();
    return typeof amount === 'number' && fx.buffTaken ? amount * (1 + fx.buffTaken) : amount;
  },
  /** Leonid's Roar: every enemy close by is stunned, and takes more damage for a while ([Vulnerable]). */
  _natureRoar(src, rankIdx = 1, credit = false) {
    if (!src) return 0;
    let n = 0;
    for (const m of (this.monsters || [])) {
      if (!m || !m.alive || m.person) continue;
      if (Math.hypot(m.wx - src.x, m.wy - src.y) > 180) continue;
      if (this._applyDebuff) {
        this._applyDebuff(m, 'stun', { duration: 1.2 + 0.3 * rankIdx, fromPlayer: credit, source: credit ? this.player : null });
        this._applyDebuff(m, 'vulnerable', { duration: 6, fromPlayer: credit, source: credit ? this.player : null });
      }
      n++;
    }
    let fx = null;
    try { fx = pickSpellFx({ name: 'Leonid\'s Roar', element: 'physical', color: '#ffca28', template: 'aoeRing' }); } catch (e) { fx = null; }
    if (fx && this._playSpellFx) this._playSpellFx(fx, src.x, src.y, 1.6);
    if (this._floatText) this._floatText(src.x, src.y - 66, 'Leonid\'s Roar', '#ffca28');
    if (this.cameras && this.cameras.main && n) this.cameras.main.shake(160, 0.004);
    return n;
  },
};
