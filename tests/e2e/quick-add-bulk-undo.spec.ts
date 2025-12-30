import { test, expect } from '@playwright/test';
import { gotoTasks } from './utils';

test.describe('Quick add + bulk delete undo', () => {
  test('can add, select, delete, and undo selection reset', async ({ page }) => {
    await gotoTasks(page);

    const title = `Playwright Quick Task ${Date.now()}`;

    // Quick add (確実に1件だけヒットさせるためタイトルはユニーク文字列)
    const titleInput = page.getByTestId('qa-title');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
    const createResponse = page.waitForResponse((response) => {
      return response.url().includes('/api/tasks') && response.request().method() === 'POST';
    });
    await page.getByRole('button', { name: 'タスクを追加' }).click();
    const response = await createResponse;
    expect(response.ok()).toBeTruthy();

    await expect(titleInput).toHaveValue('');
    await page.reload({ waitUntil: 'networkidle' });

    const row = page
      .getByTestId('task-list')
      .locator(`[data-task-title="${title}"]`)
      .first();
    await expect(row).toBeVisible({ timeout: 20000 });

    // Select row via checkbox
    await row.getByRole('checkbox').check();
    await expect(page.getByText(/件選択中/)).toBeVisible();

    // Delete via Del key（バルクバーが出ている状態で）
    await page.keyboard.press('Delete');
    await expect(page.getByText(/削除しました/)).toBeVisible();

    // 削除後は行が消えることを確認
    await expect(row).toHaveCount(0);
    // バルクバーが消えることを確認
    await expect(page.getByText(/件選択中/)).toHaveCount(0);
  });
});
