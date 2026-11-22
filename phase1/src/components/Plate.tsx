import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Action } from '../input/controls';
import { audio } from '../audio/audioManager';
import { ART_H, ART_W, type ArtRect } from '../app/navigation';

// The panel occupies the painted menu column, so the logo and animals stay as its frame.
export const PLATE: ArtRect = { x0: 500, y0: 444, x1: 1172, y1: 888 };

/**
 * A plate in the painted buttons' language: dark charcoal, cream double rule,
 * chamfered ends. It unfolds out of the button that opened it.
 */
export function Plate({ title, from, children, onBack, testId }: { title: string; from: ArtRect; children: ReactNode; onBack: () => void; testId: string }) {
  // origin of the unfold = centre of the source button, relative to the plate
  const ox = (((from.x0 + from.x1) / 2 - PLATE.x0) / (PLATE.x1 - PLATE.x0)) * 100;
  const oy = (((from.y0 + from.y1) / 2 - PLATE.y0) / (PLATE.y1 - PLATE.y0)) * 100;
  return (
    <section
      className="plate"
      role="dialog"
      aria-labelledby={`${testId}-title`}
      data-testid={testId}
      style={{
        left: `${(PLATE.x0 / ART_W) * 100}%`,
        top: `${(PLATE.y0 / ART_H) * 100}%`,
        width: `${((PLATE.x1 - PLATE.x0) / ART_W) * 100}%`,
        height: `${((PLATE.y1 - PLATE.y0) / ART_H) * 100}%`,
        transformOrigin: `${ox}% ${oy}%`,
      }}
    >
      <div className="plate__edge" aria-hidden="true" />
      <div className="plate__body">
        <h2 className="plate__title" id={`${testId}-title`}>
          {title}
        </h2>
        <div className="plate__content">{children}</div>
        <button type="button" className="plate__back" onClick={onBack} data-testid="plate-back">
          <span aria-hidden="true">◀</span> BACK <kbd>Esc</kbd>
        </button>
      </div>
    </section>
  );
}

export interface ListItem {
  id: string;
  label: string;
  note: string;
  tag?: string;
}

/** A keyboard/mouse list using the same arrow-cursor language as the main menu. */
export function PlateList({
  items,
  onActivate,
  registerHandler,
  testId,
}: {
  items: ListItem[];
  onActivate: (item: ListItem, index: number) => void;
  registerHandler: (h: ((a: Action) => boolean) | null) => void;
  testId: string;
}) {
  const [sel, setSel] = useState(0);
  const [denied, setDenied] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selRef = useRef(sel);
  selRef.current = sel;

  const activate = (i: number) => {
    onActivate(items[i], i);
    setDenied(null);
    requestAnimationFrame(() => setDenied(i));
  };

  useEffect(() => {
    registerHandler((a) => {
      if (a === 'UP' || a === 'LEFT') {
        setSel((v) => (v + items.length - 1) % items.length);
        audio.play('tick');
        return true;
      }
      if (a === 'DOWN' || a === 'RIGHT') {
        setSel((v) => (v + 1) % items.length);
        audio.play('tick');
        return true;
      }
      if (a === 'CONFIRM') {
        activate(selRef.current);
        return true;
      }
      return false;
    });
    return () => registerHandler(null);
  });

  useEffect(() => refs.current[sel]?.focus({ preventScroll: true }), [sel]);

  return (
    <>
      <ul className="plist" data-testid={testId}>
        {items.map((it, i) => (
          <li key={it.id}>
            <button
              ref={(el) => (refs.current[i] = el)}
              type="button"
              className={`plist__item${i === sel ? ' is-selected' : ''}${denied === i ? ' is-denied' : ''}`}
              tabIndex={i === sel ? 0 : -1}
              data-testid={`${testId}-${it.id}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && i !== sel && (setSel(i), audio.play('tick'))}
              onClick={() => (setSel(i), activate(i))}
            >
              <span className="plist__arrow" aria-hidden="true">
                ▶
              </span>
              <span className="plist__label">{it.label}</span>
              {it.tag && <span className="plist__tag">{it.tag}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="plate__note" aria-live="polite" data-testid={`${testId}-note`}>
        {items[sel].note}
      </p>
    </>
  );
}
