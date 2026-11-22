import { expect, test, type Page } from '@playwright/test';

const errorsFor = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
};

const screen = (page: Page) => page.getByTestId('app').getAttribute('data-screen');

async function toMenu(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', /INTRO|TITLE/);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'MAIN_MENU');
}

test('title screen renders logo, globe and PRESS START without errors or overflow', async ({ page }, info) => {
  const errors = errorsFor(page);
  await page.goto('/');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'TITLE', { timeout: 8000 });
  await expect(page.getByRole('img', { name: "Noah's Arkade" })).toBeVisible();
  await expect(page.getByTestId('press-start')).toBeVisible();
  await expect(page.locator('[data-testid=globe-canvas], [data-testid=globe-fallback]')).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.documentElement.scrollHeight > window.innerHeight);
  expect(overflow).toBe(false);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-title.png` });
  expect(errors).toEqual([]);
});

test('a single key press during the intro skips straight to the menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'INTRO');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'MAIN_MENU');
  await expect(page.getByTestId('main-menu')).toBeVisible();
});

test('a click on the title starts the game', async ({ page }) => {
  await page.goto('/?skipintro');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'TITLE', { timeout: 8000 });
  await page.mouse.click(200, 200);
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'MAIN_MENU');
});

test('keyboard navigation, every preview state and back with preserved selection', async ({ page }, info) => {
  const errors = errorsFor(page);
  await toMenu(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-menu.png` });
  const expected = ['SOLO_PREVIEW', 'MULTIPLAYER_PREVIEW', 'BINDER_PREVIEW', 'HELP_PREVIEW', 'OPTIONS'];
  for (let i = 0; i < expected.length; i++) {
    await page.keyboard.press('Enter');
    expect(await screen(page)).toBe(expected[i]);
    await page.keyboard.press('Escape');
    expect(await screen(page)).toBe('MAIN_MENU');
    await expect(page.locator('.menu__item.is-selected')).toHaveCount(1);
    await expect(page.locator('.menu__item').nth(i)).toHaveClass(/is-selected/);
    await page.keyboard.press(i % 2 ? 'ArrowDown' : 'KeyS');
  }
  // wraps around
  await expect(page.locator('.menu__item').nth(0)).toHaveClass(/is-selected/);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.menu__item').nth(4)).toHaveClass(/is-selected/);
  // Backspace from the menu returns to the title
  await page.keyboard.press('Backspace');
  expect(await screen(page)).toBe('TITLE');
  expect(errors).toEqual([]);
});

test('mouse hover selects and click opens; the BACK button returns', async ({ page, isMobile }, info) => {
  test.skip(isMobile || info.project.name === 'landscape', 'hover is a mouse interaction');
  await toMenu(page);
  await page.waitForTimeout(1000);
  await page.getByTestId('menu-binder').hover();
  await expect(page.getByTestId('menu-binder')).toHaveClass(/is-selected/);
  await page.getByTestId('menu-binder').click();
  await expect(page.getByTestId('preview-binder')).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-binder.png` });
  await page.getByTestId('panel-back').click();
  expect(await screen(page)).toBe('MAIN_MENU');
  await expect(page.getByTestId('menu-binder')).toHaveClass(/is-selected/);
});

test('tap targets in the portrait menu are at least 44px tall', async ({ page }, info) => {
  test.skip(info.project.name !== 'portrait');
  await toMenu(page);
  await page.waitForTimeout(1000);
  for (const box of await page.locator('.menu__item').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44);
  }
  await page.getByTestId('menu-options').tap();
  await expect(page.getByTestId('options')).toBeVisible();
});

test('options change real settings and persist across reloads', async ({ page }, info) => {
  await toMenu(page);
  await page.keyboard.press('ArrowUp'); // OPTIONS
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('options')).toBeVisible();
  const master = page.getByTestId('opt-master');
  await expect(master).toHaveAttribute('aria-valuenow', '8');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(master).toHaveAttribute('aria-valuenow', '6');
  // FILM GRAIN off removes the overlay
  await expect(page.getByTestId('grain')).toHaveCount(1);
  await page.getByTestId('opt-grain').click();
  await expect(page.getByTestId('grain')).toHaveCount(0);
  // MOTION cycles to REDUCED (system → full → reduced)
  await page.getByTestId('opt-motion').click();
  await page.getByTestId('opt-motion').click();
  await expect(page.getByTestId('app')).toHaveAttribute('data-reduced', 'true');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-options.png` });
  await page.reload();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('app')).toHaveAttribute('data-reduced', 'true');
  await expect(page.getByTestId('grain')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('noahs-arkade.settings.v1') || '{}'));
  expect(stored).toMatchObject({ master: 6, grain: false, motion: 'reduced' });
});

test('mute toggle works from any screen and persists', async ({ page }) => {
  await toMenu(page);
  await page.getByTestId('sound-toggle').click();
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByTestId('sound-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('system reduced-motion preference is honoured with no intro wait', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByTestId('app')).toHaveAttribute('data-reduced', 'true');
  await expect(page.getByTestId('app')).toHaveAttribute('data-screen', 'TITLE', { timeout: 2500 });
  await ctx.close();
});

test('without WebGL the CSS fallback globe keeps the composition', async ({ page }, info) => {
  const errors = errorsFor(page);
  await page.goto('/?nowebgl&skipintro');
  await expect(page.getByTestId('globe-fallback')).toBeVisible();
  await expect(page.getByTestId('globe-canvas')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-fallback-menu.png` });
  expect(errors).toEqual([]);
});

test('no autoplay: no AudioContext exists before the first input', async ({ page }) => {
  await page.addInitScript(() => {
    const AC = window.AudioContext;
    (window as any).__acCount = 0;
    (window as any).AudioContext = class extends AC {
      constructor(o?: AudioContextOptions) {
        super(o);
        (window as any).__acCount++;
      }
    };
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as any).__acCount)).toBe(0);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as any).__acCount)).toBe(1);
});
