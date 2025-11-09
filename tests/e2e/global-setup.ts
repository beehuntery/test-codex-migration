import type { FullConfig } from '@playwright/test';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
  const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3000';
  const legacyBaseURL =
    process.env.PLAYWRIGHT_LEGACY_BASE_URL ?? process.env.LEGACY_BASE_URL ?? apiBaseURL;

  console.log('[Playwright][Target] Next.js UI:', baseURL);
  console.log('[Playwright][Target] API:', apiBaseURL);
  console.log('[Playwright][Target] Legacy UI:', legacyBaseURL);

  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 10_000);
      await fetch(`${baseURL}/tasks`, { signal: abortController.signal });
      clearTimeout(timeout);
      break;
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }
      await sleep(2000);
    }
  }
}
