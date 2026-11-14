// ============================================================================
// ROUND 427 -- SOFTCORE AND PERMADEATH, IN THE SCENE.
//
// data/gameModes427.js holds the rules and the words. This file:
//
//   THE CHOICE      a row in the character creator, open only while a new run
//                   is being made (the Keeper is up); locked after, and shown
//   THE RELIQUARY   one per mode. A permadeath character can only take from
//                   its own; what fills it is the essence a dead one leaves
//   PERMADEATH      a death opens the dying window (the player's rank). A
//                   healer companion within reach runs to the body and brings
//                   the player back; otherwise the character is gone: one
//                   random bonded essence goes to the reliquary, the saves are
//                   erased and the seed is buried so no copy loads
//   COMPANIONS      in permadeath a companion who goes down is DYING for their
//                   rank's window. A Draught of the Second Breath, a heal cast
//                   beside them, or a healer companion standing by saves them;
//                   otherwise they are dead for good
//   SOFTCORE        the bag at the body carries the purse too (WorldScene's
//                   _dropDeathBag), and every death is counted
//   THE CHURCH      the count turns Death's priests: a warning, rudeness,
//                   "aberration", a gold Warden in their temple at 300%, then
//                   attack on sight; past a hundred, the priests of Undeath
//                   come recruiting
//
// The hostile priests are PEOPLE on `_banditFolk` (round 274's rule): the
// swing, the targeting and the loot already know them. `deathChurch` keeps the
// road-crew AI's hands off them; this file moves them.
// ============================================================================
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { RANK_ORDER } from '../data/ranks.js';
import { hunterStats, hunterRankIdx } from '../data/hunters.js';
import { readSave, deleteSave, SAVE_SLOTS, AUTOSAVE_SLOT } from '../data/saves.js';
import { loadVault, saveVault, vaultDeposit } from '../data/vault.js';
import { ESSENCES } from '../data/abilities.js';
import { spendCoins, coinPurseValue } from '../data/inventory.js';
import { roomTileCentre } from '../data/interiors.js';
import { undeathForm } from '../data/undeath.js';
import {
  GAME_MODES, MODE_LABEL, MODE_BLURB, modeOf, rescueWindow, RESCUE_CHANNEL_S, HEALER_SAVE_TILES, HEALER_REACH_TILES,
  RESCUE_HP_FRAC, HEAL_SAVE_TILES, POTION_SAVE_TILES, VAULT_KEY_PERMADEATH, vaultKeyFor, vaultTakesDeposits,
  inheritedEssence, GRAVES_KEY, normaliseGraves, isBuried, SECOND_BREATH_ID, SECOND_BREATH_DEF, SECOND_BREATH_PRICE,
  SECOND_BREATH_PER_DAY, churchTier, CHURCH_TIER_NOTICE, CHURCH_LINES, WARDEN, ON_SIGHT_RETURN_DAYS, ON_SIGHT_TILES,
  FOE_GIVE_UP_TILES, UNDEATH_RECRUIT, dyingLine, finalLine,
} from '../data/gameModes427.js';

const HEALER_SPEED = 227;   // PARTY_SPEED: a companion's walk
const RECRUITER_SPEED = 130;
const pickOf = (arr, seed) => arr[Math.abs(Math.floor(seed)) % arr.length];
const essName = (id) => (ESSENCES[id] && ESSENCES[id].name) || String(id || '').replace(/^ess/, '');

function readGraves() {
  try { return normaliseGraves(JSON.parse(window.localStorage.getItem(GRAVES_KEY) || '[]')); } catch (e) { return []; }
}
function writeGraves(g) {
  try { window.localStorage.setItem(GRAVES_KEY, JSON.stringify(normaliseGraves(g))); return true; } catch (e) { return false; }
}

export const GameModeMixin = {
  // ================================================================ the mode
  _gmMode() { return modeOf(this.player); },
  _gmIsPD() { return modeOf(this.player) === 'permadeath'; },
  _gmState() {
    const p = this.player;
    p.deathChurch = p.deathChurch || { recruitT: UNDEATH_RECRUIT.firstAfterS, unburied: false, wardenSlainDay: null, breathDay: null, breathBought: 0 };
    return p.deathChurch;
  },
  _gmDay() { return this._dayIndex ? this._dayIndex() : 0; },

  /** A new run (`_titleNewGame`, before the prologue): softcore until the creator says otherwise, no deaths, no church. */
  _gmNewRun() {
    const p = this.player;
    if (!p) return;
    p.gameMode = 'softcore';
    p.softDeaths = 0;
    p.deathChurch = null;
    p.pdFallen = [];
  },

  /** The creator's row. Open while the Keeper is up (a new run); afterwards it shows the mode and cannot change it. */
  _gmRenderCreatorMode() {
    const panel = document.getElementById('characterCreatorPanel');
    if (!panel || !this.player) return;
    let el = document.getElementById('creatorMode');
    if (!el) {
      el = document.createElement('div');
      el.id = 'creatorMode';
      // Above the blessing, in its style: the first thing a new run asks after who you are.
      el.style.cssText = 'margin:10px 0 0;border-top:1px solid var(--ui-brass);padding-top:8px;';
      const bless = document.getElementById('creatorBlessing');
      panel.insertBefore(el, bless && bless.parentElement === panel ? bless : null);
      el.addEventListener('click', (ev) => {
        const b = ev.target.closest('button[data-gmmode]');
        if (!b || b.disabled) return;
        this._gmSetMode(b.dataset.gmmode);
      });
    }
    const mode = modeOf(this.player);
    const open = !!this._keeperOpen;
    el.innerHTML = '<div style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.85;">How You Play</div>'
      + `<div style="display:flex;gap:8px;margin:6px 0;">${GAME_MODES.map(m => `<button class="action-btn${m === mode ? ' tab-active' : ''}" data-gmmode="${m}" ${open ? '' : 'disabled'}${m === mode ? ' style="outline:2px solid #ffd54f;"' : ''}>${MODE_LABEL[m]}</button>`).join('')}</div>`
      + `<div id="creatorModeNote" style="font-size:11.5px;opacity:.7;margin:2px 0 4px;">${MODE_BLURB[mode]}${open ? ' Chosen now; it cannot be changed once you begin.' : ' It cannot be changed.'}</div>`;
  },
  _gmSetMode(m) {
    if (!this._keeperOpen || !GAME_MODES.includes(m) || !this.player) return false;
    this.player.gameMode = m;
    if (!this.player.charSeed) this.player.charSeed = Math.floor(Math.random() * 1e9).toString(36);
    this._gmRenderCreatorMode();
    return true;
  },

  // ============================================================ the reliquary
  _vaultKey() { return vaultKeyFor(this._gmMode()); },
  /** A permadeath reliquary is taken from, never filled by hand. */
  _gmVaultLocked() { return !vaultTakesDeposits(this._gmMode()); },
  _gmVaultNote() {
    return this._gmVaultLocked()
      ? 'The permadeath reliquary is filled only by the dead: each one leaves a single bonded essence here. You can take from it, not store in it.'
      : '';
  },

  // ===================================================== saves and the graves
  _gmLoadRefused(save) {
    const sp = save && save.player;
    if (!sp || sp.gameMode !== 'permadeath') return false;
    if (!isBuried(readGraves(), sp.charSeed)) return false;
    const head = typeof document !== 'undefined' ? document.getElementById('titleSlotsHead') : null;
    if (head) head.textContent = `${sp.name || 'That character'} is dead. Permadeath saves cannot be loaded.`;
    return true;
  },
  _gmBury(p) {
    const g = readGraves();
    const seed = p.charSeed || `${p.name}|${Date.now()}`;
    g.push({ seed, name: p.name || 'Wanderer', rank: p.rank || 'normal', at: Date.now() });
    return writeGraves(g);
  },
  /** Every save of this character, manual and auto. Matched by its seed (and by name for one that never had a seed). */
  _gmEraseSaves(p) {
    let n = 0;
    for (const slot of [...Array.from({ length: SAVE_SLOTS }, (_, i) => i), AUTOSAVE_SLOT]) {
      const s = readSave(slot);
      const sp = s && s.player;
      if (!sp || sp.gameMode !== 'permadeath') continue;
      const same = p.charSeed ? sp.charSeed === p.charSeed : (!sp.charSeed && sp.name === p.name);
      if (same && deleteSave(slot)) n++;
    }
    return n;
  },

  // ======================================================= the player's death
  /** End of `_triggerDeath`. Softcore counts; permadeath opens the dying window. */
  _gmAfterDeath() {
    const p = this.player;
    if (!this._gmIsPD()) {
      const before = churchTier(p.softDeaths || 0);
      p.softDeaths = (p.softDeaths || 0) + 1;
      const after = churchTier(p.softDeaths);
      this._gmTierNotice = after > before ? CHURCH_TIER_NOTICE[after] : null;
      this._deathCountdownSuffix = `${this._deathCountdownSuffix || ''} · death ${p.softDeaths}`;
      const cd = document.getElementById('deathCountdown');
      if (cd) cd.textContent = `Respawning in town in ${Math.ceil(p.deathT || 0)}s...${this._deathCountdownSuffix}`;
      return;
    }
    const healer = this._gmHealerForPlayer();
    const win = rescueWindow(p.rank || 'normal');
    this._pdDying = { t: win, total: win, healer, chT: 0, landT: 0, phase: healer ? 'rescue' : 'alone' };
    document.getElementById('deathTitle').textContent = `${p.name} is dying`;
    const scr = document.getElementById('deathScreen');
    if (scr && healer) scr.style.background = 'rgba(40,0,0,0.35)';
    this._gmDyingText();
  },
  _gmDyingText() {
    const d = this._pdDying;
    const cd = document.getElementById('deathCountdown');
    if (!d || !cd) return;
    cd.textContent = dyingLine(d.healer ? d.healer.name : null, Math.max(0, Math.ceil(d.t)));
  },
  /** A healer companion, up, in the party, near enough to run to the body. */
  _gmHealerForPlayer() {
    let best = null, bd = Infinity;
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      if (m.role !== 'healer' || m.downT > 0 || !(m.hp > 0) || m.pdDead || m.benched) continue;
      const d = Math.hypot(m.x - this.world.x, m.y - this.world.y);
      if (d <= HEALER_REACH_TILES * TILE && d < bd) { best = m; bd = d; }
    }
    return best;
  },
  /** From `_updateDeathCountdown`: true while permadeath owns the death. */
  _gmDeathTick(dt) {
    if (this._pdFinal) return true;
    const d = this._pdDying;
    if (!d) return false;
    if (d.phase === 'alone') {
      // the buckle plays out, then it is over
      d.landT += dt;
      if (d.landT >= 1.6) this._gmFinalDeath();
      return true;
    }
    d.t -= dt;
    const m = d.healer;
    if (!m || m.downT > 0 || !(m.hp > 0) || m.pdDead || !m.recruited) {
      d.healer = null; d.phase = 'alone'; d.landT = 1.6;
      this._gmDyingText();
      return true;
    }
    const dx = this.world.x - m.x, dy = this.world.y - m.y, dist = Math.hypot(dx, dy) || 1;
    if (dist > 30) {
      const step = Math.min(dist - 24, HEALER_SPEED * dt);
      m.x += (dx / dist) * step; m.y += (dy / dist) * step;
      m.facing = facingFromMove(dx, dy) || m.facing;
      d.chT = 0;
    } else {
      d.chT += dt;
      if (d.chT >= RESCUE_CHANNEL_S) { this._gmRevivePlayer(m); return true; }
    }
    if (this._drawPartyMember) this._drawPartyMember(m, dt);
    if (d.t <= 0) { this._gmFinalDeath(); return true; }
    this._gmDyingText();
    return true;
  },
  _gmRevivePlayer(m) {
    const p = this.player;
    this._pdDying = null;
    p.dead = false;
    this._deathAnim = null;
    this._playerTextureState = null;
    if (this._clearDebuffs) this._clearDebuffs(p);
    p.debuffDR = {};
    if (this._recomputeDerivedStats) this._recomputeDerivedStats();
    p.hp = Math.max(1, Math.round(p.maxHp * RESCUE_HP_FRAC));
    p.invuln = 2;
    const scr = document.getElementById('deathScreen');
    if (scr) { scr.style.display = 'none'; scr.style.background = ''; }
    this._floatText(this.world.x, this.world.y - 70, `${m.name} pulls you back`, '#a5d6a7');
    if (this._sayOverhead) this._sayOverhead(m, 'Not today. Breathe.', '#a5d6a7', 3);
    this._pdRescues = (this._pdRescues || 0) + 1;
  },
  /** It is over. One bonded essence to the permadeath reliquary, the saves erased, the seed buried. */
  _gmFinalDeath() {
    const p = this.player;
    this._pdDying = null;
    const ess = inheritedEssence(p.slotEssence);
    let kept = false;
    if (ess) {
      const v = loadVault(VAULT_KEY_PERMADEATH);
      kept = vaultDeposit(v, 'essences', ess, 1) === 1 && saveVault(v, VAULT_KEY_PERMADEATH);
    }
    this._gmBury(p);
    const erased = this._gmEraseSaves(p);
    this._pdFinal = { ess: kept ? ess : null, erased, name: p.name };
    p.pdGone = true;
    const scr = document.getElementById('deathScreen');
    if (scr) { scr.style.display = 'flex'; scr.style.background = 'rgba(14,10,10,0.97)'; }
    document.getElementById('deathTitle').textContent = `${p.name} is dead`;
    const cd = document.getElementById('deathCountdown');
    if (cd) cd.textContent = finalLine(kept ? essName(ess) : null);
    let btn = document.getElementById('pdBeginAgain');
    if (!btn && scr) {
      btn = document.createElement('button');
      btn.id = 'pdBeginAgain';
      btn.className = 'action-btn';
      btn.style.cssText = 'margin-top:22px;font-size:16px;padding:8px 22px;';
      scr.appendChild(btn);
    }
    if (btn) {
      btn.textContent = 'Begin again';
      btn.style.display = '';
      // A clean page is a clean character: New Game never replaces `this.player` (vault.js's header), and a dead
      // permadeath character must not leak a single field into the next run.
      btn.onclick = () => { try { window.location.reload(); } catch (e) { /* nothing */ } };
    }
  },

  /** Loading another character after a permadeath ended: the end screen goes, and the load puts the new one down. */
  _gmBeforeLoad() {
    if (!this._pdFinal && !this._pdDying) return;
    this._pdFinal = null;
    this._pdDying = null;
    const btn = typeof document !== 'undefined' ? document.getElementById('pdBeginAgain') : null;
    if (btn) btn.style.display = 'none';
    const scr = typeof document !== 'undefined' ? document.getElementById('deathScreen') : null;
    if (scr) scr.style.background = '';
    if (this.player) { delete this.player.pdGone; if (this.player.dead && this._respawnPlayer) this._respawnPlayer(); }
  },

  // ============================================================== companions
  /** Right after a companion's health hits zero (`m.downT = 14`). Permadeath: dying, for their rank's window. */
  _gmCompanionDown(m) {
    if (!this._gmIsPD() || !m) return;
    m.downT = rescueWindow(m.rank || 'iron');
    m.pdDying = true;
    m.pdSaveT = 0;
    this._floatText(m.x, m.y - 70, `${m.name} is dying: ${Math.ceil(m.downT)}s to save them`, '#ef5350');
  },
  _gmSaveCompanion(m, how) {
    if (!m || !m.pdDying && !(m.downT > 0)) return false;
    m.pdDying = false;
    m.downT = 0;
    m.pdSaveT = 0;
    m.hp = Math.max(1, Math.round((m.maxHp || 1) * RESCUE_HP_FRAC));
    m.downAnimT = 0;
    this._floatText(m.x, m.y - 60, `${m.name} is back on their feet${how ? ` (${how})` : ''}`, '#a5d6a7');
    this._pdCompSaves = (this._pdCompSaves || 0) + 1;
    return true;
  },
  _gmCompanionDies(m) {
    if (!m) return;
    m.pdDying = false;
    m.pdDead = true;
    m.recruited = false;
    m.benched = true;
    m.dismissed = false;
    m.hp = 0; m.downT = 0; m.target = null;
    if (m.sprite) m.sprite.setVisible(false);
    if (m._npcEntry) m._npcEntry.hidden = true;
    const p = this.player;
    (p.pdFallen = p.pdFallen || []).push({ id: m.id, name: m.name, day: this._gmDay() });
    this._floatText(m.x, m.y - 60, `${m.name} is dead`, '#ef5350');
    this._floatText(this.world.x, this.world.y - 84, `${m.name} is gone. Permadeath keeps no one.`, '#ef9a9a');
    if (this._updateRetinue) this._updateRetinue();
    if (this._refreshTeamTabButton) this._refreshTeamTabButton();
  },
  /** A heal the player cast (from the cast riders): in permadeath it reaches a dying companion close by. */
  _gmHealCast(a) {
    if (!a || !this._gmIsPD()) return;
    const heals = a.template === 'selfHeal' || a.template === 'selfHot' || a.healAmount > 0 || a.hotPerSec > 0 || !!a.hot || a.healOnUse > 0;
    if (!heals) return;
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      if (!m.pdDying) continue;
      if (Math.hypot(m.x - this.world.x, m.y - this.world.y) > HEAL_SAVE_TILES * TILE) continue;
      this._gmSaveCompanion(m, a.name || 'healed');
    }
  },
  /** The draught, from `_useConsumable`. The nearest fallen companion in reach gets up; with none, it is not drunk. */
  _gmUseSecondBreath(bagIdx) {
    const p = this.player;
    let best = null, bd = Infinity;
    for (const m of (this._activeParty ? this._activeParty() : [])) {
      if (!(m.downT > 0) || m.pdDead) continue;
      const d = Math.hypot(m.x - this.world.x, m.y - this.world.y);
      if (d <= POTION_SAVE_TILES * TILE && d < bd) { best = m; bd = d; }
    }
    if (!best) {
      this._floatText(this.world.x, this.world.y - 40, 'No fallen companion close enough to use it on', '#ffcc80');
      return false;
    }
    p.inventory.consumables.splice(bagIdx, 1);
    if (this._dsBreak) this._dsBreak('avarice', 'You used a draught on a companion.');   // ROUND 428 -- Avarice's secret
    this._gmSaveCompanion(best, SECOND_BREATH_DEF.name);
    if (this._renderInventory) this._renderInventory();
    return true;
  },

  // ============================================================ the church
  _gmChurchTier() { return this._gmIsPD() ? 0 : churchTier((this.player && this.player.softDeaths) || 0); },
  /** What a priest of Death says first, or `{ refuse }` when they will not speak. Null for anyone else. */
  _gmPriestLine(pr) {
    if (!pr || pr.god !== 'death') return null;
    const t = this._gmChurchTier();
    if (t <= 0) return null;
    const seed = this._gmDay() * 7 + ((this.player && this.player.softDeaths) || 0);
    if (t === 1) return { text: `"${pickOf(CHURCH_LINES.warn, seed)}"` };
    if (t === 2) return { text: `"${pickOf(CHURCH_LINES.rude, seed)}"` };
    return { refuse: true, text: `"${pickOf(CHURCH_LINES.hostile, seed)}"` };
  },
  /** The Temple of Healing keeps a draught or two. */
  _gmPriestChoices(pr) {
    if (!pr || pr.god !== 'healing') return { body: null, choices: [] };
    const st = this._gmState();
    const day = this._gmDay();
    const left = st.breathDay === day ? Math.max(0, SECOND_BREATH_PER_DAY - (st.breathBought || 0)) : SECOND_BREATH_PER_DAY;
    const body = `\n[${SECOND_BREATH_DEF.name}] "${left > 0 ? 'We keep one back for those who travel with others. It is not cheap; neither is a friend.' : 'That was the last one today. Come back tomorrow.'}"`;
    return { body, choices: left > 0 ? [{ label: `Buy ${SECOND_BREATH_DEF.name} (${SECOND_BREATH_PRICE / 100} iron)`, act: 'gm|buyBreath' }] : [] };
  },
  _gmBuyBreath() {
    const p = this.player, st = this._gmState(), day = this._gmDay();
    if (st.breathDay !== day) { st.breathDay = day; st.breathBought = 0; }
    if ((st.breathBought || 0) >= SECOND_BREATH_PER_DAY) return false;
    if (coinPurseValue(p.coins) < SECOND_BREATH_PRICE || !spendCoins(p.coins, SECOND_BREATH_PRICE)) {
      this._openDialogue("Healing's priest", '"You are short. I am sorry. I truly am."');
      return false;
    }
    st.breathBought = (st.breathBought || 0) + 1;
    (p.inventory.consumables = p.inventory.consumables || []).push(SECOND_BREATH_ID);
    this._openDialogue("Healing's priest", `"Keep it close, and hope you never open it."\n\n(${SECOND_BREATH_DEF.name} added to your pack.)`);
    if (this._renderInventory) this._renderInventory();
    return true;
  },
  _gmAct(act) {
    const parts = String(act).split('|');
    if (parts[1] === 'buyBreath') { this._gmBuyBreath(); return; }
    if (parts[1] === 'ud') { this._gmRecruitAnswer(parts[2]); return; }
  },

  /** Every priest of Death the player could meet: the temple's, and the roadside ones. */
  _gmDeathPriests() {
    const out = [];
    for (const pr of (this.priests || [])) if (pr.god === 'death') out.push(pr);
    for (const pr of (this.roadPriests || [])) if (pr.god === 'death') out.push(pr);
    return out;
  },
  _gmPriestHere(pr) {
    if (pr.interior) return !!(this._insideRoom && this._insideRoom.id === pr.interior);
    return !this._insideRoom;
  },
  _gmHidePriest(pr, hide) {
    pr.hidden = !!hide;
    if (pr.sprite && !pr.roadPriest) pr.sprite.setVisible(!hide);
    if (!hide) pr._gmHiddenDay = null;
  },

  /** A hostile person, on the shared list. */
  _gmMakeFoe(o) {
    const key = this.textures.exists(o.artKey) ? o.artKey : (this.textures.exists('npc_priest_m_death') ? 'npc_priest_m_death' : null);
    if (!key) return null;
    const art = NPC_ART[key] || { footX: 32, footY: 63, scale: 1 };
    const pt = isoProject(o.x, o.y);
    const sprite = this.add.sprite(pt.x, pt.y, key, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale((art.scale || 1) * (o.scale || 1));
    sprite.setDepth(isoDepth(o.x, o.y));
    const ri = Math.max(0, Math.min(4, o.rankIdx));
    const st = hunterStats(ri, true);
    const hp = Math.round(st.hp * (o.mult || 1));
    const c = {
      uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
      deathChurch: o.kind, src: o.src || null, name: o.name, sprite, artKey: key, texKey: key, which: 0,
      tier: ri, rank: RANK_ORDER[ri], rankLevel: 5,
      x: o.x, y: o.y, hp, maxHp: hp, damage: Math.round(st.dmg * (o.mult || 1)), speed: st.speed,
      alive: true, hostile: true, swingT: 0.9, room: this._insideRoom ? this._insideRoom.id : null,
    };
    (this._banditFolk = this._banditFolk || []).push(c);
    return c;
  },
  _gmFoes() { return (this._banditFolk || []).filter(c => c.deathChurch && c.alive && !c.despawned); },
  _gmDespawnFoe(c) {
    c.alive = false; c.despawned = true;
    if (c.sprite) c.sprite.destroy();
    if (c.src && c.deathChurch === 'onSight') this._gmHidePriest(c.src, false);
  },
  /** From `_hitOneBandit`, when one falls. */
  _gmFoeKilled(c) {
    if (c.deathChurch === 'warden') {
      this._gmState().wardenSlainDay = this._gmDay();
      this._floatText(this.world.x, this.world.y - 70, 'The Warden falls. The Church will send another.', '#ffd54f');
    }
    this._dcKills = (this._dcKills || 0) + 1;
  },
  _gmMoveFoe(c, dt) {
    const here = this._insideRoom ? this._insideRoom.id : null;
    if (c.room !== here) { this._gmDespawnFoe(c); return; }
    const dx = this.world.x - c.x, dy = this.world.y - c.y, d = Math.hypot(dx, dy) || 1;
    if (d > FOE_GIVE_UP_TILES * TILE) { this._gmDespawnFoe(c); return; }
    if (this.player.dead) return;
    if (d > 28) {
      if (!here && this._personStep) this._personStep(c, this.world.x, this.world.y, c.speed * dt);
      else {
        const step = Math.min(d - 24, c.speed * dt);
        const nx = c.x + (dx / d) * step, ny = c.y + (dy / d) * step;
        if (!this._collidesObstacle || !this._collidesObstacle(nx, ny, 10)) { c.x = nx; c.y = ny; }
      }
      const p = isoProject(c.x, c.y);
      c.sprite.setPosition(p.x, p.y);
      c.sprite.setDepth(isoDepth(c.x, c.y));
      if (this._npcWalkFrame) this._npcWalkFrame(c, c.artKey, facingFromMove(dx, dy) || 'south', true, dt);
    } else {
      if (this._npcWalkFrame) this._npcWalkFrame(c, c.artKey, facingFromMove(dx, dy) || 'south', false, dt);
      c.swingT = (c.swingT || 0) - dt;
      if (c.swingT <= 0) {
        c.swingT = 1.2;
        this._monsterHitPlayer(this._personFace(c, 'bandit'), c.damage, false);
      }
    }
  },

  /** The Warden waits in Death's temple from 21 deaths, unless slain in the last few days. */
  _gmWardenTick() {
    const room = this._insideRoom;
    if (!room || room.templeGod !== 'death' || this._gmChurchTier() < 4) return;
    if (this._gmFoes().some(c => c.deathChurch === 'warden')) return;
    const st = this._gmState();
    if (st.wardenSlainDay != null && this._gmDay() - st.wardenSlainDay < WARDEN.returnDays) return;
    const at = roomTileCentre(room, Math.floor(room.w / 2) + 1, 3);
    const c = this._gmMakeFoe({ kind: 'warden', artKey: 'npc_priest_old_death', x: at.x, y: at.y, name: WARDEN.name,
      rankIdx: WARDEN.rankIdx, mult: WARDEN.mult, scale: 1.2 });
    if (c && this._sayOverhead) this._sayOverhead(c, pickOf(CHURCH_LINES.warden, this.player.softDeaths || 0), '#ef5350', 4);
  },
  /** From 50 deaths, a priest of Death who sees you comes for you. */
  _gmOnSightTick() {
    const day = this._gmDay();
    for (const pr of this._gmDeathPriests()) {
      if (pr.hidden && pr._gmHiddenDay != null && day - pr._gmHiddenDay >= ON_SIGHT_RETURN_DAYS
        && !this._gmFoes().some(c => c.src === pr)) this._gmHidePriest(pr, false);
    }
    if (this._gmChurchTier() < 5 || this.player.dead) return;
    for (const pr of this._gmDeathPriests()) {
      if (pr.hidden || !this._gmPriestHere(pr)) continue;
      if (Math.hypot(pr.x - this.world.x, pr.y - this.world.y) > ON_SIGHT_TILES * TILE) continue;
      const rid = this.currentRegion && this.currentRegion.id;
      const c = this._gmMakeFoe({ kind: 'onSight', src: pr, artKey: pr.artKey, x: pr.x, y: pr.y,
        name: `${pr.name} (${RANK_ORDER[Math.max(1, hunterRankIdx(rid))]})`, rankIdx: Math.max(1, hunterRankIdx(rid)), mult: 1.25 });
      if (!c) continue;
      this._gmHidePriest(pr, true);
      pr._gmHiddenDay = day;
      if (this._sayOverhead) this._sayOverhead(c, pickOf(CHURCH_LINES.onSight, (this.player.softDeaths || 0) + c.uid), '#ef5350', 3.5);
    }
  },
  /** From 11 deaths, they mutter as you pass. */
  _gmBarkTick(dt) {
    if (this._gmChurchTier() < 3) return;
    const now = this.time ? this.time.now : 0;
    for (const pr of this._gmDeathPriests()) {
      if (pr.hidden || !this._gmPriestHere(pr)) continue;
      if (Math.hypot(pr.x - this.world.x, pr.y - this.world.y) > 5 * TILE) continue;
      if (pr._gmBarkAt && now - pr._gmBarkAt < 30000) continue;
      pr._gmBarkAt = now;
      if (this._sayOverhead) this._sayOverhead(pr, pickOf(CHURCH_LINES.bark, now / 1000), '#b0bec5', 2.6);
    }
  },

  // ============================================================== undeath
  _gmRecruitTick(dt) {
    const R = this._gmRecruiter;
    if (R) { this._gmMoveRecruiter(R, dt); return; }
    if (this._gmChurchTier() < 6) return;
    const st = this._gmState();
    if (st.blessed || this._insideRoom || this.player.dead || this._dialogueOpen) return;   // marked but not yet blessed: they come back to ask
    st.recruitT = (st.recruitT == null ? UNDEATH_RECRUIT.firstAfterS : st.recruitT) - dt;
    if (st.recruitT > 0) return;
    const [lo, hi] = UNDEATH_RECRUIT.gapS;
    st.recruitT = lo + Math.random() * (hi - lo);
    this._gmSpawnRecruiter();
  },
  _gmSpawnRecruiter() {
    const key = this.textures.exists('npc_cultist_man_undeath') ? 'npc_cultist_man_undeath' : (this.textures.exists('npc_cultist_man') ? 'npc_cultist_man' : null);
    if (!key) return null;
    let x = this.world.x, y = this.world.y;
    for (let a = 0; a < 14; a++) {
      const th = Math.random() * Math.PI * 2;
      x = this.world.x + Math.cos(th) * 10 * TILE; y = this.world.y + Math.sin(th) * 10 * TILE;
      if (!(this._isWaterAt && this._isWaterAt(x, y)) && !(this._collidesObstacle && this._collidesObstacle(x, y, 14))) break;
    }
    const art = NPC_ART[key] || { footX: 32, footY: 63, scale: 1 };
    const pt = isoProject(x, y);
    const sprite = this.add.sprite(pt.x, pt.y, key, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale(art.scale || 1);
    sprite.setDepth(isoDepth(x, y));
    this._gmRecruiter = { name: UNDEATH_RECRUIT.name, sprite, artKey: key, which: 0, x, y, phase: 'come', t: 0 };
    this._floatText(this.world.x, this.world.y - 64, 'Someone in grave-cloth is walking towards you', '#b39ddb');
    return this._gmRecruiter;
  },
  _gmMoveRecruiter(R, dt) {
    R.t += dt;
    const dx = this.world.x - R.x, dy = this.world.y - R.y, d = Math.hypot(dx, dy) || 1;
    const gone = () => { if (R.sprite) R.sprite.destroy(); this._gmRecruiter = null; };
    if (this._insideRoom || d > 34 * TILE || (R.phase === 'leave' && R.t > 4)) { gone(); return; }
    if (R.phase === 'come') {
      if (d > 48) {
        const step = Math.min(d - 40, RECRUITER_SPEED * dt);
        R.x += (dx / d) * step; R.y += (dy / d) * step;
        if (this._npcWalkFrame) this._npcWalkFrame(R, R.artKey, facingFromMove(dx, dy) || 'south', true, dt);
      } else if (!this._dialogueOpen) {
        if (this._npcWalkFrame) this._npcWalkFrame(R, R.artKey, facingFromMove(dx, dy) || 'south', false, dt);
        R.phase = 'talk';
        this._gmRecruitPitch();
      }
    } else if (R.phase === 'talk') {
      if (!this._dialogueOpen) { R.phase = 'leave'; R.t = 0; }
    } else {
      const step = RECRUITER_SPEED * dt;
      R.x -= (dx / d) * step; R.y -= (dy / d) * step;
      if (this._npcWalkFrame) this._npcWalkFrame(R, R.artKey, facingFromMove(-dx, -dy) || 'south', true, dt);
    }
    const p = isoProject(R.x, R.y);
    R.sprite.setPosition(p.x, p.y);
    R.sprite.setDepth(isoDepth(R.x, R.y));
  },
  _gmRecruitPitch() {
    // ROUND 427 (2) -- one who already wears the mark is offered the blessing itself
    if (this._gmState().unburied) { this._gmOfferBlessing(); return; }
    this._openDialogue(UNDEATH_RECRUIT.name, UNDEATH_RECRUIT.pitch(this.player.softDeaths || 0), null, [
      { label: 'Hear them out', act: 'gm|ud|more' },
      { label: 'Take the mark of the Unburied', act: 'gm|ud|accept' },
      { label: 'Refuse', act: 'gm|ud|refuse' },
    ]);
  },
  _gmRecruitAnswer(what) {
    const st = this._gmState();
    if (what === 'more') {
      this._openDialogue(UNDEATH_RECRUIT.name, UNDEATH_RECRUIT.more, null, [
        { label: 'Take the mark of the Unburied', act: 'gm|ud|accept' },
        { label: 'Refuse', act: 'gm|ud|refuse' },
      ]);
      return;
    }
    if (what === 'accept') {
      st.unburied = true;
      this._openDialogue(UNDEATH_RECRUIT.name, UNDEATH_RECRUIT.accept, null, [
        { label: 'Listen', act: 'gm|ud|offer' },
      ]);
    } else if (what === 'offer') {
      this._gmOfferBlessing();
    } else if (what === 'bless') {
      this._gmAcceptBlessing();
    } else if (what === 'later') {
      st.recruitT = UNDEATH_RECRUIT.afterRefuseS;
      this._openDialogue(UNDEATH_RECRUIT.god, UNDEATH_RECRUIT.notYet);
    } else {
      st.recruitT = UNDEATH_RECRUIT.afterRefuseS;
      st.refused = (st.refused || 0) + 1;
      this._openDialogue(UNDEATH_RECRUIT.name, UNDEATH_RECRUIT.refuse);
    }
  },
  /** The two words for what Undeath would make of this trio. */
  _gmUndeathFormWord() {
    const ids = (this.player.slotEssence || []).filter(Boolean);
    if (ids.length < 3) return null;
    return undeathForm(ids) === 'lich' ? 'a lich' : 'a vampire';
  },
  /** ROUND 427 (2) -- the god of Undeath offers the blessing: accept it, or not yet. */
  _gmOfferBlessing() {
    const p = this.player, st = this._gmState();
    if (st.blessed) return false;
    if (p.divineGod) { this._openDialogue(UNDEATH_RECRUIT.god, UNDEATH_RECRUIT.blessingDivine); return false; }
    const trio = (p.slotEssence || []).filter(Boolean).length >= 3;
    this._openDialogue(UNDEATH_RECRUIT.god, trio ? UNDEATH_RECRUIT.blessingOffer(this._gmUndeathFormWord()) : UNDEATH_RECRUIT.blessingNoTrio, null, [
      { label: 'Accept the blessing of the Unburied', act: 'gm|ud|bless' },
      { label: 'Not yet', act: 'gm|ud|later' },
    ]);
    return true;
  },
  /**
   * ROUND 427 (2) -- Undeath, given. The confluence slot's locked abilities are let go (a creature bonded to one of
   * its sockets and a ritual being that is out keep theirs, the round-410 rule), and the rebuild is told the confluence
   * is Undeath (awakening.js FORCED_CONFLUENCE): the same stones in the same sockets awaken again, for Undeath, in the
   * form the trio leans to. The rebuild's own check then tells the Society (outlawMixin `_restrictedCheck`).
   */
  _gmAcceptBlessing() {
    const p = this.player, st = this._gmState();
    if (st.blessed || p.divineGod) return false;
    st.unburied = true;
    st.blessed = true;
    st.blessedDay = this._gmDay();
    const keep = new Set([...Object.keys(p.wildBonds || {}),
      ...Object.entries(p.ritualSummons || {}).filter(([, r]) => r && r.summoned).map(([k]) => k)]);
    const before = Object.entries(p.knownAbilities || {}).filter(([k]) => k.startsWith('3:')).map(([k, e]) => `${k}=${e && e.ability && e.ability.name}`);
    for (const k of Object.keys(p.abilityLocked || {})) if (k.startsWith('3:') && !keep.has(k)) delete p.abilityLocked[k];
    if (this._rebuildAbilities) this._rebuildAbilities();
    this._gmBlessedWas = before;
    const trio = (p.slotEssence || []).filter(Boolean).length >= 3;
    this._openDialogue(UNDEATH_RECRUIT.god, trio ? UNDEATH_RECRUIT.blessed(this._gmUndeathFormWord()) : UNDEATH_RECRUIT.blessedLater);
    return true;
  },

  // ================================================================ the tick
  _gmOnRespawn() {
    const note = this._gmTierNotice;
    this._gmTierNotice = null;
    if (note && this.time) this.time.delayedCall(1200, () => { if (this.player && !this.player.dead) this._floatText(this.world.x, this.world.y - 80, note, '#ce93d8'); });
  },
  /** Every frame the player is alive (after the hunters). */
  _gmTick(dt) {
    const p = this.player;
    if (!p) return;
    // companions: the dead stay dead; one whose dying was ended by anything else (Immortality, a revive) was saved
    for (const m of (this.party || [])) {
      if (m.pdDead) {
        m.recruited = false; m.benched = true;
        if (m.sprite && m.sprite.visible) m.sprite.setVisible(false);
        if (m._npcEntry) m._npcEntry.hidden = true;
        continue;
      }
      if (m.pdDying && !(m.downT > 0)) { m.pdDying = false; this._floatText(m.x, m.y - 60, `${m.name} is back on their feet`, '#a5d6a7'); }
    }
    if (this._gmIsPD()) {
      // a healer companion standing by a dying companion holds them together
      const act = this._activeParty ? this._activeParty() : [];
      const healers = act.filter(h => h.role === 'healer' && !(h.downT > 0) && h.hp > 0);
      for (const m of act) {
        if (!m.pdDying) continue;
        const near = healers.some(h => h !== m && Math.hypot(h.x - m.x, h.y - m.y) <= HEALER_SAVE_TILES * TILE);
        m.pdSaveT = near ? (m.pdSaveT || 0) + dt : 0;
        if (near && m.pdSaveT >= RESCUE_CHANNEL_S) this._gmSaveCompanion(m, healers.find(h => h !== m).name);
      }
    }
    for (const c of this._gmFoes()) this._gmMoveFoe(c, dt);
    this._gmChurchT = (this._gmChurchT || 0) + dt;
    if (this._gmChurchT >= 0.25) {
      const step = this._gmChurchT;
      this._gmChurchT = 0;
      this._gmWardenTick();
      this._gmOnSightTick();
      this._gmBarkTick(step);
    }
    this._gmRecruitTick(dt);
  },
};
