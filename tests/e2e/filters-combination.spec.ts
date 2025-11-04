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
    const primaryId = await primaryCard.getAttribute('data-task-id');
    expect(primaryId).toBeTruthy();

    const toggleButton = primaryCard.getByRole('button', { name: /次の状態へ/ });
    await toggleButton.click(); // move to in_progress

    const secondaryCard = await createTaskViaUI(page, {
      title: secondaryTitle,
      description: 'Secondary task that should be filtered out',
      tags: 'combo-secondary,shared',
      dueDate: '2026-07-20'
    });
    const secondaryId = await secondaryCard.getAttribute('data-task-id');
    expect(secondaryId).toBeTruthy();

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
      const filteredIds = await taskList
        .locator('[data-task-id]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-id') ?? ''));
      const primaryIndex = filteredIds.findIndex((id) => id === primaryId);
      const includesSecondary = filteredIds.includes(secondaryId ?? '');
      return {
        count: filteredIds.length,
        primaryIndex,
        includesSecondary
      };
    }, { message: 'Filtered list should contain only the newly created primary task' }).toEqual({
      count: 1,
      primaryIndex: 0,
      includesSecondary: false
    });

    await page.getByRole('button', { name: 'フィルターをリセット' }).click();

    await expect(async () => {
      const ids = await taskList
        .locator('[data-task-id]')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-id') ?? ''));
      expect(ids).toContain(primaryId);
      expect(ids).toContain(secondaryId);
    }).toPass({ timeout: 10_000 });

    dispose();
    expect(errors).toEqual([]);
  });
});
