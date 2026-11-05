import { defineConfig } from '@playwright/test';

// PW_CHROMIUM_PATH: ruta a un Chromium ya instalado (sesiones en la nube). En CI se usa el que instala Playwright.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173/Prototipo-Kinoo/',
    viewport: { width: 402, height: 874 },
    hasTouch: true,
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
  },
  webServer: { command: 'node scripts/serve.mjs 4173', url: 'http://localhost:4173/Prototipo-Kinoo/', reuseExistingServer: true, timeout: 30_000 },
});
