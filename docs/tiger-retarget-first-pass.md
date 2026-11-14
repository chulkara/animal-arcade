# Phase 4.5 — white tiger animation transfer (experimental first pass)

**Date:** 2026-11-13. **Status:** first generated candidate, NOT visually validated; intentionally NOT committed as a model asset or deployed to the game.

## Inputs

- Hero: `white_tiger_rigged_animated.glb` (13,564,388 bytes; 121-joint rig; 33,142 triangles), CGJAY1111, CC BY 4.0.
- Donor: `tiger.glb` (~4.4 MB, 47-joint rig; original Attack, Run, Walk, Walk Fast, Howl, Eat, Idle_Lie Prone), Blender Artist/moizmuhammad373, CC BY 4.0.

## Experiment completed

Produced **`white_tiger_retarget_preview_WIP.glb`** (13,707,716 bytes; SHA-256 `61038377181e57236eb50bb08495cabc7371b56306ee91a3a04e56a8a63d801e`) using a local Python prototype. The candidate preserves the entire original hero mesh, materials, textures, skin joints, and `Idle` clip. Additional clips:

| Added clip | Frames (30 fps approx.) | Length |
| --- | ---: | ---: |
| `Attack_retarget_WIP` | 121 | 4.000s |
| `Howl_retarget_WIP` | 81 | 2.666s |
| `Run_retarget_WIP` | 18 | 0.541s |
| `Walk_retarget_WIP` | 51 | 1.666s |
| `Walk_Fast_retarget_WIP` | 25 | 0.791s |

Each new clip maps 24 target joints and uses orientational alignment between a donor forward axis and the hero body axis, applying damped world-rotation changes to the hero's rest pose. The experiment does **not** transfer the donor's visual mesh. Basic checks passed: GLB structure re-opens, 6 animation definitions, 121 skin joints unchanged, original images/materials unchanged, 1 geometry intact, and original static mesh bounds unchanged.

**Limits:** This is an unvalidated mathematical approximation. The rigs have different bone axes, limb chain topology, scales and bind poses. Expect foot sliding, twisted limbs and inconsistent stance until professionally reworked. The conversion does not yet transfer accurate root travel, IK contacts, paw locks, facial animation, or grounded attack choreography. Structural checks alone cannot establish animation quality.

The experimental GLB, companion side-by-side browser viewer, reproducible Python script and license acknowledgements were delivered as a downloadable package in the ongoing ChatGPT conversation. Model bytes are deliberately **not** in the GitHub branch or live Pages build until manually inspected/approved.

## Next required steps (blocking the full arena PR)

1. Review `Run_retarget_WIP` and `Attack_retarget_WIP` on the white-tiger mesh in a real rendered 3D viewer; capture problem frames.
2. Import both GLBs into Blender, correct rest-pose/world-basis mapping and root motion, use proper constraints and foot-contact IK, then bake and export final `run`, `attack`, `roar` on the original hero mesh.
3. Check loop seams, limb asymmetry, paw-floor contact, spine/neck/jaw, and whether the resulting movements have believable animal mass.
4. Once clips pass real visual QA, add a Three.js character/animation controller to the arcade arena and implement cinematic multi-shot attack states. Existing PR #8 remains draft and the currently published game should stay unchanged until it no longer looks like static cutout imagery.
5. Obtain the other fighter: licensed rigged/animated **lion** with at least idle, run, attack, hit and defeat clips.

## CC BY 4.0 attribution

- “White Tiger (RIGGED ANIMATED)” by [CGJAY1111](https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1a29).
- “Tiger” by [Blender Artist](https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484).
- Both models' GLBs contain [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) metadata. Attribution and adaptation notice must remain in any final release. Neither original creator endorses the project.


## 2026-11-13 visual feedback — RETARGET FAILED

The user reviewed the first GLB in the browser: **legs twist; all transferred motions except original Idle look unnatural.** These five `_retarget_WIP` clips are rejected. Do not rename as final, merge, distribute in the game, or claim they are fixed.

**Root-cause analysis:** 47-joint donor → 121-joint hero with mismatched bone axes/hierarchies. The original experiment only animated **rotation for 24 mapped joints** and did not carry over the hero's **full 117-joint translation + scale baseline**, nor preserve foot contacts with inverse kinematics. The world-space rotation delta implementation can change limb orientations in invalid ways. The donor and hero share no direct compatible retarget skeleton.

**Native-motion recovery:** Inspecting the original hero `Idle` (39.04s) revealed that the source itself contains roughly recurring **12-second full-body motion cycles**. A new local-only GLB `white_tiger_native_motion_candidates.glb` was constructed by slicing the **original hero clip** into five candidate excerpts, each preserving **all 351 original animation tracks** (117 rotation, 117 translation, 117 scale), 121 skin joints, original mesh and original textures. This is **not** cross-skeleton retargeting and should avoid the new twisting introduced by the failed transfer; the animation excerpts still need subjective visual approval and smooth transitions.

**Live release policy:** No experimental animations have been committed to the repo or included in Pages; PR #8 remains draft. Next attempt on donor Run/Attack requires Blender rest-pose calibration, anatomical bone mapping, lower-limb constraints, paw IK/foot locking, and baked exported clips with user-approved visual QA. Until then, use only the already-natural white tiger Idle animation.

**User action:** No extra tiger models are needed to troubleshoot this. The user may inspect the native-motion recovery package in ChatGPT; a lion model is still useful separately, but not a prerequisite for correcting the tiger.
