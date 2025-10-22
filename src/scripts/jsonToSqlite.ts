import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const ALLOWED_STATUSES = new Set(['todo', 'in_progress', 'done']);

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
    if (!trimmed) {
      return null;
    }
    const isoCandidate = /\d{4}-\d{2}-\d{2}$/.test(trimmed)
      ? `${trimmed}T00:00:00.000Z`
      : trimmed;
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
      if (!title) {
        return null;
      }

      const description = typeof task.description === 'string' ? task.description.trim() : '';
      let status: string | undefined;
      if (typeof task.status === 'string') {
        const trimmed = task.status.trim();
        if (ALLOWED_STATUSES.has(trimmed)) {
          status = trimmed;
        }
      }
      if (status === undefined && task.completed === true) {
        status = 'done';
      }
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
  tasks.forEach((task) => {
    task.tags.forEach((tag) => tagSet.add(tag));
  });

  return { tasks, tags: Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja')) };
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

function formatDate(value: Date | null): string {
  if (!value) {
    return 'NULL';
  }
  return `'${escapeSql(value.toISOString())}'`;
}

function formatString(value: string): string {
  return `'${escapeSql(value)}'`;
}

async function writeSqlFile(tasks: NormalizedTask[], tags: string[]): Promise<string> {
  const statements: string[] = [];

  statements.push('PRAGMA foreign_keys = OFF;');
  statements.push('DELETE FROM "_TagToTask";');
  statements.push('DELETE FROM "Task";');
  statements.push('DELETE FROM "Tag";');

  const tagIdMap = new Map<string, string>();
  const now = new Date();
  tags.forEach((name) => {
    const id = randomUUID();
    tagIdMap.set(name, id);
    statements.push(
      `INSERT INTO "Tag" ("id", "name", "createdAt", "updatedAt") VALUES (${formatString(id)}, ${formatString(
        name
      )}, ${formatDate(now)}, NULL);`
    );
  });

  tasks.forEach((task) => {
    const record = {
      ...task,
      createdAt: task.createdAt ?? new Date(),
      updatedAt: task.updatedAt
    };

    statements.push(
      `INSERT INTO "Task" ("id", "title", "description", "status", "dueDate", "createdAt", "updatedAt", "order") VALUES (${formatString(
        record.id
      )}, ${formatString(record.title)}, ${formatString(record.description)}, ${formatString(record.status)}, ${formatDate(
        record.dueDate
      )}, ${formatDate(record.createdAt)}, ${formatDate(record.updatedAt)}, ${record.order});`
    );

    const assignments = record.tags
      .map((tag) => {
        const tagId = tagIdMap.get(tag);
        return tagId ? `(${formatString(tagId)}, ${formatString(record.id)})` : null;
      })
      .filter((value): value is string => value !== null);

    assignments.forEach((tuple) => {
      statements.push(`INSERT OR IGNORE INTO "_TagToTask" ("A", "B") VALUES ${tuple};`);
    });
  });

  statements.push('PRAGMA foreign_keys = ON;');

  const sqlScript = statements.join('\n');
  const tempFile = path.join(os.tmpdir(), `json-to-sqlite-${Date.now()}.sql`);
  await fs.writeFile(tempFile, sqlScript, 'utf-8');
  return tempFile;
}

async function migrate(): Promise<void> {
  const { tasks, tags } = await loadNormalizedData();
  console.log(`Preparing to import ${tasks.length} task(s) and ${tags.length} tag(s).`);

  const sqlFile = await writeSqlFile(tasks, tags);

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'npx',
        ['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', sqlFile],
        {
          stdio: 'inherit'
        }
      );

      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`prisma db execute failed with exit code ${code}`));
        }
      });
    });

    console.log('SQLite database has been populated from JSON sources.');
  } finally {
    await fs.unlink(sqlFile).catch(() => {
      // ignore cleanup failure
    });
  }
}

migrate().catch((error) => {
  console.error('Failed to migrate JSON data to SQLite:', error);
  process.exit(1);
});
