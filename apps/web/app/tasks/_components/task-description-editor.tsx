'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { updateTaskDescriptionAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';

interface TaskDescriptionEditorProps {
  taskId: string;
  description: string;
  placeholder?: string;
}

export function TaskDescriptionEditor({ taskId, description, placeholder }: TaskDescriptionEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [stableDescription, setStableDescription] = useState(description);
  const [optimisticDescription, setOptimisticDescription] = useOptimistic(stableDescription, (_, next: string) => next);
  const [inputValue, setInputValue] = useState(description);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useTaskNotifications();

  const syncOptimistic = (nextValue: string) => {
    startTransition(() => {
      setOptimisticDescription(nextValue);
    });
  };

  const handleCommit = (nextValue: string) => {
    syncOptimistic(nextValue);
    void (async () => {
      try {
        await updateTaskDescriptionAction(taskId, nextValue);
        setStableDescription(nextValue);
        setError(null);
        const descriptionPreview = nextValue
          ? nextValue.length > 40
            ? `${nextValue.slice(0, 37)}…`
            : nextValue
          : '説明なし';
        notify({
          type: 'success',
          title: '説明を更新しました',
          description: descriptionPreview
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '説明の更新に失敗しました。';
        setError(message);
        syncOptimistic(stableDescription);
        setInputValue(stableDescription);
        notify({
          type: 'error',
          title: '説明の更新に失敗しました',
          description: message
        });
      }
    })();
  };

  const handleBlur = () => {
    if (inputValue === stableDescription) {
      return;
    }
    handleCommit(inputValue);
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={handleBlur}
        disabled={isPending}
        placeholder={placeholder ?? '説明を入力してください'}
        className="min-h-[90px] w-full resize-vertical rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-2 text-sm leading-relaxed text-[color:var(--color-text)] focus:border-[color:var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)]/40"
        aria-invalid={Boolean(error)}
      />
      <span className="text-xs text-[color:var(--color-text-muted)]">
        {optimisticDescription ? optimisticDescription : '説明なし'}
      </span>
      {error ? <p className="text-xs text-[color:var(--color-error)]">{error}</p> : null}
    </div>
  );
}
