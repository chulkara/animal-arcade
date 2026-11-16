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