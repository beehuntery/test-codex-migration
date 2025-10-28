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
- [ ] Next.js 用の `package.json` ワークスペース設定（ルートから管理）。
- [ ] `apps/web/next.config.mjs` / `apps/web/tsconfig.json` 生成。
- [ ] Tailwind 4 インストール、`apps/web/tailwind.config.ts` にトークンをマッピング。
- [ ] `src/shared/api.ts` からの Zod スキーマを利用した API クライアント作成。
- [ ] タスク一覧ページ (`app/tasks/page.tsx`) の SSR 実装。
- [ ] タグ/ステータスフィルターコンポーネントの React 化。
- [x] Storybook 設定ファイルの雛形作成。
- [ ] 既存 Vanilla JS 資産の段階的移植計画（モジュール単位の洗い出し）。
- [x] TaskCard ストーリーのコントロール拡充と MDX ドキュメント化。

## テスト戦略
- SSR ページ: Jest/Testing Library ではなく Playwright の `app-router` モードでレンダリング検証を行い、`tasks` ページのフィルタリングを自動化。
- UI コンポーネント: Storybook Interaction Testing + Vitest を併用し、デザイントークン適用可否やアクセシビリティ属性をスナップショット化。
- API 層: 既存の `src/server/index.test.ts` に加え、Next.js Route Handler へ移行した際は Contract Test を `src/shared/api.ts` の Zod スキーマで再利用。
- E2E: 既存 Playwright スイートを Next.js アプリ用に分岐し、`npm run web:build` 後の `next start` を対象にスモークテストを実施。

## リスクと対応
- **Tailwind 4 の仕様変化**: 公式リリースノートの追跡とプレリリース版利用時のピン止めを実施。
- **Next.js 15 の App Router 互換性**: 既存 API との同居期間は `rewrites` で Express にプロキシ。移行完了後に Route Handler へ統合。
- **ドラッグ＆ドロップの React 化コスト**: 段階的に `@dnd-kit` 等の採用を比較検討し、先にクリティカルなタグ選択 UI を React 化する。
- **ビルド時間増加**: Turbopack/webpack の評価と CI のキャッシュ戦略をフェーズ4で検討。

## 関連ドキュメント
- [デザインガイドライン](../DESIGN_GUIDELINE.md)
- [フェーズ2: バックエンド刷新](./phase2.md)
- [テスト戦略ガイド](../testing/README.md)

## 進捗ログ
- **2025-10-27**: Next.js スケルトン（`apps/web`）を追加し、Tailwind CSS v4 とデザイントークンを統合。`/tasks` ページで既存 API からサーバーサイドレンダリングする下地を構築。`TaskCard` や `StatusBadge` などの再利用可能な UI コンポーネントを作成し、タスク一覧を Next.js 上で読み取り専用表示できるようにした。
- **2025-10-28**: Server Actions を介したステータス更新フォームを Next.js 側に追加し、Storybook (Vite Builder) を導入。`TaskCard` のストーリーを作成して UI ドキュメント化を開始。
- **2025-10-29**: Storybook を v9 系へ更新（`storybook` / `@storybook/*` パッケージを ^9.0.0 へ揃え）し、アップグレード時の Alias/スタブ設定を確認。
- **2025-10-30**: タグ更新・タイトル/説明編集 + ステータス切替の Server Action と楽観的 UI を追加。Storybook に TaskCard の MDX ドキュメントページを作成し、コンポーネント単位のドキュメント性を向上。
