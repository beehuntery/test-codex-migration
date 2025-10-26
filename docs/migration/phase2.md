# フェーズ2: バックエンド刷新

- ステータス: ✅ 完了 (2025-10-26)
- 目的: サーバー実装を TypeScript/Prisma ベースへ移行し、永続化レイヤーと開発体験を近代化する

## 実施済み
- **TypeScript ビルドパイプライン導入**: `tsconfig.json` と `npm run build` / `npm run dev:ts` を追加し、`server.js` はビルド成果物をロードするブリッジに変更。
- **Express サーバーの TypeScript 移行**: 既存ロジックを `src/server/index.ts` に再実装し、`Task`/`TaskStatus` 型やユーティリティを型安全に整理。JSON ストレージ互換を維持。
- **Prisma スキャフォールド**: `prisma/schema.prisma` で `Task`/`Tag` モデルを定義し、`status` は SQLite 互換の `String` フィールドに `todo` デフォルトを設定。`.env.example` に SQLite デフォルト (`file:./dev.db`) を追加し、`npm run prisma:generate` を用意。
- **SQLite スキーマ適用**: 非対話環境の制約により `prisma migrate dev` ではなく `prisma db push --force-reset`（`npm run prisma:migrate`）を採用。初期スキーマ SQL を `prisma/migrations/0001_init/migration.sql` として生成し、`prisma/migrations/migration_lock.toml` を追加。
- **JSON→SQLite データ移行ユーティリティ**: `npm run migrate:json`（`src/scripts/jsonToSqlite.ts`）を追加し、`data/*.json` を正規化した上で `prisma db execute --file` で投入するフローを自動化。
- **データストア抽象化**: `src/server/storage/` に JSON データストア実装を切り出し、`DATA_STORE=prisma` で Prisma ストア（試験的）に切り替え可能なファクトリを導入。
- **Prisma データストアの部分更新対応**: `JsonDataStore`/`PrismaDataStore` を共通インターフェース化し、タスク CRUD・並び替え・タグ操作を差分更新で処理するよう `src/server/index.ts` をリファクタリング。
- **ユニットテスト追加**: Vitest を導入し、`JsonDataStore` の作成・更新・並び替えロジックを検証するテスト (`npm run test`) を追加。
- **Prisma Client 自動生成パイプライン**: npm の `prepare` / `prebuild` / `pretest` / `predev:ts` フックで `prisma generate` を実行するようにし、過去にコミットされていた `prisma/generated/` スタブを削除して最新クライアントを都度生成できるようにした。
- **環境変数管理と設定モジュールの型安全化**: `src/server/config.ts` で `dotenv` + `zod` によるパースを導入し、`appConfig` 経由でサーバーとデータストアへ一元的に設定を流せるよう整理。`.env.example` を拡張して `JSON_DATA_ROOT` や Prisma 診断パラメータを追加。
- **API レスポンススキーマの共有化とテスト整備**: `src/shared/api.ts` に Zod スキーマを定義し、サーバー側ロジック (`TaskCreateInputSchema`/`TaskUpdateInputSchema`) と Vitest による統合テスト (`src/server/index.test.ts`) で検証ループを構築。
- **Prisma DataStore の監視・リトライ戦略強化**: `PrismaDataStore` に計測付き実行ラッパーとメトリクス (`getRuntimeMetrics`) を実装。`PRISMA_MAX_RETRIES` や `PRISMA_LOG_DIAGNOSTICS`、`PRISMA_RETRY_WRITES` などの設定を `AppConfig.prisma` から注入し、遅延検知・再試行・トランザクション回数を可視化。

## 残っている作業
- なし（以降の課題はフェーズ3以降に引き継ぎ）。

## テスト観点
- `JsonDataStore` のユニットテストで作成／更新／並び替えロジックとタグ整合性を検証（`src/server/storage/jsonStore.test.ts`）。
- `PrismaDataStore` のリトライ判定と低速クエリ監視をメトリクス付きで検証（`src/server/storage/prismaStore.monitoring.test.ts`）。
- `supertest` を用いた API 統合テストで、タスク／タグエンドポイントの Zod スキーマ整合性を確認（`src/server/index.test.ts`）。
