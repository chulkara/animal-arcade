// Player settings: validated, persisted to localStorage, with a tiny subscribe API.

export type MotionPref = 'system' | 'reduced' | 'full';

export interface Settings {
  master: number; // 0..10
  music: number; // 0..10
  sfx: number; // 0..10
  muted: boolean;
  motion: MotionPref;
  scanlines: boolean; // optional CRT overlay; off by default so the painting is shown untouched
}

export const STORAGE_KEY = 'noahs-arkade.settings.v2';
export const INTRO_SEEN_KEY = 'noahs-arkade.intro-seen.v1';

export const defaultSettings: Settings = {
  master: 8,
  music: 6,
  sfx: 8,
  muted: false,
  motion: 'system',
  scanlines: false,
};

const clampLevel = (v: unknown, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(10, Math.round(v))) : d;
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);

export function sanitize(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    master: clampLevel(r.master, defaultSettings.master),
    music: clampLevel(r.music, defaultSettings.music),
    sfx: clampLevel(r.sfx, defaultSettings.sfx),
    muted: bool(r.muted, defaultSettings.muted),
    motion: r.motion === 'reduced' || r.motion === 'full' || r.motion === 'system' ? r.motion : defaultSettings.motion,
    scanlines: bool(r.scanlines, defaultSettings.scanlines),
  };
}

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadSettings(store: StorageLike | null = storage()): Settings {
  if (!store) return { ...defaultSettings };
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : { ...defaultSettings };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: Settings, store: StorageLike | null = storage()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: settings still apply for this session */
  }
}

export function hasSeenIntro(store: StorageLike | null = storage()): boolean {
  try {
    return store?.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
export function markIntroSeen(store: StorageLike | null = storage()): void {
  try {
    store?.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

/** Resolve the effective reduced-motion flag from the setting and the OS preference. */
export function isReducedMotion(pref: MotionPref, systemPrefersReduced: boolean): boolean {
  return pref === 'reduced' || (pref === 'system' && systemPrefersReduced);
}

/** Effective linear gain (0..1) for a bus, using a perceptual curve. */
export function busGain(s: Settings, bus: 'music' | 'sfx'): number {
  if (s.muted) return 0;
  const lv = (n: number) => (n <= 0 ? 0 : Math.pow(n / 10, 2));
  return lv(s.master) * lv(bus === 'music' ? s.music : s.sfx);
}
