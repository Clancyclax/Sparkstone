# Round 300: the outlaw cast has faces, and the dark church is a shack

Your message this round: "Character uploads for the outlaw storyline." and "Also for some reason after the new game screen it opened straight to the world map." You answered that the second one was the inventory's Map tab, and gave the church brief: 'Use an shack model for a "dark" church. The gods take turns showing up each with their own agendas and rewards. They only appear to outlaws and if a hero enters the shack while it's still a temple room they merely get an eerie feeling and it's labeled "mysterious room".'

- **This is a patch** (`SparkstoneWeb-r300-patch.zip`) over the round-299 parts already on your Desktop. Run `Rebuild Sparkstone-web.sh` as usual.
- **The fusion authoring run is untouched.** Its handoff to the cloud credit is as delivered last round.

## 1. The eight characters

Lucy, Jole, Ariani and Slice (the outlaw companions) and Undeath, Destruction, Deception and Avarice (the dark gods) are extracted from your PixelLab zips by `extract_round300_outlaw.py` into `public/assets/char_<name>_<state>.png` and `src/data/outlawCharManifest.js`.

- **Companions** have idle, walk and attack. They use their own models now; the stand-in art the outlaw party baked in round 291 stays only as a fallback if a sheet is ever missing.
- **Gods** have idle and walk. Only idle is used so far, as they stand at the altar.
- **Ariani's zip had two south-facing takes.** I used the first and the choice is written in the extractor's notes. Say if you'd rather the other.
- Frame counts differ by character (Deception and Avarice walk with 17 frames, Jole and Slice with 8). Each sheet records its own.

## 2. The dark church

- **It is a shack.** In all seven bandit cities the church building is redrawn as one of the pack's three shacks, its collider re-fitted to the new art and its door brought in to match.
- **A hero** who goes in finds a room labelled "Mysterious room", two empty niches, nobody in it, and a floating line: "Something here is watching you. You should not stay." Nothing names the gods.
- **An outlaw** finds "A hidden church" as before: the Deacon, who still takes pledges and offerings, and now the god whose turn it is.
- **The gods take turns.** One god keeps a city's church for a whole in-game day, in the order Undeath, Deception, Avarice, Destruction. Each city starts at a different point, so two cities are seldom holding the same god on the same day.
- **Each god asks one thing and pays one way.** One promise at a time; the god at the altar tells you how far along you are.

| God | Asks | Pays |
|---|---|---|
| Undeath (The Unburied) | eight kills | coin by region tier, plus Lifedrain 8% for 15 minutes |
| Destruction (The Ashen Mouth) | three chests opened | coin, plus Cooldown rate +15% for 15 minutes |
| Deception (The Veiled Hand) | two crew jobs done | coin, plus Dodge +10% for 15 minutes |
| Avarice | a tribute (100 to 1,600 by tier) | the tribute back at 150% after a night |

- Coin is 60, 140, 300, 560 or 1,000 by the region's den tier. The god you are pledged to pays a quarter more.
- Progress is read from what you already do (kills, chests opened, crew jobs), counted from the moment you make the promise.
- The room is shared by every house, so the Deacon and the god are now removed when you leave. That also fixes a possible Deacon in the next house along.

## 3. The new-game Map tab

I could not make it happen on a fresh start, so this is a guard and not a confirmed fix. The inventory (and with it the Map tab) could be opened by the I key, or by Start on a pad, while the title or the Keeper was up, and the tab it opened on is whatever the last run left. Now:

- The inventory will not open over the title, the Keeper, the opening or the team-name prompt.
- A new run closes the inventory and puts it back on the Character page, both when you press New Game and when the Keeper hands you over.

If it happens again, tell me whether you pressed I or Start, or clicked, just before it appeared.

## Tests

`tools/tests/test_round300.cjs`: 37 checks (rotation, rewards, art, shack churches, hero and outlaw entry, each agenda, new-game guard). Suites 256, 267, 273, 275, 291, 293 and 295 re-run clean (273 now sets the outlaw state before it enters the church).
