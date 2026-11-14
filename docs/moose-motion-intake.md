# Moose motion intake — November 14, 2026

**User-approved development roster: Bear + Moose only.** Bear Motion Lab V2 (its native motions and brown coat) was visually approved by Karan. Tiger V4 is paused but deliberately preserved for future changes. Lion is no longer an active development priority. The approved painted menu remains pixel-identical.

## Original files and source integrity

Karan supplied `Animated Animals 1.0.zip`. Its `Moose 1.0/Moose.zip` contains the original `Moose Animated.fbx`, brown and white source PNGs and `Cervid Animations.zip`.

- Source base: 37,066,528-byte binary FBX; two mesh objects: `sm_1_0_1` (body/head) and `Chifre_Moose` (antlers).
- FBX connection IDs verify three source material roles: `Moose_Head` and `Moose_Body` on the skinned body mesh, `Moose_Chifre` on the antler mesh. Correct corresponding texture maps: `Moose Head.png`, `Moose Body.png`, `Moose Horn.png`.
- The source is a 47-name Rig* armature. Each of the **19 selected animation FBXs** has 37 Rig* named nodes that match the base armature, with zero unknown names. This is a static rig audit, not a realtime animation signoff.
- Source `Cervid Animations.zip` lists 73 entries including 19 selected native movement/reaction clips. It **does not contain authored attack clips** (no original G/T/P/Special).
- A private downloadable **Moose Motion Lab V1** ZIP (~41MB) contains the untouched source FBX, 19 selected native animation FBXs, original PNGs, two labeled lightened-coat derivatives, a local Three.js/FBXLoader viewer, a manifest with SHA-256 per original asset and a rig audit. Binary source files were not committed to this public repository.

## Preview mapping and visual gates

| User action | Source animation file | Status |
| --- | --- | --- |
| Idle | Stand_Idle_01.FBX | Native, unmodified |
| Breathing | Stand_Breathing_01.FBX | Native, unmodified |
| Walk | Loco_Walk.FBX | Native, unmodified |
| Trot | Loco_Trot.FBX | Native, unmodified |
| Run | Loco_Run.FBX | Native, unmodified |
| Sprint | Loco_Sprint.FBX | Native, unmodified |
| Jump | JumpStand.FBX | Native, unmodified |
| Hit | Hit_Stand_L01.FBX | Native, unmodified |
| Knockout | Death_Stand_R01.FBX | Native, unmodified |
| Victory | Stand_Idle_02.FBX | Native, unmodified |
| Guts | Original antler charge over native Run | Prototype pending approval |
| Technique | Original lateral antler sweep over Idle | Prototype pending approval |
| Power | Original two-forehoof stomp over Breathing | Prototype pending approval |
| Special | Original leaping antler drive over Jump | Prototype pending approval |

Additional native tests in the local lab: Sneak, Turn Left/Right, Stand-to-Run, Stand-to-Trot, Look Down and Grazing. All four experimental attack motion scores keep **one moose skeleton** visible, use continuous monotone pose interpolation and return to a neutral stage pose. They should not be claimed to be the original arcade's animations.

## Appearance

To avoid the all-black FBX appearance previously encountered with Bear, the viewer replaces automatically imported material tint with explicit white, nonmetallic matte materials and maps **body/head/antlers** by the original FBX's material names. Coat selector:
- **Warm Brown (default):** source brown textures brightness-adjusted 1.58x in local derivative files, not structural animation edits
- **Original Dark Brown:** unmodified source brown PNGs
- **White Moose:** source white body/head PNGs, original antlers

## Development and next steps

- New branch `moose-motion-intake-20261114` branched from the Bear intake branch, not main.
- `src/moose-assets-core.js` records native clip files and three-mesh-material mappings.
- `src/moose-action-core.js` defines four original moves with separate timing and motion fields; `tests/moose-motion.test.mjs` covers key distinctness, frame continuity, asset mapping and safe invalid inputs.
- User should review Moose Motion Lab V1 (native movement/reactions + coat selection + four prototype attacks), then refine only what is rejected.
- Only after Bear/Moose visuals and rights pass, replace old Tiger/Lion active selection and integrate both into combat. The *published website still has the legacy Tiger/Lion selection today*; do not imply otherwise.
- Preserve Bear V2's accepted clips and materials, preserve Tiger V4 branch for later optional changes, and never repaint the approved menu without explicit instruction.

## Source license gate

Neither the provided Moose subarchive nor the rest of the supplied pack contained a usable license or explicit commercial/public redistribution grant. "Free" or access to files does not confer those rights. Keep original FBX and PNG binaries private until the official source/license can be verified. This limitation also applies to Bear assets from the same pack. The local review ZIP returns the supplied content to its uploader for private evaluation; it is not a public redistribution approval.

## Moose Motion Lab V2 — hind-leg-driven Power stomp (November 14, 2026)

**User visual feedback:** the V1 Power / hoof stomp is too rigid: the back legs appear locked and do not move. User did not reject Guts, Technique, Special or any native source animations.

V2 adjusts **Power only**, with the same original moose rig and native Breathing base clip:
- Anticipation/compression: pelvis drops; both rear hip joints flex and both knee/hock chains bend.
- Rising push: both rear hips extend, knees and hocks straighten in a timed push; forelegs lift as the upper body rears.
- Downstroke/contact: both rear leg chains re-flex to absorb the landing while the front hooves descend; recovers to the original standing pose.
- Viewer maps the actual source names `RigPelvis`, `RigLBLeg1/2/3`, `RigRBLeg1/2/3`, `RigLBLegAnkle`, `RigRBLegAnkle`. No retargeted skeleton or binary animation edits.
- A bounded hind-ankle ground-height compensation attempts to keep the rear feet planted during the upward movement. This is *not* a full IK solver or proven live foot-lock.
- Four beat phases and their opposite-signed joint rotations are regression tested; Guts/Technique/Special sequences are left unchanged. Native Idle/Run/Jump/Hit/KO remain as supplied.
- Local downloadable **Moose Motion Lab V2** contains the unchanged 30 original model/animation/texture assets, updated procedural motion and browser viewer code. Package integrity verified (37 files, all CRC checked).

**Remaining gate:** Karan must play Power in V2 (preferably side view at 0.5×) and confirm the rear legs actually bend, extend and settle naturally. Browser WebGL live verification is unavailable in the authoring runtime, so no claim that the movement is artist-approved. This is still a prototype; do not merge or distribute unlicensed asset bytes publicly.
