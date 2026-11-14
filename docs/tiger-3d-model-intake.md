# White tiger 3D asset intake — 2026-11-13

**Source:** user-provided `white_tiger_rigged_animated.glb` (13,564,388 bytes), approved by the user for game use.
**Asset is NOT YET committed to the repository**; this record is intentionally metadata-only until it can be included in the dev build and visually tested. Do not claim the live game is using this 3D tiger.

## GLB validation (read directly from uploaded GLB 2.0)

- **SHA-256:** `88a420b7d405e13ffb50ed2d7c1d0eceebb4e25002ce32c83af23dd561fb2240`
- **Mesh:** 1 skinned mesh, 23,466 vertices, 33,142 triangles; 1 material.
- **Rig:** 1 skin, 121 joints; multiple tail, legs, jaw, mouth, brow, eyelid, and other facial/limb joints.
- **Animation:** 1 named glTF clip, `Idle`, 39.04 seconds. The clip has 351 translation/rotation/scale channels covering 117 nodes. It is much longer than a typical idle loop; **visually preview the timeline before assuming it has no embedded combat poses**. Regardless, distinct playable attack / recoil / KO clips aren't exposed as separate glTF animations yet.
- **Embedded textures:** 3 (all 2048 × 2048), no external texture URLs needed.
- **Normalization:** large authoring-space coordinate ranges and Sketchfab root rotation; load into a normalized parent group, compute bounds after transforms, fit to standard character height, align floor contact, and determine facing direction.
- **Runtime suitability:** reasonable starting size for a high-quality prototype, but 13.6 MB is a significant mobile-first download. Generate optimized game builds only after visual review, preserving the original full-resolution authoring asset.

## Attribution/licensing

GLB embedded `asset.extras` records:
- **Creator:** CGJAY1111 — https://sketchfab.com/CGJAY1111
- **Source:** https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1a29
- **License:** Creative Commons Attribution 4.0 International, http://creativecommons.org/licenses/by/4.0/

User states usage is permitted. Maintain attribution in game credits and a shipped `THIRD_PARTY_ASSETS.md` file, link license and source, and identify changes we make. The asset should not be mistaken for an original model authored by the Noah's Arkade team.

## Animation integration contract

1. Load through a glTF-compatible **skinned** renderer (`three.js GLTFLoader` and `AnimationMixer` are appropriate).
2. Establish normalized height and ground contact; don't bake author root transformations into the rest of the game.
3. Preserve original materials and render a baseline side/three-quarter view before applying painterly art direction.
4. Select `Idle` by name; scrub timeline and inspect whether it contains distinct animation segments.
5. Implement a clip map for `idle`, `move`, `G`, `T`, `P`, `hurt`, `KO`, `victory`. Do **not** substitute idle/translate-only lunge and call that finished character animation.
6. Source or author genuinely distinct combat pose clips using the existing 121-joint rig (including jaw, legs and tail) with appropriate joint retargeting.
7. Create an equivalent lion rig/animation package and retarget/normalize both to matching world scale.
8. Preserve the exact approved painted menu and retain the gameplay footage's full-stage battle presentation.

## Current blockers before Phase 4.5B1 can be approved

- Tiger GLB not yet deployed as a repository asset.
- Only one exposed animation clip; action clips and scene camera cues are still needed.
- Lion rig/model is not yet uploaded.
- Visual QA must confirm actual skinned 3D movement, not flat portrait rectangles.

This document belongs to the **draft visual-rebuild branch** and is not a signoff for a production-quality battle.
