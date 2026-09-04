// NPC atlas layout, ported from sparkstone_prototype.html lines ~8595-8636
// (SHOPKEEPER_CELL/GUILDMASTER_CELL/NPC_ART). Both are real extracted art:
// 512x64 PNGs, 8 direction-columns x 1 row, static (no animation frames at
// all -- confirmed against the original's own comment: "Static NPC, no
// animation needed").
//
// NEW round 3: 10 new humanoid NPCs (user-uploaded PixelLab art, same
// 512x64/8-column layout, extracted by extract_round3.py) plus a SOFT
// palette-variant system for every non-monster NPC -- the user's own words:
// "for all NPCs that are not monsters please [do] a very soft set of
// palette swaps to allow for more variety in NPC interaction." Each base
// NPC art key optionally has one or more `_v1`/`_v2` sibling atlases (built
// by the same extraction script, capped at a +-18deg hue shift and small
// sat/val nudges -- deliberately much gentler than the monster roster's
// bold recolors, so a variant reads as "the same person, slightly different
// coloring" rather than a different character). Every variant is registered
// as its own independent NPC_ART entry with the exact same footX/footY/
// scale as its base (they're pixel-identical recolors of the same source
// art, so the anchor never changes) -- callers just treat a variant artKey
// as an ordinary NPC art key like any other.

export const NPC_CELL = 64;

// Shared foot-anchor convention for every NPC in this file (base game +
// round 3): built with NPC_BASELINE_MARGIN=1 in extract_round3.py, i.e. the
// sprite's feet sit 1px up from the bottom of its 64px cell -- same anchor
// shopkeeper/guildmaster already used, so every new NPC (and every variant
// of every NPC) lines up on the ground the same way with zero per-entry
// tuning.
const STANDARD_ANCHOR = { footX: 32, footY: 63, scale: 1.0 };

export const NPC_ART = {
  shopkeeper: { footX: 32, footY: 63, scale: 1.0 },
  guildmaster: { footX: 30, footY: 62, scale: 1.0 },
  // NEW round 3: soft palette variants of the two existing NPCs -- lets
  // WorldScene place a second "shopkeeper-shaped" or "guildmaster-shaped"
  // townsperson elsewhere in town without needing brand new source art.
  shopkeeper_v1: { ...STANDARD_ANCHOR },
  shopkeeper_v2: { ...STANDARD_ANCHOR },
  guildmaster_v1: { ...STANDARD_ANCHOR },
  guildmaster_v2: { ...STANDARD_ANCHOR },

  // --- NEW round 3: 10 new humanoid NPCs, each with a base + 2 soft
  // variants (npc_<key>, npc_<key>_v1, npc_<key>_v2).
  npc_adventurous_girl: { ...STANDARD_ANCHOR },
  npc_adventurous_girl_v1: { ...STANDARD_ANCHOR },
  npc_adventurous_girl_v2: { ...STANDARD_ANCHOR },
  npc_noblewoman: { ...STANDARD_ANCHOR },
  npc_noblewoman_v1: { ...STANDARD_ANCHOR },
  npc_noblewoman_v2: { ...STANDARD_ANCHOR },
  npc_muscular_adventurer: { ...STANDARD_ANCHOR },
  npc_muscular_adventurer_v1: { ...STANDARD_ANCHOR },
  npc_muscular_adventurer_v2: { ...STANDARD_ANCHOR },
  npc_posh_noble_girl: { ...STANDARD_ANCHOR },
  npc_posh_noble_girl_v1: { ...STANDARD_ANCHOR },
  npc_posh_noble_girl_v2: { ...STANDARD_ANCHOR },
  npc_noble_standing: { ...STANDARD_ANCHOR },
  npc_noble_standing_v1: { ...STANDARD_ANCHOR },
  npc_noble_standing_v2: { ...STANDARD_ANCHOR },
  npc_female_adventurer: { ...STANDARD_ANCHOR },
  npc_female_adventurer_v1: { ...STANDARD_ANCHOR },
  npc_female_adventurer_v2: { ...STANDARD_ANCHOR },
  npc_farmer: { ...STANDARD_ANCHOR },
  npc_farmer_v1: { ...STANDARD_ANCHOR },
  npc_farmer_v2: { ...STANDARD_ANCHOR },
  npc_peasant_man: { ...STANDARD_ANCHOR },
  npc_peasant_man_v1: { ...STANDARD_ANCHOR },
  npc_peasant_man_v2: { ...STANDARD_ANCHOR },
  npc_cheerful_peasant_girl: { ...STANDARD_ANCHOR },
  npc_cheerful_peasant_girl_v1: { ...STANDARD_ANCHOR },
  npc_cheerful_peasant_girl_v2: { ...STANDARD_ANCHOR },
  npc_grizzled_adventurer: { ...STANDARD_ANCHOR },
  npc_grizzled_adventurer_v1: { ...STANDARD_ANCHOR },
  npc_grizzled_adventurer_v2: { ...STANDARD_ANCHOR },


// ===========================================================================
// ROUND 78 (items 4, 5, 10) -- THE NEW CAST.
//
// Ten 8-rotation models and seventy sheets, built by
// extract_round78_characters.py. Same convention as everything above: one
// column per PLAYER_DIR_ORDER direction, feet 1px off the bottom of the cell.
//
// THE GOLIATH IS 96px AND EVERYTHING ELSE IS 64. That is the only reason
// `cell` exists on these entries: the loader read NPC_CELL for every key, so a
// 96px sheet loaded at 64 would have been eight frames of the wrong third of
// the art. The field is optional and absent everywhere it would be 64, so no
// existing entry changes.
//
// The palettes are NOT interchangeable decoration:
//   *_<cult>   ten cults, each keyed to the essence its build is drawn from
//              (see cultists.js) -- so the colour tells you what is about to
//              happen to you.
//   *_<god>    eight priests, coloured from their own god's temple ramp.
//   *_v1..v4   four more of the same person, for the town and the roads.
// ===========================================================================
  npc_cultist_woman: { ...STANDARD_ANCHOR },
  npc_cultist_woman_bone: { ...STANDARD_ANCHOR },
  npc_cultist_woman_blood: { ...STANDARD_ANCHOR },
  npc_cultist_woman_undeath: { ...STANDARD_ANCHOR },
  npc_cultist_woman_ash: { ...STANDARD_ANCHOR },
  npc_cultist_woman_void: { ...STANDARD_ANCHOR },
  npc_cultist_woman_sin: { ...STANDARD_ANCHOR },
  npc_cultist_woman_blight: { ...STANDARD_ANCHOR },
  npc_cultist_woman_storm: { ...STANDARD_ANCHOR },
  npc_cultist_woman_deep: { ...STANDARD_ANCHOR },
  npc_cultist_woman_gold: { ...STANDARD_ANCHOR },
  npc_cultist_man: { ...STANDARD_ANCHOR },
  npc_cultist_man_bone: { ...STANDARD_ANCHOR },
  npc_cultist_man_blood: { ...STANDARD_ANCHOR },
  npc_cultist_man_undeath: { ...STANDARD_ANCHOR },
  npc_cultist_man_ash: { ...STANDARD_ANCHOR },
  npc_cultist_man_void: { ...STANDARD_ANCHOR },
  npc_cultist_man_sin: { ...STANDARD_ANCHOR },
  npc_cultist_man_blight: { ...STANDARD_ANCHOR },
  npc_cultist_man_storm: { ...STANDARD_ANCHOR },
  npc_cultist_man_deep: { ...STANDARD_ANCHOR },
  npc_cultist_man_gold: { ...STANDARD_ANCHOR },
  npc_zombie: { ...STANDARD_ANCHOR },
  npc_zombie_v1: { ...STANDARD_ANCHOR },
  npc_zombie_v2: { ...STANDARD_ANCHOR },
  npc_zombie_v3: { ...STANDARD_ANCHOR },
  npc_zombie_v4: { ...STANDARD_ANCHOR },
  npc_wight: { ...STANDARD_ANCHOR },
  npc_wight_v1: { ...STANDARD_ANCHOR },
  npc_wight_v2: { ...STANDARD_ANCHOR },
  npc_wight_v3: { ...STANDARD_ANCHOR },
  npc_wight_v4: { ...STANDARD_ANCHOR },
  npc_goliath: { ...STANDARD_ANCHOR, cell: 96 },
  npc_goliath_v1: { ...STANDARD_ANCHOR, cell: 96 },
  npc_goliath_v2: { ...STANDARD_ANCHOR, cell: 96 },
  npc_goliath_v3: { ...STANDARD_ANCHOR, cell: 96 },
  npc_goliath_v4: { ...STANDARD_ANCHOR, cell: 96 },
  npc_townsman: { ...STANDARD_ANCHOR },
  npc_townsman_v1: { ...STANDARD_ANCHOR },
  npc_townsman_v2: { ...STANDARD_ANCHOR },
  npc_townsman_v3: { ...STANDARD_ANCHOR },
  npc_townsman_v4: { ...STANDARD_ANCHOR },
  npc_plate: { ...STANDARD_ANCHOR },
  npc_plate_v1: { ...STANDARD_ANCHOR },
  npc_plate_v2: { ...STANDARD_ANCHOR },
  npc_plate_v3: { ...STANDARD_ANCHOR },
  npc_plate_v4: { ...STANDARD_ANCHOR },
  npc_mage: { ...STANDARD_ANCHOR },
  npc_mage_v1: { ...STANDARD_ANCHOR },
  npc_mage_v2: { ...STANDARD_ANCHOR },
  npc_mage_v3: { ...STANDARD_ANCHOR },
  npc_mage_v4: { ...STANDARD_ANCHOR },
  npc_priest_m: { ...STANDARD_ANCHOR },
  npc_priest_m_war: { ...STANDARD_ANCHOR },
  npc_priest_m_dominion: { ...STANDARD_ANCHOR },
  npc_priest_m_heros: { ...STANDARD_ANCHOR },
  npc_priest_m_knowledge: { ...STANDARD_ANCHOR },
  npc_priest_m_liberty: { ...STANDARD_ANCHOR },
  npc_priest_m_healing: { ...STANDARD_ANCHOR },
  npc_priest_m_purity: { ...STANDARD_ANCHOR },
  npc_priest_m_death: { ...STANDARD_ANCHOR },
  npc_priest_old: { ...STANDARD_ANCHOR },
  npc_priest_old_war: { ...STANDARD_ANCHOR },
  npc_priest_old_dominion: { ...STANDARD_ANCHOR },
  npc_priest_old_heros: { ...STANDARD_ANCHOR },
  npc_priest_old_knowledge: { ...STANDARD_ANCHOR },
  npc_priest_old_liberty: { ...STANDARD_ANCHOR },
  npc_priest_old_healing: { ...STANDARD_ANCHOR },
  npc_priest_old_purity: { ...STANDARD_ANCHOR },
  npc_priest_old_death: { ...STANDARD_ANCHOR },
  npc_priest_f: { ...STANDARD_ANCHOR },
  npc_priest_f_war: { ...STANDARD_ANCHOR },
  npc_priest_f_dominion: { ...STANDARD_ANCHOR },
  npc_priest_f_heros: { ...STANDARD_ANCHOR },
  npc_priest_f_knowledge: { ...STANDARD_ANCHOR },
  npc_priest_f_liberty: { ...STANDARD_ANCHOR },
  npc_priest_f_healing: { ...STANDARD_ANCHOR },
  npc_priest_f_purity: { ...STANDARD_ANCHOR },
  npc_priest_f_death: { ...STANDARD_ANCHOR },
};

// Interaction radius, ported verbatim (NPC_INTERACT_RADIUS, line ~5803) --
// shared by NPCs and the quest board in the original, same here.
export const NPC_INTERACT_RADIUS = 46;

// Placement + dialogue -- new positions for this port's small test town
// (the original places these relative to GUILD_LOT, which doesn't exist in
// this test map). Guildmaster's dialogue line is the original's actual text
// (line ~3757-3767); the shopkeeper's is new flavor text since the original
// shopkeeper NPC has no dialogue field (shopId NPCs skip straight to the
// shop screen on interact, no flavor line).
//
// NEW round 3: 13 more NPCs added below the original 2 -- the 10 new
// characters (one instance each) plus 3 extra placements that deliberately
// reuse an existing base art key's soft variant (npc_farmer_v1,
// guildmaster_v1, shopkeeper_v2) instead of new art, to actually demonstrate
// the "more variety in NPC interaction" ask: the town now has more than one
// farmer-shaped and more than one guildmaster-shaped person in it, and they
// don't look identical. All 15 positions were checked against
// town.js's classifyTile (never on a TILE_STREET tile) and against
// computeBuildingSpots() (kept clear of every building's footprint) before
// being hand-picked -- see the round-3 planning notes. Three clusters:
// a "town square" knot of adventurers near the guild/plaza, a small noble
// enclave near a building on the west side, and a fenced farmstead yard
// (see town.js's buildFenceYard, used by WorldScene._buildFenceYard) placed
// just past the town's east edge -- deliberately outside the dense in-town
// building ring so the fence itself stays visible instead of vanishing
// behind house rooftops (an earlier in-town placement did exactly that; see
// MIGRATION_PLAN.md), which doubles as "the last farmstead before the
// wilderness" flavor-wise.
// v3 (round 4): every offset below is the original round-3 offset * 3, the
// SAME uniform factor town.js's whole layout was rescaled by this round (see
// that file's header comment) -- this keeps every NPC in the same RELATIVE
// spot (town square / noble enclave / farmstead yard) at the new, bigger
// town scale instead of suddenly reading as clustered in a tiny corner of a
// much larger town.
export function buildNpcList(townX, townY) {
  return [
    {
      name: 'Guildmaster Yorin', artKey: 'guildmaster', facing: 'south',
      x: townX - 210, y: townY - 120,
      dialogue: "Welcome to the Adventurers' Guild! Check the quest board for monster bounties — bring back proof of the kill and I'll see you paid.",
      shopId: null,
      // ROUND 19 -- the guildmaster hands a new arrival their first essence.
      // `grantsEssence` is the flag WorldScene._openDialogue looks for; the
      // line is the user's, verbatim, and is shown INSTEAD of the standard
      // greeting on the one visit where the grant happens.
      grantsEssence: true,
      greetingOnGrant: "An outworlder are ya? You look like one of those chumps from Minnesota probably going to need this to survive.",
    },
    // ===================================================================
    // ROUND 78 (bug 1) -- BRAM IS IN THE SHOP NOW.
    //
    // The user: "The smith is standing in the square but should be in the
    // shop." He was, and he was also a SECOND weapon vendor -- Emberhold
    // Smithy has had a working counter inside it since round 22, so the
    // square held a duplicate of a shop twenty paces away, in the open, with
    // no dialogue and no building behind him. A player who found Bram first
    // never had a reason to open the smithy door at all, which is most of the
    // point of having built the room.
    //
    // He moves to the smith's desk by the east wall (see INTERIOR_ROOMS
    // 'blacksmith'), and the counter comes with him: Hessa keeps the forge
    // and gives up the shop, so the smithy has one till rather than two.
    // ===================================================================

    // --- Town square: adventurers milling around near the guild ---
    {
      name: 'Elsie Vantree', artKey: 'npc_adventurous_girl', facing: 'southwest',
      x: townX + 450, y: townY + 180,
      dialogue: "First bounty of my life is up on that board. Wish me luck — or don't, if you're planning to take it before I do.",
      shopId: null,
    },
    {
      name: 'Dorran Kell', artKey: 'npc_muscular_adventurer', facing: 'southeast',
      x: townX - 450, y: townY + 180,
      dialogue: "Iron rank, three years running. Nothing wrong with taking your time on the way up, whatever the Diamond-ranks say.",
      shopId: null,
    },
    {
      name: 'Old Bracken', artKey: 'npc_grizzled_adventurer', facing: 'north',
      x: townX, y: townY + 450,
      dialogue: "Seen more hunters die from a slime they underestimated than a dragon they respected. Chew on that before your first bounty.",
      shopId: null,
    },
    {
      name: 'Rin Sable', artKey: 'npc_female_adventurer', facing: 'east',
      x: townX - 330, y: townY + 360,
      dialogue: "Panterimp packs have been bolder near the tree line lately. Might be worth a look if the board's light on bounties.",
      shopId: null,
    },

    // --- Noble enclave, west side of town ---
    // ROUND 50 -- Lady Ilsevet is gone. "The model for Lady Ilsevet should be
    // removed, it had no legs." npc_noblewoman is the only roster entry using
    // that art, so pulling her pulls the broken model off the map entirely
    // rather than leaving it to be picked up by some later placement; the
    // enclave still has Priss Meadowlark and Lord Ashford standing in it.
    {
      name: 'Priss Meadowlark', artKey: 'npc_posh_noble_girl', facing: 'south',
      x: townX - 1065, y: townY - 345,
      dialogue: "Is it true a wyrm's hoard is really just bones and old coin? Positively disappointing, if so.",
      shopId: null,
    },
    {
      name: 'Lord Ashford', artKey: 'npc_noble_standing', facing: 'southeast',
      x: townX - 960, y: townY - 375,
      dialogue: "I've commissioned three portraits of myself standing near this house. None of them capture it. Perhaps a fourth.",
      shopId: null,
    },

    // --- Farmstead yard, east side of town, inside the wrought iron fence
    // (see town.js's buildFenceYard / WorldScene._buildFenceYard, also
    // rescaled 3x this round) ---
    {
      name: 'Tam Holloway', artKey: 'npc_farmer', facing: 'south',
      x: townX + 1281, y: townY + 1872,
      dialogue: "Fence keeps the boars off the turnips, mostly. 'Mostly' being the operative word — you should see what a gemtusk does to a fence post.",
      shopId: null,
    },
    {
      name: 'Wick Holloway', artKey: 'npc_farmer_v1', facing: 'west', // soft-variant reuse: Tam's brother, same base art, gently recolored
      x: townX + 1401, y: townY + 1962,
      dialogue: "Tam's the one who talks to every hunter that walks by. I just work the field. Suits me fine.",
      shopId: null,
    },
    {
      name: 'Garrick Dell', artKey: 'npc_peasant_man', facing: 'north',
      x: townX + 1311, y: townY + 1977,
      dialogue: "Rent the Holloways' back field for my goats. Good grazing, good fence — that iron one's new, keeps everything a lot calmer around here.",
      shopId: null,
    },
    {
      name: 'Nessa Vane', artKey: 'npc_cheerful_peasant_girl', facing: 'southwest',
      x: townX + 1431, y: townY + 1857,
      dialogue: "You're a real bounty hunter? I've never talked to one before! Is it true duskfangs count as one bounty even if there's a whole colony?",
      shopId: null,
    },

    // --- Two more ambient townsfolk, reusing existing base art with a soft
    // variant recolor instead of new art -- exactly the "more variety
    // without more art" case the soft-palette system exists for ---
    {
      name: 'Old Rurik', artKey: 'guildmaster_v1', facing: 'south',
      x: townX + 300, y: townY + 390,
      dialogue: "Retired from hunting years back. Still can't walk past that quest board without reading every posting on it, force of habit.",
      shopId: null,
    },
    {
      name: 'Mira the Weaver', artKey: 'shopkeeper_v2', facing: 'north',
      x: townX + 1050, y: townY - 420,
      dialogue: "I'll take cindermaw fur off your hands if you've got any — spins into a surprisingly warm cloth, once you get the smell out.",
      shopId: null,
    },
  ];
}

// ============================================================================
// ROUND 65 -- THE OTHER TOWNS GET PEOPLE.
//
// The user: "generating of the same level of detail present in the first region
// as in the other regions."
//
// Measured, that gap was stark. Cadence has fourteen named townsfolk with
// written dialogue (buildNpcList above). Harrowmoor, Little Gale, Sailmend,
// Cobb Point, Karsk Landing and Vashra had, between all six of them, one
// generated shopkeeper each saying the same sentence.
//
// So: thirty-one named people across the six, placed by an offset from their
// own settlement's centre exactly the way the capital's fourteen are placed off
// townOrigin. Their lines do three jobs at once -- they say where you are, they
// say what that region is like, and (deliberately) they carry the STORY beats
// DESIGN_STORY.md has for that region, which until now existed only in the
// document: the Division gone underground in Ontaria, the portal specialist who
// will not appear below Gold in Elehyd, and Vashra's disappearances and its
// noble houses.
//
// This is rumour, not questline. Nothing here can be accepted, completed or
// failed; it is the world talking about things the player will later be able to
// do something about, which is what makes a questline feel like it was always
// coming rather than switched on.
// ============================================================================

// ART NOTE: `npc_noblewoman` is deliberately absent. Round 50 found that model
// is drawn without legs and asserts, to this day, that nothing in the world
// uses it -- which is exactly the assertion that caught four of these folk on
// their first run. `npc_posh_noble_girl` is the intact noble model.
export const SETTLEMENT_FOLK = {
  // --- Ontaria: the coast, and the Division gone quiet ---------------------
  ont_city: [
    { name: 'Harbourmaster Quenn', art: 'npc_grizzled_adventurer', ox: -120, oy: -40,
      line: "Harrowmoor runs on tides and ledgers. Miss either one and you'll be swimming home." },
    { name: 'Sella Marsh', art: 'npc_posh_noble_girl', ox: 140, oy: -60,
      line: "There was a research house on the hill. Chartered, respectable, gone in a night — and nobody official will say the word 'Division' out loud." },
    { name: 'Cutter Bly', art: 'npc_peasant_man', ox: -60, oy: 130,
      line: "Folk go down to the water at odd hours and come back with nothing wet on them. Draw your own conclusions; I've drawn mine." },
    { name: 'Ledgerman Voss', art: 'npc_noble_standing', ox: 110, oy: 90,
      line: "Everything that leaves this port is written down twice. What worries me is the cargo that's written down neither time." },
    { name: 'Wren Tallowe', art: 'npc_cheerful_peasant_girl', ox: 20, oy: -150,
      line: "My aunt says the sea's been giving things back lately. She says it like it's weather." },
  ],
  ont_west: [
    { name: 'Overseer Halm', art: 'npc_noble_standing', ox: -90, oy: -50,
      line: "Little Gale belongs to the company. The houses, the boats, the dock — and, if you ask the company, the people in them." },
    { name: 'Bette Coldwater', art: 'npc_farmer', ox: 80, oy: 60,
      line: "You're paid in company scrip and you spend it at the company store. It's not slavery. It's just arithmetic that only works one way." },
    { name: 'Nim', art: 'npc_adventurous_girl', ox: 0, oy: 120,
      line: "I'm saving to leave. I've been saving to leave for four years. Ask me again next year." },
  ],
  ont_village_a: [
    { name: 'Sailmaker Oduin', art: 'npc_peasant_man', ox: -70, oy: 40,
      line: "Sailmend mends sails. It's not a clever name and we're not a clever village, and both of those have kept us alive." },
    { name: 'Goodwife Prell', art: 'npc_cheerful_peasant_girl', ox: 60, oy: -50,
      line: "The board's over there and the tea's over here. Do the board first, you'll want the tea after." },
    { name: 'Old Sten', art: 'npc_grizzled_adventurer', ox: 40, oy: 110,
      line: "Forty years on that water. The only thing I ever saw out there that frightened me was a boat with nobody rowing it." },
  ],
  ont_village_b: [
    { name: 'Reeve Marchand', art: 'npc_noble_standing', ox: -80, oy: -30,
      line: "Cobb Point is three families and a jetty. We settle our own arguments and we'd thank the capital to keep settling its own." },
    { name: 'Tessa Rooke', art: 'npc_female_adventurer', ox: 70, oy: 70,
      line: "There's a cave down the coast the tide only opens twice a month. I've never gone in. I've thought about it every day for a year." },
    { name: 'Little Pol', art: 'npc_cheerful_peasant_girl', ox: -20, oy: 120,
      line: "Da says not to talk to adventurers. Da also says not to talk to strangers, and you're both, so I'm being very brave." },
  ],
  // --- Elehyd: the badlands, and the way out that will not open ------------
  ele_city: [
    { name: 'Portmaster Krevic', art: 'npc_grizzled_adventurer', ox: -110, oy: -50,
      line: "Karsk Landing is the last place with walls. West of here the road gives up and so does everything else." },
    { name: 'Sable Ashgrave', art: 'npc_posh_noble_girl', ox: 120, oy: -40,
      line: "A man came through asking after portal work. He said he'd be back when someone here was worth opening a door for. He has not been back." },
    { name: 'Digger Naess', art: 'npc_farmer', ox: -50, oy: 110,
      line: "Nothing rots in this ground. We bury them deep and we bury them with iron, and we still check the cairns every spring." },
    { name: 'Coldwright Ilm', art: 'npc_peasant_man', ox: 90, oy: 80,
      line: "The peaks north have ice that never runs. Whatever's up there drinking it, I'd rather not meet." },
    { name: 'Vane the Quiet', art: 'npc_muscular_adventurer', ox: 10, oy: -140,
      line: "..." },
  ],
  // --- Bratugal: the king's city, and what it has stopped noticing ---------
  bra_city: [
    { name: 'Chamberlain Ossa', art: 'npc_posh_noble_girl', ox: -130, oy: -60,
      line: "Vashra is the finest city in the world and I am required to say so. Take the second half of that sentence as seriously as the first." },
    { name: 'House Steward Bellic', art: 'npc_noble_standing', ox: 140, oy: -50,
      line: "Nine noble houses sit the council. A king sits above it. Councils have been known to reconsider such arrangements." },
    { name: 'Tally Shore', art: 'npc_cheerful_peasant_girl', ox: -60, oy: 140,
      line: "Three off our street this season. The watch writes it down and the writing is the whole of what they do." },
    { name: 'Physician Aur', art: 'npc_female_adventurer', ox: 100, oy: 110,
      line: "They come in ill and they leave — that is what the ledger says. I have stopped being able to say where they leave to." },
    { name: 'Fenmarcher Dol', art: 'npc_grizzled_adventurer', ox: 0, oy: -160,
      line: "West is swamp, and past the swamp is more swamp, and past that somebody has built something they did not want seen." },
    { name: 'Gilt Marren', art: 'npc_posh_noble_girl', ox: -140, oy: 90,
      line: "Everyone worth knowing is at court. Everyone worth watching is not." },
  ],
};

/** Every settlement id that has authored folk. */
export const FOLK_SETTLEMENTS = Object.keys(SETTLEMENT_FOLK);

/** How many named people the world's settlements carry, for the suite: a
 *  count that quietly returns to Cadence-only is the failure this exists to
 *  prevent. */
export function folkCount() {
  return Object.values(SETTLEMENT_FOLK).reduce((n, l) => n + l.length, 0);
}
