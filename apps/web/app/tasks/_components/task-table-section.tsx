'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Task, TaskStatus } from '@shared/api';
import { TaskBulkBar } from './task-bulk-bar';
import { TaskReorderList } from './task-reorder-list';
import { TaskDetailPane } from './task-detail-pane';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';
import type { TaskSortState } from './task-command-bar';

interface TaskTableSectionProps {
  tasks: Task[];
  totalCount: number;
  filteredCount: number;
  hasActiveFilters: boolean;
  sortState: TaskSortState;
  availableTags?: string[];
}

export function TaskTableSection({
  tasks,
  totalCount,
  filteredCount,
  hasActiveFilters,
  sortState,
  availableTags = []
}: TaskTableSectionProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clearSignal, setClearSignal] = useState(0);
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  const [showDetail, setShowDetail] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkbox = headerCheckboxRef.current;
    if (!checkbox) return;
    if (selectedIds.length === 0) {
      checkbox.indeterminate = false;
      checkbox.checked = false;
    } else if (selectedIds.length === tasks.length) {
      checkbox.indeterminate = false;
      checkbox.checked = true;
    } else {
      checkbox.indeterminate = true;
    }
  }, [selectedIds, tasks.length]);

  const selectedTask = useMemo(() => tasks.find((t) => selectedIds.includes(t.id)), [selectedIds, tasks]);

  useKeyboardShortcuts({
    onSearchFocus: () => document.getElementById('task-search-input')?.focus(),
    onCommandPalette: () => document.getElementById('task-search-input')?.focus(),
    onNewTask: () => document.getElementById('task-quick-add-title')?.focus(),
    onToggleDetail: () => setShowDetail((v) => !v),
    onFocusList: () => {
      const list = document.querySelector('[data-testid="task-list"]');
      const first = list?.querySelector<HTMLElement>('[role="listitem"]');
      if (first) {
        first.focus();
      }
    },
    onCycleStatus: () => {
      const list = document.querySelector('[data-testid="task-list"]');
      const active = list?.querySelector<HTMLElement>('[data-focused="true"]');
      active?.dispatchEvent(new CustomEvent('task-cycle-status-trigger', { bubbles: true }));
    },
    onDelete: () => setSelectedIds((ids) => ids), // BulkBar handles delete via Del; keep selection
    onClearSelection: () => {
      setSelectedIds([]);
      setClearSignal((n) => n + 1);
    },
    onToggleDone: () => {
      // simple toggle: set status to done for selected tasks (not implemented here to avoid API fan-out)
    },
    onStatusDirect: (idx) => {
      // map 1..3 to todo/in_progress/done
      const map: TaskStatus[] = ['todo', 'in_progress', 'done'];
      const status = map[idx] ?? 'todo';
      // not applying bulk update here (would need server action); reserved for future
    }
  });

  const gridTemplateColumns =
    showDetail && selectedTask ? 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' : 'minmax(0, 1fr)';

  const applySort = (key: TaskSortState['key']) => {
    const nextDirection: TaskSortState['direction'] =
      sortState.key === key ? (sortState.direction === 'desc' ? 'asc' : 'desc') : key === 'order' ? 'asc' : 'asc';
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('sort', `${key}:${nextDirection}`);
    const next = params.toString();
    const url = next ? `${pathname}?${next}` : pathname;
    router.replace(url as Parameters<typeof router.replace>[0], { scroll: false });
  };

  const headerSortProps = (key: TaskSortState['key']) => ({
    'aria-sort': (sortState.key === key
      ? sortState.direction === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none') as React.AriaAttributes['aria-sort']
  });

  return (
    <div className="responsive-pane-grid" style={{ gridTemplateColumns }}>
      <div className="space-y-3" style={{ gridColumn: '1 / span 1', width: '100%' }}>
        <TaskBulkBar
          selectedIds={selectedIds}
          onClear={() => {
            setClearSignal((n) => n + 1);
            setSelectedIds([]);
          }}
          onDeleted={() => {
            setClearSignal((n) => n + 1);
            setSelectedIds([]);
          }}
        />

        <div className="overflow-x-auto rounded-xl border border-[color:var(--color-divider)] bg-white shadow-sm">
          <div className="min-w-[780px]" role="table" aria-label="タスク一覧テーブル">
            <div className="task-table-sticky-area">
              <div className="task-table-header shadow-sm" role="row" data-testid="task-table-header">
                <div className="flex items-center" role="columnheader">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--color-primary)]"
                    aria-label="すべて選択"
                    onChange={(e) => {
                      if (e.target.checked) {
                        const all = tasks.map((t) => t.id);
                        setSelectedIds(all);
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)]"
                  onClick={() => applySort('title')}
                  role="columnheader"
                  {...headerSortProps('title')}
                  aria-label="タイトルでソート"
                >
                  タイトル
                  <span aria-hidden className="text-[10px]">{sortState.key === 'title' ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)]"
                  onClick={() => applySort('status')}
                  role="columnheader"
                  {...headerSortProps('status')}
                  aria-label="ステータスでソート"
                >
                  ステータス
                  <span aria-hidden className="text-[10px]">
                    {sortState.key === 'status' ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕'}
                  </span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)]"
                  onClick={() => applySort('dueDate')}
                  role="columnheader"
                  {...headerSortProps('dueDate')}
                  aria-label="期限でソート"
                >
                  期限
                  <span aria-hidden className="text-[10px]">{sortState.key === 'dueDate' ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
                <div
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-muted)]"
                  role="columnheader"
                  aria-sort="none"
                >
                  タグ
                </div>
                <button
                  type="button"
                  className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-muted)] transition hover:text-[color:var(--color-text)]"
                  onClick={() => applySort('updatedAt')}
                  role="columnheader"
                  {...headerSortProps('updatedAt')}
                  aria-label="更新日時でソート"
                >
                  更新
                  <span aria-hidden className="text-[10px]">{sortState.key === 'updatedAt' ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                </button>
              </div>
            </div>

            <TaskReorderList
              tasks={tasks}
              onSelectionChange={setSelectedIds}
              clearSelectionSignal={clearSignal}
              selectedIds={selectedIds}
              availableTags={availableTags}
              onKeyboardReorder={() => setShowDetail(false)}
            />
          </div>
        </div>
      </div>

      {showDetail && selectedTask ? (
        <div
          className="sticky top-[calc(var(--command-bar-height)+16px)] self-start"
          style={{ gridColumn: '2', gridRow: '1 / span 2' }}
        >
          <TaskDetailPane
            task={selectedTask}
            availableTags={availableTags}
            onClose={() => setShowDetail(false)}
            onDeleted={(id) => {
              setSelectedIds((ids) => ids.filter((x) => x !== id));
              setClearSignal((n) => n + 1);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
