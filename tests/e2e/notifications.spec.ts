import { test, expect } from '@playwright/test';
import { captureConsoleErrors, createTaskViaUI, gotoTasks } from './utils';

test.describe('Task notifications', () => {
  test('surface toast updates and completion highlight', async ({ page }) => {
    const uniqueId = Date.now();
    const taskTitle = `Notification Flow ${uniqueId}`;
    const { errors, dispose } = captureConsoleErrors(page);

    await gotoTasks(page);

    const { card } = await createTaskViaUI(page, {
      title: taskTitle,
      tags: 'notifications,playwright',
      dueDate: '2026-04-10'
    });

    const taskId = await card.getAttribute('data-task-id');
    expect(taskId).toBeTruthy();

    const statusSelect = card.getByLabel('ステータス');
    await expect(statusSelect).toBeVisible({ timeout: 10000 });

    await statusSelect.selectOption('in_progress');
    await expect(statusSelect).toHaveValue('in_progress');
    const toast = page.getByText('ステータスを更新しました');
    await expect(toast).toBeVisible();
    await expect.poll(async () => await toast.count(), { timeout: 7000 }).toBe(0);

    await statusSelect.selectOption('done');
    await expect(statusSelect).toHaveValue('done');
    await expect(card).toHaveClass(/animate-pulse/);
    await expect(card).not.toHaveClass(/animate-pulse/, { timeout: 5000 });

    const toastList = page.locator('[aria-live="polite"] li');
    await expect.poll(async () => await toastList.count(), { timeout: 7000 }).toBe(0);

    dispose();
    expect(errors).toEqual([]);
  });
});
