import { defineConfig } from '@playwright/test';

const reuseServer = !process.env.CI;

if (!process.env.NEXT_PORT) {
  process.env.NEXT_PORT = '3001';
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    headless: true,
    browserName: 'chromium',
    baseURL: 'http://localhost:3001',
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  },
  webServer: [
    {
      command: 'npx ts-node --transpile-only src/server/index.ts',
      port: 3000,
      reuseExistingServer: reuseServer,
      timeout: 60_000
    },
    {
      command: 'PORT=3001 NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm run dev --prefix apps/web',
      port: 3001,
      reuseExistingServer: reuseServer,
      timeout: 180_000
    }
  ]
});
