import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Create task form', () => {
  test('creates a task and displays it in the list', async ({ page }) => {
    await gotoTasks(page);

    const title = `Playwright Created Task ${Date.now()}`;
    const { card } = await createTaskViaUI(page, { title, tags: 'playwright,optimistic', dueDate: '2026-05-20' });
    await expect(card).toBeVisible();
  });
});
