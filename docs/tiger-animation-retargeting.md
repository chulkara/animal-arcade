# Tiger model animation intake — November 13, 2026

Two game-usable user-supplied GLBs were compared locally. **No retargeted animation has been created or integrated into the live game.**

| | Hero | Animation donor |
|---|---|---|
| File | `white_tiger_rigged_animated.glb` | `tiger.glb` |
| Bytes | 13,564,388 | 4,413,868 |
| Vertices | 23,466 | 3,204 |
| Triangles | 33,142 | 4,650 |
| Skin joints | 121 | 47 |
| Animation clips | Idle (39.04 s) | Attack (4.00 s), Eat (6.67 s), Howl (2.67 s), Idle_Lie Prone (10.00 s), Run (0.541 s), Walk (1.666 s), Walk Fast (0.791 s) |
| Metadata license | CC BY 4.0 | CC BY 4.0 |
| Creator | CGJAY1111 | Blender Artist / moizmuhammad373 |

**Donor clips are real animations:** the `Run` clip has 33 substantially changing rotation tracks; `Attack` has 35. The donor uses 3ds Max Biped names (`Bip01 ...`) while the hero uses a multi-joint Maya-style hierarchy (`c_...`, `l_...`, `r_...`). Direct clip reattachment is invalid. Retarget via Blender with rest-pose orientation correction, bone mapping, root motion normalization, and foot-lock cleanup.

**Candidate source → target mapping (not yet visually validated):**

- `Bip01 Pelvis_01` → `c_root_01_uJnt_116`
- `Bip01 Spine_02` → `c_spine_00_uJnt_115`; `Bip01 Spine1_03` → `c_spine_01_uJnt_114`
- `Bip01 Spine2_04` → `c_chest_00_uJnt_111`
- `Bip01 Neck_05` → `c_neck_00_uJnt_108`; `Bip01 Head_06` → `c_head_00_uJnt_105`
- L/R clavicle → corresponding L/R scapula; L/R upper arms → corresponding L/R `femurRibbonFront_00`; L/R forearms → corresponding L/R `tibiaRibbonFront_00`; L/R hands → corresponding L/R `footFront_00`
- L/R thigh → corresponding L/R `femurRibbon_00`; calf → `tibiaRibbon_00`; hock → `foot_00`
- `Bip01 Tail_041` through `Tail3_044` → 8-section hero `c_tail_00`... `c_tail_07` with interpolated controls

**Production gate:** Retarget donor `Run` and `Attack` onto hero as `Run` and `Attack` clips; visually approve without foot sliding/limb twists, then add distinct G/T/P attacks. Use the hero mesh throughout; don't visibly swap the low-poly donor mesh. The approved painted menu remains untouched. Models have not been committed to GitHub.

**Attribution** — “White Tiger (RIGGED ANIMATED)” by [CGJAY1111](https://sketchfab.com/3d-models/white-tiger-rigged-animated-9dd099d283e54f99b7cbd40b531b1a29) and “Tiger” by [Blender Artist](https://sketchfab.com/3d-models/tiger-67bbedd727a047869ef7c7b608445484). Both contain [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license metadata. Retain attribution and indicate adaptations.