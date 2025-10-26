import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { JsonDataStore } from './jsonStore';
import { TaskSchema, TaskListSchema, TagListSchema } from '../types';

describe('JsonDataStore の基本動作', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'json-store-'));
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  it('タスク作成時に順序とタグが正規化される', async () => {
    const store = new JsonDataStore({ rootDir: tempRoot });
    const created = await store.createTask({
      title: 'Inbox zero',
      description: 'Process mail',
      status: 'todo',
      dueDate: null,
      tags: ['alpha', 'beta', 'alpha']
    });

    expect(() => TaskSchema.parse(created)).not.toThrow();
    expect(created.order).toBe(0);
    expect(created.tags).toEqual(['alpha', 'beta']);

    const tasks = await store.listTasks();
    expect(() => TaskListSchema.parse(tasks)).not.toThrow();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Inbox zero');

    const tags = await store.listTags();
    expect(() => TagListSchema.parse(tags)).not.toThrow();
    expect(tags).toEqual(['alpha', 'beta']);
  });

  it('指定したフィールドのみ更新され未指定項目は保持される', async () => {
    const store = new JsonDataStore({ rootDir: tempRoot });
    await store.createTask({
      title: 'First',
      description: 'A',
      status: 'todo',
      dueDate: null,
      tags: []
    });
    const second = await store.createTask({
      title: 'Second',
      description: 'B',
      status: 'in_progress',
      dueDate: '2025-10-30',
      tags: ['urgent']
    });

    const updated = await store.updateTask(second.id, {
      title: 'Second – updated',
      tags: ['beta', 'gamma', 'beta']
    });

    expect(() => TaskSchema.parse(updated)).not.toThrow();
    expect(updated.title).toBe('Second – updated');
    expect(updated.dueDate).toBe('2025-10-30');
    expect(updated.tags).toEqual(['beta', 'gamma']);

    const tags = await store.listTags();
    expect(() => TagListSchema.parse(tags)).not.toThrow();
    expect(tags).toEqual(['beta', 'gamma', 'urgent']);
  });

  it('並び替え API でタスク順が意図通りに更新される', async () => {
    const store = new JsonDataStore({ rootDir: tempRoot });
    const first = await store.createTask({
      title: 'First',
      description: 'A',
      status: 'todo',
      dueDate: null,
      tags: []
    });
    const second = await store.createTask({
      title: 'Second',
      description: 'B',
      status: 'todo',
      dueDate: null,
      tags: []
    });
    const third = await store.createTask({
      title: 'Third',
      description: 'C',
      status: 'todo',
      dueDate: null,
      tags: []
    });

    const reordered = await store.reorderTasks([third.id, first.id]);

    expect(() => TaskListSchema.parse(reordered)).not.toThrow();
    expect(reordered.map((task) => task.id)).toEqual([third.id, first.id, second.id]);
    expect(reordered.map((task) => task.order)).toEqual([0, 1, 2]);

    const persisted = await store.listTasks();
    expect(() => TaskListSchema.parse(persisted)).not.toThrow();
    expect(persisted.map((task) => task.id)).toEqual([third.id, first.id, second.id]);
  });
});
