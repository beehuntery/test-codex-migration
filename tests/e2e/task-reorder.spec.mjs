import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';

const htmlTemplate = await readFile(new URL('../../public/index.html', import.meta.url), 'utf-8');
const dragUtilsSource = await readFile(new URL('../../public/drag-utils.mjs', import.meta.url), 'utf-8');
const appSourceRaw = await readFile(new URL('../../public/app.js', import.meta.url), 'utf-8');
const appSource = appSourceRaw.replace(/import\s+{[^}]+}\s+from\s+['\"]\.\/drag-utils\.mjs['\"];?\n?/, '');

const htmlForTest = htmlTemplate
  .replace(/<link[^>]*href="styles.css"[^>]*>/, '')
  .replace(
    /<script[^>]*src="app.js"[^>]*><\/script>/,
    `<script type="module">\n${dragUtilsSource}\n${appSource}\n</script>`
  );

const seedStoreScript = `(() => {
  console.log('seed script start');

  const cloneTasks = (tasks) =>
    tasks.map((task) => ({
      ...task,
      tags: Array.isArray(task.tags) ? task.tags.slice() : []
    }));

  const defaultData = {
    tasks: [
      {
        id: 'task-1',
        title: 'Alpha',
        description: '',
        status: 'todo',
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        order: 0,
        tags: []
      },
      {
        id: 'task-2',
        title: 'Bravo',
        description: '',
        status: 'in_progress',
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        order: 1,
        tags: []
      },
      {
        id: 'task-3',
        title: 'Charlie',
        description: '',
        status: 'todo',
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
        order: 2,
        tags: []
      }
    ],
    tags: []
  };

  const readPersisted = () => {
    if (!window.name) {
      return null;
    }
    try {
      return JSON.parse(window.name);
    } catch (error) {
      console.warn('Failed to parse persisted test store', error);
      return null;
    }
  };

  const persisted = readPersisted();
  const store = {
    tasks:
      persisted && Array.isArray(persisted.tasks) && persisted.tasks.length
        ? cloneTasks(persisted.tasks)
        : cloneTasks(defaultData.tasks),
    tags: persisted && Array.isArray(persisted.tags) ? persisted.tags.slice() : defaultData.tags.slice()
  };

  const persist = () => {
    window.name = JSON.stringify({
      tasks: cloneTasks(store.tasks),
      tags: store.tags.slice()
    });
  };

  persist();
  window.__testStore = store;

  const makeResponse = (payload) =>
    new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json' }
    });

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (resource, options = {}) => {
    const url = typeof resource === 'string' ? resource : resource.url;
    const method = (options.method || 'GET').toUpperCase();

    if (url.endsWith('/api/tasks') && method === 'GET') {
      const sorted = store.tasks.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return makeResponse(sorted);
    }

    if (url.endsWith('/api/tags') && method === 'GET') {
      return makeResponse(store.tags);
    }

    if (url.includes('/api/tasks/') && !url.endsWith('/reorder') && method === 'PATCH') {
      const id = url.split('/').pop();
      const bodyText = options.body ? String(options.body) : '{}';
      const patch = JSON.parse(bodyText);
      const task = store.tasks.find((t) => t.id === id);
      if (task) {
        Object.assign(task, patch, { updatedAt: new Date().toISOString() });
        persist();
      }
      return makeResponse(task ?? null);
    }

    if (url.endsWith('/api/tasks/reorder') && method === 'PATCH') {
      const bodyText = options.body ? String(options.body) : '{}';
      const payload = JSON.parse(bodyText);
      const order = payload.order || [];
      store.tasks.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      store.tasks.forEach((task, index) => {
        task.order = index;
      });
      persist();
      return makeResponse(store.tasks);
    }

    return originalFetch(resource, options);
  };
})();`;

test.describe('タスクボードのドラッグ＆ドロップ', () => {
  test('ドラッグ操作でタスクの順序が保持され、リロード後も維持される', async ({ page }) => {
    page.on('console', (msg) => console.log(`[console:${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[pageerror] ${err.message}`));
    await page.addInitScript({ content: seedStoreScript });
    const dataUrl = 'data:text/html,' + encodeURIComponent(htmlForTest);
    await page.goto(dataUrl);

    const store = await page.evaluate(() => window.__testStore);
    expect(store.tasks.length).toBe(3);

    const taskTitles = page.locator('.task .title');
    await expect(taskTitles).toHaveCount(3);
    await expect(taskTitles.nth(0)).toHaveText('Alpha');
    await expect(taskTitles.nth(1)).toHaveText('Bravo');

    await page.dragAndDrop('.task:nth-of-type(2)', '.task:nth-of-type(1)', {
      sourcePosition: { x: 20, y: 20 },
      targetPosition: { x: 20, y: 20 }
    });
    await page.waitForTimeout(300);

    await expect(taskTitles.nth(0)).toHaveText('Bravo');
    await expect(taskTitles.nth(1)).toHaveText('Alpha');

    const serverOrder = await page.evaluate(() => window.__testStore.tasks.map((task) => task.id));
    expect(serverOrder.slice(0, 3)).toEqual(['task-2', 'task-1', 'task-3']);

    await page.reload();
    await page.waitForSelector('.task .title');

    const reloadedTitles = page.locator('.task .title');
    await expect(reloadedTitles.nth(0)).toHaveText('Bravo');
    await expect(reloadedTitles.nth(1)).toHaveText('Alpha');

    const reloadedOrder = await page.evaluate(() => window.__testStore.tasks.map((task) => task.id));
    expect(reloadedOrder.slice(0, 3)).toEqual(['task-2', 'task-1', 'task-3']);
  });
});
