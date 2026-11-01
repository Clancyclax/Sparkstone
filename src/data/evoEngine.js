// ============================================================================
// ROUND 366 -- THE NATURE GIFT EVOLUTION ENGINE: the shared effects every catalogue entry is written in.
//
//   "Let's move forward with all the suggestions": a dozen shared effects, then each catalogue entry becomes a
//   short spec of trigger, effect and numbers (public/assets/data/nature_evolution_specs.json), so 3,984 entries
//   are data and not 3,984 pieces of code. The scene side is scenes/evoMixin.js.
//
// A SPEC
//   { passive?: { <fx> },                      always on while the evolution is held (the nature fx keys, plus PASSIVE_KEYS)
//     rules?: [ { on, when?, chance?, cd?, perDay?, cost?, do: [ <op>, ... ] } ] }
//
//   on       an EVENT (EVENTS below)
//   when     filters: kind (KINDS), element, hpBelow (the player's health fraction), targetBelow (the target's),
//            rankAbove (target rank minus yours, at least), inCombat (true/false), stealthed (true)
//   chance   0-1, default 1
//   cd       seconds before the rule can fire again (default 0; `interval` rules use it as the period)
//   perDay   at most this many firings a game day
//   cost     { mana|stamina|health: fraction of maximum } -- paid first; the rule does nothing if it cannot be paid
//   do       OPS, each { op, ...args } (OPS below). Damage is a FRACTION of the target's maximum health, scaled by
//            rank (x1.6 for each rank you are above it, /1.6 for each below), so a spec reads the same at any rank.
//
// Numbers are small on purpose: an evolution adds to a character, it does not become the character.
// ============================================================================

export const EVENTS = {
  loot: 'you loot a corpse (ctx: the corpse)',
  kill: 'you kill an enemy (ctx: the monster)',
  strike: 'you land a blow (ctx: the monster)',
  crit: 'you land a critical blow',
  cast: 'you use an ability (ctx: the ability; filter with when.kind)',
  afflict: 'you inflict an affliction (ctx: the monster, the affliction key)',
  hurt: 'you take damage (ctx: the monster that struck)',
  lowHealth: 'your health falls below when.hpBelow (default 0.3), once per fight',
  wouldDie: 'you would die (use with deathSave)',
  summon: 'one of your summons appears (ctx: the summon)',
  pickup: 'an item comes into your inventory (ctx: the item kind and id)',
  combatStart: 'a fight begins (the first enemy that hunts you)',
  interval: 'every `cd` seconds while in a fight',
  talk: 'you open a conversation',
  shop: 'you open a shop',
  use: 'you press the evolution key (N) with this evolution set on it -- for "you can ..." abilities; give it a cd and usually a cost',
};

export const KINDS = ['spell', 'special', 'summon', 'movement', 'affliction', 'heal', 'buff', 'aoe', 'longCooldown', 'favoured', 'any'];

export const OPS = {
  damage: 'at (target|nearest|area|self), radius?, frac, element?',
  zone: 'at (target|corpse|self), radius, seconds, element?, dps (frac of max health a second), afflict?, slow?, heal? (frac a second to you and allies inside)',
  throw: 'frac, element?, stun? (seconds) -- something hurled at the nearest enemy',
  afflict: 'at (target|area), radius?, key (an affliction: burn|poison|bleed|curse|shocked|vulnerable|wet|...), seconds, stacks?',
  spread: 'radius -- the target\'s afflictions leap to the nearest other enemy',
  control: 'at (target|area), radius?, key (stun|slowMove|pinned|freeze|vulnerable), seconds',
  confuse: 'at (target|area), radius?, seconds -- turned to fight their own side (the game\'s Turn)',
  decoy: 'seconds, radius? -- a likeness of you that enemies near it go after',
  stealth: 'seconds -- you are veiled (the game\'s stealth)',
  shield: 'frac -- a shield of this fraction of your maximum health',
  restore: 'pool (health|mana|stamina), frac',
  cooldown: 'frac, kind? -- your other abilities\' remaining cooldowns shortened by this fraction',
  buff: 'stat (dmg|speed|crit|dodge|regenHealth|regenMana|regenStamina|healingReceived|castSpeed|cooldownRate), amount, seconds',
  husk: 'seconds, frac (of the corpse\'s health) -- the corpse rises and fights for you',
  summonBoost: 'frac, seconds -- your summons hit harder and are hardier',
  loot: 'extra (0-1) -- a further share of this kill\'s drop',
  core: 'a core from this kill (or the item, with the condemn passive)',
  mark: 'what (enemies|stones|essences|chests|nodes|corpses), radius (tiles), seconds -- shown on your map',
  teleport: 'to (target|corpse) -- you step to it',
  deathSave: 'hp (fraction) -- on wouldDie: you do not die',
  fx: 'name -- a visual only (the spell art for that name)',
  drop: 'what (stone|essence|potion|core|coin|consumable), chance? -- the victim (or where you stand) drops one',
  // ROUND 367
  tally: 'key, at (target|self|ally), add? (1), max? (10), seconds? (10, how long the count lasts), reset? -- count something on a body',
  cleanse: 'at (self|ally), count? (1), tag? (affliction|control), key? (one named condition) -- remove conditions',
  push: 'at (target|area|nearest), radius?, dist (px, default 90), from? (self|target) -- shove enemies away',
  pull: 'at (target|area|nearest), radius?, dist (px, default 90) -- drag enemies toward you',
  place: 'what (wall|statue|pillar), seconds (<= 60), at? (ahead|target|self|ally), length? (wall px, 48-320), frac? (statue/pillar health, share of yours), taunt?, radius?, around? (a zone: dps, heal, element, afflict, slow, radius)',
};

/** Ops may also carry `perStack: { key, at, k, max }` -- frac/dps/amount/heal/extra/dist grow by k per count (a tally key,
 *  or @afflictions, @stacks:<condition>, @enemies, @allies). `at: 'ally'` on restore, shield, buff, cleanse, zone and
 *  teleport (to) means your chosen ally (Q / D-pad up), else the most wounded one near you. */

/** Passive keys the engine reads (on top of the nature fx keys round 361-363 built). */
export const PASSIVE_KEYS = {
  hoverInfo: 'hover an enemy to see its health, resistances and weaknesses',
  mapMarks: 'list of what (as the mark op) always shown on your map, within mapRadius (default 40 tiles)',
  mapRadius: 'tiles',
  condemn: 'an item in your bag can be condemned into a core (the bag shows the button)',
  summonGear: 'gear held in your bag lends its strength to your summons',
  priceCut: 'shops charge you this fraction less',
  sellBonus: 'shops pay you this fraction more',
  sightCut: 'enemies see you from this fraction less far',
  pickupRadius: 'loot comes to you from this fraction further (flavour only: never the whole of an evolution)',
  // ROUND 388 -- the four evolutions that were only pickupRadius, built (scenes/evoLootMixin.js)
  tentacleLoot: 'shadow tentacles empty every body within five tiles into your bag, in a fight or out of one',
  regionLoot: 'every unlooted kill in your region (or dungeon) is on the map to loot from there; a dungeon or astral realm\'s dead are kept for you when you leave',
  callStone: 'once every 24 game hours, call one awakening stone you own (reliquary, a shop you sold it to -- its price owed -- or the pack you died with) to your bag',
  shroud: 'a kill carrying an affliction you laid is shrouded: refused to enemy use, and lootable with E from ten tiles',
};

export const NATURE_FX_KEYS = ['awaken', 'effect', 'dmg', 'resist', 'attr', 'loot', 'cdCut', 'move', 'guard', 'perception', 'healTaken',
  'afflictResist', 'afflictCut', 'mindResist', 'manaRestore', 'manaRegen', 'dodge', 'potionCdCut', 'extraFood', 'findMult', 'auraHidden', 'dispelExtra'];

/** Damage (or health) as a share of a target's maximum, scaled by the rank gap and clamped. */
export function rankScaledFrac(frac, myRank, theirRank) {
  return Math.max(0.005, Math.min(0.6, frac * Math.pow(1.6, (myRank || 0) - (theirRank || 0))));
}

/** Everything wrong with one spec, as strings. ROUND 389 -- `{ party: true }` checks a COMPANION's spec
 *  (nature_evolution_specs_party.json): the party events, ops, when keys, buff stats and passive keys join, and
 *  anything the companion runtime (scenes/partyEvoMixin.js) does not run is a fault, so no party spec holds a dead piece. */
export function evoSpecFaults(spec, label = 'spec', opts = {}) {
  const f = [];
  const party = !!(opts && opts.party);
  const EV = party ? { ...EVENTS, ...PARTY_EVENTS } : EVENTS;
  const OP = party ? { ...OPS, ...PARTY_OPS } : OPS;
  const WK = party ? [...WHEN_KEYS, ...PARTY_WHEN_KEYS] : WHEN_KEYS;
  const BS = party ? [...BUFF_STATS, ...PARTY_BUFF_STATS] : BUFF_STATS;
  if (!spec || typeof spec !== 'object') return [`${label}: not an object`];
  for (const k of Object.keys(spec)) if (!['passive', 'rules', 'gap'].includes(k)) f.push(`${label}: key ${k}`);
  const known = party ? new Set([...PARTY_READ_FX, ...Object.keys(PARTY_PASSIVE_KEYS)]) : new Set([...NATURE_FX_KEYS, ...Object.keys(PASSIVE_KEYS)]);
  for (const k of Object.keys(spec.passive || {})) if (!known.has(k)) f.push(`${label}: passive key ${k}`);
  for (const [k, v] of Object.entries(spec.passive || {})) {
    if (typeof v === 'number' && !(v >= 0 && v <= (k === 'mapRadius' ? 120 : 1))) f.push(`${label}: passive ${k} = ${v}`);
    if (v && typeof v === 'object' && !Array.isArray(v)) for (const [t, n] of Object.entries(v)) if (!(typeof n === 'number' && n >= 0 && n <= (k === 'attr' ? 5 : 1))) f.push(`${label}: passive ${k}.${t} = ${n}`);
  }
  if (spec.passive && spec.passive.mapMarks) for (const w of [].concat(spec.passive.mapMarks)) if (!MARK_WHAT.includes(w)) f.push(`${label}: mapMarks ${w}`);
  if (!Array.isArray(spec.rules || [])) f.push(`${label}: rules not a list`);
  for (const [i, r] of (spec.rules || []).entries()) {
    const at = `${label} rule ${i}`;
    if (!EV[r.on] || (party && PARTY_NO_EVENTS.includes(r.on))) f.push(`${at}: event ${r.on}`);
    for (const k of Object.keys(r)) if (!['on', 'when', 'chance', 'cd', 'perDay', 'cost', 'do', ...(party ? ['perFight'] : [])].includes(k)) f.push(`${at}: key ${k}`);
    if (r.perFight !== undefined && !(r.perFight >= 1 && r.perFight <= 10)) f.push(`${at}: perFight ${r.perFight}`);
    for (const k of Object.keys(r.when || {})) if (!WK.includes(k)) f.push(`${at}: when.${k}`);
    if (r.when && r.when.tally && !(r.when.tally.key && r.when.tally.atLeast >= 1)) f.push(`${at}: when.tally needs key and atLeast`);
    if (r.when && r.when.kind && !(KINDS.includes(r.when.kind) || (party && r.when.kind === 'attack'))) f.push(`${at}: kind ${r.when.kind}`);
    if (party && r.when) for (const k of ['targetHas', 'selfHas']) if (r.when[k] !== undefined && ![].concat(r.when[k]).every(x => typeof x === 'string' && x)) f.push(`${at}: when.${k} names conditions`);
    if (r.chance !== undefined && !(r.chance > 0 && r.chance <= 1)) f.push(`${at}: chance ${r.chance}`);
    if (r.cd !== undefined && !(r.cd >= 0 && r.cd <= 3600)) f.push(`${at}: cd ${r.cd}`);
    for (const [pool, v] of Object.entries(r.cost || {})) if (!['mana', 'stamina', 'health'].includes(pool) || !(v > 0 && v <= 0.8)) f.push(`${at}: cost ${pool} ${v}`);
    if ((r.on === 'interval' || r.on === 'use') && !(r.cd > 0)) f.push(`${at}: ${r.on} needs cd`);
    if (!Array.isArray(r.do) || !r.do.length) f.push(`${at}: no ops`);
    for (const o of (r.do || [])) {
      if (!OP[o.op] || (party && PARTY_NO_OPS.includes(o.op))) f.push(`${at}: op ${o.op}`);
      for (const k of ['frac', 'dps', 'amount', 'extra', 'hp', 'heal']) if (o[k] !== undefined && !(o[k] >= 0 && o[k] <= 1.5)) f.push(`${at}: ${o.op}.${k} = ${o[k]}`);
      if (o.seconds !== undefined && !(o.seconds > 0 && o.seconds <= (party && o.op === 'tally' ? 86400 : 120))) f.push(`${at}: ${o.op}.seconds = ${o.seconds}`);   // ROUND 389 -- a companion's count may last a day
      if (o.op === 'deathSave' && r.on !== 'wouldDie') f.push(`${at}: deathSave outside wouldDie`);
      if (o.op === 'mark' && o.what && !MARK_WHAT.includes(o.what)) f.push(`${at}: mark ${o.what}`);
      if (o.op === 'drop' && !DROP_WHAT.includes(o.what)) f.push(`${at}: drop ${o.what}`);
      if (o.op === 'buff' && o.stat && !BS.includes(o.stat)) f.push(`${at}: buff ${o.stat}`);
      if (o.op === 'restore' && o.pool && !['health', 'mana', 'stamina'].includes(o.pool)) f.push(`${at}: restore ${o.pool}`);
      if (o.at && !AT.includes(o.at) && !(party && (PARTY_AT.includes(o.at) || (o.at === 'allies' && o.op === 'advance')))) f.push(`${at}: at ${o.at}`);
      if (o.element && !ELEMENTS.includes(o.element)) f.push(`${at}: element ${o.element}`);
      if (o.op === 'tally' && (!o.key || (o.at && !TALLY_AT.includes(o.at)))) f.push(`${at}: tally needs a key and at target|self|ally`);
      if (o.op === 'place') {
        if (!PLACE_WHAT.includes(o.what)) f.push(`${at}: place ${o.what}`);
        if (!(o.seconds > 0 && o.seconds <= 60)) f.push(`${at}: place.seconds = ${o.seconds}`);
        if (o.length !== undefined && !(o.length >= 48 && o.length <= 320)) f.push(`${at}: place.length = ${o.length}`);
        if (o.around) for (const k of ['dps', 'heal']) if (o.around[k] !== undefined && !(o.around[k] >= 0 && o.around[k] <= 0.1)) f.push(`${at}: place.around.${k} = ${o.around[k]}`);
      }
      if ((o.op === 'push' || o.op === 'pull') && o.dist !== undefined && !(o.dist > 0 && o.dist <= 260)) f.push(`${at}: ${o.op}.dist = ${o.dist}`);
      if (o.perStack && (!o.perStack.key || !(o.perStack.k > 0 && o.perStack.k <= 1))) f.push(`${at}: perStack needs key and k in (0,1]`);
      // ROUND 389 -- the companion ops' own limits
      if (o.op === 'advance' && (!(o.amount > 0 && o.amount <= 0.5) || (o.to && !ADVANCE_TO.includes(o.to)))) f.push(`${at}: advance needs amount in (0,0.5] and to ${ADVANCE_TO.join('|')}`);
      if (o.op === 'empower' && (!(o.frac > 0 && o.frac <= 1) || (o.uses !== undefined && !(o.uses >= 1 && o.uses <= 5)) || (o.kind && !KINDS.includes(o.kind) && o.kind !== 'attack'))) f.push(`${at}: empower needs frac in (0,1], uses 1-5, a kind`);
      if (o.op === 'refund' && !(o.frac > 0 && o.frac <= 1)) f.push(`${at}: refund needs frac in (0,1]`);
      if (o.op === 'cooldown' && o.which && !COOLDOWN_WHICH.includes(o.which)) f.push(`${at}: cooldown.which ${o.which}`);
      if (o.op === 'ready' && o.kind && !KINDS.includes(o.kind)) f.push(`${at}: ready kind ${o.kind}`);
      if (o.op === 'oneOf') {
        if (!Array.isArray(o.ops) || o.ops.length < 2 || o.ops.some(x => x && x.op === 'oneOf')) f.push(`${at}: oneOf needs two or more ops, none of them oneOf`);
        else for (const x of evoSpecFaults({ rules: [{ on: r.on, cd: r.cd, do: o.ops }] }, `${at} oneOf`, opts)) f.push(x);
      }
      if (o.op === 'zone' && o.pool && !(party && ['health', 'mana'].includes(o.pool))) f.push(`${at}: zone.pool ${o.pool}`);
    }
  }
  if (!(spec.rules || []).length && !Object.keys(spec.passive || {}).length) f.push(`${label}: empty`);
  return f;
}

export const WHEN_KEYS = ['kind', 'element', 'hpBelow', 'targetBelow', 'rankAbove', 'inCombat', 'stealthed', 'tally', 'targetAfflictions'];
export const PLACE_WHAT = ['wall', 'statue', 'pillar'];
export const TALLY_AT = ['target', 'self', 'ally'];
export const MARK_WHAT = ['enemies', 'stones', 'essences', 'chests', 'nodes', 'corpses'];
export const DROP_WHAT = ['stone', 'essence', 'potion', 'core', 'coin', 'consumable'];
export const BUFF_STATS = ['dmg', 'speed', 'crit', 'dodge', 'regenHealth', 'regenMana', 'regenStamina', 'healingReceived', 'castSpeed', 'cooldownRate'];
export const AT = ['target', 'nearest', 'area', 'self', 'corpse', 'ally', 'ahead'];
export const ELEMENTS = ['physical', 'fire', 'frost', 'lightning', 'nature', 'shadow', 'radiant', 'dimension', 'necrotic', 'disruptive', 'resonating', 'transcendent'];

// ============================================================================
// ROUND 389 -- THE COMPANIONS' EVOLUTIONS RUN. "Effects in play ... Should any be built?" -- yes. The same grammar, with
// the COMPANION as "self" (their health, mana and stamina, their kit, where they stand, what they fight) and the player as
// one of their allies. The runtime is scenes/partyEvoMixin.js; the specs are nature_evolution_specs_party.json, keyed
// `<nature>.<ability>|<catalyst lower>` like the player's, and validated with evoSpecFaults(spec, key, { party: true }).
// What follows exists only on that side: a player spec that uses it is a fault. A companion's "ability" is one of its
// kit's; its casts are paid from mana and its weapon swings from stamina.
// ============================================================================
export const PARTY_EVENTS = {
  windup: 'the holder begins an ability, before it lands (ctx: the ability, the holder\'s target) -- an `empower` here strengthens this very use',
  fightEnd: 'a fight the holder was in is over (ctx: how long it ran, for @fightLen)',
  rankUp: 'one of the holder\'s abilities reaches its next practice rank (ctx: the ability; see `advance`)',
  rest: 'the party rests (meditation in town, a night in the transport); the holder first names its focus (most-used ability) and its quarry (most-fought kind of enemy)',
  fall: 'the holder is felled in a fight',
  rise: 'the holder gets back up after being felled',
  evade: 'the holder dodges a blow',
  travel: 'every forty tiles the holder walks outside a fight',
  allyKill: 'you or another companion kills an enemy within 8 tiles of the holder (ctx: the monster)',
  allyCast: 'you or another companion uses an ability within 8 tiles of the holder (ctx: the ability)',
  allyCrit: 'you or another companion lands a critical blow within 8 tiles of the holder',
  allyFall: 'another companion is felled within 12 tiles of the holder',
  allyRankUp: 'another companion\'s ability reaches a practice rank within 8 tiles of the holder (ctx: the ability)',
};
/** Player events a companion has no door for (it loots, picks up, talks and shops through you, and has no summons). */
export const PARTY_NO_EVENTS = ['loot', 'pickup', 'talk', 'shop', 'summon'];
/** Which abilities `advance` reaches. */
export const ADVANCE_TO = ['ctx', 'last', 'most', 'top', 'least', 'leastUsed', 'highest', 'used', 'unused', 'all', 'random', 'focus',
  'fixed', 'season', 'today', 'onceToday', 'killers', 'recent', 'same', 'essence'];
export const COOLDOWN_WHICH = ['others', 'ctx', 'all', 'longest'];
export const PARTY_OPS = {
  advance: 'amount (a share of one practice rank, <= 0.5), to? (ADVANCE_TO), kind?, drain?, at? (allies) -- practice: each practice rank '
    + '(five at most) gives that ability 4% increased effect and fires rankUp. to: ctx = this event\'s ability (else the last used); last; '
    + 'most = most used this fight; top = most used ever; least = least practised; leastUsed = least used ever; highest = most practised; '
    + 'used / unused = this fight; all; random; focus = the one named at its last rest (never from itself); fixed = the one drawn at the '
    + 'fight\'s start; season = this fight\'s in the kit\'s rotation; today = most used today; onceToday = used only once today; killers = '
    + 'those that landed killing blows this fight; recent = the last three used; same = its least practised of the same kind (attack, '
    + 'defence, movement) as this event\'s; essence = the others from this ability\'s essence. drain: taken away instead (never a rank). '
    + 'at: allies = the other companions within 8 tiles instead',
  empower: 'frac (<= 1), uses? (1-5, default 1), kind? (a KIND, or attack: its weapon swings), seconds? (default 30), crit?, same?, at? (ally) -- '
    + 'the holder\'s next use(s) land with this much increased effect (crit: as a critical, x1.5 plus its crit damage; same: only this '
    + 'event\'s ability; at ally: another companion\'s next use, or you a brief damage boon)',
  refund: 'frac -- this use\'s cost is returned to the pool it came from (a companion\'s abilities cost mana, its swings stamina)',
  ready: 'kind? -- the holder\'s next ability comes at once, the kind preferred if one is off cooldown',
  oneOf: 'ops: [ <op>, ... ] -- one of them, at random',
};
/** Ops a companion cannot run (they work through the player's map, bag, summons or likeness). */
export const PARTY_NO_OPS = ['husk', 'summonBoost', 'mark', 'core', 'decoy'];
/** Read by the companion runtime only (a party rule may also carry `perFight: n` -- "this happens once per fight"). */
export const PARTY_WHEN = {
  hpAbove: 'the holder\'s health fraction is over this', manaBelow: 'mana fraction under', manaAbove: 'mana fraction over',
  staminaBelow: 'stamina fraction under', staminaAbove: 'stamina fraction over',
  rankBelow: 'the target is at least this many ranks below the holder',
  targetBoss: 'the target is (true) or is not (false) a boss', targetFamily: 'the target\'s family is one of these (monsters.js keys)',
  targetKind: 'the target\'s subtype is one of these (fauna, mechanical, mineral, undead, ethereal, flora, liquid, elemental)',
  targetFlying: 'the target is (true) or is not (false) airborne', targetHuge: 'a big body or a boss', targetSmall: 'a small body',
  targetHas: 'the target carries one of these conditions (a key or a list)', targetTurned: 'the target is turned against its own side (confused)', targetUnaware: 'the target is not hunting anyone yet',
  targetBusy: 'the target is busy with someone other than the holder', targetOnMe: 'the target is on the holder',
  targetIsolated: 'no other enemy within 2 tiles of the target', targetRecovering: 'the target has just swung',
  targetWinding: 'the target is in the middle of a swing', targetMoving: 'the target is on the move',
  targetFar: 'tiles: the target is at least this far', targetNear: 'tiles: the target is at most this far',
  weakTo: 'this event\'s ability\'s element is one the target is weak to', newFoe: 'the holder has never fought this kind of enemy',
  quarry: 'the target is the kind the holder named at its last rest', sharedTarget: 'you or another companion fights the same enemy',
  selfHas: 'the holder carries one of these conditions (or "any")',
  noTally: '{ key, at } -- that count is zero (the opposite of when.tally)', tallyMod: '{ key, at, of, is } -- that count modulo `of` is `is` (or one of a list)',
  alone: 'true: no ally (you or another companion) within 6 tiles; false: one is', allyNear: 'tiles: an ally is this close',
  allyBelow: 'an ally within 12 tiles is under this health fraction', partyUp: 'no companion is down',
  surrounded: 'at least this many enemies within 3 tiles of the holder', enemiesAtMost: 'no more than this many enemies within 8 tiles',
  still: 'true: the holder has not moved for two seconds; false: it has', moving: 'true: the holder is moving',
  untargeted: 'no enemy is on the holder, and nothing struck it for four seconds',
  blocked: 'hurt: the holder blocked the blow', hardHit: 'hurt: the blow took a tenth of its health or more',
  melee: 'hurt: the blow came from an enemy beside the holder (not a shot)',
  noBoons: 'the holder carries no evolution boon (buff or empower) right now', regenerating: 'the holder is healing over time below full health',
  wet: 'the holder is wet or standing in water', outdoors: 'true: under the sky (or in an astral realm)', daylight: 'outdoors, by day',
  night: 'by night', raining: 'outdoors in rain or a storm',
  firstCast: 'the first ability the holder uses this fight', firstUse: 'this ability\'s first use this fight',
  useCountAtMost: 'this ability has been used no more than this many times this fight',
  afterOther: 'seconds: this use came within that long of a DIFFERENT ability', afterOtherEssence: 'seconds: ... of an ability from a different essence',
  afterKind: '{ kind, seconds }: this use came within that long of one of that kind', afterAlly: 'seconds: within that long of an ally\'s ability',
  repeat: 'true: the same ability as the holder\'s last; false: a different one', routine: 'its last three uses repeat the three before them',
  alternating: 'its last four uses alternate between two abilities', isTop: 'this is its most-used ability of its kind',
  isHighest: 'this is its most practised ability', isFixed: 'this is the ability drawn at the fight\'s start', inSeason: 'this is the ability in season this fight',
  nearRank: 'this ability is close to its next practice rank', practiceGap: 'its most and least practised abilities are this many practice ranks apart',
  sameOpener: 'this ability opened its last fight too', notLastFight: 'this ability went unused in its last fight',
  usedAll: 'every ability in its kit has been used this fight', readyKind: 'one of its abilities of this kind is off cooldown',
  noneReady: 'every one of its abilities of this kind is on cooldown', lastReady: 'all but one of its abilities of this kind are on cooldown',
};
export const PARTY_WHEN_KEYS = Object.keys(PARTY_WHEN);
/** The counts a companion reads live (for perStack and when.tally), besides the player's @enemies, @allies, @afflictions, @stacks:<key>. */
export const PARTY_LIVE = {
  '@rankGap': 'ranks the target stands above the holder', '@victimRank': 'the target\'s rank', '@range': 'tiles to the target',
  '@hit': 'enemies this use reached', '@idle': 'five-second spans since this ability was last used this fight',
  '@ranks': 'practice ranks held across the kit', '@practice': 'practice ranks this ability holds', '@sinceRank': 'uses (in fives) since this ability last ranked',
  '@fightLen': 'tens of seconds this fight has run', '@streak': 'consecutive fights this ability has been used in', '@armor': 'the holder\'s armour, in twenties',
};
export const PARTY_BUFF_STATS = ['guard', 'costCut'];
export const PARTY_AT = ['beside'];
/** The nature fx a companion reads (natureMixin: kit scaling, stat block, mana regen, loot, healing taken). */
export const PARTY_READ_FX = ['awaken', 'effect', 'dmg', 'resist', 'dodge', 'healTaken', 'manaRegen', 'loot'];
export const PARTY_PASSIVE_KEYS = {
  practice: 'each use of an ability practises it by this share of a practice rank (Human Ambition: "essence abilities advance more quickly")',
};
/** Practice ranks: what one gives, and how many an ability can hold. */
export const PRACTICE_STEP = 0.04;
export const PRACTICE_MAX = 5;
