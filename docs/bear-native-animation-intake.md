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
