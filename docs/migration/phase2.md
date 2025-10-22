# フェーズ2: バックエンド刷新

- ステータス: 🚧 進行中 (2025-10-21)
- 目的: サーバー実装を TypeScript/Prisma ベースへ移行し、永続化レイヤーと開発体験を近代化する

## 実施済み
- **TypeScript ビルドパイプライン導入**: `tsconfig.json` と `npm run build` / `npm run dev:ts` を追加し、`server.js` はビルド成果物をロードするブリッジに変更。
- **Express サーバーの TypeScript 移行**: 既存ロジックを `src/server/index.ts` に再実装し、`Task`/`TaskStatus` 型やユーティリティを型安全に整理。JSON ストレージ互換を維持。
- **Prisma スキャフォールド**: `prisma/schema.prisma` で `Task`/`Tag` モデルを定義し、`status` は SQLite 互換の `String` フィールドに `todo` デフォルトを設定。`.env.example` に SQLite デフォルト (`file:./dev.db`) を追加し、`npm run prisma:generate` を用意。
- **SQLite スキーマ適用**: 非対話環境の制約により `prisma migrate dev` ではなく `prisma db push --force-reset`（`npm run prisma:migrate`）を採用。初期スキーマ SQL を `prisma/migrations/0001_init/migration.sql` として生成し、`prisma/migrations/migration_lock.toml` を追加。
- **JSON→SQLite データ移行ユーティリティ**: `npm run migrate:json`（`src/scripts/jsonToSqlite.ts`）を追加し、`data/*.json` を正規化した上で `prisma db execute --file` で投入するフローを自動化。
- **データストア抽象化**: `src/server/storage/` に JSON データストア実装を切り出し、`DATA_STORE=prisma` で Prisma ストア（試験的）に切り替え可能なファクトリを導入。

## 残っている作業
- Prisma DataStore の本実装（現在は JSON 互換の全件再作成方式。部分更新ロジックと差分同期を整備）。
- Prisma Client の生成手順を CI/ドキュメントで自動化し、`@prisma/client` 生成前の型定義スタブを除去。
- 環境変数管理 (`dotenv`) と型安全な設定モジュールの導入。
- API レスポンス型 (`zod` など) の共有化とテスト整備（ユニット + 統合）。
