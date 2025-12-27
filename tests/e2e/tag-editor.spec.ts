import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Task tag editor', () => {
  test('removes a tag without throwing console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await gotoTasks(page);
    const title = `Playwright Tag Editor Task ${Date.now()}`;
    const { card } = await createTaskViaUI(page, {
      title,
      tags: 'frontend,optimistic'
    });

    const removeButton = card.getByRole('button', { name: 'frontend を削除' });
    await removeButton.click();

    await expect(card.getByText('frontend')).toHaveCount(0);

    expect(consoleErrors).toEqual([]);
  });
});
