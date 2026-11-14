# Tiger model swap — development build

**Status (2026-11-14):** Runtime controller and deterministic crossfade implemented on the draft battle-rebuild branch. The actual GLB assets are delivered separately as a local bundle, not silently committed to the public repository. This is **not a signed-off real-time 3D animation review**.

## Model mapping

| State | Asset | Animation |
|---|---|---|
| Idle | `assets/3d/tiger-idle-howl-orange.glb` | `Idle` |
| Howl / special reaction | Same orange high-detail tiger | `Howl_directional_WIP` |
| Run / movement | `assets/3d/tiger-running.glb` | Native `Run` |

These are *different meshes and skeletons*, intentionally swapped rather than retargeted. A 250 ms eased model-opacity blend and 200 ms hero Idle/Howl clip fade smooth state changes. Each mesh is independently normalized to 4.2 stage units from its largest ground-plane dimension with original aspect ratios intact. A short on-screen travel arc masks movement starts/ends. Both files use embedded textures. The approved menu painting and card/combat engine remain unchanged.

## Try it in the development build

1. Open the phase45-reference-battle-rebuild-20261113 branch in a local web server or a preview build.
2. Start a battle as Tiger and select **3D TIGER LAB** in the battle footer.
3. Select `tiger-idle-howl-orange.glb` and `tiger-running.glb` from the separately delivered asset pack; click **LOAD BOTH MODELS**.
4. Use the IDLE / HOWL / RUN preview buttons to check the actual Three.js motion. Attack results trigger a short Run or Howl reaction, then return to Idle.
5. To activate automatic asset detection, copy those exact files to `assets/3d/`. The runtime checks for them on first battle entry and loads both. If loading fails or WebGL is unavailable, the original illustrated fighter is kept.
6. The Three.js importer uses CDN modules (not an always-on dependency); internet access is needed once 3D is enabled. Selected GLBs are read locally with blob URLs and **never uploaded**.

## Verification gates

- 3D asset GLB JSON, animation names and textures verified offline; the hero's original `Idle` and transferred `Howl` retained, the running model's native `Run` retained.
- The orange hero body diffuse was retextured selectively; stripes and dark facial details retained. No geometry, skin, animation, normal or roughness map edits.
- Source models have **substantial shape differences** (especially overall vertical vs length proportions). The crossfade can conceal popping but cannot make the underlying bodies identical. This requires a user visual review of the running motion and swap.
- Missing: fully rigged attack, hit react, defeat and victory clips; lion 3D rig; real-time manual browser/device QA; model-side yaw and camera framing tuning; final CSS staging.
- Keep PR #8 as **draft**; do not merge on test success alone or describe the art as final.

## Reproducible asset pack and attribution

The external downloadable asset pack contains the recolored high-detail GLB, native running GLB, texture-before/after sample, reconstruction script and third-party attribution. **It is not on GitHub Pages** until the files are explicitly installed on the branch and visually accepted.

- Hero: [CGJAY1111 — White Tiger (RIGGED ANIMATED)](https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1), CC BY 4.0, adapted with transferred Howl and amber diffuse.
- Native runner: [Amil/francescolima74 — Running Tiger](https://sketchfab.com/3d-models/running-tiger-fc2c7fd74dd04e39935803b884c77258), CC BY 4.0.
- Howl clip donor: [Blender Artist — Tiger](https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484), CC BY 4.0.
- [License terms](https://creativecommons.org/licenses/by/4.0/) require credit and adaptation notice; creators do not endorse this work.
