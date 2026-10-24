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
  "cell": 150,
  "models": [
   {
    "rows": [
     0
    ],
    "turns": true,
    "doors": {
     "1": [
      110,
      112
     ],
     "2": [
      75,
      118
     ],
     "3": [
      40,
      112
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
      105,
      117
     ],
     "2": [
      75,
      127
     ],
     "3": [
      45,
      117
     ]
    }
   },
   {
    "rows": [
     2
    ],
    "turns": true,
    "doors": {
     "1": [
      100,
      115
     ],
     "2": [
      72,
      127
     ],
     "3": [
      52,
      115
     ]
    }
   },
   {
    "rows": [
     3
    ],
    "turns": true,
    "doors": {
     "1": [
      105,
      118
     ],
     "2": [
      76,
      130
     ],
     "3": [
      45,
      118
     ]
    }
   },
   {
    "rows": [
     4
    ],
    "turns": true,
    "doors": {
     "1": [
      105,
      117
     ],
     "2": [
      75,
      122
     ],
     "3": [
      45,
      117
     ]
    }
   },
   {
    "rows": [
     5
    ],
    "turns": true,
    "doors": {
     "1": [
      105,
      122
     ],
     "2": [
      75,
      128
     ],
     "3": [
      52,
      122
     ]
    }
   },
   {
    "rows": [
     6
    ],
    "turns": true,
    "doors": {
     "1": [
      110,
      118
     ],
     "2": [
      75,
      129
     ],
     "3": [
      40,
      118
     ]
    }
   },
   {
    "rows": [
     7
    ],
    "turns": true,
    "doors": {
     "1": [
      110,
      118
     ],
     "2": [
      75,
      128
     ],
     "3": [
      40,
      118
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
