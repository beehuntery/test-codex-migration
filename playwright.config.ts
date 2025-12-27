import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const externalServer = process.env.PW_EXTERNAL_SERVER === '1';
const reuseServer = false;

const nextPort = process.env.NEXT_PORT ?? '3010';
const apiBaseUrl = `http://127.0.0.1:${nextPort}`;

// 本番相当のビルド + start を SQLite で起動（ポート衝突/権限を避けるため 3005 をデフォルト）
// reuseExistingServer が true でも command は必須のため常に設定する
const webServerCommand = `NEXT_PUBLIC_API_BASE_URL=${apiBaseUrl} PORT=${nextPort} HOSTNAME=127.0.0.1 npm run dev:sqlite --prefix apps/web`;

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
    baseURL: `http://127.0.0.1:${nextPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  },
  outputDir: 'test-results',
  webServer: externalServer
    ? []
    : [
        {
          command: webServerCommand,
          port: Number(nextPort),
          reuseExistingServer: reuseServer,
          timeout: 240_000
        }
      ]
});
