# Round 299: 5.9, the petition, is in the game

Your instruction in round 295: "Kits first, hold 5.9." The kit work (rounds 296 to 298) is delivered, so 5.9 is now merged, as the notes for 297 said it would be. Your message this round: "Lets continue".

- **What changed in the merge:** nothing in 5.9 itself. It was built and tested in round 295 and kept on a branch. Two lines in the main scene file clashed with round 296's attack roles and both were kept.
- **The fusion authoring run is still going** alongside this. Its figures are in `FUSION_PROGRESS.md`.
- **This is a patch** (`SparkstoneWeb-r299-patch.zip`) over the round-298 parts already on your Desktop. Run `Rebuild Sparkstone-web.sh` as usual.

## How it plays

### 1. The record (O3)

An outlaw who talks to a bandit city's captain is offered that city's pages, one at a time and in order. Each page is a normal contract. It's reported to the captain in person, not at a board.

| City | Page | Companion | Contract |
|---|---|---|---|
| Gallowsreach (Nek) | The Department's Carts: a waybill signed by Director Vesk | Lucy's hijack | hunt |
| Gallowsreach | What Was in the Crate: Jole reads the aura of one of the Thirty-Two | Jole | gather |
| Tollmarket (Ontaria) | Slice's Contract: the second dock ledger | Slice | case → **choice** |
| Tollmarket | Sold Twice: the carter's account and her Division scrip | Ariani | hunt → **choice** |
| Shareholt (Sirukh) | The Quay's Other Book: the Tolbrand debt book | – | supply |
| Cinderwatch (Elehyd) | The Ashcart Drivers: the convoy schedule | – | den |
| Cinderwatch | The Last Run: a waybill to "the West Base" | – | hunt |

- **Five pages are needed.** Acts 1 and 2 give four, so the fifth means going on to Sirukh or Elehyd.
- **The two choices:**
  - The clean way lets the witness live: the clerk goes south, and the carter goes free.
  - The crew's way kills them, and each death counts as a civilian death.
  - The limit is one, so taking the crew's way twice closes the petition.

### 2. Prism's notes (O2)

After every fight she walks away from, she leaves a note. There are five, and each is written two ways:

- **Clean hands:** she is trying to understand you. "I asked the Society what you actually did. The answer was much shorter than the poster."
- **Dirty hands:** she is building a case. "The Society asked me whether you can be brought in alive. I said yes. I'm less sure than I sounded."

Her fourth clean note tells the player what the petition needs: Silver, something the Society can use, and clean hands.

### 3. The meeting

**When it can happen:** the player is an outlaw, Silver or above, the surge hasn't started, there is at most one civilian death, the record has 5 pages, and the petition hasn't already been made. All of these are checked in one place, `petitionOpen`.

1. Once all of that is true, Prism's next visit comes within 30 seconds and is a **parley, not a fight**. Hits don't land on her, and she says she has brought someone.
2. **Adjudicator Hesper Lane** walks up the road to you. She is the woman in Society grey you meet later at Slagward, now with a name. If you walk 45 tiles away, the meeting is off until Prism's next visit.
3. You hand over the record. She reads the page titles back and states your record: either nobody died by your hand, or one death she will overlook once, on Prism's word.
4. **Each outlaw companion in your party answers for themselves**, depending on how their arc went:
   - **Redeemed:** pardoned. Lucy says, "I'd rather hit the ones who hit back, and you lot pay for that."
   - **Hardened:** refuses and walks back to their bandit city. Jole says, "Reinstatement is a debt with better manners. I'll pass."
   - **Unsure:** Lane asks whether you will answer for them. If you vouch, they are pardoned. If you say nothing, they leave.
5. **The verdict:**
   - Your outlaw status is cleared in every region, and you are back in the Society. Hunters stand down.
   - Pardoned companions stay with you as lawful members, and the regular companions will join you again.
   - Prism signs as witness and rejoins your party.
6. **Act 4:** when it opens, a letter from Lane sends you to Vashra as the Society's witness.

**If the surge breaks first,** the petition closes for good. 5.10 starts there.

## Tests

- **`test_round295.cjs`, the 5.9 suite: 26 of 26 pass** on the merged code. It covers the tables, the pages in order, the witness choice, every refusal reason, Prism's notes both ways, the parley, all three pardon outcomes, reinstatement, the Act 4 letter and the surge closing the petition.
- **Regression on the merged code, all pass:** 298 (15), 297 (21), 296 (22), 293, 291, 277, 276, 275, 274, 273, 179 acts, 178 folk, 175 report, 169 fallen, 168 muster and 76f.
  - 298's new check caught the three new 5.9 files missing from the list the start-up guard refetches. The list is rebuilt when the patch is packed, and the check passes on the packed code.
- **Two older suites were failing, and are fixed. The game was right; the suites were stale.**
  - `test_round181_slagward` (5 of 9 failed: "walking into Slagward starts the surge") and `test_round177_lava` (1 of 23 failed: "standing in it burns").
  - They failed the same way on the code before the merge, so 5.9 did not cause it.
  - **Cause:** both suites closed the opening screens once, 1.5 seconds in. Since round 265, New Game shows the keeper for 2.6 seconds before the character creator exists. So the creator opened afterwards and sat over a paused world, and lava and the surge trigger don't run under an open panel.
  - **Fix:** both suites now use the start-up helper that waits until every opening screen is shut. Slagward passes 9 of 9 and lava 23 of 23. Lava burns and the surge starts on walking into Slagward.

## Next

- 5.10, the takeover: the Deacon buys the record, raid chains for the four surge cities, raided cities fall to the crews, and Prism holds the last one.
