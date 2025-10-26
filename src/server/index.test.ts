import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Express } from 'express';
import {
  ErrorResponseSchema,
  TagListSchema,
  TaskListSchema,
  TaskSchema
} from './types';

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  DATA_STORE: process.env.DATA_STORE,
  JSON_DATA_ROOT: process.env.JSON_DATA_ROOT
};

describe('タスク API のスキーマ遵守', () => {
  let tempRoot: string;
  let app: Express;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(os.tmpdir(), 'task-api-'));
    process.env.NODE_ENV = 'test';
    process.env.DATA_STORE = 'json';
    process.env.JSON_DATA_ROOT = tempRoot;
    vi.resetModules();
    const serverModule = await import('./index');
    app = serverModule.app;
  });

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true });
    delete process.env.JSON_DATA_ROOT;
    delete process.env.DATA_STORE;
    if (ORIGINAL_ENV.NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = ORIGINAL_ENV.NODE_ENV;
    }
    if (ORIGINAL_ENV.DATA_STORE === undefined) {
      delete process.env.DATA_STORE;
    } else {
      process.env.DATA_STORE = ORIGINAL_ENV.DATA_STORE;
    }
    if (ORIGINAL_ENV.JSON_DATA_ROOT === undefined) {
      delete process.env.JSON_DATA_ROOT;
    } else {
      process.env.JSON_DATA_ROOT = ORIGINAL_ENV.JSON_DATA_ROOT;
    }
    vi.resetModules();
  });

  it('共有スキーマに沿ったタスクを作成し取得できる', async () => {
    const createResponse = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send({
        title: 'Schema backed task',
        description: 'Ensure responses follow zod definitions',
        tags: ['schema']
      })
      .expect(201);

    expect(() => TaskSchema.parse(createResponse.body)).not.toThrow();

    const listResponse = await request(app).get('/api/tasks').expect(200);
    const parsed = TaskListSchema.safeParse(listResponse.body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    expect(parsed.data.some((task) => task.title === 'Schema backed task')).toBe(true);
  });

  it('タグ API が共有スキーマに従って検証される', async () => {
    const createResponse = await request(app)
      .post('/api/tags')
      .set('Content-Type', 'application/json')
      .send({ name: 'analytics' })
      .expect(201);

    expect(createResponse.body).toHaveProperty('tags');
    expect(() => TagListSchema.parse(createResponse.body.tags)).not.toThrow();

    const listResponse = await request(app).get('/api/tags').expect(200);
    expect(() => TagListSchema.parse(listResponse.body)).not.toThrow();

    const errorResponse = await request(app)
      .post('/api/tags')
      .set('Content-Type', 'application/json')
      .send({ name: '' })
      .expect(400);

    expect(() => ErrorResponseSchema.parse(errorResponse.body)).not.toThrow();
  });
});
