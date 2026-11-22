import { useEffect, useRef } from 'react';
import { MENU_ITEMS } from '../app/navigation';

interface Props {
  active: boolean;
  index: number;
  keyboardFocus: boolean;
  onHover: (i: number) => void;
  onConfirm: (i: number) => void;
}

/** Selection marker: a small gilded arrowhead with a tiger-stripe flick. */
function Marker() {
  return (
    <svg className="menu__marker" viewBox="0 0 40 24" aria-hidden="true">
      <path d="M2 12 H14" stroke="#c9a159" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 9 l3 3 l-3 3" stroke="#c9a159" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3 L37 12 L14 21 L19 12 Z" fill="url(#mk-g)" stroke="#14112b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M19 12 L37 12" stroke="#fff4cf" strokeOpacity="0.7" strokeWidth="0.9" />
      <defs>
        <linearGradient id="mk-g" x1="0" y1="4" x2="0" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.5" stopColor="#d9a947" />
          <stop offset="1" stopColor="#8f6222" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** A painted brush underline that draws itself under the selected entry. */
function Brush() {
  return (
    <svg className="menu__brush" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 9 C40 5 90 4 150 6 C210 8 250 6 298 4 L296 8 C250 11 200 12 150 11 C90 10 40 12 4 12 Z" fill="#c9a159" />
    </svg>
  );
}

export function MainMenu({ active, index, keyboardFocus, onHover, onConfirm }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (active && keyboardFocus) refs.current[index]?.focus({ preventScroll: true });
  }, [active, index, keyboardFocus]);
  useEffect(() => {
    if (active) refs.current[index]?.focus({ preventScroll: true });
    // focus the remembered entry whenever the menu (re)appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <nav className={`menu${active ? ' is-active' : ''}`} aria-label="Main menu" aria-hidden={!active} data-testid="main-menu">
      <ul role="menu">
        {MENU_ITEMS.map((item, i) => {
          const sel = i === index;
          return (
            <li key={item.id} role="none" style={{ ['--i' as any]: i }}>
              <button
                ref={(el) => (refs.current[i] = el)}
                role="menuitem"
                type="button"
                tabIndex={active && sel ? 0 : -1}
                className={`menu__item${sel ? ' is-selected' : ''}`}
                aria-current={sel ? 'true' : undefined}
                data-testid={`menu-${item.id}`}
                onPointerEnter={(e) => e.pointerType === 'mouse' && active && onHover(i)}
                onFocus={() => active && i !== index && onHover(i)}
                onClick={() => active && onConfirm(i)}
              >
                <Marker />
                <span className="menu__label">{item.label}</span>
                <Brush />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="menu__caption" aria-live="polite">
        {MENU_ITEMS[index]?.caption}
      </p>
    </nav>
  );
}
