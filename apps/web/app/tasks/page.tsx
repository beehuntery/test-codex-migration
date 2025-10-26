import Link from 'next/link';

export const metadata = {
  title: 'Tasks (Next.js)',
  description: 'SSR placeholder for task list to be implemented in Phase 3.'
};

export default function TasksPage() {
  return (
    <section className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-stone-800">タスク一覧（準備中）</h1>
        <p className="text-base text-stone-600">
          ここでは既存 Express API からのデータをサーバーコンポーネントで取得する予定です。現在はモック状態です。
        </p>
      </header>
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-8 text-stone-500">
        <p className="mb-4 text-lg">次のステップ:</p>
        <ul className="list-disc pl-6">
          <li>API フェッチ層の共通化（`src/shared/api.ts` を活用）</li>
          <li>SSG/ISR の適用検討</li>
          <li>タグフィルターやドラッグ＆ドロップ UI の React 移植</li>
        </ul>
      </div>
      <Link href="/" className="text-stone-700 underline">
        トップへ戻る
      </Link>
    </section>
  );
}
