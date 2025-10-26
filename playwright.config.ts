import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    headless: true,
    browserName: 'chromium',
    baseURL: 'http://localhost:3000',
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  }
});
