// ============================================================================
// ROUND 428 -- THRONES, for the God of Dominion's secret ("become king").
//
//   THE BANDIT THRONE (the minor favour). A bandit city's captain will hear a challenge for the chair. The crew stand
//   back and watch; the captain fights you alone, to the death. Kill them and the city is yours instead of cleared:
//   the crew stay, they answer to you, and they will not turn on you. While the duel lasts nobody steps in, whatever
//   is struck.
//   THE FALLEN CAPITAL (the major favour). A region the surge took leaves survivors. They will follow you home: clear
//   the dead city of what took it (40 of the things that live there now), and they resettle it. Then they crown you.
//   A resettled region's monsters go back to what the world would otherwise be.
// State: `player.thrones428` { claimed: {cityId: day}, crowned: regionId|null }; the fallen record carries `resettled`.
// ============================================================================
import { TILE, isoProject, isoDepth } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { REGION_BY_ID, regionDenTier } from '../data/regions.js';
import { BANDIT_CITY_BY_ID } from '../data/banditCities.js';
import { survivorById } from '../data/survivors.js';

export const RESETTLE_NEED = 40;
const SURVIVOR_ART = ['npc_peasant_man', 'npc_cheerful_peasant_girl', 'npc_farmer', 'npc_merchant'];

export const THRONE_LINES = {
  challenge: (cap) => `"The chair?" ${cap} laughs, and nobody else does. "Fine. The old way. You and me, and nobody steps in. Win, and they are yours. Lose, and you are fed to the pigs."`,
  ring: 'The crew pull back into a ring. Nobody is going to help either of you.',
  won: (city) => `The crew look at the body, and then at you.\n\nSomebody starts it: "Boss." Then all of them. ${city} is yours.\n\n[ You hold the chair of ${city}. Its crew answer to you and will not turn on you. ]`,
  loyal: ['Boss.', 'Anything you need, boss.', 'Nobody touches the chair while we stand.', 'The old captain never paid this well. Probably.', 'Your city, your rules.'],
  resettleAsk: (city) => `"We cannot go back while those things are in the streets. If someone cleared ${city}... we would go home. All of us."`,
  resettleTake: (city) => `"Then go. Kill what took it. We will be right behind you."`,
  resettled: (city) => `They walk back into ${city} slowly, the way you walk into a house where somebody died. Then someone opens a shutter. Then a door.\n\n[ ${city} is resettled. ]`,
  crownAsk: (city, name) => `"We talked about it. All of us." They hold out something hammered from the old gate's iron. "${city} needs a crown, and there is only one of you who brought us home. Will you wear it, ${name}?"`,
  crowned: (city) => `They put it on your head in the square where the dead lay. It is badly made and it fits.\n\n[ You are crowned in ${city}. ]`,
};

export const ThroneMixin = {
  _thState() {
    const p = this.player;
    if (!p.thrones428 || typeof p.thrones428 !== 'object') p.thrones428 = { claimed: {}, crowned: null };
    if (!p.thrones428.claimed) p.thrones428.claimed = {};
    return p.thrones428;
  },
  _thClaimed(cityId) { return !!(this.player && this.player.thrones428 && this.player.thrones428.claimed && this.player.thrones428.claimed[cityId]); },

  /** The captain's challenge, and a resettlement's choices on a survivor. Joined to `_societyAddendum`. */
  _throneAddendum(npc) {
    const body = [], choices = [];
    if (!npc) return { body, choices };
    if (npc.captain && npc.banditCity && !npc.banditFolkFoe) {
      const town = this._banditTowns && this._banditTowns[npc.banditCity];
      const st = this._banditCityState(npc.banditCity);
      if (town && !town.hostile && !town.duel && !st.cleared && !this._thClaimed(npc.banditCity)) {
        choices.push({ label: 'Challenge for the chair (to the death)', act: `throne|challenge|${npc.banditCity}` });
      }
    }
    if (npc.survivor && npc.survivor.regionId) {
      const rid = npc.survivor.regionId;
      const rec = this._fallenRecord ? this._fallenRecord()[rid] : null;
      const city = this._thCityName(rid);
      const q = (this.player.quests || []).find(x => x.id === `resettle|${rid}` && x.state === 'active');
      if (rec && !rec.resettled) {
        if (!q) { body.push(THRONE_LINES.resettleAsk(city)); choices.push({ label: `Take back ${city} for them`, act: `throne|resettle|${rid}` }); }
        else if ((q.have || 0) >= q.need) choices.push({ label: `Report: ${city} is clear`, act: `throne|home|${rid}` });
        else body.push(`"${q.have || 0} of ${q.need}. Keep going."`);
      } else if (rec && rec.resettled && this._thState().crowned !== rid) {
        body.push(THRONE_LINES.crownAsk(city, this.player.name || 'Outworlder'));
        choices.push({ label: `Be crowned in ${city}`, act: `throne|crown|${rid}` });
      }
    }
    return { body, choices };
  },

  _thCityName(rid) {
    const c = this._cityOf ? this._cityOf(rid) : null;
    return (c && c.st && c.st.name) || ((REGION_BY_ID[rid] || {}).name) || 'the city';
  },

  _throneAct(act) {
    const [, what, id] = String(act).split('|');
    if (what === 'challenge') return this._thChallenge(id);
    if (what === 'resettle') return this._thTakeResettle(id);
    if (what === 'home') return this._thResettle(id);
    if (what === 'crown') return this._thCrown(id);
    return null;
  },

  // ------------------------------------------------------------------------------------------ the bandit chair
  _thChallenge(cityId) {
    const town = this._banditTowns && this._banditTowns[cityId];
    const c = BANDIT_CITY_BY_ID[cityId];
    if (!town || !c) return;
    const cap = town.folk.find(n => n.captain);
    if (!cap) return;
    this._closeDialogue();
    this._openDialogue(cap.name, `${THRONE_LINES.challenge(c.captain)}\n\n${THRONE_LINES.ring}`);
    town.duel = true;
    const tier = Math.max(0, Math.min(4, regionDenTier(REGION_BY_ID[c.region])));
    const hp = [34, 70, 140, 260, 460][tier] * 3, dmg = Math.round([4, 7, 12, 20, 32][tier] * 1.6);
    const foe = {
      uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
      banditTown: town.id, captain: true, throneDuel: true, name: cap.name, sprite: cap.sprite,
      crew: c.crew, which: cap.banditWhich || 0, texKey: cap.artKey, artKey: cap.artKey, tier,
      x: cap.x, y: cap.y, homeX: cap.x, homeY: cap.y, hp, maxHp: hp, damage: dmg, alive: true, hostile: true, speed: 110, swingT: 0.8,
    };
    (this._banditFolk = this._banditFolk || []).push(foe);
    this.npcs = (this.npcs || []).filter(n => n !== cap);
    town.folk = town.folk.filter(n => n !== cap);
  },

  /** From `_banditTownKill`: the captain of a chair duel is down. */
  _thDuelWon(c) {
    const town = this._banditTowns && this._banditTowns[c.banditTown];
    const city = BANDIT_CITY_BY_ID[c.banditTown];
    if (!town || !city) return;
    town.duel = false;
    this._thState().claimed[city.id] = (this._dayIndex ? this._dayIndex() : 0) || 1;
    this._thLoyalCrew(town);
    if (this._dsDeed) this._dsDeed('dominion', 'minor', city.id);
    this._openDialogue(city.name, THRONE_LINES.won(city.name));
  },

  /** A claimed city's crew answer to you. */
  _thLoyalCrew(town) {
    town.folk.forEach((n, i) => { n.dialogue = THRONE_LINES.loyal[i % THRONE_LINES.loyal.length]; });
  },

  // ------------------------------------------------------------------------------------------ the fallen capital
  _thTakeResettle(rid) {
    const city = this._cityOf ? this._cityOf(rid) : null;
    if (!city) return;
    const name = this._thCityName(rid);
    const q = {
      id: `resettle|${rid}`, kind: 'resettle', state: 'active', region: rid, need: RESETTLE_NEED, have: 0,
      title: `Take back ${name}`, desc: `Kill ${RESETTLE_NEED} of the things living in the ruins of ${name}, so its survivors can go home.`,
      holdX: city.at.x, holdY: city.at.y, radiusTiles: city.st.radius || 40, tier: Math.max(0, regionDenTier(REGION_BY_ID[rid])), star: 0, reward: 0,
    };
    this.player.quests = (this.player.quests || []).filter(x => x.id !== q.id);
    this.player.quests.push(q);
    if (this._autoTrackQuest) this._autoTrackQuest(q);
    this._closeDialogue();
    this._openDialogue('Survivors', THRONE_LINES.resettleTake(name));
  },

  /** From `_killMonster`: anything killed in a ruin being taken back counts, by whoever's hand. */
  _thOnKill(m) {
    if (!m || !this.player) return;
    for (const q of (this.player.quests || [])) {
      if (q.kind !== 'resettle' || q.state !== 'active' || (q.have || 0) >= q.need) continue;
      if (Math.hypot((m.wx || 0) - q.holdX, (m.wy || 0) - q.holdY) <= (q.radiusTiles || 40) * TILE) q.have = (q.have || 0) + 1;
    }
  },

  _thResettle(rid) {
    const q = (this.player.quests || []).find(x => x.id === `resettle|${rid}`);
    const rec = this._fallenRecord ? this._fallenRecord()[rid] : null;
    if (!q || !rec || (q.have || 0) < q.need) return;
    this.player.quests = this.player.quests.filter(x => x !== q);
    rec.resettled = (this._dayIndex ? this._dayIndex() : 0) || 1;
    this._closeDialogue();
    this._thPlaceResettled(rid);
    if (this._rebuildMonsterSpawns) { try { this._rebuildMonsterSpawns(); } catch (e) { console.warn('[throne] spawn rebuild', e && e.message); } }
    this._openDialogue(this._thCityName(rid), THRONE_LINES.resettled(this._thCityName(rid)));
  },

  /** The survivors of a resettled city stand in its square. Placed again after every load. */
  _thPlaceResettled(rid) {
    const rec = this._fallenRecord ? this._fallenRecord()[rid] : null;
    const city = this._cityOf ? this._cityOf(rid) : null;
    if (!rec || !rec.resettled || !city) return 0;
    if (this._clearRegionSurvivors) this._clearRegionSurvivors(rid);
    let n = 0;
    (rec.survivors || []).forEach((sid, i) => {
      const sv = survivorById(rid, sid);
      if (!sv) return;
      const artKey = SURVIVOR_ART.find((k, j) => j >= i % SURVIVOR_ART.length && this.textures.exists(k)) || SURVIVOR_ART.find(k => this.textures.exists(k));
      const art = artKey && NPC_ART[artKey];
      if (!art) return;
      const th = (i / Math.max(1, rec.survivors.length)) * Math.PI * 2;
      let x = city.at.x + Math.cos(th) * 3 * TILE, y = city.at.y + Math.sin(th) * 3 * TILE;
      if (this._collidesObstacle && this._collidesObstacle(x, y, 12)) { x = city.at.x + (i - 1) * TILE; y = city.at.y + TILE; }
      const pr = isoProject(x, y);
      const sprite = this.add.sprite(pr.x, pr.y, artKey, dirRow('south'));
      sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
      sprite.setScale(art.scale || 1);
      sprite.setDepth(isoDepth(x, y));
      this.npcs.push({ name: sv.name, artKey, sprite, x, y, facing: 'south', shopId: null, survivor: { regionId: rid, id: sv.id },
        dialogue: `${sv.role}. Home again, for what that is worth.` });
      n++;
    });
    return n;
  },

  _thCrown(rid) {
    const rec = this._fallenRecord ? this._fallenRecord()[rid] : null;
    if (!rec || !rec.resettled) return;
    this._thState().crowned = rid;
    if (this._dsDeed) this._dsDeed('dominion', 'major', rid);
    this._closeDialogue();
    this._openDialogue(this._thCityName(rid), THRONE_LINES.crowned(this._thCityName(rid)));
  },

  /** Once per load: the resettled cities' people back in their squares, the claimed chairs' crews loyal. */
  _thTick() {
    if (this._thPlaced || !this.player || !this.npcs || !this._banditTowns) return;
    this._thPlaced = true;
    for (const [rid, rec] of Object.entries((this._fallenRecord && this._fallenRecord()) || {})) if (rec && rec.resettled) this._thPlaceResettled(rid);
    for (const id of Object.keys(this._thState().claimed)) {
      const town = this._banditTowns[id];
      if (!town) continue;
      const cap = town.folk.find(n => n.captain);
      if (cap) { if (cap.sprite) cap.sprite.destroy(); this.npcs = this.npcs.filter(n => n !== cap); town.folk = town.folk.filter(n => n !== cap); }
      this._thLoyalCrew(town);
    }
  },
};
