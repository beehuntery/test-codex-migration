# Postgres 移行計画（ドラフト）

## ゴール
- Render Postgres に移行し、本番 `DATABASE_URL` を Postgres に切替。データリセットやSQLiteロックを解消する。

## フェーズ
1. 準備（dev環境）
   - Render Postgres をプロビジョニング（stg/prd用に2インスタンス想定）
   - 環境変数を追加：`DATABASE_URL`（Postgres）、`PRISMA_SCHEMA_ENGINE_BINARY` 不要
   - Prisma スキーマの datasource を Postgres に切替し、`prisma migrate dev` で初期マイグレーション生成

2. ステージング移行
   - `DATABASE_URL` を stg 環境で Postgres に設定
   - マイグレーション適用: `prisma migrate deploy`
   - データ移行（SQLite → Postgres）: jsonToSqlite と同等のロジックで Postgres に書き込むスクリプトを作成
   - Playwright / API スモークで回帰確認

3. 本番移行
   - メンテナンス時間を確保し、SQLite を凍結（デプロイ停止）
   - SQLite データを Postgres へ移送
   - 本番 `DATABASE_URL` を Postgres に切替しデプロイ
   - スモーク（/api/health, /api/tasks, Playwright短縮版）
   - 必要に応じて旧SQLiteへリバートするロールバック手順を用意

## タスク分解（進捗付き）
- [x] Render Postgres (stg) プロビジョニング  
  - name: `test-codex-migration-stg-db` (free, v15, Oregon)
- [ ] Render Postgres (prd) プロビジョニング
- [x] Prisma datasource を Postgres に切替（main 反映済）
- [x] 初期マイグレーションを作成（Postgres向け）: `20251203_postgres_init`
- [x] データ移行スクリプト（SQLite→Postgres）: `npm run import:pg` (`src/scripts/importToPostgres.ts`)
- [x] stg: migrate deploy & データ移行 & スモーク
- [ ] prd: メンテ時間確保 → データ移行 → 切替 → スモーク
- [ ] ロールバック手順明文化（旧SQLiteに戻す手順／前タグDeployHookで戻す手順）

## リスクと対策
- データ不整合: 移行前後で件数ハッシュを比較
- ダウンタイム: 本番切替は短時間メンテウィンドウを確保
- ロールバック: 切替前のSQLiteを温存し、環境変数を戻すだけで復旧できるようにする

## 直近で実施した stg 手順（ログ用）
1. 失敗状態のマイグレーションを `migrate resolve --applied 20251203_postgres_init` で適用済みにマーク  
2. `npx prisma db push --schema prisma/schema.prisma` でスキーマ同期  
3. Render 再デプロイ → 成功を確認  
4. 必要に応じ `npm run import:pg` で JSON データ投入

## prd 移行の提案フロー（ドラフト）
1) prd 用 Postgres を Render でプロビジョニング（Standard+推奨）  
2) `.env.production` / Render Environment に `DATABASE_URL` を Postgres で設定  
3) メンテ時間内に以下を実行  
   - `npx prisma migrate deploy --schema prisma/schema.prisma`  
   - （必要なら）`npm run import:pg` でデータ投入  
4) デプロイ → `/api/health` `/api/tasks` スモーク → 短縮版 Playwright  
5) ロールバック: DeployHook で前タグを再デプロイ（`scripts/rollback.sh <service_id> <hook> <tag>`）

## 補足
- Prisma のマイグレーションは SQLite と Postgres で SQL が異なるため、Postgres用マイグレーションを新規生成する。
- Playwright などテストは Postgres 環境で再実行し、ロックやトランザクションタイムアウトを確認。

## 現在のリソース
- stg: Render Postgres (free, v15, region oregon) — **available**
  - name: `test-codex-migration-stg-db`
  - id: `dpg-d4mdlojuibrs738gqn00-a`
  - dashboard: https://dashboard.render.com/d/dpg-d4mdlojuibrs738gqn00-a
  - connection strings: Renderダッシュボードに表示（`DATABASE_URL` を stg 環境に設定して使用）
