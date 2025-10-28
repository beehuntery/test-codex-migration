'use client';

import React, { useOptimistic, useTransition } from 'react';
import { type TaskStatus } from '@shared/api';
import { setTaskStatusAction } from '../actions';

const STATUS_FLOW: TaskStatus[] = ['todo', 'in_progress', 'done'];

function getNextStatus(current: TaskStatus): TaskStatus {
  const index = STATUS_FLOW.indexOf(current);
  if (index === -1) {
    return 'todo';
  }
  return STATUS_FLOW[(index + 1) % STATUS_FLOW.length];
}

export function TaskStatusToggle({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status, (_, next: TaskStatus) => next);

  const handleClick = () => {
    const nextStatus = getNextStatus(optimisticStatus);
    startTransition(() => {
      setOptimisticStatus(nextStatus);
    });
    void (async () => {
      try {
        await setTaskStatusAction(taskId, nextStatus);
      } catch (error) {
        // revert to current status if server action fails
        startTransition(() => {
          setOptimisticStatus(status);
        });
        console.error(error);
      }
    })();
  };

  const labelMap: Record<TaskStatus, string> = {
    todo: '未着手',
    in_progress: '進行中',
    done: '完了'
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="btn-secondary text-xs"
    >
      次の状態へ ({labelMap[optimisticStatus]})
    </button>
  );
}
