import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Layout regression', () => {
  test('header does not overlap first row and row height stays compact', async ({ page }) => {
    const title = `Layout Row ${Date.now()}`;

    await gotoTasks(page);

    const { card } = await createTaskViaUI(page, { title, tags: 'layout' });

    const header = page.getByTestId('task-table-header');
    await expect(header).toBeVisible();
    await expect(card).toBeVisible();

    const headerBox = await header.boundingBox();
    const rowBox = await card.boundingBox();
    expect(headerBox).toBeTruthy();
    expect(rowBox).toBeTruthy();

    if (headerBox && rowBox) {
      // header bottom should be above row top
      expect(headerBox.y + headerBox.height).toBeLessThanOrEqual(rowBox.y + 1);
      // row height should remain compact (upper bound to avoid regressions)
      expect(rowBox.height).toBeLessThanOrEqual(48);
    }
  });
});
