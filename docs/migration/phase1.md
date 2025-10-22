# フェーズ1: 設計と準備

- ステータス: ✅ 完了 (2025-10-21)
- 目的: 現行実装の棚卸しとターゲットアーキテクチャの合意形成、デザイン／技術要件の整理

## 現行スタックの整理
- **バックエンド**: Node.js 18 互換 / Express 5（TypeScript 実装: `src/server/index.ts` → ビルド成果物を `server.js` からロード）。REST API を提供し、静的アセット配信も担う。
- **データストア**: ローカル JSON (`data/tasks.json`, `data/tags.json`)。アプリ起動時にファイル存在を保証。
- **フロントエンド**: `public/index.html` + `public/app.js`。Vanilla JS による DOM 操作と Fetch API で REST をコール。
- **開発ツール**: `nodemon` + `ts-node` によるホットリロード (`npm run dev` / `npm run dev:ts`)。テストやビルドツールは未整備。
- **デプロイ**: Render を想定。Persistent Disk 未使用の場合、JSON は揮発。

## 現行 API 一覧
| メソッド | パス | 主な機能 | 備考 |
| --- | --- | --- | --- |
| GET | `/api/tasks` | 全タスク取得 | order で昇順ソート済みを返却 |
| POST | `/api/tasks` | タスク作成 | title 必須。tags も登録時に新規追加入力 |
| PATCH | `/api/tasks/reorder` | タスクの並び替え | order 配列を受け取り、欠落 ID は末尾へ再配置 |
| PATCH | `/api/tasks/:id` | タスク更新 | title/description/status/dueDate/order/tags を更新可能 |
| DELETE | `/api/tasks/:id` | タスク削除 | 削除タスクをレスポンス |
| GET | `/api/tags` | タグ一覧取得 | 重複排除・ソート済み |
| POST | `/api/tags` | タグ作成 | 作成済みの場合は 200 で name のみ返却 |
| PATCH | `/api/tags/:tag` | タグ名変更 | タスクに紐づくタグも rename |
| DELETE | `/api/tags/:tag` | タグ削除 | タスクからも当該タグを除去 |

## データ構造（現状）
```json
{
  "id": "UUID",
  "title": "string",
  "description": "string",
  "status": "todo" | "in_progress" | "done",
  "dueDate": "YYYY-MM-DD" | null,
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp" | null,
  "order": number,
  "tags": ["string", ...]
}
```
- タグは単純な文字列配列。大文字小文字区別あり。整合性を `writeTags` が担保。

## ターゲットアーキテクチャ決定
- **フレームワーク**: Next.js 15 (App Router) + React 19 + TypeScript。
- **レンダリング戦略**: サーバーコンポーネント優先。対話性が高い領域は Client Component + Suspense。
- **BFF / API**: Next.js Route Handlers (`app/api/**/route.ts`) に再構築。Prisma 経由で DB に接続。
- **データベース**: 初期リリースは SQLite (ファイル) + Prisma Migrate。将来的に PostgreSQL への移行を許容するスキーマ設計。
- **状態管理**: `@tanstack/react-query` と Server Actions を併用し、楽観的更新とキャッシュ整合性を確保。
- **ビルド/ホスティング**: Render の Next.js Build テンプレートを採用。`next build` → `next start` フロー。

## デザイン統合計画
- Tailwind CSS 4 を導入し、`tailwind.config.ts` の `theme.extend.colors` にガイドラインのカラーパレットを `leaf`, `sand`, `sky`, `alabaster`, `warm`, `slate`, `moss`, `mist`, `forest`, `amber`, `rose` として登録。
- `theme.extend.fontFamily` に `['"SF Pro Text"', '"SF Pro JP"', '"Noto Sans JP"', 'sans-serif']` を設定。Dynamic Type へ対応するため、ベースのフォントサイズを CSS カスタムプロパティで管理。
- spacing と radius は 8pt 基準を `spacing`／`borderRadius` にマッピングし、`spacing.2 = 8px`, `spacing.3 = 12px`, `spacing.4 = 16px`, `borderRadius.lg = 20px` などを定義。
- コンポーネント単位では後続フェーズで Storybook + Tailwind Variants を用い、ボタンやカードをアクセシビリティ検証付きで実装。

## API 契約移行方針
- Prisma Schema を単一ソースにし、`zod` スキーマと OpenAPI (または `ts-rest`) を自動生成。
- 既存エンドポイントは Next.js Route Handlers 内で `/api/tasks`、`/api/tags` へ等価リクエストを維持しつつ、アクセストークン導入に備え `Authorization` ヘッダーを許容する。
- 並び替え API は将来的に PATCH `/api/tasks/reorder` を GraphQL Mutation か REST PATCH にリファインし、監査ログ用に `updatedAt` の自動更新を Prisma 中間層で処理。

## 技術的負債と改善課題
- 同期的なファイル書き込みが多く、排他制御・リカバリが不十分。
- テスト基盤が存在しないため、ユニット・E2E の整備が必須。
- デプロイ環境が JSON ファイル前提のため、再起動時のデータ喪失リスク高。
- 入力バリデーションがサーバー側のみで、フロント側は楽観的 UI のみ。Next.js 移行時にフォームバリデーションを共通化する。
- Lint/Format の設定が未整備であり、コード品質の自動担保が難しい。
