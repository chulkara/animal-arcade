# Bear + Moose playable roster integration (draft)

The approved Noah's Arkade painting is untouched. The only active animals in the new selector, combat engine, battle HUD, solo CPU selection and two-player matches are **Brown Bear** and **Mountain Moose**. Mirror fights remain valid.

The binder still has 12 original cards with two Animal choices and the same Strong/Miracle effects. A backwards-compatible migration maps old Tiger/Lion local saves to Bear/Moose without losing wins or earned Strong/Miracle inventory. The former Tiger V4 work stays preserved on its existing branch; Lion is no longer selectable.

The public-safe artwork in this branch consists of original temporary SVG silhouettes. The battle DOM exposes `data-animal-id`, `data-motion`, `data-motion-kind`, and `data-motion-source`: Bear attacks/Idle/Hit/KO map to native FBX filenames, and Moose's four reviewed V2 attacks map to procedural action scores while native Cervid Idle/Hit/KO filenames remain intact. Existing CSS action reactions still run.

## Native 3D arena: local preview integration

This draft now has a **real Three.js / FBXLoader battle renderer** behind the **3D ARENA SETUP** button. It supports local file import of the reviewed Bear V2 and Moose V2 assets, source-grounded texture assignment, skinned model cloning for mirrored matches, a responsive camera, lighting/shadows, and scene-driven attack, hit, KO and victory choreography.

- **Bear:** native Idle, Run, four distinct Attack FBXs, Hit, Knockout and Victory. Explicit matte sRGB brown body/head and teeth textures avoid the previously black coat.
- **Moose:** native Idle, Breathing, Run, Jump, Hit, Knockout and Victory; original Guts/Technique/Power/Special scores from `moose-action-core.js`, including V2 rear-leg bend/extension and ankle-support approximation. The current browser application applies those scores to source `Rig*` joints; **source-file visual fidelity has not been tested in the arena**.
- The game still works with the original placeholders if the files are not selected, have missing clips/textures, WebGL fails, or the browser lacks access to the Three.js CDN.
- Private binaries stay in **your browser session**. No model bytes are committed, sent to an endpoint, or synced. Exiting/reloading requires selecting the private files again.
- Browser animation events are keyed per bout/round and run once. Attack contact triggers defender Hit/KO; the attacker returns to Idle or Victory after the actual clip/action duration. Reduced-motion settings suppress ongoing 3D animation. Changes to the approved menu are prohibited.

### Preview on the Mac

1. Check out the **`bear-moose-playable-roster-20261115`** branch from `chulkara/animal-arcade`; serve the repository with `python3 -m http.server 4173` and open `http://localhost:4173`.
2. On **PLAY**, select Bear or Moose, begin the intro, and choose **START BATTLE**. Open **3D ARENA SETUP**.
3. Extract the previously supplied private **Bear Motion Lab V2** and **Moose Motion Lab V2** ZIPs locally. For each animal, select the extracted asset folder (the base `Bear Animated.fbx` or `Moose Animated.fbx`, its native `.FBX` clips, and its brown/antler `.png` textures). Click **LOAD BEAR** and **LOAD MOOSE** separately. A missing filename is shown explicitly.
4. Close the setup panel. The 3D fighters should now replace the temporary silhouettes as the green/yellow reel battles proceed. **TURN 90°** can correct an imported animal's initial facing for local inspection.
5. Check Bear brown coat, four native strikes, hit, KO and victory; Moose warm brown and visible antlers; Moose Power hind-leg crouch/push/absorption and all other attacks; root grounding, no model pops, mirror battles, mobile 390×844/844×390 and desktop 1440×900. **Inspect Power from the side at slower playback in the original private Motion Lab** for source-model motion acceptance.

**Important verification limit:** CI tests the asset manifest, event mapping, timing, dialog workflow, regular gameplay and screenshots **without** the copyrighted source binaries. Actual two-rig WebGL rendering, texture appearance, frame pacing, imported FBX clip binding and contact choreography still need a manual browser test with the real private files.

**Release hold:** Public/commercial redistribution rights for Bear and Moose remain unverified. Do not upload their source files or publish them to Pages before rights are cleared. Keep upstream asset PRs and this branch draft; the live menu/site stay untouched.

Regression coverage includes the active roster, native/procedural motion mapping, legacy save migration, solo/local-duel selection, slot battles, binder and reduced-motion browser flows.
