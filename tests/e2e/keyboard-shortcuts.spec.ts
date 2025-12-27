import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Keyboard shortcuts', () => {
  test('search focuses with /', async ({ page }) => {
    await gotoTasks(page);

    const search = page.getByLabel('タスクを検索');
    await expect(search).toBeVisible();
    await page.click('body');
    await expect
      .poll(async () => {
        await page.keyboard.press('/');
        return await search.evaluate((el) => document.activeElement === el);
      }, { timeout: 5000 })
      .toBe(true);
  });

  test('list focus, range expand, and status cycle', async ({ page }) => {
    const groupId = Date.now();
    const title1 = `KB Range ${groupId} A`;
    const title2 = `KB Range ${groupId} B`;
    const title3 = `KB Range ${groupId} C`;

    await gotoTasks(page);

    await createTaskViaUI(page, { title: title1, tags: 'kb' });
    await createTaskViaUI(page, { title: title2, tags: 'kb' });
    await createTaskViaUI(page, { title: title3, tags: 'kb' });

    // Filter to only these tasks so L focuses the first one we created.
    const search = page.getByLabel('タスクを検索');
    await search.fill(String(groupId));
    await search.press('Enter');
    await page.waitForFunction((id) => new URLSearchParams(window.location.search).get('search') === String(id), groupId);

    const taskList = page.getByTestId('task-list');
    await expect
      .poll(async () => {
        return await taskList.locator(`[data-task-title*="${groupId}"]`).count();
      }, { timeout: 10000 })
      .toBe(3);

    await search.blur();
    await page.click('body');

    const list = page.getByTestId('task-list');
    const row1 = list.locator(`[data-task-title="${title1}"]`).first();
    const row2 = list.locator(`[data-task-title="${title2}"]`).first();

    await page.keyboard.press('L');
    await expect(page.getByTestId('focused-task-indicator')).toContainText(title1);

    await page.keyboard.press('j');
    await expect(page.getByTestId('focused-task-indicator')).toContainText(title2);

    await page.keyboard.press('k');
    await expect(page.getByTestId('focused-task-indicator')).toContainText(title1);

    await page.keyboard.press('Shift+J');
    await page.keyboard.press('Shift+J');
    await expect
      .poll(async () => {
        return await list.locator('[data-focus-range="true"]').count();
      }, { timeout: 5000 })
      .toBeGreaterThan(1);

    const statusSelects = list.getByLabel('ステータス');
    const beforeCount = await statusSelects.evaluateAll((nodes) =>
      nodes.filter((node) => (node as HTMLSelectElement).value === 'in_progress').length
    );
    await page.keyboard.press('s');
    await expect
      .poll(async () => {
        return await statusSelects.evaluateAll((nodes) =>
          nodes.filter((node) => (node as HTMLSelectElement).value === 'in_progress').length
        );
      }, { timeout: 5000 })
      .toBe(beforeCount + 1);
  });
});
