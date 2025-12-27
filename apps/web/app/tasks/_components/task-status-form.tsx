'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { TaskStatusSchema, type TaskStatus } from '@shared/api';
import { setTaskStatusAction } from '../actions';
import { STATUS_LABELS } from './status-badge';
import { useTaskNotifications } from './task-notification-provider';
import { emitTaskCompleted } from '../_lib/task-events';

const STATUS_OPTIONS = TaskStatusSchema.options;

export function TaskStatusForm({
  taskId,
  currentStatus
}: {
  taskId: string;
  currentStatus: (typeof STATUS_OPTIONS)[number];
}) {
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { notify } = useTaskNotifications();

  const updateStatus = useCallback(
    (next: TaskStatus) => {
    startTransition(async () => {
      setError(null);
      try {
        await setTaskStatusAction(taskId, next);
        notify({
          type: 'success',
          title: 'ステータスを更新しました',
          description: STATUS_LABELS[next] ?? next
        });
        if (next === 'done') {
          emitTaskCompleted(taskId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ステータスの更新に失敗しました。';
        setError(message);
        setSelectedStatus(currentStatus);
        notify({
          type: 'error',
          title: 'ステータスの更新に失敗しました',
          description: message
        });
      }
    });
    },
    [currentStatus, notify, startTransition, taskId]
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ taskId: string }>;
      if (custom.detail?.taskId !== taskId) return;
      const currentIndex = STATUS_OPTIONS.indexOf(selectedStatus);
      const next = STATUS_OPTIONS[(currentIndex + 1) % STATUS_OPTIONS.length] ?? selectedStatus;
      setSelectedStatus(next);
      updateStatus(next);
    };
    document.addEventListener('task-cycle-status', handler as EventListener);
    return () => document.removeEventListener('task-cycle-status', handler as EventListener);
  }, [selectedStatus, taskId, updateStatus]);

  return (
    <div className="flex items-center gap-2 min-h-[32px]">
      <select
        id={`status-${taskId}`}
        name="status"
        value={selectedStatus}
        onChange={(event) => {
          const next = event.target.value as TaskStatus;
          setSelectedStatus(next);
          updateStatus(next);
        }}
        disabled={isPending}
        className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-1 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
        aria-label="ステータス"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <span className="w-14 text-right text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
        {isPending ? '…更新中' : ''}
      </span>
      {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  );
}
