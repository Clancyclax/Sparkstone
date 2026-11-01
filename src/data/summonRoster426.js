// ============================================================================
// ROUND 426 -- THE SUMMON ROSTER, REDONE.
//
// The user: "Review of the summon roster found a lot of underutilized or misutilized models. For example the hexfin
// which is clearly a dinosaur is only found from a stone of the tentacle. Lizard, Bird, Behemoth, and plenty more
// options exist. Roc, Anzu, Thunderbird, Firebird, Phoenix are all.. BIRDS. Hydra are amphibians and within the canon
// are specifically the kind of thing gotten from a stone of the frog. Crocodiles are lizards as well, big ones. Please
// do a full pass of every monster or summon sprite in the game, make sure we have color variations for all elements and
// then review every single stone that would make any sense for that creature. It's far too restrictive and
// nonsensical right now."
//
// Before this round a stone named ONE creature (its twin essence's) or one per catalogue family, so a Bird stone was a
// thunderbird and nothing else, and 57 bodies drawn in rounds 393/394 could not be summoned at all because they have
// no wild stat row. This module is the pure half of the fix:
//
//   FAMILY_TAGS   every one of the 152 bodies: what it IS (bird, lizard, amphibian, canine, knight ...) and what it is
//                 made of (fire, frost, storm ...). The stone pools are read off these tags, so a body is reachable
//                 from every stone that makes sense for it, not from the one somebody remembered.
//   STONE_WANTS   every one of the 191 stones: the tags it calls, and the creature it names (its `core`, which is
//                 favoured but not the only answer).
//   stonePool / pickFromPool   the pool, and the pick for one (stone, essence): the essence's element steers it (a
//                 Bird stone with a Fire essence calls the firebird or the phoenix; with Lightning, the thunderbird),
//                 seeded so a socket keeps its creature.
//   SUMMON_ONLY_BASE   stat rows for the 57 bodies that are never wild, from a wild cousin, so they summon like it.
//   RANK_LINES    how a body changes as the ability ranks (item 4): `grow` (only larger), `transform` (a more
//                 threatening form: frog -> monstrous toad -> hydra; grub -> worker -> soldier -> queen), `multiply`
//                 (slightly larger and more bodies: the Four Riders, a pack of identical rats).
//   ELEMENT_RAMPS / elementOfWords / shadeForElement   a colour for every body in every element (item 5): the body's own
//                 drawn row when one fits the element, otherwise the element's palette laid over the body by luminance
//                 (the odd summons' material remap, so the creature's own shading survives).
//   RIDERS        the Four Riders (item 1): each rider's own blow, and what each gives when the riders are subsumed.
// ============================================================================
import { MONSTER_FAMILY_BASE, FAMILY_DISPLAY_NAME, MONSTER_ART } from './monsters.js';
import { R393_DISPLAY_NAME } from './creatureArtR393.js';
import { R394_DISPLAY_NAME } from './creatureArtR394.js';
import { STONE_IDS } from './stoneCatalog.js';
import { rampLut } from './palettes.js';

// ---- what every body is -------------------------------------------------------------------------------------------
// 'kind tags | element tags'. Kind tags are what a stone asks for; element tags are what the body is made of, which is
// what an essence's element steers toward.
const T = {
  // round 31/173/285 bodies
  slime: 'ooze flesh alchemy small | poison nature', lizard: 'lizard reptile small | earth', bat: 'bat flyer night small swarm | shadow',
  shade: 'spirit shadowkin lurker | shadow', spider: 'spider arachnid insect lurker small swarm | poison', raptor: 'dino reptile swift hunter | earth',
  boar: 'boar beast crystal guard | earth', slimeGolem: 'ooze golem construct guard | poison', demon: 'demon fiend | fire shadow',
  wolf: 'canine beast hunter pack | ', elemental: 'elemental | fire frost storm earth water', hydra: 'hydra amphibian serpent deep monster | water poison',
  chimera: 'chimera myth beast mirror | fire', spinosaurus: 'dino reptile lizard sail monster | water', skeleton: 'undead bone warrior | necrotic',
  hellhound: 'canine hound fiend | fire', dragon: 'dragon reptile myth monster | fire storm', trex: 'dino reptile lizard monster hunter | earth',
  direbuck: 'deer beast swift | nature', whitelion: 'feline beast hunter | radiant', hornram: 'goat beast horned | earth',
  yeti: 'ape beast cold | frost', minotaur: 'bovine beast horned warrior | earth', medusa: 'gorgon serpent death curse | poison necrotic',
  mantis: 'insect blade | nature', scorpion: 'arachnid insect sand | earth poison', cobra: 'snake serpent venom | poison',
  crocodile: 'crocodile lizard reptile aquatic monster | water', giantToad: 'toad amphibian frog | poison water', phoenix: 'bird firebird rebirth myth | fire radiant',
  thunderbird: 'bird storm myth sky | storm', gnoll: 'canine humanoid warrior hunter | ', quillFiend: 'beast spike quill | storm',
  sixArmApe: 'ape monkey beast warrior | ', steelRaptor: 'dino construct metal swift | storm', spiritSerpent: 'serpent spirit snake | arcane',
  harbinger: 'herald death omen spirit | necrotic shadow', shellborn: 'turtle shell crustacean aquatic guard | water', tidalTroll: 'troll aquatic giant | water',
  glasscat: 'feline glass crystal | arcane', sharkcrab: 'shark fish crustacean aquatic | water', birdangel: 'angel bird celestial holy | radiant',
  flowerhydra: 'hydraplant plant flower | nature', demonsloth: 'sloth beast demon | shadow', bloomimp: 'plant fey flower small | nature',
  snapmaw: 'plant carnivore | nature', vinegrasp: 'plant tree vine | nature',
  // round 328 bodies
  bellhive: 'insect bee hive swarm | nature', bonepecker: 'bird fowl chicken bone | necrotic', cairnbeast: 'bear beast stone guard | earth',
  cinderlamb: 'sheep beast small | fire', clockcrawler: 'construct technology clockwork insect | storm', driftreaver: 'spirit astral void deep | arcane',
  drownwight: 'undead drowned aquatic | water necrotic', duskmoth: 'insect moth night moon | arcane', geodeback: 'crystal beast guard stone | earth',
  glasswader: 'bird duck wader glass | water', gnawling: 'rodent rat mouse small swarm | poison', gourdkin: 'plant harvest crops | nature',
  gravesown: 'plant undead grave | necrotic', grubwyrm: 'worm grub insect | earth', hollowchoir: 'spirit song echo | radiant',
  inkwell: 'paper ink knowledge rune | shadow', kilnwarden: 'construct golem fire forge | fire', lanternwraith: 'spirit ghost light | radiant',
  longshanks: 'humanoid wader stilt | ', lurefin: 'fish deep lurker aquatic | water', monocul: 'eye mind monster | arcane',
  mournhusk: 'undead husk mummy | necrotic', ossuaryKnight: 'undead knight bone warrior | necrotic', pallbearer: 'undead guard grave | necrotic',
  pitcherling: 'plant carnivore | poison', rimehare: 'rabbit beast small cold | frost', rustmantle: 'construct metal iron guard | earth',
  saltwife: 'undead aquatic salt | water', scalecurl: 'pangolin armour beast | earth', shardling: 'crystal glass small | earth frost',
  shiverfox: 'fox canine small | frost', smokecur: 'skunk smoke beast small | poison', sporehorn: 'fungus beast horned | nature poison',
  sporemother: 'fungus plant | poison', stormjar: 'construct storm jar | storm', stringless: 'puppet thread construct | arcane',
  totemstalk: 'wood totem tree construct | nature', tunnelmaw: 'worm mole beast earth | earth', tuskmaw: 'manatee beast aquatic tusk | water',
  urchinroll: 'urchin coral aquatic spike | water',
  // the hives
  antGrub: 'ant grub insect hive small | earth', antWorker: 'ant insect hive | earth', antSoldier: 'ant insect hive soldier | earth', antQueen: 'ant insect hive queen | earth',
  termiteGrub: 'termite grub insect hive small | earth', termiteWorker: 'termite insect hive wood | earth', termiteSoldier: 'termite insect hive soldier | earth', termiteQueen: 'termite insect hive queen | earth',
  // round 393 bodies
  behemoth: 'behemoth beast giant monster dino | earth', garrisonKnight: 'knight warrior guard humanoid | ', griffin: 'griffin bird feline myth sky | radiant storm',
  juggernaut: 'construct engine war siege | earth', lavaElemental: 'elemental lava | fire earth', leviathan: 'leviathan serpent deep aquatic monster | water',
  manticore: 'manticore feline myth beast | poison', manticoreGoofball: 'manticore feline | poison', riderDeath: 'rider horseman death undead | necrotic', riderFamine: 'rider horseman famine hunger | shadow',
  riderPestilence: 'rider horseman plague | poison', riderWar: 'rider horseman war | fire', salamander: 'salamander lizard amphibian | fire',
  stoneStatue: 'statue construct stone guard | earth', swarmgolem: 'golem swarm insect bee | nature', troll: 'troll giant beast | nature', wendigo: 'wendigo cold hunger undead | frost',
  // round 394 bodies
  anzu: 'bird myth storm sky | storm', cambion: 'demon fiend humanoid | fire', coalescedGiant: 'giant astral celestial | arcane',
  constellationLion: 'feline star celestial | radiant', cutOutWarrior: 'paper warrior construct | ', devourer: 'canine hound hunger void | shadow',
  doppelganger: 'mirror visage humanoid | shadow', dustDevilCur: 'canine sand dust wind | earth storm', firebird: 'bird firebird myth | fire',
  forceFist: 'force hand construct | arcane', forgeHound: 'canine hound construct metal forge | fire', gaoler: 'prison warden humanoid chain | shadow',
  garuda: 'bird myth sky divine | radiant', golem: 'golem construct clay | earth', greatSerpent: 'serpent snake myth monster | nature',
  gremlin: 'gremlin technology small | storm', gunDrone: 'construct technology gun drone | storm', harness: 'construct harness horse | earth',
  harpy: 'bird harpy humanoid sky | storm', herald: 'herald omen celestial | radiant', heron: 'bird wader water | water',
  homunculus: 'homunculus alchemy flesh small | arcane', huskBearer: 'undead husk bearer | necrotic', koi: 'fish koi water | water',
  lampKeeper: 'spirit light lamp | radiant', lark: 'bird songbird song small | radiant', livingPrism: 'crystal prism light | radiant arcane',
  livingStatue: 'statue construct stone guard | earth', livingSutra: 'paper knowledge rune scroll | radiant', owl: 'bird owl night wisdom | arcane',
  pixie: 'fey small flower | nature', relayDrone: 'construct technology drone | storm', roc: 'bird myth sky giant | storm',
  royalGuard: 'knight warrior guard humanoid | ', strawMan: 'scarecrow crops construct | nature', swornKnight: 'knight warrior oath holy | radiant',
  thunderheadSpirit: 'spirit storm cloud | storm', toad: 'toad amphibian frog small | water', turnkey: 'prison warden construct chain | earth',
  walkingOak: 'tree wood plant giant | nature',
};
export const FAMILY_TAGS = {};
export const FAMILY_ELEMENTS = {};
for (const [k, v] of Object.entries(T)) {
  const [kind, el] = v.split('|');
  FAMILY_TAGS[k] = kind.trim().split(/\s+/).filter(Boolean);
  FAMILY_ELEMENTS[k] = (el || '').trim().split(/\s+/).filter(Boolean);
}
/** Bodies kept out of every pool: the spare manticore (a joke sheet) and the Four Riders, who are only Doom's. */
export const NOT_POOLED = new Set(['manticoreGoofball', 'riderDeath', 'riderFamine', 'riderPestilence', 'riderWar']);

// ---- what every stone calls ---------------------------------------------------------------------------------------
// 'core | tags'. `core` is the creature the stone names (favoured, never the only answer); empty for a stone that
// names no creature. Tags are the kinds of thing it calls.
const S = {
  Absolution: '| angel holy oath herald', Adept: '| warrior monkey humanoid', Adventure: '| bird sky swift hunter', Ape: 'sixArmApe | ape monkey',
  Apocalypse: '| death herald omen dragon behemoth', Armour: 'scalecurl | armour shell guard knight', Avatar: '| myth angel giant celestial', Axe: '| warrior knight',
  Alchemy: 'homunculus | alchemy ooze flesh', Antidote: '| alchemy ooze toad', Catalyst: '| alchemy ooze elemental', Crucible: '| forge alchemy lava',
  Balance: '| celestial mirror', Bat: 'bat | bat night', Bear: 'cairnbeast | bear', Bee: 'bellhive | bee hive',
  Bird: 'roc | bird', Blight: 'medusa | plague curse fungus', Blood: 'whitelion | hunter fiend', Bone: 'skeleton | bone undead',
  Bow: '| hunter warrior', Brush: 'vinegrasp | plant vine', Cage: 'turnkey | prison guard', Cat: 'whitelion | feline',
  Cattle: 'minotaur | bovine', Celestial: 'birdangel | celestial angel star', Chain: 'gaoler | prison chain', Champion: '| knight warrior',
  Claw: 'raptor | hunter feline dino', Cloth: 'strawMan | puppet thread scarecrow', Cloud: 'thunderheadSpirit | cloud sky storm', Cold: 'yeti | cold',
  Coral: 'urchinroll | coral aquatic', Corrupt: '| fiend curse demon', Crocodile: 'crocodile | crocodile lizard', Crystal: 'geodeback | crystal',
  Crops: 'gourdkin | crops harvest scarecrow', Dance: '| fey swift', Dark: 'shade | shadowkin night lurker', Death: 'harbinger | death undead',
  Deep: 'leviathan | deep aquatic', Deer: 'direbuck | deer', Defiance: '| knight warrior', Dimension: '| astral void',
  Discord: '| gremlin fiend', Dog: 'hellhound | canine hound', Dominion: '| knight giant', Duck: 'glasswader | duck wader',
  Dust: 'dustDevilCur | sand dust', Earth: 'golem | earth stone golem ant worm', Echo: 'hollowchoir | echo song', Elastic: '| ooze',
  Elemental: 'elemental | elemental', Eye: 'monocul | eye', Feast: '| hunger carnivore', Feeble: '| undead husk',
  Fire: 'firebird | fire lava forge', Fish: 'lurefin | fish', Flea: '| insect', Flesh: 'homunculus | flesh ooze',
  Focus: '| mind eye', Foot: '| swift dino', Fork: '| warrior', Fox: 'shiverfox | fox',
  Frog: 'toad | frog toad amphibian hydra', Fungus: 'sporemother | fungus', Gathering: '| hive swarm ant termite', Glass: 'shardling | glass prism',
  Goat: 'hornram | goat sheep', Grazen: 'minotaur | bovine deer sheep', Growth: 'bloomimp | plant flower tree', Gun: 'gunDrone | gun drone',
  Hair: '| ape bear sloth', Hammer: '| forge warrior', Hand: 'forceFist | hand', Harmonic: '| song echo',
  Healer: '| angel fey', Heidel: '| bovine', Hook: '| fish', Horse: 'harness | horse swift',
  Hunger: 'devourer | hunger carnivore', Hunt: 'raptor | hunter', Ice: 'shardling | cold', Inevitability: '| omen herald',
  Iron: 'rustmantle | iron metal', Judgement: '| angel herald oath', Justice: '| oath knight angel', Karmic: '| mirror spirit',
  Knife: '| warrior', Knowledge: 'livingSutra | knowledge scroll wisdom', Life: '| plant fey toad', Light: 'lampKeeper | light',
  Lightning: 'thunderbird | storm', Lizard: 'lizard | lizard salamander crocodile dino', Locust: 'mantis | insect swarm famine', Lurker: 'shade | lurker',
  Magic: '| arcane astral', Magus: '| arcane homunculus', Malign: 'demon | fiend curse', Manatee: 'tuskmaw | manatee',
  Might: '| giant behemoth troll', Mirror: 'doppelganger | mirror', Moment: '| clockwork', Monkey: 'sixArmApe | monkey ape',
  Moon: 'duskmoth | moon night', Mouse: 'gnawling | mouse rodent', Myriad: '| swarm hive ant', Needle: '| thread spike',
  Net: '| spider', Octopus: 'hydra | deep', Omen: 'harbinger | omen', Omens: 'harbinger | omen owl',
  Pangolin: 'scalecurl | pangolin', Paper: 'cutOutWarrior | paper', Peace: '| angel fey', Persistence: '| troll shell',
  Plant: 'snapmaw | plant', Potent: '| behemoth giant', Preparation: '| wisdom owl', Pure: '| angel holy',
  Purgation: '| fire holy', Rabbit: 'rimehare | rabbit', Rain: '| cloud water', Rake: '| crops',
  Rat: 'gnawling | rat rodent', Reach: '| giant serpent', Reaper: 'pallbearer | death undead grave', Rebirth: 'phoenix | rebirth',
  Renewal: '| plant rebirth', Resolute: '| knight guard', Ruin: '| undead behemoth', Rune: 'inkwell | rune',
  Sand: 'scorpion | sand', Sceptre: '| knight', Serene: '| koi spirit', Shark: 'sharkcrab | shark',
  Shield: 'royalGuard | guard knight', Shimmer: 'livingPrism | prism light', Ship: '| aquatic', Shovel: '| worm mole',
  Sickle: 'mantis | blade', Sin: '| fiend demon', Skunk: 'smokecur | skunk', Sky: 'roc | sky bird cloud',
  Sloth: 'demonsloth | sloth', Smoke: 'smokecur | smoke', Snake: 'cobra | snake serpent', Song: 'lark | song',
  Spear: '| warrior', Spider: 'spider | spider', Spike: 'quillFiend | spike quill', Staff: '| wisdom',
  Star: 'constellationLion | star celestial', Stars: 'constellationLion | star celestial', Sun: 'garuda | firebird light', Surge: '| storm',
  Swift: '| swift', Sword: '| knight warrior', Technology: 'clockcrawler | technology clockwork', Tentacle: 'hydra | deep',
  Thread: 'stringless | thread puppet', Trap: '| spider carnivore', Tree: 'walkingOak | tree', Trowel: '| worm',
  Turtle: 'shellborn | turtle shell', Undeath: '| undead', Vast: '| giant behemoth leviathan', Venom: 'cobra | venom snake',
  Visage: 'doppelganger | visage mirror', Vision: '| eye owl', Void: 'driftreaver | void', War: 'juggernaut | war siege',
  Wasp: 'bellhive | insect swarm', Water: '| aquatic water', Whale: 'leviathan | deep', Wheel: '| harness engine',
  Whip: '| vine', Wind: 'dustDevilCur | sky wind', Wing: 'roc | bird', Wolf: 'wolf | canine',
  Wood: 'totemstalk | wood tree termite', Wrath: '| fiend', Zeal: '| oath angel', DivineWar: '| knight war',
  DivineKnowledge: '| wisdom scroll', DivinePurity: '| angel holy', DivineHealing: '| angel', DivineDeath: '| death',
  DivineHeros: '| knight angel', DivineLiberty: '| bird sky', DivineDominion: '| knight giant',
};
export const STONE_WANTS = {};
for (const [k, v] of Object.entries(S)) {
  const [core, tags] = v.split('|');
  STONE_WANTS[`stone${k}`] = { core: core.trim() || null, tags: tags.trim().split(/\s+/).filter(Boolean) };
}
/** A stone that names a fixed body keeps it (the user's rulings, round 425): Fox the Sandy Hound, Pangolin the Scalecurl. */
export const STONE_FIXED = { stoneFox: 'shiverfox', stonePangolin: 'scalecurl' };

/** Every body a stone can call: its core, then every body sharing a tag with it. */
const POOL_CACHE = new Map();
export function stonePool(stoneId) {
  if (POOL_CACHE.has(stoneId)) return POOL_CACHE.get(stoneId);
  const w = STONE_WANTS[stoneId];
  let out = [];
  if (w) {
    if (STONE_FIXED[stoneId]) out = [STONE_FIXED[stoneId]];
    else {
      const want = new Set(w.tags);
      if (w.core) want.add(w.core);
      out = Object.keys(FAMILY_TAGS).filter(f => !NOT_POOLED.has(f) && MONSTER_ART[f]
        && (f === w.core || FAMILY_TAGS[f].some(t => want.has(t))));
      if (w.core && MONSTER_ART[w.core]) out = [w.core, ...out.filter(f => f !== w.core)];
      // A body that is a later form of a line whose start is also here comes by rank, not by the pick: a Frog stone
      // calls the frog, which becomes the toad and the hydra; a hive stone calls grubs, never a queen at Iron.
      const here = new Set(out);
      out = out.filter(f => { const id = LINE_OF[f]; if (!id) return true; const L = RANK_LINES[id];
        const start = L.forms ? L.forms[0] : L.bodies[0][0]; return !L.collapse || f === start || f === w.core || !here.has(start); });
    }
  }
  POOL_CACHE.set(stoneId, out);
  return out;
}

// ---- elements ------------------------------------------------------------------------------------------------------
export const ELEMENT_KEYS = ['fire', 'frost', 'storm', 'water', 'earth', 'poison', 'shadow', 'necrotic', 'radiant', 'arcane', 'nature', 'blood', 'wind'];
const EL_WORDS = [
  ['fire', /\b(?:fire|flame|burn|heat|ember|lava|magma|inferno|cinder|ash|sun)/],
  ['frost', /\b(?:frost|ice|cold|snow|rime|glacier|winter)/],
  ['storm', /\b(?:lightning|storm|thunder|shock|spark|electric)/],
  ['wind', /\b(?:wind|air|gale|gust|sky)/],
  ['water', /\b(?:water|tide|sea|ocean|wave|rain|aqua|deep)/],
  ['earth', /\b(?:earth|stone|rock|sand|dust|crystal|metal|iron)/],
  ['poison', /\b(?:poison|venom|acid|plague|toxic|blight|rot|decay)/],
  ['necrotic', /\b(?:necrotic|death|bone|undeath|grave|corpse|soul)/],
  ['shadow', /\b(?:shadow|dark|void|night|umbral|curse)/],
  ['radiant', /\b(?:radiant|light|holy|divine|star|celestial|pure)/],
  ['blood', /\b(?:blood|hemo|crimson)/],
  ['nature', /\b(?:nature|life|plant|growth|verdant|heal|wood|tree)/],
  ['arcane', /\b(?:arcane|magic|mind|astral|force|psychic|mana|space)/],
];
/** The element a damage type or ability element word reads as, or null (physical, or nothing). */
export function elementOfWords(...words) {
  const s = words.filter(Boolean).join(' ').toLowerCase();
  if (!s) return null;
  for (const [el, re] of EL_WORDS) if (re.test(s)) return el;
  return null;
}
/** An essence row's element: its catalogue family, else its name (Venom, Plague, Moon ...). */
const FAMILY_EL = { fire: 'fire', cold: 'frost', storm: 'storm', air: 'wind', water: 'water', earth: 'earth', death: 'necrotic',
  dark: 'shadow', light: 'radiant', life: 'nature', blood: 'blood', mind: 'arcane', space: 'arcane' };
export function essenceElement(def) {
  if (!def) return null;
  return FAMILY_EL[def.family] || elementOfWords(def.name) || null;
}
/** Which element a drawn shade row already is. */
const SHADE_EL = {
  fire: 'ember cinder flame infernal molten magma charred emberlit fire brick goldfired',
  frost: 'glacial frost frosted rime rimed frostbitten frostcap frostvine frostpetal winter cold glacier frozen ice aurora',
  storm: 'storm stormcloud lightning bluesteel',
  wind: 'ghostly',
  water: 'azure abyssal tidal tidewake tidewrack water cobalt sapphire blackwater drowned cerulean sodden blue',
  earth: 'earth stone ochre umber clay mortar marble nightstone mossy tawny bronze rusted brass terracotta',
  poison: 'venom toxic blighted plague miasma nightshade sulphur widow witherthorn',
  shadow: 'void umbral gloom shadow darkness midnight twilit dusk sable jet ebon blackened inkblack black hooded',
  necrotic: 'bone bleached pallid ghost graveborn pale mourning blackrot bonewhite ashen sooty',
  radiant: 'radiant gilded golden sunlit goldleaf goldwrapped gold halo moonlit lamplit royal warded marble',
  arcane: 'amethyst violet orchid prismatic nebula starry twilight force arcane purple',
  nature: 'verdant emerald jade ivy gravemoss mossbound green swamp oak bluecap harvest petal',
  blood: 'sanguine crimson bloodforged bloodbloom bloodsong oxblood bloodlit bloodroot bloodwrapped scarlet ruby bloodrite red bloodmoss',
};
export const SHADE_ELEMENT = {};
for (const [el, words] of Object.entries(SHADE_EL)) for (const w of words.split(/\s+/)) if (!SHADE_ELEMENT[w]) SHADE_ELEMENT[w] = el;
/** The family's own drawn row for an element, or null when it has none (and the palette is laid over instead). */
export function shadeForElement(family, el) {
  const art = MONSTER_ART[family];
  if (!art || !el) return null;
  const shades = art.shades || [];
  const hit = shades.find(s => SHADE_ELEMENT[s] === el);
  return hit || null;
}
/**
 * THE PALETTES, one per element, the odd summons' rules: six stops brightening, spanning enough luminance that the
 * creature's own shading survives. Laid over a body by luminance (`remapPixelsWithLut`), registered as summon materials
 * `el_<element>`.
 */
export const ELEMENT_RAMPS = {
  fire: [0x1a0603, 0x4a1206, 0x8e2a08, 0xd2560e, 0xf7a033, 0xfff0a8],
  frost: [0x061520, 0x123652, 0x23628c, 0x4f9dc8, 0x9bd8f0, 0xf0fdff],
  storm: [0x0d0c22, 0x1f2560, 0x3448a0, 0x5c86d8, 0xa6c8f6, 0xfafcff],
  water: [0x03121c, 0x08304a, 0x0f5878, 0x2a8aa8, 0x6cc6d6, 0xd8f7fa],
  earth: [0x140e08, 0x35261a, 0x5d4530, 0x8a6a4a, 0xb8986e, 0xe6d6b4],
  poison: [0x0a1406, 0x1e3a0e, 0x3c6614, 0x66991c, 0xa6d03a, 0xeefaa4],
  shadow: [0x050410, 0x140f2c, 0x2a2050, 0x453878, 0x6f60a8, 0xb2a4e0],
  necrotic: [0x0c100c, 0x232b22, 0x414d3c, 0x6c7a62, 0xa6b298, 0xe8eedc],
  radiant: [0x1c1404, 0x4e3a0c, 0x8c6a18, 0xc89e30, 0xf0d070, 0xfffbe0],
  arcane: [0x12061e, 0x321048, 0x58207a, 0x8a3cb0, 0xc07ae0, 0xf6e0ff],
  nature: [0x061206, 0x123414, 0x225a22, 0x3c8a34, 0x7cc05c, 0xe0f8b4],
  blood: [0x160204, 0x40060c, 0x760e18, 0xb01e26, 0xe25a50, 0xffd0c4],
  wind: [0x0c1416, 0x22383c, 0x3e6266, 0x6a9496, 0xa8cccc, 0xf4fffe],
};
export const elementMaterialKey = (el) => (ELEMENT_RAMPS[el] ? `el_${el}` : null);
/** The elements as summon materials (`_materialSheet` reads these beside the odd summons' own). */
export const ELEMENT_MATERIALS = {};
for (const [el, ramp] of Object.entries(ELEMENT_RAMPS)) {
  ELEMENT_MATERIALS[`el_${el}`] = { key: `el_${el}`, name: el, adj: el, color: `#${ramp[4].toString(16).padStart(6, '0')}`, ramp, element: el };
}
const EL_LUT = new Map();
/** 256 -> rgb for an element material, built once. */
export function elementLut(key) {
  const m = ELEMENT_MATERIALS[key];
  if (!m) return null;
  if (!EL_LUT.has(key)) EL_LUT.set(key, rampLut(m.ramp));
  return EL_LUT.get(key);
}

// ---- the pick ------------------------------------------------------------------------------------------------------
const hashStr = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
/**
 * The body a (stone, essence) calls, out of the stone's pool. When part of the pool is made of the essence's element,
 * the pick is among those (weight 3) and the stone's own creature (2): a Bird stone with Fire calls the firebird, the
 * phoenix or the roc; a Wolf stone with Fire a hellhound, a forge hound or the wolf. Otherwise the stone's creature is
 * weighted 4 and the rest 1 (a Wolf stone with Star is most often the wolf, shaded in light).
 * Seeded by the pair, so the same socket keeps its creature. Null when the stone has no pool.
 */
export function pickFromPool(stoneId, essEl = null, salt = '') {
  let pool = stonePool(stoneId);
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];
  const w = STONE_WANTS[stoneId] || {};
  // When some of the pool is made of the essence's element, the pick is among those and the stone's own creature.
  const elHit = essEl ? pool.filter(f => (FAMILY_ELEMENTS[f] || []).includes(essEl)) : [];
  if (elHit.length) pool = pool.filter(f => elHit.includes(f) || f === w.core);
  const weights = pool.map(f => (elHit.includes(f) ? 3 : f === w.core ? (elHit.length ? 2 : 4) : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = hashStr(`${stoneId}|${essEl || ''}|${salt}`) % total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r < 0) return pool[i]; }
  return pool[0];
}

// ---- stats for the bodies that are never wild ---------------------------------------------------------------------
// [wild cousin, strength]. `strength` scales the cousin's damage and health (a lark is a small bird; a roc a giant one).
const COUSIN = {
  behemoth: ['trex', 1.0], garrisonKnight: ['ossuaryKnight', 1.0], griffin: ['whitelion', 1.15], juggernaut: ['minotaur', 1.2],
  lavaElemental: ['elemental', 1.15], leviathan: ['hydra', 1.4], manticore: ['chimera', 1.0], manticoreGoofball: ['chimera', 0.8],
  riderDeath: ['harbinger', 1.0], riderFamine: ['harbinger', 0.9], riderPestilence: ['harbinger', 0.9], riderWar: ['minotaur', 1.0],
  salamander: ['lizard', 1.4], stoneStatue: ['slimeGolem', 1.2], swarmgolem: ['slimeGolem', 1.1], troll: ['yeti', 1.05], wendigo: ['yeti', 1.0],
  anzu: ['thunderbird', 0.9], cambion: ['demon', 1.05], coalescedGiant: ['totemstalk', 1.2], constellationLion: ['whitelion', 1.05],
  cutOutWarrior: ['stringless', 1.1], devourer: ['hellhound', 1.0], doppelganger: ['shade', 1.3], dustDevilCur: ['wolf', 1.05],
  firebird: ['phoenix', 0.9], forceFist: ['elemental', 0.9], forgeHound: ['hellhound', 1.05], gaoler: ['ossuaryKnight', 1.0],
  garuda: ['birdangel', 1.0], golem: ['slimeGolem', 1.2], greatSerpent: ['cobra', 1.6], gremlin: ['gnoll', 0.9], gunDrone: ['steelRaptor', 0.9],
  harness: ['rustmantle', 1.1], harpy: ['bonepecker', 1.4], herald: ['harbinger', 1.0], heron: ['glasswader', 1.1],
  homunculus: ['bloomimp', 1.0], huskBearer: ['mournhusk', 1.0], koi: ['lurefin', 1.0], lampKeeper: ['lanternwraith', 1.0],
  lark: ['bonepecker', 0.9], livingPrism: ['shardling', 1.2], livingStatue: ['slimeGolem', 1.25], livingSutra: ['inkwell', 1.0],
  owl: ['bat', 1.6], pixie: ['bloomimp', 0.9], relayDrone: ['clockcrawler', 1.1], roc: ['thunderbird', 1.1],
  royalGuard: ['ossuaryKnight', 1.05], strawMan: ['stringless', 1.0], swornKnight: ['ossuaryKnight', 1.1],
  thunderheadSpirit: ['elemental', 1.0], toad: ['giantToad', 0.75], turnkey: ['rustmantle', 1.0], walkingOak: ['totemstalk', 1.1],
};
export const SUMMON_ONLY_BASE = {};
for (const [k, [c, s]] of Object.entries(COUSIN)) {
  const b = MONSTER_FAMILY_BASE[c];
  if (!b || MONSTER_FAMILY_BASE[k]) continue;
  SUMMON_ONLY_BASE[k] = { ...b, hp: Math.round(b.hp * s), dmg: Math.round(b.dmg * s), xp: 0, summonOnly: true, cousin: c };
  delete SUMMON_ONLY_BASE[k].ambushChance;
}
/** The stat row a body summons with: its wild one, or its cousin's. */
export const summonBaseFor = (family) => MONSTER_FAMILY_BASE[family] || SUMMON_ONLY_BASE[family] || null;
/** The body's shown name. */
export function bodyName(family) {
  return FAMILY_DISPLAY_NAME[family] || R393_DISPLAY_NAME[family] || R394_DISPLAY_NAME[family]
    || String(family || '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

// ---- how a body ranks up (item 4) ----------------------------------------------------------------------------------
export const RANKS = ['iron', 'bronze', 'silver', 'gold'];
export const rankIdx = (r) => Math.max(0, RANKS.indexOf(r === 'normal' ? 'iron' : (r === 'diamond' ? 'gold' : r)));
/** `grow`: the same body, larger each rank. */
export const GROW_SCALE = [1, 1.1, 1.2, 1.32];
/**
 * The lines. `forms[i]` is the body at rank i, `scale[i]` its size, `count[i]` how many come (multiply). A line is
 * found from ANY of its bodies, so a Frog stone's toad, a Gulletmaw and a hydra all walk the same road.
 */
export const RANK_LINES = {
  frog: { style: 'transform', collapse: true, forms: ['toad', 'giantToad', 'hydra', 'hydra'], scale: [1, 1, 1, 1.2],
    say: 'a frog at Iron, a monstrous toad at Bronze, a hydra at Silver, a greater hydra at Gold' },
  ant: { style: 'transform', collapse: true, forms: ['antGrub', 'antWorker', 'antSoldier', 'antQueen'], scale: [1, 1, 1, 1], queen: 'ant',
    say: 'grubs at Iron, workers at Bronze, soldiers at Silver, a queen at Gold who lays grubs that grow in the fight' },
  termite: { style: 'transform', collapse: true, forms: ['termiteGrub', 'termiteWorker', 'termiteSoldier', 'termiteQueen'], scale: [1, 1, 1, 1], queen: 'termite',
    say: 'grubs at Iron, workers at Bronze, soldiers at Silver, a queen at Gold who lays grubs that grow in the fight' },
  riders: { style: 'multiply', bodies: [['riderDeath'], ['riderDeath', 'riderFamine'], ['riderDeath', 'riderFamine', 'riderPestilence'],
    ['riderDeath', 'riderFamine', 'riderPestilence', 'riderWar']], scale: [1, 1.04, 1.08, 1.12], dmgEach: 0.6,
    say: 'Death at Iron; Famine rides with it from Bronze, Pestilence from Silver, War at Gold' },
  saurian: { style: 'transform', forms: ['lizard', 'crocodile', 'spinosaurus', 'trex'], scale: [1, 1, 1, 1.05],
    say: 'a lizard at Iron, a crocodile at Bronze, a sail-backed hexfin at Silver, a direjaw at Gold' },
  salamander: { style: 'transform', forms: ['salamander', 'salamander', 'lavaElemental', 'lavaElemental'], scale: [1, 1.15, 1, 1.15],
    say: 'a salamander, grown at Bronze, a lava elemental from Silver' },
  firebird: { style: 'transform', forms: ['firebird', 'firebird', 'phoenix', 'phoenix'], scale: [1, 1.12, 1, 1.15],
    say: 'a firebird, grown at Bronze, the phoenix from Silver' },
  lark: { style: 'transform', forms: ['lark', 'lark', 'roc', 'roc'], scale: [1, 1.15, 1, 1.15], say: 'a lark, grown at Bronze, a roc from Silver' },
  serpent: { style: 'transform', forms: ['cobra', 'cobra', 'greatSerpent', 'leviathan'], scale: [1, 1.15, 1, 1],
    say: 'a cobra, grown at Bronze, a great serpent at Silver, a leviathan at Gold' },
  ooze: { style: 'transform', forms: ['slime', 'slime', 'slimeGolem', 'slimeGolem'], scale: [1, 1.15, 1, 1.15], say: 'an ichorling, a slime golem from Silver' },
  bones: { style: 'transform', forms: ['skeleton', 'skeleton', 'ossuaryKnight', 'ossuaryKnight'], scale: [1, 1.1, 1, 1.15], say: 'a boneguard, an ossuary knight from Silver' },
  knight: { style: 'transform', forms: ['garrisonKnight', 'garrisonKnight', 'royalGuard', 'swornKnight'], scale: [1, 1.1, 1, 1.05],
    say: 'a garrison knight, a household knight at Silver, a sworn knight at Gold' },
  homunculus: { style: 'transform', forms: ['homunculus', 'homunculus', 'homunculus', 'cambion'], scale: [1, 1.15, 1.3, 1], say: 'a homunculus that grows, a cambion at Gold' },
  owl: { style: 'grow', forms: ['owl', 'owl', 'owl', 'owl'], scale: [1, 1.15, 1.3, 1.45], say: 'an owl, larger each rank' },
  rats: { style: 'multiply', bodies: [['gnawling'], ['gnawling', 'gnawling'], ['gnawling', 'gnawling', 'gnawling'], ['gnawling', 'gnawling', 'gnawling', 'gnawling']],
    scale: [1, 1.05, 1.1, 1.15], dmgEach: null, say: 'one gnawling at Iron, a pack of four by Gold' },
  bats: { style: 'multiply', bodies: [['bat'], ['bat', 'bat'], ['bat', 'bat', 'bat'], ['bat', 'bat', 'bat', 'bat']], scale: [1, 1.05, 1.1, 1.15], dmgEach: null,
    say: 'one duskfang at Iron, a colony of four by Gold' },
  spiders: { style: 'multiply', bodies: [['spider'], ['spider', 'spider'], ['spider', 'spider', 'spider'], ['spider', 'spider', 'spider']], scale: [1, 1.05, 1.1, 1.2], dmgEach: null,
    say: 'one webstalker at Iron, a clutch of three from Silver' },
  bees: { style: 'multiply', bodies: [['bellhive'], ['bellhive', 'bellhive'], ['bellhive', 'bellhive'], ['swarmgolem']], scale: [1, 1, 1.1, 1], dmgEach: null,
    say: 'a bellhive, two from Bronze, the swarm golem at Gold' },
};
const LINE_OF = {};
for (const [id, L] of Object.entries(RANK_LINES)) {
  const fams = L.forms || [].concat(...L.bodies);
  // the first line to claim a body keeps it; a body is only the START of a line when it is that line's Iron form
  for (const f of fams) if (!LINE_OF[f]) LINE_OF[f] = id;
}
/** The line a body walks, or null (it grows). */
export const lineOf = (family) => LINE_OF[family] || null;
/** Families that are a line's Iron body: picking one of the later forms (a hydra from a Deep stone) is just that body. */
export const LINE_STARTS = new Set(Object.values(RANK_LINES).map(L => (L.forms ? L.forms[0] : L.bodies[0][0])));
/**
 * What an ability calling `family` brings at `rank`: [{ family, scale }], one per body, plus the line's style and its
 * per-body damage share. A body that begins no line grows: the same body at GROW_SCALE.
 */
export function bodiesAtRank(family, rank, o = {}) {
  const ri = rankIdx(rank);
  const id = o.line || (LINE_STARTS.has(family) ? LINE_OF[family] : null);
  const L = id ? RANK_LINES[id] : null;
  if (!L) return { style: 'grow', line: null, bodies: [{ family, scale: GROW_SCALE[ri] }], dmgEach: 1 };
  if (L.style === 'multiply') {
    const n = L.bodies[ri].length;
    return { style: 'multiply', line: id, bodies: L.bodies[ri].map(f => ({ family: f, scale: L.scale[ri] })),
      dmgEach: L.dmgEach != null ? L.dmgEach : Math.round((1 / Math.sqrt(n)) * 100) / 100, queen: L.queen || null };
  }
  return { style: L.style, line: id, bodies: [{ family: L.forms[ri], scale: L.scale[ri] }], dmgEach: 1, queen: ri === 3 ? (L.queen || null) : null };
}

// ---- the queen's brood ---------------------------------------------------------------------------------------------
/** "Queens at gold with summon Grubs that grow to workers then soldiers during combat." */
export const BROOD = {
  ant: ['antGrub', 'antWorker', 'antSoldier'], termite: ['termiteGrub', 'termiteWorker', 'termiteSoldier'],
  layEveryS: 7, maxBrood: 3, growS: [12, 14], lifeS: 45, dmgShare: [0.3, 0.45, 0.6],
};

// ---- the Four Riders (item 1) -------------------------------------------------------------------------------------
/**
 * Each rider's own blow, and what it gives the caster when the riders are subsumed. Subsuming is all of them or none:
 * the riders come back into you together, and each that has ridden out by this rank lends its own power.
 */
export const RIDERS = {
  riderDeath: {
    name: 'Rider of Death', unlock: 'iron', color: '#cfd8dc',
    blow: 'Reaping: strikes hit a foe under a quarter of its health for double, and leave it unable to heal',
    reapBelow: 0.25, reapMult: 2, debuff: { key: 'necrotoxin', duration: 6 },
    subsume: { id: 'deathsHand', op: 'mult', field: 'dmgMult', values: [0.06, 0.07, 0.08, 0.1], label: 'Death\'s Hand: your blows strike harder' },
  },
  riderFamine: {
    name: 'Rider of Famine', unlock: 'bronze', color: '#8d6e63',
    blow: 'Want: strikes slow a foe\'s attacks and weaken it, and the rider feeds on what it takes',
    debuff: { key: 'slowAttack', duration: 5 }, debuff2: { key: 'weaknessOfTheFlesh', duration: 5 }, feed: 0.25,
    subsume: { id: 'famineHunger', op: 'add', field: 'lifeOnKill', values: [0, 4, 5, 6], label: 'Famine\'s Hunger: each kill feeds you' },
  },
  riderPestilence: {
    name: 'Rider of Pestilence', unlock: 'silver', color: '#9ccc65',
    blow: 'Plague: strikes leave disease, and the sickness spreads to foes beside the one struck',
    debuff: { key: 'disease', duration: 8 }, spread: 70,
    subsume: { id: 'plagueTouch', op: 'dot', values: [0, 0, 3, 4], ticks: 3, tickMs: 1000, label: 'Plague Touch: every strike festers' },
  },
  riderWar: {
    name: 'Rider of War', unlock: 'gold', color: '#e53935',
    blow: 'Slaughter: strikes sunder armour and cleave the foes around the one struck; the other riders strike harder while War rides',
    debuff: { key: 'sunder', duration: 6 }, cleave: 0.5, cleaveR: 60, rally: 0.2,
    subsume: { id: 'warFury', op: 'add', field: 'attackSpeed', values: [0, 0, 0, 0.12], label: 'War\'s Fury: you attack faster' },
  },
};
export const RIDER_KEYS = Object.keys(RIDERS);
/** The riders out at `rank`. */
export const ridersAt = (rank) => RIDER_KEYS.filter(k => rankIdx(RIDERS[k].unlock) <= rankIdx(rank));
/** The subsume powers of the riders out at `rank`, as ritualSummons' power rows (ops `add` / `mult` / `dot`). */
export function riderSubsumePowers(rank) {
  const ri = rankIdx(rank);
  return ridersAt(rank).map(k => {
    const p = RIDERS[k].subsume;
    return { ...p, value: p.values[ri], rider: k, label: p.label };
  }).filter(p => p.value > 0);
}
/** The card's paragraph for the riders at `rank`: who rides, what each does, what subsuming gives. */
export function riderCardText(rank, o = {}) {
  const out = ridersAt(rank).map(k => `${RIDERS[k].name} (${RIDERS[k].blow})`);
  const next = RIDER_KEYS.find(k => rankIdx(RIDERS[k].unlock) > rankIdx(rank));
  let t = `The Four Riders: ${out.join('; ')}.`;
  if (next) t += ` ${RIDERS[next].name} rides out at ${RIDERS[next].unlock[0].toUpperCase()}${RIDERS[next].unlock.slice(1)}.`;
  if (o.subsume) {
    const ps = riderSubsumePowers(rank).map(p => p.label);
    if (ps.length) t += ` Subsumed, every rider goes into you together (all or none), and each lends its power: ${ps.join('; ')}.`;
  }
  return t;
}
/** Is this ability Doom's rider (by its body or its name)? */
export const RIDER_NAME_RE = /pale rider|rider of (death|the last day)|heralds? of the end|four riders/i;

// ---- checks --------------------------------------------------------------------------------------------------------
export function rosterFaults() {
  const out = [];
  for (const f of Object.keys(MONSTER_ART)) if (!FAMILY_TAGS[f]) out.push(`no tags: ${f}`);
  for (const f of Object.keys(FAMILY_TAGS)) if (!MONSTER_ART[f]) out.push(`tags for missing body: ${f}`);
  for (const id of STONE_IDS) if (!STONE_WANTS[id]) out.push(`no wants: ${id}`);
  for (const id of Object.keys(STONE_WANTS)) {
    if (!STONE_IDS.includes(id)) out.push(`wants for missing stone: ${id}`);
    const w = STONE_WANTS[id];
    if (w.core && !MONSTER_ART[w.core]) out.push(`${id}: core ${w.core} has no art`);
    if (!stonePool(id).length) out.push(`${id}: empty pool`);
  }
  for (const f of Object.keys(MONSTER_ART)) if (!summonBaseFor(f)) out.push(`no stats: ${f}`);
  for (const [id, L] of Object.entries(RANK_LINES)) for (const f of (L.forms || [].concat(...L.bodies))) if (!MONSTER_ART[f]) out.push(`line ${id}: ${f}`);
  for (const el of ELEMENT_KEYS) {
    const r = ELEMENT_RAMPS[el];
    if (!r || r.length !== 6) out.push(`ramp ${el}`);
  }
  return out;
}
