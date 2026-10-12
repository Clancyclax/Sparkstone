# Round 319 — fight music, Olb's sprite, Prism's sewer attack (2026-10-10)

## His words

Four new tracks (Mountaintop Requiem, Jungle Combat Music, Desert Battle Music, Intense fight music), "a sprite for the mentor character. Scale the character to the player size." Then: "Olbs sword stance also has an attack animation" and "Added an attack animation for Prism while she's still in the sewers."

## Where the music goes (you chose "regional combat + Requiem as the Elehyd theme")

- **Jungle Combat:** a fight in Bratugal or Ixcuatl (the two jungle regions).
- **Desert Battle:** a fight in Sirukh Sands or the Cinderwaste.
- **Intense Fight:** a fight anywhere else (the Nek, Ontaria, Elehyd).
- **Mountaintop Requiem:** Elehyd's wilderness at **night**. By day Elehyd keeps its own track, and Karsk Landing and the other settlements keep theirs. If you wanted it elsewhere (day, or in place of the Elehyd track) it is one line in `audio.js`.
- A "fight" is monsters actually coming for you outdoors: two chasing within 600 px, or one within 260 px, held ten seconds after the last so a lull does not cut the track. The boss and surge tracks still outrank it; the sewer, caves and rooms keep their own scores.

## Olb Nikobe

- His own art, `npc_olb_nikobe` (standing, running, and the sword-in-hand stance shift as his attack sheet). The hall's Olb and the Olb who fights beside you both wear it. Scaled to the player: his standing pose is 76 px tall against the player's 63, so he is drawn at 0.829.
- His sword stance clip is the one attack animation in that folder, and it is what the attack sheet plays.

## Prism

The bald (sewer) look gets her attack: 13 frames a direction, played once through per swing. Her armed look is unchanged.

## Tests

`test_round319.cjs` (25 checks): the music rules, the fight detector, Olb's sheets and scale, Prism's sheet. Round 124 (Prism) is updated for her new attack and passes; 77a, 315, 316 pass. Round 172's walks has two failures that predate this round (verified on the previous commit); rounds 68, 71 and 73 cannot start (missing harness file, old).
