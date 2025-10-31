'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TaskStatusSchema } from '@shared/api';
import { STATUS_LABELS } from './status-badge';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type TaskStatus = (typeof TaskStatusSchema.options)[number];

interface TaskStatusFilterControlsProps {
  selectedStatuses: TaskStatus[];
}

function normalizeStatuses(statuses: string[]): TaskStatus[] {
  const validStatuses = new Set(TaskStatusSchema.options);
  return statuses.filter((status): status is TaskStatus => validStatuses.has(status as TaskStatus));
}

export function TaskStatusFilterControls({ selectedStatuses }: TaskStatusFilterControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(new Set(selectedStatuses));

  useEffect(() => {
    setActiveStatuses(new Set(selectedStatuses));
  }, [selectedStatuses.join(',')]);

  const statusOptions = useMemo(() => TaskStatusSchema.options.map((status) => ({ status, label: STATUS_LABELS[status] })), []);

  const updateQuery = (nextStatuses: Set<TaskStatus>) => {
    const params = new URLSearchParams(searchParams);
    if (nextStatuses.size > 0) {
      params.set('statuses', Array.from(nextStatuses).join(','));
    } else {
      params.delete('statuses');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const toggleStatus = (status: TaskStatus) => {
    const next = new Set(activeStatuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    setActiveStatuses(next);
    updateQuery(next);
  };

  const clearSelection = () => {
    const empty = new Set<TaskStatus>();
    setActiveStatuses(empty);
    updateQuery(empty);
  };

  const activeCount = activeStatuses.size;
  const selectedList = normalizeStatuses(Array.from(activeStatuses));
  const currentLabel = selectedList.length
    ? selectedList
        .map((status) => STATUS_LABELS[status] ?? status)
        .join(', ')
    : 'すべてのステータス';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[rgba(107,102,95,0.16)] bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-[color:var(--color-text)]">ステータスで絞り込み</p>
          <span className="text-xs text-[color:var(--color-text-muted)]">{currentLabel}</span>
        </div>
        <button type="button" onClick={clearSelection} className="btn-secondary text-xs" disabled={activeCount === 0}>
          すべて解除
        </button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="ステータスで絞り込み">
        {statusOptions.map(({ status, label }) => {
          const isActive = activeStatuses.has(status);
          return (
            <button
              type="button"
              key={status}
              onClick={() => toggleStatus(status)}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition ${
                isActive
                  ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/90 text-white'
                  : 'border-[rgba(107,102,95,0.25)] bg-white text-[color:var(--color-text)] hover:border-[color:var(--color-primary)]'
              }`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[color:var(--color-text-muted)]">選択中: {activeCount} 件</p>
    </div>
  );
}

