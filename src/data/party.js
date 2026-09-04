// ROUND 44 -- THE PLAYER'S TEAM.
//
// The user's brief, verbatim: "the player will become part of a team and thus
// a group of NPCs will often be following the player each with their own
// essences and abilities... These NPCs will roughly align their rank to the
// player randomly around 10% ahead of or behind the players exact rank
// status. When entering town they may ask for a moment to meditate if they
// need to rank up."
//
// Four named members, each recruited in a stated region:
//   1) Zeke Clark          Healer      older human man, former farmer   Region 1
//   2) Encykla Britanika   Ranged DPS  older twin, elf                  Region 2
//   3) Ædia Britanika      Melee DPS   younger twin, elf                Region 2
//   4) Benjamin Iskarys    Tank        younger male Celestine           Region 2
//
// ROUND 46 -- THE REAL MODELS LANDED. `art` now names a key in
// characterManifest.js (CHAR_ART) rather than an npcs.js placeholder, and each
// member has an idle, a walk and an attack -- for the casters, the attack is
// the spell-casting animation. That was the one field the round-44 note said
// would need changing, and it was.

// ROUND 49 -- THE TEAM'S REAL ESSENCES.
//
// The user wrote the team's backgrounds and fixed each member's essences by
// hand, over several messages:
//
//   "Zeke (Healer) with a Renewal, Prosperity, and Chicken" -- then, on being
//   told Prosperity is a confluence name and not a droppable essence:
//   "Instead lets give zeke, Renewal, Life, Chicken"
//
//   "Aedia (Melee DPS) has the Knife, Adept, and Foot"
//
//   "Encykla(Ranged DPS) has a Lightning, Fire, and Potent" -- then, on the
//   confluence that produced: "vortex keys off of Wind, water, void,
//   dimension... Lets switch her to Lightning, Wind, and Vast which shoukd
//   result in the Storm Confluence."
//
//   "Benjamin (Tank) has the Might, Iron, and Blood" -- then "Lets swap might
//   for shield", then "Swap Benjamins Blood essence for the Pangolin essence."
//
// The confluences these resolve to, through round 49's lever-themed +
// keyword-ranked resolveConfluenceName:
//
//   Zeke     Renewal + Life + Chicken     heal   -> Confluence of Unity
//   Aedia    Knife + Adept + Foot         strike -> Confluence of Master
//   Encykla  Lightning + Wind + Vast      aoe    -> Confluence of Storm
//   Benjamin Shield + Iron + Pangolin     guard  -> Confluence of Fortress
//
// ROUND 49 -- TWO STONES PER SLOT, AND THE OTHER TWO ARE THE PLAYER'S.
//
// The user: "for the companion characters they should have their 4 essences (3
// regular and the confluemce) when each is met. lets populate 2 thematically
// appropriate awakening stones in each essence for the companions, and leave
// the remaining stones up to the player to provide the flexibilty and fun of
// essence building."
//
// So `stones` -- a flat list of four, which the kit generator spread across
// whichever essence it happened to be on -- becomes `slotStones`, the SAME
// four-list shape the player's own sockets use. Each slot arrives holding two
// of a STONE_SLOT_CAP of four, so every companion walks in half-built and the
// other half is a decision.
//
// The fourth list is the CONFLUENCE slot. A companion always has one, because
// they always have three essences, so it is stocked like the others rather than
// left empty -- an empty confluence would be the one slot that felt like a bug.
//
// The stone lists moved with them. Round 48 split the two catalogs -- essence
// is the LEVER, stone is the MATERIAL -- so a member's stones are no longer
// required to mirror their essences, but a tank carrying water stones would
// still read as an accident rather than a build.

// Each member's build, in the same shape GUARD_BUILDS uses, so the kit comes
// out of the SAME buildCandidatePool generator the watch and the player use.
// A healer really does get healing abilities, a tank really does get guard
// essences -- the role is the essence list, not a label on top of one.
export const PARTY = [
  {
    id: 'zeke',
    name: 'Zeke Clark',
    role: 'healer',
    roleLabel: 'Healer',
    art: 'zeke',                  // ROUND 46 -- real model, char_zeke_*
    region: 'nek',
    // Recruited at the city he keeps coming back to; he is not from there.
    recruitAt: { tx: 512, ty: 470 },
    build: {
      // Renewal + Life + Chicken -> Confluence of Unity.
      essences: ['heal', 'essLife', 'essChicken'],
      slotStones: [
        ['stoneRenewal', 'stoneHealer'],   // Renewal -- the turning season, and the hand that tends it
        ['stoneLife', 'stoneGrowth'],      // Life -- stubborn vitality, and what it does given room
        ['stoneBird', 'stoneCrops'],       // Chicken -- the flock, and the yard it scratches
        ['stoneHarmonic', 'stoneFeast'],   // Confluence of Unity -- resonance, and a table everyone eats at
      ],
    },
    blurb: 'Farmed the Nek bottoms for thirty years. Bonded Life late, and badly, and lived.',
    greet: "I'm no hero. I'm just the one who keeps the rest of you standing. That's enough of a job.",
    meditate: "Give me a moment on the stones, would you? I can feel the next one sitting right there.",

    // ROUND 48 (item 2) -- Zeke is not stood in a field waiting to be walked
    // past any more. The user: "Zeke should be located within the adventurers
    // guild looking for someone to team up with to go back and clear his
    // former farm of monster packs. After successfully completing this mission
    // with Zeke he joins the players team."
    //
    // Three things follow from that sentence and all three are data here:
    //   1. WHERE he is -- `guildAt`, a tile inside the 'guild' interior room
    //      rather than a point in the region. WorldScene reads this instead of
    //      `recruitAt` when it exists.
    //   2. That he is GATED -- `recruitQuest` names the mission that has to be
    //      accepted before he will walk anywhere, which is what stops the
    //      ordinary walk-close-and-they-join rule firing on him.
    //   3. That the mission is a JOB OFFER, so he needs the lines for offering
    //      it, for being asked again mid-job, and for the end of it.
    //
    // `recruitAt` is deliberately left above rather than deleted: it is the
    // round-44 record of where he used to be met, and the east tables of the
    // guild hall are the same city.
    guildAt: { room: 'guild', tx: 15, ty: 8, facing: 'southwest' },
    recruitQuest: 'zeke_farm',
    // "looking for someone to team up with" -- he opens by asking, not by
    // introducing himself. The blurb is held back for the accept.
    jobOffer:
      "You look like you can hold a line.\n\n" +
      "I had a farm out in the bottoms, west of the road. Thirty years of it. Something moved in "
      + "while I was here getting my papers stamped and now there are packs of them denning in my "
      + "barn.\n\nI can keep you standing. I can't clear it alone. Team up with me and we go and "
      + "take it back.",
    jobAccept:
      "Then we go. Follow the southwest road and cut west before Milrow — you'll see the roof.\n\n"
      + "I'm no hero. I'm just the one who keeps the rest of you standing. That's enough of a job.",
    jobDecline:
      "Fair enough. It's waited this long. Come and find me at the east tables when it stops "
      + "sitting right with you.",
    // Asked again while the job is running.
    jobNag: "Still standing? Good. The packs are still out there. West of the road, before Milrow.",
    // The mission's own completion line -- said once, when the last pack drops.
    jobDone:
      "That's the last of them.\n\nThirty years and I couldn't hold it on my own for a week. "
      + "I'm not going back to it. Wherever you're going next, I'm coming — properly this time.",
  },
  {
    id: 'encykla',
    name: 'Encykla Britanika',
    role: 'ranged',
    roleLabel: 'Ranged DPS',
    art: 'encykla',               // ROUND 46 -- real model, char_encykla_*
    region: 'ontaria',
    recruitAt: { tx: 300, ty: 220 },
    twin: 'aedia', elder: true,
    build: {
      // Lightning + Wind + Vast -> Confluence of Storm.
      essences: ['essLightning', 'essWind', 'essVast'],
      slotStones: [
        ['stoneLightning', 'stoneFork'],     // Lightning -- the arc, and where it splits
        ['stoneWind', 'stoneCloud'],         // Wind -- the gale, and what it drives
        ['stoneVast', 'stoneEcho'],          // Vast -- the span, and what carries across it
        ['stoneElemental', 'stoneApocalypse'], // Confluence of Storm -- weather, at both scales
      ],
    },
    blurb: 'The elder twin by eleven minutes, and has never once let it go unmentioned.',
    greet: 'Stand where I can see past you and we will get along beautifully.',
    meditate: 'Eleven minutes older and still ranking up second. Give me the moment, please.',
  },
  {
    id: 'aedia',
    name: 'Ædia Britanika',
    role: 'melee',
    roleLabel: 'Melee DPS',
    art: 'aedia',                 // ROUND 46 -- real model, char_aedia_*
    region: 'ontaria',
    recruitAt: { tx: 300, ty: 280 },
    twin: 'encykla', elder: false,
    build: {
      // Knife + Adept + Foot -> Confluence of Master.
      essences: ['essKnife', 'essAdept', 'essFoot'],
      slotStones: [
        ['stoneKnife', 'stoneDark'],       // Knife -- the hidden edge, and what hides it
        ['stoneAdept', 'stoneFocus'],      // Adept -- practiced mastery, and the attention it takes
        ['stoneFoot', 'stoneDance'],       // Foot -- the long march, and the footwork
        ['stoneChampion', 'stoneSwift'],   // Confluence of Master -- the trained hand, moving first
      ],
    },
    blurb: 'The younger twin, and the one who gets there first.',
    greet: 'You point. I will already be moving.',
    meditate: 'I am close. Two minutes on the stones and I am past her again.',
  },
  {
    id: 'benjamin',
    name: 'Benjamin Iskarys',
    role: 'tank',
    roleLabel: 'Tank',
    art: 'benjamin',              // ROUND 46 -- real model, char_benjamin_*
    region: 'ontaria',
    recruitAt: { tx: 360, ty: 250 },
    build: {
      // Shield + Iron + Pangolin -> Confluence of Fortress.
      essences: ['essShield', 'essIron', 'essPangolin'],
      slotStones: [
        ['stoneShield', 'stoneDefiance'],  // Shield -- the raised guard, and the refusal behind it
        ['stoneIron', 'stoneHammer'],      // Iron -- cold iron, and what shapes it
        ['stonePangolin', 'stoneArmour'],  // Pangolin -- overlapping scales, and plate
        ['stoneEarth', 'stoneCage'],       // Confluence of Fortress -- ground that holds, and holds you in
      ],
    },
    blurb: 'Young for a Celestine, which still makes him older than everyone else here.',
    greet: 'Behind me. I will tell you when it is over.',
    meditate: 'I would rather rank up here than find out I needed to out there. A moment.',
  },
];

export const PARTY_BY_ID = Object.fromEntries(PARTY.map(m => [m.id, m]));
export function partyForRegion(regionId) { return PARTY.filter(m => m.region === regionId); }

// ROUND 48 (item 2) -- ZEKE'S FARM.
//
// "...to go back and clear his former farm of monster packs." A farm you go
// BACK to has to be somewhere you can actually walk, so this is a real place
// on the Nek's map and not a instanced arena or a menu screen: three
// structures out of the round-45 pack (the farmhouse he grew up in, the barn
// the packs are denning in, and the shack) standing in a clearing, with the
// packs themselves spawned by the ORDINARY spawn-group system -- the same
// `members`/`clearedUntil` records round 43 and 47 built -- rather than a
// second, parallel monster path that would need its own clearing rule.
//
// Placed off the southwest road, west of it and short of Milrow, which is
// what Zeke's directions say and what "the Nek bottoms" in his round-44 blurb
// already claimed. Checked against The Nek's own geography in regions.js:
// clear of all three lakes, clear of all three rivers, ~212 tiles out from
// Cadence's radius-61 edge and ~116 from Milrow's, so it is wilderness and
// the ambient spawner's own no-town rule never touches it.
export const ZEKE_FARM = {
  id: 'zeke_farm',
  region: 'nek',
  name: "Clark Bottom Farm",
  at: { tx: 300, ty: 560 },
  // The buildings, in tiles from the farm's centre. `barn` is listed first
  // because it is the one the offer names ("denning in my barn") and it
  // should be the one you see first coming off the road from the east.
  structures: [
    { model: 'barn',      dx:  4, dy: -3 },
    { model: 'farmhouse', dx: -4, dy:  2 },
    { model: 'shack',     dx:  1, dy:  6 },
  ],
  // "monster packs", plural, and the plural is the mission. Three of them,
  // ringed round the buildings at a distance that puts one in the yard and
  // two out in the fields, so clearing the farm is three fights and a walk
  // rather than one big brawl on the doorstep. Tier and size are the same
  // numbers The Nek's own `spawnGroups` bands use, so a farm pack is an
  // honest Nek pack and not a difficulty spike wearing a quest marker.
  packs: [
    { dx:  9, dy: -8, tier: 0, count: 6, label: 'barn pack' },
    { dx: -11, dy: -6, tier: 0, count: 5, label: 'field pack' },
    { dx:  2, dy: 12, tier: 1, count: 3, label: 'yard pack' },
  ],
};

// ROUND 48 (item 4) -- "When the team is formed a simple 'team name' prompt
// should appear and let the player name the team whatever they want."
// The fallback is what the tab reads if the player confirms an empty field;
// they can always rename, but a tab labelled "Team ()" is not a thing to ship.
export const DEFAULT_TEAM_NAME = 'The Unnamed';
export const TEAM_NAME_MAX = 22;

// --- rank alignment --------------------------------------------------------
// "roughly align their rank to the player randomly around 10% ahead of or
// behind the players exact rank status."
//
// The player's standing is expressed here as a single continuous number --
// rankIndex + progress-through-that-rank -- so "10% ahead or behind" is a
// meaningful ±0.10 on that scale rather than a percentage of an integer.
// A member sitting 0.1 behind a player who has just entered Bronze is late
// Iron, which is exactly the intended read: the team is near your level, not
// pinned to it.
export const PARTY_RANK_SPREAD = 0.10;

/** A stable per-member offset in [-SPREAD, +SPREAD]. Stable, not re-rolled
 *  every frame: a companion whose rank flickered either side of yours from
 *  one second to the next would be noise, not characterisation. */
export function partyRankOffset(memberId, rng) {
  return (rng() * 2 - 1) * PARTY_RANK_SPREAD;
}

/** The member's own continuous standing, given the player's. Clamped at 0 so
 *  nobody sits below Normal, which is the floor of RANK_ORDER. */
export function partyStanding(playerStanding, offset) {
  return Math.max(0, playerStanding + offset);
}
