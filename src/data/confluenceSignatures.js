// ===========================================================================
// ROUND 55 -- THE TWENTY MARQUEE CONFLUENCES.
//
// The user picked the split: "20 Marquee authored, rest derived". These are the
// twenty. The other eighty-one derive from the trio's spine plus their concept
// vocabulary (confluenceConcepts.js), which the user reviewed and approved.
//
// The specification is their own Dragon list, which is worth restating because
// every set below is built to the same standard:
//
//   "A breath attack like a dragon
//    A storm of fireballs shooting 3 fireballs in seperate directions
//    Dragon scales to reduce damage taken or resist fire
//    Dragon fire passive that buffs all fire into dragonfire which can't be
//    resisted."
//
// Three of those four had no template in the game. `breathCone`, `volley` and
// `elementPierce` were added this round for them, and once they existed the
// other nineteen confluences had shapes worth having too -- a Hydra that
// regrows, a Kraken that drags, a Fortress that will not move.
//
// DESCRIPTIONS ARE MECHANICAL. The user's rule, from the wording pass:
// "The name has flavor but mechanically the ability just channels the name into
// an effect. It doesnt say 'Relentless Assualt: The power of a might charge
// repeated strikes with repeating power of might'. It says 'Each use of this
// attack in quick succession increases the damage of this attack...'" So the
// names below carry the myth and the descriptions say what happens.
//
// A marquee signature is a NAME and a CATEGORY, not a fixed set of numbers.
// The numbers still come from the essence's rank, the stone in the socket and
// the build's spine, so a Dragon assembled by three burst essences and one
// assembled by three menders both get Dragonbreath and it is a different
// ability in each. Authoring the mechanic outright would have thrown that away.
// ===========================================================================

export const CONFLUENCE_SIGNATURES = {
  // ROUND 391 -- every one of the twenty marquee sets (Dragon, Phoenix, Hydra, Kraken, Leviathan, Thunderbird, Griffin,
  // Gorgon, Manticore, Minotaur, Behemoth, Juggernaut, Fortress, Undeath, Doom, Troll, Chimera, Swarm, Wendigo, Volcano)
  // now lives in its confluence's identity sheet (tools/conf_source/<Name>.json, `signature: true`), among the two
  // hundred-odd entries the confluence slot draws from -- see confluenceIdentity.js and docs/CONFLUENCE_IDENTITY.md.
  // A confluence with a sheet must not also lend these to the generic generator, so the arrays are gone rather than
  // ignored (measured: the signature-frame census in awakening.js is the same 72 frames with or without them).
};

/** The marquee names, for the tests and the review export. */
export const MARQUEE_CONFLUENCES = Object.keys(CONFLUENCE_SIGNATURES);

/** Signatures for a confluence def, or an empty list for the derived eighty-one. */
export function confluenceSignaturesFor(name) {
  return CONFLUENCE_SIGNATURES[name] || [];
}
