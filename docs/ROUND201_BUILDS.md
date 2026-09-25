# Three builds, read against canon

*Round 201. Generated from the live build — every card below was rendered by
`abilityCard.js` from an actual socketed kit, not written by hand.*

The user asked for three example builds to review, with at least one weapon
essence and at least one summoning build. What they are for is checking the
round-201 changes where they land: the essence in the parenthetical, the
zero-padded percentage, the new cooldown bands, the tags that had no source,
and a bar that is a different width for each of the three.

| | Essences | Confluence | Abilities | Active | Bar cells |
|---|---|---|---|---|---|
| **The Swordsman** (weapon essence) | Sword + Blood + Iron | Arsenal | 20 | 10 | 10 |
| **The Houndmaster** (summoning) | Wolf + Bone + Rat | Unity | 20 | 13 | 13 |
| **The Sanction** (the round-201 shapes) | Sin + Light + Balance | Glimeron | 20 | 12 | 12 |

The bar-cell column is item 6.1 working: three kits, three widths, none of them
the old fixed twelve and none below the floor of ten.

---

## The Swordsman — weapon essence

Sword, Blood and Iron. A weapon essence in the first socket, which is what makes the kit answer to what is in your hands.

**Sword + Blood + Iron → Arsenal.** 20 abilities: 10 active, 10 passive. The bar draws 10 cells.

### The bound bar

| Slot | Ability | Essence | Key | Controller |
|---|---|---|---|---|
| 1 | Blade Dance | Sword | `1` | `A` |
| 2 | Rippling Strike | Sword | `2` | `B` |
| 3 | Disarm Strike | Sword | `3` | `X` |
| 4 | Leech Bite | Blood | `4` | `Y` |
| 5 | Blood Pump | Blood | `5` | `L2+A` |
| 6 | Shrapnel Burst | Iron | `6` | `L2+B` |
| 7 | Iron Calls | Iron | `7` | `L2+X` |
| 8 | Smith's Blessing | Iron | `8` | `L2+Y` |
| 9 | Arsenal Javelin | Arsenal | `9` | `R2+A` |
| 10 | Defensive Energy Barrier | Arsenal | `0` | `R2+B` |

### The cards

```
Ability: [Blade Dance] (Sword)
Spell (magic, curse, repeatable).
Cost: Very low mana, rising with each unbroken repeat.
Cooldown: 0.6 seconds.
Current rank: Iron 0 (00%).
Effect (iron): Sends the drawn blade out ahead of you, hard and fast and straight. Throws a bolt of force that deals 6 damage to the first enemy it hits. It can be used again almost at once: each unbroken repeat hits harder and costs more. Each hit has a 29% chance of [Whirling Lash] -- stripping the target's armour, cumulatively for 10.5s. Every hit leaves Bleed behind.
(next) Effect (bronze): Each repeat raises the cost half as much.
Numbers now: 8 dmg · 0.6s cd · +7% for each unbroken repeat (max +42%), and the rhythm breaks if you pause; each repeat also costs +15% more (max +90%) · 29% chance of [Whirling Lash] for 10.5s (stripping the target's armour, cumulatively) · 3 mana
[Whirling Lash] (rate, stacking): Stripping the target's armour, cumulatively.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Rippling Strike] (Sword)
Special attack (damage-over-time).
Cost: Low stamina.
Cooldown: 13 seconds.
Current rank: Bronze 3 (23%).
Effect (iron): A strike with your weapon, force riding the edge: whatever it catches is left with a lasting affliction. Anything struck moves 22% slower for 3s. Your dodge chance rises 17% for 11 seconds. It also strikes everything it reaches for 3 more. Two seconds come off everything else you are waiting on. What it lands on bursts, catching everything nearby for 2. Every hit leaves Bleed behind.
Effect (bronze): 15% of the damage carries to two more foes nearby.
(next) Effect (silver): +10% critical chance with this ability.
Numbers now: weapon strike · applies 4×4 Blight and -10% armor · 13s cd · -22% enemy speed for 3s · 9 stamina
[Blight] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Disarm Strike] (Sword)
Special attack (curse, damage-over-time).
Cost: Low stamina.
Cooldown: 16 seconds.
Current rank: Silver 9 (69%).
Effect (iron): A strike with your weapon, force riding the edge: whatever it catches is left with a lasting affliction. Its affliction runs long: 4 damage per tick, 4 ticks of bleed. Each hit has a 35% chance of [Debt of the Quills] -- making the target take more from you and deal less to others, cumulatively for 16.6s. A third of what it takes comes back to you as health. Every hit leaves Bleed behind.
Effect (bronze): 15% of the damage carries to two more foes nearby.
Effect (silver): +10% critical chance with this ability.
(next) Effect (gold): It strikes a quarter harder.
Numbers now: weapon strike · applies 5×4 Blight and -10% armor · 16s cd · 35% chance of [Debt of the Quills] for 16.6s (making the target take more from you and deal less to others, cumulatively) · 9 stamina
[Debt of the Quills] (amplify, stacking, curse): Making the target take more from you and deal less to others, cumulatively.
[Blight] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Steadfast Grip] (Sword)
Passive ability.
Cost: None.
Current rank: Bronze 6 (46%).
Effect (iron): A permanent increase to one of your core statistics. It also reduces the cooldown of every other ability you have by 6%. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: +7% crit chance · -6% ability cooldowns
```

```
Ability: [Vigil of the Blade] (Sword)
Passive ability.
Cost: None.
Current rank: Iron 2 (92%).
Effect (iron): Extends the senses -- you know a moment before it starts. A flash in the direction of something that has noticed you. You draw loose things to you from 52px away.
(next) Effect (bronze): Adds: hidden and stealthed enemies show 45% more clearly.
Numbers now: Danger Sense: an arrow flashes at the screen edge toward anything off-screen that starts hunting you
```

```
Ability: [Leech Bite] (Blood)
Spell (magic, curse, damage-over-time).
Cost: Low mana (health can pay).
Cooldown: 1.1 seconds.
Current rank: Iron 5 (15%).
Effect (iron): Throws a bolt of force that deals 6 damage to the first enemy it hits. Its affliction runs long: 4 damage per tick, 6 ticks of bleed. +12% per tenth of your own blood already lost (max +72%). Each hit has a 16% chance of [Swollen Scar-tissue] -- stopping the target moving for a moment for 0.7s. Every hit leaves Bleed behind.
(next) Effect (bronze): 15% of the damage carries to two more foes nearby.
Numbers now: 7 dmg · 1.1s cd · +5×6 Blight over 4.8s · +12% per tenth of your own blood already lost (max +72%) · 16% chance of [Swollen Scar-tissue] for 0.7s (stopping the target moving for a moment) · 7 mana (or blood)
[Swollen Scar-tissue] (control): Stopping the target moving for a moment.
[Blight] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Blood Pump] (Blood)
Special attack (damage-over-time).
Cost: Low stamina (health can pay).
Cooldown: 10.5 seconds.
Current rank: Bronze 1 (61%).
Effect (iron): A strike with your weapon, force riding the edge: whatever it catches is left with a lasting affliction. It comes back in 10.5s, and using it increases your movement speed by 15% for 5s. Your cast speed rises 17% for 12 seconds. And it leaves the ground itself against them. It also strikes everything it reaches for 3 more. Every hit leaves Bleed behind.
Effect (bronze): 15% of the damage carries to two more foes nearby.
(next) Effect (silver): +10% critical chance with this ability.
Numbers now: weapon strike · applies 5×4 Blight · 10.5s cd · +15% move speed for 5s · 9 stamina (or blood)
[Blight] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Red Heart] (Blood)
Passive ability.
Cost: None.
Current rank: Bronze 8 (38%).
Effect (iron): When the last of your mana goes, you regenerate 5 health a second for 4 seconds. There is a 5 second wait on it. A standing 6% improvement to your armour. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: when the last of your mana goes: 5 HP/s for 5s · 5s cd
```

```
Ability: [Spatter of Blood] (Blood)
Passive ability (retribution).
Cost: None.
Current rank: Silver 4 (84%).
Effect (iron): A standing field -- the light around you gives up. Enemies within 3.5 tiles gather a mark every 1.5s, up to 3 marks; each mark makes them take 2% more damage. Anything that attacks you while it is standing in the field takes 5 damage back. Each kill you make while it is active restores 4 health. Yours carries Arsenal Mark: what stands in your field is left [The Long Reagent]. Stronger: enemies within 4.1 tiles gain a mark every 1.5s (up to 3); each mark makes them take 3% more damage; anything that attacks you from inside takes 8 damage back.
Effect (bronze): Adds: 20% chance per tick to inflict poison; you heal for 12% of the field's damage. Stronger: enemies within 4.6 tiles gain a mark every 1.5s (up to 4); each mark makes them take 4% more damage; anything that attacks you from inside takes 11 damage back.
Effect (silver): Adds: +18% shadow resistance while inside; 32% chance per tick to inflict poison (stacks to 2); enemies inside miss 10% more often. Stronger: enemies within 5 tiles gain a mark every 1.5s (up to 5); each mark makes them take 5% more damage; anything that attacks you from inside takes 15 damage back; you heal for 20% of the field's damage.
(next) Effect (gold): Adds: kills outright anything inside below 12% health; when something dies in it, restore 8% of your health (once every 3s). Stronger: enemies within 5.5 tiles gain a mark every 1.5s (up to 6); each mark makes them take 6% more damage; anything that attacks you from inside takes 20 damage back; +26% shadow resistance while inside; 45% chance per tick to inflict poison (stacks to 3); enemies inside miss 18% more often; you heal for 30% of the field's damage.
Numbers now: Gloomtide: enemies within 5 tiles gain a mark every 1.5s (up to 5); each mark makes them take 5% more damage; anything that attacks you from inside takes 15 damage back; +18% shadow resistance while inside; 32% chance per tick to inflict poison (stacks to 2); enemies inside miss 10% more often; you heal for 20% of the field's damage · +4 HP per kill
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Vein Effigy] (Blood)
Passive ability (conjuration).
Cost: None.
Current rank: Iron 7 (07%).
Effect (iron): Conjures a weapon of force. It increases your weapon damage by 16%, and every strike with it leaves sear in the wound. A standing 9% improvement to your armour. Every hit leaves Bleed behind.
(next) Effect (bronze): 15% of the damage carries to two more foes nearby.
Numbers now: +19% weapon damage · every strike applies 3×2 Sear · +13% Shadow Resistance
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Shrapnel Burst] (Iron)
Spell (magic, damage-over-time).
Cost: Low mana.
Cooldown: 2 seconds.
Current rank: Iron 0 (30%).
Effect (iron): Fires a single shot of force that deals 6 damage to whatever it strikes first. Its affliction runs long: 3 damage per tick, 4 ticks of bulwark. Answers to company: +6% per ally within reach (max +30%). Every hit leaves Bleed behind.
(next) Effect (bronze): 15% of the damage carries to two more foes nearby.
Numbers now: 7 dmg · 2s cd · +4×4 Blight over 3.2s · answers to company: +6% per ally within reach (max +30%) · 7 mana
[Blight] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Iron Calls] (Iron)
Special ability (magic).
Cost: Low mana.
Cooldown: 6 minutes.
Current rank: Bronze 3 (53%).
Effect (iron): Increases your damage by 36% for 30 seconds. While it lasts, an escort of bulwark fights beside you, striking for 4 every 1.4s. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: +36% damage for 39s · 6m cd · escort strikes for 4 every 1.4s for 8s · 2s cast · 8 mana
```

```
Ability: [Smith's Blessing] (Iron)
Special ability.
Cost: Very low stamina.
Cooldown: 13.2 seconds.
Current rank: Silver 9 (99%).
Effect (iron): Increases your movement speed by 41% for 10 seconds. It sets 8% more armour between you and the next hit. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The guard holds a quarter further still.
Numbers now: +41% move speed for 13s · 13.2s cd · 4 stamina
```

```
Ability: [Reinforced Grip] (Iron)
Passive ability.
Cost: None.
Current rank: Bronze 6 (76%).
Effect (iron): The weight goes into the blow rather than into you. +1 power, your special attacks with a bow hit 14% harder, and swinging one costs 30% less stamina. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: +1 power · Bow: +14% special attack damage · -30% swing stamina
```

```
Ability: [Steelshield] (Iron)
Passive ability (conjuration).
Cost: None.
Current rank: Iron 2 (22%).
Effect (iron): Conjures armour of force. It blunts every blow you take and returns 7% of the damage to whoever dealt it. Everything you wear turns blows 20% better. The guard holds a tenth further than it did.
(next) Effect (bronze): The guard holds a fifth further again.
Numbers now: -3 damage from every hit taken · +28% armor · returns 7% of damage taken · +8% Spell Cast Speed
```

```
Ability: [Arsenal Javelin] (Arsenal)
Spell (magic, damage-over-time).
Cost: Moderate mana.
Cooldown: 2.2 seconds.
Current rank: Iron 5 (45%).
Effect (iron): Sends a bolt of many-handed forge out ahead of you with the weight of a spare edge behind it -- enough to draw whatever it finds. It also applies forge, dealing 3 damage per tick for 3 ticks. +7% for every 10% of your health already gone (max +28%), resolved 6s later. Every hit leaves Bleed behind.
(next) Effect (bronze): 15% of the damage carries to two more foes nearby.
Numbers now: 17 dmg · 2.2s cd · +4×3 Forge over 2.4s · +7% for every 10% of your health already gone (max +28%), resolved 6s later · 11 mana
[Forge] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Defensive Energy Barrier] (Arsenal)
Special ability (magic).
Cost: Low mana.
Cooldown: 14 seconds.
Current rank: Bronze 1 (91%).
Effect (iron): Turns elemental harm back on its source: 25% of typed damage you take is returned to whoever dealt it, for 6 seconds. It thickens your guard by 10% for as long as it lasts. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: returns 25% of elemental damage taken for 8s · 14s cd · 6 mana
```

```
Ability: [Arsenal Implants] (Arsenal)
Passive ability.
Cost: None.
Current rank: Bronze 8 (68%).
Effect (iron): Each time you are hurt by anything other than fire, you regenerate 3 health a second for 4 seconds. A standing 9% improvement to your armour. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: when hurt by anything but fire: 3 HP/s for 5s
```

```
Ability: [Well-stocked Oiled Steel] (Arsenal)
Passive ability.
Cost: None.
Current rank: Silver 4 (14%).
Effect (iron): A permanent increase to one of your core statistics. Your guard is permanently 10% thicker for carrying it. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The guard holds a quarter further still.
Numbers now: +6% armor
```

```
Ability: [Energy Pulse Shield] (Arsenal)
Passive ability.
Cost: None.
Current rank: Iron 7 (37%).
Effect (iron): A knack that pays off only under one specific circumstance. A standing 10% improvement to your armour. The guard holds a tenth further than it did.
(next) Effect (bronze): The guard holds a fifth further again.
Numbers now: +16% dodge vs physical-touched foes
```

### What this kit's target frame shows

Against a Slagward Drake at 74 of 180, with no perception and with six senses:

| Row | No senses | Six senses |
|---|---|---|
| Name | Slagward Drake | Slagward Drake |
| Rank | Bronze | Bronze |
| Health | 41% | 41% |
| Remaining | — | 74 / 180 *(deathWatch)* |
| Weak to | — | Frost *(weakspotCrit)* |
| Flaw | — | cracked shell *(flawSight)* |
| Resists | — | Fire 40%, Shadow 20% *(leySight)* |
| Truly | — | revenant *(unmask)* |
| Aware of you | — | yes *(counterSense)* |

---

## The Houndmaster — summoning

Wolf, Bone and Rat. Three essences that bring things with them, so the kit is read through what it puts on the field.

**Wolf + Bone + Rat → Unity.** 20 abilities: 13 active, 7 passive. The bar draws 13 cells.

### The bound bar

| Slot | Ability | Essence | Key | Controller |
|---|---|---|---|---|
| 1 | Howl of Terror | Wolf | `1` | `A` |
| 2 | Healing Wolf’s Howl | Wolf | `2` | `B` |
| 3 | Lean Pack | Wolf | `3` | `X` |
| 4 | Wolf Fang Strike | Wolf | `4` | `Y` |
| 5 | Avatar of the Ossified | Bone | `5` | `L2+A` |
| 6 | Reconstruction | Bone | `6` | `L2+B` |
| 7 | Ribs Elsewhere | Bone | `7` | `L2+X` |
| 8 | Nesting Hollow | Rat | `8` | `L2+Y` |
| 9 | Tail Lash | Rat | `9` | `R2+A` |
| 10 | Carrion Feast | Rat | `0` | `R2+B` |
| 11 | Unity Rebirth | Unity | `-` | `R2+X` |
| 12 | Linked Spell | Unity | `=` | `R2+Y` |
| 13 | Binding Pulse of Unity | Unity | `F1` | `L2+R1` |

Slots 13–13 are the round-201 chords. They are the reason this
kit can put every active ability it owns on the bar at once, which at twelve
slots it could not.

### The cards

```
Ability: [Howl of Terror] (Wolf)
Spell (magic, curse, repeatable).
Cost: Very low mana, rising with each unbroken repeat.
Cooldown: 0.6 seconds.
Current rank: Iron 0 (00%).
Effect (iron): Sends the pack's teeth out ahead of you, hard and fast and straight. Flicks a quick shard of force at the nearest threat for 4 damage. It can be used again almost at once: each unbroken repeat hits harder and costs more. Each hit has a 35% chance of [Gut-Work] -- stripping the target's armour, cumulatively for 10.4s. Every hit leaves Bleed behind.
(next) Effect (bronze): Each repeat raises the cost half as much.
Numbers now: 5 dmg · 0.6s cd · +5%/ally within 5.5 tiles (max 4) · +6% per use in a row (max +30%), lost if you stop; each repeat also costs +15% more (max +75%) · 35% chance of [Gut-Work] for 10.4s (stripping the target's armour, cumulatively) · 2 mana
[Gut-Work] (rate, stacking): Stripping the target's armour, cumulatively.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Healing Wolf’s Howl] (Wolf)
Special ability (recovery, healing, magic).
Cost: Moderate mana.
Cooldown: 10 seconds.
Current rank: Bronze 3 (23%).
Effect (iron): Restores 12 health to the ally who needs it most. Its effect increases by 12% for each ally within 5.5 tiles, up to 4 allies. The mending closes wounds a tenth further than it did.
Effect (bronze): The mending closes wounds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: restores 16 HP to you and your team · 10s cd · +12%/ally within 5.5 tiles (max 4) · 11 mana
```

```
Ability: [Lean Pack] (Wolf)
Special ability (recovery, healing, magic).
Cost: Low mana.
Cooldown: 11 seconds.
Current rank: Bronze 6 (46%).
Effect (iron): Restores 3 health a second to the ally who needs it most, for 5 seconds. It reaches past your own skin: what it mends, it mends for whoever is standing there. Stamina keeps returning for six seconds after, 1 a second. The mending closes wounds a tenth further than it did.
Effect (bronze): The mending closes wounds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: 4 HP/s for 5s to the ally who needs it most · 11s cd · +1.3 HP/s for 7s (Draught) · 8 mana
```

```
Ability: [Wolf Fang Strike] (Wolf)
Spell (magic, curse, area).
Cost: Low mana.
Cooldown: 3 seconds.
Current rank: Iron 2 (92%).
Effect (iron): Fires a single shot of force that deals 5 damage to whatever it strikes first. While it lasts, an escort of claw fights beside you, striking for 5 every 1.4s. Each hit has a 36% chance of [Under the Hide] -- taking the target's Power, cumulatively for 9.8s. Every hit leaves Bleed behind.
(next) Effect (bronze): 15% of the damage carries to two more foes nearby.
Numbers now: 7 dmg · 3s cd · 75px blast, all of it for the same · escort strikes for 5 every 1.4s for 6s · 36% chance of [Under the Hide] for 9.8s (taking the target's Power, cumulatively) · 7 mana
[Under the Hide] (attribute, stacking): Taking the target's Power, cumulatively.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Wolf Run Down] (Wolf)
Passive ability (retribution).
Cost: None.
Current rank: Silver 9 (69%).
Effect (iron): A standing field -- it is worth more the faster everyone is going. Enemies within 4.5 tiles gather a mark every 1s, up to 3 marks; each mark makes them take 2% more damage. Anything that attacks you while it is standing in the field takes 2 damage back. Its effect increases by 5% for each ally within 5.5 tiles, up to 4 allies, and it covers them too. Yours carries Unity Mark: what stands in your field is left [Balancing Ledger]. Stronger: enemies within 5.1 tiles gain a mark every 1s (up to 3); each mark makes them take 3% more damage; anything that attacks you from inside takes 3 damage back; allies inside move 9% faster.
Effect (bronze): Adds: 20% chance per tick to inflict bleed; allies inside deal 8% more damage. Stronger: enemies within 5.6 tiles gain a mark every 1s (up to 4); each mark makes them take 4% more damage; anything that attacks you from inside takes 5 damage back; allies inside move 13% faster.
Effect (silver): Adds: 32% chance per tick to inflict bleed (stacks to 2); enemies inside are pushed away. Stronger: enemies within 6.1 tiles gain a mark every 1s (up to 5); each mark makes them take 5% more damage; anything that attacks you from inside takes 7 damage back; allies inside move 17% faster; allies inside deal 13% more damage.
(next) Effect (gold): Adds: on moveDistance, +22% physical damage for 6s (once every 7s). Stronger: enemies within 6.7 tiles gain a mark every 1s (up to 6); each mark makes them take 6% more damage; anything that attacks you from inside takes 9 damage back; 45% chance per tick to inflict bleed (stacks to 3); allies inside move 22% faster; allies inside deal 19% more damage.
Numbers now: Cavalrywind: enemies within 6.1 tiles gain a mark every 1s (up to 5); each mark makes them take 5% more damage; anything that attacks you from inside takes 7 damage back; 32% chance per tick to inflict bleed (stacks to 2); enemies inside are pushed away; allies inside move 17% faster; allies inside deal 13% more damage · +5%/ally within 5.5 tiles (max 4)
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Avatar of the Ossified] (Bone)
Special ability (magic, shadow).
Cost: Low mana.
Cooldown: 5 minutes.
Current rank: Iron 5 (15%).
Effect (iron): Increases your critical hit chance by 28% for 20 seconds. While it lasts, an escort of grave fights beside you, striking for 5 every 1.4s. The working holds a tenth further than it did.
(next) Effect (bronze): The working holds a fifth further again.
Numbers now: +28% crit chance for 22s · 5m cd · escort strikes for 5 every 1.4s for 9s · 1.7s cast · 8 mana
```

```
Ability: [Reconstruction] (Bone)
Special ability (magic, conjuration, shadow).
Cost: Low mana.
Cooldown: 8 minutes.
Current rank: Silver 4 (84%).
Effect (iron): Calls a half-seen cattle for 37 seconds. It hangs back and throws shadow at what you are fighting, for 38 damage every 1.03s from up to 54 away. While it lasts, an escort of grave fights beside you, striking for 5 every 1.4s. Your power rises 11% for 9 seconds. Your next strikes carry it too. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The working holds a quarter further still.
Numbers now: creature: 38 dmg every 1.03s within 1.5 tiles, lasts 37s · 8m cd · escort strikes for 5 every 1.4s for 10s · 2.4s cast · 8 mana
```

```
Ability: [Ribs Elsewhere] (Bone)
Special ability (dimension, shadow).
Cost: Very low stamina.
Cooldown: 12 seconds.
Current rank: Iron 7 (07%).
Effect (iron): Increases your movement speed by 31% for 8 seconds. You finish it 120px from where the blow was aimed, +6% harder to hit for it. A shield of 3 settles over you as it goes. The stride carries you a tenth further than it did.
(next) Effect (bronze): The stride carries you a fifth further again.
Numbers now: +31% move speed for 9s · 12s cd · 120px reposition · +6% dodge · 4 stamina
```

```
Ability: [Skeletal Mastery] (Bone)
Passive ability (conjuration, shadow).
Cost: None.
Current rank: Bronze 8 (38%).
Effect (iron): Conjures armour of shadow. It blunts every blow you take and returns 13% of the damage to whoever dealt it. A standing 13% guard against shadow. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: -2 damage from every hit taken · +5% armor · returns 13% of damage taken · +8 Max HP · +0.2%/s HP Recovery · +8% Nature Resistance · +17% shadow resistance
```

```
Ability: [Bleached Skull] (Bone)
Passive ability (shadow).
Cost: None.
Current rank: Bronze 1 (61%).
Effect (iron): Extends the senses -- the wounded are lit up, and ranked. Wounded enemies stand out. An escort of grave fights beside you, striking for 5 every 1.4s. Adds: you see every enemy's health bar. Stronger: wounded enemies are outlined red, brighter the more hurt they are (x0.7).
Effect (bronze): Adds: enemies show their exact remaining health. Stronger: wounded enemies are outlined red, brighter the more hurt they are (x0.9).
(next) Effect (silver): Adds: +12% critical chance against an enemy's elemental weak point, which is marked over its head. Stronger: wounded enemies are outlined red, brighter the more hurt they are (x1).
Numbers now: Blood in the Water: wounded enemies are outlined red, brighter the more hurt they are (x0.9); you see every enemy's health bar; enemies show their exact remaining health · escort strikes for 5 every 1.4s
```

```
Ability: [Nesting Hollow] (Rat)
Special ability (magic).
Cost: Moderate mana.
Cooldown: 12 seconds.
Current rank: Iron 0 (30%).
Effect (iron): Raises a barrier that swallows the next 2 blows whole, whatever they are worth. While it lasts, an escort of fang fights beside you, striking for 4 every 1.4s. The guard holds a tenth further than it did.
(next) Effect (bronze): The guard holds a fifth further again.
Numbers now: absorbs the next 2 blows in full · 12s cd · escort strikes for 4 every 1.4s for 8s · 17 mana
```

```
Ability: [Tail Lash] (Rat)
Spell (magic, curse, dimension).
Cost: Moderate mana (health can pay).
Cooldown: 0.9 seconds.
Current rank: Bronze 3 (53%).
Effect (iron): Fires a single shot of force that deals 10 damage to whatever it strikes first. You finish it 60px from where the blow was aimed, +4% harder to hit for it. Each hit has a 32% chance of [Tiny Spring Legs] -- bleeding the target, absorbing incoming healing, and worse while they move for 10.5s. Your movement speed rises 25% for 4s afterwards. Every hit leaves Bleed behind.
Effect (bronze): 15% of the damage carries to two more foes nearby.
(next) Effect (silver): +10% critical chance with this ability.
Numbers now: 13 dmg · 0.9s cd · 60px reposition · +4% dodge · 32% chance of [Tiny Spring Legs] for 10.5s (bleeding the target, absorbing incoming healing, and worse while they move) · 10 mana (or blood)
[Tiny Spring Legs] (affliction, wounding, stacking, blood): Bleeding the target, absorbing incoming healing, and worse while they move.
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Carrion Feast] (Rat)
Special ability (magic, conjuration).
Cost: Low mana.
Cooldown: 5 minutes.
Current rank: Iron 2 (22%).
Effect (iron): Calls a construct of stone and iron for 2.3 minutes. It never strikes. Everything you do lands harder while it is beside you. While it lasts, an escort of fang fights beside you, striking for 4 every 1.4s. 3 stamina comes back to you. Your spirit rises 14% for 9 seconds. The working holds a tenth further than it did.
(next) Effect (bronze): The working holds a fifth further again.
Numbers now: creature: 5 dmg every 0.78s within 1.5 tiles, lasts 2.3m · 5m cd · escort strikes for 4 every 1.4s for 8s · 1.6s cast · 8 mana
```

```
Ability: [Scavenger’s Instinct] (Rat)
Passive ability (conjuration).
Cost: None.
Current rank: Bronze 6 (76%).
Effect (iron): Calls a bonded familiar of force that fights beside you, striking for 7 damage. What it summons arrives stronger than the summoning would normally allow. Every hit leaves Bleed behind.
Effect (bronze): 15% of the damage carries to two more foes nearby.
(next) Effect (silver): +10% critical chance with this ability.
Numbers now: familiar strikes for 7 dmg every 1.2s within 4.5 tiles
[Bleed] (affliction, damage-over-time): Deals ongoing physical damage for a few seconds after the hit.
```

```
Ability: [Tunnel Collapse] (Rat)
Passive ability.
Cost: None.
Current rank: Silver 9 (99%).
Effect (iron): Your movement speed is permanently increased by 13%. It also reduces the cooldown of every other ability you have by 7%. The stride carries you a tenth further than it did.
Effect (bronze): The stride carries you a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The stride carries you a quarter further still.
Numbers now: +13% movement speed · -7% ability cooldowns
```

```
Ability: [Unity Rebirth] (Unity)
Special ability (recovery, holy, magic, radiant).
Cost: Low mana.
Cooldown: 9 seconds.
Current rank: Iron 5 (45%).
Effect (iron): What is done to one of you is spread across all of you, and it weighs less that way -- and while it holds, the joined hand closes what has been opened in you. While it lasts, an escort of law fights beside you, striking for 5 every 1.4s. The mending closes wounds a tenth further than it did.
(next) Effect (bronze): The mending closes wounds a fifth further again.
Numbers now: 4 HP/s for 5s to yourself · 9s cd · escort strikes for 5 every 1.4s for 7s · 8 mana
```

```
Ability: [Linked Spell] (Unity)
Special ability (holy, magic, conjuration, radiant).
Cost: Low mana.
Cooldown: 7 minutes.
Current rank: Bronze 8 (68%).
Effect (iron): Calls a figure of hard light for 1.2 minutes. It hangs back and throws light at what you are fighting, for 15 damage every 0.75s from up to 46 away. While it lasts, an escort of law fights beside you, striking for 5 every 1.4s. Your spirit rises 8% for 11 seconds. 3 stamina comes back to you. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: creature: 15 dmg every 0.75s within 1.5 tiles, lasts 1.2m · 7m cd · escort strikes for 5 every 1.4s for 7s · 2.3s cast · 8 mana
```

```
Ability: [Binding Pulse of Unity] (Unity)
Spell (holy, magic, radiant).
Cost: Low mana.
Cooldown: 4 minutes.
Current rank: Silver 4 (14%).
Effect (iron): Increases your critical hit chance by 28% for 20 seconds. It stands 7% radiant resistance up around you. It also strikes everything it reaches for 3 more. Every hit leaves Sear behind.
Effect (bronze): 15% of the damage spills onto two more foes nearby.
Effect (silver): +10% critical chance with this ability.
(next) Effect (gold): It strikes a quarter harder.
Numbers now: +28% crit chance for 20s · 4m cd · +7% radiant resistance · 1.2s cast · 8 mana
[Sear] (affliction, damage-over-time): Deals ongoing radiant damage for a few seconds after the hit.
```

```
Ability: [Unity Joined Hand] (Unity)
Passive ability (holy, radiant).
Cost: None.
Current rank: Bronze 1 (91%).
Effect (iron): Each time you are hurt by anything other than fire, you regenerate 3 health a second for 4 seconds. An escort of law fights beside you, striking for 5 every 1.4s. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: when hurt by anything but fire: 3 HP/s for 5s · escort strikes for 5 every 1.4s
```

```
Ability: [Ordered Single Line] (Unity)
Passive ability (holy, radiant).
Cost: None.
Current rank: Iron 7 (37%).
Effect (iron): Every ability you have comes round 5% sooner. Radiant is permanently 7% less dangerous to you. The guard holds a tenth further than it did.
(next) Effect (bronze): The guard holds a fifth further again.
Numbers now: -5% ability cooldowns · +8% radiant resistance
```

### What this kit's target frame shows

Against a Slagward Drake at 74 of 180, with no perception and with six senses:

| Row | No senses | Six senses |
|---|---|---|
| Name | Slagward Drake | Slagward Drake |
| Rank | Bronze | Bronze |
| Health | 41% | 41% |
| Remaining | — | 74 / 180 *(deathWatch)* |
| Weak to | — | Frost *(weakspotCrit)* |
| Flaw | — | cracked shell *(flawSight)* |
| Resists | — | Fire 40%, Shadow 20% *(leySight)* |
| Truly | — | revenant *(unmask)* |
| Aware of you | — | yes *(counterSense)* |

---

## The Sanction — the round-201 shapes

Sin, Light and Balance — the three essences canon draws [Castigate], [Karmic Warrior] and the holy afflictions from.

**Sin + Light + Balance → Glimeron.** 20 abilities: 12 active, 8 passive. The bar draws 12 cells.

### The bound bar

| Slot | Ability | Essence | Key | Controller |
|---|---|---|---|---|
| 1 | Venomous Strike | Sin | `1` | `A` |
| 2 | Dark Flame | Sin | `2` | `B` |
| 3 | Painful Curse | Sin | `3` | `X` |
| 4 | Beacon’s Blessing | Light | `4` | `Y` |
| 5 | Solar Flare | Light | `5` | `L2+A` |
| 6 | Daybreak’s Favor | Light | `6` | `L2+B` |
| 7 | Counterweight Ward | Balance | `7` | `L2+X` |
| 8 | Equal Plumb Line | Balance | `8` | `L2+Y` |
| 9 | Tared Beam Closing | Balance | `9` | `R2+A` |
| 10 | Glimeron Rupture | Glimeron | `0` | `R2+B` |
| 11 | Starlight Pulse | Glimeron | `-` | `R2+X` |
| 12 | Healing Lightwave | Glimeron | `=` | `R2+Y` |

### The cards

```
Ability: [Venomous Strike] (Sin)
Spell (magic, curse, damage-over-time, repeatable, shadow).
Cost: Very low mana, rising with each unbroken repeat.
Cooldown: 0.6 seconds.
Current rank: Iron 0 (00%).
Effect (iron): Marks the target with the cherished wrong and lets it do the rest at its own pace. Flicks a quick shard of shadow at the nearest threat for 4 damage. It is ready again almost at once, and every repeat in an unbroken run hits harder and costs more. Each hit has a 30% chance of [Written In The Ledger] -- making the target take more damage from abilities, cumulatively for 11.8s. Every hit leaves Decay behind.
(next) Effect (bronze): Each repeat raises the cost half as much.
Numbers now: 5 dmg · 0.6s cd · +3×5 Blight over 4.0s · +8% per use in a row (max +40%), lost if you stop; each repeat also costs +15% more (max +75%) · 30% chance of [Written In The Ledger] for 11.8s (making the target take more damage from abilities, cumulatively) · 2 mana
[Written In The Ledger] (amplify, stacking, holy): Making the target take more damage from abilities, cumulatively.
[Blight] (affliction, damage-over-time): Deals ongoing shadow damage for a few seconds after the hit.
[Decay] (affliction, damage-over-time): Deals ongoing shadow damage for a few seconds after the hit.
```

```
Ability: [Dark Flame] (Sin)
Special ability (magic, conjuration, shadow).
Cost: Low mana.
Cooldown: 7 minutes.
Current rank: Bronze 6 (46%).
Effect (iron): Calls a half-seen bird for 59 seconds. It hangs back and throws shadow at what you are fighting, for 27 damage every 0.83s from up to 59 away. It comes back in 7m, and using it increases your movement speed by 13% for 3s. Your cast speed rises 11% for 8 seconds. And it leaves the ground itself against them. What it takes from them, you keep for a while. What it touches is left festering for 1 a tick. 3 stamina comes back to you. 3 mana comes back to you. The stride carries you a tenth further than it did.
Effect (bronze): The stride carries you a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: creature: 27 dmg every 0.83s within 2 tiles, lasts 59s · 7m cd · +13% move speed for 3s · 2.1s cast · 8 mana
```

```
Ability: [Painful Curse] (Sin)
Special attack (magic, curse, area, shadow).
Cost: Low mana (health can pay).
Cooldown: 11 seconds.
Current rank: Iron 2 (92%).
Effect (iron): Strips 17% armour and 15% movement speed from every enemy within 3 tiles. 30% of the damage it deals is returned to you as health. Something comes with it, and fights until it is put down. Your recovery rises 17% for 12 seconds. It leaves something behind, waiting. Every hit leaves Decay behind.
(next) Effect (bronze): 15% of the damage reaches two more foes nearby.
Numbers now: requires a Dagger in hand · -17% armor, -15% speed to enemies within 3 tiles for 7s · 11s cd · heals 30% of damage dealt · 8 mana (or blood)
[Decay] (affliction, damage-over-time): Deals ongoing shadow damage for a few seconds after the hit.
```

```
Ability: [Sinful Will] (Sin)
Passive ability (stacking, shadow).
Cost: None.
Current rank: Bronze 3 (23%).
Effect (iron): Every blow is written down. Every time you land a hit, a stack builds on that enemy, up to 12. Your next critical hit on it spends them all: a blow strikes that enemy for 27% of your weapon damage per stack (326% at full). Unfed, a stack fades every 4s. It also regenerates 0.8 health a second, permanently. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: Every time you land a hit, a stack builds on that enemy, up to 12. Your next critical hit on it spends them all: a blow strikes that enemy for 27% of your weapon damage per stack (326% at full). Unfed, a stack fades every 4s. · +0.8 HP/s
```

```
Ability: [Mark Watch] (Sin)
Passive ability (shadow).
Cost: None.
Current rank: Silver 9 (69%).
Effect (iron): Cherished Wrong extends the senses past sight — every living thing in the region is felt. An escort of shadow fights beside you, striking for 4 every 1.4s. Adds: you see every enemy's health bar. Stronger: moving enemies within 8.1 tiles are outlined through walls.
Effect (bronze): Adds: hidden and stealthed enemies show 40% more clearly. Stronger: moving enemies within 11.3 tiles are outlined through walls.
Effect (silver): Adds: an arrow flashes at the screen edge toward anything off-screen that starts hunting you. Stronger: moving enemies within 14.4 tiles are outlined through walls; hidden and stealthed enemies show 60% more clearly.
(next) Effect (gold): Adds: while your mana is full, restore 5% of your stamina over 6s (at most once every 12s). Stronger: moving enemies within 18.1 tiles are outlined through walls; hidden and stealthed enemies show 80% more clearly.
Numbers now: Stillness: moving enemies within 14.4 tiles are outlined through walls; you see every enemy's health bar; hidden and stealthed enemies show 60% more clearly; an arrow flashes at the screen edge toward anything off-screen that starts hunting you · escort strikes for 4 every 1.4s
```

```
Ability: [Beacon’s Blessing] (Light)
Special ability (holy, magic, radiant).
Cost: Low mana.
Cooldown: 7 minutes.
Current rank: Iron 5 (15%).
Effect (iron): Increases your damage by 31% for 30 seconds. The whole of the light goes in the first instant; 7m before the next. The working holds a tenth further than it did.
(next) Effect (bronze): The working holds a fifth further again.
Numbers now: +39% damage for 33s · 7m cd · 2.3s cast · 8 mana
```

```
Ability: [Solar Flare] (Light)
Spell (holy, magic, curse, radiant).
Cost: Low mana.
Cooldown: 2 seconds.
Current rank: Bronze 8 (38%).
Effect (iron): Fires a single shot of light that deals 6 damage to whatever it strikes first. For its duration you shrug off 9% of incoming radiant. +8% for every 10% of health the target still has (max +48%), resolved 15s later. Each hit has a 38% chance of [Hope and Sunrise] -- bleeding the target and cutting the healing they receive, cumulatively for 15s. It closes 3 of your own wounds in the same breath. Every hit leaves Sear behind.
Effect (bronze): 15% of the damage spills onto two more foes nearby.
(next) Effect (silver): +10% critical chance with this ability.
Numbers now: 8 dmg · 2s cd · heals 38% of damage dealt · +9% radiant resistance · +8% for every 10% of health the target still has (max +48%), resolved 15s later · 38% chance of [Hope and Sunrise] for 15s (bleeding the target and cutting the healing they receive, cumulatively) · 7 mana
[Hope and Sunrise] (affliction, stacking, holy): Bleeding the target and cutting the healing they receive, cumulatively.
[Sear] (affliction, damage-over-time): Deals ongoing radiant damage for a few seconds after the hit.
```

```
Ability: [Daybreak’s Favor] (Light)
Special ability (recovery, healing, holy, magic, radiant).
Cost: Moderate mana.
Cooldown: 9 seconds.
Current rank: Silver 4 (84%).
Effect (iron): Restores 23 health to the ally who needs it most. It reaches past your own skin: what it mends, it mends for whoever is standing there. Whatever it reaches is frozen for a second and a half. The mending closes wounds a tenth further than it did.
Effect (bronze): The mending closes wounds a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The mending closes wounds a quarter further still.
Numbers now: restores 30 HP to the ally who needs it most · 9s cd · 17 mana
```

```
Ability: [Beacon’s Call] (Light)
Passive ability (holy, retribution, radiant).
Cost: None.
Current rank: Bronze 1 (61%).
Effect (iron): A standing field -- you are the brightest thing in the room and it hurts to be near. Enemies within 4 tiles gather a mark every 1.3s, up to 3 marks; each mark makes them take 2% more damage. Anything that attacks you while it is standing in the field takes 4 damage back. Yours carries Glimeron Mark: what stands in your field is left [Remote Cold Distance]. Stronger: enemies within 4.4 tiles gain a mark every 1.3s (up to 3); each mark makes them take 3% more damage; anything that attacks you from inside takes 6 damage back.
Effect (bronze): Adds: 20% chance per tick to inflict burn; stealthed enemies inside are revealed. Stronger: enemies within 4.9 tiles gain a mark every 1.3s (up to 4); each mark makes them take 4% more damage; anything that attacks you from inside takes 9 damage back.
(next) Effect (silver): Adds: +20% shadow resistance while inside; 32% chance per tick to inflict burn (stacks to 2). Stronger: enemies within 5.4 tiles gain a mark every 1.3s (up to 5); each mark makes them take 5% more damage; anything that attacks you from inside takes 12 damage back.
Numbers now: Sunfield: enemies within 4.9 tiles gain a mark every 1.3s (up to 4); each mark makes them take 4% more damage; anything that attacks you from inside takes 9 damage back; 20% chance per tick to inflict burn; stealthed enemies inside are revealed
[Sear] (affliction, damage-over-time): Deals ongoing radiant damage for a few seconds after the hit.
```

```
Ability: [White Glare] (Light)
Passive ability (holy, radiant).
Cost: None.
Current rank: Iron 7 (07%).
Effect (iron): Once your health falls below 50%, 20 mana comes back to you. There is a 6 second wait on it. It also regenerates 1.5 health a second, permanently. The working holds a tenth further than it did.
(next) Effect (bronze): The working holds a fifth further again.
Numbers now: below 50% health: restores 22 mana · 6s cd · +1.5 HP/s
```

```
Ability: [Counterweight Ward] (Balance)
Special ability (recovery, holy, magic, radiant).
Cost: Moderate mana.
Cooldown: 10 seconds.
Current rank: Iron 0 (30%).
Effect (iron): Raises a barrier that absorbs the next 24 damage and holds for 6 seconds. It is not a wall of its own -- every point it stops is taken out of your mana. Using it also restores 6 health. The mending closes wounds a tenth further than it did.
(next) Effect (bronze): The mending closes wounds a fifth further again.
Numbers now: absorbs 26 dmg, +11% armor for 6s (paid from your mana) · 10s cd · restores 6 HP · 17 mana
```

```
Ability: [Equal Plumb Line] (Balance)
Special ability (holy, magic, radiant).
Cost: Low mana.
Cooldown: 10 seconds.
Current rank: Bronze 3 (53%).
Effect (iron): A working of light. While it lasts, an escort of law fights beside you, striking for 4 every 1.4s. One affliction on you is lifted with it. A shield of 3 settles over you as it goes. The guard holds a tenth further than it did.
Effect (bronze): The guard holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: strips 1 effect from an enemy · 10s cd · escort strikes for 4 every 1.4s for 9s · 8 mana
```

```
Ability: [Tared Beam Closing] (Balance)
Special ability (recovery, holy, radiant).
Cost: Very low stamina.
Cooldown: 12 seconds.
Current rank: Silver 9 (99%).
Effect (iron): Increases your movement speed by 32% for 8 seconds. Using it also restores 4 health. The mending closes wounds a tenth further than it did.
Effect (bronze): The mending closes wounds a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The mending closes wounds a quarter further still.
Numbers now: +32% move speed for 10s · 12s cd · restores 4 HP · 4 stamina
```

```
Ability: [Harmonic Flow] (Balance)
Passive ability (holy, radiant).
Cost: None.
Current rank: Bronze 6 (76%).
Effect (iron): A knack that pays off only under one specific circumstance. You are +6% harder to hit while it holds. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: +12% damage vs foes below 50% HP · +6% dodge
```

```
Ability: [Wrought Scales] (Balance)
Passive ability (holy, conjuration, radiant).
Cost: None.
Current rank: Iron 2 (22%).
Effect (iron): Conjures a trinket of light that sharpens your killing strikes and returns 3 health for each kill. It also regenerates 1.5 health a second, permanently. The mending closes wounds a tenth further than it did.
(next) Effect (bronze): The mending closes wounds a fifth further again.
Numbers now: +5% crit chance · +0.16x crit damage · +3 HP per kill · +6 Max Mana · +8% Frost Resistance · +8% Fire Resistance · +1.5 HP/s
```

```
Ability: [Glimeron Rupture] (Glimeron)
Spell (holy, magic, area, radiant).
Cost: Moderate mana.
Cooldown: 6 seconds.
Current rank: Iron 5 (45%).
Effect (iron): Everything within reach is made to glance. The wavelength opens outward, and the light goes with it. When a strike from it misses or fails to crit, it has a 27% chance to be rolled again. Every hit leaves Sear behind.
(next) Effect (bronze): 15% of the damage spills onto two more foes nearby.
Numbers now: 13 dmg to all enemies within 4 tiles · 6s cd · 27% chance to reroll a failed strike · 10 mana
[Sear] (affliction, damage-over-time): Deals ongoing radiant damage for a few seconds after the hit.
```

```
Ability: [Starlight Pulse] (Glimeron)
Special ability (recovery, holy, magic, radiant).
Cost: Low mana.
Cooldown: 10 seconds.
Current rank: Bronze 8 (68%).
Effect (iron): A working of light. Using it also restores 6 health. Your critical chance rises 11% for 12 seconds. A mending settles on you afterwards: 1 health a second for 5s. A shield of 3 settles over you as it goes. The mending closes wounds a tenth further than it did.
Effect (bronze): The mending closes wounds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: strips 1 effect from an enemy · 10s cd · +1.3 HP/s for 7s (Numbing) · restores 6 HP · 8 mana
```

```
Ability: [Healing Lightwave] (Glimeron)
Special ability (recovery, healing, holy, magic, area, dimension, radiant).
Cost: Moderate mana.
Cooldown: 13 seconds.
Current rank: Silver 4 (14%).
Effect (iron): Restores 18 health to you and every ally within 5 tiles, and more the faster you cast. You finish it 120px from where the blow was aimed, +8% harder to hit for it. Your recovery rises 11% for 12 seconds. One ward on each of them is stripped away. A shield of 7 settles over you as it goes. The mending closes wounds a tenth further than it did.
Effect (bronze): The mending closes wounds a fifth further again.
Effect (silver): It comes back 10% sooner.
(next) Effect (gold): The mending closes wounds a quarter further still.
Numbers now: restores 23 HP (+1% per 1% cast speed) to you and allies within 5 tiles · 13s cd · +4 HP/s for 7s (Realignment) · 120px reposition · +8% dodge · 14 mana
```

```
Ability: [Wavelength Closing] (Glimeron)
Passive ability (holy, radiant).
Cost: None.
Current rank: Bronze 1 (91%).
Effect (iron): A permanent increase to one of your core statistics. It also regenerates 1 health a second, permanently. The working holds a tenth further than it did.
Effect (bronze): The working holds a fifth further again.
(next) Effect (silver): It comes back 10% sooner.
Numbers now: +7% crit chance · +1 HP/s
```

```
Ability: [Flare Closing] (Glimeron)
Passive ability (holy, radiant).
Cost: None.
Current rank: Iron 7 (37%).
Effect (iron): Each time you are hurt by anything other than fire, 5 mana a second comes back for 5 seconds. There is a 8 second wait on it. It also regenerates 1.8 health a second, permanently. The working holds a tenth further than it did.
(next) Effect (bronze): The working holds a fifth further again.
Numbers now: when hurt by anything but fire: 5 mana/s for 6s · 8s cd · +1.8 HP/s
```

### What this kit's target frame shows

Against a Slagward Drake at 74 of 180, with no perception and with six senses:

| Row | No senses | Six senses |
|---|---|---|
| Name | Slagward Drake | Slagward Drake |
| Rank | Bronze | Bronze |
| Health | 41% | 41% |
| Remaining | — | 74 / 180 *(deathWatch)* |
| Weak to | — | Frost *(weakspotCrit)* |
| Flaw | — | cracked shell *(flawSight)* |
| Resists | — | Fire 40%, Shadow 20% *(leySight)* |
| Truly | — | revenant *(unmask)* |
| Aware of you | — | yes *(counterSense)* |

---

## What to look at

1. **The parenthetical.** Every head line reads `(Sword)`, `(Wolf)`, `(Sin)` —
   the essence, as canon writes it. Before this round it read the template
   category, which the type line underneath already said.
2. **The percentage.** `(00%)`, `(07%)`, `(69%)` — two digits, always.
3. **The tags.** `holy` and `boon` now reach the ability line rather than only
   the affliction under it; a teleport is `dimension`; a decoy is `illusion`.
   Look at the Sanction's Light abilities for `holy` on a radiant spell.
4. **The bar.** Three different widths, and slots 13–16 carry chord labels
   (`L2+R1`, `R2+R1`, `L2+L1`, `R2+L1`) that did not exist before.
5. **The frame.** The right-hand column is what perception buys you, and the
   *(sense)* note says which sense bought it. `leySight` — the resistances row —
   is a field that two sense tables have been setting since round 114 with
   nothing anywhere reading it.

## What is NOT in these three

The generator has no way to roll the round-201 shapes yet — the transformation
template, a `Varies` cooldown, a two-pool drain, an hours-scale cooldown, the
`allyNotSelf` exclusion. Those are all reachable by a spec that declares them,
and the ten canon transcriptions in `abilityCanon.js` prove the card renders
them, but no socket rolls one. Teaching the generator to reach for them is a
round of its own, and it is the obvious next one: the vocabulary exists now and
nothing is using it.
