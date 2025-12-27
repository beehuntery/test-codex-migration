import { test, expect } from '@playwright/test';
import { createTaskViaUI, getTaskCardByTitle, gotoTasks } from './utils';

test.describe('Tag persistence', () => {
  test('removing a tag persists after reload', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const title = `Tag Persist ${Date.now()}`;

    await gotoTasks(page);

    const { card } = await createTaskViaUI(page, { title, tags: 'alpha,beta' });

    const removeBeta = card.getByRole('button', { name: 'beta を削除' }).first();
    await expect(removeBeta).toBeVisible({ timeout: 10000 });
    await removeBeta.click();
    await expect(card.getByText('beta')).toHaveCount(0);
    await expect(card.getByText('alpha')).toHaveCount(1);

    await expect.poll(async () => {
      const res = await page.request.get('/api/tasks');
      const tasks = (await res.json()) as Array<{ title: string; tags: string[] }>;
      const found = tasks.find((t) => t.title === title);
      return found ? found.tags.includes('beta') : true;
    }).toBe(false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('task-list')).toBeVisible({ timeout: 10000 });
    const reloadedCard = await getTaskCardByTitle(page, title, 15000);
    await expect(reloadedCard.getByText('beta')).toHaveCount(0);
    await expect(reloadedCard.getByText('alpha')).toHaveCount(1);

    expect(consoleErrors).toEqual([]);
  });
});
