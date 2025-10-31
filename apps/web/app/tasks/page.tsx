import Link from 'next/link';

import { getTasks, getTags } from '../../lib/api';
import { TaskStatusSchema } from '@shared/api';
import { TaskCreateForm } from './_components/task-create-form';
import { TaskTagFilterControls } from './_components/task-tag-filter-controls';
import { TaskReorderList } from './_components/task-reorder-list';
import { TaskStatusFilterControls } from './_components/task-status-filter-controls';

export const metadata = {
  title: 'Tasks (Next.js)',
  description: 'SSR placeholder for task list to be implemented in Phase 3.'
};

type TasksPageSearchParams = {
  tags?: string | string[];
  statuses?: string | string[];
};

function parseFilterTags(input: TasksPageSearchParams['tags']) {
  if (!input) {
    return [];
  }
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);
}

function parseFilterStatuses(input: TasksPageSearchParams['statuses']) {
  if (!input) {
    return [];
  }
  const raw = Array.isArray(input) ? input.join(',') : input;
  return raw
    .split(',')
    .map((status) => status.trim())
    .filter((status, index, array) => status.length > 0 && array.indexOf(status) === index);
}

export default async function TasksPage({
  searchParams
}: {
  searchParams?: TasksPageSearchParams | Promise<TasksPageSearchParams>;
}) {
  const [tasks, tags] = await Promise.all([
    getTasks().catch(() => []),
    getTags().catch(() => [])
  ]);

  const availableTags = Array.from(new Set(tags));
  const resolvedSearchParams =
    searchParams && typeof (searchParams as PromiseLike<unknown>).then === 'function'
      ? await searchParams
      : (searchParams as TasksPageSearchParams | undefined);
  const requestedTags = parseFilterTags(resolvedSearchParams?.tags);
  const activeFilterTags = requestedTags.filter((tag) => availableTags.includes(tag));
  const requestedStatuses = parseFilterStatuses(resolvedSearchParams?.statuses);
  const statusOptions = TaskStatusSchema.options;
  const activeStatuses = requestedStatuses.filter((status): status is (typeof statusOptions)[number] =>
    statusOptions.includes(status as (typeof statusOptions)[number])
  );

  let filteredTasks = tasks;

  if (activeFilterTags.length) {
    filteredTasks = filteredTasks.filter((task) => activeFilterTags.every((tag) => task.tags.includes(tag)));
  }

  if (activeStatuses.length) {
    const statusSet = new Set(activeStatuses);
    filteredTasks = filteredTasks.filter((task) => statusSet.has(task.status));
  }

  const totalCount = tasks.length;
  const filteredCount = filteredTasks.length;

  return (
    <section className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text)]">タスク一覧（準備中）</h1>
        <p className="max-w-2xl text-base text-[color:var(--color-text-muted)]">
          ここでは既存 Express API からのデータをサーバーコンポーネントで取得する予定です。現在はモック状態です。
        </p>
      </header>
      <div className="card-surface space-y-6 p-8 text-[color:var(--color-text-muted)]">
        <TaskCreateForm />
        <TaskTagFilterControls availableTags={availableTags} selectedTags={activeFilterTags} />
        <TaskStatusFilterControls selectedStatuses={activeStatuses} />
        <p className="text-xs text-[color:var(--color-text-muted)]">
          タスクはドラッグまたは <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">Alt</kbd> +
          <kbd className="rounded bg-[color:var(--color-surface-muted)] px-1">↑/↓</kbd> で並び替えできます。
        </p>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-semibold text-[color:var(--color-text)]">
              タスク一覧（{filteredCount} 件{activeFilterTags.length ? ` / 全 ${totalCount} 件` : ''}）
            </p>
            <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
              データソース: Express REST API
            </span>
          </div>
          {filteredCount === 0 ? (
            <p className="rounded-xl border border-dashed border-[rgba(107,102,95,0.25)] bg-white/70 px-4 py-6 text-center text-sm">
              {totalCount === 0
                ? '表示できるタスクがまだありません。既存 UI から作成したデータがここに表示されます。'
                : '選択したフィルター条件に一致するタスクが見つかりませんでした。条件を見直してください。'}
            </p>
          ) : (
            <TaskReorderList tasks={filteredTasks} />
          )}
        </div>
        <div>
          <p className="mb-3 text-lg font-semibold text-[color:var(--color-text)]">次のステップ</p>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            <li>API フェッチ層の共通化（`src/shared/api.ts` を活用）</li>
            <li>SSG/ISR の適用検討</li>
            <li>既存 Vanilla JS モジュールの洗い出しと React 版への段階的移植</li>
            <li>ドラッグ＆ドロップ操作のキーボード操作対応と E2E テスト拡充</li>
          </ul>
        </div>
      </div>
      <Link href="/" className="btn-secondary w-fit">
        トップへ戻る
      </Link>
    </section>
  );
}
