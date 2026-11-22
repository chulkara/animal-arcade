import { MENU_ITEMS, px, py } from '../app/navigation';
import type { ArtRect } from '../app/navigation';
import { pillPoints, pillPolygon } from './Stage';

interface Props {
  index: number;
  visible: boolean;
  pressing: boolean;
  armed: boolean; // plays the one-time "light run" down the buttons after PRESS START
  onHover: (i: number) => void;
  onConfirm: (i: number) => void;
  interactive: boolean;
}

/**
 * The selection layer drawn over the painted buttons: invisible hit areas, a glow
 * that traces the selected button's painted border, a shine that sweeps once per
 * selection, and a pair of arrow cursors (matching the painted ones beside PLAY)
 * that glide between rows.
 */
export function MenuCursor({ index, visible, pressing, armed, onHover, onConfirm, interactive }: Props) {
  const r = MENU_ITEMS[index].rect;
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const cy = (r.y0 + r.y1) / 2;
  const P = MENU_ITEMS[0].rect;

  return (
    <div className={`cursor-layer${visible ? ' is-visible' : ''}${pressing ? ' is-pressing' : ''}${armed ? ' is-armed' : ''}`} data-testid="cursor-layer">
      {/* hit areas: real buttons for mouse, keyboard focus and screen readers */}
      <nav className="hit-areas" aria-label="Main menu" aria-hidden={!interactive}>
        {MENU_ITEMS.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={`hit${i === index ? ' is-selected' : ''}`}
            style={{ left: px(item.rect.x0), top: py(item.rect.y0), width: px(item.rect.x1 - item.rect.x0), height: py(item.rect.y1 - item.rect.y0), ['--i' as any]: i }}
            tabIndex={interactive && i === index ? 0 : -1}
            aria-current={i === index ? 'true' : undefined}
            aria-label={item.label}
            data-testid={`menu-${item.id}`}
            onPointerEnter={(e) => interactive && e.pointerType === 'mouse' && onHover(i)}
            onFocus={() => interactive && i !== index && onHover(i)}
            onClick={() => interactive && onConfirm(i)}
          >
            {/* the light run after PRESS START: each button's border flickers once, top to bottom */}
            <svg className="hit__run" viewBox={`0 0 ${item.rect.x1 - item.rect.x0} ${item.rect.y1 - item.rect.y0}`} preserveAspectRatio="none" aria-hidden="true">
              <polygon points={pillPoints(item.rect.x1 - item.rect.x0, item.rect.y1 - item.rect.y0, 1.5)} />
            </svg>
          </button>
        ))}
      </nav>

      {/* When the cursor leaves PLAY, PLAY is redrawn unlit (as the other painted buttons are)
          and the painted arrows beside it are softened. With PLAY selected nothing is drawn here,
          so the approved painting shows exactly as it is. */}
      <div className={`unlit${index !== 0 ? ' is-on' : ''}`} aria-hidden="true">
        <span className="unlit__erase" style={{ left: px(578), top: py(488), width: px(52), height: py(86), background: '#414c55' }} />
        <span className="unlit__erase" style={{ left: px(1042), top: py(488), width: px(52), height: py(86), background: '#455050' }} />
        <span className="unlit__halo" style={{ left: px(P.x0 - 8), top: py(P.y0 - 7), width: px(P.x1 - P.x0 + 16), height: py(P.y1 - P.y0 + 14) }} />
        <Pill rect={P} label="PLAY" lit={false} big />
      </div>

      {index !== 0 && <Pill key={`lit-${index}`} rect={r} label={MENU_ITEMS[index].label} lit className="lit" />}

      {/* transient shine + press flash on whichever button is selected */}
      <div className="sel" style={{ left: px(r.x0), top: py(r.y0), width: px(w), height: py(h), clipPath: pillPolygon(w, h) }} aria-hidden="true">
        <div className="sel__shine" key={index} />
        <div className="sel__flash" />
      </div>

      <svg className={`arrow arrow--l${index === 0 ? ' is-painted' : ''}`} style={{ left: px(r.x0 - 46), top: py(cy - 14), width: px(23), height: py(28) }} viewBox="0 0 23 28" aria-hidden="true">
        <path d="M1 1 L22 14 L1 27 Z" />
      </svg>
      <svg className={`arrow arrow--r${index === 0 ? ' is-painted' : ''}`} style={{ left: px(r.x1 + 24), top: py(cy - 14), width: px(23), height: py(28) }} viewBox="0 0 23 28" aria-hidden="true">
        <path d="M22 1 L1 14 L22 27 Z" />
      </svg>
    </div>
  );
}

/** A button drawn in the painting's own style: cream rule + charcoal (unlit) or yellow (lit). */
function Pill({ rect, label, lit, big = false, className = '' }: { rect: ArtRect; label: string; lit: boolean; big?: boolean; className?: string }) {
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  return (
    <span
      className={`pill${lit ? ' pill--lit' : ''}${big ? ' pill--big' : ''} ${className}`}
      style={{ left: px(rect.x0), top: py(rect.y0), width: px(w), height: py(h) }}
      aria-hidden="true"
    >
      <span className="pill__edge" style={{ clipPath: pillPolygon(w, h, 0.5) }} />
      <span className="pill__face" style={{ clipPath: pillPolygon(w - 6, h - 6, 0.5) }} />
      <span className="pill__label">{label}</span>
    </span>
  );
}
