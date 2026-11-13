# NOAH'S ARKADE

An original local-first browser arcade game in development. Phase 1 is the illustrated title screen, custom logo, WebGL globe, and menu. Battles, digital cards, and online play are **not implemented**.

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

- Press **Enter**, **Space**, or click **PRESS START** to open the main menu (also skips intro).
- Use **Up/Down** or **W/S** to select, **Enter/Space** to confirm, and **Escape/Backspace** to go back.
- Mouse and touch can navigate the menu. All options are reversible.
- Under **OPTIONS**, adjust master/music/SFX volume, mute, reduced motion, grain, and rotating globe. Settings save in localStorage.

## Technical design

- Plain HTML/CSS/JavaScript and native **WebGL**, no cloud service or build step.
- A custom sphere mesh rotates beneath an original, illustrated cartographic texture.
- Synthesized menu tones use Web Audio *only after a user gesture*.
- Title, menu, and preview panels share one persistent scene. The gameplay entries intentionally say **coming later**.
- All assets are original for this prototype. The game's original Animal Kaiser inspiration is a *mechanics research reference*, not a source of copied assets.
- WebGL failure uses a static globe fallback; reduced-motion preference and options pause animation.

## Roadmap

1. **Phase 1 (current):** original arcade title, illustrated globe, main menu, preferences, responsive layout.
2. Phase 2: animal presentation and battle scene architecture.
3. Phase 3: verified reels, combat, health, special moves.
4. Phase 4: digital Animal/Strong/Miracle cards and binder.
5. Phase 5: rarity and cosmetic material skins (Doodle, Porcelain, Chrome).
6. Phase 6: local and networked multiplayer.

This is a design-review slice, **not** a complete game. Advanced graphics and gameplay will need later art/engineering passes.