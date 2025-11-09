import { test, expect } from '@playwright/test';
import { BASE_URL, captureConsoleErrors, createTaskViaUI, getTaskCardByTitle } from './utils';

const LEGACY_BASE_URL =
  process.env.PLAYWRIGHT_LEGACY_BASE_URL ??
  process.env.LEGACY_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3000';
const LEGACY_ROOT_URL = new URL('/', LEGACY_BASE_URL).toString();

test.describe('Legacy UI parity', () => {
  test('legacy static UI reflects Next.js task updates', async ({ page, context }) => {
    const uniqueId = Date.now();
    const title = `Parity Task ${uniqueId}`;
    const tags = 'parity-check,legacy';
    const dueDate = '2026-08-15';
    const { errors, dispose } = captureConsoleErrors(page);

    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');

    const card = await createTaskViaUI(page, {
      title,
      description: 'Ensure parity between Express UI and Next.js UI',
      tags,
      dueDate
    });

    await expect(card.getByText('parity-check')).toBeVisible();
    await expect(card.getByText('legacy')).toBeVisible();

    const taskId = await card.getAttribute('data-task-id');
    expect(taskId).toBeTruthy();

    const legacyPage = await context.newPage();
    const legacyConsole = captureConsoleErrors(legacyPage);
    await legacyPage.goto(LEGACY_ROOT_URL);

    const legacyTask = legacyPage.locator(`[data-task-id="${taskId}"]`).first();
    await expect(legacyTask).toBeVisible();
    await expect(legacyTask.locator('.title')).toHaveText(title);
    await expect(legacyTask.locator('select.status')).toHaveValue('todo');
    await expect(legacyTask.locator('.due-date')).toHaveValue(dueDate);
    const legacyTagList = legacyTask.locator('.tag-chip-list').first();
    await expect(legacyTagList).toContainText('parity-check');
    await expect(legacyTagList).toContainText('legacy');

    await legacyPage.fill('#search', title);
    await expect.poll(async () => {
      const titleTexts = await legacyPage.locator('#task-list .task .title').allTextContents();
      return titleTexts.filter((text) => text?.includes(title)).length;
    }, { message: 'Legacy UI should narrow down to the searched task' }).toBe(1);

    await legacyPage.close();
    legacyConsole.dispose();
    dispose();

    expect(errors).toEqual([]);
    expect(legacyConsole.errors).toEqual([]);
  });
});
