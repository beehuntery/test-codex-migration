import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

import type { Page } from '@playwright/test';

async function createTaskViaUI(
  page: Page,
  { title, description, tags }: { title: string; description?: string; tags?: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill(description ?? '');
  const dueInput = form.getByLabel('期限');
  await dueInput.fill('');
  await form.getByPlaceholder('カンマ区切りで入力').fill(tags ?? '');
  await form.getByRole('button', { name: 'タスクを追加' }).click();
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  return card;
}

test.describe('Task due date editor', () => {
  test('updates due date from empty to a specific date', async ({ page }) => {
    const taskTitle = `Playwright Due Date Task ${Date.now()}`;

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    const card = await createTaskViaUI(page, {
      title: taskTitle,
      description: 'Due date editing via UI test',
      tags: 'playwright-test'
    });
    const dateInput = card.locator('input[type="date"]').first();
    await dateInput.fill('2026-01-15');
    await dateInput.blur();

    await expect(card.getByText('2026/01/15')).toBeVisible();
  });
});
