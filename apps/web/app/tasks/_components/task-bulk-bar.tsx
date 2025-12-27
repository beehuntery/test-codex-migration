'use client';

import React, { useEffect } from 'react';
import { deleteTasksAction } from '../actions-bulk';
import { useTaskNotifications } from './task-notification-provider';

interface TaskBulkBarProps {
  selectedIds: string[];
  onClear: () => void;
  onDeleted?: (deletedIds: string[]) => void;
}

export function TaskBulkBar({ selectedIds, onClear, onDeleted }: TaskBulkBarProps) {
  const { notify } = useTaskNotifications();
  const hasSelection = selectedIds.length > 0;

  const handleDelete = async () => {
    if (!selectedIds.length) return;
    const result = await deleteTasksAction(selectedIds);
    if (result?.error) {
      notify({ type: 'error', title: '削除に失敗しました', description: result.error });
      return;
    }
    notify({
      type: 'success',
      title: `${selectedIds.length}件のタスクを削除しました`,
      description: 'Ctrl/Cmd+Z で元に戻せます'
    });
    onDeleted?.(selectedIds);
    onClear();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!hasSelection) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClear();
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        void handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasSelection, selectedIds.join(','), onClear]);

  if (!hasSelection) return null;

  return (
    <div className="task-table-sticky-area mt-2 rounded-xl border border-[color:var(--color-divider)] bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--color-text)]">
        <span className="font-semibold">{selectedIds.length} 件選択中</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="btn-primary px-3 py-2 text-xs"
            aria-label="選択したタスクを削除"
          >
            削除 Del
          </button>
          <button
            type="button"
            onClick={onClear}
            className="btn-secondary px-3 py-2 text-xs"
            aria-label="選択解除"
          >
            選択解除 Esc
          </button>
        </div>
      </div>
    </div>
  );
}
