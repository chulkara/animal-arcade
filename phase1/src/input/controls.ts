// Input abstraction. Physical inputs map to semantic actions so a future arcade
// cabinet / gamepad scheme (e.g. green and yellow battle buttons) can be added by
// extending the binding table rather than rewriting screens.

export type Action = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'CONFIRM' | 'BACK' | 'BUTTON_GREEN' | 'BUTTON_YELLOW';

export type Bindings = Record<string, Action>;

export const MENU_KEY_BINDINGS: Bindings = {
  ArrowUp: 'UP',
  KeyW: 'UP',
  ArrowDown: 'DOWN',
  KeyS: 'DOWN',
  ArrowLeft: 'LEFT',
  KeyA: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyD: 'RIGHT',
  Enter: 'CONFIRM',
  NumpadEnter: 'CONFIRM',
  Space: 'CONFIRM',
  Escape: 'BACK',
  Backspace: 'BACK',
};

/**
 * Reserved for later phases (battle reels). Intentionally NOT bound in the menu so
 * nothing in Phase 1 pretends to be a battle control. Configurable per player.
 */
export const FUTURE_BATTLE_BINDINGS: Record<'p1' | 'p2', Partial<Record<'BUTTON_GREEN' | 'BUTTON_YELLOW', string>>> = {
  p1: { BUTTON_GREEN: 'KeyG', BUTTON_YELLOW: 'KeyY' },
  p2: { BUTTON_GREEN: 'KeyJ', BUTTON_YELLOW: 'KeyK' },
};

export function actionForKey(code: string, bindings: Bindings = MENU_KEY_BINDINGS): Action | null {
  return bindings[code] ?? null;
}

/** Standard-mapping gamepad buttons to menu actions (polled by useGamepad). */
export const GAMEPAD_BUTTONS: Record<number, Action> = {
  0: 'CONFIRM', // A / Cross
  1: 'BACK', // B / Circle
  9: 'CONFIRM', // Start
  12: 'UP',
  13: 'DOWN',
  14: 'LEFT',
  15: 'RIGHT',
};
