import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

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

    await gotoTasks(page);

    const { id: firstId } = await createTaskViaUI(page, { title: firstTitle, tags: 'keyboard-test' });
    const { id: secondId } = await createTaskViaUI(page, { title: secondTitle, tags: 'keyboard-test' });

    const list = page.getByTestId('task-list');
    const secondCard = list.locator(`[data-task-id="${secondId}"]`).first();
    await secondCard.scrollIntoViewIfNeeded();
    await secondCard.evaluate((node) => (node as HTMLElement).focus());
    await expect(page.getByTestId('focused-task-indicator')).toContainText(secondTitle);
    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.up('Alt');

    await expect.poll(async () => {
      const orderAfterMove = await page.locator('[data-task-id]').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-task-id'))
      );
      const firstIndex = orderAfterMove.indexOf(firstId);
      const secondIndex = orderAfterMove.indexOf(secondId);
      return secondIndex !== -1 && firstIndex !== -1 && secondIndex < firstIndex;
    }, { timeout: 15000 }).toBe(true);

    expect(consoleErrors).toEqual([]);

    // restore order for subsequent tests
    await secondCard.scrollIntoViewIfNeeded();
    await secondCard.evaluate((node) => (node as HTMLElement).focus());
    await page.keyboard.down('Alt');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.up('Alt');
  });
});
