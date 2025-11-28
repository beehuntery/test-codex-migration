import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(
  page: import('@playwright/test').Page,
  { title, tags }: { title: string; tags?: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill('Notification UX test');
  await form.getByLabel('期限').fill('');
  await form.getByPlaceholder('カンマ区切りで入力').fill(tags ?? 'notify');
  await form.getByRole('button', { name: 'タスクを追加' }).click();

  const card = page
    .getByTestId('task-list')
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  return card;
}

test.describe('Notification UX', () => {
  test('status change shows toast and auto-dismisses', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    const title = `Notify Task ${Date.now()}`;

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const card = await createTaskViaUI(page, { title });

    const toggle = card.getByRole('button', { name: /次の状態へ/i });
    await toggle.click();

    // Toast appears
    const toast = page.getByText('ステータスを更新しました', { exact: false }).first();
    await expect(toast).toBeVisible({ timeout: 4000 });

    // Toast auto-dismiss (default 5s) — poll until gone
    await expect.poll(async () => await toast.count(), { timeout: 7000 }).toBe(0);

    expect(consoleErrors).toEqual([]);
  });
});

