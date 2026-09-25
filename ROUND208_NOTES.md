# Round 208 — a conversation, not a line

**`r208b`: 201 suites, 182 ok, 1 fail, 4,994 checks.** Only
`test_round132_world`, standing since round 200. Ties the best result since
that suite started failing.

`test_round208.cjs` is new — 30 checks, 6 sections.

---

## What was there

An NPC carried **one string**. `_openDialogue` printed it with a row of buttons
whose `act` values were resolved by a forty-branch if-else in WorldScene. Every
conversation with a choice in it — the god's offer, the farm job, the
recruitment — was a hand-wired special case, and **there was no way to ask
anyone a question.**

`data/dialogue.js` is the tree: 20 topics over your four roots, branch for
branch as you outlined them. The forty-branch chain is untouched — those are
scripted set-pieces and they still work. A topic is a **question** and renders
as a list; a scripted choice **changes the world** and still renders as a
button. Keeping those visually distinct is the point.

**The greeting keeps everything round 165 built.** The person's own line, the
era line, the absence, the Division's rumour and the aura bark still assemble in
that order — that whole assembly is now the greeting and the list opens under
it. A tree that threw them away would be a richer conversation in a poorer town.

---

## 2.4 is the rule that shaped the file

Every topic's answer is an **array**, picked by a hash of the speaker's name.
One string per topic means every farmer in Pallimustus answers identically —
that's a sign nailed to a person, not a conversation. One villager always
answers the same way (they have a view, and it doesn't change between visits);
the next answers differently.

The variants aren't paraphrases. Three people asked about the missing give three
different pieces of a thing none of them can see whole — which is how rumour
actually works, and is how **2.3.1.1** lands without anyone delivering a
briefing.

Since the prose itself can't be asserted, `dialogueFaults` asserts it
structurally: no topic may have one answer, every topic reachable from a root,
no branch loops, goodbye last in every list, the same speaker consistent, two
speakers different.

**Two things those rules caught on me:**

- Pallimustus had **seven** options once back and goodbye were added — past your
  own rule 2.3. Armour and weapons became one gear branch: the smallest change
  that keeps every topic you named where you named it, and *"what do I fight
  with"* is one question a person would ask.
- `pallimustus` gave all six sample speakers the **same** answer — three
  variants, and the hash collided. Three isn't enough spread to rely on.

---

## 208b — your three corrections

**1. The outworlder is the player.** I'd written it as gossip about a third
party who came through last month, which is a worse scene twice over: it spends
the game's most interesting fact on a stranger, and it makes the townsfolk
incurious about the person standing in front of them.

> *"You've the walk. Outworlders always look like they're expecting the ground
> to be a different height. Is it true you had carriages that went without
> horses?"*

And the second one is Prism Stubby by name — came up out of the sewers with no
essences and a great deal to say, so the rumours are funny because she is:

> *"Prism Stubby. Came up out of the drains swearing at a ladder. They say she
> was a tavern-keeper back home and honestly it shows."*

**2. The surge is two answers, and `sayBy` is the mechanism.** A single pool
averages a farmer and an adventurer into a person who is neither.

| who | what a surge is to them |
|---|---|
| farmer | *"You board the windows and you pray and you count the days."* |
| guard | *"It's when the walls stop being decoration. Last one, we lost two gates and the whole east quarter. I was twenty-three."* |
| adventurer | *"Half the silver-rankers you'll ever meet got there in a surge. That's not glory, that's arithmetic."* |

Not special to the surge — a guard and a farmer should differ on plenty — but
it's where the difference is sharpest, so it's where the mechanism earned its
keep. `sayBy` pools are held to every rule `say` is, and **a pool nothing reads
is now a fault**: a second door going unwatched is how round 206's naming bug
survived.

**3. Gear points somewhere.** Neither answer is a definition now. Each names the
three ways you actually end up holding something:

> *"Three roads. The smith, the bench, or an essence that makes it out of
> nothing. The third's the dearest to come by and the only one you can't be
> robbed of."*

All six corrections are asserted in the suite so they can't be reworded away.

---

## Still to come in this arc

- **Important / quest NPCs** — the same tree plus quest-specific topics, and the
  exposition about the Division and the surge threat (your 2.3.2).
- **Companions** — the largest trees, growing at each region and milestone;
  cities, regions, quests, each other, hopes, dreams, their essences (2.3.3).

And after the dialogue rounds: **item 4's allocation half** — making sustain,
mitigation and movement into axes a build can actually drop.
