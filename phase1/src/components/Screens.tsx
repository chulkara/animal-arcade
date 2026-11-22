import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Action } from '../input/controls';
import { audio } from '../audio/audioManager';
import { defaultSettings, type MotionPref, type Settings } from '../state/settings';
import { PlateList, type ListItem } from './Plate';

type Register = (h: ((a: Action) => boolean) | null) => void;

const PLAY_ITEMS: ListItem[] = [
  { id: 'solo', label: '1 PLAYER', note: 'Battle the computer. Arrives with the battle phase.', tag: 'SOON' },
  { id: 'versus', label: '2 PLAYERS', note: 'Two players, one keyboard. Arrives with the battle phase.', tag: 'SOON' },
  { id: 'howto', label: 'HOW TO PLAY', note: 'Pick an Animal, a Strong and a Miracle card. Stop the attack reel (Guts, Technique or Power), then the power reel. The stronger result strikes.' },
];

export function PlaySelect({ registerHandler }: { registerHandler: Register }) {
  return (
    <PlateList
      testId="play"
      items={PLAY_ITEMS}
      registerHandler={registerHandler}
      onActivate={(it) => audio.play(it.tag ? 'denied' : 'select')}
    />
  );
}

function CardSilhouette({ role }: { role: string }) {
  return (
    <figure className="slot">
      <div className="slot__card" aria-hidden="true">
        <span>?</span>
      </div>
      <figcaption>{role}</figcaption>
    </figure>
  );
}

export function CardsPreview() {
  return (
    <div className="preview" data-testid="cards">
      <div className="slots">
        <CardSilhouette role="ANIMAL" />
        <CardSilhouette role="STRONG" />
        <CardSilhouette role="MIRACLE" />
      </div>
      <p className="plate__note">One of each kind makes a battle set. Cards are won by playing.</p>
      <Stamp>NO CARDS YET</Stamp>
    </div>
  );
}

export function BinderPreview() {
  return (
    <div className="preview" data-testid="binder">
      <div className="binder" aria-hidden="true">
        {[0, 1].map((p) => (
          <div key={p} className="binder__page">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="binder__pocket" />
            ))}
          </div>
        ))}
      </div>
      <p className="plate__note">Every card you collect, with its rare finishes, is kept here.</p>
      <Stamp>0 COLLECTED</Stamp>
    </div>
  );
}

export function ShopPreview() {
  return (
    <div className="preview" data-testid="shop">
      <div className="shop-sign" aria-hidden="true">
        <span>CLOSED</span>
      </div>
      <p className="plate__note">Nothing for sale. Card packs will be won in battle, not bought.</p>
      <Stamp>OPENS IN A LATER PHASE</Stamp>
    </div>
  );
}

function Stamp({ children }: { children: ReactNode }) {
  return <p className="stamp">{children}</p>;
}

// ───────────────────────── settings ─────────────────────────
type Row =
  | { kind: 'level'; key: 'master' | 'music' | 'sfx'; label: string }
  | { kind: 'switch'; key: 'muted' | 'scanlines'; label: string; invert?: boolean }
  | { kind: 'motion'; label: string }
  | { kind: 'reset'; label: string };

const ROWS: Row[] = [
  { kind: 'level', key: 'master', label: 'MASTER' },
  { kind: 'level', key: 'music', label: 'MUSIC' },
  { kind: 'level', key: 'sfx', label: 'EFFECTS' },
  { kind: 'switch', key: 'muted', label: 'SOUND', invert: true },
  { kind: 'motion', label: 'MOTION' },
  { kind: 'switch', key: 'scanlines', label: 'CRT LINES' },
  { kind: 'reset', label: 'DEFAULTS' },
];
const MOTION_ORDER: MotionPref[] = ['system', 'full', 'reduced'];
const MOTION_LABEL: Record<MotionPref, string> = { system: 'AUTO', full: 'FULL', reduced: 'REDUCED' };

export function Options({
  settings,
  systemReduced,
  update,
  replace,
  registerHandler,
}: {
  settings: Settings;
  systemReduced: boolean;
  update: (p: Partial<Settings>) => void;
  replace: (s: Settings) => void;
  registerHandler: Register;
}) {
  const [row, setRow] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const adjust = (r: Row, dir: number) => {
    if (r.kind === 'level') {
      const v = Math.max(0, Math.min(10, settings[r.key] + dir));
      if (v !== settings[r.key]) {
        update({ [r.key]: v } as Partial<Settings>);
        setTimeout(() => audio.play(r.key === 'music' ? 'tick' : 'select'), 30);
      }
    } else if (r.kind === 'switch') {
      update({ [r.key]: !settings[r.key] } as Partial<Settings>);
      audio.play('select');
    } else if (r.kind === 'motion') {
      const i = MOTION_ORDER.indexOf(settings.motion);
      update({ motion: MOTION_ORDER[(i + (dir >= 0 ? 1 : -1) + MOTION_ORDER.length) % MOTION_ORDER.length] });
      audio.play('select');
    }
  };
  const activate = (r: Row) => {
    if (r.kind === 'reset') {
      replace({ ...defaultSettings });
      audio.play('confirm');
    } else if (r.kind !== 'level') adjust(r, 1);
  };

  const live = useRef({ row, settings });
  live.current = { row, settings };
  useEffect(() => {
    registerHandler((a) => {
      const r = ROWS[live.current.row];
      if (a === 'UP' || a === 'DOWN') {
        setRow((v) => (v + (a === 'UP' ? ROWS.length - 1 : 1)) % ROWS.length);
        audio.play('tick');
        return true;
      }
      if (a === 'LEFT' || a === 'RIGHT') {
        adjust(r, a === 'LEFT' ? -1 : 1);
        return true;
      }
      if (a === 'CONFIRM') {
        activate(r);
        return true;
      }
      return false;
    });
    return () => registerHandler(null);
  });
  useEffect(() => refs.current[row]?.focus({ preventScroll: true }), [row]);

  return (
    <div className="opts" data-testid="options">
      <ul className="opts__rows">
        {ROWS.map((r, i) => {
          const sel = i === row;
          let control: ReactNode = null;
          let aria: Record<string, unknown> = { role: 'button' };
          if (r.kind === 'level') {
            const v = settings[r.key];
            aria = { role: 'slider', 'aria-valuemin': 0, 'aria-valuemax': 10, 'aria-valuenow': v, 'aria-label': r.label };
            control = (
              <span className="bar" aria-hidden="true">
                <button type="button" tabIndex={-1} className="bar__btn" onClick={() => (setRow(i), adjust(r, -1))}>
                  ◀
                </button>
                {Array.from({ length: 10 }, (_, k) => (
                  <button key={k} type="button" tabIndex={-1} className={`bar__seg${k < v ? ' is-on' : ''}`} onClick={() => (setRow(i), adjust(r, k + 1 === v ? -1 : k + 1 - v))} />
                ))}
                <button type="button" tabIndex={-1} className="bar__btn" onClick={() => (setRow(i), adjust(r, 1))}>
                  ▶
                </button>
                <span className="bar__num">{String(v).padStart(2, '0')}</span>
              </span>
            );
          } else if (r.kind === 'switch') {
            const on = r.invert ? !settings[r.key] : settings[r.key];
            aria = { role: 'switch', 'aria-checked': on, 'aria-label': r.label };
            control = (
              <span className="toggle" aria-hidden="true">
                <span className={on ? 'is-lit' : ''}>ON</span>
                <span className={!on ? 'is-lit' : ''}>OFF</span>
              </span>
            );
          } else if (r.kind === 'motion') {
            aria = { role: 'button', 'aria-label': `Motion ${MOTION_LABEL[settings.motion]}` };
            control = (
              <span className="cycle" aria-hidden="true">
                ◀ <b>{MOTION_LABEL[settings.motion]}</b> ▶{settings.motion === 'system' && <em>{systemReduced ? ' REDUCED' : ' FULL'}</em>}
              </span>
            );
          } else {
            control = <span className="cycle" aria-hidden="true">PRESS ENTER</span>;
          }
          return (
            <li
              key={i}
              ref={(el) => (refs.current[i] = el)}
              className={`opts__row${sel ? ' is-selected' : ''}`}
              tabIndex={sel ? 0 : -1}
              data-testid={`opt-${'key' in r ? r.key : r.kind}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && i !== row && (setRow(i), audio.play('tick'))}
              onClick={r.kind === 'level' ? () => setRow(i) : () => (setRow(i), activate(r))}
              {...(aria as any)}
            >
              <span className="opts__arrow" aria-hidden="true">
                ▶
              </span>
              <span className="opts__label">{r.label}</span>
              <span className="opts__control">{control}</span>
            </li>
          );
        })}
      </ul>
      <p className="plate__note opts__note">{!audio.unlocked ? 'Sound starts after your first key press. ' : ''}Saved on this computer.</p>
    </div>
  );
}
