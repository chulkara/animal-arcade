// Phase 1 navigation state machine. Pure and framework-free so it can be unit tested
// and later extended with gameplay screens without touching the UI layer.

export type Screen =
  | 'BOOT'
  | 'INTRO'
  | 'TITLE'
  | 'MAIN_MENU'
  | 'SOLO_PREVIEW'
  | 'MULTIPLAYER_PREVIEW'
  | 'BINDER_PREVIEW'
  | 'HELP_PREVIEW'
  | 'OPTIONS';

export interface MenuItem {
  id: string;
  label: string;
  caption: string;
  target: Screen;
}

export const MENU_ITEMS: readonly MenuItem[] = [
  { id: 'solo', label: '1 PLAYER', caption: 'Challenge the computer in a solo expedition.', target: 'SOLO_PREVIEW' },
  { id: 'versus', label: '2 PLAYERS', caption: 'Two challengers, one cabinet.', target: 'MULTIPLAYER_PREVIEW' },
  { id: 'binder', label: 'MY BINDER', caption: 'Your collection of animal cards.', target: 'BINDER_PREVIEW' },
  { id: 'help', label: 'HOW TO PLAY', caption: 'Cards, reels and the rules of the wild.', target: 'HELP_PREVIEW' },
  { id: 'options', label: 'OPTIONS', caption: 'Sound, motion and display.', target: 'OPTIONS' },
];

export const SUB_SCREENS: readonly Screen[] = ['SOLO_PREVIEW', 'MULTIPLAYER_PREVIEW', 'BINDER_PREVIEW', 'HELP_PREVIEW', 'OPTIONS'];

export interface NavState {
  screen: Screen;
  menuIndex: number;
}

export type NavEvent =
  | { type: 'BOOTED' }
  | { type: 'INTRO_DONE' }
  | { type: 'START' } // any start input (click, Enter, Space)
  | { type: 'MOVE'; delta: number }
  | { type: 'HOVER'; index: number }
  | { type: 'CONFIRM'; index?: number }
  | { type: 'BACK' };

export const initialNav: NavState = { screen: 'BOOT', menuIndex: 0 };

const wrap = (i: number, n: number) => ((i % n) + n) % n;

export function navReducer(state: NavState, event: NavEvent): NavState {
  const { screen } = state;
  switch (event.type) {
    case 'BOOTED':
      return screen === 'BOOT' ? { ...state, screen: 'INTRO' } : state;
    case 'INTRO_DONE':
      return screen === 'INTRO' ? { ...state, screen: 'TITLE' } : state;
    case 'START':
      // A single input skips any remaining intro and goes straight to the menu.
      if (screen === 'BOOT' || screen === 'INTRO' || screen === 'TITLE') return { ...state, screen: 'MAIN_MENU' };
      return state;
    case 'MOVE':
      if (screen !== 'MAIN_MENU') return state;
      return { ...state, menuIndex: wrap(state.menuIndex + event.delta, MENU_ITEMS.length) };
    case 'HOVER':
      if (screen !== 'MAIN_MENU' || event.index < 0 || event.index >= MENU_ITEMS.length) return state;
      return event.index === state.menuIndex ? state : { ...state, menuIndex: event.index };
    case 'CONFIRM': {
      if (screen === 'INTRO' || screen === 'TITLE' || screen === 'BOOT') return { ...state, screen: 'MAIN_MENU' };
      if (screen !== 'MAIN_MENU') return state;
      const index = event.index ?? state.menuIndex;
      const item = MENU_ITEMS[index];
      return item ? { screen: item.target, menuIndex: index } : state;
    }
    case 'BACK':
      if (SUB_SCREENS.includes(screen)) return { ...state, screen: 'MAIN_MENU' }; // selection preserved
      if (screen === 'MAIN_MENU') return { ...state, screen: 'TITLE' };
      return state;
    default:
      return state;
  }
}

/** Layout "stage" the background scene interpolates between. */
export type Stage = 'dark' | 'title' | 'menu' | 'panel';
export function stageFor(screen: Screen): Stage {
  if (screen === 'BOOT') return 'dark';
  if (screen === 'INTRO' || screen === 'TITLE') return 'title';
  if (screen === 'MAIN_MENU') return 'menu';
  return 'panel';
}
