import { test, expect } from '@playwright/test';
import { BASE_URL, captureConsoleErrors, createTaskViaUI, getTaskCardByTitle } from './utils';

test.describe('Task notifications', () => {
  test('surface toast updates and completion highlight', async ({ page }) => {
    const uniqueId = Date.now();
    const taskTitle = `Notification Flow ${uniqueId}`;
    const { errors, dispose } = captureConsoleErrors(page);

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    await createTaskViaUI(page, {
      title: taskTitle,
      description: 'Notifications e2e flow',
      tags: 'notifications,playwright',
      dueDate: '2026-04-10'
    });

    await expect(page.getByText('タスクを追加しました')).toBeVisible();

    const card = await getTaskCardByTitle(page, taskTitle);
    const taskId = await card.getAttribute('data-task-id');
    expect(taskId).toBeTruthy();

    const toggleButton = card.getByRole('button', { name: /次の状態へ/ });

    await toggleButton.click();
    await expect(page.getByText('ステータスを更新しました')).toBeVisible();
    await expect(card.locator('[data-testid="status-badge"]').filter({ hasText: '進行中' })).toHaveCount(1);

    await toggleButton.click();
    await expect(card.locator('[data-testid="status-badge"]').filter({ hasText: '完了' })).toHaveCount(1);
    await expect(card).toHaveClass(/animate-pulse/);
    await expect(card).not.toHaveClass(/animate-pulse/, { timeout: 5000 });

    const toastList = page.locator('[aria-live="polite"] li');
    await expect(toastList.first()).toBeVisible();

    const closeButtons = page.getByRole('button', { name: '閉じる' });
    while ((await closeButtons.count()) > 0) {
      await closeButtons.first().click();
    }
    await expect(toastList).toHaveCount(0);

    dispose();
    expect(errors).toEqual([]);
  });
});
