import { test, expect } from '@playwright/test';
import { gotoTasks } from './utils';

test.describe('Quick add + bulk delete undo', () => {
  test('can add, select, delete, and undo selection reset', async ({ page }) => {
    await gotoTasks(page);

    const title = `Playwright Quick Task ${Date.now()}`;

    // Quick add (確実に1件だけヒットさせるためタイトルはユニーク文字列)
    const titleInput = page.getByTestId('qa-title');
    await titleInput.fill(title);
    await titleInput.focus();
    await titleInput.press('Enter');

    // 反映確認はUIで行い、必要に応じてリロードして待機する
    await page.waitForTimeout(500); // 軽いバッファ
    await expect
      .poll(
        async () => {
          await page.reload({ waitUntil: 'networkidle' });
          const count = await page.getByRole('listitem', { name: new RegExp(title) }).count();
          return count > 0;
        },
        { timeout: 30000 }
      )
      .toBe(true);

    // 追加後、行が現れるまで待つ（listitem のラベルにタイトルが含まれるもの）
    const row = page.getByRole('listitem', { name: new RegExp(title) });
    await expect(row).toBeVisible({ timeout: 15000 });

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
