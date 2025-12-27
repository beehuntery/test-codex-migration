import Link from 'next/link';

import { getTasks, getTags } from '../../lib/api';
import { TaskStatusSchema } from '@shared/api';
import { TaskQuickAdd } from './_components/task-quick-add';
import { STATUS_LABELS } from './_components/status-badge';
import { TaskNotificationProvider } from './_components/task-notification-provider';
import { TaskCommandBar, type TaskSortState } from './_components/task-command-bar';
import { TaskTableSection } from './_components/task-table-section';
import {
  matchesDateRange,
  matchesSearch,
  normalizeDateRange,
  parseDateInput,
  parseFilterStatuses,
  parseFilterTags,
  parseSearchQuery
} from './_lib/filter-utils';

export const metadata = {
  title: 'Tasks (Next.js)',
  description: 'SSR placeholder for task list to be implemented in Phase 3.'
};

type TasksPageSearchParams = {
  tags?: string | string[];
  statuses?: string | string[];
  search?: string | string[];
  dueFrom?: string | string[];
  dueTo?: string | string[];
  createdFrom?: string | string[];
  createdTo?: string | string[];
  updatedFrom?: string | string[];
  updatedTo?: string | string[];
  sort?: string | string[];
};

type TasksPageProps = {
  searchParams?: Promise<TasksPageSearchParams>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const [tasks, tags] = await Promise.all([
    getTasks().catch(() => []),
    getTags().catch(() => [])
  ]);

  const availableTags = Array.from(new Set(tags));
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedTags = parseFilterTags(resolvedSearchParams?.tags);
  const activeFilterTags = requestedTags.filter((tag) => availableTags.includes(tag));
  const requestedStatuses = parseFilterStatuses(resolvedSearchParams?.statuses);
  const statusOptions = TaskStatusSchema.options;
  const activeStatuses = requestedStatuses.filter((status): status is (typeof statusOptions)[number] =>
    statusOptions.includes(status as (typeof statusOptions)[number])
  );

  const searchQuery = parseSearchQuery(resolvedSearchParams?.search);
  const dueFrom = parseDateInput(resolvedSearchParams?.dueFrom);
  const dueTo = parseDateInput(resolvedSearchParams?.dueTo);
  const { from: normalizedDueFrom, to: normalizedDueTo } = normalizeDateRange(dueFrom, dueTo);
  const createdFrom = parseDateInput(resolvedSearchParams?.createdFrom);
  const createdTo = parseDateInput(resolvedSearchParams?.createdTo);
  const { from: normalizedCreatedFrom, to: normalizedCreatedTo } = normalizeDateRange(createdFrom, createdTo);
  const updatedFrom = parseDateInput(resolvedSearchParams?.updatedFrom);
  const updatedTo = parseDateInput(resolvedSearchParams?.updatedTo);
  const { from: normalizedUpdatedFrom, to: normalizedUpdatedTo } = normalizeDateRange(updatedFrom, updatedTo);

  const sortState: TaskSortState = (() => {
    const raw = Array.isArray(resolvedSearchParams?.sort)
      ? resolvedSearchParams?.sort[0]
      : resolvedSearchParams?.sort ?? '';
    const [keyRaw, dirRaw] = (raw || '').split(':');
    const key: TaskSortState['key'] =
      keyRaw === 'dueDate'
        ? 'dueDate'
        : keyRaw === 'title'
        ? 'title'
        : keyRaw === 'updatedAt'
        ? 'updatedAt'
        : keyRaw === 'status'
        ? 'status'
        : 'order';
    const direction: TaskSortState['direction'] = dirRaw === 'asc' || key === 'order' ? 'asc' : 'desc';
    return { key, direction };
  })();

  let filteredTasks = tasks;

  if (searchQuery) {
    filteredTasks = filteredTasks.filter((task) => matchesSearch(task, searchQuery));
  }

  if (activeFilterTags.length) {
    filteredTasks = filteredTasks.filter((task) => activeFilterTags.every((tag) => task.tags.includes(tag)));
  }

  if (activeStatuses.length) {
    const statusSet = new Set(activeStatuses);
    filteredTasks = filteredTasks.filter((task) => statusSet.has(task.status));
  }

  if (normalizedDueFrom || normalizedDueTo) {
    filteredTasks = filteredTasks.filter((task) => matchesDateRange(task.dueDate, normalizedDueFrom, normalizedDueTo));
  }

  if (normalizedCreatedFrom || normalizedCreatedTo) {
    filteredTasks = filteredTasks.filter((task) =>
      matchesDateRange(task.createdAt, normalizedCreatedFrom, normalizedCreatedTo)
    );
  }

  if (normalizedUpdatedFrom || normalizedUpdatedTo) {
    filteredTasks = filteredTasks.filter((task) =>
      matchesDateRange(task.updatedAt, normalizedUpdatedFrom, normalizedUpdatedTo)
    );
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const dir = sortState.direction === 'desc' ? -1 : 1;

    // 1) 手動順が指定されている場合は order のみで並べる
    if (sortState.key === 'order') {
      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      return ao === bo ? 0 : ao > bo ? dir : -dir;
    }

    // 2) 選択されたキーで並べ、同値時だけ order で安定化
    const orderFallback = () => {
      const ao = a.order ?? 0;
      const bo = b.order ?? 0;
      return ao === bo ? 0 : ao > bo ? 1 : -1;
    };

    if (sortState.key === 'status') {
      const order = ['todo', 'in_progress', 'waiting', 'pending', 'done'] as const;
      const idx = (s: string | undefined) => {
        const i = order.indexOf((s ?? '') as (typeof order)[number]);
        return i === -1 ? order.length : i;
      };
      const av = idx(a.status);
      const bv = idx(b.status);
      if (av === bv) return orderFallback();
      return av > bv ? dir : -dir;
    }

    if (sortState.key === 'updatedAt') {
      const av = a.updatedAt ?? '';
      const bv = b.updatedAt ?? '';
      if (av === bv) return orderFallback();
      return av > bv ? dir : -dir;
    }

    if (sortState.key === 'dueDate') {
      const av = a.dueDate ?? '';
      const bv = b.dueDate ?? '';
      if (av === bv) return orderFallback();
      return av > bv ? dir : -dir;
    }

    if (sortState.key === 'title') {
      const av = a.title.toLowerCase();
      const bv = b.title.toLowerCase();
      if (av === bv) return orderFallback();
      return av > bv ? dir : -dir;
    }

    return orderFallback();
  });

  const totalCount = tasks.length;
  const filteredCount = sortedTasks.length;
  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(normalizedDueFrom) ||
    Boolean(normalizedDueTo) ||
    Boolean(normalizedCreatedFrom) ||
    Boolean(normalizedCreatedTo) ||
    Boolean(normalizedUpdatedFrom) ||
    Boolean(normalizedUpdatedTo) ||
    activeFilterTags.length > 0 ||
    activeStatuses.length > 0;

  const isEmpty = filteredCount === 0;

  return (
    <TaskNotificationProvider>
      <TaskCommandBar searchQuery={searchQuery} activeStatuses={activeStatuses} />
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
        <div className="card-surface space-y-6 p-8 text-[color:var(--color-text-muted)]">
          <TaskQuickAdd availableTags={availableTags} />
          <p className="text-xs text-[color:var(--color-text-muted)]" id="reorder-help">
            並び替え: ドラッグ &amp; ドロップ / <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">Alt</kbd>+
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">↑/↓</kbd> / <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">Ctrl</kbd>+
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">J/K</kbd>（選択またはフォーカス範囲をまとめて移動）。 フォーカス範囲拡大:
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">Shift</kbd>+
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">J/K</kbd>。 リストへ移動:
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">L</kbd>、ステータス巡回:
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">S</kbd>、検索:
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">/</kbd>。
          </p>

          <div aria-describedby="reorder-help">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-semibold text-[color:var(--color-text)]">
                タスク一覧（{filteredCount} 件{hasActiveFilters ? ` / 全 ${totalCount} 件` : ''}）
              </p>
              <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                データソース: Next API
              </span>
            </div>

            {isEmpty ? (
              <div className="space-y-4 rounded-xl border border-dashed border-[rgba(107,102,95,0.25)] bg-white/70 px-4 py-6 text-center text-sm">
                <p className="text-[color:var(--color-text)]">
                  {totalCount === 0
                    ? 'まだタスクがありません。まずは1件追加してみましょう。'
                    : '条件に一致するタスクがありません。フィルターを見直すか新しいタスクを作成してください。'}
                </p>
                <div className="flex justify-center">
                  <Link href="/tasks" className="btn-primary text-xs">
                    タスクを追加する
                  </Link>
                </div>
                {totalCount === 0 ? (
                  <div className="grid gap-2 md:grid-cols-2" aria-hidden="true">
                    {[...Array(4)].map((_, idx) => (
                      <div
                        key={`skeleton-${idx}`}
                        className="animate-pulse rounded-xl border border-[rgba(107,102,95,0.12)] bg-[color:var(--color-surface-muted)]/70 px-4 py-3 text-left"
                      >
                        <div className="mb-2 h-3 w-24 rounded-full bg-[rgba(0,0,0,0.08)]" />
                        <div className="mb-1 h-2 w-32 rounded-full bg-[rgba(0,0,0,0.06)]" />
                        <div className="h-2 w-20 rounded-full bg-[rgba(0,0,0,0.06)]" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <TaskTableSection
                tasks={sortedTasks}
                totalCount={totalCount}
                filteredCount={filteredCount}
                hasActiveFilters={hasActiveFilters}
                sortState={sortState}
                availableTags={availableTags}
              />
            )}
          </div>

        </div>
        <Link href="/" className="btn-secondary w-fit">
          トップへ戻る
        </Link>
      </section>
    </TaskNotificationProvider>
  );
}
