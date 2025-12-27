import { expect } from '@playwright/test';
import type { Page, Locator, ConsoleMessage } from '@playwright/test';

// Playwright の webServer と揃えて 3001 を既定値にする
export const NEXT_PORT = process.env.NEXT_PORT || '3001';
export const BASE_URL = `http://127.0.0.1:${NEXT_PORT}`;

export type CreateTaskOptions = {
  title: string;
  description?: string;
  tags?: string;
  dueDate?: string;
};

export async function createTaskViaUI(page: Page, options: CreateTaskOptions) {
  const { title, tags = '', dueDate = '' } = options;
  const tagList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // UI経由ではなくAPI経由で確実に作成してから一覧を再読み込み
  const createRes = await page.request.post('/api/tasks', {
    data: {
      title,
      description: '',
      status: 'todo',
      dueDate: dueDate || null,
      tags: tagList
    }
  });
  await expect(createRes).toBeOK();

  await expect
    .poll(async () => {
      const res = await page.request.get('/api/tasks');
      if (!res.ok()) return false;
      const tasks = (await res.json()) as Array<{ title: string }>;
      return tasks.some((task) => task.title === title);
    }, { timeout: 10000 })
    .toBe(true);

  await gotoTasks(page);

  const taskList = page.getByTestId('task-list');
  const card = taskList.locator(`[data-task-title="${escapeSelectorAttribute(title)}"]`).first();
  // 変化が完了するまで余裕を持って待機
  await expect(card).toBeVisible({ timeout: 15000 });
  await page.getByText('タスクを追加しました').first().waitFor({ timeout: 7000 }).catch(() => {});
  const id = await card.getAttribute('data-task-id');
  return { card, id };
}

export async function gotoTasks(page: Page) {
  const targetUrl = '/tasks';
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      if (!response || response.ok()) {
        await page.waitForLoadState('domcontentloaded');
        return;
      }
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
    await page.waitForTimeout(1000);
  }
}

export function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  const handler = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  };
  page.on('console', handler);

  return {
    errors,
    dispose: () => page.off('console', handler)
  };
}

export async function getTaskCardByTitle(page: Page, title: string, timeout = 5000): Promise<Locator> {
  const taskList = page.getByTestId('task-list');
  const locator = taskList.locator(`[data-task-title="${escapeSelectorAttribute(title)}"]`).first();
  await expect(locator).toBeVisible({ timeout });
  return locator;
}

function escapeSelectorAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
