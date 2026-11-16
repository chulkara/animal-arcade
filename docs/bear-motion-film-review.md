# Bear Motion Film Review · G/T/P + Victory

This private browser review is part of draft PR #12. It replays the reviewed **Brown Bear Motion Lab V2** native FBX animations on the real game camera in a repeatable order, so the next animation polish pass can be grounded in actual Mac footage.

## What happens
A **3-second countdown** lets you begin the screen recording. The reel game is temporarily suspended; the real match, HP, cards, wins and stored progress remain unchanged.

1. **Guts · Feral Charge**: original Bear attack FBX, storyboarding, opponent's own Hit clip, recovery.
2. **Technique · Low Swipe**: original low-strike FBX, separate attack framing and defender Hit clip, recovery.
3. **Power · High Paw Strike**: original high-strike FBX, the defender's KO clip, then **4 distinct victory camera shots** (low, side, high, final wide) with Bear's own Victory FBX.

The sequence repeats the same moves/camera direction every time. Bear can be either player slot. The sparring partner can be Moose or Bear and is not damaged. When finished, the mode holds its final composition and offers **REPLAY FROM GUTS** and **STOP REVIEW**.

## How to record on a Mac
1. On your local branch `bear-moose-playable-roster-20261115`, pull the latest commits and run `python3 -m http.server 4173`. Open `http://localhost:4173` in Chrome, hard refresh.
2. If your Mac or browser has reduced motion enabled, turn it off under Noah's Arkade **OPTIONS** for a full-motion review.
3. Choose **PLAY → 1 PLAYER → BROWN BEAR → BEGIN INTRO → START BATTLE**. Open **3D ARENA SETUP**.
4. Import the extracted private **Bear Motion Lab V2** folder. Import **Moose Motion Lab V2** as well so the opposing animal has an actual 3D Hit/KO, rather than its temporary portrait.
5. Press **Shift–Command–5** on macOS. Select **Record Entire Screen** or **Record Selected Portion** and cover the game's battle screen. Start the Mac recording.
6. In **3D ARENA SETUP**, press **START BEAR G/T/P + VICTORY REVIEW**. The panel closes and a 3-second countdown begins.
7. Let the sequence play through Power, knockout and all four victory camera angles. Then use **Stop Review** or **Replay From Guts** as desired.
8. End the Mac screen recording from the macOS menu bar and upload the resulting `.mov` file to this conversation.

A single continuous recording is enough. Avoid changing the display scale, rotating the bear manually or reopening the import panel mid-take.

## Visual acceptance checklist
- **Coat and skinning:** Bear stays natural brown rather than black, legs and teeth bind to the skeleton without deformation.
- **Stage:** all four feet make visual contact with the ground in Idle and recovery; any sliding/teleport during G/T/P is marked.
- **Guts:** charge direction, anticipation, native motion and impact point are readable.
- **Technique:** lower strike has a genuinely different silhouette and camera language from Guts.
- **Power:** high paw strike has believable weight; the opponent's KO is independent and visually synced.
- **Hit reaction:** opponent's body visibly receives and reacts to the contact instead of responding late, early, or clipping.
- **Victory:** four distinct compositions, no cut that loses the Bear or clips the opponent; native upright victory animation and labels remain readable.
- **Readability/performance:** no camera clipping, material flicker, stalls, missing textures, overlapping text or frame pacing degradation, including laptop 16:10.

## What is and isn't verified
Automated tests can verify the **event order, timing, non-scoring nature, setup dialog safety, and required script loading**. They **cannot verify** the actual private source model's shape, perspective, foot contact, or live WebGL quality because its original source files are not published to CI. The review remains a draft until a real Mac playback recording is examined. The uploaded source assets stay local to the browser; this mode does not transmit or record the files automatically.

The user-approved painted main menu is never altered, Tiger remains paused and Moose is not redesigned. The film review uses our original cinematography with the existing reviewed Bear V2 source motions.

## November 16 footage review and corrective pass

The user submitted `Screen Recording 2026-11-16 at 12.18.12 AM.mov` (26.32 seconds, 2554×1628 at 60 fps). I inspected the complete take and sampled frames around 7.5, 13.5, 15 and 20 seconds.

- **7.5s, Technique:** Bear's attacking forelimb is visible but the frame favors Moose far too much. The LOW SWIPE name occupies the animal space.
- **13.5s, Power:** Bear is partially cropped off the left edge, the overlarge HIGH PAW STRIKE title is clipped and overlays the animal, and the camera hides important contact.
- **15s, knockout:** Bear's front half is outside the frame while Moose drops onto the foreground. The giant opponent dominates the composition and the attack does not land as one clear readable beat.
- **20s through end, victory:** Bear is almost entirely missing, sometimes only a paw visible at the far left. The downed Moose and empty mountains take over what was intended to be Bear's four-angle hero sequence.
- Throughout, Battle HUD, unchanged 180/180 HP, in-world animal names, reel output and a full-width recording toolbar clutter this temporary non-scoring cinematic mode.

**Root cause confirmed from code:** `cinematics.camera()` mapped attacker slot 0 to the positive-X side even though slot 0's actor pivot is at `-2.02`. Victory's targetX therefore pointed to the defeated right-side opponent instead of the winning left-side Bear. The same sign mismatch affected attack shots. The face-cropping and giant on-screen text made the error worse.

**Corrected in the draft:** Consistent slot coordinates for both attacker positions; hero-following low/side/high/wide victory cameras; centered two-animal impact; modest zoom and decisive edits; stable imported FBX model-root X/Z anchoring; smaller top-anchored titles with safer animation origins; hidden non-scoring HP/name overlays in review; compact recording controls; tests covering left/right winners and centered contact.

**Still open:** This fixes the identified camera math and scene composition, **not** the overall commercial-quality motion. The native private Bear V2 animations need another Mac film take to verify foot contact, strike silhouettes, genuine impact synchronization, rig geometry and shot proportions. A fully bespoke scene-specific action cutscene would require additional original rig/animation production.


## November 16, 1:02 AM recording — follow-up 19-second review

Source: `Screen Recording 2026-11-16 at 1.02.26 AM.mov`, 2624×1628, 60 FPS, ~18.98s, supplied directly by the user. Frame review at 0.8-second intervals.

| Approximate time | Visible issue | Corrective work |
| --- | --- | --- |
| 0–3s, Guts/Feral Charge | At the opening, Bear appears to leap across/overlap Moose instead of establishing its starting position and then lunging. Between camera changes, the location of the characters is difficult to follow. | Begin Guts from a stable centered two-animal establishing shot; clamp imported root-bone horizontal displacement; move the stage pivot by a bounded charge curve. |
| 3–7.5s, Technique/Low Swipe | Bear rears but the actual low paw-to-opponent contact is not a strong readable beat. The over-bright contact flash can wash out the opponent. | Give Technique a tighter low-angle preparation but a wide two-animal contact cut. Reduce flash opacity and duration. Stage a small, planted approach with short recoil rather than long sliding. |
| ~8–11.5s, Power/High Paw Strike | Bear walks forward, rises, and Moose falls, but the actions feel disconnected, with a weak sense of weight before the hit. | Separate wind-up, accelerated committed approach, contact and slower return; preserve the private native strike clip but manage stage-level root position and small body weight cues. Keep actual contact in the frame. |
| ~12–16s, victory | Several nominal camera cuts show nearly identical side-on profiles of Bear standing upright. There is no obvious front/reverse/high variation. | Four physically distinct orbit directions: **low front quarter** (toward Bear's face), **reverse quarter** (opposite flank), **high overhead**, **final wide** (winner plus defeated opponent); instantaneous camera cuts on shot changes. |
| 16–19s, hold | Bear remains upright while Moose lies down; the scene stops moving and the victory lacks a composed ending. | Keep the native victory animation, use the final wide composition and explicit shot labels during review. A future original celebration animation and themed arena treatment are still needed for fully polished output. |

### What changed and what remains genuinely unresolved

**Implemented on the draft branch:** more distinct world-space camera orbit vectors, exact film cuts rather than interpolation between camera positions, stable Guts establishing shot, deterministic G/T/P attack staging with small anticipatory lean and body weight, separate defender recoil, root-bone X/Z normalization to counter source FBX translations, conservative Bear hind-foot elevation correction only in Idle/Victory, lower contact flash intensity, and an unobtrusive review toolbar identifying each of the four camera angles.

**Not yet demonstrated or guaranteed:** These are code-level fixes and still require another local playback with Bear Motion Lab V2, because private FBX/PNG data isn't checked into the project. Real foot locking would require rig-aware IK and knowing which paw is planted on each frame. The current bounded hind-foot grounding is only a first safeguard, not a complete physical animation solver. We have not authored a bespoke low-swipe/keyframed power-strike replacement or recorded and validated the resulting footage. Those will be the next polish passes if the angle and timing changes read better.
