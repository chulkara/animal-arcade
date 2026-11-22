import { useEffect, useRef, useState, type ReactNode } from 'react';
import { defaultSettings, type MotionPref, type Settings } from '../state/settings';
import type { Action } from '../input/controls';
import { audio } from '../audio/audioManager';

type Row =
  | { kind: 'level'; key: 'master' | 'music' | 'sfx'; label: string }
  | { kind: 'switch'; key: 'muted' | 'grain' | 'globeMotion'; label: string; invert?: boolean }
  | { kind: 'motion'; label: string }
  | { kind: 'reset'; label: string }
  | { kind: 'back'; label: string };

const ROWS: Row[] = [
  { kind: 'level', key: 'master', label: 'MASTER VOLUME' },
  { kind: 'level', key: 'music', label: 'MUSIC' },
  { kind: 'level', key: 'sfx', label: 'SOUND EFFECTS' },
  { kind: 'switch', key: 'muted', label: 'SOUND', invert: true },
  { kind: 'motion', label: 'MOTION' },
  { kind: 'switch', key: 'globeMotion', label: 'GLOBE ROTATION' },
  { kind: 'switch', key: 'grain', label: 'FILM GRAIN' },
  { kind: 'reset', label: 'RESTORE DEFAULTS' },
  { kind: 'back', label: 'RETURN' },
];

const MOTION_ORDER: MotionPref[] = ['system', 'full', 'reduced'];
const MOTION_LABEL: Record<MotionPref, string> = { system: 'FOLLOW SYSTEM', full: 'FULL', reduced: 'REDUCED' };

interface Props {
  settings: Settings;
  systemReduced: boolean;
  update: (p: Partial<Settings>) => void;
  replace: (s: Settings) => void;
  onBack: () => void;
  registerHandler: (h: ((a: Action) => boolean) | null) => void;
}

export function OptionsMenu({ settings, systemReduced, update, replace, onBack, registerHandler }: Props) {
  const [row, setRow] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const audioLive = audio.unlocked;

  const adjust = (r: Row, dir: number) => {
    if (r.kind === 'level') {
      const v = Math.max(0, Math.min(10, settings[r.key] + dir));
      if (v !== settings[r.key]) {
        update({ [r.key]: v } as Partial<Settings>);
        // audible level preview on the bus being changed
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
    if (r.kind === 'back') return onBack();
    if (r.kind === 'reset') {
      replace({ ...defaultSettings });
      audio.play('confirm');
      return;
    }
    if (r.kind !== 'level') adjust(r, 1);
  };

  // Keyboard handling is routed here by the app while OPTIONS is open.
  const stateRef = useRef({ row, settings });
  stateRef.current = { row, settings };
  useEffect(() => {
    registerHandler((a) => {
      const r = ROWS[stateRef.current.row];
      switch (a) {
        case 'UP':
          setRow((v) => (v + ROWS.length - 1) % ROWS.length);
          audio.play('tick');
          return true;
        case 'DOWN':
          setRow((v) => (v + 1) % ROWS.length);
          audio.play('tick');
          return true;
        case 'LEFT':
          adjust(r, -1);
          return true;
        case 'RIGHT':
          adjust(r, 1);
          return true;
        case 'CONFIRM':
          activate(r);
          return true;
        default:
          return false;
      }
    });
    return () => registerHandler(null);
  });

  useEffect(() => {
    const el = refs.current[row];
    el?.focus({ preventScroll: true });
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [row]);

  const effectiveReduced = settings.motion === 'reduced' || (settings.motion === 'system' && systemReduced);

  return (
    <div className="options" data-testid="options">
      <ul className="options__rows">
        {ROWS.map((r, i) => {
          const sel = i === row;
          let control: ReactNode = null;
          if (r.kind === 'level') {
            const v = settings[r.key];
            control = (
              <span className="pips" aria-hidden="true">
                <button type="button" tabIndex={-1} className="pips__arrow" onClick={() => (setRow(i), adjust(r, -1))} aria-label={`Lower ${r.label}`}>
                  ◂
                </button>
                {Array.from({ length: 10 }, (_, k) => (
                  <button
                    key={k}
                    type="button"
                    tabIndex={-1}
                    className={`pip${k < v ? ' is-on' : ''}`}
                    onClick={() => (setRow(i), adjust(r, k + 1 === v ? -1 : k + 1 - v))}
                    aria-label={`${r.label} ${k + 1}`}
                  />
                ))}
                <button type="button" tabIndex={-1} className="pips__arrow" onClick={() => (setRow(i), adjust(r, 1))} aria-label={`Raise ${r.label}`}>
                  ▸
                </button>
                <span className="pips__num">{String(v).padStart(2, '0')}</span>
              </span>
            );
          } else if (r.kind === 'switch') {
            const on = r.invert ? !settings[r.key] : settings[r.key];
            control = (
              <span className={`switch${on ? ' is-on' : ''}`} aria-hidden="true">
                <span className={on ? 'is-lit' : ''}>ON</span>
                <span className={!on ? 'is-lit' : ''}>OFF</span>
              </span>
            );
          } else if (r.kind === 'motion') {
            control = (
              <span className="cycle" aria-hidden="true">
                ◂ <b>{MOTION_LABEL[settings.motion]}</b> ▸
                {settings.motion === 'system' && <em>{systemReduced ? ' (reduced)' : ' (full)'}</em>}
              </span>
            );
          }
          const common = {
            ref: (el: HTMLElement | null) => (refs.current[i] = el),
            className: `options__row options__row--${r.kind}${sel ? ' is-selected' : ''}`,
            tabIndex: sel ? 0 : -1,
            onPointerEnter: (e: React.PointerEvent) => e.pointerType === 'mouse' && i !== row && (setRow(i), audio.play('tick')),
            onFocus: () => i !== row && setRow(i),
            'data-testid': `opt-${'key' in r ? r.key : r.kind}`,
          };
          let aria: Record<string, unknown>;
          if (r.kind === 'level') aria = { role: 'slider', 'aria-valuemin': 0, 'aria-valuemax': 10, 'aria-valuenow': settings[r.key], 'aria-label': r.label };
          else if (r.kind === 'switch') aria = { role: 'switch', 'aria-checked': r.invert ? !settings[r.key] : settings[r.key], 'aria-label': r.label };
          else if (r.kind === 'motion') aria = { role: 'button', 'aria-label': `Motion: ${MOTION_LABEL[settings.motion]}` };
          else aria = { role: 'button' };
          return (
            <li key={i} {...(common as any)} {...aria} onClick={r.kind === 'level' ? undefined : () => (setRow(i), activate(r))}>
              <span className="options__label">{r.label}</span>
              <span className="options__control">{control}</span>
            </li>
          );
        })}
      </ul>
      <p className="options__note">
        {!audioLive && 'Sound starts after your first input. '}
        {effectiveReduced ? 'Reduced motion: transitions become fades and the globe turns slowly.' : 'Settings are saved on this device.'}
      </p>
    </div>
  );
}
