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

## Ruleset decision (user, 2026-11-25): KEEP G/T/P + 10–50/✦
The live game's Guts/Technique/Power reel + power reel (`src/combat-engine.js`)
is THE ruleset. New rules layer on top of it, not on rules v2.
Comeback layers in `combat-engine.js` `resolve()` (tests: `tests/comeback.test.mjs`):
- **Focus Guard**: the first HEAVY hit (Power, ✦, or raw ≥ 60) an animal
  takes at or below half health is cut by 35%. Once per bout per animal.
- **Resurrection**: once per bout per animal, a hit that would KO leaves it
  on 25% health instead (`hpBefore` on the event; the HUD uses it).
- **Hits**: a strike's damage shown as Guts 1 / Technique 2 / Power & ✦ 3
  blows (`hits`, shares sum exactly; display only).
- **Gold Change**: every ✦ hit; the attacker turns gold (tint + gold rim via
  `uAuraColor`) with a GOLD CHANGE! cut-in over the title.
  **Super Miracle**: a ✦ hit that wins the bout; the launch sky is cosmic
  (`setStage(level,'cosmic')`) instead of red.
- Cut-ins (`.ark-callin-*`, film-time driven): FOCUS!! comic panel just before
  the blow, FOCUS GUARD! −N at the landing, RESURRECTION! as it gets up.

## Combat rules v2 — Charge / Shield / Attack + Slots (NOT used)
Status: built and tested in `src/engine/turn-resolver.js` but the user chose
to keep G/T/P (above). Kept for reference; do not wire it in without asking.

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

## Arcade turn flow + HUD (2026-11-25)
- `src/engine/match-state-machine.js` (`NoahsMatchFlow`, pure, tested in
  `tests/match-flow.test.mjs`): both reels spin at once, each player locks
  with their own button (P1: Left Shift / Space / F (+G/Y); P2: Right Shift /
  Enter / J), a LOCKED shutter masks a pick until both lock, 5 s flame timer
  auto-locks. Commits go to the existing `combat-engine.js` in P1→P2 order, so
  rules/damage are unchanged. Space/Shift never skip a playing film.
- `src/arcade-hud.css` (loaded last): lime health bars that drain when the
  HUD returns, metal octagon reels with G/T/P/✦ emblems, flame countdown,
  glossy cabinet button, "SET YOUR ATTACK!" / "ATTACK!" banners.
- Dev tools (film review, 3D setup, Forestfall, BACK TO ARENA) sit in a DEV
  drawer, closed on load and after each use (in-memory, not persisted).
- Ruleset settled: G/T/P + 10–50/✦ (see "Ruleset decision").

- **Power clash beat (2026-11-25, from the 2:41 PM real-match recording).**
  `.fight-clash` (combat-ui.js markup, arcade-hud.css): two octagon plates
  slide in from the edges, hold, the winner swells to 1.8× and slams onto
  the loser, whose plate breaks into 8 `.fight-shard`s. 1.1 s, covered by
  `SOLO_MS.titleIn` 1100 so it plays before the film title. fight-deck.css
  still paints the winner *span* yellow; arcade-hud.css resets it - keep the
  colour on the `i`. Every keyframe that touches opacity must state it at
  each stop, or the winner fades across the whole animation.
- The 2D `.battlefield-damage` number is hidden: it spoiled the film's own
  damage pop. Tail after a film is short: `SOLO_MS.ret` 300, total
  `finish+150`, `RESULT_HOLD_MS` 350.
- Moose optional `walk: Loco_Walk.FBX` so its victory approach walks.

- **Iteration 4 (2026-11-25, 3:14 PM recording + forwarded review).**
  - *Deferred HP drain.* combat-ui `hud()` renders the struck side's pre-hit
    number (`.hp-before`) and `--from` width; the section carries
    `data-hp-hold="1"` until combat-cinematics `draw()` reaches
    `timing.landAt`, then removes it (restarting `ark-hp-drain`) and records
    `window.__arkHpReleased=event.key` so re-renders don't hold again.
  - *Filmed-hit chrome.* `data-hit-film` (RESULT/FINISHED HIT) hides THE
    STRIKE LANDS/NEXT/instructions, the expedition pill and heading; from
    the title (`data-film-past`) the bottom slot deck stays hidden until the
    next turn. `.combat-message` is visually hidden but kept for screen readers.
  - *Tie clash.* Values are wrapped in `<i>` octagons (raw text in the span
    was the "pixel debris" over the Bear's head); slide in, butt heads, bounce apart.
  - *DEV drawer.* In-memory only (not localStorage), closes itself after a
    tool is used; BACK TO ARENA moved inside it (Esc still works).
  - *Ground dot.* The title roar's mouth light was never positioned (sat at
    the world origin on the dirt); it now follows the jaw.
  - *Contact two-shot.* `shot()` CONTACT → `'contact'`; `soloView.contact`;
    victim visible from contactAt; runtime places the attacker against the
    victim (`bodyHalf`) and `applyContact` frames both from live bounds, 15°
    Dutch tilt, 40 ms flash, hit-stop freezes the rigs. Fire void ends at
    contact so the blow lands in the forest.
  - *Launch/landing.* Technique lifts off from the ground; Power still enters
    high and upside-down (reference) but capped at 2.05 so it is in frame on
    frame one. `redSky` is graded: holds through the flight, fades over
    `SOLO_MS.redFade` 400 ms on the landing (`setStage(level)` cross-fades a
    second red sky dome + material/fog lerp). Get-up 700 ms. Title white-out
    110 ms. Lunge stops 2.7 units from the face (no cropped cheek).
  - *Moose.* Title: antler toss + forehoof rake (`roarClock`). Special leap:
    forelegs fold (new `leftFrontKnee/rightFrontKnee` fields → RigL/RFLeg2).
    Strike shots pulled back ×1.16 for the antlers. Victory: bugle on the
    howl beat, then plants and rears about its hind feet (`victoryRear`,
    applied in applyBlocking; the Power pose's own pitch is a roll on this
    rig) with a second bellow; `mooseBellow` audio cue (same synth, lower).
  - *Spin cameras.* During POWER (ATTACK!) `spinCamera()` holds wide 0.7 s
    then cuts 1.5 s close-ups of each animal, which growls (`roarLevel`).
  - *Reel drums.* `.is-rolling` restarts per step (symbol drops in with a
    smear); lock springs past centre under a starburst.

- **Iteration 5 (2026-11-25, 8:53 PM recording + forwarded review).**
  - *Contact shot reads now.* `SOLO_MS.launchDelay` 330 (two-shot ≥ 300 ms).
    Attacker placed from LIVE BONE extents (`extent`/`leadPoint`, plus
    snout/antler margins `REACH`/`REACH_D`) so heads/antlers don't sink in;
    the victim snaps into a flinch (`soloView.flinch`: pivot nose-up about its
    hind feet + shove back; `flinchLevel` → head back, forelegs up). Spark
    star + additive shockwave ring at `sequence.contactPoint`
    (`soloView.impact/ring`), Technique's slash on the contact frame too.
    `applyContact` frames from bone positions (bind-pose mesh boxes were wrong)
    and keeps the shake.
  - *Moose glint* sits above its head on the antlers (was between the hooves).
  - *Embers removed* (read as white teardrops over the backs); rim only.
    `window.__arkEmbers` re-enables them for experiments.
  - *Warm-up.* `prewarm()` builds glint/impact/ring/shadow/fire-void/red+cosmic
    sky up front and `renderer.compile`s with everything visible: first-use
    shader compiles held the title white flash on screen 300+ ms.
  - *Multi-hit pops* (`.ark-hitpops`, 3 slots): each blow's number pops AT its
    blow on the victim (contact freeze / mid-flight / ground slam), offset,
    float 32 px. The old centre pop is hidden in films.
  - *Resurrection flow.* `timing.reviveAt` = landAt + downHold + `reviveHold`
    600; the landing beat grows by 600. HUD: hold → `data-hp-ko` (drain to 0
    over 500 ms, shows 0) → release at reviveAt (refill 0 → final via
    `--from:0`; `--held` is the pre-hit width). FOCUS GUARD! clears first.
  - *Super Miracle* (`superMiracle`): `fireKind:'cosmic'` (procedural violet
    vortex backdrop), a falling golden-cyan star (`.ark-falling-star`,
    `soloView.star`), cyan X-slash on the blow (`.ark-xslash`), 1.8× shake ×3
    vertical slam. Title = 2 lines: gold eyebrow (SUPER MIRACLE!/GOLD CHANGE!)
    replaces the rank line; no separate banner. Gold coat now has gold
    specular + shininess (Phong) and a faint gold emissive.
  - *FOCUS!!* is a comic strip sliding in from the DEFENDER's edge with a
    live face portrait (`snapPortrait` at warm-up → `getPortrait(id)`).
  - *Reels:* drum step settles in 45 ms (the 85 ms step left symbols mostly
    off-centre = "blank grey"). Tie plates clear in 0.75 s.
  - *Red light* ramps in over 250 ms at the launch (and out over 400 ms).
  - *Sky seam:* the cloud wrap reused the original gradient centre (drew
    nothing), cutting clouds at u=0/1; each wrapped copy gets its own gradient.
  - *Post-match:* REMATCH + MODE SELECT · 1P / 2P (→ MODE_MENU, where 2 PLAYERS lives).

## Delivering work to the user
- The user runs the game on his Mac from `~/Desktop/animal-arcade`. When that
  folder is connected to the session, apply commits there directly
  (fetch a bundle + `git merge --ff-only`); he starts the server himself.
- Otherwise deliver a git bundle whose ref is the branch name
  (`git bundle create x.bundle <base>..<branch>`; never `..HEAD`).
- Active branch: `menu-feel-integration-20261122`, pushed to GitHub as
  draft PR #13 (stacked on #12). Keep it a draft; never merge without asking.

## Attack film grammar (from the 2026-11-24 reference footage)
Timed from Brown Bear vs Great Hornbill (video_5 13.8–22.8 s). The original
never leaves its arena: the stage is the battle stage; only the fire void and
the launch's red sky are effects. Deliberate departure (user-forwarded
reviews, 2026-11-25): the blow lands in a two-fighter CONTACT shot (step 4b).
1. Title: white ray burst, low profile push-in on the attacker in the arena
   (aura on, roar), rank + move name; fades to white.
2. Head-on low shot of the attacker coiled → one-frame flash cut as it rears
   (Guts: it runs at the lens through speed streaks instead).
3. Strike: signature moves ('fire') burn in front of a fire void; a 4-point
   claw glint flares on the highest front paw at the top of the swing.
4. Lunge: the camera dollies toward the live head bone (stops 2.7 units
   short, no cropped cheek).
4b. Contact: hard cut to a 3/4 two-shot from live bounds, attacker placed
   against the victim, rigs frozen for the hit-stop, 15° tilt, 40 ms flash.
5. Launch: victim alone under a red sky (forest re-lit red), blown AWAY from
   the lens (reference 19.9–20.5). The blow lands ON the victim: a star burst on its body (and
   Technique's claw slash, projected onto it) in the first 240 ms. Every
   launch is a roll about the body's length that ENDS ON ITS SIDE (never an
   end-over-end flip balanced on its antlers). Guts 'skid' (≤0.6 m, bounce,
   skid; 100 ms hit-stop), Technique 'roll' (1.4 m, 1¼ turns + yaw; 110 ms,
   12° tilt), Power 'blast' (starts upside-down, 1½ turns; 135 ms, 18° tilt,
   slam + bounce). Blob shadow below. Flashes are crisp (≤ ~100 ms).
   The Bear's Guts film plays its RUN clip (its attack clip rears upright).
6. Landing: cut to the arena wide, the red light fading back to day (400 ms); body-first into the knockout clip's
   lying end pose; dirt spray; a survivor holds 450 ms then gets up (700 ms) by playing
   the knockout fall BACKWARDS (a crossfade squashed the body flat);
   ONE damage number pops on the victim (projected from 3D, 950 ms); red total
   under its health clears before the return cut. Numbers display ×50
   (`DISPLAY_SCALE`, display only — rules unchanged).
7. Return to the two-shot.
All Bear and Moose moves are films (`SOLO` in `combat-cinematics-core.js`,
strike style 'fire' | 'charge' | 'slash'). `event.film===false` forces the
older shared-frame grammar (fallback for animals with no film entry; the
tests use it to keep covering that path). The DOM overlay follows the 3D
film clock (`NoahsArena3D.getSequence()`), so text never drifts off shots.

## Victory grammar (video_1 49.3–55 s, video_4 41.3–46.7 s)
Dark dip → PERFECT! (only if the winner is unhurt, `event.perfect`) → You win!
(SOLO human) / You lose… (CPU won) / P1|P2 wins! (DUEL) within ~0.3 s. The
winner stays ON ALL FOURS (walk clip, never the upright hind-leg idle) in its
fire aura and walks diagonally at the lens: cuts vicSide → vicFront → vicRoar
(low close-up, jaw open) → vicWide with a slow dolly-in; the winner and forest
stay on screen (the arcade's sky-coloured outro was dropped: held in our game
it read as the scene vanishing). The winner faces its path from frame one. Never zero one Euler axis of the winner's
orientation: its leaned 90°-yaw quaternion is gimbal-locked (rolled the Bear).
Aura = Fresnel rim injected ONCE per material (materials are cached and
outlive actors; a second injection redefines `uAura`, the shader fails to
compile silently and the body vanishes) + small embers on the upper body.
A T-pose guard pulls any foreleg flung past the body's side back in. Sign
convention: +θ about the body's forward axis pulls a RIGHT-side paw in, so
key-pose armOutR is −θ and armOutL is +θ. Jaw cap: ~29° when our roar drives
it, ~12° for source clips (wider stretches the lip mesh into a striped panel).
