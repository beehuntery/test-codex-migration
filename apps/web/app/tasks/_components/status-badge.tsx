import React from 'react';
import { type TaskStatus } from '@shared/api';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  waiting: '待ち',
  pending: '保留',
  done: '完了'
};

const STATUS_META: Record<
  TaskStatus,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  todo: {
    label: STATUS_LABELS.todo,
    bg: 'bg-[color:var(--color-secondary)]/70',
    text: 'text-[color:var(--color-text)]'
  },
  in_progress: {
    label: STATUS_LABELS.in_progress,
    bg: 'bg-[color:var(--color-accent)]/70',
    text: 'text-[color:var(--color-text)]'
  },
  waiting: {
    label: STATUS_LABELS.waiting,
    bg: 'bg-[color:var(--color-warning)]/25',
    text: 'text-[color:var(--color-warning)]'
  },
  pending: {
    label: STATUS_LABELS.pending,
    bg: 'bg-[color:var(--color-disabled)]/25',
    text: 'text-[color:var(--color-text-muted)]'
  },
  done: {
    label: STATUS_LABELS.done,
    bg: 'bg-[color:var(--color-success)]/20',
    text: 'text-[color:var(--color-success)]'
  }
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.todo;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${meta.bg} ${meta.text}`}
      data-status-value={status}
      data-testid="status-badge"
    >
      {meta.label}
    </span>
  );
}
