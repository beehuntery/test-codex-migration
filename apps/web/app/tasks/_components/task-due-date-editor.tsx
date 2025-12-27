'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { updateTaskDueDateAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';

function normalizeInput(value: string): string {
  return value.trim();
}

function formatDisplay(value: string | null) {
  if (!value) {
    return '期限なし';
  }
  try {
    return new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

export function TaskDueDateEditor({ taskId, dueDate }: { taskId: string; dueDate: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [stableDueDate, setStableDueDate] = useState(dueDate);
  const [optimisticDueDate, setOptimisticDueDate] = useOptimistic(stableDueDate, (_, next: string | null) => next);
  const [inputValue, setInputValue] = useState(dueDate ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { notify } = useTaskNotifications();

  const syncOptimistic = (nextValue: string | null) => {
    startTransition(() => {
      setOptimisticDueDate(nextValue);
    });
  };

  const commitDueDate = (rawValue: string) => {
    const normalized = normalizeInput(rawValue);
    const nextValue = normalized ? normalized : null;

    syncOptimistic(nextValue);
    void (async () => {
      try {
        await updateTaskDueDateAction(taskId, nextValue);
        setStableDueDate(nextValue);
        setError(null);
        notify({
          type: 'success',
          title: '期限を更新しました',
          description: nextValue ? formatDisplay(nextValue) : '期限なし'
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '期限の更新に失敗しました。');
        syncOptimistic(stableDueDate);
        setInputValue(stableDueDate ?? '');
        notify({
          type: 'error',
          title: '期限の更新に失敗しました',
          description: err instanceof Error ? err.message : undefined
        });
      }
    })();
  };

  const formattedLabel = (() => {
    if (!optimisticDueDate) return '—';
    try {
      const d = new Date(optimisticDueDate);
      const mm = `${d.getMonth() + 1}`.padStart(2, '0');
      const dd = `${d.getDate()}`.padStart(2, '0');
      return `${mm}/${dd}`;
    } catch {
      return '—';
    }
  })();

  return (
    <div className="flex items-center gap-2">
      {isEditing ? (
        <input
          type="date"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onBlur={() => {
            commitDueDate(inputValue);
            setIsEditing(false);
          }}
          autoFocus
          disabled={isPending}
          className="w-full rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-2 py-1 text-sm text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
          aria-label="期限を編集"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`w-full rounded-lg px-2 py-1 text-sm text-left transition hover:bg-[color:var(--color-surface-muted)] ${
            !optimisticDueDate ? 'text-[color:var(--color-disabled)]' : ''
          }`}
          title={formatDisplay(optimisticDueDate)}
        >
          {formattedLabel}
        </button>
      )}
      {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  );
}
