// ROUND 42 -- the build stamp.
//
// The user asked for "a small unobtrusive 'Playing version Number X'" under
// the map, and the reason it earns its place is bigger than tidiness: three
// consecutive update packs sat unapplied on the Desktop without anyone being
// able to tell, because a running build says nothing about which round it
// is. Now it does -- one glance under the minimap answers "did the update
// land?" before any bug report is written.
//
// GAME_VERSION is the ROUND number, which is the unit this project has
// actually been developed and delivered in. Bump it in the same commit that
// ships a round; nothing else reads it.
export const GAME_VERSION = 100;
