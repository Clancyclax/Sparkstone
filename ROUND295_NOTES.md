# Round 295: a new kit, and 5.9 (the petition)

> Held on a branch at your request ("Kits first, hold 5.9") and merged in round 299. Where this file says round 296 for 5.10, read "the round after 299".

Your answers are recorded in `OPEN_TASKS.md` §000000. This round builds 5.9 in full. 5.10, the takeover, is next round, on the same pieces.

## The kit

`Sparkstone_Kit_Review_seed178319127.pdf`:

- **Essences:** Discord, Life and Crocodile.
- **Confluence:** Discordant.
- **Abilities:** 20.
- **Gear:** five pieces, from Uncommon up to Legendary.

## 5.9: how it plays

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

**If the surge breaks first,** the petition closes for good. Round 296 starts there.

## Tests

`test_round295.cjs` has 26 checks, and all pass:

- The tables, and the house tells on all 76 new lines.
- Pages offered, taken, reported and held in order.
- The witness choice: the crew's way counts as a civilian death, the clean way doesn't.
- Every refusal reason in the gate.
- Prism's notes both ways.
- The parley, the adjudicator's walk-in, and all three pardon outcomes.
- Reinstatement, Prism's return, the regulars' return, and the end of her hunt.
- The Act 4 letter.
- The surge closing the petition.

## Next: 5.10, the takeover (round 296)

Built on the same record:

- If dirty hands, or a missed petition, closed the petition, the Deacon offers to buy the record for the dark gods. Selling it starts the takeover.
- Each surge city gets a raid chain. A raided city falls to the crews at the end of the surge, and its cast changes to crew members.
- Prism holds the last city you go for. That fight is at full strength, with no smoke bomb.
