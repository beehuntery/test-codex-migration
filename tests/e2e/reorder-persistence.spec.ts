import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(
  page: import('@playwright/test').Page,
  { title }: { title: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill('Reorder persistence test');
  await form.getByLabel('期限').fill('');
  await form.getByPlaceholder('カンマ区切りで入力').fill('persist');
  await form.getByRole('button', { name: 'タスクを追加' }).click();

  const taskList = page.getByTestId('task-list');
  const card = taskList
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-task-id', /.+/);
  const id = await card.getAttribute('data-task-id');
  return { card, id }; 
}

test.describe('Reorder persistence', () => {
  test('keyboard reorder persists after reload', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const firstTitle = `Persist Task A ${Date.now()}`;
    const secondTitle = `Persist Task B ${Date.now()}`;

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const { id: firstId } = await createTaskViaUI(page, { title: firstTitle });
    const { card: secondCard, id: secondId } = await createTaskViaUI(page, { title: secondTitle });

    // move second above first via keyboard
    await secondCard.focus();
    await page.keyboard.press('Alt+ArrowUp');

    const orderAfterMove = await page.locator('[data-task-id]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-task-id'))
    );
    expect(orderAfterMove.indexOf(secondId)).toBeLessThan(orderAfterMove.indexOf(firstId));

    // reload and ensure persisted order
    await page.reload();
    const orderAfterReload = await page.locator('[data-task-id]').evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-task-id'))
    );
    expect(orderAfterReload.indexOf(secondId)).toBeLessThan(orderAfterReload.indexOf(firstId));

    expect(consoleErrors).toEqual([]);
  });
});
