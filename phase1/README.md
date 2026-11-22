# Noah's Arkade — Phase 1 (fresh rebuild): title screen & main menu

A self-contained rebuild of the Phase 1 brief: cinematic intro, original logo, illustrated
rotating globe, PRESS START, the five-entry main menu, preview states, working options
and procedural sound. It lives in `phase1/` and does not touch the existing game at the
repo root, the approved menu painting, or the Bear/Moose work on PR #12.

## Run it

```bash
cd phase1
npm install
npm run dev            # http://localhost:5173 (localhost only)
npm run build          # type-check + production build to phase1/dist
npm run preview        # serve the build on http://localhost:4173
npm test               # unit tests (Vitest)
npx playwright install chromium && npm run test:e2e   # browser tests
```

To open it on another device on your network, run `npm run dev -- --host` explicitly.
Works on macOS and Windows with Node 18+. No backend, accounts or paid services.

Useful URL flags: `?skipintro` (short intro), `?nowebgl` (force the CSS fallback globe).
Keys: ↑/↓ or W/S move · Enter/Space confirm · Esc/Backspace back · ←/→ adjust options · M mute.
A standard gamepad works too (D-pad, A = confirm, B = back, Start).

## What's in it

| Area | Implementation |
|---|---|
| Navigation | `src/app/navigation.ts` — pure state machine: BOOT → INTRO → TITLE → MAIN_MENU → SOLO / MULTIPLAYER / BINDER / HELP previews and OPTIONS. Back preserves the menu selection. Any input during the intro goes straight to the menu. |
| Intro | ~3 s first visit (globe silhouette → light → logo layers settle → PRESS START); ~1 s on later visits; instant under reduced motion. Skippable at any moment. |
| Logo | `src/components/logo/` — vector artwork, not live text. Letter outlines were extracted from Abril Fatface (ARKADE) and Cinzel (NOAH'S) by `scripts/build-logo-glyphs.mjs`, then arranged on a marquee arch with a bespoke K whose leg becomes a swash, a 9-layer indigo extrusion, inner bevel, banded arcade gold, printed grain, a vermilion ribbon and an original globe-and-ark crest. Variants: `full`, `compact`, `mono`; the crest doubles as `public/favicon.svg`. |
| Globe | `src/graphics/globe/` — a real Three.js sphere (orthographic camera, lazy-loaded). Custom shader: soft painted light banding, warm amber terminator, gilded sheen on water only, engraved 15° graticule, cobalt-to-gold rim light, 4×4 ordered dither. A halo pass draws a celestial ring with engraved ticks; 320 deterministic stars twinkle with slight pointer parallax. Rotation eases in and out, never resets, pauses when the tab is hidden, and everything is disposed on unmount. If WebGL is missing or the context is lost, a CSS globe (same texture in a shaded disc) takes over in the same position. |
| Globe texture | `scripts/generate_globe_texture.py` (numpy/Pillow, fixed seed) paints a *fictional* world: domain-warped continents sampled in 3D so the map has no seam, hand-coloured washes in ochre, sage and umber, ink coastlines, engraved coastal water-lines, hatched ridges, mottled ultramarine oceans and parchment grain. Output: `public/textures/*.webp` (2048 px plus a 1024 px version for small screens). |
| Menu | Direction B (illustrated adventure): the logo moves to the upper left, the globe slides right inside its ring, and the menu sits lower left. The selected entry gets a gilded arrowhead, gold lettering, a 12 px shift and a painted brush underline; a caption describes each entry. Hover selects, click activates, and focus follows keyboard selection. |
| Previews | 1 PLAYER "Solo Expedition", 2 PLAYERS (Local / Online duel, both marked *planned*), MY BINDER (empty binder spread with one original card back), HOW TO PLAY (cards and the two reels, marked as arriving with gameplay). Every preview says plainly that the feature isn't playable yet. |
| Options | Master / Music / SFX (0–10, segmented), Sound on/off, Motion (Follow system / Full / Reduced), Globe rotation, Film grain, Restore defaults. Saved to `localStorage` (`noahs-arkade.settings.v1`). Every option has a real effect. |
| Audio | `src/audio/audioManager.ts` — all original Web Audio synthesis, no sample files: FM-bell select/confirm/back cues, a start fanfare, a reveal swell, and a quiet generative title loop (modal pad chords plus pentatonic plucks through a tape-style echo). The AudioContext is only created on the first user input (this is tested). Bus levels ramp smoothly to avoid clicks, and echo sends follow their bus volume. |
| Input | `src/input/controls.ts` — keys and gamepad buttons map to semantic actions. Future green/yellow battle buttons are declared per player but deliberately not bound in the menu. |
| Tokens | `src/styles/tokens.css` — colour, type, space, motion and z-layer tokens. Type: Cinzel (menu), Cormorant Garamond (secondary), IBM Plex Mono (cabinet cues). |

## Tests

- **Unit (Vitest, 21):** state machine paths, wrap-around, preserved selection, late intro timer, settings round-trip/corruption/clamping, perceptual bus gain, reduced-motion resolution, key bindings, and globe-on-screen checks at 1920×1080, 1440×900, 1366×768, 1280×720, 390×844 and 844×390 in every stage. The last of these caught a real clipping bug on landscape phones.
- **Browser (Playwright, 29 across desktop 1440×900, portrait 390×844 and landscape 844×390):** title renders without console errors or overflow, intro skip, click-to-start, the keyboard journey through all five states and back, mouse hover/click/back, 44 px portrait tap targets, options persistence across reload, mute persistence, the system reduced-motion preference, the CSS fallback without WebGL, and no AudioContext before the first input.

Browser tests ran in Chrome with SwiftShader (software WebGL), so they show correctness and layout, not GPU frame rate.

## Assets & licences

- All artwork (logo arrangement, crest, ornaments, selection marker, card back, globe texture) and all audio are original to this project, generated in code or by the scripts above.
- Fonts (bundled locally via `@fontsource`, SIL Open Font License 1.1): Abril Fatface, Cinzel, Cormorant Garamond, IBM Plex Mono. The logo uses outlines derived from Abril Fatface and Cinzel, which the OFL allows in artwork.
- Libraries: React (MIT), Three.js (MIT).
- No Animal Kaiser logos, art, sounds or text are used.

## Known gaps / honest notes

- **No illustrated animals yet.** The brief allows one or two. I chose none rather than a weak vector tiger; the animal-related elements here are the ornamental tiger-stripe flick on the marker and the heraldic curls. A hand-painted animal (blue-tiger or red/black emblem direction) is the clearest next art task.
- Frame rate was not measured on real GPUs here; check on your Mac and a mid-range Windows laptop.
- The music and cues have not been mixed on real speakers; levels may need tuning.
- The fallback globe is a 2D approximation. It fills the same spot on screen but has no real lighting.
- On very short landscape phones the binder preview shows one row of slots, and long panels scroll.
- No CI workflow has been added for `phase1/` yet. The repo's `verify.yml` only covers the root game.

## For Phase 2

Battle scene architecture (Three.js scene manager or a Phaser evaluation), the animal roster and art pipeline, wiring `FUTURE_BATTLE_BINDINGS` to the reels, rules verified against official Animal Kaiser material, and deciding how this shell and the root prototype converge.
