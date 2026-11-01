# Round 425 — crime, familiar bodies, summon review

## 1. The crime system

The rules are in `src/data/crime.js`; the world side is in `src/scenes/crimeMixin.js`.

### Locked houses
- Houses and estates are locked from 22:00 to 06:00, while their people sleep.
- At a locked door you can:
  - **pick the lock**, if you have the lockpicking book. It is quiet but can fail, and a failed pick may wake someone;
  - **force the door**, at iron rank and above. It is loud;
  - leave.
- A guard or someone still out in the street who sees or hears you calls the watch on the spot.
- Inside, the noise may wake the sleepers. Forcing wakes most of them; a picked lock rarely does.
- A door you have opened stays open to you for the rest of that night.
- Your own house and empty houses for sale or rent are never locked.

### Residents
- Someone awake when you come in at night says "What are you doing in my house?!".
- If you are still there six seconds later, they shout for the watch.

### Owned objects
You can take the small things set out on tables, shelves and sills, as you asked: books, scrolls, key rings, padlocks, pocket watches, compasses, spectacles, cups, tankards, tools, sewing boxes, cards, pipes and the like.
- Walk up and press E. You are asked "This is an owned object, would you like to steal it?", with a "Don't show this message again" box. A pad answers it too.
- Each object becomes a **good** in a new bag with its own name and worth. There are 57 goods, and the ones with a table piece use its picture as their icon.
- Candles and lanterns stay where they are. Coin piles go into your purse.
- **Nightstands, chests and sideboards** hold more of the same:
  - a drawer holds rings, a locket, keys, letters, spectacles or a watch;
  - a chest holds tools, cutlery, books or a keepsake box.
  - The jewel, coin and gem cases are locked. With the book you open them quietly; without it you prise them open, loudly.
- In ordinary houses it is mostly household things. A piece of gear turns up about one search in twelve, and an awakening stone about one in forty.
- A searched container, or a taken object, comes back after three days.

### Stolen goods
- They are listed **in red** in the bag and in the sell list, with how many of a stack are stolen.
- Honest shops refuse them, and the shopkeeper points you to the dives.
- **The fence** buys stolen goods at half price: Sallow Pim in each slum dive, and Cadence's hooded trader behind the tavern. Both also sell *Picks and Tumblers*, the lockpicking book. No honest shelf carries it.

### Who calls the guards
- **A good name.** A known adventurer (two Society stars at iron, or bronze and up) with no notoriety in the region is told "take whatever you need, friend". What they take is not marked stolen.
- **Fear.** With high infamy, or when you are a full rank above the region (for example Silver in the Nek), people are too frightened to report you. It still adds a little notoriety.
- **Everyone else** calls the watch:
  - A fine is set; it rises with the region's rank and with what was taken.
  - In a **city or town**, two of the watch come to arrest you. Walled cities' gate guards join in.
  - Guards who catch you **arrest, not strike**: pay the fine, go to the cells, or resist. Resisting raises the fine and makes it a fight.
  - Paying or going to the cells hands back everything stolen.
- A **village or hamlet** has no watch; they just remember you (notoriety).
- An ordinary warrant lapses after seven days. One for resisting arrest or breaking out of the gaol does not lapse.

### The gaol
- One cell block, named for the city on the way in (for example "Cadence Gaol"), with a cot, a bucket, and the gaoler at his desk.
- You get out by **paying the fine** or **serving your hours**: 4 to 48, one per 300 coin of fine, and the clock moves on.
- With the lockpicking book you can try to **slip out**. If it works you are wanted again, for breaking out; if you are caught at it, four more hours.
- The cell's generic astral "step back through" exit is switched off.

### Estates (the walled grounds of the noble houses)
- Their containers hold the valuable things: essences, awakening stones, weapons a rank above the region, rings and amulets, and gear.
- Their rooms get round 422's tabletop things too, such as a watch on the nightstand or a goblet on the sideboard.
- Being seen inside raises the house:
  - A **house guard** comes through the room's way in after two seconds and strikes hard. Estates kill rather than jail.
  - Once you are out, **three retainers a rank above the region** come after you. This is the "adventurers instead of guards" you asked for.
- Dying settles it: the warrant and the pursuit end.

### Stealth
- An active veil, the Cloak of Night and the hidden nature all cut the chance of waking a sleeper or of being noticed. A veiled thief is seen one time in five.

### Saved
- Everything is kept on `player.crime`: what is stolen, notoriety by region, the warrants, searched containers, forced doors, the don't-ask box and the gaol term.
- The new bag of goods is saved too.

## 2. Familiars (your item 4)
- **The fix.** A ritual being now takes its first body from its stone when the stone is a creature:
  - **Pangolin** gives a **Scalecurl**;
  - **Fox** gives the **Sandy Hound**, a sunlit Shiverfox, as you agreed;
  - other creature stones give their own creature, named for the element (for example "Cinder Gnawling").
- **Clancy's beings.** Beings already bonded are switched once, on load. Clancy's Fire Kindle is now a Scalecurl and Fire Flare the Sandy Hound; checked in-game.
- **The Grit Devil Cur.** The creature in your image is in the game as the **Grit Devil Cur** (round 394 art). It is used only as the Vortex confluence's summon body.

## 3. Summon review (your item 4.1)
These creature essences, and their stones, now call a creature of their own. Before, they borrowed a stand-in from their family:

| Essence | Now calls |
|---|---|
| Chicken | Bonepecker |
| Duck | Glasswader |
| Mouse | Gnawling |
| Shark | Sharkcrab |
| Skunk | Smokecur |
| Sloth | Demonsloth |
| Turtle | Shellborn |
| Monkey | Six-arm Ape |
| Eye | Monocul |
| Thread | Stringless |
| Song and Echo | Hollowchoir |
| Wood | Totemstalk |
| Technology | Clockcrawler |

## 4. Hives
The three Ontaria monsters without art in round 424 were large sheets still loading. A hive's monster art now starts loading when you come within 16 tiles of its entrance.

## Not done / known gaps
- **Lockpicking.** It opens house and estate doors at night, locked strongboxes and the cell. No other locked barriers or locked chests exist in the game yet; when they do, the book is the key.
- **Estate guards.** The house guard indoors is not something you can fight down; you get out or you die. The retainers outside can be fought.
- **The watch outside cities.** Towns without walls have no posted guards, only the two who come. Villages have no watch at all, by design.
- **Next.** The two game modes (permadeath and softcore, with the death priests) are next.

## Pre-flight (checked before delivery)
- **Build scripts.** `Build Sparkstone-web.sh` and `deploy.sh` were re-read from the Desktop and are unchanged. The forbidden names are still assets_raw, pack_playable_bundle.py and MIGRATION_PLAN.md, and none of them is in this patch.
- **Patch.** It holds `src/` and `index.html`, the same repo-relative layout as round 424, plus these notes. GAME_VERSION is 425, read from the zipped `version.js`, and every line of `unzip -l` was read.
- **Code and modules.** Every changed script passes a syntax check. `src/modules.json` names `crime.js` and `crimeMixin.js`, and every listed module exists.
- **Art.** No new art files were needed. The goods use the existing `props_small.png`, so there are no missing sprites.
- **In-game runs, with no page errors:**
  - a locked door, forcing it and the residents waking;
  - taking an object, with the question and the red tag;
  - the watch, the arrest, the fine, the gaol, serving time and release;
  - picking an estate's lock and its guard;
  - the fence;
  - Clancy's save, which calls the Scalecurl and the Sandy Hound;
  - a hive's load.
- **Tests.** The round-425 test passes, 46 of 46. All 152 old test files were run on this round and on round 424:
  - test_round349 and test_round404 had regexes that pinned the exact end of a list this round extended. Both are fixed and pass.
  - test_round68, test_round71 and test_round74 restart the whole scene inside headless Chromium, and they are flaky there on round 424 too (shader faults and crashed tabs). On a rerun round 424's tab crashed in test_round68, and this round's test_round74 matched round 424. That is the headless browser, not the game.
- **Your build was not run from here.**
