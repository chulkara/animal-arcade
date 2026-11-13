# Phase 4.5B — reference-footage battle rebuild

**Reference:** user-supplied 98-second screen recording, `Screen Recording 2026-11-13 at 1.55.27 PM.mov`. Original game shown: *Animal Kaiser*. Do not commit, distribute, extract into product, or embed any original game audiovisual assets. This file is for **shot-by-shot design analysis only**. Noah's Arkade must retain its own hand-painted retro-Asian natural-history visual language, approved menu painting, creature designs, UI assets and synthesizer audio.

## Corrections to the previous approach

The prior Phase 4.5 build is a **panel-based dashboard**: two animal portraits boxed into columns, large text blocks before/after combat, and a separate reel beneath a card-like scene. The supplied gameplay video is a **single continuous arcade stage**, not a dashboard. Fix the layout and *sequence*, not merely colors or gradients.

## Footage breakdown (approximate timestamps sampled)

| Time | What the reference does | What Noah's Arkade needs |
| ---- | ----------------------- | ------------------------ |
| 0–33 s | Branded attract sequence, camera-led animal action, quick cinematic showcases | Retain exact approved menu art; later add original attract-mode animation/sequence; no copied Animal Kaiser imagery |
| ~39–43 s | Big left/right 1P/2P mode choice with huge green/yellow buttons | Mode selection should have immediate controller-like affordances and a strong screen-to-screen transition |
| ~44–48 s | CPU Normal/Strong difficulty choice | Add a real CPU difficulty selection later, changing selection policy, not merely a label |
| ~49–57 s | Animal / Strong / Miracle scan selections, large animal preview | Seamlessly integrate existing digital Animal/Strong/Miracle binder; show loadout feedback, not card readers |
| ~60–65 s | Battle opens on large 3D stage; BOTH creatures visible; life/feature bars across the very TOP; slot controls across the full BOTTOM | Full-bleed arena composition with a compact top HUD, creatures occupying middle ~65%, reel/controls along bottom |
| ~66–80 s | Tutorial calls out green attack reel, then yellow power reel, with on-screen arrows. Arena remains visible throughout | Overlay small prompts and highlight appropriate green/yellow control, never navigate to a separate rules panel |
| ~80–90 s | Reel values hold, attack selection count/confirmation flashes; scene continues | Build a real anticipation → confirmation → power comparison → strike state, not instant result panel |
| ~90–98 s | Hard cut to an attack camera: environment, model poses, lighting, attack text/impact; spectacle replaces HUD | Dedicated cinematic layer with camera changes and authored animal pose sequences; no floating static portrait as the end goal |

These are scene/interaction references, **not evidence of exact original damage coefficients or move datasets**. Original rules and calculations are tracked separately in `docs/phase45-vertical-slice.md`.

## New mandatory composition

1. **Top 12–16%**: two horizontally opposed health/status strips; animal names, HP health gauges, compact fighting features and bout count. No wide dashboard heading. Distinct labels/non-color status for accessibility.
2. **Center 63–70%**: one uninterrupted arena frame with two creatures, distinctive environment, ground/contact shadows, camera depth and animation. Do not put fighters inside rectangular UI cards; no CSS-only mountains as the final art.
3. **Bottom 18–24%**: large mirrored fighting/power slots integrated into the arena, with green and yellow tactile stops; clearly legible numeric values and ✦; all input remains keyboard/touch operable.
4. **Tutorial** is a temporary central overlay/pointer, keeping the scene visible. Use a real control guide, not a permanent dense paragraph.
5. **On result**: hide/suppress slot dock during a short cinematic shot. Show attack announcement, contact, damage, recovery. Only then present next action, with a replay/test shortcut for development.
6. **Menu** is immutable: the approved painting must have the same original SHA-256 `90fffe36338fc7c939c5e41c62a656a83532f0c1e3254b05cefd6bb9249fc9f4`.

## Art bible

- Original indie Asian natural-history illustration: warm aged paper/ink borders and hand-painted texture on menus and card collection; in combat, large illustrated creatures with controlled palette of indigo twilight, ochre, olive, natural stone, and sunlight.
- Dramatic realism in animal form/weight, but recognizably **illustrative**; avoid shiny stock-photo portraits or generic neon AI game UI.
- Target separate independently authored action poses/rigs: idle, anticipation, lunge, contact, recoil, recovery, special, fall, celebrate, victory. No single still image scaled side-to-side as a final animation.
- Camera blocking: establishing two-shot; medium over-shoulder anticipation; fast push-in to attacking animal; contact close-up; snap return to two-shot.
- Audio: independent original score and authored impact/creature effects; dynamics linked to camera and animation, not just the current one-off confirmation synth.

## Milestone strategy

**4.5B1 / shipped next:** replace dashboard composition with an arena-first prototype (HUD / full stage / dock) and reference-aligned tutorial overlays. Keep existing playable engine and painted menu. Automated responsive and accessibility tests must pass.

**4.5B2:** original 2D-rigged or 3D animal animation pipeline with real pose sequences and original scenic environments. Build Tiger vs Lion only.

**4.5B3:** timing and rules: special attacks, damage and card behavior backed by video/manual evidence; CPU Normal/Strong modes; calibrated reel rhythm, sound/camera sync.

**4.5B4 / quality gate:** full Tiger/Lion vertical slice is playtested for latency, weight, distinct moves, readable flow, enjoyable decisions and long-session performance on desktop/mobile. Only then extend roster/skins.

## Acceptance tests for B1

- At battle resolution 1440×900, stage + controls occupy virtually entire game viewport (not a centered 1000px panel).
- Health bars are consistently visible at the top with semantic progressbar values.
- Creature frames cannot overlap the bottom reels, and green/yellow buttons remain visible at 390×844 and 844×390.
- Tutorial prompt points to the correct slot and updates as state advances.
- Playable stop/resolve/tie/KO/rematch and existing binder rewards remain intact.
- Reduced-motion mode eliminates shake/lunge flashes but retains every critical value.
- The approved menu PNG has its exact original checksum.
- A screenshot/film comparison against this reference is reviewed before any declaration of visual completion.

**Honesty:** B1 is still a transition toward the quality target, not a match of the original's complete 3D presentation. Never label a dashboard reposition as “full arcade recreation.”
