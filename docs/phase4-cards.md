# Phase 4 — Digital cards and battle binder

## Scope and reference

The original arcade accepts up to one Animal Card, one Strong Card, and one Miracle Card per loadout. The Animal card selects the fighter; Strong improves fighting skills; Miracle adds a special effect. We preserve that three-part concept while inventing our **own** cards, names, balance, art treatments, and frontend.

Reference material:
- [Bandai Namco Animal Kaiser+ — How to Play](https://bandainamco-am.co.jp/am/vg/akplus/howto/)
- [Bandai Namco Animal Kaiser+ — Deckbuilding](https://bandainamco-am.co.jp/am/vg/akplus/recommendeddecks/)
- [Bandai Namco Plus operations manual, 2024, section 5-2-1](https://www.bandainamco-am.com/Ecommerce/Site/Content/PDFs/AK_PLUS_MANUAL_09.25.24.pdf)

## What ships in Phase 4

- **MY CARDS:** a 12-card collection with Owned/Locked states, counts, Animal/Strong/Miracle filters, and unlock progress.
- **BINDER:** edit a legal three-card battle loadout (Animal + optional Strong + optional Miracle) for Player 1 or Player 2. Each local player has an independent equipped deck but shares the same browser collection.
- **Starter set:** Blue Tiger, Golden Lion, Fang Standard, Oaken Guard, Falling Star, Dawn Chorus. Six additional Strong/Miracle cards are hidden until earned.
- **Rewards:** one random previously unowned card when a complete match ends, with duplicates after the catalog is unlocked. A reward is granted **once per finished match**, even if the victory screen rerenders. Rematches can earn new rewards.
- **Battle use:** select Tiger/Lion in Play, and that Animal card is automatically equipped for the active player. Strong boosts the damage of its matching attack feature (G/T/P); Miracle adds damage if the successful power result is ✦. Forest/sun Miracle affinities are a prototype-only matching bonus. Solo CPU currently does not draw card bonuses from your local binder.
- **Persistence:** localStorage saves ownership, player loadouts, and total completed duels. Browser reload preserves state on the same device/browser. Valid JSON export/import backs up or transfers the collection manually; imported IDs, inventory sizes, card types, and deck references are checked. An unavailable storage API falls back to session-only memory.
- **Accessibility:** cards have labels, equipped states, explicit Locked status, keyboard-operable controls, and a responsive two-column mobile grid.

## Honest limitations

This is **not a cloud-synced online binder yet**. There are no accounts, server, login, payments, real-world scanning, trading, online matches, or in-app purchases. A browser wipe can erase local saves if no backup was exported.

The twelve Noah's Arkade card designs and all effect coefficients are **original provisional values**, not reconstructed official Animal Kaiser card datasets. Additional historical effects will be researched and tested before any fidelity claim. Card art for the two animals reuses Noah's Arkade's existing original portraits, not proprietary card imagery. Strong and Miracle use CSS ornamental card fronts.

## Relevant implementation

- `src/cards-core.js` — catalog, safe local save schema, player decks, reward distribution, import/export, normalized combat modifiers
- `src/cards-ui.js` and `src/cards.css` — collection, deck management, responsive cards
- `src/prototype.js` — selected animal sync to a player's deck
- `src/combat-engine.js` — Strong/Miracle effect application with strict caps and result event details
- `src/combat-ui.js` — real effects and post-KO card reward
- `tests/cards.test.mjs` — catalog, saves, equip/validation, rewards, effects, anti-overflow behavior
- `tests/browser.smoke.mjs` — desktop and phone collection, save persistence, binder edits, completed battle reward and navigation

## Next milestone

1. Retune Strong and Miracle effects from additional verified gameplay and card references; introduce real activation/move sequences.
2. Finish card-front artwork/rarity material families (Doodle, Porcelain, Chrome) in Phase 5 **without modifying the approved main-menu painting**.
3. Introduce opt-in accounts, server-side inventory, cloud sync, and access controls in a future networked release. Do not claim local browser saves are synced across devices.
