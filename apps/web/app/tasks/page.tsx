import Link from 'next/link';

import { getTasks } from '../../lib/api';

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
          <p className="mb-2 text-lg font-semibold text-[color:var(--color-text)]">最新タスク</p>
          {tasks.length === 0 ? (
            <p className="text-sm">表示できるタスクがまだありません。既存 UI から作成したデータがここに表示されます。</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {tasks.slice(0, 5).map((task) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-[rgba(107,102,95,0.18)] bg-white/85 px-4 py-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-elevated"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-medium text-[color:var(--color-text)]">{task.title}</span>
                      <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-muted)]">
                        {task.status}
                      </span>
                    </div>
                    {task.dueDate ? (
                      <span className="text-sm text-[color:var(--color-warning)]">
                        期限: {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                      </span>
                    ) : (
                      <span className="text-sm text-[color:var(--color-disabled)]">期限なし</span>
                    )}
                  </div>
                  {task.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[color:var(--color-secondary)]/60 px-3 py-1 text-xs font-medium text-[color:var(--color-text)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
