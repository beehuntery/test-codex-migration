import { expect } from '@playwright/test';
import type { Page, Locator, ConsoleMessage } from '@playwright/test';

// Devサーバーのデフォルトポートに合わせて 3000 を既定値にする
export const NEXT_PORT = process.env.NEXT_PORT || '3000';
export const BASE_URL = `http://localhost:${NEXT_PORT}`;

export type CreateTaskOptions = {
  title: string;
  description?: string;
  tags?: string;
  dueDate?: string;
};

export async function createTaskViaUI(page: Page, options: CreateTaskOptions) {
  const { title, description = '', tags = '', dueDate = '' } = options;
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'タスクを追加' }) })
    .first();

  await form.getByLabel('タイトル').fill(title);
  await form.getByLabel('説明').fill(description);
  await form.getByLabel('期限').fill(dueDate);
  await form.getByPlaceholder('カンマ区切りで入力').fill(tags);
  await form.getByRole('button', { name: 'タスクを追加' }).click();

  const taskList = page.getByTestId('task-list');
  const card = taskList.locator(`[data-task-title="${escapeSelectorAttribute(title)}"]`).first();
  await expect(card).toBeVisible();
  return card;
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

export async function getTaskCardByTitle(page: Page, title: string): Promise<Locator> {
  const taskList = page.getByTestId('task-list');
  const locator = taskList.locator(`[data-task-title="${escapeSelectorAttribute(title)}"]`).first();
  await expect(locator).toBeVisible();
  return locator;
}

function escapeSelectorAttribute(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
