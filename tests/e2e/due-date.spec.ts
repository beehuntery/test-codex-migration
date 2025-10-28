import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

import type { Page } from '@playwright/test';

async function seedTask(page: Page) {
  const response = await page.request.post('http://localhost:3000/api/tasks', {
    data: {
      title: 'Playwright Due Date Task',
      description: 'Due date editing via UI test',
      tags: ['playwright-test']
    }
  });
  const payload = await response.json();
  if (!response.ok()) {
    throw new Error(`Failed to seed task: ${payload.error ?? response.status()}`);
  }
  return payload.id as string;
}

test.describe('Task due date editor', () => {
  test('updates due date from empty to a specific date', async ({ page }) => {
    const taskId = await seedTask(page);

    await page.goto(`${BASE_URL}/tasks`);
    const card = page.locator(`[data-task-id="${taskId}"]`);
    await expect(card).toBeVisible();

    const dateInput = card.locator('input[type="date"]');
    await dateInput.fill('2026-01-15');
    await dateInput.blur();

    await expect(card.getByText('2026/01/15')).toBeVisible();
  });
});
