# Tiger Retarget V2 — November 14, 2026

**Scope:** White-tiger animation transfer after the user rejected the first attempt for twisting limbs. **Status: experimental, NOT visually accepted or deployed.** These artifacts exist in the current ChatGPT session as a separate downloadable bundle, not as large binary assets committed into the repo.

## What changed in V2

- **Anatomical motion-direction transfer:** Instead of copying the donor's world-space quaternions onto incompatible hero bone frames, sample the changing directions of donor pelvis/chest/neck and left/right front/hind limb segments. Convert those direction deltas to the hero's forward/lateral anatomical frame, limit swing angles (up to 36°) and apply only to matching joints.
- **Preserve complete hero baseline:** Each 30fps output frame retains the original white-tiger Idle(0) translation, rotation and scale values across all 117 animated joints (351 channels), including all extra ribbon limbs, face, toes, tail.
- **Measured geometry:** CPU linear-blend skinning of the actual white-tiger mesh found lateral mesh spread for Run decreased from roughly **100.4 cm** (rejected first transfer) to **56.8 cm**; Attack from ~102.4 to ~51.6 cm. These are width metrics for the sampled motion, not subjective quality scores.
- **Ground collision workaround:** An exploratory smoothed root vertical-offset pass reduced worst measured mesh-ground penetration from **~8.1 cm (Run) and ~13.9 cm (Attack)** in the rejected transfer to **under 0.2 cm** at the sampled test frames. **This is NOT paw-level IK.** Floating and sliding remain possible.
- **Honest visual review:** Offline skinning + texture-sampled frame sequences were produced for Run, Walk, Howl, and Attack. Run/Walk are anatomically more coherent but still need toe/paw contact and user review. **Attack is not a usable strike yet**—it looks like crouching/holding rather than anticipating, lunging, contacting, recoiling and recovering.

## Files in the downloadable workbench

- `white_tiger_directional_grounded_WIP.glb` — 15,353,100 bytes, SHA-256 `2a4285b0fdb1ed301ecccac7114ad34aad9a19c580902238c3a809779cbba473`.
- Intact hero `Idle` plus `Run_directional_WIP`, `Walk_directional_WIP`, `Walk_Fast_directional_WIP`, `Howl_directional_WIP` and `Attack_directional_WIP`.
- Four texture-sampled motion preview GIFs; native browser GLB viewer; README; model QA JSON.
- Reproducible Python scripts for source loading, anatomic direction transfer, ground-stabilization, CPU skinning and frames (NumPy, SciPy, Pillow, OpenCV). The old `retarget_tiger_experiment.py` is kept only for GLB I/O helpers; its retarget math remains rejected.

## Code/art quality gates before a live merge

1. Proper limb / toe IK and paw plant tracking on the **white tiger** to replace root-only lift and eliminate sliding.
2. Build a **new** attack sequence with clear anticipation → forward travel → contact → recoil → return. Do not relabel the donor's static crouch as a cinematic attack.
3. Preview in a real-time Three.js or Blender environment with the original 2K textures, full lighting and a consistent camera; visually review the entire clips rather than a single pose.
4. Integrate with the full-stage scene only after animation quality passes; current draft PR #8 must not merge while animal screenshots still resemble pasted-in 2D cards.
5. Retain CC BY 4.0 credit for white-tiger hero CGJAY1111 and motion-donor Blender Artist, with notice of adaptation.
6. The approved main-menu painting's SHA-256 must remain unchanged.

**Note:** Blender and online package retrieval were unavailable in this execution environment. The workbench implements offline glTF skeletal mathematics and mesh/texture previews, but does not pretend to have performed a Blender IK bake or complete 3D cinematic quality review.


## Final V2.3 experimental export (November 14)

The downloadable workbench was refined beyond the initial V2 report to **`white_tiger_directional_grounded_v23_WIP.glb`**, 15,353,336 bytes, SHA-256 `e29d4212d506329b39ab982d1cba369df4158d06ed11c90ed210cc630191e346`. The experimental model is **not in GitHub** and **not shipped**.

- Run and Walk Fast now have **zero positional discontinuity at the looping boundary**; the blend also matches the initial motion tangent approximately, but still needs visual inspection for foot-plant quality.
- Revised offline floor checks at 25 samples per clip: **Run minimum −0.258 cm**, Walk −0.149 cm, Walk Fast −0.15 cm, Howl −0.15 cm, Attack −0.15 cm (ground plane at zero). This is a geometric clearance check, not genuine paw IK.
- Texture-sampled multi-frame GIF reviews were generated for Run, Walk, Howl and Attack. **Attack remains rejected** as the sequence is mostly an unsupported crouch, not a forward strike with camera-worthy impact.
- Included the GLB and reproducible processing tools in the conversation-linked `noahs_tiger_motion_v23_experimental.zip`, alongside a Three.js local-file review HTML and explicit attribution.
- Retaining **draft PR #8**. The remaining critical work is quadruped foot IK, actual travel/contact/action choreography, real 3D lighting and rig review, then integration and final visual approval.

The supplied Tiger models remain attribution-licensed CC BY 4.0 inputs. No copyrighted Animal Kaiser models or sounds were used.
