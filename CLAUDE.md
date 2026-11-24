# Noah's Arkade — working notes for Claude

Browser arcade animal-combat game inspired by the *feel* of Animal Kaiser
(giant animals, reel/slot drama, cinematic strikes, collectible cards).
All art, audio, code and rules here are original. Use the arcade only as a
mechanical/cinematic reference; never copy its sprites, models, audio, logos
or text.

## Stack (do not change without asking)
- Plain browser HTML/CSS/JavaScript. No framework, no build step.
- Modules use the repo's UMD pattern: `(function(root,factory){…})` exporting
  to `module.exports` (Node tests) and a `window.*` global (browser).
- 3D: Three.js 0.180 + FBXLoader from the jsDelivr CDN via the import map in
  `index.html`. Bear/Moose FBX rigs and textures: the owner allows use for
  anything, including redistribution (confirmed by the user 2026-11-23), so
  they may be committed and published. The game is non-commercial for now.
- Tests: Node's built-in runner — `node --test tests/*.test.mjs`.
  Browser smoke: `tests/browser.smoke.mjs` (Playwright/Chromium).
- Local dev: `python3 -m http.server 4173`.
- Desktop browser only for now; online play later.

## Hard constraints
- The approved main-menu painting (`assets/approved-menu-png/`) must stay
  pixel-identical (SHA-256 90fffe36…f9fc4, verified by `scripts/build-approved-art.mjs`).
- Do not touch `main` or merge PRs without explicit permission. GitHub Pages
  publishes from `main`.
- Keep keyboard support, mute/volume, reduced-motion, saved card ownership.
- Real-rig visual changes must be checked against rendered frames from the
  user's private models; passing tests is necessary, not sufficient.
- Look target: PS2 / 2000s, warm retro arcade. No generic "AI" look,
  no clutter added to hide weak animation.

## Combat rules v2 — Charge / Shield / Attack + Slots
Status: rules engine implemented in `src/engine/turn-resolver.js`
(pure, tested). Not yet wired into the UI/3D; the live game still runs the
older G/T/P reel prototype (`src/combat-engine.js`) until the UI switch.

Each turn both players secretly pick one action; both resolve simultaneously.

| Action | Cost | Effect |
|---|---|---|
| CHARGE | 0 | +1 Point. Safe vs Charge/Shield. Hit by any Attack: takes full damage and gains 0 Points. |
| SHIELD | 0 | Fully blocks Tier 1 and Tier 2 Attacks (attacker's Points are still spent). Gains 0 Points. |
| ATTACK T1 | 1 | Light, 20 damage |
| ATTACK T2 | 2 | Medium, 45 damage |
| ATTACK T3 | 3 | Heavy Signature, 80 damage |

- Attack beats Charge. In Attack vs Attack the higher Tier wins and lands;
  the losing attack does nothing (its Points are still spent).
- **Shield Fatigue:** max 2 consecutive Shields. After two in a row, Shield is
  disabled until the player Charges or Attacks.
- **Tier 3 Shield Breaker:** T3 vs Shield deals 50% chip damage (40) and
  Shatters the Shield: the defender cannot Shield on their next turn.
- **Slot Clash:** Attack vs Attack with the same Tier → 50/50 slot wheel;
  the winner's attack lands.
- **Miracle Attempt:** optional on an Attack when spending 3 Points or when
  the attacker is in Desperation (HP ≤ 40% of max). Slow slot wheel, 1-in-3
  success. Success = 100 damage, ignores Shields (no chip/shatter rules apply,
  it simply lands) and wins any clash against a non-Miracle attack. Two
  successful Miracles → 50/50 slot clash. A failed Miracle **fizzles**: its
  Points are spent and nothing lands (event `ANIM_MIRACLE_FIZZLE`), so the
  opponent's Charge/attack proceeds as if the Miracle player did nothing.

### Decisions made where the brief was silent (change here + tests if wrong)
- Max HP 180 (same as the current prototype); Desperation = HP ≤ 72.
- Point cap 5 (`maxPoints`); Charging at the cap still "charges" but stays at 5.
- A successful Miracle also beats a *higher*-tier normal attack.
- Shield Fatigue counts consecutive Shield turns, including a Shield that was
  Shattered. A Shatter lock is a separate one-turn lock.
- Only one attack can land per turn, so a double KO is impossible.
- All randomness comes from an injected `rng()`; the resolver never calls
  `Math.random` itself unless no rng is supplied.

## Architecture (separation of concerns)
- `src/engine/turn-resolver.js` — pure state machine, no DOM/3D/audio.
  `resolveTurn(p1, p2, move1, move2, {rng})` → `{p1, p2, events, winner}`.
  Event queue (ordered, consumed by UI/3D/audio): `SLOT_MIRACLE`,
  `SLOT_CLASH`, `ANIM_CHARGE`, `ANIM_SHIELD_BLOCK`, `ANIM_SHIELD_SHATTER`,
  `ANIM_ATTACK_HIT`, `ANIM_MIRACLE_HIT`.
- `src/engine/ai-opponent.js` — pure CPU: predicts the human's move from
  visible state (Points, fatigue, locks, HP), simulates every pairing with the
  real resolver (wheel outcomes enumerated at true odds) and picks by expected
  value; difficulty easy/normal/hard = softmax temperature. Tests in
  `tests/ai-opponent.test.mjs`.
- Scene: keep the existing `arena3d-*` Three.js runtime and the PS2 forest.
  Standard clip names for any new animal: `Idle, Charge, Shield, Attack_1,
  Attack_2, Attack_3, Hit, Victory, Defeat` (GLB or FBX), mapped in
  `arena3d-core.js`. Bear/Moose keep their mapped FBX clips.
- UI: HUD (HP, Point pips, move buttons respecting fatigue/locks/Miracle
  eligibility) and a slot-wheel overlay that plays `SLOT_*` events in order.

## Delivering work to the user
- The user runs the game on his Mac from `~/Desktop/animal-arcade`.
- Deliver commits as a git bundle whose ref is the branch name
  (`git bundle create x.bundle <base>..<branch>`; never `..HEAD`), then
  `git fetch <bundle> <branch> && git reset --hard FETCH_HEAD`.
- Active branch: `menu-feel-integration-20261122`.
