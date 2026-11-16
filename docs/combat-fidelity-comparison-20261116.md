# Noah’s Arkade: combat fidelity comparison and cinematic pass
**16 November 2026 · Draft branch `bear-moose-playable-roster-20261115`**

This audit directly compares the two videos supplied in the same user turn:
- **Current game:** `Screen Recording 2026-11-16 at 2.40.36 AM.mov`, 16.70s, 2624×1628, 60 fps.
- **Reference:** `Screen Recording 2026-11-16 at 2.43.08 AM.mov`, 35.97s, 2624×1628, 60 fps.

The other reference and previous build recordings supplied on 15–16 November informed earlier fixes. These new timestamps specifically refer to the two files above.

## Evidence from the footage

| Beat | Reference game | Current Bear/Moose build | Observed problem |
| --- | --- | --- | --- |
| ~0–7s | Final Round HUD, alternating oversized G/T/P shapes and illuminated power values, countdown and strong feedback for the stopped slots | These frames in the current file show the Bear cinematic review (not the regular scored reel), so direct reel-to-reel performance **cannot be measured from these two takes** | Need a separate recording of normal gameplay to sign off reel accuracy; don't claim the full reel is now equivalent |
| ~9–13s | Tiger receives a brilliant charged-state buildup, with a dramatic low camera and full-screen special attack label | Bear's Guts/Technique start immediately in the shared landscape, without an obvious pause, close-up or dramatic preparation | Introduce an actual FOCUS/preparation interval, camera facing the muzzle, colored light and particles before starting the real native attack |
| ~16–26s | Fight cuts among wide environment, animal POV, face detail, speed-line insert and opponent response. Golden light and stylized directional motion distinguish the signature special | Bear and Moose mostly remain in the same stylized 2D mountain stage with occasional position/zoom changes and faint dust; native action has limited physical impact | Use a perspective lens with a true receiving-ground geometry for depth/parallax, staged approach, hit-stop, damped impact shake, opponent-native recoil |
| ~31–36s | Winning tiger gets a dynamic front-facing roar/face shot followed by a large clear “You win!” finish | Bear rises and remains side-on during nearly the entire victory, with a small “VICTORY” label above the model. Moose is flat on the ground | End with **face-facing portrait** instead of another wide profile, original bold “BEAR WINS!” type and victory fanfare. Use optional private `Trans_Stand_to_StandHind.FBX` between strike and upright native celebration |
| Entire sequence | Angles change world direction, scale and lens; movement, light, music, impact and UI are timed together | Layered CSS overlays sometimes change independently of the native FBX, and attacks are one-speed clips without a controlled impact interval | Single timed director drives the focus beat, clip start, contact, 88ms motion hold, reaction, native rear and winner closeup |

The reference game’s pacing and cinematic grammar are useful design targets, but the video does **not** reveal the engine’s private rig curves, exact hitboxes, source animation channels, or RNG internals. Do not claim those are identical.

## Implemented in the current draft

1. **Sequence timing:** A move-specific `FOCUS` phase precedes Guts (340ms), Technique (380ms), Power (780ms), and Special (880ms). Native FBX and their owner-authored animation curves begin *after* that phase. Miracle cards remain independent and play their effects first.
2. **Impact correspondence:** Contact is moved later into native Bear clips, using G=.58, T=.68, P=.74 and Special=.69 of native duration. The cinematic and 3D event trigger share this mapping.
3. **Physicality:** A brief 88ms cross-character rig hold at contact, damped camera impulse, staged approach/retreat and modest move-specific head/spine/paw additive accents produce a weightier rhythm without replacing the private source motion.
4. **Cinematography:** A real Three.js PerspectiveCamera with a separate fixed-angle orthographic camera for live reels. Bear's low-quarter, reverse-quarter, overhead and final face-on winner shots remain discrete hard cuts, not a single orbit. Scene floor now uses an actual shadow-receiving textured-in-code 3D plane and deterministic sparse tufts of grass; the approved menu artwork is unchanged.
5. **Winner:** The final cut moves to Bear's face and displays an original large `BEAR WINS!` announcement. A locally provided optional `rear` transition smooths the shift from the strike to the standing celebration; if omitted or invalid, the previously working native victory clip still plays. No licensed pack bytes are uploaded or committed.
6. **Original effects:** Procedural amber focus light/particles, reduced-motion-aware CSS focus rays, a 4-note victory audio cue, and the existing distinct Miracle effects.

## Quality / safety boundaries

This is a **code + automated-test pass**, not a verified visual match of the original arcade. The actual Brown Bear and Moose FBX content remains solely on the user’s Mac, and public GitHub Actions cannot perform visual QA of the source rig. Rig-specific paw-body hit alignment, complete fore- and hind-foot IK, precise native pose transitions, specialty terrain cutscenes and the full scored-reel UX still need direct Mac video signoff. No original game's mesh, logos, card art, audio recording or movie footage is copied. Live public Pages and the approved painted menu are unchanged; draft PR #12 remains unmerged.

### Suggested next Mac acceptance recording
Start in the *regular scored battle* to capture one attack and power reel, then repeat **BEAR CINEMATIC REVIEW** with both private rigs loaded. Check that the FOCUS actually pauses before the native clip, native paw and opponent hit coincide, 88ms impact hold adds weight without stuttering, the winner's face is visible in the fourth shot, no roots skate, and the 3D ground doesn't occlude the rigs. Compare both clips at desktop and 390px portrait if possible.
