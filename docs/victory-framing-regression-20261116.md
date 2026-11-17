# Bear regression review: 9:49 AM footage versus 9:13 AM and original arcade

**Scope:** draft PR #12, `bear-moose-playable-roster-20261115`. User requested that the earlier better-looking version be the baseline, especially that the Bear victory fully fit the frame.

## Source recordings directly inspected

- New **regressed take**: `Screen Recording 2026-11-16 at 9.49.11 AM.mov`, 23.27 seconds, 2624×1628 at 60 FPS.
- Previous **better take**: `Screen Recording 2026-11-16 at 9.13.41 AM.mov`, 24.42 seconds, same resolution and frame rate.
- **Original-game reference**: `Screen Recording 2026-11-16 at 9.17.32 AM.mov`, 42.07 seconds, same resolution and frame rate.

Frames sampled and compared at approximately 0.6, 2, 3.7, 5.5, 7.2, 9.1, 11, 13, 14.8, 16.4, 18, 19.5, 21 and 22.5 seconds, with separate reference frames spanning its battle, special, impact and victory sequence.

## Root-cause diagnosis

1. **Victory close-up had become a torso crop.** In the 9:49 recording, the first victory angles are already uncomfortably tight and the final ~17–21s is almost nothing but Bear fur. The earlier 9:13 recording kept Bear's upright silhouette visible in the first hero shot, then showed its head facing camera. Root cause: the last pass shortened the last camera's offset from `8.2` to `4.45` world units and retained perspective zoom, roughly halving the vertical scene span. The camera was not checking the animated skeleton's extents.
2. **Ghost LOW SWIPE titles persisted between events.** In the regressed take, LOW SWIPE remains visible alongside FERAL CHARGE and HIGH PAW STRIKE, and stays visible into the victory and even the return to reels. Root cause: `combat-cinematics.cleanup()` set the `overlay` variable to `null` without removing its DOM element. A subsequent `createOverlay()` appended a new cinematic, producing multiple retained titles and effects.
3. **Unnecessary environment clutter.** The post-9:13 pass introduced frequent chunky geometric trees and stones. The result looked less natural and more visually noisy than the previous simplified shaded terrain. They also competed with the attack silhouettes.
4. **Comparison to original.** The arcade reference uses high-contrast, legible subjects and extreme edits only when the key animal remains in frame. Its final celebratory framing shows the winner and face, not an unidentified close-up of fur. A successful Bear howl needs a visible raised head, an unobstructed face and a distinct vocal beat.

## Corrections implemented

- **Recovered the wider, front-quarter camera direction** and established an invariant for **all four victory angles**: at least 10 world units from their focus and `zoom <= 1.08` rather than the problematic near-camera crop.
- **Live skeleton fit guard:** in `fitVictoryInFrame`, after rig animation, project the head, neck, chest, pelvis and fore/hind paw world coordinates into the perspective camera. If any falls outside a safe normalized-screen boundary, dolly the camera further back along its original shot direction. This preserves different azimuths while helping prevent head and foot clipping across different FBX poses and screen sizes.
- **Cleanup now actually removes all cinematic DOM overlays** and clears previous stage attributes and CSS state; overlay creation enforces one active cinematic node. This stops old G/T/P text remaining behind new move labels.
- **Reverted the extra low-poly trees and rocks**, retaining real shadow-catching ground and the previous sparse grass.
- **Retained the user-requested Bear howl**, including its head/neck/chest motion and audio. Opening the mouth still depends on whether the private Bear rig exposes jaw articulation or mouth-open morph targets. We do not guarantee that without Mac playback.

## Regression checks

- Unit tests ensure both player slots retain four distinct camera directions with safe distances and zoom limits.
- Structural checks require the live skeleton projection-and-dolly guard.
- Browser combat smoke now starts another round after a film event and verifies old `.ark-cinema` labels are gone; repeated sync produces exactly one overlay.
- Automated CI uses fictional rigs or fallback art and cannot certify the exact private Brown Bear FBX framing. **The Mac recording remains the visual acceptance gate.**

## What intentionally has not been changed
Original G/T/P mechanics, move identity, native private FBX curves, the approved painted menu, all private model/texture files, public GitHub Pages, actual match HP/cards, and the draft-only status of PR #12.

## Next quality gate
Run the whole local Bear G/T/P + victory review again after a hard refresh. For each winning camera, check that the **entire Bear's head stays visible**, no extreme torso-only crop occurs, and the final howl shows head and chest rather than fur. Check that the old LOW SWIPE label disappears immediately when the next attack begins and doesn't persist when exiting review. Only after those pass, resume adding short cinematic scenes and rig-specific paw contact polish. **Do not treat passing CI as proof of this visual goal.**
