import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

test.describe('Create task form', () => {
  test('creates a task and displays it in the list', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const title = `Playwright Created Task ${Date.now()}`;
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();

    await form.getByLabel('タイトル').fill(title);
    await form.getByLabel('説明').fill('Created via Next.js optimistic form');
    const dueInput = form.getByLabel('期限');
    await dueInput.fill('2026-05-20');
    await form.getByPlaceholder('カンマ区切りで入力').fill('playwright,optimistic');

    await form.getByRole('button', { name: 'タスクを追加' }).click();

    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByText(title, { exact: true }) })
      .first();
    await expect(card).toBeVisible();
  });
});
