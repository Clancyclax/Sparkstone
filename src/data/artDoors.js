// ROUND 306 (item 9) -- WHERE EACH BUILDING SHEET DRAWS ITS DOOR.
//
// "Check that the entrance lines up with the door that is drawn." Until now the
// entrance was computed from the building's footprint edge in its facing
// direction, which is where a door WOULD be on a plain box, not where the art
// puts it. These pixels were read off the sheets by hand, from zoomed contact
// sheets with a 10px grid: [x, y] in the cell, the door's base (where it meets
// the ground), for the three columns of a turning row that show it
// (southeast = 1, south = 2, southwest = 3); the other five columns show the
// back of the building and have no door in view. A row that does not turn is one
// drawing written across all eight columns, so it has a single `door`.
//
// Rows in one model are recolours (palette swaps) of one silhouette, so a model
// lists every row it covers and they share the labels.
// ROUND 417 -- "temples" is the user's 256px south-facing strip now (src/data/templeArt.js): one frame per god in a
// single row, so the god is the COLUMN here and every door is the base of the entrance (the foot of its steps).
export const ART_DOORS = {
 "townPool": {
  "cell": 150,
  "models": [
   {
    "rows": [
     0,
     1,
     2,
     3,
     4,
     5
    ],
    "turns": true,
    "doors": {
     "1": [
      105,
      113
     ],
     "2": [
      75,
      116
     ],
     "3": [
      44,
      113
     ]
    }
   },
   {
    "rows": [
     6,
     7,
     8,
     9,
     10,
     11
    ],
    "turns": true,
    "doors": {
     "1": [
      96,
      108
     ],
     "2": [
      76,
      112
     ],
     "3": [
      56,
      107
     ]
    }
   },
   {
    "rows": [
     12,
     13,
     14,
     15,
     16
    ],
    "turns": true,
    "doors": {
     "1": [
      90,
      108
     ],
     "2": [
      76,
      108
     ],
     "3": [
      56,
      108
     ]
    }
   },
   {
    "rows": [
     17,
     18,
     19,
     20,
     21
    ],
    "turns": false,
    "door": [
     66,
     128
    ]
   },
   {
    "rows": [
     22,
     23,
     24,
     25,
     26
    ],
    "turns": false,
    "door": [
     82,
     117
    ]
   },
   {
    "rows": [
     27,
     28,
     29,
     30,
     31
    ],
    "turns": false,
    "door": [
     56,
     119
    ]
   },
   {
    "rows": [
     32,
     33,
     34,
     35,
     36
    ],
    "turns": false,
    "door": [
     52,
     121
    ]
   }
  ]
 },
 "structures": {
  "cell": 150,
  "models": [
   {
    "rows": [
     0,
     1,
     2
    ],
    "turns": true,
    "doors": {
     "1": [
      103,
      116
     ],
     "2": [
      80,
      124
     ],
     "3": [
      47,
      116
     ]
    }
   },
   {
    "rows": [
     3,
     4,
     5
    ],
    "turns": true,
    "doors": {
     "1": [
      105,
      119
     ],
     "2": [
      76,
      118
     ],
     "3": [
      45,
      119
     ]
    }
   },
   {
    "rows": [
     6,
     7,
     8
    ],
    "turns": true,
    "doors": {
     "1": [
      88,
      114
     ],
     "2": [
      90,
      115
     ],
     "3": [
      46,
      112
     ]
    }
   },
   {
    "rows": [
     9,
     10,
     11
    ],
    "turns": true,
    "doors": {
     "1": [
      100,
      107
     ],
     "2": [
      72,
      117
     ],
     "3": [
      50,
      107
     ]
    }
   },
   {
    "rows": [
     12,
     13,
     14
    ],
    "turns": true,
    "doors": {
     "1": [
      102,
      113
     ],
     "2": [
      75,
      117
     ],
     "3": [
      48,
      113
     ]
    }
   },
   {
    "rows": [
     18,
     19,
     20
    ],
    "turns": true,
    "doors": {
     "1": [
      100,
      118
     ],
     "2": [
      75,
      130
     ],
     "3": [
      50,
      118
     ]
    }
   },
   {
    "rows": [
     21,
     22,
     23
    ],
    "turns": true,
    "doors": {
     "1": [
      100,
      95
     ],
     "2": [
      78,
      104
     ],
     "3": [
      50,
      95
     ]
    }
   },
   {
    "rows": [
     24,
     25,
     26
    ],
    "turns": true,
    "doors": {
     "1": [
      102,
      117
     ],
     "2": [
      76,
      122
     ],
     "3": [
      48,
      117
     ]
    }
   },
   {
    "rows": [
     30
    ],
    "turns": true,
    "doors": {
     "1": [
      110,
      112
     ],
     "2": [
      75,
      127
     ],
     "3": [
      40,
      112
     ]
    }
   },
   {
    "rows": [
     32
    ],
    "turns": true,
    "doors": {
     "1": [
      92,
      100
     ],
     "2": [
      78,
      105
     ],
     "3": [
      67,
      100
     ]
    }
   }
  ]
 },
 "structuresXl": {
  "cell": 180,
  "models": [
   {
    "rows": [
     1,
     2,
     3,
     4,
     5
    ],
    "turns": false,
    "door": [
     68,
     150
    ]
   },
   {
    "rows": [
     6,
     7,
     8,
     9,
     10
    ],
    "turns": false,
    "door": [
     102,
     151
    ]
   },
   {
    "rows": [
     11,
     12,
     13,
     14,
     15
    ],
    "turns": true,
    "doors": {
     "1": [
      62,
      118
     ],
     "2": [
      62,
      118
     ],
     "3": [
      118,
      118
     ]
    }
   },
   {
    "rows": [
     16,
     17,
     18,
     19,
     20
    ],
    "turns": false,
    "door": [
     95,
     132
    ]
   }
  ]
 },
 "temples": {
  "cell": 256,
  "models": [
   {
    "rows": [
     0
    ],
    "turns": true,
    "doors": {
     "0": [
      128,
      233
     ],
     "1": [
      130,
      232
     ],
     "2": [
      128,
      245
     ],
     "3": [
      128,
      245
     ],
     "4": [
      128,
      236
     ],
     "5": [
      104,
      240
     ],
     "6": [
      139,
      236
     ],
     "7": [
      126,
      236
     ]
    }
   }
  ]
 },
 "townSingletons": {
  "cell": 150,
  "models": [
   {
    "rows": [
     0
    ],
    "turns": true,
    "doors": {
     "1": [
      95,
      108
     ],
     "2": [
      75,
      118
     ],
     "3": [
      55,
      108
     ]
    }
   },
   {
    "rows": [
     1
    ],
    "turns": true,
    "doors": {
     "1": [
      80,
      108
     ],
     "2": [
      59,
      107
     ],
     "3": [
      70,
      108
     ]
    }
   }
  ]
 },
 "townLarge": {
  "cell": 300,
  "models": [
   {
    "rows": [
     0
    ],
    "turns": false,
    "door": [
     160,
     258
    ]
   },
   {
    "rows": [
     1
    ],
    "turns": false,
    "door": [
     160,
     256
    ]
   },
   {
    "rows": [
     2,
     3,
     4,
     5,
     6
    ],
    "turns": false,
    "door": [
     150,
     243
    ]
   },
   {
    "rows": [
     7,
     8,
     9,
     10,
     11
    ],
    "turns": false,
    "door": [
     160,
     248
    ]
   },
   {
    "rows": [
     12,
     13,
     14,
     15,
     16
    ],
    "turns": false,
    "door": [
     150,
     262
    ]
   }
  ]
 }
};

/** [x, y] in the cell of the door shown by this frame, or null when the door
 *  is not in view (back-facing column) or the row has no recorded door. */
// ROUND 420 -- THE NEW HOUSES' DOORS, from the same manifest the sheets were packed from: one door per row (every
// column is a recolour of the same drawing), the mirrored sheet's at the mirrored pixel, and the FACE it is on --
// `facing` -- because a house that cannot turn has its door on the face it was drawn with, whatever the placer asked.
import { HOUSE420, HOUSE420_CELL, HOUSE420_SHEETS } from './houseArt420.js';
for (let s = 0; s < HOUSE420_SHEETS.length; s++) {
  for (const mirrored of [false, true]) {
    const models = [];
    for (const h of Object.values(HOUSE420)) {
      if (h.sheet !== s) continue;
      const left = (h.facing === 'southwest') !== mirrored;
      models.push({ rows: [h.row], turns: false, facing: left ? 'southwest' : 'southeast',
        door: [mirrored ? HOUSE420_CELL - 1 - h.door[0] : h.door[0], h.door[1]] });
    }
    ART_DOORS[`houses420_${s}${mirrored ? 'm' : ''}`] = { cell: HOUSE420_CELL, models };
  }
}

/** ROUND 420 -- the face a non-turning model's door is drawn on, when the sheet says (else null). */
export function artDoorFacing(texKey, row) {
  const sheet = ART_DOORS[texKey];
  if (!sheet) return null;
  for (const m of sheet.models) if (m.rows.includes(row)) return m.facing || null;
  return null;
}

export function artDoorPixel(texKey, row, col) {
  const sheet = ART_DOORS[texKey];
  if (!sheet) return null;
  for (const m of sheet.models) {
    if (!m.rows.includes(row)) continue;
    if (m.turns) return (m.doors && m.doors[col]) || null;
    return m.door || null;
  }
  return null;
}

/** Does this model show its door at all, and in which columns? */
export function artDoorColumns(texKey, row) {
  const sheet = ART_DOORS[texKey];
  if (!sheet) return null;
  for (const m of sheet.models) {
    if (!m.rows.includes(row)) continue;
    return m.turns ? Object.keys(m.doors || {}).map(Number) : [0, 1, 2, 3, 4, 5, 6, 7];
  }
  return null;
}

/** True when the model is one drawing written across every column (its door
 *  is in the same place whatever the facing, and it always faces south). */
export function artDoorFixed(texKey, row) {
  const sheet = ART_DOORS[texKey];
  if (!sheet) return false;
  for (const m of sheet.models) if (m.rows.includes(row)) return !m.turns;
  return false;
}
