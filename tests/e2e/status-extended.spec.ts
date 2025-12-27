import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Status extended', () => {
  test('status dropdown supports waiting and pending', async ({ page }) => {
    const title = `Status Extended ${Date.now()}`;

    await gotoTasks(page);

    const { card } = await createTaskViaUI(page, { title, tags: 'status' });

    const statusSelect = card.getByLabel('ステータス');
    await expect(statusSelect).toHaveValue('todo');

    await statusSelect.selectOption('waiting');
    await expect(statusSelect).toHaveValue('waiting');

    await statusSelect.selectOption('pending');
    await expect(statusSelect).toHaveValue('pending');
  });
});
