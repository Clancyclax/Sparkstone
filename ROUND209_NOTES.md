# Round 209 — the game explaining itself

**`r209a`: 201 suites, 180 ok, 3 fail, 4,993 checks.**

- `test_round132_world` — standing since round 200.
- `test_round23` — the guard-targeting flake; its own comments name the cause.
- `test_round44` — on the known runner-flake list since round 204.

Both flakes pass here (round 44 twice, round 23 clean). Nothing this round
touches guards or that suite's subject.

`test_round209.cjs` (renamed from 208's) — **36 checks, 7 sections.**

---

## The same options, plus

`IMPORTANT_ROOTS` is the standard four **plus** a story branch — appended, not
substituted, because an important person is a person first and should still
have an opinion about the weather.

That's six options with the goodbye, one past your 2.3 ceiling. Taken
deliberately: *"the same options plus"* can't be done inside five, and the
ceiling was written in 2.3.1 about ordinary townsfolk. The faults now assert
the ordinary root stays at **five** and the important one at **exactly one
more**, so the exception can't spread.

---

## `sayByAct` is the point of the branch

The same question in act 1 and act 4 must not get the same answer. By act 4 the
player has been inside a Division building — a townsperson saying *"nobody
really knows"* would be the world pretending not to have happened.

**Who are the people nobody will name?**

> **Act 1** — "I won't say the name. Not because I'm frightened — because the
> last man who said it loudly got a very polite visit and has been agreeable
> ever since."
>
> **Act 2** — "The Division. There, I've said it. Essence research with a
> charter and a seal, and whatever they're researching, it isn't in the
> charter."
>
> **Act 3** — "You've seen one of their places by now, haven't you. Then you
> know it isn't research. Research writes things down so someone else can
> repeat them. They write things down so nobody can."
>
> **Act 4** — "They're not hiding any more, which is worse. A thing that hides
> knows it's doing wrong. This one's stopped bothering."

Keyed on the **act**, not the stage id — thirty-three stages would be
thirty-three pools nobody could keep consistent, and the act is the unit the
player actually feels.

**The general pools stay vague on purpose.** Ordinary people don't know what the
Division is. They know the shape of the hole it leaves.

---

## How the scripted pages join in

Each important person already has a handler that builds a page out of the
story's state — `_talkToDivisionStaff`, `_talkToHouseHead`, `_talkToHerald` —
and that writing is the best in the game about what's happening right now. None
of it is touched.

`_talkToImportant` splits on one question: **does this page ask for a
decision?**

- **No buttons** → the page becomes the greeting and the topics open beneath it.
- **Buttons** → the player is being asked to accept the warrant or put the
  motion. A topic list under a decision invites them to wander off mid-sentence.
  The buttons win; the topics wait for next time.

---

## A latent bug from round 208, found by needing it

`_talkCtx` set:

```js
act: this._actIndex ? this._actIndex() : 0,
```

**There is no `_actIndex` on this scene.** It answered `0` for the whole game.
Nothing read it yet, which is the only reason it went unnoticed — a ctx field
that always returns the same value is the quietest kind of broken, and it would
have silently pinned every act-gated line to act 1 the moment this round used
it.

`_storyAct()` derives it from the Division stage the same way
`_milestonesReached` does, so the two can't disagree about which act it is.

---

## Left in the arc

**Companions** (2.3.3) — the largest trees, growing at each region and
milestone: cities, regions, quests, each other, hopes, dreams, their essences.

Then **item 4's allocation half** — making sustain, mitigation and movement into
axes a build can actually drop.
