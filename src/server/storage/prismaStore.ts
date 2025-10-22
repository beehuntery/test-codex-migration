// @ts-nocheck
const { PrismaClient } = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('@prisma/client');
  } catch (error) {
    throw new Error('Prisma client is not available. Run "npm run prisma:generate" before using the Prisma data store.');
  }
})();

import { DEFAULT_STATUS, Task } from '../types';

function toDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class PrismaDataStore {
  private prisma = new PrismaClient();

  async readTasks(): Promise<Task[]> {
    const tasks = await this.prisma.task.findMany({
      orderBy: { order: 'asc' },
      include: {
        tags: {
          select: { name: true }
        }
      }
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status ?? DEFAULT_STATUS,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt ? task.updatedAt.toISOString() : null,
      order: task.order ?? 0,
      tags: task.tags.map((tag) => tag.name)
    }));
  }

  async writeTasks(tasks: Task[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.task.deleteMany();
      await tx.tag.deleteMany();

      const tagSet = new Set<string>();
      tasks.forEach((task) => task.tags.forEach((tag) => tagSet.add(tag)));
      const sortedTags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'ja'));

      const tagMap = new Map<string, string>();
      for (const name of sortedTags) {
        const record = await tx.tag.create({ data: { name } });
        tagMap.set(name, record.id);
      }

      for (const task of tasks) {
        await tx.task.create({
          data: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: toDate(task.dueDate ?? null),
            createdAt: new Date(task.createdAt),
            updatedAt: task.updatedAt ? new Date(task.updatedAt) : null,
            order: task.order,
            tags: {
              connect: task.tags
                .map((name) => tagMap.get(name))
                .filter((id): id is string => Boolean(id))
                .map((id) => ({ id }))
            }
          }
        });
      }
    });
  }

  async readTags(): Promise<string[]> {
    const tags = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return tags.map((tag) => tag.name);
  }

  async writeTags(tags: unknown[]): Promise<string[]> {
    const normalized = Array.from(
      new Set(
        (tags as unknown[])
          .filter((tag): tag is string => typeof tag === 'string')
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'ja'));

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.tag.findMany();
      const existingMap = new Map(existing.map((tag) => [tag.name, tag.id] as const));

      const toDelete = existing.filter((tag) => !normalized.includes(tag.name));
      if (toDelete.length > 0) {
        await tx.tag.deleteMany({ where: { id: { in: toDelete.map((tag) => tag.id) } } });
      }

      for (const name of normalized) {
        if (!existingMap.has(name)) {
          await tx.tag.create({ data: { name } });
        }
      }
    });

    return normalized;
  }
}
