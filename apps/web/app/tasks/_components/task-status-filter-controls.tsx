'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
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
  const listId = useId();

  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(new Set(selectedStatuses));
  const [isOpen, setIsOpen] = useState<boolean>(selectedStatuses.length > 0);

  useEffect(() => {
    setActiveStatuses(new Set(selectedStatuses));
    if (selectedStatuses.length) {
      setIsOpen(true);
    }
  }, [selectedStatuses.join(',')]);

  const statusOptions = useMemo(() => TaskStatusSchema.options.map((status) => ({ status, label: STATUS_LABELS[status] })), []);

  const updateQuery = (nextStatuses: Set<TaskStatus>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatuses.size > 0) {
      params.set('statuses', Array.from(nextStatuses).join(','));
    } else {
      params.delete('statuses');
    }
    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl as Parameters<typeof router.replace>[0], { scroll: false });
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
    <section
      className="flex flex-col gap-2 rounded-xl border border-[rgba(107,102,95,0.16)] bg-white/80 p-4"
      data-testid="status-filter-section"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-[color:var(--color-text)]">ステータスで絞り込み</p>
          <span className="text-xs text-[color:var(--color-text-muted)]">{currentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={clearSelection} className="btn-secondary text-xs" disabled={activeCount === 0}>
            すべて解除
          </button>
          <button
            type="button"
            className="rounded-lg border border-[rgba(107,102,95,0.25)] bg-white px-3 py-1 text-xs text-[color:var(--color-text)] transition hover:border-[color:var(--color-primary)]"
            aria-expanded={isOpen}
            aria-controls={listId}
            onClick={() => setIsOpen((prev) => !prev)}
            data-testid="status-filter-toggle"
          >
            {isOpen ? '閉じる' : '開く'}
          </button>
        </div>
      </header>
      <div
        id={listId}
        className={`flex flex-wrap gap-2 transition-[max-height,opacity] duration-200 ${
          isOpen ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0 pointer-events-none'
        }`}
        role="group"
        aria-label="ステータスで絞り込み"
        aria-hidden={!isOpen}
        data-testid="status-filter-options"
      >
        {isOpen
          ? statusOptions.map(({ status, label }) => {
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
            })
          : null}
      </div>
      <p className="text-xs text-[color:var(--color-text-muted)]">選択中: {activeCount} 件</p>
    </section>
  );
}
