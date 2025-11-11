import type { Prisma, PrismaClient as PrismaClientType } from '@prisma/client';
import type { DataStore } from './index';
import {
  DEFAULT_STATUS,
  Task,
  TaskCreateInput,
  TaskUpdateInput
} from '../types';

const prismaModule = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('@prisma/client') as typeof import('@prisma/client');
  } catch (error) {
    throw new Error('Prisma client is not available. Run "npm run prisma:generate" before using the Prisma data store.');
  }
})();

const PrismaClient: typeof PrismaClientType = prismaModule.PrismaClient;

type PrismaTaskWithTags = {
  id: string;
  title: string;
  description: string;
  status: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
  order: number | null;
  tags: { name: string }[];
};

function toISODate(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  return value.toISOString().slice(0, 10);
}

function fromDateString(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapTask(task: PrismaTaskWithTags): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: (task.status as Task['status']) ?? DEFAULT_STATUS,
    dueDate: toISODate(task.dueDate),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null,
    order: task.order ?? 0,
    tags: task.tags.map((tag) => tag.name)
  };
}

export interface PrismaDataStoreOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  slowQueryThresholdMs?: number;
  logDiagnostics?: boolean;
  retryWrites?: boolean;
  sqliteBusyTimeoutMs?: number;
  enableSQLiteWal?: boolean;
}

export interface PrismaDataStoreMetrics {
  retryCount: number;
  slowQueryCount: number;
  transactionCount: number;
  lastRetry?: {
    operation: string;
    errorCode?: string;
    at: string;
  };
  lastSlowQuery?: {
    operation: string;
    model?: string;
    action?: string;
    durationMs: number;
    at: string;
  };
}

type PrismaOperationMeta = {
  operation: string;
  model?: string;
  action?: string;
  retryable?: boolean;
  transactional?: boolean;
};

const DEFAULT_OPTIONS: Required<Omit<PrismaDataStoreOptions, 'maxRetries'>> & { maxRetries: number } = {
  maxRetries: 3,
  retryDelayMs: 150,
  slowQueryThresholdMs: 500,
  logDiagnostics: true,
  retryWrites: false,
  sqliteBusyTimeoutMs: 5000,
  enableSQLiteWal: true
};

const RETRYABLE_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

function extractErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return undefined;
}

function isRetryablePrismaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = extractErrorCode(error);
  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  const name = 'name' in error && typeof (error as { name?: unknown }).name === 'string' ? (error as { name: string }).name : '';

  return [
    'PrismaClientInitializationError',
    'PrismaClientUnknownRequestError',
    'PrismaClientRustPanicError'
  ].includes(name);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class PrismaDataStore implements DataStore {
  private readonly prisma: PrismaClientType;

  private readonly options: Required<PrismaDataStoreOptions> & { maxRetries: number };

  private readonly metrics: PrismaDataStoreMetrics;

  private readonly ready: Promise<void>;

  constructor(options: PrismaDataStoreOptions = {}, client?: PrismaClientType) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.prisma = client ?? new PrismaClient();
    this.metrics = {
      retryCount: 0,
      slowQueryCount: 0,
      transactionCount: 0
    };
    this.ready = this.configureDatasource().catch((error) => {
      if (this.options.logDiagnostics) {
        console.warn('[PrismaDataStore] Failed to run datasource initialization', error);
      }
    });
  }

  getRuntimeMetrics(): PrismaDataStoreMetrics {
    return {
      retryCount: this.metrics.retryCount,
      slowQueryCount: this.metrics.slowQueryCount,
      transactionCount: this.metrics.transactionCount,
      lastRetry: this.metrics.lastRetry,
      lastSlowQuery: this.metrics.lastSlowQuery
    };
  }

  private recordSlowQuery(meta: PrismaOperationMeta, durationMs: number): void {
    if (durationMs < this.options.slowQueryThresholdMs) {
      return;
    }
    this.metrics.slowQueryCount += 1;
    this.metrics.lastSlowQuery = {
      operation: meta.operation,
      model: meta.model,
      action: meta.action,
      durationMs,
      at: new Date().toISOString()
    };

    if (this.options.logDiagnostics) {
      const label = [meta.model, meta.action].filter(Boolean).join('.') || meta.operation;
      console.warn(`[PrismaDataStore] Slow query detected (${durationMs}ms) for ${label}`);
    }
  }

  private recordRetry(meta: PrismaOperationMeta, error: unknown): void {
    this.metrics.retryCount += 1;
    this.metrics.lastRetry = {
      operation: meta.operation,
      errorCode: extractErrorCode(error),
      at: new Date().toISOString()
    };

    if (this.options.logDiagnostics) {
      const label = [meta.model, meta.action].filter(Boolean).join('.') || meta.operation;
      console.warn(`[PrismaDataStore] Retryable error on ${label}, attempt ${this.metrics.retryCount}`);
    }
  }

  private async execute<T>(meta: PrismaOperationMeta, run: () => Promise<T>): Promise<T> {
    await this.ready;
    let delay = this.options.retryDelayMs;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt += 1) {
      const start = Date.now();
      try {
        const result = await run();
        this.recordSlowQuery(meta, Date.now() - start);
        if (meta.transactional) {
          this.metrics.transactionCount += 1;
        }
        return result;
      } catch (error) {
        const canRetry = Boolean(meta.retryable) && isRetryablePrismaError(error);
        if (!canRetry || attempt === this.options.maxRetries) {
          throw error;
        }
        this.recordRetry(meta, error);
        await sleep(delay);
        delay *= 2;
      }
    }

    throw new Error(`Retry budget exhausted for ${meta.operation}`);
  }

  private isSQLiteDatasource(): boolean {
    const url = process.env.DATABASE_URL ?? '';
    return url.startsWith('file:');
  }

  private async configureDatasource(): Promise<void> {
    if (!this.isSQLiteDatasource()) {
      return;
    }

    if (this.options.enableSQLiteWal) {
      try {
        await this.prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL');
      } catch (error) {
        if (this.options.logDiagnostics) {
          console.warn('[PrismaDataStore] Failed to enable WAL journal mode', error);
        }
      }
    }

    if (this.options.sqliteBusyTimeoutMs > 0) {
      try {
        await this.prisma.$queryRawUnsafe(`PRAGMA busy_timeout = ${this.options.sqliteBusyTimeoutMs}`);
      } catch (error) {
        if (this.options.logDiagnostics) {
          console.warn('[PrismaDataStore] Failed to configure busy_timeout', error);
        }
      }
    }
  }

  async listTasks(): Promise<Task[]> {
    return this.execute(
      { operation: 'listTasks', model: 'task', action: 'findMany', retryable: true },
      async () => {
        const tasks: PrismaTaskWithTags[] = await this.prisma.task.findMany({
          orderBy: { order: 'asc' },
          include: { tags: { select: { name: true } } }
        });
        return tasks.map(mapTask);
      }
    );
  }

  async createTask(data: TaskCreateInput): Promise<Task> {
    return this.execute(
      {
        operation: 'createTask',
        model: 'task',
        action: 'create',
        retryable: this.options.retryWrites,
        transactional: true
      },
      async () => {
        const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const aggregate = await tx.task.aggregate({ _max: { order: true } });
          const order = (aggregate._max.order ?? -1) + 1;

          const result: PrismaTaskWithTags = await tx.task.create({
            data: {
              title: data.title,
              description: data.description,
              status: data.status,
              dueDate: fromDateString(data.dueDate),
              order,
              tags: {
                connectOrCreate: data.tags.map((name) => ({
                  where: { name },
                  create: { name }
                }))
              }
            },
            include: { tags: { select: { name: true } } }
          });

          return mapTask(result);
        });

        return created;
      }
    );
  }

  async updateTask(id: string, data: TaskUpdateInput): Promise<Task> {
    return this.execute(
      {
        operation: 'updateTask',
        model: 'task',
        action: 'update',
        retryable: this.options.retryWrites,
        transactional: true
      },
      async () => {
        try {
          const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const updateData: Record<string, unknown> = {};

            if (data.title !== undefined) {
              updateData.title = data.title;
            }
            if (data.description !== undefined) {
              updateData.description = data.description;
            }
            if (data.status !== undefined) {
              updateData.status = data.status;
            }
            if (data.dueDate !== undefined) {
              updateData.dueDate = fromDateString(data.dueDate);
            }
            if (data.order !== undefined) {
              updateData.order = data.order;
            }

            if (data.tags !== undefined) {
              const tagRecords = await Promise.all(
                data.tags.map((name) =>
                  tx.tag.upsert({
                    where: { name },
                    update: {},
                    create: { name }
                  })
                )
              );

              updateData.tags = {
                set: tagRecords.map((tag) => ({ id: tag.id }))
              };
            }

            const result: PrismaTaskWithTags = await tx.task.update({
              where: { id },
              data: updateData,
              include: { tags: { select: { name: true } } }
            });

            return mapTask(result);
          });

          return updated;
        } catch (error: any) {
          if (error?.code === 'P2025') {
            throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' });
          }
          throw error;
        }
      }
    );
  }

  async deleteTask(id: string): Promise<Task> {
    return this.execute(
      { operation: 'deleteTask', model: 'task', action: 'delete', retryable: this.options.retryWrites },
      async () => {
        try {
          const deleted: PrismaTaskWithTags = await this.prisma.task.delete({
            where: { id },
            include: { tags: { select: { name: true } } }
          });
          return mapTask(deleted);
        } catch (error: any) {
          if (error?.code === 'P2025') {
            throw Object.assign(new Error('Task not found'), { code: 'NOT_FOUND' });
          }
          throw error;
        }
      }
    );
  }

  async reorderTasks(order: string[]): Promise<Task[]> {
    return this.execute(
      {
        operation: 'reorderTasks',
        model: 'task',
        action: 'updateMany',
        retryable: this.options.retryWrites,
        transactional: true
      },
      async () =>
        this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const tasks: Array<{ id: string; order: number | null }> = await tx.task.findMany({
            select: { id: true, order: true }
          });
          const orderMap = new Map(order.map((id, idx) => [id, idx] as const));
          let changed = false;

          for (const task of tasks) {
            const newOrder = orderMap.get(task.id);
            if (newOrder !== undefined && task.order !== newOrder) {
              await tx.task.update({ where: { id: task.id }, data: { order: newOrder } });
              changed = true;
            }
          }

          let nextOrder = order.length;
          const remainder = tasks
            .filter((task) => !orderMap.has(task.id))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          for (const task of remainder) {
            if (task.order !== nextOrder) {
              await tx.task.update({ where: { id: task.id }, data: { order: nextOrder } });
              changed = true;
            }
            nextOrder += 1;
          }

          if (!changed) {
            const existing: PrismaTaskWithTags[] = await tx.task.findMany({
              orderBy: { order: 'asc' },
              include: { tags: { select: { name: true } } }
            });
            return existing.map(mapTask);
          }

          const updated: PrismaTaskWithTags[] = await tx.task.findMany({
            orderBy: { order: 'asc' },
            include: { tags: { select: { name: true } } }
          });
          return updated.map(mapTask);
        })
    );
  }

  async listTags(): Promise<string[]> {
    return this.execute(
      { operation: 'listTags', model: 'tag', action: 'findMany', retryable: true },
      async () => {
        const tags = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
        return tags.map((tag: { name: string }) => tag.name);
      }
    );
  }

  async createTag(name: string): Promise<{ created: boolean; tags: string[] }> {
    return this.execute(
      { operation: 'createTag', model: 'tag', action: 'create', retryable: this.options.retryWrites },
      async () => {
        const trimmed = name.trim();
        const existing = await this.prisma.tag.findUnique({ where: { name: trimmed } });
        if (existing) {
          return { created: false, tags: await this.listTags() };
        }

        await this.prisma.tag.create({ data: { name: trimmed } });
        return { created: true, tags: await this.listTags() };
      }
    );
  }

  async renameTag(currentTag: string, nextTag: string): Promise<{ name: string; tags: string[] }> {
    const current = currentTag.trim();
    const next = nextTag.trim();

    return this.execute(
      {
        operation: 'renameTag',
        model: 'tag',
        action: 'update',
        retryable: this.options.retryWrites,
        transactional: true
      },
      async () =>
        this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const existing = await tx.tag.findUnique({ where: { name: current } });
          if (!existing) {
            throw Object.assign(new Error('Tag not found'), { code: 'NOT_FOUND' });
          }

          if (current !== next) {
            const conflict = await tx.tag.findUnique({ where: { name: next } });
            if (conflict) {
              throw Object.assign(new Error('Tag name already exists'), { code: 'CONFLICT' });
            }
            await tx.tag.update({ where: { name: current }, data: { name: next } });
          }

          const tags = await tx.tag.findMany({ orderBy: { name: 'asc' } });
          return { name: next, tags: tags.map((tag: { name: string }) => tag.name) };
        })
    );
  }

  async deleteTag(tag: string): Promise<string[]> {
    const trimmed = tag.trim();
    return this.execute(
      {
        operation: 'deleteTag',
        model: 'tag',
        action: 'delete',
        retryable: this.options.retryWrites,
        transactional: true
      },
      async () => {
        try {
          await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await tx.tag.delete({ where: { name: trimmed } });
          });
        } catch (error: any) {
          if (error?.code === 'P2025') {
            throw Object.assign(new Error('Tag not found'), { code: 'NOT_FOUND' });
          }
          throw error;
        }

        return this.listTags();
      }
    );
  }
}
