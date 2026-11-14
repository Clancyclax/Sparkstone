// ============================================================================
// ROUND 388 -- THE STREET TALKING: who is speaking, in which city, as what.
//
//   "NPCs all say the same insane line about being iron ... Let's improve the dialogue for random NPCs to be a
//    little less samey, maybe 35 variations or so in each city relevant to the NPCs model and role."
//
// The lines and the rules are src/data/townTalk.js. This is the scene side: which city a speaker stands in, which
// pool they speak from, their own shuffle bag, and the rare word about the player's rank. cityLifeMixin's greet tick
// (the passer-by line), its crier and its lamplighters call into it.
// ============================================================================
import { TILE } from '../data/iso.js';
import { REGIONS, regionPoint, regionAt } from '../data/regions.js';
import {
  TALK_CITIES, talkRoleFor, townTalkPool, nextTalkLine, rankNodFor, rankStanding,
} from '../data/townTalk.js';

export const TownTalkMixin = {
  /** The talking cities' centres and reach, built once. */
  _ttCities() {
    if (this._ttCityList) return this._ttCityList;
    const out = [];
    for (const region of (REGIONS || [])) {
      for (const st of (region.settlements || [])) {
        if (!TALK_CITIES[st.id] || st.bandit) continue;
        const c = regionPoint(region, st.at);
        out.push({ id: st.id, region: region.id, x: c.x, y: c.y, r: (st.radius || 30) * TILE });
      }
    }
    this._ttCityList = out;
    return out;
  },

  /** The talking city at a world point, or null (a hamlet, the road, the wild). */
  _ttCityAt(x, y) {
    for (const c of this._ttCities()) if (Math.hypot(x - c.x, y - c.y) <= c.r * 1.1) return c.id;
    return null;
  },

  /** The city a speaker belongs to: a crowd person carries their settlement; anyone else is placed by where they stand. */
  _ttCityOf(who) {
    if (!who) return null;
    if (who.settlement && TALK_CITIES[who.settlement]) return who.settlement;
    if (who.settlement) return null;
    return this._ttCityAt(who.x, who.y);
  },

  /** The region the player is in, for measuring their rank against what it takes for granted. */
  _ttRegionId() {
    const r = this.world ? regionAt(this.world.x, this.world.y) : null;
    return (r && r.id) || 'nek';
  },
  /** How far above this region's floor the player's rank stands (townTalk.js rankStanding); -1 at Normal. */
  _ttStanding() { return rankStanding(this.player && this.player.rank, this._ttRegionId()); },

  /** The speaker's own shuffle bag, kept on them. */
  _ttMem(who) {
    if (who.life) return (who.life.ttMem = who.life.ttMem || {});
    return (who._ttMem = who._ttMem || {});
  },

  /** One line from a pool for this speaker, never the one they said last. */
  _ttPoolLine(who, cityId, role) {
    const pool = townTalkPool(cityId, role);
    if (!pool) return null;
    return nextTalkLine(pool, this._ttMem(who || this));
  },

  /** What this person says as you pass, in their city's voice for their role. Null for anyone without a pool. */
  _ttAmbientLine(who) {
    const city = this._ttCityOf(who);
    const role = talkRoleFor(who);
    if (!city || !role) return null;
    return this._ttPoolLine(who, city, role);
  },

  /** The rare word about who you are. Nearly always null; see townTalk.js RANK_NODS for who and how often. */
  _ttNodFor(who) {
    const role = talkRoleFor(who);
    if (!role || !this.player) return null;
    return rankNodFor(this.player.rank, this._ttRegionId(), role, Math.random(), Math.random());
  },

  /**
   * The nearest person who could speak to you as you pass: the crowd (not talking, not indoors, not already
   * speaking, not spoken lately) and the watch on patrol or at a post with nothing to fight.
   */
  _ttSpeakerNear(radius) {
    const px = this.world.x, py = this.world.y, now = this._clockT || 0;
    let best = null, bd = radius;
    for (const f of (this.townFolk || [])) {
      if (!f || !f.crowd || !f.life || !f.sprite || !f.sprite.visible) continue;
      if (f.life.state === 'talk' || f.life.state === 'inside' || f.life.sayEl) continue;
      if ((f._clGreetUntil || 0) > now) continue;
      const d = Math.hypot(f.x - px, f.y - py);
      if (d < bd) { bd = d; best = f; }
    }
    for (const g of (this.guards || [])) {
      if (!g || !g.sprite || !g.sprite.visible || g.target || !(g.hp > 0)) continue;
      if (g.state && g.state !== 'patrol' && g.state !== 'post' && g.state !== 'idle') continue;
      if ((g._clGreetUntil || 0) > now) continue;
      const d = Math.hypot(g.x - px, g.y - py);
      if (d < bd) { bd = d; best = g; }
    }
    return best;
  },

  /** Say it: a crowd person through the small overheard bubble, a guard over his head. */
  _ttSay(who, line) {
    if (!who || !line) return;
    const hold = Math.max(3.2, 1.5 + line.length / 22);   // long enough to read a two-sentence line
    if (who.life && this._folkSay) { this._folkSay(who, line); who.life.sayT = Math.max(who.life.sayT || 0, hold); }
    else if (this._sayOverhead) this._sayOverhead(who, line, '#cfd8dc', hold);
  },
};
