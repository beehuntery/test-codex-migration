'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { updateTaskTitleAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';

interface TaskInlineEditorProps {
  taskId: string;
  title: string;
  disabled?: boolean;
}

export function TaskInlineEditor({ taskId, title, disabled = false }: TaskInlineEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticTitle, setOptimisticTitle] = useOptimistic(title, (_, next: string) => next);
  const [inputValue, setInputValue] = useState(title);
  const { notify } = useTaskNotifications();

  const commitTitle = (nextTitle: string) => {
    setOptimisticTitle(nextTitle);
    startTransition(async () => {
      try {
        await updateTaskTitleAction(taskId, nextTitle);
        setError(null);
        const preview = nextTitle.length > 40 ? `${nextTitle.slice(0, 37)}…` : nextTitle;
        notify({
          type: 'success',
          title: 'タイトルを更新しました',
          description: preview
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'タイトルの更新に失敗しました。';
        setError(message);
        setOptimisticTitle(title);
        setInputValue(title);
        notify({
          type: 'error',
          title: 'タイトルの更新に失敗しました',
          description: message
        });
      }
    });
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === title) {
      setInputValue(title);
      return;
    }
    commitTitle(trimmed);
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={handleBlur}
        disabled={isPending || disabled}
        className="w-full rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-2.5 py-1 text-sm font-semibold text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${taskId}-title-error` : undefined}
        title={optimisticTitle}
        aria-label="タイトルを編集"
      />
      {error ? (
        <p id={`${taskId}-title-error`} className="text-xs text-[color:var(--color-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
