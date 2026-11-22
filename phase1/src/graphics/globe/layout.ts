import type { Stage } from '../../app/navigation';

export interface GlobeLayout {
  cx: number; // screen px
  cy: number;
  r: number;
  dim: number; // 0..1 brightness multiplier
}

/** Where the globe sits for each stage. Shared by the WebGL scene and the CSS fallback. */
export function globeLayout(stage: Stage, w: number, h: number): GlobeLayout {
  const portrait = h > w * 1.05;
  if (portrait) {
    switch (stage) {
      case 'menu':
        return { cx: w / 2, cy: h * 0.355, r: Math.min(w * 0.38, h * 0.19), dim: 0.92 };
      case 'panel':
        return { cx: w / 2, cy: h * 0.13, r: Math.min(w * 0.26, h * 0.12), dim: 0.55 };
      case 'dark':
        return { cx: w / 2, cy: h * 0.66, r: Math.min(w * 0.42, h * 0.27), dim: 1 };
      default:
        return { cx: w / 2, cy: h * 0.6, r: Math.min(w * 0.46, h * 0.3), dim: 1 };
    }
  }
  const short = h < 520; // phone landscape
  switch (stage) {
    case 'dark': // intro start: slightly lower and smaller, so the reveal includes a slow rise
      return { cx: w / 2, cy: h * (short ? 0.7 : 0.7), r: Math.min(h * (short ? 0.28 : 0.3), w * 0.27), dim: 1 };
    case 'menu':
      return { cx: w * 0.67, cy: h * (short ? 0.56 : 0.55), r: Math.min(h * (short ? 0.4 : 0.39), w * 0.27), dim: 0.97 };
    case 'panel':
      return { cx: w * 0.8, cy: h * 0.6, r: Math.min(h * 0.33, w * 0.2), dim: 0.5 };
    default:
      return { cx: w / 2, cy: h * (short ? 0.65 : 0.655), r: Math.min(h * (short ? 0.31 : 0.315), w * 0.28), dim: 1 };
  }
}
