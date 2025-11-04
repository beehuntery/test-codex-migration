import { test, expect } from '@playwright/test';
import { BASE_URL, captureConsoleErrors, createTaskViaUI } from './utils';

test.describe('Combined task filters', () => {
  test('applies tag, status, and keyword filters together with URL sync', async ({ page }) => {
    const uniqueId = Date.now();
    const primaryTitle = `Combo Primary ${uniqueId}`;
    const secondaryTitle = `Combo Secondary ${uniqueId}`;
    const { errors, dispose } = captureConsoleErrors(page);

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const primaryCard = await createTaskViaUI(page, {
      title: primaryTitle,
      description: 'Primary candidate for combined filters',
      tags: 'combo-primary,shared',
      dueDate: '2026-06-15'
    });

    const toggleButton = primaryCard.getByRole('button', { name: /次の状態へ/ });
    await toggleButton.click(); // move to in_progress

    await createTaskViaUI(page, {
      title: secondaryTitle,
      description: 'Secondary task that should be filtered out',
      tags: 'combo-secondary,shared',
      dueDate: '2026-07-20'
    });

    await page.getByTestId('tag-filter-toggle').click();
    await page.getByTestId('tag-filter-options').getByRole('button', { name: 'combo-primary' }).click();

    await page.getByTestId('status-filter-toggle').click();
    await page.getByTestId('status-filter-options').getByRole('button', { name: '進行中' }).click();

    const advancedForm = page.getByRole('form', { name: '詳細フィルター' });
    await advancedForm.getByLabel('キーワード').fill(primaryTitle);
    await advancedForm.getByLabel('期限（開始）').fill('2026-06-01');
    await advancedForm.getByLabel('期限（終了）').fill('2026-06-30');
    await advancedForm.getByRole('button', { name: '絞り込み' }).click();

    const taskList = page.getByTestId('task-list');
    await expect.poll(async () => {
      const filtered = await taskList.locator('[data-task-title]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-title') ?? ''));
      const grandCount = filtered.length;
      const latestPrimaryIndex = filtered.findIndex((title) => title === primaryTitle);
      return {
        grandCount,
        latestPrimaryIndex
      };
    }, { message: 'Filtered list should contain only the newest primary task' }).toEqual({
      grandCount: 1,
      latestPrimaryIndex: 0
    });

    await page.getByRole('button', { name: 'フィルターをリセット' }).click();
    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search);
      return ['tags', 'statuses', 'search', 'dueFrom', 'dueTo'].every((key) => !params.has(key));
    }, {}, { timeout: 10_000 });

    await expect(async () => {
      const count = await taskList.locator(`[data-task-title="${primaryTitle}"]`).count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });

    await expect(async () => {
      const count = await taskList.locator(`[data-task-title="${secondaryTitle}"]`).count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10_000 });

    dispose();
    expect(errors).toEqual([]);
  });
});
