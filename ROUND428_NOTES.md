# Round 428: The Divine Secrets, and fixes

## 1. The divine secrets

Each god now has a secret: one specific act, pushed to an extreme, that no player would do by accident. The rules and the words are in `src/data/divineSecrets428.js`. The scene side is `src/scenes/divineSecretsMixin.js`.

- **The minor favour** is a nature gift evolution. The god's words come with the gift's own announcement.
- **The major favour** is the god in person, offering its divine essence for your confluence slot. You can:
  - **Accept.** The essence goes into your bag. Bond it from there.
  - **Not yet.** The god asks again in 15 minutes.
  - **Refuse.**
- **Breaking a secret is silent.** Nothing tells you, because a secret is a secret.

| God | The act | Minor | Major |
|---|---|---|---|
| Avarice | Never use or give an item on anyone else: no gear, stones, essences or draughts for a companion | Bronze | Gold |
| Knowledge | In a city, hear out 95% of its people until they have nothing left to tell you | 1 city | 4 cities |
| Death | Never loot a body | Bronze | Gold |
| Healing | Never land a killing blow yourself | Bronze | Gold |
| Heroes | Never recruit a companion | Bronze | Gold |
| Purity | Never take a potion, food or drink | Bronze | Gold |
| The Veiled Hand | Bandit crew-board jobs done unseen while a Society member in good standing | 10 jobs | 50 jobs |
| Destruction | Raze a settlement | a hamlet, village or town | a walled city |
| Liberty | Empty the gaols | every gaol in one region at once | every gaol in the world at once |
| Dominion | Become a king | take a bandit city's chair | be crowned in a fallen capital you resettled |
| War | Answer every challenge | 10 answered | 40 answered |
| The Unburied | Round 427's hundred deaths and the mark | (as built) | (as built) |

**Small print:**
- **Healing.** Kills by summons, familiars and companions are theirs, not yours. Your own swings, spells and auras are yours, and so is a person you strike down.
- **Death.** Your own softcore death bag is not a body.
- **Purity.** A firebrand is thrown, not taken, so it doesn't count. Neither does the Soul-Imprinting Triune.
- **Knowledge.** It counts the six cities whose people talk: Cadence, Harrowmoor, Tolbrand Quay, Karsk Landing, Vashra and Slagward.
  - **Who counts:** named people standing in the city who hold a conversation. Shop counters, gods, priests, guards, companions and survivors don't count. Cadence has 20 such people, Vashra 39, and Tolbrand Quay and Slagward 9 each.
  - **"Heard out"** means every topic they have ever offered you has been asked. Opening a topic offers what is under it.
- **The record starts with the character.**
  - A save from before this round starts its record at the rank it already holds.
  - A rank favour needs a record that began below that rank. Clancy is Iron, so he can still earn the Bronze favours.
  - A save that already walks with companions starts with Heroes' secret broken.
- **One god in the confluence slot.** Once you are bonded, or blessed by the Unburied, every later god says so and offers nothing.
- **Three new divine essences:** Divine Destruction, Divine Veil (the Veiled Hand) and Divine Avarice.
  - They live beside the eight temple gods, not among them. Everything that walks the eight temple gods still walks eight.
  - A bond to one of them survives a load.
- **One hint per secret**, planted as a line in one city's crowd. For example, a Karsk Landing scholar says: "The God of Knowledge is said to notice anyone who hears out an entire city."

**War.** You hadn't chosen between "start a war" and "answer every challenge". I built "answer every challenge", as I said I would. Say if you want the other.

## 2. What the secrets needed that the game didn't have

### Challengers (War)
- **When they come.** From Iron rank, out of doors, every 12 to 20 minutes, a fighter of your own rank walks up and calls you out.
- **Answer.** It is a duel to the yield, and neither of you dies. It counts the moment you answer, however the duel goes.
- **What breaks the secret:**
  - refusing;
  - closing the page without an answer;
  - walking more than 22 tiles away before they reach you, or going indoors;
  - running from the duel.

### Razing (Destruction)
- **The Firebrand.** Bandit-city fences sell them, 5 for 300. Use one and it is thrown at the nearest building within 3 tiles, setting it alight.
- **Fire spreads.**
  - A building burns for 40 seconds.
  - From its 12th second, each second, it has a one-in-five chance to catch a building within 24 tiles in the same settlement. A hamlet's houses stand about 21 tiles apart.
  - Walls, fences, ponds and temples don't burn.
- **The settlement falls** at 60% burned.
  - Its people die where they stood, and the rubble and bodies go down.
  - This uses the surge's fallen-city machinery (`_applyFallen`, `_scatterRemains`), now scoped to one settlement.
- **It is a crime.** If anyone sees you set the fire, the watch is called and the warrant is lethal.
- **It survives a save and load.** What burned stays ash and the fallen stay gone.

### The gaols (Liberty)
- **Where they are.** Every city and town with a watch (seven of them) has a gaol: a house near the centre, marked GAOL.
- **The door is locked.** Use it to see who is inside, and break the lock to free them.
  - Each gaol holds 2 to 5 prisoners.
  - If you are seen freeing them, you are wanted for "freeing prisoners".
- **Refilling.** An emptied gaol fills again three days later, with 1 to 4 new prisoners. "Every cell" therefore means every cell at once.
- **What isn't counted.** A gaol in a razed settlement, or in a region the surge took, holds nobody.

### Thrones (Dominion)
- **A bandit captain's chair.** The captain will hear a challenge for the chair, to the death. The crew stand back.
  - Kill the captain and the city is yours instead of cleared: the crew stay, call you boss, and won't turn on you.
  - The Society no longer posts its clearance there.
- **A fallen capital.** In a region the surge took, the survivors will follow you home.
  - "Take back Harrowmoor" is a quest: kill 40 of what lives in the ruin. Any hand counts, so a Healing player's companions can do it.
  - Report back and the city is resettled. The survivors stand in its square, and the region's monsters go back to normal.
  - Then they crown you.

### The Veiled Hand: crew jobs done unseen
A bandit job used to make you an outlaw the moment it was done. Now it does only if you are **seen**: by anyone within 9 tiles other than the mark, or any guard within 14.
- **Unseen:** the job is done with no outlaw mark and no strike-off. If you are a member in good standing, it counts for the Veiled Hand.
- **Seen:** it is what it always was, and the Veiled Hand's secret is broken.
- **The board's notices** now say "Seen doing it, you are an outlaw here."

### A fault found on the way
**A divine essence in the bag had no row.** It isn't in the essence catalogue, so it was drawn as "Unknown essence" with no button, and a god's gift (the old 5% offer included) could never be bonded. It now has a **Bond** row.

## 3. Fixes from your reports this round
- **Wind Blade, upgraded:** the card no longer describes its Silver ring at Iron.
- **Layering:** an object standing in front of a house is drawn in front of it. The test now also compares the object's feet against the house art's lowest pixels in that column.
- **Walls, the top corner:** the right wall's bottom-left pixel and the left wall's bottom-right pixel sit on the corner tower's lowest pixel. I measured 0 px error on all 14 top corners. The other three corners are untouched, waiting for your next step.
- **BT2 Battlemage, whip:** the broken run rows (SW with the whip in the right hand, and so SE in the left) now draw the opposite direction's row, mirrored.
- **Auras:** on level ground the ring lies under everything. On raised ground it is cut into horizontal bands, each layered with the row of ground it lies on.
- **The Duskfang that took no damage** was a creature answering Clancy's wild bond (Cloud Billow), under truce.
  - Familiars, summons and auras no longer strike it. Your own blow turns it, as before.
  - It is labelled "answering your call" over its head, and the target frame has a "Called" row.
- **Snowmane** (Obsidian, Cub and Yearling) charge in now, instead of circling at a distance.
- **Hobbit houses** are out of the cities. Cadence's outer districts were being classed as rural.
- **L1/R1:** the hand slots show only the input you last used: the shoulder button on a pad, the mouse button on a keyboard.
- **Quests** are cut off 2 px above the ability bar.
- **Destruction is Destruction.**
  - The sprite in Olb's astral camp is named Destruction.
  - Every line the old "Voice" spoke is now his own, as himself.
  - Every "the Voice", "your god" and "your master" is gone.
  - The cult is the Ashen Covenant; Ilsa is its Ash-bearer.
- **Dialogue: left and right.** Choices side by side on one line (Take: The Iron Standard | Ask about an adventurer) are walked left and right, on a pad and on the keyboard. Up and down move between lines and the topic list.

## Not done / known gaps
- **The other three wall corners** are waiting for your next step.
- **The Unburied's blessing and a ritual socket.** It still keeps a socket whose ritual being is out, as round 410 ruled. Say if it should re-roll that socket too.
- **Old saves.** Their records start now (section 1). Nothing earlier was recorded.
- **Art.** The fire is drawn with flickering shapes, not a sheet. The Firebrand icon was drawn this round. Freed prisoners use the common townsfolk art.
- **A claimed bandit city keeps its fences and prices.** Nothing yet pays you as its king.
