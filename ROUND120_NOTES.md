# Round 120 — weapon essences

Version stamps `120`.

---

## 1) "Still seeing too many spells generated on weapon essences"

Measured before touching anything, over 1,300 abilities generated on a weapon
essence's **own slot**:

```
147 of 1300 required the weapon  --  11.3%
Spear itself                     --  9%
```

So the report is exact. A Spear essence's five abilities were a heal, a
defensive buff, a thrown spell and two other things.

### The cause was one word

```js
const owesWeapon = !!kitWeapon && !knownList.some(a2 => isWeaponAligned(a2, kitWeapon));
```

`knownList` is the whole **kit**. So the pull that rounds 103 and 112 built to
make a weapon essence feel like one switched off the moment *any* of the
twenty abilities anywhere in the build was weapon-aligned. A twenty-ability kit
was guaranteed exactly **one** weapon ability, and every remaining socket
scored freely.

### The first fix made it worse, and the measurement is why that is a comment and not a shipped regression

Widening `owesWeapon` into a per-slot quota took the share from 11.3% to
**8.2%**. `isWeaponAligned` is `weaponAffinity / imbueStrike / summonWeapon /
twoHandWield` — support, almost all of it passive. A slot filled its new quota
with three affinity passives, the pull switched off, and the special attacks it
was meant to buy never arrived.

### They are two different debts, so they are counted separately now

* **`owesWeapon`** — unchanged, exactly as round 103 wrote it. The kit owes one
  weapon-aligned *support* ability, and a weapon stone in some other essence
  still gets it.
* **`owesSpecial`** — new. A **weapon essence's own slot** owes
  `WEAPON_ESSENCE_SLOT_QUOTA = 3` special attacks *with that weapon*, counted
  per slot and only satisfied by a candidate whose `requiresWeapon` matches —
  so an affinity passive can never pay it off. Pull 220, the kit-completing
  rate, yielding to the signature like every other seat.

| | before | after |
|---|---|---|
| weapon-essence slot, requires the weapon | **11.3%** | **23.9%** |
| Spear | 9% | **23%** |
| special attacks per kit (`test_round112_weapon`) | 0.60 at r112 | **1.88**, 93.8% of kits |

Hand and Foot stay near zero, which is correct — they are `unarmed` and have no
weapon to require.

Floor of 18% in the data lane, falsified by switching the pull off: `12.2%`.

### 1.1, and what is still open

> *"Spear essence generates a healing ability, defensive ability and a spell."*

The **innate** is a separate mechanism and it is not fixed. It comes from the
essence's authored signature pool, and:

```
0 of 189 authored signatures across all 21 weapon essences
are weapon special attacks
```

Spear's nine are `ranged_damage`, `ranged_aoe`, `self_active_timefreeze`
(named *"Healing Spike"*, which is a time freeze), `self_active_hot` (*"Healing
Strike"* — the heal you saw), `movement_dash`, `ranged_dot`,
`self_passive_aoe`, `summon_weapon`, `attr_boost`. **Not one is a special
attack**, so a weapon essence's innate cannot be one however the picker is
tuned. No `ABILITY_CATEGORIES` row carries `requiresWeapon` either — that flag
comes from the composer's `special` path, which authored signatures do not
reach.

Fixing it means authoring a weapon special into each of the 21 pools *and*
giving signatures a route to the composer's special path. That is a data-and-
generator job of its own and I would rather scope it with you than guess at 21
essences' flavour at the end of a long round.

## 2) "A spike is not a weapon"

`WEAPON_BY_IDENTITY` carried `Spike: 'javelin'`. One row, two symptoms: the
stone drew off the **weapon sheet** (`stoneSprites.js` had `stoneSpike` on
`stoneWeapon` idx 18 — the rapier), and every Spike socket got a javelin
affinity, so the essence generated weapon-affinity passives and special attacks
for a weapon it is not.

The essence's own text is *"you stop reaching for a weapon and start noticing
you are one"* — that is about the body, not a polearm.

Removing the identity is the whole fix: `weaponIdentityOf` returns null,
`weaponForAffinity` refuses the category outright, and the stone now draws
`extraGems` idx 13 tinted to its own `#90a4ae`.

**And the art is now tied to the identity.** Nothing connected them, so they
could disagree in either direction silently. A stone drawn on the weapon sheet
must now be a weapon — 17 of them are, all with an identity. The reverse is
deliberately not asserted: Gun, Hook, Foot and Hand are weapons that draw gems
on purpose.

Falsified by putting Spike back on the weapon sheet: `FAIL … stoneSpike`.

*Worth a look sometime:* `Trowel -> dagger` and `Shovel -> hammer` are the
same shape of claim. Both are at least wielded, so I have left them.

## Testing

| lane | result |
|---|---|
| data lane | **334/334** (3 new, all falsified) |
| `test_round112_weapon` | 6/6 — 1.88 specials per kit, 93.8% of kits |
| `test_round112_budget` | 10/10 |
| `test_round16` / `test_round17` | 31/31 · 34/34 |
| `test_round51_charters` | 24/24 |
