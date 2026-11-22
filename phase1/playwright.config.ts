import { defineConfig } from '@playwright/test';

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
    launchOptions: { executablePath },
  },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173', reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-1920', use: { viewport: { width: 1920, height: 1080 } } },
    { name: 'desktop-1280', use: { viewport: { width: 1280, height: 720 } } },
  ],
});
