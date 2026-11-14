# Official Animal Kaiser+ reference — gameplay and art direction

**Status:** Research-only specification, 2026-11-13. Do not merge battle UI on the strength of this document alone. Our approved Noah's Arkade main-menu painting must remain pixel-identical.

## Primary official sources

1. Bandai Namco, [Animal Kaiser+ — How to Play](https://bandainamco-am.co.jp/am/vg/akplus/howto/). Official five-step gameplay visual, card roles, move selection.
2. Bandai Namco, [Recommended Decks](https://bandainamco-am.co.jp/am/vg/akplus/recommendeddecks/). Card stat design, strong-card technique boosts, Miracle compatibility and nonlinear effect types.
3. Bandai Namco, [Card List](https://bandainamco-am.co.jp/am/vg/akplus/cardlist/). Live examples of Animal/Strong/Miracle variations, rarities and nomenclature.
4. Bandai Namco official [How To Play video](https://www.youtube.com/watch?v=9WQEqBWqwEk) (published Mar 5, 2026) and [Videos hub](https://bandainamco-am.co.jp/am/vg/akplus/videos/).
5. Bandai Namco [Animal Kaiser Plus Operation Manual](https://www.bandainamco-am.com/Ecommerce/Site/Content/PDFs/AK_PLUS_MANUAL_09.25.24.pdf), §5-2-1 to 5-2-4. Text cross-checked with official site; source PDF screenshot retrieval was not available in the current browser tool.
6. User-supplied 98-second game recording previously reviewed and represented in [reference-footage-rebuild.md](reference-footage-rebuild.md). Recording is a viewing reference, **not** an asset source.

## Identity and on-screen look

**It is a 3D animal battle with a physical-arcade control language**, not a card-grid fight or text-heavy tactics screen.

- **Live animal stage dominates** the visual field. Animals are large, realistic/proportionate 3D figures on natural ground, visibly weighty, expressive and physically situated.
- **Opposed HUD across the top**: 1P left / 2P right; long horizontal green HP bars; distinctive animal names; a separate true-strength/total-strength readout; compact central round label. Our HP and strength are distinct concepts, not interchangeable.
- **Guts/Technique/Power** each have strong icon language (G / star-T / lightning-P), shown on the battle display and in the player's card identity. Yellow highlighting flags a special skill in official deckbuilding guidance.
- **Bottom play surface**: highly legible mechanical/digital slot-number clusters, obvious green or yellow input prompt, large distinctive physical-button metaphor and countdown; the stage stays present behind it.
- **Fast hierarchy**: large animals first; HP, power and countdown second; move names and numbers third; contextual prompts only when they need the player's attention.
- **Original reference palette**: high-saturation lime HP, bright cyan/green borders, yellow/orange power, outlined comic-style labels over naturalistic 3D battleground. We should translate this **clarity/energy**, not copy the exact interface art: Noah's Arkade uses indigo, aged gold, olive, warm parchment and painterly texture from the approved menu.

## Verified core loop

1. Read **one Animal, one Strong, one Miracle** card; physical scanning translates to selecting owned cards in our online binder.
2. The **green button** stops the Attack Slot: lock G, T, or P and that animal's fighting feature/move.
3. The **yellow button** stops the Power Slot: results are ordered 10 < 20 < 30 < 40 < 50 < fighting-feature mark. **Higher result earns the attack**.
4. A **tie** causes a power-slot reroll; repeated ties amplify damage via **Tiebreaker Charge**. The chosen fighting feature persists while rerolling power.
5. Physically animate the chosen move: decision → anticipation → camera change → approach → contact/impact → HP reduction → reaction → recovery → next exchange.
6. Solo challenges up to three opponents with surviving player's HP carried forward; local versus is first to two bout wins by default (operator configurable in original).
7. Original cabinet can select **Normal vs Strong CPU**, and tutorial on/off. These are not yet faithfully implemented in our game.

## Critical card-system correction

Our current **Strong = flat extra damage on matching G/T/P** and **Miracle = flat extra damage on the ✦ result** model is a **temporary placeholder**, not the official design.

Official examples demonstrate:
- Animal card attributes include **G/T/P technique levels**, total stats, special technique placement and animal type/compatibility.
- Strong cards can buff an appropriate technique or give distinct effects, including card- and move-specific abilities.
- Miracle card compatibility depends on the animal's type / Match category; examples include **All Doubling** (changes slot dynamics), **Survivor** (survival/revival), **T Guard** (defense), and other mechanical effects. **Miracle is not just a bonus damage number or only a winning ✦ modifier.**
- Different combinations meaningfully affect **slot probability, special activation, damage, defense and survival**. Exact formulas or RNG distributions remain research unknowns.

Before balance tuning, model effects as event hooks (`beforeSlot`, `afterAttackSelection`, `powerCompare`, `beforeDamage`, `afterDamage`, `onKO`, `onRoundStart`) with validated data-driven card definitions rather than fixed formula constants. Keep our original Noah's Arkade cards and names.

## Motion / timing direction from official screenshots + user recording

Reference **screen structure** is supported by official images; the **cinematic camera beats** are primarily derived from the user's video.

- Idle two-animal wide shot; short countdown / prompt while stage remains continuous.
- Distinct green attack reel then yellow power reel. The onscreen prompt changes and the correct button is lit / called out; the reel should feel mechanically synchronized with sound.
- Resolve winner with quick full-screen text and a decisive camera cut, not a floating information box.
- Strike uses original 3D animal rigs: anticipation pose → lunge/movement → contact → recoil + HP change → return camera.
- Special attacks need a separate cinematic language (scene transformation, camera ramp, pose, impact, recovery), authored independently.
- Single static illustrations that simply translate/scale are **unacceptable final assets**. The current full-screen CSS layout is a staging shell and is blocked pending original rigged actors and original environments.
- Test mobile landscape independently; phone portrait may require reframing instead of merely shrinking the desktop stage.

## 3D model intake checklist (user will source)

- Two original/licensed animals: **Tiger and Lion**, ideally **rigged GLB/GLTF** with fully embedded or separately supplied textures and redistribution/commercial-use terms.
- Consistent world unit scale, forward axis, ground contact, logical rig hierarchy, flexible limbs, head/jaw, spine and tail, lion mane/fur materials.
- **Minimum animation clips:** idle/breath, walk, run, anticipation, G attack, T attack, P attack, hit react, stagger, fall/KO, roar, victory. Clips can arrive in batches; even idle + one attack + one recoil allows an honest first pass.
- Animation pipeline should be parameterized: attack move and rig clip names map to verified sequence phases; separate the game-logic result from visual playback timing.
- Test real pose-to-pose footage against the supplied recording before selecting lighting, shaders and special effects. Use original art direction (painterly lighting/shading) without copying official models/textures.

## Evidence confidence and release gates

- **Verified:** 3 card classes, G/T/P attack stop, yellow power result comparison, tied power reroll, HP/solo/versus rules, general deck compatibility categories. Sources above.
- **Visual inference from primary screenshots/video:** battle-HUD hierarchy, animals' onscreen relative size, countdown prominence, camera staging/cinematic presentation.
- **Still unknown:** exact damages, actual card coefficients, attack timing distributions, all move data and animation timings, CPU Normal/Strong decision policy.
- **Release gate:** no merge of Phase 4.5B1 draft PR solely because UI tests pass. Require rigged original fighters, original animation clips and genuine scene integration, followed by a side-by-side visual review. Keep the approved menu image unchanged.
