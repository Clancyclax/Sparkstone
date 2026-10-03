# Round 301: Cadence's walls and arches, the guards, the drops and the stream

Your eleven items, in your order. Ten are done. Item 1 needs a location from you.

This is a patch (`SparkstoneWeb-r301-patch.zip`) over round 300. Run `Rebuild Sparkstone-web.sh` as usual.

## 1. The invisible object: not found, I need a place

"Something invisible here in game. See my red scribbles. Some invisible object is placed there. Please remove it."

I swept Cadence for solid tiles with no sprite, statics with no art and NPCs with no sheet, and found none that fit. The red scribbles are in the screenshot and I can't map them to a tile from the picture alone. Tell me the street or the gate (or press the debug position key there) and I'll remove it. I haven't guessed at one.

## 2-5. Walls and the entrance arch

- **Collision follows the art.** Every wall stone's collision is now fitted to its own drawn footprint instead of to the line the walls were strung along. That is the red-versus-blue offset in your screenshot: the strung stones sat off the line they were claimed on, and each course now claims the tiles under its own picture. 2,492 stones were fitted.
- **Corner seams.** Fitting every stone to its own art left a one-tile slit at the south-west and south-east corners, where two courses meet by less than half a tile. A pass now closes slits of one or two tiles between wall tiles; a doorway is five, so gates are untouched.
- **Old tests.** Rounds 187 and 188 walk the wall to check the only way out is a gate; they assumed the old collision rows, so I moved their bands to the fitted ones (one tile further out on the north and west, one in on the south and east). They pass as before.
- **The arch is solid and open.** The two pillars are solid; the doorway between them is clear. There was a fractional-tile bug in the reach (13.4 tiles) that left the claims off the grid, fixed.
- **Depth.** A long wall is now sorted as a slab, not by its anchor point: you are drawn over it when you are in front of it and under it when you are behind it, at any point along its length. The wall also fades to 55% when you are behind it. The arch no longer lets you draw over it from the far side.

## 6. The guards

They stand outside the wall now, three tiles out, one on each side of the road at each gate, facing out. They were four tiles inside and seven apart. Done for Cadence and for the grid cities.

## 7. The graphics glitch north of Cadence

I could reproduce a stepped sawtooth of dark and brown wedges across the grass there, but not every time. It comes from the tufted grass tiles: they are small blocks with a dirt edge and a shaded lower half, and where two tonal patches meet, the edge shows in places. I repainted those dirt edges and the shaded lower half as grass in the tufted frames (the two riverbank frames keep their dirt). The wedges are much weaker; the tonal patches themselves are still there, because that is how the grass avoids a checkerboard. If you still see it, tell me where you were standing.

## 8. The stream

The falls' stream stopped at the edge of its footprint. It now carries on, a meandering two-tile shallow channel, 400 tiles, to the nearest river bank. Where it meets the north road the road stays and the stream passes under it as a ford (three crossings). Nothing was built over it; trees and rocks in its path are cleared and plateaus keep off it. The minimap and the world map are redrawn with it, because both read the same terrain cache.

## 9-11. Drops and stairs

- **9. A visible edge.** The north-west and north-east edges of every raised tile, which show no face to the camera, now have a bright grass lip, a ragged earth crumble and a shadow on the ground beyond.
- **10. The south face.** The faces were ruled strata that read as planks. On grassland they are earth now: speckled, with a grass fringe along the top and tufts at the foot. Rock regions (Elehyd, Cinder) keep rock.
- **11. Stairs.** In Nek, Ontaria, Bratugal, Ixcuatl and Sirukh they are packed earth with earth risers, not grey stone. In Elehyd and Cinder they stay stone.

## Tests

Everything touching walls, gates, doorsteps, ground, elevation and the minimap was re-run against the round-300 baseline (stashed): 139, 189, 190, 19, 46, 50, 100, 79b, 79c, 240 fail the same way with and without this round, and 43's build-time bars sit at the edge on this machine either way. `tools/tests/test_round301.cjs`, 22 checks: wall tiles under their art, no fractional keys, arch pillars solid and doorways open, guards outside and flanking, wall depth in front and behind on 40 slabs, earth stairs, rims and faces present, the stream connected to the river and blue on the minimap cache.
