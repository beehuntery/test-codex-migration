import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(page: Page, title: string) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill('Task to be deleted');
  await form.getByLabel('期限').fill('');
  await form.getByPlaceholder('カンマ区切りで入力').fill('delete-test');
  await form.getByRole('button', { name: 'タスクを追加' }).click();
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  return card;
}

test.describe('Task delete button', () => {
  test('removes a task after confirmation', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const title = `Playwright Delete Task ${Date.now()}`;
    const card = await createTaskViaUI(page, title);

    await card.locator('[data-testid="task-delete-entry"]').click();
    const confirmButton = page.getByRole('button', { name: '削除する' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(card).toHaveCount(0);
  });
});
