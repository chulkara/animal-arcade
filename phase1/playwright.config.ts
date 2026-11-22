import { defineConfig, devices } from '@playwright/test';

// Uses an installed Chrome if PW_CHROME is set (e.g. /usr/bin/google-chrome); otherwise Playwright's Chromium
// (run `npx playwright install chromium` once).
const executablePath = process.env.PW_CHROME || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    launchOptions: { executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'portrait', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, browserName: 'chromium' } },
    { name: 'landscape', use: { viewport: { width: 844, height: 390 }, hasTouch: true } },
  ],
});
