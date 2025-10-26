import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { PrismaDataStore } from './prismaStore';

describe('PrismaDataStore の監視とリトライ制御', () => {
  it('リトライ可能なエラーを再試行してメトリクスを記録する', async () => {
    const findMany = vi
      .fn<Parameters<PrismaClientType['task']['findMany']>, ReturnType<PrismaClientType['task']['findMany']>>()
      .mockRejectedValueOnce({ code: 'P1001', name: 'PrismaClientKnownRequestError' })
      .mockResolvedValueOnce([]);

    const prismaMock = {
      task: { findMany },
      tag: { findMany: vi.fn() },
      $transaction: vi.fn()
    } as unknown as PrismaClientType;

    const store = new PrismaDataStore(
      {
        maxRetries: 1,
        retryDelayMs: 0,
        slowQueryThresholdMs: 1000,
        logDiagnostics: false,
        retryWrites: false
      },
      prismaMock
    );

    const tasks = await store.listTasks();
    expect(tasks).toEqual([]);
    expect(findMany).toHaveBeenCalledTimes(2);

    const metrics = store.getRuntimeMetrics();
    expect(metrics.retryCount).toBe(1);
    expect(metrics.lastRetry?.operation).toBe('listTasks');
  });

  it('設定した閾値を超える低速クエリを記録する', async () => {
    const findMany = vi
      .fn<Parameters<PrismaClientType['task']['findMany']>, ReturnType<PrismaClientType['task']['findMany']>>()
      .mockResolvedValue([]);

    const prismaMock = {
      task: { findMany },
      tag: { findMany: vi.fn() },
      $transaction: vi.fn()
    } as unknown as PrismaClientType;

    const store = new PrismaDataStore(
      {
        maxRetries: 0,
        retryDelayMs: 0,
        slowQueryThresholdMs: 5,
        logDiagnostics: false,
        retryWrites: false
      },
      prismaMock
    );

    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockImplementationOnce(() => 0);
    dateNow.mockImplementationOnce(() => 12);

    await store.listTasks();

    const metrics = store.getRuntimeMetrics();
    expect(metrics.slowQueryCount).toBe(1);
    expect(metrics.lastSlowQuery?.durationMs).toBe(12);
    expect(metrics.lastSlowQuery?.operation).toBe('listTasks');

    dateNow.mockRestore();
  });
});
