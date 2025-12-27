import { test, expect } from '@playwright/test';
import { createTaskViaUI, getTaskCardByTitle, gotoTasks } from './utils';

test.describe('Tag UI', () => {
  test('selects existing tag from dropdown without closing', async ({ page }) => {
    const titleA = `Tag UI A ${Date.now()}`;
    const titleB = `Tag UI B ${Date.now()}`;

    await gotoTasks(page);

    await createTaskViaUI(page, { title: titleA, tags: 'alpha' });
    await createTaskViaUI(page, { title: titleB, tags: 'beta' });

    const cardA = await getTaskCardByTitle(page, titleA);
    const tagEditor = cardA.getByRole('combobox', { name: 'タグを選択' });
    await tagEditor.click();

    const options = cardA.getByTestId('tag-options');
    await expect(options).toBeVisible();

    const optionBeta = options.getByRole('button', { name: 'beta' });
    await expect(optionBeta).toBeVisible();
    await optionBeta.click();

    // dropdown should stay open for continuous selection
    await expect(options).toBeVisible();

    // tag chip appears
    await expect(cardA.getByRole('button', { name: 'beta を削除' })).toBeVisible();
  });

  test('creates new tag on Enter when no match and closes dropdown', async ({ page }) => {
    const title = `Tag UI New ${Date.now()}`;
    const newTag = `new-tag-${Date.now()}`;

    await gotoTasks(page);

    await createTaskViaUI(page, { title, tags: 'alpha' });

    const card = await getTaskCardByTitle(page, title);
    const tagEditor = card.getByRole('combobox', { name: 'タグを選択' });
    await tagEditor.click();

    const input = card.getByLabel('タグ入力');
    await input.fill(newTag);

    await expect(card.getByText('一致するタグがありません。')).toBeVisible();
    await input.press('Enter');

    await expect(card.getByRole('button', { name: `${newTag} を削除` })).toBeVisible();
    // 新規追加後も連続追加できるようドロップダウンは開いたまま
    await expect(card.getByTestId('tag-options')).toBeVisible();
  });
});
