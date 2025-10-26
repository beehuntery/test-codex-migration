import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { DataStore } from './index';
import {
  ALLOWED_STATUSES,
  DEFAULT_STATUS,
  Task,
  TaskStatus,
  TaskCreateInput,
  TaskUpdateInput
} from '../types';

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

export interface JsonDataStoreOptions {
  rootDir?: string;
}

export class JsonDataStore implements DataStore {
  private initialized = false;

  private readonly dataDir: string;

  private get tasksFile(): string {
    return path.join(this.dataDir, 'tasks.json');
  }

  private get tagsFile(): string {
    return path.join(this.dataDir, 'tags.json');
  }

  constructor(options: JsonDataStoreOptions = {}) {
    const baseDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
    this.dataDir = path.join(baseDir, 'data');
  }

  private async ensureReady(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await fs.mkdir(this.dataDir, { recursive: true });
    await Promise.all([ensureFile(this.tasksFile, '[]'), ensureFile(this.tagsFile, '[]')]);
    this.initialized = true;
  }

  private async readTasks(): Promise<Task[]> {
    await this.ensureReady();
    const file = await fs.readFile(this.tasksFile, 'utf-8');
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

  private async writeTasks(tasks: Task[]): Promise<void> {
    await this.ensureReady();
    const sorted = [...tasks].sort((a, b) => a.order - b.order);
    await fs.writeFile(this.tasksFile, JSON.stringify(sorted, null, 2), 'utf-8');
  }

  private async readTags(): Promise<string[]> {
    await this.ensureReady();
    const file = await fs.readFile(this.tagsFile, 'utf-8');
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

  private async writeTags(tags: string[]): Promise<string[]> {
    await this.ensureReady();
    const unique = dedupeTags(tags.map((tag) => tag.trim()).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'ja'));
    await fs.writeFile(this.tagsFile, JSON.stringify(unique, null, 2), 'utf-8');
    return unique;
  }

  private async ensureTagsExist(tags: string[]): Promise<void> {
    if (!tags.length) {
      return;
    }
    const current = await this.readTags();
    const merged = dedupeTags([...current, ...tags]);
    if (merged.length !== current.length) {
      await this.writeTags(merged);
    }
  }

  async listTasks(): Promise<Task[]> {
    return this.readTasks();
  }

  async createTask(data: TaskCreateInput): Promise<Task> {
    const tasks = await this.readTasks();
    const now = new Date().toISOString();
    const order = tasks.reduce((max, task) => Math.max(max, task.order), -1) + 1;
    const tags = dedupeTags(data.tags);

    const newTask: Task = {
      id: randomUUID(),
      title: data.title,
      description: data.description,
      status: STATUS_SET.has(data.status) ? data.status : DEFAULT_STATUS,
      dueDate: data.dueDate,
      createdAt: now,
      updatedAt: null,
      order,
      tags
    };

    tasks.push(newTask);
    await this.writeTasks(tasks);
    await this.ensureTagsExist(tags);
    return newTask;
  }

  async updateTask(id: string, data: TaskUpdateInput): Promise<Task> {
    const tasks = await this.readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' });
    }

    const task = tasks[index];

    if (data.title !== undefined) {
      task.title = data.title;
    }
    if (data.description !== undefined) {
      task.description = data.description;
    }
    if (data.status !== undefined && STATUS_SET.has(data.status)) {
      task.status = data.status;
    }
    if (data.dueDate !== undefined) {
      task.dueDate = data.dueDate;
    }
    if (data.order !== undefined) {
      task.order = data.order;
    }
    if (data.tags !== undefined) {
      task.tags = dedupeTags(data.tags);
      await this.ensureTagsExist(task.tags);
    }

    task.updatedAt = new Date().toISOString();
    tasks[index] = task;
    await this.writeTasks(tasks);
    return task;
  }

  async deleteTask(id: string): Promise<Task> {
    const tasks = await this.readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' });
    }

    const [removed] = tasks.splice(index, 1);
    await this.writeTasks(tasks);
    return removed;
  }

  async reorderTasks(order: string[]): Promise<Task[]> {
    const tasks = await this.readTasks();
    const indexById = new Map(order.map((id, idx) => [id, idx] as const));
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
      await this.writeTasks(tasks);
    }

    return tasks.slice().sort((a, b) => a.order - b.order);
  }

  async listTags(): Promise<string[]> {
    return this.readTags();
  }

  async createTag(name: string): Promise<{ created: boolean; tags: string[] }> {
    const trimmed = name.trim();
    const current = await this.readTags();
    if (current.includes(trimmed)) {
      return { created: false, tags: current };
    }

    const updated = await this.writeTags([...current, trimmed]);
    return { created: true, tags: updated };
  }

  async renameTag(currentTag: string, nextTag: string): Promise<{ name: string; tags: string[] }> {
    const trimmedCurrent = currentTag.trim();
    const trimmedNext = nextTag.trim();
    const tags = await this.readTags();

    if (!tags.includes(trimmedCurrent)) {
      throw Object.assign(new Error('Tag not found'), { code: 'NOT_FOUND' });
    }

    if (trimmedCurrent !== trimmedNext && tags.includes(trimmedNext)) {
      throw Object.assign(new Error('Tag name already exists'), { code: 'CONFLICT' });
    }

    const updatedTags = tags.map((tag) => (tag === trimmedCurrent ? trimmedNext : tag));
    await this.writeTags(updatedTags);

    const tasks = await this.readTasks();
    let changed = false;
    tasks.forEach((task) => {
      if (task.tags.includes(trimmedCurrent)) {
        task.tags = dedupeTags(task.tags.map((tag) => (tag === trimmedCurrent ? trimmedNext : tag)));
        task.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) {
      await this.writeTasks(tasks);
    }

    return { name: trimmedNext, tags: await this.readTags() };
  }

  async deleteTag(tag: string): Promise<string[]> {
    const trimmed = tag.trim();
    const tags = await this.readTags();
    if (!tags.includes(trimmed)) {
      throw Object.assign(new Error('Tag not found'), { code: 'NOT_FOUND' });
    }

    const updatedTags = tags.filter((name) => name !== trimmed);
    await this.writeTags(updatedTags);

    const tasks = await this.readTasks();
    let changed = false;
    tasks.forEach((task) => {
      if (task.tags.includes(trimmed)) {
        task.tags = task.tags.filter((name) => name !== trimmed);
        task.updatedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) {
      await this.writeTasks(tasks);
    }

    return updatedTags;
  }
}
