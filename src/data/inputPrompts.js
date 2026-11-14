// ===========================================================================
// ROUND 396 (item 2) -- THE PROMPT NAMES THE BUTTON IN YOUR HANDS.
//
//   "The onscreen control notes such as 'press E to talk to...' should adapt to whatever controller method is
//    currently in use. If a player is on a PlayStation controller it should instead say 'press L2+Touchpad to talk
//    to..' or on steamdeck it should say 'Press R4 to talk to'"
//
// WHICH METHOD IS "IN USE": the last one that pressed something. A key press says keyboard; a pad button or a pushed
// stick says pad (WorldScene tracks both). The mouse decides nothing -- on a Steam Deck the trackpad IS a mouse, and a
// prompt that flipped to "Press E" every time the player nudged the cursor would be the bug, not the fix.
//
// WHICH PAD: read off the id the browser reports. Sony's vendor id (054c) or its names say PlayStation; Valve's
// (28de, which covers the Deck's own controls and Steam's virtual pad on it) or a Steam Deck user agent says Deck;
// Microsoft's (045e) or "xbox"/"xinput" says Xbox. Anything else is a generic standard-mapping pad.
//
// THE BINDINGS ARE THE GAME'S OWN (hotkeys.js DPAD_ACTIONS, round 354): talking is L2 + Touchpad, everything else
// interact does is the bare Touchpad, and a pad with no touchpad does both on L2 + Select (LT + View on an Xbox pad).
// The Deck's R4 is the user's: Steam Input maps the back button for him, so the browser never sees it -- the prompt
// says what he presses, and the game hears whatever Steam sends.
//
// An Options override ("Button prompts") beats all of it, for a pad this cannot recognise.
// ===========================================================================

export const PROMPT_FAMILIES = ['keyboard', 'playstation', 'steamdeck', 'xbox', 'generic'];
export const PROMPT_FAMILY_LABEL = {
  auto: 'Automatic', keyboard: 'Keyboard', playstation: 'PlayStation', steamdeck: 'Steam Deck', xbox: 'Xbox',
  generic: 'Other controller',
};

/** What each prompted action is pressed with, per family. `talk` starts a conversation; `interact` is everything
 *  else E does (loot, doors, chests, gates, boards). */
export const PROMPT_BUTTONS = {
  keyboard: { talk: 'E', interact: 'E' },
  playstation: { talk: 'L2+Touchpad', interact: 'Touchpad' },
  steamdeck: { talk: 'R4', interact: 'R4' },
  xbox: { talk: 'LT+View', interact: 'LT+View' },
  generic: { talk: 'L2+Select', interact: 'L2+Select' },
};

/** The family a pad belongs to, from its id string (and the user agent, for the Deck). */
export function padFamily(padId = '', userAgent = '') {
  const id = String(padId || '').toLowerCase();
  const ua = String(userAgent || '').toLowerCase();
  // Xbox first: "Wireless Controller" is also the DualShock 4's own name, and an Xbox pad says it too.
  if (/045e|xbox|xinput/.test(id)) return 'xbox';
  if (/054c|dualsense|dualshock|playstation|wireless controller|ps[345]\b/.test(id)) return 'playstation';
  if (/28de|steam deck|steam virtual gamepad|valve/.test(id) || /steamos|steam deck/.test(ua)) return 'steamdeck';
  return 'generic';
}

/** The family the prompts should speak: an override if one is set, else the last-used method. */
export function promptFamily({ override = 'auto', lastInput = 'keyboard', padId = '', userAgent = '' } = {}) {
  if (override && override !== 'auto' && PROMPT_BUTTONS[override]) return override;
  if (lastInput === 'pad') return padFamily(padId, userAgent);
  return 'keyboard';
}

/** The button for an action in a family. */
export function promptButton(action, family) {
  const t = PROMPT_BUTTONS[family] || PROMPT_BUTTONS.keyboard;
  return t[action] || PROMPT_BUTTONS.keyboard[action] || 'E';
}

/** Rewrite a prompt's "Press E" (and "press E") for the family. `talk` says whether this prompt starts a
 *  conversation. Text with no such phrase comes back unchanged. */
export function adaptPromptText(text, family, { talk = false } = {}) {
  if (!text || family === 'keyboard') return text;
  const btn = promptButton(talk ? 'talk' : 'interact', family);
  return String(text).replace(/\b(Press|press) E\b/g, (_, p) => `${p} ${btn}`);
}

/** Does this prompt start a conversation? The game's own wording: "talk to", "speak with", "ask". */
export function isTalkPrompt(text) {
  return /\bPress E to (talk|speak|ask|greet|chat)\b/i.test(String(text || ''));
}

export function inputPromptFaults() {
  const out = [];
  if (adaptPromptText('Press E to talk to Yorin', 'playstation', { talk: true }) !== 'Press L2+Touchpad to talk to Yorin') out.push('PlayStation talk prompt is wrong');
  if (adaptPromptText('Press E to talk to Yorin', 'steamdeck', { talk: true }) !== 'Press R4 to talk to Yorin') out.push('Steam Deck talk prompt is wrong');
  if (adaptPromptText('Press E to open a chest', 'playstation') !== 'Press Touchpad to open a chest') out.push('PlayStation loot prompt is wrong');
  if (adaptPromptText('Press E to open a chest', 'keyboard') !== 'Press E to open a chest') out.push('keyboard prompt changed');
  if (padFamily('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)') !== 'playstation') out.push('a DualSense is not PlayStation');
  if (padFamily('Steam Virtual Gamepad (STANDARD GAMEPAD Vendor: 28de Product: 11ff)') !== 'steamdeck') out.push('Steam virtual pad is not the Deck');
  if (padFamily('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)') !== 'xbox') out.push('an Xbox pad is not Xbox');
  if (promptFamily({ override: 'steamdeck', lastInput: 'keyboard' }) !== 'steamdeck') out.push('the override is not obeyed');
  if (promptFamily({ lastInput: 'keyboard', padId: '054c' }) !== 'keyboard') out.push('a keyboard press does not say keyboard');
  return out;
}
