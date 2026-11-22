// Navigation state machine for the painted title/menu. Pure and framework-free.

export type Screen =
  | 'BOOT'
  | 'INTRO'
  | 'TITLE'
  | 'MAIN_MENU'
  | 'PLAY_SELECT'
  | 'CARDS_PREVIEW'
  | 'BINDER_PREVIEW'
  | 'SHOP_PREVIEW'
  | 'OPTIONS';

/** Rectangle in the approved painting's own pixel space (1672 × 941). */
export interface ArtRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const ART_W = 1672;
export const ART_H = 941;

export interface MenuItem {
  id: string;
  label: string;
  target: Screen;
  rect: ArtRect; // the painted button, measured from the artwork
}

// Measured from the painted buttons' cream borders.
export const MENU_ITEMS: readonly MenuItem[] = [
  { id: 'play', label: 'PLAY', target: 'PLAY_SELECT', rect: { x0: 641, y0: 501, x1: 1031, y1: 561 } },
  { id: 'cards', label: 'MY CARDS', target: 'CARDS_PREVIEW', rect: { x0: 652, y0: 578, x1: 1021, y1: 631 } },
  { id: 'binder', label: 'BINDER', target: 'BINDER_PREVIEW', rect: { x0: 652, y0: 646, x1: 1021, y1: 699 } },
  { id: 'shop', label: 'SHOP', target: 'SHOP_PREVIEW', rect: { x0: 652, y0: 710, x1: 1021, y1: 763 } },
  { id: 'settings', label: 'SETTINGS', target: 'OPTIONS', rect: { x0: 652, y0: 775, x1: 1021, y1: 828 } },
];

export const SUB_SCREENS: readonly Screen[] = ['PLAY_SELECT', 'CARDS_PREVIEW', 'BINDER_PREVIEW', 'SHOP_PREVIEW', 'OPTIONS'];

export interface NavState {
  screen: Screen;
  menuIndex: number;
}

export type NavEvent =
  | { type: 'BOOTED' }
  | { type: 'INTRO_DONE' }
  | { type: 'START' }
  | { type: 'MOVE'; delta: number }
  | { type: 'HOVER'; index: number }
  | { type: 'CONFIRM'; index?: number }
  | { type: 'BACK' };

export const initialNav: NavState = { screen: 'BOOT', menuIndex: 0 };

const wrap = (i: number, n: number) => ((i % n) + n) % n;
const PRE_MENU: readonly Screen[] = ['BOOT', 'INTRO', 'TITLE'];

export function navReducer(state: NavState, event: NavEvent): NavState {
  const { screen } = state;
  switch (event.type) {
    case 'BOOTED':
      return screen === 'BOOT' ? { ...state, screen: 'INTRO' } : state;
    case 'INTRO_DONE':
      return screen === 'INTRO' ? { ...state, screen: 'TITLE' } : state;
    case 'START':
      return PRE_MENU.includes(screen) ? { ...state, screen: 'MAIN_MENU' } : state;
    case 'MOVE':
      if (screen !== 'MAIN_MENU') return state;
      return { ...state, menuIndex: wrap(state.menuIndex + event.delta, MENU_ITEMS.length) };
    case 'HOVER':
      if (screen !== 'MAIN_MENU' || event.index < 0 || event.index >= MENU_ITEMS.length || event.index === state.menuIndex) return state;
      return { ...state, menuIndex: event.index };
    case 'CONFIRM': {
      if (PRE_MENU.includes(screen)) return { ...state, screen: 'MAIN_MENU' };
      if (screen !== 'MAIN_MENU') return state;
      const index = event.index ?? state.menuIndex;
      const item = MENU_ITEMS[index];
      return item ? { screen: item.target, menuIndex: index } : state;
    }
    case 'BACK':
      if (SUB_SCREENS.includes(screen)) return { ...state, screen: 'MAIN_MENU' };
      if (screen === 'MAIN_MENU') return { ...state, screen: 'TITLE' };
      return state;
    default:
      return state;
  }
}

/** Percent helpers for positioning overlays on the painting. */
export const px = (x: number) => `${(x / ART_W) * 100}%`;
export const py = (y: number) => `${(y / ART_H) * 100}%`;
