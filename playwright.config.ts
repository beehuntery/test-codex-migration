import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const reuseServer = !isCI;

const nextPort = process.env.NEXT_PORT ?? '3001';
const apiBaseUrl = `http://localhost:${nextPort}`;
const databaseUrl = process.env.DATABASE_URL ?? 'file:../prisma/dev.db';

// Next.js を唯一の API/フロントエンドとして起動し、起動前に SQLite スキーマを適用
const webServerCommand = isCI
  ? `LOG_API_REQUESTS=1 PORT=${nextPort} NEXT_PUBLIC_API_BASE_URL=${apiBaseUrl} DATABASE_URL=${databaseUrl} npm run dev:with-db --prefix apps/web -- --turbo`
  : `PORT=${nextPort} NEXT_PUBLIC_API_BASE_URL=${apiBaseUrl} DATABASE_URL=${databaseUrl} npm run dev:with-db --prefix apps/web`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: isCI
    ? [
        ['line'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }]
      ]
    : [
        ['list'],
        ['html', { open: 'never' }]
      ],
  use: {
    headless: true,
    browserName: 'chromium',
    baseURL: `http://localhost:${nextPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  },
  outputDir: 'test-results',
  webServer: [
    {
      command: webServerCommand,
      port: Number(nextPort),
      reuseExistingServer: reuseServer,
      timeout: 240_000
    }
  ]
});
