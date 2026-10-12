// ============================================================================
// ROUND 273 -- THE BANDIT CITIES, IN THE SCENE.
//
// The cities themselves are ordinary settlements (regions.js appends one per
// region from banditCities.js) so the generator builds their streets, walls,
// houses, doors, merchants and board. This file is everything that makes them
// BANDIT cities once they stand:
//
//   CASTING        the generic townsfolk and priests are cleared out; armed
//                  crew and a captain stand in their place; the merchants are
//                  the crew's fences and charge half again
//   NEUTRAL        nobody lifts a hand until you do. A threat (a spell cast
//                  among them) is warned once; a blow, or a second threat,
//                  turns the whole city on you
//   THE HOUSES     every house has its dead in it -- the town they took
//   THE CHURCH     one house is not a house
//   THE BOARD      kill or rob a regular citizen of the region. Taking the job
//                  is fine; DOING it marks you an outlaw here and the Society
//                  strikes you off, permanently
//   THE CLEARANCE  for everyone else, the Society's posting to clear the town
// ============================================================================
import { TILE, ELEV_PX, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { dirRow } from '../data/playerAnim.js';
import { NPC_ART, NPC_CELL } from '../data/npcs.js';
import { roomTileCentre } from '../data/interiors.js';
import { REGION_BY_ID, regionDenTier, regionPoint } from '../data/regions.js';
import { RANK_ORDER } from '../data/ranks.js';
import { banditModelFor, CREW_BY_SLUG } from '../data/bandits.js';
import { weekIndexOf } from '../data/quests.js';
import { seededRng } from '../data/awakening.js';
import {
  BANDIT_CITIES, BANDIT_CITY_BY_ID, BANDIT_MARKUP, DARK_GODS, BANDIT_JOB_PAY, CLEARANCE_NEED,
} from '../data/banditCities.js';
import { addDepravity, pledgeDarkGod, depravityState, OFFERING_FEE } from '../data/depravity.js';
import { spendCoins } from '../data/inventory.js';
import { markOutlaw, isOutlawIn } from '../data/restricted.js';
// ROUND 300 -- the church is a shack, and the dark gods take turns in it.
import { STRUCT_ROW, STRUCT_VARIANTS, STRUCT_ATLAS_COLS, STRUCT_CELL, STRUCT_FOOT_X, STRUCT_FOOT_Y } from '../data/structureManifest.js';
import { TOWN_CARDINAL_COL, TOWN_DISPLAY_SCALE } from '../data/town.js';
import { CHAR_ART } from '../data/characterManifest.js';
import {
  GOD_VISITS, godOnDuty, darkVisitState, promiseProgress, promiseReward,
  AVARICE_TRIBUTE,
} from '../data/darkGods.js';
import { grantCoins } from '../data/inventory.js';

const TOWNSFOLK = 16;               // armed crew about the streets
const HOSTILE_LEASH = 70;           // tiles from the centre they will chase you
const MERCHANT_ROLES = {
  tavern: 'the Tapster', blacksmith: 'the Fence', auction: 'the Auctioneer', weapon: 'the Armourer',
};
const CREW_BARKS = [
  'Keep your hands where I can see them and we will all get along.',
  'Coin spends the same here as anywhere. More, actually.',
  'Nobody asks where anything came from. You should not either.',
  'The last people who lived here were not friendly. We fixed that.',
  'Buy something or move along.',
  'The captain likes quiet. So do I.',
];
const REMAINS_KEYS = ['boneSupine', 'boneCurled', 'bonePartial', 'boneSeated', 'boneScatter', 'boneSplayed'];

export const BanditCityMixin = {
  _banditCityState(id) {
    this.player.banditCities = this.player.banditCities || {};
    return (this.player.banditCities[id] = this.player.banditCities[id] || { cleared: false });
  },

  _isBanditSettlement(id) { return !!BANDIT_CITY_BY_ID[id]; },

  _banditCityCentre(c) {
    const region = REGION_BY_ID[c.region];
    const st = region && (region.settlements || []).find(x => x.id === c.id);
    if (!st) return null;
    return st._centre ? { x: st._centre.x, y: st._centre.y } : regionPoint(region, st.at);
  },

  /** Once, after the world's people exist: make each city the crew's. */
  _castBanditCities() {
    if (this._banditCast || !this.npcs) return;
    this._banditCast = true;
    this._banditTowns = {};
    const keep = [];
    for (const n of this.npcs) {
      const city = n && BANDIT_CITY_BY_ID[n.settlement];
      if (!city) { keep.push(n); continue; }
      if (n.shopId) {
        // The merchants stay: they are the crew's fences now, and they charge.
        const crew = CREW_BY_SLUG[city.crew];
        n.markup = BANDIT_MARKUP;
        n.banditCity = city.id;
        n.name = `${MERCHANT_ROLES[n.shopId] || 'the Fence'} of ${city.name}`;
        n.dialogue = `Everything a city sells, and nobody asking whose it was. Half again on the price — ${crew ? crew.name : 'the crew'} takes its cut.`;
        this._banditDress(n, city, keep.length);
        keep.push(n);
        continue;
      }
      // Everyone else was the town they killed. They are not here.
      if (n.sprite && n.sprite.destroy) n.sprite.destroy();
    }
    this.npcs = keep;
    // ...nor in the crowd lists, which hold references to some of the same people.
    if (this.townFolk) {
      this.townFolk = this.townFolk.filter(n => {
        if (!n || !BANDIT_CITY_BY_ID[n.settlement]) return true;
        if (n.sprite && n.sprite.destroy && n.sprite.active) n.sprite.destroy();
        return false;
      });
    }
    this._markDarkChurches();
    for (const c of BANDIT_CITIES) this._castBanditTown(c);
  },

  /** A crew's colours on an NPC standing in their city. */
  _banditDress(n, city, which) {
    const key = this._banditTexture ? this._banditTexture(city.crew, which) : null;
    if (!key || !this.textures.exists(key)) return;
    const model = banditModelFor(which);
    const art = (model && NPC_ART[model.key]) || { footX: 32, footY: 63, scale: 1 };
    if (n.sprite && n.sprite.destroy) n.sprite.destroy();
    const p = isoProject(n.x, n.y);
    n.sprite = this.add.sprite(p.x, p.y, key, dirRow(n.facing || 'south'));
    n.sprite.setOrigin(art.footX / NPC_CELL, art.footY / NPC_CELL);
    n.sprite.setScale(art.scale || 1);
    n.sprite.setDepth(isoDepth(n.x, n.y));
    n.artKey = key;
    n.banditWhich = which;
  },

  /** The crew and the captain on a city's streets. */
  _castBanditTown(c) {
    const st = this._banditCityState(c.id);
    const town = { id: c.id, city: c, folk: [], hostile: false, warned: 0 };
    this._banditTowns[c.id] = town;
    if (st.cleared) return town;
    const centre = this._banditCityCentre(c);
    if (!centre) return town;
    const rng = seededRng(`bandittown|${c.id}`);
    for (let i = 0; i <= TOWNSFOLK; i++) {
      const captain = i === 0;
      let x = centre.x, y = centre.y;
      for (let a = 0; a < 14; a++) {
        const th = rng() * Math.PI * 2, r = captain ? 3 * TILE : (8 + rng() * 28) * TILE;
        x = centre.x + Math.cos(th) * r; y = centre.y + Math.sin(th) * r;
        if (!this._isWaterAt(x, y) && !this._collidesObstacle(x, y, 16)) break;
      }
      const n = {
        name: captain ? `${c.captain}, captain of ${c.name}` : `${CREW_BY_SLUG[c.crew] ? CREW_BY_SLUG[c.crew].name.replace(/^The /, '') : 'Crew'} ${['cutthroat', 'lookout', 'bruiser', 'knife', 'enforcer'][i % 5]}`,
        x, y, facing: 'south', sprite: null, shopId: null, settlement: c.id,
        banditCity: c.id, banditFolk: true, captain,
        dialogue: captain
          ? `${c.took}\n\n"${c.formerName}? Never heard of it. This is ${c.name}. Trade, drink, keep your blade in its sheath, and you can leave the same way you came."`
          : CREW_BARKS[i % CREW_BARKS.length],
      };
      this._banditDress(n, c, i + 3);
      if (!n.sprite) continue;
      this.npcs.push(n);
      town.folk.push(n);
    }
    return town;
  },

  /** Which bandit town is the player standing in, if any. */
  _banditTownHere() {
    if (!this._banditTowns || this._insideRoom) return null;
    for (const t of Object.values(this._banditTowns)) {
      const centre = this._banditCityCentre(t.city);
      if (centre && Math.hypot(this.world.x - centre.x, this.world.y - centre.y) < 56 * TILE) return t;
    }
    return null;
  },

  /**
   * A threat or a blow. A threat is warned once; the second, or any blow,
   * turns the town. Returns what happened.
   */
  _banditProvoke(town, how) {
    if (!town || town.hostile || this._banditCityState(town.id).cleared) return null;
    if (how === 'threat' && town.warned < 1) {
      town.warned++;
      const cap = town.folk.find(n => n.captain) || town.folk[0];
      if (cap) this._floatText(cap.x, cap.y - 48, 'Easy. Put it away, or we put you away.', '#ffb74d');
      return 'warned';
    }
    this._banditTurnHostile(town);
    return 'hostile';
  },

  /** Every NPC of the crew becomes a person who fights. */
  _banditTurnHostile(town) {
    if (town.hostile) return;
    town.hostile = true;
    const tier = Math.max(0, Math.min(4, regionDenTier(REGION_BY_ID[town.city.region])));
    const hp = [34, 70, 140, 260, 460][tier], dmg = [4, 7, 12, 20, 32][tier];
    const centre = this._banditCityCentre(town.city);
    const keep = [];
    for (const n of (this.npcs || [])) {
      if (!(n.banditFolk && n.banditCity === town.id)) { keep.push(n); continue; }
      const c = {
        uid: this._monsterUidSeq = (this._monsterUidSeq || 0) + 1,
        banditTown: town.id, captain: !!n.captain, name: n.name, sprite: n.sprite,
        crew: town.city.crew, which: n.banditWhich || 0, texKey: n.artKey, artKey: n.artKey, tier,
        x: n.x, y: n.y, homeX: centre ? centre.x : n.x, homeY: centre ? centre.y : n.y,
        hp: n.captain ? hp * 3 : hp, maxHp: n.captain ? hp * 3 : hp, damage: n.captain ? Math.round(dmg * 1.6) : dmg,
        alive: true, hostile: true, speed: 110, swingT: 0,
      };
      (this._banditFolk = this._banditFolk || []).push(c);
    }
    this.npcs = keep;
    const cry = (CREW_BY_SLUG[town.city.crew] || {}).cry || 'Kill them!';
    if (centre) this._floatText(this.world.x, this.world.y - 60, cry || 'Kill them!', '#ef5350');
  },

  /** The crew, when they are fighting. Leashed to their town. */
  _updateBanditTowns(dt) {
    if (!this._banditCast) this._castBanditCities();
    for (const c of (this._banditFolk || [])) {
      if (!c.banditTown || !c.alive || !c.sprite) continue;
      const leash = Math.hypot(this.world.x - c.homeX, this.world.y - c.homeY) > HOSTILE_LEASH * TILE;
      const tx = leash ? c.homeX : this.world.x, ty = leash ? c.homeY : this.world.y;
      const ddx = tx - c.x, ddy = ty - c.y, dd = Math.hypot(ddx, ddy) || 1;
      if (this._insideRoom) continue;
      if (dd > 26) {
        this._personStep(c, tx, ty, c.speed * dt);   // ROUND 292 -- by a path, see navMixin
        const p = isoProject(c.x, c.y);
        c.sprite.setPosition(p.x, p.y);
        c.sprite.setDepth(isoDepth(c.x, c.y));
      } else if (!leash) {
        if (this._banditPose) this._banditPose(c, facingFromMove(ddx, ddy) || 'south', dt);
        c.swingT = (c.swingT || 0) - dt;
        if (c.swingT <= 0) {
          c.swingT = 1.4;
          this._monsterHitPlayer(this._personFace(c, 'bandit'), c.damage, false);
        }
      }
    }
  },

  /** A blow from the player's swing. Any crew NPC in reach turns the town. */
  _banditSwingCheck(range) {
    const t = this._banditTownHere();
    if (!t || t.hostile) return false;
    const hit = t.folk.some(n => n.sprite && Math.hypot(n.x - this.world.x, n.y - this.world.y) <= range + 18);
    if (hit) this._banditProvoke(t, 'blow');
    return hit;
  },

  /** A spell cast among them is a threat. */
  _banditCastCheck(a) {
    if (!a || a.kind !== 'active') return null;
    const t = this._banditTownHere();
    if (!t || t.hostile) return null;
    const near = t.folk.some(n => n.sprite && Math.hypot(n.x - this.world.x, n.y - this.world.y) <= 6 * TILE);
    return near ? this._banditProvoke(t, 'threat') : null;
  },

  /** A crew member fell. The Society's clearance counts it. */
  _banditTownKill(c) {
    for (const q of (this.player.quests || [])) {
      if (q.kind !== 'banditClear' || q.state !== 'active' || q.city !== c.banditTown) continue;
      q.have = Math.min(q.need, (q.have || 0) + 1);
      if (c.captain) q.captainDown = true;
    }
  },

  /** The prices, marked up at a fence's counter. */
  _banditMarkup() {
    const n = this.nearNpc;
    return (n && n.markup && this._shopOpen) ? n.markup : 1;
  },

  // ------------------------------------------------------------ houses -----
  /** A house in a bandit city has its dead in it; one house is the church. */
  _banditHouseDressing(room, b) {
    if (!room || !b || !BANDIT_CITY_BY_ID[b.settlement]) return;
    if (b.darkChurch) { this._dressDarkChurch(room, b); return; }
    const rng = seededRng(`remains|${b.anchorX ?? b.x}|${b.anchorY ?? b.y}`);
    const n = 1 + Math.floor(rng() * 3);
    const spots = [[3, 5], [6, 3], [7, 6], [4, 3], [8, 5], [2, 4]];
    room.props = room.props || [];
    for (let i = 0; i < n; i++) {
      const [tx, ty] = spots[Math.floor(rng() * spots.length)];
      room.props.push({ key: REMAINS_KEYS[Math.floor(rng() * REMAINS_KEYS.length)], tx, ty });
    }
    room.blurb = 'Somebody lived here. They are still here.';
  },

  /** Choose each city's church: the house farthest from its centre. */
  _markDarkChurches() {
    for (const c of BANDIT_CITIES) {
      const centre = this._banditCityCentre(c);
      const houses = (this.buildings || []).filter(b => b.settlement === c.id && b.house);
      if (!centre || !houses.length) continue;
      houses.sort((a, b) => Math.hypot(b.x - centre.x, b.y - centre.y) - Math.hypot(a.x - centre.x, a.y - centre.y));
      houses[0].darkChurch = c.id;
      this._reskinDarkChurch(houses[0]);
    }
  },

  /** ROUND 300 -- "Use a shack model for a dark church." The chosen house is
   *  redrawn as one of the structure pack's shacks, its collider re-fitted to
   *  the new art and its door brought in to the smaller footprint. Same
   *  building record, same doorway, same room behind it. */
  _reskinDarkChurch(b) {
    const sp = b && b.sprite;
    if (!sp || !sp.setTexture || !this.textures || !this.textures.exists('structures')) return false;
    const pool = STRUCT_VARIANTS.shack || ['shack'];
    const rng = seededRng(`darkshack|${b.settlement}`);
    const key = pool[Math.floor(rng() * pool.length) % pool.length];
    const row = STRUCT_ROW[key];
    if (row === undefined) return false;
    const facing = b.facing && TOWN_CARDINAL_COL[b.facing] !== undefined ? b.facing : 'southeast';
    // Where the old centre and its door were, so the door keeps its side.
    const door = (this.doorways || []).find(d => d.kind === 'enter' && d.building === b);
    const ox = b.x, oy = b.y;
    this._releaseFootprintTiles(b);
    sp.setTexture('structures', row * STRUCT_ATLAS_COLS + TOWN_CARDINAL_COL[facing]);
    sp.setOrigin(STRUCT_FOOT_X / STRUCT_CELL, STRUCT_FOOT_Y / STRUCT_CELL);
    sp.setScale(TOWN_DISPLAY_SCALE);
    b.structure = 'shack'; b.artKey = key; b.facing = facing; b.darkShack = true;
    // ROUND 311 -- measure the art on the FLAT ground. The Nek slopes now
    // (round 310), a lifted sprite sits level*ELEV_PX higher on screen, and
    // unprojecting that height as ground moved the shack's centre onto a road.
    const lift = this._elev && this._elev.tileHeight
      ? this._elev.tileHeight(Math.floor(ox / TILE), Math.floor(oy / TILE)) * ELEV_PX : 0;
    if (lift) sp.y += lift;
    const fp = this._artFootprint(sp);
    if (lift) sp.y -= lift;
    if (fp) {
      b.x = fp.x; b.y = fp.y; b.hw = fp.hw; b.hh = fp.hh; b.fitted = !!fp.fitted;
      b.radius = Math.round(Math.hypot(fp.hw, fp.hh));
    }
    b.footTiles = this._claimFacadeTiles(b);
    if (!b.footTiles || !b.footTiles.length) b.footTiles = this._claimFootprintTiles(b);
    // The door: same direction from the centre, but out to the new edge.
    if (door) {
      const vx = door.x - ox, vy = door.y - oy, vl = Math.hypot(vx, vy) || 1;
      const step = (b.radius || 60) + 44;
      const nx = b.x + (vx / vl) * step, ny = b.y + (vy / vl) * step;
      if (!this._collidesObstacle(nx, ny, 14) && !this._isWaterAt(nx, ny)) { door.x = nx; door.y = ny; }
    }
    return true;
  },

  _dressDarkChurch(room, b) {
    const c = BANDIT_CITY_BY_ID[b.darkChurch];
    room._darkChurch = c.id;
    // ROUND 300 -- only an outlaw is let in on what this is. A hero who walks
    // into the shack finds a room that is wrong in a way they cannot name.
    if (!this._onOutlawRoute || !this._onOutlawRoute()) {
      room.name = 'Mysterious room';
      room.blurb = 'Nobody has swept it. Nobody has been burying anything here, either. The feeling does not go away.';
      room.props = [{ key: 'shrineNiche', tx: 2, ty: 1 }, { key: 'shrineNiche', tx: 8, ty: 1 }];
      room._eerie = true;
      return;
    }
    room.name = 'A hidden church';
    room.blurb = 'Four niches, four names nobody in the free cities will say aloud.';
    room.props = [
      // ROUND 291 -- a fourth niche, for Avarice.
      { key: 'shrineNiche', tx: 2, ty: 1 }, { key: 'shrineNiche', tx: 4, ty: 1 }, { key: 'shrineNiche', tx: 6, ty: 1 }, { key: 'shrineNiche', tx: 8, ty: 1 },
      { key: 'boneSeated', tx: 2, ty: 4 }, { key: 'bonePale', tx: 8, ty: 4 },
    ];
  },

  /** The eerie feeling a hero gets in the shack. Called on entry. */
  _eerieFeeling(room, tries = 0) {
    if (!room || !room._eerie) return;
    // The door's fade puts the player inside a beat after this is called, so
    // it waits for them to be there rather than speaking to an empty room.
    this.time.delayedCall(650, () => {
      if (!room._eerie) return;
      if (this._insideRoom !== room) { if (tries < 8) this._eerieFeeling(room, tries + 1); return; }
      this._floatText(this.world.x, this.world.y - 70, 'Something here is watching you. You should not stay.', '#9575cd');
    });
  },

  /** The deacon, placed once the church's room is built. */
  _placeDeacon(room) {
    if (!room || !room._darkChurch) return;
    this.npcs = (this.npcs || []).filter(n => {
      if (!n.deacon && !n.darkGod) return true;
      if (n.sprite && n.sprite.destroy) n.sprite.destroy();
      return false;
    });
    // ROUND 300 -- nobody is here for a hero.
    if (room._eerie || !this._onOutlawRoute || !this._onOutlawRoute()) return;
    const c = BANDIT_CITY_BY_ID[room._darkChurch];
    this._placeDarkGod(room, c);
    const at = roomTileCentre(room, 3, 3);
    const artKey = this.textures.exists('npc_cultist_man_undeath') ? 'npc_cultist_man_undeath' : 'npc_cultist_man';
    const art = NPC_ART[artKey];
    if (!art) return;
    const p = isoProject(at.x, at.y);
    const sprite = this.add.sprite(p.x, p.y, artKey, dirRow('south'));
    sprite.setOrigin(art.footX / (art.cell || NPC_CELL), art.footY / (art.cell || NPC_CELL));
    sprite.setScale(art.scale);
    sprite.setDepth(isoDepth(at.x, at.y));
    const undead = this.player.confluence && this.player.confluence.name === 'Undeath';
    const lines = DARK_GODS.map(g => `${g.name}, who is ${g.aspect}: "${g.line}"`).join('\n\n');
    this.npcs.push({
      name: `The Deacon of ${c.name}`, artKey, sprite, x: at.x, y: at.y, facing: 'south',
      shopId: null, interior: room.id, deacon: c.id, darkRoom: room.id,
      dialogue: `${undead ? '"Kin. The Unburied knew you before you knew yourself. Sit."' : '"You found the door. Most people walk past it."'}\n\n${lines}`,
    });
  },

  /** ROUND 300 -- the god who has the church today, standing at the altar. */
  _placeDarkGod(room, c) {
    const id = godOnDuty(this._dayIndex(), c.id);
    const g = GOD_VISITS[id];
    const dark = DARK_GODS.find(x => x.id === id);
    const art = g && CHAR_ART[g.art];
    const tex = g && `char_${g.art}_idle`;
    if (!art || !dark || !this.textures.exists(tex)) return null;
    const at = roomTileCentre(room, 6, 3);
    const p = isoProject(at.x, at.y);
    const sprite = this.add.sprite(p.x, p.y, tex, dirRow('south'));
    sprite.setOrigin(art.footX / art.cell, art.footY / art.cell);
    sprite.setScale(1.1);
    sprite.setDepth(isoDepth(at.x, at.y));
    const entry = {
      name: dark.name, artKey: null, sprite, x: at.x, y: at.y, facing: 'south',
      shopId: null, interior: room.id, darkGod: id, darkCity: c.id, darkRoom: room.id,
      dialogue: `${g.arrive}\n\n"${dark.line}"`,
    };
    this.npcs.push(entry);
    room._darkGodHere = id;
    return entry;
  },

  /** The live counters a promise is measured against. */
  _darkCounters() {
    const p = this.player;
    return {
      kills: this.kills || 0,
      chests: (p.chestsOpened || []).length,
      jobs: depravityState(p).jobs || 0,
      day: this._dayIndex(),
    };
  },

  /** The tier of the city's region, for what a promise pays. */
  _darkTier(cityId) {
    const c = BANDIT_CITY_BY_ID[cityId];
    const region = c && REGION_BY_ID[c.region];
    return Math.max(0, Math.min(4, region ? regionDenTier(region) : 0));
  },

  /** What the god at the altar says and offers. */
  _darkGodAddendum(npc) {
    const body = [], choices = [];
    if (!npc || !npc.darkGod || !this._onOutlawRoute || !this._onOutlawRoute()) return { body, choices };
    const g = GOD_VISITS[npc.darkGod];
    const v = darkVisitState(this.player);
    const act = v.active;
    if (act && act.god === npc.darkGod) {
      const pr = promiseProgress(act, this._darkCounters());
      if (pr.ready) {
        body.push(`[ ${g.done} ]`);
        choices.push({ label: 'Claim what is owed', act: 'darkGod|claim' });
      } else if (g.metric === 'tribute') {
        body.push(`[ Your tribute of ${act.tribute} is in the book. It is not yet a night old. ]`);
      } else {
        body.push(`[ Your promise stands: ${g.progress(pr.have, pr.need)}. ]`);
      }
      return { body, choices };
    }
    if (act) {
      const other = DARK_GODS.find(x => x.id === act.god);
      body.push(`[ You already owe ${other ? other.name : 'another'} a promise. This one will wait for it. ]`);
      return { body, choices };
    }
    body.push(`"${g.ask}"`);
    if (g.metric === 'tribute') {
      const fee = AVARICE_TRIBUTE[this._darkTier(npc.darkCity)];
      choices.push({ label: `Leave a tribute of ${fee} coin`, act: 'darkGod|take' });
    } else {
      choices.push({ label: 'Make the promise', act: 'darkGod|take' });
    }
    return { body, choices };
  },

  /** `darkGod|take` and `darkGod|claim`, from the altar's dialogue. */
  _darkGodAct(what) {
    const npc = this._lastTalkNpc;
    if (!npc || !npc.darkGod) return false;
    const p = this.player;
    const g = GOD_VISITS[npc.darkGod];
    const dark = DARK_GODS.find(x => x.id === npc.darkGod);
    const v = darkVisitState(p);
    const tier = this._darkTier(npc.darkCity);
    if (what === 'take') {
      if (v.active) return false;
      const c = this._darkCounters();
      const promise = { god: npc.darkGod, city: npc.darkCity, day: c.day, tier, base: c[g.metric] || 0 };
      if (g.metric === 'tribute') {
        const fee = AVARICE_TRIBUTE[tier];
        if (!spendCoins(p.coins, fee)) {
          this._openDialogue(dark.name, '"You mistake me for a charity. I am the opposite of one."');
          return false;
        }
        promise.tribute = fee;
      }
      v.active = promise;
      this._openDialogue(dark.name, g.metric === 'tribute'
        ? `"Recorded. Come back after a night."\n\n[ ${promise.tribute} coin handed over. ]`
        : `"Then it is promised."\n\n[ ${g.progress(0, g.need)}. Come back when it is done. ]`);
      return true;
    }
    if (what === 'claim') {
      const act = v.active;
      if (!act || act.god !== npc.darkGod) return false;
      const pr = promiseProgress(act, this._darkCounters());
      if (!pr.ready) return false;
      const d = depravityState(p);
      const reward = promiseReward(act, d.pledged);
      grantCoins(p.coins, 'normal', reward.coins);
      if (reward.buff && this._grantStatBuff) this._grantStatBuff(reward.buff.key, reward.buff.amount, reward.buff.duration);
      v.active = null;
      v.kept = (v.kept || 0) + 1;
      v.log.push({ god: act.god, day: this._dayIndex(), coins: reward.coins });
      if (v.log.length > 40) v.log.splice(0, v.log.length - 40);
      this._openDialogue(dark.name, `"${g.done}"\n\n[ ${reward.coins} coin${reward.buff ? `, and ${reward.buff.label}` : ''}. ]`);
      return true;
    }
    return false;
  },

  /** ROUND 291 -- the Deacon takes pledges and offerings. "Embraced the
   *  depraved underworld and dark gods" is a pledge plus deeds (his answer):
   *  a pledge here tips the bandit companions evil on its own, and an
   *  offering is a deed on the record. */
  _deaconAddendum(npc) {
    const body = [], choices = [];
    if (!npc || !npc.deacon) return { body, choices };
    const d = depravityState(this.player);
    const god = d.pledged && DARK_GODS.find(g => g.id === d.pledged);
    if (god) body.push(`[ You are pledged to ${god.name}. ]`);
    for (const g of DARK_GODS) {
      if (d.pledged === g.id) continue;
      choices.push({ label: `Pledge yourself to ${g.name}${d.pledged ? ' instead' : ''}`, act: `darkPledge|${g.id}` });
    }
    choices.push({ label: `Leave an offering (${OFFERING_FEE} coin)`, act: 'darkOffer' });
    return { body, choices };
  },

  /** A pledge made at the altar. */
  _darkPledge(godId) {
    const g = DARK_GODS.find(x => x.id === godId);
    if (!g) return false;
    const before = depravityState(this.player).pledged;
    pledgeDarkGod(this.player, g.id);
    this._openDialogue(g.name, [
      `"${g.line}"`,
      before ? `[ You have turned from one dark god to another. ${g.name} does not seem to mind. ]`
        : `[ You are pledged to ${g.name}. The companions who run with outlaws will know it. ]`,
    ].join('\n\n'));
    return true;
  },

  /** An offering left in the niche. */
  _darkOffer() {
    const p = this.player;
    if (!spendCoins(p.coins, OFFERING_FEE)) { this._openDialogue('The Deacon', '"Empty hands are an insult, not an offering."'); return false; }
    addDepravity(p, 'offering', 1);
    this._openDialogue('The Deacon', '"Received. Somebody down here is keeping count, and it is not me."');
    return true;
  },

  // ------------------------------------------------------------- board -----
  _isBanditBoard(board) { return !!(board && BANDIT_CITY_BY_ID[board.settlement]); },

  /** The crew's jobs: kill or rob a regular citizen of the region. */
  _rollBanditBoard(board, key, week) {
    const c = BANDIT_CITY_BY_ID[board.settlement];
    const region = REGION_BY_ID[c.region];
    const tier = Math.max(0, Math.min(4, regionDenTier(region)));
    const rng = seededRng(`banditboard|${key}|${week}`);
    const lawful = (this.npcs || []).filter(n => n && n.sprite && !n.banditCity && !n.interior
      && n.settlement && !BANDIT_CITY_BY_ID[n.settlement] && regionIdOfSettlement(n.settlement) === c.region);
    const marks = lawful.filter(n => !n.shopId && !n.priest && !n.survivor);
    const shops = lawful.filter(n => n.shopId);
    const out = [];
    // No mark twice on one board: two notices with one headline is a board
    // that reads as broken (test_round95's rule for every board, this one too).
    const used = new Set();
    const pick = (list) => {
      const free = list.filter(n => !used.has(n.name));
      const t = free.length ? free[Math.floor(rng() * free.length)] : null;
      if (t) used.add(t.name);
      return t;
    };
    for (let i = 0; i < 6; i++) {
      const kind = i % 2 ? 'banditTheft' : 'banditKill';
      const t = kind === 'banditKill' ? pick(marks) : pick(shops);
      if (!t) continue;
      const where = (region.settlements || []).find(s => s.id === t.settlement);
      const pay = BANDIT_JOB_PAY[kind][tier];
      out.push({
        id: `bandit|${c.id}|${week}|${i}`, kind, tier, rank: RANK_ORDER[tier], star: 0, bandit: true,
        region: c.region, city: c.id, targetName: t.name, targetSettlement: t.settlement,
        title: kind === 'banditKill' ? `Silence ${t.name}` : `Lift ${t.name}'s strongbox`,
        desc: kind === 'banditKill'
          ? `${t.name} of ${where ? where.name : 'the region'} has been talking to the wrong people. Make it stop. Doing it marks you an outlaw here.`
          : `${t.name} keeps the week's takings under the counter at ${where ? where.name : 'the region'}. Bring them to us. Doing it marks you an outlaw here.`,
        need: 1, have: 0, reward: pay, taken: false,
      });
    }
    return out;
  },

  /** An NPC who is somebody's job: the choice to do it. */
  _banditAddendum(npc) {
    const body = [], choices = [];
    if (!npc) return { body, choices };
    for (const q of (this.player.quests || [])) {
      if ((q.kind !== 'banditKill' && q.kind !== 'banditTheft') || q.state !== 'active' || (q.have || 0) >= q.need) continue;
      if (q.targetName !== npc.name) continue;
      choices.push({ label: q.kind === 'banditKill'
        ? `Kill ${npc.name} (you become an outlaw here)` : `Rob the strongbox (you become an outlaw here)`,
      act: `banditDo|${q.id}` });
    }
    return { body, choices };
  },

  /** Doing the job. Permanent: outlaw in the region, struck off the Society. */
  _doBanditJob(qid) {
    const q = (this.player.quests || []).find(x => x.id === qid);
    if (!q || q.state !== 'active') return false;
    const npc = (this.npcs || []).find(n => n.name === q.targetName);
    markOutlaw(this.player, q.region, q.kind);
    this._societyOutlawed(q.region);
    q.have = q.need;
    // ROUND 291 (5.8, 5.9) -- the deed on the record. A murder job's mark is a
    // townsperson, never a shop, priest or survivor (`_rollBanditBoard`), so it
    // is a civilian by his definition.
    addDepravity(this.player, q.kind, 1, q.targetName);
    if (q.kind === 'banditKill') addDepravity(this.player, 'civilian', 1, q.targetName);
    if (q.kind === 'banditKill' && npc) {
      if (this._corpseFromPerson && npc.artKey) {
        try { this._corpseFromPerson(npc.x, npc.y, npc.artKey, { spoil: 'blood' }); } catch (e) { /* art may lack a death sheet */ }
      }
      if (npc.sprite && npc.sprite.destroy) npc.sprite.destroy();
      this.npcs = this.npcs.filter(n => n !== npc);
      this._floatText(this.world.x, this.world.y - 50, `${q.targetName} is dead`, '#ef5350');
    } else {
      this._floatText(this.world.x, this.world.y - 50, 'The strongbox is yours', '#ffd54f');
    }
    const region = REGION_BY_ID[q.region];
    this._openDialogue('Outlaw', [
      `It is done. Word will be all over ${region ? region.name : 'the region'} by nightfall.`,
      `[ You are an outlaw in ${region ? region.name : 'this region'}. The Adventure Society has struck you off and is hunting you. ]`,
      'Take it back to the board in the bandit city to be paid.',
    ].join('\n\n'));
    return true;
  },

  /** Struck off for crime: no test, no appeal. */
  _societyOutlawed(regionId) {
    const st = this._societyState();
    st.outlawed = true;
    if (this._regularsLeave) this._regularsLeave();   // ROUND 275 -- they want nothing to do with you
    if (st.hunted) return;
    st.hunted = true;
    st.joined = false;
    st.suspended = false;
    for (const q of (this.player.quests || [])) {
      if ((q.society || q.kind === 'evaluation' || q.kind === 'banditClear') && q.state === 'active') q.state = 'void';
    }
  },

  // -------------------------------------------------------- clearance ------
  /** The Guildmaster's posting, for members, when the region's town stands. */
  _clearanceAddendum(npc) {
    const body = [], choices = [];
    const st = this._societyState();
    if (!npc || this._societyRole(npc) !== 'yorin' || !st.joined || st.hunted) return { body, choices };
    const region = this.currentRegion || REGION_BY_ID.nek;
    const c = BANDIT_CITIES.find(x => x.region === region.id);
    if (!c || this._banditCityState(c.id).cleared) return { body, choices };
    const q = (this.player.quests || []).find(x => x.kind === 'banditClear' && x.city === c.id && x.state === 'active');
    if (!q) {
      body.push(`"${c.name}. It was ${c.formerName} until ${CREW_BY_SLUG[c.crew] ? CREW_BY_SLUG[c.crew].name : 'a crew'} took it. The Society wants it back."`);
      choices.push({ label: `Take the posting: clear out ${c.name}`, act: `banditClearTake|${c.id}` });
    } else if (this._questDone(q)) {
      choices.push({ label: `Report: ${c.name} is cleared`, act: `banditClearReport|${c.id}` });
    } else {
      body.push(`"${c.name} still stands. ${q.have || 0} of ${q.need} of the crew down${q.captainDown ? ', and the captain' : ', and the captain still breathing'}."`);
    }
    return { body, choices };
  },

  _takeClearance(cityId, npc) {
    const c = BANDIT_CITY_BY_ID[cityId];
    if (!c) return;
    const centre = this._banditCityCentre(c);
    const tier = Math.max(0, Math.min(4, regionDenTier(REGION_BY_ID[c.region])));
    const q = {
      id: `society|clear|${cityId}`, kind: 'banditClear', state: 'active', city: cityId,
      region: c.region, need: CLEARANCE_NEED, have: 0, captainDown: false, society: true,
      title: `Clear out ${c.name}`, desc: `Put down ${CLEARANCE_NEED} of the crew holding ${c.name}, and ${c.captain} with them.`,
      holdX: centre ? centre.x : 0, holdY: centre ? centre.y : 0, tier, rank: RANK_ORDER[tier], star: 3,
      reward: BANDIT_JOB_PAY.banditKill[tier] * 6, fromNpc: npc ? npc.name : null,
    };
    this.player.quests = (this.player.quests || []).filter(x => x.id !== q.id);
    this.player.quests.push(q);
    this._autoTrackQuest(q);
    this._openDialogue('The Adventure Society', `"${c.took}\n\nGo and take it back."`);
  },

  _reportClearance(cityId) {
    const q = (this.player.quests || []).find(x => x.id === `society|clear|${cityId}`);
    if (!q || !this._questDone(q)) return;
    this._turnInBounty(q, { fromChain: true });
    this.player.quests = (this.player.quests || []).filter(x => x !== q);
    this._banditClearCity(cityId);
    const c = BANDIT_CITY_BY_ID[cityId];
    this._openDialogue('The Adventure Society', `"${c.name} is ${c.formerName} again, or it will be once somebody is brave enough to live there. Well done."`);
  },

  /** A cleared city: the crew and the fences are gone for good. */
  _banditClearCity(cityId) {
    this._banditCityState(cityId).cleared = true;
    this.npcs = (this.npcs || []).filter(n => {
      if (n.banditCity !== cityId) return true;
      if (n.sprite && n.sprite.destroy) n.sprite.destroy();
      return false;
    });
    for (const c of (this._banditFolk || [])) if (c.banditTown === cityId && c.alive) {
      c.alive = false; c.despawned = true; if (c.sprite) c.sprite.destroy();
    }
  },

  /** Is the player an outlaw where they stand? */
  _outlawHere() {
    return isOutlawIn(this.player, this.currentRegion && this.currentRegion.id);
  },
};

/** A settlement's region, from the region table. */
function regionIdOfSettlement(sid) {
  for (const r of Object.values(REGION_BY_ID)) {
    if ((r.settlements || []).some(s => s.id === sid)) return r.id;
  }
  return null;
}
