# Phase 3 — combat foundation (original prototype)

## Verified source rules
The original **Animal Kaiser** cabinet is a two-button, card-assisted slot-battle game. We are adapting the publicly described *interaction* as a starting point, not copying its graphics, audio, characters, animations, or code.

- **Green** stops the Attack Slot to choose a fighting feature (G/Guts, T/Technique, P/Power).
- **Yellow** stops the Power Slot. Published values are 10, 20, 30, 40, 50, and a special fighting-feature mark.
- A higher power result wins that exchange; a tie rerolls with an escalating tiebreak charge.
- Attacks continue until an animal's HP reaches zero.
- Animal / Strong / Miracle cards are distinct categories. Card-based effects and exact historical damage formulas have not been verified or implemented.

Sources:
- Bandai Namco official overview: https://bandainamco-am.co.jp/am/vg/akplus/howto/
- Bandai Namco operation manual (sections 7-2-1 to 7-2-3): https://www.arcadepunks.com/wp-content/uploads/2017/09/animalkaisermanual.pdf
- Bandai Namco official Animal Kaiser product info: https://bandainamco-am.com/collections/animal-kaiser

## What this branch implements
- Start from approved menu → Play → Solo / Local Duo → Animal selection → staged battle → Start Battle.
- Working G/T/P slot and 10–50/✦ power slot, with matching cabinet-color buttons.
- Local 2-player passes control from P1 to P2. Solo mode assigns CPU choices.
- Tie rerolls with an explicit charge bonus. Bigger power determines who hits.
- Health really changes, can reach zero, and triggers a winner/rematch state.
- Responsive controls and keyboard shortcuts: G for green, Y for yellow, Space to stop the active slot, Escape back to the arena.
- Independent, testable state engine, browser UI, deterministic unit tests, and complete browser journeys.

## Explicit prototype choices (not original-arcade facts)
- Base HP: 180 per animal.
- Damage formula: `round(18 + rank*0.5 + attack bonus + tieCharge*12 + markBonus)`.
- Attack bonuses: G = 14; T = 8; P = 18. These give a visible difference but are **not** arcade accuracy claims.
- ✦ mark outranks 50, and when the winner rolled ✦ it gets a 20-point bonus.
- CPU temporarily selects moves uniformly at random.
- The first battle ends at a single KO. Full arcade match format and later rounds/bosses will be designed separately.

## Not implemented yet
- Animal/Strong/Miracle cards, card stats and synergies, true move datasets, cinematic attacks, balance calibration against video/manual, three-round progression, persistence, collection/binder, real multiplayer network mode.
- No use of external game's copyrighted media or source files.

## Release criteria
1. Node engine tests: solo, local duel, technique/power sequence, ties, special mark, damage, KO, rematch, invalid inputs.
2. Chromium smoke: approved menu still loads unaltered; solo and duo fights run at desktop and phone dimensions without JS errors; Escape back works.
3. GitHub Pages build assembles the exact original PNG and confirms SHA-256 before publishing.
4. Release only if CI is green and visual inspection does not show overlay/cropping regressions.
