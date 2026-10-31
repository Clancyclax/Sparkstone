// ============================================================================
// ROUND 408 -- PLAYER TRANSFORMATIONS.
//
// The user:
//   "Player transform abilities should be tied to either mythological creature confluences, or the avatar confluence.
//    They should be an occasional ability definitely not in every kit.
//    The temporary transforms should use either intensely recolored character sprites or monster sprites depending on
//    the ability. Changing into a garuda form grants specific abilities while within the form and enhances the
//    abilities of the garuda confluence.
//    Some transformations let you keep your own abilities and just grant additional mana or armor, others temporarily
//    grant you alternate abilities unique to the form but powerful enough to be worth the loss of other essence
//    abilities.
//    Permanent transformations (i.e. into a vampire or lich, or some other permanent effects) let you keep access to all
//    your essence abilities and grant significant bonuses such as 50% increase to all resistances, kills restore 20% of
//    max health over 5 seconds, enemies damage is dealt first to health then if at 1 health it deals damage to mana or
//    stamina (depending on the form or ability) until that resource is fully drained it can't kill the transformed
//    player, it may turn all spells into special attacks that can only be cast through melee strikes but the cooldowns
//    are reduced by 50%, or many other things."
//
// THREE KINDS
//   mantle     temporary; you keep your whole kit and the form adds to it (mana, armour, speed, damage ...)
//   shift      temporary; the form's own abilities take the first four hotbar slots, every ability from your three
//              essences is put away until it ends, and your confluence's abilities stay -- and hit harder
//   permanent  used once and kept: every essence ability stays, and the perks below are yours from then on
//
// WHO GETS ONE: a kit whose confluence is one of FORM_CONFLUENCES (the mythic beasts and Avatar), one run in
// FORM_ODDS -- seeded on the character, so it is the same every load. The form replaces the confluence's innate
// ability (the confluence's own power, which a form of that creature is).
//
// LOOK: a temporary form draws as a monster of that kind (`look.monster` / `look.shade`, the family's own sheet, moved
// and animated as the player) or as the player recoloured hard (`look.tint`, `look.scale`, a glow).
// ============================================================================

/** One kit in this many, among kits whose confluence can carry a form. */
export const FORM_ODDS = 4;
export const FORM_KINDS = ['mantle', 'shift', 'permanent'];

/** The abilities a shifted form casts, as catalogue categories (awakening.js) named and pointed by the form; `mult`
 *  scales their damage over an ordinary ability of the same category. Built per cast-holder by `buildSignatureAbility`
 *  so they are real, castable abilities. */
const F = (name, catKey, desc, mult = 1.6) => ({ name, catKey, desc, mult });

export const FORMS = {
  // ---------------------------------------------------------------- shifts: the creature itself, its own abilities
  garuda: { conf: 'Garuda', name: 'Garuda Form', kind: 'shift', duration: 40, cooldown: 240, cost: 60,
    look: { monster: 'birdangel', shade: 'gilded', scale: 1.15 },
    desc: 'You become the great gold-winged hunter of serpents: wings, talons and a sun at your back.',
    confBoost: 0.4, moveSpeed: 0.25,
    abilities: [
      F('Sunwing Dive', 'movement_dash', 'You fold your wings and fall on a point like a thrown spear, scattering what stands there.'),
      F('Serpent-Bane Talons', 'ranged_damage', 'A raking stoop at the nearest foe; talons made to open scaled things.', 1.8),
      F('Gale of Gold Feathers', 'ranged_volley', 'A beat of the great wings throws a fan of razor-edged gold feathers.'),
      F('Solar Crown', 'self_active_aoe', 'The sun behind you flares and burns everything close.', 1.7),
    ] },
  dragon: { conf: 'Dragon', name: 'Dragon Form', kind: 'shift', duration: 40, cooldown: 300, cost: 70,
    look: { monster: 'dragon', shade: 'fire', scale: 1.1 },
    desc: 'Scale, horn and furnace. For a while you are the thing the songs are about.',
    confBoost: 0.4, armorPct: 0.25,
    abilities: [
      F('Wyrmfire', 'ranged_cone', 'A true breath: a roaring cone of dragonfire ahead of you.', 1.9),
      F('Tail Sweep', 'self_active_aoe', 'A turn of the body and the tail clears everything around you.'),
      F('Wing Buffet', 'aoe_weaken', 'The wings come down once and everything near reels, weakened.'),
      F('Hoard-Fury', 'self_active_damage', 'The old greed turns to rage: everything you do hits harder for a time.', 1),
    ] },
  hydra: { conf: 'Hydra', name: 'Hydra Form', kind: 'shift', duration: 45, cooldown: 280, cost: 60,
    look: { monster: 'hydra', shade: 'green', scale: 1.05 },
    desc: 'Many heads, one hunger, and a body that grows back what it loses.',
    confBoost: 0.4, regenPct: 0.02,
    abilities: [
      F('Many-Headed Strike', 'ranged_volley', 'Every head strikes at once at whatever is nearest.', 1.7),
      F('Venom Spray', 'ranged_cone', 'Three throats spit a cone of venom that keeps working afterwards.'),
      F('Regrowth', 'self_active_heal', 'A severed head grows back, and with it a good share of your health.', 1),
      F('Coil and Crush', 'aoe_dot_ring', 'The necks close around everything near and squeeze.'),
    ] },
  minotaur: { conf: 'Minotaur', name: 'Minotaur Form', kind: 'shift', duration: 40, cooldown: 240, cost: 50,
    look: { monster: 'minotaur', shade: 'tawny', scale: 1.05 },
    desc: 'Horns, bulk and the labyrinth-bred certainty that nothing in front of you will stay there.',
    confBoost: 0.4, armorPct: 0.2,
    abilities: [
      F('Gore Charge', 'movement_dash', 'Head down, you charge through the line and toss what you hit.', 1.8),
      F('Labyrinth Stomp', 'self_active_aoe', 'A hoof comes down and the ground knocks everything flat.', 1.7),
      F('Horn Hook', 'martial_sunder', 'A hooking gore that tears armour open.'),
      F('Bull Rage', 'self_active_damage', 'The red comes down: everything you do hits harder for a time.', 1),
    ] },
  kraken: { conf: 'Kraken', name: 'Kraken Form', kind: 'shift', duration: 40, cooldown: 280, cost: 65,
    look: { tint: 0x2e6b8f, scale: 1.25, glow: 0x7fd3ff },
    desc: 'Your shape runs dark and wet and too wide, with reaching arms and an ink-cloud breath.',
    confBoost: 0.4, armorPct: 0.15,
    abilities: [
      F('Drowning Grasp', 'taunt_pull', 'Arms from nowhere drag everything near toward you.', 1),
      F('Ink Cloud', 'aoe_weaken', 'A black cloud blinds and weakens what is caught in it.'),
      F('Crushing Coils', 'aoe_dot_ring', 'The arms close and keep closing.', 1.7),
      F('Abyssal Lash', 'ranged_damage', 'One long arm cracks out at the nearest foe.', 1.8),
    ] },
  behemoth: { conf: 'Behemoth', name: 'Behemoth Form', kind: 'shift', duration: 45, cooldown: 300, cost: 60,
    look: { monster: 'trex', shade: 'obsidian', scale: 1.15 },
    desc: 'Mountain-flanked and slow to anger, and once angry, not stopped by anything you have seen.',
    confBoost: 0.4, armorPct: 0.35, hpPct: 0.3, moveSpeed: -0.1,
    abilities: [
      F('Earthshaker', 'self_active_aoe', 'You stamp, and the ground answers for a long way.', 1.9),
      F('Trample', 'movement_dash', 'You walk through them. Some of them get up.', 1.6),
      F('Unmoved', 'self_active_armor', 'Your hide sets like stone.', 1),
      F('Bellow', 'aoe_weaken', 'A roar that takes the strength out of everything that hears it.'),
    ] },
  thunderbird: { conf: 'Thunderbird', name: 'Thunderbird Form', kind: 'shift', duration: 40, cooldown: 260, cost: 60,
    look: { monster: 'thunderbird', shade: 'storm', scale: 1.1 },
    desc: 'You are the storm with wings: thunder in the beat of them, lightning in the eyes.',
    confBoost: 0.4, moveSpeed: 0.25,
    abilities: [
      F('Thunderclap', 'self_active_aoe', 'The wings clap together and the air itself breaks.', 1.8),
      F('Lightning Glance', 'ranged_beam', 'A bolt from the eyes runs through everything in a line.', 1.8),
      F('Storm Dive', 'movement_dash', 'A stoop out of the clouds that lands like a strike.'),
      F('Rain of Bolts', 'ranged_volley', 'The sky answers your call, several times.'),
    ] },
  chimera: { conf: 'Chimera', name: 'Chimera Form', kind: 'shift', duration: 40, cooldown: 260, cost: 60,
    look: { monster: 'chimera', shade: 'tawny', scale: 1.05 },
    desc: 'Lion, goat and serpent, and each head thinks it is in charge.',
    confBoost: 0.4,
    abilities: [
      F('Lion\'s Maul', 'martial_sunder', 'The lion head tears into the nearest foe.', 1.8),
      F('Goat\'s Fire', 'ranged_cone', 'The goat head breathes fire.', 1.7),
      F('Serpent\'s Tail', 'ranged_dot', 'The tail strikes and leaves venom behind.'),
      F('Three Voices', 'aoe_weaken', 'Three roars at once, and everything near falters.'),
    ] },
  manticore: { conf: 'Manticore', name: 'Manticore Form', kind: 'shift', duration: 40, cooldown: 260, cost: 55,
    look: { monster: 'chimera', shade: 'infernal', scale: 1.05 },
    desc: 'A man\'s face, a lion\'s body and a tail full of poisoned spines.',
    confBoost: 0.4, moveSpeed: 0.1,
    abilities: [
      F('Spine Volley', 'ranged_volley', 'The tail flicks and a fan of poisoned spines follows.', 1.8),
      F('Man-Eater\'s Pounce', 'movement_dash', 'A lion\'s leap at the nearest throat.', 1.7),
      F('Venomed Barb', 'ranged_dot', 'One spine, aimed, and very poisonous.', 1.6),
      F('Three Rows of Teeth', 'martial_sunder', 'The smile opens, and keeps opening.'),
    ] },
  wendigo: { conf: 'Wendigo', name: 'Wendigo Form', kind: 'shift', duration: 40, cooldown: 260, cost: 50,
    look: { monster: 'yeti', shade: 'ashen', scale: 1.1 },
    desc: 'Antlered, starved and impossibly tall, with a cold that comes with you.',
    confBoost: 0.4, moveSpeed: 0.2, lifeSteal: 0.08,
    abilities: [
      F('Hunger', 'ranged_leech', 'You feed on the nearest foe from a distance.', 1.6),
      F('Starving Wind', 'aoe_dot_ring', 'A killing cold blows out from you.', 1.7),
      F('Long Stride', 'movement_dash', 'You are suddenly somewhere else, and closer.'),
      F('Antler Rake', 'martial_sunder', 'A sweep of antler and claw that opens armour.', 1.8),
    ] },
  // ---------------------------------------------------------------- mantles: keep your kit, the creature's power on top
  phoenix: { conf: 'Phoenix', name: 'Phoenix Mantle', kind: 'mantle', duration: 45, cooldown: 240, cost: 50,
    look: { tint: 0xff7a1a, scale: 1.12, glow: 0xffd54a },
    desc: 'Fire runs through you and over you. Everything you have, and the phoenix on top.',
    bonus: { manaPct: 0.3, dmg: 0.2, regenPct: 0.03, resist: { fire: 0.5 } } },
  firebird: { conf: 'Firebird', name: 'Firebird Mantle', kind: 'mantle', duration: 45, cooldown: 220, cost: 45,
    look: { tint: 0xffb02e, scale: 1.1, glow: 0xff5a2a },
    desc: 'Plumage of light settles over you; your spells burn brighter and cost less of you.',
    bonus: { manaPct: 0.5, manaRegen: 1.0, dmg: 0.1 } },
  roc: { conf: 'Roc', name: 'Roc Mantle', kind: 'mantle', duration: 45, cooldown: 220, cost: 45,
    look: { tint: 0xc9a46a, scale: 1.18 },
    desc: 'The weight and wind of the greatest bird settle on your shoulders.',
    bonus: { armorPct: 0.3, moveSpeed: 0.2, hpPct: 0.15 } },
  anzu: { conf: 'Anzu', name: 'Anzu Mantle', kind: 'mantle', duration: 40, cooldown: 220, cost: 45,
    look: { tint: 0x9a6cff, scale: 1.1, glow: 0xd7c2ff },
    desc: 'The storm-thief\'s lion-headed shadow falls over you: faster, and every strike carries thunder.',
    bonus: { moveSpeed: 0.2, attackSpeed: 0.25, dmg: 0.1 } },
  ziz: { conf: 'Ziz', name: 'Ziz Mantle', kind: 'mantle', duration: 45, cooldown: 240, cost: 50,
    look: { tint: 0x7fc4ff, scale: 1.2, glow: 0xffffff },
    desc: 'The bird whose wings darken the sun stands over you: your mana deepens and the sky is on your side.',
    bonus: { manaPct: 0.6, manaRegen: 1.5 } },
  harpy: { conf: 'Harpy', name: 'Harpy Mantle', kind: 'mantle', duration: 40, cooldown: 180, cost: 40,
    look: { monster: 'birdangel', shade: 'sanguine', scale: 1.0 },
    desc: 'Taloned and screaming and very hard to catch.',
    bonus: { moveSpeed: 0.3, dodge: 0.15, critChance: 0.08 } },
  gorgon: { conf: 'Gorgon', name: 'Gorgon Mantle', kind: 'mantle', duration: 40, cooldown: 220, cost: 50,
    look: { monster: 'medusa', shade: 'venom', scale: 1.0 },
    desc: 'Snakes in your hair and stone in your gaze. Things that strike you slow, and you are harder to hurt.',
    bonus: { armorPct: 0.4, resist: { poison: 0.5 } } },
  serpent: { conf: 'Serpent', name: 'Serpent Mantle', kind: 'mantle', duration: 40, cooldown: 200, cost: 40,
    look: { monster: 'spiritSerpent', shade: 'venom', scale: 1.15 },
    desc: 'You move like water and bite like the old serpent. Afflictions you lay last longer.',
    bonus: { moveSpeed: 0.15, dodge: 0.1, critChance: 0.06, dmg: 0.1 } },
  leviathan: { conf: 'Leviathan', name: 'Leviathan Mantle', kind: 'mantle', duration: 45, cooldown: 260, cost: 55,
    look: { tint: 0x1f4f8f, scale: 1.25, glow: 0x6fd0ff },
    desc: 'The weight of the deep sea settles into your bones: armour of the abyss and mana like a tide.',
    bonus: { armorPct: 0.35, manaPct: 0.4, resist: { water: 0.5, frost: 0.3 } } },
  troll: { conf: 'Troll', name: 'Troll Mantle', kind: 'mantle', duration: 45, cooldown: 220, cost: 45,
    look: { monster: 'tidalTroll', shade: 'swamp', scale: 1.0 },
    desc: 'Thick-hided and ugly, and every wound closes as you watch.',
    bonus: { armorPct: 0.3, regenPct: 0.04, hpPct: 0.2 } },
  // ---------------------------------------------------------------- permanent: Avatar, and the undying of the beasts
  vampire: { conf: 'Avatar', name: 'Embrace the Night', kind: 'permanent', cooldown: 30, cost: 0,
    desc: 'You become a vampire, permanently. All your essence abilities remain.',
    perks: { resistAll: 0.5, killMend: { frac: 0.2, secs: 5 }, lifeSteal: 0.05 },
    lines: ['All resistances +50%.', 'Every kill restores 20% of your maximum health over 5 seconds.', 'Your blows drink: 5% of the damage you deal returns as health.'] },
  lich: { conf: 'Avatar', name: 'The Phylactery Rite', kind: 'permanent', cooldown: 30, cost: 0,
    desc: 'You become a lich, permanently. All your essence abilities remain.',
    perks: { resistAll: 0.5, deathless: 'mana' },
    lines: ['All resistances +50%.', 'Below 1 health, blows drain your mana instead; while you have mana, you cannot be killed.'] },
  spellblade: { conf: 'Avatar', name: 'Avatar of the Edge', kind: 'permanent', cooldown: 30, cost: 0,
    desc: 'You become a living weapon, permanently. All your essence abilities remain.',
    perks: { spellstrike: true, resistAll: 0.2 },
    lines: ['Your spells become special attacks: casting one binds it to your weapon, and your next melee strike releases it on what you hit.', 'Spell cooldowns are halved.', 'All resistances +20%.'] },
  revenant: { conf: 'Wendigo', name: 'The Endless Hunger', kind: 'permanent', cooldown: 30, cost: 0,
    desc: 'The hunger takes you for good. All your essence abilities remain.',
    perks: { killMend: { frac: 0.2, secs: 5 }, deathless: 'stamina', resistAll: 0.25 },
    lines: ['Every kill restores 20% of your maximum health over 5 seconds.', 'Below 1 health, blows drain your stamina instead; while you have stamina, you cannot be killed.', 'All resistances +25%.'] },
  trollblood: { conf: 'Troll', name: 'Trollblood', kind: 'permanent', cooldown: 30, cost: 0,
    desc: 'Troll blood runs in you for good. All your essence abilities remain.',
    perks: { regenPct: 0.015, deathless: 'stamina', resistAll: 0.2 },
    lines: ['You regenerate 1.5% of your maximum health every second.', 'Below 1 health, blows drain your stamina instead; while you have stamina, you cannot be killed.', 'All resistances +20%.'] },
  phoenixsoul: { conf: 'Phoenix', name: 'Phoenix-Souled', kind: 'permanent', cooldown: 30, cost: 0,
    desc: 'A phoenix\'s soul settles in yours for good. All your essence abilities remain.',
    perks: { deathless: 'mana', resistAll: 0.25, resist: { fire: 0.5 } },
    lines: ['Below 1 health, blows burn your mana instead; while you have mana, you cannot be killed.', 'All resistances +25%, fire +50% more.'] },
  // Avatar's temporary form: the most yourself you can be
  ascendant: { conf: 'Avatar', name: 'Avatar Ascendant', kind: 'mantle', duration: 40, cooldown: 300, cost: 60,
    look: { tint: 0xfff2b0, scale: 1.2, glow: 0xffffff },
    desc: 'For a while you are the ideal of yourself, and the world can tell.',
    bonus: { dmg: 0.25, armorPct: 0.25, manaPct: 0.25, moveSpeed: 0.1 } },
};

/** The forms each confluence can carry (seeded pick among them). */
export const FORMS_BY_CONF = Object.entries(FORMS).reduce((m, [id, f]) => { (m[f.conf] = m[f.conf] || []).push(id); return m; }, {});
export const FORM_CONFLUENCES = Object.keys(FORMS_BY_CONF);

const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };

/** The form this character's kit carries, or null. `confName` the confluence's name, `seed` the character's seed. */
export function formForKit(confName, seed) {
  const ids = FORMS_BY_CONF[confName];
  if (!ids || !ids.length) return null;
  const h = hash(`form|${seed}|${confName}`);
  if (h % FORM_ODDS !== 0) return null;
  return ids[(h >>> 8) % ids.length];
}

/** The ability that carries the form, for the kit (replaces the confluence's innate). */
export function formAbility(id, color = '#e1bee7') {
  const f = FORMS[id];
  if (!f) return null;
  const lines = f.kind === 'permanent' ? f.lines
    : f.kind === 'shift' ? [`For ${f.duration} seconds: ${f.abilities.map(a => a.name).join(', ')} take your first four slots; your other essences' abilities are put away, and your ${f.conf} abilities hit ${Math.round(f.confBoost * 100)}% harder.`]
      : [`For ${f.duration} seconds: ${bonusLine(f.bonus)}. You keep all your abilities.`];
  return {
    name: f.name, kind: 'active', category: 'buff', template: 'creatureForm', formId: id, formKind: f.kind, color,
    cooldown: f.cooldown, duration: f.duration || 0, cost: f.cost ? { type: 'mana', amount: f.cost } : null,
    desc: `${f.desc} ${lines.join(' ')}${f.kind === 'permanent' ? ' This cannot be undone.' : ''}`,
    formLines: lines,
  };
}

export function bonusLine(b = {}) {
  const out = [];
  const pct = (v) => `${Math.round(v * 100)}%`;
  if (b.dmg) out.push(`+${pct(b.dmg)} damage`);
  if (b.manaPct) out.push(`+${pct(b.manaPct)} maximum mana`);
  if (b.manaRegen) out.push(`+${b.manaRegen} mana a second`);
  if (b.hpPct) out.push(`+${pct(b.hpPct)} maximum health`);
  if (b.armorPct) out.push(`+${pct(b.armorPct)} armour`);
  if (b.moveSpeed) out.push(`${b.moveSpeed > 0 ? '+' : ''}${pct(b.moveSpeed)} movement`);
  if (b.attackSpeed) out.push(`+${pct(b.attackSpeed)} attack speed`);
  if (b.dodge) out.push(`+${pct(b.dodge)} dodge`);
  if (b.critChance) out.push(`+${pct(b.critChance)} critical chance`);
  if (b.regenPct) out.push(`regenerate ${pct(b.regenPct)} of your health a second`);
  for (const [k, v] of Object.entries(b.resist || {})) out.push(`+${pct(v)} ${k} resistance`);
  return out.join(', ');
}

/** Everything wrong with the table. */
export function formFaults(catKeys = null, families = null) {
  const out = [];
  for (const [id, f] of Object.entries(FORMS)) {
    if (!FORM_KINDS.includes(f.kind)) out.push(`${id}: kind ${f.kind}`);
    if (!f.name || !f.desc) out.push(`${id}: no name or desc`);
    if (f.kind !== 'permanent' && !(f.duration > 0)) out.push(`${id}: no duration`);
    if (f.kind === 'shift' && (!f.abilities || f.abilities.length !== 4)) out.push(`${id}: a shift needs four abilities`);
    if (f.kind === 'shift' && catKeys) for (const a of f.abilities) if (!catKeys.includes(a.catKey)) out.push(`${id}: ${a.name} has no category ${a.catKey}`);
    if (f.kind === 'permanent' && (!f.perks || !f.lines || !f.lines.length)) out.push(`${id}: a permanent form with no perks`);
    if (f.kind !== 'permanent' && !f.look) out.push(`${id}: no look`);
    if (f.look && f.look.monster && families && !families.includes(f.look.monster)) out.push(`${id}: no monster family ${f.look.monster}`);
  }
  return out;
}
