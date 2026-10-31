// ROUND 417 -- the user's 256x256 south-facing temples (written by tools/temples_r417/pack_temples_256.py).
// One frame per god, GODS order; `foot` is the art's anchor_bottom_centre (the placement foot point), `door` the
// entrance's base. Drawn south-facing only, at TEMPLE_ART_K of the old 150-cell scale, so a temple stands the same
// size it did (the new art has about twice the pixels).
export const TEMPLE_ART = { key: 'temples', file: 'temples_256.png', cell: 256, facing: 'south' };
export const TEMPLE_ART_K = 136 / 256;
export const TEMPLE_ART_GODS = {
 "death": {
  "frame": 0,
  "foot": [
   128,
   238
  ],
  "bbox": [
   26,
   2,
   230,
   238
  ],
  "door": [
   128,
   233
  ],
  "replaces": "4cd4815f-1ce7-4a22-96c3-60564aba988f"
 },
 "dominion": {
  "frame": 1,
  "foot": [
   124,
   245
  ],
  "bbox": [
   23,
   3,
   225,
   245
  ],
  "door": [
   130,
   232
  ],
  "replaces": "3d7c9e9e-5809-4915-9bf7-8b04a6bc653c"
 },
 "healing": {
  "frame": 2,
  "foot": [
   128,
   249
  ],
  "bbox": [
   16,
   7,
   239,
   249
  ],
  "door": [
   128,
   245
  ],
  "replaces": "f3672149-025f-4198-a547-7fbebfe8b45c"
 },
 "heros": {
  "frame": 3,
  "foot": [
   128,
   248
  ],
  "bbox": [
   7,
   2,
   249,
   248
  ],
  "door": [
   128,
   245
  ],
  "replaces": "b0e97c21-7c97-47e1-8662-9d531636e16b"
 },
 "knowledge": {
  "frame": 4,
  "foot": [
   128,
   242
  ],
  "bbox": [
   23,
   17,
   233,
   242
  ],
  "door": [
   128,
   236
  ],
  "replaces": "beeb8c85-6edc-41a3-aef3-1958891062f2"
 },
 "liberty": {
  "frame": 5,
  "foot": [
   128,
   248
  ],
  "bbox": [
   21,
   3,
   235,
   248
  ],
  "door": [
   104,
   240
  ],
  "replaces": "7301afef-d97b-422f-837e-d0a771b43f4a"
 },
 "purity": {
  "frame": 6,
  "foot": [
   142,
   238
  ],
  "bbox": [
   64,
   18,
   219,
   238
  ],
  "door": [
   139,
   236
  ],
  "replaces": "e1d68b00-7379-4ff4-81e0-7141a04c6ca1"
 },
 "war": {
  "frame": 7,
  "foot": [
   128,
   238
  ],
  "bbox": [
   17,
   10,
   239,
   238
  ],
  "door": [
   126,
   236
  ],
  "replaces": "0e0279b3-964e-44ac-8060-f661d754b4f5"
 }
};
export const TEMPLE_ART_ORDER = ["death", "dominion", "healing", "heros", "knowledge", "liberty", "purity", "war"];
