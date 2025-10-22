import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ALLOWED_STATUSES, DEFAULT_STATUS, Task, TaskStatus } from '../types';

type StoredTask = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  completed?: unknown;
  dueDate?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  order?: unknown;
  tags?: unknown;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const STATUS_SET = new Set<TaskStatus>(ALLOWED_STATUSES);

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

function normalizeTask(task: StoredTask, defaultOrder: number | null = null): Task | null {
  if (!task) {
    return null;
  }

  const title = typeof task.title === 'string' ? task.title.trim() : '';
  const description = typeof task.description === 'string' ? task.description.trim() : '';

  const rawStatus = typeof task.status === 'string' ? task.status.trim() : undefined;
  const status: TaskStatus = STATUS_SET.has(rawStatus as TaskStatus)
    ? (rawStatus as TaskStatus)
    : task.completed === true
      ? 'done'
      : DEFAULT_STATUS;

  const dueDate = normalizeDate(task.dueDate);
  const createdAt = typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString();
  const updatedAt = typeof task.updatedAt === 'string' ? task.updatedAt : null;
  const normalizedOrder = Number.isFinite(task.order) ? Number(task.order) : defaultOrder;

  const tags = Array.isArray(task.tags)
    ? dedupeTags(
        task.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    : [];

  return {
    id: typeof task.id === 'string' ? task.id : randomUUID(),
    title,
    description,
    status,
    dueDate,
    createdAt,
    updatedAt,
    order: typeof normalizedOrder === 'number' && Number.isFinite(normalizedOrder) ? normalizedOrder : 0,
    tags
  };
}

async function ensureFile(filePath: string, fallback: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await fs.writeFile(filePath, fallback, 'utf-8');
    } else {
      throw err;
    }
  }
}

export class JsonDataStore {
  private initialized = false;

  private async ensureReady(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    await Promise.all([ensureFile(TASKS_FILE, '[]'), ensureFile(TAGS_FILE, '[]')]);
    this.initialized = true;
  }

  async readTasks(): Promise<Task[]> {
    await this.ensureReady();
    const file = await fs.readFile(TASKS_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(file);

    if (!Array.isArray(parsed)) {
      return [];
    }

    let needsRewrite = false;
    const tasks: Task[] = parsed
      .map((raw, index) => normalizeTask(raw as StoredTask, index))
      .filter((task): task is Task => task !== null)
      .map((task, index) => {
        if (!Number.isFinite(task.order)) {
          needsRewrite = true;
          return { ...task, order: index };
        }
        return task;
      });

    const sorted = [...tasks].sort((a, b) => a.order - b.order);

    if (needsRewrite) {
      await this.writeTasks(sorted);
    }

    return sorted;
  }

  async writeTasks(tasks: Task[]): Promise<void> {
    await this.ensureReady();
    const sorted = [...tasks].sort((a, b) => a.order - b.order);
    await fs.writeFile(TASKS_FILE, JSON.stringify(sorted, null, 2), 'utf-8');
  }

  async readTags(): Promise<string[]> {
    await this.ensureReady();
    const file = await fs.readFile(TAGS_FILE, 'utf-8');
    const parsed: unknown = JSON.parse(file);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return dedupeTags(
      parsed
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b, 'ja'));
  }

  async writeTags(tags: unknown[]): Promise<string[]> {
    await this.ensureReady();
    const unique = dedupeTags(
      tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    ).sort((a, b) => a.localeCompare(b, 'ja'));

    await fs.writeFile(TAGS_FILE, JSON.stringify(unique, null, 2), 'utf-8');
    return unique;
  }
}
