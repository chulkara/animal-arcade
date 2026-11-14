# Tiger model swap — development build

**Status (2026-11-14):** Runtime controller and deterministic crossfade implemented on the draft battle-rebuild branch. The actual GLB assets are delivered separately as a local bundle, not silently committed to the public repository. This is **not a signed-off real-time 3D animation review**.

## Model mapping

| State | Asset | Animation |
|---|---|---|
| Idle | `assets/3d/tiger-idle-howl-orange.glb` | `Idle` |
| Howl / special reaction | Same orange high-detail tiger | `Howl_directional_WIP` |
| Run / movement | `assets/3d/tiger-running.glb` | Native `Run` |

These are *different meshes and skeletons*, intentionally swapped rather than retargeted. An interrupt-safe 180 ms eased model-opacity blend and 180 ms hero Idle/Howl clip fade smooth state changes. Each mesh is independently normalized to 4.2 stage units from its largest ground-plane dimension with original aspect ratios intact. Original G/T/P time-domain action scores now stage anticipation, native gallop approach, hero pose contact and recovery without copying the arcade's animations. Both files use embedded textures. The approved menu painting and card/combat engine remain unchanged.

## Try it in the development build

1. Open the phase45-reference-battle-rebuild-20261113 branch in a local web server or a preview build.
2. Start a battle as Tiger and select **3D TIGER LAB** in the battle footer.
3. Select `tiger-idle-howl-orange.glb` and `tiger-running.glb` from the separately delivered asset pack; click **LOAD BOTH MODELS**.
4. Use the IDLE / HOWL / RUN preview buttons and the GUTS, TECHNIQUE, POWER, SPECIAL, HIT REACTION, KNOCKOUT and VICTORY motion tests. Combat hits start the corresponding G/T/P score; successful defence triggers a grounded reaction, defeat a sideways fall, and final victory an independent howl.
5. To activate automatic asset detection, copy those exact files to `assets/3d/`. The runtime checks for them on first battle entry and loads both. If loading fails or WebGL is unavailable, the original illustrated fighter is kept.
6. The Three.js importer uses CDN modules (not an always-on dependency); internet access is needed once 3D is enabled. Selected GLBs are read locally with blob URLs and **never uploaded**.

## Verification gates

- 3D asset GLB JSON, animation names and textures verified offline; the hero's original `Idle` and transferred `Howl` retained, the running model's native `Run` retained.
- The orange hero body diffuse was retextured selectively; stripes and dark facial details retained. No geometry, skin, animation, normal or roughness map edits.
- Source models have **substantial shape differences** (especially overall vertical vs length proportions). The crossfade can conceal popping but cannot make the underlying bodies identical. This requires a user visual review of the running motion and swap.
- Implemented a procedural **staging layer**, not independent rigged attack/recoil/KO clips. Real-time user visual QA, professionally keyed sequences, toe/paw plants, seamless silhouette transitions, and final device tests remain outstanding.\n- Offline skinning tests informed stronger foreleg contact poses, shorter stage travel, a side-fall knockout and camera framing. Offline diagnostics are not substitutes for browser video review.\n- Performance: one WebGL renderer per active Tiger fighter, no spare Lion renderer; actor state resets between rounds, bouts and menus.\n- Automated GLB guard: `node scripts/verify-tiger-assets.mjs assets/3d/tiger-idle-howl-orange.glb assets/3d/tiger-running.glb` verifies required clips/rig/textures before installing into any build.\n- **Roadmap order (user-approved): Tiger completion → Bear completion → UX/UI/gameplay features**. Do not start Lion next; existing illustrated Lion remains a temporary legacy opponent.
- Keep PR #8 as **draft**; do not merge on test success alone or describe the art as final.

## Reproducible asset pack and attribution

The external downloadable asset pack contains the recolored high-detail GLB, native running GLB, texture-before/after sample, reconstruction script and third-party attribution. **It is not on GitHub Pages** until the files are explicitly installed on the branch and visually accepted.

- Hero: [CGJAY1111 — White Tiger (RIGGED ANIMATED)](https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1), CC BY 4.0, adapted with transferred Howl and amber diffuse.
- Native runner: [Amil/francescolima74 — Running Tiger](https://sketchfab.com/3d-models/running-tiger-fc2c7fd74dd04e39935803b884c77258), CC BY 4.0.
- Howl clip donor: [Blender Artist — Tiger](https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484), CC BY 4.0.
- [License terms](https://creativecommons.org/licenses/by/4.0/) require credit and adaptation notice; creators do not endorse this work.


## November 14 — Original Tiger attack and QA pass

- Distinct technique scores: **Guts** anticipates and swipes, **Technique** travels faster with an airborne paw strike, **Power** winds up for a heavier contact pose. **Special** opens with the accepted Howl clip.
- On attack result, the attacker begins the staged move, while a Tiger defender visibly recoils or collapses on KO. Finishing victories can chain into Howl. The sequence runs off elapsed time rather than rendering frame count.
- Swaps preserve fractional opacity through mid-transition interruptions, fixing previous sudden model popping. Narrow screens use aspect-aware camera framing; the existing arena receives a restrained ground-contact shadow.
- **Offline skinning evidence:** checked high-detail Tiger geometry across Idle/G/T/P/Hit/KO, found original small foreleg poses indistinct, enlarged them within conservative bounds, then replaced an unnatural flying knockout with a side-fall. The final sampled knockout floor discrepancy is about a few hundredths of a scene unit in the offline model; this is not a real-time ground-contact guarantee.
- **Not release-ready:** the two tiger meshes visibly differ, the native runner is substantially lower-detail, the artwork is not yet in the public GitHub branch, and professional locomotion/attack/impact polish still requires real-time user review. Do not merge PR #8 solely because CI passes.
- The approved menu painting and its exact pixel fragments were not touched.



## V3 — user visual review fixes (Nov 14)

The user visually approved **Idle, Run, Hit Reaction and Knockout**, but rejected the G/T/P/Special choreography, the exaggerated Victory head tilt and the darker hero coat. Treat this as a binding quality gate for this development branch.

### Accepted, intentionally preserved
- Native Idle remains on the 121-joint high-detail hero. Native Run remains on the separate 47-joint runner. Native Howl remains available for its standalone preview and the Special introduction.
- **HURT and KO frame values, duration and smoothstep sampling are unchanged from V2.** Never "fix" these while polishing attacks.

### Fixes implemented
- **Guts / Technique / Power:** instead of changing the *entire animal* Idle → low-poly Run → high-detail Idle in under a second, all attack beats remain on the high-detail hero; added dedicated anticipation, foreleg strike, short forward travel, contact, follow-through and recovery keyframes.
- **Special:** starts with accepted Howl on the same high-detail hero, crossfades to its Idle clip, and attacks entirely on that same rig. No lower-poly Run mesh is used in Special.
- New attack samples use bounded monotone cubic-Hermite interpolation, with continuous velocity across keyframe times, rather than independently smoothing every segment to zero velocity. HURT and KO deliberately use their original interpolation.
- **Victory:** eliminated the native Howl, which throws the head too far backward. Victory is now an understated hero-Idle head/chest lift; score's head delta has magnitude <=0.045 before bone multiplier.
- **Coat:** V3 user-downloadable GLB rebuild selectively recolors white fur, targeting `#DF8F3E`. Its orange diffuse midtone moved from approx. `#CA7941` (RGB 202,121,65) to approx. `#E1913F` (RGB 225,145,63), within ~2 RGB values/channel of the specified target. No stripes/skin/animations modified. SHA-256: `a6bbbef52d3bde5ed1afc166af97f2668f3ed85472d0d33004e3506c76015e6d`.
- The runner GLB is unchanged; revised hero binary is shipped in **Tiger Motion Lab V3** local ZIP, not silently committed to public GitHub. To test the revised in-game color, load the V3 hero and runner in **3D TIGER LAB** locally.

### Verification and next acceptance
- Automated tests verify the four attacks never select the Run model, keyframe-velocity continuity, calmer Victory and exact accepted Hit / KO values; CI passed after core changes.
- Full **real-time** visual acceptance remains required, especially foreleg movement and contact. Offline skinning contact sheets are only diagnostic.
- Keep draft PR #8 unmerged until user approves these revised attacks and color. Approved main menu assets not touched.
