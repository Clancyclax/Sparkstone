// ===========================================================================
// ROUND 394 -- THE r392 ART DROP'S ONE-OFF EFFECTS, FIELD DECALS AND RIDERS: WHAT EACH GAP ROW DRAWS.
//
//   "effects/oneoff/: one sheet or more per row. The `gaps` field in index.json names each file's row. Where a row
//    asked for several pieces, each piece is its own file: for example force-field has bubble, shatter, stasis dome
//    and ground ring."   "Close / unfold: played in reverse (portal close, wings unfold)."
//   "effects/fields/: one decal per field row."   "effects/riders/<kind>/<kind>_<element>.png: ... thorns-burst,
//    trail-decal, vial-cloud, parry-spark and shatter-burst. spark = twotone-spark: play the two elements' sparks
//    together, one mirrored, to get the two-tone hit."
//   "Don't forget to recolor all the new monster and animations for elemental variation."
//
// A `white` sheet is cut once per damage type (tools/make_fx_r394.py -> public/assets/fx394/<stem>_<type>.png, exactly
// as fx6), so a piece is drawn in the ability's own damage type (damageFx.js damageFxFor); a `natural` or `colour`
// sheet (an altar, an anvil, the aurora) is drawn as it is. Texture keys: fx394_<stem> for a sheet used as drawn,
// fx394_<stem>_<type> for a cut (`native` = the white as drawn), fx394_<kind>_<element> for a rider sheet. Other
// round-394 modules reference fx394_portcullis_drop, fx394_force_knot_<type>, fx394_marionette_<type> and
// fx394_mirror_shard_<type> by those keys (fx394Key below answers them).
//
// Pure data and pure functions -- the scene half is src/scenes/fxOneoff394Mixin.js -- so the suite
// (tools/tests/test_round394_oneoff.cjs) measures it in node.
//
// A PIECE ROLE (where a sheet stands):
//   ground  lies on the ground round the point, sized to the reach (drawn in the iso view already: a pool, a field)
//   ring    a circle drawn face-on, laid flat (squashed onto the iso ground) and sized to the reach (a nova, a ring)
//   burst   stands centred a little above the point (a flash, a pop)
//   stand   stands on the point, base on the ground (an altar, a portal, a door, a statue)
//   cone    origin on the caster, turned to the aim (a fan, a cone, a gust)
//   path    stretched along a dash or a pull, from where it starts to where it ends
//   travel  moves out from the caster along the aim while it plays (the phantom cavalry)
//   fly     a projectile's own flight loop (flight394For); when nothing flies it travels from the caster to the point
//   self    on the caster, riding them while it plays (a bubble, a dome, a mane, a vessel)
//   head    over a body's head, riding it (a brand, hearts, notes, a seal)
//   body    on a body, base at its feet, riding it (a web, a jar, a cocoon, the marionette's strings)
//   field   a field decal under the field for its life
//
// A LAYER: { s: stem, at, role?, scale, alpha, delay, after, laps, hold, rev, until, then, n, kinds, cond, r393 }
//   at     point (where the cast lands) | caster | aim (cone from the caster) | path | line (caster -> point) |
//          flight | bodies (struck bodies near the point) | cond (every body carrying the ability's condition while it
//          holds) | end (far end of a beam / dash) | start | field
//   after  starts when the layer before it ends (open -> hold -> close);  rev  frames played backwards (a close, an
//   unfold);  laps  plays through this many times;  hold  'dur' = loops for the ability's own duration (capped);
//   until  'shield' = loops while the player's shield holds, then plays `then`;  kinds  the cast kinds it belongs to
//   r393   an existing round-393 layer laid with it (the anvil's shockring), drawn by fxArt393Mixin._fx393Layer
// ===========================================================================
import { FX394_ENTRY_ROWS, FX394_ENTRY_NAMES, FX394_ROWS } from './fxArt394OneoffGaps.js';
import { FX394_SHEETS, FX394_FIELDS, FX394_RIDERS, FX394_TYPES } from './fx394Sheets.js';

export { FX394_ROWS, FX394_SHEETS, FX394_FIELDS, FX394_RIDERS, FX394_TYPES };

export const FX394_DIR = './public/assets/fx394';
export const DUR_CAP_MS = 9000;
export const DEFAULT_LOOP_MS = 3500;       // a recipe-less row's looping piece loops this long at most            // a held loop never outlives this (a long buff keeps its own aura)
export const RIDER_KINDS = Object.keys(FX394_RIDERS);

/** Where each one-off stands. */
export const ROLE = {
  accretion: 'ground', altar_rise: 'stand', amrita_pool: 'ground', amrita_rise: 'stand', anvil_drop: 'stand',
  arc_ring: 'ring', arc_crawl: 'body', astral_palm_fly: 'fly', astral_palm_hit: 'burst', aurora_curtain: 'path',
  aurora_patch: 'ground', aurora_sweep: 'stand', beads_flare: 'burst', beads_flood: 'ring', bite: 'burst',
  black_rose_burst: 'burst', blade_ring: 'ring', bramble_burst: 'cone', brand_stamp: 'head', brand_mark: 'head',
  breach_open: 'stand', breach_hold: 'stand', mirror_shard_cone: 'cone', mirror_shard: 'fly', phantom_cavalry: 'travel',
  cell_bars: 'body', charge_trail: 'path', charm_hearts: 'head', claw_rake: 'burst', talon_rake: 'burst',
  claw_rake_wide: 'cone', clockface: 'burst', clockface_small: 'head', cocoon_wrap: 'body', cocoon_burst: 'burst',
  confusion_notes: 'head', constellation: 'burst', cornfield: 'stand', cornfield_sway: 'stand', corona: 'self',
  crepuscular_rays: 'cone', crown: 'self', dawnburst: 'burst', daybreak: 'cone', door_slam: 'stand', downbeat_fan: 'cone',
  downbeat_ring: 'ground', downburst_sky: 'ground', downburst_storm: 'ground', dusk_fall: 'ground', edge_fly: 'fly',
  empower_burst: 'ring', explosion: 'burst', face_peel: 'head', mask_ring: 'ring', fire_whirl: 'stand',
  firecracker_pops: 'burst', floor_door: 'ground', fold_crane_burst: 'burst', fold_fan: 'cone', fold_spring: 'stand',
  force_bolt_fly: 'fly', force_bolt_hit: 'burst', forcefield_bubble: 'self', forcefield_shatter: 'self',
  stasis_dome: 'stand', forcefield_ground: 'field', force_swell: 'cone', glamour: 'body', glory_cone: 'cone',
  gravity_well: 'ground', gravity_well_nebula: 'ground', gravity_implode: 'burst', gravity_knot: 'burst',
  hail_fall: 'ground', hail_shatter: 'burst', hail_cell: 'ground', hail_burst: 'burst', holy_fire_cone: 'cone',
  holy_fire_ring: 'ground', honeycomb_build: 'self', honeycomb_shimmer: 'self', honeycomb_break: 'self',
  horn_jab: 'stand', interpose_dash: 'path', kick_arc: 'burst', kiss_mote: 'fly', kiss_burst: 'burst', kneel: 'body',
  labyrinth: 'ground', laid_touch: 'self', landslide: 'cone', leap_arc: 'path', ledger_tally: 'head',
  ledger_open: 'self', lily_pad_step: 'ground', lobbed_glob: 'fly', lotus_bloom: 'stand', mane_loop: 'self',
  mane_flare: 'self', manifest_rise: 'self', manifest_stamp: 'stand', manifest_swing: 'stand', manifest_forearm: 'path',
  marionette: 'body', mark_glyph: 'head', mask_whirl: 'cone', mask_snap: 'head', maypole_ribbons: 'ring',
  moth_flurry: 'cone', muzzle_cyborg: 'cone', muzzle_magitech: 'cone', casing_pop: 'self', muzzle_onslaught: 'cone',
  nebula_gas: 'burst', nightmare_burst: 'burst', nova: 'ring', oracle_open: 'self', oracle_loop: 'self',
  ouroboros_ring: 'ring', overgrowth_fertile: 'ground', overgrowth_ministration: 'ground', page_flurry: 'cone',
  petal_slash: 'burst', petal_swirl: 'ring', petal_gust: 'cone', pitfall: 'ground', plasma_slag: 'burst',
  portal_open: 'stand', portal_hold: 'stand', pounce_arc: 'path', predator_eyes: 'head', prism_split: 'cone',
  prismatic_burst: 'burst', prismatic_cone: 'cone', weapon_rack: 'stand', raised_hand: 'self', reel_ribbons: 'ring',
  regrowth: 'self', regrowth_loop: 'self', rift_unmaking: 'stand', rift_open: 'stand', rift_hold: 'stand',
  rift_close: 'stand', ripple_lotus: 'ground', ripple_tranquil: 'ground', rope_haul: 'path', scales_tip: 'stand',
  scales_sway: 'stand', scales_ring: 'ground', scales_slam: 'stand', jar_close: 'body', jar_crack: 'body',
  seedpod_burst: 'burst', shadow_bands: 'ground', shadow_band_fly: 'fly', shapeshift_ripple: 'self',
  shapeshift_swirl: 'self', crystal_shatter: 'burst', shed_skin: 'self', shell_burst: 'burst', shifting_room: 'ground',
  sinking_sand: 'ground', sunk_waist: 'body', spit_splash: 'burst', sprouting: 'body', stake_rise: 'stand',
  standing_stones: 'ground', static_cone: 'cone', statue_wake: 'stand', stoop: 'stand', supernova: 'ring',
  sutra_scroll: 'fly', suture: 'self', tablet: 'self', taunt_pyre: 'stand', trapdoor: 'ground', painted_pit: 'ground',
  vessel_fill: 'self', vessel_brim: 'self', wake_rings: 'ground', ward_dome_close: 'self', ward_dome_loop: 'self',
  ward_dome_break: 'self', wax_seal: 'head', web_cone: 'cone', web_splat: 'ring', web_overlay: 'body',
  wicker_man: 'stand', wingbeat_garuda: 'cone', wingbeat_roc: 'burst', wingbeat_roc_ring: 'ground', wings_fold: 'self',
  guilt_brand: 'head', gull_flock: 'ground', gull_scatter: 'burst', force_knot: 'burst', portcullis_drop: 'stand',
  // the field decals
  field_garden_bounty: 'field', field_garden_fertile: 'field', field_meadow: 'field', field_glade: 'field',
  field_dew: 'field', field_fairy_fertile: 'field', field_fairy_fey: 'field', field_sterile: 'field',
  field_quilt: 'field', field_nest: 'field', field_eggshell: 'field',
};

// the cast kinds (fx394Kind) a layer can name
export const KINDS = ['ring', 'cone', 'beam', 'move', 'bolt', 'strike', 'shield', 'self', 'freeze', 'field', 'summon', 'passive'];

/**
 * The rows that ask for more than "play the sheet where it lands": several pieces, a sequence, a reversed close, a
 * piece that belongs to one kind of cast. A row not listed here plays each of its pieces by its role.
 */
export const ROW_ART = {
  'altar-fx@Sacrifice': [{ s: 'altar_rise', at: 'point', hold: 900 }],
  'amrita-fx@Garuda': [{ s: 'amrita_pool', at: 'point', hold: 'dur' }, { s: 'amrita_rise', at: 'caster', delay: 150 }],
  // "anvil-fx (Forge) -- ring = shockring": the ring is the fxMap394 layer (src/data/fxMap394.js), layered with this
  'anvil-fx@Forge': [{ s: 'anvil_drop', at: 'point', hold: 500 }],
  'arc-fx@Magitech': [{ s: 'arc_ring', at: 'point', kinds: ['ring', 'self', 'summon', 'passive', 'bolt', 'strike'] },
    { s: 'arc_ring', at: 'aim', role: 'burst', kinds: ['cone'], scale: 0.7 },
    { s: 'arc_crawl', at: 'bodies', laps: 3 }],
  'astral-palm-art@Mystic': [{ s: 'astral_palm_fly', at: 'flight' }, { s: 'astral_palm_hit', at: 'point' }],
  'aurora-fx@Sky': [{ s: 'aurora_curtain', at: 'path', laps: 'dur' }],
  'aurora-fx@Stellar': [{ s: 'aurora_patch', at: 'point', hold: 'dur', kinds: ['field', 'self', 'ring'] },
    { s: 'aurora_sweep', at: 'point', delay: 120 }],
  'beads-fx@Eclipse': [{ s: 'beads_flood', at: 'point', kinds: ['ring', 'self'] }, { s: 'beads_flare', at: 'point' }],
  'brand-fx@Transgression': [{ s: 'brand_stamp', at: 'bodies' }, { s: 'brand_mark', at: 'cond', after: true }],
  'breach-fx@Transgression': [{ s: 'breach_open', at: 'point' }, { s: 'breach_hold', at: 'point', after: true, laps: 3 },
    { s: 'breach_open', at: 'point', after: true, rev: true }],
  'broken-reflection-art@Nemesis': [{ s: 'mirror_shard_cone', at: 'aim' }, { s: 'mirror_shard', at: 'flight' }],
  'cavalry-fx@Battlefield': [{ s: 'phantom_cavalry', at: 'aim', role: 'travel', laps: 2 }],
  'cell-bars-fx@Prison': [{ s: 'cell_bars', at: 'bodies', hold: 1400 }],
  // "charm-fx (Succubus) -- pulse ring = shockring pink": the ring is the fxMap394 layer, layered with the hearts
  'charm-fx@Succubus': [{ s: 'charm_hearts', at: 'bodies', laps: 4 }, { s: 'charm_hearts', at: 'cond' }],
  'claw-rake-fx@Predatory': [{ s: 'claw_rake', at: 'point', kinds: ['strike', 'self', 'ring', 'passive', 'bolt'] },
    { s: 'claw_rake_wide', at: 'aim', kinds: ['cone', 'ring'] }],
  'clockface-fx@Time': [{ s: 'clockface', at: 'point', alpha: 0.7 }, { s: 'clockface_small', at: 'cond' }],
  'cocoon-fx@Weave': [{ s: 'cocoon_wrap', at: 'bodies', hold: 900 }, { s: 'cocoon_burst', at: 'point', kinds: ['passive', 'ring', 'summon'] }],
  'confusion-notes-fx@Discordant': [{ s: 'confusion_notes', at: 'bodies', laps: 4 }, { s: 'confusion_notes', at: 'cond' }],
  'cornfield-fx@Harvest': [{ s: 'cornfield', at: 'point', n: 5 }, { s: 'cornfield_sway', at: 'point', n: 5, after: true, laps: 'dur' },
    { s: 'cornfield', at: 'point', n: 5, after: true, rev: true }],
  'corona-aura-art@Eclipse': [{ s: 'corona', at: 'caster', laps: 'dur' }],
  'crown-fx@Sovereign': [{ s: 'crown', at: 'caster' }],
  'door-slam-fx@Gate': [{ s: 'door_slam', at: 'point', kinds: ['ring', 'self', 'cone', 'bolt'] }, { s: 'door_slam', at: 'bodies', kinds: ['strike', 'bolt'] }],
  'downbeat-fx@Ziz': [{ s: 'downbeat_fan', at: 'aim', kinds: ['cone', 'move'] }, { s: 'downbeat_ring', at: 'point', kinds: ['ring', 'self', 'move'] }],
  'face-peel-fx@Doppelganger': [{ s: 'mask_ring', at: 'point', kinds: ['ring', 'self'] }, { s: 'face_peel', at: 'bodies' }],
  'fairy-ring-fx@Fertile': [{ s: 'field_fairy_fertile', at: 'field' }],
  'fairy-ring-fx@Fey': [{ s: 'field_fairy_fey', at: 'field' }],
  'fold-fx@Simulacrum': [{ s: 'fold_crane_burst', at: 'point', kinds: ['bolt', 'ring', 'summon'] }, { s: 'fold_fan', at: 'aim', kinds: ['cone'] },
    { s: 'fold_spring', at: 'point', kinds: ['self', 'summon', 'ring'] }],
  'force-bolt-fx@Force': [{ s: 'force_bolt_fly', at: 'flight' }, { s: 'force_bolt_hit', at: 'point' }],
  'force-construct-sprite@Force': [{ s: 'force_knot', at: 'point', laps: 4 }],
  // "a humming hexagonal force-field bubble over the caster (6-frame loop, 4-frame shatter one-shot), a stasis dome and a
  //  ground ring for the heal field": each where it belongs
  'force-field-fx@Magitech': [{ s: 'forcefield_bubble', at: 'caster', kinds: ['shield', 'self'], until: 'shield', then: 'forcefield_shatter' },
    { s: 'stasis_dome', at: 'point', kinds: ['freeze'], hold: 600 }, { s: 'forcefield_ground', at: 'field', kinds: ['field'] }],
  'garden-field-fx@Bounty': [{ s: 'field_garden_bounty', at: 'field' }],
  'garden-field-fx@Fertile': [{ s: 'field_garden_fertile', at: 'field' }],
  'glade-field-fx@Verdant': [{ s: 'field_glade', at: 'field' }],
  'dew-field-fx@Dawn': [{ s: 'field_dew', at: 'field' }],
  'meadow-field-fx@Cycle': [{ s: 'field_meadow', at: 'field' }],
  'sterile-field-fx@Ministration': [{ s: 'field_sterile', at: 'field' }],
  'quilt-field-art@Weave': [{ s: 'field_quilt', at: 'field' }],
  'nest-field-art@Ziz': [{ s: 'field_nest', at: 'field' }, { s: 'field_eggshell', at: 'point', role: 'stand', scale: 0.5, delay: 500, hold: 'dur' }],
  'glamour-fx@Fey': [{ s: 'glamour', at: 'bodies', kinds: ['ring', 'bolt', 'strike'] }, { s: 'glamour', at: 'caster', kinds: ['self', 'cone', 'move'] }],
  'gravity-well-art@Nebula': [{ s: 'gravity_well_nebula', at: 'point', laps: 'dur' }, { s: 'gravity_knot', at: 'point', laps: 'dur' },
    { s: 'gravity_implode', at: 'point', after: true }],
  'hail-fx@Sky': [{ s: 'hail_fall', at: 'point', laps: 3 }, { s: 'hail_shatter', at: 'point', n: 6, delay: 250 }],
  'hail-fx@Storm': [{ s: 'hail_cell', at: 'point', laps: 2, kinds: ['ring', 'self', 'summon', 'beam'] }, { s: 'hail_burst', at: 'point' }],
  'holy-fire-fx@Wrath': [{ s: 'holy_fire_cone', at: 'aim', kinds: ['cone', 'beam'] }, { s: 'holy_fire_ring', at: 'point', kinds: ['ring', 'self', 'field', 'summon', 'bolt', 'strike', 'passive'] }],
  'honeycomb-fx@Bounty': [{ s: 'honeycomb_build', at: 'caster' }, { s: 'honeycomb_shimmer', at: 'caster', after: true, until: 'shield', then: 'honeycomb_break' }],
  'horn-row-fx@Minotaur': [{ s: 'horn_jab', at: 'aim', role: 'stand', n: 6, every: 70 }],   // "repeat per tile, staggered"
  'kiss-fx@Succubus': [{ s: 'kiss_mote', at: 'flight' }, { s: 'kiss_burst', at: 'point' }],
  'ledger-fx@Karmic': [{ s: 'ledger_open', at: 'caster', kinds: ['ring', 'self', 'beam', 'freeze', 'passive', 'summon'] }, { s: 'ledger_tally', at: 'cond' },
    { s: 'ledger_tally', at: 'bodies', laps: 4 }],
  'mane-fx@Anzu': [{ s: 'mane_flare', at: 'caster' }, { s: 'mane_loop', at: 'caster', after: true, laps: 'dur', kinds: ['self', 'passive'] }],
  'manifest-fx@Avatar': [{ s: 'manifest_rise', at: 'caster', kinds: ['ring', 'self', 'shield', 'passive'] },
    { s: 'manifest_stamp', at: 'point', delay: 380, kinds: ['ring', 'self', 'passive', 'strike'] },
    { s: 'manifest_swing', at: 'point', kinds: ['strike'] }, { s: 'manifest_forearm', at: 'path', kinds: ['move', 'cone'] }],
  'mask-fx@Simulacrum': [{ s: 'mask_whirl', at: 'aim', kinds: ['cone', 'ring'] }, { s: 'mask_snap', at: 'bodies' }],
  'muzzle-flash-fx@Cyborg': [{ s: 'muzzle_cyborg', at: 'caster', role: 'cone', lift: 24 }],
  'muzzle-flash-fx@Magitech': [{ s: 'muzzle_magitech', at: 'caster', role: 'cone', lift: 24 }, { s: 'casing_pop', at: 'caster', delay: 60 }],
  'muzzle-flash-fx@Onslaught': [{ s: 'muzzle_onslaught', at: 'caster', role: 'cone', lift: 24 }],
  'nebula-gas-art@Nebula': [{ s: 'nebula_gas', at: 'point', n: 4, laps: 2, alpha: 0.55 }],
  'oracle-trance-fx@Vision': [{ s: 'oracle_open', at: 'caster' }, { s: 'oracle_loop', at: 'caster', after: true, laps: 'dur' }],
  'petal-storm-fx@Lotus': [{ s: 'petal_swirl', at: 'point', laps: 3, kinds: ['ring', 'self'] }, { s: 'petal_gust', at: 'aim', kinds: ['cone'] }],
  'plasma-torch-fx@Cyborg': [{ s: 'plasma_slag', at: 'end', n: 4, laps: 3 }],
  // "a paired gate ... a 4-frame opening, 4-frame looping shimmer and 3-frame close, drawn twice (where a thing enters
  //  and where it leaves)" -- the close is the open played backwards
  'portal-pair-fx@Gate': [{ s: 'portal_open', at: 'start' }, { s: 'portal_hold', at: 'start', after: true, laps: 3 },
    { s: 'portal_open', at: 'start', after: true, rev: true },
    { s: 'portal_open', at: 'point', delay: 90 }, { s: 'portal_hold', at: 'point', after: true, laps: 3 },
    { s: 'portal_open', at: 'point', after: true, rev: true }],
  'portcullis-fx@Fortress': [{ s: 'portcullis_drop', at: 'point', hold: 1200 }],
  'portcullis-fx@Prison': [{ s: 'portcullis_drop', at: 'bodies', hold: 1200 }],
  'prismatic-burst-fx@Chaotic': [{ s: 'prismatic_burst', at: 'point', kinds: ['ring', 'self', 'bolt'] }, { s: 'prismatic_cone', at: 'aim', kinds: ['cone'] }],
  'regrowth-fx@Immortal': [{ s: 'regrowth', at: 'caster' }, { s: 'regrowth_loop', at: 'caster', after: true, laps: 'dur' }],
  'rift-fx@Sacrifice': [{ s: 'rift_open', at: 'point' }, { s: 'rift_hold', at: 'point', after: true, laps: 3 },
    { s: 'rift_close', at: 'point', after: true }],
  'rift-fx@Cataclysm': [{ s: 'rift_unmaking', at: 'point' }],
  'rope-fx@Unity': [{ s: 'rope_haul', at: 'line' }],
  'scales-art@Nemesis': [{ s: 'scales_sway', at: 'caster', role: 'stand', kinds: ['self', 'passive', 'summon'], laps: 'dur' },
    { s: 'scales_tip', at: 'point', kinds: ['ring', 'cone', 'bolt'] }, { s: 'scales_ring', at: 'point', kinds: ['ring', 'self'] }],
  'scales-turret-sprite@Karmic': [{ s: 'scales_sway', at: 'point', laps: 'dur' }, { s: 'scales_tip', at: 'point', after: true }],
  'sealed-in-jar-fx@Vessel': [{ s: 'jar_close', at: 'bodies', hold: 700 }, { s: 'jar_crack', at: 'bodies', after: true }],
  'shadow-bands-fx@Eclipse': [{ s: 'shadow_bands', at: 'point', laps: 3, kinds: ['ring', 'self', 'passive'] }, { s: 'shadow_band_fly', at: 'flight' }],
  'sinking-ground-fx@Oasis': [{ s: 'sinking_sand', at: 'point', laps: 'dur' }, { s: 'sunk_waist', at: 'bodies', laps: 'dur', delay: 300 }],
  'sprouting-overlay@Fertile': [{ s: 'sprouting', at: 'bodies', laps: 6 }, { s: 'sprouting', at: 'cond' }],
  'stakes-fx@Battlefield': [{ s: 'stake_rise', at: 'point', n: 7, hold: 900 }],
  'sutra-script-art@Mystic': [{ s: 'sutra_scroll', at: 'flight' }, { s: 'sutra_scroll', at: 'line', kinds: ['ring', 'self', 'summon', 'passive'], laps: 2 }],
  'trapdoor-fx@Charlatan': [{ s: 'trapdoor', at: 'point', hold: 600 }, { s: 'painted_pit', at: 'point', kinds: ['summon', 'field'], hold: 'dur' }],
  'vessel-filling-fx@Vessel': [{ s: 'vessel_fill', at: 'caster' }, { s: 'vessel_brim', at: 'caster', after: true, laps: 'dur' }],
  'ward-dome-fx@Guardian': [{ s: 'ward_dome_close', at: 'caster' }, { s: 'ward_dome_loop', at: 'caster', after: true, until: 'shield', then: 'ward_dome_break' }],
  'web-fx@Predatory': [{ s: 'web_splat', at: 'point', hold: 500 }, { s: 'web_overlay', at: 'cond' }],
  'web-overlay@Ambush': [{ s: 'web_overlay', at: 'bodies', hold: 1200 }, { s: 'web_overlay', at: 'cond' }],
  'wingbeat-gust-fx@Roc': [{ s: 'wingbeat_roc', at: 'aim', role: 'burst', kinds: ['cone', 'beam', 'strike', 'passive'] },
    { s: 'wingbeat_roc_ring', at: 'point', kinds: ['ring', 'self', 'passive', 'summon'] }],
  // "wings-fold-fx (Succubus) -- unfold = reversed": the wings open as the armour comes up, fold as it goes
  'wings-fold-fx@Succubus': [{ s: 'wings_fold', at: 'caster', rev: true, hold: 'dur' }, { s: 'wings_fold', at: 'caster', after: true }],
  'flock-sprite@Soaring': [{ s: 'gull_flock', at: 'point', laps: 'dur' }, { s: 'gull_scatter', at: 'point', after: true }],
  'guilt-brand-mark@Wrath': [{ s: 'guilt_brand', at: 'cond' }, { s: 'guilt_brand', at: 'bodies', laps: 6 }],
  'mark-glyph-art@Nemesis': [{ s: 'mark_glyph', at: 'bodies', hold: 600 }],
  'predator-eyes-fx@Predatory': [{ s: 'predator_eyes', at: 'bodies', hold: 400 }],
  'tablet-fx@Anzu': [{ s: 'tablet', at: 'caster', hold: 400 }],
  'wax-seal-fx@Effigy': [{ s: 'wax_seal', at: 'bodies', hold: 900 }],
  'charge-trail-fx@Onslaught': [{ s: 'charge_trail', at: 'path' }],
  'interpose-dash-fx@Guardian': [{ s: 'interpose_dash', at: 'path' }],
  'pounce-fx@Predatory': [{ s: 'pounce_arc', at: 'path' }],
  'stoop-fx@Anzu': [{ s: 'stoop', at: 'end' }],
  'marionette-fx@Weave': [{ s: 'marionette', at: 'bodies', hold: 1600 }],
  'kneel-fx@Sovereign': [{ s: 'kneel', at: 'bodies' }],
};

/** The shared rows that have no entry: their sites call these directly. */
export const SHARED_ROWS = { 'leap-arc@shared': 'leap_arc', 'lobbed-glob@shared': 'lobbed_glob' };

// ------------------------------------------------------------------------------------------------- sheets --
export function sheetInfo(stem) { return FX394_SHEETS[stem] || FX394_FIELDS[stem] || null; }

/** The texture key a stem is drawn with in a damage type: fx394_<stem>_<type> for a white base (its `native` when the
 *  type is not one of the thirty), fx394_<stem> for a sheet used as drawn. */
export function fx394Key(stem, dtype) {
  const s = sheetInfo(stem);
  if (!s) return null;
  if (s.cuts !== 'type') return `fx394_${stem}`;
  return `fx394_${stem}_${FX394_TYPES.includes(dtype) ? dtype : 'native'}`;
}

/** A rider sheet's key in an element (fx5's thirty-one: the thirty damage types and `native`). */
export function riderKey(kind, element) {
  const R = FX394_RIDERS[kind];
  if (!R) return null;
  const el = R.els[element] ? element : (R.els.physical ? 'physical' : Object.keys(R.els)[0]);
  return `fx394_${kind}_${el}`;
}

/** Any fx394 key -> { key, url, cell, cellH, frames, ms } for the loader, or null. */
export function fx394SheetFor(key) {
  const m = /^fx394_(.+)$/.exec(key || '');
  if (!m) return null;
  const rest = m[1];
  // a rider: <kind>_<element>
  const u = rest.indexOf('_');
  if (u > 0 && FX394_RIDERS[rest.slice(0, u)]) {
    const kind = rest.slice(0, u), el = rest.slice(u + 1), R = FX394_RIDERS[kind];
    if (!R.els[el]) return null;
    return { key, url: `${FX394_DIR}/riders/${kind}/${kind}_${el}.png`, cell: R.w, cellH: R.h, frames: R.frames, ms: R.els[el].ms };
  }
  const dir = (stem) => (FX394_FIELDS[stem] ? `${FX394_DIR}/fields` : FX394_DIR);
  const s0 = sheetInfo(rest);
  if (s0 && s0.cuts !== 'type') return { key, url: `${dir(rest)}/${rest}.png`, cell: s0.w, cellH: s0.h, frames: s0.frames, ms: s0.ms };
  const v = rest.lastIndexOf('_');
  if (v > 0) {
    const stem = rest.slice(0, v), c = rest.slice(v + 1), s = sheetInfo(stem);
    if (s && s.cuts === 'type' && (c === 'native' || FX394_TYPES.includes(c))) {
      return { key, url: `${dir(stem)}/${stem}_${c}.png`, cell: s.w, cellH: s.h, frames: s.frames, ms: s.ms };
    }
  }
  return null;
}

/** Every file the round ships: [{ key, url, cell, cellH, frames }] (the suite checks each one exists at its size). */
export function fx394AllSheets() {
  const out = [];
  for (const [stem, s] of [...Object.entries(FX394_SHEETS), ...Object.entries(FX394_FIELDS)]) {
    const cuts = s.cuts === 'type' ? ['native', ...FX394_TYPES] : [null];
    for (const c of cuts) out.push(fx394SheetFor(c ? `fx394_${stem}_${c}` : `fx394_${stem}`));
  }
  for (const [kind, R] of Object.entries(FX394_RIDERS)) for (const el of Object.keys(R.els)) out.push(fx394SheetFor(`fx394_${kind}_${el}`));
  return out;
}

// ------------------------------------------------------------------------------------------------- the plan --
/** The rows an ability's confluence entry waits on that this round's art covers, or null. */
export function fx394RowsFor(ability) {
  const a = ability || {};
  if (!a.confSheet) return null;   // a generated "Portal" keeps the art its words pick
  let key = a.confEntry ? `${a.confSheet}|${a.confEntry}` : null;
  if (!key || !FX394_ENTRY_ROWS[key]) key = (a.name && FX394_ENTRY_NAMES[a.name]) || key;
  const r = key && FX394_ENTRY_ROWS[key];
  return r && r.length ? r : null;
}

const SELF_T = new Set(['selfHeal', 'selfHot', 'immunityBuff', 'armorBuff', 'statBuff', 'transform', 'reflectWard', 'partyBuff',
  'thornsBuff', 'cleanse', 'cooldownReset', 'townPortal']);
const BOLT_T = new Set(['projectileBall', 'volley', 'projectile', 'bolt', 'lob']);
const STRIKE_T = new Set(['rangeStrike', 'stackStrike', 'sunderStrike', 'imbueStrike']);
const PASSIVE_T = new Set(['unarmedFocus', 'summonArmor', 'summonWeapon', 'summonGear', 'aura', 'weaponAffinity', 'condPayoff',
  'triggeredPassive', 'waterWalk', 'fateReroll', 'perception']);

/** Which kind of cast an ability makes, for the layers that belong to one. */
export function fx394Kind(ability) {
  const a = ability || {}, t = a.template || '';
  if (t === 'breathCone' || t === 'cone') return 'cone';
  if (t === 'beam') return 'beam';
  if (t === 'dash' || t === 'teleport') return 'move';
  if (BOLT_T.has(t)) return 'bolt';
  if (STRIKE_T.has(t)) return 'strike';
  if (t === 'absorbShield') return 'shield';
  if (t === 'timeFreeze') return 'freeze';
  if (t === 'bloomField') return 'field';
  if (t === 'activeSummon' || t === 'raiseDead' || t === 'corpseMine') return 'summon';
  if (SELF_T.has(t)) return 'self';
  if (PASSIVE_T.has(t) || a.kind === 'passive') return 'passive';
  return 'ring';
}

/** How long an ability's own thing lasts (ms): what a `hold: 'dur'` / `laps: 'dur'` layer loops for. */
export function fx394Dur(ability) {
  const a = ability || {};
  const s = a.fieldDuration || a.shieldDuration || a.buffDuration || a.duration || a.freezeDuration || a.summonDuration
    || (a.dot && a.dot.duration) || (a.debuff && a.debuff.duration) || 3;
  return Math.max(600, Math.min(DUR_CAP_MS, s * 1000));
}

/** A piece played by its role, for a row with no recipe (or a recipe layer that names only `s`). */
export function defaultAt(role, kind) {
  switch (role) {
    case 'cone': return 'aim';
    case 'travel': return 'aim';
    case 'path': return kind === 'move' ? 'path' : 'line';
    case 'fly': return kind === 'bolt' ? 'flight' : 'line';
    case 'self': return 'caster';
    case 'head': case 'body': return 'bodies';
    case 'field': return 'field';
    default: return 'point';
  }
}

/** One layer's own play length (ms), before a hold. */
export function layerMs(L, dur) {
  const s = sheetInfo(L.s);
  if (!s) return 0;
  const laps = L.laps === 'dur' ? Math.max(1, Math.round(dur / (s.frames * s.ms))) : Math.max(1, L.laps || 1);
  const hold = L.hold === 'dur' ? Math.max(0, dur - s.frames * s.ms * laps) : (L.hold || 0);
  return (s.frames * s.ms * laps) / (L.speed || 1) + hold;
}

/**
 * The plan for an ability: { rows, kind, dtype, dur, layers } or null. Each layer is resolved: its stem, role, where
 * it plays (`at`), its delay (a chained layer starts when the one before it ends), its laps and hold. A row whose
 * recipe has no layer for this kind of cast plays its first layer (so a covered entry never draws nothing).
 */
export function fxArt394For(ability, dtype = null) {
  const rows = fx394RowsFor(ability);
  if (!rows) return null;
  const kind = fx394Kind(ability);
  const dur = fx394Dur(ability);
  const layers = [];
  rows.forEach((row, ri) => {
    // a row with no recipe plays each piece by its role; a looping piece (an accretion disc, a labyrinth, a gravity
    // well) loops for the ability's own duration, up to DEFAULT_LOOP_MS
    const recipe = ROW_ART[row] || (FX394_ROWS[row] || []).map(s => ({ s, laps: sheetInfo(s) && sheetInfo(s).loop ? 'loop' : 1 }));
    let form = recipe.filter(L => !L.kinds || L.kinds.includes(kind));
    if (!form.length) form = recipe.slice(0, 1);
    let end = ri * 160;
    for (const L0 of form) {
      if (L0.r393) { layers.push({ ...L0, row, delay: (L0.delay || 0) + ri * 160 }); continue; }
      const s = sheetInfo(L0.s);
      if (!s) continue;
      const role = L0.role || ROLE[L0.s] || 'burst';
      let at = L0.at || defaultAt(role, kind);
      if (at === 'flight' && kind !== 'bolt') continue;   // a flight loop flies only on a bolt
      if (at === 'start' && kind !== 'move') at = 'caster';
      const delay = L0.after ? end : (L0.delay || 0) + ri * 160;
      const lapMs = L0.laps === 'loop' ? Math.min(dur, DEFAULT_LOOP_MS) : dur;
      const laps = L0.laps === 'dur' || L0.laps === 'loop' ? Math.max(1, Math.round(lapMs / (s.frames * s.ms))) : Math.max(1, L0.laps || 1);
      const hold = L0.hold === 'dur' ? Math.max(0, dur - s.frames * s.ms * laps) : (L0.hold || 0);
      const L = { ...L0, row, role, at, delay, laps, hold, loop: !!s.loop, colour: s.colour };
      layers.push(L);
      if (at !== 'flight' && at !== 'cond') end = delay + layerMs({ ...L0, laps, hold }, dur);   // the next `after` starts here
    }
  });
  if (!layers.length) return null;
  return { rows, kind, dtype, dur, layers, fieldR: kind === 'field' ? (ability.range || 120) : null };
}

/** The flight loop for a bolt whose entry waits on a row with a `fly` piece, or null. The spec is the one WorldScene's
 *  projectile code plays (key, frames, frameMs, heading, baseAngle, flightScale), the key in the bolt's damage type. */
export function flight394For(ability, dtype) {
  const plan = fxArt394For(ability, dtype);
  const L = plan && plan.kind === 'bolt' && plan.layers.find(x => x.at === 'flight');
  if (!L) return null;
  const s = sheetInfo(L.s);
  const spin = L.s === 'mirror_shard' || L.s === 'kiss_mote' || L.s === 'lobbed_glob';
  return {
    family: 'fx394', kind: 'r394', r394: true, row: L.row, stem: L.s, key: fx394Key(L.s, dtype), cell: s.w, cellH: s.h,
    frames: s.frames, frameMs: s.ms, heading: spin ? 'none' : 'aim', baseAngle: 0,
    flightScale: s.w <= 16 ? 1.6 : (s.w <= 32 ? 1.15 : 0.9), impact: null, why: 'gap',
  };
}

/** The condition marks a kit's abilities lay: { debuff key -> stem } (a brand over the branded, a web over the webbed). */
export function condMarksFor(ability) {
  const plan = fxArt394For(ability);
  const key = ability && ability.debuff && ability.debuff.key;
  if (!plan || !key) return null;
  const L = plan.layers.find(x => x.at === 'cond');
  return L ? { [key]: L.s } : null;
}

/** Every one-off and field stem some row (or shared site) uses -- the suite checks none is left unplayed. */
export function stemsInUse() {
  const used = new Set(Object.values(SHARED_ROWS));
  for (const [row, stems] of Object.entries(FX394_ROWS)) {
    const recipe = ROW_ART[row];
    if (recipe) { for (const L of recipe) { if (L.s) used.add(L.s); if (L.then) used.add(L.then); } }
    else for (const s of stems) used.add(s);
  }
  return used;
}
