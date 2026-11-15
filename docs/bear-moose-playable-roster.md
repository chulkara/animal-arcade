# Bear + Moose playable roster integration (draft)

The approved Noah's Arkade painting is untouched. The only active animals in the new selector, combat engine, battle HUD, solo CPU selection and two-player matches are **Brown Bear** and **Mountain Moose**. Mirror fights remain valid.

The binder still has 12 original cards with two Animal choices and the same Strong/Miracle effects. A backwards-compatible migration maps old Tiger/Lion local saves to Bear/Moose without losing wins or earned Strong/Miracle inventory. The former Tiger V4 work stays preserved on its existing branch; Lion is no longer selectable.

The public-safe artwork in this branch consists of original temporary SVG silhouettes. The battle DOM exposes `data-animal-id`, `data-motion`, `data-motion-kind`, and `data-motion-source`: Bear attacks/Idle/Hit/KO map to native FBX filenames, and Moose's four reviewed V2 attacks map to procedural action scores while native Cervid Idle/Hit/KO filenames remain intact. Existing CSS action reactions still run.

**Release hold:** The reviewed 3D model binaries and textures are intentionally not published. This phase integrates the playable roster and motion *cues*, but it does not load native FBX animations in the browser. Actual 3D scene integration and live WebGL timing/impact QA are still open. Public/commercial asset redistribution rights are unverified. Keep upstream asset PRs and this branch draft until the rights question and browser/mobile verification are resolved.

Regression coverage includes the active roster, native/procedural motion mapping, legacy save migration, solo/local-duel selection, slot battles, binder and reduced-motion browser flows.
