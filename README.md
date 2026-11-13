# NOAH'S ARKADE

An original local-first browser arcade game in development. Phase 1 now uses the approved, untouched 1672×941 Noah's Arkade painting as its interactive main menu. A previous WebGL title/menu remains as a safe fallback. Phase 3 adds a **playable original slot-combat prototype**, with technique and power reels, real HP, tie rerolls, victory and rematch. Phase 4 adds a **12-card original digital collection**, separate player loadouts and Strong/Miracle bonuses that influence battles. Card ownership is saved **in this browser only**; cloud accounts, full move cinematics, exact historical balance and online play are **not implemented**.

## Run locally

Python 3 required (no npm packages or accounts needed):

```bash
python3 -m http.server 4173
```

Open http://localhost:4173 in your browser. For the automated checks (Node 20+):

```bash
node --test tests/*.test.mjs
```

For a local network: use `python3 -m http.server 4173 --bind 0.0.0.0` only when you intentionally want other devices on your network to reach the game. Never expose this test server publicly.

## Controls

- When the original painting loads, the game opens directly on its illustrated menu; select **PLAY**, **MY CARDS**, **BINDER**, **SHOP**, or **SETTINGS**.
- **MY CARDS** shows owned and undiscovered cards; **BINDER** lets you equip one Animal, one Strong and one Miracle for each local player. Complete a battle to earn a card. Export/import JSON to back up saves. The binder is local-only, not online-synced.
- **PLAY** opens single-player, local two-player, Edit Binder, and How to Play. Selecting a mode opens animal selection; choose an original Tiger or Lion portrait, then see the two-animal battle-stage preview. In two-player mode, each person chooses in turn on the same device. Choose **BEGIN INTRO → START BATTLE** to play the prototype. Use the **green** button to stop the G/T/P attack slot, then **yellow** to stop the power slot. Higher power hits; ties reroll. Press **G**, **Y**, or **Space** as shortcuts. It is not a full historical recreation.
- If the approved painting cannot load, **Enter**, **Space**, or **PRESS START** opens the previous fallback menu.
- Use **Up/Down** or **W/S** to select, **Enter/Space** to confirm, and **Escape/Backspace** to go back.
- Mouse and touch can navigate the menu. All options are reversible.
- Under **OPTIONS**, adjust master/music/SFX volume, mute, reduced motion, grain, and rotating globe. Settings save in localStorage.

## Technical design

- Plain HTML/CSS/JavaScript and native **WebGL**, no cloud service or build step.
- The approved menu artwork is stored losslessly as twenty text-safe PNG fragments under `assets/approved-menu-png/`. The Pages workflow reconstructs and checksum-verifies the **exact original PNG bytes** into a single image. The runtime falls back to assembling the source fragments if needed. No resizing, repainting, or recompression of the source artwork occurs. The normal browser layout shows the full painting at its original aspect ratio; on narrow phones a separate reachable menu appears below it.
- The fallback experience uses a custom sphere mesh beneath an original, illustrated cartographic texture.
- Synthesized menu tones use Web Audio *only after a user gesture*.
- The approved main menu overlays accessible, keyboard-operable hit targets precisely over the five painted buttons. Preview panels reuse the scene, and gameplay entries intentionally say **coming later**.
- The test suite verifies the reassembled PNG against its exact SHA-256 digest.
- All assets are original for this prototype. The game's original Animal Kaiser inspiration is a *mechanics research reference*, not a source of copied assets.
- WebGL failure uses a static globe fallback; reduced-motion preference and options pause animation.

## Roadmap

1. **Phase 1 (current):** original arcade title, illustrated globe, main menu, preferences, responsive layout.
2. **Phase 2 (prototype):** two-animal selection, solo automatic rival, two-player sequential selections, responsive battle arena, and a reversible intro; real combat comes later.
3. **Phase 3 (initial prototype):** verified two-slot input model, G/T/P, power comparison, tie rerolls, original damage balancing, actual HP and KO. Next: proper card-driven moves and battle cinematics.
4. **Phase 4 (released):** collectible Animal/Strong/Miracle cards, one-card-per-type loadouts for both players, unlock rewards, working combat modifiers, local save and JSON backup.
5. **Phase 4.5 (in progress):** improve the game itself before expanding skins: cinematic original arenas and move feedback, performance-consistent reel timing, original combat sounds, three-victory solo run with HP carry, first-to-two local matches, researched historical rules and final art/motion polish. See [Phase 4.5 vertical slice](docs/phase45-vertical-slice.md).
6. **Phase 5 (deferred until core gameplay is polished):** rarity and cosmetic material skins (Doodle, Porcelain, Chrome).
7. **Phase 6:** local and networked multiplayer.

See [Phase 3 mechanics](docs/phase3-combat.md) and [Phase 4 cards and binder](docs/phase4-cards.md). This is a playable prototype, **not** a complete game. Advanced graphics and gameplay will need later art/engineering passes.
## GitHub Pages

The `.github/workflows/pages.yml` workflow publishes the static website from `main`. The separate verification workflow runs Node tests and Chromium smoke tests on desktop, tablet, and phones. The original menu painting is never modified by Phase 2, Phase 3, Phase 4 or Phase 4.5.
