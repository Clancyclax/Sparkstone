// ROUND 376 -- the kit being built, for the parts of the generator that cannot be handed it as an argument
// (the rank ladders, the attack roles, the synergy gates, the scaling pass). Set by awakening.js
// `rebuildKnownAbilities` for the length of one build and put back afterwards, the same way KIT_SALT and
// KIT_SUCCESSION are. Outside a build it says "no archetype, afflictions allowed", which is how everything
// generated outside a player's kit (monsters, NPCs) has always behaved.
export const KIT_IDENTITY = { arch: null, afflictions: true, debuffRate: null };

/** Is an affliction payoff allowed on this ability? Its own stamp first (an ability built in a kit carries
 *  `affFree` for life, so a rank-up recomputed later reads the same answer), then the build in progress. */
export function afflictionPayoffAllowed(spec) {
  if (spec && spec.affFree) return false;
  return KIT_IDENTITY.afflictions !== false;
}

/** Run `fn` with the identity given, and put the old one back after (a companion's kit, built outside the
 *  player's rebuild). */
export function withKitIdentity(id, fn) {
  const old = { ...KIT_IDENTITY };
  Object.assign(KIT_IDENTITY, id);
  try { return fn(); } finally { Object.assign(KIT_IDENTITY, old); }
}
