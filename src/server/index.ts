import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { appConfig } from './config';
import { getDataStore } from './storage';
import {
  ALLOWED_STATUSES,
  DEFAULT_STATUS,
  Task,
  TaskStatus,
  TaskCreateInput,
  TaskCreateInputSchema,
  TaskUpdateInput,
  TaskUpdateInputSchema
} from './types';

const { port: defaultPort } = appConfig;

const app = express();
const dataStore = getDataStore();

app.use(express.json());

const shouldLogApiRequests = process.env.LOG_API_REQUESTS === '1';
if (shouldLogApiRequests) {
  app.use((req, res, next) => {
    if (!req.path?.startsWith('/api/')) {
      return next();
    }
    const startedAt = Date.now();
    res.on('finish', () => {
      const elapsed = Date.now() - startedAt;
      const userAgent = req.get('user-agent') || 'unknown';
      console.log(
        `[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${elapsed}ms) UA="${userAgent}"`
      );
    });
    return next();
  });
}

app.use(express.static(path.resolve(process.cwd(), 'public')));

// Simple health check for monitors and smoke tests
app.get('/api/health', (_req: Request, res: Response) => {
  const serviceId = process.env.RENDER_SERVICE_ID ?? 'unknown';
  const serviceName = process.env.RENDER_SERVICE_NAME ?? process.env.RENDER_EXTERNAL_HOSTNAME ?? 'unknown';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? 'production',
    serviceId,
    serviceName
  });
});

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

function buildCreatePayload(params: {
  title: string;
  description: string;
  status?: TaskStatus;
  dueDate: string | null;
  tags: string[];
}): TaskCreateInput {
  return TaskCreateInputSchema.parse({
    title: params.title.trim(),
    description: params.description.trim(),
    status: params.status ?? DEFAULT_STATUS,
    dueDate: params.dueDate,
    tags: params.tags
  });
}

function buildUpdatePayload(data: {
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string | null;
  order?: number;
  tags?: string[];
}): TaskUpdateInput {
  const payload: TaskUpdateInput = {};
  if (data.title !== undefined) {
    payload.title = data.title.trim();
  }
  if (data.description !== undefined) {
    payload.description = data.description.trim();
  }
  if (data.status !== undefined) {
    payload.status = data.status;
  }
  if (data.dueDate !== undefined) {
    payload.dueDate = data.dueDate;
  }
  if (data.order !== undefined) {
    payload.order = data.order;
  }
  if (data.tags !== undefined) {
    payload.tags = data.tags;
  }
  return TaskUpdateInputSchema.parse(payload);
}

app.get('/api/tasks', async (_req: Request, res: Response<Task[]>, next: NextFunction) => {
  try {
    const tasks = await dataStore.listTasks();
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

    const normalizedTags = normalizeTagsInput(tags);
    const payload = buildCreatePayload({
      title,
      description: typeof description === 'string' ? description : '',
      status: statusValidation.status ?? DEFAULT_STATUS,
      dueDate: dueValidation.dueDate ?? null,
      tags: normalizedTags
    });

    const created = await dataStore.createTask(payload);
    res.status(201).json(created);
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

    const tasks = await dataStore.reorderTasks(order);
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response<Task | { error: string }>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, status, completed, dueDate, order, tags } = req.body as Record<string, unknown>;

    const update: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      dueDate?: string | null;
      order?: number;
      tags?: string[];
    } = {};

    if (title !== undefined) {
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Task title must be a non-empty string.' });
      }
      update.title = title;
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return res.status(400).json({ error: 'Task description must be a string.' });
      }
      update.description = description;
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
      update.status = statusValidation.status ?? DEFAULT_STATUS;
    }

    if (dueDate !== undefined) {
      const dueValidation = validateDueDate(dueDate);
      if (!dueValidation.valid) {
        return res.status(400).json({ error: dueValidation.error });
      }
      update.dueDate = dueValidation.dueDate ?? null;
    }

    if (order !== undefined) {
      const numericOrder = Number(order);
      if (!Number.isFinite(numericOrder)) {
        return res.status(400).json({ error: 'Order must be a number.' });
      }
      update.order = numericOrder;
    }

    if (tags !== undefined) {
      update.tags = normalizeTagsInput(tags);
    }

    const updated = await dataStore.updateTask(id, buildUpdatePayload(update));
    res.json(updated);
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Task not found.' });
    }
    next(err);
  }
});

app.delete('/api/tasks/:id', async (req: Request, res: Response<Task | { error: string }>, next: NextFunction) => {
  try {
    const { id } = req.params;
    const removed = await dataStore.deleteTask(id);
    res.json(removed);
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Task not found.' });
    }
    next(err);
  }
});

app.get('/api/tags', async (_req: Request, res: Response<string[]>, next: NextFunction) => {
  try {
    const tags = await dataStore.listTags();
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

    const result = await dataStore.createTag(normalized);
    if (!result.created) {
      return res.status(200).json({ name: normalized });
    }

    res.status(201).json({ name: normalized, tags: result.tags });
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

    const result = await dataStore.renameTag(currentTag, normalized);
    res.json(result);
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Tag not found.' });
    }
    if (err?.code === 'CONFLICT') {
      return res.status(409).json({ error: 'Tag name already exists.' });
    }
    next(err);
  }
});

app.delete('/api/tags/:tag', async (req: Request, res: Response<{ tags: string[] } | { error: string }>, next: NextFunction) => {
  try {
    const target = decodeURIComponent(req.params.tag ?? '').trim();
    if (!target) {
      return res.status(400).json({ error: 'Tag identifier is required.' });
    }

    const tags = await dataStore.deleteTag(target);
    res.status(200).json({ tags });
  } catch (err: any) {
    if (err?.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Tag not found.' });
    }
    next(err);
  }
});

app.use((err: unknown, _req: Request, res: Response<{ error: string }>, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

export async function startServer(port: number = defaultPort) {
  try {
    await dataStore.listTasks();
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

module.exports = { app, startServer, ALLOWED_STATUSES };
