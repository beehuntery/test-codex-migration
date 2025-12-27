import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Task due date editor', () => {
  test('updates due date from empty to a specific date', async ({ page }) => {
    const taskTitle = `Playwright Due Date Task ${Date.now()}`;

    await gotoTasks(page);

    const { card } = await createTaskViaUI(page, {
      title: taskTitle,
      tags: 'playwright-test'
    });

    const trigger = card.getByTitle('期限なし');
    await trigger.click();

    const dateInput = card.getByLabel('期限を編集');
    await dateInput.fill('2026-01-15');
    await dateInput.blur();

    const updated = card.locator('button[title="2026/01/15"]');
    await expect(updated).toHaveText('01/15');
  });
});
