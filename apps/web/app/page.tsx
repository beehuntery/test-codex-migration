import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <span className="text-sm uppercase tracking-[0.2em] text-stone-500">Phase 3 Preview</span>
        <h1 className="text-4xl font-semibold text-stone-800">Next.js UI Migration</h1>
        <p className="text-base leading-relaxed text-stone-600">
          このページは Next.js 版 UI のスケルトンです。タスク一覧ページやインタラクションは今後のステップで実装されます。
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-2xl bg-white/80 p-6 shadow-sm ring-1 ring-stone-200">
        <h2 className="text-2xl font-medium text-stone-800">ロードマップ</h2>
        <ol className="list-decimal pl-6 text-stone-700">
          <li>Tailwind 4 とデザイントークンの統合</li>
          <li>タスク API からの SSR/ISR データ取得</li>
          <li>タグ管理・ドラッグ＆ドロップ UI の React 化</li>
          <li>Storybook と Playwright による UI 検証</li>
        </ol>
      </div>

      <footer className="flex flex-col gap-2 text-sm text-stone-500">
        <span>詳しい移行ステップは docs/migration/phase3.md を参照してください。</span>
        <Link href="/tasks" className="text-stone-700 underline">
          タスク一覧（プレースホルダー）へ
        </Link>
      </footer>
    </section>
  );
}
