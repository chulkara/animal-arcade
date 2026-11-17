# 9:13 AM Bear review compared with 9:17 AM original arcade reference
**16 November 2026 · Draft PR #12**

## Sources inspected
- `Screen Recording 2026-11-16 at 9.13.41 AM.mov` — Noah’s Arkade Bear/Moose cinematic review, 24.42s, 2624×1628, 60 fps.
- `Screen Recording 2026-11-16 at 9.17.32 AM.mov` — original arcade Bengal Tiger/African Elephant gameplay, 42.07s, 2624×1628, 60 fps.
- Both supplied videos contain **no audio streams**, confirmed via media inspection. The audio comparison is therefore limited to what is evident visually; we cannot judge the original soundtrack, roar, or current playback volume from these files.

## Actual scene-by-scene differences

| Time in current clip | Current Noah’s Arkade | Corresponding original-game grammar |
| --- | --- | --- |
| 0–2.4s | Bear is initially upright facing camera at 0, then in a side-on duel by 1.2s | Reference (~0–2s) already reveals a vivid tiger/elephant set piece and an explosive FOCUS-style treatment |
| 3.6–4.8s | Guts intro camera brings Moose into the extreme foreground, then Bear makes a readable charge on the flat stage | The original (~16–22s) devotes multiple distinct compositions and visual effects to powering up its special |
| 7.2–10.8s | Technique repeats almost the same warm particle face-focus angle and returns to the normal arena for a modest swipe | The reference (~24–30s) shifts into high tree framing, tracking/charging close-up, energetic streaks, and directional targeting |
| 13.2–15.6s | Power repeats the earlier glowing focus, then Bear lunges forward and Moose staggers; little sense of a ground shockwave | The original (~30–34s) delivers a bright directional target, airborne hit, eruption of earth/debris, and a bold damage readout |
| 16.8–19.2s | Bear victory has three different viewpoints and a native upright action | Original (~36–40s) pivots toward a striking, expressive winner close-up |
| 20.4–24.4s | Bear faces the camera upright, but mouth stays closed while “BEAR WINS!” arrives | Reference (~38–40s) gives the winner a large mouth-open roar and a separate prominent “You win!” result |

The two recordings do **not** compare the normal reels fairly: the Bear recording is the non-scoring G/T/P review, while the original recording includes the game's normal 6–14s slots and final-round HUD. We must inspect normal scored Noah’s Arkade reel footage before claiming that piece matches.

## Implemented based on the observed gap
1. **Different identity per move:** distinct low-rear Guts focus, paw-level Technique focus, raised frontal Power focus and larger Special focus, with different captions and species-agnostic color/particle treatments.
2. **Faster action punctuation:** a brief moving `rush` shot before Guts, Power and Special hits; Technique gets its own low paw-sweep insert. Includes original speed-line animation and synthesized whoosh, neither copied from the arcade recording.
3. **Grounded impact:** a ring-shaped 3D shockwave centered on the actual defender contact event, stronger but bounded victim displacement and less repetitive bright bubbles in the final victory portrait.
4. **More lived-in stage:** sparse deterministic terrain rocks, grass, and distant conifer silhouettes using instanced real-time geometry for efficient rendering and perspective depth. Approved title menu painting remains untouched.
5. **Howling Bear finale:** genuine head-up, chest/neck/forepaws animation curve beginning in the fourth victory close-up; optional jaw bone or mouth-open blendshape detection and activation where supported by the private FBX; an original synthesized throaty howl and radiating soundwave treatment. Pose stays raised during the final hold and resets when leaving review. Camera tightens on the muzzle rather than the previous full-body upright bear.
6. **QA hooks:** `NoahsArena3D.getStatus().bearHowlFace` reports whether the currently loaded private Bear clone supports an actual jaw bone or mouth morph, without exposing any private model bytes. Added tests cover the sustained pose, four camera cuts, rush insert, shockwave and per-move focus distinction.

## Limits, rights and remaining decisions
- **Mouth opening depends on private rig data.** Jaw bones/morph targets are animated if present. If the source FBX has neither, the head/chest and audio howl still run, but the mouth texture/geometry may look closed. Do not claim an open-mouth animation has been visually verified before testing the Mac FBX.
- Browser CI covers scene wiring and combat state, not realistic audio samples, foot contact physics, exact keyframe quality, or visual WebGL with the private source rig. A screenshot/video inspection is still required before release.
- The reference includes proprietary cinematics, models, fonts, sprites and audio; this pass follows its timing and gameplay principles with **original** presentation assets, not direct copies.
- Leave the public GitHub Pages release and user-approved main menu unchanged until rights validation and private model acceptance.
