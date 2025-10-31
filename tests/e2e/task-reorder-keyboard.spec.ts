import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function createTaskViaUI(
  page: import('@playwright/test').Page,
  { title, tags }: { title: string; tags?: string }
) {
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'タスクを追加' }) }).first();
  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill('Keyboard reorder test task');
  const dueInput = form.getByLabel('期限');
  await dueInput.fill('');
  await form.getByPlaceholder('カンマ区切りで入力').fill(tags ?? 'keyboard-test');
  await form.getByRole('button', { name: 'タスクを追加' }).click();
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByText(title, { exact: true }) })
    .first();
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-task-id', /.+/);
  const id = await card.getAttribute('data-task-id');
  return { card, id };
}

test.describe('Task reorder via keyboard', () => {
  test('Alt + Arrow keys move tasks within the list', async ({ page }) => {
    const firstTitle = `Keyboard Task A ${Date.now()}`;
    const secondTitle = `Keyboard Task B ${Date.now()}`;

    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const { id: firstId } = await createTaskViaUI(page, { title: firstTitle });
    const { card: secondCard, id: secondId } = await createTaskViaUI(page, { title: secondTitle });

    await secondCard.focus();
    await page.keyboard.press('Alt+ArrowUp');

    await expect.poll(async () => {
      const orderAfterMove = await page.locator('[data-task-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-task-id'))
      );
      const firstIndex = orderAfterMove.indexOf(firstId);
      const secondIndex = orderAfterMove.indexOf(secondId);
      return secondIndex !== -1 && firstIndex !== -1 && secondIndex < firstIndex;
    }).toBe(true);

    expect(consoleErrors).toEqual([]);

    // restore order for subsequent tests
    await secondCard.focus();
    await page.keyboard.press('Alt+ArrowDown');
  });
});
