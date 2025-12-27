import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Inline edit', () => {
  test('editing title does not select the row', async ({ page }) => {
    const title = `Inline Edit ${Date.now()}`;
    const nextTitle = `${title} Updated`;

    await gotoTasks(page);

    const { card } = await createTaskViaUI(page, { title, tags: 'inline' });

    await expect(card.getByRole('checkbox')).not.toBeChecked();
    await expect(page.getByText(/件選択中/)).toHaveCount(0);

    const titleInput = card.getByLabel('タイトルを編集');
    await titleInput.click();
    await titleInput.fill(nextTitle);
    await titleInput.blur();

    await expect(card.getByRole('checkbox')).not.toBeChecked();
    await expect(page.getByText(/件選択中/)).toHaveCount(0);
    await expect(titleInput).toHaveValue(nextTitle);
  });
});
