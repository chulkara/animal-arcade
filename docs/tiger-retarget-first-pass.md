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
