import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const reuseServer = !isCI;

if (!process.env.NEXT_PORT) {
  process.env.NEXT_PORT = '3001';
}

const apiServerCommand = isCI ? 'NODE_ENV=production npm run start:ts' : 'npm run dev:ts';
const webServerCommand = isCI
  ? 'NODE_ENV=production PORT=3001 NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm run start --prefix apps/web'
  : 'PORT=3001 NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm run dev --prefix apps/web';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: isCI ? 1 : 0,
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
      command: apiServerCommand,
      port: 3000,
      reuseExistingServer: reuseServer,
      timeout: 180_000
    },
    {
      command: webServerCommand,
      port: 3001,
      reuseExistingServer: reuseServer,
      timeout: 240_000
    }
  ]
});
