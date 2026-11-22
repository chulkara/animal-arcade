import { describe, expect, it } from 'vitest';
import { busGain, defaultSettings, isReducedMotion, loadSettings, sanitize, saveSettings, STORAGE_KEY, type StorageLike } from '../../src/state/settings';
import { actionForKey, FUTURE_BATTLE_BINDINGS } from '../../src/input/controls';
import { globeLayout } from '../../src/graphics/globe/layout';

const memory = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

describe('settings', () => {
  it('round-trips through storage', () => {
    const store = memory();
    const s = { ...defaultSettings, master: 3, muted: true, motion: 'reduced' as const, grain: false };
    saveSettings(s, store);
    expect(JSON.parse(store.data[STORAGE_KEY])).toEqual(s);
    expect(loadSettings(store)).toEqual(s);
  });

  it('falls back to defaults on corrupt or missing data', () => {
    const store = memory();
    expect(loadSettings(store)).toEqual(defaultSettings);
    store.setItem(STORAGE_KEY, '{nope');
    expect(loadSettings(store)).toEqual(defaultSettings);
    expect(loadSettings(null)).toEqual(defaultSettings);
  });

  it('clamps and validates every field', () => {
    const s = sanitize({ master: 42, music: -3, sfx: 'loud', muted: 'yes', motion: 'warp', grain: false, globeMotion: null });
    expect(s).toEqual({ ...defaultSettings, master: 10, music: 0, grain: false });
  });

  it('mute and zero levels silence a bus; levels follow a perceptual curve', () => {
    expect(busGain({ ...defaultSettings, muted: true }, 'sfx')).toBe(0);
    expect(busGain({ ...defaultSettings, master: 0 }, 'music')).toBe(0);
    expect(busGain({ ...defaultSettings, master: 10, sfx: 10 }, 'sfx')).toBe(1);
    expect(busGain({ ...defaultSettings, master: 10, sfx: 5 }, 'sfx')).toBeCloseTo(0.25);
  });

  it('resolves reduced motion from the setting and the system preference', () => {
    expect(isReducedMotion('system', true)).toBe(true);
    expect(isReducedMotion('system', false)).toBe(false);
    expect(isReducedMotion('full', true)).toBe(false);
    expect(isReducedMotion('reduced', false)).toBe(true);
  });
});

describe('input bindings', () => {
  it('maps arrows, WASD, Enter/Space and Escape/Backspace', () => {
    expect(actionForKey('ArrowUp')).toBe('UP');
    expect(actionForKey('KeyS')).toBe('DOWN');
    expect(actionForKey('Space')).toBe('CONFIRM');
    expect(actionForKey('Enter')).toBe('CONFIRM');
    expect(actionForKey('Backspace')).toBe('BACK');
    expect(actionForKey('Escape')).toBe('BACK');
    expect(actionForKey('KeyQ')).toBeNull();
  });

  it('keeps future battle buttons out of the menu bindings', () => {
    expect(actionForKey(FUTURE_BATTLE_BINDINGS.p1.BUTTON_GREEN!)).toBeNull();
    expect(actionForKey(FUTURE_BATTLE_BINDINGS.p1.BUTTON_YELLOW!)).toBeNull();
  });
});

describe('globe layout', () => {
  const sizes = [
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [390, 844],
    [844, 390],
  ];
  it.each(sizes)('keeps the globe on screen at %ix%i in every stage', (w, h) => {
    for (const stage of ['dark', 'title', 'menu', 'panel'] as const) {
      const l = globeLayout(stage, w, h);
      expect(l.r).toBeGreaterThan(20);
      expect(l.cx - l.r).toBeGreaterThanOrEqual(-1);
      expect(l.cx + l.r).toBeLessThanOrEqual(w + 1);
      expect(l.cy + l.r).toBeLessThanOrEqual(h + 1);
    }
  });
});
