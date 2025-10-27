import Link from 'next/link';

import { getTasks } from '../../lib/api';
import { TaskCard } from './_components/task-card';

export const metadata = {
  title: 'Tasks (Next.js)',
  description: 'SSR placeholder for task list to be implemented in Phase 3.'
};

export default async function TasksPage() {
  const tasks = await getTasks().catch(() => []);

  return (
    <section className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text)]">タスク一覧（準備中）</h1>
        <p className="max-w-2xl text-base text-[color:var(--color-text-muted)]">
          ここでは既存 Express API からのデータをサーバーコンポーネントで取得する予定です。現在はモック状態です。
        </p>
      </header>
      <div className="card-surface space-y-6 p-8 text-[color:var(--color-text-muted)]">
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-lg font-semibold text-[color:var(--color-text)]">タスク一覧（{tasks.length} 件）</p>
            <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
              データソース: Express REST API
            </span>
          </div>
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[rgba(107,102,95,0.25)] bg-white/70 px-4 py-6 text-center text-sm">
              表示できるタスクがまだありません。既存 UI から作成したデータがここに表示されます。
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-3 text-lg font-semibold text-[color:var(--color-text)]">次のステップ</p>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            <li>API フェッチ層の共通化（`src/shared/api.ts` を活用）</li>
            <li>SSG/ISR の適用検討</li>
            <li>タグフィルターやドラッグ＆ドロップ UI の React 移植</li>
          </ul>
        </div>
      </div>
      <Link href="/" className="btn-secondary w-fit">
        トップへ戻る
      </Link>
    </section>
  );
}
