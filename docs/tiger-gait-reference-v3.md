# Tiger gallop motion reference V3 — 2026-11-14

**Input:** User-supplied `Screen Recording 2026-11-14 at 12.46.27 PM.mov` and `running_tiger.glb` in ChatGPT. **Decision:** The previous automatically retargeted white-tiger `Run` / `Walk` / `Walk Fast` / `Attack` remain **visually rejected**, based on the user's assessment that they look like limping. Keep original white-tiger `Idle` and the accepted `Howl`; do not ship the rejected clips.

## New file inspected

- `running_tiger.glb` — **1,996,448 bytes**, glTF 2.0; one mesh, 3,204 vertices, 4,650 triangles, 47-joint rig, one **Run** clip, **0.533 seconds**, 96 track channels (48 translation + 48 rotation).
- The model's embedded metadata says **“Running Tiger”**, creator **Amil / francescolima74**, **CC BY 4.0**: https://sketchfab.com/3d-models/running-tiger-fc2c7fd74dd04e39935803b884c77258 . Retain credit and clearly describe changes.
- Video: **2.283 seconds**, 928×674 H.264, approximately 29 fps. Captures a side-view gallop with gathering legs, body extension, airborne phase, landing/rebound. Original asset is only a reference; not part of a released game.

## Key technical insight

The “new” running model and older `tiger.glb` animation donor have **the same 47-joint Biped lineage and exactly 3,204 mesh vertices**, but scene orientation / scale and node rest transforms differ. The Run durations are **0.533s vs 0.541s**. Normalizing to equal phase, their 101-sample pelvis and limb joint **vertical trajectories** correlate:

| Landmark | Pearson r |
| --- | ---: |
| Pelvis | **0.9992** |
| Left front paw (Hand) | **0.9981** |
| Right front paw (Hand) | **0.9963** |
| Left hind paw (HorseLink) | **0.9986** |
| Right hind paw (HorseLink) | **0.9982** |

They are very likely versions of the *same underlying running animation*, despite exporting to differently oriented/scaled models. **Source motion is not what caused the user-visible limping.** The initial retarget mapped only 24 rotations between donor (47 joints) and white hero (121 joints); the next version preserved more channels but still failed to reconstruct correctly phased quadruped IK and precise paw contact.

Native glTF skinning is coherent at different phases; native source mesh includes a visible airborne phase. This does not prove the source clip is universally perfect (sampled mesh-ground clearance and root motion are not yet polished for Noah's Arkade's specific scene).

## Changed development approach

1. **Use the untouched `running_tiger.glb` on its own 47-joint rig as our gait motion oracle**, with browser/mesh previews; do **not** retarget or change the clip in the reference test.
2. Prototype a **one-model, native-rig** 3D runner in a sandbox battle stage, initially separate from the live game. Integrate only once natural run/start-stop/turn/contact transitions are approved.
3. If retaining the high-quality **121-joint white tiger** as final visual model, build a *true* IK-based retarget or new authored movement (rest-pose/world-basis alignment, front/rear paw targets, body/root translation, spine and tail secondary motion, foot plant locks). A hand-authored Blender pass may be necessary. Do not keep refining the failed 24-joint angle-copy approximation.
4. Never visibly swap high- and low-detail tigers within the final attack sequence. The native rig reference is for physics/timing and a potential separate fully consistent fighter model.
5. Keep battle PR #8 **draft**; do not change approved painted menu art or deploy cutout 2D characters.

## Artifacts (not committed)

The current conversation includes a downloadable `noahs_arkade_native_tiger_gait_reference_v3.zip` (3.4 MB) containing native `running_tiger.glb`, a browser 3D comparison lab, the user's short reference clip (compressed H.264), and a diagnostic native-run animated GIF. JavaScript syntax and ZIP integrity tested. 3D browser playback still requires user visual approval. Nothing was deployed.

## Attribution

- “Running Tiger” by **Amil (francescolima74)**, https://sketchfab.com/3d-models/running-tiger-fc2c7fd74dd04e39935803b884c77258 — CC BY 4.0.
- Original white tiger by **CGJAY1111**, https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1a29 — CC BY 4.0.
- Previous donor “Tiger” by **Blender Artist**, https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484 — CC BY 4.0.
