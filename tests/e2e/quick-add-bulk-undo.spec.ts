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
    const toast = page.getByText('タスクを追加しました');
    await expect(toast).toBeVisible({ timeout: 10000 });
    // API経由の作成に置き換わった場合でもリロードして検出できるようフォールバック
    await page.waitForTimeout(500); // 軽いバッファ
    await expect
      .poll(async () => {
        const res = await page.request.get('/api/tasks');
        if (!res.ok()) return false;
        const tasks = (await res.json()) as Array<{ title: string }>;
        return tasks.some((task) => task.title === title);
      }, { timeout: 15000 })
      .toBe(true);
    await page.reload({ waitUntil: 'networkidle' });

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
