# Phase 4.5 — Arcade-quality vertical slice

**Status:** First playable combat overhaul in development. This is a vertical slice, **not** a claim that the complete game now matches the arcade.

## North star

The Tiger-versus-Lion match should feel like an exciting arcade battle rather than a form with buttons. It must become mechanically grounded in the original *Animal Kaiser* sequence while using Noah's Arkade's own music, art direction, animal illustrations, and move names. The main menu's exact, approved 1672×941 artwork is immutable throughout this phase.

## Verified against official operating instructions

Reference: Bandai Namco *Animal Kaiser Plus* operation manual (2024), §5-2-1 to §5-2-3:
https://www.bandainamco-am.com/Ecommerce/Site/Content/PDFs/AK_PLUS_MANUAL_09.25.24.pdf

| Original documented behavior | Current implementation |
| --- | --- |
| Green button stops G/T/P attack reel | Implemented; Guts / Technique / Power |
| Yellow button stops power reel | Implemented, 10 / 20 / 30 / 40 / 50 / ✦ |
| Higher power attacks, equal power rerolls | Implemented with visible tie-charge feedback |
| Health decreases until a knockout | Implemented; damage values **original placeholders** |
| Solo: up to three victories, HP carries between bouts | Phase 4.5 match coordinator |
| Local two-player: first to two bout wins (default) | Phase 4.5 match coordinator |
| Animal, Strong, Miracle cards | Phase 4 binder and prototype combat bonuses |
| CPU Normal/Strong difficulty selection | **Not implemented** |
| Historically accurate per-animal stats/damage, special move data | **Unverified, not implemented** |
| Full original battle cinematography and timed interactions | **Work in progress** |

**Important:** The original rules do not prove the exact damage coefficients, move names, CPU selection probabilities, or frame timings. These remain clearly marked original prototype choices until evidence is collected and tested.

## Delivered in this first vertical slice

- **Cinematic illustrated battlefield:** layered mountains, horizon, sun, terrain lighting and original Tiger/Lion portraits; attack lunges, victim recoil, a restrained impact flash and floating damage values
- **Reel input:** requestAnimationFrame + elapsed-time steps rather than an interval tied to rendering speed; neighboring values, active slot framing, tactile CSS button depression
- **Original synthesized feedback:** slot lock, impact, special, tie and KO cues, respecting mute and SFX volume; no copyrighted audio
- **Original move identities:** Tiger (Shadow Resolve, Moonstep, Amber Fang) and Lion (Golden Heart, Sunward Feint, Sovereign Roar); these are narrative placeholders, not copied or verified Animal Kaiser move lists
- **Match structure:** three-victory solo run with surviving HP retained; local best-of-three; winner and next-bout screens; one card reward per completed arcade session
- **Accessibility:** keyboard + mouse/touch, status labels, no autoplay sound, motion disabled by OS reduced-motion or in-game reduced-motion toggle
- **Testing:** deterministic match and engine unit tests; Chromium full flows at desktop/tablet/phone/landscape; snapshot/art integrity; normal-motion and reduced-motion combat scenes

## Quality gate: what remains before calling Phase 4.5 complete

1. **Animation quality:** replace 2D sliding portrait attack poses with original sprite sequences or independently authored rigged 2D/3D animal models; distinct anticipation, travel, contact, recovery, knockout and victory clips.
2. **Accuracy:** build a citation-and-video-backed mechanics matrix for original G/T/P, damage scaling, critical attacks, Strong and Miracle bonuses, special triggers, timing windows, and game-specific round formats. Track unknowns explicitly.
3. **Game feel:** measure input-to-feedback latency, sound/animation synchronization, at-least-60fps target on ordinary desktop hardware, responsive mobile frame pacing, no skipped result states, clear hit weight, and camera polish. Do device testing, not just CI emulation.
4. **Art direction:** original stylized environments, UI typography, particles, real animal acting/poses, special move VFX, victory/defeat transitions, transition between match bouts, coordinated motion and music.
5. **Balance:** test 100+ deterministic matches plus manual playtests; use observed arcade footage to calibrate without claiming undisclosed official formula.
6. **Accessibility:** screen-reader alternatives, high-contrast health information, noncolor cues, remappable controls and no unavoidable rapid flashing.
7. **Retention:** binder/collection and multi-bout saves must be durable and safely versioned; avoid granting repeat rewards by rerender.
8. **Only then** release Phase 5 skins/rarity after completing this core gameplay quality milestone.

## Launch policy

Release the first vertical slice as a clearly marked **work in progress**, not as a full-fidelity remake. Approved artwork and existing card data stay intact. Do not use original game's copyrighted imagery, audio, animations or source code.
