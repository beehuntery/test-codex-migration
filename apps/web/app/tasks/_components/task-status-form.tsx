'use client';

import React, { useState, useTransition } from 'react';
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      setError(null);
      try {
        await setTaskStatusAction(taskId, selectedStatus);
        notify({
          type: 'success',
          title: 'ステータスを更新しました',
          description: STATUS_LABELS[selectedStatus] ?? selectedStatus
        });
        if (selectedStatus === 'done') {
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
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(107,102,95,0.15)] bg-white/90 px-3 py-2"
    >
      <label className="text-xs font-semibold text-[color:var(--color-text-muted)]" htmlFor={`status-${taskId}`}>
        ステータス更新
      </label>
      <select
        id={`status-${taskId}`}
        name="status"
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value as TaskStatus)}
        disabled={isPending}
        className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-1 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-secondary text-xs" disabled={isPending}>
        {isPending ? '更新中…' : '更新'}
      </button>
      {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
    </form>
  );
}
