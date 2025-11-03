import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(
  page: Page,
  { title, description, tags, dueDate }: { title: string; description?: string; tags?: string; dueDate?: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill(description ?? '');
  const dueInput = form.getByLabel('期限');
  await dueInput.fill(dueDate ?? '');
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

test.describe('Task advanced filters', () => {
  test('filters by keyword and due date range', async ({ page }) => {
    const keywordA = `Playwright Filter Task A ${Date.now()}`;
    const keywordB = `Playwright Filter Task B ${Date.now()}`;

    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    const taskList = page.getByTestId('task-list');

    await createTaskViaUI(page, {
      title: keywordA,
      description: 'Task with earlier due date',
      tags: 'filter-a',
      dueDate: '2026-02-10'
    });
    await createTaskViaUI(page, {
      title: keywordB,
      description: 'Task with later due date',
      tags: 'filter-b',
      dueDate: '2026-03-15'
    });

    const filterForm = page.getByRole('form', { name: '詳細フィルター' });
    await filterForm.getByLabel('キーワード').fill(keywordB);
    await filterForm.getByRole('button', { name: '絞り込み' }).click();

    await expect(taskList.getByRole('listitem').filter({ hasText: keywordB })).toBeVisible();
    await expect(taskList.getByRole('listitem').filter({ hasText: keywordA })).toHaveCount(0);

    await page.getByRole('button', { name: 'フィルターをリセット' }).click();
    await expect(taskList.getByRole('listitem').filter({ hasText: keywordA })).toBeVisible();
    await expect(taskList.getByRole('listitem').filter({ hasText: keywordB })).toBeVisible();

    await filterForm.getByLabel('期限（開始）').fill('2026-03-01');
    await filterForm.getByLabel('期限（終了）').fill('2026-03-31');
    await filterForm.getByRole('button', { name: '絞り込み' }).click();

    await expect(taskList.getByRole('listitem').filter({ hasText: keywordB })).toBeVisible();
    await expect(taskList.getByRole('listitem').filter({ hasText: keywordA })).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });
});
