// ===========================================================================
// ROUND 401 -- THE MAGIC SOCIETY'S PEOPLE: its halls staffed, and its officials met in the wilds.
//
// The user (Desktop\new-assets\magic-society, SOCIETY_BRIEF.md): "Place them in and around the magic society halls ...
// in the major cities: researchers wander near the halls, bureaucrats stand at entrances and desks; the Archmage (ms_m70)
// and Magister (ms_m60) are the senior figures." "Each damage type for the NPCs (clothing only) and they should be mixed
// at each magic society building." "When exploring Magic society officials may be randomly encountered in the
// wilderness. Sometimes fine, occasionally under attack by monsters and requiring help." Non-combat: they stand, walk
// (the run cycle, slowed) and, if the monsters reach them, die (the south Death, whatever way they face).
//
// Each member is an `npcs` entry (`societyFolk: true`) drawn here, like the martial masters: one dyed sheet per
// (sheet, damage type), made when first seen and kept in a small cache. The hall's door bureaucrat is the archivist of
// round 400 (`magicSociety: true` -- the nine theories).
// ===========================================================================
import { SOCIETY_NPCS } from '../data/societyManifest.js';
import { SOCIETY_ROBES, dyeSocietyPixels, hallStaff, fieldOfficial, societyName, typeLabel } from '../data/societyArt.js';
import { TILE, isoProject, isoDepth, facingFromMove } from '../data/iso.js';
import { PLAYER_DIR_ORDER } from '../data/playerAnim.js';
import { regionAt, dangerFraction } from '../data/regions.js';
import { monsterKeysAtTier } from '../data/monsters.js';
import { grantCoins } from '../data/inventory.js';
import { RANK_ORDER } from '../data/ranks.js';
import { stableHash } from '../data/awakening.js';
import { MAGIC_HALL_ROOMS, MAGIC_HALL_POSTS, roomTileCentre, roomEntryPoint } from '../data/interiors.js';   // ROUND 403 -- the halls' insides

const DRAW_RANGE = 1400;
const TEX_KEEP = 30;
const WANDER_R = TILE * 7;
const WALK_SPEED = 46;               // world px/s: an unhurried walk on the run cycle
const WALK_FPS = 7, RUN_FPS = 12, DEATH_FPS = 8;
const FIELD_CHECK_S = 45;           // how often the wilds roll for an official
const FIELD_CHANCE = 0.16;          // ... and the chance on each roll
const FIELD_ATTACK_SHARE = 0.35;    // "occasionally under attack"
const FIELD_HOLD_S = 45;            // how long an official holds out once the monsters are on them
const FIELD_GONE_R = TILE * 60;     // walk this far away and the encounter is over

function mix(h) { h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0; return Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0; }

export const SocietyMixin = {
  // ---------------------------------------------------------------- the art
  /** The twelve standing sheets up front (small); the run and death sheets load the first time they are needed. */
  _preloadSociety() {
    for (const [k, n] of Object.entries(SOCIETY_NPCS)) this.load.image(`msraw_${n.idle.file}`, `./public/assets/society/${n.idle.file}.png`);
  },

  /** The dyed sheet for one member's `kind` ('idle' | 'run' | 'death'), or null while it loads. */
  _societyTex(e, kind) {
    const sh = SOCIETY_NPCS[e.npcKey] && SOCIETY_NPCS[e.npcKey][kind];
    if (!sh) return null;
    const key = `ms_${sh.file}_${e.robe}`;
    const lru = this._msLru || (this._msLru = []);
    if (this.textures.exists(key)) { const i = lru.indexOf(key); if (i >= 0) lru.splice(i, 1); lru.push(key); return key; }
    const raw = `msraw_${sh.file}`;
    if (!this.textures.exists(raw)) {
      const pend = this._msLoading || (this._msLoading = new Set());
      if (!pend.has(raw)) {
        pend.add(raw);
        this.load.image(raw, `./public/assets/society/${sh.file}.png`);
        this.load.once(`filecomplete-image-${raw}`, () => pend.delete(raw));
        this.load.once('loaderror', (f) => { if (f && f.key === raw) pend.delete(raw); });
        if (!this.load.isLoading()) this.load.start();
      }
      return null;
    }
    try {
      const src = this.textures.get(raw).getSourceImage();
      const cnv = document.createElement('canvas');
      cnv.width = src.width; cnv.height = src.height;
      const ctx = cnv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(src, 0, 0);
      const img = ctx.getImageData(0, 0, cnv.width, cnv.height);
      dyeSocietyPixels(img.data, SOCIETY_ROBES[e.robe] || SOCIETY_ROBES.arcane);
      ctx.putImageData(img, 0, 0);
      this._registerRecoloredSpritesheet(key, cnv, sh.cell, sh.cell);
    } catch (err) {
      console.warn('[society] dye failed', key, err && err.message);
      return null;
    }
    lru.push(key);
    const inUse = new Set();
    for (const m of (this.societyFolk || [])) if (m.sprite && m.sprite.texture) inUse.add(m.sprite.texture.key);
    while (lru.length > TEX_KEEP) {
      const i = lru.findIndex(k => !inUse.has(k) && k !== key);
      if (i < 0) break;
      const old = lru.splice(i, 1)[0];
      if (this.textures.exists(old)) this.textures.remove(old);
    }
    return key;
  },

  _societyMember(npcKey, robe, x, y, extra = {}) {
    const meta = SOCIETY_NPCS[npcKey];
    const h = stableHash(`ms|${npcKey}|${x | 0}|${y | 0}`);
    const e = {
      sprite: null, x, y, homeX: x, homeY: y, facing: 'southeast', dialogue: null, shopId: null,
      societyFolk: true, npcKey, robe, title: meta.title, role: meta.role,
      name: `${meta.title} ${societyName(npcKey, `${this._shopSeed ? this._shopSeed() : 0}|${x | 0}|${y | 0}`)}`,
      act: { mode: 'idle', t: 1 + (h % 600) / 100, f: 0, ft: 0, to: null },
      ...extra,
    };
    (this.societyFolk || (this.societyFolk = [])).push(e);
    (this.npcs || (this.npcs = [])).push(e);
    return e;
  },

  _societyDrop(e) { if (e.sprite) { e.sprite.destroy(); e.sprite = null; } },
  _societyRemove(e) {
    this._societyDrop(e);
    this.societyFolk = (this.societyFolk || []).filter(o => o !== e);
    this.npcs = (this.npcs || []).filter(o => o !== e);
    if (this.nearNpc === e) this.nearNpc = null;
  },

  // ---------------------------------------------------------------- the halls
  /** Staff every Magic Society hall (round 400 `_r400Magic`): the senior, a bureaucrat at the door (the archivist), one
   *  at the desk beside it, and three or four researchers walking the ground in front. Colours mixed per hall. */
  _staffMagicHalls() {
    const seed = this._shopSeed ? this._shopSeed() : 0;
    for (const e of (this.societyFolk || []).filter(o => o.hall)) this._societyRemove(e);
    this.doorways = (this.doorways || []).filter(d => !d.magicHallDoor);
    (this._r400Magic || []).forEach((hall, i) => {
      const d = hall.doorPoint;
      const room = MAGIC_HALL_ROOMS[i];
      if (!d || !room) return;
      // ROUND 403 -- the hall's door, and its room: the staff are inside, out of the rain
      room.name = hall.hallName || 'The Magic Society';
      room._forHall = hall;
      const entry = roomEntryPoint(room);
      this.doorways.push({ kind: 'enter', room, magicHallDoor: true, x: d.x, y: d.y, radius: 44, label: room.enterLabel, to: { x: entry.x, y: entry.y } });
      this.doorways.push({ kind: 'exit', room, magicHallDoor: true, x: entry.x, y: entry.y, radius: 44, label: 'step outside', to: { x: d.x + TILE * 0.8, y: d.y + TILE * 0.8 } });
      const staff = hallStaff(seed, i);
      let w = 0;
      for (const s0 of staff) {
        const post = s0.post === 'wander' ? MAGIC_HALL_POSTS.wander[w++ % MAGIC_HALL_POSTS.wander.length] : MAGIC_HALL_POSTS[s0.post];
        const at = roomTileCentre(room, post.tx, post.ty);
        const m = this._societyMember(s0.key, s0.type, at.x, at.y, {
          hall, hallName: hall.hallName, settlement: hall.settlement, post: s0.post, inRoom: room.id,
          magicSociety: s0.post === 'door',   // the archivist: the nine theories (round 400)
          wander: s0.post === 'wander', wanderR: TILE * 2.5, facing: s0.post === 'wander' ? 'southeast' : 'south',
        });
        if (s0.post === 'door') m.name = `Archivist ${m.name.split(' ').slice(-2).join(' ')}`;
      }
    });
    this._societySeed = seed;
  },

  // ---------------------------------------------------------------- every frame
  _updateSociety(dt) {
    if ((this._shopSeed ? this._shopSeed() : 0) !== this._societySeed && this._r400Magic) this._staffMagicHalls();
    if (this._socTick) this._socTick(dt);   // ROUND 405 -- the specialty chains' parts and the site's officials
    this._societyFieldTick(dt);
    const list = this.societyFolk;
    if (!list || !list.length) return;
    const inside = !!this._insideRoom || !!this.indoors;
    const px = this.world.x, py = this.world.y;
    for (const e of list) {
      // ROUND 403 -- a hall's people are drawn while you are in their hall; the field's while you are outdoors
      const here = e.inRoom ? (!!this._insideRoom && this._insideRoom.id === e.inRoom) : !inside;
      const near = !e.hidden && here && Math.abs(e.x - px) < DRAW_RANGE && Math.abs(e.y - py) < DRAW_RANGE;
      if (!near) { if (e.sprite) this._societyDrop(e); continue; }
      this._societyAct(e, dt, px, py);
      const kind = e.act.mode === 'dead' ? 'death' : e.act.mode === 'walk' || e.act.mode === 'flee' ? 'run' : 'idle';
      let tex = this._societyTex(e, kind), k = kind;
      if (!tex && kind !== 'idle') { tex = this._societyTex(e, 'idle'); k = 'idle'; }
      if (!tex) continue;
      const sh = SOCIETY_NPCS[e.npcKey][k];
      const dir = Math.max(0, PLAYER_DIR_ORDER.indexOf(e.facing));
      // "Death/south ... play it regardless of facing"
      const frame = k === 'idle' ? dir : k === 'death' ? Math.min(7, e.act.f) : dir * 8 + (e.act.f % 8);
      const pt = isoProject(e.x, e.y);
      if (!e.sprite) e.sprite = this.add.sprite(pt.x, pt.y, tex, frame);
      const sp = e.sprite;
      if (sp.texture.key !== tex) sp.setTexture(tex, frame); else sp.setFrame(frame);
      sp.setOrigin(sh.fx / sh.cell, sh.fy / sh.cell);
      sp.setPosition(pt.x, pt.y);
      sp.setDepth(isoDepth(e.x, e.y) + (e.act.mode === 'dead' ? -0.5 : 0));
    }
  },

  /** Stand, face the player when near; researchers walk to a spot near the hall and back. */
  _societyAct(e, dt, px, py) {
    const a = e.act;
    const dP = Math.hypot(px - e.x, py - e.y);
    if (a.mode === 'dead') {
      if (a.f < 7) { a.ft += dt; if (a.ft >= 1 / DEATH_FPS) { a.ft = 0; a.f++; } }
      return;
    }
    if (a.mode === 'idle') {
      if (dP < TILE * 4) { const f = facingFromMove(px - e.x, py - e.y); if (f) e.facing = f; }
      a.t -= dt;
      if (a.t <= 0 && e.wander && dP > TILE * 2.5) {
        const h = mix(stableHash(`${e.npcKey}|${(this._msTick = (this._msTick || 0) + 1)}`));
        const th = (h % 360) * Math.PI / 180, r = (e.wanderR || WANDER_R) * (0.3 + ((h >>> 9) % 70) / 100);
        const tx = e.homeX + Math.cos(th) * r, ty = e.homeY + Math.sin(th) * r;
        if (!this._isWaterAt(tx, ty) && !this._collidesObstacle(tx, ty, 12)) { a.mode = 'walk'; a.to = { x: tx, y: ty }; a.f = 0; a.ft = 0; }
        a.t = 3 + (h % 500) / 100;
      } else if (a.t <= 0) a.t = 2;
      return;
    }
    if (a.mode === 'walk' || a.mode === 'flee') {
      const fast = a.mode === 'flee';
      if (dP < TILE * 1.6 && !fast) { a.mode = 'idle'; a.t = 2; return; }   // stops for you
      const dx = a.to.x - e.x, dy = a.to.y - e.y, d = Math.hypot(dx, dy);
      const step = (fast ? WALK_SPEED * 2.4 : WALK_SPEED) * dt;
      if (d <= step) { e.x = a.to.x; e.y = a.to.y; a.mode = 'idle'; a.t = 2 + Math.random() * 3; return; }
      const nx = e.x + dx / d * step, ny = e.y + dy / d * step;
      if (this._collidesObstacle(nx, ny, 10)) { a.mode = 'idle'; a.t = 1.5; return; }
      e.x = nx; e.y = ny;
      const f = facingFromMove(dx, dy); if (f) e.facing = f;
      a.ft += dt;
      const fps = fast ? RUN_FPS : WALK_FPS;
      if (a.ft >= 1 / fps) { a.ft = 0; a.f = (a.f + 1) % 8; }
    }
  },

  // ---------------------------------------------------------------- talk
  _societyTalk(e) {
    if (e.act && e.act.mode === 'walk') { e.act.mode = 'idle'; e.act.t = 4; }
    { const f = facingFromMove(this.world.x - e.x, this.world.y - e.y); if (f) e.facing = f; }
    if (e.socSite && this._socSiteTalk && this._socSiteTalk(e)) return;   // ROUND 405 -- the officials at a study site
    if (e.field) { this._societyFieldTalk(e); return; }
    const t = typeLabel(e.robe);
    const lines = {
      senior: e.npcKey === 'ms_m70' ? [
        `${e.name}, Archmage of the Society, looks up from a slate covered in essence notation.`,
        '',
        '"Every adventurer who awakens a stone learns something nobody else knows. Most of them take it to the grave.',
        `That is the waste I have spent my life fighting. My own field is ${t.toLowerCase()} -- but the field that matters is all of them, together."`,
      ] : [
        `${e.name}, Magister of the Society, does not stand.`,
        '',
        '"The Society registers what it learns. Combinations, awakenings, what a stone does in which hands. Register with us',
        `and you will find doors open that would otherwise stay shut." A pause. "I keep the ${t.toLowerCase()} records myself."`,
      ],
      desk: [
        `${e.name} at the Society's desk, ledger open.`,
        '',
        `"Registrations, findings, petitions for study. The ${t.toLowerCase()} desk is mine; the others are inside."`,
        '"If you have learned something about an essence or a stone, write it down. Someone will need it."',
      ],
      wander: [
        `${e.name} is muttering over a page of figures.`,
        '',
        `"${t}. I study ${t.toLowerCase()} -- what it does when it meets other things, mostly. It never does the same thing twice"`,
        `and the Society will not give me a third assistant." ${e.post === 'wander' ? 'They wave a hand at the hall. "Ask at the door if you want the theories."' : ''}`,
      ],
    };
    // ROUND 405 -- the senior gives the chain of the theory you study (societyChainMixin)
    if (e.post === 'senior' && this._socSeniorTalk) {
      const body = [...lines.senior], choices = [];
      this._socSeniorTalk(e, body, choices);
      this._openDialogue(e.name, body.join('\n'), e, choices.length ? choices : null);
      return;
    }
    this._openDialogue(e.name, (lines[e.post] || lines.wander).join('\n'), e);
  },

  // ---------------------------------------------------------------- officials in the wilds
  /** Now and then, out in the wilds and with nothing hunting you, a Society official is out ahead of you on the road:
   *  most just out surveying, some with monsters on them. */
  _societyFieldTick(dt) {
    const st = this._msField || (this._msField = { t: FIELD_CHECK_S * 0.5, cur: null });
    const cur = st.cur;
    if (cur) {
      if (!(this.societyFolk || []).includes(cur)) { st.cur = null; return; }
      const d = Math.hypot(this.world.x - cur.x, this.world.y - cur.y);
      if (cur.underAttack && cur.act.mode !== 'dead') {
        const foes = (cur.foes || []).filter(uid => (this.monsters || []).some(m => m && m.uid === uid && m.alive));
        if (!foes.length) { cur.underAttack = false; cur.saved = true; cur.act.mode = 'idle'; cur.act.t = 3;
          this._floatText(cur.x, cur.y - 50, `${cur.title} saved!`, '#80cbc4'); }
        else {
          const near = (this.monsters || []).some(m => m && m.alive && foes.includes(m.uid) && Math.hypot(m.x - cur.x, m.y - cur.y) < TILE * 6);
          if (near) cur.hold -= dt;
          if (cur.hold <= 0) { cur.act.mode = 'dead'; cur.act.f = 0; cur.act.ft = 0; cur.underAttack = false; cur.lost = true;
            this._floatText(cur.x, cur.y - 50, `The ${cur.title.toLowerCase()} has fallen`, '#ef9a9a'); }
        }
      }
      if (d > FIELD_GONE_R) { this._societyRemove(cur); st.cur = null; }
      return;
    }
    if (this._insideRoom || this.indoors || this._dialogueOpen) return;
    st.t -= dt;
    if (st.t > 0) return;
    st.t = FIELD_CHECK_S;
    const x0 = this.world.x, y0 = this.world.y;
    const region = regionAt(x0, y0) || this.currentRegion;
    if (!region) return;
    if ((this._inAnySettlement && this._inAnySettlement(x0, y0)) || (this._inGridCity && this._inGridCity(x0, y0, 10))) return;
    if ((this.monsters || []).some(m => m && m.alive && Math.hypot(m.x - x0, m.y - y0) < TILE * 14)) return;
    const day = this._dayIndex ? this._dayIndex() : 0;
    const h = mix(stableHash(`msfield|${this._shopSeed ? this._shopSeed() : 0}|${day}|${Math.floor(x0 / 4000)}|${Math.floor(y0 / 4000)}|${(this._msFieldN = (this._msFieldN || 0) + 1)}`));
    if ((h % 1000) / 1000 >= FIELD_CHANCE) return;
    this._societyFieldSpawn(region, h);
  },

  _societyFieldSpawn(region, h) {
    // ahead of the player and a little to the side, just out of view
    const th = ((h >>> 3) % 360) * Math.PI / 180;
    let x = this.world.x + Math.cos(th) * TILE * 16, y = this.world.y + Math.sin(th) * TILE * 16;
    for (let k = 0; k < 10 && (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 14)); k++) {
      const t2 = th + k * 0.6; x = this.world.x + Math.cos(t2) * TILE * (14 + k); y = this.world.y + Math.sin(t2) * TILE * (14 + k);
    }
    if (this._isWaterAt(x, y) || this._collidesObstacle(x, y, 14)) return null;
    const off = fieldOfficial(h);
    const attack = ((h >>> 12) % 1000) / 1000 < FIELD_ATTACK_SHARE;
    let tier = 1;
    try { const d = dangerFraction(region, x, y); for (const g of (region.spawnGroups || [])) if (d >= (g.from || 0)) tier = Math.max(tier, g.tier || 0); } catch (err) { /* edge */ }
    tier = Math.max(1, Math.min(4, tier));
    const e = this._societyMember(off.key, off.type, x, y, { field: true, post: 'field', tier, regionName: region.name });
    e.name = `${off.title} ${e.name.split(' ').slice(-2).join(' ')}`;
    e.act.mode = 'idle';
    this._msField.cur = e;
    if (attack) {
      const keys = monsterKeysAtTier(tier);
      e.underAttack = true; e.hold = FIELD_HOLD_S; e.foes = [];
      const n = 2 + ((h >>> 20) % 3);
      for (let i = 0; i < n && keys.length; i++) {
        const k = keys[(h >>> (i * 3)) % keys.length];
        const a = (i / n) * Math.PI * 2;
        const m = this._spawnMonster(k, x + Math.cos(a) * TILE * 3, y + Math.sin(a) * TILE * 3, null);
        if (m) { e.foes.push(m.uid); m.aggro = true; }
      }
      e.act.mode = 'flee'; e.act.to = { x: x + Math.cos(th) * -TILE * 4, y: y + Math.sin(th) * -TILE * 4 };
      this._floatText(this.world.x, this.world.y - 60, 'Someone is calling for help!', '#ffcc80');
    }
    return e;
  },

  _societyFieldTalk(e) {
    const t = typeLabel(e.robe);
    if (e.act.mode === 'dead') {
      this._openDialogue(e.name, `${e.name} of the Magic Society lies still. A satchel of ${t.toLowerCase()} survey notes spills from their robe.`, e);
      return;
    }
    if (e.underAttack) {
      this._openDialogue(e.name, '"Help -- please! I cannot hold them off much longer!"', e);
      return;
    }
    const body = [];
    if (e.saved && !e.thanked) {
      e.thanked = true;
      const rk = Math.max(1, this._playerRankIndex ? this._playerRankIndex() : 1);
      const coin = RANK_ORDER[Math.max(0, Math.min(3, rk - 1))];
      const amt = 20 + e.tier * 15;
      grantCoins(this.player.coins, coin, amt);
      body.push(`${e.name} is shaking, but alive.`, '', `"You -- thank you. The Society pays its debts." They press ${amt} ${coin} coins into your hand.`);
      const m = this._societyHint && this._societyHint();
      if (m) body.push('', m);
    } else {
      body.push(`${e.name} of the Magic Society, out surveying ${t.toLowerCase()} in the wilds of ${e.regionName}.`, '',
        '"Readings. Always readings. The wilds are full of things the halls have never measured."');
      if (!e.hinted) { e.hinted = true; const m = (this._socFieldHint && this._socFieldHint()) || (this._societyHint && this._societyHint()); if (m) body.push('', m); }
    }
    this._openDialogue(e.name, body.join('\n'), e);
  },

  /** What an official can tell you: where a martial master you have not met stands (marked on your map). */
  _societyHint() {
    const known = new Set(((this.player.skillBooks || {}).masterLore || {}).known || []);
    const pool = (this.martialMasters || []).filter(o => o.assigned && !known.has(o.key) && o.art);
    if (!pool.length) return null;
    let best = null, bd = Infinity;
    for (const o of pool) {
      const x = o.homeX != null ? o.homeX : null; if (x == null) continue;
      const d = Math.hypot(x - this.world.x, o.homeY - this.world.y);
      if (d < bd) { bd = d; best = o; }
    }
    best = best || pool[0];
    if (this._masterKnow) this._masterKnow(best);
    return `"If you are walking a martial road: there is a master at ${best.place}. Our surveyors pass that way." (Marked on your map.)`;
  },
};
