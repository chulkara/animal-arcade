# Bear victory fidelity — 10:36 AM build vs 10:38 AM arcade reference
**November 16, 2026 · Branch `bear-moose-playable-roster-20261115` · Draft PR #12**

## Direct source inspection
- `Screen Recording 2026-11-16 at 10.36.23 AM.mov`: 22.38 seconds, 2624×1628, 60 fps; local Noah’s Arkade Bear/Moose G/T/P + Victory review.
- `Screen Recording 2026-11-16 at 10.38.14 AM.mov`: 36.63 seconds, 2624×1628, 60 fps; original arcade Bengal Tiger vs African Elephant.
- Both uploads contain video but no audio track. Sound comparison cannot be verified from these sources.

## Major visual difference
- **Our 13–15s:** Bear rears upright, showing a native hind-leg standing loop. Three distinct camera cuts are present. Moose is lying on the ground.
- **Our ~16–21s:** frontal static Bear with a yellow `BEAR WINS!` headline held below. The face looks closed-mouthed, and there is little change in chest, head, shoulder, or forepaws across successive seconds. A sound cue and tiny bone offsets did not constitute a true visible howl.
- **Original ~27–29s:** focused tiger, bright directional energy, remote target impact and damage feedback.
- **Original ~30–31s:** an expressive front-quarter tiger celebration. The torso shifts, the head moves, and the tiger’s mouth is clearly open during its roar. The `You win!` headline appears as part of this finishing sequence.
- **Original ~32–36s:** the winner presentation transitions into a sky/white outro and emblem. Our preview has no corresponding transition. Prioritize a clear animal performance before implementing new screen branding.

## Why the previous attempt failed
1. The Bear’s private `StandHind_Idle_01.FBX` provides a held upright pose, not necessarily an open-mouth vocal animation.
2. The earlier `bearHowl()` started only 2.9 seconds into a 4.0-second victory, with a small uniform head rotation and an optional jaw/morph driver. If the model has neither, the mouth cannot open.
3. The howl sound and `BEAR WINS!` title fired immediately when the final camera cut began, not when the mouth would move. That made the animation appear even more static.
4. The previous small additive head/paw rotations were never verified against the user’s actual private Bear skeleton. Public browser tests cannot prove realistic motion on an unshipped rig.

## Improvements now committed
- A **5.5-second victory** with four distinct camera cuts and a longer finishing performance.
- Actual **inhale (~1.94–2.58s)**, **throw-back (~2.58–3.16s)**, **sustained roar (~3.16–4.68s)** and **hold/release (~4.68–5.5s)** curves. These drive the native rig’s head, neck, chest and both forepaws, plus a bounded visible weight shift. They do not depend on CSS animation to create movement.
- **Native roar motion discovery** from the user's selected private Bear directory: recognizes `StandHind_Roar_01.FBX` or other compatible `roar`, `growl`, `howl`, `bellow` and `vocal` filenames, prioritizing upright/hind variants. Optional files are safe to omit and are never uploaded.
- If a compatible native clip exists, play it only during the vocal portion and use restrained additive accents. Otherwise play the procedural full-body roar, with actual open-mouth movement only if a jaw bone or mouth-open morph is detected.
- **Synchronized timing:** original synthesized howl starts at ~3.0s; victory result and fanfare are delayed to ~4.34s so the animal performs first.
- **No new invasive scenery or zooms.** Preserve the corrected head-to-foot fitting across all four victory cameras and the earlier cleaned-up arena.
- Review toolbar now identifies whether the actual loaded Bear has `NATIVE ROAR MOTION LOADED`, `MOUTH RIG AVAILABLE`, or `BODY HOWL ONLY · NO MOUTH CONTROL`. Avoid pretending a closed-mouth model has learned a facial animation.

## Acceptance test and honest constraints
1. On the user's Mac, load the entire *private* extracted Bear FBX folder rather than only the minimum required 9 clips. Run Bear Cinematic Review with a frontal view of the final pose.
2. Verify the torso first compresses, head lowers to inhale, then rises dynamically and mouth opens while the sound cue occurs. The final camera must keep the muzzle and paws within the screen.
3. If the toolbar says **BODY HOWL ONLY · NO MOUTH CONTROL**, a native compatible roar motion or newly authored jaw rig/morph is required to create a physically credible open-mouth Bear howl. The current source model is not included in the repo or these recordings, so that final facial quality **cannot be claimed as fixed** by code tests.
4. The original video’s proprietary tiger model, logo, Japanese special-text artwork and sound files have not been copied or embedded. This pass follows its cinematic staging and pacing with original procedural/code assets.

**Do not merge PR #12** until the user accepts a new local recording. Public GitHub Pages and the approved painted menu remain unchanged.
