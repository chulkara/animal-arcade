import { describe, expect, it } from 'vitest';
import { initialNav, MENU_ITEMS, navReducer, stageFor, type NavEvent, type NavState } from '../../src/app/navigation';

const run = (events: NavEvent[], from: NavState = initialNav) => events.reduce(navReducer, from);

describe('navigation state machine', () => {
  it('boots into the intro, then the title', () => {
    expect(run([{ type: 'BOOTED' }]).screen).toBe('INTRO');
    expect(run([{ type: 'BOOTED' }, { type: 'INTRO_DONE' }]).screen).toBe('TITLE');
  });

  it('a single start input skips the intro straight to the menu', () => {
    expect(run([{ type: 'BOOTED' }, { type: 'START' }]).screen).toBe('MAIN_MENU');
    // a late INTRO_DONE timer must not drag the player back to the title
    expect(run([{ type: 'BOOTED' }, { type: 'START' }, { type: 'INTRO_DONE' }]).screen).toBe('MAIN_MENU');
  });

  it('moves through the menu and wraps at both ends', () => {
    const menu = run([{ type: 'BOOTED' }, { type: 'START' }]);
    expect(run([{ type: 'MOVE', delta: -1 }], menu).menuIndex).toBe(MENU_ITEMS.length - 1);
    expect(run(Array(MENU_ITEMS.length).fill({ type: 'MOVE', delta: 1 }), menu).menuIndex).toBe(0);
  });

  it('every menu entry opens its own state and BACK returns with the selection preserved', () => {
    const menu = run([{ type: 'BOOTED' }, { type: 'START' }]);
    MENU_ITEMS.forEach((item, i) => {
      const opened = run([{ type: 'CONFIRM', index: i }], menu);
      expect(opened.screen).toBe(item.target);
      const back = run([{ type: 'BACK' }], opened);
      expect(back.screen).toBe('MAIN_MENU');
      expect(back.menuIndex).toBe(i);
    });
  });

  it('ignores menu movement outside the menu', () => {
    const options = run([{ type: 'BOOTED' }, { type: 'START' }, { type: 'CONFIRM', index: 4 }]);
    expect(run([{ type: 'MOVE', delta: 1 }, { type: 'HOVER', index: 0 }], options)).toEqual(options);
  });

  it('BACK from the menu returns to the title; BACK on the title does nothing', () => {
    const title = run([{ type: 'BOOTED' }, { type: 'START' }, { type: 'BACK' }]);
    expect(title.screen).toBe('TITLE');
    expect(run([{ type: 'BACK' }], title).screen).toBe('TITLE');
  });

  it('rejects out-of-range hover indices', () => {
    const menu = run([{ type: 'BOOTED' }, { type: 'START' }]);
    expect(run([{ type: 'HOVER', index: 99 }], menu)).toBe(menu);
  });

  it('maps screens to scene stages', () => {
    expect(stageFor('BOOT')).toBe('dark');
    expect(stageFor('TITLE')).toBe('title');
    expect(stageFor('MAIN_MENU')).toBe('menu');
    expect(stageFor('OPTIONS')).toBe('panel');
  });
});
