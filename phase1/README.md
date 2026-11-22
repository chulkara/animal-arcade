# Noah's Arkade — Phase 1: painted title & menu (desktop)

The approved menu painting is the screen. This project rebuilds only the interaction
around it: intro, PRESS START, selection, button feedback, panels, sound and settings.
Desktop only (minimum window 960 × 540). Lives in `phase1/`; the root game is untouched.

## Run

```bash
cd phase1
npm install
npm run dev        # http://localhost:5173  (assembles + verifies the painting first)
npm run build      # production build → phase1/dist
npm test           # unit tests
npx playwright install chromium && npm run test:e2e
```

Flags: `?skipintro`. Keys: ↑ ↓ ← → (or W/S) move · Enter/Space select · Esc/Backspace back · M mute. Standard gamepads work.

## The painting stays exact

- `scripts/build-approved-art.mjs` decodes `../assets/approved-menu-png/part-*.txt` into
  `public/art/approved-menu.png` byte-for-byte and refuses to continue unless the SHA-256 is
  `90fffe36…49fc9f4`. The PNG is generated, not committed, like the root project.
- It is displayed whole at "contain" size (never cropped, stretched or filtered). The letterbox is a
  blurred, darkened copy so the bars look intentional. A browser test checks the served bytes,
  the 1672 × 941 aspect ratio and `filter: none`.
- Everything else is an overlay positioned in the painting's own pixel coordinates (buttons measured
  from the art), scaled with container units so it tracks any window size.

## Interaction design

- **Intro:** a CRT power-on (beam, then the shutters part, a soft bloom). About 2 s on the first visit,
  about 1 s afterwards, instant with reduced motion. Any key or click skips it.
- **Title:** a blinking PRESS START plate in the painted button style, at bottom centre between the
  painted hints. On start it blinks fast, then the five painted buttons flicker on top to bottom.
- **Selection:** with PLAY selected, *nothing* is drawn over the art: the painting is the selected
  state. When the cursor moves, PLAY is redrawn unlit (charcoal, like its siblings), its painted arrows
  are softened with colour-matched patches, and the chosen button lights up in the painting's yellow
  with gliding arrows and a one-off shine. ← → work too, matching the painted "Navigate" hint. A press
  flashes the button and pinches the arrows before the panel opens.
- **Panels** unfold out of the button that opened them and sit over the menu column, so the logo and
  animals frame them. Same language: charcoal plate, cream double rule, chamfered corners, yellow
  "lit" rows, pixel lettering (Tiny5 / Pixelify Sans, SIL OFL).
  - PLAY → Select Mode: 1 PLAYER and 2 PLAYERS (marked SOON, soft "not yet" buzz), HOW TO PLAY (short rules).
  - MY CARDS → empty Animal / Strong / Miracle slots. BINDER → empty pockets. SHOP → closed sign.
  - SETTINGS → master / music / effects volume, sound on/off, motion (auto / full / reduced),
    optional CRT lines (off by default), restore defaults. Saved in `localStorage` (`noahs-arkade.settings.v2`).
- A single glint crosses the painted compass star every few seconds on the title and menu screens.
- **Sound:** original Web Audio synthesis (FM bell ticks and confirms, start fanfare, CRT power-on,
  "not yet" buzz, a quiet generative loop). Nothing is created until the first input.

## Tests

- Unit (Vitest, 15): state machine, preserved selection, wrap-around, button geometry inside the art,
  settings validation and persistence, input bindings.
- Browser (Playwright, 39 = 13 × 1440×900, 1920×1080, 1280×720): exact art bytes and aspect, title
  with nothing drawn over the buttons, intro skip, click to start, lit/unlit selection behaviour,
  every panel and back with the selection kept, mouse flow, play-mode honesty, settings persistence,
  mute, system reduced motion, no AudioContext before input, and the desktop-only notice.

## Known limits

- When the cursor leaves PLAY, the warm glow the painting puts around PLAY is softened, not removed.
  Covering it fully would mean repainting the art.
- Overlay lettering uses Tiny5, which is close to but not identical with the painted button lettering.
- Battles, cards, binder and shop are previews only, and each says so.
- Not yet tested on real GPUs or speakers; check frame pacing and the mix on your Mac.
