import { test, expect } from '@playwright/test';

const NEXT_PORT = process.env.NEXT_PORT || '3001';
const BASE_URL = `http://localhost:${NEXT_PORT}`;

async function seedTask(page) {
  const response = await page.request.post('http://localhost:3000/api/tasks', {
    data: {
      title: 'Playwright Toggle Task',
      description: 'Status toggle via UI test',
      tags: ['playwright-test']
    }
  });
  const payload = await response.json();
  if (!response.ok()) {
    throw new Error(`Failed to seed task: ${payload.error ?? response.status()}`);
  }
  return payload.id as string;
}

test.describe('Task status toggle', () => {
  test('updates status through toggle button', async ({ page }) => {
    const taskId = await seedTask(page);

    await page.goto(`${BASE_URL}/tasks`);
    const card = page.locator(`[data-task-id="${taskId}"]`);
    await expect(card).toBeVisible();

    const toggleButton = card.getByRole('button', { name: /次の状態へ/i });
    await toggleButton.click();
    await expect(card.getByText('進行中')).toBeVisible();

    await toggleButton.click();
    await expect(card.getByText('完了')).toBeVisible();
  });
});
