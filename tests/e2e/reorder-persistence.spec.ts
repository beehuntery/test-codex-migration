import { test, expect } from '@playwright/test';
import { createTaskViaUI, gotoTasks } from './utils';

test.describe('Reorder persistence', () => {
  test('keyboard reorder persists after reload', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const firstTitle = `Persist Task A ${Date.now()}`;
    const secondTitle = `Persist Task B ${Date.now()}`;

    await gotoTasks(page);

    const { card: firstCard, id: firstId } = await createTaskViaUI(page, { title: firstTitle, tags: 'persist' });
    const { card: secondCard, id: secondId } = await createTaskViaUI(page, { title: secondTitle, tags: 'persist' });

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
