// The Noah's Arkade crest: a small engraved globe riding an ark-hull crescent,
// flanked by heraldic spiral curls, a five-point star above. Original artwork.
import type { SVGProps } from 'react';

export function CrestArt({ mono = false, idp = 'cr' }: { mono?: boolean; idp?: string }) {
  const gold = mono ? 'currentColor' : `url(#${idp}-gold)`;
  const ink = mono ? 'none' : '#14112b';
  const sea = mono ? 'none' : '#1f3f86';
  return (
    <g>
      {!mono && (
        <defs>
          <linearGradient id={`${idp}-gold`} x1="0" y1="-60" x2="0" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff1c4" />
            <stop offset="0.35" stopColor="#e7c06a" />
            <stop offset="0.62" stopColor="#a87a2e" />
            <stop offset="0.8" stopColor="#dcb25b" />
            <stop offset="1" stopColor="#8a5f22" />
          </linearGradient>
          <radialGradient id={`${idp}-sea`} cx="-0.3" cy="-0.35" r="1.2">
            <stop offset="0" stopColor="#3f6fb4" />
            <stop offset="1" stopColor="#14275e" />
          </radialGradient>
        </defs>
      )}
      {/* heraldic curls */}
      <g fill="none" stroke={gold} strokeWidth="4" strokeLinecap="round">
        <path d="M-40 8 C-62 8 -70 -10 -60 -22 C-52 -31 -40 -26 -42 -17 C-43 -11 -50 -11 -51 -16" />
        <path d="M40 8 C62 8 70 -10 60 -22 C52 -31 40 -26 42 -17 C43 -11 50 -11 51 -16" />
      </g>
      {/* globe */}
      <circle r="31" fill={mono ? 'none' : `url(#${idp}-sea)`} stroke={gold} strokeWidth="4" />
      <g fill="none" stroke={gold} strokeWidth="1.6" opacity={mono ? 1 : 0.85}>
        <ellipse rx="31" ry="10" />
        <ellipse rx="14" ry="31" />
        <line x1="0" y1="-31" x2="0" y2="31" />
        <line x1="-31" y1="0" x2="31" y2="0" />
      </g>
      {!mono && <path d="M-9 -17 C-2 -20 6 -15 3 -8 C1 -3 -6 -6 -10 -2 C-14 2 -19 -2 -17 -8 C-15 -13 -13 -15 -9 -17 Z M8 6 C14 4 19 9 15 14 C12 18 6 16 6 11 Z" fill="#c9a159" stroke={ink} strokeWidth="1" />}
      {/* ark hull crescent */}
      <path d="M-50 18 C-34 44 34 44 50 18 C38 26 -38 26 -50 18 Z" fill={gold} stroke={ink} strokeWidth="2" />
      <path d="M-34 30 C-14 36 14 36 34 30" fill="none" stroke={mono ? 'currentColor' : '#5a3d16'} strokeWidth="1.4" />
      {/* star */}
      <path d="M0 -58 L4 -47 L15 -47 L6 -40 L9 -29 L0 -36 L-9 -29 L-6 -40 L-15 -47 L-4 -47 Z" fill={gold} stroke={ink} strokeWidth="1.2" transform="translate(0 6) scale(0.8)" />
      {mono ? null : <circle r="31" fill="none" stroke={sea} strokeWidth="0" />}
    </g>
  );
}

export function Crest(props: SVGProps<SVGSVGElement> & { mono?: boolean }) {
  const { mono, ...rest } = props;
  return (
    <svg viewBox="-72 -64 144 112" role="img" aria-label="Noah's Arkade crest" {...rest}>
      <CrestArt mono={mono} idp="crest-solo" />
    </svg>
  );
}
