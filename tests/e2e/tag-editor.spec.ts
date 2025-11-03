import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

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
  const taskList = page.getByTestId('task-list');
  const card = taskList
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  return card;
}

test.describe('Task tag editor', () => {
  test('removes a tag without throwing console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    const title = `Playwright Tag Editor Task ${Date.now()}`;
    const card = await createTaskViaUI(page, {
      title,
      description: 'Exercise tag editor optimistic updates',
      tags: 'frontend,optimistic'
    });

    const removeButton = card.getByRole('button', { name: 'frontend を削除' });
    await removeButton.click();

    await expect(card.getByText('frontend')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });
});
