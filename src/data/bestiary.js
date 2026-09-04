// The Bestiary (NEW this round) -- a browsable in-game codex of all
// MONSTER_TYPES entries (src/data/monsters.js), grouped by family and
// paired with a portrait (see extract_bestiary_portraits.py) and original
// Pallimustus-flavored lore text. None of this lore is ported from the
// original prototype -- sparkstone_prototype.html has no bestiary/lore
// system at all to port from, so every blurb below is new writing, invented
// for this port but consistent with the world this game is set in (He Who
// Fights With Monsters' Pallimustus: bounty boards, Iron-through-Diamond
// hunter ranks, essence-touched monsters) and with each species' own real
// derived combat behavior in src/data/monsters.js's FAMILY_TEMPERAMENT
// (e.g. cindermaw's blurb calling it relentless is the same trait that
// gives it the roster's highest chaseDropMult; ichorling's "barely any
// armor" echoes its lowest-in-the-roster armorFactor) -- so the flavor text
// and the actual numbers agree, even though this view deliberately doesn't
// print the numbers themselves (portrait + lore only, no stat block, per
// spec).
//
// This shows the full roster unconditionally rather than gating entries
// behind a "discovered" flag -- this port has no save/load system yet (see
// MIGRATION_PLAN.md's backlog), so persisting a per-player discovery set
// across sessions isn't feasible right now; a future save system would be
// the natural place to add that gate.
//
// NEW round 3: every family's PLAYER-FACING label below was renamed per the
// user's own instruction -- "All monsters should be renamed to reference
// the creature they originally were named after but not be named that
// exactly. The wolf in particular should be renamed panterimp." The
// invented names themselves live in monsters.js's FAMILY_DISPLAY_NAME (the
// single source of truth also used by quests.js's monsterLabelFor); the
// labels/blurbs here just use that same vocabulary so the bestiary reads
// consistently with the quest board and hotbar tooltips. Blurb prose was
// also lightly reworked to lean on the new names instead of the old literal
// animal words (a hydra's blurb now says "hydrix", not "hydra") -- the
// underlying creature concepts, tone, and combat-flavor claims are
// unchanged, only the nouns.
import { FAMILY_DISPLAY_NAME, MONSTER_TYPES } from './monsters.js';

// ROUND 24 -- reordered to the fifteen families the re-upload actually
// covers, weakest to strongest, matching the order MONSTER_FAMILY_BASE
// declares them in (which is also the order they end up spread across the
// spawn rings). hellhound, dragon, skeleton and saberCanis were retired this
// round -- see monsters.js.
export const BESTIARY_FAMILY_ORDER = [
  'slime', 'lizard', 'bat', 'spider', 'shade', 'raptor', 'wolf', 'boar',
  'skeleton', 'hellhound', 'demon', 'slimeGolem', 'elemental', 'hydra',
  'chimera', 'spinosaurus', 'trex', 'dragon',
];

export const BESTIARY_FAMILY_INFO = {
  // ROUND 24 -- the two new families from the re-upload.
  shade: {
    label: `${FAMILY_DISPLAY_NAME.shade}s`,
    blurb: "Man-shaped and never quite in focus, umbrathanes form where a death went unwitnessed and the mana had nowhere to settle. They do not hunt so much as follow, at a walking pace, indefinitely -- experienced hunters will tell you that outrunning one is easy and losing one is not.",
  },
  demon: {
    label: `${FAMILY_DISPLAY_NAME.demon}s`,
    blurb: "Not demons, whatever the villages call them: hexbound are what is left of a caster who bound something they could not hold. The staff is the binding, and it is the only part that still makes decisions. Slow, deliberate, and the only family below Bronze rank that will reliably kill a hunter who fights it at range.",
  },
  slime: {
    label: `${FAMILY_DISPLAY_NAME.slime}s`,
    blurb: "The most common monster in Pallimustus, and the first thing every bounty hunter ever kills. Ichorlings ooze up wherever mana pools too long in stagnant ground -- sewers, cellars, the back corners of a farmer's field -- and rarely amount to more than a nuisance, though a gold ichorling's hide has stopped more than one overconfident Iron-rank cold.",
  },
  bat: {
    label: `${FAMILY_DISPLAY_NAME.bat}s`,
    blurb: 'Cave-dwelling fliers that hunt in flickering, unpredictable arcs, using echolocation sharpened by generations of essence exposure. Rarely dangerous alone, but a duskfang colony disturbed at dusk can blot out the sky.',
  },
  wolf: {
    label: `${FAMILY_DISPLAY_NAME.wolf}s`,
    blurb: "Pack hunters that never fight fair. A lone panterimp sizes you up before it closes; a pack has already decided you're dinner before you've noticed them at all.",
  },
  hydra: {
    label: `${FAMILY_DISPLAY_NAME.hydra}es`,
    blurb: 'Multi-headed river- and swamp-dwellers, territorial to the point of obsession -- a hydrix that has claimed a stretch of water will defend it until every head is separately killed. Their hide thickens with age, and old hydrixes are graveyards of broken hunter weapons.',
  },
  raptor: {
    label: `${FAMILY_DISPLAY_NAME.raptor}s`,
    blurb: "Fast, low, and vicious, clawstriders hunt in coordinated packs that box in prey before the killing rush. Fastest reflexes of any land monster on this bounty board -- hesitate against one and you won't get a second chance to.",
  },
  chimera: {
    label: `${FAMILY_DISPLAY_NAME.chimera}s`,
    blurb: "A fused horror of lion, goat, and serpent, wearing three heads' worth of bad temper and hide thick enough to turn aside most blades. Rare and solitary, and exactly as dangerous as its reputation -- though hunters have learned a triskelith's temperament runs in three distinct, equally unpleasant flavors.",
  },
  hellhound: {
    label: `${FAMILY_DISPLAY_NAME.hellhound}s`,
    blurb: "Black-furred and lit from within by something that isn't quite fire, cindermaws do not lose interest, do not tire, and do not stop. Bounty hunters call giving up on a fleeing target \"pulling a cindermaw\" -- because a cindermaw never does.",
  },
  elemental: {
    label: `${FAMILY_DISPLAY_NAME.elemental}s`,
    blurb: "Bound bodies of raw elemental mana given rough humanoid shape, elementums stay close to whatever site first summoned them -- a scorched clearing, a flooded quarry, a battlefield gone toxic with lingering poison. Kill the body and the mana disperses; it doesn't so much die as stop being organized enough to hurt you.",
  },
  dragon: {
    label: `${FAMILY_DISPLAY_NAME.dragon}s`,
    blurb: 'Apex predators of Pallimustus in every sense -- the biggest bounties, the thickest hides, the deadliest hits on this entire board. A single wyrm claims a hunting ground the size of a small province and defends it against anything foolish enough to trespass, hunters very much included.',
  },
  // --- NEW families this round ---
  boar: {
    label: `${FAMILY_DISPLAY_NAME.boar}s`,
    blurb: "Ordinary boars that rooted too long in mana-saturated ground and came up wrong -- their hide grown over with jagged, faceted crystal instead of hair. Territorial and quick to charge, and worth hunting a gemtusk as much for the crystal as the bounty.",
  },
  skeleton: {
    label: `${FAMILY_DISPLAY_NAME.skeleton}s`,
    blurb: "The animated dead of some forgotten battlefield, still wearing whatever armor they fell in centuries ago. Rust, verdigris, and old blood tell you roughly how long a given boneguard has been standing there waiting for something to fight.",
  },
  spider: {
    label: `${FAMILY_DISPLAY_NAME.spider}s`,
    blurb: "Web-spinning ambush hunters grown to the size of a warhorse, with a bite to match. Named varieties (widow, recluse) borrow their coloring's reputation honestly -- the venom is real, even if the bounty board's real concern is a webstalker's fangs.",
  },
  lizard: {
    label: `${FAMILY_DISPLAY_NAME.lizard}s`,
    blurb: "Six-legged, fast, and bristling with rows of sharp dorsal quills it isn't shy about using. The roster's quickest bite outside of a clawstrider pack, and unlike a clawstrider a quillrunner doesn't need a pack to be a problem.",
  },
  trex: {
    label: `${FAMILY_DISPLAY_NAME.trex}s`,
    blurb: "A predator that was already an apex threat before something -- essence exposure, birth malformation, nobody's sure -- gave it a second head. Two skulls' worth of teeth means a direjaw lands two independent bites in the time other apex monsters manage one.",
  },
  spinosaurus: {
    label: `${FAMILY_DISPLAY_NAME.spinosaurus}s`,
    blurb: "The single largest confirmed bounty on this board. A sail-backed river apex predator that, somewhere in its essence-touched growth, kept adding arms instead of stopping at two -- six limbs' worth of claws swinging in a fight that most hunters do not survive starting against a hexfin.",
  },
  // --- NEW round 3 ---
  slimeGolem: {
    label: `${FAMILY_DISPLAY_NAME.slimeGolem}s`,
    blurb: "Where an ordinary ichorling is mana pooling in stagnant ground, a slime golem is mana pooling around a core of stone that never quite dissolved -- part ooze, part construct, all of it slow and none of it in a hurry to stop advancing. Rarer than a common ichorling and considerably harder to put down.",
  },
  saberCanis: {
    label: FAMILY_DISPLAY_NAME.saberCanis,
    blurb: "A rangier, longer-fanged cousin of the common panterimp, built for a single devastating opening bite rather than a drawn-out chase. Hunters who mistake a saber canis pack for an ordinary panterimp pack tend to only make that mistake once.",
  },
};

// ROUND 24 -- GENERATED per monster, from the family's own lore noun plus a
// line written for each shade descriptor.
//
// Round 3 hand-wrote a blurb for each of 82 monsters. That does not survive a
// roster regenerated as 15 families x 5 shades: every key changed, and
// hand-writing 75 replacements would produce 75 lines of prose that mostly say
// "the same creature, a different colour" at length. Composing them instead
// keeps every entry accurate and lets the REAL lore live where it belongs --
// in BESTIARY_FAMILY_INFO above, which is still hand-written per family and is
// what the bestiary shows first.
const SHADE_LORE = {
  // colour-family descriptors, reused across families
  verdant: 'the common strain, and the one every bounty board prices as a nuisance',
  green: 'the common strain, and the one every bounty board prices as a nuisance',
  azure: 'a cooler, denser variant that favours water and deep stone',
  blue: 'a cooler, denser variant that favours water and deep stone',
  crimson: 'sun-warmed and quick to anger -- faster and meaner than its common kin',
  red: 'sun-warmed and quick to anger -- faster and meaner than its common kin',
  gilded: 'rare and metal-flecked; hunted for what can be rendered out of it as much as for the bounty',
  gold: 'rare and metal-flecked; hunted for what can be rendered out of it as much as for the bounty',
  violet: 'a mana-soaked variant from old, essence-rich ground. Tougher than it looks',
  purple: 'a mana-soaked variant from old, essence-rich ground. Tougher than it looks',
  amethyst: 'a mana-soaked variant from old, essence-rich ground. Tougher than it looks',
  ember: 'runs hot -- literally warm to the touch, and correspondingly aggressive',
  ash: 'pale and dry-country dwelling. No tougher in a fight, considerably harder to see coming',
  ashen: 'pale and dry-country dwelling. No tougher in a fight, considerably harder to see coming',
  bone: 'bleached almost white by whatever it lives in. Old hunters treat the colour as a warning',
  storm: 'grey-lit and unnaturally quick, associated with high ground and bad weather',
  jade: 'a deep-green variant from the old forests, heavier and better armoured than its kin',
  white: 'the common coat, and the one most hunters meet first',
  grey: 'a duller coat that hunts the treeline at dawn and dusk',
  black: 'a night-hunting coat that works as real camouflage. Bolder than the rest of the pack',
  dusk: 'an unusual twilight-purple coat, associated with essence-rich territory',
  onyx: 'near-black and considerably denser than the common form -- the hardest of its family to put down',
  obsidian: 'near-black and considerably denser than the common form -- the hardest of its family to put down',
  quartz: 'the common form, clear-crystalled and merely dangerous',
  emerald: 'a green-crystalled form whose shards hold an edge far longer than they should',
  ruby: 'a red-crystalled form. Faster, angrier, and worth noticeably more at the auction house',
  widow: 'the common form, black-bodied with the red mark that gives the family its name',
  venom: 'a green-marked form carrying a considerably worse bite',
  void: 'a lightless variant found where mana has gone stagnant and sour. Rare, and rarely survivable alone',
  umbral: 'the common form -- if a thing with no fixed edges can be said to have a common form',
  verdigris: 'weathered green, found around old bronze and older graves',
  sanguine: 'red-tinged and noticeably more willing to close the distance',
  glacial: 'a cold-country variant whose breath fogs even in summer',
  infernal: 'a fire-touched variant. The only shade of its family that villages evacuate for',
  tawny: 'the common form, and the smallest of a family with no small members',
  water: 'bound to water, and the most common elementum on any coast or river',
  fire: 'bound to fire. Hunters fight these at range or not at all',
  earth: 'bound to stone -- slow, immensely durable, and difficult to make bleed',
  lightning: 'bound to storm. The fastest elementum, and the one that kills the most Iron ranks',
  darkness: 'bound to something the Magic Society does not publish papers about',
  swamp: 'the common form, mud-toned and territorial',
  gloom: 'a lightless variant that hunts by sound alone',
  // ROUND 65 -- `rusted` and `bloodforged` are real skeleton variants
  // (skeletonRusted, skeletonBloodforged) and were the only two of the
  // forty-four shades with no lore line, so both fell through to the generic
  // "an uncommon variant" -- while skeletonBloodforged is specific enough to
  // carry its own hand-written entry in VARIANT_DEBUFFS. The table knew about
  // it; the lore did not.
  rusted: 'left in the wet for a century and still standing, which says more about what animates it than about the iron',
  bloodforged: 'the marrow was replaced with something that had to be poured in hot, and whoever poured it is not recorded',
};

function buildEntries() {
  const out = {};
  for (const [key, type] of Object.entries(MONSTER_TYPES)) {
    const name = FAMILY_DISPLAY_NAME[type.family] || type.family;
    // ROUND 76 (item 7) -- the young rungs get their own line. Run through the
    // sentence above they would have read "The bone pallidjaw: bleached...",
    // which is the ADULT's entry, printed twice in one codex under two names.
    if (type.young) {
      out[key] = `The ${type.label.toLowerCase()}: not yet what it will be, `
        + `and already more than the things a new adventurer is told to expect.`;
      continue;
    }
    const lore = SHADE_LORE[type.shade] || 'an uncommon variant, and not one the boards price generously';
    out[key] = `The ${type.shade} ${name.toLowerCase()}: ${lore}.`;
  }
  return out;
}

export const BESTIARY_ENTRIES = buildEntries();

