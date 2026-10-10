// ===========================================================================
// ROUND 310 (item 2) -- SKILL BOOKS: THE SCENE SIDE.
//
// What a book IS lives in src/data/skillBooks.js, and a martial art in
// src/data/martialArts.js. This is the part that needs a scene: carrying a
// book, reading it, and the martial art's live effect on the player.
//
// THE MARTIAL ART IS APPLIED THROUGH THE DOORS EVERY OTHER BUFF USES, rather
// than through a new one:
//   moveSpeed  -> the movement stack's `speedMult`
//   dodge      -> the dodge sum
//   tempo      -> the cooldown rate (`cdRate`)
//   haste      -> the cast-speed reading
//   mend       -> healing received
//   wind/focus/vigor -> `_regenScale`
//   thrift     -> the ability cost door and the weapon swing cost
//   damage/crit/guard -> `passiveMods` (dmgMult, critChance, damageReduction),
//     which the recompute REBUILDS from the kit, so the live delta is carried
//     in `player._martialApplied` and put back after a recompute.
//
// The condition readings are sampled five times a second into
// `this._martialLive`; every door reads that one bag, so nothing here costs a
// scan per swing.
// ===========================================================================

import { isWaterTile } from '../data/town.js';
import {
  learnBook, bookById, skillBooksOf, hasCraft, martialArtOf, canUseSkillBooks, newSkillBooks,
  rollFoundBook,
} from '../data/skillBooks.js';
import { MARTIAL_BY_ID, artCard, effectsFor, martialScale } from '../data/martialArts.js';
import { subtypeOf } from '../data/monsters.js';
import { stockId } from '../data/crafting.js';
import { dishForPart } from '../data/cooking.js';

const SAMPLE_S = 0.2;
const NEAR_FOE = 300;     // world px: "near" for the foe-counting conditions
const STILL_AFTER_S = 0.6;
const KILL_WINDOW_S = 6, HIT_WINDOW_S = 4, STRIKE_WINDOW_S = 2;

export const SkillBookMixin = {
  // ---- books -------------------------------------------------------------

  /** ROUND 311 -- a book FOUND rather than bought: in ancient ruins (a chest
   *  at a ruin site), or very rarely as a quest reward. The book goes straight
   *  into the bag (a found book is never left on the floor to be swept away),
   *  and is skipped if the player already carries it. `rnd` is for tests. */
  _findBook(source, x, y, rnd = Math.random) {
    const p = this.player;
    const row = rollFoundBook(p, source, rnd);
    if (!row) return null;
    const bag = (p.bookBag || (p.bookBag = []));
    if (bag.includes(row.id)) return null;
    bag.push(row.id);
    this._floatText(x === undefined ? this.world.x : x, (y === undefined ? this.world.y : y) - 62,
      `You find a skill book: ${row.name}`, '#ffd54f');
    return row;
  },

  /** Why this book cannot be bought or read right now, or null. */
  _bookRefusal(id) {
    const p = this.player;
    const row = bookById(id);
    if (!row) return 'That is not a skill book.';
    if (!canUseSkillBooks(p)) return 'You cannot use skill books.';
    const sb = skillBooksOf(p);
    if (row.kind === 'weapon' && sb.weapons[row.weapon]) return `You already know the ${row.weapon}.`;
    if (row.kind === 'craft' && sb[row.craft]) return 'You already know this.';
    if (row.kind === 'martial') {
      if (sb.martialArt === row.art) return 'You already follow this art.';
      if (sb.martialArt) {
        const cur = MARTIAL_BY_ID[sb.martialArt];
        return `You already follow ${cur ? cur.name : 'a martial art'}; a body learns only one.`;
      }
    }
    const carried = (p.bookBag || []).includes(id);
    if (carried) return 'You are already carrying this book.';
    return null;
  },

  _readBook(id) {
    const p = this.player;
    const bag = p.bookBag || (p.bookBag = []);
    const at = bag.indexOf(id);
    if (at < 0) return false;
    const res = learnBook(p, id);
    if (!res.ok) {
      this._floatText(this.world.x, this.world.y - 40, res.reason, '#ef9a9a');
      return false;
    }
    bag.splice(at, 1);
    this._recomputeDerivedStats && this._recomputeDerivedStats();
    this._floatText(this.world.x, this.world.y - 44, `You learn: ${res.row.name.replace(/^Manual: /, '')}`, '#ffd54f');
    this._martialLive = null;
    if (this._olbOn) this._olbOn('book', id);   // ROUND 314
    if (this._renderInventory) this._renderInventory();
    return true;
  },

  /** Rows for the Inventory table: books carried (with a Read button) and the
   *  skills already learned. */
  _skillBookRows() {
    const p = this.player;
    const rows = [];
    const counts = {};
    for (const id of (p.bookBag || [])) counts[id] = (counts[id] || 0) + 1;
    for (const [id, qty] of Object.entries(counts)) {
      const b = bookById(id);
      if (!b) continue;
      const why = this._bookRefusal(id);
      // A carried book is "already carrying" by construction; the refusal that
      // matters for reading is whether the lesson would take.
      const blocked = why && !/carrying/.test(why) ? why : '';
      rows.push({
        name: b.name, desc: b.blurb, type: 'Skill Book', qty, color: '#ffcc80',
        action: blocked
          ? `<span style="opacity:0.7;font-size:11px;">${blocked}</span>`
          : `<button class="action-btn" data-act="readbook" data-bookid="${id}">Read</button>`,
      });
    }
    const sb = skillBooksOf(p);
    const known = [];
    for (const w of Object.keys(sb.weapons)) known.push(`${w}`);
    if (known.length) {
      rows.push({ name: 'Weapons you know', desc: known.join(', '), type: 'Learned', qty: '', color: '#a5d6a7' });
    }
    if (sb.martialArt && MARTIAL_BY_ID[sb.martialArt]) {
      const a = MARTIAL_BY_ID[sb.martialArt];
      const scale = this._martialScaleNow();
      rows.push({ name: a.name, desc: artCard(a, scale), type: 'Martial Art', qty: '', color: '#a5d6a7' });
    }
    for (const c of ['herbalism', 'mining', 'cooking', 'ritual']) {
      if (sb[c]) rows.push({ name: c === 'ritual' ? 'Ritual Magic' : c[0].toUpperCase() + c.slice(1),
        desc: 'Learned from a skill book.', type: 'Learned', qty: '', color: '#a5d6a7' });
    }
    return rows;
  },

  // ---- the martial art ---------------------------------------------------

  /** Rank and attribute scale of the art right now. */
  _martialScaleNow() {
    let standing = 0;
    try { standing = this._playerStanding ? this._playerStanding() : 0; } catch (e) { standing = 0; }
    return martialScale(standing, 0);
  },

  /** Record an event the conditions care about ('kill' | 'strike'). */
  _martialNote(what) {
    const st = this._martialSt || (this._martialSt = {});
    if (what === 'kill') st.killT = 0;
    else if (what === 'strike') st.strikeT = 0;
  },

  /** One tick. Cheap when the player follows no art. */
  _martialTick(dt) {
    const p = this.player;
    if (!p) return;
    const art = martialArtOf(p);
    const st = this._martialSt || (this._martialSt = { stillT: 0, killT: 99, hitT: 99, strikeT: 99, acc: 0, x: 0, y: 0, hp: 0 });
    if (!art) {
      if (this._martialLive) this._martialLive = null;
      // A ritual zone still moves damage and crit, art or no art.
      if (this._ritualLive) this._martialApply(); else this._martialUnapply();
      return;
    }
    // Clocks every tick: motion, the hit clock off an hp drop, event windows.
    const dx = this.world.x - st.x, dy = this.world.y - st.y;
    if (dx * dx + dy * dy > 0.09) st.stillT = 0; else st.stillT += dt;
    st.x = this.world.x; st.y = this.world.y;
    if (p.hp < st.hp - 0.01) st.hitT = 0; else st.hitT += dt;
    st.hp = p.hp;
    st.killT += dt; st.strikeT += dt;
    st.acc += dt;
    if (st.acc < SAMPLE_S && this._martialLive) return;
    st.acc = 0;

    const mons = this.monsters || [];
    let foes = 0, dotFoes = 0;
    const wx = this.world.x, wy = this.world.y;
    for (let i = 0; i < mons.length; i++) {
      const m = mons[i];
      if (!m || !m.alive || m.ally || m.tamed || m.person || m.friendly) continue;
      if (Math.abs(m.wx - wx) > NEAR_FOE || Math.abs(m.wy - wy) > NEAR_FOE) continue;
      if (Math.hypot(m.wx - wx, m.wy - wy) > NEAR_FOE) continue;
      foes++;
      if (m.dot || (m.debuffs && Object.keys(m.debuffs).length) || (m.sunderT || 0) > 0) dotFoes++;
    }
    const hp = p.maxHp ? p.hp / p.maxHp : 1;
    const mana = p.maxMana ? p.mana / p.maxMana : 1;
    const stam = p.maxStamina ? p.stamina / p.maxStamina : 1;
    let hour = 12;
    try { hour = this._hourOfDay ? this._hourOfDay() : 12; } catch (e) { hour = 12; }
    const night = hour >= 20 || hour < 5;
    let h = 0;
    try { h = this._elev ? this._elev.height(wx, wy) : 0; } catch (e) { h = 0; }
    let wet = false;
    try { wet = isWaterTile(this._tileTypeAt(wx, wy)); } catch (e) { wet = false; }
    const inCombat = foes > 0 || st.hitT < HIT_WINDOW_S || st.strikeT < STRIKE_WINDOW_S;
    const unarmed = this._isUnarmed ? !!this._isUnarmed() : false;
    const buffed = !!(p.buffs && Object.keys(p.buffs).some(k => p.buffs[k] && (p.buffs[k].t > 0 || p.buffs[k].mult)))
      || !!(p.statBuffs && Object.keys(p.statBuffs).length);
    const ctx = {
      always: true,
      still: st.stillT >= STILL_AFTER_S,
      moving: st.stillT < 0.2,
      inCombat, calm: !inCombat,
      hurt: hp < 0.5, hale: hp >= 0.9,
      manaLow: mana < 1 / 3, manaFull: mana >= 0.9,
      stamLow: stam < 1 / 3, stamFull: stam >= 0.9,
      night, day: !night,
      afterKill: st.killT < KILL_WINDOW_S, afterHit: st.hitT < HIT_WINDOW_S, afterStrike: st.strikeT < STRIKE_WINDOW_S,
      dotFoes, foes, crowd: foes >= 3, duel: foes === 1,
      unarmed, armed: !unarmed,
      wet, high: h > 0.5, low: h < -0.5, buffed,
      scale: this._martialScaleNow(),
      attr: (p.passiveMods && p.passiveMods.attrBonus) || null,
    };
    this._martialLive = effectsFor(art, ctx);
    this._martialCtx = ctx;
    this._martialApply();
  },

  /** One channel of the live bag, 0 when none. */
  _martialFx(key) {
    const b = this._martialLive;
    return (b && b[key]) || 0;
  },

  /** Put the damage / crit deltas onto `passiveMods` (the martial art's, and
   *  the ritual zone's). GUARD IS NOT HERE: `passiveMods.damageReduction` is a
   *  FLAT subtraction, and these are percentages -- they are applied where
   *  the blow lands, in `_skillGuardPct`. */
  _martialApply() {
    const p = this.player, pm = p && p.passiveMods;
    if (!pm) return;
    const prev = p._martialApplied || { damage: 0, crit: 0 };
    const rz = (k) => (this._ritualFx ? this._ritualFx(k) : 0);
    const now = {
      damage: this._martialFx('damage') + rz('damage'),
      crit: this._martialFx('crit') + rz('crit'),
    };
    if (prev.damage) pm.dmgMult = (pm.dmgMult || 1) / (1 + prev.damage);
    pm.critChance = (pm.critChance || 0) - prev.crit;
    if (now.damage) pm.dmgMult = (pm.dmgMult || 1) * (1 + now.damage);
    pm.critChance += now.crit;
    p._martialApplied = now;
  },
  _martialUnapply() {
    const p = this.player, pm = p && p.passiveMods;
    if (!pm || !p._martialApplied) return;
    const prev = p._martialApplied;
    if (prev.damage) pm.dmgMult = (pm.dmgMult || 1) / (1 + prev.damage);
    pm.critChance = (pm.critChance || 0) - prev.crit;
    p._martialApplied = null;
  },

  /** The percentage of an incoming blow the martial art and any ritual zone
   *  turn aside, for a blow of this element. Capped at 60%. */
  _skillGuardPct(element) {
    const rz = this._ritualFx ? this._ritualFx('guard') : 0;
    const rr = this._ritualResist ? this._ritualResist(element) : 0;
    return Math.min(0.6, this._martialFx('guard') + rz + rr);
  },

  /** A cost (mana or stamina) after the martial art's thrift. */
  _martialThrift(amount) {
    const t = this._martialFx('thrift');
    return t > 0 ? Math.max(1, Math.round(amount * (1 - Math.min(0.6, t)))) : amount;
  },

  // ---- herbalism and mining (items 2.2.3, 2.2.4) --------------------------

  /** May the player see this node at all? Timber is common knowledge; plants
   *  want Herbalism and minerals want Mining. An unseen node is not drawn, not
   *  harvestable and not on the minimap -- it is undergrowth and bare rock. */
  _nodeSpotted(n) {
    if (!n) return false;
    if (n.family === 'fibre') return hasCraft(this.player, 'herbalism');
    if (n.family === 'metal') return hasCraft(this.player, 'mining');
    return true;
  },

  /** Once in a while, when you walk past a node you cannot read, say so. */
  _nodeHint(n) {
    const need = n.family === 'fibre' ? 'Herbalism' : 'Mining';
    const t = this._clockT || 0;
    if (this._nodeHintAt && t < this._nodeHintAt) return;
    this._nodeHintAt = t + 90;
    this._floatText(this.world.x, this.world.y - 50,
      `Something here might be worth gathering, but you cannot tell what. (${need} skill book)`, '#b0bec5');
  },

  /** Extra loot from the right kind of monster, for the right book. Called at
   *  the top of the kill's drop; adds drops, never takes any. */
  _craftBonusLoot(m) {
    if (!m || !m.type) return;
    const sub = subtypeOf(m);
    const earth = sub === 'elemental' && m.dmgElement === 'earth';
    const plant = sub === 'flora' && hasCraft(this.player, 'herbalism');
    const rock = (sub === 'mineral' || earth) && hasCraft(this.player, 'mining');
    if (!plant && !rock) return;
    const tier = Math.max(0, Math.min(4, this._monsterRankIndex ? this._monsterRankIndex(m) : 0));
    const id = stockId(plant ? 'fibre' : 'metal', tier);
    if (!id) return;
    const n = 1 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) this._dropLoot(m.wx, m.wy, { kind: 'stock', id });
  },

  // ---- cooking (item 2.2.6) ----------------------------------------------

  /** Cook one monster part into a dish. Needs the Cooking book; a part that is
   *  not food says so. */
  _cookPart(partId) {
    const p = this.player;
    if (!hasCraft(p, 'cooking')) {
      this._floatText(this.world.x, this.world.y - 40, 'You do not know how to cook. (Cooking skill book)', '#ef9a9a');
      return false;
    }
    const at = (p.inventory.parts || []).indexOf(partId);
    if (at < 0) return false;
    const dish = dishForPart(partId);
    if (!dish) {
      this._floatText(this.world.x, this.world.y - 40, 'That is not food.', '#ef9a9a');
      return false;
    }
    p.inventory.parts.splice(at, 1);
    p.inventory.consumables.push(dish.id);
    this._floatText(this.world.x, this.world.y - 44, `Cooked: ${dish.name}`, '#ffcc80');
    if (this._renderInventory) this._renderInventory();
    return true;
  },
};
