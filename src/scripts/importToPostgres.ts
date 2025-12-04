import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const ALLOWED_STATUSES = new Set(['todo', 'in_progress', 'done']);

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn']
});

type RawTask = {
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

type NormalizedTask = {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  order: number;
  tags: string[];
};

async function readJsonArray(filePath: string): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function toDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isoCandidate = /\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed;
    const parsed = new Date(isoCandidate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeTasks(rawTasks: unknown[]): NormalizedTask[] {
  let fallbackOrder = 0;
  return rawTasks
    .map((raw) => {
      const task = raw as RawTask;
      const id = typeof task.id === 'string' && task.id.trim() ? task.id.trim() : randomUUID();
      const title = typeof task.title === 'string' ? task.title.trim() : '';
      if (!title) return null;

      const description = typeof task.description === 'string' ? task.description.trim() : '';

      let status: string | undefined;
      if (typeof task.status === 'string') {
        const trimmed = task.status.trim();
        if (ALLOWED_STATUSES.has(trimmed)) status = trimmed;
      }
      if (status === undefined && task.completed === true) status = 'done';
      status = status ?? 'todo';

      const dueDate = toDate(task.dueDate);
      const createdAt = toDate(task.createdAt) ?? new Date();
      const updatedAt = toDate(task.updatedAt);
      const order = Number.isFinite(task.order) ? Number(task.order) : fallbackOrder++;

      const tags = Array.isArray(task.tags)
        ? Array.from(
            new Set(
              task.tags
                .filter((tag): tag is string => typeof tag === 'string')
                .map((tag) => tag.trim())
                .filter(Boolean)
            )
          )
        : [];

      return {
        id,
        title,
        description,
        status,
        dueDate,
        createdAt,
        updatedAt,
        order,
        tags
      } satisfies NormalizedTask;
    })
    .filter((task): task is NormalizedTask => task !== null)
    .map((task, index) => ({ ...task, order: Number.isFinite(task.order) ? task.order : index }));
}

async function loadNormalizedData(): Promise<{ tasks: NormalizedTask[]; tags: string[] }> {
  const [rawTasks, rawTags] = await Promise.all([readJsonArray(TASKS_FILE), readJsonArray(TAGS_FILE)]);
  const tasks = normalizeTasks(rawTasks);
  const explicitTags = rawTags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const tagSet = new Set<string>(explicitTags);
  tasks.forEach((task) => task.tags.forEach((tag) => tagSet.add(tag)));

  return { tasks, tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja')) };
}

async function importData(): Promise<void> {
  const { tasks, tags } = await loadNormalizedData();
  console.log(`Preparing to import ${tasks.length} task(s) and ${tags.length} tag(s).`);

  await prisma.$transaction(async (tx) => {
    // clean tables
    await tx.$executeRawUnsafe('TRUNCATE TABLE "_TagToTask", "Task", "Tag" RESTART IDENTITY CASCADE');

    // create tags
    const now = new Date();
    const tagIds = new Map<string, string>();
    const tagRecords = tags.map((name) => ({ id: randomUUID(), name, createdAt: now, updatedAt: null }));
    tagRecords.forEach((t) => tagIds.set(t.name, t.id));
    await tx.tag.createMany({ data: tagRecords });

    // create tasks with tag connections
    for (const task of tasks) {
      const taskId = task.id ?? randomUUID();
      await tx.task.create({
        data: {
          id: taskId,
          title: task.title,
          description: task.description,
          status: task.status,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          order: task.order,
          tags: {
            connect: task.tags
              .map((name) => tagIds.get(name))
              .filter((id): id is string => Boolean(id))
              .map((id) => ({ id }))
          }
        }
      });
    }
  });

  console.log('Postgres database has been populated from JSON sources.');
}

importData()
  .catch((error) => {
    console.error('Failed to import data into Postgres:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
