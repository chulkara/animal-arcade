# Forestfall: pre-rendered Bear special move integration

**Status:** First integration committed on the private-review development branch `bear-moose-playable-roster-20261115`; not merged to the public site.

## Source clip inspected

- Local file: `Bear_performs_Forestfall_attack_44fce764_1080p.mp4`
- 14.93 seconds, H.264 MP4, 1920×1080, 24 fps, AAC audio, ~12.7 MB
- At the start Bear vocalizes in a forest clearing; around 3–4s it runs, around 4–7s it climbs the tree, around 7–10s it balances on branches, around 10–12s it launches and falls, and the ground impact with debris appears around 11–12s. The Bear recovers on all fours near the ending.
- **No opponent is visible in the rendered footage.** This is the major blocking issue for treating the video as a full species-independent attack animation. Use a separate game-engine hit reaction and a damage label rather than claiming footage contains an on-screen impact with Moose.

## Implemented first-pass feature

- Added **LOAD FORESTFALL VIDEO** / **PREVIEW FORESTFALL** in the battle screen footer.
- The selected MP4 or WebM is retained only via `URL.createObjectURL(file)` for this browser session. It isn't uploaded, cached in cloud storage, or committed. Selecting an invalid or oversized file shows a message.
- When the actual scored battle finishes a power reel and creates a successful **Bear Special** hit (`lastEvent.special===true`, `lastEvent.kind==='HIT'`, attacker species `bear`), `src/forestfall-video.js` opens the 16:9 cutscene in an accessible, fullscreen, skippable overlay. Ordinary Bear G/T/P moves, Moose attacks, ties, and failed powers do not activate it.
- An unobtrusive hit result appears at about 75.5% of the clip duration (11.27s for this recording). It uses the **existing** combat engine's actual opponent name and damage. It **never** applies, recalculates, duplicates or changes HP.
- The cutscene's existing sound is used where browser autoplay permission permits. Otherwise the player supplies a direct **PLAY FORESTFALL** button. Generic synthetic combat cues are suppressed while the clip is active to avoid audio overlap.
- The overlay closes at the natural end or on **SKIP CINEMATIC**, restoring the real battle's result / next-round controls. The original non-video special remains available when no clip has been loaded.
- **PREVIEW FORESTFALL** opens the clip without changing score and does not start while the reel is spinning.
- `index.html` loads the new standalone local video module + CSS after the original cinematic system; approved main menu painting and public `main` branch are unchanged.

## Local test

1. Check out `bear-moose-playable-roster-20261115`, run `python3 -m http.server 4173`, and open `http://localhost:4173`.
2. Enter a battle; select **LOAD FORESTFALL VIDEO** and choose the source MP4 from the user's computer (approximately 13 MB).
3. After a round ends, press **PREVIEW FORESTFALL** to test the cinematic immediately. A failed autoplay or unsupported file shows a manual Play option / Skip.
4. During a normal match, land a Bear `✦` special attack. The video should launch automatically. The real damage number and defender name appear near 11.3s, then the game's RESULT state appears when the video ends.
5. Verify no playback for ordinary Bear G/T/P attacks, Moose specials, ties or when no video is loaded. Verify Skip, tab focus, phone landscape, muted mode, navigation away, and replay across multiple rounds.

## Known limits / next production steps

1. A rendered MP4 **cannot directly animate the Bear's FBX bones** and cannot adapt its tree, camera, or target to a different 3D arena. It is a fixed cinematic, not a skeleton clip.
2. **The target collision is only implied.** A proper production version should either add a well-timed defender shot/reaction at contact, or re-author the tree climb/leap as source motion (Blender-baked FBX/GLB clips, compatible rig, obstacle geometry and scene camera).
3. The video is longer than a typical short arcade exchange. Evaluate a shorter edit (roughly 8–12s) after user acceptance. Avoid interrupting or preloading large videos over mobile networks without user choice.
4. This branch already had **six unrelated failing victory tests** before Forestfall was added, because an in-progress four-paw victory refactor changed the timeline without updating/finishing its test and runtime expectations. Do not attribute those preexisting failures to the new video feature. Keep the draft unmerged until addressed.
5. Review the user's rights to use and distribute the generated clip, and keep all unlicensed private 3D source media off the public release until confirmed.
6. For full parity, reuse the clip as an **animation and cinematography reference** for a real rigged climb, branch crouch, jump, landing, opponent reaction, roar and return to combat, with animator-controlled contacts and foot planting.

## Engineering ownership

- `src/forestfall-video.js`: local file management, event filter, playback, impact caption, lifecycle, accessibility and safe cleanup
- `src/forestfall-video.css`: 16:9 fullscreen cinematic styling, damage reveal and mobile layout
- `src/combat-ui.js`: battle import and preview controls
- `src/combat-cinematics.js`: suppress base attack sound when Forestfall video is playing
- `tests/forestfall-video.test.mjs`: source wiring and no-double-damage guards


## 2026-11-17: Scored hit and opponent reaction bridge

A previous check confirmed that selecting and manually previewing the MP4 works. This iteration focuses on the real match transition.

- On the actual Bear special `HIT`, the selected local movie runs fullscreen while the normal battle controls are inert (not rerolled or advanced). Escape, Skip, or the clip ending restores them.
- At **75.5% of the video duration** (approximately 11.27s of the supplied 14.93s Forestfall), a short target reaction inset identifies the *actual opposing roster animal* and animates its original silhouette being knocked backward. The inset includes the precise already-calculated damage amount, remaining HP and a short bar transition from inferred previous HP to recorded remaining HP. This **does not** apply damage a second time. The target inset fades after about 1.12 seconds.
- The inset is intentionally a **hybrid video/game cut-in**, not an invented rendered collision. The source Forestfall MP4 shows the forest/tree/dive/landing but **never includes Moose or any other defender**. The full production fix requires the original source 3D opponent, coordinated camera and source-compatible Bear climb/leap animation.
- The cutscene's audio is authoritative while playing; the base game's overlapping victory effects/fanfare are gated. Loading this optional video remains local to the current browser session, and no model/video bytes are uploaded or distributed.
- Added a Chromium smoke test simulating a genuine Bear-special result from a scored-attack-shaped fixture. It checks automatic triggering, correct opponent art, impact timing, actual remaining HP, an unchanged real match and restored controls after Skip. The older preview test still checks both spinning reel phases.
- Known unrelated branch blocker: earlier quadrupedal Bear victory tests remain red. Keep draft PR #12 unmerged and do not claim the whole game's visual rigging is finished.


## November 17 — Real imported Bear + Moose FBX collision (draft)

**What changed:** When both private Bear Motion Lab V2 and Moose Motion Lab V2 folders are loaded in a Bear-vs-Moose bout, the game now creates a short-lived, self-contained Three.js collision scene from **clones of the actual imported skinned 3D models**. This is a real skeleton-animation pass, not the SVG opponent-card overlay from the first integration.

**Source-frame inspection revises the contact time:** In the owner's 14.93s Forestfall MP4, the Bear is still descending around 11.65s, its paws land approximately 11.82s, and the big dirt/debris burst follows around 12.06s. The old 11.27s damage cue was early. The deterministic timings live in `src/forestfall-collision-core.js`.

The movie-to-live sequence:
1. **0–11.53s:** the original user-supplied video plays its climb and falling attack.
2. **11.53–11.82s:** match-cut to a forest-toned live Three.js camera containing the imported Bear and Moose. The Bear is posed/translated downward using deterministic root motion synchronized to the video's clock; the native Bear `S` clip is used for forelimb action.
3. **At ~11.82s:** native Moose `Hit_Stand_L01.FBX` (or `Death_Stand_R01.FBX` on KO) plays on the real local Moose skeleton. Its root moves backward while the Bear lands in the same 3D coordinate space. The original combat engine already owns the HP loss; the overlay only *reads* that result. A brief ring/dust accent helps hide the cross-cut.
4. **At ~13.22s:** return to the source video for the Bear's original end roar. After the MP4 ends, the app returns to the existing scored battle and its unchanged result.
5. **Preview mode:** uses the same live actors and native Moose reaction without modifying HP. It labels all result text `PREVIEW · NO HP CHANGE`.

**Fallback:** No local MP4 means the normal source FBX/procedural special. MP4 loaded but no suitable source Bear + Moose models, or WebGL unavailable, means the existing skippable video plus original non-scoring illustrated opponent reaction. Never invent a 3D collision when the required assets are absent. File bytes stay in the browser and are not committed or uploaded.

**Manual acceptance test on Mac:**
1. Update feature branch `bear-moose-playable-roster-20261115`, host `python3 -m http.server 4173`, open `http://localhost:4173` and hard-refresh.
2. Pick Bear against Moose and open **3D ARENA SETUP**. Import the entire extracted Bear and Moose Motion Lab V2 folders separately. The battle screen should report `LIVE BEAR + MOOSE FBX CONTACT READY` once the Forestfall MP4 is also loaded.
3. Press **PREVIEW FORESTFALL**. Inspect the approximately 11.53–13.22s transition. Verify both actual 3D models share a ground plane, Bear falls *onto* Moose rather than through it, Moose visibly reacts with its native animation at contact, and the video returns for the roar.
4. During a real special, verify accurate hit/KO selection, correct damage value, zero duplicated HP changes, Skip and Escape cleanup, no screen overflow on desktop and phone landscape, and no lingering duplicate models/canvases on subsequent attacks.
5. Record the source and actual 3D contact for a side-by-side critique. **Automated browser tests cannot validate the user-private FBX appearance, source texture assignment, interpenetration, exact bone pose or film-to-WebGL compositing fidelity.** Do not claim final arcade-quality visual acceptance solely from CI.

**Architecture:** `src/forestfall-collision-core.js` is pure deterministic timing and capability validation; `src/arena3d-runtime.js` constructs a bounded second WebGL scene and clones local rigged assets for the contact shot; `src/forestfall-video.js` owns movie playback, 3D window switch, actual damage captions, and cleanup; `src/forestfall-video.css` controls the shared 16:9 frame. A forest-tone version of the battle ground is used during the short collision; matching the user's private animal poses, camera angle and perspective precisely to the rendered MP4 remains a manual art-directing task.

**Release status:** Draft PR #12 only. User-approved menu pixel art and public `main` remain untouched. The prior Bear victory refactor is separately unfinished and has six failing unit tests.


### Frame and resource guardrails (November 17 QA)
- The live-FBX shot uses a widened perspective lens to keep the falling Bear's entire silhouette and the Moose's antlers inside its 16:9 stage. Final framing is subject to the user's private-model visual review.
- Source video continues playing beneath the brief 3D match-cut to preserve its audio clock; the ordinary underlying battle's render draw is suspended while the fullscreen cutscene is open, but its state/animation timeline continues toward the finished pose.
- The temporary secondary WebGL context and cloned actors are stopped and explicitly released on Skip, natural ending, navigation away, or page exit. Multiple preview sessions must not accumulate live renderers.
- If source WebGL rendering throws or loses context, the 3D match-cut is disabled for that playback and the video with original illustrated defender reaction continues, without modifying the scored battle.
- CI checks the video/match-cut state machine and fallback with synthetic browser fixtures; it cannot assert visual correctness of the user-private FBX meshes. The PR remains draft.
