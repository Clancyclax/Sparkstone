// ============================================================================
// ROUND 305 -- THE VOICED LINES THAT USED TO LIVE INSIDE WorldScene.js.
//
// Knowledge's "thin place" speech and the crew's rest and rejoin lines were
// string literals in the scene, so nothing outside the scene could read them --
// and the check that catches a line edited after it was voiced (tools/voice/
// voice_check.mjs) reads data files. Moved here unchanged, word for word, and
// the scene reads them from here.
// ============================================================================

/** What somebody says on being sent home. In their own voice, because a system
 *  message here would make the team read as inventory. */
export const CREW_REST_LINES = {
  zeke: "Aye. I will put something on for when you are back. Do not make it late.",
  encykla: "Good. I have three books open and one of them is about you.",
  aedia: "You are going alone. Fine. Come back with something interesting on you.",
  benjamin: "I will be at the door. If you come back bleeding I will hear about it.",
  prism: "Right you are. I will be in my crate if the world ends.",
};

/** ...and on being called back. */
export const CREW_JOIN_LINES = {
  zeke: "About time. Stand still, you have been letting something go septic.",
  encykla: "I marked my page an hour ago. I knew.",
  aedia: "Yes. Yes. Go, go.",
  benjamin: "Front or back?",
  prism: "Oh good, I was running out of things to take apart.",
};

/** Knowledge, the first time the player feels an astral portal. */
export const THIN_PLACE_LINE = 'Stop.\n\nThere is a place here that is not here. You would not have felt it before; '
  + 'you can feel it now, which tells you something about yourself as well as about the ground.\n\n'
  + 'It goes somewhere. I am not going to tell you where.';
