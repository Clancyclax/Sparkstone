# Round 131 — one plain grass tile

> "Only use 1 single plain grass tile."

Round 130 shipped the soul space with **two** ground types of sixteen variants
apiece — bright turf under the plots, meadow on the path, hashed per square. That
is what "various grass and earth tiles" bought, and it was too much: the ground
competed with the planting, which is the thing the room is actually about.

Now there is one tile, everywhere. The floor recedes and the flowers are what you
look at.

## Which tile, and why it's its own file

`variants` picks from index 0 upward, so a single plain tile cannot be selected
out of a sixteen-tile pack by counting — the plain one is **index 5** of the
meadow pack (the only one of its sixteen with no flowers, no path, no rocks and
no butterfly in it). So it is cut out into `soul_grass.png`, which is also the
honest way to say *this is the soul's ground* rather than *this is the fifth
meadow tile*.

The grid still distinguishes plots from path — `SOUL_BED` is what the planting is
sown into — but what varies across the soul is now the planting rather than the
turf.

## Two gaps the change exposed

Adding a floor type has two registrations, and I'd made neither:

1. **`INTERIOR_ART_PRESENT`** gates the loader, and without the flag it never
   asks for the file.
2. **`FLOOR_TONES`** is the placeholder path's colour table, and it is read
   *unguarded* — so a floor with no tone is a TypeError inside world build.

The round-78 note sitting right there in `FLOOR_TONES` warns about exactly this:
*"a floor with no tone would be a TypeError inside world build — a black
screen."* Round 130 added two floors and got away with it because both pointed at
region packs the region loader had already brought in, so the `exists` guard
short-circuited before the tone was ever read. A file of its own doesn't get that
cover. Both are registered now, and `TILE_FLOOR_SOULEARTH` is gone rather than
left as a dead id.

*(A scare along the way: the game appeared not to boot. It boots — this container
is loaded enough that world build takes about twenty seconds, and my probe was
waiting nine.)*

## Lanes

- `tools/run_data.sh` — **455/455**
- `tools/run_one.sh test_round127_cycle` — **44/44**

Version stamp: **131**.
