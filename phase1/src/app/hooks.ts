import { useCallback, useEffect, useState } from 'react';
import { audio } from '../audio/audioManager';
import { loadSettings, saveSettings, isReducedMotion, type Settings } from '../state/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  useEffect(() => {
    saveSettings(settings);
    audio.apply(settings);
  }, [settings]);
  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const replace = useCallback((s: Settings) => setSettings(s), []);
  return { settings, update, replace };
}

export function useSystemReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)';
  const [v, setV] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(q);
    const on = () => setV(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return v;
}

export function useReducedMotion(settings: Settings) {
  return isReducedMotion(settings.motion, useSystemReducedMotion());
}
