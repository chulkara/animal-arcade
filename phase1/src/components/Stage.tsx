import type { ReactNode } from 'react';
import { ART_H, ART_W } from '../app/navigation';

export const ART_URL = `${import.meta.env.BASE_URL}art/approved-menu.png`;

/**
 * The approved painting, shown whole and unaltered at "contain" size. Everything
 * interactive is an overlay positioned in the painting's own coordinates.
 * The letterbox is filled with a blurred, darkened copy so the bars feel intentional.
 */
export function PaintedStage({ children, onArtLoad }: { children: ReactNode; onArtLoad?: () => void }) {
  return (
    <div className="stage-wrap">
      <div className="stage-ambient" style={{ backgroundImage: `url(${ART_URL})` }} aria-hidden="true" />
      <div className="stage" data-testid="stage">
        <img
          className="stage__art"
          src={ART_URL}
          width={ART_W}
          height={ART_H}
          alt="Noah's Arkade: a blue tiger, eagle, elephant, lion and rhino around a painted globe, with the game's menu"
          draggable={false}
          onLoad={onArtLoad}
          data-testid="approved-art"
        />
        {children}
      </div>
    </div>
  );
}

/** Chamfered "pill" polygon matching the painted buttons, in percentages of its own box. */
export function pillPolygon(w: number, h: number, chamfer = 0.48) {
  const c = ((h * chamfer) / w) * 100;
  return `polygon(0% 50%, ${c}% 0%, ${100 - c}% 0%, 100% 50%, ${100 - c}% 100%, ${c}% 100%)`;
}

export function pillPoints(w: number, h: number, inset = 0, chamfer = 0.48) {
  const c = h * chamfer;
  const i = inset;
  return [
    [i, h / 2],
    [c + i * 0.6, i],
    [w - c - i * 0.6, i],
    [w - i, h / 2],
    [w - c - i * 0.6, h - i],
    [c + i * 0.6, h - i],
  ]
    .map((p) => p.map((v) => v.toFixed(2)).join(','))
    .join(' ');
}
