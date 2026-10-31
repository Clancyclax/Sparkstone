// ============================================================================
// ROUND 388 -- WHAT THE STREET SAYS, AND WHO NOTICES YOU.
//
// The user:
//   "NPCs all say the same insane line about being iron. When the player is iron rank a few might learn something
//    about them, but the town crier isn't going to be shouting news about some nobody making iron rank. Let's
//    improve the dialogue for random NPCs to be a little less samey, maybe 35 variations or so in each city relevant
//    to the NPCs model and role."
//
// WHAT WAS WRONG. A passer-by's line came out of cityLife.js FAME_GREETINGS seven times in ten -- four lines a tier,
// tier 1 and 2 being "Iron yet? You will be." and "Safe roads, iron." -- so every person in every street said one of
// eight things, and all eight were about the player's rank. The crier put "has risen to Iron rank. Another one for
// the Society!" in the plaza for two days, and every townsperson who heard him repeated it.
//
// WHAT THIS IS.
//   1. TOWN_TALK: a pool of finished lines per city per role (townTalkLinesA/B.js), 33-35 a pool. A crowd person's
//      role comes off the model they are drawn with (MODEL_ROLE): the burly townsman and the vest-and-shirtsleeves
//      peasant are labourers, the peasant girl is a youngster, the old man with the crate is a merchant, and so on.
//      The watch speak from the guard pool. Cadence alone has a crier and lamplighters, so it alone has those pools.
//   2. nextTalkLine: a shuffle bag per speaker, so a person works through their whole pool before repeating and
//      never says the same thing twice running, across a refill included.
//   3. RANK_NODS: being noticed, measured against the region, not the world. An Iron in Cadence is where every
//      adventurer starts, so only a fellow adventurer or a guard who saw you sign in mentions it, three times in a
//      hundred. A Bronze in Cadence is somebody; a Bronze in Harrowmoor is where everyone there starts. Higher above
//      the region's floor, more people, more often. Normal rank: never.
// ============================================================================
import { CADENCE, HARROWMOOR, TOLBRAND_QUAY } from './townTalkLinesA.js';
import { KARSK_LANDING, VASHRA, SLAGWARD } from './townTalkLinesB.js';

/** The cities that talk, keyed by settlement id (regions.js). Villages and hamlets keep their old quiet. */
export const TALK_CITIES = {
  nek_city: { name: 'Cadence', region: 'nek' },
  ont_city: { name: 'Harrowmoor', region: 'ontaria' },
  sir_town: { name: 'Tolbrand Quay', region: 'sirukh' },
  ele_city: { name: 'Karsk Landing', region: 'elehyd' },
  bra_city: { name: 'Vashra', region: 'bratugal' },
  cin_slag: { name: 'Slagward', region: 'cinder' },
};

export const TOWN_TALK = {
  nek_city: CADENCE,
  ont_city: HARROWMOOR,
  sir_town: TOLBRAND_QUAY,
  ele_city: KARSK_LANDING,
  bra_city: VASHRA,
  cin_slag: SLAGWARD,
};

/** The roles every city has a pool for, and the ones only Cadence has (cityLifeMixin builds its crier and lamplighters there). */
export const TALK_ROLES = ['labourer', 'youth', 'farmer', 'merchant', 'noble', 'scholar', 'adventurer', 'guard'];
export const CITY_ONLY_ROLES = { nek_city: ['crier', 'lamplighter'] };
export function rolesFor(cityId) { return [...TALK_ROLES, ...((CITY_ONLY_ROLES[cityId]) || [])]; }

/** Which pool a crowd model speaks from, read off what the sprite shows (townFolk.js FOLK_MODELS / CROWD_WEIGHT). */
export const MODEL_ROLE = {
  npc_peasant_man: 'labourer',           // shirtsleeves and a vest
  npc_townsman: 'labourer',              // the big bearded man in work leathers
  npc_patterned_man: 'labourer',         // stripped to the waist: a docker, a raker, a kiln hand
  npc_cheerful_peasant_girl: 'youth',    // a girl in a plain dress, sent on errands
  npc_farmer: 'farmer',                  // the straw hat
  npc_merchant: 'merchant',              // the old man with his crate
  npc_noble_standing: 'noble',
  npc_posh_noble_girl: 'noble',          // the lace cap; houses.js dresses heads of house in her
  npc_confident_woman: 'noble',          // the white gown
  npc_mage: 'scholar',                   // the robe and the staff
  npc_female_adventurer: 'adventurer',
  npc_grizzled_adventurer: 'adventurer', // the grey veteran
  npc_muscular_adventurer: 'adventurer',
  npc_shield_adventurer: 'adventurer',
  npc_sporty_woman: 'adventurer',        // adventurers.js uses her for its own adventurers
  npc_sleek_woman: 'adventurer',         // ...and her
};

/** Strip a painted variant suffix: `npc_farmer_v3` and `npc_farmer` speak alike. */
export function baseModel(key) { return String(key || '').replace(/_v\d+$/, ''); }

/** The role a speaker talks in, or null if they have none (named folk keep their own authored lines). */
export function talkRoleFor(who) {
  if (!who) return null;
  if (who.guard || who.gateGuard || who.isGuard) return 'guard';
  if (who.ttRole) return who.ttRole;
  const m = baseModel(who.model || who.artKey);
  return MODEL_ROLE[m] || null;
}

export function townTalkPool(cityId, role) {
  const c = TOWN_TALK[cityId];
  return (c && role && Array.isArray(c[role])) ? c[role] : null;
}

/**
 * The next line from a pool for one speaker. `mem` is that speaker's own little state ({ bag, last, n }), kept on
 * the speaker. A shuffle bag: every line once before any line twice, and the first draw of a refilled bag is never
 * the line that ended the last one, so the same person never says the same thing back to back.
 */
export function nextTalkLine(pool, mem, rand = Math.random) {
  if (!pool || !pool.length) return null;
  if (!mem) mem = {};
  if (!Array.isArray(mem.bag) || !mem.bag.length || mem.n !== pool.length) {
    const idx = pool.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    // the bag is drawn from its END, so that is the slot that must not repeat the last line said
    if (idx.length > 1 && idx[idx.length - 1] === mem.last) { const t = idx[0]; idx[0] = idx[idx.length - 1]; idx[idx.length - 1] = t; }
    mem.bag = idx; mem.n = pool.length;
  }
  const i = mem.bag.pop();
  mem.last = i;
  return pool[i];
}

// ------------------------------------------------------------------------------------------------ being noticed
export const TT_RANKS = ['normal', 'iron', 'bronze', 'silver', 'gold', 'diamond'];
/** The rank a region takes for granted: what it takes to get there (regions.js exits: the southwest gate wants
 *  Bronze, the Elehyd packet Silver, the portal Gold), and in the Nek, where everyone starts, Iron. */
export const REGION_FLOOR = { nek: 'iron', ontaria: 'bronze', sirukh: 'bronze', elehyd: 'silver', cinder: 'silver', bratugal: 'gold', ixcuatl: 'gold' };

/** How far above what this region takes for granted the player stands. -1 for a Normal-rank player: nobody notices. */
export function rankStanding(rank, regionId) {
  const r = TT_RANKS.indexOf(String(rank || 'normal'));
  if (r < 1) return -1;
  const f = TT_RANKS.indexOf(REGION_FLOOR[regionId] || 'iron');
  return Math.max(0, r - f);
}

/**
 * Four tiers by standing. Tier 0 is "some nobody making iron": a fellow adventurer or a guard who saw you at the hall,
 * three times in a hundred, and the line never names the rank -- there is nothing to name. Above that, more of the
 * street and more often, and a youngster or a noble only once you are worth pointing at.
 */
export const RANK_NODS = [
  {
    roles: ['adventurer', 'guard'], chance: 0.03,
    lines: {
      adventurer: [
        "New face on the board? First contracts are the dull ones. Take them anyway.",
        "Saw you sign in at the hall. Keep your head down a season and you'll be fine.",
        "Another badge in town. Mind anyone who tells you a contract's easy.",
      ],
      guard: [
        "You came through my gate this week. I remember faces, not names. Keep it that way.",
        "Society badge, is it? Then you know where to take trouble, and it isn't my street.",
        "Saw you at the hall door. Behave in my streets and we'll get on.",
      ],
    },
  },
  {
    roles: ['adventurer', 'guard', 'merchant', 'scholar', 'labourer'], chance: 0.07,
    lines: {
      any: [
        "{Rank}, the hall says. Good for you. Mind the step up.",
        "Heard your name at the hall. Not often, but it was there.",
        "You're the {rank} who took that contract, aren't you? Somebody was talking.",
        "My cousin saw you at the board. Says you looked like you knew what you were doing.",
        "Safe roads, {rank}. People are starting to notice who comes back.",
      ],
    },
  },
  {
    roles: [...TALK_ROLES], chance: 0.14,
    lines: {
      any: [
        "{Rank} rank, walking our street. You don't see that every day here.",
        "The hall's been saying your name. Good things, mostly.",
        "Thank you for what you do out there. I mean it.",
        "My lad wants to be you when he grows up. I've told him to eat his greens first.",
        "You're the one they talk about at the tavern. I thought you'd be taller.",
      ],
    },
  },
  {
    roles: [...TALK_ROLES], chance: 0.25,
    lines: {
      any: [
        "*bows* A {rank}-ranker, here. Well.",
        "Everyone's talking about you. Everyone.",
        "The city sleeps easier with you in it. Truly.",
        "I told my mother I'd seen you. She won't believe me. Can I say you waved?",
        "It's an honour. It really is.",
      ],
    },
  },
];

const capWord = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
function fillRank(line, rank) { return line.replace(/\{Rank\}/g, capWord(rank)).replace(/\{rank\}/g, String(rank)); }

/** A passer-by's word about who you are, or null (which is nearly always). `roll` decides whether, `pick` which. */
export function rankNodFor(rank, regionId, role, roll, pick = 0) {
  const s = rankStanding(rank, regionId);
  if (s < 0 || !role) return null;
  const tier = RANK_NODS[Math.min(s, RANK_NODS.length - 1)];
  if (!tier.roles.includes(role)) return null;
  if (!(roll < tier.chance)) return null;
  const pool = tier.lines[role] || tier.lines.any;
  if (!pool || !pool.length) return null;
  return fillRank(pool[Math.min(pool.length - 1, Math.floor(Math.max(0, pick) * pool.length))], rank);
}

// ------------------------------------------------------------------------------------------------------ checks
/** The opening a pool may not repeat: the first two words, lower-cased, punctuation dropped. */
export function openingOf(line) {
  return String(line).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').trim().split(/\s+/).slice(0, 2).join(' ');
}
export const MIN_POOL = 30;
export const MAX_LINE = 140;

export function townTalkFaults() {
  const out = [];
  const everywhere = new Map();
  for (const [city, def] of Object.entries(TALK_CITIES)) {
    if (!TOWN_TALK[city]) { out.push(`${def.name} has no lines`); continue; }
    if (!REGION_FLOOR[def.region]) out.push(`${def.name}'s region ${def.region} has no floor rank`);
    for (const role of rolesFor(city)) {
      const pool = townTalkPool(city, role);
      if (!pool) { out.push(`${def.name} has no ${role} pool`); continue; }
      if (pool.length < MIN_POOL) out.push(`${def.name} ${role}: only ${pool.length} lines`);
      const seen = new Set(), openings = new Map();
      for (const line of pool) {
        if (typeof line !== 'string' || !line.trim()) { out.push(`${def.name} ${role}: an empty line`); continue; }
        if (seen.has(line)) out.push(`${def.name} ${role}: "${line}" twice`);
        seen.add(line);
        const o = openingOf(line);
        if (openings.has(o)) out.push(`${def.name} ${role}: "${line}" opens like "${openings.get(o)}"`);
        else openings.set(o, line);
        if (line.length > MAX_LINE) out.push(`${def.name} ${role}: too long (${line.length}): "${line}"`);
        if (/[{}]/.test(line)) out.push(`${def.name} ${role}: a template in a finished line: "${line}"`);
        if (/[“”"]/.test(line)) out.push(`${def.name} ${role}: a double quote inside a line: "${line}"`);
        const k = line.toLowerCase();
        if (everywhere.has(k) && everywhere.get(k) !== `${city}|${role}`) out.push(`"${line}" is in ${everywhere.get(k)} and ${city}|${role}`);
        everywhere.set(k, `${city}|${role}`);
      }
    }
    // a crier reads the city's news, and a nobody making iron is not news
    for (const line of (townTalkPool(city, 'crier') || [])) {
      if (/\biron\b/i.test(line) || /\byou\b|\byour\b/i.test(line) && /\brank\b/i.test(line)) out.push(`crier speaks of the player's rank: "${line}"`);
    }
  }
  for (const m of Object.keys(MODEL_ROLE)) if (!TALK_ROLES.includes(MODEL_ROLE[m])) out.push(`${m} speaks as ${MODEL_ROLE[m]}, which no city has`);
  if (RANK_NODS[0].roles.length > 2 || RANK_NODS[0].chance > 0.05) out.push('a nobody is noticed too widely');
  return out;
}

export function townTalkCensus() {
  const out = {};
  for (const [city, def] of Object.entries(TALK_CITIES)) {
    out[def.name] = {};
    for (const role of rolesFor(city)) out[def.name][role] = (townTalkPool(city, role) || []).length;
  }
  return out;
}
