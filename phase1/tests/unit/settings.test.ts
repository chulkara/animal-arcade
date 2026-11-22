import { describe, expect, it } from 'vitest';
import { busGain, defaultSettings, isReducedMotion, loadSettings, sanitize, saveSettings, STORAGE_KEY, type StorageLike } from '../../src/state/settings';
import { actionForKey, FUTURE_BATTLE_BINDINGS } from '../../src/input/controls';

const memory = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};

describe('settings', () => {
  it('round-trips through storage', () => {
    const store = memory();
    const s = { ...defaultSettings, master: 3, muted: true, motion: 'reduced' as const, scanlines: true };
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
    const s = sanitize({ master: 42, music: -3, sfx: 'loud', muted: 'yes', motion: 'warp', scanlines: 1 });
    expect(s).toEqual({ ...defaultSettings, master: 10, music: 0 });
    expect(defaultSettings.scanlines).toBe(false); // the painting is shown untouched by default
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
