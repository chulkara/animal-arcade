import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';

const errorsFor = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return errors;
};
const app = (page: Page) => page.getByTestId('app');

async function toMenu(page: Page, url = '/?skipintro') {
  await page.goto(url);
  await expect(app(page)).toHaveAttribute('data-screen', /INTRO|TITLE/, { timeout: 10_000 });
  await page.keyboard.press('Enter');
  await expect(app(page)).toHaveAttribute('data-screen', 'MAIN_MENU');
  await page.waitForTimeout(500);
}

test('the approved painting is served byte-for-byte and shown whole', async ({ page, request }) => {
  const res = await request.get('/art/approved-menu.png');
  expect(createHash('sha256').update(await res.body()).digest('hex')).toBe('90fffe36338fc7c939c5e41c62a656a83532f0c1e3254b05cefd6bb9249fc9f4');
  await page.goto('/?skipintro');
  const img = page.getByTestId('approved-art');
  await expect(img).toBeVisible();
  const { nw, nh, w, h, filter } = await img.evaluate((el: HTMLImageElement) => ({ nw: el.naturalWidth, nh: el.naturalHeight, w: el.clientWidth, h: el.clientHeight, filter: getComputedStyle(el).filter }));
  expect([nw, nh]).toEqual([1672, 941]);
  expect(Math.abs(w / h - 1672 / 941)).toBeLessThan(0.01); // never cropped or stretched
  expect(filter).toBe('none');
});

test('title: PRESS START, nothing drawn over the menu buttons, no errors', async ({ page }, info) => {
  const errors = errorsFor(page);
  await page.goto('/');
  await expect(app(page)).toHaveAttribute('data-screen', 'TITLE', { timeout: 10_000 });
  await expect(page.getByTestId('press-start')).toBeVisible();
  await expect(page.locator('.lit')).toHaveCount(0);
  await expect(page.locator('.unlit')).not.toHaveClass(/is-on/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-1-title.png` });
  expect(errors).toEqual([]);
});

test('a single key press during the intro goes straight to the menu', async ({ page }) => {
  await page.goto('/');
  await expect(app(page)).toHaveAttribute('data-screen', 'INTRO', { timeout: 10_000 });
  await page.keyboard.press('Space');
  await expect(app(page)).toHaveAttribute('data-screen', 'MAIN_MENU');
});

test('a click on the title starts', async ({ page }) => {
  await page.goto('/?skipintro');
  await expect(app(page)).toHaveAttribute('data-screen', 'TITLE', { timeout: 10_000 });
  await page.mouse.click(300, 300);
  await expect(app(page)).toHaveAttribute('data-screen', 'MAIN_MENU');
});

test('selection: PLAY leaves the painting untouched; other rows light up and PLAY goes unlit', async ({ page }, info) => {
  await toMenu(page);
  await expect(page.locator('.lit')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.lit')).toHaveCount(1);
  await expect(page.locator('.lit .pill__label')).toHaveText('MY CARDS');
  await expect(page.locator('.unlit')).toHaveClass(/is-on/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/evidence/${info.project.name}-2-menu-mycards.png` });
  await page.keyboard.press('ArrowLeft'); // the painting's ← → also navigates
  await expect(page.locator('.lit')).toHaveCount(0);
});

test('every button opens its panel and Esc returns with the selection kept', async ({ page }, info) => {
  const errors = errorsFor(page);
  await toMenu(page);
  const screens = ['PLAY_SELECT', 'CARDS_PREVIEW', 'BINDER_PREVIEW', 'SHOP_PREVIEW', 'OPTIONS'];
  for (let i = 0; i < screens.length; i++) {
    await page.keyboard.press('Enter');
    await expect(app(page)).toHaveAttribute('data-screen', screens[i]);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `test-results/evidence/${info.project.name}-3-${screens[i].toLowerCase()}.png` });
    await page.keyboard.press('Escape');
    await expect(app(page)).toHaveAttribute('data-screen', 'MAIN_MENU');
    await expect(page.locator('.hit').nth(i)).toHaveClass(/is-selected/);
    await page.keyboard.press(i % 2 ? 'ArrowDown' : 'KeyS');
  }
  await expect(page.locator('.hit').nth(0)).toHaveClass(/is-selected/); // wrapped
  await page.keyboard.press('Backspace');
  await expect(app(page)).toHaveAttribute('data-screen', 'TITLE');
  expect(errors).toEqual([]);
});

test('mouse: hover selects, click opens, BACK button returns', async ({ page }) => {
  await toMenu(page);
  await page.getByTestId('menu-shop').hover();
  await expect(page.getByTestId('menu-shop')).toHaveClass(/is-selected/);
  await page.getByTestId('menu-shop').click();
  await expect(page.getByTestId('shop')).toBeVisible();
  await page.getByTestId('plate-back').click();
  await expect(app(page)).toHaveAttribute('data-screen', 'MAIN_MENU');
  await expect(page.getByTestId('menu-shop')).toHaveClass(/is-selected/);
});

test('play menu: modes are navigable and honest about availability', async ({ page }) => {
  await toMenu(page);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('play-note')).toContainText('battle phase');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('play-howto')).toHaveClass(/is-selected/);
  await expect(page.getByTestId('play-note')).toContainText('power reel');
  await page.keyboard.press('Enter');
  await expect(app(page)).toHaveAttribute('data-screen', 'PLAY_SELECT');
});

test('settings change real values and persist across reloads', async ({ page }) => {
  await toMenu(page);
  await page.keyboard.press('ArrowUp'); // SETTINGS
  await page.keyboard.press('Enter');
  const master = page.getByTestId('opt-master');
  await expect(master).toHaveAttribute('aria-valuenow', '8');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(master).toHaveAttribute('aria-valuenow', '6');
  await expect(page.getByTestId('scanlines')).toHaveCount(0); // off by default: painting untouched
  await page.getByTestId('opt-scanlines').click();
  await expect(page.getByTestId('scanlines')).toHaveCount(1);
  await page.getByTestId('opt-motion').click();
  await page.getByTestId('opt-motion').click();
  await expect(app(page)).toHaveAttribute('data-reduced', 'true');
  await page.reload();
  await expect(app(page)).toHaveAttribute('data-reduced', 'true');
  await expect(page.getByTestId('scanlines')).toHaveCount(1);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('noahs-arkade.settings.v2') || '{}'));
  expect(stored).toMatchObject({ master: 6, scanlines: true, motion: 'reduced' });
});

test('M toggles mute and it persists', async ({ page }) => {
  await toMenu(page);
  await page.keyboard.press('KeyM');
  await page.reload();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('noahs-arkade.settings.v2') || '{}'));
  expect(stored.muted).toBe(true);
});

test('system reduced motion: no intro wait, no animation', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(app(page)).toHaveAttribute('data-reduced', 'true');
  await expect(app(page)).toHaveAttribute('data-screen', 'TITLE', { timeout: 3000 });
  await ctx.close();
});

test('no AudioContext before the first input (autoplay rules)', async ({ page }) => {
  await page.addInitScript(() => {
    const AC = window.AudioContext;
    (window as any).__ac = 0;
    (window as any).AudioContext = class extends AC {
      constructor(o?: AudioContextOptions) {
        super(o);
        (window as any).__ac++;
      }
    };
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as any).__ac)).toBe(0);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as any).__ac)).toBe(1);
});

test('small windows get the desktop-only notice instead of a squashed cabinet', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByTestId('desktop-only')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(app(page)).toHaveAttribute('data-screen', /INTRO|TITLE/, { timeout: 10_000 });
  await ctx.close();
});
