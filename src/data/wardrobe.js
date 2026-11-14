// ============================================================================
// ROUND 333 -- THE WARDROBE.
//
//   "Turn off the per item shading based on equipment and for each outfit and
//    instead create an in game set of color options. Allow players to change
//    the colors of their sprites armor, and weapons in game for the battlemage,
//    and knight. In canon Jason Asano says many times 'it's not about killing
//    monsters, it's about looking good while you kill monsters'..."
//
// What changed. Until round 332 the Fully Armored knight was PAINTED from the
// dominant colour of each worn item's icon (armorPaint.js, round 32), so a red
// helmet made a red helm and nobody chose anything. That is gone: worn gear no
// longer recolours the sprite. The player picks the colour of each PIECE, per
// outfit, from a palette, on the Wardrobe (Equipment screen, under the body).
//
// Two outfits, two ways of finding a piece on the art:
//
//   'armored'     the knight is grey steel, so a piece is a POSITIONAL band of
//                 the figure (helmet / chest / gloves / belt / legs / boots) plus
//                 the two held weapons -- the pass armorPaint.paintSheet has
//                 always made. Only the colour SOURCE changed.
//   'battlemage'  the mage is cloth, leather, gold and steel, each a different
//                 hue, so a piece is a HUE CLASS (robe, sash and hem, trim,
//                 leather, blades). `classifyBattleMage` names the class of a
//                 pixel and `recolorPixels` moves it to the chosen colour,
//                 keeping its own light and dark so the folds survive.
//
// Pure: no scene, no canvas, so it runs under node. The scene turns a look into
// textures. A look is stored on `player.wardrobe`, which the save already
// carries (the whole player object is the save).
// ============================================================================

/** The palette. Chosen to stay vivid on both the steel and the cloth. */
export const WARDROBE_PALETTE = [
  { id: 'crimson',  name: 'Crimson',  hex: '#c62828' },
  { id: 'scarlet',  name: 'Scarlet',  hex: '#e8453c' },
  { id: 'ember',    name: 'Ember',    hex: '#ef7a1a' },
  { id: 'amber',    name: 'Amber',    hex: '#ffb300' },
  { id: 'gold',     name: 'Gold',     hex: '#e6b422' },
  { id: 'lime',     name: 'Lime',     hex: '#9ccc3c' },
  { id: 'green',    name: 'Green',    hex: '#2e9b4a' },
  { id: 'forest',   name: 'Forest',   hex: '#1f6e3e' },
  { id: 'teal',     name: 'Teal',     hex: '#12a39a' },
  { id: 'cyan',     name: 'Cyan',     hex: '#26c6da' },
  { id: 'sky',      name: 'Sky',      hex: '#4aa3e8' },
  { id: 'blue',     name: 'Blue',     hex: '#2f6fd6' },
  { id: 'navy',     name: 'Navy',     hex: '#25409a' },
  { id: 'indigo',   name: 'Indigo',   hex: '#4b3fb8' },
  { id: 'violet',   name: 'Violet',   hex: '#7e57c2' },
  { id: 'purple',   name: 'Purple',   hex: '#9c3fb5' },
  { id: 'magenta',  name: 'Magenta',  hex: '#d81b8a' },
  { id: 'rose',     name: 'Rose',     hex: '#ec7fa5' },
  { id: 'white',    name: 'White',    hex: '#f2f2f2' },
  { id: 'silver',   name: 'Silver',   hex: '#b8bfc9' },
  { id: 'slate',    name: 'Slate',    hex: '#6d7886' },
  { id: 'charcoal', name: 'Charcoal', hex: '#3b3f47' },
  { id: 'black',    name: 'Black',    hex: '#1d1e24' },
  { id: 'brown',    name: 'Brown',    hex: '#7a4a2a' },
  { id: 'bronze',   name: 'Bronze',   hex: '#b07a3c' },
];
export const PALETTE_BY_ID = Object.fromEntries(WARDROBE_PALETTE.map(c => [c.id, c]));

/** The pieces a look colours, per look-set. Order is the order the panel lists them. */
export const WARDROBE_PIECES = {
  armored: [
    { id: 'helmet', label: 'Helmet' },
    { id: 'chest',  label: 'Chest' },
    { id: 'gloves', label: 'Gloves' },
    { id: 'belt',   label: 'Belt' },
    { id: 'legs',   label: 'Legs' },
    { id: 'boots',  label: 'Boots' },
    { id: 'right',  label: 'Right-hand weapon' },
    { id: 'left',   label: 'Left-hand weapon / shield' },
  ],
  battlemage_bt2: [
    { id: 'robe',    label: 'Robe' },
    { id: 'accent',  label: 'Sash & hem' },
    { id: 'trim',    label: 'Trim' },
    { id: 'leather', label: 'Boots & leather' },
    { id: 'blades',  label: 'Weapons' },
  ],
  battlemage_bt1: [
    { id: 'robe',    label: 'Robe' },
    { id: 'leather', label: 'Pauldrons, belt & boots' },
    { id: 'trim',    label: 'Trim' },
    { id: 'blades',  label: 'Weapons' },
  ],
  // ROUND 337 -- Leather & Chainmail, both bodies. The same three pieces on either body (see classifyLeatherCell).
  leather_bt1: [
    { id: 'mail',    label: 'Helm & chainmail' },
    { id: 'leather', label: 'Leather' },
    { id: 'blades',  label: 'Weapons' },
  ],
  leather_bt2: [
    { id: 'mail',    label: 'Helm & chainmail' },
    { id: 'leather', label: 'Leather' },
    { id: 'blades',  label: 'Weapons' },
  ],
  // ROUND 371 -- the Duelist and the Pugilist (classifyWholeOutfit). Their weapons are drawn in the clothes' own
  // colours and are left as drawn, so neither set has a Weapons piece.
  duelist_bt1: [
    { id: 'coat',     label: 'Coat' },
    { id: 'trousers', label: 'Trousers' },
    { id: 'gloves',   label: 'Gloves & belt' },
    { id: 'shirt',    label: 'Shirt' },
  ],
  duelist_bt2: [
    { id: 'coat',     label: 'Coat' },
    { id: 'trousers', label: 'Trousers' },
    { id: 'gloves',   label: 'Gloves & belt' },
    { id: 'shirt',    label: 'Blouse' },
  ],
  pugilist_bt1: [
    { id: 'trousers', label: 'Trousers' },
    { id: 'wraps',    label: 'Hand & ankle wraps' },
  ],
  pugilist_bt2: [
    { id: 'trousers', label: 'Trousers' },
    { id: 'wraps',    label: 'Hand & ankle wraps' },
  ],
};

/** Which look-set an outfit on a body wears. The knight is one set for both bodies. */
export function lookSetFor(outfitId, bodyKey) {
  if (outfitId === 'battlemage') return bodyKey === 'bt1' ? 'battlemage_bt1' : 'battlemage_bt2';
  if (outfitId === 'leather') return bodyKey === 'bt1' ? 'leather_bt1' : 'leather_bt2';   // ROUND 337
  if (outfitId === 'armored') return 'armored';
  if (outfitId === 'duelist' || outfitId === 'pugilist') return `${outfitId}_${bodyKey === 'bt1' ? 'bt1' : 'bt2'}`;   // ROUND 371
  return null;   // the lich and anything later are not dyed
}

export function piecesFor(setId) { return WARDROBE_PIECES[setId] || []; }

/** Named looks, built from palette ids. Every id is a palette id. */
export const WARDROBE_PRESETS = {
  armored: [
    { name: 'Blackguard',     look: { helmet: 'black', chest: 'black', gloves: 'charcoal', belt: 'crimson', legs: 'black', boots: 'charcoal', right: 'crimson', left: 'black' } },
    { name: 'Gilded Paladin', look: { helmet: 'gold', chest: 'white', gloves: 'gold', belt: 'gold', legs: 'white', boots: 'gold', right: 'gold', left: 'white' } },
    { name: 'Verdant Warden', look: { helmet: 'forest', chest: 'green', gloves: 'forest', belt: 'bronze', legs: 'forest', boots: 'brown', right: 'lime', left: 'forest' } },
    { name: 'Crimson Order',  look: { helmet: 'crimson', chest: 'crimson', gloves: 'silver', belt: 'gold', legs: 'charcoal', boots: 'crimson', right: 'silver', left: 'crimson' } },
    { name: 'Frostguard',     look: { helmet: 'white', chest: 'sky', gloves: 'white', belt: 'silver', legs: 'sky', boots: 'white', right: 'cyan', left: 'white' } },
    { name: 'Royal Violet',   look: { helmet: 'violet', chest: 'purple', gloves: 'violet', belt: 'gold', legs: 'indigo', boots: 'purple', right: 'silver', left: 'violet' } },
  ],
  battlemage_bt2: [
    { name: 'Ember Mage',   look: { robe: 'ember', accent: 'crimson', trim: 'gold', leather: 'brown', blades: 'scarlet' } },
    { name: 'Moonlit',      look: { robe: 'indigo', accent: 'silver', trim: 'white', leather: 'charcoal', blades: 'sky' } },
    { name: 'Verdant',      look: { robe: 'forest', accent: 'lime', trim: 'gold', leather: 'brown', blades: 'green' } },
    { name: 'Nightveil',    look: { robe: 'black', accent: 'purple', trim: 'magenta', leather: 'charcoal', blades: 'violet' } },
    { name: 'Sunstitch',    look: { robe: 'amber', accent: 'white', trim: 'crimson', leather: 'bronze', blades: 'gold' } },
  ],
  battlemage_bt1: [
    { name: 'Ember Mage',   look: { robe: 'scarlet', leather: 'brown', trim: 'gold', blades: 'ember' } },
    { name: 'Moonlit',      look: { robe: 'indigo', leather: 'charcoal', trim: 'white', blades: 'sky' } },
    { name: 'Verdant',      look: { robe: 'forest', leather: 'brown', trim: 'lime', blades: 'green' } },
    { name: 'Nightveil',    look: { robe: 'black', leather: 'charcoal', trim: 'magenta', blades: 'violet' } },
    { name: 'Sunstitch',    look: { robe: 'amber', leather: 'bronze', trim: 'crimson', blades: 'gold' } },
  ],
  // ROUND 337 -- Leather & Chainmail.
  leather_bt1: [
    { name: 'Footpad',      look: { mail: 'slate', leather: 'charcoal', blades: 'silver' } },
    { name: 'Ember Guard',  look: { mail: 'bronze', leather: 'crimson', blades: 'ember' } },
    { name: 'Greenwood',    look: { mail: 'silver', leather: 'forest', blades: 'lime' } },
    { name: 'Moonlit',      look: { mail: 'white', leather: 'navy', blades: 'sky' } },
    { name: 'Gilded',       look: { mail: 'gold', leather: 'brown', blades: 'gold' } },
  ],
  leather_bt2: [
    { name: 'Footpad',      look: { mail: 'slate', leather: 'charcoal', blades: 'silver' } },
    { name: 'Ember Guard',  look: { mail: 'bronze', leather: 'crimson', blades: 'ember' } },
    { name: 'Greenwood',    look: { mail: 'silver', leather: 'forest', blades: 'lime' } },
    { name: 'Moonlit',      look: { mail: 'white', leather: 'navy', blades: 'sky' } },
    { name: 'Gilded',       look: { mail: 'gold', leather: 'brown', blades: 'gold' } },
  ],
  // ROUND 371
  duelist_bt1: [
    { name: 'Highwayman',  look: { coat: 'black', trousers: 'charcoal', gloves: 'brown', shirt: 'white' } },
    { name: 'Royal Blade', look: { coat: 'navy', trousers: 'slate', gloves: 'gold', shirt: 'white' } },
    { name: 'Greenwood',   look: { coat: 'forest', trousers: 'brown', gloves: 'bronze', shirt: 'white' } },
    { name: 'Rosewater',   look: { coat: 'rose', trousers: 'charcoal', gloves: 'white', shirt: 'white' } },
    { name: 'Violet Hour', look: { coat: 'purple', trousers: 'black', gloves: 'silver', shirt: 'silver' } },
  ],
  duelist_bt2: [
    { name: 'Highwayman',  look: { coat: 'black', trousers: 'charcoal', gloves: 'brown', shirt: 'white' } },
    { name: 'Royal Blade', look: { coat: 'navy', trousers: 'slate', gloves: 'gold', shirt: 'white' } },
    { name: 'Greenwood',   look: { coat: 'forest', trousers: 'brown', gloves: 'bronze', shirt: 'white' } },
    { name: 'Rosewater',   look: { coat: 'rose', trousers: 'charcoal', gloves: 'white', shirt: 'white' } },
    { name: 'Violet Hour', look: { coat: 'purple', trousers: 'black', gloves: 'silver', shirt: 'silver' } },
  ],
  pugilist_bt1: [
    { name: 'Monastery',  look: { trousers: 'amber', wraps: 'white' } },
    { name: 'Ironfist',   look: { trousers: 'charcoal', wraps: 'crimson' } },
    { name: 'Tide',       look: { trousers: 'navy', wraps: 'sky' } },
    { name: 'Jade Palm',  look: { trousers: 'forest', wraps: 'gold' } },
    { name: 'Dusk',       look: { trousers: 'purple', wraps: 'silver' } },
  ],
  pugilist_bt2: [
    { name: 'Monastery',  look: { trousers: 'amber', wraps: 'white' } },
    { name: 'Ironfist',   look: { trousers: 'charcoal', wraps: 'crimson' } },
    { name: 'Tide',       look: { trousers: 'navy', wraps: 'sky' } },
    { name: 'Jade Palm',  look: { trousers: 'forest', wraps: 'gold' } },
    { name: 'Dusk',       look: { trousers: 'purple', wraps: 'silver' } },
  ],
};

/** How many saved looks a player keeps per look-set. */
export const WARDROBE_SLOTS = 3;

export function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** A palette id (or a '#rrggbb' string) as {r,g,b}; null for anything else. */
export function colorOf(idOrHex) {
  if (!idOrHex) return null;
  if (PALETTE_BY_ID[idOrHex]) return hexToRgb(PALETTE_BY_ID[idOrHex].hex);
  return hexToRgb(idOrHex);
}

// ---- the player's wardrobe ------------------------------------------------

/** `player.wardrobe`, created on first use so an old save needs no migration. */
export function wardrobeOf(player) {
  if (!player) return { looks: {}, saved: {} };
  if (!player.wardrobe || typeof player.wardrobe !== 'object') player.wardrobe = {};
  const w = player.wardrobe;
  if (!w.looks || typeof w.looks !== 'object') w.looks = {};
  if (!w.saved || typeof w.saved !== 'object') w.saved = {};
  return w;
}

/** The look in force for a set: { pieceId: paletteId }. Unknown pieces and colours are dropped. */
export function lookOf(player, setId) {
  const w = wardrobeOf(player);
  const raw = w.looks[setId] || {};
  const out = {};
  for (const p of piecesFor(setId)) if (raw[p.id] && colorOf(raw[p.id])) out[p.id] = raw[p.id];
  return out;
}

/** Colour one piece (null clears it back to the art's own colour). Returns the new look. */
export function setPiece(player, setId, pieceId, colorId) {
  if (!piecesFor(setId).some(p => p.id === pieceId)) return lookOf(player, setId);
  const w = wardrobeOf(player);
  const look = { ...(w.looks[setId] || {}) };
  if (!colorId || !colorOf(colorId)) delete look[pieceId]; else look[pieceId] = colorId;
  w.looks[setId] = look;
  return lookOf(player, setId);
}

export function clearLook(player, setId) {
  wardrobeOf(player).looks[setId] = {};
}

/** Wear a whole look at once (a preset or a saved one). */
export function applyLook(player, setId, look) {
  const w = wardrobeOf(player);
  const out = {};
  for (const p of piecesFor(setId)) if (look && look[p.id] && colorOf(look[p.id])) out[p.id] = look[p.id];
  w.looks[setId] = out;
  return out;
}

/** Save the look in force into a slot (0..WARDROBE_SLOTS-1). */
export function saveLook(player, setId, slot, name) {
  if (!(slot >= 0 && slot < WARDROBE_SLOTS)) return false;
  const w = wardrobeOf(player);
  const list = w.saved[setId] = (w.saved[setId] || []).slice(0, WARDROBE_SLOTS);
  list[slot] = { name: String(name || `Look ${slot + 1}`).slice(0, 24), look: { ...lookOf(player, setId) } };
  return true;
}

export function savedLooks(player, setId) {
  const list = wardrobeOf(player).saved[setId] || [];
  const out = [];
  for (let i = 0; i < WARDROBE_SLOTS; i++) out.push(list[i] || null);
  return out;
}

/** The colours the scene paints with: { pieceId: {r,g,b} | null }. */
export function lookColors(player, setId) {
  const look = lookOf(player, setId);
  const out = {};
  for (const p of piecesFor(setId)) out[p.id] = look[p.id] ? colorOf(look[p.id]) : null;
  return out;
}

/** Stable text for a look, used in texture keys and want-ids. Empty when nothing is chosen. */
export function lookSig(player, setId) {
  const look = lookOf(player, setId);
  const parts = piecesFor(setId).filter(p => look[p.id]).map(p => `${p.id}=${look[p.id].replace('#', '')}`);
  return parts.join(',');
}

// ---- the BattleMage's pieces, found by colour -----------------------------

function rgbToHsv(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === R) h = (((G - B) / d) % 6) * 60;
    else if (max === G) h = ((B - R) / d + 2) * 60;
    else h = ((R - G) / d + 4) * 60;
    if (h < 0) h += 360;
  }
  return { h, s: max > 0 ? d / max : 0, v: max };
}

function rgbToHsl(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min, l = (max + min) / 2;
  let h = 0, s = 0;
  if (d > 1e-4) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)); else if (max === G) h = (B - R) / d + 2; else h = (R - G) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  if (s <= 1e-4) { const v = Math.round(l * 255); return [v, v, v]; }
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Which piece a BattleMage pixel belongs to, or null to leave it alone.
 * Measured off the two bodies' sheets (hue histograms of the idle sheets):
 *   bt2  crimson robe 290..352, blue sash/hem 185..255, gold trim 36..58,
 *        brown boots/leather 0..38 and 352..360, cream skirt and skin untouched;
 *   bt1  blue robe 185..255, brown pauldrons/belt/boots 0..38, gold trim.
 * Skin (warm, light) and the cream skirt are never recoloured; blades are the
 * grey steel (bt2's skirt is warm grey, so its blades are limited to the cool greys).
 */
export function classifyBattleMage(bodyKey, r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  const bt1 = bodyKey === 'bt1';
  // steel: low saturation. bt2 has a warm cream skirt, so only cool or neutral greys count there.
  if (s < 0.25 && v >= 0.2 && v < 0.92) {
    if (bt1) return 'blades';
    if ((h >= 160 && h <= 280) || s < 0.08) return 'blades';
    return null;
  }
  if (s < 0.25) return null;
  // gold trim
  if (h >= 36 && h < 58 && s >= 0.35 && v >= 0.5) return 'trim';
  // skin: warm, mid saturation, light
  if (((h >= 8 && h < 36) || h >= 350) && s < 0.6 && v >= 0.68) return null;
  // brown leather
  if ((h < 38 || h >= 352) && s >= 0.2 && v < 0.8) return 'leather';
  // blue cloth
  if (h >= 185 && h < 255 && s >= 0.2) return bt1 ? 'robe' : 'accent';
  // crimson cloth (bt2's robe)
  if (!bt1 && h >= 285 && h < 352 && s >= 0.3) return 'robe';
  return null;
}

// What each class looks like on the art, so a recolour can keep the shading:
// the pixel's own saturation and value are scaled by (target / reference).
const REF = {
  bt2: { robe: { s: 0.6, v: 0.45 }, accent: { s: 0.45, v: 0.5 }, trim: { s: 0.6, v: 0.85 }, leather: { s: 0.55, v: 0.45 }, blades: { s: 0.12, v: 0.55 } },
  bt1: { robe: { s: 0.45, v: 0.4 }, trim: { s: 0.5, v: 0.8 }, leather: { s: 0.55, v: 0.42 }, blades: { s: 0.12, v: 0.55 } },
};

/**
 * Recolour RGBA pixel data in place. `colors` is { robe, accent, trim, leather, blades }, each
 * {r,g,b} or null (null leaves the class as drawn). Returns the number of pixels changed.
 */
export function recolorPixels(data, bodyKey, colors, skip = null) {   // ROUND 369 -- `skip`: a mask of pixels to leave (the skin)
  const ref = REF[bodyKey === 'bt1' ? 'bt1' : 'bt2'];
  const target = {};
  let any = false;
  for (const k of Object.keys(ref)) {
    const c = colors && colors[k];
    if (c) { target[k] = rgbToHsv(c.r, c.g, c.b); any = true; }
  }
  if (!any) return 0;
  let changed = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    if (skip && skip[i >> 2]) continue;
    const cls = classifyBattleMage(bodyKey, data[i], data[i + 1], data[i + 2]);
    if (!cls || !target[cls]) continue;
    const t = target[cls], rf = ref[cls];
    const px = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    const k = Math.max(0.35, Math.min(2.4, t.v / rf.v));
    const s = Math.max(0, Math.min(1, cls === 'blades' ? t.s * (0.55 + 0.9 * px.v) : t.s * (px.s / rf.s)));
    const v = Math.max(0, Math.min(1, cls === 'blades' ? px.v * (0.55 + 0.9 * t.v) : px.v * k));
    const [r, g, b] = hsvToRgb(t.h, s, v);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
    changed++;
  }
  return changed;
}

// ---- ROUND 337 -- the Leather & Chainmail outfit's pieces, found by colour AND by shape ----------------------
//
// The outfit is brown leather (jerkin, trousers, gloves, boots), blue-grey steel (helm, coif, sleeves and cuffs of
// chainmail) and, in the weapon sets, more blue-grey steel (blades) and some wood. Hue alone separates the leather
// from the steel; it cannot separate the chainmail from a sword, because they are the same steel. Shape does:
//
//   * every steel pixel is grouped into its connected blob (8-neighbour, one cell of the sheet at a time);
//   * a blob that is short (<= 0.34 of the figure's 64px height) AND lies entirely within 0.30 of the figure's
//     height either side of its body axis is MAIL -- the helm and coif, the two sleeves, the cuffs;
//   * any other blob is a BLADE -- sword, axe head, scythe, spear point, the rim of a shield;
//   * in the partial-gear sheets (bare skin and white briefs under the pieces) a compact central blob at hip height
//     is the briefs, whose shading is as blue-grey as the steel's, and is left alone.
// The body axis is the median column of the cell's skin and leather pixels. Measured by rendering the classes over
// the real sheets (idle, attack and run, both bodies): tools/tests/test_round337.cjs holds the counts.
//
// Steel is the only class with a blue tint (hue 170..260, saturation 0.04..0.4): the briefs' neutral whites, the
// slash effects and the outlines fall outside it. Leather is hue 0..38 / 345..360, saturation >= 0.3, value
// 0.12..0.62; skin is the same hues but lighter (value >= 0.62), so it is never touched. A few dark skin-shadow
// pixels on the partial sheets are as dark as leather and take the leather colour as a darker edge line.
export const LEATHER_FIG_H = 64;
const LC_NONE = 0, LC_LEATHER = 1, LC_MAIL = 2, LC_BLADE = 3, LC_SKIP = 4, LC_SKIN = 5, LC_STEEL = 6;

const _hsvOut = { h: 0, s: 0, v: 0 };
function hsvInto(r, g, b, o) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === R) h = (((G - B) / d) % 6) * 60;
    else if (max === G) h = ((B - R) / d + 2) * 60;
    else h = ((R - G) / d + 4) * 60;
    if (h < 0) h += 360;
  }
  o.h = h; o.s = max > 0 ? d / max : 0; o.v = max;
}

/**
 * Class of every pixel in one cell. `data` is the whole sheet's RGBA, (x0, y0) the cell's corner, `w` the sheet's
 * width in pixels; `out` (cell*cell bytes) receives the classes: 0 untouched, 1 leather, 2 mail, 3 blade, 4 skip
 * (briefs), 5 skin (including the dark skin-shading pixels). `part` is true for the partial-gear sheets.
 */
export function classifyLeatherCell(data, w, x0, y0, cell, part, out) {
  const n = cell * cell;
  out.fill(0, 0, n);
  const colX = new Int32Array(cell);
  const vArr = new Float32Array(n), sArr = new Float32Array(n);
  let bodyN = 0, figTop = -1;
  const o = _hsvOut;
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      const i = ((y0 + y) * w + (x0 + x)) * 4;
      if (data[i + 3] === 0) continue;
      if (figTop < 0) figTop = y;
      hsvInto(data[i], data[i + 1], data[i + 2], o);
      const h = o.h, s = o.s, v = o.v;
      let c = LC_NONE;
      if (h >= 170 && h <= 260 && s >= 0.04 && s < 0.4 && v >= 0.2) c = LC_STEEL;
      else if (((h >= 5 && h < 36) || h >= 350) && s < 0.6 && v >= 0.62) c = LC_SKIN;
      else if ((h < 38 || h >= 345) && s >= 0.3 && v <= 0.62 && v >= 0.12) c = LC_LEATHER;
      out[y * cell + x] = c;
      vArr[y * cell + x] = v; sArr[y * cell + x] = s;
      if (c === LC_SKIN || c === LC_LEATHER) { colX[x]++; bodyN++; }
    }
  }
  // Dark skin shading (the lips, the hairline, the edge lines of an arm) is as brown and as dark as leather. A leather-
  // coloured pixel whose 5x5 neighbourhood holds more skin than leather is skin shading and is left as drawn.
  const shade = [];
  for (let y = 0; y < cell; y++) {
    for (let x = 0; x < cell; x++) {
      if (out[y * cell + x] !== LC_LEATHER) continue;
      let sk = 0, lt = 0;
      for (let dy = -2; dy <= 2; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= cell) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= cell) continue;
          const c = out[yy * cell + xx];
          if (c === LC_SKIN) sk++; else if (c === LC_LEATHER) lt++;
        }
      }
      if (sk > lt) shade.push(y * cell + x);
    }
  }
  for (let j = 0; j < shade.length; j++) out[shade[j]] = LC_SKIN;   // still body pixels, so colX and bodyN stand
  // the body axis: the median column of skin and leather
  let axis = cell / 2;
  if (bodyN > 10) {
    let acc = 0;
    for (let x = 0; x < cell; x++) { acc += colX[x]; if (acc * 2 >= bodyN) { axis = x; break; } }
  }
  // steel blobs
  const seen = new Uint8Array(n), stack = new Int32Array(n), blob = new Int32Array(n);
  const span = 0.30 * LEATHER_FIG_H, ext = 0.34 * LEATHER_FIG_H;
  for (let st = 0; st < n; st++) {
    if (out[st] !== LC_STEEL || seen[st]) continue;
    let sp = 0, bn = 0;
    stack[sp++] = st; seen[st] = 1;
    let minx = cell, maxx = 0, miny = cell, maxy = 0, sx = 0, sy = 0, inx = 0, sv = 0, ss = 0;
    while (sp) {
      const k = stack[--sp];
      blob[bn++] = k;
      const x = k % cell, y = (k - x) / cell;
      if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
      sx += x; sy += y; sv += vArr[k]; ss += sArr[k];
      if (Math.abs(x - axis) <= span) inx++;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= cell) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= cell) continue;
          const q = yy * cell + xx;
          if (out[q] === LC_STEEL && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
        }
      }
    }
    let c = LC_BLADE;
    if (Math.max(maxx - minx + 1, maxy - miny + 1) <= ext && inx >= bn * 0.99) c = LC_MAIL;
    // The briefs: on the partial-gear sheets the white briefs are shaded blue-grey like the steel. They are the
    // central blob at hip height (half to two-thirds of the way down the figure) that is light (mean value >= 0.55)
    // and nearly neutral (mean saturation <= 0.155); the chainmail hem under a jerkin is darker and bluer.
    if (part && c === LC_MAIL && bn >= 8 && Math.abs(sx / bn - axis) < 0.16 * LEATHER_FIG_H) {
      const f = (sy / bn - figTop) / LEATHER_FIG_H;
      if (f >= 0.48 && f <= 0.66 && sv / bn >= 0.55 && ss / bn <= 0.155) c = LC_SKIP;
    }
    for (let j = 0; j < bn; j++) out[blob[j]] = c;
  }
  // class 5 (skin) stays in the output: the Wardrobe moves it to the player's chosen skin tone
  return out;
}

// What each class looks like on the art (see REF above); steel is shaded the way the BattleMage's blades are.
const LEATHER_REF = { leather: { s: 0.55, v: 0.4 } };
// A darker tone scales each pixel's lightness down; a lighter one pulls it toward white by the headroom it has left, so
// the lightest tones do not clip to flat white and lose the shading.
function skinL(l, target) {
  const k = target / LEATHER_SKIN_L;
  return Math.max(0, Math.min(1, k <= 1 ? l * k : l + (1 - l) * (1 - 1 / k)));
}
const LEATHER_SKIN_L = 0.65;   // the median HSL lightness of the leather sheets' skin pixels (measured on all of it)

/**
 * Recolour a Leather & Chainmail sheet in place: `data` is its RGBA, `w` x `h` its size, `cell` the (square) frame,
 * `part` whether it is a partial-gear sheet, `colors` { mail, leather, blades } each {r,g,b} or null. Returns the
 * number of pixels changed.
 */
export function recolorLeather(data, w, h, cell, part, colors) {
  const tgt = {};
  let any = false;
  for (const k of ['mail', 'leather', 'blades']) {
    const c = colors && colors[k];
    if (c) { tgt[k] = rgbToHsv(c.r, c.g, c.b); any = true; }
  }
  // ROUND 337 (skin) -- `colors.skin` is the player's skin tone as {r,g,b}; the art's own skin (median lightness
  // LEATHER_SKIN_L) moves to that hue and saturation, each pixel keeping its shading relative to the tone's lightness.
  const skin = colors && colors.skin ? rgbToHsl(colors.skin.r, colors.skin.g, colors.skin.b) : null;
  if (skin) any = true;
  if (!any) return 0;
  const cols = Math.floor(w / cell), rows = Math.floor(h / cell);
  const cls = new Uint8Array(cell * cell);
  let changed = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      classifyLeatherCell(data, w, cx * cell, cy * cell, cell, part, cls);
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const c = cls[y * cell + x];
          if (!c || c === LC_SKIP) continue;
          if (c === LC_SKIN) {
            if (!skin) continue;
            const j = ((cy * cell + y) * w + (cx * cell + x)) * 4;
            const pl = rgbToHsl(data[j], data[j + 1], data[j + 2]);
            const [r2, g2, b2] = hslToRgb(skin.h, skin.s, skinL(pl.l, skin.l));
            data[j] = r2; data[j + 1] = g2; data[j + 2] = b2;
            changed++;
            continue;
          }
          const t = tgt[c === LC_LEATHER ? 'leather' : c === LC_MAIL ? 'mail' : 'blades'];
          if (!t) continue;
          const i = ((cy * cell + y) * w + (cx * cell + x)) * 4;
          const px = rgbToHsv(data[i], data[i + 1], data[i + 2]);
          let sat, val;
          if (c === LC_LEATHER) {
            const rf = LEATHER_REF.leather;
            val = Math.max(0, Math.min(1, px.v * Math.max(0.35, Math.min(2.4, t.v / rf.v))));
            sat = Math.max(0, Math.min(1, t.s * (px.s / rf.s)));
          } else {
            sat = Math.max(0, Math.min(1, t.s * (0.55 + 0.9 * px.v)));
            val = Math.max(0, Math.min(1, px.v * (0.55 + 0.9 * t.v)));
          }
          const [r, g, b] = hsvToRgb(t.h, sat, val);
          data[i] = r; data[i + 1] = g; data[i + 2] = b;
          changed++;
        }
      }
    }
  }
  return changed;
}

// ---- ROUND 369 -- THE BATTLEMAGE'S SKIN ---------------------------------------------------------------------------
//
// "All outfits need the skintone to match what the player selected." The bare body, the partial armour (round 152) and
// the Leather & Chainmail (round 337) already follow the chosen tone; the BattleMage did not. Its skin is a few hands
// and arms and a face deep in a hood, and its palette shares those colours with the staff, the axe handles and the
// robe's trim, so hue alone recolours a wooden haft. Shape separates them, per frame:
//
//   * LIGHT SKIN: warm (hue 350..36), lightish (value >= 0.68), not too saturated (< 0.6) -- the classifier's own skin
//     rule above -- in a blob, not a line: a group of such pixels counts only if one of them has at least five of its
//     eight neighbours in the group, and the group is not a stripe (along its long axis it spreads at most five times as
//     far as across it). The robe's 1-pixel trim, the light edge of a skirt and a tan blade fail that; a hand, a
//     forearm or a bare arm passes.
//   * THE FACE: warm pixels (hue 8..36, saturation >= 0.2, value >= 0.25) in a group that lies wholly in the head band
//     (the figure's top 10% to 30%), is small, and is a patch rather than a line (one pixel with four warm neighbours).
//     A handle or the trim running down the hood's front also starts in the band but does not end there, and a short
//     stretch of the hood's rim is a line, so neither is the face.
//   * SHADING: a warm pixel whose 5x5 neighbourhood holds more skin than other warm pixels is the skin's own shading.
//
// The fully armoured knight shows no skin, and the lich's is grey undeath, so neither is touched.
const BM_SKIN_L = 0.70;   // the median HSL lightness of the BattleMage sheets' skin pixels (measured on the idle sheets)

/** A mask (one byte per pixel of the sheet, 1 = skin) of a BattleMage sheet of square `cell` frames. */
export function battleMageSkinMask(data, w, h, cell) {
  const mask = new Uint8Array(w * h);
  const cols = Math.floor(w / cell), rows = Math.floor(h / cell);
  const n = cell * cell;
  const cand = new Uint8Array(n), light = new Uint8Array(n), skin = new Uint8Array(n);
  const seen = new Uint8Array(n), stack = new Int32Array(n), comp = new Int32Array(n);
  const o = _hsvOut;
  const flood = (st, want, cb) => {   // the 8-connected group of `want` pixels from `st`; returns its size in comp[]
    let sp = 0, cn = 0;
    stack[sp++] = st; seen[st] = 1;
    while (sp) {
      const k = stack[--sp];
      comp[cn++] = k;
      const x = k % cell, y = (k - x) / cell;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= cell) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= cell) continue;
          const q = yy * cell + xx;
          if (want[q] && !seen[q]) { seen[q] = 1; stack[sp++] = q; }
        }
      }
    }
    return cn;
  };
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * cell, y0 = cy * cell;
      cand.fill(0); light.fill(0); skin.fill(0);
      let top = -1, bot = -1;
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const i = ((y0 + y) * w + (x0 + x)) * 4;
          if (data[i + 3] < 10) continue;
          if (top < 0) top = y;
          bot = y;
          hsvInto(data[i], data[i + 1], data[i + 2], o);
          if (o.h >= 8 && o.h < 36 && o.s >= 0.2 && o.v >= 0.25) {
            cand[y * cell + x] = 1;
            if (o.s < 0.6 && o.v >= 0.68) light[y * cell + x] = 1;
          } else if (o.h >= 36 && o.h < 42 && o.s >= 0.2 && o.s < 0.6 && o.v >= 0.68 && o.v < 0.92) {
            light[y * cell + x] = 1;   // body type 2's hands, drawn in the trim's tan: only ever a blob (the trim is a line)
          } else if ((o.h >= 350 || o.h < 8) && o.s >= 0.2 && o.s < 0.6 && o.v >= 0.68) {
            cand[y * cell + x] = 1; light[y * cell + x] = 1;   // the pink of knuckles (no robe is this light)
          }
        }
      }
      if (top < 0) continue;
      const fh = bot - top + 1;
      // light skin, in blobs
      seen.fill(0);
      for (let st = 0; st < n; st++) {
        if (!light[st] || seen[st]) continue;
        const cn = flood(st, light);
        // a stripe (a robe's edge, a blade or haft drawn in a skin-like tan) is long and thin in SOME direction: its spread
        // along its long axis is more than five times its spread across it. A hand, an arm or a face is not.
        let core = false, mx = 0, my = 0;
        for (let j = 0; j < cn; j++) { const k = comp[j], x = k % cell; mx += x; my += (k - x) / cell; }
        mx /= cn; my /= cn;
        let sxx = 0, syy = 0, sxy = 0;
        for (let j = 0; j < cn; j++) { const k = comp[j], x = k % cell, y = (k - x) / cell; sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
        sxx /= cn; syy /= cn; sxy /= cn;
        const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
        const major = tr / 2 + disc, minor = Math.max(1 / 12, tr / 2 - disc);   // a one-pixel line still has 1/12 across it
        if (cn >= 6 && major > 25 * minor) continue;
        for (let j = 0; j < cn && !core; j++) {
          const k = comp[j], x = k % cell, y = (k - x) / cell;
          let nb = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < cell && yy >= 0 && yy < cell && light[yy * cell + xx]) nb++;
          }
          if (nb >= 5) core = true;
        }
        if (core) for (let j = 0; j < cn; j++) skin[comp[j]] = 1;
      }
      // the face: a small warm group wholly inside the head band
      const bandLo = top + Math.floor(0.10 * fh), bandHi = top + Math.ceil(0.30 * fh);
      const maxFace = Math.max(6, Math.round(fh * fh * 0.02));
      seen.fill(0);
      for (let st = 0; st < n; st++) {
        if (!cand[st] || seen[st]) continue;
        const cn = flood(st, cand);
        let inside = cn >= 3 && cn <= maxFace, thick = false;
        for (let j = 0; j < cn && inside; j++) {
          const k = comp[j], x = k % cell, y = (k - x) / cell;
          if (y < bandLo || y > bandHi) inside = false;
          let nb = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const xx = x + dx, yy = y + dy;
            if (xx >= 0 && xx < cell && yy >= 0 && yy < cell && cand[yy * cell + xx]) nb++;
          }
          if (nb >= 4) thick = true;
        }
        inside = inside && thick;   // a line of trim is never the face
        if (inside) for (let j = 0; j < cn; j++) skin[comp[j]] = 1;
      }
      // the skin's own shading (twice: an arm's shadow side is two or three pixels deep)
      for (let pass = 0; pass < 2; pass++) {
      const grow = [];
      for (let k = 0; k < n; k++) {
        if (!cand[k] || skin[k]) continue;
        const x = k % cell, y = (k - x) / cell;
        let sk = 0, other = 0;
        for (let dy = -2; dy <= 2; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= cell) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const xx = x + dx; if (xx < 0 || xx >= cell) continue;
            const q = yy * cell + xx;
            if (skin[q]) sk++; else if (cand[q]) other++;
          }
        }
        if (sk > other) grow.push(k);
      }
      for (const k of grow) skin[k] = 1;
      }
      for (let k = 0; k < n; k++) {
        if (!skin[k]) continue;
        const x = k % cell, y = (k - x) / cell;
        mask[(y0 + y) * w + (x0 + x)] = 1;
      }
    }
  }
  return mask;
}

/** Move the masked pixels to the skin tone `skin` ({r,g,b}), each keeping its shading against the art's own skin
 *  (median lightness `refL`). Returns the number changed. Shared by the BattleMage (and anything else with a mask). */
export function recolorSkinMasked(data, mask, skin, refL = BM_SKIN_L) {
  if (!skin) return 0;
  const t = rgbToHsl(skin.r, skin.g, skin.b);
  const k = t.l / refL;
  let changed = 0;
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    const pl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const l = Math.max(0, Math.min(1, k <= 1 ? pl.l * k : pl.l + (1 - pl.l) * (1 - 1 / k)));
    // the art's greyer shading stays greyer: a shadowed face in a hood does not turn into an orange one
    const [r, g, b] = hslToRgb(t.h, t.s * Math.max(0.5, Math.min(1, pl.s / 0.45)), l);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
    changed++;
  }
  return changed;
}

// ---- ROUND 371 -- THE DUELIST'S AND THE PUGILIST'S PIECES ------------------------------------------------------------
//
// "Wardrobe color changing seems to have been disabled" -- for the two outfits round 369 added, it was never enabled:
// they had no look-set, so the Equipment screen's Wardrobe button greyed out the moment either was worn. Both are small
// palettes (seven to fourteen colours a sheet), so each piece is a band of hue, saturation and value, measured off the
// sheets; the skin (battleMageSkinMask) is found first and never dyed, and the black outline never is. A weapon shares
// colours with the clothes (a staff's wood is the gloves' brown, a blade's steel the trousers' grey), so a piece's
// pixels too thin to be cloth -- a haft, a blade, a bowstave -- are left as drawn.
//
//   Duelist   coat     the burgundy long coat               hue 315..360 or 0..8, saturated, value 0.18..0.6
//             trousers the grey hat, trousers and boots     grey (s < 0.2), value 0.12..0.42
//             gloves   the brown gloves and belt            hue 8..30, saturated, value 0.3..0.8
//             shirt    the white shirt or blouse            grey, value >= 0.9
//   Pugilist  trousers the saffron trousers                hue 16..40, s >= 0.75
//             wraps    the hand and ankle wraps             hue 40..65, s 0.05..0.4, value >= 0.55
export function classifyWholeOutfit(outfit, r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 0.1) return null;   // the outline, and the black of a hat, vest or sash
  if (outfit === 'duelist') {
    if ((h >= 315 || h < 8) && s >= 0.45 && v >= 0.18 && v < 0.6) return 'coat';
    if (s < 0.2 && v >= 0.12 && v < 0.42) return 'trousers';
    if (h >= 8 && h < 30 && s >= 0.4 && v >= 0.3 && v < 0.8) return 'gloves';
    if (s < 0.08 && v >= 0.9) return 'shirt';
    return null;
  }
  if (outfit === 'pugilist') {
    if (h >= 16 && h < 40 && s >= 0.75 && v >= 0.45) return 'trousers';
    if (h >= 40 && h < 65 && s >= 0.05 && s < 0.4 && v >= 0.55) return 'wraps';
    return null;
  }
  return null;
}
const GROW = 2;
/** A colour a skin is drawn in (any tone): warm, neither grey nor saturated like the saffron trousers. */
function skinish(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  return (h < 36 || h >= 345) && s >= 0.2 && s < 0.72 && v >= 0.3;
}
const WHOLE_RULES = {
  duelist: {
    coat: { block: 2, minSize: 12 },
    trousers: { block: 3, touch: ['coat'], below: 0.5 },
    gloves: { block: 3, touch: ['coat'], maxSize: 48 },
    shirt: { block: 2, touch: ['coat'] },
  },
  pugilist: { trousers: { block: 3, minSize: 12 }, wraps: { block: 2, touch: ['skinish'], maxSize: 60, below: 0.4 } },
};
const WHOLE_REF = {
  duelist: { coat: { s: 0.7, v: 0.38 }, trousers: { s: 0.08, v: 0.25 }, gloves: { s: 0.58, v: 0.48 }, shirt: { s: 0.02, v: 0.97 } },
  pugilist: { trousers: { s: 0.9, v: 0.8 }, wraps: { s: 0.15, v: 0.82 } },
};

/** Recolour a Duelist or Pugilist sheet of square `cell` frames in place. `colors` { piece: {r,g,b} | null }, `skip`
 *  the skin mask. Returns the number of pixels changed. */
export function recolorWholeOutfit(data, w, h, cell, outfit, colors, skip = null) {
  const ref = WHOLE_REF[outfit];
  if (!ref) return 0;
  const target = {};
  let any = false;
  for (const k of Object.keys(ref)) {
    const c = colors && colors[k];
    if (c) { target[k] = rgbToHsv(c.r, c.g, c.b); any = true; }
  }
  if (!any) return 0;
  const keys = Object.keys(ref);
  const rules = keys.map(k => (WHOLE_RULES[outfit] || {})[k] || { block: 3 }), blk = rules.map(r => r.block || 3);
  const cols = Math.floor(w / cell), rows = Math.floor(h / cell), n = cell * cell;
  const cls = new Uint8Array(n), keep = new Uint8Array(n), grow = new Uint8Array(n);
  const seen = new Uint8Array(n), stack = new Int32Array(n), comp = new Int32Array(n);
  const memo = new Map(), paint = new Map();   // a sheet has a dozen colours: each is judged and mixed once
  let changed = 0;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      cls.fill(0);
      let top = -1, bot = -1;
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        if (data[((cy * cell + y) * w + cx * cell + x) * 4 + 3] >= 10) { if (top < 0) top = y; bot = y; }
      }
      if (top < 0) continue;
      // the Duelist's gloves are the brown of a dark skin's shading: above the shoulders it is the neck, never a glove
      const neck = top + Math.ceil(0.30 * (bot - top + 1));
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const p = (cy * cell + y) * w + cx * cell + x, i = p * 4;
        if (data[i + 3] === 0 || (skip && skip[p])) continue;
        const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        let c = memo.get(rgb);
        if (c === undefined) { c = classifyWholeOutfit(outfit, data[i], data[i + 1], data[i + 2]); memo.set(rgb, c); }
        if (c === 'gloves' && y < neck) continue;
        if (c) cls[y * cell + x] = keys.indexOf(c) + 1;   // every piece is found (a glove is known by the coat it touches), only the chosen are dyed
      }
      // a weapon is drawn one or two pixels wide; a piece of clothing is not. A pixel stays in its piece only where a
      // 3x3 block of that piece covers it (the opening), and the piece then grows back two pixels into its own colour
      // to recover its edges -- so a haft, a blade or a bowstave, even where it is held in a gloved hand, is left as
      // drawn.
      // The block is per piece (WHOLE_RULES): 2 for the narrow pieces (the Duelist's coat, whose back is folds two
      // pixels wide between black lines; a shirt down an open coat; a wrist wrap), 3 for the colours a weapon shares.
      keep.fill(0);
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const c = cls[y * cell + x];
        if (!c) continue;
        const b = blk[c - 1];
        if (x + b > cell || y + b > cell) continue;
        let full = true;
        for (let dy = 0; dy < b && full; dy++) for (let dx = 0; dx < b; dx++) if (cls[(y + dy) * cell + x + dx] !== c) { full = false; break; }
        if (full) for (let dy = 0; dy < b; dy++) for (let dx = 0; dx < b; dx++) keep[(y + dy) * cell + x + dx] = 1;
      }
      // Then each piece's pieces of cloth are judged whole (WHOLE_RULES): big enough to be cloth, against the coat
      // where they must be (a glove at its cuff, a shirt between its lapels or at the neck, the trousers under its hem;
      // the white of a staff's crystal, a shield's brown face or a hammer's steel head touch it nowhere, or not low
      // enough), and the trousers below the belt.
      seen.fill(0);
      const figH = bot - top + 1;
      for (let st = 0; st < n; st++) {
        if (!keep[st] || seen[st]) continue;
        const want = cls[st], rule = rules[want - 1];
        let sp = 0, cn = 0;
        stack[sp++] = st; seen[st] = 1;
        while (sp) {
          const k = stack[--sp]; comp[cn++] = k;
          const x = k % cell, y = (k - x) / cell;
          for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= cell) continue;
            for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= cell) continue;
              const q = yy * cell + xx; if (keep[q] && cls[q] === want && !seen[q]) { seen[q] = 1; stack[sp++] = q; } } }
        }
        let good = cn >= (rule.minSize || 1) && cn <= (rule.maxSize || n);
        if (good && rule.below) {
          let my = 0;
          for (let j = 0; j < cn; j++) my += Math.floor(comp[j] / cell);
          good = my / cn >= top + rule.below * figH;
        }
        if (good && rule.touch) {
          good = false;
          for (let j = 0; j < cn && !good; j++) {
            const k = comp[j], x = k % cell, y = (k - x) / cell;
            for (let dy = -2; dy <= 2 && !good; dy++) { const yy = y + dy; if (yy < 0 || yy >= cell) continue;
              for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx < 0 || xx >= cell) continue;
                const q = yy * cell + xx, c2 = cls[q];
                const pi = (cy * cell + yy) * w + cx * cell + xx;
                if ((c2 && c2 !== want && rule.touch.includes(keys[c2 - 1])) || (rule.touch.includes('skin') && skip && skip[pi])
                  || (rule.touch.includes('skinish') && data[pi * 4 + 3] >= 10 && skinish(data[pi * 4], data[pi * 4 + 1], data[pi * 4 + 2]))) { good = true; break; } } }
          }
        }
        if (!good) for (let j = 0; j < cn; j++) keep[comp[j]] = 0;
      }
      for (let step = 0; step < GROW; step++) {
        grow.set(keep);
        for (let k = 0; k < n; k++) {
          if (keep[k] || !cls[k]) continue;
          const x = k % cell, y = (k - x) / cell;
          for (let dy = -1; dy <= 1 && !grow[k]; dy++) { const yy = y + dy; if (yy < 0 || yy >= cell) continue;
            for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= cell) continue;
              const q = yy * cell + xx; if (keep[q] && cls[q] === cls[k]) { grow[k] = 1; break; } } }
        }
        keep.set(grow);
      }
      for (let k = 0; k < n; k++) {
        if (!cls[k] || !keep[k]) continue;
        const key = keys[cls[k] - 1], t = target[key], rf = ref[key];
        if (!t) continue;
        const x = k % cell, y = (k - x) / cell;
        const i = ((cy * cell + y) * w + cx * cell + x) * 4;
        const rgb = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2], mk = rgb * 8 + cls[k];
        let out = paint.get(mk);
        if (!out) {
          const px = rgbToHsv(data[i], data[i + 1], data[i + 2]);
          // shading kept: each pixel's value and saturation move by the ratio of the target's to the piece's own
          const v = Math.max(0, Math.min(1, px.v * Math.max(0.35, Math.min(3.2, t.v / rf.v))));
          const sat = Math.max(0, Math.min(1, rf.s < 0.12 ? t.s * (0.6 + 0.4 * px.v) : t.s * (px.s / rf.s)));
          out = hsvToRgb(t.h, sat, v);
          paint.set(mk, out);
        }
        data[i] = out[0]; data[i + 1] = out[1]; data[i + 2] = out[2];
        changed++;
      }
    }
  }
  return changed;
}

/** The skin of a Duelist or Pugilist sheet: the BattleMage's rule (round 369), less anything that is plainly a piece --
 *  the Pugilist's saffron trousers sit against a bare belly, and the BattleMage's shading pass would carry the skin
 *  into them -- and less anything not warm enough to be skin. */
export function wholeOutfitSkinMask(data, w, h, cell, outfit) {
  const mask = battleMageSkinMask(data, w, h, cell);
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    const { h: hu, s: sa } = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    // both outfits' skins are warm (hue below 36)
    if (!((hu < 36 || hu >= 345) && sa >= 0.15)) mask[p] = 0;
    else if (outfit === 'pugilist' && classifyWholeOutfit('pugilist', data[i], data[i + 1], data[i + 2]) === 'trousers') mask[p] = 0;
  }
  return mask;
}
