// NOAH'S ARKADE logotype. Vector artwork built from extracted letter outlines
// (Abril Fatface / Cinzel, SIL OFL) arranged on an arcade-marquee arch with a
// bespoke K swash, layered extrusion, bevel, painted grain and a gilded sweep.
import { useMemo } from 'react';
import glyphs from './glyphs.json';
import { CrestArt } from './Crest';

type Glyph = { ch: string; d: string; adv: number; x1: number; x2: number; y1: number; y2: number };
const ARKADE = glyphs.arkade as Glyph[];
const NOAHS = glyphs.noahs as Glyph[];

export type LogoVariant = 'full' | 'compact' | 'mono';

const VB_W = 1000;
const ARC_R = 1650; // radius of the marquee arch
const BASE_Y = 352; // baseline at the centre of the arch
const TRACK = 4;
const CX = VB_W / 2;

interface Placed extends Glyph {
  x: number;
  y: number;
  rot: number; // degrees
}

function layoutArkade(): Placed[] {
  const total = ARKADE.reduce((a, g) => a + g.adv, 0) + TRACK * (ARKADE.length - 1);
  let s = -total / 2;
  return ARKADE.map((g) => {
    const t = s / ARC_R;
    const x = CX + ARC_R * Math.sin(t);
    const y = BASE_Y + ARC_R * (1 - Math.cos(t));
    s += g.adv + TRACK;
    return { ...g, x, y, rot: (t * 180) / Math.PI };
  });
}

/** Point `below` px under the arch baseline at arc-length s (for the K swash). */
function underArch(s: number, below: number) {
  const t = s / ARC_R;
  const r = ARC_R - below;
  return { x: CX + r * Math.sin(t), y: BASE_Y + ARC_R - r * Math.cos(t) };
}

export function NoahsArkadeLogo({ variant = 'full', className, title = "Noah's Arkade" }: { variant?: LogoVariant; className?: string; title?: string }) {
  const letters = useMemo(layoutArkade, []);
  const mono = variant === 'mono';
  const id = `na-${variant}`;

  // Bespoke K: its leg flows into a long swash beneath "ADE", ending in a spiral curl.
  const swash = useMemo(() => {
    const total = ARKADE.reduce((a, g) => a + g.adv, 0) + TRACK * (ARKADE.length - 1);
    const sK = -total / 2 + ARKADE[0].adv + ARKADE[1].adv + TRACK * 2; // start of K
    const sEnd = total / 2 + 6;
    const p0 = underArch(sK + 118, 2);
    const p1 = underArch(sK + 150, 22);
    const p2 = underArch((sK + sEnd) / 2 + 40, 30);
    const p3 = underArch(sEnd - 26, 24);
    const p4 = underArch(sEnd, 10);
    const f = (p: { x: number; y: number }) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    // Tapered ribbon: outbound upper edge then a thinner return edge.
    const q1 = underArch(sK + 150, 30);
    const q2 = underArch((sK + sEnd) / 2 + 40, 36);
    const q3 = underArch(sEnd - 26, 28);
    return {
      body: `M${f(p0)} C${f(p1)} ${f(p1)} ${f(underArch(sK + 190, 28))} S${f(p2)} ${f(p3)} Q${f(p4)} ${f(underArch(sEnd - 6, 2))} Q${f(underArch(sEnd - 12, 18))} ${f(q3)} S${f(q2)} ${f(underArch(sK + 200, 36))} C${f(q1)} ${f(q1)} ${f(underArch(sK + 108, 2))} Z`,
      curl: `M${f(underArch(sEnd - 6, 2))} C${f(underArch(sEnd + 10, -14))} ${f(underArch(sEnd - 14, -28))} ${f(underArch(sEnd - 22, -14))} C${f(underArch(sEnd - 26, -6))} ${f(underArch(sEnd - 16, -2))} ${f(underArch(sEnd - 12, -8))}`,
    };
  }, []);

  // NOAH'S on the ribbon, letter-spaced.
  const noahs = useMemo(() => {
    const tr = 12;
    const total = NOAHS.reduce((a, g) => a + g.adv, 0) + tr * (NOAHS.length - 1);
    let x = CX - total / 2;
    return NOAHS.map((g) => {
      const gx = x;
      x += g.adv + tr;
      return { ...g, gx };
    });
  }, []);

  const showRibbon = variant !== 'compact';
  const showCrest = variant === 'full';
  const top = showCrest ? 0 : showRibbon ? 56 : 92;
  const vbH = variant === 'full' ? 462 : variant === 'compact' ? 380 : 440;

  return (
    <svg
      className={['na-logo', `na-logo--${variant}`, className].filter(Boolean).join(' ')}
      viewBox={`0 ${top} ${VB_W} ${vbH - top}`}
      role="img"
      aria-label={title}
    >
      <defs>
        {ARKADE.map((g, i) => (
          <path key={i} id={`${id}-g${i}`} d={g.d} />
        ))}
        {letters.map((_, i) => (
          <clipPath key={i} id={`${id}-c${i}`}>
            <use href={`#${id}-g${i}`} />
          </clipPath>
        ))}
        {/* Arcade-gold banding authored in each letter's own space so every glyph shares it. */}
        <linearGradient id={`${id}-face`} x1="0" y1="-146" x2="0" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff6d6" />
          <stop offset="0.18" stopColor="#f3d488" />
          <stop offset="0.46" stopColor="#d9a947" />
          <stop offset="0.5" stopColor="#8f6222" />
          <stop offset="0.6" stopColor="#b9842f" />
          <stop offset="0.82" stopColor="#efc66b" />
          <stop offset="1" stopColor="#a8772b" />
        </linearGradient>
        <linearGradient id={`${id}-extr`} x1="0" y1="-140" x2="0" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2a2563" />
          <stop offset="1" stopColor="#120f33" />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="64" x2="0" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d2482f" />
          <stop offset="0.55" stopColor="#a8301f" />
          <stop offset="1" stopColor="#7c2117" />
        </linearGradient>
        <linearGradient id={`${id}-sweep`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fffbe8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* Painted/printed grain: low-contrast noise multiplied into the gold. */}
        <filter id={`${id}-grain`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0.22 0" result="g" />
          <feComposite in="g" in2="SourceGraphic" operator="in" result="gi" />
          <feBlend in="SourceGraphic" in2="gi" mode="multiply" />
        </filter>
        <linearGradient id={`${id}-swashfill`} x1="0" y1="350" x2="0" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f3d488" />
            <stop offset="1" stopColor="#a8772b" />
          </linearGradient>
        <clipPath id={`${id}-all`}>
          {letters.map((g, i) => (
            <use key={i} href={`#${id}-g${i}`} transform={`translate(${g.x} ${g.y}) rotate(${g.rot})`} />
          ))}
        </clipPath>
      </defs>

      {/* Ambient glow layer (very soft) */}
      {!mono && (
        <g className="na-logo__glow" aria-hidden="true">
          {letters.map((g, i) => (
            <use key={i} href={`#${id}-g${i}`} transform={`translate(${g.x} ${g.y}) rotate(${g.rot})`} fill="#e8b85a" />
          ))}
        </g>
      )}

      {showCrest && (
        <g transform={`translate(${CX} 62) scale(0.92)`}>
          <g className="na-logo__crest">
            <CrestArt mono={mono} idp={`${id}-crest`} />
          </g>
        </g>
      )}

      {showRibbon && (
        <g className="na-logo__ribbon">
          {!mono && (
            <>
              {/* folded tails */}
              <path d="M318 96 L282 92 L298 116 L282 140 L338 136 Z" fill="#7a2016" stroke="#14112b" strokeWidth="3" strokeLinejoin="round" />
              <path d="M682 96 L718 92 L702 116 L718 140 L662 136 Z" fill="#7a2016" stroke="#14112b" strokeWidth="3" strokeLinejoin="round" />
              <path d="M318 96 L338 104 L338 136 Z" fill="#4a120c" />
              <path d="M682 96 L662 104 L662 136 Z" fill="#4a120c" />
            </>
          )}
          <path
            d="M330 82 Q500 64 670 82 L670 128 Q500 110 330 128 Z"
            fill={mono ? 'none' : `url(#${id}-ribbon)`}
            stroke={mono ? 'currentColor' : '#14112b'}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {!mono && <path d="M340 88 Q500 71 660 88" fill="none" stroke="#f0b07a" strokeOpacity="0.45" strokeWidth="1.5" />}
          <g transform="translate(0 0)">
            {noahs.map((g, i) => {
              // follow the ribbon's gentle sag
              const t = (g.gx + g.adv / 2 - 330) / 340;
              const sag = -Math.sin(t * Math.PI) * 9;
              return (
                <path
                  key={i}
                  d={g.d}
                  transform={`translate(${g.gx} ${121 + sag})`}
                  fill={mono ? 'currentColor' : '#f6ecd4'}
                  stroke={mono ? 'none' : '#2a0e0a'}
                  strokeWidth="1.2"
                  paintOrder="stroke"
                />
              );
            })}
          </g>
        </g>
      )}

      {/* ARKADE */}
      <g className="na-logo__word">
        {/* swash from the K (behind letters) */}
        <g className="na-logo__swash">
          {!mono && <path d={swash.body} fill="#14112b" transform="translate(3 6)" />}
          <path d={swash.body} fill={mono ? 'currentColor' : `url(#${id}-swashfill)`} stroke={mono ? 'none' : '#14112b'} strokeWidth="2.5" strokeLinejoin="round" />
          <path d={swash.curl} fill="none" stroke={mono ? 'currentColor' : '#d9a947'} strokeWidth="5" strokeLinecap="round" />
        </g>

        {letters.map((g, i) => (
          <g key={i} className="na-logo__letter" style={{ ['--i' as any]: i }}>
            <g transform={`translate(${g.x} ${g.y}) rotate(${g.rot})`}>
              {!mono && (
                <g className="na-logo__extrusion">
                  {Array.from({ length: 9 }, (_, k) => (
                    <use key={k} href={`#${id}-g${i}`} transform={`translate(${(k + 1) * 0.7} ${(k + 1) * 1.45})`} fill={`url(#${id}-extr)`} stroke="#0c0a22" strokeWidth={k === 8 ? 9 : 0} strokeLinejoin="round" />
                  ))}
                </g>
              )}
              <use href={`#${id}-g${i}`} fill="none" stroke={mono ? 'none' : '#14112b'} strokeWidth="8" strokeLinejoin="round" />
              <g filter={mono ? undefined : `url(#${id}-grain)`}>
                <use href={`#${id}-g${i}`} fill={mono ? 'currentColor' : `url(#${id}-face)`} />
              </g>
              {!mono && (
                <g clipPath={`url(#${id}-c${i})`}>
                  {/* bevel: lower-right inner shade, upper-left inner light */}
                  <use href={`#${id}-g${i}`} transform="translate(2.6 3.4)" fill="none" stroke="#6e4a17" strokeWidth="5" strokeOpacity="0.7" />
                  <use href={`#${id}-g${i}`} transform="translate(-1.6 -2.2)" fill="none" stroke="#fff4cf" strokeWidth="3" strokeOpacity="0.85" />
                </g>
              )}
            </g>
          </g>
        ))}

        {!mono && (
          <g clipPath={`url(#${id}-all)`} className="na-logo__sweepclip" aria-hidden="true">
            <rect className="na-logo__sweep" x="-260" y="150" width="220" height="260" fill={`url(#${id}-sweep)`} transform="skewX(-22)" />
          </g>
        )}
      </g>

      {variant === 'full' && (
        <g className="na-logo__rule" fill="none" stroke={mono ? 'currentColor' : '#c9a159'}>
          <text
            x={CX}
            y="436"
            textAnchor="middle"
            fill={mono ? 'currentColor' : '#efe3c4'}
            stroke={mono ? 'none' : '#0c0a22'}
            strokeWidth="5"
            paintOrder="stroke"
            strokeLinejoin="round"
            style={{ font: '600 19px Cinzel, serif', letterSpacing: '0.42em' }}
          >
            ANIMAL · BATTLE · COLLECTION
          </text>
          <path d="M170 430 H318 M682 430 H830" strokeWidth="1.5" />
          <path d="M170 436 H300 M700 436 H830" strokeWidth="0.8" />
          <path d="M162 433 l6 -5 l6 5 l-6 5 Z M826 433 l6 -5 l6 5 l-6 5 Z" fill={mono ? 'currentColor' : '#c9a159'} stroke="none" />
        </g>
      )}
    </svg>
  );
}
