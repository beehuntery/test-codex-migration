'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { Task } from '@shared/api';
import { reorderTasksAction } from '../actions';
import { TaskStatusToggle } from './task-status-toggle';
import { TaskDueDateEditor } from './task-due-date-editor';
import { TaskTagEditor } from './task-tag-editor';
import { TaskDeleteButton } from './task-delete-button';
import { TaskInlineEditor } from './task-inline-editor';
import { TaskStatusForm } from './task-status-form';

function formatRelativeUpdated(value: string | null | undefined) {
  if (!value) return '—';
  const updated = new Date(value).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - updated);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDue(value: string | null | undefined) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${month}/${day}`;
  } catch (e) {
    return '—';
  }
}

function isOverdue(value: string | null | undefined) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(value);
  return due < today;
}
import { subscribeTaskCompleted } from '../_lib/task-events';

type PersistOrderResult = { success?: boolean; error?: string } | void;

interface TaskReorderListProps {
  tasks: Task[];
  persistOrder?: (order: string[]) => Promise<PersistOrderResult>;
  onSelectionChange?: (selectedIds: string[]) => void;
  clearSelectionSignal?: number;
  selectedIds?: string[];
  onKeyboardReorder?: () => void;
  availableTags?: string[];
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

function moveBlock(list: Task[], ids: string[], targetId: string, placeBefore: boolean): Task[] {
  const idsSet = new Set(ids);
  if (idsSet.has(targetId) || ids.length === 0) return list;

  const moving = list.filter((t) => idsSet.has(t.id));
  const remaining = list.filter((t) => !idsSet.has(t.id));

  const targetIndex = remaining.findIndex((t) => t.id === targetId);
  if (targetIndex === -1) return list;

  const insertIndex = placeBefore ? targetIndex : targetIndex + 1;
  const next = [...remaining];
  next.splice(insertIndex, 0, ...moving);
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

export function TaskReorderList({
  tasks,
  persistOrder = reorderTasksAction,
  onSelectionChange,
  clearSelectionSignal,
  selectedIds: controlledSelectedIds,
  onKeyboardReorder,
  availableTags = []
}: TaskReorderListProps) {
  const [orderedTasks, setOrderedTasks] = useState(tasks);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingGroup, setDraggingGroup] = useState<string[] | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [focusRangeIds, setFocusRangeIds] = useState<Set<string>>(new Set());
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const rangeAnchorRef = useRef<string | null>(null);
  const skipAnchorRef = useRef(false);
  const [focusRangeAfterOrder, setFocusRangeAfterOrder] = useState<Set<string> | null>(null);
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
    const next = controlledSelectedIds ? new Set(controlledSelectedIds) : internalSelected;
    onSelectionChange?.(Array.from(next));
  }, [controlledSelectedIds?.join(','), internalSelected, onSelectionChange]);

  useEffect(() => {
    if (focusedTaskId && !orderedTasks.some((task) => task.id === focusedTaskId)) {
      setFocusedTaskId(null);
    }
  }, [focusedTaskId, orderedTasks]);

  useEffect(() => {
    if (clearSelectionSignal === undefined) return;
    setInternalSelected(new Set());
  }, [clearSelectionSignal]);

  useEffect(() => {
    if (!controlledSelectedIds) return;
    setInternalSelected(new Set(controlledSelectedIds));
  }, [controlledSelectedIds?.join(',')]);

  const selectedIds = controlledSelectedIds ? new Set(controlledSelectedIds) : internalSelected;
  const setSelectedIds = (updater: (current: Set<string>) => Set<string>) => {
    const next = updater(controlledSelectedIds ? new Set(controlledSelectedIds) : internalSelected);
    if (!controlledSelectedIds) {
      setInternalSelected(next);
    }
    onSelectionChange?.(Array.from(next));
  };

  useEffect(() => {
    if (!focusAfterOrder) {
      return;
    }
    const focusTarget = itemRefs.current.get(focusAfterOrder);
    if (focusTarget) {
      focusTarget.focus();
      setFocusedTaskId(focusAfterOrder);
      if (focusRangeAfterOrder) {
        setFocusRangeIds(new Set(focusRangeAfterOrder));
      } else {
        setFocusRangeIds(new Set([focusAfterOrder]));
      }
      rangeAnchorRef.current = rangeAnchorRef.current ?? focusAfterOrder;
    }
    setFocusRangeAfterOrder(null);
    setFocusAfterOrder(null);
  }, [focusAfterOrder, focusRangeAfterOrder]);

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
      try {
        const result = await persistOrder(orderIds);
        if (result && typeof result === 'object' && 'error' in result && result.error) {
          console.error(result.error);
          setOrderedTasks(tasks);
        }
      } catch (error) {
        console.error(error);
        setOrderedTasks(tasks);
      }
    });
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggingId(taskId);
    if (selectedIds.has(taskId) && selectedIds.size > 1) {
      const group = orderedTasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id);
      setDraggingGroup(group);
    } else {
      setDraggingGroup(null);
    }
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
      const next = draggingGroup
        ? moveBlock(current, draggingGroup, overTaskId, placeBefore)
        : moveTask(current, draggingId, overTaskId, placeBefore);
      return ordersAreEqual(current, next) ? current : next;
    });
  };

  const handleDragEnd = () => {
    if (!draggingId) {
      return;
    }

    setDraggingId(null);
    setDraggingGroup(null);

    if (ordersAreEqual(orderedTasks, tasks)) {
      return;
    }

    applyOrder([...orderedTasks], true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, taskId: string) => {
    if (!(event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown'))) {
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        toggleSelection(taskId, event.ctrlKey || event.metaKey, event.shiftKey);
        return;
      }
      return; // other keys bubble to list handler
    }

    event.preventDefault();
    event.stopPropagation();

    const delta = event.key === 'ArrowUp' ? -1 : 1;
    onKeyboardReorder?.();
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

  const handleTaskRemoved = useCallback((removedId: string) => {
    setOrderedTasks((current) => current.filter((task) => task.id !== removedId));
    setFocusedTaskId((current) => (current === removedId ? null : current));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(removedId);
      return next;
    });
  }, []);

  const toggleSelection = (taskId: string, allowMulti = false, allowRange = false) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allowRange && focusedTaskId) {
        const currentIndex = orderedTasks.findIndex((t) => t.id === focusedTaskId);
        const targetIndex = orderedTasks.findIndex((t) => t.id === taskId);
        if (currentIndex !== -1 && targetIndex !== -1) {
          const [start, end] = [currentIndex, targetIndex].sort((a, b) => a - b);
          for (let i = start; i <= end; i += 1) {
            next.add(orderedTasks[i].id);
          }
          return next;
        }
      }
      if (!allowMulti) {
        if (next.has(taskId) && next.size === 1) {
          return new Set();
        }
        return new Set([taskId]);
      }
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
    setFocusedTaskId(taskId);
  };

  const focusByIndex = (
    index: number,
    options: { preserveRange?: boolean; preserveAnchor?: boolean } = {}
  ) => {
    if (!orderedTasks.length) return;
    const clamped = Math.min(Math.max(index, 0), orderedTasks.length - 1);
    const nextId = orderedTasks[clamped]?.id;
    if (!nextId) return;
    const node = itemRefs.current.get(nextId);
    if (node) {
      node.focus();
      setFocusedTaskId(nextId);
      if (!options.preserveRange) {
        setFocusRangeIds(new Set([nextId]));
      }
      if (!options.preserveAnchor) {
        rangeAnchorRef.current = nextId;
      }
    }
  };

  const focusItemByDelta = (delta: number) => {
    if (!orderedTasks.length) return;
    const currentIndex = focusedTaskId ? orderedTasks.findIndex((t) => t.id === focusedTaskId) : -1;
    const nextIndex =
      currentIndex === -1 ? (delta > 0 ? 0 : orderedTasks.length - 1) : Math.min(Math.max(currentIndex + delta, 0), orderedTasks.length - 1);
    focusByIndex(nextIndex);
  };

  const reorderFocusedByDelta = (delta: number) => {
    if (!focusedTaskId) return;
    const focusRange = focusRangeIds.size > 1 ? Array.from(focusRangeIds) : [];
    const multiSelected = selectedIds.size > 1 && selectedIds.has(focusedTaskId);
    const sourceIds =
      focusRange.length > 1
        ? orderedTasks.filter((t) => focusRangeIds.has(t.id)).map((t) => t.id)
        : multiSelected
        ? orderedTasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id)
        : [focusedTaskId];

    const indices = sourceIds
      .map((id) => orderedTasks.findIndex((t) => t.id === id))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (!indices.length) return;

    const start = indices[0];
    const end = indices[indices.length - 1];
    const targetIndex = delta > 0 ? end + delta : start + delta;
    if (targetIndex < 0 || targetIndex >= orderedTasks.length) return;

    const targetId = orderedTasks[targetIndex]?.id;
    const placeBefore = delta < 0;
    const next = moveBlock(orderedTasks, sourceIds, targetId, placeBefore);
    setFocusRangeAfterOrder(new Set(focusRangeIds.size ? focusRangeIds : [focusedTaskId]));
    applyOrder(next, true);
    onKeyboardReorder?.();
    setFocusAfterOrder(focusedTaskId);
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.defaultPrevented) return;
    if (event.altKey || event.metaKey) return;

    const key = event.key.toLowerCase();

    if (event.ctrlKey) {
      if (key === 'j') {
        event.preventDefault();
        reorderFocusedByDelta(1);
        return;
      }
      if (key === 'k') {
        event.preventDefault();
        reorderFocusedByDelta(-1);
        return;
      }
      return;
    }
    if (event.key === 'ArrowDown' || key === 'j') {
      event.preventDefault();
      if (event.shiftKey) {
        const anchorId = rangeAnchorRef.current ?? focusedTaskId ?? orderedTasks[0]?.id;
        if (!anchorId) return;
        const anchorIdx = orderedTasks.findIndex((t) => t.id === anchorId);
        const currentIdx = focusedTaskId ? orderedTasks.findIndex((t) => t.id === focusedTaskId) : anchorIdx;
        const nextIdx = Math.min((currentIdx === -1 ? anchorIdx : currentIdx + 1), orderedTasks.length - 1);
        const [start, end] = [anchorIdx, nextIdx].sort((a, b) => a - b);
        setFocusRangeIds(() => {
          const n = new Set<string>();
          for (let i = start; i <= end; i += 1) n.add(orderedTasks[i].id);
          return n;
        });
        skipAnchorRef.current = true;
        focusByIndex(nextIdx, { preserveRange: true, preserveAnchor: true });
        skipAnchorRef.current = false;
      } else {
        focusItemByDelta(1);
      }
      return;
    }
    if (event.key === 'ArrowUp' || key === 'k') {
      event.preventDefault();
      if (event.shiftKey) {
        const anchorId = rangeAnchorRef.current ?? focusedTaskId ?? orderedTasks[0]?.id;
        if (!anchorId) return;
        const anchorIdx = orderedTasks.findIndex((t) => t.id === anchorId);
        const currentIdx = focusedTaskId ? orderedTasks.findIndex((t) => t.id === focusedTaskId) : anchorIdx;
        const nextIdx = Math.max(currentIdx - 1, 0);
        const [start, end] = [anchorIdx, nextIdx].sort((a, b) => a - b);
        setFocusRangeIds(() => {
          const n = new Set<string>();
          for (let i = start; i <= end; i += 1) n.add(orderedTasks[i].id);
          return n;
        });
        skipAnchorRef.current = true;
        focusByIndex(nextIdx, { preserveRange: true, preserveAnchor: true });
        skipAnchorRef.current = false;
      } else {
        focusItemByDelta(-1);
      }
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusItemByDelta(-9999);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusItemByDelta(9999);
    }

    if (event.key === 's' || event.key === 'S') {
      // ステータス遷移（フォーカス中のタスクのみ）
      event.preventDefault();
      if (focusedTask) {
        document.dispatchEvent(
          new CustomEvent('task-cycle-status', { detail: { taskId: focusedTask.id } })
        );
      }
    }
  };

  return (
    <div
      className="flex flex-col gap-2"
      role="list"
      data-testid="task-list"
      onKeyDown={handleListKeyDown}
      tabIndex={0}
      aria-label="タスクリスト（Tabでフォーカス後、上下キーで移動）"
      onFocus={(event) => {
        if (event.target === event.currentTarget && !focusedTaskId) {
          focusByIndex(0);
        }
      }}
    >
      <p aria-live="polite" className="text-xs text-[color:var(--color-text-muted)]" data-testid="focused-task-indicator">
        {focusedTask ? `フォーカス中: ${focusedTask.title}` : 'フォーカス中のタスクはありません'}
      </p>

      {orderedTasks.map((task) => {
        const isDragging = draggingId === task.id;
        const isFocused = focusedTaskId === task.id;
        const isCelebrating = celebratingIds.has(task.id);
        const isSelected = selectedIds.has(task.id);
        const isDone = task.status === 'done';
        const dueLabel = formatDue(task.dueDate);
        const overdue = isOverdue(task.dueDate);
        const updatedLabel = formatRelativeUpdated(task.updatedAt);

        return (
          <div
            key={task.id}
            data-task-id={task.id}
            data-task-title={task.title}
            draggable
            onDragStart={(event) => handleDragStart(event, task.id)}
            onDragOver={(event) => handleDragOver(event, task.id)}
            onDragEnd={handleDragEnd}
            onDrop={(event) => event.preventDefault()}
            onKeyDown={(event) => handleKeyDown(event, task.id)}
            onFocusCapture={() => {
              setFocusedTaskId(task.id);
              if (!skipAnchorRef.current) {
                rangeAnchorRef.current = task.id;
              }
            }}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget as Node | null;
              if (nextTarget && event.currentTarget.contains(nextTarget)) {
                return;
              }
              if (focusedTaskId === task.id) {
                setFocusedTaskId(null);
              }
            }}
            data-focused={isFocused ? 'true' : undefined}
            data-focus-range={focusRangeIds.has(task.id) ? 'true' : undefined}
            ref={(node) => {
              if (node) {
                itemRefs.current.set(task.id, node);
              } else {
                itemRefs.current.delete(task.id);
              }
            }}
            className={`task-table-row cursor-grab transition-all duration-150 ease-out ${
              isDragging ? 'cursor-grabbing opacity-80 ring-2 ring-[color:var(--color-primary)]' : ''
            } ${
              isFocused || focusRangeIds.has(task.id)
                ? 'ring-2 ring-[color:var(--color-accent)] shadow-lg outline-none bg-[color:var(--color-secondary)]/30'
                : ''
            } ${isSelected ? 'bg-[color:var(--color-secondary)]/35' : ''} ${isDone ? 'opacity-60' : ''} ${
              isPending ? 'opacity-80' : ''
            } ${
              isCelebrating ? 'animate-pulse ring-4 ring-[color:var(--color-success)]/70 bg-[color:var(--color-success)]/10' : ''
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]/80`}
            aria-grabbed={isDragging}
            role="listitem"
            tabIndex={0}
            aria-label={`${task.title} の位置を変更`}
            onClick={(event) => {
              const target = event.target as HTMLElement;
              // インライン編集要素上でのクリックは選択を抑制
              if (target.closest('input, textarea, select, button, [data-stop-selection]')) {
                return;
              }
              toggleSelection(task.id, event.ctrlKey || event.metaKey, event.shiftKey);
            }}
          >
            <div className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[color:var(--color-primary)]"
                checked={isSelected}
                aria-label={`${task.title} を選択`}
                onChange={() => {}}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleSelection(task.id, event.ctrlKey || event.metaKey, event.shiftKey);
                }}
              />
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <TaskInlineEditor taskId={task.id} title={task.title} />
            </div>

            <div className="flex items-center">
              <TaskStatusForm taskId={task.id} currentStatus={task.status} />
            </div>

            <div className={`flex items-center text-sm ${overdue ? 'text-[color:var(--color-error)] font-semibold' : ''}`}>
              <TaskDueDateEditor taskId={task.id} dueDate={task.dueDate} />
            </div>

            <div className="flex min-w-0 items-center text-xs text-[color:var(--color-text-muted)]" title={task.tags.join(' ')}>
              <div className="min-w-0 flex-1">
                <TaskTagEditor taskId={task.id} initialTags={task.tags} variant="compact" availableTags={availableTags} />
              </div>
            </div>

            <div className="flex items-center justify-end text-xs text-[color:var(--color-text-muted)]">
              {updatedLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}
