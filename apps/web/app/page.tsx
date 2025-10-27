import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <span className="text-sm uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
          Phase 3 Preview
        </span>
        <h1 className="text-4xl font-semibold text-[color:var(--color-text)]">Next.js UI Migration</h1>
        <p className="max-w-2xl text-base leading-relaxed text-[color:var(--color-text-muted)]">
          このページは Next.js 版 UI のスケルトンです。タスク一覧ページやインタラクションは今後のステップで実装されます。
        </p>
      </header>

      <div className="card-surface flex flex-col gap-5 p-8">
        <h2 className="text-2xl font-medium text-[color:var(--color-text)]">ロードマップ</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-6 text-[color:var(--color-text-muted)]">
          <li>Tailwind 4 とデザイントークンの統合</li>
          <li>タスク API からの SSR/ISR データ取得</li>
          <li>タグ管理・ドラッグ＆ドロップ UI の React 化</li>
          <li>Storybook と Playwright による UI 検証</li>
        </ol>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/tasks" className="btn-primary">
            タスク一覧のプレースホルダーを見る
          </Link>
          <a
            className="btn-secondary"
            href="/docs/migration/phase3.md"
            rel="noopener noreferrer"
          >
            ドキュメントを開く
          </a>
        </div>
      </div>

      <footer className="flex flex-col gap-2 text-sm text-[color:var(--color-text-muted)]">
        <span>詳しい移行ステップは docs/migration/phase3.md を参照してください。</span>
        <Link href="/tasks" className="text-[color:var(--color-accent)]">
          タスク一覧（プレースホルダー）へ
        </Link>
      </footer>
    </section>
  );
}
