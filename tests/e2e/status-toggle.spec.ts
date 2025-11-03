import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(
  page,
  { title, description, tags }: { title: string; description?: string; tags?: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill(description ?? '');
  const dueInput = form.getByLabel('期限');
  await dueInput.fill('');
  await form.getByPlaceholder('カンマ区切りで入力').fill(tags ?? '');
  await form.getByRole('button', { name: 'タスクを追加' }).click();
  const taskList = page.getByTestId('task-list');
  const card = taskList
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  return card;
}

test.describe('Task status toggle', () => {
  test('updates status through toggle button', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    const taskTitle = `Playwright Toggle Task ${Date.now()}`;
    const card = await createTaskViaUI(page, {
      title: taskTitle,
      description: 'Status toggle via UI test',
      tags: 'playwright-test'
    });

    const toggleButton = card.getByRole('button', { name: /次の状態へ/i }).first();
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();
    await expect(toggleButton).toHaveText(/進行中/);

    await toggleButton.click();
    await expect(toggleButton).toHaveText(/完了/);
  });
});
