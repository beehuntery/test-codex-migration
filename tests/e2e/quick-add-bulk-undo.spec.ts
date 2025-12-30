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
    const form = page.getByTestId('quick-add-form');
    await form.getByRole('button', { name: 'タスクを追加' }).click();
    await expect
      .poll(
        async () => {
          const value = await titleInput.inputValue();
          if (value === '') return true;
          const errorToast = await page.getByText('タスク追加に失敗しました').count();
          const missingToast = await page.getByText('タイトルを入力してください').count();
          if (errorToast > 0 || missingToast > 0) {
            throw new Error('quick add failed');
          }
          return false;
        },
        { timeout: 15000 }
      )
      .toBe(true);

    await expect
      .poll(
        async () => {
          await page.reload({ waitUntil: 'networkidle' });
          const count = await page
            .getByTestId('task-list')
            .locator(`[data-task-title="${title}"]`)
            .count();
          return count > 0;
        },
        { timeout: 30000 }
      )
      .toBe(true);

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
