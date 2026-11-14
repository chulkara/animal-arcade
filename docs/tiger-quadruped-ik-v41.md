# Four-paw tiger IK — V4.1 (2026-11-14)

**STATUS: local experimental test; not in GitHub Pages; Phase 4.5 draft PR #8 remains blocked.** Following user rejection of prior tiger Running/Walk/Attack clips as “limping,” the user supplied a fresh 2.283s side-running video and a rigged `running_tiger.glb`. We studied the source video and original Run motion rather than continuing the previously rejected 24-joint rotation transfer.

## Exact input and output

- Target: **White Tiger (RIGGED ANIMATED)**, creator **CGJAY1111**, CC BY 4.0, 121 skin joints, 33,142 triangles, 2K textures, original Idle.
- Running donor: **Running Tiger**, creator **Amil (francescolima74)**, CC BY 4.0, native ~0.533s Run on 47 joints. Used as motion/phase reference; the donor's orange low-detail mesh and textures are **not copied**.
- Previous accepted Howl donor: **Tiger**, creator **Blender Artist**, CC BY 4.0; the user said Howl and original Idle look good, so those two clips were retained.
- Output: `white_tiger_quadruped_ik_v41_WIP.glb`, **15,507,584 bytes**, SHA-256 `01f08f37227be5e2d05725a72c3aa8dc77937d16e296921de60b98a2a9161d3e`. This GLB was delivered as a **ChatGPT conversation download**, not committed to the public repo. It has exactly 3 clips: `Idle`, `Howl_directional_WIP`, `Run_quadruped_IK_v4_WIP`.

## Implemented in the experimental Python animation workbench

1. Sample the donor Run at 49 phases across its original 0.533s cycle.
2. Treat **all four hero legs independently**, each as an upper ribbon chain (5 bones), lower ribbon chain (5 bones), and foot. Sample donor shoulder/hip, knee/elbow, paw trajectories at each phase.
3. Solve each hero leg **analytically as a two-segment inverse kinematics chain**, keeping hero limb lengths and a knee/elbow bend guide from the source, and clamp unreachable targets rather than distorting the limb skeleton.
4. Add bounded, source-phase-matched body vertical bounce (~−6 to +4cm) and pitch (~−2.25° to +4.53°), plus cautiously limited foot rotations in flight and slight tail follow-through.
5. Preserve all **351 original hero transform channels** on the high-detail geometry and the original 121-joint skin, rather than silently replacing the hero with the donor. Close the loop to the first pose.
6. Produce a two-panel Three.js local-GLB viewer and reference-video comparison, texture-sampled GIFs, a diagnostic contact sheet, a machine-readable QA file, and a Python regeneration script. Regeneration was verified to produce **identical values in all 351 clip channels**.

## QA and limitations

- Parsed and re-opened exported GLB; geometry, skin and materials are preserved from the original high-detail tiger. JS viewer source passed `node --check`. ZIP integrity checked with `ZipFile.testzip()`.
- Full skinned mesh assessed at 25 evenly spaced frames: **minimum Y −0.25cm**, **maximum all-paws-off-ground vertical clearance ~10.16cm**, indicating an actual aerial phase; root translation seam error 0, worst loop quaternion discrepancy ~0.00075 rad.
- Front leg target reaches were clamped in 19 (LF) and 16 (RF) of 49 frames; worst overreach **~8.4cm** and **~11.0cm**. Rear legs required no length clamp. These indicate known pose refinement needs.
- **Not yet artist-approved.** Although it follows the native gallop far better than rotation copying, hind-leg extension and paw-plant realism require full-motion user assessment. No claim that it is fully natural, production-ready or equivalent to the arcade reference.
- **Still to do:** truly planted world-space paws while actor travels through the stage (stance IK / root motion extraction), Blender artist cleanup on hind-leg reach and hip/scapula, a natural Idle→Run crossfade, and a new proper Attack anticipation→lunge→impact→recoil sequence. The previous “Attack” crouch remains rejected.
- The approved menu artwork has **not** been altered. The local GLB is not yet integrated into any publicly deployed game page.

## License attribution

- [White Tiger (RIGGED ANIMATED) — CGJAY1111](https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1a29), CC BY 4.0
- [Running Tiger — Amil/francescolima74](https://sketchfab.com/3d-models/running-tiger-fc2c7fd74dd04e39935803b884c77258), CC BY 4.0
- [Tiger — Blender Artist](https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484), CC BY 4.0
- [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/) — adaptations are explicitly noted; creators do not endorse the project.

**Review workbench:** `noahs_tiger_quadruped_ik_v41_review.zip` (~13.7 MB) attached in the related conversation, containing generated model, native model, reference video, original/target viewer, motion GIFs, 6 Python scripts, and README. No binary asset is committed in GitHub yet; retain draft PR gate.
