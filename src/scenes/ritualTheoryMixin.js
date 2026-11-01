// ============================================================================
// ROUND 357 -- THE MAGICAL THEORIES, the scene's half. The catalogue, the perk numbers, the costs and the arcane sites'
// rules are src/data/ritualTheory.js; the books are read through skillBooks.js like every other book.
//
//   PERKS, each read by exactly one system:
//     _theoryApplyMods(mods)        elemental / divine / soul resistances, into passiveMods.resistBonus
//     _theorySummonBoost(rec)       astral: a summon is made stronger and hardier
//     _theoryBonusLoot(m)           astral (in an astral space), elemental, fauna: an extra part and purse
//     _theorySoulDamageMult(m)      soul: more damage to the ethereal and the undead
//     _theorySightMult(m)           fauna: magical beasts see you from less far
//     _theoryTeleportMult()         portal: teleports reach further
//     _theoryTeleportThrough()      portal: a chance to teleport through a block
//     _theoryFoeBlinkBlocked(m)     portal: a foe whose aura you suppress may fail its blink
//     _theoryRiteCooldown(s)        interference: shorter ritual cooldowns
//     _theoryRiteValue(v)           interference: stronger ritual zones
//     _theoryGodPay(n)              divine: more from the gods' chapters
//     _weatherAttune (weatherMixin) weather: penalties soften, favours sharpen
//     _theoryMapMarks(...)          natural: where stones and essences are gathering, on the map
//     _arcaneMoveMult()             natural: a natural array's pull (resisted by the theory)
//   THE ARCANE SITES (investigations and puzzles) -- _buildArcaneSites, _updateArcaneSites, _studyArcane, the puzzle pages,
//     and each kind's own outcome for the matching theory (a waygate you can travel by, the weather you can call, ...).
//   THE RITUALIST sells the nine books and performs the Deepening of a theory (for its fee).
//   A SOUL ATTACK IN CONVERSATION, for a soul theorist from bronze.
//   FOE BLINKS -- the ethereal families now blink toward their quarry; a portal theorist can stop it.
// ============================================================================
import { skillBooksOf } from '../data/skillBooks.js';
import {
  THEORIES, THEORY_KEYS, theoryBook, theoryPerkOf, theoryPerkLines, theoryDeepenCost, theoryDeepenLabel,
  ARCANE_SITES, ARCANE_KINDS, ARCANE_PER_REGION, ARCANE_REGION_LEAN, ARCANE_STUDY_S, ARCANE_COOLDOWN_DAYS, ARCANE_RADIUS,
  ARRAY_PULL_RADIUS, ARRAY_PULL_SLOW, arcanePuzzle, arcaneHelp, arcaneReward,
  ELEMENTAL_FAMILIES, SOUL_FAMILIES, BEAST_FAMILIES, BLINK_FAMILIES, BLINK_RANGE_TILES, BLINK_COOLDOWN_S,
} from '../data/ritualTheory.js';
import { WEATHER, CLIMATE, weatherSlot, weatherSlotAt, WEATHER_SLOT_VERSION } from '../data/weather.js';
import { RANK_ORDER, RANK_LABELS } from '../data/ranks.js';
import { grantCoins, spendCoins, coinPurseValue, formatCoinPurse, emptyCoinPurse, partForFamily, rollPartForFamily } from '../data/inventory.js';
import { subtypeOf } from '../data/monsters.js';
import { seededRng } from '../data/awakening.js';
import { isoProject, isoDepth, TILE } from '../data/iso.js';
import { REGIONS, REGION_TILES } from '../data/regions.js';
import { DIVINE } from '../data/divine.js';
import { rollStoneDrop } from '../data/stoneCatalog.js';
import { rollEssenceDrop } from '../data/essenceCatalog.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Normal-coin units as "3b 20i". */
const coinText = (n) => { const p = emptyCoinPurse(); grantCoins(p, 'normal', Math.max(0, Math.round(n))); return formatCoinPurse(p); };

export const RitualTheoryMixin = {
  // ---- reading the bag ---------------------------------------------------------------------------------------------

  _theorySb() { return skillBooksOf(this.player); },
  _theoryKey() { return this._theorySb().theory; },
  _theoryPerk(key, perk) { return theoryPerkOf(this._theorySb(), key, perk); },
  _theoryRank() { const sb = this._theorySb(); return sb.theory ? (sb.theoryRank || 1) : 0; },

  // ---- the perks ---------------------------------------------------------------------------------------------------

  _theoryApplyMods(mods) {
    const sb = this._theorySb();
    if (!sb.theory || !mods) return;
    const add = (el, v) => { if (v > 0) mods.resistBonus[el] = (mods.resistBonus[el] || 0) + v; };
    const er = theoryPerkOf(sb, 'elemental', 'elemResist');
    for (const el of ['fire', 'frost', 'lightning', 'earth', 'water', 'air', 'ice', 'storm']) add(el, er);
    const dr = theoryPerkOf(sb, 'divine', 'divineResist');
    for (const el of ['radiant', 'holy', 'divine']) add(el, dr);
    const sr = theoryPerkOf(sb, 'soul', 'soulResist');
    for (const el of ['shadow', 'necrotic', 'soul']) add(el, sr);
  },

  _theorySummonBoost(rec) {
    const k = this._theoryPerk('astral', 'summonPower');
    if (!(k > 0) || !rec) return;
    if (Number.isFinite(rec.dmg)) rec.dmg = Math.max(1, Math.round(rec.dmg * (1 + k)));
    if (Number.isFinite(rec.maxHp)) { rec.maxHp = Math.round(rec.maxHp * (1 + k)); rec.hp = rec.maxHp; }
    rec.astralBoost = k;
  },

  _isElementalFoe(m) { const f = m && m.type && m.type.family; return !!f && (subtypeOf(m) === 'elemental' || ELEMENTAL_FAMILIES.has(f)); },
  _isSoulFoe(m) { const f = m && m.type && m.type.family; const st = subtypeOf(m); return !!f && (st === 'ethereal' || st === 'undead' || SOUL_FAMILIES.has(f)); },
  _isBeastFoe(m) { const f = m && m.type && m.type.family; return !!f && (subtypeOf(m) === 'fauna' || BEAST_FAMILIES.has(f)); },

  /** An extra monster part and a little purse on a kill the theory reads: elemental monsters (elemental), magical beasts
   *  (fauna), and anything at all in an astral space (astral). The perk value is the chance. */
  _theoryBonusLoot(m) {
    if (!m || !m.type || m.person) return;
    const sb = this._theorySb();
    if (!sb.theory) return;
    let chance = 0;
    if (sb.theory === 'elemental' && this._isElementalFoe(m)) chance = theoryPerkOf(sb, 'elemental', 'elemLoot');
    else if (sb.theory === 'fauna' && this._isBeastFoe(m)) chance = theoryPerkOf(sb, 'fauna', 'beastLoot');
    else if (sb.theory === 'astral' && this._insideRoom && (this._insideRoom.astral || /astral|realm/i.test(this._insideRoom.id || ''))) chance = theoryPerkOf(sb, 'astral', 'astralLoot');
    if (!(chance > 0)) return;
    let n = 0;
    while (chance > 0 && n < 3) {
      if (Math.random() < Math.min(1, chance)) {
        const part = rollPartForFamily(m.type.family, Math.random);   // ROUND 368 -- either part
        if (part) this._dropLoot(m.wx, m.wy, { kind: 'part', id: part.id || part });
        n++;
      }
      chance -= 1;
    }
    if (n) this._theoryLootCensus = (this._theoryLootCensus || 0) + n;
  },

  _theorySoulDamageMult(m) {
    const k = this._theoryPerk('soul', 'soulDamage');
    return k > 0 && this._isSoulFoe(m) ? 1 + k : 1;
  },

  _theorySightMult(m) {
    const k = this._theoryPerk('fauna', 'beastAggro');
    return k > 0 && this._isBeastFoe(m) ? Math.max(0.5, 1 - k) : 1;
  },

  _theoryTeleportMult() { return 1 + (this._theoryPerk('portal', 'teleportBoost') || 0); },
  _theoryTeleportThrough() {
    const k = this._theoryPerk('portal', 'teleportBlockResist');
    return k > 0 && Math.random() < k;
  },
  _theoryFoeBlinkBlocked(m) {
    const k = this._theoryPerk('portal', 'foeTeleportBlock');
    return k > 0 && !!(m && m._auraSupp) && Math.random() < k;
  },

  _theoryRiteCooldown(s) { return s * (1 - (this._theoryPerk('interference', 'riteCooldown') || 0)); },
  _theoryRiteValue(v) { return v * (1 + (this._theoryPerk('interference', 'riteEffect') || 0)); },
  _theoryRiteLife(t) { return this._theoryPerk('interference', 'riteReinforce') ? t * 1.5 : t; },
  _theoryRiteLayer() { return !!this._theoryPerk('interference', 'riteLayer'); },
  _theoryGodPay(n) { return Math.round(n * (1 + (this._theoryPerk('divine', 'divineReward') || 0))); },

  // ---- foe blinks (portal theory's other half) -------------------------------------------------------------------

  /** Called for every chasing monster: an ethereal one blinks a few tiles toward its quarry now and then. A portal
   *  theorist who is suppressing its aura may stop it ("the blink snaps back"). */
  _maybeFoeBlink(m, dt, tx, ty) {
    if (!m || !m.type || !BLINK_FAMILIES.has(m.type.family) || !(m.hp > 0)) return false;
    m._blinkT = (m._blinkT ?? (1.2 + Math.random() * 1.8)) - dt;   // the first blink comes early in a chase; then every 6-10 s
    if (m._blinkT > 0) return false;
    m._blinkT = BLINK_COOLDOWN_S[0] + Math.random() * (BLINK_COOLDOWN_S[1] - BLINK_COOLDOWN_S[0]);
    const d = Math.hypot(tx - m.wx, ty - m.wy);
    if (d < TILE * 3) return false;
    if (this._theoryFoeBlinkBlocked(m)) {
      this._floatText(m.wx, m.wy - 30, 'Blink blocked', '#80deea');
      this._foeBlinksBlocked = (this._foeBlinksBlocked || 0) + 1;
      return false;
    }
    const step = Math.min(d - TILE * 1.5, BLINK_RANGE_TILES * TILE);
    const nx = m.wx + (tx - m.wx) / d * step, ny = m.wy + (ty - m.wy) / d * step;
    if ((this._collidesObstacle && this._collidesObstacle(nx, ny, 10)) || (this._isWaterAt && this._isWaterAt(nx, ny))) return false;
    m.wx = nx; m.wy = ny;
    this._foeBlinks = (this._foeBlinks || 0) + 1;
    return true;
  },

  // ---- the arcane sites --------------------------------------------------------------------------------------------

  /** Place the sites: ARCANE_PER_REGION a region, the region's leaning kinds twice and the rest once, on open ground
   *  away from the settlements and the round-63 sites (`_siteSpotOk` decides). Seeded per region. */
  _buildArcaneSites() {
    this.arcaneSites = [];
    const RT = REGION_TILES;
    for (const region of REGIONS) {
      const lean = ARCANE_REGION_LEAN[region.id] || [];
      const kinds = [...lean, ...lean, ...ARCANE_KINDS.filter(k => !lean.includes(k))].slice(0, ARCANE_PER_REGION);
      while (kinds.length < ARCANE_PER_REGION) kinds.push(ARCANE_KINDS[kinds.length % ARCANE_KINDS.length]);
      const rng = seededRng(`arcane|${region.id}`);
      let tries = 0;
      for (const kind of kinds) {
        for (let t = 0; t < 40 && tries < 2000; t++, tries++) {
          const tx = region.col * RT + 100 + Math.floor(rng() * (RT - 200));
          const ty = region.row * RT + 100 + Math.floor(rng() * (RT - 200));
          const wx = tx * TILE, wy = ty * TILE;
          if (this._siteSpotOk && !this._siteSpotOk(wx, wy, { build: { radius: 60 } })) continue;
          if (this._settlementAt && this._settlementAt(wx, wy)) continue;
          if (this.arcaneSites.some(s => Math.hypot(s.x - wx, s.y - wy) < TILE * 60)) continue;
          const def = ARCANE_SITES[kind];
          this.arcaneSites.push({
            id: `arc_${region.id}_${this.arcaneSites.length}`, kind, theory: def.theory, name: def.name, blurb: def.blurb,
            regionId: region.id, regionIndex: region.index || 0, x: wx, y: wy, color: def.color,
          });
          (this._landmarkKeepOut = this._landmarkKeepOut || []).push({ x: wx, y: wy, r: TILE * 4 });
          break;
        }
      }
    }
    // Clear the canopy off each site, as round 63 does for its own (trees draw at 2.6x, so the clear is wide), and
    // rebuild the forest's ids, which are positions.
    if (this.forestTrees && this.arcaneSites.length) {
      const kept = this.forestTrees.filter(t => !this.arcaneSites.some(st => Math.hypot(t.x - st.x, t.y - st.y) < TILE * 5));
      if (kept.length !== this.forestTrees.length) this.forestTrees = kept.map((t, i) => ({ ...t, id: i }));
    }
    this._arcaneCensus = { placed: this.arcaneSites.length };
    return this.arcaneSites.length;
  },

  /** Persistent record of what the player has done at each site (studied day, attuned waygates, shut circles). */
  _arcaneRec() {
    const p = this.player;
    return (p.arcane || (p.arcane = { studied: {}, waygates: {}, shut: {}, sensed: {} }));
  },

  _arcaneRestingDays(site) {
    const day = this._dayIndex ? this._dayIndex() : 0;
    const last = this._arcaneRec().studied[site.id];
    return last === undefined ? 0 : Math.max(0, ARCANE_COOLDOWN_DAYS - (day - last));
  },

  /** Every frame: draw the near ones, find the one in reach, run a study in progress, and the arrays' pull. */
  _updateArcaneSites(dt) {
    const sites = this.arcaneSites;
    this.nearArcane = null;
    this._arcanePull = 0;
    if (!sites || !sites.length || this._insideRoom) { this._arcaneHideAll(); return; }
    const cam = this.cameras.main, v = cam.worldView;
    const shown = new Set();
    const resist = this._theoryPerk('natural', 'arrayResist') || 0;
    for (const s of sites) {
      const d = Math.hypot(this.world.x - s.x, this.world.y - s.y);
      if (d < TILE * 40) {
        shown.add(s);
        this._arcaneDraw(s);
        if (d < ARCANE_RADIUS * TILE) this.nearArcane = s;
        if (!s.seen && d < TILE * 6) { s.seen = true; if (this._showSiteBanner) this._showSiteBanner(s.name, s.blurb); }
        if (s.kind === 'array' && d < ARRAY_PULL_RADIUS * TILE) {
          const k = 1 - d / (ARRAY_PULL_RADIUS * TILE);
          this._arcanePull = Math.max(this._arcanePull, ARRAY_PULL_SLOW * k * (1 - Math.min(0.95, resist)));
        }
      }
    }
    for (const s of sites) if (!shown.has(s) && s.g && s.g.visible) s.g.setVisible(false);
    this._tickArcaneStudy(dt);
  },

  _arcaneHideAll() { for (const s of (this.arcaneSites || [])) if (s.g && s.g.visible) s.g.setVisible(false); },

  /** A ring of the site's colour on the ground with three runes and a pulsing centre; dim while it rests. */
  _arcaneDraw(s) {
    const p = isoProject(s.x, s.y);
    if (!s.g) s.g = this.add.graphics().setDepth(isoDepth(s.x, s.y) - 40000);
    const g = s.g;
    g.setVisible(true);
    const resting = this._arcaneRestingDays(s) > 0;
    const shut = s.kind === 'circles' && this._arcaneRec().shut[s.id] !== undefined && !resting;
    const a = resting ? 0.25 : 0.55 + 0.25 * Math.sin((this._lightT || 0) * 2 + s.x);
    const R = 40;
    g.clear();
    g.lineStyle(3, s.color, a);
    g.strokeEllipse(p.x, p.y, R * 2, R);
    g.lineStyle(1.5, s.color, a * 0.8);
    g.strokeEllipse(p.x, p.y, R * 1.3, R * 0.65);
    for (let i = 0; i < 3; i++) {
      const ang = (this._lightT || 0) * 0.4 + i * (Math.PI * 2 / 3);
      const rx = p.x + Math.cos(ang) * R * 0.82, ry = p.y + Math.sin(ang) * R * 0.41;
      g.fillStyle(s.color, a);
      g.fillRect(rx - 3, ry - 6, 6, 12);
    }
    if (s.kind === 'circles' && !shut) {   // an active hostile circle: a red second ring
      g.lineStyle(2, 0xff5252, a);
      g.strokeEllipse(p.x + 8, p.y - 3, R * 1.7, R * 0.85);
    }
    g.fillStyle(s.color, a * 0.35);
    g.fillEllipse(p.x, p.y, R * 0.6, R * 0.3);
  },

  /** Natural arrays pull at whoever stands in them; Natural Array theory resists it. Read by the movement code. */
  _arcaneMoveMult() { return 1 - (this._arcanePull || 0); },

  /** An active hostile ritual circle (Layered Circles not yet shut down) empowers the monsters standing near it. */
  _arcaneFoeDamageMult(m) {
    if (!m || !this.arcaneSites) return 1;
    const rec = this._arcaneRec();
    for (const s of this.arcaneSites) {
      if (s.kind !== 'circles' || rec.shut[s.id] !== undefined) continue;
      if (Math.abs(s.x - m.wx) > TILE * 9 || Math.abs(s.y - m.wy) > TILE * 9) continue;
      if (Math.hypot(s.x - m.wx, s.y - m.wy) < TILE * 8) return 1.15;
    }
    return 1;
  },

  _arcanePromptLabel(s) {
    const rest = this._arcaneRestingDays(s);
    if (rest > 0) {
      const rec = this._arcaneRec();
      if (s.kind === 'waygate' && rec.waygates[s.id] && this._theoryKey() === 'portal') return `step through the ${s.name}`;
      return `${s.name}: resting (studied today)`;
    }
    return `study the ${s.name}`;
  },

  /** E at a site: an attuned waygate opens the network (portal theorists); otherwise begin the investigation. */
  _studyArcane(s) {
    const rec = this._arcaneRec();
    if (s.kind === 'waygate' && rec.waygates[s.id] && this._theoryKey() === 'portal') { this._waygateMenu(s); return; }
    if (this._arcaneRestingDays(s) > 0) {
      this._floatText(this.world.x, this.world.y - 40, 'It has given up what it can today.', '#bdbdbd');
      return;
    }
    if (this._arcaneStudy) return;
    if (this._fightRecent && this._fightRecent(4)) { this._floatText(this.world.x, this.world.y - 40, 'Not in the middle of a fight.', '#ef9a9a'); return; }
    this._arcaneStudy = { site: s, t: ARCANE_STUDY_S, total: ARCANE_STUDY_S, x: this.world.x, y: this.world.y, hp: this.player.hp };
    this._floatText(this.world.x, this.world.y - 44, `You begin to study the ${s.name}`, '#e1bee7');
  },

  _tickArcaneStudy(dt) {
    const c = this._arcaneStudy;
    if (!c) return;
    if (Math.hypot(this.world.x - c.x, this.world.y - c.y) > 24 || this.player.hp < c.hp - 0.5) {
      this._arcaneStudy = null;
      if (this._castBar) this._castBar.setVisible(false);
      if (this._castBarText) this._castBarText.setVisible(false);
      this._floatText(this.world.x, this.world.y - 44, 'The study is broken off.', '#ef9a9a');
      return;
    }
    c.t -= dt;
    if (this._drawCastBar) { this._castBar && this._castBar.setVisible(true); this._castBarText && this._castBarText.setVisible(true); this._drawCastBar({ t: Math.max(0, c.t), total: c.total, name: `Studying: ${c.site.name}`, color: '#e1bee7' }); }
    if (c.t > 0) return;
    this._arcaneStudy = null;
    if (this._castBar) this._castBar.setVisible(false);
    if (this._castBarText) this._castBarText.setVisible(false);
    this._arcanePuzzleState = { site: c.site, step: 0, right: 0, steps: arcanePuzzle(c.site.id, this._dayIndex ? this._dayIndex() : 0) };
    this._arcanePuzzlePage();
  },

  /** One reading of the puzzle: three glyphs, the theory's help shown on them. */
  _arcanePuzzlePage() {
    const st = this._arcanePuzzleState;
    if (!st) return;
    const s = st.site, step = st.steps[st.step];
    const sb = this._theorySb();
    const help = arcaneHelp(sb, s.kind, st.step);
    const theory = THEORIES[s.theory];
    let strike = -1;
    if (help === 'narrow') {
      const wrong = [0, 1, 2].filter(i => i !== step.answer);
      strike = wrong[(st.step + s.id.length) % 2];
    }
    const choices = step.options.map((gl, i) => {
      let label = `<span style="font-size:20px">${gl}</span>`;
      if (help === 'answer' && i === step.answer) label += ' <span style="font-size:11px;color:#ffd54f">(your training reads it)</span>';
      if (i === strike) label = `<span style="opacity:0.35;text-decoration:line-through">${label}</span>`;
      return { act: `theory|glyph|${i}`, label };
    }).filter((c, i) => i !== strike);
    const why = help === 'answer' ? `Your ${theory.name} reads this plainly.`
      : help === 'narrow' ? 'Your grounding in ritual magic rules one glyph out. The rest is beyond you.'
      : sb.theory ? 'Your own theory does not reach this; you will have to guess.'
      : 'Without a magical theory, it is guesswork.';
    this._openDialogue(s.name, `Reading ${st.step + 1} of 3. Which glyph closes the pattern?\n\n${why}`, null, choices);
  },

  _arcaneGlyph(i) {
    const st = this._arcanePuzzleState;
    if (!st) return;
    if (i === st.steps[st.step].answer) st.right++;
    st.step++;
    if (st.step < 3) { this._arcanePuzzlePage(); return; }
    this._arcanePuzzleState = null;
    this._arcaneResolve(st.site, st.right);
  },

  /** The study's end: the reward, and the matching theory's own outcome. */
  _arcaneResolve(s, right) {
    const rec = this._arcaneRec();
    rec.studied[s.id] = this._dayIndex ? this._dayIndex() : 0;
    const sb = this._theorySb();
    const matching = sb.theory === s.theory;
    const rw = arcaneReward(s.regionIndex, right, matching, sb.theoryRank);
    const lines = [`${right} of 3 readings right.`];
    if (rw.coins > 0) { grantCoins(this.player.coins, 'normal', rw.coins); lines.push(`You recover ${coinText(rw.coins)} in offerings and old coin.`); }
    else lines.push('The pattern closes against you. The site rests until tomorrow.');
    this._arcaneStudies = (this._arcaneStudies || 0) + 1;
    const choices = [];
    if (rw.full && matching) {
      const extra = this._arcaneOutcome(s, choices);
      if (extra) lines.push(extra);
    } else if (rw.full && !matching) {
      lines.push(`A ${THEORIES[s.theory].name} would have taken more from this place.`);
    }
    this._openDialogue(s.name, lines.join('\n\n'), null, choices);
    if (this._renderInventory) this._renderInventory();
  },

  /** Each kind's own outcome for a full success by its own theory. Returns a line; may add choices. */
  _arcaneOutcome(s, choices) {
    const p = this.player, rank = this._theoryRank();
    const rec = this._arcaneRec();
    switch (s.kind) {
      case 'aperture': {
        const id = rollStoneDrop(Math.random);
        if (id) p.inventory.stones.push(id);
        return `Something came through here and left a piece of itself: an awakening stone${rank >= 3 ? ', and the seam answers you -- your summons will feel it' : ''}.`;
      }
      case 'array': {
        rec.sensed[s.regionId] = true;
        const id = rollStoneDrop(Math.random);
        if (id) p.inventory.stones.push(id);
        return 'You tap the array. It gives up an awakening stone, and for the rest of your days you can feel where this region\'s stones and essences gather (your map shows them).';
      }
      case 'confluence': {
        const n = 1 + (rank >= 3 ? 1 : 0);
        for (let i = 0; i < n; i++) { const id = rollStoneDrop(Math.random); if (id) p.inventory.stones.push(id); }
        return `The elements part for you. ${n > 1 ? 'Two awakening stones' : 'An awakening stone'} from the seam where they meet.`;
      }
      case 'shrine': {
        const gods = Object.keys(DIVINE);
        if (gods.length && this._godStandingUp) this._godStandingUp(gods[Math.floor(Math.random() * gods.length)]);
        const bonus = Math.round(1200 * Math.pow(3, s.regionIndex) * rank);
        grantCoins(p.coins, 'normal', bonus);
        return `The old god notices you. Its favour, and ${coinText(bonus)} left at the altar long ago.`;
      }
      case 'waygate': {
        rec.waygates[s.id] = true;
        const n = Object.keys(rec.waygates).length;
        return `You wake the waygate and tune it to yourself. ${n > 1 ? `It is one of ${n} you can now step between: come back and press E here.` : 'Wake another and you can step between them.'}`;
      }
      case 'soulwell': {
        if (Math.random() < Math.min(0.9, 0.25 + 0.15 * rank)) {
          const id = rollEssenceDrop(Math.random);
          if (id) { this._dropLoot(this.world.x, this.world.y, { kind: 'essence', id }); return 'The well gives up something that was never buried: an essence, waiting to be adopted.'; }
        }
        return 'The dead here are quiet now. They leave you their thanks, which is not nothing.';
      }
      case 'lair': {
        const fams = ['wolf', 'boar', 'raptor', 'spider', 'lizard', 'bat'];
        for (let i = 0; i < 2 + rank; i++) {
          const part = partForFamily(fams[Math.floor(Math.random() * fams.length)]);
          if (part) this._dropLoot(this.world.x, this.world.y, { kind: 'part', id: part.id || part });
        }
        return 'You read the marks and find what the beast hoarded: a pile of shed parts worth selling.';
      }
      case 'stormAltar': {
        if (this._theoryPerk('weather', 'weatherCall')) {
          this._weatherCallChoices(choices, s.regionId);
          return 'The altar answers your hand. Call the weather over this region, if you wish:';
        }
        return 'You feel the sky lean toward you. At silver rank, this altar would let you call the weather.';
      }
      case 'circles': {
        rec.shut[s.id] = this._dayIndex ? this._dayIndex() : 0;
        if (p.ritualCd) for (const k of Object.keys(p.ritualCd)) delete p.ritualCd[k];
        return 'You find the thread that binds the three circles and pull it. The hostile rite collapses (the monsters near it lose their edge), and the backwash clears every one of your own ritual cooldowns.';
      }
      default: return '';
    }
  },

  // ---- the waygate network ------------------------------------------------------------------------------------------

  _waygateMenu(s) {
    const rec = this._arcaneRec();
    const others = (this.arcaneSites || []).filter(o => o.kind === 'waygate' && o.id !== s.id && rec.waygates[o.id]);
    if (!others.length) { this._openDialogue(s.name, 'The gate hums, but there is nowhere else tuned to you yet.', null); return; }
    const rn = (id) => (REGIONS.find(r => r.id === id) || {}).name || id;
    this._openDialogue(s.name, 'Where?', null, others.map(o => ({ act: `theory|gate|${o.id}`, label: `${o.name} (${rn(o.regionId)})` })));
  },

  _waygateTravel(id) {
    const o = (this.arcaneSites || []).find(x => x.id === id);
    if (!o) return;
    this._closeDialogue && this._closeDialogue();
    if (this.teleportTo) this.teleportTo(o.x + TILE * 2, o.y + TILE * 2);
    else { this.world.x = o.x + TILE * 2; this.world.y = o.y + TILE * 2; }
    this._floatText(this.world.x, this.world.y - 50, `You step out at the ${o.name}`, '#80deea');
    this._waygateTrips = (this._waygateTrips || 0) + 1;
  },

  // ---- calling the weather (weather theory, silver) ---------------------------------------------------------------

  _weatherCallChoices(choices, regionId) {
    const table = CLIMATE[regionId] || CLIMATE.nek;
    for (const id of Object.keys(table)) choices.push({ act: `theory|wx|${regionId}|${id}`, label: `${WEATHER[id].icon} ${WEATHER[id].name}` });
  },

  _weatherCall(regionId, id) {
    const p = this.player;
    const slot = weatherSlotAt(this._clockT || 0);   // ROUND 369 -- a spell is 10-20 real minutes now
    const span = 1 + Math.max(0, this._theoryRank() - 2);   // silver: this spell and the next; each rank above, one more
    (p.weatherOverride || (p.weatherOverride = {}))[regionId] = { id, untilSlot: slot + span, v: WEATHER_SLOT_VERSION };
    this._closeDialogue && this._closeDialogue();
    this._floatText(this.world.x, this.world.y - 50, `You call ${WEATHER[id].name.toLowerCase()}`, '#90caf9');
    this._weatherCalls = (this._weatherCalls || 0) + 1;
  },

  // ---- the map (natural theory) -----------------------------------------------------------------------------------

  /** Where stones and essences are gathering: the round-63 sites that are ready to hold something. Explored ones at
   *  iron; the whole region from silver, or after tapping one of its arrays. */
  _theoryMapMarks(ctx, toM, onLayer, onMap, showLabels) {
    if (!this._theoryPerk('natural', 'siteSense')) return;
    const far = !!this._theoryPerk('natural', 'siteSenseFar');
    const rec = this._arcaneRec();
    let n = 0;
    for (const s of (this.sites || [])) {
      if (!onLayer(s.x, s.y)) continue;
      if (!far && !rec.sensed[s.regionId] && this._isExplored && !this._isExplored(s.x, s.y)) continue;
      if (s.refreshT > 0) continue;
      const p = toM(s.x, s.y);
      if (!onMap(p)) continue;
      ctx.strokeStyle = '#9ccc65'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, showLabels ? 7 : 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(156,204,101,0.35)';
      ctx.beginPath(); ctx.arc(p.x, p.y, showLabels ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
      n++;
    }
    for (const s of (this.arcaneSites || [])) {
      if (!onLayer(s.x, s.y) || !s.seen) continue;
      const p = toM(s.x, s.y);
      if (!onMap(p)) continue;
      ctx.fillStyle = '#' + s.color.toString(16).padStart(6, '0');
      ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    }
    this._siteSenseCensus = n;
  },

  // ---- the Ritualist: books and the Deepening -----------------------------------------------------------------------

  _theoryRitualistChoices() {
    return [{ act: 'theory|menu', label: 'Magical theories: study one, or deepen yours' }];
  },

  _theoryMenu() {
    const sb = this._theorySb();
    const rankNow = this._rankIdxNow ? this._rankIdxNow() : 1;
    const lines = [];
    const choices = [];
    if (sb.theory) {
      const t = THEORIES[sb.theory];
      const r = sb.theoryRank || 1;
      lines.push(`You study ${t.name}, attuned to ${RANK_LABELS[RANK_ORDER[r]]} rank.`);
      for (const l of theoryPerkLines(sb.theory, r)) lines.push(`  - ${l}`);
      if (rankNow > r) {
        const to = r + 1;
        const cost = theoryDeepenCost(to);
        lines.push(`\nYou have risen past it. Deepening it to ${RANK_LABELS[RANK_ORDER[to]]} costs ${theoryDeepenLabel(to)}.`);
        choices.push({ act: 'theory|deepen', label: `Deepen to ${RANK_LABELS[RANK_ORDER[to]]} (${theoryDeepenLabel(to)})${coinPurseValue(this.player.coins) < cost ? ' -- you cannot afford it' : ''}` });
      } else if (r < 5) {
        lines.push(`\nRise to ${RANK_LABELS[RANK_ORDER[r + 1]]} rank and it can be deepened (${theoryDeepenLabel(r + 1)}).`);
      }
      if (this._theoryPerk('weather', 'weatherCall') && this.currentRegion) {
        lines.push('\nYou can call the weather of this region from here.');
        this._weatherCallChoices(choices, this.currentRegion.id);
      }
    } else {
      lines.push('Nine magical theories. Read one and you have ritual magic; you can only ever study one. 40 iron coins each.');
      for (const k of THEORY_KEYS) {
        const t = THEORIES[k];
        lines.push(`\n${t.name}: ${t.domain}. ${t.grants}`);
        choices.push({ act: `theory|buy|${k}`, label: `Buy: ${t.name} (40 iron)` });
      }
    }
    this._openDialogue('Ritualist', lines.join('\n'), null, choices);
  },

  _theoryBuy(key) {
    const b = theoryBook(key);
    if (!b) return;
    const p = this.player;
    if (this._theorySb().theory) { this._floatText(this.world.x, this.world.y - 40, 'You already study a magical theory.', '#ef9a9a'); return; }
    if ((p.bookBag || []).includes(b.id)) { this._floatText(this.world.x, this.world.y - 40, 'You are already carrying it.', '#ef9a9a'); return; }
    if (!spendCoins(p.coins, b.price)) { this._floatText(this.world.x, this.world.y - 40, 'You cannot afford it.', '#ef9a9a'); return; }
    (p.bookBag || (p.bookBag = [])).push(b.id);
    this._floatText(this.world.x, this.world.y - 44, `Bought: ${b.name}. Read it here (Inventory) to begin the rite.`, '#ffd54f');
    if (this._renderInventory) this._renderInventory();
  },

  /** The Deepening of a theory: paid for, then a rite (the skill-book rite's 'theoryDeepen' mode). */
  _theoryDeepen() {
    const sb = this._theorySb();
    if (!sb.theory) return false;
    const to = (sb.theoryRank || 1) + 1;
    const rankNow = this._rankIdxNow ? this._rankIdxNow() : 1;
    if (to > rankNow || to > 5) { this._floatText(this.world.x, this.world.y - 40, 'You have not risen far enough.', '#ef9a9a'); return false; }
    const cost = theoryDeepenCost(to);
    const why = this._bookRiteRefusal ? this._bookRiteRefusal() : null;
    if (why) { this._floatText(this.world.x, this.world.y - 40, why, '#ef9a9a'); return false; }
    if (coinPurseValue(this.player.coins) < cost) { this._floatText(this.world.x, this.world.y - 40, `It costs ${theoryDeepenLabel(to)}.`, '#ef9a9a'); return false; }
    // ROUND 358 -- "non-combat rituals all become a fixed 30 seconds": the deepening is a thirty-second rite now, not an
    // instant purchase. The coin is taken when it lands (`_theoryDeepenComplete`).
    return this._beginBookRite ? this._beginBookRite('tdeepen', null) : this._theoryDeepenComplete();
  },

  /** The deepening rite has landed: pay, and the theory climbs a rank. */
  _theoryDeepenComplete() {
    const sb = this._theorySb();
    if (!sb.theory) return false;
    const to = (sb.theoryRank || 1) + 1;
    const rankNow = this._rankIdxNow ? this._rankIdxNow() : 1;
    if (to > rankNow || to > 5) return false;
    const cost = theoryDeepenCost(to);
    if (!spendCoins(this.player.coins, cost)) { this._floatText(this.world.x, this.world.y - 40, `It costs ${theoryDeepenLabel(to)}.`, '#ef9a9a'); return false; }
    this.player.skillBooks.theoryRank = to;
    this.player.skillBooks.theory = sb.theory;
    this._recomputeDerivedStats && this._recomputeDerivedStats();
    this._floatText(this.world.x, this.world.y - 50, `${THEORIES[sb.theory].name} deepens to ${RANK_LABELS[RANK_ORDER[to]]}`, '#b39ddb');
    this._theoryDeepens = (this._theoryDeepens || 0) + 1;
    return true;
  },

  // ---- a soul attack in conversation (soul theory, bronze) ---------------------------------------------------------

  _theoryTalkChoices(npc) {
    if (!npc || npc.monster || !this._theoryPerk('soul', 'soulConverse')) return [];
    const key = this._soulTalkKey(npc);
    if ((this._soulPressed || (this._soulPressed = new Set())).has(key)) return [];
    return [{ act: `theory|soul|${encodeURIComponent(key)}`, label: 'Press them with your soul' }];
  },
  _soulTalkKey(npc) { return `${npc.name || 'someone'}@${Math.round(npc.x || 0)},${Math.round(npc.y || 0)}`; },

  /** A soul attack in conversation: the person gives up something they would not have. A case witness gives up the
   *  truth about their own statement; anyone else, a small secret worth a little coin -- or nothing, and a grudge. */
  _soulPress(key) {
    // ROUND 359 (6.1) -- pressing on another's soul spends your own (and is a soul event)
    if (this._soulSpend && !this._soulSpend()) {
      this._openDialogue('Your soul', 'Your soul is too worn to press anyone. Rest, and it will come back.', this._lastTalkNpc);
      return;
    }
    if (this._soulEvent) this._soulEvent('pressed a soul');
    (this._soulPressed || (this._soulPressed = new Set())).add(key);
    const npc = this._lastTalkNpc;
    const name = (npc && npc.name) || 'They';
    const rank = this._theoryRank();
    let text;
    const w = npc && npc.caseWitness;
    const q = w && (this.player.quests || []).find(x => x.id === w.questId);
    const def = q && this._caseDef ? this._caseDef(q) : null;
    if (w && def) {
      npc.caseSoulRead = true;
      const truthful = (def.supports || []).includes(w.clue);
      text = `${name} buckles under the weight of your soul. ${truthful ? 'What they told you is the truth, and they are frightened of it.' : 'What they told you is not the truth -- they may believe it, but it points the wrong way.'}`;
    } else if (Math.random() < 0.35 + 0.1 * rank) {
      const n = Math.round(300 * Math.pow(3, Math.max(0, (this.currentRegion && this.currentRegion.index) || 0)) * rank);
      grantCoins(this.player.coins, 'normal', n);
      text = `${name} flinches and tells you where they hid something they should not have. You find ${coinText(n)} there.`;
    } else {
      text = `${name} goes white and says nothing at all. They will remember this.`;
    }
    this._soulPresses = (this._soulPresses || 0) + 1;
    this._openDialogue(name, text, null);
  },

  // ---- the one dispatcher for every 'theory|...' button -------------------------------------------------------------

  _theoryAct(act) {
    const [, verb, a, b] = String(act).split('|');
    if (verb === 'menu') return this._theoryMenu();
    if (verb === 'buy') { this._closeDialogue && this._closeDialogue(); return this._theoryBuy(a); }
    if (verb === 'deepen') { this._closeDialogue && this._closeDialogue(); return this._theoryDeepen(); }
    if (verb === 'glyph') return this._arcaneGlyph(Number(a));
    if (verb === 'gate') return this._waygateTravel(a);
    if (verb === 'wx') return this._weatherCall(a, b);
    if (verb === 'soul') return this._soulPress(decodeURIComponent(a || ''));
    this._closeDialogue && this._closeDialogue();
    return null;
  },
};
