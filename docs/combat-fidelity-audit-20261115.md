# Noah’s Arkade — Combat direction and arcade-feel audit
**November 15, 2026 · Draft PR #12 · Bear and Moose only**

## Reference material actually reviewed
- User capture A, `Screen Recording 2026-11-15 at 11.16.38 PM.mov`, **23.4 seconds**: current Noah’s Arkade menu, 3D Bear/Moose battle, results and G/T/P reel.
- User capture B, `Screen Recording 2026-11-15 at 11.19.23 PM.mov`, **76.37 seconds**: Animal Kaiser arcade reference, including attack/power reels, G/T/P prompts, miracle presentation, tiger/elephant cinematic action, impacts and victory.
- Original game operating manual: two-button green attack reel choosing G/T/P; yellow power reel choosing 10/20/30/40/50/special mark; ties reroll with charge; Animal/Strong/Miracle card roles. This verifies the **interaction rules**, not precise internal frame counts or hidden RNG.

### Source-observed contrast
**Current local capture:** Full-screen combat stage and model rigs are present, but most exchanges use a single fixed, shared orthographic angle. Health, status and damage popups occupy central battle space while the two animals largely stand face-to-face. Reel rolls are simple changing text. Outcomes and modal transitions interrupt the motion. A model's native clips play but do not have a designed edit.

**Arcade reference:** The HUD is present before the move; the spinning choices become much larger, high contrast and luminous when it is time to select. On move resolution, the camera cuts **away from the arena**. At roughly 14 to 21 seconds, the elephant and tiger get their own anticipation/impact/pose treatments, including stylized full-screen emphasis. At roughly 28 to 42 seconds, the action uses a much wider shot, close-up of the elephant, overhead view and terrain impact. Around 45 to 52 seconds, the win callout spans multiple compositions rather than holding a single pose. Around 59 to 70 seconds, the tiger receives a distinctive vignette (tree/scope staging followed by a forceful impact) rather than a generic shared swipe. These are **visual observations** only; they do not establish how the original developer implemented or cached the animations.

## What matters most and why

| Priority | Arcade element | Why it feels memorable | Noah's Arkade adaptation |
|---|---|---|---|
| P0 | Distinct G/T/P identities | Players identify a move even without reading labels | Unique, repeatable shot sheet + motion per animal/move |
| P0 | Cinematic camera grammar | A move reads as a composed action, not two static meshes | Establish → anticipating close shot → attack → contact → defender recoil → recovery |
| P0 | Victim-specific hit | Impacts sell power and change with the opponent | Reusable attacker sequence; defender's own Hit/KO clip and direction-specific displacement |
| P0 | Mechanical reel | The choice is the suspense peak | Actual rotating appearance, rolling neighboring values, lights, stop response, and audio |
| P0 | Victory montage | The climax rewards attention | Low hero → side orbit → high hero → final wide; distinct Victory native clip |
| P1 | Miracles | A card alters the spectacle, not merely a number | Reusable species-agnostic VFX intros, color coding and 3D effects tied to a card |
| P1 | Effects at point of contact | Camera shake, dust and recoil join to register a hit | Contact-frame stage lighting/flash/dust, impact cue and reaction pose |
| P1 | Cinematic edit rhythm | Calm → suspense → attack → release creates anticipation | One deterministic timed timeline across UI, audio and local Three.js |
| P1 | Stage-dependent move sets | Tree or cliff leap feels iconic | Original move-specific staging environments designed separately; no licensed assets copied |
| P2 | Real sound mastering | A slot machine and large animal need different transients | Original synth cabinet click, filtered impact noise, miracle swell, victory melody |
| P2 | Readable HUD | Information is present without covering the star action | Keep HP + duel context at top; suppress bulky result cards during film sequences |
| P2 | Accessibility and user pacing | Replays and comfort should be choices | Reduced-motion skips film effects; proper next-round actions after cinematic |

### Implementation delivered in this pass
- `src/combat-cinematics-core.js`: original deterministic storyboards for Bear G/T/P/S and Moose G/T/P/S, stage cameras and timing from the actual Bear clip lengths or Moose V2 procedural scores; universal Miracle types; four distinct victory angles. Shot selection depends on the **attacker's move**, while victim shot framing is mirrored and hit reaction uses the actual opponent.
- `src/combat-cinematics.js` / `src/combat-cinematics.css`: letterboxed intro/action/contact/reaction/victory phases, graphics and titles, attack label during the build-up, timed suppression of intrusive result panels and restoration of normal controls afterward. Placeholder illustrations still work.
- `src/arena3d-runtime.js`: 3D camera follows the film storyboard, attacker approaches a contact point, defender responds via native hit/knockout clip; **Miracle is staged before the animal attack** rather than playing both simultaneously; reusable source-independent 3D starfall, storm, tide, eclipse, dawn, contact dust and victory sparkles.
- `src/arcade-reels.css` + `src/combat-ui.js`: original machine-style G/T/P and power reels with visible neighbors, rotating roll effect, lights, mechanical stop response. Reel RNG/battle engine semantics unchanged. Original audio is supplemented with stop, impact, miracle and victory cues.
- `tests/cinematics.test.mjs`: fixed/independent move stories; staged camera; cross-species miracle; four-shot victory; combat/3D/audio wiring. Existing gameplay and menu integrity tests remain.
- **Private 3D assets** stay in the user's computer/browser. The approved painted menu is untouched. No original game's proprietary meshes, audio, sprites or cutscene frames are embedded.

### Important boundaries and outstanding craft work
1. This is an **implemented cinematic foundation**, not a claim to match the source game's finished rendering or animation polish. It is not an identical copy of the original's protected animations, effects or artwork.
2. The real FBX **visual pass cannot be performed in public CI** because the private Bear/Moose asset licenses are unverified. A Mac test using the reviewed V2 packs must confirm posture, contact distance, skeleton bindings, clipping, height/grounding, camera cuts, framerate, hit reaction, Victory clips and all miracles.
3. The current source animations remain the **reviewed** Bear/Moose clips. Signature moves now have separate repeatable camera cuts but are **not yet fully bespoke, authored scene-by-scene cutscenes with special scenery**. A signature tree-leap equivalent is a future original environment for the future Tiger branch, which remains paused.
4. Miracle card effects currently apply their existing numeric bonus when the special mark wins, plus a newly implemented reusable visual effect. Additional arcade-like strategy effects such as all-big/slot restrictions, guard, slot jammer and revive would need distinct rules and tests before claiming game-mechanics parity.
5. Accept with user footage recorded from a Mac 3D-loaded match; tune hit frames and camera shots per move. Keep this PR draft and public Pages unmodified until that review and rights clearance.
