// ============================================================================
// ROUND 410 -- EVERY CALLED THING HAS A BODY.
//
// The user: "Ability 'gleaning flock' is displaying a round dot instead of any of the MANY created creatures and
// monsters."
//
// `_spawnSummon` knows three kinds -- creature, turret, trap -- and draws anything else as the abstract coloured dot.
// The fusion abilities (src/data/fusions/) call four more: `bird` (44), `swarm` (495), `minion` (303) and `totem` (283),
// so well over a thousand summons in the game were a dot that stood where it was put -- including "a flock that follows
// you". Here each is given what it says it is:
//
//   bird    a flock: three birds of the ability's element, walking and flying with you, sharing its damage
//   swarm   a swarm: three small creatures of its element (moths, bees, bats, rats, spiders) the same way
//   minion  one small fighter of its element (a skeleton, a bloomkin, an umbrathane ...) that hunts beside you
//   totem   a standing thing, drawn and acting as a turret (it never walked: a totem stays where it is planted)
//
// The damage, range, interval and duration are the ability's own and are not re-priced: a flock's three bodies split
// the blow between them (rounded up), and none of the four goes through the creature role's damage ceiling, because
// none of them was ever priced as a creature.
// ============================================================================
import { MONSTER_ART } from '../data/monsters.js';

const BODY_KINDS = new Set(['bird', 'swarm', 'minion', 'totem']);
export const FLOCK_SIZE = 3;
const FLOCK_SCALE = 0.72;

const has = (el, ...words) => words.some(w => el.includes(w));
/** The family a called thing of this kind and element is drawn as. */
export function summonBodyFamily(kind, element, name = '') {
  const el = `${String(element || '').toLowerCase()} ${String(name || '').toLowerCase()}`;
  let fam = null;
  if (kind === 'bird') {
    fam = has(el, 'fire', 'ember', 'flame', 'heat', 'sun') ? 'phoenix'
      : has(el, 'lightning', 'storm', 'wind', 'air', 'thunder', 'sky') ? 'thunderbird'
        : has(el, 'radiant', 'light', 'holy', 'divine', 'star') ? 'birdangel'
          : has(el, 'water', 'frost', 'ice', 'cold', 'tide') ? 'glasswader'
            : 'bonepecker';
  } else if (kind === 'swarm') {
    fam = has(el, 'shadow', 'dark', 'death', 'blood', 'curse', 'necrotic', 'night', 'bat') ? 'bat'
      : has(el, 'poison', 'venom', 'acid', 'spider', 'web') ? 'spider'
        : has(el, 'nature', 'plant', 'life', 'growth', 'bee', 'honey', 'pollen') ? 'bellhive'
          : has(el, 'fire', 'lightning', 'wind', 'air', 'arcane', 'light', 'radiant', 'moth') ? 'duskmoth'
            : 'gnawling';
  } else if (kind === 'minion') {
    fam = has(el, 'death', 'bone', 'necrotic', 'grave', 'undead') ? 'skeleton'
      : has(el, 'plant', 'nature', 'life', 'growth', 'flower', 'bloom') ? 'bloomimp'
        : has(el, 'shadow', 'dark', 'curse', 'void') ? 'shade'
          : has(el, 'earth', 'rock', 'stone', 'crystal', 'sand') ? 'shardling'
            : has(el, 'arcane', 'mind', 'puppet', 'string') ? 'stringless'
              : has(el, 'fire', 'demon', 'hell') ? 'demon'
                : 'gnoll';
  }
  return fam && MONSTER_ART[fam] ? fam : null;
}

export const SummonBodyMixin = {
  /** The ability as `_spawnSummon` should read it: one of the four kinds turned into a creature or a turret. */
  _summonBodyFor(a) {
    const kind = a && a.summonKind;
    if (!kind || !BODY_KINDS.has(kind) || a._bodyFrom) return a;
    if (kind === 'totem') return { ...a, summonKind: 'turret', _bodyFrom: 'totem' };
    const el = (this._specElement ? this._specElement(a) : a.element) || a.element || '';
    const fam = a.summonFamily && MONSTER_ART[a.summonFamily] ? a.summonFamily : summonBodyFamily(kind, el, a.name);
    const out = { ...a, summonKind: 'creature', _bodyFrom: kind };
    if (fam) out.summonFamily = fam;
    if (kind === 'bird' || kind === 'swarm') {
      out._flockN = FLOCK_SIZE;
      out._r393Scale = (a._r393Scale || 1) * FLOCK_SCALE;
    }
    return out;
  },

  /** A flock or a swarm: its bodies, each with a share of the blow. True when it has spawned them. */
  _summonSpawnFlock(a) {
    if (!(a._flockN > 1) || a._flockMember) return false;
    const n = a._flockN;
    const share = Math.max(1, Math.ceil((a.summonDmg || 5) / n));
    for (let i = 0; i < n; i++) this._spawnSummon({ ...a, _flockMember: i + 1, summonDmg: share });
    return true;
  },

  /** A flock member stands a little apart from the others, so three birds read as three. */
  _summonJitter(a, wx, wy) {
    if (!a || !a._flockMember) return { wx, wy };
    const ang = (a._flockMember / (a._flockN || 3)) * Math.PI * 2 + 0.6;
    return { wx: wx + Math.cos(ang) * 22, wy: wy + Math.sin(ang) * 22 };
  },

  /** A summon drawn as the dot because its family's sheet was not here yet: once it is, the body replaces the dot. */
  _summonUpgradeBody(s) {
    const fam = s.wantFamily;
    const art = MONSTER_ART[fam];
    const tex = this._monsterTexture ? this._monsterTexture(fam, 'idle') : null;
    if (!art || !tex) return false;
    if (!this.textures.exists(tex)) {
      if (!s._artAsked && this._ensureFamilyArt) { s._artAsked = true; try { this._ensureFamilyArt(fam); } catch (e) { /* art only */ } }
      return false;
    }
    const shade = this._summonShadeFor ? this._summonShadeFor(s.wantShadeOf || {}, art) : 0;
    const old = s.sprite;
    const sp = this.add.sprite(old ? old.x : 0, old ? old.y : 0, tex, shade * 8 + 2);
    sp.setScale(art.displayScale * 0.8 * (s.wantScale || 1));   // 0.8 = WorldScene's SUMMON_CREATURE_SCALE
    sp.setOrigin(0.5, art.originY || 0.85);
    if (old) { sp.setDepth(old.depth); if (old.active) old.destroy(); }
    s.sprite = sp; s.art = art; s.family = fam; s.shade = shade;
    s.wantFamily = null; s.wantShadeOf = null;
    return true;
  },

  /** Fetch the sheets the kit's summons will need, at kit build, so the first cast is not the dot. */
  _summonWarmArt() {
    const known = (this.player && this.player.knownAbilities) || {};
    for (const e of Object.values(known)) {
      const a = e && e.ability;
      if (!a || a.template !== 'activeSummon') continue;
      const b = this._summonBodyFor(a);
      const fam = b && b.summonFamily;
      if (fam && MONSTER_ART[fam] && this._ensureFamilyArt) { try { this._ensureFamilyArt(fam); } catch (err) { /* art only */ } }
    }
  },
};
