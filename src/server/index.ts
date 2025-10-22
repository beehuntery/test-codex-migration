import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { getDataStore } from './storage';
import { ALLOWED_STATUSES, DEFAULT_STATUS, Task, TaskStatus } from './types';

const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

const app = express();
const dataStore = getDataStore();

app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), 'public')));

function normalizeDate(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const raw = value.trim();
    if (!raw) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString().slice(0, 10);
  }

  const parsed = new Date(value as string | number | Date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((tag) => {
    if (!seen.has(tag)) {
      seen.add(tag);
      result.push(tag);
    }
  });
  return result;
}

async function readTasks(): Promise<Task[]> {
  return dataStore.readTasks();
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await dataStore.writeTasks(tasks);
}

async function readTags(): Promise<string[]> {
  return dataStore.readTags();
}

async function writeTags(tags: unknown[]): Promise<string[]> {
  return dataStore.writeTags(tags);
}

async function replaceTagAcrossTasks(oldTag: string, newTag: string): Promise<boolean> {
  if (!oldTag || oldTag === newTag) {
    return false;
  }

  const tasks = await readTasks();
  let changed = false;

  tasks.forEach((task) => {
    if (task.tags.includes(oldTag)) {
      changed = true;
      task.tags = task.tags
        .map((tag) => (tag === oldTag ? newTag : tag))
        .filter(Boolean);
    }
  });

  if (changed) {
    await writeTasks(tasks);
  }

  return changed;
}

async function removeTagFromTasks(tag: string): Promise<boolean> {
  const tasks = await readTasks();
  let changed = false;

  tasks.forEach((task) => {
    if (task.tags.includes(tag)) {
      changed = true;
      task.tags = task.tags.filter((name) => name !== tag);
    }
  });

  if (changed) {
    await writeTasks(tasks);
  }

  return changed;
}

function normalizeTagsInput(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return dedupeTags(
    tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
}

function validateStatus(value: unknown): { valid: true; status?: TaskStatus } | { valid: false; error: string } {
  if (value === undefined) {
    return { valid: true, status: undefined };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Status must be a string.' };
  }

  const trimmed = value.trim();
  if (!ALLOWED_STATUSES.includes(trimmed as TaskStatus)) {
    return { valid: false, error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.` };
  }

  return { valid: true, status: trimmed as TaskStatus };
}

function validateDueDate(value: unknown): { valid: true; dueDate: string | null | undefined } | { valid: false; error: string } {
  if (value === undefined) {
    return { valid: true, dueDate: undefined };
  }

  if (value === null || value === '') {
    return { valid: true, dueDate: null };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Due date must be a string in YYYY-MM-DD format.' };
  }

  const normalized = normalizeDate(value);
  if (!normalized) {
    return { valid: false, error: 'Due date must be a valid date in YYYY-MM-DD format.' };
  }

  return { valid: true, dueDate: normalized };
}

app.get('/api/tasks', async (_req: Request, res: Response<Task[]>, next: NextFunction) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tasks', async (req: Request, res: Response<Task | { error: string }>, next: NextFunction) => {
  try {
    const { title, description = '', status, dueDate, tags = [] } = req.body as Record<string, unknown>;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const statusValidation = validateStatus(status);
    if (!statusValidation.valid) {
      return res.status(400).json({ error: statusValidation.error });
    }

    const dueValidation = validateDueDate(dueDate);
    if (!dueValidation.valid) {
      return res.status(400).json({ error: dueValidation.error });
    }

    const tasks = await readTasks();
    const tagsStore = await readTags();
    const normalizedTags = normalizeTagsInput(tags);

    const nextTags = [...tagsStore];
    normalizedTags.forEach((tag) => {
      if (!nextTags.includes(tag)) {
        nextTags.push(tag);
      }
    });

    if (nextTags.length !== tagsStore.length) {
      await writeTags(nextTags);
    }

    const maxOrder = tasks.reduce((max, task) => Math.max(max, Number.isFinite(task.order) ? task.order : max), -1);

    const newTask: Task = {
      id: randomUUID(),
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      status: statusValidation.status ?? DEFAULT_STATUS,
      dueDate: dueValidation.dueDate ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      order: maxOrder + 1,
      tags: normalizedTags
    };

    tasks.push(newTask);
    await writeTasks(tasks);

    return res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tasks/reorder', async (req: Request, res: Response<Task[] | { error: string }>, next: NextFunction) => {
  try {
    const { order } = req.body as { order?: unknown };

    if (!Array.isArray(order) || !order.every((id) => typeof id === 'string')) {
      return res.status(400).json({ error: 'Order must be an array of task ids.' });
    }

    const tasks = await readTasks();
    const indexById = new Map<string, number>(order.map((id, idx) => [id, idx]));
    let changed = false;

    tasks.forEach((task) => {
      const newOrder = indexById.get(task.id);
      if (newOrder !== undefined && task.order !== newOrder) {
        task.order = newOrder;
        changed = true;
      }
    });

    let nextOrder = order.length;
    tasks
      .filter((task) => !indexById.has(task.id))
      .sort((a, b) => a.order - b.order)
      .forEach((task) => {
        if (task.order !== nextOrder) {
          task.order = nextOrder;
          changed = true;
        }
        nextOrder += 1;
      });

    if (changed) {
      await writeTasks(tasks);
    }

    const updatedTasks = await readTasks();
    res.json(updatedTasks);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response<Task | { error: string }>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, status, completed, dueDate, order, tags } = req.body as Record<string, unknown>;

    const tasks = await readTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = tasks[taskIndex];

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Task title must be a non-empty string.' });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: 'Task description must be a string.' });
      }
      task.description = description.trim();
    }

    let nextStatus = status;
    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'Task completion flag must be boolean.' });
      }
      nextStatus = completed ? 'done' : DEFAULT_STATUS;
    }

    if (nextStatus !== undefined) {
      const statusValidation = validateStatus(nextStatus);
      if (!statusValidation.valid) {
        return res.status(400).json({ error: statusValidation.error });
      }
      task.status = statusValidation.status ?? task.status;
    }

    if (dueDate !== undefined) {
      const dueValidation = validateDueDate(dueDate);
      if (!dueValidation.valid) {
        return res.status(400).json({ error: dueValidation.error });
      }
      task.dueDate = dueValidation.dueDate ?? null;
    }

    if (order !== undefined) {
      const numericOrder = Number(order);
      if (!Number.isFinite(numericOrder)) {
        return res.status(400).json({ error: 'Order must be a number.' });
      }
      task.order = numericOrder;
    }

    if (tags !== undefined) {
      const normalizedTags = normalizeTagsInput(tags);
      task.tags = normalizedTags;

      const currentTags = await readTags();
      const merged = [...currentTags];
      normalizedTags.forEach((tagName) => {
        if (!merged.includes(tagName)) {
          merged.push(tagName);
        }
      });
      if (merged.length !== currentTags.length) {
        await writeTags(merged);
      }
    }

    task.updatedAt = new Date().toISOString();
    await writeTasks(tasks);

    res.json(task);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response<Task | { error: string }>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const [removedTask] = tasks.splice(taskIndex, 1);
    await writeTasks(tasks);
    res.json(removedTask);
  } catch (err) {
    next(err);
  }
});

app.get('/api/tags', async (_req: Request, res: Response<string[]>, next: NextFunction) => {
  try {
    const tags = await readTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tags', async (req: Request, res: Response<{ name: string; tags?: string[] } | { error: string }>, next: NextFunction) => {
  try {
    const { name } = req.body as { name?: unknown };

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Tag name is required.' });
    }

    const normalized = name.trim();
    if (!normalized) {
      return res.status(400).json({ error: 'Tag name cannot be empty.' });
    }

    const tags = await readTags();
    if (tags.includes(normalized)) {
      return res.status(200).json({ name: normalized });
    }

    const updated = await writeTags([...tags, normalized]);
    res.status(201).json({ name: normalized, tags: updated });
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tags/:tag', async (req: Request, res: Response<{ name: string; tags: string[] } | { error: string }>, next: NextFunction) => {
  try {
    const currentTag = decodeURIComponent(req.params.tag ?? '').trim();
    const { name } = req.body as { name?: unknown };

    if (!currentTag) {
      return res.status(400).json({ error: 'Tag identifier is required.' });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'New tag name is required.' });
    }

    const normalized = name.trim();
    if (!normalized) {
      return res.status(400).json({ error: 'New tag name cannot be empty.' });
    }

    const tags = await readTags();
    if (!tags.includes(currentTag)) {
      return res.status(404).json({ error: 'Tag not found.' });
    }

    if (normalized !== currentTag && tags.includes(normalized)) {
      return res.status(409).json({ error: 'Tag name already exists.' });
    }

    const updatedTags = tags.map((tag) => (tag === currentTag ? normalized : tag));
    const uniqueTags = await writeTags(updatedTags);
    await replaceTagAcrossTasks(currentTag, normalized);

    res.json({ name: normalized, tags: uniqueTags });
  } catch (err) {
    next(err);
  }
});

app.delete('/api/tags/:tag', async (req: Request, res: Response<{ tags: string[] } | { error: string }>, next: NextFunction) => {
  try {
    const target = decodeURIComponent(req.params.tag ?? '').trim();
    if (!target) {
      return res.status(400).json({ error: 'Tag identifier is required.' });
    }

    const tags = await readTags();
    if (!tags.includes(target)) {
      return res.status(404).json({ error: 'Tag not found.' });
    }

    const updatedTags = await writeTags(tags.filter((tag) => tag !== target));
    await removeTagFromTasks(target);

    res.status(200).json({ tags: updatedTags });
  } catch (err) {
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response<{ error: string }>, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

export async function startServer(port: number = PORT) {
  try {
    await dataStore.readTasks();
    await dataStore.readTags();
  } catch (error) {
    console.warn('Failed to warm data store:', error);
  }
  return app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start the server:', err);
    process.exit(1);
  });
}

export { app };
