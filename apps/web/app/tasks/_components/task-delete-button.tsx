'use client';

import React, { useState, useTransition } from 'react';
import { deleteTaskAction } from '../actions';
import { useTaskNotifications } from './task-notification-provider';

interface TaskDeleteButtonProps {
  taskId: string;
  taskTitle: string;
}

export function TaskDeleteButton({ taskId, taskTitle }: TaskDeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { notify } = useTaskNotifications();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTaskAction(taskId);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
        notify({
          type: 'error',
          title: 'タスクの削除に失敗しました',
          description: result.error
        });
      } else {
        setError(null);
        setConfirming(false);
        notify({
          type: 'success',
          title: 'タスクを削除しました',
          description: taskTitle
        });
      }
    });
  };

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="task-delete-confirm">
        <span className="text-[color:var(--color-text-muted)]">{taskTitle} を削除しますか？</span>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          キャンセル
        </button>
        <button type="button" className="btn-primary" onClick={handleDelete} disabled={isPending}>
          {isPending ? '削除中…' : '削除する'}
        </button>
        {error ? <span className="text-[color:var(--color-error)]">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1 text-xs" data-testid="task-delete-entry">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
      >
        削除
      </button>
      {error ? <span className="text-[color:var(--color-error)]">{error}</span> : null}
    </div>
  );
}
