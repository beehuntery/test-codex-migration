import type { FullConfig } from '@playwright/test';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
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
