import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(
  page: import('@playwright/test').Page,
  { title, tags }: { title: string; tags?: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill('Tag persistence test');
  await form.getByLabel('期限').fill('');
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

test.describe('Tag persistence', () => {
  test('removing a tag persists after reload', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const title = `Tag Persist ${Date.now()}`;

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const card = await createTaskViaUI(page, { title, tags: 'alpha,beta' });

    // remove beta
    await card.getByRole('button', { name: 'beta を削除' }).click();
    await expect(card.getByText('beta')).toHaveCount(0);
    await expect(card.getByText('alpha')).toHaveCount(1);

    // reload and confirm persistence
    await page.reload();
    const reloadedCard = page
      .getByTestId('task-list')
      .getByRole('listitem')
      .filter({ has: page.getByText(title, { exact: true }) })
      .first();
    await expect(reloadedCard).toBeVisible();
    await expect(reloadedCard.getByText('beta')).toHaveCount(0);
    await expect(reloadedCard.getByText('alpha')).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });
});
