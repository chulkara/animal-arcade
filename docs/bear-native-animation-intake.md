# Bear native-animation intake — Phase Bear 1 (2026-11-14)

**Project order:** Tiger V4 accepted by user -> **Bear** -> UX/UI, design and game features. The Tiger V4 branch is the locked baseline for this work; the tiger is editable later through separate revisions. Approved painting/menu remains untouched.

## Supplied source assets

User-supplied `Animated Animals 1.0.zip` contains nested `Bear 1.0/Bear 1.0.zip`: base `Bear Animated.fbx` (39.74 MB), `Bear Animated.blend`, texture PNGs and **90** native motion FBXs.

Extracted locally for private visual review:
- base rig with embedded texture payloads;
- `Stand_Idle_01`, `Stand_Breathing_01`, `Loco_Walk`, `Loco_Run`, `Loco_Sprint`, `StandAngry_Breathing_01`;
- `Attack_Run_01_AttackF`, `Attack_StandAngry_01_Low`, `Attack_StandAngry_01_High`, `Attack_StandAngry_02_High`;
- `Hit_Stand_F01`, `Death_Stand_R01`, `StandHind_Idle_01`;
- `Trans_Stand_to_StandHind`, `Trans_Stand_to_Run`, `Attack_Run_01_Turn`.

All 16 selected animation FBXs contain 36 `Rig*` nodes matching bone names in the original base model, with **zero missing names** (static name audit). The base contains 46 such nodes. This is promising for shared-rig animation blending but is **not** a verified live WebGL render.

## Candidate in-game mapping (requires user sign-off)

| Gameplay | Source clip | Note |
|---|---|---|
| Idle | `Stand_Idle_01` | native loop |
| Run | `Loco_Run` | native loop |
| Guts | `Attack_Run_01_AttackF` | running charge attack |
| Technique | `Attack_StandAngry_01_Low` | low strike |
| Power | `Attack_StandAngry_01_High` | high strike |
| Special | `Attack_StandAngry_02_High` | alternate high strike; may need distinct followup |
| Hit | `Hit_Stand_F01` | native reaction |
| Knockout | `Death_Stand_R01` | holds last pose |
| Victory | `StandHind_Idle_01` | native upright idle; can transition from standing |

Other selected clips support slow walking, sprint, angry stance and transitions.

## Development architecture

- Branch `bear-motion-intake-20261114` forked from Tiger V4 development branch; never change the approved menu, Tiger meshes, or accepted Tiger V4 choreography in this Bear phase.
- `src/bear-motion-core.js` supplies standalone native clip inventory and a deterministic director that can reject stale completion events.
- `tests/bear-motion.test.mjs` verifies unique 4-attack source clips, Idle/Run loops, separate Hit/KO, KO pose hold and interrupted animation safety.
- A standalone **Bear Motion Lab V1** user download includes original FBX models/16 selected clips/textures, FBXLoader/Three.js viewer and a rig audit. Model bytes are **not checked in** to this public repository.

## License gate

**No license or usage grant found inside the supplied ZIP.** A free download alone is not proof of commercial rights or even public redistribution rights. Keep files in user's local private review ZIP and out of GitHub until original source/terms are verified. Do not ship this bear in a public/commercial build without that check.

## Next visual gate

User should inspect **Idle, Run, Guts, Technique, Power, Special, Hit, Knockout, Victory** in the local Bear Motion Lab. Only then decide if the original four attacks are sufficiently distinct, whether root-motion needs handling, what bear color/style should match the Tiger, and how to plug the accepted clips into battle. The tiger can be revised independently later.


## Bear Motion Lab V2 — appearance-only fix (2026-11-14)

**User feedback:** all bear movements and actions looked really good; the bear appeared completely black in the viewer. This confirms **user acceptance of current native Bear motion candidates**, subject to later in-game integration.

**Source diagnosis:** the binary FBX contains one skinned mesh `sm_3_0_0` with three original material connections:
- `Material_003` -> body brown diffuse `Bear Body.png`
- `Material_001` -> head brown diffuse `Bear Head.png`
- `Material_002` -> teeth `Bear Teef.png`

The archive provides separate brown, pale-brown and black-bear texture variants. The V1 preview trusted imported FBX material properties; on the user's device the model looked all black. This is treated as a **texture/material assignment issue**, not a broken animation.

**V2 viewer resolution:** explicit Three.js `MeshStandardMaterial` setup with white tint, matte roughness, no metalness, sRGB diffuse textures assigned per original FBX material region. The default coat uses `Bear Body 2.png` and `Bear Head 2.png` (natural light brown); a second optional coat uses `Bear Body.png` and `Bear Head.png` (warm original brown). Teeth retain `Bear Teef.png`. This avoids a black imported material tint and lets user choose a warmer/lighter native coat.

**Files preserved:** source `Bear Animated.fbx`, every original texture, and all 16 review animation FBX files have identical SHA-256 digests in V1 and V2. Animation ID-to-file mappings, durations, playback, rig, and retargeting are unchanged. Model assets remain outside this public GitHub repository pending licensing checks. The new `src/bear-material-core.js` plus `tests/bear-material.test.mjs` record and test the mapping, without including licensed textures.

**Visual acceptance still outstanding:** user needs to open Bear Motion Lab V2 and confirm the coat now renders brown. Do not claim the WebGL appearance is approved solely from static texture inspection. After approval, implement live bear actor integration in the battle stage; keep Tiger V4 and the approved menu unchanged.
