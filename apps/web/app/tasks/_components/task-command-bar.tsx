'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TaskStatusSchema, type TaskStatus } from '@shared/api';
import { STATUS_LABELS } from './status-badge';

export type TaskSortState = {
  key: 'order' | 'title' | 'status' | 'dueDate' | 'updatedAt';
  direction: 'asc' | 'desc';
};

export interface TaskCommandBarProps {
  searchQuery: string;
  activeStatuses: TaskStatus[];
}

const STATUS_ORDER: TaskStatus[] = TaskStatusSchema.options;

export function TaskCommandBar({ searchQuery, activeStatuses }: TaskCommandBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState(searchQuery);
  const [statusSet, setStatusSet] = useState<Set<TaskStatus>>(new Set(activeStatuses));

  useEffect(() => setQuery(searchQuery), [searchQuery]);
  useEffect(() => setStatusSet(new Set(activeStatuses)), [activeStatuses.join(',')]);

  // '/' で検索フォーカス
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const statusOptions = useMemo(
    () => STATUS_ORDER.map((status) => ({ status, label: STATUS_LABELS[status] ?? status })),
    []
  );

  const updateQueryParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    updater(params);
    const next = params.toString();
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    router.replace(nextUrl as Parameters<typeof router.replace>[0], { scroll: false });
  };

  const applySearch = () => {
    updateQueryParams((params) => {
      const trimmed = query.trim();
      if (trimmed) params.set('search', trimmed);
      else params.delete('search');
    });
  };

  const toggleStatus = (status: TaskStatus) => {
    const next = new Set(statusSet);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setStatusSet(next);
    updateQueryParams((params) => {
      if (next.size) {
        params.set('statuses', Array.from(next).join(','));
      } else {
        params.delete('statuses');
      }
    });
  };

  const commandHint = navigator.userAgent.includes('Mac') ? '⌘K' : 'Ctrl+K';

  return (
    <div
      className="sticky top-0 z-40 border-b border-[color:var(--color-divider)] bg-[color:var(--color-surface)]/90 backdrop-blur"
      style={{ minHeight: 'var(--command-bar-height)' }}
      role="banner"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-[color:var(--color-primary)]/90 text-white shadow-elevated flex items-center justify-center text-lg font-semibold">
            T
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-[color:var(--color-text)]">TODO Workspace</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">List · Command Bar</span>
          </div>
        </div>

        <form
          className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[color:var(--color-divider)] bg-white px-3 py-2 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch();
          }}
          role="search"
        >
          <input
            id="task-search-input"
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="/ 検索…"
            className="w-full border-none bg-transparent text-sm text-[color:var(--color-text)] outline-none focus:outline-none"
            aria-label="タスクを検索"
          />
          <button type="submit" className="btn-secondary px-3 py-1 text-xs">検索</button>
        </form>

        <div className="flex items-center gap-2 overflow-auto">
          {statusOptions.map(({ status, label }) => {
            const active = statusSet.has(status);
            const statusColor =
              status === 'done'
                ? 'var(--status-done)'
                : status === 'in_progress'
                ? 'var(--status-doing)'
                : 'var(--status-todo)';

            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStatus(status)}
                className={`badge-pill whitespace-nowrap border ${
                  active
                    ? 'border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/90 text-white'
                    : 'border-[color:var(--color-divider)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-text)] hover:border-[color:var(--color-primary)]'
                }`}
                aria-pressed={active}
                style={active ? undefined : { color: statusColor, borderColor: statusColor + '55' }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
