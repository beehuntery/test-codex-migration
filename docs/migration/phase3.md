# フェーズ3: フロントエンド再構築

- ステータス: 🚧 着手 (2025-10-26)
- 目的: Next.js 15 App Router + Tailwind CSS 4 を採用したモダンな UI レイヤーを構築し、既存 API との互換性を保ちつつ段階的な移行基盤を整える。

## スコープ
- Next.js アプリケーションの骨格構築（App Router、ESM、TypeScript 設定、環境変数定義）。
- Tailwind 4 とデザイントークンの接続（`docs/DESIGN_GUIDELINE.md` との同期）。
- 既存 REST API へのフェッチ層実装と型共有（Zod スキーマからの型生成を活用）。
- 既存の公共アセット（ドラッグ＆ドロップやタグ操作）の段階的移植方針策定。
- Storybook 導入計画とアクセシビリティ検証プロセスの明文化。

## 成果物
- `apps/web` ディレクトリ配下に Next.js 15 App Router ベースのアプリ。
- Tailwind 4 設定ファイルとデザイントークン読み込みモジュール。
- API クライアントユーティリティ（REST → 後続で Prisma 直結に移行しやすい構造）。
- 主要ページ: タスク一覧（サーバーコンポーネント）とタスク詳細/作成モーダル（クライアントコンポーネント）への道筋。
- Storybook/Playwright の Next.js 対応下準備（CI 導入はフェーズ4で実施）。

## スケジュール目安
1. **Week 1**: Next.js スケルトン導入、Tailwind/Token 設定、Lint/tsconfig 整合。
2. **Week 2**: API フェッチ層 + タスク一覧ページのサーバーコンポーネント原型。
3. **Week 3**: クライアント側インタラクション（タグ選択、ドラッグ操作の React 化）と Storybook 雛形。
4. **Week 4**: モジュール分割・テスト整備・移行リハーサル（Express サーバーへのプロキシ併用）。

## マイルストーン
- **M1: Skeleton Ready** – Next.js アプリ起動、Tailwind 設定、基本ページが表示できる。
- **M2: Data Connected** – `/api/tasks` を SSR 取得し、リストを Next.js 側で表示。
- **M3: Interactive Draft** – タスク操作（作成/更新/タグ付け）の UI を React 化、Playwright スモークを追加。
- **M4: Cutover Plan** – Express + Next.js の並行稼働シナリオとデプロイ手順を文書化。

## バックログ
- [x] Next.js 用の `package.json` ワークスペース設定（ルートから管理）。
- [x]  `apps/web/next.config.mjs` / `apps/web/tsconfig.json` 生成。
- [x] Tailwind 4 インストール、`apps/web/tailwind.config.ts` にトークンをマッピング。
- [x]  `src/shared/api.ts` からの Zod スキーマを利用した API クライアント作成。
- [x] タスク一覧ページ (`app/tasks/page.tsx`) の SSR 実装。
- [x] タグフィルターコンポーネントの React 化（クエリパラメータ連動）。
- [x] ドラッグ＆ドロップ UI の React 移植。
- [x] Storybook 設定ファイルの雛形作成。
- [x] 既存 Vanilla JS 資産の段階的移植計画（モジュール単位の洗い出し）。
- [x] タスク削除 UI / Server Action の React 化。
- [x] TaskCard ストーリーのコントロール拡充と MDX ドキュメント化。
- [x] フィルター UI の Storybook ストーリー追加（タグ/ステータス/詳細フィルター）。
- [x] `public/app.js` に残る通知トースト／完了アニメーション／旧フィルター UI を React コンポーネントへ移植し、バニラ実装を段階的に削除する。（通知トースト + 完了ハイライトを Next.js へ移植済み、旧 UI は比較検証用として残す）
- [x] Storybook に新 UI の状態管理（通知・ドラッグ完了・フィルター組み合わせ）を追加し、旧 UI との差分をドキュメント化する。
- [x] Playwright と Storybook の実行を CI に統合し、並列稼働時の回帰確認フローを整備する。
- [x] Express と Next.js の並行稼働シナリオ／カットオーバー手順を文書化し、M4 の Cutover Plan に備える。

### Vanilla JS 資産の移植計画

| モジュール | 主な機能 | React への移行状況 | メモ |
| --- | --- | --- | --- |
| `public/app.js` | タスク CRUD、タグ操作、DOM 描画、ドラッグ＆ドロップ、フィルター | Next.js への主要機能移植が完了。旧ファイルは比較検証用に維持しつつ、完了ハイライトと通知は React 実装へ切り替え。 | Phase4 での削除に備え、必要箇所のみドキュメント参照を残す。 |
| `public/drag-utils.mjs` | 並び替え時のアニメーション補助 | 代替ロジックを React 側に実装済み（簡易版）。 | アニメーション再現が必要なら `framer-motion` など導入を検討。 |
| `public/styles.css` | 既存 UI のスタイル定義 | Tailwind 4 へ順次移行予定。 | 移行後は共通トークンを Tailwind config に集約する。 |
| `public/index.html` | 旧 UI の土台 | 移行完了後に削除予定。 | Next.js へのリダイレクト案も検討。 |

※ 今後はモジュール単位で React コンポーネント化し、段階的に `public/` 配下の依存を縮小する。

## テスト戦略
- SSR ページ: Jest/Testing Library ではなく Playwright の `app-router` モードでレンダリング検証を行い、`tasks` ページのフィルタリングを自動化。
- UI コンポーネント: Storybook Interaction Testing + Vitest を併用し、デザイントークン適用可否やアクセシビリティ属性をスナップショット化。
- API 層: 既存の `src/server/index.test.ts` に加え、Next.js Route Handler へ移行した際は Contract Test を `src/shared/api.ts` の Zod スキーマで再利用。
- E2E: 既存 Playwright スイートを Next.js アプリ用に分岐し、`npm run web:build` 後の `next start` を対象にスモークテストを実施。
- Playwright 実行時は `webServer` 設定により `npm run dev:ts`（Express）と `npm run dev --prefix apps/web`（Next.js）を自動起動する。手動検証でも同コマンドで環境を揃える。

## 残バニラ資産移植に向けた計画

| モジュール | 移行対象 | 優先度 | 対応方針 |
| --- | --- | --- | --- |
| `public/app.js` | タスク CRUD、タグ管理、並び替え、DOM 描画 | 高 | Next.js 側で既に実装済みの機能（タスク作成、タグ編集、並び替え）は削除候補。残機能（フィルター UI、通知、アニメーション）は React へ段階移植。 |
| `public/drag-utils.mjs` | 並び替えアニメーション補助 | 中 | TaskReorderList へ置き換え済み。アニメーション要件が追加された場合は Framer Motion 等を検討。 |
| `public/index.html` | 旧 UI シェル | 低 | Next.js への完全移行後に削除。開発中は比較用に残す。 |
| `public/styles.css` | 旧スタイル | 中 | Tailwind 4 への移行完了後に整理し、必要なトークンのみ `styles/tokens.css` に残す。 |

### 次のステップ
1. Phase4 で予定している `public/` ディレクトリ撤去に向け、比較検証で必要な最小ファイルのみを残すリストを作成する。
2. Storybook / Playwright のケースを増強し、Cutover 前後で差分が出やすいユースケース（タスク完了・フィルター組み合わせ）を自動化する。
3. README・運用手順を Next.js ベースへ更新し、旧 UI へのリンクを段階的にアーカイブへ移動する。

## リスクと対応
- **Tailwind 4 の仕様変化**: 公式リリースノートの追跡とプレリリース版利用時のピン止めを実施。
- **Next.js 15 の App Router 互換性**: 既存 API との同居期間は `rewrites` で Express にプロキシ。移行完了後に Route Handler へ統合。
- **ドラッグ＆ドロップの React 化コスト**: 段階的に `@dnd-kit` 等の採用を比較検討し、先にクリティカルなタグ選択 UI を React 化する。
- **ビルド時間増加**: Turbopack/webpack の評価と CI のキャッシュ戦略をフェーズ4で検討。

## Cutover 準備メモ
1. **段階的な公開**: `NEXT_PUBLIC_API_BASE_URL` を切り替え可能な環境変数として維持し、先にステージングで Next.js `/tasks` を公開。Express 側は `/legacy` 配下にリダイレクトし、A/B チェックを実施する。
2. **リバースプロキシ**: 本番の Render（または ALB）で Express をデフォルト、Next.js を `/tasks` のみ優先するルールを追加。Cutover 当日は規則を反転させ、問題があればロールバック用の Feature Flag を再適用する。
3. **データ同期**: Prisma 経由の永続層は共通のため、メトリクス（Tasks 作成/削除）を `analytics.task_events` にログ出力し、切替前後の差異をダッシュボードで監視する。
4. **監視とロールバック**: Playwright スモーク（このリポジトリの CI）をカナリア後に実行し、失敗時は Express ルートへ即時戻す Runbook を用意。復旧後は Next.js 側の `TaskNotificationProvider` で収集した UX フィードバックをまとめる。

## 関連ドキュメント
- [デザインガイドライン](../DESIGN_GUIDELINE.md)
- [フェーズ2: バックエンド刷新](./phase2.md)
- [テスト戦略ガイド](../testing/README.md)

## 進捗ログ
- **2025-10-27**: Next.js スケルトン（`apps/web`）を追加し、Tailwind CSS v4 とデザイントークンを統合。`/tasks` ページで既存 API からサーバーサイドレンダリングする下地を構築。`TaskCard` や `StatusBadge` などの再利用可能な UI コンポーネントを作成し、タスク一覧を Next.js 上で読み取り専用表示できるようにした。
- **2025-10-28**: Server Actions を介したステータス更新・期限更新を Next.js 側に追加し、Storybook (Vite Builder) を導入。Storybook v9 系へアップグレードして `TaskCard` のドキュメントを整備。TaskTagEditor の楽観的更新を修正し、タスク作成フォームに Router リフレッシュ + 楽観的キュー可視化を追加。Playwright E2E のタグ削除／作成シナリオを追加し、Playwright MCP から `/tasks` 画面でタスク作成＋タグ削除フローを実機確認（コンソールエラーは favicon 404 のみ）。
- **2025-10-29**: `/tasks` にタグフィルター UI を追加し、URL クエリと連動した AND フィルタリングを実装。未選択時との件数差分表示を追加し、Playwright MCP でフィルター適用／解除を確認（エラーなし）。
- **2025-10-31**: タスク削除 Server Action と `TaskDeleteButton` を追加し、カード内に削除確認 UI を実装。Playwright で削除フローの回帰テストを追加し、タグ/ステータス/並び替えテストの安定化を実施。
- **2025-10-31**: タイトル検索と期限レンジを扱う「詳細フィルター」を Next.js 版 `/tasks` に実装し、クエリパラメータ経由で SSR フィルタリングを可能にした。Playwright でキーワード絞り込みと期限レンジの E2E を追加し、バニラ実装との重複を整理する指針をドキュメント化。
- **2025-11-01**: Storybook にタグ/ステータス/詳細フィルターのコンポーネントを追加し、App Router 向けに `next/navigation` のモックを整備。URL クエリの変化を Action ログで可視化し、単体 UI の確認が容易になった。
- **2025-11-01**: 詳細フィルターに作成日・更新日のレンジ入力を追加し、サーバー側フィルタリングと Storybook を更新。`filter-utils` モジュールを新設してクエリ/日付変換を集約し、Vitest で日付レンジ判定とステータス正規化のユニットテストを追加。
- **2025-11-01**: Next.js `/tasks` にトースト通知システムと完了ハイライト演出を導入し、タスク作成・更新・削除・タグ編集・ステータス変更などの操作結果を即時フィードバックするよう改善。Storybook に通知デモとフィルター連携ストーリーを追加し、CI では Next.js ビルド・Storybook ビルド・Vitest・Playwright を連携させたパイプラインを整備。
