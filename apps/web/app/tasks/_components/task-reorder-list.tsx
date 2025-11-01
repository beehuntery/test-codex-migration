'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Task } from '@shared/api';
import { reorderTasksAction } from '../actions';
import { TaskCard } from './task-card';
import { TaskInlineEditor } from './task-inline-editor';
import { TaskDescriptionEditor } from './task-description-editor';
import { TaskStatusForm } from './task-status-form';
import { TaskStatusToggle } from './task-status-toggle';
import { TaskDueDateEditor } from './task-due-date-editor';
import { TaskTagEditor } from './task-tag-editor';
import { TaskDeleteButton } from './task-delete-button';
import { subscribeTaskCompleted } from '../_lib/task-events';

interface TaskReorderListProps {
  tasks: Task[];
}

function moveTask(list: Task[], activeId: string, targetId: string, placeBefore: boolean): Task[] {
  if (activeId === targetId) {
    return list;
  }

  const activeTask = list.find((task) => task.id === activeId);
  if (!activeTask) {
    return list;
  }

  const withoutActive = list.filter((task) => task.id !== activeId);
  const targetIndex = withoutActive.findIndex((task) => task.id === targetId);

  if (targetIndex === -1) {
    return list;
  }

  const insertIndex = placeBefore ? targetIndex : targetIndex + 1;
  const boundedIndex = Math.max(0, Math.min(insertIndex, withoutActive.length));
  const next = [...withoutActive];
  next.splice(boundedIndex, 0, activeTask);
  return next;
}

function ordersAreEqual(a: Task[], b: Task[]) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) {
      return false;
    }
  }
  return true;
}

export function TaskReorderList({ tasks }: TaskReorderListProps) {
  const [orderedTasks, setOrderedTasks] = useState(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [focusAfterOrder, setFocusAfterOrder] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const celebrationTimersRef = useRef<Map<string, number>>(new Map());
  const [celebratingIds, setCelebratingIds] = useState<Set<string>>(new Set());
  const focusedTask = useMemo(() => orderedTasks.find((task) => task.id === focusedTaskId) ?? null, [focusedTaskId, orderedTasks]);

  const signature = useMemo(() => tasks.map((task) => `${task.id}:${task.updatedAt ?? ''}`).join('|'), [tasks]);

  useEffect(() => {
    setOrderedTasks(tasks);
  }, [signature, tasks]);

  useEffect(() => {
    if (focusedTaskId && !orderedTasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(null);
    }
  }, [focusedTaskId, orderedTasks]);

  useEffect(() => {
    if (!focusAfterOrder) {
      return;
    }
    const focusTarget = itemRefs.current.get(focusAfterOrder);
    if (focusTarget) {
      focusTarget.focus();
      setFocusedTaskId(focusAfterOrder);
    }
    setFocusAfterOrder(null);
  }, [focusAfterOrder]);

  useEffect(() => {
    const unsubscribe = subscribeTaskCompleted((taskId) => {
      setCelebratingIds((current) => {
        const next = new Set(current);
        next.add(taskId);
        return next;
      });
      const existingTimer = celebrationTimersRef.current.get(taskId);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }
      const timer = window.setTimeout(() => {
        setCelebratingIds((current) => {
          if (!current.has(taskId)) {
            return current;
          }
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
        celebrationTimersRef.current.delete(taskId);
      }, 1600);
      celebrationTimersRef.current.set(taskId, timer);
    });
    return () => {
      unsubscribe();
      celebrationTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      celebrationTimersRef.current.clear();
    };
  }, []);

  const applyOrder = (nextOrder: Task[], persist: boolean) => {
    setOrderedTasks(nextOrder);
    if (!persist) {
      return;
    }

    const orderIds = nextOrder.map((task) => task.id);
    startTransition(async () => {
      const result = await reorderTasksAction(orderIds);
      if (result?.error) {
        console.error(result.error);
        setOrderedTasks(tasks);
      }
    });
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggingId(taskId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, overTaskId: string) => {
    if (!draggingId) {
      return;
    }
    event.preventDefault();
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const pointerY = event.clientY;
    const placeBefore = pointerY < top + height / 2;
    setOrderedTasks((current) => {
      const next = moveTask(current, draggingId, overTaskId, placeBefore);
      return ordersAreEqual(current, next) ? current : next;
    });
  };

  const handleDragEnd = () => {
    if (!draggingId) {
      return;
    }

    setDraggingId(null);

    if (ordersAreEqual(orderedTasks, tasks)) {
      return;
    }

    applyOrder([...orderedTasks], true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, taskId: string) => {
    if (!(event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown'))) {
      return;
    }

    event.preventDefault();

    const delta = event.key === 'ArrowUp' ? -1 : 1;
    const currentIndex = orderedTasks.findIndex((task) => task.id === taskId);
    const nextIndex = currentIndex + delta;

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= orderedTasks.length) {
      return;
    }

    const nextOrder = [...orderedTasks];
    const [movedTask] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(nextIndex, 0, movedTask);

    applyOrder(nextOrder, true);
    setFocusAfterOrder(taskId);
  };

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="text-xs text-[color:var(--color-text-muted)]" data-testid="focused-task-indicator">
        {focusedTask ? `フォーカス中: ${focusedTask.title}` : 'フォーカス中のタスクはありません'}
      </p>
      <div className="flex flex-col gap-4" data-dragging={Boolean(draggingId)} role="list">
        {orderedTasks.map((task) => {
        const isDragging = draggingId === task.id;
        const isFocused = focusedTaskId === task.id;
        const isCelebrating = celebratingIds.has(task.id);
        return (
          <div
            key={task.id}
            data-task-id={task.id}
            draggable
            onDragStart={(event) => handleDragStart(event, task.id)}
            onDragOver={(event) => handleDragOver(event, task.id)}
            onDragEnd={handleDragEnd}
            onDrop={(event) => event.preventDefault()}
            onKeyDown={(event) => handleKeyDown(event, task.id)}
            onFocusCapture={() => setFocusedTaskId(task.id)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget as Node | null;
              if (nextTarget && event.currentTarget.contains(nextTarget)) {
                return;
              }
              if (focusedTaskId === task.id) {
                setFocusedTaskId(null);
              }
            }}
            ref={(node) => {
              if (node) {
                itemRefs.current.set(task.id, node);
              } else {
                itemRefs.current.delete(task.id);
              }
            }}
            className={`task-drag-surface cursor-grab transition-all duration-150 ease-out ${
              isDragging ? 'cursor-grabbing opacity-80 ring-2 ring-[color:var(--color-primary)]' : ''
            } ${isFocused ? 'ring-2 ring-[color:var(--color-accent)] shadow-lg outline-none' : ''} ${
              isPending ? 'opacity-80' : ''
            } ${isCelebrating ? 'animate-pulse ring-4 ring-[color:var(--color-success)]/70 bg-[color:var(--color-success)]/10' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/80`}
            aria-grabbed={isDragging}
            role="listitem"
            tabIndex={0}
            aria-label={`${task.title} の位置を変更`}
          >
            <TaskCard
              task={task}
              titleContent={<TaskInlineEditor taskId={task.id} title={task.title} />}
              descriptionContent={<TaskDescriptionEditor taskId={task.id} description={task.description} />}
              statusControls={<TaskStatusForm taskId={task.id} currentStatus={task.status} />}
              statusActions={<TaskStatusToggle taskId={task.id} status={task.status} />}
              dueDateContent={<TaskDueDateEditor taskId={task.id} dueDate={task.dueDate} />}
              tagContent={<TaskTagEditor taskId={task.id} initialTags={task.tags} />}
              deleteAction={<TaskDeleteButton taskId={task.id} taskTitle={task.title} />}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
