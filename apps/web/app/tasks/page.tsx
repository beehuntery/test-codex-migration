import Link from 'next/link';

import { getTasks, getTags } from '../../lib/api';
import { TaskStatusSchema } from '@shared/api';
import { TaskCreateForm } from './_components/task-create-form';
import { TaskTagFilterControls } from './_components/task-tag-filter-controls';
import { TaskReorderList } from './_components/task-reorder-list';
import { TaskStatusFilterControls } from './_components/task-status-filter-controls';
import { TaskAdvancedFilterControls } from './_components/task-advanced-filter-controls';
import { STATUS_LABELS } from './_components/status-badge';
import { TaskNotificationProvider } from './_components/task-notification-provider';
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

  const totalCount = tasks.length;
  const filteredCount = filteredTasks.length;
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
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-[color:var(--color-text)]">タスク一覧</h1>
          <p className="max-w-2xl text-base text-[color:var(--color-text-muted)]">
            タスクの作成・絞り込み・並び替えができます。
          </p>
        </header>
        <div className="card-surface space-y-6 p-8 text-[color:var(--color-text-muted)]">
          <TaskCreateForm />
          <TaskTagFilterControls availableTags={availableTags} selectedTags={activeFilterTags} />
          <TaskStatusFilterControls selectedStatuses={activeStatuses} />
          <TaskAdvancedFilterControls
            initialQuery={searchQuery}
            initialDueFrom={normalizedDueFrom}
            initialDueTo={normalizedDueTo}
            initialCreatedFrom={normalizedCreatedFrom}
            initialCreatedTo={normalizedCreatedTo}
            initialUpdatedFrom={normalizedUpdatedFrom}
            initialUpdatedTo={normalizedUpdatedTo}
          />
          <p className="text-xs text-[color:var(--color-text-muted)]" id="reorder-help">
            タスクはドラッグまたは <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">Alt</kbd> +
            <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">↑/↓</kbd> で並び替えできます。
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
              <TaskReorderList tasks={filteredTasks} />
            )}
          </div>

          <div>
            <p className="mb-3 text-lg font-semibold text-[color:var(--color-text)]">次のステップ</p>
            <ul className="flex list-disc flex-col gap-2 pl-6">
              <li>フィルター系コンポーネントを Storybook で可視化し、デザイン差分を検証</li>
              <li>API フェッチ層の共通化（`src/shared/api.ts` ベースで SSR/ISR を検討）</li>
              <li>キーボード並び替えのアクセシビリティ強化と Playwright カバレッジ拡張</li>
            </ul>
          </div>
        </div>
        <Link href="/" className="btn-secondary w-fit">
          トップへ戻る
        </Link>
      </section>
    </TaskNotificationProvider>
  );
}
