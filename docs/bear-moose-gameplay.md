# Noah's Arkade — playable Bear + Moose integration (2026-11-14)

## Scope and user acceptance

**Only Bear and Moose are in the playable roster.** Bear native animations + brown coat approved in Bear Motion Lab V2; Moose natural movement, color and four prototype attacks accepted **for now** in Moose Motion Lab V2 (hind-leg-enabled Power stomp). Tiger V4 is **paused but retained for future editing** in its original development branch and review packs. Lion is not in current scope.

The **approved painted main menu is untouched**. Its original painting can still depict other animals: that image is a fixed user-approved menu, not the game's selectable roster. Avoid rebuilding or editing it.

## What is playable in this branch

- **1 player:** choose Bear or Moose; CPU uses the other species automatically. A run ends on defeat or on three consecutive victories with player HP carrying between bouts (same prototype rule as before).
- **2 players:** choose Bear and/or Moose independently, including mirror matches. First to two bout victories wins.
- **Reels:** green chooses Guts/Technique/Power, yellow chooses power 10–50 or special ✦. Ties reroll. HP, damage, KO, results and rematch remain functional. Values and exact mechanics remain explicitly **original prototypes**, not historically verified arcade formulas.
- **Cards:** browser-local binder now has Bear and Moose as starter Animal cards; the established Strong/Miracle inventory stays intact. Legacy v1 Tiger/Lion saves are sanitized into Bear/Moose starter cards, preserving their valid Strong/Miracle cards, earned wins and rewards.
- **Art:** two **original authored SVG portraits**, `assets/bear-portrait.svg` and `assets/moose-portrait.svg`, appear in selection, battle, cards and binder if no licensed 3D data is loaded. These are not the user-supplied model textures, nor the fixed approved menu painting.

## In-game native 3D — local only

`src/animal-stage.js` is an optional overlay that uses original native Bear FBX animations and original Moose FBX plus the V2 procedural attacks. It **does not upload files** or require an account. Third-party source FBX/PNG bytes are absent from GitHub/public Pages.

To test the branch on your Mac:

1. Download this **development branch** as a ZIP from GitHub, extract it, and in Terminal open the resulting project folder.
2. Run `python3 -m http.server 4174`. Open `http://localhost:4174` (use a different port if occupied).
3. Choose **Play → 1 Player or 2 Players → Bear/Moose → Begin Intro → Start Battle**.
4. Press **3D ANIMAL MODELS** in the battle footer.
5. Next to Bear, choose the extracted **Bear Motion Lab V2** folder from the prior private download. Next to Moose, choose the extracted **Moose Motion Lab V2** folder. Choose folders, **not ZIP files**. The loader detects their `assets/bear/` and `assets/moose/` files by filename and loads the base rig, textures and needed native clips directly in memory.
6. The viewer loads approved Bear's `Stand_Idle_01`, native G/T/P/Special, Hit/KO/Victory. Moose loads its native `Idle`, `Run`, `Breathing`, `Jump`, Hit/KO/Victory with the reviewed V2 hind-leg-driven Power score on top of `Breathing`.
7. If Three.js fails or the private file selection is incomplete, the original SVG portraits remain and gameplay keeps working. Model files are never copied into browser localStorage.

**Optional offline-file setup:** on a local clone only, copy the contents of each motion lab's `assets/bear` and `assets/moose` directories into this project's `assets/private-3d/bear` and `assets/private-3d/moose` respectively. The stage then checks for and loads them automatically. The new `.gitignore` prevents accidental commits of this directory. This option still needs internet for the Three.js CDN module currently used in HTML.

## Validation and important limitations

- Automated Node tests cover exact two-animal roster, mirrored duels, solo battles, HP/match progression, old save migration and both animals' core motion data.
- Headless Chromium browser tests at desktop, tablet, phone and landscape verify menu identity, selection, combat, binder, accessibility hooks and art fallback. They do **not** include copyrighted/private FBX binaries.
- Real-time 3D body proportions, bone-mesh animations, layering, model orientation and mobile WebGL performance **still require testing with the user's privately selected folders**. Passing CI alone does not prove the licensed 3D models look good in the full arena.
- An attempt to repackage or publicly deploy Bear/Moose source model files would require verification of their **source license and redistribution/commercial rights**; those rights were not discoverable in the supplied archive. Code and original SVG fallback artwork are safe to publish, but the FBX files must remain private pending licensing.
- The old Tiger 3D script and all V4 original motion/test code remain in the GitHub history and branch. It is *not* loaded by the current playable HTML.

## Next after real-time 3D acceptance

1. Fix any rig, camera framing, silhouette, antler clipping, transition or mobile render issues visible in live combat.
2. Complete gameplay feel: camera/impact timing, telegraphs, VFX, audio and responsive scaling without repainting the fixed menu.
3. Build out digital Animal/Strong/Miracle cards, binder art, battle card effects, then online multiplayer/cloud persistence only when ready.

**Branch chain:** Tiger draft PR #8 → Bear draft PR #9 → Moose draft PR #10 → Bear+Moose integration draft PR #11 (development only).
